/* pages/tariffs.js — Тарифы для фермеров + бонусная система (видно всем) */

function renderTariffs() {
  const app = document.getElementById('app');

  // Данные тарифов 1-в-1 из ТЗ
  const plans = [
    {
      name: 'Standart', price: '$5', period: '/мес', accent: false,
      maxProducts: '5 ' + t('t_products_word'),
      photos: '3 ' + t('t_photos_word'),
      ai: t('t_basic'),
      analytics: t('t_no'),
      priority: t('t_normal'),
      commission: '10%',
      support: 'FAQ',
    },
    {
      name: 'Normal', price: '$15', period: '/мес', accent: true,
      maxProducts: '30 ' + t('t_products_word'),
      photos: '10 ' + t('t_photos_word'),
      ai: t('t_extended'),
      analytics: t('t_basic'),
      priority: t('t_increased'),
      commission: '7%',
      support: 'Email',
    },
    {
      name: 'Premium', price: '$50+', period: '/мес', accent: false,
      maxProducts: t('t_unlimited'),
      photos: t('t_unlimited'),
      ai: t('t_full'),
      analytics: t('t_detailed'),
      priority: t('t_top'),
      commission: '5%',
      support: t('t_personal'),
    },
  ];

  const rows = [
    { key: t('t_max_products'), vals: plans.map(p => p.maxProducts) },
    { key: t('t_photos'),       vals: plans.map(p => p.photos) },
    { key: t('t_ai'),           vals: plans.map(p => p.ai) },
    { key: t('t_analytics'),    vals: plans.map(p => p.analytics) },
    { key: t('t_priority'),     vals: plans.map(p => p.priority) },
    { key: t('t_commission'),   vals: plans.map(p => p.commission) },
    { key: t('t_support'),      vals: plans.map(p => p.support) },
  ];

  const cards = plans.map((p, i) => `
    <div class="tariff-card ${p.accent ? 'featured' : ''}">
      ${p.accent ? '<div class="tariff-badge">★</div>' : ''}
      <h3 class="tariff-name">${p.name}</h3>
      <div class="tariff-price"><span class="tp-amount">${p.price}</span><span class="tp-period">${p.period}</span></div>
      <ul class="tariff-feats">
        ${rows.map(r => `<li><span class="tf-key">${r.key}</span><span class="tf-val">${r.vals[i]}</span></li>`).join('')}
      </ul>
      <button class="btn ${p.accent ? 'btn-primary' : 'btn-outline'} btn-full" onclick="chooseTariff('${p.name}')">${t('choose_plan')}</button>
    </div>
  `).join('');

  // Бонусная система
  const bonuses = [
    { act: { uz: 'Yangi mahsulot qoʻshish', ru: 'Добавление нового продукта', en: 'Add a new product' }, pts: '+10', who: { uz: 'Fermer', ru: 'Фермер', en: 'Farmer' } },
    { act: { uz: 'Muvaffaqiyatli sotuv', ru: 'Успешная продажа', en: 'Successful sale' }, pts: '+5', who: { uz: 'Fermer', ru: 'Фермер', en: 'Farmer' } },
    { act: { uz: 'Mahsulotga sharh qoldirish', ru: 'Оставить отзыв на товар', en: 'Leave a product review' }, pts: '+3', who: { uz: 'Xaridor', ru: 'Покупатель', en: 'Buyer' } },
    { act: { uz: 'Platformadagi birinchi buyurtma', ru: 'Первый заказ на платформе', en: 'First order on the platform' }, pts: '+20', who: { uz: 'Xaridor', ru: 'Покупатель', en: 'Buyer' } },
    { act: { uz: 'Yangi foydalanuvchini taklif qilish', ru: 'Приглашение нового пользователя', en: 'Invite a new user' }, pts: '+15', who: { uz: 'Taklif qilgan', ru: 'Тот, кто пригласил', en: 'The inviter' } },
  ];
  const lang = (window.I18nManager && I18nManager.current) || 'uz';
  const bonusRows = bonuses.map(b => `
    <tr><td>${b.act[lang]}</td><td class="bonus-pts">${b.pts}</td><td>${b.who[lang]}</td></tr>
  `).join('');

  const rulesText = {
    uz: ['1 ball = keyingi buyurtmaga $0.01 chegirma', 'Toʻplangan ballarni tarifni oshirishga almashtirish mumkin', 'Ballar yonib ketmaydi, doimiy saqlanadi', 'Bir buyurtma uchun maksimal yechib olish — summaning 20%'],
    ru: ['1 балл = скидка $0.01 на следующий заказ', 'Накопленные баллы можно обменять на повышение тарифа', 'Баллы не сгорают, хранятся постоянно', 'Максимальное списание баллов за один заказ — 20% от суммы'],
    en: ['1 point = $0.01 discount on the next order', 'Accumulated points can be exchanged to upgrade the plan', 'Points never expire, stored permanently', 'Max redemption per order — 20% of the total'],
  }[lang];

  app.innerHTML = pageShell(`
    <div class="tariffs-page">
      <div class="page-head">
        <h1>${t('tariffs_title')}</h1>
        <p>${t('tariffs_sub')}</p>
      </div>

      <div class="tariffs-grid">${cards}</div>

      <div class="bonus-section">
        <h2>🎁 ${t('bonus_title')}</h2>
        <table class="bonus-table">
          <thead><tr>
            <th>${{ uz: 'Harakat', ru: 'Действие', en: 'Action' }[lang]}</th>
            <th>${{ uz: 'Ballar', ru: 'Баллы', en: 'Points' }[lang]}</th>
            <th>${{ uz: 'Kimga', ru: 'Кому начисляется', en: 'Awarded to' }[lang]}</th>
          </tr></thead>
          <tbody>${bonusRows}</tbody>
        </table>
        <ul class="bonus-rules">
          ${rulesText.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    </div>
  `);
}

function chooseTariff(name) {
  showToast(`${{ uz: 'Tanlangan tarif', ru: 'Выбран тариф', en: 'Selected plan' }[(window.I18nManager && I18nManager.current) || 'uz']}: ${name}`, 'success');
}

window.renderTariffs = renderTariffs;
window.chooseTariff = chooseTariff;
