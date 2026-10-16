/* detail-studio.js — the design-detail window on a product page.

   One grey glass window docked on the 3D viewer (a sheet on phones) for one
   design detail — the cuff of a shirt, the pleats of a trouser … It shows the
   chosen option as a rendered image that crossfades from one option to the
   next, with its name, mood and a note, and the options as thumbnails below.
   A button on the viewer ("Cuff · One Button") opens it.

   The 3D model keeps the detail it is cut with; the window shows the
   alternatives, and the choice travels with the piece.

   Each detail is a small module that calls createDetailStudio() — see
   js/cuff-studio.js and js/pleat-studio.js. The choice is kept per SKU in
   localStorage ("kd.<key>.<sku>"), published as window.KD_DESIGN_DETAILS[key]
   plus a 'kd:<key>' event, and written into "kd.designDetails.<sku>"
   (js/design-details.js), which checkout puts into the order's note. */

import { saveDetail } from './design-details.js';

const css = `
.design-detail-btn {
    position: absolute; right: 1.4rem; z-index: 5;
    background: rgba(255,255,255,0.82); border: 1px solid #ccc; color: #666;
    font-family: "Times New Roman", serif; font-size: 1.1rem; letter-spacing: 3px; text-transform: uppercase;
    padding: 0.52rem 1.1rem; cursor: pointer; border-radius: 2px; transition: all 0.2s;
}
.design-detail-btn:hover { background: #fff; border-color: #999; color: #1a1a1a; }
.design-detail-btn.active { background: rgba(26,26,26,0.06); border-color: #1a1a1a; color: #1a1a1a; }
.design-detail-btn em { font-style: italic; text-transform: none; letter-spacing: 1px; }

.detail-glass {
    position: absolute; z-index: 9; top: 4.4rem; left: 1.1rem;
    width: min(400px, calc(100% - 2.2rem)); max-height: calc(100% - 5.5rem);
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: 4px; border: 1px solid rgba(0,0,0,0.09);
    background: #eeeeee; background: rgba(238,238,238,0.76);
    -webkit-backdrop-filter: blur(20px) saturate(140%); backdrop-filter: blur(20px) saturate(140%);
    box-shadow: 0 18px 48px rgba(0,0,0,0.12);
    font-family: "Times New Roman", Times, serif; color: #1a1a1a;
    opacity: 0; visibility: hidden; transform: translateY(8px);
    transition: opacity .3s ease, transform .3s ease, visibility 0s .3s;
}
.detail-glass.open { opacity: 1; visibility: visible; transform: none; transition: opacity .3s ease, transform .3s ease; }
.cg-head { display: flex; align-items: center; justify-content: space-between; padding: .9rem 1.1rem .3rem; }
.cg-title { margin: 0; font-weight: 400; font-size: 1.25rem; letter-spacing: 5px; text-transform: uppercase; }
.cg-close { background: rgba(255,255,255,0.6); border: 1px solid #d4d4d4; color: #555; width: 2.3rem; height: 2.3rem; flex: none;
    border-radius: 50%; font-size: 1.35rem; line-height: 1; cursor: pointer; transition: .2s; }
.cg-close:hover { background: #fff; border-color: #999; color: #1a1a1a; }
.cg-body { overflow-y: auto; padding: .3rem 1.1rem 1.1rem; }

.cg-stage { position: relative; aspect-ratio: 1; border-radius: 2px; overflow: hidden;
    background: #e6e6e3; border: 1px solid rgba(0,0,0,0.06); }
.cg-stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
    transition: opacity .6s ease, transform 1.2s cubic-bezier(.2,.7,.2,1); }
.cg-stage img.out { opacity: 0; transform: scale(1.03); }
.detail-glass.open .cg-stage img:not(.out) { animation: cg-in 1s cubic-bezier(.2,.7,.2,1) both; }
@keyframes cg-in { from { opacity: 0; transform: scale(1.04); } to { opacity: 1; transform: none; } }

.cg-cap { margin-top: .85rem; transition: opacity .25s; min-height: 10.4rem; }
.cg-cap.fade { opacity: 0; }
.cg-name { margin: 0; font-weight: 400; font-size: 1.2rem; letter-spacing: 3px; text-transform: uppercase; }
.cg-mood { margin: .2rem 0 .6rem; font-style: italic; font-size: 1.4rem; color: #6f6f6f; }
.cg-note { margin: 0; font-size: 1.25rem; line-height: 1.55; color: #3f3f3f; }
.cg-cut  { margin: .65rem 0 0; font-size: 1.22rem; letter-spacing: 1px; color: #7d7d7d; }

.cg-rule { height: 1px; background: rgba(0,0,0,0.1); margin: .9rem 0 .8rem; }
.cg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }
.cg-opt { background: rgba(255,255,255,0.42); border: 1px solid rgba(0,0,0,0.07); border-radius: 2px;
    padding: .35rem .3rem; cursor: pointer; color: #777; font: inherit; text-align: center;
    transition: background .2s, border-color .2s, color .2s; }
.cg-opt img { width: 100%; height: auto; display: block; aspect-ratio: 1.28; object-fit: cover; border-radius: 1px; }
.cg-opt span { display: block; margin-top: .25rem; font-size: 1rem; letter-spacing: 1px; text-transform: uppercase; }
.cg-opt:hover { background: rgba(255,255,255,0.75); border-color: #bbb; color: #1a1a1a; }
.cg-opt.on { background: #fff; border-color: #1a1a1a; color: #1a1a1a; }
.cg-opt:focus-visible, .cg-close:focus-visible { outline: 1px solid #1a1a1a; outline-offset: 2px; }

@media (max-width: 768px) {
    .detail-glass { position: fixed; z-index: 2000; top: auto; left: 0; right: 0; bottom: 0; width: auto;
        max-height: 82vh; border-radius: 4px 4px 0 0; border-bottom: 0; transform: translateY(24px);
        background: rgba(240,240,240,0.92); }
    .cg-body { padding: .2rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px)); }
    .cg-stage { aspect-ratio: 1.5; }
    .cg-cap { min-height: 0; }
    .design-detail-btn { font-size: .6rem; letter-spacing: .8px; padding: .1rem .28rem; transform: scale(.85); transform-origin: bottom right; }
}
html.kd-detail-open .kd-m2-jump { display: none !important; }
html.kd-m2 .viewer-panel .design-detail-btn { transform: scale(.65) !important; transform-origin: bottom right !important; }
html.kd-m3 .viewer-panel .design-detail-btn { transform: none !important; font-size: .8rem !important; letter-spacing: 1.5px !important;
    padding: .55rem 0 !important; width: 10.4rem !important; text-align: center !important; right: .8rem !important; }
@media (prefers-reduced-motion: reduce) {
    .detail-glass, .cg-cap, .cg-stage img { transition: none; }
    .detail-glass.open .cg-stage img:not(.out) { animation: none; }
}
`;

