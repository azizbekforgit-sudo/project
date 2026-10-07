/* auth.js — управление токеном, ролями, уведомлениями */

const Auth = {
  setToken(token) { localStorage.setItem('access_token', token); },
  getToken()      { return localStorage.getItem('access_token'); },
  removeToken()   { localStorage.removeItem('access_token'); },

  setUser(user)   { localStorage.setItem('av_user', JSON.stringify(user)); },
  getUser()       {
    try { return JSON.parse(localStorage.getItem('av_user')); }
    catch { return null; }
  },
  removeUser()    { localStorage.removeItem('av_user'); },

  isLoggedIn()    { return !!this.getToken(); },
  getRole()       { return this.getUser()?.role || null; },
  isFarmer()      { return this.getRole() === 'fermer'; },
  isBuyer()       { return this.getRole() === 'xaridor'; },
  isAdmin()       { return this.getRole() === 'admin'; },

  logout() {
    this.removeToken();
    this.removeUser();
    window.router.go('/login');
  },
};

/* ============================
   Toast notifications
   ============================ */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  const icons = { success: fe('✅',16), error: fe('❌',16), warn: fe('⚠️',16), info: fe('ℹ️',16) };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity .3s, transform .3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(60px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ============================
   Pending success message
   ============================ */
function setPendingMessage(msg) { sessionStorage.setItem('av_pending_msg', msg); }
function popPendingMessage() {
  const m = sessionStorage.getItem('av_pending_msg');
  sessionStorage.removeItem('av_pending_msg');
  return m;
}

/* ============================
   Spinner helpers
   ============================ */
function showSpinner(container) {
  container.innerHTML = '<div class="spinner"></div>';
}

const NAV_COMMON = [
  { path: '/home',     icon: '<i class="fa-solid fa-house"></i>',            key: 'nav_home' },
  { path: '/market',   icon: '<i class="fa-solid fa-store"></i>',            key: 'nav_market' },
  { path: '/orders',   icon: '<i class="fa-solid fa-box"></i>',              key: 'nav_orders' },
  { path: '/wallet',   icon: '<i class="fa-solid fa-wallet"></i>',           key: 'nav_wallet' },
  { path: '/chats',    icon: '<i class="fa-solid fa-comment-dots"></i>',     key: 'nav_chats' },
  { path: '/ai',       icon: '<i class="fa-solid fa-robot"></i>',            key: 'nav_ai' },
];

const NAV_FARMER = [
  { path: '/home',     icon: '<i class="fa-solid fa-house"></i>',            key: 'nav_home' },
  { path: '/market',   icon: '<i class="fa-solid fa-store"></i>',            key: 'nav_market' },
  { path: '/product/new',icon: '<i class="fa-solid fa-plus"></i>',             key: 'nav_add_product' },
  { path: '/orders',   icon: '<i class="fa-solid fa-box"></i>',              key: 'nav_orders' },
  { path: '/wallet',   icon: '<i class="fa-solid fa-wallet"></i>',           key: 'nav_wallet' },
  { path: '/chats',    icon: '<i class="fa-solid fa-comment-dots"></i>',     key: 'nav_chats' },
  { path: '/ai',       icon: '<i class="fa-solid fa-robot"></i>',            key: 'nav_ai' },
];

const NAV_BUYER = [
  { path: '/home',     icon: '<i class="fa-solid fa-house"></i>',            key: 'nav_home' },
  { path: '/market',   icon: '<i class="fa-solid fa-store"></i>',            key: 'nav_market' },
  { path: '/orders',   icon: '<i class="fa-solid fa-box"></i>',              key: 'nav_orders' },
  { path: '/wallet',   icon: '<i class="fa-solid fa-wallet"></i>',           key: 'nav_wallet' },
  { path: '/chats',    icon: '<i class="fa-solid fa-comment-dots"></i>',     key: 'nav_chats' },
  { path: '/ai',       icon: '<i class="fa-solid fa-robot"></i>',            key: 'nav_ai' },
];

function getNavItems() {
  if (Auth.isAdmin && Auth.isAdmin()) return [{ path: '/admin', icon: '<i class="fa-solid fa-gear"></i>', key: 'nav_admin' }, ...NAV_COMMON];
  if (Auth.isFarmer()) return NAV_FARMER;
  if (Auth.isBuyer()) return NAV_BUYER;
  return NAV_COMMON;
}

function currentPath() {
  return (window.location.hash || '#/home').replace(/^#/, '') || '/home';
}

/* Главный layout-обёртка со сбоковым меню в стиле Modern Agriculture */
function buildHeader() {
  const user = Auth.getUser();
  const path = currentPath();
  const items = getNavItems();
  const cartCount = getCartCount();
  const chatsUnread = window._globalChatsUnread || 0;

  const links = items.map(it => {
    const active = path === it.path || (it.path === '/market' && path.startsWith('/product') && path !== '/product/new');
    let badge = '';
    if (it.path === '/cart' && cartCount > 0) {
      badge = `<span class="nav-badge">${cartCount}</span>`;
    } else if (it.path === '/chats' && chatsUnread > 0) {
      badge = `<span class="nav-badge">${chatsUnread}</span>`;
    }
    if (it.external) {
      return `<a class="nav-item-link" href="${it.url}" target="_blank">
        <span class="nav-ic">${it.icon}</span><span class="nav-tx">${t(it.key)}</span>
      </a>`;
    }
    return `<a class="nav-item-link ${active ? 'active' : ''}" onclick="router.go('${it.path}')">
      <span class="nav-ic">${it.icon}</span><span class="nav-tx">${t(it.key)}</span>${badge}
    </a>`;
  }).join('');

  const cur = (window.I18nManager && I18nManager.current) || 'uz';
  const langOpts = (window.I18nManager ? I18nManager.langs() : [])
    .map(l => `<option value="${l.code}" ${l.code === cur ? 'selected' : ''}>${l.code.toUpperCase()}</option>`)
    .join('');

  const userInitial = (user?.name || user?.phone || 'A')[0].toUpperCase();
  const roleName = Auth.isFarmer() ? 'Фермер' : Auth.isBuyer() ? 'Покупатель' : 'Пользователь';

  return `
    <aside class="sidebar-green">
      <div class="sidebar-brand" onclick="router.go('/home')">
        <div class="sb-logo-icon">🌿</div>
        <div class="sb-logo-text">
          <div class="sb-logo-title">AgroVerse</div>
          <div class="sb-logo-sub">Сельское хозяйство</div>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${links}
      </nav>

      <div class="sidebar-user" onclick="router.go('/profile')">
        <div class="su-avatar">${userInitial}</div>
        <div class="su-info">
          <div class="su-name">${user?.name || 'Алишер Абдуллаев'}</div>
          <div class="su-role">${roleName}</div>
        </div>
        <button class="su-logout" onclick="event.stopPropagation(); Auth.logout()" title="${t('nav_logout')}">
          <i class="fa-solid fa-arrow-right-from-bracket"></i>
        </button>
      </div>
    </aside>

    <header class="top-header-bar">
      <div class="top-header-left">
        <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar-green').classList.toggle('mobile-open')">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="top-search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Что вы ищете?" onkeydown="if(event.key==='Enter'){ router.go('/market?q=' + encodeURIComponent(this.value)); }" />
        </div>
      </div>
      <div class="top-header-right">
        <button class="cart-header-btn" onclick="router.go('/cart')" title="Корзина">
          <i class="fa-solid fa-cart-shopping"></i>
          ${cartCount > 0 ? `<span class="cart-header-badge">${cartCount}</span>` : ''}
        </button>
        <select class="lang-select" onchange="I18nManager.set(this.value)">${langOpts}</select>
      </div>
    </header>

    <nav class="mobile-bottom-bar">
      <a class="mbb-item ${path === '/home' ? 'active' : ''}" onclick="router.go('/home')">
        <i class="fa-solid fa-house" style="font-size:24px;"></i><span>Главная</span>
      </a>
      <a class="mbb-item ${path === '/market' ? 'active' : ''}" onclick="router.go('/market')">
        <i class="fa-solid fa-store" style="font-size:24px;"></i><span>Рынок</span>
      </a>
      <a class="mbb-item ${path === '/cart' ? 'active' : ''}" onclick="router.go('/cart')">
        <div style="position:relative;">
          <i class="fa-solid fa-cart-shopping" style="font-size:24px;"></i>
          ${cartCount > 0 ? `<span class="mbb-badge">${cartCount}</span>` : ''}
        </div>
        <span>Корзина</span>
      </a>
      <a class="mbb-item ${path === '/orders' ? 'active' : ''}" onclick="router.go('/orders')">
        <i class="fa-solid fa-box" style="font-size:24px;"></i><span>Заказы</span>
      </a>
      <a class="mbb-item ${path === '/profile' ? 'active' : ''}" onclick="router.go('/profile')">
        <i class="fa-solid fa-user" style="font-size:24px;"></i><span>Профиль</span>
      </a>
    </nav>
  `;
}

/* Обёртка страницы: sidebar + header + контейнер */
function pageShell(contentHtml, opts = {}) {
  return `
    <div class="app-layout">
      ${buildHeader()}
      <main class="app-main-content ${opts.wide ? 'wide' : ''}">
        ${contentHtml}
      </main>
    </div>
  `;
}

/* ============ Корзина (localStorage) ============ */
function getCart()      { try { return JSON.parse(localStorage.getItem('av_cart') || '[]'); } catch { return []; } }
function setCart(items)  { localStorage.setItem('av_cart', JSON.stringify(items)); }
function getCartCount()  { return getCart().reduce((s, i) => s + (i.qty || 1), 0); }
function addToCart(product, qty = 1) {
  const cart = getCart();
  const ex = cart.find(i => i.id === product.id);
  if (ex) ex.qty += qty;
  else cart.push({ id: product.id, name: product.name, price: product.price, unit: product.unit, image: product.images?.[0] || '', qty });
  setCart(cart);
}
function removeFromCart(id) { setCart(getCart().filter(i => i.id !== id)); }
function clearCart() { setCart([]); }

/* ============================
   Экран блокировки аккаунта
   ============================ */
function showBlockedScreen(reason) {
  // остановить heartbeat
  if (window.__blockHeartbeat) { clearInterval(window.__blockHeartbeat); window.__blockHeartbeat = null; }
  const r = reason || t('blocked_reason_default');
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="blocked-screen">
      <div class="blocked-box">
        <div class="blocked-ic"><i class="fa-solid fa-ban"></i></div>
        <h1 class="blocked-title">${t('blocked_title')}</h1>
        <p class="blocked-lead">${t('blocked_lead')}</p>
        <div class="blocked-letter">
          <div class="bl-head"><i class="fa-solid fa-envelope"></i> ${t('blocked_letter_head')}</div>
          <div class="bl-reason-label">${t('blocked_reason_label')}</div>
          <div class="bl-reason">${r}</div>
          <div class="bl-foot">${t('blocked_foot')}</div>
        </div>
        <button class="btn btn-primary btn-lg" onclick="Auth.logout()">${t('blocked_return')}</button>
      </div>
    </div>`;
  window.scrollTo(0, 0);
}

/* Периодическая проверка: если админ заблокировал — моментально выгоняем */
function startBlockHeartbeat() {
  if (window.__blockHeartbeat) clearInterval(window.__blockHeartbeat);
  window.__blockHeartbeat = setInterval(() => {
    if (!Auth.isLoggedIn()) return;
    // getMe вернёт 403 blocked → api.js сам покажет экран блокировки
    API.getMe().catch(() => {});
  }, 15000);
}

window.showBlockedScreen = showBlockedScreen;
window.startBlockHeartbeat = startBlockHeartbeat;

/* WebSocket handler для unread badge в навбаре */
function initChatBadgeWS() {
  if (typeof ChatWS === 'undefined') return;
  // afterRender() вызывается на каждой навигации — без этого флага сюда
  // навешивался бы новый обработчик 'new_message' при каждом переходе
  // между страницами, и бейдж пересчитывался бы по многу раз на одно сообщение.
  if (window.__chatBadgeWsInit) return;
  window.__chatBadgeWsInit = true;

  // Обновляем бейдж при новом сообщении
  ChatWS.on('new_message', (data) => {
    // Если это не наше сообщение — обновляем бейдж
    const user = Auth.getUser();
    if (data.message && data.message.sender_id !== user?.id) {
      updateChatBadge();
    }
  });

  // Также обновляем бейдж при подключении WS
  ChatWS.on('*', () => {});
}

function updateChatBadge() {
  if (!Auth.isLoggedIn()) return;
  // Просто перерисовываем навбар с обновлённым бейджем
  // Для этого нужно пересчитать unread — делаем это через API один раз
  API.getChats().then(chats => {
    const total = (chats || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
    window._globalChatsUnread = total;
    const chatLink = document.querySelector('a[onclick*="/chats"]');
    if (chatLink) {
      const existing = chatLink.querySelector('.nav-badge');
      if (total > 0) {
        if (existing) existing.textContent = total;
        else chatLink.insertAdjacentHTML('beforeend', `<span class="nav-badge">${total}</span>`);
      } else if (existing) {
        existing.remove();
      }
    }
  }).catch(() => {});
}
window.initChatBadgeWS = initChatBadgeWS;
window.updateChatBadge = updateChatBadge;

window.Auth = Auth;
window.showToast = showToast;
window.setPendingMessage = setPendingMessage;
window.popPendingMessage = popPendingMessage;
window.showSpinner = showSpinner;
window.buildHeader = buildHeader;
window.pageShell = pageShell;
window.getCart = getCart;
window.setCart = setCart;
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.getNavItems = getNavItems;