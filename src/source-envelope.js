// Display-only signed extrema; never modify audio samples.
export function summarizeChannels(channels, buckets=16000) {
  return channels.map(channel=>{
    const count=Math.min(buckets,channel.length),peaks=new Float32Array(count);
    peaks.minimum=new Float32Array(count);peaks.maximum=new Float32Array(count);
    for(let i=0;i<count;i++){
      const start=Math.floor(i*channel.length/count),end=Math.floor((i+1)*channel.length/count);
      let lo=0,hi=0;for(let j=start;j<end;j++){lo=Math.min(lo,channel[j]);hi=Math.max(hi,channel[j]);}peaks[i]=Math.max(-lo,hi);peaks.minimum[i]=lo;peaks.maximum[i]=hi;
    }
    return peaks;
  });
}

import {toneColor} from './source-colors.js';
export function paintEnvelope(ctx,lane,spectrum,left,width,mid,amplitude,scale,referencePeak){
  if(!spectrum)return; // Wait for color analysis; no legacy waveform flash.
  if(!lane?.length)return;
  ctx.fillStyle='#8bc9ff';
  if(spectrum?.length){const gradient=ctx.createLinearGradient(left,0,left+width,0),n=Math.max(2,Math.min(256,spectrum.length));
    for(let i=0;i<n;i++){const t=i/(n-1);gradient.addColorStop(t,toneColor(spectrum[Math.min(spectrum.length-1,Math.floor(t*spectrum.length))]));}ctx.fillStyle=gradient;}
  const columns=Math.max(1,Math.ceil(width*scale)),hi=new Float32Array(columns),lo=new Float32Array(columns),gain=amplitude/Math.max(.00001,referencePeak);
  for(let x=0;x<columns;x++){const a=Math.floor(x/columns*lane.length),b=Math.min(lane.length,Math.max(a+1,Math.ceil((x+1)/columns*lane.length)));let mn=0,mx=0;for(let i=a;i<b;i++){mn=Math.min(mn,lane.minimum[i]);mx=Math.max(mx,lane.maximum[i]);}hi[x]=mid-mx*gain;lo[x]=mid-mn*gain;}
  ctx.beginPath();ctx.moveTo(left,mid);for(let x=0;x<columns;x++)ctx.lineTo(left+(x+.5)*width/columns,hi[x]);for(let x=columns-1;x>=0;x--)ctx.lineTo(left+(x+.5)*width/columns,lo[x]);ctx.closePath();ctx.fill();
}
export function peakOf(lanes){let peak=.00001;for(const lane of lanes)for(const p of lane)peak=Math.max(peak,p);return peak;}
export function paintToneLegend(ctx,width,y=12){if(width<460)return;const g=ctx.createLinearGradient(width-66,0,width-8,0);g.addColorStop(0,toneColor(150));g.addColorStop(.5,toneColor(1100));g.addColorStop(1,toneColor(8000));ctx.save();ctx.fillStyle=g;ctx.fillRect(width-66,y-3,58,5);ctx.fillStyle='#a9b1bb';ctx.font='11px system-ui,sans-serif';ctx.textBaseline='middle';ctx.textAlign='right';ctx.fillText('Source tone',width-72,y);ctx.restore();}
