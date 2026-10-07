/* pages/product-new.js — redesigned with animations */

function renderProductNew() {
  if (!Auth.isFarmer()) { router.go('/'); return; }

  const app = document.getElementById('app');

  const categories = [
    { value: 'Овощи',    icon: '<i class="fa-solid fa-carrot"></i>',        labelKey: 'cat_vegetables' },
    { value: 'Фрукты',   icon: '<i class="fa-solid fa-apple-whole"></i>',   labelKey: 'cat_fruits' },
    { value: 'Зелень',   icon: '<i class="fa-solid fa-leaf"></i>',          labelKey: 'cat_greens' },
    { value: 'Зерновые', icon: '<i class="fa-solid fa-wheat-awn"></i>',     labelKey: 'cat_grains' },
    { value: 'Молочные', icon: '<i class="fa-solid fa-bottle-droplet"></i>',labelKey: 'cat_dairy' },
    { value: 'Мёд',      icon: '<i class="fa-solid fa-jar"></i>',           labelKey: 'cat_honey' },
    { value: 'Цветы',    icon: '<i class="fa-solid fa-seedling"></i>',      labelKey: 'cat_flowers' },
    { value: 'Саженцы',  icon: '<i class="fa-solid fa-tree"></i>',          labelKey: 'cat_seedlings' },
    { value: 'Бахчевые', icon: '<i class="fa-solid fa-lemon"></i>',         labelKey: 'cat_melon' },
    { value: 'Семена',   icon: '<i class="fa-solid fa-seedling"></i>',      labelKey: 'cat_seeds' },
    { value: 'Земля',    icon: '<i class="fa-solid fa-mound"></i>',         labelKey: 'cat_land' },
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
        background: #F8FAF6; border: 1px solid rgba(27,92,59,0.2);
        color: #1B5C3B; border-radius: 10px; padding: 10px 16px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        transition: all 0.2s ease; white-space: nowrap; flex-shrink: 0;
      }
      .pn-back-btn:hover { background: #e5ede8; transform: translateX(-3px); }
      .pn-header-text h1 {
        font-family: var(--font-display, 'Unbounded');
        font-size: clamp(22px, 4vw, 30px); font-weight: 800;
        color: #1a1a1a; margin: 0 0 6px; line-height: 1.2; letter-spacing: -0.5px;
      }
      .pn-header-text p { color: #6b7280; font-size: 15px; margin: 0; }

      /* Layout */
      .pn-layout {
        display: grid;
        grid-template-columns: 1fr 340px;
        gap: 24px; align-items: start;
      }
      @media (max-width: 860px) {
        .pn-layout { grid-template-columns: 1fr; }
        .pn-aside { order: -1; }
      }

      /* Cards (Premium Bento) */
      .pn-card {
        background: #fff;
        border: 1px solid var(--line);
        border-radius: 20px; padding: 28px;
        margin-bottom: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.02);
      }
      .pn-card-title {
        display: flex; align-items: center; gap: 10px;
        font-family: var(--font-display, 'Unbounded');
        font-size: 16px; font-weight: 700; color: #1B5C3B;
        margin-bottom: 24px; padding-bottom: 14px;
        border-bottom: 1px solid var(--line);
      }
      .pn-card-title svg, .pn-card-title i { font-size: 18px; color: #1B5C3B; }

      /* Form fields */
      .pn-field { margin-bottom: 20px; }
      .pn-field label {
        display: block; font-size: 14px; font-weight: 600;
        color: #1a1a1a; margin-bottom: 8px;
      }
      .pn-field label .req { color: #1B5C3B; margin-left: 2px; }
      .pn-input {
        width: 100%; padding: 12px 16px;
        border: 1px solid #d1d5db;
        border-radius: 12px; font-size: 15px; color: #1a1a1a;
        background: #F8FAF6;
        transition: all 0.2s ease;
        outline: none; font-family: inherit;
      }
      .pn-input:focus {
        border-color: #1B5C3B;
        background: #fff;
        box-shadow: 0 2px 10px rgba(27,92,59,0.1);
      }
      .pn-input.error { border-color: #ef4444; background: #fff1f2; }
      .pn-input.success { border-color: #1B5C3B; }
      textarea.pn-input { resize: vertical; min-height: 120px; }
      select.pn-input { cursor: pointer; }
      .pn-hint { font-size: 13px; color: #6b7280; margin-top: 6px; display: block; }

      /* Price row */
      .pn-price-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
      @media (max-width: 500px) { .pn-price-row { grid-template-columns: 1fr; } }
      .pn-input-wrap { position: relative; }
      .pn-input-wrap .pn-input { padding-right: 56px; font-weight: 600; }
      .pn-suffix {
        position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
        font-size: 14px; font-weight: 600; color: #9ca3af; pointer-events: none;
      }

      /* Category chips */
      .pn-cat-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px;
      }
      .pn-cat-chip {
        display: flex; align-items: center; justify-content: center; gap: 10px;
        padding: 12px;
        border: 1px solid #e5e7eb; border-radius: 12px;
        cursor: pointer; font-size: 14px; font-weight: 600; color: #374151;
        background: #fff;
        transition: all 0.2s ease;
        user-select: none;
      }
      .pn-cat-chip i { font-size: 16px; color: #9ca3af; transition: color 0.2s ease; }
      .pn-cat-chip:hover {
        border-color: #1B5C3B; background: #F8FAF6; color: #1B5C3B;
      }
      .pn-cat-chip:hover i { color: #1B5C3B; }
      .pn-cat-chip.active {
        border-color: #1B5C3B; background: #1B5C3B; color: #fff;
        box-shadow: 0 4px 12px rgba(27,92,59,0.2);
      }
      .pn-cat-chip.active i { color: #fff; }
      .pn-cat-chip.error-pulse { animation: errPulse 0.5s ease; border-color: #ef4444; }

      /* Dropzone */
      .pn-dropzone {
        border: 2px dashed rgba(27,92,59,0.3);
        border-radius: 16px; padding: 40px 20px;
        text-align: center; cursor: pointer;
        background: #fafafa;
        transition: all 0.2s ease;
      }
      .pn-dropzone:hover, .pn-dropzone.dragover {
        border-color: #1B5C3B; background: #F8FAF6;
      }
      .pn-upload-icon {
        width: 48px; height: 48px; margin: 0 auto 16px;
        background: #1B5C3B;
        border-radius: 14px; display: flex; align-items: center;
        justify-content: center; color: #fff; font-size: 20px;
      }
      .pn-drop-title { font-size: 16px; font-weight: 700; color: #1a1a1a; margin: 0 0 6px; }
      .pn-drop-hint  { font-size: 14px; color: #6b7280; margin: 0 0 20px; }
      .pn-choose-btn {
        display: inline-flex; align-items: center; gap: 8px;
        background: #fff; border: 1px solid #1B5C3B;
        color: #1B5C3B; border-radius: 10px; padding: 10px 20px;
        font-size: 14px; font-weight: 600; cursor: pointer;
        transition: all 0.2s ease;
      }
      .pn-choose-btn:hover { background: #1B5C3B; color: #fff; }

      /* Aside */
      .pn-aside { display: flex; flex-direction: column; gap: 20px; }

      /* Tip card */
      .pn-tip-card {
        background: #F8FAF6;
        border: 1px solid rgba(27,92,59,0.1);
        border-radius: 20px; padding: 24px;
      }
      .pn-tip-icon {
        width: 44px; height: 44px; border-radius: 14px;
        background: #1B5C3B;
        display: flex; align-items: center; justify-content: center;
        color: #fff; margin-bottom: 16px; font-size: 20px;
      }
      .pn-tip-card h4 { font-family: var(--font-display, 'Unbounded'); font-size: 16px; font-weight: 700; color: #1a1a1a; margin: 0 0 16px; }
      .pn-tip-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
      .pn-tip-list li { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: #374151; line-height: 1.5; }
      .pn-tip-check { flex-shrink: 0; width: 20px; height: 20px; background: rgba(27,92,59,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 1px; color:#1B5C3B; }

      /* Moderation card */
      .pn-mod-card {
        background: #fffcf0; border: 1px solid rgba(217,119,6,0.3);
        border-radius: 16px; padding: 20px;
        display: flex; gap: 14px; align-items: flex-start;
      }
      .pn-submit-btn {
        width: 100%; padding: 18px;
        background: #1B5C3B;
        color: #fff; border: none; border-radius: 16px;
        font-family: var(--font-display, 'Unbounded'); font-size: 16px; font-weight: 700; cursor: pointer;
        transition: all 0.2s ease;
      }
      .pn-submit-btn:hover { background: #13422a; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(27,92,59,0.25); }

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
  const iconArrowLeft = `<i class="fa-solid fa-arrow-left"></i>`;
  const iconInfo      = `<i class="fa-solid fa-circle-info"></i>`;
  const iconMoney     = `<i class="fa-solid fa-coins"></i>`;
  const iconPhoto     = `<i class="fa-solid fa-images"></i>`;
  const iconUpload    = `<i class="fa-solid fa-cloud-arrow-up"></i>`;
  const iconPicture   = `<i class="fa-solid fa-image"></i>`;
  const iconSend      = `<i class="fa-solid fa-paper-plane"></i>`;
  const iconStar      = `<i class="fa-solid fa-star"></i>`;
  const iconCheck     = `<i class="fa-solid fa-check"></i>`;
  const iconWarn      = `<i class="fa-solid fa-triangle-exclamation"></i>`;
  const iconClock     = `<i class="fa-solid fa-clock"></i>`;
  const iconSpinner   = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;

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
            <div class="pn-field">
              <label>${t('pn_location') || 'Место откуда забирать'} <span class="req">*</span></label>
              <input type="text" id="pn-location" placeholder="${t('pn_location_ph') || 'Например: Ташкент, Яккасарайский р-н, ул. Бабура 45'}" class="pn-input" maxlength="200" />
              <span class="pn-hint">${t('pn_location_hint') || 'Город и адрес, где покупатель сможет забрать товар'}</span>
            </div>
            <div class="pn-field" style="margin-top:12px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="pn-delivery" style="width:18px;height:18px;accent-color:#059669" />
                <span>Есть доставка (доставка фермера)</span>
              </label>
              <span class="pn-hint">Покупатели смогут выбрать доставку от вас</span>
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
  ['pn-name','pn-price','pn-quantity','pn-location'].forEach(id => {
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
    if (!document.getElementById('pn-location')?.value.trim()) { document.getElementById('pn-location').classList.add('error'); valid = false; }
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
      fd.append('delivery_available', document.getElementById('pn-delivery')?.checked || false);
      fd.append('pickup_location', document.getElementById('pn-location')?.value?.trim() || '');
      Array.from(files).forEach(f => fd.append('photos', f));

      await API.createProduct(fd);
      if (typeof setPendingMessage === 'function') setPendingMessage('<i class="fa-solid fa-check-circle"></i> ' + t('pn_success'));
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
