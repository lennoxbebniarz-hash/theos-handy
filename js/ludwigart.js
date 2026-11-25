// Theos Seitenscheidel - Ludwig: Ludwigs großes Zimmer am Abend (zu Fuß begehbar), der große Tisch mit drei Stühlen, die Box in vier Stufen, der PC, die Straße vor dem Fenster, die Figuren.
// Alles entsteht hier im Code (Canvas-Texturen, einfache Körper), keine fremden Dateien. Maße in Metern; Kippen und Blättchen sind 1,5-mal so groß wie echt, damit man sie gut sieht.
import * as THREE from './vendor/three.module.min.js';
import { createSpielPerson as createPerson, createSpielfigur } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { buildDeko, dekoBoxes } from './ludwigdeko.js'; // mehr Leben im Zimmer (2026-11-20)

export const ROOM = { x0: -3.5, x1: 3.5, z0: -3.0, z1: 3.0, h: 2.6, t: 0.16 };
const DEKO_BOXES = dekoBoxes(ROOM); // Kommode, Nachttisch, Bücherregal, Sitzsack, Regal mit Aquarium, Gitarre, Wäschekorb
export const WIN = { x0: -0.85, x1: 0.85, y0: 0.95, y1: 2.15 }; // Fenster in der Rückwand, davor klopfen die Kunden
export const DOOR = { z0: 1.75, z1: 2.65, h: 2.05 }; // Tür in der rechten Wand
export const OUT_Y = -0.12; // draußen liegt der Boden etwas tiefer (Erdgeschoss)
// Quadratischer Tisch (2026-11-19): an jeder Seite ein Platz, die Box steht in der Mitte
export const TABLE = { x0: -0.85, x1: 0.85, z0: -0.75, z1: 0.95, y: 0.76, cx: 0, cz: 0.1 };
export const CIG = { len: 0.105, r: 0.0068, paperW: 0.056 };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Vier Plätze: 0 Rot (links), 1 Ludwig (vorn, blau), 2 Gelb (rechts), 3 Grün (hinten, zum Fenster).
// tx/tz zeigt vom Stuhl zum Tisch, face ist die Blickrichtung der Figur, rot die Drehung der Sachen auf dem Tisch.
// Lokal (wie beim vorderen Platz): x quer, +z zum Sitzenden hin. toWorld rechnet lokale Tischpunkte in Weltpunkte um.
const SEAT_R = 1.32;
export const SEATS = [[-1, 0], [0, 1], [1, 0], [0, -1]].map(([ox, oz]) => {
  const x = TABLE.cx + ox * SEAT_R; const z = TABLE.cz + oz * SEAT_R; const tx = -ox; const tz = -oz; const face = Math.atan2(tx, tz); const rot = face - Math.PI;
  const sx = x + tx * 0.76; const sz = z + tz * 0.76; const c = Math.cos(rot); const s = Math.sin(rot);
  const toWorld = (lx, y, lz) => V(sx + lx * c + lz * s, y, sz - lx * s + lz * c);
  return { x, z, tx, tz, face, rot, toWorld, spot: toWorld(0, TABLE.y + 0.0035, 0), booklet: toWorld(-0.25, TABLE.y + 0.003, -0.06), pouch: toWorld(0.23, TABLE.y + 0.003, -0.11) };
});
export const seatAt = (s, out) => [s.x - s.tx * out, s.z - s.tz * out]; // Punkt hinter (out > 0) oder vor (out < 0) dem Stuhl
export const BOX_POS = V(TABLE.cx, TABLE.y, TABLE.cz); // Box mitten auf dem Tisch (Stufe 0 bis 2)
export const CABINET = { x0: 2.84, x1: 3.48, z0: 0.72, z1: 1.42, h: 1.45, shelves: [0.3, 0.72, 1.14] }; /* seit 2026-11-21 an der rechten Wand zwischen Kommode und Tür (stand vorher frei hinter Gelbs Stuhl, Gelb lief beim Verstecken hindurch) */ // Geheimfach (Stufe 3), offen zum Tisch hin
export const PC_POS = V(-3.15, 1.05, -0.9);
export const GLASS_Z = ROOM.z0 - ROOM.t * 0.55; export const CUST_Z = ROOM.z0 - ROOM.t - 0.52;
export const EYE = 1.6;
export const VIEWS = { zimmer: { pos: [1.7, 2.25, 5.4], look: [-0.2, 0.85, -0.8], fov: 56 } };
export const seatView = (i) => { const s = SEATS[i]; return { pos: [s.x + s.tx * 0.12, 1.25, s.z + s.tz * 0.12], look: [s.x + s.tx * 2.1, 0.6, s.z + s.tz * 2.1], fov: 58 }; };
export const LUDWIG_LOOK = { shirt: 0x3f6b4a, cap: 0x2b2b30, brim: 0x18181c, pants: 0x2c3138, skin: 0xeac3a0, hair: 0x5b3a22, capText: 'BOSS', face: 'grin' }; // dieselbe Figur wie auf der Riesenzigarette
export const CUSTOMER_LOOKS = [
  { shirt: 0x2c62c8, cap: 0x1c3f86, brim: 0x14284f, pants: 0x2a2f3a, skin: 0xd8a47e, hair: 0x1e1a18, capText: 'B', chain: true, face: 'grin' }, // Bruno
  { shirt: 0xc0332a, cap: 0x8a221c, brim: 0x2a1410, pants: 0x30343a, skin: 0xe2b08c, hair: 0x3a2a1e },
  { shirt: 0xe8a21c, cap: 0xa86a10, brim: 0x3a2a10, pants: 0x2a3a5a, skin: 0xe8bc98, hair: 0x5a3a1e },
  { shirt: 0x6a4aa0, cap: 0x3a2a60, brim: 0x1c1430, pants: 0x262a30, skin: 0xc68e62, hair: 0x14100e },
  { shirt: 0x2f8a6a, cap: 0x1a5a44, brim: 0x0e2a20, pants: 0x3a3430, skin: 0xf0c8a8, hair: 0xa8742e },
  { shirt: 0xe8d8e4, cap: 0xc23a7a, pants: 0x1f2a44, skin: 0x8d5a3a, hair: 0x0e0c0c, frau: 'zopf', face: 'grin', rock: 0xc23a7a }, // Mia
  // zehn neue Kunden (Stimmen-Update 2026-11-22): Nele, Aylin, Zoe, Emre, Luca, Kevin, Oskar, Manni, Opa Heinz, Oma Hilde
  { shirt: 0xf26aa8, cap: 0xf2d23a, pants: 0x3a5a8a, skin: 0xf0c8a8, hair: 0xc8702a, frau: 'zopf', face: 'grin' },
  { shirt: 0xa01c2c, cap: 0xe0b050, pants: 0x14161c, skin: 0xc8946a, hair: 0x120e0c, frau: 'lang', rock: 0x14161c, shoe: 0x14161c },
  { shirt: 0x5a5a60, cap: 0x7a3a9a, pants: 0x1a1a1e, skin: 0xe8bc98, hair: 0x3a1a4a, frau: 'bob', face: 'flat' },
  { shirt: 0x1c9a5a, cap: 0xf2f2ee, brim: 0x1c9a5a, pants: 0x1a1a22, skin: 0xb07a52, hair: 0x100c0a },
  { shirt: 0x8ab4d8, cap: 0x4a6a8a, brim: 0x2a3a4a, pants: 0x5a6068, skin: 0xe2b08c, hair: 0x6a4a2a },
  { shirt: 0xe8e8e8, cap: 0xd8b030, brim: 0x8a6a10, pants: 0x101014, skin: 0xd8a47e, hair: 0xd8c080 },
  { shirt: 0x142a5a, cap: 0x8a6a4a, brim: 0x4a3828, pants: 0xc8b898, skin: 0xf0c8a8, hair: 0x8a5a2a, shoe: 0x5a3820, face: 'flat' },
  { shirt: 0xf27a1a, cap: 0xf2c81c, pants: 0x3a4a6a, skin: 0xc8946a, hair: 0x2a1a10, hut: 'helm', bart: 'schnauzer', shoe: 0x5a3820, face: 'grin' },
  { shirt: 0x6a6a52, cap: 0x7a6a5a, brim: 0x4a3e32, pants: 0x5a5048, skin: 0xe0b498, hair: 0xc8c8c4, brille: true, bart: 'schnauzer', shoe: 0x3a2a20 },
  { shirt: 0x8a4a7a, cap: 0xd8a0c0, pants: 0xb89878, skin: 0xe8c0a8, hair: 0xe0dcd8, frau: 'dutt', rock: 0x4a4250, brille: true, shoe: 0x3a2a30 },
  // Lea und Sophie hatten das Aussehen von Finn und Jonas, seit den Figuren vom Startbildschirm (2026-11-22) ein eigenes
  { shirt: 0x24262c, cap: 0x2a8a8a, pants: 0x2a4a7a, skin: 0xe2b08c, hair: 0x5a2a1e, frau: 'lang', face: 'flat' },
  { shirt: 0x9ad0c0, cap: 0xf2efe6, pants: 0xe8bc98, skin: 0xe8bc98, hair: 0xd8b878, frau: 'bob', rock: 0x3a6a8a },
];

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const std = (o) => new THREE.MeshStandardMaterial(o);
function mesh(geo, mat, x, y, z, parent, { cast = true, receive = true, ry = 0, rx = 0, rz = 0 } = {}) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = cast; m.receiveShadow = receive; if (parent) parent.add(m); return m; }
// Quader über Ecken statt Mitte: einfacher beim Möbelbau
function block(mat, x0, y0, z0, x1, y1, z1, parent, o) { return mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, parent, o); }

