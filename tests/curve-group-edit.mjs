import assert from 'node:assert/strict';
import {beginVerticalGroup,moveVerticalGroup,restoreVerticalGroup,verticalGroupSuffix,drawVerticalGroupRing} from '../src/curve-group-edit.js';
const clone=x=>JSON.parse(JSON.stringify(x)),near=(a,b)=>assert(Math.abs(a-b)<1e-12);
let cases=0;
for(const index of [0,1,3]){
 const curve=[{x:0,y:.45},{x:.25,y:.3},{x:.6,y:.6},{x:1,y:.8}],before=clone(curve);
 const group=beginVerticalGroup(curve,index,.31);assert(!group.changed);assert(!moveVerticalGroup(group,.31));
 assert(moveVerticalGroup(group,.41));curve.forEach((p,i)=>{assert.equal(p.x,before[i].x);near(p.y,before[i].y+(i>=index?.1:0));});
 moveVerticalGroup(group,100);const max=Math.min(...before.slice(index).map(p=>1-p.y));curve.forEach((p,i)=>near(p.y,before[i].y+(i>=index?max:0)));
 moveVerticalGroup(group,-100);const min=-Math.min(...before.slice(index).map(p=>p.y));curve.forEach((p,i)=>near(p.y,before[i].y+(i>=index?min:0)));
 moveVerticalGroup(group,.36);curve.forEach((p,i)=>near(p.y,before[i].y+(i>=index?.05:0)));
 assert(restoreVerticalGroup(group));assert.deepEqual(curve,before);cases++;
}
{
 const curve=[{x:0,y:0},{x:.5,y:1},{x:1,y:.5}],group=beginVerticalGroup(curve,0,.5),before=clone(curve);
 assert(!moveVerticalGroup(group,.9));assert.deepEqual(curve,before);assert(!restoreVerticalGroup(group));cases++;
}
assert.equal(beginVerticalGroup([{x:0,y:.5}],null,.5),null);assert.equal(beginVerticalGroup([{x:0,y:.5}],.5,.5),null);assert.equal(beginVerticalGroup([],0,.5),null);assert.equal(beginVerticalGroup([{x:0,y:0}],-1,.5),null);
assert.equal(verticalGroupSuffix(0),'');assert.equal(verticalGroupSuffix(1),' · 1 point ↕');assert.equal(verticalGroupSuffix(4),' · 4 points ↕');
for(const room of [0,8,18]){let arc;const ctx={save(){},restore(){},beginPath(){},stroke(){},arc(...a){arc=a}};drawVerticalGroupRing(ctx,100,50,'#abc',room);assert(arc[2]>0);if(room>=8)assert(arc[2]+.625<=room);}
console.log(JSON.stringify({pass:true,groupFixtures:cases,scope:'UI-only shared delta, X integrity, bounds, restore, suffix and ring edge'}));
