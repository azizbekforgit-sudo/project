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

/* Подписи: категория и единица хранятся по-русски, показываем на языке человека */
const UNIT_KEYS = { 'кг': 'unit_kg', 'kg': 'unit_kg', 'шт': 'unit_pcs', 'литр': 'unit_litre', 'ящик': 'unit_box',
  'мешок': 'unit_sack', 'пучок': 'unit_bunch', 'тонна': 'unit_ton', 'г': 'unit_gram' };
function unitLabel(u) {
  const k = UNIT_KEYS[String(u || 'кг').toLowerCase()];
  return k ? t(k).replace(/\s*\(.*\)$/, '') : escHtml(u || '');
}
function catLabel(v) {
  const o = CATEGORY_OPTIONS.find(c => c.value && c.value === v);
  return o ? t(o.key) : escHtml(v || '');
}
function fmtNum(n) { return Number(n || 0).toLocaleString('ru-RU'); }
function priceHtml(p) {
  return `${fmtNum(p.price)} <small>${t('currency')}/${unitLabel(p.unit)}</small>`;
}

function productCardHtml(p) {
  const me = Auth.getUser();
  const own = me && p.fermer_id === me.id;
  const canBuy = Auth.canBuy() && !own;
  const pending = p.status === 'pending';
  const icon = CAT_EMOJI[p.category] || 'fa-solid fa-leaf';
  const name = escHtml(p.name);
  const farmer = escHtml(p.fermer_name || t('pc_farmer'));
  return `
    <article class="pc2" tabindex="0" onclick="router.go('/product/${p.id}')" onkeydown="if(event.key==='Enter')router.go('/product/${p.id}')">
      <div class="pc2-media">
        <i class="${icon}" aria-hidden="true"></i>
        ${p.images?.length ? `<img src="${p.images[0]}" alt="${name}" loading="lazy" onerror="this.remove()" />` : ''}
        ${pending ? `<span class="pill wait pc2-flag">${t('on_moderation')}</span>` : ''}
      </div>
      <div class="pc2-body">
        <h3 class="pc2-name">${name}</h3>
        <div class="pc2-price">${priceHtml(p)}</div>
        <div class="pc2-meta"><i class="fa-solid fa-box-open"></i><span>${fmtNum(p.quantity)} ${unitLabel(p.unit)} ${t('pc_available')}</span></div>
        ${p.pickup_location ? `<div class="pc2-meta"><i class="fa-solid fa-location-dot"></i><span>${escHtml(p.pickup_location)}</span></div>` : ''}
        <div class="pc2-farmer"><span class="pc2-fava">${farmer[0] || 'F'}</span><span>${farmer}</span></div>
        ${canBuy ? `<button class="btn btn-outline btn-sm pc2-btn" onclick="event.stopPropagation(); quickAddToCart(${p.id})"><i class="fa-solid fa-basket-shopping"></i> ${t('add_to_cart')}</button>` : ''}
        ${own ? `<div class="pc2-own"><i class="fa-solid fa-seedling"></i> ${t('pc_your')}</div>` : ''}
      </div>
    </article>`;
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
    <div class="mk2">
      <h1 class="v3-h1" style="margin-bottom:16px">${t('mk_title')}</h1>
      <form class="mk2-search" role="search" onsubmit="event.preventDefault(); document.getElementById('search-input').blur(); mkReload()">
        <div class="search-form">
          <i class="fa-solid fa-magnifying-glass sf-ic"></i>
          <input type="search" id="search-input" placeholder="${t('mk_search_ph')}" enterkeyhint="search" autocomplete="off" />
          ${voiceButtonHtml('search-input')}
        </div>
        <button type="submit" class="btn btn-primary mk2-go" aria-label="${t('search_btn')}"><i class="fa-solid fa-magnifying-glass"></i></button>
        <button type="button" class="btn btn-outline mk2-filter-btn" onclick="document.getElementById('mk2-filters').classList.toggle('open')"><i class="fa-solid fa-sliders"></i> ${t('mk_show_filters')}</button>
      </form>
      <div class="mk2-active" id="mk2-active" aria-live="polite"></div>

      <div class="mk2-layout">
        <aside class="v3-card mk2-filters" id="mk2-filters" aria-label="${t('mk_filters')}">
          <h2>${t('mk_filters')}</h2>
          <label class="mk2-field"><span>${t('mk_category')}</span>
            <select id="cat-select">
              ${CATEGORY_OPTIONS.map(o => `<option value="${o.value}" ${o.value === presetCat ? 'selected' : ''}>${t(o.key)}</option>`).join('')}
            </select>
          </label>
          <div class="mk2-field"><span>${t('mk_price')} <small style="font-weight:500;color:var(--ink-3)">(${t('currency')})</small></span>
            <div class="mk2-range">
              <input type="number" inputmode="numeric" id="min-price" placeholder="${t('price_from')}" aria-label="${t('price_from')}" />
              <span>—</span>
              <input type="number" inputmode="numeric" id="max-price" placeholder="${t('price_to')}" aria-label="${t('price_to')}" />
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-full" onclick="mkReload(); document.getElementById('mk2-filters').classList.remove('open')">${t('mk_apply')}</button>
        </aside>

        <section class="mk2-results">
          <div class="mk2-results-head">
            <h2 id="mk-count">${t('mk_results')}</h2>
            <select id="sort-select" aria-label="${t('mk_sort')}">
              ${SORT_OPTIONS.map(s => `<option value="${s.value}">${t(s.key)}</option>`).join('')}
            </select>
          </div>
          <div id="products-grid" class="agri-products-grid"><div class="spinner"></div></div>
        </section>
      </div>
    </div>
  `);

  const searchEl = document.getElementById('search-input');
  const catEl = document.getElementById('cat-select');
  const minEl = document.getElementById('min-price');
  const maxEl = document.getElementById('max-price');
  if (searchEl && presetQ) searchEl.value = presetQ;

  function renderActive() {
    const box = document.getElementById('mk2-active');
    if (!box) return;
    const tags = [];
    if (searchEl.value.trim()) tags.push(['q', `«${escHtml(searchEl.value.trim())}»`]);
    if (catEl.value) tags.push(['cat', catLabel(catEl.value)]);
    if (minEl.value || maxEl.value) tags.push(['price', `${minEl.value ? fmtNum(minEl.value) : '0'} – ${maxEl.value ? fmtNum(maxEl.value) : '∞'} ${t('currency')}`]);
    box.innerHTML = tags.map(([k, label]) => `<span class="mk2-tag">${label}<button type="button" onclick="mkDropFilter('${k}')" aria-label="${t('reset')}"><i class="fa-solid fa-xmark"></i></button></span>`).join('')
      + (tags.length ? `<button type="button" class="mk2-clear" onclick="resetCatalogFilters()">${t('mk_clear')}</button>` : '');
  }

  async function loadProducts() {
    const search    = searchEl?.value.trim() || '';
    const category  = catEl?.value || '';
    const min_price = minEl?.value || '';
    const max_price = maxEl?.value || '';
    const sort      = document.getElementById('sort-select')?.value || 'newest';
    const grid  = document.getElementById('products-grid');
    const count = document.getElementById('mk-count');
    if (!grid) return;
    renderActive();

    grid.innerHTML = '<div class="spinner"></div>';
    try {
      let products = await API.getProducts({ search, category, min_price, max_price });
      if (count) count.innerHTML = `${t('mk_results')} <small>(${products?.length || 0}${t('mk_pcs') ? ' ' + t('mk_pcs') : ''})</small>`;
      if (!products?.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-leaf" style="font-size:48px;color:var(--field)"></i><p>${t('no_products_found')}</p></div>`;
        return;
      }
      if (sort === 'price_asc') products.sort((a,b) => a.price - b.price);
      else if (sort === 'price_desc') products.sort((a,b) => b.price - a.price);
      else if (sort === 'rating') products.sort((a,b) => (b.rating||0) - (a.rating||0));
      grid.innerHTML = products.map(productCardHtml).join('');
    } catch (e) {
      if (count) count.textContent = t('mk_results');
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fa-solid fa-triangle-exclamation" style="font-size:48px;color:var(--danger)"></i><p>${escHtml(e.message)}</p></div>`;
    }
  }

  window.mkReload = loadProducts;
  window.mkDropFilter = function(k) {
    if (k === 'q') searchEl.value = '';
    if (k === 'cat') catEl.value = '';
    if (k === 'price') { minEl.value = ''; maxEl.value = ''; }
    loadProducts();
  };
  window.resetCatalogFilters = function() {
    searchEl.value = ''; catEl.value = ''; minEl.value = ''; maxEl.value = '';
    loadProducts();
  };

  loadProducts();

  const onChange = () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(loadProducts, 400); };
  searchEl?.addEventListener('input', onChange);
  catEl?.addEventListener('change', loadProducts);
  document.getElementById('sort-select')?.addEventListener('change', loadProducts);
  // на ПК цена применяется сама; на телефоне — кнопкой «Показать» (панель закрывается)
  if (matchMedia('(min-width: 993px)').matches) {
    minEl?.addEventListener('input', onChange);
    maxEl?.addEventListener('input', onChange);
  }
}

window.renderCatalog = renderCatalog;
window.productCardHtml = productCardHtml;
window.quickAddToCart = quickAddToCart;
window.starsHtml = starsHtml;
window.CAT_EMOJI = CAT_EMOJI;
window.unitLabel = unitLabel;
window.catLabel = catLabel;
window.fmtNum = fmtNum;
window.priceHtml = priceHtml;
