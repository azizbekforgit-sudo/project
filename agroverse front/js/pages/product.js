/* pages/product.js — детальная страница товара + выбор драйвера */

const UZ_CITIES = [
  'Ташкент','Самарканд','Навои','Бухара','Карши','Коканд',
  'Андижан','Фергана','Наманган','Термез','Джизак','Ургенч',
  'Хива','Нукус','Гулистан','Маргилан','Чирчик','Алмалык',
  'Бекабад','Шахрисабз','Денау','Туракурган','Маргелан','Касан',
];

function cityOptions(selected) {
  return UZ_CITIES.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');
}

function starsHtml(rating) {
  const r = Math.round(rating || 0);
  return Array.from({length: 5}, (_, i) => `<i class="fi ${i < r ? 'fi-sr-star' : 'fi-rr-star'}" style="color:#f59e0b;font-size:14px"></i>`).join('');
}

async function renderProduct(id) {
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`
    <div class="back-link" onclick="router.go('/market')">${t('back_market')}</div>
    <div id="product-content"><div class="spinner"></div></div>
  `);

  const content = document.getElementById('product-content');
  const isBuyer = Auth.isBuyer();

  try {
    const p = await API.getProduct(id);
    const emoji = CAT_EMOJI[p.category] || 'fi fi-sr-leaf';
    const emojiHtml = `<i class="${emoji}" style="font-size:20px"></i>`;

    // Build radio buttons conditionally
    let radiosHtml = `<label class="radio-label"><input type="radio" name="pickup" value="self" checked /> <i class="fi fi-rr-car-side"></i> ${t('pickup_self')}</label>`;
    if (p.delivery_available) {
      radiosHtml += `<label class="radio-label"><input type="radio" name="pickup" value="farmer" /> <i class="fi fi-rr-tractor"></i> ${t('pickup_farmer')}</label>`;
    }
    radiosHtml += `<label class="radio-label"><input type="radio" name="pickup" value="external" /> <i class="fi fi-rr-box-alt"></i> ${t('pickup_ext')}</label>`;

    const orderPanel = isBuyer ? `
      <div class="order-panel card">
        <h3>${t('order_form_title')}</h3>
        <div id="order-error" class="form-error hidden"></div>
        <div class="form-group">
          <label for="qty">${t('qty_label')} (${p.unit || t('unit_kg') || 'kg'})</label>
          <input type="number" id="qty" value="1" min="1" max="${p.quantity || 9999}" />
        </div>
        <div class="form-group">
          <label>${t('pickup_label')}</label>
          <div class="radio-col">
            ${radiosHtml}
          </div>
        </div>
        <div class="order-total">
          <span>${t('order_total')}</span>
          <b id="total-price">${Number(p.price).toLocaleString('ru')} ${t('currency') || 'sum'}</b>
        </div>
        <button class="btn btn-primary btn-full" id="order-btn">${t('btn_order')}</button>
        <button class="btn btn-ghost btn-full" id="cart-btn"><i class="fi fi-rr-shopping-bag"></i> ${t('btn_cart')}</button>
      </div>
    ` : `
      <div class="order-panel card">
        <h3>${t('product_info_title')}</h3>
        <div class="meta-row"><span><i class="fi fi-rr-box-alt"></i> ${t('in_stock')}</span><b>${p.quantity} ${p.unit || 'kg'}</b></div>
        <div class="meta-row"><span><i class="fi fi-rr-chart-histogram"></i> ${t('item_status_label')}</span><b>${p.status === 'pending' ? t('item_status_pending') : t('item_status_active')}</b></div>
        <div class="meta-row"><span><i class="fi fi-rr-tag"></i> ${t('category') || 'Kategoriya'}</span><b>${p.category || '—'}</b></div>
        <p class="hint" style="margin-top:14px">${t('farmer_hint')}</p>
      </div>
    `;

    content.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-gallery">
          ${p.images?.length
            ? `<img src="${p.images[0]}" alt="${p.name}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'gallery-ph'}))" />`
            : `<div class="gallery-ph">${emojiHtml}</div>`}

          <span class="pi-cat">${emojiHtml} ${p.category || ''}</span>
          <h1>${p.name}</h1>
          <div class="price-big">${Number(p.price).toLocaleString('ru')} <small>${t('currency') || 'sum'} / ${p.unit || 'kg'}</small></div>
          <div class="pi-rating">${starsHtml(p.rating)}</div>
          <p class="description">${p.description || t('no_desc')}</p>
          <div class="farmer-block">
            <div class="fb-ava"><i class="fi fi-sr-leaf"></i></div>
            <div>
              <div class="fb-label">${t('farmer_label')}</div>
              <div class="fb-name">${p.fermer_name || t('farmer_label')}</div>
            </div>
          </div>
        </div>
        ${orderPanel}
      </div>
    `;

    if (isBuyer) {
      // Quantity → price recalc
      document.getElementById('qty')?.addEventListener('input', () => {
        const qty = parseFloat(document.getElementById('qty').value) || 1;
        document.getElementById('total-price').textContent =
          `${(qty * Number(p.price)).toLocaleString('ru')} ${t('currency') || 'sum'}`;
      });

      // Add to cart
      document.getElementById('cart-btn')?.addEventListener('click', () => {
        const qty = parseInt(document.getElementById('qty').value) || 1;
        addToCart(p, qty);
        showToast(`«${p.name}» ${t('cart_added')}`);
      });

      // Order button
      document.getElementById('order-btn')?.addEventListener('click', async () => {
        const quantity = parseInt(document.getElementById('qty').value) || 1;
        const pickup_method = document.querySelector('input[name="pickup"]:checked')?.value || 'self';
        const errBox = document.getElementById('order-error');
        const btn = document.getElementById('order-btn');

        // If external delivery selected, open driver picker instead
        if (pickup_method === 'external') {
          showDriverPickerModal(p, quantity);
          return;
        }

        btn.disabled = true;
        btn.textContent = t('ordering_btn');
        errBox.classList.add('hidden');
        try {
          await API.createOrder({ product_id: Number(id), quantity, pickup_method });
          showToast(t('order_success'));
          router.go('/orders');
        } catch (e) {
          errBox.textContent = e.message;
          errBox.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = t('btn_order');
        }
      });
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>${fe('⚠️',16)} ${e.message}</p></div>`;
  }
}

