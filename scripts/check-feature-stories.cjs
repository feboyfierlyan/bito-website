// Exercise actual feature lifecycle and timelines without opening a browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {readingRow, conversation, mount} = require('../dist/feature-stories.js');
const element = text => ({textContent: text || '', querySelector(selector) {return this.nodes[selector];}});
function row(top = 0) {
  const prompt = element(), answer = element(), indicator = element(), promptText = element(), answerText = element(), surface = element();
  prompt.nodes = {'.feature-measure': element('bito, ingetin aku 15 menit lagi')};
  answer.nodes = {'.feature-measure': element('siap. nanti aku colek, ya.')};
  indicator.querySelectorAll = () => [element(), element(), element()];
  const root = element();
  root.nodes = {'.feature-prompt': prompt, '.feature-answer': answer, '.feature-typing': indicator, '[data-feature-prompt]': promptText, '[data-feature-answer]': answerText, '.feature-surface': surface};
  root.top = top; root.height = 700; root.getBoundingClientRect = () => ({top:root.top, bottom:root.top + root.height});
  root.classList = {toggle(){}};
  return {root, prompt, answer, indicator, promptText, answerText, surface};
}
const timelines = [], tweens = [];
const gsap = {
  set(target, values) {(Array.isArray(target) ? target : [target]).forEach(el => Object.assign(el, values));},
  killTweensOf(){}, registerPlugin(){},
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
const waiting = first.steps.find(s => s.target === r.indicator && s.values?.autoAlpha === 1);
const responding = first.steps.find(s => s.target === r.answer);
assert(responding.at - waiting.at >= 1, 'A readable typing interval must separate request and reply');
const oldTyping = first.steps.find(s => s.values?.prompt);
oldTyping.target.prompt=4;oldTyping.values.onUpdate();assert.equal(r.promptText.textContent, 'bito');
sequence.stop();assert(first.killed);
// Reenter from either direction: restart, and ignore old queued callbacks.
sequence.start();const second=timelines.at(-1);assert.notEqual(first, second);
oldTyping.target.prompt=25;oldTyping.values.onUpdate();assert.equal(r.promptText.textContent, '', 'An old request must not update a new entry');
run(second);assert.equal(r.answerText.textContent, 'siap. nanti aku colek, ya.');
sequence.start();const third=timelines.at(-1);sequence.pause();assert(third.paused);sequence.resume();assert(!third.paused);
sequence.start(true);assert(third.killed);assert.equal(r.answerText.textContent, 'siap. nanti aku colek, ya.');
assert.equal(r.indicator.autoAlpha, 0);
// Reading selection follows both scroll directions, with a small dead band.
const bounds = [{top:-100,bottom:600},{top:600,bottom:1300},{top:1300,bottom:2000}];
assert.equal(readingRow(bounds,900),0);
assert.equal(readingRow(bounds.map(b=>({top:b.top-650,bottom:b.bottom-650})),900,0),1);
assert.equal(readingRow(bounds,900,1),0);
assert.equal(readingRow([{top:1500,bottom:2200}],900),-1);
assert.equal(readingRow([{top:-900,bottom:-200}],900),-1);
assert.equal(readingRow([{top:-190,bottom:510},{top:510,bottom:1210}],1000,0),0, 'Keep current feature near boundary');
const rows = [row(100),row(800),row(1500)];let callbacks, killed=false;
const listeners = {};
const scope = {gsap, innerHeight:900, matchMedia:()=>({matches:false}), document:{hidden:false, querySelectorAll:()=>rows.map(r=>r.root), addEventListener:(n,f)=>listeners[n]=f, removeEventListener:n=>delete listeners[n]}, ScrollTrigger:{create(options){callbacks=options;return{kill(){killed=true;}};}}};
const controller = mount(scope);
const active = timelines.at(-1), count=timelines.length;
callbacks.onUpdate();callbacks.onRefresh();assert.equal(timelines.length,count,'Unchanged active row must not restart during scroll/refresh');
rows.forEach(r=>r.root.top-=700);callbacks.onUpdate();assert(active.killed,'Switching rows must cancel previous sequence');
assert.notEqual(timelines.at(-1), active);
controller.setReducedMotion(true);assert(rows.every(r=>r.surface.opacity===1&&r.surface.scale===1));assert(rows.every(r=>r.answerText.textContent.length>0));
controller.dispose();assert(killed);assert(!listeners.visibilitychange);
const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
assert.equal((html.match(/data-feature="/g)||[]).length,3);
assert(!/class="(?:personality|help) section-pad"/.test(html));
assert(!/01 — KEPRIBADIAN|02 — HAL KECIL/.test(html));
assert.equal((html.match(/Video demo segera hadir/g)||[]).length,3);
assert(!/<video\b/.test(html),'Do not ship fake demos or add video loads before videos exist');
console.log('PASS: feature reading selection in both directions, dead band, interrupted typing, replay on reentry, typing pause, reduced motion, visibility cleanup, complete previews and three placeholder windows');
