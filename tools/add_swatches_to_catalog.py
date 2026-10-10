"""Insert tools/fabric_swatches.json into FABRIC_CATALOG in js/fabrics.js (idempotent: skips ids already present)."""
import json, re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(ROOT, 'js', 'fabrics.js')
src = open(P).read()
man = json.load(open(os.path.join(ROOT, 'tools', 'fabric_swatches.json')))
a = src.index('export const FABRIC_CATALOG = ['); b = src.index('\n];', a)
cat = src[a:b]

def entry(m):
    q = lambda s: s.replace("\\", "\\\\").replace("'", "\\'")
    extra = ''.join(f", {k}: {m[k]}" for k in ('roughness', 'sheen') if k in m)
    return (f"          {{ id: '{m['id']}', label: '{q(m['label'])}', image: '{m['image']}', "
            f"thumb: '{m['thumb']}', drape: '{m['drape']}'{extra} }},\n")

# split catalog into top-level type blocks
starts = [mm.start() for mm in re.finditer(r"\n  \{\n    id: '", cat)]
blocks = [cat[s:e] for s, e in zip(starts, starts[1:] + [len(cat)])]
head = cat[:starts[0]]
added = 0
for bi, blk in enumerate(blocks):
    tid = re.match(r"\n  \{\n    id: '([^']+)'", blk).group(1)
    for coll in dict.fromkeys(m['coll'] for m in man if m['type'] == tid):
        new = ''.join(entry(m) for m in man if m['type'] == tid and m['coll'] == coll and f"id: '{m['id']}'" not in blk)
        if not new: continue
        n = new.count('\n'); added += n
        one = re.search(r"( *)\{ id: '%s',\s+label: '([^']+)',\s+swatches: \[\] \}," % re.escape(coll), blk)
        if one:
            ind = one.group(1)
            rep = f"{ind}{{\n{ind}  id: '{coll}',\n{ind}  label: '{one.group(2)}',\n{ind}  swatches: [\n{new}{ind}  ],\n{ind}}},"
            blk = blk[:one.start()] + rep + blk[one.end():]
            continue
        # multi-line or inline-open collection: insert before its closing bracket
        m0 = re.search(r"id: '%s',[^\n]*\n?(?:[^\n]*\n)*?[^\n]*swatches: \[" % re.escape(coll), blk)
        assert m0, (tid, coll)
        depth, k = 1, m0.end()
        while depth:
            depth += {'[': 1, ']': -1}.get(blk[k], 0); k += 1
        close = blk.rfind('\n', 0, k - 1) + 1          # start of the line holding the closing ']'
        blk = blk[:close] + new + blk[close:]
    blocks[bi] = blk
open(P, 'w').write(src[:a] + head + ''.join(blocks) + src[b:])
print('added', added)