// ---------------- Texturen ----------------
function parquetTex() {
  return canvasTex(1024, 1024, (x, w, h) => {
    const r = rng(7); const rows = 8; const ph = h / rows; x.fillStyle = '#6a462a'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < rows; i++) {
      let px = -r() * 300;
      while (px < w) {
        const len = 260 + r() * 300; const b = [118 + r() * 38, 80 + r() * 26, 46 + r() * 20]; const g = x.createLinearGradient(px, 0, px + len, 0); g.addColorStop(0, `rgb(${b[0] | 0},${b[1] | 0},${b[2] | 0})`); g.addColorStop(1, `rgb(${(b[0] - 14) | 0},${(b[1] - 11) | 0},${(b[2] - 7) | 0})`); x.fillStyle = g; x.fillRect(px, i * ph, len, ph);
        x.globalAlpha = 0.16; for (let k = 0; k < 12; k++) { x.strokeStyle = r() < 0.55 ? '#3a2412' : '#d0a272'; x.lineWidth = 1 + r() * 2; x.beginPath(); const yy = i * ph + 4 + r() * (ph - 8); x.moveTo(px, yy); for (let s = 0; s <= 10; s++) x.lineTo(px + len * s / 10, yy + Math.sin(s * 1.1 + k) * 2.5 + (r() - 0.5) * 3); x.stroke(); } x.globalAlpha = 1;
        x.fillStyle = 'rgba(28,16,6,.6)'; x.fillRect(px, i * ph, 2, ph); px += len;
      }
      x.fillStyle = 'rgba(28,16,6,.65)'; x.fillRect(0, i * ph, w, 2);
    }
  }, { repeat: [4, 4] });
}
function paintTex(hex, seed = 11) {
  return canvasTex(512, 512, (x, w, h) => { x.fillStyle = hex; x.fillRect(0, 0, w, h); const r = rng(seed); const img = x.getImageData(0, 0, w, h); const d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(img, 0, 0); }, { repeat: [3, 2] });
}
function woodTex(base, dark, seed = 3, rep = [1, 1]) {
  return canvasTex(512, 512, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(seed); x.globalAlpha = 0.22; for (let k = 0; k < 70; k++) { x.strokeStyle = r() < 0.6 ? dark : '#fff3dc'; x.lineWidth = 0.6 + r() * 2.2; x.beginPath(); const y0 = r() * h; x.moveTo(0, y0); for (let s = 0; s <= 16; s++) x.lineTo(w * s / 16, y0 + Math.sin(s * 0.7 + k * 0.3) * 6 + (r() - 0.5) * 2); x.stroke(); } x.globalAlpha = 1; }, { repeat: rep });
}
function plaidTex() {
  return canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#7a2a2e'; x.fillRect(0, 0, w, h); x.globalAlpha = 0.5; x.fillStyle = '#2a2f4a'; for (let i = 0; i < 8; i++) { x.fillRect(i * 64 + 10, 0, 22, h); x.fillRect(0, i * 64 + 10, w, 22); } x.globalAlpha = 0.35; x.fillStyle = '#e8d8b0'; for (let i = 0; i < 8; i++) { x.fillRect(i * 64 + 44, 0, 4, h); x.fillRect(0, i * 64 + 44, w, 4); } x.globalAlpha = 1; }, { repeat: [2, 2] });
}
function rugTex() {
  return canvasTex(512, 384, (x, w, h) => { x.fillStyle = '#2d3a4a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#c9b37a'; x.lineWidth = 10; x.strokeRect(22, 22, w - 44, h - 44); x.lineWidth = 3; x.strokeRect(44, 44, w - 88, h - 88); x.fillStyle = '#3e5268'; for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { x.beginPath(); const cx = 90 + i * 66; const cy = 92 + j * 66; x.moveTo(cx, cy - 22); x.lineTo(cx + 22, cy); x.lineTo(cx, cy + 22); x.lineTo(cx - 22, cy); x.fill(); } const r = rng(5); const img = x.getImageData(0, 0, w, h); const d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(img, 0, 0); });
}
function posterTex(kind) {
  return canvasTex(512, 720, (x, w, h) => {
    if (kind === 'level') {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1b0f3a'); g.addColorStop(1, '#4a1450'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#ff3fa4'; for (let i = 0; i < 9; i++) x.fillRect(0, 430 + i * 30, w, 3 + i);
      x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(w / 2, 300, 120, 0, 7); x.fill(); x.fillStyle = '#1b0f3a'; for (let i = 0; i < 6; i++) x.fillRect(120, 300 + i * 22, w - 240, 8);
      x.fillStyle = '#7ff6ff'; x.font = '900 92px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('LEVEL 99', w / 2, 140); x.font = '600 34px Bahnschrift, sans-serif'; x.fillStyle = '#ffffff'; x.fillText('PRESS START', w / 2, 650);
    } else if (kind === 'fc') {
      x.fillStyle = '#e9e4d6'; x.fillRect(0, 0, w, h); x.fillStyle = '#0a4f9c'; x.fillRect(0, 0, w, 150); x.fillStyle = '#fff'; x.font = '800 64px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('FC THEO 09', w / 2, 100);
      x.fillStyle = '#0a4f9c'; x.beginPath(); x.moveTo(w / 2, 210); x.lineTo(w / 2 + 130, 260); x.lineTo(w / 2 + 110, 470); x.lineTo(w / 2, 560); x.lineTo(w / 2 - 110, 470); x.lineTo(w / 2 - 130, 260); x.closePath(); x.fill(); x.fillStyle = '#f9bd00'; x.font = '900 120px Bahnschrift, sans-serif'; x.fillText('T', w / 2, 430);
      x.fillStyle = '#141518'; x.font = '600 36px Bahnschrift, sans-serif'; x.fillText('Meister der Herzen', w / 2, 650);
    } else {
      x.fillStyle = '#101418'; x.fillRect(0, 0, w, h); const r = rng(9); for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.8})`; x.fillRect(r() * w, r() * h * 0.6, 2, 2); }
      x.fillStyle = '#d33'; x.beginPath(); x.moveTo(60, 560); x.lineTo(150, 470); x.lineTo(370, 470); x.lineTo(460, 560); x.closePath(); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(140, 570, 38, 0, 7); x.arc(380, 570, 38, 0, 7); x.fill();
      x.fillStyle = '#f5f6f4'; x.font = '900 70px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('V8 TURBO', w / 2, 170);
    }
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
  });
}
function noteTex() {
  return canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#ffe866'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, 0, w, 26); x.fillStyle = '#c0161d'; x.textAlign = 'center'; x.font = 'bold 46px "Segoe Print", "Comic Sans MS", cursive'; x.save(); x.translate(w / 2, 108); x.rotate(-0.08); x.fillText('ZOCK-', 0, 0); x.fillText('VERBOT!', 0, 56); x.restore(); x.fillStyle = '#20252c'; x.font = '28px "Segoe Print", "Comic Sans MS", cursive'; x.fillText('– Mama', w * 0.62, 226); });
}
function labelTex(text, sub, bg, fg) {
  return canvasTex(256, 160, (x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = fg; x.textAlign = 'center'; x.font = '900 46px Bahnschrift, sans-serif'; x.fillText(text, w / 2, 76); if (sub) { x.font = '600 26px Bahnschrift, sans-serif'; x.fillText(sub, w / 2, 122); } x.strokeStyle = fg; x.lineWidth = 6; x.strokeRect(10, 10, w - 20, h - 20); });
}
function boxTex() {
  return canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#b98c56'; x.fillRect(0, 0, w, h); const r = rng(21); x.globalAlpha = 0.12; for (let i = 0; i < 300; i++) { x.fillStyle = r() < 0.5 ? '#7a5426' : '#e0b880'; x.fillRect(r() * w, r() * h, 2 + r() * 6, 1 + r() * 2); } x.globalAlpha = 1; x.fillStyle = '#26292e'; x.textAlign = 'center'; x.font = 'bold 44px "Segoe Print", "Comic Sans MS", cursive'; x.save(); x.translate(w / 2, h / 2); x.rotate(-0.05); x.fillText('NICHT ÖFFNEN!', 0, 0); x.font = '30px "Segoe Print", "Comic Sans MS", cursive'; x.fillText('Ludwigs Schulsachen', 0, 52); x.restore(); });
}
function skyTex() {
  return canvasTex(2048, 1024, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#04060f'); g.addColorStop(0.55, '#0c1630'); g.addColorStop(0.85, '#22284a'); g.addColorStop(1, '#3a2d4a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const r = rng(33); for (let i = 0; i < 900; i++) { const y = r() * h * 0.75; x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.75 * (1 - y / h)})`; const s = r() < 0.06 ? 2.4 : 1.2; x.fillRect(r() * w, y, s, s); }
    const mx = w * 0.72; const my = h * 0.2; const mg = x.createRadialGradient(mx, my, 10, mx, my, 160); mg.addColorStop(0, 'rgba(220,230,255,.5)'); mg.addColorStop(1, 'rgba(220,230,255,0)'); x.fillStyle = mg; x.fillRect(mx - 170, my - 170, 340, 340); x.fillStyle = '#eef0f8'; x.beginPath(); x.arc(mx, my, 46, 0, 7); x.fill(); x.fillStyle = 'rgba(160,165,185,.45)'; for (const [dx, dy, rr] of [[-14, -8, 9], [12, 10, 12], [6, -20, 6], [-8, 18, 7]]) { x.beginPath(); x.arc(mx + dx, my + dy, rr, 0, 7); x.fill(); }
  });
}
// Hauswand gegenüber: Farbbild und ein zweites Bild, in dem nur die erleuchteten Fenster hell sind (leuchten nachts)
function facadeTex(seed, wall) {
  const wins = []; const r = rng(seed); for (let fl = 0; fl < 2; fl++) for (let i = 0; i < 7; i++) wins.push({ x: 40 + i * 140, y: 90 + fl * 210, lit: r() < 0.45, warm: r() < 0.8 });
  const paint = (glow) => (x, w, h) => {
    x.fillStyle = glow ? '#000' : wall; x.fillRect(0, 0, w, h);
    for (const q of wins) { const col = q.lit ? (q.warm ? '#ffcf7a' : '#bcd8ff') : '#151a24'; x.fillStyle = glow ? (q.lit ? col : '#000') : col; x.fillRect(q.x, q.y, 80, 110); if (q.lit) { x.fillStyle = glow ? 'rgba(0,0,0,.45)' : 'rgba(120,70,20,.35)'; x.fillRect(q.x, q.y, 24, 110); x.fillRect(q.x + 56, q.y, 24, 110); } if (!glow) { x.fillStyle = '#d8d4cc'; x.fillRect(q.x - 4, q.y + 110, 88, 8); } }
  };
  return { map: canvasTex(1024, 512, paint(false)), glow: canvasTex(1024, 512, paint(true)) };
}
function hedgeTex() {
  return canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#16301a'; x.fillRect(0, 0, w, h); const r = rng(4); for (let i = 0; i < 900; i++) { const g = 40 + r() * 70; x.fillStyle = `rgb(${(g * 0.45) | 0},${g | 0},${(g * 0.4) | 0})`; x.beginPath(); x.ellipse(r() * w, r() * h, 3 + r() * 5, 2 + r() * 3, r() * 3, 0, 7); x.fill(); } }, { repeat: [3, 1] });
}
function asphaltTex() {
  return canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#25272b'; x.fillRect(0, 0, w, h); const r = rng(8); for (let i = 0; i < 5000; i++) { const g = 30 + r() * 40; x.fillStyle = `rgb(${g},${g},${g + 3})`; x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }, { repeat: [20, 3] });
}
function tobaccoTex() {
  return canvasTex(256, 128, (x, w, h) => { x.fillStyle = '#6a4220'; x.fillRect(0, 0, w, h); const r = rng(14); for (let i = 0; i < 1400; i++) { const c = r(); x.fillStyle = c < 0.35 ? '#3e2410' : c < 0.7 ? '#8c5a2a' : '#a8743a'; x.save(); x.translate(r() * w, r() * h); x.rotate(r() * 3); x.fillRect(-4, -0.7, 4 + r() * 6, 1.4); x.restore(); } });
}


