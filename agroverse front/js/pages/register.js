function renderRegister() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <style>
      .reg-split {
        display: flex;
        min-height: 100vh;
        background: #F4EFE6;
      }
      .reg-image-side {
        flex: 1.1;
        background: url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80') center/cover;
        position: relative;
        display: none;
      }
      @media (min-width: 900px) { .reg-image-side { display: block; } }
      .reg-image-overlay {
        position: absolute; inset: 0;
        background: linear-gradient(180deg, rgba(16,92,56,0.4) 0%, rgba(16,92,56,0.88) 100%);
        display: flex; flex-direction: column; justify-content: flex-end;
        padding: 60px;
      }
      .rio-title { color: #FFF; font-family: var(--font-display); font-size: 44px; font-weight: 800; line-height: 1.15; margin-bottom: 16px; letter-spacing: -0.02em; }
      .rio-text { color: rgba(255,255,255,0.92); font-size: 19px; max-width: 440px; line-height: 1.5; }
      .reg-form-side {
        flex: 1;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 48px 28px;
        background: #FFFFFF;
      }
      .reg-box { width: 100%; max-width: 460px; }
      .reg-header { margin-bottom: 32px; text-align: center; }
      .reg-logo { font-size: 36px; margin-bottom: 12px; text-decoration: none; display: inline-block; color: var(--color-primary-green); }
      .reg-title { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: #1F2937; margin-bottom: 10px; letter-spacing: -0.01em; }
      .reg-subtitle { color: #4B5563; font-size: 16px; font-weight: 500; }
      .reg-radio-group { display: flex; gap: 14px; margin-bottom: 24px; }
      .reg-radio-label { flex: 1; cursor: pointer; }
      .reg-radio-card {
        border: 2px solid #E5E7EB; border-radius: 14px; padding: 18px 14px;
        text-align: center; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        background: #FAFAFA; display: flex; flex-direction: column; align-items: center; gap: 8px;
      }
      .reg-radio-input { display: none; }
      .reg-radio-input:checked + .reg-radio-card {
        border-color: #105C38; background: #EBF5F0; box-shadow: 0 4px 14px rgba(16, 92, 56, 0.12);
        transform: translateY(-2px);
      }
      .rrc-icon { font-size: 26px; color: var(--color-primary-green); }
      .rrc-title { font-weight: 700; font-size: 16px; color: #111827; }
      .rrc-desc { font-size: 12px; color: #6B7280; font-weight: 400; }
    </style>

    <div class="reg-split">
      <div class="reg-image-side">
        <div class="reg-image-overlay">
          <div class="rio-title">Добро пожаловать<br>в AgroVerse</div>
          <div class="rio-text">Прямой доступ к лучшим фермерским продуктам и оптовым рынкам Узбекистана без посредников.</div>
        </div>
      </div>
      <div class="reg-form-side">
        <div class="reg-box">
          <div class="reg-header">
            <a href="#/home" class="reg-logo"><i class="fa-solid fa-seedling"></i></a>
            <h2 class="reg-title">Создание аккаунта</h2>
            <p class="reg-subtitle">Выберите ваш статус для начала работы</p>
          </div>

          <div id="reg-error" class="form-error hidden" style="margin-bottom:20px; padding:12px; background:#FEE2E2; color:#991B1B; border-radius:10px; font-weight:600;"></div>

          <div class="form-group" style="margin-bottom:24px;">
            <label style="font-weight:700; font-size:15px; margin-bottom:10px; display:block; color:#1F2937;">Регистрация в качестве:</label>
            <div class="reg-radio-group">
              <label class="reg-radio-label">
                <input type="radio" name="role" value="xaridor" class="reg-radio-input" checked />
                <div class="reg-radio-card">
                  <div class="rrc-icon"><i class="fa-solid fa-basket-shopping"></i></div>
                  <div class="rrc-title">Покупатель</div>
                  <div class="rrc-desc">Покупки без наценок</div>
                </div>
              </label>
              <label class="reg-radio-label">
                <input type="radio" name="role" value="fermer" class="reg-radio-input" />
                <div class="reg-radio-card">
                  <div class="rrc-icon"><i class="fa-solid fa-wheat-awn"></i></div>
                  <div class="rrc-title">Фермер</div>
                  <div class="rrc-desc">Продажа урожая</div>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-bottom:18px">
            <label style="font-weight:600; margin-bottom:6px; display:block; color:#374151">Ваше имя или название организации *</label>
            <input type="text" id="reg-name" class="pn-input" placeholder="например: Алишер Абдуллаев" style="width:100%; padding:14px; border:1.5px solid #D1D5DB; border-radius:10px; font-size:16px;" required />
          </div>
          
          <div class="form-group" style="margin-bottom:18px">
            <label style="font-weight:600; margin-bottom:6px; display:block; color:#374151">Номер телефона *</label>
            <input type="tel" id="reg-phone" class="pn-input" placeholder="+998 90 000 00 00" style="width:100%; padding:14px; border:1.5px solid #D1D5DB; border-radius:10px; font-size:16px;" required />
          </div>

          <div class="form-group" style="margin-bottom:24px">
            <label style="font-weight:600; margin-bottom:6px; display:block; color:#374151">Пароль *</label>
            <input type="password" id="reg-password" class="pn-input" placeholder="Минимум 6 символов" style="width:100%; padding:14px; border:1.5px solid #D1D5DB; border-radius:10px; font-size:16px;" required />
          </div>

          <button class="btn btn-primary btn-full btn-lg" id="reg-btn" style="width:100%; padding:16px; font-size:17px; font-weight:700; background:#105C38; border-radius:12px; color:#FFF; border:none; cursor:pointer; transition:all 0.2s;">
            Зарегистрироваться <i class="fa-solid fa-arrow-right" style="margin-left:8px;"></i>
          </button>

          <div style="text-align:center; margin-top: 28px; color: #4B5563; font-size: 15px;">
            Уже зарегистрированы? <a href="#/login" style="color: #105C38; font-weight: 700; text-decoration: underline;">Войти в профиль</a>
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
    const password = document.getElementById('reg-password').value;
    const role = document.querySelector('input[name="role"]:checked')?.value || 'xaridor';

    if (!name || !phone || !password) {
      errBox.textContent = "Пожалуйста, заполните все обязательные поля";
      errBox.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Регистрация...`;

    try {
      const data = await API.register({ name, phone, password, role });
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('av_user', JSON.stringify(data.user));

        showToast('Регистрация успешно завершена!', 'success');
        setTimeout(() => window.location.hash = '#/home', 600);
      }
    } catch (error) {
      errBox.textContent = error.message || "Ошибка при регистрации. Проверьте введенные данные.";
      errBox.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = `Зарегистрироваться <i class="fa-solid fa-arrow-right" style="margin-left:8px;"></i>`;
    }
  });
}
window.renderRegister = renderRegister;