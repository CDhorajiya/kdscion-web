/** Verifies deltaE2000 against the Sharma et al. CIEDE2000 reference vectors. */
import { deltaE2000, hexToLab } from '../js/colourist/color.js';

const CASES = [
  [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
  [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
  [[50, 2.8361, -74.0200], [50, 0, -82.7485], 3.4412],
  [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0000],
  [[50, -1.1848, -84.8006], [50, 0, -82.7485], 1.0000],
  [[50, -0.9009, -85.5211], [50, 0, -82.7485], 1.0000],
  [[50, 0, 0], [50, -1, 2], 2.3669],
  [[50, -1, 2], [50, 0, 0], 2.3669],
  [[50, 2.49, -0.001], [50, -2.49, 0.0009], 7.1792],
  [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[2.0776, 0.0795, -1.1350], [0.9033, -0.0636, -0.5514], 0.9082],
];

let bad = 0;
for (const [a, b, expected] of CASES) {
  const got = deltaE2000(a, b);
  const ok = Math.abs(got - expected) < 0.0005;
  if (!ok) { bad++; console.log(`  ✗ expected ${expected}, got ${got.toFixed(4)}`); }
}
console.log(bad === 0
  ? `✓ deltaE2000 matches all ${CASES.length} CIEDE2000 reference vectors`
  : `✗ ${bad}/${CASES.length} reference vectors failed`);

// Sanity on real palette colours
const sapphire = hexToLab('#0F52BA'), cobalt = hexToLab('#0047AB'), mustard = hexToLab('#D8A020');
console.log(`  Sapphire↔Cobalt  ΔE00 = ${deltaE2000(sapphire, cobalt).toFixed(1)}  (same colour, a shade apart)`);
console.log(`  Sapphire↔Mustard ΔE00 = ${deltaE2000(sapphire, mustard).toFixed(1)}  (unrelated)`);
process.exit(bad === 0 ? 0 : 1);
