// ========== THREE.JS SETUP ==========
const container = document.getElementById('scene-container');
const canvasElement = document.querySelector('.output_canvas');
const videoElement = document.querySelector('.input_video');
const canvasCtx = canvasElement.getContext('2d');

canvasElement.width = 800;
canvasElement.height = 600;

// Three.js Scene
let scene, camera, renderer, objects = [];
let handGrabbed = null;
let handPos = { x: 0, y: 0, z: 0 };
let lastHandPos = { x: 0, y: 0, z: 0 };
let isGrabbing = false;
let grabStrength = 0;

function initThreeJS() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0a);
  scene.fog = new THREE.Fog(0x0a0a0a, 100, 500);

  // Camera
  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 50;

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x00ff88, 1.5, 200);
  pointLight.position.set(0, 30, 40);
  pointLight.castShadow = true;
  scene.add(pointLight);

  const pointLight2 = new THREE.PointLight(0xff00ff, 1, 150);
  pointLight2.position.set(-40, -20, 30);
  scene.add(pointLight2);

  // Start animation loop
  animate();
}

function createObject(type = 'cube') {
  let geometry;
  const colors = [0x00ffff, 0xff00ff, 0x00ff88, 0xff6600, 0x00ccff, 0xff0099];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  switch(type) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(8, 32, 32);
      break;
    case 'pyramid':
      geometry = new THREE.TetrahedronGeometry(10, 0);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(8, 3, 16, 100);
      break;
    default:
      geometry = new THREE.BoxGeometry(14, 14, 14);
  }

  const material = new THREE.MeshStandardMaterial({
    color: randomColor,
    metalness: 0.4,
    roughness: 0.3,
    emissive: randomColor,
    emissiveIntensity: 0.2
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  
  mesh.position.set(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 20
  );

  mesh.rotation.set(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI
  );

  // Physics properties
  mesh.userData = {
    velocity: new THREE.Vector3(0, 0, 0),
    angularVelocity: new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    ),
    grabbed: false,
    grabOffset: new THREE.Vector3(0, 0, 0)
  };

  scene.add(mesh);
  objects.push(mesh);
  return mesh;
}

function updatePhysics() {
  objects.forEach((obj, index) => {
    if (!obj.userData.grabbed) {
      // Gravity
      obj.userData.velocity.y -= 0.5;

      // Friction
      obj.userData.velocity.multiplyScalar(0.98);

      // Update position
      obj.position.add(obj.userData.velocity);

      // Update rotation
      obj.rotation.x += obj.userData.angularVelocity.x;
      obj.rotation.y += obj.userData.angularVelocity.y;
      obj.rotation.z += obj.userData.angularVelocity.z;

      // Boundary check (remove if out of bounds)
      if (obj.position.y < -200) {
        scene.remove(obj);
        objects.splice(index, 1);
      }

      // Bounce off boundaries
      if (obj.position.x > 100 || obj.position.x < -100) {
        obj.userData.velocity.x *= -0.8;
        obj.position.x = Math.max(-100, Math.min(100, obj.position.x));
      }

      if (obj.position.z > 80 || obj.position.z < -80) {
        obj.userData.velocity.z *= -0.8;
        obj.position.z = Math.max(-80, Math.min(80, obj.position.z));
      }

      // Bottom bounce
      if (obj.position.y < -60) {
        obj.userData.velocity.y *= -0.6;
        obj.position.y = -60;
      }
    }
  });
}

function findNearestObject(pos, range = 30) {
  let nearest = null;
  let minDist = range;

  objects.forEach(obj => {
    const dist = pos.distanceTo(obj.position);
    if (dist < minDist) {
      minDist = dist;
      nearest = obj;
    }
  });

  return nearest;
}

function grabObject(obj, handPosition) {
  if (!obj) return;

  obj.userData.grabbed = true;
  obj.userData.grabOffset.copy(obj.position).sub(handPosition);
  handGrabbed = obj;
  isGrabbing = true;

  // Highlight grabbed object
  obj.material.emissiveIntensity = 0.8;
}

function releaseObject() {
  if (handGrabbed) {
    handGrabbed.userData.grabbed = false;
    handGrabbed.material.emissiveIntensity = 0.2;

    // Apply throw velocity
    handGrabbed.userData.velocity.copy(
      new THREE.Vector3(
        (handPos.x - lastHandPos.x) * 0.5,
        (handPos.y - lastHandPos.y) * 0.5,
        (handPos.z - lastHandPos.z) * 0.5
      )
    );

    handGrabbed = null;
    isGrabbing = false;
  }
}

