/* viewer-dock.js — the viewer's own controls as one glass pill (first on w183).

   Design Only, Design Details and any design-detail button (Pleats, Cuff …,
   js/detail-studio.js) were three stacked boxes at the viewer's bottom right.
   This gathers them into one slim pill there, the twin of the Showcase | Turn
   pill at the top left (js/showcase.js): the same type and warm pressed
   tint, frameless — no border or white ground, on the viewer itself (KD) —
   each control a monoline icon with its name, hairlines between. On a
   phone the pill keeps only the icons.

   The buttons themselves are moved, not copied, so the page's own handlers,
   ids and .active classes keep working.

   Use on a page, after the detail modules:
       <script type="module" src="js/viewer-dock.js"></script> */

const ICONS = {
    only:    '<path d="M12 7.3a1.8 1.8 0 1 1 1.8-1.8c0 .9-.7 1.3-1.3 1.7l-.5.3v1.6"/><path d="M12 9.1 3.7 15.3c-.6.5-.3 1.5.5 1.5h15.6c.8 0 1.1-1 .5-1.5L12 9.1"/>',
    details: '<circle cx="6.8" cy="16.4" r="2.3"/><path d="M8.5 14.7 13.6 9.6h6.6"/><path d="M15.6 12.9h4.6"/>',
    pleat:   '<path d="M4.5 6.3h15"/><path d="M6.8 6.3 6 19.5M17.2 6.3l.8 13.2"/><path d="M10.3 6.3 12 13.8 13.7 6.3"/><path d="M12 13.8v5.7"/>',
    cuff:    '<path d="M5 8.5h14v8.8H5z"/><path d="M5 11.2h14"/><circle cx="15.6" cy="14.2" r="1.1"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] || ICONS.details}</svg>`;

const css = `
.kd-dock {
    position: absolute; right: 1.1rem; bottom: 1.1rem; z-index: 6;
    display: inline-flex; align-items: center; padding: 3px;
    border: 0; border-radius: 999px; background: none;
}
/* its twin at the top left, the Showcase | Turn pill, loses its frame too */
html.kd-dock-on .viewer-panel .showcase {
    border: 0 !important; background: none !important; box-shadow: none !important;
    -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
}
.kd-dock .kd-rule { width: 1px; height: 1.15rem; background: rgba(0,0,0,.14); flex: none; }
html.kd-dock-on .viewer-panel #kd-dock .kd-dock-btn {
    position: static !important; inset: auto !important; transform: none !important; width: auto !important;
    margin: 0 !important; display: inline-flex !important; align-items: center; gap: .5rem;
    padding: .42rem .95rem !important; border: 0 !important; border-radius: 999px !important;
    background: transparent !important; color: #777 !important; box-shadow: none !important;
    font-family: "Times New Roman", serif !important; font-size: 1rem !important; letter-spacing: 2px !important;
    text-transform: uppercase; white-space: nowrap; line-height: 1.2; cursor: pointer;
    transition: background .25s, color .25s;
}
html.kd-dock-on .viewer-panel #kd-dock .kd-dock-btn::after { content: none !important; }
html.kd-dock-on .viewer-panel #kd-dock .kd-dock-btn:hover { color: #1a1a1a !important; background: rgba(0,0,0,.04) !important; }
html.kd-dock-on .viewer-panel #kd-dock .kd-dock-btn.active {
    background: rgba(100,70,0,0.08) !important; color: rgba(100,70,0,0.85) !important;
}
.kd-dock .kd-dock-btn:focus-visible { outline: 1px solid rgba(100,70,0,0.6) !important; outline-offset: 1px; }
.kd-dock .kd-dock-btn svg {
    width: 1.15em; height: 1.15em; flex: none; fill: none; stroke: currentColor;
    stroke-width: 1.3; stroke-linecap: round; stroke-linejoin: round;
    transition: transform .25s ease;
}
.kd-dock .kd-dock-btn:hover svg { transform: translateY(-1px); }
.kd-dock .kd-dock-label em { font-style: italic; text-transform: none; letter-spacing: 1px; }

@media (max-width: 768px) {
    .kd-dock { right: .8rem; bottom: .8rem; }
    html.kd-dock-on .viewer-panel #kd-dock .kd-dock-btn { padding: .55rem .62rem !important; }
    .kd-dock .kd-dock-label { display: none; }
    .kd-dock .kd-dock-btn svg { width: 1.3rem; height: 1.3rem; }
}
@media (prefers-reduced-motion: reduce) { .kd-dock .kd-dock-btn svg { transition: none; } }
`;

function build() {
    const panel = document.querySelector('.viewer-panel');
    const only = document.getElementById('design-only-btn');
    const details = document.getElementById('design-details-btn');
    if (!panel || !only || !details) return;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    document.documentElement.classList.add('kd-dock-on');

    const dock = document.createElement('div');
    dock.className = 'kd-dock';
    dock.id = 'kd-dock';
    dock.setAttribute('role', 'toolbar');
    dock.setAttribute('aria-label', 'Design view');

    const adopt = (btn, key, label) => {
        btn.classList.add('kd-dock-btn');
        btn.style.width = '';
        const text = label ?? btn.innerHTML;
        btn.innerHTML = `${icon(key)}<span class="kd-dock-label">${text}</span>`;
        btn.title = btn.querySelector('.kd-dock-label').textContent;
        btn.setAttribute('aria-label', btn.title);
        return btn;
    };
    const rule = () => Object.assign(document.createElement('span'), { className: 'kd-rule' });

    dock.append(adopt(only, 'only', 'Design Only'), rule(), adopt(details, 'details', 'Design Details'));
    panel.querySelectorAll('.design-detail-btn').forEach((b) => {
        const key = b.id.replace(/^design-|-btn$/g, '');
        dock.append(rule(), adopt(b, key));
        // the detail module rewrites its label on every choice: keep the title in step
        new MutationObserver(() => {
            const t = b.querySelector('.kd-dock-label')?.textContent;
            if (t) { b.title = t; b.setAttribute('aria-label', t); }
        }).observe(b, { subtree: true, childList: true, characterData: true });
    });
    panel.appendChild(dock);

    // the page sizes Design Only to Design Details once everything has loaded
    window.addEventListener('load', () => { only.style.width = ''; });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
else build();
