import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderOscillator} from '../src/offline-render.js';
import {curveDefaults,encodeWav24} from '../src/oscillator-core.js';
const curves=Object.fromEntries(Object.entries(curveDefaults).map(([k,y])=>[k,[{x:0,y},{x:1,y}]]));
for(const format of ['mono','stereo'])test(`WAV compensates latency without losing tail: ${format}`,async()=>{
const settings={waveform:'sine',count:4,stack:'harmonic',durationSeconds:1,format,curves};
const reference=await renderOscillator({settings,samplesOnly:true}),wav=await renderOscillator({settings});
assert.equal(reference.duration,1.005);assert.equal(wav.duration,1);
const expected=encodeWav24(reference.samples.map(c=>c.subarray(240)),48000);
assert.deepEqual(new Uint8Array(await wav.blob.arrayBuffer()),new Uint8Array(await expected.arrayBuffer()));
});
