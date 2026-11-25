// Theos Seitenscheidel - Big Bruno: alle Texturen entstehen beim Laden selbst (keine Dateien).
// Felstextur (kachelbar, vier Kanäle: Höhe mit Kieseln und Kratern, Risse, Flecken-Rauschen, Sprenkel), Sternenhimmel mit Milchstraße,
// Sonne, Feuer, Rauch, Leuchtpunkte, Zielklammern.
import * as THREE from './vendor/three.module.min.js';
import { noise3, rng } from './brunovox.js';

// Kachelbares Wertrauschen in 2D: Gitter mit Periode p
function tileNoise(seed) {
  const r = rng(seed); const T = new Float32Array(4096); for (let i = 0; i < 4096; i++) T[i] = r();
  const h = (x, y) => T[((x * 73 + y * 151 + ((x * y) & 63)) & 4095)];
  return (u, v, p) => { const X = u * p; const Y = v * p; const x0 = Math.floor(X); const y0 = Math.floor(Y); let fx = X - x0; let fy = Y - y0; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); const xa = ((x0 % p) + p) % p; const xb = (xa + 1) % p; const ya = ((y0 % p) + p) % p; const yb = (ya + 1) % p; const a = h(xa + p * 7, ya); const b = h(xb + p * 7, ya); const c = h(xa + p * 7, yb); const d = h(xb + p * 7, yb); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
}
// Fels: R Höhe, G Risse (1 = heil, 0 = Riss), B Flecken (weiches Rauschen), A Sprenkel (rundliche Flecken)
export function rockTexture(S = 1024) {
  const n = tileNoise(11); const n2 = tileNoise(29); const r = rng(77); const Hh = new Float32Array(S * S);
  const fb = (f, u, v, p, o) => { let s = 0; let a = 0.5; let w = 0; for (let i = 0; i < o; i++) { s += a * f(u, v, p << i); w += a; a *= 0.5; } return s / w; };
  // Kiesel (Buckel) und kleine Krater (Mulde mit Rand), kachelnd eingestempelt
  const splat = (cx, cy, rad, amp, pit) => { const q = Math.ceil(rad * (pit ? 1.4 : 1)); for (let y = -q; y <= q; y++) for (let x = -q; x <= q; x++) { const dd = Math.hypot(x, y) / rad; let hgt; if (pit) { if (dd > 1.4) continue; hgt = dd < 1 ? -amp * (1 - dd * dd) : amp * 0.3 * Math.sin((dd - 1) / 0.4 * Math.PI); } else { if (dd > 1) continue; hgt = amp * Math.sqrt(1 - dd * dd); } const k = (((cy + y) % S + S) % S) * S + (((cx + x) % S + S) % S); Hh[k] = pit ? Hh[k] + hgt : Math.max(Hh[k], hgt); } };
  for (let i = 0; i < 520; i++) { const b = r(); splat(Math.floor(r() * S), Math.floor(r() * S), 4 + b * b * b * 30, 0.22 + r() * 0.5, false); }
  for (let i = 0; i < 170; i++) { const b = r(); splat(Math.floor(r() * S), Math.floor(r() * S), 6 + b * b * 34, 0.25 + r() * 0.4, true); }
  // Zellen für Risse und Sprenkel (kachelnd)
  const cells = (K, seed) => { const q = rng(seed); const P = new Float32Array(K * K * 3); for (let i = 0; i < K * K; i++) { P[i * 3] = q(); P[i * 3 + 1] = q(); P[i * 3 + 2] = q(); } return (u, v) => { const X = u * K; const Y = v * K; const xi = Math.floor(X); const yi = Math.floor(Y); let f1 = 9; let f2 = 9; let id = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const cx = ((xi + dx) % K + K) % K; const cy = ((yi + dy) % K + K) % K; const c = (cy * K + cx) * 3; const px = xi + dx + P[c]; const py = yi + dy + P[c + 1]; const d = Math.hypot(X - px, Y - py); if (d < f1) { f2 = f1; f1 = d; id = P[c + 2]; } else if (d < f2) f2 = d; } return [f1, f2, id]; }; };
  const cA = cells(9, 5); const cB = cells(15, 9); const data = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) { const v = y / S; for (let x = 0; x < S; x++) { const u = x / S; const i = (y * S + x) * 4;
    const base = fb(n, u, v, 6, 5); const wu = u + (fb(n2, u, v, 5, 3) - 0.5) * 0.09; const wv = v + (fb(n2, u + 0.37, v + 0.61, 5, 3) - 0.5) * 0.09; // verzogen, damit Risse nicht wie Waben aussehen
    const hgt = 0.34 + 0.5 * (base - 0.5) + Hh[y * S + x] * 0.55 + (n(u, v, 96) - 0.5) * 0.06; data[i] = Math.max(0, Math.min(255, hgt * 255));
    const c = cA(wu, wv); const e = c[1] - c[0]; const thick = 0.035 + 0.05 * n2(u, v, 7); data[i + 1] = Math.max(0, Math.min(255, 255 * Math.min(1, e / thick) ** 1.5));
    data[i + 2] = 255 * (fb(n2, u, v, 4, 4) * 0.75 + n(u, v, 64) * 0.25);
    const sp = cB(wu + 0.2, wv + 0.4); const rad = sp[2] < 0.42 ? 0 : 0.16 + sp[2] * 0.3; data[i + 3] = rad ? Math.max(0, Math.min(255, 255 * (rad - sp[0]) / 0.07)) : 0;
  } }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true; return t;
}

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c, srgb = true) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
export function glowTexture() { const c = canvas(64, 64); const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return tex(c); }
export function flareTexture() { // Lichtstern mit Strahlen (Mündungsfeuer, Einschlag)
  const c = canvas(256, 256); const x = c.getContext('2d'); x.translate(128, 128); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) { x.save(); x.rotate(i * Math.PI / 8 + (i % 2) * 0.1); const len = i % 2 ? 62 : 124; const g = x.createLinearGradient(-len, 0, len, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, len, i % 2 ? 3 : 5, 0, 0, 7); x.fill(); x.restore(); }
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 56); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-56, -56, 112, 112); return tex(c);
}
// Wolke aus Rauschen: außen ausgefranst, innen mit Löchern (für Feuer und Rauch). gain: Dichte, cut: wie viel wegfällt
function cloudTexture(seed, gain, cut) {
  const S = 128; const c = canvas(S, S); const x = c.getContext('2d'); const img = x.createImageData(S, S); const n = tileNoise(seed);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const u = i / S; const v = j / S; const dx = u - 0.5; const dy = v - 0.5; const r = Math.sqrt(dx * dx + dy * dy) * 2; const f = n(u, v, 4) * 0.5 + n(u, v, 8) * 0.3 + n(u, v, 16) * 0.2; const a = Math.max(0, Math.min(1, (Math.pow(Math.max(0, 1 - r * r), 1.4) * (0.25 + gain * f) - cut) * 1.6)); const p = (j * S + i) * 4; img.data[p] = img.data[p + 1] = img.data[p + 2] = 255; img.data[p + 3] = a * 255; }
  x.putImageData(img, 0, 0); return tex(c);
}
export function fireTexture() { return cloudTexture(5, 1.7, 0.22); }
export function smokeTexture() { return cloudTexture(8, 1.3, 0.12); }
export function ringTexture() { const c = canvas(256, 256); const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 60, 128, 128, 128); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.72, 'rgba(255,255,255,.12)'); g.addColorStop(0.9, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return tex(c); }
export function bracketTexture() { const c = canvas(64, 64); const x = c.getContext('2d'); x.strokeStyle = '#b6ff5a'; x.lineWidth = 5; x.lineCap = 'square'; for (const [a, b, sx, sy] of [[8, 8, 1, 1], [56, 8, -1, 1], [8, 56, 1, -1], [56, 56, -1, -1]]) { x.beginPath(); x.moveTo(a + sx * 14, b); x.lineTo(a, b); x.lineTo(a, b + sy * 14); x.stroke(); } return tex(c); }
export function sunTexture() {
  const c = canvas(512, 512); const x = c.getContext('2d'); x.translate(256, 256); x.globalCompositeOperation = 'lighter';
  let g = x.createRadialGradient(0, 0, 0, 0, 0, 256); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.06, 'rgba(255,252,240,1)'); g.addColorStop(0.16, 'rgba(255,236,200,.35)'); g.addColorStop(0.5, 'rgba(255,220,170,.07)'); g.addColorStop(1, 'rgba(255,200,150,0)'); x.fillStyle = g; x.fillRect(-256, -256, 512, 512);
  for (let i = 0; i < 12; i++) { x.save(); x.rotate(i * Math.PI / 6 + 0.2); const len = i % 3 === 0 ? 250 : 130; g = x.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(255,250,235,.55)'); g.addColorStop(1, 'rgba(255,240,220,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(0, -2.2); x.lineTo(len, 0); x.lineTo(0, 2.2); x.fill(); x.restore(); }
  return tex(c);
}
// Sternenhimmel als Kugeltextur: schwarzes All, Tausende Sterne, schwaches grau-violettes Band der Milchstraße
export function skyTexture() {
  const W = 4096; const Hh = 2048; const c = canvas(W, Hh); const x = c.getContext('2d'); x.fillStyle = '#010103'; x.fillRect(0, 0, W, Hh);
  const n = noise3(91); const lw = 512; const lh = 256; const tmp = canvas(lw, lh); const tx = tmp.getContext('2d'); const img = tx.createImageData(lw, lh); const bn = new THREE.Vector3(0.35, 0.62, -0.7).normalize();
  const fb = (px, py, pz, o) => { let s = 0; let a = 0.5; let f = 1; let w = 0; for (let i = 0; i < o; i++) { s += a * n(px * f, py * f, pz * f); w += a; a *= 0.5; f *= 2.1; } return s / w; };
  for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) { const th = (j + 0.5) / lh * Math.PI; const ph = (i + 0.5) / lw * Math.PI * 2; const dx = -Math.sin(th) * Math.cos(ph); const dy = Math.cos(th); const dz = Math.sin(th) * Math.sin(ph);
    const b = dx * bn.x + dy * bn.y + dz * bn.z; const band = Math.exp(-(b * b) / 0.045); const cl = fb(dx * 3 + 7, dy * 3 + 2, dz * 3 + 5, 5); const lane = fb(dx * 7 + 1, dy * 7 + 9, dz * 7, 4); const k = Math.max(0, band * (cl * 1.5 - 0.35) * (0.45 + lane * 0.9)) + Math.max(0, cl - 0.62) * 0.35; const tint = fb(dx * 2 + 4, dy * 2, dz * 2 + 8, 3);
    const p = (j * lw + i) * 4; img.data[p] = 2 + k * (58 + tint * 34); img.data[p + 1] = 2 + k * (50 + tint * 12); img.data[p + 2] = 5 + k * (72 - tint * 22); img.data[p + 3] = 255; }
  tx.putImageData(img, 0, 0); x.imageSmoothingQuality = 'high'; x.globalAlpha = 0.9; x.drawImage(tmp, 0, 0, W, Hh); x.globalAlpha = 1;
  const r = rng(404); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 15000; i++) { const u = r() * 2 - 1; const a = r() * Math.PI * 2; const s = Math.sqrt(1 - u * u); const dx = s * Math.cos(a); const dy = u; const dz = s * Math.sin(a); const b = dx * bn.x + dy * bn.y + dz * bn.z; if (r() > 0.4 + 0.6 * Math.exp(-(b * b) / 0.06)) continue;
    const th = Math.acos(dy); let ph = Math.atan2(dz, -dx); if (ph < 0) ph += Math.PI * 2; const px = ph / (Math.PI * 2) * W; const py = th / Math.PI * Hh; const q = r(); const rad = q > 0.994 ? 2.3 : q > 0.95 ? 1.4 : 0.55 + r() * 0.45; const st = 1 / Math.max(0.15, Math.sin(th)); const w = r(); const col = w < 0.2 ? [255, 214, 180] : w < 0.45 ? [185, 205, 255] : [245, 245, 255]; const al = (0.3 + r() * 0.7) * (q > 0.95 ? 1 : 0.8);
    x.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${al})`; x.beginPath(); x.ellipse(px, py, rad * st, rad, 0, 0, 7); x.fill();
    if (q > 0.994) { const g = x.createRadialGradient(px, py, 0, px, py, 9); g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},.45)`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(px, py, 9 * st, 9, 0, 0, 7); x.fill(); } }
  const t = tex(c); t.anisotropy = 4; return t;
}
// Schild mit Schrift (Leinwand)
export function signTexture(text, { w = 1024, h = 192, bg = '#16181c', fg = '#f2f1ec', accent = '#e0661e', font = '900 120px Bahnschrift, "Segoe UI", sans-serif', sub = '' } = {}) {
  const c = canvas(w, h); const x = c.getContext('2d'); if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); } if (accent) { x.fillStyle = accent; x.fillRect(0, h - 14, w, 14); }
  x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 - (sub ? 22 : 6), w - 40); if (sub) { x.font = '600 40px Bahnschrift, sans-serif'; x.fillStyle = accent || fg; x.fillText(sub, w / 2, h - 52, w - 40); } const t = tex(c); t.anisotropy = 8; return t;
}