// ---------------- Zimmer ----------------
function buildRoom(scene, M) {
  const R = ROOM; const t = R.t; const g = new THREE.Group(); g.name = 'zimmer'; scene.add(g); const wall = M.wall;
  mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), M.floor, 0, 0, 0, g, { cast: false, rx: -Math.PI / 2 });
  mesh(new THREE.PlaneGeometry(R.x1 - R.x0, R.z1 - R.z0), M.ceil, 0, R.h, 0, g, { cast: false, rx: Math.PI / 2 });
  // Rückwand mit Fensterloch, linke Wand, rechte Wand mit Türloch, Vorderwand (in der Übersicht ausgeblendet)
  block(wall, R.x0 - t, 0, R.z0 - t, WIN.x0, R.h, R.z0, g); block(wall, WIN.x1, 0, R.z0 - t, R.x1 + t, R.h, R.z0, g);
  block(wall, WIN.x0, 0, R.z0 - t, WIN.x1, WIN.y0, R.z0, g); block(wall, WIN.x0, WIN.y1, R.z0 - t, WIN.x1, R.h, R.z0, g);
  block(wall, R.x0 - t, 0, R.z0, R.x0, R.h, R.z1 + t, g);
  block(wall, R.x1, 0, R.z0, R.x1 + t, R.h, DOOR.z0, g); block(wall, R.x1, 0, DOOR.z1, R.x1 + t, R.h, R.z1 + t, g); block(wall, R.x1, DOOR.h, DOOR.z0, R.x1 + t, R.h, DOOR.z1, g);
  const front = block(wall, R.x0, 0, R.z1, R.x1, R.h, R.z1 + t, g);
  block(std({ color: 0x14161b, roughness: 1 }), R.x0 - t, R.h + 0.01, R.z0 - t, R.x1 + t, R.h + 2.6, R.z1 + t, g, { cast: false }); // dunkler Block über dem Zimmer: In der Übersicht sieht man nicht darüber hinweg
  const sk = M.white; block(sk, R.x0, 0, R.z0, R.x1, 0.08, R.z0 + 0.015, g); block(sk, R.x0, 0, R.z0, R.x0 + 0.015, 0.08, R.z1, g); block(sk, R.x1 - 0.015, 0, R.z0, R.x1, 0.08, DOOR.z0, g); block(sk, R.x1 - 0.015, 0, DOOR.z1, R.x1, 0.08, R.z1, g); const frontSk = block(sk, R.x0, 0, R.z1 - 0.015, R.x1, 0.08, R.z1, g);
  return { g, front: [front, frontSk] };
}

function buildWindow(scene, M) {
  const g = new THREE.Group(); scene.add(g); const z = GLASS_Z; const fw = 0.055; const pvc = M.white;
  block(pvc, WIN.x0, WIN.y0, z - 0.03, WIN.x1, WIN.y0 + fw, z + 0.03, g); block(pvc, WIN.x0, WIN.y1 - fw, z - 0.03, WIN.x1, WIN.y1, z + 0.03, g);
  block(pvc, WIN.x0, WIN.y0, z - 0.03, WIN.x0 + fw, WIN.y1, z + 0.03, g); block(pvc, WIN.x1 - fw, WIN.y0, z - 0.03, WIN.x1, WIN.y1, z + 0.03, g); block(pvc, -0.035, WIN.y0, z - 0.03, 0.035, WIN.y1, z + 0.03, g);
  { const h = block(M.metal, -0.072, 1.5, z + 0.03, -0.048, 1.58, z + 0.05, g); h.castShadow = false; }
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xa8c4d8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.12, depthWrite: false });
  const panes = []; const ph = WIN.y1 - WIN.y0 - 2 * fw;
  { const x0 = WIN.x0 + fw; const x1 = -0.035; const p = mesh(new THREE.PlaneGeometry(x1 - x0, ph), glassMat, (x0 + x1) / 2, (WIN.y0 + WIN.y1) / 2, z, g, { cast: false, receive: false }); p.renderOrder = 3; panes.push(p); }
  // Rechter Flügel lässt sich öffnen (Drehpunkt am rechten Rand), mit eigenem schmalen Rahmen
  const hinge = new THREE.Group(); hinge.position.set(WIN.x1 - fw, (WIN.y0 + WIN.y1) / 2, z + 0.02); g.add(hinge); const sw = WIN.x1 - fw - 0.035; const sf = 0.03;
  { const p = mesh(new THREE.PlaneGeometry(sw - 2 * sf, ph - 2 * sf), glassMat, -sw / 2, 0, 0, hinge, { cast: false, receive: false }); p.renderOrder = 3; panes.push(p); }
  block(pvc, -sw, ph / 2 - sf, -0.012, 0, ph / 2, 0.012, hinge); block(pvc, -sw, -ph / 2, -0.012, 0, -ph / 2 + sf, 0.012, hinge); block(pvc, -sw, -ph / 2, -0.012, -sw + sf, ph / 2, 0.012, hinge); block(pvc, -sf, -ph / 2, -0.012, 0, ph / 2, 0.012, hinge);
  block(M.metal, -sw + 0.012, 0.0, 0.012, -sw + 0.03, 0.08, 0.03, hinge, { cast: false });
  // Fensterbank, Heizkörper darunter, Vorhänge an einer Stange
  block(M.white, WIN.x0 - 0.05, WIN.y0 - 0.03, ROOM.z0 - 0.02, WIN.x1 + 0.05, WIN.y0, ROOM.z0 + 0.13, g);
  const rad = new THREE.Group(); g.add(rad); for (let i = 0; i < 14; i++) block(M.white, -0.62 + i * 0.09, 0.16, ROOM.z0 + 0.03, -0.57 + i * 0.09, 0.74, ROOM.z0 + 0.11, rad);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.6, 10), M.metal, 0, 2.33, ROOM.z0 + 0.08, g, { rz: Math.PI / 2 });
  const curtains = [];
  for (const s of [-1, 1]) { const w = 0.55; const h = 2.25; const geo = new THREE.PlaneGeometry(w, h, 24, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + w / 2) / w; p.setZ(i, Math.sin(u * Math.PI * 7) * 0.022); } geo.computeVertexNormals(); curtains.push(mesh(geo, M.curtain, s * (WIN.x1 + 0.2), 2.32 - h / 2, ROOM.z0 + 0.06, g)); }
  return { g, panes, curtains, hinge };
}

function buildTable(scene, M) {
  const g = new THREE.Group(); scene.add(g); const T = TABLE;
  block(M.desk, T.x0, T.y - 0.05, T.z0, T.x1, T.y, T.z1, g);
  for (const [x, z] of [[T.x0 + 0.08, T.z0 + 0.08], [T.x1 - 0.08, T.z0 + 0.08], [T.x0 + 0.08, T.z1 - 0.08], [T.x1 - 0.08, T.z1 - 0.08]]) block(M.desk, x - 0.035, 0, z - 0.035, x + 0.035, T.y - 0.05, z + 0.035, g);
  block(M.desk, T.x0 + 0.1, T.y - 0.13, T.z0 + 0.06, T.x1 - 0.1, T.y - 0.05, T.z0 + 0.09, g); block(M.desk, T.x0 + 0.1, T.y - 0.13, T.z1 - 0.09, T.x1 - 0.1, T.y - 0.05, T.z1 - 0.06, g);
  // vier Plätze: Stuhl, Unterlage, Blättchen-Heftchen, Tabakbeutel (die Lehne zeigt vom Tisch weg)
  const chairs = SEATS.map((s, i) => { const c = new THREE.Group(); c.position.set(s.x, 0, s.z); c.rotation.y = s.rot; g.add(c); const w = M.chairWood;
    block(w, -0.22, 0.42, -0.2, 0.22, 0.46, 0.2, c); for (const [x, z] of [[-0.19, -0.17], [0.19, -0.17], [-0.19, 0.17], [0.19, 0.17]]) block(w, x - 0.02, 0, z - 0.02, x + 0.02, 0.42, z + 0.02, c);
    for (const x of [-0.19, 0.19]) block(w, x - 0.02, 0.46, 0.15, x + 0.02, 0.98, 0.19, c); block(w, -0.21, 0.72, 0.15, 0.21, 0.96, 0.19, c);
    block(M.cushion[i], -0.2, 0.46, -0.18, 0.2, 0.49, 0.18, c); return c; });
  for (const s of SEATS) { const m = new THREE.Group(); m.position.set(s.spot.x, 0, s.spot.z); m.rotation.y = s.rot; g.add(m); block(M.mat, -0.21, T.y, -0.17, 0.21, T.y + 0.003, 0.15, m, { cast: false }); }
  return { g, chairs };
}

