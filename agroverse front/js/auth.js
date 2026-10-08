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
  // покупать может и покупатель, и фермер (у других фермеров)
  canBuy()        { return this.isLoggedIn() && ['xaridor', 'fermer'].includes(this.getRole()); },

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

/* Одно меню для фермера и покупателя. У фермера дополнительно «Добавить продукт». */
const NAV_COMMON = [
  { path: '/home',     icon: '<i class="fa-solid fa-house"></i>',            key: 'nav_home' },
  { path: '/market',   icon: '<i class="fa-solid fa-store"></i>',            key: 'nav_market' },
  { path: '/cart',     icon: '<i class="fa-solid fa-basket-shopping"></i>',  key: 'nav_cart' },
  { path: '/orders',   icon: '<i class="fa-solid fa-box"></i>',              key: 'nav_orders' },
  { path: '/chats',    icon: '<i class="fa-solid fa-comment-dots"></i>',     key: 'nav_chats' },
  { path: '/ai',       icon: '<i class="fa-solid fa-robot"></i>',            key: 'nav_ai' },
];
const NAV_ADD_PRODUCT = { path: '/product/new', icon: '<i class="fa-solid fa-plus"></i>', key: 'nav_add_product' };

function getNavItems() {
  if (Auth.isAdmin && Auth.isAdmin()) {
    return [{ path: '/admin', icon: '<i class="fa-solid fa-gear"></i>', key: 'nav_admin' },
            ...NAV_COMMON.filter(i => !['/cart', '/orders'].includes(i.path))];
  }
  if (Auth.isFarmer()) {
    const items = [...NAV_COMMON];
    items.splice(2, 0, NAV_ADD_PRODUCT);
    return items;
  }
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
    document.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === v));
  },
};
TextSize.apply(TextSize.get());
window.TextSize = TextSize;

const NAV_HINTS = {
  '/home': 'hint_home', '/market': 'hint_market', '/product/new': 'hint_add_product',
  '/orders': 'hint_orders', '/chats': 'hint_chats', '/ai': 'hint_ai', '/admin': 'hint_admin',
  '/profile': 'hint_profile', '/wallet': 'nav_wallet_hint', '/tariffs': 'nav_tariffs_hint',
  '/yulchi': 'nav_yulchi_hint', '/cart': 'act_cart_d',
};

function roleLabel() {
  if (Auth.isAdmin()) return t('role_admin');
  if (Auth.isFarmer()) return t('role_farmer');
  if (Auth.isBuyer()) return t('role_buyer');
  return t('role_user');
}

function escHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
window.escHtml = escHtml;

/* Номер телефона: убираем пробелы/скобки/дефисы, добавляем +998 для местных номеров.
   Сервер принимает только «+» и 10–15 цифр. */
function normalizePhone(raw) {
  let d = String(raw || '').replace(/[^\d+]/g, '');
  const plus = d.startsWith('+');
  d = d.replace(/\+/g, '');
  if (!plus && d.length === 9) d = '998' + d;       // 90 123 45 67
  return d ? '+' + d : '';
}
window.normalizePhone = normalizePhone;

