/**
 * ============================================================
 *  KD Scion Analytics — Express Router (Railway Backend)
 * ============================================================
 *
 *  Add to your Railway backend:
 *
 *    // In your main app.js / main.ts:
 *    import analyticsRouter from './analyticsRouter.js';
 *    app.use('/api/v1/analytics', analyticsRouter);
 *
 *  Required env vars on Railway:
 *    DATABASE_URL         — already set (your existing Postgres connection)
 *    ANALYTICS_SECRET     — a random string you set; passed as Bearer token
 *                           from the Vercel API route to authenticate
 *
 *  Endpoints:
 *    POST /api/v1/analytics/track        — receive events from browser
 *    GET  /api/v1/analytics/dashboard    — return dashboard summary data
 *    GET  /api/v1/analytics/world        — return sessions by country (for map)
 * ============================================================
 */

import express       from 'express';
import { Pool }      from 'pg';           // already installed in most Node backends

const router = express.Router();

// Use the existing DATABASE_URL that Railway injects automatically.
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ── Geolocation (IP → Country) ────────────────────────────────────────────────
// Uses ip-api.com free tier (45 requests/minute, no key needed).
// For production upgrade: replace with MaxMind GeoLite2 (offline, free, unlimited).

async function geoFromIp(ip) {
  try {
    // Skip lookup for local/private IPs during development
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) {
      return { country: 'Local', country_code: 'XX', city: 'Local' };
    }
    const res  = await fetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city`);
    const data = await res.json();
    if (data.status === 'fail') return {};
    return { country: data.country, country_code: data.countryCode, city: data.city };
  } catch (_) {
    return {};   // geolocation failure should never block event storage
  }
}

// Helper: extract real IP from behind proxies / Vercel / Cloudflare
function getIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||          // Cloudflare
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null
  );
}

// ── Simple bot filter ─────────────────────────────────────────────────────────
const BOT_RE = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|facebookexternalhit|wget|curl|python-requests/i;

function isBot(req) {
  return BOT_RE.test(req.headers['user-agent'] || '');
}

// ── Rate limiting (in-memory, per IP) ─────────────────────────────────────────
// Allows 60 events per IP per minute before dropping.
const _rateBuckets = new Map();
function rateOk(ip) {
  if (!ip) return true;
  const now    = Math.floor(Date.now() / 60000);   // current minute bucket
  const key    = `${ip}:${now}`;
  const count  = (_rateBuckets.get(key) || 0) + 1;
  _rateBuckets.set(key, count);
  // Clean old buckets every 500 requests to avoid memory leak
  if (_rateBuckets.size > 500) {
    const prev = String(now - 1);
    for (const k of _rateBuckets.keys()) { if (k.endsWith(prev)) _rateBuckets.delete(k); }
  }
  return count <= 60;
}

// ── POST /api/v1/analytics/track ─────────────────────────────────────────────
// Receives batched events from analytics.js, resolves geolocation,
// writes to analytics_events, upserts analytics_sessions.

router.post('/track', async (req, res) => {
  try {
    if (isBot(req)) return res.status(204).end();

    const ip = getIp(req);
    if (!rateOk(ip)) return res.status(429).end();

    const { events } = req.body;
    if (!Array.isArray(events) || !events.length) return res.status(400).end();

    // Resolve geo once per batch (all events in a batch share the same IP)
    const geo = await geoFromIp(ip);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const e of events) {
        // Validate minimum required fields
        if (!e.session_id || !e.event_type) continue;

        // Insert raw event
        await client.query(`
          INSERT INTO analytics_events (
            session_id, visitor_id, is_returning,
            event_type, page_url, page_title, properties,
            country, country_code, city, timezone,
            referrer, referrer_type, utm_source, utm_medium, utm_campaign,
            device_type, browser, os, language, screen_width, connection,
            created_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,
            COALESCE($23::timestamptz, NOW())
          )
        `, [
          e.session_id, e.visitor_id || null, e.is_returning || false,
          e.event_type, e.page_url || null, e.page_title || null,
          JSON.stringify(e.properties || {}),
          geo.country || null, geo.country_code || null, geo.city || null,
          e.timezone || null,
          e.referrer || null, e.referrer_type || 'direct',
          e.utm_source || null, e.utm_medium || null, e.utm_campaign || null,
          e.device_type || null, e.browser || null, e.os || null,
          e.language || null, e.screen_width || null, e.connection || null,
          e.timestamp || null,
        ]);

        // Upsert session row (create on first event, update metrics on subsequent)
        const duration = e.event_type === 'page_exit'
          ? (e.properties?.time_on_page_secs || null)
          : null;

        await client.query(`
          INSERT INTO analytics_sessions (
            session_id, visitor_id, is_returning,
            country, country_code, city, timezone,
            referrer_type, utm_source, utm_campaign,
            device_type, browser, os, language,
            page_count, event_count, first_page, last_page,
            duration_secs, started_at, updated_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
            CASE WHEN $15 = 'page_view' THEN 1 ELSE 0 END,
            1, $16, $16, $17, NOW(), NOW()
          )
          ON CONFLICT (session_id) DO UPDATE SET
            page_count    = analytics_sessions.page_count
                            + (CASE WHEN $15 = 'page_view' THEN 1 ELSE 0 END),
            event_count   = analytics_sessions.event_count + 1,
            last_page     = COALESCE($16, analytics_sessions.last_page),
            duration_secs = COALESCE($17, analytics_sessions.duration_secs),
            updated_at    = NOW()
        `, [
          e.session_id, e.visitor_id || null, e.is_returning || false,
          geo.country || null, geo.country_code || null, geo.city || null,
          e.timezone || null,
          e.referrer_type || 'direct', e.utm_source || null, e.utm_campaign || null,
          e.device_type || null, e.browser || null, e.os || null, e.language || null,
          e.event_type,
          e.page_url || null,
          duration,
        ]);
      }

      await client.query('COMMIT');
      res.status(204).end();

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('[Analytics track error]', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── GET /api/v1/analytics/dashboard ──────────────────────────────────────────
// Returns all data the admin dashboard Traffic tab needs in one call.
// Protected by a simple Bearer token (ANALYTICS_SECRET env var).

router.get('/dashboard', async (req, res) => {
  // Auth check — only the admin dashboard can call this
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token !== process.env.ANALYTICS_SECRET) return res.status(401).end();

  const { days = 30 } = req.query;   // default: last 30 days
  const since = `NOW() - INTERVAL '${parseInt(days)} days'`;

  try {
    const [
      summary,
      byCountry,
      byDevice,
      topPages,
      topFabrics,
      bySkinTone,
      bySource,
      timeSeries,
      liveNow,
    ] = await Promise.all([

      // ── Overall summary numbers ──────────────────────────────────────────
      pool.query(`
        SELECT
          COUNT(DISTINCT session_id)                AS sessions,
          COUNT(DISTINCT visitor_id)                AS visitors,
          COUNT(*) FILTER (WHERE event_type='page_view') AS page_views,
          ROUND(AVG(duration_secs) FILTER (WHERE duration_secs > 0)) AS avg_duration_secs,
          COUNT(*) FILTER (WHERE NOT is_returning)  AS new_sessions,
          COUNT(*) FILTER (WHERE is_returning)      AS returning_sessions
        FROM analytics_sessions
        WHERE started_at >= ${since}
      `),

      // ── Sessions by country (for world map) ──────────────────────────────
      pool.query(`
        SELECT country_code, country, COUNT(*) AS sessions
        FROM analytics_sessions
        WHERE started_at >= ${since} AND country_code IS NOT NULL
        GROUP BY country_code, country
        ORDER BY sessions DESC
      `),

      // ── Sessions by device type ──────────────────────────────────────────
      pool.query(`
        SELECT device_type, COUNT(*) AS sessions
        FROM analytics_sessions
        WHERE started_at >= ${since} AND device_type IS NOT NULL
        GROUP BY device_type ORDER BY sessions DESC
      `),

      // ── Top pages ────────────────────────────────────────────────────────
      pool.query(`
        SELECT page_url, COUNT(*) AS views,
               COUNT(DISTINCT session_id) AS unique_sessions
        FROM analytics_events
        WHERE event_type='page_view' AND created_at >= ${since}
        GROUP BY page_url ORDER BY views DESC LIMIT 15
      `),

      // ── Top fabrics selected ─────────────────────────────────────────────
      pool.query(`
        SELECT properties->>'fabric_id'   AS fabric_id,
               properties->>'fabric_type' AS fabric_type,
               COUNT(*)                   AS clicks
        FROM analytics_events
        WHERE event_type='fabric_clicked' AND created_at >= ${since}
        GROUP BY 1,2 ORDER BY clicks DESC LIMIT 10
      `),

      // ── Skin tone distribution ───────────────────────────────────────────
      pool.query(`
        SELECT properties->>'tone' AS tone, COUNT(*) AS selections
        FROM analytics_events
        WHERE event_type='skin_tone_selected' AND created_at >= ${since}
        GROUP BY 1 ORDER BY selections DESC
      `),

      // ── Traffic sources ──────────────────────────────────────────────────
      pool.query(`
        SELECT referrer_type,
               COALESCE(utm_source, referrer_type) AS source_label,
               COUNT(*) AS sessions
        FROM analytics_sessions
        WHERE started_at >= ${since}
        GROUP BY 1,2 ORDER BY sessions DESC LIMIT 10
      `),

      // ── Daily time series (sessions + page views per day) ────────────────
      pool.query(`
        SELECT DATE(started_at) AS date, COUNT(*) AS sessions
        FROM analytics_sessions
        WHERE started_at >= ${since}
        GROUP BY 1 ORDER BY 1
      `),

      // ── Live now: sessions active in last 5 minutes ──────────────────────
      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS active
        FROM analytics_sessions
        WHERE updated_at >= NOW() - INTERVAL '5 minutes'
      `),

    ]);

    res.json({
      days:       parseInt(days),
      summary:    summary.rows[0],
      byCountry:  byCountry.rows,
      byDevice:   byDevice.rows,
      topPages:   topPages.rows,
      topFabrics: topFabrics.rows,
      bySkinTone: bySkinTone.rows,
      bySource:   bySource.rows,
      timeSeries: timeSeries.rows,
      liveNow:    liveNow.rows[0]?.active || 0,
    });

  } catch (err) {
    console.error('[Analytics dashboard error]', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
