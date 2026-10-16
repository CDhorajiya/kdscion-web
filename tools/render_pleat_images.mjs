#!/usr/bin/env node
/* render_pleat_images.mjs — the trouser-front images for js/pleat-studio.js.

     node tools/render_pleat_images.mjs

   Flat Front, Single Pleat and Double Pleat drawn as light stone flannel from
   a clean waistband (belt loops, no button) to just below the
   knee — legs shaded round, pressed creases, slant pockets, fly — on a soft
   grey ground, rendered by
   headless Chrome to images/pleats/<id>.webp (1000 × 1000).

   Pleats are forward pleats folded into the crease (the second, shorter one
   of a double pleat sits towards the pocket); pleated fronts are cut a little
   fuller through the hip and thigh. */
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'images/pleats');
const TMP = path.join(os.tmpdir(), 'kd-pleats');

// per front: fullness through the hip, and its pleats (x at the waist, depth down the leg)
const FRONTS = {
    flat:   { f: 0,   pleats: [] },
    single: { f: 2.8, pleats: [{ x: 90, len: 54, w: 5.5 }] },
    double: { f: 4.8, pleats: [{ x: 90, len: 56, w: 5.8 }, { x: 78, len: 38, w: 4.4 }] },
};
const mx = (x) => 240 - x;
const W = 36;   // the waistband's lower edge

/* One forward pleat on the wearer's right leg (mirrored for the left). The
   cloth is folded back on itself towards the fly: the over-layer rolls round
   into a pressed edge, a small mouth opens where it leaves the waistband, and
   the under-layer lies in the shadow of the fold. All of it fades down the leg
   as the pleat releases into the crease, with soft fullness either side. */
function pleatSVG(p, k) {
    const x = p.x, end = W + p.len, w = p.w;
    const c1 = W + p.len * 0.35, c2 = W + p.len * 0.7;
    const edge = `M${x},${W} C${x + 0.5},${c1} ${x + 0.7},${c2} ${x + 0.4},${end}`;
    const g = `pl${k}`;
    return `
  <defs>
    <linearGradient id="${g}-fade" x1="0" x2="0" y1="${W}" y2="${end}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#fff" stop-opacity=".95"/>
      <stop offset=".75" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="${g}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
      <rect x="0" y="${W - 2}" width="240" height="${p.len + 4}" fill="url(#${g}-fade)"/></mask>
    <linearGradient id="${g}-roll" x1="${x - 8}" x2="${x}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/>
      <stop offset=".82" stop-color="#fff" stop-opacity=".34"/><stop offset=".94" stop-color="#000" stop-opacity=".02"/>
      <stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    <linearGradient id="${g}-tuck" x1="${x}" x2="${x + w}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3b3227" stop-opacity=".55"/><stop offset=".18" stop-color="#3b3227" stop-opacity=".32"/>
      <stop offset=".55" stop-color="#3b3227" stop-opacity=".1"/><stop offset="1" stop-color="#3b3227" stop-opacity="0"/></linearGradient>
  </defs>
  <g mask="url(#${g}-m)">
    <!-- fullness: the over-layer bellies out a little, the cloth past the fold sinks -->
    <path d="M${x - 9},${W + 2} C${x - 10},${c1} ${x - 9},${c2} ${x - 7},${end + 10}" fill="none" stroke="#fff" stroke-width="6" opacity=".12" filter="url(#b3)"/>
    <path d="M${x + w + 3},${W + 2} C${x + w + 4},${c1} ${x + w + 3},${c2} ${x + w},${end + 10}" fill="none" stroke="#3b3227" stroke-width="5" opacity=".07" filter="url(#b3)"/>
    <!-- the over-layer rolling round into the fold -->
    <path d="M${x - 8},${W} L${x},${W} C${x + 0.5},${c1} ${x + 0.7},${c2} ${x + 0.4},${end} L${x - 7.4},${end} C${x - 7.8},${c2} ${x - 8},${c1} ${x - 8},${W} Z" fill="url(#${g}-roll)" filter="url(#b05)"/>
    <!-- the under-layer in the shadow of the fold -->
    <path d="M${x},${W} L${x + w},${W} C${x + w * 0.95},${c1} ${x + w * 0.85},${c2} ${x + w * 0.7},${end} L${x + 0.4},${end} C${x + 0.7},${c2} ${x + 0.5},${c1} ${x},${W} Z" fill="url(#${g}-tuck)" filter="url(#b05)"/>
    <!-- the pressed edge: a lit rim and the dark line where it turns under -->
    <path d="${edge}" fill="none" stroke="#fff" stroke-width=".7" opacity=".55" filter="url(#b03)" transform="translate(-.55 0)"/>
    <path d="${edge}" fill="none" stroke="#4a4035" stroke-width=".38" opacity=".7"/>
  </g>
  <!-- the mouth of the pleat, where it leaves the waistband -->
  <path d="M${x - 0.4},${W - 0.2} L${x + 2.2},${W - 0.2} Q${x + 1},${W + 3} ${x + 0.35},${W + 7.5} Q${x + 0.1},${W + 3} ${x - 0.4},${W - 0.2} Z" fill="#2e271f" opacity=".5" filter="url(#b03)"/>
  <ellipse cx="${x + 2}" cy="${W + 0.6}" rx="${w * 0.6}" ry="1.2" fill="#3b3227" opacity=".22" filter="url(#b06)"/>`;
}