function buildPcCorner(scene, M, T) {
  const g = new THREE.Group(); scene.add(g); const R = ROOM; const x0 = R.x0; const x1 = R.x0 + 0.68; const z0 = -1.75; const z1 = -0.05; const y = 0.75;
  block(M.gameDesk, x0, y - 0.03, z0, x1, y, z1, g); for (const z of [z0 + 0.04, z1 - 0.04]) for (const x of [x0 + 0.05, x1 - 0.05]) block(M.metalDark, x - 0.02, 0, z - 0.02, x + 0.02, y - 0.03, z + 0.02, g);
  const mon = new THREE.Group(); mon.position.set(x0 + 0.2, y, (z0 + z1) / 2); g.add(mon); block(M.plastic, -0.06, 0, -0.13, 0.06, 0.015, 0.13, mon); block(M.plastic, -0.02, 0, -0.02, 0.02, 0.2, 0.02, mon);
  block(M.plastic, 0.0, 0.14, -0.4, 0.04, 0.52, 0.4, mon); const screen = mesh(new THREE.PlaneGeometry(0.78, 0.36), std({ color: 0x07080a, roughness: 0.15, metalness: 0.2, emissive: 0x000000 }), 0.041, 0.33, 0, mon, { ry: Math.PI / 2, cast: false });
  mesh(new THREE.PlaneGeometry(0.14, 0.14), std({ map: T.note, roughness: 0.9 }), 0.043, 0.36, 0.12, mon, { ry: Math.PI / 2, rz: -0.12, cast: false });
  block(M.plastic, x0 + 0.38, y, (z0 + z1) / 2 - 0.26, x0 + 0.54, y + 0.02, (z0 + z1) / 2 + 0.26, g); block(M.plastic, x0 + 0.44, y, (z0 + z1) / 2 + 0.38, x0 + 0.52, y + 0.02, (z0 + z1) / 2 + 0.44, g);
  block(M.plastic, x0 + 0.08, 0, z1 - 0.32, x0 + 0.5, 0.48, z1 - 0.08, g); block(std({ color: 0x000000, emissive: 0x2a9aff, emissiveIntensity: 1.5 }), x0 + 0.5, 0.38, z1 - 0.28, x0 + 0.502, 0.4, z1 - 0.12, g, { cast: false });
  // Gaming-Stuhl davor
  const gc = new THREE.Group(); gc.position.set(-2.45, 0, -0.9); gc.rotation.y = Math.PI / 2; g.add(gc); block(M.plastic, -0.24, 0.42, -0.24, 0.24, 0.5, 0.22, gc); block(std({ color: 0xb8262e, roughness: 0.6 }), -0.24, 0.5, 0.18, 0.24, 1.25, 0.26, gc); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 10), M.metal, 0, 0.22, 0, gc); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(new THREE.BoxGeometry(0.035, 0.03, 0.3), M.plastic, Math.sin(a) * 0.15, 0.05, Math.cos(a) * 0.15, gc, { ry: a }); }
  // Regal darüber, kleine Lampe
  block(M.desk, R.x0, 1.55, -1.7, R.x0 + 0.26, 1.58, -0.3, g); block(M.desk, R.x0, 1.95, -1.7, R.x0 + 0.26, 1.98, -0.3, g);
  const r = rng(12); let z = -1.68; while (z < -1.0) { const w = 0.03 + r() * 0.03; const h = 0.2 + r() * 0.12; block(std({ color: new THREE.Color().setHSL(r(), 0.45, 0.35), roughness: 0.8 }), R.x0 + 0.02, 1.58, z, R.x0 + 0.22, 1.58 + h, z + w, g); z += w + 0.004; }
  const gold = std({ color: 0xd4a83a, metalness: 0.85, roughness: 0.3 }); mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 12), gold, R.x0 + 0.13, 1.64, -0.75, g); mesh(new THREE.SphereGeometry(0.05, 12, 10), gold, R.x0 + 0.13, 1.75, -0.75, g);
  mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.11, 14), std({ color: 0xb4583a, roughness: 0.8 }), R.x0 + 0.13, 2.035, -0.6, g); const leaves = std({ color: 0x2f6a2e, roughness: 0.7 }); for (let i = 0; i < 7; i++) mesh(new THREE.SphereGeometry(0.045, 8, 6), leaves, R.x0 + 0.13 + Math.sin(i * 2.3) * 0.05, 2.12 + (i % 3) * 0.035, -0.6 + Math.cos(i * 2.3) * 0.05, g);
  mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.02, 18), M.lampBody, x0 + 0.5, y + 0.01, z0 + 0.15, g); mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 8), M.lampBody, x0 + 0.5, y + 0.19, z0 + 0.15, g); mesh(new THREE.ConeGeometry(0.06, 0.08, 18, 1, true), M.lampShade, x0 + 0.5, y + 0.4, z0 + 0.15, g);
  return { g, screen, mon };
}

function buildFurniture(scene, M, T) {
  const g = new THREE.Group(); scene.add(g); const R = ROOM;
  // Bett an der rechten Wand
  const bx0 = R.x1 - 1.03; const bx1 = R.x1 - 0.02; const bz0 = R.z0 + 0.05; const bz1 = -0.9;
  block(M.bedFrame, bx0, 0.0, bz0, bx1, 0.3, bz1, g); block(M.bedFrame, bx0, 0, bz0, bx1, 0.82, bz0 + 0.04, g);
  block(M.sheet, bx0 + 0.03, 0.3, bz0 + 0.06, bx1 - 0.03, 0.46, bz1 - 0.02, g);
  block(M.blanket, bx0, 0.42, bz0 + 0.55, bx1, 0.53, bz1 + 0.02, g); block(M.blanket, bx0 - 0.005, 0.12, bz0 + 0.55, bx0 + 0.02, 0.53, bz1 + 0.02, g);
  const pillow = block(M.sheet, bx0 + 0.12, 0.46, bz0 + 0.1, bx1 - 0.12, 0.58, bz0 + 0.46, g); pillow.rotation.x = -0.12;
  // Kleiderschrank hinten links (später ein Versteck)
  const wx0 = R.x0 + 0.02; const wx1 = R.x0 + 1.2; const wz0 = R.z0 + 0.02; const wz1 = R.z0 + 0.62; block(M.wardrobe, wx0, 0, wz0, wx1, 2.15, wz1, g);
  block(M.wardrobeDoor, wx0 + 0.01, 0.04, wz1, (wx0 + wx1) / 2 - 0.004, 2.1, wz1 + 0.015, g); block(M.wardrobeDoor, (wx0 + wx1) / 2 + 0.004, 0.04, wz1, wx1 - 0.01, 2.1, wz1 + 0.015, g);
  for (const s of [-1, 1]) block(M.metal, (wx0 + wx1) / 2 + s * 0.03 - 0.008, 0.95, wz1 + 0.015, (wx0 + wx1) / 2 + s * 0.03 + 0.008, 1.15, wz1 + 0.03, g);
  // Tür rechts vorne, darunter Licht aus dem Flur
  const dz0 = DOOR.z0; const dz1 = DOOR.z1; block(M.white, R.x1 - 0.03, 0, dz0 - 0.06, R.x1 + 0.005, DOOR.h + 0.06, dz0, g); block(M.white, R.x1 - 0.03, 0, dz1, R.x1 + 0.005, DOOR.h + 0.06, dz1 + 0.06, g); block(M.white, R.x1 - 0.03, DOOR.h, dz0 - 0.06, R.x1 + 0.005, DOOR.h + 0.06, dz1 + 0.06, g);
  // Tür dreht sich um ihre Angel (bei dz0) ins Zimmer, dahinter liegt ein kurzer Flur mit Licht
  const door = new THREE.Group(); door.position.set(R.x1, 0, dz0); g.add(door); block(M.door, -0.02, 0.012, 0, 0.02, DOOR.h, dz1 - dz0, door); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.05, 0.02, 0.13), M.metal, s * 0.045, 1.02, dz1 - dz0 - 0.12, door);
  const hx0 = R.x1 + R.t; const hx1 = R.x1 + 1.9; const hz0 = dz0 - 0.9; const hz1 = dz1 + 0.9; const hallWall = std({ color: 0xd8cdb8, roughness: 0.95 });
  mesh(new THREE.PlaneGeometry(hx1 - hx0, hz1 - hz0), M.floor, (hx0 + hx1) / 2, 0.001, (hz0 + hz1) / 2, g, { cast: false, rx: -Math.PI / 2 }); block(hallWall, hx1, 0, hz0, hx1 + 0.1, R.h, hz1, g, { cast: false }); block(hallWall, hx0, 0, hz0 - 0.1, hx1, R.h, hz0, g, { cast: false }); block(hallWall, hx0, 0, hz1, hx1, R.h, hz1 + 0.1, g, { cast: false }); block(hallWall, hx0, R.h, hz0, hx1, R.h + 0.1, hz1, g, { cast: false });
  const frame = std({ color: 0x3a2a1e, roughness: 0.7 }); block(frame, hx1 - 0.02, 1.2, (dz0 + dz1) / 2 - 0.35, hx1, 1.75, (dz0 + dz1) / 2 + 0.35, g, { cast: false }); block(std({ color: 0x5a7a9a, roughness: 0.9 }), hx1 - 0.025, 1.25, (dz0 + dz1) / 2 - 0.3, hx1 - 0.02, 1.7, (dz0 + dz1) / 2 + 0.3, g, { cast: false });
  const hallLight = new THREE.PointLight(0xffd9a0, 0, 4.5, 2); hallLight.position.set((hx0 + hx1) / 2, R.h - 0.3, (dz0 + dz1) / 2); g.add(hallLight);
  mesh(new THREE.PlaneGeometry(dz1 - dz0, 0.012), std({ color: 0x000000, emissive: 0xffd9a0, emissiveIntensity: 2.4 }), R.x1 - 0.002, 0.006, (dz0 + dz1) / 2, g, { cast: false, ry: -Math.PI / 2 });
  // Teppich unter dem Tisch, Wäsche, Schuhe, Rucksack, Mülleimer
  mesh(new THREE.PlaneGeometry(3.4, 2.5), std({ map: T.rug, roughness: 1 }), 0, 0.004, 0.4, g, { rx: -Math.PI / 2, cast: false });
  const cloth = [0x2a3a5a, 0x8a2a2a, 0xdadada, 0x3a3a3a]; for (let i = 0; i < 7; i++) { const c = mesh(new THREE.SphereGeometry(0.16, 9, 6), std({ color: cloth[i % 4], roughness: 1 }), -2.95 + (i % 3) * 0.13, 0.03, 2.3 + Math.floor(i / 3) * 0.14, g); c.scale.set(1.2, 0.28, 0.9); c.rotation.y = i; }
  for (const s of [0, 1]) { const sh = new THREE.Group(); sh.position.set(2.9 - s * 0.2, 0, 1.45 + s * 0.05); sh.rotation.y = 1.2 + s * 0.3; g.add(sh); block(std({ color: 0xf2f2f0, roughness: 0.7 }), -0.05, 0, -0.14, 0.05, 0.03, 0.14, sh); block(std({ color: 0x1a1a1a, roughness: 0.7 }), -0.048, 0.03, -0.12, 0.048, 0.1, 0.1, sh); }
  const bag = block(std({ color: 0x24406a, roughness: 0.85 }), -2.78, 0, -1.95, -2.45, 0.42, -1.82, g); bag.rotation.y = 0.15;
  mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.32, 18, 1, true), std({ color: 0x3a4048, roughness: 0.6, side: THREE.DoubleSide }), -2.7, 0.16, 0.25, g);
  // Poster
  const poster = (map, x, y, z, ry, w = 0.5, h = 0.7) => mesh(new THREE.PlaneGeometry(w, h), std({ map, roughness: 0.75 }), x, y, z, g, { ry, cast: false });
  poster(T.posterLevel, -1.9, 1.6, R.z0 + 0.005, 0); poster(T.posterCar, 1.85, 1.55, R.z0 + 0.005, 0, 0.6, 0.84); poster(T.posterFc, R.x0 + 0.005, 1.4, 1.3, Math.PI / 2, 0.55, 0.77);
  // Pendelleuchte über dem Tisch, LED-Streifen unter der Decke
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.62, 6), M.plastic, 0, R.h - 0.31, 0.1, g, { cast: false }); mesh(new THREE.ConeGeometry(0.24, 0.2, 28, 1, true), std({ color: 0x1d2a24, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }), 0, R.h - 0.7, 0.1, g, { cast: false });
  mesh(new THREE.SphereGeometry(0.05, 14, 10), M.bulb, 0, R.h - 0.76, 0.1, g, { cast: false, receive: false });
  const led = std({ color: 0x000000, emissive: 0xa64dff, emissiveIntensity: 3 }); block(led, R.x0 + 0.02, R.h - 0.04, R.z0 + 0.02, R.x1 - 0.02, R.h - 0.03, R.z0 + 0.035, g, { cast: false }); block(led, R.x0 + 0.02, R.h - 0.04, R.z0 + 0.02, R.x0 + 0.035, R.h - 0.03, R.z1, g, { cast: false });
  return { g, door, hallLight };
}

