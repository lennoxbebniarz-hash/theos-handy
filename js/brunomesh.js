// Theos Seitenscheidel - Big Bruno: Oberfläche eines Rasterblocks bauen („Surface Nets“: ein Punkt je Zelle, die die Oberfläche schneidet,
// vier Punkte rund um jede geschnittene Kante werden zu einem Viereck). Ohne three.js, auch in Node testbar.
// Jeder Block besitzt die Kanten, die an seinen eigenen Rasterpunkten beginnen: Nachbarblöcke passen nahtlos aneinander.
// Je Punkt: Lage (Meter), Normale, Material-Anteile (Eis, Eisenerz, Gold, Kern), Tiefe unter der alten Oberfläche und Verschattung.
import { N, H, CH, CN, ISO, VS, MN } from './brunovox.js';

// Farben je Material (linear, 0..1) für Brocken und Funken
export const MAT_COL = [[0.27, 0.23, 0.18], [0.30, 0.62, 1.0], [0.42, 0.12, 0.07], [1.0, 0.68, 0.14], [0.62, 0.3, 1.0]];
const S = CH + 1; const MAXV = S * S * S; const vid = new Int32Array(MAXV); const P = new Float32Array(MAXV * 3); const Nn = new Float32Array(MAXV * 3); const Mw = new Uint8Array(MAXV * 4); const I = new Uint32Array(CH * CH * CH * 18); const corner = new Float32Array(8); const cnt = new Uint8Array(5);

