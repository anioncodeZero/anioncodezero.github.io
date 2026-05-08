const videoElement = document.querySelector(".input_video");

const canvasElement = document.querySelector(".output_canvas");
const canvasCtx = canvasElement.getContext("2d");

const drawingCanvas = document.querySelector(".drawing_canvas");
const drawingCtx = drawingCanvas.getContext("2d");

const particleCanvas = document.getElementById("particle_canvas");
const particleCtx = particleCanvas.getContext("2d");

// SIZE
canvasElement.width = 800;
canvasElement.height = 600;

drawingCanvas.width = 800;
drawingCanvas.height = 600;

particleCanvas.width = 500;
particleCanvas.height = 600;

// MODE
let mode = "normal";

// DRAW
let lastX = 0;
let lastY = 0;

// PARTICLE
let targetX = particleCanvas.width / 2;
let targetY = particleCanvas.height / 2;

let particleMode = "idle";

// BUTTONS
document.getElementById("btnnormal").onclick = () => {
  mode = "normal";
};

document.getElementById("btndrawing").onclick = () => {
  mode = "drawing";
};

document.getElementById("btnclear").onclick = () => {

  drawingCtx.clearRect(
    0,
    0,
    drawingCanvas.width,
    drawingCanvas.height
  );
};

// FINGER
function isFingerUp(tip, base, landmarks) {

  return landmarks[tip].y < landmarks[base].y;
}

// COUNT
function countFingers(landmarks) {

  let count = 0;

  if (landmarks[8].y < landmarks[6].y) count++;

  if (landmarks[12].y < landmarks[10].y) count++;

  if (landmarks[16].y < landmarks[14].y) count++;

  if (landmarks[20].y < landmarks[18].y) count++;

  return count;
}

// PARTICLE CLASS
class Particle {

  constructor() {

    this.reset();
  }

  reset() {

    this.x = Math.random() * particleCanvas.width;

    this.y = Math.random() * particleCanvas.height;

    this.size = Math.random() * 3 + 1;

    this.angle = Math.random() * Math.PI * 2;

    this.speed = Math.random() * 0.1 + 0.05;
  }

  update() {

    this.angle += this.speed;

    // IDLE
    if (particleMode === "idle") {

      this.x += Math.cos(this.angle) * 1.5;

      this.y += Math.sin(this.angle) * 1.5;
    }

    // FOLLOW
    if (particleMode === "follow") {

      this.x += (targetX - this.x) * 0.05;

      this.y += (targetY - this.y) * 0.05;

      this.x += Math.cos(this.angle * 5) * 2;

      this.y += Math.sin(this.angle * 5) * 2;
    }

    // GRAB
    if (particleMode === "grab") {

      this.x += (targetX - this.x) * 0.03;

      this.y += (targetY - this.y) * 0.03;

      this.x += Math.cos(this.angle * 8) * 3;

      this.y += Math.sin(this.angle * 8) * 3;
    }

    // EXPLODE
    if (particleMode === "explode") {

      this.x += Math.cos(this.angle) * 5;

      this.y += Math.sin(this.angle) * 5;
    }

    // RESET
    if (
      this.x < -50 ||
      this.x > particleCanvas.width + 50 ||
      this.y < -50 ||
      this.y > particleCanvas.height + 50
    ) {

      this.reset();
    }
  }

  draw() {

    particleCtx.beginPath();

    particleCtx.arc(
      this.x,
      this.y,
      this.size,
      0,
      Math.PI * 2
    );

    particleCtx.fillStyle = "#00ff88";

    particleCtx.shadowBlur = 15;

    particleCtx.shadowColor = "#00ff88";

    particleCtx.fill();
  }
}

// PARTICLES
const particles = [];

for (let i = 0; i < 200; i++) {

  particles.push(new Particle());
}

// PARTICLE LOOP
function animateParticles() {

  particleCtx.clearRect(
    0,
    0,
    particleCanvas.width,
    particleCanvas.height
  );

  if (mode === "normal") {

    for (const p of particles) {

      p.update();

      p.draw();
    }
  }

  requestAnimationFrame(animateParticles);
}

animateParticles();

// MAIN
function onResults(results) {

  canvasCtx.clearRect(
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );

  if (results.multiHandLandmarks) {

    for (const landmarks of results.multiHandLandmarks) {

      drawConnectors(
        canvasCtx,
        landmarks,
        HAND_CONNECTIONS,
        {
          color: "#00ff88",
          lineWidth: 4
        }
      );

      drawLandmarks(
        canvasCtx,
        landmarks,
        {
          color: "#ff0000",
          lineWidth: 2
        }
      );

      // NORMAL MODE
      if (mode === "normal") {

        const fingerCount = countFingers(landmarks);

        const indexUp = isFingerUp(8, 6, landmarks);

        const middleUp = isFingerUp(12, 10, landmarks);

        const finger = landmarks[8];

        const x =
          finger.x * drawingCanvas.width;
        const y =
          finger.y * drawingCanvas.height;

        // FOLLOW
        if (indexUp && !middleUp) {

          particleMode = "follow";

          targetX = x;
          targetY = y;
        }

        // OPENs
        else if (fingerCount >= 4) {

          particleMode = "explode";
        }

        // GRAB
        else if (fingerCount === 0) {

          particleMode = "grab";

          targetX = x;
          targetY = y;
        }

        // IDLE
        else {

          particleMode = "idle";
        }
      }

      // DRAWING MODE
      if (mode === "drawing") {

        const indexUp = isFingerUp(8, 6, landmarks);

        const middleUp = isFingerUp(12, 10, landmarks);

        const finger = landmarks[8];

        const x =
          (1 - finger.x) * drawingCanvas.width;

        const y =
          finger.y * drawingCanvas.height;

        // DRAW
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

        // ERASE
        if (indexUp && middleUp) {

          drawingCtx.clearRect(
            x - 30,
            y - 30,
            60,
            60
          );
        }
      }
    }
  }

  else {

    particleMode = "idle";
  }
}

// MEDIAPIPE
const hands = new Hands({

  locateFile: (file) => {

    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({

  maxNumHands: 1,

  modelComplexity: 1,

  minDetectionConfidence: 0.7,

  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

// CAMERA
const camera = new Camera(videoElement, {

  onFrame: async () => {

    await hands.send({
      image: videoElement
    });
  },

  width: 800,

  height: 600
});

camera.start();