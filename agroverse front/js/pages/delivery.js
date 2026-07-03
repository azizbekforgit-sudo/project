/* pages/delivery.js — Йўлчи (Курьер) дашборд AgroVerse
   Sidebar: Главная | Заказы | Карта | Тарифы | ИИ | Кошелёк | Рынок | Профиль
   Onboarding: только грузовые типы транспорта
   Admin approval flow: после регистрации показывает pending banner
*/

// ─── Константы ────────────────────────────────────────────────────────────────

const TRUCK_TYPES = [
  { id: 'fura',       label: 'Фура',         icon: '🚛', desc: 'Тяжёлый грузовик до 20т' },
  { id: 'refrig',     label: 'Рефрижератор', icon: '❄️',  desc: 'Рефрижератор, до 10т' },
  { id: 'tentovan',   label: 'Тентованный',  icon: '🚚', desc: 'Тент-фургон, до 15т' },
  { id: 'samosval',   label: 'Самосвал',     icon: '🚜', desc: 'Самосвал, до 25т' },
  { id: 'bortovoy',   label: 'Бортовой',     icon: '🚐', desc: 'Бортовой грузовик, до 8т' },
];

const SECTIONS = [
  { id: 'home',    icon: '🏠', label: 'Главная' },
  { id: 'orders',  icon: '📦', label: 'Заказы' },
  { id: 'map',     icon: '🗺️', label: 'Карта' },
  { id: 'tariffs', icon: '💳', label: 'Тарифы' },
  { id: 'ai',      icon: '🤖', label: 'ИИ' },
  { id: 'wallet',  icon: '💰', label: 'Кошелёк' },
  { id: 'market',  icon: '🛒', label: 'Рынок' },
  { id: 'profile', icon: '👤', label: 'Профиль' },
];

// ─── State ────────────────────────────────────────────────────────────────────

let _deliveryState = {
  section: 'home',
  profile: null,
  orders: [],
  wallet: { balance: 0, history: [] },
  aiMessages: [],
  onboarding: {
    step: 0,
    transport_type: '',
    max_weight: 5000,
    has_thermo_bag: false,
    experience_years: 0,
    city: '',
    radius_km: 50,
    work_mode: 'flexible',
    work_hours: '08:00-20:00',
    full_name: '',
    phone: '',
    vehicle_number: '',
    license_info: '',
    documents: [],
    bio: '',
    route_from: '',
    route_to: '',
    route_anywhere: false,
    address: '',
  },
  mapInstance: null,
};

// ─── Entry point ──────────────────────────────────────────────────────────────

async function renderDelivery() {
  const app = document.getElementById('app');
  if (!Auth.isLoggedIn || !Auth.isLoggedIn()) {
    if (window.router) router.go('/login');
    return;
  }

  const userRole = Auth.getRole ? Auth.getRole() : (Auth.getUser()?.role || '');

  // Не-курьеры видят страницу поиска курьеров
  if (userRole !== 'courier') {
    _renderFindCourier();
    return;
  }

  app.innerHTML = `<div class="spinner" style="margin:40px auto;display:block;"></div>`;

  // Попробовать загрузить профиль
  try {
    const profile = await API.getCourierProfile().catch(() => null);
    _deliveryState.profile = profile;
  } catch (_) {}

  if (!_deliveryState.profile) {
    _renderOnboarding();
  } else {
    _renderDashboard();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// FIND COURIER PAGE (для не-курьеров: покупатели, фермеры)
// ═══════════════════════════════════════════════════════════════════════════════

async function _renderFindCourier() {
  const app = document.getElementById('app');

  app.innerHTML = pageShell(`
    <div style="max-width:1100px;margin:0 auto;">
      <!-- Hero -->
      <div class="del-hero">
        <div class="del-hero-title">🚛 Доставка грузов</div>
        <div class="del-hero-sub">Найдите проверенного курьера для перевозки вашего груза по всей Узбекистану</div>
      </div>

      <!-- Google Map -->
      <div class="del-map-wrap">
        <div id="del-map" class="del-map"></div>
        <div class="del-map-controls">
          <input type="text" id="del-address" class="del-map-input" placeholder="📍 Введите адрес или кликните на карту..." />
          <select id="del-radius" class="del-radius-select">
            <option value="5">5 км</option>
            <option value="10">10 км</option>
            <option value="25" selected>25 км</option>
            <option value="50">50 км</option>
            <option value="100">100 км</option>
            <option value="500">Весь Узбекистан</option>
          </select>
          <button class="del-search-btn" onclick="_delZoneSearch()">${fe('🔍',16)} Найти</button>
        </div>
      </div>

      <!-- Results -->
      <div id="del-results"></div>

      <!-- How it works -->
      <div style="margin-top:40px;">
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:600;text-align:center;margin-bottom:24px;">Как это работает?</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
          <div class="how-card" style="text-align:center;padding:28px 20px;">
            <div style="font-size:2.5rem;margin-bottom:12px;">${fe('📍',40)}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:6px;">Укажите адрес</div>
            <div style="font-size:13px;color:var(--muted);">Кликните на карту или введите адрес</div>
          </div>
          <div class="how-card" style="text-align:center;padding:28px 20px;">
            <div style="font-size:2.5rem;margin-bottom:12px;">${fe('🔍',40)}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:6px;">Выберите курьера</div>
            <div style="font-size:13px;color:var(--muted);">Сравните рейтинги и тарифы</div>
          </div>
          <div class="how-card" style="text-align:center;padding:28px 20px;">
            <div style="font-size:2.5rem;margin-bottom:12px;">${fe('📦',40)}</div>
            <div style="font-weight:700;font-size:15px;margin-bottom:6px;">Закажите доставку</div>
            <div style="font-size:13px;color:var(--muted);">Быстро, надёжно, с гарантией</div>
          </div>
        </div>
      </div>
    </div>
  `);

  // Init Google Map
  _initDelMap();
}

// ─── Leaflet Map initialization ───────────────────────────────────────────────

let _delMap = null;
let _delMarker = null;
let _delCircle = null;
let _delMarkers = [];

function _initDelMap() {
  const mapEl = document.getElementById('del-map');
  if (!mapEl || !window.L) {
    if (mapEl) mapEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:var(--surface-soft);color:var(--muted);">
        <div style="font-size:48px;margin-bottom:16px;">${fe('🗺️',48)}</div>
        <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Карта</div>
        <div style="font-size:13px;">Введите адрес для поиска курьеров</div>
      </div>`;
    return;
  }

  // Default: Tashkent center
  _delMap = L.map(mapEl, {
    zoomControl: true,
    attributionControl: false,
  }).setView([41.2995, 69.2401], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(_delMap);

  // Click on map → place marker
  _delMap.on('click', (e) => {
    _placeDelMarker(e.latlng.lat, e.latlng.lng);
    // Reverse geocode using Nominatim
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=ru`)
      .then(r => r.json())
      .then(data => {
        if (data.display_name) {
          document.getElementById('del-address').value = data.display_name;
        }
      })
      .catch(() => {});
  });

  // Try to get user location
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _delMap.setView([pos.coords.latitude, pos.coords.longitude], 12);
        _placeDelMarker(pos.coords.latitude, pos.coords.longitude);
      },
      () => {}
    );
  }
}

function _placeDelMarker(lat, lng) {
  if (_delMarker) _delMap.removeLayer(_delMarker);
  if (_delCircle) _delMap.removeLayer(_delCircle);

  _delMarker = L.marker([lat, lng]).addTo(_delMap);

  const radius = parseInt(document.getElementById('del-radius')?.value || 25);
  _delCircle = L.circle([lat, lng], {
    radius: radius * 1000,
    fillColor: '#0a6e3a',
    fillOpacity: 0.08,
    color: '#0a6e3a',
    opacity: 0.3,
    weight: 2,
  }).addTo(_delMap);
}

// ─── Zone search ─────────────────────────────────────────────────────────────

window._delZoneSearch = async function() {
  const results = document.getElementById('del-results');
  if (!results) return;

  let lat = 41.2995, lng = 69.2401; // Default Tashkent
  if (_delMarker) {
    const pos = _delMarker.getPosition();
    lat = pos.lat();
    lng = pos.lng();
  }

  const radius = parseInt(document.getElementById('del-radius')?.value || 25);
  results.innerHTML = '<div class="spinner" style="margin:40px auto;"></div>';

  try {
    const couriers = await API.searchCouriersZone({ lat, lng, radius });

    if (!couriers.length) {
      results.innerHTML = `
        <div style="text-align:center;padding:60px 20px;color:var(--muted);">
          <div style="font-size:48px;margin-bottom:16px;">🚛</div>
          <h3 style="font-size:18px;font-weight:600;color:var(--ink);margin-bottom:8px;">Курьеры не найдены</h3>
          <p style="font-size:14px;">В выбранном радиусе (${radius} км) пока нет активных курьеров.<br>Попробуйте увеличить радиус поиска.</p>
        </div>`;
      return;
    }

    // Place courier markers on map
    if (_delMap && window.L) {
      _delMarkers.forEach(m => _delMap.removeLayer(m));
      _delMarkers = [];
      couriers.forEach(c => {
        if (c.lat && c.lng) {
          const greenIcon = L.divIcon({
            html: '<div style="width:32px;height:32px;background:#0a6e3a;border-radius:50%;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚛</div>',
            className: '',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          });
          const m = L.marker([c.lat, c.lng], { icon: greenIcon }).addTo(_delMap);
          m.on('click', () => _showCourierProfile(c.user_id));
          _delMarkers.push(m);
        }
      });
    }

    results.innerHTML = `
      <h3 style="font-family:var(--font-display);font-size:20px;font-weight:600;margin-bottom:16px;">
        Найдено курьеров: <span style="color:var(--clr-green);">${couriers.length}</span>
      </h3>
      <div class="del-couriers-grid">
        ${couriers.map(c => _renderCourierCard(c)).join('')}
      </div>`;
  } catch (e) {
    results.innerHTML = `<div class="form-error">${e.message}</div>`;
  }
};

// ─── Courier card rendering ──────────────────────────────────────────────────

const TRANSPORT_EMOJI = {
  fura: () => fe('🚛',20), refrig: () => fe('❄️',20), tentovan: () => fe('🚚',20),
  samosval: () => fe('🚜',20), bortovoy: () => fe('🚐',20), moto: () => fe('🏍️',20), car: () => fe('🚗',20),
};

