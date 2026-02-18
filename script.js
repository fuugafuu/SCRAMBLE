const video = document.getElementById("camera");
const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const toggle = document.getElementById("toggle");
const statusText = document.getElementById("status");
const modeLabel = document.getElementById("modeLabel");

let scrambleOn = true;

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

function render() {
  if (video.readyState >= 2) {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (scrambleOn) {
      applyScramble(frame);
    }

    ctx.putImageData(frame, 0, 0);
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
    requestAnimationFrame(render);
  } catch (error) {
    console.error(error);
    statusText.textContent = "CAM: ACCESS DENIED";
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
