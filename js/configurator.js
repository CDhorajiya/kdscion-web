/**
 * ============================================================
 *  configurator.js  —  Product Fabric Configurator
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  This file powers the fabric-selection panel on every product
 *  page (pN.html). It lets a customer:
 *    1. See the price of the design immediately when the page loads.
 *    2. Browse and click fabric swatches (Cotton, Linen, Wool…).
 *    3. See the combined design + fabric price update in real time.
 *    4. Click "ADD TO COLLECTION" to save the chosen configuration
 *       and add it to their cart.
 *
 *  HOW IT CONNECTS TO OTHER FILES
 *  --------------------------------
 *    api.js       → talks to the backend (save session, add to cart)
 *    auth-modal.js → prompts the user to log in if not authenticated
 *    prices.js    → looks up design & fabric prices (local config)
 *    fabrics.js   → renders the fabric swatch UI into the DOM
 *
 *  HOW A PRODUCT PAGE USES THIS FILE
 *  -----------------------------------
 *  Each product page imports this module and calls:
 *    initConfigurator('KD-P60-FSSD')  // pass the product's SKU
 *  That single call starts everything: renders fabric list, shows price,
 *  fetches product data from the server in the background.
 *
 *  WHAT IS A SKU?
 *  ---------------
 *  SKU = Stock Keeping Unit. It's a unique code for each design, e.g.
 *  'KD-P60-FSSD' = King Dhorajiya, Product 60, Full Sleeve Sheath Dress.
 *  The SKU links the front-end product page to the backend product record.
 */

import {
  getProducts,
  getProductOptions,
  saveConfiguratorSession,
  addToCart,
  getCart,
  isLoggedIn,
} from './api.js';
import { openAuthModal }                     from './auth-modal.js';
import { getDesignPrice, getFabricPrice }    from './prices.js';
import { renderFabricList }                  from './fabrics.js';

// ── Module-level state ────────────────────────────────────────────────────────
// These variables are shared across all functions in this file.
// They hold the current state for the open product page.

let product         = null;  // Product record from the server: { id, sku, name, … }
let options         = null;  // Array of configurable options from the server,
                             // e.g. [{ id: 'fabric', label: 'Fabric',
                             //         values: [{ id: 'linen-1', label: 'Linen 1' }] }]
let selectedFabricId = null; // The swatch the customer last clicked, e.g. 'linen-1'

// ── Initialisation ────────────────────────────────────────────────────────────

/**
 * initConfigurator(sku)
 * ----------------------
 * Entry point. Call this once per product page, passing the product's SKU.
 *
 * WHAT IT DOES:
 *  1. Immediately renders the fabric swatch list (no API call needed —
 *     fabric data lives locally in fabrics.js).
 *  2. Immediately shows the design-only price so the customer sees
 *     something useful right away, even on a slow connection.
 *  3. Fetches the full product list from the server in the background
 *     and finds the matching product by SKU.
 *  4. Fetches the configurable options (fabric choices) for that product.
 *
 * @param {string} sku - The product's unique code, e.g. 'KD-P60-FSSD'.
 */
export async function initConfigurator(sku) {
  // Step 1: Render the fabric swatch UI into the '.fabric-list' element.
  // This uses local data so it happens instantly — no waiting for the network.
  const fabricListEl = document.querySelector('.fabric-list');
  if (fabricListEl) renderFabricList(fabricListEl, sku);

  // Step 2: Show the base design price immediately using the local prices config.
  renderPriceForSku(sku);

  // Steps 3 & 4: Fetch server data in the background.
  // getProducts(1, 50) returns up to 50 products. We search by SKU.
  const { data: products } = await getProducts(1, 50);
  product = products.find(p => p.sku === sku) ?? null;

  if (!product) {
    // This should only happen if the SKU in the HTML doesn't match the server.
    console.error('Product not found for SKU:', sku);
    return;
  }

  // Fetch the option definitions (what can be customised, and valid values).
  options = await getProductOptions(product.id);

  // Re-render price now that we have the full server product object.
  renderPrice();
}

