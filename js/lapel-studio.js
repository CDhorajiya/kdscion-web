/* lapel-studio.js — choose the lapel of a blazer / coat on its product page.

   A "Lapel" button sits on the 3D viewer above Design Only. It opens a
   translucent grey glass window docked on the viewer (a sheet on phones):
   a tailor's flat of the jacket front, six lapels to choose from, and an
   occasion filter (Office / Event / Minimal). The flat is one drawing whose
   lapel is a single shared geometry, so choosing a lapel reshapes the drawing
   from one cut into the next rather than swapping pictures.

   The drawings are 2D on purpose: the GLB is cut with one lapel, so the 3D
   model keeps showing the design as cut, and the window shows the alternative.

   Use on a page:
       <script type="module" src="js/lapel-studio.js?default=shawl"></script>
   default = the lapel the GLB is cut with (notch | peak | shawl | collarless |
   contrast | slim). The choice is kept per SKU in localStorage
   ("kd.lapel.<sku>"), published as window.KD_DESIGN_DETAILS.lapel plus a
   'kd:lapel' event, and written into "kd.designDetails.<sku>"
   (js/design-details.js), which checkout puts into the order's note. */

import { saveDetail } from './design-details.js';

const params = new URL(import.meta.url).searchParams;
const AS_CUT = params.get('default') || 'notch';
const panel  = document.querySelector('.viewer-panel');
const sku    = document.querySelector('.fabric-panel[data-sku]')?.dataset.sku || location.pathname;
const STORE  = `kd.lapel.${sku}`;
const STILL  = matchMedia('(prefers-reduced-motion: reduce)').matches;

const LAPELS = [
    { id: 'notch',      name: 'Notch',      full: 'Notch Lapel',     mood: 'Classic',
      note: 'The tailor’s standard: a small step where collar meets lapel. Correct from the boardroom to supper.' },
    { id: 'peak',       name: 'Peak',       full: 'Peak Lapel',      mood: 'Powerful',
      note: 'Points that rise towards the shoulder, broadening the chest and lifting the eye. Formal and assured.' },
    { id: 'shawl',      name: 'Shawl',      full: 'Shawl Lapel',     mood: 'Soft evening look',
      note: 'One unbroken curve from collar to button. The softest line in tailoring, made for evening.' },
    { id: 'collarless', name: 'Collarless', full: 'Collarless',      mood: 'Clean & modern',
      note: 'No collar and no lapel: a round neck, with fronts that meet edge to edge. Quiet and architectural.' },
    { id: 'contrast',   name: 'Contrast',   full: 'Contrast Lapel',  mood: 'Bold & stylish',
      note: 'Peak lapels faced in black silk satin. The dinner-jacket gesture, made for an entrance.' },
    { id: 'slim',       name: 'Slim',       full: 'Slim Lapel',      mood: 'Sleek & refined',
      note: 'A narrow notch set high, for a long and lean opening. Precise and unshowy.' },
];

const OCCASIONS = [
    { id: 'office',  name: 'Office',  picks: ['notch', 'collarless'],        line: 'Polished & professional' },
    { id: 'event',   name: 'Event',   picks: ['peak', 'shawl', 'contrast'],  line: 'Elevated & impactful' },
    { id: 'minimal', name: 'Minimal', picks: ['slim', 'collarless'],         line: 'Clean & understated' },
];

/* ── Geometry ─────────────────────────────────────────────────────────────────
   The wearer's right half (viewer's left) of a jacket front on a 240-wide
   board, mirrored about x = 120. Every lapel is the same closed outline:

     B  break point (top button)      r1 r2  roll line controls     N  roll at the neck
     T  collar top at the side neck   k1 k2  collar edge controls   C  collar end
     Gn notch (collar meets lapel)    P      lapel point            e1 e2 lapel edge controls
     G2 where the gorge seam meets the roll line under the collar
     bh lapel buttonhole (x1 y1 x2 y2, on the wearer's left lapel)
     band  [top, low] of the collar behind the neck
     seam / btn / satin  0..1 weights

   Collarless collapses the whole lapel onto its round neckline, so changing
   to or from it opens or folds the lapels away. */
