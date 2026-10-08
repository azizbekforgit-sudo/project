/* pages/orders.js — Заказы: «Мои покупки» и «Мне заказали».
   Логика: покупатель оформляет заказ → он сразу приходит фермеру, который
   выставил товар. Оба видят телефон друг друга, созваниваются или пишут.
   Фермер жмёт «Продано» или «Отклонить», покупатель может «Отменить». */

const OPEN_ORDER = ['created', 'paid', 'ready_for_pickup', 'ready'];
let _odCache = [];
let _odTab = null;

function fmtPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('998')) return `+998 ${d.slice(3,5)} ${d.slice(5,8)} ${d.slice(8,10)} ${d.slice(10)}`;
  return p || '';
}
function fmtSum(n) { return `${Math.round(Number(n) || 0).toLocaleString('ru-RU')} ${t('currency') || 'сум'}`; }
function fmtQty(q, unit) { return `${Number(q).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${unit || t('unit_kg') || 'кг'}`; }

/* Статус человеческими словами — с точки зрения того, кто смотрит */
function orderState(o) {
  const seller = o.my_role === 'seller';
  if (OPEN_ORDER.includes(o.status)) {
    return seller
      ? { cls: 'new', icon: 'fa-solid fa-bell', text: t('os_seller_new') }
      : { cls: 'wait', icon: 'fa-solid fa-hourglass-half', text: t('os_buyer_wait') };
  }
  if (o.status === 'completed') {
    return { cls: 'done', icon: 'fa-solid fa-circle-check', text: seller ? t('os_sold') : t('os_bought') };
  }
  // cancelled
  if (o.cancelled_by === 'seller') return { cls: 'off', icon: 'fa-solid fa-ban', text: seller ? t('os_you_rejected') : t('os_seller_rejected') };
  if (o.cancelled_by === 'buyer')  return { cls: 'off', icon: 'fa-solid fa-xmark', text: seller ? t('os_buyer_cancelled') : t('os_you_cancelled') };
  return { cls: 'off', icon: 'fa-solid fa-xmark', text: t('os_cancelled') };
}

async function renderOrders() {
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`
    <div class="od">
      <div class="page-head">
        <h1 class="page-title">${t('nav_orders')}</h1>
        <p class="page-desc">${t('od_desc')}</p>
      </div>
      <div class="seg od-tabs" role="tablist" id="od-tabs"></div>
      <div id="orders-wrap"><div class="spinner"></div></div>
    </div>
  `);
  loadOrdersList();
}

