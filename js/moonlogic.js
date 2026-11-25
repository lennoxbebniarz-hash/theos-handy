// Theos Seitenscheidel - Moonsweeper 2: reine Spiellogik (ohne Darstellung, netzwerkfähig): Mond-Raster, Mondstaub, Gelände, Wirtschaft, Katalog, Helfer.
// Der Mond ist ein geschlossenes Quadrat (Torus): wer lange genug geradeaus läuft, kommt wieder am Start an. Spielerkoordinaten laufen frei weiter, nur das Raster rechnet mit mod.
export const MOON_SIZE = 1024; // Meter Kantenlänge
export const CELL = 0.125; // Meter je Rasterzelle: fein genug für eine schmale Zahnbürstenbahn
export const GRID = MOON_SIZE / CELL; // 8192 x 8192 Zellen
const GRID_BITS = 13;
export const CHUNK_N = 16; // Kacheln je Kante
export const CHUNK_CELLS = GRID / CHUNK_N; // 512 Zellen je Kachel
export const CHUNK_SIZE = MOON_SIZE / CHUNK_N; // 64 m je Kachel
export const DUST_KG_M2 = 0.2; // Mondstaub je Quadratmeter (voller Belag)
const KG_PER_UNIT = (DUST_KG_M2 * CELL * CELL) / 255; // Rasterwert 255 = volle Zelle
export const GRAVITY = 1.62;

export const mod = (a, n) => ((a % n) + n) % n;
export const wrapNear = (a, ref) => a + Math.round((ref - a) / MOON_SIZE) * MOON_SIZE; // Abbild von a, das ref am nächsten liegt
export const wrapDelta = (a, b) => { const d = mod(a - b + MOON_SIZE / 2, MOON_SIZE) - MOON_SIZE / 2; return d; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------- Stützpunkt: feste Orte auf dem Mond ----------------
export const BASE = {
  station: { x: 512, z: 512 },             // große Raumstation (Innenraum begehbar)
  trader: { x: 462, z: 556 },              // Händler mit Verkaufstrichter
  start: { x: 476, z: 543 },
  garage: { x: 542, z: 560 },              // hier stehen gekaufte Fahrzeuge
  unload: { x: 504, z: 546 },              // Fahrzeug-Entladestation über der Fahrbahn
  flat: 118,                               // Radius der eingeebneten Fläche um den Stützpunkt
};
// Fabrikgelände östlich der Station: Raster für Bänder und Maschinen
export const LOT = { x: 560, z: 458, n: 28, cell: 2.5, levels: 3, h: 2.4 };
export const LOT_C = { x: LOT.x + LOT.n * LOT.cell / 2, z: LOT.z + LOT.n * LOT.cell / 2, half: LOT.n * LOT.cell / 2 };
export const OUTPOSTS = [{ id: 'op_north', name: 'Außenposten Nord', x: 512, z: 150 }, { id: 'op_east', name: 'Außenposten Ost', x: 880, z: 512 }, { id: 'op_far', name: 'Außenposten Rückseite', x: 60, z: 980 }];
// Station: Außenmaße (Achsen ausgerichtet), Tür in der Südwand (+z); Wände sind für die Kollision einzelne Quader
export const STATION = { hx: 17, hz: 9, door: 2.2 };
export function staticBlocks() { // Quader { x, z, hx, hz } in Mondkoordinaten
  const S = BASE.station; const w = 0.4; const d = STATION.door; const b = [
    { x: S.x, z: S.z - STATION.hz, hx: STATION.hx, hz: w }, // Nordwand
    { x: S.x - STATION.hx, z: S.z, hx: w, hz: STATION.hz }, { x: S.x + STATION.hx, z: S.z, hx: w, hz: STATION.hz }, // Seiten
    { x: S.x - (STATION.hx + d) / 2, z: S.z + STATION.hz, hx: (STATION.hx - d) / 2, hz: w }, { x: S.x + (STATION.hx + d) / 2, z: S.z + STATION.hz, hx: (STATION.hx - d) / 2, hz: w }, // Südwand mit Tür
    { x: S.x - 8, z: S.z - 6.6, hx: 2.6, hz: 0.7 }, // Terminal an der Nordwand
    { x: S.x + STATION.hx - 4.2, z: S.z - 4, hx: 0.6, hz: 3.1 }, // Technikladen-Tresen
    { x: S.x - 12.5, z: S.z + 6.7, hx: 2.7, hz: 0.7 }, // Upgrade-Station
    { x: BASE.unload.x, z: BASE.unload.z - 6.8, hx: 0.55, hz: 0.55 }, { x: BASE.unload.x, z: BASE.unload.z + 6.8, hx: 0.55, hz: 0.55 }, { x: BASE.unload.x, z: BASE.unload.z + 13, hx: 2.3, hz: 2.3 }, // Entladestation: Stützen und Silo
    { x: S.x - 40, z: S.z - 2, hx: 9.5, hz: 6.5 }, // Nebenmodul
    { x: S.x - 25, z: S.z - 2, hx: 6.5, hz: 1.4 }, // Verbindungsgang
    { x: S.x + 6, z: S.z + 1.2, hx: 1.1, hz: 1.1 }, // Mondglobus
    { x: S.x - STATION.hx + 0.55, z: S.z - 2.85, hx: 0.45, hz: 2.7 }, // Spinde
    { x: BASE.trader.x, z: BASE.trader.z - 7, hx: 8.2, hz: 4 }, { x: BASE.trader.x - 13, z: BASE.trader.z - 7, hx: 3.2, hz: 3.2 }, // Händlerhaus + Tank
    { x: BASE.trader.x + 3.6, z: BASE.trader.z - 1.0, hx: 4.1, hz: 0.6 }, { x: BASE.trader.x + 8, z: BASE.trader.z + 1, hx: 1.1, hz: 1.1 }, // Tresen + Trichter
  ]; return b;
}
export const stationInside = (x, z) => { const S = BASE.station; return Math.abs(wrapDelta(x, S.x)) < STATION.hx && Math.abs(wrapDelta(z, S.z)) < STATION.hz; };

// ---------------- Gelände: periodische Höhenkarte (2 m Raster) mit Kratern und Hügeln ----------------
const HN = 512; const HS = MOON_SIZE / HN;
export function buildHeight(seed = 1969) {
  const r = mulberry(seed); const H = new Float32Array(HN * HN);
  const layer = (cells, amp) => { // periodisches Wertrauschen
    const lat = new Float32Array(cells * cells); for (let i = 0; i < lat.length; i++) lat[i] = r();
    const f = HN / cells;
    for (let y = 0; y < HN; y++) for (let x = 0; x < HN; x++) {
      const gx = x / f; const gy = y / f; const x0 = Math.floor(gx); const y0 = Math.floor(gy); const tx = gx - x0; const ty = gy - y0; const sx = tx * tx * (3 - 2 * tx); const sy = ty * ty * (3 - 2 * ty);
      const a = lat[(y0 % cells) * cells + (x0 % cells)]; const b = lat[(y0 % cells) * cells + ((x0 + 1) % cells)]; const c = lat[((y0 + 1) % cells) * cells + (x0 % cells)]; const d = lat[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)];
      H[y * HN + x] += (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy - 0.5) * amp;
    }
  };
  layer(5, 42); layer(11, 15); layer(27, 4.5); layer(71, 0.9);
  const craters = [];
  for (let i = 0; i < 70; i++) { const R = i < 8 ? 32 + r() * 38 : 6 + r() * r() * 26; craters.push({ x: r() * MOON_SIZE, z: r() * MOON_SIZE, R, d: R * (0.13 + r() * 0.07) }); }
  for (const c of craters) {
    const R = c.R * 1.6; const x0 = Math.floor((c.x - R) / HS); const x1 = Math.ceil((c.x + R) / HS); const y0 = Math.floor((c.z - R) / HS); const y1 = Math.ceil((c.z + R) / HS);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const q = Math.hypot(x * HS - c.x, y * HS - c.z) / c.R; if (q >= 1.6) continue; const h = q < 1 ? (q * q - 1) * c.d + c.d * 0.28 : c.d * 0.28 * Math.pow(Math.max(0, (1.6 - q) / 0.6), 2); H[mod(y, HN) * HN + mod(x, HN)] += h; }
  }
  // Stützpunkt und Außenposten einebnen
  const flats = [{ x: BASE.station.x, z: BASE.station.z, R: BASE.flat }, { x: LOT_C.x, z: LOT_C.z, R: 84 }, ...OUTPOSTS.map((o) => ({ x: o.x, z: o.z, R: 24 }))];
  const gx0 = HN / 2; const base = H[gx0 * HN + gx0];
  for (let y = 0; y < HN; y++) for (let x = 0; x < HN; x++) { let k = 0; for (const f of flats) { const dx = wrapDelta(x * HS, f.x); const dz = wrapDelta(y * HS, f.z); const q = Math.hypot(dx, dz) / f.R; k = Math.max(k, 1 - smooth(0.62, 1.15, q)); } H[y * HN + x] = (H[y * HN + x] - base) * (1 - k) + 0 * k; }
  return { H, craters };
}
export function heightAt(H, x, z) {
  const gx = mod(x, MOON_SIZE) / HS; const gz = mod(z, MOON_SIZE) / HS; const x0 = Math.floor(gx); const z0 = Math.floor(gz); const tx = gx - x0; const tz = gz - z0; const x1 = (x0 + 1) % HN; const z1 = (z0 + 1) % HN;
  const a = H[z0 * HN + x0]; const b = H[z0 * HN + x1]; const c = H[z1 * HN + x0]; const d = H[z1 * HN + x1]; return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
}

