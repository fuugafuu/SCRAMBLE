// Browser camera selection with no third-party device service.
const videoOptions={width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}};
const stop=(stream)=>stream?.getTracks?.().forEach(t=>t.stop());
export const shouldFallbackCamera=(error)=>error?.name==="OverconstrainedError"||error?.name==="NotFoundError";
export const oppositeFacing=(facing)=>facing==="user"?"environment":"user";
export function cameraInfo(stream,preferred="environment"){
  const settings=stream?.getVideoTracks?.()?.[0]?.getSettings?.()||{};
  const facing=["user","environment"].includes(settings.facingMode)?settings.facingMode:preferred;
  return {stream,facing,deviceId:settings.deviceId||""};
}
const constraints=(facing,exact=true)=>({audio:false,video:{...videoOptions,facingMode:exact?{exact:facing}:{ideal:facing}}});

export async function openRearCamera(mediaDevices){
  if(!mediaDevices?.getUserMedia)throw new Error("Camera API requires HTTPS or localhost");
  try{
    return {...cameraInfo(await mediaDevices.getUserMedia(constraints("environment",true)),"environment"),rearRequested:true};
  }catch(error){
    if(!shouldFallbackCamera(error))throw error;
    const stream=await mediaDevices.getUserMedia(constraints("environment",false));
    return {...cameraInfo(stream,"environment"),rearRequested:false};
  }
}

/** Used for switching: never silently fall back to the same device. */
export async function openAlternateCamera(mediaDevices,desiredFacing,oldDeviceId=""){
  if(!mediaDevices?.getUserMedia)throw new Error("Camera API unavailable");
  // Prefer an explicit rear/front lens, supported by mobile browsers.
  try{
    const stream=await mediaDevices.getUserMedia(constraints(desiredFacing,true));
    const result=cameraInfo(stream,desiredFacing);
    if(!oldDeviceId||!result.deviceId||oldDeviceId!==result.deviceId)return result;
    stop(stream); // Browser ignored facingMode and returned the original device.
  }catch(error){
    if(!shouldFallbackCamera(error))throw error;
  }
  // Desktop multi-webcam fallback: select a DIFFERENT actual hardware device.
  if(!mediaDevices.enumerateDevices)throw new Error("別のカメラが見つかりません");
  const devices=(await mediaDevices.enumerateDevices())
    .filter(d=>d.kind==="videoinput"&&d.deviceId&&d.deviceId!==oldDeviceId);
  const preferred=desiredFacing==="environment"?/rear|back|environment|world|背面|外側/i:/front|user|facetime|前面|内側/i;
  devices.sort((a,b)=>Number(preferred.test(b.label||""))-Number(preferred.test(a.label||"")));
  for(const device of devices){
    try{
      const stream=await mediaDevices.getUserMedia({
        audio:false,video:{...videoOptions,deviceId:{exact:device.deviceId}}
      });
      const result=cameraInfo(stream,preferred.test(device.label||"")?desiredFacing:desiredFacing);
      // We know the selected device differs even if getSettings omits its deviceId.
      return {...result,deviceId:result.deviceId||device.deviceId};
    }catch(error){
      if(error?.name==="NotAllowedError"||error?.name==="SecurityError")throw error;
    }
  }
  throw new Error("切り替え可能な別のカメラがありません");
}
