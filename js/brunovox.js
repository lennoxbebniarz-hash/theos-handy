// Theos Seitenscheidel - Big Bruno kommt auf die Erde: der Asteroid als Dichteraster (ohne Darstellung, auch in Node testbar).
// Raster N³ Punkte im Abstand VS = 0,5 m, Mitte des Asteroiden im Ursprung. Dichte 0..255, Oberfläche bei 128; nahe der Oberfläche
// steigt die Dichte um 64 je Meter (so ist (128 - d) / 64 der Abstand zur Oberfläche in Metern, gut für Kollision und Strahlen).
// Abbauen = Kugel abziehen (min mit der Dichte „außerhalb der Kugel“). min ist vertauschbar: Mitspieler dürfen dieselben
// Eingriffe in anderer Reihenfolge anwenden und landen beim gleichen Raster. Alle Angaben nach außen sind in Metern.
// Material je 1-m-Würfel (aus dem Startwert erzeugt, nie gespeichert): 0 Gestein, 1 Eis, 2 Eisenerz, 3 Gold, 4 Kernkristall.
export const VS = 0.5; export const N = 224; export const H = N / 2; export const CH = 16; export const CN = N / CH; export const ISO = 128; export const MN = N / 2;
export const CELL3 = VS * VS * VS; export const GRID_V = 2; // Fassung des Rasters im Spielstand
export const MAT = { GESTEIN: 0, EIS: 1, EISEN: 2, GOLD: 3, KERN: 4 };
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
export const volOf = (d) => clamp((d - 64) / 128, 0, 1) * CELL3; // Kubikmeter fest in einem Rasterpunkt

export function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
// Wertrauschen in 3D (Gitter 1, weich interpoliert)
export function noise3(seed) {
  const P = new Uint8Array(514); const r = rng(seed); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 514; i++) P[i] = p[i & 255];
  const V = new Float32Array(256); for (let i = 0; i < 256; i++) V[i] = r();
  return (x, y, z) => { const X = Math.floor(x); const Y = Math.floor(y); const Z = Math.floor(z); let fx = x - X; let fy = y - Y; let fz = z - Z; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    const xi = X & 255; const yi = Y & 255; const zi = Z & 255; const a0 = P[xi] + yi; const a1 = P[xi + 1] + yi; const aa = P[a0] + zi; const ab = P[a0 + 1] + zi; const ba = P[a1] + zi; const bb = P[a1 + 1] + zi;
    const v000 = V[P[aa]]; const v100 = V[P[ba]]; const v010 = V[P[ab]]; const v110 = V[P[bb]]; const v001 = V[P[aa + 1]]; const v101 = V[P[ba + 1]]; const v011 = V[P[ab + 1]]; const v111 = V[P[bb + 1]];
    const a = v000 + (v100 - v000) * fx; const b = v010 + (v110 - v010) * fx; const c = v001 + (v101 - v001) * fx; const d = v011 + (v111 - v011) * fx; const e = a + (b - a) * fy; const f = c + (d - c) * fy; return e + (f - e) * fz; };
}
const fbm = (n, x, y, z, o = 4) => { let v = 0; let a = 0.5; let f = 1; let w = 0; for (let i = 0; i < o; i++) { v += a * n(x * f, y * f, z * f); w += a; a *= 0.5; f *= 2.03; } return v / w; };

