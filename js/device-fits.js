/* device-fits.js — the devices the L1 envelope cover is cut for.

   Drawn by tools/render_device_images.mjs into the images that
   js/device-studio.js shows (names and notes from DEVICES below). Each device
   is drawn at true scale from its size in millimetres (w × h, the smaller of
   its two sizes), so the three covers sit on the same board as they would on
   the cutting table. */

export const DEVICES = [
    { id: 'ipad', name: 'iPad', full: 'iPad', mood: 'Close & light',
      sizes: '11″ or 13″', model: 'iPad Pro 11″', w: 249.7, h: 177.5, d: 5.3,
      note: 'Cut close around the tablet, 11″ or 13″, so it sits snug rather than loose. Slim enough to carry under the arm from one room to the next.' },
    { id: 'air',  name: 'MacBook Air', full: 'MacBook Air', mood: 'Slim & effortless',
      sizes: '13″ or 15″', model: 'MacBook Air 13″', w: 304.1, h: 215, d: 11.3,
      note: 'A flatter envelope for the thinnest of the laptops, 13″ or 15″. The leather lies close to the aluminium and keeps the line of a document case.' },
    { id: 'pro',  name: 'MacBook Pro', full: 'MacBook Pro', mood: 'Structured & generous',
      sizes: '14″ or 16″', model: 'MacBook Pro 14″', w: 312.6, h: 221.2, d: 15.5,
      note: 'A deeper gusset and a little more room at the mouth for the heavier machine, 14″ or 16″. Firm leather that holds its shape when it is set down.' },
];
