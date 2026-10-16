/* cuff-shapes.js — the three shirt cuffs as one shared geometry.

   Drawn by tools/render_cuff_images.mjs into the cuff images that
   js/cuff-studio.js shows (and the names and notes come from CUFFS below).

   The board is 240 × 240: the end of a sleeve hanging straight down, seen from
   the outside, with its tower placket, two pleats and the cuff below. A cuff is
   a handful of numbers, so changing cuff reshapes one into the next:

     H    bottom edge of the cuff (its top is always y = 150)
     r    corner radius
     b1y  first button        b2y / b2o  second button (y, opacity)
     bo   buttons' opacity    cl         cufflink opacity
     fr   the French cuff's folded-back edge (opacity) */

export const CUFFS = [
    { id: 'barrel1', name: 'One Button', full: 'Barrel · One Button', mood: 'Everyday classic',
      note: 'A single band closed by one button. The standard of the dress shirt: clean, easy, right with or without a jacket.' },
    { id: 'barrel2', name: 'Two Button', full: 'Barrel · Two Button', mood: 'Tailored & precise',
      note: 'A deeper band with two buttons, one above the other. A little more structure and a sharper line at the wrist.' },
    { id: 'french',  name: 'French',     full: 'French Cuff',         mood: 'Formal & distinguished',
      note: 'A double-length cuff folded back on itself and fastened with cufflinks. For evening, ceremony and the moments that ask for more.' },
];

export const SHAPES = {
    barrel1: { H: 186, r: 7, b1y: 168, b2y: 168, b2o: 0, bo: 1, cl: 0, fr: 0 },
    barrel2: { H: 198, r: 7, b1y: 163, b2y: 185, b2o: 1, bo: 1, cl: 0, fr: 0 },
    french:  { H: 206, r: 3, b1y: 178, b2y: 178, b2o: 0, bo: 0, cl: 1, fr: 1 },
};

const f = (n) => n.toFixed(2);

export const SLEEVE  = 'M50,0 L63,150 L177,150 L190,0 Z';
export const PLACKET = 'M160,150 L160,97 L166,89 L172,97 L172,150';
export const PLACKET_STITCH = 'M162.2,148 L162.2,98 L166,93.2 L169.8,98 L169.8,148';
export const PLEATS  = 'M146,150 Q147.5,143 149,135 M155,150 Q154.6,144 153.8,137';
export const FOLDS   = 'M78,10 Q90,70 84,138 M120,4 Q116,60 122,132 M201,0';

export function cuffPaths(s) {
    const H = s.H, r = s.r, ri = Math.max(r - 3, 0.6);
    return {
        cuff:   `M62,150 L178,150 L178,${f(H - r)} Q178,${f(H)} ${f(178 - r)},${f(H)} L${f(62 + r)},${f(H)} Q62,${f(H)} 62,${f(H - r)} Z`,
        stitch: `M65,153 L175,153 L175,${f(H - 3 - ri)} Q175,${f(H - 3)} ${f(175 - ri)},${f(H - 3)} L${f(65 + ri)},${f(H - 3)} Q65,${f(H - 3)} 65,${f(H - 3 - ri)} Z`,
        edge:   `M166,150 L166,${f(H)}`,
        fold:   `M62,155 L178,155`,
        edge2:  `M169.5,150 L169.5,${f(H)}`,   // French: the cuff's other end, kissing the first
    };
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function mix(a, b, t) {
    const o = {};
    for (const k in a) o[k] = lerp(a[k], b[k], t);
    return o;
}
