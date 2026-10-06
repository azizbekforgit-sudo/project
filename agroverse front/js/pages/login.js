function renderLogin() {
  const app = document.getElementById('app');
  const pending = popPendingMessage();

  app.innerHTML = `
    <style>
      .reg-split { display: flex; min-height: 100vh; background: #F8FAF6; }
      .reg-image-side { 
        flex: 1; background: url('https://images.unsplash.com/photo-1595841696677-6489ff3f8cd1?auto=format&fit=crop&w=1200&q=80') center/cover;
        position: relative; display: none; 
      }
      @media (min-width: 900px) { .reg-image-side { display: block; } }
      .reg-image-overlay {
        position: absolute; inset: 0; background: linear-gradient(180deg, rgba(20,70,44,0.3) 0%, rgba(20,70,44,0.8) 100%);
        display: flex; flex-direction: column; justify-content: flex-end; padding: 60px;
      }
      .rio-title { color: #FFF; font-family: var(--font-display); font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 16px; }
      .rio-text { color: rgba(255,255,255,0.9); font-size: 18px; max-width: 400px; }
      .reg-form-side { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 24px; }
      .reg-box { width: 100%; max-width: 440px; }
      .reg-header { margin-bottom: 32px; text-align: center; }
      .reg-logo { font-size: 32px; margin-bottom: 16px; text-decoration: none; display: inline-block; }
      .reg-title { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: #111827; margin-bottom: 12px; }
      .reg-subtitle { color: #6b7280; font-size: 15px; }
    </style>
    <div class="reg-split">
      <div class="reg-image-side">
        <div class="reg-image-overlay">
          <div class="rio-title">С возвращением<br/>в AgroVerse</div>
          <div class="rio-text">Прямой доступ к лучшим фермерским продуктам и оптовым рынкам без посредников.</div>
        </div>
      </div>
      <div class="reg-form-side">
        <div class="reg-box">
          <div class="reg-header">
            <a href="#/home" class="reg-logo">🌿</a>
            <h2 class="reg-title">Вход в систему</h2>
            <p class="reg-subtitle">Введите ваши данные для входа</p>
          </div>

          ${pending ? `<div class="form-error" style="background:#d4edda;border-color:#c3e6cb;color:#155724;">${pending}</div>` : ''}
          <div id="login-error" class="form-error hidden"></div>

          <div class="form-group">
            <label for="phone">Номер телефона</label>
            <input type="tel" id="phone" class="pn-input" placeholder="+998 90 000 00 00" required />
          </div>

          <div class="form-group">
            <label for="password">Пароль</label>
            <div class="pwd-wrap">
              <input type="password" id="password" class="pn-input" placeholder="••••••••" required />
              <button type="button" class="pwd-toggle" id="pwd-toggle" title="${t('show_pass')}"><i class="fi fi-rr-eye"></i></button>
            </div>
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="login-btn" style="margin-top:24px">Войти</button>

          <div style="text-align:center; margin-top: 24px; color: #6b7280; font-size: 14px;">
            Нет аккаунта? <a href="#/register" onclick="router.go('/register'); return false;" style="color: #1B5C3B; font-weight: 600; text-decoration: none;">Зарегистрироваться</a>
          </div>
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
      showToast(`${fe('✅',16)} ` + t('login_success'), 'success');
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
