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
    if (peekState) syncPeekPlayback();
  }

  const peek = document.querySelector('.scene-peek');
  const peekVideo = peek?.querySelector('.peek-video');
  const stage = document.querySelector('#stage');
  const peekState = peek && peekVideo ? {
    chrome: peek.querySelector('.peek-chrome'),
    label: peek.querySelector('.peek-play-label'),
    progress: peek.querySelector('.feature-progress'),
    scrubber: peek.querySelector('.feature-progress-input'),
    home: null,
    backdrop: null,
    visible: true,
    expanded: false,
    closingTimer: 0,
    openedScrollY: 0,
    frame: 0,
  } : null;

  function syncPeekPlayback() {
    if (!peekState) return;
    if (document.hidden || reduced || (!peekState.visible && !peekState.expanded)) {
      peekVideo.pause();
    } else if (peekVideo.paused) {
      peekVideo.play().catch(() => {});
    }
  }

  function getExpandedRect() {
    const padX = Math.max(16, Math.min(48, Math.round(window.innerWidth * 0.035)));
    const padY = Math.max(16, Math.min(42, Math.round(window.innerHeight * 0.04)));
    const chromeH = peekState?.chrome?.offsetHeight || 30;
    const maxW = Math.min(window.innerWidth - padX * 2, 1680);
    const maxVideoH = Math.max(180, window.innerHeight - padY * 2 - chromeH);
    const width = Math.min(maxW, Math.round(maxVideoH * 16 / 9));
    const height = Math.round(width * 9 / 16) + chromeH;
    const left = Math.round((window.innerWidth - width) / 2);
    const top = Math.round((window.innerHeight - height) / 2);
    return { left, top, width, height };
  }

  function applyBox(el, box) {
    el.style.left = box.left + 'px';
    el.style.top = box.top + 'px';
    el.style.width = box.width + 'px';
    el.style.height = box.height + 'px';
  }

  function clearFloatingStyles() {
    if (!peekState) return;
    clearTimeout(peekState.closingTimer);
    peekState.closingTimer = 0;
    peek.classList.remove('is-floating', 'is-expanded');
    stage?.classList.remove('is-peek-floating');
    peek.style.left = '';
    peek.style.top = '';
    peek.style.width = '';
    peek.style.height = '';
    peek.style.transition = '';
  }

  function syncPeekMetrics() {
    if (!peekState || !stage || !peekState.home) return;
    const extra = Math.max(0, Math.ceil(peekState.home.offsetTop + peekState.home.offsetHeight - stage.clientHeight + 56));
    stage.style.setProperty('--stage-peek-space', extra + 'px');
    if (peekState.expanded) {
      applyBox(peek, getExpandedRect());
    } else if (peek.classList.contains('is-floating')) {
      applyBox(peek, peekState.home.getBoundingClientRect());
    }
  }

  function openPeek() {
    if (!peekState || peekState.expanded) return;
    clearTimeout(peekState.closingTimer);
    peekState.closingTimer = 0;
    const startRect = peek.getBoundingClientRect();
    peekState.expanded = true;
    peekState.openedScrollY = window.scrollY;
    stage?.classList.add('is-peek-floating');
    peek.classList.add('is-floating');
    if (!reduced) {
      peek.style.transition = 'none';
      applyBox(peek, startRect);
      void peek.offsetWidth;
      peek.style.transition = '';
    }
    peek.classList.add('is-expanded');
    peek.setAttribute('aria-expanded', 'true');
    peek.setAttribute('aria-label', 'Kecilkan video Bito in action');
    peekState.backdrop?.classList.add('is-visible');
    applyBox(peek, getExpandedRect());
    syncPeekPlayback();
  }

  function closePeek(immediate = false) {
    if (!peekState || (!peekState.expanded && !peek.classList.contains('is-floating'))) return;
    clearTimeout(peekState.closingTimer);
    peekState.expanded = false;
    peek.classList.remove('is-expanded');
    peek.setAttribute('aria-expanded', 'false');
    peek.setAttribute('aria-label', 'Perbesar video Bito in action ke layar penuh');
    peekState.backdrop?.classList.remove('is-visible');
    if (immediate || reduced || !peekState.home) {
      clearFloatingStyles();
      return;
    }
    applyBox(peek, peekState.home.getBoundingClientRect());
    peekState.closingTimer = window.setTimeout(clearFloatingStyles, 590);
  }

  if (peekState) {
    const home = document.createElement('span');
    home.className = 'scene-peek-home';
    home.setAttribute('aria-hidden', 'true');
    peek.before(home);
    peekState.home = home;

    const backdrop = document.createElement('div');
    backdrop.className = 'peek-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    peek.before(backdrop);
    peekState.backdrop = backdrop;

    peekVideo.muted = true;
    const updatePeekProgress = () => updateProgress(peekVideo, peekState);
    const updatePeekPlayback = () => {
      cancelAnimationFrame(peekState.frame);
      const playing = !peekVideo.paused;
      peek.classList.toggle('is-playing', playing);
      function tick() {
        updatePeekProgress();
        if (!peekVideo.paused) peekState.frame = requestAnimationFrame(tick);
      }
      tick();
    };

    const peekObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        peekState.visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        syncPeekPlayback();
      }
    }, { threshold: [0, 0.15] });
    peekObserver.observe(home);

    peek.addEventListener('click', event => {
      if (event.target.closest('.feature-progress')) {
        event.stopPropagation();
        return;
      }
      event.preventDefault();
      if (!peekState.expanded) openPeek();
      else closePeek();
    });
    backdrop.addEventListener('click', () => closePeek());
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && peekState.expanded) {
        event.preventDefault();
        closePeek();
      }
    });
    window.addEventListener('scroll', () => {
      if (peekState.expanded && Math.abs(window.scrollY - peekState.openedScrollY) > 150) {
        closePeek();
      } else if (!peekState.expanded && peek.classList.contains('is-floating') && peekState.home) {
        applyBox(peek, peekState.home.getBoundingClientRect());
      }
    }, { passive: true });

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
    syncPeekMetrics();
    syncPeekPlayback();
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
