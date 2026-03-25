import * as THREE from 'https://esm.sh/three@0.169.0';

const W = 400, H = 400;

const canvas = document.getElementById('earth-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
camera.position.z = 3.2;

scene.add(new THREE.AmbientLight(0xffffff, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 4);
sun.position.set(5, 3, 5);
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 1.2);
fill.position.set(-5, -2, 3);
scene.add(fill);

const texture = new THREE.TextureLoader().load('./images/earth_atmos_4096.jpg');
texture.colorSpace = THREE.SRGBColorSpace;
const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0 })
);
earth.rotation.x = 0.4;
scene.add(earth);

(function animate() {
    requestAnimationFrame(animate);
    earth.rotation.y += 0.003;
    renderer.render(scene, camera);
})();
