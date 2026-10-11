/* push.js — включение push-уведомлений: новое сообщение, новый заказ, ответ продавца.
   Сервер шлёт уведомление, sw.js показывает его, даже если сайт закрыт.

   Состояния (Push.state()):
     unsupported — браузер не умеет;  ios-install — iPhone: сначала «На экран Домой»;
     denied — запрещено в браузере;   on — включено;   off — выключено. */

const Push = {
  supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && window.isSecureContext;
  },
  isIOS() { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  isStandalone() { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; },
  pref() { try { return localStorage.getItem('av_push'); } catch { return null; } },
  setPref(v) { try { localStorage.setItem('av_push', v); } catch {} },

  state() {
    if (!this.supported()) return this.isIOS() && !this.isStandalone() ? 'ios-install' : 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    // «включено» — только если подписка на этом устройстве действительно удалась
    if (Notification.permission === 'granted' && this.pref() === 'on') return 'on';
    return 'off';
  },

  async registration() {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    return reg;
  },

  keyToBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  },

  /* Подписать это устройство и сообщить серверу. Если ключ сервера сменился — переподписать. */
  async subscribe() {
    const reg = await this.registration();
    const { public_key: key } = await API.pushKey();
    let sub = await reg.pushManager.getSubscription();
    let savedKey = null;
    try { savedKey = localStorage.getItem('av_push_key'); } catch {}
    if (sub && savedKey && savedKey !== key) { await sub.unsubscribe(); sub = null; }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.keyToBytes(key) });
    try { localStorage.setItem('av_push_key', key); } catch {}
    const json = sub.toJSON();
    const res = await API.pushSubscribe({ endpoint: json.endpoint, keys: json.keys, lang: I18nManager.current });
    if (!res || !res.ok) throw new Error('push subscription rejected by server');
    return sub;
  },

  /* По нажатию кнопки: спросить разрешение и подписаться */
  async enable() {
    if (!this.supported()) return this.state();
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
    await this.subscribe();          // при ошибке исключение уйдёт в pushToggle → «не получилось»
    this.setPref('on');
    return 'on';
  },

  async disable() {
    this.setPref('off');
    if (!this.supported()) return;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && await reg.pushManager.getSubscription();
    if (sub) {
      try { await API.pushUnsubscribe({ endpoint: sub.endpoint }); } catch {}
      await sub.unsubscribe();
    }
  },

  /* После входа и при смене языка: подписка снова на сервере (новая база, другой человек, другой язык) */
  async sync() {
    if (!Auth.isLoggedIn() || this.state() !== 'on') return;
    try { await this.subscribe(); } catch (e) { console.warn('[push] sync', e); }
  },

  /* Выход: отвязать устройство от аккаунта, пока токен ещё есть */
  forget(token) {
    if (!this.supported() || !token) return;
    navigator.serviceWorker.getRegistration().then((reg) => reg && reg.pushManager.getSubscription()).then((sub) => {
      if (!sub) return;
      fetch(BASE_URL + '/api/push/unsubscribe', {
        method: 'POST', keepalive: true,
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      }).catch(() => {});
    }).catch(() => {});
  },
};
window.Push = Push;

function pushStateLabel() {
  return t({ on: 'pn_on', off: 'pn_off', denied: 'pn_denied', unsupported: 'pn_unsupported', 'ios-install': 'pn_ios_short' }[Push.state()]);
}
window.pushStateLabel = pushStateLabel;

/* Нажатие «Включить/выключить» (меню, профиль, баннер) */
async function pushToggle(after) {
  const st = Push.state();
  try {
    if (st === 'on') {
      await Push.disable();
      showToast(t('pn_off_toast'), 'info');
    } else if (st === 'off') {
      const res = await Push.enable();
      if (res === 'on') showToast(t('pn_on_toast'));
      else if (res === 'denied') showToast(t('pn_denied_help'), 'warn', 7000);
    } else if (st === 'denied') {
      showToast(t('pn_denied_help'), 'warn', 7000);
    } else if (st === 'ios-install') {
      showToast(t('pn_ios'), 'info', 9000);
    } else {
      showToast(t('pn_unsupported'), 'warn');
    }
  } catch (e) {
    console.warn('[push]', e);
    showToast(t('pn_error'), 'error');
  }
  if (typeof after === 'function') after();
}
window.pushToggle = pushToggle;

/* Баннер «Включить уведомления» — на главной и в сообщениях, пока человек не ответил */
function pushBannerHtml() {
  if (!Auth.isLoggedIn()) return '';
  const st = Push.state();
  let dismissed = false;
  try { dismissed = localStorage.getItem('av_push_banner') === 'no'; } catch {}
  // не надоедаем: только пока человек ещё не отвечал браузеру (или iPhone без установки)
  const ask = st === 'ios-install' || (st === 'off' && Notification.permission === 'default');
  if (dismissed || !ask) return '';
  return `
    <section class="pn-banner" id="pn-banner" role="region" aria-label="${t('pn_title')}">
      <span class="pn-banner-ic"><i class="fa-solid fa-bell"></i></span>
      <div class="pn-banner-tx">
        <b>${t('pn_banner_t')}</b>
        <span>${st === 'ios-install' ? t('pn_ios') : t('pn_banner_d')}</span>
      </div>
      <div class="pn-banner-btns">
        ${st === 'off' ? `<button class="btn btn-primary btn-sm" onclick="pushToggle(() => document.getElementById('pn-banner')?.remove())"><i class="fa-solid fa-bell"></i> ${t('pn_enable')}</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="try{localStorage.setItem('av_push_banner','no')}catch(e){}; document.getElementById('pn-banner')?.remove()">${t('pn_later')}</button>
      </div>
    </section>`;
}
window.pushBannerHtml = pushBannerHtml;
