"""
fabric_specs.py — the KD Scion swatch library rendered by tools/gen_fabric_swatches.py
=====================================================================================
Ten swatches per fabric collection (fewer where hand-photographed swatches
already exist in js/fabrics.js). Classic, luxurious cloths only: tailoring
solids, traditional weaves, period-correct check setts, heritage prints.

Each entry: dict(type, coll, id, label, drape, spec, [roughness], [sheen])
`spec` is fed straight to fabric_engine.render().
"""

C = dict(
    navy='#1d2742', midnight='#141a2e', ink='#1a2238', charcoal='#36383d', grey='#76787c', dove='#b5b3ad',
    black='#16161a', ivory='#f2ecdc', chalk='#f6f4ee', white='#f7f6f2', ecru='#e6dcc4', cream='#efe6d0',
    bone='#e4dccb', oat='#d8cbb0', sand='#d2bf9a', stone='#c4b9a5', flax='#d9c9a8', camel='#b88a55',
    tobacco='#7a5530', choc='#4a3020', cognac='#8a4a26', tan='#a9744a', oxblood='#5c1a22', burgundy='#6e1f2e',
    bottle='#1f3d2e', forest='#23402f', olive='#5b5a3a', sage='#9aa58a', sky='#a9c3dd', powder='#c9d8e8',
    blush='#e8c9c0', rose='#c98f8a', champagne='#e3d2ae', gold='#c9a24a', ruby='#8e1730', emerald='#145c45',
    sapphire='#1f3f7a', pewter='#8a8d90', silver='#c4c6c8', terracotta='#a5573b', rust='#9a4a2a',
    indigo='#1d2c4f', madder='#a33a2c', saffron='#d9a13a', teal='#1f5a5e', plum='#4e2440', mink='#8c7b6e',
    taupe='#8f8172', slate='#4f5866', mustard='#b8892e', heather='#8a7f86',
)

FIBRE = {
    'cotton':  dict(irregular=0.04, slub=0.02, hair=0.6, twist=0.03, cover=0.92),
    'linen':   dict(irregular=0.17, slub=0.09, weft_slub=0.09, hair=0.9, cover=0.90, tone_var=0.05),
    'wool':    dict(irregular=0.05, slub=0.02, hair=1.0, twist=0.04, cover=0.93),
    'silk':    dict(irregular=0.02, slub=0.01, hair=0.15, twist=0.008, sheen=0.35, cover=0.97, smooth=0.45),
    'cotton-linen': dict(irregular=0.10, slub=0.05, weft_slub=0.06, hair=0.8, cover=0.91, tone_var=0.04),
    'cotton-wool':  dict(irregular=0.06, slub=0.03, hair=1.3, cover=0.92, felt=0.6),
}
TPC = {'cotton': 40, 'linen': 16, 'wool': 30, 'silk': 60, 'cotton-linen': 26, 'cotton-wool': 28}
DRAPE = {'cotton': 'crisp', 'linen': 'crisp', 'wool': 'heavy', 'silk': 'flowing',
         'cotton-linen': 'medium', 'cotton-wool': 'medium'}

OUT = []
# hand-made swatches already in js/fabrics.js under an id of the same form (<type>-<coll>-<n>)
EXISTING = {('linen', 'print'): 1}


def add(t, coll, label, spec, drape=None, **mat):
    n = sum(1 for e in OUT if e['type'] == t and e['coll'] == coll) + 1 + EXISTING.get((t, coll), 0)
    sid = f'{t}-{coll}-{n}'
    OUT.append(dict(type=t, coll=coll, id=sid, label=label, drape=drape or DRAPE.get(t, 'medium'), spec=spec, **mat))


def solid(t, color, weave='plain', tpc=None, **kw):
    s = dict(FIBRE[t]); s.update(weave=weave, tpc=tpc or TPC[t], colors={'a': C.get(color, color)}, warp=[('a', 1)])
    s.update(kw); return s


def tone(hexs, amt):
    """lighten (amt>0) or darken (amt<0) a colour — tone-on-tone weft for dobbies"""
    h = hexs.lstrip('#'); rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    rgb = [round(v + (255 - v) * amt) if amt > 0 else round(v * (1 + amt)) for v in rgb]
    return '#' + ''.join(f'{v:02x}' for v in rgb)


def two(t, warpc, weftc, weave='plain', tpc=None, **kw):
    if warpc == weftc:              # same yarn both ways hides the figure: tone the weft
        c = C.get(warpc, warpc); lum = sum(int(c[i:i + 2], 16) for i in (1, 3, 5)) / 3
        weftc = tone(c, -0.22 if lum > 170 else 0.28)
    s = dict(FIBRE[t]); s.update(weave=weave, tpc=tpc or TPC[t],
                                 colors={'a': C.get(warpc, warpc), 'b': C.get(weftc, weftc)},
                                 warp=[('a', 1)], weft=[('b', 1)])
    s.update(kw); return s


def sett(t, colors, warp, weft=None, weave='plain', tpc=None, mirror=False, **kw):
    s = dict(FIBRE[t]); s.update(weave=weave, tpc=tpc or TPC[t], colors={k: C.get(v, v) for k, v in colors.items()},
                                 warp=warp, mirror=mirror)
    if weft: s['weft'] = weft
    s.update(kw); return s


