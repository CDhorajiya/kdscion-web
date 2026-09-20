/**
 * tools/fabric_gap_report.mjs — what to buy next
 * ---------------------------------------------------------------------------
 * Measures the curated palettes against the fabrics actually held, and reports
 * which of the twelve skin profiles the House can currently dress.
 *
 * This is a *buying* instrument, not a selling one. Fabric bought by instinct
 * tends to cluster around the buyer's own taste; fabric bought against this
 * report is bought to serve customers the House cannot currently serve.
 *
 *   node tools/fabric_gap_report.mjs
 *   node tools/fabric_gap_report.mjs --json      (machine-readable only)
 *
 * Reads  data/palettes.json      (tools/extract_palettes.mjs)
 *        data/fabric-color.json  (tools/build_fabric_colors.py)
 * Writes data/fabric-gap.json    (read by the admin dashboard)
 */
import fs from 'fs';
import { hexToLab, deltaE2000, matchQuality } from '../js/colourist/color.js';

// A palette colour counts as SERVED when some held fabric is within this
// distance of it. ΔE00 16 is "a customer would still call it that colour";
// 8 is "a shade away". Anything beyond 16 is a different colour on the body.
const SERVED_STRONG = 8;
const SERVED_OK     = 16;
const CLUSTER_DIST  = 18;   // merges near-identical colours across palettes

const jsonOnly = process.argv.includes('--json');
const say = (...a) => { if (!jsonOnly) console.log(...a); };

const palettes = JSON.parse(fs.readFileSync('data/palettes.json', 'utf8'));
const fabrics  = JSON.parse(fs.readFileSync('data/fabric-color.json', 'utf8'));

const SKIN_LABEL = { 'fair-light':'Fair / Light', 'medium-olive':'Medium / Olive', 'tan':'Tan', 'dark-deep':'Dark / Deep' };

// ── Held fabrics, as LAB points ──────────────────────────────────────────────
const held = Object.entries(fabrics.colors).map(([id, rec]) => ({
  id, label: rec.label, hex: rec.dominant.hex, lab: rec.dominant.lab,
  family: rec.family, patterned: rec.patterned, image: rec.image,
}));
if (!held.length) say('No analysed swatches yet — run tools/build_fabric_colors.py first.\n');

const nearest = (lab) => held.reduce((best, f) => {
  const dE = deltaE2000(lab, f.lab);
  return !best || dE < best.dE ? { ...f, dE } : best;
}, null);

// ── Walk every palette ───────────────────────────────────────────────────────
const report = [];
for (const skin of palettes.skinTypes) {
  for (const under of palettes.undertones) {
    const p = palettes.palettes[skin][under];
    const colours = [
      ...p.best.map(c => ({ ...c, tier: 'best' })),
      ...p.acceptable.map(c => ({ ...c, tier: 'acceptable' })),
    ].map(c => {
      const lab = hexToLab(c.c);
      const hit = nearest(lab);
      const status = !hit ? 'unserved'
        : hit.dE < SERVED_STRONG ? 'strong'
        : hit.dE < SERVED_OK     ? 'ok'
        : 'unserved';
      return { hex: c.c, name: c.n, tier: c.tier, status,
               nearestDE: hit ? +hit.dE.toFixed(1) : null,
               match: hit ? { id: hit.id, label: hit.label, hex: hit.hex,
                              image: hit.image, dE: +hit.dE.toFixed(1) } : null };
    });
    const best = colours.filter(c => c.tier === 'best');
    const acc  = colours.filter(c => c.tier === 'acceptable');
    const served = colours.filter(c => c.status !== 'unserved');
    report.push({
      skin, under, label: `${SKIN_LABEL[skin]} · ${under}`,
      bestServed:  best.filter(c => c.status !== 'unserved').length,
      bestTotal:   best.length,
      accServed:   acc.filter(c => c.status !== 'unserved').length,
      accTotal:    acc.length,
      strongest:   best.filter(c => c.status === 'strong').length,
      // Mean distance to the nearest held fabric across every colour that has
      // one — a single number for "how close is the House to this palette".
      meanDE: served.length
        ? +(served.reduce((t, c) => t + c.nearestDE, 0) / served.length).toFixed(1)
        : null,
      colours,
    });
  }
}

// ── Coverage ─────────────────────────────────────────────────────────────────
const dressable = report.filter(r => r.bestServed > 0).length;
const wellServed = report.filter(r => r.bestServed >= 2).length;

