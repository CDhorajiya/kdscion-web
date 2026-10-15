/* design-codes.js — the women's design codes.

   Every women's design is wN (w1, w60 …). Designs that also come in leather are
   w-lN (w-l21, w-l24 …): they appear in the Women galleries with every fabric, and
   in Premium European Leather Portfolio › Jackets / Coats with leather only.
   Internal ids keep the old p-number (SKU KD-P60-FSSD, Firebase key p60), so stock,
   prices and dashboard settings carry over unchanged.

   A new w/l design: python3 tools/make_wl.py N — it updates this file, renames the
   page and files, rebuilds Leather Portfolio › Jackets / Coats and the redirects. */

export const WL = new Set([
    19, 21, 24, 25, 26, 27, 41, 42, 52, 53, 60, 61, 62, 63, 72, 73, 76, 77, 81, 82, 83, 85,
    86, 87, 88, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 105, 106, 107, 108, 116, 117, 121,
    122, 125, 131, 132, 133, 135, 136, 145, 146, 149, 150, 155, 156, 157, 158, 159, 160,
    161, 162, 163, 164, 165, 166, 167, 168,
]);

/* The cards of Leather Portfolio › Jackets / Coats, in gallery order: a single design,
   or a variation set (first number = its "w-lN design variations" page). */
export const LEATHER_JACKETS_COATS = [
    [19], [21], [24, 25, 26, 27], [41, 42], [52, 53], [60, 61], [62, 63], [72, 73],
    [76, 77], [81, 82], [83], [85, 86], [87, 88], [92, 93], [94, 95], [96, 97, 98, 99],
    [100, 101], [105, 106], [107, 108], [116, 117], [121, 122], [125], [131, 132], [133],
    [135, 136], [145, 146], [149, 150], [155, 156], [157, 158], [159, 160], [161, 162],
    [163, 164], [165, 166], [167, 168],
];

/* The leather each family is shown in — gallery card, variation page and the product
   page's leather view all wear it — calf and suede in different colours, so the
   portfolio reads as a range rather than one hide. Keyed by the card's first number. */
export const LEATHER_LOOK = {
    19: 'leather-plain-5',    // Oxblood Calf
    21: 'leather-suede-2',    // Tobacco Suede
    24: 'leather-plain-2',    // Cognac Calf
    41: 'leather-suede-6',    // Olive Suede
    52: 'leather-plain-6',    // Navy Calf
    60: 'leather-suede-9',    // Camel Suede
    62: 'leather-plain-4',    // Chocolate Calf
    72: 'leather-suede-5',    // Taupe Suede
    76: 'leather-plain-8',    // Forest Calf
    81: 'leather-suede-8',    // Burgundy Suede
    83: 'leather-plain-7',    // Bone Calf
    85: 'leather-suede-4',    // Navy Suede
    87: 'leather-plain-3',    // Tan Calf
    92: 'leather-suede-10',   // Grey Suede
    94: 'leather-plain-1',    // Black Calf
    96: 'leather-suede-3',    // Chocolate Suede
    100: 'leather-plain-10',  // Burgundy Pebble Grain
    105: 'leather-suede-1',   // Sand Suede
    107: 'leather-plain-2',   // Cognac Calf
    116: 'leather-suede-6',   // Olive Suede
    121: 'leather-plain-5',   // Oxblood Calf
    125: 'leather-suede-9',   // Camel Suede
    131: 'leather-plain-9',   // Grey Pebble Grain
    133: 'leather-suede-2',   // Tobacco Suede
    135: 'leather-plain-6',   // Navy Calf
    145: 'leather-suede-5',   // Taupe Suede
    149: 'leather-plain-4',   // Chocolate Calf
    155: 'leather-suede-8',   // Burgundy Suede
    157: 'leather-plain-7',   // Bone Calf
    159: 'leather-suede-4',   // Navy Suede
    161: 'leather-plain-8',   // Forest Calf
    163: 'leather-suede-1',   // Sand Suede
    165: 'leather-plain-3',   // Tan Calf
    167: 'leather-suede-10',  // Grey Suede
};
const LEATHER_ROTATION = ['leather-plain-2', 'leather-suede-9', 'leather-plain-6', 'leather-suede-2',
    'leather-plain-5', 'leather-suede-6', 'leather-plain-8', 'leather-suede-5'];

/** 25 → 'leather-plain-2': the leather of the family design n belongs to */
export function leatherFor(n) {
    const set = LEATHER_JACKETS_COATS.find((c) => c.includes(+n));
    if (!set) return 'leather-plain-2';
    return LEATHER_LOOK[set[0]] || LEATHER_ROTATION[LEATHER_JACKETS_COATS.indexOf(set) % LEATHER_ROTATION.length];
}

/** 60 → 'w-l60', 1 → 'w1' */
export const designCode = (n) => (WL.has(+n) ? 'w-l' : 'w') + (+n);

/** 60 → 'w-l60.html' */
export const designPage = (n) => designCode(n) + '.html';

/** 'w-l60.html', 'w60', 'p60' … → 60 (or NaN) */
export const designNumber = (s) => +(/(?:^|\/)(?:w-l|w|p)(\d+)/i.exec(String(s)) || [])[1];