def prnt(t, motif, ground, inks, motif_mm=55, tile_mm=110, **kw):
    s = dict(FIBRE[t]); tpc = TPC[t]
    s.update(weave=kw.pop('weave', 'plain'), tpc=tpc, colors={'g': C.get(ground, ground)}, warp=[('g', 1)],
             motif=motif, motif_mm=motif_mm, inks=[C.get(i, i) if i else None for i in inks], px=2048)
    s['pitch'] = 2048 / (tpc * tile_mm / 10)                 # yarn pitch that makes the tile tile_mm wide
    s.update(kw); return s


# ── checks (yarn-dyed setts) ─────────────────────────────────────────────────
def gingham(a, b, n=16): return dict(colors={'a': a, 'b': b}, warp=[('a', n), ('b', n)])
def tattersall(g, c1, c2): return dict(colors={'g': g, 'x': c1, 'y': c2}, warp=[('g', 18), ('x', 2), ('g', 18), ('y', 2)])
def windowpane(g, c): return dict(colors={'g': g, 'c': c}, warp=[('g', 44), ('c', 3)])
def graph(g, c): return dict(colors={'g': g, 'c': c}, warp=[('g', 10), ('c', 1)])
def houndstooth(d, l, n=4): return dict(colors={'d': d, 'l': l}, warp=[('d', n), ('l', n)], weave='twill22')
def glen(d, l, o=None):
    w = [('d', 4), ('l', 4)] * 6 + [('d', 2), ('l', 2)] * 5 + [('o' if o else 'd', 2), ('l', 2)]
    cols = {'d': d, 'l': l}
    if o: cols['o'] = o
    return dict(colors=cols, warp=w, weave='twill22')
def buffalo(a, b): return dict(colors={'a': a, 'b': b}, warp=[('a', 28), ('b', 28)], weave='twill22')
def shepherd(d, l): return dict(colors={'d': d, 'l': l}, warp=[('d', 6), ('l', 6)], weave='twill22')
def gunclub(a, b, c): return dict(colors={'a': a, 'b': b, 'c': c}, warp=[('a', 6), ('b', 6)], weft=[('a', 6), ('c', 6)], weave='twill22')
def blackwatch(): return dict(colors={'n': 'navy', 'k': '#121614', 'g': 'bottle'}, mirror=True, weave='twill22',
                              warp=[('n', 22), ('k', 4), ('n', 4), ('k', 4), ('n', 4), ('k', 18), ('g', 20), ('k', 4), ('g', 4)])
def dress_tartan(r, g, n, w): return dict(colors={'r': r, 'g': g, 'n': n, 'w': w}, mirror=True, weave='twill22',
                                          warp=[('r', 26), ('n', 6), ('r', 4), ('g', 12), ('r', 4), ('w', 2)])
def check(t, d, plain_ok=True):
    d = dict(d); weave = d.pop('weave', 'plain')
    if t in ('wool', 'cotton-wool') and weave == 'plain': weave = 'twill22'
    if t in ('cotton', 'linen', 'cotton-linen') and weave == 'twill22' and plain_ok and 'weft' not in d and len(d['warp']) <= 2:
        pass
    return sett(t, d['colors'], d['warp'], d.get('weft'), weave=weave, mirror=d.get('mirror', False))


# ═════════════════════════════════ COTTON ═════════════════════════════════════
t = 'cotton'
for lab, col, wv, kw in [
    ('Chalk White Poplin', 'chalk', 'plain', {}),
    ('Ivory Pinpoint Oxford', 'ivory', 'oxford', dict(tpc=34)),
    ('Navy Gabardine Twill', 'navy', 'twill21', dict(tpc=44)),
    ('Ecru Sateen', 'ecru', 'sateen5', dict(sheen=0.3, smooth=0.3)),
    ('Bottle Green Drill', 'bottle', 'twill21', dict(tpc=34)),
    ('Camel Chino Twill', 'camel', 'twill22', dict(tpc=36)),
    ('Midnight Voile', 'midnight', 'plain', dict(tpc=46, cover=0.78)),
    ('Oxblood Poplin', 'oxblood', 'plain', {}),
]:
    add(t, 'plain', lab, solid(t, col, wv, **kw), drape='flowing' if 'Voile' in lab else 'crisp')
add(t, 'plain', 'Sky Blue End-on-End', sett(t, {'a': 'sky', 'w': 'white'}, [('a', 1), ('w', 1)], tpc=42))
add(t, 'plain', 'Indigo Chambray', two(t, 'indigo', 'white', tpc=38))
for lab, a, b, wv in [
    ('White Bird\'s-Eye Dobby', 'white', 'white', 'birdseye'), ('Sky Diamond Dobby', 'sky', 'white', 'diamond'),
    ('Ivory Piqué', 'ivory', 'ivory', 'pique'), ('Navy Honeycomb', 'navy', 'navy', 'honeycomb'),
    ('Powder Blue Dot Dobby', 'powder', 'white', 'dobbydot'), ('Ecru Herringbone', 'ecru', 'cream', 'herringbone'),
    ('Stone Barleycorn', 'stone', 'oat', 'barleycorn'), ('Chalk Hopsack', 'chalk', 'bone', 'hopsack'),
    ('Blush Royal Oxford', 'blush', 'white', 'basket2'), ('Slate Bedford Cord', 'slate', 'slate', 'cord'),
]:
    add(t, 'dobies', lab, two(t, a, b, wv, tpc=36))
