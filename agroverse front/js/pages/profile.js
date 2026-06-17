async function renderProfile() {
  const app = document.getElementById('app');
  const user = Auth.getUser();

  // Если это Йўлчи (Курьер), запускаем особую логику
  if (user?.role === 'courier') {
    return renderCourierProfileManager(app);
  }

  // Для фермеров и покупателей - стандартная страница
  app.innerHTML = pageShell(`
    <div class="card profile-card" style="max-width: 600px; margin: 0 auto;">
      <h2>👤 Личный кабинет</h2>
      <div class="meta-row"><span>Имя:</span> <b>${user.name}</b></div>
      <div class="meta-row"><span>Телефон:</span> <b>${user.phone}</b></div>
      <div class="meta-row"><span>Роль:</span> <b>${user.role}</b></div>
      <br>
      <button class="btn btn-ghost btn-full" onclick="Auth.logout()">Выйти из аккаунта</button>
    </div>
  `);
}

async function renderCourierProfileManager(app) {
    app.innerHTML = '<div class="spinner-center"><div class="spinner"></div> Загрузка профиля Йўлчи...</div>';
    
    try {
        const profile = await API.getCourierProfile();
        
        // Кейс 1: Профиль пустой или еще не был заполнен (проверяем по ФИО)
        if (!profile || !profile.full_name) {
            renderCourierSetupForm(app);
            return;
        }

        // Кейс 2: Профиль отправлен, но админ еще не подтвердил
        if (!profile.admin_approved) {
            app.innerHTML = pageShell(`
                <div class="card" style="max-width:600px; margin:20px auto; text-align:center;">
                    <div style="font-size:3rem;">⏳</div>
                    <h3>Ваша анкета на проверке</h3>
                    <p>Администратор проверяет ваши данные водителя. До одобрения вы не можете брать заказы.</p>
                    ${profile.rejection_reason ? `<div class="form-error"><b>Причина отказа:</b> ${profile.rejection_reason}</div>` : ''}
                    <hr>
                    <p>Нужно изменить данные?</p>
                    <button class="btn btn-ghost" onclick="renderCourierSetupForm(document.getElementById('app'))">Отредактировать анкету</button>
                    <button class="btn btn-link btn-full" onclick="Auth.logout()">Выйти</button>
                </div>
            `);
            return;
        }

        // Кейс 3: Всё ок, профиль подтвержден. Показываем Дашборд курьера.
        renderCourierDashboard(app, profile);

    } catch (e) {
        // Если API вернуло ошибку или 404
        renderCourierSetupForm(app);
    }
}

function renderCourierSetupForm(app) {
    app.innerHTML = pageShell(`
        <div class="card" style="max-width: 500px; margin: 20px auto;">
            <h2 style="text-align:center">🚚 Анкета водителя (Йўлчи)</h2>
            <p style="color:var(--clr-muted); font-size:0.9rem; text-align:center">Заполните данные вашего автомобиля, чтобы начать зарабатывать</p>
            <div id="setup-error" class="form-error hidden"></div>
            
            <div class="form-group">
                <label>ФИО полностью *</label>
                <input type="text" id="cp-full-name" placeholder="Напр: Рахимов Абдулла" required>
            </div>

            <div class="form-group">
                <label>Тип транспорта *</label>
                <select id="cp-transport">
                    <option value="truck">Грузовой (до 5т)</option>
                    <option value="fura">Фура (20т+)</option>
                    <option value="refrig">Рефрижератор</option>
                    <option value="car">Легковая</option>
                </select>
            </div>

            <div class="form-group">
                <label>Номер автомобиля *</label>
                <input type="text" id="cp-plate" placeholder="01 A 777 BA">
            </div>

            <div class="form-group">
                <label>Ваш город *</label>
                <input type="text" id="cp-city" placeholder="Напр: Ташкент">
            </div>

            <button class="btn btn-primary btn-full" id="setup-save-btn">Отправить админу</button>
        </div>
    `);

    document.getElementById('setup-save-btn').onclick = async () => {
        const btn = document.getElementById('setup-save-btn');
        const err = document.getElementById('setup-error');

        const payload = {
            full_name: document.getElementById('cp-full-name').value.trim(),
            transport_type: document.getElementById('cp-transport').value,
            vehicle_number: document.getElementById('cp-plate').value.trim(),
            city: document.getElementById('cp-city').value.trim(),
            phone: Auth.getUser().phone,
            max_weight: 5000, 
            city: document.getElementById('cp-city').value.trim()
        };

        if (!payload.full_name || !payload.vehicle_number || !payload.city) {
            err.textContent = "Заполните обязательные поля";
            err.classList.remove('hidden');
            return;
        }

        btn.disabled = true;
        try {
            await API.setupCourierProfile(payload);
            showToast('Анкета отправлена на проверку!', 'success');
            localStorage.removeItem('courier_needs_setup_alert');
            renderProfile(); // Релоад профиля, чтобы увидеть "⏳"
        } catch (e) {
            err.textContent = e.message;
            err.classList.remove('hidden');
            btn.disabled = false;
        }
    };
}

function renderCourierDashboard(app, profile) {
    app.innerHTML = pageShell(`
        <div class="page-head">
            <h1>🚛 Кабинет Йўлчи</h1>
            <div class="pc-badge ok">Подтвержденный водитель</div>
        </div>
        
        <div class="profile-grid">
            <div class="card">
                <h3>💰 Мой кошелек</h3>
                <div style="font-size:1.5rem; font-weight:bold; color:var(--clr-primary)">
                    ${profile.balance || 0} сум
                </div>
                <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="router.go('/wallet')">История</button>
            </div>
            
            <div class="card">
                <h3>⭐ Мой рейтинг</h3>
                <div style="font-size:1.5rem; font-weight:bold">${profile.rating || '5.0'} / 5</div>
            </div>
        </div>

        <div class="card" style="margin-top:20px;">
            <h3>🚜 Автомобиль</h3>
            <p><b>Модель/Тип:</b> ${profile.transport_type}</p>
            <p><b>Гос. номер:</b> ${profile.vehicle_number}</p>
            <hr>
            <button class="btn btn-link btn-full" onclick="Auth.logout()">Выйти из профиля</button>
        </div>
    `);
}

window.renderProfile = renderProfile;