const ROLL = { B: [120, 176], r1: [114, 140], r2: [107, 86], N: [104, 44], T: [99, 33] };
const PEAK = { ...ROLL,
    k1: [96, 40], k2: [92, 50], C: [88, 57], Gn: [90, 63], P: [71, 55],
    e1: [83.6, 96.8], e2: [100.9, 136.8], G2: [106, 58], bh: [79, 66, 86, 68.5],
    band: [26, 36], seam: 1, btn: 1, satin: 0 };
const SHAPES = {
    notch: { ...ROLL,
        k1: [96, 40], k2: [91, 52], C: [86, 60], Gn: [90, 67], P: [77, 72],
        e1: [87.6, 108.4], e2: [102.4, 142.6], G2: [106, 60], bh: [83, 78.5, 90, 75.5],
        band: [26, 36], seam: 1, btn: 1, satin: 0 },
    peak: PEAK,
    shawl: { ...ROLL,
        k1: [96, 48], k2: [86, 64], C: [83, 90], Gn: [83, 90], P: [83, 90],
        e1: [81, 114], e2: [100, 150], G2: [80, 90], bh: [88, 92, 95, 89.5],
        band: [26, 36], seam: 0, btn: 1, satin: 0 },
    collarless: {
        B: [120, 64], r1: [110, 63], r2: [101, 52], N: [98, 41], T: [98, 41],
        k1: [98, 41], k2: [98, 41], C: [98, 41], Gn: [98, 41], P: [98, 41],
        e1: [101, 52], e2: [110, 63], G2: [98, 41], bh: [98, 41, 98, 41],
        band: [35, 35], seam: 0, btn: 0, satin: 0 },
    contrast: { ...PEAK, satin: 1 },
    slim: {
        B: [120, 176], r1: [115, 140], r2: [108, 86], N: [105, 44], T: [100, 34],
        k1: [97, 41], k2: [94, 49], C: [91, 56], Gn: [94, 62], P: [85, 66],
        e1: [93.8, 103.6], e2: [105.4, 140.2], G2: [106, 58], bh: [89, 71.5, 95, 69.5],
        band: [27, 36], seam: 1, btn: 1, satin: 0 },
};

/* ── Pick stitching: a line of hand stitches just inside the collar and lapel
   edge. The edge is sampled, each sample pushed inwards along its normal, and
   the stitches stop short of the break where the lapel runs to nothing. */
const STITCH_IN = 2.1;
function cubicAt(a, b, c, d, t) {
    const u = 1 - t;
    return [0, 1].map(i => u*u*u*a[i] + 3*u*u*t*b[i] + 3*u*t*t*c[i] + t*t*t*d[i]);
}
function sampleCubic(a, b, c, d, n, out) { for (let i = 1; i <= n; i++) out.push(cubicAt(a, b, c, d, i / n)); }
function sampleLine(a, b, n, out) { for (let i = 1; i <= n; i++) out.push([a[0] + (b[0]-a[0])*i/n, a[1] + (b[1]-a[1])*i/n]); }
function inside(p, poly) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
}
function stitchPts(s) {
    const edge = [s.T];
    sampleCubic(s.T, s.k1, s.k2, s.C, 12, edge);
    sampleLine(s.C, s.Gn, 3, edge);
    sampleLine(s.Gn, s.P, 4, edge);
    sampleCubic(s.P, s.e1, s.e2, s.B, 22, edge);
    const poly = [s.B];
    sampleCubic(s.B, s.r1, s.r2, s.N, 16, poly);
    poly.push(...edge);
    let area = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
    if (Math.abs(area / 2) < 120) return [];               // collarless: nothing to stitch
    const nrm = (i) => {
        const a = edge[Math.max(0, i - 1)], b = edge[Math.min(edge.length - 1, i + 1)];
        const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
        return [-ty / l, tx / l];
    };
    const mid = Math.floor(edge.length * 0.6), n0 = nrm(mid);
    const sign = inside([edge[mid][0] + n0[0] * STITCH_IN, edge[mid][1] + n0[1] * STITCH_IN], poly) ? 1 : -1;
    const out = [];
    for (let i = 2; i < edge.length - 6; i++) {
        const n = nrm(i);
        out.push([edge[i][0] + sign * n[0] * STITCH_IN, edge[i][1] + sign * n[1] * STITCH_IN]);
    }
    return out;
}

