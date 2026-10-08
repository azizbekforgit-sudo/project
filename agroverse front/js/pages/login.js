/* pages/login.js — вход. Общая обёртка authShell() используется и в register.js */

/* Перевод частых ответов сервера на язык пользователя */
function authErrorText(msg) {
  const m = String(msg || '');
  if (/Invalid credentials|Invalid token/i.test(m)) return t('bad_credentials');
  if (/already registered/i.test(m)) return t('auth_phone_taken');
  if (/pattern|phone/i.test(m) && /should|match|valid/i.test(m)) return t('auth_phone_bad');
  if (/at least 6|min_length|password/i.test(m) && /short|least|should/i.test(m)) return t('auth_pass_short');
  return m || t('err_generic');
}

function authShell(bodyHtml) {
  const cur = (window.I18nManager && I18nManager.current) || 'uz';
  const art = typeof fieldSceneSvg === 'function' ? fieldSceneSvg() : '';
  return `
    <div class="auth2">
      <aside class="auth2-art" aria-hidden="true">
        ${art}
        <div class="auth2-art-text">
          <div class="auth2-brand"><span class="sb-logo-icon"><i class="fa-solid fa-seedling"></i></span> AgroVerse</div>
          <p>${t('auth_welcome')}</p>
        </div>
      </aside>
      <main class="auth2-main">
        <div class="auth2-top">
          <div class="auth2-brand small"><span class="sb-logo-icon"><i class="fa-solid fa-seedling"></i></span> AgroVerse</div>
          <div class="seg auth2-lang" role="group" aria-label="${t('choose_lang')}">
            ${I18nManager.langs().map(l => `<button type="button" class="seg-btn ${l.code === cur ? 'active' : ''}" onclick="I18nManager.set('${l.code}')">${l.label}</button>`).join('')}
          </div>
        </div>
        <div class="auth2-box">${bodyHtml}</div>
      </main>
    </div>`;
}

function passwordFieldHtml(id, placeholder, autocomplete) {
  return `
    <div class="pwd-wrap">
      <input type="password" id="${id}" class="pn-input" placeholder="${placeholder}" autocomplete="${autocomplete}" />
      <button type="button" class="pwd-toggle" onclick="togglePwd('${id}', this)" aria-label="${t('show_pass')}">
        <i class="fa-solid fa-eye"></i>
      </button>
    </div>`;
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.querySelector('i').className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  btn.setAttribute('aria-label', show ? t('hide_pass') : t('show_pass'));
}
window.togglePwd = togglePwd;

/* Сохранить вход и перейти на главную */
function finishAuth(data, toastKey) {
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('av_user', JSON.stringify(data.user));
  showToast(t(toastKey || 'login_success'), 'success');
  const dest = data.user && data.user.role === 'admin' ? '#/admin' : '#/home';
  setTimeout(() => window.location.hash = dest, 300);
}

/* ── Код из СМС: кнопка «Получить код», поле кода и таймер повтора ── */
function otpBlockHtml(prefix) {
  return `
    <div class="otp-block" id="${prefix}-otp">
      <button type="button" class="btn btn-outline btn-lg btn-full" id="${prefix}-otp-send">
        <i class="fa-solid fa-comment-sms"></i> <span>${t('otp_get')}</span>
      </button>
      <label class="auth2-field" id="${prefix}-otp-field" hidden>
        <span>${t('otp_code')}</span>
        <input type="text" id="${prefix}-code" class="pn-input otp-input" inputmode="numeric" autocomplete="one-time-code" maxlength="5" placeholder="•••••" />
        <small class="otp-note" id="${prefix}-otp-note"></small>
      </label>
    </div>`;
}

