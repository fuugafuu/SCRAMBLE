// SCRAMBLE / REACTIVE FACE INTERFERENCE v3.
// The incoming video is never uploaded; every effect is generated procedurally.
// All coordinates here are local to a 240 x 290 face-sized field.
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const fract=(n)=>n-Math.floor(n);
const noise=(n)=>fract(Math.sin(n*127.1+78.233)*43758.5453);
const smooth=(x)=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const seg=(c,...p)=>{c.beginPath();c.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);c.stroke();};
const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
const withAlpha=(c,alpha,draw)=>{c.save();c.globalAlpha*=clamp(alpha,0,1);draw();c.restore();};
const lineColor="#faffff";
const ghost="rgba(224,245,255,.48)";
const hotspot="rgba(255,255,255,.9)";

export function effectState(face,time){
  const id=face.id||0;
  const age=Math.max(0,time-(face.started??time));
  const phase=fract(time/1900+id*.173);
  const spike=Math.pow(1-clamp(Math.abs(phase-.84)/.11,0,1),2);
  const impact=Math.exp(-age/300);
  const motion=clamp(face.motion||0,0,1);
  const energy=clamp(.32+Math.max(spike*.72,impact*.9,motion*.95),0,1);
  const tick=Math.floor(time/(70-energy*23));
  return {
    reveal:smooth(age/440),
    impact,spike,motion,energy,
    scan:-153+fract(time*.00048+id*.17)*306,
    hatch:fract(time*.0085+id*.53)*20,
    shift:(noise(tick*13+id*103)-.5)*(13+energy*35),
    tear:(noise(Math.floor(time/80)*19+id*71)-.5)*(20+energy*35),
    strobe:noise(Math.floor(time/74)*29+id*31)>(.84-energy*.12),
    bracket:Math.sin(time*.0055+id*1.7)*(2+energy*11),
    pulse:.5+.5*Math.sin(time*.013+id*1.2),
    shock:smooth(age/470),
  };
}

