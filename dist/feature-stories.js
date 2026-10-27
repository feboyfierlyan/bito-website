/* Local illustrative conversations. No AI requests and no automatic looping:
   each new scroll entry owns a fresh, cancellable animation sequence. */
(function (scope, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (scope.document && scope.gsap && scope.ScrollTrigger) {
    scope.BitoFeatures = api.mount(scope);
  }
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function readingRow(bounds, height, previous = -1) {
    const line = height * .52;
    const candidates = bounds.map((b, index) => ({index, distance: Math.abs((b.top + b.bottom) / 2 - line), visible: b.bottom > height * .12 && b.top < height * .88})).filter(b => b.visible);
    if (!candidates.length) return -1;
    candidates.sort((a, b) => a.distance - b.distance);
    const last = candidates.find(b => b.index === previous);
    return last && candidates[0].distance + 24 >= last.distance ? previous : candidates[0].index;
  }

  function conversation(root, gsap) {
    const prompt = root.querySelector('.feature-prompt');
    const answer = root.querySelector('.feature-answer');
    const indicator = root.querySelector('.feature-typing');
    const dots = [...indicator.querySelectorAll('i')];
    const promptText = root.querySelector('[data-feature-prompt]');
    const answerText = root.querySelector('[data-feature-answer]');
    const request = Array.from(prompt.querySelector('.feature-measure').textContent);
    const response = Array.from(answer.querySelector('.feature-measure').textContent);
    let timeline, pulse, version = 0, running = false;
    function stop() {
      ++version;
      running = false;
      timeline?.kill(); pulse?.kill();
      timeline = pulse = null;
      gsap.killTweensOf([prompt, answer, indicator, ...dots]);
      gsap.set(indicator, {autoAlpha: 0});
    }
    function finish() {
      stop();
      promptText.textContent = request.join(''); answerText.textContent = response.join('');
      gsap.set([prompt, answer], {autoAlpha: 1, scaleX: 1, scaleY: 1, y: 0});
    }
    function start(reduced = false) {
      if (reduced) { finish(); return; }
      stop(); running = true;
      const current = version;
      const typed = {prompt: 0, answer: 0};
      promptText.textContent = answerText.textContent = '';
      gsap.set([prompt, answer], {autoAlpha: 0, scaleX: .94, scaleY: .97, y: 7});
      gsap.set(dots, {y: 0, opacity: .45});
      const duration = clamp(request.length * .033, .65, 1.6);
      const waiting = .16 + duration + .28;
      const replying = waiting + 1.05;
      timeline = gsap.timeline();
      timeline.to(prompt, {autoAlpha: 1, scaleX: 1, scaleY: 1, y: 0, duration: .42, ease: 'power3.out'}, .12)
        .to(typed, {prompt: request.length, duration, ease: 'none', onUpdate() {
          if (version === current) promptText.textContent = request.slice(0, Math.floor(typed.prompt)).join('');
        }}, .16)
        .to(indicator, {autoAlpha: 1, duration: .18}, waiting)
        .call(() => {
          if (version !== current) return;
          pulse = gsap.to(dots, {y: -3, opacity: 1, stagger: .13, repeat: -1, yoyo: true, duration: .28, ease: 'sine.inOut'});
        }, [], waiting)
        .to(indicator, {autoAlpha: 0, duration: .14}, replying)
        .call(() => { pulse?.kill(); pulse = null; }, [], replying)
        .to(answer, {autoAlpha: 1, scaleX: 1, scaleY: 1, y: 0, duration: .42, ease: 'power3.out'}, replying + .1)
        .to(typed, {answer: response.length, duration: clamp(response.length * .025, .5, 1.2), ease: 'none', onUpdate() {
          if (version === current) answerText.textContent = response.slice(0, Math.floor(typed.answer)).join('');
        }, onComplete() {
          if (version === current) { promptText.textContent = request.join(''); answerText.textContent = response.join(''); running = false; }
        }}, replying + .15);
    }
    finish();
    return {start, stop, finish, pause() {timeline?.pause(); pulse?.pause();}, resume() {if(running) {timeline?.resume(); pulse?.resume();}}};
  }

  function mount(scope) {
    const {document, gsap, ScrollTrigger} = scope;
    const rows = [...document.querySelectorAll('[data-feature]')];
    const surfaces = rows.map(row => row.querySelector('.feature-surface'));
    const sequences = rows.map(row => conversation(row, gsap));
    let active = -1, reduced = null, disposed = false;
    gsap.registerPlugin(ScrollTrigger);
    function sync() {
      if (disposed || document.hidden) return;
      const next = readingRow(rows.map(row => row.getBoundingClientRect()), scope.innerHeight, active);
      if (next === active) return;
      if (active >= 0) sequences[active].stop();
      active = next;
      surfaces.forEach((surface, index) => {
        rows[index].classList.toggle('feature-active', index === active);
        gsap.to(surface, {opacity: reduced || index === active ? 1 : .3, scale: reduced || index === active ? 1 : .95, duration: reduced ? 0 : .62, ease: 'power3.out', overwrite: true});
      });
      if (active >= 0) sequences[active].start(reduced);
    }
    function setReducedMotion(value) {
      if (disposed || reduced === value) return;
      reduced = value;
      gsap.killTweensOf(surfaces);
      sequences.forEach(sequence => sequence.finish());
      surfaces.forEach((surface, index) => gsap.set(surface, {opacity: reduced || index === active ? 1 : .3, scale: reduced || index === active ? 1 : .95}));
      if (active >= 0 && !document.hidden) sequences[active].start(reduced);
    }
    setReducedMotion(scope.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const trigger = ScrollTrigger.create({trigger: '#gaya', start: 'top bottom', end: 'bottom top', onUpdate: sync, onRefresh: sync, onEnter: sync, onEnterBack: sync, onLeave: sync, onLeaveBack: sync});
    const visibility = () => {
      if (document.hidden) sequences.forEach(sequence => sequence.pause());
      else {sync(); if (active >= 0) sequences[active].resume();}
    };
    document.addEventListener('visibilitychange', visibility);
    sync();
    return {setReducedMotion, dispose() {
      disposed = true;
      trigger.kill(); sequences.forEach(sequence => sequence.stop()); gsap.killTweensOf(surfaces);
      document.removeEventListener('visibilitychange', visibility);
    }};
  }
  return {readingRow, conversation, mount};
});