function bindOtp(prefix, purpose, getPhone, showErr) {
  const btn = document.getElementById(`${prefix}-otp-send`);
  if (!btn) return;
  let timer = null;
  btn.addEventListener('click', async () => {
    const phone = getPhone();
    if (phone.replace(/\D/g, '').length < 10) return showErr(t('auth_phone_bad'));
    btn.disabled = true;
    try {
      const r = await API.sendOtp({ phone, purpose });
      document.getElementById(`${prefix}-otp-field`).hidden = false;
      document.getElementById(`${prefix}-otp-note`).textContent = t('otp_sent');
      document.getElementById(`${prefix}-code`).focus();
      let left = r.resend_in || 60;
      clearInterval(timer);
      const span = btn.querySelector('span');
      const tick = () => {
        if (left <= 0) { clearInterval(timer); btn.disabled = false; span.textContent = t('otp_again'); return; }
        span.textContent = `${t('otp_again')} · ${left--}`;
      };
      tick(); timer = setInterval(tick, 1000);
    } catch (e) {
      btn.disabled = false;
      showErr(authErrorText(e.message));
    }
  });
}

/* ── Вход через Google (кнопка видна, только если на сервере задан GOOGLE_CLIENT_ID) ── */
let _gisLoading = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!_gisLoading) {
    _gisLoading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return _gisLoading;
}

async function mountGoogleButton(boxId, showErr) {
  const cfg = await loadAppConfig();
  const box = document.getElementById(boxId);
  if (!box || !cfg.google_client_id) return;
  try {
    await loadGoogleScript();
    box.hidden = false;
    google.accounts.id.initialize({
      client_id: cfg.google_client_id,
      callback: (resp) => googleSignIn(resp.credential, showErr),
    });
    google.accounts.id.renderButton(box.querySelector('.g-btn'), {
      theme: 'outline', size: 'large', shape: 'pill', text: 'continue_with',
      width: Math.min(box.clientWidth || 360, 400), locale: I18nManager.current,
    });
  } catch { box.hidden = true; }
}

async function googleSignIn(credential, showErr) {
  try {
    const r = await API.googleAuth({ credential });
    if (r.need_profile) return renderGoogleProfile(credential, r);
    finishAuth(r);
  } catch (e) { showErr(authErrorText(e.message)); }
}

/* Новый пользователь из Google: телефон (его увидит вторая сторона заказа) и роль */
async function renderGoogleProfile(credential, info) {
  const cfg = await loadAppConfig();
  document.getElementById('app').innerHTML = authShell(`
    <h1 class="auth2-title">${t('g_finish_title')}</h1>
    <p class="auth2-sub">${escHtml(info.name)} · ${escHtml(info.email)}</p>
    <div id="g-error" class="auth2-note err" role="alert" hidden></div>
    <form id="g-form" class="auth2-form" novalidate>
      <fieldset class="auth2-role">
        <legend>${t('auth_who')}</legend>
        <label class="role-card"><input type="radio" name="role" value="xaridor" checked />
          <span class="role-ic"><i class="fa-solid fa-basket-shopping"></i></span><b>${t('auth_buyer')}</b><small>${t('auth_buyer_d')}</small></label>
        <label class="role-card"><input type="radio" name="role" value="fermer" />
          <span class="role-ic"><i class="fa-solid fa-wheat-awn"></i></span><b>${t('auth_farmer')}</b><small>${t('auth_farmer_d')}</small></label>
      </fieldset>
      <label class="auth2-field"><span>${t('auth_phone')}</span>
        <input type="tel" id="g-phone" class="pn-input" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" />
        <small class="otp-note">${t('g_phone_why')}</small>
      </label>
      ${cfg.sms_enabled ? otpBlockHtml('g') : ''}
      <button type="submit" class="btn btn-primary btn-lg btn-full" id="g-btn"><i class="fa-solid fa-check"></i> <span>${t('auth_reg_btn')}</span></button>
    </form>`);
  const errBox = document.getElementById('g-error');
  const showErr = (text) => { errBox.textContent = text; errBox.hidden = false; };
  const getPhone = () => normalizePhone(document.getElementById('g-phone').value);
  bindOtp('g', 'register', getPhone, showErr);
  document.getElementById('g-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    const phone = getPhone();
    if (phone.replace(/\D/g, '').length < 10) return showErr(t('auth_phone_bad'));
    const code = document.getElementById('g-code')?.value.trim();
    if (cfg.sms_enabled && !code) return showErr(t('otp_need'));
    const role = document.querySelector('#g-form input[name="role"]:checked').value;
    try {
      const r = await API.googleAuth({ credential, phone, role, code });
      if (r.access_token) finishAuth(r, 'auth_reg_ok');
    } catch (err) { showErr(authErrorText(err.message)); }
  });
}

