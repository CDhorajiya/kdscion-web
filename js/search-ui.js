/**
 * search-ui.js — site-wide search: magnifying-glass button + search panel
 * ---------------------------------------------------------------------------
 * Add to a page with one tag:
 *   <script type="module" src="js/search-ui.js"></script>              (floats bottom-right)
 *   <script type="module" src="js/search-ui.js?anchor=viewer"></script> (top-right of the 3D viewer)
 *
 * Pages come from search-index.json (built by tools/build_search_index.py).
 * Fabrics are read live from the catalogue instead, so fabrics that are hidden
 * or out of stock never appear in results.
 */
import { getMergedCatalog, loadFabricOverrides } from './fabrics.js';
import { subscribeFabricStock } from './fabric-stock.js';

const ANCHOR = new URL(import.meta.url).searchParams.get('anchor') || 'float';
const INDEX_URL = 'search-index.json';
const TYPE_LABELS = { design: 'Designs', fabric: 'Fabrics', variation: 'Design Variations', gallery: 'Galleries', page: 'Guides & Pages' };
const TYPE_ORDER = ['design', 'fabric', 'variation', 'gallery', 'page'];

/**
 * Fabrics a customer may actually pick: hidden ones (admin dashboard) and
 * out-of-stock ones are dropped. Pure, so it can be tested on its own.
 */
export function visibleFabrics(catalogs, overrides, stockMap) {
  const vis = overrides.visibility || {};
  const out = [];
  const seen = new Set();
  for (const catalog of catalogs) {
    for (const type of catalog) {
      for (const coll of type.collections) {
        for (const s of coll.swatches) {
          if (seen.has(s.id)) continue;
          if ((vis[`s:${s.id}`] ?? true) === false) continue;        // hidden globally
          if (stockMap[s.id]?.inStock === false) continue;            // out of stock
          seen.add(s.id);
          const drape = (overrides.swatchDrape ?? {})[s.id] ?? s.drape ?? '';
          out.push({
            id: s.id, label: s.label, image: s.image,
            typeLabel: type.label, collLabel: coll.label, drape,
            guide: type.id === 'leather' ? 'leather-fundamentals.html' : 'fabric-fundamentals.html',
          });
        }
      }
    }
  }
  return out;
}

