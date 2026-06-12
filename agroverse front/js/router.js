const ROUTES = {
  '/login':       { render: renderLogin,    public: true },
  '/register':    { render: renderRegister, public: true },

  '/home':        { render: renderHome,    auth: true },
  '/market':      { render: renderCatalog, auth: true },
  '/ai':          { render: renderAI,      auth: true },
  '/profile':     { render: renderProfile, auth: true },
  '/wallet':      { render: renderWallet,  auth: true },
  '/tariffs':     { render: renderTariffs, auth: true },

  '/product/new': { render: renderProductNew, role: 'fermer' },
  '/orders':      { render: renderOrders,     role: 'xaridor' },
  '/cart':        { render: renderCart,       role: 'xaridor' },
  '/admin':       { render: renderAdmin,      role: 'admin' },

  // Доставка
  '/delivery':    { render: renderDelivery,         auth: true },
  '/yulchi':      { render: renderCourierDashboard, auth: true },
};

function getPath() {
  const hash = window.location.hash || '#/home';
  return hash.replace(/^#/, '').split('?')[0] || '/home';
}

function navigate(path) {
  window.location.hash = path;
}

function dispatch() {
  const path = getPath();

  // Динамический роут Йўлчи /yulchi/:id
  const yulchiMatch = path.match(/^\/yulchi\/([^/]+)$/);
  if (yulchiMatch) {
    if (!Auth.isLoggedIn()) { navigate('/login'); return; }
    if (typeof renderYulchiProfile === 'function') renderYulchiProfile(yulchiMatch[1]);
    afterRender();
    return;
  }

    // Динамический роут товара /product/:id (кроме /product/new)
  const productMatch = path.match(/^\/product\/([^/]+)$/);
  if (productMatch && productMatch[1] !== 'new') {
    if (!Auth.isLoggedIn()) { navigate('/login'); return; }
    renderProduct(productMatch[1]);
    afterRender();
    return;
  }

  const route = ROUTES[path];

  if (!route) {
    navigate(Auth.isLoggedIn() ? '/home' : '/login');
    return;
  }

  // публичные страницы — если уже залогинен, кидаем на главную (или курьер → /courier)
  if (route.public && Auth.isLoggedIn()) {
    navigate(Auth.getRole() === 'courier' ? '/yulchi' : '/home');
    return;
  }

  // курьер всегда попадает на /courier при попытке зайти на /home или /
  if (Auth.getRole() === 'courier' && (path === '/home' || path === '/')) {
    navigate('/yulchi');
    return;
  }

  // защищённые — требуют логина
  if (!route.public && !Auth.isLoggedIn()) {
    navigate('/login');
    return;
  }

  // админа держим в его зоне (главная для админа — /admin)
  if (Auth.isAdmin && Auth.isAdmin()) {
    const adminAllowed = ['/admin', '/market', '/tariffs'];
    if (!adminAllowed.includes(path) && !path.startsWith('/product/')) {
      navigate('/admin');
      return;
    }
  }

  // роль-зависимые
  if (route.role) {
    const user = Auth.getUser();
    if (!user || user.role !== route.role) {
      showToast(t('err_role_access'), 'warn');
      navigate('/home');
      return;
    }
  }

  route.render();
  afterRender();
}

function afterRender() {
  window.scrollTo(0, 0);
  const msg = popPendingMessage();
  if (msg) setTimeout(() => showToast(msg), 100);
  // следим за блокировкой аккаунта в фоне
  if (Auth.isLoggedIn() && typeof startBlockHeartbeat === 'function') startBlockHeartbeat();
  // floating AI bubble (init on every page for non-admin users)
  setTimeout(() => { if (typeof initAIBubble === 'function') initAIBubble(); }, 300);
}

window.router = { go: navigate, reload: dispatch };
window.addEventListener('hashchange', dispatch);
dispatch();
