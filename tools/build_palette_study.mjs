/**
 * tools/build_palette_study.mjs — old vs new palettes, measured side by side
 * ---------------------------------------------------------------------------
 * Reads the first-edition palettes (data/palettes-v1.json, a frozen copy of
 * what skinprofile.html shipped) and the second edition (tools/palettes_v2.mjs),
 * scores every colour against its skin reference with the same CIEDE2000 maths
 * the Colourist uses, and writes:
 *
 *   skin-palette-compare.html   the side-by-side study page
 *   data/palettes-v2.json       the second edition in the live palettes.json shape
 *
 *     node tools/build_palette_study.mjs
 *
 * It exits non-zero if the second edition breaks any of its own rules.
 */
import fs from 'fs';
import { hexToLab, deltaE2000 } from '../js/colourist/color.js';
import { NEW, SKIN_REF } from './palettes_v2.mjs';

const OLD = JSON.parse(fs.readFileSync('data/palettes-v1.json', 'utf8')).palettes;

const SKINS = ['fair-light', 'medium-olive', 'tan', 'dark-deep'];
const UNDERS = ['cool', 'warm', 'neutral'];
const SKIN_TITLE = {
  'fair-light': 'Fair / Light Skin', 'medium-olive': 'Medium / Olive Skin',
  'tan': 'Tan Skin', 'dark-deep': 'Dark / Deep Skin',
};

// ── The rules, in numbers ────────────────────────────────────────────────────
const SKIN_BLEND   = 10;  // ΔE00 below this: the cloth melts into the complexion
const SCREEN_NEON  = 65;  // C* above this: screen saturation, not dyed-cloth colour
const NEW_CHROMA   = 62;  // the second edition keeps a margin under that
const NEAR_COPY    = 8;   // ΔE00 below this: two "different" colours a shade apart
const isDarkGround  = (x) => x.L <= 36 && x.C <= 26;  // navy, charcoal, chocolate, black
const isLightGround = (x) => x.L >= 88 && x.C <= 15;  // white, ivory, ecru, cream

