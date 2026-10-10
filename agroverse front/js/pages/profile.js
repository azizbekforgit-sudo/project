/* pages/profile.js — кабинет: меню слева (обзор, объявления, сообщения, заказы, профиль),
   цифры, таблица объявлений, уровень, настройки. Все правки — в нижней шторке. */

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

async function renderProfile() {
  const app = document.getElementById('app');
  let user = Auth.getUser() || {};
  const isFarmer = user.role === 'fermer';
  const qs = new URLSearchParams(location.hash.split('?')[1] || '');
  const tab = ['overview', 'listings', 'profile'].includes(qs.get('tab')) ? qs.get('tab') : 'overview';

  app.innerHTML = pageShell(`<div id="pr2"><div class="spinner"></div></div>`);

  // свежие данные: профиль, заказы, товары, переписки (параллельно)
  const [me, orders, mine, chats] = await Promise.all([
    API.getMe().catch(() => null),
    API.getMyOrders().catch(() => []),
    isFarmer ? API.getMyProducts().then(r => r.products || []).catch(() => []) : Promise.resolve([]),
    API.getChats().catch(() => []),
  ]);
  if (me) { user = { ...user, ...me }; Auth.setUser(user); }

  const sales = (orders || []).filter(o => o.my_role === 'seller');
  const buys = (orders || []).filter(o => o.my_role !== 'seller');
  const open = ['created', 'paid', 'ready_for_pickup', 'ready'];
  const newSales = sales.filter(o => open.includes(o.status)).length;
  const unreadChats = (chats || []).reduce((n, c) => n + (c.unread_count || 0), 0);
  const active = mine.filter(p => p.status === 'active' && Number(p.quantity) > 0);
  const lvl = prLevel(user.bonus_points);
  const roleLabel = (ROLE_LABELS[user.role] || ROLE_LABELS.courier)();
  const initials = (user.name || user.phone || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const phone = typeof fmtPhone === 'function' ? fmtPhone(user.phone) : user.phone;

  const stat = (icon, label, n, go) => `
    <button class="v3-card cb-stat" onclick="${go}">
      <span class="cb-stat-ic"><i class="${icon}"></i></span>
      <span><small>${label}</small><b>${fmtNum(n)}</b></span>
    </button>`;
  const stats = isFarmer
    ? stat('fa-solid fa-store', t('cb_active'), active.length, `prTab('listings')`)
      + stat('fa-solid fa-comment-dots', t('cb_new_msgs'), unreadChats, `router.go('/chats')`)
      + stat('fa-solid fa-box', t('cb_new_orders'), newSales, `router.go('/orders?tab=sales')`)
    : stat('fa-solid fa-box', t('cb_my_orders'), buys.length, `router.go('/orders')`)
      + stat('fa-solid fa-comment-dots', t('cb_new_msgs'), unreadChats, `router.go('/chats')`)
      + stat('fa-solid fa-basket-shopping', t('pr_st_cart'), getCartCount(), `router.go('/cart')`);

  const nav = (key, icon, label, badge) => `
    <button class="cb-nav ${tab === key ? 'active' : ''}" data-tab="${key}" onclick="prTab('${key}')">
      <i class="${icon}"></i><span>${label}</span>${badge ? `<em>${badge}</em>` : ''}
    </button>`;

  const listingsHead = `
    <div class="v3-head">
      <h2 class="v3-h2">${t(isFarmer ? 'cb_active' : 'my_products')} <span class="pr2-count">${mine.length}</span></h2>
      <button class="btn btn-primary" onclick="router.go('/product/new')"><i class="fa-solid fa-plus"></i> ${t('cb_new_listing')}</button>
    </div>`;

  document.getElementById('pr2').innerHTML = `
    <div class="cb">
      <aside class="v3-card cb-side">
        <div class="cb-me">
          <span class="cb-ava">${escHtml(initials)}</span>
          <span style="min-width:0"><b>${escHtml(user.name || '')}</b><small>${roleLabel}</small></span>
        </div>
        ${nav('overview', 'fa-solid fa-house', t('cb_overview'))}
        ${isFarmer ? nav('listings', 'fa-solid fa-list', t('cb_listings')) : ''}
        <button class="cb-nav" onclick="router.go('/chats')"><i class="fa-solid fa-comment-dots"></i><span>${t('cb_inquiries')}</span>${unreadChats ? `<em>${unreadChats}</em>` : ''}</button>
        <button class="cb-nav" onclick="router.go('/orders${isFarmer ? '?tab=sales' : ''}')"><i class="fa-solid fa-box"></i><span>${t('nav_orders')}</span>${newSales ? `<em>${newSales}</em>` : ''}</button>
        ${nav('profile', 'fa-solid fa-user', t('cb_profile'))}
      </aside>

      <div class="cb-main">
        <h1 class="v3-h1">${t(isFarmer ? 'cb_title_f' : 'cb_title_b')}</h1>

        <section class="cb-tab" data-tab="overview" ${tab === 'overview' ? '' : 'hidden'}>
          <div class="cb-main">
            <div class="cb-stats">${stats}</div>
            ${isFarmer ? `${listingsHead}<div id="pr-products-list">${prProductsHtml(mine.slice(0, 5))}</div>
              ${mine.length > 5 ? `<a class="v3-more" onclick="prTab('listings')">${t('see_all')} <i class="fa-solid fa-arrow-right"></i></a>` : ''}` : `
              <div class="pr2-actions">
                ${[['/market', 'fa-solid fa-store', 'nav_market'], ['/cart', 'fa-solid fa-basket-shopping', 'nav_cart'], ['/wallet', 'fa-solid fa-wallet', 'nav_wallet'], ['/ai', 'fa-solid fa-robot', 'nav_ai']]
                  .map(([go, ic, k]) => `<button class="pr2-act" onclick="router.go('${go}')"><span class="pr2-act-ic"><i class="${ic}"></i></span><span>${t(k)}</span></button>`).join('')}
              </div>`}
            <div class="v3-card cb-level">
              <div class="cb-level-top">
                <b><i class="${lvl.icon}"></i> ${t('cb_level')}: ${t(lvl.key)}</b>
                <span>${lvl.next ? `${t('pr_to_next')} «${t(lvl.next.key)}»: ${lvl.toNext} ${t('pr_points')}` : t('pr_top_level')}</span>
              </div>
              <div class="cb-bar"><i style="width:${lvl.pct}%"></i></div>
              <small>${isFarmer ? t('pr_level_how_f') : t('pr_level_how_b')}</small>
            </div>
          </div>
        </section>

        ${isFarmer ? `
        <section class="cb-tab" data-tab="listings" ${tab === 'listings' ? '' : 'hidden'}>
          <div class="cb-main">
            ${listingsHead}
            <div id="pr-products-all">${prProductsHtml(mine)}</div>
          </div>
        </section>` : ''}

        <section class="cb-tab" data-tab="profile" ${tab === 'profile' ? '' : 'hidden'}>
          <div class="cb-main">
            <div class="pr2-settings">
              ${prRow('fa-solid fa-user', t('field_name'), escHtml(user.name || '—'), `openProfileEdit('name')`)}
              ${prRow('fa-solid fa-location-dot', t('pr_city'), escHtml(user.city || '—'), `openProfileEdit('city')`)}
              ${prRow('fa-solid fa-envelope', 'Email', escHtml(user.email || '—'), `openProfileEdit('email')`)}
              ${prRow('fa-solid fa-phone', t('auth_phone'), phone || '—', null, t('phone_locked'))}
              ${prRow('fa-solid fa-globe', t('choose_lang'), (I18nManager.langs().find(l => l.code === I18nManager.current) || {}).label || '', `openLangSheet()`)}
              ${prRow('fa-solid fa-text-height', t('choose_size'), t({ m: 'size_m', l: 'size_l', xl: 'size_xl' }[TextSize.get()]), `openSizeSheet()`)}
              ${prRow('fa-solid fa-circle-half-stroke', t('theme_title'), t(Theme.get() === 'dark' ? 'theme_dark' : 'theme_light'), `Theme.toggle(); renderProfile()`)}
              ${prRow('fa-solid fa-key', t('pr_password'), '••••••', `openChangePassword()`)}
              ${prRow('fa-brands fa-telegram', t('fb_title'), t('fb_hint'), `window.open(SOCIAL.feedback, '_blank', 'noopener')`)}
            </div>
            <button class="menu-logout" onclick="Auth.logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('logout')}</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

/* Переключение разделов кабинета без перезагрузки; вкладка — в адресе */
function prTab(key) {
  document.querySelectorAll('.cb-tab').forEach(s => { s.hidden = s.dataset.tab !== key; });
  document.querySelectorAll('.cb-nav[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === key));
  history.replaceState(null, '', '#/profile' + (key === 'overview' ? '' : '?tab=' + key));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.prTab = prTab;

function prRow(icon, label, value, action, lockedText) {
  return `
    <${action ? 'button' : 'div'} class="pr2-row" ${action ? `onclick="${action}"` : ''}>
      <span class="menu-ic"><i class="${icon}"></i></span>
      <span class="menu-tx"><small>${label}</small><b>${value}</b></span>
      ${action ? `<span class="pr2-row-go">${t('field_edit')} <i class="fa-solid fa-chevron-right"></i></span>` : `<span class="pr2-row-lock"><i class="fa-solid fa-lock"></i> ${lockedText || ''}</span>`}
    </${action ? 'button' : 'div'}>`;
}

/* Мои объявления: таблица на ПК, карточки на телефоне */
function prState(p) {
  if (p.status === 'pending') return `<span class="pill wait">${t('cb_st_pending')}</span>`;
  if (p.status === 'rejected') return `<span class="pill bad">${t('cb_st_rejected')}</span>`;
  if (Number(p.quantity) <= 0) return `<span class="pill off">${t('cb_st_out')}</span>`;
  return `<span class="pill ok">${t('cb_st_active')}</span>`;
}

function prProductsHtml(list) {
  if (!list.length) {
    return `<div class="od-empty"><i class="fa-solid fa-seedling"></i><p>${t('pr_no_products')}</p>
      <button class="btn btn-primary btn-lg" onclick="router.go('/product/new')"><i class="fa-solid fa-plus"></i> ${t('act_sell')}</button></div>`;
  }
  const img = p => `<span class="cb-prod-img"><i class="${CAT_EMOJI_PROF[p.category] || 'fa-solid fa-leaf'}"></i>${p.images?.[0] ? `<img src="${p.images[0]}" alt="" loading="lazy" onerror="this.remove()" />` : ''}</span>`;
  const acts = p => `
    <div class="cb-acts">
      <button class="btn btn-outline btn-sm" onclick="openProductEdit(${p.id})"><i class="fa-solid fa-pen"></i> ${t('cb_edit')}</button>
      <button class="cb-del" onclick="deleteMyProduct(${p.id}, this)" data-name="${escHtml(p.name)}" aria-label="${t('pr_delete')}" title="${t('pr_delete')}"><i class="fa-solid fa-trash"></i></button>
    </div>`;
  const price = p => `${fmtNum(p.price)} ${t('currency')}/${unitLabel(p.unit)}`;
  const qty = p => `${fmtNum(p.quantity)} ${unitLabel(p.unit)}`;
  return `
    <div class="v3-card cb-table-wrap">
      <table class="cb-table">
        <thead><tr><th>${t('cb_col_product')}</th><th>${t('cb_col_price')}</th><th>${t('cb_col_qty')}</th><th>${t('cb_col_state')}</th><th>${t('cb_col_actions')}</th></tr></thead>
        <tbody>${list.map(p => `
          <tr>
            <td><div class="cb-prod" onclick="router.go('/product/${p.id}')">${img(p)}<b>${escHtml(p.name)}</b></div></td>
            <td>${price(p)}</td>
            <td>${qty(p)}</td>
            <td>${prState(p)}</td>
            <td>${acts(p)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="cb-cards">${list.map(p => `
      <article class="v3-card cb-card">
        <span onclick="router.go('/product/${p.id}')">${img(p)}</span>
        <div>
          <b>${escHtml(p.name)}</b>
          <div class="cb-card-meta">${price(p)} · ${qty(p)}</div>
          ${prState(p)}
        </div>
        ${acts(p)}
      </article>`).join('')}
    </div>`;
}

async function loadFarmerProducts() {
  // после правки товара проще перерисовать кабинет: обновятся и таблица, и цифры
  renderProfile();
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
