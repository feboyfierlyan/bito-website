/* Geometry shared by the interactive scene and its automated checks. */
(function(root) {
  const clamp=(n,min,max)=>Math.max(min,Math.min(Math.max(min,max),n));
  function geometry(w,h,size,frame,mobile) {
    return {
      hero:{x:(w-size*(mobile?.53:.46))/2,y:mobile?110:Math.max(102,h*.125),scale:mobile?.53:.46},
      setup:{x:w/2-size*.48/2,y:frame.y+frame.h/2-145,scale:.48},
      desktop:{x:frame.x+frame.w*(mobile?.5:.27)-size*(mobile?.55:.72)/2,y:frame.y+frame.h*(mobile?.27:.61)-size*(mobile?.55:.72)/2,scale:mobile?.55:.72}
    };
  }
  function dragBounds(anchor,frame,size,scale) {
    return {minX:(frame.x+12-anchor.x)/scale,minY:(frame.y+42-anchor.y)/scale,maxX:(frame.x+frame.w-12-anchor.x)/scale-size,maxY:(frame.y+frame.h-55-anchor.y)/scale-size};
  }
  function chatPlacement(actor,frame,width,height,mobile) {
    const gap=18,pad=mobile?15:22;
    const right=actor.x+actor.w+gap;
    const left=actor.x-width-gap;
    const side=right+width<=frame.w-pad?'right':'left';
    return {side,x:mobile?pad:clamp(side==='right'?right:left,pad,frame.w-width-pad),y:mobile?clamp(frame.h-height-65,45,frame.h-height-15):clamp(actor.y+actor.h*.15,45,frame.h-height-45)};
  }
  function stickerBounds(rect,frame,x,y,top=96,pad=12) {
    // The current transformed rectangle includes each object's original tilt.
    // Keeping movement separate from the lifted inner artwork avoids cursor jumps.
    const minX=x+frame.left+pad-rect.left;
    const minY=y+frame.top+top-rect.top;
    return {minX,maxX:Math.max(minX,x+frame.right-pad-rect.right),minY,maxY:Math.max(minY,y+frame.bottom-pad-rect.bottom)};
  }
  const laptopScreen={x:245/1920,y:257/1440,w:1430/1920,h:927/1440};
  const mix=(a,b,t)=>a+(b-a)*t;
  function laptopLayout(w,h,zoom=0,reveal=1,mobile=w<=760) {
    const q=clamp(zoom,0,1),r=clamp(reveal,0,1);
    const fitWidth=Math.min(w-24,(h-120)*4/3,1440);
    // Frame the lower-right workspace instead of fitting the entire laptop.
    // The image and its HTML screen overlay share this continuous camera move.
    const zoomWidth=mobile?Math.max(w*1.9,Math.min(470,h*.58)/laptopScreen.h*4/3):Math.max(w*1.32,h*.92/laptopScreen.h*4/3);
    const start={w:fitWidth,x:(w-fitWidth)/2,y:(h-fitWidth*.75)/2-8};
    const end={w:zoomWidth,x:(mobile?w-16:w*.78)-zoomWidth*(laptopScreen.x+laptopScreen.w),y:h-(mobile?125:140)-zoomWidth*.75*(laptopScreen.y+laptopScreen.h)};
    const width=mix(start.w,end.w,q),lift=1-.04*(1-r);
    const image={x:mix(start.x,end.x,q)+(1-lift)*width/2,y:mix(start.y,end.y,q)+64*(1-r),w:width*lift,h:width*.75*lift};
    const screen={x:image.x+image.w*laptopScreen.x,y:image.y+image.h*laptopScreen.y,w:image.w*laptopScreen.w,h:image.h*laptopScreen.h};
    const x=Math.max(14,screen.x),y=Math.max(82,screen.y),right=Math.min(w-14,screen.x+screen.w),bottom=Math.min(h-94,screen.y+screen.h);
    return {image,screen,visible:{x,y,w:Math.max(1,right-x),h:Math.max(1,bottom-y)}};
  }
  function companionPose(frame,size,mobile=false,screenHeight=frame.h) {
    const edge=mobile?14:18,extent=clamp(screenHeight*.18,mobile?76:88,mobile?136:200);
    return {x:frame.x+frame.w-extent-edge,y:frame.y+frame.h-extent-edge,scale:extent/size};
  }
  function returnWeight(progress) {
    const t=clamp((progress-.34)/.38,0,1);
    return t*t*(3-2*t);
  }
  function companionPanel(actor,frame,width,height,mobile=false,previousSide=null) {
    const pad=12,gap=14,right=actor.x+actor.w+gap;
    // Extra clearance prevents repeated side changes near the fitting boundary.
    const clearance=previousSide==='left'?32:0;
    const side=right+width+clearance<=frame.x+frame.w-pad?'right':'left';
    const beside=side==='right'?right:actor.x-width-gap;
    const above=mobile&&width+actor.w+gap>frame.w-pad*2;
    return {side,x:clamp(beside,frame.x+pad,frame.x+frame.w-width-pad),y:clamp(above?actor.y-height-gap:actor.y+actor.h-height,frame.y+32,frame.y+frame.h-height-pad)};
  }
  function companionBounds(pose,frame,size) {
    return {minX:(frame.x+12-pose.x)/pose.scale,maxX:(frame.x+frame.w-12-pose.x)/pose.scale-size,minY:(frame.y+40-pose.y)/pose.scale,maxY:(frame.y+frame.h-12-pose.y)/pose.scale-size};
  }
  const api={clamp,geometry,dragBounds,chatPlacement,stickerBounds,laptopLayout,companionPose,companionPanel,companionBounds,returnWeight};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BitoScene=api;
})(globalThis);
