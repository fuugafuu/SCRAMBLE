// Multi-person face tracks with stable IDs and motion-responsive effects.
// Tracking identifies contiguous image regions only; no biometric identity matching.
export const LOST_TIMEOUT=620;
const cap=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const center=b=>({x:b.x+b.w/2,y:b.y+b.h/2});
const iou=(a,b)=>{
  const w=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
  const h=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  return w*h/Math.max(1,a.w*a.h+b.w*b.h-w*h);
};
export function extractBoxes(result,width,height){
  const out=[];
  for(const d of result?.detections||[]){
    const b=d.boundingBox;if(!b)continue;
    const {originX:x,originY:y,width:w,height:h}=b;
    if(![x,y,w,h].every(Number.isFinite)||w<8||h<8)continue;
    if(x>width||y>height||x+w<0||y+h<0)continue;
    out.push({x,y,w,h});
  }return out;
}
export class MultiFaceTracker{
  constructor(){this.tracks=[];this.nextId=1;this.lastFrame=0;}
  reset(){this.tracks=[];this.nextId=1;this.lastFrame=0;}
  ingest(boxes,time){
    const candidates=[];
    for(let i=0;i<this.tracks.length;i++){
      const t=this.tracks[i];if(time-t.seen>LOST_TIMEOUT)continue;
      for(let j=0;j<boxes.length;j++){
        const b=boxes[j];if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<8||b.h<8)continue;
        const a=center(t.target),d=center(b),dt=cap((time-t.seen)/1000,0,.25);
        const distance=Math.hypot(a.x+t.vx*dt-d.x,a.y+t.vy*dt-d.y)/
          Math.max(24,Math.hypot(t.target.w,t.target.h),Math.hypot(b.w,b.h));
        const overlap=iou(t.target,b);
        const ratio=Math.abs(Math.log(b.w/t.target.w))+Math.abs(Math.log(b.h/t.target.h));
        if((distance>.88&&overlap<.08)||ratio>1.65)continue;
        candidates.push({i,j,cost:distance*.72+(1-overlap)*.23+ratio*.05});
      }
    }
    candidates.sort((a,b)=>a.cost-b.cost);
    const matchedTracks=new Set(),matchedBoxes=new Set();
    for(const m of candidates){
      if(matchedTracks.has(m.i)||matchedBoxes.has(m.j))continue;
      const t=this.tracks[m.i],b=boxes[m.j];
      const prev=center(t.target),next=center(b);
      const dt=Math.max(.016,(time-t.seen)/1000);
      const speed=Math.hypot(next.x-prev.x,next.y-prev.y)/
        Math.max(25,Math.hypot(t.target.w,t.target.h))/dt;
      t.motion=Math.max(t.motion||0,cap(speed*.29,0,1));
      t.vx=cap(t.vx*.45+(next.x-prev.x)/dt*.55,-2400,2400);
      t.vy=cap(t.vy*.45+(next.y-prev.y)/dt*.55,-2400,2400);
      t.target={...b};t.seen=time;
      matchedTracks.add(m.i);matchedBoxes.add(m.j);
    }
    for(let j=0;j<boxes.length;j++){
      if(matchedBoxes.has(j))continue;
      const b=boxes[j];
      if(!b||![b.x,b.y,b.w,b.h].every(Number.isFinite)||b.w<8||b.h<8)continue;
      this.tracks.push({
        id:this.nextId++,box:{...b},target:{...b},vx:0,vy:0,
        started:time,seen:time,motion:0,opacity:0
      });
    }
  }
  frame(time){
    const dt=this.lastFrame?cap(time-this.lastFrame,0,65):16;this.lastFrame=time;
    const k=1-Math.exp(-dt/62);
    for(const t of this.tracks){
      for(const prop of ["x","y","w","h"])t.box[prop]+=(t.target[prop]-t.box[prop])*k;
      t.motion=cap((t.motion||0)*Math.exp(-dt/330),0,1);
      const lost=time-t.seen;
      const goal=lost>225?cap(1-(lost-225)/395,0,1):1;
      t.opacity+=(goal-t.opacity)*(1-Math.exp(-dt/(goal===1?90:55)));
    }
    this.tracks=this.tracks.filter(t=>time-t.seen<=LOST_TIMEOUT);
    return this.tracks;
  }
}
