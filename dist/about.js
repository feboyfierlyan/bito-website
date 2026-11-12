/* The same live Bito state machine, with its own visible-only About lifecycle. */
(() => {
  'use strict';
  const section=document.querySelector('#tentang'), button=document.querySelector('#about-bito');
  const art=document.querySelector('#about-bito-art'), canvas=document.querySelector('#about-bito-canvas');
  const buffer=document.querySelector('#about-bito-runtime');
  if(!section||!button||!art||!canvas||!buffer)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let visible=false, loaded=false, started=false, disposed=false, lastWave=-Infinity;
  let rive, presenter, eyes, frame=0, pointer=null, gaze={active:false,x:.5,y:.5};
  const reduced=()=>motion.matches||document.documentElement.classList.contains('motion-paused');
  function sync(){
    updateGaze();
    if(!rive)return;
    // Collect complete startup frames before freezing for reduced motion.
    if(document.hidden||!visible||(reduced()&&presenter?.ready))rive.pause();else rive.play();
  }
  function fit(){
    frame=0;updateGaze();if(!loaded||disposed)return;
    const dpr=Math.min(devicePixelRatio||1,2),size=Math.round(buffer.offsetWidth*dpr);
    if(!size||(buffer.width===size&&buffer.height===size))return;
    buffer.width=buffer.height=size;rive.resizeToCanvas();rive.drawFrame();presenter.request();
  }
  function resize(){cancelAnimationFrame(frame);frame=requestAnimationFrame(fit);}
  function createEyes(){try{
    const artboard=rive.artboard,nodes=['Pupil_L','Pupil_R'].map(name=>artboard?.node(name));
    if(nodes.some(node=>!node))return null;
    const pupils=nodes.map(node=>({node,x:node.x,y:node.y})),bounds=rive.bounds;
    const centers=pupils.map(p=>{const m=p.node.worldTransform();const point={x:m.tx-m.xx*p.x-m.yx*p.y,y:m.ty-m.xy*p.x-m.yy*p.y};m.delete();return point;});
    const cx=((centers[0].x+centers[1].x)/2-bounds.minX)/(bounds.maxX-bounds.minX);
    const cy=((centers[0].y+centers[1].y)/2-bounds.minY)/(bounds.maxY-bounds.minY);
    let mix=0,x=0,y=0;
    const approach=(a,b,seconds,t=.075)=>b+(a-b)*Math.exp(-Math.max(0,seconds)/t);
    return {advance(seconds){
      const active=gaze.active&&!reduced();mix=approach(mix,active?1:0,seconds,.065);
      if(mix<.001&&!active)return;
      const dx=(gaze.x-cx)/.55,dy=(gaze.y-cy)/.55,r=Math.max(1,Math.hypot(dx,dy));
      x=approach(x,dx/r*11,seconds);y=approach(y,dy/r*7,seconds);
      pupils.forEach(p=>{p.node.x=p.x*(1-mix)+x*mix;p.node.y=p.y+y*mix;});artboard.advance(0);
    },restore(){pupils.forEach(p=>{p.node.x=p.x;p.node.y=p.y;});artboard.advance(0);}};
  }catch{return null;}}
  function start(){
    if(started||disposed||!window.rive||!window.BitoPresentation)return;
    started=true;
    try{
      presenter=window.BitoPresentation.createPresenter({canvas,buffer,art,sample:document.createElement('canvas'),requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,onReady:sync});
      window.rive.RuntimeLoader.setWasmUrl(new URL('assets/rive.wasm',location.href).href);
      rive=new window.rive.Rive({src:'assets/bito.riv',canvas:buffer,autoplay:true,stateMachine:'State Machine 1',autoBind:true,enableRiveAssetCDN:false,
        layout:new window.rive.Layout({fit:window.rive.Fit.Contain,alignment:window.rive.Alignment.Center}),
        onLoad(){if(disposed)return;loaded=true;fit();eyes=createEyes();presenter.request();sync();},
        onAdvance(event){if(disposed)return;eyes?.advance(event.data);presenter?.request();}
      });
    }catch{/* Keep the poster if the animation runtime is unavailable. */}
  }
  function updateGaze(){
    if(!pointer||!visible||document.hidden||reduced()){gaze.active=false;return;}
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height){gaze.active=false;return;}
    gaze={active:true,x:(pointer.x-rect.left)/rect.width,y:(pointer.y-rect.top)/rect.height};
  }
  function point(event){
    if(event.pointerType==='touch')return;
    pointer={x:event.clientX,y:event.clientY};updateGaze();
  }
  const reset=()=>{pointer=null;gaze.active=false;};
  function wave(){
    if(!loaded||reduced()||performance.now()-lastWave<900)return;
    lastWave=performance.now();
    try{rive.viewModelInstance?.trigger('wave')?.trigger();}catch{}
  }
  document.addEventListener('pointermove',point,{passive:true});document.documentElement.addEventListener('pointerleave',reset);
  button.addEventListener('click',wave);
  const visibility=()=>{reset();sync();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',reset);
  motion.addEventListener('change',sync);
  const settings=new MutationObserver(sync);settings.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  let observer, resizer;
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();sync();},{threshold:.05});observer.observe(section);}
  else{visible=true;start();}
  if('ResizeObserver' in window){resizer=new ResizeObserver(resize);resizer.observe(button);}
  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('scroll',resize,{passive:true});
  const restore=()=>{if(visible)start();resize();sync();};window.addEventListener('pageshow',restore);
  window.addEventListener('pagehide',event=>{
    reset();rive?.pause();if(event.persisted)return;
    disposed=true;cancelAnimationFrame(frame);observer?.disconnect();resizer?.disconnect();settings.disconnect();
    document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',reset);
    window.removeEventListener('resize',resize);window.removeEventListener('scroll',resize);window.removeEventListener('pageshow',restore);motion.removeEventListener('change',sync);
    document.removeEventListener('pointermove',point);document.documentElement.removeEventListener('pointerleave',reset);button.removeEventListener('click',wave);
    presenter?.dispose();eyes?.restore();rive?.cleanup();
  });
})();
