function renderRegister() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card" style="max-width:460px;">
        <div class="auth-logo">
          <div class="logo"><i class="fi fi-sr-seedling"></i> <span>Agro</span>Verse</div>
          <p>${t('create_account') || 'Создание аккаунта'}</p>
        </div>

        <h2 class="auth-title">${t('register') || 'Регистрация'}</h2>
        <div id="reg-error" class="form-error hidden"></div>

        <div class="form-group">
          <label>${t('name') || 'Имя'} *</label>
          <input type="text" id="reg-name" placeholder="Введите имя" required />
        </div>

        <div class="form-group">
          <label>${t('phone') || 'Телефон'} *</label>
          <input type="tel" id="reg-phone" placeholder="+998 90 000 00 00" required />
        </div>

        <div class="form-group">
          <label>${t('password_label') || 'Пароль'} *</label>
          <input type="password" id="reg-password" placeholder="••••••" required />
        </div>

        <div class="form-group">
          <label>${t('i_am') || 'Я являюсь'}</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" name="role" value="fermer" /> 🌾 Фермер
            </label>
            <label class="radio-label">
              <input type="radio" name="role" value="xaridor" checked /> 🛒 Покупатель
            </label>
            <label class="radio-label">
              <input type="radio" name="role" value="courier" /> 🚛 Йўлчи (Водитель)
            </label>
          </div>
        </div>

        <button class="btn btn-primary btn-full" id="reg-btn">${t('register') || 'Зарегистрироваться'}</button>

        <div class="auth-footer">
          Уже есть аккаунт? <a href="#/login">Войти</a>
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
        errBox.textContent = "Заполните все поля";
        errBox.classList.remove('hidden');
        return;
    }

    btn.disabled = true;
    btn.textContent = "...";

    try {
      const data = await API.register({ name, phone, password, role });
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('av_user', JSON.stringify(data.user));
        
        // ФЛАГ ДЛЯ КУРЬЕРА: показать напоминание на главной
        if (role === 'courier') {
            localStorage.setItem('courier_needs_setup_alert', 'true');
        }

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