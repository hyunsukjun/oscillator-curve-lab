import assert from 'node:assert/strict';
import {curveDefaults,normFromBaseFrequency} from '../src/oscillator-core.js';
import {renderOscillator} from '../src/offline-render.js';
import {SpectrogramAnalysis} from '../src/spectrogram-core.js';
let Processor;
globalThis.sampleRate=48000;globalThis.AudioWorkletProcessor=class {constructor(){this.port={postMessage(){}};}};globalThis.registerProcessor=(_,p)=>Processor=p;
await import('../src/oscillator-worklet.js');const Current=Processor;
let workerResult;globalThis.self={postMessage:data=>{if(data.result)workerResult=data.result;}};await import('../src/fft-worker.js');
const curves=Object.fromEntries(Object.entries(curveDefaults).map(([k,y])=>[k,[{x:0,y},{x:1,y}]]));curves.basePitch=[{x:0,y:normFromBaseFrequency(80)},{x:.2,y:normFromBaseFrequency(3000)},{x:.25,y:normFromBaseFrequency(110)},{x:1,y:normFromBaseFrequency(1500)}];
const rows=[];
for(const mode of ['off','fm','am','ring']){
 const settings={waveform:'sine',count:4,stack:'harmonic',modulationMode:mode,modulationRatio:1.5,durationSeconds:1,format:'stereo',curves};
 const make=C=>{const p=new C();p.port.onmessage({data:{type:'settings',settings}});p.port.onmessage({data:{type:'play'}});return p;};const a=make(Current),audio=[new Float32Array(48000),new Float32Array(48000)];
 for(let pos=0;pos<48000;pos+=128){const x=[new Float32Array(128),new Float32Array(128)];a.process([], [x]);for(let c=0;c<2;c++)audio[c].set(x[c].subarray(0,Math.min(128,48000-pos)),pos);}
 const rendered=await renderOscillator({settings}),wav=new DataView(await rendered.blob.arrayBuffer());let wavError=0;
 for(let i=0;i<48000;i++)for(let c=0;c<2;c++){const j=44+(i*2+c)*3;let v=wav.getUint8(j)|(wav.getUint8(j+1)<<8)|(wav.getUint8(j+2)<<16);if(v&0x800000)v-=0x1000000;wavError=Math.max(wavError,Math.abs(v/(v<0?0x800000:0x7fffff)-audio[c][i]));}assert(wavError<2e-7);
 self.onmessage({data:settings});const analysis=new SpectrogramAnalysis(2,48000,48000);analysis.push(audio);const expected=analysis.finish();let dbError=0;for(let i=0;i<expected.data.length;i++)dbError=Math.max(dbError,Math.abs(workerResult.data[i]-expected.data[i]));assert(dbError<.002);rows.push({mode,wavError,dbError});
}
console.log(rows);
