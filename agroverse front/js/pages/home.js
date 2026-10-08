/* pages/home.js — главная «для фермера»: приветствие, крупные действия,
   календарь поля, категории, товары дня и подсказка «как пользоваться». */

const HOME_CATEGORIES = [
  { value: 'Овощи',    key: 'cat_vegetables', icon: 'fa-solid fa-carrot',         img: 'assets/cat-vegetables.jpg' },
  { value: 'Фрукты',   key: 'cat_fruits',     icon: 'fa-solid fa-apple-whole',    img: 'assets/cat-fruits.jpg' },
  { value: 'Зерновые', key: 'cat_grains',     icon: 'fa-solid fa-wheat-awn',      img: 'assets/cat-grains.jpg' },
  { value: 'Зелень',   key: 'cat_greens',     icon: 'fa-solid fa-leaf',           img: 'assets/cat-greens.jpg' },
  { value: 'Молочные', key: 'cat_dairy',      icon: 'fa-solid fa-bottle-droplet', img: 'assets/cat-dairy.jpg' },
  { value: 'Мёд',      key: 'cat_honey',      icon: 'fa-solid fa-jar',            img: '' },
  { value: 'Цветы',    key: 'cat_flowers',    icon: 'fa-solid fa-spa',            img: '' },
  { value: 'Семена',   key: 'cat_seeds',      icon: 'fa-solid fa-seedling',       img: '' },
];

function homeGreeting() {
  const h = new Date().getHours();
  if (h < 11) return t('greet_morning');
  if (h < 18) return t('greet_day');
  return t('greet_evening');
}

/* Нарисованное поле: небо и солнце зависят от времени суток */
function fieldSceneSvg() {
  const h = new Date().getHours();
  const phase = h < 11 ? 'morning' : h < 18 ? 'day' : 'evening';
  const sky = { morning: ['#FDE7B0', '#F7F1DC'], day: ['#BFE3F2', '#EAF6EC'], evening: ['#F4A261', '#F9D9A8'] }[phase];
  const sun = { morning: [120, 118], day: [300, 62], evening: [470, 128] }[phase];
  const rows = Array.from({ length: 9 }, (_, i) => {
    const x = -40 + i * 80;
    return `<path d="M${300 + (x - 300) * 0.18} 190 L${x} 300" stroke="#2F7A3E" stroke-width="3" opacity=".55"/>`;
  }).join('');
  return `<svg viewBox="0 0 600 300" preserveAspectRatio="xMidYMid slice" role="img" aria-hidden="true">
    <defs><linearGradient id="fsSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect width="600" height="300" fill="url(#fsSky)"/>
    <circle cx="${sun[0]}" cy="${sun[1]}" r="34" fill="#F0B429"/>
    <circle cx="${sun[0]}" cy="${sun[1]}" r="52" fill="#F0B429" opacity=".18"/>
    <path d="M0 175 Q120 130 250 165 T600 150 V300 H0Z" fill="#7FB77E"/>
    <path d="M0 200 Q160 165 320 192 T600 182 V300 H0Z" fill="#4E9A51"/>
    <rect x="0" y="190" width="600" height="110" fill="#3E8A45"/>
    ${rows}
    <path d="M0 250 Q300 235 600 250 V300 H0Z" fill="#6B4F38" opacity=".35"/>
    <g fill="#E3B23C">
      <path d="M470 190 l6 -26 l6 26z"/><path d="M490 192 l6 -30 l6 30z"/><path d="M510 190 l6 -24 l6 24z"/>
    </g>
  </svg>`;
}

function homeDateLine() {
  const d = new Date();
  const wd = tx('wd')[d.getDay()];
  const mg = tx('mg')[d.getMonth()];
  const line = `${wd}, ${d.getDate()} ${mg}`;
  return line.charAt(0).toUpperCase() + line.slice(1);
}

