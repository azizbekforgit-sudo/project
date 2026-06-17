/* pages/wallet.js — Кошелёк + Пополнение счёта + Форма карты */

/* ── Переводы ── */
const WALLET_I18N = {
  uz: {
    title:        'Hamyon',
    desc:         'Balansingiz va bonus ballaringiz',
    balance:      'Hamyon balansi',
    bonus:        'Bonus ballar',
    points:       'ball',
    currency:     "so'm",
    topup_title:  "Hisobni to'ldirish",
    topup_desc:   "Xavfsiz to'lov tizimi orqali",
    amount_label: "To'ldirish miqdori",
    amount_ph:    'Miqdorni kiriting…',
    method:       "To'lov usuli",
    btn_topup:    "To'lashga o'tish",
    quick:        "Tez to'ldirish",
    history:      'Oxirgi operatsiyalar',
    no_hist:      "Operatsiyalar yo'q",
    how:          'Qanday ishlaydi',
    w1:           'Faollik uchun bonus ballar oling',
    w2:           'Fermerlar har bir mahsulot uchun +10 ball',
    w3:           "Xaridorlar buyurtmalardan bonus oladi",
    w4:           "Ballar bilan buyurtmaning bir qismini to'lang",
    hist_bonus:   'Bonus: mahsulot qo\'shish',
    hist_order:   "Buyurtma to'lovi",
    hist_topup:   "Hisob to'ldirildi",
    // Payment form
    pay_title:    "To'lov ma'lumotlari",
    pay_desc:     "Karta ma'lumotlarini kiriting",
    card_number:  'Karta raqami',
    card_holder:  'Karta egasining ismi',
    card_expiry:  'Amal qilish muddati',
    card_cvv:     'CVV kod',
    card_num_ph:  '0000 0000 0000 0000',
    card_name_ph: 'IVAN IVANOV',
    card_exp_ph:  'MM/YY',
    card_cvv_ph:  '123',
    pay_btn:      "To'lovni tasdiqlash",
    pay_back:     'Ortga',
    pay_amount:   "To'lov miqdori",
    pay_success:  "Hisob muvaffaqiyatli to'ldirildi!",
    err_amount:   "To'g'ri miqdor kiriting (kamida 1 000 so'm)",
    err_card:     "Karta raqamini to'g'ri kiriting",
    err_name:     "Karta egasining ismini kiriting",
    err_exp:      "Amal qilish muddatini kiriting (MM/YY)",
    err_cvv:      "CVV kodni kiriting",
    processing:   'Yuklanmoqda…',
    secure_note:  '🔒 Ma\'lumotlaringiz SSL orqali himoyalangan',
  },
  ru: {
    title:        'Кошелёк',
    desc:         'Ваш баланс и бонусные баллы',
    balance:      'Баланс кошелька',
    bonus:        'Бонусные баллы',
    points:       'баллов',
    currency:     'сум',
    topup_title:  'Пополнить счёт',
    topup_desc:   'Через защищённую платёжную систему',
    amount_label: 'Сумма пополнения',
    amount_ph:    'Введите сумму…',
    method:       'Способ оплаты',
    btn_topup:    'Перейти к оплате',
    quick:        'Быстрое пополнение',
    history:      'Последние операции',
    no_hist:      'Операций пока нет',
    how:          'Как это работает',
    w1:           'Получайте бонусные баллы за активность',
    w2:           'Фермеры получают +10 за каждый товар',
    w3:           'Покупатели получают бонусы за заказы',
    w4:           'Оплачивайте часть заказа баллами',
    hist_bonus:   'Бонус: добавление товара',
    hist_order:   'Оплата заказа',
    hist_topup:   'Пополнение счёта',
    // Payment form
    pay_title:    'Данные для оплаты',
    pay_desc:     'Введите данные банковской карты',
    card_number:  'Номер карты',
    card_holder:  'Имя держателя карты',
    card_expiry:  'Срок действия',
    card_cvv:     'CVV код',
    card_num_ph:  '0000 0000 0000 0000',
    card_name_ph: 'ИВАН ИВАНОВ',
    card_exp_ph:  'ММ/ГГ',
    card_cvv_ph:  '123',
    pay_btn:      'Подтвердить оплату',
    pay_back:     'Назад',
    pay_amount:   'Сумма оплаты',
    pay_success:  'Счёт успешно пополнен!',
    err_amount:   'Введите корректную сумму (минимум 1 000 сум)',
    err_card:     'Введите корректный номер карты',
    err_name:     'Введите имя держателя карты',
    err_exp:      'Введите срок действия (ММ/ГГ)',
    err_cvv:      'Введите CVV код',
    processing:   'Обработка…',
    secure_note:  '🔒 Ваши данные защищены SSL-шифрованием',
  },
  en: {
    title:        'Wallet',
    desc:         'Your balance and bonus points',
    balance:      'Wallet Balance',
    bonus:        'Bonus Points',
    points:       'points',
    currency:     'sum',
    topup_title:  'Top Up Balance',
    topup_desc:   'Via secure payment system',
    amount_label: 'Top-up Amount',
    amount_ph:    'Enter amount…',
    method:       'Payment Method',
    btn_topup:    'Proceed to Payment',
    quick:        'Quick Top-up',
    history:      'Recent Transactions',
    no_hist:      'No transactions yet',
    how:          'How it works',
    w1:           'Earn bonus points for activity',
    w2:           'Farmers earn +10 per product',
    w3:           'Buyers earn bonuses for orders',
    w4:           'Pay part of orders with points',
    hist_bonus:   'Bonus: product added',
    hist_order:   'Order payment',
    hist_topup:   'Balance topped up',
    // Payment form
    pay_title:    'Payment Details',
    pay_desc:     'Enter your bank card details',
    card_number:  'Card Number',
    card_holder:  'Cardholder Name',
    card_expiry:  'Expiry Date',
    card_cvv:     'CVV Code',
    card_num_ph:  '0000 0000 0000 0000',
    card_name_ph: 'JOHN DOE',
    card_exp_ph:  'MM/YY',
    card_cvv_ph:  '123',
    pay_btn:      'Confirm Payment',
    pay_back:     'Back',
    pay_amount:   'Payment Amount',
    pay_success:  'Balance topped up successfully!',
    err_amount:   'Enter a valid amount (min 1,000 sum)',
    err_card:     'Enter a valid card number',
    err_name:     'Enter cardholder name',
    err_exp:      'Enter expiry date (MM/YY)',
    err_cvv:      'Enter CVV code',
    processing:   'Processing…',
    secure_note:  '🔒 Your data is protected by SSL encryption',
  },
};

