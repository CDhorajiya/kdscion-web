/**
 * ============================================================
 *  api.js  —  HTTP Communication Layer
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  Every time the website needs to talk to the server (log a
 *  user in, fetch products, save a cart item, place an order,
 *  etc.) the call goes through this file.
 *
 *  Think of it as a "post office" — every request is wrapped
 *  in a standard envelope (the `request` function below),
 *  stamped with the user's login token, sent to the backend,
 *  and the reply is unwrapped before returning it to the caller.
 *
 *  BACKEND
 *  -------
 *  The backend is a REST API hosted on Railway:
 *    https://fashion-backend-production-3ed9.up.railway.app/api/v1
 *
 *  HOW AUTHENTICATION WORKS
 *  ------------------------
 *  When a user logs in, the server returns two tokens:
 *    - accessToken  → short-lived, sent with every request as a
 *                     Bearer header to prove identity.
 *    - refreshToken → long-lived, used only to get a new
 *                     accessToken when the old one expires.
 *  Both tokens are stored in the browser's localStorage so they
 *  survive page refreshes.
 *
 *  HOW TO USE THIS FILE IN OTHER FILES
 *  ------------------------------------
 *  Import only what you need, e.g.:
 *    import { login, addToCart, isLoggedIn } from './api.js';
 */

// Root URL of the backend API — all endpoint paths are appended to this.
const BASE_URL = 'https://fashion-backend-production-3ed9.up.railway.app/api/v1';

/**
 * getToken()
 * ----------
 * Reads the user's access token from localStorage.
 * Returns null if the user is not logged in.
 */
function getToken() {
  return localStorage.getItem('accessToken');
}

/**
 * request(path, options)
 * ----------------------
 * The single low-level function that all other functions call.
 *
 * @param {string} path     - API endpoint relative path, e.g. '/products?page=1'
 * @param {object} options  - Standard fetch() options (method, body, headers, etc.)
 * @returns {Promise<any>}  - Parsed JSON response, or null for empty responses.
 * @throws {Error}          - If the server returns a non-2xx status code.
 *
 * How it works step by step:
 *  1. Look up the stored access token.
 *  2. Build headers — always send JSON, and attach the token when available.
 *  3. Call the browser's native fetch() to make the HTTP request.
 *  4. If the server replies with 204 No Content, return null immediately.
 *  5. Read the raw response text, parse it as JSON.
 *  6. If the status is not OK (e.g. 401, 404, 500), throw an error so the
 *     calling code can show the user a meaningful message.
 *  7. Otherwise, return the parsed data.
 */
async function request(path, options = {}) {
  const token = getToken();

  // Merge caller-supplied headers with our defaults.
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  // Attach the Bearer token if the user is logged in.
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Make the actual HTTP call.
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 204 = "No Content" — server succeeded but has nothing to return.
  if (res.status === 204) return null;

  // Read the raw body text (even if it might be empty or not JSON).
  const text = await res.text();
  if (!text) return null;

  // Try to parse the body as JSON; fall back to null if parsing fails.
  let data;
  try { data = JSON.parse(text); } catch (_) { data = null; }

  // If the server signalled an error, throw so callers can catch it.
  if (!res.ok)
    throw Object.assign(
      new Error(data?.message ?? 'Request failed'),
      { status: res.status, data }   // attach status & data for richer error handling
    );

  return data;
}

// ── Auth ─────────────────────────────────────────────────────────────────────
// Functions for registering, logging in, and logging out users.
// After a successful login/register the tokens are stored in localStorage
// so all subsequent requests are automatically authenticated.

/**
 * register(email, password, firstName, lastName)
 * -----------------------------------------------
 * Creates a new user account on the server, then stores the returned
 * tokens so the user is immediately logged in.
 */
