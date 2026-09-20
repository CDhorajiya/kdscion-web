/**
 * ============================================================
 *  colourist/index.js  —  mount the House Colourist
 * ============================================================
 *
 *  Add to a page with one tag:
 *      <script type="module" src="js/colourist/index.js"></script>
 *
 *  It attaches itself to the KD monogram (.kd-viewer-logo) if the page
 *  has one, and otherwise does nothing — no page needs to know about
 *  its internals.
 *
 *  DATA IT READS
 *    data/palettes.json      the twelve curated palettes
 *    data/fabric-color.json  measured colour of every swatch image
 *    the live catalogue      js/fabrics.js  (admin visibility applied)
 *    live stock              js/fabric-stock.js
 *
 *  Both JSON files are fetched once, lazily, the first time the panel is
 *  opened — a customer who never opens it pays nothing for it.
 */

import { getProfile, saveProfile, isCompleteProfile, recordWantedColour } from '../profile.js';
import { getMergedCatalog, loadFabricOverrides } from '../fabrics.js';
import { subscribeFabricStock } from '../fabric-stock.js';
import { purchasableFabrics, recommend } from './engine.js';
import { injectStyles, showOnGarment, quickProfileHtml, resultHtml } from './ui.js';

const PALETTES_URL = 'data/palettes.json';
const COLORS_URL   = 'data/fabric-color.json';

let palettes = null;
let colorData = null;
let stockMap = {};
let scrim, panel, body;
let draft = {};              // in-progress answers from the quick profile

async function loadData() {
  if (palettes && colorData) return true;
  try {
    const [p, c] = await Promise.all([
      fetch(PALETTES_URL, { cache: 'no-cache' }).then((r) => r.json()),
      fetch(COLORS_URL,   { cache: 'no-cache' }).then((r) => r.json()),
    ]);
    palettes = p; colorData = c;
    return true;
  } catch (err) {
    console.warn('[colourist] data unavailable:', err?.message ?? err);
    return false;
  }
}

