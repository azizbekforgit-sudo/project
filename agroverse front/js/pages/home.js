/* pages/home.js — stiljli bosh sahifa (fermер va xaridor) */

const HOME_CATEGORIES = [
  { value: 'Овощи',     icon: '🥦', key: 'cat_vegetables', tint: '#10B981', img: 'assets/cat-vegetables.jpg', bg: 'linear-gradient(135deg,#10B981,#059669)' },
  { value: 'Фрукты',    icon: '🍎', key: 'cat_fruits',     tint: '#F59E0B', img: 'assets/cat-fruits.jpg',     bg: 'linear-gradient(135deg,#F59E0B,#D97706)' },
  { value: 'Зелень',    icon: '🌿', key: 'cat_greens',     tint: '#22C55E', img: 'assets/cat-greens.jpg',     bg: 'linear-gradient(135deg,#22C55E,#16A34A)' },
  { value: 'Зерновые',  icon: '🌾', key: 'cat_grains',     tint: '#D97706', img: 'assets/cat-grains.jpg',     bg: 'linear-gradient(135deg,#D97706,#B45309)' },
  { value: 'Молочные',  icon: '🥛', key: 'cat_dairy',      tint: '#3B82F6', img: 'assets/cat-dairy.jpg',      bg: 'linear-gradient(135deg,#3B82F6,#2563EB)' },
  { value: 'Мёд',       icon: '🍯', key: 'cat_honey',      tint: '#EAB308', img: 'assets/cat-honey.jpg',      bg: 'linear-gradient(135deg,#EAB308,#CA8A04)' },
];

const HOW_IT_WORKS = [
  { icon: 'fi fi-sr-user-add',    key: 'how_reg' },
  { icon: 'fi fi-sr-store-alt',   key: 'how_find' },
  { icon: 'fi fi-sr-shopping-cart', key: 'how_order' },
  { icon: 'fi fi-sr-leaf',        key: 'how_deliver' },
];

async function renderHome() {
  const app  = document.getElementById('app');
  const user = Auth.getUser();
  const isFarmer = Auth.isFarmer();
  const firstName = (user?.name || '').split(' ')[0] || (isFarmer ? t('farmer_word') : t('friend_word'));

  const heroCta = isFarmer
    ? `<button class="btn btn-primary btn-lg" onclick="router.go('/product/new')"><i class="fi fi-rr-plus"></i> ${t('add_product_btn')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-store-alt"></i> ${t('view_market')}</button>`
    : `<button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fi fi-rr-shopping-cart"></i> ${t('go_market')}</button>
       <button class="btn btn-ghost btn-lg" onclick="router.go('/ai')"><i class="fi fi-rr-comment-alt"></i> ${t('ask_ai')}</button>`;

  app.innerHTML = pageShell(`
    <section class="hero v2 hero-fullscreen">
      <div class="hero-bg-overlay"></div>
      <div class="hero-particles" id="hero-particles"></div>
      <div class="hero-content">
        <div class="hero-badge"><i class="fi fi-sr-leaf"></i> ${t('fresh_with_field')}</div>
        <h1 class="hero-title">${t('hi')}, <span class="hero-name-white">${firstName}</span>!<br><span class="hero-grad-green">${isFarmer ? t('sell_farm') : t('buy_farm')}</span><br>${t('no_middlemen')}</h1>
        <p class="hero-sub">${isFarmer ? t('hero_farmer_sub') : t('hero_buyer_sub')}</p>
        <div class="hero-actions">${heroCta}</div>
        <div class="hero-stats">
          <div class="stat"><b id="stat-products">—</b><span>${t('products_on_market')}</span></div>
          <div class="stat"><b>100%</b><span>${t('all_farm')}</span></div>
          <div class="stat"><b>0%</b><span>${t('middlemen0')}</span></div>
        </div>
      </div>
      <div class="hero-scroll-hint">
        <div class="scroll-arrow"></div>
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
        ${HOW_IT_WORKS.map((h,i) => `
          <div class="how-card">
            <div class="how-num">${i+1}</div>
            <div class="how-ic"><i class="${h.icon}"></i></div>
            <div class="how-label">${t(h.key)}</div>
          </div>
        `).join('')}
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
    </section>
    ` : `
    <section class="section">
      <div class="section-head"><h2>${t('farmer_tips_title')}</h2></div>
      <div class="tips-grid">
        <div class="tip-card"><i class="fi fi-sr-chart-line-up"></i><h4>${t('tip_price')}</h4><p>${t('tip_price_desc')}</p></div>
        <div class="tip-card"><i class="fi fi-sr-camera"></i><h4>${t('tip_photo')}</h4><p>${t('tip_photo_desc')}</p></div>
        <div class="tip-card"><i class="fi fi-sr-star"></i><h4>${t('tip_rating')}</h4><p>${t('tip_rating_desc')}</p></div>
      </div>
    </section>
    `}
  `);

  try {
    const products = await API.getProducts({ limit: 8 });
    document.getElementById('stat-products').textContent = products.length;
    const grid = document.getElementById('home-products');
    if (!products.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fi fi-rr-leaf" style="font-size:48px;color:var(--clr-primary)"></i><p>${t('no_products_yet')} ${isFarmer ? t('add_first') : t('come_later')}</p></div>`;
      return;
    }
    grid.innerHTML = products.slice(0, 8).map(productCardHtml).join('');
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    const grid = document.getElementById('home-products');
    if (grid) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>⚠️ ${e.message}</p></div>`;
  }

  // Hero particles
  const particlesEl = document.getElementById('hero-particles');
  if (particlesEl) {
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'hero-particle';
      p.style.cssText = `left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*6}s;animation-duration:${4+Math.random()*5}s;width:${2+Math.random()*4}px;height:${2+Math.random()*4}px;opacity:${0.2+Math.random()*0.5}`;
      particlesEl.appendChild(p);
    }
  }

  // init floating AI bubble
  setTimeout(() => { if (typeof initAIBubble === 'function') initAIBubble(); }, 200);
}

window.renderHome = renderHome;
