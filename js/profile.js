/**
 * ============================================================
 *  profile.js  —  The Client Profile Store
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  Remembers what the House has learned about a visitor — chiefly
 *  their skin type and undertone, which together select one of the
 *  twelve curated colour palettes.
 *
 *  Before this file existed, skinprofile.html computed a visitor's
 *  palette, drew it on screen, and forgot it the moment the tab
 *  closed. Now the result is written here and any page can read it.
 *
 *  WHERE IT IS STORED
 *  -------------------
 *    localStorage['kd_profile']   — this browser, this person.
 *  localStorage is already per-person-per-browser, so no account
 *  and no ID are needed for it to work. The existing analytics
 *  visitor id ('kd_vid', see js/analytics.js) is attached so the
 *  profile can be correlated with traffic data later; no second
 *  identity is minted here.
 *
 *  Signing in is NOT required. If the visitor later logs in, the
 *  same record can be mirrored to Firebase under their uid so it
 *  follows them across devices (see syncTarget below) — but the
 *  profile must never be gated behind registration: asking someone
 *  to make an account before telling them their colours loses them.
 *
 *  HOW TO USE IT
 *  --------------
 *    import { getProfile, saveProfile, onProfile } from './profile.js';
 *
 *    const p = getProfile();                  // null if never completed
 *    if (p) console.log(p.skinType, p.undertone);
 *
 *    saveProfile({ skinType:'tan', undertone:'warm' });   // merges + notifies
 *    onProfile(p => render(p));               // fires on change, incl. other tabs
 *
 *  A NOTE ON WHAT BELONGS HERE
 *  ----------------------------
 *  This holds who the visitor IS. It does not hold what they are
 *  currently looking at. The skin-tone toggle on a product page is
 *  a view preference — changing it must NOT write here, or shopping
 *  for someone else would silently rewrite the visitor's own profile.
 */

const KEY     = 'kd_profile';
const VID_KEY = 'kd_vid';        // created by js/analytics.js — reused, not duplicated
const VERSION = 1;

// ── Safe storage access ───────────────────────────────────────────────────────
// Private windows, blocked site data and some embedded webviews make these throw
// rather than return null, so every access is guarded.
function readRaw() {
  try { return localStorage.getItem(KEY); } catch (_) { return null; }
}
function writeRaw(str) {
  try { localStorage.setItem(KEY, str); return true; } catch (_) { return false; }
}

function visitorId() {
  try { return localStorage.getItem(VID_KEY) || null; } catch (_) { return null; }
}

// ── Validation ────────────────────────────────────────────────────────────────
// A profile read from storage is not trusted: it may have been written by an
// older version of the site, or hand-edited. Anything unrecognised is dropped
// rather than allowed to flow into the colour engines.
export const SKIN_TYPES = ['fair-light', 'medium-olive', 'tan', 'dark-deep'];
export const UNDERTONES = ['cool', 'warm', 'neutral'];

export function isCompleteProfile(p) {
  return !!p && SKIN_TYPES.includes(p.skinType) && UNDERTONES.includes(p.undertone);
}

function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const p = {
    v:          VERSION,
    skinType:   SKIN_TYPES.includes(raw.skinType) ? raw.skinType : null,
    undertone:  UNDERTONES.includes(raw.undertone) ? raw.undertone : null,
    confidence: typeof raw.confidence === 'string' ? raw.confidence : null,
    source:     typeof raw.source === 'string' ? raw.source : 'unknown',
    setAt:      typeof raw.setAt === 'string' ? raw.setAt : null,
    vid:        typeof raw.vid === 'string' ? raw.vid : null,
    shortlist:  Array.isArray(raw.shortlist) ? raw.shortlist.filter(x => typeof x === 'string').slice(0, 60) : [],
    wants:      Array.isArray(raw.wants)     ? raw.wants.filter(w => w && typeof w.hex === 'string').slice(0, 60) : [],
  };
  return (p.skinType || p.undertone || p.shortlist.length || p.wants.length) ? p : null;
}

// ── Read ──────────────────────────────────────────────────────────────────────
let cache;            // undefined = not read yet, null = read and absent
export function getProfile() {
  if (cache !== undefined) return cache;
  const raw = readRaw();
  if (!raw) return (cache = null);
  try { cache = sanitize(JSON.parse(raw)); }
  catch (_) { cache = null; }
  return cache;
}

// ── Write ─────────────────────────────────────────────────────────────────────
/**
 * Merges `patch` into the stored profile and notifies subscribers.
 * Returns the saved profile, or null if storage was unavailable.
 */
export function saveProfile(patch) {
  const next = sanitize({ ...(getProfile() || {}), ...patch });
  // Nulling out the last thing the record held is a clear, not a no-op. It has
  // to be treated as one: sanitize() drops an empty profile, and simply
  // returning here left the stale record in storage AND in `cache`, so the
  // Colourist's "Change" button appeared to do nothing at all.
  if (!next) { clearProfile(); return null; }
  next.setAt = new Date().toISOString();
  next.vid   = next.vid || visitorId();
  const ok = writeRaw(JSON.stringify(next));
  cache = next;                       // held in memory even if storage refused,
  notify(next);                       // so the session still behaves correctly
  if (ok && typeof window !== 'undefined' && typeof window.kdTrack === 'function') {
    window.kdTrack('profile_saved', { skin_type: next.skinType, undertone: next.undertone, source: next.source });
  }
  return next;
}

export function clearProfile() {
  try { localStorage.removeItem(KEY); } catch (_) {}
  cache = null;
  notify(null);
}

// ── Shortlist ─────────────────────────────────────────────────────────────────
// Designs the visitor has set aside during a consultation, newest first.
export function toggleShortlist(code) {
  const p    = getProfile();
  const list = p?.shortlist ? [...p.shortlist] : [];
  const at   = list.indexOf(code);
  if (at === -1) list.unshift(code); else list.splice(at, 1);
  saveProfile({ shortlist: list });
  return at === -1;                   // true = added
}
export function inShortlist(code) {
  return (getProfile()?.shortlist || []).includes(code);
}

// ── Wanted colours ────────────────────────────────────────────────────────────
// A colour the palette recommends that the House does not stock yet. Recording
// it turns a gap in the catalogue into a ranked signal of what to buy next.
export function recordWantedColour({ hex, name, sku }) {
  const wants = [...(getProfile()?.wants || [])];
  if (!wants.some(w => w.hex === hex)) {
    wants.unshift({ hex, name, sku: sku || null, at: new Date().toISOString() });
  }
  saveProfile({ wants });
  if (typeof window !== 'undefined' && typeof window.kdTrack === 'function') {
    window.kdTrack('colour_wanted', { hex, colour: name, sku: sku || null });
  }
}

// ── Change notification ───────────────────────────────────────────────────────
const subs = new Set();
function notify(p) { for (const cb of subs) { try { cb(p); } catch (_) {} } }

/** Subscribe to profile changes. Fires immediately with the current value. */
export function onProfile(cb) {
  subs.add(cb);
  try { cb(getProfile()); } catch (_) {}
  return () => subs.delete(cb);
}

// Another tab completing the profile should update this one.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    cache = undefined;
    notify(getProfile());
  });
}
