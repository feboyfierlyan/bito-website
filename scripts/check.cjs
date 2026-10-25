const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {geometry, dragBounds, chatPlacement, clamp} = require('../dist/scene-math.js');
const root=path.join(__dirname,'../dist');
let tests=0;
for(const [w,h] of [[320,720],[375,812],[430,932],[768,750],[1024,768],[1440,900],[1920,1080]]) {
  const mobile=w<=760,size=mobile?260:w>1700?440:w<=1100?310:370;
  const fx=mobile?17:w*(w>1700?.06:w<=1100?.04:.05),fy=mobile?90:w>1700?125:w<=1100?105:108;
  const frame={x:fx,y:fy,w:w-2*fx,h:h-fy-(mobile?73:w>1700?90:w<=1100?80:76)};
  const g=geometry(w,h,size,frame,mobile);
  for(const pose of Object.values(g)){for(const v of Object.values(pose))assert(Number.isFinite(v));assert(pose.scale>0);}
  const bounds=dragBounds(g.desktop,frame,size,g.desktop.scale);
  assert(bounds.maxX>bounds.minX&&bounds.maxY>bounds.minY);
  // Dragged mascot remains inside the actual desktop frame, including corner extremes.
  for(const x of [bounds.minX,0,bounds.maxX])for(const y of [bounds.minY,0,bounds.maxY]){
    const dx=clamp(x,bounds.minX,bounds.maxX),dy=clamp(y,bounds.minY,bounds.maxY);
    const a={x:g.desktop.x+dx*g.desktop.scale-frame.x,y:g.desktop.y+dy*g.desktop.scale-frame.y,w:size*g.desktop.scale,h:size*g.desktop.scale};
    assert(a.x>=11.99&&a.x+a.w<=frame.w-11.99);
    assert(a.y>=41.99&&a.y+a.h<=frame.h-54.99);
    const cw=mobile?frame.w*.86:w>1700?380:w<=1100?300:330;
    const c=chatPlacement(a,frame,cw,Math.min(300,frame.h-90),mobile);
    assert(c.x>=0&&c.x+cw<=frame.w+.01);
    assert(c.y>=0&&c.y+Math.min(300,frame.h-90)<=frame.h+.01);
    tests++;
  }
}
assert.equal(chatPlacement({x:800,y:200,w:200,h:200},{w:1100,h:700},330,300,false).side,'left');
assert.equal(chatPlacement({x:50,y:200,w:200,h:200},{w:1100,h:700},330,300,false).side,'right');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate element IDs');
assert.equal((html.match(/<canvas /g)||[]).length,1,'The scroll scene must retain one Rive canvas');
for(const ref of [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]))if(!/^(https?:|data:|mailto:)/.test(ref))assert(fs.existsSync(path.join(root,ref)),`Missing asset ${ref}`);
for(const ref of [...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]))assert(ids.includes(ref),`Missing anchor ${ref}`);
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
for(const [,ref]of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))assert(fs.existsSync(path.join(root,ref)),`Missing CSS asset ${ref}`);
for(const file of ['site.js','scene-math.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
assert(!/fetch\(|XMLHttpRequest|api[_-]?key/i.test(fs.readFileSync(path.join(root,'site.js'),'utf8')),'Demo must remain local');
console.log(`PASS: ${tests} corner/viewport placement cases, chat side switching, unique IDs, one persistent canvas, local assets, section anchors, JS syntax, browser-local demo`);
