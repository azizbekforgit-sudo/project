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
    step: 0,      // 0=transport 1=zone 2=docs
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

  // Inject styles if needed
  if (!document.getElementById('fc-styles')) {
    const s = document.createElement('style');
    s.id = 'fc-styles';
    s.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

      .fc-page {
        min-height: 100vh;
        background: #f0f4f8;
        font-family: 'Inter', sans-serif;
      }

      /* ── Top nav ── */
      .fc-nav {
        background: #fff;
        border-bottom: 1px solid #e8ecf0;
        padding: 14px 28px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 1px 8px rgba(0,0,0,0.05);
      }
      .fc-nav-logo {
        font-size: 22px;
        font-weight: 800;
        color: #16a34a;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fc-nav-logo img {
        width: 32px; height: 32px; border-radius: 8px;
      }
      .fc-nav-back {
        margin-left: auto;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #16a34a;
        border-radius: 8px;
        padding: 7px 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.18s;
      }
      .fc-nav-back:hover { background: #dcfce7; }

      /* ── Layout ── */
      .fc-layout {
        display: flex;
        height: calc(100vh - 57px);
        overflow: hidden;
      }

      /* ── Sidebar ── */
      .fc-sidebar {
        width: 320px;
        min-width: 320px;
        background: #fff;
        border-right: 1px solid #e8ecf0;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        box-shadow: 2px 0 12px rgba(0,0,0,0.04);
        z-index: 2;
      }
      .fc-sidebar-header {
        padding: 22px 20px 16px;
        border-bottom: 1px solid #f1f5f9;
      }
      .fc-sidebar-title {
        font-size: 20px;
        font-weight: 800;
        color: #1e293b;
        margin: 0 0 4px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .fc-sidebar-sub {
        font-size: 13px;
        color: #64748b;
        margin: 0;
      }

      /* ── Search form ── */
      .fc-search-form {
        padding: 16px 20px;
        border-bottom: 1px solid #f1f5f9;
      }
      .fc-field {
        margin-bottom: 14px;
      }
      .fc-label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .fc-input-wrap {
        position: relative;
      }
      .fc-input {
        width: 100%;
        padding: 10px 14px 10px 38px;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        font-size: 14px;
        color: #1e293b;
        background: #f8fafc;
        outline: none;
        transition: all 0.18s;
        font-family: inherit;
        box-sizing: border-box;
      }
      .fc-input:focus {
        border-color: #16a34a;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
      }
      .fc-input-icon {
        position: absolute;
        left: 11px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 16px;
        pointer-events: none;
      }
      .fc-location-btn {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        background: #16a34a;
        border: none;
        border-radius: 7px;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.18s;
        color: #fff;
        font-size: 14px;
      }
      .fc-location-btn:hover { background: #15803d; }

      .fc-radius-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 6px;
      }
      .fc-radius-val {
        font-size: 13px;
        font-weight: 700;
        color: #16a34a;
        background: #f0fdf4;
        padding: 2px 8px;
        border-radius: 6px;
      }
      .fc-range {
        width: 100%;
        accent-color: #16a34a;
        height: 4px;
        cursor: pointer;
      }
      .fc-range-labels {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
        margin-top: 4px;
      }

      .fc-search-btn {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        box-shadow: 0 4px 14px rgba(22,163,74,0.3);
        font-family: inherit;
        margin-top: 4px;
      }
      .fc-search-btn:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(22,163,74,0.4);
      }
      .fc-search-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

      /* ── Results ── */
      .fc-results {
        flex: 1;
        overflow-y: auto;
        padding: 12px 0;
      }
      .fc-results-header {
        padding: 8px 20px 12px;
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .fc-empty {
        text-align: center;
        padding: 30px 20px;
        color: #94a3b8;
        font-size: 13px;
      }
      .fc-empty-icon { font-size: 36px; margin-bottom: 10px; }

      /* ── Courier card ── */
      .fc-courier-card {
        margin: 0 12px 10px;
        background: #fff;
        border: 1.5px solid #e8ecf0;
        border-radius: 14px;
        padding: 14px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
        overflow: hidden;
      }
      .fc-courier-card:hover {
        border-color: #16a34a;
        box-shadow: 0 4px 16px rgba(22,163,74,0.12);
        transform: translateY(-1px);
      }
      .fc-courier-card.selected {
        border-color: #16a34a;
        background: #f0fdf4;
      }
      .fc-card-top {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 10px;
      }
      .fc-avatar {
        width: 46px;
        height: 46px;
        border-radius: 12px;
        background: linear-gradient(135deg, #16a34a, #059669);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
        color: #fff;
      }
      .fc-card-info { flex: 1; min-width: 0; }
      .fc-card-name {
        font-size: 14px;
        font-weight: 700;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 2px;
      }
      .fc-card-transport {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 4px;
      }
      .fc-card-rating {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #f59e0b;
        font-weight: 600;
      }
      .fc-card-badge {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #16a34a;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 20px;
        white-space: nowrap;
      }
      .fc-card-stats {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .fc-stat {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #64748b;
        background: #f8fafc;
        padding: 3px 8px;
        border-radius: 6px;
      }
      .fc-card-price {
        font-size: 13px;
        font-weight: 700;
        color: #16a34a;
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* ── Map ── */
      .fc-map-wrap {
        flex: 1;
        position: relative;
      }
      #fc-map {
        width: 100%;
        height: 100%;
      }

      /* ── Courier modal ── */
      .fc-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 9999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0;
        animation: fcOverlayIn 0.25s ease;
      }
      @keyframes fcOverlayIn { from { opacity: 0; } to { opacity: 1; } }
      .fc-modal {
        background: #fff;
        border-radius: 24px 24px 0 0;
        width: 100%;
        max-width: 520px;
        padding: 28px 24px 36px;
        animation: fcModalUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
        max-height: 90vh;
        overflow-y: auto;
      }
      @keyframes fcModalUp {
        from { transform: translateY(60px); opacity: 0; }
        to   { transform: translateY(0); opacity: 1; }
      }
      .fc-modal-handle {
        width: 40px;
        height: 4px;
        background: #e2e8f0;
        border-radius: 2px;
        margin: 0 auto 20px;
      }
      .fc-modal-head {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 18px;
      }
      .fc-modal-avatar {
        width: 60px;
        height: 60px;
        border-radius: 16px;
        background: linear-gradient(135deg, #16a34a, #059669);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        color: #fff;
        flex-shrink: 0;
      }
      .fc-modal-name {
        font-size: 20px;
        font-weight: 800;
        color: #1e293b;
        margin: 0 0 3px;
      }
      .fc-modal-transport {
        font-size: 14px;
        color: #64748b;
        margin: 0;
      }
      .fc-modal-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 18px;
      }
      .fc-mstat {
        background: #f8fafc;
        border-radius: 12px;
        padding: 12px;
        text-align: center;
      }
      .fc-mstat-val {
        font-size: 20px;
        font-weight: 800;
        color: #1e293b;
        margin-bottom: 3px;
      }
      .fc-mstat-label {
        font-size: 11px;
        color: #64748b;
      }
      .fc-modal-details {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
      }
      .fc-mdetail {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        color: #374151;
        padding: 10px 12px;
        background: #f8fafc;
        border-radius: 10px;
      }
      .fc-mdetail-icon { font-size: 18px; }
      .fc-mdetail strong { color: #1e293b; margin-right: 4px; }
      .fc-modal-bio {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 10px;
        padding: 12px;
        font-size: 13px;
        color: #374151;
        margin-bottom: 18px;
        line-height: 1.5;
      }
      .fc-modal-actions {
        display: flex;
        gap: 10px;
      }
      .fc-contact-btn {
        flex: 1;
        padding: 13px;
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s;
        font-family: inherit;
        box-shadow: 0 4px 14px rgba(22,163,74,0.3);
      }
      .fc-contact-btn:hover { transform: translateY(-1px); }
      .fc-close-btn {
        padding: 13px 18px;
        background: #f1f5f9;
        color: #64748b;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-family: inherit;
      }
      .fc-close-btn:hover { background: #e2e8f0; }

      /* spinner */
      .fc-spin {
        display: inline-block;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      @media (max-width: 700px) {
        .fc-layout { flex-direction: column; height: auto; }
        .fc-sidebar { width: 100%; min-width: unset; height: auto; border-right: none; border-bottom: 1px solid #e8ecf0; }
        .fc-map-wrap { height: 350px; }
      }
    `;
    document.head.appendChild(s);
  }

  app.innerHTML = `
    <div class="fc-page">
      <div class="fc-nav">
        <div class="fc-nav-logo">
          <span>🌾</span> AgroVerse · Доставка
        </div>
        <button class="fc-nav-back" onclick="router.go('/home')">← Главная</button>
      </div>
      <div class="fc-layout">
        <!-- Sidebar -->
        <div class="fc-sidebar">
          <div class="fc-sidebar-header">
            <div class="fc-sidebar-title">
              <img src="https://cdn-icons-png.flaticon.com/512/4290/4290854.png" onerror="this.style.display='none'" alt="">
              Найти курьера
            </div>
            <p class="fc-sidebar-sub">Выберите точку отправки и радиус поиска</p>
          </div>

          <div class="fc-search-form">
            <div class="fc-field">
              <label class="fc-label">Адрес отправки</label>
              <div class="fc-input-wrap">
                <span class="fc-input-icon">📍</span>
                <input type="text" id="fc-address" class="fc-input" placeholder="Введите адрес или кликните на карте"
                       style="padding-right: 42px;">
                <button class="fc-location-btn" onclick="_fcGetMyLocation()" title="Моё местоположение">📡</button>
              </div>
            </div>

            <div class="fc-field">
              <div class="fc-radius-row">
                <label class="fc-label" style="margin-bottom:0">Радиус поиска</label>
                <span class="fc-radius-val" id="fc-radius-val">10 км</span>
              </div>
              <input type="range" class="fc-range" id="fc-radius" min="1" max="100" value="10"
                     oninput="document.getElementById('fc-radius-val').textContent = this.value + ' км'">
              <div class="fc-range-labels"><span>1 км</span><span>100 км</span></div>
            </div>

            <button class="fc-search-btn" id="fc-search-btn" onclick="_fcSearch()">
              🔍 Найти курьеров
            </button>
          </div>

          <!-- Results -->
          <div class="fc-results" id="fc-results">
            <div class="fc-empty">
              <div class="fc-empty-icon">🗺️</div>
              Введите адрес и нажмите «Найти»
            </div>
          </div>
        </div>

        <!-- Map -->
        <div class="fc-map-wrap">
          <div id="fc-map"></div>
        </div>
      </div>
    </div>
  `;

  // Init map
  await _loadLeaflet();
  const map = L.map('fc-map').setView([41.2995, 69.2401], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  window._fcMap = map;
  window._fcMarkers = [];
  window._fcUserMarker = null;
  window._fcUserLat = null;
  window._fcUserLng = null;

  // Click on map = set address
  map.on('click', async function(e) {
    const { lat, lng } = e.latlng;
    window._fcUserLat = lat;
    window._fcUserLng = lng;
    if (window._fcUserMarker) window._fcUserMarker.remove();
    window._fcUserMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">📍</div>`,
        iconSize: [32, 32], iconAnchor: [16, 32]
      })
    }).addTo(map).bindPopup('Точка отправки').openPopup();
    document.getElementById('fc-address').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  });
}

window._fcGetMyLocation = function() {
  if (!navigator.geolocation) { showToast('Геолокация недоступна', 'error'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude: lat, longitude: lng } = pos.coords;
    window._fcUserLat = lat;
    window._fcUserLng = lng;
    const map = window._fcMap;
    if (!map) return;
    map.setView([lat, lng], 13);
    if (window._fcUserMarker) window._fcUserMarker.remove();
    window._fcUserMarker = L.marker([lat, lng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">📍</div>`,
        iconSize: [32, 32], iconAnchor: [16, 32]
      })
    }).addTo(map).bindPopup('Вы здесь').openPopup();
    document.getElementById('fc-address').value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    showToast('📍 Местоположение определено!', 'success');
  }, () => showToast('Не удалось определить местоположение', 'error'));
};