function buildOutside(scene, M, T) {
  const g = new THREE.Group(); g.name = 'draussen'; scene.add(g); const y = OUT_Y; const z0 = ROOM.z0 - ROOM.t;
  const ground = (mat, a, b, yy = y) => mesh(new THREE.PlaneGeometry(90, a - b), mat, 0, yy, (a + b) / 2, g, { cast: false, rx: -Math.PI / 2 });
  ground(M.gravel, z0, z0 - 1.05); ground(M.grass, z0 - 1.05, z0 - 1.85); ground(M.pave, z0 - 1.85, z0 - 3.85, y + 0.02); ground(M.asphalt, z0 - 3.85, z0 - 10.4, y - 0.1); ground(M.pave, z0 - 10.4, z0 - 12.4, y + 0.02); ground(M.grass, z0 - 12.4, -70);
  for (const z of [z0 - 3.85, z0 - 10.4]) block(M.curb, -45, y - 0.1, z - 0.08, 45, y + 0.04, z + 0.08, g, { cast: false });
  for (const s of [-1, 1]) { const h = block(M.hedge, s * 1.05, y, z0 - 1.25, s * 5.5, y + 0.85, z0 - 0.85, g); h.castShadow = true; }
  const lx = 1.9; const lz = z0 - 2.3; mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.3, 10), M.metalDark, lx, y + 2.15, lz, g); block(M.metalDark, lx - 0.7, y + 4.2, lz - 0.03, lx, y + 4.26, lz + 0.03, g, { cast: false });
  block(M.metalDark, lx - 0.95, y + 4.12, lz - 0.12, lx - 0.55, y + 4.22, lz + 0.12, g, { cast: false }); block(std({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 4 }), lx - 0.92, y + 4.1, lz - 0.09, lx - 0.58, y + 4.12, lz + 0.09, g, { cast: false });
  const houses = [[-17, -9, 0x5a5048, 11], [-7, 4, 0x6a6058, 12], [6, 17, 0x504a48, 13]]; const roofMat = std({ color: 0x3a2622, roughness: 0.9 });
  for (const [x0, x1, col, seed] of houses) { const hz = z0 - 21; const hh = 6.2; const tex = facadeTex(seed, '#' + new THREE.Color(col).getHexString()); const m = std({ map: tex.map, emissiveMap: tex.glow, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.95 }); block(m, x0, y, hz - 6, x1, y + hh, hz, g, { cast: false }).name = 'haus-gegenueber'; const sh = new THREE.Shape(); sh.moveTo(-3.3, 0); sh.lineTo(3.3, 0); sh.lineTo(0, 2.6); sh.closePath(); const rg = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false }); rg.rotateY(Math.PI / 2); mesh(rg, roofMat, x0, y + hh, hz - 3, g, { cast: false }).name = 'haus-gegenueber'; /* ludwigstrasse.js baut dort eine neue Häuserzeile mit Läden */ }
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(220, 90), new THREE.MeshBasicMaterial({ map: T.sky, depthWrite: false, fog: false })); sky.position.set(0, 22, -75); g.add(sky);
  const car = new THREE.Group(); car.position.set(-3.2, y - 0.1, z0 - 5.0); g.add(car); const paint = std({ color: 0x8a1c1c, roughness: 0.35, metalness: 0.5 }); block(paint, -2.1, 0.25, -0.85, 2.1, 0.85, 0.85, car); block(paint, -1.1, 0.85, -0.78, 1.0, 1.3, 0.78, car); block(std({ color: 0x0c1018, roughness: 0.1, metalness: 0.3 }), -1.05, 0.87, -0.8, 0.95, 1.25, 0.8, car, { cast: false });
  for (const [x, z] of [[-1.35, -0.82], [1.35, -0.82], [-1.35, 0.82], [1.35, 0.82]]) mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 18), M.plastic, x, 0.32, z, car, { rx: Math.PI / 2 });
  return { g, lamp: V3(lx - 0.75, y + 4.08, lz) };
}

// ---------------- Dreh-Sachen ----------------
// Blättchen, das sich einrollt: Bogen mit fester Breite, theta 0 = flach, 2·π = Röhre
export function createCurl(mat) {
  const SU = 26; const SV = 2; const n = (SU + 1) * (SV + 1); const pos = new Float32Array(n * 3); const nor = new Float32Array(n * 3); const uv = new Float32Array(n * 2); const idx = [];
  for (let j = 0; j <= SV; j++) for (let i = 0; i <= SU; i++) { const k = j * (SU + 1) + i; uv[k * 2] = i / SU; uv[k * 2 + 1] = j / SV; }
  for (let j = 0; j < SV; j++) for (let i = 0; i < SU; i++) { const a = j * (SU + 1) + i; const b = a + 1; const c = a + SU + 1; const d = c + 1; idx.push(a, b, c, b, d, c); } // Vorderseite zeigt nach oben (flach) bzw. nach innen (gerollt)
  const geo = new THREE.BufferGeometry(); geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; let radius = 1;
  const set = (theta) => { const th = Math.max(theta, 1e-3); const r = CIG.paperW / th; radius = r; for (let j = 0; j <= SV; j++) for (let i = 0; i <= SU; i++) { const k = j * (SU + 1) + i; const a = (i / SU - 0.5) * th; pos[k * 3] = (j / SV - 0.5) * CIG.len; pos[k * 3 + 1] = r - r * Math.cos(a); pos[k * 3 + 2] = r * Math.sin(a); nor[k * 3] = 0; nor[k * 3 + 1] = Math.cos(a); nor[k * 3 + 2] = -Math.sin(a); } geo.attributes.position.needsUpdate = true; geo.attributes.normal.needsUpdate = true; geo.computeBoundingSphere(); return r; };
  set(0.05); return { mesh: m, set, radius: () => radius };
}
export function cigGeometry(seg = 18) { const g = new THREE.CylinderGeometry(CIG.r, CIG.r, CIG.len, seg, 1, false); g.rotateZ(Math.PI / 2); return g; }

