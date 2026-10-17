import {test} from "node:test";
import {strict as assert} from "node:assert";
import {effectState,scramble} from "../src/effect.mjs";
import {MultiFaceTracker} from "../src/tracker.mjs";

const box=(x,y)=>({x,y,w:90,h:110});
test("start time is saved for each new face; reveal actually runs",()=>{
  const t=new MultiFaceTracker();
  t.ingest([box(15,30),box(280,30)],1000);
  assert.deepEqual(t.tracks.map(x=>x.started),[1000,1000]);
  assert.equal(effectState(t.tracks[0],1000).reveal,0);
  assert.ok(effectState(t.tracks[0],1200).reveal>.35);
  assert.equal(effectState(t.tracks[0],1510).reveal,1);
});
test("tracked motion boosts distortion and fades over time",()=>{
  const t=new MultiFaceTracker();
  t.ingest([box(15,30)],1000);t.frame(1010);
  const neutral=effectState(t.tracks[0],2200);
  t.ingest([box(85,35)],1100);t.frame(1116);
  const agitated=effectState(t.tracks[0],2200);
  assert.ok(t.tracks[0].motion>.05);
  assert.ok(agitated.energy>neutral.energy || agitated.motion>neutral.motion);
  const peak=t.tracks[0].motion;
  t.frame(1400);
  assert.ok(t.tracks[0].motion<peak);
});
test("separate faces have different scan phases",()=>{
  const a={id:1,started:1000,motion:0},b={id:2,started:1000,motion:0};
  assert.notEqual(effectState(a,2200).scan,effectState(b,2200).scan);
  assert.notEqual(effectState(a,2200).shift,effectState(b,2200).shift);
});
test("live-video tears make drawImage calls only when video exists",()=>{
  const calls=[];
  const methods=["save","restore","beginPath","clip","stroke","fill","closePath",
    "rect","fillRect","strokeRect","translate","scale","moveTo","lineTo","ellipse","drawImage"];
  const ctx=new Proxy({globalAlpha:1},{get:(o,k)=>methods.includes(k)?(...args)=>{calls.push([k,...args]);}:o[k],
    set:(o,k,v)=>{o[k]=v;return true;}});
  const f={id:3,box:box(150,100),started:1000,motion:.9,opacity:1};
  const video={videoWidth:1280,videoHeight:720,readyState:4};
  scramble(ctx,f,1500,video);
  assert.ok(calls.some(c=>c[0]==="drawImage"));
  calls.length=0;
  scramble(ctx,f,1600);
  assert.ok(!calls.some(c=>c[0]==="drawImage"));
});