const CSS = `
  /* Bare icon — no circle, no plate. */
  /* Always fully opaque — no fade, no pulse. */
  .kd-search-btn {
    display: flex; align-items: center; justify-content: center;
    padding: 0; background: none; border: none; cursor: pointer;
    opacity: 1; transition: transform 0.2s;
  }
  .kd-search-btn:hover, .kd-search-btn:focus-visible {
    transform: scale(1.05); outline: none;
  }
  .kd-search-btn svg { width: 1.9rem; height: 1.9rem; }
  /* Maroon — the same #800000 as "King Dhorajiya" / "Pool of Designs". */
  .kd-search-btn--float  { position: fixed; right: 1.8rem; bottom: 1.8rem; z-index: 900; color: #800000; }
  .kd-search-btn--viewer { position: absolute; top: 1.2rem; right: 1.2rem; z-index: 6; color: #800000; }
  @media (max-width: 768px) {
    .kd-search-btn svg { width: 1.6rem; height: 1.6rem; }
    .kd-search-btn--float { right: 1.1rem; bottom: 1.1rem; }
  }


  .kd-search-modal {
    position: fixed; inset: 0; z-index: 3000;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 6vh 1rem 1rem;
    background: rgba(12,12,14,0.55);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  }
  .kd-search-modal[hidden] { display: none; }
  .kd-search-glass {
    width: min(760px, 100%); max-height: 84vh; display: flex; flex-direction: column;
    border-radius: 14px; border: 1px solid rgba(255,255,255,0.22);
    background: linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
    backdrop-filter: blur(22px) saturate(140%); -webkit-backdrop-filter: blur(22px) saturate(140%);
    box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25);
    overflow: hidden;
  }
  .kd-search-head { display: flex; align-items: center; gap: 0.8rem; padding: 1rem 1.2rem; border-bottom: 1px solid rgba(255,255,255,0.18); }
  .kd-search-input {
    flex: 1; background: transparent; border: none; outline: none; color: #fff;
    font-family: "Times New Roman", Times, serif; font-size: 1.5rem; letter-spacing: 2px;
  }
  .kd-search-input::placeholder { color: rgba(255,255,255,0.45); }
  .kd-search-close {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff;
    width: 2.2rem; height: 2.2rem; border-radius: 50%; font-size: 1.3rem; line-height: 1; cursor: pointer;
  }
  .kd-search-close:hover { background: rgba(255,255,255,0.25); }
  .kd-search-results { overflow-y: auto; padding: 0.4rem 0 0.8rem; }
  .kd-search-group {
    padding: 0.9rem 1.2rem 0.3rem;
    font-family: "Times New Roman", Times, serif; font-size: 1rem; letter-spacing: 4px;
    text-transform: uppercase; color: rgba(255,255,255,0.5);
  }
  .kd-search-hit {
    display: flex; align-items: center; gap: 0.9rem; width: 100%;
    padding: 0.6rem 1.2rem; background: none; border: none; cursor: pointer; text-align: left;
    font-family: "Times New Roman", Times, serif; color: rgba(255,255,255,0.92);
  }
  .kd-search-hit:hover, .kd-search-hit.sel { background: rgba(255,255,255,0.12); }
  .kd-search-hit img { width: 2.6rem; height: 2.6rem; object-fit: cover; border-radius: 2px; background: rgba(255,255,255,0.1); }
  .kd-search-hit b { font-weight: normal; font-size: 1.25rem; letter-spacing: 1px; display: block; }
  .kd-search-hit span { font-size: 1.05rem; letter-spacing: 1px; color: rgba(255,255,255,0.6); display: block; }
  .kd-search-empty { padding: 1.4rem 1.2rem; font-family: "Times New Roman", Times, serif; font-size: 1.15rem; letter-spacing: 1px; color: rgba(255,255,255,0.6); }
`;

