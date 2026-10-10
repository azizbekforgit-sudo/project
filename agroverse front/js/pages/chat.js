/* pages/chat.js — Детали чата (сообщения) */

let _chatPollingInterval = null;
let _chatCurrentId = null;
let _chatLastMessageId = 0;
let _chatWsHandler = null;
let _chatPollTimer = null;
let _chatIsRefreshing = false;

async function renderChatDetail(chatId) {
  if (typeof stopChatsPolling === 'function') stopChatsPolling();
  _chatCurrentId = chatId;
  window._chatCurrentIdPublic = chatId;
  _chatLastMessageId = 0;
  const app = document.getElementById('app');
  app.innerHTML = pageShell(chatsLayoutHtml(`
    <div class="ch-conv-head" id="chat-header">
      <button class="ch-back" onclick="stopChatPolling(); router.go('/chats')" aria-label="${t('ch_back')}"><i class="fa-solid fa-arrow-left"></i></button>
      <div id="chat-header-info" class="ch-who"><div class="spinner" style="width:20px;height:20px;margin:0"></div></div>
    </div>
    <div id="chat-product"></div>
    <div class="ch-msgs" id="chat-messages"><div class="spinner" style="margin:40px auto"></div></div>
    <div class="ch-input" id="chat-input-bar" style="display:none">
      <button class="ch-icon-btn" id="chat-attach-btn" title="${t('ch_attach')}" aria-label="${t('ch_attach')}"><i class="fa-solid fa-paperclip"></i></button>
      <input type="file" id="chat-file-input" accept="image/*" hidden />
      <input type="text" id="chat-input" placeholder="${t('ch_ph')}" maxlength="5000" aria-label="${t('ch_ph')}" />
      <button class="ch-send" id="chat-send-btn" title="${t('ch_send')}" aria-label="${t('ch_send')}"><i class="fa-solid fa-paper-plane"></i></button>
    </div>`, true));

  loadChatsList(chatId);

  // Правила чата — один раз за сеанс на каждую переписку
  const warningKey = `chat_warning_shown_${chatId}`;
  if (!sessionStorage.getItem(warningKey)) {
    showChatWarningModal();
    sessionStorage.setItem(warningKey, '1');
  }

  try {
    const chat = await API.getChat(chatId);
    renderChatHeader(chat);
    await loadMessages(chatId);
    setupChatInput(chatId, chat);
    startChatPolling(chatId);
  } catch (e) {
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = `<div class="ch-empty"><p><i class="fa-solid fa-triangle-exclamation"></i> ${escHtml(e.message)}</p></div>`;
  }
}

