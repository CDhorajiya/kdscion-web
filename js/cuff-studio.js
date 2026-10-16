/* cuff-studio.js — choose the shirt cuff on a product page (first on w1).

   A "Cuff" button sits on the 3D viewer above Design Only. It opens a grey
   glass window docked on the viewer (a sheet on phones) showing the cuff as a
   rendered shirting image — images/cuffs/<id>.webp, made by
   tools/render_cuff_images.mjs from js/cuff-shapes.js — that crossfades from one
   cuff to the next.

   Three cuffs: Barrel · One Button, Barrel · Two Button, French Cuff. The 3D
   model keeps the cuff it is cut with; the window shows the alternatives.

   Use on a page:
       <script type="module" src="js/cuff-studio.js?default=barrel1"></script>
   The choice is kept per SKU in localStorage ("kd.cuff.<sku>") and published as
   window.KD_DESIGN_DETAILS.cuff plus a 'kd:cuff' event. */
import { CUFFS } from './cuff-shapes.js';

const params = new URL(import.meta.url).searchParams;
const AS_CUT = CUFFS.some(c => c.id === params.get('default')) ? params.get('default') : 'barrel1';
const panel  = document.querySelector('.viewer-panel');
const sku    = document.querySelector('.fabric-panel[data-sku]')?.dataset.sku || location.pathname;
const STORE  = `kd.cuff.${sku}`;
const STILL  = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IMG    = (id) => `images/cuffs/${id}.webp`;

/* ── Styles: the House's grey glass, as the lapel window ── */
const css = `
.design-cuff-btn {
    position: absolute; bottom: 9.2rem; right: 1.4rem; z-index: 5;
    background: rgba(255,255,255,0.82); border: 1px solid #ccc; color: #666;
    font-family: "Times New Roman", serif; font-size: 1.1rem; letter-spacing: 3px; text-transform: uppercase;
    padding: 0.52rem 1.1rem; cursor: pointer; border-radius: 2px; transition: all 0.2s;
}
.design-cuff-btn:hover { background: #fff; border-color: #999; color: #1a1a1a; }
.design-cuff-btn.active { background: rgba(26,26,26,0.06); border-color: #1a1a1a; color: #1a1a1a; }
.design-cuff-btn em { font-style: italic; text-transform: none; letter-spacing: 1px; }

.cuff-glass {
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
.cuff-glass.open { opacity: 1; visibility: visible; transform: none; transition: opacity .3s ease, transform .3s ease; }
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
.cuff-glass.open .cg-stage img:not(.out) { animation: cg-in 1s cubic-bezier(.2,.7,.2,1) both; }
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
.cg-opt img { width: 100%; height: auto; display: block; aspect-ratio: 1.28; object-fit: cover; object-position: 50% 82%; border-radius: 1px; }
.cg-opt span { display: block; margin-top: .25rem; font-size: 1rem; letter-spacing: 1px; text-transform: uppercase; }
.cg-opt:hover { background: rgba(255,255,255,0.75); border-color: #bbb; color: #1a1a1a; }
.cg-opt.on { background: #fff; border-color: #1a1a1a; color: #1a1a1a; }
.cg-opt:focus-visible, .cg-close:focus-visible { outline: 1px solid #1a1a1a; outline-offset: 2px; }

@media (max-width: 768px) {
    .cuff-glass { position: fixed; z-index: 2000; top: auto; left: 0; right: 0; bottom: 0; width: auto;
        max-height: 82vh; border-radius: 4px 4px 0 0; border-bottom: 0; transform: translateY(24px);
        background: rgba(240,240,240,0.92); }
    .cg-body { padding: .2rem 1rem calc(1rem + env(safe-area-inset-bottom, 0px)); }
    .cg-stage { aspect-ratio: 1.5; }
    .cg-cap { min-height: 0; }
    .design-cuff-btn { font-size: .6rem; letter-spacing: .8px; padding: .1rem .28rem; transform: scale(.85); transform-origin: bottom right; }
}
html.kd-cuff-open .kd-m2-jump { display: none !important; }
html.kd-m2 .viewer-panel .design-cuff-btn { transform: scale(.65) !important; transform-origin: bottom right !important; bottom: 5.2rem !important; }
html.kd-m3 .viewer-panel .design-cuff-btn { transform: none !important; font-size: .8rem !important; letter-spacing: 1.5px !important;
    padding: .55rem 0 !important; width: 10.4rem !important; text-align: center !important; right: .8rem !important; bottom: 7.6rem !important; }
@media (prefers-reduced-motion: reduce) {
    .cuff-glass, .cg-cap, .cg-stage img { transition: none; }
    .cuff-glass.open .cg-stage img:not(.out) { animation: none; }
}
`;

