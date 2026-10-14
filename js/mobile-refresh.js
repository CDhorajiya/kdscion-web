/* mobile-refresh.js — the cleaner phone layout (see css/mobile-refresh.css).
   Phones only (max-width 768px at load); on desktop it does nothing at all.
   Loaded in <head>, before the page's own module script, so the 3D camera
   distance below is in place when the viewer starts.
   "Restore default mobile": python3 tools/mobile_refresh.py restore */
(function () {
    if (!window.matchMedia || !window.matchMedia('(max-width: 768px)').matches) return;
    document.documentElement.classList.add('kd-m2');

    // Closer camera on phones, so the garment fills more of the taller viewer
    // (product pages use window.KD_CAMERA_Z || 3).
    window.KD_CAMERA_Z = 2.65;

    document.addEventListener('DOMContentLoaded', function () {
        var menu = document.querySelector('.bb-panel-nav');
        if (menu) menuScroll(menu);
        var row = document.querySelector('.product-title-row');
        var crumb = document.querySelector('.product-breadcrumb');
        if (!row || !crumb) return;
        var h2 = row.querySelector('h2'), p = row.querySelector('div > p');

        // "· KDscion-w1 · The House of Scion" → read the code, then hide that text
        var code = '';
        if (p) {
            var m = p.textContent.match(/KDscion-\s*([a-z](?:-[a-z])?\d+(?:\s*&\s*[a-z]\d+)?)/i);
            if (m) code = m[1].replace(/\s+/g, ' ').toUpperCase();
            [].slice.call(p.childNodes).forEach(function (n) {
                if (n.nodeType === 3 && n.textContent.trim()) {
                    var s = document.createElement('span');
                    s.className = 'kd-m2-meta';
                    n.parentNode.replaceChild(s, n);
                    s.appendChild(n);
                }
            });
        }

        // "W1 · Full Sleeve Classic Shirt"
        if (h2 && code && !h2.querySelector('.kd-m2-code')) {
            var c = document.createElement('span');
            c.className = 'kd-m2-code';
            c.textContent = code + ' · ';
            h2.insertBefore(c, h2.firstChild);
        }

        // Logo on the left (instead of "King Dhorajiya"), Pool of Designs on the right
        var home = crumb.querySelector('a');
        if (home) home.classList.add('kd-m2-logo');
        var pool = p && p.querySelector('.product-home-link');
        if (pool) crumb.appendChild(pool);

        addFabricTab();
        // The viewer's tools with real fingertip targets (html.kd-m3): every product page.
        document.documentElement.classList.add('kd-m3');
        buildToolRail();
        compactShowcase();
    });

    // The Bespoke Boutique menu (Men, Women, Boy, Girl) on phones (css/mobile-refresh.css §7):
    // a light tick as each row passes the middle of the list, like a watch crown;
    // a firmer bump and a small give at either end; a fade and a gold chevron while
    // there is more below, and a gold hairline with a diamond once the list ends.
    // (Vibration is Android's; iPhones show the same cues without it.)
    function menuScroll(nav) {
        var panel = nav.closest('.bb-panel') || nav.parentNode;
        nav.classList.add('kd-m2-scroller');
        var cue = document.createElement('div');
        cue.className = 'kd-m2-cue';
        cue.setAttribute('aria-hidden', 'true');
        cue.innerHTML = '<svg class="kd-m2-cue__more" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>' +
            '<span class="kd-m2-cue__end"><i></i><b></b><i></i></span>';
        panel.appendChild(cue);
        var buzz = function (ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not allowed */ } };
        var last = nav.scrollTop, row = null, queued = false, bounceT = 0, endT = 0, touched = false;
        nav.addEventListener('touchstart', function () { touched = true; }, { passive: true });
        function rowAtMiddle() {
            var mid = nav.getBoundingClientRect().top + nav.clientHeight / 2, rows = nav.querySelectorAll('.bb-acc-hdr, .bb-acc.open .bb-acc-body > a, .bb-acc.open .bb-sub-hdr, .bb-sub.open .bb-sub-body a');
            for (var i = 0; i < rows.length; i++) {
                var r = rows[i].getBoundingClientRect();
                if (r.height && r.top <= mid && r.bottom > mid) return rows[i];
            }
            return null;
        }
        function give(where) {
            nav.classList.remove('kd-give-top', 'kd-give-bottom');
            void nav.offsetWidth;                                    // restart the animation
            nav.classList.add('kd-give-' + where);
            clearTimeout(bounceT);
            bounceT = setTimeout(function () { nav.classList.remove('kd-give-' + where); }, 500);
        }
        function update() {
            queued = false;
            var max = nav.scrollHeight - nav.clientHeight, st = nav.scrollTop;
            var up = st > 2, down = st < max - 2;
            nav.classList.toggle('kd-up', up);
            nav.classList.toggle('kd-down', down && max > 2);
            // the cue sits just under the list, clear of its last row
            var nr = nav.getBoundingClientRect(), pr = panel.getBoundingClientRect();
            cue.style.top = Math.round(nr.bottom - pr.top + 4) + 'px';
            cue.classList.toggle('is-more', down && max > 2);
            if (touched) {
                var r = rowAtMiddle();
                if (r && r !== row && row) buzz(6);              // a tick per row
                row = r;
                if (max > 2 && st <= 0 && last > 0) { buzz(18); give('top'); }
                if (max > 2 && st >= max - 1 && last < max - 1) {
                    buzz([14, 40, 14]); give('bottom');
                    cue.classList.add('is-end');
                    clearTimeout(endT);
                    endT = setTimeout(function () { cue.classList.remove('is-end'); }, 1600);
                }
            }
            last = st;
        }
        function soon() { if (!queued) { queued = true; requestAnimationFrame(update); } }
        nav.addEventListener('scroll', soon, { passive: true });
        window.addEventListener('resize', soon);
        // a category opening or closing changes the list's length
        nav.addEventListener('click', function () { setTimeout(soon, 30); });
        new MutationObserver(soon).observe(panel, { attributes: true, attributeFilter: ['class'] });
        soon();
    }

    // Showcase, folded (css/mobile-refresh.css §6): one button with just the three dots and
    // the turn arrow. A tap opens the full Showcase | Turn pill in its place; it folds back
    // four seconds after the last touch on it, or at a tap anywhere else.
    function compactShowcase() {
        var viewer = document.querySelector('.viewer-panel'), tries = 0;
        (function wait() {
            var pill = viewer && viewer.querySelector('#showcase'), turn = pill && pill.querySelector('#turn-btn');
            if (!pill || !turn) { if (++tries < 60) setTimeout(wait, 150); return; }
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'kd-m3-sc';
            btn.setAttribute('aria-label', 'Showcase and Turn');
            btn.innerHTML = '<span class="showcase__dots" aria-hidden="true"><i></i><i></i><i></i></span>' +
                (turn.querySelector('svg') ? turn.querySelector('svg').outerHTML : '');
            viewer.appendChild(btn);
            var timer = 0;
            function sync() {
                btn.classList.toggle('on', pill.classList.contains('on'));
                btn.classList.toggle('turning', turn.getAttribute('aria-pressed') === 'true');
                btn.hidden = pill.hidden;                       // no Showcase on this design: no button
            }
            function fold() { clearTimeout(timer); viewer.classList.remove('kd-m3-sc-open'); }
            function later() { clearTimeout(timer); timer = setTimeout(fold, 4000); }
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                viewer.classList.add('kd-m3-sc-open');
                later();
            });
            pill.addEventListener('click', later);
            document.addEventListener('click', function (e) {
                if (viewer.classList.contains('kd-m3-sc-open') && !pill.contains(e.target) && e.target !== btn) fold();
            }, true);
            new MutationObserver(sync).observe(pill, { attributes: true, attributeFilter: ['class', 'hidden'] });
            new MutationObserver(sync).observe(turn, { attributes: true, attributeFilter: ['aria-pressed'] });
            sync();
        })();
    }

    // The tool rail (css/mobile-refresh.css §6): Search, the Colourist and Pan, which arrive
    // from their own modules, gathered into one ivory capsule on the right edge of the
    // viewer. Each slot is a 40px target; a tap anywhere in it works its tool.
    function buildToolRail() {
        var viewer = document.querySelector('.viewer-panel');
        if (!viewer) return;
        var rail = document.createElement('div');
        rail.className = 'kd-m3-rail';
        rail.setAttribute('role', 'toolbar');
        rail.setAttribute('aria-label', 'Viewer tools');
        viewer.appendChild(rail);
        var order = ['#kd-search-btn', '.kd-viewer-logo', '#view-pan'], placed = {};
        var tries = 0;
        (function gather() {
            order.forEach(function (sel) {
                if (placed[sel]) return;
                var el = viewer.querySelector(sel);
                if (!el) return;
                var slot = document.createElement('span');
                slot.className = 'kd-m3-slot';
                slot.setAttribute('data-tool', sel.replace(/[#.]/g, ''));
                el.parentNode.insertBefore(slot, el);
                slot.appendChild(el);
                // A tap on the slot's margin works the tool too (the KD mark itself is a small mask).
                slot.addEventListener('click', function (e) { if (e.target === slot) el.click(); });
                placed[sel] = slot;
            });
            // keep the rail in the fixed order, whatever arrived first
            order.forEach(function (sel) { if (placed[sel]) rail.appendChild(placed[sel]); });
            if (Object.keys(placed).length < order.length && ++tries < 60) setTimeout(gather, 150);
            // a Colourist hover tip travels with its mark; on touch it is hidden anyway
            var tip = rail.querySelector('.kdc-tip');
            if (tip) tip.remove();
        })();
    }

    // "Select Fabric" tab (css/mobile-refresh.css §5): the 3D viewer fills most of the
    // screen and takes the swipes, so this glides down to the fabrics, and back.
    function addFabricTab() {
        var fabrics = document.querySelector('.fabric-col');
        if (!fabrics) return;
        var end = document.querySelector('.cfg-actions');      // Add to Collection: the end of the page on phones
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'kd-m2-jump';
        btn.innerHTML = '<span class="kd-m2-jump__rule" aria-hidden="true"></span><span class="kd-m2-jump__text">Select Fabric</span>' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
        document.body.appendChild(btn);
        var text = btn.querySelector('.kd-m2-jump__text');
        // the panel's own title: "Select Fabric", or "Select Leather" on leather pieces
        var pick = ((document.querySelector('.fabric-panel-title') || {}).textContent || 'Select Fabric').trim();
        // Where we are, read from the page itself: at the fabrics once their panel
        // reaches the upper part of the screen.
        function atFabrics() { return fabrics.getBoundingClientRect().top < window.innerHeight * 0.45; }
        function render() {
            var up = atFabrics();
            text.textContent = up ? 'View in 3D' : pick;
            btn.classList.toggle('is-up', up);
            btn.setAttribute('aria-label', up ? 'Back to the 3D view' : pick);
            btn.hidden = !!end && end.getBoundingClientRect().top < window.innerHeight - 10;
        }
        btn.addEventListener('click', function () {
            glide(atFabrics() ? 0 : fabrics.getBoundingClientRect().top + window.pageYOffset - 12);
        });
        var queued = false;
        window.addEventListener('scroll', function () {
            if (queued) return;
            queued = true;
            requestAnimationFrame(function () { queued = false; render(); });
        }, { passive: true });
        window.addEventListener('resize', render);
        render();
    }

    // A slow, eased glide (0.8s), our own, so it runs the same on every phone.
    // A touch or wheel stops it at once.
    var glideId = 0;
    function glide(to) {
        var from = window.pageYOffset, max = document.documentElement.scrollHeight - window.innerHeight;
        to = Math.max(0, Math.min(to, max));
        var id = ++glideId, t0 = null, dur = 800, html = document.documentElement;
        // css/style.css sets scroll-behavior: smooth on html, which would turn every
        // frame below into a new smooth scroll: off while we glide.
        html.style.scrollBehavior = 'auto';
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { window.scrollTo(0, to); html.style.scrollBehavior = ''; return; }
        function stop() {
            if (id === glideId) glideId++;
            html.style.scrollBehavior = '';
            window.removeEventListener('touchstart', stop);
            window.removeEventListener('wheel', stop);
        }
        window.addEventListener('touchstart', stop, { passive: true });
        window.addEventListener('wheel', stop, { passive: true });
        requestAnimationFrame(function step(ts) {
            if (id !== glideId) return stop();
            if (t0 === null) t0 = ts;
            var k = Math.min(1, (ts - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
            window.scrollTo(0, from + (to - from) * e);
            if (k < 1) requestAnimationFrame(step); else stop();
        });
    }
})();
