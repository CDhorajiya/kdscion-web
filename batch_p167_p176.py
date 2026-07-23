"""
Batch p167-p176 -- mixed two-tone / single-tone, 3 new variation sets +
4 products added into the existing p22 design variations set.
  1. Product pages:
       - two-tone (p166.html template, swap variant): 167,169,170,171,172,173,174
       - single-tone (p164.html template):            168,175,176
  2. Create 3 design variation pages: (167,168) (169,170) (175,176)
  3. Append 171,172,173,174 into the existing "p22 design variations.html"
  4. Add 3 first-of-set products (167,169,175) to pool; skip the rest
     Columns are currently balanced (29/29/29) -- assign the 3 new leads
     in ascending order across col1/col2/col3 (167->col1, 169->col2, 175->col3)
     rather than the raw (n-1)%3 formula, which would put two leads in the
     same column out of numeric order.
"""

import os, re

BASE   = '/Users/kd/Desktop/KDscion-web'

# (num, display_name_for_files, display_name_for_text, sku_suffix)
TWOTONE = [
    (167, 'full sleeve top',                    'full sleeve top',                    'FST167'),
    (169, 'full sleeve two layer sheath dress', 'full sleeve two layer sheath dress', 'FSTLSD169'),
    (170, 'sleeveless sheath dress',            'sleeveless sheath dress',            'SShD170'),
    (171, 'shawl',                              'shawl',                              'SHWL171'),
    (172, 'shawl',                              'shawl',                              'SHWL172'),
    (173, 'translucent shawl',                  'translucent shawl',                  'TSHWL173'),
    (174, 'translucent shawl',                  'translucent shawl',                  'TSHWL174'),
]
SINGLETONE = [
    (168, 'sleeveless top',                          'sleeveless top',                    'ST168'),
    (175, 'asymmetric shift dress',                  'asymmetric shift dress',            'ASD175'),
    (176, 'full sleeve Asymmetric shift dress',       'full sleeve asymmetric shift dress','FSASD176'),
]
PRODUCTS = TWOTONE + SINGLETONE
# file_name -> exact on-disk garment name (case-sensitive, matches image/glb filenames)
FILE_NAME = {n: fname for n, fname, _, _ in PRODUCTS}
# text_name -> display name used in titles/alt text/h2 (lowercase, grammatically consistent)
TEXT_NAME = {n: tname for n, _, tname, _ in PRODUCTS}

NEW_VAR_SETS = {
    167: [167, 168],
    169: [169, 170],
    175: [175, 176],
}
EXTEND_SET = {
    'lead': 22,
    'new_members': [171, 172, 173, 174],
}
POOL_LEADS = {167: 1, 169: 2, 175: 3}  # num -> column to append to

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

# ── Step 1: Generate product pages ────────────────────────────────────────────
print("=== Step 1: Generate product pages ===")

def gen_pages(products, src_num, src_file_name, src_sku, label):
    with open(os.path.join(BASE, f'p{src_num}.html')) as f:
        tt = f.read()
    for num, file_name, _, sku_sfx in products:
        text_name = TEXT_NAME[num]
        tc   = text_name.title()
        iurl = f'https://kdscion.com/images/{url_enc(f"KDscion-p{num}-{file_name}_Colorway A.webp")}'
        purl = f'https://kdscion.com/p{num}.html'
        sku  = f'KD-P{num}-{sku_sfx}'
        h = tt
        h = h.replace(f'KDscion-p{src_num} — {src_file_name.title()}', f'KDscion-p{num} — {tc}')
        h = h.replace(f'{src_file_name.title()} — KD Scion',            f'{tc} — KD Scion')
        h = h.replace(
            f'A custom-tailored {src_file_name}. Choose from premium natural fabrics for a unique, bespoke piece.',
            f'A custom-tailored {text_name}. Choose from premium natural fabrics for a unique, bespoke piece.')
        h = h.replace(
            f'https://kdscion.com/images/KDscion-p{src_num}-{url_enc(src_file_name)}_Colorway%20A.webp', iurl)
        h = h.replace(f'https://kdscion.com/p{src_num}.html', purl)
        h = h.replace(f'<h2>{src_file_name.title()}</h2>', f'<h2>{tc}</h2>')
        h = h.replace(f'KDscion-p{src_num} &nbsp;·&nbsp; The House of Scion',
                      f'KDscion-p{num} &nbsp;·&nbsp; The House of Scion')
        h = h.replace(f'data-sku="{src_sku}"', f'data-sku="{sku}"')
        h = h.replace(f"'3d/KDscion-p{src_num}-{src_file_name}.glb'", f"'3d/KDscion-p{num}-{file_name}.glb'")
        with open(os.path.join(BASE, f'p{num}.html'), 'w') as f:
            f.write(h)
        print(f'  p{num}.html  [{label}]  {file_name}')

gen_pages(TWOTONE,    166, 'sleeveless wrap top',                'KD-P166-SWT166',   'two-tone')
gen_pages(SINGLETONE, 164, 'sleeveless turtle neck short jacket','KD-P164-STNSJ164', 'single-tone')

# ── Step 2: Create the 3 new design-variation pages ───────────────────────────
print("\n=== Step 2: Create design variation pages ===")

with open(os.path.join(BASE, 'p165 design variations.html')) as f:
    vt = f.read()

