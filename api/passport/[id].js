/**
 * Vercel Edge Function: /api/passport/[id]
 * Fetches passport data from Railway and returns it to the passport page.
 * Public endpoint — no auth needed (passport numbers are hard to guess).
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url      = new URL(req.url);
  const id       = url.pathname.split('/').pop();
  const railwayUrl = process.env.RAILWAY_API_URL;

  if (!id || !railwayUrl) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const res  = await fetch(`${railwayUrl}/api/v1/passport/${encodeURIComponent(id.toUpperCase())}`);
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to fetch passport' }), {
      status: 502, headers: { 'Content-Type': 'application/json' },
    });
  }
}