// ---------------- Mondstaub: Raster 0..255 (0 = sauber) ----------------
// Staub-Übersicht: Blöcke zu 64 x 64 Zellen (8 m) mit der Summe des Staubs darin. Sie wird bei jeder Änderung mitgeführt (sweep, sweepBar, cleanRect, decodeChunk),
// damit Helfer sofort wissen, wo noch Staub liegt, ohne die 67 Millionen Zellen abzusuchen. claim/bad/clock gehören den Helfern (nicht gespeichert).
export const BLK = 64; export const BLK_N = GRID / BLK; const BLK_MAX = BLK * BLK * 255;
const blkOf = (i) => ((i >> (GRID_BITS + 6)) << 7) | ((i & (GRID - 1)) >> 6); // Zellindex -> Blockindex (BLK_N = 128 = 1 << 7)
export function createDust() {
  const D = { g: new Uint8Array(GRID * GRID).fill(255), dirty: new Uint8Array(CHUNK_N * CHUNK_N), touched: new Uint8Array(CHUNK_N * CHUNK_N), changed: new Uint8Array(CHUNK_N * CHUNK_N), remaining: GRID * GRID * 255, total: GRID * GRID * 255,
    blk: new Uint32Array(BLK_N * BLK_N).fill(BLK_MAX), claim: new Map(), bad: new Map(), clock: 0 };
  return D;
}
// Übersicht neu rechnen, wenn Zellen am Zähler vorbei geändert wurden (Laden aus der Datenbank, Tests). all = false: nur angefasste Kacheln.
export function rebuildBlocks(D, all = false) {
  const g = D.g; const per = CHUNK_CELLS / BLK; if (all) D.blk.fill(0);
  for (let c = 0; c < D.touched.length; c++) { if (!all && !D.touched[c]) continue; const cy = (c / CHUNK_N) | 0; const cx = c % CHUNK_N;
    if (!all) for (let by = 0; by < per; by++) for (let bx = 0; bx < per; bx++) D.blk[(cy * per + by) * BLK_N + cx * per + bx] = 0;
    for (let y = 0; y < CHUNK_CELLS; y++) { const z = cy * CHUNK_CELLS + y; const row = z * GRID + cx * CHUNK_CELLS; const brow = (z >> 6) * BLK_N + ((cx * CHUNK_CELLS) >> 6); for (let x = 0; x < CHUNK_CELLS; x++) D.blk[brow + (x >> 6)] += g[row + x]; } }
}
const markDirty = (D, cx, cy) => { const cc = CHUNK_CELLS; const i = ((cy / cc) | 0) * CHUNK_N + ((cx / cc) | 0); D.dirty[i] = 1; D.touched[i] = 1; D.changed[i] = 1; const ex = cx % cc; const ey = cy % cc; if (ex === 0) { const j = ((cy / cc) | 0) * CHUNK_N + mod(((cx / cc) | 0) - 1, CHUNK_N); D.dirty[j] = 1; } if (ey === 0) { const j = mod(((cy / cc) | 0) - 1, CHUNK_N) * CHUNK_N + ((cx / cc) | 0); D.dirty[j] = 1; } if (ex === 0 && ey === 0) D.dirty[mod(((cy / cc) | 0) - 1, CHUNK_N) * CHUNK_N + mod(((cx / cc) | 0) - 1, CHUNK_N)] = 1; };
// Bürstenstrich: Kapsel von (x0,z0) nach (x1,z1), Breite w (m), rate = Einheiten je Zelle in diesem Schritt. Gibt entfernte kg zurück; limitKg begrenzt (Tank voll).
export function sweep(D, x0, z0, x1, z1, w, rate, limitKg = Infinity) {
  const g = D.g; const r = w / 2; const rc = r / CELL; const ax = x0 / CELL; const az = z0 / CELL; const bx = x1 / CELL; const bz = z1 / CELL; const dx = bx - ax; const dz = bz - az; const l2 = dx * dx + dz * dz;
  const xa = Math.floor(Math.min(ax, bx) - rc); const xb = Math.ceil(Math.max(ax, bx) + rc); const za = Math.floor(Math.min(az, bz) - rc); const zb = Math.ceil(Math.max(az, bz) + rc);
  const rate8 = Math.max(1, Math.round(rate)); let removed = 0; const limit = limitKg / KG_PER_UNIT; const rr = rc * rc;
  for (let z = za; z <= zb; z++) {
    const row = mod(z, GRID) * GRID;
    for (let x = xa; x <= xb; x++) {
      const px = x + 0.5 - ax; const pz = z + 0.5 - az; let t = l2 > 0 ? (px * dx + pz * dz) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; const qx = px - t * dx; const qz = pz - t * dz; if (qx * qx + qz * qz > rr) continue;
      const cx = mod(x, GRID); const i = row + cx; const v = g[i]; if (!v) continue;
      const take = Math.min(v, rate8, limit - removed); if (take <= 0) continue; g[i] = v - take; removed += take; D.blk[blkOf(i)] -= take; markDirty(D, cx, i >> GRID_BITS);
    }
  }
  D.remaining -= removed; return removed * KG_PER_UNIT;
}
// Bürstenkopf als Balken: Mitte (x, z), Blickwinkel a, Breite w quer, Tiefe d längs. Geputzt wird nur, was der Balken zwischen zwei Stellungen überstreicht.
// Randzellen werden nur anteilig sauber (Bedeckung 0..255): So bleibt die Bahnkante auch schräg zum Raster glatt statt treppig.
let barBuf = new Uint8Array(1 << 16);
export function sweepBar(D, x0, z0, a0, x1, z1, a1, w, d, rate, limitKg = Infinity) {
  const g = D.g; let da = (a1 - a0) % (Math.PI * 2); if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2; const r = Math.hypot(w, d) / 2 + CELL; const steps = Math.max(1, Math.min(64, Math.ceil(Math.max(Math.hypot(x1 - x0, z1 - z0), Math.abs(da) * w / 2) / (CELL * 0.75))));
  const xa = Math.floor((Math.min(x0, x1) - r) / CELL); const xb = Math.ceil((Math.max(x0, x1) + r) / CELL); const za = Math.floor((Math.min(z0, z1) - r) / CELL); const zb = Math.ceil((Math.max(z0, z1) + r) / CELL); const bw = xb - xa + 1; const bh = zb - za + 1; if (bw * bh > barBuf.length) barBuf = new Uint8Array(bw * bh * 2); else barBuf.fill(0, 0, bw * bh);
  const hw = w / 2; const hd = d / 2; const rc = Math.ceil(r / CELL); const inv = 1 / CELL;
  for (let s = 0; s <= steps; s++) { const t = s / steps; const cx = x0 + (x1 - x0) * t; const cz = z0 + (z1 - z0) * t; const a = a0 + da * t; const vx = Math.sin(a); const vz = Math.cos(a); const ccx = Math.round(cx / CELL); const ccz = Math.round(cz / CELL);
    for (let z = Math.max(za, ccz - rc); z <= Math.min(zb, ccz + rc); z++) for (let x = Math.max(xa, ccx - rc); x <= Math.min(xb, ccx + rc); x++) { const dx = (x + 0.5) * CELL - cx; const dz = (z + 0.5) * CELL - cz; const lon = dx * vx + dz * vz; const lat = dx * vz - dz * vx; const c0 = (hw - Math.abs(lat)) * inv + 0.5; if (c0 <= 0) continue; const c1 = (hd - Math.abs(lon)) * inv + 0.5; if (c1 <= 0) continue; const c = c0 < c1 ? c0 : c1; const cov = c >= 1 ? 255 : (c * 255) | 0; const k = (z - za) * bw + (x - xa); if (cov > barBuf[k]) barBuf[k] = cov; } }
  const rate8 = Math.max(1, Math.round(rate)); let removed = 0; const limit = limitKg / KG_PER_UNIT;
  for (let z = 0; z < bh; z++) { const row = mod(z + za, GRID) * GRID; for (let x = 0; x < bw; x++) { const cov = barBuf[z * bw + x]; if (!cov) continue; const cx = mod(x + xa, GRID); const i = row + cx; const v = g[i]; const rest = 255 - cov; if (v <= rest) continue; const take = Math.min(v - rest, rate8, limit - removed); if (take <= 0) continue; g[i] = v - take; removed += take; D.blk[blkOf(i)] -= take; markDirty(D, cx, i >> GRID_BITS); } }
  D.remaining -= removed; return removed * KG_PER_UNIT;
}
// Rechteck ohne Abrechnung säubern (Stützpunkt, Wege beim Neustart)
export function cleanRect(D, cx, cz, hx, hz) { for (let z = Math.floor((cz - hz) / CELL); z < Math.ceil((cz + hz) / CELL); z++) for (let x = Math.floor((cx - hx) / CELL); x < Math.ceil((cx + hx) / CELL); x++) { const i = mod(z, GRID) * GRID + mod(x, GRID); if (g8(D, i)) { D.remaining -= D.g[i]; D.blk[blkOf(i)] -= D.g[i]; D.g[i] = 0; markDirty(D, mod(x, GRID), mod(z, GRID)); } } }
const g8 = (D, i) => D.g[i] !== 0;
export const percentClean = (D) => Math.max(0, 100 * (1 - D.remaining / D.total));
export const dustAt = (D, x, z) => D.g[mod(Math.floor(z / CELL), GRID) * GRID + mod(Math.floor(x / CELL), GRID)];
// Vorgefertigter Stützpunkt: Pad, Fahrbahnen, ein paar schon geputzte Bahnen
export function prepareBase(D) { cleanBase(D); D.total = D.remaining; }
// Flächen des Stützpunkts; läuft auch nach dem Laden, falls ein alter Spielstand dort noch Staub hat
export function cleanBase(D) { const S = BASE.station; const T = BASE.trader; cleanRect(D, S.x, S.z, 24, 15); cleanRect(D, S.x - 40, S.z - 2, 14, 11); cleanRect(D, S.x, S.z + 34, 86, 3.2); cleanRect(D, T.x - 2, T.z - 4, 24, 14); cleanRect(D, BASE.garage.x, BASE.garage.z, 16, 11); cleanRect(D, LOT_C.x, LOT_C.z, LOT_C.half + 1, LOT_C.half + 1); }

