#!/usr/bin/env node
/* render_cuff_images.mjs — the image panel's cuff renders.

     node tools/render_cuff_images.mjs

   Each cuff in js/cuff-shapes.js is drawn as white poplin shirting — weave,
   drape, the stiffened cuff's own light, stitching, mother-of-pearl buttons, a
   gold cufflink — rendered by headless Chrome and saved as
   images/cuffs/<id>.webp (1000 × 1000) for js/cuff-studio.js. */
import puppeteer from 'puppeteer';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { CUFFS, SHAPES, SLEEVE, PLACKET, PLACKET_STITCH, PLEATS, FOLDS, cuffPaths } from '../js/cuff-shapes.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'images/cuffs');
const TMP = path.join(os.tmpdir(), 'kd-cuffs');

function pearl(id, x, y, r) {
    const h = r * 0.27;
    return `
  <g transform="translate(${x} ${y})">
    <ellipse cx=".55" cy="1" rx="${r * 1.02}" ry="${r * 0.95}" fill="#000" opacity=".32" filter="url(#blurS)"/>
    <circle r="${r}" fill="url(#pearl)" stroke="#a7a399" stroke-width=".28"/>
    <circle r="${r}" fill="url(#irid)" opacity=".55"/>
    <circle r="${r * 0.7}" fill="none" stroke="#c4c0b6" stroke-width=".22"/>
    <circle r="${r * 0.7}" fill="none" stroke="#fff" stroke-width=".15" transform="translate(-.15 -.15)" opacity=".7"/>
    <path d="M${-h},${-h} L${h},${h} M${h},${-h} L${-h},${h}" stroke="#efece4" stroke-width="${r * 0.13}" stroke-linecap="round"/>
    ${[[-h, -h], [h, -h], [-h, h], [h, h]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="${r * 0.11}" fill="#7d796f"/>`).join('')}
    <ellipse cx="${-r * 0.38}" cy="${-r * 0.42}" rx="${r * 0.32}" ry="${r * 0.18}" fill="#fff" opacity=".8" transform="rotate(-35 ${-r * 0.38} ${-r * 0.42})"/>
  </g>`;
}

function barrelCuff(s, d) {
    return `
  <!-- cuff -->
  <path d="${d.cuff}" fill="#000" opacity=".28" filter="url(#blurM)" transform="translate(0 1.4)"/>
  <path d="${d.cuff}" fill="url(#cuffL)"/>
  <g clip-path="url(#clipCuff)">
    <rect x="40" y="140" width="160" height="80" filter="url(#weave)" opacity=".05" style="mix-blend-mode:multiply"/>
    <rect x="40" y="140" width="160" height="80" fill="url(#rib)"/>
    <rect x="40" y="140" width="160" height="80" fill="url(#cuffV)"/>
    <path d="M62,150.6 L178,150.6" stroke="#000" stroke-width="1.6" opacity=".14" filter="url(#blurS)"/>
    <path d="${d.edge}" stroke="#000" stroke-width="1.8" opacity=".2" filter="url(#blurS)" transform="translate(.9 0)"/>
    ${s.fr ? `<path d="${d.fold}" stroke="#000" stroke-width="2" opacity=".22" filter="url(#blurS)" transform="translate(0 1)"/>
    <path d="${d.fold}" stroke="#a9a9a3" stroke-width=".4"/>
    <path d="M62,153.4 L178,153.4" stroke="#fff" stroke-width=".6" opacity=".9"/>` : ''}
  </g>
  <path d="${d.cuff}" fill="none" stroke="#a9a9a3" stroke-width=".45"/>
  <path d="${d.stitch}" fill="none" stroke="#fff" stroke-width=".35" stroke-dasharray=".9 .55" transform="translate(.25 .25)" opacity=".9"/>
  <path d="${d.stitch}" fill="none" stroke="#bdbdb6" stroke-width=".3" stroke-dasharray=".9 .55"/>
  <path d="${d.edge}" fill="none" stroke="#a3a39d" stroke-width=".45"/>
  ${s.fr ? `<path d="M166,150 L169.5,150 L169.5,${s.H} L166,${s.H} Z" fill="#000" opacity=".06"/>
  <path d="${d.edge2}" fill="none" stroke="#a3a39d" stroke-width=".45"/>` : ''}

  ${s.bo ? pearl('b1', 156, s.b1y, 3.5) : ''}
  ${s.b2o ? pearl('b2', 156, s.b2y, 3.5) : ''}
  ${s.cl ? `
  <g transform="translate(155 ${(150 + s.H) / 2 + 2})">
    <ellipse cx=".8" cy="1.4" rx="5.6" ry="4.6" fill="#000" opacity=".35" filter="url(#blurS)"/>
    <ellipse rx="5.4" ry="4.4" fill="url(#gold)" stroke="#6f5016" stroke-width=".3"/>
    <ellipse rx="4.1" ry="3.2" fill="none" stroke="#7a5718" stroke-width=".3" opacity=".55"/>
    <ellipse rx="4.1" ry="3.2" fill="none" stroke="#fff3c9" stroke-width=".2" opacity=".6" transform="translate(-.2 -.25)"/>
    <ellipse cx="-1.9" cy="-1.7" rx="1.6" ry=".8" fill="#fff" opacity=".85" transform="rotate(-30 -1.9 -1.7)"/>
  </g>
  <rect x="165.4" y="${(150 + s.H) / 2 - 0.4}" width="2.2" height="3.6" rx=".6" fill="#8f6a26" opacity=".85"/>` : ''}
