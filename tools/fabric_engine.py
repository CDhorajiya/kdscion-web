"""
fabric_engine.py — procedural, thread-level fabric swatch renderer
==================================================================
Renders one seamless square tile of cloth. Product pages repeat the tile
across the garment (swatch path suffix '#r<n>', see loadFabricTexture), so a
small file keeps full thread detail at a true physical scale.

Woven cloth is built yarn by yarn: every warp and weft yarn has its own width,
thickness along its length (slubs), colour (yarn-dyed setts, marls, flecks),
hairiness and twist; a weave matrix decides which yarn is on top at each
crossing, floats are shaded along their whole length, and the cloth is lit
from its height field. Checks, houndstooth, herringbone, tweed, denim etc.
therefore come out of the weave itself, as in a real loom.

Also: corduroy (wales), leather (grain), suede (nap), patent (gloss) and a
block-print layer for print collections.

Everything is periodic over the tile, and there is deliberately NO
cloud-scale brightness variation (looks like stains once the tile repeats).
"""
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

f32 = np.float32


def hexc(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], f32) / 255


# ── periodic noise ────────────────────────────────────────────────────────────
class Noise:
    def __init__(self, seed):
        self.rng = np.random.default_rng(seed)

    def n1(self, rows, n, sigma):
        """rows independent periodic 1-D noises, unit std"""
        w = self.rng.standard_normal((rows, n)).astype(f32)
        g = np.exp(-2 * math.pi ** 2 * (np.fft.rfftfreq(n) * sigma) ** 2)
        o = np.fft.irfft(np.fft.rfft(w, axis=1) * g, n=n, axis=1).astype(f32)
        return o / (o.std(axis=1, keepdims=True) + 1e-9)

    def n2(self, n, sigma, aniso=(1, 1)):
        w = self.rng.standard_normal((n, n))
        f = np.fft.fftfreq(n)
        g = np.exp(-2 * math.pi ** 2 * ((f[:, None] * sigma * aniso[0]) ** 2 + (f[None, :] * sigma * aniso[1]) ** 2))
        o = np.real(np.fft.ifft2(np.fft.fft2(w) * g))
        return ((o - o.mean()) / (o.std() + 1e-9)).astype(f32)


# ── weave matrices: W[warp i % n, weft j % m] = True where the warp is on top ─
def weave(name):
    def twill(up, down, step=1):
        n = up + down
        return np.array([[((j - i * step) % n) < up for j in range(n)] for i in range(n)])

    def satin(n, step):
        return np.array([[(j == (i * step) % n) for j in range(n)] for i in range(n)])  # warp-faced if inverted

    if name == 'plain':
        return np.array([[1, 0], [0, 1]], bool)
    if name == 'basket2':
        return np.kron(np.array([[1, 0], [0, 1]]), np.ones((2, 2))).astype(bool)
    if name == 'oxford':           # paired warp ends over single picks
        return np.array([[1, 0], [1, 0], [0, 1], [0, 1]], bool)
    if name == 'twill21': return twill(2, 1)
    if name == 'twill22': return twill(2, 2)
    if name == 'twill31': return twill(3, 1)        # denim, drill
    if name == 'twill13': return twill(1, 3)
    if name == 'sateen5': return ~satin(5, 2)       # warp-faced 5-end satin
    if name == 'satin8':  return ~satin(8, 3)       # warp-faced 8-end satin (charmeuse)
    if name == 'herringbone':
        a = twill(2, 2); b = np.flip(a, axis=1)
        return np.concatenate([np.tile(a, (4, 1)), np.tile(b, (4, 1))], axis=0)   # 16 x 4
    if name == 'barleycorn':
        base = np.array([[1, 1, 0, 1, 0, 0], [0, 1, 1, 0, 1, 0], [0, 0, 1, 1, 0, 1],
                         [1, 0, 0, 1, 1, 0], [0, 1, 0, 0, 1, 1], [1, 0, 1, 0, 0, 1]], bool)
        return base
    if name == 'birdseye':
        return np.array([[1, 0, 0, 0], [0, 1, 0, 1], [0, 0, 1, 0], [0, 1, 0, 1]], bool) | \
               np.array([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], bool)
    if name == 'diamond':          # small diamond dobby: warp floats outline a diamond on plain ground
        n = 8; W = (np.add.outer(np.arange(n), np.arange(n)) % 2 == 0)
        for i in range(n):
            for j in range(n):
                if abs(i - 3.5) + abs(j - 3.5) in (3.0,): W[i, j] = True
        return W
    if name == 'pique':            # raised cords: plain ground with weft floats every 6th
        W = np.tile(np.array([[1, 0], [0, 1]], bool), (3, 3))
        W[:, 0] = False; W[:, 1] = False
        return W
    if name == 'honeycomb':
        n = 8; W = np.zeros((n, n), bool)
        for i in range(n):
            for j in range(n):
                W[i, j] = (abs(i - j) % n in (0,)) or (abs(i + j - (n - 1)) % n == 0) or \
                          (min(abs(i - 3.5), abs(j - 3.5)) < 1.2 and (i + j) % 2 == 0)
        return W
    if name == 'dobbydot':         # plain ground, small warp-float dots
        W = np.tile(np.array([[1, 0], [0, 1]], bool), (4, 4))
        W[0:2, 0:3] = True; W[4:6, 4:7] = True
        return W
    if name == 'hopsack':
        return np.kron(np.array([[1, 0], [0, 1]]), np.ones((3, 3))).astype(bool)
    if name == 'cord':             # bedford-ish warp rib
        return np.tile(np.array([[1, 1, 1, 0], [1, 1, 1, 0], [0, 0, 0, 1], [0, 0, 0, 1]], bool), (1, 1))
    raise ValueError(name)