for lab, col, wv in [
    ('Champagne Silesia', 'champagne', 'twill21'), ('Navy Silesia', 'navy', 'twill21'), ('Burgundy Sateen Lining', 'burgundy', 'sateen5'),
    ('Black Twill Lining', 'black', 'twill21'), ('Pewter Sateen Lining', 'pewter', 'sateen5'), ('Bottle Green Lining', 'bottle', 'twill21'),
    ('Gold Sateen Lining', 'gold', 'sateen5'), ('Ivory Batiste', 'ivory', 'plain'), ('Sky Pocketing', 'sky', 'twill21'),
    ('Plum Sateen Lining', 'plum', 'sateen5'),
]:
    add(t, 'lining', lab, solid(t, col, wv, tpc=52, sheen=0.3, smooth=0.3), drape='flowing', roughness=0.5, sheen=0.08)
for lab, d in [
    ('Navy Gingham', gingham('navy', 'white')), ('Sky Mini Gingham', gingham('sky', 'white', 8)),
    ('Country Tattersall', tattersall('cream', 'bottle', 'madder')), ('Navy Windowpane', windowpane('white', 'navy')),
    ('Blue Graph Check', graph('white', 'sapphire')), ('Black Houndstooth', houndstooth('black', 'ivory')),
    ('Prince of Wales Check', glen('charcoal', 'chalk', 'sapphire')), ('Red Buffalo Check', buffalo('ruby', '#151515')),
    ('Black Watch Tartan', blackwatch()), ('Brown Shepherd\'s Check', shepherd('choc', 'cream')),
]:
    add(t, 'chex', lab, check(t, d))
for lab, m, g, inks in [
    ('Indigo Paisley', 'paisley', 'ivory', ['indigo', 'madder', 'saffron']), ('Navy Foulard', 'foulard', 'navy', ['#c9a24a', '#f2ecdc', '#8e1730']),
    ('Ivory Polka Dot', 'polka', 'navy', ['ivory', None, None]), ('Madder Floral Buti', 'buti', 'cream', ['madder', 'indigo', None]),
    ('Damask Ogee', 'ogee', 'ecru', ['tobacco', 'bottle', 'madder']), ('Botanical Vine', 'vine', 'chalk', ['bottle', 'sage', 'rose']),
    ('Art Deco Fans', 'scales', 'ivory', ['navy', 'sky', 'gold']), ('Garden Trellis', 'trellis', 'cream', ['bottle', 'madder', 'saffron']),
    ('Heritage Sprig', 'sprig', 'white', ['forest', 'madder', None]), ('Regency Stripe', 'stripe', 'ivory', ['navy', 'burgundy', 'gold']),
]:
    mode = 'discharge' if g in ('navy',) else 'dye'
    add(t, 'print', lab, prnt(t, m, g, inks, ink_mode=mode))

# ═════════════════════════════════ LINEN ══════════════════════════════════════
t = 'linen'
for lab, col in [('Natural Flax', 'flax'), ('Optic White Linen', 'white'), ('Ecru Linen', 'ecru'), ('Oatmeal Linen', 'oat'),
                 ('Navy Linen', 'navy'), ('Olive Linen', 'olive'), ('Terracotta Linen', 'terracotta'), ('Sky Linen', 'sky'),
                 ('Charcoal Linen', 'charcoal'), ('Bottle Green Linen', 'bottle')]:
    add(t, 'plain', lab, solid(t, col))
for lab, a, b, wv in [
    ('Flax Herringbone', 'flax', 'oat', 'herringbone'), ('White Bird\'s-Eye Linen', 'white', 'white', 'birdseye'),
    ('Natural Hopsack', 'oat', 'flax', 'hopsack'), ('Navy Basket Weave', 'navy', 'navy', 'basket2'),
    ('Sand Diamond Dobby', 'sand', 'bone', 'diamond'), ('Ivory Honeycomb', 'ivory', 'ivory', 'honeycomb'),
    ('Stone Barleycorn', 'stone', 'flax', 'barleycorn'), ('Sage Twill', 'sage', 'sage', 'twill22'),
    ('Chambray Linen', 'indigo', 'white', 'plain'), ('Ecru Piqué', 'ecru', 'ecru', 'pique'),
]:
    add(t, 'dobies', lab, two(t, a, b, wv))
for lab, col in [('Ivory Linen Voile', 'ivory'), ('Natural Batiste', 'flax'), ('Champagne Linen Lining', 'champagne'),
                 ('Navy Linen Lining', 'navy'), ('Stone Lining', 'stone'), ('Sage Lining', 'sage'), ('Blush Lining', 'blush'),
                 ('Tobacco Lining', 'tobacco'), ('White Handkerchief Linen', 'white'), ('Sky Lining', 'sky')]:
    add(t, 'lining', lab, solid(t, col, tpc=24, cover=0.82, slub=0.05), drape='flowing', roughness=0.7)
for lab, d in [
    ('Navy Linen Gingham', gingham('navy', 'white')), ('Terracotta Gingham', gingham('terracotta', 'cream')),
    ('Flax Windowpane', windowpane('flax', 'navy')), ('Country Tattersall', tattersall('ecru', 'olive', 'rust')),
    ('Indigo Graph Check', graph('white', 'indigo')), ('Sage Shepherd\'s Check', shepherd('sage', 'ivory')),
    ('Tobacco Glen Check', glen('tobacco', 'flax')), ('Sky Gingham', gingham('sky', 'white', 10)),
    ('Navy Buffalo Check', buffalo('navy', 'ecru')), ('Olive Houndstooth', houndstooth('olive', 'oat')),
]:
    add(t, 'chex', lab, check(t, d))
