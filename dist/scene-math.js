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
  const api={clamp,geometry,dragBounds,chatPlacement,stickerBounds};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BitoScene=api;
})(globalThis);
