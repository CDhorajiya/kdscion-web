#!/usr/bin/env python3
"""Make women's designs w/l: wN → w-lN, and put them in the Leather Portfolio.

    python3 tools/make_wl.py 19              # one design (its whole variation set comes too)
    python3 tools/make_wl.py 19 43 --dry-run # show what would change, change nothing

A w/l design comes in fabric and in leather. Every step this does:
  1. js/design-codes.js     the number joins WL and its card joins LEATHER_JACKETS_COATS
                            (a new family takes the next leather of the rotation; set
                            LEATHER_LOOK there to choose one)
                            (the admin dashboard and checkout read both from here)
  2. git mv                 wN.html, "wN design variations.html", wN-sK.html (duos),
                            3d/ and images/ KDscion-wN-… / KD-scion-wN-…  → w-lN
  3. text, every page       wN → w-lN, WN → W-LN, N° WN → N° W-LN (galleries, pool,
                            variation pages, admin image map, sitemap …)
  4. leather view           <script src="js/leather-mode.js"> in the head of each w-l page
  5. Jackets / Coats        a leather snapshot of each design in its family's leather
                            (LEATHER_LOOK in js/design-codes.js; tools/render_leather_snaps.mjs),
                            leather-jackets-coats-woman.html rebuilt from the pool's cards,
                            every link with ?leather (Bespoke Boutique › Women ›
                            Premium European leather portfolio › Jackets / Coats)
  6. vercel.json            redirects regenerated: old pN and wN addresses → w-lN
  7. search-index.json      rebuilt (tools/build_search_index.py)
Then check the pages, commit (stage by name) and push.

Internal ids never change: the SKU (KD-P19-…) and the Firebase key (p19) keep the p-number.
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DRY = '--dry-run' in sys.argv
CODES = ROOT / 'js/design-codes.js'
GALLERY = ROOT / 'leather-jackets-coats-woman.html'
POOL = ROOT / 'pool-of-designs-woman.html'
LEGACY = {'p1-product.html', 'p32-product.html', 'pool-of-designs-men.html'}


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout


def read_codes():
    s = CODES.read_text()
    wl = {int(n) for n in re.findall(r'\d+', re.search(r'new Set\(\[(.*?)\]\)', s, re.S)[1])}
    cards = json.loads(re.search(r'LEATHER_JACKETS_COATS = (\[.*?\]);', s, re.S)[1].replace(',\n]', '\n]').replace(', ]', ']'))
    return s, wl, cards


def wrap(items, width=92):
    lines, line = [], '   '
    for it in items:
        if len(line) + len(it) + 2 > width:
            lines.append(line.rstrip()); line = '   '
        line += ' ' + it + ','
    return '\n'.join(lines + [line])


def write_codes(s, wl, cards):
    s = re.sub(r'new Set\(\[.*?\]\)', 'new Set([\n' + wrap([str(n) for n in sorted(wl)]) + '\n])', s, count=1, flags=re.S)
    items = ['[' + ', '.join(map(str, c)) + ']' for c in sorted(cards, key=lambda c: c[0])]
    s = re.sub(r'LEATHER_JACKETS_COATS = \[.*?\];', 'LEATHER_JACKETS_COATS = [\n' + wrap(items) + '\n];', s, count=1, flags=re.S)
    CODES.write_text(s)


def variation_set(n):
    """The design's variation set (from a 'wX design variations.html' page), or [n]."""
    for page in sorted(ROOT.glob('w*design variations.html')):
        members = sorted({int(m) for m in re.findall(r'data-product-url="w(?:-l)?(\d+)\.html', page.read_text(encoding='utf-8'))})
        if n in members:
            return members
    return [n]


def text_files():
    out = []
    for f in git('ls-files').split('\n'):
        p = ROOT / f
        if (not f or f in LEGACY or f == 'js/design-codes.js' or f.startswith(('node_modules/', 'backup/', 'memory/', 'analytics-server/', 'api/', 'tools/'))
                or p.suffix not in {'.html', '.js', '.mjs', '.json', '.xml', '.txt', '.css'} or not p.exists()):
            continue
        out.append(p)
    for local in ('instagram-studio.html',):          # KD's local tools, not in git
        if (ROOT / local).exists():
            out.append(ROOT / local)
    return out


