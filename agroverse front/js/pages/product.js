/* pages/product.js — детальная страница товара */

async function renderProduct(id) {
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`
    <div class="back-link" onclick="router.go('/market')">${t('back_market')}</div>
    <div id="product-content"><div class="spinner"></div></div>
  `);

  const content = document.getElementById('product-content');
  const isBuyer = Auth.isBuyer();

  try {
    const p = await API.getProduct(id);
    const emoji = CAT_EMOJI[p.category] || '🥬';

    const orderPanel = isBuyer ? `
      <div class="order-panel card">
        <h3>${t('order_form_title')}</h3>
        <div id="order-error" class="form-error hidden"></div>
        <div class="form-group">
          <label for="qty">${t('qty_label')} (${p.unit || t('unit_kg') || 'kg'})</label>
          <input type="number" id="qty" value="1" min="1" max="${p.quantity || 9999}" />
        </div>
        <div class="form-group">
          <label>${t('pickup_label')}</label>
          <div class="radio-col">
            <label class="radio-label"><input type="radio" name="pickup" value="self" checked /> <i class="fi fi-rr-car-side"></i> ${t('pickup_self')}</label>
            <label class="radio-label"><input type="radio" name="pickup" value="farmer" /> <i class="fi fi-rr-tractor"></i> ${t('pickup_farmer')}</label>
            <label class="radio-label"><input type="radio" name="pickup" value="external" /> <i class="fi fi-rr-box-alt"></i> ${t('pickup_ext')}</label>
          </div>
        </div>
        <div class="order-total">
          <span>${t('order_total')}</span>
          <b id="total-price">${Number(p.price).toLocaleString('ru')} ${t('currency') || 'sum'}</b>
        </div>
        <button class="btn btn-primary btn-full" id="order-btn">${t('btn_order')}</button>
        <button class="btn btn-ghost btn-full" id="cart-btn"><i class="fi fi-rr-shopping-bag"></i> ${t('btn_cart')}</button>
      </div>
    ` : `
      <div class="order-panel card">
        <h3>${t('product_info_title')}</h3>
        <div class="meta-row"><span><i class="fi fi-rr-box-alt"></i> ${t('in_stock')}</span><b>${p.quantity} ${p.unit || 'kg'}</b></div>
        <div class="meta-row"><span><i class="fi fi-rr-chart-histogram"></i> ${t('item_status_label')}</span><b>${p.status === 'pending' ? t('item_status_pending') : t('item_status_active')}</b></div>
        <div class="meta-row"><span><i class="fi fi-rr-tag"></i> ${t('category') || 'Kategoriya'}</span><b>${p.category || '—'}</b></div>
        <p class="hint" style="margin-top:14px">${t('farmer_hint')}</p>
      </div>
    `;

    content.innerHTML = `
      <div class="product-detail-layout">
        <div class="product-gallery">
          ${p.images?.length
            ? `<img src="${p.images[0]}" alt="${p.name}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'gallery-ph',textContent:'${emoji}'}))" />`
            : `<div class="gallery-ph">${emoji}</div>`}
        </div>
        <div class="product-info">
          <span class="pi-cat">${emoji} ${p.category || ''}</span>
          <h1>${p.name}</h1>
          <div class="price-big">${Number(p.price).toLocaleString('ru')} <small>${t('currency') || 'sum'} / ${p.unit || 'kg'}</small></div>
          <div class="pi-rating">${starsHtml(p.rating)}</div>
          <p class="description">${p.description || t('no_desc')}</p>
          <div class="farmer-block">
            <div class="fb-ava"><i class="fi fi-sr-leaf"></i></div>
            <div>
              <div class="fb-label">${t('farmer_label')}</div>
              <div class="fb-name">${p.fermer_name || t('farmer_label')}</div>
            </div>
          </div>
        </div>
        ${orderPanel}
      </div>
    `;

    if (isBuyer) {
      document.getElementById('qty')?.addEventListener('input', () => {
        const qty = parseFloat(document.getElementById('qty').value) || 1;
        document.getElementById('total-price').textContent =
          `${(qty * Number(p.price)).toLocaleString('ru')} ${t('currency') || 'sum'}`;
      });

      document.getElementById('cart-btn')?.addEventListener('click', () => {
        const qty = parseInt(document.getElementById('qty').value) || 1;
        addToCart(p, qty);
        showToast(`«${p.name}» ${t('cart_added')}`);
      });

      document.getElementById('order-btn')?.addEventListener('click', async () => {
        const quantity = parseInt(document.getElementById('qty').value) || 1;
        const pickup_method = document.querySelector('input[name="pickup"]:checked')?.value || 'self';
        const errBox = document.getElementById('order-error');
        const btn = document.getElementById('order-btn');
        btn.disabled = true;
        btn.textContent = t('ordering_btn');
        errBox.classList.add('hidden');
        try {
          await API.createOrder({ product_id: Number(id), quantity, pickup_method });
          showToast(t('order_success'));
          router.go('/orders');
        } catch (e) {
          errBox.textContent = e.message;
          errBox.classList.remove('hidden');
          btn.disabled = false;
          btn.textContent = t('btn_order');
        }
      });
    }
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><p>⚠️ ${e.message}</p></div>`;
  }
}

window.renderProduct = renderProduct;
