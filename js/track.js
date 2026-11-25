// Theos Seitenscheidel - Strecke (reine Daten, kein Rendering): Mittellinie, Höhenprofil, Gelände, Bäume.
// Läuft im Spiel und im Node-Test identisch (deterministisch über Seed) - Grundlage für späteren Mehrspieler/Navigator:
// der Navigator liest nur `pts`/`corners`, die Synchronisation später nur den Fahrzeugzustand.

export const STEP = 2;            // Abstand der Mittellinien-Punkte in Metern
import { generateLayout, DIFFICULTIES, DIFFICULTY_ORDER } from './layouts.js';
export { DIFFICULTIES, DIFFICULTY_ORDER };

export const ROAD_HALF = 3.6;     // halbe Fahrbahnbreite (breite Asphaltstraße, 7,2 m)
export const VERGE_HALF = 4.5;    // Fahrbahn + Bankett (so breit ist das gezeichnete Band)
const CELL = 20;

// [Länge m, Radius m (+ links, - rechts, 0 gerade), 'm' = Schlamm]. Enge 90°-Kurven (Radius 14-17 m) und U-Kurven (180°, Radius 22-26 m)
// wechseln sich mit Geraden, Schlammpassagen und weiten Bögen ab. Bogenlänge = Radius * Winkel (die Übergänge zählen dazu).
const arc = (deg, rad) => [Math.round(Math.abs(rad) * deg * Math.PI / 180), rad];
const LAYOUT = [
  [70, 0], [95, 85], [60, 0], arc(90, 16), [45, 0], [85, -52], [40, 0], arc(90, 15), [28, 0], arc(90, -15), [105, 36, 'm'], [120, 0],
  arc(180, -24), [80, 0], [90, 46], [40, 0], arc(90, 14), [110, 0, 'm'], arc(180, -22), [70, 0], [110, 58], [60, 0], arc(90, -17), [50, 0, 'm'], arc(90, 17), [140, 0],
  [150, 125], [78, -32, 'm'], [100, 58], [60, 0], arc(90, -15), [35, 0], arc(90, 15), [100, 0, 'm'], [120, -72], [75, 36], [90, 0],
  arc(180, -26), [120, 0], [100, 64, 'm'], [60, 0], arc(90, 16), [45, 0], arc(90, -16), [30, 0], arc(90, 16), [90, 0], [130, 70], [130, -70, 'm'], [60, 0], arc(90, 18), [60, 0], arc(90, 14), [100, 0],
];
const TRANS = 7; // Länge (m), über der die Krümmung zwischen zwei Abschnitten weich übergeht
// Schlammlöcher: [von s, bis s] entlang der Strecke (aus den markierten Abschnitten)
export const MUD_ZONES = (() => { const out = []; let acc = 0; for (const [len, , tag] of LAYOUT) { if (tag === 'm') out.push([acc + 4, acc + len - 4]); acc += len; } return out; })();
// Landschaftszonen entlang der Strecke: Dichte, Mischung der Baumarten (Kiefer, Laub, Birke, Herbst), Mindestabstand der ersten Reihe
const ZONES = [
  { to: 330, name: 'forest', dens: 1, mix: [0.03, 0.4, 0.25, 0.32], extra: 0 },
  { to: 700, name: 'light', dens: 0.8, mix: [0.03, 0.4, 0.2, 0.37], extra: 0.8 },
  { to: 1080, name: 'dense', dens: 1.3, mix: [0.08, 0.4, 0.17, 0.35], extra: 0 },
  { to: 1450, name: 'birch', dens: 0.95, mix: [0.02, 0.2, 0.55, 0.23], extra: 0.4 },
  { to: 1850, name: 'grove', dens: 1.0, mix: [0.1, 0.3, 0.2, 0.4], extra: 0.2 },
  { to: 2300, name: 'dense', dens: 1.3, mix: [0.08, 0.4, 0.17, 0.35], extra: 0 },
  { to: 2750, name: 'light', dens: 0.8, mix: [0.03, 0.4, 0.2, 0.37], extra: 0.8 },
  { to: 3150, name: 'forest', dens: 1, mix: [0.03, 0.4, 0.25, 0.32], extra: 0 },
  { to: 1e9, name: 'birch', dens: 0.95, mix: [0.02, 0.2, 0.55, 0.23], extra: 0.4 },
];
const CROWN = [1.9, 1.7, 1.3, 1.1]; // Kronenradius je Baumart (m, bei Maßstab 1): die Krone darf nie in die Fahrbahn ragen
export const zoneAt = (s) => { const m = s % 3200; for (const z of ZONES) if (m < z.to) return z; return ZONES[ZONES.length - 1]; };
export const SOLID_LAT = 11; // nur Bäume bis zu diesem Querabstand von der Mittellinie haben eine Hitbox (alles dahinter ist Kulisse)

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// difficulty: 'classic' (die erste Teststrecke, 3,7 km) oder 'easy' | 'hard' | 'impossible' (erzeugte 5-km-Strecken)
// Großform des Geländes: Berge bzw. Buchten; nur für die Themen mountain und coast
const MACRO = {
  mountain: (x, z) => 38 * Math.sin(x * 0.0061 + 1.1) * Math.cos(z * 0.0053) + 24 * Math.sin(x * 0.0127 - z * 0.0103 + 0.6) + 10 * Math.sin(x * 0.031 + z * 0.027) + 4 * Math.sin(x * 0.071) * Math.sin(z * 0.063),
  coast: (x, z) => 15 * Math.sin(x * 0.0083 + 0.4) * Math.cos(z * 0.0071 + 1) + 10 * Math.sin(x * 0.0171 - z * 0.0133) + 3 * Math.sin(x * 0.05 + z * 0.04) - 1,
};
export const SEA_Y = -3.4; // Meereshöhe der Küstenstraße

