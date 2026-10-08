/* pages/profile.js — «Паспорт фермера»: обложка-поле, кольцо роста, цифры,
   быстрые действия, мои товары, настройки. Все правки — в нижней шторке. */

const ROLE_LABELS = {
  fermer: () => t('role_farmer'),
  xaridor: () => t('role_buyer'),
  admin: () => t('role_admin'),
  courier: () => t('role_user'),
};
const CAT_EMOJI_PROF = {
  'Овощи': 'fa-solid fa-carrot', 'Фрукты': 'fa-solid fa-apple-whole', 'Зелень': 'fa-solid fa-leaf',
  'Зерновые': 'fa-solid fa-wheat-awn', 'Молочные': 'fa-solid fa-bottle-droplet', 'Мёд': 'fa-solid fa-jar',
  'Бахчевые': 'fa-solid fa-lemon', 'Саженцы': 'fa-solid fa-tree', 'Семена': 'fa-solid fa-seedling',
};

/* Уровни по бонусным баллам: росток → колос → хозяин урожая */
const PR_LEVELS = [
  { min: 0,   key: 'lvl_1', icon: 'fa-solid fa-seedling' },
  { min: 50,  key: 'lvl_2', icon: 'fa-solid fa-wheat-awn' },
  { min: 200, key: 'lvl_3', icon: 'fa-solid fa-tractor' },
];
function prLevel(points) {
  const p = Number(points) || 0;
  let i = 0;
  PR_LEVELS.forEach((l, idx) => { if (p >= l.min) i = idx; });
  const cur = PR_LEVELS[i], next = PR_LEVELS[i + 1];
  const pct = next ? Math.min(100, Math.round((p - cur.min) / (next.min - cur.min) * 100)) : 100;
  return { ...cur, next, pct, toNext: next ? next.min - p : 0 };
}

function prRing(pct) {
  const r = 58, c = 2 * Math.PI * r;
  return `<svg class="pr-ring" viewBox="0 0 132 132" aria-hidden="true">
    <circle cx="66" cy="66" r="${r}" class="pr-ring-bg"/>
    <circle cx="66" cy="66" r="${r}" class="pr-ring-fg" style="stroke-dasharray:${c};stroke-dashoffset:${c}" data-off="${c * (1 - pct / 100)}"/>
  </svg>`;
}

