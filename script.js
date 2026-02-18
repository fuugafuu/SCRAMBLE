const video = document.getElementById("camera");
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status");
const modeLabel = document.getElementById("modeLabel");
const trackLabel = document.getElementById("trackLabel");

let scrambleOn = true;
let faceDetector = null;
let trackedFaces = [];
let detecting = false;
let lastDetectAt = 0;

function resizeCanvas() {
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = Math.floor(canvas.clientWidth * dpr);
  canvas.height = Math.floor(canvas.clientHeight * dpr);
}

function applyScramble(frame) {
  const { width, height, data } = frame;

  const baseBlock = Math.max(8, Math.floor(width / 80));
  const cols = Math.ceil(width / baseBlock);
  const rows = Math.ceil(height / baseBlock);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (Math.random() > 0.5) continue;

      const dstX = gx * baseBlock;
      const dstY = gy * baseBlock;
      const srcX = Math.floor(Math.random() * cols) * baseBlock;
      const srcY = Math.floor(Math.random() * rows) * baseBlock;

      for (let py = 0; py < baseBlock; py++) {
        for (let px = 0; px < baseBlock; px++) {
          const x1 = srcX + px;
          const y1 = srcY + py;
          const x2 = dstX + px;
          const y2 = dstY + py;
          if (x1 >= width || y1 >= height || x2 >= width || y2 >= height) continue;

          const src = (y1 * width + x1) * 4;
          const dst = (y2 * width + x2) * 4;
          const rgbOffset = 12;
          const rSrc = Math.min(data.length - 4, src + rgbOffset * 4);
          const bSrc = Math.max(0, src - rgbOffset * 4);

          data[dst] = data[rSrc];
          data[dst + 1] = data[src + 1];
          data[dst + 2] = data[bSrc + 2];
        }
      }
    }
  }

  if (Math.random() < 0.25) {
    const bandY = Math.floor(Math.random() * height);
    const bandH = Math.max(2, Math.floor(height * 0.012));
    for (let y = bandY; y < Math.min(height, bandY + bandH); y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        data[i] = Math.min(255, data[i] + 26);
        data[i + 1] = Math.min(255, data[i + 1] + 10);
        data[i + 2] = Math.min(255, data[i + 2] + 30);
      }
    }
  }
}

function smoothFaces(nextFaces) {
  if (!trackedFaces.length) {
    trackedFaces = nextFaces;
    return;
  }

  trackedFaces = nextFaces.map((face, i) => {
    const prev = trackedFaces[i] || face;
    const a = 0.35;
    return {
      x: prev.x + (face.x - prev.x) * a,
      y: prev.y + (face.y - prev.y) * a,
      width: prev.width + (face.width - prev.width) * a,
      height: prev.height + (face.height - prev.height) * a,
    };
  });
}

function drawTrackedMask(face) {
  const x = face.x;
  const y = face.y;
  const w = face.width;
  const h = face.height;

  const plateY = y + h * 0.32;
  const plateH = h * 0.38;

  ctx.save();
  ctx.globalAlpha = 0.98;

  ctx.fillStyle = "#04080eee";
  ctx.strokeStyle = "#7ae7ff88";
  ctx.lineWidth = Math.max(1.5, w * 0.014);

  const r = Math.max(8, w * 0.12);
  ctx.beginPath();
  ctx.moveTo(x + r, plateY);
  ctx.lineTo(x + w - r, plateY);
  ctx.quadraticCurveTo(x + w, plateY, x + w, plateY + r);
  ctx.lineTo(x + w, plateY + plateH - r);
  ctx.quadraticCurveTo(x + w, plateY + plateH, x + w - r, plateY + plateH);
  ctx.lineTo(x + r, plateY + plateH);
  ctx.quadraticCurveTo(x, plateY + plateH, x, plateY + plateH - r);
  ctx.lineTo(x, plateY + r);
  ctx.quadraticCurveTo(x, plateY, x + r, plateY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const lineCount = 9;
  for (let i = 0; i < lineCount; i++) {
    const ly = plateY + ((i + Math.random() * 0.2) * plateH) / lineCount;
    const lx = x + w * (0.08 + Math.random() * 0.08);
    const lw = w * (0.78 + Math.random() * 0.12);
    ctx.strokeStyle = i % 2 === 0 ? "#8fe4ff66" : "#a5ffd155";
    ctx.lineWidth = Math.max(1, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(Math.min(x + w - w * 0.06, lx + lw), ly + (Math.random() - 0.5) * 2);
    ctx.stroke();
  }

  ctx.restore();
}

async function detectFaces() {
  if (!faceDetector || detecting || video.readyState < 2) return;

  const now = performance.now();
  if (now - lastDetectAt < 180) return;

  detecting = true;
  lastDetectAt = now;
  try {
    const faces = await faceDetector.detect(video);
    const vw = video.videoWidth || canvas.width;
    const vh = video.videoHeight || canvas.height;

    const sx = canvas.width / vw;
    const sy = canvas.height / vh;

    const mapped = faces.map((f) => ({
      x: f.boundingBox.x * sx - f.boundingBox.width * sx * 0.08,
      y: f.boundingBox.y * sy - f.boundingBox.height * sy * 0.06,
      width: f.boundingBox.width * sx * 1.16,
      height: f.boundingBox.height * sy * 1.2,
    }));

    smoothFaces(mapped);
    trackLabel.textContent = `TRACK: ${mapped.length > 0 ? `FACE x${mapped.length}` : "SEARCH"}`;
  } catch (error) {
    trackLabel.textContent = "TRACK: ERROR";
    console.error(error);
  } finally {
    detecting = false;
  }
}

function render() {
  if (video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (scrambleOn) {
      applyScramble(frame);
    }

    ctx.putImageData(frame, 0, 0);
    detectFaces();

    for (const face of trackedFaces) {
      drawTrackedMask(face);
    }
  }

  requestAnimationFrame(render);
}

async function start() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    resizeCanvas();

    statusText.textContent = "CAM: LINKED";

    if ("FaceDetector" in window) {
      faceDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
      trackLabel.textContent = "TRACK: READY";
    } else {
      trackLabel.textContent = "TRACK: UNSUPPORTED";
    }

    requestAnimationFrame(render);
  } catch (error) {
    console.error(error);
    statusText.textContent = "CAM: ACCESS DENIED";
    trackLabel.textContent = "TRACK: OFFLINE";
  }
}

function updateModeLabel() {
  modeLabel.textContent = `MODE: ${scrambleOn ? "SCRAMBLE" : "NORMAL"}`;
  toggle.textContent = scrambleOn ? "SCRAMBLE OFF" : "SCRAMBLE ON";
}

toggle.addEventListener("click", () => {
  scrambleOn = !scrambleOn;
  updateModeLabel();
});

window.addEventListener("resize", resizeCanvas);

updateModeLabel();
start();
