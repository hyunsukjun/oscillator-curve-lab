import {canvasAxisWidth} from './canvas-grid.js';
// Display-only imported recording. It is neither synthesis output nor a seek surface.
import {analyzeSourceColors} from './source-colors.js';
import {summarizeChannels,paintEnvelope,peakOf,paintToneLegend} from './source-envelope.js';
export function createSourceOverview(canvas){
  let buffer=null,lanes=[],colors=null;
  const panel=canvas.parentElement,ctx=canvas.getContext('2d');
  function draw(){
    if(!buffer||panel.hidden)return;
    const w=canvas.getBoundingClientRect().width,h=96,dpr=devicePixelRatio||1;
    if(w<=0)return;
    canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle='#191c20';ctx.fillRect(0,0,w,h);
    ctx.font='400 11px system-ui';ctx.fillStyle='#a9b1bb';ctx.textAlign='left';ctx.fillText('Source time',10,14);
    const hint='Original file · Not synthesis output';
    if(w>650)ctx.fillText(hint,110,14);
    paintToneLegend(ctx,w,12);
    const left=canvasAxisWidth,width=Math.max(1,w-left-10),peak=peakOf(lanes),step=w<600?2:4;
    ctx.strokeStyle='rgba(139,149,162,.18)';ctx.lineWidth=1;
    for(let i=0;i<=step;i++){const x=left+width*i/step;ctx.beginPath();ctx.moveTo(x,21);ctx.lineTo(x,77);ctx.stroke();
      const t=buffer.duration*i/step;ctx.fillStyle='#a9b1bb';ctx.textAlign=i===0?'left':i===step?'right':'center';ctx.fillText(`${Math.floor(t/60).toString().padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`,x,91);}
    lanes.forEach((lane,i)=>{const mid=lanes.length===1?49:i===0?35:64;paintEnvelope(ctx,lane,colors?.[i],left,width,mid,lanes.length===1?25:12,dpr,peak);ctx.fillStyle='#a9b1bb';ctx.textAlign='left';ctx.fillText(lanes.length===1?'MONO':i===0?'L':'R',10,mid+3);});
  }
  new ResizeObserver(draw).observe(canvas);
  return {setBuffer(next){
    try{buffer=next;colors=null;lanes=summarizeChannels(Array.from({length:Math.min(2,next.numberOfChannels)},(_,i)=>next.getChannelData(i)));panel.hidden=false;draw();
      analyzeSourceColors(next,result=>{if(buffer===next){colors=result;draw();}});
    }catch(error){panel.hidden=true;console.warn('Source overview unavailable',error);}
  }};
}