// ── Colour helpers ───────────────────────────────────────────────────────────
function info(hex) {
  const lab = hexToLab(hex);
  const [L, a, b] = lab;
  const C = Math.hypot(a, b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { hex: hex.toUpperCase(), lab, L, a, b, C, h };
}

// Temperature of a chromatic colour, read from its CIELAB hue angle.
// Blue-greens/teals (140–200°) and true reds (20–40°) are balanced; dark,
// low-chroma grounds count as neutral whatever their tint.
function temperature(x) {
  if (x.C < 10 || isDarkGround(x)) return 'neutral';
  if (x.h >= 40 && x.h < 140) return 'warm';
  if ((x.h >= 140 && x.h < 200) || (x.h >= 20 && x.h < 40)) return 'neutral';
  return 'cool';
}

// ── Normalise both editions to one shape ─────────────────────────────────────
function fromOld(p) {
  return {
    best: p.best.map((s) => ({ c: s.c.toUpperCase(), n: s.n })),
    acceptable: p.acceptable.map((s) => ({ c: s.c.toUpperCase(), n: s.n })),
    bestCombos: p.bestCombos.map((k) => ({ a: k.a.toUpperCase(), al: k.al, b: k.b.toUpperCase(), bl: k.bl })),
    haCombos: p.haCombos.map((k) => ({ a: k.a.toUpperCase(), al: k.al, b: k.b.toUpperCase(), bl: k.bl })),
  };
}
function fromNew(p, where) {
  const byName = {};
  for (const [c, n] of [...p.best, ...p.acceptable]) byName[n] = c.toUpperCase();
  const combo = ([al, bl]) => {
    if (!byName[al] || !byName[bl]) throw new Error(`${where}: combo ${al} · ${bl} names a colour not in the palette`);
    return { a: byName[al], al, b: byName[bl], bl };
  };
  return {
    best: p.best.map(([c, n]) => ({ c: c.toUpperCase(), n })),
    acceptable: p.acceptable.map(([c, n]) => ({ c: c.toUpperCase(), n })),
    bestCombos: p.bestCombos.map(combo),
    haCombos: p.haCombos.map(combo),
  };
}

// ── Score one palette ────────────────────────────────────────────────────────
function score(p, skinHex, under) {
  const skin = hexToLab(skinHex);
  const singles = [...p.best, ...p.acceptable];
  const inPalette = new Set(singles.map((s) => s.c));

  // every colour the client is shown: singles and both halves of every combo
  const shown = new Map();
  for (const s of singles) shown.set(s.c, s.n);
  for (const k of [...p.bestCombos, ...p.haCombos]) {
    if (!shown.has(k.a)) shown.set(k.a, k.al);
    if (!shown.has(k.b)) shown.set(k.b, k.bl);
  }

  const flags = {};          // hex → [{kind, text}]
  const add = (hex, kind, text) => (flags[hex] ||= []).push({ kind, text });

  const counts = { blend: 0, neon: 0, offTone: 0, nearCopy: 0, foreign: 0 };
  for (const [hex] of shown) {
    const x = info(hex);
    const dE = deltaE2000(skin, x.lab);
    if (dE < SKIN_BLEND) { counts.blend++; add(hex, 'blend', `melts into skin · ΔE ${dE.toFixed(1)}`); }
    if (x.C > SCREEN_NEON) { counts.neon++; add(hex, 'neon', `screen-neon · C* ${x.C.toFixed(0)}`); }
    const t = temperature(x);
    if ((under === 'cool' && t === 'warm') || (under === 'warm' && t === 'cool')) {
      counts.offTone++; add(hex, 'tone', `off-undertone (${t})`);
    }
  }
  for (let i = 0; i < singles.length; i++) {
    for (let j = i + 1; j < singles.length; j++) {
      const d = deltaE2000(hexToLab(singles[i].c), hexToLab(singles[j].c));
      if (d < NEAR_COPY) {
        counts.nearCopy++;
        add(singles[j].c, 'copy', `near-copy of ${singles[i].n} · ΔE ${d.toFixed(1)}`);
      }
    }
  }
  const foreignSlots = [];
  for (const k of [...p.bestCombos, ...p.haCombos]) {
    for (const [hex, name] of [[k.a, k.al], [k.b, k.bl]]) {
      if (!inPalette.has(hex)) { counts.foreign++; foreignSlots.push(`${name} ${hex}`); }
    }
  }
  const infos = singles.map((s) => info(s.c));
  const hasLight = infos.some(isLightGround);
  const hasDark = infos.some(isDarkGround);
  const maxC = Math.max(...[...shown.keys()].map((h) => info(h).C));
  const minSkin = Math.min(...[...shown.keys()].map((h) => deltaE2000(skin, hexToLab(h))));

  return { counts, flags, inPalette, hasLight, hasDark, maxC, minSkin, shownCount: shown.size, foreignSlots };
}

// ── The thinking behind each palette ─────────────────────────────────────────
const WHY = {
  'fair-light': {
    cool: {
      season: 'Light Summer',
      read: 'Light skin with pink or blue undertones and little contrast between skin, hair and eyes. Strong black and hard primaries overpower it; golden colours turn it sallow.',
      heroes: 'Powder Blue, Rose Quartz and Heather Lilac are pastels with grey in them, the way they come out of silk crepe de chine and fine cotton voile. Mulberry is the one deep accent: a blue-red that keeps the cheeks rosy. Slate Navy replaces black as the dark colour.',
      grounds: 'Chalk White, not optic white. Dove Grey and Pewter for suiting. Eucalyptus adds a cool green, which the old palette did not have.',
    },
    warm: {
      season: 'Light Spring',
      read: 'Light, golden, clear. It wants warmth and freshness, but at a light-to-medium weight. Dusty or icy colours make it look tired.',
      heroes: 'Soft Coral and Apricot are the classic spring warms. Lagoon is a warm aqua, a blue-green that does not chill the skin. Camel is the most enduring warm colour in wool and cashmere. Primrose is a buttery yellow for summer linen and silk.',
      grounds: 'Ivory, never stark white. Marine Navy gives the wardrobe a tailoring colour that the old palette lacked completely. Toffee, Pistachio and Warm Stone are soft bridges.',
    },
    neutral: {
      season: 'Soft Summer',
      read: 'Light and balanced, neither pink nor golden. Muted, slightly greyed colours look expensive on it; loud colour wears the person.',
      heroes: 'Dusty Rose, Sage, Soft Teal, Rosewood and Chambray are the quiet mid-tones found in fine wool jersey, washed silk and cotton shirting.',
      grounds: 'Porcelain, Greige and Mushroom are the classic light-neutral trio. Ink Navy is the dark colour. Dusk Lilac is the soft accent.',
    },
  },
  'medium-olive': {
    cool: {
      season: 'Cool Summer → True Winter',
      read: 'Medium depth with a cool, often slightly green-grey cast. Yellow-based colours make olive skin look ashy. Clear, cool jewels at medium depth bring it to life.',
      heroes: 'Emerald, Sapphire, Aubergine, Raspberry and Petrol are the jewel tones of silk and fine suiting, pitched at medium depth rather than neon.',
      grounds: 'Soft White, Cool Grey and Charcoal are the grounds. Orchid Mist and Steel Blue are the lighter partners.',
    },
    warm: {
      season: 'True Autumn',
      read: 'Golden olive skin at medium depth. This is heritage-cloth territory: tweed, cotton drill, block print and suede.',
      heroes: 'Olive, Terracotta, Deep Teal, Cognac and Antique Mustard. Mustard is deliberately taken deeper than a bright ochre, which sits right on the skin and disappears.',
      grounds: 'Ecru, Khaki, Chocolate, Bottle Green and Oxblood are classic country-and-leather colours that anchor a full wardrobe.',
    },
    neutral: {
      season: 'Soft Autumn',
      read: 'Medium depth, balanced undertone, gentle contrast. Softened mid-tones flatter it; sand and beige blend straight into it.',
      heroes: 'Muted Teal, Rose Clay, Forest, Denim and Garnet each have a clear hue identity at a controlled chroma.',
      grounds: 'Parchment, Stone and Taupe are the light neutrals. Espresso is the dark colour. Sage is the soft green.',
    },
  },
  'tan': {
    cool: {
      season: 'True Winter',
      read: 'Deep-medium skin with a cool base. It holds high contrast and saturated cool colour; muddy or golden shades flatten it.',
      heroes: 'Cobalt, Fuchsia, Royal Purple, Bordeaux and Pine. These are the saturated classics of silk and satin, held to colours cloth can actually carry.',
      grounds: 'Optic White gives crisp contrast at this depth. Charcoal and Midnight Navy are for tailoring. Silver Grey and Icy Mint are the light accents.',
    },
    warm: {
      season: 'Warm Autumn',
      read: 'Golden-bronze skin with depth. Spice colours and warm teals make it glow; icy pastels grey it out.',
      heroes: 'Burnt Orange, Paprika, Marigold, Warm Teal and Olive Drab are spice-market colours, and native territory for cotton, silk and raw silk.',
      grounds: 'Cream, Chocolate, Tobacco, Khaki and Apricot Cream. Bronze was removed because it matched the skin almost exactly.',
    },
    neutral: {
      season: 'Deep Autumn, softened',
      read: 'Tan, balanced undertone. It needs colours with depth and a slightly muted finish. Pale pastels wash it out; neon overwhelms it.',
      heroes: 'Deep Teal, Burnt Rose, Moss, Slate Blue and Amber. Amber is a burnished gold, not a highlighter yellow.',
      grounds: 'Ivory, Stone Grey, Mocha and Navy give it a working wardrobe. Soft Coral is the light warm accent.',
    },
  },
  'dark-deep': {
    cool: {
      season: 'Bright / Deep Winter',
      read: 'Deep skin with a cool, blue or red-violet base. It wears the highest contrast of all twelve profiles: jewel colour, pure white, black.',
      heroes: 'Cobalt, Fuchsia, Emerald, Royal Violet and Cherry Red. These are the most saturated colours in the whole system, but still dye-realistic rather than neon.',
      grounds: 'Optic White and Jet Black form the ultimate contrast pair. Silver, Ice Blue and Icy Lilac are cool lights that glow against deep skin.',
    },
    warm: {
      season: 'Deep Autumn',
      read: 'Deep golden or red-brown skin. Rich warm colours and metallic-feeling golds are superb; dark browns sit on the skin and vanish.',
      heroes: 'Saffron, Copper, Brick Red, Peacock and Olive are warm, rich and at home in silk, brocade and heavy cotton.',
      grounds: 'Cream, Camel and Khaki are the light grounds. Forest replaces dark brown as the dark colour because it contrasts with the skin rather than matching it. Terracotta is the bridge.',
    },
    neutral: {
      season: 'Deep Winter, warm-leaning',
      read: 'Deep skin, balanced undertone. It carries clear jewel colour and crisp lights; a strong colour needs a clean partner.',
      heroes: 'Ruby, Teal, Antique Gold, Ultramarine and Berry: a complete jewel wardrobe of red, green, gold, blue and pink.',
      grounds: 'Optic White, Dove Grey and Sand are the lights. Midnight Navy is the dark colour, which the old palette did not have. Blush Rose is the soft accent.',
    },
  },
};

// ── Build the data ───────────────────────────────────────────────────────────
const rows = [];
const v2json = { skinTypes: SKINS, undertones: UNDERS, palettes: {} };
const ruleBreaks = [];

for (const skin of SKINS) {
  v2json.palettes[skin] = {};
  for (const under of UNDERS) {
    const where = `${skin}/${under}`;
    const oldP = fromOld(OLD[skin][under]);
    const newP = fromNew(NEW[skin][under], where);
    const skinHex = SKIN_REF[skin][under];
    const so = score(oldP, skinHex, under);
    const sn = score(newP, skinHex, under);

    // the second edition must keep its own promises
    const c = sn.counts;
    if (c.blend || c.neon || c.offTone || c.nearCopy || c.foreign) ruleBreaks.push(`${where}: ${JSON.stringify(c)}`);
    if (!sn.hasLight || !sn.hasDark) ruleBreaks.push(`${where}: missing a ${sn.hasLight ? 'dark' : 'light'} ground`);
    if (sn.maxC > NEW_CHROMA) ruleBreaks.push(`${where}: chroma ${sn.maxC.toFixed(0)} > ${NEW_CHROMA}`);
    for (const t of ['best', 'acceptable', 'bestCombos', 'haCombos']) {
      if (newP[t].length !== 5) ruleBreaks.push(`${where}: ${t} has ${newP[t].length}`);
    }

    v2json.palettes[skin][under] = {
      title: SKIN_TITLE[skin], under: `${under.toUpperCase()} UNDERTONE`, ...newP,
    };
    rows.push({ skin, under, skinHex, oldP, newP, so, sn, why: WHY[skin][under] });
  }
}

if (ruleBreaks.length) {
  console.error('Second edition breaks its own rules:\n  ' + ruleBreaks.join('\n  '));
  process.exit(1);
}

// ── Totals for the scorecard ─────────────────────────────────────────────────
const total = (ed, key) => rows.reduce((n, r) => n + r[ed].counts[key], 0);
const totalIf = (ed, pred) => rows.filter((r) => pred(r[ed])).length;
const card = [
  ['Colours that melt into the skin they are meant for', `ΔE00 below ${SKIN_BLEND} from the skin reference: the garment reads as nude and the face loses definition`, total('so', 'blend'), total('sn', 'blend')],
  ['Screen-neon colours', `chroma C* above ${SCREEN_NEON}: highlighter-bright on a monitor, hard to dye and match consistently on natural fibre`, total('so', 'neon'), total('sn', 'neon')],
  ['Near-copies inside one palette', `two named colours within ΔE00 ${NEAR_COPY} of each other: one slot wasted`, total('so', 'nearCopy'), total('sn', 'nearCopy')],
  ['Combination colours not in the palette', 'a pairing uses a colour the client was never given as a single', total('so', 'foreign'), total('sn', 'foreign')],
  ['Palettes without a dark ground', 'no navy, charcoal, chocolate or black-level colour: no suit, trouser or coat colour', totalIf('so', (s) => !s.hasDark), totalIf('sn', (s) => !s.hasDark)],
  ['Palettes without a light ground', 'no white, ivory, ecru or cream for shirting and linings', totalIf('so', (s) => !s.hasLight), totalIf('sn', (s) => !s.hasLight)],
  ['Off-undertone colours', 'golden colours in a cool palette, or icy colours in a warm one', total('so', 'offTone'), total('sn', 'offTone')],
];

// ── HTML ─────────────────────────────────────────────────────────────────────
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textOn = (hex) => (info(hex).L > 60 ? '#1a1a1a' : '#f4f1ea');

function flagPills(hex, s) {
  const f = s.flags[hex];
  return f ? `<span class="pills">${f.map((x) => `<span class="pill pill-${x.kind}">${esc(x.text)}</span>`).join('')}</span>` : '';
}

function singles(list, s) {
  return `<div class="singles">${list.map((x) => `
      <div class="sw${s.flags[x.c] ? ' flagged' : ''}">
        <div class="sw-box" style="background:${x.c}"></div>
        <span class="sw-name">${esc(x.n)}</span>
        <span class="sw-hex">${x.c}</span>
        ${flagPills(x.c, s)}
      </div>`).join('')}
    </div>`;
}

function combos(list, s) {
  return `<div class="combos">${list.map((k) => {
    const out = (h) => (s.inPalette.has(h) ? '' : ' outside');
    const extra = [k.a, k.b].filter((h) => !s.inPalette.has(h)).length;
    const own = [...(s.flags[k.a] || []), ...(s.flags[k.b] || [])];
    const pills = [
      ...(extra ? [`<span class="pill pill-foreign">${extra === 2 ? 'both colours' : 'a colour'} not in palette</span>`] : []),
      ...own.filter((x) => x.kind !== 'copy').map((x) => `<span class="pill pill-${x.kind}">${esc(x.text)}</span>`),
    ];
    return `
      <div class="cb${pills.length ? ' flagged' : ''}">
        <div class="cb-box"><div class="cb-half${out(k.a)}" style="background:${k.a}"></div><div class="cb-half${out(k.b)}" style="background:${k.b}"></div></div>
        <span class="sw-name">${esc(k.al)} · ${esc(k.bl)}</span>
        <span class="sw-hex">${k.a} · ${k.b}</span>
        ${pills.length ? `<span class="pills">${pills.join('')}</span>` : ''}
      </div>`;
  }).join('')}
    </div>`;
}

// "Drape test": each colour as a square of cloth with the skin reference laid
// over it, as a colourist holds fabric under a client's chin.
function drape(list, skinHex) {
  return `<div class="drape">${list.map((x) => `
      <div class="dr" style="background:${x.c}" title="${esc(x.n)}"><span class="dr-face" style="background:${skinHex}"></span></div>`).join('')}
    </div>`;
}

function panel(label, p, s, skinHex, isNew) {
  const n = s.counts;
  const issues = n.blend + n.neon + n.nearCopy + n.foreign + n.offTone + (s.hasDark ? 0 : 1) + (s.hasLight ? 0 : 1);
  return `
    <div class="panel ${isNew ? 'panel-new' : 'panel-old'}">
      <div class="panel-head">
        <span class="panel-label">${label}</span>
        <span class="panel-score ${issues ? 'bad' : 'good'}">${issues ? `${issues} issue${issues > 1 ? 's' : ''} found` : 'passes every test'}</span>
      </div>
      <p class="tier"><span class="dot dot-best"></span>Best · single colours</p>
      ${singles(p.best, s)}
      <p class="tier"><span class="dot dot-ha"></span>Highly acceptable · single colours</p>
      ${singles(p.acceptable, s)}
      <p class="tier"><span class="dot dot-best"></span>Best · combinations</p>
      ${combos(p.bestCombos, s)}
      <p class="tier"><span class="dot dot-ha"></span>Highly acceptable · combinations</p>
      ${combos(p.haCombos, s)}
      <p class="tier">Drape test · all ten colours under the skin reference</p>
      ${drape([...p.best, ...p.acceptable], skinHex)}
      <ul class="facts">
        <li><span>Closest any colour gets to the skin</span><b>ΔE ${s.minSkin.toFixed(1)}</b></li>
        <li><span>Highest chroma shown</span><b>C* ${s.maxC.toFixed(0)}</b></li>
        <li><span>Light ground · dark ground</span><b>${s.hasLight ? 'yes' : 'no'} · ${s.hasDark ? 'yes' : 'no'}</b></li>
        <li><span>Distinct colours shown to the client</span><b>${s.shownCount}</b></li>
      </ul>
    </div>`;
}

function fixedList(r) {
  const out = [];
  const o = r.so;
  const byKind = (k) => Object.entries(o.flags).flatMap(([hex, fs]) => fs.filter((f) => f.kind === k).map((f) => ({ hex, f })));
  const nameOf = (hex) => {
    for (const s of [...r.oldP.best, ...r.oldP.acceptable]) if (s.c === hex) return s.n;
    for (const k of [...r.oldP.bestCombos, ...r.oldP.haCombos]) { if (k.a === hex) return k.al; if (k.b === hex) return k.bl; }
    return hex;
  };
  const blend = byKind('blend');
  if (blend.length) out.push(`<b>Blended into the skin:</b> ${blend.map(({ hex, f }) => `${esc(nameOf(hex))} (${f.text.split('· ')[1]})`).join(', ')}.`);
  const neon = byKind('neon');
  if (neon.length) out.push(`<b>Screen-neon:</b> ${neon.map(({ hex, f }) => `${esc(nameOf(hex))} ${hex} (${f.text.split('· ')[1]})`).join(', ')}.`);
  const copy = byKind('copy');
  if (copy.length) out.push(`<b>Near-copies:</b> ${copy.map(({ hex, f }) => `${esc(nameOf(hex))} is a ${esc(f.text)}`).join('; ')}.`);
  if (o.counts.foreign) out.push(`<b>${o.counts.foreign} of 20 combination slots</b> used colours the palette never offered.`);
  if (!o.hasDark) out.push('<b>No dark ground:</b> nothing to cut a suit, trouser or coat in.');
  if (!o.hasLight) out.push('<b>No light ground</b> for shirting and linings.');
  return out.length ? out : ['No measurable faults. The changes here are about naming and fabric realism.'];
}

function section(r) {
  const id = `${r.skin}-${r.under}`;
  return `
  <section class="study" id="${id}">
    <header class="study-head">
      <span class="skin-disc" style="background:${r.skinHex}"></span>
      <div>
        <h2>${SKIN_TITLE[r.skin]} <em>· ${r.under} undertone</em></h2>
        <p class="season">Closest seasonal family: ${esc(r.why.season)} · skin reference ${r.skinHex}</p>
      </div>
    </header>
    <div class="why">
      <div class="why-col">
        <h3>Reading the client</h3>
        <p>${esc(r.why.read)}</p>
        <h3>The hero colours</h3>
        <p>${esc(r.why.heroes)}</p>
        <h3>The grounds</h3>
        <p>${esc(r.why.grounds)}</p>
      </div>
      <div class="why-col fixed">
        <h3>What was wrong with the first edition</h3>
        <ul>${fixedList(r).map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>
    </div>
    <div class="panels">
      ${panel('First edition · retired', r.oldP, r.so, r.skinHex, false)}
      ${panel('Second edition · live', r.newP, r.sn, r.skinHex, true)}
    </div>
  </section>`;
}

const nav = SKINS.map((skin) => `
      <div class="nav-group"><span class="nav-skin">${SKIN_TITLE[skin]}</span>${UNDERS.map((u) => {
        const r = rows.find((x) => x.skin === skin && x.under === u);
        return `<a href="#${skin}-${u}"><span class="nav-dot" style="background:${r.skinHex}"></span>${u}</a>`;
      }).join('')}</div>`).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Twelve Palettes · Second Edition — The House of Scion</title>
<meta name="robots" content="noindex">
<!-- Generated by tools/build_palette_study.mjs — edit tools/palettes_v2.mjs and re-run. -->
<style>
  :root {
    --bg: #0c0b0a; --panel: rgba(255,255,255,0.045); --line: rgba(255,255,255,0.11);
    --text: rgba(255,255,255,0.88); --muted: rgba(255,255,255,0.58); --gold: #E6CC96;
    --bad: #E58A7A; --good: #9CC9A0;
  }
  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { margin: 0; background: var(--bg); color: var(--text); font-family: "Times New Roman", Times, serif; font-size: 18px; line-height: 1.6; }
  a { color: inherit; }
  .wrap { max-width: 1380px; margin: 0 auto; padding: 0 28px; }

  .hero { padding: 72px 0 40px; border-bottom: 1px solid var(--line); }
  .eyebrow { letter-spacing: 5px; text-transform: uppercase; color: var(--gold); font-size: 1rem; margin: 0 0 14px; }
  h1 { font-weight: 400; font-size: clamp(2rem, 4.4vw, 3.3rem); letter-spacing: 4px; text-transform: uppercase; margin: 0 0 18px; line-height: 1.15; }
  .lede { max-width: 900px; font-size: 1.2rem; color: var(--muted); margin: 0; }

  h2.block { font-weight: 400; letter-spacing: 4px; text-transform: uppercase; font-size: 1.35rem; color: var(--gold); margin: 56px 0 20px; }

  table.score { width: 100%; border-collapse: collapse; }
  .score th, .score td { text-align: left; padding: 14px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .score th { font-weight: 400; letter-spacing: 3px; text-transform: uppercase; font-size: 1rem; color: var(--muted); }
  .score td.n { font-size: 1.6rem; text-align: center; width: 130px; font-variant-numeric: tabular-nums; }
  .score td.n.bad { color: var(--bad); } .score td.n.good { color: var(--good); }
  .score .what { display: block; color: var(--muted); font-size: 1rem; }

  .principles { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 16px; }
  .pr { background: var(--panel); border: 1px solid var(--line); padding: 22px 22px 18px; }
  .pr h3 { margin: 0 0 8px; font-weight: 400; font-size: 1.15rem; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
  .pr p { margin: 0; color: var(--muted); font-size: 1.05rem; }

  nav.jump { position: sticky; top: 0; z-index: 5; background: rgba(12,11,10,0.94); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); margin-top: 56px; }
  nav.jump .wrap { display: flex; flex-wrap: wrap; gap: 8px 26px; padding-top: 12px; padding-bottom: 12px; }
  .nav-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .nav-skin { letter-spacing: 2px; text-transform: uppercase; color: var(--muted); font-size: 1rem; }
  .nav-group a { text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--line); border-radius: 20px; font-size: 1rem; text-transform: capitalize; }
  .nav-group a:hover { border-color: var(--gold); }
  .nav-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; border: 1px solid rgba(255,255,255,0.3); }

  .study { padding: 64px 0 24px; border-bottom: 1px solid var(--line); scroll-margin-top: 70px; }
  .study-head { display: flex; align-items: center; gap: 20px; margin-bottom: 26px; }
  .skin-disc { width: 64px; height: 64px; border-radius: 50%; flex: none; border: 1px solid rgba(255,255,255,0.25); box-shadow: 0 0 40px rgba(0,0,0,0.5); }
  .study h2 { margin: 0; font-weight: 400; font-size: clamp(1.4rem, 2.6vw, 2rem); letter-spacing: 3px; text-transform: uppercase; }
  .study h2 em { font-style: normal; color: var(--gold); }
  .season { margin: 4px 0 0; color: var(--muted); font-size: 1.05rem; letter-spacing: 1px; }

  .why { display: grid; grid-template-columns: 1.25fr 1fr; gap: 20px; margin-bottom: 26px; }
  .why-col { background: var(--panel); border: 1px solid var(--line); padding: 22px 24px; }
  .why h3 { margin: 16px 0 4px; font-weight: 400; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; color: var(--gold); }
  .why h3:first-child { margin-top: 0; }
  .why p { margin: 0; font-size: 1.08rem; }
  .why .fixed h3 { color: var(--bad); }
  .why ul { margin: 6px 0 0; padding-left: 1.1em; }
  .why li { margin-bottom: 8px; font-size: 1.05rem; }
  .why li b { font-weight: 700; }

  .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .panel { border: 1px solid var(--line); padding: 20px 20px 16px; background: var(--panel); min-width: 0; }
  .panel-new { border-color: rgba(230,204,150,0.45); background: rgba(230,204,150,0.045); }
  .panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 6px; }
  .panel-label { letter-spacing: 3px; text-transform: uppercase; font-size: 1.05rem; }
  .panel-new .panel-label { color: var(--gold); }
  .panel-score { font-size: 1rem; letter-spacing: 1px; }
  .panel-score.bad { color: var(--bad); } .panel-score.good { color: var(--good); }

  .tier { display: flex; align-items: center; gap: 8px; margin: 18px 0 10px; letter-spacing: 2px; text-transform: uppercase; font-size: 1rem; color: var(--muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .dot-best { background: var(--gold); } .dot-ha { background: rgba(255,255,255,0.45); }

  .singles, .combos { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px 10px; }
  .sw, .cb { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .sw-box { aspect-ratio: 1 / 1; border: 1px solid rgba(255,255,255,0.14); }
  .cb-box { aspect-ratio: 1 / 1; display: grid; grid-template-columns: 1fr 1fr; border: 1px solid rgba(255,255,255,0.14); }
  .cb-half.outside { outline: 2px dashed var(--bad); outline-offset: -4px; }
  .sw-name { font-size: 1rem; line-height: 1.25; margin-top: 4px; overflow-wrap: anywhere; }
  .sw-hex { font-size: 0.95rem; color: var(--muted); font-family: ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
  .flagged .sw-box, .flagged .cb-box { box-shadow: 0 0 0 2px var(--bad); }
  .pills { display: flex; flex-direction: column; gap: 3px; margin-top: 3px; }
  .pill { font-size: 0.95rem; line-height: 1.25; color: var(--bad); }
  .pill::before { content: '▲ '; font-size: 0.7em; vertical-align: 2px; }

  .drape { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 6px; }
  .dr { aspect-ratio: 1 / 1; display: grid; place-items: center; border: 1px solid rgba(255,255,255,0.12); }
  .dr-face { width: 52%; aspect-ratio: 1 / 1; border-radius: 50%; }

  .facts { list-style: none; margin: 18px 0 0; padding: 12px 0 0; border-top: 1px solid var(--line); display: grid; grid-template-columns: 1fr 1fr; gap: 6px 18px; }
  .facts li { display: flex; justify-content: space-between; gap: 10px; font-size: 1rem; color: var(--muted); }
  .facts b { color: var(--text); font-weight: 400; white-space: nowrap; }

  .note { color: var(--muted); font-size: 1.05rem; max-width: 1000px; }
  footer { padding: 48px 0 80px; color: var(--muted); font-size: 1rem; }

  @media (max-width: 1100px) {
    .panels, .why { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    body { font-size: 17px; }
    .wrap { padding: 0 16px; }
    .hero { padding-top: 48px; }
    .singles, .combos { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .drape { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    .facts { grid-template-columns: 1fr; }
    .score td.n { width: 64px; font-size: 1.3rem; }
    .score th, .score td { padding: 10px 6px; }
    nav.jump { position: static; }
  }
</style>
</head>
<body>

<div class="wrap">
  <header class="hero">
    <p class="eyebrow">The House of Scion · Colour Study</p>
    <h1>The Twelve Palettes<br>Second Edition</h1>
    <p class="lede">The same system as before: four skin depths, three undertones, five best colours, five highly acceptable colours and ten combinations for each profile. It is rebuilt from the classic colours of tailoring and couture cloth, and every colour is measured against the complexion it is meant to flatter. The second edition is now live on the Skin Profile page. Below, each first-edition palette sits beside its replacement, with the reasoning and the measurements.</p>
  </header>

  <h2 class="block">Scorecard · all twelve palettes</h2>
  <table class="score">
    <thead><tr><th>Test</th><th style="text-align:center">First edition</th><th style="text-align:center">Second edition</th></tr></thead>
    <tbody>
      ${card.map(([t, w, o, n]) => `<tr><td>${esc(t)}<span class="what">${esc(w)}</span></td><td class="n ${o ? 'bad' : 'good'}">${o}</td><td class="n ${n ? 'bad' : 'good'}">${n}</td></tr>`).join('\n      ')}
    </tbody>
  </table>

  <h2 class="block">How the new palettes were built</h2>
  <div class="principles">
    <div class="pr"><h3>1 · Seasonal colour analysis</h3><p>Each of the twelve profiles is mapped to its closest family in the twelve-season method used by professional image consultants. Skin depth sets how light or dark the colours are and how much contrast they carry. Undertone sets whether they lean warm or cool. How clear or muted the skin is sets how clean or greyed the colours are.</p></div>
    <div class="pr"><h3>2 · Timeless fabric colours</h3><p>Every colour is one with a long life in cloth: navy, charcoal, camel, ecru, cognac, oxblood, bottle green, bordeaux, emerald, sapphire, saffron. Each is named the way a mill, tailor or atelier would name it, so it can be sourced and re-ordered season after season.</p></div>
    <div class="pr"><h3>3 · Heroes and grounds</h3><p>Best colours are the heroes, worn close to the face. Highly acceptable colours are the grounds a wardrobe is built on. Every palette now has a light ground (white, ivory, ecru or cream) and a dark ground (navy, charcoal, chocolate, black or forest), so a suit, a shirt and a coat can all be cut from one palette.</p></div>
    <div class="pr"><h3>4 · Measured against the skin</h3><p>Every colour is checked with CIEDE2000, the same maths the Colourist uses to match fabric. No colour sits within ΔE ${SKIN_BLEND} of its skin reference. Closer than that and the garment melts into the complexion: the face loses definition and the outfit reads as nude.</p></div>
    <div class="pr"><h3>5 · Cloth-real saturation</h3><p>No colour goes above chroma C* ${NEW_CHROMA}. The first edition used screen colours such as #FFD60A, #8020C8 and #2ECC71, which glow on a monitor but cannot be dyed consistently on cotton, silk or wool, and which look costume-like in cloth.</p></div>
    <div class="pr"><h3>6 · Combinations from the palette</h3><p>Every pairing uses only that palette's own ten colours. The client is never shown a combination built from a colour they were not given, and the Colourist can match every half of every combination to real fabric.</p></div>
  </div>

  <p class="note" style="margin-top:22px">How to read the page: a red outline on a swatch means it fails at least one test, and the reason is written under it. A dashed outline on half of a combination means that colour is not in the palette. In the drape test, each colour is a square of cloth with the skin reference laid on it, the way a colourist holds fabric under a client's chin. Where the disc disappears into the cloth, the colour is too close to the skin.</p>
</div>

<nav class="jump" aria-label="Jump to a palette"><div class="wrap">${nav}
</div></nav>

<div class="wrap">
${rows.map(section).join('\n')}

  <footer>
    <p>Screen colours are a guide. Before a colour is bought as cloth, it should be confirmed against a physical lab dip or a TCX-standard reference under D65 daylight, since fibre, weave and finish all shift how a dye reads.</p>
    <p>Skin references are single representative tones for each profile, taken from the swatches on the Skin Profile page and shifted slightly pinker (cool) or more golden (warm). Real complexions vary within each profile.</p>
    <p>Generated by tools/build_palette_study.mjs from tools/palettes_v2.mjs (second edition) and data/palettes-v1.json (first edition, frozen).</p>
  </footer>
</div>
</body>
</html>
`;

fs.writeFileSync('skin-palette-compare.html', html);
fs.writeFileSync('data/palettes-v2.json', JSON.stringify({
  generated: new Date().toISOString(),
  source: 'tools/palettes_v2.mjs',
  note: 'Second edition. Generated by tools/build_palette_study.mjs — edit tools/palettes_v2.mjs, not this file.',
  ...v2json,
}, null, 2) + '\n');

console.log('Scorecard (first → second edition):');
for (const [t, , o, n] of card) console.log(`  ${t.padEnd(52)} ${String(o).padStart(3)} → ${n}`);
console.log('\nWrote skin-palette-compare.html and data/palettes-v2.json');
