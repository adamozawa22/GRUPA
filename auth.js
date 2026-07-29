/* ===== Genzie Hub — logowanie (Supabase Auth) =====
   Ten plik jest wspólny dla wszystkich podstron.
   Wymaga wcześniejszego wczytania:
     1) supabase-config.js
     2) SDK: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
*/

const _sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

const LOCK_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

let currentUser = null;

/* ---------- UI: modal logowania ---------- */
function buildLoginModal() {
  if (document.getElementById('login-modal')) return;
  const div = document.createElement('div');
  div.id = 'login-modal';
  div.onclick = closeLoginModal;
  div.innerHTML = `
    <div class="login-box" onclick="event.stopPropagation()">
      <h3>${LOCK_ICON_SVG} zaloguj się</h3>
      <p>Podaj login i hasło, które dostałeś/aś od admina.</p>
      <input type="email" id="login-email" placeholder="e-mail" autocomplete="username">
      <input type="password" id="login-pass" placeholder="hasło" autocomplete="current-password"
             onkeydown="if(event.key==='Enter') doLogin()">
      <div class="login-error" id="login-error"></div>
      <div class="login-btns">
        <button onclick="closeLoginModal()">anuluj</button>
        <button class="btn-primary" onclick="doLogin()">zaloguj</button>
      </div>
    </div>`;
  document.body.appendChild(div);
}

function openLoginModal() {
  buildLoginModal();
  document.getElementById('login-error').textContent = '';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value = '';
  document.getElementById('login-modal').style.display = 'flex';
  setTimeout(() => document.getElementById('login-email').focus(), 50);
}
function closeLoginModal() {
  const m = document.getElementById('login-modal');
  if (m) m.style.display = 'none';
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  const err = document.getElementById('login-error');
  err.textContent = '';
  if (!email || !pass) {
    err.textContent = 'Podaj e-mail i hasło.';
    return;
  }
  const { data, error } = await _sb.auth.signInWithPassword({ email, password: pass });
  if (error) {
    err.textContent = 'Złe dane logowania, spróbuj ponownie.';
    return;
  }
  currentUser = data.user;
  closeLoginModal();
  renderAuthUI();
  applyGalleryGate();
}

async function doLogout() {
  await _sb.auth.signOut();
  currentUser = null;
  renderAuthUI();
  applyGalleryGate();
}

/* ---------- topbar: pigułka logowania ---------- */
function renderAuthUI() {
  const slot = document.getElementById('auth-pill');
  if (!slot) return;
  if (currentUser) {
    const name =
      currentUser.user_metadata?.name ||
      currentUser.email.split('@')[0];
    slot.className = 'auth-pill logged-in';
    slot.innerHTML = `<span class="who">${name}</span><span class="logout-x" onclick="doLogout()">wyloguj</span>`;
  } else {
    slot.className = 'auth-pill';
    slot.textContent = 'zaloguj się';
    slot.onclick = openLoginModal;
  }
}

/* ---------- blokada galerii dla niezalogowanych ---------- */
function applyGalleryGate() {
  const gallerySection = document.getElementById('zdjecia');
  if (!gallerySection) return; // nie jesteśmy na stronie galerii

  let lockScreen = document.getElementById('gallery-lock-screen');
  const realContent = document.getElementById('gallery-real-content');

  if (!currentUser) {
    if (realContent) realContent.style.display = 'none';
    if (!lockScreen) {
      lockScreen = document.createElement('div');
      lockScreen.id = 'gallery-lock-screen';
      lockScreen.className = 'gallery-lock-screen';
      lockScreen.innerHTML = `
        <div class="lock-icon">${LOCK_ICON_SVG}</div>
        <div>Galeria jest tylko dla zalogowanych.</div>
        <button onclick="openLoginModal()">zaloguj się</button>`;
      gallerySection.appendChild(lockScreen);
    }
    lockScreen.style.display = 'block';
  } else {
    if (lockScreen) lockScreen.style.display = 'none';
    if (realContent) realContent.style.display = '';
  }
}

/* ---------- start ---------- */
async function initAuth() {
  buildLoginModal();
  const { data } = await _sb.auth.getSession();
  currentUser = data.session ? data.session.user : null;
  renderAuthUI();
  applyGalleryGate();

  _sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    renderAuthUI();
    applyGalleryGate();
  });
}

document.addEventListener('DOMContentLoaded', initAuth);