def main():
    want = [int(a) for a in sys.argv[1:] if a.isdigit()]
    if not want:
        sys.exit(__doc__)
    s, wl, cards = read_codes()
    new = set()
    for n in want:
        members = variation_set(n)
        if members != [n]:
            print(f'w{n} is in the variation set {members}: the whole set becomes w/l')
        for m in members:
            if m in wl:
                print(f'w-l{m} is already w/l'); continue
            if not (ROOT / f'w{m}.html').exists():
                sys.exit(f'w{m}.html not found')
            new.add(m)
        if new & set(members):
            cards = [c for c in cards if not set(c) & set(members)] + [members]
    if not new:
        return print('nothing to do')
    alt = '|'.join(map(str, sorted(new)))
    print('making w/l:', ' '.join(f'w{m}' for m in sorted(new)))
    if DRY:
        return

    # 1. the codes
    write_codes(s, wl | new, cards)

    # 2. renames
    for f in git('ls-files').split('\n'):
        p = Path(f)
        if p.parent == Path('.'):
            m = re.fullmatch(rf'w({alt})(\.html| design variations\.html|-s\d+\.html)', p.name)
            new_name = m and f'w-l{m[1]}{m[2]}'
        elif p.parent.name in ('3d', 'images'):
            new_name = re.sub(rf'^(KDscion-|KD-scion-)w({alt})(?=[- ])', r'\1w-l\2', p.name)
        else:
            new_name = None
        if new_name and new_name != p.name:
            git('mv', f, str(p.with_name(new_name)))

    # 3. text
    lower = re.compile(rf"(?<![A-Za-z0-9+/=_%&-])w({alt})(?!\d|[A-Za-z_])")
    upper = re.compile(rf"(?<![A-Za-z0-9+/=_%&-])W({alt})(?!\d|[A-Za-z_])")
    changed = 0
    for p in text_files():
        t = p.read_text(encoding='utf-8')
        o = re.sub(rf'(KDscion-|KD-scion-)w({alt})(?=[- ])', r'\1w-l\2', t)
        o = lower.sub(r'w-l\1', o)
        o = re.sub(rf'(kdscion\.com/)w({alt})(?=\.html| design)', r'\1w-l\2', o)   # og:url / canonical
        o = upper.sub(r'W-L\1', o)
        if o != t:
            p.write_text(o, encoding='utf-8'); changed += 1
    print(f'  {changed} files rewritten')

    # 4. leather view on the renamed pages
    tag = '<script src="js/leather-mode.js"></script>'
    for p in ROOT.glob('w-l*.html'):
        t = p.read_text(encoding='utf-8')
        if tag not in t:
            t = t.replace('<script src="js/mobile-refresh.js"></script>',
                          '<script src="js/mobile-refresh.js"></script>\n    ' + tag, 1)
            p.write_text(t, encoding='utf-8')

    # 5. leather snapshots for every new design (gallery card + variation pages), then the gallery
    if subprocess.run(['node', str(ROOT / 'tools/render_leather_snaps.mjs'), *map(str, sorted(new))], cwd=ROOT).returncode:
        print('  some leather snapshots failed: those cards keep their pool image; re-run tools/render_leather_snaps.mjs')
    rebuild_gallery(cards)

    # 6. redirects
    write_redirects(sorted(wl | new))

    # 7. search
    subprocess.run([sys.executable, str(ROOT / 'tools/build_search_index.py')], cwd=ROOT, check=True)
    print('done — check the pages, then commit (stage by name) and push')


def block(html, start):
    depth = 0
    for m in re.finditer(r'<div\b|</div>', html[start:]):
        depth += 1 if m[0] == '<div' else -1
        if depth == 0:
            return html[start:start + m.end()]
    raise ValueError('unbalanced <div>')


def rebuild_gallery(cards):
    pool = POOL.read_text(encoding='utf-8')
    html = []
    for c in sorted(cards, key=lambda c: c[0]):
        url = f'w-l{c[0]} design variations.html' if len(c) > 1 else f'w-l{c[0]}.html'
        i = pool.find(f'data-product-url="{url}"')
        if i < 0:
            sys.exit(f'no pool card for {url}: add it to the pool first')
        card = block(pool, pool.rindex('<div class="product-item"', 0, i))
        card = card.replace(f'data-product-url="{url}"', f'data-product-url="{url}?leather"')
        # the card wears its leather snapshot (the family's leather, js/design-codes.js) when there is one
        if (ROOT / f'images/leather/KDscion-w-l{c[0]}.webp').exists():
            card = re.sub(r'<img src="images/[^"]+" style="--rc:[^"]*"(?: data-leather="\d+")?',
                          f'<img src="images/leather/KDscion-w-l{c[0]}.webp" style="--rc:0%"', card, count=1)
        html.append(card)
    cols = [[], [], []]
    for i, card in enumerate(html):
        cols[i % 3].append(re.sub(r'--ord:\d+', f'--ord:{i}', card))
    out = '        <div class="product-gallery snap-gallery">\n'
    for c in range(3):
        out += f'\n            <!-- ── Column {c + 1} ── -->\n            <div class="product-column column column{c + 1}">\n\n'
        out += ''.join('                ' + card.strip() + '\n\n' for card in cols[c])
        out += '            </div>\n'
    out += '\n        </div>\n'
    g = GALLERY.read_text(encoding='utf-8')
    a = g.index('        <div class="product-gallery snap-gallery">')
    b = g.index('    </div>\n\n    <button class="back-to-top"')
    GALLERY.write_text(g[:a] + out + g[b:], encoding='utf-8')
    print(f'  Jackets / Coats: {len(html)} cards')


def write_redirects(wl):
    alt = '|'.join(map(str, wl))
    r = []
    add = lambda s, d: r.append({'source': s, 'destination': d, 'permanent': True})
    # w/l designs first: the first match wins. Old p-names and pre-leather w-names both land on w-lN.
    for pre in ('p', 'w'):
        add(f'/{pre}({alt})\\.html', '/w-l$1.html')
        add(f'/{pre}({alt})(%20| )design(%20| )variations\\.html', '/w-l$1%20design%20variations.html')
        add(f'/{pre}({alt})-s(\\d+)\\.html', '/w-l$1-s$2.html')
        for d in ('images', '3d'):
            add(f'/{d}/KDscion-{pre}({alt})-(.*)', f'/{d}/KDscion-w-l$1-$2')
        add(f'/images/KD-scion-{pre}({alt})-(.*)', '/images/KD-scion-w-l$1-$2')
    add('/premium-leather-portfolio\\.html', '/leather-jackets-coats-woman.html')   # the old landing page
    add('/p(\\d+)\\.html', '/w$1.html')
    add('/p(\\d+)(%20| )design(%20| )variations\\.html', '/w$1%20design%20variations.html')
    for d in ('images', '3d'):
        add(f'/{d}/KDscion-p(\\d+)-(.*)', f'/{d}/KDscion-w$1-$2')
    add('/images/KD-scion-p(\\d+)-(.*)', '/images/KD-scion-w$1-$2')
    f = ROOT / 'vercel.json'
    v = json.loads(f.read_text())
    v = {'redirects': r, **{k: x for k, x in v.items() if k != 'redirects'}}
    f.write_text(json.dumps(v, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
