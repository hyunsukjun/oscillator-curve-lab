import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const pick=name=>{const m=new RegExp(`(?:async )?function ${name}\\(`).exec(source);assert.ok(m);return source.slice(m.index,source.indexOf('\n}',m.index)+2)};
const fileStart=source.indexOf('impulseInput.addEventListener("change", async () => {');
const fileCode=source.slice(fileStart,source.indexOf('\n});',fileStart)+4);
for(const action of ['mode','analysis','failed-file','cancel-chooser','oversized-file']){
 let release;const gate=new Promise(r=>release=r),messages=[];let handler;
 const ui=()=>({value:'0',classList:{toggle(){}},setAttribute(){}});
 const c={LOOKAHEAD_SECONDS:.005,verticalDrag:null,defaultResynthesisRequest:null,resynthesisSource:{textContent:'previous.wav'},
 irControl:{phase:'idle',epoch:0,snapshot:null,pending:null,note:''},
 sourceLoadGate:{begin:()=>({signal:undefined,current:()=>true}),cancel(){}},readAudioFile:file=>file.arrayBuffer(),
 isPlaying:false,soundMode:'oscillator',analysisResult:{},playbackToken:0,playheadSeconds:0,
 fftPreview:{cancel(){}},ensureAudio:async()=>gate,impulseBuffer48k:{},convolver:null,
 audioContext:{currentTime:0},outputGain:{gain:{cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(){}}},node:{port:{postMessage:m=>messages.push(m)}},safetyLimiterNode:{port:{postMessage(){}}},settings:()=>({durationSeconds:20}),updateTransport(){},sendSettings(){},sendCurves(){},disconnectConvolver(){},updateConvolutionRouting(){},draw(){},alert:m=>{throw Error(m)},
 oscillatorState:{curves:{},editedCurves:{}},resynthesisState:{curves:{},editedCurves:{}},modulationCurves:{},activeCurve:'basePitch',setActiveCurve(){},ensureResynthesisState(){},readouts:{safety:{}},analysisSamples:new Float32Array(8),analysisWorker:null,analysisGeneration:0,analysisSource:{},TARGET_SAMPLE_RATE:48000,URL,
 Worker:class{terminate(){}postMessage(){}},MAX_IR_FILE_BYTES:16e6,console:{error(){}},OfflineAudioContext:class{async decodeAudioData(){throw Error('corrupt fixture')}},
 impulseInput:{files:[],value:'',addEventListener:(event,fn)=>handler=fn}};
 for(const key of ['oscillatorModeButton','resynthesisModeButton','convolutionButton','oscillatorControls','resynthesisControls','impulseStatus','convolutionControls','modulationInfo','modulationCurveButton','modulationSelect','openAudioButton','analysisStatus','analyzeButton','partialCountSelect','impulseLengthInput'])c[key]=ui();
 vm.createContext(c);vm.runInContext(['nextPlaybackToken','irBusy','irForget','play','stop','setSoundMode','runResynthesisAnalysis'].map(pick).join('\n').replaceAll('import.meta.url',JSON.stringify(import.meta.url))+'\n'+fileCode,c);
 const pending=c.play();await Promise.resolve();
 if(action==='mode')c.setSoundMode('resynthesis');
 else if(action==='analysis')await c.runResynthesisAnalysis();
 else {c.impulseInput.files=action==='cancel-chooser'?[]:[{name:'test.wav',size:action==='oversized-file'?17e6:8,arrayBuffer:async()=>new ArrayBuffer(8)}];await handler();}
 release();await pending;
 const preserve=['cancel-chooser','oversized-file'].includes(action);
 assert.equal(messages.filter(m=>m.type==='play').length,preserve?1:0,action+' pending Play policy');
 if(action==='failed-file')assert.match(c.impulseStatus.textContent,/Previous audio remains available/);
 console.log('PASS',action);
}
