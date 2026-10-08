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

function renderLogin() {
  const app = document.getElementById('app');
  const pending = popPendingMessage();

  app.innerHTML = authShell(`
    <h1 class="auth2-title">${t('auth_login_title')}</h1>
    <p class="auth2-sub">${t('auth_login_sub')}</p>
    ${pending ? `<div class="auth2-note ok">${pending}</div>` : ''}
    <div id="login-error" class="auth2-note err" role="alert" hidden></div>

    <form id="login-form" class="auth2-form" novalidate>
      <label class="auth2-field">
        <span>${t('auth_phone')}</span>
        <input type="tel" id="phone" class="pn-input" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" />
      </label>
      <label class="auth2-field">
        <span>${t('auth_password')}</span>
        ${passwordFieldHtml('password', '••••••', 'current-password')}
      </label>
      <button type="submit" class="btn btn-primary btn-lg btn-full" id="login-btn">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> <span>${t('login')}</span>
      </button>
    </form>

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

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = normalizePhone(document.getElementById('phone').value);
    const password = document.getElementById('password').value;
    errBox.hidden = true;

    if (!phone || !password) return showErr(t('fill_all'));
    if (phone.replace(/\D/g, '').length < 10) return showErr(t('auth_phone_bad'));

    btn.disabled = true;
    btn.querySelector('span').textContent = t('logging_in');
    try {
      const data = await API.login({ phone, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('av_user', JSON.stringify(data.user));
      showToast(t('login_success'), 'success');
      const dest = data.user && data.user.role === 'admin' ? '#/admin' : '#/home';
      setTimeout(() => window.location.hash = dest, 300);
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
