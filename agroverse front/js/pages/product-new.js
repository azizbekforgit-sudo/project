/* pages/product-new.js — «Новое объявление»: мастер из трёх шагов
   1) о товаре: фото, название, вид, описание; 2) цена, количество, где забрать; 3) проверка. */

const PN_UNITS = [['кг', 'unit_kg'], ['шт', 'unit_pcs'], ['литр', 'unit_litre'], ['ящик', 'unit_box'],
  ['мешок', 'unit_sack'], ['пучок', 'unit_bunch'], ['тонна', 'unit_ton'], ['г', 'unit_gram']];

function renderProductNew() {
  if (!Auth.isFarmer()) { router.go('/'); return; }

  const app = document.getElementById('app');
  const categories = CATEGORY_OPTIONS.filter(c => c.value);
  const step = (n, key) => `<div class="wz-step ${n === 1 ? 'on' : ''}" data-step="${n}"><span class="wz-num">${n}</span><span class="wz-lbl">${t(key)}</span></div>`;

  app.innerHTML = pageShell(`
    <div class="wz">
      <h1 class="v3-h1">${t('wz_title')}</h1>
      <div class="wz-steps" aria-hidden="true">${step(1, 'wz_s1')}${step(2, 'wz_s2')}${step(3, 'wz_s3')}</div>
      <div id="pn-error" class="wz-err" role="alert" hidden><i class="fa-solid fa-triangle-exclamation"></i> <span id="pn-error-text"></span></div>

      <section class="wz-panel on" data-panel="1" aria-label="${t('wz_s1')}">
        <div class="wz-grid">
          <div class="wz-col">
            <div class="wz-drop" id="upload-zone">
              <input type="file" id="pn-images" multiple accept="image/*" hidden />
              <i class="fa-solid fa-camera" aria-hidden="true"></i>
              <b>${t('wz_photos')}</b>
              <small>${t('wz_photos_hint')}</small>
              <button type="button" class="btn btn-primary pn-choose-btn"><i class="fa-solid fa-image"></i> ${t('wz_upload')}</button>
            </div>
            <div class="wz-thumbs" id="image-previews"></div>
            <div class="wz-tip"><i class="fa-solid fa-circle-info"></i><span><b>${t('wz_tip')}</b> ${t('wz_tip_text')}</span></div>
          </div>
          <div class="wz-col">
            <div class="wz-field">
              <label for="pn-name">${t('pn_name')} <span class="req">*</span></label>
              <input type="text" id="pn-name" placeholder="${t('pn_name_ph')}" class="pn-input" maxlength="120" />
            </div>
            <div class="wz-field">
              <label for="pn-category">${t('pn_category')} <span class="req">*</span></label>
              <select id="pn-category" class="pn-input">
                <option value="">—</option>
                ${categories.map(c => `<option value="${c.value}">${t(c.key)}</option>`).join('')}
              </select>
            </div>
            <div class="wz-field">
              <label for="pn-description">${t('pn_desc')} <span class="req">*</span></label>
              <textarea id="pn-description" placeholder="${t('pn_desc_ph')}" class="pn-input" maxlength="500"></textarea>
              <small><span id="pn-desc-count">0/500</span> · ${t('pn_desc_hint')}</small>
            </div>
          </div>
        </div>
      </section>

      <section class="wz-panel" data-panel="2" aria-label="${t('wz_s2')}">
        <div class="wz-grid">
          <div class="wz-col">
            <div class="wz-field">
              <label for="pn-price">${t('pn_price')} <span class="req">*</span></label>
              <div class="wz-pair">
                <input type="number" inputmode="decimal" id="pn-price" placeholder="0" min="0" step="1" class="pn-input" />
                <select id="pn-unit" class="pn-input" aria-label="${t('pn_unit')}">
                  ${PN_UNITS.map(([v, k]) => `<option value="${v}">${unitLabel(v)}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="wz-field">
              <label for="pn-quantity">${t('pn_qty')} <span class="req">*</span></label>
              <div class="wz-pair">
                <input type="number" inputmode="decimal" id="pn-quantity" placeholder="0" min="0" step="any" class="pn-input" />
                <input type="text" id="pn-qty-unit" class="pn-input" readonly tabindex="-1" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div class="wz-col">
            <div class="wz-field">
              <label for="pn-location">${t('pn_location')} <span class="req">*</span></label>
              <input type="text" id="pn-location" placeholder="${t('pn_location_ph')}" class="pn-input" maxlength="200" />
              <small>${t('pn_location_hint')}</small>
            </div>
            <label class="pn-check">
              <input type="checkbox" id="pn-delivery" />
              <span><b>${t('pn_delivery')}</b><small>${t('pn_delivery_hint')}</small></span>
            </label>
          </div>
        </div>
      </section>

      <section class="wz-panel" data-panel="3" aria-label="${t('wz_s3')}">
        <div class="wz-col" style="margin-bottom:16px">
          <h2 class="v3-h2">${t('wz_review')}</h2>
          <p style="color:var(--ink-2)">${t('wz_review_hint')}</p>
        </div>
        <div class="wz-review" id="wz-review"></div>
      </section>

      <div class="wz-bar">
        <button type="button" class="btn btn-outline btn-lg" id="wz-back"><i class="fa-solid fa-arrow-left"></i> ${t('wz_back')}</button>
        <button type="button" class="btn btn-primary btn-lg" id="wz-next">${t('wz_next')} <i class="fa-solid fa-arrow-right"></i></button>
        <button type="button" class="btn btn-primary btn-lg" id="publish-btn" hidden><i class="fa-solid fa-paper-plane"></i> ${t('pn_publish')}</button>
      </div>
    </div>
  `);

  let cur = 1;
  let photoFiles = [];
  const iconSend = '<i class="fa-solid fa-paper-plane"></i>';
  const iconSpinner = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

  function goStep(n) {
    cur = n;
    document.querySelectorAll('.wz-panel').forEach(p => p.classList.toggle('on', Number(p.dataset.panel) === n));
    document.querySelectorAll('.wz-step').forEach(s => {
      const k = Number(s.dataset.step);
      s.classList.toggle('on', k === n);
      s.classList.toggle('done', k < n);
    });
    document.getElementById('wz-next').hidden = n === 3;
    document.getElementById('publish-btn').hidden = n !== 3;
    document.getElementById('pn-error').hidden = true;
    if (n === 3) renderReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('wz-back').onclick = () => cur > 1 ? goStep(cur - 1) : router.go('/profile?tab=listings');
  document.getElementById('wz-next').onclick = () => { if (validateStep(cur)) goStep(cur + 1); };
  window.wzGo = goStep;

  function syncQtyUnit() {
    const sel = document.getElementById('pn-unit');
    document.getElementById('pn-qty-unit').value = sel.options[sel.selectedIndex]?.text || '';
  }
  document.getElementById('pn-unit').addEventListener('change', syncQtyUnit);
  syncQtyUnit();

  function validateStep(n) {
    let ok = true;
    const need = n === 1 ? ['pn-name', 'pn-category'] : ['pn-price', 'pn-quantity', 'pn-location'];
    need.forEach(id => {
      const el = document.getElementById(id);
      const v = el.value.trim();
      const bad = !v || ((id === 'pn-price' || id === 'pn-quantity') && !(parseFloat(v) > 0));
      el.classList.toggle('error', bad);
      if (bad) ok = false;
    });
    if (!ok) { showError(t('pn_fill_required')); return false; }
    if (n === 1 && document.getElementById('pn-description').value.trim().length < 10) {
      document.getElementById('pn-description').classList.add('error');
      showError(t('pn_desc_min'));
      return false;
    }
    return true;
  }

  function renderReview() {
    const v = id => document.getElementById(id).value.trim();
    const unitSel = document.getElementById('pn-unit');
    const preview = {
      id: 0, name: v('pn-name'), price: parseFloat(v('pn-price')) || 0, unit: unitSel.value,
      quantity: parseFloat(v('pn-quantity')) || 0, pickup_location: v('pn-location'), category: v('pn-category'),
      fermer_name: Auth.getUser()?.name, images: photoFiles[0] ? [URL.createObjectURL(photoFiles[0])] : [],
    };
    const card = productCardHtml(preview).replace(/onclick="router\.go\('\/product\/0'\)"/, '').replace(/onkeydown="[^"]*"/, '');
    const row = (label, value, step) => `<div class="wz-sum-row"><span>${label}</span><b>${value || '—'}</b><button type="button" onclick="wzGo(${step})">${t('wz_edit')}</button></div>`;
    document.getElementById('wz-review').innerHTML = `
      <div>${card}</div>
      <div class="v3-card wz-sum">
        ${row(t('pn_name'), escHtml(preview.name), 1)}
        ${row(t('pn_category'), catLabel(preview.category), 1)}
        ${row(t('pn_desc'), escHtml(v('pn-description')), 1)}
        ${row(t('wz_photos'), photoFiles.length ? photoFiles.length : t('wz_no_photo'), 1)}
        ${row(t('pn_price'), `${fmtNum(preview.price)} ${t('currency')}/${unitLabel(preview.unit)}`, 2)}
        ${row(t('pn_qty'), `${fmtNum(preview.quantity)} ${unitLabel(preview.unit)}`, 2)}
        ${row(t('pn_location'), escHtml(preview.pickup_location), 2)}
        ${row(t('pn_delivery'), document.getElementById('pn-delivery').checked ? '✓' : '—', 2)}
      </div>`;
  }

  // Char counter for description
  const descEl = document.getElementById('pn-description');
  const countEl = document.getElementById('pn-desc-count');
  descEl?.addEventListener('input', () => {
    const len = descEl.value.length;
    countEl.textContent = `${len}/500`;
    countEl.style.color = len > 450 ? 'var(--danger)' : '';
    descEl.classList.remove('error');
  });

  // Фото: копим выбранные (до 10), показываем миниатюры и плитку «+»
  const fileInput = document.getElementById('pn-images');
  const previewsEl = document.getElementById('image-previews');

  function drawThumbs() {
    previewsEl.innerHTML = photoFiles.map(f => `<img src="${URL.createObjectURL(f)}" alt="" />`).join('')
      + (photoFiles.length && photoFiles.length < 10 ? `<button type="button" class="wz-add" aria-label="${t('wz_upload')}" onclick="document.getElementById('pn-images').click()"><i class="fa-solid fa-plus"></i></button>` : '');
  }
  function addFiles(list) {
    photoFiles = photoFiles.concat(Array.from(list).filter(f => f.type.startsWith('image/'))).slice(0, 10);
    drawThumbs();
  }
  fileInput?.addEventListener('change', () => { addFiles(fileInput.files); fileInput.value = ''; });

  const zone = document.getElementById('upload-zone');
  zone?.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone?.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  });
  zone?.addEventListener('click', () => fileInput.click());

  // Input error clear
  ['pn-name','pn-category','pn-price','pn-quantity','pn-location'].forEach(id => {
    const el = document.getElementById(id);
    el?.addEventListener('input', () => el.classList.remove('error'));
    el?.addEventListener('change', () => el.classList.remove('error'));
  });

  // Show error helper
  function showError(msg) {
    const box = document.getElementById('pn-error');
    document.getElementById('pn-error-text').textContent = msg;
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Публикация
  document.getElementById('publish-btn')?.addEventListener('click', async () => {
    const name     = document.getElementById('pn-name').value.trim();
    const category = document.getElementById('pn-category').value;
    const desc     = document.getElementById('pn-description').value.trim();
    const price    = document.getElementById('pn-price').value;
    const unit     = document.getElementById('pn-unit').value;
    const quantity = document.getElementById('pn-quantity').value;
    const btn      = document.getElementById('publish-btn');

    if (!validateStep(1)) { goStep(1); return validateStep(1); }
    if (!validateStep(2)) { goStep(2); return validateStep(2); }

    btn.disabled = true;
    btn.innerHTML = `${iconSpinner} ${t('pn_publishing')}`;

    try {
      const fd = new FormData();
      fd.append('title', name);
      fd.append('category', category);
      fd.append('description', desc);
      fd.append('price_per_unit', parseFloat(price));
      fd.append('unit', unit);
      fd.append('quantity_available', parseFloat(quantity));
      fd.append('delivery_available', document.getElementById('pn-delivery')?.checked || false);
      fd.append('pickup_location', document.getElementById('pn-location')?.value?.trim() || '');
      photoFiles.forEach(f => fd.append('photos', f));

      await API.createProduct(fd);
      if (typeof setPendingMessage === 'function') setPendingMessage('<i class="fa-solid fa-check-circle"></i> ' + t('pn_success'));
      router.go('/profile?tab=listings');
    } catch (e) {
      if (e.message === 'BLOCKED') return;
      showError(e.message);
      btn.disabled = false;
      btn.innerHTML = `${iconSend} ${t('pn_publish')}`;
    }
  });
}

window.renderProductNew = renderProductNew;
