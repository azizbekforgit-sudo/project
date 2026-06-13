/* pages/admin.js — Админ-панель: статистика, пользователи, модерация, Йўлчи заявки */

async function renderAdmin() {
  const app = document.getElementById('app');

  if (!Auth.isAdmin || !Auth.isAdmin()) {
    router.go('/login');
    return;
  }

  app.innerHTML = pageShell(`
    <div class="admin-page">
      <div class="page-head"><h1>📊 ${t('admin_title')}</h1></div>

      <div class="admin-stats" id="admin-stats">
        <div class="stat-card"><div class="stat-ic">👥</div><div class="stat-num" id="st-users">—</div><div class="stat-lbl">${t('stat_users')}</div></div>
        <div class="stat-card"><div class="stat-ic">📦</div><div class="stat-num" id="st-products">—</div><div class="stat-lbl">${t('stat_products')}</div></div>
        <div class="stat-card"><div class="stat-ic">🧾</div><div class="stat-num" id="st-orders">—</div><div class="stat-lbl">${t('stat_orders')}</div></div>
        <div class="stat-card"><div class="stat-ic">🚛</div><div class="stat-num" id="st-couriers">—</div><div class="stat-lbl">Йўлчи заявки</div></div>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="moderation" onclick="adminSwitchTab('moderation')">🛂 ${t('admin_moderation')}</button>
        <button class="admin-tab" data-tab="couriers" onclick="adminSwitchTab('couriers')">🚛 Йўлчи заявки</button>
        <button class="admin-tab" data-tab="users" onclick="adminSwitchTab('users')">👥 ${t('admin_users')}</button>
        <button class="admin-tab" data-tab="reports" onclick="adminSwitchTab('reports')">📈 ${t('admin_reports')}</button>
      </div>

      <div id="admin-content"><div class="spinner"></div></div>
    </div>
  `);

  loadAdminStats();
  adminSwitchTab('moderation');
}

async function loadAdminStats() {
  try {
    const [usersRes, pendingRes, ordersRes, prodsRes, couriersRes] = await Promise.all([
      API.adminGetUsers({}).catch(() => null),
      API.adminPendingProducts().catch(() => null),
      API.adminOrdersReport().catch(() => null),
      API.getProducts({}).catch(() => []),
      _adminGetPendingCouriers().catch(() => []),
    ]);

    const elU = document.getElementById('st-users');
    const elP = document.getElementById('st-products');
    const elO = document.getElementById('st-orders');
    const elC = document.getElementById('st-couriers');

    if (elU) {
      const users = usersRes?.users ?? (Array.isArray(usersRes) ? usersRes : []);
      elU.textContent = users.length;
    }
    if (elP) {
      const prods = Array.isArray(prodsRes) ? prodsRes : [];
      elP.textContent = prods.length;
    }
    if (elO) {
      const cnt = ordersRes?.total ?? ordersRes?.total_orders ?? ordersRes?.count
        ?? (Array.isArray(ordersRes?.orders) ? ordersRes.orders.length : 0);
      elO.textContent = cnt;
    }
    if (elC) {
      elC.textContent = Array.isArray(couriersRes) ? couriersRes.length : 0;
    }
  } catch (e) { /* тихо */ }
}