async function renderLogin() {
  const app = document.getElementById('app');
  const pending = popPendingMessage();

  app.innerHTML = authShell(`
    <h1 class="auth2-title">${t('auth_login_title')}</h1>
    <p class="auth2-sub">${t('auth_login_sub')}</p>
    ${pending ? `<div class="auth2-note ok">${pending}</div>` : ''}
    <div id="login-error" class="auth2-note err" role="alert" hidden></div>

    <div class="seg" id="login-mode" role="tablist" hidden>
      <button type="button" class="seg-btn active" data-mode="pass" role="tab"><i class="fa-solid fa-key"></i> ${t('auth_password')}</button>
      <button type="button" class="seg-btn" data-mode="sms" role="tab"><i class="fa-solid fa-comment-sms"></i> ${t('otp_mode')}</button>
    </div>

    <form id="login-form" class="auth2-form" novalidate>
      <label class="auth2-field">
        <span>${t('auth_phone')}</span>
        <input type="tel" id="phone" class="pn-input" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" />
      </label>
      <label class="auth2-field" id="pass-field">
        <span>${t('auth_password')}</span>
        ${passwordFieldHtml('password', '••••••', 'current-password')}
      </label>
      <div id="sms-field" hidden>${otpBlockHtml('lg')}</div>
      <button type="submit" class="btn btn-primary btn-lg btn-full" id="login-btn">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> <span>${t('login')}</span>
      </button>
    </form>

    <div class="auth2-or" id="google-box" hidden>
      <span>${t('or_word')}</span>
      <div class="g-btn"></div>
    </div>

    <div class="auth2-switch">
      <span>${t('no_account')}</span>
      <button type="button" class="btn btn-outline btn-lg btn-full" onclick="router.go('/register')">
        <i class="fa-solid fa-user-plus"></i> ${t('auth_to_reg')}
      </button>
    </div>
  `);

  const form = document.getElementById('login-form');
  const btn = document.getElementById('login-btn');
  const errBox = document.getElementById('login-error');
  const showErr = (text) => { errBox.textContent = text; errBox.hidden = false; };
  const getPhone = () => normalizePhone(document.getElementById('phone').value);
  let mode = 'pass';

  // СМС-вход и Google показываем, только если они настроены на сервере
  loadAppConfig().then(cfg => {
    if (cfg.sms_enabled) document.getElementById('login-mode').hidden = false;
  });
  document.querySelectorAll('#login-mode .seg-btn').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    document.querySelectorAll('#login-mode .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    document.getElementById('pass-field').hidden = mode !== 'pass';
    document.getElementById('sms-field').hidden = mode !== 'sms';
    errBox.hidden = true;
  }));
  bindOtp('lg', 'login', getPhone, showErr);
  mountGoogleButton('google-box', showErr);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = getPhone();
    errBox.hidden = true;
    if (phone.replace(/\D/g, '').length < 10) return showErr(t('auth_phone_bad'));

    btn.disabled = true;
    btn.querySelector('span').textContent = t('logging_in');
    try {
      let data;
      if (mode === 'sms') {
        const code = document.getElementById('lg-code').value.trim();
        if (!code) throw new Error(t('otp_need'));
        data = await API.verifyOtp({ phone, code });
      } else {
        const password = document.getElementById('password').value;
        if (!password) throw new Error(t('fill_all'));
        data = await API.login({ phone, password });
      }
      finishAuth(data);
    } catch (err) {
      if (err.message === 'BLOCKED') return;
      showErr(authErrorText(err.message));
      btn.disabled = false;
      btn.querySelector('span').textContent = t('login');
    }
  });
}

window.renderLogin = renderLogin;
window.authShell = authShell;
window.authErrorText = authErrorText;
window.passwordFieldHtml = passwordFieldHtml;
window.otpBlockHtml = otpBlockHtml;
window.bindOtp = bindOtp;
window.mountGoogleButton = mountGoogleButton;
window.finishAuth = finishAuth;
