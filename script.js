const videoElement = document.querySelector(".input_video");
const canvasElement = document.querySelector(".output_canvas");
const canvasCtx = canvasElement.getContext("2d");

canvasElement.width = 800;
canvasElement.height = 600;

// ========== AESTHETIC PALETTE ==========
const C = { r: 190, g: 210, b: 240 };
const glow = (a) => `rgba(${C.r},${C.g},${C.b},${a})`;
const dim = (a) => `rgba(${C.r},${C.g},${C.b},${a})`;
const accent = (a) => `rgba(${C.r + 30},${C.g + 20},${C.b + 40},${a})`;

// ========== STATE ==========
let ball = {
  x: 400, y: 300,
  radius: 55, targetRadius: 55,
  rotation: 0, targetRotation: 0,
  vx: 0, vy: 0,
  active: false,
  shape: 0,        // 0=circle, 1=diamond, 2=box, 3=star
  shapeFloat: 0,   // smooth continuous shape value
  prevShapeFloat: 0,
  phase: 0,
  handAngle: 0,
  handDist: 0
};

let idleTime = 0;
let globalTime = 0;
let textAlpha = 0;
let currentText = "Show Your Hand";
let textPulse = 0;

// Trail data
const trail = [];
const MAX_TRAIL = 18;

// Ambient particles
const ambientParticles = [];
const MAX_AMBIENT = 60;

// Spark burst on gesture change
const sparks = [];
const MAX_SPARKS = 30;

let lastShapeIndex = -1;
let lastRawAngle = null;

// ========== HAND MATH ==========

function isFingerUp(tip, base, lm) { return lm[tip].y < lm[base].y; }

function countFingers(lm) {
  let c = 0;
  if (lm[8].y < lm[6].y) c++;
  if (lm[12].y < lm[10].y) c++;
  if (lm[16].y < lm[14].y) c++;
  if (lm[20].y < lm[18].y) c++;
  return c;
}

function getWrist(lm) { return { x: lm[0].x * 800, y: lm[0].y * 600 }; }
function getIndex(lm) { return { x: lm[8].x * 800, y: lm[8].y * 600 }; }
function getMiddle(lm) { return { x: lm[12].x * 800, y: lm[12].y * 600 }; }

function getHandAngle(lm) {
  const w = getWrist(lm);
  const m = getMiddle(lm);
  return Math.atan2(m.y - w.y, m.x - w.x);
}

function getHandDist(lm) {
  const w = getWrist(lm);
  const m = getMiddle(lm);
  const dx = m.x - w.x, dy = m.y - w.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getHandCenter(lm) {
  let sx = 0, sy = 0;
  for (let i = 0; i < lm.length; i++) { sx += lm[i].x; sy += lm[i].y; }
  return { x: (sx / lm.length) * 800, y: (sy / lm.length) * 600 };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
function normalizeAngle(a) { return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); }

// Angle to shape: divide circle into 4 segments with smooth blending
function angleToShape(angle) {
  const norm = normalizeAngle(angle);
  const sector = norm / (Math.PI * 2) * 4; // 0-4
  return sector; // continuous float 0..4 mapping to circle→diamond→box→star→circle
}

// ========== AMBIENT PARTICLES ==========

function spawnAmbient(x, y) {
  if (ambientParticles.length >= MAX_AMBIENT) return;
  const angle = Math.random() * Math.PI * 2;
  const speed = 0.1 + Math.random() * 0.5;
  ambientParticles.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 0.1,
    life: 0.5 + Math.random() * 0.5,
    decay: 0.003 + Math.random() * 0.005,
    size: 1 + Math.random() * 2.5,
    wobble: Math.random() * Math.PI * 2
  });
}

function updateAmbient() {
  for (let i = ambientParticles.length - 1; i >= 0; i--) {
    const p = ambientParticles[i];
    p.wobble += 0.02;
    p.x += p.vx + Math.sin(p.wobble) * 0.15;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) ambientParticles.splice(i, 1);
  }
}

function drawAmbient() {
  for (const p of ambientParticles) {
    canvasCtx.save();
    canvasCtx.globalAlpha = p.life * 0.15;
    canvasCtx.fillStyle = glow(1);
    canvasCtx.beginPath();
    canvasCtx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.restore();
  }
}

// ========== SPARK BURST ==========

