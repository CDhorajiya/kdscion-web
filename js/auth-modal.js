/**
 * ============================================================
 *  auth-modal.js  —  Login / Register Modal
 * ============================================================
 *
 *  WHAT THIS FILE DOES
 *  --------------------
 *  Provides a floating modal dialog that lets the user sign in to
 *  an existing account or register a new one — all without leaving
 *  the current product page.
 *
 *  The modal is triggered whenever a logged-out user tries to do
 *  something that requires authentication (e.g. add to cart).
 *  After a successful login/register, a callback is fired so the
 *  original action (e.g. add to cart) resumes automatically.
 *
 *  HOW TO TRIGGER THE MODAL FROM ANOTHER FILE
 *  --------------------------------------------
 *    import { openAuthModal } from './auth-modal.js';
 *
 *    // Show the modal; when the user logs in, call myCallback():
 *    openAuthModal(() => myCallback());
 *
 *  LAZY INJECTION
 *  ---------------
 *  The modal HTML and CSS are NOT in any HTML file. They are created
 *  dynamically the first time openAuthModal() is called — this way
 *  pages that never need authentication are not bloated with hidden markup.
 *  The ensureModal() function checks if the modal already exists before
 *  creating it, so it's safe to call openAuthModal() multiple times.
 */

import { login, register } from './api.js';

// ── Modal HTML injection ──────────────────────────────────────────────────────

/**
 * ensureModal()
 * -------------
 * Checks whether the modal already exists in the DOM.
 * If not, creates it by:
 *   1. Inserting the HTML structure (tabs + forms) into <body>.
 *   2. Injecting the CSS styles into <head>.
 *   3. Binding all event listeners (close, tabs, form submissions).
 *
 * This is called every time openAuthModal() is called, but the guard
 * `if (document.getElementById('auth-modal')) return;` prevents duplicate
 * creation — the modal is built only once per page session.
 */
function ensureModal() {
  // Guard: modal already exists, nothing to do.
  if (document.getElementById('auth-modal')) return;

  // Inject the modal HTML at the very end of <body>.
  // Structure:
  //   #auth-modal          (the semi-transparent full-screen overlay)
  //     .auth-modal__box   (the white card in the centre)
  //       .auth-modal__tabs   → "Sign In" / "Register" tab buttons
  //       #auth-form-login    → email + password form
  //       #auth-form-register → first/last name + email + password form
  document.body.insertAdjacentHTML('beforeend', `
    <div id="auth-modal" class="auth-modal" role="dialog" aria-modal="true">
      <div class="auth-modal__box">

        <!-- ✕ close button in top-right corner -->
        <button class="auth-modal__close" id="auth-modal-close">✕</button>

        <!-- Tab switcher: "Sign In" | "Register" -->
        <div class="auth-modal__tabs">
          <button class="auth-tab active" data-tab="login">Sign In</button>
          <button class="auth-tab"        data-tab="register">Register</button>
        </div>

        <!-- Login form (shown by default) -->
        <form id="auth-form-login" class="auth-form active">
          <label>Email
            <input type="email"    id="login-email"    autocomplete="email"            required>
          </label>
          <label>Password
            <input type="password" id="login-password" autocomplete="current-password" required>
          </label>
          <p class="auth-error" id="login-error"></p>  <!-- error message placeholder -->
          <button type="submit" class="auth-submit">SIGN IN</button>
        </form>

        <!-- Register form (hidden until the Register tab is clicked) -->
        <form id="auth-form-register" class="auth-form">
          <label>First name
            <input type="text"     id="reg-first"    autocomplete="given-name"  required>
          </label>
          <label>Last name
            <input type="text"     id="reg-last"     autocomplete="family-name" required>
          </label>
          <label>Email
            <input type="email"    id="reg-email"    autocomplete="email"       required>
          </label>
          <label>Password <span style="opacity:.5;font-size:.9em">(min 8 chars)</span>
            <input type="password" id="reg-password" autocomplete="new-password" minlength="8" required>
          </label>
          <p class="auth-error" id="reg-error"></p>
          <button type="submit" class="auth-submit">CREATE ACCOUNT</button>
        </form>

      </div>
    </div>
  `);

  injectStyles();  // Add CSS for the modal.
  bindEvents();    // Wire up all click/submit listeners.
}