// ─── Driver Picker Modal ────────────────────────────────────────────────

function showDriverPickerModal(product, quantity) {
  const existing = document.getElementById('driver-picker-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'driver-picker-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);animation:fadeIn .2s';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:600px;width:95%;max-height:85vh;overflow-y:auto;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="margin:0;font-size:20px">Выберите драйвера</h2>
        <button onclick="document.getElementById('driver-picker-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div>
          <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px">Откуда</label>
          <select id="dp-from" class="pn-input" style="width:100%">${cityOptions('')}</select>
        </div>
        <div>
          <label style="font-weight:600;font-size:13px;display:block;margin-bottom:4px">Куда</label>
          <select id="dp-to" class="pn-input" style="width:100%">${cityOptions('')}</select>
        </div>
      </div>
      <button id="dp-search-btn" class="btn btn-primary" style="width:100%;margin-bottom:20px">Найти драйверов</button>

      <div id="dp-results">
        <p style="color:#9ca3af;text-align:center">Выберите маршрут и нажмите "Найти"</p>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('dp-search-btn').addEventListener('click', async () => {
    const from = document.getElementById('dp-from').value;
    const to = document.getElementById('dp-to').value;
    if (!from || !to) { showToast('Выберите города', 'error'); return; }
    if (from === to) { showToast('Города должны отличаться', 'error'); return; }

    const resultsEl = document.getElementById('dp-results');
    resultsEl.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';

    try {
      const data = await API.getCouriersByRoute(from, to);
      const exact = data.exact || [];
      const anywhere = data.anywhere || [];

      if (!exact.length && !anywhere.length) {
        resultsEl.innerHTML = '<p style="color:#9ca3af;text-align:center;padding:20px">Драйверов не найдено</p>';
        return;
      }

      let html = '';

      if (exact.length) {
        html += `<div style="font-weight:700;color:#059669;margin-bottom:8px;font-size:13px;text-transform:uppercase">Точные маршруты (${exact.length})</div>`;
        html += exact.map(c => driverCardHtml(c, from, to, product, quantity)).join('');
      }

      if (anywhere.length) {
        html += `<div style="font-weight:700;color:#6b7280;margin:16px 0 8px;font-size:13px;text-transform:uppercase;border-top:1px solid #e5e7eb;padding-top:12px">Любой маршрут (${anywhere.length})</div>`;
        html += anywhere.map(c => driverCardHtml(c, from, to, product, quantity)).join('');
      }

      resultsEl.innerHTML = html;
    } catch (e) {
      resultsEl.innerHTML = `<p style="color:#ef4444;text-align:center">${e.message}</p>`;
    }
  });
}