// ── Fabric selection ──────────────────────────────────────────────────────────

/**
 * selectFabric(fabricId)
 * -----------------------
 * Called by the product page's swatch-click handler whenever the customer
 * clicks a fabric swatch in the UI.
 *
 * @param {string} fabricId - The swatch's ID, e.g. 'cotton-1', 'linen-2'.
 *
 * EXPORTED because product pages import and call it directly:
 *   swatch.addEventListener('click', () => selectFabric(swatch.dataset.fabricId));
 */
export function selectFabric(fabricId) {
  selectedFabricId = fabricId;  // Remember what was picked.
  renderPrice();                // Update the price display to include fabric cost.
}

/**
 * getSelectedValue()
 * ------------------
 * Internal helper. Searches the `options` array (fetched from the server)
 * for the currently selected fabric.
 *
 * Returns an object like:
 *   { option: { id: 'fabric', label: 'Fabric' },
 *     value:  { id: 'linen-1', label: 'Linen 1' } }
 * or null if nothing is selected yet, or options haven't loaded yet.
 */
function getSelectedValue() {
  if (!options || !selectedFabricId) return null;
  for (const opt of options) {
    const val = opt.values.find(v => v.id === selectedFabricId);
    if (val) return { option: opt, value: val };
  }
  return null;
}

// ── Price display ─────────────────────────────────────────────────────────────

/**
 * fmt(n)
 * ------
 * Formats a number as a US dollar string, e.g. 1500 → "$1,500".
 */
function fmt(n) { return `$${Number(n).toLocaleString()}`; }

/**
 * renderPriceForSku(sku)
 * -----------------------
 * Shows just the design price before any fabric is selected.
 * Used at page load when we only have the SKU (no server data yet).
 * The price label reads: "Design $X + select fabric for total".
 */
function renderPriceForSku(sku) {
  const label = document.querySelector('.cfg-price-label');
  if (!label) return;

  const designPrice = getDesignPrice(sku);  // Looks up price in prices.js or localStorage.

  label.innerHTML = `
    <span class="cfg-price-part">Design&nbsp;<strong id="cfg-price">${fmt(designPrice)}</strong></span>
    <span class="cfg-price-hint">+ select fabric for total</span>
  `;
}

/**
 * renderPrice()
 * -------------
 * Updates the price display based on the currently selected fabric.
 *
 * Two cases:
 *  - Fabric selected:   shows "Design $X + Fabric $Y = Total $Z"
 *  - No fabric yet:     shows "Design $X + select fabric for total"
 */
function renderPrice() {
  const el = document.getElementById('cfg-price');
  if (!el || !product) return;

  const designPrice = getDesignPrice(product.sku);
  // Walk up the DOM to find the full label container.
  const label = el.closest('.cfg-price-label') || el.parentElement;

  if (selectedFabricId) {
    const fabricPrice = getFabricPrice(selectedFabricId);
    const total = designPrice + fabricPrice;

    // Show itemised breakdown: Design + Fabric = Total.
    label.innerHTML = `
      <span class="cfg-price-part">Design&nbsp;<strong>${fmt(designPrice)}</strong></span>
      <span class="cfg-price-sep">+</span>
      <span class="cfg-price-part">Fabric&nbsp;<strong>${fmt(fabricPrice)}</strong></span>
      <span class="cfg-price-sep">=</span>
      <span class="cfg-price-total">Total&nbsp;<strong id="cfg-price">${fmt(total)}</strong></span>
    `;
  } else {
    // No fabric chosen yet — show design price only with a hint.
    label.innerHTML = `
      <span class="cfg-price-part">Design&nbsp;<strong id="cfg-price">${fmt(designPrice)}</strong></span>
      <span class="cfg-price-hint">+ select fabric for total</span>
    `;
  }
}

// ── Add to cart ───────────────────────────────────────────────────────────────

