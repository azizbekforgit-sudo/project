/* ============================================================
   delivery.js — Модуль Доставки AgroVerse v2.0
   - /delivery   — поиск Йўлчи (для покупателя/фермера)
   - /yulchi     — дашборд Йўлчи
   - /yulchi/:id — публичный профиль Йўлчи
   ============================================================ */

// ─── Leaflet + Routing Machine lazy loader ───────────────────────────────────
async function ensureLeaflet() {
  if (window.L && window.L.Routing) return;
  await new Promise((res, rej) => {
    const loaded = [];
    const done = () => { if (loaded.length >= 2) res(); };

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById('lrm-css')) {
      const link = document.createElement('link');
      link.id = 'lrm-css'; link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
      document.head.appendChild(link);
    }

    function loadScript(id, src, cb) {
      if (document.getElementById(id)) { cb(); return; }
      const s = document.createElement('script');
      s.id = id; s.src = src;
      s.onload = cb; s.onerror = rej;
      document.head.appendChild(s);
    }

    loadScript('leaflet-js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', () => {
      loaded.push(1); done();
      loadScript('lrm-js', 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.min.js', () => {
        loaded.push(2); done();
      });
    });
  });
}

// ─── Transport config (no foot/bike) ─────────────────────────────────────────
const TRANSPORT_ICONS = { moto:'🛵', car:'🚗', truck:'🚐' };
const TRANSPORT_LABELS = { moto:'Мотоцикл', car:'Автомобиль', truck:'Грузовик' };
const TARIFFS_FE = {
  moto:  { base: 8000,  per_km: 900,  extra_weight: 1000 },
  car:   { base: 12000, per_km: 1200, extra_weight: 2000 },
  truck: { base: 25000, per_km: 2000, extra_weight: 0 },
};

