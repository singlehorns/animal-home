(() => {
  'use strict';

  document.querySelectorAll('[data-story-carousel]').forEach(carousel => {
    const track = carousel.querySelector('.story-carousel-track');
    const originals = Array.from(track.children);
    const count = originals.length;
    if (count < 2) return;
    // Narrower cards need extra copies to cover wide screens at either seam.
    const bufferCycles = 3;
    const bufferCount = count * bufferCycles;
    const controls = carousel.querySelector('.story-carousel-controls');
    const pauseButton = carousel.querySelector('[data-carousel-pause]');
    const counter = carousel.querySelector('[data-carousel-counter]');
    const announcement = carousel.querySelector('[data-carousel-status]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const dialog = document.getElementById('story-dialog');
    const speed = 42; // Pixels per second, independent of display refresh rate.
    let paused = false, visible = false, interacting = false;
    let frame = null, lastTime = null, resumeTimer = null;
    let offset = 0, expectedScroll = 0, base = 0, cycle = 0, stride = 1;
    let position = bufferCount, previousIndex = -1, move = null;
    let pointerId = null, drag = null, suppressClick = false;

    originals.forEach((card, index) => {
      const story = card.querySelector('[data-story]');
      card.dataset.photoShape = String(story ? Number(story.dataset.story) + 1 : index % 6 + 1);
    });
    function copyCard(card) {
      const copy = card.cloneNode(true);
      copy.removeAttribute('data-carousel-original');
      copy.setAttribute('data-carousel-clone', '');
      copy.setAttribute('aria-hidden', 'true');
      copy.querySelectorAll('button, a, [tabindex]').forEach(item => item.setAttribute('tabindex', '-1'));
      copy.addEventListener('mousedown', event => event.preventDefault());
      return copy;
    }
    const before = document.createDocumentFragment();
    const after = document.createDocumentFragment();
    for (let cycleIndex = 0; cycleIndex < bufferCycles; cycleIndex++) {
      originals.forEach(card => { before.appendChild(copyCard(card)); after.appendChild(copyCard(card)); });
    }
    track.prepend(before);
    track.append(after);
    const cards = Array.from(track.children);
    const realIndex = index => ((index - bufferCount) % count + count) % count;
    const cardLeft = index => cards[index].offsetLeft - (track.clientWidth - cards[index].offsetWidth) / 2;

    function normalize() {
      if (!cycle) return;
      const shift = Math.floor((offset - base) / cycle) * cycle;
      offset -= shift;
      if (move) { move.from -= shift; move.to -= shift; }
    }
    function render() {
      normalize();
      track.scrollTo({ left: offset, behavior: 'instant' });
      expectedScroll = track.scrollLeft;
      position = bufferCount + Math.round((offset - base) / stride);
      const index = realIndex(position);
      if (index !== previousIndex) {
        counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(count).padStart(2, '0');
        previousIndex = index;
      }
    }
    function canAnimate() {
      return cycle > 0 && visible && !interacting && !document.hidden &&
        !(dialog && dialog.open) && (!paused || move);
    }
    function tick(now) {
      frame = null;
      if (!canAnimate()) { lastTime = null; return; }
      const elapsed = lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      // Preserve native scrolling caused by keyboard focus or touch input.
      if (Math.abs(track.scrollLeft - expectedScroll) > 1) offset = track.scrollLeft;
      if (move) {
        if (move.started === null) move.started = now;
        const progress = Math.min((now - move.started) / 450, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        offset = move.from + (move.to - move.from) * eased;
        if (progress === 1) move = null;
      } else offset += elapsed * speed;
      render();
      if (canAnimate()) frame = window.requestAnimationFrame(tick);
    }
    function schedule() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      pauseButton.textContent = paused ? '▷' : 'Ⅱ';
      pauseButton.setAttribute('aria-label', paused ? '播放照片跑馬燈' : '暫停照片跑馬燈');
      pauseButton.setAttribute('aria-pressed', String(paused));
      if (canAnimate()) frame = window.requestAnimationFrame(tick);
    }
    function step(direction) {
      offset = track.scrollLeft;
      normalize();
      const nearest = bufferCount + Math.round((offset - base) / stride);
      const target = nearest + direction;
      const destination = cardLeft(target);
      move = motion.matches ? null : { from: offset, to: destination, started: null };
      if (!move) { offset = destination; render(); }
      announcement.textContent = '第 ' + (realIndex(target) + 1) + ' 張，共 ' + count + ' 張照片';
      schedule();
    }
    carousel.querySelectorAll('[data-carousel-step]').forEach(button => {
      button.addEventListener('click', () => step(Number(button.dataset.carouselStep)));
    });
    pauseButton.addEventListener('click', () => {
      paused = !paused;
      move = null;
      schedule();
    });
    track.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      step(event.key === 'ArrowRight' ? 1 : -1);
    });

    function resumeAfterScroll() {
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        if (pointerId !== null) return;
        offset = track.scrollLeft;
        interacting = false;
        render();
        schedule();
      }, 180);
    }
    track.addEventListener('pointerdown', event => {
      if (event.button !== 0 || pointerId !== null) return;
      pointerId = event.pointerId;
      suppressClick = false;
      interacting = true;
      move = null;
      window.clearTimeout(resumeTimer);
      offset = track.scrollLeft;
      if (event.pointerType === 'mouse') drag = { x: event.clientX, left: offset, moved: false };
      schedule();
    });
    track.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== pointerId) return;
      const distance = event.clientX - drag.x;
      if (!drag.moved && Math.abs(distance) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        track.classList.add('is-dragging');
        track.setPointerCapture(pointerId);
      }
      event.preventDefault();
      track.scrollLeft = drag.left - distance;
    });
    function releasePointer(event) {
      if (event.pointerId !== pointerId) return;
      suppressClick = Boolean(drag && drag.moved);
      drag = null;
      pointerId = null;
      track.classList.remove('is-dragging');
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
      resumeAfterScroll();
    }
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
    track.addEventListener('wheel', () => {
      interacting = true;
      move = null;
      schedule();
      resumeAfterScroll();
    }, { passive: true });
    track.addEventListener('scroll', () => {
      if (interacting && pointerId === null) resumeAfterScroll();
    }, { passive: true });
    track.addEventListener('click', event => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }, true);
    track.querySelectorAll('img').forEach(img => { img.draggable = false; });
    document.addEventListener('visibilitychange', schedule);
    if (dialog) dialog.addEventListener('close', schedule);

    function measure() {
      const phase = cycle ? ((offset - base) % cycle + cycle) % cycle / cycle : 0;
      base = cardLeft(bufferCount);
      cycle = cardLeft(bufferCount + count) - base;
      stride = cards[bufferCount + 1].offsetLeft - cards[bufferCount].offsetLeft;
      offset = base + phase * cycle;
      move = null;
      render();
      schedule();
    }
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        schedule();
      });
      observer.observe(carousel);
    } else visible = true;
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(track);
    else window.addEventListener('resize', measure);
    controls.hidden = false;
    measure();
  });
})();
