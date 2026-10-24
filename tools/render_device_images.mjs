#!/usr/bin/env node
/* render_device_images.mjs — the image panel's device renders for the L1 cover.

     node tools/render_device_images.mjs

   Each device in js/device-fits.js is drawn at true scale (0.72 board units to
   the millimetre) slipping out of its tan leather envelope: saddle stitching,
   painted edges, the flap-holder strap across the front (as on the 3D
   model), the House's KD monogram (images/KD_monogram.png) blind-debossed, the open flap's lining, a
   tailor's tape along the bottom with the cut marked, and a paper cutting
   ticket tied on with thread. Rendered by headless Chrome and saved as
   images/devices/<id>.webp (1000 × 1000) for js/device-studio.js. */
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { DEVICES } from '../js/device-fits.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'images/devices');
const TMP = path.join(os.tmpdir(), 'kd-devices');

// the KD monogram as an alpha mask (ink → opaque), cropped to the mark
const MONO = (() => {
    const r = spawnSync('python3', ['-c', `
import base64, io
from PIL import Image, ImageOps
im = Image.open('${path.join(ROOT, 'images/KD_monogram.png')}').convert('RGBA')
bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
a = ImageOps.invert(bg.convert('L'))
a = a.crop(a.getbbox()).resize((480, round(480 * a.height / a.width)), Image.LANCZOS)
out = Image.new('RGBA', a.size, (0, 0, 0, 0)); out.putalpha(a)
b = io.BytesIO(); out.save(b, 'PNG'); print(a.width, a.height, base64.b64encode(b.getvalue()).decode())`]);
    if (r.status) throw new Error(r.stderr.toString());
    const [w, h, b64] = r.stdout.toString().trim().split(' ');
    return { ratio: h / w, href: `data:image/png;base64,${b64}` };
})();

const S = 0.72;                       // board units per millimetre
const f = (n) => n.toFixed(2);
const TAPE_Y = 334;

function device(dv, x, y, w, h) {
    const r = (dv.id === 'ipad' ? 16 : 9) * S;
    if (dv.id === 'ipad') {
        const b = 5.2 * S;
        return `
    <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="#9c9ca1"/>
    <rect x="${f(x + .6)}" y="${f(y + .6)}" width="${f(w - 1.2)}" height="${f(h - 1.2)}" rx="${f(r - .6)}" fill="#0c0c0e"/>
    <rect x="${f(x + b)}" y="${f(y + b)}" width="${f(w - 2 * b)}" height="${f(h - 2 * b)}" rx="${f(r - b + 1)}" fill="url(#glass)"/>
    <path d="M${f(x + w * .18)},${f(y + b)} L${f(x + w * .42)},${f(y + b)} L${f(x + w * .12)},${f(y + h)} L${f(x + b)},${f(y + h)} L${f(x + b)},${f(y + h * .6)} Z" fill="#fff" opacity=".05"/>
    <circle cx="${f(x + w / 2)}" cy="${f(y + b / 2)}" r=".95" fill="#1f2a3a" stroke="#333" stroke-width=".25"/>`;
    }
    const pro = dv.id === 'pro';
    const notchW = 22 * S, cx = x + w / 2;
    return `
    <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="url(#${pro ? 'black' : 'silver'})"/>
    <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="url(#brush)" opacity="${pro ? .35 : .55}"/>
    <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="url(#sheen)" opacity="${pro ? .45 : 1}"/>
    <rect x="${f(x + .4)}" y="${f(y + .4)}" width="${f(w - .8)}" height="${f(h - .8)}" rx="${f(r - .4)}" fill="none" stroke="${pro ? '#5a5b60' : '#ffffff'}" stroke-width=".5" opacity=".7"/>
    <rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="none" stroke="${pro ? '#141416' : '#8f9196'}" stroke-width=".5"/>
    <!-- the thumb notch at the front lip -->
    <path d="M${f(cx - notchW / 2)},${f(y + .3)} Q${f(cx)},${f(y + 4.2)} ${f(cx + notchW / 2)},${f(y + .3)}" fill="${pro ? '#141416' : '#a4a6ab'}" opacity=".85"/>
    <path d="M${f(cx - notchW / 2 + 2)},${f(y + 1.2)} Q${f(cx)},${f(y + 4.6)} ${f(cx + notchW / 2 - 2)},${f(y + 1.2)}" fill="none" stroke="${pro ? '#6a6b70' : '#fff'}" stroke-width=".4" opacity=".6"/>`;
}

