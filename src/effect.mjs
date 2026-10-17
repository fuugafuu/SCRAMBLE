// Reference-derived black modular mask with white frames and diagonal hatching.
function poly(c,pts){
  c.beginPath();c.moveTo(pts[0],pts[1]);
  for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.stroke();
}
export function scramble(c,face,time){
  if(face.opacity<=.01)return;
  const {x,y,w,h}=face.box;
  c.save();c.translate(x+w/2,y+h/2);
  c.scale(Math.max(24,w*1.15)/260,Math.max(28,h*1.15)/280);
  c.globalAlpha=face.opacity;c.fillStyle="#000";
  for(const [x,y,w,h] of [
    [-110,-135,220,260],[-129,-101,235,175],[-137,-50,252,124],
    [-66,-150,157,52],[-116,67,210,70],[76,-103,40,56]
  ])c.fillRect(x,y,w,h);
  c.save();c.beginPath();c.rect(-133,112,124,104);c.clip();
  c.strokeStyle="#fff";c.lineWidth=7;c.lineCap="butt";
  for(let i=-254;i<143;i+=14)poly(c,[i,98,i+118,229]);
  c.restore();
  c.strokeStyle="#fff";c.lineCap="square";c.lineJoin="miter";c.lineWidth=6;
  poly(c,[-131,-96,-131,-148,45,-148,45,-113]);
  poly(c,[25,-147,107,-147,107,-104]);
  poly(c,[-131,70,-131,117,86,117,86,75]);
  poly(c,[-106,-37,-106,-78,-70,-78]);
  poly(c,[-60,-82,53,-82,53,68,-61,68,-61,-75]);
  poly(c,[-55,-75,65,-75,65,79,-52,79]);
  c.lineWidth=5;c.strokeRect(31,34,135,140);
  c.lineCap="round";c.lineWidth=7;
  const a=84,b=-51,q=1+Math.sin(time*.006)*.04;
  poly(c,[a,b-16*q,a,b-8*q]);poly(c,[a,b+8*q,a,b+16*q]);
  poly(c,[a-16*q,b,a-8*q,b]);poly(c,[a+8*q,b,a+16*q,b]);
  c.restore();
}