/**
 * addSelectedToCart()
 * --------------------
 * Called when the customer clicks "ADD TO COLLECTION".
 *
 * FLOW:
 *  1. If the customer is not logged in → open the login modal first.
 *     After they log in, this function is called again automatically.
 *  2. If no fabric is selected → show a warning, do nothing.
 *  3. Disable the button and show "ADDING…" to prevent double-clicks.
 *  4. Save the configurator session to the server (records the fabric choice).
 *  5. Add the product + session to the cart on the server.
 *  6. Show success feedback and enable the "GO TO COLLECTION" button.
 *  7. Re-enable the button after 2.5 seconds.
 *  If anything fails, show an error message and re-enable the button immediately.
 */
export async function addSelectedToCart() {
  const btn = document.getElementById('cfg-add-btn');

  // Guard: user must be logged in to add to cart.
  if (!isLoggedIn()) {
    // openAuthModal takes a callback — after successful login it calls
    // addSelectedToCart again automatically, so the flow continues.
    openAuthModal(() => addSelectedToCart());
    return;
  }

  // Guard: a fabric must be selected.
  if (!selectedFabricId) {
    showStatus('Please select a fabric first.', 'warn');
    return;
  }

  // Disable button to prevent accidental double-submission.
  btn.disabled = true;
  btn.textContent = 'ADDING…';

  try {
    // Build the selections map: { optionId: valueObject }
    const selected   = getSelectedValue();
    const selections = { [selected.option.id]: selected.value };

    // Step 4: Tell the server what fabric the customer picked.
    const session = await saveConfiguratorSession(product.id, selections);

    // Step 5: Add the product to the server-side cart, linking the session.
    await addToCart(product.id, 1, session.id);

    showStatus('Added to collection.', 'ok');
    btn.textContent = 'ADDED ✓';
    enableGoToCollection();  // Unlock the "Go to Collection" button.

    // Re-enable the add button after a short pause.
    setTimeout(() => {
      btn.textContent = 'ADD TO COLLECTION';
      btn.disabled    = false;
    }, 2500);

  } catch (err) {
    console.error(err);
    showStatus(err.message ?? 'Something went wrong.', 'error');
    btn.textContent = 'ADD TO COLLECTION';
    btn.disabled    = false;
  }
}

// ── Go to collection (cart) ───────────────────────────────────────────────────

/**
 * enableGoToCollection()
 * -----------------------
 * Internal helper — un-disables the "GO TO COLLECTION" button.
 * Called after a successful add-to-cart operation.
 */
function enableGoToCollection() {
  const btn = document.getElementById('cfg-goto-btn');
  if (btn) btn.disabled = false;
}

/**
 * initGoToCollection()
 * ---------------------
 * Called at page load (exported so product pages can call it).
 * If the user is already logged in AND already has items in their cart,
 * the "GO TO COLLECTION" button is enabled immediately — so returning
 * customers don't have to add something new just to see their cart.
 */
export async function initGoToCollection() {
  if (!isLoggedIn()) return;  // Not logged in → button stays disabled.
  try {
    const items = await getCart();
    if (items && items.length > 0) enableGoToCollection();
  } catch {
    // If the cart fetch fails (e.g. expired token), silently do nothing.
    // The button stays disabled; the customer can still add and use it.
  }
}

// ── Status message ────────────────────────────────────────────────────────────

/**
 * showStatus(msg, type)
 * ----------------------
 * Displays a brief feedback message below the add-to-cart button.
 * The message fades out after 3 seconds.
 *
 * @param {string} msg  - The message to show, e.g. 'Added to collection.'
 * @param {string} type - One of 'ok' | 'warn' | 'error'. Controls the colour
 *                        (green / amber / red) via CSS class cfg-status--{type}.
 */
function showStatus(msg, type = 'ok') {
  let el = document.getElementById('cfg-status');
  if (!el) return;

  el.textContent = msg;
  el.className   = `cfg-status cfg-status--${type}`;
  el.style.opacity = '1';

  // Automatically fade the message out after 3 seconds.
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}
