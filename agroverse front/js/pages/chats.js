/* pages/chats.js — Список чатов с автообновлением */

let _chatsPollingInterval = null;
let _chatsLastKnown = {}; // chatId -> { content, created_at, sender_name }

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

    // Save initial state for change detection
    chats.forEach(c => {
      if (c.last_message) {
        _chatsLastKnown[c.id] = {
          content: c.last_message.content,
          created_at: c.last_message.created_at,
          sender_name: c.last_message.sender_name
        };
      }
    });

    wrap.innerHTML = `<div class="chat-list">${chats.map(c => chatItemHtml(c)).join('')}</div>`;
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state"><p>${fe('⚠️',16)} ${e.message}</p></div>`;
  }
}

function startChatsPolling() {
  stopChatsPolling();
  _chatsPollingInterval = setInterval(async () => {
    const wrap = document.getElementById('chats-wrap');
    if (!wrap) { stopChatsPolling(); return; }

    try {
      const chats = await API.getChats();
      if (!chats?.length) return;

      const currentUser = Auth.getUser();

      // Check for new messages and show notifications
      chats.forEach(c => {
        const lastMsg = c.last_message;
        if (!lastMsg) return;

        const known = _chatsLastKnown[c.id];
        const isNew = !known ||
                      lastMsg.created_at !== known.created_at ||
                      lastMsg.content !== known.content;

        // Show toast for messages from OTHER users
        if (isNew && lastMsg.sender_name !== currentUser?.name) {
          const preview = lastMsg.type === 'photo' ? '📷 Фото' :
                        lastMsg.type === 'voice' ? '🎤 Голос' :
                        lastMsg.type === 'location' ? '📍 Локация' :
                        (lastMsg.content || '').substring(0, 50);
          showToast(`💬 ${lastMsg.sender_name}: ${preview}`, 'info', 4000);
        }

        _chatsLastKnown[c.id] = {
          content: lastMsg.content,
          created_at: lastMsg.created_at,
          sender_name: lastMsg.sender_name
        };
      });

      // Re-render list
      wrap.innerHTML = `<div class="chat-list">${chats.map(c => chatItemHtml(c)).join('')}</div>`;
    } catch (e) { /* silent */ }
  }, 2000);
}

function stopChatsPolling() {
  if (_chatsPollingInterval) {
    clearInterval(_chatsPollingInterval);
    _chatsPollingInterval = null;
  }
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