function buildShell() {
  injectStyles();
  scrim = document.createElement('div');
  scrim.className = 'kdc-scrim';
  scrim.hidden = true;

  panel = document.createElement('aside');
  panel.className = 'kdc-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'The House Colourist');
  panel.innerHTML = `
    <div class="kdc-head">
      <p class="kdc-title">The Colourist</p>
      <button class="kdc-close" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="kdc-body"></div>`;

  document.body.append(scrim, panel);
  body = panel.querySelector('.kdc-body');

  scrim.addEventListener('click', close);
  panel.querySelector('.kdc-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  body.addEventListener('click', onBodyClick);
}

// ── Rendering ────────────────────────────────────────────────────────────────

function render() {
  const profile = getProfile();
  if (!isCompleteProfile(profile)) {
    body.innerHTML = quickProfileHtml(draft);
    return;
  }
  if (!palettes || !colorData) {
    body.innerHTML = `<p class="kdc-lede">The colour library could not be reached.
      Please try again in a moment.</p>`;
    return;
  }
  const fabrics = purchasableFabrics(getMergedCatalog(), loadFabricOverrides(), stockMap);
  const rec = recommend({ profile, palettes, colorData, fabrics });
  if (!rec) {
    body.innerHTML = `<p class="kdc-lede">That profile is not one the House recognises.</p>`;
    return;
  }
  const twoTone = !!document.getElementById('zone-twotone');
  body.innerHTML = resultHtml(rec, profile, { twoTone });
  markActiveFabric();

  if (typeof window.kdTrack === 'function') {
    window.kdTrack('colourist_opened', {
      skin_type: profile.skinType, undertone: profile.undertone,
      fabrics_offered: rec.picks.length, gaps: rec.gaps.length,
    });
  }
}

/** Mirrors the page's currently-selected swatch into the panel. */
function markActiveFabric() {
  const active = document.querySelector('.swatch-card.active')?.dataset.fabricId;
  body.querySelectorAll('.kdc-pick').forEach((el) => {
    el.classList.toggle('on', !!active && el.dataset.fabric === active);
  });
}

// ── Interaction ──────────────────────────────────────────────────────────────

function onBodyClick(e) {
  // Quick profile: skin type
  const skin = e.target.closest('[data-skin]');
  if (skin) { draft.skinType = skin.dataset.skin; commitDraft(); return; }

  // Quick profile: undertone
  const tone = e.target.closest('[data-tone]');
  if (tone) { draft.undertone = tone.dataset.tone; commitDraft(); return; }

  // Start over
  if (e.target.closest('[data-act="reset"]')) {
    draft = {};
    saveProfile({ skinType: null, undertone: null });
    render();
    return;
  }

  // Put a fabric on the garment
  const pick = e.target.closest('[data-fabric]');
  if (pick) {
    const ok = showOnGarment(pick.dataset.fabric);
    if (ok) {
      body.querySelectorAll('.kdc-pick').forEach((el) => el.classList.remove('on'));
      pick.classList.add('on');
      if (typeof window.kdTrack === 'function') {
        window.kdTrack('colourist_applied_fabric', { fabric_id: pick.dataset.fabric });
      }
      if (window.matchMedia('(max-width: 768px)').matches) close();   // let them see it
    } else {
      pick.querySelector('.kdc-go').textContent = 'Not on this design';
    }
    return;
  }

  // Register interest in a colour the House does not hold
  const want = e.target.closest('[data-want]');
  if (want) {
    recordWantedColour({
      hex: want.dataset.want,
      name: want.dataset.wantName,
      sku: document.querySelector('[data-sku]')?.dataset.sku || null,
    });
    want.textContent = 'Noted';
    want.disabled = true;
  }
}

/** The quick profile needs both answers before it means anything. */
function commitDraft() {
  if (draft.skinType && draft.undertone) {
    saveProfile({ skinType: draft.skinType, undertone: draft.undertone,
                  confidence: '1of1', source: 'colourist-quick' });
  }
  render();
}

// ── Open / close ─────────────────────────────────────────────────────────────

let lastFocus = null;

async function open(e) {
  e?.preventDefault();
  if (!panel) buildShell();
  lastFocus = document.activeElement;
  scrim.hidden = false; panel.hidden = false;
  requestAnimationFrame(() => { scrim.classList.add('in'); panel.classList.add('in'); });
  body.innerHTML = `<p class="kdc-lede">Reading the colour library…</p>`;
  await loadData();
  render();
  panel.querySelector('.kdc-close')?.focus();
}

function close() {
  scrim.classList.remove('in'); panel.classList.remove('in');
  const done = () => { scrim.hidden = true; panel.hidden = true; };
  setTimeout(done, 380);
  lastFocus?.focus?.();
}

// ── Mount ────────────────────────────────────────────────────────────────────

/**
 * A brief explanation on hover, placed straight after the monogram so the
 * stylesheet can show it with an adjacent-sibling rule. Injected here rather
 * than written into the page, so the tip only ever appears where the panel
 * it describes will actually open.
 */
function addHoverTip(trigger) {
  if (trigger.nextElementSibling?.classList.contains('kdc-tip')) return;
  const tip = document.createElement('div');
  tip.className = 'kdc-tip';
  tip.id = 'kdc-tip';
  tip.setAttribute('role', 'tooltip');
  // Takes over from the native title= tooltip, which was removed: that one
  // trailed the cursor and appeared on top of this box.
  trigger.setAttribute('aria-describedby', 'kdc-tip');
  trigger.removeAttribute('title');
  tip.innerHTML = `<b>The Colourist</b>
    <span>Which colours suit your skin tone — and which fabrics the House
    holds in them. Two questions to begin.</span>`;
  trigger.after(tip);
}

function init() {
  const trigger = document.querySelector('.kd-viewer-logo');
  if (!trigger) return;
  injectStyles();
  addHoverTip(trigger);
  trigger.addEventListener('click', open);
  // Stock arrives asynchronously; refresh the panel if it is already open.
  subscribeFabricStock((map) => { stockMap = map; if (panel && !panel.hidden) render(); });
  // Keep the panel's tick in step if the customer picks a swatch directly.
  document.addEventListener('click', (e) => {
    if (panel && !panel.hidden && e.target.closest('.swatch-card')) setTimeout(markActiveFabric, 60);
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}