for lab, m, g, inks in [
    ('Indigo Ikat', 'ikat', 'flax', ['indigo', 'sky', 'ecru']), ('Madder Paisley', 'paisley', 'ecru', ['madder', 'indigo', 'saffron']),
    ('Olive Leaf Trail', 'vine', 'oat', ['olive', 'sage', 'terracotta']), ('Terracotta Foulard', 'foulard', 'flax', ['terracotta', 'navy', 'cream']),
    ('Navy Pin Dot', 'pindot', 'white', ['navy', None, None]), ('Saffron Quatrefoil', 'quatrefoil', 'ecru', ['saffron', 'madder', 'indigo']),
    ('Botanical Sprig', 'sprig', 'flax', ['forest', 'madder', None]), ('Deco Fans', 'scales', 'oat', ['tobacco', 'sand', 'cream']),
    ('Riviera Stripe', 'stripe', 'white', ['sky', 'navy', 'terracotta']),
]:
    add(t, 'print', lab, prnt(t, m, g, inks, tile_mm=125))

# ═════════════════════════════════ WOOL ═══════════════════════════════════════
t = 'wool'
for lab, col, wv, kw in [
    ('Navy Worsted', 'navy', 'twill22', {}), ('Charcoal Worsted', 'charcoal', 'twill22', {}),
    ('Mid Grey Flannel', 'grey', 'twill22', dict(hair=1.9, felt=1.4)), ('Camel Hair Twill', 'camel', 'twill22', dict(hair=2.0, felt=1.0)),
    ('Black Barathea', 'black', 'cord', dict(tpc=36)), ('Chocolate Gabardine', 'choc', 'twill21', dict(tpc=40)),
    ('Bottle Green Serge', 'bottle', 'twill22', {}), ('Oxblood Hopsack', 'oxblood', 'hopsack', {}),
    ('Ivory Cashmere Flannel', 'ivory', 'twill22', dict(hair=2.0, felt=1.3)), ('Midnight Super 120s', 'midnight', 'twill22', dict(tpc=36, hair=0.7)),
]:
    add(t, 'plain', lab, solid(t, col, wv, **kw))
for lab, a, b, wv in [
    ('Navy Bird\'s-Eye', 'navy', '#c9ccd4', 'birdseye'), ('Charcoal Nailhead', 'charcoal', '#a9a9a9', 'diamond'),
    ('Grey Herringbone', 'charcoal', 'dove', 'herringbone'), ('Navy Barleycorn', 'navy', 'slate', 'barleycorn'),
    ('Brown Sharkskin', 'choc', 'tan', 'twill22'), ('Midnight Pick-and-Pick', 'midnight', 'slate', 'plain'),
    ('Charcoal Hopsack', 'charcoal', 'grey', 'hopsack'), ('Navy Basket Weave', 'navy', 'ink', 'basket2'),
    ('Taupe Honeycomb', 'taupe', 'stone', 'honeycomb'), ('Bottle Bedford Cord', 'bottle', 'forest', 'cord'),
]:
    add(t, 'dobies', lab, two(t, a, b, wv))
for lab, col, wv in [
    ('Burgundy Twill Lining', 'burgundy', 'twill21'), ('Gold Satin Lining', 'gold', 'sateen5'), ('Navy Twill Lining', 'navy', 'twill21'),
    ('Bottle Green Lining', 'bottle', 'twill21'), ('Champagne Satin Lining', 'champagne', 'sateen5'), ('Black Lining', 'black', 'twill21'),
    ('Pewter Satin Lining', 'pewter', 'sateen5'), ('Plum Lining', 'plum', 'twill21'), ('Ruby Satin Lining', 'ruby', 'sateen5'),
    ('Tobacco Lining', 'tobacco', 'twill21'),
]:
    add(t, 'lining', lab, solid(t, col, wv, tpc=56, hair=0.3, sheen=0.35, smooth=0.4), drape='flowing', roughness=0.45, sheen=0.1)
for lab, d in [
    ('Prince of Wales Check', glen('charcoal', 'dove', 'sapphire')), ('Glen Urquhart Check', glen('black', 'chalk')),
    ('Black Houndstooth', houndstooth('black', 'ivory')), ('Navy Windowpane', windowpane('navy', 'dove')),
    ('Gun Club Check', gunclub('cream', 'choc', 'rust')), ('Black Watch Tartan', blackwatch()),
    ('Royal Dress Tartan', dress_tartan('ruby', 'bottle', 'navy', 'gold')), ('Grey Shepherd\'s Check', shepherd('charcoal', 'chalk')),
    ('Brown Dogtooth', houndstooth('choc', 'camel', 2)), ('Charcoal Buffalo Check', buffalo('charcoal', 'black')),
]:
    add(t, 'chex', lab, check(t, d))