function spawnSparks(x, y, count) {
  for (let i = 0; i < count && sparks.length < MAX_SPARKS; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    sparks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
      size: 1.5 + Math.random() * 2
    });
  }
}

function updateSparks() {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx; s.y += s.vy;
    s.vx *= 0.95; s.vy *= 0.95;
    s.life -= s.decay;
    if (s.life <= 0) sparks.splice(i, 1);
  }
}

function drawSparks() {
  for (const s of sparks) {
    canvasCtx.save();
    canvasCtx.globalAlpha = s.life * 0.8;
    canvasCtx.fillStyle = `rgba(220,245,255,${s.life})`;
    canvasCtx.shadowBlur = 6;
    canvasCtx.shadowColor = `rgba(200,230,255,${s.life * 0.5})`;
    canvasCtx.beginPath();
    canvasCtx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.restore();
  }
}

// ========== TRAIL ==========

function updateTrail() {
  if (ball.active) {
    trail.push({ x: ball.x, y: ball.y, r: ball.radius * 0.4, shape: ball.shapeFloat, alpha: 0.6 });
    if (trail.length > MAX_TRAIL) trail.shift();
  } else {
    while (trail.length > 0) trail.shift();
  }
}

function drawTrailShape(tx, ty, tr, shapeVal, a) {
  canvasCtx.save();
  canvasCtx.globalAlpha = a;
  canvasCtx.strokeStyle = "rgba(190,210,240,0.15)";
  canvasCtx.lineWidth = 1.2;
  const s = tr * (0.6 + shapeVal * 0.1);
  const corners = Math.round(shapeVal) !== shapeVal;

  if (shapeVal < 1) {
    // Circle
    canvasCtx.beginPath();
    canvasCtx.arc(tx, ty, s * 0.35, 0, Math.PI * 2);
    canvasCtx.stroke();
  } else if (shapeVal < 2) {
    // Morphing toward diamond
    const t = shapeVal - 1;
    const r1 = s * (1 - t * 0.3);
    canvasCtx.beginPath();
    canvasCtx.arc(tx, ty, r1 * 0.35, 0, Math.PI * 2);
    canvasCtx.stroke();
    // Diamond hints
    canvasCtx.globalAlpha = a * t;
    const d = s * 0.4;
    canvasCtx.beginPath();
    canvasCtx.moveTo(tx, ty - d);
    canvasCtx.lineTo(tx + d * 0.85, ty);
    canvasCtx.lineTo(tx, ty + d);
    canvasCtx.lineTo(tx - d * 0.85, ty);
    canvasCtx.closePath();
    canvasCtx.stroke();
  } else if (shapeVal < 3) {
    // Morphing toward box
    const t = shapeVal - 2;
    const sz = s * 0.5;
    canvasCtx.globalAlpha = a;
    canvasCtx.strokeStyle = "rgba(190,210,240,0.12)";
    canvasCtx.lineWidth = 1;
    const cr = sz * (1 - t) * 0.3 + sz * t * 0.05;
    canvasCtx.beginPath();
    canvasCtx.roundRect(tx - sz / 2, ty - sz / 2, sz, sz, cr);
    canvasCtx.stroke();
  } else {
    // Star hints
    const spikes = 5;
    const or = s * 0.4;
    const ir = or * 0.4;
    canvasCtx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? or : ir;
      const px = Math.cos(a) * rad + tx;
      const py = Math.sin(a) * rad + ty;
      i === 0 ? canvasCtx.moveTo(px, py) : canvasCtx.lineTo(px, py);
    }
    canvasCtx.closePath();
    canvasCtx.stroke();
  }
  canvasCtx.restore();
}

function drawTrail() {
  for (let i = 0; i < trail.length; i++) {
    const tr = trail[i];
    const t = (i + 1) / trail.length;
    drawTrailShape(tr.x, tr.y, tr.r, tr.shape, t * 0.3);
  }
}

// ========== SHAPE RENDERERS ==========

