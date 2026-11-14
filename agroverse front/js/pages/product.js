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

function pdStars(rating) {
  const r = Math.round(rating || 0);
  return Array.from({ length: 5 }, (_, i) => `<i class="${i < r ? 'fa-solid' : 'fa-regular'} fa-star"></i>`).join('');
}

function pdDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* «5 дней назад», «1 hafta oldin», «3 hours ago». Время с сервера приходит без пояснения часового
   пояса (UTC), поэтому читаем его как UTC. */
function pdParse(iso) {
  if (!iso) return null;
  const hasTz = /[zZ]|[+-]\d\d:?\d\d$/.test(iso);
  const d = new Date(hasTz ? iso : iso + 'Z');
  return isNaN(d) ? null : d;
}

function pdPlural(n, forms) { // русские формы: 1 / 2-4 / 5+
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return forms[0];
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return forms[1];
  return forms[2];
}

function pdAgo(iso) {
  const d = pdParse(iso);
  if (!d) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  const units = [
    [60, 'min'], [3600, 'hour'], [86400, 'day'], [604800, 'week'], [2592000, 'month'], [31536000, 'year'],
  ];
  const lang = (window.I18nManager && I18nManager.current) || 'uz';
  if (sec < 60) return { ru: 'только что', uz: 'hozirgina', en: 'just now' }[lang] || 'hozirgina';
  let n = 0, key = 'min';
  for (let i = units.length - 1; i >= 0; i--) {
    if (sec >= units[i][0]) { n = Math.floor(sec / units[i][0]); key = units[i][1]; break; }
  }
  if (lang === 'ru') {
    const f = { min: ['минуту', 'минуты', 'минут'], hour: ['час', 'часа', 'часов'], day: ['день', 'дня', 'дней'],
                week: ['неделю', 'недели', 'недель'], month: ['месяц', 'месяца', 'месяцев'], year: ['год', 'года', 'лет'] }[key];
    return `${n} ${pdPlural(n, f)} назад`;
  }
  if (lang === 'en') return `${n} ${key}${n === 1 ? '' : 's'} ago`;
  const uz = { min: 'daqiqa', hour: 'soat', day: 'kun', week: 'hafta', month: 'oy', year: 'yil' }[key];
  return `${n} ${uz} oldin`;
}

function pdViews(n) {
  n = Number(n) || 0;
  const lang = (window.I18nManager && I18nManager.current) || 'uz';
  const num = fmtNum(n);
  if (lang === 'ru') return `${num} ${pdPlural(n, ['просмотр', 'просмотра', 'просмотров'])}`;
  if (lang === 'en') return `${num} ${n === 1 ? 'view' : 'views'}`;
  return `${num} ko‘rish`;
}

/* +998901234567 → «+998 90 123 45 67»; для скрытого вида последние цифры прячем */
function pdPhoneView(raw, hidden) {
  const d = String(raw || '').replace(/\D/g, '');
  if (d.length !== 12) return raw || '';
  const parts = [d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)];
  return hidden ? `+998 ${parts[0]} ••• •• ••` : `+998 ${parts.join(' ')}`;
}

function pdShowPhone(btn) {
  const box = btn.closest('.pd2-phone');
  const raw = box.dataset.phone;
  box.innerHTML = `<i class="fa-solid fa-phone"></i>
    <a class="pd2-phone-num" href="tel:${escHtml(raw)}">${escHtml(pdPhoneView(raw, false))}</a>`;
}
window.pdShowPhone = pdShowPhone;

/* считаем просмотр: один браузер — один раз в сутки на товар, свой товар не считаем */
function pdCountView(p, own) {
  if (own) return;
  let seen = {};
  try { seen = JSON.parse(localStorage.getItem('av_viewed') || '{}'); } catch (e) { seen = {}; }
  const now = Date.now();
  if (seen[p.id] && now - seen[p.id] < 86400000) return;
  API.countView(p.id).then((r) => {
    seen[p.id] = now;
    // не даём словарю расти без конца
    const ids = Object.keys(seen);
    if (ids.length > 300) ids.sort((a, b) => seen[a] - seen[b]).slice(0, ids.length - 300).forEach((k) => delete seen[k]);
    try { localStorage.setItem('av_viewed', JSON.stringify(seen)); } catch (e) { /* ignore */ }
    const el = document.getElementById('pd-views');
    if (el && r && typeof r.views === 'number') el.textContent = pdViews(r.views);
  }).catch(() => { /* просмотр — не критично */ });
}

function pdShowPhoto(i) {
  const main = document.getElementById('pd2-main-img');
  const thumbs = document.querySelectorAll('.pd2-thumb');
  const src = thumbs[i]?.dataset.src;
  if (main && src) main.src = src;
  thumbs.forEach((tb, k) => tb.classList.toggle('active', k === i));
}
window.pdShowPhoto = pdShowPhoto;