for lab, m, g, inks in [
    ('Challis Paisley', 'paisley', 'burgundy', ['saffron', 'bottle', 'cream']), ('Navy Challis Foulard', 'foulard', 'navy', ['gold', 'ruby', 'cream']),
    ('Ivory Pin Dot', 'pindot', 'charcoal', ['ivory', None, None]), ('Tobacco Ogee', 'ogee', 'camel', ['choc', 'oxblood', 'cream']),
    ('Forest Leaf Trail', 'vine', 'bottle', ['saffron', 'sage', 'rust']), ('Deco Fans', 'scales', 'ink', ['gold', 'pewter', 'cream']),
    ('Oxblood Quatrefoil', 'quatrefoil', 'oxblood', ['gold', 'navy', 'cream']), ('Heritage Trellis', 'trellis', 'navy', ['gold', 'ruby', 'cream']),
    ('Sprig on Camel', 'sprig', 'camel', ['bottle', 'oxblood', None]), ('Club Stripe', 'stripe', 'navy', ['burgundy', 'gold', 'cream']),
]:
    add(t, 'print', lab, prnt(t, m, g, inks, ink_mode='discharge', tile_mm=110, felt=0.5))
for lab, warp, weft, wv, mw, mf in [
    ('Harris Herringbone', '#3a342a', '#9c8c6c', 'herringbone', {'mix': [('#22201a', 0.4, 6)], 'flecks': [('#c0392b', 0.35), ('#e3b448', 0.35)]},
        {'mix': [('#b8a888', 0.4, 5)], 'flecks': [('#3b6ea8', 0.35)]}),
    ('Donegal Oatmeal', '#a89a80', '#a89a80', 'plain', {'mix': [('#7a6e5a', 0.45, 5)], 'flecks': [('#c0392b', 0.6), ('#2e7d4f', 0.6), ('#e3b448', 0.6)]},
        {'mix': [('#c8bca4', 0.45, 5)], 'flecks': [('#3b6ea8', 0.6), ('#8e44ad', 0.5)]}),
    ('Charcoal Donegal', '#3c3c3e', '#4a4a4c', 'plain', {'mix': [('#26262a', 0.4, 5)], 'flecks': [('#e3b448', 0.55), ('#c0392b', 0.5)]},
        {'mix': [('#5e5e60', 0.4, 5)], 'flecks': [('#5dade2', 0.5), ('#f2ecdc', 0.6)]}),
    ('Moss Barleycorn', '#4d5236', '#6d6a48', 'barleycorn', {'mix': [('#33361f', 0.4, 6)], 'flecks': [('#c8a050', 0.4)]},
        {'mix': [('#8a8660', 0.4, 6)], 'flecks': [('#9a4a2a', 0.4)]}),
    ('Heather Twill', '#7d6d74', '#8a7f86', 'twill22', {'mix': [('#5a4a58', 0.5, 4), ('#a8909c', 0.3, 4)], 'flecks': []},
        {'mix': [('#9e8a94', 0.5, 4)], 'flecks': [('#6a7a5a', 0.4)]}),
    ('Salt & Pepper', '#2a2a2a', '#d8d4cc', 'twill22', {'mix': [('#444444', 0.3, 5)], 'flecks': []}, {'mix': [('#bbbbbb', 0.3, 5)], 'flecks': []}),
    ('Brown Herringbone', '#4a3424', '#8a6a48', 'herringbone', {'mix': [('#33241a', 0.4, 6)], 'flecks': [('#c0392b', 0.3)]},
        {'mix': [('#a8885c', 0.4, 6)], 'flecks': [('#e3b448', 0.3)]}),
    ('Lovat Hopsack', '#5f6a55', '#7a8470', 'hopsack', {'mix': [('#45503e', 0.4, 5)], 'flecks': [('#8a6aa8', 0.35)]},
        {'mix': [('#94a088', 0.4, 5)], 'flecks': [('#c8a050', 0.35)]}),
    ('Birdseye Tweed', '#2f3440', '#8a8c90', 'birdseye', {'mix': [('#22262e', 0.4, 5)], 'flecks': []},
        {'mix': [('#a0a2a6', 0.4, 5)], 'flecks': [('#c0392b', 0.3)]}),
    ('Rust Houndstooth Tweed', None, None, 'twill22', None, None),
]:
    if warp is None:
        s = sett(t, {'d': '#5a2e1c', 'l': '#c8b08a'}, [('d', 4), ('l', 4)], weave='twill22', tpc=9, hair=1.7, irregular=0.12,
                 warp_marl={'mix': [('#3a1e12', 0.4, 6)], 'flecks': [('#e3b448', 0.3)]},
                 weft_marl={'mix': [('#a8906a', 0.4, 6)], 'flecks': [('#2e7d4f', 0.3)]})
    else:
        s = dict(FIBRE['wool']); s.update(weave=wv, tpc=8 if wv != 'twill22' else 10, colors={'a': warp, 'b': weft},
                                          warp=[('a', 1)], weft=[('b', 1)], hair=1.7, irregular=0.12, slub=0.05,
                                          warp_marl=mw, weft_marl=mf)
    add(t, 'tweed', lab, s, drape='heavy', roughness=0.95, sheen=0.35)

# ═════════════════════════════════ SILK ═══════════════════════════════════════
t = 'silk'
for lab, col, wv, kw in [
    ('Ivory Habotai', 'ivory', 'plain', {}), ('Champagne Shantung', 'champagne', 'plain', dict(weft_slub=0.12, irregular=0.06, tpc=40)),
    ('Midnight Silk Twill', 'midnight', 'twill22', {}), ('Ruby Dupioni', 'ruby', 'plain', dict(weft_slub=0.14, irregular=0.07, tpc=36)),
    ('Emerald Taffeta', 'emerald', 'plain', dict(tpc=56, sheen=0.45)), ('Sapphire Silk Twill', 'sapphire', 'twill22', {}),
    ('Blush Crêpe de Chine', 'blush', 'plain', dict(sheen=0.15, smooth=0.3, hair=0.25)), ('Black Silk Faille', 'black', 'cord', dict(tpc=48)),
    ('Gold Shantung', 'gold', 'plain', dict(weft_slub=0.12, irregular=0.06, tpc=40)), ('Pewter Silk Twill', 'pewter', 'twill22', {}),
]:
    add(t, 'plain', lab, solid(t, col, wv, **kw))
