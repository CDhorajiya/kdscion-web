/**
 * ============================================================
 *  fabrics.js  —  Fabric Catalogue & Visibility System
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  This is the single source of truth for ALL available fabrics
 *  on the KD Scion website. It does three things:
 *
 *    1. STORES the fabric catalogue — every fabric type (Cotton,
 *       Linen, Wool, Silk…), its sub-collections (Plain, Dobies…),
 *       and individual swatches (swatch images + IDs).
 *
 *    2. MANAGES VISIBILITY — the admin dashboard can toggle which
 *       fabric types, collections, or individual swatches are shown
 *       per-product (or globally). These preferences are saved to
 *       the browser's localStorage.
 *
 *    3. RENDERS the fabric selector UI — the `renderFabricList`
 *       function at the bottom builds the HTML accordion (wreath
 *       cards → collection headers → swatch cards) that appears in
 *       the product page's right panel.
 *
 *  DATA STRUCTURE OVERVIEW
 *  ------------------------
 *  FABRIC_CATALOG  =  Array of FabricType
 *
 *  FabricType {
 *    id:          unique key, e.g. 'cotton'
 *    label:       display name, e.g. '100% Cotton'
 *    wreaths:     array of wreath image paths shown in the accordion header
 *    collections: array of FabricCollection
 *  }
 *
 *  FabricCollection {
 *    id:       e.g. 'plain'
 *    label:    e.g. 'Plain Collection'
 *    swatches: array of Swatch
 *  }
 *
 *  Swatch {
 *    id:    unique key used everywhere, e.g. 'cotton-1'
 *    label: display name
 *    image: path to the swatch square image
 *  }
 *
 *  HOW ADMIN OVERRIDES WORK
 *  -------------------------
 *  The admin dashboard can:
 *    - Toggle a fabric TYPE on/off per product   (key: "p:SKU:t:typeId")
 *    - Toggle a COLLECTION on/off per product    (key: "p:SKU:c:typeId:collId")
 *    - Toggle a SWATCH on/off globally           (key: "s:swatchId")
 *    - Add EXTRA swatches to a collection        (stored in extras / ttExtras)
 *  All overrides are stored in Firebase (fabricSettings/live) and cached as JSON
 *  in localStorage under the key 'kd_fabrics' — see "Live sync with Firebase" below.
 */

import { FIREBASE_CONFIG } from './firebase-config.js';

// ── localStorage key where the overrides are cached (source of truth: Firebase) ──
const LS_KEY = 'kd_fabrics';

// ── Material defaults by fabric type ──────────────────────────────────────────
// Real-time PBR values applied to the 3D model when a swatch of this type is
// selected — separate from `opacity`, which already existed per-swatch.
//   roughness: 0 = mirror-like, 1 = fully matte. Cloth is never 0.
//   sheen:     0 = none, up to 1 = strong grazing-angle highlight (napped
//              fabrics like wool catch light at edges; silk's sheen comes
//              from its low roughness instead, so its sheen factor stays low).
// A swatch can override either value individually (see Swatch.roughness /
// Swatch.sheen below); the admin dashboard can override per-swatch too (see
// overrides.swatchRoughness), same pattern as overrides.swatchOpacity.
export const TYPE_MATERIAL_DEFAULTS = {
  'cotton':        { roughness: 0.75, sheen: 0    },
  'linen':         { roughness: 0.85, sheen: 0    },
  'wool':          { roughness: 0.90, sheen: 0.35 },
  'silk':          { roughness: 0.25, sheen: 0.10 },
  'cotton-linen':  { roughness: 0.80, sheen: 0    },
  'cotton-wool':   { roughness: 0.85, sheen: 0.15 },
  'leather':       { roughness: 0.45, sheen: 0    },
};
const FALLBACK_MATERIAL_DEFAULTS = { roughness: 0.75, sheen: 0 };

// ── Drape types ───────────────────────────────────────────────────────────────
// Which sphere-drop simulation a swatch uses in the product page's Fabric Drape
// window. Set per swatch via Swatch.drape (built-in or admin-added swatches), or
// overridden from the admin dashboard in overrides.swatchDrape.
export const DRAPE_TYPES = ['crisp', 'medium', 'flowing', 'heavy'];