async function adminSwitchTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const box = document.getElementById('admin-content');
  box.innerHTML = '<div class="spinner"></div>';

  if (tab === 'moderation') {
    try {
      const res = await API.adminPendingProducts();
      const pending = res?.products ?? (Array.isArray(res) ? res : []);
      if (!pending || pending.length === 0) {
        box.innerHTML = `<div class="empty-state">✅ ${t('no_pending')}</div>`;
        return;
      }
      box.innerHTML = `
        <h3 style="margin-bottom:16px;">${t('pending_products')}</h3>
        <div class="admin-list">
          ${pending.map(p => `
            <div class="admin-row" id="prow-${p.id}">
              <div class="ar-main">
                <div class="ar-title">${p.title}</div>
                <div class="ar-sub">${p.category || ''} · ${p.price_per_unit ?? p.price ?? 0} ${t('currency')} · 🌱 ${p.fermer_name || ''}</div>
              </div>
              <div class="ar-actions">
                <button class="btn-sm btn-approve" onclick="adminApprove(${p.id})">✓ ${t('approve')}</button>
                <button class="btn-sm btn-reject" onclick="adminReject(${p.id})">✕ ${t('reject')}</button>
              </div>
            </div>
          `).join('')}
        </div>`;
    } catch (e) {
      box.innerHTML = `<div class="empty-state">${e.message}</div>`;
    }

  } else if (tab === 'couriers') {
    // ── Йўлчи заявки ──────────────────────────────────────────────────────────
    try {
      const couriers = await _adminGetPendingCouriers();
      if (!couriers || couriers.length === 0) {
        box.innerHTML = `
          <div class="empty-state">
            ✅ Нет ожидающих заявок от курьеров
          </div>`;
        return;
      }
      box.innerHTML = `
        <h3 style="margin-bottom:16px;">🚛 Заявки Йўлчи (${couriers.length})</h3>
        <div class="admin-list">
          ${couriers.map(c => {
            const truckLabel = {
              fura:      'Фура',
              refrig:    'Рефрижератор',
              tentovan:  'Тентованный',
              samosval:  'Самосвал',
              bortovoy:  'Бортовой',
              truck:     'Грузовик',
            }[c.transport_type] || c.transport_type || '—';

            return `
            <div class="admin-row" id="crow-${c.id}">
              <div class="ar-main">
                <div class="ar-title">🚛 ${c.full_name || 'Без имени'}</div>
                <div class="ar-sub">
                  📞 ${c.phone || '—'} &nbsp;·&nbsp;
                  🏙️ ${c.city || '—'} &nbsp;·&nbsp;
                  ${truckLabel} &nbsp;·&nbsp;
                  ⚖️ ${c.max_weight ? c.max_weight + ' кг' : '—'} &nbsp;·&nbsp;
                  ${c.experience_years ? c.experience_years + ' лет опыта' : 'Нет опыта'}
                </div>
                ${c.vehicle_number ? `<div class="ar-vehicle">🔢 ${c.vehicle_number}</div>` : ''}
                ${c.bio ? `<div class="ar-bio">📝 ${c.bio}</div>` : ''}
              </div>
              <div class="ar-actions">
                <button class="btn-sm btn-approve" onclick="adminApproveCourier(${c.id})">✓ Одобрить</button>
                <button class="btn-sm btn-reject"  onclick="adminRejectCourier(${c.id})">✕ Отклонить</button>
              </div>
            </div>`;
          }).join('')}
        </div>`;
    } catch (e) {
      box.innerHTML = `<div class="empty-state">${e.message}</div>`;
    }

  } else if (tab === 'users') {
    try {
      const res = await API.adminGetUsers({});
      const users = res?.users ?? (Array.isArray(res) ? res : []);
      if (!users.length) {
        box.innerHTML = `<div class="empty-state">${t('no_users') || 'Пользователей нет'}</div>`;
        return;
      }
      box.innerHTML = `
        <div class="admin-list">
          ${users.map(u => {
            const blocked = u.is_blocked === 'true' || u.is_blocked === true;
            return `
            <div class="admin-row ${blocked ? 'blocked' : ''}" id="urow-${u.id}">
              <div class="ar-main">
                <div class="ar-title">${roleIcon(u.role)} ${u.name} ${blocked ? `<span class="blocked-tag">⛔ ${t('blocked_tag')}</span>` : ''}</div>
                <div class="ar-sub">${u.phone} · ${u.role}</div>
                ${blocked && u.block_reason ? `<div class="ar-reason">📩 ${t('reason_word')}: ${u.block_reason}</div>` : ''}
              </div>
              <div class="ar-actions">
                ${u.role === 'admin' ? '' : (blocked
                  ? `<button class="btn-sm btn-approve" onclick="adminUnblock(${u.id})">✓ ${t('unblock')}</button>`
                  : `<button class="btn-sm btn-reject" onclick="adminBlock(${u.id})">⛔ ${t('block')}</button>`)}
              </div>
            </div>`
          }).join('')}
        </div>`;
    } catch (e) {
      box.innerHTML = `<div class="empty-state">${e.message}</div>`;
    }

  } else if (tab === 'reports') {
    try {
      const [ordersRes, revenueRes] = await Promise.all([
        API.adminOrdersReport().catch(() => null),
        API.adminRevenueReport().catch(() => null),
      ]);
      const totalRev = revenueRes?.total_revenue ?? revenueRes?.revenue ?? revenueRes?.total ?? 0;
      const ordCnt = ordersRes?.total ?? ordersRes?.total_orders ?? ordersRes?.count
        ?? (Array.isArray(ordersRes?.orders) ? ordersRes.orders.length : 0);
      const avg = ordCnt > 0 ? Math.round(totalRev / ordCnt) : 0;
      box.innerHTML = `
        <div class="admin-stats" style="margin-top:0;">
          <div class="stat-card"><div class="stat-ic">💰</div><div class="stat-num">${Number(totalRev).toLocaleString()} ${t('currency')}</div><div class="stat-lbl">${t('rep_revenue')}</div></div>
          <div class="stat-card"><div class="stat-ic">🧾</div><div class="stat-num">${ordCnt}</div><div class="stat-lbl">${t('rep_orders')}</div></div>
          <div class="stat-card"><div class="stat-ic">📊</div><div class="stat-num">${Number(avg).toLocaleString()} ${t('currency')}</div><div class="stat-lbl">${t('rep_avg')}</div></div>
        </div>`;
    } catch (e) {
      box.innerHTML = `<div class="empty-state">${t('rep_none')}</div>`;
    }
  }
}