function drawCircle(r) {
  const { x, y, radius, rotation } = ball;
  const pulse = r;

  canvasCtx.save();
  canvasCtx.translate(x, y);
  canvasCtx.rotate(rotation);

  // Large subtle outer ring
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, radius + 16, 0, Math.PI * 2);
  canvasCtx.strokeStyle = dim(0.05);
  canvasCtx.lineWidth = 1.5;
  canvasCtx.stroke();

  // Frosted glass fill
  const grad = canvasCtx.createRadialGradient(-radius * 0.15, -radius * 0.15, 0, 0, 0, radius);
  grad.addColorStop(0, "rgba(210,230,255,0.14)");
  grad.addColorStop(0.4, "rgba(190,215,245,0.07)");
  grad.addColorStop(1, "rgba(160,190,230,0.01)");
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, radius, 0, Math.PI * 2);
  canvasCtx.fillStyle = grad;
  canvasCtx.fill();

  // Main outline
  canvasCtx.strokeStyle = glow(0.7);
  canvasCtx.lineWidth = 1.8;
  canvasCtx.shadowBlur = 20;
  canvasCtx.shadowColor = glow(0.3);
  canvasCtx.stroke();

  // Concentric guide rings
  for (let i = 1; i <= 4; i++) {
    const rr = radius * (0.25 + i * 0.18);
    canvasCtx.beginPath();
    canvasCtx.arc(0, 0, rr, 0, Math.PI * 2);
    canvasCtx.strokeStyle = dim(0.06 - i * 0.008);
    canvasCtx.lineWidth = 0.7;
    canvasCtx.stroke();
  }

  // Light sweep
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, radius * 0.95, -Math.PI / 4 + Math.sin(globalTime * 0.002) * 0.3, Math.PI / 6 + Math.sin(globalTime * 0.002) * 0.3);
  canvasCtx.strokeStyle = accent(0.3);
  canvasCtx.lineWidth = 2;
  canvasCtx.stroke();

  canvasCtx.restore();
}

function drawDiamond(r) {
  const { x, y, radius, rotation } = ball;
  const t = globalTime * 0.003;
  const pulse = 1 + Math.sin(t * 1.5) * 0.03;
  const sz = radius * pulse;

  canvasCtx.save();
  canvasCtx.translate(x, y);
  canvasCtx.rotate(rotation);

  // Outer ring
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, sz + 14, 0, Math.PI * 2);
  canvasCtx.strokeStyle = dim(0.04);
  canvasCtx.lineWidth = 1;
  canvasCtx.stroke();

  // Frosted fill
  const grad = canvasCtx.createRadialGradient(0, 0, 0, 0, 0, sz);
  grad.addColorStop(0, "rgba(210,230,255,0.12)");
  grad.addColorStop(0.5, "rgba(190,215,240,0.05)");
  grad.addColorStop(1, "rgba(160,190,230,0.01)");
  canvasCtx.fillStyle = grad;

  canvasCtx.beginPath();
  canvasCtx.moveTo(0, -sz);
  canvasCtx.lineTo(sz * 0.8, 0);
  canvasCtx.lineTo(0, sz);
  canvasCtx.lineTo(-sz * 0.8, 0);
  canvasCtx.closePath();
  canvasCtx.fill();

  // Main stroke
  canvasCtx.strokeStyle = glow(0.7);
  canvasCtx.lineWidth = 2;
  canvasCtx.shadowBlur = 18;
  canvasCtx.shadowColor = glow(0.3);
  canvasCtx.stroke();

  // Inner diamond mesh
  for (let layer = 1; layer <= 2; layer++) {
    const f = layer * 0.35;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, -sz * f);
    canvasCtx.lineTo(sz * 0.8 * f, 0);
    canvasCtx.lineTo(0, sz * f);
    canvasCtx.lineTo(-sz * 0.8 * f, 0);
    canvasCtx.closePath();
    canvasCtx.strokeStyle = dim(0.12);
    canvasCtx.lineWidth = 0.7;
    canvasCtx.stroke();
  }

  // Connecting lines from center
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, 0); canvasCtx.lineTo(0, -sz * 0.5);
  canvasCtx.moveTo(0, 0); canvasCtx.lineTo(sz * 0.8 * 0.5, 0);
  canvasCtx.moveTo(0, 0); canvasCtx.lineTo(0, sz * 0.5);
  canvasCtx.moveTo(0, 0); canvasCtx.lineTo(-sz * 0.8 * 0.5, 0);
  canvasCtx.strokeStyle = dim(0.08);
  canvasCtx.lineWidth = 0.5;
  canvasCtx.stroke();

  // Accent tips
  [{ y: -sz }, { x: sz * 0.8 }, { y: sz }, { x: -sz * 0.8 }].forEach(pt => {
    const px = pt.x || 0, py = pt.y || 0;
    canvasCtx.beginPath();
    canvasCtx.arc(px, py, 2.5, 0, Math.PI * 2);
    canvasCtx.fillStyle = accent(0.5);
    canvasCtx.fill();
  });

  canvasCtx.restore();
}