function cameraTears(c,face,s,video,time){
  if(!video || video.readyState<2||!video.videoWidth)return;
  const vw=video.videoWidth,vh=video.videoHeight;
  const src=face.box,centerX=src.x+src.w*.5,centerY=src.y+src.h*.5;
  const stripeCount=s.energy>.6?6:3;
  c.save();
  c.globalAlpha*=.38+s.energy*.23;
  for(let i=0;i<stripeCount;i++){
    const seed=Math.floor(time/(60+i*17))+face.id*41+i*19;
    const yy=-112+i*37+(noise(seed)-.5)*25;
    const layerWidth=45+noise(seed*2)*95;
    const layerHeight=3+noise(seed*3)*14;
    const sx=clamp(centerX+(noise(seed*5)-.5)*src.w,0,Math.max(0,vw-4));
    const sy=clamp(centerY+(yy/290)*src.h,0,Math.max(0,vh-4));
    const sw=Math.min(Math.max(4,src.w*.4),vw-sx);
    const sh=Math.min(Math.max(3,src.h*.07),vh-sy);
    if(sw<2||sh<2)continue;
    const direction=i%2?1:-1;
    // Distorted live-video fragments leak just outside the black shield.
    c.drawImage(video,sx,sy,sw,sh,
      direction*(108+s.energy*27)+s.tear*.36,yy,layerWidth,layerHeight);
  }
  c.restore();
}
function rays(c,s,id,time){
  const energy=s.energy;
  if(energy<.33)return;
  c.save();
  c.strokeStyle=lineColor;c.lineWidth=1.1+energy*1.7;c.lineCap="square";
  for(let k=0;k<12;k++){
    const theta=Math.PI*2*(k/12)+noise(id*17+k*31)*.2;
    const flicker=noise(Math.floor(time/92)*31+id*13+k);
    if(flicker<.21)continue;
    const r0=156+flicker*18;
    const length=6+(s.impact*65+s.spike*36+s.motion*30)*flicker;
    withAlpha(c,(.12+flicker*.5)*energy,()=>{
      seg(c,Math.cos(theta)*r0,Math.sin(theta)*r0*1.12,
        Math.cos(theta)*(r0+length),Math.sin(theta)*(r0+length)*1.12);
    });
  }
  c.restore();
}
function lockRing(c,s,age){
  if(age>800)return;
  const k=smooth(age/550);
  const opacity=1-smooth(age/800);
  withAlpha(c,opacity,()=>{
    c.strokeStyle="#fff";c.lineWidth=3.7*(1-k)+.75;
    c.beginPath();c.ellipse(0,0,60+133*k,80+170*k,0,0,Math.PI*2);c.stroke();
    c.lineWidth=1.5;
    c.beginPath();c.ellipse(0,0,140+45*k,176+60*k,0,0,Math.PI*2);c.stroke();
  });
}
function outline(c,s){
  const expansion=(1-s.reveal)*38;
  const g=s.bracket;
  c.lineCap="square";c.lineJoin="miter";c.strokeStyle=lineColor;
  c.lineWidth=5.8;
  seg(c,-147-expansion,-84,-147-expansion,-166,42+g,-166,42+g,-125);
  seg(c,35,-166,110+expansion,-166,110+expansion,-102);
  seg(c,-149-expansion,70,-149-expansion,127,102+g,127,102+g,84);
  seg(c,-111,-42,-111,-91,-65,-91);
  c.lineWidth=4;
  seg(c,-70,-93,61+g,-93,61+g,74,-60,74,-60,-82);
  seg(c,-60,-79,73+g,-79,73+g,87,-50,87);
  // Mechanical lock corners that overshoot then settle.
  const overshoot=Math.sin((1-s.reveal)*Math.PI)*19;
  const sx=32+g+overshoot,sy=36+Math.sin(s.pulse*4)*2;
  c.lineWidth=5.2;c.strokeRect(sx,sy,151,153);
  // Four fractured corner braces moving in opposite directions.
  c.lineWidth=2.3;
  withAlpha(c,.35+.65*s.pulse,()=>{
    seg(c,-169-expansion,-114,-169-expansion,-154,-129-expansion,-154);
    seg(c,155+expansion,-111,155+expansion,-150,114+expansion,-150);
    seg(c,-168-expansion,119,-168-expansion,158,-128-expansion,158);
    seg(c,147+expansion,138,147+expansion,170,112+expansion,170);
  });
}
function barrier(c,s,face,time){
  // Full-coverage barrier is applied from frame one, never reveals the face.
  c.save();
  rect(c,-130,-148,260,296,"#000");
  // Segmented slabs slide and jitter independently to build mechanical tension.
  const sections=[
    [-155,-157,165,35,0],[-52,-162,193,49,1],
    [-156,-116,306,69,2],[-156,-53,309,72,3],
    [-158,19,302,71,4],[-150,89,237,71,5],
    [87,-103,69,106,6],[-104,134,195,30,7]
  ];
  for(const [bx,by,bw,bh,i] of sections){
    const vibration=s.shift*((i%3)-1)*.7;
    const start=(1-s.reveal)*((i%2?1:-1)*55);
    rect(c,bx+start+vibration,by,bw*Math.max(.14,s.reveal),bh,"#000");
  }
  // Dense analog scan grain with bursts (short white + graphite slits).
  for(let i=0;i<17;i++){
    const seed=Math.floor(time/(52+(i%3)*19))+face.id*37+i*17;
    const flick=noise(seed*3);
    const yy=-137+i*17+(noise(seed+17)-.5)*11;
    const xx=-119+noise(seed*13)*156;
    const len=13+noise(seed*7)*98;
    const thick=(i%4===0?4.2:1.25)+(s.energy>.65?1.25:0);
    const light=flick>(.43-s.energy*.18);
    rect(c,xx+s.tear*(i%2?.6:-.25),yy,len,thick,
      light?"rgba(245,250,255,.78)":"rgba(150,166,175,.35)");
  }
  // Rolling, bright scan beam changes location even when subject is still.
  withAlpha(c,.42+s.energy*.38,()=>{
    rect(c,-128,s.scan,258,12,"rgba(218,243,255,.17)");
    rect(c,-128,s.scan+5,258,1.8,"rgba(255,255,255,.98)");
    rect(c,-128,s.scan+11,258,1,"rgba(240,255,255,.34)");
  });
  const vertical=-132+fract(time*.00022+face.id*.31)*264;
  rect(c,vertical,-140,3,284,"rgba(244,251,255,.33)");
  // Micro-grid flickers at different positions (no text, no extra UI).
  c.strokeStyle="rgba(255,255,255,.23)";c.lineWidth=.65;
  for(let j=0;j<4;j++){
    const gy=-88+j*59;
    seg(c,-124,gy,123,gy);
  }
  c.restore();
}
function diagonalShield(c,s){
  c.save();c.beginPath();c.rect(-148,106,153,125);c.clip();
  c.lineWidth=6.5;c.lineCap="square";c.strokeStyle="#f7fafc";
  for(let i=-350+s.hatch;i<195;i+=20){
    seg(c,i,98,i+154,258);
  }
  c.restore();
}
function reticles(c,s,face,time){
  const r=11+s.pulse*4;
  c.strokeStyle="#fff";c.lineWidth=5.2;c.lineCap="round";
  const points=[[100,-55],[0,-163]];
  for(const [cx,cy] of points){
    withAlpha(c,cx===0?.4:.7+s.pulse*.3,()=>{
      seg(c,cx,cy-r-8,cx,cy-r);
      seg(c,cx,cy+r,cx,cy+r+8);
      seg(c,cx-r-8,cy,cx-r,cy);
      seg(c,cx+r,cy,cx+r+8,cy);
    });
  }
  // Aggressive transient tearing on motion or periodic interference peak.
  const count=Math.floor(s.energy*8);
  for(let i=0;i<count;i++){
    const pulseKey=Math.floor(time/61)+face.id*101+i*33;
    if(noise(pulseKey*17)<.32)continue;
    const y=-139+noise(pulseKey*5)*270;
    const off=s.tear*(i%2?1:-1);
    rect(c,-152+off,y,45+noise(pulseKey)*132,1+noise(pulseKey+4)*3.5,
      i%3?"rgba(255,255,255,.82)":"rgba(190,240,255,.6)");
  }
  if(s.strobe){
    withAlpha(c,.65*s.energy,()=>{
      rect(c,-155+s.tear,-34,264,3.5,hotspot);
      rect(c,-93-s.shift,99,141,2.5,hotspot);
    });
  }
}
export function scramble(c,face,time,video=null){
  if(!face||face.opacity<=.01)return;
  const {x,y,w,h}=face.box;
  if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)return;
  const s=effectState(face,time),age=Math.max(0,time-(face.started??time));
  c.save();
  c.translate(x+w*.5,y+h*.5);c.scale(w/240,h/290);
  c.globalAlpha*=clamp(face.opacity,0,1);
  c.lineJoin="miter";c.lineCap="square";
  cameraTears(c,face,s,video,time);
  rays(c,s,face.id||0,time);
  barrier(c,s,face,time);
  diagonalShield(c,s);
  // White bars and scan artifacts sit on top of the opaque face barrier.
  outline(c,s);
  reticles(c,s,face,time);
  lockRing(c,s,age);
  // Optical white flash quickly burns out on initial acquisition.
  if(age<240)withAlpha(c,(1-smooth(age/240))*.75,()=>{
    c.strokeStyle="#fff";c.lineWidth=10*(1-smooth(age/240))+1;
    c.strokeRect(-145,-162,290,324);
  });
  c.restore();
}