const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
  <circle cx="10.5" cy="10.5" r="6.5"></circle><line x1="15.4" y1="15.4" x2="21" y2="21"></line></svg>`;

function score(item, terms) {
  const name = (item.n || '').toLowerCase();
  const sku = (item.sku || '').toLowerCase();
  const code = (item.code || '').toLowerCase();
  const keys = (item.k || '').toLowerCase();
  const desc = (item.d || '').toLowerCase();
  let total = 0;
  for (const term of terms) {
    let best = 0;
    if (name.startsWith(term)) best = 12;
    else if (name.includes(term)) best = 9;
    if (sku.includes(term) || code === term) best = Math.max(best, 11);
    if (!best && new RegExp(`\\b${term}`).test(keys)) best = 5;
    if (!best && desc.includes(term)) best = 2;
    if (!best) return 0;               // every word must match somewhere
    total += best;
  }
  return total;
}

function init() {
  document.head.insertAdjacentHTML('beforeend', `<style id="kd-search-css">${CSS}</style>`);

  const btn = document.createElement('button');
  btn.className = `kd-search-btn kd-search-btn--${ANCHOR === 'viewer' ? 'viewer' : 'float'}`;
  btn.id = 'kd-search-btn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Search the House of Scion');
  btn.innerHTML = ICON;
  const viewer = document.querySelector('.viewer-panel');
  (ANCHOR === 'viewer' && viewer ? viewer : document.body).appendChild(btn);

  document.body.insertAdjacentHTML('beforeend', `
    <div class="kd-search-modal" id="kd-search-modal" role="dialog" aria-modal="true" aria-label="Search" hidden>
      <div class="kd-search-glass">
        <div class="kd-search-head">
          ${ICON.replace('<svg', '<svg style="width:1.4rem;height:1.4rem;color:rgba(255,255,255,0.6)"')}
          <input class="kd-search-input" id="kd-search-input" type="search" autocomplete="off"
                 placeholder="Search designs, fabrics, guides…" aria-label="Search">
          <button class="kd-search-close" id="kd-search-close" aria-label="Close search">&times;</button>
        </div>
        <div class="kd-search-results" id="kd-search-results"></div>
      </div>
    </div>`);

  const modal = document.getElementById('kd-search-modal');
  const input = document.getElementById('kd-search-input');
  const results = document.getElementById('kd-search-results');

  let pages = null;          // from search-index.json
  let stockMap = {};
  subscribeFabricStock((map) => { stockMap = map; if (!modal.hidden) run(); });

  // Main catalogue only: two-tone swatches are labelled with internal ids
  // ("tt-linen-1") and duplicate the same materials, so they'd only add noise.
  const fabricItems = () => visibleFabrics(
    [getMergedCatalog()], loadFabricOverrides(), stockMap
  ).map(f => ({
    u: f.guide, t: 'fabric', n: f.label, img: f.image,
    d: [f.typeLabel, f.collLabel, f.drape && `${f.drape} drape`].filter(Boolean).join(' · '),
    k: `${f.label} ${f.typeLabel} ${f.collLabel} ${f.drape} ${f.id}`.toLowerCase(),
  }));

  async function loadIndex() {
    if (pages) return pages;
    try {
      const res = await fetch(INDEX_URL, { cache: 'no-cache' });
      pages = (await res.json()).pages || [];
    } catch (err) {
      console.warn('[search] index unavailable:', err?.message ?? err);
      pages = [];
    }
    return pages;
  }

  function render(scored, query) {
    if (!query) {
      results.innerHTML = `<p class="kd-search-empty">Search designs by name or code (p42), fabrics, or guides.</p>`;
      return;
    }
    if (!scored.length) {
      results.innerHTML = `<p class="kd-search-empty">Nothing found for “${query}”.</p>`;
      return;
    }
    // Groups are ordered by their best hit, so searching "measurement" leads with
    // the Measurement Guide rather than with whichever group is listed first.
    const groups = TYPE_ORDER
      .map(type => ({ type, hits: scored.filter(x => x.item.t === type) }))
      .filter(g => g.hits.length)
      .sort((a, b) => b.hits[0].s - a.hits[0].s);

    let html = '';
    for (const { type, hits } of groups) {
      html += `<p class="kd-search-group">${TYPE_LABELS[type]}</p>`;
      for (const { item } of hits) {
        html += `<button class="kd-search-hit" data-url="${item.u}">
          ${item.img ? `<img src="${item.img}" alt="">` : ''}
          <span><b>${item.n}</b>${item.d ? `<span>${item.d}</span>` : ''}</span>
        </button>`;
      }
    }
    results.innerHTML = html;
    results.querySelector('.kd-search-hit')?.classList.add('sel');
  }

  async function run() {
    const query = input.value.trim();
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return render([], '');
    const all = [...await loadIndex(), ...fabricItems()];
    const scored = all
      .map(item => ({ item, s: score(item, terms) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40);
    render(scored, query);
  }

  const open = () => {
    modal.hidden = false;
    input.value = '';
    render([], '');
    input.focus();
    loadIndex();
  };
  const close = () => { modal.hidden = true; };

  btn.addEventListener('click', open);
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
  document.getElementById('kd-search-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) close();
  });
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 80); });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const hit = results.querySelector('.kd-search-hit.sel') || results.querySelector('.kd-search-hit');
    if (hit) window.location.href = hit.dataset.url;
  });
  results.addEventListener('click', (e) => {
    const hit = e.target.closest('.kd-search-hit');
    if (hit) window.location.href = hit.dataset.url;
  });
}

if (typeof document !== 'undefined') init();