// ── Main Design catalog ───────────────────────────────────────────────────────
// Used for the "Main Design" zone on both single-tone and two-tone product pages.
// Each fabric type has one or more collections; each collection has swatches.
// Empty swatch arrays [] mean the collection exists but no swatches have been
// uploaded yet — the admin can add them from the dashboard.

export const FABRIC_CATALOG = [
  {
    id: 'cotton',
    label: '100% Cotton',
    wreaths: ['images/Cotton Wreath.webp'],  // Decorative image shown in the card header
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-1', label: 'Cotton 1', image: 'images/cotton-1.webp', opacity: 0.7, drape: 'crisp' },
          { id: 'cotton-2', label: 'Cotton 2', image: 'images/cotton-2.webp', drape: 'medium' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
  {
    id: 'linen',
    label: '100% Linen',
    wreaths: ['images/Linen Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'linen-1', label: 'Linen 1', image: 'images/linen-1.webp', drape: 'crisp' },
          { id: 'linen-2', label: 'Linen 2', image: 'images/linen-2.webp', drape: 'crisp' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
  {
    id: 'wool',
    label: '100% Wool',
    wreaths: ['images/Wool Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'wool-1', label: 'Wool 1',  image: 'images/wool-1.webp', drape: 'heavy' },
          { id: 'wool-2', label: 'Wool 2',  image: 'images/woolen fabric.webp', drape: 'heavy' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
      { id: 'tweed',  label: 'Tweed Collection',   swatches: [] },
    ],
  },
  {
    id: 'silk',
    label: '100% Silk',
    wreaths: ['images/Silk Wreath.webp'],
    collections: [
      { id: 'plain',  label: 'Plain Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection', swatches: [] },
      { id: 'print',  label: 'Print Collection',  swatches: [] },
      { id: 'satin',  label: 'Satin Collection',  swatches: [] },
    ],
  },
  {
    id: 'cotton-linen',
    label: 'Cotton Linen Blend',
    // Blends show two wreath images side by side in the card header.
    wreaths: ['images/Cotton Wreath.webp', 'images/Linen Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-linen-1', label: 'Blend 1', image: 'images/cotton-linen blend-1.webp', drape: 'flowing' },
          { id: 'cotton-linen-2', label: 'Blend 2', image: 'images/cotton-linen blend-2.webp', drape: 'flowing' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
  {
    id: 'cotton-wool',
    label: 'Cotton Wool Blend',
    wreaths: ['images/Cotton Wreath.webp', 'images/Wool Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'cotton-wool-1', label: 'Blend 1', image: 'images/wool-blend-2.avif', drape: 'flowing' },
        ],
      },
      { id: 'dobies', label: 'Dobies Collection',  swatches: [] },
      { id: 'lining', label: 'Lining Collection',  swatches: [] },
      { id: 'chex',   label: 'Chex Collection',    swatches: [] },
      { id: 'print',  label: 'Print Collection',   swatches: [] },
    ],
  },
  {
    id: 'leather',
    label: 'Premium Leather',
    wreaths: ['images/Leather Wreath.webp'],
    collections: [
      { id: 'plain',  label: 'Plain Collection',  swatches: [] },
      { id: 'suede',  label: 'Suede Collection',  swatches: [] },
      { id: 'patent', label: 'Patent Collection', swatches: [] },
    ],
  },
];

// ── Two Tone catalog ──────────────────────────────────────────────────────────
// A SEPARATE, SIMPLER catalogue used only for the "Two Tone" zone on two-tone
// product pages. It has fewer fabric types (no blends) and just one Plain
// collection per type, because contrast accents look best in solid fabrics.
//
// Why separate? The main design zone allows complex collections (prints, checks,
// etc.) and per-product visibility rules. The two-tone zone keeps it simple:
// one swatch per type, toggled globally not per-product.

export const TWOTONE_CATALOG = [
  {
    id: 'cotton',
    label: '100% Cotton',
    wreaths: ['images/Cotton Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          // tt- prefix distinguishes two-tone swatch IDs from main design swatch IDs.
          { id: 'tt-cotton-1', label: 'tt-cotton-1', image: 'images/tt-cotton-1.webp' },
        ],
      },
    ],
  },
  {
    id: 'linen',
    label: '100% Linen',
    wreaths: ['images/Linen Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-linen-1', label: 'tt-linen-1', image: 'images/tt-linen-1.webp' },
        ],
      },
    ],
  },
  {
    id: 'wool',
    label: '100% Wool',
    wreaths: ['images/Wool Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-wool-1', label: 'tt-wool-1', image: 'images/tt-wool-1.webp' },
        ],
      },
    ],
  },
  {
    id: 'silk',
    label: '100% Silk',
    wreaths: ['images/Silk Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-silk-1', label: 'tt-silk-1', image: 'images/tt-silk-1.webp' },
        ],
      },
    ],
  },
  {
    id: 'leather',
    label: 'Premium Leather',
    wreaths: ['images/Leather Wreath.webp'],
    collections: [
      {
        id: 'plain',
        label: 'Plain Collection',
        swatches: [
          { id: 'tt-leather-1', label: 'tt-leather-1', image: 'images/tt-leather-1.webp' },
        ],
      },
    ],
  },
];