export async function register(email, password, firstName, lastName) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  localStorage.setItem('accessToken',  data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

/**
 * login(email, password)
 * -----------------------
 * Authenticates an existing user. On success, stores the access and
 * refresh tokens in localStorage so future requests carry them.
 */
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('accessToken',  data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

/**
 * logout()
 * --------
 * Tells the server the user is logging out (so it can invalidate the
 * refresh token server-side), then clears the tokens from localStorage.
 */
export async function logout() {
  await request('/auth/logout', { method: 'POST' });
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

/**
 * refreshTokens()
 * ---------------
 * When the access token expires, this function sends the refresh token
 * to get a brand-new pair of tokens without the user having to log in
 * again. Called automatically by the backend when needed.
 */
export async function refreshTokens() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) throw new Error('No refresh token');
  const data = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
  localStorage.setItem('accessToken',  data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

/**
 * isLoggedIn()
 * ------------
 * Simple helper: returns true if an access token exists in localStorage,
 * false otherwise. Used throughout the UI to show/hide login-gated features.
 */
export function isLoggedIn() {
  return !!getToken();   // !! converts the token string (or null) to a boolean
}

// ── Products ──────────────────────────────────────────────────────────────────
// Functions to fetch the design catalogue from the server.

/**
 * getProducts(page, limit)
 * ------------------------
 * Fetches a paginated list of products from the server.
 * The API can return the data either as a plain array or as an object
 * with { data, total } shape — both are normalised here so callers always
 * receive { data: [...], total: number }.
 *
 * @param {number} page  - Which page to fetch (1-based).
 * @param {number} limit - How many items per page.
 */
export async function getProducts(page = 1, limit = 20) {
  const raw = await request(`/products?page=${page}&limit=${limit}`);
  // The backend sometimes returns [data[], count] tuple — normalise it.
  if (Array.isArray(raw)) return { data: raw[0], total: raw[1] };
  return raw;
}

/**
 * getProduct(id)
 * --------------
 * Fetches a single product by its numeric backend ID.
 * Used when you already know the ID (e.g. after searching by SKU).
 */
export async function getProduct(id) {
  return request(`/products/${id}`);
}

// ── Configurator ──────────────────────────────────────────────────────────────
// The "configurator" is the fabric-selection + pricing system on each product
// page. When a customer picks a fabric, a "session" is saved on the server
// so the cart item knows exactly which fabric was chosen.

/**
 * getProductOptions(productId)
 * ----------------------------
 * Fetches the available fabric options for a specific product.
 * Each option represents a dimension of customisation (e.g. "Fabric").
 * Each option has multiple values (e.g. "Cotton 1", "Linen 2").
 */
export async function getProductOptions(productId) {
  return request(`/configurator/products/${productId}/options`);
}

/**
 * saveConfiguratorSession(productId, selections)
 * -----------------------------------------------
 * Saves the customer's current fabric selections to the server.
 * Returns a session object with an `id` that is later attached to the
 * cart item so the workshop knows what was ordered.
 *
 * @param {number} productId   - Backend ID of the product.
 * @param {object} selections  - Map of optionId → selectedValue object.
 */
export async function saveConfiguratorSession(productId, selections) {
  return request('/configurator/sessions', {
    method: 'POST',
    body: JSON.stringify({ productId, selections }),
  });
}

// ── Cart ──────────────────────────────────────────────────────────────────────
// Functions to read and modify the shopping cart.

/**
 * getCart()
 * ---------
 * Returns the current user's cart as an array of cart-item objects.
 * Each item has: productId, quantity, unitPrice, configuratorSessionId, etc.
 */
export async function getCart() {
  return request('/cart');
}

/**
 * getCartTotal(items)
 * -------------------
 * Client-side helper — calculates the order total from cart items already
 * fetched. Does NOT call the server.
 *
 * @param {Array} items - Cart items array from getCart().
 */
export async function getCartTotal(items) {
  return items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
}

/**
 * addToCart(productId, quantity, configuratorSessionId)
 * ------------------------------------------------------
 * Adds an item to the user's cart on the server.
 * If the product was configured (fabric chosen), pass the session ID so
 * the cart item records exactly what was selected.
 */
export async function addToCart(productId, quantity, configuratorSessionId = null) {
  const body = { productId, quantity };
  if (configuratorSessionId) body.configuratorSessionId = configuratorSessionId;
  return request('/cart/items', { method: 'POST', body: JSON.stringify(body) });
}

/**
 * removeFromCart(itemId)
 * ----------------------
 * Deletes a specific cart item by its ID. The cart item ID is different
 * from the product ID — it is the unique row in the cart table.
 */
export async function removeFromCart(itemId) {
  return request(`/cart/items/${itemId}`, { method: 'DELETE' });
}

// ── Orders ────────────────────────────────────────────────────────────────────
// Converting a cart into a confirmed order and viewing past orders.

/**
 * placeOrder(shippingAddress, notes)
 * -----------------------------------
 * Creates an order from the customer's current cart. After this call
 * the cart is cleared and a permanent order record is created.
 *
 * @param {object} shippingAddress - { line1, city, country, postalCode, ... }
 * @param {string} notes           - Optional instructions from the customer.
 */
export async function placeOrder(shippingAddress, notes = '') {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({ shippingAddress, notes: notes || undefined }),
  });
}

/** getOrders() — Returns the current user's full order history. */
export async function getOrders() {
  return request('/orders');
}

/** getOrder(id) — Returns a single order's details by ID. */
export async function getOrder(id) {
  return request(`/orders/${id}`);
}

// ── Measurements ──────────────────────────────────────────────────────────────
// KD Scion makes garments to exact body measurements.
// These functions save and retrieve the customer's body data.

/**
 * getMeasurements()
 * -----------------
 * Retrieves the body measurements the customer previously saved.
 * Returns an object with fields like chest, waist, hip, height, etc.
 */
export async function getMeasurements() {
  return request('/users/me/measurements');
}

/**
 * saveMeasurements(data)
 * ----------------------
 * Saves (or overwrites) the customer's body measurements on the server.
 * @param {object} data - Measurement fields, e.g. { chest: 38, waist: 30 }
 */
export async function saveMeasurements(data) {
  return request('/users/me/measurements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────

/**
 * createPaymentIntent(orderId)
 * ----------------------------
 * Asks the backend to create a Stripe Payment Intent for the given order.
 * Returns a client secret that the front-end uses to collect the card
 * details via the Stripe.js library on the checkout page.
 */
export async function createPaymentIntent(orderId) {
  return request(`/payments/intent/${orderId}`, { method: 'POST' });
}
