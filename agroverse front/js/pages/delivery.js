/* ============================================================
   delivery.js — Модуль Доставки AgroVerse v1.0
   - Страница поиска курьеров /delivery (для покупателя/фермера)
   - Дашборд курьера /courier (для роли courier)
   ============================================================ */

// ─── Leaflet lazy loader ─────────────────────────────────────────────────────
async function ensureLeaflet() {
  if (window.L) return;
  await new Promise((res, rej) => {
    if (document.getElementById('leaflet-css')) { res(); return; }
    const link = document.createElement('link');
    link.id = 'leaflet-css';
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = res;
    script.onerror = rej;
    document.head.appendChild(script);
  });
}

// ─── Конфетти ────────────────────────────────────────────────────────────────
function launchConfetti() {
  const colors = ['#10b981','#4ade80','#059669','#fbbf24','#3b82f6'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed;top:${Math.random()*30}%;left:${Math.random()*100}%;
      width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>0.5?'50%':'2px'};
      z-index:99999;pointer-events:none;
      animation:confettiFall ${1.5+Math.random()*2}s ease-out forwards;
      animation-delay:${Math.random()*0.5}s;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
  if (!document.getElementById('confetti-style')) {
    const s = document.createElement('style');
    s.id = 'confetti-style';
    s.textContent = `@keyframes confettiFall {
      0%   { transform: translateY(-20px) rotate(0deg); opacity:1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity:0; }
    }`;
    document.head.appendChild(s);
  }
}

