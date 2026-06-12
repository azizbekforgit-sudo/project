/* pages/catalog.js — Bozor (fермер va xaridor uchun) */

const CATEGORY_OPTIONS = [
  { value: '',          key: 'cat_all',        icon: 'fi fi-rr-apps' },
  { value: 'Овощи',     key: 'cat_vegetables', icon: 'fi fi-rr-leaf' },
  { value: 'Фрукты',    key: 'cat_fruits',     icon: 'fi fi-rr-apple' },
  { value: 'Зелень',    key: 'cat_greens',     icon: 'fi fi-rr-plant' },
  { value: 'Зерновые',  key: 'cat_grains',     icon: 'fi fi-rr-wheat' },
  { value: 'Молочные',  key: 'cat_dairy',      icon: 'fi fi-rr-cow' },
  { value: 'Мёд',       key: 'cat_honey',      icon: 'fi fi-rr-bee' },
];

const CAT_EMOJI = { 'Овощи': '🥦', 'Фрукты': '🍎', 'Зелень': '🌿', 'Зерновые': '🌾', 'Молочные': '🥛', 'Мёд': '🍯' };
const CAT_GRADIENT = {
  'Овощи': 'linear-gradient(135deg,#0e2918,#1a4a2e)',
  'Фрукты': 'linear-gradient(135deg,#2e1a0e,#4a2e1a)',
  'Зелень': 'linear-gradient(135deg,#0a1e12,#1c3d24)',
  'Зерновые': 'linear-gradient(135deg,#231a0a,#3d2e1a)',
  'Молочные': 'linear-gradient(135deg,#0a1a2e,#1a2e4a)',
  'Мёд': 'linear-gradient(135deg,#2e1e0a,#4a331a)',
};

const SORT_OPTIONS = [
  { value: 'newest',    key: 'sort_newest' },
  { value: 'price_asc', key: 'sort_price_asc' },
  { value: 'price_desc',key: 'sort_price_desc' },
  { value: 'rating',    key: 'sort_rating' },
];

function starsHtml(rating) {
  const r = Math.round(rating || 0);
  let s = '';
  for(let i=1;i<=5;i++) s += `<span class="star ${i<=r?'filled':''}"><i class="fi fi-${i<=r?'sr':'rr'}-star"></i></span>`;
  return s;
}

function productCardHtml(p) {
  const isBuyer = Auth.isBuyer();
  const pending = p.status === 'pending';
  const bg = CAT_GRADIENT[p.category] || 'linear-gradient(135deg,#0e1411,#060807)';
  const img = p.images?.length
    ? `<img class="pc-img-el" src="${p.images[0]}" alt="${p.name}" onerror="this.parentElement.style.background='${bg}';this.remove()" />`
    : `<div class="pc-img-ph">${CAT_EMOJI[p.category] || '🥬'}</div>`;
  const action = isBuyer
    ? `<button class="btn btn-primary btn-sm pc-btn" onclick="event.stopPropagation(); quickAddToCart(${p.id})"><i class="fi fi-rr-shopping-cart"></i> ${t('add_to_cart')}</button>`
    : `<button class="btn btn-ghost btn-sm pc-btn" onclick="event.stopPropagation(); router.go('/product/${p.id}')"><i class="fi fi-rr-eye"></i> ${t('details_btn')}</button>`;
  const discountBadge = p.discount ? `<span class="pc-discount">-${p.discount}%</span>` : '';
  return `
    <div class="product-card v2" onclick="router.go('/product/${p.id}')">
      <div class="pc-media v2" style="background:${bg}">
        ${img}
        ${pending ? `<span class="pc-badge">${t('on_moderation')}</span>` : ''}
        ${discountBadge}
        <span class="pc-cat-tag">${p.category || ''}</span>
      </div>
      <div class="pc-body">
        <div class="pc-name">${p.name}</div>
        <div class="pc-rating">${starsHtml(p.rating)}</div>
        <div class="pc-price-row">
          <div class="pc-price">${Number(p.price).toLocaleString('ru')} <small>${t('sum')}/${p.unit || t('unit_kg')}</small></div>
        </div>
        <div class="pc-farmer"><i class="fi fi-sr-leaf"></i> ${p.fermer_name || t('farmer_word')}</div>
        <div class="pc-actions">${action}</div>
      </div>
    </div>
  `;
}