function drawBox(r) {
  const { x, y, radius, rotation } = ball;
  const t = globalTime * 0.003;
  const pulse = 1 + Math.sin(t * 1.5) * 0.03;
  const sz = radius * pulse * 1.4;

  canvasCtx.save();
  canvasCtx.translate(x, y);
  canvasCtx.rotate(rotation);

  // Outer ring
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, sz / 2 + 12, 0, Math.PI * 2);
  canvasCtx.strokeStyle = dim(0.04);
  canvasCtx.lineWidth = 1;
  canvasCtx.stroke();

  // Frosted fill
  const grad = canvasCtx.createRadialGradient(0, 0, 0, 0, 0, sz);
  grad.addColorStop(0, "rgba(210,230,255,0.12)");
  grad.addColorStop(0.5, "rgba(190,215,240,0.05)");
  grad.addColorStop(1, "rgba(160,190,230,0.01)");
  canvasCtx.fillStyle = grad;

  const cr = sz * 0.06;
  canvasCtx.beginPath();
  canvasCtx.roundRect(-sz / 2, -sz / 2, sz, sz, cr);
  canvasCtx.fill();

  // Main stroke
  canvasCtx.strokeStyle = glow(0.7);
  canvasCtx.lineWidth = 2;
  canvasCtx.shadowBlur = 18;
  canvasCtx.shadowColor = glow(0.3);
  canvasCtx.stroke();

  // Inner wireframe
  const div = 3;
  const step = sz / div;
  canvasCtx.strokeStyle = dim(0.1);
  canvasCtx.lineWidth = 0.8;
  for (let i = 1; i < div; i++) {
    const gap = 6;
    canvasCtx.beginPath();
    canvasCtx.moveTo(-sz / 2 + gap, -sz / 2 + i * step);
    canvasCtx.lineTo(sz / 2 - gap, -sz / 2 + i * step);
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.moveTo(-sz / 2 + i * step, -sz / 2 + gap);
    canvasCtx.lineTo(-sz / 2 + i * step, sz / 2 - gap);
    canvasCtx.stroke();
  }

  // Corner accents
  const cLen = sz * 0.22;
  const corners = [
    [-sz / 2, -sz / 2, 1, 1],
    [sz / 2, -sz / 2, -1, 1],
    [sz / 2, sz / 2, -1, -1],
    [-sz / 2, sz / 2, 1, -1]
  ];
  canvasCtx.strokeStyle = glow(0.5);
  canvasCtx.lineWidth = 2;
  for (const [cx, cy, dx, dy] of corners) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(cx, cy + cLen * dy);
    canvasCtx.lineTo(cx, cy);
    canvasCtx.lineTo(cx + cLen * dx, cy);
    canvasCtx.stroke();
  }

  canvasCtx.restore();
}

function drawStarShape(r) {
  const { x, y, radius, rotation } = ball;
  const t = globalTime * 0.003;
  const pulse = 1 + Math.sin(t * 1.5) * 0.03;
  const sz = radius * pulse;

  canvasCtx.save();
  canvasCtx.translate(x, y);
  canvasCtx.rotate(rotation);

  // Outer ring
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, sz + 10, 0, Math.PI * 2);
  canvasCtx.strokeStyle = dim(0.04);
  canvasCtx.lineWidth = 1;
  canvasCtx.stroke();

  // Frosted fill
  const grad = canvasCtx.createRadialGradient(0, 0, 0, 0, 0, sz);
  grad.addColorStop(0, "rgba(210,230,255,0.13)");
  grad.addColorStop(0.5, "rgba(190,215,240,0.05)");
  grad.addColorStop(1, "rgba(160,190,230,0.01)");
  canvasCtx.fillStyle = grad;

  const spikes = 5;
  canvasCtx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? sz : sz * 0.4;
    i === 0 ? canvasCtx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad) : canvasCtx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  canvasCtx.closePath();
  canvasCtx.fill();

  // Main stroke
  canvasCtx.strokeStyle = glow(0.7);
  canvasCtx.lineWidth = 2;
  canvasCtx.shadowBlur = 18;
  canvasCtx.shadowColor = glow(0.3);
  canvasCtx.stroke();

  // Inner lines to center
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 - Math.PI / 2;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, 0);
    canvasCtx.lineTo(Math.cos(a) * sz * 0.5, Math.sin(a) * sz * 0.5);
    canvasCtx.strokeStyle = dim(0.12);
    canvasCtx.lineWidth = 0.8;
    canvasCtx.stroke();
  }

  // Center circle
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, sz * 0.12, 0, Math.PI * 2);
  canvasCtx.fillStyle = accent(0.4);
  canvasCtx.fill();

  // Tip dots
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2 - Math.PI / 2;
    canvasCtx.beginPath();
    canvasCtx.arc(Math.cos(a) * sz * 0.78, Math.sin(a) * sz * 0.78, 2.5, 0, Math.PI * 2);
    canvasCtx.fillStyle = accent(0.6);
    canvasCtx.fill();
  }

  canvasCtx.restore();
}

