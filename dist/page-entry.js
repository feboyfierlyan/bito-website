/* One entrance sequence, separate from Rive, drag transforms and feature demos. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BitoEntry = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  function mount(scope) {
    const {document} = scope, html = document.documentElement;
    const title = [...document.querySelectorAll('[data-entry-title]')];
    const hero = [...document.querySelectorAll('[data-entry="hero"]')];
    const sections = [...document.querySelectorAll('[data-entry="section"]')];
    const all = [...title, ...hero, ...sections];
    const pending = new Set(), animations = new Map(), timers = new Set();
    let observer, started = false, done = false, nextSectionAt = 0;
    let restorationChecked = false, restoreFrame = 0, restoreHandler;
    const later = (fn, ms) => {
      const id = scope.setTimeout(() => { timers.delete(id); fn(); }, ms);
      timers.add(id);
    };
    function expose(el) {
      pending.delete(el); el.classList.remove('entry-pending');
      const animation = animations.get(el);
      animations.delete(el); animation?.cancel();
      observer?.unobserve(el);
    }
    function finish() {
      done = true;
      timers.forEach(id => scope.clearTimeout(id)); timers.clear();
      all.forEach(expose); observer?.disconnect();
      html.classList.remove('entry-boot');
      scope.clearTimeout(scope.bitoEntrySafety);
      if (restoreFrame) scope.cancelAnimationFrame(restoreFrame);
      if (restoreHandler) scope.removeEventListener('pageshow', restoreHandler);
    }
    function animate(el, frames, options) {
      if (!pending.has(el) || done) return;
      try {
        const animation = el.animate(frames, {fill: 'both', ...options});
        animations.set(el, animation);
        animation.finished.then(() => expose(el), () => expose(el));
      } catch { expose(el); }
    }
    const reveal = (el, delay = 0) => animate(el, [
      {opacity: 0, filter: 'blur(5px)', translate: '0 -10px'},
      {opacity: 1, filter: 'blur(0px)', translate: '0 0'}
    ], {duration: 1150, delay, easing: 'cubic-bezier(.25, .46, .45, .94)'});
    function openSections() {
      if (done) return;
      if (!scope.IntersectionObserver) { sections.forEach(el => expose(el)); return; }
      observer = new scope.IntersectionObserver(entries => {
        entries.filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach(entry => {
            observer.unobserve(entry.target);
            const now = scope.performance?.now() ?? Date.now();
            nextSectionAt = Math.max(now, nextSectionAt);
            reveal(entry.target, nextSectionAt - now);
            nextSectionAt += 100;
          });
      }, {rootMargin: '0px 0px -24px 0px', threshold: 0});
      sections.forEach(el => observer.observe(el));
    }
    function start(quiet) {
      if (quiet) { finish(); return; }
      if (started || done) return;
      // Reload/history restore can happen after deferred scripts run. Let the
      // browser finish before deciding whether an intro at the top is wanted.
      if (scope.bitoReturningNavigation && !restorationChecked) {
        if (restoreHandler) return;
        restoreHandler = () => {
          restoreFrame = scope.requestAnimationFrame(() => {
            restoreFrame = scope.requestAnimationFrame(() => {
              restoreFrame = 0; restorationChecked = true; start(quiet);
            });
          });
        };
        if (document.readyState === 'complete') restoreHandler();
        else scope.addEventListener('pageshow', restoreHandler, {once: true});
        return;
      }
      started = true;
      // Deep links and restored scroll positions should land on readable content.
      if (!html.classList.contains('entry-boot') || scope.location.hash || scope.scrollY > 2 ||
          document.hidden || !title[0]?.animate) { finish(); return; }
      all.forEach(el => { pending.add(el); el.classList.add('entry-pending'); });
      html.classList.remove('entry-boot');
      scope.clearTimeout(scope.bitoEntrySafety);
      title.forEach((el, index) => animate(el, [
        {opacity: 0, transform: 'perspective(900px) translate3d(0, 14%, 0) rotateX(-38deg)', filter: 'blur(2px)'},
        {opacity: 1, transform: 'perspective(900px) translate3d(0, 0, 0) rotateX(0deg)', filter: 'blur(0px)'}
      ], {duration: 900, delay: 40 + index * 75, easing: 'cubic-bezier(.25, .46, .45, .94)'}));
      // Distinct content beats, independent of the absolute desktop positions.
      // Closely stagger starts while each slow reveal continues underneath.
      const phases = [['windows', 620], ['icons', 720], ['description', 820],
        ['actions', 920], ['preview', 1020], ['hint', 1100]];
      const visible = hero.map(el => ({el, rect: el.getBoundingClientRect()}))
        .filter(({rect}) => rect.width && rect.height);
      let heroEnd = 1090;
      for (const [group, at] of phases) {
        visible.filter(({el}) => (el.getAttribute('data-entry-group') || 'icons') === group)
          .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
          .forEach(({el}, index) => {
            const delay = at + Math.min(index * 25, 75);
            reveal(el, delay); heroEnd = Math.max(heroEnd, delay + 1150);
          });
      }
      hero.filter(el => !animations.has(el)).forEach(expose);
      later(openSections, heroEnd - 1000);
      // Background tabs must not retain a half-finished entrance on return.
      later(() => { title.forEach(expose); hero.forEach(expose); }, heroEnd + 250);
    }
    const navigation = event => {
      if (event.target.closest?.('a[href^="#"]')) finish();
    };
    const focus = event => {
      const target = event.target.closest?.('[data-entry], [data-entry-title]');
      if (target && pending.has(target)) expose(target);
    };
    const visibility = () => { if (document.hidden) finish(); };
    const scroll = () => {
      if (!started || done || observer || scope.scrollY < scope.innerHeight * .55) return;
      // Scrolling ahead is intent to read; don't leave a blank section waiting
      // for the offscreen headline's choreography.
      timers.forEach(id => scope.clearTimeout(id)); timers.clear();
      title.forEach(expose); hero.forEach(expose); openSections();
    };
    document.addEventListener('click', navigation);
    document.addEventListener('focusin', focus);
    document.addEventListener('visibilitychange', visibility);
    scope.addEventListener('hashchange', finish);
    scope.addEventListener('pagehide', finish);
    scope.addEventListener('scroll', scroll, {passive: true});
    return {start, setReducedMotion(value) { if (value) finish(); }, dispose() {
      finish();
      document.removeEventListener('click', navigation);
      document.removeEventListener('focusin', focus);
      document.removeEventListener('visibilitychange', visibility);
      scope.removeEventListener('hashchange', finish);
      scope.removeEventListener('pagehide', finish);
      scope.removeEventListener('scroll', scroll);
    }};
  }
  return {mount};
});