def runs(W, axis):
    """for each cell of a cyclic weave matrix: (position-in-float, float-length)
    along `axis` for cells equal to their float's state"""
    n, m = W.shape
    pos = np.zeros(W.shape, f32); ln = np.ones(W.shape, f32)
    for a in range(n if axis == 1 else m):
        line = W[a, :] if axis == 1 else W[:, a]
        L = len(line)
        if line.all() or (~line).all():
            p = np.arange(L, dtype=f32); l = np.full(L, L, f32)
        else:
            p = np.zeros(L, f32); l = np.zeros(L, f32)
            start = next(k for k in range(L) if line[k] != line[k - 1])
            k = 0
            while k < L:
                s0 = (start + k) % L; v = line[s0]; r = 0
                while r < L and line[(s0 + r) % L] == v: r += 1
                for t in range(r):
                    p[(s0 + t) % L] = t; l[(s0 + t) % L] = r
                k += r
        if axis == 1: pos[a, :] = p; ln[a, :] = l
        else: pos[:, a] = p; ln[:, a] = l
    return pos, ln


# ── sett: [(colour, count), ...] → per-yarn colour index list ────────────────
def expand_sett(sett, mirror=False):
    seq = []
    for c, k in sett: seq += [c] * k
    if mirror: seq = seq + seq[-2:0:-1]
    return seq


def lcm(a, b): return a * b // math.gcd(a, b)