// ========== MORPHING ROTATION RING ==========

function drawRotationRing() {
  const { x, y, radius, handAngle } = ball;

  canvasCtx.save();
  canvasCtx.translate(x, y);

  // Full indicator ring
  const ringR = radius + 22;
  canvasCtx.beginPath();
  canvasCtx.arc(0, 0, ringR, 0, Math.PI * 2);
  canvasCtx.strokeStyle = dim(0.06);
  canvasCtx.lineWidth = 2;
  canvasCtx.stroke();

  // Sector arcs for each shape
  const sectors = [
    { start: 0, end: Math.PI / 2, label: "CIRCLE" },
    { start: Math.PI / 2, end: Math.PI, label: "DIAMOND" },
    { start: Math.PI, end: Math.PI * 1.5, label: "BOX" },
    { start: Math.PI * 1.5, end: Math.PI * 2, label: "STAR" }
  ];

  for (const sec of sectors) {
    canvasCtx.beginPath();
    canvasCtx.arc(0, 0, ringR, sec.start, sec.end);
    canvasCtx.strokeStyle = dim(0.12);
    canvasCtx.lineWidth = 2;
    canvasCtx.stroke();
  }

  // Cursor — shows current rotation angle
  const nx = Math.cos(handAngle);
  const ny = Math.sin(handAngle);
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, 0);
  canvasCtx.lineTo(nx * (ringR - 4), ny * (ringR - 4));
  canvasCtx.strokeStyle = accent(0.6);
  canvasCtx.lineWidth = 2;
  canvasCtx.shadowBlur = 8;
  canvasCtx.shadowColor = accent(0.3);
  canvasCtx.stroke();

  // Dot at end of cursor
  canvasCtx.beginPath();
  canvasCtx.arc(nx * ringR, ny * ringR, 3.5, 0, Math.PI * 2);
  canvasCtx.fillStyle = "rgba(220,245,255,0.8)";
  canvasCtx.fill();

  canvasCtx.restore();
}

// ========== MAIN ==========

