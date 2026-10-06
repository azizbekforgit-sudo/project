/* pages/catalog.js — Bozor (fермер va xaridor uchun) */

const CATEGORY_OPTIONS = [
  { value: '',          key: 'cat_all',        icon: 'fi fi-rr-apps' },
  { value: 'Овощи',     key: 'cat_vegetables', icon: 'fi fi-rr-leaf' },
  { value: 'Фрукты',    key: 'cat_fruits',     icon: 'fi fi-rr-apple' },
  { value: 'Зелень',    key: 'cat_greens',     icon: 'fi fi-rr-plant' },
  { value: 'Зерновые',  key: 'cat_grains',     icon: 'fi fi-rr-wheat' },
  { value: 'Молочные',  key: 'cat_dairy',      icon: 'fi fi-rr-cow' },
  { value: 'Мёд',       key: 'cat_honey',      icon: 'fi fi-rr-bee' },
  { value: 'Цветы',      key: 'cat_flowers',    icon: 'fi fi-rr-flower' },
  { value: 'Саженцы',    key: 'cat_seedlings',  icon: 'fi fi-rr-seedling' },
  { value: 'Бахчевые',   key: 'cat_melon',      icon: 'fi fi-rr-apple-whole' },
  { value: 'Семена',     key: 'cat_seeds',      icon: 'fi fi-rr-seedling' },
  { value: 'Земля',      key: 'cat_land',       icon: 'fi fi-rr-map' },
];

