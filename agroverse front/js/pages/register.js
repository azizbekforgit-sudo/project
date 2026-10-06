function renderRegister() {
  const app = document.getElementById('app');

    app.innerHTML = `
    <style>
      .reg-split {
        display: flex;
        min-height: 100vh;
        background: #F8FAF6;
      }
      .reg-image-side {
        flex: 1;
        background: url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80') center/cover;
        position: relative;
        display: none;
      }
      @media (min-width: 900px) { .reg-image-side { display: block; } }
      .reg-image-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(180deg, rgba(20,70,44,0.3) 0%, rgba(20,70,44,0.8) 100%);
        display: flex; flex-direction: column; justify-content: flex-end;
        padding: 60px;
      }
      .rio-title { color: #FFF; font-family: var(--font-display); font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 16px; }
      .rio-text { color: rgba(255,255,255,0.9); font-size: 18px; max-width: 400px; }
      .reg-form-side {
        flex: 1;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 40px 24px;
      }
      .reg-box { width: 100%; max-width: 440px; }
      .reg-header { margin-bottom: 32px; text-align: center; }
      .reg-logo { font-size: 32px; margin-bottom: 16px; text-decoration: none; display: inline-block; }
      .reg-title { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: #111827; margin-bottom: 12px; }
      .reg-subtitle { color: #6b7280; font-size: 15px; }
      .reg-radio-group { display: flex; gap: 12px; margin-bottom: 20px; }
      .reg-radio-card {
        flex: 1; border: 2px solid #e5e7eb; border-radius: 12px; padding: 16px;
        text-align: center; cursor: pointer; transition: all 0.2s;
        background: #FFF;
      }
      .reg-radio-input { display: none; }
      .reg-radio-input:checked + .reg-radio-card { border-color: #1B5C3B; background: #eaf1ed; }
      .rrc-icon { font-size: 24px; margin-bottom: 8px; }
      .rrc-title { font-weight: 700; font-size: 14px; color: #111827; }
    </style>
    <div class="reg-split">
      <div class="reg-image-side">
        <div class="reg-image-overlay">
          <div class="rio-title">Добро пожаловать<br>в AgroVerse</div>
          <div class="rio-text">Прямой доступ к лучшим фермерским продуктам и оптовым рынкам без посредников.</div>
        </div>
      </div>
      <div class="reg-form-side">
        <div class="reg-box">
          <div class="reg-header">
            <a href="#/home" class="reg-logo">🌿</a>
            <h2 class="reg-title">Создание аккаунта</h2>
            <p class="reg-subtitle">Присоединяйтесь к современной агро-экосистеме</p>
          </div>

          <div id="reg-error" class="form-error hidden"></div>

          <div class="form-group">
            <label>Кто вы?</label>
            <div class="reg-radio-group">
              <label>
                <input type="radio" name="role" value="xaridor" class="reg-radio-input" checked />
                <div class="reg-radio-card">
                  <div class="rrc-icon">🛍️</div>
                  <div class="rrc-title">Покупатель</div>
                </div>
              </label>
              <label>
                <input type="radio" name="role" value="fermer" class="reg-radio-input" />
                <div class="reg-radio-card">
                  <div class="rrc-icon">👨‍🌾</div>
                  <div class="rrc-title">Фермер</div>
                </div>
              </label>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1">
              <label>Имя *</label>
              <input type="text" id="reg-name" class="pn-input" placeholder="Иван Иванов" required />
            </div>
          </div>
          
          <div class="form-group">
            <label>Номер телефона *</label>
            <input type="tel" id="reg-phone" class="pn-input" placeholder="+998 90 000 00 00" required />
          </div>

          <div class="form-group">
            <label>Пароль *</label>
            <input type="password" id="reg-password" class="pn-input" placeholder="Минимум 6 символов" required />
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="reg-btn" style="margin-top:24px">Создать аккаунт</button>

          <div style="text-align:center; margin-top: 24px; color: #6b7280; font-size: 14px;">
            Уже есть аккаунт? <a href="#/login" style="color: #1B5C3B; font-weight: 600; text-decoration: none;">Войти здесь</a>
          </div>
        </div>
      </div>
    </div>
  `;

  const btn = document.getElementById('reg-btn');
  const errBox = document.getElementById('reg-error');

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const email = undefined;
    const city = undefined;
    const password = document.getElementById('reg-password').value;
    const role = document.querySelector('input[name="role"]:checked')?.value || 'xaridor';

    if (!name || !phone || !password) {
        errBox.textContent = "Заполните все поля";
        errBox.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = "...";

    try {
      const data = await API.register({ name, phone, email, city, password, role });
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('av_user', JSON.stringify(data.user));

        showToast('Регистрация успешна!', 'success');
        setTimeout(() => window.location.hash = '#/home', 800);
      }
    } catch (error) {
      errBox.textContent = error.message;
      errBox.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = t('register');
    }
  });
}
window.renderRegister = renderRegister;