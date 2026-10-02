import {renderFrame,createSmoothingState,clamp,edgeFade,TARGET_SAMPLE_RATE} from './oscillator-core.js?v=20261002-fixedpan1';
import {SpectrogramAnalysis} from './spectrogram-core.js?v=20260928-fft1';
import {LookaheadSafetyLimiter} from './safety-limiter.js?v=20261002-lookahead1';
self.onmessage=({data:settings})=>{try{
 if(settings.samples){const samples=settings.samples,rate=settings.sampleRate||TARGET_SAMPLE_RATE,length=samples[0].length;
  const analysis=new SpectrogramAnalysis(samples.length,length,rate),block=samples.map(()=>new Float32Array(512));let progress=-1;
  for(let p=0;p<length;p+=512){const count=Math.min(512,length-p);for(let c=0;c<samples.length;c++)block[c].set(samples[c].subarray(p,p+count));analysis.push(block,count);const value=Math.floor((p+count)/length*100);if(value>=progress+5){self.postMessage({progress:value});progress=value;}}
  const result=analysis.finish();self.postMessage({result},[result.data.buffer]);return;
 }
 const rate=TARGET_SAMPLE_RATE,duration=clamp(settings.durationSeconds||20,1,180),length=Math.ceil(rate*duration);
 const limiter=new LookaheadSafetyLimiter(rate),outputLength=length+limiter.ahead,analysis=new SpectrogramAnalysis(2,outputLength,rate),phases=new Float64Array(64),modPhases=new Float64Array(64),smoothing=createSmoothingState(),block=[new Float32Array(512),new Float32Array(512)];let progress=-1;
 for(let p=0;p<outputLength;p+=512){const count=Math.min(512,outputLength-p);for(let i=0;i<count;i++){const frame=p+i;let left=0,right=0;if(frame<length){const s=renderFrame(settings,frame/(duration*rate),rate,phases,modPhases,smoothing),fade=edgeFade(frame,length,rate);left=s.left*fade;right=s.right*fade;}const limited=limiter.process(left,right);block[0][i]=limited.left;block[1][i]=limited.right;}analysis.push(block,count);const value=Math.floor((p+count)/outputLength*100);if(value>=progress+5){self.postMessage({progress:value});progress=value;}}
 const result=analysis.finish();self.postMessage({result},[result.data.buffer]);
}catch(error){self.postMessage({error:error.message});}};