def var_item(n, ord_val):
    file_name = FILE_NAME[n]
    text_name = TEXT_NAME[n]
    img = f'KDscion-p{n}-{file_name}_Colorway A.webp'
    return (
        f'                <div class="product-item" style="--ord:{ord_val}" data-design-type="solo" data-product-url="p{n}.html">\n'
        f'                    <div class="img-wrap">\n'
        f'                        <img src="images/{img}" style="--rc:0.00%"\n'
        f'                             alt="KDscion p{n} {text_name}">\n'
        f'                    </div>\n'
        f'                    <div class="product-desc">\n'
        f'                        <p class="product-desc__title">P{n} | KD Scion</p>\n'
        f'                        <div class="product-desc__divider"></div>\n'
        f'                        <p class="product-desc__sub">{text_name}</p>\n'
        f'                    </div>\n'
        f'                </div>'
    )

# locate the two existing items in p165 design variations.html (p165 + p166) to use
# as anchors, via balanced-div extraction (robust to per-file whitespace formatting
# differences -- some variation pages are pretty-printed, others are compact/minified).
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

for lead, (n1, n2) in NEW_VAR_SETS.items():
    h = vt
    h = h.replace('P165 Design Variations', f'P{n1} Design Variations')
    h = h.replace('p165 design variations',  f'p{n1} design variations')
    h = h.replace('Design variations of the P165 design.', f'Design variations of the P{n1} design.')
    h = h.replace(
        f'https://kdscion.com/images/{url_enc("KDscion-p165-full sleeve wrap top_Colorway A.webp")}',
        f'https://kdscion.com/images/{url_enc(f"KDscion-p{n1}-{FILE_NAME[n1]}_Colorway A.webp")}'
    )
    h = h.replace(OLD_C1, var_item(n1, 0))
    h = h.replace(OLD_C2, var_item(n2, 1))
    out = os.path.join(BASE, f'p{n1} design variations.html')
    with open(out, 'w') as f:
        f.write(h)
    print(f'  Created: p{n1} design variations.html  (p{n1} + p{n2})')

# ── Step 3: Append 171-174 into the existing p22 design variations page ───────
print("\n=== Step 3: Extend p22 design variations.html ===")

p22_path = os.path.join(BASE, 'p22 design variations.html')
with open(p22_path) as f:
    p22 = f.read()

# row2: col1=171(ord6) col2=172(ord7) col3=173(ord8);  row3: col1=174(ord9)
new_items = {
    1: [var_item(171, 6), var_item(174, 9)],
    2: [var_item(172, 7)],
    3: [var_item(173, 8)],
}
for col in [3, 2, 1]:
    pos = find_col_close(p22, col)
    block = '\n' + '\n\n'.join(new_items[col]) + '\n            '
    p22 = p22[:pos] + block + p22[pos:]

with open(p22_path, 'w') as f:
    f.write(p22)

urls = re.findall(r'data-product-url="([^"]+)"', p22)
print(f'  p22 design variations.html now has {len(urls)} items: {urls}')

# ── Step 4: Update pool page (167, 169, 175 only) ─────────────────────────────
print("\n=== Step 4: Update pool page ===")

def pool_block(n, url):
    file_name = FILE_NAME[n]
    text_name = TEXT_NAME[n]
    img = f'KDscion-p{n}-{file_name}_Colorway A.webp'
    return (
        f'\n                <div class="product-item" style="--ord:PLACEHOLDER" data-design-type="solo" data-product-url="{url}">\n'
        f'                <div class="img-wrap">\n'
        f'                <img src="images/{img}" style="--rc:0.00%"\n'
        f'                alt="KDscion p{n} {text_name}">\n'
        f'                </div>\n'
        f'                <div class="product-desc">\n'
        f'                <p class="product-desc__title">P{n} | KD Scion</p>\n'
        f'                <div class="product-desc__divider"></div>\n'
        f'                <p class="product-desc__sub">{text_name}</p>\n'
        f'                </div>\n'
        f'                </div>\n'
    )

def append_to_col(html, nc, block):
    pos = find_col_close(html, nc)
    return html[:pos] + block + html[pos:]

pool_path = os.path.join(BASE, 'pool-of-designs-woman.html')
with open(pool_path) as f:
    pool = f.read()

# current per-column count (before adding), used to compute --ord for new items
def col_count(html, nc):
    marker = f'class="product-column column column{nc}"'
    start = html.find(marker)
    pos = find_col_close(html, nc)
    seg = html[start:pos]
    return len(re.findall(r'data-product-url="', seg))

for num, col in POOL_LEADS.items():
    row = col_count(pool, col)  # 0-indexed row this new item will occupy in its column
    ord_val = row * 3 + (col - 1)
    url = f'p{num} design variations.html'
    block = pool_block(num, url).replace('PLACEHOLDER', str(ord_val))
    pool = append_to_col(pool, col, block)

with open(pool_path, 'w') as f:
    f.write(pool)

import collections
urls = re.findall(r'data-product-url="([^"]+)"', pool)
dupes = {u: c for u, c in collections.Counter(urls).items() if c > 1}
print(f'  Pool total: {len(urls)}, duplicates: {dupes or "none"}')
for n in [1, 2, 3]:
    pos = find_col_close(pool, n)
    us = re.findall(r'data-product-url="([^"]+)"', pool[pool.find(f'column{n}"'):pos])
    print(f'  col{n}: {len(us)} -- last 2: {us[-2:]}')

print("\n=== Done ===")