// Je Platz: Heftchen, Tabakbeutel, das Blättchen zum Einrollen, Tabak, die fertige Kippe
// Die Sachen eines Platzes hängen in einer Gruppe, die mit dem Platz gedreht ist. lspot/lbook sind lokale Punkte, die Kippe (cig) liegt in der Welt.
function buildSeatProps(scene, M, T, s, cigGeo, cigMats) {
  const g = new THREE.Group(); g.position.set(s.spot.x, 0, s.spot.z); g.rotation.y = s.rot; scene.add(g); g.updateMatrixWorld(true);
  const lspot = V(0, s.spot.y, 0); const lbook = V(-0.25, s.booklet.y, -0.06); s = { ...s, spot: lspot, booklet: lbook, pouch: V(0.23, s.pouch.y, -0.11), x: s.x };
  const booklet = new THREE.Group(); booklet.position.copy(s.booklet); booklet.rotation.y = 0.18; g.add(booklet); block(std({ color: 0xd8d2c4, roughness: 0.8 }), -0.055, 0, -0.03, 0.055, 0.01, 0.03, booklet); mesh(new THREE.PlaneGeometry(0.108, 0.058), std({ map: T.bookletLabel, roughness: 0.7 }), 0, 0.0105, 0, booklet, { rx: -Math.PI / 2, cast: false });
  const pouch = new THREE.Group(); pouch.position.copy(s.pouch); pouch.rotation.y = -0.22; g.add(pouch); const pg = new THREE.SphereGeometry(1, 18, 10); pg.scale(0.07, 0.022, 0.055); pg.translate(0, 0.02, 0); mesh(pg, std({ color: 0x1f5a3a, roughness: 0.45, metalness: 0.1 }), 0, 0, 0, pouch); mesh(new THREE.PlaneGeometry(0.1, 0.064), std({ map: T.pouchLabel, roughness: 0.6, transparent: true }), 0, 0.043, 0, pouch, { rx: -Math.PI / 2, cast: false });
  const curl = createCurl(M.paper); curl.mesh.position.copy(s.spot); curl.mesh.visible = false; g.add(curl.mesh);
  const tob = new THREE.Group(); tob.position.copy(s.spot); tob.visible = false; g.add(tob); const tg = new THREE.CapsuleGeometry(1, 1, 4, 12); tg.rotateZ(Math.PI / 2); const log = mesh(tg, M.tobacco, 0, 0, 0, tob, { cast: false }); log.scale.set(0.031, 0.006, 0.006);
  const crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.0018, 0.0025), M.tobacco, 36); const cr = rng(17 + Math.round(s.x * 10)); const base = []; for (let i = 0; i < 36; i++) { const a = cr() * Math.PI * 2; const rr = Math.sqrt(cr()); base.push({ x: (cr() - 0.5) * 0.085, z: Math.sin(a) * rr * 0.016, y: cr() * 0.004, ry: cr() * 3, rz: (cr() - 0.5) * 0.6, fall: 0.03 + cr() * 0.08, delay: cr() * 0.5 }); } tob.add(crumbs);
  const dummy = new THREE.Object3D(); const setCrumbs = (k, spread = 1) => { for (let i = 0; i < 36; i++) { const c = base[i]; const u = Math.max(0, Math.min(1, (k - c.delay * 0.6) / 0.4)); dummy.position.set(c.x, c.y * spread + (1 - u) * c.fall, c.z * spread); dummy.rotation.set(0, c.ry, c.rz); dummy.scale.setScalar(u > 0 ? 1 : 0.0001); dummy.updateMatrix(); crumbs.setMatrixAt(i, dummy.matrix); } crumbs.instanceMatrix.needsUpdate = true; };
  setCrumbs(1); const cig = mesh(cigGeo, cigMats, 0, 0, 0, scene); cig.visible = false;
  return { g, booklet, pouch, curl, tob, log, setCrumbs, cig, lspot, lbook };
}

// Die Box in vier Stufen. Jede Stufe hat ein Modell und Plätze für die Kippen (sie bleiben sichtbar, bis man sie herausnimmt).
function buildStash(scene, M, T, cigMats) {
  const g = new THREE.Group(); scene.add(g); const B = BOX_POS; const models = [];
  const lidded = (w, h, d, mat, side) => { const m = new THREE.Group(); m.position.copy(B); const th = 0.006; block(mat, -w / 2, 0, -d / 2, w / 2, th, d / 2, m); block(mat, -w / 2, 0, -d / 2, w / 2, h, -d / 2 + th, m); block(side || mat, -w / 2, 0, d / 2 - th, w / 2, h, d / 2, m); block(mat, -w / 2, 0, -d / 2, -w / 2 + th, h, d / 2, m); block(mat, w / 2 - th, 0, -d / 2, w / 2, h, d / 2, m); return m; };
  // 0 Schuhkarton mit Aufschrift, Deckel lehnt dahinter
  { const m = lidded(0.35, 0.11, 0.23, M.card, std({ map: T.box, roughness: 0.9 })); const lid = block(M.card, -0.18, 0, -0.005, 0.18, 0.24, 0.005, m); lid.position.set(0, 0.11, -0.135); lid.rotation.x = -0.25; models.push(m); }
  // 1 Holzkiste aus Latten
  { const m = lidded(0.52, 0.2, 0.38, M.crate); for (let i = 0; i < 3; i++) block(M.crateDark, -0.261, 0.03 + i * 0.065, 0.188, 0.261, 0.045 + i * 0.065, 0.196, m, { cast: false }); const lid = block(M.crate, -0.27, 0, -0.008, 0.27, 0.4, 0.008, m); lid.position.set(0, 0.2, -0.2); lid.rotation.x = -0.2; models.push(m); }
  // 2 Koffer: Unterteil, aufgeklappter Deckel, Griff, Riemen
  { const m = lidded(0.72, 0.14, 0.48, M.leather); const lid = new THREE.Group(); lid.position.set(0, 0.14, -0.24); lid.rotation.x = -1.75; m.add(lid); block(M.leather, -0.36, 0, 0, 0.36, 0.008, 0.48, lid); block(M.leather, -0.36, 0, 0, 0.36, 0.08, 0.008, lid); block(M.leather, -0.36, 0, 0.472, 0.36, 0.08, 0.48, lid); block(M.leather, -0.36, 0, 0, -0.352, 0.08, 0.48, lid); block(M.leather, 0.352, 0, 0, 0.36, 0.08, 0.48, lid); block(M.lining, -0.35, 0.009, 0.01, 0.35, 0.012, 0.47, lid, { cast: false });
    for (const x of [-0.2, 0.2]) block(M.strap, x - 0.025, 0.0, 0.239, x + 0.025, 0.142, 0.244, m, { cast: false }); block(M.metal, -0.07, 0.06, 0.24, 0.07, 0.08, 0.27, m); block(M.lining, -0.354, 0.007, -0.234, 0.354, 0.01, 0.234, m, { cast: false }); models.push(m); }
  // 3 Geheimfach: Schrank mit drei offenen Fächern neben dem Tisch
  { const C = CABINET; const m = new THREE.Group(); const w = M.wardrobe; block(w, C.x0, 0, C.z0, C.x1, 0.06, C.z1, m); block(w, C.x0, C.h - 0.04, C.z0, C.x1, C.h, C.z1, m); block(w, C.x1 - 0.03, 0, C.z0, C.x1, C.h, C.z1, m); block(w, C.x0, 0, C.z0, C.x1, C.h, C.z0 + 0.03, m); block(w, C.x0, 0, C.z1 - 0.03, C.x1, C.h, C.z1, m);
    for (const y of C.shelves) block(w, C.x0 + 0.01, y - 0.02, C.z0 + 0.03, C.x1 - 0.03, y, C.z1 - 0.03, m); models.push(m); }
  models.forEach((m, i) => { m.visible = i === 0; g.add(m); });
  // Plätze: Reihen quer, Schichten nach oben; Stufe 3 füllt Fach für Fach
  const step = CIG.r * 2.06; const lay = CIG.r * 1.75;
  const grid = (cx, cz, y0, w, d, cols, maxLayers = 99) => { const rows = Math.floor((d - CIG.r * 2) / step); const per = rows * cols; const colX = (c) => cx + (c - (cols - 1) / 2) * (CIG.len + 0.003); return { per, cap: per * maxLayers, at: (i, out) => { const l = Math.floor(i / per); const r = i % per; const c = Math.floor(r / rows); const row = r % rows; return out.set(colX(c), y0 + CIG.r + l * lay, cz - d / 2 + CIG.r + row * step + (l % 2) * CIG.r * 0.5); } }; };
  const L = [grid(B.x, B.z, B.y + 0.006, 0.34, 0.215, 3), grid(B.x, B.z, B.y + 0.006, 0.5, 0.36, 4), grid(B.x, B.z, B.y + 0.01, 0.7, 0.46, 6)];
  { const C = CABINET; const perShelf = []; const shelves = C.shelves.map((y) => grid((C.x0 + C.x1 - 0.03) / 2, (C.z0 + C.z1) / 2, y, C.x1 - C.x0 - 0.05, C.z1 - C.z0 - 0.07, 5, 8)); for (const s of shelves) perShelf.push(s.cap); L.push({ at: (i, out) => { let k = i; for (let s = 0; s < shelves.length; s++) { if (k < perShelf[s] || s === shelves.length - 1) return shelves[s].at(k, out); k -= perShelf[s]; } return out; } }); }
  const MAX = 5200; const inst = new THREE.InstancedMesh(cigGeometry(6), cigMats, MAX); inst.castShadow = false; inst.receiveShadow = true; inst.count = 0; inst.frustumCulled = false; g.add(inst);
  const dummy = new THREE.Object3D(); const p = V3(); let tierNow = -1; let shown = 0;
  const slot = (tierI, i, out = V3()) => L[Math.min(tierI, L.length - 1)].at(i, out);
  const set = (tierI, n) => { n = Math.max(0, Math.min(MAX, n)); if (tierI !== tierNow) { tierNow = tierI; models.forEach((m, i) => { m.visible = i === tierI; }); shown = 0; } if (n > shown) { for (let i = shown; i < n; i++) { slot(tierI, i, p); dummy.position.copy(p); dummy.rotation.set(0, ((i * 7) % 5 - 2) * 0.015, 0); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix); } inst.instanceMatrix.needsUpdate = true; } shown = n; inst.count = n; };
  return { g, models, inst, set, slot };
}

// ---------------- Figuren ----------------
function figureSpace(scene) { const s = new THREE.Object3D(); scene.add(s); s.updateMatrixWorld(true); return s; }
export function newPose() { const hand = () => ({ wrist: V3(), F: V3(0, -0.3, -1).normalize(), P: V3(0, -1, 0), grip: 0.6 }); const foot = () => ({ ankle: V3(), toe: V3() }); return { x: 0, y: 1, z: 0, yaw: 0, lean: 0, slump: 0, twist: 0, headYaw: 0, headPitch: 0, hands: { L: hand(), R: hand() }, feet: { L: foot(), R: foot() }, armPole: { L: V3(-0.5, -1, 0.15), R: V3(0.5, -1, 0.15) }, legPole: { L: V3(-0.15, 1, -0.6), R: V3(0.15, 1, -0.6) } }; }