// Speichern: nur angefasste Kacheln, Lauflängen + Base64 (0..255 als Paare Wert/Anzahl). Ein leerer/voller Mond braucht wenige Bytes.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function toB64(u8, n) { let s = ''; for (let i = 0; i < n; i += 3) { const a = u8[i]; const b = i + 1 < n ? u8[i + 1] : 0; const c = i + 2 < n ? u8[i + 2] : 0; s += B64[a >> 2] + B64[((a & 3) << 4) | (b >> 4)] + (i + 1 < n ? B64[((b & 15) << 2) | (c >> 6)] : '=') + (i + 2 < n ? B64[c & 63] : '='); } return s; }
function fromB64(s) { const inv = fromB64.t || (fromB64.t = (() => { const t = new Int16Array(128).fill(-1); for (let i = 0; i < 64; i++) t[B64.charCodeAt(i)] = i; return t; })()); const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0; const n = (s.length / 4) * 3 - pad; const u = new Uint8Array(n); let j = 0; for (let i = 0; i < s.length; i += 4) { const a = inv[s.charCodeAt(i)]; const b = inv[s.charCodeAt(i + 1)]; const c = inv[s.charCodeAt(i + 2)]; const d = inv[s.charCodeAt(i + 3)]; if (j < n) u[j++] = (a << 2) | (b >> 4); if (j < n) u[j++] = ((b & 15) << 4) | ((c < 0 ? 0 : c) >> 2); if (j < n) u[j++] = ((c < 0 ? 0 : c & 3) << 6) | (d < 0 ? 0 : d); } return u; }
export function encodeChunk(D, c) {
  const cy = (c / CHUNK_N) | 0; const cx = c % CHUNK_N; const buf = new Uint8Array(CHUNK_CELLS * CHUNK_CELLS * 2 + 4); let n = 0; let val = -1; let run = 0;
  for (let y = 0; y < CHUNK_CELLS; y++) { const row = (cy * CHUNK_CELLS + y) * GRID + cx * CHUNK_CELLS; for (let x = 0; x < CHUNK_CELLS; x++) { const v = D.g[row + x]; if (v === val && run < 255) run++; else { if (run) { buf[n++] = val; buf[n++] = run; } val = v; run = 1; } } }
  if (run) { buf[n++] = val; buf[n++] = run; } return toB64(buf, n);
}
export function decodeChunk(D, c, s, keepClean = false) { // keepClean: schon Geputztes bleibt sauber (Mitspieler, der gerade noch Kacheln bekommt)
  const u = fromB64(s); const cy = (c / CHUNK_N) | 0; const cx = c % CHUNK_N; let i = 0; let run = 0; let val = 0;
  for (let y = 0; y < CHUNK_CELLS; y++) { const row = (cy * CHUNK_CELLS + y) * GRID + cx * CHUNK_CELLS; for (let x = 0; x < CHUNK_CELLS; x++) { if (!run) { val = u[i++]; run = u[i++]; } run--; const nv = keepClean && D.g[row + x] < val ? D.g[row + x] : val; const dv = nv - D.g[row + x]; D.remaining += dv; D.blk[blkOf(row + x)] += dv; D.g[row + x] = nv; } }
  D.dirty[c] = 1; D.touched[c] = 1; D.dirty[cy * CHUNK_N + mod(cx - 1, CHUNK_N)] = 1; D.dirty[mod(cy - 1, CHUNK_N) * CHUNK_N + cx] = 1; D.dirty[mod(cy - 1, CHUNK_N) * CHUNK_N + mod(cx - 1, CHUNK_N)] = 1;
}
export function encodeDust(D) { const o = {}; for (let c = 0; c < D.touched.length; c++) if (D.touched[c]) o[c] = encodeChunk(D, c); return o; }
export function decodeDust(D, o) { for (const k of Object.keys(o || {})) decodeChunk(D, Number(k), o[k]); }

