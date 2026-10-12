/* leather-mark.js — the House's maker's mark on every leather piece (lN.html).

   हस्तनिर्मितं यावज्जीवम् · hasta-nirmitaṃ yāvaj-jīvam
   "Made by hand, for as long as life lasts"

   Set like a colophon at the foot of the 3D viewer: a gold hairline with a
   diamond (the House's ornament), the Sanskrit in maroon Devanagari, the
   transliteration in fine italic, the English in small spaced capitals.
   It never takes a tap (pointer-events: none) and fades in once the page is
   up. On phones it sits just above the viewer's bottom row (fabric name,
   Design Only / Design Details), clear of them.

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
            'font-size:1.75rem;line-height:1.35;color:rgba(128,0,0,0.82);letter-spacing:0.5px;' +
            'text-shadow:0 1px 0 rgba(255,255,255,0.7);}' +
        '.klm-iast{margin:0;font-family:"Times New Roman",Times,serif;font-style:italic;font-size:1.15rem;' +
            'letter-spacing:1px;color:#6f6a63;text-shadow:0 1px 0 rgba(255,255,255,0.7);}' +
        '.klm-en{margin:0;font-family:"Times New Roman",Times,serif;font-size:0.95rem;letter-spacing:3px;' +
            'text-transform:uppercase;color:#8a8378;text-shadow:0 1px 0 rgba(255,255,255,0.7);}' +
        '.klm-en q{quotes:"\\201C" "\\201D";}' +
        '@media (max-width:768px){' +
            '.kd-leather-mark{bottom:7rem;gap:0.25rem;}' +
            '.klm-rule i{width:2.2rem;}' +
            '.klm-sa{font-size:1.4rem;}' +
            '.klm-iast{font-size:1rem;}' +
            '.klm-en{font-size:1rem;letter-spacing:1.5px;}' +
        '}' +
        '@media (prefers-reduced-motion:reduce){.kd-leather-mark{transition:none;}}';

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
            '<p class="klm-sa" lang="sa">हस्तनिर्मितं यावज्जीवम्</p>' +
            '<p class="klm-iast" lang="sa-Latn">hasta-nirmitaṃ yāvaj-jīvam</p>' +
            '<p class="klm-en"><q>Made by hand, for as long as life lasts</q></p>';
        viewer.appendChild(mark);
        requestAnimationFrame(function () { requestAnimationFrame(function () { mark.classList.add('is-in'); }); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
