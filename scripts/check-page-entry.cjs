const assert = require('node:assert/strict');
const {mount} = require('../dist/page-entry.js');
class Node extends EventTarget {
  constructor(top = 0, group = 'windows') {
    super(); this.top = top; this.group = group; this.classes = new Set(); this.calls = [];
    this.classList = {add: c => this.classes.add(c), remove: c => this.classes.delete(c), contains: c => this.classes.has(c)};
  }
  getAttribute(name) { return name === 'data-entry-group' ? this.group : null; }
  getBoundingClientRect() { return {top:this.top,left:0,width:100,height:40}; }
  animate(frames, options) {
    const animation = {frames, options, cancelled: false, finished: new Promise(resolve => {this.complete = resolve;}), cancel() {this.cancelled = true;}};
    this.calls.push(animation); return animation;
  }
}
function fixture({hash = '',scrollY = 0,boot = true,unsupported = false,groups} = {}) {
  const title = [new Node(),new Node(),new Node()], hero = groups ? groups.map((group,i)=>new Node(600-i*50,group)) : [new Node(300),new Node(100),new Node(200)], sections = [new Node(1000),new Node(2000)];
  const document = new Node(); document.documentElement = new Node();
  if (boot) document.documentElement.classList.add('entry-boot');
  if (unsupported) title[0].animate = null;
  document.querySelectorAll = s => s === '[data-entry-title]' ? title : s.includes('hero') ? hero : sections;
  let observer; const timers = new Map(); let count = 0;
  const scope = Object.assign(new EventTarget(), {document, location:{hash},scrollY,innerHeight:720,
    setTimeout(fn,ms) {timers.set(++count,{fn,ms});return count;}, clearTimeout(id) {timers.delete(id);},
    IntersectionObserver: class {
      constructor(fn) {this.fn=fn;this.targets=new Set();observer=this;}
      observe(el) {this.targets.add(el);} unobserve(el) {this.targets.delete(el);} disconnect() {this.targets.clear();}
    }
  });
  const api = mount(scope);
  return {api,scope,document,title,hero,sections,timers,all:[...title,...hero,...sections], get observer(){return observer;},
    advance(ms) {for(const [id,timer] of [...timers]) if(timer.ms<=ms) {timers.delete(id);timer.fn();}}
  };
}
const f=fixture(); f.api.start(false);
assert(f.title[0].calls[0].options.delay < f.title[1].calls[0].options.delay);
assert(f.title[1].calls[0].options.delay < f.title[2].calls[0].options.delay);
assert(f.title.every(n=>n.calls[0].frames[0].transform.includes('rotateX(-38deg)')));
assert(f.title.every(n=>n.calls[0].frames[0].transform.includes('14%')));
const titleEnd=Math.max(...f.title.map(n=>n.calls[0].options.delay+n.calls[0].options.duration));
assert(titleEnd<=1200,'Title stays responsive without a long wait');
assert(f.title.every(n=>n.calls[0].options.duration>=850),'Give the title time to turn gently');
assert(f.hero.every(n=>n.calls[0].options.duration>=1000),'Reveals should unfold slowly');
assert(Math.max(...[...f.timers.values()].map(t=>t.ms))>Math.max(...f.hero.map(n=>n.calls[0].options.delay+n.calls[0].options.duration)),'Cleanup must not cut off the longer reveal');
assert(Math.min(...f.hero.map(n=>n.calls[0].options.delay))-titleEnd<=30,'No long pause after title');
assert(Math.min(...f.hero.map(n=>n.calls[0].options.delay))>=600,'Title leads before the first content starts');
assert(Math.min(...f.hero.map(n=>n.calls[0].options.delay))<titleEnd,'Content overlaps the settling title instead of waiting for it');
assert(f.hero[1].calls[0].options.delay<f.hero[2].calls[0].options.delay);
assert(f.hero[2].calls[0].options.delay<f.hero[0].calls[0].options.delay,'Reveal order follows geometry, not DOM order');
assert(f.hero.every(n=>n.calls[0].frames[0].translate==='0 -10px'),'Content descends from above');
assert(f.hero.every(n=>n.calls[0].frames.every(frame=>!('transform' in frame))),'Do not overwrite drag transforms');
assert(f.sections.every(n=>n.calls.length===0),'Offscreen sections do not animate at load');
f.advance(2000); assert.equal(f.observer.targets.size,2);
f.observer.fn([{isIntersecting:true,target:f.sections[0],boundingClientRect:{top:10}}]);
assert.equal(f.sections[0].calls.length,1); assert.equal(f.observer.targets.size,1);
f.observer.fn([{isIntersecting:true,target:f.sections[1],boundingClientRect:{top:20}}]);
assert(f.sections[1].calls[0].options.delay>0&&f.sections[1].calls[0].options.delay<=120,'Neighboring sections overlap while retaining separate starts across observer callbacks');
f.api.setReducedMotion(true);
assert(f.all.every(n=>!n.classes.has('entry-pending'))); assert.equal(f.timers.size,0); assert.equal(f.observer.targets.size,0);
assert(f.all.flatMap(n=>n.calls).every(a=>a.cancelled));
f.api.start(false); assert.equal(f.title[0].calls.length,1,'Preference changes never replay the intro');
for(const options of [{hash:'#download'},{scrollY:20},{scrollY:350},{boot:false},{unsupported:true}]) {
  const t=fixture(options);t.api.start(false);
  assert(t.all.every(n=>n.calls.length===0&&!n.classes.has('entry-pending')),'Deep links, restored scroll, failed boot and unsupported animation stay readable');
  t.api.dispose();
}
const grouped=fixture({groups:['preview','actions','description','icons','windows','icons','hint']});
grouped.api.start(false);
const groupDelay=name=>Math.min(...grouped.hero.filter(n=>n.group===name).map(n=>n.calls[0].options.delay));
for(const [before,after] of [['windows','icons'],['icons','description'],['description','actions'],['actions','preview']]) {
 const gap=groupDelay(after)-groupDelay(before);
 assert(gap>=80&&gap<=120,'Keep category order with tightly overlapping starts');
}
assert(grouped.hero.every(n=>n.calls[0].options.duration===1150),'Closer starts must not speed up the reveal motion');
assert(groupDelay('preview')-groupDelay('windows')<=450,'Reach the preview without a long cascade');
assert(groupDelay('preview')>groupDelay('actions'));
assert(Math.max(...[...grouped.timers.values()].map(t=>t.ms))>Math.max(...grouped.hero.map(n=>n.calls[0].options.delay+n.calls[0].options.duration)),'No group may be cut off by cleanup');
grouped.api.dispose();
const quiet=fixture();quiet.api.start(true);assert(quiet.all.every(n=>n.calls.length===0));
const scrolled=fixture();scrolled.api.start(false);scrolled.scope.scrollY=500;scrolled.scope.dispatchEvent(new Event('scroll'));
assert(scrolled.hero.every(n=>!n.classes.has('entry-pending')));
assert.equal(scrolled.observer.targets.size,2,'Scrolling ahead unlocks sections immediately');
scrolled.api.dispose();
const restored=fixture();restored.scope.bitoReturningNavigation=true;
const restoreFrames=new Map();let restoreId=0;
restored.scope.requestAnimationFrame=fn=>{restoreFrames.set(++restoreId,fn);return restoreId;};
restored.scope.cancelAnimationFrame=id=>restoreFrames.delete(id);
restored.api.start(false);assert(restored.all.every(n=>n.calls.length===0));
restored.scope.dispatchEvent(new Event('pageshow'));
restored.scope.scrollY=950;
for(let i=0;i<2;i++){const batch=[...restoreFrames.values()];restoreFrames.clear();batch.forEach(fn=>fn());}
assert(restored.all.every(n=>n.calls.length===0&&!n.classes.has('entry-pending')),'Late native restoration must skip the intro');
restored.api.dispose();
const hidden=fixture();hidden.api.start(false);hidden.document.hidden=true;hidden.document.dispatchEvent(new Event('visibilitychange'));
assert(hidden.all.every(n=>!n.classes.has('entry-pending')));
const nav=fixture();nav.api.start(false);nav.scope.dispatchEvent(new Event('hashchange'));
assert(nav.all.every(n=>!n.classes.has('entry-pending')));
const focus=fixture();focus.api.start(false);
const focusEvent=new Event('focusin');Object.defineProperty(focusEvent,'target',{value:{closest:()=>focus.hero[0]}});focus.document.dispatchEvent(focusEvent);
assert(!focus.hero[0].classes.has('entry-pending'),'Focused controls reveal immediately');
focus.api.dispose();assert.equal(focus.timers.size,0);
console.log('PASS: left-to-right title, title-led overlapping content, explicit content groups, spatial order within groups, independent drag transforms, deferred sections, reduced motion, direct links, restored scroll, focus, backgrounding and cleanup');
