/* pages/profile.js — Premium profile page */

const ROLE_LABELS = {
  fermer: () => t('role_farmer'),
  xaridor: () => t('role_buyer'),
  admin: 'Admin',
};
const ROLE_ICONS = {
  fermer: 'fa-solid fa-seedling',
  xaridor: 'fa-solid fa-bag-shopping',
  admin: 'fa-solid fa-crown',
};
const CAT_EMOJI_PROF = { 'Овощи': 'fa-solid fa-carrot', 'Фрукты': 'fa-solid fa-apple-whole', 'Зелень': 'fa-solid fa-leaf', 'Зерновые': 'fa-solid fa-wheat-awn', 'Молочные': 'fa-solid fa-bottle-droplet', 'Мёд': 'fa-solid fa-jar' };

async function renderProfile() {
  const app = document.getElementById('app');
  const user = Auth.getUser();
  if (!user) { router.go('/login'); return; }


  // Inject profile styles once
  injectProfileStyles();

  const avatarLetter = (user.name || '?')[0].toUpperCase();
  const roleLabelFn = ROLE_LABELS[user.role];
  const roleLabel = typeof roleLabelFn === 'function' ? roleLabelFn() : (roleLabelFn || user.role);
  const roleIcon = ROLE_ICONS[user.role] || 'fa-solid fa-user';

  const isFarmer = user.role === 'fermer';

  app.innerHTML = pageShell(`
    <div class="pr-page">
      <!-- Header -->
      <div class="pr-header" style="background: linear-gradient(135deg, #105C38 0%, #1A7A4C 100%); border-radius: 16px; padding: 28px; color: #FFF; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px; box-shadow: 0 10px 25px rgba(16, 92, 56, 0.15);">
        <div class="pr-header-content" style="display: flex; align-items: center; gap: 20px;">
          <div class="pr-avatar" style="width: 72px; height: 72px; border-radius: 50%; background: #F4EFE6; color: #105C38; font-size: 32px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(255,255,255,0.3); font-family: var(--font-display);">${avatarLetter}</div>
          <div class="pr-user-info">
            <h1 class="pr-name" style="font-size: 26px; font-weight: 800; margin: 0 0 6px 0; font-family: var(--font-display); text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${user.name || 'Пользователь'}</h1>
            <div class="pr-meta" style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 14px; opacity: 0.95;">
              <span class="pr-role-badge" style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-weight: 700; backdrop-filter: blur(4px);"><i class="${roleIcon}"></i> ${roleLabel}</span>
              <span class="pr-phone"><i class="fa-solid fa-phone"></i> ${user.phone || ''}</span>
              ${user.city ? `<span class="pr-email"><i class="fa-solid fa-location-dot"></i> ${user.city}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="pr-header-actions" style="display: flex; gap: 10px;">
          ${isFarmer ? `<button class="btn btn-primary" onclick="router.go('/product/new')" style="background:#FFF; color:#105C38; font-weight:700; border:none; padding:10px 18px; border-radius:10px; cursor:pointer;"><i class="fa-solid fa-plus"></i> ${t('add_btn')}</button>` : ''}
        </div>
      </div>

      <!-- Profile Tab Navigation -->
      <div class="pr-tabs-bar" style="display: flex; gap: 10px; margin-bottom: 24px; border-bottom: 2px solid #E5E7EB; padding-bottom: 2px; overflow-x: auto;">
        ${isFarmer ? `
          <button class="pr-tab active" data-tab="products" onclick="switchProfileTab('products')"><i class="fa-solid fa-wheat-awn"></i> Мои товары</button>
          <button class="pr-tab" data-tab="orders" onclick="switchProfileTab('orders')"><i class="fa-solid fa-receipt"></i> Продажи и Заказы</button>
          <button class="pr-tab" data-tab="finance" onclick="switchProfileTab('finance')"><i class="fa-solid fa-wallet"></i> Финансы</button>
          <button class="pr-tab" data-tab="settings" onclick="switchProfileTab('settings')"><i class="fa-solid fa-sliders"></i> Настройки</button>
        ` : `
          <button class="pr-tab active" data-tab="orders" onclick="switchProfileTab('orders')"><i class="fa-solid fa-box"></i> Мои покупки</button>
          <button class="pr-tab" data-tab="cart" onclick="switchProfileTab('cart')"><i class="fa-solid fa-basket-shopping"></i> Корзина</button>
          <button class="pr-tab" data-tab="finance" onclick="switchProfileTab('finance')"><i class="fa-solid fa-wallet"></i> Баланс</button>
          <button class="pr-tab" data-tab="settings" onclick="switchProfileTab('settings')"><i class="fa-solid fa-sliders"></i> Настройки</button>
        `}
      </div>

      <!-- Stats cards -->
      <div class="pr-stats" id="pr-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="pr-stat-card">
          <div class="pr-stat-icon"><i class="fa-solid fa-box"></i></div>
          <div class="pr-stat-num" id="pr-stat-orders">—</div>
          <div class="pr-stat-label">${t('stat_orders')}</div>
        </div>
        ${isFarmer ? `
        <div class="pr-stat-card featured" style="background:#105C38;color:#FFF">
          <div class="pr-stat-icon"><i class="fa-solid fa-store"></i></div>
          <div class="pr-stat-num" id="pr-stat-products">—</div>
          <div class="pr-stat-label">${t('stat_products')}</div>
        </div>
        <div class="pr-stat-card">
          <div class="pr-stat-icon"><i class="fa-solid fa-circle-check"></i></div>
          <div class="pr-stat-num" id="pr-stat-active">—</div>
          <div class="pr-stat-label">${t('stat_active')}</div>
        </div>
        ` : `
        <div class="pr-stat-card featured" style="background:#105C38;color:#FFF">
          <div class="pr-stat-icon"><i class="fa-solid fa-bag-shopping"></i></div>
          <div class="pr-stat-num" id="pr-stat-cart">0</div>
          <div class="pr-stat-label">${t('stat_in_cart')}</div>
        </div>
        `}
      </div>

      <!-- TAB: PRODUCTS (Farmer) -->
      ${isFarmer ? `
      <div class="pr-tab-content pr-section" id="tab-content-products">
        <div class="pr-section-head" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h2><i class="fa-solid fa-store"></i> ${t('my_products')}</h2>
          <button class="btn btn-primary btn-sm" onclick="router.go('/product/new')"><i class="fa-solid fa-plus"></i> ${t('add_btn')}</button>
        </div>
        <div id="pr-products-list"><div class="spinner"></div></div>
      </div>
      ` : ''}

      <!-- TAB: ORDERS (Farmer & Buyer) -->
      <div class="pr-tab-content pr-section ${!isFarmer ? 'active-tab' : 'hidden-tab'}" id="tab-content-orders">
        <div class="pr-section-head" style="margin-bottom:16px;">
          <h2><i class="fa-solid fa-box"></i> ${isFarmer ? 'Заказы от клиентов' : 'Мои покупки'}</h2>
        </div>
        <div id="pr-orders-list"><div class="spinner"></div></div>
      </div>

      <!-- TAB: CART (Buyer) -->
      ${!isFarmer ? `
      <div class="pr-tab-content pr-section hidden-tab" id="tab-content-cart">
        <div class="pr-section-head" style="margin-bottom:16px;">
          <h2><i class="fa-solid fa-basket-shopping"></i> Корзина покупок</h2>
        </div>
        <div class="pr-settings-card" style="padding:20px; text-align:center;">
          <p style="font-size:16px; color:#4B5563; margin-bottom:16px;">Перейти к оформлению заказа из корзины</p>
          <button class="btn btn-primary" onclick="router.go('/cart')"><i class="fa-solid fa-cart-shopping"></i> Открыть корзину</button>
        </div>
      </div>
      ` : ''}

      <!-- TAB: FINANCE -->
      <div class="pr-tab-content pr-section hidden-tab" id="tab-content-finance">
        <div class="pr-section-head" style="margin-bottom:16px;">
          <h2><i class="fa-solid fa-wallet"></i> Финансы и Баланс</h2>
        </div>
        <div class="pr-settings-card" style="padding:24px; background:#FAFAFA; border-radius:14px; border:1px solid #E5E7EB;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <div style="font-size:14px; color:#6B7280; font-weight:600;">Текущий баланс счета</div>
              <div style="font-size:32px; font-weight:800; color:#105C38; font-family:var(--font-display);">0 сум</div>
            </div>
            <button class="btn btn-primary" onclick="router.go('/wallet')" style="padding:12px 24px;"><i class="fa-solid fa-wallet"></i> Управление балансом</button>
          </div>
        </div>
      </div>

      <!-- TAB: SETTINGS -->
      <div class="pr-tab-content pr-section hidden-tab" id="tab-content-settings">
        <div class="pr-section-head" style="margin-bottom:16px;">
          <h2><i class="fa-solid fa-gear"></i> ${t('settings_label')}</h2>
        </div>
        <div class="pr-settings-card" style="margin-bottom:24px;">
          <div class="pr-setting-row">
            <div class="pr-setting-info">
              <div class="pr-setting-label">${t('field_name')}</div>
              <div class="pr-setting-value" id="pr-name-display">${user.name || ''}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="openProfileEdit('name')">${t('field_edit')}</button>
          </div>
          <div class="pr-setting-row">
            <div class="pr-setting-info">
              <div class="pr-setting-label">${t('field_email_label')}</div>
              <div class="pr-setting-value" id="pr-email-display">${user.email || '—'}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="openProfileEdit('email')">${t('field_edit')}</button>
          </div>
          <div class="pr-setting-row">
            <div class="pr-setting-info">
              <div class="pr-setting-label">Телефон</div>
              <div class="pr-setting-value">${user.phone || ''}</div>
            </div>
            <span class="pr-setting-locked"><i class="fa-solid fa-lock"></i> ${t('phone_locked')}</span>
          </div>
          <div class="pr-setting-row">
            <div class="pr-setting-info">
              <div class="pr-setting-label">Город</div>
              <div class="pr-setting-value" id="pr-city-display">${user.city || '—'}</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="openProfileEdit('city')">${t('field_edit')}</button>
          </div>
        </div>

        <div class="pr-section-head" style="margin-bottom:16px;">
          <h2><i class="fa-solid fa-shield-halved"></i> Безопасность</h2>
        </div>
        <div class="pr-settings-card">
          ${user.plain_password ? `
          <div class="pr-setting-row">
            <div class="pr-setting-info">
              <div class="pr-setting-label">Ваш пароль</div>
              <div class="pr-setting-value" id="pr-password-display">••••••</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="togglePasswordVisibility()"><i class="fa-solid fa-eye"></i></button>
          </div>
          ` : ''}
          <div class="pr-setting-row">
            <div class="pr-setting-info">
              <div class="pr-setting-label">Смена пароля</div>
              <div class="pr-setting-value">Изменить пароль аккаунта</div>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="openChangePassword()"><i class="fa-solid fa-key"></i> Изменить</button>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="pr-section" style="margin-top:32px;">
        <div class="pr-actions-row" style="display:flex; gap:16px;">
          ${user.role !== 'admin' ? `<a class="btn btn-ghost" onclick="router.go('/tariffs')"><i class="fa-solid fa-star"></i> ${t('nav_tariffs')}</a>` : ''}
          <a class="btn btn-danger" onclick="Auth.logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('nav_logout')}</a>
        </div>
      </div>
    </div>
  `);

  // Load stats
  loadProfileStats(user);

  // Load farmer products
  if (user.role === 'fermer') {
    loadFarmerProducts();
    loadFarmerOrders();
  }
}

async function loadProfileStats(user) {
  try {
    if (user.role === 'fermer') {
      // Пробуем /api/my/products (если задеплоен), иначе — getProducts + фильтр
      let myProducts = [];
      try {
        const data = await API.getMyProducts?.() || null;
        if (data && data.products) {
          myProducts = data.products;
        } else {
          throw new Error('fallback');
        }
      } catch {
        const all = await API.getProducts({});
        myProducts = all.filter(p => p.fermer_id === user.id);
      }
      const el1 = document.getElementById('pr-stat-products');
      const el2 = document.getElementById('pr-stat-active');
      if (el1) el1.textContent = myProducts.length;
      if (el2) el2.textContent = myProducts.filter(p => p.status === 'active').length;
    } else {
      const cartEl = document.getElementById('pr-stat-cart');
      if (cartEl) cartEl.textContent = getCartCount();
    }
    try {
      const ordersData = await API.getMyOrders();
      const orders = ordersData.orders || [];
      const el = document.getElementById('pr-stat-orders');
      if (el) el.textContent = orders.length;
    } catch {
      const el = document.getElementById('pr-stat-orders');
      if (el) el.textContent = '0';
    }
  } catch (e) {
    if (e.message === 'BLOCKED') return;
  }
}

async function loadFarmerProducts() {
  const list = document.getElementById('pr-products-list');
  if (!list) return;

  try {
    const user = Auth.getUser();
    // Пробуем /api/my/products, иначе — getProducts + фильтр
    let products = [];
    try {
      const data = await API.getMyProducts?.() || null;
      if (data && data.products) {
        products = data.products;
      } else {
        throw new Error('fallback');
      }
    } catch {
      const all = await API.getProducts({});
      products = all.filter(p => p.fermer_id === user.id);
    }

    if (!products.length) {
      list.innerHTML = `
        <div class="pr-empty">
          <div class="pr-empty-icon"><i class="fi fi-rr-shop"></i></div>
          <h3>Нет товаров</h3>
          <p>Добавьте свой первый товар, чтобы начать продавать</p>
          <button class="btn btn-primary" onclick="router.go('/product/new')"><i class="fi fi-rr-plus"></i> Добавить товар</button>
        </div>
      `;
      return;
    }

    list.innerHTML = products.map(p => {
      const emoji = `<i class="${CAT_EMOJI_PROF[p.category] || 'fi fi-sr-leaf'}" style="font-size:20px"></i>`;
      const statusClass = p.status === 'active' ? 'ok' : p.status === 'pending' ? 'pending' : 'rejected';
      const statusText = p.status === 'active' ? 'Активен' : p.status === 'pending' ? 'На модерации' : 'Отклонён';
      const bg = p.status === 'active' ? 'var(--bg-card-2)' : 'var(--bg-card)';

      return `
        <div class="pr-product-card" style="animation-delay: ${products.indexOf(p) * 0.05}s">
          <div class="pr-pc-left" style="background:${bg}">
            <span class="pr-pc-emoji">${emoji}</span>
            <span class="pr-pc-status ${statusClass}">${statusText}</span>
          </div>
          <div class="pr-pc-body">
            <div class="pr-pc-title">${p.name}</div>
            <div class="pr-pc-meta">
              <span class="pr-pc-price">${Number(p.price).toLocaleString('ru')} сум/${p.unit || 'кг'}</span>
              <span class="pr-pc-qty">Остаток: ${p.quantity} ${p.unit || 'кг'}</span>
            </div>
            <div class="pr-pc-category">${p.category || 'Без категории'}</div>
          </div>
          <div class="pr-pc-actions">
            <button class="btn btn-ghost btn-sm" onclick="openProductEdit(${p.id})" title="Редактировать">
              <i class="fi fi-rr-pencil"></i>
            </button>
            <button class="btn btn-ghost btn-sm" onclick="deleteMyProduct(${p.id}, '${(p.name || '').replace(/'/g, "\\'")}')" title="Удалить">
              <i class="fi fi-rr-trash"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    if (e.message === 'BLOCKED') return;
    list.innerHTML = `<div class="form-error">${e.message}</div>`;
  }
}

