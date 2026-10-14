/* leather-mode.js — a w/l design seen from the Leather Portfolio.

   Every w-lN design comes in fabric and in leather. Opened from Women it is an
   ordinary product page. Opened from Premium European Leather Portfolio ›
   Jackets / Coats its link carries ?leather, and then:
     - only the Premium European Leather wreath is offered (js/fabrics.js reads the
       same ?leather and filters every zone),
     - the panel reads "Select Leather", the breadcrumb leads back to the portfolio,
     - the House's maker's mark is set under the viewer (js/leather-mark.js),
     - the piece is shown in the first leather of the list, not its fabric colorway,
     - on a design-variations page every design of the set opens in leather too.

   Use: <script src="js/leather-mode.js"></script> in the head of every w-l page
   (product, design variations, duo). */
(function () {
    if (!new URLSearchParams(location.search).has('leather')) return;
    var GALLERY = 'leather-jackets-coats-woman.html';
    document.documentElement.classList.add('kd-leather');

    function ready() {
        // Design-variations page: keep the leather view on every design of the set.
        document.querySelectorAll('.product-item[data-product-url]').forEach(function (item) {
            if (!/[?&]leather\b/.test(item.dataset.productUrl)) item.dataset.productUrl += '?leather';
        });

        var home = document.querySelector('.product-home-link');
        if (home) { home.href = GALLERY; home.textContent = 'Leather Portfolio'; }

        if (!document.querySelector('.fabric-panel')) return;   // not a product page
        document.querySelectorAll('.fabric-panel-title').forEach(function (t) {
            if (t.textContent.trim() === 'Select Fabric') t.textContent = 'Select Leather';
        });

        var mark = document.createElement('script');
        mark.src = 'js/leather-mark.js';
        document.head.appendChild(mark);

        // Dress the piece in the first leather once the swatches and the model are in,
        // then close the full-screen preview the click opens.
        var start = Date.now();
        (function wait() {
            var first = document.querySelector('.fabric-panel .swatch-card');
            if (!first) { if (Date.now() - start < 8000) setTimeout(wait, 150); return; }
            setTimeout(function () {
                if (document.querySelector('.swatch-card.active')) return;   // already dressed (stock-aware pick)
                first.click();
                setTimeout(function () {
                    var back = document.getElementById('fabric-preview-back');
                    if (back) back.click();
                }, 300);
            }, 2500);
        })();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
    else ready();
})();
