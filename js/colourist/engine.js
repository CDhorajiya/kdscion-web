/**
 * ============================================================
 *  colourist/engine.js  —  palette → buyable fabric
 * ============================================================
 *
 *  The reasoning half of the Colourist. It holds no UI and makes no
 *  network calls of its own: given a client profile and the live
 *  catalogue, it returns what the House can offer that person, what
 *  it cannot, and the reason for each.
 *
 *  Everything it says is traceable to data:
 *    - which colours suit them  → the curated palettes (data/palettes.json,
 *      authored in skinprofile.html)
 *    - which fabrics are those colours → measured from the swatch images
 *      (data/fabric-color.json, built by tools/build_fabric_colors.py)
 *    - which of those can actually be bought → live stock and visibility
 *
 *  It never invents a fabric, never recommends one that is out of stock,
 *  and reports the colours it cannot serve rather than quietly dropping
 *  them — a gap shown honestly is a fabric worth buying (see the buy-next
 *  report in tools/fabric_gap_report.mjs).
 */

import { hexToLab, deltaE2000, matchQuality } from './color.js';

// Distance thresholds, in ΔE00. See color.js for how to read these.
const SHOW_LIMIT = 26;   // beyond this it is simply a different colour
const SERVED_OK  = 16;   // within this, a customer would call it that colour

/**
 * Fabrics a customer can actually choose right now.
 *
 * Mirrors visibleFabrics() in js/search-ui.js — deliberately duplicated
 * rather than imported, because importing that module would run its
 * init() and inject a second search button onto the page.
 */
export function purchasableFabrics(catalog, overrides, stockMap) {
  const vis = overrides?.visibility || {};
  const out = [];
  const seen = new Set();
  for (const type of catalog) {
    for (const coll of type.collections) {
      for (const s of coll.swatches) {
        if (seen.has(s.id)) continue;
        if ((vis[`s:${s.id}`] ?? true) === false) continue;   // hidden by the dashboard
        if (stockMap?.[s.id]?.inStock === false) continue;    // out of stock
        seen.add(s.id);
        out.push({
          id: s.id, label: s.label, image: s.image,
          typeId: type.id, typeLabel: type.label, collLabel: coll.label,
          drape: (overrides?.swatchDrape ?? {})[s.id] ?? s.drape ?? '',
        });
      }
    }
  }
  return out;
}

/** The twelve-palette lookup: who they are → which colours are theirs. */
export function paletteFor(palettes, skinType, undertone) {
  return palettes?.palettes?.[skinType]?.[undertone] || null;
}

/**
 * Rank the fabrics on hand against one palette colour.
 * Returns every fabric within SHOW_LIMIT, closest first.
 */
function rankAgainst(colourHex, fabrics, colorData) {
  const target = hexToLab(colourHex);
  const out = [];
  for (const f of fabrics) {
    const rec = colorData?.colors?.[f.id];
    if (!rec) continue;                       // swatch image not analysed yet
    const dE = deltaE2000(target, rec.dominant.lab);
    if (dE > SHOW_LIMIT) continue;
    out.push({ ...f, dE, hex: rec.dominant.hex, patterned: rec.patterned, quality: matchQuality(dE) });
  }
  return out.sort((a, b) => a.dE - b.dE);
}

/**
 * The whole recommendation for one person.
 *
 *   profile     { skinType, undertone }   from js/profile.js
 *   palettes    data/palettes.json
 *   colorData   data/fabric-color.json
 *   fabrics     purchasableFabrics(...)
 */
export function recommend({ profile, palettes, colorData, fabrics }) {
  const palette = paletteFor(palettes, profile.skinType, profile.undertone);
  if (!palette) return null;

  const consider = (list, tier) => list.map((c) => {
    const matches = rankAgainst(c.c, fabrics, colorData);
    const best = matches[0] || null;
    return {
      hex: c.c, name: c.n, tier,
      matches: matches.slice(0, 4),
      served: !!best && best.dE <= SERVED_OK,
      nearestDE: best ? +best.dE.toFixed(1) : null,
    };
  });

  const best       = consider(palette.best, 'best');
  const acceptable = consider(palette.acceptable, 'acceptable');
  const colours    = [...best, ...acceptable];

  // Flattened, ranked fabric recommendations. A fabric can suit more than one
  // palette colour; it is shown once, credited to its closest colour, and a
  // best-tier colour outranks an acceptable-tier one at equal distance.
  const byFabric = new Map();
  for (const c of colours) {
    for (const m of c.matches) {
      const weight = m.dE - (c.tier === 'best' ? 4 : 0);   // favour best-tier
      const prev = byFabric.get(m.id);
      if (!prev || weight < prev.weight) {
        byFabric.set(m.id, { ...m, weight, forColour: { hex: c.hex, name: c.name, tier: c.tier } });
      }
    }
  }
  const picks = [...byFabric.values()].sort((a, b) => a.weight - b.weight);

  // Two-tone pairings: the palette's curated colour pairs, resolved to real
  // fabrics. Only pairs where BOTH halves can be bought are offered.
  const pairs = [];
  for (const combo of palette.bestCombos) {
    const a = rankAgainst(combo.a, fabrics, colorData)[0];
    const b = rankAgainst(combo.b, fabrics, colorData)[0];
    if (!a || !b || a.id === b.id) continue;
    if (a.dE > SERVED_OK || b.dE > SERVED_OK) continue;
    pairs.push({
      a: { swatch: a, colour: { hex: combo.a, name: combo.al } },
      b: { swatch: b, colour: { hex: combo.b, name: combo.bl } },
      dE: +((a.dE + b.dE) / 2).toFixed(1),
    });
  }

  // Colours the House cannot serve. Shown, not hidden: it is the honest answer
  // and it is also the demand signal that tells the House what to buy.
  const gaps = colours.filter((c) => !c.served && c.tier === 'best');

  return { palette, colours, best, acceptable, picks, pairs, gaps,
           servedCount: best.filter((c) => c.served).length, bestTotal: best.length };
}