`;
}

/* The French cuff, as it is worn (after KD's reference photo). A tube seen a
   little from below, so the near rim of the bottom fold arches up and the
   elliptical opening of the cuff shows beneath it. The double-length band is
   folded back on itself — a free edge at the top over the inner layer, a soft
   rolled fold at the bottom — in a fine piqué. Its two ends meet in a straight
   kissing edge, the far end a sliver just behind; the cufflink (silver rim,
   black onyx) sits beside that edge, its toggle just showing past it. */
function frenchCuff() {
    const face  = 'M62,150 Q123,144 184,150 L184,203.2 Q184,205.8 181.4,205.7 Q123,199.2 62,205.6 Z';
    const open  = 'M62,205.6 Q123,199.2 182,205.7 Q123,220.5 62,205.6 Z';
    const far   = 'M181.5,148.6 L185.6,148.8 Q187.6,148.9 187.6,151 L187.6,204.6 Q187.6,206.8 185.4,206.8 L181.5,206.6 Z';
    const inner = 'M62,147 Q123,141 184,147 L184,150 Q123,144 62,150 Z';
    return `
  <defs>
    <linearGradient id="frFace" x1="62" x2="184" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#c3c3be"/><stop offset=".12" stop-color="#e5e5e2"/><stop offset=".4" stop-color="#ffffff"/>
      <stop offset=".75" stop-color="#f1f1ee"/><stop offset=".93" stop-color="#dcdcd7"/><stop offset="1" stop-color="#d0d0cb"/></linearGradient>
    <linearGradient id="frRoll" x1="0" x2="0" y1="144" y2="206" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".07" stop-color="#000" stop-opacity=".05"/>
      <stop offset=".16" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/>
      <stop offset=".9" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
    <linearGradient id="frOpen" x1="0" x2="0" y1="200" y2="219" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6d6d69"/><stop offset=".45" stop-color="#a3a39e"/><stop offset=".8" stop-color="#cfcfca"/><stop offset="1" stop-color="#e2e2de"/></linearGradient>
    <pattern id="pique" width="1.1" height="1.1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="1.1" height="1.1" fill="none"/><path d="M0,.55 H1.1 M.55,0 V1.1" stroke="#000" stroke-width=".14" opacity=".045"/></pattern>
    <radialGradient id="silver" cx=".38" cy=".32" r=".8">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#e3e3e3"/><stop offset=".65" stop-color="#9c9c9c"/><stop offset="1" stop-color="#5a5a5a"/></radialGradient>
    <radialGradient id="onyx" cx=".4" cy=".35" r=".75">
      <stop offset="0" stop-color="#3a3a3c"/><stop offset=".55" stop-color="#121214"/><stop offset="1" stop-color="#050506"/></radialGradient>
    <linearGradient id="bar" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#f4f4f4"/><stop offset=".5" stop-color="#a9a9a9"/><stop offset="1" stop-color="#6a6a6a"/></linearGradient>
    <clipPath id="clipFace"><path d="${face}"/></clipPath>
  </defs>
  <ellipse cx="123" cy="219" rx="70" ry="5" fill="#000" opacity=".16" filter="url(#blurL)"/>

  <!-- the inner half of the cuff, sewn to the sleeve, just showing above the free edge -->
  <path d="${inner}" fill="#d9d9d5"/>
  <path d="M62,147 Q123,141 184,147" fill="none" stroke="#a9a9a3" stroke-width=".4"/>

  <!-- the elliptical opening of the cuff, seen from a little below -->
  <path d="${open}" fill="url(#frOpen)"/>
  <path d="M62,205.6 Q123,220.5 182,205.7" fill="none" stroke="#a3a39d" stroke-width=".45"/>
  <path d="M66,207.6 Q123,218.6 178,207.6" fill="none" stroke="#fff" stroke-width=".9" opacity=".55" filter="url(#blurS)"/>

  <!-- the far end, a sliver behind the kissing edge -->
  <path d="${far}" fill="#000" opacity=".22" filter="url(#blurS)" transform="translate(.8 .8)"/>
  <path d="${far}" fill="#cdcdc8"/>
  <path d="${far}" fill="none" stroke="#a3a39d" stroke-width=".4"/>

  <!-- the folded-back face -->
  <path d="${face}" fill="#000" opacity=".24" filter="url(#blurM)" transform="translate(.6 1.2)"/>
  <path d="${face}" fill="url(#frFace)"/>
  <g clip-path="url(#clipFace)">
    <rect x="40" y="140" width="160" height="80" fill="url(#pique)"/>
    <rect x="40" y="140" width="160" height="80" filter="url(#weave)" opacity=".04" style="mix-blend-mode:multiply"/>
    <rect x="40" y="140" width="160" height="80" fill="url(#frRoll)"/>
    <path d="M62,202.6 Q123,196.2 184,202.6" fill="none" stroke="#fff" stroke-width="1.8" opacity=".7" filter="url(#blurS)"/>
  </g>
  <!-- the free top edge: a thin lip with its own light, and the stitching along it and the end -->
  <path d="M62,150 Q123,144 184,150" fill="none" stroke="#000" stroke-width="1.2" opacity=".2" filter="url(#blurS)" transform="translate(0 -.5)"/>
  <path d="M62,150 Q123,144 184,150" fill="none" stroke="#fff" stroke-width=".8"/>
  <path d="M64,152.7 Q123,147 181.4,152.6 L181.4,202.2" fill="none" stroke="#fff" stroke-width=".35" stroke-dasharray=".9 .55" transform="translate(.25 .25)" opacity=".9"/>
  <path d="M64,152.7 Q123,147 181.4,152.6 L181.4,202.2" fill="none" stroke="#bdbdb6" stroke-width=".3" stroke-dasharray=".9 .55"/>
  <path d="${face}" fill="none" stroke="#a9a9a3" stroke-width=".45"/>
  <path d="M183.2,151.4 L183.2,203.6" stroke="#fff" stroke-width=".5" opacity=".8"/>

  <!-- the cufflink beside the kissing edge, its toggle just showing past it -->
  <path d="M184,177 L188.6,177" stroke="#4b4b4b" stroke-width="1.3" stroke-linecap="round"/>
  <rect x="187.8" y="172.6" width="2.6" height="9" rx="1.2" fill="url(#bar)" stroke="#555" stroke-width=".2"/>
  <g transform="translate(172.5 177)">
    <ellipse cx=".9" cy="1.5" rx="5.2" ry="5.2" fill="#000" opacity=".42" filter="url(#blurS)"/>
    <circle r="4.9" fill="url(#silver)" stroke="#4f4f4f" stroke-width=".25"/>
    <circle r="4.1" fill="none" stroke="#fff" stroke-width=".25" opacity=".7"/>
    <circle r="3.45" fill="url(#onyx)" stroke="#2a2a2a" stroke-width=".2"/>
    <ellipse cx="-1.3" cy="-1.5" rx="1.25" ry=".6" fill="#fff" opacity=".55" transform="rotate(-35 -1.3 -1.5)"/>
    <ellipse cx="-2.9" cy="-2.6" rx=".9" ry=".4" fill="#fff" opacity=".9" transform="rotate(-40 -2.9 -2.6)"/>
  </g>