const mx = (p) => [240 - p[0], p[1]];
const pt = (p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;

function lapelPath(s, flip) {
    const f = flip ? mx : (p) => p;
    const q = (k) => pt(f(s[k]));
    return `M${q('B')} C${q('r1')} ${q('r2')} ${q('N')} L${q('T')} C${q('k1')} ${q('k2')} ${q('C')}`
         + ` L${q('Gn')} L${q('P')} C${q('e1')} ${q('e2')} ${q('B')} Z`;
}
function paths(s) {
    const bandTop = s.band[0], bandLow = s.band[1];
    return {
        lapL: lapelPath(s, false),
        lapR: lapelPath(s, true),
        band: `M${pt(s.T)} Q120,${bandTop} ${pt(mx(s.T))} L${pt(mx(s.N))} Q120,${bandLow} ${pt(s.N)} Z`,
        open: `M${pt(s.N)} C${pt(s.r2)} ${pt(s.r1)} ${pt(s.B)} C${pt(mx(s.r1))} ${pt(mx(s.r2))} ${pt(mx(s.N))}`
            + ` Q120,${(s.N[1] - 4).toFixed(2)} ${pt(s.N)} Z`,
        front: `M${pt(s.B)} L120,262`,
        gorge: `M${pt(s.Gn)} L${pt(s.G2)} M${pt(mx(s.Gn))} L${pt(mx(s.G2))}`,
        bh: `M${pt(mx([s.bh[0], s.bh[1]]))} L${pt(mx([s.bh[2], s.bh[3]]))}`,
        roll: `M${pt(s.N)} C${pt(s.r2)} ${pt(s.r1)} ${pt(s.B)} C${pt(mx(s.r1))} ${pt(mx(s.r2))} ${pt(mx(s.N))}`,
        stitch: (() => {
            const p = stitchPts(s);
            if (!p.length) return 'M0,0';
            return `M${p.map(pt).join(' L')} M${p.map(q => pt(mx(q))).join(' L')}`;
        })(),
    };
}

/* The parts of the flat that never change: neck form, coat, sleeves, pockets. */
const STATIC_BACK = `
  <rect x="106" y="12" width="28" height="38" class="lf-form"/>
  <path d="M106 12 L106 46 M134 12 L134 46" class="lf-detail"/>
  <ellipse cx="120" cy="12" rx="14" ry="3" class="lf-cap"/>`;
const COAT = 'M120,262 L30,262 L33,104 C34,80 38,62 46,56 L98,40 Q120,33 142,40 L194,56 C202,62 206,80 207,104 L210,262 Z';
const STATIC_FRONT = `
  <path d="M46 56 C54 78 57 108 55 136 C56 180 57 220 56 262 M194 56 C186 78 183 108 185 136 C184 180 183 220 184 262" class="lf-detail"/>
  <path d="M92 188 L90 250 M148 188 L150 250" class="lf-detail lf-faint"/>
  <path d="M155 145 L179 141 L179 145.5 L155 149.5 Z" class="lf-line lf-thin"/>
  <path d="M66 229 L103 228 L103 238 Q84 240 66 239 Z M174 229 L137 228 L137 238 Q156 240 174 239 Z" class="lf-line lf-thin"/>`;

let uid = 0;
function flat(s, cls) {
    const k = `lf${++uid}`;
    const d = paths(s);
    return `
<svg class="lf ${cls}" viewBox="${cls === 'lf-thumb' ? '38 20 164 116' : '22 4 196 240'}" aria-hidden="true">
  <defs>
    <linearGradient id="${k}-satin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/><stop offset=".42" stop-color="#121212"/>
      <stop offset=".58" stop-color="#2e2e2e"/><stop offset="1" stop-color="#0d0d0d"/>
    </linearGradient>
    <linearGradient id="${k}-body" x1="30" y1="0" x2="210" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#e6e5e1"/><stop offset=".2" stop-color="#f7f7f5"/>
      <stop offset=".5" stop-color="#fcfcfb"/><stop offset=".8" stop-color="#f7f7f5"/>
      <stop offset="1" stop-color="#e6e5e1"/>
    </linearGradient>
    <filter id="${k}-lift" x="-10%" y="-10%" width="120%" height="125%">
      <feDropShadow dx="0" dy="1.2" stdDeviation="1.3" flood-color="#000" flood-opacity=".18"/>
    </filter>
    <filter id="${k}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <clipPath id="${k}-cL"><path data-p="lapL" d="${d.lapL}"/></clipPath>
    <clipPath id="${k}-cR"><path data-p="lapR" d="${d.lapR}"/></clipPath>
    <clipPath id="${k}-cO"><path data-p="open" d="${d.open}"/></clipPath>
  </defs>
  <path data-p="band" d="${d.band}" class="lf-under lf-line"/>
  <path data-p="band" d="${d.band}" class="lf-satin" fill="url(#${k}-satin)" style="opacity:${s.satin}"/>
  ${STATIC_BACK}
  <path d="${COAT}" class="lf-line" style="fill:url(#${k}-body)"/>
  ${STATIC_FRONT}
  <path data-p="open" d="${d.open}" class="lf-form"/>
  <g clip-path="url(#${k}-cO)"><path data-p="roll" d="${d.roll}" class="lf-shade lf-shade-open" filter="url(#${k}-soft)"/></g>
  <path data-p="front" d="${d.front}" class="lf-line"/>
  <g filter="url(#${k}-lift)">
    <path data-p="lapL" d="${d.lapL}" class="lf-cloth"/>
    <path data-p="lapR" d="${d.lapR}" class="lf-cloth"/>
  </g>
  <path data-p="lapL" d="${d.lapL}" class="lf-satin" fill="url(#${k}-satin)" style="opacity:${s.satin}"/>
  <path data-p="lapR" d="${d.lapR}" class="lf-satin" fill="url(#${k}-satin)" style="opacity:${s.satin}"/>
  <g clip-path="url(#${k}-cL)"><path data-p="roll" d="${d.roll}" class="lf-shade" filter="url(#${k}-soft)"/></g>
  <g clip-path="url(#${k}-cR)"><path data-p="roll" d="${d.roll}" class="lf-shade" filter="url(#${k}-soft)"/></g>
  <path data-p="stitch" d="${d.stitch}" class="lf-stitch" style="opacity:${1 - s.satin * 0.75}"/>
  <path data-p="lapL" d="${d.lapL}" class="lf-line"/>
  <path data-p="lapR" d="${d.lapR}" class="lf-line"/>
  <path data-p="gorge" d="${d.gorge}" class="lf-line lf-thin" style="opacity:${s.seam}"/>
  <path data-p="bh" d="${d.bh}" class="lf-line lf-hole" style="opacity:${s.btn}"/>
  <g class="lf-button" style="opacity:${s.btn}" transform="translate(120 ${s.B[1] + 7})">
    <circle r="3.4" class="lf-btn"/><circle r="2.1" class="lf-btn-rim"/>
  </g>
</svg>`;
}

/* ── Morph ── */
function lerp(a, b, t) {
    if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], t));
    return a + (b - a) * t;
}
function mix(a, b, t) {
    const o = {};
    for (const key in a) o[key] = lerp(a[key], b[key], t);
    return o;
}
function apply(svg, s) {
    const d = paths(s);
    svg.querySelectorAll('[data-p]').forEach(el => el.setAttribute('d', d[el.dataset.p]));
    svg.querySelectorAll('.lf-satin').forEach(el => el.style.opacity = s.satin);
    svg.querySelector('[data-p="gorge"]').style.opacity = s.seam;
    svg.querySelector('[data-p="bh"]').style.opacity = s.btn;
    svg.querySelector('[data-p="stitch"]').style.opacity = 1 - s.satin * 0.75;
    const b = svg.querySelector('.lf-button');
    b.style.opacity = s.btn;
    b.setAttribute('transform', `translate(120 ${(s.B[1] + 7).toFixed(2)})`);
}
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ── Styles: the House's grey glass, Times, spaced capitals, square corners ── */
const css = `
.design-lapel-btn {
    position: absolute; bottom: 9.2rem; right: 1.4rem; z-index: 5;
    background: rgba(255,255,255,0.82); border: 1px solid #ccc; color: #666;
    font-family: "Times New Roman", serif; font-size: 1.1rem; letter-spacing: 3px; text-transform: uppercase;
    padding: 0.52rem 1.1rem; cursor: pointer; border-radius: 2px; transition: all 0.2s;
}
.design-lapel-btn:hover { background: #fff; border-color: #999; color: #1a1a1a; }
.design-lapel-btn.active { background: rgba(26,26,26,0.06); border-color: #1a1a1a; color: #1a1a1a; }
.design-lapel-btn em { font-style: italic; text-transform: none; letter-spacing: 1px; }

.lapel-glass {
    position: absolute; z-index: 9; top: 4.4rem; left: 1.1rem;
    width: min(400px, calc(100% - 2.2rem)); max-height: calc(100% - 5.5rem);
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: 4px; border: 1px solid rgba(0,0,0,0.09);
    background: #eeeeee;
    background: rgba(238,238,238,0.74);
    -webkit-backdrop-filter: blur(20px) saturate(140%); backdrop-filter: blur(20px) saturate(140%);
    box-shadow: 0 18px 48px rgba(0,0,0,0.12);
    font-family: "Times New Roman", Times, serif; color: #1a1a1a;
    opacity: 0; visibility: hidden; transform: translateY(8px);
    transition: opacity .3s ease, transform .3s ease, visibility 0s .3s;
}
.lapel-glass.open { opacity: 1; visibility: visible; transform: none; transition: opacity .3s ease, transform .3s ease; }
.lg-head { display: flex; align-items: center; justify-content: space-between; padding: .95rem 1.2rem .35rem; }
.lg-title { margin: 0; font-weight: 400; font-size: 1.25rem; letter-spacing: 5px; text-transform: uppercase; }
.lg-close { background: rgba(255,255,255,0.6); border: 1px solid #d4d4d4; color: #555; width: 2.3rem; height: 2.3rem;
    border-radius: 50%; font-size: 1.35rem; line-height: 1; cursor: pointer; transition: .2s; }
.lg-close:hover { background: #fff; border-color: #999; color: #1a1a1a; }
.lg-body { overflow-y: auto; padding: .3rem 1.1rem 1.1rem; }

.lg-study { display: grid; grid-template-columns: 50% 1fr; gap: .9rem; align-items: center; }
.lg-study .lf { width: 100%; height: auto; display: block; }
.lg-study.ink .lf { animation: lg-ink 1s cubic-bezier(.4,.1,.2,1) both; }
@keyframes lg-ink { from { clip-path: inset(0 0 100% 0); opacity: .2; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
.lg-cap { transition: opacity .25s; }
.lg-cap.fade { opacity: 0; }
.lg-name { margin: 0; font-weight: 400; font-size: 1.2rem; letter-spacing: 3px; text-transform: uppercase; }
.lg-mood { margin: .15rem 0 .7rem; font-style: italic; font-size: 1.1rem; color: #777; }
.lg-note { margin: 0; font-size: 1rem; line-height: 1.55; color: #4a4a4a; }
.lg-cut  { margin: .75rem 0 0; padding-top: .6rem; border-top: 1px solid rgba(0,0,0,0.1);
    font-size: 1rem; letter-spacing: 1px; color: #888; }

.lg-rule { height: 1px; background: rgba(0,0,0,0.1); margin: 1rem 0 .9rem; }
.lg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .55rem; }
.lg-opt { background: rgba(255,255,255,0.42); border: 1px solid rgba(0,0,0,0.07); border-radius: 2px;
    padding: .45rem .35rem .4rem; cursor: pointer; color: #777; font: inherit; text-align: center;
    transition: background .2s, border-color .2s, color .2s, opacity .3s; }
.lg-opt .lf { width: 100%; height: auto; display: block; }
.lg-opt span { display: block; margin-top: .2rem; font-size: 1rem; letter-spacing: 1px; text-transform: uppercase; }
.lg-opt:hover { background: rgba(255,255,255,0.75); border-color: #bbb; color: #1a1a1a; }
.lg-opt.on { background: #fff; border-color: #1a1a1a; color: #1a1a1a; }
.lg-opt:focus-visible, .lg-occ button:focus-visible, .lg-close:focus-visible { outline: 1px solid #1a1a1a; outline-offset: 2px; }
.lg-grid.filtered .lg-opt:not(.fits) { opacity: .32; }

.lg-occ { display: flex; align-items: center; justify-content: center; gap: .4rem; flex-wrap: wrap; }
.lg-occ-label { width: 100%; text-align: center; margin: 0 0 .5rem; font-size: 1rem; letter-spacing: 4px; text-transform: uppercase; color: #888; }
/* the same box as the Fair / Medium / Tan / Dark buttons */
.lg-occ button { background: rgba(245,245,245,0.8); border: 1px solid #ddd; color: #555; font-family: inherit;
    font-size: 1.05rem; letter-spacing: 2px; text-transform: uppercase; padding: .25rem .85rem; border-radius: 2px;
    cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
.lg-occ button:hover { background: #fff; border-color: #bbb; color: #1a1a1a; }
.lg-occ button.on { background: #1a1a1a; border-color: #1a1a1a; color: #fff; }
.lg-occ-line { width: 100%; text-align: center; margin: .5rem 0 0; min-height: 1.5em; font-style: italic; font-size: 1.05rem; color: #777; }

/* the flat: ink on paper */
.lf-cloth  { fill: #fbfbfa; }
.lf-form   { fill: #e4e2de; }
.lf-cap    { fill: #d2cfca; stroke: #9a968f; stroke-width: .8px; vector-effect: non-scaling-stroke; }
.lf-line   { fill: none; stroke: #1a1a1a; stroke-width: 1.25px; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.lf-under { fill: #eeeeeb; }
.lf-shade  { fill: none; stroke: #000; stroke-opacity: .13; stroke-width: 6; }
.lf-shade-open { stroke-opacity: .3; stroke-width: 7; }
.lf-stitch { fill: none; stroke: #1a1a1a; stroke-opacity: .55; stroke-width: .8px; stroke-dasharray: 1.6 2.2;
    stroke-linecap: round; vector-effect: non-scaling-stroke; }
.lf-thin   { stroke-width: .9px; }
.lf-hole   { stroke-width: 1.6px; }
.lf-detail { fill: none; stroke: #1a1a1a; stroke-opacity: .5; stroke-width: .8px; vector-effect: non-scaling-stroke; }
.lf-faint  { stroke-opacity: .28; stroke-dasharray: 3 3; }
.lf-btn     { fill: #1a1a1a; }
.lf-btn-rim { fill: none; stroke: #fff; stroke-opacity: .25; stroke-width: .6px; vector-effect: non-scaling-stroke; }
.lf-thumb .lf-line { stroke-width: 1px; }
.lf-thumb .lf-thin, .lf-thumb .lf-detail { stroke-width: .7px; }
.lf-thumb .lf-stitch { stroke-dasharray: 1 1.6; stroke-width: .6px; }

@media (max-width: 768px) {
    .lapel-glass { position: fixed; z-index: 2000; top: auto; left: 0; right: 0; bottom: 0; width: auto;
        max-height: 80vh; border-radius: 4px 4px 0 0; border-bottom: 0; transform: translateY(24px);
        background: rgba(240,240,240,0.9); }
    .lg-body { padding: .2rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px)); }
    .lg-study { grid-template-columns: 42% 1fr; gap: .8rem; }
    .lg-name { font-size: 1.15rem; letter-spacing: 3px; }
    .lg-mood { margin-bottom: .45rem; }
    .lg-opt span { letter-spacing: 1px; }
    .design-lapel-btn { font-size: .6rem; letter-spacing: .8px; padding: .1rem .28rem; transform: scale(.85); transform-origin: bottom right; }
}
html.kd-lapel-open .kd-m2-jump { display: none !important; }
html.kd-m2 .viewer-panel .design-lapel-btn { transform: scale(.65) !important; transform-origin: bottom right !important; bottom: 5.2rem !important; }
html.kd-m3 .viewer-panel .design-lapel-btn { transform: none !important; font-size: .8rem !important; letter-spacing: 1.5px !important;
    padding: .55rem 0 !important; width: 10.4rem !important; text-align: center !important; right: .8rem !important; bottom: 7.6rem !important; }
@media (prefers-reduced-motion: reduce) {
    .lapel-glass, .lg-opt, .lg-cap { transition: none; }
    .lg-study.ink .lf { animation: none; }
}
`;

