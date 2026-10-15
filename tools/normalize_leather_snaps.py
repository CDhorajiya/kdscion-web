#!/usr/bin/env python3
"""Leather snapshots: raw 3D canvas PNGs → pool-style WebPs.

    python3 tools/normalize_leather_snaps.py RAW_DIR 19 21 …   (called by render_leather_snaps.mjs)

Each raw shot (w-lN.png, on the viewer's flat #e8e8e8) is keyed out by a flood
fill from the border (so a pale panel inside the garment survives), cropped, given a
soft contact shadow under the feet, and set at 1735 px tall, centred, on the pool's
transparent 1679×2042 canvas: images/leather/KDscion-w-lN.webp.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from collections import deque

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'images/leather'
CANVAS, TARGET_H = (1679, 2042), 1735


def key_out(img):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    h, w, _ = a.shape
    near = (np.abs(a - a[2, 2]).sum(axis=2) <= 18)        # the viewer's flat background colour
    # Background = the near-colour region connected to the border (a pale panel inside the
    # garment survives). Found on a 4x smaller grid, where a plain flood fill is quick.
    k = 4
    hs, ws = h // k, w // k
    small = near[:hs * k, :ws * k].reshape(hs, k, ws, k).all(axis=(1, 3))
    seen = np.zeros_like(small)
    q = deque((y, x) for y in range(hs) for x in (0, ws - 1) if small[y, x])
    q.extend((y, x) for x in range(ws) for y in (0, hs - 1) if small[y, x])
    for y, x in q: seen[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < hs and 0 <= nx < ws and small[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    big = np.zeros((h, w), bool)
    big[:hs * k, :ws * k] = np.repeat(np.repeat(seen, k, axis=0), k, axis=1)
    # grow back to full resolution: near-colour pixels touching the found background
    grown = big.copy()
    for _ in range(k):
        g = grown.copy()
        g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
        grown = g & near | big
    keep = ~grown
    m = max(8, round(min(h, w) * 0.02))          # the viewer's rounded corners are not the garment
    keep[:m, :] = keep[-m:, :] = False
    keep[:, :m] = keep[:, -m:] = False
    alpha = Image.fromarray(np.where(keep, 255, 0).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # clean, soft edge
    out = img.convert('RGBA')
    out.putalpha(alpha)
    return out


def place(fig):
    fig = fig.crop(fig.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    w, h = fig.size
    scale = TARGET_H / h
    fig = fig.resize((round(w * scale), TARGET_H), Image.LANCZOS)
    canvas = Image.new('RGBA', CANVAS, (0, 0, 0, 0))
    x, y = (CANVAS[0] - fig.width) // 2, (CANVAS[1] - TARGET_H) // 2
    # a soft contact shadow where the feet meet the floor
    shadow = Image.new('L', CANVAS, 0)
    cx, fy = CANVAS[0] // 2, y + TARGET_H - 18
    ImageDraw.Draw(shadow).ellipse((cx - 330, fy - 34, cx + 330, fy + 34), fill=95)
    shadow = shadow.filter(ImageFilter.GaussianBlur(26))
    canvas.paste(Image.new('RGBA', CANVAS, (0, 0, 0, 255)), (0, 0), shadow)
    canvas.alpha_composite(fig, (x, y))
    return canvas


def main():
    raw = Path(sys.argv[1])
    OUT.mkdir(exist_ok=True)
    for n in sys.argv[2:]:
        src = raw / f'w-l{n}.png'
        if not src.exists():
            print('  missing', src.name); continue
        dst = OUT / f'KDscion-w-l{n}.webp'
        place(key_out(Image.open(src))).save(dst, 'WEBP', quality=86, method=4)
        print('  wrote', dst.relative_to(ROOT))


if __name__ == '__main__':
    main()
