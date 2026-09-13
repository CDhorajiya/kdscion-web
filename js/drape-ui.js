/**
 * drape-ui.js — "Fabric Drape" button + glass window for every product page
 * ---------------------------------------------------------------------------
 * Added to a page with one tag: <script type="module" src="js/drape-ui.js"></script>
 * It builds on markup every product page already has — the #fabric-preview overlay
 * and its #fabric-preview-back button — and on the data-drape attribute fabrics.js
 * puts on swatch cards. Swatches without a drape type simply don't get the button.
 */
import { createDrapeDemo } from './drape-demo.js';

const DRAPE_LABELS = { crisp: 'Crisp', medium: 'Medium', flowing: 'Flowing', heavy: 'Heavy' };

const CSS = `
  .fabric-preview-back.fabric-drape-btn { bottom: 4.9rem; }
  .drape-modal {
    position: fixed; inset: 0; z-index: 2000;
    display: flex; align-items: center; justify-content: center;
    padding: 1rem;
    background: rgba(12,12,14,0.45);
    backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  }
  .drape-modal[hidden] { display: none; }
  .drape-glass {
    position: relative;
    width: min(1440px, 100%); height: min(980px, 100%);
    display: flex; flex-direction: column;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.22);
    background: linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05));
    backdrop-filter: blur(22px) saturate(140%); -webkit-backdrop-filter: blur(22px) saturate(140%);
    box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25);
    overflow: hidden;
  }
  .drape-glass-head {
    display: flex; align-items: center; justify-content: space-between; gap: 1rem;
    padding: 1rem 1.25rem 0.5rem;
  }
  .drape-glass-title {
    margin: 0;
    font-family: "Times New Roman", Times, serif; font-size: 1.25rem;
    letter-spacing: 5px; text-transform: uppercase; color: rgba(255,255,255,0.9);
  }
  .drape-glass-close {
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: #fff;
    font-size: 1.4rem; line-height: 1; width: 2.4rem; height: 2.4rem;
    border-radius: 50%; cursor: pointer; transition: background 0.2s;
  }
  .drape-glass-close:hover { background: rgba(255,255,255,0.25); }
  .drape-cat-row {
    display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem;
    padding: 0.25rem 1.25rem 0;
  }
  /* Same box, type and hover/active states as the Fair / Medium / Tan / Dark .skin-btn */
  .drape-cat-btn {
    background: #f5f5f5; border: 1px solid #ddd; color: #555;
    font-family: "Times New Roman", serif; font-size: 1.2rem;
    letter-spacing: 4px; text-transform: uppercase;
    padding: 0.25rem 0.9rem; border-radius: 2px; cursor: pointer;
    transition: background 0.2s, border-color 0.2s, color 0.2s, opacity 0.2s;
  }
  .drape-cat-btn:hover  { background: #eee; border-color: #bbb; color: #1a1a1a; }
  .drape-cat-btn.active { background: #1a1a1a; border-color: #1a1a1a; color: #fff; }
  .drape-cat-btn.dimmed { opacity: 0.45; }
  .drape-cat-btn.dimmed:hover { opacity: 0.75; }
  @media (max-width: 768px) {
    .drape-cat-btn { font-size: 1rem; letter-spacing: 3px; padding: 0.2rem 0.6rem; }
  }
  .drape-glass canvas { flex: 1; min-height: 0; width: 100%; display: block; cursor: grab; }
  .drape-note {
    align-self: center;
    margin: 0.6rem 1.25rem 0; padding: 0.45rem 1rem;
    font-family: "Times New Roman", Times, serif; font-size: 1.155rem; letter-spacing: 2px;
    text-align: center; color: #fff;
    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.28); border-radius: 2px;
  }
  .drape-glass-foot {
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
    gap: 0.75rem 1rem; padding: 0.5rem 1.1rem 1.1rem;
  }
  .drape-glass-hint {
    margin: 0;
    font-family: "Times New Roman", Times, serif; font-size: 1.1rem; letter-spacing: 1.5px;
    color: rgba(255,255,255,0.6);
  }
  .drape-glass-foot .fabric-preview-back { position: static; margin-left: auto; }
`;

