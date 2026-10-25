import assert from 'node:assert/strict';
import test from 'node:test';
import {curveDefaults, normFromBaseFrequency, normFromSlopeDb, renderFrame, stackFrequencies, createSmoothingState} from '../src/oscillator-core.js';

const flat = y => [{x:0,y},{x:1,y}];
function settings(count, frequency=100) {
  const curves=Object.fromEntries(Object.entries(curveDefaults).map(([k,y])=>[k,flat(y)]));
  curves.basePitch=flat(normFromBaseFrequency(frequency));
  curves.slope=flat(normFromSlopeDb(0));
  return {soundMode:'oscillator',waveform:'sine',stack:'harmonic',count,modulationMode:'off',modulationRatio:1,durationSeconds:1,format:'stereo',curves};
}
function render(s,rate=48000) {
  const out=[new Float64Array(rate),new Float64Array(rate)],phases=new Float64Array(64),mods=new Float64Array(64),smooth=createSmoothingState();
  for(let i=0;i<rate;i++){const v=renderFrame(s,i/rate,rate,phases,mods,smooth);assert(Number.isFinite(v.left)&&Number.isFinite(v.right));out[0][i]=v.left;out[1][i]=v.right;}
  return out;
}
function amplitude(data,frequency,rate=48000) {
  let re=0,im=0;const begin=rate/10,end=rate*9/10;
  for(let i=begin;i<end;i++){const p=2*Math.PI*frequency*i/rate;re+=data[i]*Math.cos(p);im+=data[i]*Math.sin(p);}
  return 2*Math.hypot(re,im)/(end-begin);
}
test('eight harmonic output is equal L/R sample-by-sample across slope motion',()=>{
  const s=settings(8);s.curves.slope=[{x:0,y:0},{x:.5,y:1},{x:1,y:0}];
  const out=render(s);let max=0;for(let i=0;i<out[0].length;i++)max=Math.max(max,Math.abs(out[0][i]-out[1][i]));assert(max<1e-12);
});
test('actual 16-harmonic signal centers 1–8, sends 9/11/13/15 left and 10/12/14/16 right',()=>{
  const out=render(settings(16));
  for(let n=1;n<=16;n++){
    const l=amplitude(out[0],100*n),r=amplitude(out[1],100*n);
    if(n<=8){assert(l>.01);assert(Math.abs(l-r)<1e-10,`H${n} equal L/R`);}
    else {const active=n%2?l:r,other=n%2?r:l;assert(active>.01,`H${n} retained`);assert(other<1e-10,`H${n} excluded from opposite channel`);}
  }
});
test('Nyquist culling leaves surviving low harmonics centered, rather than redistributing them',()=>{
  const s=settings(16,4000);const voices=stackFrequencies(s,0,48000);assert.deepEqual(voices.map(v=>v.index),[0,1,2,3,4]);
  const out=render(s);for(let i=0;i<out[0].length;i++)assert(Math.abs(out[0][i]-out[1][i])<1e-12);
});
