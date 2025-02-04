import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const monkeyUrl = new URL('/images/scene.gltf', import.meta.url);

const renderer = new THREE.WebGLRenderer();

renderer.setSize (window.innerWidth, window.innerHeight);
renderer.setPixelRatio (2)

document.body.appendChild (renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera (45, window.innerWidth / window.innerHeight, 0.1, 1000);

renderer.setClearColor("#FFFFFF");

const orbit = new OrbitControls (camera, renderer.domElement);


camera.position.set (5, 5, 5);
orbit.update();

const light = new THREE.PointLight (0xffffff, 3500, 500)
light.position.set (-4, 0, 30)
scene.add (light)

/*const grid = new THREE.GridHelper (30, 30);
scene.add (grid);*/

const assetLoader = new GLTFLoader();


assetLoader.load(monkeyUrl.href, function(gltf) {
  const model = gltf.scene;
  scene.add(model);

}, undefined, function(error) {
  console.error(error);
});


function animate() {
  renderer.render(scene, camera);
 
}
renderer.setAnimationLoop (animate);



window.addEventListener ('resize', function() {
 camera.aspect = window.innerWidth, window.innerHeight;
 camera.updateProjectionMatrix();
 renderer.setSize (window.innerWidth, window.innerHeight);
});


