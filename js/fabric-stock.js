/**
 * ============================================================
 *  fabric-stock.js  —  Stock & Pool-Snap Data Layer
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  Shared source of truth (Firebase RTDB) for two things:
 *
 *   1. Which fabrics are currently IN STOCK, globally. Swatch IDs
 *      (e.g. 'cotton-1') are global — the same swatch is reused
 *      across many products — so stock is tracked once per fabric,
 *      not per product. Schema:
 *        fabrics/{fabricId}/inStock : boolean
 *
 *   2. Which pre-rendered snap image to show on the pool page for
 *      a given product, and the fallback order to use when the
 *      preferred fabric is out of stock. Schema:
 *        products/{sku}/fabricOrder      : string[]           (priority order)
 *        products/{sku}/snaps/{fabricId} : string (image URL)
 *
 *  Reuses the same Firebase project/config already live for the
 *  House Forum (js/firebase-config.js) and the same dynamic-import
 *  pattern used in admin-dashboard.html — no build step needed.
 *
 *  This file does NOT touch any existing product/pool/admin page.
 *  It's a standalone module exercised first by test-fabric-stock.html.
 */

import { FIREBASE_CONFIG } from './firebase-config.js';

let fApp = null;
let fDb  = null;
let fFB  = null; // the firebase-database module itself (ref/get/set/onValue/update)

async function ensureFirebase() {
  if (fDb) return;
  const [{ initializeApp }, fbdb] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'),
  ]);
  fApp = initializeApp(FIREBASE_CONFIG);
  fDb  = fbdb.getDatabase(fApp);
  fFB  = fbdb;
}

// ── Global fabric stock ───────────────────────────────────────────────────────

/**
 * getFabricStock(fabricId)
 * Returns true/false. Missing data defaults to true (in stock) so fabrics
 * never disappear just because they haven't been migrated into Firebase yet.
 */
export async function getFabricStock(fabricId) {
  await ensureFirebase();
  const snap = await fFB.get(fFB.ref(fDb, `fabrics/${fabricId}/inStock`));
  return snap.exists() ? snap.val() : true;
}

/** getAllFabricStock() → { [fabricId]: { inStock } } for every fabric that has an entry. */
export async function getAllFabricStock() {
  await ensureFirebase();
  const snap = await fFB.get(fFB.ref(fDb, 'fabrics'));
  return snap.exists() ? snap.val() : {};
}

/** setFabricStock(fabricId, inStock) — admin action, flips one fabric globally. */
export async function setFabricStock(fabricId, inStock) {
  await ensureFirebase();
  await fFB.update(fFB.ref(fDb, `fabrics/${fabricId}`), { inStock });
}

/**
 * subscribeFabricStock(callback)
 * Live-updates callback with the full stock map whenever any fabric's
 * status changes, from any browser. Returns an unsubscribe function.
 */
export function subscribeFabricStock(callback) {
  let unsub = () => {};
  let stopped = false;
  ensureFirebase()
    .then(() => {
      if (stopped) return;
      unsub = fFB.onValue(fFB.ref(fDb, 'fabrics'), snap => callback(snap.val() || {}));
    })
    .catch((err) => {
      // Network blocked, offline, ad-blocker, etc. — callers already have a
      // static fallback in place, so this is a silent no-op, not a crash.
      console.warn('[fabric-stock] subscribeFabricStock unavailable, no live updates:', err);
    });
  return () => { stopped = true; unsub(); };
}

// ── Per-product snap config ───────────────────────────────────────────────────

/** getProductSnapConfig(sku) → { fabricOrder: string[], snaps: { [fabricId]: url } } */
export async function getProductSnapConfig(sku) {
  await ensureFirebase();
  const snap = await fFB.get(fFB.ref(fDb, `products/${sku}`));
  const val = snap.val() || {};
  return { fabricOrder: val.fabricOrder || [], snaps: val.snaps || {} };
}

/** setProductFabricOrder(sku, fabricOrder) — e.g. ['cotton-1','linen-1','wool-1'] */
export async function setProductFabricOrder(sku, fabricOrder) {
  await ensureFirebase();
  await fFB.update(fFB.ref(fDb, `products/${sku}`), { fabricOrder });
}

/** setProductSnap(sku, fabricId, url) — records the pre-rendered snap for one fabric. */
export async function setProductSnap(sku, fabricId, url) {
  await ensureFirebase();
  await fFB.update(fFB.ref(fDb, `products/${sku}/snaps`), { [fabricId]: url });
}

// ── Pure resolution logic (no Firebase — unit-testable in isolation) ─────────

/**
 * pickPoolSnap({ fabricOrder, snaps, stockMap, fallbackUrl })
 * Walks fabricOrder in priority order, skips anything out of stock,
 * and returns the first snap URL available. Falls back to fallbackUrl
 * (today's static webp) if nothing qualifies — this is what lets
 * products roll out one at a time without breaking the pool page.
 */
export function pickPoolSnap({ fabricOrder = [], snaps = {}, stockMap = {}, fallbackUrl = null }) {
  for (const fabricId of fabricOrder) {
    const inStock = stockMap[fabricId]?.inStock !== false; // default true
    if (inStock && snaps[fabricId]) return snaps[fabricId];
  }
  return fallbackUrl;
}

/**
 * pickActiveFabricId({ fabricOrder, stockMap })
 * Same priority walk as pickPoolSnap, but returns the fabric id itself
 * rather than a snap URL — used on the product page to select the same
 * fabric on the live 3D model that the pool snap is currently showing.
 * Returns null if fabricOrder is empty (no-op for un-migrated products).
 */
export function pickActiveFabricId({ fabricOrder = [], stockMap = {} }) {
  for (const fabricId of fabricOrder) {
    const inStock = stockMap[fabricId]?.inStock !== false; // default true
    if (inStock) return fabricId;
  }
  return null;
}
