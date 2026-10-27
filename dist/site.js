/* Bito: one Rive instance through the scene; every demo stays browser-local. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const gsap=window.gsap, ScrollTrigger=window.ScrollTrigger, Draggable=window.Draggable;
  const {clamp,geometry,laptopLayout,companionPose,companionPanel,companionBounds,returnWeight}=window.BitoScene;
  const stage=$('#stage'), anchor=$('#actor-anchor'), drag=$('#actor-drag'), sway=$('#actor-sway'), mascot=$('#mascot');
  const shell=$('#desktop-shell'), chat=$('#demo-chat'), messages=$('#demo-messages'), greeting=$('#demo-greeting');
  const device=$('#laptop-device'),backdrop=$('#laptop-backdrop');
  const chatPosition=$('#chat-position'),greetingPosition=$('#greeting-position');
  const dragOffset={x:0,y:0},placements={};
  let chatReveal;
  const flight={reveal:0,zoom:0,arrival:0};
  let laptop;
  const systemMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let manualMotion=false;
  try{manualMotion=localStorage.getItem('bito-reduced-motion')==='true';}catch{}
  let quiet=manualMotion||systemMotion.matches, context, draggable, storyTimeline;
  let interactive=false, chatOpen=false, disposed=false, introPlayed=false;
  let rive, rig, presenter, riveLoaded=false, dragging=false, talking=false, stageVisible=true;
  let gaze={active:false,x:.5,y:.5}, lastPointerX=0, lastPointerAt=0, waveAt=0;
  let desktopTimers=[];
  let demoBusy=false;
  const motionButton=$('#motion-toggle');
  const clearTimers=list=>{list.forEach(clearTimeout);list.length=0;};
  const later=(list,fn,ms)=>{const t=setTimeout(()=>{if(!disposed)fn();},ms);list.push(t);return t;};
  function animateBubble(el){if(gsap&&!quiet)gsap.fromTo(el,{y:7,scaleX:.86,scaleY:.92,opacity:0},{y:0,scaleX:1,scaleY:1,opacity:1,duration:.44,ease:'back.out(1.05)',transformOrigin:el.classList.contains('sent')?'100% 100%':'0% 100%'});}
  function boolean(name,value){try{const p=rive?.viewModelInstance?.boolean(name);if(p)p.value=value;}catch{}}
  function setTalking(value){talking=value;boolean('isTalking',value&&!quiet&&!dragging);}
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
  function sceneGeometry(){const w=stage.clientWidth,h=stage.clientHeight,size=anchor.offsetWidth;const view=laptop||laptopLayout(w,h,flight.zoom,flight.reveal);return {hero:geometry(w,h,size,view.screen,w<=760).hero,desktop:companionPose(view.visible,size,w<=760,view.screen.h)};}
  function renderLaptop(progress=storyTimeline?.progress()??(quiet?1:0)){
    if(!gsap)return;
    laptop=laptopLayout(stage.clientWidth,stage.clientHeight,flight.zoom,flight.reveal,innerWidth<=760);
    const {image,screen}=laptop;
    gsap.set(device,{x:image.x,y:image.y,scale:image.w/1920,autoAlpha:flight.reveal});
    gsap.set(backdrop,{autoAlpha:flight.reveal});
    gsap.set(shell,{x:screen.x,y:screen.y,width:screen.w,height:screen.h,scale:1,autoAlpha:flight.reveal});
    const {hero,desktop}=sceneGeometry(),t=clamp(flight.arrival,0,1),arc=Math.sin(t*Math.PI);
    gsap.set(anchor,{x:hero.x+(desktop.x-hero.x)*t+arc*24,y:hero.y+(desktop.y-hero.y)*t-arc*18,scale:hero.scale+(desktop.scale-hero.scale)*t});
    if(!interactive){const weight=quiet?1:returnWeight(progress);gsap.set(drag,{x:dragOffset.x*weight,y:dragOffset.y*weight});}
  }
  // Translation belongs to the dock; reveal belongs to its clipped panel.
  // Neither operation writes the other's transform or reparents live bubbles.
  function placePanel(key,target,point,immediate=false){
    let p=placements[key];
    if(!p){p=placements[key]={x:NaN,y:NaN,side:point.side};p.moveX=gsap.quickTo(target,'x',{duration:.38,ease:'power3.out'});p.moveY=gsap.quickTo(target,'y',{duration:.38,ease:'power3.out'});}
    const x=point.x-laptop.screen.x,y=point.y-laptop.screen.y;
    if(immediate||quiet||!Number.isFinite(p.x)){p.moveX.tween.pause();p.moveY.tween.pause();gsap.set(target,{x,y});}
    else{if(Math.abs(x-p.x)>.1)p.moveX(x);if(Math.abs(y-p.y)>.1)p.moveY(y);}
    p.x=x;p.y=y;p.side=point.side;
  }
  function positionPanels(immediate=false){if(!laptop||(!interactive&&!chatReveal?.isActive()))return;
    // The drag box excludes the decorative wave/sway rotation and scale.
    const a=drag.getBoundingClientRect(),s=stage.getBoundingClientRect(),mobile=innerWidth<=760;
    const actor={x:a.left-s.left,y:a.top-s.top,w:a.width,h:a.height},frame=laptop.visible;
    const width=Math.min(mobile?300:340,frame.w-24)+'px';
    if(chat.style.width!==width)chat.style.width=width;
    const room=Math.max(90,Math.min(230,frame.h-(mobile?actor.h:0)-160))+'px';
    if(chat.style.getPropertyValue('--chat-room')!==room)chat.style.setProperty('--chat-room',room);
    const c=companionPanel(actor,frame,chat.offsetWidth,chat.offsetHeight,mobile,placements.chat?.side);
    placePanel('chat',chatPosition,c,immediate);
    const p=companionPanel(actor,frame,greeting.offsetWidth,greeting.offsetHeight,false,placements.greeting?.side);
    placePanel('greeting',greetingPosition,p);greeting.dataset.side=p.side;
  }
  function updateBounds(){if(!draggable||!laptop)return;draggable.applyBounds(companionBounds(sceneGeometry().desktop,laptop.visible,anchor.offsetWidth));}
  function rememberDrag(){dragOffset.x=Number(gsap.getProperty(drag,'x'))||0;dragOffset.y=Number(gsap.getProperty(drag,'y'))||0;}
  function resetPosition(){if(!gsap)return;gsap.to(drag,{x:0,y:0,duration:quiet?0:.55,ease:'power3.out',overwrite:'auto',onUpdate(){rememberDrag();positionPanels();},onComplete:updateBounds});gsap.to(sway,{rotation:0,duration:.6,ease:'elastic.out(1,.5)'});}
  function prepareChatMotion(){
    chatReveal?.kill();
    chatReveal=gsap.timeline({paused:true})
      .fromTo(chat,{autoAlpha:0,y:10,scaleX:.93,scaleY:.96},{autoAlpha:1,y:0,scaleX:1,scaleY:1,duration:.44,ease:'power3.out'},0)
      .fromTo(greeting,{autoAlpha:1},{autoAlpha:0,duration:.16,ease:'power1.out'},0);
    chatReveal.progress(0).pause();
  }
  function closeChat(immediate=false){if(!chatOpen&&!chatReveal?.isActive())return;
    chatOpen=false;chat.inert=true;greetingPosition.inert=!interactive;chat.setAttribute('aria-hidden','true');mascot.setAttribute('aria-expanded','false');
    if(chatReveal){if(quiet||immediate)chatReveal.progress(0).pause();else chatReveal.timeScale(1.15).reverse();}
  }
  function openChat(){if(!interactive||chatOpen)return;
    const hidden=!chatReveal||chatReveal.progress()===0;
    positionPanels(hidden);chatOpen=true;wave();chat.inert=false;greetingPosition.inert=true;chat.setAttribute('aria-hidden','false');mascot.setAttribute('aria-expanded','true');
    if(chatReveal){if(quiet)chatReveal.progress(1).pause();else chatReveal.timeScale(1).play();}
  }
  function setInteractive(value){if(interactive===value)return;
    if(!value){rememberDrag();gsap.killTweensOf(drag);draggable?.endDrag();}
    interactive=value;greetingPosition.inert=!value||chatOpen;stage.classList.toggle('story-interactive',value);
    if(value){draggable?.update();draggable?.enable();updateBounds();positionPanels();wave();gsap?.to(greetingPosition,{autoAlpha:1,duration:quiet?0:.28,overwrite:'auto'});mascot.setAttribute('aria-label','Buka atau tutup contoh chat Bito');mascot.setAttribute('aria-expanded',String(chatOpen));}
    else{dragging=false;boolean('isDragging',false);draggable?.disable();stage.classList.remove('is-dragging');closeChat();gsap?.to(greetingPosition,{autoAlpha:0,duration:quiet?0:.18,overwrite:'auto'});gsap?.to(sway,{scale:1,rotation:0,duration:quiet?0:.45,ease:'power3.out',overwrite:'auto'});mascot.setAttribute('aria-label','Sapa Bito');mascot.removeAttribute('aria-expanded');}
  }
  function setupDrag(){if(!Draggable||!gsap)return;draggable=Draggable.create(drag,{type:'x,y',dragClickables:true,minimumMovement:6,dragResistance:.04,edgeResistance:.8,allowContextMenu:true,onPress(){if(!interactive)return;dragging=true;boolean('isDragging',true);boolean('isTalking',false);stage.classList.add('is-dragging');gsap.killTweensOf(drag);rememberDrag();lastPointerX=this.x;lastPointerAt=performance.now();gsap.killTweensOf(sway);gsap.to(sway,{scale:1.025,duration:.16,ease:'power2.out'});},onDrag(){rememberDrag();const now=performance.now(),velocity=(this.x-lastPointerX)/Math.max(8,now-lastPointerAt);lastPointerX=this.x;lastPointerAt=now;gsap.to(sway,{rotation:quiet?0:clamp(velocity*8,-14,14),duration:.18,ease:'power2.out',overwrite:'auto'});positionPanels();},onRelease(){rememberDrag();dragging=false;boolean('isDragging',false);boolean('isTalking',talking&&!quiet);stage.classList.remove('is-dragging');gsap.to(sway,{scale:1,rotation:0,duration:quiet?0:1,ease:'elastic.out(1,.36)',overwrite:'auto'});positionPanels();},onClick(){if(interactive)chatOpen?closeChat():openChat();}})[0];draggable.disable();}
  mascot.addEventListener('click',()=>{if(!interactive)wave();if(!draggable&&interactive)(chatOpen?closeChat():openChat());});
  mascot.addEventListener('keydown',event=>{if(interactive&&(event.key==='Enter'||event.key===' ')){event.preventDefault();chatOpen?closeChat():openChat();}});
  greeting.addEventListener('click',()=>{if(!chatOpen)openChat();});$('#close-chat').addEventListener('click',()=>closeChat());$('#reset-demo').addEventListener('click',resetPosition);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&chatOpen){closeChat();mascot.focus({preventScroll:true});}});
  document.addEventListener('pointermove',event=>{const rect=$('#bito-canvas').getBoundingClientRect();gaze={active:true,x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};},{passive:true});
  const resetGaze=()=>{gaze.active=false;};document.documentElement.addEventListener('pointerleave',resetGaze);window.addEventListener('blur',resetGaze);document.addEventListener('visibilitychange',()=>{resetGaze();syncRive();});
  function appendBubble(parent,text,kind='received'){const el=document.createElement('div');el.className=`bubble ${kind}`;el.textContent=text;parent.append(el);animateBubble(el);return el;}
  function typing(parent){const el=document.createElement('div');el.className='bubble received typing';el.setAttribute('aria-label','Bito sedang mengetik');el.innerHTML='<i></i><i></i><i></i>';parent.append(el);animateBubble(el);return el;}
  function demoReply(value){if(demoBusy||!value.trim())return;demoBusy=true;clearTimers(desktopTimers);$('#demo-input').value='';if(messages.children.length>6)[...messages.children].filter(n=>n.id!=='demo-welcome').slice(0,2).forEach(n=>n.remove());appendBubble(messages,value.trim(),'sent');$('#demo-choices').hidden=true;const t=typing(messages);messages.scrollTop=messages.scrollHeight;positionPanels();const lower=value.toLowerCase(),reminder=/inget|ingat|reminder|istirahat/.test(lower);const reply=reminder?'siap. nanti aku colek, ya.':/capek|lelah/.test(lower)?'duh, hari panjang ya. mau cerita bagian paling capeknya?':/halo|hai|sapa|bro|hello/.test(lower)?'heii. seneng kamu mampir :)':'aku dengerin. di aplikasi nanti, kita bisa ngobrol lebih jauh.';
    later(desktopTimers,()=>{t.remove();setTalking(true);appendBubble(messages,reply);if(reminder)later(desktopTimers,()=>{const card=document.createElement('div');card.className='demo-reminder';card.innerHTML='<span aria-hidden="true">◷</span><div><strong>Istirahat sebentar</strong><small>15 menit lagi · Contoh pengingat</small></div>';messages.append(card);animateBubble(card);messages.scrollTop=messages.scrollHeight;positionPanels();},650);messages.scrollTop=messages.scrollHeight;positionPanels();later(desktopTimers,()=>{setTalking(false);demoBusy=false;},1100);},1000);
  }
  $('#demo-form').addEventListener('submit',event=>{event.preventDefault();demoReply($('#demo-input').value);});$$('[data-demo]').forEach(b=>b.addEventListener('click',()=>demoReply(b.dataset.demo==='reminder'?'ingetin aku istirahat 15 menit lagi':'halo Bito')));

  function configureScene(){if(!gsap||!ScrollTrigger){device.style.cssText='opacity:1;visibility:visible;left:50%;top:160px;transform:translateX(-50%) scale(.45)';return;}
    chatReveal?.kill();context?.revert();draggable?.kill();draggable=null;storyTimeline=null;interactive=false;chatOpen=false;chat.inert=true;chat.setAttribute('aria-hidden','true');gsap.killTweensOf([chatPosition,greetingPosition,drag,sway]);for(const key of Object.keys(placements))delete placements[key];Object.assign(dragOffset,{x:0,y:0});gsap.set([drag,sway],{clearProps:'all'});gsap.set(chat,{autoAlpha:0});
    quiet=manualMotion||systemMotion.matches;window.BitoFeatures?.setReducedMotion(quiet);document.documentElement.classList.toggle('motion-paused',quiet);motionButton.textContent=quiet?'Gerakan dikurangi':'Kurangi gerakan';motionButton.setAttribute('aria-pressed',String(quiet));gsap.registerPlugin(ScrollTrigger,Draggable);context=gsap.matchMedia();
    context.add({wide:'(min-width: 761px)',narrow:'(max-width: 760px)',systemQuiet:'(prefers-reduced-motion: reduce)'},media=>{
      quiet=manualMotion||media.conditions.systemQuiet;window.BitoFeatures?.setReducedMotion(quiet);document.documentElement.classList.toggle('motion-paused',quiet);motionButton.setAttribute('aria-pressed',String(quiet));motionButton.textContent=quiet?'Gerakan dikurangi':'Kurangi gerakan';syncRive();setInteractive(false);draggable?.kill();gsap.killTweensOf([chatPosition,greetingPosition]);for(const key of Object.keys(placements))delete placements[key];setupDrag();prepareChatMotion();
      Object.assign(flight,{reveal:0,zoom:0,arrival:0});gsap.set(anchor,{left:0,top:0,bottom:'auto',xPercent:0,yPercent:0});renderLaptop(0);gsap.set(greetingPosition,{autoAlpha:0});
      if(quiet){gsap.set(['.hero-copy','#hero-desk','.hero-aside','.hero-speech','.stage-note','.scroll-note'],{autoAlpha:0});stage.style.height=innerWidth<=760?'800px':'900px';$('.story').style.height='auto';Object.assign(flight,{reveal:1,zoom:1,arrival:1});renderLaptop(1);gsap.set(['#desktop-hint','#laptop-demo-label'],{autoAlpha:1});setInteractive(true);return()=>{setInteractive(false);stage.style.height='';$('.story').style.height='';draggable?.kill();draggable=null;};}
      const tl=gsap.timeline({defaults:{ease:'none'},onUpdate(){const p=this.progress();setInteractive(p>.72);renderLaptop(p);if((interactive&&!dragging)||chatReveal?.isActive())positionPanels();},scrollTrigger:{trigger:'.story',start:'top top',end:'bottom bottom',scrub:.4,invalidateOnRefresh:true,onRefresh(){renderLaptop();if(interactive){updateBounds();positionPanels();}fitRive();}}});storyTimeline=tl;
      tl.addLabel('hello',0)
        .to(['.hero-copy','#hero-desk'],{y:-50,autoAlpha:0,duration:.2},.02)
        .to(['.hero-aside','.hero-speech','.stage-note','.scroll-note'],{autoAlpha:0,duration:.12},.03)
        .addLabel('laptop',.12)
        .fromTo(flight,{reveal:0},{reveal:1,duration:.22,ease:'power2.inOut',immediateRender:false},.12)
        .addLabel('closer',.3)
        .fromTo(flight,{zoom:0},{zoom:1,duration:.32,ease:'power2.inOut',immediateRender:false},.3)
        .fromTo(flight,{arrival:0},{arrival:1,duration:.34,ease:'power2.inOut',immediateRender:false},.3)
        .addLabel('together',.72)
        .to(['#desktop-hint','#laptop-demo-label'],{autoAlpha:1,duration:.1},.69)
        .to({},{duration:.27},.73);
      if(!introPlayed){introPlayed=true;gsap.from('.title-line>span',{yPercent:110,duration:1,ease:'power3.out',stagger:.1,delay:.05});gsap.from('.floating-file,.desk-sticker,.folder-sticker,.internet-sticker,.desktop-icon,.scene-peek',{y:18,opacity:0,duration:.75,ease:'power3.out',stagger:.035,delay:.15});gsap.from('.hero-item',{y:12,opacity:0,duration:.65,ease:'power3.out',stagger:.07,delay:.3});gsap.from('#hero-speech',{scale:.7,opacity:0,duration:.6,ease:'back.out(1.1)',transformOrigin:'0 100%',delay:.75});}
      $$('.line-reveal').forEach(el=>gsap.from(el,{y:28,opacity:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',once:true}}));
      gsap.fromTo('.download-art',{yPercent:-3},{yPercent:3,ease:'none',scrollTrigger:{trigger:'.download',start:'top bottom',end:'bottom top',scrub:.5}});
      gsap.from('.download-card',{y:40,opacity:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:'.download',start:'top 80%',once:true}});
      return()=>{draggable?.kill();draggable=null;setInteractive(false);};
    });ScrollTrigger.refresh();
  }
  $('#hello-sticker').addEventListener('click',()=>{wave();const label=$('#hero-speech');label.textContent='heii, seneng ketemu kamu :)';if(gsap&&!quiet)gsap.fromTo(label,{scaleX:.9,scaleY:.94},{scaleX:1,scaleY:1,duration:.4,ease:'power3.out',overwrite:true});});
  $('#play-scene').addEventListener('click',()=>{const start=$('.story').offsetTop,travel=$('.story').offsetHeight-stage.offsetHeight;window.scrollTo({top:quiet?start:start+Math.max(0,travel)*.93,behavior:quiet?'instant':'smooth'});if(quiet){mascot.focus({preventScroll:true});}else later(desktopTimers,()=>{if(interactive)mascot.focus({preventScroll:true});},1200);});
  motionButton.addEventListener('click',()=>{if(systemMotion.matches){motionButton.textContent='Mengikuti pengaturan perangkat';return;}manualMotion=!manualMotion;try{localStorage.setItem('bito-reduced-motion',String(manualMotion));}catch{}configureScene();});

  let stageObserver;
  if('IntersectionObserver' in window){stageObserver=new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting;syncRive();});stageObserver.observe(stage);}
  $('#other-downloads').addEventListener('click',()=>{const el=$('#download-options'),b=$('#other-downloads'),open=b.getAttribute('aria-expanded')!=='true';gsap?.killTweensOf(el);b.setAttribute('aria-expanded',String(open));if(open){el.hidden=false;if(gsap&&!quiet)gsap.fromTo(el,{height:0,opacity:0},{height:'auto',opacity:1,duration:.35,ease:'power3.out'});}else if(gsap&&!quiet){gsap.to(el,{height:0,opacity:0,duration:.23,onComplete:()=>{el.hidden=true;gsap.set(el,{clearProps:'height,opacity'});}});}else el.hidden=true;});
  $$('details summary').forEach(summary=>summary.addEventListener('click',event=>{if(!gsap||quiet)return;event.preventDefault();const d=summary.parentElement,expand=!d.open||d.dataset.closing==='true',start=d.offsetHeight;gsap.killTweensOf(d);if(expand){delete d.dataset.closing;d.style.height='';d.open=true;const end=d.scrollHeight;gsap.fromTo(d,{height:start,overflow:'hidden'},{height:end,duration:.32,ease:'power3.out',onComplete:()=>gsap.set(d,{clearProps:'height,overflow'})});}else{d.dataset.closing='true';gsap.to(d,{height:summary.offsetHeight,overflow:'hidden',duration:.24,ease:'power2.inOut',onComplete:()=>{if(d.dataset.closing==='true'){d.open=false;delete d.dataset.closing;}gsap.set(d,{clearProps:'height,overflow'});}});}}));
  if(/Windows/i.test(navigator.userAgent)){const a=$('#primary-download');a.href='https://github.com/feboyfierlyan/bito-desktop/releases/download/v0.5.1/Bito-0.5.1-Windows-x64-Setup.exe';$('#primary-download-label').textContent='Download untuk Windows';}
  let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{renderLaptop();fitRive();if(interactive){updateBounds();positionPanels();}});},{passive:true});
  window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;clearTimers(desktopTimers);window.BitoFeatures?.dispose();presenter?.dispose();cancelAnimationFrame(resizeFrame);stageObserver?.disconnect();chatReveal?.kill();gsap?.killTweensOf([chatPosition,greetingPosition,drag,sway]);context?.revert();draggable?.kill();rig?.restore();rive?.cleanup();});
  configureScene();document.fonts.ready.then(()=>{ScrollTrigger?.refresh();fitRive();}).catch(()=>{});startRive();
})();
