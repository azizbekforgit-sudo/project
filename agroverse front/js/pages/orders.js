/* pages/orders.js — Мои заказы (покупатель и фермер) */

const ORDER_STEPS = ['created', 'paid', 'ready_for_pickup', 'completed'];

function stepIndex(status) {
  if (status === 'ready') return 2;
  return ORDER_STEPS.indexOf(status);
}

function badgeOrderHtml(status) {
  const map = {
    created:           ['badge-created',    '⏳'],
    paid:              ['badge-paid',        '💳'],
    ready_for_pickup:  ['badge-ready',       '📦'],
    ready:             ['badge-ready',       '📦'],
    completed:         ['badge-completed',   '✅'],
    cancelled:         ['badge-cancelled',   '❌'],
  };
  const [cls, icon] = map[status] || ['badge-created', '•'];
  const label = t('order_status_' + status) || status;
  return `<span class="badge ${cls}">${fe(icon, 14)} ${label}</span>`;
}

function timelineHtml(status) {
  if (status === 'cancelled') {
    return `<div class="oc-timeline">
      <div class="oct-step cancelled">
        <div class="oct-dot">✕</div>
        <div class="oct-label">${t('order_status_cancelled')}</div>
      </div>
    </div>`;
  }
  const labels = [
    t('order_status_created'),
    t('order_status_paid'),
    t('order_status_ready'),
    t('order_status_completed'),
  ];
  const cur = stepIndex(status);
  return `<div class="oc-timeline">
    ${labels.map((lbl, i) => {
      const cls = i < cur ? 'done' : i === cur ? 'active' : '';
      const dot = i < cur ? '✓' : '';
      return `<div class="oct-step ${cls}">
        <div class="oct-dot">${dot}</div>
        <div class="oct-label">${lbl}</div>
      </div>`;
    }).join('')}
  </div>`;
}

async function renderOrders() {
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`
    <div class="page-head">
      <h1 class="page-title">${fe('📦',24)} ${t('nav_orders')}</h1>
      <p class="page-desc">${t('orders_desc')}</p>
    </div>
    <div id="orders-wrap"><div class="spinner"></div></div>
  `);
  loadOrdersList();
}

async function loadOrdersList() {
  const wrap = document.getElementById('orders-wrap');
  if (!wrap) return;
  try {
    const user = Auth.getUser();
    const isFermer = user && user.role === 'fermer';
    const data = await API.getMyOrders();
    const orders = data?.orders || data || [];
    if (!orders?.length) {
      wrap.innerHTML = `
        <div class="empty-state big">
          <div class="icon">${fe('📦',48)}</div>
          <p>${t('orders_empty')}</p>
          ${!isFermer ? `<button class="btn btn-primary" onclick="router.go('/market')">${t('go_market')}</button>` : ''}
        </div>`;
      return;
    }
    wrap.innerHTML = `<div class="orders-list">${orders.map(o => orderCardHtml(o, isFermer)).join('')}</div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><p>${fe('⚠️',16)} ${e.message}</p></div>`;
  }
}