async function loadFarmerOrders() {
  const list = document.getElementById('pr-orders-list');
  if (!list) return;

  try {
    const data = await API.getMyOrders();
    const orders = data?.orders || data || [];

    if (!orders.length) {
      list.innerHTML = `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:14px">Нет заказов</div>`;
      return;
    }

    const statusLabels = {
      created: 'Не оплачен',
      paid: 'Оплачен',
      ready_for_pickup: 'Готов к выдаче',
      completed: 'Завершён',
      cancelled: 'Отменён',
    };
    const statusColors = {
      created: '#f59e0b',
      paid: '#10b981',
      ready_for_pickup: '#3b82f6',
      completed: '#10b981',
      cancelled: '#ef4444',
    };

    list.innerHTML = orders.slice(0, 10).map(o => {
      const color = statusColors[o.status] || '#6b7280';
      const label = statusLabels[o.status] || o.status;
      const date = o.created_at ? new Date(o.created_at).toLocaleDateString('ru-RU') : '';

      return `
        <div style="border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:8px;background:var(--bg-card)">
          <div style="display:flex;justify-content:space-between;align-items:start">
            <div>
              <div style="font-weight:600;font-size:14px">${o.product_title || 'Товар'}</div>
              <div style="font-size:12px;color:var(--txt-3);margin-top:2px">
                👤 ${o.xaridor_name || 'Покупатель'} · ${o.quantity} шт. · ${date}
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;font-size:14px;color:var(--clr-primary)">${Number(o.total_price).toLocaleString()} сум</div>
              <span style="background:${color}20;color:${color};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700">${label}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    list.innerHTML = `<div style="color:#ef4444;font-size:13px">${e.message}</div>`;
  }
}

async function deleteMyProduct(id, name) {
  if (!confirm(`Удалить «${name}»?`)) return;
  try {
    await API.deleteProduct(id);
    showToast(`«${name}» удалён`, 'success');
    loadFarmerProducts();
    loadProfileStats(Auth.getUser());
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    showToast(e.message, 'error');
  }
}

async function openProductEdit(id) {
  try {
    const p = await API.getProduct(id);
    showProductEditModal(p);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function showProductEditModal(product) {
  const existing = document.getElementById('pr-edit-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pr-edit-modal';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:520px">
      <div class="modal-ic"><i class="fi fi-rr-pencil"></i></div>
      <div class="modal-title">Редактировать товар</div>
      <div class="modal-desc">${product.title}</div>

      <div class="form-group">
        <label>Название</label>
        <input type="text" id="pe-title" class="pn-input" value="${product.title}" />
      </div>
      <div class="form-group">
        <label>Описание</label>
        <textarea id="pe-desc" class="pn-input" rows="3">${product.description || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Цена (сум)</label>
          <input type="number" id="pe-price" class="pn-input" value="${product.price_per_unit}" min="0" />
        </div>
        <div class="form-group">
          <label>Остаток</label>
          <input type="number" id="pe-qty" class="pn-input" value="${product.quantity_available}" min="0" />
        </div>
      </div>
      <div class="form-group">
        <label>Единица</label>
        <select id="pe-unit" class="pn-input">
          <option value="кг" ${product.unit === 'кг' ? 'selected' : ''}>кг</option>
          <option value="шт" ${product.unit === 'шт' ? 'selected' : ''}>шт</option>
          <option value="литр" ${product.unit === 'литр' ? 'selected' : ''}>литр</option>
          <option value="г" ${product.unit === 'г' ? 'selected' : ''}>г</option>
        </select>
      </div>
      <div class="form-group">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" id="pe-delivery" style="width:18px;height:18px;accent-color:#059669" ${product.delivery_available ? 'checked' : ''} />
          <span>Есть доставка (доставка фермера)</span>
        </label>
      </div>

      <div id="pe-error" class="form-error hidden"></div>

      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('pr-edit-modal').remove()">Отмена</button>
        <button class="btn btn-primary" id="pe-save-btn">Сохранить</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.style.opacity = '1');

  document.getElementById('pe-save-btn').onclick = async () => {
    const btn = document.getElementById('pe-save-btn');
    const errBox = document.getElementById('pe-error');
    errBox.classList.add('hidden');

    const title = document.getElementById('pe-title').value.trim();
    const price = parseFloat(document.getElementById('pe-price').value);
    const qty = parseInt(document.getElementById('pe-qty').value);

    if (!title || isNaN(price) || price <= 0 || isNaN(qty) || qty < 0) {
      errBox.textContent = 'Заполните все поля корректно';
      errBox.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    try {
      await API.updateProduct(product.id, {
        title,
        description: document.getElementById('pe-desc').value.trim(),
        price_per_unit: price,
        quantity_available: qty,
        unit: document.getElementById('pe-unit').value,
        delivery_available: document.getElementById('pe-delivery')?.checked || false,
      });
      overlay.remove();
      showToast('Товар обновлён', 'success');
      loadFarmerProducts();
    } catch (e) {
      if (e.message === 'BLOCKED') return;
      errBox.textContent = e.message;
      errBox.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Сохранить';
    }
  };
}

function openProfileEdit(field) {
  const existing = document.getElementById('pr-edit-modal');
  if (existing) existing.remove();

  const user = Auth.getUser();
  let currentVal, label, type, placeholder, icon;

  if (field === 'name') {
    currentVal = user.name || '';
    label = 'Имя';
    type = 'text';
    placeholder = 'Ваше имя';
    icon = 'user';
  } else if (field === 'email') {
    currentVal = user.email || '';
    label = 'Email';
    type = 'email';
    placeholder = 'email@example.com';
    icon = 'envelope';
  } else if (field === 'city') {
    currentVal = user.city || '';
    label = 'Город';
    type = 'text';
    placeholder = 'Например: Ташкент';
    icon = 'map-marker';
  }

  const overlay = document.createElement('div');
  overlay.id = 'pr-edit-modal';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-ic"><i class="fi fi-rr-${icon}"></i></div>
      <div class="modal-title">Изменить ${label.toLowerCase()}</div>
      <div class="form-group">
        <label>${label}</label>
        <input type="${type}" id="pr-edit-val" class="pn-input" value="${currentVal}" placeholder="${placeholder}" />
      </div>
      <div id="pr-edit-error" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('pr-edit-modal').remove()">Отмена</button>
        <button class="btn btn-primary" id="pr-edit-save">Сохранить</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.style.opacity = '1');
  setTimeout(() => document.getElementById('pr-edit-val')?.focus(), 100);

  document.getElementById('pr-edit-save').onclick = async () => {
    const btn = document.getElementById('pr-edit-save');
    const errBox = document.getElementById('pr-edit-error');
    errBox.classList.add('hidden');

    const val = document.getElementById('pr-edit-val').value.trim();
    if (!val) { errBox.textContent = 'Поле не может быть пустым'; errBox.classList.remove('hidden'); return; }

    btn.disabled = true;
    try {
      const body = {};
      body[field] = val;
      const updated = await API.updateProfile(body);
      Auth.setUser(updated);
      overlay.remove();
      showToast(`${label} обновлён`, 'success');
      renderProfile();
    } catch (e) {
      if (e.message === 'BLOCKED') return;
      errBox.textContent = e.message;
      errBox.classList.remove('hidden');
      btn.disabled = false;
    }
  };
}

/* ============================================================
   PASSWORD FUNCTIONS
   ============================================================ */
function togglePasswordVisibility() {
  const el = document.getElementById('pr-password-display');
  const user = Auth.getUser();
  if (!el || !user) return;

  if (el.textContent === '••••••') {
    el.textContent = user.plain_password || '—';
  } else {
    el.textContent = '••••••';
  }
}

function openChangePassword() {
  const existing = document.getElementById('pr-edit-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pr-edit-modal';
  overlay.className = 'modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="modal-box" style="max-width:420px">
      <div class="modal-ic"><i class="fi fi-rr-key"></i></div>
      <div class="modal-title">Смена пароля</div>
      <div class="form-group">
        <label>Текущий пароль</label>
        <input type="password" id="cp-current" class="pn-input" placeholder="Введите текущий пароль" />
      </div>
      <div class="form-group">
        <label>Новый пароль</label>
        <input type="password" id="cp-new" class="pn-input" placeholder="Минимум 6 символов" />
      </div>
      <div class="form-group">
        <label>Повторите новый пароль</label>
        <input type="password" id="cp-confirm" class="pn-input" placeholder="Повторите новый пароль" />
      </div>
      <div id="cp-error" class="form-error hidden"></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="document.getElementById('pr-edit-modal').remove()">Отмена</button>
        <button class="btn btn-primary" id="cp-save">Изменить пароль</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.style.opacity = '1');
  setTimeout(() => document.getElementById('cp-current')?.focus(), 100);

  document.getElementById('cp-save').onclick = async () => {
    const btn = document.getElementById('cp-save');
    const errBox = document.getElementById('cp-error');
    errBox.classList.add('hidden');

    const currentPassword = document.getElementById('cp-current').value;
    const newPassword = document.getElementById('cp-new').value;
    const confirmPassword = document.getElementById('cp-confirm').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
      errBox.textContent = 'Заполните все поля';
      errBox.classList.remove('hidden');
      return;
    }

    if (newPassword.length < 6) {
      errBox.textContent = 'Новый пароль должен быть минимум 6 символов';
      errBox.classList.remove('hidden');
      return;
    }

    if (newPassword !== confirmPassword) {
      errBox.textContent = 'Пароли не совпадают';
      errBox.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Сохранение...';

    try {
      await API.changePassword({ current_password: currentPassword, new_password: newPassword });
      overlay.remove();
      showToast('Пароль успешно изменён!', 'success');
      renderProfile();
    } catch (e) {
      if (e.message === 'BLOCKED') return;
      errBox.textContent = e.message;
      errBox.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Изменить пароль';
    }
  };
}

/* ============================================================
   STYLES INJECTION
   ============================================================ */
function injectProfileStyles() {
  if (document.getElementById('pr-styles')) return;
  const s = document.createElement('style');
  s.id = 'pr-styles';
  s.textContent = `
    .pr-page { max-width: 800px; margin: 0 auto; padding-bottom: 60px; }

    /* Header */
    .pr-header {
      position: relative; border-radius: 20px; overflow: hidden;
      padding: 36px 32px; margin-bottom: 24px;
      background: var(--bg-card); border: 1px solid var(--line);
      animation: fadeUp 0.35s ease both;
    }
    .pr-header-bg {
      position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(ellipse 70% 80% at 20% 50%, rgba(16,185,129,0.10) 0%, transparent 60%),
        radial-gradient(ellipse 50% 60% at 90% 30%, rgba(74,222,128,0.07) 0%, transparent 55%);
    }
    .pr-header-content {
      position: relative; display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    }
    .pr-avatar {
      width: 76px; height: 76px; border-radius: 50%;
      background: var(--gradient-primary);
      display: grid; place-items: center;
      font-family: var(--font-display); font-size: 32px; font-weight: 800; color: #fff;
      box-shadow: var(--glow); flex-shrink: 0;
    }
    .pr-user-info { flex: 1; min-width: 0; }
    .pr-name {
      font-family: var(--font-display); font-size: clamp(22px, 3vw, 28px);
      font-weight: 800; color: var(--txt); margin: 0 0 8px; line-height: 1.2;
    }
    .pr-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .pr-role-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
      background: rgba(74,222,128,0.12); color: var(--clr-primary);
      border: 1px solid var(--line);
    }
    .pr-role-badge i { font-size: 12px; }
    .pr-phone, .pr-email {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 13px; color: var(--txt-3);
    }
    .pr-phone i, .pr-email i { font-size: 12px; color: var(--clr-primary); }
    .pr-badge-ok {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
      background: rgba(74,222,128,0.12); color: var(--clr-primary);
      border: 1px solid var(--line-2);
      animation: fadeUp 0.4s ease both;
    }
    .pr-badge-ok i { font-size: 14px; }

    /* Stats */
    .pr-stats {
      display: grid; gap: 16px; margin-bottom: 24px;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    }
    .pr-stat-card {
      background: var(--bg-card); border: 1px solid var(--line);
      border-radius: 16px; padding: 20px; text-align: center;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      animation: fadeUp 0.35s ease both;
    }
    .pr-stat-card:hover { transform: translateY(-3px); box-shadow: var(--glow-soft); }
    .pr-stat-card.featured {
      background: var(--bg-card-2); border-color: var(--line-2);
      box-shadow: var(--glow-soft);
    }
    .pr-stat-icon {
      width: 42px; height: 42px; border-radius: 12px;
      background: rgba(74,222,128,0.10); border: 1px solid var(--line);
      display: grid; place-items: center; margin: 0 auto 10px;
      font-size: 18px; color: var(--clr-primary);
    }
    .pr-stat-card.featured .pr-stat-icon {
      background: var(--gradient-primary); color: #fff; border-color: transparent;
    }
    .pr-stat-num {
      font-family: var(--font-display); font-size: 24px; font-weight: 800;
      color: var(--txt); line-height: 1;
    }
    .pr-stat-card.featured .pr-stat-num { color: var(--clr-primary); }
    .pr-stat-label { font-size: 12px; color: var(--txt-3); margin-top: 6px; font-weight: 500; }

    /* Section */
    .pr-section { margin-bottom: 24px; animation: fadeUp 0.35s ease both; }
    .pr-section-head {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
    }
    .pr-section-head h2 {
      font-family: var(--font-display); font-size: clamp(18px, 2.5vw, 22px);
      font-weight: 700; color: var(--txt); display: flex; align-items: center; gap: 10px;
      margin: 0;
    }
    .pr-section-head h2 i { color: var(--clr-primary); font-size: 20px; }

    /* Settings card */
    .pr-settings-card {
      background: var(--bg-card); border: 1px solid var(--line);
      border-radius: 16px; overflow: hidden;
    }
    .pr-setting-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; gap: 16px;
      border-bottom: 1px solid var(--line);
    }
    .pr-setting-row:last-child { border-bottom: none; }
    .pr-setting-label { font-size: 12px; color: var(--txt-3); font-weight: 500; margin-bottom: 3px; }
    .pr-setting-value { font-size: 14px; font-weight: 600; color: var(--txt); }
    .pr-setting-locked {
      font-size: 12px; color: var(--txt-3); display: flex; align-items: center; gap: 5px;
      white-space: nowrap;
    }
    .pr-setting-locked i { font-size: 11px; }

    /* Farmer product cards */
    .pr-product-card {
      display: flex; align-items: stretch; gap: 0;
      background: var(--bg-card); border: 1px solid var(--line);
      border-radius: 14px; overflow: hidden;
      margin-bottom: 12px;
      transition: box-shadow 0.2s, transform 0.18s;
      animation: fadeUp 0.3s ease both;
    }
    .pr-product-card:hover {
      box-shadow: 0 6px 24px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    .pr-pc-left {
      width: 80px; min-height: 80px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      flex-shrink: 0; padding: 12px;
    }
    .pr-pc-emoji { font-size: 32px; }
    .pr-pc-status {
      font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: 0.3px;
    }
    .pr-pc-status.ok { background: rgba(74,222,128,0.15); color: var(--clr-primary); }
    .pr-pc-status.pending { background: rgba(245,158,11,0.15); color: var(--clr-warn); }
    .pr-pc-status.rejected { background: rgba(248,113,113,0.15); color: var(--clr-error); }
    .pr-pc-body { flex: 1; padding: 14px 16px; min-width: 0; }
    .pr-pc-title {
      font-weight: 700; font-size: 14.5px; color: var(--txt); margin-bottom: 6px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pr-pc-meta {
      display: flex; gap: 12px; flex-wrap: wrap; font-size: 12.5px; color: var(--txt-2);
    }
    .pr-pc-price { color: var(--clr-primary); font-weight: 700; }
    .pr-pc-qty { color: var(--txt-3); }
    .pr-pc-category { font-size: 11px; color: var(--txt-3); margin-top: 4px; }
    .pr-pc-actions {
      display: flex; flex-direction: column; gap: 4px;
      padding: 8px 12px; border-left: 1px solid var(--line);
      align-items: center; justify-content: center;
    }

    /* Empty state */
    .pr-empty {
      text-align: center; padding: 48px 24px;
      background: var(--bg-card); border: 1px solid var(--line); border-radius: 16px;
    }
    .pr-empty-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: rgba(74,222,128,0.08); border: 1px solid var(--line);
      display: grid; place-items: center; margin: 0 auto 16px;
      font-size: 26px; color: var(--clr-primary);
    }
    .pr-empty h3 {
      font-family: var(--font-display); font-size: 18px; font-weight: 700;
      color: var(--txt); margin-bottom: 6px;
    }
    .pr-empty p { color: var(--txt-3); font-size: 14px; margin-bottom: 20px; }

    /* Profile Tabs */
    .pr-tab {
      background: none; border: none; padding: 12px 20px; font-size: 15px; font-weight: 600;
      color: #6B7280; cursor: pointer; border-bottom: 3px solid transparent;
      display: flex; align-items: center; gap: 8px; transition: all 0.2s ease;
      white-space: nowrap; font-family: var(--font-body);
    }
    .pr-tab i { font-size: 16px; }
    .pr-tab:hover { color: #105C38; background: rgba(16, 92, 56, 0.04); border-radius: 8px 8px 0 0; }
    .pr-tab.active { color: #105C38; border-bottom-color: #105C38; font-weight: 700; }
    .hidden-tab { display: none !important; }
    .active-tab { display: block !important; }

    /* Actions row */
    .pr-actions-row {
      display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end;
    }

    /* Mobile */
    @media (max-width: 600px) {
      .pr-header { padding: 24px 20px; }
      .pr-header-content { flex-direction: column; text-align: center; }
      .pr-meta { justify-content: center; }
      .pr-badge-ok { margin: 0 auto; }
      .pr-stats { grid-template-columns: repeat(2, 1fr); }
      .pr-product-card { flex-direction: column; }
      .pr-pc-left { width: 100%; min-height: auto; flex-direction: row; padding: 10px 16px; }
      .pr-pc-actions {
        flex-direction: row; border-left: none; border-top: 1px solid var(--line);
        padding: 10px 16px; justify-content: flex-end;
      }
      .pr-setting-row { flex-direction: column; align-items: flex-start; gap: 8px; }
      .pr-tabs-bar { padding-bottom: 4px; }
      .pr-tab { padding: 10px 14px; font-size: 14px; }
    }
  `;
  document.head.appendChild(s);
}

function switchProfileTab(tabName) {
  const tabs = document.querySelectorAll('.pr-tab');
  tabs.forEach(t => {
    if (t.getAttribute('data-tab') === tabName) {
      t.classList.add('active');
    } else {
      t.classList.remove('active');
    }
  });

  const contents = document.querySelectorAll('.pr-tab-content');
  contents.forEach(c => {
    if (c.id === `tab-content-${tabName}`) {
      c.classList.remove('hidden-tab');
      c.classList.add('active-tab');
    } else {
      c.classList.add('hidden-tab');
      c.classList.remove('active-tab');
    }
  });
}

window.renderProfile = renderProfile;
window.switchProfileTab = switchProfileTab;
window.openProfileEdit = openProfileEdit;
window.openProductEdit = openProductEdit;
window.deleteMyProduct = deleteMyProduct;
window.togglePasswordVisibility = togglePasswordVisibility;
window.openChangePassword = openChangePassword;
window.loadFarmerOrders = loadFarmerOrders;