function homeActions(isFarmer) {
  const list = isFarmer ? [
    { go: '/product/new', icon: 'fa-solid fa-plus',            title: 'act_sell',          desc: 'act_sell_d', main: true },
    { go: '/orders',      icon: 'fa-solid fa-box',             title: 'act_orders',        desc: 'act_orders_farmer_d' },
    { go: '/chats',       icon: 'fa-solid fa-comment-dots',    title: 'act_chats',         desc: 'act_chats_d' },
    { go: '/market',      icon: 'fa-solid fa-scale-balanced',  title: 'act_market_farmer', desc: 'act_market_farmer_d' },
  ] : [
    { go: '/market',      icon: 'fa-solid fa-store',           title: 'act_buy',           desc: 'act_buy_d', main: true },
    { go: '/cart',        icon: 'fa-solid fa-basket-shopping', title: 'act_cart',          desc: 'act_cart_d', badge: getCartCount() },
    { go: '/orders',      icon: 'fa-solid fa-truck',           title: 'act_orders',        desc: 'act_orders_buyer_d' },
    { go: '/ai',          icon: 'fa-solid fa-circle-question', title: 'act_ai',            desc: 'act_ai_d' },
  ];
  return list.map(a => `
    <button class="act-tile ${a.main ? 'main' : ''}" onclick="router.go('${a.go}')">
      <span class="act-ic"><i class="${a.icon}"></i>${a.badge ? `<span class="act-badge">${a.badge}</span>` : ''}</span>
      <span class="act-title">${t(a.title)}</span>
      <span class="act-desc">${t(a.desc)}</span>
      <span class="act-go">${t('open')} <i class="fa-solid fa-arrow-right"></i></span>
    </button>`).join('');
}

/* Календарь поля: 12 месяцев, текущий отмечен, ниже — что делать в выбранном */
function fieldCalendarHtml(month) {
  const short = tx('m');
  const full = tx('m_full');
  const cal = tx('cal')[month];
  const today = new Date().getMonth();
  const strip = short.map((m, i) => `
    <button class="fc-month ${i === month ? 'sel' : ''} ${i === today ? 'now' : ''}" onclick="homeSelectMonth(${i})" aria-pressed="${i === month}">
      <span>${m}</span>${i === today ? `<em>${t('cal_now')}</em>` : ''}
    </button>`).join('');
  return `
    <div class="fc-strip" role="group">${strip}</div>
    <div class="fc-body">
      <div class="fc-month-name">${full[month]}</div>
      <div class="fc-cols">
        <div class="fc-col harvest">
          <div class="fc-label"><i class="fa-solid fa-basket-shopping"></i> ${t('cal_harvest')}</div>
          <p>${cal.h}</p>
        </div>
        <div class="fc-col sow">
          <div class="fc-label"><i class="fa-solid fa-seedling"></i> ${t('cal_sow')}</div>
          <p>${cal.s}</p>
        </div>
        <div class="fc-col tip">
          <div class="fc-label"><i class="fa-solid fa-lightbulb"></i> ${t('cal_tip')}</div>
          <p>${cal.tip}</p>
        </div>
      </div>
    </div>`;
}

function homeSelectMonth(i) {
  const box = document.getElementById('fieldCalendar');
  if (box) box.innerHTML = fieldCalendarHtml(i);
}
window.homeSelectMonth = homeSelectMonth;

function homeCategories() {
  return HOME_CATEGORIES.map(c => `
    <button class="cat-photo" onclick="router.go('/market?cat=${encodeURIComponent(c.value)}')">
      <span class="cp-media"><i class="${c.icon}"></i>${c.img
        ? `<img src="${c.img}" alt="" loading="lazy" onerror="this.remove()" />` : ''}</span>
      <span class="cp-name">${t(c.key)}</span>
    </button>`).join('');
}