// ─── Confetti ────────────────────────────────────────────────────────────────
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
      animation-delay:${Math.random()*0.5}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
  if (!document.getElementById('confetti-style')) {
    const s = document.createElement('style');
    s.id = 'confetti-style';
    s.textContent = `@keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`;
    document.head.appendChild(s);
  }
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function injectDeliveryStyles() {
  if (document.getElementById('av-delivery-styles')) return;
  const s = document.createElement('style');
  s.id = 'av-delivery-styles';
  s.textContent = `
  /* ── Онбординг ── */
  .onboarding-page { max-width:600px;margin:0 auto; }
  .onb-progress { display:flex;gap:8px;margin-bottom:32px; }
  .onb-step-dot { flex:1;height:4px;border-radius:2px;background:rgba(16,185,129,0.2);transition:background 0.3s; }
  .onb-step-dot.active { background:#10b981; }
  .onb-card { background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:20px;padding:32px;box-shadow:0 8px 32px rgba(16,185,129,0.08); }
  .onb-card h3 { font-size:22px;font-weight:800;color:#0f1f12;margin-bottom:8px; }
  .onb-card .sub { color:#6b7280;margin-bottom:28px; }

  /* Transport grid (3 items only) */
  .transport-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px; }
  .transport-btn {
    display:flex;flex-direction:column;align-items:center;gap:8px;padding:18px 10px;
    border-radius:14px;border:2px solid rgba(16,185,129,0.2);background:#f0fdf4;
    cursor:pointer;transition:all 0.2s;font-size:12px;font-weight:600;color:#374151;
  }
  .transport-btn .t-icon { font-size:32px; }
  .transport-btn:hover,.transport-btn.sel { border-color:#10b981;background:rgba(16,185,129,0.1);color:#059669; }

  .onb-field { margin-bottom:16px; }
  .onb-field label { font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px; }
  .onb-field input,.onb-field select,.onb-field textarea {
    width:100%;padding:12px 16px;border-radius:12px;border:1.5px solid rgba(16,185,129,0.2);
    background:#fff;font-size:14px;color:#0f1f12;outline:none;box-sizing:border-box;transition:border-color 0.2s;
  }
  .onb-field input:focus,.onb-field select:focus,.onb-field textarea:focus { border-color:#10b981; }
  .onb-field textarea { resize:vertical;min-height:80px; }
  .onb-toggle-wrap { display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#f0fdf4;border-radius:12px;border:1px solid rgba(16,185,129,0.15); }
  .toggle-switch { position:relative;width:44px;height:24px; }
  .toggle-switch input { opacity:0;width:0;height:0; }
  .toggle-slider { position:absolute;inset:0;cursor:pointer;background:#d1d5db;border-radius:24px;transition:0.3s; }
  .toggle-slider::before { content:'';position:absolute;width:18px;height:18px;border-radius:50%;background:#fff;left:3px;top:3px;transition:0.3s; }
  input:checked+.toggle-slider { background:#10b981; }
  input:checked+.toggle-slider::before { transform:translateX(20px); }
  .onb-actions { display:flex;gap:12px;justify-content:flex-end;margin-top:24px; }

  /* Pending approval banner */
  .pending-banner {
    background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);
    border-radius:14px;padding:18px 20px;margin-bottom:20px;
    display:flex;align-items:center;gap:12px;
  }
  .pending-banner .pb-icon { font-size:28px; }
  .pending-banner p { color:#92400e;font-size:14px;line-height:1.5;margin:0; }
  .pending-banner strong { color:#78350f; }

  /* ── Courier Dashboard ── */
  .courier-layout { display:flex;gap:0;min-height:calc(100vh - 140px); }
  .courier-sidebar {
    width:220px;flex-shrink:0;background:#fff;
    border-right:1px solid rgba(16,185,129,0.15);
    border-radius:16px 0 0 16px;padding:20px 0;
  }
  .cs-logo { padding:0 20px 20px;font-size:18px;font-weight:800;color:#0f1f12;border-bottom:1px solid rgba(16,185,129,0.1);margin-bottom:12px; }
  .cs-nav-item {
    display:flex;align-items:center;gap:10px;padding:11px 20px;cursor:pointer;
    font-size:13px;font-weight:500;color:#6b7280;transition:all 0.15s;border-left:3px solid transparent;
  }
  .cs-nav-item:hover { background:rgba(16,185,129,0.05);color:#059669; }
  .cs-nav-item.active { background:rgba(16,185,129,0.08);color:#059669;border-left-color:#10b981;font-weight:600; }
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
  .cstat-card { background:#fff;border:1px solid rgba(16,185,129,0.12);border-radius:14px;padding:16px;box-shadow:0 2px 12px rgba(16,185,129,0.04); }
  .cstat-label { font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px; }
  .cstat-value { font-size:26px;font-weight:800;color:#0f1f12;line-height:1; }
  .cstat-sub { font-size:11px;color:#6b7280;margin-top:4px; }

  /* Orders list */
  .courier-orders-list { display:flex;flex-direction:column;gap:12px; }
  .courier-order-card {
    background:#fff;border:1px solid rgba(16,185,129,0.12);
    border-radius:14px;padding:18px;display:flex;gap:16px;align-items:flex-start;transition:box-shadow 0.2s;
  }
  .courier-order-card:hover { box-shadow:0 4px 20px rgba(16,185,129,0.1); }
  .order-status-badge { padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap; }
  .badge-pending   { background:rgba(245,158,11,0.1);color:#d97706; }
  .badge-accepted  { background:rgba(59,130,246,0.1);color:#2563eb; }
  .badge-in_transit{ background:rgba(16,185,129,0.1);color:#059669; }
  .badge-delivered { background:rgba(16,185,129,0.15);color:#059669; }
  .badge-cancelled { background:rgba(239,68,68,0.1);color:#dc2626; }

  /* ── Delivery Search Page ── */
  .delivery-page { display:grid;grid-template-columns:380px 1fr;gap:20px;min-height:70vh; }
  @media(max-width:900px){ .delivery-page { grid-template-columns:1fr; } }
  .delivery-panel {
    background:#fff;border:1px solid rgba(16,185,129,0.15);
    border-radius:16px;padding:24px;
    box-shadow:0 4px 24px rgba(16,185,129,0.06);
    display:flex;flex-direction:column;gap:16px;
    max-height:90vh;overflow-y:auto;
  }
  .delivery-map-wrap { border-radius:16px;overflow:hidden;border:1px solid rgba(16,185,129,0.15);min-height:500px; }
  #delivery-map { width:100%;height:100%;min-height:500px; }
  .radius-slider { width:100%;accent-color:#10b981; }

  /* Courier card in list */
  .yulchi-card {
    display:flex;align-items:center;gap:12px;padding:13px 14px;
    border:1.5px solid rgba(16,185,129,0.15);border-radius:12px;
    cursor:pointer;transition:all 0.2s;background:#fff;position:relative;
  }
  .yulchi-card:hover,.yulchi-card.selected { border-color:#10b981;background:rgba(16,185,129,0.04); }
  .yulchi-avatar {
    width:44px;height:44px;border-radius:50%;
    background:linear-gradient(135deg,#10b981,#059669);
    display:grid;place-items:center;color:#fff;font-size:20px;flex-shrink:0;
  }
  .yulchi-info { flex:1;min-width:0; }
  .yulchi-name { font-size:14px;font-weight:700;color:#0f1f12;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
  .yulchi-meta { font-size:11px;color:#6b7280;margin-top:3px; }
  .yulchi-dist-badge {
    position:absolute;top:10px;right:12px;
    background:#10b981;color:#fff;
    font-size:10px;font-weight:700;
    padding:3px 8px;border-radius:20px;
  }
  .stars { color:#fbbf24;font-size:12px;letter-spacing:1px; }

  /* Route options */
  .route-options { display:flex;gap:8px;margin-bottom:12px; }
  .route-opt-btn {
    flex:1;padding:10px;border-radius:10px;border:1.5px solid rgba(16,185,129,0.2);
    background:#f0fdf4;cursor:pointer;text-align:center;
    font-size:12px;font-weight:600;color:#374151;transition:all 0.2s;
  }
  .route-opt-btn:hover,.route-opt-btn.active { border-color:#10b981;background:rgba(16,185,129,0.1);color:#059669; }
  .route-opt-btn .ro-label { font-size:10px;color:#9ca3af;display:block;margin-top:2px; }

  /* Order modal */
  .order-modal-overlay {
    position:fixed;inset:0;background:rgba(0,0,0,0.5);
    z-index:9000;display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(4px);
  }
  .order-modal {
    background:#fff;border-radius:20px;padding:32px;
    max-width:500px;width:95%;max-height:90vh;overflow-y:auto;
    box-shadow:0 24px 64px rgba(16,185,129,0.2);
    animation:popIn 0.3s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes popIn { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
  .price-breakdown {
    background:#f0fdf4;border-radius:12px;padding:16px;
    margin:16px 0;border:1px solid rgba(16,185,129,0.15);
  }
  .pb-row { display:flex;justify-content:space-between;font-size:13px;color:#6b7280;margin-bottom:6px; }
  .pb-total { display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#0f1f12;margin-top:8px;padding-top:8px;border-top:1px solid rgba(16,185,129,0.2); }

  /* Yulchi profile modal */
  .yulchi-profile-modal {
    background:#fff;border-radius:24px;padding:36px;
    max-width:460px;width:95%;max-height:90vh;overflow-y:auto;
    box-shadow:0 24px 64px rgba(16,185,129,0.25);
    animation:popIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
  }
  .yp-avatar-big {
    width:80px;height:80px;border-radius:50%;margin:0 auto 16px;
    background:linear-gradient(135deg,#10b981,#059669);
    display:grid;place-items:center;font-size:36px;
    box-shadow:0 8px 24px rgba(16,185,129,0.3);
  }
  .yp-stat { text-align:center;padding:12px; }
  .yp-stat-val { font-size:22px;font-weight:800;color:#0f1f12; }
  .yp-stat-lbl { font-size:11px;color:#9ca3af;margin-top:2px; }

  /* Map markers */
  .yulchi-marker {
    width:36px;height:36px;border-radius:50%;
    display:grid;place-items:center;font-size:18px;
    border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.25);cursor:pointer;
  }
  .yulchi-marker.online { background:#10b981; }
  .yulchi-marker.busy   { background:#f59e0b; }

  /* Rating popup */
  .rating-popup {
    position:fixed;bottom:80px;right:24px;z-index:9000;
    background:#fff;border-radius:16px;padding:24px;
    box-shadow:0 12px 48px rgba(16,185,129,0.2);max-width:320px;
    animation:slideInRight 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes slideInRight { from{transform:translateX(120%);opacity:0} to{transform:translateX(0);opacity:1} }
  .star-row { display:flex;gap:8px;justify-content:center;margin:12px 0; }
  .star-btn { font-size:32px;cursor:pointer;transition:transform 0.15s; }
  .star-btn:hover,.star-btn.active { transform:scale(1.3); }

  /* Wallet */
  .wallet-card-courier { background:linear-gradient(135deg,#10b981,#059669);border-radius:20px;padding:28px;color:#fff;margin-bottom:20px; }
  .wc-balance { font-size:40px;font-weight:800;margin:8px 0; }
  .history-item { display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(16,185,129,0.08); }
  .hi-icon { width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-size:16px; }
  .hi-icon.income   { background:rgba(16,185,129,0.1);color:#059669; }
  .hi-icon.withdraw { background:rgba(239,68,68,0.1);color:#dc2626; }

  /* AI chat */
  .courier-ai-wrap { display:flex;flex-direction:column;height:500px; }
  .courier-ai-messages { flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:16px 0;margin-bottom:12px; }
  .ai-msg { max-width:80%;padding:12px 16px;border-radius:16px;font-size:14px;line-height:1.5; }
  .ai-msg.user { background:#10b981;color:#fff;align-self:flex-end;border-radius:16px 16px 4px 16px; }
  .ai-msg.bot  { background:#f0fdf4;color:#0f1f12;border:1px solid rgba(16,185,129,0.15);align-self:flex-start;border-radius:16px 16px 16px 4px; }
  .ai-input-row { display:flex;gap:10px; }
  .ai-input-row input { flex:1;padding:12px 16px;border-radius:12px;border:1.5px solid rgba(16,185,129,0.2);outline:none;font-size:14px; }
  .ai-input-row input:focus { border-color:#10b981; }

  @media(max-width:700px){
    .courier-layout { flex-direction:column; }
    .courier-sidebar { width:100%;border-radius:16px 16px 0 0;padding:12px 0; }
    .courier-stats { grid-template-columns:repeat(2,1fr); }
  }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────────────────────
// СТРАНИЦА ПОИСКА ЙЎЛЧИ (/delivery)
// ─────────────────────────────────────────────────────────────────────────────
async function renderDelivery() {
  injectDeliveryStyles();
  const app = document.getElementById('app');

  app.innerHTML = pageShell(`
    <div style="margin-bottom:24px;">
      <h1 style="font-size:28px;font-weight:800;color:#0f1f12;margin-bottom:6px;">
        <i class="fi fi-rr-truck-side" style="color:#10b981;"></i> Найти Йўлчи
      </h1>
      <p style="color:#6b7280;">Выберите точку отправки, укажите радиус и нажмите «Найти»</p>
    </div>

    <div class="delivery-page">
      <!-- Левая панель -->
      <div class="delivery-panel">
        <div>
          <label style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:6px;">Адрес отправки</label>
          <div style="display:flex;gap:8px;">
            <input id="pickup-addr" type="text" placeholder="Введите адрес или кликните на карте"
              style="flex:1;padding:11px 14px;border-radius:10px;border:1.5px solid rgba(16,185,129,0.2);outline:none;font-size:13px;"
              oninput="window._deliveryAddrInput(this.value)" />
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
          <input class="radius-slider" type="range" min="1" max="200" value="10" id="radius-input"
            oninput="window._deliveryRadiusChange(this.value)" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;margin-top:2px;"><span>1 км</span><span>200 км</span></div>
        </div>

        <button class="btn btn-primary" style="width:100%;" onclick="window._deliverySearch()">
          <i class="fi fi-rr-search"></i> Найти Йўлчи
        </button>

        <div id="couriers-list" style="display:flex;flex-direction:column;gap:8px;max-height:420px;overflow-y:auto;">
          <div style="color:#9ca3af;font-size:13px;text-align:center;padding:24px;">
            <i class="fi fi-rr-truck-side" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.3;"></i>
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
  let _routeControl = null;
  let _pickupLat = 41.2995, _pickupLng = 69.2401;
  let _radius = 10;
  let _selectedCourier = null;

  window._deliveryAddrInput = function(val) {
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
    if (_radiusCircle) _radiusCircle.setRadius(_radius * 1000);
  };

  function _updatePickupMarker() {
    if (_pickupMarker) _pickupMarker.remove();
    _pickupMarker = L.marker([_pickupLat, _pickupLng], {
      icon: L.divIcon({
        html: '<div style="background:#10b981;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
        className:'', iconSize:[18,18], iconAnchor:[9,9]
      })
    }).addTo(window._deliveryMap).bindPopup('<b>Точка отправки</b>');

    if (_radiusCircle) _radiusCircle.remove();
    _radiusCircle = L.circle([_pickupLat, _pickupLng], {
      radius: _radius * 1000,
      color:'#10b981', fillColor:'#10b981', fillOpacity:0.07, weight:2
    }).addTo(window._deliveryMap);

    window._deliveryMap.setView([_pickupLat, _pickupLng], _radius > 50 ? 9 : 12);
  }

  window._deliveryMap.on('click', e => {
    _pickupLat = e.latlng.lat;
    _pickupLng = e.latlng.lng;
    document.getElementById('pickup-addr').value = `${_pickupLat.toFixed(4)}, ${_pickupLng.toFixed(4)}`;
    _updatePickupMarker();
  });

  window._deliverySearch = async function() {
    const listEl = document.getElementById('couriers-list');
    listEl.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';
    _courierMarkers.forEach(m => m.remove());
    _courierMarkers = [];

    try {
      const data = await API.request('GET', '/api/delivery/couriers/nearby', {
        params: { lat: _pickupLat, lng: _pickupLng, radius: _radius }
      });

      if (!data.length) {
        listEl.innerHTML = `<div style="color:#9ca3af;font-size:13px;text-align:center;padding:24px;">
          <i class="fi fi-rr-truck-side" style="font-size:28px;display:block;margin-bottom:8px;opacity:0.3;"></i>
          Йўлчи не найдены в радиусе ${_radius} км
        </div>`;
        return;
      }

      // Sort ascending by distance (already sorted by backend, but ensure)
      data.sort((a,b) => a.distance_km - b.distance_km);

      listEl.innerHTML = `
        <div style="font-size:12px;color:#6b7280;font-weight:600;margin-bottom:4px;">
          Найдено: ${data.length} Йўлчи — отсортировано по близости
        </div>
        ${data.map(c => `
        <div class="yulchi-card" id="ccard-${c.id}"
          onclick="window._openYulchiProfile(${JSON.stringify(c).replace(/"/g,'&quot;')})">
          <div class="yulchi-avatar">${TRANSPORT_ICONS[c.transport_type] || '🚗'}</div>
          <div class="yulchi-info">
            <div class="yulchi-name">${c.full_name}</div>
            <div class="yulchi-meta">
              <span class="stars">${'★'.repeat(Math.round(c.rating))}${'☆'.repeat(5-Math.round(c.rating))}</span>
              ${c.rating} · ${TRANSPORT_LABELS[c.transport_type]||''}
              <span style="margin-left:6px;padding:2px 6px;border-radius:6px;font-size:10px;font-weight:700;
                background:${c.status==='online'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)'};
                color:${c.status==='online'?'#059669':'#d97706'};">
                ${c.status==='online'?'Свободен':'Занят'}
              </span>
            </div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px;">
              Опыт: ${c.experience_years||0} лет · Макс. груз: ${c.max_weight||20} кг
            </div>
          </div>
          <div class="yulchi-dist-badge">${c.distance_km} км</div>
        </div>
        `).join('')}
      `;

      // Map markers
      data.forEach(c => {
        if (c.lat && c.lng) {
          const icon = L.divIcon({
            html: `<div class="yulchi-marker ${c.status}" title="${c.full_name}">${TRANSPORT_ICONS[c.transport_type]||'🚗'}</div>`,
            className:'', iconSize:[36,36], iconAnchor:[18,18]
          });
          const m = L.marker([c.lat, c.lng], { icon })
            .addTo(window._deliveryMap)
            .bindPopup(`
              <b>${c.full_name}</b><br>
              ${TRANSPORT_LABELS[c.transport_type]||''} · ⭐ ${c.rating}<br>
              ${c.distance_km} км от вас<br>
              <b style="color:#059669;">${c.est_price.toLocaleString()} сум</b><br>
              <button onclick="window._openYulchiProfile(window._allYulchi.find(x=>x.id==${c.id}))"
                style="margin-top:8px;padding:4px 10px;background:#10b981;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;">
                Профиль
              </button>
            `);
          _courierMarkers.push(m);
        }
      });

      window._allYulchi = data;

    } catch(e) {
      listEl.innerHTML = `<div style="color:#dc2626;font-size:13px;padding:12px;">Ошибка: ${e.message}</div>`;
    }
  };

  // Build route on map between pickup and courier
  window._buildRoute = function(courierLat, courierLng) {
    if (!window.L.Routing) return;
    if (_routeControl) { window._deliveryMap.removeControl(_routeControl); _routeControl = null; }
    try {
      _routeControl = L.Routing.control({
        waypoints: [
          L.latLng(_pickupLat, _pickupLng),
          L.latLng(courierLat, courierLng),
        ],
        routeWhileDragging: false,
        show: false,
        lineOptions: { styles: [{ color: '#10b981', weight: 4, opacity: 0.8 }] },
        createMarker: () => null,
      }).addTo(window._deliveryMap);
    } catch(e) {}
  };

  // Open courier profile modal
  window._openYulchiProfile = function(c) {
    if (!c) return;
    _selectedCourier = c;
    document.querySelectorAll('.yulchi-card').forEach(el => el.classList.remove('selected'));
    const card = document.getElementById(`ccard-${c.id}`);
    if (card) card.classList.add('selected');

    // Build route on map if has coords
    if (c.lat && c.lng) window._buildRoute(c.lat, c.lng);

    _showYulchiProfileModal(c);
  };

  function _showYulchiProfileModal(c) {
    document.getElementById('yulchi-profile-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'order-modal-overlay';
    modal.id = 'yulchi-profile-modal';
    modal.innerHTML = `
      <div class="yulchi-profile-modal">
        <button onclick="document.getElementById('yulchi-profile-modal').remove()"
          style="position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;font-size:22px;color:#9ca3af;">✕</button>

        <div style="text-align:center;margin-bottom:20px;">
          <div class="yp-avatar-big">${TRANSPORT_ICONS[c.transport_type]||'🚗'}</div>
          <div style="font-size:20px;font-weight:800;color:#0f1f12;">${c.full_name}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:4px;">
            ${TRANSPORT_LABELS[c.transport_type]||''} ·
            <span style="padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;
              background:${c.status==='online'?'rgba(16,185,129,0.1)':'rgba(245,158,11,0.1)'};
              color:${c.status==='online'?'#059669':'#d97706'};">
              ${c.status==='online'?'Свободен':'Занят'}
            </span>
          </div>
        </div>

        <!-- Stats row -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;background:#f0fdf4;border-radius:14px;margin-bottom:20px;border:1px solid rgba(16,185,129,0.15);">
          <div class="yp-stat" style="border-right:1px solid rgba(16,185,129,0.15);">
            <div class="yp-stat-val" style="color:#f59e0b;">${c.rating}</div>
            <div class="yp-stat-lbl">⭐ Рейтинг</div>
          </div>
          <div class="yp-stat" style="border-right:1px solid rgba(16,185,129,0.15);">
            <div class="yp-stat-val">${c.experience_years||0}</div>
            <div class="yp-stat-lbl">Лет опыта</div>
          </div>
          <div class="yp-stat">
            <div class="yp-stat-val" style="color:#10b981;">${c.distance_km}</div>
            <div class="yp-stat-lbl">км от вас</div>
          </div>
        </div>

        <!-- Details -->
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
          <div style="display:flex;gap:8px;align-items:center;font-size:13px;color:#374151;">
            <i class="fi fi-rr-weight" style="color:#10b981;width:16px;"></i>
            Макс. груз: <b>${c.max_weight||20} кг</b>
          </div>
          ${c.has_thermo_bag ? `<div style="display:flex;gap:8px;align-items:center;font-size:13px;color:#374151;"><i class="fi fi-rr-temperature-low" style="color:#10b981;width:16px;"></i> Есть термосумка</div>` : ''}
          <div style="display:flex;gap:8px;align-items:center;font-size:13px;color:#374151;">
            <i class="fi fi-rr-map-marker" style="color:#10b981;width:16px;"></i>
            Город: <b>${c.city||'—'}</b>
          </div>
          <div style="display:flex;gap:8px;align-items:center;font-size:13px;color:#374151;">
            <i class="fi fi-rr-money" style="color:#10b981;width:16px;"></i>
            Примерная цена: <b style="color:#059669;">${c.est_price.toLocaleString()} сум</b>
          </div>
        </div>

        <!-- Route options -->
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Тип маршрута</div>
          <div class="route-options">
            <div class="route-opt-btn active" id="ropt-shortest" onclick="window._setRouteType('shortest')">
              <i class="fi fi-rr-route"></i> Короткий
              <span class="ro-label">Минимум км</span>
            </div>
            <div class="route-opt-btn" id="ropt-fastest" onclick="window._setRouteType('fastest')">
              <i class="fi fi-rr-rocket"></i> Быстрый
              <span class="ro-label">Минимум времени</span>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:10px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="document.getElementById('yulchi-profile-modal').remove()">
            <i class="fi fi-rr-arrow-left"></i> Назад
          </button>
          <button class="btn btn-primary" style="flex:1;" onclick="window._showOrderForm(${JSON.stringify(c).replace(/"/g,'&quot;')})">
            <i class="fi fi-rr-truck-side"></i> Вызвать
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  }

  window._setRouteType = function(type) {
    document.querySelectorAll('.route-opt-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`ropt-${type}`)?.classList.add('active');
    // OSRM supports profile switch via router option
    if (window._routeControl && window._deliveryMap) {
      // rebuild with different osrm profile
      const waypoints = window._routeControl.getWaypoints();
      window._deliveryMap.removeControl(window._routeControl);
      window._routeControl = L.Routing.control({
        waypoints,
        routeWhileDragging: false,
        show: false,
        router: L.Routing.osrmv1({ serviceUrl: 'https://router.project-osrm.org/route/v1', profile: type === 'fastest' ? 'driving' : 'driving' }),
        lineOptions: { styles: [{ color: type==='fastest'?'#3b82f6':'#10b981', weight:4, opacity:0.8 }] },
        createMarker: () => null,
      }).addTo(window._deliveryMap);
    }
  };

  // Order form
  window._showOrderForm = function(c) {
    document.getElementById('yulchi-profile-modal')?.remove();
    const modal = document.createElement('div');
    modal.className = 'order-modal-overlay';
    modal.id = 'order-modal';
    modal.innerHTML = `
      <div class="order-modal">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="margin:0;font-size:20px;font-weight:800;color:#0f1f12;">Оформить доставку</h3>
          <button onclick="document.getElementById('order-modal').remove()"
            style="background:none;border:none;cursor:pointer;font-size:20px;color:#9ca3af;">✕</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:#f0fdf4;border-radius:12px;margin-bottom:20px;border:1px solid rgba(16,185,129,0.15);">
          <span style="font-size:28px;">${TRANSPORT_ICONS[c.transport_type]||'🚗'}</span>
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
            <label>Описание груза</label>
            <input type="text" id="del-cargo" placeholder="Напр.: овощи 5кг" />
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
          <button class="btn btn-ghost" style="flex:1;" onclick="window._calcDelivery('${c.transport_type}',${c.distance_km})">
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
    // Auto-calculate
    window._calcDelivery(c.transport_type, c.distance_km);
  };

  window._calcDelivery = function(transport, distKm) {
    const weight = parseFloat(document.getElementById('del-weight')?.value || 5);
    const t = TARIFFS_FE[transport] || TARIFFS_FE.car;
    const base = t.base;
    const distCost = Math.round(t.per_km * (distKm || 5));
    let extra = 0;
    if (weight > 10 && t.extra_weight) extra = t.extra_weight * Math.ceil((weight-10)/5);
    const total = base + distCost + extra;
    const pbBase = document.getElementById('pb-base');
    const pbDist = document.getElementById('pb-dist');
    const pbTotal = document.getElementById('pb-total');
    if (pbBase) pbBase.textContent = base.toLocaleString() + ' сум';
    if (pbDist) pbDist.textContent = distCost.toLocaleString() + ' сум';
    if (pbTotal) pbTotal.textContent = total.toLocaleString() + ' сум';
  };

  window._confirmOrder = async function(courierId) {
    const addr  = document.getElementById('del-addr')?.value?.trim();
    const cargo = document.getElementById('del-cargo')?.value?.trim();
    const weight = parseFloat(document.getElementById('del-weight')?.value || 5);
    const time  = document.getElementById('del-time')?.value;
    if (!addr || !cargo) { showToast('Заполните все поля', 'warn'); return; }
    try {
      await API.request('POST', '/api/delivery/orders', { body: {
        courier_id: courierId,
        pickup_address: document.getElementById('pickup-addr')?.value || '',
        delivery_address: addr,
        pickup_lat: _pickupLat, pickup_lng: _pickupLng,
        delivery_lat: _pickupLat + 0.01, delivery_lng: _pickupLng + 0.01,
        cargo_description: cargo,
        weight_kg: weight,
        scheduled_time: time || null,
      }});
      document.getElementById('order-modal')?.remove();
      launchConfetti();
      showToast('Заявка отправлена Йўлчи! ✅', 'success');
    } catch(e) {
      showToast('Ошибка: ' + e.message, 'error');
    }
  };
}