// ── localStorage helpers ──────────────────────────────────────────────────────
// The admin dashboard saves visibility toggles and extra swatches to localStorage.
// These helpers read and write that data.

/**
 * loadOverrides()  [private]
 * --------------------------
 * Reads the raw overrides object from localStorage.
 * Returns an empty object {} if nothing has been saved yet, or if the
 * stored JSON is corrupted.
 *
 * Shape of the returned object:
 * {
 *   visibility: {
 *     'p:KD-P60-FSSD:t:cotton': false,   // hide cotton for product p60
 *     's:linen-1': false,                  // hide linen-1 globally
 *   },
 *   extras: {
 *     'cotton:plain': [{ id, label, image }],   // admin-added main swatches
 *   },
 *   ttExtras: {
 *     'cotton': [{ id, label, image }],          // admin-added two-tone swatches
 *   }
 * }
 */
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (_) { return {}; }
}

/**
 * saveFabricOverrides(overrides)
 * -------------------------------
 * Saves the full overrides object back to localStorage.
 * Called by the admin dashboard whenever a toggle is changed or a
 * new swatch is added.
 * @param {object} overrides - The complete overrides object to persist.
 */
export function saveFabricOverrides(overrides) {
  const clean = toStorable(overrides);
  localStorage.setItem(LS_KEY, JSON.stringify(clean));
  appliedJson = stableStringify(normalizeOverrides(clean));
  queueRemoteWrite(clean);
}

// ── Live sync with Firebase ───────────────────────────────────────────────────
// Admin settings (visibility, added swatches, opacity, drape) live in the Realtime
// Database at fabricSettings/live, so the dashboard and every customer's product
// page see the same settings, updated live. localStorage is only a cache: pages
// render from it instantly, then refresh when Firebase answers. If Firebase is
// unreachable, pages keep working from the cache and the built-in defaults.
const SETTINGS_PATH = `fabricSettings/${globalThis.KD_FABRIC_SETTINGS_KEY || 'live'}`;
const renderedLists = new Map();   // container element → its renderFabricList() arguments
let dbPromise = null;
let writeTimer = null;
let writesInFlight = 0;
let syncStarted = false;
let seedFromLocalRequested = false;
// Settings this page last displayed. Tabs share the localStorage cache, so another
// tab may already have cached an update this page hasn't shown yet — compare per page.
let appliedJson = null;

function getDb() {
  dbPromise ??= Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'),
  ]).then(([{ initializeApp, getApps, getApp }, fb]) => {
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    return { db: fb.getDatabase(app), fb };
  });
  return dbPromise;
}

// Firebase can't store null, so a switched-off opacity (legacy null) becomes false.
function toStorable(overrides) {
  const clean = JSON.parse(JSON.stringify(overrides ?? {}));
  for (const [id, v] of Object.entries(clean.swatchOpacity ?? {})) {
    if (v === null) clean.swatchOpacity[id] = false;
  }
  return clean;
}

