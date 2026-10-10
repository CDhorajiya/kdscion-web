"""
gen_fabric_swatches.py — render the swatch library in tools/fabric_specs.py
Writes images/fabrics/<id>.webp (seamless tile), images/fabrics/thumbs/<id>.webp
and tools/fabric_swatches.json (id, label, image path with '#r<repeat>', thumb, drape, material).

  python3 tools/gen_fabric_swatches.py            # all
  python3 tools/gen_fabric_swatches.py wool-chex   # only ids starting with this
"""
import json, os, sys, zlib
from multiprocessing import Pool
sys.path.insert(0, os.path.dirname(__file__))
import fabric_engine as fe
from fabric_specs import OUT
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'images', 'fabrics'); TH = os.path.join(IMG, 'thumbs')
LAYOUT_MM = 1000   # a product page maps ~1 m of pattern layout onto the 0–1 UV square (median CLO layout 973 mm)


def job(e):
    img, tile_mm = fe.render(e['spec'], zlib.crc32(e['id'].encode()))
    img.save(os.path.join(IMG, e['id'] + '.webp'), 'WEBP', quality=80, method=4)
    # thumb shows ~10 cm of cloth so checks and prints read at a true scale on the card
    n = max(1, round(100 / tile_mm)) if tile_mm < 100 else 1
    big = Image.new('RGB', (img.width * n, img.height * n))
    for i in range(n):
        for j in range(n): big.paste(img, (i * img.width, j * img.height))
    crop = big if tile_mm * n <= 140 else big.crop((0, 0, int(big.width * 100 / (tile_mm * n)), int(big.width * 100 / (tile_mm * n))))
    crop.resize((360, 360), Image.LANCZOS).save(os.path.join(TH, e['id'] + '.webp'), 'WEBP', quality=86)
    r = round(LAYOUT_MM / tile_mm, 3)
    return dict(type=e['type'], coll=e['coll'], id=e['id'], label=e['label'], drape=e['drape'],
                image=f"images/fabrics/{e['id']}.webp#r{r}", thumb=f"images/fabrics/thumbs/{e['id']}.webp",
                tile_mm=round(tile_mm, 1), **{k: e[k] for k in ('roughness', 'sheen') if k in e})


if __name__ == '__main__':
    os.makedirs(TH, exist_ok=True)
    pre = sys.argv[1] if len(sys.argv) > 1 else ''
    todo = [e for e in OUT if e['id'].startswith(pre)]
    with Pool(max(2, (os.cpu_count() or 4) - 1)) as p:
        res = p.map(job, todo, chunksize=1)
    man_path = os.path.join(os.path.dirname(__file__), 'fabric_swatches.json')
    man = {m['id']: m for m in (json.load(open(man_path)) if os.path.exists(man_path) else [])}
    for m in res: man[m['id']] = m
    order = [e['id'] for e in OUT]
    json.dump([man[i] for i in order if i in man], open(man_path, 'w'), indent=1)
    print(len(res), 'rendered;', len(man), 'in manifest')
