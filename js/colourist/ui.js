/**
 * ============================================================
 *  colourist/ui.js  —  The House Colourist panel
 * ============================================================
 *
 *  A drawer that opens from the KD monogram beside the search glass.
 *  It is deliberately NOT a chat window: a colour advisor that answers
 *  in words is useless, because nobody can picture "Sapphire" from a
 *  description. Everything here is shown, and every recommendation can
 *  be put onto the garment in one click.
 *
 *  It drives the page's existing fabric machinery rather than
 *  duplicating it — "See it on the garment" finds the real swatch card
 *  and clicks it, so the 3D model, the price and the cart all behave
 *  exactly as if the customer had found that swatch themselves.
 *
 *  Styling follows the page: white theme, Times New Roman, the maroon
 *  used for "King Dhorajiya" and the gold used for drape tags.
 */

import { getProfile, saveProfile, recordWantedColour, isCompleteProfile } from '../profile.js';

const MAROON = '#800000';

const SKIN_CHOICES = [
  { id: 'fair-light',   label: 'Fair / Light',   swatch: '#E8D5C4' },
  { id: 'medium-olive', label: 'Medium / Olive', swatch: '#C4956A' },
  { id: 'tan',          label: 'Tan',            swatch: '#9B7250' },
  { id: 'dark-deep',    label: 'Dark / Deep',    swatch: '#4A2E1E' },
];

const UNDERTONE_CHOICES = [
  { id: 'cool',    label: 'Silver' },
  { id: 'warm',    label: 'Gold' },
  { id: 'neutral', label: 'Both equally' },
];

const SKIN_LABEL = Object.fromEntries(SKIN_CHOICES.map((s) => [s.id, s.label]));

