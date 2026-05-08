const videoElement = document.querySelector(".input_video");
const canvasElement = document.querySelector(".output_canvas");
const canvasCtx = canvasElement.getContext("2d");
const particleCanvas = document.getElementById("particle_canvas");
const particleCtx = particleCanvas.getContext("2d");

canvasElement.width = 800;
canvasElement.height = 600;
particleCanvas.width = 500;
particleCanvas.height = 600;

let targetX = particleCanvas.width / 2;
let targetY = particleCanvas.height / 2;
let particleMode = "idle";

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

// ========== PARTICLE DENGAN KARAKTER RANDOM ==========
// Kumpulan karakter keren (bisa ditambah sesuai selera)
const CHAR_SET = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789♠♣♥♦←↑→↓⊕⊖⊗⊘⊙⌘⎈⏣⌬⏚⎔";

class Particle {
  constructor() {
    this.reset();
    this.vx = 0;
    this.vy = 0;
    this.age = Math.random() * 100;
  }
  
  reset() {
    this.x = Math.random() * particleCanvas.width;
    this.y = Math.random() * particleCanvas.height;
    this.size = Math.random() * 14 + 8; // ukuran font (px)
    this.baseSize = this.size;
    this.angle = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 0.08 + 0.04;
    this.vortexRadius = 40 + Math.random() * 90;
    this.vortexAngle = Math.random() * Math.PI * 2;
    this.char = CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
    this.color = "rgba(255,255,255,0.95)"; // dominan putih
    this.vx = 0;
    this.vy = 0;
    this.age = 0;
  }