say('\n  FABRIC COVERAGE — can the House dress each skin profile?\n');
say('  profile                          best-tier colours held');
say('  ' + '─'.repeat(62));
for (const r of report) {
  const bar = '█'.repeat(r.bestServed) + '·'.repeat(r.bestTotal - r.bestServed);
  const note = r.bestServed === 0 ? '  ← cannot dress' : r.bestServed === 1 ? '  ← no real choice' : '';
  say(`  ${r.label.padEnd(30)} ${bar}  ${r.bestServed}/${r.bestTotal}${note}`);
}
say(`\n  ${dressable}/12 profiles have at least one of their best colours.`);
say(`  ${wellServed}/12 have a genuine choice (two or more).`);

// ── What to buy next ─────────────────────────────────────────────────────────
// Cluster every UNSERVED best-tier colour across all palettes, then rank by how
// many profiles a single purchase would newly serve.
const clusters = [];
for (const r of report) {
  for (const c of r.colours) {
    if (c.tier !== 'best' || c.status !== 'unserved') continue;
    const lab = hexToLab(c.hex);
    let hit = clusters.find(cl => deltaE2000(cl.lab, lab) < CLUSTER_DIST);
    if (!hit) { hit = { lab, hex: c.hex, names: new Set(), profiles: new Set() }; clusters.push(hit); }
    hit.names.add(c.name);
    hit.profiles.add(r.label);
  }
}
// Two different things matter when buying, and conflating them misleads:
//   newlyDressable — profiles that today have NO best-tier colour and would
//                    gain their first. This is the urgent number.
//   addsChoice     — profiles that can already be dressed but would gain
//                    another option. Real value, lower priority.
// Greedy: repeatedly take the colour that makes the most profiles dressable,
// breaking ties on how much choice it adds.
const undressed = new Set(report.filter(r => r.bestServed === 0).map(r => r.label));
const buy = [];
const pool = [...clusters];
while (pool.length) {
  let pick = null, pickGain = null;
  for (const c of pool) {
    const dressable  = [...c.profiles].filter(p => undressed.has(p));
    const addsChoice = [...c.profiles].filter(p => !undressed.has(p));
    const better = !pick
      || dressable.length > pickGain.dressable.length
      || (dressable.length === pickGain.dressable.length && addsChoice.length > pickGain.addsChoice.length);
    if (better) { pick = c; pickGain = { dressable, addsChoice }; }
  }
  if (!pick || (!pickGain.dressable.length && !pickGain.addsChoice.length)) break;
  pool.splice(pool.indexOf(pick), 1);
  pickGain.dressable.forEach(p => undressed.delete(p));
  buy.push({
    hex: pick.hex, names: [...pick.names],
    newlyDressable: pickGain.dressable.length,
    addsChoice: pickGain.addsChoice.length,
    serves: [...pick.profiles],
  });
}

say('\n  BUY NEXT — ordered by how many skin profiles each colour would');
say('  make dressable for the first time.\n');
if (!buy.length) {
  say('  Nothing outstanding: every profile\'s best tier is already covered.');
} else {
  say('  colour     name                                    dressable  adds choice');
  say('  ' + '─'.repeat(70));
  let cannot = report.filter(r => r.bestServed === 0).length;
  for (const b of buy.slice(0, 12)) {
    cannot -= b.newlyDressable;
    const flag = b.newlyDressable ? `+${b.newlyDressable} → ${12 - cannot}/12 dressable` : '·';
    say(`  ${b.hex}  ${b.names.join(' / ').slice(0, 38).padEnd(40)} ${String(flag).padEnd(22)} +${b.addsChoice}`);
  }
}

// ── Fabrics held that no palette wants ───────────────────────────────────────
const useful = new Set();
for (const r of report) for (const c of r.colours) if (c.match && c.status !== 'unserved') useful.add(c.match.id);
const idle = held.filter(f => !useful.has(f.id));
if (idle.length) {
  say('\n  HELD BUT UNMATCHED — no palette colour is within reach of these:');
  for (const f of idle) say(`  ${f.hex}  ${f.id.padEnd(16)} ${f.label}`);
}

fs.writeFileSync('data/fabric-gap.json', JSON.stringify({
  generated: new Date().toISOString(),
  thresholds: { strong: SERVED_STRONG, ok: SERVED_OK },
  summary: { profiles: 12, dressable, wellServed, heldSwatches: held.length },
  profiles: report,
  buyNext: buy,
  idle: idle.map(f => ({ id: f.id, hex: f.hex, label: f.label })),
}, null, 2));
say('\n  → data/fabric-gap.json written (read by the admin dashboard)\n');
if (jsonOnly) console.log(fs.readFileSync('data/fabric-gap.json', 'utf8'));