`;
}

function realSVG(id) {
    const s = SHAPES[id];
    const d = cuffPaths(s);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 66 160 160" width="1000" height="1000">
  <defs>
    <radialGradient id="bg" cx=".5" cy=".42" r=".78"><stop offset="0" stop-color="#f7f7f5"/><stop offset="1" stop-color="#dcdcd8"/></radialGradient>
    <linearGradient id="sleeve" x1="50" x2="190" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#c3c3be"/><stop offset=".1" stop-color="#e2e2de"/><stop offset=".3" stop-color="#fafaf8"/>
      <stop offset=".42" stop-color="#ffffff"/><stop offset=".68" stop-color="#f0f0ec"/><stop offset=".88" stop-color="#d9d9d4"/>
      <stop offset="1" stop-color="#bebeb8"/></linearGradient>
    <linearGradient id="cuffL" x1="62" x2="178" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#cbcbc6"/><stop offset=".1" stop-color="#eaeae7"/><stop offset=".34" stop-color="#ffffff"/>
      <stop offset=".6" stop-color="#f9f9f7"/><stop offset=".88" stop-color="#e0e0db"/><stop offset="1" stop-color="#c7c7c1"/></linearGradient>
    <linearGradient id="cuffV" x1="0" x2="0" y1="150" y2="${s.H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".10"/><stop offset=".12" stop-color="#000" stop-opacity="0"/>
      <stop offset="${s.fr ? '.86' : '.9'}" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${s.fr ? '.16' : '.08'}"/></linearGradient>
    <radialGradient id="pearl" cx=".36" cy=".32" r=".75">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f3f1eb"/><stop offset=".8" stop-color="#dcd8cf"/><stop offset="1" stop-color="#bdb8ad"/></radialGradient>
    <linearGradient id="irid" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f6dfe6" stop-opacity="0"/><stop offset=".35" stop-color="#f3dde6" stop-opacity=".7"/>
      <stop offset=".6" stop-color="#dde8f4" stop-opacity=".7"/><stop offset="1" stop-color="#e7f0e2" stop-opacity="0"/></linearGradient>
    <radialGradient id="gold" cx=".36" cy=".3" r=".8">
      <stop offset="0" stop-color="#fff7d9"/><stop offset=".22" stop-color="#f1d690"/><stop offset=".58" stop-color="#c99b41"/><stop offset="1" stop-color="#7d5a1c"/></radialGradient>
    <filter id="weave" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="2.6 1.3" numOctaves="2" seed="7"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>
    </filter>
    <pattern id="rib" width="1.1" height="1.1" patternUnits="userSpaceOnUse"><rect width="1.1" height=".45" fill="#000" opacity=".022"/></pattern>
    <filter id="blurL" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="blurM" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
    <filter id="blurS" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".55"/></filter>
    <clipPath id="clipSleeve"><path d="${SLEEVE}"/></clipPath>
    <clipPath id="clipCuff"><path d="${d.cuff}"/></clipPath>
  </defs>

  <rect x="0" y="0" width="240" height="240" fill="url(#bg)"/>
  ${id === 'french' ? '' : `<ellipse cx="120" cy="${s.H + 9}" rx="66" ry="5" fill="#000" opacity=".16" filter="url(#blurL)"/>`}

  <!-- sleeve -->
  <path d="${SLEEVE}" fill="url(#sleeve)"/>
  <g clip-path="url(#clipSleeve)">
    <rect x="40" y="0" width="160" height="240" filter="url(#weave)" opacity=".07" style="mix-blend-mode:multiply"/>
    <rect x="40" y="0" width="160" height="240" fill="url(#rib)"/>
    <path d="${FOLDS}" fill="none" stroke="#000" stroke-width="7" opacity=".06" filter="url(#blurL)"/>
    <path d="${FOLDS}" fill="none" stroke="#fff" stroke-width="4" opacity=".7" filter="url(#blurL)" transform="translate(4 0)"/>
    <path d="${PLEATS}" fill="none" stroke="#000" stroke-width="2.2" opacity=".1" filter="url(#blurM)"/>
    <path d="${PLEATS}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6" filter="url(#blurM)" transform="translate(1.4 0)"/>
    <path d="${PLEATS}" fill="none" stroke="#b9b9b3" stroke-width=".35"/>
    <path d="M140,150 Q130,120 118,96 M164,150 Q170,124 178,104" fill="none" stroke="#000" stroke-width="5" opacity=".05" filter="url(#blurL)"/>
    <!-- tower placket -->
    <path d="${PLACKET} Z" fill="#000" opacity=".18" filter="url(#blurS)" transform="translate(.7 .5)"/>
    <path d="${PLACKET} Z" fill="url(#cuffL)"/>
    <path d="${PLACKET}" fill="none" stroke="#b0b0aa" stroke-width=".35"/>
    <path d="${PLACKET_STITCH}" fill="none" stroke="#c3c3bd" stroke-width=".3" stroke-dasharray=".9 .55"/>
    ${pearl('p', 166, 119, 2.5)}
  </g>
  <path d="${SLEEVE}" fill="none" stroke="#b3b3ad" stroke-width=".45"/>

  ${id === 'french' ? frenchCuff() : barrelCuff(s, d)}
</svg>`;
}

await mkdir(OUT, { recursive: true });
await mkdir(TMP, { recursive: true });
const browser = await puppeteer.launch({ headless: 'new' });
try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1000, height: 1000, deviceScaleFactor: 1 });
    for (const c of CUFFS) {
        await page.setContent(`<html><body style="margin:0">${realSVG(c.id)}</body></html>`);
        const png = path.join(TMP, `${c.id}.png`);
        await (await page.$('svg')).screenshot({ path: png });
        const webp = path.join(OUT, `${c.id}.webp`);
        const r = spawnSync('python3', ['-c', `from PIL import Image; Image.open('${png}').convert('RGB').save('${webp}', 'WEBP', quality=88)`]);
        if (r.status) throw new Error(r.stderr.toString());
        console.log(`  ${c.id} → images/cuffs/${c.id}.webp`);
    }
} finally {
    await browser.close();
}
