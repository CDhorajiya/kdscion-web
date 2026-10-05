/* ════════════════════════════════════════════════════════════════════
   js/showcase.js — the 3D viewer's Showcase, shared by every product page
   ════════════════════════════════════════════════════════════════════

   Same idea as the 3D post in instagram-studio.html: while the dress
   turns, it changes cloth on its own every 2.8 s, starting from the
   design's own cloth. The [Showcase | Turn] pill in the viewer has two
   parts: Showcase switches the cloth cycle on and off, and Turn (shown
   only while Showcase is on) chooses whether the model turns as it
   cycles. Both start on (off for reduced motion). Stopping the turn
   glides back to the front view; Showcase off leaves the plain viewer.
   A customer's own swatch tap turns it off too, so the cycle never
   overrides a real choice.

   Hover hold: while the mouse rests on the model itself (not the empty
   viewer around it), Showcase pauses on the cloth that's on — the turn
   stops, the model glides to its front view and no further cloth swaps.
   The moment the mouse is off the model, the turn and the cloth cycle
   pick up again.

   Placeholder cloths until each product has its own fabric swaps:
   texture, opacity, roughness and sheen are read from the page's swatch
   cards (so dashboard overrides still apply), names are the campaign's.
   A cloth the page doesn't offer is skipped; with fewer than two left,
   the pill stays hidden.

   The page owns the garment; this file only drives it. Usage:

     const showcase = createShowcase({
         canvas,                         // the viewer <canvas>
         list,                           // swatch list the cycle reads cards from
         applyCloth,                     // (texture, opacity, roughness, sheen) → Promise<true | false | undefined>
                                         //   true landed, false superseded, undefined failed
         restoreOriginal,                // put the GLB's own cloth back
         cancelPending,                  // drop a cloth still loading (Showcase was switched off)
         loadTexture,                    // path → Promise, for prefetching the next cloth
         designType,                     // label under "As designed", e.g. 'N° 1 · Classic shirt'
         canCycle,                       // optional () → bool: false if the garment has nothing to dress
     });
     showcase.attach(controls, camera);  // once OrbitControls exists
     showcase.modelReady(model);         // once the GLB is in the scene
     controls.update(showcase.frame());  // every animation frame
     showcase.userPicked();              // a customer's own swatch tap (e.isTrusted)
     showcase.landed(card);              // the page's own default-fabric click
   ════════════════════════════════════════════════════════════════════ */

import * as THREE from 'https://esm.sh/three@0.169.0';

const CLOTH_CYCLE = [
    { id: 'original',       name: 'As designed' },
    { id: 'linen-1',        name: 'Ivory bloom', type: '100% Linen' },
    // the 1600 px copy, not the 7 MB one
    { id: 'wool-2',         name: 'Burgundy',    type: '100% Wool', img: 'images/woolen fabric-1600.webp' },
    { id: 'wool-1',         name: 'Garden',      type: '100% Wool' },
    { id: 'cotton-linen-2', name: 'Plum',        type: 'Cotton linen blend' },
    { id: 'cotton-linen-1', name: 'Orchard',     type: 'Cotton linen blend' },
];
const CLOTH_HOLD_MS = 2800;
const LABEL_OUT_MS  = 400;

