/* pages/product-new.js — redesigned */

function renderProductNew() {
  const app = document.getElementById('app');

  const categories = [
    { value: 'Овощи',    icon: '🥦', labelKey: 'cat_vegetables' },
    { value: 'Фрукты',   icon: '🍎', labelKey: 'cat_fruits' },
    { value: 'Зелень',   icon: '🌿', labelKey: 'cat_greens' },
    { value: 'Зерновые', icon: '🌾', labelKey: 'cat_grains' },
    { value: 'Молочные', icon: '🥛', labelKey: 'cat_dairy' },
    { value: 'Мёд',      icon: '🍯', labelKey: 'cat_honey' },
  ];

  app.innerHTML = pageShell(`
    <div class="pn-page">
      <div class="pn-header">
        <button class="btn btn-ghost btn-sm pn-back" onclick="router.go('/profile')">
          <i class="fi fi-rr-arrow-left"></i> ${t('back')}
        </button>
        <div class="pn-header-text">
          <h1>${t('pn_title')}</h1>
          <p>${t('pn_subtitle')}</p>
        </div>
      </div>

      <div class="pn-layout">
        <!-- LEFT: форма -->
        <div class="pn-form-col">
          <div id="pn-error" class="form-error hidden"></div>

          <div class="pn-section-card">
            <div class="pn-section-label"><i class="fi fi-rr-info"></i> ${t('pn_basic_info')}</div>

            <div class="form-group">
              <label>${t('pn_name')} *</label>
              <input type="text" id="pn-name" placeholder="${t('pn_name_ph')}" class="pn-input" />
            </div>

            <div class="form-group">
              <label>${t('pn_category')} *</label>
              <div class="pn-cat-grid" id="pn-cat-grid">
                ${categories.map(c => `
                  <div class="pn-cat-chip" data-value="${c.value}" onclick="selectPnCat(this)">
                    <span>${c.icon}</span> ${t(c.labelKey)}
                  </div>
                `).join('')}
              </div>
              <input type="hidden" id="pn-category" />
            </div>

            <div class="form-group">
              <label>${t('pn_desc')} *</label>
              <textarea id="pn-description" placeholder="${t('pn_desc_ph')}" class="pn-input pn-textarea"></textarea>
              <small class="pn-hint">${t('pn_desc_hint')}</small>
            </div>
          </div>

          <div class="pn-section-card">
            <div class="pn-section-label"><i class="fi fi-rr-usd-circle"></i> ${t('pn_price_section')}</div>
            <div class="pn-row">
              <div class="form-group">
                <label>${t('pn_price')} *</label>
                <div class="pn-input-with-icon">
                  <input type="number" id="pn-price" placeholder="0" min="0" step="0.01" class="pn-input" />
                  <span class="pn-input-suffix">${t('currency')}</span>
                </div>
              </div>
              <div class="form-group">
                <label>${t('pn_unit')}</label>
                <select id="pn-unit" class="pn-input">
                  <option value="кг">${t('unit_kg')}</option>
                  <option value="шт">${t('unit_pcs')}</option>
                  <option value="литр">${t('unit_litre')}</option>
                  <option value="г">${t('unit_gram')}</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>${t('pn_qty')} *</label>
              <input type="number" id="pn-quantity" placeholder="0" min="0" class="pn-input" style="max-width:200px" />
            </div>
          </div>

          <div class="pn-section-card">
            <div class="pn-section-label"><i class="fi fi-rr-picture"></i> ${t('pn_photos')}</div>
            <div class="pn-dropzone" id="upload-zone">
              <input type="file" id="pn-images" multiple accept="image/*" style="display:none" />
              <i class="fi fi-rr-cloud-upload pn-upload-icon"></i>
              <p class="pn-drop-title">${t('pn_drop')}</p>
              <p class="pn-drop-hint">${t('pn_drop_hint')}</p>
              <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('pn-images').click()">
                <i class="fi fi-rr-picture"></i> ${t('pn_choose_files')}
              </button>
            </div>
            <div id="image-previews" class="pn-previews"></div>
          </div>
        </div>

        <!-- RIGHT: превью и советы -->
        <div class="pn-aside">
          <div class="pn-tip-card">
            <div class="pn-tip-icon"><i class="fi fi-sr-sparkles"></i></div>
            <h4>${t('pn_tip_title')}</h4>
            <ul class="pn-tip-list">
              <li><i class="fi fi-rr-check"></i> ${t('pn_tip_1')}</li>
              <li><i class="fi fi-rr-check"></i> ${t('pn_tip_2')}</li>
              <li><i class="fi fi-rr-check"></i> ${t('pn_tip_3')}</li>
              <li><i class="fi fi-rr-check"></i> ${t('pn_tip_4')}</li>
            </ul>
          </div>

          <div class="pn-status-card">
            <i class="fi fi-rr-time-check"></i>
            <div>
              <b>${t('pn_moderation_title')}</b>
              <p>${t('pn_moderation_desc')}</p>
            </div>
          </div>

          <button class="btn btn-primary btn-full pn-submit" id="publish-btn">
            <i class="fi fi-rr-paper-plane"></i> ${t('pn_publish')}
          </button>
        </div>
      </div>
    </div>
  `);

  // Category chip select
  window.selectPnCat = function(el) {
    document.querySelectorAll('.pn-cat-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('pn-category').value = el.dataset.value;
  };

  // Image preview
  const fileInput = document.getElementById('pn-images');
  const previewsEl = document.getElementById('image-previews');
  fileInput?.addEventListener('change', () => {
    previewsEl.innerHTML = '';
    Array.from(fileInput.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wrap = document.createElement('div');
        wrap.className = 'pn-preview-item';
        const img = document.createElement('img');
        img.src = e.target.result;
        wrap.appendChild(img);
        previewsEl.appendChild(wrap);
      };
      reader.readAsDataURL(file);
    });
  });

  // Drag & drop
  const zone = document.getElementById('upload-zone');
  zone?.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone?.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
  });
  zone?.addEventListener('click', (e) => {
    if (!e.target.closest('button')) fileInput.click();
  });

  // Submit
  document.getElementById('publish-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('pn-name').value.trim();
    const category = document.getElementById('pn-category').value;
    const desc     = document.getElementById('pn-description').value.trim();
    const price    = document.getElementById('pn-price').value;
    const unit     = document.getElementById('pn-unit').value;
    const quantity = document.getElementById('pn-quantity').value;
    const files    = document.getElementById('pn-images').files;
    const errBox   = document.getElementById('pn-error');
    const btn      = document.getElementById('publish-btn');

    // validation
    let valid = true;
    ['pn-name','pn-price','pn-quantity'].forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.value.trim()) { el.classList.add('error'); valid = false; }
    });
    if (!category) {
      document.querySelectorAll('.pn-cat-chip').forEach(c => c.classList.add('error-pulse'));
      valid = false;
    }
    if (!valid) {
      errBox.textContent = t('pn_fill_required');
      errBox.classList.remove('hidden');
      return;
    }
    if (desc.length < 10) {
      errBox.textContent = t('pn_desc_min');
      errBox.classList.remove('hidden');
      document.getElementById('pn-description').classList.add('error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fi fi-rr-spinner spin"></i> ${t('pn_publishing')}`;
    errBox.classList.add('hidden');

    try {
      // Backend expects multipart/form-data (Form fields), NOT JSON
      const fd = new FormData();
      fd.append('title', name);
      fd.append('category', category);
      fd.append('description', desc);
      fd.append('price_per_unit', parseFloat(price));
      fd.append('unit', unit);
      fd.append('quantity_available', parseInt(quantity));
      // Attach photos if selected
      Array.from(files).forEach(f => fd.append('photos', f));
      await API.createProduct(fd);
      setPendingMessage('✅ ' + t('pn_success'));
      router.go('/profile');
    } catch (e) {
      if (e.message === 'BLOCKED') return;
      errBox.textContent = e.message;
      errBox.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = `<i class="fi fi-rr-paper-plane"></i> ${t('pn_publish')}`;
    }
  });

  ['pn-name','pn-price','pn-quantity','pn-description'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', (e) => e.target.classList.remove('error'));
  });
}

window.renderProductNew = renderProductNew;