/* Where the button sits above Design Only — desktop, and the two phone layouts
   (css/mobile-refresh.css) — one row higher per extra detail on the page. */
const BOTTOM = { desk: [9.2, 12.8], m2: [5.2, 7.2], m3: [7.6, 11] };

let styled = false;
const glasses = [];

/**
 * @param {object} o
 * @param {string}   o.key       'cuff', 'pleat' … (storage key, event name, KD_DESIGN_DETAILS key)
 * @param {string}   o.title     window title, and the button's label ("Cuff")
 * @param {Array}    o.items     [{ id, name, full, mood, note }] — name on thumbnails and button
 * @param {Function} o.image     id → image URL
 * @param {string}   o.asCut     the option the GLB is cut with
 * @param {string}  [o.thumbPosition] object-position for the thumbnails' crop
 * @param {number}  [o.slot]     0 = first detail on the page, 1 = the next row up
 */
export function createDetailStudio(o) {
    const panel = document.querySelector('.viewer-panel');
    if (!panel) return;
    const sku   = document.querySelector('.fabric-panel[data-sku]')?.dataset.sku || location.pathname;
    const STORE = `kd.${o.key}.${sku}`;
    const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const slot  = o.slot || 0;
    const items = o.items;
    const asCut = items.some(i => i.id === o.asCut) ? o.asCut : items[0].id;
    let chosen = asCut;
    try { const s = localStorage.getItem(STORE); if (items.some(i => i.id === s)) chosen = s; } catch (e) {}

    if (!styled) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
        styled = true;
    }
    const pos = document.createElement('style');
    pos.textContent = `
        #design-${o.key}-btn { bottom: ${BOTTOM.desk[slot]}rem; }
        html.kd-m2 .viewer-panel #design-${o.key}-btn { bottom: ${BOTTOM.m2[slot]}rem !important; }
        html.kd-m3 .viewer-panel #design-${o.key}-btn { bottom: ${BOTTOM.m3[slot]}rem !important; }
        #detail-${o.key} .cg-opt img { object-position: ${o.thumbPosition || '50% 50%'}; }`;
    document.head.appendChild(pos);

    const btn = document.createElement('button');
    btn.className = 'design-detail-btn';
    btn.id = `design-${o.key}-btn`;
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    panel.appendChild(btn);

    const glass = document.createElement('section');
    glass.className = 'detail-glass';
    glass.id = `detail-${o.key}`;
    glass.setAttribute('role', 'dialog');
    glass.setAttribute('aria-labelledby', `detail-${o.key}-title`);
    glass.innerHTML = `
      <div class="cg-head">
        <h3 class="cg-title" id="detail-${o.key}-title">${o.title}</h3>
        <button type="button" class="cg-close" aria-label="Close ${o.title.toLowerCase()}">&times;</button>
      </div>
      <div class="cg-body">
        <div class="cg-stage"><img src="${o.image(chosen)}" alt=""><img class="out" alt=""></div>
        <div class="cg-cap" aria-live="polite"><h4 class="cg-name"></h4><p class="cg-mood"></p><p class="cg-note"></p><p class="cg-cut"></p></div>
        <div class="cg-rule"></div>
        <div class="cg-grid" role="radiogroup" aria-label="${o.title}">
          ${items.map(i => `<button type="button" class="cg-opt" role="radio" data-id="${i.id}" aria-label="${i.full}"><img src="${o.image(i.id)}" alt="" loading="lazy"><span>${i.name}</span></button>`).join('')}
        </div>
      </div>`;
    panel.appendChild(glass);

    const cap  = glass.querySelector('.cg-cap');
    const grid = glass.querySelector('.cg-grid');
    let [front, back] = glass.querySelectorAll('.cg-stage img');

    // the image crossfades, the new one settling in from a slight zoom
    function showImage(id) {
        back.src = o.image(id);
        const swap = () => {
            back.classList.remove('out');
            front.classList.add('out');
            [front, back] = [back, front];
        };
        back.decode ? back.decode().then(swap, swap) : swap();
    }
    function caption(immediate) {
        const i = items.find(x => x.id === chosen);
        const write = () => {
            cap.querySelector('.cg-name').textContent = i.full;
            cap.querySelector('.cg-mood').textContent = i.mood;
            cap.querySelector('.cg-note').textContent = i.note;
            cap.querySelector('.cg-cut').textContent = i.id === asCut ? 'As cut on the 3D model' : 'Made to order';
            cap.classList.remove('fade');
        };
        if (immediate || STILL) return write();
        cap.classList.add('fade');
        setTimeout(write, 220);
    }
    function paint(immediate) {
        grid.querySelectorAll('.cg-opt').forEach(b => {
            const on = b.dataset.id === chosen;
            b.classList.toggle('on', on);
            b.setAttribute('aria-checked', on);
            b.tabIndex = on ? 0 : -1;
        });
        const i = items.find(x => x.id === chosen);
        // inside the viewer dock (js/viewer-dock.js) the label is a span beside an icon
        const label = btn.querySelector('.kd-dock-label');
        (label || btn).innerHTML = `${o.title} · <em>${i.name}</em>`;
        window.KD_DESIGN_DETAILS = Object.assign(window.KD_DESIGN_DETAILS || {}, { [o.key]: { id: i.id, name: i.full } });
        caption(immediate);
    }
    function choose(id) {
        if (id === chosen) return;
        chosen = id;
        try { localStorage.setItem(STORE, id); } catch (e) {}
        saveDetail(sku, o.key, id, items.find(x => x.id === id).full);   // travels to the order (js/design-details.js)
        showImage(id);
        paint();
        document.dispatchEvent(new CustomEvent(`kd:${o.key}`, { detail: { sku, [o.key]: id } }));
    }

    let lastFocus = null;
    const isOpen = () => glass.classList.contains('open');
    function open(fromKeys) {
        glasses.forEach(g => g !== api && g.close());          // one detail window at a time
        lastFocus = document.activeElement;
        document.getElementById('fabric-preview')?.classList.remove('visible');
        glass.classList.add('open');
        document.documentElement.classList.add('kd-detail-open');
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');
        if (fromKeys) grid.querySelector('.cg-opt.on')?.focus({ preventScroll: true });
    }
    function close() {
        if (!isOpen()) return;
        glass.classList.remove('open');
        document.documentElement.classList.remove('kd-detail-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        if (lastFocus && lastFocus !== document.body) lastFocus.focus?.({ preventScroll: true });
    }
    const api = { close };
    glasses.push(api);

    btn.addEventListener('click', (e) => { e.stopPropagation(); isOpen() ? close() : open(e.detail === 0); });
    glass.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = e.target.closest('.cg-opt');
        if (opt) return choose(opt.dataset.id);
        if (e.target.closest('.cg-close')) close();
    });
    grid.addEventListener('keydown', (e) => {
        const opts = [...grid.querySelectorAll('.cg-opt')];
        const i = opts.indexOf(document.activeElement);
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (i < 0 || !step) return;
        e.preventDefault();
        const next = opts[(i + step + opts.length) % opts.length];
        next.focus();
        choose(next.dataset.id);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    // the choice travels with the piece when it is added — the as-cut one too
    document.getElementById('cfg-add-btn')?.addEventListener('click', () => {
        saveDetail(sku, o.key, chosen, items.find(x => x.id === chosen).full);
    });

    paint(true);
}

export function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
}
