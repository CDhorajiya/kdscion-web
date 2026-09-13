/**
 * drape-demo.js — sphere + falling-cloth drape simulator
 * ------------------------------------------------------
 * A self-contained Verlet-integration cloth simulation: a large rectangle of
 * the selected fabric is dropped from above a sphere and physically settles
 * into folds under gravity, colliding with the sphere and a floor.
 * Independent scene/camera/renderer — it never touches the product page's
 * main 3D viewer. The canvas is transparent so it can sit on a glass panel.
 */
import * as THREE from 'https://esm.sh/three@0.169.0';
import { OrbitControls } from 'https://esm.sh/three@0.169.0/examples/jsm/controls/OrbitControls.js';

export const DRAPE_CATEGORIES = ['crisp', 'medium', 'flowing', 'heavy'];

// Per-category physical presets. Cloth size is shared so categories compare fairly.
//   gravity    — downward acceleration per simulation step.
//   damping    — fraction of velocity kept each step (lower = settles faster).
//   iterations — constraint-solver passes per step (higher = less stretch).
//   bend       — resistance to folding (near 0 = many soft folds, near 1 =
//                stays flatter with a few sharp creases). Real fabrics barely
//                stretch but vary hugely in bending, so this is the main knob.
//   shear      — resistance to diagonal (bias) distortion; soft fabrics give on
//                the bias, which is much of what makes them drape softly.
//   friction   — how quickly sliding stops on contact with sphere/floor.
const PRESETS = {
  crisp:   { gravity: 0.00028, damping: 0.980, iterations: 12, bend: 0.85, shear: 0.70, friction: 0.55 },
  medium:  { gravity: 0.00034, damping: 0.975, iterations: 12, bend: 0.50, shear: 0.70, friction: 0.45 },
  flowing: { gravity: 0.00036, damping: 0.965, iterations: 14, bend: 0.03, shear: 0.30, friction: 0.15 },
  heavy:   { gravity: 0.00055, damping: 0.985, iterations: 14, bend: 0.35, shear: 0.70, friction: 0.60 },
};

const GRID          = 36;     // particles per side
const SPHERE_RADIUS = 0.5;
const SPHERE_Y      = 0.35;   // raised, so the cloth has more room to hang
const CLOTH_SIZE    = 3.8;    // ~3.8x the sphere's diameter, so it hangs and pools
const START_Y       = SPHERE_Y + SPHERE_RADIUS + 0.9;
const FLOOR_Y       = -1.8;
const CONTACT_GAP   = 0.025;  // keeps triangle faces from cutting into the sphere
const STEP_SECONDS  = 1 / 60; // fixed timestep, so 120Hz screens don't run 2x fast
const FIT_ASPECT    = 1.12;   // below this width/height ratio the camera backs off to fit the cloth

