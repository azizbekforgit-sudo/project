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
  { path: '/chats',    icon: '<i class="fa-solid fa-comment-dots"></i>',     key: 'nav_chats' },
  { path: '/ai',       icon: '<i class="fa-solid fa-robot"></i>',            key: 'nav_ai' },
];

const NAV_FARMER = [
  { path: '/home',     icon: '<i class="fa-solid fa-house"></i>',            key: 'nav_home' },
  { path: '/market',   icon: '<i class="fa-solid fa-store"></i>',            key: 'nav_market' },
  { path: '/product/new',icon: '<i class="fa-solid fa-plus"></i>',             key: 'nav_add_product' },
  { path: '/orders',   icon: '<i class="fa-solid fa-box"></i>',              key: 'nav_orders' },
  { path: '/chats',    icon: '<i class="fa-solid fa-comment-dots"></i>',     key: 'nav_chats' },
  { path: '/ai',       icon: '<i class="fa-solid fa-robot"></i>',            key: 'nav_ai' },
];

const NAV_BUYER = [
  { path: '/home',     icon: '<i class="fa-solid fa-house"></i>',            key: 'nav_home' },
  { path: '/market',   icon: '<i class="fa-solid fa-store"></i>',            key: 'nav_market' },
  { path: '/orders',   icon: '<i class="fa-solid fa-box"></i>',              key: 'nav_orders' },
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

/* ── Размер текста: три ступени, запоминается ── */
const TextSize = {
  levels: ['m', 'l', 'xl'],
  get() { try { return localStorage.getItem('av_text') || 'm'; } catch { return 'm'; } },
  apply(v) { document.documentElement.dataset.text = v; },
  set(v) {
    try { localStorage.setItem('av_text', v); } catch {}
    this.apply(v);
    document.querySelectorAll('.ts-btn').forEach(b => b.classList.toggle('active', b.dataset.size === v));
  },
};
TextSize.apply(TextSize.get());
window.TextSize = TextSize;

const NAV_HINTS = {
  '/home': 'hint_home', '/market': 'hint_market', '/product/new': 'hint_add_product',
  '/orders': 'hint_orders', '/chats': 'hint_chats', '/ai': 'hint_ai', '/admin': 'hint_admin',
};

function roleLabel() {
  if (Auth.isAdmin()) return t('role_admin');
  if (Auth.isFarmer()) return t('role_farmer');
  if (Auth.isBuyer()) return t('role_buyer');
  return t('role_user');
}

function textSizeControl() {
  const cur = TextSize.get();
  const btn = (v, px) => `<button class="ts-btn ${cur === v ? 'active' : ''}" data-size="${v}" onclick="TextSize.set('${v}')" aria-label="${t('text_size')} ${v.toUpperCase()}"><span style="font-size:${px}px">A</span></button>`;
  return `<div class="ts-group" role="group" aria-label="${t('text_size')}" title="${t('text_size')}">
    ${btn('m', 15)}${btn('l', 19)}${btn('xl', 23)}
  </div>`;
}

function langControl() {
  const cur = (window.I18nManager && I18nManager.current) || 'uz';
  const langs = window.I18nManager ? I18nManager.langs() : [];
  return `<div class="lang-group" role="group" aria-label="${t('lang_label')}">
    ${langs.map(l => `<button class="lang-btn ${l.code === cur ? 'active' : ''}" onclick="I18nManager.set('${l.code}')">
      <span class="lang-full">${l.label}</span><span class="lang-short">${l.code.toUpperCase()}</span>
    </button>`).join('')}
  </div>`;
}

/* Главный layout: боковое меню с подписями, верхняя панель, нижняя панель на телефоне */
function buildHeader() {
  const user = Auth.getUser();
  const path = currentPath();
  const items = getNavItems();
  const cartCount = getCartCount();
  const chatsUnread = window._globalChatsUnread || 0;
  const isFarmer = Auth.isFarmer();

  const links = items.map(it => {
    const active = path === it.path || (it.path === '/market' && path.startsWith('/product') && path !== '/product/new');
    let badge = '';
    if (it.path === '/cart' && cartCount > 0) {
      badge = `<span class="nav-badge">${cartCount}</span>`;
    } else if (it.path === '/chats' && chatsUnread > 0) {
      badge = `<span class="nav-badge">${chatsUnread}</span>`;
    }
    const hint = NAV_HINTS[it.path] ? `<span class="nav-hint">${t(NAV_HINTS[it.path])}</span>` : '';
    return `<a class="nav-item-link ${active ? 'active' : ''}" onclick="router.go('${it.path}')" ${active ? 'aria-current="page"' : ''}>
      <span class="nav-ic">${it.icon}</span>
      <span class="nav-txt-wrap"><span class="nav-tx">${t(it.key)}</span>${hint}</span>${badge}
    </a>`;
  }).join('');

  const userInitial = (user?.name || user?.phone || 'A')[0].toUpperCase();

  const mbb = (p, icon, label, extra = '') => `
    <a class="mbb-item ${path === p ? 'active' : ''}" onclick="router.go('${p}')">
      <span class="mbb-ic"><i class="${icon}"></i>${extra}</span><span>${label}</span>
    </a>`;
  const cartBadge = cartCount > 0 ? `<span class="mbb-badge">${cartCount}</span>` : '';
  const middle = isFarmer
    ? `<a class="mbb-item mbb-main ${path === '/product/new' ? 'active' : ''}" onclick="router.go('/product/new')">
         <span class="mbb-ic"><i class="fa-solid fa-plus"></i></span><span>${t('nav_sell')}</span></a>`
    : mbb('/cart', 'fa-solid fa-basket-shopping', t('nav_cart'), cartBadge);

  return `
    <aside class="sidebar-green">
      <div class="sidebar-brand" onclick="router.go('/home')">
        <div class="sb-logo-icon"><i class="fa-solid fa-seedling"></i></div>
        <div class="sb-logo-text">
          <div class="sb-logo-title">AgroVerse</div>
          <div class="sb-logo-sub">${roleLabel()}</div>
        </div>
        <button class="sb-close" onclick="event.stopPropagation(); document.querySelector('.sidebar-green').classList.remove('mobile-open')" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <nav class="sidebar-nav">${links}</nav>

      <div class="sidebar-user" onclick="router.go('/profile')">
        <div class="su-avatar">${userInitial}</div>
        <div class="su-info">
          <div class="su-name">${user?.name || user?.phone || ''}</div>
          <div class="su-role">${t('hint_profile')}</div>
        </div>
      </div>
      <button class="sb-logout" onclick="Auth.logout()">
        <i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('logout')}
      </button>
    </aside>
    <div class="sidebar-scrim" onclick="document.querySelector('.sidebar-green').classList.remove('mobile-open')"></div>

    <header class="top-header-bar">
      <div class="top-header-left">
        <button class="mobile-menu-btn" onclick="document.querySelector('.sidebar-green').classList.add('mobile-open')" aria-label="Menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <form class="top-search-box" onsubmit="event.preventDefault(); router.go('/market?q=' + encodeURIComponent(this.q.value))">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="search" name="q" id="topSearch" placeholder="${t('search_ph')}" />
          <button type="submit" class="tsb-go">${t('search_btn')}</button>
        </form>
      </div>
      <div class="top-header-right">
        ${textSizeControl()}
        ${langControl()}
        ${!isFarmer && !Auth.isAdmin() ? `<button class="cart-header-btn" onclick="router.go('/cart')">
          <i class="fa-solid fa-basket-shopping"></i><span class="chb-tx">${t('nav_cart')}</span>
          ${cartCount > 0 ? `<span class="cart-header-badge">${cartCount}</span>` : ''}
        </button>` : ''}
      </div>
    </header>

    <nav class="mobile-bottom-bar">
      ${mbb('/home', 'fa-solid fa-house', t('nav_home'))}
      ${mbb('/market', 'fa-solid fa-store', t('nav_market'))}
      ${middle}
      ${mbb('/orders', 'fa-solid fa-box', t('nav_orders'))}
      ${mbb('/profile', 'fa-solid fa-user', t('nav_profile'))}
    </nav>
  `;
}

/* Обёртка страницы: sidebar + header + контейнер */
function pageShell(contentHtml, opts = {}) {
  return `
    <div class="app-layout">
      ${buildHeader()}
      <main class="app-main-content ${opts.wide ? 'wide' : ''}">
        <div class="main-zoom">${contentHtml}</div>
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