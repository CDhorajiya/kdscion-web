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
        var row = document.querySelector('.product-title-row');
        var crumb = document.querySelector('.product-breadcrumb');
        if (!row || !crumb) return;
        var h2 = row.querySelector('h2'), p = row.querySelector('div > p');

        // "· KDscion-p1 · The House of Scion" → read the code, then hide that text
        var code = '';
        if (p) {
            var m = p.textContent.match(/KDscion-\s*([ps]\d+(?:\s*&\s*[ps]\d+)?)/i);
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

        // "P1 · Full Sleeve Classic Shirt"
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
    });

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
        // Where we are, read from the page itself: at the fabrics once their panel
        // reaches the upper part of the screen.
        function atFabrics() { return fabrics.getBoundingClientRect().top < window.innerHeight * 0.45; }
        function render() {
            var up = atFabrics();
            text.textContent = up ? 'View in 3D' : 'Select Fabric';
            btn.classList.toggle('is-up', up);
            btn.setAttribute('aria-label', up ? 'Back to the 3D view' : 'Go to the fabrics');
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