export function createDrapeDemo(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
  camera.position.set(0, 1.3, 5.2);

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(2.5, 4, 3); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-3, 1.5, -1.5); scene.add(fill);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, -0.15, 0);
  controls.minDistance = 2.5;
  controls.maxDistance = 9;
  controls.update();
  const baseDistance = camera.position.distanceTo(controls.target);

  const sphereCenter = new THREE.Vector3(0, SPHERE_Y, 0);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS * 0.97, 48, 32),
    new THREE.MeshStandardMaterial({ color: 0xd8d3cb, roughness: 0.7 })
  );
  sphere.position.copy(sphereCenter);
  scene.add(sphere);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 72),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, transparent: true, opacity: 0.28 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y - 0.002;
  scene.add(floor);

  // ── Cloth topology (fixed; only positions change between drops) ──
  const idx = (i, j) => j * GRID + i;
  const spacing = CLOTH_SIZE / (GRID - 1);
  const springs = { structural: [], shear: [], bend: [] };
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      if (i < GRID - 1) springs.structural.push([idx(i, j), idx(i + 1, j), spacing]);
      if (j < GRID - 1) springs.structural.push([idx(i, j), idx(i, j + 1), spacing]);
      if (i < GRID - 1 && j < GRID - 1) {
        springs.shear.push([idx(i, j), idx(i + 1, j + 1), spacing * Math.SQRT2]);
        springs.shear.push([idx(i + 1, j), idx(i, j + 1), spacing * Math.SQRT2]);
      }
      if (i < GRID - 2) springs.bend.push([idx(i, j), idx(i + 2, j), spacing * 2]);
      if (j < GRID - 2) springs.bend.push([idx(i, j), idx(i, j + 2), spacing * 2]);
    }
  }

  const clothGeometry = new THREE.BufferGeometry();
  const uvs = new Float32Array(GRID * GRID * 2);
  for (let j = 0; j < GRID; j++) {
    for (let i = 0; i < GRID; i++) {
      const k = idx(i, j);
      uvs[k * 2]     = i / (GRID - 1);
      uvs[k * 2 + 1] = 1 - j / (GRID - 1);
    }
  }
  const indices = [];
  for (let j = 0; j < GRID - 1; j++) {
    for (let i = 0; i < GRID - 1; i++) {
      const a = idx(i, j), b = idx(i + 1, j), c = idx(i, j + 1), d = idx(i + 1, j + 1);
      indices.push(a, c, b, b, c, d);
    }
  }
  clothGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GRID * GRID * 3), 3));
  clothGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  clothGeometry.setIndex(indices);

  const clothMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 });
  const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial);
  clothMesh.visible = false;
  scene.add(clothMesh);

  // ── Simulation state ──
  const particles = [];
  for (let k = 0; k < GRID * GRID; k++) {
    particles.push({ position: new THREE.Vector3(), previous: new THREE.Vector3() });
  }
  let preset = PRESETS.medium;
  let rafId = null;
  let lastTime = 0;
  let accumulator = 0;

  function resetParticles() {
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const p = particles[idx(i, j)];
        // tiny jitter so the fall isn't perfectly symmetric
        p.position.set(
          (i - (GRID - 1) / 2) * spacing + (Math.random() - 0.5) * 0.004,
          START_Y,
          (j - (GRID - 1) / 2) * spacing + (Math.random() - 0.5) * 0.004
        );
        p.previous.copy(p.position);
      }
    }
  }

  function syncGeometry() {
    const pos = clothGeometry.attributes.position;
    for (let k = 0; k < particles.length; k++) {
      const v = particles[k].position;
      pos.setXYZ(k, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    clothGeometry.computeVertexNormals();
    clothGeometry.computeBoundingSphere();
  }

  function satisfy(aIdx, bIdx, rest, strength) {
    const a = particles[aIdx].position, b = particles[bIdx].position;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    const corr = (dist - rest) / dist * 0.5 * strength;
    a.x += dx * corr; a.y += dy * corr; a.z += dz * corr;
    b.x -= dx * corr; b.y -= dy * corr; b.z -= dz * corr;
  }

  function step() {
    const s = preset;
    for (const p of particles) {
      const vx = (p.position.x - p.previous.x) * s.damping;
      const vy = (p.position.y - p.previous.y) * s.damping;
      const vz = (p.position.z - p.previous.z) * s.damping;
      p.previous.copy(p.position);
      p.position.x += vx;
      p.position.y += vy - s.gravity;
      p.position.z += vz;
    }
    for (let iter = 0; iter < s.iterations; iter++) {
      for (const [a, b, r] of springs.structural) satisfy(a, b, r, 0.95);
      for (const [a, b, r] of springs.shear)      satisfy(a, b, r, s.shear);
      for (const [a, b, r] of springs.bend)       satisfy(a, b, r, s.bend);
    }
    const minDist = SPHERE_RADIUS + CONTACT_GAP;
    for (const p of particles) {
      const dx = p.position.x - sphereCenter.x;
      const dy = p.position.y - sphereCenter.y;
      const dz = p.position.z - sphereCenter.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDist) {
        const k = minDist / dist;
        p.position.set(sphereCenter.x + dx * k, sphereCenter.y + dy * k, sphereCenter.z + dz * k);
        p.previous.lerp(p.position, s.friction);
      }
      if (p.position.y < FLOOR_Y) {
        p.position.y = FLOOR_Y;
        p.previous.y = FLOOR_Y; // no bounce
        p.previous.x += (p.position.x - p.previous.x) * s.friction;
        p.previous.z += (p.position.z - p.previous.z) * s.friction;
      }
    }
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    accumulator += Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    let steps = 0;
    while (accumulator >= STEP_SECONDS && steps < 4) {
      step();
      accumulator -= STEP_SECONDS;
      steps++;
    }
    if (steps) syncGeometry();
    controls.update();
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth  || 400;
    const h = canvas.clientHeight || 400;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // On narrow (portrait) views, pull back so the full cloth width stays in
    // frame; keep the current orbit direction, only change the distance.
    const distance = baseDistance * Math.max(1, FIT_ASPECT / camera.aspect);
    const offset = camera.position.clone().sub(controls.target).setLength(distance);
    camera.position.copy(controls.target).add(offset);
    controls.maxDistance = Math.max(9, distance * 1.6);
    controls.update();
  }

  const texLoader = new THREE.TextureLoader();
  let loadedPath = null;

  function start() {
    resetParticles();
    syncGeometry();
    clothMesh.visible = true;
    if (rafId === null) {
      lastTime = performance.now();
      accumulator = 0;
      rafId = requestAnimationFrame(frame);
    }
  }

  // Resize must run while the canvas is laid out (not inside a display:none parent).
  function drop(texturePath, category) {
    preset = PRESETS[category] ?? PRESETS.medium;
    resize();
    if (loadedPath === texturePath) { start(); return; }
    texLoader.load(texturePath, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2, 2);
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      if (clothMaterial.map) clothMaterial.map.dispose();
      clothMaterial.map = tex;
      clothMaterial.needsUpdate = true;
      loadedPath = texturePath;
      start();
    }, undefined, (err) => console.error('[drape] texture load error', texturePath, err));
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  return { drop, stop, resize };
}
