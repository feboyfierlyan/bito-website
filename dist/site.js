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
  let rive, rig, painted=false, paintFrame=0, dragging=false, talking=false, stageVisible=true;
  let gaze={active:false,x:.5,y:.5}, lastPointerX=0, lastPointerAt=0, waveAt=0;
  let desktopTimers=[], personalityTimers=[], helpTimers=[], helpVersion=0;
  let demoBusy=false, currentHelp='reminder', currentTone='chill', currentScenario='greet';
  const motionButton=$('#motion-toggle');
  const clearTimers=list=>{list.forEach(clearTimeout);list.length=0;};
  const later=(list,fn,ms)=>{const t=setTimeout(()=>{if(!disposed)fn();},ms);list.push(t);return t;};
  function animateBubble(el){if(gsap&&!quiet)gsap.fromTo(el,{y:7,scaleX:.86,scaleY:.92,opacity:0},{y:0,scaleX:1,scaleY:1,opacity:1,duration:.44,ease:'back.out(1.05)',transformOrigin:el.classList.contains('sent')?'100% 100%':'0% 100%'});}
  function boolean(name,value){try{const p=rive?.viewModelInstance?.boolean(name);if(p)p.value=value;}catch{}}
  function setTalking(value){talking=value;boolean('isTalking',value&&!quiet&&!dragging);}
  function wave(){if(quiet||performance.now()-waveAt<900)return;waveAt=performance.now();try{rive?.viewModelInstance?.trigger('wave')?.trigger();}catch{}if(gsap)gsap.fromTo(sway,{y:0},{y:-7,duration:.19,repeat:1,yoyo:true,ease:'power2.out',overwrite:'auto'});}
  function fitRive(){if(!rive)return;const c=$('#bito-canvas'),rect=c.getBoundingClientRect();if(!rect.width)return;const density=Math.min(devicePixelRatio||1,2)*c.offsetWidth/rect.width;rive.resizeDrawingSurfaceToCanvas(density);}
  function syncRive(){if(!rive)return;if(document.hidden||quiet||!stageVisible)rive.pause();else rive.play();boolean('isTalking',talking&&!quiet);}
  function createEyes(){try{
    const artboard=rive.artboard,nodes=['Pupil_L','Pupil_R'].map(n=>artboard?.node(n));if(nodes.some(n=>!n))return null;
    const pupils=nodes.map(node=>({node,x:node.x,y:node.y})),b=rive.bounds;
    const centers=pupils.map(p=>{const m=p.node.worldTransform(),v={x:m.tx-m.xx*p.x-m.yx*p.y,y:m.ty-m.xy*p.x-m.yy*p.y};m.delete();return v;});
    const cx=((centers[0].x+centers[1].x)/2-b.minX)/(b.maxX-b.minX),cy=((centers[0].y+centers[1].y)/2-b.minY)/(b.maxY-b.minY);
    let mix=0,x=0,y=0;const approach=(a,b,s,t=.075)=>b+(a-b)*Math.exp(-Math.max(0,s)/t);
    return {advance(seconds){const active=gaze.active&&!quiet&&!dragging&&!talking;mix=approach(mix,active?1:0,seconds,.065);if(mix<.001&&!active)return;const dx=(gaze.x-cx)/.55,dy=(gaze.y-cy)/.55,r=Math.max(1,Math.hypot(dx,dy));x=approach(x,dx/r*11,seconds);y=approach(y,dy/r*7,seconds);pupils.forEach(p=>{p.node.x=p.x*(1-mix)+x*mix;p.node.y=p.y+y*mix;});artboard.advance(0);},restore(){pupils.forEach(p=>{p.node.x=p.x;p.node.y=p.y;});artboard.advance(0);}};
  }catch{return null;}}
  function verifyPaint(){if(painted||paintFrame||disposed)return;paintFrame=requestAnimationFrame(()=>{paintFrame=0;try{const c=$('#bito-canvas'),ctx=c.getContext('2d');if(!ctx||!c.width)return;const p=ctx.getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=3;i<p.length;i+=128)if(p[i]>45)visible++;if(visible>100){painted=true;$('#mascot-art').classList.add('ready');syncRive();}}catch{}});}
  function startRive(){if(!window.rive)return;try{window.rive.RuntimeLoader.setWasmUrl(new URL('assets/rive.wasm',location.href).href);rive=new window.rive.Rive({src:'assets/bito.riv',canvas:$('#bito-canvas'),autoplay:true,stateMachine:'State Machine 1',autoBind:true,enableRiveAssetCDN:false,layout:new window.rive.Layout({fit:window.rive.Fit.Contain,alignment:window.rive.Alignment.Center}),onLoad(){fitRive();rig=createEyes();verifyPaint();},onAdvance(event){rig?.advance(event.data);verifyPaint();}});}catch{/* Matching poster remains visible; no loading box. */}}
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
    quiet=manualMotion||systemMotion.matches;document.documentElement.classList.toggle('motion-paused',quiet);motionButton.textContent=quiet?'Gerakan dikurangi':'Kurangi gerakan';motionButton.setAttribute('aria-pressed',String(quiet));gsap.registerPlugin(ScrollTrigger,Draggable);context=gsap.matchMedia();
    context.add({wide:'(min-width: 761px)',narrow:'(max-width: 760px)',systemQuiet:'(prefers-reduced-motion: reduce)'},media=>{
      quiet=manualMotion||media.conditions.systemQuiet;document.documentElement.classList.toggle('motion-paused',quiet);motionButton.setAttribute('aria-pressed',String(quiet));motionButton.textContent=quiet?'Gerakan dikurangi':'Kurangi gerakan';syncRive();setInteractive(false);draggable?.kill();gsap.killTweensOf([chatPosition,greetingPosition]);for(const key of Object.keys(placements))delete placements[key];setupDrag();prepareChatMotion();
      Object.assign(flight,{reveal:0,zoom:0,arrival:0});gsap.set(anchor,{left:0,top:0,bottom:'auto',xPercent:0,yPercent:0});renderLaptop(0);gsap.set(greetingPosition,{autoAlpha:0});
      if(quiet){gsap.set(['.hero-copy','#hero-desk','.hero-aside','.hero-speech','.hero-invite','.stage-note','.scroll-note'],{autoAlpha:0});stage.style.height=innerWidth<=760?'800px':'900px';$('.story').style.height='auto';Object.assign(flight,{reveal:1,zoom:1,arrival:1});renderLaptop(1);gsap.set(['#desktop-hint','#laptop-demo-label'],{autoAlpha:1});setInteractive(true);return()=>{setInteractive(false);stage.style.height='';$('.story').style.height='';draggable?.kill();draggable=null;};}
      const tl=gsap.timeline({defaults:{ease:'none'},onUpdate(){const p=this.progress();setInteractive(p>.72);renderLaptop(p);if((interactive&&!dragging)||chatReveal?.isActive())positionPanels();},scrollTrigger:{trigger:'.story',start:'top top',end:'bottom bottom',scrub:.4,invalidateOnRefresh:true,onRefresh(){renderLaptop();if(interactive){updateBounds();positionPanels();}fitRive();}}});storyTimeline=tl;
      tl.addLabel('hello',0)
        .to(['.hero-copy','#hero-desk'],{y:-50,autoAlpha:0,duration:.2},.02)
        .to(['.hero-aside','.hero-speech','.hero-invite','.stage-note','.scroll-note'],{autoAlpha:0,duration:.12},.03)
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
      gsap.from('.conversation-stage',{y:35,opacity:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:'.personality',start:'top 70%',once:true}});
      gsap.fromTo('.download-art',{yPercent:-3},{yPercent:3,ease:'none',scrollTrigger:{trigger:'.download',start:'top bottom',end:'bottom top',scrub:.5}});
      gsap.from('.download-card',{y:40,opacity:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:'.download',start:'top 80%',once:true}});
      return()=>{draggable?.kill();draggable=null;setInteractive(false);};
    });ScrollTrigger.refresh();
  }
  $('#hello-sticker').addEventListener('click',()=>{wave();const label=$('#hero-speech');label.textContent='heii, seneng ketemu kamu :)';if(gsap&&!quiet)gsap.fromTo(label,{scaleX:.9,scaleY:.94},{scaleX:1,scaleY:1,duration:.4,ease:'power3.out',overwrite:true});});
  $('#play-scene').addEventListener('click',()=>{const start=$('.story').offsetTop,travel=$('.story').offsetHeight-stage.offsetHeight;window.scrollTo({top:quiet?start:start+Math.max(0,travel)*.93,behavior:quiet?'instant':'smooth'});if(quiet){mascot.focus({preventScroll:true});}else later(desktopTimers,()=>{if(interactive)mascot.focus({preventScroll:true});},1200);});
  motionButton.addEventListener('click',()=>{if(systemMotion.matches){motionButton.textContent='Mengikuti pengaturan perangkat';return;}manualMotion=!manualMotion;try{localStorage.setItem('bito-reduced-motion',String(manualMotion));}catch{}configureScene();});

  const personas={direct:{description:'Singkat, jelas. Langsung ke intinya.',greet:['apa?'],tired:['istirahat dulu.','yang paling bikin capek apa?'],idea:['apa idenya?']},chill:{description:'Santai. Nggak perlu mikirin cara mulainya.',greet:['wut'],tired:['duh, hari panjang ya','mau cerita?'],idea:['spill','gue dengerin']},humor:{description:'Ada aja celetukannya. Tetap lihat situasi.',greet:['hadir, ketua'],tired:['hari ini kayak buka 38 tab ya','mau ngeluh dulu? sini'],idea:['awas aja kalo garing','oke spill wkwk']},care:{description:'Dengerin dulu. Nggak buru-buru kasih nasihat.',greet:['iyaa, kenapa?'],tired:['kedengerannya kamu udah ngeluarin banyak tenaga hari ini.','mau aku temenin cerita dulu?'],idea:['aku penasaran. ceritain, dong.']}};
  const prompts={greet:'bro',tired:'capek banget hari ini',idea:'ada ide random nih'};
  function moveToneTrack(immediate=false){const b=$(`[data-tone="${currentTone}"]`),track=$('#tone-track');if(gsap)gsap.to(track,{x:b.offsetLeft,width:b.offsetWidth,duration:quiet||immediate?0:.4,ease:'power3.inOut',overwrite:true});else{track.style.left=b.offsetLeft+'px';track.style.width=b.offsetWidth+'px';}}
  function showConversation(){clearTimers(personalityTimers);const parent=$('#conversation');parent.replaceChildren();const user=appendBubble(parent,prompts[currentScenario],'sent');const reply=personas[currentTone][currentScenario];$('#tone-description').textContent=personas[currentTone].description;let t=typing(parent);let elapsed=950;reply.forEach((line,i)=>{later(personalityTimers,()=>{t.remove();appendBubble(parent,line);if(i<reply.length-1)later(personalityTimers,()=>{t=typing(parent);},350);},elapsed);elapsed+=1400+Math.min(line.length*12,500);});}
  $$('[data-tone]').forEach(b=>b.addEventListener('click',()=>{if(currentTone===b.dataset.tone)return;currentTone=b.dataset.tone;$$('[data-tone]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));moveToneTrack();showConversation();}));
  $$('[data-scenario]').forEach(b=>b.addEventListener('click',()=>{if(currentScenario===b.dataset.scenario)return;currentScenario=b.dataset.scenario;$$('[data-scenario]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));showConversation();}));
  const helpExamples={reminder:{request:'nanti ingetin minum air, ya',response:'siap. nanti aku colek, ya.',result:'<div class="result-top"><span class="result-icon" aria-hidden="true">◷</span><div><small>PENGINGAT</small><strong>Minum air dulu</strong></div><time>15.30</time></div><span class="result-sub">Contoh notifikasi Bito saat aplikasi berjalan.</span>'},checklist:{request:'bantu pecah kerjaanku, dong',response:'boleh. mulai dari yang paling ringan dulu.',result:'<div class="sample-checks"><label><input type="checkbox" checked><span>Kumpulin referensi</span></label><label><input type="checkbox"><span>Susun outline</span></label><label><input type="checkbox"><span>Kirim draft pertama</span></label></div>'},file:{request:'catatan ini jadiin file markdown, ya',response:'beres. tinggal pilih mau simpan di mana.',result:'<div class="result-file"><span class="result-icon">md</span><div><strong>ide-hari-ini.md</strong><small>File contoh · Markdown</small></div><a class="file-download" download="ide-hari-ini.md" href="data:text/markdown;charset=utf-8,%23%20Ide%20hari%20ini%0A%0A-%20Kumpulin%20referensi%0A-%20Susun%20outline%0A-%20Kirim%20draft%20pertama%0A" aria-label="Unduh file Markdown contoh">↓</a></div>'}};
  let helpHasPlayed=false;
  function showHelp(animated=true){if(animated)helpHasPlayed=true;clearTimers(helpTimers);const version=++helpVersion,parent=$('#help-content');parent.className='help-content';parent.replaceChildren();const ex=helpExamples[currentHelp];appendBubble(parent,ex.request,'sent');if(!animated){appendBubble(parent,ex.response);const result=document.createElement('div');result.className='help-result';result.innerHTML=ex.result;parent.append(result);return;}const t=typing(parent);later(helpTimers,()=>{if(version!==helpVersion)return;t.remove();appendBubble(parent,ex.response);later(helpTimers,()=>{if(version!==helpVersion)return;const result=document.createElement('div');result.className='help-result';result.innerHTML=ex.result;parent.append(result);if(gsap&&!quiet)gsap.from(result,{y:12,opacity:0,scale:.96,duration:.5,ease:'power3.out'});},650);},1100);}
  $$('[data-help]').forEach(b=>b.addEventListener('click',()=>{if(currentHelp===b.dataset.help)return;currentHelp=b.dataset.help;$$('[data-help]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));showHelp();}));$('#replay-help').addEventListener('click',()=>showHelp());showHelp(false);
  let helpObserver,stageObserver;
  if('IntersectionObserver' in window){helpObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){if(!helpHasPlayed)showHelp();helpObserver.disconnect();}},{threshold:.35});helpObserver.observe($('#help-stage'));stageObserver=new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting;syncRive();});stageObserver.observe(stage);}
  $('#other-downloads').addEventListener('click',()=>{const el=$('#download-options'),b=$('#other-downloads'),open=b.getAttribute('aria-expanded')!=='true';gsap?.killTweensOf(el);b.setAttribute('aria-expanded',String(open));if(open){el.hidden=false;if(gsap&&!quiet)gsap.fromTo(el,{height:0,opacity:0},{height:'auto',opacity:1,duration:.35,ease:'power3.out'});}else if(gsap&&!quiet){gsap.to(el,{height:0,opacity:0,duration:.23,onComplete:()=>{el.hidden=true;gsap.set(el,{clearProps:'height,opacity'});}});}else el.hidden=true;});
  $$('details summary').forEach(summary=>summary.addEventListener('click',event=>{if(!gsap||quiet)return;event.preventDefault();const d=summary.parentElement,expand=!d.open||d.dataset.closing==='true',start=d.offsetHeight;gsap.killTweensOf(d);if(expand){delete d.dataset.closing;d.style.height='';d.open=true;const end=d.scrollHeight;gsap.fromTo(d,{height:start,overflow:'hidden'},{height:end,duration:.32,ease:'power3.out',onComplete:()=>gsap.set(d,{clearProps:'height,overflow'})});}else{d.dataset.closing='true';gsap.to(d,{height:summary.offsetHeight,overflow:'hidden',duration:.24,ease:'power2.inOut',onComplete:()=>{if(d.dataset.closing==='true'){d.open=false;delete d.dataset.closing;}gsap.set(d,{clearProps:'height,overflow'});}});}}));
  if(/Windows/i.test(navigator.userAgent)){const a=$('#primary-download');a.href='https://github.com/feboyfierlyan/bito-desktop/releases/download/v0.5.1/Bito-0.5.1-Windows-x64-Setup.exe';$('#primary-download-label').textContent='Download untuk Windows';}
  let resizeFrame=0;window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{moveToneTrack(true);renderLaptop();fitRive();if(interactive){updateBounds();positionPanels();}});},{passive:true});
  window.addEventListener('pagehide',event=>{if(event.persisted)return;disposed=true;[desktopTimers,personalityTimers,helpTimers].forEach(clearTimers);cancelAnimationFrame(paintFrame);cancelAnimationFrame(resizeFrame);helpObserver?.disconnect();stageObserver?.disconnect();chatReveal?.kill();gsap?.killTweensOf([chatPosition,greetingPosition,drag,sway]);context?.revert();draggable?.kill();rig?.restore();rive?.cleanup();});
  configureScene();moveToneTrack(true);document.fonts.ready.then(()=>{ScrollTrigger?.refresh();moveToneTrack(true);fitRive();}).catch(()=>{});startRive();
})();
