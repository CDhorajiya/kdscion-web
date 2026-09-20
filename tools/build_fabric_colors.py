#!/usr/bin/env python3
"""
tools/build_fabric_colors.py — swatch images -> data/fabric-color.json

WHY THIS EXISTS
---------------
The curated palettes speak in colour ("Sapphire", #0F52BA). The fabric
catalogue speaks in images (images/linen-1.webp). Nothing connected the two,
so "Sapphire suits you" could never become "this linen, in stock, on this
dress." This tool reads every swatch image and records what colour it
actually is, in a form the matcher can measure distance against.

Colours are stored in CIE L*a*b* because matching must be *perceptual*.
Plain RGB distance gives visibly wrong answers — it will happily call a
muddy brown a close match for a warm gold.

Patterned and marled fabrics are not one colour, so up to three clusters are
kept with their weights; the matcher can then judge a check or a print by its
dominant ground while still knowing the secondary is there.

USAGE
    python3 tools/build_fabric_colors.py
    python3 tools/build_fabric_colors.py --extras firebase-extras.json

Re-run whenever swatches are added. Missing images are expected while the
fabric range is still being bought — they are reported, not fatal.
"""

import json, re, sys, os, colorsys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required:  pip3 install Pillow")

ROOT     = Path(__file__).resolve().parent.parent
FABRICS  = ROOT / "js" / "fabrics.js"
OUT      = ROOT / "data" / "fabric-color.json"

# ── sRGB -> CIE L*a*b* (D65) ─────────────────────────────────────────────────
def _lin(c):
    c /= 255.0
    return ((c + 0.055) / 1.055) ** 2.4 if c > 0.04045 else c / 12.92

def rgb_to_lab(rgb):
    r, g, b = (_lin(v) for v in rgb)
    x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
    y = (r * 0.2126 + g * 0.7152 + b * 0.0722)
    z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return [round(116 * fy - 16, 2), round(500 * (fx - fy), 2), round(200 * (fy - fz), 2)]

def hexof(rgb):
    return "#%02X%02X%02X" % tuple(int(round(v)) for v in rgb)

# ── k-means (k=3), plain and dependency-free ─────────────────────────────────
def kmeans(pixels, k=3, iters=14):
    if not pixels:
        return []
    # Spread the seeds over the luminance range so a dark print and a light
    # ground do not both seed inside the same cluster.
    ordered = sorted(pixels, key=lambda p: 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2])
    k = min(k, len(ordered))
    cents = [list(ordered[int((i + 0.5) * len(ordered) / k)]) for i in range(k)]
    for _ in range(iters):
        buckets = [[] for _ in range(k)]
        for px in pixels:
            best, bd = 0, None
            for i, c in enumerate(cents):
                d = (px[0]-c[0])**2 + (px[1]-c[1])**2 + (px[2]-c[2])**2
                if bd is None or d < bd:
                    best, bd = i, d
            buckets[best].append(px)
        moved = False
        for i, bucket in enumerate(buckets):
            if not bucket:
                continue
            new = [sum(p[j] for p in bucket) / len(bucket) for j in range(3)]
            if any(abs(new[j] - cents[i][j]) > 0.5 for j in range(3)):
                moved = True
            cents[i] = new
        if not moved:
            break
    total = sum(len(b) for b in buckets) or 1
    out = [{"rgb": cents[i], "weight": len(buckets[i]) / total} for i in range(k) if buckets[i]]
    return sorted(out, key=lambda c: -c["weight"])

# ── Descriptive tags, so the assistant can speak about a fabric ──────────────
def describe(rgb, lab):
    """Hue and chroma are read from L*a*b*, not HLS.

    HLS saturation inflates badly for pale colours — a sand beige reads as
    heavily saturated orange, which is both wrong and, on a page about
    flattering colour, embarrassing. L*a*b* chroma (the distance from the
    neutral axis) matches how the eye judges it."""
    import math
    L, a, b = lab
    C   = math.hypot(a, b)                       # chroma: 0 = grey
    deg = math.degrees(math.atan2(b, a)) % 360   # hue angle
    value  = "light" if L >= 70 else "mid" if L >= 40 else "deep"
    chroma = "saturated" if C >= 38 else "muted" if C >= 14 else "neutral"
    if C < 14:
        family = "neutral"
    else:
        family = next(name for hi, name in [
            (20,"red"),(50,"terracotta"),(75,"gold"),(100,"olive"),(160,"green"),
            (200,"teal"),(260,"blue"),(310,"violet"),(345,"magenta"),(361,"red")] if deg < hi)
    # Warm/cool bias from the b* (yellow-blue) and a* (red-green) axes. Used to
    # weight a swatch toward the palettes whose undertone it flatters.
    warm = max(0.0, min(1.0, (lab[2] + 20) / 60 * 0.7 + (lab[1] + 10) / 50 * 0.3))
    return {"family": family, "value": value, "chroma": chroma,
            "undertoneBias": {"warm": round(warm, 2), "cool": round(1 - warm, 2)}}

