/* pages/landing.js — рекламная страница для гостей (до входа):
   идея, как это работает, почему удобно, о нас, вопросы, контакты.
   Маршруты /welcome, /about, /contacts открывают её и прокручивают к разделу. */

const LP_SECTIONS = { '/welcome': null, '/about': 'lp-about', '/contacts': 'lp-contacts', '/how': 'lp-how' };

function lpScrollTo(id, path) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // меняем адрес без перерисовки страницы (replaceState не вызывает hashchange)
  if (path) history.replaceState(null, '', '#' + path);
}

function lpRegister(role) {
  router.go(role ? `/register?role=${role}` : '/register');
}

function lpHowTab(which) {
  document.querySelectorAll('.lp-tab').forEach(b => {
    const on = b.dataset.tab === which;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  document.querySelectorAll('.lp-steps').forEach(s => { s.hidden = s.dataset.tab !== which; });
}

function lpChain(items, cls) {
  return items.map((it, i) => `
    ${i ? '<i class="fa-solid fa-arrow-right lp-arrow" aria-hidden="true"></i>' : ''}
    <span class="lp-node ${it.cls || ''}">
      <i class="${it.icon}" aria-hidden="true"></i>
      <b>${t(it.key)}</b>
      ${it.markup ? `<small>${t('lp_markup')}</small>` : ''}
    </span>`).join('');
}

function lpSteps(prefix, icons) {
  return [1, 2, 3, 4].map(n => `
    <li class="lp-step">
      <span class="lp-step-n">${n}</span>
      <span class="lp-step-ic"><i class="${icons[n - 1]}" aria-hidden="true"></i></span>
      <h3>${t(prefix + n)}</h3>
      <p>${t(prefix + n + 'd')}</p>
    </li>`).join('');
}

function renderLanding() {
  const app = document.getElementById('app');
  const path = currentPath();
  const logged = Auth.isLoggedIn();
  const cur = (window.I18nManager && I18nManager.current) || 'uz';
  const phoneLink = `tel:${SUPPORT_PHONE}`;

  const nav = [
    ['lp-idea', 'lp_nav_idea', '/welcome'],
    ['lp-how', 'lp_nav_how', '/how'],
    ['lp-about', 'lp_nav_about', '/about'],
    ['lp-contacts', 'lp_nav_contacts', '/contacts'],
  ].map(([id, key, p]) => `<button type="button" onclick="lpScrollTo('${id}', '${p}')">${t(key)}</button>`).join('');

  const langs = I18nManager.langs().map(l =>
    `<button type="button" class="seg-btn ${l.code === cur ? 'active' : ''}" onclick="I18nManager.set('${l.code}')" aria-label="${l.label}"><span class="lg-full">${l.label}</span><span class="lg-short">${l.code.toUpperCase()}</span></button>`).join('');

  const authBtns = logged
    ? `<button class="btn btn-primary lp-top-cta" onclick="router.go('/home')"><i class="fa-solid fa-store"></i> <span>${t('lp_open_app')}</span></button>`
    : `<button class="btn btn-outline lp-top-login" onclick="router.go('/login')"><i class="fa-solid fa-arrow-right-to-bracket"></i> <span>${t('lp_login')}</span></button>
       <button class="btn btn-primary lp-top-cta" onclick="lpRegister()"><span>${t('lp_register')}</span></button>`;

  const features = [
    ['fa-solid fa-handshake', 'lp_ft1'], ['fa-solid fa-phone-volume', 'lp_ft2'],
    ['fa-solid fa-robot', 'lp_ft3'], ['fa-solid fa-language', 'lp_ft4'],
    ['fa-solid fa-text-height', 'lp_ft5'], ['fa-solid fa-basket-shopping', 'lp_ft6'],
  ].map(([ic, k]) => `
    <li class="lp-feat"><span class="lp-feat-ic"><i class="${ic}" aria-hidden="true"></i></span>
      <h3>${t(k)}</h3><p>${t(k + 'd')}</p></li>`).join('');

  const faq = [1, 2, 3, 4, 5].map(n => `
    <details class="lp-q" ${n === 1 ? 'open' : ''}>
      <summary><span>${t('lp_q' + n)}</span><i class="fa-solid fa-plus" aria-hidden="true"></i></summary>
      <p>${t('lp_a' + n)}</p>
    </details>`).join('');

  app.innerHTML = `
  <div class="lp">
    <header class="lp-top">
      <div class="lp-wrap lp-top-in">
        <a class="lp-brand" onclick="lpScrollTo('lp-hero', '/welcome')"><span class="sb-logo-icon"><i class="fa-solid fa-seedling"></i></span><span class="lp-brand-tx">AgroVerse</span></a>
        <nav class="lp-nav" aria-label="${t('menu')}">${nav}</nav>
        <div class="lp-top-right">
          <div class="seg lp-lang" role="group" aria-label="${t('choose_lang')}">${langs}</div>
          ${authBtns}
        </div>
      </div>
      <nav class="lp-nav-m lp-wrap" aria-label="${t('menu')}">${nav}</nav>
    </header>

    <section class="lp-hero" id="lp-hero">
      <div class="lp-hero-bg" aria-hidden="true"></div>
      <div class="lp-wrap lp-hero-in">
        <p class="lp-eyebrow"><span class="lp-dot"></span> ${t('lp_eyebrow')}</p>
        <h1 class="lp-h1">${t('lp_h1a')}<br><em>${t('lp_h1b')}</em></h1>
        <p class="lp-lead">${t('lp_lead')}</p>

        <div class="lp-roles">
          <button class="lp-role farmer" onclick="${logged ? "router.go('/home')" : "lpRegister('fermer')"}">
            <span class="lp-role-ic"><i class="fa-solid fa-wheat-awn"></i></span>
            <span class="lp-role-tx"><b>${t('lp_i_farmer')}</b><small>${t('lp_i_farmer_d')}</small></span>
            <i class="fa-solid fa-arrow-right lp-role-go" aria-hidden="true"></i>
          </button>
          <button class="lp-role buyer" onclick="${logged ? "router.go('/market')" : "lpRegister('xaridor')"}">
            <span class="lp-role-ic"><i class="fa-solid fa-basket-shopping"></i></span>
            <span class="lp-role-tx"><b>${t('lp_i_buyer')}</b><small>${t('lp_i_buyer_d')}</small></span>
            <i class="fa-solid fa-arrow-right lp-role-go" aria-hidden="true"></i>
          </button>
        </div>

        <div class="lp-hero-foot">
          ${logged ? '' : `<span>${t('lp_have_acc')} <a onclick="router.go('/login')">${t('lp_login')}</a></span>`}
          <a class="lp-hero-phone" href="${phoneLink}"><i class="fa-solid fa-phone"></i> ${t('lp_questions')}: <b>${SUPPORT_PHONE_VIEW}</b></a>
        </div>
      </div>
    </section>

    <section class="lp-sec lp-idea" id="lp-idea">
      <div class="lp-wrap">
        <p class="lp-k">${t('lp_idea_k')}</p>
        <h2 class="lp-h2">${t('lp_idea_h')}</h2>
        <p class="lp-p">${t('lp_idea_p')}</p>

        <div class="lp-chains">
          <div class="lp-chain old">
            <span class="lp-chain-tag">${t('lp_now')}</span>
            <div class="lp-chain-row">
              ${lpChain([
                { key: 'lp_ch_farmer', icon: 'fa-solid fa-wheat-awn' },
                { key: 'lp_ch_reseller', icon: 'fa-solid fa-user-tie', markup: true, cls: 'mid' },
                { key: 'lp_ch_bazaar', icon: 'fa-solid fa-warehouse', markup: true, cls: 'mid' },
                { key: 'lp_ch_shop', icon: 'fa-solid fa-shop', markup: true, cls: 'mid' },
                { key: 'lp_ch_you', icon: 'fa-solid fa-user' },
              ])}
            </div>
            <p class="lp-chain-res"><i class="fa-solid fa-circle-xmark"></i> ${t('lp_now_res')}</p>
          </div>
          <div class="lp-chain new">
            <span class="lp-chain-tag">${t('lp_with')}</span>
            <div class="lp-chain-row">
              ${lpChain([
                { key: 'lp_ch_farmer', icon: 'fa-solid fa-wheat-awn' },
                { key: 'lp_ch_you', icon: 'fa-solid fa-user' },
              ])}
            </div>
            <p class="lp-chain-res"><i class="fa-solid fa-circle-check"></i> ${t('lp_with_res')}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="lp-sec lp-how" id="lp-how">
      <div class="lp-wrap">
        <p class="lp-k">${t('lp_how_k')}</p>
        <h2 class="lp-h2">${t('lp_how_h')}</h2>
        <div class="seg lp-tabs" role="tablist">
          <button class="seg-btn lp-tab active" data-tab="f" role="tab" aria-selected="true" onclick="lpHowTab('f')"><i class="fa-solid fa-wheat-awn"></i> ${t('lp_tab_farmer')}</button>
          <button class="seg-btn lp-tab" data-tab="b" role="tab" aria-selected="false" onclick="lpHowTab('b')"><i class="fa-solid fa-basket-shopping"></i> ${t('lp_tab_buyer')}</button>
        </div>
        <ol class="lp-steps" data-tab="f">${lpSteps('lp_f', ['fa-solid fa-mobile-screen', 'fa-solid fa-camera', 'fa-solid fa-bell', 'fa-solid fa-circle-check'])}</ol>
        <ol class="lp-steps" data-tab="b" hidden>${lpSteps('lp_b', ['fa-solid fa-mobile-screen', 'fa-solid fa-magnifying-glass', 'fa-solid fa-cart-shopping', 'fa-solid fa-phone'])}</ol>
      </div>
    </section>

    <section class="lp-sec lp-feats-sec">
      <div class="lp-wrap">
        <p class="lp-k">${t('lp_feat_k')}</p>
        <h2 class="lp-h2">${t('lp_feat_h')}</h2>
        <ul class="lp-feats">${features}</ul>
      </div>
    </section>

    <section class="lp-sec lp-about" id="lp-about">
      <div class="lp-wrap lp-about-in">
        <div class="lp-about-art" aria-hidden="true">${typeof fieldSceneSvg === 'function' ? fieldSceneSvg() : ''}
          <blockquote class="lp-quote">«${t('lp_about_quote')}»</blockquote>
        </div>
        <div class="lp-about-tx">
          <p class="lp-k">${t('lp_about_k')}</p>
          <h2 class="lp-h2">${t('lp_about_h')}</h2>
          <p class="lp-p strong">${t('lp_about_p1')}</p>
          <p class="lp-p">${t('lp_about_p2')}</p>
          <ul class="lp-values">
            ${[['fa-solid fa-scale-balanced', 'lp_v1'], ['fa-solid fa-hand-pointer', 'lp_v2'], ['fa-solid fa-headset', 'lp_v3']].map(([ic, k]) => `
              <li><span class="lp-val-ic"><i class="${ic}"></i></span><span><b>${t(k)}</b><small>${t(k + 'd')}</small></span></li>`).join('')}
          </ul>
        </div>
      </div>
    </section>

    <section class="lp-sec lp-faq" id="lp-faq">
      <div class="lp-wrap lp-narrow">
        <p class="lp-k">${t('lp_faq_k')}</p>
        <h2 class="lp-h2">${t('lp_faq_h')}</h2>
        <div class="lp-qs">${faq}</div>
      </div>
    </section>

    <section class="lp-sec lp-contacts" id="lp-contacts">
      <div class="lp-wrap">
        <div class="lp-ct-card">
          <div class="lp-ct-tx">
            <p class="lp-k">${t('lp_ct_k')}</p>
            <h2 class="lp-h2">${t('lp_ct_h')}</h2>
            <p class="lp-p">${t('lp_ct_p')}</p>
            <a class="lp-ct-phone" href="${phoneLink}">
              <span class="lp-ct-phone-ic"><i class="fa-solid fa-phone"></i></span>
              <span><small>${t('lp_ct_phone')}</small><b>${SUPPORT_PHONE_VIEW}</b></span>
            </a>
          </div>
          <ul class="lp-ct-list">
            <li><a href="${SOCIAL.telegram}" target="_blank" rel="noopener"><i class="fa-brands fa-telegram"></i><span><small>${t('lp_ct_tg')}</small><b>@agroverseai</b></span></a></li>
            <li><a href="${SOCIAL.instagram}" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i><span><small>${t('lp_ct_ig')}</small><b>@agroverse_uz</b></span></a></li>
            <li class="soon"><span class="lp-ct-row"><i class="fa-solid fa-envelope"></i><span><small>${t('lp_ct_email')}</small><b>${t('lp_soon')}</b></span></span></li>
          </ul>
        </div>
      </div>
    </section>

    ${logged ? '' : `
    <section class="lp-cta">
      <div class="lp-wrap lp-cta-in">
        <div><h2>${t('lp_cta_h')}</h2><p>${t('lp_cta_p')}</p></div>
        <div class="lp-cta-btns">
          <button class="btn btn-lg lp-btn-sun" onclick="lpRegister()">${t('lp_register')} <i class="fa-solid fa-arrow-right"></i></button>
          <button class="btn btn-lg lp-btn-line" onclick="router.go('/login')">${t('lp_login')}</button>
        </div>
      </div>
    </section>`}

    <div class="lp-footer">${footerHtml()}</div>

    <div class="lp-sticky" role="group">
      <a class="lp-sticky-call" href="${phoneLink}" aria-label="${t('lp_call')} ${SUPPORT_PHONE_VIEW}"><i class="fa-solid fa-phone"></i><span>${t('lp_call')}</span></a>
      <button class="lp-sticky-go" onclick="${logged ? "router.go('/home')" : 'lpRegister()'}">${logged ? t('lp_open_app') : t('lp_start')} <i class="fa-solid fa-arrow-right"></i></button>
    </div>
  </div>`;

  // router.afterRender прокручивает наверх — к разделу едем чуть позже
  const target = LP_SECTIONS[path];
  if (target) setTimeout(() => document.getElementById(target)?.scrollIntoView({ block: 'start' }), 60);
}

window.renderLanding = renderLanding;
window.lpScrollTo = lpScrollTo;
window.lpRegister = lpRegister;
window.lpHowTab = lpHowTab;
