/* pages/wallet.js — Кошелёк и бонусы */

async function renderWallet() {
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`
    <div class="page-head"><h1 class="page-title">💰 ${t('wallet_title')}</h1><p class="page-desc">${t('wallet_desc')}</p></div>
    <div class="wallet-grid" id="wallet-grid">
      <div class="card skeleton" style="height:140px"></div>
      <div class="card skeleton" style="height:140px"></div>
    </div>
    <div class="card" style="margin-top:24px">
      <h3 class="card-title">ℹ️ ${t('how_it_works')}</h3>
      <ul class="wallet-info">
        <li>🏅 ${t('wi_1')}</li>
        <li>➕ ${t('wi_2')}</li>
        <li>🛒 ${t('wi_3')}</li>
        <li>💸 ${t('wi_4')}</li>
      </ul>
    </div>
  `);

  try {
    const me = await API.getMe();
    document.getElementById('wallet-grid').innerHTML = `
      <div class="card wallet-card balance">
        <div class="wc-ic">💰</div>
        <div class="wc-label">${t('wallet_balance')}</div>
        <div class="wc-value">${Number(me.wallet_balance || 0).toLocaleString('ru')} <small>${t('currency')}</small></div>
      </div>
      <div class="card wallet-card points">
        <div class="wc-ic">🏅</div>
        <div class="wc-label">${t('bonus_points')}</div>
        <div class="wc-value">${me.bonus_points || 0}</div>
      </div>
    `;
  } catch (e) {
    if (e.message === 'BLOCKED') return;
    document.getElementById('wallet-grid').innerHTML = `<div class="empty-state" style="grid-column:1/-1"><p>⚠️ ${e.message}</p></div>`;
  }
}

window.renderWallet = renderWallet;
