const assert = require('node:assert/strict');
const {step, target, create} = require('../dist/peek-motion.js');
// Same travel at different display refresh rates; no overshoot at rest.
function travel(hz) {
  let value=0,velocity=0;
  for(let n=0;n<hz;n++) ({value,velocity}=step(value,velocity,300,1/hz));
  return value;
}
assert(Math.abs(travel(60)-travel(120))<1e-8);
assert(Math.abs(travel(60)-300)<.001);
let state=step(0,0,300,.05);
const before=state;
state=step(state.value,state.velocity,-200,1/120);
assert(state.value>before.value,'Reversal should carry momentum before turning');
assert(state.value<before.value+before.velocity/120,'Reversal decelerates immediately');
for(let i=0;i<180;i++) state=step(state.value,state.velocity,-200,1/120);
assert(Math.abs(state.value+200)<.001);
for(const [w,h] of [[280,170],[640,190],[900,220]]) {
  for(const x of [-300,0,w/2,w,w+300]) for(const y of [-300,0,h/2,h,h+300]) {
    const t=target(w,h,128,40,x,y),cx=t.x+w/2,cy=t.y+h/2+15;
    assert(cx-128*.5675>=0&&cx+128*.5675<=w);
    assert(cy-40*.5675>=0&&cy+40*.5675<=h);
  }
}
// Exercise real event wiring with an isolated scheduler, not a second model.
class Surface extends EventTarget {
  constructor(){super();this.attrs={};this.style={setProperty(){}};}
  setAttribute(k,v){this.attrs[k]=v;}
  removeAttribute(k){delete this.attrs[k];}
  matches(){return false;}
}
const win=global.window=new Surface(),doc=global.document=new Surface();doc.hidden=false;
const fine=new Surface();fine.matches=true;global.matchMedia=()=>fine;
let frames=new Map(),counter=0;global.requestAnimationFrame=fn=>{frames.set(++counter,fn);return counter;};
global.cancelAnimationFrame=id=>frames.delete(id);
global.ResizeObserver=class{observe(){}disconnect(){}};
const pill=new Surface();pill.offsetWidth=128;pill.offsetHeight=40;
const surface=new Surface();surface.clientWidth=640;surface.clientHeight=190;
surface.getBoundingClientRect=()=>({left:10,top:20,right:650,bottom:210,width:640,height:190});
const link=new Surface();link.querySelector=s=>s==='.peek-play'?pill:surface;
function pointer(type,x,y,pointerType='mouse') {
 const e=new Event(type);Object.assign(e,{clientX:x,clientY:y,pointerType});link.dispatchEvent(e);
}
const motion=create(link);
pointer('pointerenter',500,100,'touch');assert.equal(frames.size,0);
pointer('pointerenter',500,100);assert.equal(link.attrs['data-peek-following'],'true');
for(let i=0;i<100;i++) pointer('pointermove',400+i,90);
assert.equal(frames.size,1,'Only one frame should be scheduled');
link.dispatchEvent(new Event('pointerleave'));assert.equal(link.attrs['data-peek-following'],undefined);
let now=performance.now();for(let i=0;i<200&&frames.size;i++){now+=1000/60;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(now));}
assert.equal(frames.size,0,'Settled animation must stop');
assert(pill.style.transform.includes('0.000px, 0.000px'));
pointer('pointerenter',500,100);motion.setReducedMotion(true);
assert.equal(frames.size,0);assert.equal(link.attrs['data-peek-following'],undefined);
pointer('pointermove',450,100);assert.equal(frames.size,0);
motion.setReducedMotion(false);pointer('pointerenter',500,100);doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(frames.size,0);
doc.hidden=false;motion.dispose();pointer('pointerenter',500,100);assert.equal(frames.size,0);
console.log('PASS: frame-rate independence, momentum reversal, 75 edge targets, one frame loop, touch fallback, return to center, reduced motion, hidden-tab pause and disposal');
