/* pages/chats.js — «Сообщения»: список переписок слева, переписка справа (ПК).
   На телефоне — либо список (/chats), либо переписка (/chats/:id). */

let _chatsWsHandler = null;
let _chatsFilter = 'all';

/* Общая разметка страницы: список + правая часть (заглушка или переписка) */
function chatsLayoutHtml(convHtml, hasConv) {
  return `
    <div class="ch ${hasConv ? 'has-conv' : ''}">
      <section class="v3-card ch-list" aria-label="${t('ch_title')}">
        <div class="ch-list-head">
          <h1 class="v3-h2">${t('ch_title')}</h1>
          <div class="ch-tabs" role="tablist">
            <button class="ch-tab ${_chatsFilter === 'all' ? 'active' : ''}" role="tab" data-f="all" onclick="setChatsFilter('all')">${t('ch_all')} <span id="ch-n-all"></span></button>
            <button class="ch-tab ${_chatsFilter === 'unread' ? 'active' : ''}" role="tab" data-f="unread" onclick="setChatsFilter('unread')">${t('ch_unread')} <span id="ch-n-unread"></span></button>
          </div>
        </div>
        <div class="ch-items" id="chats-wrap"><div class="spinner"></div></div>
      </section>
      <section class="v3-card ch-conv">${convHtml}</section>
    </div>`;
}

async function renderChats() {
  stopChatsPolling();
  if (typeof stopChatPolling === 'function') stopChatPolling();
  const app = document.getElementById('app');
  app.innerHTML = pageShell(chatsLayoutHtml(`
    <div class="ch-pick"><div><i class="fa-regular fa-comments"></i>${t('ch_pick')}</div></div>`, false));
  await loadChatsList();
  startChatsPolling();
}

function setChatsFilter(f) {
  _chatsFilter = f;
  document.querySelectorAll('.ch-tab').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  loadChatsList();
}
window.setChatsFilter = setChatsFilter;

async function loadChatsList(activeId) {
  const wrap = document.getElementById('chats-wrap');
  if (!wrap) return;
  const current = activeId ?? (location.hash.match(/^#\/chats\/(\d+)/) || [])[1];

  try {
    const chats = await API.getChats();
    const unread = (chats || []).filter(c => c.unread_count > 0);
    const nAll = document.getElementById('ch-n-all');
    const nUnread = document.getElementById('ch-n-unread');
    if (nAll) nAll.textContent = chats?.length ? `(${chats.length})` : '';
    if (nUnread) nUnread.textContent = unread.length ? `(${unread.length})` : '';
    window._globalChatsUnread = unread.reduce((n, c) => n + c.unread_count, 0);

    const list = _chatsFilter === 'unread' ? unread : (chats || []);
    if (!list.length) {
      wrap.innerHTML = `
        <div class="ch-empty">
          <i class="fa-regular fa-comment-dots"></i>
          <b>${t('ch_empty')}</b>
          <p>${t('ch_empty_d')}</p>
        </div>`;
      return;
    }
    wrap.innerHTML = list.map(c => chatItemHtml(c, String(c.id) === String(current))).join('');
  } catch (e) {
    wrap.innerHTML = `<div class="ch-empty"><p><i class="fa-solid fa-triangle-exclamation"></i> ${escHtml(e.message)}</p></div>`;
  }
}

function startChatsPolling() {
  stopChatsPolling();

  // WebSocket: при новом сообщении обновляем список (и коротко сообщаем, от кого)
  function onNewMessage(data) {
    if (!document.getElementById('chats-wrap')) return;
    const msg = data.message;
    if (!msg) return;
    const user = Auth.getUser();
    if (msg.sender_id !== user?.id && String(data.chat_id) !== String(window._chatCurrentIdPublic || '')) {
      showToast(`${escHtml(msg.sender_name)}: ${escHtml(chatPreview(msg))}`, 'info', 4000);
    }
    loadChatsList();
  }

  _chatsWsHandler = onNewMessage;
  if (typeof ChatWS !== 'undefined') ChatWS.on('new_message', onNewMessage);
}

function stopChatsPolling() {
  if (_chatsWsHandler && typeof ChatWS !== 'undefined') ChatWS.off('new_message', _chatsWsHandler);
  _chatsWsHandler = null;
}

function chatPreview(m) {
  if (!m) return t('ch_no_msgs');
  if (m.type === 'photo') return t('ch_photo');
  if (m.type === 'voice') return t('ch_voice');
  if (m.type === 'location') return t('ch_location');
  return (m.content || '').substring(0, 60);
}

/* Время последнего сообщения: сегодня — часы, вчера — «Вчера», иначе дата */
function chatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const now = new Date();
  const day = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (day(now) - day(d)) / 86400000;
  if (diff === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return t('ch_yesterday');
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

/* Собеседник и подпись «кто он» */
function chatOther(chat) {
  const user = Auth.getUser();
  return chat.participant_a.id === user?.id ? chat.participant_b : chat.participant_a;
}
function chatRoleLabel(role) {
  const r = String(role || '').toLowerCase();
  if (r.includes('fermer')) return t('ch_with_farmer');
  if (r.includes('courier')) return t('ch_with_driver');
  return t('ch_with_buyer');
}

function chatItemHtml(chat, active) {
  const other = chatOther(chat);
  const name = escHtml(other.name || '—');
  const lastMsg = chat.last_message;
  const unread = chat.unread_count || 0;
  const about = chat.order_product_title ? escHtml(chat.order_product_title) : '';
  const photo = chat.order_product_photo
    ? (chat.order_product_photo.startsWith('http') ? chat.order_product_photo : BASE_URL + chat.order_product_photo) : '';

  return `
    <button class="ch-item ${unread ? 'unread' : ''} ${active ? 'active' : ''}" onclick="stopChatsPolling(); router.go('/chats/${chat.id}')">
      <span class="ch-ava">${name[0] || '?'}${photo ? `<img src="${photo}" alt="" loading="lazy" onerror="this.remove()" />` : ''}</span>
      <span style="min-width:0">
        <span class="ch-name" style="display:block">${name}</span>
        <span class="ch-sub" style="display:block">${chatRoleLabel(other.role)}${about ? ' · ' + about : ''}</span>
        <span class="ch-prev" style="display:block">${escHtml(chatPreview(lastMsg))}</span>
      </span>
      <span class="ch-meta">
        <span>${chatTime(lastMsg?.created_at || chat.created_at)}</span>
        ${unread ? `<em>${unread}</em>` : ''}
      </span>
    </button>`;
}

window.renderChats = renderChats;
window.stopChatsPolling = stopChatsPolling;
window.loadChatsList = loadChatsList;
window.chatsLayoutHtml = chatsLayoutHtml;
window.chatOther = chatOther;
window.chatRoleLabel = chatRoleLabel;
