#!/usr/bin/env python3
"""
tools/rollout_colourist.py — put the search glass and the Colourist on every
product page.

Both features are driven entirely by shared modules, so a page needs only
three lines: the monogram anchor inside the 3D viewer, and the two module
tags. All styling and behaviour lives in js/search-ui.js and js/colourist/*,
so this script never copies CSS into a page.

Idempotent: a page that already has a piece is left alone. Safe to re-run
after new product pages are generated.

    python3 tools/rollout_colourist.py           # apply
    python3 tools/rollout_colourist.py --check   # report only, change nothing
"""
import glob, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECK = '--check' in sys.argv

LOGO   = '                <a class="kd-viewer-logo" href="index.html" aria-label="Ask the House Colourist"></a>\n'
ANCHOR = '                <div id="detail-layer"></div>'
DRAPE  = '<script type="module" src="js/drape-ui.js"></script>'
SEARCH = '<script type="module" src="js/search-ui.js?anchor=viewer"></script>'
COLOUR = ('<!-- The KD monogram under the search glass opens the Colourist. If this module\n'
          '     fails to load the monogram stays an ordinary link to the home page. -->\n'
          '<script type="module" src="js/colourist/index.js"></script>')

pages = sorted((p for p in glob.glob(str(ROOT / 'p*.html'))
                if re.fullmatch(r'p\d+\.html', Path(p).name)),
               key=lambda p: int(re.findall(r'\d+', Path(p).name)[0]))

changed, skipped, problems = [], [], []
for path in pages:
    name = Path(path).name
    s = orig = Path(path).read_text()
    added = []

    if 'kd-viewer-logo' not in s:
        if ANCHOR not in s:
            problems.append(f'{name}: no #detail-layer anchor'); continue
        s = s.replace(ANCHOR, LOGO + ANCHOR, 1)
        added.append('logo')

    if 'js/search-ui.js' not in s:
        if DRAPE not in s:
            problems.append(f'{name}: no drape script tag to anchor to'); continue
        s = s.replace(DRAPE, DRAPE + '\n' + SEARCH, 1)
        added.append('search')

    if 'js/colourist/index.js' not in s:
        tail = SEARCH if SEARCH in s else DRAPE
        s = s.replace(tail, tail + '\n' + COLOUR, 1)
        added.append('colourist')

    if s == orig:
        skipped.append(name)
    else:
        changed.append(f'{name} (+{", ".join(added)})')
        if not CHECK:
            Path(path).write_text(s)

print(f'{len(pages)} product pages')
print(f'  {len(changed)} {"would change" if CHECK else "updated"}')
print(f'  {len(skipped)} already complete')
if problems:
    print(f'  {len(problems)} could not be handled:')
    for p in problems: print('     ' + p)
if changed[:3]:
    print('  e.g. ' + '; '.join(changed[:3]))
