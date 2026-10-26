import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=name=>{
 const start=code.indexOf(`function ${name}(`);
 assert(start>=0,name);
 return code.slice(start,code.indexOf('\n}',start)+2);
};
const element=()=>({attrs:{},style:{},value:'0',disabled:false,setAttribute(k,v){this.attrs[k]=v;}});
function harness(duration=20,tail=0){
 const calls=[],snapshot={retained:true};
 const c={Math,Number,String,LOOKAHEAD_SECONDS:.005,
  current:{durationSeconds:duration,tailSeconds:tail},settings(){return c.current;},
  playheadSeconds:0,isPlaying:false,isScrubbing:false,soundMode:'convolution',analysisResult:null,
  irControl:{phase:'idle',snapshot:null,note:''},irBusy(){return ['pausing','resuming'].includes(c.irControl.phase);},
  playButton:element(),stopButton:element(),downloadButton:element(),timeStatus:element(),playbackScrubber:element(),renderAbortController:null,
  node:{port:{postMessage(m){calls.push(['node',m]);}}},safetyLimiterNode:{port:{postMessage(m){calls.push(['limiter',m]);}}},
  nextPlaybackToken(){return 11;},draw(){calls.push(['draw']);},
  stop(reset){calls.push(['stop',reset]);c.irControl.snapshot=null;c.irControl.phase='idle';c.isPlaying=false;c.playheadSeconds=0;}
 };
 vm.createContext(c);
 vm.runInContext(['outputDuration','formatClock','transportState','transportFailure','transportDescription','updateTransport','seekSourceSeconds','seekFromScrubber'].map(pick).join('\n'),c);
 return {c,calls,snapshot};
}

for(const [duration,tail,position,clock] of [
 [20,0,0,'00:00.00 / 00:20.01'],[20,0,10,'00:10.00 / 00:20.01'],
 [2,3,1,'00:01.00 / 00:05.01'],[2,3,3.5,'00:03.50 / 00:05.01'],
 [600,30,620,'10:20.00 / 10:30.01'],[0,30,0,'00:00.00 / 00:00.00']
]){
 const {c}=harness(duration,tail);c.playheadSeconds=position;c.updateTransport();
 assert.equal(c.timeStatus.textContent,clock);
 const state=c.transportState();
 assert.equal(state.duration,c.outputDuration());
 assert.equal(state.seconds,Math.min(position,state.duration));
 assert.equal(Number(c.playbackScrubber.value),state.duration?state.seconds/state.duration:0);
 assert.equal(c.playbackScrubber.attrs['aria-label'],'Output playback position');
 assert.equal(c.playButton.attrs['aria-label'],'Play');
 assert(!/[가-힣]/.test(c.timeStatus.textContent+c.timeStatus.title+JSON.stringify(c.playbackScrubber.attrs)));
 if(!duration)assert(c.playButton.disabled);
}
console.log('PASS shared clock format and output-progress basis through dry/body/tail/zero/long duration');

{
 const {c,calls}=harness(2,3);c.isPlaying=true;c.playbackScrubber.value='0.2';
 assert(c.seekFromScrubber());
 assert(Math.abs(c.playheadSeconds-1.001)<1e-12);
 assert(c.isPlaying);
 assert.equal(calls.filter(x=>x[0]==='stop').length,0);
 assert(Math.abs(calls.find(x=>x[0]==='node')[1].seconds-1.001)<1e-12);
}
{
 const {c,calls,snapshot}=harness(2,3);c.playheadSeconds=3.5;c.irControl.phase='pausedRetained';c.irControl.snapshot=snapshot;c.isScrubbing=true;c.playbackScrubber.value='0.8';
 assert.equal(c.seekFromScrubber(),false);
 assert.equal(c.playheadSeconds,3.5);assert.equal(c.irControl.snapshot,snapshot);assert.equal(c.irControl.phase,'pausedRetained');
 assert.equal(calls.length,0);assert.equal(Number(c.playbackScrubber.value),3.5/5.005);
 assert.match(c.timeStatus.title,/IR tail seeking is unavailable/);
 assert.equal(c.timeStatus.textContent,'00:03.50 / 00:05.01');
}
{
 const {c,calls}=harness();c.playbackScrubber.value='1';
 assert(c.seekFromScrubber());assert.equal(c.playheadSeconds,20);
 assert.deepEqual(calls[0],['stop',true]);assert.equal(c.playButton.title,'Play from start · Space');
}
console.log('PASS output-time pointer mapping, playing source seek, tail rejection retains history, dry endpoint');

for(const phase of ['pausing','resuming']){
 const {c}=harness(2,3);c.irControl.phase=phase;c.updateTransport();
 assert(c.playButton.disabled);assert(c.playbackScrubber.disabled);assert(c.downloadButton.disabled);
 assert.match(c.timeStatus.title,phase==='pausing'?/Pausing/:/Resuming/);
}
{
 const {c}=harness();c.soundMode='resynthesis';c.updateTransport();assert(c.playButton.disabled);assert(c.playbackScrubber.disabled);
 c.analysisResult={};c.updateTransport();assert(!c.playButton.disabled);
 c.renderAbortController={signal:{aborted:false}};assert(c.transportState().disabled);
 c.irControl.note='재개 실패 · 정지';c.updateTransport();assert.match(c.timeStatus.title,/Resume failed/);
 assert.match(c.timeStatus.textContent,/ · Resume failed$/);assert.equal(c.timeStatus.style.whiteSpace,'normal');
 c.irControl.note='';c.updateTransport();assert.equal(c.timeStatus.textContent,'00:00.00 / 00:20.01');assert.equal(c.timeStatus.style.whiteSpace,'');
}
console.log('PASS transition/analysis/render guards and English status help without a second visible clock');
