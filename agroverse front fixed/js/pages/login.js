function renderLogin() {
  const app = document.getElementById('app');
  const pending = popPendingMessage();

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-lang">
          <select class="lang-select" onchange="I18nManager.set(this.value)">
            ${(window.I18nManager?I18nManager.langs():[]).map(l=>`<option value="${l.code}" ${l.code===I18nManager.current?'selected':''}>${l.label}</option>`).join('')}
          </select>
        </div>
        <div class="auth-logo">
          <div class="logo"><i class="fi fi-sr-seedling"></i> <span>Agro</span>Verse</div>
          <p>${t('login_subtitle')}</p>
        </div>

        <h2 class="auth-title">${t('login_to_account')}</h2>

        ${pending ? `<div class="form-error" style="background:#d4edda;border-color:#c3e6cb;color:#155724;">${pending}</div>` : ''}
        <div id="login-error" class="form-error hidden"></div>

        <div class="form-group">
          <label for="phone">${t('phone')}</label>
          <input type="tel" id="phone" placeholder="+998 90 000 00 00" required />
        </div>

        <div class="form-group">
          <label for="password">${t('password_label')}</label>
          <div class="pwd-wrap">
            <input type="password" id="password" placeholder="••••••••" required />
            <button type="button" class="pwd-toggle" id="pwd-toggle" title="${t('show_pass')}"><i class="fi fi-rr-eye"></i></button>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="login-btn">${t('login')}</button>

        <div class="auth-divider"><span>${t('or_continue')}</span></div>
        <button class="btn btn-google btn-full" id="google-btn"><i class="fi fi-brands-google"></i> ${t('google_btn')}</button>

        <div class="auth-footer">
          ${t('no_account')} <a href="#/register" onclick="router.go('/register'); return false;">${t('register')}</a>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById('login-btn');
  const errBox = document.getElementById('login-error');

  async function handleLogin() {
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;

    if (!phone || !password) {
      errBox.textContent = t('fill_all');
      errBox.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = t('logging_in');
    errBox.classList.add('hidden');

    try {
      const data = await API.login({ phone, password });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('av_user', JSON.stringify(data.user));
      showToast('✅ ' + t('login_success'), 'success');
      const dest = data.user && data.user.role === 'admin' ? '#/admin' : '#/home';
      setTimeout(() => window.location.hash = dest, 400);
    } catch (e) {
      console.error('Login error:', e);
      if (e.message === 'BLOCKED') return;
      errBox.textContent = e.message || t('bad_credentials');
      errBox.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = t('login');
    }
  }

  // toggle пароля
  const pt = document.getElementById('pwd-toggle');
  if (pt) pt.addEventListener('click', () => {
    const inp = document.getElementById('password');
    const showing = inp.type === 'text';
    inp.type = showing ? 'password' : 'text';
    pt.querySelector('i').className = showing ? 'fi fi-rr-eye' : 'fi fi-rr-eye-crossed';
    pt.title = showing ? t('show_pass') : t('hide_pass');
  });
  // Google (фронт-заглушка)
  const gb = document.getElementById('google-btn');
  if (gb) gb.addEventListener('click', () => showToast(t('soon_toast'), 'info'));

  btn.addEventListener('click', handleLogin);
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

window.renderLogin = renderLogin;
