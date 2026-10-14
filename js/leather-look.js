/* leather-look.js — leather on a garment looks like leather, not a flat print.

   The garment pages dress every cloth in an unlit material (MeshBasicMaterial):
   right for woven fabrics, whose colour must read true, but on leather it flattens
   everything — the folds, the seams, the panels and the hems all disappear into one
   even tone. This module watches the page's 3D scene and, whenever a piece is
   dressed in a leather swatch (images/fabrics/leather-…), re-dresses it the way
   leather is photographed, as on L1:
     - a lit material with the grain raised from the leather's own texture,
       each finish with its own sheen: calf a soft satin, suede matte with a nap,
       patent a glassy coat;
     - a low raking light from the upper left and a little less flat fill,
       so the drape and the construction read;
     - a fine edge along every panel edge, seam and hem, like an edge-painted
       seam: light on dark leathers, dark on light ones.
   Any other cloth is left exactly as the page made it, and all of this is undone
   the moment the piece goes back to a fabric or to "As designed".

   It needs nothing from the page: three.js is one shared module (same URL), so
   hooking Scene.onBeforeRender reaches the page's own scene.
   Use: <script type="module" src="js/leather-look.js"></script> on a product page. */
import * as THREE from 'https://esm.sh/three@0.169.0';

const LEATHER = /\/fabrics\/leather-/;
const lit = new WeakMap();        // the page's flat material → its leather material
const edgesOf = new WeakMap();    // geometry → its edge geometry
const tone = new Map();           // texture src → average brightness 0–1
const states = new WeakMap();     // scene → { rake, ambients, frame, meshes }

const srcOf = (tex) => tex?.image?.currentSrc || tex?.image?.src || '';
const isLeather = (m) => !!m && !Array.isArray(m) && m.map && LEATHER.test(srcOf(m.map));

function brightness(tex) {
    const src = srcOf(tex);
    if (tone.has(src)) return tone.get(src);
    let v = 0.5;
    try {
        const c = document.createElement('canvas');
        c.width = c.height = 16;
        const g = c.getContext('2d');
        g.drawImage(tex.image, 0, 0, 16, 16);
        const d = g.getImageData(0, 0, 16, 16).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        v = s / (d.length / 4) / 255;
    } catch (e) { /* keep the middle */ }
    tone.set(src, v);
    return v;
}

function finish(src) {
    if (/patent/.test(src)) return { roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04, bumpScale: 0.4 };
    if (/suede/.test(src))  return { roughness: 0.96, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0.55, 0.52, 0.48), bumpScale: 1.6 };
    return { roughness: 0.52, clearcoat: 0.35, clearcoatRoughness: 0.42, bumpScale: 1.1 };   // calf, pebble grain
}

function leatherMaterial(flat) {
    let m = lit.get(flat);
    if (!m) {
        const f = finish(srcOf(flat.map));
        m = new THREE.MeshPhysicalMaterial({
            map: flat.map,
            bumpMap: flat.map,               // the grain, raised from the leather's own picture
            side: THREE.DoubleSide,
            opacity: flat.opacity,
            transparent: flat.transparent,
            metalness: 0,
            ...f,
        });
        m.userData.leather = true;
        m.userData.tone = brightness(flat.map);
        lit.set(flat, m);
        flat.addEventListener('dispose', () => { m.dispose(); lit.delete(flat); });
    }
    return m;
}

/* Panel edges, seams and hems: the edges that belong to only one triangle
   (a CLO piece is its own sheet), matched by position so UV splits don't count. */
function seamGeometry(geo) {
    let e = edgesOf.get(geo);
    if (e) return e;
    const pos = geo.attributes.position, idx = geo.index;
    const n = idx ? idx.count : pos.count;
    const key = (i) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    const keys = new Array(pos.count);
    for (let i = 0; i < pos.count; i++) keys[i] = key(i);
    const count = new Map();
    const at = (k) => (idx ? idx.getX(k) : k);
    for (let t = 0; t < n; t += 3) {
        for (let j = 0; j < 3; j++) {
            const a = at(t + j), b = at(t + (j + 1) % 3);
            const ka = keys[a], kb = keys[b];
            const k = ka < kb ? ka + '|' + kb : kb + '|' + ka;
            const c = count.get(k);
            if (c) c[0]++; else count.set(k, [1, a, b]);
        }
    }
    const out = [];
    for (const [, [c, a, b]] of count) {
        if (c !== 1) continue;
        out.push(pos.getX(a), pos.getY(a), pos.getZ(a), pos.getX(b), pos.getY(b), pos.getZ(b));
    }
    e = new THREE.BufferGeometry();
    e.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
    edgesOf.set(geo, e);
    return e;
}

function seamLines(mesh) {
    let lines = mesh.children.find((c) => c.userData.leatherSeam);
    if (!lines) {
        lines = new THREE.LineSegments(seamGeometry(mesh.geometry),
            new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }));
        lines.userData.leatherSeam = true;
        lines.renderOrder = 2;
        lines.raycast = () => {};            // never in the way of a click
        mesh.add(lines);
    }
    if (lines.userData.geo !== mesh.geometry) {      // the page swaps geometry (UV-normalised copy)
        lines.geometry = seamGeometry(mesh.geometry);
        lines.userData.geo = mesh.geometry;
    }
    return lines;
}

function state(scene) {
    let s = states.get(scene);
    if (!s) {
        const rake = new THREE.DirectionalLight(0xfff4e6, 0);
        rake.position.set(-4, 3.2, 2.2);            // low, from the upper left and in front
        rake.userData.leatherRake = true;
        scene.add(rake);
        s = { rake, ambients: [], meshes: [], on: false };
        states.set(scene, s);
    }
    return s;
}

function update(scene) {
    const s = state(scene);
    // Every frame: a scene is ~100 objects, and some pages draw only when something
    // changes, so a list kept between frames could miss the garment that was just dressed.
    s.meshes = [];
    s.ambients = [];
    scene.traverse((o) => {
        if (o.isMesh) s.meshes.push(o);
        else if (o.isAmbientLight) s.ambients.push(o);
    });
    let any = false;
    for (const mesh of s.meshes) {
        let m = mesh.material;
        if (isLeather(m) && !m.userData.leather) {   // the page just dressed it in a leather swatch
            mesh.material = m = leatherMaterial(m);
        }
        const leather = !!m && m.userData?.leather;
        const seam = mesh.children.find((c) => c.userData.leatherSeam);
        if (leather) {
            any = true;
            const lines = seamLines(mesh);
            const dark = m.userData.tone < 0.42;
            lines.material.color.set(dark ? 0xf3e4cc : 0x1c130c);
            lines.material.opacity = dark ? 0.55 : 0.5;
            lines.visible = true;
        } else if (seam) {
            seam.visible = false;
        }
    }
    if (any !== s.on) {
        s.on = any;
        s.rake.intensity = any ? 1.25 : 0;
        for (const a of s.ambients || []) {
            if (a.userData.flatIntensity === undefined) a.userData.flatIntensity = a.intensity;
            a.intensity = any ? a.userData.flatIntensity * 0.62 : a.userData.flatIntensity;
        }
    }
}

const previous = THREE.Scene.prototype.onBeforeRender;
THREE.Scene.prototype.onBeforeRender = function (renderer, scene, camera, target) {
    try { update(this); } catch (e) { console.warn('[leather-look]', e); }
    if (previous) return previous.call(this, renderer, scene, camera, target);
};
