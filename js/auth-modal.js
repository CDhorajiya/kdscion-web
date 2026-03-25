import { login, register } from './api.js';

// ── Inject modal HTML once ────────────────────────────────────────────────────

function ensureModal() {
  if (document.getElementById('auth-modal')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="auth-modal" class="auth-modal" role="dialog" aria-modal="true">
      <div class="auth-modal__box">
        <button class="auth-modal__close" id="auth-modal-close">✕</button>

        <div class="auth-modal__tabs">
          <button class="auth-tab active" data-tab="login">Sign In</button>
          <button class="auth-tab" data-tab="register">Register</button>
        </div>

        <!-- Login -->
        <form id="auth-form-login" class="auth-form active">
          <label>Email
            <input type="email" id="login-email" autocomplete="email" required>
          </label>
          <label>Password
            <input type="password" id="login-password" autocomplete="current-password" required>
          </label>
          <p class="auth-error" id="login-error"></p>
          <button type="submit" class="auth-submit">SIGN IN</button>
        </form>

        <!-- Register -->
        <form id="auth-form-register" class="auth-form">
          <label>First name
            <input type="text" id="reg-first" autocomplete="given-name" required>
          </label>
          <label>Last name
            <input type="text" id="reg-last" autocomplete="family-name" required>
          </label>
          <label>Email
            <input type="email" id="reg-email" autocomplete="email" required>
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

  injectStyles();
  bindEvents();
}

// ── Styles ────────────────────────────────────────────────────────────────────

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .auth-modal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9000;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      align-items: center;
      justify-content: center;
    }
    .auth-modal.open { display: flex; }

    .auth-modal__box {
      position: relative;
      width: min(420px, 92vw);
      background: rgba(18,14,24,0.97);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px;
      padding: 3.2rem 3.2rem 2.8rem;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    }

    .auth-modal__close {
      position: absolute;
      top: 1.4rem; right: 1.6rem;
      background: none; border: none;
      color: rgba(255,255,255,0.4);
      font-size: 1.2rem; cursor: pointer;
      transition: color .2s;
    }
    .auth-modal__close:hover { color: #fff; }

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
      color: rgba(255,255,255,0.35);
      cursor: pointer;
      padding: 0;
      transition: color .2s;
    }
    .auth-tab.active { color: #fff; }
    .auth-tab:hover { color: rgba(255,255,255,0.8); }

    .auth-form { display: none; flex-direction: column; gap: 1.4rem; }
    .auth-form.active { display: flex; }

    .auth-form label {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-family: "Times New Roman", serif;
      font-size: 1rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.45);
    }
    .auth-form input {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 2px;
      padding: 0.8rem 1rem;
      color: rgba(255,255,255,0.9);
      font-family: "Times New Roman", serif;
      font-size: 1.1rem;
      letter-spacing: 1px;
      outline: none;
      transition: border-color .2s;
    }
    .auth-form input:focus { border-color: rgba(255,255,255,0.5); }

    .auth-error {
      margin: 0;
      min-height: 1.4rem;
      font-family: "Times New Roman", serif;
      font-size: 0.95rem;
      letter-spacing: 1px;
      color: rgba(220,140,140,0.9);
    }

    .auth-submit {
      margin-top: 0.4rem;
      padding: 1rem;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.3);
      color: rgba(255,255,255,0.85);
      font-family: "Times New Roman", serif;
      font-size: 1.1rem;
      letter-spacing: 4px;
      text-transform: uppercase;
      cursor: pointer;
      border-radius: 3px;
      transition: background .2s, border-color .2s;
    }
    .auth-submit:hover:not(:disabled) {
      background: rgba(255,255,255,0.16);
      border-color: rgba(255,255,255,0.6);
      color: #fff;
    }
    .auth-submit:disabled { opacity: 0.5; cursor: default; }
  `;
  document.head.appendChild(style);
}

// ── Events ────────────────────────────────────────────────────────────────────

function bindEvents() {
  // Close
  document.getElementById('auth-modal-close').addEventListener('click', closeModal);
  document.getElementById('auth-modal').addEventListener('click', e => {
    if (e.target.id === 'auth-modal') closeModal();
  });

  // Tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`auth-form-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Login form
  document.getElementById('auth-form-login').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('.auth-submit');
    const errEl = document.getElementById('login-error');
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'SIGNING IN…';
    try {
      await login(
        document.getElementById('login-email').value,
        document.getElementById('login-password').value,
      );
      closeModal();
      onAuthSuccess();
    } catch (err) {
      errEl.textContent = err.data?.message ?? err.message ?? 'Sign in failed.';
    } finally {
      btn.disabled = false; btn.textContent = 'SIGN IN';
    }
  });

  // Register form
  document.getElementById('auth-form-register').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('.auth-submit');
    const errEl = document.getElementById('reg-error');
    errEl.textContent = '';
    btn.disabled = true; btn.textContent = 'CREATING…';
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
      btn.disabled = false; btn.textContent = 'CREATE ACCOUNT';
    }
  });
}

// ── Success callback (set externally) ─────────────────────────────────────────

let _onSuccess = null;

function onAuthSuccess() {
  if (_onSuccess) _onSuccess();
  _onSuccess = null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function openAuthModal(onSuccess = null) {
  ensureModal();
  _onSuccess = onSuccess;
  document.getElementById('auth-modal').classList.add('open');
}

export function closeModal() {
  const m = document.getElementById('auth-modal');
  if (m) m.classList.remove('open');
}
