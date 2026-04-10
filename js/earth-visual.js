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

// --- Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const sun = new THREE.DirectionalLight(0xffffff, 4);
sun.position.set(5, 3, 5);
scene.add(sun);

const fill = new THREE.DirectionalLight(0xffffff, 1.2);
fill.position.set(-5, -2, 3);
scene.add(fill);

// Enhancement 3 (part): subtle blue-white light to catch ocean edges
const oceanLight = new THREE.DirectionalLight(0xd0e8ff, 0.8);
oceanLight.position.set(-3, 2, 4);
scene.add(oceanLight);

// --- Earth ---
const texture = new THREE.TextureLoader().load('./images/earth_atmos_4096.jpg');
texture.colorSpace = THREE.SRGBColorSpace;

// Enhancement 3: slightly higher metalness + lower roughness for ocean shimmer
const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4, metalness: 0.15 })
);
earth.rotation.x = 0.4;
scene.add(earth);

// --- Enhancement 2: Cloud layer ---
// Attempt to load cloud texture; fall back to plain white material if absent
const cloudLoader = new THREE.TextureLoader();
let cloudMaterial;

const cloudTexture = cloudLoader.load(
    './images/earth_clouds_2048.jpg',
    // onLoad: texture found — use it
    (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        cloudMaterial.map = tex;
        cloudMaterial.needsUpdate = true;
    },
    undefined,
    // onError: texture missing — plain white works fine
    () => {}
);

cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
});

const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.03, 64, 64),
    cloudMaterial
);
clouds.rotation.x = 0.4;
scene.add(clouds);

// --- Enhancement 1: Atmosphere rim glow (Fresnel) ---
const atmosphereGlow = new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 64, 64),
    new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: /* glsl */`
            varying vec3 vNormal;
            varying vec3 vViewDir;

            void main() {
                vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
                vNormal = normalize(normalMatrix * normal);
                vViewDir = -modelViewPosition.xyz;
                gl_Position = projectionMatrix * modelViewPosition;
            }
        `,
        fragmentShader: /* glsl */`
            varying vec3 vNormal;
            varying vec3 vViewDir;

            void main() {
                float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewDir))), 3.0);
                // Brand "Planet Green" rgb(6,70,6) normalised ≈ (0.024, 0.275, 0.024)
                // Boost slightly so the halo is visible without being gaudy
                vec3 glowColor = vec3(0.0, 0.4, 0.0);
                gl_FragColor = vec4(glowColor * rim, rim * 0.85);
            }
        `,
        side: THREE.FrontSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    })
);
scene.add(atmosphereGlow);

// --- Animation loop ---
(function animate() {
    requestAnimationFrame(animate);
    earth.rotation.y  += 0.003;
    clouds.rotation.y += 0.0035;   // clouds drift slightly faster than earth
    renderer.render(scene, camera);
})();
