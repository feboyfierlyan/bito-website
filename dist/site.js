/* Bito presentation: local GSAP/Rive assets, no AI or account calls. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  let manualReduced = false;
  try { manualReduced = localStorage.getItem('bito-reduced-motion') === 'true'; } catch {}
  let reduced = manualReduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
  let riveInstance, rivePainted = false, riveFrame = 0, toneTimer, toneVersion = 0;
  let motionContext;
  const motionButton = $('#motion-toggle');
  const chapters = [
    ['01', 'KENALAN DULU', 'Satu nama. Satu teman baru.', 'Login Google, pilih nama panggilanmu, lalu gaya ngobrol yang kamu suka.'],
    ['02', 'BAWA KE DESKTOP', 'Dari sini, ikut harimu.', 'Tahan dan seret Bito keluar jendela perkenalan. Cari tempat yang nyaman.'],
    ['03', 'TINGGAL PANGGIL', 'Klik. Ngobrol. Lanjut lagi.', 'Chat muncul di dekat Bito. Seret karakternya untuk pindah, atau klik kanan untuk pilihan.'],
  ];
  let chapter = -1;
  function paintChapter(index) {
    if (chapter === index) return;
    chapter = index;
    const item = chapters[index];
    $('#journey-number').textContent = item[0];
    $('#journey-kicker').textContent = item[1];
    $('#journey-title').textContent = item[2];
    $('#journey-description').textContent = item[3];
    $$('.journey-dots span').forEach((dot, i) => dot.classList.toggle('active', i === index));
    $('.setup-title').textContent = index === 0 ? 'Hai, aku Bito.' : 'Enaknya ngobrol gimana?';
    $('.setup-description').textContent = index === 0 ? 'Aku panggil kamu siapa?' : 'To the point · Chill · Humoris · Care';
    $('.fake-composer > span').textContent = index === 0 ? 'Nama panggilanmu' : 'Chill';
  }
  paintChapter(0);
  const tones = {
    direct: { label: 'TO THE POINT', reply: 'apa?', caption: 'Langsung ke inti. Kadang satu kata udah cukup.' },
    chill: { label: 'CHILL', reply: 'wut', caption: 'Santai aja. Nggak harus ada topik besar.' },
    humor: { label: 'HUMORIS', reply: 'hadir, ketua', caption: 'Ada aja celetukannya. Lihat situasi juga, tentunya.' },
    care: { label: 'CARE', reply: 'iyaa, kenapa?', caption: 'Perhatian, tanpa buru-buru kasih nasihat.' },
  };
  $$('.tone-options button').forEach((button) => {
    button.addEventListener('click', () => {
      const tone = tones[button.dataset.tone];
      if (!tone || button.getAttribute('aria-pressed') === 'true') return;
      const version = ++toneVersion;
      clearTimeout(toneTimer);
      $$('.tone-options button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      $('#tone-label').textContent = tone.label;
      $('#tone-caption').textContent = tone.caption;
      const response = $('#tone-reply');
      const typing = $('#typing');
      gsap?.killTweensOf([response, typing]);
      response.hidden = true;
      typing.hidden = false;
      if (gsap && !reduced) gsap.fromTo(typing, { scale: .85, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: .25, transformOrigin: '0% 100%', ease: 'power2.out' });
      toneTimer = setTimeout(() => {
        if (version !== toneVersion) return;
        typing.hidden = true;
        response.textContent = tone.reply;
        response.hidden = false;
        if (gsap && !reduced) gsap.fromTo(response, { scaleX: .7, scaleY: .85, opacity: 0 }, { scaleX: 1, scaleY: 1, opacity: 1, duration: .45, transformOrigin: '0% 100%', ease: 'back.out(1.1)' });
      }, 900);
    });
  });

  function fitRive() {
    if (riveInstance) riveInstance.resizeDrawingSurfaceToCanvas(Math.min(devicePixelRatio || 1, 2));
  }
  function syncRive() {
    if (!riveInstance) return;
    if (document.hidden || reduced) riveInstance.pause();
    else riveInstance.play();
  }
  function checkRiveFrame() {
    if (rivePainted || riveFrame) return;
    riveFrame = requestAnimationFrame(() => {
      riveFrame = 0;
      const canvas = $('#bito-canvas');
      const context = canvas.getContext('2d');
      if (!context || !canvas.width || !canvas.height) return;
      try {
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let occupied = 0;
        for (let i = 3; i < pixels.length; i += 64) if (pixels[i] > 40) occupied++;
        // A blank loading frame never replaces the matching local poster.
        if (occupied > 100) {
          rivePainted = true;
          $('.mascot-viewport').classList.add('ready');
          syncRive();
        }
      } catch { /* Keep the poster if pixels cannot be inspected. */ }
    });
  }
  async function startRive() {
    if (!window.rive) return;
    try {
      window.rive.RuntimeLoader.setWasmUrl(new URL('assets/rive.wasm', location.href).href);
      riveInstance = new window.rive.Rive({
        src: 'assets/bito.riv', canvas: $('#bito-canvas'), autoplay: true,
        stateMachines: 'State Machine 1', autoBind: true, enableRiveAssetCDN: false,
        layout: new window.rive.Layout({ fit: window.rive.Fit.Contain, alignment: window.rive.Alignment.Center }),
        onLoad() { fitRive(); checkRiveFrame(); }, onAdvance: checkRiveFrame,
        onLoadError() { /* Original branded poster remains visible. */ },
      });
    } catch { /* WebAssembly unsupported: keep a complete static experience. */ }
  }
  $('#mascot-button').addEventListener('click', () => {
    if (reduced) return;
    try { riveInstance?.viewModelInstance?.trigger('wave')?.trigger(); } catch {}
    if (gsap) {
      gsap.killTweensOf('.mascot-button');
      gsap.fromTo('.mascot-button', { y: 0, rotation: 0 }, { y: -10, rotation: -3, duration: .2, repeat: 1, yoyo: true, ease: 'power2.out', overwrite: true });
      gsap.fromTo('.hero-greeting', { y: 0, scale: 1 }, { y: -5, scale: 1.035, duration: .25, repeat: 1, yoyo: true, ease: 'power2.out' });
    }
  });
  document.addEventListener('visibilitychange', syncRive);
  new ResizeObserver(fitRive).observe($('#bito-canvas'));

  function configureMotion() {
    motionContext?.revert();
    if (!gsap || !ScrollTrigger) { paintChapter(0); return; }
    gsap.registerPlugin(ScrollTrigger);
    reduced = manualReduced || matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.toggle('motion-paused', reduced);
    motionButton.setAttribute('aria-pressed', String(reduced));
    motionButton.textContent = reduced ? 'Gerakan dikurangi' : 'Kurangi gerakan';
    motionContext = gsap.matchMedia();
    motionContext.add({ wide: '(min-width: 761px)', narrow: '(max-width: 760px)', systemReduced: '(prefers-reduced-motion: reduce)' }, (context) => {
      const quiet = manualReduced || context.conditions.systemReduced;
      const desktop = context.conditions.wide;
      reduced = quiet;
      document.documentElement.classList.toggle('motion-paused', quiet);
      motionButton.setAttribute('aria-pressed', String(quiet));
      motionButton.textContent = quiet ? 'Gerakan dikurangi' : 'Kurangi gerakan';
      gsap.set('.journey-mascot', { x: 0, y: 0, xPercent: -50, yPercent: -100 });
      syncRive();
      if (quiet) {
        gsap.set('.setup-preview', { autoAlpha: 0 });
        gsap.set('.journey-mascot', { left: desktop ? '25%' : '22%', top: '67%', xPercent: -50, yPercent: -50, width: desktop ? 250 : 140, height: desktop ? 250 : 140 });
        gsap.set('.journey-chat', { autoAlpha: 1 });
        paintChapter(2);
        return;
      }
      const enter = gsap.timeline({ defaults: { ease: 'power3.out' } });
      enter.from('.line > span', { yPercent: 110, duration: 1, stagger: .1 }, .05)
        .from('.hero-in', { opacity: 0, y: 15, duration: .65, stagger: .07 }, .35)
        .from('.hero-scene', { opacity: 0, y: 32, duration: 1 }, .3)
        .from('.hero-greeting', { scale: .4, opacity: 0, duration: .7, transformOrigin: '15% 100%', ease: 'back.out(1.2)' }, .8)
        .from('.floating-tag', { opacity: 0, y: 15, duration: .6 }, 1.05);
      gsap.to('.hero-greeting', { y: -8, rotation: -3, duration: 2.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.floating-tag', { y: 7, rotation: 4, duration: 3, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      gsap.to('.spark-one', { rotation: 100, duration: 18, repeat: -1, ease: 'none' });
      gsap.to('.scroll-progress', { width: '100%', ease: 'none', scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: .1 } });
      $$('.reveal').forEach((element) => gsap.from(element, { y: 30, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: element, start: 'top 92%', once: true } }));
      if (desktop) {
        paintChapter(0);
        const frame = $('#desktop-preview');
        const story = gsap.timeline({ defaults: { ease: 'power2.inOut' }, scrollTrigger: {
          trigger: '.journey', start: 'top top', end: () => '+=' + Math.round(innerHeight * 1.9),
          pin: '.journey-stage', scrub: .65, invalidateOnRefresh: true,
          onUpdate: (self) => paintChapter(self.progress < .28 ? 0 : self.progress < .65 ? 1 : 2),
        } });
        story.to('.setup-preview', { width: () => frame.clientWidth * .87, height: () => frame.clientHeight * .82, duration: .8 }, .1)
          .to('.journey-mascot', { left: '27%', top: '49%', xPercent: -50, yPercent: -50, width: 230, height: 230, duration: .8 }, .1)
          .to('.setup-preview', { autoAlpha: 0, scale: .94, duration: .6 }, 1.1)
          .to('.journey-mascot', { left: '25%', top: '65%', width: 250, height: 250, duration: .9 }, 1.1)
          .fromTo('.journey-chat', { x: -20, scale: .94, autoAlpha: 0 }, { x: 0, scale: 1, autoAlpha: 1, duration: .65, transformOrigin: '0% 100%' }, 1.7)
          .to({}, { duration: .45 });
      } else {
        paintChapter(2);
        gsap.set('.setup-preview', { autoAlpha: 0 });
        gsap.set('.journey-mascot', { left: '22%', top: '67%', width: 140, height: 140, xPercent: -50, yPercent: -50 });
        gsap.set('.journey-chat', { autoAlpha: 1 });
        gsap.from('.desktop-preview', { y: 20, opacity: 0, duration: .8, scrollTrigger: { trigger: '.desktop-preview', start: 'top 90%', once: true } });
      }
      gsap.fromTo('.world-art', { yPercent: -3 }, { yPercent: 3, ease: 'none', scrollTrigger: { trigger: '.download-world', start: 'top bottom', end: 'bottom top', scrub: .5 } });
      gsap.from('.download-panel', { y: 45, opacity: 0, duration: 1, scrollTrigger: { trigger: '.download-world', start: 'top 80%', once: true } });
      return () => { chapter = -1; };
    });
    ScrollTrigger.refresh();
  }
  motionButton.addEventListener('click', () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      motionButton.textContent = 'Mengikuti pengaturan perangkat';
      return;
    }
    manualReduced = !manualReduced;
    try { localStorage.setItem('bito-reduced-motion', String(manualReduced)); } catch {}
    configureMotion();
  });
  window.addEventListener('pagehide', (event) => { if (event.persisted) return; clearTimeout(toneTimer); cancelAnimationFrame(riveFrame); motionContext?.revert(); riveInstance?.cleanup(); }, { once: true });
  document.fonts.ready.then(configureMotion).catch(configureMotion);
  startRive();
})();