window._fcSearch = async function() {
  const lat = window._fcUserLat;
  const lng = window._fcUserLng;
  const radius = +document.getElementById('fc-radius').value || 10;
  const btn = document.getElementById('fc-search-btn');
  const results = document.getElementById('fc-results');

  if (!lat || !lng) {
    showToast('Кликните на карте или нажмите 📡 чтобы определить адрес', 'warn');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="fc-spin">⟳</span> Поиск...`;
  results.innerHTML = `<div class="fc-empty"><div class="fc-spin" style="font-size:28px;">⟳</div><br>Ищем курьеров...</div>`;

  // Clear old markers
  (window._fcMarkers || []).forEach(m => m.remove());
  window._fcMarkers = [];

  try {
    const base = window.location.hostname.includes('localhost')
      ? 'http://127.0.0.1:8000'
      : 'https://fearless-learning-production-00ca.up.railway.app';
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${base}/api/delivery/couriers/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const couriers = res.ok ? await res.json() : [];

    if (!couriers.length) {
      results.innerHTML = `
        <div class="fc-empty">
          <div class="fc-empty-icon">😔</div>
          Курьеры в радиусе ${radius} км не найдены.<br>
          <small>Попробуйте увеличить радиус поиска</small>
        </div>`;
      btn.disabled = false;
      btn.innerHTML = '🔍 Найти курьеров';
      return;
    }

    const TRUCK_ICONS = { fura:'🚛', refrig:'❄️', tentovan:'🚚', samosval:'🚜', bortovoy:'🚐', default:'🚗' };

    results.innerHTML = `
      <div class="fc-results-header">Найдено: ${couriers.length} курьеров</div>
      ${couriers.map((c, i) => {
        const icon = TRUCK_ICONS[c.transport_type] || TRUCK_ICONS.default;
        const stars = '⭐'.repeat(Math.round(c.rating || 5));
        return `
          <div class="fc-courier-card" id="fcc-${i}" onclick="_fcShowCourier(${i})">
            <div class="fc-card-top">
              <div class="fc-avatar">${icon}</div>
              <div class="fc-card-info">
                <div class="fc-card-name">${c.full_name || 'Курьер'}</div>
                <div class="fc-card-transport">${icon} ${c.transport_type || '—'} · ${c.max_weight || '?'} кг</div>
                <div class="fc-card-rating">${stars} ${c.rating || '5.0'}</div>
              </div>
              <span class="fc-card-badge">🟢 Онлайн</span>
            </div>
            <div class="fc-card-stats">
              <div class="fc-stat">📏 ${c.distance_km || 0} км</div>
              <div class="fc-stat">📅 ${c.experience_years || 0} лет опыта</div>
              ${c.has_thermo_bag ? '<div class="fc-stat">❄️ Рефрижератор</div>' : ''}
              <div class="fc-stat">🏙️ ${c.city || '—'}</div>
            </div>
            <div class="fc-card-price">💰 от ${Number(c.est_price || 0).toLocaleString('ru-RU')} сум</div>
          </div>
        `;
      }).join('')}
    `;

    // Add markers on map
    const map = window._fcMap;
    couriers.forEach((c, i) => {
      if (!c.lat || !c.lng) return;
      const icon = TRUCK_ICONS[c.transport_type] || TRUCK_ICONS.default;
      const marker = L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          className: '',
          html: `<div style="font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));cursor:pointer">${icon}</div>`,
          iconSize: [32, 32], iconAnchor: [16, 16]
        })
      }).addTo(map).bindPopup(`
        <b>${c.full_name || 'Курьер'}</b><br>
        ⭐ ${c.rating || '5.0'} · 📏 ${c.distance_km} км<br>
        💰 от ${Number(c.est_price || 0).toLocaleString('ru-RU')} сум
      `);
      window._fcMarkers.push(marker);
    });

    // Fit map to show all markers
    if (window._fcMarkers.length) {
      const group = L.featureGroup([...window._fcMarkers, window._fcUserMarker].filter(Boolean));
      map.fitBounds(group.getBounds().pad(0.2));
    }

    window._fcCouriers = couriers;

  } catch (e) {
    results.innerHTML = `<div class="fc-empty">⚠️ ${e.message}</div>`;
  }

  btn.disabled = false;
  btn.innerHTML = '🔍 Найти курьеров';
};

window._fcShowCourier = function(idx) {
  // Highlight selected card
  document.querySelectorAll('.fc-courier-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`fcc-${idx}`)?.classList.add('selected');

  const c = window._fcCouriers[idx];
  const TRUCK_LABELS = { fura:'Фура', refrig:'Рефрижератор', tentovan:'Тентованный', samosval:'Самосвал', bortovoy:'Бортовой' };
  const TRUCK_ICONS  = { fura:'🚛', refrig:'❄️', tentovan:'🚚', samosval:'🚜', bortovoy:'🚐', default:'🚗' };
  const icon = TRUCK_ICONS[c.transport_type] || TRUCK_ICONS.default;
  const label = TRUCK_LABELS[c.transport_type] || c.transport_type || '—';

  const modal = document.createElement('div');
  modal.className = 'fc-modal-overlay';
  modal.innerHTML = `
    <div class="fc-modal">
      <div class="fc-modal-handle"></div>
      <div class="fc-modal-head">
        <div class="fc-modal-avatar">${icon}</div>
        <div>
          <div class="fc-modal-name">${c.full_name || 'Курьер'}</div>
          <p class="fc-modal-transport">${icon} ${label}</p>
        </div>
      </div>

      <div class="fc-modal-stats">
        <div class="fc-mstat">
          <div class="fc-mstat-val">⭐ ${c.rating || '5.0'}</div>
          <div class="fc-mstat-label">Рейтинг</div>
        </div>
        <div class="fc-mstat">
          <div class="fc-mstat-val">${c.experience_years || 0}</div>
          <div class="fc-mstat-label">Лет опыта</div>
        </div>
        <div class="fc-mstat">
          <div class="fc-mstat-val">${c.distance_km || 0} км</div>
          <div class="fc-mstat-label">От вас</div>
        </div>
      </div>

      <div class="fc-modal-details">
        <div class="fc-mdetail">
          <span class="fc-mdetail-icon">🚛</span>
          <div><strong>Транспорт:</strong> ${label}</div>
        </div>
        <div class="fc-mdetail">
          <span class="fc-mdetail-icon">⚖️</span>
          <div><strong>Грузоподъёмность:</strong> до ${c.max_weight || '?'} кг</div>
        </div>
        <div class="fc-mdetail">
          <span class="fc-mdetail-icon">🏙️</span>
          <div><strong>Город:</strong> ${c.city || '—'}</div>
        </div>
        <div class="fc-mdetail">
          <span class="fc-mdetail-icon">📍</span>
          <div><strong>Радиус доставки:</strong> до ${c.radius_km || 50} км</div>
        </div>
        <div class="fc-mdetail">
          <span class="fc-mdetail-icon">🕐</span>
          <div><strong>Режим:</strong> ${c.work_mode === 'flexible' ? 'Гибкий' : c.work_mode || '—'} · ${c.work_hours || '—'}</div>
        </div>
        ${c.has_thermo_bag ? `<div class="fc-mdetail"><span class="fc-mdetail-icon">❄️</span><div><strong>Рефрижератор:</strong> Есть</div></div>` : ''}
        <div class="fc-mdetail">
          <span class="fc-mdetail-icon">💰</span>
          <div><strong>Стоимость:</strong> от ${Number(c.est_price || 0).toLocaleString('ru-RU')} сум</div>
        </div>
        ${c.phone ? `<div class="fc-mdetail"><span class="fc-mdetail-icon">📞</span><div><strong>Телефон:</strong> ${c.phone}</div></div>` : ''}
      </div>

      ${c.bio ? `<div class="fc-modal-bio">💬 "${c.bio}"</div>` : ''}

      <div class="fc-modal-actions">
        ${c.phone ? `
          <a href="tel:${c.phone}" class="fc-contact-btn" style="text-decoration:none">
            📞 Позвонить
          </a>
        ` : `
          <button class="fc-contact-btn" onclick="showToast('Телефон не указан','warn')">
            📞 Связаться
          </button>
        `}
        <button class="fc-close-btn" onclick="this.closest('.fc-modal-overlay').remove()">Закрыть</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
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
        <div class="op-step ${_deliveryState.onboarding.step >= 1 ? 'active' : ''}" id="ops-1">2. Зона</div>
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
          <label for="ob-thermo">❄️ Есть рефрижератор / термоизоляция</label>
        </div>
        <button class="btn btn-primary ob-next" onclick="_obNext()">Далее →</button>
      </div>
    `;

  } else if (s.step === 1) {
    // Шаг 2: Зона работы
    body.innerHTML = `
      <div class="onboard-card">
        <h2 class="ob-title">Зона работы</h2>
        <p class="ob-desc">Укажите город и радиус доставки</p>
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
          <button class="btn btn-primary" id="ob-submit" onclick="_obSubmit()">✅ Отправить заявку</button>
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
    });
    showToast('Заявка отправлена! Ожидайте одобрения администратора', 'success');
    // Load profile and show dashboard with pending banner
    const profile = await API.getCourierProfile().catch(() => null);
    _deliveryState.profile = profile;
    _renderDashboard();
  } catch (e) {
    showToast(e.message || 'Ошибка при сохранении', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '✅ Отправить заявку'; }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function _renderDashboard() {
  const app = document.getElementById('app');
  const profile = _deliveryState.profile || {};
  const approved = profile.admin_approved === true;

  app.innerHTML = `
    <div class="delivery-layout">
      <!-- Sidebar -->
      <aside class="delivery-sidebar">
        <div class="ds-brand">
          <span class="ds-logo">🚛</span>
          <span class="ds-name">Йўлчи</span>
        </div>
        <nav class="ds-nav">
          ${SECTIONS.map(s => `
            <div class="ds-nav-item ${_deliveryState.section === s.id ? 'active' : ''}"
                 id="dnav-${s.id}"
                 onclick="_deliverySection('${s.id}')">
              <span class="ds-nav-icon">${s.icon}</span>
              <span class="ds-nav-label">${s.label}</span>
            </div>
          `).join('')}
        </nav>
        <div class="ds-footer">
          <div class="ds-courier-info">
            <div class="ds-courier-name">${profile.full_name || 'Курьер'}</div>
            <div class="ds-courier-status ${approved ? 'status-active' : (profile.rejection_reason ? 'status-rejected' : 'status-pending')}">
              ${approved ? '🟢 Активен' : (profile.rejection_reason ? '🔴 Отклонен' : '🟡 На проверке')}
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
  const approved = profile.admin_approved === true;

  main.innerHTML = `
    <div class="section-home">
      <div class="section-header">
        <h1 class="section-title">Главная</h1>
        <div class="section-date">${new Date().toLocaleDateString('ru-RU', {weekday:'long', day:'numeric', month:'long'})}</div>
      </div>

      ${!approved ? `
        ${profile.rejection_reason ? `
          <div class="pending-banner rejection-banner">
            <div class="pb-icon">❌</div>
            <div class="pb-body">
              <div class="pb-title">Заявка отклонена</div>
              <div class="pb-text">Причина: <b>${profile.rejection_reason}</b></div>
              <button class="btn btn-sm btn-ghost" onclick="_deliveryState.profile=null; _renderOnboarding()" style="margin-top:10px; color:#b91c1c; border-color:#fca5a5;">Исправить данные</button>
            </div>
          </div>
        ` : `
          <div class="pending-banner">
            <div class="pb-icon">⏳</div>
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

      <!-- Stats row -->
      <div class="home-stats">
        <div class="hs-card clickable" onclick="_deliverySection('orders')">
          <div class="hs-icon">📦</div>
          <div class="hs-num" id="stat-available">—</div>
          <div class="hs-label">Доступные заказы</div>
        </div>
        <div class="hs-card">
          <div class="hs-icon">✅</div>
          <div class="hs-num" id="stat-done">—</div>
          <div class="hs-label">Выполнено доставок</div>
        </div>
        <div class="hs-card">
          <div class="hs-icon">⭐</div>
          <div class="hs-num" id="stat-rating">${profile.rating ?? '5.0'}</div>
          <div class="hs-label">Рейтинг</div>
        </div>
        <div class="hs-card clickable" onclick="_deliverySection('wallet')">
          <div class="hs-icon">💰</div>
          <div class="hs-num" id="stat-balance">—</div>
          <div class="hs-label">Баланс сум</div>
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
            <div class="ni-icon">🎉</div>
            <div class="ni-body">
              <div class="ni-title">Добро пожаловать в AgroVerse!</div>
              <div class="ni-time">Только что</div>
            </div>
          </div>
          ${!approved ? `
            <div class="notif-item">
              <div class="ni-icon">🔍</div>
              <div class="ni-body">
                <div class="ni-title">Ваш профиль проходит проверку</div>
                <div class="ni-time">Сегодня</div>
              </div>
            </div>
          ` : `
            <div class="notif-item">
              <div class="ni-icon">✅</div>
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
        <button class="ot-tab active" data-tab="available" onclick="_ordersTab(this,'available')">📦 Доступные</button>
        <button class="ot-tab" data-tab="accepted"  onclick="_ordersTab(this,'accepted')">🚚 Принятые</button>
        <button class="ot-tab" data-tab="done"      onclick="_ordersTab(this,'done')">✅ Выполненные</button>
        <button class="ot-tab" data-tab="cancelled" onclick="_ordersTab(this,'cancelled')">❌ Отменённые</button>
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
      list.innerHTML = `<div class="empty-state">📭 Заказов нет</div>`;
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
    <button class="btn btn-primary btn-sm" onclick="_acceptOrder(${o.id})">✅ Принять</button>
  ` : tab === 'accepted' ? `
    <button class="btn btn-success btn-sm" onclick="_deliverOrder(${o.id})">📦 Доставлен</button>
    <button class="btn btn-ghost btn-sm"   onclick="_cancelOrder(${o.id})">Отмена</button>
  ` : '';

  return `
    <div class="order-card" id="oc-${o.id}">
      <div class="oc-left">
        <div class="oc-cargo-icon">🌾</div>
      </div>
      <div class="oc-body">
        <div class="oc-title">${cargo}</div>
        <div class="oc-route">
          <span class="oc-from">📍 ${from}</span>
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
    showToast('Доставлено! ✅', 'success');
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
        <button class="btn btn-sm btn-primary" onclick="_setOnline()">📍 Я онлайн</button>
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
                icon: L.divIcon({ className: '', html: '<div style="font-size:24px;">📦</div>', iconSize: [28,28] })
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
      showToast('Вы онлайн! 🟢', 'success');
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
            <li>✅ До 10 заказов в месяц</li>
            <li>✅ Базовый ИИ-помощник</li>
            <li>✅ Карта заказов</li>
            <li>❌ Приоритет в поиске</li>
            <li>❌ Аналитика</li>
          </ul>
          <button class="btn btn-ghost tc-btn" disabled>Текущий план</button>
        </div>
        <div class="tariff-card featured">
          <div class="tc-top-badge">⭐ Популярный</div>
          <div class="tc-badge">Оптимальный</div>
          <div class="tc-price">49 900 <span>сум/мес</span></div>
          <div class="tc-period">в месяц</div>
          <ul class="tc-features">
            <li>✅ Неограниченные заказы</li>
            <li>✅ Приоритет в поиске</li>
            <li>✅ Расширенный ИИ</li>
            <li>✅ Базовая аналитика</li>
            <li>❌ Выделенный менеджер</li>
          </ul>
          <button class="btn btn-primary tc-btn" onclick="showToast('Скоро доступно!','info')">Выбрать</button>
        </div>
        <div class="tariff-card premium">
          <div class="tc-badge">Премиум</div>
          <div class="tc-price">149 900 <span>сум/мес</span></div>
          <div class="tc-period">в месяц</div>
          <ul class="tc-features">
            <li>✅ Всё из Оптимального</li>
            <li>✅ Выделенный менеджер</li>
            <li>✅ Полная аналитика</li>
            <li>✅ API доступ</li>
            <li>✅ Брендирование</li>
          </ul>
          <button class="btn btn-primary tc-btn" onclick="showToast('Скоро доступно!','info')">Выбрать</button>
        </div>
      </div>

      <!-- Calculator -->
      <div class="tariff-calc">
        <h3>💰 Калькулятор стоимости доставки</h3>
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
        <h1 class="section-title">🤖 ИИ-помощник</h1>
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
    chat.innerHTML += `<div class="ai-msg ai-bot" id="ai-typing"><div class="ai-msg-bubble">⏳ Думаю...</div></div>`;
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
        <h1 class="section-title">💰 Кошелёк</h1>
      </div>
      <div class="wallet-card">
        <div class="wc-label">Текущий баланс</div>
        <div class="wc-balance" id="wallet-balance">Загрузка...</div>
        <div class="wc-actions">
          <button class="btn btn-primary" onclick="_withdrawModal()">💸 Вывести</button>
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
      <div class="modal-ic">💸</div>
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
        <h1 class="section-title">🛒 Рынок</h1>
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
      list.innerHTML = `<div class="empty-state">📦 Товаров пока нет</div>`;
      return;
    }
    list.innerHTML = `<div class="market-grid">
      ${products.slice(0, 20).map(p => `
        <div class="market-card">
          ${p.image_url ? `<img src="${p.image_url}" class="mc-img" alt="${p.title}">` : `<div class="mc-img-placeholder">🌾</div>`}
          <div class="mc-body">
            <div class="mc-title">${p.title || p.name}</div>
            <div class="mc-farmer">🌱 ${p.fermer_name || 'Фермер'}</div>
            <div class="mc-price">${Number(p.price_per_unit ?? p.price ?? 0).toLocaleString('ru-RU')} сум/${p.unit || 'кг'}</div>
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
  const approved = p.admin_approved === true;

  main.innerHTML = `
    <div class="section-profile">
      <div class="section-header">
        <h1 class="section-title">👤 Профиль</h1>
      </div>

      ${!approved ? `
        <div class="pending-banner">
          <div class="pb-icon">⏳</div>
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
        <div class="approved-banner">✅ Профиль одобрен и активен</div>
      `}

      <div class="profile-card">
        <div class="profile-avatar">🚛</div>
        <div class="profile-name">${p.full_name || 'Не указано'}</div>
        <div class="profile-role">Йўлчи · ${tt ? tt.label : p.transport_type || '—'}</div>
        <div class="profile-rating">⭐ ${p.rating ?? '5.0'}</div>
      </div>

      <!-- Completion bar -->
      ${_profileCompletionBar(p)}

      <div class="profile-details">
        ${_profileRow('📞', 'Телефон', p.phone)}
        ${_profileRow('🏙️', 'Город', p.city)}
        ${_profileRow('🚛', 'Транспорт', tt ? `${tt.icon} ${tt.label}` : p.transport_type || '—')}
        ${_profileRow('⚖️', 'Грузоподъёмность', p.max_weight ? `${p.max_weight} кг` : '—')}
        ${_profileRow('🔢', 'Гос. номер', p.vehicle_number)}
        ${_profileRow('📅', 'Опыт', p.experience_years ? `${p.experience_years} лет` : '—')}
        ${_profileRow('📍', 'Радиус', p.radius_km ? `${p.radius_km} км` : '—')}
        ${_profileRow('❄️', 'Рефрижератор', p.has_thermo_bag ? 'Да' : 'Нет')}
        ${p.bio ? _profileRow('📝', 'О себе', p.bio) : ''}
      </div>

      <button class="btn btn-ghost" style="margin-top:16px;width:100%;" 
              onclick="_editProfile()">✏️ Редактировать профиль</button>
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
    bio: p.bio || '',
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
      background: #f4f6fa;
    }

    /* ── Sidebar ── */
    .delivery-sidebar {
      width: 220px;
      min-width: 220px;
      background: #1a2332;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow-y: auto;
      z-index: 10;
    }
    .ds-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .ds-logo { font-size: 26px; }
    .ds-name { font-size: 18px; font-weight: 700; color: #fff; }
    .ds-nav { flex: 1; padding: 12px 0; }
    .ds-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 18px;
      cursor: pointer;
      color: rgba(255,255,255,0.65);
      border-radius: 8px;
      margin: 2px 8px;
      transition: all 0.15s;
      font-size: 14px;
    }
    .ds-nav-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
    .ds-nav-item.active { background: #2563eb; color: #fff; }
    .ds-nav-icon { font-size: 18px; width: 24px; text-align: center; }
    .ds-nav-label { font-weight: 500; }
    .ds-footer {
      padding: 14px 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .ds-courier-name { color: #fff; font-weight: 600; font-size: 13px; }
    .ds-courier-status { font-size: 12px; margin-top: 3px; }
    .status-active { color: #22c55e; }
    .status-pending { color: #f59e0b; }

    /* ── Main ── */
    .delivery-main {
      flex: 1;
      overflow-y: auto;
      padding: 28px;
    }

    /* ── Section header ── */
    .section-header { margin-bottom: 24px; }
    .section-title { font-size: 24px; font-weight: 700; color: #1a2332; margin: 0 0 4px; }
    .section-subtitle { color: #64748b; font-size: 14px; margin: 0; }
    .section-date { color: #64748b; font-size: 13px; margin-top: 2px; }

    /* ── Home stats ── */
    .home-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .hs-card {
      background: #fff;
      border-radius: 14px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.15s;
    }
    .hs-card.clickable { cursor: pointer; }
    .hs-card.clickable:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(37,99,235,0.12); }
    .hs-icon { font-size: 28px; margin-bottom: 8px; }
    .hs-num { font-size: 26px; font-weight: 700; color: #1a2332; }
    .hs-label { font-size: 12px; color: #64748b; margin-top: 4px; }

    /* ── Pending banner ── */
    .pending-banner {
      display: flex;
      gap: 16px;
      background: #fffbeb;
      border: 1px solid #f59e0b;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .pb-icon { font-size: 32px; }
    .pb-title { font-weight: 700; color: #92400e; font-size: 15px; margin-bottom: 4px; }
    .pb-text { color: #78350f; font-size: 13px; margin-bottom: 12px; }
    .pb-progress { }
    .pb-bar { height: 6px; background: #fde68a; border-radius: 3px; overflow: hidden; }
    .pb-fill { height: 100%; background: #f59e0b; border-radius: 3px; }
    .pb-bar-label { font-size: 11px; color: #92400e; margin-top: 4px; }

    /* Approved banner */
    .approved-banner {
      background: #f0fdf4;
      border: 1px solid #22c55e;
      color: #15803d;
      padding: 12px 18px;
      border-radius: 10px;
      margin-bottom: 20px;
      font-weight: 600;
    }

    /* ── Home blocks ── */
    .home-section-block {
      background: #fff;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .hsb-title { font-weight: 700; color: #1a2332; margin-bottom: 14px; font-size: 15px; }

    /* ── Profile completion ── */
    .profile-completion { display: flex; align-items: center; gap: 14px; }
    .pc-bar { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .pc-fill { height: 100%; background: #2563eb; border-radius: 4px; transition: width 0.5s; }
    .pc-label { font-size: 13px; color: #64748b; white-space: nowrap; }

    /* ── Notifications ── */
    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid #f1f5f9;
    }
    .notif-item:last-child { border-bottom: none; }
    .ni-icon { font-size: 20px; }
    .ni-title { font-size: 13px; color: #1a2332; font-weight: 500; }
    .ni-time { font-size: 11px; color: #94a3b8; margin-top: 2px; }

    /* ── Orders ── */
    .orders-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .ot-tab {
      padding: 8px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #fff;
      color: #64748b;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .ot-tab:hover { border-color: #2563eb; color: #2563eb; }
    .ot-tab.active { background: #2563eb; color: #fff; border-color: #2563eb; }

    .order-card {
      display: flex;
      align-items: center;
      background: #fff;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      gap: 14px;
    }
    .oc-left { }
    .oc-cargo-icon { font-size: 36px; }
    .oc-body { flex: 1; }
    .oc-title { font-weight: 600; color: #1a2332; font-size: 15px; margin-bottom: 6px; }
    .oc-route { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 12px; color: #64748b; margin-bottom: 4px; }
    .oc-dist, .oc-weight { font-size: 12px; color: #94a3b8; }
    .oc-right { text-align: right; }
    .oc-price { font-size: 17px; font-weight: 700; color: #2563eb; margin-bottom: 8px; }
    .oc-actions { display: flex; flex-direction: column; gap: 6px; }
    .btn-sm { font-size: 12px; padding: 6px 12px; border-radius: 6px; }

    /* ── Tariffs ── */
    .tariff-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .tariff-card {
      background: #fff;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.06);
      border: 2px solid #e2e8f0;
      position: relative;
    }
    .tariff-card.featured {
      border-color: #2563eb;
      box-shadow: 0 4px 20px rgba(37,99,235,0.15);
    }
    .tariff-card.premium { border-color: #7c3aed; }
    .tc-top-badge {
      position: absolute;
      top: -12px; left: 50%; transform: translateX(-50%);
      background: #2563eb; color: #fff;
      padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }
    .tc-badge { font-weight: 700; color: #1a2332; font-size: 17px; margin-bottom: 10px; }
    .tc-price { font-size: 26px; font-weight: 800; color: #1a2332; }
    .tc-price span { font-size: 14px; color: #64748b; font-weight: 400; }
    .tc-period { font-size: 12px; color: #94a3b8; margin-bottom: 18px; }
    .tc-features { list-style: none; padding: 0; margin: 0 0 20px; }
    .tc-features li { font-size: 13px; color: #475569; padding: 5px 0; }
    .tc-btn { width: 100%; }

    .tariff-calc {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .tariff-calc h3 { margin: 0 0 16px; color: #1a2332; }
    .calc-row { margin-bottom: 14px; }
    .calc-row label { display: block; font-size: 13px; color: #64748b; margin-bottom: 6px; }
    .calc-result { margin-top: 16px; }
    .calc-price-result {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      padding: 14px;
      border-radius: 10px;
      font-size: 15px;
      color: #0369a1;
    }
    .calc-price-result.err { background: #fef2f2; border-color: #fca5a5; color: #dc2626; }

    /* ── AI Chat ── */
    .section-ai { display: flex; flex-direction: column; height: calc(100vh - 120px); }
    .ai-chat {
      flex: 1;
      overflow-y: auto;
      background: #f8fafc;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ai-msg { display: flex; }
    .ai-user { justify-content: flex-end; }
    .ai-bot  { justify-content: flex-start; }
    .ai-msg-bubble {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
    }
    .ai-user .ai-msg-bubble { background: #2563eb; color: #fff; border-radius: 14px 14px 4px 14px; }
    .ai-bot  .ai-msg-bubble { background: #fff; color: #1a2332; box-shadow: 0 2px 6px rgba(0,0,0,0.07); border-radius: 14px 14px 14px 4px; }
    .ai-input-row { display: flex; gap: 10px; }
    .ai-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      font-size: 14px;
      outline: none;
    }
    .ai-input:focus { border-color: #2563eb; }

    /* ── Wallet ── */
    .wallet-card {
      background: linear-gradient(135deg, #1a2332 0%, #2563eb 100%);
      border-radius: 20px;
      padding: 32px;
      color: #fff;
      margin-bottom: 24px;
      text-align: center;
    }
    .wc-label { font-size: 14px; opacity: 0.75; margin-bottom: 8px; }
    .wc-balance { font-size: 36px; font-weight: 800; margin-bottom: 20px; }
    .wc-actions { display: flex; justify-content: center; gap: 10px; }
    .wallet-history h3 { margin: 0 0 14px; color: #1a2332; }
    .tx-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: #fff;
      border-radius: 10px;
      margin-bottom: 8px;
    }
    .tx-icon { font-size: 20px; }
    .tx-body { flex: 1; }
    .tx-desc { font-size: 13px; color: #1a2332; font-weight: 500; }
    .tx-status { font-size: 11px; color: #94a3b8; }
    .tx-amount { font-weight: 700; font-size: 14px; }
    .tx-plus { color: #22c55e; }
    .tx-minus { color: #ef4444; }

    /* ── Market ── */
    .market-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .market-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .mc-img { width: 100%; height: 140px; object-fit: cover; }
    .mc-img-placeholder { width: 100%; height: 140px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 40px; }
    .mc-body { padding: 12px; }
    .mc-title { font-weight: 600; color: #1a2332; font-size: 14px; margin-bottom: 4px; }
    .mc-farmer { font-size: 12px; color: #64748b; margin-bottom: 6px; }
    .mc-price { font-weight: 700; color: #2563eb; font-size: 14px; }

    /* ── Profile ── */
    .profile-card { text-align: center; background: #fff; border-radius: 16px; padding: 28px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .profile-avatar { font-size: 56px; margin-bottom: 10px; }
    .profile-name { font-size: 20px; font-weight: 700; color: #1a2332; }
    .profile-role { font-size: 13px; color: #64748b; margin-top: 4px; }
    .profile-rating { font-size: 16px; margin-top: 8px; }
    .profile-details { background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
    .pdetail-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .pdetail-row:last-child { border-bottom: none; }
    .pdr-icon { font-size: 18px; width: 28px; text-align: center; }
    .pdr-label { flex: 1; font-size: 13px; color: #64748b; }
    .pdr-value { font-size: 13px; font-weight: 600; color: #1a2332; }

    /* ── Onboarding ── */
    .delivery-onboard {
      max-width: 600px;
      margin: 40px auto;
      padding: 0 16px;
    }
    .onboard-header { text-align: center; margin-bottom: 28px; }
    .onboard-logo { font-size: 28px; font-weight: 800; color: #1a2332; }
    .onboard-subtitle { color: #64748b; font-size: 14px; margin-top: 6px; }
    .onboard-progress {
      display: flex;
      align-items: center;
      margin-bottom: 28px;
      gap: 0;
    }
    .op-step {
      flex: 1;
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      padding: 8px 4px;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .op-step.active { color: #2563eb; }
    .op-line { flex: 0.3; height: 2px; background: #e2e8f0; }
    .onboard-card {
      background: #fff;
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    .ob-title { font-size: 20px; font-weight: 700; color: #1a2332; margin: 0 0 8px; }
    .ob-desc { color: #64748b; font-size: 14px; margin: 0 0 20px; }
    .ob-field { margin-bottom: 16px; }
    .ob-label { display: block; font-size: 13px; color: #64748b; margin-bottom: 6px; font-weight: 500; }
    .ob-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      font-size: 14px;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .ob-input:focus { border-color: #2563eb; }
    .ob-textarea { resize: vertical; min-height: 80px; }
    .ob-select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      font-size: 14px;
      outline: none;
      background: #fff;
    }
    .ob-range { width: 100%; accent-color: #2563eb; }
    .ob-checkbox { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-size: 14px; cursor: pointer; }
    .ob-next { width: 100%; margin-top: 8px; }
    .ob-nav { display: flex; gap: 10px; margin-top: 8px; }
    .ob-nav .btn { flex: 1; }

    /* Truck chips */
    .truck-chips {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .truck-chip {
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 12px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
      background: #fff;
    }
    .truck-chip:hover { border-color: #93c5fd; background: #eff6ff; }
    .truck-chip.selected { border-color: #2563eb; background: #eff6ff; }
    .tc-icon { font-size: 28px; margin-bottom: 6px; }
    .tc-label { font-weight: 600; font-size: 13px; color: #1a2332; }
    .tc-desc { font-size: 11px; color: #64748b; margin-top: 3px; }

    /* ── Misc ── */
    .empty-state { text-align: center; padding: 40px; color: #94a3b8; font-size: 15px; }
    .btn-success { background: #22c55e; color: #fff; border: none; }
    .btn-danger-ghost { background: transparent; color: #ef4444; border: 1px solid #ef4444; border-radius: 8px; padding: 10px 16px; cursor: pointer; font-size: 14px; }
    .btn-danger-ghost:hover { background: #fef2f2; }

    /* ── Responsive ── */
    @media (max-width: 900px) {
      .delivery-sidebar { width: 64px; min-width: 64px; }
      .ds-name, .ds-nav-label, .ds-courier-name, .ds-courier-status { display: none; }
      .ds-brand { justify-content: center; padding: 16px 8px; }
      .ds-nav-item { justify-content: center; padding: 12px; margin: 2px 4px; }
      .ds-footer { display: none; }
      .home-stats { grid-template-columns: repeat(2, 1fr); }
      .tariff-cards { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) {
      .delivery-main { padding: 16px; }
      .home-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }
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
      ? 'http://127.0.0.1:8000'
      : 'https://fearless-learning-production-00ca.up.railway.app'
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