for lab, col, wv in [
    ('Ivory Silk Lining', 'ivory', 'plain'), ('Champagne Twill Lining', 'champagne', 'twill21'), ('Navy Silk Lining', 'navy', 'twill21'),
    ('Burgundy Silk Lining', 'burgundy', 'twill21'), ('Black Silk Lining', 'black', 'plain'), ('Gold Silk Lining', 'gold', 'twill21'),
    ('Bottle Green Silk Lining', 'bottle', 'twill21'), ('Blush Silk Lining', 'blush', 'plain'), ('Silver Silk Lining', 'silver', 'twill21'),
    ('Plum Silk Lining', 'plum', 'twill21'),
]:
    add(t, 'lining', lab, solid(t, col, wv, tpc=70, sheen=0.4, smooth=0.55), roughness=0.3, sheen=0.1)
for lab, m, g, inks in [
    ('Navy Foulard', 'foulard', 'navy', ['gold', 'ivory', 'ruby']), ('Burgundy Paisley', 'paisley', 'burgundy', ['gold', 'navy', 'ivory']),
    ('Ivory Polka Dot', 'polka', 'midnight', ['ivory', None, None]), ('Emerald Ogee', 'ogee', 'emerald', ['gold', 'ivory', 'ruby']),
    ('Gold Pin Dot', 'pindot', 'navy', ['gold', None, None]), ('Deco Fans', 'scales', 'black', ['gold', 'pewter', 'ivory']),
    ('Sapphire Trellis', 'trellis', 'sapphire', ['ivory', 'gold', 'ruby']), ('Blush Botanical', 'vine', 'blush', ['forest', 'sage', 'ruby']),
    ('Ruby Quatrefoil', 'quatrefoil', 'ruby', ['gold', 'navy', 'ivory']), ('Champagne Sprig', 'sprig', 'champagne', ['emerald', 'ruby', None]),
]:
    add(t, 'print', lab, prnt(t, m, g, inks, ink_mode='discharge', weave='twill22', motif_mm=40, tile_mm=80))
for lab, col in [('Ivory Charmeuse', 'ivory'), ('Champagne Satin', 'champagne'), ('Black Duchess Satin', 'black'),
                 ('Midnight Satin', 'midnight'), ('Ruby Satin', 'ruby'), ('Emerald Satin', 'emerald'), ('Sapphire Satin', 'sapphire'),
                 ('Blush Satin', 'blush'), ('Gold Satin', 'gold'), ('Pewter Satin', 'pewter')]:
    add(t, 'satin', lab, solid(t, col, 'satin8', pitch=3.5, sheen=0.5, hair=0.1, twist=0.005, cover=0.99, irregular=0.01, smooth=0.85),
        roughness=0.2, sheen=0.2)

# ═══════════════════════════════ COTTON-LINEN ═════════════════════════════════
t = 'cotton-linen'
for lab, col in [('Natural Cotton-Linen', 'flax'), ('White Cotton-Linen', 'white'), ('Stone Cotton-Linen', 'stone'),
                 ('Navy Cotton-Linen', 'navy'), ('Sage Cotton-Linen', 'sage'), ('Sand Cotton-Linen', 'sand'),
                 ('Sky Cotton-Linen', 'sky'), ('Tobacco Cotton-Linen', 'tobacco'), ('Ecru Cotton-Linen', 'ecru'),
                 ('Olive Cotton-Linen', 'olive')]:
    add(t, 'plain', lab, solid(t, col))
for lab, a, b, wv in [
    ('Ecru Herringbone', 'ecru', 'oat', 'herringbone'), ('Navy Hopsack', 'navy', 'ink', 'hopsack'), ('White Piqué', 'white', 'white', 'pique'),
    ('Stone Basket Weave', 'stone', 'oat', 'basket2'), ('Sky Bird\'s-Eye', 'sky', 'white', 'birdseye'), ('Sand Diamond Dobby', 'sand', 'cream', 'diamond'),
    ('Olive Twill', 'olive', 'olive', 'twill22'), ('Chambray', 'indigo', 'white', 'plain'), ('Ivory Honeycomb', 'ivory', 'ivory', 'honeycomb'),
    ('Taupe Barleycorn', 'taupe', 'stone', 'barleycorn'),
]:
    add(t, 'dobies', lab, two(t, a, b, wv))
for lab, col in [('Ivory Voile Lining', 'ivory'), ('Natural Lining', 'flax'), ('Champagne Lining', 'champagne'), ('Navy Lining', 'navy'),
                 ('Stone Lining', 'stone'), ('Sage Lining', 'sage'), ('Blush Lining', 'blush'), ('Sky Lining', 'sky'),
                 ('Tobacco Lining', 'tobacco'), ('White Batiste', 'white')]:
    add(t, 'lining', lab, solid(t, col, tpc=34, cover=0.84), drape='flowing', roughness=0.65)