// ── CSS injection ─────────────────────────────────────────────────────────────

/**
 * injectStyles()
 * --------------
 * Creates a <style> element and appends it to <head>.
 * This is the only CSS for the modal — it lives here (in JS) so the
 * modal is fully self-contained and can be dropped into any page.
 */
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* The full-screen dark overlay */
    .auth-modal {
      display: none;                    /* hidden by default */
      position: fixed;
      inset: 0;                         /* covers the entire viewport */
      z-index: 9000;                    /* above everything else on the page */
      background: rgba(0,0,0,0.75);    /* semi-transparent dark background */
      backdrop-filter: blur(8px);       /* blurs the page behind the modal */
      -webkit-backdrop-filter: blur(8px);
      align-items: center;
      justify-content: center;
    }
    /* When the .open class is added, switch display to flex to show it */
    .auth-modal.open { display: flex; }

    /* The centred white/dark card */
    .auth-modal__box {
      position: relative;
      width: min(420px, 92vw);          /* responsive: max 420px, or 92% of screen */
      background: rgba(18,14,24,0.97); /* very dark, near-black background */
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px;
      padding: 3.2rem 3.2rem 2.8rem;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    }

    /* ✕ close button */
    .auth-modal__close {
      position: absolute;
      top: 1.4rem; right: 1.6rem;
      background: none; border: none;
      color: rgba(255,255,255,0.4);
      font-size: 1.2rem; cursor: pointer;
      transition: color .2s;
    }
    .auth-modal__close:hover { color: #fff; }

    /* Tab row: "Sign In" | "Register" */
    .auth-modal__tabs {
      display: flex;
      gap: 2rem;
      margin-bottom: 2.4rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 1.2rem;
    }
    .auth-tab {
      background: none; border: none;
      font-family: "Times New Roman", serif;
      font-size: 1.2rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.35);    /* dim by default */
      cursor: pointer; padding: 0;
      transition: color .2s;
    }
    .auth-tab.active { color: #fff; }   /* bright white when active */
    .auth-tab:hover  { color: rgba(255,255,255,0.8); }

    /* Each form — hidden by default, shown when its tab is active */
    .auth-form        { display: none;  flex-direction: column; gap: 1.4rem; }
    .auth-form.active { display: flex; }

    /* Label + input stacked vertically */
    .auth-form label {
      display: flex; flex-direction: column; gap: 0.5rem;
      font-family: "Times New Roman", serif;
      font-size: 1.3rem; letter-spacing: 2px;
      text-transform: uppercase; color: rgba(255,255,255,0.45);
    }
    .auth-form input {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15); border-radius: 2px;
      padding: 0.8rem 1rem;
      color: rgba(255,255,255,0.9);
      font-family: "Times New Roman", serif; font-size: 1.4rem;
      letter-spacing: 1px; outline: none;
      transition: border-color .2s;
    }
    .auth-form input:focus { border-color: rgba(255,255,255,0.5); }

    /* Red error message shown on failed login/register */
    .auth-error {
      margin: 0; min-height: 1.4rem;
      font-family: "Times New Roman", serif;
      font-size: 1.2rem; letter-spacing: 1px;
      color: rgba(220,140,140,0.9);
    }

    /* Submit button */
    .auth-submit {
      margin-top: 0.4rem; padding: 1rem;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.3); color: rgba(255,255,255,0.85);
      font-family: "Times New Roman", serif;
      font-size: 1.1rem; letter-spacing: 4px; text-transform: uppercase;
      cursor: pointer; border-radius: 3px;
      transition: background .2s, border-color .2s;
    }
    .auth-submit:hover:not(:disabled) {
      background: rgba(255,255,255,0.16);
      border-color: rgba(255,255,255,0.6); color: #fff;
    }
    .auth-submit:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(style);
}

// ── Event binding ─────────────────────────────────────────────────────────────

/**
 * bindEvents()
 * ------------
 * Attaches all interactive behaviours to the modal's elements:
 *   - Clicking ✕ or the overlay background closes the modal.
 *   - Clicking a tab switches the visible form.
 *   - Submitting the login form calls login() from api.js.
 *   - Submitting the register form calls register() from api.js.
 *
 * Called once after the modal HTML is first injected.
 */