function svg(id) {
    const { f, pleats } = FRONTS[id];
    const outer = `M63,${W} C${58 - f},54 ${55 - f},76 ${56 - f},98 L${60 - f * 0.6},214`;
    const shape = `M63,${W} Q120,${W - 3} 177,${W} C${182 + f},54 ${185 + f},76 ${184 + f},98 L${180 + f * 0.6},214 L125,214 `
                + `C124,180 122,142 120.6,106 Q120,104.6 119.4,106 C118,142 116,180 115,214 L${60 - f * 0.6},214 `
                + `L${56 - f},98 C${55 - f},76 ${58 - f},54 63,${W} Z`;
    const crease = (x) => `M${x},${pleats.length ? W + 20 : 66} Q${x + 0.4},120 ${x - 1.6},214`;
    const pocket = `M73,${W + 0.4} Q66,54 ${58.6 - f * 0.8},75`;
    const pocketSVG = `
      <path d="${pocket}" fill="none" stroke="#3b3227" stroke-width="2" opacity=".3" filter="url(#b06)" transform="translate(.9 .4)"/>
      <path d="${pocket}" fill="none" stroke="#7a7266" stroke-width=".5"/>
      <path d="${pocket}" fill="none" stroke="#ece7dd" stroke-width=".3" stroke-dasharray=".9 .6" transform="translate(1.6 .2)"/>`;
    const loop = (x) => `
      <rect x="${x - 1.7}" y="19.6" width="3.4" height="${W - 18}" rx=".7" fill="#000" opacity=".22" filter="url(#b06)" transform="translate(.6 .8)"/>
      <rect x="${x - 1.7}" y="19.6" width="3.4" height="${W - 18}" rx=".7" fill="url(#band)" stroke="#8a8276" stroke-width=".3"/>
      <rect x="${x - 1.7}" y="19.6" width="1.2" height="${W - 18}" fill="#fff" opacity=".25"/>
      <path d="M${x - 1.2},21.2 H${x + 1.2} M${x - 1.2},${W - 0.6} H${x + 1.2}" stroke="#ece7dd" stroke-width=".3" stroke-dasharray=".5 .4"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="16 6 208 208" width="1000" height="1000">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#f2f2f0"/><stop offset="1" stop-color="#d6d6d3"/></radialGradient>
    <linearGradient id="legL" x1="${54 - f}" x2="120" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#a49d90"/><stop offset=".14" stop-color="#c2bbae"/><stop offset=".42" stop-color="#dcd6ca"/>
      <stop offset=".72" stop-color="#d0c9bd"/><stop offset="1" stop-color="#b3ac9f"/></linearGradient>
    <linearGradient id="legR" x1="120" x2="${186 + f}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#b5aea1"/><stop offset=".3" stop-color="#d3ccc0"/><stop offset=".6" stop-color="#d8d2c6"/>
      <stop offset=".86" stop-color="#bdb6a9"/><stop offset="1" stop-color="#a0998c"/></linearGradient>
    <linearGradient id="band" x1="0" x2="0" y1="20" y2="${W + 1}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#e2dcd1"/><stop offset=".3" stop-color="#d7d0c4"/><stop offset="1" stop-color="#bfb8ab"/></linearGradient>
    <linearGradient id="hip" x1="0" x2="0" y1="${W}" y2="214" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#3b3227" stop-opacity=".16"/><stop offset=".08" stop-color="#3b3227" stop-opacity="0"/>
      <stop offset=".85" stop-color="#3b3227" stop-opacity="0"/><stop offset="1" stop-color="#3b3227" stop-opacity=".1"/></linearGradient>
    <linearGradient id="steel" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#f6f6f6"/><stop offset=".5" stop-color="#a7a7a7"/><stop offset="1" stop-color="#6c6c6c"/></linearGradient>
    <filter id="heather" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.9 1.4" numOctaves="3" seed="11"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
    </filter>
    <filter id="fleck" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="3.4" numOctaves="1" seed="5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .25  0 0 0 9 -6.4"/>
    </filter>
    <filter id="b03" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".3"/></filter>
    <filter id="b05" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".5"/></filter>
    <filter id="b06" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".6"/></filter>
    <filter id="b12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="b3"  x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <clipPath id="clip"><path d="${shape}"/></clipPath>
  </defs>

  <rect x="0" y="0" width="240" height="240" fill="url(#bg)"/>
  <path d="${shape}" fill="#000" opacity=".2" filter="url(#b3)" transform="translate(1.5 2.5)"/>

  <!-- the legs, each shaded round -->
  <path d="${shape}" fill="#d0c9bd"/>
  <g clip-path="url(#clip)">
    <rect x="16" y="30" width="104" height="190" fill="url(#legL)"/>
    <rect x="120" y="30" width="104" height="190" fill="url(#legR)"/>
    <rect x="16" y="6" width="208" height="214" filter="url(#heather)" opacity=".1" style="mix-blend-mode:multiply"/>
    <rect x="16" y="6" width="208" height="214" filter="url(#fleck)" opacity=".22"/>
    <rect x="16" y="6" width="208" height="214" fill="url(#hip)"/>

    <!-- pressed creases: a lit edge with its shadow beside it -->
    <path d="${crease(90)}" fill="none" stroke="#3b3227" stroke-width="2.4" opacity=".14" filter="url(#b12)" transform="translate(1.3 0)"/>
    <path d="${crease(90)}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".4" filter="url(#b06)"/>
    <path d="${crease(mx(90))}" fill="none" stroke="#3b3227" stroke-width="2.4" opacity=".14" filter="url(#b12)" transform="translate(-1.3 0)"/>
    <path d="${crease(mx(90))}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".34" filter="url(#b06)"/>

    <!-- pleats, folded towards the fly -->
    ${pleats.map((p, k) => pleatSVG(p, `a${k}`)).join('')}
    <g transform="translate(240 0) scale(-1 1)">${pleats.map((p, k) => pleatSVG(p, `b${k}`)).join('')}</g>

    <!-- slant pockets -->
    ${pocketSVG}
    <g transform="translate(240 0) scale(-1 1)">${pocketSVG}</g>

    <!-- fly and centre seam -->
    <path d="M120,${W} L120,105" fill="none" stroke="#7a7266" stroke-width=".5"/>
    <path d="M120.6,${W} L120.6,104" fill="none" stroke="#3b3227" stroke-width="1.4" opacity=".22" filter="url(#b06)"/>
    <path d="M126.4,${W + 1} L126.4,88 Q126.4,97 120.4,100.6" fill="none" stroke="#ece7dd" stroke-width=".32" stroke-dasharray=".9 .6"/>
    <!-- the gap between the legs, in shadow -->
    <path d="M119.4,106 C118,142 116,180 115,214 M120.6,106 C122,142 124,180 125,214" fill="none" stroke="#3b3227" stroke-width="2.4" opacity=".22" filter="url(#b12)"/>
  </g>
  <path d="${outer}" fill="none" stroke="#8a8276" stroke-width=".45"/>
  <path d="${outer}" fill="none" stroke="#8a8276" stroke-width=".45" transform="translate(240 0) scale(-1 1)"/>

  <!-- a clean waistband: belt loops, no button, the fly closing on a hidden hook -->
  <path d="M63,${W} Q120,${W - 3} 177,${W}" fill="none" stroke="#3b3227" stroke-width="2.4" opacity=".3" filter="url(#b06)" transform="translate(0 1)"/>
  <path d="M64,21.6 Q120,18.6 176,21.6 L177,${W} Q120,${W - 3} 63,${W} Z" fill="url(#band)"/>
  <path d="M64,21.6 Q120,18.6 176,21.6 L177,${W} Q120,${W - 3} 63,${W} Z" fill="#000" filter="url(#heather)" opacity=".06" style="mix-blend-mode:multiply"/>
  <path d="M64,21.6 Q120,18.6 176,21.6" fill="none" stroke="#f3efe7" stroke-width=".7"/>
  <path d="M64,21.6 Q120,18.6 176,21.6 L177,${W} Q120,${W - 3} 63,${W} Z" fill="none" stroke="#8a8276" stroke-width=".45"/>
  <path d="M64.4,23.6 Q120,20.6 175.6,23.6 M63.6,${W - 2} Q120,${W - 5} 176.4,${W - 2}" fill="none" stroke="#ece7dd" stroke-width=".3" stroke-dasharray=".9 .6"/>
  <path d="M120,20.2 L120,${W - 2.9}" stroke="#7a7266" stroke-width=".45"/>
  <path d="M120.7,20.4 L120.7,${W - 3}" stroke="#3b3227" stroke-width="1.2" opacity=".15" filter="url(#b06)"/>
  <!-- belt loops -->
  ${[74, mx(74)].map(loop).join('')}
</svg>`;
}

await mkdir(OUT, { recursive: true });
await mkdir(TMP, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new' });
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
    for (const id of Object.keys(FRONTS)) {
        await page.setContent(`<html><body style="margin:0">${svg(id)}</body></html>`);
        const png = path.join(TMP, `${id}.png`);
        await (await page.$('svg')).screenshot({ path: png });
        const webp = path.join(OUT, `${id}.webp`);
        const r = spawnSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${webp}', 'WEBP', quality=88)`]);
        if (r.status) throw new Error(r.stderr.toString());
        console.log(`  ${id} → images/pleats/${id}.webp`);
    }
} finally {
    await browser.close();
}
