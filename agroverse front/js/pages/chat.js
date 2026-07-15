/* pages/chat.js — Детали чата (сообщения) */

let _chatPollingInterval = null;
let _chatCurrentId = null;
let _chatLastMessageId = 0;
let _chatWsHandler = null;
let _chatPollTimer = null;

async function renderChatDetail(chatId) {
  _chatCurrentId = chatId;
  _chatLastMessageId = 0;
  const app = document.getElementById('app');
  app.innerHTML = pageShell(`
    <div class="chat-page">
      <div class="chat-page-header" id="chat-header">
        <button class="btn btn-ghost btn-sm" onclick="stopChatPolling();router.go('/chats')">
          <i class="fi fi-rr-arrow-left"></i> Назад
        </button>
        <div id="chat-header-info"><div class="spinner" style="width:20px;height:20px"></div></div>
      </div>
      <div class="chat-messages" id="chat-messages">
        <div class="spinner" style="margin:40px auto"></div>
      </div>
      <div class="chat-input-bar" id="chat-input-bar" style="display:none">
        <div class="chat-actions-left">
          <button class="chat-action-btn" id="chat-attach-btn" title="Прикрепить файл">
            <i class="fi fi-rr-paperclip"></i>
          </button>
          <input type="file" id="chat-file-input" accept="image/*,audio/*" style="display:none" />
        </div>
        <input type="text" id="chat-input" class="chat-text-input" placeholder="Введите сообщение..." maxlength="5000" />
        <button class="chat-send-btn" id="chat-send-btn" title="Отправить">
          <i class="fi fi-rr-paper-plane"></i>
        </button>
      </div>
    </div>
  `);

  // Show moderation warning on first open (per session)
  const warningKey = `chat_warning_shown_${chatId}`;
  if (!sessionStorage.getItem(warningKey)) {
    showChatWarningModal();
    sessionStorage.setItem(warningKey, '1');
  }

  try {
    const chat = await API.getChat(chatId);
    renderChatHeader(chat);
    // Small delay to ensure DOM is ready
    await new Promise(r => setTimeout(r, 50));
    await loadMessages(chatId);
    setupChatInput(chatId, chat);
    startChatPolling(chatId);
  } catch (e) {
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML = `
        <div class="empty-state"><p>${fe('⚠️',16)} ${e.message}</p></div>
      `;
    }
  }
}

function renderChatHeader(chat) {
  const user = Auth.getUser();
  const other = chat.participant_a.id === user.id ? chat.participant_b : chat.participant_a;

  const typeLabels = {
    buyer_farmer: 'Чат с фермером',
    buyer_driver: 'Чат с драйвером',
    driver_farmer: 'Чат с фермером'
  };

  let actionsHtml = '';

  // Buyer in buyer_driver chat → "Заказать этого драйвера"
  if (chat.type === 'buyer_driver' && user.role === 'xaridor' && !chat.delivery_request_id) {
    actionsHtml += `
      <button class="btn btn-primary btn-sm" id="btn-assign-driver" onclick="assignDriverFromChat(${chat.order_id}, ${chat.id})">
        <i class="fi fi-rr-check" style="font-size:14px"></i> Заказать этого драйвера
      </button>
    `;
  }

  // Driver in buyer_driver chat → "Начать чат с фермером"
  if (chat.type === 'buyer_driver' && user.role === 'courier') {
    actionsHtml += `
      <button class="btn btn-ghost btn-sm" id="btn-chat-farmer" onclick="startDriverFarmerChat(${chat.order_id})">
        <i class="fi fi-rr-comment" style="font-size:14px"></i> Чат с фермером
      </button>
    `;
  }

  document.getElementById('chat-header-info').innerHTML = `
    <div class="chat-header-info-content">
      <div>
        <div class="chat-header-name">${other.name}</div>
        <div class="chat-header-type">${typeLabels[chat.type] || chat.type} · Заказ #${chat.order_id}</div>
      </div>
      <div class="chat-header-actions">${actionsHtml}</div>
    </div>
  `;

  // Add order info card for buyer_driver and driver_farmer chats
  if ((chat.type === 'buyer_driver' || chat.type === 'driver_farmer') && chat.order_product_title) {
    const headerEl = document.querySelector('.chat-page-header');
    if (headerEl) {
      const infoCard = document.createElement('div');
      infoCard.className = 'chat-order-card';
      infoCard.innerHTML = `
        <div class="chat-order-card-inner">
          <span class="chat-order-label">📦 ${chat.order_product_title}</span>
          <span class="chat-order-id">#${chat.order_id}</span>
        </div>
      `;
      headerEl.parentNode.insertBefore(infoCard, headerEl.nextSibling);
    }
  }
}