const CSS = `
        /* ── Auto cloth cycle label ── */
        .cloth-cycle {
            position: absolute;
            left: 1.4rem;
            bottom: 1.8rem;
            z-index: 5;
            pointer-events: none;
            margin: 0;
            font-family: "Times New Roman", serif;
            color: #111;
        }
        /* fades and rises in, fades and sinks out */
        .cloth-cycle { transition: opacity 0.4s ease, transform 0.4s ease; }
        .cloth-cycle[hidden],
        .cloth-cycle.is-out { opacity: 0; transform: translateY(0.4rem); }
        .cloth-cycle[hidden] { display: block; }
        .cloth-cycle__name { display: block; font-style: italic; font-size: 1.5rem; }
        .cloth-cycle__type { display: block; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; color: #6f6a63; }
        /* ── Showcase control: [Showcase | Turn] pill, top-left of the viewer ── */
        .showcase {
            position: absolute;
            top: 1.1rem;
            left: 1.1rem;
            z-index: 5;
            display: inline-flex;
            align-items: center;
            padding: 3px;
            border: 1px solid #d6d6d6;
            border-radius: 999px;
            background: rgba(255,255,255,0.82);
            -webkit-backdrop-filter: blur(6px);
            backdrop-filter: blur(6px);
            box-shadow: 0 1px 8px rgba(0,0,0,0.06);
        }
        .showcase[hidden] { display: none; }
        .showcase button {
            display: inline-flex;
            align-items: center;
            gap: 0.55rem;
            max-width: 12rem;
            padding: 0.42rem 0.95rem;
            border: 0;
            border-radius: 999px;
            background: transparent;
            color: #777;
            font-family: "Times New Roman", serif;
            font-size: 1rem;
            letter-spacing: 2px;
            text-transform: uppercase;
            white-space: nowrap;
            overflow: hidden;
            cursor: pointer;
            transition: background 0.25s, color 0.25s, max-width 0.35s ease, padding 0.35s ease, opacity 0.25s;
        }
        .showcase button:hover { color: #1a1a1a; }
        .showcase button:focus-visible { outline: 1px solid rgba(100,70,0,0.6); outline-offset: 1px; }
        .showcase button[aria-pressed="true"] {
            background: rgba(100,70,0,0.08);
            color: rgba(100,70,0,0.85);
        }
        /* Turn only means something while Showcase runs: it folds away otherwise */
        .showcase:not(.on) .showcase__turn {
            max-width: 0;
            padding-inline: 0;
            opacity: 0;
            pointer-events: none;
        }
        /* three cloth dots: still and grey when off, stepping through when on */
        .showcase__dots { display: inline-flex; padding-left: 0.2em; }
        .showcase__dots i {
            width: 0.7em;
            height: 0.7em;
            margin-left: -0.22em;
            border-radius: 50%;
            border: 1px solid #fff;
            filter: grayscale(1) opacity(0.55);
            transition: filter 0.3s;
        }
        .showcase__dots i:nth-child(1) { background: #dcd0b4; }
        .showcase__dots i:nth-child(2) { background: #6d1f2c; }
        .showcase__dots i:nth-child(3) { background: #5b6b45; }
        .showcase.on .showcase__dots i { filter: none; animation: showcase-dot 8.4s ease-in-out infinite; }
        .showcase.on .showcase__dots i:nth-child(2) { animation-delay: 2.8s; }
        .showcase.on .showcase__dots i:nth-child(3) { animation-delay: 5.6s; }
        @keyframes showcase-dot {
            0%, 33%, 100% { transform: none; }
            8%, 25% { transform: translateY(-0.18em); }
        }
        .showcase__turn svg {
            width: 1.05em;
            height: 1.05em;
            fill: none;
            stroke: currentColor;
            stroke-width: 1.6;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        .showcase.on .showcase__turn[aria-pressed="true"] svg { animation: showcase-spin 6s linear infinite; }
        @keyframes showcase-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
            .showcase.on .showcase__dots i,
            .showcase.on .showcase__turn[aria-pressed="true"] svg { animation: none; }
        }
        @media (max-width: 768px) {
            .showcase { top: 0.7rem; left: 0.7rem; }
            .showcase button { padding: 0.36rem 0.75rem; letter-spacing: 1.5px; gap: 0.45rem; }
        }
`;

const MARKUP = `
                <div class="showcase on" id="showcase" role="group" aria-label="Showcase" hidden>
                    <button id="showcase-btn" aria-pressed="true" title="Show the design in each cloth, one after another">
                        <span class="showcase__dots" aria-hidden="true"><i></i><i></i><i></i></span>Showcase
                    </button>
                    <button class="showcase__turn" id="turn-btn" aria-pressed="true" title="Turn the model while it shows each cloth">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.35-5.65"/><path d="M20 4v4.5h-4.5"/></svg>Turn
                    </button>
                </div>
                <p class="cloth-cycle" id="cloth-cycle" aria-live="polite" hidden><span class="cloth-cycle__name"></span><span class="cloth-cycle__type"></span></p>
`;