const CAT_EMOJI = {
  'Овощи': 'fi fi-sr-carrot', 'Фрукты': 'fi fi-sr-apple-alt', 'Зелень': 'fi fi-sr-leaf',
  'Зерновые': 'fi fi-sr-wheat', 'Молочные': 'fi fi-sr-milk', 'Мёд': 'fi fi-sr-honey',
  'Цветы': 'fi fi-sr-sakura', 'Саженцы': 'fi fi-sr-seedling', 'Бахчевые': 'fi fi-sr-fruit-watermelon',
  'Семена': 'fi fi-sr-seedling', 'Земля': 'fi fi-sr-map',
};
const CAT_GRADIENT = {
  'Овощи': 'linear-gradient(135deg,#0e2918,#1a4a2e)',
  'Фрукты': 'linear-gradient(135deg,#2e1a0e,#4a2e1a)',
  'Зелень': 'linear-gradient(135deg,#0a1e12,#1c3d24)',
  'Зерновые': 'linear-gradient(135deg,#231a0a,#3d2e1a)',
  'Молочные': 'linear-gradient(135deg,#0a1a2e,#1a2e4a)',
  'Мёд': 'linear-gradient(135deg,#2e1e0a,#4a331a)',
  'Цветы': 'linear-gradient(135deg,#2e0a1e,#4a1a33)',
  'Саженцы': 'linear-gradient(135deg,#0a1e18,#1a3d2e)',
  'Бахчевые': 'linear-gradient(135deg,#0e2918,#1a4a2e)',
  'Семена': 'linear-gradient(135deg,#1a0e2e,#2e1a4a)',
  'Земля': 'linear-gradient(135deg,#1a1408,#3d2e0a)',
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
  const bg = CAT_GRADIENT[p.category] || 'linear-gradient(135deg, #1B5C3B, #24754C)';
  const img = p.images?.length
    ? `<img class="pc-img-el" src="${p.images[0]}" alt="${p.name}" onerror="this.parentElement.style.background='${bg}';this.remove()" />`
    : `<div class="pc-img-ph"><i class="${CAT_EMOJI[p.category] || 'fi fi-sr-leaf'}" style="font-size:44px;color:rgba(255,255,255,0.7)"></i></div>`;
  const action = isBuyer
    ? `<button class="btn btn-primary btn-sm pc-btn" onclick="event.stopPropagation(); quickAddToCart(${p.id})"><i class="fi fi-rr-shopping-cart"></i> ${t('add_to_cart')}</button>`
    : `<button class="btn btn-outline btn-sm pc-btn" onclick="event.stopPropagation(); router.go('/product/${p.id}')"><i class="fi fi-rr-eye"></i> ${t('details_btn')}</button>`;
  const discountBadge = p.discount ? `<span class="pc-discount">-${p.discount}%</span>` : '';
  return `
    <div class="agri-product-card" onclick="router.go('/product/${p.id}')">
      <div class="apc-media">
        ${img}
        ${pending ? `<span class="apc-badge">${t('on_moderation')}</span>` : ''}
        ${discountBadge}
        <span class="apc-cat-tag">${p.category || 'Продукция'}</span>
      </div>
      <div class="apc-body">
        <div class="apc-farmer"><i class="fi fi-sr-leaf"></i> ${p.fermer_name || 'Ферма Абдуллаева'}</div>
        <h3 class="apc-name">${p.name}</h3>
        <div class="apc-rating">${starsHtml(p.rating || 5.0)} <span class="apc-rating-val">${p.rating || '5.0'}</span></div>
        <div class="apc-price-box">
          <div class="apc-price">${Number(p.price).toLocaleString('ru')} <small>сум / ${p.unit || 'кг'}</small></div>
        </div>
        <div class="apc-footer">
          ${action}
        </div>
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
    const link = document.querySelector('.cart-header-badge');
    const count = getCartCount();
    if (link) link.textContent = count;
  } catch (e) { showToast(e.message, 'error'); }
}

let debounceTimer;

async function renderCatalog() {
  const app = document.getElementById('app');
  const presetCat = new URLSearchParams((location.hash.split('?')[1] || '')).get('cat') || '';

  app.innerHTML = pageShell(`
    <div class="catalog-page-layout">
      <!-- ═══ SIDEBAR FILTERS ═══ -->
      <aside class="catalog-sidebar-filters">
        <div class="csf-header">
          <h3><i class="fi fi-rr-filter"></i> Фильтры</h3>
          <button class="csf-reset" onclick="resetCatalogFilters()">Сбросить</button>
        </div>

        <div class="csf-group">
          <label class="csf-label">Категории</label>
          <div class="csf-categories-list" id="cat-tabs">
            ${CATEGORY_OPTIONS.map(o => `
              <div class="csf-cat-item ${o.value === presetCat ? 'active' : ''}" data-val="${o.value}" onclick="setCatTab(this, '${o.value}')">
                <i class="${o.icon}"></i>
                <span>${o.value ? t(o.key) : t('cat_all')}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="csf-group">
          <label class="csf-label">Цена (сум)</label>
          <div class="csf-price-inputs">
            <input type="number" id="min-price" placeholder="Мин." />
            <span>—</span>
            <input type="number" id="max-price" placeholder="Макс." />
          </div>
        </div>
      </aside>

      <!-- ═══ MAIN PRODUCTS GRID ═══ -->
      <section class="catalog-main-panel">
        <div class="cmp-top-bar">
          <div class="cmp-search">
            <i class="fi fi-rr-search"></i>
            <input type="text" id="search-input" placeholder="${t('search_placeholder')}" />
          </div>
          <div class="cmp-sort">
            <select id="sort-select">
              ${SORT_OPTIONS.map(s => `<option value="${s.value}">${t(s.key)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div id="products-grid" class="agri-products-grid"><div class="spinner"></div></div>
      </section>
    </div>
  `);

  async function loadProducts() {
    const search    = document.getElementById('search-input')?.value || '';
    const category  = document.getElementById('cat-tabs')?.querySelector('.csf-cat-item.active')?.dataset.val || '';
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
    document.querySelectorAll('.csf-cat-item').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    loadProducts();
  };

  window.resetCatalogFilters = function() {
    document.querySelectorAll('.csf-cat-item').forEach(t => t.classList.remove('active'));
    const allTab = document.querySelector('.csf-cat-item[data-val=""]');
    if (allTab) allTab.classList.add('active');
    if (document.getElementById('search-input')) document.getElementById('search-input').value = '';
    if (document.getElementById('min-price')) document.getElementById('min-price').value = '';
    if (document.getElementById('max-price')) document.getElementById('max-price').value = '';
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
    const tab = document.querySelector(`.csf-cat-item[data-val="${presetCat}"]`);
    if (tab) { document.querySelectorAll('.csf-cat-item').forEach(t => t.classList.remove('active')); tab.classList.add('active'); }
  }
}

window.renderCatalog = renderCatalog;
window.productCardHtml = productCardHtml;
window.quickAddToCart = quickAddToCart;
window.starsHtml = starsHtml;
window.CAT_EMOJI = CAT_EMOJI;
