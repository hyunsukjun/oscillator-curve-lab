export function createFFTPreview({getSettings,isBusy,renderProcessed}){
 const toggle=document.getElementById('sonogramToggle'),panel=document.getElementById('fftPanel'),button=document.getElementById('fftUpdate'),status=document.getElementById('fftStatus'),canvas=document.getElementById('fftCanvas');
 let worker=null,renderAbort=null,generation=0,signature=JSON.stringify(getSettings()),result=null,image=null,stale=true;
 function cancel(message='Analysis cancelled · Update to refresh'){generation++;if(worker||renderAbort){worker?.terminate();worker=null;renderAbort?.abort();renderAbort=null;status.textContent=message;button.textContent='Update preview';}}
 function invalidate(){const next=JSON.stringify(getSettings());if(next===signature)return;signature=next;cancel();stale=true;status.textContent='Update needed';draw();}
 function draw(){if(panel.hidden)return;const width=Math.max(280,canvas.clientWidth),height=260,scale=window.devicePixelRatio||1;canvas.width=Math.round(width*scale);canvas.height=height*scale;const cx=canvas.getContext('2d');cx.setTransform(scale,0,0,scale,0,0);cx.fillStyle='#10191f';cx.fillRect(0,0,width,height);const left=45,top=12,w=width-left-12,h=height-top-30;
  if(image){cx.globalAlpha=stale?.45:1;cx.drawImage(image,left,top,w,h);cx.globalAlpha=1;}
  cx.font='10px system-ui';cx.textAlign='right';cx.fillStyle='#c4d1d4';for(const hz of [20,100,500,1000,5000,20000]){const y=top+h*(1-Math.log(hz/20)/Math.log(1000));cx.fillText(hz>=1000?`${hz/1000}k`:String(hz),left-6,Math.max(10,y+3));cx.strokeStyle='#ffffff18';cx.beginPath();cx.moveTo(left,y);cx.lineTo(left+w,y);cx.stroke();}
  cx.textAlign='center';for(let i=0;i<=4;i++)cx.fillText(`${((result?.duration||getSettings().durationSeconds)*i/4).toFixed(1)}s`,left+w*i/4,height-8);
  if(!image||stale){cx.fillStyle='#edf3f2';cx.fillText(image?'Previous result · Update needed':'Update preview to view',left+w/2,top+h/2);}
 }
 function update(){if(worker||renderAbort){cancel();return;}if(isBusy()){status.textContent='Stop playback or finish export before updating';return;}const job=++generation;status.textContent='Analysing 0%';button.textContent='Cancel analysis';try{worker=new Worker(new URL('./fft-worker.js?v=20260929-axis-fade1',import.meta.url),{type:'module'});
  worker.onmessage=({data})=>{if(job!==generation)return;if(data.progress!=null){status.textContent=`Analysing ${data.progress}%`;return;}cancel();if(data.error){status.textContent=`Analysis failed: ${data.error}`;return;}result=data.result;image=document.createElement('canvas');image.width=result.width;image.height=result.height;const ctx=image.getContext('2d'),pixels=ctx.createImageData(image.width,image.height);for(let i=0;i<result.data.length;i++){const v=(result.data[i]+90)/90,o=i*4;pixels.data[o]=12+238*v*v;pixels.data[o+1]=19+216*v;pixels.data[o+2]=26+130*Math.sin(v*Math.PI);pixels.data[o+3]=255;}ctx.putImageData(pixels,0,0);stale=false;status.textContent='Current settings · 48 kHz output · 2048 FFT';draw();};
  worker.onerror=e=>{if(job!==generation)return;cancel();status.textContent=`Analysis failed: ${e.message}`;};
  const current=getSettings();
  if(current.convolutionEnabled && current.convolutionWet>0){
    renderAbort=new AbortController();
    renderProcessed(renderAbort.signal,p=>{if(job===generation)status.textContent=`Rendering output ${Math.round(p*100)}%`;})
      .then(samples=>{if(job!==generation)return;renderAbort=null;status.textContent='Analysing output';worker.postMessage({samples,sampleRate:48000},samples.map(channel=>channel.buffer));})
      .catch(error=>{if(job!==generation)return;cancel();status.textContent=`Analysis failed: ${error.message}`;});
  }else worker.postMessage(structuredClone(current));
 }catch(e){cancel();status.textContent=`Analysis failed: ${e.message}`;}}
 toggle.addEventListener('change',()=>{panel.hidden=!toggle.checked;if(panel.hidden)cancel();else{draw();if(!image)update();}});button.addEventListener('click',update);new ResizeObserver(draw).observe(panel);return {invalidate,cancel};
}
