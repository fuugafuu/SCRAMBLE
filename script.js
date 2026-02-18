const video = document.getElementById("camera");
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status");
const modeLabel = document.getElementById("modeLabel");
const trackLabel = document.getElementById("trackLabel");

let scrambleOn = true;
let faceDetector = null;
let tracks = [];
let nextTrackId = 1;
let detecting = false;
let lastDetectAt = 0;
let detectEveryMs = 110;

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

function boxCenter(b) {
  return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
}

function distanceSq(a, b) {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  return dx * dx + dy * dy;
}

function updateTracks(detections) {
  const now = performance.now();
  const usedTracks = new Set();

  for (const det of detections) {
    const detCenter = boxCenter(det);
    let best = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const tr of tracks) {
      if (usedTracks.has(tr.id)) continue;
      const pred = {
        x: tr.x + tr.vx,
        y: tr.y + tr.vy,
        width: tr.width,
        height: tr.height,
      };
      const predCenter = boxCenter(pred);
      const score = distanceSq(detCenter, predCenter);
      const gate = Math.max(tr.width, tr.height, det.width, det.height) ** 2;
      if (score < gate && score < bestScore) {
        best = tr;
        bestScore = score;
      }
    }

    if (!best) {
      tracks.push({
        id: nextTrackId++,
        x: det.x,
        y: det.y,
        width: det.width,
        height: det.height,
        vx: 0,
        vy: 0,
        miss: 0,
        lastSeen: now,
      });
      continue;
    }

    const alpha = 0.42;
    const nx = best.x + (det.x - best.x) * alpha;
    const ny = best.y + (det.y - best.y) * alpha;
    const nw = best.width + (det.width - best.width) * alpha;
    const nh = best.height + (det.height - best.height) * alpha;

    best.vx = nx - best.x;
    best.vy = ny - best.y;
    best.x = nx;
    best.y = ny;
    best.width = nw;
    best.height = nh;
    best.miss = 0;
    best.lastSeen = now;
    usedTracks.add(best.id);
  }

  tracks = tracks
    .map((tr) => {
      if (!usedTracks.has(tr.id)) {
        tr.miss += 1;
        tr.x += tr.vx * 0.9;
        tr.y += tr.vy * 0.9;
      }
      return tr;
    })
    .filter((tr) => tr.miss <= 8 && now - tr.lastSeen < 1200);
}

function drawTrackedMask(face) {
  const x = face.x;
  const y = face.y;
  const w = face.width;
  const h = face.height;

  const plateY = y + h * 0.28;
  const plateH = h * 0.46;

  ctx.save();
  ctx.globalAlpha = 0.99;

  ctx.fillStyle = "#02060eef";
  ctx.strokeStyle = "#7ae7ffaa";
  ctx.lineWidth = Math.max(1.5, w * 0.013);

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

  const lineCount = 11;
  for (let i = 0; i < lineCount; i++) {
    const ly = plateY + ((i + Math.random() * 0.15) * plateH) / lineCount;
    const lx = x + w * (0.08 + Math.random() * 0.06);
    const lw = w * (0.8 + Math.random() * 0.1);
    ctx.strokeStyle = i % 2 === 0 ? "#8fe4ff66" : "#a5ffd155";
    ctx.lineWidth = Math.max(1, w * 0.005);
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(Math.min(x + w - w * 0.06, lx + lw), ly + (Math.random() - 0.5) * 1.5);
    ctx.stroke();
  }

  ctx.restore();
}

async function detectFaces() {
  if (!faceDetector || detecting || video.readyState < 2) return;

  const now = performance.now();
  if (now - lastDetectAt < detectEveryMs) return;

  detecting = true;
  lastDetectAt = now;
  const t0 = performance.now();

  try {
    const faces = await faceDetector.detect(video);
    const vw = video.videoWidth || canvas.width;
    const vh = video.videoHeight || canvas.height;

    const sx = canvas.width / vw;
    const sy = canvas.height / vh;

    const mapped = faces.map((f) => ({
      x: f.boundingBox.x * sx - f.boundingBox.width * sx * 0.12,
      y: f.boundingBox.y * sy - f.boundingBox.height * sy * 0.08,
      width: f.boundingBox.width * sx * 1.24,
      height: f.boundingBox.height * sy * 1.24,
    }));

    mapped.sort((a, b) => b.width * b.height - a.width * a.height);
    updateTracks(mapped.slice(0, 3));

    trackLabel.textContent = `TRACK: ${tracks.length > 0 ? `FACE x${tracks.length}` : "SEARCH"}`;
  } catch (error) {
    trackLabel.textContent = "TRACK: ERROR";
    console.error(error);
  } finally {
    const dt = performance.now() - t0;
    detectEveryMs = Math.min(180, Math.max(80, dt * 1.6));
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

    for (const tr of tracks) {
      drawTrackedMask(tr);
    }
  }

  requestAnimationFrame(render);
}

async function start() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    resizeCanvas();

    statusText.textContent = "CAM: LINKED";

    if ("FaceDetector" in window) {
      faceDetector = new window.FaceDetector({ fastMode: false, maxDetectedFaces: 6 });
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
