/* Decorative desktop objects: pointer-locked movement, a separate lifted surface. */
(() => {
  'use strict';
  const {gsap,Draggable}=window;
  const stage=document.querySelector('#stage'),desk=document.querySelector('#hero-desk');
  if(!gsap||!Draggable||!stage||!desk)return;
  gsap.registerPlugin(Draggable);
  const {clamp,stickerBounds}=window.BitoScene;
  const objects=[...desk.querySelectorAll('[data-sticker]')];
  const animated=[...desk.querySelectorAll('[data-gif]')];
  const drags=[],cleanups=[];
  let frame=0,visible=true,dead=false,layer=5;
  const quiet=()=>document.documentElement.classList.contains('motion-paused')||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function syncMotion(){
    const hidden=getComputedStyle(desk).visibility==='hidden';
    if(desk.inert!==hidden)desk.inert=hidden;
    const paused=quiet()||document.hidden||!visible||hidden;
    for(const img of animated){const src=paused?img.dataset.still:img.dataset.gif;if(img.getAttribute('src')!==src)img.src=src;}
  }
  function refresh(){
    if(dead)return;
    for(const drag of drags){
      if(!drag.target.getClientRects().length||drag.isPressed)continue;
      drag.update();
      const rect=drag.target.getBoundingClientRect(),area=stage.getBoundingClientRect();
      drag.applyBounds(stickerBounds(rect,area,drag.x,drag.y,innerWidth<=760?82:96));
    }
    syncMotion();
  }
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(refresh);};
  for(const el of objects){
    const art=el.querySelector('.sticker-art');
    let blockedUntil=0,previousX=0,previousAt=0;
    el.setAttribute('aria-keyshortcuts','ArrowUp ArrowDown ArrowLeft ArrowRight');
    const drag=Draggable.create(el,{
      type:'x,y',trigger:el.dataset.dragHandle?el.querySelector(el.dataset.dragHandle):el,
      dragClickables:true,minimumMovement:6,edgeResistance:1,dragResistance:0,
      zIndexBoost:false,cursor:'grab',activeCursor:'grabbing',allowContextMenu:true,
      onPress(){
        // Finish any entrance on this object without touching the scroll story.
        gsap.killTweensOf(el);gsap.set(el,{opacity:1});this.update();
        const rect=el.getBoundingClientRect(),area=stage.getBoundingClientRect();
        this.applyBounds(stickerBounds(rect,area,this.x,this.y,innerWidth<=760?82:96));
        el.style.zIndex=String(++layer);el.classList.add('sticker-held');
        previousX=this.x;previousAt=performance.now();
        gsap.to(art,{scale:quiet()?1:1.055,rotation:quiet()?0:-2,duration:quiet()?0:.2,ease:'power3.out',overwrite:true});
      },
      onDrag(){
        blockedUntil=performance.now()+400;
        const now=performance.now(),speed=(this.x-previousX)/Math.max(8,now-previousAt);
        previousX=this.x;previousAt=now;
        if(!quiet())gsap.to(art,{rotation:clamp(speed*4,-6,6),duration:.18,ease:'power2.out',overwrite:'auto'});
      },
      onRelease(){
        el.classList.remove('sticker-held');
        if(this.isDragging)blockedUntil=performance.now()+400;
        // Only the pickup scale/tilt settles. x/y stay exactly where released.
        gsap.to(art,{scale:1,rotation:0,duration:quiet()?0:.55,ease:'elastic.out(1,.65)',overwrite:true});
      }
    })[0];
    drags.push(drag);
    const blockClick=event=>{if(performance.now()<blockedUntil){event.preventDefault();event.stopImmediatePropagation();}};
    const blockNative=event=>event.preventDefault();
    const keys=event=>{
      const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
      if(!directions[event.key])return;
      event.preventDefault();refresh();
      const [dx,dy]=directions[event.key],step=event.shiftKey?24:8;
      gsap.killTweensOf(el);
      gsap.set(el,{x:clamp(drag.x+dx*step,drag.minX,drag.maxX),y:clamp(drag.y+dy*step,drag.minY,drag.maxY)});
      drag.update();el.style.zIndex=String(++layer);
    };
    el.addEventListener('click',blockClick,true);
    el.addEventListener('dragstart',blockNative);
    el.addEventListener('keydown',keys);
    cleanups.push(()=>{el.removeEventListener('click',blockClick,true);el.removeEventListener('dragstart',blockNative);el.removeEventListener('keydown',keys);gsap.killTweensOf(art);});
  }
  // Stop decoding the GIF when its part of the story is out of view.
  let observer;
  if('IntersectionObserver' in window){observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncMotion();});observer.observe(stage);}
  const mutation=new MutationObserver(syncMotion);
  mutation.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  mutation.observe(desk,{attributes:true,attributeFilter:['style']});
  const onScroll=()=>{
    const hidden=getComputedStyle(desk).visibility==='hidden';
    if(desk.inert!==hidden)desk.inert=hidden;
    const showing=!hidden&&stage.getBoundingClientRect().bottom>0;
    if(showing!==visible){visible=showing;syncMotion();}
  };
  document.addEventListener('visibilitychange',syncMotion);
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('pageshow',schedule);
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    dead=true;cancelAnimationFrame(frame);observer?.disconnect();mutation.disconnect();
    drags.forEach(d=>d.kill());cleanups.forEach(f=>f());
    window.removeEventListener('resize',schedule);window.removeEventListener('scroll',onScroll);window.removeEventListener('pageshow',schedule);document.removeEventListener('visibilitychange',syncMotion);
  });
  document.fonts.ready.then(schedule).catch(()=>{});
  // Defer initial bounds until the opening layout has finished measuring.
  schedule();
})();
