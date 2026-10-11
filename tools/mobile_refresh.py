#!/usr/bin/env python3
"""Switch the cleaner phone layout (css/mobile-refresh.css + js/mobile-refresh.js) on or off.

    python3 tools/mobile_refresh.py apply     # link it into every page that has the layout
    python3 tools/mobile_refresh.py restore   # "restore default mobile": unlink it everywhere
    python3 tools/mobile_refresh.py status

Pages: the Pool of Designs, design-variation pages and category galleries
(.container-snaps), every product page (.product-title-row) and the Bespoke
Boutique page's phone menu (.bb-panel). Desktop is never
affected: every rule is inside a phone-width media query.

On product pages, apply also lets the 3D camera come closer on phones
(window.KD_CAMERA_Z, set by the script); restore puts the fixed distance back.
The untouched site before this layout is the git tag mobile-default-2026-10-11.
Run from the repo root; then commit and push as usual.
"""
import glob
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TAG = ('    <!-- mobile-refresh: cleaner phone layout (tools/mobile_refresh.py) -->\n'
       '    <link rel="stylesheet" href="css/mobile-refresh.css">\n'
       '    <script src="js/mobile-refresh.js"></script>\n')
CAM_DEFAULT = 'cameraS.position.set(0, 0, 3);'
CAM_PHONE = 'cameraS.position.set(0, 0, window.KD_CAMERA_Z || 3);   // phones: js/mobile-refresh.js'


def pages():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, '*.html'))):
        s = open(f, encoding='utf-8').read()
        if '-copy' in os.path.basename(f):
            continue
        if 'class="product-title-row"' in s or 'class="container-snaps"' in s or 'class="bb-panel"' in s:
            out.append(f)
    return out


def apply():
    n = 0
    for f in pages():
        s = open(f, encoding='utf-8').read()
        t = s
        if 'css/mobile-refresh.css' not in t:
            i = t.lower().find('</head>')
            if i < 0:
                print('  no </head>:', os.path.basename(f))
                continue
            t = t[:i] + TAG + t[i:]
        t = t.replace(CAM_DEFAULT, CAM_PHONE)
        if t != s:
            open(f, 'w', encoding='utf-8').write(t)
            n += 1
    print('applied to', n, 'pages')


def restore():
    n = 0
    for f in pages():
        s = open(f, encoding='utf-8').read()
        t = s.replace(TAG, '').replace(CAM_PHONE, CAM_DEFAULT)
        if t != s:
            open(f, 'w', encoding='utf-8').write(t)
            n += 1
    print('restored', n, 'pages to the default mobile layout')


def status():
    ps = pages()
    on = [f for f in ps if 'css/mobile-refresh.css' in open(f, encoding='utf-8').read()]
    print(len(on), 'of', len(ps), 'pages use the cleaner phone layout')


if __name__ == '__main__':
    {'apply': apply, 'restore': restore, 'status': status}.get(sys.argv[1] if len(sys.argv) > 1 else 'status', status)()
