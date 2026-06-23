/**
 * ============================================================
 *  prices.js  —  Design & Fabric Pricing Configuration
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  Stores the default prices for every design and every fabric
 *  swatch. It also provides functions to read the current price
 *  (checking for admin overrides first) and to save new prices.
 *
 *  HOW PRICES ARE MANAGED
 *  -----------------------
 *  There are TWO layers of pricing:
 *
 *    1. CODE DEFAULTS (this file) — the hard-coded fallback prices.
 *       Currently all set to 0 (free) while pricing is being finalised.
 *
 *    2. ADMIN OVERRIDES (localStorage) — prices saved by the admin
 *       through the dashboard's "Pricing" tab. These override the
 *       code defaults and survive page refreshes.
 *
 *  When a product page needs a price, it calls getDesignPrice(sku) or
 *  getFabricPrice(fabricId). Those functions check localStorage first;
 *  if no override exists, they fall back to the defaults here.
 *
 *  HOW TO UPDATE PRICES
 *  ----------------------
 *  Option A (for developers): Edit the numbers in DESIGN_PRICES /
 *            FABRIC_PRICES directly in this file.
 *  Option B (for the store owner): Use the Admin Dashboard → Pricing tab.
 *            Changes save to localStorage and take effect immediately,
 *            without a code deployment.
 *
 *  IMPORTANT: localStorage overrides take priority. If a price set via
 *  the dashboard seems "stuck", check localStorage in DevTools → Application.
 */

// ── Design price defaults ─────────────────────────────────────────────────────
// Maps product SKU → base price in USD (number).
// The SKU format is KD-PNN-XXX where NN is the product number.
// All currently 0 — to be filled in when final pricing is confirmed.

export const DESIGN_PRICES = {
  'KD-P1-FSS':  0,   // Full Sleeve Classic Shirt
  'KD-P2-HOD':  0,   // Half Sleeve Overall Dress
  'KD-P6-SLD':  0,   // Sleeveless Dress
  'KD-P8-SHD':  0,   // Sleeveless Sheath Dress
  'KD-P11-HAD': 0,   // Half Sleeve A-line Dress
  'KD-P12-FAD': 0,   // Full Sleeve A-line Dress
  'KD-P32-QAD': 0,   // Quarter Sleeve A-line Dress
  'KD-P34-SMX': 0,   // Sleeveless Maxi Dress
  'KD-P37-SFD': 0,   // Sleeveless Shift Dress
  'KD-P40-SBC': 0,   // Sleeveless Bodycon Dress
  'KD-P48-FWT': 0,   // Full Sleeve Wrap Top
  'KD-P49-SAD': 0,   // Sleeveless A-line Dress
  'KD-P57-FA2': 0,   // Full Sleeve A-line Dress 2
  'KD-P62-FQB': 0,   // Full Sleeve Quarter Button A-line Dress
  'KD-P22-SCS': 0,   // Sleeveless Classic Shirt
};

// ── Fabric price defaults ─────────────────────────────────────────────────────
// Maps swatch ID → additional price in USD (added on top of the design price).
// All currently 0. When fabric pricing is introduced, set each swatch's cost here.

export const FABRIC_PRICES = {
  'cotton-1':       0,
  'cotton-2':       0,
  'linen-1':        0,
  'linen-2':        0,
  'wool-1':         0,
  'wool-2':         0,
  'cotton-linen-1': 0,
  'cotton-linen-2': 0,
  'cotton-wool-1':  0,
};

// ── localStorage key ──────────────────────────────────────────────────────────
// All price overrides are stored under this single key in localStorage.
const LS_KEY = 'kd_prices';

/**
 * loadOverrides()  [private]
 * --------------------------
 * Reads any price overrides the admin saved via the dashboard.
 * Returns an empty object {} if no overrides exist or if the data is corrupt.
 *
 * Shape of the stored object:
 * {
 *   designs: { 'KD-P1-FSS': 1500, 'KD-P60-FSSD': 2000 },
 *   fabrics: { 'cotton-1': 200, 'linen-1': 350 }
 * }
 */
function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (_) { return {}; }
}

// ── Price getters ─────────────────────────────────────────────────────────────

/**
 * getDesignPrice(sku)
 * --------------------
 * Returns the current price for a design, checking overrides first.
 *
 * Priority:
 *   1. localStorage override (set via admin dashboard)
 *   2. DESIGN_PRICES default (hard-coded above)
 *   3. 0 (if SKU is unknown — future designs not yet in defaults)
 *
 * @param {string} sku - Product SKU, e.g. 'KD-P60-FSSD'
 * @returns {number}   - Price in USD as a plain number.
 */
export function getDesignPrice(sku) {
  const overrides = loadOverrides();
  // If the admin set a price for this SKU, use it (convert to Number for safety).
  if (overrides.designs?.[sku] !== undefined) return Number(overrides.designs[sku]);
  // Fall back to the code default, or 0 if the SKU isn't listed.
  return DESIGN_PRICES[sku] ?? 0;
}

/**
 * getFabricPrice(fabricId)
 * -------------------------
 * Returns the current add-on price for a fabric swatch.
 * Same priority logic as getDesignPrice.
 *
 * @param {string} fabricId - Swatch ID, e.g. 'linen-1'
 * @returns {number}        - Price in USD.
 */
export function getFabricPrice(fabricId) {
  const overrides = loadOverrides();
  if (overrides.fabrics?.[fabricId] !== undefined) return Number(overrides.fabrics[fabricId]);
  return FABRIC_PRICES[fabricId] ?? 0;
}

// ── Price setters ─────────────────────────────────────────────────────────────

/**
 * savePrices(designs, fabrics)
 * -----------------------------
 * Saves price overrides to localStorage. Called by the admin dashboard
 * when the user edits prices in the Pricing tab.
 *
 * @param {object} designs - Map of SKU → price, e.g. { 'KD-P60-FSSD': 2000 }
 * @param {object} fabrics - Map of swatchId → price, e.g. { 'linen-1': 350 }
 */
export function savePrices(designs, fabrics) {
  localStorage.setItem(LS_KEY, JSON.stringify({ designs, fabrics }));
}

/**
 * getAllPrices()
 * -------------
 * Returns a merged view of ALL design and fabric prices (defaults + overrides),
 * used by the admin dashboard to populate the pricing table.
 *
 * The returned objects are fully merged: every known SKU and swatch ID
 * appears once, with the override value if set, otherwise the default.
 *
 * @returns {{ designs: object, fabrics: object }}
 */
export function getAllPrices() {
  const overrides = loadOverrides();
  // Spread the defaults first, then overrides — overrides win on collision.
  const designs   = { ...DESIGN_PRICES, ...(overrides.designs || {}) };
  const fabrics   = { ...FABRIC_PRICES, ...(overrides.fabrics || {}) };
  return { designs, fabrics };
}
