// SCRAMBLE effect: every shape is drawn at runtime, none are bitmap overlays.
// Local coordinates are based on each detected face, not the size of the screen.
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const hash=(n)=>{const v=Math.sin(n*127.1+32.89)*43758.5453123;return v-Math.floor(v);};
const ease=(t)=>{const v=clamp(t,0,1);return v*v*(3-2*v);};
const line=(c,...p)=>{c.beginPath();c.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)c.lineTo(p[i],p[i+1]);c.stroke();};

/** Public, deterministic animation parameters; can be tested without a camera. */
export function effectState(face,time){
  const id=face.id||0;
  const age=Math.max(0,time-(face.started??time));
  const tick=Math.floor(time/74);
  return {
    reveal:ease(age/340),
    // Continuous motion even while the face remains perfectly still:
    scan:-140+((time*.165+id*67)%280+280)%280,
    hatch:((time*.09+id*11)%18+18)%18,
    shift:(hash(tick*13+id*103)-.5)*16,
    tear:(hash(Math.floor(time/126)*19+id*71)-.5)*16,
    strobe:hash(Math.floor(time/114)*29+id*31)>.79,
    bracket:Math.sin(time*.0033+id*1.7)*5,
    pulse:.6+.4*Math.sin(time*.005+id),
  };
}

export function scramble(c,face,time){
  if(!face||face.opacity<=.01)return;
  const {x,y,w,h}=face.box;
  if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0)return;
  const s=effectState(face,time);
  c.save();
  c.translate(x+w*.5,y+h*.5);
  c.scale(w/238,h/292); // follow detected face size; boxes may differ across people
  c.globalAlpha=clamp(face.opacity,0,1);
  c.lineCap="square";c.lineJoin="miter";
  // Primary coverage: actual black region over the entire face.
  // Secondary fragments keep the outline broken and animated, never a pasted screenshot.
  c.fillStyle="#000";
  c.fillRect(-139,-155,278,309);
  const slabs=[
    [-150,-150,158,43,.40],[-38,-168,148,56,-.28],
    [-159,-105,315,92,.50],[-150,-18,304,87,-.55],
    [-142,57,242,101,.25],[-96,133,172,31,-.35],
    [93,-99,56,91,.65]
  ];
  for(let i=0;i<slabs.length;i++){
    const [bx,by,bw,bh,ratio]=slabs[i];
    const fraction=s.reveal;
    c.fillRect(bx+s.shift*ratio+(1-fraction)*(i%2?24:-24),by,bw*fraction+.02,bh);
  }
  // Independently animated white band fragments — not one large face outline.
  c.strokeStyle="#fff";c.lineWidth=6.4;
  const open=30*(1-s.reveal),motion=s.bracket;
  line(c,-151+open,-99,-151+open,-162,34+motion,-162,34+motion,-123);
  line(c,-142,70,-142,124,94+motion,124,94+motion,77);
  line(c,-107,-42,-107,-90,-57,-90);
  line(c,-60,-90,52+motion,-90,52+motion,68,-49,68,-49,-80);
  c.lineWidth=4.7;
  line(c,-67,-76,64+motion,-76,64+motion,84,-57,84);
  // A lower-right tracking frame slides and locks onto the subject.
  const squareX=37+s.bracket+9*(1-s.reveal);
  const squareY=36+Math.sin(time*.003+face.id)*3;
  c.strokeRect(squareX,squareY,147,150);
  // The diagonal shielding hatch moves continuously through its clipped region.
  c.save();c.beginPath();c.rect(-144,107,144,116);c.clip();
  c.strokeStyle="#f8f8f8";c.lineWidth=6.8;
  for(let i=-340+s.hatch;i<143;i+=17){
    line(c,i,98,i+147,253);
  }
  c.restore();
  // Animated signal sweep, constrained to the actual black face area.
  c.save();c.beginPath();c.rect(-139,-155,278,309);c.clip();
  c.fillStyle="rgba(255,255,255,0.12)";
  c.fillRect(s.scan,-157,5,315);
  c.fillStyle="rgba(255,255,255,0.52)";
  c.fillRect(s.scan+6,-157,1.6,315);
  // Localized signal-tearing bars that update independently for each tracked face.
  for(let i=0;i<5;i++){
    const sliceTick=Math.floor(time/105)+(face.id*31)+i*7;
    const yy=-119+i*49+(hash(sliceTick+9)-.5)*15;
    const xx=-115+hash(sliceTick*3+5)*154;
    const barLength=17+hash(sliceTick*11+2)*74;
    c.fillStyle=i%2?"rgba(255,255,255,.65)":"rgba(166,166,166,.45)";
    c.fillRect(xx+s.tear*(i%2?1:-.6),yy,barLength,1.2+i%2*1.2);
  }
  c.restore();
  // Alignment reticle pulses; appearance remains monochrome as in the reference.
  const cx=95,cy=-45,p=9+s.pulse*5;
  c.strokeStyle="#fff";c.lineWidth=6;c.lineCap="round";
  line(c,cx,cy-p-9,cx,cy-p);
  line(c,cx,cy+p,cx,cy+p+9);
  line(c,cx-p-9,cy,cx-p,cy);
  line(c,cx+p,cy,cx+p+9,cy);
  // Short interference flash, controlled by motion instead of drawing a fixed image.
  if(s.strobe){
    c.fillStyle="rgba(255,255,255,.78)";
    c.fillRect(-132+s.tear,-12,Math.max(18,75+s.shift),3);
    c.fillRect(-84-s.shift,99,37,2);
  }
  c.restore();
}
