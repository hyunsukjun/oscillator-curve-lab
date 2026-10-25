// Actual source + final limiter/boundary Worklets versus offline PCM/WAV/FFT.
import assert from 'node:assert/strict';
import {curveDefaults,normFromBaseFrequency} from '../src/oscillator-core.js';
import {renderOscillator} from '../src/offline-render.js';
import {SpectrogramAnalysis} from '../src/spectrogram-core.js';
import {SAFETY_CEILING} from '../src/safety-limiter.js';
globalThis.sampleRate=48000;
globalThis.AudioWorkletProcessor=class {constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)};}};
const classes={};globalThis.registerProcessor=(name,p)=>classes[name]=p;
await import('../src/oscillator-worklet.js');await import('../src/safety-limiter-worklet.js');
let workerResult;globalThis.self={postMessage:data=>{if(data.result)workerResult=data.result;}};await import('../src/fft-worker.js');
const flat=y=>[{x:0,y},{x:1,y}];
const baseCurves=Object.fromEntries(Object.entries(curveDefaults).map(([k,y])=>[k,flat(y)]));
baseCurves.basePitch=[{x:0,y:normFromBaseFrequency(80)},{x:.2,y:normFromBaseFrequency(3000)},{x:.25,y:normFromBaseFrequency(110)},{x:1,y:normFromBaseFrequency(1500)}];
const rows=[];
for(const mode of ['off','fm','am','ring','harmonic16','fm-stress']){
 const stress=mode==='fm-stress';
 const curves=stress?{...baseCurves,deviation:flat(0),slope:flat(0),fmIndex:flat(0),basePitch:flat(normFromBaseFrequency(110))}:baseCurves;
 const settings={waveform:stress?'saw':'sine',count:stress||mode==='harmonic16'?16:8,stack:stress?'unison':'harmonic',modulationMode:mode==='harmonic16'?'off':stress?'fm':mode,modulationRatio:stress?8:1.5,durationSeconds:1,tailSeconds:0,format:'stereo',curves};
 const source=new classes['oscillator-curve-processor'](),limiter=new classes['oscillator-safety-limiter']();
 const send=(p,data)=>p.port.onmessage({data});send(source,{type:'settings',settings});send(source,{type:'play'});send(limiter,{type:'boundaryStart',seconds:1.005});
 const length=48240,audio=[new Float32Array(length),new Float32Array(length)];
 for(let pos=0;pos<length;pos+=128){const n=Math.min(128,length-pos),a=[new Float32Array(n),new Float32Array(n)],b=[new Float32Array(n),new Float32Array(n)];source.process([],[a]);limiter.process([a],[b]);for(let c=0;c<2;c++)audio[c].set(b[c],pos);}
 const pcm=(await renderOscillator({settings,samplesOnly:true})).samples;assert.equal(pcm[0].length,length);
 const rendered=await renderOscillator({settings}),wav=new DataView(await rendered.blob.arrayBuffer());
 assert.equal(wav.getUint32(24,true),48000);assert.equal(wav.getUint16(22,true),2);assert.equal(wav.getUint16(34,true),24);assert.equal(rendered.duration,1);
 let pcmError=0,wavError=0,peak=0;
 for(let c=0;c<2;c++)for(let i=0;i<length;i++){assert(Number.isFinite(audio[c][i]));peak=Math.max(peak,Math.abs(audio[c][i]));pcmError=Math.max(pcmError,Math.abs(pcm[c][i]-audio[c][i]));}
 for(let i=0;i<48000;i++)for(let c=0;c<2;c++){const j=44+(i*2+c)*3;let v=wav.getUint8(j)|(wav.getUint8(j+1)<<8)|(wav.getUint8(j+2)<<16);if(v&0x800000)v-=0x1000000;wavError=Math.max(wavError,Math.abs(v/(v<0?0x800000:0x7fffff)-audio[c][i+240]));}
 assert(pcmError<2e-6,`${mode} PCM ${pcmError}`);assert(wavError<2e-7,`${mode} WAV ${wavError}`);assert(peak<=SAFETY_CEILING+1e-6);
 assert(audio[0][240]===0);assert(audio[0].at(-1)===0);assert(source.messages.some(m=>m.type==='ended'));
 self.onmessage({data:settings});const analysis=new SpectrogramAnalysis(2,length,48000);analysis.push(audio);const expected=analysis.finish();let dbError=0;
 for(let i=0;i<expected.data.length;i++)dbError=Math.max(dbError,Math.abs(workerResult.data[i]-expected.data[i]));assert(dbError<.002,`${mode} FFT ${dbError}`);
 rows.push({mode,pcmError,wavError,dbError,peak,frames:48000});
}
console.log(JSON.stringify({pass:true,rows,diskWAVs:0},null,2));
