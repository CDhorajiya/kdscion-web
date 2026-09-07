"""
Batch p177-p200 -- mixed two-tone / single-tone, 10 variation sets.

  Two-tone (11): 185,186,188,189,190,193,194,195,196,199,200 -- p166.html template (swap variant)
    - Button/buttonhole mesh pollution fix (3-line splitMeshes() exclusion) needed for: 185,186,199,200
      (confirmed via GLB material inspection: Button_* mesh nodes + "Default Buttonhole"/"Buttonhole 1"
      materials on the Cloth mesh would otherwise pollute the majority/minority material count)
    - p195/p196 have an exact 8/8 material tie (Silk_Duchess_Satin Copy 1 vs Copy 2) -- flagged for
      visual verification since majority/minority is not well-defined for an even split
  Single-tone (13): 177,178,179,180,181,182,183,184,187,191,192,197,198 -- p176.html template

  Variation sets:
    177,178 / 179,180 / 181,182 / 183,184 / 185,186 /
    187,188,189,190,191,192 (6-item set) /
    193,194 / 195,196 / 197,198 / 199,200

  Pool leads (10, columns balanced 30/30/30 before this batch -- cycle col1/col2/col3 in lead
  ascending order, NOT the raw (n-1)%3 formula, since leads are non-consecutive and the formula
  would break row-ascending reading order):
    177->col1  179->col2  181->col3  183->col1  185->col2  187->col3  193->col1  195->col2  197->col3  199->col1
"""

import os, re
from PIL import Image

BASE   = '/Users/kd/Desktop/KDscion-web'
IMGDIR = os.path.join(BASE, 'images')
CANVAS = (1679, 2042)
TARGET_H = 1735

# (num, name) -- garment name matches on-disk file name exactly (all lowercase in this batch)
ALL_PRODUCTS = [
    (177, 'full sleeve loose shift top'),
    (178, 'sleeveless loose shift top'),
    (179, 'full sleeve sheath top'),
    (180, 'sleeveless sheath top'),
    (181, 'full sleeve sheath dress'),
    (182, 'sleeveless sheath dress'),
    (183, 'classic fit trouser'),
    (184, 'classic fit trouser-short'),
    (185, 'full sleeve top'),
    (186, 'sleeveless top'),
    (187, 'sleeveless asymmetric short dress'),
    (188, 'sleeveless shift dress'),
    (189, 'sleeveless shift dress'),
    (190, 'sleeveless asymmetric shift dress'),
    (191, 'sleeveless shift dress'),
    (192, 'sleeveless short top'),
    (193, 'full sleeve translucent shift dress - dual layer'),
    (194, 'sleeveless translucent shift dress - dual layer'),
    (195, 'sleeveless shirring dress'),
    (196, 'sleeveless shirring dress - short'),
    (197, 'full sleeve shift dress - elastic waist'),
    (198, 'sleeveless shift dress - elastic waist'),
    (199, 'full sleeve translucent shift dress - dual asymmetric layer'),
    (200, 'sleeveless translucent shift dress - dual asymmetric layer'),
]
NAME = {n: name for n, name in ALL_PRODUCTS}

SKU_SUFFIX = {
    177: 'FSLST177', 178: 'SLST178', 179: 'FSST179', 180: 'SST180',
    181: 'FSSHD181', 182: 'SSHD182', 183: 'CFT183',  184: 'CFTS184',
    185: 'FST185',   186: 'ST186',   187: 'SASD187', 188: 'SSD188',
    189: 'SSD189',   190: 'SASD190', 191: 'SSD191',  192: 'SST192',
    193: 'FSTSDDL193', 194: 'STSDDL194', 195: 'SSHRD195', 196: 'SSHRDS196',
    197: 'FSSDEW197', 198: 'SSDEW198', 199: 'FSTSDAL199', 200: 'STSDAL200',
}

TWOTONE_NUMS = {185, 186, 188, 189, 190, 193, 194, 195, 196, 199, 200}
BUTTON_FIX_NUMS = {185, 186, 199, 200}
SINGLETONE_NUMS = set(NAME) - TWOTONE_NUMS

VAR_SETS = {
    177: [177, 178],
    179: [179, 180],
    181: [181, 182],
    183: [183, 184],
    185: [185, 186],
    187: [187, 188, 189, 190, 191, 192],
    193: [193, 194],
    195: [195, 196],
    197: [197, 198],
    199: [199, 200],
}
POOL_LEADS = {177: 1, 179: 2, 181: 3, 183: 1, 185: 2, 187: 3, 193: 1, 195: 2, 197: 3, 199: 1}