function homeSteps(isFarmer) {
  const keys = isFarmer ? ['f1', 'f2', 'f3'] : ['b1', 'b2', 'b3'];
  const icons = isFarmer
    ? ['fa-solid fa-camera', 'fa-solid fa-tag', 'fa-solid fa-bell']
    : ['fa-solid fa-hand-pointer', 'fa-solid fa-basket-shopping', 'fa-solid fa-truck'];
  return keys.map((k, i) => `
    <li class="fh-step">
      <span class="fh-step-n">${i + 1}</span>
      <div>
        <div class="fh-step-t"><i class="${icons[i]}"></i> ${t('how_' + k)}</div>
        <div class="fh-step-d">${t('how_' + k + '_d')}</div>
      </div>
    </li>`).join('');
}

async function renderHome() {
  const app      = document.getElementById('app');
  const user     = Auth.getUser();
  const isFarmer = Auth.isFarmer();
  const firstName = (user?.name || '').split(' ')[0];

  app.innerHTML = pageShell(`
    <div class="fh">
      <section class="fh-greet">
        <div class="fh-greet-text">
          <div class="fh-date"><i class="fa-regular fa-calendar"></i> ${homeDateLine()}</div>
          <h1 class="fh-hello">${homeGreeting()}${firstName ? `, <span>${firstName}</span>` : ''}!</h1>
          <p class="fh-sub">${t(isFarmer ? 'greet_sub_farmer' : 'greet_sub_buyer')}</p>
        </div>
        <div class="fh-greet-art" aria-hidden="true">${fieldSceneSvg()}</div>
      </section>

      <section class="fh-section">
        <h2 class="fh-h2">${t('what_todo')}</h2>
        <div class="act-grid">${homeActions(isFarmer)}</div>
      </section>

      <section class="fh-section fc-card">
        <div class="fh-head">
          <div>
            <h2 class="fh-h2"><i class="fa-solid fa-sun"></i> ${t('cal_title')}</h2>
            <p class="fh-note">${t('cal_sub')}</p>
          </div>
        </div>
        <div id="fieldCalendar">${fieldCalendarHtml(new Date().getMonth())}</div>
      </section>

      <section class="fh-section">
        <div class="fh-head">
          <h2 class="fh-h2">${t('cats_title')}</h2>
          <a class="fh-more" onclick="router.go('/market')">${t('see_all')} <i class="fa-solid fa-arrow-right"></i></a>
        </div>
        <div class="cat-photo-grid">${homeCategories()}</div>
      </section>

      <section class="fh-section">
        <div class="fh-head">
          <h2 class="fh-h2">${t('market_today')}</h2>
          <a class="fh-more" onclick="router.go('/market')">${t('see_all')} <i class="fa-solid fa-arrow-right"></i></a>
        </div>
        <div id="home-products" class="agri-products-grid"><div class="spinner"></div></div>
      </section>

      <section class="fh-section fh-split">
        <div class="fh-how">
          <h2 class="fh-h2">${t(isFarmer ? 'how_title_farmer' : 'how_title_buyer')}</h2>
          <ol class="fh-steps">${homeSteps(isFarmer)}</ol>
        </div>
        <div class="fh-help">
          <i class="fa-solid fa-circle-question fh-help-ic"></i>
          <h2 class="fh-h2">${t('help_title')}</h2>
          <p>${t('help_text')}</p>
          <button class="btn btn-primary btn-lg" onclick="router.go('/ai')"><i class="fa-solid fa-comment-dots"></i> ${t('help_btn')}</button>
        </div>
      </section>
    </div>
  `);

  try {
    const products = await API.getProducts({ limit: 8 });
    const grid = document.getElementById('home-products');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <i class="fa-solid fa-leaf" style="font-size:48px;color:var(--clr-primary)"></i>
        <p>${t('no_products_yet')} ${isFarmer ? t('add_first') : t('come_later')}</p>
      </div>`;
      return;
    }
    grid.innerHTML = products.slice(0, 8).map(productCardHtml).join('');
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    const grid = document.getElementById('home-products');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</p></div>`;
  }
}

window.renderHome = renderHome;
