/* leather-mark.js — the House's maker's mark on every leather piece (lN.html).

   हस्तनिर्मितं यावज्जीवम् · hasta-nirmitaṃ yāvaj-jīvam
   "Made by hand, for as long as life lasts"

   Set like a colophon at the foot of the 3D viewer: a gold hairline with a
   diamond (the House's ornament), the Sanskrit in maroon Devanagari, the
   transliteration in fine italic, the English in small spaced capitals.
   It fades in once the page is up. After 20 seconds the transliteration and
   the English fold away to save room, leaving the ornament and the Sanskrit.
   The Sanskrit is then a quiet control: on hover it turns dark green with a
   hand pointer; a click (or tap) unfolds the two lines again, and they stay
   until a click or tap anywhere else in the viewer. On phones it sits just
   above the viewer's bottom row (fabric name, Design Only / Design Details).

   Use: <script src="js/leather-mark.js" defer></script> on any leather page. */
(function () {
    var CSS = '' +
        '.kd-leather-mark{position:absolute;left:50%;bottom:1.6rem;z-index:4;transform:translateX(-50%);' +
            'display:flex;flex-direction:column;align-items:center;gap:0.35rem;margin:0;pointer-events:none;' +
            'text-align:center;white-space:nowrap;opacity:0;transition:opacity 1.6s ease 0.6s, letter-spacing 1.6s ease 0.6s;}' +
        '.kd-leather-mark.is-in{opacity:1;}' +
        '.klm-rule{display:flex;align-items:center;gap:0.55rem;margin-bottom:0.15rem;}' +
        '.klm-rule i{width:3.2rem;height:1px;background:linear-gradient(90deg,transparent,rgba(100,70,0,0.55));}' +
        '.klm-rule i:last-child{background:linear-gradient(90deg,rgba(100,70,0,0.55),transparent);}' +
        '.klm-rule b{width:5px;height:5px;background:rgba(100,70,0,0.7);transform:rotate(45deg);}' +
        '.klm-sa{margin:0;font-family:"Noto Serif Devanagari","Times New Roman",serif;font-weight:400;' +
            'font-size:1.55rem;line-height:1.35;color:rgba(128,0,0,0.82);letter-spacing:0.5px;' +
            'text-shadow:0 1px 0 rgba(255,255,255,0.7);}' +
        '.klm-iast{margin:0;font-family:"Times New Roman",Times,serif;font-style:italic;font-size:1.3rem;' +
            'letter-spacing:1px;color:#6f6a63;text-shadow:0 1px 0 rgba(255,255,255,0.7);}' +
        '.klm-en{margin:0;font-family:"Times New Roman",Times,serif;font-size:1.15rem;letter-spacing:3px;' +
            'text-transform:uppercase;color:#111;text-shadow:0 1px 0 rgba(255,255,255,0.7);}' +
        '.klm-en q{quotes:"\\201C" "\\201D";}' +
        /* the two lines that fold away after 20s, and unfold on a click */
        '.klm-more{display:flex;flex-direction:column;align-items:center;gap:0.35rem;overflow:hidden;' +
            'max-height:6rem;opacity:1;transition:max-height 0.7s ease, opacity 0.5s ease, margin 0.7s ease;}' +
        '.kd-leather-mark.is-folded:not(.is-open) .klm-more{max-height:0;opacity:0;margin-top:-0.35rem;}' +
        '.klm-sa{pointer-events:auto;cursor:pointer;transition:color 0.3s ease;outline:none;}' +
        '.klm-sa:hover,.klm-sa:focus-visible{color:#14532d;}' +          /* the Colourist's dark green */
        '.kd-leather-mark.is-open{pointer-events:auto;}' +              /* reading the open lines never folds them */
        '@media (max-width:768px){' +
            '.kd-leather-mark{bottom:7rem;gap:0.25rem;}' +
            '.klm-rule i{width:2.2rem;}' +
            '.klm-sa{font-size:1.25rem;}' +
            '.klm-iast{font-size:1.12rem;}' +
            '.klm-en{font-size:1.12rem;letter-spacing:1.2px;}' +
            '.klm-more{gap:0.25rem;}' +
        '}' +
        '@media (prefers-reduced-motion:reduce){.kd-leather-mark,.klm-more,.klm-sa{transition:none;}}';

    function mount() {
        var viewer = document.querySelector('.viewer-panel');
        if (!viewer || viewer.querySelector('.kd-leather-mark')) return;
        if (!document.querySelector('link[href*="Noto+Serif+Devanagari"]')) {
            var font = document.createElement('link');
            font.rel = 'stylesheet';
            font.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+Devanagari:wght@400&display=swap';
            document.head.appendChild(font);
        }
        var style = document.createElement('style');
        style.id = 'kd-leather-mark-css';
        style.textContent = CSS;
        document.head.appendChild(style);
        var mark = document.createElement('figure');
        mark.className = 'kd-leather-mark';
        mark.setAttribute('aria-label', 'Made by hand, for as long as life lasts');
        mark.innerHTML =
            '<span class="klm-rule" aria-hidden="true"><i></i><b></b><i></i></span>' +
            '<p class="klm-sa" lang="sa" role="button" tabindex="0" aria-expanded="true">हस्तनिर्मितं यावज्जीवम्</p>' +
            '<span class="klm-more">' +
                '<p class="klm-iast" lang="sa-Latn">hasta-nirmitaṃ yāvaj-jīvam</p>' +
                '<p class="klm-en"><q>Made by hand, for as long as life lasts</q></p>' +
            '</span>';
        viewer.appendChild(mark);
        requestAnimationFrame(function () { requestAnimationFrame(function () { mark.classList.add('is-in'); }); });

        var sa = mark.querySelector('.klm-sa');
        function shown() { return !mark.classList.contains('is-folded') || mark.classList.contains('is-open'); }
        function sync() { sa.setAttribute('aria-expanded', shown() ? 'true' : 'false'); }
        // After 20 seconds only the ornament and the Sanskrit remain.
        setTimeout(function () { mark.classList.add('is-folded'); sync(); }, 20000);
        // A click on the Sanskrit unfolds the two lines; they stay until a click elsewhere in the viewer.
        function open(e) { e.stopPropagation(); mark.classList.add('is-open'); sync(); }
        sa.addEventListener('click', open);
        sa.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } });
        viewer.addEventListener('click', function (e) {
            if (mark.classList.contains('is-open') && !mark.contains(e.target)) { mark.classList.remove('is-open'); sync(); }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
