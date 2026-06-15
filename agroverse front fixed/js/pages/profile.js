/* pages/profile.js — профиль. Фермер: мои товары + редактирование. Покупатель: редактирование. */

async function renderProfile() {
  const app  = document.getElementById('app');
  const isFarmer = Auth.isFarmer();
  const user = Auth.getUser();

  app.innerHTML = pageShell(`
    <div class="page-head">
      <h1 class="page-title">👤 ${t('profile_title')}</h1>
      <p class="page-desc">${isFarmer ? t('profile_farmer_desc') : t('profile_buyer_desc')}</p>
    </div>

    <div class="profile-grid">
      <div class="card profile-card">
        <div class="profile-avatar">${isFarmer ? '🌱' : '🛍️'}</div>
        <div class="profile-name" id="pf-name-display">${user?.name || ''}</div>
        <div class="profile-role">${isFarmer ? t('farmer_role') : t('buyer_role')}</div>
        <div class="profile-meta" id="pf-meta"><div class="spinner"></div></div>
      </div>

      <div class="card edit-card">
        <h3 class="card-title">✏️ ${t('edit_profile')}</h3>
        <div class="form-group">
          <label>${t('name')}</label>
          <input type="text" id="pf-name" value="${user?.name || ''}" />
        </div>
        <div class="form-group">
          <label>${t('email')}</label>
          <input type="email" id="pf-email" placeholder="email@example.com" value="${user?.email || ''}" />
        </div>
        <div class="form-group">
          <label>${t('phone')}</label>
          <input type="text" value="${user?.phone || ''}" disabled />
          <small class="hint">${t('phone_locked')}</small>
        </div>
        <div id="pf-error" class="form-error hidden"></div>
        <button class="btn btn-primary" id="pf-save">${t('save_changes')}</button>
      </div>
    </div>

    ${isFarmer ? `
      <div class="section">
        <div class="section-head">
          <h2>📦 ${t('my_products')}</h2>
          <button class="btn btn-primary btn-sm" onclick="router.go('/product/new')">➕ ${t('add_btn')}</button>
        </div>
        <div id="my-products" class="products-grid"><div class="spinner"></div></div>
      </div>
    ` : ''}
  `);

  API.getMe().then(me => {
    Auth.setUser({ ...user, ...me });
    document.getElementById('pf-name-display').textContent = me.name || '';
    document.getElementById('pf-name').value = me.name || '';
    if (document.getElementById('pf-email')) document.getElementById('pf-email').value = me.email || '';
    document.getElementById('pf-meta').innerHTML = `
      <div class="meta-row"><span>💰 ${t('wallet_label')}</span><b>${Number(me.wallet_balance || 0).toLocaleString('ru')} ${t('currency')}</b></div>
      <div class="meta-row"><span>🏅 ${t('bonus_label')}</span><b>${me.bonus_points || 0}</b></div>
      <div class="meta-row"><span>📊 ${t('tariff_label')}</span><b>${(me.tariff || 'standart').toUpperCase()}</b></div>
    `;
  }).catch((e) => {
    if (e && e.message === 'BLOCKED') return;
    const el = document.getElementById('pf-meta');
    if (el) el.innerHTML = '<p style="color:var(--clr-muted)">—</p>';
  });

  document.getElementById('pf-save')?.addEventListener('click', async () => {
    const name  = document.getElementById('pf-name').value.trim();
    const email = document.getElementById('pf-email').value.trim();
    const err   = document.getElementById('pf-error');
    const btn   = document.getElementById('pf-save');
    if (!name || name.length < 2) {
      err.textContent = t('name') + ' — min 2'; err.classList.remove('hidden'); return;
    }
    err.classList.add('hidden');
    btn.disabled = true; btn.textContent = t('saving');
    try {
      const updated = await API.updateProfile({ name, email });
      Auth.setUser({ ...Auth.getUser(), name: updated.name, email: updated.email });
      document.getElementById('pf-name-display').textContent = updated.name;
      showToast(t('profile_updated'));
    } catch (e) {
      if (e.message === 'BLOCKED') return;
      err.textContent = e.message; err.classList.remove('hidden');
    } finally {
      btn.disabled = false; btn.textContent = t('save_changes');
    }
  });

  if (isFarmer) loadMyProducts();
}

async function loadMyProducts() {
  const me  = Auth.getUser();
  const wrap = document.getElementById('my-products');
  if (!wrap) return;
  try {
    const products = await API.getProducts({ fermer_id: me?.id });
    if (!products?.length) {
      wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="icon">🌱</div><p>${t('no_my_products')}</p><button class="btn btn-primary btn-sm" onclick="router.go('/product/new')">➕ ${t('nav_add_product')}</button></div>`;
      return;
    }
    wrap.innerHTML = products.map(p => `
      <div class="product-card">
        <div class="pc-media">
          ${p.images?.length ? `<img class="pc-img" src="${p.images[0]}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'pc-img ph',textContent:'${CAT_EMOJI[p.category]||'🥬'}'}))" />` : `<div class="pc-img ph">${CAT_EMOJI[p.category]||'🥬'}</div>`}
          ${p.status === 'pending' ? `<span class="pc-badge">${t('pending_tag')}</span>` : `<span class="pc-badge ok">${t('active_tag')}</span>`}
        </div>
        <div class="pc-body">
          <div class="pc-name">${p.name}</div>
          <div class="pc-price">${Number(p.price).toLocaleString('ru')} <small>${t('currency')}/${p.unit||'кг'}</small></div>
          <div class="pc-farmer">📦 ${t('in_stock_label')}: ${p.quantity} ${p.unit||'кг'}</div>
          <div class="pc-actions">
            <button class="btn btn-ghost btn-sm" onclick="router.go('/product/${p.id}')">${t('open_btn')}</button>
            <button class="btn btn-danger btn-sm" onclick="deleteMyProduct(${p.id})">${t('delete')}</button>
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    wrap.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>⚠️ ${e.message}</p></div>`;
  }
}

async function deleteMyProduct(id) {
  if (!confirm(t('delete_confirm'))) return;
  try {
    await API.deleteProduct(id);
    showToast(t('product_deleted'));
    loadMyProducts();
  } catch (e) {
    if (e.message !== 'BLOCKED') {
      const msg = e.message.includes('fetch') ? t('err_no_connection') : e.message;
      showToast(msg, 'error');
    }
  }
}

window.renderProfile = renderProfile;
window.loadMyProducts = loadMyProducts;
window.deleteMyProduct = deleteMyProduct;