export function meshChunk(A, c) {
  const ci = c % CN; const cj = Math.floor(c / CN) % CN; const ck = Math.floor(c / (CN * CN)); const d = A.d; const m = A.m; const NN = N * N;
  const x0 = ci * CH; const y0 = cj * CH; const z0 = ck * CH; let nv = 0; let ni = 0; vid.fill(-1);
  for (let k = z0 - 1; k < z0 + CH; k++) { if (k < 0 || k > N - 2) continue; for (let j = y0 - 1; j < y0 + CH; j++) { if (j < 0 || j > N - 2) continue; let q = (k * N + j) * N + x0 - 1; for (let i = x0 - 1; i < x0 + CH; i++, q++) { if (i < 0 || i > N - 2) continue;
    const c0 = d[q]; const c1 = d[q + 1]; const c2 = d[q + N]; const c3 = d[q + N + 1]; const c4 = d[q + NN]; const c5 = d[q + NN + 1]; const c6 = d[q + NN + N]; const c7 = d[q + NN + N + 1];
    const ins = (c0 >= ISO) + (c1 >= ISO) + (c2 >= ISO) + (c3 >= ISO) + (c4 >= ISO) + (c5 >= ISO) + (c6 >= ISO) + (c7 >= ISO); if (ins === 0 || ins === 8) continue;
    corner[0] = c0; corner[1] = c1; corner[2] = c2; corner[3] = c3; corner[4] = c4; corner[5] = c5; corner[6] = c6; corner[7] = c7;
    // Punkt: Mittel der Schnittpunkte auf den zwölf Zellkanten
    let sx = 0; let sy = 0; let sz = 0; let n = 0;
    for (let a = 0; a < 8; a++) for (let ax = 0; ax < 3; ax++) { const bit = 1 << ax; if (a & bit) continue; const va = corner[a]; const vb = corner[a | bit]; if ((va >= ISO) === (vb >= ISO)) continue; const t = (ISO - 0.5 - va) / (vb - va); /* Schnittpunkt bei 127,5: ganze Dichten liegen nie genau darauf, sonst fallen Punkte in einer Ecke zusammen */ sx += (a & 1) + (ax === 0 ? t : 0); sy += ((a >> 1) & 1) + (ax === 1 ? t : 0); sz += ((a >> 2) & 1) + (ax === 2 ? t : 0); n++; }
    const o = nv * 3; P[o] = (i - H + sx / n) * VS; P[o + 1] = (j - H + sy / n) * VS; P[o + 2] = (k - H + sz / n) * VS;
    let gx = (c1 + c3 + c5 + c7) - (c0 + c2 + c4 + c6); let gy = (c2 + c3 + c6 + c7) - (c0 + c1 + c4 + c5); let gz = (c4 + c5 + c6 + c7) - (c0 + c1 + c2 + c3); const l = Math.hypot(gx, gy, gz) || 1; Nn[o] = -gx / l; Nn[o + 1] = -gy / l; Nn[o + 2] = -gz / l;
    // Material-Anteile: welche Sorte haben die festen Ecken der Zelle?
    cnt[0] = cnt[1] = cnt[2] = cnt[3] = cnt[4] = 0; for (let a = 0; a < 8; a++) { if (corner[a] < ISO) continue; cnt[m[(((k + ((a >> 2) & 1)) >> 1) * MN + ((j + ((a >> 1) & 1)) >> 1)) * MN + ((i + (a & 1)) >> 1)]]++; }
    const w = 255 / ins; const o4 = nv * 4; Mw[o4] = cnt[1] * w; Mw[o4 + 1] = cnt[2] * w; Mw[o4 + 2] = cnt[3] * w; Mw[o4 + 3] = cnt[4] * w;
    vid[((k - z0 + 1) * S + (j - y0 + 1)) * S + (i - x0 + 1)] = nv++;
  } } }
  if (!nv) return null;
  const vix = (i, j, k) => vid[((k - z0 + 1) * S + (j - y0 + 1)) * S + (i - x0 + 1)];
  // Vierecke über die Kanten, die in diesem Block beginnen (Drehsinn: Vorderseite zeigt nach außen)
  // Drehsinn fest aus Kante und Seite (nicht aus der Lage der Punkte: die kippte bei verzerrten Zellen ganze Vierecke nach innen, die dann unsichtbar waren
  // und den Blick ins All freigaben). Die Diagonale wird so gewählt, dass beide Dreiecke möglichst gut nach außen zeigen (weniger Falten an Abbaukanten).
  const tri = (a, b, c2) => { const ax = P[a * 3]; const ay = P[a * 3 + 1]; const az = P[a * 3 + 2]; const ux = P[b * 3] - ax; const uy = P[b * 3 + 1] - ay; const uz = P[b * 3 + 2] - az; const vx = P[c2 * 3] - ax; const vy = P[c2 * 3 + 1] - ay; const vz = P[c2 * 3 + 2] - az; const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-12) return 0; return (nx * RX + ny * RY + nz * RZ) / l; };
  let RX = 0; let RY = 0; let RZ = 0;
  const quad = (a, b, c2, e, flip) => { if (a < 0 || b < 0 || c2 < 0 || e < 0) return; if (flip) { const t = b; b = e; e = t; } // jetzt zeigt a, b, c2, e nach außen
    RX = Nn[a * 3] + Nn[b * 3] + Nn[c2 * 3] + Nn[e * 3]; RY = Nn[a * 3 + 1] + Nn[b * 3 + 1] + Nn[c2 * 3 + 1] + Nn[e * 3 + 1]; RZ = Nn[a * 3 + 2] + Nn[b * 3 + 2] + Nn[c2 * 3 + 2] + Nn[e * 3 + 2];
    const s1 = Math.min(tri(a, b, c2), tri(a, c2, e)); const s2 = Math.min(tri(a, b, e), tri(b, c2, e));
    if (s1 >= s2) { I[ni++] = a; I[ni++] = b; I[ni++] = c2; I[ni++] = a; I[ni++] = c2; I[ni++] = e; } else { I[ni++] = a; I[ni++] = b; I[ni++] = e; I[ni++] = b; I[ni++] = c2; I[ni++] = e; } };
  for (let k = z0; k < z0 + CH; k++) { if (k > N - 2) continue; for (let j = y0; j < y0 + CH; j++) { if (j > N - 2) continue; let q = (k * N + j) * N + x0; for (let i = x0; i < x0 + CH; i++, q++) { if (i > N - 2) continue; const v0 = d[q] >= ISO;
    if (j >= 1 && k >= 1 && v0 !== (d[q + 1] >= ISO)) quad(vix(i, j, k), vix(i, j - 1, k), vix(i, j - 1, k - 1), vix(i, j, k - 1), !v0);
    if (i >= 1 && k >= 1 && v0 !== (d[q + N] >= ISO)) quad(vix(i, j, k), vix(i - 1, j, k), vix(i - 1, j, k - 1), vix(i, j, k - 1), v0);
    if (i >= 1 && j >= 1 && v0 !== (d[q + NN] >= ISO)) quad(vix(i, j, k), vix(i - 1, j, k), vix(i - 1, j - 1, k), vix(i, j - 1, k), !v0);
  } } }
  if (!ni) return null;
  // Nur benutzte Punkte behalten; Tiefe und Verschattung nur für sie rechnen
  const used = vid; used.fill(-1, 0, nv); let n = 0; for (let t = 0; t < ni; t++) { const v = I[t]; if (used[v] < 0) used[v] = n++; }
  const pos = new Float32Array(n * 3); const nrm = new Float32Array(n * 3); const mat = new Uint8Array(n * 4); const aux = new Float32Array(n * 2);
  for (let v = 0; v < nv; v++) { const u = used[v]; if (u < 0) continue; const px = P[v * 3]; const py = P[v * 3 + 1]; const pz = P[v * 3 + 2]; const nx = Nn[v * 3]; const ny = Nn[v * 3 + 1]; const nz = Nn[v * 3 + 2];
    pos[u * 3] = px; pos[u * 3 + 1] = py; pos[u * 3 + 2] = pz; nrm[u * 3] = nx; nrm[u * 3 + 1] = ny; nrm[u * 3 + 2] = nz; mat[u * 4] = Mw[v * 4]; mat[u * 4 + 1] = Mw[v * 4 + 1]; mat[u * 4 + 2] = Mw[v * 4 + 2]; mat[u * 4 + 3] = Mw[v * 4 + 3];
    const dep = A.depth0(px, py, pz); aux[u * 2] = dep < 0 ? 0 : dep > 30 ? 30 : dep;
    const d1 = A.dist(px + nx * 0.9, py + ny * 0.9, pz + nz * 0.9); const d2 = A.dist(px + nx * 2.4, py + ny * 2.4, pz + nz * 2.4); const occ = (1 - Math.min(1, Math.max(0, d1 / 0.9))) * 0.55 + (1 - Math.min(1, Math.max(0, d2 / 1.9))) * 0.45; aux[u * 2 + 1] = 1 - 0.7 * occ; }
  const idx = n > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); for (let t = 0; t < ni; t++) idx[t] = used[I[t]];
  return { pos, nrm, mat, aux, idx, tris: ni / 3 };
}