const TRANSPORT_LABEL = {
  fura: 'Фура', refrig: 'Рефрижератор', tentovan: 'Тентованный',
  samosval: 'Самосвал', bortovoy: 'Бортовой', moto: 'Мотоцикл', car: 'Легковой',
};

function _ratingClass(r) {
  if (r <= 3) return 'low';
  if (r <= 6) return 'mid';
  return 'high';
}

function _renderCourierCard(c) {
  const emoji = TRANSPORT_EMOJI[c.transport_type] || '🚛';
  const transport = TRANSPORT_LABEL[c.transport_type] || c.transport_type;
  const rating = c.rating || 0;
  const ratingPct = (rating / 10) * 100;
  const isOnline = c.status === 'online';

  let routeHtml = '';
  if (c.route_anywhere) {
    routeHtml = `<div class="del-cc-route anywhere">🌍 Любое место → любое место</div>`;
  } else if (c.route_from || c.route_to) {
    routeHtml = `<div class="del-cc-route">${c.route_from || 'Откуда угодно'} <span class="route-arrow">→</span> ${c.route_to || 'Куда угодно'}</div>`;
  }

  return `
    <div class="del-courier-card" onclick="_showCourierProfile(${c.user_id})">
      <div class="del-cc-header">
        <div class="del-cc-avatar">${emoji}</div>
        <div class="del-cc-info">
          <div class="del-cc-name">${c.full_name || 'Курьер'}</div>
          <div class="del-cc-transport">${transport}</div>
        </div>
        <div class="del-cc-status ${isOnline ? 'online' : 'offline'}">${isOnline ? 'В сети' : 'Оффлайн'}</div>
      </div>
      <div class="del-cc-body">
        <div class="del-cc-rating">
          <div class="del-rating-bar">
            <div class="del-rating-fill ${_ratingClass(rating)}" style="width:${ratingPct}%"></div>
          </div>
          <div class="del-rating-num">${rating.toFixed(1)}</div>
          <div class="del-rating-label">/10</div>
        </div>
        ${routeHtml}
        <div class="del-cc-stats">
          <div class="del-cc-stat">${fe('📍',14)} ${c.city || 'Узбекистан'}</div>
          <div class="del-cc-stat">⚖️ до ${c.max_weight || 5000} кг</div>
          <div class="del-cc-stat">📅 ${c.experience_years || 0} лет опыта</div>
        </div>
      </div>
      <div class="del-cc-footer">
        <button class="btn btn-primary" onclick="event.stopPropagation(); _showCourierProfile(${c.user_id})">${fe('📋',14)} Профиль</button>
        <button class="btn btn-outline" onclick="event.stopPropagation(); _delOrderCourier(${c.user_id})">${fe('📦',14)} Заказать</button>
      </div>
    </div>`;
}

// ─── Courier profile modal ───────────────────────────────────────────────────

window._showCourierProfile = async function(userId) {
  try {
    const c = await API.getPublicCourierProfile(userId);
  const emojiFn = TRANSPORT_EMOJI[c.transport_type];
  const emoji = emojiFn ? emojiFn() : fe('🚛',20);
    const transport = TRANSPORT_LABEL[c.transport_type] || c.transport_type;
    const rating = c.rating || 0;
    const ratingPct = (rating / 10) * 100;

    const overlay = document.createElement('div');
    overlay.className = 'del-profile-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    let routeSection = '';
    if (c.route_anywhere) {
      routeSection = '<div class="del-cc-route anywhere" style="margin-bottom:0;">🌍 Любое место → любое место</div>';
    } else if (c.route_from || c.route_to) {
      routeSection = `<div class="del-cc-route" style="margin-bottom:0;">${c.route_from || 'Откуда угодно'} <span class="route-arrow">→</span> ${c.route_to || 'Куда угодно'}</div>`;
    }

    overlay.innerHTML = `
      <div class="del-profile-modal">
        <div class="del-profile-header">
          <button class="del-profile-close" onclick="this.closest('.del-profile-overlay').remove()">✕</button>
          <div class="del-profile-avatar">${emoji}</div>
          <div class="del-profile-name">${c.full_name || 'Курьер'}</div>
          <div class="del-profile-transport">${transport} · ${c.city || 'Узбекистан'}</div>
        </div>
        <div class="del-profile-body">
          <!-- Rating -->
          <div class="del-profile-rating-big">
            <div class="del-profile-rating-num">${rating.toFixed(1)}</div>
            <div style="flex:1;">
              <div class="del-profile-rating-bar">
                <div class="del-profile-rating-fill ${_ratingClass(rating)}" style="width:${ratingPct}%"></div>
              </div>
              <div class="del-profile-rating-text">рейтинг из 10</div>
            </div>
          </div>

          <!-- Route -->
          ${routeSection ? `<div class="del-profile-section"><div class="del-profile-section-title">Маршрут</div>${routeSection}</div>` : ''}

          <!-- Details -->
          <div class="del-profile-section">
            <div class="del-profile-section-title">Данные</div>
            <div class="del-profile-row"><span class="label">Телефон</span><span class="value">${c.phone || 'Не указан'}</span></div>
            <div class="del-profile-row"><span class="label">Город</span><span class="value">${c.city || 'Не указан'}</span></div>
            <div class="del-profile-row"><span class="label">Адрес базирования</span><span class="value">${c.address || 'Не указан'}</span></div>
            <div class="del-profile-row"><span class="label">Транспорт</span><span class="value">${emoji} ${transport}</span></div>
            <div class="del-profile-row"><span class="label">Грузоподъёмность</span><span class="value">до ${c.max_weight || 5000} кг</span></div>
            <div class="del-profile-row"><span class="label">Стаж вождения</span><span class="value">${c.experience_years || 0} лет</span></div>
            <div class="del-profile-row"><span class="label">Режим работы</span><span class="value">${c.work_mode === 'flexible' ? 'Гибкий' : c.work_hours || '08:00-20:00'}</span></div>
            <div class="del-profile-row"><span class="label">Номер авто</span><span class="value">${c.vehicle_number || 'Не указан'}</span></div>
            <div class="del-profile-row"><span class="label">Лицензия</span><span class="value">${c.license_info || 'Не указана'}</span></div>
            <div class="del-profile-row"><span class="label">Термосумка</span><span class="value">${c.has_thermo_bag ? `${fe('✅',14)} Есть` : `${fe('❌',14)} Нет`}</span></div>
            ${c.bio ? `<div class="del-profile-row"><span class="label">О себе</span><span class="value">${c.bio}</span></div>` : ''}
          </div>
        </div>
        <div class="del-profile-footer">
          <button class="btn btn-primary btn-lg" onclick="this.closest('.del-profile-overlay').remove(); _delOrderCourier(${c.user_id})">${fe('📦',14)} Заказать доставку</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
  } catch (e) {
    showToast(e.message, 'error');
  }
};

// ─── Order courier (placeholder) ─────────────────────────────────────────────

window._delOrderCourier = function(userId) {
  showToast('Функция заказа доставки — в разработке', 'info');
};

// ═══════════════════════════════════════════════════════════════════════════════
// ONBOARDING (для курьеров)
// ═══════════════════════════════════════════════════════════════════════════════

function _renderOnboarding() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="delivery-onboard">
      <div class="onboard-header">
        <div class="onboard-logo">🚛 AgroVerse Йўлчи</div>
        <p class="onboard-subtitle">Зарегистрируйтесь как курьер за 3 шага</p>
      </div>
      <div class="onboard-progress">
        <div class="op-step ${_deliveryState.onboarding.step >= 0 ? 'active' : ''}" id="ops-0">1. Транспорт</div>
        <div class="op-line"></div>
        <div class="op-step ${_deliveryState.onboarding.step >= 1 ? 'active' : ''}" id="ops-1">2. Маршрут</div>
        <div class="op-line"></div>
        <div class="op-step ${_deliveryState.onboarding.step >= 2 ? 'active' : ''}" id="ops-2">3. Данные</div>
      </div>
      <div id="onboard-step-body"></div>
    </div>
  `;
  _renderOnboardStep();
}

function _renderOnboardStep() {
  const body = document.getElementById('onboard-step-body');
  const s = _deliveryState.onboarding;

  if (s.step === 0) {
    // Шаг 1: Тип транспорта
    body.innerHTML = `
      <div class="onboard-card">
        <h2 class="ob-title">Выберите тип транспорта</h2>
        <p class="ob-desc">AgroVerse работает только с грузовыми перевозками</p>
        <div class="truck-chips">
          ${TRUCK_TYPES.map(tt => `
            <div class="truck-chip ${s.transport_type === tt.id ? 'selected' : ''}"
                 onclick="_selectTruckType('${tt.id}')">
              <div class="tc-icon">${tt.icon}</div>
              <div class="tc-label">${tt.label}</div>
              <div class="tc-desc">${tt.desc}</div>
            </div>
          `).join('')}
        </div>
        <div class="ob-field">
          <label class="ob-label">Грузоподъёмность (кг)</label>
          <input type="number" class="ob-input" id="ob-weight" value="${s.max_weight}" min="100" max="50000" step="100"
                 onchange="_deliveryState.onboarding.max_weight = +this.value">
        </div>
        <div class="ob-checkbox">
          <input type="checkbox" id="ob-thermo" ${s.has_thermo_bag ? 'checked' : ''}
                 onchange="_deliveryState.onboarding.has_thermo_bag = this.checked">
          <label for="ob-thermo">${fe('❄️',14)} Есть рефрижератор / термоизоляция</label>
        </div>
        <button class="btn btn-primary ob-next" onclick="_obNext()">Далее →</button>
      </div>
    `;

  } else if (s.step === 1) {
    // Шаг 2: Маршрут и зона
    body.innerHTML = `
      <div class="onboard-card">
        <h2 class="ob-title">Маршрут и зона</h2>
        <p class="ob-desc">Укажите откуда и куда вы возите груз</p>

        <div class="del-onb-anywhere" style="margin-bottom:16px;">
          <input type="checkbox" id="ob-anywhere" ${s.route_anywhere ? 'checked' : ''}
                 onchange="_deliveryState.onboarding.route_anywhere = this.checked; _toggleRouteInputs()">
          <label for="ob-anywhere">🌍 Возлю из любого места в любое место</label>
        </div>

        <div id="route-inputs" style="${s.route_anywhere ? 'display:none;' : ''}">
          <div class="del-onb-route">
            <div class="del-onb-route-row">
              <span class="route-label">Откуда</span>
              <input type="text" id="ob-route-from" value="${s.route_from}" placeholder="Ташкент"
                     oninput="_deliveryState.onboarding.route_from = this.value">
            </div>
            <div style="text-align:center;font-size:20px;color:var(--clr-green);">↓</div>
            <div class="del-onb-route-row">
              <span class="route-label">Куда</span>
              <input type="text" id="ob-route-to" value="${s.route_to}" placeholder="Самарканд"
                     oninput="_deliveryState.onboarding.route_to = this.value">
            </div>
          </div>
        </div>

        <div class="ob-field" style="margin-top:16px;">
          <label class="ob-label">${fe('📍',14)} Адрес базирования</label>
          <input type="text" class="ob-input" id="ob-address" value="${s.address}" placeholder="Ташкент, ул. Примерная 1"
                 oninput="_deliveryState.onboarding.address = this.value">
          <span class="hint">Ваш фактический адрес (для будущих функций)</span>
        </div>

        <div class="ob-field">
          <label class="ob-label">Город / регион</label>
          <input type="text" class="ob-input" id="ob-city" value="${s.city}" placeholder="Ташкент"
                 oninput="_deliveryState.onboarding.city = this.value">
        </div>
        <div class="ob-field">
          <label class="ob-label">Радиус доставки (км): <b id="radius-val">${s.radius_km}</b></label>
          <input type="range" class="ob-range" id="ob-radius" value="${s.radius_km}" min="10" max="500" step="10"
                 oninput="_deliveryState.onboarding.radius_km = +this.value; document.getElementById('radius-val').textContent = this.value">
        </div>
        <div class="ob-field">
          <label class="ob-label">Опыт вождения (лет)</label>
          <input type="number" class="ob-input" id="ob-exp" value="${s.experience_years}" min="0" max="50"
                 onchange="_deliveryState.onboarding.experience_years = +this.value">
        </div>
        <div class="ob-field">
          <label class="ob-label">Режим работы</label>
          <select class="ob-select" onchange="_deliveryState.onboarding.work_mode = this.value">
            <option value="flexible" ${s.work_mode==='flexible'?'selected':''}>Гибкий</option>
            <option value="day" ${s.work_mode==='day'?'selected':''}>Дневной (09:00–18:00)</option>
            <option value="evening" ${s.work_mode==='evening'?'selected':''}>Вечерний (18:00–24:00)</option>
            <option value="night" ${s.work_mode==='night'?'selected':''}>Ночной (00:00–08:00)</option>
          </select>
        </div>
        <div class="ob-nav">
          <button class="btn btn-ghost" onclick="_obBack()">← Назад</button>
          <button class="btn btn-primary" onclick="_obNext()">Далее →</button>
        </div>
      </div>
    `;

  } else if (s.step === 2) {
    // Шаг 3: Личные данные
    body.innerHTML = `
      <div class="onboard-card">
        <h2 class="ob-title">Личные данные</h2>
        <p class="ob-desc">Ваши данные будут проверены администратором</p>
        <div class="ob-field">
          <label class="ob-label">ФИО</label>
          <input type="text" class="ob-input" id="ob-name" value="${s.full_name}" placeholder="Иванов Иван Иванович"
                 oninput="_deliveryState.onboarding.full_name = this.value">
        </div>
        <div class="ob-field">
          <label class="ob-label">Телефон</label>
          <input type="tel" class="ob-input" id="ob-phone" value="${s.phone}" placeholder="+998 90 000 00 00"
                 oninput="_deliveryState.onboarding.phone = this.value">
        </div>
        <div class="ob-field">
          <label class="ob-label">Гос. номер транспорта</label>
          <input type="text" class="ob-input" id="ob-vehiclenum" value="${s.vehicle_number}" placeholder="01 A 123 BC"
                 oninput="_deliveryState.onboarding.vehicle_number = this.value">
        </div>
        <div class="ob-field">
          <label class="ob-label">Данные водительского удостоверения</label>
          <input type="text" class="ob-input" id="ob-license" value="${s.license_info || ''}" placeholder="AA 1234567"
                 oninput="_deliveryState.onboarding.license_info = this.value">
        </div>
        <div class="ob-field">
          <label class="ob-label">Документы (паспорт, техпаспорт - ссылки)</label>
          <textarea class="ob-input" id="ob-docs" placeholder="https://example.com/doc1.jpg, ..."
                    oninput="_deliveryState.onboarding.documents = this.value.split(',').map(v=>v.trim()).filter(Boolean)">${(s.documents || []).join(', ')}</textarea>
        </div>
        <div class="ob-field">
          <label class="ob-label">О себе (необязательно)</label>
          <textarea class="ob-input ob-textarea" id="ob-bio" placeholder="Опыт, маршруты..."
                    oninput="_deliveryState.onboarding.bio = this.value">${s.bio}</textarea>
        </div>
        <div class="ob-nav">
          <button class="btn btn-ghost" onclick="_obBack()">← Назад</button>
          <button class="btn btn-primary" id="ob-submit" onclick="_obSubmit()">${fe('✅',14)} Отправить заявку</button>
        </div>
      </div>
    `;
  }
}

function _selectTruckType(id) {
  _deliveryState.onboarding.transport_type = id;
  document.querySelectorAll('.truck-chip').forEach(el => {
    el.classList.toggle('selected', el.onclick.toString().includes(`'${id}'`));
  });
  // re-render chips
  document.querySelectorAll('.truck-chip').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.truck-chip').forEach(el => {
    const match = el.getAttribute('onclick') || '';
    if (match.includes(`'${id}'`)) el.classList.add('selected');
  });
}

