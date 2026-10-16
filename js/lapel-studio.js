/* lapel-studio.js — choose the lapel of a blazer / coat on its product page.

   A "Lapel" button sits on the 3D viewer above Design Only. It opens the
   Lapel Atelier over the viewer: six hand-drawn lapels on ivory paper, each
   drawn on a dress form and filled with the fabric the customer has selected,
   a large study of the chosen one, and "Choose by vibe" (Office / Event /
   Minimal) which lights the lapels that suit the occasion.

   The drawings are 2D on purpose: the GLB carries one lapel, so the 3D model
   keeps showing the design as cut, and the atelier shows the alternative.

   Use on a page:
       <script type="module" src="js/lapel-studio.js?default=shawl"></script>
   default = the lapel the GLB is cut with (notch | peak | shawl | collarless |
   contrast | slim). The choice is kept per SKU in localStorage
   ("kd.lapel.<sku>") and published as window.KD_DESIGN_DETAILS.lapel plus a
   'kd:lapel' event, for the order flow to pick up. */

const params   = new URL(import.meta.url).searchParams;
const AS_CUT   = params.get('default') || 'notch';
const panel    = document.querySelector('.viewer-panel');
const sku      = document.querySelector('.fabric-panel[data-sku]')?.dataset.sku || location.pathname;
const STORE    = `kd.lapel.${sku}`;

const LAPELS = [
    { id: 'notch',      name: 'Notch Lapel',       vibe: 'classic',
      note: 'The tailor’s standard: a small triangular step where collar meets lapel. Right for every hour of the working day.' },
    { id: 'peak',       name: 'Peak Lapel',        vibe: 'powerful',
      note: 'The points sweep up towards the shoulder, widening the chest and lifting the line. Formal and commanding.' },
    { id: 'shawl',      name: 'Shawl Lapel',       vibe: 'soft evening look',
      note: 'One unbroken curve from collar to button, with no notch at all. The softest, most graceful line for evening.' },
    { id: 'collarless', name: 'Collarless',        vibe: 'clean & modern',
      note: 'No lapel and no collar: a round neckline whose fronts meet edge to edge. Quiet and architectural.' },
    { id: 'contrast',   name: 'Contrast Lapel',    vibe: 'bold & stylish',
      note: 'Peak lapels faced in black silk satin against the cloth. The dinner-jacket gesture, made for an entrance.' },
    { id: 'slim',       name: 'Slim Minimalist',   vibe: 'sleek & refined',
      note: 'A narrow notch lapel set high, which gives a long, lean V. Precise and unshowy.' },
];

const VIBES = [
    { id: 'office',  name: 'Office',  picks: ['notch', 'collarless'], line: 'Polished & professional',
      icon: '<rect x="5" y="10" width="22" height="15" rx="1.5"/><path d="M12 10V7.5a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 20 7.5V10M5 16h22"/>' },
    { id: 'event',   name: 'Event',   picks: ['peak', 'shawl', 'contrast'], line: 'Elevated & impactful',
      icon: '<path d="M8 5h6l-.6 6a2.4 2.4 0 0 1-4.8 0zM11 13.5V24M8 24h6M18 5h6l-.6 6a2.4 2.4 0 0 1-4.8 0zM21 13.5V24M18 24h6"/>' },
    { id: 'minimal', name: 'Minimal', picks: ['slim', 'collarless'], line: 'Clean & understated',
      icon: '<path d="M8 26C12 18 17 11 25 6M13 18c-3 0-5-2-5-5 3 0 5 2 5 5zM17 13c0-3 2-5 5-5 0 3-2 5-5 5zM18 16c3 0 5 2 5 5-3 0-5-2-5-5z"/>' },
];

/* ── Drawing ──────────────────────────────────────────────────────────────────
   One left half (the wearer's right) on a 200 × 220 board, mirrored for the
   other side. A dress form stands behind: brass cap, linen neck and chest. */
