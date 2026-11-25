// Theos Seitenscheidel - Trockne den Ozean aus: die Karte ohne three.js (Höhenfeld, Becken, Wassertiefe, Pumpenweg, Schatzorte).
// Wird von der Spiellogik (Schätze), der Welt (Gelände, Wasser) und den Tests gemeinsam benutzt. Daten aus Blender (ozeandata.js).
import DATA from './ozeandata.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t;
const dec = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const HB = dec(DATA.h); export const HGT = new Int16Array(HB.buffer, 0, HB.length / 2); export const MASK = dec(DATA.mask);
export const GRID = { nx: DATA.nx, nz: DATA.nz, cell: DATA.cell, x0: DATA.x0, z0: DATA.z0, x1: DATA.x0 + (DATA.nx - 1) * DATA.cell, z1: DATA.z0 + (DATA.nz - 1) * DATA.cell };
export const BASE_Y = DATA.baseY; export const WEG = [DATA.weg.pazifik, DATA.weg.atlantik];
const hij = (i, j) => HGT[clamp(j, 0, GRID.nz - 1) * GRID.nx + clamp(i, 0, GRID.nx - 1)] / 100;
// Höhe des Bodens (Land oder Meeresgrund), bilinear zwischen den Rasterpunkten
export function bedH(x, z) { const fx = (x - GRID.x0) / GRID.cell; const fz = (z - GRID.z0) / GRID.cell; const i = Math.floor(fx); const j = Math.floor(fz); const u = fx - i; const v = fz - j; return lerp(lerp(hij(i, j), hij(i + 1, j), u), lerp(hij(i, j + 1), hij(i + 1, j + 1), u), v); }
export function maskAt(x, z) { const i = Math.round((x - GRID.x0) / GRID.cell); const j = Math.round((z - GRID.z0) / GRID.cell); if (i < 0 || j < 0 || i >= GRID.nx || j >= GRID.nz) return 0; return MASK[j * GRID.nx + i]; }
// Welcher Ozean ist hier (auch knapp neben dem Becken)? -1 = keiner
export function meerAt(x, z) { const m = maskAt(x, z); if (m) return m - 1; for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, 3], [3, -3], [-3, -3]]) { const k = maskAt(x + dx, z + dz); if (k) return k - 1; } return -1; }
// Wassertiefe an einer Stelle bei den Pegeln lv[0], lv[1] (negativ: trocken)
export function depthAt(x, z, lv) { const m = meerAt(x, z); if (m < 0) return -9; return lv[m] - bedH(x, z); }
// Punkt auf dem Pumpenweg (vom Hafen zum tiefsten Punkt) nach d Metern, mit Richtung
export function pathPoint(i, d) { const p = WEG[i]; let acc = 0; for (let k = 1; k < p.length; k++) { const l = Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); if (acc + l >= d) { const f = (d - acc) / l; return { x: lerp(p[k - 1][0], p[k][0], f), z: lerp(p[k - 1][1], p[k][1], f), dx: (p[k][0] - p[k - 1][0]) / l, dz: (p[k][1] - p[k - 1][1]) / l }; } acc += l; } const q = p[p.length - 1]; return { x: q[0], z: q[1], dx: 0, dz: 1 }; }
// Wo beginnt beim Pegel lv das Wasser (Abstand vom Hafen entlang des Pumpenwegs)?
export function edgeOnPath(i, lv) { const p = WEG[i]; let d = 0; for (let k = 0; k < p.length; k++) { if (k) d += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); if (bedH(p[k][0], p[k][1]) < lv - 0.05) return { k, d, x: p[k][0], z: p[k][1] }; } const q = p[p.length - 1]; return { k: p.length - 1, d, x: q[0], z: q[1] }; }

