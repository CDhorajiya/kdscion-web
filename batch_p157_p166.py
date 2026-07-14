"""
Batch p157–p166 — mixed two-tone / single-tone, 5 variation sets
  1. Normalise 10 PNGs (85% fill, 1679x2042)
  2. Generate 10 product pages:
       - two-tone (p145.html template, swap variant): 157,158,159,160,165,166
       - single-tone (p141.html template):            161,162,163,164
  3. Create 5 design variation pages
  4. Add 5 first-of-set products to pool; skip secondary products
     Column cycle (formula (n-1)%3):
       p157->col1  p159->col3  p161->col2  p163->col1  p165->col3
"""

import os, re
from PIL import Image

BASE   = '/Users/kd/Desktop/KDscion-web'
IMGDIR = os.path.join(BASE, 'images')
CANVAS = (1679, 2042)
TARGET_H = 1735

# (num, display_name, sku_suffix)
TWOTONE = [
    (157, 'full sleeve top',                   'FST157'),
    (158, 'sleeveless top',                    'ST158'),
    (159, 'full sleeve shirring top',           'FSST159'),
    (160, 'sleeveless shirring top',            'SST160'),
    (165, 'full sleeve wrap top',               'FSWT165'),
    (166, 'sleeveless wrap top',                'SWT166'),
]
SINGLETONE = [
    (161, 'full sleeve turtle neck jacket',       'FSTNJ161'),
    (162, 'sleeveless turtle neck jacket',        'STNJ162'),
    (163, 'full sleeve turtle neck short jacket', 'FSTNSJ163'),
    (164, 'sleeveless turtle neck short jacket',  'STNSJ164'),
]
PRODUCTS = TWOTONE + SINGLETONE

VAR_SETS = {
    157: [157, 158],
    159: [159, 160],
    161: [161, 162],
    163: [163, 164],
    165: [165, 166],
}
SKIP_FROM_POOL = {158, 160, 162, 164, 166}

def col_for(n):
    return (n - 1) % 3 + 1

def url_enc(s): return s.replace(' ', '%20')