const LEFT = {
    notch: {
        lapel:  'M86 54 L73 61 Q69 72 67 83 L72 89 L56 93 Q66 128 100 160 Q94 108 86 54 Z',
        seams:  'M67 83 L72 89',
    },
    peak: {
        lapel:  'M86 54 L73 61 Q70 72 68 84 L73 88 L46 78 Q58 124 100 160 Q94 108 86 54 Z',
        seams:  'M68 84 L73 88',
    },
    shawl: {
        lapel:  'M86 54 L74 60 Q56 92 62 116 Q74 142 100 160 Q94 108 86 54 Z',
        seams:  '',
    },
    contrast: {
        lapel:  'M86 54 L73 61 Q70 72 68 84 L73 88 L46 78 Q58 124 100 160 Q94 108 86 54 Z',
        seams:  'M68 84 L73 88',
    },
    slim: {
        lapel:  'M86 54 L76 60 Q74 68 73 76 L77 81 L66 84 Q74 124 100 160 Q94 108 86 54 Z',
        seams:  'M73 76 L77 81',
    },
};

let uid = 0;
function drawLapel(id, fabricUrl) {
    const k = `lp${++uid}`;
    const half = LEFT[id];
    const satin = id === 'contrast';
    const fill = fabricUrl ? `url(#${k}-cloth)` : `url(#${k}-plain)`;
    const lapelFill = satin ? `url(#${k}-satin)` : fill;
    const opening = id === 'collarless'
        ? 'M84 50 Q100 76 116 50 Z'                              // round neck, fronts meet
        : 'M86 52 L100 160 L114 52 Z';                          // the V down to the button
    const side = (body) => `<g>${body}</g><g transform="translate(200 0) scale(-1 1)">${body}</g>`;
    const lapelGroup = half ? side(`
        <path d="${half.lapel}" fill="${lapelFill}" />
        <path d="${half.lapel}" fill="url(#${k}-shade)" />
        <path d="${half.lapel}" class="ls-ink" />
        ${half.seams ? `<path d="${half.seams}" class="ls-ink" />` : ''}
        <path d="M86 56 Q91 104 98 150" class="ls-roll" />`) : '';

    return `
<svg viewBox="14 8 172 196" class="ls-drawing" role="img" aria-label="${LAPELS.find(l => l.id === id).name}">
  <defs>
    ${fabricUrl ? `<pattern id="${k}-cloth" patternUnits="userSpaceOnUse" width="70" height="70">
        <image href="${fabricUrl}" width="70" height="70" preserveAspectRatio="xMidYMid slice"/></pattern>` : ''}
    <linearGradient id="${k}-plain" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3b3a36"/><stop offset="1" stop-color="#262522"/></linearGradient>
    <linearGradient id="${k}-satin" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#2b2b2b"/><stop offset=".45" stop-color="#0e0e0e"/>
        <stop offset=".6" stop-color="#3a3a3a"/><stop offset="1" stop-color="#0b0b0b"/></linearGradient>
    <linearGradient id="${k}-shade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".7" stop-color="#fff" stop-opacity=".06"/>
        <stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
    <linearGradient id="${k}-body" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".3" stop-color="#000" stop-opacity="0"/>
        <stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <linearGradient id="${k}-brass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#8a6a32"/><stop offset=".45" stop-color="#e2c27f"/><stop offset="1" stop-color="#7a5a26"/></linearGradient>
  </defs>
  <!-- dress form -->
  <path d="M84 22 L84 50 Q72 54 60 60 L140 60 Q128 54 116 50 L116 22 Z" class="ls-form"/>
  <ellipse cx="100" cy="22" rx="17" ry="4.5" fill="url(#${k}-brass)"/>
  <path d="M83 22 L83 16 Q100 10 117 16 L117 22" fill="url(#${k}-brass)"/>
  <!-- the coat -->
  <path d="M22 220 L24 98 Q26 72 52 63 L84 50 L100 62 L116 50 L148 63 Q174 72 176 98 L178 220 Z" fill="${fill}"/>
  <path d="M22 220 L24 98 Q26 72 52 63 L84 50 L100 62 L116 50 L148 63 Q174 72 176 98 L178 220 Z" fill="url(#${k}-body)"/>
  <path d="${opening}" class="ls-form"/>
  <path d="M22 220 L24 98 Q26 72 52 63 L84 50 M116 50 L148 63 Q174 72 176 98 L178 220" class="ls-ink"/>
  <path d="${id === 'collarless' ? 'M84 50 Q100 76 116 50 M100 63 L100 220' : 'M86 52 L100 160 L114 52 M100 160 L100 220'}" class="ls-ink"/>
  <path d="M52 63 Q46 90 50 120 M148 63 Q154 90 150 120" class="ls-seam"/>
  <path d="M132 112 L154 109" class="ls-ink ls-welt"/>
  <path d="M40 180 L68 178 M132 178 L160 180" class="ls-ink ls-welt"/>
  ${lapelGroup}
  ${id === 'collarless'
      ? ''
      : `<circle cx="100" cy="167" r="3.6" class="ls-button"/><circle cx="99" cy="166" r="1" fill="#fff" opacity=".35"/>`}
</svg>`;
}

