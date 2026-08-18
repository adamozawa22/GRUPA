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
  afterAuthChange();
}

async function doLogout() {
  await _sb.auth.signOut();
  currentUser = null;
  afterAuthChange();
}

/* Wywoływane po każdej zmianie stanu logowania: odświeża pigułkę,
   blokady stron i (jeśli podstrona to definiuje) własny hak onAuthUpdate().
   Każdy krok jest odpalany osobno w try/catch, żeby błąd w jednym
   (np. w renderAuthUI) NIGDY nie zablokował odblokowania treści
   w applyContentGate — to był realny bug: jeśli renderAuthUI rzucał
   wyjątek, applyContentGate w ogóle się nie wykonywał i strona
   zostawała zablokowana mimo zalogowania. */
function afterAuthChange() {
  try { renderAuthUI(); } catch (e) { console.error('renderAuthUI error:', e); }
  try { applyContentGate(); } catch (e) { console.error('applyContentGate error:', e); }
  try {
    if (typeof window.onAuthUpdate === 'function') window.onAuthUpdate();
  } catch (e) { console.error('onAuthUpdate error:', e); }
}

/* ---------- topbar: pigułka logowania ---------- */
function renderAuthUI() {
  const slot = document.getElementById('auth-pill');
  if (!slot) return;
  if (currentUser) {
    const name =
      currentUser.user_metadata?.name ||
      currentUser.email.split('@')[0];
    const avatar = currentUser.user_metadata?.avatar_url;
    const avatarHtml = avatar
      ? `<img class="pfp" src="${avatar}" alt="">`
      : '';
    slot.className = 'auth-pill logged-in';
    slot.innerHTML = `${avatarHtml}<span class="who">${name}</span><span class="logout-x" onclick="doLogout()">wyloguj</span>`;
  } else {
    slot.className = 'auth-pill';
    slot.textContent = 'zaloguj się';
    slot.onclick = openLoginModal;
  }
}

/* ---------- blokada stron dla niezalogowanych (galeria + członkowie) ---------- */
function applyContentGate() {
  document.querySelectorAll('.gated-page').forEach((section) => {
    const realContent = section.querySelector('#gated-real-content');
    let lockScreen = section.querySelector('.gallery-lock-screen');
    const loading = section.querySelector('.gated-loading');

    // spinner "sprawdzanie dostępu..." ma się pokazywać tylko, zanim
    // wiadomo czy user jest zalogowany — jak już wiemy, chowamy go
    if (loading) loading.style.display = 'none';

    if (!currentUser) {
      if (realContent) realContent.style.display = 'none';
      if (!lockScreen) {
        lockScreen = document.createElement('div');
        lockScreen.className = 'gallery-lock-screen';
        lockScreen.innerHTML = `
          <div class="lock-icon">${LOCK_ICON_SVG}</div>
          <div>Ta strona jest tylko dla zalogowanych.</div>
          <button onclick="openLoginModal()">zaloguj się</button>`;
        section.appendChild(lockScreen);
      }
      lockScreen.style.display = 'block';
    } else {
      if (lockScreen) lockScreen.style.display = 'none';
      if (realContent) realContent.style.display = '';
    }
  });
}

/* ---------- start ---------- */
async function initAuth() {
  buildLoginModal();
  try {
    const { data, error } = await _sb.auth.getSession();
    if (error) console.error('getSession error:', error);
    currentUser = data && data.session ? data.session.user : null;
  } catch (e) {
    console.error('initAuth getSession failed:', e);
    currentUser = null;
  }
  afterAuthChange();

  _sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    afterAuthChange();
  });
}

document.addEventListener('DOMContentLoaded', initAuth);