// Public Yulchi profile page (for /yulchi/:id)
async function renderYulchiProfile(id) {
  injectDeliveryStyles();
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`<div class="spinner"></div>`);
  // In production: fetch /api/delivery/couriers/${id}
  // For now show placeholder with what we have
  showToast('Загрузка профиля Йўлчи...', 'info');
  app.innerHTML = pageShell(`
    <div style="max-width:480px;margin:0 auto;text-align:center;padding:40px 20px;">
      <div class="yp-avatar-big" style="margin:0 auto 16px;"><i class="fi fi-rr-truck-side"></i></div>
      <h2 style="font-size:22px;font-weight:800;color:#0f1f12;">Профиль Йўлчи #${id}</h2>
      <p style="color:#6b7280;margin:12px 0 24px;">Для просмотра профиля найдите Йўлчи через страницу доставки</p>
      <button class="btn btn-primary" onclick="router.go('/delivery')">
        <i class="fi fi-rr-search"></i> Найти Йўлчи
      </button>
    </div>
  `);
}

// ─────────────────────────────────────────────────────────────────────────────
// COURIER DASHBOARD (/yulchi)
// ─────────────────────────────────────────────────────────────────────────────
let _courierSection = 'home';

async function renderCourierDashboard() {
  injectDeliveryStyles();
  const app = document.getElementById('app');
  const user = Auth.getUser();

  const SECTIONS = [
    { id: 'home',    icon: 'fi fi-rr-home',        label: 'Главная' },
    { id: 'orders',  icon: 'fi fi-rr-box-open',    label: 'Заказы' },
    { id: 'map',     icon: 'fi fi-rr-map-marker',  label: 'Карта' },
    { id: 'tariffs', icon: 'fi fi-rr-dollar',      label: 'Тарифы' },
    { id: 'ai',      icon: 'fi fi-rr-comment-alt', label: 'ИИ' },
    { id: 'wallet',  icon: 'fi fi-rr-wallet',      label: 'Кошелёк' },
    { id: 'market',  icon: 'fi fi-rr-store-alt',   label: 'Рынок' },
    { id: 'profile', icon: 'fi fi-rr-user',        label: 'Профиль' },
  ];

  app.innerHTML = pageShell(`
    <div class="courier-layout">
      <aside class="courier-sidebar">
        <div class="cs-logo">
          <i class="fi fi-rr-truck-side" style="color:#10b981;"></i> Йўлчи
        </div>
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
    document.getElementById(`cs-nav-${section}`)?.classList.add('active');
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

// ── Главная Йўлчи ─────────────────────────────────────────────────────────────
async function renderCourierHome(el) {
  let profile = null;
  let orders = [];

  try {
    profile = await API.request('GET', '/api/courier/profile');
  } catch(e) {
    el.innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:64px;margin-bottom:16px;"><i class="fi fi-rr-truck-side" style="color:#10b981;"></i></div>
        <h2 style="font-size:24px;font-weight:800;color:#0f1f12;margin-bottom:8px;">Добро пожаловать, Йўлчи!</h2>
        <p style="color:#6b7280;margin-bottom:28px;">Заполните профиль чтобы начать принимать заявки</p>
        <button class="btn btn-primary btn-lg" onclick="window._startOnboarding()">
          <i class="fi fi-rr-arrow-right"></i> Заполнить профиль
        </button>
      </div>`;
    window._startOnboarding = () => renderOnboarding();
    return;
  }

  // Check admin_approved flag
  if (profile.admin_approved === false) {
    el.innerHTML = `
      <div class="pending-banner">
        <div class="pb-icon"><i class="fi fi-rr-clock" style="color:#f59e0b;"></i></div>
        <p><strong>Ваш профиль на проверке.</strong><br>
        Администратор должен одобрить ваш аккаунт. После одобрения вы появитесь в поиске. Обычно это занимает до 24 часов.</p>
      </div>
    `;
    // Still show stats below
  }

  try { orders = await API.request('GET', '/api/courier/orders'); } catch(e) {}

  const isOnline = profile.status === 'online';
  const isBusy   = profile.status === 'busy';

  el.innerHTML = `
    ${profile.admin_approved === false ? `
    <div class="pending-banner">
      <div class="pb-icon"><i class="fi fi-rr-clock" style="color:#f59e0b;"></i></div>
      <p><strong>Ваш профиль на проверке.</strong><br>
      Вы не появляетесь в поиске до одобрения администратора.</p>
    </div>` : ''}

    <div class="online-toggle-bar">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="status-dot ${profile.status}"></div>
        <div>
          <div style="font-weight:600;color:#0f1f12;font-size:14px;">
            ${isOnline ? 'Онлайн — доступен' : isBusy ? 'Занят' : 'Офлайн'}
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
        <div class="cstat-label">Заказов</div>
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

    ${orders.filter(o=>['pending','accepted','in_transit'].includes(o.status)).length > 0 ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:16px;font-weight:700;color:#0f1f12;margin-bottom:12px;">Активные заявки</div>
        <div class="courier-orders-list">${_renderOrderCards(orders.filter(o=>['pending','accepted','in_transit'].includes(o.status)).slice(0,3))}</div>
      </div>` : `
      <div style="background:#f0fdf4;border-radius:14px;padding:24px;text-align:center;border:1px solid rgba(16,185,129,0.15);">
        <i class="fi fi-rr-inbox" style="font-size:32px;color:#10b981;opacity:0.5;display:block;margin-bottom:8px;"></i>
        <div style="color:#6b7280;font-size:14px;">Нет активных заявок</div>
        ${isOnline && profile.admin_approved !== false ? '<div style="color:#10b981;font-size:12px;margin-top:4px;">Ожидаем новые заявки...</div>' : ''}
      </div>`}
  `;

  window._toggleCourierStatus = async function(online) {
    try {
      await API.request('PUT', '/api/courier/status', { body: { status: online ? 'online' : 'offline' } });
      showToast(online ? 'Вы онлайн' : 'Вы офлайн', 'info');
    } catch(e) { showToast('Ошибка', 'error'); }
  };
}

// ── Заказы ───────────────────────────────────────────────────────────────────
async function renderCourierOrders(el) {
  let orders = [];
  try { orders = await API.request('GET', '/api/courier/orders'); } catch(e) {}
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
      <h2 style="font-size:20px;font-weight:800;color:#0f1f12;">Мои заявки</h2>
      <span style="color:#6b7280;font-size:13px;">Всего: ${orders.length}</span>
    </div>
    ${orders.length
      ? `<div class="courier-orders-list">${_renderOrderCards(orders)}</div>`
      : `<div style="text-align:center;padding:40px;color:#9ca3af;">
          <i class="fi fi-rr-inbox" style="font-size:40px;display:block;margin-bottom:8px;opacity:0.4;"></i>
          Пока нет заявок
        </div>`}
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
            ${o.pickup_address||'—'} → ${o.delivery_address||'—'}
          </div>
          <div style="font-size:12px;color:#6b7280;">${o.cargo||''} · ${o.weight_kg||0} кг · ${o.distance_km||0} км</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:16px;font-weight:800;color:#059669;">${(o.price||0).toLocaleString()} сум</div>
          ${o.status==='pending' ? `<button class="btn btn-primary" style="margin-top:8px;font-size:12px;padding:6px 14px;" onclick="window._acceptOrder(${o.id})">Принять</button>` : ''}
          ${o.status==='accepted' ? `<button class="btn btn-primary" style="margin-top:8px;font-size:12px;padding:6px 14px;" onclick="window._updateOrderStatus(${o.id},'delivered')">Доставлено</button>` : ''}
        </div>
      </div>`;
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
    showToast(status==='delivered' ? 'Доставлено! Деньги зачислены' : 'Статус обновлён', 'success');
    if (status==='delivered') { launchConfetti(); _showRatingPrompt(); }
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
    </div>`;
  document.body.appendChild(pop);
  window._ratingVal = 0;
  window._setRating = function(val) {
    window._ratingVal = val;
    document.querySelectorAll('.star-btn').forEach((s,i) => {
      s.textContent = i < val ? '★' : '☆';
      s.style.color = i < val ? '#fbbf24' : '#9ca3af';
    });
  };
  window._submitRating = async function() {
    if (!window._ratingVal) { showToast('Выберите оценку', 'warn'); return; }
    showToast('Спасибо за оценку!', 'success');
    pop.remove();
  };
}

// ── Карта ────────────────────────────────────────────────────────────────────
async function renderCourierMap(el) {
  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:16px;">Карта Йўлчи</h2>
    <div style="border-radius:16px;overflow:hidden;border:1px solid rgba(16,185,129,0.15);">
      <div id="courier-map" style="height:500px;"></div>
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;">
      <span><span style="color:#10b981;">●</span> Свободен</span>
      <span><span style="color:#f59e0b;">●</span> Занят</span>
    </div>`;
  await ensureLeaflet();
  const map = L.map('courier-map').setView([41.2995, 69.2401], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OSM' }).addTo(map);
  try {
    const couriers = await API.request('GET', '/api/delivery/couriers/nearby', {
      params: { lat: 41.2995, lng: 69.2401, radius: 200 }
    });
    couriers.forEach(c => {
      if (!c.lat || !c.lng) return;
      L.marker([c.lat, c.lng], {
        icon: L.divIcon({
          html: `<div class="yulchi-marker ${c.status}">${TRANSPORT_ICONS[c.transport_type]||'🚗'}</div>`,
          className:'', iconSize:[36,36], iconAnchor:[18,18]
        })
      }).addTo(map).bindPopup(`<b>${c.full_name}</b><br>⭐ ${c.rating}`);
    });
  } catch(e) {}
}

