import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=name=>{const m=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(m);return source.slice(m.index,source.indexOf('\n}',m.index)+2)};
for(const stage of ['engine','convolution','duplicate']){
 let release;const gate=new Promise(r=>release=r),messages=[];
 const c={isPlaying:false,soundMode:stage==='convolution'?'convolution':'oscillator',analysisResult:null,playbackToken:0,playheadSeconds:0,
 fftPreview:{cancel(){}},ensureAudio:async()=>{if(stage!=='convolution')await gate},installConvolver:async()=>{await gate;return {}},impulseBuffer48k:{},impulseSourceNative:null,convolver:null,
 audioContext:{currentTime:0},outputGain:{gain:{cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}}},node:{port:{postMessage:m=>messages.push(m)}},safetyLimiterNode:{port:{postMessage(){}}},settings:()=>({durationSeconds:20}),updateTransport(){},sendSettings(){},sendCurves(){},disconnectConvolver(){},updateConvolutionRouting(){},draw(){},alert:m=>{throw Error(m)}};
 vm.createContext(c);vm.runInContext(['nextPlaybackToken','play','stop'].map(pick).join('\n'),c);
 const pending=c.play();await Promise.resolve();await Promise.resolve();
 if(stage==='duplicate'){
  const second=c.play();release();await Promise.all([pending,second]);assert.equal(messages.filter(m=>m.type==='play').length,1,'two pending Play calls must start once');
 }else{
  c.stop();release();await pending;assert.equal(messages.filter(m=>m.type==='play').length,0,`${stage}: Stop must invalidate pending Play`);assert.equal(c.isPlaying,false);
  await c.play();assert.equal(messages.filter(m=>m.type==='play').length,1,'explicit retry must start');
 }
 console.log('PASS',stage);
}