function stitchPath(pts) { return 'M' + pts.map(([a, b]) => `${f(a)},${f(b)}`).join(' L'); }

function realSVG(dv) {
    const W = (dv.w + 18) * S;              // the envelope's body
    const Hb = (dv.h + 14) * S;
    const F = Hb * 0.42;                    // the open flap, lying flat above
    const Dw = dv.w * S, Dh = dv.h * S;
    const out = Dh * 0.38;                  // how far the device has slipped out
    const x0 = 200 - W / 2, x1 = 200 + W / 2;
    const y0 = 200 - (Hb - F) / 2 - 20, y1 = y0 + Hb;
    const dx = 200 - Dw / 2, dy = y0 - out;
    const flap = `M${f(x0 + 1)},${f(y0)} L${f(x0 + 7)},${f(y0 - F + 6)} Q${f(x0 + 8)},${f(y0 - F)} ${f(x0 + 15)},${f(y0 - F)} L${f(x1 - 15)},${f(y0 - F)} Q${f(x1 - 8)},${f(y0 - F)} ${f(x1 - 7)},${f(y0 - F + 6)} L${f(x1 - 1)},${f(y0)} Z`;
    const body = `M${f(x0)},${f(y0)} L${f(x1)},${f(y0)} L${f(x1)},${f(y1 - 4)} Q${f(x1)},${f(y1)} ${f(x1 - 4)},${f(y1)} L${f(x0 + 4)},${f(y1)} Q${f(x0)},${f(y1)} ${f(x0)},${f(y1 - 4)} Z`;
    const st = 4.2;
    const bodyStitch = stitchPath([[x0 + st, y0 + 2], [x0 + st, y1 - st], [x1 - st, y1 - st], [x1 - st, y0 + 2]]);
    const flapStitch = stitchPath([[x0 + 1 + st + 1, y0 - 2], [x0 + 7 + st * .6, y0 - F + st + 3], [x1 - 7 - st * .6, y0 - F + st + 3], [x1 - 1 - st - 1, y0 - 2]]);
    // the flap-holder strap: a band across the front, its ends sewn into the side seams
    const sh = 24 * S, sy = y0 + Hb * 0.15, sy1 = sy + sh;
    const mw = 30, mh = mw * MONO.ratio;                 // the monogram, centred below the strap
    const mx = 200, my = (sy1 + y1) / 2 - 7;
    // tailor's tape: 0 at the body's left edge
    const tapeX0 = x0, tapeX1 = 384, cm = 10 * S;
    let ticks = '';
    for (let i = 0; tapeX0 + i * cm / 2 <= tapeX1 - 1; i++) {
        const x = tapeX0 + i * cm / 2, whole = i % 2 === 0, n = i / 2;
        ticks += `<path d="M${f(x)},${TAPE_Y} v${whole ? 4.2 : 2.4}" stroke="#2d2a24" stroke-width="${whole ? .45 : .3}"/>`;
        if (whole && n > 0) ticks += `<text x="${f(x)}" y="${TAPE_Y + 9.6}" font-size="4.3" text-anchor="middle" fill="${n % 5 ? '#2d2a24' : '#9b2a22'}">${n}</text>`;
    }
    const cutCm = (dv.w + 18) / 10;
    // the paper cutting ticket, tied on at the body's right side
    const tx = x1 - 34, ty = y0 + Hb * 0.5;
    const mm = (n) => Math.round(n);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="1000" height="1000" font-family="'Times New Roman', Times, serif">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#f6f2ea"/><stop offset="1" stop-color="#d8d0c2"/></radialGradient>
    <filter id="linen" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9 .08" numOctaves="2" seed="3"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="3" seed="11"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
    </filter>
    <linearGradient id="leather" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#a26a43"/><stop offset=".45" stop-color="#8d5733"/><stop offset="1" stop-color="#6f4024"/></linearGradient>
    <linearGradient id="lining" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cfa983"/><stop offset="1" stop-color="#b78c63"/></linearGradient>
    <linearGradient id="mouth" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".08" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".85" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
    <radialGradient id="leatherSheen" cx=".3" cy=".25" r=".7">
      <stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1c1d22"/><stop offset=".5" stop-color="#0a0a0d"/><stop offset="1" stop-color="#16171b"/></linearGradient>
    <linearGradient id="silver" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e9eaec"/><stop offset=".5" stop-color="#d3d5d8"/><stop offset="1" stop-color="#bfc1c5"/></linearGradient>
    <linearGradient id="black" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3b3f"/><stop offset=".5" stop-color="#2a2b2e"/><stop offset="1" stop-color="#1e1f22"/></linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".18"/>
      <stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".06"/></linearGradient>
    <pattern id="brush" width="400" height=".8" patternUnits="userSpaceOnUse"><rect width="400" height=".35" fill="#fff" opacity=".18"/></pattern>
    <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3dc9a"/><stop offset=".5" stop-color="#c39a45"/><stop offset="1" stop-color="#7f5d20"/></linearGradient>
    <filter id="blurL" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="blurM" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="blurS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".6"/></filter>
    <clipPath id="clipBody"><path d="${body}"/></clipPath>
    <clipPath id="clipStrap"><rect x="${f(x0)}" y="${f(sy)}" width="${f(W)}" height="${f(sh)}"/></clipPath>
    <mask id="mono" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="400">
      <image href="${MONO.href}" x="${f(mx - mw / 2)}" y="${f(my - mh / 2)}" width="${mw}" height="${f(mh)}"/></mask>
    <clipPath id="clipFlap"><path d="${flap}"/></clipPath>
    <clipPath id="clipDev"><rect x="${f(dx)}" y="${f(dy)}" width="${f(Dw)}" height="${f(Dh)}" rx="${f((dv.id === 'ipad' ? 16 : 9) * S)}"/></clipPath>
  </defs>

  <rect width="400" height="400" fill="url(#bg)"/>
  <rect width="400" height="400" filter="url(#linen)" opacity=".05" style="mix-blend-mode:multiply"/>

  <!-- the envelope's shadow on the linen -->
  <path d="${body}" fill="#000" opacity=".3" filter="url(#blurL)" transform="translate(2 5)"/>
  <path d="${flap}" fill="#000" opacity=".18" filter="url(#blurM)" transform="translate(1 2)"/>

  <!-- the open flap: its lining up, stitched, edge painted -->
  <path d="${flap}" fill="url(#lining)"/>
  <g clip-path="url(#clipFlap)">
    <rect width="400" height="400" filter="url(#grain)" opacity=".08" style="mix-blend-mode:multiply"/>
    <path d="M${f(x0)},${f(y0 - 1)} L${f(x1)},${f(y0 - 1)}" stroke="#000" stroke-width="4" opacity=".16" filter="url(#blurM)"/>
  </g>
  <path d="${flap}" fill="none" stroke="#5a3119" stroke-width="1.3"/>
  <path d="${flapStitch}" fill="none" stroke="#8a6440" stroke-width=".8" stroke-dasharray="2.4 1.5" stroke-linecap="round" opacity=".7"/>

  <!-- the device, slipping out of the mouth -->
  <rect x="${f(dx)}" y="${f(dy)}" width="${f(Dw)}" height="${f(Dh)}" rx="9" fill="#000" opacity=".35" filter="url(#blurM)" transform="translate(.8 1.6)"/>
  ${device(dv, dx, dy, Dw, Dh)}
  <g clip-path="url(#clipDev)">
    <rect x="${f(dx)}" y="${f(y0 - 7)}" width="${f(Dw)}" height="8" fill="#000" opacity=".45" filter="url(#blurM)"/>
  </g>

  <!-- the body: tan leather, grain, sheen, monogram, saddle stitch, painted edge -->
  <path d="${body}" fill="url(#leather)"/>
  <g clip-path="url(#clipBody)">
    <rect width="400" height="400" filter="url(#grain)" opacity=".14" style="mix-blend-mode:multiply"/>
    <path d="${body}" fill="url(#leatherSheen)"/>
    <rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(Hb)}" fill="url(#mouth)"/>
    <path d="M${f(x0)},${f(y0 + .7)} L${f(x1)},${f(y0 + .7)}" stroke="#fff" stroke-width=".6" opacity=".35"/>
  </g>
  <!-- the KD monogram, blind-debossed: a shadowed upper edge, a lit lower edge, the pressed floor a shade darker -->
  <g text-anchor="middle">
    <rect width="400" height="400" fill="#fff" opacity=".16" mask="url(#mono)" transform="translate(.45 .6)"/>
    <rect width="400" height="400" fill="#2a1408" opacity=".45" mask="url(#mono)" transform="translate(-.35 -.45)"/>
    <rect width="400" height="400" fill="#764421" mask="url(#mono)"/>
    <text x="${f(mx)}" y="${f(my + mh / 2 + 8)}" font-size="4.6" letter-spacing="2.2" fill="#2a1408" opacity=".42">THE HOUSE OF SCION</text>
  </g>
  <path d="${bodyStitch}" fill="none" stroke="#3b2010" stroke-width="1.1" stroke-dasharray="2.4 1.5" stroke-linecap="round" opacity=".45" transform="translate(.3 .4)"/>
  <path d="${bodyStitch}" fill="none" stroke="#e8d8b6" stroke-width=".85" stroke-dasharray="2.4 1.5" stroke-linecap="round"/>
  <path d="${body}" fill="none" stroke="#4a2612" stroke-width="1.4"/>
  <path d="M${f(x0 + .9)},${f(y0 + 1)} L${f(x0 + .9)},${f(y1 - 3)}" stroke="#fff" stroke-width=".4" opacity=".18"/>

  <!-- the flap-holder strap across the front: raised, edge painted, stitched only at its sewn ends -->
  <rect x="${f(x0)}" y="${f(sy)}" width="${f(W)}" height="${f(sh)}" fill="#000" opacity=".38" filter="url(#blurM)" transform="translate(0 1.8)"/>
  <g clip-path="url(#clipStrap)">   <!-- the same leather as the body, layer for layer -->
    <path d="${body}" fill="url(#leather)"/>
    <rect width="400" height="400" filter="url(#grain)" opacity=".14" style="mix-blend-mode:multiply"/>
    <path d="${body}" fill="url(#leatherSheen)"/>
    <rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(Hb)}" fill="url(#mouth)"/>
  </g>
  <path d="M${f(x0)},${f(sy + .6)} H${f(x1)}" stroke="#fff" stroke-width=".5" opacity=".3"/>
  <path d="M${f(x0 + st)},${f(sy + 3)} V${f(sy1 - 3)} M${f(x1 - st)},${f(sy + 3)} V${f(sy1 - 3)}" fill="none" stroke="#3b2010" stroke-width="1.1" stroke-dasharray="2.4 1.5" stroke-linecap="round" opacity=".45" transform="translate(.3 .4)"/>
  <path d="M${f(x0 + st)},${f(sy + 3)} V${f(sy1 - 3)} M${f(x1 - st)},${f(sy + 3)} V${f(sy1 - 3)}" fill="none" stroke="#e8d8b6" stroke-width=".85" stroke-dasharray="2.4 1.5" stroke-linecap="round"/>
  <path d="M${f(x0)},${f(sy)} H${f(x1)} M${f(x0)},${f(sy1)} H${f(x1)}" stroke="#4a2612" stroke-width="1.1"/>

  <!-- the cutting ticket, tied on with linen thread -->
  <path d="M${f(tx + 6)},${f(ty + 4)} C${f(tx - 6)},${f(ty - 8)} ${f(tx - 14)},${f(ty + 8)} ${f(tx - 8)},${f(ty + 22)} S${f(tx - 2)},${f(ty + 36)} ${f(tx - 12)},${f(ty + 40)}" fill="none" stroke="#000" stroke-width="1" opacity=".25" filter="url(#blurS)" transform="translate(.6 1.4)"/>
  <path d="M${f(tx + 6)},${f(ty + 4)} C${f(tx - 6)},${f(ty - 8)} ${f(tx - 14)},${f(ty + 8)} ${f(tx - 8)},${f(ty + 22)} S${f(tx - 2)},${f(ty + 36)} ${f(tx - 12)},${f(ty + 40)}" fill="none" stroke="#efe6d2" stroke-width=".8"/>
  <g transform="translate(${f(tx)} ${f(ty)}) rotate(7)">
    <path d="M0,6 L6,0 H80 V40 H6 L0,34 Z" fill="#000" opacity=".3" filter="url(#blurM)" transform="translate(1.4 2.6)"/>
    <path d="M0,6 L6,0 H80 V40 H6 L0,34 Z" fill="#f4ecd9" stroke="#c9b993" stroke-width=".4"/>
    <rect x="0" y="0" width="80" height="40" fill="url(#bg)" opacity=".15"/>
    <circle cx="7" cy="20" r="3.4" fill="#e3d4ae" stroke="#b9a678" stroke-width=".4"/>
    <circle cx="7" cy="20" r="1.5" fill="#8a7a58"/>
    <path d="M14,4 V36" stroke="#9b2a22" stroke-width=".35" opacity=".55"/>
    <text x="18" y="10.5" font-size="4.4" letter-spacing="1.8" fill="#6b5a3c">CUT FOR</text>
    <text x="18" y="21.5" font-size="9.2" font-style="italic" fill="#1d1a14">${dv.name}</text>
    <text x="18" y="29" font-size="4.6" font-style="italic" fill="#4b4232">${dv.sizes}</text>
    <text x="18" y="35.6" font-size="4.4" letter-spacing=".6" fill="#6b5a3c">${mm(dv.w)} × ${mm(dv.h)} mm</text>
  </g>

  <!-- the cut, carried down to the tailor's tape -->
  <path d="M${f(x1)},${f(y1 + 3)} V${TAPE_Y - 1}" stroke="#9b2a22" stroke-width=".45" stroke-dasharray="1.6 1.4"/>
  <path d="M${f(x1 - 3)},${TAPE_Y - 3} L${f(x1)},${TAPE_Y} L${f(x1 + 3)},${TAPE_Y - 3}" fill="none" stroke="#9b2a22" stroke-width=".5"/>
  <rect x="${f(tapeX0)}" y="${TAPE_Y}" width="${f(tapeX1 - tapeX0)}" height="13" fill="#000" opacity=".2" filter="url(#blurM)" transform="translate(.6 1.4)"/>
  <rect x="${f(tapeX0)}" y="${TAPE_Y}" width="${f(tapeX1 - tapeX0)}" height="13" fill="#efe3c2"/>
  <rect x="${f(tapeX0)}" y="${TAPE_Y}" width="${f(tapeX1 - tapeX0)}" height="13" filter="url(#linen)" opacity=".06" style="mix-blend-mode:multiply"/>
  <g>${ticks}</g>
  <rect x="${f(tapeX0 - 5)}" y="${TAPE_Y - .4}" width="5.4" height="13.8" rx=".8" fill="url(#brass)" stroke="#6f5016" stroke-width=".3"/>
  <text x="${f(x1)}" y="${TAPE_Y + 23}" font-size="6" font-style="italic" text-anchor="middle" fill="#7a2a22">${cutCm.toFixed(1)} cm</text>
</svg>`;
}

await mkdir(OUT, { recursive: true });
await mkdir(TMP, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new' });
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
    for (const dv of DEVICES) {
        await page.setContent(`<html><body style="margin:0">${realSVG(dv)}</body></html>`);
        const png = path.join(TMP, `${dv.id}.png`);
        await (await page.$('svg')).screenshot({ path: png });
        const webp = path.join(OUT, `${dv.id}.webp`);
        const r = spawnSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${webp}', 'WEBP', quality=88)`]);
        if (r.status) throw new Error(r.stderr.toString());
        console.log(`  ${dv.id} → images/devices/${dv.id}.webp`);
    }
} finally {
    await browser.close();
}