function orderCardHtml(o, isFermer) {
  const date  = o.created_at ? new Date(o.created_at).toLocaleDateString() : '—';
  const total = o.total_price != null ? `${Number(o.total_price).toLocaleString()} ${t('currency')}` : '—';

  const canCancel   = !isFermer && ['created', 'paid'].includes(o.status);
  const canComplete = !isFermer && (o.status === 'ready_for_pickup' || o.status === 'ready');
  const canMarkReady = isFermer && o.status === 'paid';

  const img = o.product_photo
    ? `<img src="${API_PHOTO(o.product_photo)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'oc-ph',textContent:'🥬'}))" style="width:100%;height:100%;object-fit:cover;display:block;"/>`
    : '<div class="oc-ph">🥬</div>';

  const personLabel = isFermer
    ? `${fe('🛒',14)} ${o.xaridor_name || t('buyer_word')}`
    : `${fe('🌱',14)} ${o.fermer_name || t('farmer_word')}`;

  // Delivery request info
  let deliveryHtml = '';
  if (o.delivery_request) {
    const dr = o.delivery_request;
    const statusLabels = {
      pending: 'Ожидание драйвера',
      driver_accepted: 'Драйвер принял',
      in_transit: 'В пути',
      delivered: 'Доставлен',
      completed: 'Завершён',
      cancelled_by_buyer: 'Отменено покупателем',
      cancelled_by_driver: 'Отменено драйвером',
    };
    const drStatus = statusLabels[dr.status] || dr.status;
    const drStatusColor = dr.status === 'driver_accepted' ? '#059669' : dr.status === 'pending' ? '#d97706' : '#6b7280';

    deliveryHtml = `
      <div style="background:#f0fdf4;border:1px solid rgba(16,185,129,0.2);border-radius:10px;padding:12px;margin-top:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <b style="font-size:13px">🚗 Доставка</b>
          <span style="color:${drStatusColor};font-size:12px;font-weight:600">${drStatus}</span>
        </div>
        <div style="font-size:13px;color:#374151">
          📍 ${dr.route_from} → ${dr.route_to} &nbsp;|&nbsp; 📏 ${dr.distance_km} км
        </div>
        <div style="font-size:13px;color:#059669;font-weight:600;margin-top:4px">
          💰 ${Number(dr.total_price).toLocaleString()} сум
        </div>
        ${dr.courier_name ? `<div style="font-size:13px;color:#6b7280;margin-top:4px">👤 Драйвер: ${dr.courier_name} (${dr.courier_phone})</div>` : ''}
      </div>
    `;
  }

  return `
    <div class="order-card" id="order-${o.id}">
      <div class="oc-img">${img}</div>
      <div class="oc-main">
        <div class="oc-top">
          <span class="oc-name">${o.product_title || (t('product_word') + ' #' + o.product_id)}</span>
          ${badgeOrderHtml(o.status)}
          <span class="oc-id">#${o.id}</span>
        </div>
        <div class="oc-meta">
          ${personLabel}
          <span class="oc-meta-dot"></span>
          ${o.quantity} ${t('pcs')}
          <span class="oc-meta-dot"></span>
          ${fe('📅',14)} ${date}
        </div>
        ${total !== '—' ? `<div class="oc-total">${total}</div>` : ''}
        ${deliveryHtml}
        ${timelineHtml(o.status)}
      </div>
      <div class="oc-actions">
        ${canCancel    ? `<button class="btn btn-danger btn-sm"  onclick="cancelOrder(${o.id})">${t('cancel_order')}</button>` : ''}
        ${canComplete  ? `<button class="btn btn-primary btn-sm" onclick="confirmReceived(${o.id})">${t('confirm_received')}</button>` : ''}
        ${canMarkReady ? `<button class="btn btn-primary btn-sm" onclick="markOrderReady(${o.id})">${t('mark_ready') || 'Готово к выдаче'}</button>` : ''}
      </div>
    </div>
  `;
}

function API_PHOTO(u) {
  if (!u) return '';
  if (u.startsWith('http')) return u;
  return (typeof BASE_URL !== 'undefined' ? BASE_URL : `http://${location.hostname}:8000`) + u;
}

async function cancelOrder(id) {
  if (!confirm(t('confirm_cancel_order'))) return;
  try { await API.cancelOrder(id); showToast(t('order_cancelled')); loadOrdersList(); }
  catch (e) { showToast(e.message, 'error'); }
}

async function confirmReceived(id) {
  try { await API.completeOrder(id); showToast(`${fe('✅',16)} ` + t('order_received')); loadOrdersList(); }
  catch (e) { showToast(e.message, 'error'); }
}

async function markOrderReady(id) {
  try { await API.markReady(id); showToast(`${fe('📦',16)} ` + (t('order_marked_ready') || 'Заказ готов к выдаче')); loadOrdersList(); }
  catch (e) { showToast(e.message, 'error'); }
}

window.renderOrders     = renderOrders;
window.cancelOrder      = cancelOrder;
window.confirmReceived  = confirmReceived;
window.markOrderReady   = markOrderReady;