function onResults(results) {
  canvasCtx.clearRect(0, 0, 800, 600);
  canvasCtx.drawImage(results.image, 0, 0, 800, 600);

  globalTime = Date.now();

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const lm = results.multiHandLandmarks[0];
    const center = getHandCenter(lm);

    ball.active = true;
    idleTime = 0;

    // Hand rotation drives shape
    const rawAngle = getHandAngle(lm);
    const dist = getHandDist(lm);

    // Smooth hand angle
    ball.handAngle = lerp(ball.handAngle, rawAngle, 0.12);
    ball.handDist = lerp(ball.handDist, dist, 0.1);

    // Target position
    ball.targetX = center.x;
    ball.targetY = center.y;

    // Radius influenced by distance (hand far = bigger)
    const baseR = 50;
    const distFactor = clamp((dist / 200), 0.7, 1.4);
    ball.targetRadius = baseR * distFactor;

    // Shape determined by rotation angle (0-4 maps to circle→diamond→box→star→circle)
    const shapeVal = angleToShape(ball.handAngle);

    // Check if we crossed a sector boundary — spawn sparks
    const currentSector = Math.floor(shapeVal);
    if (lastShapeIndex !== -1 && currentSector !== lastShapeIndex) {
      spawnSparks(ball.x, ball.y, 10);
    }
    lastShapeIndex = currentSector;

    ball.shapeFloat = shapeVal;

    // Rotation: track angular delta from hand angle change
    if (lastRawAngle !== null) {
      let delta = rawAngle - lastRawAngle;
      // Unwrap angle to avoid jumps at ±PI
      if (delta > Math.PI) delta -= Math.PI * 2;
      if (delta < -Math.PI) delta += Math.PI * 2;
      ball.targetRotation += delta * 3;
    }
    lastRawAngle = rawAngle;
  } else {
    ball.active = false;
    idleTime++;
    lastRawAngle = null;
  }

  // === PHYSICS ===
  const targetX = ball.active ? ball.targetX : 400 + Math.sin(globalTime * 0.0006) * 80;
  const targetY = ball.active ? ball.targetY : 200 + Math.cos(globalTime * 0.0008) * 30;

  ball.x += (targetX - ball.x) * 0.1;
  ball.y += (targetY - ball.y) * 0.1;
  ball.radius += (ball.targetRadius - ball.radius) * 0.08;

  // Smooth rotation — accumulate from hand, then decay
  ball.rotation += ball.targetRotation;
  ball.targetRotation *= 0.92;

  // When idle, gently decay rotation
  if (!ball.active) {
    ball.rotation *= 0.995;
  }

  ball.phase += 0.016;

  // === SPAWN AMBIENT PARTICLES ===
  if (ball.active) {
    if (Math.random() < 0.4) {
      const angle = Math.random() * Math.PI * 2;
      const dist = ball.radius + 15;
      spawnAmbient(
        ball.x + Math.cos(angle) * dist,
        ball.y + Math.sin(angle) * dist
      );
    }
  }

  updateAmbient();
  updateSparks();
  updateTrail();

  // === DRAW ===

  // 1. Ambient particles (far behind)
  drawAmbient();

  // 2. Rotation ring indicator
  if (ball.active) {
    drawRotationRing();
  }

  // 3. Trail
  drawTrail();

  // 4. Main shape (with aesthetic render + rotation)
  if (ball.active || idleTime < 30) {
    const shp = ball.shapeFloat;
    const sector = Math.floor(shp);
    const fract = shp - sector;

    // Determine if we're morphing between shapes
    if (fract > 0 && fract < 0.95) {
      // Interpolated aesthetic draw between two shapes
      drawMorphBetween(sector, fract);
    } else {
      const sIdx = sector % 4;
      switch (sIdx) {
        case 0: drawCircle(ball.radius); break;
        case 1: drawDiamond(ball.radius); break;
        case 2: drawBox(ball.radius); break;
        case 3: drawStarShape(ball.radius); break;
        default: drawCircle(ball.radius);
      }
    }
  } else {
    // Idle floating
    ball.x = targetX;
    ball.y = targetY;
    ball.radius = 45 + Math.sin(globalTime * 0.002) * 5;
    ball.rotation = globalTime * 0.0004;
    ball.shapeFloat = 0;
    drawCircle(ball.radius);
  }

  // 5. Sparks
  drawSparks();

  // 6. Text
  textAlpha += (ball.active ? 1 : 0 - textAlpha) * 0.06;
  drawText();
}

// ========== MORPH RENDERING ==========

