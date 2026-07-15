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
      <h1 class="page-title"><i class="fi fi-sr-box-open" style="font-size:24px"></i> ${t('nav_orders')}</h1>
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
          <div class="icon"><i class="fi fi-sr-box-open" style="font-size:48px"></i></div>
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
  const unit = o.quantity >= 1000 ? 'кг' : (t('pcs') || 'шт');

  const canCancel    = !isFermer && ['created', 'paid'].includes(o.status);
  const canComplete  = !isFermer && (o.status === 'ready_for_pickup' || o.status === 'ready');
  const canMarkReady = isFermer && o.status === 'paid';
  const canPay       = !isFermer && o.status === 'created';
  const canChatFarmer = !isFermer && ['created', 'paid'].includes(o.status) && o.pickup_method !== 'self';
  const canChatDriver = !isFermer && o.driver_candidate_id && o.pickup_method === 'external';

  const img = o.product_photo
    ? `<img src="${API_PHOTO(o.product_photo)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'oc-ph',textContent:'🥬'}))" style="width:100%;height:100%;object-fit:cover;display:block;"/>`
    : '<div class="oc-ph">🥬</div>';

  const personLabel = isFermer
    ? `<i class="fi fi-sr-shopping-cart" style="font-size:14px"></i> ${o.xaridor_name || t('buyer_word')}`
    : `<i class="fi fi-sr-leaf" style="font-size:14px"></i> ${o.fermer_name || t('farmer_word')}`;

  // Status description
  let statusNote = '';
  if (!isFermer && o.status === 'created') {
    statusNote = `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px;margin-top:8px;font-size:13px;color:#92400e">⏳ Заказ ожидает оплаты. Нажмите "Оплатить" чтобы перевести деньги фермеру.</div>`;
  } else if (!isFermer && o.status === 'paid') {
    statusNote = `<div style="background:#d1fae5;border:1px solid #a7f3d0;border-radius:8px;padding:10px;margin-top:8px;font-size:13px;color:#065f46">✅ Оплачено. Фермер готовит ваш заказ.</div>`;
  } else if (isFermer && o.status === 'created') {
    statusNote = `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:10px;margin-top:8px;font-size:13px;color:#92400e">⏳ Покупатель ещё не оплатил заказ.</div>`;
  } else if (isFermer && o.status === 'paid') {
    statusNote = `<div style="background:#d1fae5;border:1px solid #a7f3d0;border-radius:8px;padding:10px;margin-top:8px;font-size:13px;color:#065f46">✅ Заказ оплачен. Можете начать подготовку.</div>`;
  }

  // Driver candidate info
  let candidateHtml = '';
  if (o.driver_candidate_id && !o.delivery_request) {
    const routeInfo = o.delivery_route_from && o.delivery_route_to
      ? `<div style="font-size:13px;color:#374151;margin-top:6px">
           📍 ${o.delivery_route_from} → ${o.delivery_route_to}
           ${o.delivery_distance_km ? ` &nbsp;|&nbsp; 📏 ${o.delivery_distance_km} км` : ''}
         </div>
         ${o.delivery_price ? `<div style="font-size:13px;color:#059669;font-weight:600;margin-top:4px">💰 ${Number(o.delivery_price).toLocaleString()} сум</div>` : ''}`
      : '';

    candidateHtml = `
      <div style="background:#eff6ff;border:1px solid rgba(59,130,246,0.2);border-radius:10px;padding:12px;margin-top:10px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <b style="font-size:13px">🚗 Кандидат-драйвер</b>
          <span style="color:#2563eb;font-size:12px;font-weight:600">Ожидает подтверждения</span>
        </div>
        <div style="font-size:13px;color:#374151">
          👤 ${o.driver_candidate_name || 'Драйвер'}
        </div>
        ${routeInfo}
      </div>
    `;
  }

  // Delivery request info
  let deliveryHtml = '';
  if (o.delivery_request) {
    const dr = o.delivery_request;
    const statusLabels = {
      pending: 'Ожидание драйвера',
      driver_accepted: 'Драйвер принял',
      collecting: 'Собирается',
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
          ${o.quantity} ${unit}
          <span class="oc-meta-dot"></span>
          ${fe('📅',14)} ${date}
        </div>
        ${total !== '—' ? `<div class="oc-total">${total}</div>` : ''}
        ${statusNote}
        ${candidateHtml}
        ${deliveryHtml}
        ${timelineHtml(o.status)}
      </div>
      <div class="oc-actions">
        ${canPay       ? `<button class="btn btn-primary btn-sm" onclick="payOrder(${o.id}, ${o.total_price})"><i class="fi fi-sr-credit-card" style="font-size:14px"></i> Оплатить</button>` : ''}
        ${canCancel    ? `<button class="btn btn-danger btn-sm"  onclick="cancelOrder(${o.id})">${t('cancel_order')}</button>` : ''}
        ${canComplete  ? `<button class="btn btn-primary btn-sm" onclick="confirmReceived(${o.id})">${t('confirm_received')}</button>` : ''}
        ${canMarkReady ? `<button class="btn btn-primary btn-sm" onclick="markOrderReady(${o.id})">${t('mark_ready') || 'Готово к выдаче'}</button>` : ''}
        ${canChatFarmer ? `<button class="btn btn-ghost btn-sm" onclick="openOrderChat(${o.id}, 'buyer_farmer')"><i class="fi fi-rr-comment" style="font-size:14px"></i> Чат с фермером</button>` : ''}
        ${canChatDriver ? `<button class="btn btn-ghost btn-sm" onclick="openOrderChat(${o.id}, 'buyer_driver')"><i class="fi fi-rr-comment" style="font-size:14px"></i> Чат с драйвером</button>` : ''}
        ${(!isFermer && o.driver_candidate_id && !o.delivery_request && o.pickup_method === 'external') ? `<button class="btn btn-ghost btn-sm" onclick="changeDriver(${o.id})"><i class="fi fi-rr-refresh" style="font-size:14px"></i> Сменить драйвера</button>` : ''}
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

async function payOrder(orderId, amount) {
  // FIX: раньше баланс брался из закэшированного в localStorage объекта
  // пользователя (Auth.getUser()), в котором wallet_balance мог быть
  // устаревшим или вообще отсутствовать (login/register его не возвращали).
  // Теперь всегда запрашиваем актуальный баланс с сервера перед проверкой.
  let balance = 0;
  try {
    const me = await API.getMe();
    Auth.setUser(me);
    balance = Number(me?.wallet_balance || 0);
  } catch (e) {
    showToast('Не удалось проверить баланс: ' + e.message, 'error');
    return;
  }

  if (balance < amount) {
    const deficit = amount - balance;
    showToast(`Недостаточно средств! На кошельке: ${Number(balance).toLocaleString()} сум. Нужно: ${Number(amount).toLocaleString()} сум (не хватает ${Number(deficit).toLocaleString()})`, 'error');
    setTimeout(() => {
      if (confirm('Перейти в кошелёк для пополнения?')) {
        router.go('/wallet');
      }
    }, 1500);
    return;
  }

  if (!confirm(`Оплатить заказ на ${Number(amount).toLocaleString()} сум?\n\nСредства будут списаны с вашего кошелька и переведены фермеру.`)) return;

  try {
    await API.payOrder(orderId);
    showToast(`✅ Заказ оплачен! ${Number(amount).toLocaleString()} сум переведено фермеру`, 'success');
    // Update local user balance
    const me = await API.getMe();
    Auth.setUser(me);
    loadOrdersList();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function openOrderChat(orderId, chatType) {
  try {
    const chat = await API.createChat({ order_id: orderId, type: chatType });
    if (chat?.id) {
      router.go(`/chats/${chat.id}`);
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function changeDriver(orderId) {
  if (!confirm('Снять текущего кандидата-драйвера и выбрать нового?')) return;
  try {
    await API.clearDriverCandidate(orderId);
    showToast('Кандидат снят. Выбираем нового драйвера...');

    // Получаем данные заказа чтобы открыть выбор драйвера
    const orders = await API.getMyOrders();
    const order = (orders || []).find(o => o.id === orderId);
    if (order) {
      // Сохраняем ID заказа для обновления而不是 создания нового
      sessionStorage.setItem('av_change_driver_order_id', orderId);
      // Переходим на страницу товара
      router.go(`/product/${order.product_id}`);
    } else {
      loadOrdersList();
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

window.renderOrders     = renderOrders;
window.cancelOrder      = cancelOrder;
window.confirmReceived  = confirmReceived;
window.markOrderReady   = markOrderReady;
window.payOrder         = payOrder;
window.openOrderChat    = openOrderChat;
window.changeDriver     = changeDriver;