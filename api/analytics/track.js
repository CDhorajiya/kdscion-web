/**
 * ============================================================
 *  Vercel Serverless Function: /api/analytics/track
 * ============================================================
 *
 *  This file runs SERVER-SIDE on Vercel (not in the browser).
 *  Vercel auto-deploys it because it lives in the /api/ folder.
 *
 *  It receives the event batch from analytics.js, then forwards
 *  it to the Railway backend route POST /api/v1/analytics/track.
 *
 *  WHY a proxy rather than calling Railway directly from the browser?
 *  → Keeps the Railway URL private (not exposed to DevTools)
 *  → Lets us add auth, rate-limiting, and IP resolution server-side
 *  → The request appears to come from kdscion.com so it's never
 *    treated as a third-party call by browsers or ad-blockers
 *
 *  SETUP (one-time, in Vercel dashboard → Settings → Environment Variables):
 *    RAILWAY_API_URL      = https://fashion-backend-production-3ed9.up.railway.app
 *    ANALYTICS_SECRET     = <any long random string you set on Railway too>
 * ============================================================
 */

export const config = {
  runtime: 'edge',   // Edge runtime: globally distributed, near-instant cold start
};

// Simple in-memory rate limit for Edge runtime (per isolate, resets on cold start)
const ipHits = new Map();
const LIMIT   = 60;    // max events per IP per minute
const WINDOW  = 60000; // 1 minute in ms

function isRateLimited(ip) {
  const now    = Date.now();
  const bucket = Math.floor(now / WINDOW);
  const key    = `${ip}:${bucket}`;
  const count  = (ipHits.get(key) || 0) + 1;
  ipHits.set(key, count);
  if (ipHits.size > 1000) {                  // prevent map from growing unbounded
    const old = String(bucket - 1);
    for (const k of ipHits.keys()) { if (k.endsWith(`:${old}`)) ipHits.delete(k); }
  }
  return count > LIMIT;
}

const BOT_RE = /bot|crawl|spider|googlebot|bingbot|yandex|curl|python/i;

export default async function handler(req) {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  // Block bots
  const ua = req.headers.get('user-agent') || '';
  if (BOT_RE.test(ua)) return new Response(null, { status: 204 });

  // Rate limit by IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
          || req.headers.get('x-real-ip')
          || 'unknown';
  if (isRateLimited(ip)) return new Response(null, { status: 429 });

  // Parse body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  if (!Array.isArray(body?.events) || !body.events.length) {
    return new Response(null, { status: 400 });
  }

  // Forward to Railway backend
  const railwayUrl = process.env.RAILWAY_API_URL;
  const secret     = process.env.ANALYTICS_SECRET;

  if (!railwayUrl || !secret) {
    // Env vars not configured yet — silently accept (don't break the site)
    return new Response(null, { status: 204 });
  }

  try {
    // Attach the real IP so Railway can do geolocation
    const enrichedBody = {
      events: body.events,
      _client_ip: ip,      // Railway backend will read this for geo lookup
    };

    await fetch(`${railwayUrl}/api/v1/analytics/track`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${secret}`,   // Railway verifies this
        'X-Client-IP':   ip,
      },
      body: JSON.stringify(enrichedBody),
    });
  } catch (_) {
    // If Railway is down, silently discard — analytics must never break the site
  }

  return new Response(null, { status: 204 });
}
