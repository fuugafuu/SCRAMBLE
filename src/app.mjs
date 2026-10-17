import { MultiFaceTracker,extractBoxes } from "./tracker.mjs";
import { scramble } from "./effect.mjs";
const VERSION="0.10.35";
const CDN="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@"+VERSION;
const MODEL="https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const video=document.getElementById("source"),canvas=document.getElementById("screen");
const gate=document.getElementById("permission"),button=document.getElementById("start"),message=document.getElementById("message");
const c=canvas.getContext("2d",{alpha:false}),tracker=new MultiFaceTracker();
let detector=null,stream=null,active=false,lastTime=-1,lastDetect=0,interval=110;
function resize(){
  const dpr=Math.min(2,window.devicePixelRatio||1);
  const w=Math.max(1,Math.round(innerWidth*dpr)),h=Math.max(1,Math.round(innerHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
}
function errorText(e){
  if(e?.name==="NotAllowedError")return "カメラが許可されていません。ブラウザの設定を確認してください。";
  if(e?.name==="NotFoundError")return "カメラが見つかりません。";
  if(e?.name==="NotReadableError")return "カメラが使用中の可能性があります。";
  return "起動に失敗しました。通信状態とカメラ権限を確認してください。";
}
async function createDetector(){
  const vision=await import(CDN+"/vision_bundle.mjs");
  const fileset=await vision.FilesetResolver.forVisionTasks(CDN+"/wasm");
  return vision.FaceDetector.createFromOptions(fileset,{
    baseOptions:{modelAssetPath:MODEL,delegate:"CPU"},
    runningMode:"VIDEO",minDetectionConfidence:.51,minSuppressionThreshold:.32
  });
}
function tick(now){
  if(!active)return;
  resize();const w=canvas.width,h=canvas.height,vw=video.videoWidth,vh=video.videoHeight;
  c.fillStyle="#050505";c.fillRect(0,0,w,h);
  if(vw&&vh){
    const scale=Math.max(w/vw,h/vh),left=(w-vw*scale)/2,top=(h-vh*scale)/2;
    c.save();c.translate(w,0);c.scale(-1,1); // front-camera mirror: pixels and coordinates together
    c.translate(left,top);c.scale(scale,scale);
    c.drawImage(video,0,0,vw,vh);
    if(detector&&!document.hidden&&video.readyState>=2&&video.currentTime!==lastTime&&now-lastDetect>=interval){
      lastTime=video.currentTime;lastDetect=now;
      try{
        const start=performance.now(),detections=detector.detectForVideo(video,now);
        tracker.ingest(extractBoxes(detections,vw,vh),now);
        interval=Math.max(86,Math.min(250,(performance.now()-start)*1.7));
      }catch(e){console.error("Face detection:",e);interval=250;}
    }
    for(const face of tracker.frame(now))scramble(c,face,now);
    c.restore();
  }
  requestAnimationFrame(tick);
}
async function start(){
  if(active)return;
  button.disabled=true;message.textContent="カメラの使用許可を確認中…";
  if(!navigator.mediaDevices?.getUserMedia){
    message.textContent="HTTPSまたはlocalhostで開いてください。";
    button.disabled=false;return;
  }
  try{
    stream=await navigator.mediaDevices.getUserMedia({
      audio:false,video:{facingMode:"user",width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}}
    });
    video.srcObject=stream;await video.play();
    message.textContent="顔認識モデルを読み込み中…";
    detector=await createDetector();
    tracker.reset();lastTime=-1;lastDetect=0;
    active=true;gate.hidden=true;resize();requestAnimationFrame(tick);
  }catch(e){
    console.error("SCRAMBLE:",e);
    stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;
    detector?.close?.();detector=null;
    message.textContent=errorText(e);button.disabled=false;button.textContent="再試行";
  }
}
video.addEventListener("resize",()=>{tracker.reset();lastTime=-1;});
window.addEventListener("resize",resize,{passive:true});
button.addEventListener("click",start);resize();