async function loadMessages(chatId, before = null) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  try {
    const params = { limit: 50 };
    if (before) params.before = before;

    const messages = await API.getChatMessages(chatId, params);

    if (!messages?.length && !before) {
      container.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">💬</div>
          <p>Начните общение</p>
        </div>
      `;
      _chatLastMessageId = 0;
      return;
    }

    const user = Auth.getUser();
    const html = messages.map(m => messageHtml(m, m.sender_id === user.id)).join('');

    if (before) {
      container.insertAdjacentHTML('afterbegin', html);
    } else {
      container.innerHTML = html;
      container.scrollTop = container.scrollHeight;
    }

    // Track the highest message ID
    if (messages?.length) {
      _chatLastMessageId = Math.max(...messages.map(m => m.id));
    }
  } catch (e) {
    if (!before) {
      container.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
    }
  }
}

async function loadNewMessages(chatId) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  try {
    const messages = await API.getChatMessages(chatId, { limit: 50 });
    if (!messages?.length) return;

    const user = Auth.getUser();

    // Filter messages that are newer than our last known message
    const newMessages = _chatLastMessageId > 0
      ? messages.filter(m => m.id > _chatLastMessageId)
      : [];

    if (newMessages.length === 0) return;

    const html = newMessages.map(m => messageHtml(m, m.sender_id === user.id)).join('');
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;

    // Update the last known message ID
    _chatLastMessageId = Math.max(...messages.map(m => m.id));
  } catch (e) {
    // Silent fail for polling
  }
}

function messageHtml(msg, isOwn) {
  if (msg.is_blocked) {
    return `
      <div class="msg-bubble msg-blocked">
        <div class="msg-blocked-text">⚠️ Сообщение заблокировано (обмен номерами запрещён)</div>
      </div>
    `;
  }

  let contentHtml = '';
  if (msg.type === 'text') {
    contentHtml = `<div class="msg-text">${escapeHtml(msg.content)}</div>`;
  } else if (msg.type === 'photo') {
    const src = msg.content.startsWith('http') ? msg.content : (typeof BASE_URL !== 'undefined' ? BASE_URL : '') + msg.content;
    contentHtml = `<img src="${src}" class="msg-photo" onclick="window.open('${src}','_blank')" />`;
  } else if (msg.type === 'voice') {
    contentHtml = `<div class="msg-voice"><i class="fi fi-rr-play"></i> Голосовое сообщение</div>`;
  } else if (msg.type === 'location') {
    try {
      const loc = JSON.parse(msg.content);
      contentHtml = `<div class="msg-location">📍 ${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)}</div>`;
    } catch {
      contentHtml = `<div class="msg-text">${msg.content}</div>`;
    }
  }

  const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

  return `
    <div class="msg-bubble ${isOwn ? 'msg-own' : 'msg-other'}">
      ${!isOwn ? `<div class="msg-sender">${msg.sender_name}</div>` : ''}
      ${contentHtml}
      <div class="msg-time">${time}</div>
    </div>
  `;
}

function setupChatInput(chatId, chat) {
  const inputBar = document.getElementById('chat-input-bar');
  if (inputBar) inputBar.style.display = 'flex';

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const attachBtn = document.getElementById('chat-attach-btn');
  const fileInput = document.getElementById('chat-file-input');

  // Send text
  async function sendTextMessage() {
    const text = input.value.trim();
    if (!text) return;

    // Client-side phone check
    if (containsPhoneClient(text)) {
      showToast('Обмен номерами телефона запрещён правилами чата', 'warn');
      return;
    }

    input.value = '';
    try {
      await API.sendMessage(chatId, { type: 'text', content: text });
      await loadMessages(chatId);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  sendBtn?.addEventListener('click', sendTextMessage);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendTextMessage();
    }
  });

  // File upload
  attachBtn?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await API.uploadChatFile(chatId, file);
      const type = file.type.startsWith('image/') ? 'photo' : 'voice';
      await API.sendMessage(chatId, { type, content: result.url });
      await loadMessages(chatId);
    } catch (e) {
      showToast(e.message, 'error');
    }
    fileInput.value = '';
  });
}

function startChatPolling(chatId) {
  // Останавливаем предыдущий polling
  stopChatPolling();

  // --- HTTP-polling: подтягиваем новые сообщения каждые 3 сек ---
  _chatPollTimer = setInterval(() => {
    if (_chatCurrentId) loadNewMessages(_chatCurrentId);
  }, 3000);

  // --- WebSocket handler для мгновенной доставки ---
  function onNewMessage(data) {
    if (data.chat_id != _chatCurrentId) return;
    const user = Auth.getUser();
    const msg = data.message;
    if (!msg) return;

    // Не дублируем自己的 сообщения (они уже отрисованы optimistically)
    if (msg.sender_id === user?.id) return;

    const container = document.getElementById('chat-messages');
    if (!container) return;

    // Убираем "Начните общение" если есть
    const empty = container.querySelector('.chat-empty');
    if (empty) empty.remove();

    // Проверяем не дублируем ли (polling мог уже подтянуть)
    if (msg.id && msg.id <= _chatLastMessageId) return;

    const html = messageHtml(msg, false);
    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;

    // Обновляем last ID чтобы polling не задублил
    if (msg.id) _chatLastMessageId = Math.max(_chatLastMessageId, msg.id);
  }

  _chatWsHandler = onNewMessage;
  if (typeof ChatWS !== 'undefined') {
    ChatWS.on('new_message', onNewMessage);
  }
}

function stopChatPolling() {
  // Останавливаем HTTP-polling
  if (_chatPollTimer) {
    clearInterval(_chatPollTimer);
    _chatPollTimer = null;
  }
  // Отписываем WS handler
  if (_chatWsHandler && typeof ChatWS !== 'undefined') {
    ChatWS.off('new_message', _chatWsHandler);
  }
  _chatWsHandler = null;
  _chatCurrentId = null;
}

// ─── Action handlers ───────────────────────────────────────────────────────

async function assignDriverFromChat(orderId, chatId) {
  if (!confirm('Назначить этого драйвера на доставку заказа?')) return;
  try {
    await API.assignDriver(orderId);
    showToast('Драйвер назначен на заказ!');
    // Reload chat header to update buttons
    const chat = await API.getChat(chatId);
    renderChatHeader(chat);
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function startDriverFarmerChat(orderId) {
  try {
    const chat = await API.createChat({ order_id: orderId, type: 'driver_farmer' });
    if (chat?.id) {
      router.go(`/chats/${chat.id}`);
    }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ─── Moderation warning modal ──────────────────────────────────────────────

function showChatWarningModal() {
  const overlay = document.createElement('div');
  overlay.id = 'chat-warning-modal';
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);animation:fadeIn .2s';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;max-width:440px;width:95%;padding:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:12px">⚠️</div>
      <h2 style="margin:0 0 12px;font-size:18px">Правила чата</h2>
      <p style="color:#6b7280;font-size:14px;line-height:1.6;margin-bottom:20px">
        Этот чат сохраняется и доступен администраторам платформы для просмотра диалога.
        <br><br>
        <b>Запрещён обмен номерами телефона.</b>
      </p>
      <button class="btn btn-primary btn-full" onclick="document.getElementById('chat-warning-modal').remove()">
        Понятно, продолжить
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/\n/g, '<br>');
}

function containsPhoneClient(text) {
  const normalized = text.replace(/[\s\-\(\)\+]/g, '');
  if (/^\d{7,15}$/.test(normalized)) return true;
  return /(\+?\d[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{2,4}[\s\-]?\d{2,4}[\s\-]?\d{2,4}/.test(text) ||
         /\b\d{7,15}\b/.test(text);
}

window.renderChatDetail = renderChatDetail;
window.stopChatPolling = stopChatPolling;
window.assignDriverFromChat = assignDriverFromChat;
window.startDriverFarmerChat = startDriverFarmerChat;