function renderChatHeader(chat) {
  const user = Auth.getUser();
  const other = chatOther(chat);
  const name = escHtml(other.name || '—');
  const about = chat.order_id ? `${t('ch_order')} #${chat.order_id}` : t('ch_inquiry');

  let actionsHtml = '';
  if (other.phone) {
    actionsHtml += `<a class="ch-icon-btn" href="tel:${escHtml(other.phone)}" title="${t('ch_call')}" aria-label="${t('ch_call')}"><i class="fa-solid fa-phone"></i></a>`;
  }
  // Покупатель в чате с водителем → «Выбрать этого водителя»
  if (chat.type === 'buyer_driver' && user.role === 'xaridor' && !chat.delivery_request_id) {
    actionsHtml += `<button class="btn btn-primary btn-sm" id="btn-assign-driver" onclick="assignDriverFromChat(${chat.order_id}, ${chat.id})"><i class="fa-solid fa-check"></i> ${t('ch_assign_driver')}</button>`;
  }
  // Водитель в чате с покупателем → «Написать фермеру»
  if (chat.type === 'buyer_driver' && user.role === 'courier') {
    actionsHtml += `<button class="btn btn-outline btn-sm" id="btn-chat-farmer" onclick="startDriverFarmerChat(${chat.order_id})"><i class="fa-regular fa-comment"></i> ${t('ch_chat_farmer')}</button>`;
  }

  document.getElementById('chat-header-info').outerHTML = `
    <span class="ch-ava">${name[0] || '?'}</span>
    <div class="ch-who">
      <div class="ch-name">${name}</div>
      <div class="ch-sub">${chatRoleLabel(other.role)} · ${about}</div>
    </div>
    <div class="ch-conv-actions">${actionsHtml}</div>`;

  // Карточка товара, о котором переписка
  const box = document.getElementById('chat-product');
  if (box && chat.order_product_title) {
    const photo = chat.order_product_photo
      ? (chat.order_product_photo.startsWith('http') ? chat.order_product_photo : BASE_URL + chat.order_product_photo) : '';
    const price = chat.product_price != null
      ? `${fmtNum(chat.product_price)} ${t('currency')}/${unitLabel(chat.product_unit)}` : '';
    box.innerHTML = `
      <div class="ch-product" ${chat.product_id ? `onclick="router.go('/product/${chat.product_id}')" title="${t('ch_open_product')}"` : ''}>
        ${photo ? `<img src="${photo}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'ch-pimg',innerHTML:'<i class=&quot;fa-solid fa-leaf&quot;></i>'}))" />` : `<span class="ch-pimg"><i class="fa-solid fa-leaf"></i></span>`}
        <div>
          <b>${escHtml(chat.order_product_title)}</b>
          ${price ? `<div class="ch-pprice">${price}</div>` : ''}
          ${chat.product_location ? `<div><i class="fa-solid fa-location-dot"></i> ${escHtml(chat.product_location)}</div>` : ''}
        </div>
      </div>`;
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
      container.innerHTML = `<div class="ch-empty"><i class="fa-regular fa-comment-dots"></i><p>${t('ch_start')}</p></div>`;
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

async function softRefreshChat(chatId) {
  if (_chatIsRefreshing) return;
  const container = document.getElementById('chat-messages');
  if (!container) return;

  _chatIsRefreshing = true;
  try {
    const messages = await API.getChatMessages(chatId, { limit: 50 });
    if (!messages?.length) {
      _chatIsRefreshing = false;
      return;
    }

    const user = Auth.getUser();
    const html = messages.map(m => messageHtml(m, m.sender_id === user.id)).join('');

    // Сохраняем состояние до обновления
    const input = document.getElementById('chat-input');
    const savedValue = input ? input.value : '';
    const savedSelectionStart = input ? input.selectionStart : 0;
    const savedSelectionEnd = input ? input.selectionEnd : 0;
    const wasAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    const prevScrollTop = container.scrollTop;

    // Обновляем DOM
    container.innerHTML = html;

    // Восстанавливаем скролл
    if (wasAtBottom) {
      container.scrollTop = container.scrollHeight;
    } else {
      container.scrollTop = prevScrollTop;
    }

    // Восстанавливаем ввод
    if (input && savedValue) {
      input.value = savedValue;
      try {
        input.setSelectionRange(savedSelectionStart, savedSelectionEnd);
      } catch (_) {}
    }

    // Обновляем last ID
    if (messages.length) {
      _chatLastMessageId = Math.max(...messages.map(m => m.id));
    }
  } catch (e) {
    // тихий fail
  } finally {
    _chatIsRefreshing = false;
  }
}

function messageHtml(msg, isOwn) {
  if (msg.is_blocked) {
    return `
      <div class="msg-bubble msg-blocked">
        <div class="msg-blocked-text"><i class="fa-solid fa-triangle-exclamation"></i> ${t('ch_blocked')}</div>
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
    contentHtml = `<div class="msg-voice"><i class="fa-solid fa-play"></i> ${t('ch_voice')}</div>`;
  } else if (msg.type === 'location') {
    try {
      const loc = JSON.parse(msg.content);
      contentHtml = `<div class="msg-location"><i class="fa-solid fa-location-dot"></i> ${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)}</div>`;
    } catch {
      contentHtml = `<div class="msg-text">${escapeHtml(msg.content)}</div>`;
    }
  }

  const time = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

  return `
    <div class="msg-bubble ${isOwn ? 'msg-own' : 'msg-other'}">
      ${!isOwn ? `<div class="msg-sender">${escHtml(msg.sender_name)}</div>` : ''}
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
      showToast(t('ch_no_phones'), 'warn');
      return;
    }

    input.value = '';
    try {
      await API.sendMessage(chatId, { type: 'text', content: text });
      await loadMessages(chatId);
      loadChatsList(chatId);
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
  stopChatPolling();
  _chatCurrentId = chatId;

  // Soft-refresh: подтягиваем новые сообщения каждые 2 сек
  _chatPollTimer = setInterval(() => {
    // ушли со страницы переписки — перестаём опрашивать сервер
    if (!location.hash.startsWith('#/chats/')) { stopChatPolling(); return; }
    if (_chatCurrentId) softRefreshChat(_chatCurrentId);
  }, 2000);

  // WebSocket — при получении сообщения тоже обновляем
  function onNewMessage(data) {
    loadChatsList(_chatCurrentId);
    if (data.chat_id != _chatCurrentId) return;
    const user = Auth.getUser();
    const msg = data.message;
    if (!msg || msg.sender_id === user?.id) return;
    softRefreshChat(_chatCurrentId);
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
  window._chatCurrentIdPublic = null;
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
  openSheet('chat-rules', t('ch_rules_title'), `
    <p style="font-size:17px;color:var(--ink-2)">${t('ch_rules_text')}</p>
    <p style="font-size:17px;color:var(--ink);font-weight:700"><i class="fa-solid fa-triangle-exclamation" style="color:var(--sun)"></i> ${t('ch_no_phones')}</p>
    <button class="btn btn-primary btn-lg btn-full" onclick="closeSheet()">${t('ch_rules_ok')}</button>`);
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
