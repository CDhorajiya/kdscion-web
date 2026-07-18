"""
Populate the (empty) DETAIL_ANNS placeholder in p1.html-p16.html with
construction-detail callouts, using the same annotation system already
built for the "Design Details" toggle (dann-dot/dann-line/dann-label),
styled to match "measurement guide.html"'s ann-dot/ann-line/ann-label.

Positions are anchored to the shared body-landmark coordinates used in
measurement guide.html's ANN_POSITIONS.woman (same base mannequin used
by every product page's medium/tan/dark woman.glb skin system):
  wrist ~ (0.40, 0.18, 0.00)   chest ~ (0.14, 0.52, 0.10)
  hip   ~ (-0.16,-0.12, 0.06)  backlength ~ (-0.06, 0.48, -0.10)
  knee  ~ (0.08, -0.30, 0.04)  ankle ~ (0.09, -0.74, 0.03)

p1-product.html already had hand-calibrated cuff/button positions for
this exact shirt — reused verbatim for P1/P2.
"""
import re

BASE = '/Users/kd/Desktop/KDscion-web'

PLACEHOLDER = """        const DETAIL_ANNS = [
            // Leaders to be added per product
        ];"""

def block(anns):
    lines = ["        const DETAIL_ANNS = ["]
    for a in anns:
        x, y, z = a['pos']
        lines.append(
            "            { id: %-10s label: %-58s pos: new THREE.Vector3(%5.2f, %5.2f, %5.2f), side: '%s' },"
            % (f"'{a['id']}',", f"'{a['label']}',", x, y, z, a['side'])
        )
    lines.append("        ];")
    return "\n".join(lines)

BUTTON   = dict(id='button',  label='Buttons \\u2014 fabric color match', pos=(0.02, 0.54, 0.10), side='right')
CUFF     = dict(id='cuff',    label='Single button barrel cuff',          pos=(0.36, 0.18, 0.02),  side='right')
WRAPBTN  = dict(id='wrapbtn', label='Applied fabric-wrapped buttons',     pos=(0.04, 0.50, 0.10),  side='right')
ZIP      = dict(id='zipper',  label='Invisible zipper closure',           pos=(0.00, 0.30, -0.12), side='right')
BACKVENT = dict(id='backvent',label='Long back vent',                     pos=(0.00, -0.45, -0.10), side='left')
VENT_L   = dict(id='ventL',   label='Long side vent',                     pos=(-0.18, -0.30, 0.05), side='left')
VENT_R   = dict(id='ventR',   label='Long side vent',                     pos=(0.18, -0.30, 0.05),  side='right')
TT_TOP   = dict(id='ttTop',   label='Two-tone \\u2014 upper fabric',       pos=(-0.16, 0.30, 0.10),  side='left')
TT_BOT   = dict(id='ttBot',   label='Two-tone \\u2014 lower fabric',       pos=(-0.16, -0.20, 0.10), side='left')

PRODUCTS = {
    1:  [CUFF, BUTTON],
    2:  [BUTTON],
    3:  [WRAPBTN],
    4:  [WRAPBTN],
    5:  [WRAPBTN],
    6:  [WRAPBTN],
    7:  [VENT_L, VENT_R, ZIP],
    8:  [ZIP, BACKVENT],
    9:  [ZIP, BACKVENT],
    10: [VENT_L, VENT_R, ZIP],
    11: [ZIP, TT_TOP, TT_BOT],
    12: [ZIP, TT_TOP, TT_BOT],
    13: [ZIP, BACKVENT],
    14: [ZIP, BACKVENT],
    15: [ZIP, BACKVENT],
    16: [ZIP, BACKVENT],
}

for n, anns in PRODUCTS.items():
    path = f'{BASE}/p{n}.html'
    with open(path) as f:
        html = f.read()
    if PLACEHOLDER not in html:
        print(f'  SKIP p{n}.html: placeholder not found (already edited?)')
        continue
    html = html.replace(PLACEHOLDER, block(anns))
    with open(path, 'w') as f:
        f.write(html)
    print(f'  p{n}.html: {len(anns)} annotation(s)')

print('Done.')