// Firebase may hand stored lists back as keyed objects; always return arrays.
function normalizeOverrides(raw) {
  const o = raw && typeof raw === 'object' ? { ...raw } : {};
  for (const key of ['extras', 'ttExtras']) {
    if (!o[key]) continue;
    o[key] = Object.fromEntries(Object.entries(o[key]).map(([k, list]) =>
      [k, (Array.isArray(list) ? list : Object.values(list || {})).filter(Boolean)]));
  }
  return o;
}

function stableStringify(v) {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

function queueRemoteWrite(overrides, delay = 150) {
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    writesInFlight++;
    getDb()
      .then(({ db, fb }) => fb.set(fb.ref(db, SETTINGS_PATH), overrides))
      .catch(err => console.warn('[fabrics] could not save settings to Firebase:', err?.message ?? err))
      .finally(() => { writesInFlight--; });
  }, delay);
}

// Re-render every fabric list on the page, keeping open sections and the selected swatch.
function refreshRenderedLists() {
  for (const [el, args] of renderedLists) {
    if (!el.isConnected) { renderedLists.delete(el); continue; }
    const active    = el.querySelector('.swatch-card.active')?.dataset.fabricId;
    const openTypes = [...el.querySelectorAll('.fabric-category.open')].map(n => n.dataset.typeId);
    const openColls = [...el.querySelectorAll('.fabric-subcategory.open')].map(n => n.dataset.collKey);
    const catalog   = args.zone === 'two-tone' ? getMergedTwotoneCatalog() : args.catalogSource;
    renderFabricList(el, args.sku, args.zone, catalog);
    el.querySelectorAll('.fabric-category').forEach(n => n.classList.toggle('open', openTypes.includes(n.dataset.typeId)));
    el.querySelectorAll('.fabric-subcategory').forEach(n => n.classList.toggle('open', openColls.includes(n.dataset.collKey)));
    if (active) el.querySelector(`.swatch-card[data-fabric-id="${CSS.escape(active)}"]`)?.classList.add('active');
  }
}

/**
 * startFabricSettingsSync({ seedFromLocal })
 * Subscribes to the shared settings once per page (started automatically).
 * On every change it refreshes the cache, re-renders fabric lists and fires a
 * 'kd:fabric-settings' window event. The admin dashboard passes seedFromLocal
 * so that, the first time, this browser's saved settings are published.
 */
export function startFabricSettingsSync({ seedFromLocal = false } = {}) {
  if (seedFromLocal) seedFromLocalRequested = true;
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;
  getDb().then(({ db, fb }) => {
    let first = true;
    fb.onValue(fb.ref(db, SETTINGS_PATH), (snap) => {
      const remote = snap.val();
      const isFirst = first;
      first = false;
      if (isFirst && seedFromLocalRequested && remote === null && Object.keys(loadOverrides()).length) {
        queueRemoteWrite(toStorable(loadOverrides()), 0);
        return;
      }
      if (writeTimer || writesInFlight) return; // our own save is on its way; ignore its echo
      const next = normalizeOverrides(remote);
      const nextJson = stableStringify(next);
      appliedJson ??= stableStringify(normalizeOverrides(loadOverrides()));
      if (nextJson === appliedJson) return;
      appliedJson = nextJson;
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      refreshRenderedLists();
      window.dispatchEvent(new CustomEvent('kd:fabric-settings'));
    }, (err) => console.warn('[fabrics] live settings unavailable, using cached settings:', err?.message ?? err));
  }).catch(err => console.warn('[fabrics] live settings unavailable, using cached settings:', err));
}

if (typeof window !== 'undefined') setTimeout(() => startFabricSettingsSync(), 0);

/**
 * loadFabricOverrides()
 * ----------------------
 * Public version of loadOverrides() — exported so the admin dashboard
 * can read the current state before rendering its controls.
 */
export function loadFabricOverrides() {
  return loadOverrides();
}

