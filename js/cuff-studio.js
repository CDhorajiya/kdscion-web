/* cuff-studio.js — choose the shirt cuff on a product page (first on w1).

   A "Cuff" button sits on the 3D viewer above Design Only. It opens two grey
   glass windows side by side, kept in step, so the House can compare two ways
   of showing the same choice:

     A · Drawn  a tailor's line drawing (js/cuff-shapes.js) that reshapes from
                one cuff into the next
     B · Image  rendered shirting images (images/cuffs/<id>.webp, made by
                tools/render_cuff_images.mjs from the same geometry)

   Three cuffs: Barrel · One Button, Barrel · Two Button, French Cuff. The 3D
   model keeps the cuff it is cut with; the windows show the alternatives.

   Use on a page:
       <script type="module" src="js/cuff-studio.js?default=barrel1"></script>
   The choice is kept per SKU in localStorage ("kd.cuff.<sku>") and published as
   window.KD_DESIGN_DETAILS.cuff plus a 'kd:cuff' event. */
import { CUFFS, SHAPES, SLEEVE, PLACKET, PLACKET_STITCH, PLEATS, FOLDS, cuffPaths, mix } from './cuff-shapes.js';

const params = new URL(import.meta.url).searchParams;
const AS_CUT = SHAPES[params.get('default')] ? params.get('default') : 'barrel1';
const panel  = document.querySelector('.viewer-panel');
const sku    = document.querySelector('.fabric-panel[data-sku]')?.dataset.sku || location.pathname;
const STORE  = `kd.cuff.${sku}`;
const STILL  = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IMG    = (id) => `images/cuffs/${id}.webp`;

/* ── A · the drawn cuff ── */
function button(cls, y, opacity) {
    return `<g class="${cls}" transform="translate(156 ${y})" style="opacity:${opacity}">
      <circle r="3.3" class="cf-btn"/><circle r="2.2" class="cf-detail"/>
      <circle cx="-.85" cy="-.85" r=".42" class="cf-hole"/><circle cx=".85" cy="-.85" r=".42" class="cf-hole"/>
      <circle cx="-.85" cy=".85" r=".42" class="cf-hole"/><circle cx=".85" cy=".85" r=".42" class="cf-hole"/>
    </g>`;
}
function drawn(s, thumb) {
    const d = cuffPaths(s);
    return `
<svg class="cf ${thumb ? 'cf-thumb' : 'cf-study'}" viewBox="${thumb ? '56 116 128 100' : '40 66 160 160'}" aria-hidden="true">
  <path d="${SLEEVE}" class="cf-cloth cf-line"/>
  <path d="${FOLDS}" class="cf-detail cf-faint"/>
  <path d="${PLEATS}" class="cf-detail"/>
  <path d="${PLACKET} Z" class="cf-cloth"/>
  <path d="${PLACKET}" class="cf-line cf-thin"/>
  <path d="${PLACKET_STITCH}" class="cf-stitch"/>
  <g transform="translate(166 119)"><circle r="2.3" class="cf-btn"/></g>
  <path data-p="cuff" d="${d.cuff}" class="cf-cloth cf-line cf-lift"/>
  <path data-p="stitch" d="${d.stitch}" class="cf-stitch"/>
  <path data-p="fold" d="${d.fold}" class="cf-line cf-thin" style="opacity:${s.fr}"/>
  <path data-p="edge" d="${d.edge}" class="cf-line"/>
  <path data-p="edge2" d="${d.edge2}" class="cf-line" style="opacity:${s.fr}"/>
  ${button('cf-b1', s.b1y, s.bo)}
  ${button('cf-b2', s.b2y, s.b2o * s.bo)}
  <g class="cf-link" transform="translate(155 ${(150 + s.H) / 2 + 2})" style="opacity:${s.cl}">
    <ellipse rx="5.3" ry="4.3" class="cf-link-head"/><ellipse rx="3.9" ry="3" class="cf-link-ring"/>
  </g>
</svg>`;
}
function apply(svg, s) {
    const d = cuffPaths(s);
    svg.querySelectorAll('[data-p]').forEach(el => el.setAttribute('d', d[el.dataset.p]));
    svg.querySelector('[data-p="fold"]').style.opacity = s.fr;
    svg.querySelector('[data-p="edge2"]').style.opacity = s.fr;
    const b1 = svg.querySelector('.cf-b1'), b2 = svg.querySelector('.cf-b2'), link = svg.querySelector('.cf-link');
    b1.setAttribute('transform', `translate(156 ${s.b1y.toFixed(2)})`); b1.style.opacity = s.bo;
    b2.setAttribute('transform', `translate(156 ${s.b2y.toFixed(2)})`); b2.style.opacity = s.b2o * s.bo;
    link.setAttribute('transform', `translate(155 ${((150 + s.H) / 2 + 2).toFixed(2)})`); link.style.opacity = s.cl;
}
const ease = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

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

