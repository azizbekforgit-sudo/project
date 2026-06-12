/* pages/home.js — svetliy hero + dashboard + mega button effects */

const HOME_CATEGORIES = [
  { value: 'Овощи',     icon: '🥦', key: 'cat_vegetables', tint: '#10B981', img: 'assets/cat-vegetables.jpg', bg: 'linear-gradient(135deg,#10B981,#059669)' },
  { value: 'Фрукты',    icon: '🍎', key: 'cat_fruits',     tint: '#F59E0B', img: 'assets/cat-fruits.jpg',     bg: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { value: 'Зелень',    icon: '🌿', key: 'cat_greens',     tint: '#22C55E', img: 'assets/cat-greens.jpg',     bg: 'linear-gradient(135deg,#22C55E,#16A34A)' },
  { value: 'Зерновые',  icon: '🌾', key: 'cat_grains',     tint: '#D97706', img: 'assets/cat-grains.jpg',     bg: 'linear-gradient(135deg,#D97706,#B45309)' },
  { value: 'Молочные',  icon: '🥛', key: 'cat_dairy',      tint: '#3B82F6', img: 'assets/cat-dairy.jpg',      bg: 'linear-gradient(135deg,#3B82F6,#2563EB)' },
  { value: 'Мёд',       icon: '🍯', key: 'cat_honey',      tint: '#EAB308', img: 'assets/cat-honey.jpg',      bg: 'linear-gradient(135deg,#EAB308,#CA8A04)' },
];

const HOW_IT_WORKS = [
  { icon: 'fi fi-sr-user-add',      key: 'how_reg' },
  { icon: 'fi fi-sr-store-alt',     key: 'how_find' },
  { icon: 'fi fi-sr-shopping-cart', key: 'how_order' },
  { icon: 'fi fi-sr-leaf',          key: 'how_deliver' },
];

/* ── inject global button magic styles once ── */
function injectButtonStyles() {
  if (document.getElementById('av-btn-styles')) return;
  const style = document.createElement('style');
  style.id = 'av-btn-styles';
  style.textContent = `
    .btn {
      position: relative;
      overflow: hidden;
      transform-style: preserve-3d;
      transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease !important;
    }

    /* Magnetic + 3D tilt handled by JS, ripple by JS */

    /* Glow ring on hover */
    .btn::before {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(74,222,128,0.6), rgba(16,185,129,0.3), rgba(74,222,128,0.6));
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 0;
      filter: blur(4px);
    }
    .btn:hover::before { opacity: 1; }

    /* Ripple element */
    .btn-ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.4);
      transform: scale(0);
      animation: rippleAnim 0.7s ease-out forwards;
      pointer-events: none;
      z-index: 1;
    }
    @keyframes rippleAnim {
      0%   { transform: scale(0); opacity: 1; }
      70%  { transform: scale(4); opacity: 0.3; }
      100% { transform: scale(5); opacity: 0; }
    }

    /* Shimmer sweep */
    .btn::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 60%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
      transform: skewX(-20deg);
      transition: none;
      z-index: 2;
    }
    .btn:hover::after {
      animation: shimmerSweep 0.55s ease forwards;
    }
    @keyframes shimmerSweep {
      0%   { left: -100%; }
      100% { left: 160%; }
    }

    /* Primary button extra glow */
    .btn-primary:hover {
      box-shadow: 0 0 0 3px rgba(74,222,128,0.25),
                  0 8px 30px rgba(16,185,129,0.5),
                  0 0 60px rgba(74,222,128,0.2) !important;
      filter: brightness(1.1);
    }
    .btn-ghost:hover, .btn-outline:hover {
      box-shadow: 0 0 0 2px rgba(74,222,128,0.3),
                  0 6px 20px rgba(16,185,129,0.2) !important;
    }

    /* Hero styles */
    .hero-light {
      position: relative;
      min-height: 100vh;
      width: calc(100% + 56px);
      margin-left: -28px;
      margin-right: -28px;
      margin-top: -110px;
      margin-bottom: 72px;
      display: flex;
      align-items: center;
      overflow: hidden;
      background: #ffffff;
    }
    .hero-light-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 100% at -10% 50%, rgba(16,185,129,0.18) 0%, rgba(74,222,128,0.08) 40%, transparent 70%),
        radial-gradient(ellipse 60% 60% at 110% 80%, rgba(16,185,129,0.06) 0%, transparent 60%),
        linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #f8fffc 100%);
      z-index: 0;
    }
    .hero-light-dots {
      position: absolute; inset: 0; z-index: 0; pointer-events: none;
      background-image: radial-gradient(circle, rgba(16,185,129,0.12) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .hero-light-inner {
      position: relative; z-index: 2;
      max-width: 1400px; margin: 0 auto;
      padding: clamp(100px,10vw,140px) clamp(28px,4vw,72px) clamp(60px,6vw,80px);
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
    .hero-light .hero-badge {
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.25);
      color: #059669;
    }
    .hero-light .hero-title { color: #0f1f12; }
    .hero-light .hero-sub   { color: #4b7a5a; }
    .hero-light .hero-stats .stat b { color: #059669; }
    .hero-light .hero-stats .stat span { color: #6b9e7a; }
    .hero-light .btn-ghost {
      border-color: rgba(16,185,129,0.35);
      color: #0f1f12;
      background: rgba(255,255,255,0.7);
    }

    /* Floating orbs */
    .hero-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      pointer-events: none;
      animation: orbFloat 8s ease-in-out infinite;
    }
    @keyframes orbFloat {
      0%,100% { transform: translateY(0) scale(1); }
      50%      { transform: translateY(-30px) scale(1.08); }
    }

    /* Dashboard card */
    .hero-dashboard {
      position: relative;
      animation: dashFloat 5s ease-in-out infinite;
    }
    @keyframes dashFloat {
      0%,100% { transform: translateY(0) rotate(-1deg); }
      50%      { transform: translateY(-12px) rotate(0.5deg); }
    }
    .dash-card {
      background: #ffffff;
      border: 1px solid rgba(16,185,129,0.2);
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(16,185,129,0.12), 0 4px 20px rgba(0,0,0,0.06);
    }
    .dash-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px;
    }
    .dash-url {
      display: flex; align-items: center; gap: 8px;
      font-size: 12px; color: #6b7280; font-family: monospace;
    }
    .dash-dot { width: 10px; height: 10px; border-radius: 50%; }
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
    .dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
    .dash-tile {
      background: #f0fdf4;
      border: 1px solid rgba(16,185,129,0.15);
      border-radius: 12px; padding: 14px;
    }
    .dash-tile-label {
      font-size: 10px; font-weight: 700; color: #6b7280;
      text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
      display: flex; align-items: center; gap: 5px;
    }
    .dash-tile-val { font-size: 14px; font-weight: 700; color: #0f1f12; }
    .dash-chart { display: flex; align-items: flex-end; gap: 4px; height: 70px; margin-bottom: 16px; }
    .dash-bar {
      flex: 1; border-radius: 4px 4px 0 0;
      background: linear-gradient(to top, #10b981, #4ade80);
      opacity: 0.7;
      animation: barGrow 1s ease both;
    }
    .dash-bar.hi { opacity: 1; box-shadow: 0 0 10px rgba(16,185,129,0.5); }
    @keyframes barGrow {
      from { transform: scaleY(0); transform-origin: bottom; }
      to   { transform: scaleY(1); transform-origin: bottom; }
    }
    .dash-footer {
      display: flex; align-items: center; gap: 10px;
      background: #f0fdf4; border-radius: 10px; padding: 10px 14px;
    }
    .dash-footer-ic {
      width: 30px; height: 30px; border-radius: 8px;
      background: linear-gradient(135deg,#10b981,#059669);
      display: grid; place-items: center; color: #fff; font-size: 14px;
    }
    .dash-footer-text { font-size: 12px; }
    .dash-footer-text b { color: #059669; display: block; }
    .dash-footer-text span { color: #6b7280; }
  `;
  document.head.appendChild(style);
}

/* ── Magnetic + Ripple + 3D tilt button effect ── */
function initButtonEffects() {
  document.addEventListener('mousemove', (e) => {
    document.querySelectorAll('.btn').forEach(btn => {
      const r   = btn.getBoundingClientRect();
      const cx  = r.left + r.width  / 2;
      const cy  = r.top  + r.height / 2;
      const dx  = e.clientX - cx;
      const dy  = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 120;

      if (dist < maxDist) {
        const force = (1 - dist / maxDist) * 10;
        const tiltX = (dy / r.height) * force * -1;
        const tiltY = (dx / r.width)  * force;
        const moveX = (dx / maxDist)  * force * 0.5;
        const moveY = (dy / maxDist)  * force * 0.5;
        btn.style.transform = `translate(${moveX}px, ${moveY}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.04)`;
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
    const r    = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const x    = e.clientX - r.left - size / 2;
    const y    = e.clientY - r.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  });
}

async function renderHome() {
  injectButtonStyles();

  const app      = document.getElementById('app');
  const user     = Auth.getUser();
  const isFarmer = Auth.isFarmer();
  const firstName = (user?.name || '').split(' ')[0] || (isFarmer ? t('farmer_word') : t('friend_word'));

  const heroCta = isFarmer
    ? `<button class="btn btn-primary btn-lg" onclick="router.go('/product/new')"><i class="fi fi-rr-plus"></i> ${t('add_product_btn')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-store-alt"></i> ${t('view_market')}</button>`
    : `<button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-shopping-cart"></i> ${t('go_market')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/ai')"><i class="fi fi-rr-comment-alt"></i> ${t('ask_ai')}</button>`;

  const barHeights = [35,50,45,60,55,70,65,80,72,90,85,95,88,100];

  app.innerHTML = pageShell(`
    <section class="hero-light">
      <div class="hero-light-bg"></div>
      <div class="hero-light-dots"></div>

      <!-- Floating orbs -->
      <div class="hero-orb" style="width:400px;height:400px;top:-100px;left:-150px;background:radial-gradient(circle,rgba(16,185,129,0.15),transparent 70%);animation-duration:9s;"></div>
      <div class="hero-orb" style="width:300px;height:300px;bottom:-80px;right:300px;background:radial-gradient(circle,rgba(74,222,128,0.1),transparent 70%);animation-duration:7s;animation-delay:2s;"></div>

      <div class="hero-light-inner">
        <!-- Left: text -->
        <div class="hero-content">
          <div class="hero-badge"><i class="fi fi-sr-leaf"></i> ${t('fresh_with_field')}</div>
          <h1 class="hero-title" style="color:#0f1f12;font-size:clamp(36px,5vw,62px);line-height:1.05;margin-bottom:18px;">
            ${t('hi')}, <span style="color:#10b981;">${firstName}</span>!<br>
            <span style="background:linear-gradient(135deg,#10b981,#059669);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">
              ${isFarmer ? t('sell_farm') : t('buy_farm')}
            </span><br>
            <span style="color:#0f1f12;">${t('no_middlemen')}</span>
          </h1>
          <p class="hero-sub" style="color:#4b7a5a;font-size:17px;margin-bottom:28px;">${isFarmer ? t('hero_farmer_sub') : t('hero_buyer_sub')}</p>
          <div class="hero-actions">${heroCta}</div>
          <div class="hero-stats" style="margin-top:40px;">
            <div class="stat"><b id="stat-products" style="color:#059669;font-size:28px;">—</b><span style="color:#6b9e7a;">${t('products_on_market')}</span></div>
            <div class="stat"><b style="color:#059669;font-size:28px;">100%</b><span style="color:#6b9e7a;">${t('all_farm')}</span></div>
            <div class="stat"><b style="color:#059669;font-size:28px;">0%</b><span style="color:#6b9e7a;">${t('middlemen0')}</span></div>
          </div>
        </div>

        <!-- Right: dashboard mockup -->
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
            <div style="font-size:18px;font-weight:800;color:#0f1f12;margin-bottom:16px;">AI Insights</div>

            <div class="dash-grid">
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-leaf" style="color:#10b981;"></i> ${isFarmer ? 'MAHSULOT' : 'AI AGRONOM'}</div>
                <div class="dash-tile-val">${isFarmer ? t('products_on_market') || 'Bozorda' : "Sug'orish: optimal"}</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-store-alt" style="color:#10b981;"></i> MARKETPLACE</div>
                <div class="dash-tile-val">+128 ta yangi order</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-truck-side" style="color:#10b981;"></i> LOGISTICS</div>
                <div class="dash-tile-val">3 marshrut faol</div>
              </div>
              <div class="dash-tile">
                <div class="dash-tile-label"><i class="fi fi-sr-chart-histogram" style="color:#10b981;"></i> ANALYTICS</div>
                <div class="dash-tile-val">GMV +24% MoM</div>
              </div>
            </div>

            <div class="dash-chart">
              ${barHeights.map((h, i) => `<div class="dash-bar ${h >= 90 ? 'hi' : ''}" style="height:${h}%;animation-delay:${i * 0.05}s;"></div>`).join('')}
            </div>

            <div class="dash-footer">
              <div class="dash-footer-ic"><i class="fi fi-sr-sparkles"></i></div>
              <div class="dash-footer-text">
                <b>AI tavsiya</b>
                <span>+18% hosil prognozi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-scroll-hint" style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);z-index:3;">
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

  // Init button effects
  initButtonEffects();

  // Load products
  try {
    const products = await API.getProducts({ limit: 8 });
    document.getElementById('stat-products').textContent = products.length;
    const grid = document.getElementById('home-products');
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <i class="fi fi-rr-leaf" style="font-size:48px;color:var(--clr-primary)"></i>
        <p>${t('no_products_yet')} ${isFarmer ? t('add_first') : t('come_later')}</p>
      </div>`;
      return;
    }
    grid.innerHTML = products.slice(0, 8).map(productCardHtml).join('');
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    const grid = document.getElementById('home-products');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>⚠️ ${e.message}</p></div>`;
  }

  setTimeout(() => { if (typeof initAIBubble === 'function') initAIBubble(); }, 200);
}

window.renderHome = renderHome;