/* «Написать продавцу»: открываем (или создаём) переписку по этому товару */
async function pdContactSeller(id, btn) {
  if (btn) btn.disabled = true;
  try {
    const chat = await API.askAboutProduct(id);
    router.go('/chats/' + chat.id);
  } catch (e) {
    if (e.message !== 'BLOCKED') showToast(e.message, 'error');
    if (btn) btn.disabled = false;
  }
}
window.pdContactSeller = pdContactSeller;

async function renderProduct(id) {
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`<div id="product-content"><div class="spinner"></div></div>`);

  const content = document.getElementById('product-content');
  let isBuyer = Auth.canBuy(); // уточняется ниже: свой товар купить нельзя

  try {
    const p = await API.getProduct(id);
    const own = p.fermer_id === Auth.getUser()?.id;
    if (own) isBuyer = false;

    const name = escHtml(p.name);
    const photos = (p.images || []).map(u => u.startsWith('http') ? u : BASE_URL + u);
    const icon = (window.CAT_EMOJI || {})[p.category] || 'fa-solid fa-leaf';
    const seller = escHtml(p.fermer_name || t('pc_farmer'));
    const unit = unitLabel(p.unit);

    let radios = `<label><input type="radio" name="pickup" value="self" checked /> <i class="fa-solid fa-person-walking"></i> ${t('pickup_self')}</label>`;
    if (p.delivery_available) radios += `<label><input type="radio" name="pickup" value="farmer" /> <i class="fa-solid fa-tractor"></i> ${t('pickup_farmer')}</label>`;
    radios += `<label><input type="radio" name="pickup" value="external" /> <i class="fa-solid fa-truck"></i> ${t('pickup_ext')}</label>`;

    const orderPanel = isBuyer ? `
      <div class="v3-card pd2-order">
        <h2>${t('pd_order_title')}</h2>
        <label class="pd2-row"><span>${t('pd_qty')} (${unit})</span>
          <input type="number" id="qty" value="1" min="1" max="${p.quantity || 9999}" inputmode="decimal" />
        </label>
        <div class="pd2-row"><span>${t('pd_how_get')}</span><div class="pd2-radios">${radios}</div></div>
        <div class="pd2-total"><span>${t('pd_total')}</span><b id="total-price">${fmtNum(p.price)} ${t('currency')}</b></div>
        <div class="pd2-btns">
          <button class="btn btn-primary btn-lg" id="order-btn"><i class="fa-solid fa-check"></i> ${t('pd_order_btn')}</button>
          <button class="btn btn-outline btn-lg" id="cart-btn"><i class="fa-solid fa-basket-shopping"></i> ${t('pd_to_cart')}</button>
        </div>
      </div>` : own ? `
      <div class="v3-card pd2-own">
        <span><i class="fa-solid fa-seedling" style="color:var(--field)"></i> ${t('pd_your_product')}</span>
        <button class="btn btn-outline btn-sm" onclick="router.go('/profile?tab=listings')"><i class="fa-solid fa-pen"></i> ${t('pd_edit')}</button>
      </div>` : '';

    content.innerHTML = `
      <nav class="crumbs" aria-label="breadcrumb">
        <a onclick="router.go('/home')">${t('nav_home')}</a><i class="fa-solid fa-chevron-right"></i>
        <a onclick="router.go('/market')">${t('mk_title')}</a><i class="fa-solid fa-chevron-right"></i>
        <b>${name}</b>
      </nav>
      <div class="pd2">
        <div class="pd2-gallery">
          <div class="pd2-photo">
            <i class="${icon}" aria-hidden="true"></i>
            ${photos.length ? `<img id="pd2-main-img" src="${photos[0]}" alt="${name}" onerror="this.remove()" />` : ''}
            ${p.status === 'pending' ? `<span class="pill wait pc2-flag">${t('on_moderation')}</span>` : ''}
          </div>
          ${photos.length > 1 ? `<div class="pd2-thumbs">${photos.map((src, i) => `
            <button class="pd2-thumb ${i === 0 ? 'active' : ''}" data-src="${src}" onclick="pdShowPhoto(${i})" aria-label="${i + 1}"><img src="${src}" alt="" loading="lazy" /></button>`).join('')}</div>` : ''}
        </div>

        <div class="pd2-info">
          <div>
            <h1 class="pd2-title">${name}</h1>
            <div class="pd2-price">${priceHtml(p)}</div>
            <div class="pd2-stock">${t('pd_available')}: <b>${fmtNum(p.quantity)} ${unit}</b></div>
          </div>
          <div class="pd2-specs">
            <div class="pd2-spec"><i class="fa-solid fa-tag"></i><span>${t('pd_kind')}</span><b>${catLabel(p.category) || '—'}</b></div>
            ${p.pickup_location ? `<div class="pd2-spec"><i class="fa-solid fa-location-dot"></i><span>${t('pd_region')}</span><b>${escHtml(p.pickup_location)}</b></div>` : ''}
            <div class="pd2-spec"><i class="fa-regular fa-clock"></i><span>${t('pd_posted')}</span><b title="${pdDate(p.created_at)}">${pdAgo(p.created_at)}</b></div>
            <div class="pd2-spec"><i class="fa-regular fa-eye"></i><span>${t('pd_views')}</span><b id="pd-views">${pdViews(p.views)}</b></div>
            ${p.delivery_available ? `<div class="pd2-spec"><i class="fa-solid fa-truck"></i><span>${t('pd_how_get')}</span><b>${t('pd_delivery_badge')}</b></div>` : ''}
          </div>

          <div class="v3-card pd2-seller">
            <div class="pd2-seller-top">
              <span class="pd2-seller-ava">${seller[0] || 'F'}</span>
              <div>
                <small>${t('pd_seller')}</small>
                <div class="pd2-seller-name">${seller}</div>
                <div class="pd2-seller-meta">
                  <span>${pdStars(p.rating)} ${p.rating ? Number(p.rating).toFixed(1) : '0.0'}</span>
                  ${p.pickup_location ? `<span><i class="fa-solid fa-location-dot"></i> ${escHtml(p.pickup_location)}</span>` : ''}
                </div>
              </div>
            </div>
            ${p.contact_phone ? `
              <div class="pd2-phone" data-phone="${escHtml(p.contact_phone)}">
                <i class="fa-solid fa-phone"></i>
                <span class="pd2-phone-num">${escHtml(pdPhoneView(p.contact_phone, true))}</span>
                <button type="button" class="btn btn-outline btn-sm" onclick="pdShowPhone(this)">${t('pd_show_phone')}</button>
              </div>` : ''}
            ${!own && Auth.isLoggedIn() ? `
              <button class="btn btn-primary btn-lg btn-full" onclick="pdContactSeller(${p.id}, this)"><i class="fa-solid fa-comment-dots"></i> ${t('pd_contact')}</button>
              <small>${t('pd_contact_hint')}</small>` : ''}
          </div>

          ${orderPanel}
        </div>
      </div>

      <section class="pd2-about">
        <h2 class="v3-h2">${t('pd_about')}</h2>
        <p>${escHtml(p.description || t('no_desc'))}</p>
        <div class="pd2-trust">
          <div class="v3-card"><i class="fa-solid fa-seedling"></i> ${t('pd_badge_fresh')}</div>
          <div class="v3-card"><i class="fa-solid fa-comments"></i> ${t('pd_badge_check')}</div>
          <div class="v3-card"><i class="fa-solid fa-handshake"></i> ${t('pd_badge_direct')}</div>
        </div>
      </section>
    `;

    pdCountView(p, own);

    if (isBuyer) {
      const qtyEl = document.getElementById('qty');
      qtyEl?.addEventListener('input', () => {
        const qty = parseFloat(qtyEl.value) || 1;
        document.getElementById('total-price').textContent = `${fmtNum(qty * Number(p.price))} ${t('currency')}`;
      });

      document.getElementById('cart-btn')?.addEventListener('click', () => {
        const qty = parseInt(qtyEl.value) || 1;
        addToCart(p, qty);
        if (typeof refreshCartBadges === 'function') refreshCartBadges();
        showToast(`«${name}» ${t('cart_added')}`);
      });

      document.getElementById('order-btn')?.addEventListener('click', async () => {
        const quantity = parseInt(qtyEl.value) || 1;
        const pickup_method = document.querySelector('input[name="pickup"]:checked')?.value || 'self';
        const btn = document.getElementById('order-btn');

        if (pickup_method === 'external') {
          showDriverPickerModal(p, quantity);
          return;
        }

        btn.disabled = true;
        btn.textContent = t('ordering_btn');
        try {
          await API.createOrder({ product_id: Number(id), quantity, pickup_method });
          showToast(t('order_success'));
          router.go('/orders');
        } catch (e) {
          showToast(e.message, 'error');
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-check"></i> ${t('pd_order_btn')}`;
        }
      });
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p><i class="fa-solid fa-triangle-exclamation"></i> ${escHtml(e.message)}</p></div>`;
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
  const picker = document.getElementById('driver-picker-modal');
  if (picker) picker.remove();

  const existing = document.getElementById('driver-profile-modal');
  if (existing) existing.remove();

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
      const existingOrderId = sessionStorage.getItem('av_change_driver_order_id');

      let orderId;
      if (existingOrderId) {
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
