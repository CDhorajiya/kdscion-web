/**
 * ============================================================
 *  KD Scion — First-Party Analytics Tracker
 *  js/analytics.js
 * ============================================================
 *
 *  Drop <script src="js/analytics.js"></script> into any page.
 *  That's all. Page views fire automatically.
 *
 *  For custom events call:
 *    window.kdTrack('fabric_clicked', { fabric_id: 'cotton-1', zone: 'main' })
 *
 *  Data flows:
 *    Browser → POST /api/analytics/track  (Vercel serverless fn)
 *           → stored in PostgreSQL
 *           → queried by admin dashboard Traffic tab
 * ============================================================
 */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────────────
  // The endpoint that receives all events.
  // /api/analytics/track is a Vercel serverless function in this same repo.
  const ENDPOINT     = '/api/analytics/track';
  const BATCH_MS     = 3000;   // flush queue every 3 seconds
  const MAX_QUEUE    = 20;     // also flush if queue hits 20 events
  const DEBUG        = false;  // set true locally to log every event to console

  // ── Visitor & session identity ───────────────────────────────────────────────
  // visitor_id: persists across sessions (localStorage) — identifies returning users
  // session_id: lives only for this tab/session (sessionStorage) — groups one visit
  function getOrCreate(storage, key) {
    let id = storage.getItem(key);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      try { storage.setItem(key, id); } catch (_) {}
    }
    return id;
  }

  const visitorId  = getOrCreate(localStorage,  'kd_vid');
  const sessionId  = getOrCreate(sessionStorage, 'kd_sid');
  const isReturning = !!localStorage.getItem('kd_prev_visit');
  try { localStorage.setItem('kd_prev_visit', '1'); } catch (_) {}

  // ── Page timing ─────────────────────────────────────────────────────────────
  const pageStart = Date.now();
  let   scrollDepth = 0;

  window.addEventListener('scroll', function () {
    const pct = Math.round(
      ((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight) * 100
    );
    if (pct > scrollDepth) scrollDepth = Math.min(pct, 100);
  }, { passive: true });

  // ── UTM parameters (from URL) ────────────────────────────────────────────────
  const _params = new URLSearchParams(window.location.search);
  const utm = {
    source:   _params.get('utm_source')   || null,
    medium:   _params.get('utm_medium')   || null,
    campaign: _params.get('utm_campaign') || null,
  };

  // ── Device / browser detection ───────────────────────────────────────────────
  function deviceType() {
    const w = window.innerWidth;
    if (w < 768)  return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  function parseBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox'))                            return 'Firefox';
    if (ua.includes('Edg'))                               return 'Edge';
    if (ua.includes('Chrome') && !ua.includes('Chromium')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome'))  return 'Safari';
    if (ua.includes('OPR') || ua.includes('Opera'))       return 'Opera';
    return 'Other';
  }

  function parseOS() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua))  return 'iOS';
    if (/Android/.test(ua))           return 'Android';
    if (/Macintosh/.test(ua))         return 'macOS';
    if (/Windows/.test(ua))           return 'Windows';
    if (/Linux/.test(ua))             return 'Linux';
    return 'Other';
  }

  function referrerType(ref) {
    if (!ref) return 'direct';
    if (/instagram|facebook|twitter|tiktok|pinterest|snapchat/.test(ref)) return 'social';
    if (/google|bing|yahoo|duckduckgo|baidu|yandex/.test(ref))            return 'search';
    if (/mail|gmail|outlook|yahoo\.com\/m/.test(ref))                     return 'email';
    if (/whatsapp/.test(ref))                                              return 'messaging';
    return 'referral';
  }

  // ── Base payload ─────────────────────────────────────────────────────────────
  // Everything common to every event. Custom properties are merged in separately.
  function base(eventType, props) {
    return {
      // Identity
      session_id:   sessionId,
      visitor_id:   visitorId,
      is_returning: isReturning,
      // Event
      event_type:   eventType,
      properties:   props || {},
      // Page context
      page_url:     window.location.pathname + window.location.search,
      page_title:   document.title,
      // Traffic source
      referrer:     document.referrer || null,
      referrer_type:referrerType(document.referrer),
      utm_source:   utm.source,
      utm_medium:   utm.medium,
      utm_campaign: utm.campaign,
      // Device
      device_type:  deviceType(),
      browser:      parseBrowser(),
      os:           parseOS(),
      language:     navigator.language || null,
      timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      screen_width: window.innerWidth,
      connection:   (navigator.connection && navigator.connection.effectiveType) || null,
      // Time
      timestamp:    new Date().toISOString(),
    };
  }

  // ── Event queue & flush ──────────────────────────────────────────────────────
  let queue = [];

  function enqueue(eventType, props) {
    const event = base(eventType, props);
    queue.push(event);
    if (DEBUG) console.log('[KD Analytics]', eventType, event);
    if (queue.length >= MAX_QUEUE) flush();
  }

  async function flush() {
    if (!queue.length) return;
    const batch = queue.splice(0);           // drain queue atomically
    try {
      await fetch(ENDPOINT, {
        method:    'POST',
        headers:   { 'Content-Type': 'application/json' },
        body:      JSON.stringify({ events: batch }),
        keepalive: true,                     // survives page unload / tab close
      });
    } catch (_) {
      // Never crash the page because of analytics. Silently discard on error.
    }
  }

  // Flush on a timer
  setInterval(flush, BATCH_MS);

  // Flush when the user leaves (tab hidden, navigates away, closes tab)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      enqueue('page_exit', {
        time_on_page_secs: Math.round((Date.now() - pageStart) / 1000),
        scroll_depth_pct:  scrollDepth,
      });
      flush();
    }
  });

  // ── Auto-fire page_view ──────────────────────────────────────────────────────
  // Runs on every page automatically — no manual call needed.
  enqueue('page_view');

  // ── Public tracking API ──────────────────────────────────────────────────────
  /**
   * window.kdTrack(eventType, properties)
   *
   * Call this anywhere on a product page to record a custom event.
   * Examples:
   *   window.kdTrack('fabric_clicked',      { fabric_id: 'linen-1', fabric_type: '100% Linen', zone: 'main' })
   *   window.kdTrack('skin_tone_selected',  { tone: 'dark' })
   *   window.kdTrack('model_rotated',       { product_sku: 'KD-P60-FSSD' })
   *   window.kdTrack('add_to_cart',         { product_sku: 'KD-P60-FSSD', fabric_id: 'linen-1' })
   *   window.kdTrack('pool_filter_used',    { filter: 'pair' })
   *   window.kdTrack('variation_opened',    { variation_page: 'p96 design variations' })
   */
  window.kdTrack = function (eventType, properties) {
    enqueue(eventType, properties || {});
  };

})();