// ── Visibility key builders ───────────────────────────────────────────────────
// Visibility settings are stored as key → boolean in overrides.visibility.
// These functions build the correct key strings for each scenario.
//
// KEY FORMATS:
//   Fabric TYPE  per product:          "p:SKU:t:typeId"
//   Fabric TYPE  per product + zone:   "p:SKU:z:ZONE:t:typeId"
//   Collection   per product:          "p:SKU:c:typeId:collId"
//   Collection   per product + zone:   "p:SKU:z:ZONE:c:typeId:collId"
//   Swatch       globally:             "s:swatchId"
//
// WHAT IS A ZONE?
//   Two-tone product pages have two separate fabric zones:
//     "main"      → the main body of the garment
//     "two-tone"  → the contrast accent zone
//   Each zone can have different fabrics visible/hidden independently.

function productTypeKey(sku, typeId, zone) {
  // With zone:    "p:KD-P60-FSSD:z:two-tone:t:cotton"
  // Without zone: "p:KD-P60-FSSD:t:cotton"
  return zone
    ? `p:${sku}:z:${zone}:t:${typeId}`
    : `p:${sku}:t:${typeId}`;
}

function productCollKey(sku, typeId, collId, zone) {
  return zone
    ? `p:${sku}:z:${zone}:c:${typeId}:${collId}`
    : `p:${sku}:c:${typeId}:${collId}`;
}

function swatchKey(swatchId) {
  return `s:${swatchId}`;
}

// Re-exported with zone-first argument order (matches admin dashboard call sites).
export function zoneTypeKey(sku, zone, typeId)         { return productTypeKey(sku, typeId, zone); }
export function zoneCollKey(sku, zone, typeId, collId) { return productCollKey(sku, typeId, collId, zone); }

// ── Visibility query helpers ──────────────────────────────────────────────────

/**
 * isTypeVisible(sku, typeId, overrides)
 * --------------------------------------
 * Should this fabric TYPE be shown for the given product?
 * Default: true (shown) if no override has been set.
 *
 * @param {string} sku       - Product SKU, e.g. 'KD-P60-FSSD'
 * @param {string} typeId    - Fabric type ID, e.g. 'cotton'
 * @param {object} overrides - The overrides object from loadFabricOverrides()
 */
export function isTypeVisible(sku, typeId, overrides) {
  const vis = overrides.visibility || {};
  return vis[productTypeKey(sku, typeId)] ?? true;  // ?? true = default to visible
}

/**
 * isCollectionVisible(sku, typeId, collId, overrides)
 * ----------------------------------------------------
 * Should this COLLECTION be shown within the given fabric type for a product?
 * Only call this after confirming the parent type is visible.
 */
export function isCollectionVisible(sku, typeId, collId, overrides) {
  const vis = overrides.visibility || {};
  return vis[productCollKey(sku, typeId, collId)] ?? true;
}

// ── Catalog builders (base + admin extras) ───────────────────────────────────

/**
 * getMergedCatalog()
 * ------------------
 * Returns the FABRIC_CATALOG with any admin-added swatches merged in.
 * Swatches added via the dashboard are stored in overrides.extras and
 * are appended to the relevant collection when this function is called.
 *
 * Why "merged"? The base FABRIC_CATALOG is hard-coded here. Admin extras
 * live in localStorage. This function combines both so the product page
 * sees one complete list without knowing the source of each swatch.
 */
export function getMergedCatalog() {
  const overrides = loadOverrides();
  // extras shape: { 'cotton:plain': [{id, label, image}], ... }
  const extras    = overrides.extras || {};

  return FABRIC_CATALOG.map(type => ({
    ...type,  // spread copies all type properties (id, label, wreaths)
    collections: type.collections.map(coll => {
      const extraKey      = `${type.id}:${coll.id}`;   // e.g. "cotton:plain"
      const extraSwatches = extras[extraKey] || [];      // admin-added swatches for this slot
      return {
        ...coll,
        swatches: [...coll.swatches, ...extraSwatches], // base + admin extras
      };
    }),
  }));
}

/**
 * getMergedTwotoneCatalog()
 * -------------------------
 * Same concept as getMergedCatalog() but for the two-tone zone.
 * Admin extras for two-tone are stored separately under overrides.ttExtras
 * keyed by type ID (e.g. 'cotton') rather than 'typeId:collId'.
 */