// ---------------- Wohnzimmer für den Vorspann (40 m neben Ludwigs Zimmer, eigenes Licht) ----------------
export const LIVING = { x: 140, z: 0, x0: -3, x1: 3, z0: -2.5, z1: 2.5, h: 2.6, desk: { x: 0, z: -2.2 }, chair: { x: 0, z: -1.42 }, door: { x: -2.2, z: 2.5 }, socket: { x: 0.85, z: -2.42 } };
function gameScreenTex(on) {
  return canvasTex(512, 256, (x, w, h) => {
    if (!on) { x.fillStyle = '#050608'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(40, 30, 160, 60); return; }
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2a6aff'); g.addColorStop(0.6, '#8a4aff'); g.addColorStop(1, '#1a0a2a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1a1a2a'; for (let i = 0; i < 8; i++) x.fillRect(i * 70 - 10, 120 - (i % 3) * 30, 50, 140); x.fillStyle = '#ffcf5a'; for (let i = 0; i < 30; i++) x.fillRect((i * 37) % w, 100 + ((i * 53) % 120), 4, 6);
    x.fillStyle = '#ff3a3a'; x.beginPath(); x.arc(w * 0.5, h * 0.6, 16, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '900 26px Bahnschrift, sans-serif'; x.fillText('SCORE 99.420', 16, 34); x.fillStyle = '#7affb8'; x.fillRect(w - 150, 18, 130 * 0.7, 12); x.strokeStyle = '#fff'; x.strokeRect(w - 150, 18, 130, 12);
  });
}
function buildLiving(scene, M, T) {
  const L = LIVING; const g = new THREE.Group(); g.position.set(L.x, 0, L.z); scene.add(g); const wall = std({ map: paintTex('#c9b89a', 21), roughness: 0.95 });
  mesh(new THREE.PlaneGeometry(L.x1 - L.x0, L.z1 - L.z0), M.floor, 0, 0, 0, g, { cast: false, rx: -Math.PI / 2 }); mesh(new THREE.PlaneGeometry(L.x1 - L.x0, L.z1 - L.z0), M.ceil, 0, L.h, 0, g, { cast: false, rx: Math.PI / 2 });
  block(wall, L.x0 - 0.1, 0, L.z0 - 0.1, L.x1 + 0.1, L.h, L.z0, g); block(wall, L.x0 - 0.1, 0, L.z0, L.x0, L.h, L.z1 + 0.1, g); block(wall, L.x1, 0, L.z0, L.x1 + 0.1, L.h, L.z1 + 0.1, g);
  block(wall, L.x0, 0, L.z1, L.door.x - 0.5, L.h, L.z1 + 0.1, g); block(wall, L.door.x + 0.5, 0, L.z1, L.x1, L.h, L.z1 + 0.1, g); block(wall, L.door.x - 0.5, 2.05, L.z1, L.door.x + 0.5, L.h, L.z1 + 0.1, g);
  block(M.white, L.x0, 0, L.z0, L.x1, 0.08, L.z0 + 0.015, g);
  // Familien-PC am Schreibtisch, Bürostuhl
  block(M.desk, L.desk.x - 0.7, 0.72, L.z0 + 0.02, L.desk.x + 0.7, 0.76, L.z0 + 0.68, g); for (const x of [-0.65, 0.65]) block(M.desk, L.desk.x + x - 0.03, 0, L.z0 + 0.04, L.desk.x + x + 0.03, 0.72, L.z0 + 0.66, g);
  const mon = new THREE.Group(); mon.position.set(L.desk.x, 0.76, L.z0 + 0.22); g.add(mon); block(M.plastic, -0.05, 0, -0.05, 0.05, 0.2, 0.05, mon); block(M.plastic, -0.36, 0.16, -0.025, 0.36, 0.56, 0.02, mon);
  const screens = { on: gameScreenTex(true), off: gameScreenTex(false) }; const scr = mesh(new THREE.PlaneGeometry(0.68, 0.36), new THREE.MeshBasicMaterial({ map: screens.on, toneMapped: false }), 0, 0.36, 0.021, mon, { cast: false });
  const glow = new THREE.PointLight(0x7a6aff, 1.6, 4, 2); glow.position.set(L.desk.x, 1.1, L.z0 + 0.6); g.add(glow);
  block(M.plastic, L.desk.x - 0.25, 0.76, L.z0 + 0.4, L.desk.x + 0.25, 0.78, L.z0 + 0.55, g); block(M.plastic, L.desk.x + 0.4, 0, L.z0 + 0.1, L.desk.x + 0.62, 0.45, L.z0 + 0.55, g);
  const plug = block(M.white, L.socket.x - 0.04, 0.28, L.z0 + 0.005, L.socket.x + 0.04, 0.36, L.z0 + 0.02, g, { cast: false }); const cable = block(M.plastic, L.socket.x - 0.012, 0.0, L.z0 + 0.02, L.socket.x + 0.012, 0.32, L.z0 + 0.045, g, { cast: false });
  { const c = new THREE.Group(); c.position.set(L.chair.x, 0, L.chair.z); g.add(c); block(M.plastic, -0.24, 0.42, -0.22, 0.24, 0.48, 0.22, c); block(M.plastic, -0.23, 0.5, 0.18, 0.23, 1.1, 0.24, c); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 10), M.metal, 0, 0.21, 0, c); }
  // Sofa, Couchtisch, Fernseher, Stehlampe, Regal, Pflanze, Teppich, Bilder, Fenster mit Vorhang
  const sofa = std({ color: 0x4a5a6a, roughness: 0.9 }); block(sofa, L.x1 - 0.95, 0, -1.2, L.x1 - 0.05, 0.45, 1.6, g); block(sofa, L.x1 - 0.3, 0.45, -1.2, L.x1 - 0.05, 0.9, 1.6, g); block(sofa, L.x1 - 0.95, 0.45, -1.2, L.x1 - 0.3, 0.65, -0.95, g); block(sofa, L.x1 - 0.95, 0.45, 1.35, L.x1 - 0.3, 0.65, 1.6, g);
  for (const z of [-0.5, 0.6]) { const k = block(std({ color: [0xc0332a, 0xe8a21c][z > 0 ? 1 : 0], roughness: 0.9 }), L.x1 - 0.42, 0.5, z - 0.2, L.x1 - 0.28, 0.82, z + 0.2, g); k.rotation.z = 0.2; }
  block(M.desk, L.x1 - 1.9, 0.38, -0.5, L.x1 - 1.2, 0.42, 0.7, g); for (const [x, z] of [[-1.85, -0.45], [-1.25, -0.45], [-1.85, 0.65], [-1.25, 0.65]]) block(M.desk, L.x1 + x - 0.02, 0, z - 0.02, L.x1 + x + 0.02, 0.38, z + 0.02, g);
  block(M.bedFrame, L.x0 + 0.02, 0, -0.9, L.x0 + 0.45, 0.5, 0.9, g); block(M.plastic, L.x0 + 0.1, 0.5, -0.75, L.x0 + 0.14, 1.25, 0.75, g); mesh(new THREE.PlaneGeometry(1.46, 0.71), std({ color: 0x06070a, roughness: 0.2 }), L.x0 + 0.145, 0.875, 0, g, { ry: Math.PI / 2, cast: false });
  const lampPos = V3(L.x1 - 0.4, 0, -1.9); mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 18), M.lampBody, lampPos.x, 0.015, lampPos.z, g); mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.55, 8), M.lampBody, lampPos.x, 0.8, lampPos.z, g); mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 20, 1, true), std({ color: 0xf2e2c2, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffd8a0, emissiveIntensity: 0.6 }), lampPos.x, 1.66, lampPos.z, g, { cast: false });
  const lamp = new THREE.PointLight(0xffd6a0, 3.2, 8, 2); lamp.position.set(L.x + lampPos.x, 1.55, lampPos.z); lamp.castShadow = false; scene.add(lamp);
  const ceil = new THREE.PointLight(0xffe8c8, 2.2, 9, 2); ceil.position.set(L.x, 2.3, 0.3); scene.add(ceil);
  block(M.desk, L.x0 + 0.02, 0, 1.3, L.x0 + 0.38, 1.9, 2.3, g); for (let i = 0; i < 4; i++) block(M.white, L.x0 + 0.03, 0.4 + i * 0.4, 1.32, L.x0 + 0.37, 0.42 + i * 0.4, 2.28, g);
  const pot = std({ color: 0xb4583a, roughness: 0.8 }); const leaf = std({ color: 0x2f6a2e, roughness: 0.7 }); mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.34, 14), pot, L.x1 - 0.35, 0.17, 2.1, g); for (let i = 0; i < 9; i++) mesh(new THREE.SphereGeometry(0.13, 8, 6), leaf, L.x1 - 0.35 + Math.sin(i * 2.1) * 0.12, 0.5 + (i % 3) * 0.13, 2.1 + Math.cos(i * 2.1) * 0.12, g);
  mesh(new THREE.PlaneGeometry(2.4, 1.8), std({ map: T.rug, roughness: 1, color: 0xc88a6a }), 0.6, 0.004, 0.1, g, { rx: -Math.PI / 2, cast: false });
  for (const [x, w, h, c] of [[-1.6, 0.5, 0.4, 0x6a8aaa], [-0.9, 0.35, 0.45, 0xaa6a5a], [1.4, 0.6, 0.4, 0x7a9a6a]]) { block(std({ color: 0x2a1e14 }), x - w / 2 - 0.03, 1.5 - 0.03, L.z0 + 0.001, x + w / 2 + 0.03, 1.5 + h + 0.03, L.z0 + 0.02, g, { cast: false }); block(std({ color: c, roughness: 0.9 }), x - w / 2, 1.5, L.z0 + 0.02, x + w / 2, 1.5 + h, L.z0 + 0.025, g, { cast: false }); }
  return { g, scr, screens, glow, lamp, ceil, plug, cable };
}