async function loadOrdersList() {
  const wrap = document.getElementById('orders-wrap');
  if (!wrap) return;
  try {
    const data = await API.getMyOrders();
    _odCache = data?.orders || data || [];
    const sales = _odCache.filter(o => o.my_role === 'seller');
    const buys  = _odCache.filter(o => o.my_role !== 'seller');
    const newSales = sales.filter(o => OPEN_ORDER.includes(o.status)).length;
    const qsTab = new URLSearchParams(location.hash.split('?')[1] || '').get('tab');
    if (!_odTab) _odTab = qsTab || ((Auth.isFarmer() && (newSales || !buys.length)) ? 'sales' : 'buys');
    const showSales = Auth.isFarmer() || sales.length > 0;
    if (!showSales) _odTab = 'buys';

    document.getElementById('od-tabs').innerHTML = `
      <button class="seg-btn ${_odTab === 'buys' ? 'active' : ''}" role="tab" aria-selected="${_odTab === 'buys'}" onclick="switchOrdersTab('buys')">
        <i class="fa-solid fa-basket-shopping"></i> ${t('od_tab_buys')} <span class="od-count">${buys.length}</span>
      </button>
      ${showSales ? `<button class="seg-btn ${_odTab === 'sales' ? 'active' : ''}" role="tab" aria-selected="${_odTab === 'sales'}" onclick="switchOrdersTab('sales')">
        <i class="fa-solid fa-store"></i> ${t('od_tab_sales')} ${newSales ? `<span class="od-count hot">${newSales}</span>` : `<span class="od-count">${sales.length}</span>`}
      </button>` : ''}`;

    const list = _odTab === 'sales' ? sales : buys;
    if (!list.length) {
      wrap.innerHTML = `
        <div class="od-empty">
          <i class="fa-solid ${_odTab === 'sales' ? 'fa-store' : 'fa-basket-shopping'}"></i>
          <p>${_odTab === 'sales' ? t('od_empty_sales') : t('od_empty_buys')}</p>
          ${_odTab === 'sales'
            ? `<button class="btn btn-primary btn-lg" onclick="router.go('/product/new')"><i class="fa-solid fa-plus"></i> ${t('act_sell')}</button>`
            : `<button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fa-solid fa-store"></i> ${t('go_market')}</button>`}
        </div>`;
      return;
    }
    const open = list.filter(o => OPEN_ORDER.includes(o.status));
    const closed = list.filter(o => !OPEN_ORDER.includes(o.status));
    wrap.innerHTML = `
      ${open.length ? `<h2 class="od-h2">${t('od_open')} <span>${open.length}</span></h2><div class="od-list">${open.map(orderCardHtml).join('')}</div>` : ''}
      ${closed.length ? `<h2 class="od-h2 muted">${t('od_closed')} <span>${closed.length}</span></h2><div class="od-list">${closed.map(orderCardHtml).join('')}</div>` : ''}`;
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    wrap.innerHTML = `<div class="empty-state"><p><i class="fa-solid fa-triangle-exclamation"></i> ${e.message}</p></div>`;
  }
}

function switchOrdersTab(tab) { _odTab = tab; loadOrdersList(); }

function orderCardHtml(o) {
  const seller = o.my_role === 'seller';
  const st = orderState(o);
  const isOpen = OPEN_ORDER.includes(o.status);
  const date = o.created_at ? new Date(o.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const other = seller
    ? { label: t('od_buyer'), name: o.xaridor_name, phone: o.xaridor_phone, icon: 'fa-solid fa-user' }
    : { label: t('od_farmer'), name: o.fermer_name, phone: o.fermer_phone, icon: 'fa-solid fa-tractor' };
  const img = o.product_photo
    ? `<img src="${API_PHOTO(o.product_photo)}" alt="" onerror="this.remove()" />`
    : '';
  const phoneDigits = String(other.phone || '').replace(/[^\d+]/g, '');

  const delivery = o.delivery_request
    ? `<div class="od-note"><i class="fa-solid fa-truck"></i> ${o.delivery_request.route_from} → ${o.delivery_request.route_to} · ${fmtSum(o.delivery_request.total_price)}${o.delivery_request.courier_name ? ` · ${o.delivery_request.courier_name} ${fmtPhone(o.delivery_request.courier_phone)}` : ''}</div>`
    : (o.driver_candidate_id ? `<div class="od-note"><i class="fa-solid fa-truck"></i> ${t('od_driver')}: ${o.driver_candidate_name || ''}</div>` : '');

  const canPayDriver = !seller && o.delivery_request && o.delivery_request.status === 'delivered';

  return `
    <article class="od-card ${st.cls}" id="order-${o.id}">
      <div class="od-status ${st.cls}"><i class="${st.icon}"></i> ${st.text}<span class="od-id">№${o.id}${date ? ' · ' + date : ''}</span></div>
      <div class="od-body">
        <div class="od-product">
          <div class="od-img"><i class="fa-solid fa-leaf"></i>${img}</div>
          <div class="od-title">
            <b>${o.product_title}</b>
            ${o.product_id ? `<a onclick="router.go('/product/${o.product_id}')">${t('od_open_product')} <i class="fa-solid fa-chevron-right"></i></a>` : ''}
          </div>
        </div>
        <div class="od-figs">
          <div><span>${t('od_qty')}</span><b>${fmtQty(o.quantity, o.product_unit)}</b></div>
          <div><span>${t('od_sum')}</span><b>${fmtSum(o.total_price)}</b></div>
        </div>
        <div class="od-person">
          <div class="od-person-ic"><i class="${other.icon}"></i></div>
          <div class="od-person-tx">
            <span>${other.label}</span>
            <b>${escHtml(other.name || '')}</b>
            ${other.phone ? `<span class="od-phone">${fmtPhone(other.phone)}</span>` : ''}
          </div>
        </div>
        ${delivery}
        ${isOpen ? `
          <div class="od-contact">
            ${phoneDigits ? `<a class="btn btn-outline" href="tel:${phoneDigits}"><i class="fa-solid fa-phone"></i> ${t('od_call')}</a>` : ''}
            <button class="btn btn-outline" onclick="openOrderChat(${o.id}, 'buyer_farmer')"><i class="fa-solid fa-comment-dots"></i> ${t('od_write')}</button>
          </div>
          <p class="od-hint">${seller ? t('od_hint_seller') : t('od_hint_buyer')}</p>
          <div class="od-actions">
            ${seller ? `
              <button class="btn btn-primary btn-lg" onclick="orderSold(${o.id})"><i class="fa-solid fa-check"></i> ${t('od_sold_btn')}</button>
              <button class="btn btn-reject-o btn-lg" onclick="orderReject(${o.id})"><i class="fa-solid fa-xmark"></i> ${t('od_reject_btn')}</button>
            ` : `
              <button class="btn btn-reject-o btn-lg" onclick="orderCancelAsk(${o.id})"><i class="fa-solid fa-xmark"></i> ${t('od_cancel_btn')}</button>
            `}
            ${canPayDriver ? `<button class="btn btn-primary" onclick="payDriverOrder(${o.id}, ${o.delivery_request.total_price})"><i class="fa-solid fa-credit-card"></i> ${t('od_pay_driver')}</button>` : ''}
            ${(!seller && o.driver_candidate_id && o.pickup_method === 'external') ? `<button class="btn btn-outline" onclick="openOrderChat(${o.id}, 'buyer_driver')"><i class="fa-regular fa-comment"></i> ${t('od_chat_driver')}</button>` : ''}
          </div>` : ''}
      </div>
    </article>`;
}

/* Подтверждение действия в нижней шторке (alert/confirm пожилым неудобны) */
function confirmSheet(title, text, okLabel, okClass, onOk) {
  openSheet('confirm', title, `
    <p class="cf-text">${text}</p>
    <div class="cf-actions">
      <button class="btn ${okClass} btn-lg btn-full" id="cf-ok">${okLabel}</button>
      <button class="btn btn-outline btn-lg btn-full" onclick="closeSheet()">${t('od_back')}</button>
    </div>`);
  document.getElementById('cf-ok').onclick = async () => { closeSheet(); await onOk(); };
}
window.confirmSheet = confirmSheet;

async function orderAction(fn, okMsg) {
  try { await fn(); showToast(okMsg); _odTab = _odTab || null; loadOrdersList(); if (typeof refreshOrdersBadge === 'function') refreshOrdersBadge(true); }
  catch (e) { showToast(e.message, 'error'); }
}
function orderSold(id) {
  confirmSheet(t('od_sold_q'), t('od_sold_text'), `<i class="fa-solid fa-check"></i> ${t('od_sold_btn')}`, 'btn-primary',
    () => orderAction(() => API.markSold(id), t('od_sold_ok')));
}
function orderReject(id) {
  confirmSheet(t('od_reject_q'), t('od_reject_text'), `<i class="fa-solid fa-xmark"></i> ${t('od_reject_btn')}`, 'btn-danger',
    () => orderAction(() => API.rejectOrder(id), t('od_reject_ok')));
}
function orderCancelAsk(id) {
  confirmSheet(t('od_cancel_q'), t('od_cancel_text'), `<i class="fa-solid fa-xmark"></i> ${t('od_cancel_btn')}`, 'btn-danger',
    () => orderAction(() => API.cancelOrder(id), t('od_cancel_ok')));
}
window.orderSold = orderSold;
window.orderReject = orderReject;
window.orderCancelAsk = orderCancelAsk;
window.switchOrdersTab = switchOrdersTab;
window.fmtPhone = fmtPhone;

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
      sessionStorage.setItem('av_change_driver_order_id', orderId);
      router.go(`/product/${order.product_id}`);
    } else {
      loadOrdersList();
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function payDriverOrder(orderId, amount) {
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
    showToast(`Недостаточно средств! На кошельке: ${Number(balance).toLocaleString()} сум. Нужно: ${Number(amount).toLocaleString()} сум`, 'error');
    setTimeout(() => {
      if (confirm('Перейти в кошелёк для пополнения?')) {
        router.go('/wallet');
      }
    }, 1500);
    return;
  }

  if (!confirm(`Оплатить доставку драйверу ${Number(amount).toLocaleString()} сум?\n\nСредства будут списаны с вашего кошелька и переведены драйверу.`)) return;

  try {
    await API.payDriver(orderId);
    showToast(`✅ Доставка оплачена! ${Number(amount).toLocaleString()} сум переведено драйверу`, 'success');
    const me = await API.getMe();
    Auth.setUser(me);
    loadOrdersList();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

window.renderOrders     = renderOrders;
window.loadOrdersList   = loadOrdersList;
window.cancelOrder      = cancelOrder;
window.confirmReceived  = confirmReceived;
window.markOrderReady   = markOrderReady;
window.payOrder         = payOrder;
window.openOrderChat    = openOrderChat;
window.changeDriver     = changeDriver;
window.payDriverOrder   = payDriverOrder;