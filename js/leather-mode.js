/* leather-mode.js — a w/l design seen from the Leather Portfolio.

   Every w-lN design comes in fabric and in leather. Opened from Women it is an
   ordinary product page. Opened from Premium European Leather Portfolio ›
   Jackets / Coats its link carries ?leather, and then:
     - only the Premium European Leather wreath is offered (js/fabrics.js reads the
       same ?leather and filters every zone),
     - the panel reads "Select Leather", the breadcrumb leads back to the portfolio,
     - the House's maker's mark is set under the viewer (js/leather-mark.js),
     - the piece is shown in Cognac Calf (as in the gallery), not its fabric colorway,
     - the gallery's skin tone comes along (&skin=medium|tan|dark),
     - on a design-variations page every design of the set opens in leather too.

   Use: <script src="js/leather-mode.js"></script> in the head of every w-l page
   (product, design variations, duo). */
(function () {
    if (!new URLSearchParams(location.search).has('leather')) return;
    var GALLERY = 'leather-jackets-coats-woman.html';
    var DEFAULT_LEATHER = 'leather-plain-2';   // Cognac Calf (the gallery's snapshots wear it too)
    document.documentElement.classList.add('kd-leather');

    function ready() {
        // Design-variations page: keep the leather view on every design of the set.
        document.querySelectorAll('.product-item[data-product-url]').forEach(function (item) {
            if (!/[?&]leather\b/.test(item.dataset.productUrl)) item.dataset.productUrl += location.search;   // ?leather (&skin=…)
        });

        var home = document.querySelector('.product-home-link');
        if (home) { home.href = GALLERY; home.textContent = 'Leather Portfolio'; }

        if (!document.querySelector('.fabric-panel')) return;   // not a product page
        document.querySelectorAll('.fabric-panel-title').forEach(function (t) {
            if (t.textContent.trim() === 'Select Fabric') t.textContent = 'Select Leather';
        });

        // The gallery's skin tone comes along (&skin=medium|tan|dark); it is set once the
        // model is in (below), as the page's tone buttons need it.
        var skin = new URLSearchParams(location.search).get('skin');
        if (!/^(medium|tan|dark)$/.test(skin || '')) skin = null;

        var mark = document.createElement('script');
        mark.src = 'js/leather-mark.js';
        document.head.appendChild(mark);

        // Dress the piece in Cognac once the swatches and the 3D model are both in: the
        // page hides #viewer-loading when its model has landed. A click before that would
        // mark the swatch but leave the garment in its fabric (slow connections).
        var start = Date.now(), userPicked = false;
        document.addEventListener('pointerdown', function (e) {        // the customer chose first: leave it
            if (e.target.closest && e.target.closest('.swatch-card')) userPicked = true;
        }, true);
        // The swatch click opens the full-screen swatch preview over the 3D model. It can
        // open late (the swatch picture loads first), and left open it hides the model, so
        // the skin tone buttons seem to do nothing. Watch for it for a few seconds and close it.
        function closePreview() {
            var until = Date.now() + 5000;
            (function check() {
                var p = document.getElementById('fabric-preview');
                if (p && p.classList.contains('visible') && !userPicked) {
                    var back = document.getElementById('fabric-preview-back');
                    if (back) back.click(); else p.classList.remove('visible');
                }
                if (Date.now() < until && !userPicked) setTimeout(check, 120);
            })();
        }

        // The customer's own tone: a click before the model is in is ignored by the page,
        // so it is applied again once the model lands; and it always wins over the
        // gallery's tone (&skin=), which is only the starting point.
        var earlyTone = null;
        document.addEventListener('click', function (e) {
            var b = e.isTrusted && e.target.closest && e.target.closest('.skin-btn');
            if (b) earlyTone = b.dataset.skin;
        }, true);

        function modelIn() {
            var l = document.getElementById('viewer-loading');
            return !l || l.style.display === 'none';
        }
        (function wait() {
            var ready = document.querySelector('.fabric-panel .swatch-card') && modelIn();
            if (!ready) { if (Date.now() - start < 60000) setTimeout(wait, 200); return; }
            // Twice: some pages sort the garment into its zones a moment after the model
            // shows, and a pick before that marks the swatch without dressing anything.
            [600, 3500].forEach(function (ms) {
                setTimeout(function () {
                    var tone = earlyTone !== null ? earlyTone : skin;   // the customer's own pick wins
                    if (tone !== null) {                      // the tone, now that the model is in
                        var t = document.querySelector('.skin-btn[data-skin="' + tone + '"]');
                        if (t) t.click();
                    }
                    if (userPicked) return;
                    // Look it up again: live settings may have redrawn the list since.
                    // Cognac shows the construction best; the first leather if it is hidden.
                    var swatch = document.querySelector('.fabric-panel .swatch-card[data-fabric-id="' + DEFAULT_LEATHER + '"]')
                              || document.querySelector('.fabric-panel .swatch-card');
                    if (swatch) {
                        swatch.click();
                        closePreview();
                    }
                }, ms);
            });
        })();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
})();