const MODAL_HTML = `
  <div class="drape-modal" id="drape-modal" role="dialog" aria-modal="true" aria-labelledby="drape-glass-title" hidden>
    <div class="drape-glass">
      <div class="drape-glass-head">
        <h2 class="drape-glass-title" id="drape-glass-title">Fabric Drape</h2>
        <button class="drape-glass-close" id="drape-glass-close" aria-label="Close fabric drape">&times;</button>
      </div>
      <div class="drape-cat-row" id="drape-cat-row">
        <button class="drape-cat-btn" data-category="crisp">Crisp</button>
        <button class="drape-cat-btn" data-category="medium">Medium</button>
        <button class="drape-cat-btn" data-category="flowing">Flowing</button>
        <button class="drape-cat-btn" data-category="heavy">Heavy</button>
      </div>
      <p class="drape-note" id="drape-note" role="status" aria-live="polite" hidden></p>
      <canvas id="drape-demo-canvas"></canvas>
      <div class="drape-glass-foot">
        <p class="drape-glass-hint">Drag to rotate &middot; tap another drape to compare</p>
        <button class="fabric-preview-back" id="drape-glass-3d">&larr; 3D View</button>
      </div>
    </div>
  </div>`;

function init() {
  const preview = document.getElementById('fabric-preview');
  const backBtn = document.getElementById('fabric-preview-back');
  if (!preview || !backBtn || document.getElementById('drape-modal')) return;

  document.head.insertAdjacentHTML('beforeend', `<style id="drape-ui-css">${CSS}</style>`);
  document.body.insertAdjacentHTML('beforeend', MODAL_HTML);

  const drapeBtn = document.createElement('button');
  drapeBtn.className = 'fabric-preview-back fabric-drape-btn';
  drapeBtn.id = 'fabric-drape-btn';
  drapeBtn.textContent = 'Fabric Drape';
  drapeBtn.hidden = true;
  preview.insertBefore(drapeBtn, backBtn);

  const modal  = document.getElementById('drape-modal');
  const title  = document.getElementById('drape-glass-title');
  const catRow = document.getElementById('drape-cat-row');
  const note   = document.getElementById('drape-note');
  let demo   = null;   // WebGL scene, created on first open so unused pages pay nothing
  let active = null;   // { texture, label, drape } of the last clicked swatch that has a drape

  const markFabricDrape = (drape) => catRow.querySelectorAll('.drape-cat-btn').forEach(b => {
    const own = b.dataset.category === drape;
    b.classList.toggle('active', own);
    b.classList.toggle('dimmed', !own);
  });

  function open() {
    if (!active) return;
    title.textContent = `Fabric Drape — ${active.label} · ${DRAPE_LABELS[active.drape]}`;
    note.hidden = true;
    modal.hidden = false; // must be visible before the canvas is sized
    demo ??= createDrapeDemo(document.getElementById('drape-demo-canvas'));
    markFabricDrape(active.drape);
    demo.drop(active.texture, active.drape);
  }
  function close() {
    modal.hidden = true;
    demo?.stop();
  }

  // Product pages stop click propagation on swatches, so track them in the capture phase.
  document.addEventListener('click', (e) => {
    const card = e.target.closest?.('.swatch-card');
    if (!card) return;
    const drape = DRAPE_LABELS[card.dataset.drape] ? card.dataset.drape : null;
    active = drape
      ? { texture: card.dataset.texture, label: card.querySelector('img')?.alt ?? '', drape }
      : null;
    drapeBtn.hidden = !drape;
  }, true);

  drapeBtn.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  document.getElementById('drape-glass-close').addEventListener('click', close);
  document.getElementById('drape-glass-3d').addEventListener('click', () => {
    close();
    preview.classList.remove('visible');
  });
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) close(); });
  window.addEventListener('resize', () => { if (!modal.hidden) demo?.resize(); });
  catRow.addEventListener('click', (e) => {
    const btn = e.target.closest('.drape-cat-btn');
    if (!btn || !demo || !active) return;
    const picked = btn.dataset.category;
    note.textContent = `Selected fabric drape is "${DRAPE_LABELS[active.drape]}". Other drape types are for reference only.`;
    note.hidden = picked === active.drape;
    demo.drop(active.texture, picked);
  });
}

init();
