/* pages/home.js — hero + scroll animations + button effects + Courier Remainder */

const HOME_CATEGORIES = [
  { value: 'Овощи',    icon: 'fi fi-sr-carrot',        key: 'cat_vegetables', tint: '#10B981', img: 'assets/cat-vegetables.jpg', bg: 'linear-gradient(135deg,#10B981,#059669)' },
  { value: 'Фрукты',   icon: 'fi fi-sr-apple-alt',     key: 'cat_fruits',     tint: '#F59E0B', img: 'assets/cat-fruits.jpg',     bg: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { value: 'Зелень',   icon: 'fi fi-sr-leaf',          key: 'cat_greens',     tint: '#22C55E', img: 'assets/cat-greens.jpg',     bg: 'linear-gradient(135deg,#22C55E,#16A34A)' },
  { value: 'Зерновые', icon: 'fi fi-sr-wheat',         key: 'cat_grains',     tint: '#D97706', img: 'assets/cat-grains.jpg',     bg: 'linear-gradient(135deg,#D97706,#B45309)' },
  { value: 'Молочные', icon: 'fi fi-sr-milk',          key: 'cat_dairy',      tint: '#3B82F6', img: 'assets/cat-dairy.jpg',      bg: 'linear-gradient(135deg,#3B82F6,#2563EB)' },
  { value: 'Мёд',      icon: 'fi fi-sr-honey',         key: 'cat_honey',      tint: '#EAB308', img: 'assets/cat-honey.jpg',      bg: 'linear-gradient(135deg,#EAB308,#CA8A04)' },
  { value: 'Gullar',      icon: 'fi fi-sr-sakura',        key: 'cat_flowers',    tint: '#EC4899', img: 'assets/cat-flowers.jpg',    bg: 'linear-gradient(135deg,#EC4899,#DB2777)' },
  { value: "Ko'chatlar",  icon: 'fi fi-sr-seedling',      key: 'cat_seedlings',  tint: '#059669', img: 'assets/cat-seedlings.jpg',  bg: 'linear-gradient(135deg,#059669,#047857)' },
  { value: 'Poliz ekin',  icon: 'fi fi-sr-fruit-watermelon', key: 'cat_melon',   tint: '#10B981', img: 'assets/cat-melon.jpg',      bg: 'linear-gradient(135deg,#10B981,#34D399)' },
  { value: "Urug'lar",    icon: 'fi fi-sr-seedling',      key: 'cat_seeds',      tint: '#8B5CF6', img: 'assets/cat-seeds.jpg',      bg: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' },
  { value: 'Yer va mulk', icon: 'fi fi-sr-map',           key: 'cat_land',       tint: '#92400E', img: 'assets/cat-land.jpg',       bg: 'linear-gradient(135deg,#92400E,#78350F)' },
];

const HOW_IT_WORKS = [
  { icon: 'fi fi-sr-user-add',      key: 'how_reg' },
  { icon: 'fi fi-sr-store-alt',     key: 'how_find' },
  { icon: 'fi fi-sr-shopping-cart', key: 'how_order' },
  { icon: 'fi fi-sr-leaf',          key: 'how_deliver' },
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
    .how-card, .tip-card, .benefit-card, .promo {
      opacity: 0;
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .how-card.revealed, .tip-card.revealed, .benefit-card.revealed, .promo.revealed {
      opacity: 1; transform: translateY(0) translateX(0);
    }
    .how-card.fade-out, .tip-card.fade-out, .benefit-card.fade-out, .promo.fade-out {
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
    { sel: '.how-card',      baseDelay: 0 },
    { sel: '.tip-card',      baseDelay: 0 },
    { sel: '.benefit-card',  baseDelay: 0 },
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

  const otherSelectors = ['.cat-card', '.product-card', '.section-head'];
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
    '.how-card, .tip-card, .benefit-card, .promo, .section-head'
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

async function renderHome() {
  injectStyles();

  const app      = document.getElementById('app');
  const user     = Auth.getUser();
  const isFarmer = Auth.isFarmer();
  const isCourier = user?.role === 'courier';
  const showCourierAlert = localStorage.getItem('courier_needs_setup_alert') === 'true';

  const firstName = (user?.name || '').split(' ')[0] || (isFarmer ? t('farmer_word') : t('friend_word'));

  const heroCta = isFarmer
    ? `<button class="btn btn-primary btn-lg" onclick="router.go('/product/new')"><i class="fi fi-rr-plus"></i> ${t('add_product_btn')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-store-alt"></i> ${t('view_market')}</button>`
    : `<button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-shopping-cart"></i> ${t('go_market')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/ai')"><i class="fi fi-rr-comment-alt"></i> ${t('ask_ai')}</button>`;

  const feedbackBtn = `<button class="btn btn-ghost btn-lg" onclick="window.open('https://t.me/The1_Smurfs_Bot','_blank')"><i class="fi fi-rr-paper-plane"></i> Оставить отзыв или идею</button>`;

  app.innerHTML = pageShell(`
    <section class="hero-light">
      <div class="hero-light-inner">
        <div class="hero-content">
          <div class="hero-badge hero-badge-anim" style="background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:#059669;">
            <i class="fi fi-sr-leaf"></i> ${t('fresh_with_field')}
          </div>
          <h1 style="font-family:var(--font-display);font-size:clamp(36px,5vw,62px);font-weight:800;line-height:1.05;letter-spacing:-1.5px;color:#0f1f12;margin:16px 0 18px;">
            ${t('hi')}, <span style="color:#10b981;">${firstName}</span>!<br>
            <span style="background:linear-gradient(135deg,#10b981,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
              ${isFarmer ? t('sell_farm') : t('buy_farm')}
            </span><br>
            <span style="color:#0f1f12;">${t('no_middlemen')}</span>
          </h1>
          <p class="hero-sub-anim" style="color:#4b7a5a;font-size:17px;margin-bottom:28px;max-width:500px;line-height:1.6;">
            ${isFarmer ? t('hero_farmer_sub') : t('hero_buyer_sub')}
          </p>
          <div class="hero-actions hero-actions-anim" style="display:flex;flex-wrap:wrap;gap:12px">
            ${heroCta}
            ${feedbackBtn}
          </div>

          <div style="display:flex;gap:40px;margin-top:44px;flex-wrap:wrap;">
            <div class="hero-stat-item">
              <b id="stat-products">0</b>
              <span>${t('products_on_market')}</span>
            </div>
            <div class="hero-stat-item" style="transition-delay:0.15s;">
              <b id="stat-100">0%</b>
              <span>${t('all_farm')}</span>
            </div>
            <div class="hero-stat-item" style="transition-delay:0.3s;">
              <b id="stat-0">0%</b>
              <span>${t('middlemen0')}</span>
            </div>
          </div>
        </div>

        <div class="hero-dashboard">
          <div class="dash-card">
            <div class="dash-top">
              <div style="display:flex;align-items:center;gap:6px;">
                <div class="dash-dot" style="background:#ff5f57;"></div>
                <div class="dash-dot" style="background:#febc2e;"></div>
                <div class="dash-dot" style="background:#28c840;"></div>
                <span class="dash-url" style="margin-left:6px;">agroverse.uz/dashboard</span>
              </div>
              <div class="dash-live">Live</div>
            </div>

            <div style="font-size:13px;color:#9ca3af;margin-bottom:5px;">${t('today_analytics') || 'Bugungi tahlil'}</div>
            <div style="font-size:22px;font-weight:800;color:#0f1f12;margin-bottom:18px;">AI Insights</div>

            <div class="dash-grid">
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-leaf" style="color:#10b981;font-size:11px;"></i> ${isFarmer ? 'MAHSULOT' : 'AI AGRONOM'}</div>
                <div class="dash-tile-val" id="dash-val-1">${isFarmer ? '0 ta' : "Sug'orish: optimal"}</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-store-alt" style="color:#10b981;font-size:11px;"></i> MARKETPLACE</div>
                <div class="dash-tile-val" id="dash-val-2">+0 ta order</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-truck-side" style="color:#10b981;font-size:11px;"></i> LOGISTICS</div>
                <div class="dash-tile-val" id="dash-val-3">0 marshrut</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-chart-histogram" style="color:#10b981;font-size:11px;"></i> ANALYTICS</div>
                <div class="dash-tile-val" id="dash-val-4">GMV +0%</div>
              </div>
            </div>

            <div class="dash-chart">
              ${DASH_BARS.map((h, i) => '<div class="dash-bar ' + (h >= 90 ? 'hi' : '') + '" style="height:' + h + '%;transition-delay:' + (0.5 + i * 0.04) + 's;"></div>').join('')}
            </div>

            <div class="dash-footer">
              <div class="dash-footer-ic"><i class="fi fi-sr-sparkles"></i></div>
              <div class="dash-footer-text">
                <b>AI tavsiya</b>
                <span id="dash-forecast">+0% hosil prognozi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dynamic alert container (for courier reminder) -->
    <div class="container" id="home-dynamic-alerts"></div>

    <section class="section">
      <div class="section-head">
        <h2>${t('categories')}</h2>
        <a class="link-more" onclick="router.go('/market')">${t('all_market')} <i class="fi fi-rr-arrow-right"></i></a>
      </div>
      <div class="cat-grid">
        ${HOME_CATEGORIES.map(c => `
          <div class="cat-card" onclick="router.go('/market?cat=${encodeURIComponent(c.value)}')" style="--tint:${c.tint}">
            <div class="cat-card-img" style="background:${c.bg}">
              <img src="${c.img}" alt="${t(c.key)}" loading="lazy" onerror="this.style.opacity='0'" />
              <div class="cat-overlay"></div>
            </div>
            <div class="cat-ic"><i class="${c.icon}" style="font-size:20px"></i></div>
            <div class="cat-name">${t(c.key)}</div>
          </div>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>${isFarmer ? t('fresh_on_market') : t('popular_now')}</h2>
        <a class="link-more" onclick="router.go('/market')">${t('all_products')} <i class="fi fi-rr-arrow-right"></i></a>
      </div>
      <div id="home-products" class="products-grid v2"><div class="spinner"></div></div>
    </section>

    <section class="section how-section">
      <div class="section-head"><h2>${t('how_it_works')}</h2></div>
      <div class="how-grid">
        ${HOW_IT_WORKS.map((h, i) => `
          <div class="how-card">
            <div class="how-num">${i + 1}</div>
            <div class="how-ic"><i class="${h.icon}"></i></div>
            <div class="how-label">${t(h.key)}</div>
          </div>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="promo v2">
        <div class="promo-left">
          <div class="promo-ic"><i class="fi fi-sr-sparkles"></i></div>
          <div>
            <h3>${t('ai_promo_title')}</h3>
            <p>${isFarmer ? t('ai_promo_farmer') : t('ai_promo_buyer')}</p>
          </div>
        </div>
        <button class="btn btn-primary" onclick="router.go('/ai')"><i class="fi fi-rr-comment-alt"></i> ${t('open_chat')}</button>
      </div>
    </section>

    ${!isFarmer ? `
    <section class="section">
      <div class="section-head"><h2>${t('why_agroverse')}</h2></div>
      <div class="benefits-grid">
        <div class="benefit-card"><i class="fi fi-sr-leaf"></i><h4>${t('benefit_fresh')}</h4><p>${t('benefit_fresh_desc')}</p></div>
        <div class="benefit-card"><i class="fi fi-sr-shield-check"></i><h4>${t('benefit_safe')}</h4><p>${t('benefit_safe_desc')}</p></div>
        <div class="benefit-card"><i class="fi fi-sr-bolt"></i><h4>${t('benefit_fast')}</h4><p>${t('benefit_fast_desc')}</p></div>
        <div class="benefit-card"><i class="fi fi-sr-piggy-bank"></i><h4>${t('benefit_cheap')}</h4><p>${t('benefit_cheap_desc')}</p></div>
      </div>
    </section>` : `
    <section class="section">
      <div class="section-head"><h2>${t('farmer_tips_title')}</h2></div>
      <div class="tips-grid">
        <div class="tip-card"><i class="fi fi-sr-chart-line-up"></i><h4>${t('tip_price')}</h4><p>${t('tip_price_desc')}</p></div>
        <div class="tip-card"><i class="fi fi-sr-camera"></i><h4>${t('tip_photo')}</h4><p>${t('tip_photo_desc')}</p></div>
        <div class="tip-card"><i class="fi fi-sr-star"></i><h4>${t('tip_rating')}</h4><p>${t('tip_rating_desc')}</p></div>
      </div>
    </section>`}

    <!-- Footer -->
    <footer style="background:#0f1f12;color:#fff;padding:60px clamp(20px,4vw,80px) 30px;margin-top:60px">
      <div style="max-width:1200px;margin:0 auto">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:40px;margin-bottom:40px">

          <!-- Brand -->
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
              <div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;font-size:20px"><i class="fi fi-sr-leaf" style="color:#fff"></i></div>
              <b style="font-size:20px">AgroVerse</b>
            </div>
            <p style="color:#9ca3af;font-size:14px;line-height:1.6">Фермерский маркетплейс без посредников. Свежие продукты прямо с полей Узбекистана.</p>
          </div>

          <!-- Navigation -->
          <div>
            <h4 style="margin-bottom:16px;font-size:15px">Навигация</h4>
            <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px">
              <li><a href="#/market" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-shop" style="margin-right:6px"></i>Рынок</a></li>
              <li><a href="#/ai" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-robot" style="margin-right:6px"></i>ИИ-помощник</a></li>
              <li><a href="#/orders" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-box-open" style="margin-right:6px"></i>Мои заказы</a></li>
              <li><a href="#/profile" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-user" style="margin-right:6px"></i>Профиль</a></li>
              <li><a href="https://t.me/The1_Smurfs_Bot" target="_blank" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-paper-plane" style="margin-right:6px"></i>Обратная связь</a></li>
            </ul>
          </div>

          <!-- For farmers -->
          <div>
            <h4 style="margin-bottom:16px;font-size:15px">Для фермеров</h4>
            <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:10px">
              <li><a href="#/product/new" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-add" style="margin-right:6px"></i>Добавить товар</a></li>
              <li><a href="#/profile" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-leaf" style="margin-right:6px"></i>Мои товары</a></li>
              <li><a href="#/wallet" style="color:#9ca3af;text-decoration:none;font-size:14px;transition:color .2s" onmouseover="this.style.color='#10b981'" onmouseout="this.style.color='#9ca3af'"><i class="fi fi-sr-wallet" style="margin-right:6px"></i>Кошелёк</a></li>
            </ul>
          </div>

          <!-- Social -->
          <div>
            <h4 style="margin-bottom:16px;font-size:15px">Мы в соцсетях</h4>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <a href="https://www.tiktok.com/@agroverse_uz" target="_blank" style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;text-decoration:none;transition:all .2s" onmouseover="this.style.background='#10b981';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.transform='none'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9a6.33 6.33 0 00-.79-.05A6.34 6.34 0 003.15 15.3a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.83a8.18 8.18 0 004.76 1.52V6.9a4.84 4.84 0 01-1-.21z"/></svg>
              </a>
              <a href="https://www.youtube.com/@agroverse_uz" target="_blank" style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;text-decoration:none;transition:all .2s" onmouseover="this.style.background='#FF0000';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.transform='none'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.7 31.7 0 000 12a31.7 31.7 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.7 31.7 0 0024 12a31.7 31.7 0 00-.5-5.81zM9.54 15.57V8.43L15.82 12l-6.28 3.57z"/></svg>
              </a>
              <a href="https://www.instagram.com/agroverse_uz?igsh=YXc1MmF3Y3c5c3M2" target="_blank" style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;text-decoration:none;transition:all .2s" onmouseover="this.style.background='linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.transform='none'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.74 3.74 0 01-1.38-.9 3.74 3.74 0 01-.9-1.38c-.16-.43-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.87 5.87 0 00-2.13 1.38A5.87 5.87 0 00.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91a5.87 5.87 0 001.38 2.13 5.87 5.87 0 002.13 1.38c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.87 5.87 0 002.13-1.38 5.87 5.87 0 001.38-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.87 5.87 0 00-1.38-2.13A5.87 5.87 0 0019.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.85a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/></svg>
              </a>
              <a href="https://www.facebook.com/share/1D3op7QHQD/" target="_blank" style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;text-decoration:none;transition:all .2s" onmouseover="this.style.background='#1877F2';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.08)';this.style.transform='none'">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07c0 6.02 4.39 11.01 10.13 11.93v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8v8.44C19.61 23.08 24 18.09 24 12.07z"/></svg>
              </a>
            </div>
          </div>
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

  // Insert courier reminder banner if needed
  if (isCourier && showCourierAlert) {
    const alertContainer = document.getElementById('home-dynamic-alerts');
    alertContainer.innerHTML = `
      <div class="remind-banner scroll-reveal revealed">
        <div style="font-size: 2rem;"><i class="fi fi-sr-truck-side" style="font-size:32px;color:#92400e"></i></div>
        <div class="rb-content">
          <span class="rb-title">Вы зарегистрированы как Йўлчи!</span>
          <span class="rb-text">Чтобы начать принимать заказы и зарабатывать, вам необходимо заполнить профиль перевозчика и дождаться одобрения админа.</span>
        </div>
        <div class="rb-actions">
           <button class="btn btn-primary" onclick="router.go('/profile')">Заполнить сейчас</button>
           <button class="btn btn-ghost" onclick="window.open('https://t.me/The1_Smurfs_Bot','_blank')"><i class="fi fi-rr-paper-plane"></i> Связаться</button>
           <button class="btn btn-ghost" onclick="this.closest('.remind-banner').remove(); localStorage.removeItem('courier_needs_setup_alert');"><i class="fi fi-sr-times"></i></button>
        </div>
      </div>
    `;
  }

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
    const products = await API.getProducts({ limit: 8 });

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
    grid.innerHTML = products.slice(0, 8).map(productCardHtml).join('');
    setTimeout(initScrollReveal, 50);
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    const grid = document.getElementById('home-products');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>${fe('⚠️',16)} ${e.message}</p></div>`;
  }

  setTimeout(() => { if (typeof initAIBubble === 'function') initAIBubble(); }, 200);
}

window.renderHome = renderHome;
