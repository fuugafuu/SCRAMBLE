import {test} from "node:test";
import {strict as assert} from "node:assert";
import {MultiFaceTracker,extractBoxes,LOST_TIMEOUT} from "../src/tracker.mjs";
const box=(x,y,w=80,h=100)=>({x,y,w,h});
test("multiple valid faces",()=>{
  const data={detections:[
    {boundingBox:{originX:10,originY:20,width:80,height:100}},
    {boundingBox:{originX:210,originY:20,width:80,height:100}},
    {boundingBox:{originX:0,originY:0,width:0,height:0}}]};
  assert.deepEqual(extractBoxes(data,640,480),[box(10,20),box(210,20)]);
});
test("maintains separate face IDs when model order changes",()=>{
  const t=new MultiFaceTracker();
  t.ingest([box(10,10),box(300,10),box(530,20)],1000);
  t.frame(1020);
  const ids=t.tracks.map(t=>t.id);
  t.ingest([box(540,21),box(22,10),box(290,10)],1100);
  assert.deepEqual(t.tracks.map(t=>t.id),ids);
  assert.deepEqual(t.tracks.map(t=>t.target.x),[22,290,540]);
});
test("expires disappeared faces",()=>{
  const t=new MultiFaceTracker();
  t.ingest([box(10,10),box(300,10)],1000);t.frame(1016);
  t.ingest([box(12,10)],1120);t.frame(1510);
  assert.equal(t.tracks.length,2);
  t.frame(1000+LOST_TIMEOUT+3);
  assert.equal(t.tracks.length,1);
});
test("never invents faces on empty input",()=>{
  const t=new MultiFaceTracker();t.ingest([],0);assert.equal(t.frame(16).length,0);
});
