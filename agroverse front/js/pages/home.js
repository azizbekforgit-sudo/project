/* pages/home.js — главная: первый экран, категории, свежие объявления,
   календарь поля и подсказка «как пользоваться». */

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
  if (!box) return;
  const prev = box.querySelector('.fc-strip')?.scrollLeft || 0;
  box.innerHTML = fieldCalendarHtml(i);
  const strip = box.querySelector('.fc-strip');
  if (strip) strip.scrollLeft = prev;
}

/* На телефоне месяцы листаются вбок — показываем текущий в центре */
function centerCurrentMonth() {
  const strip = document.querySelector('#fieldCalendar .fc-strip');
  const sel = strip?.querySelector('.sel');
  if (strip && sel && strip.scrollWidth > strip.clientWidth) {
    strip.scrollLeft = sel.offsetLeft - strip.clientWidth / 2 + sel.clientWidth / 2;
  }
}
window.homeSelectMonth = homeSelectMonth;

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

/* Плитки категорий: как в дизайне — иконка и подпись */
function homeCatTiles() {
  return HOME_CATEGORIES.map(c => `
    <button class="hm-cat" onclick="router.go('/market?cat=${encodeURIComponent(c.value)}')">
      <i class="${c.icon}" aria-hidden="true"></i><span>${t(c.key)}</span>
    </button>`).join('');
}

async function renderHome() {
  const app      = document.getElementById('app');
  const isFarmer = Auth.isFarmer();

  app.innerHTML = pageShell(`
    <div class="hm">
      <section class="hm-hero">
        <div class="hm-hero-text">
          <h1 class="hm-h1"><span>${t('hm_h1a')}</span><span>${t('hm_h1b')}</span></h1>
          <p class="hm-lead">${t('hm_lead')}</p>
          <div class="hm-cta">
            <button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fa-solid fa-magnifying-glass"></i> ${t('hm_find')}</button>
            ${isFarmer ? `<button class="btn btn-outline btn-lg" onclick="router.go('/product/new')"><i class="fa-solid fa-seedling"></i> ${t('hm_sell')}</button>` : ''}
          </div>
        </div>
        <div class="hm-hero-art" aria-hidden="true">
          <div class="hm-art-light">${fieldSceneSvg()}</div>
          <img class="hm-art-dark" src="assets/hero-dusk.svg" alt="" loading="lazy" />
        </div>
      </section>

      <section class="hm-section" aria-label="${t('hm_cats')}">
        <div class="hm-cats">${homeCatTiles()}</div>
      </section>

      <section class="hm-section">
        <div class="v3-head">
          <h2 class="v3-h2">${t('hm_fresh')}</h2>
          <a class="v3-more" onclick="router.go('/market')">${t('see_all')} <i class="fa-solid fa-arrow-right"></i></a>
        </div>
        <div id="home-products" class="agri-products-grid"><div class="spinner"></div></div>
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

  centerCurrentMonth();

  try {
    const products = await API.getProducts({ limit: 8 });
    const grid = document.getElementById('home-products');
    if (!grid) return;
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <i class="fa-solid fa-leaf" style="font-size:48px;color:var(--field)"></i>
        <p>${t('no_products_yet')} ${isFarmer ? t('add_first') : t('come_later')}</p>
      </div>`;
      return;
    }
    grid.innerHTML = products.slice(0, 8).map(productCardHtml).join('');
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    const grid = document.getElementById('home-products');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p><i class="fa-solid fa-triangle-exclamation"></i> ${escHtml(e.message)}</p></div>`;
  }
}

window.renderHome = renderHome;
