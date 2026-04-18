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

const texture = new THREE.TextureLoader().load('./images/earth_atmos_4096.webp');
texture.colorSpace = THREE.SRGBColorSpace;
const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 64, 64),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0 })
);
earth.rotation.x = 0.4;
scene.add(earth);

// Pause rotation on hover
let paused = false;
canvas.addEventListener('mouseenter', () => { paused = true; });
canvas.addEventListener('mouseleave', () => { paused = false; });

// Geographic coordinates → 3D unit vector matching Three.js SphereGeometry UV mapping.
// Three.js sphere: x = -cos(phi)*sin(theta), z = sin(phi)*sin(theta)
// where phi = π + lon_rad (equirectangular texture, lon=-180° at u=0).
// Simplifies to: x = cos(lat)*cos(lon), z = -cos(lat)*sin(lon)
function latLon(lat, lon) {
    const φ = lat * Math.PI / 180;
    const λ = lon * Math.PI / 180;
    return new THREE.Vector3(
        Math.cos(φ) * Math.cos(λ),
        Math.sin(φ),
        -Math.cos(φ) * Math.sin(λ)
    );
}

const FABRIC_COLOR = {
    WOOL:    '#c4a85e',
    LINEN:   '#7aab6a',
    COTTON:  '#6aafc4',
    SILK:    '#b57bde',
    LEATHER: '#9b7240',
};

// ao: fan the label direction (degrees) away from the straight outward vector.
// Endpoint is always placed at GLOBE_R + LABEL_PAD from canvas centre → always outside.
// fabrics: array — multiple entries render as stacked rows in the label.
const PINS = [
    { label: 'AUSTRALIA',   fabrics: ['WOOL'],             lat: -25, lon:  133, ao:   0 },
    { label: 'NEW ZEALAND',  fabrics: ['WOOL'],             lat: -41, lon:  174, ao:   0 },
    { label: 'IRELAND',      fabrics: ['LINEN'],            lat:  53, lon:   -8, ao: -60 },
    { label: 'NETHERLANDS',  fabrics: ['LINEN'],            lat:  52, lon:    5, ao: -40 },
    { label: 'BELGIUM',      fabrics: ['LINEN'],            lat:  50, lon:    4, ao:   0 },
    { label: 'FRANCE',       fabrics: ['LINEN', 'LEATHER'], lat:  46, lon:    2, ao:  40 },
    { label: 'ITALY',        fabrics: ['LEATHER'],          lat:  42, lon:   12, ao: -20 },
    { label: 'EGYPT',        fabrics: ['COTTON'],           lat:  26, lon:   30, ao:  80 },
    { label: 'USA',          fabrics: ['COTTON'],           lat:  38, lon:  -97, ao:   0 },
    { label: 'INDIA',        fabrics: ['COTTON', 'SILK', 'LEATHER'], lat:  20, lon:   77, ao:   0 },
];

// Build annotation DOM elements
const annLayer = document.getElementById('ann-layer');
const pins = PINS.map(p => {
    const color = FABRIC_COLOR[p.fabrics[0]];
    const vec = latLon(p.lat, p.lon);

    const dot = document.createElement('div');
    dot.className = 'ann-dot';
    dot.style.background = color;
    dot.style.boxShadow = `0 0 5px ${color}`;
    annLayer.appendChild(dot);

    const line = document.createElement('div');
    line.className = 'ann-line';
    line.style.background = color + '88';
    annLayer.appendChild(line);

    const lbl = document.createElement('div');
    lbl.className = 'ann-label';
    const fabricSpans = p.fabrics.map(f =>
        `<span class="ann-fabric" style="color:${FABRIC_COLOR[f]}">${f}</span>`
    ).join('');
    lbl.innerHTML = `${p.label}${fabricSpans}`;
    annLayer.appendChild(lbl);

    return { ...p, vec, color, dot, line, lbl };
});

const _v = new THREE.Vector3();

// Globe screen radius: camera z=3.2, sphere r=1, fov=45 →
// NDC edge = 1 / (tan(22.5°) * 3.2) ≈ 0.754 → pixel radius = 0.754 * (W/2)
const GLOBE_R  = 0.754 * (W / 2); // ≈ 151px
const LABEL_PAD = 26;              // px beyond globe edge where label begins

function updatePins() {
    const cx = W / 2, cy = H / 2;
    pins.forEach(p => {
        _v.copy(p.vec).applyMatrix4(earth.matrixWorld);

        // Hide when facing away from camera (threshold > 0 hides before reaching limb)
        if (_v.z < 0.12) {
            p.dot.style.visibility  = 'hidden';
            p.line.style.visibility = 'hidden';
            p.lbl.style.visibility  = 'hidden';
            return;
        }
        p.dot.style.visibility  = '';
        p.line.style.visibility = '';
        p.lbl.style.visibility  = '';

        const ndc = _v.clone().project(camera);
        const sx = (ndc.x + 1) / 2 * W;
        const sy = (1 - ndc.y) / 2 * H;

        // Outward direction from globe centre, rotated by per-pin ao offset.
        // Endpoint is always at GLOBE_R + LABEL_PAD from centre → always outside globe.
        const dx = sx - cx, dy = sy - cy;
        const d  = Math.sqrt(dx * dx + dy * dy) || 1;
        const aoR = p.ao * Math.PI / 180;
        const nx0 = dx / d, ny0 = dy / d;
        const nx  = nx0 * Math.cos(aoR) - ny0 * Math.sin(aoR);
        const ny  = nx0 * Math.sin(aoR) + ny0 * Math.cos(aoR);

        const ex = cx + nx * (GLOBE_R + LABEL_PAD);
        const ey = cy + ny * (GLOBE_R + LABEL_PAD);
        const lineLen  = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        const angleDeg = Math.atan2(ey - sy, ex - sx) * 180 / Math.PI;

        // Dot at pin position
        p.dot.style.left = sx + 'px';
        p.dot.style.top  = sy + 'px';

        // Rotated line starting at pin
        p.line.style.left   = sx + 'px';
        p.line.style.top    = sy + 'px';
        p.line.style.width  = lineLen + 'px';
        p.line.style.transform       = `rotate(${angleDeg}deg)`;
        p.line.style.transformOrigin = 'left center';

        // Label at end point, side determined by horizontal direction
        p.lbl.style.left = ex + 'px';
        p.lbl.style.top  = ey + 'px';
        p.lbl.className  = nx >= 0 ? 'ann-label right' : 'ann-label left';
    });
}

(function animate() {
    requestAnimationFrame(animate);
    if (!paused) earth.rotation.y += 0.003;
    updatePins();
    renderer.render(scene, camera);
})();