/* ── Styles ── */
const css = `
.design-lapel-btn {
    position: absolute; bottom: 9.2rem; right: 1.4rem; z-index: 5;
    background: rgba(255,255,255,0.82); border: 1px solid #ccc;
    color: #666; font-family: "Times New Roman", serif;
    font-size: 1.1rem; letter-spacing: 3px; text-transform: uppercase;
    padding: 0.52rem 1.1rem; cursor: pointer; border-radius: 2px; transition: all 0.2s;
}
.design-lapel-btn:hover { background: #fff; border-color: #999; color: #1a1a1a; }
.design-lapel-btn.active { background: rgba(100,70,0,0.08); border-color: rgba(100,70,0,0.45); color: rgba(100,70,0,0.85); }
.design-lapel-btn em { font-style: italic; text-transform: none; letter-spacing: 1px; color: #8a6a32; }
html.kd-lapel-open .kd-m2-jump { display: none !important; }

.lapel-atelier {
    --ivory: #f6f1e6; --paper: #fbf8f1; --ink: #1d1c1a; --soft: #6b6457;
    --gold: #a8844a; --gold-l: #d9bf8c; --plaque: #1f2a24;
    position: absolute; inset: 0; z-index: 12; display: flex; flex-direction: column;
    background: var(--ivory); color: var(--ink); border-radius: 4px; overflow: hidden;
    font-family: "Times New Roman", Times, serif;
    opacity: 0; visibility: hidden; transform: translateY(10px);
    transition: opacity .35s ease, transform .35s ease, visibility 0s .35s;
}
.lapel-atelier.open { opacity: 1; visibility: visible; transform: none; transition: opacity .35s ease, transform .35s ease; }
.lapel-atelier::before {                         /* the double hairline frame */
    content: ''; position: absolute; inset: 10px; pointer-events: none;
    border: 1px solid var(--gold-l); outline: 1px solid rgba(168,132,74,.35); outline-offset: 4px;
}
.la-scroll { flex: 1; overflow-y: auto; padding: 1.6rem 1.9rem 1.4rem; position: relative; }
.la-head { text-align: center; margin-bottom: 1.1rem; }
.la-head .la-kicker { font-size: 1rem; letter-spacing: 6px; text-transform: uppercase; color: var(--gold); }
.la-head h3 { font-size: 2.1rem; font-weight: 400; letter-spacing: 7px; text-transform: uppercase; margin: .25rem 0; color: var(--plaque); }
.la-head .la-sub { font-size: 1rem; letter-spacing: 4px; text-transform: uppercase; color: var(--soft);
    display: flex; align-items: center; gap: .8rem; justify-content: center; }
.la-head .la-sub::before, .la-head .la-sub::after { content: ''; width: 3rem; height: 1px; background: var(--gold-l); }

.la-study { display: grid; grid-template-columns: minmax(150px, 220px) 1fr; gap: 1.4rem; align-items: center;
    background: var(--paper); border: 1px solid rgba(168,132,74,.35); padding: 1rem 1.3rem; margin-bottom: 1.2rem; }
.la-study .ls-drawing { width: 100%; height: auto; display: block; }
.la-study h4 { margin: 0; font-weight: 400; font-size: 1.6rem; letter-spacing: 4px; text-transform: uppercase; color: var(--plaque); }
.la-study .la-vibe { font-style: italic; font-size: 1.25rem; color: var(--gold); margin: .2rem 0 .6rem; }
.la-study p { margin: 0; font-size: 1.08rem; line-height: 1.55; color: #3d3a34; }
.la-study .la-cut { margin-top: .7rem; font-size: 1rem; letter-spacing: 2px; text-transform: uppercase; color: var(--soft); }

.la-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1.1rem .9rem; }
.la-card { background: none; border: 0; padding: 0; cursor: pointer; text-align: center; color: inherit; font: inherit;
    transition: opacity .3s, filter .3s; }
.la-card .la-frame { position: relative; background: var(--paper); border: 1px solid rgba(168,132,74,.28);
    padding: .5rem .5rem 0; transition: border-color .25s, box-shadow .25s, transform .25s; }
.la-card .la-frame::before { content: ''; position: absolute; inset: 0 22% auto; height: 46%;
    border: 1px solid rgba(168,132,74,.18); border-bottom: 0; border-radius: 50% 50% 0 0 / 30% 30% 0 0; pointer-events: none; }
.la-card .ls-drawing { width: 100%; height: auto; display: block; position: relative; }
.la-card:hover .la-frame { border-color: var(--gold); transform: translateY(-2px); box-shadow: 0 8px 18px -12px rgba(60,45,20,.5); }
.la-card .la-plaque { display: inline-block; margin-top: -1.1rem; position: relative; background: var(--plaque); color: #f1e6cf;
    border: 1px solid var(--gold-l); outline: 1px solid var(--plaque); padding: .32rem .9rem;
    font-size: 1rem; letter-spacing: 2.5px; text-transform: uppercase; white-space: nowrap; }
.la-card .la-word { display: block; font-style: italic; font-size: 1.1rem; color: var(--soft); margin-top: .35rem; }
.la-card.selected .la-frame { border-color: var(--gold); box-shadow: inset 0 0 0 1px var(--gold), 0 10px 22px -14px rgba(60,45,20,.6); }
.la-card.selected .la-plaque { background: var(--gold); color: #fff; border-color: #f1e1bd; outline-color: var(--gold); }
.la-card.selected .la-word { color: var(--gold); }
.la-card .la-tick { position: absolute; top: .45rem; right: .5rem; width: 1.5rem; height: 1.5rem; border-radius: 50%;
    background: var(--gold); color: #fff; display: grid; place-items: center; font-size: 1rem; opacity: 0; transform: scale(.6); transition: .25s; }
.la-card.selected .la-tick { opacity: 1; transform: none; }
.la-card .la-ascut { position: absolute; top: .5rem; left: .6rem; font-size: 1rem; font-style: italic; color: var(--gold); }
.la-grid.vibing .la-card:not(.fits) { opacity: .32; filter: grayscale(.8); }

.la-vibes { margin-top: 1.3rem; border: 1px solid rgba(168,132,74,.35); background: var(--paper); padding: .9rem 1rem 1rem; }
.la-vibes .la-sub { margin-bottom: .7rem; font-size: 1rem; letter-spacing: 4px; text-transform: uppercase; color: var(--plaque);
    display: flex; align-items: center; gap: .8rem; justify-content: center; }
.la-vibes .la-sub::before, .la-vibes .la-sub::after { content: '✦'; color: var(--gold); font-size: .8rem; }
.la-vibe-row { display: grid; grid-template-columns: repeat(3, 1fr); }
.la-vibe-btn { background: none; border: 0; border-left: 1px solid rgba(168,132,74,.3); cursor: pointer; color: inherit;
    font: inherit; padding: .3rem .4rem; text-align: center; transition: background .25s; }
.la-vibe-btn:first-child { border-left: 0; }
.la-vibe-btn svg { width: 2.6rem; height: 2.6rem; padding: .45rem; border: 1px solid var(--gold); border-radius: 50%;
    fill: none; stroke: var(--plaque); stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round; transition: .25s; }
.la-vibe-btn b { display: block; font-weight: 400; font-size: 1.15rem; letter-spacing: 3px; text-transform: uppercase; margin-top: .3rem; }
.la-vibe-btn i { display: block; font-size: 1.05rem; color: var(--soft); }
.la-vibe-btn:hover { background: rgba(168,132,74,.07); }
.la-vibe-btn.on svg { background: var(--plaque); stroke: var(--gold-l); border-color: var(--plaque); }
.la-vibe-btn.on b { color: var(--gold); }

.la-foot { display: flex; justify-content: space-between; align-items: center; gap: .8rem;
    padding: .8rem 1.9rem 1.2rem; background: var(--ivory); border-top: 1px solid rgba(168,132,74,.3); position: relative; }
.la-foot .la-chosen { font-size: 1.1rem; color: var(--soft); }
.la-foot .la-chosen strong { font-weight: 400; color: var(--plaque); letter-spacing: 2px; text-transform: uppercase; }
.la-btn { font-family: inherit; font-size: 1.05rem; letter-spacing: 4px; text-transform: uppercase; cursor: pointer;
    padding: .6rem 1.3rem; border-radius: 2px; transition: .2s; }
.la-btn.ghost { background: none; border: 1px solid rgba(29,28,26,.35); color: var(--ink); }
.la-btn.ghost:hover { border-color: var(--ink); }
.la-btn.solid { background: var(--plaque); border: 1px solid var(--plaque); color: #f1e6cf; }
.la-btn.solid:hover { background: #000; }

.ls-form  { fill: #ece3d3; stroke: #b9ab92; stroke-width: .8; }
.ls-ink   { fill: none; stroke: rgba(20,18,15,.85); stroke-width: 1.1; stroke-linejoin: round; stroke-linecap: round; }
.ls-welt  { stroke-width: 1.4; }
.ls-seam  { fill: none; stroke: rgba(255,255,255,.28); stroke-width: .8; stroke-dasharray: 2 2.2; }
.ls-roll  { fill: none; stroke: rgba(255,255,255,.18); stroke-width: .8; }
.ls-button{ fill: #1a1714; stroke: #b08d57; stroke-width: .9; }

@media (max-width: 768px) {
    .lapel-atelier { position: fixed; inset: 0; z-index: 2000; border-radius: 0; }
    .la-scroll { padding: 1.4rem 1.2rem 1rem; }
    .la-head h3 { font-size: 1.6rem; letter-spacing: 5px; }
    .la-study { grid-template-columns: 130px 1fr; gap: .9rem; padding: .8rem; }
    .la-study h4 { font-size: 1.25rem; letter-spacing: 3px; }
    .la-study p { font-size: 1rem; }
    .la-grid { grid-template-columns: repeat(3, 1fr); gap: .7rem .5rem; }
    .la-card .la-plaque { letter-spacing: 1px; padding: .3rem .45rem; white-space: normal; }
    .la-card .la-ascut { display: none; }
    .la-vibe-btn b { letter-spacing: 1.5px; font-size: 1rem; }
    .la-vibe-btn i { font-size: 1rem; }
    .la-foot { padding: .7rem 1.2rem 1rem; flex-wrap: wrap; }
    .la-foot .la-chosen { flex-basis: 100%; }
    .la-foot .la-btn { flex: 1; letter-spacing: 2px; }
    .design-lapel-btn { font-size: .6rem; letter-spacing: .8px; padding: .1rem .28rem; transform: scale(.85); transform-origin: bottom right; }
}
html.kd-m2 .viewer-panel .design-lapel-btn { transform: scale(.65) !important; transform-origin: bottom right !important; bottom: 5.2rem !important; }
html.kd-m3 .viewer-panel .design-lapel-btn { transform: none !important; font-size: .8rem !important; letter-spacing: 1.5px !important;
    padding: .55rem 0 !important; width: 10.4rem !important; text-align: center !important; right: .8rem !important; bottom: 7.6rem !important; }
@media (prefers-reduced-motion: reduce) { .lapel-atelier, .la-card, .la-card .la-frame { transition: none; } }
`;