// ---------------- Katalog ----------------
// Werkzeuge: w = Bahnbreite (m), d = Tiefe des Bürstenkopfs (m), speed = Gehtempo beim Putzen (m/s), kind = Pose/Modell. Die Putzkraft reicht genau für einen Durchgang bei vollem Tempo.
export const TOOLS = [
  { id: 'brush', name: 'Zahnbürste', kind: 'brush', w: 0.3, d: 0.2, speed: 1.5, price: 0, desc: 'Standardausrüstung. Der Vorstand glaubt an dich.' },
  { id: 'hand', name: 'Handfeger „Kehrwoche“', kind: 'hand', w: 0.62, d: 0.2, speed: 1.35, price: 90, desc: 'Doppelt so breit. Fühlt sich an wie eine Beförderung.' },
  { id: 'broom', name: 'Schrubber „Orange 1“', kind: 'broom', w: 1.05, d: 0.24, speed: 1.6, price: 320, desc: 'Der Klassiker der Mondreinigung. Endlich im Stehen putzen!' },
  { id: 'pusher', name: 'Schiebekehrer „Mondmäher“', kind: 'pusher', w: 1.35, d: 0.7, speed: 1.75, price: 750, desc: 'Mit Motor und zwei Rotationsbürsten. Macht Lärm, Staub und gute Laune.' },
  { id: 'wide', name: 'Breitschieber XL', kind: 'broom', w: 1.7, d: 0.24, speed: 1.7, price: 1400, desc: 'Schiebt, was geschoben werden muss.' },
  { id: 'vac', name: 'Handsauger „Staubi 3000“', kind: 'vac', w: 2.3, d: 0.3, speed: 2.1, price: 5200, desc: 'Saugt alles weg. Auch Erinnerungen an die Zahnbürste.' },
  { id: 'drill', name: 'Bohrer „Mondbeißer“', kind: 'drill', w: 2.4, d: 0.35, speed: 2.2, price: 16000, drill: true, desc: 'Knackt Kristallbrocken und putzt nebenbei. Laut, aber ehrlich.' },
  { id: 'jet', name: 'Plasma-Großsauger', kind: 'vac', w: 3.4, d: 0.4, speed: 2.6, price: 62000, drill: true, desc: 'Vom Zoll nicht geprüft. Bohrt auch.' },
];
export const PACKS = [
  { id: 'pack0', name: 'Rucksack Standard', kg: 3, price: 0, desc: 'Fasst etwa eine Handvoll Mond.' },
  { id: 'pack1', name: 'Rucksack Plus', kg: 7, price: 60, desc: 'Mehr Staub, weniger Laufwege.' },
  { id: 'pack2', name: 'Tankrucksack 20', kg: 20, price: 240, desc: 'Sitzt wie ein voller Wäschekorb.' },
  { id: 'pack3', name: 'Tankrucksack 60', kg: 60, price: 1100, desc: 'Deine Bandscheiben sind auf der Erde geblieben.' },
  { id: 'pack4', name: 'Doppeltank 180', kg: 180, price: 6400, desc: 'Du gehst jetzt seitwärts durch Türen.' },
  { id: 'pack5', name: 'Fusionstank 500', kg: 500, price: 34000, desc: 'Verdichtet Staub. Niemand weiß, wohin.' },
];
// Fahrzeuge: w = Bürstenbreite (0 = keine), speed m/s, tank kg, seats, model
export const VEHICLES = [
  { id: 'trike', name: 'Kehrtrike', w: 1.9, d: 0.4, speed: 8, tank: 120, seats: 1, price: 2600, desc: 'Aufsitz-Kehrmaschine. Dein erster Dienstwagen, Glückwunsch.' },
  { id: 'bus', name: 'Lunar-Bus', w: 2.3, d: 0.4, speed: 15, tank: 600, seats: 3, price: 12000, desc: 'Drei Sitze, Dachträger, Heckbesen. Holt die faulen Kollegen ab.' },
  { id: 'truck', name: 'Mondkehrer LS-3', w: 4.6, d: 1.3, speed: 11, tank: 2600, seats: 2, price: 58000, desc: 'Drei Rotationsbürsten. Das Ende jedes Staubkorns.' },
];
// Helfer: arbeiten selbst, bringen den Staub zum Händler (Verkauf läuft automatisch)
export const HELPERS = [
  { id: 'robo', name: 'Saugrobi', model: 'robo', reach: 0.54, w: 0.8, speed: 1.8, tank: 25, rate: 1200, price: 1000, desc: 'Spürt jeden Staubfleck auf, gibt nie auf. Fährt auch gegen Steine.' },
  { id: 'crew', name: 'Putzkollege', model: 'crew', reach: 1.28, w: 1.05, speed: 2.2, tank: 40, rate: 1200, price: 5000, desc: 'Echter Kollege mit Schrubber. Will Kaffee, bekommt keinen.' },
  { id: 'robo2', name: 'Großsaugrobi', model: 'robo2', reach: 0.9, w: 2.4, speed: 4.2, tank: 220, rate: 1600, price: 10000, desc: 'Automatischer Großsauger. Ersetzt drei Kollegen und den Betriebsrat.' },
];
// Station: einmalige Ausbauten (mul = Verkaufspreis-Faktor, zusätzlich)
export const STATION_UP = [
  { id: 'contract1', name: 'Erdvertrag Stufe 1', price: 500, mul: 0.15, desc: '+15 % auf jeden Staubverkauf. Kosmetikfirmen zahlen gut.' },
  { id: 'turbo', name: 'Bürsten-Schärfstation', price: 1800, toolSpeed: 1.2, desc: 'Alle Handwerkzeuge +20 % Tempo.' },
  { id: 'contract2', name: 'Erdvertrag Stufe 2', price: 7500, mul: 0.3, desc: '+30 % auf jeden Staubverkauf. Mondstaub ist jetzt Trend-Peeling.' },
  { id: 'op_north', name: 'Außenposten Nord', price: 4000, desc: 'Verkaufstrichter auf der Nordseite des Mondes.' },
  { id: 'op_east', name: 'Außenposten Ost', price: 9000, desc: 'Verkaufstrichter auf der Ostseite.' },
  { id: 'op_far', name: 'Außenposten Rückseite', price: 22000, desc: 'Verkaufstrichter dort, wo die Erde nie hinsieht.' },
  { id: 'contract3', name: 'Erdvertrag Stufe 3', price: 90000, mul: 0.6, desc: '+60 % auf jeden Staubverkauf. Die ganze Erde peelt mit Mond.' },
];
export const COMPANY = [{ at: 0, name: 'Ein-Mann-Putztrupp' }, { at: 1500, name: 'Kleingewerbe Mondglanz' }, { at: 15000, name: 'Mondglanz GmbH' }, { at: 150000, name: 'Mondglanz AG' }, { at: 1200000, name: 'Lunar Surface Division' }];
export const MILESTONES = [0.02, 0.1, 0.5, 1, 2.5, 5, 10, 25, 50, 75, 100]; // Prozent geputzt -> Prämie
export const milestoneBonus = (p) => Math.round(120 * Math.pow(p, 1.25) + 80);
export const CRYSTAL_KG_VALUE = 900; // Credits je Kristallbrocken (Grundwert)
export const BASE_PRICE = 9; // Credits je kg

