/* design-details.js — a piece's chosen design details (lapel, cuff, pleats …),
   from the product page to the order.

   The product pages' detail windows (js/detail-studio.js, js/lapel-studio.js)
   keep each SKU's choices in localStorage under "kd.designDetails.<sku>":
       { lapel: 'peak', lapelName: 'Peak Lapel', cuff: 'french', cuffName: 'French Cuff', at: … }

   The backend's configurator only accepts the options it was set up with (an
   unknown option id is refused), but every order carries a free-text note. So
   at checkout composeNotes() adds a block to the customer's note, one line per
   piece that has details:

       — Design details —
       KD-P96-FSSBC · Lapel: Peak Lapel
       KD-P1-FSCS · Cuff: French Cuff

   and the admin dashboard reads it back with splitNotes(), showing each piece's
   details under that piece and the customer's own words as the note. */

export const MARK = '— Design details —';
const LABELS = { lapel: 'Lapel', cuff: 'Cuff', pleat: 'Pleats', fit: 'Made For' };
const KEY = (sku) => `kd.designDetails.${sku}`;

export function readDetails(sku) {
    try { return JSON.parse(localStorage.getItem(KEY(sku)) || '{}') || {}; } catch (e) { return {}; }
}

/** Records one detail of a SKU (called when it is chosen, and when the piece is added). */
export function saveDetail(sku, key, id, name) {
    try {
        localStorage.setItem(KEY(sku), JSON.stringify({ ...readDetails(sku), [key]: id, [`${key}Name`]: name, at: Date.now() }));
    } catch (e) { /* private mode: the choice simply isn't carried */ }
}

/** ['Lapel: Peak Lapel', 'Cuff: French Cuff'] for a SKU, in a fixed order. */
export function detailLines(sku) {
    const d = readDetails(sku);
    return Object.keys(LABELS).filter(k => d[`${k}Name`]).map(k => `${LABELS[k]}: ${d[`${k}Name`]}`);
}

/** The order note: the customer's words, then the design-details block for the cart's pieces. */
export function composeNotes(customerNote, skus) {
    const lines = [...new Set(skus.filter(Boolean))]
        .map(sku => [sku, detailLines(sku)])
        .filter(([, l]) => l.length)
        .map(([sku, l]) => `${sku} · ${l.join(' · ')}`);
    const note = (customerNote || '').trim();
    if (!lines.length) return note;
    return `${note}${note ? '\n\n' : ''}${MARK}\n${lines.join('\n')}`;
}

/** { customer: 'the customer's words', bySku: { 'KD-P96-FSSBC': ['Lapel: Peak Lapel'] } } */
export function splitNotes(notes) {
    const text = String(notes || '');
    const at = text.indexOf(MARK);
    if (at < 0) return { customer: text.trim(), bySku: {} };
    const bySku = {};
    text.slice(at + MARK.length).split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
        const [sku, ...parts] = line.split(' · ');
        if (sku && parts.length) bySku[sku.trim()] = parts.map(p => p.trim());
    });
    return { customer: text.slice(0, at).trim(), bySku };
}