# ── Step 1: Normalise PNGs ─────────────────────────────────────────────────────
print("=== Step 1: Normalise PNGs ===")
for num, name, _ in PRODUCTS:
    fname = f'KDscion-p{num}-{name}_Colorway A.png'
    path  = os.path.join(IMGDIR, fname)
    if not os.path.exists(path):
        print(f'  MISSING: {fname}'); continue
    img = Image.open(path).convert('RGBA')
    bb  = img.getbbox()
    if not bb: print(f'  BLANK: {fname}'); continue
    c = img.crop(bb); cw, ch = c.size
    rw = round(cw * TARGET_H / ch)
    rs = c.resize((rw, TARGET_H), Image.LANCZOS)
    cv = Image.new('RGBA', CANVAS, (0,0,0,0))
    cv.paste(rs, ((CANVAS[0]-rw)//2, (CANVAS[1]-TARGET_H)//2))
    cv.save(path, 'PNG')
    print(f'  Normalised: {fname}')

# ── Step 2: Generate product pages ────────────────────────────────────────────
print("\n=== Step 2: Generate product pages ===")

def gen_pages(products, src_num, src_name, src_sku, label):
    with open(os.path.join(BASE, f'p{src_num}.html')) as f: tt = f.read()
    for num, name, sku_sfx in products:
        tc   = name.title()
        iurl = f'https://kdscion.com/images/{url_enc(f"KDscion-p{num}-{name}_Colorway A.webp")}'
        purl = f'https://kdscion.com/p{num}.html'
        sku  = f'KD-P{num}-{sku_sfx}'
        h = tt
        h = h.replace(f'KDscion-p{src_num} — {src_name.title()}',  f'KDscion-p{num} — {tc}')
        h = h.replace(f'{src_name.title()} — KD Scion',             f'{tc} — KD Scion')
        h = h.replace(
            f'A custom-tailored {src_name}. Choose from premium natural fabrics for a unique, bespoke piece.',
            f'A custom-tailored {name}. Choose from premium natural fabrics for a unique, bespoke piece.')
        h = h.replace(
            f'https://kdscion.com/images/KDscion-p{src_num}-{url_enc(src_name)}_Colorway%20A.webp', iurl)
        h = h.replace(f'https://kdscion.com/p{src_num}.html', purl)
        h = h.replace(f'<h2>{src_name.title()}</h2>', f'<h2>{tc}</h2>')
        h = h.replace(f'KDscion-p{src_num} &nbsp;·&nbsp; The House of Scion',
                      f'KDscion-p{num} &nbsp;·&nbsp; The House of Scion')
        h = h.replace(f'data-sku="{src_sku}"', f'data-sku="{sku}"')
        h = h.replace(f"'3d/KDscion-p{src_num}-{src_name}.glb'", f"'3d/KDscion-p{num}-{name}.glb'")
        with open(os.path.join(BASE, f'p{num}.html'), 'w') as f: f.write(h)
        print(f'  p{num}.html  [{label}]  {name}')

gen_pages(TWOTONE,    145, 'full sleeve bodycon dress', 'KD-P145-FSBD145', 'two-tone')
gen_pages(SINGLETONE, 141, 'sleeveless top',            'KD-P141-ST141',   'single-tone')

# ── Step 3: Create design variation pages ─────────────────────────────────────
print("\n=== Step 3: Create design variation pages ===")

with open(os.path.join(BASE, 'p100 design variations.html')) as f: vt = f.read()

def var_item(n, name):
    img = f'KDscion-p{n}-{name}_Colorway A.webp'
    return (
        f'                <div class="product-item" data-design-type="solo" data-product-url="p{n}.html">\n'
        f'                    <div class="img-wrap">\n'
        f'                        <img src="images/{img}" alt="KDscion p{n} {name}">\n'
        f'                    </div>\n'
        f'                    <div class="product-desc">\n'
        f'                        <p class="product-desc__title">P{n} | KD Scion</p>\n'
        f'                        <div class="product-desc__divider"></div>\n'
        f'                        <p class="product-desc__sub">{name}</p>\n'
        f'                    </div>\n'
        f'                </div>'
    )

OLD_C1 = (
    '                <div class="product-item" data-design-type="solo" data-product-url="p100.html">\n'
    '                    <div class="img-wrap">\n'
    '                        <img src="images/KDscion-p100-full sleeve single breasted long coat_Colorway A.webp"\n'
    '                             alt="KDscion p100 full sleeve single breasted long coat">\n'
    '                    </div>\n'
    '                    <div class="product-desc">\n'
    '                        <p class="product-desc__title">P100 | KD Scion</p>\n'
    '                        <div class="product-desc__divider"></div>\n'
    '                        <p class="product-desc__sub">full sleeve single breasted long coat</p>\n'
    '                    </div>\n'
    '                </div>'
)
OLD_C2 = (
    '                <div class="product-item" data-design-type="solo" data-product-url="p101.html">\n'
    '                    <div class="img-wrap">\n'
    '                        <img src="images/KDscion-p101-sleeveless single breasted long coat_Colorway A.webp"\n'
    '                             alt="KDscion p101 sleeveless single breasted long coat">\n'
    '                    </div>\n'
    '                    <div class="product-desc">\n'
    '                        <p class="product-desc__title">P101 | KD Scion</p>\n'
    '                        <div class="product-desc__divider"></div>\n'
    '                        <p class="product-desc__sub">sleeveless single breasted long coat</p>\n'
    '                    </div>\n'
    '                </div>'
)

def find_col_close(html, nc):
    marker = f'class="product-column column column{nc}"'
    s = html.find(marker); t = html.index('>', s)+1
    depth, i = 1, t
    while depth:
        o, c = html.find('<div', i), html.find('</div>', i)
        if o != -1 and o < c: depth+=1; i=o+4
        else:
            depth-=1
            if depth==0: return c
            i=c+6

pname = {n: name for n, name, _ in PRODUCTS}

for lead, (n1, n2) in VAR_SETS.items():
    h = vt
    h = h.replace('P100 Design Variations', f'P{n1} Design Variations')
    h = h.replace('p100 design variations', f'p{n1} design variations')
    h = h.replace('Design variations of the P100 design.', f'Design variations of the P{n1} design.')
    h = h.replace(
        'https://kdscion.com/images/KDscion-p100-full%20sleeve%20single%20breasted%20long%20coat_Colorway%20A.webp',
        f'https://kdscion.com/images/{url_enc(f"KDscion-p{n1}-{pname[n1]}_Colorway A.webp")}'
    )
    h = h.replace('\n    <script src="js/bundle.js"></script>', '')
    h = h.replace(OLD_C1, var_item(n1, pname[n1]))
    h = h.replace(OLD_C2, var_item(n2, pname[n2]))
    if 'column column3' not in h:
        pos = find_col_close(h, 2)
        gallery_close = h.find('</div>', pos + 6)
        h = h[:gallery_close] + '\n            <!-- ── Column 3 ── -->\n            <div class="product-column column column3">\n\n            </div>\n        ' + h[gallery_close:]
    out = os.path.join(BASE, f'p{n1} design variations.html')
    with open(out, 'w') as f: f.write(h)
    print(f'  Created: p{n1} design variations.html  (p{n1} + p{n2})')

# ── Step 4: Update pool page ──────────────────────────────────────────────────
print("\n=== Step 4: Update pool page ===")

def pool_block(n, name, url):
    img = f'KDscion-p{n}-{name}_Colorway A.webp'
    return (
        f'\n                <div class="product-item" data-design-type="solo" data-product-url="{url}">\n'
        f'                <div class="img-wrap">\n'
        f'                <img src="images/{img}" alt="KDscion p{n} {name}">\n'
        f'                </div>\n'
        f'                <div class="product-desc">\n'
        f'                <p class="product-desc__title">P{n} | KD Scion</p>\n'
        f'                <div class="product-desc__divider"></div>\n'
        f'                <p class="product-desc__sub">{name}</p>\n'
        f'                </div>\n'
        f'                </div>\n'
    )

def append_to_col(html, nc, block):
    pos = find_col_close(html, nc)
    return html[:pos] + block + html[pos:]

with open(os.path.join(BASE, 'pool-of-designs-woman.html')) as f: pool = f.read()

col_blocks = {1:'', 2:'', 3:''}
for num, name, _ in PRODUCTS:
    if num in SKIP_FROM_POOL:
        print(f'  SKIP pool: p{num}')
        continue
    col = col_for(num)
    url = f'p{num} design variations.html'
    col_blocks[col] += pool_block(num, name, url)

for col in [3, 2, 1]:
    pool = append_to_col(pool, col, col_blocks[col])

with open(os.path.join(BASE, 'pool-of-designs-woman.html'), 'w') as f: f.write(pool)

import collections
urls = re.findall(r'data-product-url="([^"]+)"', pool)
dupes = {u:c for u,c in collections.Counter(urls).items() if c>1}
print(f'  Pool total: {len(urls)}, duplicates: {dupes or "none"}')
for n in [1,2,3]:
    pos = find_col_close(pool, n)
    us = re.findall(r'data-product-url="([^"]+)"', pool[pool.find(f'column{n}"'):pos])
    print(f'  col{n}: {len(us)} — last 3: {us[-3:]}')

print("\n=== Done ===")
