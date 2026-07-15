/* pages/admin.js — Админ-панель: статистика, пользователи, модерация, Йўлчи заявки */

async function renderAdmin() {
  const app = document.getElementById('app');

  if (!Auth.isAdmin || !Auth.isAdmin()) {
    router.go('/login');
    return;
  }

  app.innerHTML = pageShell(`
    <div class="admin-page">
      <div class="page-head"><h1>${fe('📊',24)} ${t('admin_title')}</h1></div>

      <div class="admin-stats" id="admin-stats">
        <div class="stat-card"><div class="stat-ic"><i class="fi fi-sr-users" style="font-size:22px"></i></div><div class="stat-num" id="st-users">—</div><div class="stat-lbl">${t('stat_users')}</div></div>
        <div class="stat-card"><div class="stat-ic"><i class="fi fi-sr-box-open" style="font-size:22px"></i></div><div class="stat-num" id="st-products">—</div><div class="stat-lbl">${t('stat_products')}</div></div>
        <div class="stat-card"><div class="stat-ic"><i class="fi fi-sr-receipt" style="font-size:22px"></i></div><div class="stat-num" id="st-orders">—</div><div class="stat-lbl">${t('stat_orders')}</div></div>
        <div class="stat-card"><div class="stat-ic"><i class="fi fi-sr-truck-side" style="font-size:22px"></i></div><div class="stat-num" id="st-couriers">—</div><div class="stat-lbl">Йўлчи заявки</div></div>
      </div>

      <div class="admin-tabs">
        <button class="admin-tab active" data-tab="moderation" onclick="adminSwitchTab('moderation')"><i class="fi fi-sr-id" style="font-size:16px"></i> ${t('admin_moderation')}</button>
        <button class="admin-tab" data-tab="topups" onclick="adminSwitchTab('topups')"><i class="fi fi-sr-money-bill-wave" style="font-size:16px"></i> Пополнения</button>
        <button class="admin-tab" data-tab="couriers" onclick="adminSwitchTab('couriers')"><i class="fi fi-sr-truck-side" style="font-size:16px"></i> Йўлчи заявки</button>
        <button class="admin-tab" data-tab="users" onclick="adminSwitchTab('users')"><i class="fi fi-sr-users" style="font-size:16px"></i> ${t('admin_users')}</button>
        <button class="admin-tab" data-tab="chats" onclick="adminSwitchTab('chats')"><i class="fi fi-rr-comment" style="font-size:16px"></i> Чаты</button>
        <button class="admin-tab" data-tab="reports" onclick="adminSwitchTab('reports')"><i class="fi fi-sr-chart-mixed" style="font-size:16px"></i> ${t('admin_reports')}</button>
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
      API.adminGetPendingCouriers().catch(() => []),
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
        box.innerHTML = `<div class="empty-state">${fe('✅',40)} ${t('no_pending')}</div>`;
        return;
      }
      box.innerHTML = `
        <h3 style="margin-bottom:16px;">${t('pending_products')}</h3>
        <div class="admin-list">
          ${pending.map(p => `
            <div class="admin-row" id="prow-${p.id}">
              <div class="ar-main">
                <div class="ar-title">${p.title}</div>
                <div class="ar-sub">${p.category || ''} · ${p.price_per_unit ?? p.price ?? 0} ${t('currency')} · ${fe('🌱',14)} ${p.fermer_name || ''}</div>
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

  } else if (tab === 'topups') {
    // ── Пополнения кошелька ──────────────────────────────────────────────────
    try {
      const topups = await API.adminPendingTopups();
      if (!topups || topups.length === 0) {
        box.innerHTML = `
          <div class="empty-state">
            ${fe('✅',16)} Нет заявок на пополнение
          </div>`;
        return;
      }
      box.innerHTML = `
        <h3 style="margin-bottom:16px;">💰 Заявки на пополнение (${topups.length})</h3>
        <div class="admin-list">
          ${topups.map(t => `
            <div class="admin-row" id="topup-${t.id}" style="flex-direction:column;align-items:stretch;gap:12px">
              <div style="display:flex;justify-content:space-between;align-items:start">
                <div>
                  <div class="ar-title" style="font-size:18px;font-weight:700">${Number(t.amount).toLocaleString()} сум</div>
                  <div class="ar-sub">
                    👤 ${t.user_name} · 📱 ${t.user_phone} · 📧 ${t.user_email || '—'}<br>
                    🎭 Роль: ${t.user_role} · 📅 ${t.created_at ? new Date(t.created_at).toLocaleString('ru-RU') : ''}
                  </div>
                </div>
                <span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700">На проверке</span>
              </div>
              ${t.receipt_url ? `
                <div style="margin-top:8px">
                  <a href="${BASE_URL}${t.receipt_url}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;color:#059669;font-weight:600;font-size:13px;text-decoration:none">
                    📸 Открыть чек
                  </a>
                </div>
              ` : `<div style="color:#ef4444;font-size:13px">⚠️ Чек не загружен</div>`}
              <div style="display:flex;gap:8px">
                <button class="btn btn-primary btn-sm" onclick="adminApproveTopup(${t.id}, ${t.amount})">
                  ✓ Одобрить (${Number(t.amount).toLocaleString()} сум)
                </button>
                <button class="btn btn-ghost btn-sm" onclick="adminRejectTopup(${t.id})">
                  ✕ Отклонить
                </button>
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
      const couriers = await API.adminGetPendingCouriers();
      if (!couriers || couriers.length === 0) {
        box.innerHTML = `
          <div class="empty-state">
            ${fe('✅',16)} Нет ожидающих заявок от курьеров
          </div>`;
        return;
      }
      box.innerHTML = `
        <h3 style="margin-bottom:16px;">${fe('🚛',16)} Заявки Йўлчи (${couriers.length})</h3>
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

            const rating = c.rating || 0;
            const routeInfo = c.route_anywhere ? `${fe('🌍',14)} Любое место → любое место`
              : (c.route_from || c.route_to) ? `${c.route_from || '?'} → ${c.route_to || '?'}` : '';

            return `
            <div class="admin-row" id="crow-${c.id}">
              <div class="ar-main">
                <div class="ar-title">${fe('🚛',16)} ${c.full_name || 'Без имени'}</div>
                <div class="ar-sub">
                  ${fe('📞',14)} ${c.phone || '—'} &nbsp;·&nbsp;
                  ${fe('🏙️',14)} ${c.city || '—'} &nbsp;·&nbsp;
                  ${truckLabel} &nbsp;·&nbsp;
                  ${fe('⚖️',14)} ${c.max_weight ? c.max_weight + ' кг' : '—'} &nbsp;·&nbsp;
                  ${c.experience_years ? c.experience_years + ' лет опыта' : 'Нет опыта'}
                </div>
                ${routeInfo ? `<div class="ar-sub" style="margin-top:4px;">${fe('🗺️',14)} ${routeInfo}</div>` : ''}
                ${c.address ? `<div class="ar-sub" style="margin-top:2px;">${fe('📍',14)} ${c.address}</div>` : ''}
                ${c.vehicle_number ? `<div class="ar-vehicle">${fe('🔢',14)} Авто: ${c.vehicle_number}</div>` : ''}
                ${c.license_info ? `<div class="ar-license">${fe('🪪',14)} Права: ${c.license_info}</div>` : ''}
                ${c.bio ? `<div class="ar-bio">${fe('📝',14)} ${c.bio}</div>` : ''}
                <!-- Rating slider -->
                <div style="margin-top:12px;display:flex;align-items:center;gap:12px;">
                  <label style="font-size:13px;font-weight:600;color:var(--txt-2);white-space:nowrap;">Рейтинг:</label>
                  <input type="range" min="0" max="10" step="0.5" value="${rating}"
                         id="rating-${c.id}"
                         oninput="document.getElementById('rating-val-${c.id}').textContent = this.value"
                         style="flex:1;accent-color:var(--clr-primary);">
                  <span id="rating-val-${c.id}" style="font-weight:700;font-size:15px;min-width:32px;text-align:center;">${rating}</span>
                  <span style="font-size:12px;color:var(--txt-3);">/10</span>
                  <button class="btn-sm btn-approve" onclick="adminSetRating(${c.id})" style="font-size:12px;padding:6px 12px;">${fe('💾',14)}</button>
                </div>
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
                <div class="ar-title">${roleIcon(u.role)} ${u.name} ${blocked ? `<span class="blocked-tag">${fe('⛔',14)} ${t('blocked_tag')}</span>` : ''}</div>
                <div class="ar-sub">${u.phone} · ${u.role}</div>
                ${blocked && u.block_reason ? `<div class="ar-reason">${fe('📩',14)} ${t('reason_word')}: ${u.block_reason}</div>` : ''}
              </div>
              <div class="ar-actions">
                ${u.role === 'admin' ? '' : (blocked
                  ? `<button class="btn-sm btn-approve" onclick="adminUnblock(${u.id})">✓ ${t('unblock')}</button>`
                  : `<button class="btn-sm btn-reject" onclick="adminBlock(${u.id})">${fe('⛔',14)} ${t('block')}</button>`)}
              </div>
            </div>`
          }).join('')}
        </div>`;
    } catch (e) {
      box.innerHTML = `<div class="empty-state">${e.message}</div>`;
    }

  } else if (tab === 'chats') {
    // ── Чаты (админ) ──────────────────────────────────────────────────
    try {
      const chats = await API.request('GET', '/api/admin/chats');
      if (!chats || chats.length === 0) {
        box.innerHTML = `<div class="empty-state">💬 Нет чатов</div>`;
        return;
      }

      const typeLabels = { buyer_farmer: 'Покупатель ↔ Фермер', buyer_driver: 'Покупатель ↔ Драйвер', driver_farmer: 'Драйвер ↔ Фермер' };

      box.innerHTML = `
        <h3 style="margin-bottom:16px;">💬 Чаты (${chats.length})</h3>
        <div class="admin-list">
          ${chats.map(c => `
            <div class="admin-row" style="flex-direction:column;align-items:stretch;gap:8px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                  <div class="ar-title">${typeLabels[c.type] || c.type} · Заказ #${c.order_id}</div>
                  <div class="ar-sub">
                    ${c.participant_a.name} (${c.participant_a.role}) ↔ ${c.participant_b.name} (${c.participant_b.role})
                    ${c.order_product_title ? ' · ' + c.order_product_title : ''}
                  </div>
                  ${c.last_message ? `<div class="ar-sub" style="margin-top:4px;font-style:italic">💬 ${c.last_message.sender_name}: ${(c.last_message.content || '').substring(0, 60)}</div>` : ''}
                </div>
                <button class="btn-sm btn-approve" onclick="adminViewChat(${c.id})">👁️ Смотреть</button>
              </div>
            </div>
          `).join('')}
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
          <div class="stat-card"><div class="stat-ic"><i class="fi fi-sr-wallet" style="font-size:22px"></i></div><div class="stat-num">${Number(totalRev).toLocaleString()} ${t('currency')}</div><div class="stat-lbl">${t('rep_revenue')}</div></div>
          <div class="stat-card"><div class="stat-ic"><i class="fi fi-sr-receipt" style="font-size:22px"></i></div><div class="stat-num">${ordCnt}</div><div class="stat-lbl">${t('rep_orders')}</div></div>
          <div class="stat-card"><div class="stat-ic"><i class="fi fi-sr-chart-mixed" style="font-size:22px"></i></div><div class="stat-num">${Number(avg).toLocaleString()} ${t('currency')}</div><div class="stat-lbl">${t('rep_avg')}</div></div>
        </div>`;
    } catch (e) {
      box.innerHTML = `<div class="empty-state">${t('rep_none')}</div>`;
    }
  }
}

function roleIcon(r) { return r === 'fermer' ? '<i class="fi fi-sr-leaf" style="font-size:16px"></i>' : r === 'admin' ? '<i class="fi fi-sr-crown" style="font-size:16px"></i>' : '<i class="fi fi-sr-shopping-bag" style="font-size:16px"></i>'; }

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

async function adminApproveCourier(id) {
  try {
    const slider = document.getElementById(`rating-${id}`);
    const rating = slider ? parseFloat(slider.value) : 0;
    await API.adminApproveCourier(id, rating);
    document.getElementById(`crow-${id}`)?.remove();
    showToast(`Курьер одобрен, рейтинг: ${rating}/10 ${fe('✅',14)}`, 'success');
    loadAdminStats();
    adminSwitchTab('couriers');
  } catch (e) { showToast(e.message, 'error'); }
}

async function adminSetRating(id) {
  const slider = document.getElementById(`rating-${id}`);
  if (!slider) return;
  const rating = parseFloat(slider.value);
  try {
    await API.adminApproveCourier(id, rating);
    showToast(`Рейтинг установлен: ${rating}/10 ${fe('✅',14)}`, 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

async function adminRejectCourier(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-ic">✕</div>
      <h3 class="modal-title">Отклонить заявку</h3>
      <p class="modal-desc">Укажите причину отклонения, чтобы курьер мог её исправить.</p>
      <textarea id="reject-reason" class="modal-textarea" placeholder="Например: Нечёткое фото документов или неверный номер авто"></textarea>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="reject-cancel">Отмена</button>
        <button class="btn btn-danger" id="reject-confirm">✕ Отклонить</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#reject-cancel').addEventListener('click', close);
  overlay.querySelector('#reject-confirm').addEventListener('click', async () => {
    const reason = overlay.querySelector('#reject-reason').value.trim();
    if (!reason) { showToast('Укажите причину', 'warn'); return; }
    const btn = overlay.querySelector('#reject-confirm');
    btn.disabled = true; btn.textContent = 'Отклонение...';
    try {
      await API.adminRejectCourier(id, reason);
      close();
      showToast('Заявка отклонена', 'info');
      adminSwitchTab('couriers');
      loadAdminStats();
    } catch (e) {
      btn.disabled = false; btn.textContent = '✕ Отклонить';
      showToast(e.message, 'error');
    }
  });
}

// ─── Admin Top-Up Actions ────────────────────────────────────────────────

async function adminApproveTopup(id, amount) {
  if (!confirm(`Одобрить пополнение на ${Number(amount).toLocaleString()} сум?`)) return;
  try {
    await API.adminApproveTopup(id);
    showToast(`Одобрено! Начислено ${Number(amount).toLocaleString()} сум`, 'success');
    adminSwitchTab('topups');
    loadAdminStats();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function adminRejectTopup(id) {
  const reason = prompt('Причина отклонения (необязательно):');
  if (reason === null) return; // cancelled
  try {
    await API.adminRejectTopup(id, reason);
    showToast('Заявка отклонена', 'info');
    adminSwitchTab('topups');
    loadAdminStats();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Extra styles for courier rows ────────────────────────────────────────────

(function _injectCourierAdminStyles() {
  if (document.getElementById('admin-courier-styles')) return;
  const style = document.createElement('style');
  style.id = 'admin-courier-styles';
  style.textContent = `
    .ar-vehicle, .ar-license, .ar-docs { font-size: 12px; color: #475569; margin-top: 4px; }
    .ar-bio     { font-size: 12px; color: #64748b; margin-top: 3px; font-style: italic; }
    .doc-link { color: #16a34a; text-decoration: underline; }
    .status-rejected { color: #b91c1c; }
    .rejection-banner { background: #fef2f2; border: 1px solid #fecaca; }
  `;
  document.head.appendChild(style);
})();

// ─── User management ──────────────────────────────────────────────────────────

function adminBlock(id) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="modal-ic">${fe('⛔',32)}</div>
      <h3 class="modal-title">${t('block_user_title')}</h3>
      <p class="modal-desc">${t('block_user_desc')}</p>
      <textarea id="block-reason" class="modal-textarea" placeholder="${t('block_user_ph')}"></textarea>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="block-cancel">${t('cancel')}</button>
        <button class="btn btn-danger" id="block-confirm">${fe('⛔',14)} ${t('block_action')}</button>
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
      showToast(t('user_blocked_ok') + ' ' + fe('⛔',14), 'success');
      adminSwitchTab('users');
    } catch (e) {
      btn.disabled = false; btn.textContent = fe('⛔',14) + ' ' + t('block_action');
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

async function adminViewChat(chatId) {
  try {
    const messages = await API.request('GET', `/api/admin/chats/${chatId}/messages`);
    const overlay = document.createElement('div');
    overlay.id = 'admin-chat-modal';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);animation:fadeIn .2s';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    const msgHtml = messages.length
      ? messages.map(m => `
        <div style="margin-bottom:8px;padding:8px 12px;border-radius:8px;background:${m.sender_id === messages[0]?.sender_id ? '#f0fdf4' : '#f9fafb'}">
          <div style="font-size:12px;color:#6b7280;margin-bottom:2px"><b>${m.sender_name}</b> · ${m.created_at ? new Date(m.created_at).toLocaleString('ru-RU') : ''}</div>
          <div style="font-size:14px">${m.is_blocked ? '⚠️ [заблокировано]' : (m.type === 'photo' ? '📷 Фото' : m.type === 'voice' ? '🎤 Голос' : m.content)}</div>
        </div>
      `).join('')
      : '<p style="color:#9ca3af;text-align:center">Нет сообщений</p>';

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;max-width:600px;width:95%;max-height:80vh;overflow-y:auto;padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin:0;font-size:18px">💬 Просмотр чата #${chatId}</h2>
          <button onclick="document.getElementById('admin-chat-modal').remove()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button>
        </div>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:12px">Режим просмотра (read-only)</div>
        ${msgHtml}
      </div>
    `;
    document.body.appendChild(overlay);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

window.renderAdmin          = renderAdmin;
window.adminSwitchTab       = adminSwitchTab;
window.adminApprove         = adminApprove;
window.adminReject          = adminReject;
window.adminApproveCourier  = adminApproveCourier;
window.adminSetRating       = adminSetRating;
window.adminRejectCourier   = adminRejectCourier;
window.adminBlock           = adminBlock;
window.adminUnblock         = adminUnblock;
window.adminViewChat        = adminViewChat;
