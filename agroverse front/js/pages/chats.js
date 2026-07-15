/* pages/chats.js — Список чатов с WebSocket */

let _chatsWsHandler = null;

async function renderChats() {
  stopChatsPolling();
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`
    <div class="page-head">
      <h1 class="page-title"><i class="fi fi-rr-comment" style="font-size:24px"></i> Чаты</h1>
      <p class="page-desc">Общение по заказам</p>
    </div>
    <div id="chats-wrap"><div class="spinner"></div></div>
  `);
  await loadChatsList();
  startChatsPolling();
}

async function loadChatsList() {
  const wrap = document.getElementById('chats-wrap');
  if (!wrap) return;

  try {
    const chats = await API.getChats();
    if (!chats?.length) {
      wrap.innerHTML = `
        <div class="empty-state big">
          <div class="icon"><i class="fi fi-rr-comment" style="font-size:48px"></i></div>
          <p>У вас пока нет чатов</p>
          <p style="color:#9ca3af;font-size:14px;margin-top:8px">Чаты появятся после создания заказов</p>
        </div>`;
      return;
    }

    wrap.innerHTML = `<div class="chat-list">${chats.map(c => chatItemHtml(c)).join('')}</div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><p>${fe('⚠️',16)} ${e.message}</p></div>`;
  }
}

function startChatsPolling() {
  stopChatsPolling();

  // WebSocket handler — обновляем список при новом сообщении
  function onNewMessage(data) {
    const wrap = document.getElementById('chats-wrap');
    if (!wrap) return;

    const msg = data.message;
    if (!msg) return;

    const user = Auth.getUser();
    const isFromMe = msg.sender_id === user?.id;

    // Toast для сообщений от других
    if (!isFromMe) {
      const preview = msg.type === 'photo' ? '📷 Фото' :
                    msg.type === 'voice' ? '🎤 Голос' :
                    msg.type === 'location' ? '📍 Локация' :
                    (msg.content || '').substring(0, 50);
      showToast(`💬 ${msg.sender_name}: ${preview}`, 'info', 4000);
    }

    // Перезагружаем список чтобы обновить last_message и порядок
    loadChatsList();
  }

  _chatsWsHandler = onNewMessage;
  if (typeof ChatWS !== 'undefined') {
    ChatWS.on('new_message', onNewMessage);
  }
}

function stopChatsPolling() {
  if (_chatsWsHandler && typeof ChatWS !== 'undefined') {
    ChatWS.off('new_message', _chatsWsHandler);
  }
  _chatsWsHandler = null;
}

function chatItemHtml(chat) {
  const user = Auth.getUser();
  const isParticipantA = chat.participant_a.id === user.id;
  const other = isParticipantA ? chat.participant_b : chat.participant_a;

  const typeLabels = {
    buyer_farmer: 'Покупатель ↔ Фермер',
    buyer_driver: 'Покупатель ↔ Драйвер',
    driver_farmer: 'Драйвер ↔ Фермер'
  };
  const typeIcons = {
    buyer_farmer: '🥬',
    buyer_driver: '🚗',
    driver_farmer: '🚜'
  };

  const lastMsg = chat.last_message;
  const lastMsgText = lastMsg
    ? (lastMsg.type === 'photo' ? '📷 Фото' : lastMsg.type === 'voice' ? '🎤 Голос' : lastMsg.type === 'location' ? '📍 Локация' : (lastMsg.content || '...').substring(0, 50))
    : 'Нет сообщений';

  const lastMsgTime = lastMsg?.created_at
    ? new Date(lastMsg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : '';

  const unread = chat.unread_count || 0;
  const isFromOther = lastMsg && lastMsg.sender_name !== user?.name;

  return `
    <div class="chat-item ${unread > 0 ? 'chat-item-unread' : ''}" onclick="stopChatsPolling();router.go('/chats/${chat.id}')">
      <div class="chat-item-avatar">
        ${typeIcons[chat.type] || '💬'}
      </div>
      <div class="chat-item-body">
        <div class="chat-item-top">
          <span class="chat-item-name">${other.name}</span>
          <span class="chat-item-type">${typeLabels[chat.type] || chat.type}</span>
        </div>
        <div class="chat-item-order">
          Заказ #${chat.order_id}${chat.order_product_title ? ' — ' + chat.order_product_title : ''}
        </div>
        <div class="chat-item-bottom">
          <span class="chat-item-preview ${isFromOther ? 'chat-item-preview-new' : ''}">${lastMsgText}</span>
          <div class="chat-item-meta">
            ${lastMsgTime ? `<span class="chat-item-time">${lastMsgTime}</span>` : ''}
            ${unread > 0 ? `<span class="chat-item-badge">${unread}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

window.renderChats = renderChats;
window.stopChatsPolling = stopChatsPolling;