  update() {
    this.age += 0.02;
    let ax = 0, ay = 0;
    const noiseX = Math.sin(this.age * 5 + this.angle) * 0.3;
    const noiseY = Math.cos(this.age * 5 + this.angle) * 0.3;

    switch (particleMode) {
      case "idle":
        this.angle += this.speed * 2;
        ax = Math.cos(this.angle) * 0.4 + noiseX;
        ay = Math.sin(this.angle) * 0.4 + noiseY;
        this.targetColor = "rgba(255,255,255,0.9)";
        this.targetSize = this.baseSize;
        break;

      case "follow":
        const dxf = targetX - this.x;
        const dyf = targetY - this.y;
        const distF = Math.sqrt(dxf*dxf+dyf*dyf) || 1;
        const forceF = 0.08 * Math.min(distF/30, 1);
        ax = dxf * forceF + Math.cos(this.angle * 6) * 1.5;
        ay = dyf * forceF + Math.sin(this.angle * 6) * 1.5;
        this.angle += this.speed;
        this.targetColor = distF < 50 ? "rgba(255,255,255,1)" : "rgba(200,220,255,0.9)";
        this.targetSize = this.baseSize * (1 + 1/(distF*0.05+1));
        break;

      case "grab":
        const dxg = targetX - this.x;
        const dyg = targetY - this.y;
        const distG = Math.sqrt(dxg*dxg+dyg*dyg) || 1;
        const forceG = 0.04;
        ax = dxg * forceG + Math.cos(this.angle * 10) * 2;
        ay = dyg * forceG + Math.sin(this.angle * 10) * 2;
        this.angle += this.speed;
        this.targetColor = distG < 30 ? "rgba(255,255,240,1)" : "rgba(255,255,200,0.8)";
        this.targetSize = this.baseSize * 0.8;
        break;

      case "vortex":
        this.vortexAngle += 0.09;
        const destX = targetX + Math.cos(this.vortexAngle) * this.vortexRadius;
        const destY = targetY + Math.sin(this.vortexAngle) * this.vortexRadius;
        const dxv = destX - this.x;
        const dyv = destY - this.y;
        ax = dxv * 0.1;
        ay = dyv * 0.1;
        this.targetColor = "rgba(255,255,255,0.85)";
        this.targetSize = this.baseSize * 1.3;
        break;

      case "disperse":
        const dx = this.x - targetX;
        const dy = this.y - targetY;
        const dist = Math.sqrt(dx*dx+dy*dy) || 1;
        ax = (dx / dist) * 1.8;
        ay = (dy / dist) * 1.8;
        this.targetColor = "rgba(255,200,200,0.8)";
        this.targetSize = this.baseSize * 0.7;
        break;

      case "explode":
        const ang = Math.atan2(this.y - targetY, this.x - targetX);
        ax = Math.cos(ang) * 4;
        ay = Math.sin(ang) * 4;
        this.targetColor = "rgba(255,255,255,0.9)";
        this.targetSize = this.baseSize * 1.5;
        // Ubah karakter secara cepat saat explode
        if (Math.random() < 0.3) this.char = CHAR_SET[Math.floor(Math.random() * CHAR_SET.length)];
        break;
    }

    this.vx += ax;
    this.vy += ay;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.x += this.vx;
    this.y += this.vy;

    // Lerp warna
    if (this.targetColor) {
      this.color = this.targetColor;
    }
    // Lerp ukuran
    this.size += (this.targetSize - this.size) * 0.2;

    if (this.x < -60 || this.x > particleCanvas.width + 60 ||
        this.y < -60 || this.y > particleCanvas.height + 60) {
      this.reset();
      this.x = Math.random() * particleCanvas.width;
      this.y = Math.random() * particleCanvas.height;
      this.vx = 0;
      this.vy = 0;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.font = `${this.size}px "Courier New", monospace`;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(255,255,255,0.8)";
    ctx.fillText(this.char, this.x, this.y);
    ctx.restore();
  }
}

// Buat 300 partikel karakter
const particles = [];
for (let i = 0; i < 300; i++) {
  particles.push(new Particle());
}

// Buffer trail
const trailBuffer = document.createElement("canvas");
trailBuffer.width = particleCanvas.width;
trailBuffer.height = particleCanvas.height;
const trailCtx = trailBuffer.getContext("2d");

function animateParticles() {
  // Trail lebih transparan agar karakter tidak terlalu cepat hilang
  trailCtx.fillStyle = "rgba(0, 0, 0, 0.22)";
  trailCtx.fillRect(0, 0, particleCanvas.width, particleCanvas.height);

  for (const p of particles) {
    p.update();
    p.draw(trailCtx);
  }

  // Jaringan antar partikel (putih sangat tipis) – opsional, bisa dihapus jika mengganggu
  trailCtx.save();
  trailCtx.strokeStyle = "rgba(255,255,255,0.04)";
  trailCtx.lineWidth = 0.5;
  const maxDist = 50;
  for (let i = 0; i < particles.length; i++) {
    const pi = particles[i];
    for (let j = i + 1; j < particles.length; j++) {
      const pj = particles[j];
      const dx = pi.x - pj.x;
      const dy = pi.y - pj.y;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (dist < maxDist) {
        trailCtx.beginPath();
        trailCtx.moveTo(pi.x, pi.y);
        trailCtx.lineTo(pj.x, pj.y);
        trailCtx.stroke();
      }
    }
  }
  trailCtx.restore();

  particleCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  particleCtx.drawImage(trailBuffer, 0, 0);
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ========== MEDIAPIPE DETECTION (TANPA MIRROR) ==========
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

function onResults(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  let fingerCount = 0;
  let handDetected = false;
  let indexTip = null;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    const landmarks = results.multiHandLandmarks[0];

    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#ffffff", lineWidth: 3 });
    drawLandmarks(canvasCtx, landmarks, { color: "#aaaaaa", lineWidth: 2 });

    // Koordinat teks
    canvasCtx.save();
    canvasCtx.font = '9px "Courier New", monospace';
    canvasCtx.fillStyle = "#ffffff";
    canvasCtx.shadowBlur = 6;
    canvasCtx.shadowColor = "#ffffff";
    const labels = ["0","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20"];
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const displayX = lm.x * canvasElement.width;
      const displayY = lm.y * canvasElement.height;
      canvasCtx.fillText(`${labels[i]}`, displayX + 6, displayY - 6);
    }
    canvasCtx.restore();

    fingerCount = countFingers(landmarks);
    const indexUp = isFingerUp(8, 6, landmarks);
    const middleUp = isFingerUp(12, 10, landmarks);
    const ringUp = isFingerUp(16, 14, landmarks);

    const finger = landmarks[8];
    const x = finger.x * particleCanvas.width;
    const y = finger.y * particleCanvas.height;

    // Mode partikel
    if (fingerCount === 1 && indexUp) {
      particleMode = "follow";
      targetX = x;
      targetY = y;
    } else if (fingerCount === 2 && indexUp && middleUp) {
      particleMode = "vortex";
      targetX = x;
      targetY = y;
    } else if (fingerCount === 3 && indexUp && middleUp && ringUp) {
      particleMode = "disperse";
      targetX = x;
      targetY = y;
    } else if (fingerCount >= 4) {
      particleMode = "explode";
    } else if (fingerCount === 0) {
      particleMode = "grab";
      targetX = x;
      targetY = y;
    } else {
      particleMode = "idle";
    }

    // Index tip untuk info (koordinat mirror agar seperti bercermin)
    indexTip = {
      x: (1 - finger.x) * canvasElement.width,
      y: finger.y * canvasElement.height
    };
  } else {
    particleMode = "idle";
  }

  

  // Garis bantu target (putih)
  if (handDetected && (particleMode === "follow" || particleMode === "grab" || particleMode === "vortex")) {
    if (indexTip) {
      canvasCtx.save();
      canvasCtx.strokeStyle = "#ffffff";
      canvasCtx.shadowColor = "#ffffff";
      canvasCtx.shadowBlur = 6;
      canvasCtx.beginPath();
      canvasCtx.moveTo(indexTip.x, indexTip.y);
      const targetDisplayX = targetX * (canvasElement.width / particleCanvas.width);
      const targetDisplayY = targetY * (canvasElement.height / particleCanvas.height);
      canvasCtx.lineTo(targetDisplayX, targetDisplayY);
      canvasCtx.stroke();
      canvasCtx.beginPath();
      canvasCtx.arc(targetDisplayX, targetDisplayY, 8, 0, Math.PI * 2);
      canvasCtx.stroke();
      canvasCtx.restore();
    }
  }
}

// Kamera
let lastFrameTime = 0;
const FPS = 20;
const camera = new Camera(videoElement, {
  onFrame: async () => {
    const now = Date.now();
    if (now - lastFrameTime < 1000 / FPS) return;
    lastFrameTime = now;
    await hands.send({ image: videoElement });
  },
  width: 480,
  height: 360
});
camera.start();