export function getMergedTwotoneCatalog() {
  const overrides = loadOverrides();
  // ttExtras shape: { 'cotton': [{id, label, image}], 'linen': [...], ... }
  const ttExtras  = overrides.ttExtras || {};

  return TWOTONE_CATALOG.map(type => ({
    ...type,
    collections: type.collections.map(coll => ({
      ...coll,
      swatches: [...coll.swatches, ...(ttExtras[type.id] || [])],
    })),
  }));
}

// ── DOM Renderer ──────────────────────────────────────────────────────────────

/**
 * renderFabricList(containerEl, sku, zone, catalogSource)
 * --------------------------------------------------------
 * Builds and injects the full fabric-selection HTML into a container element.
 *
 * The resulting HTML structure (for each type) looks like:
 *
 *   <div class="fabric-category">            ← wraps one fabric type (Cotton)
 *     <div class="category-card">            ← clickable header with wreath image
 *       <div class="wreath-preview">         ← wreath image(s)
 *       <p>100% Cotton</p>
 *     </div>
 *     <div class="swatch-grid">              ← hidden until header clicked
 *       <div class="fabric-subcategory">     ← one per collection (Plain, Dobies…)
 *         <div class="subcategory-header">   ← clickable sub-header
 *         <div class="sub-swatch-grid">      ← individual swatch cards
 *           <div class="swatch-card"         ← clickable swatch
 *                data-texture="images/cotton-1.webp"
 *                data-fabric-id="cotton-1">
 *             <img src="…"> <span>Cotton 1</span>
 *           </div>
 *         </div>
 *       </div>
 *     </div>
 *   </div>
 *
 * VISIBILITY FILTERING:
 *   - If a fabric TYPE is hidden for this product → the entire <fabric-category>
 *     div is omitted.
 *   - If a COLLECTION is hidden → its subcategory div is omitted.
 *   - If all SWATCHES in a collection are globally hidden → the sub-category
 *     is omitted even if the collection itself is enabled.
 *
 * @param {HTMLElement} containerEl    - The DOM element to render into.
 * @param {string}      sku            - Product SKU used to look up visibility rules.
 * @param {string|null} zone           - 'two-tone' or null for the main zone.
 * @param {Array|null}  catalogSource  - Override the catalog (used by two-tone zone
 *                                       to pass TWOTONE_CATALOG instead of the default).
 */
