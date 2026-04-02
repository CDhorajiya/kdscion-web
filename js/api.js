const BASE_URL = 'https://fashion-backend-production-3ed9.up.railway.app/api/v1';

function getToken() {
  return localStorage.getItem('accessToken');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const text = await res.text();
  if (!text) return null;
  let data;
  try { data = JSON.parse(text); } catch (_) { data = null; }
  if (!res.ok) throw Object.assign(new Error(data?.message ?? 'Request failed'), { status: res.status, data });

  return data;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function register(email, password, firstName, lastName) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' });
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function refreshTokens() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const data = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export function isLoggedIn() {
  return !!getToken();
}

// ── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(page = 1, limit = 20) {
  const raw = await request(`/products?page=${page}&limit=${limit}`);
  if (Array.isArray(raw)) return { data: raw[0], total: raw[1] };
  return raw;
}

export async function getProduct(id) {
  return request(`/products/${id}`);
}

// ── Configurator ─────────────────────────────────────────────────────────────

export async function getProductOptions(productId) {
  return request(`/configurator/products/${productId}/options`);
}

export async function saveConfiguratorSession(productId, selections) {
  return request('/configurator/sessions', {
    method: 'POST',
    body: JSON.stringify({ productId, selections }),
  });
}

// ── Cart ─────────────────────────────────────────────────────────────────────

export async function getCart() {
  return request('/cart');
}

export async function getCartTotal(items) {
  return items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
}

export async function addToCart(productId, quantity, configuratorSessionId = null) {
  const body = { productId, quantity };
  if (configuratorSessionId) body.configuratorSessionId = configuratorSessionId;
  return request('/cart/items', { method: 'POST', body: JSON.stringify(body) });
}

export async function removeFromCart(itemId) {
  return request(`/cart/items/${itemId}`, { method: 'DELETE' });
}

// ── Orders ───────────────────────────────────────────────────────────────────

export async function placeOrder(shippingAddress, notes = '') {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({ shippingAddress, notes: notes || undefined }),
  });
}

export async function getOrders() {
  return request('/orders');
}

export async function getOrder(id) {
  return request(`/orders/${id}`);
}

// ── Measurements ──────────────────────────────────────────────────────────────

export async function getMeasurements() {
  return request('/users/me/measurements');
}

export async function saveMeasurements(data) {
  return request('/users/me/measurements', { method: 'POST', body: JSON.stringify(data) });
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function createPaymentIntent(orderId) {
  return request(`/payments/intent/${orderId}`, { method: 'POST' });
}

