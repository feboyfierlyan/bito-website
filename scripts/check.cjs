const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {geometry, dragBounds, chatPlacement, clamp, stickerBounds,laptopLayout,companionPose,companionPanel,companionBounds} = require('../dist/scene-math.js');
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
assert.equal((html.match(/<canvas /g)||[]).length,2,'One presentation canvas and one hidden runtime canvas must persist through the scene');
for(const ref of [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m=>m[1]))if(!/^(https?:|data:|mailto:)/.test(ref))assert(fs.existsSync(path.join(root,ref)),`Missing asset ${ref}`);
for(const ref of [...html.matchAll(/href="#([^"]+)"/g)].map(m=>m[1]))assert(ids.includes(ref),`Missing anchor ${ref}`);
const css=['style.css','desktop-paper.css','laptop-scene.css'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
for(const [,ref]of css.matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g))assert(fs.existsSync(path.join(root,ref)),`Missing CSS asset ${ref}`);
for(const file of ['site.js','scene-math.js','desktop-stickers.js','rive-presentation.js'])new vm.Script(fs.readFileSync(path.join(root,file),'utf8'),{filename:file});
assert(!/fetch\(|XMLHttpRequest|api[_-]?key/i.test(fs.readFileSync(path.join(root,'site.js'),'utf8')),'Demo must remain local');
assert(css.includes('radial-gradient(circle, #d8dce2 1px'), 'Dotted white canvas missing');
for(const id of ['hero-desk','hello-sticker','play-scene','tentang'])assert(ids.includes(id));
const js=fs.readFileSync(path.join(root,'site.js'),'utf8');
assert.equal((js.match(/new window\.rive\.Rive\(/g)||[]).length,1,'Keep exactly one Rive instance');
assert(js.includes("canvas:$('#bito-runtime')"),'Rive must render only to the hidden buffer');
for(const [,id]of js.matchAll(/\$\('#([a-z0-9-]+)'\)/g))assert(ids.includes(id),`Missing scripted element ${id}`);
for(const [w,h]of [[320,800],[375,812],[430,932],[768,760],[1024,768],[1440,900],[1920,1080]]){
  const mobile=w<=760,size=mobile?260:w>1700?440:w<=1100?310:370;
  const g=geometry(w,h,size,{x:0,y:90,w,h:h-160},mobile).hero;
  assert(Math.abs(g.x+size*g.scale/2-w/2)<.01,'Hero mascot must be centered');
  assert(g.y>=90&&g.y+size*g.scale<h*.4,'Hero mascot overlaps headline');
}
assert(html.includes('get bito for mac')&&html.includes('get bito for windows'));
assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname,'../.openai/hosting.json'),'utf8')).project_id,'appgprj_6ade497ddd44819195b35aae3ee1d06a','Existing Site identity must be retained');
console.log(`PASS: ${tests} corner/viewport placement cases, chat side switching, unique IDs, one persistent Rive instance and guarded presentation, local assets, section anchors, JS syntax, browser-local demo`);
for(const [w,h]of [[320,800],[375,812],[768,760],[1440,900],[1920,1080]]){
  const frame={left:20,top:-120,right:w+20,bottom:h-120};
  for(const size of [30,64,190])for(const x of [-400,0,450])for(const y of [-300,0,500]){
    const rect={left:50+x,top:80+y,right:50+x+size,bottom:80+y+size};
    const b=stickerBounds(rect,frame,x,y,96);
    for(const dx of [b.minX,b.maxX])for(const dy of [b.minY,b.maxY]){
      assert(rect.left+dx-x>=frame.left+12-.01);
      assert(rect.right+dx-x<=frame.right-12+.01);
      assert(rect.top+dy-y>=frame.top+96-.01);
      assert(rect.bottom+dy-y<=frame.bottom-12+.01);
    }
  }
}
for(const [,ref]of html.matchAll(/data-(?:gif|still)="([^"]+)"/g))assert(fs.existsSync(path.join(root,ref)),`Missing animated/static asset ${ref}`);
for(const name of ['word.svg','excel.svg','notes.svg','trash.png','coffee.png','compact-disc.png','flower.gif','flower-still.png']){
  const file=fs.readFileSync(path.join(root,'assets/stickers',name));
  if(name.endsWith('.svg'))assert(file.toString().includes('<svg')&&!/<script|onload=|<foreignObject/i.test(file),'Unsafe SVG');
  else if(name.endsWith('.png'))assert.equal(file.subarray(1,4).toString(),'PNG');
  else assert.equal(file.subarray(0,3).toString(),'GIF');
}
assert((html.match(/data-sticker\b/g)||[]).length>=14);
for(const tag of html.match(/<(?:a|button)\b[^>]*class="(?:floating-file [^"]+|scene-peek)"[^>]*>/g)||[]){assert(!tag.includes('data-sticker'),'Windows must not be draggable');assert(tag.includes('draggable="false"'),'Disable native window drag');}
console.log('PASS: sticker bounds across 135 viewport/position cases; all requested icons, GIF and reduced-motion poster bundled');
let laptopCases=0;
for(const [w,h]of [[320,800],[375,812],[430,932],[768,760],[1024,768],[1440,900],[1920,1080]]){
  const mobile=w<=760,size=mobile?260:w>1700?440:w<=1100?310:370;
  for(const zoom of [0,.25,.5,.75,1]){
    const l=laptopLayout(w,h,zoom,1,mobile),f=l.visible;
    assert(Math.abs(l.image.w/l.image.h-4/3)<.00001,'Laptop image must retain original aspect ratio');
    assert(f.x>=14&&f.x+f.w<=w-14+.01);
    assert(f.y>=82&&f.y+f.h<=h-94+.01);
    assert(f.x>=l.screen.x-.01&&f.x+f.w<=l.screen.x+l.screen.w+.01);
    assert(f.y>=l.screen.y-.01&&f.y+f.h<=l.screen.y+l.screen.h+.01);
    if(zoom!==1)continue;
    if(!mobile){
      assert(l.screen.x<0&&l.screen.y<0,'Final camera must crop the left and top of the laptop');
      assert(Math.abs(l.screen.x+l.screen.w-w*.78)<.01,'Camera must retain the right bezel near 78% of the viewport');
      assert(Math.abs(l.screen.y+l.screen.h-(h-140))<.01,'Camera must focus on the bottom-right workspace');
      assert(l.image.w>laptopLayout(w,h,0,1,mobile).image.w*1.5,'Final camera must visibly zoom into the laptop');
    }
    const p=companionPose(f,size,mobile,l.screen.h),b=companionBounds(p,f,size),extent=size*p.scale;
    assert(p.x>f.x+f.w/2&&p.y>f.y+f.h/2,'Bito must land at bottom right');
    for(const x of [b.minX,0,b.maxX])for(const y of [b.minY,0,b.maxY]){
      const a={x:p.x+x*p.scale,y:p.y+y*p.scale,w:extent,h:extent};
      assert(a.x>=f.x+11.99&&a.x+a.w<=f.x+f.w-11.99);
      assert(a.y>=f.y+39.99&&a.y+a.h<=f.y+f.h-11.99);
      const width=Math.min(mobile?300:340,f.w-24),height=Math.min(310,f.h-extent-55);
      const c=companionPanel(a,f,width,height,mobile);
      assert(c.x>=f.x+11.99&&c.x+width<=f.x+f.w-11.99,'Chat must stay inside visible screen');
      assert(c.y>=f.y+31.99&&c.y+height<=f.y+f.h-11.99);
      laptopCases++;
    }
  }
}
for(const id of ['laptop-device','laptop-image','laptop-backdrop','laptop-demo-label'])assert(ids.includes(id));
assert(!html.includes('id="setup-window"'),'Old onboarding illustration must be removed');
assert(!js.includes("$('#setup-window')"));
console.log(`PASS: ${laptopCases} laptop corner/chat cases, 35 zoom layouts, bottom-right camera crop, original image ratio, responsive screen clipping`);
