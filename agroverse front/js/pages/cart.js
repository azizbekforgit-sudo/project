/* pages/cart.js — корзина покупателя */

function renderCart() {
  const app = document.getElementById('app');
  const cart = getCart();

  if (!cart.length) {
    app.innerHTML = pageShell(`
      <div class="page-head"><h1 class="page-title"><i class="fa-solid fa-cart-shopping" style="color:#105C38"></i> ${t('nav_cart')}</h1></div>
      <div class="empty-state big">
        <div class="icon"><i class="fa-solid fa-basket-shopping" style="font-size:56px;color:#105C38"></i></div>
        <p style="font-size:18px;font-weight:600;margin:16px 0">${t('cart_empty')}</p>
        <button class="btn btn-primary btn-lg" onclick="router.go('/market')"><i class="fa-solid fa-store"></i> ${t('go_market')}</button>
      </div>
    `);
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  app.innerHTML = pageShell(`
    <div class="page-head">
      <h1 class="page-title"><i class="fa-solid fa-cart-shopping" style="color:#105C38"></i> ${t('nav_cart')}</h1>
      <p class="page-desc">${cart.length} ${t('cart_items_count')}</p>
    </div>
    <div class="cart-layout">
      <div class="cart-items">
        ${cart.map(i => cartItemHtml(i)).join('')}
      </div>
      <div class="cart-summary">
        <h3 style="font-family:var(--font-display);font-size:20px;font-weight:800;color:#105C38">${t('cart_total')}</h3>
        <div class="cs-divider"></div>
        <div class="cs-row">
          <span>${t('cart_products')} (${cart.length})</span>
          <b>${Number(total).toLocaleString()} ${t('currency')}</b>
        </div>
        <div class="cs-row" style="flex-direction:column;gap:8px">
          <span>${t('cart_delivery')}</span>
          <div class="radio-col" style="gap:8px">
            <label class="radio-label" style="font-size:14px;font-weight:600"><input type="radio" name="cart-pickup" value="self" checked /> <i class="fa-solid fa-truck-ramp-box"></i> Самовывоз от фермера</label>
            <label class="radio-label" style="font-size:14px;font-weight:600"><input type="radio" name="cart-pickup" value="external" /> <i class="fa-solid fa-truck-fast"></i> Доставка курьером</label>
          </div>
        </div>
        <div class="cs-total" style="border-top:1px solid #E5E7EB;padding-top:16px;margin-top:12px">
          <span style="font-size:16px;font-weight:600">${t('cart_to_pay')}</span>
          <b style="font-size:22px;color:#105C38">${Number(total).toLocaleString()} ${t('currency')}</b>
        </div>
        <button class="btn btn-primary btn-lg" style="width:100%;margin-top:16px;padding:16px" onclick="cartCheckout()"><i class="fa-solid fa-check"></i> ${t('cart_checkout')}</button>
        <button class="btn-ghost" style="width:100%;margin-top:8px" onclick="clearCart(); renderCart();"><i class="fa-solid fa-trash-can"></i> ${t('cart_clear')}</button>
      </div>
    </div>
  `);
}

function cartItemHtml(i) {
  const imgHtml = i.image
    ? `<img src="${i.image}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ci-ph',textContent:'🌾'}))" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:10px;"/>`
    : '<div class="ci-ph" style="background:#EBF5EF;display:grid;place-items:center;border-radius:10px;"><i class="fa-solid fa-wheat-awn" style="font-size:24px;color:#105C38"></i></div>';
  return `
    <div class="cart-item" data-id="${i.id}">
      <div class="ci-img" style="width:70px;height:70px">${imgHtml}</div>
      <div class="ci-info">
        <div class="ci-name" style="font-weight:700;font-size:16px">${i.name}</div>
        <div class="ci-price" style="color:#6B7280">${Number(i.price).toLocaleString()} ${t('currency')} / ${i.unit || t('kg')}</div>
      </div>
      <div class="ci-qty">
        <button onclick="cartQty(${i.id}, -1)">−</button>
        <span>${i.qty}</span>
        <button onclick="cartQty(${i.id}, 1)">+</button>
      </div>
      <div class="ci-sum" style="font-weight:800;color:#105C38">${Number(i.price * i.qty).toLocaleString()} ${t('currency')}</div>
      <button class="ci-del" onclick="cartRemove(${i.id})" title="${t('remove')}"><i class="fa-solid fa-trash-can" style="color:#EF4444"></i></button>
    </div>
  `;
}

function cartQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  setCart(cart);
  renderCart();
}

function cartRemove(id) {
  removeFromCart(id);
  renderCart();
}

async function cartCheckout() {
  const cart = getCart();
  if (!cart.length) return;

  const pickup_method = document.querySelector('input[name="cart-pickup"]:checked')?.value || 'self';

  // If external delivery, open driver picker for the first item
  if (pickup_method === 'external') {
    const firstItem = cart[0];
    const product = { id: firstItem.id, name: firstItem.name, price: firstItem.price, delivery_available: true };
    showDriverPickerModal(product, firstItem.qty);
    return;
  }

  showToast(t('cart_processing'), 'info');
  let ok = 0, fail = 0;
  for (const item of cart) {
    try {
      await API.createOrder({ product_id: item.id, quantity: item.qty, pickup_method });
      ok++;
    } catch (e) { fail++; }
  }
  if (ok) {
    clearCart();
    showToast(`${t('order_placed')} (${ok})`);
    router.go('/orders');
  } else {
    showToast(t('order_failed'), 'error');
  }
}

window.renderCart   = renderCart;
window.cartQty      = cartQty;
window.cartRemove   = cartRemove;
window.cartCheckout = cartCheckout;