// Form: Radius je Richtung (Tabelle Länge x Breite), Kartoffelform mit Beulen, großen und vielen kleinen Kratern
const LU = 256; const LV = 128;
function shapeTable(seed, R0) {
  const n = noise3(seed * 7 + 1); const r = rng(seed * 13 + 5); const T = new Float32Array(LU * LV);
  const craters = []; const add = (cnt, a0, a1, d0, d1) => { for (let i = 0; i < cnt; i++) { const u = r() * 2 - 1; const a = r() * Math.PI * 2; const s = Math.sqrt(1 - u * u); const ang = a0 + r() * (a1 - a0); craters.push({ x: s * Math.cos(a), y: u, z: s * Math.sin(a), ang, dep: d0 + r() * (d1 - d0), cs: Math.cos(Math.min(3.1, ang * 1.4)) }); } };
  add(6, 0.26, 0.46, 3.2, 6.5); add(40, 0.075, 0.17, 1.0, 2.6); add(150, 0.028, 0.062, 0.35, 1.0);
  for (let j = 0; j < LV; j++) for (let i = 0; i < LU; i++) {
    const th = (j + 0.5) / LV * Math.PI; const ph = i / LU * Math.PI * 2; const x = Math.sin(th) * Math.cos(ph); const y = Math.cos(th); const z = Math.sin(th) * Math.sin(ph);
    let k = 1 + 0.24 * (fbm(n, x * 1.1 + 3, y * 1.1 + 7, z * 1.1 + 1, 3) - 0.5) * 2 + 0.08 * (fbm(n, x * 3.2 + 9, y * 3.2, z * 3.2 + 4, 3) - 0.5) * 2;
    k *= 1 + 0.16 * x * x - 0.1 * y * y; // länglich
    let rad = R0 * k;
    for (const c of craters) { const dt = x * c.x + y * c.y + z * c.z; if (dt < c.cs) continue; const d = Math.acos(dt > 1 ? 1 : dt) / c.ang; if (d < 1.4) rad += d < 1 ? -c.dep * (1 - d * d) : c.dep * 0.3 * Math.sin((d - 1) / 0.4 * Math.PI); }
    T[j * LU + i] = rad;
  }
  return T;
}
function radiusAt(T, x, y, z, len) {
  const th = Math.acos(clamp(y / len, -1, 1)); let ph = Math.atan2(z, x); if (ph < 0) ph += Math.PI * 2;
  const u = ph / (Math.PI * 2) * LU; const v = th / Math.PI * LV - 0.5; const i0 = Math.floor(u); const fu = u - i0; const j0 = clamp(Math.floor(v), 0, LV - 1); const j1 = clamp(j0 + 1, 0, LV - 1); const fv = clamp(v - Math.floor(v), 0, 1);
  const a = T[j0 * LU + (i0 % LU)]; const b = T[j0 * LU + ((i0 + 1) % LU)]; const c = T[j1 * LU + (i0 % LU)]; const d = T[j1 * LU + ((i0 + 1) % LU)];
  return (a + (b - a) * fu) * (1 - fv) + (c + (d - c) * fu) * fv;
}

