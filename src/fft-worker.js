import {renderFrame,clamp,edgeFade,TARGET_SAMPLE_RATE} from './oscillator-core.js?v=20260929-edge-fade1';
import {SpectrogramAnalysis} from './spectrogram-core.js?v=20260928-fft1';
self.onmessage=({data:settings})=>{try{
 if(settings.samples){const samples=settings.samples,rate=settings.sampleRate||TARGET_SAMPLE_RATE,length=samples[0].length;
  const analysis=new SpectrogramAnalysis(samples.length,length,rate),block=samples.map(()=>new Float32Array(512));let progress=-1;
  for(let p=0;p<length;p+=512){const count=Math.min(512,length-p);for(let c=0;c<samples.length;c++)block[c].set(samples[c].subarray(p,p+count));analysis.push(block,count);const value=Math.floor((p+count)/length*100);if(value>=progress+5){self.postMessage({progress:value});progress=value;}}
  const result=analysis.finish();self.postMessage({result},[result.data.buffer]);return;
 }
 const rate=TARGET_SAMPLE_RATE,duration=clamp(settings.durationSeconds||20,1,180),length=Math.ceil(rate*duration);
 const analysis=new SpectrogramAnalysis(2,length,rate),phases=new Float64Array(64),modPhases=new Float64Array(64),block=[new Float32Array(512),new Float32Array(512)];let progress=-1;
 for(let p=0;p<length;p+=512){const count=Math.min(512,length-p);for(let i=0;i<count;i++){const s=renderFrame(settings,(p+i)/(duration*rate),rate,phases,modPhases),fade=edgeFade(p+i,length,rate);block[0][i]=s.left*fade;block[1][i]=s.right*fade;}analysis.push(block,count);const value=Math.floor((p+count)/length*100);if(value>=progress+5){self.postMessage({progress:value});progress=value;}}
 const result=analysis.finish();self.postMessage({result},[result.data.buffer]);
}catch(error){self.postMessage({error:error.message});}};