// ── Тарифы ───────────────────────────────────────────────────────────────────
function renderCourierTariffs(el) {
  const rows = [
    { icon:'🛵', label:'Мотоцикл', key:'moto',  base:'8 000', km:'900',   extra:'+1 000' },
    { icon:'🚗', label:'Авто',     key:'car',   base:'12 000',km:'1 200', extra:'+2 000' },
    { icon:'🚐', label:'Грузовик', key:'truck', base:'25 000',km:'2 000', extra:'договор' },
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
            </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:24px;">
      <h3 style="font-size:16px;font-weight:700;color:#0f1f12;margin-bottom:16px;">
        <i class="fi fi-rr-calculator" style="color:#10b981;"></i> Калькулятор
      </h3>
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
    const dist   = parseFloat(document.getElementById('calc-dist').value) || 5;
    const weight = parseFloat(document.getElementById('calc-weight').value) || 0;
    const t = TARIFFS_FE[transport];
    let price = t.base + t.per_km * dist;
    if (weight > 10 && t.extra_weight) price += t.extra_weight * Math.ceil((weight-10)/5);
    document.getElementById('calc-price').textContent = price.toLocaleString() + ' сум';
    document.getElementById('calc-breakdown').textContent =
      `${t.base.toLocaleString()} (база) + ${Math.round(t.per_km*dist).toLocaleString()} (${dist}км)${weight>10?' + доп. вес':''}`;
    document.getElementById('calc-result').style.display = 'block';
  };
}