export function createShowcase({ canvas, list, applyCloth, restoreOriginal, cancelPending, loadTexture, designType = '', canCycle = () => true }) {
    const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!document.getElementById('showcase-css')) {
        const style = document.createElement('style');
        style.id = 'showcase-css';
        style.textContent = CSS;
        document.head.appendChild(style);
    }
    canvas.parentElement.insertAdjacentHTML('beforeend', MARKUP);
    const clothLabel  = document.getElementById('cloth-cycle');
    const showcaseEl  = document.getElementById('showcase');
    const showcaseBtn = document.getElementById('showcase-btn');
    const turnBtn     = document.getElementById('turn-btn');

    let controls = null, camera = null, model = null;
    let showcaseOn = !REDUCED_MOTION;
    let turnOn     = !REDUCED_MOTION;   // Showcase's second option: cycle cloths while turning, or standing still
    let hoverHold  = false;             // mouse resting on the model: hold the cloth in front view
    let cloths = null, cycleTimer = null, cycleIdx = 0;

    function clothArgs(c) {
        if (c.id === 'original') return null;
        const card = list.querySelector(`.swatch-card[data-fabric-id="${window.CSS.escape(c.id)}"]`);
        if (!card) return undefined;    // not offered on this page
        return [c.img || card.dataset.texture,
                parseFloat(card.dataset.opacity ?? '1'),
                parseFloat(card.dataset.roughness ?? '0.75'),
                parseFloat(card.dataset.sheen ?? '0')];
    }

    /* The label fades out, takes the new text unseen, and fades back in */
    let labelTimer = null;
    const labelIsOut = () => clothLabel.hidden || clothLabel.classList.contains('is-out');
    function fadeOutCloth() {
        clearTimeout(labelTimer);
        clothLabel.classList.add('is-out');
    }
    function showCloth(c) {
        clearTimeout(labelTimer);
        const swapIn = () => {
            clothLabel.children[0].textContent = c.name;
            clothLabel.children[1].textContent = c.id === 'original' ? designType : c.type;
            clothLabel.hidden = false;
            void clothLabel.offsetWidth;   // let the out state paint first, so the rise plays
            clothLabel.classList.remove('is-out');
        };
        if (labelIsOut()) swapIn();
        else { fadeOutCloth(); labelTimer = setTimeout(swapIn, LABEL_OUT_MS); }
    }
    function hideCloth() {
        clearTimeout(labelTimer);
        clothLabel.classList.add('is-out');
        labelTimer = setTimeout(() => { clothLabel.hidden = true; }, LABEL_OUT_MS);
    }
    const wait = ms => new Promise(r => setTimeout(r, ms));
    function prefetch(c) {
        const args = clothArgs(c);
        if (args) loadTexture(args[0]).catch(() => {});
    }

    let viewerOnScreen = true;
    new IntersectionObserver(([e]) => { viewerOnScreen = e.isIntersecting; }).observe(canvas);

    let failStreak = 0;
    let stepId = 0;   // only the newest step may finish, if Showcase is flicked off and on mid-fade
    async function cycleStep() {
        if (!showcaseOn || hoverHold) return;
        const id = ++stepId;
        // hold while the tab is hidden or the viewer is scrolled away
        if (document.hidden || !viewerOnScreen) { cycleTimer = setTimeout(cycleStep, 500); return; }
        const next = (cycleIdx + 1) % cloths.length;
        const args = clothArgs(cloths[next]);
        // the name leaves first; the cloth changes while the label is out of sight
        fadeOutCloth();
        await wait(LABEL_OUT_MS);
        if (!showcaseOn || id !== stepId) return;
        const landed = args ? await applyCloth(...args) : (restoreOriginal(), true);
        if (!showcaseOn || id !== stepId || landed === false) return;   // another choice took over while it loaded
        cycleIdx = next;
        if (!landed) {   // texture failed: skip that cloth, and rest a beat if none will load (offline)
            failStreak++;
            cycleTimer = setTimeout(cycleStep, failStreak >= cloths.length ? CLOTH_HOLD_MS : 0);
            return;
        }
        failStreak = 0;
        showCloth(cloths[next]);
        prefetch(cloths[(next + 1) % cloths.length]);   // fetch the one after while this one is on show
        cycleTimer = setTimeout(cycleStep, CLOTH_HOLD_MS);
    }

    /* Turn or Showcase off: glide back to the front view the page opens on
       (undoing any zoom or pan too), the short way round, easing in and out. */
    let frontTween = null;
    function returnToFront() {
        if (!controls) return;
        controls._sphericalDelta?.set(0, 0, 0);   // drop the turn's leftover momentum
        const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
        const to   = new THREE.Spherical().setFromVector3(controls.position0.clone().sub(controls.target0));
        const dTheta = ((to.theta - from.theta) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        frontTween = {
            t0: performance.now(),
            ms: 600 + Math.abs(dTheta) / Math.PI * 1000,   // 0.6 s for a nudge, 1.6 s from the back
            from, to, dTheta,
            target: controls.target.clone(),
        };
    }
    const _sph = new THREE.Spherical();
    function stepFrontTween(now) {
        const { t0, ms, from, to, dTheta, target } = frontTween;
        const k = Math.min((now - t0) / ms, 1);
        const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
        _sph.set(from.radius + (to.radius - from.radius) * e,
                 from.phi + (to.phi - from.phi) * e,
                 from.theta + dTheta * e);
        controls.target.lerpVectors(target, controls.target0, e);
        camera.position.setFromSpherical(_sph).add(controls.target);
        if (k === 1) frontTween = null;
    }

    function syncUI() {
        showcaseEl.classList.toggle('on', showcaseOn);
        showcaseBtn.setAttribute('aria-pressed', showcaseOn);
        turnBtn.setAttribute('aria-pressed', turnOn);
        turnBtn.tabIndex = showcaseOn ? 0 : -1;
        if (controls) controls.autoRotate = !!cloths && showcaseOn && turnOn && !hoverHold;
    }
    function setShowcase(on) {
        const wasTurning = showcaseOn && turnOn;
        showcaseOn = on;
        syncUI();
        clearTimeout(cycleTimer);
        if (!on) {
            stepId++;
            cancelPending();   // a cloth still loading for the cycle must not land after this
            hideCloth();
            if (wasTurning) returnToFront();
            return;
        }
        if (turnOn) frontTween = null;
        if (cloths) cycleStep();   // straight into the next cloth, so the tap shows at once
    }
    /* Turn off: cloths keep changing, the model settles on its front */
    function setTurn(on) {
        turnOn = on;
        syncUI();
        if (on) frontTween = null;
        else returnToFront();
    }

    /* Hover hold. A swap already mid-fade still lands; the next one waits.
       Mouse only, so a touch drag on phones doesn't count as hovering. */
    function setHoverHold(on) {
        if (hoverHold === on) return;
        hoverHold = on;
        syncUI();
        if (!showcaseOn || !cloths) return;
        clearTimeout(cycleTimer);
        if (on) returnToFront();
        else {
            if (turnOn) frontTween = null;
            cycleTimer = setTimeout(cycleStep, CLOTH_HOLD_MS);
        }
    }
    /* The avatar's skinned meshes (body, hair, shoes) miss three.js's CPU
       skinning raycast on these CLO exports, so they're tested in their
       rest shape, which is the standing pose on screen. */
    const hoverRay = new THREE.Raycaster();
    const hoverNdc = new THREE.Vector2();
    let hoverPt = null, hoverQueued = false;
    let hoverTargets = null, hoverTargetsOf = null;
    function hoverTargetsFor(m) {
        if (hoverTargetsOf === m) return hoverTargets;
        hoverTargets = [];
        m.traverse((n) => {
            if (!n.isMesh) return;
            if (!n.isSkinnedMesh) { hoverTargets.push(n); return; }
            const proxy = new THREE.Mesh(n.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
            proxy.matrixAutoUpdate = false;
            proxy.userData.of = n;
            hoverTargets.push(proxy);
        });
        hoverTargetsOf = m;
        return hoverTargets;
    }
    function overModel() {
        if (!hoverPt || !model || !camera) return false;
        const r = canvas.getBoundingClientRect();
        hoverNdc.set((hoverPt.x - r.left) / r.width * 2 - 1, -(hoverPt.y - r.top) / r.height * 2 + 1);
        hoverRay.setFromCamera(hoverNdc, camera);
        return hoverTargetsFor(model).some((m) => {
            const src = m.userData.of || m;
            for (let o = src; o; o = o.parent) if (!o.visible) return false;
            if (m !== src) m.matrixWorld.copy(src.matrixWorld);
            return hoverRay.intersectObject(m, false).length > 0;
        });
    }
    function checkHover() {
        hoverQueued = false;
        // mid-glide the model slides under a still cursor: judge once it's settled
        if (hoverHold && frontTween) { queueHoverCheck(); return; }
        setHoverHold(overModel());
    }
    function queueHoverCheck() {
        if (!hoverQueued) { hoverQueued = true; requestAnimationFrame(checkHover); }
    }
    canvas.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        hoverPt = { x: e.clientX, y: e.clientY };
        queueHoverCheck();
    });
    canvas.addEventListener('pointerleave', (e) => {
        if (e.pointerType !== 'mouse') return;
        hoverPt = null;
        setHoverHold(false);
    });

    syncUI();
    showcaseBtn.addEventListener('click', () => setShowcase(!showcaseOn));
    turnBtn.addEventListener('click', () => setTurn(!turnOn));

    let lastFrame = performance.now();
    return {
        attach(c, cam) {
            controls = c;
            camera = cam;
            // one slow turn every ~34 s, like the Instagram 3D post; it holds
            // still while the dress is being dragged and picks up after
            controls.autoRotateSpeed = 60 / 33.6;
            controls.addEventListener('start', () => { frontTween = null; });   // a drag takes over
            syncUI();
        },
        /* Called once the GLB is in: the model lands in its own cloth */
        modelReady(m) {
            model = m;
            cloths = canCycle() ? CLOTH_CYCLE.filter(c => clothArgs(c) !== undefined) : [];
            if (cloths.length < 2) { cloths = null; return; }
            showcaseEl.hidden = false;
            syncUI();
            if (!showcaseOn) return;
            showCloth(cloths[0]);
            prefetch(cloths[1]);
            cycleTimer = setTimeout(cycleStep, CLOTH_HOLD_MS);
        },
        /* Every animation frame: steps the front glide and returns seconds
           since the last frame, so the turn is the same speed at 60 and 120 Hz */
        frame() {
            const now = performance.now();
            if (frontTween) stepFrontTween(now);
            const dt = Math.min((now - lastFrame) / 1000, 0.1);
            lastFrame = now;
            return dt;
        },
        /* A real tap ends the auto cycle */
        userPicked() {
            if (showcaseOn) setShowcase(false);
        },
        /* The page's own default-fabric click (the pool's in-stock cloth) lands
           mid-cycle: label it and give it a full hold before moving on. */
        landed(card) {
            if (!showcaseOn || !cloths) return;
            const id = card.dataset.fabricId;
            const known = CLOTH_CYCLE.find(c => c.id === id);
            showCloth(known || {
                name: card.querySelector('img')?.alt || id,
                type: card.closest('.fabric-category')?.querySelector('.category-card p')?.textContent || '',
            });
            clearTimeout(cycleTimer);
            if (!hoverHold) cycleTimer = setTimeout(cycleStep, CLOTH_HOLD_MS);
        },
    };
}