function wt(key) {
  const lang = (window.I18nManager && I18nManager.current) || 'uz';
  return (WALLET_I18N[lang] || WALLET_I18N.uz)[key] || key;
}

/* ─────────────────────────────────────────
   ГЛАВНАЯ СТРАНИЦА КОШЕЛЬКА
───────────────────────────────────────── */
async function renderWallet() {
  const app = document.getElementById('app');

  const quickAmounts = [10000, 50000, 100000, 250000, 500000];

  const methods = [
    { id: 'card',   icon: '💳', label: { uz: 'Bank kartasi', ru: 'Банковская карта', en: 'Bank card' } },
    { id: 'payme',  icon: '🟢', label: { uz: 'Payme',        ru: 'Payme',            en: 'Payme' } },
    { id: 'click',  icon: '🔵', label: { uz: 'Click',        ru: 'Click',            en: 'Click' } },
    { id: 'uzcard', icon: '🟡', label: { uz: 'UzCard',       ru: 'UzCard',           en: 'UzCard' } },
  ];

  const mockHistory = [
    { type: 'in',  labelKey: 'hist_bonus', amount: '+500',    date: '15.06.2025' },
    { type: 'out', labelKey: 'hist_order', amount: '-12 000', date: '14.06.2025' },
    { type: 'in',  labelKey: 'hist_topup', amount: '+50 000', date: '12.06.2025' },
  ];

  app.innerHTML = pageShell(`
    ${walletStyles()}
    <div class="wallet-page">

      <div class="page-head" style="margin-bottom:28px">
        <h1 class="page-title">💰 ${wt('title')}</h1>
        <p class="page-desc">${wt('desc')}</p>
      </div>

      <!-- Баланс -->
      <div class="wallet-hero" id="wallet-hero">
        <div class="wcard skeleton" style="height:140px"></div>
        <div class="wcard skeleton" style="height:140px"></div>
      </div>

      <!-- Форма пополнения -->
      <div class="topup-block">
        <div class="topup-head">
          <h2>⚡ ${wt('topup_title')}</h2>
          <p>${wt('topup_desc')}</p>
        </div>

        <div class="quick-label">${wt('quick')}</div>
        <div class="quick-btns" id="quick-btns">
          ${quickAmounts.map(a => `
            <button class="quick-btn" onclick="selectQuickAmount(${a}, this)">
              ${a.toLocaleString('ru')} ${wt('currency')}
            </button>
          `).join('')}
        </div>

        <div class="amount-wrap">
          <label for="topup-amount">${wt('amount_label')}</label>
          <div class="amount-input-row">
            <span class="amount-currency">UZS</span>
            <input type="number" id="topup-amount" placeholder="${wt('amount_ph')}" min="1000" step="1000" oninput="clearQuickActive()">
          </div>
        </div>

        <div class="method-label">${wt('method')}</div>
        <div class="method-grid" id="method-grid">
          ${methods.map((m, i) => {
            const lang = (window.I18nManager && I18nManager.current) || 'uz';
            return `
            <div class="method-card ${i === 0 ? 'selected' : ''}" onclick="selectMethod('${m.id}', this)" data-method="${m.id}">
              <div class="mi">${m.icon}</div>
              <div class="mn">${m.label[lang] || m.label.uz}</div>
            </div>`;
          }).join('')}
        </div>

        <button class="topup-submit" id="topup-btn" onclick="goToPayment()">
          <span>💳</span> ${wt('btn_topup')}
        </button>
      </div>

      <!-- История -->
      <div class="hist-block">
        <h3>📋 ${wt('history')}</h3>
        <div class="hist-list">
          ${mockHistory.map(h => `
            <div class="hist-item">
              <div class="hist-dot ${h.type}">${h.type === 'in' ? '↑' : '↓'}</div>
              <div class="hist-info">
                <div class="hl">${wt(h.labelKey)}</div>
                <div class="hd">${h.date}</div>
              </div>
              <div class="hist-amt ${h.type}">${h.amount} ${wt('currency')}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Как работает -->
      <div class="how-block">
        <h3>ℹ️ ${wt('how')}</h3>
        <ul class="how-list">
          <li>🏅 ${wt('w1')}</li>
          <li>➕ ${wt('w2')}</li>
          <li>🛒 ${wt('w3')}</li>
          <li>💸 ${wt('w4')}</li>
        </ul>
      </div>
    </div>
  `);

  window._selectedMethod = 'card';

  // Загрузка баланса
  try {
    const me = await API.getMe();
    const lang = (window.I18nManager && I18nManager.current) || 'uz';
    document.getElementById('wallet-hero').innerHTML = `
      <div class="wcard balance">
        <div class="wcard-icon">💰</div>
        <div class="wcard-label">${wt('balance')}</div>
        <div class="wcard-value">${Number(me.wallet_balance || 0).toLocaleString('ru')}</div>
        <div class="wcard-sub">${wt('currency')}</div>
      </div>
      <div class="wcard points-card">
        <div class="wcard-icon">🏅</div>
        <div class="wcard-label">${wt('bonus')}</div>
        <div class="wcard-value">${me.bonus_points || 0}</div>
        <div class="wcard-sub">${wt('points')}</div>
      </div>
    `;
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    document.getElementById('wallet-hero').innerHTML =
      `<div class="empty-state" style="grid-column:1/-1"><p>⚠️ ${e.message}</p></div>`;
  }
}

/* ─────────────────────────────────────────
   ПЕРЕХОД НА СТРАНИЦУ ОПЛАТЫ
───────────────────────────────────────── */
function goToPayment() {
  const input  = document.getElementById('topup-amount');
  const amount = parseFloat(input?.value);

  if (!amount || amount < 1000) {
    showToast(wt('err_amount'), 'warn');
    input?.focus();
    return;
  }

  window._topupAmount = amount;
  renderPaymentForm(amount, window._selectedMethod || 'card');
}

/* ─────────────────────────────────────────
   СТРАНИЦА С ФОРМОЙ КАРТЫ
───────────────────────────────────────── */
function renderPaymentForm(amount, method) {
  const app  = document.getElementById('app');
  const lang = (window.I18nManager && I18nManager.current) || 'uz';

  const methodIcons = { card: '💳', payme: '🟢', click: '🔵', uzcard: '🟡' };
  const methodNames = {
    card:   { uz: 'Bank kartasi', ru: 'Банковская карта', en: 'Bank card' },
    payme:  { uz: 'Payme',        ru: 'Payme',            en: 'Payme' },
    click:  { uz: 'Click',        ru: 'Click',            en: 'Click' },
    uzcard: { uz: 'UzCard',       ru: 'UzCard',           en: 'UzCard' },
  };

  app.innerHTML = pageShell(`
    ${walletStyles()}
    ${paymentStyles()}

    <div class="pay-page">

      <!-- Шапка -->
      <div class="pay-header">
        <button class="pay-back-btn" onclick="renderWallet()">
          ← ${wt('pay_back')}
        </button>
        <div class="pay-header-title">
          <span>${methodIcons[method] || '💳'}</span>
          <span>${methodNames[method]?.[lang] || 'Bank kartasi'}</span>
        </div>
      </div>

      <!-- Сумма -->
      <div class="pay-amount-banner">
        <div class="pab-label">${wt('pay_amount')}</div>
        <div class="pab-value">${amount.toLocaleString('ru')} <span>${wt('currency')}</span></div>
      </div>

      <!-- Визуализация карты -->
      <div class="card-visual" id="card-visual">
        <div class="cv-chip">▣</div>
        <div class="cv-number" id="cv-number">•••• •••• •••• ••••</div>
        <div class="cv-bottom">
          <div>
            <div class="cv-lbl">${wt('card_holder')}</div>
            <div class="cv-val" id="cv-name">${wt('card_name_ph')}</div>
          </div>
          <div>
            <div class="cv-lbl">${wt('card_expiry')}</div>
            <div class="cv-val" id="cv-expiry">••/••</div>
          </div>
          <div class="cv-logo">
            ${method === 'uzcard' ? '🟡' : method === 'payme' ? '🟢' : method === 'click' ? '🔵' : '💳'}
          </div>
        </div>
      </div>

      <!-- Форма -->
      <div class="pay-form-card">
        <h2>${wt('pay_title')}</h2>
        <p class="pay-form-desc">${wt('pay_desc')}</p>

        <div class="pay-field">
          <label>${wt('card_number')}</label>
          <div class="pay-input-wrap">
            <span class="pi-icon">💳</span>
            <input
              type="text"
              id="pf-number"
              placeholder="${wt('card_num_ph')}"
              maxlength="19"
              oninput="formatCardNumber(this)"
              autocomplete="cc-number"
            >
          </div>
        </div>

        <div class="pay-field">
          <label>${wt('card_holder')}</label>
          <div class="pay-input-wrap">
            <span class="pi-icon">👤</span>
            <input
              type="text"
              id="pf-name"
              placeholder="${wt('card_name_ph')}"
              oninput="updateCardName(this)"
              style="text-transform:uppercase"
              autocomplete="cc-name"
            >
          </div>
        </div>

        <div class="pay-row">
          <div class="pay-field">
            <label>${wt('card_expiry')}</label>
            <div class="pay-input-wrap">
              <span class="pi-icon">📅</span>
              <input
                type="text"
                id="pf-expiry"
                placeholder="${wt('card_exp_ph')}"
                maxlength="5"
                oninput="formatExpiry(this)"
                autocomplete="cc-exp"
              >
            </div>
          </div>
          <div class="pay-field">
            <label>${wt('card_cvv')}</label>
            <div class="pay-input-wrap">
              <span class="pi-icon">🔒</span>
              <input
                type="password"
                id="pf-cvv"
                placeholder="${wt('card_cvv_ph')}"
                maxlength="3"
                autocomplete="cc-csc"
                oninput="this.value=this.value.replace(/\D/g,'')"
              >
            </div>
          </div>
        </div>

        <p class="secure-note">${wt('secure_note')}</p>

        <button class="pay-submit-btn" id="pay-submit" onclick="confirmPayment()">
          <span>✓</span> ${wt('pay_btn')} — ${amount.toLocaleString('ru')} ${wt('currency')}
        </button>
      </div>

    </div>
  `);
}

/* ─────────────────────────────────────────
   ФОРМАТИРОВАНИЕ ПОЛЕЙ
───────────────────────────────────────── */
function formatCardNumber(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 16);
  input.value = v.replace(/(.{4})/g, '$1 ').trim();
  const display = v ? v.replace(/(.{4})/g, '$1 ').trim() + '•'.repeat(Math.max(0, 16 - v.length)).replace(/(.{4})/g, '$1 ').trim() : '•••• •••• •••• ••••';
  const el = document.getElementById('cv-number');
  if (el) {
    let padded = v.padEnd(16, '•');
    el.textContent = padded.replace(/(.{4})/g, '$1 ').trim();
  }
}

function updateCardName(input) {
  input.value = input.value.toUpperCase();
  const el = document.getElementById('cv-name');
  if (el) el.textContent = input.value || (wt('card_name_ph'));
}

function formatExpiry(input) {
  let v = input.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
  input.value = v;
  const el = document.getElementById('cv-expiry');
  if (el) el.textContent = v || '••/••';
}

/* ─────────────────────────────────────────
   ПОДТВЕРЖДЕНИЕ ОПЛАТЫ
───────────────────────────────────────── */
async function confirmPayment() {
  const num    = document.getElementById('pf-number')?.value.replace(/\s/g, '');
  const name   = document.getElementById('pf-name')?.value.trim();
  const expiry = document.getElementById('pf-expiry')?.value.trim();
  const cvv    = document.getElementById('pf-cvv')?.value.trim();
  const btn    = document.getElementById('pay-submit');

  if (!num || num.length < 16)    { showToast(wt('err_card'),  'warn'); return; }
  if (!name || name.length < 3)   { showToast(wt('err_name'),  'warn'); return; }
  if (!expiry || expiry.length < 5){ showToast(wt('err_exp'),  'warn'); return; }
  if (!cvv || cvv.length < 3)     { showToast(wt('err_cvv'),   'warn'); return; }

  btn.disabled = true;
  btn.innerHTML = `<span style="display:inline-block;animation:spin 1s linear infinite">⟳</span> ${wt('processing')}`;

  // Симуляция (2 сек) — заменить на реальный API
  await new Promise(r => setTimeout(r, 2200));

  showToast(wt('pay_success'), 'success');
  window._topupAmount = null;

  // Возврат на кошелёк
  setTimeout(() => renderWallet(), 500);
}

/* ─────────────────────────────────────────
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
───────────────────────────────────────── */
function selectMethod(id, el) {
  document.querySelectorAll('.method-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  window._selectedMethod = id;
}

function selectQuickAmount(amount, btn) {
  const input = document.getElementById('topup-amount');
  if (input) input.value = amount;
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function clearQuickActive() {
  document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
}

/* ─────────────────────────────────────────
   СТИЛИ
───────────────────────────────────────── */
function walletStyles() {
  return `<style>
    .wallet-page { max-width: 860px; margin: 0 auto; padding-bottom: 60px; }

    .wallet-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
    @media(max-width:600px){ .wallet-hero { grid-template-columns: 1fr; } }

    .wcard {
      background: var(--bg-elev); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: 32px 28px;
      position: relative; overflow: hidden;
      transition: transform .25s, box-shadow .25s;
    }
    .wcard:hover { transform: translateY(-3px); box-shadow: var(--glow), var(--shadow); }
    .wcard::before {
      content: ''; position: absolute; width: 200px; height: 200px;
      border-radius: 50%; opacity: .07; top: -60px; right: -60px; pointer-events: none;
    }
    .wcard.balance::before  { background: var(--clr-primary); }
    .wcard.points-card::before { background: #F59E0B; }
    .wcard.balance   { border-color: rgba(16,185,129,.3); }
    .wcard.points-card { border-color: rgba(245,158,11,.25); }
    .wcard-icon  { font-size: 36px; margin-bottom: 12px; }
    .wcard-label { font-size: 13px; color: var(--txt-2); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; margin-bottom: 8px; }
    .wcard-value { font-family: var(--font-display); font-size: 36px; font-weight: 800; color: var(--clr-primary); line-height: 1; }
    .wcard.points-card .wcard-value { color: #F59E0B; }
    .wcard-sub   { font-size: 13px; color: var(--txt-3); margin-top: 6px; }

    .topup-block {
      background: var(--bg-elev); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: 36px 32px; margin-bottom: 28px;
      position: relative; overflow: hidden;
    }
    .topup-block::after {
      content: '💰'; position: absolute; font-size: 120px;
      right: -10px; bottom: -20px; opacity: .04; pointer-events: none;
    }
    .topup-head { margin-bottom: 28px; }
    .topup-head h2 { font-family: var(--font-display); font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .topup-head p  { font-size: 14px; color: var(--txt-2); }

    .quick-label { font-size: 12px; color: var(--txt-2); font-weight: 700; margin-bottom: 10px; text-transform: uppercase; letter-spacing: .07em; }
    .quick-btns  { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
    .quick-btn {
      padding: 8px 18px; border-radius: 999px; border: 1.5px solid var(--line);
      background: var(--bg-2); font-size: 14px; font-weight: 600; color: var(--txt-2);
      cursor: pointer; transition: all .2s; font-family: var(--font-body);
    }
    .quick-btn:hover, .quick-btn.active {
      border-color: var(--clr-primary); background: rgba(16,185,129,.1);
      color: var(--clr-primary); transform: translateY(-1px);
    }

    .amount-wrap { margin-bottom: 24px; }
    .amount-wrap label { display: block; font-size: 12px; font-weight: 700; color: var(--txt-2); margin-bottom: 8px; text-transform: uppercase; letter-spacing:.07em; }
    .amount-input-row  { display: flex; align-items: center; }
    .amount-currency {
      background: var(--bg-2); border: 1.5px solid var(--line); border-right: none;
      border-radius: var(--radius-sm) 0 0 var(--radius-sm);
      padding: 14px 16px; font-size: 15px; font-weight: 700; color: var(--clr-primary);
    }
    #topup-amount {
      flex: 1; border: 1.5px solid var(--line);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
      padding: 14px 16px; font-size: 16px; font-weight: 600;
      background: var(--bg-input); color: var(--txt); outline: none;
      transition: border-color .2s; font-family: var(--font-display);
    }
    #topup-amount:focus { border-color: var(--clr-primary); }

    .method-label { font-size: 12px; color: var(--txt-2); font-weight: 700; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .07em; }
    .method-grid  { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    @media(max-width:500px){ .method-grid { grid-template-columns: repeat(2,1fr); } }
    .method-card {
      border: 1.5px solid var(--line); border-radius: var(--radius-sm);
      padding: 16px 10px; text-align: center; cursor: pointer;
      background: var(--bg-2); transition: all .2s;
    }
    .method-card:hover { border-color: var(--clr-primary); background: rgba(16,185,129,.06); transform: translateY(-2px); }
    .method-card.selected { border-color: var(--clr-primary); background: rgba(16,185,129,.12); box-shadow: var(--glow-soft); }
    .method-card .mi { font-size: 30px; margin-bottom: 6px; }
    .method-card .mn { font-size: 12px; font-weight: 700; color: var(--txt-2); }
    .method-card.selected .mn { color: var(--clr-primary); }

    .topup-submit {
      width: 100%; padding: 16px;
      background: var(--gradient-primary); color: #fff; border: none;
      border-radius: var(--radius-sm); font-family: var(--font-display);
      font-size: 16px; font-weight: 700; cursor: pointer; transition: all .25s;
      box-shadow: 0 4px 20px rgba(16,185,129,.35);
      display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .topup-submit:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(16,185,129,.45); }
    .topup-submit:disabled { opacity: .6; cursor: not-allowed; transform: none; }

    .hist-block {
      background: var(--bg-elev); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: 28px 24px; margin-bottom: 28px;
    }
    .hist-block h3 { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin-bottom: 20px; }
    .hist-list { display: flex; flex-direction: column; gap: 12px; }
    .hist-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; border-radius: var(--radius-sm);
      background: var(--bg-2); border: 1px solid var(--line); transition: background .2s;
    }
    .hist-item:hover { background: rgba(16,185,129,.05); }
    .hist-dot {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
    }
    .hist-dot.in  { background: rgba(16,185,129,.15); }
    .hist-dot.out { background: rgba(239,68,68,.12); }
    .hist-info    { flex: 1; }
    .hist-info .hl { font-size: 14px; font-weight: 600; color: var(--txt); }
    .hist-info .hd { font-size: 12px; color: var(--txt-3); margin-top: 2px; }
    .hist-amt      { font-family: var(--font-display); font-size: 16px; font-weight: 800; }
    .hist-amt.in   { color: var(--clr-primary); }
    .hist-amt.out  { color: var(--clr-error); }

    .how-block {
      background: var(--bg-elev); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: 28px 24px;
    }
    .how-block h3 { font-family: var(--font-display); font-size: 16px; font-weight: 700; margin-bottom: 18px; }
    .how-list { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .how-list li {
      display: flex; align-items: flex-start; gap: 12px;
      font-size: 14px; color: var(--txt-2);
      padding: 12px 14px; background: var(--bg-2);
      border-radius: var(--radius-sm); border-left: 3px solid var(--clr-primary);
    }
  </style>`;
}

function paymentStyles() {
  return `<style>
    .pay-page { max-width: 540px; margin: 0 auto; padding-bottom: 60px; }

    .pay-header {
      display: flex; align-items: center; gap: 16px; margin-bottom: 28px;
    }
    .pay-back-btn {
      padding: 10px 20px; border-radius: 999px;
      border: 1.5px solid var(--line); background: var(--bg-2);
      font-size: 14px; font-weight: 600; color: var(--txt-2);
      cursor: pointer; transition: all .2s; font-family: var(--font-body);
    }
    .pay-back-btn:hover { border-color: var(--clr-primary); color: var(--clr-primary); }
    .pay-header-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 8px; }

    /* Баннер суммы */
    .pay-amount-banner {
      background: var(--gradient-primary); border-radius: var(--radius-lg);
      padding: 24px 28px; margin-bottom: 28px; color: #fff; text-align: center;
      box-shadow: 0 8px 32px rgba(16,185,129,.3);
    }
    .pab-label { font-size: 13px; opacity: .85; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
    .pab-value { font-family: var(--font-display); font-size: 40px; font-weight: 800; line-height: 1; }
    .pab-value span { font-size: 18px; opacity: .8; }

    /* Визуализация карты */
    .card-visual {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      border-radius: 20px; padding: 28px 28px 24px;
      margin-bottom: 28px; color: #fff;
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
      position: relative; overflow: hidden;
      min-height: 180px;
    }
    .card-visual::before {
      content: ''; position: absolute;
      width: 240px; height: 240px; border-radius: 50%;
      background: rgba(16,185,129,.15);
      top: -80px; right: -60px; pointer-events: none;
    }
    .card-visual::after {
      content: ''; position: absolute;
      width: 180px; height: 180px; border-radius: 50%;
      background: rgba(74,222,128,.1);
      bottom: -70px; left: -40px; pointer-events: none;
    }
    .cv-chip { font-size: 28px; margin-bottom: 20px; opacity: .9; }
    .cv-number {
      font-family: 'Courier New', monospace; font-size: 22px;
      letter-spacing: .25em; margin-bottom: 20px;
      text-shadow: 0 2px 4px rgba(0,0,0,.3);
    }
    .cv-bottom { display: flex; align-items: flex-end; gap: 24px; }
    .cv-lbl { font-size: 10px; opacity: .6; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 4px; }
    .cv-val { font-size: 14px; font-weight: 600; letter-spacing: .05em; min-width: 80px; }
    .cv-logo { margin-left: auto; font-size: 32px; }

    /* Форма */
    .pay-form-card {
      background: var(--bg-elev); border: 1px solid var(--line);
      border-radius: var(--radius-lg); padding: 32px 28px;
    }
    .pay-form-card h2 { font-family: var(--font-display); font-size: 20px; font-weight: 700; margin-bottom: 6px; }
    .pay-form-desc { font-size: 14px; color: var(--txt-2); margin-bottom: 28px; }

    .pay-field { margin-bottom: 20px; }
    .pay-field label {
      display: block; font-size: 12px; font-weight: 700; color: var(--txt-2);
      margin-bottom: 8px; text-transform: uppercase; letter-spacing: .07em;
    }
    .pay-input-wrap { position: relative; display: flex; align-items: center; }
    .pi-icon {
      position: absolute; left: 14px; font-size: 18px; pointer-events: none;
    }
    .pay-input-wrap input {
      width: 100%; border: 1.5px solid var(--line);
      border-radius: var(--radius-sm); padding: 14px 14px 14px 48px;
      font-size: 16px; font-weight: 600; background: var(--bg-input);
      color: var(--txt); outline: none; transition: border-color .2s, box-shadow .2s;
      font-family: var(--font-body);
    }
    .pay-input-wrap input:focus {
      border-color: var(--clr-primary);
      box-shadow: 0 0 0 3px rgba(16,185,129,.12);
    }
    .pay-input-wrap input::placeholder { color: var(--txt-3); font-weight: 400; }

    .pay-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    .secure-note {
      font-size: 13px; color: var(--txt-3); text-align: center;
      margin-bottom: 20px; margin-top: 8px;
    }

    .pay-submit-btn {
      width: 100%; padding: 18px;
      background: var(--gradient-primary); color: #fff; border: none;
      border-radius: var(--radius-sm); font-family: var(--font-display);
      font-size: 16px; font-weight: 700; cursor: pointer; transition: all .25s;
      box-shadow: 0 4px 20px rgba(16,185,129,.35);
      display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .pay-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(16,185,129,.45); }
    .pay-submit-btn:disabled { opacity: .6; cursor: not-allowed; transform: none; }
  </style>`;
}

window.renderWallet      = renderWallet;
window.goToPayment       = goToPayment;
window.renderPaymentForm = renderPaymentForm;
window.confirmPayment    = confirmPayment;
window.selectMethod      = selectMethod;
window.selectQuickAmount = selectQuickAmount;
window.clearQuickActive  = clearQuickActive;
window.formatCardNumber  = formatCardNumber;
window.updateCardName    = updateCardName;
window.formatExpiry      = formatExpiry;