function bindEvents() {
  // Close when the ✕ button is clicked.
  document.getElementById('auth-modal-close')
    .addEventListener('click', closeModal);

  // Close when the user clicks the dark overlay (outside the card).
  document.getElementById('auth-modal')
    .addEventListener('click', e => {
      // e.target is the element that was actually clicked.
      // If it's the overlay div itself (not the box inside it), close.
      if (e.target.id === 'auth-modal') closeModal();
    });

  // Tab switching: "Sign In" ↔ "Register"
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove 'active' from all tabs and forms.
      document.querySelectorAll('.auth-tab').forEach(t  => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f  => f.classList.remove('active'));
      // Activate the clicked tab and its corresponding form.
      tab.classList.add('active');
      document.getElementById(`auth-form-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // ── Login form submission ─────────────────────────────────────────────────
  document.getElementById('auth-form-login').addEventListener('submit', async e => {
    e.preventDefault();  // Stop the browser from doing a full page reload.
    const btn   = e.target.querySelector('.auth-submit');
    const errEl = document.getElementById('login-error');

    errEl.textContent = '';              // Clear any previous error.
    btn.disabled      = true;
    btn.textContent   = 'SIGNING IN…';   // Visual feedback while the request is in flight.

    try {
      // Call the login API (see api.js). Throws on failure.
      await login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value,
      );
      closeModal();      // Hide the modal on success.
      onAuthSuccess();   // Fire the callback so the interrupted action can resume.
    } catch (err) {
      // Show the server's error message, or a generic fallback.
      errEl.textContent = err.data?.message ?? err.message ?? 'Sign in failed.';
    } finally {
      // Always re-enable the button, regardless of success or failure.
      btn.disabled    = false;
      btn.textContent = 'SIGN IN';
    }
  });

  // ── Register form submission ──────────────────────────────────────────────
  document.getElementById('auth-form-register').addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = e.target.querySelector('.auth-submit');
    const errEl = document.getElementById('reg-error');

    errEl.textContent = '';
    btn.disabled      = true;
    btn.textContent   = 'CREATING…';

    try {
      await register(
        document.getElementById('reg-email').value,
        document.getElementById('reg-password').value,
        document.getElementById('reg-first').value,
        document.getElementById('reg-last').value,
      );
      closeModal();
      onAuthSuccess();
    } catch (err) {
      errEl.textContent = err.data?.message ?? err.message ?? 'Registration failed.';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'CREATE ACCOUNT';
    }
  });
}

// ── Success callback system ───────────────────────────────────────────────────
// When the modal is opened, the caller can supply a function to run after
// a successful login/register. This is stored here and called once.

let _onSuccess = null;  // Holds the callback until auth completes.

/**
 * onAuthSuccess()  [private]
 * --------------------------
 * Called after a successful login or register.
 * Fires the stored callback (if any) and then clears it so it can't
 * accidentally be called a second time.
 */
function onAuthSuccess() {
  if (_onSuccess) _onSuccess();
  _onSuccess = null;
}

// ── Public API ────────────────────────────────────────────────────────────────
// Only these two functions are exported — everything else is internal.

/**
 * openAuthModal(onSuccess)
 * -------------------------
 * Shows the login/register modal.
 *
 * @param {Function|null} onSuccess - Optional callback to run after the user
 *                                    successfully authenticates. Typical use:
 *                                    openAuthModal(() => addSelectedToCart());
 *
 * The modal is lazily created the first time this is called.
 */
export function openAuthModal(onSuccess = null) {
  ensureModal();           // Create the modal HTML/CSS if it doesn't exist yet.
  _onSuccess = onSuccess;  // Store the callback.
  document.getElementById('auth-modal').classList.add('open');  // Show the modal.
}

/**
 * closeModal()
 * ------------
 * Hides the modal by removing the 'open' CSS class.
 * The modal element stays in the DOM (it's just hidden) so it can be
 * re-opened instantly without being rebuilt.
 */
export function closeModal() {
  const m = document.getElementById('auth-modal');
  if (m) m.classList.remove('open');
}