/* ── State ── */
let chosen = AS_CUT;
try { const s = localStorage.getItem(STORE); if (LAPELS.some(l => l.id === s)) chosen = s; } catch (e) {}
let vibe = null;
let fabricUrl = '';

function currentFabric() {
    const a = document.querySelector('.fabric-list .swatch-card.active');
    return a?.dataset.texture ? a.dataset.texture.split('#')[0] : '';
}

/* ── Build ── */
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
    panel.appendChild(btn);

    const room = document.createElement('div');
    room.className = 'lapel-atelier';
    room.setAttribute('role', 'dialog');
    room.setAttribute('aria-modal', 'true');
    room.setAttribute('aria-label', 'Choose the lapel');
    room.innerHTML = `
      <div class="la-scroll">
        <header class="la-head">
          <div class="la-kicker">The House of Scion · Atelier</div>
          <h3>The Lapel</h3>
          <div class="la-sub">and the look each creates</div>
        </header>
        <section class="la-study" aria-live="polite"></section>
        <div class="la-grid" role="radiogroup" aria-label="Lapel">
          ${LAPELS.map(l => `
            <button type="button" class="la-card" role="radio" data-id="${l.id}">
              <div class="la-frame">
                ${l.id === AS_CUT ? '<span class="la-ascut">as cut</span>' : ''}
                <span class="la-tick" aria-hidden="true">✓</span>
                <div class="la-art"></div>
              </div>
              <span class="la-plaque">${l.name}</span>
              <span class="la-word">${l.vibe}</span>
            </button>`).join('')}
        </div>
        <section class="la-vibes">
          <div class="la-sub">Choose by vibe</div>
          <div class="la-vibe-row">
            ${VIBES.map(v => `
              <button type="button" class="la-vibe-btn" data-vibe="${v.id}" aria-pressed="false">
                <svg viewBox="0 0 32 32" aria-hidden="true">${v.icon}</svg>
                <b>${v.name}</b>
                <i>${v.picks.map(p => LAPELS.find(l => l.id === p).name.split(' ')[0]).join(' or ')}</i>
              </button>`).join('')}
          </div>
        </section>
      </div>
      <footer class="la-foot">
        <span class="la-chosen"></span>
        <button type="button" class="la-btn ghost" data-act="close">← 3D View</button>
        <button type="button" class="la-btn solid" data-act="done">Keep this lapel</button>
      </footer>`;
    panel.appendChild(room);

    const grid  = room.querySelector('.la-grid');
    const study = room.querySelector('.la-study');
    const label = room.querySelector('.la-chosen');

    function paintArt() {
        fabricUrl = currentFabric();
        grid.querySelectorAll('.la-card').forEach(c => {
            c.querySelector('.la-art').innerHTML = drawLapel(c.dataset.id, fabricUrl);
        });
        paintStudy();
    }
    function paintStudy() {
        const l = LAPELS.find(x => x.id === chosen);
        study.innerHTML = `
            ${drawLapel(l.id, fabricUrl)}
            <div>
              <h4>${l.name}</h4>
              <div class="la-vibe">${l.vibe}</div>
              <p>${l.note}</p>
              <div class="la-cut">${l.id === AS_CUT ? 'As cut on the 3D model' : 'Made to order · the 3D model shows the design as cut'}</div>
            </div>`;
    }
    function paintChoice() {
        grid.querySelectorAll('.la-card').forEach(c => {
            const on = c.dataset.id === chosen;
            c.classList.toggle('selected', on);
            c.setAttribute('aria-checked', on);
        });
        const l = LAPELS.find(x => x.id === chosen);
        label.innerHTML = `Lapel &nbsp;<strong>${l.name}</strong>`;
        btn.innerHTML = `Lapel · <em>${l.name.split(' ')[0]}</em>`;
        btn.classList.toggle('active', chosen !== AS_CUT);
        window.KD_DESIGN_DETAILS = Object.assign(window.KD_DESIGN_DETAILS || {}, { lapel: { id: l.id, name: l.name } });
        paintStudy();
    }
    function paintVibe() {
        const v = VIBES.find(x => x.id === vibe);
        grid.classList.toggle('vibing', !!v);
        grid.querySelectorAll('.la-card').forEach(c => c.classList.toggle('fits', !!v && v.picks.includes(c.dataset.id)));
        room.querySelectorAll('.la-vibe-btn').forEach(b => {
            const on = b.dataset.vibe === vibe;
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on);
            b.querySelector('i').textContent = on ? VIBES.find(x => x.id === b.dataset.vibe).line
                : VIBES.find(x => x.id === b.dataset.vibe).picks.map(p => LAPELS.find(l => l.id === p).name.split(' ')[0]).join(' or ');
        });
    }

    function choose(id) {
        chosen = id;
        try { localStorage.setItem(STORE, id); } catch (e) {}
        paintChoice();
        document.dispatchEvent(new CustomEvent('kd:lapel', { detail: { sku, lapel: id } }));
    }
    let lastFocus = null;
    function open() {
        lastFocus = document.activeElement;
        document.getElementById('fabric-preview')?.classList.remove('visible');
        paintArt();
        room.classList.add('open');
        document.documentElement.classList.add('kd-lapel-open');
        btn.setAttribute('aria-expanded', 'true');
        room.querySelector('.la-card.selected')?.focus({ preventScroll: true });
    }
    function close() {
        room.classList.remove('open');
        document.documentElement.classList.remove('kd-lapel-open');
        btn.setAttribute('aria-expanded', 'false');
        lastFocus?.focus?.({ preventScroll: true });
    }

    btn.addEventListener('click', (e) => { e.stopPropagation(); room.classList.contains('open') ? close() : open(); });
    room.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = e.target.closest('.la-card');
        if (card) return choose(card.dataset.id);
        const vb = e.target.closest('.la-vibe-btn');
        if (vb) { vibe = vibe === vb.dataset.vibe ? null : vb.dataset.vibe; return paintVibe(); }
        const act = e.target.closest('[data-act]')?.dataset.act;
        if (act) close();
    });
    // arrow keys move through the six, like a radio group
    grid.addEventListener('keydown', (e) => {
        const cards = [...grid.querySelectorAll('.la-card')];
        const i = cards.indexOf(document.activeElement);
        if (i < 0) return;
        const step = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = cards[(i + step + cards.length) % cards.length];
        next.focus(); choose(next.dataset.id);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && room.classList.contains('open')) close(); });

    // follow the cloth: the drawings are filled with whatever fabric is selected
    const list = document.querySelector('.fabric-list');
    if (list) new MutationObserver(() => {
        if (room.classList.contains('open') && currentFabric() !== fabricUrl) paintArt();
    }).observe(list, { subtree: true, attributes: true, attributeFilter: ['class'] });

    // the chosen lapel joins the order note when the piece is added
    document.getElementById('cfg-add-btn')?.addEventListener('click', () => {
        const l = LAPELS.find(x => x.id === chosen);
        try { localStorage.setItem(`kd.designDetails.${sku}`, JSON.stringify({ lapel: l.id, lapelName: l.name, at: Date.now() })); } catch (e) {}
    });

    paintVibe();
    paintChoice();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
else build();