export function buildTrack({ seed: seedArg, difficulty = 'classic', lengthM } = {}) {
  const cfg = difficulty === 'classic' ? { theme: 'forest' } : DIFFICULTIES[difficulty]; const theme = cfg.theme || 'forest'; const macro = MACRO[theme] || null; const roadHalf = cfg.road || ROAD_HALF; const vergeHalf = roadHalf + (VERGE_HALF - ROAD_HALF); const laps = cfg.laps || 0;
  const layout = difficulty === 'classic' ? LAYOUT : generateLayout(difficulty, undefined, lengthM);
  const seed = seedArg !== undefined ? seedArg : (difficulty === 'classic' ? 1337 : DIFFICULTIES[difficulty].seed + 7);
  // --- Mittellinie: Kurswinkel aus Krümmung integrieren (Übergänge weich über 7 m) ---
  const segs = layout.map(([len, rad, tag]) => ({ len, k: rad ? 1 / rad : 0, tag }));
  const mudZones = (() => { const out = []; let a = 0; for (const g of segs) { if (g.tag === 'm') out.push([a + 4, a + g.len - 4]); a += g.len; } return out; })();
  const total = segs.reduce((s, g) => s + g.len, 0);
  const nLap = Math.round(total / STEP) + 1; const n = nLap + (laps ? 160 : 0); // Rundkurs: 320 m Überhang, damit KI und Tablet über die Ziellinie hinausschauen
  const pts = { x: new Float32Array(n), z: new Float32Array(n), y: new Float32Array(n), psi: new Float32Array(n), kappa: new Float32Array(n) };
  const kAt = (s) => {
    let acc = 0; let prevK = 0;
    for (let i = 0; i < segs.length; i++) {
      const g = segs[i]; const end = acc + g.len;
      if (s < end) { const t = smooth(0, TRANS, s - acc); return prevK + (g.k - prevK) * t; }
      prevK = g.k; acc = end;
    }
    return prevK;
  };
  let x = 0; let z = 0; let psi = 0;
  const baseY = (s) => 7 * Math.sin(s / 240) + 3.2 * Math.sin(s / 97 + 1.1) + 1.2 * Math.sin(s / 41 + 0.4) - 3.2 * Math.sin(1.1) - 0.5;
  for (let i = 0; i < nLap; i++) {
    const s = i * STEP; const k = kAt(s);
    pts.x[i] = x; pts.z[i] = z; pts.psi[i] = psi; pts.kappa[i] = k;
    pts.y[i] = baseY(s); // Startpunkt wird unten auf y 0 gesetzt
    // Vorwärtsrichtung (sin psi, cos psi), links ist +psi
    psi += k * STEP; x += Math.sin(psi) * STEP; z += Math.cos(psi) * STEP;
  }
  if (theme === 'circuit' || theme === 'city') for (let i = 0; i < nLap; i++) pts.y[i] = 0.7 * Math.sin(i * STEP / 170) * (theme === 'city' ? 1 : 0.6);
  if (macro) { // Straße folgt dem Gelände, geglättet und mit begrenzter Steigung (daraus entstehen Einschnitte, Abgründe und Dämme)
    const raw = new Float32Array(nLap); for (let i = 0; i < nLap; i++) raw[i] = macro(pts.x[i], pts.z[i]); const out = new Float32Array(nLap); const W = 40; for (let pass = 0; pass < 2; pass++) { for (let i = 0; i < nLap; i++) { let a = 0; let c = 0; for (let j = Math.max(0, i - W); j <= Math.min(nLap - 1, i + W); j++) { a += raw[j]; c++; } out[i] = a / c; } raw.set(out); }
    const g = (theme === 'mountain' ? 0.085 : 0.05) * STEP; if (theme === 'coast') for (let i = 0; i < nLap; i++) raw[i] = Math.max(raw[i], SEA_Y + 4.2); for (let i = 1; i < nLap; i++) raw[i] = Math.min(raw[i], raw[i - 1] + g); for (let i = 1; i < nLap; i++) raw[i] = Math.max(raw[i], raw[i - 1] - g); for (let i = nLap - 2; i >= 0; i--) raw[i] = Math.min(raw[i], raw[i + 1] + g); if (theme === 'coast') for (let i = 0; i < nLap; i++) raw[i] = Math.max(raw[i], SEA_Y + 3.2); pts.y.set(raw);
  }
  const y0 = pts.y[0];
  for (let i = 0; i < nLap; i++) pts.y[i] -= macro ? 0 : y0;
  if (laps) { // Rundkurs schließen: Restfehler gleichmäßig verteilen, Kurswinkel neu ableiten, Überhang anhängen
    const ex = pts.x[nLap - 1] - pts.x[0]; const ez = pts.z[nLap - 1] - pts.z[0]; for (let i = 0; i < nLap; i++) { const t = i / (nLap - 1); pts.x[i] -= ex * t; pts.z[i] -= ez * t; }
    const unwrap = (a, b) => b + Math.atan2(Math.sin(a - b), Math.cos(a - b)); for (let i = 1; i < nLap; i++) pts.psi[i] = unwrap(Math.atan2(pts.x[Math.min(i + 1, nLap - 1)] - pts.x[i - 1], pts.z[Math.min(i + 1, nLap - 1)] - pts.z[i - 1]), pts.psi[i - 1]);
    for (let i = 0; i < n - nLap; i++) { const j = nLap + i; const k = i + 1; pts.x[j] = pts.x[k]; pts.z[j] = pts.z[k]; pts.y[j] = pts.y[k]; pts.psi[j] = pts.psi[k] + (pts.psi[nLap - 1] - pts.psi[0]); pts.kappa[j] = pts.kappa[k]; }
  }

  // --- Raster für schnelle Nachbarschaftssuche ---
  const grid = new Map();
  const key = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768); // eindeutig: ein Hash könnte fremde Zellen treffen, das Auto sprang dann Hunderte Meter weit
  for (let i = 0; i < (laps ? nLap - 1 : n); i++) {
    const k2 = key(Math.floor(pts.x[i] / CELL), Math.floor(pts.z[i] / CELL));
    let a = grid.get(k2); if (!a) { a = []; grid.set(k2, a); } a.push(i);
  }
  const coarse = []; for (let i = 0; i < nLap - 1; i += 8) coarse.push(i);

  // Nächster Punkt auf der Mittellinie (auf Streckenstück projiziert): { i, s, lat (links +), dist, y, psi }
  function nearest(px, pz) {
    let best = -1; let bd = 1e18;
    const cx = Math.floor(px / CELL); const cz = Math.floor(pz / CELL);
    let hit = 99; for (let r = 0; r <= Math.min(5, hit + 1); r++) { // ein Ring über den ersten Treffer hinaus, sonst ist der Punkt nicht sicher der nächste
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (r > 0 && Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; // nur der neue Ring
        const a = grid.get(key(cx + dx, cz + dz)); if (!a) continue;
        for (const i of a) { const d = (pts.x[i] - px) ** 2 + (pts.z[i] - pz) ** 2; if (d < bd) { bd = d; best = i; } }
      }
      if (best >= 0 && hit === 99) hit = r;
    }
    if (best < 0) { for (const i of coarse) { const d = (pts.x[i] - px) ** 2 + (pts.z[i] - pz) ** 2; if (d < bd) { bd = d; best = i; } } }
    // Projektion auf die beiden angrenzenden Stücke
    let bestT = 0; let seg = best; let dist2 = bd;
    for (const j of [best - 1, best]) {
      if (j < 0 || j >= n - 1) continue;
      const ax = pts.x[j]; const az = pts.z[j]; const bx = pts.x[j + 1] - ax; const bz = pts.z[j + 1] - az;
      const t = clamp(((px - ax) * bx + (pz - az) * bz) / (bx * bx + bz * bz), 0, 1);
      const qx = ax + bx * t - px; const qz = az + bz * t - pz; const d2 = qx * qx + qz * qz;
      if (d2 <= dist2 + 1e-9) { dist2 = d2; seg = j; bestT = t; }
    }
    const j = Math.min(seg, n - 2);
    const cxp = pts.x[j] + (pts.x[j + 1] - pts.x[j]) * bestT; const czp = pts.z[j] + (pts.z[j + 1] - pts.z[j]) * bestT;
    const p = pts.psi[j] + (pts.psi[j + 1] - pts.psi[j]) * bestT;
    const dist = Math.sqrt(dist2);
    const left = (px - cxp) * Math.cos(p) - (pz - czp) * Math.sin(p); // links = (cos psi, -sin psi)
    return { i: j, s: (j + bestT) * STEP, lat: left, dist, y: pts.y[j] + (pts.y[j + 1] - pts.y[j]) * bestT, psi: p, cx: cxp, cz: czp };
  }

  const inMud = (s) => mudZones.some(([a, b]) => s >= a && s <= b);

  // sanfte Hügel abseits der Straße + Unebenheiten auf der Straße
  const relief = (px, pz) => 2.6 * Math.sin(px * 0.021 + 1.3) * Math.cos(pz * 0.017) + 1.6 * Math.sin(px * 0.047 + pz * 0.039) + 0.7 * Math.sin(px * 0.11) * Math.sin(pz * 0.13);
  const bumps = (s, lat) => 0.045 * Math.sin(s * 1.9 + lat * 0.7) + 0.035 * Math.sin(s * 0.83 + 2) + 0.02 * Math.sin(s * 4.1 + lat * 2.3);

  // Höhe des Geländes (Fahrbahn exakt Profil + Unebenheit, daneben Graben und Hügel)
  function heightAt(px, pz, q) {
    q = q || nearest(px, pz);
    const d = Math.abs(q.lat);
    const rw = 1 - smooth(vergeHalf - 0.3, vergeHalf + 0.9, d);        // 1 auf der Straße
    let h = q.y + bumps(q.s, q.lat) * rw * (inMud(q.s) ? 1 : 0.4); // Asphalt ist glatt, Schlamm holprig
    if (macro) return h + (macro(px, pz) - q.y) * smooth(vergeHalf + 0.7, vergeHalf + 15, d) * (1 + 0 * rw);
    const out = smooth(vergeHalf + 0.6, vergeHalf + 11, d); const flatK = theme === 'city' ? 0 : theme === 'circuit' ? 0.3 : 1;
    const ditch = -0.32 * Math.exp(-(((d - (vergeHalf + 1.2)) / 1.1) ** 2)) * flatK;
    h += ditch + (relief(px, pz) * out + 0.5 * out * Math.sin(q.s * 0.05)) * flatK;
    return h;
  }

  // Untergrund: 'road' | 'mud' | 'grass'
  function surfaceAt(px, pz, q) {
    q = q || nearest(px, pz);
    const d = Math.abs(q.lat);
    if (d <= vergeHalf) return inMud(q.s) ? 'mud' : 'road';
    return theme === 'city' ? 'road' : 'grass';
  }

  // --- Bäume (deterministisch) ---
  const rnd = mulberry32(seed);
  const trees = []; const thash = new Map();
  const tkey = (cx, cz) => cx * 1000003 + cz;
  function tooClose(px, pz, r) {
    const cx = Math.floor(px / 6); const cz = Math.floor(pz / 6);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const a = thash.get(tkey(cx + dx, cz + dz)); if (!a) continue;
      for (const t of a) if ((t.x - px) ** 2 + (t.z - pz) ** 2 < (t.r + r + 0.9) ** 2) return true;
    }
    return false;
  }
  { // Mitte jeder Spitzkehre: ein großer Baum
    let a0 = 0;
    for (const g of segs) {
      const ang = g.k !== 0 ? g.len * Math.abs(g.k) * 180 / Math.PI : 0; const rad = g.k !== 0 ? 1 / Math.abs(g.k) : 0;
      if (g.k !== 0 && rad <= 12 && ang >= 120) {
        const i = clamp(Math.round((a0 + g.len / 2) / STEP), 0, n - 1); const lat = (g.k > 0 ? 1 : -1) * rad;
        const px = pts.x[i] + Math.cos(pts.psi[i]) * lat; const pz = pts.z[i] - Math.sin(pts.psi[i]) * lat;
        const t = { x: px, z: pz, y: heightAt(px, pz), r: 0.5, type: 1, scale: 1.0, rot: 0.5, s: a0 + g.len / 2, solid: true, landmark: true };
        trees.push(t); const hk = tkey(Math.floor(px / 6), Math.floor(pz / 6)); let a = thash.get(hk); if (!a) { a = []; thash.set(hk, a); } a.push(t);
      }
      a0 += g.len;
    }
  }
  for (let s = 0; s < total; s += 1.7) {
    for (const side of [-1, 1]) {
      const zn = cfg.zone || zoneAt(s); if (!zn.dens) continue;
      const cnt0 = (2 + (rnd() < 0.5 ? 1 : 0) + (rnd() < 0.3 ? 1 : 0)) * zn.dens; const cnt = Math.floor(cnt0) + (rnd() < cnt0 - Math.floor(cnt0) ? 1 : 0);
      for (let c = 0; c < cnt; c++) {
        const first = c === 0 && rnd() > 0.1;
        const roll = rnd(); const m = zn.mix; const type = roll < m[0] ? 0 : roll < m[0] + m[1] ? 1 : roll < m[0] + m[1] + m[2] ? 2 : 3;
        const scale = 0.85 + rnd() * 0.7;
        const minLat = vergeHalf + 0.8 + CROWN[type] * scale + zn.extra; // Krone bleibt neben der Straße, dazwischen Gras und Büsche
        const lat = side * (first ? minLat + rnd() * 2.2 : minLat + 1 + Math.pow(rnd(), 1.5) * 50);
        const sj = s + (rnd() - 0.5) * 3;
        const i = clamp(Math.round(sj / STEP), 0, n - 1);
        const px = pts.x[i] + Math.cos(pts.psi[i]) * lat; const pz = pts.z[i] - Math.sin(pts.psi[i]) * lat;
        const q = nearest(px, pz);
        if (Math.abs(q.lat) < vergeHalf + 0.8 + CROWN[type] * scale) continue; // nicht auf/an der Straße (auch bei Kurven/anderen Streckenteilen)
        if (theme === 'coast' && heightAt(px, pz, q) < SEA_Y + 1.6) continue; // kein Baum im Wasser
        const r = (type === 0 ? 0.3 : type === 2 ? 0.2 : 0.3) * scale + (rnd() < 0.12 ? 0.2 : 0);
        if (tooClose(px, pz, r)) continue;
        const t = { x: px, z: pz, y: heightAt(px, pz, q), r, type, scale, rot: rnd() * 6.283, s: q.s, solid: Math.abs(q.lat) <= SOLID_LAT };
        trees.push(t);
        const hk = tkey(Math.floor(px / 6), Math.floor(pz / 6)); let a = thash.get(hk); if (!a) { a = []; thash.set(hk, a); } a.push(t);
      }
    }
  }
  // Seitliche Grenzen je Streckenpunkt (links, rechts): Fels, Leitplanke, Häuserzeile, Reifenstapel. Dahinter kommt niemand
  const rows = laps ? nLap : n; const limL = new Float32Array(rows).fill(58); const limR = new Float32Array(rows).fill(58); const rail = { L: new Uint8Array(rows), R: new Uint8Array(rows) };
  if (theme === 'circuit') { limL.fill(roadHalf + 10); limR.fill(roadHalf + 10); }
  if (theme === 'city') { limL.fill(roadHalf + 3); limR.fill(roadHalf + 3); }
  if (macro) { for (let i = 0; i < rows; i++) { const cs = Math.cos(pts.psi[i]); const sn = Math.sin(pts.psi[i]); for (const side of [1, -1]) { const lat = side * (vergeHalf + 7); const px = pts.x[i] + cs * lat; const pz = pts.z[i] - sn * lat; const dy = heightAt(px, pz) - pts.y[i]; const drop = dy < -1.1; const cut = dy > 1.4; if (drop || cut) { (side > 0 ? limL : limR)[i] = vergeHalf + 0.8; if (drop) (side > 0 ? rail.L : rail.R)[i] = 1; } } } for (const a of [limL, limR]) { const c = a.slice(); for (let i = 0; i < rows; i++) { let m = 99; for (let j = Math.max(0, i - 7); j <= Math.min(rows - 1, i + 7); j++) m = Math.min(m, c[j]); a[i] = Math.min(m, 26); } for (let i = 1; i < rows; i++) a[i] = Math.min(a[i], a[i - 1] + 0.7); for (let i = rows - 2; i >= 0; i--) a[i] = Math.min(a[i], a[i + 1] + 0.7); } }
  const addObstacle = (s, lat, r, extra = {}) => { const i = clamp(Math.round(s / STEP), 0, rows - 1); const px = pts.x[i] + Math.cos(pts.psi[i]) * lat; const pz = pts.z[i] - Math.sin(pts.psi[i]) * lat; const t = { x: px, z: pz, y: heightAt(px, pz), r, type: 1, scale: 1, rot: 0, s, solid: true, prop: true, ...extra }; const hk = tkey(Math.floor(px / 6), Math.floor(pz / 6)); let a = thash.get(hk); if (!a) { a = []; thash.set(hk, a); } a.push(t); return t; };
  // Stadt: Baustellen auf der Fahrbahn, die KI weicht über aiLane aus
  const hazards = []; const aiLane = new Float32Array(n); const lamps = [];
  if (theme === 'city') { const rc = mulberry32(seed + 5); for (let s = 180; s < total - 160; s += 190 + rc() * 170) { const i = Math.round(s / STEP); let k = 0; for (let j = -24; j <= 24; j++) k = Math.max(k, Math.abs(pts.kappa[clamp(i + j, 0, n - 1)])); if (k > 0.004) continue; const side = rc() < 0.5 ? 1 : -1; const lat = side * 2.5; hazards.push({ s, lat, len: 9 }); for (const o of [-3.6, 0, 3.6]) addObstacle(s + o, lat, 1.05, { hazard: true }); const t0 = Math.round(s / STEP); for (let j = -26; j <= 26; j++) { const w = 0.5 + 0.5 * Math.cos(Math.PI * j / 26); const ii = clamp(t0 + j, 0, n - 1); aiLane[ii] = -side * 1.9 * Math.min(1, w * 1.5); } }
    for (let s = 14; s < total - 10; s += 27) for (const side of [1, -1]) { const i = Math.round(s / STEP); if (Math.abs(pts.kappa[clamp(i, 0, n - 1)]) > 0.02) continue; const o = addObstacle(s, side * (roadHalf + 0.62), 0.14); o.ang = pts.psi[i] + (side > 0 ? 0 : Math.PI); lamps.push(o); } }
  // Bäume in der Nähe eines Punkts (für Kollision)
  function treesNear(px, pz, rad, out = []) {
    out.length = 0;
    const c0 = Math.floor((px - rad) / 6); const c1 = Math.floor((px + rad) / 6); const d0 = Math.floor((pz - rad) / 6); const d1 = Math.floor((pz + rad) / 6);
    for (let cx = c0; cx <= c1; cx++) for (let cz = d0; cz <= d1; cz++) { const a = thash.get(tkey(cx, cz)); if (a) for (const t of a) if (t.solid) out.push(t); }
    return out;
  }

  // Zwischenziele (alle 250 m) und Kurvenansagen für den späteren Navigator
  const checkpoints = []; for (let s = 0; s < total - 40; s += laps ? 1e9 : 250) checkpoints.push(s);
  const corners = []; let acc = 0;
  for (const g of segs) { if (g.k !== 0) corners.push({ s: acc, len: g.len, dir: g.k > 0 ? 'left' : 'right', radius: Math.round(1 / Math.abs(g.k)), angle: Math.round(g.len * Math.abs(g.k) * 180 / Math.PI), mud: g.tag === 'm' }); acc += g.len; } if (laps) { const lapLen = (nLap - 1) * STEP; for (const c of [...corners]) corners.push({ ...c, s: c.s + lapLen }); }

  function poseAt(s) { const i = clamp(Math.round(s / STEP), 0, n - 1); return { x: pts.x[i], z: pts.z[i], y: pts.y[i], psi: pts.psi[i] }; }

  let bbox = { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 };
  for (let i = 0; i < rows; i++) { bbox = { x0: Math.min(bbox.x0, pts.x[i]), x1: Math.max(bbox.x1, pts.x[i]), z0: Math.min(bbox.z0, pts.z[i]), z1: Math.max(bbox.z1, pts.z[i]) }; }

  return { seed, pts, n, rows, zoneAt, cfg, theme, roadHalf, vergeHalf, laps, limL, limR, rail, hazards, lamps, aiLane, macro, grassK: cfg.grass === undefined ? 1 : cfg.grass, length: (rows - 1) * STEP, nearest, heightAt, surfaceAt, inMud, trees, treesNear, checkpoints, corners, poseAt, bbox, mudZones, difficulty, layout };
}
