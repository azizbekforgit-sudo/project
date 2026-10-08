/* pages/ai.js — AI yordamchi: floating bubble + modal + full page */

function aiSuggestions(isFarmer) {
  const lang = I18nManager.current;
  const F = {
    uz: ["Bu bahorda nima ekish foydali?", "Pomidorga qancha narx qo\u2019yay?", "Mahsulotlarim sotuvini qanday oshiraman?"],
    ru: ['Что выгодно сажать этой весной?', 'Какую цену поставить на помидоры?', 'Как увеличить продажи моих товаров?'],
    en: ['What is profitable to plant this spring?', 'What price to set for tomatoes?', 'How to increase my product sales?'],
  };
  const B = {
    uz: ["Mavsumiy yangi sabzavotlarni tavsiya qil", "Fermer mahsulotidan nima tayyorlash mumkin?", "Bir haftaga savatcha tuzib ber"],
    ru: ['Посоветуй свежие сезонные овощи', 'Что приготовить из фермерских продуктов?', 'Собери корзину на неделю'],
    en: ['Suggest fresh seasonal vegetables', 'What to cook from farm products?', 'Build a cart for a week'],
  };
  return (isFarmer ? F : B)[lang] || (isFarmer ? F.uz : B.uz);
}

/* ============================================================
   FULL PAGE — /ai route → beautiful standalone AI page
   ============================================================ */
