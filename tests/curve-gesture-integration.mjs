const lab="oscillator";
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as groupModel from '../src/curve-group-edit.js';
const clone=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
function balanced(s,start,open='{',close='}'){
 let depth=0,quote=null,comment=null;
 for(let i=start;i<s.length;i++){
  const c=s[i],n=s[i+1];
  if(comment==='line'){if(c==='\n')comment=null;continue;}
  if(comment==='block'){if(c==='*'&&n==='/'){comment=null;i++;}continue;}
  if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote=null;continue;}
  if(c==='/'&&n==='/'){comment='line';i++;continue;}if(c==='/'&&n==='*'){comment='block';i++;continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c===open)depth++;else if(c===close&&--depth===0)return i+1;
 }
 throw Error('Unbalanced source block');
}
function pick(s,name){const m=new RegExp('^(?:async )?function '+name+'\\(','m').exec(s);if(!m)return '';const start=s.indexOf('{',m.index);return s.slice(m.index,balanced(s,start));}
function colorKeys(s){if(lab==='space')return ['direction','distance','reverb'];const at=s.indexOf('const curveColors = {');const start=s.indexOf('{',at);return Object.keys(vm.runInNewContext('('+s.slice(start,balanced(s,start))+')'));}
const names=colorKeys(source);
let editor={};if(lab==='spectral')editor=await import('../src/curve-editor.js');
let routing={};if(lab==='spectral')routing=await import('../src/module-routing.js');
const ui=()=>{const classes=new Set();return{style:{},hidden:false,value:'',textContent:'',classList:{toggle(k,on){on?classes.add(k):classes.delete(k)},contains:k=>classes.has(k)},setAttribute(){},addEventListener(){},focus(){}}};
function create(s=source,platform='MacIntel'){
 const listeners={},keys={},capture=new Set(),messages=[];
 const canvas={...ui(),getBoundingClientRect:()=>({x:0,y:0,left:0,top:0,width:1064,height:500}),addEventListener:(type,callback)=>(listeners[type]??=[]).push(callback),setPointerCapture:id=>capture.add(id),hasPointerCapture:id=>capture.has(id),releasePointerCapture:id=>capture.delete(id)};
 const curves=Object.fromEntries(names.map(name=>[name,[{x:0,y:.45},{x:.25,y:.3},{x:.6,y:.6},{x:1,y:.8}]]));
 const c={...groupModel,...editor,...routing,Math,Set,Number,Object,Boolean,navigator:{platform},canvas,curveCanvas:canvas,canvasCssWidth:1064,canvasCssHeight:500,curveAxisWidth:64,axisWidth:64,parameterScaleWidth:64,plotRightPadding:8,plotPaddingTop:18,plotPaddingBottom:24,activeRadius:14,
  canvasSizes:{curve:{width:1064,height:500}},curves,editedCurves:Object.fromEntries(names.map(n=>[n,false])),activeCurve:names[0],selectedTool:'pen',selectedPoint:null,hoverPoint:null,hoveredPoint:null,dragging:false,curvePointerId:null,verticalDrag:null,shiftHeld:false,eraseModifierActive:false,
  effects:Object.fromEntries(['lowpass','highpass','bandpass','comb','flanger','chorus','delay'].map(n=>[n,{enabled:true}])),effectEnabled:{direction:true,distance:true,reverb:true},enabled:Object.fromEntries(names.map(n=>[n,true])),chainOrder:[...names],
  penTool:ui(),eraserTool:ui(),modeButtons:Object.fromEntries(names.map(n=>[n,ui()])),modulationCurveButton:ui(),modulationSelect:{value:'off'},modulationCurves:{fm:'fmIndex',am:'amDepth',ring:'ringMix'},modeReadout:ui(),buffer:{},resetDialog:{hidden:true},
  draw(){},drawAll(){},updateReadouts(){},currentTimeNorm:()=>0,irChanged(){},setExportStatus(){},markDownloadStale(){c.stale=(c.stale||0)+1},updateModuleUI(){},updateEffectButtons(){},syncEffectButtons(){},node:{port:{postMessage(m){messages.push(clone(m))}}},document:{querySelector:()=>ui()},window:{addEventListener(type,callback){(keys[type]??=[]).push(callback)}},getPlotBounds:()=>({left:64,width:992,height:500})};
 const functions=['valueAt','sortCurve','sendCurves','pointerToPoint','canvasPoint','pointerToScreenPosition','pointScreenPosition','bandWidthHalfHeight','findPointNearPointer','findPointNearScreen','isErasing','updateEraseCursor','updateToolCursor','getVerticalPoints','groupPointerY','beginCurveGroup','moveCurveGroup','finishCurveDrag','cancelCurvePointer','setTool','setActiveCurve','setHoverPoint'];
 if(lab==='timbre')functions.push('effectForCurve');
 if(lab==='space')functions.push('clamp','canvasToCurve','curveToCanvas','valueToY','directionValueFromCanvas','directionYFromValue','directionValue','findPoint','moveSelected','onPointerDown','onPointerMove','onPointerUp');
 if(lab==='oscillator')functions.push('findPoint','updatePoint','addPoint','curvePlotWidth','curvePlotHeight','curveToCanvasX','curveToCanvasY');
 vm.createContext(c);vm.runInContext(s.match(/const eraseModifier =[^;]+;/)[0]+'\n'+[...new Set(functions)].map(n=>pick(s,n)).filter(Boolean).join('\n'),c);
 // Extract actual registrations, without executing the app's audio/DOM startup.
 const target=lab==='space'?'curveCanvas':'canvas';const re=new RegExp('(?:'+target+'|window)\\.addEventListener\\("(?:pointerdown|pointermove|pointerup|pointercancel|lostpointercapture|pointerenter|pointerleave|keydown|keyup|blur)"','g');
 for(const m of s.matchAll(re)){const start=m.index,op=s.indexOf('(',start),end=balanced(s,op,'(',')'),part=s.slice(start,end)+';';if(part.startsWith('window.')&&!part.includes('finishCurveDrag'))continue;vm.runInContext(part,c);}
 function position(x,y,anchorX=x){
  if(lab==='timbre'){const p=c.pointScreenPosition(c.activeCurve,{x:anchorX,y});return{x:64+x*1000,y:p.y};}
  if(lab==='space')return c.curveToCanvas({x,y});
  if(lab==='oscillator')return{x:c.curveToCanvasX(x),y:c.curveToCanvasY(y)};
  return{x:64+x*992,y:(1-y)*500};
 }
 function pointer(type,x,y,extra={},anchorX=x){const p=position(x,y,anchorX),e={button:0,detail:1,pointerId:7,clientX:p.x,clientY:p.y,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};for(const f of listeners[type]||[])f(e);return e;}
 function key(type,extra={}){const e={shiftKey:false,altKey:false,ctrlKey:false,metaKey:false,key:'',preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...extra};for(const f of keys[type]||[]){f(e);if(e.stopped)break;}return e;}
 return{c,capture,messages,pointer,key,snapshot:()=>clone({curves:c.curves,edited:c.editedCurves})};
}
let parameterCases=0,cancelCases=0,baselineTraces=0;
if(lab==='timbre'||lab==='space'){const h=create(),before=h.snapshot();if(lab==='timbre'){h.c.effects[h.c.effectForCurve(h.c.activeCurve)].enabled=false;}else h.c.effectEnabled[h.c.activeCurve]=false;h.pointer('pointerdown',.25,.3,{shiftKey:true});assert.deepEqual(h.snapshot(),before);assert.equal(h.capture.size,0);}
if(lab==='spectral'){const h=create();h.c.enabled[h.c.activeCurve]=false;h.pointer('pointerdown',.25,.3,{shiftKey:true});h.pointer('pointermove',.9,.4,{shiftKey:true});assert.equal(h.c.enabled[h.c.activeCurve],false);assert.deepEqual(h.messages.at(-1).curve,[{x:0,y:.5},{x:1,y:.5}]);}
for(const name of names){
 let h=create();h.c.activeCurve=name;const before=h.snapshot(),points=before.curves[name];
 h.pointer('pointerdown',.25,.3,{shiftKey:true});assert(h.c.verticalDrag,name);assert.equal(h.c.verticalDrag.points.length,3);assert(!h.c.editedCurves[name]);assert.equal(h.messages.length,0);
 h.pointer('pointermove',.95,.4,{shiftKey:true},.25);
 h.c.curves[name].forEach((p,i)=>{assert.equal(p.x,points[i].x,name+' X');near(p.y,points[i].y+(i>=1?.1:0));});
 names.filter(n=>n!==name).forEach(n=>assert.deepEqual(clone(h.c.curves[n]),before.curves[n]));
 h.pointer('pointermove',.02,1,{shiftKey:true},.25);h.c.curves[name].forEach((p,i)=>near(p.y,points[i].y+(i>=1?.2:0)));
 h.pointer('pointermove',.99,.35,{shiftKey:true},.25);h.c.curves[name].forEach((p,i)=>near(p.y,points[i].y+(i>=1?.05:0)));
 const esc=h.key('keydown',{key:'Escape',shiftKey:true});assert(esc.prevented&&esc.stopped);assert.deepEqual(h.snapshot(),before);assert.equal(h.capture.size,0);
 h.pointer('pointerdown',.25,.3,{shiftKey:true});h.key('keyup',{key:'Shift'});h.pointer('pointermove',.95,.4,{},.25);h.pointer('pointerup',.95,.4,{},.25);h.c.curves[name].forEach((p,i)=>{assert.equal(p.x,points[i].x);near(p.y,points[i].y+(i>=1?.1:0));});assert.equal(h.capture.size,0);parameterCases++;
 for(const cancel of ['pointercancel','lostpointercapture','blur','mode','tool']){
  h=create();h.c.activeCurve=name;const b=h.snapshot();h.pointer('pointerdown',.25,.3,{shiftKey:true});h.pointer('pointermove',.95,.4,{shiftKey:true},.25);
  if(cancel==='blur')h.key('blur');else if(cancel==='mode')h.c.setActiveCurve(names.find(n=>n!==name));else if(cancel==='tool')h.c.setTool('eraser');else h.pointer(cancel,.25,.4,{shiftKey:true},.25);
  assert.deepEqual(h.snapshot(),b,name+' '+cancel);assert.equal(h.capture.size,0);assert.equal(h.c.verticalDrag,null);cancelCases++;
 }
}
for(const platform of ['MacIntel','Win32']){
 const h=create(source,platform),mod=platform==='MacIntel'?{altKey:true}:{ctrlKey:true};h.pointer('pointerdown',.25,.3,mod);assert.equal(h.c.curves[h.c.activeCurve].length,3);const before=h.snapshot();for(const p of [before.curves[h.c.activeCurve][0],before.curves[h.c.activeCurve].at(-1)])h.pointer('pointerdown',p.x,p.y,mod);assert.deepEqual(h.snapshot(),before);h.pointer('pointerdown',.4,.95,mod);assert.deepEqual(h.snapshot(),before);
}
{
 const h=create(),before=h.snapshot();h.pointer('pointerdown',.25,.3,{shiftKey:true});h.pointer('pointerup',.25,.3,{shiftKey:true});assert.deepEqual(h.snapshot(),before);assert.equal(h.messages.length,0);
 h.pointer('pointerdown',.44,.95,{shiftKey:true});assert.deepEqual(h.snapshot(),before);assert.equal(h.c.verticalDrag,null);
 h.pointer('pointerdown',.25,.3,{altKey:true,shiftKey:true});assert.equal(h.c.curves[h.c.activeCurve].length,3);assert.equal(h.c.verticalDrag,null);
}
function ordinaryTrace(s,name){const h=create(s);h.c.activeCurve=name;const rows=[];for(const [type,x,y] of [['pointerdown',.4,.7],['pointermove',.5,.65],['pointerup',.5,.65],['pointerdown',.5,.65],['pointermove',.9,.2],['pointerup',.9,.2]]){h.pointer(type,x,y);rows.push({model:h.snapshot(),messages:clone(h.messages)});}h.c.setTool('eraser');const p=h.c.curves[name][2];h.pointer('pointerdown',p.x,p.y);rows.push({model:h.snapshot(),messages:clone(h.messages)});return rows;}
const baselineIndex=process.argv.indexOf('--baseline');if(baselineIndex>=0){const before=readFileSync(process.argv[baselineIndex+1],'utf8');for(const name of names){assert.deepEqual(ordinaryTrace(source,name),ordinaryTrace(before,name),lab+' '+name+' baseline');baselineTraces+=7;}}
console.log(JSON.stringify({lab,passed:true,parameterCases,cancelCases,baselineTraces,scope:'Actual handler model and messages; no native/listening acceptance'}));
