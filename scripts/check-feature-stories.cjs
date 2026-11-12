// Exercise actual feature lifecycle and timelines without opening a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {readingRow, conversation, mount} = require('../dist/feature-stories.js');
const element = text => ({textContent: text || '', style:{setProperty(k,v){this[k]=v;}}, ownerDocument:{defaultView:{getComputedStyle(node){return node.css || {paddingLeft:'22px',paddingRight:'22px',paddingTop:'17px',paddingBottom:'17px',borderLeftWidth:'1px',borderRightWidth:'1px',borderTopWidth:'1px',borderBottomWidth:'1px',lineHeight:'27px',fontSize:'20px'};}}}, querySelector(selector) {return this.nodes[selector];}});
function row(top = 0) {
  const prompt = element(), answer = element(), indicator = element(), promptText = element(), answerText = element(), surface = element();
  prompt.nodes = {'.feature-measure': element('bito, ingetin aku 15 menit lagi')};
  answer.nodes = {'.feature-measure': element('siap. nanti aku colek, ya.')};
  for(const el of [prompt,answer]) {
    const measure=el.nodes['.feature-measure'];
    Object.defineProperties(measure,{
      offsetWidth:{get(){return Math.min(this.textContent.length*9,parseFloat(el.style['--feature-line-width'])||254);}},
      offsetHeight:{get(){return Math.max(1,Math.ceil(this.textContent.length*9/(parseFloat(el.style['--feature-line-width'])||254)))*27;}}
    });
  }
  const promptSlot=element(),answerSlot=element(),dialogue=element();dialogue.clientWidth=300;dialogue.css={paddingLeft:'5px',paddingRight:'5px'};
  indicator.querySelectorAll = () => [element(), element(), element()];
  const root = element();
  root.nodes = {'.feature-prompt': prompt, '.feature-answer': answer, '.feature-typing': indicator, '[data-feature-prompt]': promptText, '[data-feature-answer]': answerText, '.feature-surface': surface, '.feature-dialogue':dialogue,'.feature-prompt-slot':promptSlot,'.feature-reply-slot':answerSlot};
  root.top = top; root.height = 700; root.getBoundingClientRect = () => ({top:root.top, bottom:root.top + root.height});
  root.classList = {toggle(){}};
  return {root, prompt, answer, indicator, promptText, answerText, surface, promptSlot, answerSlot, dialogue};
}
const timelines = [], tweens = [], morphs=[];
const gsap = {
  set(target, values) {(Array.isArray(target) ? target : [target]).forEach(el => Object.assign(el, values));},
  killTweensOf(){}, registerPlugin(){},
  quickTo(target,key,options) {const move=value=>morphs.push({target,key,value,options});move.tween={pause(){this.paused=true;},resume(){this.paused=false;},kill(){this.killed=true;}};return move;},
  to(target, values) {const tween = {target, values, killed:false, kill(){this.killed=true;}, pause(){this.paused=true;}, resume(){this.paused=false;}}; tweens.push(tween); return tween;},
  timeline() {
    const timeline = {steps:[], killed:false, to(target, values, at) {this.steps.push({target, values, at});return this;}, call(fn, args, at) {this.steps.push({fn, args, at});return this;}, kill(){this.killed=true;}, pause(){this.paused=true;}, resume(){this.paused=false;}};
    timelines.push(timeline);return timeline;
  }
};
function run(timeline) {
  for(const step of [...timeline.steps].sort((a,b)=>a.at-b.at)) {
    if(timeline.killed) break;
    if(step.fn) step.fn(...step.args);
    else {for(const key of ['prompt','answer']) if(key in step.values) step.target[key] = step.values[key];step.values.onUpdate?.();step.values.onComplete?.();}
  }
}
const r = row(), sequence = conversation(r.root, gsap);
assert(r.promptText.textContent.length && r.answerText.textContent.length, 'Previews must start with complete static content');
sequence.start();
let first = timelines.at(-1);
assert.equal(r.promptText.textContent, '');assert.equal(r.answerText.textContent, '');
assert.equal(r.prompt.width,64,'A message must begin compact, not at its full-text width');
const reservedHeight=r.promptSlot.style.height;
const waiting = first.steps.find(s => s.target === r.indicator && s.values?.autoAlpha === 1);
const responding = first.steps.find(s => s.target === r.answer);
assert(responding.at - waiting.at >= 1, 'A readable typing interval must separate request and reply');
const oldTyping = first.steps.find(s => s.values?.prompt);
oldTyping.target.prompt=4;oldTyping.values.onUpdate();assert.equal(r.promptText.textContent, 'bito');
assert.equal(r.prompt.width,64,'Text updates must enqueue morphing, not jump the surface');
assert(morphs.some(m=>m.target===r.prompt&&m.key==='width'&&m.value===82&&m.options.duration>0));
oldTyping.target.prompt=29;oldTyping.values.onUpdate();
assert(morphs.some(m=>m.target===r.prompt&&m.key==='height'&&m.value>63),'Wrapped messages must animate height as well');
assert.equal(r.promptSlot.style.height,reservedHeight,'Typing must not move the heading or reply slot');
const countBefore=morphs.length;oldTyping.values.onUpdate();assert.equal(morphs.length,countBefore,'Repeated frames must not restart a morph');
sequence.stop();assert(first.killed);
// Reenter from either direction: restart, and ignore old queued callbacks.
sequence.start();const second=timelines.at(-1);assert.notEqual(first, second);
oldTyping.target.prompt=25;oldTyping.values.onUpdate();assert.equal(r.promptText.textContent, '', 'An old request must not update a new entry');
run(second);assert.equal(r.answerText.textContent, 'siap. nanti aku colek, ya.');
sequence.start();const third=timelines.at(-1);sequence.pause();assert(third.paused);sequence.resume();assert(!third.paused);
sequence.start(true);assert(third.killed);assert.equal(r.answerText.textContent, 'siap. nanti aku colek, ya.');
assert.equal(r.indicator.autoAlpha, 0);
// Reflow after a width/font change measures again without restarting dialogue.
const narrow=r.prompt.width;r.dialogue.clientWidth=200;sequence.reflow();
assert(r.prompt.width<=190&&r.prompt.width<narrow);assert.equal(r.promptText.textContent,'bito, ingetin aku 15 menit lagi');
// Reading selection follows both scroll directions, with a small dead band.
const bounds = [{top:-100,bottom:600},{top:600,bottom:1300},{top:1300,bottom:2000}];
assert.equal(readingRow(bounds,900),0);
assert.equal(readingRow(bounds.map(b=>({top:b.top-650,bottom:b.bottom-650})),900,0),1);
assert.equal(readingRow(bounds,900,1),0);
assert.equal(readingRow([{top:1500,bottom:2200}],900),-1);
assert.equal(readingRow([{top:-900,bottom:-200}],900),-1);
assert.equal(readingRow([{top:-190,bottom:510},{top:510,bottom:1210}],1000,0),0, 'Keep current feature near boundary');
const rows = [row(100),row(800),row(1500)];let nextFrame=0; const frames=new Map(), windowListeners={};
const listeners = {};
const scope = {gsap, innerHeight:900, matchMedia:()=>({matches:false}),
  document:{hidden:false, querySelectorAll:()=>rows.map(r=>r.root), addEventListener:(n,f)=>listeners[n]=f, removeEventListener:n=>delete listeners[n]},
  addEventListener:(n,f)=>windowListeners[n]=f, removeEventListener:n=>delete windowListeners[n],
  requestAnimationFrame(fn){frames.set(++nextFrame,fn);return nextFrame;}, cancelAnimationFrame(id){frames.delete(id);},
  scrollTo(){throw new Error('Feature reading must never change scroll position');}
};
function flushFrame(){const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn());}
const controller = mount(scope);
const focusMotion = tweens.filter(t=>rows.some(r=>r.surface===t.target)).slice(-3);
assert.equal(focusMotion[0].values.scale,1.025,'Desktop highlight should grow only slightly above the compact layout');
assert.equal(focusMotion[1].values.scale,.91,'Neighboring features should remain visibly smaller');
assert.equal(focusMotion[1].values.opacity,.3);
assert(focusMotion.every(t=>t.values.duration>=.6&&t.values.overwrite),'Scroll reversals should retarget smooth, interruptible motion');
const active = timelines.at(-1), count=timelines.length;
windowListeners.scroll();windowListeners.scroll();windowListeners.resize();assert.equal(frames.size,1,'Scroll work coalesces into one frame');flushFrame();assert.equal(timelines.length,count,'Unchanged active row must not restart');
rows.forEach(r=>r.root.top-=700);windowListeners.scroll();flushFrame();assert(active.killed,'Switching rows must cancel previous sequence');
assert.notEqual(timelines.at(-1), active);
controller.setReducedMotion(true);assert(rows.every(r=>r.surface.opacity===1&&r.surface.scale===1));assert(rows.every(r=>r.answerText.textContent.length>0));
windowListeners.pageshow();controller.dispose();assert.equal(frames.size,0);assert.equal(Object.keys(windowListeners).length,0);assert(!listeners.visibilitychange);
// A mobile highlight must not enlarge the layout past its safe side margins.
scope.innerWidth=390;rows.forEach((r,i)=>r.root.top=100+i*700);
const mobileController=mount(scope);
const mobileMotion=tweens.filter(t=>rows.some(r=>r.surface===t.target)).slice(-3);
assert.equal(mobileMotion[0].values.scale,1);
assert.equal(mobileMotion[1].values.scale,.91);
mobileController.dispose();
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
assert(!html.includes('src="assets/vendor/ScrollTrigger.min.js"'),'No scroll-restoring plugin should be loaded');
assert.equal((html.match(/data-feature="/g)||[]).length,3);
assert(!/class="(?:personality|help) section-pad"/.test(html));
assert(!/01 — KEPRIBADIAN|02 — HAL KECIL/.test(html));
assert(!html.includes('Video demo segera hadir'));
assert.equal((html.match(/<video\b/g)||[]).length,3);
for (const slug of ['ask-on-screen','show-on-screen','project-management']) {
  for (const ext of ['mp4','jpg']) assert(fs.existsSync(path.join(__dirname, '../dist/assets/demos', slug+'.'+ext)));
}
assert.equal((html.match(/preload="none"/g)||[]).length,3);

const css=fs.readFileSync(path.join(__dirname,'../dist/feature-stories.css'),'utf8');
assert(!css.includes('.feature-reverse .feature-dialogue { align-items: flex-end; }'),'Alternating columns must not mirror message ownership');
assert(css.includes('.feature-prompt { right: 0;')&&css.includes('.feature-answer { left: 0;'));
assert.equal((html.match(/class="feature-prompt-slot"/g)||[]).length,3);
console.log('PASS: progressive width/height morph, stable wrapping/slots, responsive measurement, consistent sent-right/received-left alignment, reading selection, interrupted typing, replay, typing delay, reduced motion and cleanup');
