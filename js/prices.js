/**
 * KD Pricing Config
 * Edit design and fabric prices here, OR manage them from the admin dashboard.
 * Admin dashboard saves to localStorage which takes priority over these defaults.
 */

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

// ── Runtime price resolver (checks localStorage first, falls back to above) ──
const LS_KEY = 'kd_prices';

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch (_) { return {}; }
}

export function getDesignPrice(sku) {
  const overrides = loadOverrides();
  if (overrides.designs?.[sku] !== undefined) return Number(overrides.designs[sku]);
  return DESIGN_PRICES[sku] ?? 0;
}

export function getFabricPrice(fabricId) {
  const overrides = loadOverrides();
  if (overrides.fabrics?.[fabricId] !== undefined) return Number(overrides.fabrics[fabricId]);
  return FABRIC_PRICES[fabricId] ?? 0;
}

export function savePrices(designs, fabrics) {
  localStorage.setItem(LS_KEY, JSON.stringify({ designs, fabrics }));
}

export function getAllPrices() {
  const overrides = loadOverrides();
  const designs = { ...DESIGN_PRICES, ...(overrides.designs || {}) };
  const fabrics = { ...FABRIC_PRICES, ...(overrides.fabrics || {}) };
  return { designs, fabrics };
}
