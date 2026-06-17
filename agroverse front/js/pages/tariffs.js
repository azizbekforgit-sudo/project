/* pages/tariffs.js — Тарифы по ТЗ (Standart $5 / Normal $15 / Premium $50+) */

function renderTariffs() {
  const app  = document.getElementById('app');
  const lang = (window.I18nManager && I18nManager.current) || 'uz';

  /* ── Переводы ── */
  const L = (obj) => obj[lang] || obj.ru || '';

  /* ── Данные тарифов по ТЗ ── */
  const plans = [
    {
      id: 'standart',
      name: 'Standart',
      price: '$5',
      period: { uz: '/oy', ru: '/мес', en: '/mo' },
      accent: false,
      icon: '🌱',
      color: '#6B7280',
      gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
      features: [
        { uz: 'Mahsulot joylash (cheklangan)',  ru: 'Размещение товаров (ограниченно)', en: 'Product listings (limited)' },
        { uz: 'Oddiy AI tavsiyalar',            ru: 'Базовые AI рекомендации',          en: 'Basic AI recommendations' },
        { uz: 'Bozor tahlili',                  ru: 'Анализ рынка',                     en: 'Market analysis' },
      ],
      limits: {
        products: { uz: '5 ta mahsulot',  ru: '5 товаров',     en: '5 products' },
        photos:   { uz: '3 ta rasm',      ru: '3 фото',        en: '3 photos' },
        ai:       { uz: 'Asosiy',         ru: 'Базовый',       en: 'Basic' },
        commission:'10%',
        support:  { uz: 'FAQ',            ru: 'FAQ',           en: 'FAQ' },
      },
    },
    {
      id: 'normal',
      name: 'Normal',
      price: '$15',
      period: { uz: '/oy', ru: '/мес', en: '/mo' },
      accent: true,
      icon: '🌿',
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      badge: { uz: 'Mashhur', ru: 'Популярный', en: 'Popular' },
      features: [
        { uz: "To'liq AI tavsiyalar",           ru: 'Полные AI рекомендации',           en: 'Full AI recommendations' },
        { uz: 'Bozor tahlili (kengaytirilgan)', ru: 'Расширенный анализ рынка',         en: 'Extended market analysis' },
        { uz: 'Ball tizimi',                    ru: 'Бонусная система баллов',           en: 'Bonus point system' },
      ],
      limits: {
        products: { uz: '30 ta mahsulot', ru: '30 товаров',    en: '30 products' },
        photos:   { uz: '10 ta rasm',     ru: '10 фото',       en: '10 photos' },
        ai:       { uz: "Kengaytirilgan", ru: 'Расширенный',   en: 'Extended' },
        commission:'7%',
        support:  { uz: 'Email',          ru: 'Email',         en: 'Email' },
      },
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$50+',
      period: { uz: '/oy', ru: '/мес', en: '/mo' },
      accent: false,
      icon: '🌟',
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      badge: { uz: 'Pro', ru: 'Pro', en: 'Pro' },
      features: [
        { uz: 'Cheksiz AI tavsiyalar',          ru: 'Безлимитные AI рекомендации',      en: 'Unlimited AI recommendations' },
        { uz: "Eksport / B2B bozori",           ru: 'Экспорт / B2B рынок',             en: 'Export / B2B market' },
        { uz: 'Ustuvor joylashuv (TOP)',        ru: 'Приоритетное размещение (ТОП)',    en: 'Priority placement (TOP)' },
        { uz: "Eksklyuziv treninglar",          ru: 'Эксклюзивные тренинги',            en: 'Exclusive trainings' },
      ],
      limits: {
        products: { uz: 'Cheksiz',        ru: 'Безлимит',      en: 'Unlimited' },
        photos:   { uz: 'Cheksiz',        ru: 'Безлимит',      en: 'Unlimited' },
        ai:       { uz: "To'liq",         ru: 'Полный',        en: 'Full' },
        commission:'5%',
        support:  { uz: 'Shaxsiy menejer', ru: 'Личный менеджер', en: 'Personal manager' },
      },
    },
  ];

  /* ── Бонусная система ── */
  const bonuses = [
    {
      act: { uz: 'Yangi mahsulot qoʻshish',         ru: 'Добавление нового товара',       en: 'Add a new product' },
      pts: '+10',
      who: { uz: 'Fermer',                          ru: 'Фермер',                          en: 'Farmer' },
    },
    {
      act: { uz: 'Muvaffaqiyatli sotuv',             ru: 'Успешная продажа',               en: 'Successful sale' },
      pts: '+5',
      who: { uz: 'Fermer',                          ru: 'Фермер',                          en: 'Farmer' },
    },
    {
      act: { uz: 'Mahsulotga sharh qoldirish',      ru: 'Отзыв на товар',                  en: 'Leave a product review' },
      pts: '+3',
      who: { uz: 'Xaridor',                         ru: 'Покупатель',                      en: 'Buyer' },
    },
    {
      act: { uz: "Platformadagi birinchi buyurtma", ru: 'Первый заказ на платформе',       en: 'First order on the platform' },
      pts: '+20',
      who: { uz: 'Xaridor',                         ru: 'Покупатель',                      en: 'Buyer' },
    },
    {
      act: { uz: "Yangi foydalanuvchini taklif",    ru: 'Приглашение нового пользователя', en: 'Invite a new user' },
      pts: '+15',
      who: { uz: 'Taklif qilgan',                   ru: 'Пригласивший',                    en: 'The inviter' },
    },
  ];

  const bonusRules = {
    uz: [
      '1 ball = keyingi buyurtmaga $0.01 chegirma',
      "Toʻplangan ballarni tarifni oshirishga almashtirish mumkin",
      "Ballar yonib ketmaydi, doimiy saqlanadi",
      "Bir buyurtma uchun maksimal yechib olish — summaning 20%",
    ],
    ru: [
      '1 балл = скидка $0.01 на следующий заказ',
      'Накопленные баллы можно обменять на повышение тарифа',
      'Баллы не сгорают, хранятся постоянно',
      'Максимальное списание за один заказ — 20% от суммы',
    ],
    en: [
      '1 point = $0.01 discount on next order',
      'Points can be exchanged for a plan upgrade',
      'Points never expire, stored permanently',
      'Max redemption per order — 20% of total',
    ],
  };

  const chooseLbl = { uz: "Tanlash", ru: 'Выбрать', en: 'Choose' };

  /* ── HTML ── */
  app.innerHTML = pageShell(`
    <style>
      /* ── Tariffs page ── */
      .tariffs-page { max-width: 1100px; margin: 0 auto; padding-bottom: 60px; }

      .tariffs-hero { text-align: center; margin-bottom: 52px; }
      .tariffs-hero h1 { font-family: var(--font-display); font-size: clamp(26px,4vw,38px); font-weight: 800; margin-bottom: 12px; }
      .tariffs-hero p  { font-size: 16px; color: var(--txt-2); max-width: 520px; margin: 0 auto; }

      /* Карточки тарифов */
      .tariffs-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
        margin-bottom: 60px;
        align-items: start;
      }
      @media(max-width:860px){ .tariffs-grid { grid-template-columns: 1fr; max-width: 440px; margin-left: auto; margin-right: auto; } }

      .tariff-card {
        background: var(--bg-elev);
        border: 1.5px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 32px 28px 28px;
        position: relative;
        overflow: hidden;
        transition: transform .3s cubic-bezier(.34,1.56,.64,1), box-shadow .3s;
        display: flex; flex-direction: column;
      }
      .tariff-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 60px rgba(0,0,0,.12);
        border-color: var(--card-color, var(--clr-primary));
      }
      .tariff-card.featured {
        border-color: var(--clr-primary);
        box-shadow: 0 8px 40px rgba(16,185,129,.2);
        transform: scale(1.03);
        z-index: 2;
      }
      .tariff-card.featured:hover { transform: scale(1.03) translateY(-8px); }

      /* Фоновый декор */
      .tariff-card::before {
        content: '';
        position: absolute;
        width: 180px; height: 180px;
        border-radius: 50%;
        top: -70px; right: -50px;
        background: var(--card-color, #10B981);
        opacity: .06;
        pointer-events: none;
        transition: opacity .3s;
      }
      .tariff-card:hover::before { opacity: .1; }

      /* Бейдж */
      .t-badge {
        position: absolute;
        top: 20px; right: 20px;
        background: var(--card-color, var(--clr-primary));
        color: #fff;
        font-size: 11px;
        font-weight: 800;
        padding: 4px 12px;
        border-radius: 999px;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .t-icon { font-size: 42px; margin-bottom: 14px; }
      .t-name { font-family: var(--font-display); font-size: 22px; font-weight: 800; margin-bottom: 4px; }
      .t-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 20px; }
      .t-price { font-family: var(--font-display); font-size: 48px; font-weight: 800; color: var(--card-color, var(--clr-primary)); line-height: 1; }
      .t-period { font-size: 14px; color: var(--txt-3); font-weight: 500; }

      /* Фичи */
      .t-features { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; flex: 1; }
      .t-features li {
        display: flex; align-items: flex-start; gap: 10px;
        font-size: 14px; color: var(--txt-2);
        padding: 10px 12px;
        background: var(--bg-2);
        border-radius: var(--radius-sm);
        border-left: 3px solid var(--card-color, var(--clr-primary));
        line-height: 1.4;
      }
      .t-features li .tf-ic { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

      /* Лимиты */
      .t-limits {
        display: flex; flex-direction: column; gap: 8px;
        margin-bottom: 24px;
        padding: 14px;
        background: var(--bg-2);
        border-radius: var(--radius-sm);
        border: 1px solid var(--line);
      }
      .t-limit-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
      .t-limit-key { color: var(--txt-3); }
      .t-limit-val { font-weight: 700; color: var(--txt); }
      .t-limit-val.accent { color: var(--card-color, var(--clr-primary)); }

      /* Кнопка */
      .t-btn {
        width: 100%;
        padding: 14px;
        border-radius: var(--radius-sm);
        font-family: var(--font-display);
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        border: 2px solid transparent;
        transition: all .25s;
        display: flex; align-items: center; justify-content: center; gap: 8px;
      }
      .t-btn.primary {
        background: var(--card-color, var(--clr-primary));
        color: #fff;
        box-shadow: 0 4px 20px rgba(16,185,129,.3);
      }
      .t-btn.primary:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 30px rgba(16,185,129,.4); }
      .t-btn.outline {
        background: transparent;
        border-color: var(--card-color, var(--clr-primary));
        color: var(--card-color, var(--clr-primary));
      }
      .t-btn.outline:hover {
        background: var(--card-color, var(--clr-primary));
        color: #fff;
        transform: translateY(-2px);
      }

      /* ── Сравнение (таблица) ── */
      .compare-section { margin-bottom: 52px; }
      .compare-section h2 { font-family: var(--font-display); font-size: 22px; font-weight: 800; margin-bottom: 20px; text-align: center; }
      .compare-table { width: 100%; border-collapse: collapse; border-radius: var(--radius-lg); overflow: hidden; border: 1px solid var(--line); }
      .compare-table th {
        padding: 16px 20px;
        text-align: left;
        font-family: var(--font-display);
        font-size: 14px;
        font-weight: 700;
        background: var(--bg-2);
        border-bottom: 1px solid var(--line);
      }
      .compare-table th:first-child { color: var(--txt-2); }
      .compare-table th.col-normal { color: var(--clr-primary); }
      .compare-table th.col-premium { color: #F59E0B; }
      .compare-table td {
        padding: 14px 20px;
        font-size: 14px;
        border-bottom: 1px solid var(--line);
        color: var(--txt-2);
      }
      .compare-table tr:last-child td { border-bottom: none; }
      .compare-table tr:nth-child(even) td { background: var(--bg-2); }
      .compare-table td:not(:first-child) { font-weight: 600; color: var(--txt); text-align: center; }
      .compare-table td.hl { color: var(--clr-primary); }
      .compare-table td.hl-gold { color: #F59E0B; }

      /* ── Бонусы ── */
      .bonus-section {
        background: var(--bg-elev);
        border: 1px solid var(--line);
        border-radius: var(--radius-lg);
        padding: 36px 32px;
        margin-bottom: 32px;
      }
      .bonus-section h2 { font-family: var(--font-display); font-size: 22px; font-weight: 800; margin-bottom: 24px; text-align: center; }

      .bonus-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
      .bonus-table th {
        padding: 12px 16px; text-align: left;
        font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
        color: var(--txt-3); background: var(--bg-2);
        border-bottom: 1px solid var(--line);
      }
      .bonus-table td { padding: 12px 16px; border-bottom: 1px solid var(--line); font-size: 14px; color: var(--txt-2); }
      .bonus-table tr:last-child td { border-bottom: none; }
      .bonus-pts { font-family: var(--font-display); font-weight: 800; color: var(--clr-primary) !important; font-size: 16px !important; }

      .bonus-rules {
        list-style: none;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px,1fr));
        gap: 12px;
      }
      .bonus-rules li {
        padding: 14px 16px;
        background: rgba(16,185,129,.07);
        border: 1px solid rgba(16,185,129,.2);
        border-radius: var(--radius-sm);
        font-size: 13px;
        color: var(--txt-2);
        line-height: 1.5;
        position: relative;
        padding-left: 40px;
      }
      .bonus-rules li::before {
        content: '✓';
        position: absolute;
        left: 14px;
        color: var(--clr-primary);
        font-weight: 800;
        font-size: 16px;
      }
    </style>

    <div class="tariffs-page">

      <!-- Hero -->
      <div class="tariffs-hero">
        <h1>${{ uz: "💼 Tariflar", ru: '💼 Тарифные планы', en: '💼 Pricing Plans' }[lang]}</h1>
        <p>${{ uz: "O'zingizga mos tarifni tanlang va biznesingizni o'stiring", ru: 'Выберите подходящий тарифный план и развивайте свой бизнес', en: 'Choose a plan that fits your needs and grow your business' }[lang]}</p>
      </div>

      <!-- Карточки -->
      <div class="tariffs-grid">
        ${plans.map(p => `
          <div class="tariff-card ${p.accent ? 'featured' : ''}" style="--card-color: ${p.color}">
            ${p.badge ? `<div class="t-badge">${L(p.badge)}</div>` : ''}
            <div class="t-icon">${p.icon}</div>
            <div class="t-name">${p.name}</div>
            <div class="t-price-row">
              <div class="t-price">${p.price}</div>
              <div class="t-period">${L(p.period)}</div>
            </div>

            <ul class="t-features">
              ${p.features.map(f => `<li><span class="tf-ic">✦</span>${L(f)}</li>`).join('')}
            </ul>

            <div class="t-limits">
              <div class="t-limit-row">
                <span class="t-limit-key">${{ uz: "Mahsulotlar", ru: 'Товаров', en: 'Products' }[lang]}</span>
                <span class="t-limit-val accent">${L(p.limits.products)}</span>
              </div>
              <div class="t-limit-row">
                <span class="t-limit-key">${{ uz: "Rasmlar", ru: 'Фото', en: 'Photos' }[lang]}</span>
                <span class="t-limit-val">${L(p.limits.photos)}</span>
              </div>
              <div class="t-limit-row">
                <span class="t-limit-key">${{ uz: "Komissiya", ru: 'Комиссия', en: 'Commission' }[lang]}</span>
                <span class="t-limit-val">${p.limits.commission}</span>
              </div>
              <div class="t-limit-row">
                <span class="t-limit-key">${{ uz: "Yordam", ru: 'Поддержка', en: 'Support' }[lang]}</span>
                <span class="t-limit-val">${L(p.limits.support)}</span>
              </div>
            </div>

            <button class="t-btn ${p.accent ? 'primary' : 'outline'}" onclick="chooseTariff('${p.name}')">
              ${chooseLbl[lang]} — ${p.price}
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Таблица сравнения -->
      <div class="compare-section">
        <h2>${{ uz: "📊 Tariflarni solishtirish", ru: '📊 Сравнение тарифов', en: '📊 Plan comparison' }[lang]}</h2>
        <table class="compare-table">
          <thead>
            <tr>
              <th>${{ uz: 'Xususiyat', ru: 'Параметр', en: 'Feature' }[lang]}</th>
              <th>Standart</th>
              <th class="col-normal">Normal ★</th>
              <th class="col-premium">Premium</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${{ uz: 'Narx', ru: 'Цена', en: 'Price' }[lang]}</td>
              <td>$5</td><td class="hl">$15</td><td class="hl-gold">$50+</td>
            </tr>
            <tr>
              <td>${{ uz: 'Mahsulotlar', ru: 'Товаров', en: 'Products' }[lang]}</td>
              <td>5</td><td class="hl">30</td><td class="hl-gold">${{ uz: 'Cheksiz', ru: 'Безлимит', en: 'Unlimited' }[lang]}</td>
            </tr>
            <tr>
              <td>${{ uz: "AI tavsiyalar", ru: 'AI рекомендации', en: 'AI recommendations' }[lang]}</td>
              <td>${{ uz: "Oddiy", ru: 'Базовые', en: 'Basic' }[lang]}</td>
              <td class="hl">${{ uz: "To'liq", ru: 'Полные', en: 'Full' }[lang]}</td>
              <td class="hl-gold">${{ uz: "Cheksiz", ru: 'Безлимит', en: 'Unlimited' }[lang]}</td>
            </tr>
            <tr>
              <td>${{ uz: "Bozor tahlili", ru: 'Анализ рынка', en: 'Market analysis' }[lang]}</td>
              <td>✓</td><td class="hl">✓+</td><td class="hl-gold">✓✓</td>
            </tr>
            <tr>
              <td>${{ uz: "Ball tizimi", ru: 'Бонусная система', en: 'Bonus system' }[lang]}</td>
              <td>—</td><td class="hl">✓</td><td class="hl-gold">✓</td>
            </tr>
            <tr>
              <td>${{ uz: "Eksport / B2B", ru: 'Экспорт / B2B', en: 'Export / B2B' }[lang]}</td>
              <td>—</td><td>—</td><td class="hl-gold">✓</td>
            </tr>
            <tr>
              <td>${{ uz: "Ustuvor joylashuv", ru: 'Приоритетное размещение', en: 'Priority placement' }[lang]}</td>
              <td>—</td><td>—</td><td class="hl-gold">TOP</td>
            </tr>
            <tr>
              <td>${{ uz: "Trening / Akademiya", ru: 'Тренинги / Академия', en: 'Training / Academy' }[lang]}</td>
              <td>—</td><td>—</td><td class="hl-gold">${{ uz: "Eksklyuziv", ru: 'Эксклюзивно', en: 'Exclusive' }[lang]}</td>
            </tr>
            <tr>
              <td>${{ uz: "Komissiya", ru: 'Комиссия', en: 'Commission' }[lang]}</td>
              <td>10%</td><td class="hl">7%</td><td class="hl-gold">5%</td>
            </tr>
            <tr>
              <td>${{ uz: "Yordam", ru: 'Поддержка', en: 'Support' }[lang]}</td>
              <td>FAQ</td><td class="hl">Email</td><td class="hl-gold">${{ uz: "Shaxsiy", ru: 'Личный', en: 'Personal' }[lang]}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Бонусная система -->
      <div class="bonus-section">
        <h2>🎁 ${{ uz: "Bonus ball tizimi", ru: 'Бонусная система баллов', en: 'Bonus Point System' }[lang]}</h2>
        <table class="bonus-table">
          <thead>
            <tr>
              <th>${{ uz: 'Harakat', ru: 'Действие', en: 'Action' }[lang]}</th>
              <th>${{ uz: 'Ballar', ru: 'Баллы', en: 'Points' }[lang]}</th>
              <th>${{ uz: 'Kimga', ru: 'Кому', en: 'Awarded to' }[lang]}</th>
            </tr>
          </thead>
          <tbody>
            ${bonuses.map(b => `
              <tr>
                <td>${L(b.act)}</td>
                <td class="bonus-pts">${b.pts}</td>
                <td>${L(b.who)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <ul class="bonus-rules">
          ${(bonusRules[lang] || bonusRules.ru).map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>

    </div>
  `);
}

function chooseTariff(name) {
  const lang = (window.I18nManager && I18nManager.current) || 'uz';
  const msg = {
    uz: `"${name}" tarifi tanlandi`,
    ru: `Выбран тариф "${name}"`,
    en: `Plan "${name}" selected`,
  };
  showToast(msg[lang], 'success');
}

window.renderTariffs = renderTariffs;
window.chooseTariff  = chooseTariff;
