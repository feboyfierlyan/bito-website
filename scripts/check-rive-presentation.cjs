const assert=require('node:assert/strict');
const {isBitoFrame,createPresenter}=require('../dist/rive-presentation.js');
function frame(color=[0,0,0,0]){const data=new Uint8ClampedArray(32*32*4);for(let i=0;i<data.length;i+=4)data.set(color,i);return{width:32,height:32,data};}
const valid=frame();
for(let y=8;y<24;y++)for(let x=8;x<24;x++)valid.data.set(y>12&&y<20&&x>10&&x<22?[255,245,218,255]:[147,216,143,255],(y*32+x)*4);
const black=frame([0,0,0,255]),white=frame([255,255,255,255]),green=frame([147,216,143,255]),blank=frame();
assert(isBitoFrame(valid));for(const f of [black,white,green,blank])assert(!isBitoFrame(f));
const incomplete=frame();for(let y=8;y<24;y++)for(let x=8;x<24;x++)incomplete.data.set([147,216,143,255],(y*32+x)*4);
assert(!isBitoFrame(incomplete),'A partial green frame without the face is not ready');
let next=black,reads=0,copies=0,clears=0,ready=0,seq=0;
const tasks=new Map(),classNames=new Set();
const canvas={width:300,height:150,getContext(){return{clearRect(){clears++;},drawImage(){copies++;}};}};
const buffer={width:740,height:740};
const sample={getContext(type,options){assert(options.willReadFrequently);return{clearRect(){},drawImage(){},getImageData(){reads++;return next;}};}};
const p=createPresenter({canvas,buffer,sample,art:{classList:{add(n){classNames.add(n);}}},onReady(){ready++;},requestFrame(fn){const id=++seq;tasks.set(id,fn);return id;},cancelFrame(id){tasks.delete(id);}});
function tick(f){next=f;const run=[...tasks.values()];tasks.clear();for(const fn of run)fn();}
p.request();p.request();assert.equal(tasks.size,1,'Coalesce multiple advance callbacks');tick(black);
assert.equal(ready,0);assert.equal(copies,0);assert.equal(canvas.width,300);
p.request();tick(blank);assert.equal(copies,0);
p.request();tick(valid);assert.equal(ready,0,'One valid frame cannot expose the runtime');
tick(black);assert.equal(ready,0,'A bad frame resets startup readiness');
p.request();tick(valid);tick(valid);assert(p.ready&&classNames.has('ready'));assert.equal(ready,1);assert.equal(copies,1);assert.equal(canvas.width,740);
for(const bad of [blank,black,white,green]){p.request();tick(bad);assert.equal(copies,1,'Keep the last good frame when the runtime emits an invalid frame');}
buffer.width=buffer.height=1480;p.request();tick(black);assert.equal(canvas.width,740,'Do not clear the visible surface while a resize is loading');
p.request();tick(valid);assert.equal(canvas.width,1480);assert.equal(canvas.height,1480);assert.equal(copies,2);assert.equal(clears,2);assert.equal(ready,1);
p.request();p.dispose();assert.equal(tasks.size,0);p.request();assert.equal(tasks.size,0);
assert(reads>5);
console.log('PASS: black/blank/partial startup frames blocked; stable first-frame handoff; last good frame preserved; atomic resize; coalesced readback and disposal');
