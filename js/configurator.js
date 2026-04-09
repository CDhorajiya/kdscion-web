import {
  getProducts,
  getProductOptions,
  saveConfiguratorSession,
  addToCart,
  getCart,
  isLoggedIn,
} from './api.js';
import { openAuthModal } from './auth-modal.js';
import { getDesignPrice, getFabricPrice } from './prices.js';
import { renderFabricList } from './fabrics.js';

let product = null;   // { id, sku, name, basePrice, ... }
let options = null;   // [ { id, label, values: [...] } ]
let selectedFabricId = null;  // value id e.g. "linen-1"

// ── Init ─────────────────────────────────────────────────────────────────────

export async function initConfigurator(sku) {
  const { data: products } = await getProducts(1, 50);
  product = products.find(p => p.sku === sku) ?? null;
  if (!product) { console.error('Product not found for SKU:', sku); return; }

  options = await getProductOptions(product.id);

  // Render fabric catalog for this specific product SKU
  const fabricListEl = document.querySelector('.fabric-list');
  if (fabricListEl) renderFabricList(fabricListEl, product.sku);

  renderPrice();
}

// ── Fabric selection ──────────────────────────────────────────────────────────

export function selectFabric(fabricId) {
  selectedFabricId = fabricId;
  renderPrice();
}

function getSelectedValue() {
  if (!options || !selectedFabricId) return null;
  for (const opt of options) {
    const val = opt.values.find(v => v.id === selectedFabricId);
    if (val) return { option: opt, value: val };
  }
  return null;
}

// ── Price display ─────────────────────────────────────────────────────────────

function fmt(n) { return `$${Number(n).toLocaleString()}`; }

function renderPrice() {
  const el = document.getElementById('cfg-price');
  if (!el || !product) return;

  const designPrice = getDesignPrice(product.sku);
  const label = el.closest('.cfg-price-label') || el.parentElement;

  if (selectedFabricId) {
    const fabricPrice = getFabricPrice(selectedFabricId);
    const total = designPrice + fabricPrice;
    label.innerHTML = `
      <span class="cfg-price-part">Design&nbsp;<strong>${fmt(designPrice)}</strong></span>
      <span class="cfg-price-sep">+</span>
      <span class="cfg-price-part">Fabric&nbsp;<strong>${fmt(fabricPrice)}</strong></span>
      <span class="cfg-price-sep">=</span>
      <span class="cfg-price-total">Total&nbsp;<strong id="cfg-price">${fmt(total)}</strong></span>
    `;
  } else {
    label.innerHTML = `
      <span class="cfg-price-part">Design&nbsp;<strong id="cfg-price">${fmt(designPrice)}</strong></span>
      <span class="cfg-price-hint">+ select fabric for total</span>
    `;
  }
}

// ── Add to cart ───────────────────────────────────────────────────────────────

export async function addSelectedToCart() {
  const btn = document.getElementById('cfg-add-btn');

  if (!isLoggedIn()) {
    openAuthModal(() => addSelectedToCart());
    return;
  }
  if (!selectedFabricId) {
    showStatus('Please select a fabric first.', 'warn');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'ADDING…';

  try {
    const selected = getSelectedValue();
    const selections = { [selected.option.id]: selected.value };

    const session = await saveConfiguratorSession(product.id, selections);
    await addToCart(product.id, 1, session.id);

    showStatus('Added to collection.', 'ok');
    btn.textContent = 'ADDED ✓';
    enableGoToCollection();
    setTimeout(() => {
      btn.textContent = 'ADD TO COLLECTION';
      btn.disabled = false;
    }, 2500);
  } catch (err) {
    console.error(err);
    showStatus(err.message ?? 'Something went wrong.', 'error');
    btn.textContent = 'ADD TO COLLECTION';
    btn.disabled = false;
  }
}

// ── Go to collection ──────────────────────────────────────────────────────────

function enableGoToCollection() {
  const btn = document.getElementById('cfg-goto-btn');
  if (btn) btn.disabled = false;
}

export async function initGoToCollection() {
  if (!isLoggedIn()) return;
  try {
    const items = await getCart();
    if (items && items.length > 0) enableGoToCollection();
  } catch {
    // silently ignore — button stays disabled
  }
}

// ── Status message ────────────────────────────────────────────────────────────

function showStatus(msg, type = 'ok') {
  let el = document.getElementById('cfg-status');
  if (!el) return;
  el.textContent = msg;
  el.className = `cfg-status cfg-status--${type}`;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 3000);
}