function drawMorphBetween(fromSector, t) {
  const { x, y, radius, rotation } = ball;

  // Apply rotation offset for visual interest
  const extraRot = t * 0.3;
  const origRotation = ball.rotation;

  // Use additive blending for glow overlap
  canvasCtx.save();

  // Shape A (fading out) — opacity 1-t
  ball.rotation = origRotation + extraRot;
  canvasCtx.globalAlpha = 1 - t;
  switch (fromSector % 4) {
    case 0: drawCircle(radius * (1 - t * 0.08)); break;
    case 1: drawDiamond(radius * (1 - t * 0.08)); break;
    case 2: drawBox(radius * (1 - t * 0.08)); break;
    case 3: drawStarShape(radius * (1 - t * 0.08)); break;
  }

  // Shape B (fading in) — opacity t
  canvasCtx.globalAlpha = t;
  switch ((fromSector + 1) % 4) {
    case 0: drawCircle(radius * (1 + t * 0.08)); break;
    case 1: drawDiamond(radius * (1 + t * 0.08)); break;
    case 2: drawBox(radius * (1 + t * 0.08)); break;
    case 3: drawStarShape(radius * (1 + t * 0.08)); break;
  }

  canvasCtx.restore();

  // Restore original rotation
  ball.rotation = origRotation;

  // Mid-morph sparkle ring
  if (t > 0.3 && t < 0.7) {
    canvasCtx.save();
    canvasCtx.globalAlpha = (0.5 - Math.abs(t - 0.5)) * 4;
    const ringR = radius * (1 - Math.abs(t - 0.5) * 2) * 1.3;
    canvasCtx.translate(x, y);
    canvasCtx.rotate(rotation + t * Math.PI);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + globalTime * 0.002;
      const len = ringR * (0.6 + Math.sin(a * 3 + t * 10) * 0.4);
      canvasCtx.beginPath();
      canvasCtx.moveTo(
        Math.cos(a) * ringR * 0.3,
        Math.sin(a) * ringR * 0.3
      );
      canvasCtx.lineTo(
        Math.cos(a) * len,
        Math.sin(a) * len
      );
      canvasCtx.strokeStyle = `rgba(220,245,255,${0.7 - Math.abs(t - 0.5)})`;
      canvasCtx.lineWidth = 1;
      canvasCtx.stroke();
    }
    canvasCtx.restore();
  }
}

// ========== TEXT ==========

const shapeLabels = ["Circle", "Diamond", "Box", "Star"];

function drawText() {
  if (textAlpha <= 0.01) return;

  canvasCtx.save();
  canvasCtx.textAlign = "center";
  canvasCtx.textBaseline = "middle";

  const bobY = Math.sin(globalTime * 0.002) * 3;

  // Shape name label
  const shapeIdx = Math.round(ball.shapeFloat) % 4;
  const label = ball.active ? shapeLabels[shapeIdx] : "Show Your Hand";

  // Main label with glow
  canvasCtx.font = "600 20px Arial";
  canvasCtx.globalAlpha = textAlpha * 0.9;
  canvasCtx.fillStyle = glow(0.95);
  canvasCtx.shadowBlur = 20;
  canvasCtx.shadowColor = glow(0.5);
  canvasCtx.fillText(label, ball.x, ball.y - ball.radius - 32 + bobY);

  // Subtle second layer for bloom effect
  canvasCtx.globalAlpha = textAlpha * 0.3;
  canvasCtx.shadowBlur = 30;
  canvasCtx.fillText(label, ball.x, ball.y - ball.radius - 32 + bobY);

  // Hint text
  canvasCtx.font = "400 11px Arial";
  canvasCtx.globalAlpha = textAlpha * 0.3;
  canvasCtx.fillStyle = dim(0.6);
  canvasCtx.fillText("rotate hand → change shape", ball.x, ball.y - ball.radius - 14 + bobY);

  canvasCtx.restore();
}

// ========== CAMERA SELECTION ==========

const cameraSelect = document.getElementById("cameraSelect");

async function enumerateCameras() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const vd = devices.filter(d => d.kind === "videoinput");
  cameraSelect.innerHTML = '<option value="">Select Camera...</option>';
  if (vd.length === 0) {
    const o = document.createElement("option");
    o.value = ""; o.textContent = "No cameras found"; o.disabled = true; o.selected = true;
    cameraSelect.appendChild(o);
    return;
  }
  vd.forEach((d, i) => {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = d.label || `Camera ${i + 1}`;
    cameraSelect.appendChild(o);
  });
}

cameraSelect.addEventListener("change", async () => {
  const idx = parseInt(cameraSelect.value);
  if (isNaN(idx)) return;
  if (camera) await camera.stop();
  const devices = await navigator.mediaDevices.enumerateDevices();
  const vd = devices.filter(d => d.kind === "videoinput");
  const deviceId = vd[idx]?.deviceId;
  camera = new Camera(videoElement, {
    onFrame: async () => { await hands.send({ image: videoElement }); },
    width: 800, height: 600,
    source: deviceId ? { exact: deviceId } : undefined
  });
  camera.start();
});

const hands = new Hands({
  locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

let camera = new Camera(videoElement, {
  onFrame: async () => { await hands.send({ image: videoElement }); },
  width: 800, height: 600
});
camera.start();
enumerateCameras();