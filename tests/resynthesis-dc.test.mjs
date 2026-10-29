import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeSpectrum } from '../src/resynthesis-analysis.js';

test('silence, constant DC and tiny AC cannot become a normalized audible bank', () => {
  for (const rate of [44100,48000,96000]) for (const length of [64,127,4096,8192,rate]) for (const count of [32,64]) for (const offset of [0,.9,-.9]) {
    const samples = new Float32Array(length).fill(offset), copy = samples.slice();
    assert.throws(()=>analyzeSpectrum(samples,rate,count),/no analyzable signal/);
    assert.deepEqual(samples,copy);
  }
  for (const length of [2400,4800,48000]) {
    const weak = Float32Array.from({length},(_,i)=>.9+1e-7*Math.sin(2*Math.PI*997*i/48000));
    assert.throws(()=>analyzeSpectrum(weak,48000,64),/no analyzable signal/);
  }
});

test('DC-biased valid AC, short sources, broadband noise and finite hot material remain analyzable', () => {
  for (const length of [2400,4800,48000]) for (const offset of [0,.9,-.9]) {
    const samples = Float32Array.from({length},(_,i)=>offset+.2*Math.sin(2*Math.PI*997*i/48000)), copy = samples.slice();
    const result=analyzeSpectrum(samples,48000,64);
    assert(result.partials.some(p=>Math.abs(p.frequency-997)<3));
    assert.deepEqual(samples,copy);
  }
  for (const kind of ['noise','clipped','hot']) {
    let seed=17;
    const samples=Float32Array.from({length:48000},(_,i)=>{seed=(seed*1664525+1013904223)>>>0;return kind==='noise'?.2*(seed/2**31-1):kind==='hot'?4*Math.sin(i*.13):Math.max(-.4,Math.min(.4,2*Math.sin(i*.13)));});
    assert(analyzeSpectrum(samples,48000,64).partialCount>0);
  }
  const outOfBand=Float32Array.from({length:48000},(_,i)=>.8*Math.sin(2*Math.PI*23000*i/48000));
  assert.throws(()=>analyzeSpectrum(outOfBand,48000,64),/no analyzable signal/);
});
