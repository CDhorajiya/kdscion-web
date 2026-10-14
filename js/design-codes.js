/* design-codes.js — the women's design codes.

   Every women's design is wN (w1, w60 …). Designs that also come in leather are
   w-lN (w-l21, w-l24 …): they appear in the Women galleries with every fabric, and
   in Premium European Leather Portfolio › Jackets / Coats with leather only.
   Internal ids keep the old p-number (SKU KD-P60-FSSD, Firebase key p60), so stock,
   prices and dashboard settings carry over unchanged.

   A new w/l design: add its number (and every member of its variation set) here,
   then rename its page and files and add it to leather-jackets-coats-woman.html. */

export const WL = new Set([
    21, 24, 25, 26, 27, 41, 42, 52, 53, 60, 61, 62, 63, 72, 73, 76, 77, 81, 82, 83,
    85, 86, 87, 88, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 105, 106, 107, 108,
    116, 117, 121, 122, 125, 131, 132, 133, 135, 136, 145, 146, 149, 150, 155, 156,
    157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168,
]);

/* The cards of Leather Portfolio › Jackets / Coats, in gallery order: a single design,
   or a variation set (first number = its "w-lN design variations" page). */
export const LEATHER_JACKETS_COATS = [
    [21], [24, 25, 26, 27], [41, 42], [52, 53], [60, 61], [62, 63], [72, 73], [76, 77],
    [81, 82], [83], [85, 86], [87, 88], [92, 93], [94, 95], [96, 97, 98, 99], [100, 101],
    [105, 106], [107, 108], [116, 117], [121, 122], [125], [131, 132], [133], [135, 136],
    [145, 146], [149, 150], [155, 156], [157, 158], [159, 160], [161, 162], [163, 164],
    [165, 166], [167, 168],
];

/** 60 → 'w-l60', 1 → 'w1' */
export const designCode = (n) => (WL.has(+n) ? 'w-l' : 'w') + (+n);

/** 60 → 'w-l60.html' */
export const designPage = (n) => designCode(n) + '.html';

/** 'w-l60.html', 'w60', 'p60' … → 60 (or NaN) */
export const designNumber = (s) => +(/(?:^|\/)(?:w-l|w|p)(\d+)/i.exec(String(s)) || [])[1];
