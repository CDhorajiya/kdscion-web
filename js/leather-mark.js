/* leather-mark.js — the House's maker's mark on every leather piece (lN.html).

   हस्तनिर्मितं यावज्जीवम् · hasta-nirmitaṃ yāvaj-jīvam
   "Made by hand, for as long as life lasts"

   Set like a colophon at the foot of the 3D viewer: a gold hairline with a
   diamond (the House's ornament), the Sanskrit in maroon Devanagari, the
   transliteration in fine italic, the English in small spaced capitals.
   It fades in once the page is up with the transliteration and the English
   folded away, leaving the ornament and the Sanskrit, so the Design Only /
   Design Details pill keeps its place at the bottom right as on every other
   design. The Sanskrit is a quiet control: on hover it turns dark green with a
   hand pointer; a click (or tap) opens the Legacy window, docked on the viewer
   like the Cuff window (a sheet on phones). It shows a mother, older now,
   handing her KD Scion tote to her teenage daughter on accessories (lN pages:
   images/legacy/handing-on.webp; men's, a father and his teenage son, handing-on-son.webp),
   and on leather jackets / coats (w-lN, m-lN) the same grandmother helping her granddaughter
   into a leather overcoat (coat-on.webp; men's, a grandfather and grandson, coat-on-son.webp).
   Generated photographs, used as they are, slowly drifting in towards their hands, with the three
   lines of the inscription and what they promise. On desktop the mark sits just above the pill's row; on phones just above the
   viewer's bottom row (fabric name, Design Only / Design Details).

   Use: <script src="js/leather-mark.js" defer></script> on any leather page. */