function renderAI() {
  const app = document.getElementById('app');
  const isFarmer = Auth.isFarmer();
  const suggestions = aiSuggestions(isFarmer);

  app.innerHTML = pageShell(`
    <div class="ai-page-wrap">
      <div class="ai-page-hero">
        <div class="ai-hero-glow"></div>
        <div class="ai-hero-orb"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <h1 class="ai-hero-title">${t('ai_promo_title')}</h1>
        <p class="ai-hero-sub">${isFarmer ? t('ai_farmer_help') : t('ai_buyer_help')}</p>
        <span class="ai-hero-badge"><span class="ai-dot"></span> ${t('ai_beta')}</span>
      </div>
      <div class="ai-page-body">
        <div class="ai-chat" id="ai-page-chat">
          <div class="ai-msg bot">
            <div class="ai-ava"><i class="fa-solid fa-robot"></i></div>
            <div class="ai-bubble">
              ${t('ai_greeting')}<br>
              ${isFarmer ? t('ai_farmer_help') : t('ai_buyer_help')}
              <br><br><i class="ai-soon">${t('ai_learning')}</i>
            </div>
          </div>
        </div>
        <div class="ai-suggest" id="ai-page-suggest">
          ${suggestions.map(s => `<button class="ai-chip" onclick="aiSend('${s.replace(/'/g,"\\'")}','page')">${s}</button>`).join('')}
        </div>
        <div class="ai-input-bar page">
          <input type="text" id="ai-page-input" placeholder="${t('ai_msg_placeholder')}" onkeydown="if(event.key==='Enter')aiSend(null,'page')" />
          <button class="ai-send" onclick="aiSend(null,'page')"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    </div>
  `);
}

/* ============================================================
   AI BACKEND CONFIG
   Ключ ИИ хранится ТОЛЬКО на backend (переменная окружения
   GEMINI_API_KEY на сервере). Фронт обращается к нашему собственному
   эндпоинту /api/ai/chat, который проксирует запрос к xAI.
   ============================================================ */
function _aiBackendBase() {
  // тот же сервер, что и у всего сайта (api.js) — раньше здесь был старый адрес Railway
  return typeof BASE_URL !== 'undefined' ? BASE_URL : '';
}
/* Ответ ИИ — это текст, не HTML: сначала экранируем, потом простая разметка */
function aiEsc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function aiFormat(text) {
  return aiEsc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/^\s*[-*•]\s+/gm, '• ')
    .replace(/\n/g, '<br>');
}

function _aiChatUrl() {
  return _aiBackendBase() + '/api/ai/chat';
}

// Chat history per context
if (!window._aiHistory) window._aiHistory = { page: [], fab: [], modal: [] };

/* ============================================================
   SHARED SEND LOGIC
   ============================================================ */
async function aiSend(text, context) {
  // context: 'page' | 'fab' | 'modal'
  const chatId   = context === 'page'  ? 'ai-page-chat'    : context === 'fab' ? 'ai-fab-chat-msgs' : 'ai-modal-chat';
  const inputId  = context === 'page'  ? 'ai-page-input'   : context === 'fab' ? 'ai-fab-input'     : 'ai-modal-input';
  const suggestId= context === 'page'  ? 'ai-page-suggest' : context === 'fab' ? 'ai-fab-suggest'   : 'ai-modal-suggest';

  const input = document.getElementById(inputId);
  const msg = (text || input?.value || '').trim();
  if (!msg) return;
  const chat = document.getElementById(chatId);
  if (!chat) return;
  if (input) input.value = '';
  document.getElementById(suggestId)?.classList.add('hidden');

  // Show user message
  chat.insertAdjacentHTML('beforeend', `
    <div class="ai-msg user"><div class="ai-bubble">${aiEsc(msg)}</div></div>
  `);
  chat.scrollTop = chat.scrollHeight;

  // Save to history
  if (!window._aiHistory[context]) window._aiHistory[context] = [];
  window._aiHistory[context].push({ role: 'user', content: msg });

  // Show typing indicator
  const typingId = 'ai-typing-' + (context || 'x');
  chat.insertAdjacentHTML('beforeend', `
    <div class="ai-msg bot" id="${typingId}">
      <div class="ai-ava"><i class="fa-solid fa-robot"></i></div>
      <div class="ai-bubble"><span class="ai-typing-dots"><i></i><i></i><i></i></span></div>
    </div>
  `);
  chat.scrollTop = chat.scrollHeight;

  try {
    const lang = (typeof I18nManager !== 'undefined' && I18nManager.current) || 'ru';
    const token = localStorage.getItem('access_token');

    const res = await fetch(_aiChatUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        messages: window._aiHistory[context].slice(-10), // last 10 messages for context
        lang
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(typeof data.detail === 'string' ? data.detail : `API error: ${res.status}`);
      e.friendly = typeof data.detail === 'string';
      throw e;
    }
    const reply = data.reply || '...';

    // Save AI reply to history
    window._aiHistory[context].push({ role: 'assistant', content: reply });

    document.getElementById(typingId)?.remove();
    chat.insertAdjacentHTML('beforeend', `
      <div class="ai-msg bot">
        <div class="ai-ava"><i class="fa-solid fa-robot"></i></div>
        <div class="ai-bubble">${aiFormat(reply)}</div>
      </div>
    `);
  } catch (err) {
    document.getElementById(typingId)?.remove();
    const errMsg = err.friendly ? aiEsc(err.message) : (typeof t === 'function' ? (t('ai_error') || 'Xatolik yuz berdi. Qayta urinib ko\'ring.') : 'Ошибка. Попробуйте ещё раз.');
    chat.insertAdjacentHTML('beforeend', `
      <div class="ai-msg bot">
        <div class="ai-ava"><i class="fa-solid fa-robot"></i></div>
        <div class="ai-bubble" style="color:#e74c3c">${errMsg}</div>
      </div>
    `);
    console.error('AI chat error:', err);
  }

  chat.scrollTop = chat.scrollHeight;
}

/* ============================================================
   FLOATING BUBBLE — corner chat widget
   ============================================================ */
function initAIBubble() {
  if (document.getElementById('ai-fab-container')) return;
  const user = Auth.getUser();
  if (!user || user.role === 'admin') return;

  const container = document.createElement('div');
  container.id = 'ai-fab-container';
  container.innerHTML = `
    <div id="ai-fab-chat" class="ai-fab-chat" style="display:none">
      <div class="ai-fab-head">
        <div class="ai-fab-head-left">
          <div class="ai-orb sm"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
          <div>
            <div class="ai-fab-name">${t('ai_promo_title')}</div>
            <div class="ai-status"><span class="ai-dot"></span> ${t('ai_beta')}</div>
          </div>
        </div>
        <div class="ai-fab-actions">
          <button class="ai-fab-min" onclick="minimizeAIBubble()" title="Yopish"><i class="fa-solid fa-minus"></i></button>
        </div>
      </div>
      <div class="ai-chat" id="ai-fab-chat-msgs" style="max-height:280px;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px">
        <div class="ai-msg bot">
          <div class="ai-ava sm"><i class="fa-solid fa-robot"></i></div>
          <div class="ai-bubble">${t('ai_greeting')}</div>
        </div>
      </div>
      <div class="ai-suggest fab-suggest" id="ai-fab-suggest">
        ${aiSuggestions(user?.role === 'fermer').map(s => `<button class="ai-chip sm" onclick="aiSend('${s.replace(/'/g,"\\'")}','fab')">${s}</button>`).join('')}
      </div>
      <div class="ai-input-bar fab">
        <input type="text" id="ai-fab-input" placeholder="${t('ai_msg_placeholder')}" onkeydown="if(event.key==='Enter')aiSend(null,'fab')" />
        <button class="ai-send sm" onclick="aiSend(null,'fab')"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>
    <button id="ai-fab-btn" class="ai-fab-btn" onclick="toggleAIBubble()">
      <i class="fa-solid fa-message"></i>
      <span class="ai-fab-label">AI</span>
    </button>
  `;
  document.body.appendChild(container);
}

function toggleAIBubble() {
  const chat = document.getElementById('ai-fab-chat');
  const btn = document.getElementById('ai-fab-btn');
  if (!chat) return;
  const isOpen = chat.style.display !== 'none';
  chat.style.display = isOpen ? 'none' : 'flex';
  chat.classList.toggle('open', !isOpen);
  btn.classList.toggle('active', !isOpen);
}

function minimizeAIBubble() {
  const chat = document.getElementById('ai-fab-chat');
  const btn = document.getElementById('ai-fab-btn');
  if (chat) { chat.style.display = 'none'; chat.classList.remove('open'); }
  if (btn) btn.classList.remove('active');
}

/* ============================================================
   MODAL (from navbar) — opens FAB bubble OR creates modal
   ============================================================ */
function openAiModal() {
  // If FAB bubble exists — just open it (same UI, no duplicate)
  const fab = document.getElementById('ai-fab-chat');
  if (fab) {
    fab.style.display = 'flex';
    fab.classList.add('open');
    const btn = document.getElementById('ai-fab-btn');
    if (btn) btn.classList.add('active');
    // scroll into chat
    const fabContainer = document.getElementById('ai-fab-container');
    if (fabContainer) fabContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
    setTimeout(() => document.getElementById('ai-fab-input')?.focus(), 100);
    return;
  }

  // Fallback: create standalone modal (no FAB on page yet)
  if (document.getElementById('ai-modal')) return;
  const isFarmer = Auth.isFarmer();
  const suggestions = aiSuggestions(isFarmer);
  const overlay = document.createElement('div');
  overlay.id = 'ai-modal';
  overlay.className = 'ai-modal-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) closeAiModal(); };
  overlay.innerHTML = `
    <div class="ai-modal">
      <div class="ai-modal-head">
        <div class="ai-orb sm"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="ai-modal-titles">
          <h3>${t('ai_promo_title')}</h3>
          <span class="ai-status"><span class="ai-dot"></span> ${t('ai_beta')}</span>
        </div>
        <button class="ai-modal-x" onclick="closeAiModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="ai-chat" id="ai-modal-chat">
        <div class="ai-msg bot">
          <div class="ai-ava"><i class="fa-solid fa-robot"></i></div>
          <div class="ai-bubble">
            ${t('ai_greeting')}<br>
            ${isFarmer ? t('ai_farmer_help') : t('ai_buyer_help')}
            <br><br><i class="ai-soon">${t('ai_learning')}</i>
          </div>
        </div>
      </div>
      <div class="ai-suggest" id="ai-modal-suggest">
        ${suggestions.map(s => `<button class="ai-chip" onclick="aiSend('${s.replace(/'/g,"\\'")}','modal')">${s}</button>`).join('')}
      </div>
      <div class="ai-input-bar">
        <input type="text" id="ai-modal-input" placeholder="${t('ai_msg_placeholder')}" onkeydown="if(event.key==='Enter')aiSend(null,'modal')" />
        <button class="ai-send" onclick="aiSend(null,'modal')"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  setTimeout(() => document.getElementById('ai-modal-input')?.focus(), 100);
}

function closeAiModal() {
  const o = document.getElementById('ai-modal');
  if (!o) return;
  o.classList.remove('show');
  setTimeout(() => o.remove(), 200);
}

window.openAiModal = openAiModal;
window.closeAiModal = closeAiModal;
window.renderAI = renderAI;
window.aiSend = aiSend;
window.initAIBubble = initAIBubble;
window.toggleAIBubble = toggleAIBubble;
window.minimizeAIBubble = minimizeAIBubble;