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
    if (peekState?.expanded && !peekState.userPaused && !reduced && !document.hidden) {
      peekVideo.play().catch(() => {});
    } else if (document.hidden) {
      peekVideo?.pause();
    }
  }

  const peek = document.querySelector('.scene-peek');
  const peekVideo = peek?.querySelector('.peek-video');
  const stage = document.querySelector('#stage');
  const peekState = peek && peekVideo ? {
    chrome: peek.querySelector('.peek-chrome'),
    label: peek.querySelector('.peek-play-label'),
    progress: peek.querySelector('.feature-progress'),
    scrubber: peek.querySelector('.feature-progress-input'),
    expanded: false,
    userPaused: false,
    frame: 0,
  } : null;

  function syncPeekMetrics() {
    if (!peekState) return;
    if (!peekState.expanded) {
      stage?.style.setProperty('--stage-peek-space', '0px');
      return;
    }
    const width = peek.clientWidth;
    const chromeH = peekState.chrome?.offsetHeight || 30;
    const openH = Math.round(width * 9 / 16 + chromeH);
    peek.style.setProperty('--peek-open-height', openH + 'px');
    if (stage) {
      const extra = Math.max(0, Math.ceil(peek.offsetTop + openH - stage.clientHeight + 44));
      stage.style.setProperty('--stage-peek-space', extra + 'px');
    }
  }

  if (peekState) {
    peekVideo.muted = true;
    const updatePeekProgress = () => updateProgress(peekVideo, peekState);
    const updatePeekPlayback = () => {
      cancelAnimationFrame(peekState.frame);
      const playing = !peekVideo.paused;
      peek.classList.toggle('is-playing', playing);
      peek.setAttribute('aria-label', playing ? 'Jeda demo Bito in action' : 'Putar demo Bito in action, 20 detik');
      if (peekState.label) {
        peekState.label.textContent = !playing && peekState.expanded ? 'Lanjutkan demo' : 'Putar demo · 20 dtk';
      }
      function tick() {
        updatePeekProgress();
        if (!peekVideo.paused) peekState.frame = requestAnimationFrame(tick);
      }
      tick();
    };
    peek.addEventListener('click', event => {
      if (event.target.closest('.feature-progress')) {
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      if (!peekState.expanded) {
        peekState.expanded = true;
        peekState.userPaused = false;
        peek.classList.add('is-expanded');
        stage?.classList.add('is-peek-open');
        syncPeekMetrics();
        peekVideo.play().catch(() => {});
        const rect = peek.getBoundingClientRect();
        const openH = parseFloat(peek.style.getPropertyValue('--peek-open-height')) || rect.height;
        const neededBottom = rect.top + openH + 28;
        if (neededBottom > window.innerHeight) {
          const delta = Math.min(neededBottom - window.innerHeight, Math.max(0, rect.top - 96));
          if (delta > 12) window.scrollBy({ top: delta, behavior: reduced ? 'auto' : 'smooth' });
        }
      } else {
        peekState.userPaused = !peekVideo.paused;
        if (peekState.userPaused) peekVideo.pause();
        else peekVideo.play().catch(() => {});
      }
    });
    peekState.scrubber.addEventListener('click', event => event.stopPropagation());
    peekState.scrubber.addEventListener('input', () => {
      if (Number.isFinite(peekVideo.duration) && peekVideo.duration > 0) {
        peekVideo.currentTime = Number(peekState.scrubber.value) / 1000 * peekVideo.duration;
        updatePeekProgress();
      }
    });
    peekVideo.addEventListener('loadedmetadata', updatePeekProgress);
    peekVideo.addEventListener('seeked', updatePeekProgress);
    peekVideo.addEventListener('play', updatePeekPlayback);
    peekVideo.addEventListener('pause', updatePeekPlayback);
    window.addEventListener('resize', syncPeekMetrics, { passive: true });
  }

  document.addEventListener('visibilitychange', syncAll);
  window.BitoFeatureMedia = {
    setReducedMotion(value) {
      reduced = value;
      if (reduced) {
        for (const video of states.keys()) video.pause();
        peekVideo?.pause();
      } else {
        syncAll();
      }
    },
  };
  window.addEventListener('pagehide', () => {
    for (const video of states.keys()) video.pause();
    peekVideo?.pause();
  });
  window.addEventListener('pageshow', syncAll);
})();
