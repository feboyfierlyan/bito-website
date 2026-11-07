/* Bito: a compact hero with one Rive instance; feature examples stay browser-local. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const gsap=window.gsap, ScrollTrigger=window.ScrollTrigger;
  const stage=$('#stage'), sway=$('#actor-sway'), mascot=$('#mascot');
  const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let manualMotion=false;
  try{manualMotion=localStorage.getItem('bito-reduced-motion')==='true';}catch{}
  let quiet=manualMotion||systemMotion.matches, context;
  let disposed=false, introPlayed=false;
  let rive, rig, presenter, riveLoaded=false, dragging=false, talking=false, stageVisible=true;
  let gaze={active:false,x:.5,y:.5}, lastPointerX=0, lastPointerAt=0, waveAt=0;
  const motionButton=$('#motion-toggle');
  function boolean(name,value){try{const p=rive?.viewModelInstance?.boolean(name);if(p)p.value=value;}catch{}}
  function wave(){if(quiet||performance.now()-waveAt<900)return;waveAt=performance.now();try{rive?.viewModelInstance?.trigger('wave')?.trigger();}catch{}if(gsap)gsap.fromTo(sway,{y:0},{y:-7,duration:.19,repeat:1,yoyo:true,ease:'power2.out',overwrite:'auto'});}
  function fitRive(){
    if(!riveLoaded)return;
    const buffer=$('#bito-runtime'),dpr=Math.min(devicePixelRatio||1,2);
    const width=Math.round(buffer.offsetWidth*dpr),height=Math.round(buffer.offsetHeight*dpr);
    if(!width||!height||(buffer.width===width&&buffer.height===height))return;
    buffer.width=width;buffer.height=height;rive.resizeToCanvas();rive.drawFrame();presenter?.request();
  }
  function syncRive(){if(!rive)return;if(document.hidden||quiet||!stageVisible)rive.pause();else rive.play();boolean('isTalking',talking&&!quiet);}
  function createEyes(){try{
    const artboard=rive.artboard,nodes=['Pupil_L','Pupil_R'].map(n=>artboard?.node(n));if(nodes.some(n=>!n))return null;
    const pupils=nodes.map(node=>({node,x:node.x,y:node.y})),b=rive.bounds;
    const centers=pupils.map(p=>{const m=p.node.worldTransform(),v={x:m.tx-m.xx*p.x-m.yx*p.y,y:m.ty-m.xy*p.x-m.yy*p.y};m.delete();return v;});
    const cx=((centers[0].x+centers[1].x)/2-b.minX)/(b.maxX-b.minX),cy=((centers[0].y+centers[1].y)/2-b.minY)/(b.maxY-b.minY);
    let mix=0,x=0,y=0;const approach=(a,b,s,t=.075)=>b+(a-b)*Math.exp(-Math.max(0,s)/t);
    return {advance(seconds){const active=gaze.active&&!quiet&&!dragging&&!talking;mix=approach(mix,active?1:0,seconds,.065);if(mix<.001&&!active)return;const dx=(gaze.x-cx)/.55,dy=(gaze.y-cy)/.55,r=Math.max(1,Math.hypot(dx,dy));x=approach(x,dx/r*11,seconds);y=approach(y,dy/r*7,seconds);pupils.forEach(p=>{p.node.x=p.x*(1-mix)+x*mix;p.node.y=p.y+y*mix;});artboard.advance(0);},restore(){pupils.forEach(p=>{p.node.x=p.x;p.node.y=p.y;});artboard.advance(0);}};
  }catch{return null;}}
  function startRive(){if(!window.rive||!window.BitoPresentation)return;
    try{
      presenter=window.BitoPresentation.createPresenter({canvas:$('#bito-canvas'),buffer:$('#bito-runtime'),art:$('#mascot-art'),sample:document.createElement('canvas'),requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,onReady:syncRive});
      window.rive.RuntimeLoader.setWasmUrl(new URL('assets/rive.wasm',location.href).href);
      rive=new window.rive.Rive({src:'assets/bito.riv',canvas:$('#bito-runtime'),autoplay:true,stateMachine:'State Machine 1',autoBind:true,enableRiveAssetCDN:false,layout:new window.rive.Layout({fit:window.rive.Fit.Contain,alignment:window.rive.Alignment.Center}),onLoad(){riveLoaded=true;fitRive();rig=createEyes();presenter.request();},onAdvance(event){rig?.advance(event.data);presenter.request();}});
    }catch{/* The matching poster remains visible if initialization cannot finish. */}
  }
  mascot.addEventListener('click',wave);
  document.addEventListener('pointermove',event=>{const rect=$('#bito-canvas').getBoundingClientRect();gaze={active:true,x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};},{passive:true});
  const resetGaze=()=>{gaze.active=false;};document.documentElement.addEventListener('pointerleave',resetGaze);window.addEventListener('blur',resetGaze);document.addEventListener('visibilitychange',()=>{resetGaze();syncRive();});
  function configureHero(){
    context?.revert();
    quiet=manualMotion||systemMotion.matches;
    window.BitoFeatures?.setReducedMotion(quiet);
    document.documentElement.classList.toggle('motion-paused',quiet);
    motionButton.textContent=quiet?'Gerakan dikurangi':'Kurangi gerakan';
    motionButton.setAttribute('aria-pressed',String(quiet));
    syncRive();
    if(!gsap||quiet)return;
    if(ScrollTrigger)gsap.registerPlugin(ScrollTrigger);
    context=gsap.context(()=>{
      if(!introPlayed){
        introPlayed=true;
        gsap.from('.title-line>span',{yPercent:110,duration:1,ease:'power3.out',delay:.05});
        gsap.from('.floating-file,.folder-sticker,.internet-sticker,.desktop-icon,.scene-peek',{y:18,opacity:0,duration:.75,ease:'power3.out',stagger:.035,delay:.15});
        gsap.from('.hero-item',{y:12,opacity:0,duration:.65,ease:'power3.out',delay:.3});
        gsap.from('#hero-speech',{scale:.7,opacity:0,duration:.6,ease:'back.out(1.1)',transformOrigin:'0 100%',delay:.75});
      }
      if(ScrollTrigger)gsap.from('.download-card',{y:40,opacity:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:'.download',start:'top 80%',once:true}});
    });
  }
  $('#hello-sticker').addEventListener('click',()=>{wave();const label=$('#hero-speech');label.textContent='heii, seneng ketemu kamu :)';if(gsap&&!quiet)gsap.fromTo(label,{scaleX:.9,scaleY:.94},{scaleX:1,scaleY:1,duration:.4,ease:'power3.out',overwrite:true});});
  motionButton.addEventListener('click',()=>{if(systemMotion.matches){motionButton.textContent='Mengikuti pengaturan perangkat';return;}manualMotion=!manualMotion;try{localStorage.setItem('bito-reduced-motion',String(manualMotion));}catch{}configureHero();});

  let stageObserver;
  if('IntersectionObserver' in window){stageObserver=new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting;syncRive();});stageObserver.observe(stage);}
  $('#other-downloads').addEventListener('click',()=>{const el=$('#download-options'),b=$('#other-downloads'),open=b.getAttribute('aria-expanded')!=='true';gsap?.killTweensOf(el);b.setAttribute('aria-expanded',String(open));if(open){el.hidden=false;if(gsap&&!quiet)gsap.fromTo(el,{height:0,opacity:0},{height:'auto',opacity:1,duration:.35,ease:'power3.out'});}else if(gsap&&!quiet){gsap.to(el,{height:0,opacity:0,duration:.23,onComplete:()=>{el.hidden=true;gsap.set(el,{clearProps:'height,opacity'});}});}else el.hidden=true;});
  $$('details summary').forEach(summary=>summary.addEventListener('click',event=>{if(!gsap||quiet)return;event.preventDefault();const d=summary.parentElement,expand=!d.open||d.dataset.closing==='true',start=d.offsetHeight;gsap.killTweensOf(d);if(expand){delete d.dataset.closing;d.style.height='';d.open=true;const end=d.scrollHeight;gsap.fromTo(d,{height:start,overflow:'hidden'},{height:end,duration:.32,ease:'power3.out',onComplete:()=>gsap.set(d,{clearProps:'height,overflow'})});}else{d.dataset.closing='true';gsap.to(d,{height:summary.offsetHeight,overflow:'hidden',duration:.24,ease:'power2.inOut',onComplete:()=>{if(d.dataset.closing==='true'){d.open=false;delete d.dataset.closing;}gsap.set(d,{clearProps:'height,overflow'});}});}}));
  if(/Windows/i.test(navigator.userAgent)){const a=$('#primary-download');a.href='https://github.com/feboyfierlyan/bito-desktop/releases/download/v0.5.1/Bito-0.5.1-Windows-x64-Setup.exe';$('#primary-download-label').textContent='Download untuk Windows';}
  let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{fitRive();});},{passive:true});
  window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;window.BitoFeatures?.dispose();presenter?.dispose();cancelAnimationFrame(resizeFrame);stageObserver?.disconnect();context?.revert();gsap?.killTweensOf(sway);rig?.restore();rive?.cleanup();});
  systemMotion.addEventListener('change',configureHero);
  configureHero();document.fonts.ready.then(()=>{ScrollTrigger?.refresh();fitRive();}).catch(()=>{});startRive();
})();
