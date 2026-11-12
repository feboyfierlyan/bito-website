/* One persistent feature pill: position and velocity survive every retarget. */
(function (root) {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // Exact critically damped spring. Stable across 60/120 Hz and dropped frames.
  function step(value, velocity, target, dt, omega = 26) {
    const offset = value - target, decay = Math.exp(-omega * dt);
    const carry = velocity + omega * offset;
    return { value: target + (offset + carry * dt) * decay,
      velocity: (velocity - omega * carry * dt) * decay };
  }
  function target(width, height, pillWidth, pillHeight, x, y) {
    const padX = Math.min(width / 2, pillWidth * .58 + 10);
    const padY = Math.min(height / 2, pillHeight * .62 + 10);
    return { x: clamp(x, padX, width - padX) - width / 2,
      y: clamp(y, padY, height - padY) - (height / 2 + 15) };
  }
  function create(link) {
    const pill = link?.querySelector('.peek-play');
    const surface = link?.querySelector('.sticker-art');
    if (!pill || !surface) return null;
    const glass = root.BitoGlass?.create(surface, pill);
    const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
    let reduced = false, active = false, dead = false, frame = 0, last = 0;
    let x = 0, y = 0, vx = 0, vy = 0, mix = 0, vm = 0;
    let tx = 0, ty = 0, pointer = null;
    const cleanups = [];
    function on(el, event, handler, options) {
      el.addEventListener(event, handler, options);
      cleanups.push(() => el.removeEventListener(event, handler, options));
    }
    function paint() {
      pill.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`;
      // Stretch only the surface; the label stays sharp and upright.
      const stretchX = Math.min(.10, Math.abs(vx) / 12000);
      const stretchY = Math.min(.10, Math.abs(vy) / 9000);
      pill.style.setProperty('--peek-sx', String(1 + mix * .035 + stretchX - stretchY * .25));
      pill.style.setProperty('--peek-sy', String(1 + mix * .035 + stretchY - stretchX * .35));
      pill.style.setProperty('--peek-lift', String(mix));
      glass?.render(x, y);
    }
    function tick(now) {
      frame = 0;
      const dt = Math.min((now - last) / 1000, .064); last = now;
      ({ value: x, velocity: vx } = step(x, vx, tx, dt));
      ({ value: y, velocity: vy } = step(y, vy, ty, dt));
      ({ value: mix, velocity: vm } = step(mix, vm, active ? 1 : 0, dt, 20));
      const moving = Math.abs(x - tx) + Math.abs(y - ty) > .05 ||
        Math.abs(vx) + Math.abs(vy) > .1 || Math.abs(mix - (active ? 1 : 0)) > .001;
      if (!moving) { x = tx; y = ty; vx = vy = vm = 0; mix = active ? 1 : 0; }
      paint();
      if (moving) frame = requestAnimationFrame(tick);
      else pill.style.willChange = '';
    }
    function start() {
      if (frame || dead) return;
      last = performance.now(); pill.style.willChange = 'transform';
      frame = requestAnimationFrame(tick);
    }
    function home(immediate = false) {
      active = false; pointer = null; tx = ty = 0;
      link.removeAttribute('data-peek-following');
      if (immediate || reduced || document.hidden) {
        cancelAnimationFrame(frame); frame = 0;
        x = y = vx = vy = mix = vm = 0; paint(); pill.style.willChange = '';
      } else start();
    }
    function move(event) {
      if (link.classList.contains('is-expanded')) { home(); return; }
      if (event.pointerType !== 'mouse' || !fine.matches || reduced || document.hidden ||
          link.matches(':focus-visible')) return;
      pointer = { x: event.clientX, y: event.clientY };
      aim();
    }
    function aim() {
      if (!pointer) return;
      const rect = surface.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (pointer.x < rect.left || pointer.x > rect.right || pointer.y < rect.top || pointer.y > rect.bottom) {
        home(); return;
      }
      const width = surface.clientWidth, height = surface.clientHeight;
      const next = target(width, height, pill.offsetWidth, pill.offsetHeight,
        (pointer.x - rect.left) * width / rect.width,
        (pointer.y - rect.top) * height / rect.height);
      tx = next.x; ty = next.y; active = true;
      link.setAttribute('data-peek-following', 'true'); start();
    }
    on(link, 'pointerenter', move);
    on(link, 'pointermove', move, { passive: true });
    on(link, 'pointerleave', () => home());
    on(link, 'pointercancel', () => home());
    on(link, 'focus', () => { if (link.matches(':focus-visible')) home(true); });
    on(link, 'keydown', () => home(true));
    on(window, 'blur', () => home(true));
    on(window, 'scroll', () => home(), { passive: true });
    on(document, 'visibilitychange', () => { if (document.hidden) home(true); });
    on(fine, 'change', () => { if (!fine.matches) home(true); });
    const resize = new ResizeObserver(() => { if (active) aim(); });
    resize.observe(surface); resize.observe(pill);
    return {
      setReducedMotion(value) { reduced = value; if (value) home(true); },
      dispose() { dead = true; home(true); resize.disconnect(); glass?.dispose(); cleanups.forEach(fn => fn()); }
    };
  }
  const api = { step, target, create };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BitoPeek = api;
})(typeof window !== 'undefined' ? window : globalThis);