export const allItems = () => [...TOOLS, ...PACKS, ...VEHICLES, ...STATION_UP];
export const itemById = (id) => allItems().find((i) => i.id === id) || HELPERS.find((h) => h.id === id) || null;

// ---------------- Wirtschaft (Team-Kasse, auf dem Host maßgeblich) ----------------
export function createEconomy() { return { credits: 0, earned: 0, soldKg: 0, owned: { brush: 1, pack0: 1 }, helpers: { robo: 0, crew: 0, robo2: 0 }, milestones: 0, crystals: 0, contrib: {}, bestTool: 'brush', up: {}, inv: {}, guide: 0, seen: {} }; }
export function priceMul(E) { let m = 1; for (const s of STATION_UP) if (s.mul && E.owned[s.id]) m += s.mul; return m; }
export const marketWave = (t) => 1 + 0.12 * Math.sin(t / 97) + 0.06 * Math.sin(t / 31 + 1.3); // Kurs schwankt langsam
export const pricePerKg = (E, t) => BASE_PRICE * priceMul(E) * marketWave(t);
export const companyOf = (E) => { let c = COMPANY[0]; for (const x of COMPANY) if (E.earned >= x.at) c = x; return c; };
export const nextCompany = (E) => COMPANY.find((x) => E.earned < x.at) || null;
export const toolMul = (E) => (E.owned.turbo ? 1.2 : 1);
export const packKg = (E) => { let m = 0; for (const p of PACKS) if (E.owned[p.id]) m = Math.max(m, p.kg); return m; };
export function sell(E, kg, t, who = 'host') { if (!(kg > 0)) return 0; const c = Math.round(kg * pricePerKg(E, t)); E.credits += c; E.earned += c; E.soldKg += kg; E.contrib[who] = (E.contrib[who] || 0) + kg; return c; }
export function addCredits(E, c) { E.credits += c; E.earned += c; return c; }
export const sellGoods = (E, value, t) => addCredits(E, Math.round(value * priceMul(E) * marketWave(t)));
// Upgrade-Station: jedes Werkzeug und Fahrzeug einzeln verbessern
export const UP_MAX = 5;
export const UP_TOOL = [{ k: 'w', name: 'Breite', pct: 12 }, { k: 's', name: 'Tempo', pct: 10 }];
export const UP_VEH = [{ k: 'v', name: 'Motor', pct: 10 }, { k: 't', name: 'Tank', pct: 35 }, { k: 'b', name: 'Bürsten', pct: 10 }];
export const upLevel = (E, id, k) => ((E.up || {})[id] || {})[k] || 0;
export const upCost = (item, lvl) => Math.round(Math.max(40, item.price * 0.22) * Math.pow(1.75, lvl));
export const fullRate = (speed, d) => (255 * speed / d) * 1.15; // Einheiten je Zelle und Sekunde: ein Durchgang bei vollem Tempo reicht
export const toolOsc = (T) => ({ brush: 0.05, hand: 0.05, broom: 0.07, vac: 0.08 }[T.kind] || 0); // Hin und Her des Kopfs, gehört zur Bahnbreite
export function toolStats(E, T) { const w = 1 + upLevel(E, T.id, 'w') * 0.12; const s = 1 + upLevel(E, T.id, 's') * 0.1; const speed = T.speed * s * toolMul(E); return { w: T.w * w, speed, d: T.d, rate: fullRate(speed, T.d) }; }
export function vehStats(E, V) { const s = 1 + upLevel(E, V.id, 'v') * 0.1; const t = 1 + upLevel(E, V.id, 't') * 0.35; const b = 1 + upLevel(E, V.id, 'b') * 0.1; return { ...V, speed: V.speed * s, tank: V.tank * t, w: V.w * b, rate: fullRate(V.speed * s, V.d) }; }
export function buyUpgrade(E, id, k) { const item = TOOLS.find((t) => t.id === id) || VEHICLES.find((v) => v.id === id); if (!item || !E.owned[id]) return { ok: false, msg: 'Erst kaufen' }; const lvl = upLevel(E, id, k); if (lvl >= UP_MAX) return { ok: false, msg: 'Höchste Stufe erreicht' }; const c = upCost(item, lvl); if (E.credits < c) return { ok: false, msg: 'Zu wenig Credits' }; E.credits -= c; E.up = E.up || {}; E.up[id] = { ...(E.up[id] || {}), [k]: lvl + 1 }; return { ok: true }; }
// Prüft, ob etwas gekauft werden kann; gibt Text zurück, warum nicht (oder null)
export function buyBlock(E, id) {
  const h = HELPERS.find((x) => x.id === id);
  if (h) return E.credits >= helperPrice(E, h) ? null : 'Zu wenig Credits';
  const it = allItems().find((i) => i.id === id); if (!it) return 'Gibt es nicht'; if (E.owned[id]) return 'Schon gekauft'; return E.credits >= it.price ? null : 'Zu wenig Credits';
}
export const helperPrice = (E, h) => h.price; // fester Preis, beliebig viele (seit 1.15.1)
export function buy(E, id) {
  const b = buyBlock(E, id); if (b) return { ok: false, msg: b };
  const h = HELPERS.find((x) => x.id === id);
  if (h) { E.credits -= helperPrice(E, h); E.helpers[id] = (E.helpers[id] || 0) + 1; return { ok: true, helper: true }; }
  const it = allItems().find((i) => i.id === id); E.credits -= it.price; E.owned[id] = 1; return { ok: true };
}
export function checkMilestones(E, pct) { const got = []; while (E.milestones < MILESTONES.length && pct >= MILESTONES[E.milestones]) { const p = MILESTONES[E.milestones]; const b = milestoneBonus(p); addCredits(E, b); got.push({ pct: p, bonus: b }); E.milestones++; } return got; }