async function quickAddToCart(id) {
  try {
    const p = await API.getProduct(id);
    addToCart(p, 1);
    showToast(`«${p.name}» ${t('added_to_cart')}`);
    document.querySelector('.app')?.dispatchEvent(new Event('cart'));
    const link = document.querySelector('.nav-link[onclick*="/cart"] .nav-badge');
    const count = getCartCount();
    if (link) link.textContent = count;
  } catch (e) { showToast(e.message, 'error'); }
}

let debounceTimer;

async function renderCatalog() {
  const app = document.getElementById('app');
  const presetCat = new URLSearchParams((location.hash.split('?')[1] || '')).get('cat') || '';

  app.innerHTML = pageShell(`
    <div class="market-hero">
      <div class="market-hero-bg"></div>
      <div class="market-hero-content">
        <div class="market-hero-icon"><i class="fi fi-sr-store-alt"></i></div>
        <div>
          <h1 class="market-title">${t('nav_market')}</h1>
          <p class="market-subtitle">${t('market_desc')}</p>
        </div>
      </div>
    </div>

    <div class="cat-tabs" id="cat-tabs">
      ${CATEGORY_OPTIONS.map(o => `
        <button class="cat-tab ${o.value === presetCat ? 'active' : ''}" data-val="${o.value}" onclick="setCatTab(this,'${o.value}')">
          <i class="${o.icon}"></i>
          <span>${o.value ? t(o.key) : t('cat_all')}</span>
        </button>
      `).join('')}
    </div>

    <div class="market-toolbar">
      <div class="market-search-wrap">
        <i class="fi fi-rr-search search-ic"></i>
        <input type="text" id="search-input" class="market-search" placeholder="${t('search_placeholder')}" />
      </div>
      <div class="market-filters-row">
        <div class="price-inputs">
          <input type="number" id="min-price" class="price-inp" placeholder="${t('price_from')}" min="0" />
          <span class="price-sep">—</span>
          <input type="number" id="max-price" class="price-inp" placeholder="${t('price_to')}" min="0" />
        </div>
        <select id="sort-select" class="sort-select">
          ${SORT_OPTIONS.map(s => `<option value="${s.value}">${t(s.key)}</option>`).join('')}
        </select>
      </div>
    </div>

    <div id="products-grid" class="products-grid v2"><div class="spinner"></div></div>
  `);

  async function loadProducts() {
    const search    = document.getElementById('search-input')?.value || '';
    const category  = document.getElementById('cat-tabs')?.querySelector('.cat-tab.active')?.dataset.val || '';
    const min_price = document.getElementById('min-price')?.value || '';
    const max_price = document.getElementById('max-price')?.value || '';
    const sort      = document.getElementById('sort-select')?.value || 'newest';
    const grid = document.getElementById('products-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="spinner"></div>';
    try {
      let products = await API.getProducts({ search, category, min_price, max_price });
      if (!products?.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fi fi-rr-leaf" style="font-size:48px;color:var(--clr-primary)"></i><p>${t('no_products_found')}</p></div>`;
        return;
      }
      // client-side sort
      if (sort === 'price_asc') products.sort((a,b) => a.price - b.price);
      else if (sort === 'price_desc') products.sort((a,b) => b.price - a.price);
      else if (sort === 'rating') products.sort((a,b) => (b.rating||0) - (a.rating||0));
      grid.innerHTML = products.map(productCardHtml).join('');
    } catch (e) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fi fi-rr-triangle-warning" style="font-size:48px;color:var(--clr-error)"></i><p>${e.message}</p></div>`;
    }
  }

  window.setCatTab = function(el, val) {
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadProducts();
  };

  loadProducts();

  const onChange = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadProducts, 300); };
  document.getElementById('search-input')?.addEventListener('input', onChange);
  document.getElementById('min-price')?.addEventListener('input', onChange);
  document.getElementById('max-price')?.addEventListener('input', onChange);
  document.getElementById('sort-select')?.addEventListener('change', loadProducts);

  // preset category from URL
  if (presetCat) {
    const tab = document.querySelector(`.cat-tab[data-val="${presetCat}"]`);
    if (tab) { document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); }
  }
}

window.renderCatalog = renderCatalog;
window.productCardHtml = productCardHtml;
window.quickAddToCart = quickAddToCart;
window.starsHtml = starsHtml;
window.CAT_EMOJI = CAT_EMOJI;
