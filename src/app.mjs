import {MultiFaceTracker,extractBoxes} from "./tracker.mjs";
import {scramble} from "./effect.mjs";
import {openRearCamera,openAlternateCamera,oppositeFacing,cameraInfo} from "./camera.mjs";

const VERSION="0.10.35";
const CDN="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@"+VERSION;
const MODEL="https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const video=document.getElementById("source"),canvas=document.getElementById("screen");
const gate=document.getElementById("permission"),button=document.getElementById("start");
const message=document.getElementById("message");
const switchButton=document.getElementById("switch-camera");
const notice=document.getElementById("camera-notice");
const c=canvas.getContext("2d",{alpha:false,desynchronized:true});
const tracker=new MultiFaceTracker();
let detector=null,stream=null,active=false,lastTime=-1,lastDetect=0,interval=110;
let cameraFacing="environment",cameraDeviceId="",changingCamera=false,noticeTimeout=null;
function showNotice(text){
  if(noticeTimeout)clearTimeout(noticeTimeout);
  notice.textContent=text;notice.hidden=false;
  noticeTimeout=setTimeout(()=>{notice.hidden=true;},2600);
}
async function attachCamera(next,fallbackFacing){
  const result=cameraInfo(next.stream,fallbackFacing);
  video.srcObject=next.stream;
  try{await video.play();}catch(error){
    next.stream.getTracks().forEach(track=>track.stop());
    video.srcObject=null;throw error;
  }
  stream=next.stream;
  cameraFacing=result.facing;
  cameraDeviceId=result.deviceId||next.deviceId||"";
  tracker.reset();lastTime=-1;lastDetect=0;
}
async function switchCamera(){
  if(!active||changingCamera)return;
  changingCamera=true;switchButton.disabled=true;notice.hidden=true;
  const previousFacing=cameraFacing,previousId=cameraDeviceId;
  // Many iOS browsers cannot open a second camera before the first track stops.
  stream?.getTracks().forEach(track=>track.stop());
  video.srcObject=null;
  try{
    const wanted=oppositeFacing(previousFacing);
    const next=await openAlternateCamera(navigator.mediaDevices,wanted,previousId);
    await attachCamera(next,wanted);
  }catch(error){
    console.warn("Camera switch failed",error);
    try{
      // Restore the former camera rather than leaving a black screen.
      let next;
      if(previousId){
        try{
          const s=await navigator.mediaDevices.getUserMedia({audio:false,video:{deviceId:{exact:previousId},width:{ideal:1280},height:{ideal:720}}});
          next={stream:s,deviceId:previousId};
        }catch(e){console.warn("Camera recovery by ID failed",e);}
      }
      if(!next){
        const s=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:previousFacing}}});
        next={stream:s};
      }
      await attachCamera(next,previousFacing);
      showNotice("別のカメラに切り替えられません");
    }catch(recoveryError){
      console.error("Camera recovery failed",recoveryError);
      showNotice("カメラを復旧できません。ページを再読み込みしてください。");
    }
  }finally{
    changingCamera=false;switchButton.disabled=false;
  }
}
function resize(){
  const dpr=Math.min(2,devicePixelRatio||1);
  const w=Math.max(1,Math.round(innerWidth*dpr)),h=Math.max(1,Math.round(innerHeight*dpr));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
}
function errorText(e){
  if(e?.name==="NotAllowedError")return "カメラの使用が許可されていません。ブラウザの設定を確認してください。";
  if(e?.name==="NotFoundError")return "利用できるカメラがありません。";
  if(e?.name==="NotReadableError")return "カメラが使用中の可能性があります。";
  if(e?.message?.includes("HTTPS"))return "HTTPS または localhost で開いてください。";
  return "起動に失敗しました。通信状態とカメラの権限を確認してください。";
}
async function createDetector(){
  const vision=await import(CDN+"/vision_bundle.mjs");
  const fileset=await vision.FilesetResolver.forVisionTasks(CDN+"/wasm");
  return vision.FaceDetector.createFromOptions(fileset,{
    baseOptions:{modelAssetPath:MODEL,delegate:"CPU"},
    runningMode:"VIDEO",
    minDetectionConfidence:.5,minSuppressionThreshold:.3
  });
}
function tick(now){
  if(!active)return;
  resize();
  const w=canvas.width,h=canvas.height,vw=video.videoWidth,vh=video.videoHeight;
  c.fillStyle="#050505";c.fillRect(0,0,w,h);
  if(vw&&vh&&video.readyState>=2&&!changingCamera){
    // Cover crop is shared by real camera pixels AND AI face coordinates.
    // There is no front-camera mirroring on the outward camera.
    const scale=Math.max(w/vw,h/vh),left=(w-vw*scale)/2,top=(h-vh*scale)/2;
    c.save();
    if(cameraFacing==="user"){c.translate(w,0);c.scale(-1,1);}
    c.translate(left,top);c.scale(scale,scale);
    c.drawImage(video,0,0,vw,vh);
    if(detector&&!document.hidden&&video.readyState>=2 &&
       video.currentTime!==lastTime && now-lastDetect>=interval){
      lastTime=video.currentTime;lastDetect=now;
      try{
        const t0=performance.now();
        const detections=detector.detectForVideo(video,now);
        tracker.ingest(extractBoxes(detections,vw,vh),now);
        interval=Math.max(80,Math.min(245,(performance.now()-t0)*1.6));
      }catch(e){console.error("Face detector:",e);interval=250;}
    }
    // Each tracked person animates independently, even when standing still.
    for(const face of tracker.frame(now))scramble(c,face,now,video);
    c.restore();
  }
  requestAnimationFrame(tick);
}
async function start(){
  if(active)return;
  button.disabled=true;message.textContent="背面カメラを起動しています…";
  if(!navigator.mediaDevices?.getUserMedia){
    message.textContent="HTTPS または localhost で開いてください。";button.disabled=false;return;
  }
  try{
    const result=await openRearCamera(navigator.mediaDevices);
    await attachCamera(result.stream?result:{stream:result.stream},"environment");
    message.textContent="顔検出モデルを読み込み中…";
    detector=await createDetector();
    tracker.reset();lastTime=-1;lastDetect=0;
    active=true;gate.hidden=true;switchButton.hidden=false;resize();requestAnimationFrame(tick);
  }catch(e){
    console.error("SCRAMBLE initialization:",e);
    stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;
    detector?.close?.();detector=null;
    message.textContent=errorText(e);button.disabled=false;button.textContent="再試行";
  }
}
video.addEventListener("resize",()=>{tracker.reset();lastTime=-1;});
window.addEventListener("resize",resize,{passive:true});
button.addEventListener("click",start);
switchButton.addEventListener("click",switchCamera);
resize();
