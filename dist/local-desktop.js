/* Keep the student examples still when their hero is out of view. */
(() => {
  'use strict';
  const stage = document.querySelector('#stage');
  if (!stage) return;
  let visible = true;
  const sync = () => stage.toggleAttribute('data-student-motion', visible && !document.hidden);
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  }) : null;
  observer?.observe(stage);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pageshow', sync);
  window.addEventListener('pagehide', event => {
    stage.removeAttribute('data-student-motion');
    if (event.persisted) return;
    observer?.disconnect();
    document.removeEventListener('visibilitychange', sync);
    window.removeEventListener('pageshow', sync);
  });
  sync();
})();
