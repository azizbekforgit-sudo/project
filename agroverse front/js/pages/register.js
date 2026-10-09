/* pages/register.js — регистрация (обёртка authShell() из login.js) */

function renderRegister() {
  const app = document.getElementById('app');

  app.innerHTML = authShell(`
    <h1 class="auth2-title">${t('auth_reg_title')}</h1>
    <p class="auth2-sub">${t('auth_reg_sub')}</p>
    <div id="reg-error" class="auth2-note err" role="alert" hidden></div>

    <form id="reg-form" class="auth2-form" novalidate>
      <fieldset class="auth2-role">
        <legend>${t('auth_who')}</legend>
        <label class="role-card">
          <input type="radio" name="role" value="xaridor" checked />
          <span class="role-ic"><i class="fa-solid fa-basket-shopping"></i></span>
          <b>${t('auth_buyer')}</b><small>${t('auth_buyer_d')}</small>
        </label>
        <label class="role-card">
          <input type="radio" name="role" value="fermer" />
          <span class="role-ic"><i class="fa-solid fa-wheat-awn"></i></span>
          <b>${t('auth_farmer')}</b><small>${t('auth_farmer_d')}</small>
        </label>
      </fieldset>

      <label class="auth2-field">
        <span>${t('auth_name')}</span>
        <input type="text" id="reg-name" class="pn-input" autocomplete="name" placeholder="${t('auth_name_ph')}" maxlength="100" />
      </label>
      <label class="auth2-field">
        <span>${t('auth_phone')}</span>
        <input type="tel" id="reg-phone" class="pn-input" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" />
      </label>
      <label class="auth2-field">
        <span>${t('auth_password')}</span>
        ${passwordFieldHtml('reg-password', t('auth_pass_ph'), 'new-password')}
      </label>
      <div id="reg-otp-wrap"></div>

      <button type="submit" class="btn btn-primary btn-lg btn-full" id="reg-btn">
        <i class="fa-solid fa-check"></i> <span>${t('auth_reg_btn')}</span>
      </button>
    </form>

    <div class="auth2-or" id="google-box" hidden>
      <span>${t('or_word')}</span>
      <div class="g-btn"></div>
    </div>

    <div class="auth2-switch">
      <span>${t('have_account')}</span>
      <button type="button" class="btn btn-outline btn-lg btn-full" onclick="router.go('/login')">
        <i class="fa-solid fa-arrow-right-to-bracket"></i> ${t('auth_to_login')}
      </button>
    </div>
  `);

  // со стартовой страницы приходят с ?role=fermer или ?role=xaridor
  const wantRole = new URLSearchParams((location.hash.split('?')[1]) || '').get('role');
  if (wantRole === 'fermer' || wantRole === 'xaridor') {
    const r = document.querySelector(`input[name="role"][value="${wantRole}"]`);
    if (r) r.checked = true;
  }

  const form = document.getElementById('reg-form');
  const btn = document.getElementById('reg-btn');
  const errBox = document.getElementById('reg-error');
  const showErr = (text) => { errBox.textContent = text; errBox.hidden = false; errBox.scrollIntoView({ block: 'nearest' }); };
  let smsOn = false;

  // Подтверждение номера по СМС — только если СМС настроены на сервере
  loadAppConfig().then(cfg => {
    if (!cfg.sms_enabled) return;
    smsOn = true;
    document.getElementById('reg-otp-wrap').innerHTML = otpBlockHtml('rg');
    bindOtp('rg', 'register', () => normalizePhone(document.getElementById('reg-phone').value), showErr);
  });
  mountGoogleButton('google-box', showErr);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = normalizePhone(document.getElementById('reg-phone').value);
    const password = document.getElementById('reg-password').value;
    const role = form.querySelector('input[name="role"]:checked')?.value || 'xaridor';
    errBox.hidden = true;

    if (name.length < 2) return showErr(t('auth_name_short'));
    const digits = phone.replace(/\D/g, '').length;
    if (digits < 10 || digits > 15) return showErr(t('auth_phone_bad'));
    if (password.length < 6) return showErr(t('auth_pass_short'));
    const code = document.getElementById('rg-code')?.value.trim();
    if (smsOn && !code) return showErr(t('otp_need'));

    btn.disabled = true;
    btn.querySelector('span').textContent = t('auth_reg_wait');
    try {
      const data = await API.register({ name, phone, password, role, code });
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('av_user', JSON.stringify(data.user));
        showToast(t('auth_reg_ok'), 'success');
        setTimeout(() => window.location.hash = '#/home', 400);
      }
    } catch (err) {
      showErr(authErrorText(err.message));
      btn.disabled = false;
      btn.querySelector('span').textContent = t('auth_reg_btn');
    }
  });
}

window.renderRegister = renderRegister;
