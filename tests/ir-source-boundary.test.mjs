import assert from 'node:assert/strict';
import { test } from 'node:test';
import { irSourceReleaseGain } from '../src/ir-source-boundary.js';
import { boundaryGain } from '../src/playback-boundary.js';
import { curveDefaults, normFromBaseFrequency } from '../src/oscillator-core.js';

test('IR body release leaves dry output alone and avoids a second overlapping final fade', () => {
  for (const rate of [44100, 48000, 96000]) {
    const n = rate, span = Math.round(rate * .01);
    for (const tail of [0, 1, Math.round(rate * .003), span, rate]) {
      let previous = 1;
      for (let frame = 0; frame < n; frame++) {
        const gain = irSourceReleaseGain(frame, n, tail, rate);
        assert(Number.isFinite(gain) && gain >= 0 && gain <= 1 && gain <= previous + 1e-12);
        previous = gain;
        if (!tail) assert.equal(gain, 1);
        else {
          if (frame < n - 1 - span) assert.equal(gain, 1);
          if (frame === n - 1) assert.equal(gain, 0);
          if (frame >= span) assert(Math.abs(gain * boundaryGain(frame, n + tail, rate) - Math.min(1, (n - 1 - frame) / span)) < 1e-12);
        }
      }
    }
  }
});

test('the actual source processor closes wet IR excitation without moving the clock or dry prefix', async () => {
  let Source;
  globalThis.currentTime = 0;
  globalThis.AudioWorkletProcessor = class { constructor() { this.messages=[]; this.port={postMessage:m=>this.messages.push(m)}; } };
  globalThis.registerProcessor = (_, value) => { Source = value; };
  await import('../src/oscillator-worklet.js');
  const flat = y => [{x:0,y},{x:1,y}];
  for (const rate of [44100, 48000, 96000]) {
    globalThis.sampleRate = rate;
    const n = rate, tail = Math.round(rate * .3), settings = {soundMode:'convolution',waveform:'sine',count:1,stack:'harmonic',modulationMode:'off',durationSeconds:1,convolutionEnabled:true,convolutionWet:.5,tailSeconds:tail/rate,
      curves:{...Object.fromEntries(Object.entries(curveDefaults).map(([k,y])=>[k,flat(y)])),basePitch:flat(normFromBaseFrequency(997))}};
    const render = patch => {
      const p = new Source(); p.port.onmessage({data:{type:'settings',settings:{...settings,...patch}}}); p.port.onmessage({data:{type:'play',token:9}});
      const count = n + tail + Math.round(rate*.005) + 2, out = [new Float32Array(count),new Float32Array(count)]; p.process([], [out]);
      return {p,out};
    };
    const dry = render({convolutionWet:0}), wet = render({});
    assert(Math.abs(dry.out[0][n-1]) > .001, 'fixture exposes the previous hard body cutoff');
    for (let ch=0;ch<2;ch++) {
      assert(wet.out[ch][n-1] === 0);
      assert(wet.out[ch].subarray(n).every(v=>v===0), 'tail is owned by the external convolver');
      assert(wet.out[ch].subarray(0,n-Math.round(rate*.01)-1).every((v,i)=>v===dry.out[ch][i]));
    }
    assert.equal(wet.p.outputTime, dry.p.outputTime);
    assert.equal(wet.p.playing,false);
    assert(wet.p.messages.some(m=>m.type==='ended' && m.token===9));
  }
});
