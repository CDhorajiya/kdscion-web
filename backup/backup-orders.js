#!/usr/bin/env node
/**
 * KD Workshop — Daily Order Backup
 * Fetches all orders from the API and saves them locally.
 * Same file refreshed daily within the month.
 * New month → new folder auto-created.
 *
 * Output: ~/Documents/KD-Backups/YYYY-MM/orders-YYYY-MM.json
 *         ~/Documents/KD-Backups/YYYY-MM/report-YYYY-MM.html
 *         ~/Documents/KD-Backups/backup.log
 */

const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const { URL } = require('url');

// ── Config ────────────────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
} catch (_) {
  console.error('ERROR: config.json not found.\nRun:  cp config.example.json config.json\nThen fill in your email and password.');
  process.exit(1);
}

const BASE        = 'https://fashion-backend-production-3ed9.up.railway.app/api/v1';
const BACKUP_ROOT = path.join(process.env.HOME, 'Documents', 'KD-Backups');

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url  = new URL(urlStr);
    const opts = {
      hostname: url.hostname,
      port:     443,
      path:     url.pathname + url.search,
      method:   options.method || 'GET',
      headers:  { 'Content-Type': 'application/json', ...options.headers },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (!data) return resolve(null);
        let parsed;
        try { parsed = JSON.parse(data); } catch (_) { return resolve(data); }
        if (res.statusCode >= 400) reject(new Error(parsed?.message || `HTTP ${res.statusCode}`));
        else resolve(parsed);
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Measurement groups ────────────────────────────────────────────────────────
const MEAS_GROUPS = [
  { title: 'General',    fields: [{ key: 'height', label: 'Height', unit: 'cm' }, { key: 'weight', label: 'Weight', unit: 'kg' }] },
  { title: 'Upper Body', fields: [{ key: 'neck', label: 'Neck', unit: 'cm' }, { key: 'shoulder', label: 'Shoulder', unit: 'cm' }, { key: 'chest', label: 'Chest', unit: 'cm' }, { key: 'underbust', label: 'Under Bust', unit: 'cm' }, { key: 'waist', label: 'Waist', unit: 'cm' }, { key: 'highhip', label: 'High Hip', unit: 'cm' }, { key: 'hip', label: 'Full Hip', unit: 'cm' }, { key: 'backlength', label: 'Back Length', unit: 'cm' }] },
  { title: 'Arms',       fields: [{ key: 'armlength', label: 'Arm Length', unit: 'cm' }, { key: 'bicep', label: 'Bicep', unit: 'cm' }, { key: 'wrist', label: 'Wrist', unit: 'cm' }] },
  { title: 'Lower Body', fields: [{ key: 'inseam', label: 'Inseam', unit: 'cm' }, { key: 'outseam', label: 'Outseam', unit: 'cm' }, { key: 'knee', label: 'Knee', unit: 'cm' }, { key: 'calf', label: 'Calf', unit: 'cm' }, { key: 'ankle', label: 'Ankle', unit: 'cm' }, { key: 'waisttoankle', label: 'Waist–Ankle', unit: 'cm' }] },
];

// ── HTML report builder ───────────────────────────────────────────────────────
function buildHtml(payload) {
  const { exportedAt, month, orders } = payload;
  const dateLabel = new Date(exportedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const totalRevenue = orders.reduce((sum, o) => {
    const items = o.items ?? o.cartItems ?? [];
    return sum + items.reduce((s, i) => s + Number(i.unitPrice ?? 0) * (i.quantity ?? 1), 0);
  }, 0);

  let ordersHtml = '';
  orders.forEach(order => {
    const items     = order.items ?? order.cartItems ?? [];
    const total     = items.reduce((s, i) => s + Number(i.unitPrice ?? 0) * (i.quantity ?? 1), 0);
    const addr      = order.shippingAddress;
    const addrStr   = addr ? [addr.line1, addr.line2, addr.city, addr.state, addr.postalCode, addr.country].filter(Boolean).join(', ') : '—';
    const custName  = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || '—';
    const custEmail = order.user?.email || '—';
    const dateStr   = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

    let itemRows = '';
    items.forEach(item => {
      const name       = item.displayName ?? item.product?.name ?? 'Bespoke Garment';
      const sku        = item.product?.sku ?? item.product?.id ?? '—';
      const fabricVal  = Object.values(item.configuratorSession?.selections ?? {})[0] ?? null;
      const fabricName = fabricVal?.label ?? '—';
      const fabricId   = fabricVal?.id ?? '—';
      const price      = Number(item.unitPrice ?? 0) * (item.quantity ?? 1);
      itemRows += `<tr>
        <td style="padding:0.4rem 0.6rem">${name}</td>
        <td style="padding:0.4rem 0.6rem;font-family:monospace;font-size:0.85rem">${sku}</td>
        <td style="padding:0.4rem 0.6rem">${fabricName}</td>
        <td style="padding:0.4rem 0.6rem;font-family:monospace;font-size:0.85rem">${fabricId}</td>
        <td style="padding:0.4rem 0.6rem;text-align:right">$${price.toLocaleString()}</td>
      </tr>`;
    });

    // Measurements
    const meas = order._measurements?.measurements ?? null;
    let measHtml = '';
    if (meas && Object.keys(meas).length > 0) {
      measHtml = `<div style="margin-top:0.8rem;font-size:0.82rem;color:#555">`;
      MEAS_GROUPS.forEach(g => {
        const rows = g.fields.filter(f => meas[f.key] != null);
        if (!rows.length) return;
        measHtml += `<strong style="letter-spacing:3px;text-transform:uppercase;font-size:0.75rem">${g.title}:</strong> `;
        measHtml += rows.map(f => `${f.label} ${meas[f.key]}${f.unit}`).join(' · ') + '&ensp;';
      });
      measHtml += `</div>`;
    }

    ordersHtml += `
    <div style="margin-bottom:2rem;padding:1.4rem 1.6rem;border:1px solid #e0e0e0;border-radius:3px;background:#fafaf9;page-break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #ddd;padding-bottom:0.7rem;margin-bottom:0.9rem">
        <span style="font-family:monospace;font-size:0.9rem;color:#333">Order #${order.id ?? '—'}</span>
        <span style="font-size:0.85rem;color:#888;letter-spacing:2px">${dateStr}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;margin-bottom:0.9rem;font-size:0.9rem;line-height:1.8">
        <div><strong>Customer:</strong> ${custName}<br><strong>Email:</strong> ${custEmail}</div>
        <div><strong>Address:</strong> ${addrStr}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:0.88rem">
        <thead><tr style="border-bottom:1px solid #ccc;text-align:left;font-size:0.78rem;letter-spacing:3px;text-transform:uppercase;color:#aaa">
          <th style="padding:0.3rem 0.6rem">Garment</th>
          <th style="padding:0.3rem 0.6rem">Design #</th>
          <th style="padding:0.3rem 0.6rem">Fabric</th>
          <th style="padding:0.3rem 0.6rem">Fabric #</th>
          <th style="padding:0.3rem 0.6rem;text-align:right">Price</th>
        </tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="text-align:right;margin-top:0.6rem;border-top:1px solid #ddd;padding-top:0.5rem;font-size:0.95rem">
        <strong>Total: $${total.toLocaleString()}</strong>
      </div>
      ${order.notes ? `<div style="margin-top:0.5rem;font-style:italic;color:#666;font-size:0.85rem">Notes: ${order.notes}</div>` : ''}
      ${measHtml}
    </div>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>KD Orders — ${month}</title>
  <style>
    body { font-family:"Times New Roman",serif; max-width:960px; margin:0 auto; padding:2.5rem 2rem; color:#111; background:#fff; }
    h1   { font-size:1.4rem; letter-spacing:8px; text-transform:uppercase; font-weight:400; border-top:2px solid #111; padding-top:1.5rem; margin:0 0 0.3rem; }
    .meta    { color:#888; font-size:0.9rem; letter-spacing:3px; margin:0 0 0.4rem; }
    .summary { display:flex; gap:1.5rem; margin:1.5rem 0 2rem; flex-wrap:wrap; }
    .stat    { border:1px solid #e0e0e0; border-radius:3px; padding:0.8rem 1.4rem; background:#fafaf9; }
    .stat-n  { font-size:1.7rem; letter-spacing:2px; margin:0 0 0.15rem; }
    .stat-l  { font-size:0.75rem; letter-spacing:5px; text-transform:uppercase; color:#aaa; margin:0; }
    .print-btn { margin-bottom:2rem; padding:0.5rem 1.5rem; font-family:inherit; font-size:0.85rem; letter-spacing:3px; text-transform:uppercase; cursor:pointer; border:1px solid #ccc; background:#fff; border-radius:2px; }
    @media print { .no-print{display:none} }
  </style>
</head>
<body>
  <h1>King Dhorajiya — Orders ${month}</h1>
  <p class="meta">Last updated: ${dateLabel} &nbsp;·&nbsp; ${orders.length} order${orders.length !== 1 ? 's' : ''}</p>
  <div class="summary">
    <div class="stat"><p class="stat-n">${orders.length}</p><p class="stat-l">Total Orders</p></div>
    <div class="stat"><p class="stat-n">$${totalRevenue.toLocaleString()}</p><p class="stat-l">Revenue</p></div>
  </div>
  <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
  ${ordersHtml || '<p style="color:#bbb;text-align:center;padding:3rem 0;letter-spacing:4px;text-transform:uppercase">No orders yet.</p>'}
</body>
</html>`;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  const now      = new Date();
  const yyyy     = now.getFullYear();
  const mm       = String(now.getMonth() + 1).padStart(2, '0');
  const dd       = String(now.getDate()).padStart(2, '0');
  const monthKey = `${yyyy}-${mm}`;
  const dateStr  = `${yyyy}-${mm}-${dd}`;

  const monthDir = path.join(BACKUP_ROOT, monthKey);
  fs.mkdirSync(monthDir, { recursive: true });

  const logPath = path.join(BACKUP_ROOT, 'backup.log');
  const log = msg => {
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
    console.log(msg);
  };

  log(`── Backup started ${dateStr} ──`);

  // Login
  const auth  = await request(`${BASE}/auth/login`, { method: 'POST' }, { email: config.email, password: config.password });
  const hdrs  = { Authorization: `Bearer ${auth.accessToken}` };

  // Orders
  const raw    = await request(`${BASE}/orders`, { headers: hdrs });
  const orders = Array.isArray(raw) ? raw : (raw?.data ?? raw?.orders ?? []);

  // Measurements (for context)
  let measurements = null;
  try { measurements = await request(`${BASE}/users/me/measurements`, { headers: hdrs }); } catch (_) {}

  const payload = {
    exportedAt:  new Date().toISOString(),
    month:       monthKey,
    updatedDate: dateStr,
    totalOrders: orders.length,
    orders,
    measurements,
  };

  // Write JSON
  fs.writeFileSync(path.join(monthDir, `orders-${monthKey}.json`), JSON.stringify(payload, null, 2), 'utf8');

  // Write HTML
  fs.writeFileSync(path.join(monthDir, `report-${monthKey}.html`), buildHtml(payload), 'utf8');

  log(`✓ ${orders.length} orders saved → ${monthDir}`);
}

run().catch(err => {
  const logPath = path.join(BACKUP_ROOT, 'backup.log');
  try { fs.appendFileSync(logPath, `[${new Date().toISOString()}] ERROR: ${err.message}\n`); } catch (_) {}
  console.error('Backup failed:', err.message);
  process.exit(1);
});
