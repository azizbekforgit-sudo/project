// Auto-detect: локально = localhost:8000, в проде = Railway бэк
const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const BASE_URL = IS_LOCAL
  ? 'http://localhost:8000'
  : 'https://project-production-5501.up.railway.app';


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
    delivery_available: p.delivery_available || false,
    created_at: p.created_at,
  };
}

const API = {
  // Auth
  login:         (body) => request('POST', '/api/auth/login', { body }),
  register:      (body) => request('POST', '/api/auth/register', { body }),
  getMe:         ()     => request('GET', '/api/auth/me'),
  updateProfile: (body) => request('PATCH', '/api/auth/me', { body }),
  changePassword: (body) => request('POST', '/api/auth/change-password', { body }),

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
  async getMyProducts() {
    const res = await request('GET', '/api/my/products');
    const list = Array.isArray(res) ? res : (res?.products || []);
    return { products: list.map(normalizeProduct) };
  },
  createProduct: (data) => {
    if (data instanceof FormData) return request('POST', '/api/products/', { formData: data });
    return request('POST', '/api/products/', { body: data });
  },
  updateProduct: (id, body) => request('PUT', `/api/products/${id}`, { body }),
  deleteProduct: (id)       => request('DELETE', `/api/products/${id}`),

  // Orders
  getMyOrders:   () => request('GET', '/api/orders/my'),
  createOrder:   (body) => request('POST', '/api/orders/', { body }),
  cancelOrder:   (id) => request('PATCH', `/api/orders/${id}/cancel`),
  completeOrder: (id) => request('PATCH', `/api/orders/${id}/complete`),
  markReady:     (id) => request('PATCH', `/api/orders/${id}/ready`),
  payOrder:      (id) => request('PATCH', `/api/orders/${id}/pay`),

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

  // Payment
  depositWallet: (amount) => request('POST', '/api/payment/deposit', { body: { amount } }),

  // Admin-assisted top-up
  getTopupCard: () => request('GET', '/api/payment/topup/card'),
  createTopupRequest: (body) => request('POST', '/api/payment/topup/request', { body }),
  uploadTopupReceipt: async (requestId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${BASE_URL}/api/payment/topup/${requestId}/upload-receipt`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Ошибка загрузки');
    }
    return res.json();
  },
  getMyTopupRequests: () => request('GET', '/api/payment/topup/my'),
  adminPendingTopups: () => request('GET', '/api/payment/admin/topup/pending'),
  adminApproveTopup: (id) => request('PATCH', `/api/payment/admin/topup/${id}/approve`),
  adminRejectTopup: (id, comment) => request('PATCH', `/api/payment/admin/topup/${id}/reject`, { body: { comment } }),

  // Courier profile
  getCourierProfile:   ()     => request('GET', '/api/courier/profile'),
  setupCourierProfile: (body) => request('POST', '/api/courier/profile/setup', { body }),

  // Courier search
  findNearbyCouriers:  (params) => request('GET', '/api/delivery/couriers/nearby', { params }),
  searchCouriersZone:  (params) => request('GET', '/api/delivery/couriers/nearby', { params }),
  getPublicCourierProfile: (userId) => request('GET', `/api/courier/public/${userId}`),
  getCourierPublicProfile: (userId) => request('GET', `/api/courier/public/${userId}`),

  // Admin — Courier management
  adminGetPendingCouriers: ()        => request('GET', '/api/admin/couriers/pending'),
  adminApproveCourier:     (id, rating) => request('PATCH', `/api/admin/couriers/${id}/approve`, { body: { rating: rating || 0 } }),
  adminRejectCourier:      (id, reason) => request('PATCH', `/api/admin/couriers/${id}/reject`, { body: { reason: reason || '' } }),
  adminGetAllCouriers:     ()        => request('GET', '/api/admin/couriers'),

  // Delivery requests (new)
  getCouriersByRoute: (from, to) => request('GET', '/api/delivery/couriers/by-route', { params: { from, to } }),
  calculateRoute: (from, to, courier_user_id) => request('GET', '/api/delivery/calculate-route', { params: { from, to, courier_user_id } }),
  createDeliveryRequest: (body) => request('POST', '/api/delivery/request', { body }),
  buyerConfirmDelivery: (id) => request('PATCH', `/api/delivery/request/${id}/buyer-confirm`),
  driverAcceptDelivery: (id) => request('PATCH', `/api/delivery/request/${id}/driver-accept`),
  driverRejectDelivery: (id) => request('PATCH', `/api/delivery/request/${id}/driver-reject`),
  buyerCancelDelivery: (id) => request('PATCH', `/api/delivery/request/${id}/buyer-cancel`),
  getMyDeliveryRequests: () => request('GET', '/api/delivery/request/my'),
  getBuyerDeliveryRequests: () => request('GET', '/api/delivery/request/buyer'),
  updateDeliveryRequestStatus: (id, status) => request('PATCH', `/api/delivery/request/${id}/status`, { body: { status } }),
  rateDeliveryRequest: (id, rating, comment) => request('PATCH', `/api/delivery/request/${id}/rate`, { body: { rating, comment } }),
  getCompletedDeliveries: () => request('GET', '/api/delivery/request/completed'),
  getCourierCompletedDeliveries: (userId) => request('GET', `/api/delivery/couriers/${userId}/completed`),

  // Chats
  getChats: () => request('GET', '/api/chats'),
  getChat: (chatId) => request('GET', `/api/chats/${chatId}`),
  createChat: (body) => request('POST', '/api/chats', { body }),
  getChatMessages: (chatId, params) => request('GET', `/api/chats/${chatId}/messages`, { params }),
  sendMessage: (chatId, body) => request('POST', `/api/chats/${chatId}/messages`, { body }),
  uploadChatFile: async (chatId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${BASE_URL}/api/chats/${chatId}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Ошибка загрузки файла');
    return res.json();
  },

  // Driver candidate
  selectDriverCandidate: (orderId, body) => request('POST', `/api/orders/${orderId}/select-driver-candidate`, { body }),
  assignDriver: (orderId) => request('POST', `/api/orders/${orderId}/assign-driver`),
};

API.request = request;

window.API = API;
window.BASE_URL = BASE_URL;
window.normalizeProduct = normalizeProduct;

/* ═══════════════════════════════════════════════════════════════════════════
   WebSocket — реалтайм-доставка сообщений
   ═══════════════════════════════════════════════════════════════════════════ */

const ChatWS = {
  socket: null,
  _handlers: {},
  _reconnectTimer: null,
  _reconnectDelay: 2000,

  connect() {
    if (!Auth.isLoggedIn()) return;
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    const token = Auth.getToken();
    if (!token) return;

    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${location.host}/ws?token=${token}`;

    try {
      this.socket = new WebSocket(wsUrl);
    } catch (e) {
      console.error('WS connect error:', e);
      this._scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      console.log('[WS] Connected');
      this._reconnectDelay = 2000;
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Отвечаем на ping от сервера
        if (data.type === 'ping') {
          this.socket.send('pong');
          return;
        }
        this._dispatch(data);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('[WS] Disconnected');
      this._scheduleReconnect();
    };

    this.socket.onerror = (e) => {
      console.error('[WS] Error:', e);
    };
  },

  disconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  },

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
    }, this._reconnectDelay);
    // Увеличиваем задержку при реконнекте (экспоненциально, до 30 сек)
    this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, 30000);
  },

  on(type, handler) {
    if (!this._handlers[type]) this._handlers[type] = [];
    this._handlers[type].push(handler);
  },

  off(type, handler) {
    if (!this._handlers[type]) return;
    this._handlers[type] = this._handlers[type].filter(h => h !== handler);
  },

  _dispatch(data) {
    const handlers = this._handlers[data.type] || [];
    handlers.forEach(h => {
      try { h(data); } catch (e) { console.error('[WS] Handler error:', e); }
    });
    // Глобальный обработчик
    const allHandlers = this._handlers['*'] || [];
    allHandlers.forEach(h => {
      try { h(data); } catch (e) { console.error('[WS] Global handler error:', e); }
    });
  }
};

window.ChatWS = ChatWS;