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

// Convert geographic coordinates to a point on the sphere surface
function latLngToVec3(lat, lng, r = 1) {
    const phi   = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -r * Math.sin(phi) * Math.cos(theta),
         r * Math.cos(phi),
         r * Math.sin(phi) * Math.sin(theta)
    );
}

// Fabric sourcing locations + home city Surat
const HOME = { name: 'SURAT', lat: 21.17, lng: 72.83, material: 'Home', color: 0xffd700, isHome: true };
const sources = [
    { name: 'Egypt',       lat: 30.04,  lng:  31.24, material: 'Cotton', color: 0xf5deb3 },
    { name: 'Ahmedabad',   lat: 23.02,  lng:  72.57, material: 'Cotton', color: 0xf5deb3 },
    { name: 'Belgium',     lat: 50.85,  lng:   4.35, material: 'Linen',  color: 0xa8d8a8 },
    { name: 'Normandy',    lat: 49.18,  lng:   0.37, material: 'Linen',  color: 0xa8d8a8 },
    { name: 'Yorkshire',   lat: 53.96,  lng:  -1.08, material: 'Wool',   color: 0xe8d5c4 },
    { name: 'New Zealand', lat: -43.53, lng: 172.64, material: 'Wool',   color: 0xe8d5c4 },
];
const allLocations = [HOME, ...sources];

// Place glowing pin dots on the sphere (children of earth so they rotate with it)
allLocations.forEach(loc => {
    loc.vec = latLngToVec3(loc.lat, loc.lng, 1.015);

    const geo = new THREE.SphereGeometry(loc.isHome ? 0.028 : 0.018, 10, 10);
    const mat = new THREE.MeshBasicMaterial({ color: loc.color });
    loc.pin = new THREE.Mesh(geo, mat);
    loc.pin.position.copy(loc.vec);
    earth.add(loc.pin);
});

// Curved arc lines from each source city to Surat
const homeVec = latLngToVec3(HOME.lat, HOME.lng, 1.015);
sources.forEach(loc => {
    const start = latLngToVec3(loc.lat, loc.lng, 1.015);
    // Lift midpoint above sphere surface to form an arc
    const mid   = start.clone().add(homeVec).normalize().multiplyScalar(1.5);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, homeVec.clone());
    const geo   = new THREE.BufferGeometry().setFromPoints(curve.getPoints(60));
    const mat   = new THREE.LineBasicMaterial({ color: loc.color, transparent: true, opacity: 0.6 });
    earth.add(new THREE.Line(geo, mat));
});

// HTML label overlay — wrap canvas in a relative-positioned div
const wrapper = document.createElement('div');
wrapper.style.cssText = 'position:relative; width:400px; height:400px; margin:2rem auto 0;';
canvas.parentNode.insertBefore(wrapper, canvas);
wrapper.appendChild(canvas);
canvas.style.margin = '0';

const labelLayer = document.createElement('div');
labelLayer.style.cssText = 'position:absolute; top:0; left:0; width:400px; height:400px; pointer-events:none; overflow:hidden;';
wrapper.appendChild(labelLayer);

// Create a label element per location
allLocations.forEach(loc => {
    const el = document.createElement('div');
    el.style.cssText = `
        position: absolute;
        color: ${loc.isHome ? '#ffd700' : '#f0ede8'};
        font-size: 0.85rem;
        font-family: inherit;
        letter-spacing: 0.1em;
        white-space: nowrap;
        transform: translate(-50%, -210%);
        text-shadow: 0 1px 5px rgba(0,0,0,0.95);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s;
    `;
    el.textContent = loc.isHome
        ? `◆ ${loc.name}`
        : `${loc.name.toUpperCase()} · ${loc.material.toUpperCase()}`;
    labelLayer.appendChild(el);
    loc.labelEl = el;
});

const camDir = new THREE.Vector3();

function updateLabels() {
    camera.getWorldDirection(camDir);
    allLocations.forEach(loc => {
        const worldPos = new THREE.Vector3();
        loc.pin.getWorldPosition(worldPos);

        // Dot product: positive means pin is facing the camera
        const dot = worldPos.clone().normalize().dot(camera.position.clone().normalize());

        if (dot > 0.12) {
            const projected = worldPos.clone().project(camera);
            const x = (projected.x *  0.5 + 0.5) * W;
            const y = (projected.y * -0.5 + 0.5) * H;
            loc.labelEl.style.left    = x + 'px';
            loc.labelEl.style.top     = y + 'px';
            loc.labelEl.style.opacity = Math.min(1, (dot - 0.12) * 7).toFixed(2);
        } else {
            loc.labelEl.style.opacity = '0';
        }
    });
}

(function animate() {
    requestAnimationFrame(animate);
    earth.rotation.y += 0.003;
    updateLabels();
    renderer.render(scene, camera);
})();