// ---------------- Kristallbrocken: blaue Adern, nur mit Bohrer ----------------
export function buildCrystals(H, seed = 77, n = 90) { const r = mulberry(seed); const list = []; for (let i = 0; i < n; i++) { const x = r() * MOON_SIZE; const z = r() * MOON_SIZE; const dx = wrapDelta(x, BASE.station.x); const dz = wrapDelta(z, BASE.station.z); if (Math.hypot(dx, dz) < 160) { continue; } list.push({ i: list.length, x, z, y: heightAt(H, x, z), s: 0.8 + r() * 0.9, hp: 1, gone: false, value: Math.round(CRYSTAL_KG_VALUE * (0.7 + r() * 1.3)) }); } return list; }

// ---------------- Helfer: erzeugen; die Steuerung (Staub suchen, anfahren, folgen, entladen) steht unten bei stepHelper ----------------
export function sellPoints(E) { const p = [{ x: BASE.trader.x + 8, z: BASE.trader.z + 1 }]; for (const o of OUTPOSTS) if (E.owned[o.id]) p.push({ x: o.x + 4, z: o.z + 4 }); return p; }
export function nearestSell(E, x, z) { let best = null; let bd = Infinity; for (const p of sellPoints(E)) { const d = Math.hypot(wrapDelta(p.x, x), wrapDelta(p.z, z)); if (d < bd) { bd = d; best = p; } } return { point: best, dist: bd }; }
let helperSerial = 0;
export function createHelper(type, n = helperSerial++) {
  const T = HELPERS.find((h) => h.id === type); const a = (n * 2.399963) % (Math.PI * 2); const R = 60 + (n % 7) * 14;
  return { id: n, type, x: BASE.garage.x + Math.cos(a) * 6, z: BASE.garage.z + Math.sin(a) * 6, h: a, kg: 0, st: 'work', lane: 0, dir: 1, ax: BASE.station.x + Math.cos(a) * R, az: BASE.station.z + 40 + Math.sin(a) * R, t: 0, w: T.w, reach: T.reach, speed: T.speed, tank: T.tank, moved: 0 };
}
// ---------------- Helfer: fahren dorthin, wo Staub registriert ist ----------------
// Keine feste Route mehr. Ein Helfer sucht den nächsten Block mit Staub (Staub-Übersicht, 8 m) und die nächste staubige Zelle darin, fährt an einen Anlaufpunkt davor (seek),
// dreht sich auf der Stelle zum Ziel (align) und fährt mit dem Bürstenbalken gerade drüber (run). Danach folgt er dem Staub (clean: Fächer von Fühlern vor dem Balken).
// Ist vorn nichts mehr, sucht er neu, auch für den letzten Staubkorn. Mehrere Helfer verteilen sich (Blöcke werden kurz belegt), Stellen, an denen ein Helfer festhängt
// (Mauer), werden eine Weile gemieden. Nach dem Entladen geht es dorthin zurück, wo zuletzt Staub war. Direkt auf ein Ziel zuzufahren geht nicht: Liegt es innerhalb des Wendekreises, kreist der Helfer nur.
const angD = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const wrapCell = (d) => mod(d + GRID / 2, GRID) - GRID / 2;
export const blockAt = (x, z) => mod(Math.floor(z / (BLK * CELL)), BLK_N) * BLK_N + mod(Math.floor(x / (BLK * CELL)), BLK_N);
// Nächster Block mit Staub um (x, z). Sucht in Ringen von Blöcken (Welt ist ein Torus); sieht nur Blöcke, die nicht gesperrt und nicht von anderen Helfern belegt sind.
export function nearestDustBlock(D, x, z, id = 0, now = D.clock || 0, useClaims = true) {
  const B = BLK * CELL; const bx0 = Math.floor(mod(x, MOON_SIZE) / B); const bz0 = Math.floor(mod(z, MOON_SIZE) / B); let best = -1; let bestScore = Infinity; let found = -1;
  const consider = (bx, bz) => {
    const b = mod(bz, BLK_N) * BLK_N + mod(bx, BLK_N); if (!(D.blk[b] > 0)) return; const bad = D.bad.get(b); if (bad !== undefined && bad > now) return; if (useClaims) { const c = D.claim.get(b); if (c && c.id !== id && c.until > now) return; }
    const d = Math.hypot(wrapDelta((mod(bx, BLK_N) + 0.5) * B, x), wrapDelta((mod(bz, BLK_N) + 0.5) * B, z)); const score = d - 10 * (D.blk[b] / BLK_MAX); if (score < bestScore) { bestScore = score; best = b; }
  };
  for (let r = 0; r <= BLK_N >> 1; r++) {
    if (found >= 0 && r > found + 2) break; const before = best;
    if (r === 0) consider(bx0, bz0); else { for (let k = -r; k <= r; k++) { consider(bx0 + k, bz0 - r); consider(bx0 + k, bz0 + r); } for (let k = -r + 1; k <= r - 1; k++) { consider(bx0 - r, bz0 + k); consider(bx0 + r, bz0 + k); } }
    if (found < 0 && best !== before) found = r;
  }
  return best;
}
// Nächste Zelle mit Staub in einem Block (Meter) oder null; rechnet dabei die Blocksumme genau nach (heilt eine ungenaue Übersicht).
export function nearestDustCell(D, b, x, z) {
  const bx = b % BLK_N; const bz = (b / BLK_N) | 0; const g = D.g; const x0 = bx * BLK; const z0 = bz * BLK; const px = x / CELL; const pz = z / CELL; let sum = 0; let bd = Infinity; let bi = -1;
  for (let zz = 0; zz < BLK; zz++) { const row = (z0 + zz) * GRID + x0; const dz = wrapCell(z0 + zz + 0.5 - pz); for (let xx = 0; xx < BLK; xx++) { const v = g[row + xx]; if (!v) continue; sum += v; const dx = wrapCell(x0 + xx + 0.5 - px); const d = dx * dx + dz * dz; if (d < bd) { bd = d; bi = row + xx; } } }
  D.blk[b] = sum; if (bi < 0) return null; return { x: ((bi & (GRID - 1)) + 0.5) * CELL, z: ((bi >> GRID_BITS) + 0.5) * CELL, v: g[bi] };
}
const claimAround = (D, b, id, until) => { const bx = b % BLK_N; const bz = (b / BLK_N) | 0; if (D.claim.size > 3000) for (const [k, c] of D.claim) if (c.until <= D.clock) D.claim.delete(k); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) D.claim.set(mod(bz + j, BLK_N) * BLK_N + mod(bx + i, BLK_N), { id, until }); };
// Staub vor dem Balken: Fächer aus sieben Richtungen mit je neun Fühlern; gibt den Winkel mit dem meisten Staub zurück oder null
const FAN = [0, -0.4, 0.4, -0.8, 0.8, -1.25, 1.25]; const FEEL = [[0.35, 1], [1.1, 0.7], [2.2, 0.4]]; const SIDE = [-0.33, 0, 0.33];
function dustHeading(D, h) {
  let best = null; let bs = 0.03; for (const o of FAN) { const a = h.h + o; const sa = Math.sin(a); const ca = Math.cos(a); let s = 0; for (const [dist, wgt] of FEEL) for (const lat of SIDE) { const f = h.reach + dist; s += (dustAt(D, h.x + sa * f + ca * lat * h.w, h.z + ca * f - sa * lat * h.w) / 255) * wgt; } if (o === 0) s *= 1.25; if (s > bs) { bs = s; best = a; } }
  return best;
}
const TURN = 3.2; // rad/s: ein Helfer dreht in knapp einer Sekunde um
// dt-Schritt; strokes bekommt die Bürstenstriche (für Abgleich mit Mitspielern). Rückgabe: verkaufte kg (0 oder Tankinhalt)
// D.clock (Sekunden Spielzeit) gibt der Aufrufer vor; er stößt Helfer nach dem Schritt aus Mauern heraus (collideBlocks). Das merkt der Helfer am nächsten Schritt (h.ex/h.ez) und meidet die Stelle.
export function stepHelper(h, dt, D, E, strokes) {
  const px = h.x; const pz = h.z; const h0 = h.h; const now = D.clock || 0;
  if (h.st === 'dump') { const { point } = nearestSell(E, h.x, h.z); const dx = wrapDelta(point.x, h.x); const dz = wrapDelta(point.z, h.z); const d = Math.hypot(dx, dz); if (d < 2.5) { const kg = h.kg; h.kg = 0; h.st = 'work'; h.t = 0; h.mode = 'pick'; h.goal = null; return kg; } const v = h.speed * 1.5; h.h = Math.atan2(dx, dz); h.x += (dx / d) * v * dt; h.z += (dz / d) * v * dt; h.ex = h.x; h.ez = h.z; return 0; }
  // angestoßen? (der Aufrufer hat den Helfer aus einer Mauer geschoben) -> diese Stelle eine Weile meiden und woanders weitermachen
  // Auf der Anfahrt (seek) wird erst seitlich ausgewichen (kein Wegfinden, nur Umfahren an der Wand entlang); nach vielen Versuchen gilt das Ziel als unerreichbar.
  if (h.ex !== undefined) {
    h.push = (h.push || 0) * Math.exp(-dt / 1.5) + Math.hypot(wrapDelta(h.x, h.ex), wrapDelta(h.z, h.ez));
    if (h.push > 1.2) {
      h.push = 0;
      if (h.mode === 'seek' && h.goal) { if (now - (h.stuckAt || -99) > 25) h.stuck = 0; h.stuckAt = now; h.stuck = (h.stuck || 0) + 1; if (h.stuck > 9) { D.bad.set(h.goal.b, now + 90); h.mode = 'pick'; h.goal = null; h.stuck = 0; } else { h.detourT = 2.5; h.detourSide = (h.stuck > 4 ? -1 : 1) * (h.id % 2 ? 1 : -1); } }
      else { if (h.goal) D.bad.set(h.goal.b, now + 90); D.bad.set(blockAt(h.x + Math.sin(h.h) * 2, h.z + Math.cos(h.h) * 2), now + 90); h.mode = 'pick'; h.goal = null; h.h += (h.id % 2 ? 1 : -1) * (1.9 + ((h.bump = (h.bump || 0) + 1) % 3) * 0.4); }
    }
  }
  const bar = () => ({ x: h.x + Math.sin(h.h) * h.reach, z: h.z + Math.cos(h.h) * h.reach });
  // Ziel wählen: nächster Block mit Staub, dort die nächste staubige Zelle; ausgehend vom letzten Arbeitsplatz (nach dem Entladen) oder von hier
  if (h.mode === undefined || h.mode === 'pick') {
    const ox = h.homeX !== undefined ? h.homeX : h.x; const oz = h.homeZ !== undefined ? h.homeZ : h.z; h.goal = null;
    for (let tries = 0; tries < 6 && !h.goal; tries++) {
      let b = nearestDustBlock(D, ox, oz, h.id, now); if (b < 0) b = nearestDustBlock(D, ox, oz, h.id, now, false); if (b < 0) break; const q0 = bar(); const c = nearestDustCell(D, b, q0.x, q0.z);
      if (c) { const gx = wrapDelta(c.x, h.x); const gz = wrapDelta(c.z, h.z); const u = Math.hypot(gx, gz) > 0.3 ? Math.atan2(gx, gz) : h.h; const back = h.reach + 0.8; const sx = c.x - Math.sin(u) * back; const sz = c.z - Math.cos(u) * back;
        const inBar = Math.hypot(wrapDelta(c.x, q0.x), wrapDelta(c.z, q0.z)) < 0.3; // liegt schon unter dem Balken: einfach geradeaus drüberfahren
        h.goal = { x: c.x, z: c.z, b, u: inBar ? h.h : u, px: sx, pz: sz, start: inBar ? 'run' : 'seek', miss: (h.lastGoalB === b ? (h.goalMiss || 0) : 0) }; h.lastGoalB = b; h.stuck = 0; h.detourT = 0; claimAround(D, b, h.id, now + 25); h.seekMax = 40 + 2.2 * Math.hypot(wrapDelta(sx, h.x), wrapDelta(sz, h.z)) / h.speed; }
    }
    h.homeX = undefined; h.homeZ = undefined; h.mode = h.goal ? h.goal.start : 'idle'; h.seekT = 0; h.idleT = 0; h.run = 0;
  }
  if (h.mode === 'idle') { h.idleT = (h.idleT || 0) + dt; if (h.idleT > 3) h.mode = 'pick'; h.ex = h.x; h.ez = h.z; return 0; } // kein Staub gefunden: kurz warten, dann wieder schauen
  let want = h.h; let go = 1;
  if (h.mode === 'seek' || h.mode === 'align' || h.mode === 'run') {
    const G = h.goal; h.seekT += dt;
    if (dustAt(D, G.x, G.z) === 0) { h.mode = 'clean'; h.decT = 0; h.goalMiss = 0; } // die Zelle ist sauber (auch von jemand anderem)
    else if (h.seekT > (h.seekMax || 120)) { D.bad.set(G.b, now + 60); h.mode = 'pick'; }
    else if (h.mode === 'seek') { const dx = wrapDelta(G.px, h.x); const dz = wrapDelta(G.pz, h.z); const d = Math.hypot(dx, dz); if (d < 0.35) { h.mode = 'align'; } else { want = Math.atan2(dx, dz); if (h.detourT > 0) { h.detourT -= dt; want += h.detourSide * 1.4; } else if (Math.abs(angD(want, h.h)) > 0.6) go = 0; } }
    if (h.mode === 'align') { want = G.u; go = 0; if (Math.abs(angD(want, h.h)) < 0.12) { h.mode = 'run'; h.run = 0; } }
    else if (h.mode === 'run') { want = G.u; h.run += h.speed * dt; if (h.run > h.reach + 0.8 + 1.0) { h.goalMiss = (G.miss || 0) + 1; if (h.goalMiss >= 3) { D.bad.set(G.b, now + 20); h.goalMiss = 0; } h.mode = 'clean'; h.decT = 0; } } // drüber gefahren und trotzdem Staub: nach drei Versuchen später wieder
  }
  if (h.mode === 'clean') {
    h.decT = (h.decT || 0) - dt; if (h.decT <= 0) { h.decT = 0.12; h.want = dustHeading(D, h); if (h.want === null) { h.mode = 'pick'; h.homeX = h.x; h.homeZ = h.z; } } if (h.mode === 'clean') want = h.want;
  }
  if (h.mode === 'pick') { h.ex = h.x; h.ez = h.z; return 0; } // nächster Schritt wählt das Ziel (kein Sprung im selben Bild)
  const diff = angD(want, h.h); h.h += Math.max(-TURN * dt, Math.min(TURN * dt, diff)); h.h = Math.atan2(Math.sin(h.h), Math.cos(h.h)); if (h.mode === 'clean' && Math.abs(diff) > 0.8) go = 0.4;
  h.x += Math.sin(h.h) * h.speed * go * dt; h.z += Math.cos(h.h) * h.speed * go * dt; h.ex = h.x; h.ez = h.z;
  const room = h.tank - h.kg; if (room <= 0) { h.st = 'dump'; h.homeX = h.x; h.homeZ = h.z; return 0; }
  // Wie beim Spieler: Nur der Bürstenbalken vorn am Helfer putzt. Beim Wenden springt er ohne Bogen auf die neue Richtung.
  const turn = Math.abs(Math.atan2(Math.sin(h.h - h0), Math.cos(h.h - h0))) > 0.5; const a0 = turn ? h.h : h0; const x1 = h.x + Math.sin(h.h) * h.reach; const z1 = h.z + Math.cos(h.h) * h.reach; const x0 = turn ? x1 : px + Math.sin(a0) * h.reach; const z0 = turn ? z1 : pz + Math.cos(a0) * h.reach; const rate = fullRate(h.speed, 0.3) * dt + 2;
  const got = sweepBar(D, x0, z0, a0, x1, z1, h.h, h.w, 0.3, rate, room); h.kg += got; if (strokes) strokes.push([x0, z0, a0, x1, z1, h.h, h.w, 0.3, rate]);
  return 0;
}