def open_image(path):
    """Pillow cannot read AVIF without a plugin. Rather than add a dependency,
    fall back to macOS `sips` to transcode into a temp PNG."""
    try:
        return Image.open(path)
    except Exception:
        import subprocess, tempfile
        tmp = Path(tempfile.mkdtemp()) / "swatch.png"
        subprocess.run(["sips", "-s", "format", "png", str(path), "--out", str(tmp)],
                       check=True, capture_output=True)
        return Image.open(tmp)

def analyse(path, sample=140):
    im = open_image(path).convert("RGBA")
    im.thumbnail((sample, sample))
    pixels = [(r, g, b) for r, g, b, a in im.getdata() if a > 200]
    if not pixels:
        return None
    clusters = kmeans(pixels, k=3)
    if not clusters:
        return None
    keep = [c for c in clusters if c["weight"] >= 0.08] or clusters[:1]
    dom  = keep[0]
    lab  = rgb_to_lab(dom["rgb"])
    rec  = {"dominant": {"hex": hexof(dom["rgb"]), "lab": lab, "weight": round(dom["weight"], 3)},
            "secondary": [{"hex": hexof(c["rgb"]), "lab": rgb_to_lab(c["rgb"]),
                           "weight": round(c["weight"], 3)} for c in keep[1:]],
            "patterned": len(keep) > 1 and keep[1]["weight"] >= 0.22}
    rec.update(describe(dom["rgb"], lab))
    return rec

# ── Which swatches exist ─────────────────────────────────────────────────────
def swatches_from_catalog():
    src = FABRICS.read_text(encoding="utf8")
    found = re.findall(r"\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']*)'\s*,\s*image:\s*'([^']+)'", src)
    return [{"id": i, "label": l, "image": img} for i, l, img in found]

def main():
    swatches = swatches_from_catalog()
    extras_path = None
    if "--extras" in sys.argv:
        extras_path = Path(sys.argv[sys.argv.index("--extras") + 1])
    if extras_path and extras_path.exists():
        # Swatches added from the admin dashboard live in Firebase, not in
        # fabrics.js. Export them to JSON ([{id,label,image}]) and pass them in.
        swatches += json.loads(extras_path.read_text())

    colors, missing, failed = {}, [], []
    for s in swatches:
        img = ROOT / s["image"]
        if not img.exists():
            missing.append(s["id"]); continue
        try:
            rec = analyse(img)
        except Exception as err:                       # a corrupt or odd file
            failed.append(f'{s["id"]}: {err}'); continue
        if not rec:
            failed.append(f'{s["id"]}: no opaque pixels'); continue
        rec["label"] = s["label"]
        rec["image"] = s["image"]
        colors[s["id"]] = rec

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({
        "generated": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "note": "Generated by tools/build_fabric_colors.py — re-run when swatches are added.",
        "colors": colors,
    }, indent=2))

    print(f"✓ {OUT.relative_to(ROOT)} — {len(colors)} swatches analysed")
    for sid, rec in colors.items():
        d = rec["dominant"]
        print(f'   {sid:16} {d["hex"]}  {rec["family"]:>10} / {rec["value"]:<5} / {rec["chroma"]}'
              + ("  · patterned" if rec["patterned"] else ""))
    if missing:
        print(f'\n  {len(missing)} swatch image(s) not on disk yet — expected while the range is being bought:')
        print("   " + ", ".join(missing))
    if failed:
        print(f'\n  {len(failed)} failed:')
        for f in failed: print("   " + f)

if __name__ == "__main__":
    main()