.cuff-pair {
    position: absolute; z-index: 9; top: 4.4rem; left: 1.1rem; right: 1.1rem;
    display: flex; gap: .8rem; align-items: flex-start; pointer-events: none;
    max-height: calc(100% - 5.5rem);
    opacity: 0; visibility: hidden; transform: translateY(8px);
    transition: opacity .3s ease, transform .3s ease, visibility 0s .3s;
}
.cuff-pair.open { opacity: 1; visibility: visible; transform: none; transition: opacity .3s ease, transform .3s ease; }
.cuff-glass {
    pointer-events: auto; width: min(340px, calc(50% - .4rem)); max-height: 100%;
    display: flex; flex-direction: column; overflow: hidden;
    border-radius: 4px; border: 1px solid rgba(0,0,0,0.09);
    background: #eeeeee; background: rgba(238,238,238,0.76);
    -webkit-backdrop-filter: blur(20px) saturate(140%); backdrop-filter: blur(20px) saturate(140%);
    box-shadow: 0 18px 48px rgba(0,0,0,0.12);
    font-family: "Times New Roman", Times, serif; color: #1a1a1a;
}
.cg-head { display: flex; align-items: center; justify-content: space-between; gap: .6rem; padding: .9rem 1.1rem .3rem; }
.cg-title { margin: 0; font-weight: 400; font-size: 1.25rem; letter-spacing: 5px; text-transform: uppercase; }
.cg-tag { font-size: 1rem; font-style: italic; color: #888; letter-spacing: .5px; margin-left: auto; }
.cg-close { background: rgba(255,255,255,0.6); border: 1px solid #d4d4d4; color: #555; width: 2.3rem; height: 2.3rem; flex: none;
    border-radius: 50%; font-size: 1.35rem; line-height: 1; cursor: pointer; transition: .2s; }
.cg-close:hover { background: #fff; border-color: #999; color: #1a1a1a; }
.cg-body { overflow-y: auto; padding: .3rem 1.1rem 1.1rem; }

.cg-stage { position: relative; aspect-ratio: 1; border-radius: 2px; overflow: hidden;
    background: rgba(255,255,255,0.5); border: 1px solid rgba(0,0,0,0.06); }
.cg-stage .cf { position: absolute; inset: 0; width: 100%; height: 100%; }
.cg-stage.ink .cf { animation: cg-ink 1s cubic-bezier(.4,.1,.2,1) both; }
@keyframes cg-ink { from { clip-path: inset(0 0 100% 0); opacity: .2; } to { clip-path: inset(0 0 0 0); opacity: 1; } }
.cg-stage img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block;
    transition: opacity .6s ease, transform 1.2s cubic-bezier(.2,.7,.2,1); }
.cg-stage img.out { opacity: 0; transform: scale(1.03); }

.cg-cap { margin-top: .8rem; transition: opacity .25s; min-height: 8.2rem; }
.cg-cap.fade { opacity: 0; }
.cg-name { margin: 0; font-weight: 400; font-size: 1.15rem; letter-spacing: 3px; text-transform: uppercase; }
.cg-mood { margin: .15rem 0 .5rem; font-style: italic; font-size: 1.1rem; color: #777; }
.cg-note { margin: 0; font-size: 1rem; line-height: 1.5; color: #4a4a4a; }
.cg-cut  { margin: .55rem 0 0; font-size: 1rem; letter-spacing: 1px; color: #888; }

.cg-rule { height: 1px; background: rgba(0,0,0,0.1); margin: .9rem 0 .8rem; }
.cg-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .5rem; }
.cg-opt { background: rgba(255,255,255,0.42); border: 1px solid rgba(0,0,0,0.07); border-radius: 2px;
    padding: .35rem .3rem .35rem; cursor: pointer; color: #777; font: inherit; text-align: center;
    transition: background .2s, border-color .2s, color .2s; }
.cg-opt .cf, .cg-opt img { width: 100%; height: auto; display: block; }
.cg-opt img { aspect-ratio: 1.28; object-fit: cover; object-position: 50% 82%; border-radius: 1px; }
.cg-opt span { display: block; margin-top: .25rem; font-size: 1rem; letter-spacing: 1px; text-transform: uppercase; }
.cg-opt:hover { background: rgba(255,255,255,0.75); border-color: #bbb; color: #1a1a1a; }
.cg-opt.on { background: #fff; border-color: #1a1a1a; color: #1a1a1a; }
.cg-opt:focus-visible, .cg-close:focus-visible { outline: 1px solid #1a1a1a; outline-offset: 2px; }

/* the drawing: ink on paper */
.cf-cloth  { fill: #fbfbfa; }
.cf-line   { fill: none; stroke: #1a1a1a; stroke-width: 1.25px; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.cf-cloth.cf-line { fill: #fbfbfa; }
.cf-thin   { stroke-width: .9px; }
.cf-lift   { filter: drop-shadow(0 1px 1.2px rgba(0,0,0,.16)); }
.cf-detail { fill: none; stroke: #1a1a1a; stroke-opacity: .5; stroke-width: .8px; vector-effect: non-scaling-stroke; }
.cf-faint  { stroke-opacity: .2; }
.cf-stitch { fill: none; stroke: #1a1a1a; stroke-opacity: .55; stroke-width: .8px; stroke-dasharray: 1.6 2.2; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.cf-btn    { fill: #fff; stroke: #1a1a1a; stroke-width: .9px; vector-effect: non-scaling-stroke; }
.cf-hole   { fill: #1a1a1a; }
.cf-link-head { fill: #1a1a1a; }
.cf-link-ring { fill: none; stroke: #fff; stroke-opacity: .45; stroke-width: .8px; vector-effect: non-scaling-stroke; }
.cf-thumb .cf-line { stroke-width: 1px; }

@media (max-width: 768px) {
    .cuff-pair { position: fixed; z-index: 2000; top: auto; left: 0; right: 0; bottom: 0; max-height: 82vh;
        flex-direction: column; gap: 0; overflow-y: auto; pointer-events: auto;
        background: rgba(240,240,240,0.92); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
        border-radius: 4px 4px 0 0; box-shadow: 0 -12px 40px rgba(0,0,0,.12); transform: translateY(24px); }
    .cuff-glass { width: auto; max-height: none; overflow: visible; background: none; border: 0; box-shadow: none;
        -webkit-backdrop-filter: none; backdrop-filter: none; border-radius: 0; }
    .cuff-glass + .cuff-glass { border-top: 1px solid rgba(0,0,0,0.1); }
    .cg-body { overflow: visible; }
    .cg-stage { aspect-ratio: 1.5; }
    .cg-cap { min-height: 0; }
    .design-cuff-btn { font-size: .6rem; letter-spacing: .8px; padding: .1rem .28rem; transform: scale(.85); transform-origin: bottom right; }
}
html.kd-cuff-open .kd-m2-jump { display: none !important; }
html.kd-m2 .viewer-panel .design-cuff-btn { transform: scale(.65) !important; transform-origin: bottom right !important; bottom: 5.2rem !important; }
html.kd-m3 .viewer-panel .design-cuff-btn { transform: none !important; font-size: .8rem !important; letter-spacing: 1.5px !important;
    padding: .55rem 0 !important; width: 10.4rem !important; text-align: center !important; right: .8rem !important; bottom: 7.6rem !important; }
@media (prefers-reduced-motion: reduce) {
    .cuff-pair, .cg-cap, .cg-stage img { transition: none; }
    .cg-stage.ink .cf { animation: none; }
}
`;

/* ── State ── */
let chosen = AS_CUT;
try { const s = localStorage.getItem(STORE); if (SHAPES[s]) chosen = s; } catch (e) {}

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

    const caption = `<div class="cg-cap" aria-live="polite"><h4 class="cg-name"></h4><p class="cg-mood"></p><p class="cg-note"></p><p class="cg-cut"></p></div>`;
    const glass = (tag, stage, opt) => `
      <section class="cuff-glass" aria-label="Cuff, ${tag}">
        <div class="cg-head">
          <h3 class="cg-title">Cuff</h3><span class="cg-tag">${tag}</span>
          <button type="button" class="cg-close" aria-label="Close cuff">&times;</button>
        </div>
        <div class="cg-body">
          <div class="cg-stage">${stage}</div>
          ${caption}
          <div class="cg-rule"></div>
          <div class="cg-grid" role="radiogroup" aria-label="Cuff">
            ${CUFFS.map(c => `<button type="button" class="cg-opt" role="radio" data-id="${c.id}" aria-label="${c.full}">${opt(c)}<span>${c.name}</span></button>`).join('')}
          </div>
        </div>
      </section>`;

    const pair = document.createElement('div');
    pair.className = 'cuff-pair';
    pair.setAttribute('role', 'dialog');
    pair.setAttribute('aria-label', 'Choose the cuff');
    pair.innerHTML =
        glass('A · Drawn', drawn(SHAPES[chosen], false), (c) => drawn(SHAPES[c.id], true)) +
        glass('B · Image', `<img src="${IMG(chosen)}" alt=""><img class="out" alt="">`,
              (c) => `<img src="${IMG(c.id)}" alt="" loading="lazy">`);
    panel.appendChild(pair);

    const [glassA, glassB] = pair.querySelectorAll('.cuff-glass');
    const stageA = glassA.querySelector('.cg-stage'), svgA = stageA.querySelector('svg');
    const [imgFront, imgBack] = glassB.querySelectorAll('.cg-stage img');
    let front = imgFront, back = imgBack;

    // A: the drawing reshapes
    let shown = SHAPES[chosen], raf = 0;
    function morphTo(target) {
        cancelAnimationFrame(raf);
        const from = shown;
        if (STILL) { shown = target; apply(svgA, target); return; }
        const t0 = performance.now(), dur = 720;
        const step = (now) => {
            const t = Math.min(1, (now - t0) / dur);
            shown = mix(from, target, ease(t));
            apply(svgA, shown);
            if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
    }
    // B: the image crossfades, the new one settling in from a slight zoom
    function showImage(id) {
        back.src = IMG(id);
        const swap = () => {
            back.classList.remove('out');
            front.classList.add('out');
            [front, back] = [back, front];
        };
        back.decode ? back.decode().then(swap, swap) : swap();
    }

    function captions(immediate) {
        const c = CUFFS.find(x => x.id === chosen);
        pair.querySelectorAll('.cg-cap').forEach(cap => {
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
        });
    }
    function paint(immediate) {
        pair.querySelectorAll('.cg-opt').forEach(o => {
            const on = o.dataset.id === chosen;
            o.classList.toggle('on', on);
            o.setAttribute('aria-checked', on);
            o.tabIndex = on ? 0 : -1;
        });
        const c = CUFFS.find(x => x.id === chosen);
        btn.innerHTML = `Cuff · <em>${c.name}</em>`;
        window.KD_DESIGN_DETAILS = Object.assign(window.KD_DESIGN_DETAILS || {}, { cuff: { id: c.id, name: c.full } });
        captions(immediate);
    }
    function choose(id) {
        if (id === chosen) return;
        chosen = id;
        try { localStorage.setItem(STORE, id); } catch (e) {}
        morphTo(SHAPES[id]);
        showImage(id);
        paint();
        document.dispatchEvent(new CustomEvent('kd:cuff', { detail: { sku, cuff: id } }));
    }

    let lastFocus = null;
    function open(fromKeys) {
        lastFocus = document.activeElement;
        document.getElementById('fabric-preview')?.classList.remove('visible');
        pair.classList.add('open');
        document.documentElement.classList.add('kd-cuff-open');
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');
        stageA.classList.remove('ink'); void stageA.offsetWidth; stageA.classList.add('ink');   // the pen draws it in
        if (fromKeys) glassA.querySelector('.cg-opt.on')?.focus({ preventScroll: true });
    }
    function close() {
        pair.classList.remove('open');
        document.documentElement.classList.remove('kd-cuff-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        if (lastFocus && lastFocus !== document.body) lastFocus.focus?.({ preventScroll: true });
    }

    btn.addEventListener('click', (e) => { e.stopPropagation(); pair.classList.contains('open') ? close() : open(e.detail === 0); });
    pair.addEventListener('click', (e) => {
        e.stopPropagation();
        const opt = e.target.closest('.cg-opt');
        if (opt) return choose(opt.dataset.id);
        if (e.target.closest('.cg-close')) close();
    });
    pair.querySelectorAll('.cg-grid').forEach(grid => grid.addEventListener('keydown', (e) => {
        const opts = [...grid.querySelectorAll('.cg-opt')];
        const i = opts.indexOf(document.activeElement);
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (i < 0 || !step) return;
        e.preventDefault();
        const next = opts[(i + step + opts.length) % opts.length];
        next.focus();
        choose(next.dataset.id);
    }));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pair.classList.contains('open')) close(); });

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
