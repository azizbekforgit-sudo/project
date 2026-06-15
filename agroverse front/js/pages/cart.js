/* pages/cart.js — корзина покупателя */

function renderCart() {
  const app = document.getElementById('app');
  const cart = getCart();

  if (!cart.length) {
    app.innerHTML = pageShell(`
      <div class="page-head"><h1 class="page-title">🛍️ ${t('nav_cart')}</h1></div>
      <div class="empty-state big">
        <div class="icon">🛒</div>
        <p>${t('cart_empty')}</p>
        <button class="btn btn-primary" onclick="router.go('/market')">${t('go_market')}</button>
      </div>
    `);
    return;
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  app.innerHTML = pageShell(`
    <div class="page-head">
      <h1 class="page-title">🛍️ ${t('nav_cart')}</h1>
      <p class="page-desc">${cart.length} ${t('cart_items_count')}</p>
    </div>
    <div class="cart-layout">
      <div class="cart-items">
        ${cart.map(i => cartItemHtml(i)).join('')}
      </div>
      <div class="cart-summary">
        <h3>${t('cart_total')}</h3>
        <div class="cs-divider"></div>
        <div class="cs-row">
          <span>${t('cart_products')} (${cart.length})</span>
          <b>${Number(total).toLocaleString()} ${t('currency')}</b>
        </div>
        <div class="cs-row">
          <span>${t('cart_delivery')}</span>
          <b style="color:var(--clr-primary)">${t('cart_pickup')}</b>
        </div>
        <div class="cs-total">
          <span>${t('cart_to_pay')}</span>
          <b>${Number(total).toLocaleString()} ${t('currency')}</b>
        </div>
        <button class="btn btn-primary btn-lg" onclick="cartCheckout()">${t('cart_checkout')}</button>
        <button class="btn-ghost" onclick="clearCart(); renderCart();">${t('cart_clear')}</button>
      </div>
    </div>
  `);
}

function cartItemHtml(i) {
  const imgHtml = i.image
    ? `<img src="${i.image}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ci-ph',textContent:'🥬'}))" style="width:100%;height:100%;object-fit:cover;display:block;"/>`
    : '<div class="ci-ph">🥬</div>';
  return `
    <div class="cart-item" data-id="${i.id}">
      <div class="ci-img">${imgHtml}</div>
      <div class="ci-info">
        <div class="ci-name">${i.name}</div>
        <div class="ci-price">${Number(i.price).toLocaleString()} ${t('currency')} / ${i.unit || t('kg')}</div>
      </div>
      <div class="ci-qty">
        <button onclick="cartQty(${i.id}, -1)">−</button>
        <span>${i.qty}</span>
        <button onclick="cartQty(${i.id}, 1)">+</button>
      </div>
      <div class="ci-sum">${Number(i.price * i.qty).toLocaleString()} ${t('currency')}</div>
      <button class="ci-del" onclick="cartRemove(${i.id})" title="${t('remove')}">🗑️</button>
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
  showToast(t('cart_processing'), 'info');
  let ok = 0, fail = 0;
  for (const item of cart) {
    try {
      await API.createOrder({ product_id: item.id, quantity: item.qty });
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