function animate() {
  requestAnimationFrame(animate);

  updatePhysics();

  // Update grabbed object position
  if (handGrabbed && isGrabbing) {
    const targetPos = new THREE.Vector3(handPos.x, handPos.y, handPos.z)
      .add(handGrabbed.userData.grabOffset);

    handGrabbed.position.lerp(targetPos, 0.15);

    // Spin while grabbed
    handGrabbed.rotation.x += 0.05;
    handGrabbed.rotation.y += 0.08;
  }

  renderer.render(scene, camera);
}

// ========== MEDIAPIPE DETECTION ==========
let lastFrameTime = 0;
const FPS = 25;

function isFingerUp(tip, base, landmarks) {
  return landmarks[tip].y < landmarks[base].y;
}

function getPinchStrength(landmarks) {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const dx = thumbTip.x - indexTip.x;
  const dy = thumbTip.y - indexTip.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, 1 - dist * 2);
}

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

  let gestureEmoji = '✋';
  let infoText = 'No hand detected';

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    // Draw hand skeleton
    canvasCtx.strokeStyle = '#00ff88';
    canvasCtx.lineWidth = 2;
    canvasCtx.fillStyle = '#00ff88';

    // Draw connections (simplified)
    const connections = [
      [0,1],[1,2],[2,3],[3,4], // thumb
      [0,5],[5,6],[6,7],[7,8], // index
      [0,9],[9,10],[10,11],[11,12], // middle
      [0,13],[13,14],[14,15],[15,16], // ring
      [0,17],[17,18],[18,19],[19,20] // pinky
    ];

    connections.forEach(([start, end]) => {
      const p1 = landmarks[start];
      const p2 = landmarks[end];
      canvasCtx.beginPath();
      canvasCtx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
      canvasCtx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
      canvasCtx.stroke();
    });

    // Finger joints
    landmarks.forEach(lm => {
      canvasCtx.beginPath();
      canvasCtx.arc(lm.x * canvasElement.width, lm.y * canvasElement.height, 4, 0, Math.PI * 2);
      canvasCtx.fill();
    });

    // Hand position (index finger tip to 3D space)
    const indexFinger = landmarks[8];
    lastHandPos = { ...handPos };
    handPos.x = (indexFinger.x - 0.5) * 100;
    handPos.y = (0.5 - indexFinger.y) * 80;
    handPos.z = (indexFinger.z || 0.5) * 20;

    // Pinch detection
    const pinch = getPinchStrength(landmarks);
    grabStrength = pinch;

    if (pinch > 0.6) {
      gestureEmoji = '✌️';
      infoText = `PINCHING: ${Math.round(pinch * 100)}%`;

      if (!isGrabbing) {
        const nearbyObj = findNearestObject(new THREE.Vector3(handPos.x, handPos.y, handPos.z), 40);
        if (nearbyObj) {
          grabObject(nearbyObj, new THREE.Vector3(handPos.x, handPos.y, handPos.z));
          gestureEmoji = '👌';
          infoText = 'GRABBED!';
        }
      }
    } else {
      if (isGrabbing) {
        releaseObject();
        gestureEmoji = '🚀';
        infoText = 'THROWN!';
      }
    }

    if (handGrabbed) {
      infoText = `HOLDING: ${Math.round(grabStrength * 100)}% - Objects: ${objects.length}`;
    } else {
      infoText = `Ready - Objects: ${objects.length} - Grab strength: ${Math.round(pinch * 100)}%`;
    }

  }

  // Update UI
  document.getElementById('info').textContent = infoText;
  document.getElementById('gesture-icon').textContent = gestureEmoji;
}

const camera2 = new Camera(videoElement, {
  onFrame: async () => {
    const now = Date.now();
    if (now - lastFrameTime < 1000 / FPS) return;
    lastFrameTime = now;
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480
});

// ========== BUTTON CONTROLS ==========
document.getElementById('btn-cube').addEventListener('click', () => createObject('cube'));
document.getElementById('btn-sphere').addEventListener('click', () => createObject('sphere'));
document.getElementById('btn-pyramid').addEventListener('click', () => createObject('pyramid'));
document.getElementById('btn-torus').addEventListener('click', () => createObject('torus'));

document.getElementById('btn-multi').addEventListener('click', () => {
  for (let i = 0; i < 5; i++) {
    const types = ['cube', 'sphere', 'pyramid', 'torus'];
    createObject(types[Math.floor(Math.random() * types.length)]);
  }
});

document.getElementById('btn-clear').addEventListener('click', () => {
  objects.forEach(obj => scene.remove(obj));
  objects = [];
  handGrabbed = null;
  isGrabbing = false;
});

// ========== INITIALIZE ==========
window.addEventListener('load', () => {
  initThreeJS();
  camera2.start();
});

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