/* ── Нижняя «шторка» (меню, язык, размер текста) ── */
function openSheet(id, title, bodyHtml) {
  closeSheet();
  const el = document.createElement('div');
  el.className = 'sheet-overlay';
  el.id = 'sheet-overlay';
  el.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-sheet="${id}">
      <div class="sheet-head">
        <h2 class="sheet-title" id="sheet-title">${title}</h2>
        <button class="sheet-close" onclick="closeSheet()" aria-label="${t('close')}"><i class="fa-solid fa-xmark"></i><span>${t('close')}</span></button>
      </div>
      <div class="sheet-body">${bodyHtml}</div>
    </div>`;
  el.addEventListener('click', e => { if (e.target === el) closeSheet(); });
  document.body.appendChild(el);
  document.body.classList.add('sheet-open');
  requestAnimationFrame(() => el.classList.add('show'));
  el.querySelector('.sheet-close')?.focus();
}
function closeSheet() {
  document.getElementById('sheet-overlay')?.remove();
  document.body.classList.remove('sheet-open');
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.openSheet = openSheet;
window.closeSheet = closeSheet;

function langOptionsHtml() {
  const cur = (window.I18nManager && I18nManager.current) || 'uz';
  return `<div class="opt-list">${I18nManager.langs().map(l => `
    <button class="opt-row ${l.code === cur ? 'active' : ''}" onclick="closeSheet(); I18nManager.set('${l.code}')">
      <span class="opt-badge">${l.code.toUpperCase()}</span>
      <span class="opt-text">${l.label}</span>
      <i class="fa-solid fa-circle-check opt-check"></i>
    </button>`).join('')}</div>`;
}

function sizeOptionsHtml() {
  const cur = TextSize.get();
  const row = (v, label, px) => `
    <button class="opt-row ${cur === v ? 'active' : ''}" data-size="${v}" onclick="TextSize.set('${v}')">
      <span class="opt-badge" style="font-size:${px}px">A</span>
      <span class="opt-text">${label}<small style="font-size:${px - 3}px">${t('size_sample')}</small></span>
      <i class="fa-solid fa-circle-check opt-check"></i>
    </button>`;
  return `<div class="opt-list">${row('m', t('size_m'), 17)}${row('l', t('size_l'), 20)}${row('xl', t('size_xl'), 23)}</div>`;
}

function openLangSheet() { openSheet('lang', t('choose_lang'), langOptionsHtml()); }
function openSizeSheet() { openSheet('size', t('choose_size'), sizeOptionsHtml()); }
window.openLangSheet = openLangSheet;
window.openSizeSheet = openSizeSheet;

/* Все разделы для «Меню» на телефоне */
function menuItems() {
  const items = [...getNavItems()];
  const add = (path, icon, key) => { if (!items.some(i => i.path === path)) items.push({ path, icon: `<i class="${icon}"></i>`, key }); };
  if (!Auth.isAdmin()) {
    add('/wallet', 'fa-solid fa-wallet', 'nav_wallet');
    if (Auth.isFarmer()) add('/tariffs', 'fa-solid fa-medal', 'nav_tariffs');
  }
  return items;
}

function openMenuSheet() {
  const user = Auth.getUser();
  const path = currentPath();
  const rows = menuItems().map(it => `
    <button class="menu-row ${path === it.path ? 'active' : ''}" onclick="closeSheet(); router.go('${it.path}')">
      <span class="menu-ic">${it.icon}</span>
      <span class="menu-tx"><b>${t(it.key)}</b>${NAV_HINTS[it.path] ? `<small>${t(NAV_HINTS[it.path])}</small>` : ''}</span>
      <i class="fa-solid fa-chevron-right menu-go"></i>
    </button>`).join('');
  openSheet('menu', t('menu_title'), `
    <button class="menu-user" onclick="closeSheet(); router.go('/profile')">
      <span class="su-avatar">${escHtml((user?.name || user?.phone || 'A')[0].toUpperCase())}</span>
      <span class="menu-tx"><b>${escHtml(user?.name || user?.phone || '')}</b><small>${roleLabel()} · ${t('hint_profile')}</small></span>
      <i class="fa-solid fa-chevron-right menu-go"></i>
    </button>
    <div class="menu-list">${rows}</div>
    <h3 class="sheet-sub"><i class="fa-solid fa-globe"></i> ${t('choose_lang')}</h3>
    <div class="seg">${I18nManager.langs().map(l => `<button class="seg-btn ${l.code === I18nManager.current ? 'active' : ''}" onclick="closeSheet(); I18nManager.set('${l.code}')">${l.label}</button>`).join('')}</div>
    <h3 class="sheet-sub"><i class="fa-solid fa-text-height"></i> ${t('choose_size')}</h3>
    <div class="seg">
      <button class="seg-btn ${TextSize.get() === 'm' ? 'active' : ''}" data-size="m" onclick="TextSize.set('m')" style="font-size:15px">${t('size_m')}</button>
      <button class="seg-btn ${TextSize.get() === 'l' ? 'active' : ''}" data-size="l" onclick="TextSize.set('l')" style="font-size:17px">${t('size_l')}</button>
      <button class="seg-btn ${TextSize.get() === 'xl' ? 'active' : ''}" data-size="xl" onclick="TextSize.set('xl')" style="font-size:19px">${t('size_xl')}</button>
    </div>
    <button class="menu-logout" onclick="closeSheet(); Auth.logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('logout')}</button>
  `);
}
window.openMenuSheet = openMenuSheet;

/* ── Голосовой поиск (Chrome на Android/ПК). Кнопка видна только если браузер умеет. ── */
const VOICE_LANG = { uz: 'uz-UZ', ru: 'ru-RU', en: 'en-US' };
function voiceSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function voiceButtonHtml(inputId) {
  if (!voiceSupported()) return '';
  return `<button type="button" class="voice-btn" onclick="startVoice('${inputId}', this)" aria-label="${t('voice')}" title="${t('voice')}"><i class="fa-solid fa-microphone"></i></button>`;
}
function startVoice(inputId, btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  const rec = new SR();
  rec.lang = VOICE_LANG[I18nManager.current] || 'ru-RU';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  btn?.classList.add('listening');
  showToast(t('voice_listen'), 'info', 4000);
  rec.onresult = e => {
    const text = e.results[0][0].transcript.replace(/[.!?]$/, '');
    const input = document.getElementById(inputId);
    if (!input) return;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.form ? input.form.requestSubmit() : null;
  };
  rec.onerror = () => showToast(t('voice_fail'), 'warn');
  rec.onend = () => btn?.classList.remove('listening');
  try { rec.start(); } catch { btn?.classList.remove('listening'); }
}
window.voiceButtonHtml = voiceButtonHtml;
window.startVoice = startVoice;

/* Строка поиска: ведёт на рынок с ?q= */
function searchFormHtml(id, extraClass = '') {
  return `<form class="search-form ${extraClass}" role="search" onsubmit="event.preventDefault(); router.go('/market?q=' + encodeURIComponent(document.getElementById('${id}').value.trim()))">
    <i class="fa-solid fa-magnifying-glass sf-ic"></i>
    <input type="search" id="${id}" placeholder="${t('search_ph')}" enterkeyhint="search" autocomplete="off" />
    ${voiceButtonHtml(id)}
    <button type="submit" class="sf-go">${t('search_btn')}</button>
  </form>`;
}
window.searchFormHtml = searchFormHtml;

/* Обновить все счётчики корзины на странице без перерисовки */
function refreshCartBadges() {
  const n = getCartCount();
  document.querySelectorAll('[data-cart-badge]').forEach(el => {
    el.textContent = n;
    el.hidden = n === 0;
  });
}
window.refreshCartBadges = refreshCartBadges;

/* Сколько новых заказов ждут ответа продавца — бейдж у «Заказы».
   Запрашиваем не чаще раза в 30 секунд. */
let _ordersBadgeAt = 0;
async function refreshOrdersBadge(force) {
  if (!Auth.canBuy() || typeof API === 'undefined') return;
  if (!force && Date.now() - _ordersBadgeAt < 30000) return applyOrdersBadge();
  _ordersBadgeAt = Date.now();
  try {
    const list = await API.getMyOrders();
    const open = ['created', 'paid', 'ready_for_pickup', 'ready'];
    window._ordersNew = (list || []).filter(o => o.my_role === 'seller' && open.includes(o.status)).length;
  } catch { /* бейдж не главное */ }
  applyOrdersBadge();
}
function applyOrdersBadge() {
  const n = window._ordersNew || 0;
  document.querySelectorAll('[data-orders-badge]').forEach(el => { el.textContent = n; el.hidden = n === 0; });
}
window.refreshOrdersBadge = refreshOrdersBadge;

/* Нижняя панель на телефоне — по роли */
function bottomTabs() {
  if (Auth.isAdmin()) return [
    { path: '/admin', icon: 'fa-solid fa-gear', key: 'nav_admin' },
    { path: '/market', icon: 'fa-solid fa-store', key: 'nav_market' },
    { path: '/chats', icon: 'fa-solid fa-comment-dots', key: 'nav_chats' },
  ];
  if (Auth.getRole() === 'courier') return [
    { path: '/yulchi', icon: 'fa-solid fa-truck', key: 'nav_yulchi' },
    { path: '/chats', icon: 'fa-solid fa-comment-dots', key: 'nav_chats' },
    { path: '/profile', icon: 'fa-solid fa-user', key: 'nav_profile' },
  ];
  return [
    { path: '/home', icon: 'fa-solid fa-house', key: 'tab_home' },
    { path: '/market', icon: 'fa-solid fa-store', key: 'nav_market' },
    ...(Auth.isFarmer() ? [{ path: '/product/new', icon: 'fa-solid fa-plus', key: 'nav_sell', main: true }] : []),
    { path: '/cart', icon: 'fa-solid fa-basket-shopping', key: 'nav_cart', cart: true },
    { path: '/orders', icon: 'fa-solid fa-box', key: 'tab_orders', orders: true },
  ];
}

/* Главный layout: боковое меню (ПК), верхняя панель, нижняя панель (телефон) */
function buildHeader() {
  const user = Auth.getUser();
  const path = currentPath();
  const items = getNavItems();
  const cartCount = getCartCount();
  const chatsUnread = window._globalChatsUnread || 0;
  const ordersNew = window._ordersNew || 0;
  const isFarmer = Auth.isFarmer();
  const showCart = Auth.canBuy();
  const cur = (window.I18nManager && I18nManager.current) || 'uz';

  const links = items.map(it => {
    const active = path === it.path || (it.path === '/market' && path.startsWith('/product') && path !== '/product/new');
    let badge = '';
    if (it.path === '/chats' && chatsUnread > 0) badge = `<span class="nav-badge">${chatsUnread}</span>`;
    if (it.path === '/orders') badge = `<span class="nav-badge" data-orders-badge ${ordersNew ? '' : 'hidden'}>${ordersNew}</span>`;
    if (it.path === '/cart') badge = `<span class="nav-badge" data-cart-badge ${cartCount ? '' : 'hidden'}>${cartCount}</span>`;
    const hint = NAV_HINTS[it.path] ? `<span class="nav-hint">${t(NAV_HINTS[it.path])}</span>` : '';
    return `<a class="nav-item-link ${active ? 'active' : ''}" onclick="router.go('${it.path}')" ${active ? 'aria-current="page"' : ''}>
      <span class="nav-ic">${it.icon}</span>
      <span class="nav-txt-wrap"><span class="nav-tx">${t(it.key)}</span>${hint}</span>${badge}
    </a>`;
  }).join('');

  const userInitial = escHtml((user?.name || user?.phone || 'A')[0].toUpperCase());

  const tabs = bottomTabs().map(tb => {
    const active = path === tb.path || (tb.path === '/market' && path.startsWith('/product/') && path !== '/product/new');
    return `<a class="mbb-item ${tb.main ? 'mbb-main' : ''} ${active ? 'active' : ''}" onclick="router.go('${tb.path}')" ${active ? 'aria-current="page"' : ''}>
      <span class="mbb-ic"><i class="${tb.icon}"></i>${tb.cart ? `<span class="mbb-badge" data-cart-badge ${cartCount ? '' : 'hidden'}>${cartCount}</span>` : ''}${tb.orders ? `<span class="mbb-badge" data-orders-badge ${ordersNew ? '' : 'hidden'}>${ordersNew}</span>` : ''}</span>
      <span class="mbb-tx">${t(tb.key)}</span>
    </a>`;
  }).join('');

  return `
    <aside class="sidebar-green">
      <div class="sidebar-brand" onclick="router.go('/home')">
        <div class="sb-logo-icon"><i class="fa-solid fa-seedling"></i></div>
        <div class="sb-logo-text">
          <div class="sb-logo-title">AgroVerse</div>
          <div class="sb-logo-sub">${roleLabel()}</div>
        </div>
      </div>

      <nav class="sidebar-nav">${links}</nav>

      <div class="sidebar-user" onclick="router.go('/profile')">
        <div class="su-avatar">${userInitial}</div>
        <div class="su-info">
          <div class="su-name">${escHtml(user?.name || user?.phone || '')}</div>
          <div class="su-role">${t('hint_profile')}</div>
        </div>
      </div>
      <button class="sb-logout" onclick="Auth.logout()">
        <i class="fa-solid fa-arrow-right-from-bracket"></i> ${t('logout')}
      </button>
    </aside>

    <header class="top-header-bar">
      <div class="tb-brand" onclick="router.go('/home')">
        <span class="sb-logo-icon"><i class="fa-solid fa-seedling"></i></span>
        <span class="tb-brand-tx">AgroVerse</span>
      </div>
      <div class="top-header-left">${searchFormHtml('topSearch', 'top-search')}</div>
      <div class="top-header-right">
        <button class="tb-btn" onclick="openLangSheet()" aria-label="${t('choose_lang')}">
          <i class="fa-solid fa-globe"></i><span>${cur.toUpperCase()}</span>
        </button>
        <button class="tb-btn tb-size" onclick="openSizeSheet()" aria-label="${t('choose_size')}">
          <span class="tb-aa">A<small>A</small></span>
        </button>
        ${showCart ? `<button class="cart-header-btn" onclick="router.go('/cart')">
          <i class="fa-solid fa-basket-shopping"></i><span class="chb-tx">${t('nav_cart')}</span>
          <span class="cart-header-badge" data-cart-badge ${cartCount ? '' : 'hidden'}>${cartCount}</span>
        </button>` : ''}
      </div>
    </header>

    <nav class="mobile-bottom-bar ${isFarmer ? 'six' : ''}" aria-label="${t('menu')}">
      ${tabs}
      <a class="mbb-item" onclick="openMenuSheet()">
        <span class="mbb-ic"><i class="fa-solid fa-bars"></i>${chatsUnread ? `<span class="mbb-badge">${chatsUnread}</span>` : ''}</span>
        <span class="mbb-tx">${t('menu')}</span>
      </a>
    </nav>
  `;
}

/* ── Футер. Соцсети: Telegram и Instagram ── */
const SOCIAL = {
  telegram: 'https://t.me/agroverseai',
  instagram: 'https://instagram.com/agroverse_uz',
};

function footerHtml() {
  const link = (path, key) => `<a onclick="router.go('${path}')">${t(key)}</a>`;
  return `
    <footer class="site-footer">
      <div class="sf-grid">
        <div class="sf-brand">
          <div class="sf-logo"><span class="sb-logo-icon"><i class="fa-solid fa-seedling"></i></span> AgroVerse</div>
          <p>${t('ft_about')}</p>
          <a class="sf-contact" href="${SOCIAL.telegram}" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i> @agroverseai</a>
          <a class="sf-contact" href="${SOCIAL.instagram}" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i> @agroverse_uz</a>
        </div>
        <nav class="sf-col" aria-label="${t('ft_platform')}">
          <h3>${t('ft_platform')}</h3>
          ${link('/market', 'nav_market')}
          ${Auth.isFarmer() ? link('/product/new', 'ft_sell') : ''}
          ${link('/orders', 'nav_orders')}
          ${link('/cart', 'nav_cart')}
          ${Auth.isFarmer() ? link('/tariffs', 'nav_tariffs') : ''}
        </nav>
        <nav class="sf-col" aria-label="${t('ft_help')}">
          <h3>${t('ft_help')}</h3>
          ${link('/ai', 'nav_ai')}
          ${link('/home', 'ft_how_buy')}
          <a href="${SOCIAL.telegram}" target="_blank" rel="noopener">${t('ft_write_tg')}</a>
        </nav>
        <div class="sf-col">
          <h3>${t('ft_social')}</h3>
          <div class="sf-social">
            <a href="${SOCIAL.telegram}" target="_blank" rel="noopener" aria-label="Telegram"><i class="fa-brands fa-telegram"></i></a>
            <a href="${SOCIAL.instagram}" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a>
          </div>
        </div>
      </div>
      <div class="sf-word" aria-hidden="true">Agro<span>Verse</span></div>
      <div class="sf-copy">© ${new Date().getFullYear()} AgroVerse. ${t('ft_rights')}</div>
    </footer>`;
}
window.footerHtml = footerHtml;

/* Обёртка страницы: sidebar + header + контейнер (+ футер, кроме чатов) */
function pageShell(contentHtml, opts = {}) {
  closeSheet();
  const path = currentPath();
  const noFooter = opts.noFooter || path.startsWith('/chats') || path === '/ai';
  return `
    <div class="app-layout">
      ${buildHeader()}
      <main class="app-main-content ${opts.wide ? 'wide' : ''}">
        <div class="main-zoom">${contentHtml}${noFooter ? '' : footerHtml()}</div>
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