function driverCardHtml(c, from, to, product, quantity) {
  const transportLabels = { moto: 'Мотоцикл', car: 'Легковой', truck: 'Грузовик', fura: 'Фура', refrig: 'Рефрижератор' };
  const transport = transportLabels[c.transport_type] || c.transport_type;
  const rating = c.rating ? c.rating.toFixed(1) : '0.0';
  const photoSrc = c.photo_url ? (c.photo_url.startsWith('http') ? c.photo_url : '') : '';

  return `
    <div onclick="showDriverProfileModal(${JSON.stringify(c).replace(/"/g, '&quot;')}, '${from}', '${to}', ${JSON.stringify(product).replace(/"/g, '&quot;')}, ${quantity})"
         style="border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:10px;cursor:pointer;transition:all .2s;display:flex;gap:12px;align-items:center"
         onmouseover="this.style.borderColor='#059669';this.style.boxShadow='0 2px 12px rgba(5,150,105,0.1)'"
         onmouseout="this.style.borderColor='#e5e7eb';this.style.boxShadow='none'">
      <div style="width:48px;height:48px;border-radius:50%;background:#d1fae5;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
        ${photoSrc ? `<img src="${photoSrc}" style="width:48px;height:48px;border-radius:50%;object-fit:cover" />` : '🚗'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <b style="font-size:15px">${c.full_name || 'Драйвер'}</b>
          <span style="color:#f59e0b;font-size:13px">⭐ ${rating}</span>
        </div>
        <div style="color:#6b7280;font-size:13px;margin-top:2px">
          🚗 ${transport} &nbsp;|&nbsp; 📦 ${c.total_deliveries || 0} доставок
        </div>
        <div style="color:#059669;font-size:13px;margin-top:2px;font-weight:600">
          💰 ${c.price_per_km ? Number(c.price_per_km).toLocaleString() + ' сум/км' : 'Цена не указана'}
        </div>
      </div>
      <div style="color:#9ca3af;font-size:20px">›</div>
    </div>
  `;
}

// ─── Driver Profile Modal + Calculator ──────────────────────────────────

async function showDriverProfileModal(courier, from, to, product, quantity) {
  // Remove picker modal
  const picker = document.getElementById('driver-picker-modal');
  if (picker) picker.remove();

  const existing = document.getElementById('driver-profile-modal');
  if (existing) existing.remove();

  // Calculate distance
  let distance = 0;
  let totalPrice = 0;
  try {
    const calc = await API.calculateRoute(from, to);
    distance = calc.distance_km || 0;
    totalPrice = courier.price_per_km ? Math.round(distance * courier.price_per_km) : 0;
  } catch (e) { /* ignore */ }

  const transportLabels = { moto: 'Мотоцикл', car: 'Легковой', truck: 'Грузовик', fura: 'Фура', refrig: 'Рефрижератор' };
  const transport = transportLabels[courier.transport_type] || courier.transport_type;
  const rating = courier.rating ? courier.rating.toFixed(1) : '0.0';

  const overlay = document.createElement('div');
  overlay.id = 'driver-profile-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);animation:fadeIn .2s';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:500px;width:95%;max-height:85vh;overflow-y:auto;padding:24px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin:0;font-size:18px">Профиль драйвера</h2>
        <button onclick="document.getElementById('driver-profile-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button>
      </div>

      <div style="text-align:center;margin-bottom:16px">
        <div style="width:72px;height:72px;border-radius:50%;background:#d1fae5;display:inline-flex;align-items:center;justify-content:center;font-size:32px;margin-bottom:8px">
          🚗
        </div>
        <div style="font-size:18px;font-weight:700">${courier.full_name || 'Драйвер'}</div>
        <div style="color:#f59e0b;font-size:15px;margin-top:4px">⭐ ${rating} &nbsp;|&nbsp; 📦 ${courier.total_deliveries || 0} доставок</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:14px">
        <div style="background:#f9fafb;padding:10px;border-radius:8px">🚗 ${transport}</div>
        <div style="background:#f9fafb;padding:10px;border-radius:8px">📍 ${courier.city || '—'}</div>
        <div style="background:#f9fafb;padding:10px;border-radius:8px">🛣️ ${from} → ${to}</div>
        <div style="background:#f9fafb;padding:10px;border-radius:8px">⏱️ Стаж: ${courier.experience_years || 0} лет</div>
      </div>

      ${courier.bio ? `<p style="color:#6b7280;font-size:14px;margin-bottom:16px;font-style:italic">"${courier.bio}"</p>` : ''}

      <div style="background:#f0fdf4;border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="font-weight:700;color:#059669;margin-bottom:8px">Калькулятор доставки</div>
        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px">
          <span>📏 Расстояние:</span><b>${distance.toFixed(1)} км</b>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px">
          <span>💰 Тариф:</span><b>${courier.price_per_km ? Number(courier.price_per_km).toLocaleString() + ' сум/км' : 'Не указан'}</b>
        </div>
        <div style="border-top:1px solid rgba(16,185,105,0.2);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:16px">
          <span style="font-weight:700">ИТОГО:</span>
          <b style="color:#059669">${totalPrice ? Number(totalPrice).toLocaleString() + ' сум' : '—'}</b>
        </div>
      </div>

      <div style="display:flex;gap:10px">
        <button class="btn btn-ghost" style="flex:1" onclick="showDriverPickerModal(${JSON.stringify(product).replace(/"/g, '&quot;')}, ${quantity})">← Назад</button>
        <button class="btn btn-primary" style="flex:2" id="dp-select-btn">Выбрать этого драйвера</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Select driver → show disclaimer
  document.getElementById('dp-select-btn').addEventListener('click', () => {
    showDisclaimerModal(courier, from, to, product, quantity, distance, totalPrice);
  });
}

