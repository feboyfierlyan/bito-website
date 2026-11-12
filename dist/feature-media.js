/* Load recordings on view and honor manual pause and reduced motion. */
(() => {
  const states = new Map([...document.querySelectorAll('.feature-video')].map(video => {
    const player = video.closest('.feature-window-body');
    return [video, {
      player,
      toggle: player.querySelector('.feature-video-toggle'),
      progress: player.querySelector('.feature-progress'),
      scrubber: player.querySelector('.feature-progress-input'),
      visible: false,
      userPaused: false,
      frame: 0,
    }];
  }));
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { reduced ||= localStorage.getItem('bito-reduced-motion') === 'true'; } catch {}

  function play(video, state) {
    video.play().then(() => {
      if (!state.visible || document.hidden || state.userPaused) video.pause();
    }).catch(() => {});
  }

  function sync(video, state) {
    if (!state.visible || document.hidden) video.pause();
    else if (!reduced && !state.userPaused && video.paused) play(video, state);
  }

  function updateProgress(video, state) {
    const { currentTime, duration } = video;
    const ready = Number.isFinite(duration) && duration > 0;
    const progress = ready ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
    state.progress.style.setProperty('--video-progress', progress * 100 + '%');
    state.scrubber.disabled = !ready;
    state.scrubber.value = Math.round(progress * 1000);
    state.scrubber.setAttribute('aria-valuetext', Math.floor(currentTime) + ' dari ' + (ready ? Math.ceil(duration) : 0) + ' detik');
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target);
      state.visible = entry.isIntersecting && entry.intersectionRatio >= .35;
      sync(entry.target, state);
    }
  }, { threshold: [0, .35] });

  for (const [video, state] of states) {
    const { player, toggle, scrubber } = state;
    video.muted = true;
    function updatePlayback() {
      cancelAnimationFrame(state.frame);
      player.classList.toggle('is-playing', !video.paused);
      toggle.setAttribute('aria-label', (video.paused ? 'Putar' : 'Jeda') + ' demo ' + toggle.dataset.demoTitle);
      function tick() {
        updateProgress(video, state);
        if (!video.paused) state.frame = requestAnimationFrame(tick);
      }
      tick();
    }
    toggle.addEventListener('click', () => {
      state.userPaused = !video.paused;
      if (state.userPaused) video.pause();
      else play(video, state);
    });
    scrubber.addEventListener('input', () => {
      video.currentTime = Number(scrubber.value) / 1000 * video.duration;
      updateProgress(video, state);
    });
    video.addEventListener('loadedmetadata', () => updateProgress(video, state));
    video.addEventListener('seeked', () => updateProgress(video, state));
    video.addEventListener('play', updatePlayback);
    video.addEventListener('pause', updatePlayback);
    observer.observe(video);
  }

  function syncAll() {
    for (const [video, state] of states) sync(video, state);
  }

  document.addEventListener('visibilitychange', syncAll);
  window.BitoFeatureMedia = {
    setReducedMotion(value) {
      reduced = value;
      if (reduced) {
        for (const video of states.keys()) video.pause();
      } else {
        syncAll();
      }
    },
  };
  window.addEventListener('pagehide', () => {
    for (const video of states.keys()) video.pause();
  });
  window.addEventListener('pageshow', syncAll);
})();
