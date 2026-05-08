const videoElement = document.querySelector(".input_video");
const canvasElement = document.querySelector(".output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const drawingCanvas = document.querySelector(".drawing_canvas");
const drawingCtx = drawingCanvas.getContext("2d");
const particleCanvas = document.getElementById("particle_canvas");
const particleCtx = particleCanvas.getContext("2d");

canvasElement.width = 800;
canvasElement.height = 600;
drawingCanvas.width = 800;
drawingCanvas.height = 600;
particleCanvas.width = 500;
particleCanvas.height = 600;

let mode = "normal";
let lastX = 0;
let lastY = 0;

let qcTime = 0;
let qcRotation = 0;
let qcScale = 0.015;
let qcColorShift = 0;

let ballX = 400;
let ballY = 300;
let ballRadius = 50;
let ballActive = false;
let ballTargetX = 400;
let ballTargetY = 300;
let ballVelocityX = 0;
let ballVelocityY = 0;

document.getElementById("btnnormal").onclick = () => { mode = "normal"; };
document.getElementById("btndrawing").onclick = () => { mode = "drawing"; };
document.getElementById("btnquasicrystal").onclick = () => { mode = "quasicrystal"; };
document.getElementById("btnballmatrix").onclick = () => { mode = "ballmatrix"; };

document.getElementById("btnclear").onclick = () => {
  drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
};

function isFingerUp(tip, base, landmarks) {
  return landmarks[tip].y < landmarks[base].y;
}

function countFingers(landmarks) {
  let count = 0;
  if (landmarks[8].y < landmarks[6].y) count++;
  if (landmarks[12].y < landmarks[10].y) count++;
  if (landmarks[16].y < landmarks[14].y) count++;
  if (landmarks[20].y < landmarks[18].y) count++;
  return count;
}

function hslToRgb(h, s, l) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function drawQuasicrystal() {
  const width = particleCanvas.width;
  const height = particleCanvas.height;
  const imageData = particleCtx.createImageData(width, height);
  const data = imageData.data;
  const time = qcTime;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const cosR = Math.cos(qcRotation);
      const sinR = Math.sin(qcRotation);
      const rx = dx * cosR - dy * sinR + centerX;
      const ry = dx * sinR + dy * cosR + centerY;

      let value = 0;
      const beams = 10;
      for (let i = 0; i < beams; i++) {
        const angle = (i / beams) * Math.PI * 2;
        value += Math.sin(rx * Math.cos(angle) * qcScale + ry * Math.sin(angle) * qcScale + time);
      }

      const normalized = (value / beams + 1) * 0.5;
      const hue = (normalized * 120 + qcColorShift) % 360;
      const rgb = hslToRgb(hue / 360, 0.8, 0.5);
      const idx = (y * width + x) * 4;
      data[idx] = rgb.r;
      data[idx + 1] = rgb.g;
      data[idx + 2] = rgb.b;
      data[idx + 3] = 255;
    }
  }
  particleCtx.putImageData(imageData, 0, 0);
}

function animateQuasicrystal() {
  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  qcTime += 0.02;
  if (mode === "normal" || mode === "quasicrystal") {
    drawQuasicrystal();
  }
  requestAnimationFrame(animateQuasicrystal);
}

animateQuasicrystal();

function draw3DBall(ctx, x, y, radius) {
  ctx.save();

  const time = Date.now() * 0.003;
  const tiltX = Math.sin(time * 0.5) * 0.3;
  const tiltY = Math.cos(time * 0.3) * 0.3;

  ctx.translate(x, y);
  ctx.rotate(tiltY);

  ctx.strokeStyle = "#00ff88";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#00ff88";

  const latLines = 8;
  const lonLines = 12;

  for (let i = 0; i <= latLines; i++) {
    const lat = (i / latLines) * Math.PI - Math.PI / 2;
    const r = Math.cos(lat) * radius;
    const yPos = Math.sin(lat) * radius;

    ctx.beginPath();
    ctx.ellipse(0, yPos, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < lonLines; i++) {
    const lon = (i / lonLines) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(lon) * Math.cos(0) * radius,
      Math.sin(0) * radius
    );
    for (let j = 1; j <= latLines; j++) {
      const lat = (j / latLines) * Math.PI - Math.PI / 2;
      ctx.lineTo(
        Math.cos(lon) * Math.cos(lat) * radius,
        Math.sin(lat) * radius
      );
    }
    ctx.stroke();
  }

  ctx.restore();
}