def url_enc(s): return s.replace(' ', '%20')

def find_col_close(html, nc):
    marker = f'class="product-column column column{nc}"'
    s = html.find(marker); t = html.index('>', s) + 1
    depth, i = 1, t
    while depth:
        o, c = html.find('<div', i), html.find('</div>', i)
        if o != -1 and o < c:
            depth += 1; i = o + 4
        else:
            depth -= 1
            if depth == 0: return c
            i = c + 6

# ── Step 1: Normalise PNGs ────────────────────────────────────────────────────
print("=== Step 1: Normalise PNGs ===")
for num, name in ALL_PRODUCTS:
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
    cv = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    cv.paste(rs, ((CANVAS[0] - rw) // 2, (CANVAS[1] - TARGET_H) // 2))
    cv.save(path, 'PNG')
    print(f'  Normalised: {fname}')

# ── Step 2: Generate product pages ────────────────────────────────────────────
print("\n=== Step 2: Generate product pages ===")

def gen_pages(nums, src_num, src_name, src_sku, label):
    with open(os.path.join(BASE, f'p{src_num}.html')) as f:
        tt = f.read()
    for num in nums:
        name = NAME[num]
        tc   = name.title()
        iurl = f'https://kdscion.com/images/{url_enc(f"KDscion-p{num}-{name}_Colorway A.webp")}'
        purl = f'https://kdscion.com/p{num}.html'
        sku  = f'KD-P{num}-{SKU_SUFFIX[num]}'
        h = tt
        h = h.replace(f'KDscion-p{src_num} — {src_name.title()}', f'KDscion-p{num} — {tc}')
        h = h.replace(f'{src_name.title()} — KD Scion',            f'{tc} — KD Scion')
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
        with open(os.path.join(BASE, f'p{num}.html'), 'w') as f:
            f.write(h)
        print(f'  p{num}.html  [{label}]  {name}')

gen_pages(sorted(TWOTONE_NUMS),   166, 'sleeveless wrap top',                 'KD-P166-SWT166',      'two-tone')
gen_pages(sorted(SINGLETONE_NUMS), 176, 'full sleeve Asymmetric shift dress', 'KD-P176-FSASD176',    'single-tone')

# ── Step 2b: Button/buttonhole mesh-pollution fix for 185,186,199,200 ─────────
print("\n=== Step 2b: Apply button-exclusion fix ===")

OLD_TRAVERSE = """            currentModel.traverse((node) => {
                if (!node.isMesh || isBodyMesh(node)) return;
                const box    = new THREE.Box3().setFromObject(node);
                const center = box.getCenter(new THREE.Vector3());
                cloth.push({ node, center });
                if (!origGeometries.has(node.uuid))
                    origGeometries.set(node.uuid, node.geometry.clone());
            });"""
NEW_TRAVERSE = """            currentModel.traverse((node) => {
                if (!node.isMesh || isBodyMesh(node)) return;
                const nLow = (node.name || '').toLowerCase();
                const mLow = (node.material?.name || '').toLowerCase();
                if (nLow.includes('button') || mLow.includes('button')) return;
                const box    = new THREE.Box3().setFromObject(node);
                const center = box.getCenter(new THREE.Vector3());
                cloth.push({ node, center });
                if (!origGeometries.has(node.uuid))
                    origGeometries.set(node.uuid, node.geometry.clone());
            });"""

for num in sorted(BUTTON_FIX_NUMS):
    path = os.path.join(BASE, f'p{num}.html')
    with open(path) as f:
        h = f.read()
    if OLD_TRAVERSE not in h:
        print(f'  WARNING: p{num}.html traverse block not found verbatim -- skipped fix')
        continue
    h = h.replace(OLD_TRAVERSE, NEW_TRAVERSE)
    with open(path, 'w') as f:
        f.write(h)
    print(f'  p{num}.html  button-exclusion applied')

# ── Step 3: Create design-variation pages ─────────────────────────────────────
print("\n=== Step 3: Create design variation pages ===")

with open(os.path.join(BASE, 'p165 design variations.html')) as f:
    vt = f.read()

def var_item(n, ord_val):
    name = NAME[n]
    img = f'KDscion-p{n}-{name}_Colorway A.webp'
    return (
        f'                <div class="product-item" style="--ord:{ord_val}" data-design-type="solo" data-product-url="p{n}.html">\n'
        f'                    <div class="img-wrap">\n'
        f'                        <img src="images/{img}" style="--rc:0.00%"\n'
        f'                             alt="KDscion p{n} {name}">\n'
        f'                    </div>\n'
        f'                    <div class="product-desc">\n'
        f'                        <p class="product-desc__title">P{n} | KD Scion</p>\n'
        f'                        <div class="product-desc__divider"></div>\n'
        f'                        <p class="product-desc__sub">{name}</p>\n'
        f'                    </div>\n'
        f'                </div>'
    )

def extract_item_block(html, product_url):
    marker = f'data-product-url="{product_url}"'
    m = html.find(marker)
    assert m != -1, f'{product_url} not found'
    start = html.rfind('<div', 0, m)
    depth, i = 1, html.index('>', start) + 1
    while depth:
        o, c = html.find('<div', i), html.find('</div>', i)
        if o != -1 and o < c:
            depth += 1; i = o + 4
        else:
            depth -= 1
            if depth == 0:
                return html[start:c + 6]
            i = c + 6

OLD_C1 = extract_item_block(vt, 'p165.html')
OLD_C2 = extract_item_block(vt, 'p166.html')

for lead, members in VAR_SETS.items():
    h = vt
    h = h.replace('P165 Design Variations', f'P{lead} Design Variations')
    h = h.replace('p165 design variations',  f'p{lead} design variations')
    h = h.replace('Design variations of the P165 design.', f'Design variations of the P{lead} design.')
    h = h.replace(
        f'https://kdscion.com/images/{url_enc("KDscion-p165-full sleeve wrap top_Colorway A.webp")}',
        f'https://kdscion.com/images/{url_enc(f"KDscion-p{lead}-{NAME[lead]}_Colorway A.webp")}'
    )
    # distribute members round-robin across col1/col2/col3 in reading order
    cols = {1: [], 2: [], 3: []}
    for i, n in enumerate(members):
        cols[i % 3 + 1].append(var_item(n, i))

    h = h.replace(OLD_C1, '\n\n'.join(cols[1]) if cols[1] else '')
    h = h.replace(OLD_C2, '\n\n'.join(cols[2]) if cols[2] else '')
    if cols[3]:
        # insert into the existing empty column3 div
        marker = 'class="product-column column column3">'
        pos = h.find(marker) + len(marker)
        close = h.find('</div>', pos)
        h = h[:pos] + '\n' + '\n\n'.join(cols[3]) + '\n            ' + h[close:]

    out = os.path.join(BASE, f'p{lead} design variations.html')
    with open(out, 'w') as f:
        f.write(h)
    print(f'  Created: p{lead} design variations.html  (members: {members})')

# ── Step 4: Update pool page (10 leads only) ──────────────────────────────────
print("\n=== Step 4: Update pool page ===")

def pool_block(n, url, ord_val):
    name = NAME[n]
    img = f'KDscion-p{n}-{name}_Colorway A.webp'
    return (
        f'\n                <div class="product-item" style="--ord:{ord_val}" data-design-type="solo" data-product-url="{url}">\n'
        f'                <div class="img-wrap">\n'
        f'                <img src="images/{img}" style="--rc:0.00%"\n'
        f'                alt="KDscion p{n} {name}">\n'
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

def col_count(html, nc):
    marker = f'class="product-column column column{nc}"'
    start = html.find(marker)
    pos = find_col_close(html, nc)
    seg = html[start:pos]
    return len(re.findall(r'data-product-url="', seg))

pool_path = os.path.join(BASE, 'pool-of-designs-woman.html')
with open(pool_path) as f:
    pool = f.read()

# process leads in ascending numeric order so --ord/row math stays correct per column
for num in sorted(POOL_LEADS, key=lambda n: n):
    col = POOL_LEADS[num]
    row = col_count(pool, col)
    ord_val = row * 3 + (col - 1)
    url = f'p{num} design variations.html'
    pool = append_to_col(pool, col, pool_block(num, url, ord_val))

with open(pool_path, 'w') as f:
    f.write(pool)

import collections
urls = re.findall(r'data-product-url="([^"]+)"', pool)
dupes = {u: c for u, c in collections.Counter(urls).items() if c > 1}
print(f'  Pool total: {len(urls)}, duplicates: {dupes or "none"}')
for n in [1, 2, 3]:
    pos = find_col_close(pool, n)
    us = re.findall(r'data-product-url="([^"]+)"', pool[pool.find(f'column{n}"'):pos])
    print(f'  col{n}: {len(us)} -- last 5: {us[-5:]}')

print("\n=== Done ===")