/* ── State ── */
let chosen = AS_CUT;
try { const s = localStorage.getItem(STORE); if (SHAPES[s]) chosen = s; } catch (e) {}
let occasion = null;

function build() {
    if (!panel) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.className = 'design-lapel-btn';
    btn.id = 'design-lapel-btn';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    panel.appendChild(btn);

    const glass = document.createElement('div');
    glass.className = 'lapel-glass';
    glass.setAttribute('role', 'dialog');
    glass.setAttribute('aria-labelledby', 'lg-title');
    glass.innerHTML = `
      <div class="lg-head">
        <h3 class="lg-title" id="lg-title">Lapel</h3>
        <button type="button" class="lg-close" aria-label="Close lapel">&times;</button>
      </div>
      <div class="lg-body">
        <div class="lg-study">
          ${flat(SHAPES[chosen], 'lf-study')}
          <div class="lg-cap" aria-live="polite">
            <h4 class="lg-name"></h4>
            <p class="lg-mood"></p>
            <p class="lg-note"></p>
            <p class="lg-cut"></p>
          </div>
        </div>
        <div class="lg-rule"></div>
        <div class="lg-grid" role="radiogroup" aria-label="Lapel">
          ${LAPELS.map(l => `
            <button type="button" class="lg-opt" role="radio" data-id="${l.id}" aria-label="${l.full}">
              ${flat(SHAPES[l.id], 'lf-thumb')}
              <span>${l.name}</span>
            </button>`).join('')}
        </div>
        <div class="lg-rule"></div>
        <div class="lg-occ">
          <p class="lg-occ-label">By occasion</p>
          ${OCCASIONS.map(o => `<button type="button" data-occ="${o.id}" aria-pressed="false">${o.name}</button>`).join('')}
          <p class="lg-occ-line"></p>
        </div>
      </div>`;
    panel.appendChild(glass);

    const study = glass.querySelector('.lg-study');
    const studySvg = study.querySelector('svg');
    const cap = glass.querySelector('.lg-cap');
    const grid = glass.querySelector('.lg-grid');
    const occLine = glass.querySelector('.lg-occ-line');

    let shown = SHAPES[chosen];   // what the study drawing currently shows
    let raf = 0;
    function morphTo(target) {
        cancelAnimationFrame(raf);
        const from = shown;
        if (STILL) { shown = target; apply(studySvg, target); return; }
        const t0 = performance.now(), dur = 720;
        const step = (now) => {
            const t = Math.min(1, (now - t0) / dur);
            shown = mix(from, target, ease(t));
            apply(studySvg, shown);
            if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
    }

    function caption(immediate) {
        const l = LAPELS.find(x => x.id === chosen);
        const write = () => {
            cap.querySelector('.lg-name').textContent = l.full;
            cap.querySelector('.lg-mood').textContent = l.mood;
            cap.querySelector('.lg-note').textContent = l.note;
            cap.querySelector('.lg-cut').textContent = l.id === AS_CUT ? 'As cut on the 3D model' : 'Made to order';
            cap.classList.remove('fade');
        };
        if (immediate || STILL) return write();
        cap.classList.add('fade');
        setTimeout(write, 220);
    }

    function paintChoice(immediate) {
        grid.querySelectorAll('.lg-opt').forEach(o => {
            const on = o.dataset.id === chosen;
            o.classList.toggle('on', on);
            o.setAttribute('aria-checked', on);
            o.tabIndex = on ? 0 : -1;
        });
        const l = LAPELS.find(x => x.id === chosen);
        // inside the viewer dock (js/viewer-dock.js) the label is a span beside an icon
        (btn.querySelector('.kd-dock-label') || btn).innerHTML = `Lapel · <em>${l.name}</em>`;
        btn.classList.toggle('active', glass.classList.contains('open'));
        window.KD_DESIGN_DETAILS = Object.assign(window.KD_DESIGN_DETAILS || {}, { lapel: { id: l.id, name: l.full } });
        caption(immediate);
    }

    function paintOccasion() {
        const o = OCCASIONS.find(x => x.id === occasion);
        grid.classList.toggle('filtered', !!o);
        grid.querySelectorAll('.lg-opt').forEach(b => b.classList.toggle('fits', !!o && o.picks.includes(b.dataset.id)));
        glass.querySelectorAll('[data-occ]').forEach(b => {
            const on = b.dataset.occ === occasion;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on);
        });
        occLine.textContent = o
            ? `${o.line} · ${o.picks.map(p => LAPELS.find(l => l.id === p).name).join(', ')}`
            : '';
    }

    function choose(id) {
        if (id === chosen) return;
        chosen = id;
        try { localStorage.setItem(STORE, id); } catch (e) {}
        saveDetail(sku, 'lapel', id, LAPELS.find(x => x.id === id).full);   // travels to the order (js/design-details.js)
        morphTo(SHAPES[id]);
        paintChoice();
        document.dispatchEvent(new CustomEvent('kd:lapel', { detail: { sku, lapel: id } }));
    }

    let lastFocus = null;
    function open(fromKeys) {
        lastFocus = document.activeElement;
        document.getElementById('fabric-preview')?.classList.remove('visible');
        glass.classList.add('open');
        document.documentElement.classList.add('kd-lapel-open');
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');
        study.classList.remove('ink'); void study.offsetWidth; study.classList.add('ink');   // the pen draws it in
        if (fromKeys) grid.querySelector('.lg-opt.on')?.focus({ preventScroll: true });
    }
    function close() {
        glass.classList.remove('open');
        document.documentElement.classList.remove('kd-lapel-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        if (lastFocus && lastFocus !== document.body) lastFocus.focus?.({ preventScroll: true });
    }

    btn.addEventListener('click', (e) => { e.stopPropagation(); glass.classList.contains('open') ? close() : open(e.detail === 0); });
    glass.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = e.target.closest('.lg-opt');
        if (opt) return choose(opt.dataset.id);
        const occ = e.target.closest('[data-occ]');
        if (occ) { occasion = occasion === occ.dataset.occ ? null : occ.dataset.occ; return paintOccasion(); }
        if (e.target.closest('.lg-close')) close();
    });
    // arrow keys move through the six, like a radio group
    grid.addEventListener('keydown', (e) => {
        const opts = [...grid.querySelectorAll('.lg-opt')];
        const i = opts.indexOf(document.activeElement);
        const step = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 }[e.key];
        if (i < 0 || !step) return;
        e.preventDefault();
        const next = opts[(i + step + opts.length) % opts.length];
        next.focus();
        choose(next.dataset.id);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && glass.classList.contains('open')) close(); });

    // the chosen lapel travels with the piece when it is added — the as-cut one too
    document.getElementById('cfg-add-btn')?.addEventListener('click', () => {
        saveDetail(sku, 'lapel', chosen, LAPELS.find(x => x.id === chosen).full);
    });

    paintOccasion();
    paintChoice(true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
else build();