// Named PANEL_CSS, not CSS: a module-level `CSS` would shadow the global
// CSS object and break CSS.escape() in showOnGarment().
const PANEL_CSS = `
  /* Barely-there scrim: it exists to catch a click-outside, not to dim the
     page. Blurring or darkening here would hide the very garment the
     customer is choosing a colour for. */
  .kdc-scrim {
    position: fixed; inset: 0; z-index: 2900;
    background: rgba(20,18,16,0.04);
    opacity: 0; transition: opacity 0.35s ease;
  }
  .kdc-scrim.in { opacity: 1; }
  .kdc-panel {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 2901;
    width: min(580px, 100%);
    display: flex; flex-direction: column;
    /* Lightly translucent, so the garment stays present behind the advice.
       The blur keeps the text readable over whatever it happens to cover;
       the flat colour is the fallback where backdrop-filter is unsupported. */
    background: #e2e0dd;
    background: rgba(226,224,221,0.88);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
    border-left: 1px solid rgba(0,0,0,0.10);
    box-shadow: -18px 0 50px rgba(0,0,0,0.16);
    font-family: "Times New Roman", Times, serif;
    color: #1a1a1a;
    transform: translateX(100%); transition: transform 0.4s cubic-bezier(0.22,0.9,0.3,1);
  }
  .kdc-panel.in { transform: none; }
  .kdc-panel[hidden], .kdc-scrim[hidden] { display: none; }

  .kdc-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.9rem 1.9rem 1.4rem; border-bottom: 1px solid rgba(0,0,0,0.09);
    background: rgba(255,255,255,0.35);
  }
  .kdc-title { font-size: 1.8rem; letter-spacing: 5px; text-transform: uppercase; color: ${MAROON}; margin: 0; }
  .kdc-close {
    background: none; border: 1px solid rgba(0,0,0,0.18); color: #555;
    width: 2.9rem; height: 2.9rem; border-radius: 50%; font-size: 1.75rem; line-height: 1; cursor: pointer;
  }
  .kdc-close:hover { border-color: #1a1a1a; color: #1a1a1a; }

  .kdc-body { flex: 1; overflow-y: auto; padding: 1.8rem 1.9rem 2.8rem; }
  .kdc-sec { margin-bottom: 2.2rem; }
  .kdc-sec-title {
    font-size: 1.32rem; letter-spacing: 4px; text-transform: uppercase;
    color: #9a8f80; margin: 0 0 1.1rem;
  }
  .kdc-lede { font-size: 1.55rem; line-height: 1.7; color: #4a4a4a; margin: 0 0 1.3rem; }

  /* ── identity ── */
  .kdc-ident { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.6rem; }
  .kdc-orb { width: 3.4rem; height: 3.4rem; border-radius: 50%; border: 1px solid rgba(0,0,0,0.12); flex: none; }
  .kdc-ident-text b { display: block; font-weight: normal; font-size: 1.65rem; letter-spacing: 2px; }
  .kdc-ident-text span { display: block; font-size: 1.35rem; letter-spacing: 2px; color: #8a8378; text-transform: uppercase; }
  .kdc-change {
    margin-left: auto; background: none; border: none; cursor: pointer;
    font-family: inherit; font-size: 1.28rem; letter-spacing: 2px; color: ${MAROON};
    text-transform: uppercase; text-decoration: underline; text-underline-offset: 3px; padding: 0;
  }

  /* ── the palette, laid out as the Skin Tone Profile lays it out ── */
  .kdc-pal-head { display: flex; align-items: center; gap: 0.6rem; margin: 1.6rem 0 0.8rem; }
  .kdc-pal-head:first-child { margin-top: 0; }
  .kdc-dot { width: 0.8rem; height: 0.8rem; border-radius: 50%; flex: none; }
  .kdc-dot--best { background: #4CAF50; }
  .kdc-dot--ha   { background: #64B5F6; }
  .kdc-sec-label {
    font-family: "Times New Roman", Times, serif; font-size: 1.32rem;
    letter-spacing: 3px; text-transform: uppercase; color: #111;
  }
  .kdc-pal-divider { height: 1px; background: rgba(0,0,0,0.12); margin: 1.8rem 0 0.4rem; }
  .kdc-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.4rem, 1fr)); gap: 1.2rem 0.9rem; }
  /* A combination label carries two colour names and two hex codes, so it
     gets roughly twice the width — otherwise every one wraps to three lines. */
  .kdc-row--combo { grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr)); }

  .kdc-sw, .kdc-cb { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; }
  .kdc-sw-box {
    width: 100%; height: 3.1rem; border-radius: 2px; border: 1px solid rgba(0,0,0,0.14);
  }
  .kdc-cb-box {
    width: 100%; height: 3.1rem; display: flex; border-radius: 2px;
    border: 1px solid rgba(0,0,0,0.14); overflow: hidden;
  }
  .kdc-cb-half { flex: 1; }
  .kdc-sw-name {
    font-family: "Times New Roman", Times, serif; font-size: 1.18rem; letter-spacing: 0.8px;
    text-transform: uppercase; color: #111; text-align: center; line-height: 1.3;
  }
  .kdc-sw-hex {
    font-family: "Courier New", monospace; font-size: 1.08rem; color: #6a6258;
    letter-spacing: 0.5px; text-align: center; line-height: 1.2;
  }
  /* What the House can actually supply for that colour — the Colourist's own
     addition, kept visually subordinate to the palette itself. */
  .kdc-held {
    font-family: "Times New Roman", Times, serif; font-size: 1.05rem; letter-spacing: 0.5px;
    color: #2a6e2a; text-align: center; line-height: 1.25;
  }
  .kdc-held--no { color: #b03030; }
  .kdc-held--near { color: #8a6a00; }

  /* ── fabric picks ── */
  .kdc-pick {
    display: flex; gap: 0.95rem; align-items: center; width: 100%;
    padding: 1rem 0; border: none; border-bottom: 1px solid rgba(0,0,0,0.07);
    background: none; text-align: left; cursor: pointer; font-family: inherit;
  }
  .kdc-pick:hover { background: rgba(128,0,0,0.035); }
  .kdc-pick img {
    width: 4.6rem; height: 4.6rem; object-fit: cover; border-radius: 2px;
    border: 1px solid rgba(0,0,0,0.12); flex: none; background: #eee;
  }
  .kdc-pick-txt { flex: 1; min-width: 0; }
  .kdc-pick-txt b { display: block; font-weight: normal; font-size: 1.58rem; letter-spacing: 1.5px; }
  .kdc-sub { color: #9a9288; font-size: 1.26rem; }
  .kdc-why { display: block; font-size: 1.36rem; letter-spacing: 0.4px; color: #7a7266; line-height: 1.45; margin-top: 0.2rem; }
  .kdc-dot { display: inline-block; width: 0.82rem; height: 0.82rem; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); vertical-align: baseline; margin-right: 0.3rem; }
  .kdc-go { font-size: 1.28rem; letter-spacing: 2px; color: ${MAROON}; text-transform: uppercase; white-space: nowrap; }
  .kdc-pick.on { background: rgba(128,0,0,0.06); }
  .kdc-pick.on .kdc-go::after { content: ' ✓'; }

  /* ── pairings ── */
  .kdc-pair { display: flex; gap: 0.9rem; align-items: center; padding: 0.7rem 0; border-bottom: 1px solid rgba(0,0,0,0.07); }
  .kdc-pair-sw { display: flex; flex: none; border: 1px solid rgba(0,0,0,0.12); border-radius: 2px; overflow: hidden; }
  .kdc-pair-sw.kdc-pair-part { border-color: #c05050; border-style: dashed; }
  .kdc-pair-sw i { display: block; width: 2.3rem; height: 4.6rem; }
  .kdc-pair-txt { flex: 1; font-size: 1.43rem; letter-spacing: 1px; line-height: 1.5; }
  .kdc-pair-txt span { display: block; font-size: 1.28rem; color: #7a7266; }

  /* ── gaps ── */
  .kdc-gap { display: flex; align-items: center; gap: 0.8rem; padding: 0.65rem 0; border-bottom: 1px solid rgba(0,0,0,0.07); }
  .kdc-gap i { width: 2.8rem; height: 2.8rem; border-radius: 2px; border: 1px solid rgba(0,0,0,0.12); flex: none; }
  .kdc-gap-txt { flex: 1; font-size: 1.45rem; letter-spacing: 1px; }
  .kdc-gap-txt span { display: block; font-size: 1.28rem; color: #8a8378; }
  .kdc-notify {
    background: none; border: 1px solid rgba(128,0,0,0.35); color: ${MAROON};
    font-family: inherit; font-size: 1.28rem; letter-spacing: 1.5px; text-transform: uppercase;
    padding: 0.5rem 0.95rem; border-radius: 2px; cursor: pointer; white-space: nowrap;
  }
  .kdc-notify:hover { background: rgba(128,0,0,0.07); }
  .kdc-notify[disabled] { opacity: 0.55; cursor: default; border-style: dashed; }

  /* ── quick profile ── */
  .kdc-q { margin-bottom: 1.8rem; }
  .kdc-q-ask { font-size: 1.5rem; line-height: 1.6; color: #4a4a4a; margin: 0 0 0.9rem; }
  .kdc-skins { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
  .kdc-skin {
    background: none; border: 1px solid rgba(0,0,0,0.12); border-radius: 2px;
    padding: 0.72rem 0.35rem; cursor: pointer; font-family: inherit;
  }
  .kdc-skin i { display: block; height: 2.9rem; border-radius: 2px; margin-bottom: 0.4rem; }
  .kdc-skin span { font-size: 1.28rem; letter-spacing: 0.5px; color: #6a6258; line-height: 1.2; display: block; }
  .kdc-skin:hover { border-color: #999; }
  .kdc-skin.on { border-color: ${MAROON}; background: rgba(128,0,0,0.05); }
  .kdc-tones { display: flex; gap: 0.5rem; }
  .kdc-tone {
    flex: 1; background: none; border: 1px solid rgba(0,0,0,0.12); border-radius: 2px;
    padding: 0.85rem 0.4rem; cursor: pointer; font-family: inherit;
    font-size: 1.36rem; letter-spacing: 1.5px; color: #4a4a4a;
  }
  .kdc-tone:hover { border-color: #999; }
  .kdc-tone.on { border-color: ${MAROON}; background: rgba(128,0,0,0.05); color: ${MAROON}; }
  .kdc-full {
    display: inline-block; margin-top: 1.6rem; font-size: 1.36rem; letter-spacing: 2px;
    color: ${MAROON}; text-transform: uppercase; text-underline-offset: 4px;
  }
  .kdc-note { font-size: 1.3rem; line-height: 1.6; color: #8a8378; margin: 1.2rem 0 0; }

  /* ── The monogram trigger, under the search glass ──
     Lives here rather than in each product page's <style>, so all 200+ pages
     share one definition. The mark is a transparent PNG used as a mask, so
     the glyph itself takes the background colour. */
  .kd-viewer-logo {
    position: absolute;
    top: 4.9rem;              /* 1.2rem top + 1.9rem search icon + 1.8rem gap */
    right: 1.2rem;
    z-index: 6;
    display: block;
    width: 1.9rem;
    height: 1.9rem;
    -webkit-mask: url("images/KD_monogram_mark.webp") center / contain no-repeat;
    mask: url("images/KD_monogram_mark.webp") center / contain no-repeat;
    background-color: #14532d;   /* dark green */
    opacity: 1;
    transition: transform 0.2s;
  }
  .kd-viewer-logo:hover, .kd-viewer-logo:focus-visible {
    transform: scale(1.05); outline: none;
  }
  @media (max-width: 768px) {
    .kd-viewer-logo { width: 1.6rem; height: 1.6rem; top: 4.4rem; }
  }

  /* ── Hover tip on the monogram ──
     Sits immediately after .kd-viewer-logo in the DOM, so it needs no
     JavaScript listeners: the adjacent-sibling selector does the work.
     It is injected by the Colourist, so it never promises a panel that
     is not actually there. */
  .kdc-tip {
    position: absolute;
    top: 4.9rem; right: 3.9rem;        /* level with the monogram, just left of it */
    z-index: 7; width: 23rem;
    padding: 1.15rem 1.45rem;
    background: rgba(226,224,221,0.88);
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    border: 1px solid ${MAROON};
    border-radius: 3px;
    box-shadow: 0 8px 26px rgba(0,0,0,0.18);
    font-family: "Times New Roman", Times, serif;
    color: #3a3a3a;
    opacity: 0; transform: translateX(6px);
    transition: opacity 0.14s ease, transform 0.14s ease;
    pointer-events: none;
  }
  .kdc-tip::after {                     /* small arrow toward the monogram */
    content: ''; position: absolute; top: 1.15rem; right: -0.42rem;
    width: 0.8rem; height: 0.8rem; transform: rotate(45deg);
    background: rgba(226,224,221,0.88);
    border-right: 1px solid ${MAROON};
    border-top: 1px solid ${MAROON};
  }
  .kdc-tip b {
    display: block; font-weight: normal; font-size: 1.42rem;
    letter-spacing: 3px; text-transform: uppercase;
    color: ${MAROON}; margin-bottom: 0.45rem;
  }
  .kdc-tip span { display: block; font-size: 1.34rem; line-height: 1.55; letter-spacing: 0.4px; }
  .kd-viewer-logo:hover + .kdc-tip,
  .kd-viewer-logo:focus-visible + .kdc-tip { opacity: 1; transform: none; }

  /* Touch devices have no hover; a tap opens the panel itself. */
  @media (hover: none) { .kdc-tip { display: none; } }
  @media (prefers-reduced-motion: reduce) { .kdc-tip { transition: none; } }

  @media (max-width: 768px) {
    .kdc-tip { top: 4.4rem; right: 3.4rem; }
    .kdc-panel {
      top: auto; left: 0; width: 100%; height: 82vh;
      border-left: none; border-top: 1px solid rgba(0,0,0,0.12);
      border-radius: 10px 10px 0 0;
      transform: translateY(100%);
    }
    .kdc-panel.in { transform: none; }
    .kdc-body { padding: 1.2rem 1.15rem 2rem; }
  }
  @media (prefers-reduced-motion: reduce) {
    .kdc-panel, .kdc-scrim { transition: none; }
  }
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

export function injectStyles() {
  if (document.getElementById('kdc-style')) return;
  const el = document.createElement('style');
  el.id = 'kdc-style';
  el.textContent = PANEL_CSS;
  document.head.appendChild(el);
}

/**
 * Puts a fabric onto the garment by driving the page's own swatch list:
 * opens the accordions that contain it, clicks the real card, then closes
 * the full-screen fabric preview that the click opens.
 * Returns false if the page has no such swatch.
 */
export function showOnGarment(fabricId) {
  const card = document.querySelector(`.swatch-card[data-fabric-id="${CSS.escape(fabricId)}"]`);
  if (!card) return false;

  const list = document.querySelector('.fabric-list');
  const cat  = card.closest('.fabric-category');
  const sub  = card.closest('.fabric-subcategory');
  if (cat) {
    list?.querySelectorAll('.fabric-category').forEach((c) => c.classList.remove('open'));
    cat.classList.add('open');
    list?.classList.add('has-open');
  }
  if (sub) {
    sub.closest('.swatch-grid')?.querySelectorAll('.fabric-subcategory').forEach((s) => s.classList.remove('open'));
    sub.classList.add('open');
  }

  card.click();
  // The page opens a full-screen fabric preview on any swatch click; the
  // customer asked to see it on the garment, so send them back to the 3D view.
  setTimeout(() => document.getElementById('fabric-preview-back')?.click(), 260);
  card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  return true;
}

// ── Renderers ────────────────────────────────────────────────────────────────

function quickProfileHtml(draft) {
  return `
    <p class="kdc-lede">Two questions, and the House can tell you which of its
      colours are yours.</p>
    <div class="kdc-q">
      <p class="kdc-q-ask">1 &nbsp;· &nbsp;Which is closest to your skin?</p>
      <div class="kdc-skins">
        ${SKIN_CHOICES.map((s) => `
          <button class="kdc-skin${draft.skinType === s.id ? ' on' : ''}" data-skin="${s.id}" type="button">
            <i style="background:${s.swatch}"></i><span>${esc(s.label)}</span>
          </button>`).join('')}
      </div>
    </div>
    <div class="kdc-q">
      <p class="kdc-q-ask">2 &nbsp;· &nbsp;Which metal tends to suit you better?</p>
      <div class="kdc-tones">
        ${UNDERTONE_CHOICES.map((u) => `
          <button class="kdc-tone${draft.undertone === u.id ? ' on' : ''}" data-tone="${u.id}" type="button">${esc(u.label)}</button>`).join('')}
      </div>
    </div>
    <a class="kdc-full" href="skinprofile.html">Take the full profile →</a>
    <p class="kdc-note">The full profile runs three tests instead of one and is
      the more reliable reading. This shortcut is enough to begin.</p>`;
}

// The palette is shown exactly as the Skin Tone Profile shows it: the same
// four sections in the same order, the same headings, the same green/blue
// section markers, and every colour with its hex. The Colourist's own
// contribution — what the House actually holds for each colour — is layered
// underneath rather than replacing any of it.
const SEC_BEST = 'best', SEC_HA = 'ha';

function singleHtml(c, held) {
  return `<div class="kdc-sw">
      <div class="kdc-sw-box" style="background:${c.c}"></div>
      <span class="kdc-sw-name">${esc(c.n)}</span>
      <span class="kdc-sw-hex">${c.c.toUpperCase()}</span>
      ${held}
    </div>`;
}

function comboHtml(c, held) {
  return `<div class="kdc-cb">
      <div class="kdc-cb-box">
        <div class="kdc-cb-half" style="background:${c.a}"></div>
        <div class="kdc-cb-half" style="background:${c.b}"></div>
      </div>
      <span class="kdc-sw-name">${esc(c.al)} · ${esc(c.bl)}</span>
      <span class="kdc-sw-hex">${c.a.toUpperCase()} · ${c.b.toUpperCase()}</span>
      ${held}
    </div>`;
}

function secHead(kind, label) {
  return `<div class="kdc-pal-head"><span class="kdc-dot kdc-dot--${kind}"></span><span class="kdc-sec-label">${label}</span></div>`;
}

/** The one line under a colour saying what the House can supply for it.
 *  Uses the same reach and the same words as the "In the House now" list, so
 *  a colour cannot read "not held" here while a fabric for it is offered
 *  below. Green = close enough to call it that colour; amber = only a related
 *  tone; red = nothing within reach at all. */
function heldLine(entry) {
  const m = entry?.matches?.[0];
  if (!m) return `<span class="kdc-held kdc-held--no">not held</span>`;
  return `<span class="kdc-held${entry.served ? '' : ' kdc-held--near'}">${esc(m.label)} · ΔE ${m.dE.toFixed(1)}</span>`;
}

function pairHeldLine(pr) {
  // Same three tiers as a single colour, so the two readings never disagree.
  const one = (h) => (h.swatch ? esc(h.swatch.label) : 'not held');
  const cls = (!pr.a.swatch || !pr.b.swatch) ? ' kdc-held--no'
            : (pr.a.held && pr.b.held) ? '' : ' kdc-held--near';
  return `<span class="kdc-held${cls}">${one(pr.a)} · ${one(pr.b)}</span>`;
}

function resultHtml(rec, profile, opts) {
  const p = rec.palette;
  const orb = SKIN_CHOICES.find((s) => s.id === profile.skinType)?.swatch || '#ccc';

  const ident = `
    <div class="kdc-ident">
      <span class="kdc-orb" style="background:${orb}"></span>
      <span class="kdc-ident-text">
        <b>${esc(SKIN_LABEL[profile.skinType] || '')}</b>
        <span>${esc(profile.undertone)} undertone</span>
      </span>
      <button class="kdc-change" type="button" data-act="reset">Change</button>
    </div>`;

  const byHex = Object.fromEntries(rec.colours.map((c) => [c.hex, c]));
  const P = rec.palette;
  const palette = `
    <div class="kdc-sec kdc-pal">
      ${secHead(SEC_BEST, 'Best — Single Colours')}
      <div class="kdc-row">${P.best.map((c) => singleHtml(c, heldLine(byHex[c.c]))).join('')}</div>

      ${secHead(SEC_HA, 'Highly Acceptable — Single Colours')}
      <div class="kdc-row">${P.acceptable.map((c) => singleHtml(c, heldLine(byHex[c.c]))).join('')}</div>

      <div class="kdc-pal-divider"></div>

      ${secHead(SEC_BEST, 'Best — Combinations')}
      <div class="kdc-row kdc-row--combo">${P.bestCombos.map((c, i) => comboHtml(c, pairHeldLine(rec.pairs[i]))).join('')}</div>

      ${secHead(SEC_HA, 'Highly Acceptable — Combinations')}
      <div class="kdc-row kdc-row--combo">${P.haCombos.map((c, i) => comboHtml(c, pairHeldLine(rec.haPairs[i]))).join('')}</div>
    </div>`;

  const picks = rec.picks.length ? `
    <div class="kdc-sec">
      <p class="kdc-sec-title">In the House now</p>
      ${rec.picks.slice(0, 8).map((f) => `
        <button class="kdc-pick" type="button" data-fabric="${esc(f.id)}">
          <img src="${esc(f.image)}" alt="" loading="lazy">
          <span class="kdc-pick-txt">
            <b>${esc(f.typeLabel || f.label)}</b>
            <span class="kdc-why">
              <i class="kdc-dot" style="background:${f.forColour.hex}"></i>${esc(f.forColour.name)} — ${esc(f.quality.label)}${f.patterned ? ', patterned' : ''}
            </span>
            <span class="kdc-why kdc-sub">${esc(f.label)}${f.drape ? ` · ${esc(f.drape)} drape` : ''}</span>
          </span>
          <span class="kdc-go">See it</span>
        </button>`).join('')}
    </div>` : `
    <div class="kdc-sec">
      <p class="kdc-sec-title">In the House now</p>
      <p class="kdc-lede">None of the fabrics currently held sit close enough to
        your colours for the House to recommend one honestly.</p>
    </div>`;

  const pairs = '';

  const gaps = rec.gaps.length ? `
    <div class="kdc-sec">
      <p class="kdc-sec-title">Not held yet</p>
      ${rec.gaps.map((g) => `
        <div class="kdc-gap">
          <i style="background:${g.hex}"></i>
          <span class="kdc-gap-txt">${esc(g.name)}
            <span>one of your strongest colours</span></span>
          <button class="kdc-notify" type="button" data-want="${esc(g.hex)}" data-want-name="${esc(g.name)}">Tell me</button>
        </div>`).join('')}
      <p class="kdc-note">The House would rather say what it does not hold than
        recommend something that is merely close.</p>
    </div>` : '';

  return ident + palette + picks + pairs + gaps;
}

export { quickProfileHtml, resultHtml, SKIN_CHOICES, UNDERTONE_CHOICES };
