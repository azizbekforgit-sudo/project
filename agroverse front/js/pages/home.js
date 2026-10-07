/* pages/home.js — hero + scroll animations + button effects + Courier Remainder */

const HOME_CATEGORIES = [
  { value: 'Овощи',    icon: 'fa-solid fa-carrot',        key: 'cat_vegetables', tint: '#10B981', img: 'assets/cat-vegetables.jpg', bg: 'linear-gradient(135deg,#10B981,#059669)',
    desc: 'Свежие овощи прямо с грядок узбекских фермеров. Помидоры, огурцы, перец и баклажаны — собраны сегодня, доставлены завтра.',
    features: ['Помидоры, огурцы, перец и баклажаны', 'Выращены без химикатов и ГМО', 'Сбор и отгрузка в один день'] },
  { value: 'Фрукты',   icon: 'fa-solid fa-apple-whole',     key: 'cat_fruits',     tint: '#F59E0B', img: 'assets/cat-fruits.jpg',     bg: 'linear-gradient(135deg,#F59E0B,#D97706)',
    desc: 'Сладкие арбузы, дыни, гранаты и цитрусовые — выращенные под солнцем Узбекистана.',
    features: ['Арбузы, дыни, гранаты и яблоки', 'Натуральная сладость без добавок', 'Спелые и сочные плоды'] },
  { value: 'Зелень',   icon: 'fa-solid fa-leaf',          key: 'cat_greens',     tint: '#22C55E', img: 'assets/cat-greens.jpg',     bg: 'linear-gradient(135deg,#22C55E,#16A34A)',
    desc: 'Базилик, кинза, укроп и зелёный лук — ароматная зелень для вашего стола.',
    features: ['Базилик, кинза, укроп и перо', 'Срезка утром — доставка днём', 'Максимум витаминов и аромата'] },
  { value: 'Зерновые', icon: 'fa-solid fa-wheat-awn',         key: 'cat_grains',     tint: '#D97706', img: 'assets/cat-grains.jpg',     bg: 'linear-gradient(135deg,#D97706,#B45309)',
    desc: 'Пшеница, рис и кукуруза — качественные зерновые от проверенных фермеров.',
    features: ['Пшеница, рис и кукуруза', 'Экологически чистые продукты', 'Основа здорового питания'] },
  { value: 'Молочные', icon: 'fa-solid fa-bottle-droplet',          key: 'cat_dairy',      tint: '#3B82F6', img: 'assets/cat-dairy.jpg',      bg: 'linear-gradient(135deg,#3B82F6,#2563EB)',
    desc: 'Настоящее деревенское молоко, домашний творог, сыры и свежая сметана без консервантов.',
    features: ['Молоко, кефир, сметана и творог', 'Без консервантов и добавок', 'Свежие каждый день'] },
  { value: 'Мёд',      icon: 'fa-solid fa-jar',         key: 'cat_honey',      tint: '#EAB308', img: 'assets/cat-honey.jpg',      bg: 'linear-gradient(135deg,#EAB308,#CA8A04)',
    desc: 'Натуральный мёд горных пасек — жидкий, цветочный и гречишный.',
    features: ['Жидкий, цветочный и гречишный', 'С горных пасек Узбекистана', '100% натуральный продукт'] },
  { value: 'Цветы',       icon: 'fa-solid fa-seedling',           key: 'cat_flowers',    tint: '#EC4899', img: 'assets/cat-flowers.jpg',    bg: 'linear-gradient(135deg,#EC4899,#DB2777)',
    desc: 'Букеты и цветочные композиции — свежие цветы для любого повода.',
    features: ['Розы, тюльпаны и хризантемы', 'Авторские букеты и композиции', 'Свежая срезка дня'] },
  { value: 'Саженцы',     icon: 'fa-solid fa-tree',         key: 'cat_seedlings',  tint: '#059669', img: 'assets/cat-seedlings.jpg',  bg: 'linear-gradient(135deg,#059669,#047857)',
    desc: 'Рассада и саженцы плодовых деревьев — начните свой сад с нами.',
    features: ['Рассада овощей и трав', 'Плодовые и декоративные деревья', 'Проверенная приживаемость'] },
  { value: 'Бахчевые',    icon: 'fa-solid fa-lemon', key: 'cat_melon',      tint: '#10B981', img: 'assets/cat-melon.jpg',      bg: 'linear-gradient(135deg,#10B981,#34D399)',
    desc: 'Арбузы, дыни и тыквы — сладкие бахчевые прямо с полей Хорезма.',
    features: ['Арбузы и дыни из Хорезма', 'Сахарные и идеально спелые', 'Сезонный вкус лета'] },
  { value: 'Семена',      icon: 'fa-solid fa-seedling',         key: 'cat_seeds',      tint: '#8B5CF6', img: 'assets/cat-seeds.jpg',      bg: 'linear-gradient(135deg,#8B5CF6,#7C3AED)',
    desc: 'Качественные семена овощей и цветов — для вашего будущего урожая.',
    features: ['Семена овощей и цветов', 'Проверенные узбекские сорта', 'Высокая всхожесть 95%+'] },
  { value: 'Земля',       icon: 'fa-solid fa-mound',              key: 'cat_land',       tint: '#92400E', img: 'assets/cat-land.jpg',       bg: 'linear-gradient(135deg,#92400E,#78350F)',
    desc: 'Плодородная земля и удобрения — для здорового роста ваших растений.',
    features: ['Плодородный грунт и компост', 'Минеральные и органические удобрения', 'Для теплиц, полей и садов'] },
];

