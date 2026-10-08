/* pages/catalog.js — Bozor (fермер va xaridor uchun) */

const CATEGORY_OPTIONS = [
  { value: '',          key: 'cat_all',        icon: 'fa-solid fa-border-all' },
  { value: 'Овощи',     key: 'cat_vegetables', icon: 'fa-solid fa-carrot' },
  { value: 'Фрукты',    key: 'cat_fruits',     icon: 'fa-solid fa-apple-whole' },
  { value: 'Зелень',    key: 'cat_greens',     icon: 'fa-solid fa-leaf' },
  { value: 'Зерновые',  key: 'cat_grains',     icon: 'fa-solid fa-wheat-awn' },
  { value: 'Молочные',  key: 'cat_dairy',      icon: 'fa-solid fa-bottle-droplet' },
  { value: 'Мёд',       key: 'cat_honey',      icon: 'fa-solid fa-jar' },
  { value: 'Цветы',      key: 'cat_flowers',    icon: 'fa-solid fa-seedling' },
  { value: 'Саженцы',    key: 'cat_seedlings',  icon: 'fa-solid fa-tree' },
  { value: 'Бахчевые',   key: 'cat_melon',      icon: 'fa-solid fa-lemon' },
  { value: 'Семена',     key: 'cat_seeds',      icon: 'fa-solid fa-seedling' },
  { value: 'Земля',      key: 'cat_land',       icon: 'fa-solid fa-mound' },
];

const CAT_EMOJI = {
  'Овощи': 'fa-solid fa-carrot', 'Фрукты': 'fa-solid fa-apple-whole', 'Зелень': 'fa-solid fa-leaf',
  'Зерновые': 'fa-solid fa-wheat-awn', 'Молочные': 'fa-solid fa-bottle-droplet', 'Мёд': 'fa-solid fa-jar',
  'Цветы': 'fa-solid fa-seedling', 'Саженцы': 'fa-solid fa-tree', 'Бахчевые': 'fa-solid fa-lemon',
  'Семена': 'fa-solid fa-seedling', 'Земля': 'fa-solid fa-mound',
};
const CAT_GRADIENT = {
  'Овощи': 'linear-gradient(135deg,#105C38,#167D4D)',
  'Фрукты': 'linear-gradient(135deg,#D97706,#B45309)',
  'Зелень': 'linear-gradient(135deg,#15803D,#166534)',
  'Зерновые': 'linear-gradient(135deg,#B45309,#78350F)',
  'Молочные': 'linear-gradient(135deg,#1D4ED8,#1E40AF)',
  'Мёд': 'linear-gradient(135deg,#CA8A04,#854D0E)',
  'Цветы': 'linear-gradient(135deg,#BE185D,#9D174D)',
  'Саженцы': 'linear-gradient(135deg,#047857,#065F46)',
  'Бахчевые': 'linear-gradient(135deg,#059669,#047857)',
  'Семена': 'linear-gradient(135deg,#6D28D9,#5B21B6)',
  'Земля': 'linear-gradient(135deg,#78350F,#451A03)',
};

const SORT_OPTIONS = [
  { value: 'newest',    key: 'sort_newest' },
  { value: 'price_asc', key: 'sort_price_asc' },
  { value: 'price_desc',key: 'sort_price_desc' },
  { value: 'rating',    key: 'sort_rating' },
];

function starsHtml(rating) {
  const r = Math.round(rating || 5);
  let s = '';
  for(let i=1;i<=5;i++) s += `<span class="star ${i<=r?'filled':''}"><i class="${i<=r?'fa-solid':'fa-regular'} fa-star"></i></span>`;
  return s;
}