(function () {
    var SCRIPT = document.currentScript;
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
        '@media (prefers-reduced-motion:reduce){.kd-leather-mark,.klm-more,.klm-sa{transition:none;}}' +
        /* the Legacy window: the same grey glass as the Cuff window (js/detail-studio.js) */
        '.klg{position:absolute;z-index:9;top:4.4rem;left:1.1rem;width:min(420px,calc(100% - 2.2rem));' +
            'max-height:calc(100% - 5.5rem);display:flex;flex-direction:column;overflow:hidden;' +
            'border-radius:4px;border:1px solid rgba(0,0,0,0.09);background:#eeeeee;background:rgba(238,238,238,0.76);' +
            '-webkit-backdrop-filter:blur(20px) saturate(140%);backdrop-filter:blur(20px) saturate(140%);' +
            'box-shadow:0 18px 48px rgba(0,0,0,0.12);font-family:"Times New Roman",Times,serif;color:#1a1a1a;' +
            'opacity:0;visibility:hidden;transform:translateY(8px);' +
            'transition:opacity .3s ease,transform .3s ease,visibility 0s .3s;}' +
        '.klg.open{opacity:1;visibility:visible;transform:none;transition:opacity .3s ease,transform .3s ease;}' +
        '.klg-head{display:flex;align-items:center;justify-content:space-between;padding:.9rem 1.1rem .3rem;}' +
        '.klg-title{margin:0;font-weight:400;font-size:1.25rem;letter-spacing:5px;text-transform:uppercase;}' +
        '.klg-close{background:rgba(255,255,255,0.6);border:1px solid #d4d4d4;color:#555;width:2.3rem;height:2.3rem;flex:none;' +
            'border-radius:50%;font-size:1.35rem;line-height:1;cursor:pointer;transition:.2s;}' +
        '.klg-close:hover{background:#fff;border-color:#999;color:#1a1a1a;}' +
        '.klg-close:focus-visible{outline:1px solid #1a1a1a;outline-offset:2px;}' +
        '.klg-body{overflow-y:auto;padding:.3rem 1.1rem 1.2rem;text-align:center;}' +
        '.klg-stage{position:relative;aspect-ratio:1;border-radius:2px;overflow:hidden;background:#ebe3d5;border:1px solid rgba(0,0,0,0.06);}' +
        '.klg-stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}' +
        '.klg.open .klg-stage img{animation:klg-in 1.6s cubic-bezier(.2,.7,.2,1) both,klg-drift 30s ease-in-out 1.6s infinite alternate;}' +
        '@keyframes klg-drift{from{transform:scale(1);}to{transform:scale(1.05);}}' +
        '.klg-words{margin-top:1rem;}' +
        '.klg-words > *{opacity:0;transform:translateY(6px);}' +
        '.klg.open .klg-words > *{animation:klg-up .9s ease both;}' +
        '.klg.open .klg-words > :nth-child(1){animation-delay:.5s;}' +
        '.klg.open .klg-words > :nth-child(2){animation-delay:.75s;}' +
        '.klg.open .klg-words > :nth-child(3){animation-delay:1s;}' +
        '.klg.open .klg-words > :nth-child(4){animation-delay:1.25s;}' +
        '.klg.open .klg-words > :nth-child(5){animation-delay:1.5s;}' +
        '.klg.open .klg-words > :nth-child(6){animation-delay:1.75s;}' +
        '@keyframes klg-up{to{opacity:1;transform:none;}}' +
        '.klg-sa{margin:0;font-family:"Noto Serif Devanagari","Times New Roman",serif;font-weight:400;font-size:1.7rem;' +
            'line-height:1.4;color:rgba(128,0,0,0.85);letter-spacing:.5px;}' +
        '.klg-iast{margin:.15rem 0 0;font-style:italic;font-size:1.3rem;letter-spacing:1px;color:#6f6a63;}' +
        '.klg-en{margin:.35rem 0 0;font-size:1.1rem;letter-spacing:3px;text-transform:uppercase;color:#111;}' +
        '.klg-en q{quotes:"\\201C" "\\201D";}' +
        '.klg-rule{display:flex;align-items:center;justify-content:center;gap:.55rem;margin:.95rem 0 .85rem;}' +
        '.klg-rule i{width:3.2rem;height:1px;background:linear-gradient(90deg,transparent,rgba(100,70,0,0.55));}' +
        '.klg-rule i:last-child{background:linear-gradient(90deg,rgba(100,70,0,0.55),transparent);}' +
        '.klg-rule b{width:5px;height:5px;background:rgba(100,70,0,0.7);transform:rotate(45deg);}' +
        '.klg-note{margin:0;font-size:1.36rem;line-height:1.6;color:#3f3f3f;text-align:left;}' +
        '.klg-sign{margin:.8rem 0 0;font-style:italic;font-size:1.45rem;color:#6f6f6f;}' +
        '@media (max-width:768px){' +
            '.klg{position:fixed;z-index:2000;top:auto;left:0;right:0;bottom:0;width:auto;max-height:86vh;' +
                'border-radius:4px 4px 0 0;border-bottom:0;transform:translateY(24px);background:rgba(240,240,240,0.94);}' +
            '.klg-body{padding:.2rem 1rem calc(1.1rem + env(safe-area-inset-bottom,0px));}' +
            '.klg-stage{width:min(100%,58vh);margin:0 auto;}' +
            '.klg-sa{font-size:1.45rem;}' +
            '.klg-iast{font-size:1.15rem;}' +
            '.klg-en{font-size:1.05rem;letter-spacing:1.5px;}' +
            '.klg-note{font-size:1.24rem;}' +
            '.klg-sign{font-size:1.32rem;}' +
        '}' +
        'html.kd-legacy-open .kd-m2-jump{display:none !important;}' +
        '@media (prefers-reduced-motion:reduce){.klg{transition:none;}' +
            '.klg.open .klg-stage img,.klg.open .klg-words > *{animation:none;opacity:1;transform:none;}}';

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
        mark.className = 'kd-leather-mark is-folded';
        mark.setAttribute('aria-label', 'Made by hand, for as long as life lasts');
        mark.innerHTML =
            '<span class="klm-rule" aria-hidden="true"><i></i><b></b><i></i></span>' +
            '<p class="klm-sa" lang="sa" role="button" tabindex="0" aria-expanded="false">हस्तनिर्मितं यावज्जीवम्</p>' +
            '<span class="klm-more">' +
                '<p class="klm-iast" lang="sa-Latn">hasta-nirmitaṃ yāvaj-jīvam</p>' +
                '<p class="klm-en"><q>Made by hand, for as long as life lasts</q></p>' +
            '</span>';
        viewer.appendChild(mark);
        requestAnimationFrame(function () { requestAnimationFrame(function () { mark.classList.add('is-in'); }); });

        // The Legacy window: the picture, the inscription, and what it promises.
        // Women's pieces show a mother and daughter; men's (mN, m-lN pages, or
        // data-legacy="son" on the script tag) a father and son. Accessories (lN) pass on a bag,
        // jackets and coats (w-lN, m-lN) an overcoat; `at` is where the hands meet (the drift's centre).
        var SON = (SCRIPT && SCRIPT.getAttribute('data-legacy') === 'son') || /\/m(-l)?\d+[^\/]*\.html$/i.test(location.pathname);
        var COAT = !/\/l\d+[^\/]*\.html$/i.test(location.pathname);
        var L = SON
            ? COAT
                ? { img: 'images/legacy/coat-on-son.webp', at: '57% 40%', his: 'his', her: 'his',
                    alt: 'A grandfather helps his teenage grandson into a KD Scion leather overcoat, settling it on his shoulders.' }
                : { img: 'images/legacy/handing-on-son.webp', at: '49% 52%', his: 'his', her: 'his',
                    alt: 'A father, older now, hands his KD Scion leather bag to his teenage son, who takes it in both hands.' }
            : COAT
                ? { img: 'images/legacy/coat-on.webp', at: '47% 50%', his: 'hers', her: 'her',
                    alt: 'A grandmother helps her teenage granddaughter into a KD Scion leather overcoat, guiding her arm into the sleeve.' }
                : { img: 'images/legacy/handing-on.webp', at: '49% 52%', his: 'hers', her: 'her',
                    alt: 'A mother, older now, hands her KD Scion leather tote to her teenage daughter, who takes it in both hands.' };
        // The picture settles in, then drifts very slowly towards the hands.
        var glass = document.createElement('section');
        glass.className = 'klg';
        glass.setAttribute('role', 'dialog');
        glass.setAttribute('aria-labelledby', 'klg-title');
        glass.innerHTML =
            '<div class="klg-head"><h3 class="klg-title" id="klg-title">Legacy</h3>' +
                '<button type="button" class="klg-close" aria-label="Close legacy">&times;</button></div>' +
            '<div class="klg-body">' +
                '<div class="klg-stage"><img src="' + L.img + '" style="transform-origin:' + L.at + '" width="1024" height="1024" loading="lazy" ' +
                    'alt="' + L.alt + '"></div>' +
                '<div class="klg-words">' +
                    '<p class="klg-sa" lang="sa">हस्तनिर्मितं यावज्जीवम्</p>' +
                    '<p class="klg-iast" lang="sa-Latn">hasta-nirmitaṃ yāvaj-jīvam</p>' +
                    '<p class="klg-en"><q>Made by hand, for as long as life lasts</q></p>' +
                    '<span class="klg-rule" aria-hidden="true"><i></i><b></b><i></i></span>' +
                    '<p class="klg-note">Every leather piece of the House is cut, stitched and finished by hand, ' +
                        'to be carried for a lifetime. With the years the leather deepens and softens, and takes ' +
                        'the shape of the one who carries it, until one day it is ' + L.his + ' to hand on.</p>' +
                    '<p class="klg-sign">From ' + L.her + ' hands, to yours.</p>' +
                '</div>' +
            '</div>';
        viewer.appendChild(glass);

        var sa = mark.querySelector('.klm-sa');
        var lastFocus = null;
        function isOpen() { return glass.classList.contains('open'); }
        function open(e) {
            e.stopPropagation();
            if (isOpen()) return close();
            // one window at a time: close any open design-detail window (js/detail-studio.js)
            var other = document.querySelector('.detail-glass.open .cg-close');
            if (other) other.click();
            document.getElementById('fabric-preview') && document.getElementById('fabric-preview').classList.remove('visible');
            lastFocus = document.activeElement;
            glass.querySelector('img').loading = 'eager';
            glass.classList.add('open');
            document.documentElement.classList.add('kd-legacy-open');
            sa.setAttribute('aria-expanded', 'true');
            if (e.type === 'keydown') glass.querySelector('.klg-close').focus({ preventScroll: true });
        }
        function close() {
            if (!isOpen()) return;
            glass.classList.remove('open');
            document.documentElement.classList.remove('kd-legacy-open');
            sa.setAttribute('aria-expanded', 'false');
            if (lastFocus && lastFocus !== document.body && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        }
        sa.setAttribute('aria-haspopup', 'dialog');
        sa.addEventListener('click', open);
        sa.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(e); } });
        glass.addEventListener('click', function (e) { e.stopPropagation(); if (e.target.closest('.klg-close')) close(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
        // a design-detail window opening (Cuff, Made For …) closes this one
        new MutationObserver(function (list) {
            list.forEach(function (m) { if (m.target.classList.contains('detail-glass') && m.target.classList.contains('open')) close(); });
        }).observe(viewer, { attributes: true, attributeFilter: ['class'], subtree: true });

        // Desktop: the Design Only / Design Details pill (js/viewer-dock.js) keeps its
        // place at the viewer's bottom right; where the mark would run into it, the
        // mark sits just above the pill's row instead. The mark is anchored by its
        // foot, so unfolding grows it upward, clear of the pill. The pill can mount
        // after this, so keep watching.
        var mq = window.matchMedia('(max-width:768px)');
        // data-place="foot" on the script tag (L1): the mark keeps its own place on the
        // viewer's bottom row. The lines no longer unfold, so only the Sanskrit has to
        // clear the pill; where it would touch it, the mark slides left along the row
        // (clear of the leather's name at the left), and only a viewer too narrow
        // for that lifts it above the pill.
        var NUDGE = 5;                              // optical: Devanagari hangs from its headline
        var FOOT = !!(SCRIPT && SCRIPT.getAttribute('data-place') === 'foot');
        function clearDock() {
            var dock = viewer.querySelector('#kd-dock, .kd-dock');
            mark.style.bottom = ''; mark.style.left = '';
            if (!dock || !dock.offsetHeight || mq.matches) return;
            var m = mark.getBoundingClientRect(), d = dock.getBoundingClientRect(), v = viewer.getBoundingClientRect();
            if (FOOT) {
                // on the pill's line: the Sanskrit's centre level with Design Only / Design Details
                var s = sa.getBoundingClientRect();
                var dy = (d.top + d.bottom) / 2 - (s.top + s.bottom) / 2 + NUDGE;
                mark.style.bottom = Math.round(v.bottom - m.bottom - dy) + 'px';
                if (d.left - s.right >= 24) return;                         // clear where it is
                var name = viewer.querySelector('#cloth-cycle');
                var floor = (name && name.offsetParent ? name.getBoundingClientRect().right : v.left) + 24;
                var shift = s.right - (d.left - 24);
                if (s.left - shift >= floor) {                              // room on the row
                    mark.style.left = Math.round((m.left + m.right) / 2 - shift - v.left) + 'px';
                    return;
                }
                mark.style.bottom = Math.round(v.bottom - d.top + 10) + 'px';   // too narrow: above the pill
                return;
            }
            var right = (m.left + m.right) / 2 + Math.max(m.width, mark.querySelector('.klm-more').scrollWidth) / 2;
            if (d.left - right >= 24 || d.top >= m.bottom) return;      // clear, even unfolded
            mark.style.bottom = Math.round(v.bottom - d.top + 10) + 'px';
        }
        clearDock();
        new MutationObserver(clearDock).observe(viewer, { childList: true, subtree: true });
        window.addEventListener('resize', clearDock);
        if (document.fonts) document.fonts.ready.then(clearDock);       // Devanagari / serif widths
        if (mq.addEventListener) mq.addEventListener('change', clearDock);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();
