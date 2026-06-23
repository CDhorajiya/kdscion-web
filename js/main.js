/**
 * ============================================================
 *  main.js  —  Legacy 3D Earth / Scene Viewer (Unused)
 * ============================================================
 *
 *  STATUS: This file is a leftover from early development.
 *  It sets up a basic Three.js scene to display a 3D GLB model
 *  (originally the Earth globe). It is NOT used on any live page.
 *
 *  The live product 3D viewer is built inline inside each pN.html
 *  product page, not through this file.
 *
 *  HOW THREE.JS WORKS (brief overview for beginners)
 *  ---------------------------------------------------
 *  Three.js is a JavaScript library that renders 3D graphics in a
 *  web browser using WebGL. The three mandatory pieces are:
 *
 *    1. RENDERER  — draws the scene onto an HTML <canvas> element
 *    2. SCENE     — the "world" that holds 3D objects and lights
 *    3. CAMERA    — the viewpoint from which the scene is rendered
 *
 *  A GLTF/GLB file is a standard 3D model format (like a PDF, but
 *  for 3D). GLTFLoader reads the file and adds it to the scene.
 *  DRACOLoader decompresses models that were Draco-compressed to
 *  reduce file size (all models on this site use Draco compression).
 */

import * as THREE            from 'three';
import { OrbitControls }     from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader }        from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader }       from 'three/examples/jsm/loaders/DRACOLoader.js';

// Resolve the URL of the 3D model file relative to this script's location.
// `import.meta.url` is the absolute URL of main.js itself.
const monkeyUrl = new URL('/3d/Earth_1_12756.glb', import.meta.url);

// ── Renderer setup ────────────────────────────────────────────────────────────
// The WebGLRenderer creates a <canvas> element and handles all GPU drawing.
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);  // Full-screen canvas
renderer.setPixelRatio(2);                                 // High DPI / retina display
document.body.appendChild(renderer.domElement);            // Add the canvas to the page

// ── Scene ─────────────────────────────────────────────────────────────────────
// The scene is the 3D "world". Objects, lights, and helpers all go here.
const scene = new THREE.Scene();

// ── Camera ────────────────────────────────────────────────────────────────────
// PerspectiveCamera(fov, aspect, near, far):
//   fov    = 45°  — field of view (like a camera lens angle)
//   aspect = viewport width / height (so it doesn't look stretched)
//   near   = 0.1  — objects closer than 0.1 units are clipped (invisible)
//   far    = 1000 — objects farther than 1000 units are clipped
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

renderer.setClearColor('#FFFFFF');  // White background colour

// ── Orbit controls ────────────────────────────────────────────────────────────
// Lets the user rotate, zoom, and pan the camera with mouse / touch.
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(5, 5, 5);  // Start the camera slightly above and to the side
orbit.update();                  // Sync the controls with the new camera position

// ── Lighting ──────────────────────────────────────────────────────────────────
// PointLight(colour, intensity, distance): a light that shines in all directions
// from a single point in space (like a light bulb).
const light = new THREE.PointLight(0xffffff, 3500, 500);
light.position.set(-4, 0, 30);  // Place the light in front of and above the model
scene.add(light);

// Grid helper (commented out — useful during development to show the floor plane)
// const grid = new THREE.GridHelper(30, 30);
// scene.add(grid);

// ── Model loader ──────────────────────────────────────────────────────────────
// Chain GLTFLoader with DRACOLoader so compressed models are decoded properly.
const assetLoader = (() => {
  const _l = new GLTFLoader();
  const _d = new DRACOLoader();
  // Decoder WASM files are hosted by Google — no local copy needed.
  _d.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  _l.setDRACOLoader(_d);
  return _l;
})();

// Load the GLB model from the resolved URL.
// The three callbacks are: onLoad, onProgress, onError.
assetLoader.load(
  monkeyUrl.href,
  function(gltf) {
    // gltf.scene is the root Group containing all the model's meshes.
    const model = gltf.scene;
    scene.add(model);                          // Add model to the scene
  },
  undefined,                                   // onProgress — not used here
  function(error) {
    console.error(error);                      // Log load errors to the console
  }
);

// ── Render loop ───────────────────────────────────────────────────────────────
// Three.js needs to redraw the scene on every animation frame (typically 60×/s).
// setAnimationLoop is the Three.js equivalent of requestAnimationFrame in a loop.
function animate() {
  renderer.render(scene, camera);  // Draw the scene from the camera's point of view
}
renderer.setAnimationLoop(animate);  // Call animate() on every frame automatically

// ── Resize handling ───────────────────────────────────────────────────────────
// When the browser window is resized, update the camera aspect ratio and
// renderer size so the scene doesn't appear stretched or cropped.
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();  // Must be called after changing camera properties
  renderer.setSize(window.innerWidth, window.innerHeight);
});
