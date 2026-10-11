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
    });
})();