// ── ИИ-помощник ──────────────────────────────────────────────────────────────
function renderCourierAI(el) {
  let msgs = [{ role:'bot', text:'Привет! Я ИИ-помощник Йўлчи AgroVerse. Спросите про маршруты, тарифы или что угодно связанное с работой.' }];

  function renderMsgs() {
    const box = document.getElementById('courier-ai-msgs');
    if (!box) return;
    box.innerHTML = msgs.map(m =>
      `<div class="ai-msg ${m.role}">${m.text}</div>`
    ).join('');
    box.scrollTop = box.scrollHeight;
  }

  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:20px;">
      <i class="fi fi-rr-comment-alt" style="color:#10b981;"></i> ИИ-помощник
    </h2>
    <div class="onb-card courier-ai-wrap">
      <div id="courier-ai-msgs" class="courier-ai-messages"></div>
      <div class="ai-input-row">
        <input type="text" id="courier-ai-input" placeholder="Спросите про маршрут, тариф…"
          onkeydown="if(event.key==='Enter')window._courierAISend()" />
        <button class="btn btn-primary" onclick="window._courierAISend()">
          <i class="fi fi-rr-paper-plane"></i>
        </button>
      </div>
    </div>`;

  renderMsgs();

  window._courierAISend = async function() {
    const inp = document.getElementById('courier-ai-input');
    const text = inp?.value?.trim();
    if (!text) return;
    inp.value = '';
    msgs.push({ role:'user', text });
    renderMsgs();
    msgs.push({ role:'bot', text:'...' });
    renderMsgs();
    try {
      const r = await API.request('POST', '/api/courier/ai/chat', { body: { message: text } });
      msgs[msgs.length-1].text = r.reply || 'Ошибка ответа';
    } catch(e) {
      msgs[msgs.length-1].text = 'Ошибка связи с ИИ';
    }
    renderMsgs();
  };
}

// ── Кошелёк ──────────────────────────────────────────────────────────────────
async function renderCourierWallet(el) {
  let walletData = { balance: 0, history: [] };
  try { walletData = await API.request('GET', '/api/courier/wallet'); } catch(e) {}

  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:20px;">
      <i class="fi fi-rr-wallet" style="color:#10b981;"></i> Кошелёк
    </h2>
    <div class="wallet-card-courier">
      <div style="font-size:13px;opacity:0.8;">Баланс</div>
      <div class="wc-balance">${(walletData.balance||0).toLocaleString()} сум</div>
      <div style="display:flex;gap:12px;margin-top:16px;">
        <button class="btn" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);"
          onclick="window._withdrawModal()">
          <i class="fi fi-rr-arrow-up"></i> Вывести
        </button>
      </div>
    </div>
    <div>
      <div style="font-size:16px;font-weight:700;color:#0f1f12;margin-bottom:12px;">История транзакций</div>
      ${walletData.history?.length ? walletData.history.slice().reverse().map(h => `
        <div class="history-item">
          <div class="hi-icon ${h.type}">
            <i class="fi ${h.type==='income'?'fi-rr-arrow-down':'fi-rr-arrow-up'}"></i>
          </div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;color:#0f1f12;">${h.desc||h.method||''}</div>
            <div style="font-size:11px;color:#9ca3af;">${h.status||''}</div>
          </div>
          <div style="font-size:14px;font-weight:700;color:${h.type==='income'?'#059669':'#dc2626'};">
            ${h.type==='income'?'+':'−'}${(h.amount||0).toLocaleString()} сум
          </div>
        </div>`).join('')
      : '<div style="text-align:center;padding:32px;color:#9ca3af;font-size:13px;">Нет транзакций</div>'}
    </div>
  `;

  window._withdrawModal = function() {
    const m = document.createElement('div');
    m.className = 'order-modal-overlay';
    m.innerHTML = `
      <div class="order-modal" style="max-width:380px;">
        <h3 style="margin:0 0 20px;font-size:18px;font-weight:800;">Вывод средств</h3>
        <div class="onb-field">
          <label>Сумма</label>
          <input type="number" id="withdraw-amount" placeholder="Сколько вывести?" max="${walletData.balance}" />
        </div>
        <div class="onb-field">
          <label>Способ</label>
          <select id="withdraw-method">
            <option value="click">Click</option>
            <option value="payme">Payme</option>
          </select>
        </div>
        <div style="display:flex;gap:10px;margin-top:4px;">
          <button class="btn btn-ghost" style="flex:1;" onclick="this.closest('.order-modal-overlay').remove()">Отмена</button>
          <button class="btn btn-primary" style="flex:1;" onclick="window._doWithdraw(this)">Вывести</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.addEventListener('click', e => { if(e.target===m) m.remove(); });

    window._doWithdraw = async function(btn) {
      const amount = parseFloat(document.getElementById('withdraw-amount')?.value);
      const method = document.getElementById('withdraw-method')?.value;
      if (!amount || amount <= 0) { showToast('Введите сумму', 'warn'); return; }
      btn.disabled = true;
      try {
        await API.request('POST', '/api/courier/wallet/withdraw', { body: { amount, method } });
        m.remove();
        showToast('Заявка на вывод создана!', 'success');
        renderCourierSection('wallet');
      } catch(e) {
        showToast('Ошибка: ' + e.message, 'error');
        btn.disabled = false;
      }
    };
  };
}

// ── Профиль курьера ───────────────────────────────────────────────────────────
async function renderCourierProfile(el) {
  let profile = null;
  try { profile = await API.request('GET', '/api/courier/profile'); } catch(e) {}

  if (!profile) {
    el.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <p style="color:#6b7280;">Профиль не заполнен</p>
        <button class="btn btn-primary" onclick="window._startOnboarding()">
          <i class="fi fi-rr-arrow-right"></i> Заполнить профиль
        </button>
      </div>`;
    window._startOnboarding = () => renderOnboarding();
    return;
  }

  el.innerHTML = `
    <h2 style="font-size:20px;font-weight:800;color:#0f1f12;margin-bottom:20px;">
      <i class="fi fi-rr-user" style="color:#10b981;"></i> Мой профиль
    </h2>
    <div style="background:#fff;border:1px solid rgba(16,185,129,0.15);border-radius:16px;padding:28px;max-width:500px;">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;">
        <div class="yp-avatar-big" style="width:60px;height:60px;font-size:26px;margin:0;">
          ${TRANSPORT_ICONS[profile.transport_type]||'🚗'}
        </div>
        <div>
          <div style="font-size:20px;font-weight:800;color:#0f1f12;">${profile.full_name}</div>
          <div style="font-size:13px;color:#6b7280;">${TRANSPORT_LABELS[profile.transport_type]||''} · ⭐ ${profile.rating}</div>
          ${profile.admin_approved === false ? `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(245,158,11,0.1);color:#d97706;">На проверке</span>` : `<span style="padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(16,185,129,0.1);color:#059669;">Одобрен</span>`}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
        <div><span style="color:#9ca3af;">Телефон:</span><br><b>${profile.phone||'—'}</b></div>
        <div><span style="color:#9ca3af;">Город:</span><br><b>${profile.city||'—'}</b></div>
        <div><span style="color:#9ca3af;">Макс. груз:</span><br><b>${profile.max_weight||20} кг</b></div>
        <div><span style="color:#9ca3af;">Радиус работы:</span><br><b>${profile.radius_km||10} км</b></div>
        <div><span style="color:#9ca3af;">Опыт:</span><br><b>${profile.experience_years||0} лет</b></div>
        <div><span style="color:#9ca3af;">Режим работы:</span><br><b>${profile.work_hours||'09:00-18:00'}</b></div>
      </div>
      ${profile.bio ? `<div style="margin-top:16px;padding:14px;background:#f0fdf4;border-radius:10px;font-size:13px;color:#374151;">${profile.bio}</div>` : ''}
    </div>
  `;
}

// ── Онбординг (регистрация профиля курьера) ──────────────────────────────────
async function renderOnboarding() {
  injectDeliveryStyles();
  const app = document.getElementById('app');
  let step = 1;
  let formData = {};

  function renderStep() {
    const content = document.getElementById('courier-content') || document.getElementById('app');
    const steps = [
      // Шаг 1 — транспорт
      `<div class="onb-card">
        <h3>Выберите транспорт</h3>
        <p class="sub">Только 3 типа: мотоцикл, авто, грузовик</p>
        <div class="transport-grid">
          ${Object.entries(TRANSPORT_ICONS).map(([k,v]) => `
            <div class="transport-btn ${formData.transport_type===k?'sel':''}" onclick="window._selTransport('${k}')">
              <span class="t-icon">${v}</span>
              ${TRANSPORT_LABELS[k]}
            </div>`).join('')}
        </div>
        <div class="onb-field">
          <label>Макс. грузоподъёмность (кг)</label>
          <input type="number" id="onb-maxweight" value="${formData.max_weight||100}" min="1" />
        </div>
        <div class="onb-toggle-wrap">
          <label style="font-size:14px;color:#374151;">Есть термосумка?</label>
          <label class="toggle-switch">
            <input type="checkbox" id="onb-thermo" ${formData.has_thermo_bag?'checked':''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>`,

      // Шаг 2 — зона работы
      `<div class="onb-card">
        <h3>Зона работы</h3>
        <p class="sub">Укажите ваш город и радиус доставки (до 200 км)</p>
        <div class="onb-field">
          <label>Город</label>
          <input type="text" id="onb-city" value="${formData.city||''}" placeholder="Ташкент" />
        </div>
        <div class="onb-field">
          <label>Радиус работы: <span id="onb-radius-lbl">${formData.radius_km||30}</span> км</label>
          <input type="range" class="radius-slider" min="1" max="200" value="${formData.radius_km||30}" id="onb-radius"
            oninput="document.getElementById('onb-radius-lbl').textContent=this.value" />
          <div style="display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;"><span>1 км</span><span>200 км</span></div>
        </div>
        <div class="onb-field">
          <label>Опыт работы (лет)</label>
          <input type="number" id="onb-exp" value="${formData.experience_years||0}" min="0" max="50" />
        </div>
        <div class="onb-field">
          <label>Часы работы</label>
          <input type="text" id="onb-hours" value="${formData.work_hours||'09:00-18:00'}" placeholder="09:00-18:00" />
        </div>
      </div>`,

      // Шаг 3 — документы
      `<div class="onb-card">
        <h3>Личные данные</h3>
        <p class="sub">Эти данные проверит администратор</p>
        <div class="onb-field">
          <label>Полное имя</label>
          <input type="text" id="onb-name" value="${formData.full_name||''}" placeholder="Иванов Иван Иванович" />
        </div>
        <div class="onb-field">
          <label>Телефон</label>
          <input type="tel" id="onb-phone" value="${formData.phone||''}" placeholder="+998 90 000 00 00" />
        </div>
        <div class="onb-field">
          <label>Номер ТС (необязательно)</label>
          <input type="text" id="onb-vehicle" value="${formData.vehicle_number||''}" placeholder="01 A 123 AB" />
        </div>
        <div class="onb-field">
          <label>О себе (необязательно)</label>
          <textarea id="onb-bio" placeholder="Расскажите о себе…">${formData.bio||''}</textarea>
        </div>
        <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.3);border-radius:10px;padding:12px 14px;font-size:12px;color:#92400e;margin-top:4px;">
          <i class="fi fi-rr-info" style="margin-right:4px;"></i>
          После подачи профиль пройдёт проверку администратором. Вы появитесь в поиске после одобрения.
        </div>
      </div>`,
    ];

    const el = document.getElementById('courier-content') || document.getElementById('app');
    el.innerHTML = `
      <div class="onboarding-page">
        <div style="margin-bottom:24px;">
          <h2 style="font-size:22px;font-weight:800;color:#0f1f12;">Профиль Йўлчи</h2>
          <p style="color:#6b7280;">Шаг ${step} из 3</p>
        </div>
        <div class="onb-progress">
          ${[1,2,3].map(i => `<div class="onb-step-dot ${i<=step?'active':''}"></div>`).join('')}
        </div>
        ${steps[step-1]}
        <div class="onb-actions">
          ${step > 1 ? `<button class="btn btn-ghost" onclick="window._onbBack()"><i class="fi fi-rr-arrow-left"></i> Назад</button>` : ''}
          <button class="btn btn-primary" onclick="window._onbNext()">
            ${step < 3 ? 'Далее <i class="fi fi-rr-arrow-right"></i>' : '<i class="fi fi-rr-check"></i> Отправить на проверку'}
          </button>
        </div>
      </div>`;

    window._selTransport = k => {
      formData.transport_type = k;
      document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('sel'));
      event.currentTarget.classList.add('sel');
    };
  }

  window._onbNext = async function() {
    if (step === 1) {
      if (!formData.transport_type) { showToast('Выберите транспорт', 'warn'); return; }
      formData.max_weight   = parseFloat(document.getElementById('onb-maxweight')?.value) || 100;
      formData.has_thermo_bag = document.getElementById('onb-thermo')?.checked || false;
      step = 2; renderStep();
    } else if (step === 2) {
      formData.city = document.getElementById('onb-city')?.value?.trim();
      if (!formData.city) { showToast('Введите город', 'warn'); return; }
      formData.radius_km        = parseFloat(document.getElementById('onb-radius')?.value) || 30;
      formData.experience_years = parseInt(document.getElementById('onb-exp')?.value) || 0;
      formData.work_hours       = document.getElementById('onb-hours')?.value || '09:00-18:00';
      step = 3; renderStep();
    } else {
      formData.full_name      = document.getElementById('onb-name')?.value?.trim();
      formData.phone          = document.getElementById('onb-phone')?.value?.trim();
      formData.vehicle_number = document.getElementById('onb-vehicle')?.value?.trim() || null;
      formData.bio            = document.getElementById('onb-bio')?.value?.trim() || null;
      if (!formData.full_name || !formData.phone) { showToast('Заполните имя и телефон', 'warn'); return; }
      try {
        await API.request('POST', '/api/courier/profile/setup', { body: formData });
        launchConfetti();
        showToast('Профиль отправлен на проверку!', 'success');
        _courierSection = 'home';
        renderCourierDashboard();
      } catch(e) {
        showToast('Ошибка: ' + e.message, 'error');
      }
    }
  };

  window._onbBack = function() {
    if (step > 1) { step--; renderStep(); }
  };

  renderStep();
}
