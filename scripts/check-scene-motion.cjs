// Run the scene's real motion callbacks with controlled geometry and animation time.
// No browser interaction, screenshots, or AI requests are used.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const math=require('../dist/scene-math.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/site.js'),'utf8');
const callbacks=source.slice(source.indexOf('  function sceneGeometry()'),source.indexOf('  function setupDrag()'));
const element=()=>({x:0,y:0,style:{setProperty(k,v){this[k]=v;},getPropertyValue(k){return this[k]||'';}},dataset:{},setAttribute(k,v){this[k]=v;},removeAttribute(k){delete this[k];}});
const drag=element(),anchor={...element(),offsetWidth:370},chat=element(),greeting={...element(),offsetWidth:200,offsetHeight:68};
Object.defineProperties(chat,{offsetWidth:{get(){return parseFloat(this.style.width)||340;}},offsetHeight:{get(){return 320;}}});
const moves=[],tweens=[],reveals=[];
const gsap={
 set(target,values){Object.assign(target,values);},getProperty(target,key){return target[key]||0;},killTweensOf(){},
 to(target,values){tweens.push({target,values});},
 quickTo(target,key,options){const move=value=>moves.push({target,key,value,options});move.tween={pause(){}};return move;},
 timeline(){const tl={p:0,active:false,direction:0,tracks:[],fromTo(target,from,to){this.tracks.push({target,from,to});return this;},progress(value){if(value===undefined)return this.p;this.p=value;return this;},pause(){this.active=false;return this;},timeScale(value){this.speed=value;return this;},play(){this.direction=1;this.active=true;return this;},reverse(){this.direction=-1;this.active=true;return this;},isActive(){return this.active;},kill(){this.active=false;}};reveals.push(tl);return tl;}
};
const c={...math,gsap,stage:{clientWidth:1440,clientHeight:900,classList:{toggle(){},remove(){}},getBoundingClientRect(){return{left:0,top:0};}},anchor,drag,sway:element(),mascot:{...element(),getBoundingClientRect(){throw Error('Sway bounds must never drive panel placement');}},chat,greeting,chatPosition:element(),greetingPosition:element(),shell:element(),device:element(),backdrop:element(),flight:{reveal:1,zoom:1,arrival:1},dragOffset:{x:0,y:0},placements:{},interactive:true,quiet:false,innerWidth:1440,chatOpen:false,chatReveal:null,storyTimeline:{progress:()=>1},boolean(){},wave(){}};
c.draggable={disable(){},enable(){},endDrag(){},update(){},applyBounds(){}};
drag.getBoundingClientRect=()=>({left:anchor.x+drag.x*anchor.scale,top:anchor.y+drag.y*anchor.scale,width:370*anchor.scale,height:370*anchor.scale});
vm.createContext(c);vm.runInContext(callbacks,c);
c.renderLaptop(1);
// Reverse scroll must begin at every user's exact drop position, not the default corner.
for(const [x,y]of [[-350,-220],[-130,-90],[-50,-5],[0,0]]){
 c.interactive=true;drag.x=x;drag.y=y;c.setInteractive(false);
 assert.equal(drag.x,x);assert.equal(drag.y,y,'Leaving the interactive step must retain the dropped offset');
 c.renderLaptop(.72);assert.equal(drag.x,x);assert.equal(drag.y,y);
 c.renderLaptop(.7199);assert(Math.abs(drag.x-x)<.001&&Math.abs(drag.y-y)<.001,'No handoff discontinuity');
 let last=Math.abs(drag.x);
 for(let i=0;i<=100;i++){c.renderLaptop(.72-.38*i/100);assert(Math.abs(drag.x)<=last+.0001);last=Math.abs(drag.x);}
 assert(Math.abs(drag.x)<.00001&&Math.abs(drag.y)<.00001);
 c.renderLaptop(.72);assert.equal(drag.x,x,'Scrolling forward restores the drop position continuously');
}
assert.equal(math.returnWeight(.1),0);assert.equal(math.returnWeight(1),1);
// A 32px dead band keeps a panel from oscillating at the side boundary.
const frame={x:0,y:0,w:1000,h:700},actor={x:460,y:200,w:200,h:150};
assert.equal(math.companionPanel(actor,frame,300,250,false,'right').side,'right');
assert.equal(math.companionPanel(actor,frame,300,250,false,'left').side,'left');
assert.equal(math.companionPanel({...actor,x:420},frame,300,250,false,'left').side,'right');
// Stable drag geometry drives placement even while Bito is waving or swaying.
c.interactive=true;c.renderLaptop(1);drag.x=0;drag.y=0;c.positionPanels(true);
const dock=c.chatPosition,startX=dock.x;
c.placePanel('chat',dock,{x:c.laptop.visible.x+12,y:400,side:'right'});
assert.equal(dock.x,startX,'Side changes must enqueue motion instead of jumping');
const newMoves=moves.filter(m=>m.target===dock);assert(newMoves.length>0&&newMoves.every(m=>m.options.duration>0));
const count=moves.length;c.placePanel('chat',dock,{x:c.laptop.visible.x+12,y:400,side:'right'});
assert.equal(moves.length,count,'Repeated frame updates must not restart the same translation');
// Opening/closing midway must reuse the current playhead, with no DOM reparent or reset.
c.prepareChatMotion();const tl=c.chatReveal;
assert.equal(tl.tracks.length,2);assert.equal(tl.tracks[0].target,chat,'One parent carries the entire chat');
c.openChat();assert(c.chatOpen&&!chat.inert);assert.equal(tl.direction,1);
tl.p=.43;c.closeChat();assert(!c.chatOpen&&chat.inert);assert.equal(tl.direction,-1);assert.equal(tl.p,.43);
c.openChat();assert.equal(c.chatReveal,tl);assert.equal(tl.p,.43);assert.equal(tl.direction,1);
for(let i=0;i<10;i++){c.closeChat();c.openChat();assert.equal(tl.p,.43);}
c.quiet=true;c.closeChat();assert.equal(tl.p,0);c.openChat();assert.equal(tl.p,1);
const html=fs.readFileSync(require('node:path').join(__dirname,'../dist/index.html'),'utf8');
assert(!/id="(?:stage-caption|chapter-number|chapter-copy|chapter-progress)"/.test(html));
assert(!/append\(greeting\)|prepend\(greeting\)/.test(source),'Live greeting must not move between parents');
console.log('PASS: dropped-position reverse scroll, reversible rapid chat toggles, stable sway-independent placement, animated side changes, hysteresis, reduced motion and chapter removal');