const HOW_IT_WORKS = [
  { icon: 'fa-solid fa-user-plus',      key: 'how_reg' },
  { icon: 'fa-solid fa-store',     key: 'how_find' },
  { icon: 'fa-solid fa-cart-shopping', key: 'how_order' },
  { icon: 'fa-solid fa-leaf',          key: 'how_deliver' },
];

const DASH_BARS = [30,42,38,55,48,62,58,70,65,80,75,88,82,100];

/* ── Animated counter ── */
function animateCounter(el, target, duration, suffix = '') {
  if (!el) return;
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(ease * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

/* ── Styles ── */
function injectStyles() {
  if (document.getElementById('av-home-styles')) return;
  const style = document.createElement('style');
  style.id = 'av-home-styles';
  style.textContent = `
    /* ── Hero fullscreen (clean white) ── */
    .hero-light {
      position: relative;
      min-height: 100vh;
      width: 100%;
      margin-top: -80px;
      margin-bottom: 60px;
      display: flex;
      align-items: center;
      overflow: hidden;
      background: #ffffff;
      border-radius: 0;
    }
    .hero-light-bg { display: none; }
    .hero-light-dots { display: none; }
    .hero-light-inner {
      position: relative; z-index: 2;
      max-width: 1400px; margin: 0 auto;
      padding: clamp(80px,8vw,120px) clamp(28px,4vw,60px) clamp(60px,6vw,80px);
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      align-items: center;
    }
    @media (max-width: 900px) {
      .hero-light-inner { grid-template-columns: 1fr; }
      .hero-dashboard { display: none; }
    }

    .hero-orb { display: none; }

    /* Dashboard */
    .hero-dashboard {
      opacity: 0; transform: translateY(20px);
      transition: opacity 0.6s ease 0.3s, transform 0.6s ease 0.3s;
      margin-left: -30px;
    }
    .hero-dashboard.visible { opacity: 1; transform: translateY(0); }
    .dash-card {
      background: #ffffff;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 20px; padding: 28px 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.08);
      width: 100%;
    }
    .dash-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .dash-url { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9ca3af; font-family: monospace; }
    .dash-dot { width: 10px; height: 10px; border-radius: 50%; }
    .dash-live {
      background: rgba(22,163,74,0.1); color: var(--clr-green);
      border: 1px solid rgba(22,163,74,0.2);
      border-radius: 20px; padding: 4px 12px;
      font-size: 12px; font-weight: 600;
      display: flex; align-items: center; gap: 5px;
    }
    .dash-live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: var(--clr-green); animation: pulse 2s ease-in-out infinite; }
    .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
    .dash-tile {
      background: rgba(22,163,74,0.05); border: 1px solid rgba(22,163,74,0.1);
      border-radius: 14px; padding: 20px;
      opacity: 0; transform: translateY(8px);
      transition: opacity 0.3s ease, transform 0.3s ease;
    }
    .dash-tile.visible { opacity: 1; transform: translateY(0); }
    .dash-tile-label { font-size: 12px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 7px; display: flex; align-items: center; gap: 5px; }
    .dash-tile-val { font-size: 16px; font-weight: 700; color: var(--clr-green); }
    .dash-chart { display: flex; align-items: flex-end; gap: 5px; height: 80px; margin-bottom: 18px; }
    .dash-bar {
      flex: 1; border-radius: 2px 2px 0 0;
      background: linear-gradient(to top, var(--clr-green), #4ade80);
      opacity: 0; transform: scaleY(0); transform-origin: bottom;
      transition: opacity 0.3s ease, transform 0.4s ease;
    }
    .dash-bar.visible { opacity: 0.6; transform: scaleY(1); }
    .dash-bar.hi.visible { opacity: 1; }
    .dash-footer {
      display: flex; align-items: center; gap: 14px;
      background: rgba(22,163,74,0.05); border-radius: 14px; padding: 18px 22px;
      opacity: 0; transform: translateY(4px);
      transition: opacity 0.3s ease 0.5s, transform 0.3s ease 0.5s;
    }
    .dash-footer.visible { opacity: 1; transform: translateY(0); }
    .dash-footer-ic { width: 40px; height: 40px; border-radius: 10px; background: linear-gradient(135deg, var(--clr-green), #4ade80); display: grid; place-items: center; color: #fff; font-size: 18px; }
    .dash-footer-text { font-size: 14px; }
    .dash-footer-text b { color: var(--clr-green); display: block; }
    .dash-footer-text span { color: #9ca3af; }

    /* ── Hero text word-by-word animation ── */
    .hero-word {
      display: inline-block;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .hero-word.in { opacity: 1; transform: translateY(0); }
    .hero-badge-anim { opacity: 0; transform: translateY(-10px); transition: opacity 0.4s ease, transform 0.4s ease; }
    .hero-badge-anim.in { opacity: 1; transform: translateY(0); }
    .hero-sub-anim { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease 0.1s, transform 0.5s ease 0.1s; }
    .hero-sub-anim.in { opacity: 1; transform: translateY(0); }
    .hero-actions-anim { opacity: 0; transform: translateY(14px); transition: opacity 0.5s ease, transform 0.5s ease; }
    .hero-actions-anim.in { opacity: 1; transform: translateY(0); }

    /* Stats entrance */
    .hero-stat-item {
      display: flex; flex-direction: column;
      opacity: 0; transform: translateY(12px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .hero-stat-item.visible { opacity: 1; transform: translateY(0); }
    .hero-stat-item b { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: var(--clr-green); line-height: 1; }
    .hero-stat-item span { color: var(--muted); font-size: 13px; margin-top: 4px; }

    /* ── Button effects (minimal) ── */
    .btn-ripple {
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,0.3);
      transform: scale(0);
      animation: rippleAnim 0.5s ease-out forwards;
      pointer-events: none; z-index: 3;
    }
    @keyframes rippleAnim {
      0%   { transform: scale(0); opacity: 1; }
      60%  { transform: scale(4); opacity: 0.2; }
      100% { transform: scale(5); opacity: 0; }
    }

    /* ── Scroll reveal ── */
    .scroll-reveal, .scroll-reveal-left, .scroll-reveal-scale {
      opacity: 0; transform: translateY(24px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .scroll-reveal-left { transform: translateX(-24px); }
    .scroll-reveal-scale { transform: scale(0.92); }
    .scroll-reveal.revealed, .scroll-reveal-left.revealed, .scroll-reveal-scale.revealed {
      opacity: 1; transform: translateY(0) translateX(0) scale(1);
    }
    .delay-1 { transition-delay: 0.05s !important; }
    .delay-2 { transition-delay: 0.1s !important; }
    .delay-3 { transition-delay: 0.15s !important; }
    .delay-4 { transition-delay: 0.2s !important; }
    .delay-5 { transition-delay: 0.25s !important; }
    .delay-6 { transition-delay: 0.3s !important; }

    /* How-card, tip, benefit, promo scroll reveal */
    .hm-card, .tip-card, .bn-card, .promo-modern {
      opacity: 0;
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .hm-card.revealed, .tip-card.revealed, .bn-card.revealed, .promo-modern.revealed {
      opacity: 1; transform: translateY(0) translateX(0);
    }
    .hm-card.fade-out, .tip-card.fade-out, .bn-card.fade-out, .promo-modern.fade-out {
      opacity: 0; transition: opacity 0.3s ease;
    }
    .section-head { opacity: 0; transform: translateY(16px); transition: opacity 0.4s ease, transform 0.4s ease; }
    .section-head.revealed { opacity: 1; transform: translateY(0); }

    /* Reminder banner */
    .remind-banner {
      background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); color: #92400e;
      padding: 1.25rem; border-radius: var(--radius-lg);
      margin-bottom: 2rem; display: flex; align-items: center; gap: 1.5rem;
      box-shadow: var(--shadow);
    }
    .rb-content { flex: 1; }
    .rb-title { font-weight: 700; margin-bottom: 4px; display: block; font-size: 1rem; }
    .rb-text { font-size: 0.9rem; line-height: 1.4; opacity: 0.9; }
    .rb-actions { display: flex; gap: 10px; }

    /* ── Category Carousel ── */
    .cc-layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 24px;
      align-items: stretch;
    }
    @media (max-width: 900px) {
      .cc-layout { grid-template-columns: 1fr; }
      .cc-detail { min-height: auto !important; }
    }
    .cc-viewport {
      overflow: hidden;
      border-radius: 20px;
      background: linear-gradient(135deg, rgba(16,185,129,0.06) 0%, rgba(5,150,105,0.03) 100%);
      border: 1px solid rgba(16,185,129,0.12);
      padding: 28px 0;
      position: relative;
    }
    .cc-viewport::before, .cc-viewport::after {
      content: ''; position: absolute; top: 0; bottom: 0; width: 80px; z-index: 2; pointer-events: none;
    }
    .cc-viewport::before { left: 0; background: linear-gradient(to right, rgba(240,253,244,0.95), transparent); }
    .cc-viewport::after { right: 0; background: linear-gradient(to left, rgba(240,253,244,0.95), transparent); }

    .cc-track {
      display: flex;
      animation: ccScroll 35s linear infinite;
      width: max-content;
    }
    .cc-viewport:hover .cc-track { animation-play-state: paused; }

    .cc-group {
      display: flex;
      gap: 16px;
      padding-right: 16px;
    }
    @keyframes ccScroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .cc-item {
      flex-shrink: 0;
      width: 130px;
      height: 160px;
      border-radius: 18px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      cursor: pointer;
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s, opacity 0.4s;
      text-align: center;
      position: relative;
      border: 2px solid transparent;
      overflow: hidden;
    }
    .cc-item::before {
      content: ''; position: absolute; inset: 0; border-radius: inherit;
      background: inherit; z-index: 0; opacity: 0.92;
    }
    .cc-item:hover {
      transform: scale(1.15) translateY(-6px);
      box-shadow: 0 20px 50px rgba(0,0,0,0.18);
      z-index: 3;
      border-color: rgba(255,255,255,0.5);
    }
    .cc-item.dimmed {
      opacity: 0.25;
      transform: scale(0.88);
      pointer-events: none;
    }

    .cc-item-ic {
      width: 52px; height: 52px; border-radius: 15px;
      display: grid; place-items: center; font-size: 24px;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(6px);
      box-shadow: 0 4px 14px rgba(0,0,0,0.1);
      position: relative; z-index: 1;
    }
    .cc-item-name {
      font-family: var(--font-display);
      font-size: 13px; font-weight: 700;
      color: #fff; text-shadow: 0 1px 6px rgba(0,0,0,0.4);
      position: relative; z-index: 1;
    }

    /* Detail panel */
    .cc-detail {
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0,0,0,0.07);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.5s cubic-bezier(0.4,0,0.2,1);
      min-height: 380px;
    }
    .cc-detail.empty {
      align-items: center;
      justify-content: center;
      padding: 40px 30px;
    }
    .cc-ph { text-align: center; color: #94a3b8; }
    .cc-ph-icon { font-size: 52px; margin-bottom: 16px; opacity: 0.4; }
    .cc-ph-text { font-size: 15px; font-weight: 500; line-height: 1.5; }

    .cd-head {
      padding: 28px 26px 20px;
      display: flex; align-items: center; gap: 16px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    .cd-icon {
      width: 60px; height: 60px; border-radius: 16px;
      display: grid; place-items: center; font-size: 28px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.12);
      flex-shrink: 0;
    }
    .cd-titles { flex: 1; }
    .cd-name {
      font-family: var(--font-display);
      font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 3px;
    }
    .cd-count { font-size: 13px; color: #64748b; font-weight: 500; }

    .cd-body { padding: 22px 26px 26px; flex: 1; display: flex; flex-direction: column; }
    .cd-desc { font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 18px; }
    .cd-features { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .cd-feat { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #475569; }
    .cd-feat i { color: #10b981; font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
    .cd-action { margin-top: auto; }

    /* Timer bar */
    .cd-timer-wrap { padding: 0 26px 14px; }
    .cd-timer {
      height: 3px; background: #e2e8f0; border-radius: 2px; overflow: hidden;
    }
    .cd-timer-fill {
      height: 100%; background: linear-gradient(90deg, #10b981, #34d399);
      border-radius: 2px; transition: width 1s linear;
    }

    /* ── How it works modern ── */
    .how-modern {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      position: relative;
    }
    .how-modern::before {
      content: '';
      position: absolute; top: 52px; left: 14%; right: 14%;
      height: 2px;
      background: linear-gradient(90deg, transparent, rgba(16,185,129,0.25), transparent);
      z-index: 0;
    }
    @media (max-width: 900px) {
      .how-modern { grid-template-columns: repeat(2, 1fr); }
      .how-modern::before { display: none; }
    }
    @media (max-width: 500px) {
      .how-modern { grid-template-columns: 1fr; }
    }

    .hm-card {
      text-align: center; padding: 32px 18px;
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 20px; position: relative; z-index: 1;
      transition: transform 0.3s, box-shadow 0.3s;
    }
    .hm-card:hover { transform: translateY(-6px); box-shadow: 0 16px 40px rgba(0,0,0,0.08); }
    .hm-num {
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff; font-size: 17px; font-weight: 800;
      display: grid; place-items: center;
      margin: 0 auto 16px;
      box-shadow: 0 4px 16px rgba(16,185,129,0.3);
    }
    .hm-icon {
      width: 54px; height: 54px; border-radius: 15px;
      background: rgba(16,185,129,0.1);
      display: grid; place-items: center;
      margin: 0 auto 14px; font-size: 24px; color: #10b981;
    }
    .hm-label { font-size: 15px; font-weight: 700; color: #0f172a; }

    /* ── AI Promo modern ── */
    .promo-modern {
      background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(52,211,153,0.04) 100%);
      border: 1px solid rgba(16,185,129,0.15);
      border-radius: 20px;
      padding: 36px 40px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      flex-wrap: wrap;
    }
    .promo-modern-left { display: flex; align-items: center; gap: 18px; }
    .promo-modern-ic {
      width: 56px; height: 56px; border-radius: 16px;
      background: linear-gradient(135deg, #10b981, #059669);
      display: grid; place-items: center; font-size: 24px; color: #fff;
      box-shadow: 0 6px 20px rgba(16,185,129,0.3);
      flex-shrink: 0;
    }
    .promo-modern h3 { font-family: var(--font-display); font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .promo-modern p { font-size: 14px; color: #64748b; margin: 0; }

    /* ── Benefits / Tips modern ── */
    .benefits-modern {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 700px) {
      .benefits-modern { grid-template-columns: 1fr; }
    }
    .bn-card {
      background: rgba(255,255,255,0.88);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.6);
      border-radius: 18px;
      padding: 28px 24px;
      display: flex; gap: 16px; align-items: flex-start;
      transition: transform 0.3s, box-shadow 0.3s;
      box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    }
    .bn-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.08); }
    .bn-ic {
      width: 48px; height: 48px; border-radius: 14px;
      display: grid; place-items: center; font-size: 22px;
      flex-shrink: 0;
    }
    .bn-text h4 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .bn-text p { font-size: 13px; color: #64748b; margin: 0; line-height: 1.5; }
  `;
  document.head.appendChild(style);
}

/* ── Hero text word-by-word entrance ── */
function animateHeroText() {
  const badge = document.querySelector('.hero-badge-anim');
  if (badge) setTimeout(() => badge.classList.add('in'), 100);

  const words = document.querySelectorAll('.hero-word');
  words.forEach((w, i) => {
    setTimeout(() => w.classList.add('in'), 250 + i * 80);
  });

  const sub = document.querySelector('.hero-sub-anim');
  if (sub) {
    const delay = 250 + words.length * 80 + 80;
    setTimeout(() => sub.classList.add('in'), delay);
  }

  const actions = document.querySelector('.hero-actions-anim');
  if (actions) {
    const delay = 250 + words.length * 80 + 200;
    setTimeout(() => actions.classList.add('in'), delay);
  }

  document.querySelectorAll('.hero-stat-item').forEach((el, i) => {
    const delay = 400 + words.length * 80 + i * 150;
    setTimeout(() => el.classList.add('visible'), delay);
  });
}

/* ── Split h1 text into .hero-word spans ── */
function splitHeroH1() {
  const h1 = document.querySelector('.hero-content h1');
  if (!h1) return;

  const processNode = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      words.forEach(word => {
        if (/^\s+$/.test(word)) {
          frag.appendChild(document.createTextNode(word));
        } else if (word) {
          const span = document.createElement('span');
          span.className = 'hero-word';
          span.textContent = word;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'SPAN') {
      const wrapper = document.createElement('span');
      wrapper.className = 'hero-word';
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);
    }
  };

  [...h1.childNodes].forEach(processNode);
}

/* ── Button magnetic + ripple + 3D tilt ── */
function initButtonEffects() {
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.btn').forEach(btn => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 120;
      if (dist < maxDist) {
        const force = (1 - dist / maxDist) * 10;
        const tiltX = (dy / r.height) * force * -1;
        const tiltY = (dx / r.width) * force;
        const moveX = (dx / maxDist) * force * 0.5;
        const moveY = (dy / maxDist) * force * 0.5;
        btn.style.transform = `translate(${moveX}px,${moveY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.04)`;
        btn.style.transition = 'transform 0.1s ease';
      } else {
        btn.style.transform = '';
        btn.style.transition = 'transform 0.35s ease';
      }
    });
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size/2}px;top:${e.clientY - r.top - size/2}px;`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
}

/* ── Animate dashboard after render ── */
function animateDashboard() {
  const dash = document.querySelector('.hero-dashboard');
  if (dash) setTimeout(() => dash.classList.add('visible'), 100);

  document.querySelectorAll('.dash-tile').forEach((tile, i) => {
    setTimeout(() => tile.classList.add('visible'), 300 + i * 100);
  });

  document.querySelectorAll('.dash-bar').forEach((bar, i) => {
    setTimeout(() => bar.classList.add('visible'), 500 + i * 40);
  });

  const footer = document.querySelector('.dash-footer');
  if (footer) setTimeout(() => footer.classList.add('visible'), 900);
}

/* ── Scroll Reveal via IntersectionObserver ── */
function initScrollReveal() {
  const staggerGroups = [
    { sel: '.hm-card',       baseDelay: 0 },
    { sel: '.bn-card',       baseDelay: 0 },
    { sel: '.tip-card',      baseDelay: 0 },
  ];

  staggerGroups.forEach(({ sel, baseDelay }) => {
    const cards = [...document.querySelectorAll(sel)];
    const parents = new Map();
    cards.forEach(card => {
      const p = card.parentElement;
      if (!parents.has(p)) parents.set(p, []);
      parents.get(p).push(card);
    });
    parents.forEach(siblings => {
      siblings.forEach((card, i) => {
        card.style.transitionDelay = `${baseDelay + i * 0.09}s`;
      });
    });
  });

  const otherSelectors = ['.product-card', '.section-head'];
  otherSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach((el, i) => {
      if (!el.classList.contains('scroll-reveal')) {
        el.classList.add('scroll-reveal');
        if (i > 0) el.classList.add(`delay-${Math.min(i, 6)}`);
      }
    });
  });

  const allRevealEls = document.querySelectorAll(
    '.scroll-reveal, .scroll-reveal-left, .scroll-reveal-scale, ' +
    '.hm-card, .bn-card, .tip-card, .promo-modern, .section-head'
  );

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        e.target.classList.remove('fade-out');
      } else {
        const rect = e.target.getBoundingClientRect();
        if (rect.bottom < 0) {
          e.target.classList.add('fade-out');
        } else {
          e.target.classList.remove('revealed');
          e.target.classList.remove('fade-out');
        }
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  allRevealEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.style.transitionDuration = '0s';
      el.classList.add('revealed');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { el.style.transitionDuration = ''; });
      });
    }
    obs.observe(el);
  });
}

/* ── Category Carousel ── */
let _ccTimer = null;
let _ccReturnTimer = null;

function _buildCarouselItems() {
  const items = HOME_CATEGORIES.map(c => {
    return `<div class="cc-item" style="background:${c.bg}" data-value="${c.value}" onclick="window._ccSelect('${c.value}')">
      <div class="cc-item-ic"><i class="${c.icon}" style="color:${c.tint}"></i></div>
      <div class="cc-item-name">${t(c.key)}</div>
    </div>`;
  }).join('');
  return items;
}

function _ccSelect(value) {
  const cat = HOME_CATEGORIES.find(c => c.value === value);
  if (!cat) return;

  const detail = document.getElementById('ccDetail');
  const allItems = document.querySelectorAll('.cc-item');

  allItems.forEach(el => {
    if (el.dataset.value === value) el.classList.add('dimmed');
    else el.classList.remove('dimmed');
  });

  detail.classList.remove('empty');
  detail.innerHTML = `
    <div class="cd-head">
      <div class="cd-icon" style="background:${cat.bg}"><i class="${cat.icon}" style="color:#fff"></i></div>
      <div class="cd-titles">
        <div class="cd-name">${t(cat.key)}</div>
        <div class="cd-count">${cat.value}</div>
      </div>
    </div>
    <div class="cd-body">
      <div class="cd-desc">${cat.desc}</div>
      <div class="cd-features">
        ${cat.features.map(f => `<div class="cd-feat"><i class="fi fi-sr-check-circle"></i>${f}</div>`).join('')}
      </div>
      <div class="cd-action">
        <button class="btn btn-primary btn-full" onclick="router.go('/market?cat=${encodeURIComponent(cat.value)}')">
          <i class="fi fi-rr-shopping-cart"></i> Смотреть товары
        </button>
      </div>
    </div>
    <div class="cd-timer-wrap">
      <div class="cd-timer"><div class="cd-timer-fill" id="ccTimerFill"></div></div>
    </div>
  `;

  // Animate timer bar from 100% to 0% over 15 seconds
  const fill = document.getElementById('ccTimerFill');
  if (fill) {
    requestAnimationFrame(() => {
      fill.style.width = '100%';
      requestAnimationFrame(() => { fill.style.transition = 'width 15s linear'; fill.style.width = '0%'; });
    });
  }

  // Clear previous timers
  clearTimeout(_ccReturnTimer);

  // After 15 seconds: stop carousel, return item, resume
  _ccReturnTimer = setTimeout(() => {
    const track = document.getElementById('ccTrack');
    if (track) track.style.animationPlayState = 'paused';

    allItems.forEach(el => el.classList.remove('dimmed'));

    setTimeout(() => {
      // Reset detail
      if (detail) {
        detail.classList.add('empty');
        detail.innerHTML = `
          <div class="cc-ph">
            <div class="cc-ph-icon">👆</div>
            <div class="cc-ph-text">Нажмите на категорию,<br>чтобы узнать подробнее</div>
          </div>`;
      }
      // Resume carousel
      if (track) track.style.animationPlayState = 'running';
    }, 600);
  }, 15000);
}

window._ccSelect = _ccSelect;

async function renderHome() {
  injectStyles();

  const app      = document.getElementById('app');
  const user     = Auth.getUser();
  const isFarmer = Auth.isFarmer();

  app.innerHTML = pageShell(`
    <div class="home-page-container">
      <!-- ═══ HERO BANNER (Modern Agriculture) ═══ -->
      <section class="hero-agri-banner">
        <div class="hab-content">
          <h1 class="hab-title">Всё для вашего хозяйства —<br>в одном месте</h1>
          <p class="hab-sub">Покупайте и продавайте сельхозпродукцию, управляйте заказами, общайтесь с фермерами напрямую.</p>
          
          <div class="hab-search-form">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" id="homeSearchInput" placeholder="Что вы ищете? (например: помидоры, картофель)" onkeydown="if(event.key==='Enter'){ router.go('/market?q='+encodeURIComponent(this.value)); }" />
            <button class="btn btn-primary" onclick="router.go('/market?q=' + encodeURIComponent(document.getElementById('homeSearchInput').value))">Найти</button>
          </div>

          <div class="hab-actions">
            <button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fa-solid fa-store"></i> Перейти на рынок</button>
            <button class="btn btn-outline btn-lg" onclick="router.go('/orders')"><i class="fa-solid fa-box-open"></i> Мои заказы</button>
          </div>
        </div>
        <div class="hab-art">
          <img src="assets/hero-farm-tractor.jpg" onerror="this.src='https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80'" alt="Агромаркетплейс" />
        </div>
      </section>

      <!-- ═══ CATEGORY PILLS BAR ═══ -->
      <section class="home-categories-pills">
        <div class="pill-item" onclick="router.go('/market?cat=Овощи')"><span class="pill-icon"><i class="fa-solid fa-carrot"></i></span><span>Овощи</span></div>
        <div class="pill-item" onclick="router.go('/market?cat=Фрукты')"><span class="pill-icon"><i class="fa-solid fa-apple-whole"></i></span><span>Фрукты</span></div>
        <div class="pill-item" onclick="router.go('/market?cat=Зерновые')"><span class="pill-icon"><i class="fa-solid fa-wheat-awn"></i></span><span>Зерновые</span></div>
        <div class="pill-item" onclick="router.go('/market?cat=Молочные')"><span class="pill-icon"><i class="fa-solid fa-bottle-droplet"></i></span><span>Молочные</span></div>
        <div class="pill-item" onclick="router.go('/market?cat=Мясо')"><span class="pill-icon"><i class="fa-solid fa-drumstick-bite"></i></span><span>Мясо</span></div>
        <div class="pill-item" onclick="router.go('/market?cat=Семена')"><span class="pill-icon"><i class="fa-solid fa-seedling"></i></span><span>Семена</span></div>
        <div class="pill-item" onclick="router.go('/market?cat=Удобрения')"><span class="pill-icon"><i class="fa-solid fa-flask"></i></span><span>Удобрения</span></div>
      </section>

      <!-- ═══ POPULAR PRODUCTS / TODAY ON MARKET ═══ -->
      <section class="section">
        <div class="section-head">
          <h2>Сегодня на рынке</h2>
          <a class="link-more" onclick="router.go('/market')">Смотреть все <i class="fa-solid fa-arrow-right"></i></a>
        </div>
        <div id="home-products" class="products-grid v2"><div class="spinner"></div></div>
      </section>


        </div>

        <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:24px;text-align:center;color:#6b7280;font-size:13px">
          © 2025 AgroVerse. Все права защищены.
        </div>
      </div>
    </footer>
  `);

  // Убираем лишний padding-bottom у app-main чтобы футер был в конце
  const mainEl = document.querySelector('.app-main');
  if (mainEl) mainEl.style.paddingBottom = '0';


  // Split h1 words and trigger hero animations
  splitHeroH1();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => animateHeroText());
  });

  initButtonEffects();
  setTimeout(initScrollReveal, 80);

  // Dashboard animations
  requestAnimationFrame(() => animateDashboard());

  // Animate dashboard tile counters
  setTimeout(() => {
    const v2 = document.getElementById('dash-val-2');
    const v3 = document.getElementById('dash-val-3');
    const v4 = document.getElementById('dash-val-4');
    const fc = document.getElementById('dash-forecast');
    if (v2) { let n = 0; const iv = setInterval(() => { n++; v2.textContent = `+${n} ta order`; if(n>=128) clearInterval(iv); }, 8); }
    if (v3) { let n = 0; const iv = setInterval(() => { n++; v3.textContent = `${n} marshrut`; if(n>=3) clearInterval(iv); }, 200); }
    if (v4) { let n = 0; const iv = setInterval(() => { n++; v4.textContent = `GMV +${n}%`; if(n>=24) clearInterval(iv); }, 40); }
    if (fc) { let n = 0; const iv = setInterval(() => { n++; fc.textContent = `+${n}% hosil prognozi`; if(n>=18) clearInterval(iv); }, 55); }
  }, 600);

  // Load real products
  try {
    const products = await API.getProducts({ limit: 6 });

    animateCounter(document.getElementById('stat-products'), products.length, 1200);
    animateCounter(document.getElementById('stat-100'), 100, 1400, '%');
    const s0 = document.getElementById('stat-0');
    if (s0) s0.textContent = '0%';

    if (isFarmer) {
      const dv1 = document.getElementById('dash-val-1');
      if (dv1) { let n = 0; const iv = setInterval(() => { n++; dv1.textContent = `${n} ta`; if(n >= products.length) clearInterval(iv); }, Math.max(10, 800/products.length)); }
    }

    const grid = document.getElementById('home-products');
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <i class="fi fi-rr-leaf" style="font-size:48px;color:var(--clr-primary)"></i>
        <p>${t('no_products_yet')} ${isFarmer ? t('add_first') : t('come_later')}</p>
      </div>`;
      return;
    }
    grid.innerHTML = products.slice(0, 6).map(productCardHtml).join('');
    setTimeout(initScrollReveal, 50);
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    const grid = document.getElementById('home-products');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>${fe('⚠️',16)} ${e.message}</p></div>`;
  }

  setTimeout(() => { if (typeof initAIBubble === 'function') initAIBubble(); }, 200);
}

window.renderHome = renderHome;
