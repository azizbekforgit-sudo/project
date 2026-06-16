// Auto-detect: локально = localhost:8000, в проде = Railway бэк
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
// FIX: обновлён актуальный URL Railway бэкенда
const BASE_URL = IS_LOCAL
  ? `http://localhost:8000`
  : 'https://graceful-harmony-production-6336.up.railway.app';


function getToken() {
  return localStorage.getItem('access_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(method, path, { body, formData, params } = {}) {
  let url = BASE_URL + path;

  if (params) {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    ).toString();
    if (qs) url += '?' + qs;
  }

  const headers = { ...authHeaders() };
  let fetchBody;

  if (formData) {
    fetchBody = formData;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    fetchBody = JSON.stringify(body);
  }

  try {
    const res = await fetch(url, { method, headers, body: fetchBody });

    if (res.status === 401) {
      const isAuthEndpoint = path.includes('/api/auth/login') || path.includes('/api/auth/register');
      if (!isAuthEndpoint) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('av_user');
        window.router && window.router.go('/login');
        throw new Error(t('err_session'));
      }
      const errData = res.headers.get('content-type')?.includes('application/json')
        ? await res.json()
        : await res.text();
      const msg = typeof errData === 'object' && errData.detail
        ? errData.detail
        : t('bad_credentials');
      throw new Error(msg);
    }

    const data = res.headers.get('content-type')?.includes('application/json')
      ? await res.json()
      : await res.text();

    if (res.status === 403 && data && typeof data === 'object'
        && data.detail && typeof data.detail === 'object' && data.detail.blocked) {
      const reason = data.detail.reason || t('blocked_reason_default');
      localStorage.removeItem('access_token');
      localStorage.removeItem('av_user');
      if (typeof window.showBlockedScreen === 'function') window.showBlockedScreen(reason);
      throw new Error('BLOCKED');
    }

    if (!res.ok) {
      const msg = typeof data === 'object' && data.detail
        ? (Array.isArray(data.detail)
            ? (data.detail[0]?.msg || t('err_generic'))
            : (typeof data.detail === 'object'
                ? (data.detail.reason || t('err_generic'))
                : data.detail))
        : (data.message || t('err_generic'));
      throw new Error(msg);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(t('err_no_connection'));
    }
    throw error;
  }
}

function normalizeProduct(p) {
  if (!p) return p;
  return {
    id: p.id,
    fermer_id: p.fermer_id,
    fermer_name: p.fermer_name,
    name: p.title,
    description: p.description,
    category: p.category,
    price: p.price_per_unit,
    unit: p.unit,
    quantity: p.quantity_available,
    images: Array.isArray(p.photos) ? p.photos.map(u => u.startsWith('http') ? u : BASE_URL + u) : [],
    rating: p.rating || 0,
    status: p.status,
    created_at: p.created_at,
  };
}

const API = {
  // Auth
  login:         (body) => request('POST', '/api/auth/login', { body }),
  register:      (body) => request('POST', '/api/auth/register', { body }),
  getMe:         ()     => request('GET', '/api/auth/me'),
  updateProfile: (body) => request('PATCH', '/api/auth/me', { body }),

  // Products
  async getProducts(params) {
    const res = await request('GET', '/api/products/', { params });
    const list = Array.isArray(res) ? res : (res?.products || []);
    return list.map(normalizeProduct);
  },
  async getProduct(id) {
    const res = await request('GET', `/api/products/${id}`);
    return normalizeProduct(res);
  },
  createProduct: (data) => {
    if (data instanceof FormData) return request('POST', '/api/products/', { formData: data });
    return request('POST', '/api/products/', { body: data });
  },
  deleteProduct: (id)       => request('DELETE', `/api/products/${id}`),

  // Orders
  getMyOrders:   () => request('GET', '/api/orders/my'),
  createOrder:   (body) => request('POST', '/api/orders/', { body }),
  cancelOrder:   (id) => request('PATCH', `/api/orders/${id}/cancel`),
  completeOrder: (id) => request('PATCH', `/api/orders/${id}/complete`),
  markReady:     (id) => request('PATCH', `/api/orders/${id}/ready`),

  // Wallet
  getWallet:     () => request('GET', '/api/payment/wallet'),

  // Admin
  adminGetUsers:        (params) => request('GET', '/api/admin/users', { params }),
  adminBlockUser:       (id, reason) => request('PATCH', `/api/admin/users/${id}/block`, { body: { reason: reason || '' } }),
  adminUnblockUser:     (id) => request('PATCH', `/api/admin/users/${id}/unblock`),
  adminPendingProducts: () => request('GET', '/api/admin/products/pending'),
  adminApproveProduct:  (id) => request('PATCH', `/api/admin/products/${id}/approve`),
  adminRejectProduct:   (id) => request('PATCH', `/api/admin/products/${id}/reject`),
  adminOrdersReport:    () => request('GET', '/api/admin/reports/orders'),
  adminRevenueReport:   () => request('GET', '/api/admin/reports/revenue'),

  // Delivery
  setupCourierProfile: (body) => request('POST', '/api/courier/profile/setup', { body }),
  getCourierProfile:   ()     => request('GET', '/api/courier/profile'),
  updateCourierStatus: (body) => request('PUT', '/api/courier/status', { body }),
  getAvailableOrders:  ()     => request('GET', '/api/delivery/available-orders'),
  getCourierOrders:    ()     => request('GET', '/api/courier/orders'),
  acceptDeliveryOrder: (id)   => request('POST', `/api/delivery/orders/${id}/accept`),
  updateDeliveryStatus: (id, status) => request('PUT', `/api/delivery/orders/${id}/status`, { body: { status } }),
  getCourierWallet:    ()     => request('GET', '/api/courier/wallet'),
  withdrawCourierWallet: (body) => request('POST', '/api/courier/wallet/withdraw', { body }),
  courierAiChat:       (message) => request('POST', '/api/courier/ai/chat', { body: { message } }),

  // Admin - Couriers
  adminGetPendingCouriers: () => request('GET', '/api/admin/couriers/pending'),
  adminApproveCourier:     (id) => request('POST', `/api/admin/couriers/${id}/approve`),
  adminRejectCourier:      (id, reason) => request('POST', `/api/admin/couriers/${id}/reject`, { body: { reason: reason || '' } }),
};

API.request = request;

window.API = API;
window.normalizeProduct = normalizeProduct;
