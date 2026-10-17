import {test} from "node:test";
import {strict as assert} from "node:assert";
import {openRearCamera,shouldFallbackCamera} from "../src/camera.mjs";
import {effectState,scramble} from "../src/effect.mjs";

test("rear camera is requested strictly first, without audio",async()=>{
  const calls=[],stream={id:"rear"};
  const out=await openRearCamera({getUserMedia:async constraints=>{
    calls.push(constraints);return stream;
  }});
  assert.equal(out.stream,stream);
  assert.equal(out.rearRequested,true);
  assert.deepEqual(calls[0].video.facingMode,{exact:"environment"});
  assert.equal(calls[0].audio,false);
  assert.equal(calls.length,1);
});
test("fallback only when rear-facing camera is absent",async()=>{
  const calls=[];
  const out=await openRearCamera({getUserMedia:async constraints=>{
    calls.push(constraints);
    if(calls.length===1)throw Object.assign(new Error("not found"),{name:"OverconstrainedError"});
    return {id:"desktop"};
  }});
  assert.equal(out.rearRequested,false);
  assert.deepEqual(calls[1].video.facingMode,{ideal:"environment"});
  assert.equal(calls.length,2);
});
test("permission denial does not silently retry with another camera",async()=>{
  let n=0;
  await assert.rejects(openRearCamera({getUserMedia:async()=>{
    n++;throw Object.assign(new Error("denied"),{name:"NotAllowedError"});
  }}));
  assert.equal(n,1);
  assert.equal(shouldFallbackCamera({name:"NotAllowedError"}),false);
});
test("animation is time-varying for stationary faces",()=>{
  const f={id:3,started:1000,box:{x:100,y:100,w:90,h:110},opacity:1};
  const a=effectState(f,1030),b=effectState(f,1600),d=effectState(f,2700);
  assert.ok(a.reveal<b.reveal);
  assert.notEqual(b.scan,d.scan);
  assert.notEqual(b.hatch,d.hatch);
  assert.notEqual(b.bracket,d.bracket);
});
test("each face independently animates",()=>{
  const f={id:1,started:1000},g={id:2,started:1000};
  assert.notEqual(effectState(f,2000).shift,effectState(g,2000).shift);
  assert.notEqual(effectState(f,2000).scan,effectState(g,2000).scan);
});
test("renderer issues different geometry at different times, without bitmaps",()=>{
  const commands=[];
  const ctx=new Proxy({},{get:(target,key)=>{
    if(key==="save"||key==="restore"||key==="beginPath"||key==="clip"||key==="stroke")return ()=>{};
    if(key==="rect"||key==="fillRect"||key==="strokeRect"||key==="translate"||key==="scale"||key==="moveTo"||key==="lineTo")return(...args)=>commands.push([key,...args]);
    return target[key];
  },set:(target,key,value)=>{target[key]=value;return true}});
  const f={id:7,started:1000,box:{x:5,y:5,w:110,h:130},opacity:1};
  scramble(ctx,f,1600);const one=JSON.stringify(commands);
  commands.length=0;scramble(ctx,f,2200);const two=JSON.stringify(commands);
  assert.notEqual(one,two);
  assert.equal(one.includes("drawImage"),false);
});
