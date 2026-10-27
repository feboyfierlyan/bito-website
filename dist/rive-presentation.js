/* Present only complete transparent Bito frames, never the runtime's loading surface. */
(function(root){
  function isBitoFrame({data,width,height}){
    if(!data||width<4||height<4)return false;
    let edge=0,clearEdge=0,solid=0,green=0,cream=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4,r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
      if(x===0||y===0||x===width-1||y===height-1){edge++;if(a<12)clearEdge++;}
      if(a<90)continue;
      solid++;
      if(g>65&&g>r*1.08&&g>b*1.08)green++;
      if(r>205&&g>190&&b>120&&r>=g-8&&g>b+8)cream++;
    }
    const pixels=width*height;
    return clearEdge/edge>.96&&solid>pixels*.035&&solid<pixels*.65&&green>pixels*.012&&cream>pixels*.004;
  }
  function createPresenter({canvas,buffer,art,sample,requestFrame,cancelFrame,onReady=()=>{}}){
    // A small readback avoids reading the full Retina surface on every animation frame.
    sample.width=sample.height=32;
    const probe=sample.getContext('2d',{alpha:true,willReadFrequently:true});
    const output=canvas.getContext('2d',{alpha:true});
    let pending=0,streak=0,ready=false,disposed=false;
    function present(){
      pending=0;if(disposed||!probe||!output||!buffer.width||!buffer.height)return;
      try{
        probe.clearRect(0,0,32,32);probe.drawImage(buffer,0,0,32,32);
        if(!isBitoFrame(probe.getImageData(0,0,32,32))){streak=0;return;}
        if(!ready&&++streak<2){request();return;}
        // Resize only after a valid replacement is available, then copy in the same task.
        // Invalid/empty/context-loss frames leave the last complete frame untouched.
        if(canvas.width!==buffer.width)canvas.width=buffer.width;
        if(canvas.height!==buffer.height)canvas.height=buffer.height;
        output.clearRect(0,0,canvas.width,canvas.height);output.drawImage(buffer,0,0);
        if(!ready){ready=true;art.classList.add('ready');onReady();}
      }catch{/* Keep the poster or the last valid frame if the renderer is unavailable. */}
    }
    function request(){if(!disposed&&!pending)pending=requestFrame(present);}
    return {request,dispose(){disposed=true;cancelFrame(pending);pending=0;},get ready(){return ready;}};
  }
  const api={isBitoFrame,createPresenter};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BitoPresentation=api;
})(globalThis);
