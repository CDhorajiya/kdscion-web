#!/usr/bin/env node
/* render_leather_snaps.mjs — the Jackets / Coats gallery's snapshots, in leather, per skin tone.

     node tools/render_leather_snaps.mjs            # every card in js/design-codes.js
     node tools/render_leather_snaps.mjs 19 21      # just these designs

   For each card (a variation set's first design) and each skin tone it opens the real
   product page in its leather view (w-lN.html?leather) — the same lit leather, seams and
   light the customer sees (js/leather-look.js) — dresses it in Cognac Calf, sets the
   tone, and screenshots the bare 3D canvas. Reduced motion keeps the Showcase off, so
   the model faces front and stands still.
   Raw PNGs go to a temp folder; tools/normalize_leather_snaps.py then keys out the
   background and sets each on the pool's 1679×2042 canvas as
   images/leather/KDscion-w-lN-<tone>.webp. */
import puppeteer from 'puppeteer';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LEATHER_JACKETS_COATS } from '../js/design-codes.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = 8812;
const RAW = path.join(os.tmpdir(), 'kd-leather-snaps');
const TONES = [['fair', ''], ['medium', 'medium'], ['tan', 'tan'], ['dark', 'dark']];
const LEATHER = 'leather-plain-2';   // Cognac Calf: the construction reads best in it
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const want = process.argv.slice(2).map(Number).filter(Boolean);
const designs = LEATHER_JACKETS_COATS.map((c) => c[0]).filter((n) => !want.length || want.includes(n));

await mkdir(RAW, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
for (let i = 0; i < 50; i++) {                        // until the server answers (≤ 10 s)
    try { if ((await fetch(`http://127.0.0.1:${PORT}/js/design-codes.js`)).ok) break; } catch (e) { /* not yet */ }
    await wait(200);
}
const browser = await puppeteer.launch({ headless: 'new', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const failed = [];
try {
    for (const n of designs) {
        const page = await browser.newPage();
        await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
        await page.setViewport({ width: 1500, height: 1500, deviceScaleFactor: 2 });
        try {
            await page.goto(`http://127.0.0.1:${PORT}/w-l${n}.html?leather`, { waitUntil: 'networkidle2', timeout: 90000 });
            await page.waitForSelector(`.swatch-card[data-fabric-id="${LEATHER}"]`, { timeout: 30000 });
            await wait(4000);                                   // the model
            await page.evaluate(() => { document.querySelector('.fabric-panel .category-card')?.click(); });
            await wait(300);
            await page.click(`.swatch-card[data-fabric-id="${LEATHER}"]`).catch(() =>
                page.evaluate((id) => document.querySelector(`.swatch-card[data-fabric-id="${id}"]`).click(), LEATHER));
            await wait(2500);
            await page.evaluate(() => document.getElementById('fabric-preview-back')?.click());
            // nothing but the garment: no pill, logo, buttons, pointers or maker's mark
            await page.addStyleTag({ content: '.viewer-panel > :not(canvas), .kd-leather-mark { visibility: hidden !important; }' });
            for (const [tone, key] of TONES) {
                await page.evaluate((k) => document.querySelector(`.skin-btn[data-skin="${k}"]`)?.click(), key);
                await wait(key ? 7000 : 1500);                   // a tone's reference avatar loads on demand
                const canvas = await page.$('.viewer-panel canvas');
                const file = path.join(RAW, `w-l${n}-${tone}.png`);
                await canvas.screenshot({ path: file });
                console.log('  rendered', path.basename(file));
            }
        } catch (e) {
            failed.push(n);
            console.error(`  w-l${n} failed: ${e.message}`);
        }
        await page.close();
    }
} finally {
    await browser.close();
    server.kill();
}
const py = spawnSync('python3', [path.join(ROOT, 'tools/normalize_leather_snaps.py'), RAW, ...designs.filter((n) => !failed.includes(n)).map(String)], { stdio: 'inherit' });
if (failed.length || py.status) { console.error('failed:', failed.join(' ') || 'normalize'); process.exit(1); }
