/* pages/home.js — hero + scroll animations + button effects */

const HOME_CATEGORIES = [
  { value: 'Овощи',    icon: '🥦', key: 'cat_vegetables', tint: '#10B981', img: 'assets/cat-vegetables.jpg', bg: 'linear-gradient(135deg,#10B981,#059669)' },
  { value: 'Фрукты',   icon: '🍎', key: 'cat_fruits',     tint: '#F59E0B', img: 'assets/cat-fruits.jpg',     bg: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { value: 'Зелень',   icon: '🌿', key: 'cat_greens',     tint: '#22C55E', img: 'assets/cat-greens.jpg',     bg: 'linear-gradient(135deg,#22C55E,#16A34A)' },
  { value: 'Зерновые', icon: '🌾', key: 'cat_grains',     tint: '#D97706', img: 'assets/cat-grains.jpg',     bg: 'linear-gradient(135deg,#D97706,#B45309)' },
  { value: 'Молочные', icon: '🥛', key: 'cat_dairy',      tint: '#3B82F6', img: 'assets/cat-dairy.jpg',      bg: 'linear-gradient(135deg,#3B82F6,#2563EB)' },
  { value: 'Мёд',      icon: '🍯', key: 'cat_honey',      tint: '#EAB308', img: 'assets/cat-honey.jpg',      bg: 'linear-gradient(135deg,#EAB308,#CA8A04)' },
];

const HOW_IT_WORKS = [
  { icon: 'fi fi-sr-user-add',      key: 'how_reg' },
  { icon: 'fi fi-sr-store-alt',     key: 'how_find' },
  { icon: 'fi fi-sr-shopping-cart', key: 'how_order' },
  { icon: 'fi fi-sr-leaf',          key: 'how_deliver' },
];

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
    /* ── Hero fullscreen ── */
    .hero-light {
      position: relative;
      min-height: 100vh;
      width: 100vw;
      margin-left: calc(-50vw + 50%);
      margin-top: -110px;
      margin-bottom: 72px;
      display: flex;
      align-items: center;
      overflow: hidden;
      background: #ffffff;
    }
    .hero-light-bg {
      position: absolute; inset: 0; z-index: 0;
      background:
        radial-gradient(ellipse 70% 120% at -5% 50%, rgba(16,185,129,0.22) 0%, rgba(74,222,128,0.10) 35%, transparent 65%),
        radial-gradient(ellipse 50% 80% at 105% 85%, rgba(16,185,129,0.08) 0%, transparent 55%),
        radial-gradient(ellipse 40% 40% at 50% -10%, rgba(74,222,128,0.06) 0%, transparent 60%),
        linear-gradient(160deg, #eafaf2 0%, #ffffff 45%, #f4fdf8 100%);
    }
    .hero-light-dots {
      position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background-image: radial-gradient(circle, rgba(16,185,129,0.10) 1px, transparent 1px);
      background-size: 44px 44px;
    }
    .hero-light-inner {
      position: relative; z-index: 2;
      max-width: 1400px; margin: 0 auto;
      padding: clamp(110px,10vw,150px) clamp(28px,4vw,80px) clamp(60px,6vw,80px);
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 60px;
      align-items: center;
    }
    @media (max-width: 900px) {
      .hero-light-inner { grid-template-columns: 1fr; }
      .hero-dashboard { display: none; }
    }

    /* Orbs */
    .hero-orb {
      position: absolute; border-radius: 50%;
      filter: blur(70px); pointer-events: none;
      animation: orbFloat 9s ease-in-out infinite;
    }
    @keyframes orbFloat {
      0%,100% { transform: translateY(0) scale(1); }
      50%      { transform: translateY(-28px) scale(1.07); }
    }

    /* ── Hero text word-by-word animation ── */
    .hero-word {
      display: inline-block;
      opacity: 0;
      transform: translateY(28px) skewY(4deg);
      transition: opacity 0.55s cubic-bezier(0.22,1,0.36,1),
                  transform 0.55s cubic-bezier(0.22,1,0.36,1);
      will-change: opacity, transform;
    }
    .hero-word.in {
      opacity: 1;
      transform: translateY(0) skewY(0deg);
    }
    .hero-badge-anim {
      opacity: 0;
      transform: translateY(-12px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .hero-badge-anim.in { opacity: 1; transform: translateY(0); }
    .hero-sub-anim {
      opacity: 0;
      transform: translateY(14px);
      transition: opacity 0.55s ease 0.1s, transform 0.55s ease 0.1s;
    }
    .hero-sub-anim.in { opacity: 1; transform: translateY(0); }
    .hero-actions-anim {
      opacity: 0;
      transform: translateY(18px);
      transition: opacity 0.55s ease, transform 0.55s ease;
    }
    .hero-actions-anim.in { opacity: 1; transform: translateY(0); }

    /* Stats entrance animation */
    .hero-stat-item {
      display: flex; flex-direction: column;
      opacity: 0; transform: translateY(16px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .hero-stat-item.visible { opacity: 1; transform: translateY(0); }
    .hero-stat-item b {
      font-family: var(--font-display);
      font-size: 32px; font-weight: 800; color: #059669;
      line-height: 1;
    }
    .hero-stat-item span { color: #6b9e7a; font-size: 13px; margin-top: 4px; }

    /* Dashboard */
    .hero-dashboard {
      animation: dashFloat 5s ease-in-out infinite;
      opacity: 0; transform: translateY(30px) scale(0.97);
      transition: opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s;
    }
    .hero-dashboard.visible { opacity: 1; transform: translateY(0) scale(1); }
    @keyframes dashFloat {
      0%,100% { transform: translateY(0) rotate(-0.8deg); }
      50%      { transform: translateY(-10px) rotate(0.4deg); }
    }
    .dash-card {
      background: #ffffff;
      border: 1px solid rgba(16,185,129,0.2);
      border-radius: 20px; padding: 22px;
      box-shadow: 0 24px 64px rgba(16,185,129,0.13), 0 4px 20px rgba(0,0,0,0.06);
    }
    .dash-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 18px;
    }
    .dash-url {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: #9ca3af; font-family: monospace;
    }
    .dash-dot { width: 9px; height: 9px; border-radius: 50%; }
    .dash-live {
      background: rgba(16,185,129,0.1); color: #059669;
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 20px; padding: 3px 10px;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; gap: 5px;
    }
    .dash-live::before {
      content: ''; width: 6px; height: 6px; border-radius: 50%;
      background: #10b981; animation: pulse 1.5s ease-in-out infinite;
    }
    .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
    .dash-tile {
      background: #f0fdf4; border: 1px solid rgba(16,185,129,0.15);
      border-radius: 12px; padding: 12px;
      opacity: 0; transform: translateY(10px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .dash-tile.visible { opacity: 1; transform: translateY(0); }
    .dash-tile-label {
      font-size: 9px; font-weight: 700; color: #9ca3af;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;
      display: flex; align-items: center; gap: 4px;
    }
    .dash-tile-val { font-size: 13px; font-weight: 700; color: #0f1f12; }
    .dash-chart { display: flex; align-items: flex-end; gap: 3px; height: 65px; margin-bottom: 14px; }
    .dash-bar {
      flex: 1; border-radius: 3px 3px 0 0;
      background: linear-gradient(to top, #10b981, #4ade80);
      opacity: 0; transform: scaleY(0); transform-origin: bottom;
      transition: opacity 0.3s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1);
    }
    .dash-bar.visible { opacity: 0.75; transform: scaleY(1); }
    .dash-bar.hi.visible { opacity: 1; box-shadow: 0 0 10px rgba(16,185,129,0.5); }
    .dash-footer {
      display: flex; align-items: center; gap: 10px;
      background: #f0fdf4; border-radius: 10px; padding: 10px 14px;
      opacity: 0; transform: translateY(6px);
      transition: opacity 0.4s ease 0.5s, transform 0.4s ease 0.5s;
    }
    .dash-footer.visible { opacity: 1; transform: translateY(0); }
    .dash-footer-ic {
      width: 28px; height: 28px; border-radius: 8px;
      background: linear-gradient(135deg,#10b981,#059669);
      display: grid; place-items: center; color: #fff; font-size: 13px;
    }
    .dash-footer-text { font-size: 12px; }
    .dash-footer-text b { color: #059669; display: block; }
    .dash-footer-text span { color: #6b7280; }

    /* ── Button effects ── */
    .btn {
      position: relative; overflow: hidden;
      transform-style: preserve-3d;
      transition: transform 0.35s ease, box-shadow 0.3s ease, filter 0.3s ease;
    }
    .btn::before {
      content: ''; position: absolute; inset: -2px;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(74,222,128,0.6), rgba(16,185,129,0.3), rgba(74,222,128,0.6));
      opacity: 0; transition: opacity 0.3s ease; z-index: 0; filter: blur(4px);
    }
    .btn:hover::before { opacity: 1; }
    .btn::after {
      content: ''; position: absolute;
      top: 0; left: -100%; width: 60%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
      transform: skewX(-20deg); z-index: 2;
    }
    .btn:hover::after { animation: shimmerSweep 0.55s ease forwards; }
    @keyframes shimmerSweep {
      0%   { left: -100%; }
      100% { left: 160%; }
    }
    .btn-ripple {
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,0.4);
      transform: scale(0);
      animation: rippleAnim 0.7s ease-out forwards;
      pointer-events: none; z-index: 3;
    }
    @keyframes rippleAnim {
      0%   { transform: scale(0); opacity: 1; }
      70%  { transform: scale(4); opacity: 0.3; }
      100% { transform: scale(5); opacity: 0; }
    }
    .btn-primary:hover {
      box-shadow: 0 0 0 3px rgba(74,222,128,0.25), 0 8px 30px rgba(16,185,129,0.5), 0 0 60px rgba(74,222,128,0.2) !important;
      filter: brightness(1.08);
    }
    .btn-ghost:hover, .btn-outline:hover {
      box-shadow: 0 0 0 2px rgba(74,222,128,0.3), 0 6px 20px rgba(16,185,129,0.2) !important;
    }

    /* ── Scroll reveal base ── */
    .scroll-reveal,
    .scroll-reveal-left,
    .scroll-reveal-scale {
      opacity: 0;
      transform: translateY(36px);
      transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1),
                  transform 0.6s cubic-bezier(0.22,1,0.36,1);
      will-change: opacity, transform;
    }
    .scroll-reveal-left  { transform: translateX(-36px); }
    .scroll-reveal-scale { transform: scale(0.9) translateY(20px); }
    .scroll-reveal.revealed,
    .scroll-reveal-left.revealed,
    .scroll-reveal-scale.revealed {
      opacity: 1;
      transform: translateY(0) translateX(0) scale(1);
    }
    .delay-1 { transition-delay: 0.08s !important; }
    .delay-2 { transition-delay: 0.16s !important; }
    .delay-3 { transition-delay: 0.24s !important; }
    .delay-4 { transition-delay: 0.32s !important; }
    .delay-5 { transition-delay: 0.40s !important; }
    .delay-6 { transition-delay: 0.48s !important; }

    /* ── How-card scroll reveal — каждая карточка с разной стороны ── */
    .how-card {
      cursor: default;
      opacity: 0;
      transition: transform 0.65s cubic-bezier(0.22,1,0.36,1),
                  opacity 0.65s ease,
                  box-shadow 0.35s ease;
      will-change: opacity, transform;
    }
    /* Направления: 1-слева, 2-снизу, 3-снизу, 4-справа */
    .how-card:nth-child(1) { transform: translateX(-60px) scale(0.93); }
    .how-card:nth-child(2) { transform: translateY(60px) scale(0.93); }
    .how-card:nth-child(3) { transform: translateY(60px) scale(0.93); }
    .how-card:nth-child(4) { transform: translateX(60px) scale(0.93); }
    .how-card.revealed {
      opacity: 1;
      transform: translateY(0) translateX(0) scale(1);
    }
    /* Затухание при уходе вверх */
    .how-card.fade-out {
      opacity: 0;
      transition: opacity 0.4s ease;
    }
    .how-card:hover {
      transform: translateY(-6px) scale(1.03) !important;
      box-shadow: 0 16px 40px rgba(16,185,129,0.18);
    }

    /* ── tip/benefit card — каждая с разной стороны ── */
    .tip-card, .benefit-card {
      opacity: 0;
      transition: transform 0.6s cubic-bezier(0.22,1,0.36,1),
                  opacity 0.6s ease,
                  box-shadow 0.35s ease;
      will-change: opacity, transform;
    }
    /* tip: 1-слева, 2-снизу, 3-справа */
    .tip-card:nth-child(1) { transform: translateX(-50px); }
    .tip-card:nth-child(2) { transform: translateY(50px); }
    .tip-card:nth-child(3) { transform: translateX(50px); }
    /* benefit: 1-слева, 2-снизу, 3-снизу, 4-справа */
    .benefit-card:nth-child(1) { transform: translateX(-50px); }
    .benefit-card:nth-child(2) { transform: translateY(50px); }
    .benefit-card:nth-child(3) { transform: translateY(50px); }
    .benefit-card:nth-child(4) { transform: translateX(50px); }
    .tip-card.revealed, .benefit-card.revealed {
      opacity: 1;
      transform: translateY(0) translateX(0);
    }
    .tip-card.fade-out, .benefit-card.fade-out {
      opacity: 0;
      transition: opacity 0.35s ease;
    }
    .tip-card:hover, .benefit-card:hover {
      transform: translateY(-5px) scale(1.02) !important;
      box-shadow: 0 14px 36px rgba(16,185,129,0.15);
    }

    /* ── Promo section scroll reveal — slide from left ── */
    .promo {
      opacity: 0;
      transform: translateX(-28px);
      transition: opacity 0.6s cubic-bezier(0.22,1,0.36,1),
                  transform 0.6s cubic-bezier(0.22,1,0.36,1);
    }
    .promo.revealed {
      opacity: 1;
      transform: translateX(0);
    }
    .promo.fade-out {
      opacity: 0;
      transition: opacity 0.35s ease;
    }

    /* ── Section heading scroll reveal ── */
    .section-head {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    .section-head.revealed {
      opacity: 1;
      transform: translateY(0);
    }

    /* ── Promo Open chat button — ambient pulse glow ── */
    .promo .btn-primary {
      animation: promoBtnPulse 3s ease-in-out infinite;
    }
    @keyframes promoBtnPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.0), 0 4px 14px rgba(16,185,129,0.3); }
      50%       { box-shadow: 0 0 0 8px rgba(16,185,129,0.12), 0 4px 24px rgba(16,185,129,0.45); }
    }
    .promo .btn-primary:hover {
      animation: none;
    }
  `;
  document.head.appendChild(style);
}

/* ── Hero text word-by-word entrance ── */
function animateHeroText() {
  // Badge
  const badge = document.querySelector('.hero-badge-anim');
  if (badge) setTimeout(() => badge.classList.add('in'), 100);

  // H1 words — each span.hero-word appears sequentially
  const words = document.querySelectorAll('.hero-word');
  words.forEach((w, i) => {
    setTimeout(() => w.classList.add('in'), 250 + i * 80);
  });

  // Sub paragraph
  const sub = document.querySelector('.hero-sub-anim');
  if (sub) {
    const delay = 250 + words.length * 80 + 80;
    setTimeout(() => sub.classList.add('in'), delay);
  }

  // Actions (buttons)
  const actions = document.querySelector('.hero-actions-anim');
  if (actions) {
    const delay = 250 + words.length * 80 + 200;
    setTimeout(() => actions.classList.add('in'), delay);
  }

  // Stats
  document.querySelectorAll('.hero-stat-item').forEach((el, i) => {
    const delay = 400 + words.length * 80 + i * 150;
    setTimeout(() => el.classList.add('visible'), delay);
  });
}

/* ── Split h1 text into .hero-word spans ── */
function splitHeroH1() {
  const h1 = document.querySelector('.hero-content h1');
  if (!h1) return;

  // We need to split text nodes only, preserving <span> children
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
      // wrap the whole span as one word unit
      const wrapper = document.createElement('span');
      wrapper.className = 'hero-word';
      node.parentNode.insertBefore(wrapper, node);
      wrapper.appendChild(node);
    }
  };

  // Clone children list (live list changes during iteration)
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
  // how-card, tip-card, benefit-card, promo, section-head get staggered delays
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

  // Other scroll-reveal elements
  const otherSelectors = [
    '.cat-card', '.product-card', '.section-head',
  ];
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

  // Observe everything — с поддержкой fade-out при уходе вверх
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('revealed');
        e.target.classList.remove('fade-out');
      } else {
        const rect = e.target.getBoundingClientRect();
        if (rect.bottom < 0) {
          // Ушёл вверх — затухаем
          e.target.classList.add('fade-out');
        } else {
          // Ещё ниже экрана — сброс для повторной анимации при скролле
          e.target.classList.remove('revealed');
          e.target.classList.remove('fade-out');
        }
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  allRevealEls.forEach(el => {
    // Если элемент уже виден при загрузке — сразу показываем без анимации
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
  const firstName = (user?.name || '').split(' ')[0] || (isFarmer ? t('farmer_word') : t('friend_word'));

  const heroCta = isFarmer
    ? `<button class="btn btn-primary btn-lg" onclick="router.go('/product/new')"><i class="fi fi-rr-plus"></i> ${t('add_product_btn')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-store-alt"></i> ${t('view_market')}</button>`
    : `<button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-shopping-cart"></i> ${t('go_market')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/ai')"><i class="fi fi-rr-comment-alt"></i> ${t('ask_ai')}</button>`;

  const barHeights = [30,42,38,55,48,62,58,70,65,80,75,88,82,100];

  app.innerHTML = pageShell(`
    <section class="hero-light">
      <div class="hero-light-bg"></div>
      <div class="hero-light-dots"></div>

      <div class="hero-orb" style="width:500px;height:500px;top:-150px;left:-200px;background:radial-gradient(circle,rgba(16,185,129,0.18),transparent 70%);animation-duration:10s;"></div>
      <div class="hero-orb" style="width:350px;height:350px;bottom:-100px;left:20%;background:radial-gradient(circle,rgba(74,222,128,0.10),transparent 70%);animation-duration:8s;animation-delay:2s;"></div>
      <div class="hero-orb" style="width:250px;height:250px;top:20%;right:10%;background:radial-gradient(circle,rgba(16,185,129,0.07),transparent 70%);animation-duration:7s;animation-delay:4s;"></div>

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
          <div class="hero-actions hero-actions-anim">${heroCta}</div>

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
              <div class="dash-url">
                <div class="dash-dot" style="background:#ff5f57;"></div>
                <div class="dash-dot" style="background:#febc2e;"></div>
                <div class="dash-dot" style="background:#28c840;"></div>
                <span style="margin-left:6px;">agroverse.uz/dashboard</span>
              </div>
              <div class="dash-live">Live</div>
            </div>

            <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">${t('today_analytics') || 'Bugungi tahlil'}</div>
            <div style="font-size:18px;font-weight:800;color:#0f1f12;margin-bottom:14px;">AI Insights</div>

            <div class="dash-grid">
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-leaf" style="color:#10b981;font-size:9px;"></i> ${isFarmer ? 'MAHSULOT' : 'AI AGRONOM'}</div>
                <div class="dash-tile-val" id="dash-val-1">${isFarmer ? '0 ta' : "Sug'orish: optimal"}</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-store-alt" style="color:#10b981;font-size:9px;"></i> MARKETPLACE</div>
                <div class="dash-tile-val" id="dash-val-2">+0 ta order</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-truck-side" style="color:#10b981;font-size:9px;"></i> LOGISTICS</div>
                <div class="dash-tile-val" id="dash-val-3">0 marshrut</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-chart-histogram" style="color:#10b981;font-size:9px;"></i> ANALYTICS</div>
                <div class="dash-tile-val" id="dash-val-4">GMV +0%</div>
              </div>
            </div>

            <div class="dash-chart">
              ${barHeights.map((h, i) => `<div class="dash-bar ${h >= 90 ? 'hi' : ''}" style="height:${h}%;transition-delay:${0.5 + i * 0.04}s;"></div>`).join('')}
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

      <div style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:3;">
        <div class="scroll-arrow" style="border-color:rgba(16,185,129,0.5);"></div>
      </div>
    </section>

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
            <div class="cat-ic">${c.icon}</div>
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
  `);

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
    // Reveal product cards after they render
    setTimeout(initScrollReveal, 50);
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    const grid = document.getElementById('home-products');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>⚠️ ${e.message}</p></div>`;
  }

  setTimeout(() => { if (typeof initAIBubble === 'function') initAIBubble(); }, 200);
}

window.renderHome = renderHome;