function onResults(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks) {
    // BALL MATRIX - store state first
    if (mode === "ballmatrix" && results.multiHandLandmarks.length >= 2) {
      const hand1 = results.multiHandLandmarks[0];
      const hand2 = results.multiHandLandmarks[1];

      const fingers1 = countFingers(hand1);
      const fingers2 = countFingers(hand2);

      ballActive = true;

      // Both hands fist (0 fingers) - resize ball
      if (fingers1 === 0 && fingers2 === 0) {
        const index1 = hand1[8];
        const index2 = hand2[8];
        const dx = (index1.x - index2.x) * canvasElement.width;
        const dy = (index1.y - index2.y) * canvasElement.height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        ballRadius = Math.max(20, Math.min(150, distance * 0.5));
      }
      // One hand fist - ball follows open hand with animation
      else if (fingers1 === 0 || fingers2 === 0) {
        const openHand = fingers1 === 0 ? hand2 : hand1;
        const indexFinger = openHand[8];
        ballTargetX = indexFinger.x * canvasElement.width;
        ballTargetY = indexFinger.y * canvasElement.height;
      }
      // Default position
      else {
        ballTargetX = canvasElement.width / 2;
        ballTargetY = canvasElement.height / 2;
      }
    }

    for (const landmarks of results.multiHandLandmarks) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#00ff88", lineWidth: 4 });
      drawLandmarks(canvasCtx, landmarks, { color: "#ff0000", lineWidth: 2 });

      if (mode === "normal" || mode === "quasicrystal") {
        const finger = landmarks[8];
        const x = finger.x * particleCanvas.width;
        const y = finger.y * particleCanvas.height;

        qcRotation = (x / particleCanvas.width - 0.5) * Math.PI;

        const middleFinger = landmarks[12];
        const middleX = middleFinger.x * particleCanvas.width;
        const middleY = middleFinger.y * particleCanvas.height;
        const distance = Math.sqrt(Math.pow(x - middleX, 2) + Math.pow(y - middleY, 2));
        qcScale = 0.01 + (distance / 200) * 0.03;

        const thumb = landmarks[4];
        qcColorShift = thumb.x * 180;
      }

      if (mode === "drawing") {
        const indexUp = isFingerUp(8, 6, landmarks);
        const middleUp = isFingerUp(12, 10, landmarks);
        const finger = landmarks[8];
        const x = (1 - finger.x) * drawingCanvas.width;
        const y = finger.y * drawingCanvas.height;

        if (indexUp && !middleUp) {
          drawingCtx.strokeStyle = "#00ff88";
          drawingCtx.lineWidth = 5;
          drawingCtx.shadowBlur = 15;
          drawingCtx.shadowColor = "#00ff88";
          drawingCtx.beginPath();
          drawingCtx.moveTo(lastX, lastY);
          drawingCtx.lineTo(x, y);
          drawingCtx.stroke();
          lastX = x;
          lastY = y;
        }
        if (indexUp && middleUp) {
          drawingCtx.clearRect(x - 30, y - 30, 60, 60);
        }
      }
    }

    // Update ball position with animation
    if (mode === "ballmatrix" && ballActive) {
      const dx = ballTargetX - ballX;
      const dy = ballTargetY - ballY;
      ballVelocityX += dx * 0.05;
      ballVelocityY += dy * 0.05;
      ballVelocityX *= 0.85;
      ballVelocityY *= 0.85;
      ballX += ballVelocityX;
      ballY += ballVelocityY;

      // Draw 3D ball
      draw3DBall(canvasCtx, ballX, ballY, ballRadius);
    }
  } else {
    ballActive = false;
    qcTime = 0;
  }
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 800,
  height: 600
});

camera.start();
