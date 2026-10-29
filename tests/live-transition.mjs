import assert from 'node:assert/strict';
import {curveDefaults, normFromBaseFrequency, renderFrame} from '../src/oscillator-core.js';
globalThis.sampleRate = 48000;
globalThis.currentTime = 0;
const classes = {};
globalThis.registerProcessor = (name, value) => classes[name] = value;
globalThis.AudioWorkletProcessor = class {constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)};}};
await import('../src/oscillator-worklet.js');
await import('../src/safety-limiter-worklet.js');
const Source = classes['oscillator-curve-processor'], Limiter = classes['oscillator-safety-limiter'];
const flat = y => [{x:0,y},{x:1,y}];
const base = {soundMode:'convolution',waveform:'sine',count:4,stack:'harmonic',modulationMode:'off',modulationRatio:1,durationSeconds:2,tailSeconds:.3,
  curves:{...Object.fromEntries(Object.entries(curveDefaults).map(([k,v])=>[k,flat(v)])),basePitch:flat(normFromBaseFrequency(440))}};
const send=(p,data)=>p.port.onmessage({data});
const process=(p,n)=>{const out=[new Float32Array(n),new Float32Array(n)];p.process([],[out]);return out;};
const create=settings=>{const p=new Source();send(p,{type:'settings',settings});send(p,{type:'play',token:1});process(p,2048);return p;};
const clone=p=>({settings:{...p.settings},seconds:p.outputTime,phases:p.phases.slice(),mods:p.modPhases.slice(),smooth:structuredClone(p.smoothingState)});
function sample(b,rate){const v=renderFrame(b.settings,b.seconds/b.settings.durationSeconds,rate,b.phases,b.mods,b.smooth);b.seconds+=1/rate;return v;}
let cases=0;
for(const rate of [44100,48000,96000])for(const patch of [{waveform:'saw'},{waveform:'square'},{waveform:'triangle'},{count:1},{count:16},{stack:'unison'},{stack:'odd'},{stack:'multiplier'}]){
 globalThis.sampleRate=rate;
 const p=create(base),old=clone(p),next=clone(p);next.settings={...next.settings,...patch};const beforeTime=p.outputTime;
 send(p,{type:'settings',settings:{...base,...patch}});const n=Math.round(rate*.01),actual=process(p,n+2);
 for(let i=0;i<n+2;i++){
  const a=sample(old,rate),b=sample(next,rate),u=Math.min(1,i/(n-1));
  for(const [ch,key]of[[0,'left'],[1,'right']])assert(Math.abs(actual[ch][i]-(a[key]*(1-u)+b[key]*u))<6e-8,'linear old/new bank crossfade with preserved phases');
 }
 assert(Math.abs(p.outputTime-beforeTime-(n+2)/rate)<1e-11,'settings do not reset/extend timeline');
 assert.equal(p.transition,null);assert.equal(p.queuedSettings,null);cases++;
}
globalThis.sampleRate=48000;
{
 const p=create(base),time=p.outputTime;
 send(p,{type:'settings',settings:{...base,waveform:'saw'}});process(p,100);
 for(let i=0;i<50;i++)send(p,{type:'settings',settings:{...base,count:i%2?16:1,stack:'odd'}});
 process(p,1000);assert.equal(p.settings.count,16);assert.equal(p.settings.stack,'odd');assert.equal(p.transition,null);assert.equal(p.queuedSettings,null);
 assert(Math.abs(p.outputTime-time-1100/48000)<1e-11);
}
{
 const p=create(base),old=clone(p);globalThis.currentTime=3;
 send(p,{type:'seek',seconds:0,crossfade:true,token:2});const actual=process(p,480);
 const first=sample(old,48000);assert(Math.abs(actual[0][0]-first.left)<3e-8,'live seek begins with continuous old signal');
 assert(Math.abs(p.outputTime-.01)<1e-12);const ack=p.messages.find(m=>m.type==='seeked');assert.equal(ack.token,2);assert.equal(ack.contextTime,3);assert.equal(ack.seconds,0);assert.equal(ack.endTime,5.305);
}
{
 const p=create(base);send(p,{type:'settings',settings:{...base,waveform:'square'}});process(p,100);
 send(p,{type:'seek',seconds:.3,crossfade:true,token:3});send(p,{type:'seek',seconds:0,crossfade:true,token:4});process(p,1000);
 const acks=p.messages.filter(m=>m.type==='seeked');assert.equal(acks.length,1);assert.equal(acks[0].token,4);assert.equal(acks[0].seconds,0);assert.equal(p.queuedSeek,null);
 send(p,{type:'settings',settings:{...base,count:16}});send(p,{type:'stop',reset:true,token:5});assert.equal(p.transition,null);assert.equal(p.queuedSettings,null);assert.equal(p.settings.count,16);assert.equal(p.playing,false);
}
const constant=(p,n=128)=>{const out=[new Float32Array(n),new Float32Array(n)];p.process([[new Float32Array(n).fill(.3),new Float32Array(n).fill(.3)]],[out]);return out[0];};
{
 const p=new Limiter();send(p,{type:'boundaryStart',seconds:20});constant(p,2048);const before=p.limiter.sample;
 globalThis.currentTime=1;send(p,{type:'boundarySeek',endTime:4});assert.equal(p.remaining,144000);assert.equal(p.limiter.sample,before,'no lookahead reset/gap');
 assert(constant(p,512).every(v=>Math.abs(v-.3)<2e-8));
  p.remaining=100;constant(p,20);const low=p.boundary.gain;
  send(p,{type:'boundarySeek',endTime:4});const first=constant(p,1)[0];assert(Math.abs(first-.3*low)<2e-8,'rewind during the final release holds current gain before recovering');
 send(p,{type:'boundaryPause',id:7});constant(p,100);const age=p.boundary.releaseAge;send(p,{type:'boundarySeek',endTime:5});assert.equal(p.boundary.releaseAge,age,'seek cannot cancel pause release');
 const tail=constant(p,600);assert(tail.slice(381).every(v=>v===0));assert(p.messages.some(m=>m.type==='boundaryPaused'&&m.id===7));
}
console.log(`PASS ${cases} rate/bank transitions; phase/time retention, bounded latest queue, continuous live seek, absolute end clock and pause/limiter history`);
