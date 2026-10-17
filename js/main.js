/* Local, buildless animal-home UI. No requests, account system or form delivery. */
(function () {
  'use strict';

  // The reference uses soft blur on the hero and upward fades while scrolling.
  // Only opt into hidden states when the browser can reveal them again.
  function initTextEntrance() {
    // Home follows the reference's whole-block entrances instead.
    if (document.body.classList.contains('home')) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motion.matches || !('IntersectionObserver' in window)) return;

    const targets = Array.from(document.querySelectorAll(
      'main h1, main h2, main h3, main h4, main h5, main h6, main p, main [data-text-entrance], main .eyebrow, main .care-number, main .photo-caption'
    )).filter(element => !element.closest('form, details, .form-panel, .contact-preview') &&
      !element.matches('.filter-status'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0 });

    targets.forEach(element => {
      const hero = element.closest('.hero-content, .page-hero, .reference-banner');
      const siblings = Array.from(element.parentElement.children)
        .filter(child => targets.includes(child));
      const order = siblings.indexOf(element);
      const card = element.closest('.care-item, .diary-card, .help-card, .values-grid article');
      const cardOrder = card ? Array.from(card.parentElement.children).indexOf(card) : 0;
      const delay = hero ? 100 + order * 180 : Math.min(order * 100 + cardOrder * 80, 320);
      element.style.setProperty('--entrance-delay', delay + 'ms');
      element.classList.add('text-entrance');
      if (hero) element.classList.add('text-entrance-hero');
      observer.observe(element);
    });

    // Keyboard navigation and an in-session motion preference change must
    // make text readable immediately, even before its scroll trigger.
    document.addEventListener('focusin', event => {
      const element = event.target.closest('.text-entrance');
      if (!element) return;
      element.classList.add('is-revealed');
      observer.unobserve(element);
    });
    motion.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      targets.forEach(element => {
        element.classList.remove('text-entrance', 'text-entrance-hero', 'is-revealed');
        element.style.removeProperty('--entrance-delay');
      });
    });
  }
  initTextEntrance();

  function initHomeBlockEntrances() {
    if (!document.body.classList.contains('home')) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    // The reference disables WOW on mobile devices and triggers 30px into view.
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (motion.matches || mobile || !('IntersectionObserver' in window)) return;

    const blocks = Array.from(document.querySelectorAll('main [data-block-entrance]'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-block-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -30px 0px', threshold: 0 });

    blocks.forEach(block => {
      block.style.setProperty('--block-entrance-delay', (Number(block.dataset.blockDelay) || 0) + 'ms');
      block.classList.add('block-entrance');
      function finish(event) {
        if (event.target !== block) return;
        block.classList.remove('block-entrance');
        block.style.removeProperty('--block-entrance-delay');
        block.removeEventListener('animationend', finish);
      }
      block.addEventListener('animationend', finish);
    });

    function start() {
      if (!motion.matches) blocks.forEach(block => observer.observe(block));
    }
    // As on the reference, let the initial images finish loading first.
    // Native lazy images below the fold do not hold up the opening animation.
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });

    document.addEventListener('focusin', event => {
      // A focused link must be readable, including inside nested animated blocks.
      blocks.forEach(block => {
        if (!block.contains(event.target)) return;
        block.classList.remove('block-entrance');
        block.classList.add('is-block-revealed');
        observer.unobserve(block);
      });
    });
    motion.addEventListener('change', event => {
      if (!event.matches) return;
      observer.disconnect();
      blocks.forEach(block => {
        block.classList.remove('block-entrance');
        block.classList.add('is-block-revealed');
        block.style.removeProperty('--block-entrance-delay');
      });
    });
  }
  initHomeBlockEntrances();

  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  const drawer = document.querySelector('.header-drawer');
  const backdrop = document.querySelector('.menu-backdrop');
  const mobileMenu = window.matchMedia('(max-width: 991px)');
  const mobileMenuClose = nav.querySelector('.mobile-nav-close');
  const backgroundInert = new Map();
  let menuScrollPosition = null;

  function setMenuBackgroundInert(open) {
    if (open) {
      Array.from(document.body.children).forEach(element => {
        if ([header, drawer, backdrop].includes(element) || element.tagName === 'SCRIPT') return;
        backgroundInert.set(element, element.inert);
        element.inert = true;
      });
    } else {
      backgroundInert.forEach((value, element) => { element.inert = value; });
      backgroundInert.clear();
    }
  }

  function closeMenu(restoreFocus = false) {
    const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
    header.classList.remove('is-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', '開啟導覽選單');
    nav.classList.remove('is-open');
    nav.inert = mobileMenu.matches;
    nav.removeAttribute('role');
    nav.removeAttribute('aria-modal');
    if (drawer) { drawer.classList.remove('is-open'); drawer.inert = true; }
    if (backdrop) backdrop.hidden = true;
    document.body.classList.remove('menu-open');
    setMenuBackgroundInert(false);
    if (menuScrollPosition) {
      window.scrollTo({ left: menuScrollPosition.x, top: menuScrollPosition.y, behavior: 'instant' });
      menuScrollPosition = null;
    }
    if (restoreFocus && wasOpen) toggle.focus({ preventScroll: true });
  }

  toggle.addEventListener('click', function () {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    if (!open) { closeMenu(true); return; }
    if (mobileMenu.matches) menuScrollPosition = { x: window.scrollX, y: window.scrollY };
    header.classList.add('is-menu-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', '關閉導覽選單');
    nav.classList.toggle('is-open', mobileMenu.matches);
    nav.inert = false;
    if (drawer) { drawer.classList.toggle('is-open', !mobileMenu.matches); drawer.inert = mobileMenu.matches; }
    if (backdrop) backdrop.hidden = false;
    document.body.classList.add('menu-open');
    if (mobileMenu.matches) {
      nav.setAttribute('role', 'dialog');
      nav.setAttribute('aria-modal', 'true');
      nav.scrollTop = 0;
      setMenuBackgroundInert(true);
      mobileMenuClose.focus({ preventScroll: true });
    }
  });
  nav.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  mobileMenuClose.addEventListener('click', () => closeMenu(true));
  if (drawer) drawer.querySelector('.drawer-close').addEventListener('click', () => closeMenu(true));
  if (backdrop) backdrop.addEventListener('click', () => closeMenu(true));
  document.addEventListener('keydown', e => {
    if (toggle.getAttribute('aria-expanded') !== 'true') return;
    if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
    if (e.key !== 'Tab' || !mobileMenu.matches) return;
    const focusables = [mobileMenuClose, ...nav.querySelectorAll('a[href]')];
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || !nav.contains(document.activeElement))) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && (document.activeElement === last || !nav.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  });
  function resetMenuLayout() {
    closeMenu();
    toggle.setAttribute('aria-controls', mobileMenu.matches ? nav.id : drawer.id);
  }
  mobileMenu.addEventListener('change', resetMenuLayout);
  resetMenuLayout();
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 12); }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const slides = Array.from(document.querySelectorAll('.hero-slide'));
  if (slides.length) {
    const dots = Array.from(document.querySelectorAll('.slide-dot'));
    const pause = document.querySelector('.slide-pause');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const hero = slides[0].closest('.reference-home-hero');
    let current = -1, timer = null, paused = reducedMotion.matches;
    function showSlide(i) {
      if (i !== current) {
        const incoming = slides[i];
        // Keep the outgoing photo zoomed while it fades; restart only the incoming one.
        incoming.classList.remove('is-zooming');
        void incoming.offsetWidth;
        incoming.classList.add('is-zooming');
      }
      current = i;
      slides.forEach((s, n) => s.classList.toggle('is-active', n === i));
      dots.forEach((d, n) => { d.classList.toggle('is-active', n === i); d.setAttribute('aria-pressed', String(n === i)); });
    }
    function schedule() {
      window.clearInterval(timer);
      hero?.classList.toggle('is-hero-paused', paused || document.hidden);
      if (!paused && !document.hidden) timer = window.setInterval(() => showSlide((current + 1) % slides.length), 6500);
      pause.textContent = paused ? '▷' : 'Ⅱ';
      pause.setAttribute('aria-label', paused ? '播放輪播' : '暫停輪播');
      pause.setAttribute('aria-pressed', String(paused));
    }
    dots.forEach((d, i) => d.addEventListener('click', () => { showSlide(i); schedule(); }));
    pause.addEventListener('click', () => { paused = !paused; schedule(); });
    document.addEventListener('visibilitychange', schedule);
    reducedMotion.addEventListener('change', e => { paused = e.matches; schedule(); });
    showSlide(0);
    schedule();
  }

  const grid = document.getElementById('daily-grid');
  if (grid) {
    const filters = Array.from(document.querySelectorAll('[data-filter]'));
    filters.forEach(button => button.addEventListener('click', function () {
      const filter = button.dataset.filter;
      let count = 0;
      grid.querySelectorAll('[data-category]').forEach(card => {
        const visible = filter === 'all' || card.dataset.category === filter;
        card.hidden = !visible;
        if (visible) count++;
      });
      filters.forEach(b => { b.setAttribute('aria-pressed', String(b === button)); b.classList.toggle('is-active', b === button); });
      document.querySelector('.filter-status').textContent = '共 ' + count + ' 則紀錄';
    }));
  }

  const dialog = document.getElementById('story-dialog');
  let lastTrigger = null;
  document.querySelectorAll('[data-story]').forEach(button => button.addEventListener('click', function () {
    const story = window.ANIMAL_STORIES[Number(button.dataset.story)];
    if (!story) return;
    lastTrigger = button;
    const carousel = button.closest('[data-story-carousel]');
    if (carousel && button.closest('[data-carousel-clone]')) {
      lastTrigger = carousel.querySelector('[data-carousel-original] [data-story="' + button.dataset.story + '"]') || button;
    }
    const cardPhoto = button.closest('.diary-card')?.querySelector('.photo-button img');
    document.getElementById('story-image').src = cardPhoto ? cardPhoto.getAttribute('src') : 'images/' + story[4];
    document.getElementById('story-image').alt = cardPhoto ? cardPhoto.alt : story[2];
    document.getElementById('story-category').textContent = story[1];
    document.getElementById('story-title').textContent = story[2];
    document.getElementById('story-body').textContent = story[5];
    dialog.showModal();
  }));
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', function (e) {
    if (e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { if (lastTrigger) lastTrigger.focus(); });

  const privacy = document.querySelector('.privacy-banner');
  let consent = false, sessionDismissed = false;
  try { consent = window.localStorage.getItem('animal-home-privacy') === 'remember'; } catch (_) {}
  try { sessionDismissed = window.sessionStorage.getItem('animal-home-privacy-once') === '1'; } catch (_) {}
  privacy.hidden = consent || sessionDismissed;
  document.querySelectorAll('[data-privacy]').forEach(button => button.addEventListener('click', function () {
    try {
      if (button.dataset.privacy === 'remember') window.localStorage.setItem('animal-home-privacy', 'remember');
      else { window.localStorage.removeItem('animal-home-privacy'); window.sessionStorage.setItem('animal-home-privacy-once', '1'); }
    } catch (_) {}
    privacy.hidden = true;
  }));
  document.querySelectorAll('[data-privacy-open]').forEach(button => button.addEventListener('click', () => {
    privacy.hidden = false;
    privacy.querySelector('button').focus();
  }));

  const form = document.getElementById('contact-form');
  if (form) {
    const select = document.getElementById('contact-topic');
    const topic = new URLSearchParams(window.location.search).get('topic');
    if (topic && Array.from(select.options).some(o => o.value === topic)) select.value = topic;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const text = '稱呼：' + data.get('name') + '\n電子信箱：' + data.get('email') +
        (data.get('phone') ? '\n聯絡電話：' + data.get('phone') : '') +
        '\n聯絡主題：' + data.get('topic') +
        (data.get('time') ? '\n方便聯繫的時段：' + data.get('time') : '') +
        (data.get('preference') ? '\n希望的聯繫方式：' + data.get('preference') : '') +
        '\n\n' + data.get('message');
      document.getElementById('contact-preview-text').textContent = text;
      document.getElementById('contact-preview').hidden = false;
      document.getElementById('copy-status').textContent = '';
      document.getElementById('contact-preview').focus();
    });
    document.getElementById('copy-message').addEventListener('click', async function () {
      const text = document.getElementById('contact-preview-text').textContent;
      try {
        if (!navigator.clipboard) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(text);
        document.getElementById('copy-status').textContent = '已複製。此展示版本不會自動傳送訊息。';
      } catch (_) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(document.getElementById('contact-preview-text'));
        selection.removeAllRanges(); selection.addRange(range);
        document.getElementById('copy-status').textContent = '已選取內容，請按 Ctrl+C（Mac 為 Command+C）複製。';
      }
    });
  }
}());