function roleIcon(r) { return r === 'fermer' ? '🌱' : r === 'admin' ? '👑' : '🛍️'; }

// ─── Product moderation ────────────────────────────────────────────────────────

async function adminApprove(id) {
  try {
    await API.adminApproveProduct(id);
    document.getElementById('prow-' + id)?.remove();
    showToast(t('approve') + ' ✓', 'success');
    loadAdminStats();
  } catch (e) { showToast(e.message, 'error'); }
}

async function adminReject(id) {
  try {
    await API.adminRejectProduct(id);
    document.getElementById('prow-' + id)?.remove();
    showToast(t('reject') + ' ✓', 'success');
    loadAdminStats();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Courier approval ─────────────────────────────────────────────────────────

async function _adminGetPendingCouriers() {
  const token = localStorage.getItem('token');
  const base = (window.API && window.API._base)
    ? window.API._base
    : (window.location.hostname.includes('localhost')
        ? 'http://127.0.0.1:8000'
        : 'https://fearless-learning-production-00ca.up.railway.app');
  const res = await fetch(base + '/api/admin/couriers/pending', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

async function adminApproveCourier(id) {
  const token = localStorage.getItem('token');
  const base = (window.API && window.API._base)
    ? window.API._base
    : (window.location.hostname.includes('localhost')
        ? 'http://127.0.0.1:8000'
        : 'https://fearless-learning-production-00ca.up.railway.app');
  try {
    const res = await fetch(base + `/api/admin/couriers/${id}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || res.statusText);
    }
    document.getElementById(`crow-${id}`)?.remove();
    showToast(`Курьер #${id} одобрен ✅`, 'success');
    loadAdminStats();
  } catch (e) { showToast(e.message, 'error'); }
}

async function adminRejectCourier(id) {
  const token = localStorage.getItem('token');
  const base = (window.API && window.API._base)
    ? window.API._base
    : (window.location.hostname.includes('localhost')
        ? 'http://127.0.0.1:8000'
        : 'https://fearless-learning-production-00ca.up.railway.app');
  try {
    const res = await fetch(base + `/api/admin/couriers/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || res.statusText);
    }
    document.getElementById(`crow-${id}`)?.remove();
    showToast(`Курьер #${id} отклонён`, 'info');
    loadAdminStats();
  } catch (e) { showToast(e.message, 'error'); }
}

// ─── Extra styles for courier rows ────────────────────────────────────────────

(function _injectCourierAdminStyles() {
  if (document.getElementById('admin-courier-styles')) return;
  const style = document.createElement('style');
  style.id = 'admin-courier-styles';
  style.textContent = `
    .ar-vehicle { font-size: 12px; color: #475569; margin-top: 4px; }
    .ar-bio     { font-size: 12px; color: #64748b; margin-top: 3px; font-style: italic; }
  `;
  document.head.appendChild(style);
})();

// ─── User management ──────────────────────────────────────────────────────────

function adminBlock(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-ic">⛔</div>
      <h3 class="modal-title">${t('block_user_title')}</h3>
      <p class="modal-desc">${t('block_user_desc')}</p>
      <textarea id="block-reason" class="modal-textarea" placeholder="${t('block_user_ph')}"></textarea>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="block-cancel">${t('cancel')}</button>
        <button class="btn btn-danger" id="block-confirm">⛔ ${t('block_action')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#block-cancel').addEventListener('click', close);
  overlay.querySelector('#block-confirm').addEventListener('click', async () => {
    const reason = overlay.querySelector('#block-reason').value.trim();
    const btn = overlay.querySelector('#block-confirm');
    btn.disabled = true; btn.textContent = t('blocking');
    try {
      await API.adminBlockUser(id, reason);
      close();
      showToast(t('user_blocked_ok') + ' ⛔', 'success');
      adminSwitchTab('users');
    } catch (e) {
      btn.disabled = false; btn.textContent = '⛔ ' + t('block_action');
      showToast(e.message, 'error');
    }
  });
  setTimeout(() => overlay.querySelector('#block-reason')?.focus(), 50);
}

async function adminUnblock(id) {
  try {
    await API.adminUnblockUser(id);
    showToast(t('unblock') + ' ✓', 'success');
    adminSwitchTab('users');
  } catch (e) { showToast(e.message, 'error'); }
}

window.renderAdmin          = renderAdmin;
window.adminSwitchTab       = adminSwitchTab;
window.adminApprove         = adminApprove;
window.adminReject          = adminReject;
window.adminApproveCourier  = adminApproveCourier;
window.adminRejectCourier   = adminRejectCourier;
window.adminBlock           = adminBlock;
window.adminUnblock         = adminUnblock;
