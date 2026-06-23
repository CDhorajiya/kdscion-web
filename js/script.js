/**
 * ============================================================
 *  script.js  —  Legacy 3D Scene Viewer (Unused)
 * ============================================================
 *
 *  STATUS: Leftover from early development. Nearly identical to
 *  main.js but points to a different model file (scene.gltf).
 *  Not used on any live page. The production 3D viewer is built
 *  inline inside each pN.html product page.
 *
 *  See main.js for a full explanation of the Three.js setup.
 */

import * as THREE            from 'three';
import { OrbitControls }     from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader }        from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader }       from 'three/examples/jsm/loaders/DRACOLoader.js';

// This model path was used during an early prototype — the file may no longer exist.
const monkeyUrl = new URL('/images/scene.gltf', import.meta.url);

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(2);
document.body.appendChild(renderer.domElement);

// ── Scene & Camera ────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
renderer.setClearColor('#FFFFFF');

// ── Controls & Camera position ────────────────────────────────────────────────
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(5, 5, 5);
orbit.update();

// ── Lighting ──────────────────────────────────────────────────────────────────
const light = new THREE.PointLight(0xffffff, 3500, 500);
light.position.set(-4, 0, 30);
scene.add(light);

// const grid = new THREE.GridHelper(30, 30);
// scene.add(grid);

// ── Model loader ──────────────────────────────────────────────────────────────
const assetLoader = (() => {
  const _l = new GLTFLoader();
  const _d = new DRACOLoader();
  _d.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  _l.setDRACOLoader(_d);
  return _l;
})();

assetLoader.load(
  monkeyUrl.href,
  function(gltf) {
    scene.add(gltf.scene);
  },
  undefined,
  function(error) {
    console.error(error);
  }
);

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);

// ── Resize handling ───────────────────────────────────────────────────────────
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
