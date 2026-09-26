# Tools — the Colourist data pipeline

The Colourist gives colour advice from data, never from guesswork. These
scripts build that data. Run them in this order; each depends on the one above.

| # | Command | Writes | Re-run when |
|---|---|---|---|
| 1 | `node tools/extract_palettes.mjs` | `data/palettes.json` | the palettes in `skinprofile.html` are edited |
| 2 | `python3 tools/build_fabric_colors.py` | `data/fabric-color.json` | a swatch image is added or replaced |
| 3 | `node tools/fabric_gap_report.mjs` | `data/fabric-gap.json` | after step 2, or before a fabric-buying decision |
| — | `node tools/test_color.mjs` | — | after touching `js/colourist/color.js` |
| — | `node tools/build_palette_study.mjs` | `skin-palette-compare.html`, `data/palettes-v2.json` | the second-edition palettes in `tools/palettes_v2.mjs` are edited |

## What each one is for

**1 · extract_palettes** — `skinprofile.html` holds the twelve curated palettes
inline so the page needs no fetch. That inline copy stays the single source of
truth; this lifts it into JSON for everything else to read. It fails loudly if a
palette is missing a tier or does not have five colours.

**2 · build_fabric_colors** — measures what colour each swatch image actually
is, in CIE L\*a\*b\*, so palette colours can be matched to real cloth. Patterned
fabrics keep up to three clusters. Swatch images that are not on disk yet are
reported, not treated as errors — the fabric range is still being bought.

Swatches added through the admin dashboard live in Firebase rather than in
`js/fabrics.js`. Export them as `[{id,label,image}]` and pass the file:

```
python3 tools/build_fabric_colors.py --extras firebase-extras.json
```

**3 · fabric_gap_report** — the buying instrument. Measures the palettes against
the fabric actually held and answers two questions: which of the twelve skin
profiles can the House dress today, and which single fabric colour would do the
most good next. Its output is rendered in the admin dashboard under **Colour**.

## Reading a ΔE00 number

Distances throughout are CIEDE2000, verified against the Sharma reference
vectors by `tools/test_color.mjs`:

```
 < 2   indistinguishable      5–10  the same family
 2–5   a shade apart         10–20  a customer would call them different
                              > 20  a different colour
```

The Colourist offers a fabric up to ΔE 26 but always says which it is — "an
exact match", "a shade away", "a related tone" — so the customer can judge.