function prCountUp() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = Number(el.dataset.count) || 0;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) { el.textContent = target.toLocaleString('ru-RU'); return; }
    const start = performance.now();
    const step = now => {
      const k = Math.min((now - start) / 900, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString('ru-RU');
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
  requestAnimationFrame(() => document.querySelectorAll('.pr-ring-fg').forEach(c => { c.style.strokeDashoffset = c.dataset.off; }));
}

async function renderProfile() {
  const app = document.getElementById('app');
  let user = Auth.getUser() || {};
  const isFarmer = user.role === 'fermer';

  app.innerHTML = pageShell(`<div class="pr2" id="pr2"><div class="spinner"></div></div>`);

  // свежие данные: профиль, заказы, товары (параллельно)
  const [me, orders, mine] = await Promise.all([
    API.getMe().catch(() => null),
    API.getMyOrders().catch(() => []),
    isFarmer ? API.getMyProducts().then(r => r.products || []).catch(() => []) : Promise.resolve([]),
  ]);
  if (me) { user = { ...user, ...me }; Auth.setUser(user); }

  const sales = (orders || []).filter(o => o.my_role === 'seller');
  const buys = (orders || []).filter(o => o.my_role !== 'seller');
  const open = ['created', 'paid', 'ready_for_pickup', 'ready'];
  const newSales = sales.filter(o => open.includes(o.status)).length;
  const sold = sales.filter(o => o.status === 'completed');
  const earned = sold.reduce((s, o) => s + Number(o.total_price || 0), 0);
  const lvl = prLevel(user.bonus_points);
  const roleLabel = (ROLE_LABELS[user.role] || ROLE_LABELS.courier)();
  const initials = (user.name || user.phone || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const phone = typeof fmtPhone === 'function' ? fmtPhone(user.phone) : user.phone;

  const stats = isFarmer ? [
    { n: mine.length, label: t('pr_st_products'), icon: 'fa-solid fa-store' },
    { n: sold.length, label: t('pr_st_sold'), icon: 'fa-solid fa-handshake' },
    { n: Math.round(earned), label: t('pr_st_earned'), icon: 'fa-solid fa-sack-dollar', sum: true },
    { n: user.bonus_points || 0, label: t('pr_st_bonus'), icon: 'fa-solid fa-star' },
  ] : [
    { n: buys.length, label: t('pr_st_orders'), icon: 'fa-solid fa-box' },
    { n: buys.filter(o => o.status === 'completed').length, label: t('pr_st_bought'), icon: 'fa-solid fa-circle-check' },
    { n: getCartCount(), label: t('pr_st_cart'), icon: 'fa-solid fa-basket-shopping' },
    { n: user.bonus_points || 0, label: t('pr_st_bonus'), icon: 'fa-solid fa-star' },
  ];

  const actions = [
    ...(isFarmer ? [{ go: '/product/new', icon: 'fa-solid fa-plus', key: 'act_sell', main: true }] : []),
    { go: '/orders' + (isFarmer ? '?tab=sales' : ''), icon: 'fa-solid fa-box', key: 'nav_orders', badge: newSales },
    { go: '/market', icon: 'fa-solid fa-store', key: 'nav_market' },
    { go: '/cart', icon: 'fa-solid fa-basket-shopping', key: 'nav_cart', badge: getCartCount() },
    { go: '/wallet', icon: 'fa-solid fa-wallet', key: 'nav_wallet' },
    ...(isFarmer ? [{ go: '/tariffs', icon: 'fa-solid fa-medal', key: 'nav_tariffs' }] : [{ go: '/ai', icon: 'fa-solid fa-robot', key: 'nav_ai' }]),
  ];

  document.getElementById('pr2').innerHTML = `
    <section class="pr2-hero">
      <div class="pr2-cover" aria-hidden="true">${typeof fieldSceneSvg === 'function' ? fieldSceneSvg() : ''}</div>
      <div class="pr2-id">
        <div class="pr2-ava-wrap" title="${t(lvl.key)}">
          ${prRing(lvl.pct)}
          <div class="pr2-ava">${escHtml(initials)}</div>
          <span class="pr2-lvl-ic"><i class="${lvl.icon}"></i></span>
        </div>
        <div class="pr2-who">
          <span class="pr2-role"><i class="fa-solid ${isFarmer ? 'fa-seedling' : 'fa-basket-shopping'}"></i> ${roleLabel}</span>
          <h1 class="pr2-name">${escHtml(user.name || '')}</h1>
          <div class="pr2-meta">
            ${phone ? `<span><i class="fa-solid fa-phone"></i> ${phone}</span>` : ''}
            ${user.city ? `<span><i class="fa-solid fa-location-dot"></i> ${escHtml(user.city)}</span>` : `<button class="pr2-add-city" onclick="openProfileEdit('city')"><i class="fa-solid fa-plus"></i> ${t('pr_add_city')}</button>`}
          </div>
        </div>
        <button class="btn btn-outline pr2-edit" onclick="openProfileEdit('name')"><i class="fa-solid fa-pen"></i> ${t('pr_edit')}</button>
      </div>
      <div class="pr2-level">
        <div class="pr2-level-top">
          <b><i class="${lvl.icon}"></i> ${t(lvl.key)}</b>
          <span>${lvl.next ? `${t('pr_to_next')} «${t(lvl.next.key)}»: ${lvl.toNext} ${t('pr_points')}` : t('pr_top_level')}</span>
        </div>
        <div class="pr2-bar"><i style="width:${lvl.pct}%"></i></div>
        <small>${isFarmer ? t('pr_level_how_f') : t('pr_level_how_b')}</small>
      </div>
    </section>

    <section class="pr2-stats">
      ${stats.map(s => `
        <div class="pr2-stat">
          <i class="${s.icon}"></i>
          <b><span data-count="${s.n}">0</span>${s.sum ? ` <small>${t('currency') || 'сум'}</small>` : ''}</b>
          <span>${s.label}</span>
        </div>`).join('')}
    </section>

    ${isFarmer && newSales ? `
      <button class="pr2-alert" onclick="router.go('/orders?tab=sales')">
        <span class="pr2-alert-ic"><i class="fa-solid fa-bell"></i><em>${newSales}</em></span>
        <span><b>${t('pr_new_orders')}</b><small>${t('pr_new_orders_d')}</small></span>
        <i class="fa-solid fa-chevron-right"></i>
      </button>` : ''}

    <section class="pr2-actions">
      ${actions.map(a => `
        <button class="pr2-act ${a.main ? 'main' : ''}" onclick="router.go('${a.go}')">
          <span class="pr2-act-ic"><i class="${a.icon}"></i>${a.badge ? `<em>${a.badge}</em>` : ''}</span>
          <span>${t(a.key)}</span>
        </button>`).join('')}
    </section>

    ${isFarmer ? `
    <section class="pr2-sec">
      <div class="fh-head">
        <h2 class="fh-h2">${t('my_products')} <span class="pr2-count">${mine.length}</span></h2>
        <button class="btn btn-primary" onclick="router.go('/product/new')"><i class="fa-solid fa-plus"></i> ${t('add_btn')}</button>
      </div>
      <div id="pr-products-list">${prProductsHtml(mine)}</div>
    </section>` : ''}

    <section class="pr2-sec">
      <h2 class="fh-h2">${t('settings_label')}</h2>
      <div class="pr2-settings">
        ${prRow('fa-solid fa-user', t('field_name'), escHtml(user.name || '—'), `openProfileEdit('name')`)}
        ${prRow('fa-solid fa-location-dot', t('pr_city'), escHtml(user.city || '—'), `openProfileEdit('city')`)}
        ${prRow('fa-solid fa-envelope', 'Email', escHtml(user.email || '—'), `openProfileEdit('email')`)}
        ${prRow('fa-solid fa-phone', t('auth_phone'), phone || '—', null, t('phone_locked'))}
        ${prRow('fa-solid fa-globe', t('choose_lang'), (I18nManager.langs().find(l => l.code === I18nManager.current) || {}).label || '', `openLangSheet()`)}
        ${prRow('fa-solid fa-text-height', t('choose_size'), t({ m: 'size_m', l: 'size_l', xl: 'size_xl' }[TextSize.get()]), `openSizeSheet()`)}
        ${prRow('fa-solid fa-key', t('pr_password'), '••••••', `openChangePassword()`)}
      </div>
      <button class="menu-logout" onclick="Auth.logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('logout')}</button>
    </section>
  `;
  prCountUp();
}

function prRow(icon, label, value, action, lockedText) {
  return `
    <${action ? 'button' : 'div'} class="pr2-row" ${action ? `onclick="${action}"` : ''}>
      <span class="menu-ic"><i class="${icon}"></i></span>
      <span class="menu-tx"><small>${label}</small><b>${value}</b></span>
      ${action ? `<span class="pr2-row-go">${t('field_edit')} <i class="fa-solid fa-chevron-right"></i></span>` : `<span class="pr2-row-lock"><i class="fa-solid fa-lock"></i> ${lockedText || ''}</span>`}
    </${action ? 'button' : 'div'}>`;
}

function prProductsHtml(list) {
  if (!list.length) {
    return `<div class="od-empty"><i class="fa-solid fa-seedling"></i><p>${t('pr_no_products')}</p>
      <button class="btn btn-primary btn-lg" onclick="router.go('/product/new')"><i class="fa-solid fa-plus"></i> ${t('act_sell')}</button></div>`;
  }
  return `<div class="pr2-products">${list.map(p => {
    const img = p.images?.[0];
    const out = Number(p.quantity) <= 0;
    return `
      <article class="pr2-prod ${out ? 'out' : ''}">
        <div class="pr2-prod-img" onclick="router.go('/product/${p.id}')">
          <i class="${CAT_EMOJI_PROF[p.category] || 'fa-solid fa-leaf'}"></i>
          ${img ? `<img src="${img}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
          <span class="pr2-prod-state">${out ? t('pr_out') : t('pr_on_sale')}</span>
        </div>
        <div class="pr2-prod-body">
          <b>${escHtml(p.name)}</b>
          <div class="pr2-prod-price">${Number(p.price).toLocaleString('ru-RU')} <small>${t('currency') || 'сум'} / ${escHtml(p.unit || '')}</small></div>
          <div class="pr2-prod-left">${t('pr_left')}: <b>${Number(p.quantity).toLocaleString('ru-RU')} ${escHtml(p.unit || '')}</b></div>
          <div class="pr2-prod-btns">
            <button class="btn btn-outline btn-sm" onclick="openProductEdit(${p.id})"><i class="fa-solid fa-pen"></i> ${t('field_edit')}</button>
            <button class="btn btn-reject-o btn-sm" onclick="deleteMyProduct(${p.id}, this)" data-name="${escHtml(p.name)}" aria-label="${t('pr_delete')}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </article>`;
  }).join('')}</div>`;
}

async function loadFarmerProducts() {
  const box = document.getElementById('pr-products-list');
  if (!box) return;
  try {
    const r = await API.getMyProducts();
    box.innerHTML = prProductsHtml(r.products || []);
  } catch (e) { box.innerHTML = `<p>${e.message}</p>`; }
}

/* Удаление товара — с подтверждением в шторке */
function deleteMyProduct(id, btn) {
  const name = typeof btn === 'string' ? btn : (btn?.dataset.name || '');
  confirmSheet(t('pr_delete_q'), `«${escHtml(name)}» ${t('pr_delete_text')}`, `<i class="fa-solid fa-trash"></i> ${t('pr_delete')}`, 'btn-danger', async () => {
    try {
      await API.deleteProduct(id);
      showToast(t('pr_deleted'), 'success');
      renderProfile();
    } catch (e) { if (e.message !== 'BLOCKED') showToast(e.message, 'error'); }
  });
}

/* Редактирование товара. API.getProduct отдаёт товар в виде name/price/quantity */
async function openProductEdit(id) {
  let p;
  try { p = await API.getProduct(id); } catch (e) { return showToast(e.message, 'error'); }
  const units = ['кг', 'шт', 'литр', 'ящик', 'мешок', 'пучок', 'тонна', 'г'];
  openSheet('pedit', t('pr_edit_product'), `
    <div class="auth2-form">
      <label class="auth2-field"><span>${t('pn_name')}</span><input type="text" id="pe-title" class="pn-input" maxlength="120" value="${escHtml(p.name)}" /></label>
      <div class="pe-row">
        <label class="auth2-field"><span>${t('pn_price')}</span><input type="number" inputmode="decimal" id="pe-price" class="pn-input" value="${Number(p.price)}" /></label>
        <label class="auth2-field"><span>${t('pn_unit')}</span><select id="pe-unit" class="pn-input">${units.map(u => `<option ${u === p.unit ? 'selected' : ''}>${u}</option>`).join('')}</select></label>
      </div>
      <label class="auth2-field"><span>${t('pr_left')}</span><input type="number" inputmode="decimal" id="pe-qty" class="pn-input" value="${Number(p.quantity)}" step="any" /></label>
      <label class="auth2-field"><span>${t('pn_desc')}</span><textarea id="pe-desc" class="pn-input" maxlength="500">${escHtml(p.description || '')}</textarea></label>
      <label class="pn-check"><input type="checkbox" id="pe-delivery" ${p.delivery_available ? 'checked' : ''} /><span><b>${t('pn_delivery')}</b><small>${t('pn_delivery_hint')}</small></span></label>
      <div id="pe-error" class="auth2-note err" hidden></div>
      <button class="btn btn-primary btn-lg btn-full" id="pe-save"><i class="fa-solid fa-check"></i> ${t('pr_save')}</button>
    </div>`);
  document.getElementById('pe-save').onclick = async () => {
    const err = document.getElementById('pe-error');
    const title = document.getElementById('pe-title').value.trim();
    const price = parseFloat(document.getElementById('pe-price').value);
    const qty = parseFloat(document.getElementById('pe-qty').value);
    if (!title || !(price > 0) || !(qty >= 0)) { err.textContent = t('pn_fill_required'); err.hidden = false; return; }
    try {
      await API.updateProduct(id, {
        title, price_per_unit: price, quantity_available: qty,
        unit: document.getElementById('pe-unit').value,
        description: document.getElementById('pe-desc').value.trim(),
        delivery_available: document.getElementById('pe-delivery').checked,
      });
      closeSheet();
      showToast(t('pr_saved'), 'success');
      loadFarmerProducts();
    } catch (e) { err.textContent = e.message; err.hidden = false; }
  };
}

/* Имя, город, email */
function openProfileEdit(field) {
  const user = Auth.getUser() || {};
  const cfg = {
    name:  { label: t('field_name'), type: 'text',  ph: t('auth_name_ph') },
    city:  { label: t('pr_city'),    type: 'text',  ph: t('pr_city_ph') },
    email: { label: 'Email',         type: 'email', ph: 'email@example.com' },
  }[field];
  if (!cfg) return;
  openSheet('pf', cfg.label, `
    <div class="auth2-form">
      <label class="auth2-field"><span>${cfg.label}</span>
        <input type="${cfg.type}" id="pf-val" class="pn-input" value="${escHtml(user[field] || '')}" placeholder="${cfg.ph}" /></label>
      <div id="pf-error" class="auth2-note err" hidden></div>
      <button class="btn btn-primary btn-lg btn-full" id="pf-save"><i class="fa-solid fa-check"></i> ${t('pr_save')}</button>
    </div>`);
  setTimeout(() => document.getElementById('pf-val')?.focus(), 80);
  document.getElementById('pf-save').onclick = async () => {
    const val = document.getElementById('pf-val').value.trim();
    const err = document.getElementById('pf-error');
    if (!val && field === 'name') { err.textContent = t('auth_name_short'); err.hidden = false; return; }
    try {
      const updated = await API.updateProfile({ [field]: val });
      delete updated.plain_password;
      Auth.setUser({ ...user, ...updated });
      closeSheet();
      showToast(t('pr_saved'), 'success');
      renderProfile();
    } catch (e) { err.textContent = e.message; err.hidden = false; }
  };
}

function openChangePassword() {
  openSheet('pw', t('pr_password'), `
    <div class="auth2-form">
      <label class="auth2-field"><span>${t('pr_pw_current')}</span>${passwordFieldHtml('cp-current', '••••••', 'current-password')}</label>
      <label class="auth2-field"><span>${t('pr_pw_new')}</span>${passwordFieldHtml('cp-new', t('auth_pass_ph'), 'new-password')}</label>
      <div id="cp-error" class="auth2-note err" hidden></div>
      <button class="btn btn-primary btn-lg btn-full" id="cp-save"><i class="fa-solid fa-key"></i> ${t('pr_save')}</button>
    </div>`);
  document.getElementById('cp-save').onclick = async () => {
    const cur = document.getElementById('cp-current').value;
    const nw = document.getElementById('cp-new').value;
    const err = document.getElementById('cp-error');
    if (nw.length < 6) { err.textContent = t('auth_pass_short'); err.hidden = false; return; }
    try {
      await API.changePassword({ current_password: cur, new_password: nw });
      closeSheet();
      showToast(t('pr_pw_changed'), 'success');
    } catch (e) { err.textContent = e.message; err.hidden = false; }
  };
}

/* Совместимость со старыми вызовами */
function switchProfileTab() { renderProfile(); }
function togglePasswordVisibility() {}
function loadFarmerOrders() { router.go('/orders?tab=sales'); }

window.renderProfile = renderProfile;
window.switchProfileTab = switchProfileTab;
window.openProfileEdit = openProfileEdit;
window.openProductEdit = openProductEdit;
window.deleteMyProduct = deleteMyProduct;
window.togglePasswordVisibility = togglePasswordVisibility;
window.openChangePassword = openChangePassword;
window.loadFarmerOrders = loadFarmerOrders;
