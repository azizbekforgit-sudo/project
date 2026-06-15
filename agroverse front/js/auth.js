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
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };

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

// Иконки — Flaticon UICons (единый набор). AI и тарифы вынесены из навбара,
// чтобы убрать перегрузку (AI открывается модалкой, тарифы — в профиле).
const NAV_FARMER = [
  { path: '/home',        icon: 'fi fi-rr-home',         key: 'nav_home' },
  { path: '/market',      icon: 'fi fi-rr-shop',         key: 'nav_market' },
  { path: '/product/new', icon: 'fi fi-rr-add',          key: 'nav_add_product' },
  { path: '/delivery',    icon: 'fi fi-rr-truck-side',   key: 'nav_delivery' },
  { path: '/wallet',      icon: 'fi fi-rr-wallet',       key: 'nav_wallet' },
  { path: '/profile',     icon: 'fi fi-rr-user',         key: 'nav_profile' },
];

const NAV_BUYER = [
  { path: '/home',     icon: 'fi fi-rr-home',            key: 'nav_home' },
  { path: '/market',   icon: 'fi fi-rr-shop',            key: 'nav_market' },
  { path: '/orders',   icon: 'fi fi-rr-box-open',        key: 'nav_orders' },
  { path: '/delivery', icon: 'fi fi-rr-truck-side',      key: 'nav_delivery' },
  { path: '/cart',     icon: 'fi fi-rr-shopping-cart',   key: 'nav_cart' },
  { path: '/wallet',   icon: 'fi fi-rr-wallet',          key: 'nav_wallet' },
  { path: '/profile',  icon: 'fi fi-rr-user',            key: 'nav_profile' },
];

const NAV_COURIER = [
  { path: '/courier',  icon: 'fi fi-rr-bike',            key: 'nav_courier_dashboard' },
  { path: '/profile',  icon: 'fi fi-rr-user',            key: 'nav_profile' },
];

const NAV_ADMIN = [
  { path: '/admin',   icon: 'fi fi-rr-dashboard',        key: 'nav_admin' },
  { path: '/market',  icon: 'fi fi-rr-shop',             key: 'nav_market' },
  { path: '/tariffs', icon: 'fi fi-rr-star',             key: 'nav_tariffs' },
];

function getNavItems() {
  if (Auth.isAdmin && Auth.isAdmin()) return NAV_ADMIN;
  const role = Auth.getRole();
  if (role === 'courier') return NAV_COURIER;
  return Auth.isFarmer() ? NAV_FARMER : NAV_BUYER;
}

function currentPath() {
  return (window.location.hash || '#/home').replace(/^#/, '') || '/home';
}

/* Главный layout-обёртка с навбаром. content — HTML строки страницы. */
function buildHeader() {
  const user = Auth.getUser();
  const path = currentPath();
  const items = getNavItems();
  const cartCount = getCartCount();

  const links = items.map(it => {
    const active = path === it.path || (it.path === '/market' && path.startsWith('/product') && path !== '/product/new');
    const badge = (it.path === '/cart' && cartCount > 0)
      ? `<span class="nav-badge">${cartCount}</span>` : '';
    return `<a class="nav-link ${active ? 'active' : ''}" onclick="router.go('${it.path}')">
      <i class="nav-ic ${it.icon}"></i><span class="nav-tx">${t(it.key)}</span>${badge}
    </a>`;
  }).join('');

  const cur = (window.I18nManager && I18nManager.current) || 'uz';
  const langOpts = (window.I18nManager ? I18nManager.langs() : [])
    .map(l => `<option value="${l.code}" ${l.code === cur ? 'selected' : ''}>${l.code.toUpperCase()}</option>`)
    .join('');
  const chipIcon = (Auth.isAdmin && Auth.isAdmin()) ? 'fi fi-sr-crown' : (Auth.isFarmer() ? 'fi fi-sr-leaf' : 'fi fi-sr-shopping-bag');
  const showAi = !(Auth.isAdmin && Auth.isAdmin());

  return `
    <header class="navbar">
      <div class="nav-inner">
        <div class="nav-logo" onclick="router.go('${(Auth.isAdmin && Auth.isAdmin()) ? '/admin' : '/home'}')">
          <span class="logo-leaf"><i class="fi fi-sr-seedling"></i></span><span class="logo-text"><b>Agro</b>Verse</span>
        </div>
        <nav class="nav-links">
          ${links}
          ${showAi ? `<a class="nav-link nav-ai-btn" onclick="router.go('/ai')"><i class="nav-ic fi fi-rr-comment-dots"></i><span class="nav-tx">${t('nav_ai')}</span></a>` : ''}
        </nav>
        <div class="nav-right">
          <select class="lang-select" onchange="I18nManager.set(this.value)">${langOpts}</select>
          <span class="user-chip"><i class="${chipIcon}"></i><span class="uc-name">${user?.name || user?.phone || ''}</span></span>
          <button class="btn-logout" onclick="Auth.logout()" title="${t('nav_logout')}"><i class="fi fi-rr-sign-out-alt"></i></button>
        </div>
        <button class="nav-burger" onclick="document.querySelector('.nav-links').classList.toggle('open')"><i class="fi fi-rr-menu-burger"></i></button>
      </div>
    </header>
  `;
}

/* Обёртка страницы: navbar + контейнер */
function pageShell(contentHtml, opts = {}) {
  return `
    ${buildHeader()}
    <main class="app-main ${opts.wide ? 'wide' : ''}">
      ${contentHtml}
    </main>
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
        <div class="blocked-ic"><i class="fi fi-sr-ban"></i></div>
        <h1 class="blocked-title">${t('blocked_title')}</h1>
        <p class="blocked-lead">${t('blocked_lead')}</p>
        <div class="blocked-letter">
          <div class="bl-head"><i class="fi fi-rr-envelope"></i> ${t('blocked_letter_head')}</div>
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