# ── woven renderer ────────────────────────────────────────────────────────────
def render_woven(spec, P, seed):
    nz = Noise(seed)
    W = weave(spec.get('weave', 'plain'))
    wn, wm = W.shape
    warp_seq = expand_sett(spec['warp'], spec.get('mirror', False))
    weft_seq = expand_sett(spec.get('weft', spec['warp']), spec.get('mirror', False))
    pitch = spec.get('pitch', 6.0)                      # target px per yarn
    L = lcm(lcm(wn, len(warp_seq)), lcm(wm, len(weft_seq)))
    k = max(1, round(P / pitch / L)); M = k * L          # yarns per tile, both axes
    irr = spec.get('irregular', 0.06)

    def edges():
        w = np.clip(nz.rng.normal(1, irr, M), 1 - 3 * irr, 1 + 3 * irr); w = w / w.sum() * P
        return np.concatenate([[0], np.cumsum(w)]), w
    ex, wx = edges(); ey, wy = edges()
    px = np.arange(P) + 0.5
    wi = np.clip(np.searchsorted(ex, px, 'right') - 1, 0, M - 1); wu = ((px - ex[wi]) / wx[wi]).astype(f32)
    fj = np.clip(np.searchsorted(ey, px, 'right') - 1, 0, M - 1); fv = ((px - ey[fj]) / wy[fj]).astype(f32)

    cover = spec.get('cover', 0.88); slub = spec.get('slub', 0.04)
    def thickness(sl, cv):
        base = nz.rng.normal(cv, 0.035 + irr * 0.15, (M, 1)).astype(f32)
        th = base + sl * nz.n1(M, P, 40) + 0.5 * sl * nz.n1(M, P, 7)
        thick = np.clip(nz.n1(M, P, 30) - 1.9, 0, None) * sl * 9
        return np.clip(th + thick, 0.5, 1.25), thick
    warp_th, warp_sl = thickness(slub, cover)
    weft_th, weft_sl = thickness(spec.get('weft_slub', slub), spec.get('weft_cover', cover))  # thin weft = warp-faced cloth

    # yarn colours along their length: base dyed colour, optional marl + flecks
    palette = {k2: hexc(v) for k2, v in spec['colors'].items()}
    def yarn_cols(seq, marl):
        base = np.stack([palette[c] for c in (seq * (M // len(seq)))])          # (M,3)
        cols = np.repeat(base[:, None, :], P, axis=1)                              # (M,P,3)
        tv = spec.get('tone_var', 0.03)
        cols *= (1 + nz.rng.normal(0, tv, (M, 1, 1))).astype(f32)
        if marl:
            for mc, amt, sg in marl.get('mix', []):                               # plied/marled yarns
                t = np.clip((nz.n1(M, P, sg) - (1 - amt) * 2.2) * 1.2, 0, 1)[..., None]
                cols = cols * (1 - t) + hexc(mc) * t
            for fc, freq in marl.get('flecks', []):                               # Donegal neps
                t = np.clip((nz.n1(M, P, 2.5) - (3.3 - freq)) * 2.5, 0, 1)[..., None]
                cols = cols * (1 - t) + hexc(fc) * t
        return cols.astype(f32)
    warp_c = yarn_cols(warp_seq, spec.get('warp_marl'))
    weft_c = yarn_cols(weft_seq, spec.get('weft_marl'))
    # denim-style wash: warp crowns fade along the yarn (vertical streaks)
    if spec.get('wash'):
        fade = np.clip(0.5 + 0.5 * nz.n1(M, P, 12) * 0.9, 0, 1)[..., None] * spec['wash']
        warp_c = warp_c * (1 - fade) + hexc(spec.get('wash_to', '#b8c8dc')) * fade

    fibA = nz.n1(M, P, 1.2); fibB = nz.n1(M, P, 1.2)
    fibA2 = nz.n1(M, P, 1.2); fibB2 = nz.n1(M, P, 1.2)
    hair = spec.get('hair', 1.0)          # fibre fuzz amount (wool/flannel high, silk low)
    twist = spec.get('twist', 0.035)
    sheen = spec.get('sheen', 0.0)        # specular on floats (satin, sateen, silk)
    blur = spec.get('felt', 0)            # milled / brushed surface softens the weave

    posw, lnw = runs(W, 1)                # warp floats run along the weft index
    posf, lnf = runs(~W, 0)               # weft floats run along the warp index
    Lv = np.array([-0.45, -0.55, 0.70], f32); Lv /= np.linalg.norm(Lv)
    out = np.empty((P, P, 3), f32); BAND = 256
    X = np.arange(P)
    for y0 in range(0, P, BAND):
        ys = np.arange(y0 - 1, y0 + BAND + 1) % P
        I = wi[None, :]; J = fj[ys][:, None]; U = wu[None, :]; V = fv[ys][:, None]
        a = I % wn; b = J % wm
        top = W[a, b]
        tw = warp_th[I, ys[:, None]]; tf = weft_th[J, X[None, :]]
        rw = (2 * U - 1) / tw; rf = (2 * V - 1) / tf
        cw = np.sqrt(np.clip(1 - rw * rw, 0, 1)); cf = np.sqrt(np.clip(1 - rf * rf, 0, 1))
        # float-aware undulation: crest at the middle of each float
        fw = (posw[a, b] + V) / lnw[a, b]; ff = (posf[a, b] + U) / lnf[a, b]
        und_w = np.sin(np.pi * np.clip(fw, 0, 1)) ** 0.6; und_f = np.sin(np.pi * np.clip(ff, 0, 1)) ** 0.6
        Hw = cw * (0.45 + 0.55 * np.where(top, und_w, 0.3))
        Hf = cf * (0.45 + 0.55 * np.where(top, 0.3, und_f))
        show_w = np.where(top, cw > 0, (cw > 0) & ~(cf > 0))
        show_f = ~show_w & (cf > 0)
        H = np.where(show_w, Hw + 0.15, np.where(show_f, Hf + 0.15, 0)).astype(f32)
        alw = ys[:, None] + np.zeros_like(I); alf = X[None, :] + np.zeros_like(J)
        sw = (np.round(U * 3) * 53).astype(int); sf = (np.round(V * 3) * 53).astype(int)
        fib_w = fibA[I, (alw + sw) % P] * 0.6 + fibA2[I, (alw + 97) % P] * 0.25
        fib_f = fibB[J, (alf + sf) % P] * 0.6 + fibB2[J, (alf + 97) % P] * 0.25
        tw_w = np.sin(2 * np.pi * (alw / 7.0 + 1.3 * rw)); tw_f = np.sin(2 * np.pi * (alf / 7.0 + 1.3 * rf))
        fib = np.where(show_w, 0.045 * hair * fib_w + twist * tw_w, 0.045 * hair * fib_f + twist * tw_f)
        slb = np.where(show_w, warp_sl[I, ys[:, None]], weft_sl[J, X[None, :]])
        colw = warp_c[I, ys[:, None]]; colf = weft_c[J, X[None, :]]
        col = np.where(show_w[..., None], colw, colf)
        gy, gx = np.gradient(H * 2.2)
        nrm = np.stack([-gx, -gy, np.ones_like(H)], -1); nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
        lam = np.clip(nrm @ Lv, 0, 1)
        ao = 0.72 + 0.28 * np.clip(H / 1.15, 0, 1)
        shade = ao * (0.70 + 0.42 * lam) * (1 + fib) * (1 + 0.2 * slb)
        yarn = col * shade[..., None]
        if sheen:
            fl = np.where(show_w, lnw[a, b], np.where(show_f, lnf[a, b], 1))
            spec_ = (lam ** 6) * np.clip((fl - 1) / 3, 0.15, 1) * np.where(show_w | show_f, 1, 0)
            yarn = yarn + (sheen * spec_)[..., None] * (1 - yarn) * 0.9
        gap = (H == 0)[..., None]
        gapc = 0.62 * 0.5 * (colw + colf)
        out[y0:y0 + BAND] = np.where(gap, gapc, yarn)[1:-1]
    if spec.get('smooth'):
        sm = spec['smooth']; im = Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8))
        out = out * (1 - sm) + np.asarray(im.filter(ImageFilter.GaussianBlur(1.6)), f32) / 255 * sm
    if blur:
        im = Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8))
        im2 = im.filter(ImageFilter.GaussianBlur(blur))
        out = (np.asarray(im, f32) * 0.35 + np.asarray(im2, f32) * 0.65) / 255
        # brushed fibre over the top
        fz = nz.n2(P, 0.7)
        out *= (1 + 0.035 * hair * fz)[..., None]
    tile_threads = M
    return out, tile_threads