function _obNext() {
  const s = _deliveryState.onboarding;
  if (s.step === 0 && !s.transport_type) {
    showToast('Выберите тип транспорта', 'error'); return;
  }
  if (s.step === 1 && !s.city.trim()) {
    showToast('Укажите город', 'error'); return;
  }
  s.step = Math.min(s.step + 1, 2);
  _renderOnboarding();
}

window._toggleRouteInputs = function() {
  const el = document.getElementById('route-inputs');
  const cb = document.getElementById('ob-anywhere');
  if (el && cb) {
    el.style.display = cb.checked ? 'none' : '';
  }
};

function _obBack() {
  _deliveryState.onboarding.step = Math.max(_deliveryState.onboarding.step - 1, 0);
  _renderOnboarding();
}

async function _obSubmit() {
  const s = _deliveryState.onboarding;
  if (!s.full_name.trim()) { showToast('Введите ФИО', 'error'); return; }
  if (!s.phone.trim())     { showToast('Введите телефон', 'error'); return; }

  const btn = document.getElementById('ob-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Отправка...'; }

  try {
    await API.setupCourierProfile({
      transport_type:   s.transport_type,
      max_weight:       s.max_weight,
      has_thermo_bag:   s.has_thermo_bag,
      experience_years: s.experience_years,
      city:             s.city,
      radius_km:        s.radius_km,
      work_mode:        s.work_mode,
      work_hours:       s.work_hours,
      full_name:        s.full_name,
      phone:            s.phone,
      vehicle_number:   s.vehicle_number,
      license_info:     s.license_info,
      documents:        s.documents,
      bio:              s.bio,
      route_from:       s.route_from,
      route_to:         s.route_to,
      route_anywhere:   s.route_anywhere,
      address:          s.address,
    });
    showToast('Заявка отправлена! Ожидайте одобрения администратора', 'success');
    const profile = await API.getCourierProfile().catch(() => null);
    _deliveryState.profile = profile;
    _renderDashboard();
  } catch (e) {
    showToast(e.message || 'Ошибка при сохранении', 'error');
    if (btn) { btn.disabled = false; btn.textContent = `${fe('✅',14)} Отправить заявку`; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function _renderDashboard() {
  const app = document.getElementById('app');
  const profile = _deliveryState.profile || {};
  const approved = profile.admin_approved === true || profile.admin_approved === "true";

  app.innerHTML = `
    <div class="delivery-layout">
      <!-- Sidebar — Grouped navigation -->
      <aside class="del-sidebar">
        <div class="ds-brand">
          <span class="ds-logo">🚛</span>
          <span class="ds-name">Йўлчи</span>
        </div>
        <nav class="ds-nav">
          <div class="ds-nav-group-label" style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;padding:8px 14px 4px;">Основное</div>
          ${SECTIONS.slice(0, 4).map(s => `
            <div class="ds-nav-item ${_deliveryState.section === s.id ? 'active' : ''}"
                 id="dnav-${s.id}"
                 onclick="_deliverySection('${s.id}')">
              <span class="ds-nav-icon">${fe(s.icon, 18)}</span>
              <span class="ds-nav-label">${s.label}</span>
            </div>
          `).join('')}
          <div class="ds-nav-group-label" style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.5px;padding:12px 14px 4px;">Инструменты</div>
          ${SECTIONS.slice(4).map(s => `
            <div class="ds-nav-item ${_deliveryState.section === s.id ? 'active' : ''}"
                 id="dnav-${s.id}"
                 onclick="_deliverySection('${s.id}')">
              <span class="ds-nav-icon">${fe(s.icon, 18)}</span>
              <span class="ds-nav-label">${s.label}</span>
            </div>
          `).join('')}
        </nav>
        <div class="ds-footer">
          <div class="ds-courier-info">
            <div class="ds-courier-name">${profile.full_name || 'Курьер'}</div>
            <div class="ds-courier-status ${approved ? 'status-active' : (profile.rejection_reason ? 'status-rejected' : 'status-pending')}">
              ${approved ? `${fe('🟢',14)} Активен` : (profile.rejection_reason ? `${fe('🔴',14)} Отклонен` : `${fe('🟡',14)} На проверке`)}
            </div>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <main class="delivery-main" id="delivery-main">
        <div class="spinner"></div>
      </main>
    </div>
  `;

  _deliverySection(_deliveryState.section);
}

function _deliverySection(id) {
  _deliveryState.section = id;
  // Update nav active
  document.querySelectorAll('.ds-nav-item').forEach(el => {
    el.classList.toggle('active', el.id === `dnav-${id}`);
  });

  const main = document.getElementById('delivery-main');
  if (!main) return;

  switch (id) {
    case 'home':    _sectionHome(main);    break;
    case 'orders':  _sectionOrders(main);  break;
    case 'map':     _sectionMap(main);     break;
    case 'tariffs': _sectionTariffs(main); break;
    case 'ai':      _sectionAI(main);      break;
    case 'wallet':  _sectionWallet(main);  break;
    case 'market':  _sectionMarket(main);  break;
    case 'profile': _sectionProfile(main); break;
    default:        main.innerHTML = '<div class="empty-state">Раздел в разработке</div>';
  }
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

async function _sectionHome(main) {
  const profile = _deliveryState.profile || {};
  const approved = profile.admin_approved === true || profile.admin_approved === "true";

  main.innerHTML = `
    <div class="section-home">
      <div class="section-header">
        <h1 class="section-title">Главная</h1>
        <div class="section-date">${new Date().toLocaleDateString('ru-RU', {weekday:'long', day:'numeric', month:'long'})}</div>
      </div>

      ${!approved ? `
        ${profile.rejection_reason ? `
          <div class="pending-banner rejection-banner">
            <div class="pb-icon">${fe('❌',32)}</div>
            <div class="pb-body">
              <div class="pb-title">Заявка отклонена</div>
              <div class="pb-text">Причина: <b>${profile.rejection_reason}</b></div>
              <button class="btn btn-sm btn-ghost" onclick="_deliveryState.profile=null; _renderOnboarding()" style="margin-top:10px; color:#b91c1c; border-color:#fca5a5;">Исправить данные</button>
            </div>
          </div>
        ` : `
          <div class="pending-banner">
            <div class="pb-icon">${fe('⏳',32)}</div>
            <div class="pb-body">
              <div class="pb-title">Заявка на проверке</div>
              <div class="pb-text">Ваш профиль отправлен администратору. Вы получите доступ к заказам после одобрения.</div>
              <div class="pb-progress">
                <div class="pb-bar">
                  <div class="pb-fill" style="width: 60%"></div>
                </div>
                <div class="pb-bar-label">Проверка данных...</div>
              </div>
            </div>
          </div>
        `}
      ` : ''}

      <!-- Stats row — Bento grid -->
      <div class="home-stats">
        <div class="hs-card clickable" onclick="_deliverySection('orders')">
          <div class="hs-icon">${fe('📦',28)}</div>
          <div class="hs-num" id="stat-available">—</div>
          <div class="hs-label">Доступные</div>
        </div>
        <div class="hs-card">
          <div class="hs-icon">${fe('✅',28)}</div>
          <div class="hs-num" id="stat-done">—</div>
          <div class="hs-label">Доставлено</div>
        </div>
        <div class="hs-card">
          <div class="hs-icon">${fe('⭐',28)}</div>
          <div class="hs-num" id="stat-rating">${profile.rating ?? '0.0'}</div>
          <div class="hs-label">Рейтинг /10</div>
        </div>
        <div class="hs-card clickable" onclick="_deliverySection('wallet')">
          <div class="hs-icon">${fe('💰',28)}</div>
          <div class="hs-num" id="stat-balance">—</div>
          <div class="hs-label">Баланс</div>
        </div>
      </div>

      <!-- Profile completion -->
      <div class="home-section-block">
        <div class="hsb-title">Профиль</div>
        ${_profileCompletionBar(profile)}
      </div>

      <!-- Notifications -->
      <div class="home-section-block">
        <div class="hsb-title">Уведомления</div>
        <div id="notif-list">
          <div class="notif-item">
            <div class="ni-icon">${fe('🎉',24)}</div>
            <div class="ni-body">
              <div class="ni-title">Добро пожаловать в AgroVerse!</div>
              <div class="ni-time">Только что</div>
            </div>
          </div>
          ${!approved ? `
            <div class="notif-item">
              <div class="ni-icon">${fe('🔍',24)}</div>
              <div class="ni-body">
                <div class="ni-title">Ваш профиль проходит проверку</div>
                <div class="ni-time">Сегодня</div>
              </div>
            </div>
          ` : `
            <div class="notif-item">
              <div class="ni-icon">${fe('✅',24)}</div>
              <div class="ni-body">
                <div class="ni-title">Профиль одобрен! Можете принимать заказы</div>
                <div class="ni-time">Сегодня</div>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // Load stats async
  try {
    const [orders, wallet] = await Promise.all([
      API.getCourierOrders().catch(() => []),
      API.getCourierWallet().catch(() => ({ balance: 0, history: [] })),
    ]);
    _deliveryState.orders = orders;
    _deliveryState.wallet = wallet;
    const done = orders.filter(o => o.status === 'delivered').length;
    const el = (id) => document.getElementById(id);
    if (el('stat-done'))    el('stat-done').textContent    = done;
    if (el('stat-balance')) el('stat-balance').textContent = Number(wallet.balance || 0).toLocaleString('ru-RU');

    // Available orders
    const avail = await API.getAvailableOrders().catch(() => []);
    if (el('stat-available')) el('stat-available').textContent = avail.length;
  } catch (_) {}
}

function _profileCompletionBar(profile) {
  const fields = ['full_name', 'phone', 'transport_type', 'city', 'vehicle_number', 'bio'];
  const filled = fields.filter(f => profile[f] && profile[f] !== '').length;
  const pct = Math.round((filled / fields.length) * 100);
  return `
    <div class="profile-completion">
      <div class="pc-bar">
        <div class="pc-fill" style="width:${pct}%"></div>
      </div>
      <div class="pc-label">${pct}% заполнено</div>
    </div>
  `;
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

async function _sectionOrders(main) {
  main.innerHTML = `
    <div class="section-orders">
      <div class="section-header">
        <h1 class="section-title">Заказы</h1>
      </div>
      <div class="orders-tabs">
        <button class="ot-tab active" data-tab="available" onclick="_ordersTab(this,'available')">${fe('📦',16)} Доступные</button>
        <button class="ot-tab" data-tab="accepted"  onclick="_ordersTab(this,'accepted')">${fe('🚚',16)} Принятые</button>
        <button class="ot-tab" data-tab="done"      onclick="_ordersTab(this,'done')">${fe('✅',16)} Выполненные</button>
        <button class="ot-tab" data-tab="cancelled" onclick="_ordersTab(this,'cancelled')">${fe('❌',16)} Отменённые</button>
      </div>
      <div id="orders-list"><div class="spinner"></div></div>
    </div>
  `;
  _loadOrdersTab('available');
}

function _ordersTab(btn, tab) {
  document.querySelectorAll('.ot-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _loadOrdersTab(tab);
}

async function _loadOrdersTab(tab) {
  const list = document.getElementById('orders-list');
  if (!list) return;
  list.innerHTML = '<div class="spinner"></div>';

  try {
    let orders = [];
    if (tab === 'available') {
      orders = await API.getAvailableOrders().catch(() => []);
    } else {
      const all = await API.getCourierOrders().catch(() => []);
      const statusMap = { accepted: 'accepted', done: 'delivered', cancelled: 'cancelled' };
      orders = all.filter(o => o.status === (statusMap[tab] || tab));
    }

    if (!orders.length) {
      list.innerHTML = `<div class="empty-state">${fe('📭',48)} Заказов нет</div>`;
      return;
    }

    list.innerHTML = orders.map(o => _orderCard(o, tab)).join('');
  } catch (e) {
    list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

function _orderCard(o, tab) {
  const price = Number(o.price || 0).toLocaleString('ru-RU');
  const dist  = o.distance_km ? `${o.distance_km} км` : '';
  const cargo = o.cargo || o.cargo_description || 'Груз';
  const from  = o.pickup_address  || '—';
  const to    = o.delivery_address || '—';

  const actions = tab === 'available' ? `
    <button class="btn btn-primary btn-sm" onclick="_acceptOrder(${o.id})">${fe('✅',14)} Принять</button>
  ` : tab === 'accepted' ? `
    <button class="btn btn-success btn-sm" onclick="_deliverOrder(${o.id})">${fe('📦',14)} Доставлен</button>
    <button class="btn btn-ghost btn-sm"   onclick="_cancelOrder(${o.id})">Отмена</button>
  ` : '';

  return `
    <div class="order-card" id="oc-${o.id}">
      <div class="oc-left">
        <div class="oc-cargo-icon">${fe('🌾',24)}</div>
      </div>
      <div class="oc-body">
        <div class="oc-title">${cargo}</div>
        <div class="oc-route">
          <span class="oc-from">${fe('📍',14)} ${from}</span>
          <span class="oc-arrow">→</span>
          <span class="oc-to">🏁 ${to}</span>
        </div>
        ${dist ? `<div class="oc-dist">📏 ${dist}</div>` : ''}
        ${o.weight_kg ? `<div class="oc-weight">⚖️ ${o.weight_kg} кг</div>` : ''}
      </div>
      <div class="oc-right">
        <div class="oc-price">${price} сум</div>
        ${actions ? `<div class="oc-actions">${actions}</div>` : ''}
      </div>
    </div>
  `;
}

async function _acceptOrder(id) {
  try {
    await API.acceptDeliveryOrder(id);
    showToast('Заказ принят! 🚛', 'success');
    _sectionOrders(document.getElementById('delivery-main'));
  } catch (e) { showToast(e.message, 'error'); }
}

async function _deliverOrder(id) {
  try {
    await API.updateDeliveryStatus(id, 'delivered');
    showToast(`Доставлено! ${fe('✅',14)}`, 'success');
    _sectionOrders(document.getElementById('delivery-main'));
  } catch (e) { showToast(e.message, 'error'); }
}

async function _cancelOrder(id) {
  try {
    await API.updateDeliveryStatus(id, 'cancelled');
    showToast('Заказ отменён', 'info');
    _sectionOrders(document.getElementById('delivery-main'));
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── MAP ──────────────────────────────────────────────────────────────────────

async function _sectionMap(main) {
  main.innerHTML = `
    <div class="section-map">
      <div class="section-header">
        <h1 class="section-title">Карта заказов</h1>
        <button class="btn btn-sm btn-primary" onclick="_setOnline()">${fe('📍',14)} Я онлайн</button>
      </div>
      <div id="delivery-map" style="width:100%;height:500px;border-radius:12px;overflow:hidden;"></div>
      <div id="map-orders-list" style="margin-top:16px;"></div>
    </div>
  `;

  // Init map
  if (typeof L === 'undefined') {
    // load leaflet dynamically
    await _loadLeaflet();
  }

  try {
    const map = L.map('delivery-map').setView([41.2995, 69.2401], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    _deliveryState.mapInstance = map;

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        map.setView([lat, lng], 13);
        L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: '<div style="font-size:28px;">🚛</div>', iconSize: [32,32] })
        }).addTo(map).bindPopup('Вы здесь').openPopup();

        // Load nearby orders
        API.getAvailableOrders().then(orders => {
          orders.forEach(o => {
            if (o.pickup_lat && o.pickup_lng) {
              L.marker([o.pickup_lat, o.pickup_lng], {
                icon: L.divIcon({ className: '', html: `<div style="font-size:24px;">${fe('📦',24)}</div>`, iconSize: [28,28] })
              }).addTo(map).bindPopup(`
                <b>${o.cargo || 'Груз'}</b><br>
                ${Number(o.price||0).toLocaleString()} сум<br>
                ${o.distance_km || '?'} км
              `);
            }
          });
        }).catch(() => {});
      });
    }
  } catch (e) {
    main.querySelector('#delivery-map').innerHTML = `<div class="empty-state">Карта недоступна</div>`;
  }
}

async function _loadLeaflet() {
  return new Promise(resolve => {
    if (typeof L !== 'undefined') { resolve(); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = resolve;
    document.head.appendChild(script);
  });
}

async function _setOnline() {
  if (!navigator.geolocation) { showToast('Геолокация недоступна', 'error'); return; }
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    try {
      await API.updateCourierStatus({ status: 'online', lat, lng });
      showToast(`Вы онлайн! ${fe('🟢',14)}`, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  });
}

// ─── TARIFFS ──────────────────────────────────────────────────────────────────

function _sectionTariffs(main) {
  main.innerHTML = `
    <div class="section-tariffs">
      <div class="section-header">
        <h1 class="section-title">Тарифы</h1>
        <p class="section-subtitle">Выберите план, который подходит вашему бизнесу</p>
      </div>
      <div class="tariff-cards">
        <div class="tariff-card">
          <div class="tc-badge">Стандарт</div>
          <div class="tc-price">Бесплатно</div>
          <div class="tc-period">навсегда</div>
          <ul class="tc-features">
            <li>${fe('✅',14)} До 10 заказов в месяц</li>
            <li>${fe('✅',14)} Базовый ИИ-помощник</li>
            <li>${fe('✅',14)} Карта заказов</li>
            <li>${fe('❌',14)} Приоритет в поиске</li>
            <li>${fe('❌',14)} Аналитика</li>
          </ul>
          <button class="btn btn-ghost tc-btn" disabled>Текущий план</button>
        </div>
        <div class="tariff-card featured">
          <div class="tc-top-badge">${fe('⭐',14)} Популярный</div>
          <div class="tc-badge">Оптимальный</div>
          <div class="tc-price">49 900 <span>сум/мес</span></div>
          <div class="tc-period">в месяц</div>
          <ul class="tc-features">
            <li>${fe('✅',14)} Неограниченные заказы</li>
            <li>${fe('✅',14)} Приоритет в поиске</li>
            <li>${fe('✅',14)} Расширенный ИИ</li>
            <li>${fe('✅',14)} Базовая аналитика</li>
            <li>${fe('❌',14)} Выделенный менеджер</li>
          </ul>
          <button class="btn btn-primary tc-btn" onclick="showToast('Скоро доступно!','info')">Выбрать</button>
        </div>
        <div class="tariff-card premium">
          <div class="tc-badge">Премиум</div>
          <div class="tc-price">149 900 <span>сум/мес</span></div>
          <div class="tc-period">в месяц</div>
          <ul class="tc-features">
            <li>${fe('✅',14)} Всё из Оптимального</li>
            <li>${fe('✅',14)} Выделенный менеджер</li>
            <li>${fe('✅',14)} Полная аналитика</li>
            <li>${fe('✅',14)} API доступ</li>
            <li>${fe('✅',14)} Брендирование</li>
          </ul>
          <button class="btn btn-primary tc-btn" onclick="showToast('Скоро доступно!','info')">Выбрать</button>
        </div>
      </div>

      <!-- Calculator -->
      <div class="tariff-calc">
        <h3>${fe('💰',20)} Калькулятор стоимости доставки</h3>
        <div class="calc-row">
          <label>Расстояние (км)</label>
          <input type="number" id="calc-dist" class="ob-input" value="50" min="1" max="2000">
        </div>
        <div class="calc-row">
          <label>Вес груза (кг)</label>
          <input type="number" id="calc-weight" class="ob-input" value="5000" min="100" max="50000">
        </div>
        <button class="btn btn-primary" onclick="_calcPrice()">Рассчитать</button>
        <div id="calc-result" class="calc-result"></div>
      </div>
    </div>
  `;
}

async function _calcPrice() {
  const dist   = +document.getElementById('calc-dist').value   || 50;
  const weight = +document.getElementById('calc-weight').value || 5000;
  const profile = _deliveryState.profile || {};
  const transport = profile.transport_type || 'truck';
  try {
    const res = await API.calculateDeliveryPrice(transport, dist, weight);
    document.getElementById('calc-result').innerHTML = `
      <div class="calc-price-result">
        Стоимость: <b>${Number(res.price).toLocaleString('ru-RU')} сум</b><br>
        <small>Расстояние: ${dist} км · Вес: ${weight} кг</small>
      </div>
    `;
  } catch (e) {
    document.getElementById('calc-result').innerHTML = `<div class="calc-price-result err">${e.message}</div>`;
  }
}

// ─── AI ───────────────────────────────────────────────────────────────────────

function _sectionAI(main) {
  main.innerHTML = `
    <div class="section-ai">
      <div class="section-header">
        <h1 class="section-title">${fe('🤖',24)} ИИ-помощник</h1>
        <p class="section-subtitle">Задайте вопрос о маршрутах, тарифах или заказах</p>
      </div>
      <div class="ai-chat" id="ai-chat">
        <div class="ai-msg ai-bot">
          <div class="ai-msg-bubble">Привет! Я ИИ-помощник AgroVerse. Могу помочь с маршрутами, расчётом стоимости и вопросами по заказам. Чем могу помочь? 🚛</div>
        </div>
        ${_deliveryState.aiMessages.map(m => `
          <div class="ai-msg ${m.role === 'user' ? 'ai-user' : 'ai-bot'}">
            <div class="ai-msg-bubble">${m.text}</div>
          </div>
        `).join('')}
      </div>
      <div class="ai-input-row">
        <input type="text" id="ai-input" class="ai-input" placeholder="Введите вопрос..." 
               onkeydown="if(event.key==='Enter') _sendAIMessage()">
        <button class="btn btn-primary" onclick="_sendAIMessage()">➤</button>
      </div>
    </div>
  `;
}

async function _sendAIMessage() {
  const input = document.getElementById('ai-input');
  const msg = (input?.value || '').trim();
  if (!msg) return;
  input.value = '';

  _deliveryState.aiMessages.push({ role: 'user', text: msg });
  const chat = document.getElementById('ai-chat');
  if (chat) {
    chat.innerHTML += `<div class="ai-msg ai-user"><div class="ai-msg-bubble">${msg}</div></div>`;
    chat.innerHTML += `<div class="ai-msg ai-bot" id="ai-typing"><div class="ai-msg-bubble">${fe('⏳',16)} Думаю...</div></div>`;
    chat.scrollTop = chat.scrollHeight;
  }

  try {
    const res = await API.courierAIChat(msg);
    const typingEl = document.getElementById('ai-typing');
    if (typingEl) typingEl.outerHTML = `<div class="ai-msg ai-bot"><div class="ai-msg-bubble">${res.reply}</div></div>`;
    _deliveryState.aiMessages.push({ role: 'bot', text: res.reply });
    if (chat) chat.scrollTop = chat.scrollHeight;
  } catch (e) {
    const typingEl = document.getElementById('ai-typing');
    if (typingEl) typingEl.outerHTML = `<div class="ai-msg ai-bot"><div class="ai-msg-bubble">Ошибка: ${e.message}</div></div>`;
  }
}

// ─── WALLET ───────────────────────────────────────────────────────────────────

async function _sectionWallet(main) {
  main.innerHTML = `
    <div class="section-wallet">
      <div class="section-header">
        <h1 class="section-title">${fe('💰',24)} Кошелёк</h1>
      </div>
      <div class="wallet-card">
        <div class="wc-label">Текущий баланс</div>
        <div class="wc-balance" id="wallet-balance">Загрузка...</div>
        <div class="wc-actions">
          <button class="btn btn-primary" onclick="_withdrawModal()">${fe('💸',14)} Вывести</button>
        </div>
      </div>
      <div class="wallet-history">
        <h3>История транзакций</h3>
        <div id="wallet-tx-list"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  try {
    const wallet = await API.getCourierWallet();
    _deliveryState.wallet = wallet;
    const balEl = document.getElementById('wallet-balance');
    if (balEl) balEl.textContent = `${Number(wallet.balance || 0).toLocaleString('ru-RU')} сум`;
    const txList = document.getElementById('wallet-tx-list');
    if (txList) {
      if (!wallet.history || !wallet.history.length) {
        txList.innerHTML = `<div class="empty-state">История пуста</div>`;
      } else {
        txList.innerHTML = wallet.history.slice().reverse().map(tx => `
          <div class="tx-item ${tx.type === 'income' ? 'tx-in' : 'tx-out'}">
            <div class="tx-icon">${tx.type === 'income' ? '⬇️' : '⬆️'}</div>
            <div class="tx-body">
              <div class="tx-desc">${tx.desc || tx.method || tx.type}</div>
              <div class="tx-status">${tx.status || ''}</div>
            </div>
            <div class="tx-amount ${tx.type === 'income' ? 'tx-plus' : 'tx-minus'}">
              ${tx.type === 'income' ? '+' : '-'}${Number(tx.amount).toLocaleString('ru-RU')} сум
            </div>
          </div>
        `).join('');
      }
    }
  } catch (e) {
    const el = document.getElementById('wallet-tx-list');
    if (el) el.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

function _withdrawModal() {
  const bal = _deliveryState.wallet?.balance || 0;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-ic">${fe('💸',36)}</div>
      <h3 class="modal-title">Вывод средств</h3>
      <p class="modal-desc">Доступно: ${Number(bal).toLocaleString('ru-RU')} сум</p>
      <input type="number" id="wd-amount" class="ob-input" placeholder="Сумма" max="${bal}" min="1000">
      <select id="wd-method" class="ob-select" style="margin-top:10px;">
        <option value="click">Click</option>
        <option value="payme">Payme</option>
      </select>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="this.closest('.modal-overlay').remove()">Отмена</button>
        <button class="btn btn-primary" id="wd-confirm" onclick="_doWithdraw()">Вывести</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function _doWithdraw() {
  const amount = +document.getElementById('wd-amount').value;
  const method = document.getElementById('wd-method').value;
  if (!amount || amount < 1000) { showToast('Минимум 1 000 сум', 'error'); return; }
  const btn = document.getElementById('wd-confirm');
  btn.disabled = true; btn.textContent = 'Обработка...';
  try {
    await API.withdrawCourierWallet({ amount, method });
    document.querySelector('.modal-overlay')?.remove();
    showToast('Заявка на вывод принята!', 'success');
    _sectionWallet(document.getElementById('delivery-main'));
  } catch (e) {
    showToast(e.message, 'error');
    btn.disabled = false; btn.textContent = 'Вывести';
  }
}

// ─── MARKET ───────────────────────────────────────────────────────────────────

async function _sectionMarket(main) {
  main.innerHTML = `
    <div class="section-market">
      <div class="section-header">
        <h1 class="section-title">${fe('🛒',24)} Рынок</h1>
        <p class="section-subtitle">Товары от фермеров, доступные для доставки</p>
      </div>
      <div id="market-list"><div class="spinner"></div></div>
    </div>
  `;

  try {
    const products = await API.getProducts({}).catch(() => []);
    const list = document.getElementById('market-list');
    if (!list) return;
    if (!products.length) {
      list.innerHTML = `<div class="empty-state">${fe('📦',48)} Товаров пока нет</div>`;
      return;
    }
    list.innerHTML = `<div class="market-grid">
      ${products.slice(0, 20).map(p => `
        <div class="market-card">
          ${p.images && p.images.length ? `<img src="${p.images[0]}" class="mc-img" alt="${p.name}">` : `<div class="mc-img-placeholder">${fe('🌾',40)}</div>`}
          <div class="mc-body">
            <div class="mc-title">${p.name || 'Без названия'}</div>
            <div class="mc-farmer">${fe('🌱',14)} ${p.fermer_name || 'Фермер'}</div>
            <div class="mc-price">${Number(p.price ?? 0).toLocaleString('ru-RU')} сум/${p.unit || 'кг'}</div>
          </div>
        </div>
      `).join('')}
    </div>`;
  } catch (e) {
    const list = document.getElementById('market-list');
    if (list) list.innerHTML = `<div class="empty-state">${e.message}</div>`;
  }
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

function _sectionProfile(main) {
  const p = _deliveryState.profile || {};
  const tt = TRUCK_TYPES.find(t => t.id === p.transport_type);
  const approved = p.admin_approved === true || p.admin_approved === "true";

  main.innerHTML = `
    <div class="section-profile">
      <div class="section-header">
        <h1 class="section-title">${fe('👤',24)} Профиль</h1>
      </div>

      ${!approved ? `
        <div class="pending-banner">
          <div class="pb-icon">${fe('⏳',32)}</div>
          <div class="pb-body">
            <div class="pb-title">Ожидает одобрения администратора</div>
            <div class="pb-text">Ваши данные проверяются. Обычно это занимает 1–2 рабочих дня.</div>
            <div class="pb-progress">
              <div class="pb-bar"><div class="pb-fill" style="width:60%"></div></div>
              <div class="pb-bar-label">На рассмотрении...</div>
            </div>
          </div>
        </div>
      ` : `
        <div class="approved-banner">${fe('✅',16)} Профиль одобрен и активен</div>
      `}

      <div class="profile-card">
        <div class="profile-avatar">🚛</div>
        <div class="profile-name">${p.full_name || 'Не указано'}</div>
        <div class="profile-role">Йўлчи · ${tt ? tt.label : p.transport_type || '—'}</div>
        <div class="profile-rating">${fe('⭐',16)} ${p.rating ?? '0.0'}</div>
      </div>

      <!-- Completion bar -->
      ${_profileCompletionBar(p)}

      <div class="profile-details">
        ${_profileRow('📞', 'Телефон', p.phone)}
        ${_profileRow('🏙️', 'Город', p.city)}
        ${_profileRow('🚛', 'Транспорт', tt ? `${tt.icon} ${tt.label}` : p.transport_type || '—')}
        ${_profileRow('⚖️', 'Грузоподъёмность', p.max_weight ? `${p.max_weight} кг` : '—')}
        ${_profileRow(fe('🔢',16), 'Гос. номер', p.vehicle_number)}
        ${_profileRow(fe('📍',16), 'Радиус', p.radius_km ? `${p.radius_km} км` : '—')}
        ${_profileRow(fe('❄️',16), 'Рефрижератор', p.has_thermo_bag ? 'Да' : 'Нет')}
        ${p.bio ? _profileRow('📝', 'О себе', p.bio) : ''}
      </div>

      <button class="btn btn-ghost" style="margin-top:16px;width:100%;" 
              onclick="_editProfile()">${fe('✏️',14)} Редактировать профиль</button>
      <button class="btn btn-danger-ghost" style="margin-top:8px;width:100%;" 
              onclick="Auth.logout ? Auth.logout() : (localStorage.clear(), router.go('/login'))">Выйти</button>
    </div>
  `;
}

function _profileRow(icon, label, value) {
  return `
    <div class="pdetail-row">
      <span class="pdr-icon">${icon}</span>
      <span class="pdr-label">${label}</span>
      <span class="pdr-value">${value || '—'}</span>
    </div>
  `;
}

function _editProfile() {
  // Pre-fill onboarding state with existing profile
  const p = _deliveryState.profile || {};
  _deliveryState.onboarding = {
    step: 0,
    transport_type: p.transport_type || '',
    max_weight: p.max_weight || 5000,
    has_thermo_bag: p.has_thermo_bag || false,
    experience_years: p.experience_years || 0,
    city: p.city || '',
    radius_km: p.radius_km || 50,
    work_mode: p.work_mode || 'flexible',
    work_hours: p.work_hours || '08:00-20:00',
    full_name: p.full_name || '',
    phone: p.phone || '',
    vehicle_number: p.vehicle_number || '',
    license_info: p.license_info || '',
    bio: p.bio || '',
    documents: p.documents || [],
  };
  _renderOnboarding();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CSS STYLES (injected once)
// ═══════════════════════════════════════════════════════════════════════════════

(function _injectDeliveryStyles() {
  if (document.getElementById('delivery-styles')) return;
  const style = document.createElement('style');
  style.id = 'delivery-styles';
  style.textContent = `
    /* ── Layout ── */
    .delivery-layout {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: var(--bg, #f9fafb);
      font-family: var(--font-body, 'Inter', system-ui, sans-serif);
    }

    /* ── Sidebar ── */
    .delivery-sidebar {
      width: 240px;
      min-width: 240px;
      background: var(--bg-card, #fff);
      border-right: 1px solid var(--line, rgba(0,0,0,0.08));
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      z-index: 10;
    }
    .ds-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 22px 20px;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      border-bottom: none;
    }
    .ds-logo { font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
    .ds-name {
      font-size: 18px; font-weight: 800; color: #fff;
      font-family: var(--font-display, 'Unbounded', sans-serif);
      letter-spacing: 0.3px;
    }
    .ds-nav { flex: 1; padding: 12px 10px; }
    .ds-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 16px;
      cursor: pointer;
      color: var(--txt-2, #6B7280);
      border-radius: var(--radius-sm, 12px);
      margin: 2px 0;
      transition: all 0.2s;
      font-size: 14px;
      font-weight: 500;
      border: 1px solid transparent;
    }
    .ds-nav-item:hover {
      background: rgba(74,222,128,0.07);
      color: var(--txt, #111827);
      border-color: var(--line, rgba(0,0,0,0.08));
    }
    .ds-nav-item.active {
      background: rgba(74,222,128,0.12);
      color: var(--clr-primary, #10B981);
      font-weight: 600;
      border-color: var(--line-2, rgba(16,185,129,0.3));
      box-shadow: 0 0 0 3px rgba(74,222,128,0.08);
    }
    .ds-nav-icon { font-size: 18px; width: 24px; text-align: center; }
    .ds-nav-label { font-weight: 500; }
    .ds-footer {
      padding: 16px 20px;
      border-top: 1px solid var(--line, rgba(0,0,0,0.08));
      background: rgba(74,222,128,0.03);
    }
    .ds-courier-name {
      color: var(--txt, #111827); font-weight: 700; font-size: 14px;
    }
    .ds-courier-status {
      font-size: 12px; margin-top: 4px; font-weight: 500;
    }
    .status-active { color: var(--clr-primary, #10B981); }
    .status-pending { color: var(--clr-warn, #F59E0B); }
    .status-rejected { color: var(--clr-error, #EF4444); }

    /* ── Main ── */
    .delivery-main {
      flex: 1;
      overflow-y: auto;
      padding: 32px;
    }

    /* ── Section header ── */
    .section-header { margin-bottom: 28px; }
    .section-title {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: clamp(24px, 3vw, 30px);
      font-weight: 700; color: var(--txt, #111827);
      margin: 0 0 4px; letter-spacing: -0.5px;
    }
    .section-subtitle { color: var(--txt-2, #6B7280); font-size: 15px; margin: 0; }
    .section-date { color: var(--txt-3, #9CA3AF); font-size: 13px; margin-top: 4px; }

    /* ── Home stats ── */
    .home-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 18px;
      margin-bottom: 28px;
    }
    .hs-card {
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      padding: 22px;
      text-align: center;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .hs-card.clickable { cursor: pointer; }
    .hs-card.clickable:hover {
      transform: translateY(-3px);
      box-shadow: 0 0 20px rgba(16,185,129,0.15);
      border-color: var(--clr-primary, #10B981);
    }
    .hs-icon {
      width: 48px; height: 48px; border-radius: 14px;
      background: rgba(74,222,128,0.1);
      display: grid; place-items: center;
      margin: 0 auto 12px; font-size: 24px;
    }
    .hs-num {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: 28px; font-weight: 800; color: var(--txt, #111827);
    }
    .hs-label { font-size: 12px; color: var(--txt-3, #9CA3AF); margin-top: 6px; font-weight: 500; }

    /* ── Pending banner ── */
    .pending-banner {
      display: flex;
      gap: 16px;
      background: #fffbeb;
      border: 1px solid rgba(245,158,11,0.3);
      border-radius: var(--radius, 18px);
      padding: 22px;
      margin-bottom: 24px;
      box-shadow: 0 2px 12px rgba(245,158,11,0.08);
    }
    .rejection-banner {
      background: #fef2f2;
      border-color: rgba(248,113,113,0.3);
      box-shadow: 0 2px 12px rgba(248,113,113,0.08);
    }
    .pb-icon { font-size: 36px; flex-shrink: 0; }
    .pb-title { font-weight: 700; color: #92400e; font-size: 16px; margin-bottom: 6px; }
    .rejection-banner .pb-title { color: #991b1b; }
    .pb-text { color: #78350f; font-size: 14px; margin-bottom: 14px; line-height: 1.5; }
    .rejection-banner .pb-text { color: #991b1b; }
    .pb-progress { }
    .pb-bar { height: 6px; background: #fde68a; border-radius: 3px; overflow: hidden; }
    .pb-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 3px; }
    .pb-bar-label { font-size: 12px; color: #92400e; margin-top: 6px; font-weight: 500; }

    .approved-banner {
      background: rgba(74,222,128,0.08);
      border: 1px solid var(--line-2, rgba(16,185,129,0.3));
      color: var(--clr-primary-dk, #059669);
      padding: 14px 20px;
      border-radius: var(--radius-sm, 12px);
      margin-bottom: 22px;
      font-weight: 600; font-size: 14px;
      display: flex; align-items: center; gap: 8px;
    }

    /* ── Home blocks ── */
    .home-section-block {
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      padding: 22px;
      margin-bottom: 18px;
    }
    .hsb-title {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-weight: 700; color: var(--txt, #111827);
      margin-bottom: 16px; font-size: 16px;
    }

    /* ── Profile completion ── */
    .profile-completion { display: flex; align-items: center; gap: 14px; }
    .pc-bar { flex: 1; height: 8px; background: var(--bg-input, #F3F4F6); border-radius: 4px; overflow: hidden; }
    .pc-fill { height: 100%; background: var(--gradient-primary, linear-gradient(135deg, #10B981, #059669)); border-radius: 4px; transition: width 0.5s; }
    .pc-label { font-size: 13px; color: var(--txt-3, #9CA3AF); white-space: nowrap; font-weight: 600; }

    /* ── Notifications ── */
    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--line, rgba(0,0,0,0.08));
    }
    .notif-item:last-child { border-bottom: none; }
    .ni-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(74,222,128,0.1);
      display: grid; place-items: center; font-size: 18px; flex-shrink: 0;
    }
    .ni-title { font-size: 14px; color: var(--txt, #111827); font-weight: 500; }
    .ni-time { font-size: 12px; color: var(--txt-3, #9CA3AF); margin-top: 3px; }

    /* ── Orders ── */
    .orders-tabs {
      display: flex; gap: 10px; margin-bottom: 22px; flex-wrap: wrap;
    }
    .ot-tab {
      padding: 10px 20px;
      border-radius: 30px;
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      background: var(--bg-card, #fff);
      color: var(--txt-2, #6B7280);
      font-size: 13.5px; font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; gap: 6px;
    }
    .ot-tab:hover { border-color: var(--clr-primary, #10B981); color: var(--clr-primary, #10B981); }
    .ot-tab.active {
      background: var(--gradient-primary, linear-gradient(135deg, #10B981, #059669));
      color: #fff; border-color: transparent;
      box-shadow: 0 4px 14px rgba(16,185,129,0.3);
    }

    .order-card {
      display: flex;
      align-items: center;
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      padding: 18px;
      margin-bottom: 14px;
      gap: 16px;
      transition: box-shadow 0.2s, transform 0.18s;
    }
    .order-card:hover {
      box-shadow: 0 6px 24px rgba(0,0,0,0.08);
      transform: translateY(-2px);
    }
    .oc-left { }
    .oc-cargo-icon {
      font-size: 38px;
      width: 56px; height: 56px;
      display: grid; place-items: center;
      background: rgba(74,222,128,0.08);
      border-radius: 14px;
    }
    .oc-body { flex: 1; min-width: 0; }
    .oc-title { font-weight: 700; color: var(--txt, #111827); font-size: 15px; margin-bottom: 6px; }
    .oc-route {
      display: flex; align-items: center; gap: 6px;
      flex-wrap: wrap; font-size: 13px; color: var(--txt-2, #6B7280);
      margin-bottom: 4px;
    }
    .oc-arrow { color: var(--clr-primary, #10B981); font-weight: 700; }
    .oc-dist, .oc-weight { font-size: 12px; color: var(--txt-3, #9CA3AF); }
    .oc-right { text-align: right; flex-shrink: 0; }
    .oc-price {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: 18px; font-weight: 800;
      color: var(--clr-primary, #10B981);
      margin-bottom: 10px;
    }
    .oc-actions { display: flex; flex-direction: column; gap: 6px; }
    .btn-sm { font-size: 12px; padding: 7px 14px; border-radius: 8px; }

    /* ── Tariffs ── */
    .tariff-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
      margin-bottom: 32px;
    }
    .tariff-card {
      background: var(--bg-card, #F9FAFB);
      border: 2px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius-lg, 26px);
      padding: 30px;
      transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
      position: relative;
    }
    .tariff-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 0 20px rgba(16,185,129,0.15);
    }
    .tariff-card.featured {
      border-color: var(--clr-primary, #10B981);
      box-shadow: 0 0 20px rgba(16,185,129,0.15);
    }
    .tariff-card.premium { border-color: #7c3aed; }
    .tc-top-badge {
      position: absolute;
      top: -12px; left: 50%; transform: translateX(-50%);
      background: var(--gradient-primary, linear-gradient(135deg, #10B981, #059669));
      color: #fff;
      padding: 5px 16px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
      box-shadow: 0 4px 12px rgba(16,185,129,0.3);
    }
    .tc-badge {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-weight: 700; color: var(--txt, #111827);
      font-size: 18px; margin-bottom: 12px;
    }
    .tc-price {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: 28px; font-weight: 800; color: var(--txt, #111827);
    }
    .tc-price span { font-size: 14px; color: var(--txt-3, #9CA3AF); font-weight: 400; }
    .tc-period { font-size: 12px; color: var(--txt-3, #9CA3AF); margin-bottom: 20px; }
    .tc-features { list-style: none; padding: 0; margin: 0 0 22px; }
    .tc-features li { font-size: 14px; color: var(--txt-2, #6B7280); padding: 6px 0; display: flex; align-items: center; gap: 6px; }
    .tc-btn { width: 100%; }

    .tariff-calc {
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      padding: 26px;
    }
    .tariff-calc h3 {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      margin: 0 0 18px; color: var(--txt, #111827); font-size: 18px;
    }
    .calc-row { margin-bottom: 16px; }
    .calc-row label {
      display: block; font-size: 13px; color: var(--txt-3, #9CA3AF);
      margin-bottom: 6px; font-weight: 600;
    }
    .calc-result { margin-top: 18px; }
    .calc-price-result {
      background: rgba(74,222,128,0.06);
      border: 1px solid var(--line-2, rgba(16,185,129,0.3));
      padding: 16px;
      border-radius: var(--radius-sm, 12px);
      font-size: 16px; font-weight: 600;
      color: var(--clr-primary-dk, #059669);
    }
    .calc-price-result.err {
      background: rgba(248,113,113,0.08);
      border-color: rgba(248,113,113,0.3);
      color: var(--clr-error, #EF4444);
    }

    /* ── AI Chat ── */
    .section-ai { display: flex; flex-direction: column; height: calc(100vh - 130px); }
    .ai-chat {
      flex: 1;
      overflow-y: auto;
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      padding: 18px;
      margin-bottom: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ai-msg { display: flex; }
    .ai-user { justify-content: flex-end; }
    .ai-bot  { justify-content: flex-start; }
    .ai-msg-bubble {
      max-width: 72%;
      padding: 12px 16px;
      border-radius: 18px;
      font-size: 14px;
      line-height: 1.55;
    }
    .ai-user .ai-msg-bubble {
      background: var(--gradient-primary, linear-gradient(135deg, #10B981, #059669));
      color: #fff;
      border-radius: 18px 18px 4px 18px;
    }
    .ai-bot .ai-msg-bubble {
      background: #fff;
      color: var(--txt, #111827);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: 18px 18px 18px 4px;
    }
    .ai-input-row { display: flex; gap: 12px; }
    .ai-input {
      flex: 1;
      padding: 13px 18px;
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: 30px;
      font-size: 14px;
      outline: none;
      background: var(--bg-card, #fff);
      transition: border-color 0.2s;
    }
    .ai-input:focus {
      border-color: var(--clr-primary, #10B981);
      box-shadow: 0 0 0 3px rgba(74,222,128,0.12);
    }

    /* ── Wallet ── */
    .wallet-card {
      background: linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%);
      border-radius: var(--radius-lg, 26px);
      padding: 36px;
      color: #fff;
      margin-bottom: 26px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .wallet-card::before {
      content: ''; position: absolute; inset: 0;
      background: radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.12) 0%, transparent 60%);
      pointer-events: none;
    }
    .wc-label { font-size: 14px; opacity: 0.8; margin-bottom: 8px; position: relative; }
    .wc-balance {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: 40px; font-weight: 800; margin-bottom: 22px;
      position: relative;
    }
    .wc-actions { display: flex; justify-content: center; gap: 12px; position: relative; }
    .wallet-history h3 {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      margin: 0 0 16px; color: var(--txt, #111827); font-size: 18px;
    }
    .tx-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius-sm, 12px);
      margin-bottom: 10px;
      transition: border-color 0.2s;
    }
    .tx-item:hover { border-color: var(--line-2, rgba(16,185,129,0.3)); }
    .tx-icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(74,222,128,0.08);
      display: grid; place-items: center; font-size: 18px;
    }
    .tx-body { flex: 1; }
    .tx-desc { font-size: 14px; color: var(--txt, #111827); font-weight: 500; }
    .tx-status { font-size: 12px; color: var(--txt-3, #9CA3AF); margin-top: 2px; }
    .tx-amount { font-weight: 700; font-size: 15px; }
    .tx-plus { color: var(--clr-primary, #10B981); }
    .tx-minus { color: var(--clr-error, #EF4444); }

    /* ── Market ── */
    .market-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 18px;
    }
    .market-card {
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      overflow: hidden;
      transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
    }
    .market-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 28px rgba(0,0,0,0.1);
      border-color: var(--clr-primary, #10B981);
    }
    .mc-img { width: 100%; height: 150px; object-fit: cover; }
    .mc-img-placeholder {
      width: 100%; height: 150px;
      background: linear-gradient(135deg, rgba(74,222,128,0.08), rgba(16,185,129,0.04));
      display: flex; align-items: center; justify-content: center; font-size: 44px;
    }
    .mc-body { padding: 14px 16px; }
    .mc-title { font-weight: 700; color: var(--txt, #111827); font-size: 14px; margin-bottom: 4px; }
    .mc-farmer { font-size: 12px; color: var(--txt-3, #9CA3AF); margin-bottom: 6px; }
    .mc-price {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-weight: 700; color: var(--clr-primary, #10B981); font-size: 15px;
    }

    /* ── Profile ── */
    .profile-card {
      text-align: center;
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius-lg, 26px);
      padding: 32px;
      margin-bottom: 22px;
    }
    .profile-avatar { font-size: 60px; margin-bottom: 12px; }
    .profile-name {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: 22px; font-weight: 700; color: var(--txt, #111827);
    }
    .profile-role { font-size: 14px; color: var(--txt-2, #6B7280); margin-top: 6px; }
    .profile-rating { font-size: 16px; margin-top: 10px; }
    .profile-details {
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      padding: 18px;
    }
    .pdetail-row {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 0;
      border-bottom: 1px solid var(--line, rgba(0,0,0,0.08));
    }
    .pdetail-row:last-child { border-bottom: none; }
    .pdr-icon { font-size: 18px; width: 30px; text-align: center; }
    .pdr-label { flex: 1; font-size: 14px; color: var(--txt-2, #6B7280); }
    .pdr-value { font-size: 14px; font-weight: 600; color: var(--txt, #111827); }

    /* ── Onboarding ── */
    .delivery-onboard {
      max-width: 600px;
      margin: 40px auto;
      padding: 0 16px;
    }
    .onboard-header { text-align: center; margin-bottom: 32px; }
    .onboard-logo {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: 28px; font-weight: 800; color: var(--txt, #111827);
    }
    .onboard-subtitle { color: var(--txt-2, #6B7280); font-size: 15px; margin-top: 8px; }
    .onboard-progress {
      display: flex;
      align-items: center;
      margin-bottom: 32px;
    }
    .op-step {
      flex: 1;
      text-align: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--txt-3, #9CA3AF);
      padding: 10px 6px;
      border-radius: var(--radius-sm, 12px);
      transition: all 0.2s;
    }
    .op-step.active { color: var(--clr-primary, #10B981); background: rgba(74,222,128,0.08); }
    .op-line { flex: 0.3; height: 2px; background: var(--line, rgba(0,0,0,0.08)); }
    .onboard-card {
      background: var(--bg-card, #F9FAFB);
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius-lg, 26px);
      padding: 30px;
    }
    .ob-title {
      font-family: var(--font-display, 'Unbounded', sans-serif);
      font-size: 22px; font-weight: 700; color: var(--txt, #111827); margin: 0 0 8px;
    }
    .ob-desc { color: var(--txt-2, #6B7280); font-size: 15px; margin: 0 0 24px; }
    .ob-field { margin-bottom: 18px; }
    .ob-label {
      display: block; font-size: 13px; color: var(--txt-3, #9CA3AF);
      margin-bottom: 6px; font-weight: 600;
    }
    .ob-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius-sm, 12px);
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      background: #fff;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ob-input:focus {
      border-color: var(--clr-primary, #10B981);
      box-shadow: 0 0 0 3px rgba(74,222,128,0.12);
    }
    .ob-textarea { resize: vertical; min-height: 80px; }
    .ob-select {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius-sm, 12px);
      font-size: 14px;
      outline: none;
      background: #fff;
    }
    .ob-range { width: 100%; accent-color: var(--clr-primary, #10B981); }
    .ob-checkbox {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 22px; font-size: 14px; cursor: pointer;
    }
    .ob-next { width: 100%; margin-top: 10px; }
    .ob-nav { display: flex; gap: 12px; margin-top: 10px; }
    .ob-nav .btn { flex: 1; }

    /* Truck chips */
    .truck-chips {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }
    .truck-chip {
      border: 2px solid var(--line, rgba(0,0,0,0.08));
      border-radius: var(--radius, 18px);
      padding: 16px 14px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
      background: #fff;
    }
    .truck-chip:hover {
      border-color: var(--clr-primary, #10B981);
      background: rgba(74,222,128,0.04);
      transform: translateY(-2px);
    }
    .truck-chip.selected {
      border-color: var(--clr-primary, #10B981);
      background: rgba(74,222,128,0.08);
      box-shadow: 0 0 0 3px rgba(74,222,128,0.12);
    }
    .tc-icon { font-size: 32px; margin-bottom: 8px; }
    .tc-label { font-weight: 700; font-size: 14px; color: var(--txt, #111827); }
    .tc-desc { font-size: 11px; color: var(--txt-3, #9CA3AF); margin-top: 4px; }

    /* ── Misc ── */
    .empty-state { text-align: center; padding: 48px; color: var(--txt-3, #9CA3AF); font-size: 15px; }
    .btn-success {
      background: var(--gradient-primary, linear-gradient(135deg, #10B981, #059669));
      color: #fff; border: none;
      box-shadow: 0 4px 14px rgba(16,185,129,0.3);
    }
    .btn-success:hover { box-shadow: 0 6px 20px rgba(16,185,129,0.4); }
    .btn-danger-ghost {
      background: transparent; color: var(--clr-error, #EF4444);
      border: 1px solid rgba(248,113,113,0.3);
      border-radius: 10px; padding: 10px 16px;
      cursor: pointer; font-size: 14px; transition: all 0.2s;
    }
    .btn-danger-ghost:hover { background: rgba(248,113,113,0.06); border-color: var(--clr-error, #EF4444); }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .delivery-sidebar {
        width: 64px; min-width: 64px;
        border-right: 1px solid var(--line, rgba(0,0,0,0.08));
      }
      .ds-name, .ds-nav-label, .ds-courier-name, .ds-courier-status { display: none; }
      .ds-brand { justify-content: center; padding: 18px 10px; }
      .ds-nav-item { justify-content: center; padding: 12px; margin: 2px 4px; }
      .ds-footer { display: none; }
      .home-stats { grid-template-columns: repeat(2, 1fr); }
      .tariff-cards { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .delivery-main { padding: 18px; }
      .home-stats { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    }
  `;
  document.head.appendChild(style);
})();

// ═══════════════════════════════════════════════════════════════════════════════
// API WRAPPERS (если нет в глобальном API)
// ═══════════════════════════════════════════════════════════════════════════════

(function _ensureAPIWrappers() {
  if (!window.API) window.API = {};

  const base = window.API._base || (
    window.API._base = window.location.hostname.includes('localhost')
      ? 'http://localhost:8000'
      : (typeof BASE_URL !== 'undefined' ? BASE_URL : 'https://project-production-5501.up.railway.app')
  );

  const authGet  = (url, params) => {
    const token = localStorage.getItem('access_token');
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetch(base + url + qs, { headers: { Authorization: `Bearer ${token}` } }).then(r => {
      if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.detail || r.statusText)));
      return r.json();
    });
  };
  const authPost = (url, body) => {
    const token = localStorage.getItem('access_token');
    return fetch(base + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(r => {
      if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.detail || r.statusText)));
      return r.json();
    });
  };
  const authPut  = (url, body) => {
    const token = localStorage.getItem('access_token');
    return fetch(base + url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }).then(r => {
      if (!r.ok) return r.json().then(e => Promise.reject(new Error(e.detail || r.statusText)));
      return r.json();
    });
  };

  if (!API.getCourierProfile)       API.getCourierProfile       = ()      => authGet('/api/courier/profile');
  if (!API.setupCourierProfile)     API.setupCourierProfile     = (d)     => authPost('/api/courier/profile/setup', d);
  if (!API.updateCourierStatus)     API.updateCourierStatus     = (d)     => authPut('/api/courier/status', d);
  if (!API.getCourierOrders)        API.getCourierOrders        = ()      => authGet('/api/courier/orders');
  if (!API.getAvailableOrders)      API.getAvailableOrders      = ()      => authGet('/api/delivery/available-orders');
  if (!API.acceptDeliveryOrder)     API.acceptDeliveryOrder     = (id)    => authPost(`/api/delivery/orders/${id}/accept`, {});
  if (!API.updateDeliveryStatus)    API.updateDeliveryStatus    = (id, s) => authPut(`/api/delivery/orders/${id}/status`, { status: s });
  if (!API.getCourierWallet)        API.getCourierWallet        = ()      => authGet('/api/courier/wallet');
  if (!API.withdrawCourierWallet)   API.withdrawCourierWallet   = (d)     => authPost('/api/courier/wallet/withdraw', d);
  if (!API.courierAIChat)           API.courierAIChat           = (msg)   => authPost('/api/courier/ai/chat', { message: msg });
  if (!API.calculateDeliveryPrice)  API.calculateDeliveryPrice  = (t,d,w) => authGet('/api/delivery/calculate', { transport: t, distance_km: d, weight_kg: w });
})();

// ─── Exports ──────────────────────────────────────────────────────────────────

window.renderDelivery       = renderDelivery;
window._deliverySection     = _deliverySection;
window._selectTruckType     = _selectTruckType;
window._obNext              = _obNext;
window._obBack              = _obBack;
window._obSubmit            = _obSubmit;
window._ordersTab           = _ordersTab;
window._acceptOrder         = _acceptOrder;
window._deliverOrder        = _deliverOrder;
window._cancelOrder         = _cancelOrder;
window._setOnline           = _setOnline;
window._calcPrice           = _calcPrice;
window._sendAIMessage       = _sendAIMessage;
window._withdrawModal       = _withdrawModal;
window._doWithdraw          = _doWithdraw;
window._editProfile         = _editProfile;