// ─── CSS ─────────────────────────────────────────────────────────────────────
function injectDeliveryStyles() {
  if (document.getElementById('av-delivery-styles')) return;
  const s = document.createElement('style');
  s.id = 'av-delivery-styles';
  s.textContent = `
  /* ── Welcome Screen ── */
  .welcome-screen {
    position:fixed;inset:0;z-index:10000;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);
  }
  .welcome-box {
    background:#fff;border-radius:24px;padding:48px 40px;
    text-align:center;max-width:420px;width:90%;
    box-shadow:0 32px 80px rgba(16,185,129,0.25);
    animation:popIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  .welcome-icon { font-size:72px; margin-bottom:16px; }
  .welcome-box h2 { font-size:28px;font-weight:800;color:#0f1f12;margin-bottom:8px; }
  .welcome-box p  { color:#6b7280;margin-bottom:28px;line-height:1.6; }

  /* ── Онбординг ── */
  .onboarding-page { max-width:600px;margin:0 auto; }
  .onb-progress { display:flex;gap:8px;margin-bottom:32px; }
  .onb-step-dot {
    flex:1;height:4px;border-radius:2px;
    background:rgba(16,185,129,0.2);
    transition:background 0.3s;
  }
  .onb-step-dot.active { background:#10b981; }
  .onb-card {
    background:#fff;border:1px solid rgba(16,185,129,0.15);
    border-radius:20px;padding:32px;
    box-shadow:0 8px 32px rgba(16,185,129,0.08);
  }
  .onb-card h3 { font-size:22px;font-weight:800;color:#0f1f12;margin-bottom:8px; }
  .onb-card .sub { color:#6b7280;margin-bottom:28px; }
  .transport-grid { display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px; }
  .transport-btn {
    display:flex;flex-direction:column;align-items:center;gap:6px;
    padding:16px 8px;border-radius:14px;
    border:2px solid rgba(16,185,129,0.2);background:#f0fdf4;
    cursor:pointer;transition:all 0.2s;font-size:11px;font-weight:600;color:#374151;
  }
  .transport-btn span { font-size:28px; }
  .transport-btn:hover,.transport-btn.sel {
    border-color:#10b981;background:rgba(16,185,129,0.1);color:#059669;
  }
  .onb-field { margin-bottom:16px; }
  .onb-field label { font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px; }
  .onb-field input,.onb-field select,.onb-field textarea {
    width:100%;padding:12px 16px;border-radius:12px;
    border:1.5px solid rgba(16,185,129,0.2);background:#fff;
    font-size:14px;color:#0f1f12;outline:none;box-sizing:border-box;
    transition:border-color 0.2s;
  }
  .onb-field input:focus,.onb-field select:focus,.onb-field textarea:focus { border-color:#10b981; }
  .onb-field textarea { resize:vertical;min-height:80px; }
  .onb-toggle-wrap { display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#f0fdf4;border-radius:12px;border:1px solid rgba(16,185,129,0.15); }
  .onb-toggle-wrap label { font-size:14px;color:#374151;font-weight:500; }
  .toggle-switch { position:relative;width:44px;height:24px; }
  .toggle-switch input { opacity:0;width:0;height:0; }
  .toggle-slider {
    position:absolute;inset:0;cursor:pointer;
    background:#d1d5db;border-radius:24px;transition:0.3s;
  }
  .toggle-slider::before {
    content:'';position:absolute;width:18px;height:18px;border-radius:50%;
    background:#fff;left:3px;top:3px;transition:0.3s;
  }
  input:checked+.toggle-slider { background:#10b981; }
  input:checked+.toggle-slider::before { transform:translateX(20px); }
  .onb-actions { display:flex;gap:12px;justify-content:flex-end;margin-top:24px; }

  /* ── Courier Dashboard ── */
  .courier-layout { display:flex;gap:0;min-height:calc(100vh - 140px); }
  .courier-sidebar {
    width:220px;flex-shrink:0;
    background:#fff;border-right:1px solid rgba(16,185,129,0.15);
    border-radius:16px 0 0 16px;
    padding:20px 0;
  }
  .cs-logo {
    padding:0 20px 20px;
    font-size:18px;font-weight:800;color:#0f1f12;
    border-bottom:1px solid rgba(16,185,129,0.1);margin-bottom:12px;
  }
  .cs-nav-item {
    display:flex;align-items:center;gap:10px;
    padding:11px 20px;cursor:pointer;
    font-size:13px;font-weight:500;color:#6b7280;
    transition:all 0.15s;border-left:3px solid transparent;
  }
  .cs-nav-item:hover { background:rgba(16,185,129,0.05);color:#059669; }
  .cs-nav-item.active { background:rgba(16,185,129,0.08);color:#059669;border-left-color:#10b981;font-weight:600; }
  .cs-nav-item i { width:16px;text-align:center; }
  .courier-content { flex:1;padding:24px;overflow:auto; }

  /* Online toggle */
  .online-toggle-bar {
    display:flex;align-items:center;justify-content:space-between;
    background:#fff;border:1px solid rgba(16,185,129,0.15);
    border-radius:14px;padding:16px 20px;margin-bottom:20px;
    box-shadow:0 2px 12px rgba(16,185,129,0.06);
  }
  .status-dot { width:10px;height:10px;border-radius:50%;background:#d1d5db; }
  .status-dot.online { background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,0.2); }
  .status-dot.busy { background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,0.2); }

  /* Stats row */
  .courier-stats { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px; }
  .cstat-card {
    background:#fff;border:1px solid rgba(16,185,129,0.12);
    border-radius:14px;padding:16px;
    box-shadow:0 2px 12px rgba(16,185,129,0.04);
  }
  .cstat-label { font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px; }
  .cstat-value { font-size:26px;font-weight:800;color:#0f1f12;line-height:1; }
  .cstat-sub { font-size:11px;color:#6b7280;margin-top:4px; }

  /* Orders list */
  .courier-orders-list { display:flex;flex-direction:column;gap:12px; }
  .courier-order-card {
    background:#fff;border:1px solid rgba(16,185,129,0.12);
    border-radius:14px;padding:18px;
    display:flex;gap:16px;align-items:flex-start;
    transition:box-shadow 0.2s;
  }
  .courier-order-card:hover { box-shadow:0 4px 20px rgba(16,185,129,0.1); }
  .order-status-badge {
    padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;
    white-space:nowrap;
  }
  .badge-pending   { background:rgba(245,158,11,0.1);color:#d97706; }
  .badge-accepted  { background:rgba(59,130,246,0.1);color:#2563eb; }
  .badge-in_transit{ background:rgba(16,185,129,0.1);color:#059669; }
  .badge-delivered { background:rgba(16,185,129,0.15);color:#059669; }
  .badge-cancelled { background:rgba(239,68,68,0.1);color:#dc2626; }

  /* ── Delivery Search Page ── */
  .delivery-page { display:grid;grid-template-columns:360px 1fr;gap:20px;min-height:70vh; }
  @media(max-width:900px){ .delivery-page { grid-template-columns:1fr; } }
  .delivery-panel {
    background:#fff;border:1px solid rgba(16,185,129,0.15);
    border-radius:16px;padding:24px;
    box-shadow:0 4px 24px rgba(16,185,129,0.06);
    display:flex;flex-direction:column;gap:16px;
  }
  .delivery-map-wrap {
    border-radius:16px;overflow:hidden;
    border:1px solid rgba(16,185,129,0.15);
    min-height:400px;
  }
  #delivery-map { width:100%;height:100%;min-height:400px; }
  .radius-slider { width:100%;accent-color:#10b981; }
  .courier-card-mini {
    display:flex;align-items:center;gap:12px;padding:12px 14px;
    border:1.5px solid rgba(16,185,129,0.15);border-radius:12px;
    cursor:pointer;transition:all 0.2s;background:#fff;
  }
  .courier-card-mini:hover,.courier-card-mini.selected { border-color:#10b981;background:rgba(16,185,129,0.04); }
  .ccm-avatar {
    width:40px;height:40px;border-radius:50%;
    background:linear-gradient(135deg,#10b981,#059669);
    display:grid;place-items:center;color:#fff;font-size:18px;flex-shrink:0;
  }
  .ccm-info { flex:1;min-width:0; }
  .ccm-name { font-size:13px;font-weight:600;color:#0f1f12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .ccm-meta { font-size:11px;color:#6b7280;margin-top:2px; }
  .ccm-price { font-size:13px;font-weight:700;color:#059669;white-space:nowrap; }
  .stars { color:#fbbf24;font-size:11px; }

  /* Order modal */
  .order-modal-overlay {
    position:fixed;inset:0;background:rgba(0,0,0,0.5);
    z-index:9000;display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(4px);
  }
  .order-modal {
    background:#fff;border-radius:20px;padding:32px;
    max-width:480px;width:95%;max-height:90vh;overflow-y:auto;
    box-shadow:0 24px 64px rgba(16,185,129,0.2);
    animation:popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  .order-modal h3 { font-size:20px;font-weight:800;margin-bottom:20px;color:#0f1f12; }
  .price-breakdown {
    background:#f0fdf4;border-radius:12px;padding:16px;
    margin:16px 0;border:1px solid rgba(16,185,129,0.15);
  }
  .pb-row { display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:6px; }
  .pb-total { display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0f1f12;margin-top:8px;padding-top:8px;border-top:1px solid rgba(16,185,129,0.2); }

  /* Rating popup */
  .rating-popup {
    position:fixed;bottom:80px;right:24px;z-index:9000;
    background:#fff;border-radius:16px;padding:24px;
    box-shadow:0 12px 48px rgba(16,185,129,0.2);
    max-width:320px;
    animation:slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes slideInRight { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
  .star-row { display:flex;gap:8px;justify-content:center;margin:12px 0; }
  .star-btn { font-size:32px;cursor:pointer;transition:transform 0.15s; }
  .star-btn:hover,.star-btn.active { transform:scale(1.3); }

  /* Map markers */
  .courier-marker-wrap {
    display:flex;flex-direction:column;align-items:center;
  }
  .courier-marker {
    width:32px;height:32px;border-radius:50%;
    display:grid;place-items:center;font-size:16px;
    border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.2);
    cursor:pointer;
  }
  .courier-marker.online { background:#10b981; }
  .courier-marker.busy   { background:#f59e0b; }

  /* Wallet */
  .wallet-card-courier {
    background:linear-gradient(135deg,#10b981,#059669);
    border-radius:20px;padding:28px;color:#fff;margin-bottom:20px;
  }
  .wc-balance { font-size:40px;font-weight:800;margin:8px 0; }
  .history-item {
    display:flex;align-items:center;gap:12px;padding:12px 0;
    border-bottom:1px solid rgba(16,185,129,0.08);
  }
  .hi-icon {
    width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;font-size:16px;
  }
  .hi-icon.income  { background:rgba(16,185,129,0.1);color:#059669; }
  .hi-icon.withdraw{ background:rgba(239,68,68,0.1);color:#dc2626; }

  /* AI chat courier */
  .courier-ai-wrap { display:flex;flex-direction:column;height:500px; }
  .courier-ai-messages { flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:16px 0;margin-bottom:12px; }
  .ai-msg { max-width:80%;padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.5; }
  .ai-msg.user { background:#10b981;color:#fff;align-self:flex-end;border-radius:16px 16px 4px 16px; }
  .ai-msg.bot  { background:#f0fdf4;color:#0f1f12;border:1px solid rgba(16,185,129,0.15);align-self:flex-start;border-radius:16px 16px 16px 4px; }
  .ai-input-row { display:flex;gap:10px; }
  .ai-input-row input { flex:1;padding:12px 16px;border-radius:12px;border:1.5px solid rgba(16,185,129,0.2);outline:none;font-size:14px; }
  .ai-input-row input:focus { border-color:#10b981; }

  /* Responsive sidebar */
  @media(max-width:700px) {
    .courier-layout { flex-direction:column; }
    .courier-sidebar { width:100%;border-radius:16px 16px 0 0;padding:12px 0; }
    .courier-stats { grid-template-columns:repeat(2,1fr); }
  }
  `;
  document.head.appendChild(s);
}

// ─── Transport icons ──────────────────────────────────────────────────────────
const TRANSPORT_ICONS = { foot:'🚶', bike:'🚴', moto:'🛵', car:'🚗', truck:'🚐' };
const TRANSPORT_LABELS = { foot:'Пешком', bike:'Велосипед', moto:'Мотоцикл', car:'Автомобиль', truck:'Грузовик' };

