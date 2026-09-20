/**
 * ============================================================
 *  colourist/color.js  —  Perceptual colour maths
 * ============================================================
 *
 *  Shared by the browser (the Colourist panel) and the build tools
 *  (tools/fabric_gap_report.mjs), so palette-to-fabric matching is
 *  measured exactly the same way online and offline.
 *
 *  Everything here works in CIE L*a*b*. Matching MUST be perceptual:
 *  straight RGB distance will rank a muddy brown as a close match for
 *  a warm gold, because RGB distance has nothing to do with how
 *  different two colours look to a person.
 *
 *  deltaE2000 is the CIEDE2000 standard, verified against the Sharma
 *  et al. reference vectors in tools/test_color.mjs.
 *
 *  Rough reading of a ΔE00 value, for fabric:
 *      < 2   indistinguishable in normal light
 *      2–5   clearly the same colour, a shade apart
 *      5–10  recognisably the same family
 *      10–20 related but a customer would call them different colours
 *      > 20  a different colour
 */

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

// ── sRGB hex → L*a*b* (D65) ───────────────────────────────────────────────────
export function hexToLab(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return rgbToLab([(n >> 16) & 255, (n >> 8) & 255, n & 255]);
}

export function rgbToLab([r8, g8, b8]) {
  const lin = (v) => {
    v /= 255;
    return v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92;
  };
  const r = lin(r8), g = lin(g8), b = lin(b8);
  let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  let y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

// ── CIEDE2000 ─────────────────────────────────────────────────────────────────
export function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const kL = 1, kC = 1, kH = 1;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Cbar ** 7 / (Cbar ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const hp = (bb, aa) => {
    if (bb === 0 && aa === 0) return 0;
    const h = deg(Math.atan2(bb, aa));
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(b1, a1p);
  const h2p = hp(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.20 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-(((hbarp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cbarp ** 7 / (Cbarp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbarp - 50) ** 2) / Math.sqrt(20 + (Lbarp - 50) ** 2);
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(rad(2 * dTheta)) * RC;

  return Math.sqrt(
    (dLp / (kL * SL)) ** 2 +
    (dCp / (kC * SC)) ** 2 +
    (dHp / (kH * SH)) ** 2 +
    RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}

/** Plain-language match quality, for showing the customer why something was picked. */
export function matchQuality(dE) {
  if (dE < 3)  return { tier: 'exact',   label: 'an exact match' };
  if (dE < 8)  return { tier: 'close',   label: 'a shade away' };
  if (dE < 16) return { tier: 'near',    label: 'in the same family' };
  if (dE < 26) return { tier: 'related', label: 'a related tone' };
  return { tier: 'far', label: 'a different colour' };
}

/** Chroma and hue of a L*a*b* colour — used for neutral detection. */
export function chromaOf([, a, b]) { return Math.hypot(a, b); }
export function isNeutral(lab) { return chromaOf(lab) < 14; }