for lab, d in [
    ('Navy Gingham', gingham('navy', 'white')), ('Sage Gingham', gingham('sage', 'cream')), ('Stone Windowpane', windowpane('stone', 'navy')),
    ('Tattersall', tattersall('cream', 'bottle', 'rust')), ('Indigo Graph Check', graph('white', 'indigo')),
    ('Tobacco Shepherd\'s Check', shepherd('tobacco', 'cream')), ('Glen Check', glen('slate', 'bone')), ('Sky Gingham', gingham('sky', 'white', 10)),
    ('Navy Buffalo Check', buffalo('navy', 'oat')), ('Olive Houndstooth', houndstooth('olive', 'bone')),
]:
    add(t, 'chex', lab, check(t, d))
for lab, m, g, inks in [
    ('Indigo Paisley', 'paisley', 'cream', ['indigo', 'madder', 'saffron']), ('Terracotta Foulard', 'foulard', 'oat', ['terracotta', 'navy', 'cream']),
    ('Navy Pin Dot', 'pindot', 'white', ['navy', None, None]), ('Floral Buti', 'buti', 'ecru', ['madder', 'indigo', None]),
    ('Leaf Trail', 'vine', 'flax', ['olive', 'sage', 'rust']), ('Indigo Ikat', 'ikat', 'cream', ['indigo', 'sky', 'ecru']),
    ('Quatrefoil', 'quatrefoil', 'sand', ['tobacco', 'navy', 'cream']), ('Trellis', 'trellis', 'white', ['sage', 'terracotta', 'saffron']),
    ('Sprig', 'sprig', 'cream', ['forest', 'madder', None]), ('Seaside Stripe', 'stripe', 'white', ['navy', 'sky', 'madder']),
]:
    add(t, 'print', lab, prnt(t, m, g, inks, tile_mm=115))

# ═══════════════════════════════ COTTON-WOOL ══════════════════════════════════
t = 'cotton-wool'
for lab, col, wv in [('Navy Cotton-Wool Twill', 'navy', 'twill22'), ('Charcoal Flannel', 'charcoal', 'twill22'), ('Camel Twill', 'camel', 'twill22'),
                     ('Grey Melange', 'grey', 'twill22'), ('Bottle Green Twill', 'bottle', 'twill22'), ('Chocolate Twill', 'choc', 'twill22'),
                     ('Oxblood Twill', 'oxblood', 'twill22'), ('Stone Gabardine', 'stone', 'twill21'), ('Ivory Twill', 'ivory', 'twill22'),
                     ('Tobacco Brushed Twill', 'tobacco', 'twill22')]:
    kw = dict(warp_marl={'mix': [('#5a5c60', 0.4, 4), ('#a6a8ac', 0.35, 4)]}, weft_marl={'mix': [('#8a8c90', 0.45, 4)]}) if 'Melange' in lab else {}
    add(t, 'plain', lab, solid(t, col, wv, **kw))
for lab, a, b, wv in [
    ('Navy Bird\'s-Eye', 'navy', 'slate', 'birdseye'), ('Charcoal Herringbone', 'charcoal', 'dove', 'herringbone'),
    ('Camel Barleycorn', 'camel', 'sand', 'barleycorn'), ('Brown Hopsack', 'choc', 'tan', 'hopsack'), ('Grey Nailhead', 'charcoal', 'grey', 'diamond'),
    ('Navy Basket Weave', 'navy', 'ink', 'basket2'), ('Olive Honeycomb', 'olive', 'sage', 'honeycomb'), ('Taupe Piqué', 'taupe', 'stone', 'pique'),
    ('Bottle Bedford Cord', 'bottle', 'forest', 'cord'), ('Midnight Pick-and-Pick', 'midnight', 'slate', 'plain'),
]:
    add(t, 'dobies', lab, two(t, a, b, wv))
for lab, col, wv in [
    ('Burgundy Twill Lining', 'burgundy', 'twill21'), ('Gold Sateen Lining', 'gold', 'sateen5'), ('Navy Twill Lining', 'navy', 'twill21'),
    ('Champagne Sateen Lining', 'champagne', 'sateen5'), ('Bottle Green Lining', 'bottle', 'twill21'), ('Black Lining', 'black', 'twill21'),
    ('Pewter Sateen Lining', 'pewter', 'sateen5'), ('Plum Lining', 'plum', 'twill21'), ('Tobacco Lining', 'tobacco', 'twill21'),
    ('Ivory Sateen Lining', 'ivory', 'sateen5'),
]:
    add(t, 'lining', lab, solid(t, col, wv, tpc=52, hair=0.4, felt=0, sheen=0.3, smooth=0.35), drape='flowing', roughness=0.5, sheen=0.1)
for lab, d in [
    ('Prince of Wales Check', glen('charcoal', 'dove', 'rust')), ('Glen Check', glen('navy', 'bone')), ('Black Houndstooth', houndstooth('black', 'ivory')),
    ('Brown Windowpane', windowpane('camel', 'choc')), ('Gun Club Check', gunclub('cream', 'bottle', 'rust')), ('Black Watch Tartan', blackwatch()),
    ('Dress Tartan', dress_tartan('oxblood', 'forest', 'navy', 'gold')), ('Shepherd\'s Check', shepherd('choc', 'cream')),
    ('Navy Dogtooth', houndstooth('navy', 'bone', 2)), ('Buffalo Check', buffalo('oxblood', 'black')),
]:
    add(t, 'chex', lab, check(t, d))
