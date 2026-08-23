/**
 * capture-fabric-snaps.mjs — Phase 2 render pipeline (test scope)
 * ------------------------------------------------------------------
 * Drives real product pages exactly like a customer would: clicks the
 * Main Design swatch cards that already exist in fabrics.js, waits for
 * the live Three.js viewer (js/configurator.js + fabrics.js) to apply
 * the texture, and screenshots the #viewer-canvas element.
 *
 * Read-only against the product pages — clicks swatches in the DOM,
 * writes nothing back to them. Output goes to a scratch folder; a
 * separate normalize step (chroma-key + crop + recenter) turns these
 * into pool-ready WebPs.
 *
 * Usage: node scripts/capture-fabric-snaps.mjs
 */
import puppeteer from 'puppeteer';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const PORT = 8811;
const OUT_DIR = process.argv[2] || '/private/tmp/claude-501/-Users-kd-Desktop-KDscion-web/31eae504-c781-48f6-9c02-8496ed5ced7c/scratchpad/raw-snaps';

const PRODUCTS = [
  { sku: 'KD-P60-FSSD',      page: 'p60.html' },
  { sku: 'KD-P78-FSBLTL',    page: 'p78.html' },
  { sku: 'KD-P176-FSASD176', page: 'p176.html' },
];

const TEST_FABRIC_IDS = ['cotton-1', 'linen-1', 'wool-1'];

function waitMs(ms) { return new Promise(r => setTimeout(r, ms)); }

async function startServer() {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], {
    cwd: path.resolve(import.meta.dirname, '..'),
    stdio: 'ignore',
  });
  await waitMs(800);
  return srv;
}

async function captureOne(page, sku, fabricId, outDir) {
  const clicked = await page.evaluate((fid) => {
    const el = document.querySelector(`.swatch-card[data-fabric-id="${fid}"]`);
    if (!el) return false;
    el.click();
    return true;
  }, fabricId);

  if (!clicked) {
    console.warn(`  [skip] ${sku} has no swatch-card for ${fabricId}`);
    return null;
  }

  // Wait for texture load (console log from applyFabric/applyFabricToMeshSet) with a timeout fallback.
  await Promise.race([
    new Promise((resolve) => {
      const handler = (msg) => {
        if (msg.text().includes('[fabric] applied')) { page.off('console', handler); resolve(); }
      };
      page.on('console', handler);
    }),
    waitMs(2500),
  ]);

  // Close the full-screen fabric preview overlay that opens on swatch click.
  await page.evaluate(() => {
    document.getElementById('fabric-preview-back')?.click();
  });
  await waitMs(400); // let the render loop settle on the new material

  const canvas = await page.$('#viewer-canvas');
  const outPath = path.join(outDir, `${sku}__${fabricId}.png`);
  await canvas.screenshot({ path: outPath });
  console.log(`  [ok] ${outPath}`);
  return outPath;
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const server = await startServer();
  const browser = await puppeteer.launch({ headless: 'new' });

  try {
    for (const { sku, page: pagePath } of PRODUCTS) {
      console.log(`\n=== ${sku} (${pagePath}) ===`);
      const page = await browser.newPage();
      await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 2 });
      page.on('pageerror', (err) => console.error(`  [pageerror] ${err.message}`));

      await page.goto(`http://localhost:${PORT}/${pagePath}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await waitMs(3000); // GLB + textures settle

      // Hide viewer chrome that overlaps the canvas region on screen (buttons,
      // annotation layer) — these aren't part of the garment and must not leak
      // into the pool snap.
      await page.evaluate(() => {
        for (const sel of ['#design-only-btn', '#design-details-btn', '#detail-layer']) {
          const el = document.querySelector(sel);
          if (el) el.style.display = 'none';
        }
      });

      for (const fabricId of TEST_FABRIC_IDS) {
        await captureOne(page, sku, fabricId, OUT_DIR);
      }
      await page.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
}

run().catch((err) => { console.error(err); process.exit(1); });