/* ── State ── */
let chosen = AS_CUT;
try { const s = localStorage.getItem(STORE); if (CUFFS.some(c => c.id === s)) chosen = s; } catch (e) {}

function build() {
    if (!panel) return;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    const btn = document.createElement('button');
    btn.className = 'design-cuff-btn';
    btn.id = 'design-cuff-btn';
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    panel.appendChild(btn);

    const glass = document.createElement('section');
    glass.className = 'cuff-glass';
    glass.setAttribute('role', 'dialog');
    glass.setAttribute('aria-labelledby', 'cg-title');
    glass.innerHTML = `
      <div class="cg-head">
        <h3 class="cg-title" id="cg-title">Cuff</h3>
        <button type="button" class="cg-close" aria-label="Close cuff">&times;</button>
      </div>
      <div class="cg-body">
        <div class="cg-stage"><img src="${IMG(chosen)}" alt=""><img class="out" alt=""></div>
        <div class="cg-cap" aria-live="polite"><h4 class="cg-name"></h4><p class="cg-mood"></p><p class="cg-note"></p><p class="cg-cut"></p></div>
        <div class="cg-rule"></div>
        <div class="cg-grid" role="radiogroup" aria-label="Cuff">
          ${CUFFS.map(c => `<button type="button" class="cg-opt" role="radio" data-id="${c.id}" aria-label="${c.full}"><img src="${IMG(c.id)}" alt="" loading="lazy"><span>${c.name}</span></button>`).join('')}
        </div>
      </div>`;
    panel.appendChild(glass);

    const cap  = glass.querySelector('.cg-cap');
    const grid = glass.querySelector('.cg-grid');
    let [front, back] = glass.querySelectorAll('.cg-stage img');

    // the image crossfades, the new one settling in from a slight zoom
    function showImage(id) {
        back.src = IMG(id);
        const swap = () => {
            back.classList.remove('out');
            front.classList.add('out');
            [front, back] = [back, front];
        };
        back.decode ? back.decode().then(swap, swap) : swap();
    }

    function caption(immediate) {
        const c = CUFFS.find(x => x.id === chosen);
        const write = () => {
            cap.querySelector('.cg-name').textContent = c.full;
            cap.querySelector('.cg-mood').textContent = c.mood;
            cap.querySelector('.cg-note').textContent = c.note;
            cap.querySelector('.cg-cut').textContent = c.id === AS_CUT ? 'As cut on the 3D model' : 'Made to order';
            cap.classList.remove('fade');
        };
        if (immediate || STILL) return write();
        cap.classList.add('fade');
        setTimeout(write, 220);
    }
    function paint(immediate) {
        grid.querySelectorAll('.cg-opt').forEach(o => {
            const on = o.dataset.id === chosen;
            o.classList.toggle('on', on);
            o.setAttribute('aria-checked', on);
            o.tabIndex = on ? 0 : -1;
        });
        const c = CUFFS.find(x => x.id === chosen);
        btn.innerHTML = `Cuff · <em>${c.name}</em>`;
        window.KD_DESIGN_DETAILS = Object.assign(window.KD_DESIGN_DETAILS || {}, { cuff: { id: c.id, name: c.full } });
        caption(immediate);
    }
    function choose(id) {
        if (id === chosen) return;
        chosen = id;
        try { localStorage.setItem(STORE, id); } catch (e) {}
        showImage(id);
        paint();
        document.dispatchEvent(new CustomEvent('kd:cuff', { detail: { sku, cuff: id } }));
    }

    let lastFocus = null;
    function open(fromKeys) {
        lastFocus = document.activeElement;
        document.getElementById('fabric-preview')?.classList.remove('visible');
        glass.classList.add('open');
        document.documentElement.classList.add('kd-cuff-open');
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');
        if (fromKeys) grid.querySelector('.cg-opt.on')?.focus({ preventScroll: true });
    }
    function close() {
        glass.classList.remove('open');
        document.documentElement.classList.remove('kd-cuff-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        if (lastFocus && lastFocus !== document.body) lastFocus.focus?.({ preventScroll: true });
    }

    btn.addEventListener('click', (e) => { e.stopPropagation(); glass.classList.contains('open') ? close() : open(e.detail === 0); });
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
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && glass.classList.contains('open')) close(); });

    // the chosen cuff travels with the piece when it is added
    document.getElementById('cfg-add-btn')?.addEventListener('click', () => {
        const c = CUFFS.find(x => x.id === chosen);
        try {
            const key = `kd.designDetails.${sku}`;
            const prev = JSON.parse(localStorage.getItem(key) || '{}');
            localStorage.setItem(key, JSON.stringify({ ...prev, cuff: c.id, cuffName: c.full, at: Date.now() }));
        } catch (e) {}
    });

    paint(true);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
else build();