for lab, m, g, inks in [
    ('Paisley', 'paisley', 'navy', ['saffron', 'ruby', 'cream']), ('Foulard', 'foulard', 'bottle', ['gold', 'oxblood', 'cream']),
    ('Pin Dot', 'pindot', 'charcoal', ['ivory', None, None]), ('Ogee', 'ogee', 'camel', ['choc', 'bottle', 'cream']),
    ('Leaf Trail', 'vine', 'oxblood', ['gold', 'sage', 'cream']), ('Deco Fans', 'scales', 'navy', ['gold', 'pewter', 'cream']),
    ('Quatrefoil', 'quatrefoil', 'choc', ['camel', 'oxblood', 'cream']), ('Trellis', 'trellis', 'forest', ['gold', 'ruby', 'cream']),
    ('Sprig', 'sprig', 'oat', ['bottle', 'oxblood', None]), ('Club Stripe', 'stripe', 'bottle', ['oxblood', 'gold', 'cream']),
]:
    add(t, 'print', lab, prnt(t, m, g, inks, ink_mode='discharge', tile_mm=110))

# ═══════════════════════════════ COTTON-SPANDEX ═══════════════════════════════
t = 'cotton-spandex'
DEN = dict(weave='twill31', tpc=28, irregular=0.10, slub=0.06, cover=0.97, weft_slub=0.03, weft_cover=0.5, hair=0.7, twist=0.04)
for lab, warp, weft, kw in [
    ('Raw Indigo Denim', '#1b2a4a', '#cfc6b0', {}), ('Selvedge Indigo', '#18233f', '#d6ccb4', dict(irregular=0.16, slub=0.11)),
    ('Rinse Wash Denim', '#22355c', '#c8c2b2', dict(wash=0.15)), ('Mid Stone Wash', '#2a426e', '#d0cbbd', dict(wash=0.38)),
    ('Light Vintage Wash', '#3a5a8a', '#dcd8cc', dict(wash=0.6, wash_to='#c6d4e4')), ('Black Denim', '#1a1a1d', '#3a3a3e', {}),
    ('Grey Denim', '#4e5258', '#9a9a98', {}), ('Ecru Denim', '#e4dccb', '#e9e2d2', {}), ('Indigo-Black Overdye', '#121a2c', '#2a2f3a', {}),
    ('White Denim', '#f2f0ea', '#f4f2ec', dict(tone_var=0.015)),
]:
    s = dict(DEN); s.update(colors={'a': warp, 'b': weft}, warp=[('a', 1)], weft=[('b', 1)]); s.update(kw)
    add(t, 'denim', lab, s, drape='heavy', roughness=0.85, sheen=0.05)
for lab, col, wpc in [('Tobacco Needlecord', 'tobacco', 6.0), ('Camel Corduroy', 'camel', 4.3), ('Navy Corduroy', 'navy', 4.3),
                      ('Bottle Green Corduroy', 'bottle', 4.3), ('Burgundy Corduroy', 'burgundy', 4.3), ('Cream Jumbo Cord', 'cream', 3.0),
                      ('Chocolate Corduroy', 'choc', 4.3), ('Olive Needlecord', 'olive', 6.0), ('Rust Jumbo Cord', 'rust', 3.0),
                      ('Grey Corduroy', 'grey', 4.3)]:
    add(t, 'corduroy', lab, dict(kind='corduroy', wales_per_tile=int(round(wpc * 12)), wales_per_cm=wpc, colors={'a': C[col]}),
        drape='heavy', roughness=0.9, sheen=0.45)

# ═════════════════════════════════ LEATHER ════════════════════════════════════
t = 'leather'
for lab, col in [('Black Calf', 'black'), ('Cognac Calf', 'cognac'), ('Tan Calf', 'tan'), ('Chocolate Calf', 'choc'),
                 ('Oxblood Calf', 'oxblood'), ('Navy Calf', 'navy'), ('Bone Calf', 'bone'), ('Forest Calf', 'forest'),
                 ('Grey Pebble Grain', 'grey'), ('Burgundy Pebble Grain', 'burgundy')]:
    peb = 'Pebble' in lab
    add(t, 'plain', lab, dict(kind='grain', tile_mm=110 if peb else 70, grain=13 if peb else 8, relief=2.0 if peb else 1.2,
                              gloss=0.8, colors={'a': C[col]}), drape='heavy', roughness=0.45)
for lab, col in [('Sand Suede', 'sand'), ('Tobacco Suede', 'tobacco'), ('Chocolate Suede', 'choc'), ('Navy Suede', 'navy'),
                 ('Taupe Suede', 'taupe'), ('Olive Suede', 'olive'), ('Black Suede', 'black'), ('Burgundy Suede', 'burgundy'),
                 ('Camel Suede', 'camel'), ('Grey Suede', 'grey')]:
    add(t, 'suede', lab, dict(kind='suede', tile_mm=60, colors={'a': C[col]}), drape='heavy', roughness=0.95, sheen=0.4)
for lab, col in [('Black Patent', 'black'), ('Ivory Patent', 'ivory'), ('Ruby Patent', 'ruby'), ('Navy Patent', 'navy'),
                 ('Nude Patent', '#d9b8a0'), ('Burgundy Patent', 'burgundy'), ('Emerald Patent', 'emerald'), ('Chocolate Patent', 'choc'),
                 ('Champagne Patent', 'champagne'), ('Midnight Patent', 'midnight')]:
    add(t, 'patent', lab, dict(kind='patent', tile_mm=60, colors={'a': C.get(col, col)}), drape='heavy', roughness=0.08, sheen=0)