// Kollision: Kreis gegen achsparallele Quader (Mondkoordinaten, Position frei laufend). Schiebt heraus; gibt true bei Kontakt.
export function collideBlocks(pos, r, blocks) {
  let hit = false;
  for (const b of blocks) {
    const bx = wrapNear(b.x, pos.x); const bz = wrapNear(b.z, pos.z); const dx = pos.x - bx; const dz = pos.z - bz; const ox = Math.abs(dx) - b.hx; const oz = Math.abs(dz) - b.hz; if (ox > r || oz > r) continue;
    const qx = Math.max(ox, 0); const qz = Math.max(oz, 0); const dd = Math.hypot(qx, qz); if (dd >= r) continue;
    hit = true;
    if (ox <= 0 && oz <= 0) { if (ox > oz) pos.x = bx + Math.sign(dx || 1) * (b.hx + r); else pos.z = bz + Math.sign(dz || 1) * (b.hz + r); } else if (dd > 1e-5) { const k = (r - dd) / dd; pos.x += Math.sign(dx) * qx * k; pos.z += Math.sign(dz) * qz * k; }
  }
  return hit;
}
export const fmtCr = (n) => Math.round(n).toLocaleString('de-DE');
// Automatische Auflösung: Zweimal hintereinander zu wenig Bilder pro Sekunde -> eine Stufe weniger Pixel. Zurück geht es nicht von selbst, sonst pendelt das Bild.
export const RES_STEPS = [1, 0.8, 0.65, 0.5]; export const RES_MIN_FPS = 42;
export function tuneRes(R, fps) { if (fps >= RES_MIN_FPS) { R.low = 0; return false; } R.low++; if (R.low < 2 || R.i >= RES_STEPS.length - 1) return false; R.i++; R.low = 0; return true; }