// ---------------- Mama, Papa, die Kumpels und Ludwig als Film-Figuren (Figuren vom Startbildschirm) ----------------
export const CAST_LOOKS = { // Rot, Gelb und Grün in denselben Farben wie auf der Riesenzigarette
  ludwig: { ...LUDWIG_LOOK },
  mama: { shirt: 0xb86a7a, cap: 0x3a3442, hair: 0x6a3a1e, skin: 0xeac3a0, pants: 0x3a3442, shoe: 0x3a2a24, frau: 'dutt', rock: 0x3a3442 },
  papa: { shirt: 0x4a5a6a, cap: 0x1c2a5a, hair: 0x4a3a2a, skin: 0xe2b08c, pants: 0x2a2c32, shoe: 0x241a14, hut: 'keine', bart: 'schnauzer', face: 'flat' },
  rot: { shirt: 0xc0332a, cap: 0x8a221c, hair: 0x3a2a1e, skin: 0xe2b08c, pants: 0x2a2f3a, face: 'smile' },
  gelb: { shirt: 0xe8a21c, cap: 0xa86a10, hair: 0x5a3a1e, skin: 0xe8bc98, pants: 0x2a2f3a, face: 'smile' },
  gruen: { shirt: 0x2f9a48, cap: 0x1f6a34, hair: 0x2a1c14, skin: 0xc8946a, pants: 0x2a2f3a, face: 'grin' },
};
export function buildCast(scene) {
  const out = {}; for (const [k, look] of Object.entries(CAST_LOOKS)) { const P = createPerson(scene, look); P.setVisible(false); out[k] = P; }
  return out;
}

// ---------------- Kollision: Möbel als Rechtecke (x0, z0, x1, z1) ----------------
export function colliders(boxTier) {
  const R = ROOM; const out = [
    { x0: TABLE.x0, z0: TABLE.z0, x1: TABLE.x1, z1: TABLE.z1 }, ...SEATS.map((s) => ({ x0: s.x - 0.23, z0: s.z - 0.23, x1: s.x + 0.23, z1: s.z + 0.23 })),
    { x0: R.x0, z0: -1.75, x1: R.x0 + 0.68, z1: -0.05 }, { x0: -2.72, z0: -1.16, x1: -2.2, z1: -0.64 }, { x0: R.x0, z0: R.z0, x1: R.x0 + 1.22, z1: R.z0 + 0.64 }, { x0: R.x1 - 1.03, z0: R.z0, x1: R.x1, z1: -0.9 }, { x0: -0.65, z0: R.z0, x1: 0.65, z1: R.z0 + 0.13 },
    ...DEKO_BOXES,
  ];
  if (boxTier >= 3) out.push({ x0: CABINET.x0, z0: CABINET.z0, x1: CABINET.x1, z1: CABINET.z1 });
  return out;
}

// ---------------- Alles zusammen ----------------
export function buildLudwigWorld(renderer, { shadows = true, shadowSize = 2048 } = {}) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07090f);
  const T = { floor: parquetTex(), wall: paintTex('#7f93a6'), ceil: paintTex('#d9d7d0', 2), desk: woodTex('#c9a476', '#7a5530', 3, [1, 1]), dark: woodTex('#5a3c26', '#2a1a0e', 6, [1, 2]), crate: woodTex('#b08a5a', '#5a3c1e', 9, [2, 1]), plaid: plaidTex(), rug: rugTex(), posterLevel: posterTex('level'), posterFc: posterTex('fc'), posterCar: posterTex('car'), note: noteTex(), bookletLabel: labelTex('BLÄTTCHEN', 'extra dünn', '#f1ece0', '#1c3f86'), pouchLabel: labelTex('FEIN', 'schnitt', '#e9e2c8', '#1f5a3a'), box: boxTex(), sky: skyTex(), hedge: hedgeTex(), asphalt: asphaltTex(), tobacco: tobaccoTex() };
  const M = {
    floor: std({ map: T.floor, roughness: 0.5, metalness: 0 }), wall: std({ map: T.wall, roughness: 0.95 }), ceil: std({ map: T.ceil, roughness: 1 }), white: std({ color: 0xeceae4, roughness: 0.45 }), metal: std({ color: 0xb8bcc0, metalness: 0.75, roughness: 0.3 }), metalDark: std({ color: 0x2a2d32, metalness: 0.6, roughness: 0.45 }), plastic: std({ color: 0x18191c, roughness: 0.5 }),
    desk: std({ map: T.desk, roughness: 0.55 }), chairWood: std({ map: T.dark, roughness: 0.6 }), cushion: [std({ color: 0xc0332a, roughness: 0.9 }), std({ color: 0x2c62c8, roughness: 0.9 }), std({ color: 0xe8a21c, roughness: 0.9 }), std({ color: 0x3a9a5a, roughness: 0.9 })], mat: std({ color: 0x1f4a3a, roughness: 0.85 }), lampBody: std({ color: 0x20242a, roughness: 0.35, metalness: 0.5 }), lampShade: std({ color: 0x20242a, roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }), bulb: std({ color: 0xffffff, emissive: 0xffe0a8, emissiveIntensity: 6 }),
    bedFrame: std({ map: T.dark, roughness: 0.6 }), sheet: std({ color: 0xe6e4dc, roughness: 0.95 }), blanket: std({ map: T.plaid, roughness: 0.95 }), wardrobe: std({ map: T.desk, color: 0xd8d0c4, roughness: 0.6 }), wardrobeDoor: std({ color: 0xf0ede6, roughness: 0.45 }), door: std({ color: 0xf2efe8, roughness: 0.5 }), gameDesk: std({ color: 0x1c1d21, roughness: 0.4 }), curtain: std({ color: 0x2f4a52, roughness: 0.95, side: THREE.DoubleSide }),
    gravel: std({ color: 0x5a554e, roughness: 1 }), grass: std({ color: 0x1c2a18, roughness: 1 }), pave: std({ color: 0x5f5e5a, roughness: 0.95 }), asphalt: std({ map: T.asphalt, roughness: 0.9 }), curb: std({ color: 0x8a8882, roughness: 0.9 }), hedge: std({ map: T.hedge, roughness: 1 }),
    card: std({ color: 0xb98c56, roughness: 0.92 }), crate: std({ map: T.crate, roughness: 0.85 }), crateDark: std({ color: 0x4a3218, roughness: 0.9 }), leather: std({ color: 0x6a3a1e, roughness: 0.55 }), lining: std({ color: 0x8a1c2a, roughness: 0.9 }), strap: std({ color: 0x2a1a10, roughness: 0.7 }),
    paper: std({ color: 0xf6f3ec, roughness: 0.85, side: THREE.DoubleSide }), cigPaper: std({ color: 0xf7f5f0, roughness: 0.7 }), tobaccoEnd: std({ map: T.tobacco, roughness: 1 }), tobacco: std({ map: T.tobacco, color: 0xc8a080, roughness: 1 }),
  };
  const cigGeo = cigGeometry(); const cigMats = [M.cigPaper, M.tobaccoEnd, M.tobaccoEnd];
  const room = buildRoom(scene, M); const win = buildWindow(scene, M); const table = buildTable(scene, M); const pc = buildPcCorner(scene, M, T); const furn = buildFurniture(scene, M, T); const out = buildOutside(scene, M, T);
  const seats = SEATS.map((s) => buildSeatProps(scene, M, T, s, cigGeo, cigMats)); const stash = buildStash(scene, M, T, cigMats);
  const fly = []; for (let i = 0; i < 10; i++) { const f = mesh(cigGeo, cigMats, 0, 0, 0, scene, { cast: false }); f.visible = false; fly.push(f); }
  // Licht: Pendelleuchte über dem Tisch (Schatten), warmes Raumlicht, LED-Streifen, Laterne draußen (Schatten, damit nichts durch die Wand scheint)
  const pend = new THREE.SpotLight(0xffe2b8, 7, 7, 1.1, 0.6, 2); pend.position.set(0, ROOM.h - 0.78, 0.1); pend.target.position.set(0, TABLE.y, 0.15); pend.castShadow = shadows; pend.shadow.mapSize.set(shadowSize, shadowSize); pend.shadow.bias = -0.0002; pend.shadow.normalBias = 0.01; pend.shadow.camera.near = 0.1; pend.shadow.camera.far = 6; scene.add(pend, pend.target);
  const fill = new THREE.PointLight(0xffe2c0, 2.4, 12, 2); fill.position.set(0.4, 2.35, 1.4); scene.add(fill);
  const ledA = new THREE.PointLight(0xa64dff, 1.2, 6, 2); ledA.position.set(-2.4, 2.4, -2.5); const ledB = new THREE.PointLight(0xa64dff, 1.0, 6, 2); ledB.position.set(-3.1, 2.4, 1.0); scene.add(ledA, ledB);
  const deskLamp = new THREE.PointLight(0xffd6a0, 0.5, 3, 2); deskLamp.position.set(ROOM.x0 + 0.5, 1.1, -1.6); scene.add(deskLamp);
  const hall = new THREE.PointLight(0xffd9a0, 0.05, 1.2, 2); hall.position.set(ROOM.x1 - 0.35, 0.05, (DOOR.z0 + DOOR.z1) / 2); scene.add(hall);
  scene.add(new THREE.HemisphereLight(0x8f9cd0, 0x3a2c20, 0.75)); const moon = new THREE.DirectionalLight(0x9fb4ff, 0.3); moon.position.set(-6, 10, -14); scene.add(moon);
  const street = new THREE.SpotLight(0xffb060, 45, 16, 0.95, 0.55, 2); street.position.copy(out.lamp); street.target.position.set(0.2, OUT_Y, CUST_Z - 0.2); street.castShadow = shadows; street.shadow.mapSize.set(1024, 1024); street.shadow.bias = -0.0004; street.shadow.camera.near = 0.3; street.shadow.camera.far = 20; scene.add(street, street.target);
  // Figuren: Ludwig (nur in der Übersicht zu sehen) und sechs mögliche Kunden vor dem Fenster (immer nur einer sichtbar)
  const ludwig = createSpielfigur(LUDWIG_LOOK); scene.add(ludwig.root); const space = figureSpace(scene);
  const customers = CUSTOMER_LOOKS.map((look) => { const f = createSpielfigur(look); f.root.visible = false; scene.add(f.root); return f; });
  const living = buildLiving(scene, M, T); const cast = buildCast(scene);
  const deko = buildDeko(scene, M, T, { ROOM, WIN, DOOR }); room.front.push(deko.front); furn.door.add(deko.doorSign); // Deko an der Vorderwand verschwindet mit ihr in der Übersicht
  const update = (t, hour) => { for (const c of win.curtains) c.rotation.z = Math.sin(t * 0.7 + c.position.x) * 0.004; deko.update(t, hour); };
  return { scene, M, T, room, win, table, pc, furn, out, seats, stash, fly, cigGeo, cigMats, ludwig, space, customers, living, cast, deko, update };
}
