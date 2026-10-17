// Prefer the outward-facing camera on phones. Never mirror the rear view.
const videoOpts={width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}};
export function shouldFallbackCamera(error){
  return error?.name==="OverconstrainedError"||error?.name==="NotFoundError";
}
export async function openRearCamera(mediaDevices){
  if(!mediaDevices?.getUserMedia)throw new Error("Camera API requires HTTPS or localhost");
  try{
    const stream=await mediaDevices.getUserMedia({
      audio:false,video:{...videoOpts,facingMode:{exact:"environment"}}
    });
    return {stream,rearRequested:true};
  }catch(error){
    if(!shouldFallbackCamera(error))throw error;
    // Desktop or phone without a rear camera: a usable video feed is better
    // than a broken experience, but rear is still explicitly preferred.
    const stream=await mediaDevices.getUserMedia({
      audio:false,video:{...videoOpts,facingMode:{ideal:"environment"}}
    });
    return {stream,rearRequested:false};
  }
}