export function createAsteroid(seed = 1, { R0 = 40 } = {}) {
  const d = new Uint8Array(N * N * N); const m = new Uint8Array(MN * MN * MN); const T = shapeTable(seed, R0);
  const nR = noise3(seed * 29 + 9); const nA = noise3(seed * 31 + 2); const nB = noise3(seed * 37 + 3); const nC = noise3(seed * 41 + 4);
  const idx = (i, j, k) => (k * N + j) * N + i; let rmin = 1e9; let rmax = 0; for (let q = 0; q < T.length; q++) { if (T[q] < rmin) rmin = T[q]; if (T[q] > rmax) rmax = T[q]; }
  // Zerklüftung: Buckel (6 m) und Brocken (2 m), in Metern
  const rough = (x, y, z) => (fbm(nR, x * 0.16 + 5, y * 0.16 + 1, z * 0.16 + 8, 2) - 0.5) * 2.6 + (nR(x * 0.55 + 3, y * 0.55, z * 0.55 + 7) - 0.5) * 0.8;
  // Tiefe unter der ursprünglichen Oberfläche in Metern (außen negativ): daraus entsteht das Startraster, und der Fels weiß später, wo er „frisch“ ist
  const depth0 = (x, y, z) => { const len = Math.sqrt(x * x + y * y + z * z); if (len < 1e-6) return R0; return radiusAt(T, x, y, z, len) + rough(x, y, z) - len; };
  let vol = 0; const SH = 4.4; const r0 = Math.max(0, rmin - SH) ** 2; const r1 = (rmax + SH) * (rmax + SH);
  for (let k = 0; k < N; k++) { const z = (k - H) * VS; for (let j = 0; j < N; j++) { const y = (j - H) * VS; const yz = y * y + z * z; let q = idx(0, j, k); for (let i = 0; i < N; i++, q++) {
    const x = (i - H) * VS; const l2 = x * x + yz; if (l2 > r1) continue; if (l2 < r0) { d[q] = 255; vol += CELL3; continue; }
    const len = Math.sqrt(l2); const base = radiusAt(T, x, y, z, len) - len; if (base > SH) { d[q] = 255; vol += CELL3; continue; } if (base < -SH) continue;
    const v = clamp(Math.round(ISO + (base + rough(x, y, z)) * 64), 0, 255); d[q] = v; if (v) vol += volOf(v);
  } } }
  // Material in 1-m-Würfeln: große, klar getrennte Felder (rote Erzflächen, Eisfelder, Goldadern in Regionen, Kern ganz innen)
  for (let k = 0; k < MN; k++) { const z = (k * 2 + 0.5 - H) * VS; for (let j = 0; j < MN; j++) { const y = (j * 2 + 0.5 - H) * VS; for (let i = 0; i < MN; i++) {
    const x = (i * 2 + 0.5 - H) * VS; const l2 = x * x + y * y + z * z; if (l2 > r1) continue; const len = Math.sqrt(l2); let mt = MAT.GESTEIN;
    if (len < 7.5) mt = MAT.KERN;
    else if (Math.abs(fbm(nA, x * 0.085, y * 0.085, z * 0.085, 3) - 0.5) < 0.017 && fbm(nC, x * 0.04 + 31, y * 0.04, z * 0.04 - 7, 2) > 0.555) mt = MAT.GOLD;
    else if (fbm(nB, x * 0.105 + 11, y * 0.105, z * 0.105 + 5, 2) > 0.715 && len > R0 * 0.55) mt = MAT.EIS;
    else if (fbm(nC, x * 0.085, y * 0.085 + 9, z * 0.085, 2) > 0.72) mt = MAT.EISEN;
    m[(k * MN + j) * MN + i] = mt;
  } } }
  const A = { seed, R0, d, m, vol, vol0: vol, modified: new Uint8Array(CN * CN * CN), dirty: new Set(), idx, depth0 };
  A.matAt = (i, j, k) => m[((k >> 1) * MN + (j >> 1)) * MN + (i >> 1)];
  A.matAtPos = (x, y, z) => { const i = clamp(Math.round(x / VS + H), 0, N - 1); const j = clamp(Math.round(y / VS + H), 0, N - 1); const k = clamp(Math.round(z / VS + H), 0, N - 1); return A.matAt(i, j, k); };
  // Dichte an beliebiger Stelle (Meter), dreifach linear
  A.sample = (x, y, z) => {
    const fx = x / VS + H; const fy = y / VS + H; const fz = z / VS + H; const i = Math.floor(fx); const j = Math.floor(fy); const k = Math.floor(fz); if (i < 0 || j < 0 || k < 0 || i >= N - 1 || j >= N - 1 || k >= N - 1) return 0;
    const u = fx - i; const v = fy - j; const w = fz - k; const q = idx(i, j, k); const sN = N; const sNN = N * N;
    const c00 = d[q] + (d[q + 1] - d[q]) * u; const c10 = d[q + sN] + (d[q + sN + 1] - d[q + sN]) * u; const c01 = d[q + sNN] + (d[q + sNN + 1] - d[q + sNN]) * u; const c11 = d[q + sNN + sN] + (d[q + sNN + sN + 1] - d[q + sNN + sN]) * u;
    const c0 = c00 + (c10 - c00) * v; const c1 = c01 + (c11 - c01) * v; return c0 + (c1 - c0) * w;
  };
  // Richtung nach außen (Gegenteil des Dichteanstiegs), normiert
  A.normal = (x, y, z, out = { x: 0, y: 1, z: 0 }) => { const e = 0.45; let gx = A.sample(x - e, y, z) - A.sample(x + e, y, z); let gy = A.sample(x, y - e, z) - A.sample(x, y + e, z); let gz = A.sample(x, y, z - e) - A.sample(x, y, z + e); let l = Math.hypot(gx, gy, gz); if (l < 1e-6) { gx = x; gy = y; gz = z; l = Math.hypot(x, y, z) || 1; } out.x = gx / l; out.y = gy / l; out.z = gz / l; return out; };
  // Abstand zur Oberfläche in Metern (außen positiv), nur nahe der Oberfläche genau
  A.dist = (x, y, z) => (ISO - A.sample(x, y, z)) / 64;
  // Strahl: erster Treffer auf der Oberfläche
  A.raycast = (ox, oy, oz, dx, dy, dz, max = 30) => {
    let t = 0; if (A.sample(ox, oy, oz) >= ISO) return { t: 0, x: ox, y: oy, z: oz };
    const st = 0.15; while (t < max) { const t2 = t + st; const s = A.sample(ox + dx * t2, oy + dy * t2, oz + dz * t2); if (s >= ISO) { let a = t; let b = t2; for (let n = 0; n < 6; n++) { const c = (a + b) / 2; if (A.sample(ox + dx * c, oy + dy * c, oz + dz * c) >= ISO) b = c; else a = c; } return { t: b, x: ox + dx * b, y: oy + dy * b, z: oz + dz * b }; } t = t2; }
    return null;
  };
  // Abbauen: Kugel (Mitte x,y,z, Radius r, alles in Metern). Ergebnis: weg (m³) und je Material
  const touched = new Uint8Array(CN * CN * CN);
  const touch = (i, j, k) => { for (const a of [(i - 1) >> 4, (i + 1) >> 4]) for (const b of [(j - 1) >> 4, (j + 1) >> 4]) for (const c of [(k - 1) >> 4, (k + 1) >> 4]) if (a >= 0 && b >= 0 && c >= 0 && a < CN && b < CN && c < CN) touched[(c * CN + b) * CN + a] = 1; };
  // Schwebende Fitzel (2026-11-13, Lennox: „viele Fitzel hängen in der Luft“): Nach dem Abbauen im Eingriffsbereich kleine feste Inseln suchen,
  // die nirgends mehr am Rest hängen (6er-Nachbarschaft, höchstens CRUMB Punkte, berühren den Bereichsrand nicht), und mit abbauen.
  const CRUMB = 96; const seen = new Map(); const stack = []; const comp = [];
  function dropCrumbs(i0, i1, j0, j1, k0, k1, out) {
    i0 = Math.max(1, i0 - 1); i1 = Math.min(N - 2, i1 + 1); j0 = Math.max(1, j0 - 1); j1 = Math.min(N - 2, j1 + 1); k0 = Math.max(1, k0 - 1); k1 = Math.min(N - 2, k1 + 1); seen.clear();
    for (let k = k0 + 1; k < k1; k++) for (let j = j0 + 1; j < j1; j++) for (let i = i0 + 1; i < i1; i++) {
      const q0 = idx(i, j, k); if (d[q0] < ISO || seen.has(q0)) continue; stack.length = 0; comp.length = 0; stack.push(q0); seen.set(q0, 1); let open = false;
      while (stack.length) { const q = stack.pop(); comp.push(q); if (comp.length > CRUMB) { open = true; break; } const ii = q % N; const jj = ((q / N) | 0) % N; const kk = (q / (N * N)) | 0;
        if (ii <= i0 || ii >= i1 || jj <= j0 || jj >= j1 || kk <= k0 || kk >= k1) { open = true; break; }
        for (const nq of [q - 1, q + 1, q - N, q + N, q - N * N, q + N * N]) if (d[nq] >= ISO) { const s = seen.get(nq); if (s === 2) { open = true; break; } if (!s) { seen.set(nq, 1); stack.push(nq); } } if (open) break; }
      if (open) { for (const q of stack) seen.set(q, 2); for (const q of comp) seen.set(q, 2); continue; } // 2 = hängt am Rest: wer das berührt, hängt auch dran
      for (const q of comp) { const old = d[q]; const ii = q % N; const jj = ((q / N) | 0) % N; const kk = (q / (N * N)) | 0; d[q] = 63; const dv = volOf(old) - volOf(d[q]); out.vol += dv; out.mat[m[((kk >> 1) * MN + (jj >> 1)) * MN + (ii >> 1)]] += dv; touch(ii, jj, kk); }
      out.crumbs = (out.crumbs || 0) + comp.length;
    }
  }
  A.dig = (x, y, z, r) => {
    const out = { vol: 0, mat: [0, 0, 0, 0, 0] }; const R = r + 2.05; const gx = x / VS + H; const gy = y / VS + H; const gz = z / VS + H; const gr = R / VS;
    const i0 = Math.max(1, Math.floor(gx - gr)); const i1 = Math.min(N - 2, Math.ceil(gx + gr)); const j0 = Math.max(1, Math.floor(gy - gr)); const j1 = Math.min(N - 2, Math.ceil(gy + gr)); const k0 = Math.max(1, Math.floor(gz - gr)); const k1 = Math.min(N - 2, Math.ceil(gz + gr));
    if (i0 > i1 || j0 > j1 || k0 > k1) return out; let any = false; const R2 = R * R;
    for (let k = k0; k <= k1; k++) { const dz = (k - H) * VS - z; for (let j = j0; j <= j1; j++) { const dy = (j - H) * VS - y; const dyz = dy * dy + dz * dz; if (dyz > R2) continue; let q = idx(i0, j, k); for (let i = i0; i <= i1; i++, q++) {
      const old = d[q]; if (!old) continue; const dx = (i - H) * VS - x; const d2 = dx * dx + dyz; if (d2 > R2) continue; const f = ISO + (Math.sqrt(d2) - r) * 64; if (f >= old) continue; const nv = f <= 0 ? 0 : Math.round(f); if (nv >= old) continue;
      d[q] = nv; const dv = volOf(old) - volOf(nv); out.vol += dv; out.mat[m[((k >> 1) * MN + (j >> 1)) * MN + (i >> 1)]] += dv; any = true;
      const a0 = (i - 1) >> 4; const a1 = (i + 1) >> 4; const b0 = (j - 1) >> 4; const b1 = (j + 1) >> 4; const c0 = (k - 1) >> 4; const c1 = (k + 1) >> 4; touched[(c0 * CN + b0) * CN + a0] = 1; if (a1 !== a0 || b1 !== b0 || c1 !== c0) { touched[(c0 * CN + b0) * CN + a1] = 1; touched[(c0 * CN + b1) * CN + a0] = 1; touched[(c0 * CN + b1) * CN + a1] = 1; touched[(c1 * CN + b0) * CN + a0] = 1; touched[(c1 * CN + b0) * CN + a1] = 1; touched[(c1 * CN + b1) * CN + a0] = 1; touched[(c1 * CN + b1) * CN + a1] = 1; }
    } } }
    if (any) dropCrumbs(i0, i1, j0, j1, k0, k1, out);
    if (any) { A.vol -= out.vol; const ca0 = clamp((i0 - 1) >> 4, 0, CN - 1); const ca1 = clamp((i1 + 1) >> 4, 0, CN - 1); const cb0 = clamp((j0 - 1) >> 4, 0, CN - 1); const cb1 = clamp((j1 + 1) >> 4, 0, CN - 1); const cc0 = clamp((k0 - 1) >> 4, 0, CN - 1); const cc1 = clamp((k1 + 1) >> 4, 0, CN - 1);
      for (let ck = cc0; ck <= cc1; ck++) for (let cj = cb0; cj <= cb1; cj++) for (let ci = ca0; ci <= ca1; ci++) { const c = (ck * CN + cj) * CN + ci; if (touched[c]) { touched[c] = 0; A.dirty.add(c); A.modified[c] = 1; } } }
    return out;
  };
  // Neu zählen (nach dem Laden)
  A.recount = () => { let v = 0; for (let q = 0; q < d.length; q++) if (d[q]) v += volOf(d[q]); A.vol = v; return v; };
  // Geänderte Blöcke als Rohbytes (16³ Dichte je Block)
  A.exportChunks = () => { const out = []; for (let c = 0; c < A.modified.length; c++) { if (!A.modified[c]) continue; const ci = c % CN; const cj = Math.floor(c / CN) % CN; const ck = Math.floor(c / (CN * CN)); const b = new Uint8Array(CH * CH * CH); let p = 0; for (let k = 0; k < CH; k++) for (let j = 0; j < CH; j++) { const q = idx(ci * CH, cj * CH + j, ck * CH + k); b.set(d.subarray(q, q + CH), p); p += CH; } out.push([c, b]); } return out; };
  A.importChunk = (c, b) => { const ci = c % CN; const cj = Math.floor(c / CN) % CN; const ck = Math.floor(c / (CN * CN)); let p = 0; for (let k = 0; k < CH; k++) for (let j = 0; j < CH; j++) { const q = idx(ci * CH, cj * CH + j, ck * CH + k); d.set(b.subarray(p, p + CH), q); p += CH; } A.modified[c] = 1; for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const a = ci + di; const bb = cj + dj; const cc = ck + dk; if (a >= 0 && bb >= 0 && cc >= 0 && a < CN && bb < CN && cc < CN) A.dirty.add((cc * CN + bb) * CN + a); } };
  return A;
}