export function renderFabricList(containerEl, sku, zone = null, catalogSource = null) {
  const overrides = loadOverrides();
  appliedJson = stableStringify(normalizeOverrides(overrides));
  const vis       = overrides.visibility || {};

  // Choose the right catalog: caller can pass a custom one, otherwise use main.
  const catalog = catalogSource ?? getMergedCatalog();

  // Convenience wrappers so the code below reads naturally.
  function typeOn(typeId)         { return vis[productTypeKey(sku, typeId, zone)]         ?? true; }
  function collOn(typeId, collId) { return vis[productCollKey(sku, typeId, collId, zone)] ?? true; }
  function swatchOn(swatchId)     { return vis[swatchKey(swatchId)]                       ?? true; }

  let html = '';

  catalog.forEach(type => {
    // Skip this entire fabric type if it's hidden for this product.
    if (!typeOn(type.id)) return;

    // Build the wreath images row for the category card header.
    const wreathImgs = type.wreaths
      .map(w => `<img src="${w}" alt="${type.label}">`)
      .join('');

    // Build HTML for each collection within this type.
    let collectionsHtml = '';
    type.collections.forEach(coll => {
      // Skip hidden collections.
      if (!collOn(type.id, coll.id)) return;

      // Filter swatches to only those that are globally visible.
      const visibleSwatches = coll.swatches.filter(s => swatchOn(s.id));

      // If the collection has swatches defined but ALL are hidden, skip it entirely.
      if (coll.swatches.length > 0 && visibleSwatches.length === 0) return;

      // Build one clickable swatch card per visible swatch.
      // data-texture → the image applied to the 3D model when clicked.
      // data-fabric-id → the ID passed to selectFabric() and saved to the session.
      const swatchCards = visibleSwatches.map(s => {
        // Opacity priority: 1) admin override (a number; false/null = switched off → opaque)
        // 2) swatch definition  3) 1 (fully opaque)
        const opacityOverride = (overrides.swatchOpacity ?? {})[s.id];
        const opacity = typeof opacityOverride === 'number' ? opacityOverride
          : (opacityOverride === undefined ? (s.opacity ?? 1) : 1);

        // Roughness/sheen priority: 1) admin override  2) swatch definition
        // 3) the fabric TYPE's default (cotton vs. silk look different)  4) fallback.
        const typeDefaults = TYPE_MATERIAL_DEFAULTS[type.id] ?? FALLBACK_MATERIAL_DEFAULTS;
        const roughnessOverride = (overrides.swatchRoughness ?? {})[s.id];
        const roughness = roughnessOverride !== undefined ? roughnessOverride
          : (s.roughness !== undefined ? s.roughness : typeDefaults.roughness);
        const sheenOverride = (overrides.swatchSheen ?? {})[s.id];
        const sheen = sheenOverride !== undefined ? sheenOverride
          : (s.sheen !== undefined ? s.sheen : typeDefaults.sheen);

        // drape: which sphere-drop simulation preset this fabric uses (see DRAPE_TYPES).
        // Priority: 1) admin override ('' = explicitly none)  2) swatch definition.
        const drape = (overrides.swatchDrape ?? {})[s.id] ?? s.drape;
        const drapeAttr = drape ? ` data-drape="${drape}"` : '';

        // The drape type is shown under the fabric name (styled inline so every page gets it).
        const drapeTag = drape
          ? `<em class="swatch-drape-tag" style="display:block;font-style:normal;color:rgba(120,90,10,0.95);">${drape} drape</em>`
          : '';

        return `<div class="swatch-card" data-texture="${s.image}" data-fabric-id="${s.id}" data-opacity="${opacity}" data-roughness="${roughness}" data-sheen="${sheen}"${drapeAttr}>
          <img src="${s.image}" alt="${s.label}">
          <span>${s.label}${drapeTag}</span>
        </div>`;
      }).join('');

      // Sub-category block: collapsible header + swatch grid.
      collectionsHtml += `
        <div class="fabric-subcategory" data-coll-key="${type.id}:${coll.id}">
          <div class="subcategory-header">
            <span>${coll.label}</span>
            <span class="sub-arrow">&#9654;</span><!-- ▶ arrow, rotates when open -->
          </div>
          <div class="sub-swatch-grid">${swatchCards}</div>
        </div>`;
    });

    // Outer category block: wreath card + all collections inside.
    html += `
      <div class="fabric-category" data-type-id="${type.id}">
        <div class="category-card">
          <div class="wreath-preview">${wreathImgs}</div>
          <p>${type.label}</p>
        </div>
        <div class="swatch-grid">${collectionsHtml}</div>
      </div>`;
  });

  // Inject the fully-built HTML string into the container in one operation.
  containerEl.innerHTML = html;
  renderedLists.set(containerEl, { sku, zone, catalogSource }); // re-rendered when settings change live
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

/**
 * getFabricById(id)
 * -----------------
 * Searches both catalogs (main + two-tone) for a swatch by its ID.
 * Returns a swatch object enriched with its parent type and collection info,
 * or null if not found.
 *
 * Used by the admin dashboard and checkout page to display swatch details
 * when only the swatch ID is known (e.g. from an order record).
 *
 * @param {string} id - Swatch ID, e.g. 'cotton-1' or 'tt-linen-1'.
 */
export function getFabricById(id) {
  const allCatalogs = [getMergedCatalog(), TWOTONE_CATALOG];
  for (const catalog of allCatalogs) {
    for (const type of catalog) {
      for (const coll of type.collections) {
        const s = coll.swatches.find(sw => sw.id === id);
        if (s) return {
          ...s,
          typeId:    type.id,
          typeLabel: type.label,
          collId:    coll.id,
          collLabel: coll.label,
        };
      }
    }
  }
  return null;  // Swatch not found in either catalog.
}
