/* pages/product-new.js — redesigned with animations */

function renderProductNew() {
  if (!Auth.isFarmer()) { router.go('/'); return; }

  const app = document.getElementById('app');

  const categories = [
    { value: 'Овощи',    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12s1-3 4-3 4 3 4 3"/></svg>`, labelKey: 'cat_vegetables' },
    { value: 'Фрукты',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="14" r="7"/><path d="M12 7V3M9 5c0-1.5 3-3 3-3s3 1.5 3 3"/></svg>`, labelKey: 'cat_fruits' },
    { value: 'Зелень',   icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V12M12 12C12 7 7 4 2 5c0 5 3 9 10 7M12 12c0-5 5-8 10-7-1 5-4 9-10 7"/></svg>`, labelKey: 'cat_greens' },
    { value: 'Зерновые', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V8M12 8C10 4 6 3 3 5c1 4 5 7 9 5M12 8c2-4 6-5 9-3-1 4-5 7-9 5"/></svg>`, labelKey: 'cat_grains' },
    { value: 'Молочные', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 2h8l1 4H7L8 2z"/><rect x="5" y="6" width="14" height="16" rx="2"/><path d="M9 12h6M9 16h4"/></svg>`, labelKey: 'cat_dairy' },
    { value: 'Мёд',      icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 6h5l-4 4 2 6-6-3-6 3 2-6-4-4h5z"/></svg>`, labelKey: 'cat_honey' },
  ];

  // Inject styles
  if (!document.getElementById('pn-styles')) {
    const s = document.createElement('style');
    s.id = 'pn-styles';
    s.textContent = `
      .pn-page {
        max-width: 1100px; margin: 0 auto;
        padding: 32px 20px 80px;
        animation: pnFadeIn 0.45s cubic-bezier(0.22,1,0.36,1) both;
      }
      @keyframes pnFadeIn {
        from { opacity: 0; transform: translateY(22px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* Header */
      .pn-header {
        display: flex; align-items: flex-start; gap: 20px;
        margin-bottom: 36px;
      }
      .pn-back-btn {
        display: flex; align-items: center; gap: 8px;
        background: #f0fdf4; border: 1px solid rgba(16,185,129,0.2);
        color: #059669; border-radius: 10px; padding: 10px 16px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        transition: all 0.2s ease; white-space: nowrap; flex-shrink: 0;
      }
      .pn-back-btn:hover { background: #d1fae5; transform: translateX(-3px); }
      .pn-back-btn svg { width: 16px; height: 16px; }
      .pn-header-text h1 {
        font-size: clamp(22px, 4vw, 30px); font-weight: 800;
        color: #0f1f12; margin: 0 0 6px; line-height: 1.2;
      }
      .pn-header-text p { color: #6b7280; font-size: 15px; margin: 0; }

      /* Layout */
      .pn-layout {
        display: grid;
        grid-template-columns: 1fr 320px;
        gap: 24px; align-items: start;
      }
      @media (max-width: 860px) {
        .pn-layout { grid-template-columns: 1fr; }
        .pn-aside { order: -1; }
      }

      /* Cards */
      .pn-card {
        background: #fff;
        border: 1px solid rgba(16,185,129,0.15);
        border-radius: 16px; padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 2px 16px rgba(16,185,129,0.06);
        transition: box-shadow 0.3s ease;
      }
      .pn-card:hover { box-shadow: 0 4px 28px rgba(16,185,129,0.12); }
      .pn-card-title {
        display: flex; align-items: center; gap: 10px;
        font-size: 14px; font-weight: 700; color: #059669;
        text-transform: uppercase; letter-spacing: 0.5px;
        margin-bottom: 20px; padding-bottom: 14px;
        border-bottom: 1px solid rgba(16,185,129,0.1);
      }
      .pn-card-title svg { width: 18px; height: 18px; flex-shrink: 0; }

      /* Form fields */
      .pn-field { margin-bottom: 18px; }
      .pn-field label {
        display: block; font-size: 13px; font-weight: 600;
        color: #374151; margin-bottom: 7px;
      }
      .pn-field label .req { color: #10b981; margin-left: 2px; }
      .pn-input {
        width: 100%; padding: 11px 14px;
        border: 1.5px solid #e5e7eb;
        border-radius: 10px; font-size: 14px; color: #0f1f12;
        background: #fafafa;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        outline: none; font-family: inherit;
      }
      .pn-input:focus {
        border-color: #10b981;
        box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
        background: #fff;
      }
      .pn-input.error { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
      .pn-input.success { border-color: #10b981; }
      textarea.pn-input { resize: vertical; min-height: 100px; }
      select.pn-input { cursor: pointer; }
      .pn-hint { font-size: 12px; color: #9ca3af; margin-top: 5px; display: block; }

      /* Price row */
      .pn-price-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 500px) { .pn-price-row { grid-template-columns: 1fr; } }
      .pn-input-wrap { position: relative; }
      .pn-input-wrap .pn-input { padding-right: 52px; }
      .pn-suffix {
        position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
        font-size: 13px; font-weight: 600; color: #9ca3af; pointer-events: none;
      }

      /* Category chips */
      .pn-cat-grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
      }
      @media (max-width: 500px) { .pn-cat-grid { grid-template-columns: repeat(2, 1fr); } }
      .pn-cat-chip {
        display: flex; flex-direction: column; align-items: center; gap: 8px;
        padding: 14px 8px;
        border: 1.5px solid #e5e7eb; border-radius: 12px;
        cursor: pointer; font-size: 13px; font-weight: 600; color: #374151;
        background: #fafafa;
        transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
        text-align: center;
        user-select: none;
      }
      .pn-cat-chip svg { width: 24px; height: 24px; color: #9ca3af; transition: color 0.2s ease; }
      .pn-cat-chip:hover {
        border-color: #10b981; background: #f0fdf4; color: #059669;
        transform: translateY(-2px);
      }
      .pn-cat-chip:hover svg { color: #10b981; }
      .pn-cat-chip.active {
        border-color: #10b981; background: #f0fdf4; color: #059669;
        box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
        transform: scale(1.04);
      }
      .pn-cat-chip.active svg { color: #10b981; }
      .pn-cat-chip.error-pulse { animation: errPulse 0.5s ease; border-color: #ef4444; }
      @keyframes errPulse {
        0%,100% { transform: translateX(0); }
        25%      { transform: translateX(-4px); }
        75%      { transform: translateX(4px); }
      }

      /* Dropzone */
      .pn-dropzone {
        border: 2px dashed rgba(16,185,129,0.35);
        border-radius: 14px; padding: 32px 20px;
        text-align: center; cursor: pointer;
        background: #fafffe;
        transition: all 0.25s ease;
      }
      .pn-dropzone:hover, .pn-dropzone.dragover {
        border-color: #10b981; background: #f0fdf4;
        box-shadow: 0 0 0 4px rgba(16,185,129,0.08);
      }
      .pn-upload-icon {
        width: 44px; height: 44px; margin: 0 auto 12px;
        background: linear-gradient(135deg,#10b981,#059669);
        border-radius: 12px; display: flex; align-items: center;
        justify-content: center; color: #fff;
      }
      .pn-upload-icon svg { width: 22px; height: 22px; }
      .pn-drop-title { font-size: 15px; font-weight: 700; color: #0f1f12; margin: 0 0 4px; }
      .pn-drop-hint  { font-size: 13px; color: #9ca3af; margin: 0 0 16px; }
      .pn-choose-btn {
        display: inline-flex; align-items: center; gap: 7px;
        background: #fff; border: 1.5px solid rgba(16,185,129,0.4);
        color: #059669; border-radius: 8px; padding: 8px 18px;
        font-size: 13px; font-weight: 600; cursor: pointer;
        transition: all 0.2s ease;
      }
      .pn-choose-btn:hover { background: #f0fdf4; border-color: #10b981; }
      .pn-choose-btn svg { width: 15px; height: 15px; }

      /* Previews */
      .pn-previews { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
      .pn-preview-item {
        width: 80px; height: 80px; border-radius: 10px; overflow: hidden;
        border: 2px solid rgba(16,185,129,0.25);
        animation: previewPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
        position: relative;
      }
      @keyframes previewPop {
        from { opacity: 0; transform: scale(0.7); }
        to   { opacity: 1; transform: scale(1); }
      }
      .pn-preview-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .pn-preview-count {
        font-size: 12px; color: #059669; font-weight: 600;
        margin-top: 8px; text-align: center;
      }

      /* Aside */
      .pn-aside { display: flex; flex-direction: column; gap: 16px; }

      /* Tip card */
      .pn-tip-card {
        background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
        border: 1px solid rgba(16,185,129,0.2);
        border-radius: 16px; padding: 22px;
      }
      .pn-tip-icon {
        width: 42px; height: 42px; border-radius: 12px;
        background: linear-gradient(135deg,#10b981,#059669);
        display: flex; align-items: center; justify-content: center;
        color: #fff; margin-bottom: 14px;
      }
      .pn-tip-icon svg { width: 22px; height: 22px; }
      .pn-tip-card h4 { font-size: 15px; font-weight: 700; color: #0f1f12; margin: 0 0 12px; }
      .pn-tip-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 9px; }
      .pn-tip-list li { display: flex; align-items: flex-start; gap: 9px; font-size: 13px; color: #374151; line-height: 1.4; }
      .pn-tip-check { flex-shrink: 0; width: 18px; height: 18px; background: rgba(16,185,129,0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
      .pn-tip-check svg { width: 10px; height: 10px; color: #10b981; }

      /* Moderation card */
      .pn-mod-card {
        background: #fffbeb; border: 1px solid rgba(245,158,11,0.25);
        border-radius: 14px; padding: 16px;
        display: flex; gap: 12px; align-items: flex-start;
      }
      .pn-mod-icon { flex-shrink: 0; color: #d97706; margin-top: 2px; }
      .pn-mod-icon svg { width: 20px; height: 20px; }
      .pn-mod-card b { font-size: 13px; font-weight: 700; color: #92400e; display: block; margin-bottom: 3px; }
      .pn-mod-card p { font-size: 12px; color: #b45309; margin: 0; line-height: 1.4; }

      /* Submit button */
      .pn-submit-btn {
        width: 100%; padding: 15px;
        background: linear-gradient(135deg,#10b981,#059669);
        color: #fff; border: none; border-radius: 12px;
        font-size: 15px; font-weight: 700; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 10px;
        transition: all 0.25s ease; position: relative; overflow: hidden;
        box-shadow: 0 4px 20px rgba(16,185,129,0.35);
      }
      .pn-submit-btn svg { width: 18px; height: 18px; }
      .pn-submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 32px rgba(16,185,129,0.5);
        filter: brightness(1.06);
      }
      .pn-submit-btn:active:not(:disabled) { transform: scale(0.98); }
      .pn-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
      .pn-submit-btn::after {
        content: ''; position: absolute;
        top: 0; left: -100%; width: 60%; height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent);
        transform: skewX(-20deg);
      }
      .pn-submit-btn:hover::after { animation: shimmer 0.55s ease forwards; }
      @keyframes shimmer { 0% { left:-100%; } 100% { left:160%; } }

      /* Spinner */
      .pn-spin { animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* Error box */
      .pn-err {
        background: #fef2f2; border: 1px solid rgba(239,68,68,0.25);
        color: #dc2626; border-radius: 10px; padding: 12px 16px;
        font-size: 13px; font-weight: 500; margin-bottom: 16px;
        display: flex; align-items: center; gap: 10px;
        animation: errSlide 0.3s ease;
      }
      @keyframes errSlide { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
      .pn-err svg { flex-shrink: 0; width: 16px; height: 16px; }
      .pn-err.hidden { display: none; }

      /* Char counter */
      .pn-char-count { font-size: 12px; color: #9ca3af; float: right; }
    `;
    document.head.appendChild(s);
  }

  // SVG helpers
  const iconArrowLeft = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>`;
  const iconInfo      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`;
  const iconMoney     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM6 10h.01M18 10h.01"/></svg>`;
  const iconPhoto     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M9 5l1-2h4l1 2"/></svg>`;
  const iconUpload    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
  const iconPicture   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  const iconSend      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  const iconStar      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const iconCheck     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
  const iconWarn      = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const iconClock     = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
  const iconSpinner   = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pn-spin"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-opacity="1"/></svg>`;

  app.innerHTML = pageShell(`
    <div class="pn-page">
      <div class="pn-header">
        <button class="pn-back-btn" onclick="router.go('/profile')">
          ${iconArrowLeft} ${t('back')}
        </button>
        <div class="pn-header-text">
          <h1>${t('pn_title')}</h1>
          <p>${t('pn_subtitle')}</p>
        </div>
      </div>

      <div class="pn-layout">
        <div class="pn-form-col">
          <div id="pn-error" class="pn-err hidden">${iconWarn} <span id="pn-error-text"></span></div>

          <!-- Basic info -->
          <div class="pn-card">
            <div class="pn-card-title">${iconInfo} ${t('pn_basic_info')}</div>

            <div class="pn-field">
              <label>${t('pn_name')} <span class="req">*</span></label>
              <input type="text" id="pn-name" placeholder="${t('pn_name_ph')}" class="pn-input" maxlength="120" />
            </div>

            <div class="pn-field">
              <label>${t('pn_category')} <span class="req">*</span></label>
              <div class="pn-cat-grid" id="pn-cat-grid">
                ${categories.map(c => `
                  <div class="pn-cat-chip" data-value="${c.value}" onclick="selectPnCat(this)">
                    ${c.icon}
                    <span>${t(c.labelKey)}</span>
                  </div>
                `).join('')}
              </div>
              <input type="hidden" id="pn-category" />
            </div>

            <div class="pn-field">
              <label>
                ${t('pn_desc')} <span class="req">*</span>
                <span class="pn-char-count" id="pn-desc-count">0/500</span>
              </label>
              <textarea id="pn-description" placeholder="${t('pn_desc_ph')}" class="pn-input pn-textarea" maxlength="500"></textarea>
              <span class="pn-hint">${t('pn_desc_hint')}</span>
            </div>
          </div>

          <!-- Price -->
          <div class="pn-card">
            <div class="pn-card-title">${iconMoney} ${t('pn_price_section')}</div>
            <div class="pn-price-row">
              <div class="pn-field">
                <label>${t('pn_price')} <span class="req">*</span></label>
                <div class="pn-input-wrap">
                  <input type="number" id="pn-price" placeholder="0" min="0" step="0.01" class="pn-input" />
                  <span class="pn-suffix">${t('currency') || 'сум'}</span>
                </div>
              </div>
              <div class="pn-field">
                <label>${t('pn_unit')}</label>
                <select id="pn-unit" class="pn-input">
                  <option value="кг">${t('unit_kg')}</option>
                  <option value="шт">${t('unit_pcs')}</option>
                  <option value="литр">${t('unit_litre')}</option>
                  <option value="г">${t('unit_gram')}</option>
                </select>
              </div>
            </div>
            <div class="pn-field" style="max-width:220px">
              <label>${t('pn_qty')} <span class="req">*</span></label>
              <input type="number" id="pn-quantity" placeholder="0" min="0" class="pn-input" />
            </div>
          </div>

          <!-- Photos -->
          <div class="pn-card">
            <div class="pn-card-title">${iconPhoto} ${t('pn_photos')}</div>
            <div class="pn-dropzone" id="upload-zone">
              <input type="file" id="pn-images" multiple accept="image/*" style="display:none" />
              <div class="pn-upload-icon">${iconUpload}</div>
              <p class="pn-drop-title">${t('pn_drop')}</p>
              <p class="pn-drop-hint">${t('pn_drop_hint')}</p>
              <button type="button" class="pn-choose-btn" onclick="document.getElementById('pn-images').click();event.stopPropagation()">
                ${iconPicture} ${t('pn_choose_files')}
              </button>
            </div>
            <div id="image-previews" class="pn-previews"></div>
            <div id="pn-photo-count" class="pn-preview-count" style="display:none"></div>
          </div>
        </div>

        <!-- Aside -->
        <div class="pn-aside">
          <div class="pn-tip-card">
            <div class="pn-tip-icon">${iconStar}</div>
            <h4>${t('pn_tip_title')}</h4>
            <ul class="pn-tip-list">
              <li><div class="pn-tip-check">${iconCheck}</div> ${t('pn_tip_1')}</li>
              <li><div class="pn-tip-check">${iconCheck}</div> ${t('pn_tip_2')}</li>
              <li><div class="pn-tip-check">${iconCheck}</div> ${t('pn_tip_3')}</li>
              <li><div class="pn-tip-check">${iconCheck}</div> ${t('pn_tip_4')}</li>
            </ul>
          </div>

          <div class="pn-mod-card">
            <div class="pn-mod-icon">${iconClock}</div>
            <div>
              <b>${t('pn_moderation_title')}</b>
              <p>${t('pn_moderation_desc')}</p>
            </div>
          </div>

          <button class="pn-submit-btn" id="publish-btn">
            ${iconSend} ${t('pn_publish')}
          </button>
        </div>
      </div>
    </div>
  `);

  // Category select
  window.selectPnCat = function(el) {
    document.querySelectorAll('.pn-cat-chip').forEach(c => c.classList.remove('active', 'error-pulse'));
    el.classList.add('active');
    document.getElementById('pn-category').value = el.dataset.value;
  };

  // Char counter for description
  const descEl = document.getElementById('pn-description');
  const countEl = document.getElementById('pn-desc-count');
  descEl?.addEventListener('input', () => {
    const len = descEl.value.length;
    countEl.textContent = `${len}/500`;
    countEl.style.color = len > 450 ? '#ef4444' : '#9ca3af';
    descEl.classList.remove('error');
  });

  // Image preview
  const fileInput = document.getElementById('pn-images');
  const previewsEl = document.getElementById('image-previews');
  const photoCount = document.getElementById('pn-photo-count');

  fileInput?.addEventListener('change', () => {
    previewsEl.innerHTML = '';
    const files = Array.from(fileInput.files).slice(0, 10);
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wrap = document.createElement('div');
        wrap.className = 'pn-preview-item';
        wrap.style.animationDelay = `${i * 0.05}s`;
        const img = document.createElement('img');
        img.src = e.target.result;
        wrap.appendChild(img);
        previewsEl.appendChild(wrap);
      };
      reader.readAsDataURL(file);
    });
    if (files.length > 0) {
      photoCount.style.display = 'block';
      photoCount.textContent = `${files.length} ${t('pn_photos_selected') || 'фото выбрано'}`;
    } else {
      photoCount.style.display = 'none';
    }
  });

  // Drag & drop
  const zone = document.getElementById('upload-zone');
  zone?.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone?.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    const dt = e.dataTransfer;
    if (dt.files.length) {
      // Use DataTransfer to set files
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
  zone?.addEventListener('click', (e) => {
    if (!e.target.closest('.pn-choose-btn')) fileInput.click();
  });

  // Input error clear
  ['pn-name','pn-price','pn-quantity'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', (e) => e.target.classList.remove('error'));
  });

  // Show error helper
  function showError(msg) {
    const box = document.getElementById('pn-error');
    document.getElementById('pn-error-text').textContent = msg;
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Submit
  document.getElementById('publish-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('pn-name').value.trim();
    const category = document.getElementById('pn-category').value;
    const desc     = document.getElementById('pn-description').value.trim();
    const price    = document.getElementById('pn-price').value;
    const unit     = document.getElementById('pn-unit').value;
    const quantity = document.getElementById('pn-quantity').value;
    const files    = document.getElementById('pn-images').files;
    const btn      = document.getElementById('publish-btn');
    const errBox   = document.getElementById('pn-error');

    errBox.classList.add('hidden');

    // Validation
    let valid = true;
    if (!name)     { document.getElementById('pn-name').classList.add('error'); valid = false; }
    if (!price)    { document.getElementById('pn-price').classList.add('error'); valid = false; }
    if (!quantity) { document.getElementById('pn-quantity').classList.add('error'); valid = false; }
    if (!category) {
      document.querySelectorAll('.pn-cat-chip').forEach(c => {
        c.classList.add('error-pulse');
        setTimeout(() => c.classList.remove('error-pulse'), 600);
      });
      valid = false;
    }
    if (!valid) { showError(t('pn_fill_required')); return; }
    if (desc.length < 10) {
      document.getElementById('pn-description').classList.add('error');
      showError(t('pn_desc_min'));
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `${iconSpinner} ${t('pn_publishing')}`;

    try {
      const fd = new FormData();
      fd.append('title', name);
      fd.append('category', category);
      fd.append('description', desc);
      fd.append('price_per_unit', parseFloat(price));
      fd.append('unit', unit);
      fd.append('quantity_available', parseInt(quantity));
      Array.from(files).forEach(f => fd.append('photos', f));

      await API.createProduct(fd);
      if (typeof setPendingMessage === 'function') setPendingMessage('✅ ' + t('pn_success'));
      router.go('/profile');
    } catch (e) {
      if (e.message === 'BLOCKED') return;
      showError(e.message);
      btn.disabled = false;
      btn.innerHTML = `${iconSend} ${t('pn_publish')}`;
    }
  });
}

window.renderProductNew = renderProductNew;
