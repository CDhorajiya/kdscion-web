import {
  getProducts,
  getProductOptions,
  saveConfiguratorSession,
  addToCart,
  isLoggedIn,
} from './api.js';
import { openAuthModal } from './auth-modal.js';

let product = null;   // { id, sku, name, basePrice, ... }
let options = null;   // [ { id, label, values: [...] } ]
let selectedFabricId = null;  // value id e.g. "linen-1"

// ── Init ─────────────────────────────────────────────────────────────────────

export async function initConfigurator(sku) {
  const { data: products } = await getProducts(1, 50);
  product = products.find(p => p.sku === sku) ?? null;
  if (!product) { console.error('Product not found for SKU:', sku); return; }

  options = await getProductOptions(product.id);
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

function renderPrice() {
  const el = document.getElementById('cfg-price');
  if (!el || !product) return;
  const base = Number(product.basePrice);
  const selected = getSelectedValue();
  const modifier = selected ? Number(selected.value.priceModifier) : 0;
  const total = base + modifier;
  el.textContent = `$${total.toLocaleString()}`;
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

    showStatus('Added to cart.', 'ok');
    btn.textContent = 'ADDED ✓';
    showCheckoutLink();
    setTimeout(() => {
      btn.textContent = 'ADD TO CART';
      btn.disabled = false;
    }, 2500);
  } catch (err) {
    console.error(err);
    showStatus(err.message ?? 'Something went wrong.', 'error');
    btn.textContent = 'ADD TO CART';
    btn.disabled = false;
  }
}

// ── Checkout link ─────────────────────────────────────────────────────────────

function showCheckoutLink() {
  let el = document.getElementById('cfg-checkout-link');
  if (el) { el.style.display = 'block'; return; }
  const actions = document.querySelector('.cfg-actions');
  if (!actions) return;
  el = document.createElement('a');
  el.id = 'cfg-checkout-link';
  el.href = 'checkout.html';
  el.textContent = 'GO TO CHECKOUT →';
  el.style.cssText = `
    display:block; text-align:center; margin-top:.4rem;
    font-family:"Times New Roman",serif; font-size:1rem;
    letter-spacing:4px; text-transform:uppercase;
    color:rgba(255,255,255,0.5); text-decoration:none;
    transition:color .2s;
  `;
  el.addEventListener('mouseenter', () => el.style.color = '#fff');
  el.addEventListener('mouseleave', () => el.style.color = 'rgba(255,255,255,0.5)');
  actions.appendChild(el);
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