// Bytes <-> Base64 (für Spielstand und Netz)
export function toB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return typeof btoa === 'function' ? btoa(s) : Buffer.from(s, 'binary').toString('base64'); }
export function fromB64(b) { const s = typeof atob === 'function' ? atob(b) : Buffer.from(b, 'base64').toString('binary'); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
// Einfache Lauflängen-Kodierung (Paare: Anzahl 1..255, Wert); reicht für Blöcke mit viel 0 und 255
export function rle(u8) { const out = []; let i = 0; while (i < u8.length) { const v = u8[i]; let n = 1; while (i + n < u8.length && u8[i + n] === v && n < 255) n++; out.push(n, v); i += n; } return Uint8Array.from(out); }
export function unrle(r, len) { const out = new Uint8Array(len); let p = 0; for (let i = 0; i < r.length; i += 2) { out.fill(r[i + 1], p, p + r[i]); p += r[i]; } return out; }
// Geänderte Blöcke als ein Text: "c:base64;c:base64"
export function packChunks(A) { return A.exportChunks().map(([c, b]) => c + ':' + toB64(rle(b))).join(';'); }
export function unpackChunks(A, s) { if (!s) return 0; let n = 0; for (const part of s.split(';')) { const k = part.indexOf(':'); if (k < 0) continue; const c = Number(part.slice(0, k)); if (!(c >= 0 && c < CN * CN * CN)) continue; A.importChunk(c, unrle(fromB64(part.slice(k + 1)), CH * CH * CH)); n++; } A.recount(); return n; }