// ─────────────────────────────────────────────────────────────────────────────
// СТРАНИЦА ПОИСКА КУРЬЕРОВ (/delivery) — для покупателей и фермеров
// ─────────────────────────────────────────────────────────────────────────────
async function renderDelivery() {
  injectDeliveryStyles();
  const app = document.getElementById('app');

  app.innerHTML = pageShell(`
    <div style="margin-bottom:24px;">
      <h1 style="font-size:28px;font-weight:800;color:#0f1f12;margin-bottom:6px;">🚴 Найти курьера</h1>
      <p style="color:#6b7280;">Выберите точку отправки и радиус поиска</p>
    </div>

    <div class="delivery-page">
      <!-- Левая панель -->
      <div class="delivery-panel">
        <div>
          <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">Адрес отправки</label>
          <div style="display:flex;gap:8px;">
            <input id="pickup-addr" type="text" placeholder="Введите адрес или кликните на карте"
              style="flex:1;padding:11px 14px;border-radius:10px;border:1.5px solid rgba(16,185,129,0.2);outline:none;font-size:13px;"
              oninput="window._deliveryAddrInput(this.value)"
            />
            <button class="btn btn-primary" style="padding:0 14px;" onclick="window._deliveryGeo()" title="Моя геолокация">
              <i class="fi fi-rr-location-crosshairs"></i>
            </button>
          </div>
        </div>

        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Радиус поиска</label>
            <span id="radius-label" style="font-size:13px;font-weight:700;color:#059669;">10 км</span>
          </div>
          <input class="radius-slider" type="range" min="1" max="50" value="10" id="radius-input"
            oninput="window._deliveryRadiusChange(this.value)" />
        </div>

        <button class="btn btn-primary" style="width:100%;" onclick="window._deliverySearch()">
          <i class="fi fi-rr-search"></i> Найти курьеров
        </button>

        <div id="couriers-list" style="display:flex;flex-direction:column;gap:8px;max-height:380px;overflow-y:auto;">
          <div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px;">
            Введите адрес и нажмите «Найти»
          </div>
        </div>
      </div>

      <!-- Карта -->
      <div class="delivery-map-wrap">
        <div id="delivery-map"></div>
      </div>
    </div>
  `);

  await ensureLeaflet();
  window._deliveryMap = L.map('delivery-map').setView([41.2995, 69.2401], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(window._deliveryMap);

  let _pickupMarker = null;
  let _radiusCircle = null;
  let _courierMarkers = [];
  let _pickupLat = 41.2995, _pickupLng = 69.2401;
  let _radius = 10;
  let _selectedCourier = null;

  window._deliveryAddrInput = function(val) {
    // geocode delay
    clearTimeout(window._addrTimer);
    window._addrTimer = setTimeout(async () => {
      if (val.length < 4) return;
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=1`);
        const d = await r.json();
        if (d[0]) {
          _pickupLat = parseFloat(d[0].lat);
          _pickupLng = parseFloat(d[0].lon);
          _updatePickupMarker();
        }
      } catch(e) {}
    }, 600);
  };

  window._deliveryGeo = function() {
    if (!navigator.geolocation) return showToast('Геолокация недоступна', 'warn');
    navigator.geolocation.getCurrentPosition(pos => {
      _pickupLat = pos.coords.latitude;
      _pickupLng = pos.coords.longitude;
      _updatePickupMarker();
      document.getElementById('pickup-addr').value = `${_pickupLat.toFixed(4)}, ${_pickupLng.toFixed(4)}`;
    }, () => showToast('Не удалось получить геолокацию', 'warn'));
  };

  window._deliveryRadiusChange = function(val) {
    _radius = parseInt(val);
    document.getElementById('radius-label').textContent = `${_radius} км`;
    if (_radiusCircle) {
      _radiusCircle.setRadius(_radius * 1000);
    }
  };

  function _updatePickupMarker() {
    if (_pickupMarker) _pickupMarker.remove();
    _pickupMarker = L.marker([_pickupLat, _pickupLng], {
      icon: L.divIcon({
        html: '<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
        className:'', iconSize:[16,16], iconAnchor:[8,8]
      })
    }).addTo(window._deliveryMap).bindPopup('📍 Точка отправки');

    if (_radiusCircle) _radiusCircle.remove();
    _radiusCircle = L.circle([_pickupLat, _pickupLng], {
      radius: _radius * 1000,
      color: '#10b981', fillColor: '#10b981', fillOpacity: 0.08, weight: 2
    }).addTo(window._deliveryMap);

    window._deliveryMap.setView([_pickupLat, _pickupLng], 12);
  }

  // Клик по карте
  window._deliveryMap.on('click', e => {
    _pickupLat = e.latlng.lat;
    _pickupLng = e.latlng.lng;
    document.getElementById('pickup-addr').value = `${_pickupLat.toFixed(4)}, ${_pickupLng.toFixed(4)}`;
    _updatePickupMarker();
  });

  window._deliverySearch = async function() {
    const listEl = document.getElementById('couriers-list');
    listEl.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';

    // Убираем старые маркеры
    _courierMarkers.forEach(m => m.remove());
    _courierMarkers = [];

    try {
      const data = await API.request('GET', '/api/delivery/couriers/nearby', {
        params: { lat: _pickupLat, lng: _pickupLng, radius: _radius }
      });

      if (!data.length) {
        listEl.innerHTML = '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px;">Курьеры не найдены в этом радиусе</div>';
        return;
      }

      listEl.innerHTML = data.map(c => `
        <div class="courier-card-mini" id="ccard-${c.id}" onclick="window._selectCourier(${JSON.stringify(c).replace(/"/g,'&quot;')})">
          <div class="ccm-avatar">${TRANSPORT_ICONS[c.transport_type] || '🚴'}</div>
          <div class="ccm-info">
            <div class="ccm-name">${c.full_name}</div>
            <div class="ccm-meta">
              <span class="stars">${'★'.repeat(Math.round(c.rating))}${'☆'.repeat(5-Math.round(c.rating))}</span>
              ${c.rating} · ${c.distance_km} км
              <span style="margin-left:6px;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:700;
                background:${c.status==='online'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)'};
                color:${c.status==='online'?'#059669':'#d97706'};">
                ${c.status==='online'?'Свободен':'Занят'}
              </span>
            </div>
          </div>
          <div class="ccm-price">${c.est_price.toLocaleString()} сум</div>
        </div>
      `).join('');

      // Маркеры на карте
      data.forEach(c => {
        if (c.lat && c.lng) {
          const icon = L.divIcon({
            html: `<div class="courier-marker ${c.status}" title="${c.full_name}">${TRANSPORT_ICONS[c.transport_type]||'🚴'}</div>`,
            className:'', iconSize:[32,32], iconAnchor:[16,16]
          });
          const m = L.marker([c.lat, c.lng], { icon })
            .addTo(window._deliveryMap)
            .bindPopup(`
              <b>${c.full_name}</b><br>
              ${TRANSPORT_LABELS[c.transport_type]||''} · ⭐ ${c.rating}<br>
              <b style="color:#059669;">${c.est_price.toLocaleString()} сум</b><br>
              <button onclick="window._selectCourierById(${c.id})"
                style="margin-top:8px;padding:4px 10px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
                Вызвать
              </button>
            `);
          _courierMarkers.push(m);
        }
      });

      window._allCouriers = data;

    } catch(e) {
      listEl.innerHTML = `<div style="color:#dc2626;font-size:13px;padding:12px;">Ошибка: ${e.message}</div>`;
    }
  };

  window._selectCourierById = function(id) {
    const c = (window._allCouriers||[]).find(x => x.id === id);
    if (c) window._selectCourier(c);
  };

  window._selectCourier = function(c) {
    _selectedCourier = c;
    document.querySelectorAll('.courier-card-mini').forEach(el => el.classList.remove('selected'));
    const card = document.getElementById(`ccard-${c.id}`);
    if (card) card.classList.add('selected');
    _showOrderModal(c);
  };

  function _showOrderModal(c) {
    const modal = document.createElement('div');
    modal.className = 'order-modal-overlay';
    modal.id = 'order-modal';
    modal.innerHTML = `
      <div class="order-modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="margin:0;">Оформить доставку</h3>
          <button onclick="document.getElementById('order-modal').remove()"
            style="background:none;border:none;cursor:pointer;font-size:20px;color:#9ca3af;">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#f0fdf4;border-radius:12px;margin-bottom:20px;">
          <span style="font-size:28px;">${TRANSPORT_ICONS[c.transport_type]||'🚴'}</span>
          <div>
            <div style="font-weight:700;color:#0f1f12;">${c.full_name}</div>
            <div style="font-size:12px;color:#6b7280;">⭐ ${c.rating} · ${c.distance_km} км от вас</div>
          </div>
        </div>
        <div class="onb-field">
          <label>Адрес доставки</label>
          <input type="text" id="del-addr" placeholder="Куда доставить?" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="onb-field">
            <label>Груз</label>
            <input type="text" id="del-cargo" placeholder="Например: овощи 5кг" />
          </div>
          <div class="onb-field">
            <label>Вес (кг)</label>
            <input type="number" id="del-weight" value="5" min="0.1" step="0.5" />
          </div>
        </div>
        <div class="onb-field">
          <label>Желаемое время (необязательно)</label>
          <input type="datetime-local" id="del-time" />
        </div>
        <div class="price-breakdown" id="del-price-box">
          <div class="pb-row"><span>Базовая ставка</span><span id="pb-base">—</span></div>
          <div class="pb-row"><span>За расстояние</span><span id="pb-dist">—</span></div>
          <div class="pb-total"><span>Итого</span><span id="pb-total">—</span></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="window._calcDelivery('${c.transport_type}')">
            <i class="fi fi-rr-calculator"></i> Рассчитать
          </button>
          <button class="btn btn-primary" style="flex:1;" onclick="window._confirmOrder(${c.id})">
            <i class="fi fi-rr-check"></i> Подтвердить
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  window._calcDelivery = async function(transport) {
    const weight = parseFloat(document.getElementById('del-weight')?.value || 5);
    try {
      const r = await API.request('GET', '/api/delivery/calculate', {
        params: { transport, distance_km: _selectedCourier?.distance_km || 5, weight_kg: weight }
      });
      const base = TARIFFS_FE[transport]?.base || 12000;
      const distCost = r.price - base;
      document.getElementById('pb-base').textContent = base.toLocaleString() + ' сум';
      document.getElementById('pb-dist').textContent = distCost.toLocaleString() + ' сум';
      document.getElementById('pb-total').textContent = r.price.toLocaleString() + ' сум';
    } catch(e) {}
  };

  window._confirmOrder = async function(courierId) {
    const addr = document.getElementById('del-addr')?.value?.trim();
    const cargo = document.getElementById('del-cargo')?.value?.trim();
    const weight = parseFloat(document.getElementById('del-weight')?.value || 5);
    const time = document.getElementById('del-time')?.value;
    if (!addr || !cargo) { showToast('Заполните все поля', 'warn'); return; }
    try {
      await API.request('POST', '/api/delivery/orders', { body: {
        courier_id: courierId,
        pickup_address: document.getElementById('pickup-addr')?.value || '',
        delivery_address: addr,
        pickup_lat: _pickupLat, pickup_lng: _pickupLng,
        delivery_lat: _pickupLat, delivery_lng: _pickupLng,
        cargo_description: cargo,
        weight_kg: weight,
        scheduled_time: time || null,
      }});
      document.getElementById('order-modal')?.remove();
      showToast('Заявка отправлена курьеру! ✅', 'success');
    } catch(e) {
      showToast('Ошибка: ' + e.message, 'error');
    }
  };
}

const TARIFFS_FE = {
  foot:  { base: 3000,  per_km: 500 },
  bike:  { base: 5000,  per_km: 700 },
  moto:  { base: 8000,  per_km: 900 },
  car:   { base: 12000, per_km: 1200 },
  truck: { base: 25000, per_km: 2000 },
};

// ─────────────────────────────────────────────────────────────────────────────
// РЕГИСТРАЦИЯ — добавляем карточку курьера
// Патч render функции регистрации
// ─────────────────────────────────────────────────────────────────────────────

function patchRegisterWithCourier() {
  // Встраиваем карточку курьера в страницу регистрации через наблюдатель
  const orig = window.renderRegister;
  if (!orig || window._courierRegPatched) return;
  window._courierRegPatched = true;

  window.renderRegister = async function() {
    await orig.call(this);
    // Находим role-cards и добавляем курьера
    setTimeout(() => {
      const rolesWrap = document.querySelector('.roles-grid, .role-cards, [class*="role"]');
      if (!rolesWrap) return;
      const existing = rolesWrap.querySelector('[data-role="courier"]');
      if (existing) return;
      const card = document.createElement('div');
      card.className = 'role-card';
      card.setAttribute('data-role', 'courier');
      card.setAttribute('onclick', "document.querySelectorAll('.role-card').forEach(c=>c.classList.remove('active'));this.classList.add('active');document.getElementById('role-input').value='courier';");
      card.innerHTML = `
        <div class="role-icon">🚴</div>
        <div class="role-title">Курьер</div>
        <div class="role-desc">Доставляю заказы</div>
      `;
      rolesWrap.appendChild(card);
    }, 100);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COURIER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

let _courierSection = 'home';

async function renderCourierDashboard() {
  injectDeliveryStyles();
  const app = document.getElementById('app');
  const user = Auth.getUser();

  const SECTIONS = [
    { id: 'home',    icon: 'fi fi-rr-home',            label: 'Главная' },
    { id: 'orders',  icon: 'fi fi-rr-box-open',        label: 'Заказы' },
    { id: 'map',     icon: 'fi fi-rr-map-marker',      label: 'Карта' },
    { id: 'tariffs', icon: 'fi fi-rr-dollar',          label: 'Тарифы' },
    { id: 'ai',      icon: 'fi fi-rr-comment-alt',     label: 'ИИ' },
    { id: 'wallet',  icon: 'fi fi-rr-wallet',          label: 'Кошелёк' },
    { id: 'market',  icon: 'fi fi-rr-store-alt',       label: 'Рынок' },
    { id: 'profile', icon: 'fi fi-rr-user',            label: 'Профиль' },
  ];

  app.innerHTML = pageShell(`
    <div class="courier-layout">
      <aside class="courier-sidebar">
        <div class="cs-logo">🚴 Курьер</div>
        ${SECTIONS.map(s => `
          <div class="cs-nav-item ${s.id === _courierSection ? 'active' : ''}" id="cs-nav-${s.id}"
            onclick="window._courierNav('${s.id}')">
            <i class="${s.icon}"></i> ${s.label}
          </div>
        `).join('')}
        <div style="padding:16px 20px;margin-top:auto;">
          <button class="btn btn-ghost" style="width:100%;font-size:12px;" onclick="Auth.logout()">
            <i class="fi fi-rr-sign-out-alt"></i> Выйти
          </button>
        </div>
      </aside>
      <div class="courier-content" id="courier-content">
        <div class="spinner"></div>
      </div>
    </div>
  `);

  window._courierNav = function(section) {
    _courierSection = section;
    document.querySelectorAll('.cs-nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`cs-nav-${section}`);
    if (navEl) navEl.classList.add('active');
    renderCourierSection(section);
  };

  renderCourierSection(_courierSection);
}

async function renderCourierSection(section) {
  const el = document.getElementById('courier-content');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';

  switch (section) {
    case 'home':    await renderCourierHome(el); break;
    case 'orders':  await renderCourierOrders(el); break;
    case 'map':     await renderCourierMap(el); break;
    case 'tariffs': renderCourierTariffs(el); break;
    case 'ai':      renderCourierAI(el); break;
    case 'wallet':  await renderCourierWallet(el); break;
    case 'market':  window.router.go('/market'); break;
    case 'profile': await renderCourierProfile(el); break;
    default:        el.innerHTML = '<p>Раздел в разработке</p>';
  }
}

// ── Главная курьера ──────────────────────────────────────────────────────────
async function renderCourierHome(el) {
  let profile = { status: 'offline', full_name: Auth.getUser()?.name || 'Курьер' };
  let orders = [];

  try {
    profile = await API.request('GET', '/api/courier/profile');
  } catch(e) {
    // профиль не заполнен
    el.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:64px;margin-bottom:16px;">🚴</div>
        <h2 style="font-size:24px;font-weight:800;color:#0f1f12;margin-bottom:8px;">Добро пожаловать!</h2>
        <p style="color:#6b7280;margin-bottom:28px;">Заполните профиль курьера чтобы начать принимать заявки</p>
        <button class="btn btn-primary btn-lg" onclick="window._startOnboarding()">
          <i class="fi fi-rr-arrow-right"></i> Заполнить профиль
        </button>
      </div>
    `;
    window._startOnboarding = () => renderOnboarding();
    return;
  }

  try {
    orders = await API.request('GET', '/api/courier/orders');
  } catch(e) {}

  const isOnline = profile.status === 'online';
  const isBusy = profile.status === 'busy';

  el.innerHTML = `
    <div class="online-toggle-bar">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="status-dot ${profile.status}"></div>
        <div>
          <div style="font-weight:600;color:#0f1f12;font-size:14px;">
            ${isOnline ? '🟢 Онлайн — доступен' : isBusy ? '🟡 Занят' : '⚫ Офлайн'}
          </div>
          <div style="font-size:12px;color:#6b7280;">Нажмите чтобы изменить статус</div>
        </div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" id="courier-online-toggle" ${isOnline || isBusy ? 'checked' : ''}
          onchange="window._toggleCourierStatus(this.checked)">
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="courier-stats">
      <div class="cstat-card">
        <div class="cstat-label">Всего заказов</div>
        <div class="cstat-value">${orders.length}</div>
        <div class="cstat-sub">за всё время</div>
      </div>
      <div class="cstat-card">
        <div class="cstat-label">Завершено</div>
        <div class="cstat-value">${orders.filter(o=>o.status==='delivered').length}</div>
        <div class="cstat-sub">доставок</div>
      </div>
      <div class="cstat-card">
        <div class="cstat-label">Рейтинг</div>
        <div class="cstat-value" style="color:#f59e0b;">⭐ ${profile.rating || 5.0}</div>
        <div class="cstat-sub">средний балл</div>
      </div>
      <div class="cstat-card">
        <div class="cstat-label">Кошелёк</div>
        <div class="cstat-value" style="color:#059669;">${(profile.wallet||0).toLocaleString()}</div>
        <div class="cstat-sub">сум</div>
      </div>
    </div>

    ${orders.filter(o=>o.status==='pending'||o.status==='accepted').length > 0 ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:16px;font-weight:700;color:#0f1f12;margin-bottom:12px;">Активный маршрут</div>
        ${_renderOrderCards(orders.filter(o=>['pending','accepted','in_transit'].includes(o.status)).slice(0,3))}
      </div>
    ` : `
      <div style="background:#f0fdf4;border-radius:14px;padding:24px;text-align:center;border:1px solid rgba(16,185,129,0.15);">
        <div style="font-size:32px;margin-bottom:8px;">📭</div>
        <div style="color:#6b7280;font-size:14px;">Нет активных заявок</div>
        ${isOnline ? '<div style="color:#10b981;font-size:12px;margin-top:4px;">Ожидаем новые заявки...</div>' : ''}
      </div>
    `}
  `;

  window._toggleCourierStatus = async function(online) {
    try {
      await API.request('PUT', '/api/courier/status', { body: { status: online ? 'online' : 'offline' } });
      showToast(online ? '🟢 Вы онлайн' : '⚫ Вы офлайн', 'info');
    } catch(e) { showToast('Ошибка', 'error'); }
  };
}

// ── Заказы курьера ───────────────────────────────────────────────────────────
async function renderCourierOrders(el) {
  let orders = [];
  try { orders = await API.request('GET', '/api/courier/orders'); } catch(e) {}

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:800;color:#0f1f12;">Мои заказы</h2>
      <span style="color:#6b7280;font-size:13px;">Всего: ${orders.length}</span>
    </div>
    ${orders.length ? `<div class="courier-orders-list">${_renderOrderCards(orders)}</div>`
      : '<div style="text-align:center;padding:40px;color:#9ca3af;">Пока нет заказов</div>'}
  `;
}

function _renderOrderCards(orders) {
  const STATUS_MAP = {
    pending:    ['Ожидает', 'pending'],
    accepted:   ['Принято', 'accepted'],
    picked_up:  ['Забрали', 'accepted'],
    in_transit: ['В пути', 'in_transit'],
    delivered:  ['Доставлено', 'delivered'],
    cancelled:  ['Отменено', 'cancelled'],
  };
  return orders.map(o => {
    const [label, cls] = STATUS_MAP[o.status] || [o.status, 'pending'];
    return `
      <div class="courier-order-card">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
            <span style="font-weight:700;color:#0f1f12;">#${o.id}</span>
            <span class="order-status-badge badge-${cls}">${label}</span>
          </div>
          <div style="font-size:13px;color:#374151;margin-bottom:4px;">
            <i class="fi fi-rr-map-marker" style="color:#10b981;"></i>
            ${o.pickup_address || '—'} → ${o.delivery_address || '—'}
          </div>
          <div style="font-size:12px;color:#6b7280;">
            ${o.cargo || ''} · ${o.weight_kg || 0} кг · ${(o.distance_km||0)} км
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:800;color:#059669;">${(o.price||0).toLocaleString()} сум</div>
          ${o.status === 'pending' ? `
            <button class="btn btn-primary" style="margin-top:8px;font-size:12px;padding:6px 14px;"
              onclick="window._acceptOrder(${o.id})">Принять</button>
          ` : ''}
          ${o.status === 'accepted' ? `
            <button class="btn btn-primary" style="margin-top:8px;font-size:12px;padding:6px 14px;"
              onclick="window._updateOrderStatus(${o.id},'delivered')">✓ Доставлено</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window._acceptOrder = async function(id) {
  try {
    await API.request('POST', `/api/delivery/orders/${id}/accept`);
    showToast('Заявка принята!', 'success');
    renderCourierSection('orders');
  } catch(e) { showToast('Ошибка: ' + e.message, 'error'); }
};

window._updateOrderStatus = async function(id, status) {
  try {
    await API.request('PUT', `/api/delivery/orders/${id}/status`, { body: { status } });
    showToast(status === 'delivered' ? '✅ Доставлено! Деньги зачислены' : 'Статус обновлён', 'success');
    if (status === 'delivered') _showRatingPrompt();
    renderCourierSection('orders');
  } catch(e) { showToast('Ошибка', 'error'); }
};

function _showRatingPrompt() {
  const pop = document.createElement('div');
  pop.className = 'rating-popup';
  pop.innerHTML = `
    <div style="font-weight:700;font-size:16px;color:#0f1f12;margin-bottom:4px;">Оцените клиента</div>
    <div style="font-size:13px;color:#6b7280;margin-bottom:8px;">Как прошла доставка?</div>
    <div class="star-row" id="star-row">
      ${[1,2,3,4,5].map(i=>`<span class="star-btn" data-val="${i}" onclick="window._setRating(${i})">☆</span>`).join('')}
    </div>
    <textarea id="rating-comment" placeholder="Комментарий (необязательно)"
      style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(16,185,129,0.2);font-size:13px;resize:none;height:60px;box-sizing:border-box;"></textarea>
    <div style="display:flex;gap:8px;margin-top:12px;">
      <button class="btn btn-ghost" style="flex:1;font-size:12px;" onclick="this.closest('.rating-popup').remove()">Позже</button>
      <button class="btn btn-primary" style="flex:1;font-size:12px;" onclick="window._submitRating()">Отправить</button>
    </div>
  `;
  document.body.appendChild(pop);
  window._ratingVal = 0;

  window._setRating = function(val) {
    window._ratingVal = val;
    document.querySelectorAll('.star-btn').forEach((s, i) => {
      s.textContent = i < val ? '★' : '☆';
      s.style.color = i < val ? '#fbbf24' : '#9ca3af';
    });
  };
  window._submitRating = async function() {
    if (!window._ratingVal) { showToast('Выберите оценку', 'warn'); return; }
    const comment = document.getElementById('rating-comment')?.value;
    showToast('Спасибо за оценку!', 'success');
    pop.remove();
  };
}

// ── Карта курьеров ───────────────────────────────────────────────────────────
async function renderCourierMap(el) {
  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:16px;">Карта курьеров</h2>
    <div style="border-radius:16px;overflow:hidden;border:1px solid rgba(16,185,129,0.15);">
      <div id="courier-map" style="height:500px;"></div>
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;">
      <span><span style="color:#10b981;">●</span> Свободен</span>
      <span><span style="color:#f59e0b;">●</span> Занят</span>
    </div>
  `;
  await ensureLeaflet();
  const map = L.map('courier-map').setView([41.2995, 69.2401], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);

  try {
    const couriers = await API.request('GET', '/api/delivery/couriers/nearby', {
      params: { lat: 41.2995, lng: 69.2401, radius: 50 }
    });
    couriers.forEach(c => {
      if (!c.lat || !c.lng) return;
      L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          html: `<div class="courier-marker ${c.status}">${TRANSPORT_ICONS[c.transport_type]||'🚴'}</div>`,
          className:'', iconSize:[32,32], iconAnchor:[16,16]
        })
      }).addTo(map).bindPopup(`<b>${c.full_name}</b><br>⭐ ${c.rating}`);
    });
  } catch(e) {}
}

// ── Тарифы ───────────────────────────────────────────────────────────────────
function renderCourierTariffs(el) {
  const rows = [
    { icon:'🚶', label:'Пешком',    key:'foot',  base:'3 000', km:'500',   extra:'—' },
    { icon:'🚴', label:'Велосипед', key:'bike',  base:'5 000', km:'700',   extra:'—' },
    { icon:'🛵', label:'Мотоцикл',  key:'moto',  base:'8 000', km:'900',   extra:'+1 000' },
    { icon:'🚗', label:'Авто',      key:'car',   base:'12 000',km:'1 200', extra:'+2 000' },
    { icon:'🚐', label:'Грузовик',  key:'truck', base:'25 000',km:'2 000', extra:'договор' },
  ];

  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:20px;">Тарифы доставки</h2>
    <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;overflow:hidden;margin-bottom:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#f0fdf4;">
            <th style="padding:14px 16px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Транспорт</th>
            <th style="padding:14px 16px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">База</th>
            <th style="padding:14px 16px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">За км</th>
            <th style="padding:14px 16px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Доп. вес >10кг</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i) => `
            <tr style="border-top:1px solid rgba(16,185,129,0.08);${i%2===1?'background:#fafff8':''}">
              <td style="padding:14px 16px;font-weight:600;color:#0f1f12;">${r.icon} ${r.label}</td>
              <td style="padding:14px 16px;text-align:right;color:#059669;font-weight:700;">${r.base} сум</td>
              <td style="padding:14px 16px;text-align:right;color:#374151;">+${r.km} сум</td>
              <td style="padding:14px 16px;text-align:right;color:#374151;">${r.extra}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;">
      <h3 style="font-size:16px;font-weight:700;color:#0f1f12;margin-bottom:16px;">🧮 Калькулятор</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
        <div class="onb-field" style="margin:0;">
          <label>Транспорт</label>
          <select id="calc-transport">
            ${rows.map(r=>`<option value="${r.key}">${r.icon} ${r.label}</option>`).join('')}
          </select>
        </div>
        <div class="onb-field" style="margin:0;">
          <label>Расстояние (км)</label>
          <input type="number" id="calc-dist" value="5" min="0.1" step="0.5" />
        </div>
        <div class="onb-field" style="margin:0;">
          <label>Вес (кг)</label>
          <input type="number" id="calc-weight" value="3" min="0" step="0.5" />
        </div>
      </div>
      <button class="btn btn-primary" onclick="window._calcTariff()">Рассчитать</button>
      <div id="calc-result" style="margin-top:16px;display:none;background:#f0fdf4;border-radius:10px;padding:16px;border:1px solid rgba(16,185,129,0.15);">
        <div style="font-size:24px;font-weight:800;color:#059669;" id="calc-price"></div>
        <div style="font-size:12px;color:#6b7280;margin-top:4px;" id="calc-breakdown"></div>
      </div>
    </div>
  `;

  window._calcTariff = function() {
    const transport = document.getElementById('calc-transport').value;
    const dist = parseFloat(document.getElementById('calc-dist').value) || 5;
    const weight = parseFloat(document.getElementById('calc-weight').value) || 0;
    const t = TARIFFS_FE[transport];
    let price = t.base + t.per_km * dist;
    const EXTRA = { moto: 1000, car: 2000, truck: 0 };
    if (weight > 10 && EXTRA[transport]) price += EXTRA[transport] * Math.ceil((weight-10)/5);
    document.getElementById('calc-price').textContent = price.toLocaleString() + ' сум';
    document.getElementById('calc-breakdown').textContent =
      `${t.base.toLocaleString()} (база) + ${(t.per_km * dist).toLocaleString()} (${dist}км)${weight>10?' + доп. вес':''}`;
    document.getElementById('calc-result').style.display = 'block';
  };
}

// ── ИИ-помощник ──────────────────────────────────────────────────────────────
function renderCourierAI(el) {
  let msgs = [{ role:'bot', text:'Привет! Я ИИ-помощник курьера AgroVerse. Спросите про маршруты, тарифы или что угодно связанное с работой.' }];

  function renderMsgs() {
    document.getElementById('courier-ai-msgs').innerHTML = msgs.map(m =>
      `<div class="ai-msg ${m.role}">${m.text}</div>`
    ).join('');
    const container = document.getElementById('courier-ai-msgs');
    container.scrollTop = container.scrollHeight;
  }

  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:20px;">🤖 ИИ-помощник</h2>
    <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:20px;">
      <div class="courier-ai-wrap">
        <div class="courier-ai-messages" id="courier-ai-msgs"></div>
        <div class="ai-input-row">
          <input type="text" id="courier-ai-input" placeholder="Спросите что-нибудь..."
            onkeydown="if(event.key==='Enter')window._courierAISend()" />
          <button class="btn btn-primary" onclick="window._courierAISend()">
            <i class="fi fi-rr-paper-plane-top"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  renderMsgs();

  window._courierAISend = async function() {
    const input = document.getElementById('courier-ai-input');
    const text = input.value.trim();
    if (!text) return;
    msgs.push({ role: 'user', text });
    input.value = '';
    msgs.push({ role: 'bot', text: '⏳ Думаю...' });
    renderMsgs();
    try {
      const r = await API.request('POST', '/api/courier/ai/chat', { body: { message: text } });
      msgs[msgs.length-1].text = r.reply;
    } catch(e) {
      msgs[msgs.length-1].text = '⚠️ Ошибка связи с ИИ';
    }
    renderMsgs();
  };
}

// ── Кошелёк курьера ──────────────────────────────────────────────────────────
async function renderCourierWallet(el) {
  let wallet = { balance: 0, history: [] };
  try { wallet = await API.request('GET', '/api/courier/wallet'); } catch(e) {}

  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:20px;">💰 Кошелёк</h2>

    <div class="wallet-card-courier">
      <div style="font-size:13px;opacity:0.8;">Баланс</div>
      <div class="wc-balance">${(wallet.balance||0).toLocaleString()} сум</div>
      <div style="font-size:12px;opacity:0.7;">Доступно для вывода</div>
    </div>

    <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;margin-bottom:20px;">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">Вывод средств</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div class="onb-field" style="margin:0;">
          <label>Сумма (сум)</label>
          <input type="number" id="withdraw-amount" placeholder="10000" min="1000" />
        </div>
        <div class="onb-field" style="margin:0;">
          <label>Способ</label>
          <select id="withdraw-method">
            <option value="click">Click</option>
            <option value="payme">Payme</option>
          </select>
        </div>
      </div>
      <button class="btn btn-primary" onclick="window._courierWithdraw()">Вывести</button>
    </div>

    <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;">
      <h3 style="font-size:16px;font-weight:700;margin-bottom:16px;">История</h3>
      ${wallet.history.length ? wallet.history.reverse().map(h => `
        <div class="history-item">
          <div class="hi-icon ${h.type}"><i class="fi fi-rr-${h.type==='income'?'arrow-down':'arrow-up'}"></i></div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;color:#0f1f12;">${h.desc || (h.type==='income'?'Доставка':'Вывод')}</div>
            <div style="font-size:11px;color:#9ca3af;">${h.method||''} · ${h.status||''}</div>
          </div>
          <div style="font-size:14px;font-weight:700;color:${h.type==='income'?'#059669':'#dc2626'};">
            ${h.type==='income'?'+':'−'}${(h.amount||0).toLocaleString()} сум
          </div>
        </div>
      `).join('') : '<div style="color:#9ca3af;text-align:center;padding:20px;">Нет транзакций</div>'}
    </div>
  `;

  window._courierWithdraw = async function() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    const method = document.getElementById('withdraw-method').value;
    if (!amount || amount < 1000) { showToast('Минимум 1000 сум', 'warn'); return; }
    try {
      await API.request('POST', '/api/courier/wallet/withdraw', { body: { amount, method } });
      showToast('Заявка на вывод отправлена!', 'success');
      renderCourierSection('wallet');
    } catch(e) { showToast(e.message, 'error'); }
  };
}

// ── Профиль курьера ──────────────────────────────────────────────────────────
async function renderCourierProfile(el) {
  let profile = null;
  try { profile = await API.request('GET', '/api/courier/profile'); } catch(e) {}

  if (!profile) {
    el.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <p>Профиль не заполнен.</p>
        <button class="btn btn-primary" onclick="window._startOnboarding()">Заполнить профиль</button>
      </div>`;
    window._startOnboarding = () => renderOnboarding();
    return;
  }

  const ratings = [];
  const avgRating = profile.rating || 5.0;

  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:20px;">👤 Мой профиль</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
          <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#10b981,#059669);display:grid;place-items:center;font-size:28px;">
            ${TRANSPORT_ICONS[profile.transport_type]||'🚴'}
          </div>
          <div>
            <div style="font-size:18px;font-weight:800;color:#0f1f12;">${profile.full_name}</div>
            <div style="font-size:13px;color:#6b7280;">${TRANSPORT_LABELS[profile.transport_type]||''} · ${profile.city}</div>
            <div style="font-size:13px;color:#f59e0b;margin-top:2px;">
              ${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5-Math.round(avgRating))} ${avgRating}
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;padding:10px;background:#f0fdf4;border-radius:8px;">
            <span style="font-size:13px;color:#6b7280;">Телефон</span>
            <span style="font-size:13px;font-weight:600;color:#0f1f12;">${profile.phone}</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px;background:#f0fdf4;border-radius:8px;">
            <span style="font-size:13px;color:#6b7280;">Радиус работы</span>
            <span style="font-size:13px;font-weight:600;color:#0f1f12;">${profile.radius_km} км</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px;background:#f0fdf4;border-radius:8px;">
            <span style="font-size:13px;color:#6b7280;">Грузоподъёмность</span>
            <span style="font-size:13px;font-weight:600;color:#0f1f12;">${profile.max_weight} кг</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:10px;background:#f0fdf4;border-radius:8px;">
            <span style="font-size:13px;color:#6b7280;">Термосумка</span>
            <span style="font-size:13px;font-weight:600;color:#0f1f12;">${profile.has_thermo_bag?'✅ Есть':'❌ Нет'}</span>
          </div>
          ${profile.bio ? `<div style="padding:10px;background:#f0fdf4;border-radius:8px;font-size:13px;color:#374151;">${profile.bio}</div>` : ''}
        </div>
      </div>

      <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;">
        <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">Отзывы</h3>
        ${avgRating < 3.0 ? `
          <div style="background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:12px;margin-bottom:12px;color:#dc2626;font-size:13px;">
            ⚠️ ${avgRating < 2.5 ? 'Аккаунт заблокирован из-за низкого рейтинга' : 'Рейтинг ниже 3.0 — предупреждение'}
          </div>
        ` : ''}
        <div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px;">
          Отзывы появятся после первых доставок
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// ОНБОРДИНГ КУРЬЕРА
// ─────────────────────────────────────────────────────────────────────────────

let _onbStep = 0;
let _onbData = {};

async function renderOnboarding() {
  injectDeliveryStyles();
  const app = document.getElementById('app');

  app.innerHTML = pageShell(`
    <div class="onboarding-page" id="onboarding-wrap">
      <div class="onb-progress">
        ${[0,1,2].map(i=>`<div class="onb-step-dot ${i<=_onbStep?'active':''}" id="onb-dot-${i}"></div>`).join('')}
      </div>
      <div id="onb-step-content"></div>
    </div>
  `);

  _onbStep = 0;
  _onbData = {};
  renderOnbStep();
}

function renderOnbStep() {
  const el = document.getElementById('onb-step-content');
  if (!el) return;
  [0,1,2].forEach(i => {
    const d = document.getElementById(`onb-dot-${i}`);
    if (d) d.className = `onb-step-dot ${i<=_onbStep?'active':''}`;
  });

  if (_onbStep === 0) {
    el.innerHTML = `
      <div class="onb-card">
        <h3>🚗 Шаг 1 — Транспорт</h3>
        <p class="sub">Выберите тип транспорта и укажите характеристики</p>
        <div class="transport-grid">
          ${Object.entries(TRANSPORT_ICONS).map(([k,v]) => `
            <div class="transport-btn ${_onbData.transport_type===k?'sel':''}" id="tb-${k}"
              onclick="window._onbSelectTransport('${k}')">
              <span>${v}</span>${TRANSPORT_LABELS[k]}
            </div>
          `).join('')}
        </div>
        <div class="onb-field">
          <label>Грузоподъёмность (кг)</label>
          <input type="number" id="onb-weight" value="${_onbData.max_weight||20}" min="1" />
        </div>
        <div class="onb-toggle-wrap">
          <label>Термосумка (для свежих продуктов)</label>
          <label class="toggle-switch">
            <input type="checkbox" id="onb-thermo" ${_onbData.has_thermo_bag?'checked':''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="onb-actions">
          <button class="btn btn-primary" onclick="window._onbNext()">Далее →</button>
        </div>
      </div>`;
  } else if (_onbStep === 1) {
    el.innerHTML = `
      <div class="onb-card">
        <h3>🗺️ Шаг 2 — Зона работы</h3>
        <p class="sub">Укажите свой опыт, город и зону доставки</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="onb-field">
            <label>Город</label>
            <input type="text" id="onb-city" value="${_onbData.city||'Ташкент'}" />
          </div>
          <div class="onb-field">
            <label>Радиус (км)</label>
            <input type="number" id="onb-radius" value="${_onbData.radius_km||10}" min="1" max="100" />
          </div>
          <div class="onb-field">
            <label>Опыт (лет)</label>
            <input type="number" id="onb-exp" value="${_onbData.experience_years||0}" min="0" />
          </div>
          <div class="onb-field">
            <label>Режим работы</label>
            <select id="onb-mode">
              <option value="flexible" ${_onbData.work_mode==='flexible'?'selected':''}>Гибкий</option>
              <option value="day" ${_onbData.work_mode==='day'?'selected':''}>День</option>
              <option value="evening" ${_onbData.work_mode==='evening'?'selected':''}>Вечер</option>
            </select>
          </div>
        </div>
        <div class="onb-field">
          <label>Рабочие часы</label>
          <input type="text" id="onb-hours" value="${_onbData.work_hours||'09:00-18:00'}" placeholder="09:00-18:00" />
        </div>
        <div class="onb-actions">
          <button class="btn btn-ghost" onclick="window._onbBack()">← Назад</button>
          <button class="btn btn-primary" onclick="window._onbNext()">Далее →</button>
        </div>
      </div>`;
  } else if (_onbStep === 2) {
    el.innerHTML = `
      <div class="onb-card">
        <h3>📋 Шаг 3 — Данные</h3>
        <p class="sub">Заполните личные данные для проверки</p>
        <div class="onb-field">
          <label>ФИО</label>
          <input type="text" id="onb-fullname" value="${_onbData.full_name||Auth.getUser()?.name||''}" />
        </div>
        <div class="onb-field">
          <label>Телефон</label>
          <input type="text" id="onb-phone" value="${_onbData.phone||''}" placeholder="+998 90 000 00 00" />
        </div>
        <div class="onb-field">
          <label>Номер ТС (необязательно)</label>
          <input type="text" id="onb-vehicle" value="${_onbData.vehicle_number||''}" placeholder="01 А 123 AA" />
        </div>
        <div class="onb-field">
          <label>О себе</label>
          <textarea id="onb-bio" placeholder="Опыт работы, преимущества...">${_onbData.bio||''}</textarea>
        </div>
        <div class="onb-actions">
          <button class="btn btn-ghost" onclick="window._onbBack()">← Назад</button>
          <button class="btn btn-primary" onclick="window._onbSubmit()">
            <i class="fi fi-rr-check"></i> Готово!
          </button>
        </div>
      </div>`;
  }
}

window._onbSelectTransport = function(key) {
  _onbData.transport_type = key;
  document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('sel'));
  const btn = document.getElementById(`tb-${key}`);
  if (btn) btn.classList.add('sel');
};

window._onbNext = function() {
  if (_onbStep === 0) {
    if (!_onbData.transport_type) { showToast('Выберите транспорт', 'warn'); return; }
    _onbData.max_weight = parseFloat(document.getElementById('onb-weight')?.value || 20);
    _onbData.has_thermo_bag = document.getElementById('onb-thermo')?.checked || false;
  } else if (_onbStep === 1) {
    _onbData.city = document.getElementById('onb-city')?.value?.trim() || 'Ташкент';
    _onbData.radius_km = parseFloat(document.getElementById('onb-radius')?.value || 10);
    _onbData.experience_years = parseInt(document.getElementById('onb-exp')?.value || 0);
    _onbData.work_mode = document.getElementById('onb-mode')?.value || 'flexible';
    _onbData.work_hours = document.getElementById('onb-hours')?.value || '09:00-18:00';
    if (!_onbData.city) { showToast('Укажите город', 'warn'); return; }
  }
  _onbStep++;
  renderOnbStep();
};

window._onbBack = function() { _onbStep--; renderOnbStep(); };

window._onbSubmit = async function() {
  const fullName = document.getElementById('onb-fullname')?.value?.trim();
  const phone = document.getElementById('onb-phone')?.value?.trim();
  if (!fullName || !phone) { showToast('ФИО и телефон обязательны', 'warn'); return; }
  _onbData.full_name = fullName;
  _onbData.phone = phone;
  _onbData.vehicle_number = document.getElementById('onb-vehicle')?.value?.trim() || null;
  _onbData.bio = document.getElementById('onb-bio')?.value?.trim() || null;

  try {
    await API.request('POST', '/api/courier/profile/setup', { body: _onbData });
    launchConfetti();
    showToast('Профиль курьера создан! 🎉', 'success');
    setTimeout(() => renderCourierDashboard(), 1200);
  } catch(e) {
    showToast('Ошибка: ' + e.message, 'error');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// WELCOME SCREEN (после регистрации как курьер)
// ─────────────────────────────────────────────────────────────────────────────
function showCourierWelcome() {
  injectDeliveryStyles();
  launchConfetti();
  const overlay = document.createElement('div');
  overlay.className = 'welcome-screen';
  overlay.innerHTML = `
    <div class="welcome-box">
      <div class="welcome-icon">🚴</div>
      <h2>Добро пожаловать, курьер!</h2>
      <p>Вы присоединились к команде AgroVerse.<br>Заполните профиль чтобы начать принимать заказы.</p>
      <button class="btn btn-primary btn-lg" onclick="this.closest('.welcome-screen').remove();renderOnboarding();">
        <i class="fi fi-rr-user"></i> Заполнить профиль
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ─── Экспорт ─────────────────────────────────────────────────────────────────
window.renderDelivery = renderDelivery;
window.renderCourierDashboard = renderCourierDashboard;
window.renderOnboarding = renderOnboarding;
window.showCourierWelcome = showCourierWelcome;
window.patchRegisterWithCourier = patchRegisterWithCourier;