# ── corduroy: cut-pile wales ──────────────────────────────────────────────────
def render_corduroy(spec, P, seed):
    nz = Noise(seed)
    wales = spec['wales_per_tile']; w = P / wales
    x = np.arange(P) + 0.5; u = (x % w) / w
    prof = np.sin(np.pi * u) ** 0.5                                        # rounded, plush wale
    idx = np.floor(x / w).astype(int) % wales
    pile = nz.n2(P, 0.6) * 0.045 + nz.n2(P, 1.4, (4, 1)) * 0.03           # cut-pile fibre tips
    c = hexc(spec['colors']['a'])
    tone = 1 + nz.rng.normal(0, 0.012, wales)[idx]
    shade = (0.66 + 0.34 * prof[None, :] * tone[None, :]) * (1 + pile)
    # velvet: pile tips brighten toward the crest, gentle flank highlight
    hl = (np.clip(np.cos(np.pi * (u - 0.4)), 0, 1) ** 4 * 0.10)[None, :]
    out = c[None, None, :] * shade[..., None]
    out = out + hl[..., None] * (1 - out) * 0.6
    return out.astype(f32), wales


# ── leather family ────────────────────────────────────────────────────────────
def worley(P, cell, rng):
    """periodic Worley noise → (F1, F2) distances in px; one jittered point per grid cell"""
    G = max(2, round(P / cell)); c = P / G
    pts = (np.arange(G)[:, None, None] * 0 + np.stack(np.meshgrid(np.arange(G), np.arange(G), indexing='ij'), -1)
           + rng.random((G, G, 2))) * c                                   # (G,G,2) as (y,x)
    y = np.arange(P)[:, None] + 0.5; x = np.arange(P)[None, :] + 0.5
    gy = (y // c).astype(int); gx = (x // c).astype(int)
    F1 = np.full((P, P), 1e9, f32); F2 = np.full((P, P), 1e9, f32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            cy = (gy + dy) % G; cx = (gx + dx) % G
            py_ = pts[cy, cx, 0]; px_ = pts[cy, cx, 1]
            ddy = (y - py_ + P / 2) % P - P / 2; ddx = (x - px_ + P / 2) % P - P / 2
            d = np.sqrt(ddy * ddy + ddx * ddx).astype(f32)
            F2 = np.where(d < F1, F1, np.minimum(F2, d)); F1 = np.minimum(F1, d)
    return F1, F2


def render_leather(spec, P, seed):
    nz = Noise(seed)
    c = hexc(spec['colors']['a'])
    kind = spec['kind']
    if kind == 'grain':
        cell = spec.get('grain', 9.0)                                       # pebble size in px
        # warp the lookup slightly so pebbles are irregular, not a honeycomb
        F1, F2 = worley(P, cell, nz.rng)
        F1b, F2b = worley(P, cell * 0.45, nz.rng)
        crease = np.exp(-((F2 - F1) / (cell * 0.10)) ** 2)                   # valleys between pebbles
        crease2 = np.exp(-((F2b - F1b) / (cell * 0.06)) ** 2) * 0.35
        dome = 1 - np.clip(F1 / (cell * 0.75), 0, 1) ** 2
        h = dome * 0.6 + 0.4 - crease * 0.8 - crease2
        gy, gx = np.gradient(h * spec.get('relief', 1.6))
        lam = 1 + 0.5 * (-0.6 * gx - 0.6 * gy)
        out = c * ((0.80 + 0.20 * np.clip(h, 0, 1)) * lam * (1 + 0.012 * nz.n2(P, 0.8)))[..., None]
        out = out + (np.clip(lam - 1.04, 0, 1) * 0.35 * spec.get('gloss', 1))[..., None] * (1 - out)
    elif kind == 'suede':
        nap = nz.n2(P, 0.6) * 0.05 + nz.n2(P, 1.6) * 0.035
        out = c * (0.92 + nap)[..., None]
    else:  # patent: glass-smooth, faint orange peel and a soft gloss sweep in-tile
        peel = nz.n2(P, 6) * 0.012
        out = c * (1 + peel)[..., None]
    return out.astype(f32), 0


# ── block-print motif library (drawn into a single motif tile) ───────────────
def _wrap_draw(draw_fn, T, S):
    """draw_fn(d, x, y, s) called at 9 wrapped offsets so motifs cross edges seamlessly"""
    TS = T * S
    def at(d, cx, cy, *a):
        for ox in (-TS, 0, TS):
            for oy in (-TS, 0, TS):
                draw_fn(d, cx + ox, cy + oy, *a)
    return at


def ellipse_pts(cx, cy, rx, ry, ang, n=48):
    return [(cx + rx * math.cos(t) * math.cos(ang) - ry * math.sin(t) * math.sin(ang),
             cy + rx * math.cos(t) * math.sin(ang) + ry * math.sin(t) * math.cos(ang))
            for t in np.linspace(0, 2 * math.pi, n)]


def motif(name, T, S=4):
    """returns list of L-mode masks (one per ink colour, later knocks out earlier)"""
    TS = T * S; s = TS / 256.0                       # design units: 256 per motif tile
    layers = [Image.new('L', (TS, TS), 0) for _ in range(3)]
    D = [ImageDraw.Draw(l) for l in layers]

    def W(fn):
        def g(cx, cy, *a):
            for ox in (-TS, 0, TS):
                for oy in (-TS, 0, TS):
                    fn(cx + ox, cy + oy, *a)
        return g

    if name == 'buti':
        @W
        def f(x, y):
            D[1].line([(x, y + 16 * s), (x, y + 44 * s)], fill=255, width=int(2.6 * s))
            for sd in (-1, 1): D[1].polygon(ellipse_pts(x + sd * 9 * s, y + 33 * s, 10 * s, 4.2 * s, sd * 0.75), fill=255)
            for k in range(5):
                a = -math.pi / 2 + k * 2 * math.pi / 5
                D[0].ellipse([x + math.cos(a) * 12 * s - 7.5 * s, y + math.sin(a) * 12 * s - 7.5 * s,
                              x + math.cos(a) * 12 * s + 7.5 * s, y + math.sin(a) * 12 * s + 7.5 * s], fill=255)
            D[1].ellipse([x - 6 * s, y - 6 * s, x + 6 * s, y + 6 * s], fill=255)
        f(64 * s, 56 * s); f(192 * s, 184 * s)
    elif name == 'paisley':
        def boteh(x, y, k, sg):
            R = 22 * k
            pts = []
            for t in np.linspace(-0.25 * math.pi, 1.15 * math.pi, 70):         # round body (bottom)
                pts.append((x + sg * R * math.cos(t), y + 10 * k + R * math.sin(t)))
            ex, ey = pts[-1]; sx, sy = pts[0]
            tipx, tipy = x + sg * 20 * k, y - 40 * k                              # curled tip
            def bez(p0, p1, p2, n=40):
                return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
                         (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in np.linspace(0, 1, n)]
            pts += bez((ex, ey), (x - sg * 26 * k, y - 26 * k), (tipx, tipy))
            pts += bez((tipx, tipy), (x + sg * 30 * k, y - 18 * k), (sx, sy))
            return [(px_ * s, py_ * s) for px_, py_ in pts]
        def f(x, y, sg):
          for ox in (-256, 0, 256):
           for oy in (-256, 0, 256):
            f1(x + ox, y + oy, sg)
        def f1(x, y, sg):
            D[0].polygon(boteh(x, y, 1.0, sg), fill=255)
            D[1].polygon(boteh(x + sg * 1, y + 3, 0.68, sg), fill=255)
            D[2].polygon(boteh(x + sg * 2, y + 6, 0.38, sg), fill=255)
            for kk in range(18):                                               # dotted halo
                t = kk / 18 * 2 * math.pi
                qx, qy = x + sg * 31 * math.cos(t) * 0.85, y + 4 + 31 * math.sin(t) * 1.15
                D[2].ellipse([(qx - 2) * s, (qy - 2) * s, (qx + 2) * s, (qy + 2) * s], fill=255)
            for kk in range(5):                                                # floret in the body
                a2 = kk * 2 * math.pi / 5
                qx, qy = x + sg * 2 + math.cos(a2) * 5, y + 14 + math.sin(a2) * 5
                D[0].ellipse([(qx - 3) * s, (qy - 3) * s, (qx + 3) * s, (qy + 3) * s], fill=255)
        f(68, 70, 1); f(196, 198, -1)
    elif name == 'foulard':
        @W
        def f(x, y):
            r = 20 * s
            D[0].polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=255)
            D[1].polygon([(x, y - r * 0.55), (x + r * 0.55, y), (x, y + r * 0.55), (x - r * 0.55, y)], fill=255)
            D[2].ellipse([x - 4 * s, y - 4 * s, x + 4 * s, y + 4 * s], fill=255)
        @W
        def g(x, y):
            D[1].ellipse([x - 3.5 * s, y - 3.5 * s, x + 3.5 * s, y + 3.5 * s], fill=255)
        for cx, cy in [(64, 64), (192, 192)]: f(cx * s, cy * s)
        for cx, cy in [(192, 64), (64, 192)]: g(cx * s, cy * s)
    elif name == 'polka':
        @W
        def f(x, y, r):
            D[0].ellipse([x - r, y - r, x + r, y + r], fill=255)
        f(64 * s, 64 * s, 15 * s); f(192 * s, 192 * s, 15 * s)
    elif name == 'pindot':
        @W
        def f(x, y, r):
            D[0].ellipse([x - r, y - r, x + r, y + r], fill=255)
        for cx in range(0, 256, 64):
            for cy in range(0, 256, 64):
                f((cx + 32 * ((cy // 64) % 2)) * s, cy * s, 4.5 * s)
    elif name == 'ogee':                                     # damask-style ogee lattice + flower
        for k in range(2):
            pts_l = []; pts_r = []
            for t in np.linspace(0, 1, 80):
                yy = t * TS
                xx = TS / 2 + math.sin(t * 2 * math.pi) * TS * 0.22
                pts_l.append((xx - TS / 2 * k, yy)); pts_r.append((TS - xx + TS / 2 * k, yy))
            for pts in (pts_l, pts_r):
                for ox in (-TS, 0, TS):
                    D[0].line([(p[0] + ox, p[1]) for p in pts], fill=255, width=int(5 * s))
        @W
        def f(x, y):
            for kk in range(8):
                a = kk * math.pi / 4
                D[1].polygon(ellipse_pts(x + math.cos(a) * 14 * s, y + math.sin(a) * 14 * s, 12 * s, 5 * s, a), fill=255)
            D[2].ellipse([x - 6 * s, y - 6 * s, x + 6 * s, y + 6 * s], fill=255)
        f(128 * s, 128 * s); f(0, 0)
    elif name == 'vine':
        for ox in (-TS, 0, TS):
            pts = [(t * TS + ox, TS * 0.5 + math.sin(t * 2 * math.pi) * TS * 0.18) for t in np.linspace(0, 1, 120)]
            D[0].line(pts, fill=255, width=int(3 * s))
        for k in range(8):
            t = (k + 0.5) / 8; x = t * TS; y = TS * 0.5 + math.sin(t * 2 * math.pi) * TS * 0.18
            sd = 1 if k % 2 else -1
            ang = math.atan(math.cos(t * 2 * math.pi) * 2 * math.pi * 0.18) + sd * 0.9
            for ox in (-TS, 0, TS):
                D[1].polygon(ellipse_pts(x + ox + math.cos(ang) * 14 * s, y + math.sin(ang) * 14 * s, 13 * s, 5 * s, ang), fill=255)
        @W
        def f(x, y):
            for kk in range(5):
                a = kk * 2 * math.pi / 5
                D[2].ellipse([x + math.cos(a) * 6 * s - 5 * s, y + math.sin(a) * 6 * s - 5 * s,
                              x + math.cos(a) * 6 * s + 5 * s, y + math.sin(a) * 6 * s + 5 * s], fill=255)
        f(64 * s, 30 * s); f(192 * s, 226 * s)
    elif name == 'scales':                                   # art-deco fans (seigaiha): overlapping scales
        fans = []
        for row in range(16):                                 # 16 rows x 4 per motif tile, 16-unit row step
            for col in range(4):
                for ox in (-TS, 0, TS):
                    for oy in (-TS, 0, TS):
                        fans.append((row * 16 * s + oy, (col + 0.5 * (row % 2)) * 64 * s + ox))
        for y, x in sorted(fans):                             # paint top to bottom: lower fans cover upper
            if y < -40 * s or y > TS + 40 * s: continue
            bb = lambda r: [x - r * s, y - r * s, x + r * s, y + r * s]
            for l in range(3): D[l].pieslice(bb(32), 180, 360, fill=0)
            D[0].pieslice(bb(32), 180, 360, fill=255)
            D[0].pieslice(bb(29), 180, 360, fill=0)
            D[0].pieslice(bb(27), 180, 360, fill=255)
            D[1].pieslice(bb(22), 180, 360, fill=255)
            D[2].pieslice(bb(11), 180, 360, fill=255)
    elif name == 'trellis':
        for k in range(-1, 3):
            for ox in (-TS, 0, TS):
                D[0].line([(k * TS / 2 + ox, 0), (k * TS / 2 + TS / 2 + ox, TS / 2), (k * TS / 2 + ox, TS)], fill=255, width=int(3 * s))
                D[0].line([(k * TS / 2 + TS / 2 + ox, 0), (k * TS / 2 + ox, TS / 2), (k * TS / 2 + TS / 2 + ox, TS)], fill=255, width=int(3 * s))
        @W
        def f(x, y):
            D[1].polygon([(x, y - 9 * s), (x + 9 * s, y), (x, y + 9 * s), (x - 9 * s, y)], fill=255)
            D[2].ellipse([x - 3 * s, y - 3 * s, x + 3 * s, y + 3 * s], fill=255)
        for cx, cy in [(0, 0), (128, 128), (128, 0), (0, 128)]: f(cx * s, cy * s)
    elif name == 'quatrefoil':
        @W
        def f(x, y):
            for a in range(4):
                ang = a * math.pi / 2
                D[0].ellipse([x + math.cos(ang) * 16 * s - 17 * s, y + math.sin(ang) * 16 * s - 17 * s,
                              x + math.cos(ang) * 16 * s + 17 * s, y + math.sin(ang) * 16 * s + 17 * s], fill=255)
            for a in range(4):
                ang = a * math.pi / 2
                D[1].ellipse([x + math.cos(ang) * 16 * s - 11 * s, y + math.sin(ang) * 16 * s - 11 * s,
                              x + math.cos(ang) * 16 * s + 11 * s, y + math.sin(ang) * 16 * s + 11 * s], fill=255)
            D[2].ellipse([x - 7 * s, y - 7 * s, x + 7 * s, y + 7 * s], fill=255)
        f(64 * s, 64 * s); f(192 * s, 192 * s)
    elif name == 'sprig':
        @W
        def f(x, y, ang):
            ex, ey = x + math.cos(ang) * 30 * s, y + math.sin(ang) * 30 * s
            D[0].line([(x, y), (ex, ey)], fill=255, width=int(2.2 * s))
            for t, sd in ((0.35, 1), (0.55, -1), (0.75, 1)):
                bx, by = x + (ex - x) * t, y + (ey - y) * t; a2 = ang + sd * 0.8
                D[0].polygon(ellipse_pts(bx + math.cos(a2) * 7 * s, by + math.sin(a2) * 7 * s, 7.5 * s, 3 * s, a2), fill=255)
            D[1].ellipse([ex - 5 * s, ey - 5 * s, ex + 5 * s, ey + 5 * s], fill=255)
        for cx, cy, a in [(40, 50, -0.6), (170, 30, 2.2), (110, 140, 0.9), (220, 200, -2.4), (50, 210, 1.8)]:
            f(cx * s, cy * s, a)
    elif name == 'stripe':                                   # printed Regency stripe
        for x0, w, l in ((0, 40, 0), (52, 6, 1), (66, 6, 1), (128, 40, 0), (180, 6, 2), (194, 6, 2)):
            D[l].rectangle([x0 * s, 0, (x0 + w) * s, TS], fill=255)
    elif name == 'ikat':
        @W
        def f(x, y):
            for r, l in ((40, 0), (26, 1), (12, 2)):
                D[l].polygon([(x, y - r * s * 1.3), (x + r * s, y), (x, y + r * s * 1.3), (x - r * s, y)], fill=255)
        f(64 * s, 64 * s); f(192 * s, 192 * s)
    else:
        raise ValueError(name)
    masks = []
    for l in layers:
        if name == 'ikat':   # ikat: the dye bleeds along the warp
            l = l.filter(ImageFilter.BoxBlur(int(2 * S))).resize((TS, TS))
            l = l.filter(ImageFilter.GaussianBlur(S * 2.2))
        else:
            l = l.filter(ImageFilter.GaussianBlur(S * 1.6))
        masks.append(np.asarray(l.resize((T, T), Image.LANCZOS), f32) / 255)
    # registered blocks: a later colour knocks out the earlier ones
    for i in range(len(masks)):
        for j in range(i + 1, len(masks)):
            masks[i] = masks[i] * (1 - np.clip((masks[j] - 0.45) * 4, 0, 1))
    return masks


def apply_print(cloth, spec, P, seed, reps):
    nz = Noise(seed + 7)
    T = P // reps
    masks = motif(spec['motif'], T)
    fz = nz.n2(P, 1.0)
    out = cloth.copy()
    lum = cloth.mean(-1)
    crown = np.clip((lum - lum.mean()) / (lum.std() * 3 + 1e-6) + 0.5, 0, 1)
    for m, col in zip(masks, spec['inks']):
        if col is None: continue
        mm = np.tile(m, (reps, reps))
        mm = np.clip((mm - 0.5 + 0.10 * fz) * 3.2 + 0.5, 0, 1)
        take = spec.get('ink_take', 0.9) * (0.88 + 0.12 * crown)
        a = (mm * take)[..., None]
        c = hexc(col)
        if spec.get('ink_mode', 'dye') == 'discharge':
            out = out * (1 - a) + (c * (0.75 + 0.25 * crown[..., None])) * a
        else:
            out = out * (1 - a + a * c / np.clip(hexc(spec['colors'][spec.get('ground', 'g')]), 0.05, 1))
    return np.clip(out, 0, 1)


def render(spec, seed):
    """→ (PIL image, tile size in mm). Physical size comes from the thread count
    (woven), wale count (corduroy) or an explicit tile_mm (leather)."""
    P = spec.get('px', 1536)
    kind = spec.get('kind', 'woven')
    if kind == 'corduroy':
        img, wales = render_corduroy(spec, P, seed); tile_mm = wales / spec['wales_per_cm'] * 10
    elif kind in ('grain', 'suede', 'patent'):
        img, _ = render_leather(spec, P, seed); tile_mm = spec.get('tile_mm', 150)
    else:
        img, M = render_woven(spec, P, seed); tile_mm = M / spec['tpc'] * 10
    if spec.get('motif'):
        reps = max(1, round(tile_mm / spec.get('motif_mm', 60)))
        while P % reps: reps += 1
        img = apply_print(img, spec, P, seed, reps)
    return Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8)), tile_mm
