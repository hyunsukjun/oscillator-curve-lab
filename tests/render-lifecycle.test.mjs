import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderOscillator} from '../src/offline-render.js';
import {curveDefaults} from '../src/oscillator-core.js';
const settings = () => ({waveform:'saw',count:4,stack:'unison',durationSeconds:1,format:'stereo',curves:Object.fromEntries(Object.entries(curveDefaults).map(([k,y])=>[k,[{x:0,y},{x:1,y}]]))});
test('render snapshots settings across cooperative yields',async()=>{
 const input=settings();const expected=await renderOscillator({settings:input});let changed=false;
 const actual=await renderOscillator({settings:input,onProgress:()=>{if(!changed){changed=true;input.curves.basePitch[0].y=1;input.waveform='square';}}});
 assert(changed);assert.deepEqual(new Uint8Array(await actual.blob.arrayBuffer()),new Uint8Array(await expected.blob.arrayBuffer()));
});
test('abort at a yield produces no result and the next render recovers',async()=>{
 const controller=new AbortController();let completed=false;
 await assert.rejects(renderOscillator({settings:settings(),signal:controller.signal,onProgress:p=>{if(p===1)completed=true;else controller.abort();}}),{name:'AbortError'});
 assert.equal(completed,false);assert.equal((await renderOscillator({settings:settings()})).duration,1);
});