// ─── Disclaimer Modal ──────────────────────────────────────────────────

function showDisclaimerModal(courier, from, to, product, quantity, distance, totalPrice) {
  const profileModal = document.getElementById('driver-profile-modal');
  if (profileModal) profileModal.remove();

  const existing = document.getElementById('disclaimer-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'disclaimer-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);animation:fadeIn .2s';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:480px;width:95%;padding:24px">
      <div style="text-align:center;margin-bottom:16px">
        <div style="font-size:48px;margin-bottom:8px">⚠️</div>
        <h2 style="margin:0;font-size:18px">Внимание</h2>
      </div>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:16px;font-size:14px;line-height:1.6">
        Наш сайт <b>не несёт ответственности</b> за перевозку груза водителем.
        При возникновении проблем по пути, администраторы могут помочь <b>частично</b>, но не полностью.
      </div>

      <div style="margin-bottom:16px">
        <label style="display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px" id="discl-read-label">
          <input type="checkbox" id="discl-read" style="width:18px;height:18px;accent-color:#059669" />
          <span>Я прочитал</span>
        </label>
        <label style="display:flex;align-items:center;gap:10px;padding:10px;cursor:pointer;border:1px solid #e5e7eb;border-radius:8px" id="discl-agree-label">
          <input type="checkbox" id="discl-agree" style="width:18px;height:18px;accent-color:#059669" />
          <span>Я согласен</span>
        </label>
      </div>

      <button class="btn btn-primary btn-full" id="discl-confirm-btn" disabled style="opacity:0.5">
        ${sessionStorage.getItem('av_change_driver_order_id') ? 'Выбрать этого драйвера' : 'Оформить заказ'}
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  const readCb = document.getElementById('discl-read');
  const agreeCb = document.getElementById('discl-agree');
  const confirmBtn = document.getElementById('discl-confirm-btn');

  function checkBoth() {
    const both = readCb.checked && agreeCb.checked;
    confirmBtn.disabled = !both;
    confirmBtn.style.opacity = both ? '1' : '0.5';
  }

  readCb.addEventListener('change', checkBoth);
  agreeCb.addEventListener('change', checkBoth);

  confirmBtn.addEventListener('click', async () => {
    if (!readCb.checked || !agreeCb.checked) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Оформление...';

    try {
      // Проверяем, это смена драйвера для существующего заказа?
      const existingOrderId = sessionStorage.getItem('av_change_driver_order_id');

      let orderId;
      if (existingOrderId) {
        // Обновляем кандидата в существующем заказе
        orderId = parseInt(existingOrderId);
        await API.selectDriverCandidate(orderId, {
          courier_user_id: courier.user_id,
          route_from: from,
          route_to: to,
          distance_km: distance,
          total_price: totalPrice
        });
        sessionStorage.removeItem('av_change_driver_order_id');
        overlay.remove();
        showToast('Новый драйвер выбран! Обсудите детали в чате.');
      } else {
        // Создаём новый заказ
        const order = await API.createOrder({
          product_id: product.id,
          quantity: quantity,
          pickup_method: 'external',
        });

        orderId = order.id || order.order_id;
        await API.selectDriverCandidate(orderId, {
          courier_user_id: courier.user_id,
          route_from: from,
          route_to: to,
          distance_km: distance,
          total_price: totalPrice
        });

        overlay.remove();
        showToast('Заказ создан! Драйвер выбран как кандидат. Обсудите детали в чате.');
      }

      router.go('/orders');
    } catch (e) {
      showToast(e.message, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Оформить заказ';
    }
  });
}

window.renderProduct = renderProduct;
