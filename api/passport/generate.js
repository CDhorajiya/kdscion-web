/**
 * Vercel Edge Function: POST /api/passport/generate
 * Proxies passport generation to Railway — keeps Railway URL private
 * and avoids CORS issues when called from the admin dashboard.
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });

  const railwayUrl = process.env.RAILWAY_API_URL;
  const secret     = process.env.ANALYTICS_SECRET;

  if (!railwayUrl || !secret) {
    return new Response(JSON.stringify({ error: 'Not configured' }), { status: 503 });
  }

  try {
    const body = await req.text();
    const res  = await fetch(`${railwayUrl}/api/v1/passport/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret}` },
      body,
    });
    const data = await res.text();
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed' }), { status: 502 });
  }
}
