/* Clear lens over this static preview. A decorative scene copy supplies real
 * background detail to SVG displacement, without backdrop-url browser gaps.
 * It never includes the control, interactive nodes, or accessibility content. */
(function (root) {
  'use strict';
  function create(surface, pill) {
    const lens = pill.querySelector('.peek-glass-lens');
    if (!lens) return null;
    const scene = document.createElement('span');
    scene.className = 'peek-glass-scene';
    scene.setAttribute('aria-hidden', 'true');
    scene.setAttribute('inert', '');
    for (const selector of ['.peek-chrome', '.peek-desktop']) {
      const original = surface.querySelector(selector);
      if (!original) continue;
      const copy = original.cloneNode(true);
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      copy.querySelectorAll('video, .feature-progress').forEach(node => node.remove());
      if (selector === '.peek-desktop') {
        copy.style.background = "url('assets/demos/bito-in-action.jpg') center 26% / cover no-repeat";
      }
      scene.append(copy);
    }
    lens.append(scene);
    let width = 0, height = 0, pw = 0, ph = 0, x = 0, y = 0;
    function render(nextX = x, nextY = y) {
      x = nextX; y = nextY;
      const left = width / 2 + x - pw / 2;
      const top = height / 2 + 15 + y - ph / 2;
      scene.style.transform = `translate3d(${-left}px, ${-top}px, 0)`;
      // A broad highlight follows the light's angle as the lens moves.
      pill.style.setProperty('--peek-light-x', `${50 + x / Math.max(width, 1) * 35}%`);
    }
    const resize = new ResizeObserver(() => {
      width = surface.clientWidth; height = surface.clientHeight;
      pw = pill.offsetWidth; ph = pill.offsetHeight;
      scene.style.width = `${width}px`; scene.style.height = `${height}px`;
      render();
    });
    resize.observe(surface); resize.observe(pill);
    return { render, dispose() { resize.disconnect(); scene.remove(); } };
  }
  root.BitoGlass = { create };
})(window);
