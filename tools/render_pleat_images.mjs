#!/usr/bin/env node
/* render_pleat_images.mjs — the trouser-front images for js/pleat-studio.js.

     node tools/render_pleat_images.mjs

   Flat Front, Single Pleat and Double Pleat drawn as grey wool flannel from
   the waistband to just below the knee — heather weave, legs shaded round,
   pressed creases, slant pockets, fly, belt loops — on warm ivory, rendered by
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
    single: { f: 2.6, pleats: [{ x: 90, len: 46, w: 4.6 }] },
    double: { f: 4.6, pleats: [{ x: 90, len: 48, w: 4.8 }, { x: 78.5, len: 32, w: 3.8 }] },
};
const mx = (x) => 240 - x;

function svg(id) {
    const { f, pleats } = FRONTS[id];
    const outer = `M63,34 C${58 - f},52 ${55 - f},74 ${56 - f},96 L${60 - f * 0.6},214`;
    const shape = `M63,34 Q120,31 177,34 C${182 + f},52 ${185 + f},74 ${184 + f},96 L${180 + f * 0.6},214 L125,214 `
                + `C124,180 122,140 120.6,104 Q120,102.6 119.4,104 C118,140 116,180 115,214 L${60 - f * 0.6},214 `
                + `L${56 - f},96 C${55 - f},74 ${58 - f},52 63,34 Z`;
    const crease = (x) => `M${x},${pleats.length ? 36 : 64} Q${x + 0.4},120 ${x - 1.6},214`;
    const pocket = `M73,34.4 Q66,52 ${58.6 - f * 0.8},73`;
    /* One pleat, drawn on the wearer's right leg (mirrored for the left): the top
       layer rolls over and catches the light at its edge, a soft shadow tucks
       under the fold, the waistband puckers a little where it is caught, and
       the whole fold fades out down the leg into the pressed crease. */
    const pleatSVG = (p, k) => {
        const x = p.x, end = 34 + p.len, mid = 34 + p.len * 0.55, w = p.w;
        const g = `pl${k}`;
        return `
      <defs>
        <linearGradient id="${g}-fade" x1="0" x2="0" y1="34" y2="${end + 8}" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#000"/></linearGradient>
        <mask id="${g}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="240" height="240">
          <rect x="0" y="30" width="240" height="${p.len + 14}" fill="url(#${g}-fade)"/></mask>
        <linearGradient id="${g}-lip" x1="${x - 4}" x2="${x}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".65" stop-color="#fff" stop-opacity=".1"/>
          <stop offset=".92" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>
        <linearGradient id="${g}-tuck" x1="${x}" x2="${x + w}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".25" stop-color="#000" stop-opacity=".22"/>
          <stop offset=".65" stop-color="#000" stop-opacity=".07"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
      </defs>
      <g mask="url(#${g}-m)">
        <!-- the fullness the pleat gives: a soft rise beside it and a valley past it -->
        <path d="M${x - 4},36 Q${x - 4.6},${mid + 20} ${x - 3},${end + 40}" fill="none" stroke="#fff" stroke-width="5" opacity=".1" filter="url(#b3)"/>
        <!-- the top layer rolling over to the fold -->
        <path d="M${x - 4},34 L${x},34 Q${x + 0.4},${mid} ${x + 0.3},${end} L${x - 3.4},${end} Q${x - 3.8},${mid} ${x - 4},34 Z" fill="url(#${g}-lip)" filter="url(#b06)"/>
        <!-- the shadow tucked under the fold -->
        <path d="M${x},34 L${x + w},34 Q${x + w * 0.9},${mid} ${x + w * 0.75},${end} L${x + 0.3},${end} Q${x + 0.4},${mid} ${x},34 Z" fill="url(#${g}-tuck)" filter="url(#b06)"/>
        <!-- the fold itself: a crisp dark edge with a bright rim beside it -->
        <path d="M${x},34 Q${x + 0.4},${mid} ${x + 0.3},${end}" fill="none" stroke="#2a2a29" stroke-width=".38" opacity=".6"/>
        <path d="M${x - 0.45},34.4 Q${x - 0.05},${mid} ${x - 0.15},${end - 3}" fill="none" stroke="#fff" stroke-width=".45" opacity=".26" filter="url(#b03)"/>
      </g>
      <!-- where the pleat is caught in the waistband: a small pucker -->
      <ellipse cx="${x + 1.6}" cy="35" rx="${w * 0.55}" ry="1.1" fill="#000" opacity=".28" filter="url(#b06)"/>
      <!-- the drape it releases down the thigh -->
      <path d="M${x + 2},${end - 6} Q${x + 4.5},${end + 34} ${x + 2.5},${end + 80}" fill="none" stroke="#000" stroke-width="3.2" opacity=".07" filter="url(#b3)"/>`;
    };
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="16 6 208 208" width="1000" height="1000">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#f5f1ea"/><stop offset="1" stop-color="#ded8cc"/></radialGradient>
    <linearGradient id="legL" x1="${54 - f}" x2="120" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#5d5d5b"/><stop offset=".14" stop-color="#7c7c79"/><stop offset=".42" stop-color="#9a9a97"/>
      <stop offset=".7" stop-color="#8b8b88"/><stop offset="1" stop-color="#6a6a67"/></linearGradient>
    <linearGradient id="legR" x1="120" x2="${186 + f}" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6e6e6b"/><stop offset=".3" stop-color="#8f8f8c"/><stop offset=".6" stop-color="#959592"/>
      <stop offset=".86" stop-color="#787875"/><stop offset="1" stop-color="#5a5a58"/></linearGradient>
    <linearGradient id="band" x1="0" x2="0" y1="20" y2="35" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#a3a3a0"/><stop offset=".25" stop-color="#959592"/><stop offset="1" stop-color="#7d7d7a"/></linearGradient>
    <linearGradient id="hip" x1="0" x2="0" y1="34" y2="214" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".12"/><stop offset=".1" stop-color="#000" stop-opacity="0"/>
      <stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient>
    <radialGradient id="horn" cx=".38" cy=".32" r=".8">
      <stop offset="0" stop-color="#6a5a4c"/><stop offset=".5" stop-color="#3a2f27"/><stop offset="1" stop-color="#1c1612"/></radialGradient>
    <filter id="heather" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.9 1.4" numOctaves="3" seed="11"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
    </filter>
    <filter id="fleck" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="3.4" numOctaves="1" seed="5"/>
      <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -6.2"/>
    </filter>
    <filter id="b03" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".3"/></filter>
    <filter id="b05" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".5"/></filter>
    <filter id="b06" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".6"/></filter>
    <filter id="b12" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="b3"  x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
    <clipPath id="clip"><path d="${shape}"/></clipPath>
  </defs>

  <rect x="0" y="0" width="240" height="240" fill="url(#bg)"/>
  <path d="${shape}" fill="#000" opacity=".22" filter="url(#b3)" transform="translate(1.5 2.5)"/>

  <!-- the legs, each shaded round -->
  <path d="${shape}" fill="#8a8a87"/>
  <g clip-path="url(#clip)">
    <rect x="16" y="30" width="104" height="190" fill="url(#legL)"/>
    <rect x="120" y="30" width="104" height="190" fill="url(#legR)"/>
    <rect x="16" y="6" width="208" height="214" filter="url(#heather)" opacity=".2" style="mix-blend-mode:multiply"/>
    <rect x="16" y="6" width="208" height="214" filter="url(#fleck)" opacity=".26"/>
    <rect x="16" y="6" width="208" height="214" fill="url(#hip)"/>

    <!-- pressed creases: a lit edge with its shadow beside it -->
    <path d="${crease(90)}" fill="none" stroke="#000" stroke-width="2.2" opacity=".16" filter="url(#b12)" transform="translate(1.3 0)"/>
    <path d="${crease(90)}" fill="none" stroke="#fff" stroke-width="1.1" opacity=".2" filter="url(#b06)"/>
    <path d="${crease(mx(90))}" fill="none" stroke="#000" stroke-width="2.2" opacity=".16" filter="url(#b12)" transform="translate(-1.3 0)"/>
    <path d="${crease(mx(90))}" fill="none" stroke="#fff" stroke-width="1.1" opacity=".17" filter="url(#b06)"/>

    <!-- pleats, folded towards the fly -->
    ${pleats.map((p, k) => pleatSVG(p, `a${k}`)).join('')}
    <g transform="translate(240 0) scale(-1 1)">${pleats.map((p, k) => pleatSVG(p, `b${k}`)).join('')}</g>

    <!-- slant pockets -->
    <path d="${pocket}" fill="none" stroke="#000" stroke-width="1.8" opacity=".35" filter="url(#b06)" transform="translate(.8 .4)"/>
    <path d="${pocket}" fill="none" stroke="#3a3a39" stroke-width=".5"/>
    <path d="${pocket}" fill="none" stroke="#bdbdba" stroke-width=".3" stroke-dasharray=".9 .6" transform="translate(1.6 .2)"/>
    <g transform="translate(240 0) scale(-1 1)">
      <path d="${pocket}" fill="none" stroke="#000" stroke-width="1.8" opacity=".35" filter="url(#b06)" transform="translate(.8 .4)"/>
      <path d="${pocket}" fill="none" stroke="#3a3a39" stroke-width=".5"/>
      <path d="${pocket}" fill="none" stroke="#bdbdba" stroke-width=".3" stroke-dasharray=".9 .6" transform="translate(1.6 .2)"/>
    </g>

    <!-- fly and centre seam -->
    <path d="M120,34 L120,103" fill="none" stroke="#3a3a39" stroke-width=".5"/>
    <path d="M120.6,34 L120.6,102" fill="none" stroke="#000" stroke-width="1.4" opacity=".25" filter="url(#b06)"/>
    <path d="M126.4,35 L126.4,86 Q126.4,95 120.4,98.6" fill="none" stroke="#c4c4c1" stroke-width=".32" stroke-dasharray=".9 .6"/>
    <!-- the gap between the legs, in shadow -->
    <path d="M119.4,104 C118,140 116,180 115,214 M120.6,104 C122,140 124,180 125,214" fill="none" stroke="#000" stroke-width="2.4" opacity=".25" filter="url(#b12)"/>
  </g>
  <path d="${outer}" fill="none" stroke="#4a4a48" stroke-width=".45"/>
  <path d="${outer}" fill="none" stroke="#4a4a48" stroke-width=".45" transform="translate(240 0) scale(-1 1)"/>

  <!-- waistband -->
  <path d="M63,34 Q120,31 177,34" fill="none" stroke="#000" stroke-width="2.4" opacity=".35" filter="url(#b06)" transform="translate(0 1)"/>
  <path d="M64,21.6 Q120,18.6 176,21.6 L177,34 Q120,31 63,34 Z" fill="url(#band)"/>
  <path d="M64,21.6 Q120,18.6 176,21.6 L177,34 Q120,31 63,34 Z" fill="#000" filter="url(#heather)" opacity=".14" style="mix-blend-mode:multiply"/>
  <path d="M64,21.6 Q120,18.6 176,21.6" fill="none" stroke="#c2c2bf" stroke-width=".6"/>
  <path d="M64,21.6 Q120,18.6 176,21.6 L177,34 Q120,31 63,34 Z" fill="none" stroke="#4a4a48" stroke-width=".45"/>
  <path d="M64.4,23.6 Q120,20.6 175.6,23.6 M63.6,32 Q120,29 176.4,32" fill="none" stroke="#bdbdba" stroke-width=".3" stroke-dasharray=".9 .6"/>
  <!-- the waistband's overlap at the fly, and its button -->
  <path d="M120,20.2 L120,31.1" stroke="#3a3a39" stroke-width=".5"/>
  <path d="M120.7,20.4 L120.7,31" stroke="#000" stroke-width="1.2" opacity=".2" filter="url(#b06)"/>
  <g transform="translate(113 26.3)">
    <circle cx=".5" cy=".9" r="2.7" fill="#000" opacity=".4" filter="url(#b06)"/>
    <circle r="2.55" fill="url(#horn)" stroke="#120e0b" stroke-width=".25"/>
    <circle r="1.7" fill="none" stroke="#7a6a5a" stroke-width=".2" opacity=".6"/>
    <circle cx="-.45" cy="0" r=".3" fill="#120e0b"/><circle cx=".45" cy="0" r=".3" fill="#120e0b"/>
    <ellipse cx="-.9" cy="-1.1" rx=".7" ry=".35" fill="#fff" opacity=".35" transform="rotate(-35 -.9 -1.1)"/>
  </g>
  <!-- belt loops -->
  ${[74, 99, mx(99), mx(74)].map(x => `
  <rect x="${x - 1.6}" y="20" width="3.2" height="15.6" rx=".6" fill="#000" opacity=".35" filter="url(#b06)" transform="translate(.6 .8)"/>
  <rect x="${x - 1.6}" y="20" width="3.2" height="15.6" rx=".6" fill="#8e8e8b" stroke="#4a4a48" stroke-width=".3"/>
  <rect x="${x - 1.6}" y="20" width="1.2" height="15.6" fill="#fff" opacity=".12"/>
  <path d="M${x - 1.2},21.4 H${x + 1.2} M${x - 1.2},34.2 H${x + 1.2}" stroke="#c4c4c1" stroke-width=".3" stroke-dasharray=".5 .4"/>`).join('')}
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