function productCardHtml(p) {
  const me = Auth.getUser();
  const own = me && p.fermer_id === me.id;
  const isBuyer = Auth.canBuy() && !own && !p.is_demo;
  const pending = p.status === 'pending';
  const bg = CAT_GRADIENT[p.category] || 'linear-gradient(135deg, #105C38, #187548)';
  const img = p.images?.length
    ? `<img class="pc-img-el" src="${p.images[0]}" alt="${p.name}" onerror="this.parentElement.style.background='${bg}';this.remove()" />`
    : `<div class="pc-img-ph" style="background:${bg}"><i class="${CAT_EMOJI[p.category] || 'fa-solid fa-leaf'}" style="font-size:44px;color:rgba(255,255,255,0.85)"></i></div>`;
  const action = isBuyer
    ? `<button class="btn btn-primary btn-sm pc-btn" onclick="event.stopPropagation(); quickAddToCart(${p.id})"><i class="fa-solid fa-cart-shopping"></i> ${t('add_to_cart')}</button>`
    : `<button class="btn btn-outline btn-sm pc-btn" onclick="event.stopPropagation(); router.go('/product/${p.id}')"><i class="fa-solid ${own ? 'fa-pen' : 'fa-eye'}"></i> ${own ? t('your_product') : t('details_btn')}</button>`;
  const discountBadge = p.discount ? `<span class="pc-discount">-${p.discount}%</span>` : '';
  return `
    <div class="agri-product-card" onclick="router.go('/product/${p.id}')">
      <div class="apc-media">
        ${img}
        ${pending ? `<span class="apc-badge">${t('on_moderation')}</span>` : ''}
        ${discountBadge}
        ${p.is_demo ? `<span class="apc-demo"><i class="fa-solid fa-circle-info"></i> ${t('demo_badge')}</span>` : ''}
        <span class="apc-cat-tag">${p.category || 'Продукция'}</span>
      </div>
      <div class="apc-body">
        <div class="apc-farmer"><i class="fa-solid fa-circle-check" style="color:#105C38"></i> ${p.fermer_name || 'Свежий урожай'}</div>
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
    if (typeof refreshCartBadges === 'function') refreshCartBadges();
  } catch (e) { showToast(e.message, 'error'); }
}

let debounceTimer;

async function renderCatalog() {
  const app = document.getElementById('app');
  const qs = new URLSearchParams((location.hash.split('?')[1] || ''));
  const presetCat = qs.get('cat') || '';
  const presetQ = qs.get('q') || '';

  app.innerHTML = pageShell(`
    <div class="mk">
      <div class="mk-head">
        <h1 class="page-title">${t('nav_market')}</h1>
        <form class="search-form big" role="search" onsubmit="event.preventDefault(); document.getElementById('search-input').blur()">
          <i class="fa-solid fa-magnifying-glass sf-ic"></i>
          <input type="search" id="search-input" placeholder="${t('search_ph')}" enterkeyhint="search" autocomplete="off" />
          ${voiceButtonHtml('search-input')}
        </form>
      </div>

      <div class="mk-chips" id="cat-tabs" role="group" aria-label="${t('cats_title')}">
        ${CATEGORY_OPTIONS.map(o => `
          <button class="mk-chip ${o.value === presetCat ? 'active' : ''}" data-val="${o.value}" onclick="setCatTab(this)" aria-pressed="${o.value === presetCat}">
            <i class="${o.icon}"></i><span>${o.value ? t(o.key) : t('cat_all')}</span>
          </button>
        `).join('')}
      </div>

      <div class="mk-tools">
        <details class="mk-price" id="mk-price">
          <summary><i class="fa-solid fa-sliders"></i> ${t('filters')}</summary>
          <div class="mk-price-body">
            <label class="mk-field"><span>${t('price_from')}</span><input type="number" inputmode="numeric" id="min-price" placeholder="0" /></label>
            <label class="mk-field"><span>${t('price_to')}</span><input type="number" inputmode="numeric" id="max-price" placeholder="∞" /></label>
            <button type="button" class="btn btn-outline btn-sm" onclick="resetCatalogFilters()">${t('reset')}</button>
          </div>
        </details>
        <label class="mk-sort">
          <i class="fa-solid fa-arrow-down-wide-short"></i>
          <select id="sort-select" aria-label="${t('sort_newest')}">
            ${SORT_OPTIONS.map(s => `<option value="${s.value}">${t(s.key)}</option>`).join('')}
          </select>
        </label>
      </div>

      <div class="mk-count" id="mk-count" aria-live="polite"></div>
      <div id="products-grid" class="agri-products-grid"><div class="spinner"></div></div>
    </div>
  `);

  const searchEl = document.getElementById('search-input');
  if (searchEl && presetQ) searchEl.value = presetQ;

  async function loadProducts() {
    const search    = searchEl?.value.trim() || '';
    const category  = document.querySelector('#cat-tabs .mk-chip.active')?.dataset.val || '';
    const min_price = document.getElementById('min-price')?.value || '';
    const max_price = document.getElementById('max-price')?.value || '';
    const sort      = document.getElementById('sort-select')?.value || 'newest';
    const grid  = document.getElementById('products-grid');
    const count = document.getElementById('mk-count');
    if (!grid) return;

    grid.innerHTML = '<div class="spinner"></div>';
    try {
      let products = await API.getProducts({ search, category, min_price, max_price });
      if (count) count.textContent = `${t('found_n')}: ${products?.length || 0}`;
      if (!products?.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-leaf" style="font-size:48px;color:var(--clr-primary)"></i><p>${t('no_products_found')}</p></div>`;
        return;
      }
      if (sort === 'price_asc') products.sort((a,b) => a.price - b.price);
      else if (sort === 'price_desc') products.sort((a,b) => b.price - a.price);
      else if (sort === 'rating') products.sort((a,b) => (b.rating||0) - (a.rating||0));
      grid.innerHTML = products.map(productCardHtml).join('');
    } catch (e) {
      if (count) count.textContent = '';
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation" style="font-size:48px;color:var(--clr-error)"></i><p>${e.message}</p></div>`;
    }
  }

  window.setCatTab = function(el) {
    document.querySelectorAll('#cat-tabs .mk-chip').forEach(c => { c.classList.remove('active'); c.setAttribute('aria-pressed', 'false'); });
    el.classList.add('active');
    el.setAttribute('aria-pressed', 'true');
    loadProducts();
  };

  window.resetCatalogFilters = function() {
    const all = document.querySelector('#cat-tabs .mk-chip[data-val=""]');
    if (all) window.setCatTab(all);
    if (searchEl) searchEl.value = '';
    document.getElementById('min-price').value = '';
    document.getElementById('max-price').value = '';
    loadProducts();
  };

  // если категория не задана — активна «Все»
  if (!document.querySelector('#cat-tabs .mk-chip.active')) {
    document.querySelector('#cat-tabs .mk-chip[data-val=""]')?.classList.add('active');
  }
  // выбранную категорию показываем на экране (лента листается вбок)
  const activeChip = document.querySelector('#cat-tabs .mk-chip.active');
  const chips = document.getElementById('cat-tabs');
  if (activeChip && chips && chips.scrollWidth > chips.clientWidth) {
    chips.scrollLeft = activeChip.offsetLeft - 16;
  }

  loadProducts();

  const onChange = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadProducts, 350); };
  searchEl?.addEventListener('input', onChange);
  document.getElementById('min-price')?.addEventListener('input', onChange);
  document.getElementById('max-price')?.addEventListener('input', onChange);
  document.getElementById('sort-select')?.addEventListener('change', loadProducts);
}

window.renderCatalog = renderCatalog;
window.productCardHtml = productCardHtml;
window.quickAddToCart = quickAddToCart;
window.starsHtml = starsHtml;
window.CAT_EMOJI = CAT_EMOJI;
