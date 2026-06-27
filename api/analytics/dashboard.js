/**
 * ============================================================
 *  Vercel Serverless Function: /api/analytics/dashboard
 * ============================================================
 *
 *  The admin dashboard Traffic tab calls this endpoint to fetch
 *  all traffic data. This proxies the request to Railway
 *  with the secret token attached.
 *
 *  Only the admin dashboard (pin-gated) calls this.
 *  Query params: ?days=30  (default 30 days)
 * ============================================================
 */

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'GET') return new Response(null, { status: 405 });

  const railwayUrl = process.env.RAILWAY_API_URL;
  const secret     = process.env.ANALYTICS_SECRET;

  if (!railwayUrl || !secret) {
    // Return empty/demo data if env vars are not configured yet
    return new Response(JSON.stringify({ _demo: true, days: 30, summary: {sessions:0,visitors:0,page_views:0}, byCountry:[], byDevice:[], topPages:[], topFabrics:[], bySkinTone:[], bySource:[], timeSeries:[], liveNow:0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const days = new URL(req.url).searchParams.get('days') || '30';

  try {
    const res = await fetch(`${railwayUrl}/api/v1/analytics/dashboard?days=${days}`, {
      headers: { 'Authorization': `Bearer ${secret}` },
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch analytics' }), { status: 502 });
  }
}
