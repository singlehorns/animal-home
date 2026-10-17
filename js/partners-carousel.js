/* Cooperation invitations; no fictional partner names or endorsements. */
(function () {
  'use strict';
  const root = document.querySelector('[data-partners-carousel]');
  if (!root) return;
  const slides = Array.from(root.querySelectorAll('[data-partner-slide]'));
  const status = root.querySelector('[data-partner-status]');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let hovered = false;
  let focused = false;
  let visible = true;
  let timer;

  function schedule() {
    window.clearTimeout(timer);
    if (motion.matches || hovered || focused || !visible || document.hidden) return;
    timer = window.setTimeout(() => show(active + 1, false), 5000);
  }

  function show(index, announce) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    root.dataset.partnerActive = String(active);
    if (announce) status.textContent = '第 ' + (active + 1) + ' 則：' + slides[active].querySelector('h3').textContent;
    schedule();
  }

  root.querySelectorAll('[data-partner-step]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', () => show(active + Number(button.dataset.partnerStep), true));
  });
  root.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    hovered = true; schedule();
  });
  root.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  root.addEventListener('focusin', () => { focused = true; schedule(); });
  root.addEventListener('focusout', event => {
    focused = root.contains(event.relatedTarget); schedule();
  });
  root.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(active + (event.key === 'ArrowRight' ? 1 : -1), true);
  });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', schedule);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; schedule();
    }, { threshold: 0.15 }).observe(root);
  }
  show(0, false);
})();