// ---------------- Schätze am Meeresboden ----------------
// Je Ozean 14 Fundstücke, von flach (früh frei) bis ganz tief (erst am Ende frei). Immer an denselben Stellen (fester Zufall).
export const SCHATZ_ARTEN = {
  truhe: { name: 'Schatztruhe', faktor: 1 },
  flasche: { name: 'Flaschenpost', faktor: 0.35 },
  anker: { name: 'Alter Anker', faktor: 0.6 },
  krone: { name: 'Goldene Krone', faktor: 1.6 },
};
function placeTreasures(m, seed) {
  let a = seed; const R = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  let tief = 0; for (let k = 0; k < HGT.length; k++) if (MASK[k] === m + 1) tief = Math.min(tief, HGT[k] / 100);
  const N = 14; const out = []; const kinds = ['flasche', 'truhe', 'anker', 'flasche', 'truhe', 'anker', 'truhe', 'flasche', 'anker', 'truhe', 'flasche', 'truhe', 'anker', 'krone'];
  for (let n = 0; n < N; n++) {
    const want = -(0.7 + (Math.abs(tief) - 1.4) * Math.pow(n / (N - 1), 1.15)); let best = null;
    for (let t = 0; t < 6000; t++) {
      const i = Math.floor(R() * GRID.nx); const j = Math.floor(R() * GRID.nz); if (MASK[j * GRID.nx + i] !== m + 1) continue; const h = HGT[j * GRID.nx + i] / 100; if (Math.abs(h - want) > 0.35) continue;
      const x = GRID.x0 + i * GRID.cell + (R() - 0.5); const z = GRID.z0 + j * GRID.cell + (R() - 0.5); if (out.some((q) => Math.hypot(q.x - x, q.z - z) < 28)) continue; best = { x, z }; break;
    }
    if (best) out.push({ x: Math.round(best.x * 100) / 100, z: Math.round(best.z * 100) / 100, bed: Math.round(bedH(best.x, best.z) * 1000) / 1000, kind: kinds[n], n });
  }
  return out;
}
export const SCHAETZE = [placeTreasures(0, 4711), placeTreasures(1, 1234)];

// ---------------- Salzkristalle am Meeresboden ----------------
// Wo das Wasser weg ist, bleibt Meersalz liegen: je Ozean 30 Kristallhaufen von flach bis tief (fester Zufall). Aufsammeln mit E bringt Meersalz,
// die Währung für den Skillbaum. Mit dem Skill „Tauchen“ kommt man auch unter Wasser ran.
function placeCrystals(m, seed) {
  let a = seed; const R = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  let tief = 0; for (let k = 0; k < HGT.length; k++) if (MASK[k] === m + 1) tief = Math.min(tief, HGT[k] / 100);
  const N = 30; const out = [];
  for (let n = 0; n < N; n++) {
    const want = -(0.3 + (Math.abs(tief) - 0.9) * Math.pow(n / (N - 1), 1.3)); let best = null;
    for (let t = 0; t < 8000; t++) {
      const i = Math.floor(R() * GRID.nx); const j = Math.floor(R() * GRID.nz); if (MASK[j * GRID.nx + i] !== m + 1) continue; const h = HGT[j * GRID.nx + i] / 100; if (Math.abs(h - want) > 0.3 + t / 20000) continue;
      const x = GRID.x0 + i * GRID.cell + (R() - 0.5); const z = GRID.z0 + j * GRID.cell + (R() - 0.5); if (out.some((q) => Math.hypot(q.x - x, q.z - z) < 12) || SCHAETZE[m].some((q) => Math.hypot(q.x - x, q.z - z) < 6)) continue; best = { x, z }; break;
    }
    if (best) out.push({ x: Math.round(best.x * 100) / 100, z: Math.round(best.z * 100) / 100, bed: Math.round(bedH(best.x, best.z) * 1000) / 1000, n, k: n / (N - 1) });
  }
  return out;
}
export const SALZKRISTALLE = [placeCrystals(0, 2027), placeCrystals(1, 1313)];
