// Theos Seitenscheidel - Teo's Casino: Level 3 und 4.
// Kartensalon (Level 3) hinter dem rechten Tor der Rückwand: x 2,6..22,6, z −47..−30,2. Vier Blackjack-Tische (halbrund, je drei Plätze), Dealer,
// Hängelampen mit Lichtkegel, Holzvertäfelung mit grünem Neon, Jetons-Kasse, Lounge. Roulette-Galerie (Level 4) als Anbau rechts neben dem Casino
// (Tor in der rechten Hallenwand): x 22,6..40,6, z −20..0,4. Drei Roulette-Tische mit drehendem Kessel, Croupier, Gemäldegalerie, Kronleuchter.
// Echte Lichter gibt es hier keine zusätzlichen: casinoart.js verschiebt die drei Lichter der Automatenhalle in den Saal, in dem die Kamera ist.
// Statisches fasst freeze() zusammen; Bewegtes (Kessel, Kugel, Tableau, Markierung, Karten- und Jeton-Vorrat) trägt userData.live.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { BJ_TABLES, BJ_SEATS, RANK_LABEL, SUIT_LABEL } from './casinobj.js';
import { ROU_TABLES, ROU_SEATS, WHEEL, REDS, BET_LABEL } from './casinoroulette.js';
import { euro } from './casinologic.js';
import TISCH from './casinotisch.js';
import ROUTISCH from './casinoroutisch.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const FONT = 'Bahnschrift, "Segoe UI", sans-serif'; const SERIF = 'Georgia, "Palatino Linotype", serif'; const SYM = '"Segoe UI Symbol", "Segoe UI", sans-serif';
function rand(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
export const CHIP_COLORS = { 100: '#f4f1ea', 500: '#d0182c', 1000: '#2a6ad8', 2500: '#1a9a4a', 10000: '#18181c', 50000: '#7a2ac8' };
export const chipColor = (v) => { let best = 100; for (const k of Object.keys(CHIP_COLORS).map(Number)) if (v >= k) best = k; return CHIP_COLORS[best]; };

// ---------------- Spielkarten (Atlas 13 × 5: vier Farben, unten links die Rückseite) ----------------
// Echtes Blatt: Eckzeichen, richtige Augenbilder (2–10), Bildkarten mit Rahmen, klassische rote Rückseite. Gezeichnet in 240 × 336 je Karte, skaliert auf CARD_CELL.
export const CARD_CELL = { w: 200, h: 280, cols: 13, rows: 5 };
const KW = 240; const KH = 336;
const KSUIT = [
  (c, s) => { c.beginPath(); c.moveTo(0, -s * 0.5); c.bezierCurveTo(s * 0.12, -s * 0.3, s * 0.5, -s * 0.12, s * 0.5, s * 0.14); c.bezierCurveTo(s * 0.5, s * 0.34, s * 0.26, s * 0.4, s * 0.1, s * 0.22); c.quadraticCurveTo(s * 0.1, s * 0.4, s * 0.22, s * 0.5); c.lineTo(-s * 0.22, s * 0.5); c.quadraticCurveTo(-s * 0.1, s * 0.4, -s * 0.1, s * 0.22); c.bezierCurveTo(-s * 0.26, s * 0.4, -s * 0.5, s * 0.34, -s * 0.5, s * 0.14); c.bezierCurveTo(-s * 0.5, -s * 0.12, -s * 0.12, -s * 0.3, 0, -s * 0.5); c.closePath(); },
  (c, s) => { c.beginPath(); c.moveTo(0, s * 0.46); c.bezierCurveTo(-s * 0.1, s * 0.34, -s * 0.52, s * 0.08, -s * 0.52, -s * 0.18); c.bezierCurveTo(-s * 0.52, -s * 0.4, -s * 0.22, -s * 0.5, 0, -s * 0.26); c.bezierCurveTo(s * 0.22, -s * 0.5, s * 0.52, -s * 0.4, s * 0.52, -s * 0.18); c.bezierCurveTo(s * 0.52, s * 0.08, s * 0.1, s * 0.34, 0, s * 0.46); c.closePath(); },
  (c, s) => { c.beginPath(); c.moveTo(0, -s * 0.5); c.quadraticCurveTo(s * 0.06, -s * 0.12, s * 0.36, 0); c.quadraticCurveTo(s * 0.06, s * 0.12, 0, s * 0.5); c.quadraticCurveTo(-s * 0.06, s * 0.12, -s * 0.36, 0); c.quadraticCurveTo(-s * 0.06, -s * 0.12, 0, -s * 0.5); c.closePath(); },
];
// Farbzeichen: 0 Pik, 1 Herz, 2 Karo, 3 Kreuz
function kPip(c, x, y, s, kind, col, flip) { c.save(); c.translate(x, y); if (flip) c.rotate(Math.PI); c.fillStyle = col;
  if (kind === 0) { c.beginPath(); c.save(); c.scale(1, -1); KSUIT[1](c, s); c.restore(); c.fill(); c.beginPath(); c.moveTo(0, s * 0.12); c.quadraticCurveTo(s * 0.04, s * 0.38, s * 0.2, s * 0.5); c.lineTo(-s * 0.2, s * 0.5); c.quadraticCurveTo(-s * 0.04, s * 0.38, 0, s * 0.12); c.fill(); }
  else if (kind === 3) { for (const [dx, dy] of [[0, -0.22], [-0.23, 0.1], [0.23, 0.1]]) { c.beginPath(); c.arc(dx * s, dy * s, s * 0.21, 0, 7); c.fill(); } c.beginPath(); c.moveTo(-s * 0.05, 0); c.lineTo(-s * 0.16, s * 0.5); c.lineTo(s * 0.16, s * 0.5); c.lineTo(s * 0.05, 0); c.closePath(); c.fill(); }
  else { KSUIT[kind](c, s); c.fill(); }
  c.restore(); }
const KL = 0.27; const KC = 0.5; const KR = 0.73; const KT = 0.2; const KB = 0.8;
const KPIPS = { 1: [[KC, 0.5]], 2: [[KC, KT], [KC, KB]], 3: [[KC, KT], [KC, 0.5], [KC, KB]], 4: [[KL, KT], [KR, KT], [KL, KB], [KR, KB]], 5: [[KL, KT], [KR, KT], [KC, 0.5], [KL, KB], [KR, KB]],
  6: [[KL, KT], [KR, KT], [KL, 0.5], [KR, 0.5], [KL, KB], [KR, KB]], 7: [[KL, KT], [KR, KT], [KC, 0.35], [KL, 0.5], [KR, 0.5], [KL, KB], [KR, KB]], 8: [[KL, KT], [KR, KT], [KC, 0.35], [KL, 0.5], [KR, 0.5], [KC, 0.65], [KL, KB], [KR, KB]],
  9: [[KL, KT], [KR, KT], [KL, 0.4], [KR, 0.4], [KC, 0.5], [KL, 0.6], [KR, 0.6], [KL, KB], [KR, KB]], 10: [[KL, KT], [KR, KT], [KC, 0.3], [KL, 0.4], [KR, 0.4], [KL, 0.6], [KR, 0.6], [KC, 0.7], [KL, KB], [KR, KB]] };
function kCourt(c, x, y, w, h, rank, col, kind) {
  c.save(); rr(c, x, y, w, h, 6); c.clip(); c.fillStyle = '#fbf3da'; c.fillRect(x, y, w, h);
  const half = (flip) => { c.save(); c.translate(x + w / 2, y + h / 2); if (flip) c.rotate(Math.PI); c.translate(-w / 2, -h / 2);
    const cx = w / 2; const base = h / 2; const sc = w / 120; const red = col === '#c8102e';
    c.fillStyle = red ? '#c8102e' : '#1a2a6a'; c.beginPath(); c.moveTo(cx - 52 * sc, base); c.lineTo(cx - 44 * sc, base - 40 * sc); c.quadraticCurveTo(cx - 10 * sc, base - 54 * sc, cx, base - 52 * sc); c.quadraticCurveTo(cx + 10 * sc, base - 54 * sc, cx + 44 * sc, base - 40 * sc); c.lineTo(cx + 52 * sc, base); c.closePath(); c.fill();
    c.fillStyle = '#e6b422'; c.beginPath(); c.moveTo(cx - 8 * sc, base - 52 * sc); c.lineTo(cx, base - 22 * sc); c.lineTo(cx + 8 * sc, base - 52 * sc); c.closePath(); c.fill(); c.fillStyle = red ? '#1a2a6a' : '#c8102e'; c.fillRect(cx - 52 * sc, base - 10 * sc, 104 * sc, 8 * sc); c.strokeStyle = '#e6b422'; c.lineWidth = 2 * sc; c.strokeRect(cx - 50 * sc, base - 10 * sc, 100 * sc, 8 * sc);
    c.fillStyle = '#f2c9a0'; c.beginPath(); c.ellipse(cx, base - 68 * sc, 15 * sc, 18 * sc, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(60,30,10,.7)'; c.lineWidth = 1.5 * sc; c.stroke();
    c.fillStyle = '#3a2410'; c.beginPath(); c.arc(cx - 6 * sc, base - 70 * sc, 1.8 * sc, 0, 7); c.arc(cx + 6 * sc, base - 70 * sc, 1.8 * sc, 0, 7); c.fill(); c.strokeStyle = '#a0402a'; c.lineWidth = 1.6 * sc; c.beginPath(); c.moveTo(cx - 5 * sc, base - 62 * sc); c.quadraticCurveTo(cx, base - 59 * sc, cx + 5 * sc, base - 62 * sc); c.stroke();
    if (rank === 12) { c.fillStyle = '#6a4a22'; c.beginPath(); c.moveTo(cx - 14 * sc, base - 66 * sc); c.quadraticCurveTo(cx, base - 40 * sc, cx + 14 * sc, base - 66 * sc); c.quadraticCurveTo(cx, base - 56 * sc, cx - 14 * sc, base - 66 * sc); c.fill(); }
    if (rank === 11) { c.fillStyle = '#6a3a12'; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(cx + sx * 17 * sc, base - 70 * sc); c.quadraticCurveTo(cx + sx * 24 * sc, base - 38 * sc, cx + sx * 14 * sc, base - 34 * sc); c.lineTo(cx + sx * 12 * sc, base - 64 * sc); c.closePath(); c.fill(); } }
    if (rank === 10) { c.fillStyle = '#1a2a6a'; c.beginPath(); c.ellipse(cx, base - 82 * sc, 19 * sc, 8 * sc, 0, Math.PI, 0); c.fill(); c.fillRect(cx - 21 * sc, base - 83 * sc, 42 * sc, 5 * sc); c.strokeStyle = '#c8102e'; c.lineWidth = 3 * sc; c.beginPath(); c.moveTo(cx + 10 * sc, base - 84 * sc); c.quadraticCurveTo(cx + 34 * sc, base - 100 * sc, cx + 28 * sc, base - 76 * sc); c.stroke(); }
    else { c.fillStyle = '#e6b422'; c.beginPath(); c.moveTo(cx - 16 * sc, base - 80 * sc); c.lineTo(cx - 20 * sc, base - 98 * sc); c.lineTo(cx - 8 * sc, base - 90 * sc); c.lineTo(cx, base - 102 * sc); c.lineTo(cx + 8 * sc, base - 90 * sc); c.lineTo(cx + 20 * sc, base - 98 * sc); c.lineTo(cx + 16 * sc, base - 80 * sc); c.closePath(); c.fill(); c.strokeStyle = '#8a6a10'; c.lineWidth = 1.5 * sc; c.stroke(); c.fillStyle = col; for (const dx of [-12, 0, 12]) { c.beginPath(); c.arc(cx + dx * sc, base - 84 * sc, 2 * sc, 0, 7); c.fill(); } }
    kPip(c, cx + 28 * sc, base - 24 * sc, 18 * sc, kind, col, false); c.restore(); };
  half(false); half(true); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke(); c.restore();
  c.strokeStyle = col; c.lineWidth = 3; rr(c, x, y, w, h, 6); c.stroke(); }
function kFace(c, ox, oy, kind, r) {
  const rk = RANK_LABEL[r]; const col = kind === 1 || kind === 2 ? '#c8102e' : '#16161a';
  c.save(); c.translate(ox, oy); rr(c, 4, 4, KW - 8, KH - 8, 18); c.fillStyle = '#fdfcf7'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#cdc6b4'; c.stroke(); c.save(); rr(c, 4, 4, KW - 8, KH - 8, 18); c.clip();
  const idx = (flip) => { c.save(); if (flip) { c.translate(KW, KH); c.rotate(Math.PI); } c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `bold ${rk === '10' ? 46 : 54}px ${SERIF}`; c.fillText(rk, 30, 46); kPip(c, 30, 92, 30, kind, col, false); c.restore(); }; idx(false); idx(true);
  const ax = 60; const ay = 36; const aw = KW - 120; const ah = KH - 72;
  if (r >= 10) kCourt(c, 56, 34, KW - 112, KH - 68, r, col, kind); else if (r === 0) kPip(c, KW / 2, KH / 2, 120, kind, col, false); else for (const [px, py] of KPIPS[r + 1]) kPip(c, ax + px * aw, ay + py * ah, 40, kind, col, py > 0.5);
  c.restore(); c.restore(); }
function kBack(c, ox, oy) {
  c.save(); c.translate(ox, oy); rr(c, 4, 4, KW - 8, KH - 8, 18); c.fillStyle = '#fdfcf7'; c.fill(); c.strokeStyle = '#cdc6b4'; c.lineWidth = 2; c.stroke(); c.save(); rr(c, 4, 4, KW - 8, KH - 8, 18); c.clip();
  c.fillStyle = '#a40e22'; rr(c, 18, 18, KW - 36, KH - 36, 10); c.fill(); c.save(); rr(c, 18, 18, KW - 36, KH - 36, 10); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; for (let k = -30; k < 30; k++) { c.beginPath(); c.moveTo(k * 22, 0); c.lineTo(k * 22 + 340, KH); c.stroke(); c.beginPath(); c.moveTo(k * 22 + 340, 0); c.lineTo(k * 22, KH); c.stroke(); }
  c.fillStyle = '#a40e22'; c.beginPath(); c.ellipse(KW / 2, KH / 2, 52, 66, 0, 0, 7); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke(); c.lineWidth = 2; c.beginPath(); c.ellipse(KW / 2, KH / 2, 42, 55, 0, 0, 7); c.stroke();
  c.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { c.save(); c.translate(KW / 2, KH / 2); c.rotate(i * Math.PI / 4); c.beginPath(); c.moveTo(0, -48); c.lineTo(8, -26); c.lineTo(-8, -26); c.closePath(); c.fill(); c.restore(); }
  c.restore(); c.strokeStyle = '#fff'; c.lineWidth = 3; rr(c, 18, 18, KW - 36, KH - 36, 10); c.stroke(); c.restore(); c.restore(); }
export function drawCardAtlas(c, W, H) {
  c.clearRect(0, 0, W, H); c.save(); c.scale(CARD_CELL.w / KW, CARD_CELL.h / KH);
  for (let s = 0; s < 4; s++) for (let r = 0; r < 13; r++) kFace(c, r * KW, s * KH, s, r);
  kBack(c, 0, 4 * KH); c.restore();
}
export const cardUV = (c) => { const i = c < 0 ? 52 : c; const col = i === 52 ? 0 : i % 13; const row = i === 52 ? 4 : Math.floor(i / 13); const { cols, rows } = CARD_CELL; return { u0: col / cols, u1: (col + 1) / cols, v0: 1 - (row + 1) / rows, v1: 1 - row / rows }; };

// ---------------- Roulette-Tableau (Koordinaten in 2048 × 1000) ----------------
export const ROU_CELLS = (() => {
  const out = [{ k: 'n0', x: 40, y: 60, w: 150, h: 600, label: '0', col: 'gruen' }];
  for (let c = 0; c < 12; c++) for (let r = 0; r < 3; r++) { const n = 3 * c + (3 - r); out.push({ k: 'n' + n, x: 190 + c * 138, y: 60 + r * 200, w: 138, h: 200, label: String(n), col: REDS.has(n) ? 'rot' : 'schwarz' }); }
  for (let r = 0; r < 3; r++) out.push({ k: 'k' + (3 - r), x: 1846, y: 60 + r * 200, w: 144, h: 200, label: '2:1', col: 'feld' });
  for (let d = 0; d < 3; d++) out.push({ k: 'd' + (d + 1), x: 190 + d * 552, y: 660, w: 552, h: 140, label: ['1. Dutzend', '2. Dutzend', '3. Dutzend'][d], col: 'feld' });
  ['tief', 'gerade', 'rot', 'schwarz', 'ungerade', 'hoch'].forEach((k, j) => out.push({ k, x: 190 + j * 276, y: 800, w: 276, h: 140, label: BET_LABEL[k], col: k === 'rot' ? 'rotfeld' : k === 'schwarz' ? 'schwarzfeld' : 'feld' }));
  return out;
})();
export function drawRouLayout(c, W, H, st = {}) {
  const s = W / 2048; c.save(); c.scale(s, H / 1000); const g = c.createLinearGradient(0, 0, 0, 1000); g.addColorStop(0, '#0d5a34'); g.addColorStop(1, '#0a4a2a'); c.fillStyle = g; c.fillRect(0, 0, 2048, 1000);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  for (const cl of ROU_CELLS) {
    c.lineWidth = 5; c.strokeStyle = '#f2e6c8'; c.strokeRect(cl.x, cl.y, cl.w, cl.h);
    if (cl.col === 'rot' || cl.col === 'schwarz' || cl.col === 'gruen') { const cx = cl.x + cl.w / 2; const cy = cl.y + cl.h / 2; c.fillStyle = cl.col === 'rot' ? '#c8142a' : cl.col === 'gruen' ? '#0a7a3c' : '#141414'; c.beginPath(); c.ellipse(cx, cy, cl.k === 'n0' ? 52 : 50, cl.k === 'n0' ? 80 : 62, 0, 0, 7); c.fill(); c.fillStyle = '#fff6e0'; c.font = `800 ${cl.k === 'n0' ? 78 : 64}px ${FONT}`; c.save(); c.translate(cx, cy); if (cl.k !== 'n0') c.rotate(-Math.PI / 2); c.fillText(cl.label, 0, 4); c.restore(); }
    else if (cl.col === 'rotfeld' || cl.col === 'schwarzfeld') { const cx = cl.x + cl.w / 2; const cy = cl.y + cl.h / 2; c.fillStyle = cl.col === 'rotfeld' ? '#c8142a' : '#141414'; c.beginPath(); c.moveTo(cx, cy - 46); c.lineTo(cx + 80, cy); c.lineTo(cx, cy + 46); c.lineTo(cx - 80, cy); c.closePath(); c.fill(); c.strokeStyle = '#f2e6c8'; c.lineWidth = 3; c.stroke(); }
    else { c.fillStyle = '#f2e6c8'; c.font = `700 ${cl.w > 400 ? 54 : 46}px ${FONT}`; c.fillText(cl.label, cl.x + cl.w / 2, cl.y + cl.h / 2 + 2); }
  }
  c.fillStyle = 'rgba(242,230,200,.55)'; c.font = `italic 600 40px ${SERIF}`; c.fillText("Teo's Casino · Bei Null gibt es auf die einfachen Chancen die Hälfte zurück", 1024, 985);
  // gesetzte Jetons
  for (const [k, v] of Object.entries(st.bets || {})) { const cl = ROU_CELLS.find((q) => q.k === k); if (!cl) continue; const cx = cl.x + cl.w / 2 + (cl.k[0] === 'n' ? 22 : 60); const cy = cl.y + cl.h / 2 - (cl.k[0] === 'n' ? 24 : 0); const col = chipColor(v);
    for (let i = 0; i < 3; i++) { c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.arc(cx + 5, cy + 7 - i * 6, 46, 0, 7); c.fill(); } c.fillStyle = col; c.beginPath(); c.arc(cx, cy - 12, 46, 0, 7); c.fill(); c.lineWidth = 9; c.setLineDash([16, 12]); c.strokeStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(cx, cy - 12, 38, 0, 7); c.stroke(); c.setLineDash([]);
    c.fillStyle = col === '#f4f1ea' ? '#141414' : '#fff'; c.font = `900 ${v >= 100000 ? 26 : 32}px ${FONT}`; c.fillText(euro(v, false).replace(' €', ''), cx, cy - 10); }
  if (st.win !== undefined && st.win !== null) { const cl = ROU_CELLS.find((q) => q.k === 'n' + st.win); if (cl) { c.lineWidth = 14; c.strokeStyle = '#ffd24a'; c.shadowColor = '#ffd24a'; c.shadowBlur = 30; c.strokeRect(cl.x + 8, cl.y + 8, cl.w - 16, cl.h - 16); c.shadowBlur = 0; } }
  c.restore();
}
export function cellCenter(k) { const cl = ROU_CELLS.find((q) => q.k === k); return cl ? { x: (cl.x + cl.w / 2) / 2048, y: (cl.y + cl.h / 2) / 1000 } : null; }

// ---------------- Kessel-Scheibe (37 Fächer) ----------------
export const POCKET = (2 * Math.PI) / 37;
function drawRotor(c, S) {
  const cx = S / 2; const cy = S / 2; const R = S / 2; c.fillStyle = '#2a160a'; c.fillRect(0, 0, S, S);
  for (let i = 0; i < 37; i++) { const n = WHEEL[i]; const th = i * POCKET; const a0 = -th - POCKET / 2; const a1 = -th + POCKET / 2; const col = n === 0 ? '#0a8a40' : REDS.has(n) ? '#c8142a' : '#141414';
    c.fillStyle = col; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R * 0.99, a0, a1); c.closePath(); c.fill();
    c.fillStyle = n === 0 ? '#06602a' : REDS.has(n) ? '#8a0a1a' : '#0a0a0a'; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R * 0.79, a0, a1); c.closePath(); c.fill();
    c.save(); c.translate(cx + Math.cos(th) * R * 0.89, cy - Math.sin(th) * R * 0.89); c.rotate(Math.PI / 2 - th); c.fillStyle = '#fff3d8'; c.font = `800 ${S * 0.045}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), 0, 0); c.restore(); }
  c.strokeStyle = '#e8c070'; c.lineWidth = S * 0.012; for (const r of [0.99, 0.8, 0.62]) { c.beginPath(); c.arc(cx, cy, R * r, 0, 7); c.stroke(); }
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, R * 0.62); g.addColorStop(0, '#f0c870'); g.addColorStop(0.35, '#a06a24'); g.addColorStop(1, '#4a2a10'); c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R * 0.61, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,230,160,.45)'; c.lineWidth = S * 0.006; for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * 0.12, cy + Math.sin(a) * R * 0.12); c.lineTo(cx + Math.cos(a) * R * 0.6, cy + Math.sin(a) * R * 0.6); c.stroke(); }
}

// ======================================================================
// Kartensalon (Level 3)
// ======================================================================
export function buildCardHall(K) {
  const { scene, M, room, mesh, box, cyl, ctex, std, neonSign, plateTex, xBoxes, xCircles } = K;
  const X0 = 2.6; const X1 = 22.6; const Z0 = -47; const Z1 = -30.2; const HH = 6.2; const cx = (X0 + X1) / 2; const cz = (Z0 + Z1) / 2; const W = X1 - X0; const D = Z1 - Z0;
  // Boden: smaragdgrüner Teppich mit goldenen Kartenfarben
  { const t = ctex(512, 512, (c, S) => { c.fillStyle = '#062a1c'; c.fillRect(0, 0, S, S); const r = rand(77); for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '40,120,80'},${r() * 0.12})`; c.fillRect(r() * S, r() * S, 2, 2); }
      c.strokeStyle = 'rgba(214,170,80,.4)'; c.lineWidth = 3; for (let k = 0; k <= 4; k++) { c.beginPath(); c.moveTo(k * S / 4, 0); c.lineTo(k * S / 4, S); c.stroke(); c.beginPath(); c.moveTo(0, k * S / 4); c.lineTo(S, k * S / 4); c.stroke(); }
      c.fillStyle = 'rgba(214,170,80,.55)'; c.font = `46px ${SYM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; ['♠', '♥', '♦', '♣'].forEach((s, i) => { for (let j = 0; j < 4; j++) c.fillText(s, (j + 0.5) * S / 4, ((i + j) % 4 + 0.5) * S / 4); }); });
    t.repeat.set(W / 3, D / 3); t.anisotropy = 8; const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2); mesh(g, std({ map: t, roughness: 0.95, envMap: room.env, envMapIntensity: 0.25 }), cx, 0.004, cz, { cast: false }); }
  // Wände: dunkle Holzvertäfelung, goldene Leisten, grüne Neonlinie
  { const wt = ctex(512, 512, (c, S) => { const g = c.createLinearGradient(0, 0, S, 0); g.addColorStop(0, '#2a1409'); g.addColorStop(0.5, '#3a1d0e'); g.addColorStop(1, '#2a1409'); c.fillStyle = g; c.fillRect(0, 0, S, S); const r = rand(5); c.globalAlpha = 0.18; for (let i = 0; i < 90; i++) { c.strokeStyle = r() < 0.5 ? '#1a0a04' : '#5a3018'; c.lineWidth = 1 + r() * 2; const x = r() * S; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 8, S * 0.3, x - 8, S * 0.6, x + 4, S); c.stroke(); } c.globalAlpha = 1;
      c.strokeStyle = '#1a0a04'; c.lineWidth = 10; c.strokeRect(24, 60, S - 48, S * 0.55); c.strokeRect(24, S * 0.72, S - 48, S * 0.22); c.strokeStyle = '#b8893a'; c.lineWidth = 3; c.strokeRect(34, 70, S - 68, S * 0.55 - 20); c.strokeRect(34, S * 0.72 + 10, S - 68, S * 0.22 - 20); c.fillStyle = '#b8893a'; c.fillRect(0, S * 0.665, S, 6); }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    const et = ctex(64, 512, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); const g = c.createLinearGradient(0, 0, 0, 24); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, '#3aff9a'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.save(); c.translate(0, 18); c.fillRect(0, 0, w, 24); c.restore(); }); et.wrapS = et.wrapT = THREE.RepeatWrapping;
    const wallM = (len) => { const a = wt.clone(); a.needsUpdate = true; a.repeat.set(len / 2.6, HH / 4.6); const e = et.clone(); e.needsUpdate = true; e.repeat.set(len, 1); return std({ map: a, emissiveMap: e, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.5, envMap: room.env, envMapIntensity: 0.55 }); };
    mesh(new THREE.PlaneGeometry(W, HH), wallM(W), cx, HH / 2, Z0, { cast: false }); mesh(new THREE.PlaneGeometry(D, HH), wallM(D), X0, HH / 2, cz, { ry: Math.PI / 2, cast: false }); mesh(new THREE.PlaneGeometry(D, HH), wallM(D), X1, HH / 2, cz, { ry: -Math.PI / 2, cast: false });
    const fl = 8.8 - X0; mesh(new THREE.PlaneGeometry(fl, HH), wallM(fl), X0 + fl / 2, HH / 2, Z1, { ry: Math.PI, cast: false }); const fr = X1 - 13.2; mesh(new THREE.PlaneGeometry(fr, HH), wallM(fr), 13.2 + fr / 2, HH / 2, Z1, { ry: Math.PI, cast: false }); mesh(new THREE.PlaneGeometry(4.4, HH - 4.4), wallM(4.4), 11, (HH + 4.4) / 2, Z1, { ry: Math.PI, cast: false });
    // Kassettendecke mit warmen Punkten
    const ct = ctex(256, 256, (c, S) => { c.fillStyle = '#0c0806'; c.fillRect(0, 0, S, S); c.strokeStyle = '#6a4a1c'; c.lineWidth = 10; c.strokeRect(0, 0, S, S); c.strokeStyle = '#2a1a0c'; c.lineWidth = 4; c.strokeRect(22, 22, S - 44, S - 44); const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, 14); g.addColorStop(0, '#fff2d0'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(S / 2 - 16, S / 2 - 16, 32, 32); }); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(W / 2.5, D / 2.5);
    const cg = new THREE.PlaneGeometry(W, D); cg.rotateX(Math.PI / 2); mesh(cg, new THREE.MeshBasicMaterial({ map: ct, color: new THREE.Color(1.1, 1.05, 1.0), toneMapped: false }), cx, HH, cz, { cast: false });
    for (const [x0, x1, z0, z1] of [[X0, X1, Z0, Z0], [X0, X0, Z0, Z1], [X1, X1, Z0, Z1]]) { if (z0 === z1) box(x1 - x0, 0.14, 0.06, M.gold, (x0 + x1) / 2, 0.07, z0 + 0.03, { cast: false }); else box(0.06, 0.14, z1 - z0, M.gold, x0 + (x0 === X0 ? 0.03 : -0.03), 0.07, (z0 + z1) / 2, { cast: false }); }
    xBoxes.push({ x0: X0 - 0.3, x1: X0 + 0.05, z0: Z0, z1: Z1 }, { x0: X1 - 0.05, x1: X1 + 0.3, z0: Z0, z1: Z1 }, { x0: X0, x1: X1, z0: Z0 - 0.3, z1: Z0 + 0.05 }, { x0: X0, x1: 8.8, z0: Z1 - 0.05, z1: Z1 + 0.3 }, { x0: 13.2, x1: X1, z0: Z1 - 0.05, z1: Z1 + 0.3 }, { x0: 8.6, x1: 8.9, z0: -30.4, z1: -25.9 }, { x0: 13.1, x1: 13.4, z0: -30.4, z1: -25.9 }); }
  const sign = neonSign('KARTENSALON', 6.0, 0.9, { face: '#fff', tube: '#3aff7a', size: 230, depth: 1, glow: 3.0, haloI: 1.4 }); sign.position.set(11, 5.25, Z1 - 0.12); sign.rotation.y = Math.PI; scene.add(sign); K.insideSigns.push(sign);

  // Gemeinsame Materialien (auch für die Live-Karten und Jetons, damit die Shader beim Laden übersetzt werden)
  const atlas = ctex(CARD_CELL.w * CARD_CELL.cols, CARD_CELL.h * CARD_CELL.rows, drawCardAtlas, { clamp: true }); atlas.anisotropy = 8;
  const cardMat = std({ map: atlas, roughness: 0.5, envMap: room.env, envMapIntensity: 0.5 }); const chipMat = {}; for (const [v, col] of Object.entries(CHIP_COLORS)) chipMat[v] = std({ color: new THREE.Color(col), roughness: 0.45, envMap: room.env, envMapIntensity: 0.7 });
  const warm = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.6, 1.6), toneMapped: false });
  const poolT = ctex(256, 256, (c, S) => { const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(255,226,170,.9)'); g.addColorStop(0.55, 'rgba(255,210,140,.35)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(0, 0, S, S); }, { clamp: true });
  const poolM = new THREE.MeshBasicMaterial({ map: poolT, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const leather = std({ color: 0x2a120a, roughness: 0.55, envMap: room.env, envMapIntensity: 0.6 }); const seatM = std({ color: 0x0c4a2c, roughness: 0.45, envMap: room.env, envMapIntensity: 0.6 });
  const chrome = std({ color: 0xc8ccd2, metalness: 1, roughness: 0.22, envMap: room.env, envMapIntensity: 1.2 });
  const stool = (parent, x, z) => { cyl(0.2, 0.19, 0.08, seatM, x, 0.64, z, { parent, seg: 20 }); cyl(0.032, 0.032, 0.58, chrome, x, 0.31, z, { parent, seg: 10 }); cyl(0.22, 0.24, 0.03, chrome, x, 0.015, z, { parent, seg: 20 }); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 20), chrome); ring.position.set(x, 0.25, z); ring.rotation.x = Math.PI / 2; parent.add(ring); };

  // Blackjack-Tisch aus Blender: Geometrie einmal dekodieren, alle vier Tische teilen sie
  const b64a = (s, Ctor) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Ctor(u.buffer); };
  const tGeo = {}; for (const [k, d] of Object.entries(TISCH)) { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(b64a(d.p, Float32Array), 3)); gg.setAttribute('normal', new THREE.BufferAttribute(b64a(d.n, Float32Array), 3)); if (d.c) gg.setAttribute('color', new THREE.BufferAttribute(b64a(d.c, Float32Array), 3)); gg.setIndex(new THREE.BufferAttribute(b64a(d.i, d.w === 2 ? Uint16Array : Uint32Array), 1)); gg.computeBoundingSphere(); tGeo[k] = gg; }
  const tLeder = std({ color: 0x0b0b0d, roughness: 0.42, envMap: room.env, envMapIntensity: 0.7 }); const tLack = std({ color: 0x0a0a0c, metalness: 0.15, roughness: 0.3, envMap: room.env, envMapIntensity: 1.0 }); const tJeton = std({ vertexColors: true, roughness: 0.45, envMap: room.env, envMapIntensity: 0.7 });
  const tables = []; const seats = []; const ANG = [-0.66, 0, 0.66]; const R_SEAT = 1.62; const posT = [[7.6, -36.4], [17.6, -36.4], [7.6, -43.0], [17.6, -43.0]];
  BJ_TABLES.forEach((T, ti) => {
    const [tx, tz] = posT[ti]; const g = new THREE.Group(); g.position.set(tx, 0, tz); scene.add(g); const O = V3(0, 0, -0.55); const vip = ti === 3;
    // Filz mit Aufdruck
    const felt = ctex(1024, 512, (c, w, h) => { const ppm = w / 2.36; const gr = c.createRadialGradient(w / 2, 0, 40, w / 2, 0, h); gr.addColorStop(0, vip ? '#0e5a3c' : '#11643a'); gr.addColorStop(1, vip ? '#063a26' : '#0a4426'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      const at = (a, r) => [w / 2 + Math.sin(a) * r * ppm, Math.cos(a) * r * ppm];
      const arcText = (txt, r, span, size, col) => { c.fillStyle = col; c.font = `800 ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; const n = txt.length; for (let i = 0; i < n; i++) { const a = -span + (2 * span * (i + 0.5)) / n; const [x, y] = at(a, r); c.save(); c.translate(x, y); c.rotate(-a); c.fillText(txt[i], 0, 0); c.restore(); } };
      arcText('BLACKJACK ZAHLT 3 ZU 2', 0.66, 0.6, 34, '#e8c36a'); arcText('DER DEALER STEHT AB 17', 0.58, 0.46, 20, 'rgba(242,230,200,.8)');
      c.strokeStyle = 'rgba(232,195,106,.7)'; c.lineWidth = 3; c.beginPath(); c.arc(w / 2, 0, 0.74 * ppm, 0.2, Math.PI - 0.2); c.stroke();
      for (const a of ANG) { const [x, y] = at(a, 1.0); c.strokeStyle = '#e8c36a'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 0.085 * ppm, 0, 7); c.stroke(); c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 0.07 * ppm, 0, 7); c.stroke();
        const [bx, by] = at(a, 0.82); c.save(); c.translate(bx, by); c.rotate(-a); c.strokeStyle = 'rgba(242,230,200,.45)'; c.lineWidth = 2; c.setLineDash([8, 6]); c.strokeRect(-0.11 * ppm, -0.07 * ppm, 0.22 * ppm, 0.14 * ppm); c.restore(); c.setLineDash([]); }
      c.save(); c.translate(w / 2, 0.43 * ppm); c.strokeStyle = 'rgba(242,230,200,.45)'; c.lineWidth = 2; c.setLineDash([8, 6]); c.strokeRect(-0.24 * ppm, -0.08 * ppm, 0.48 * ppm, 0.16 * ppm); c.restore(); c.setLineDash([]);
      }, { clamp: true });
    const sh = new THREE.Shape(); sh.moveTo(-1.18, 0); sh.absarc(0, 0, 1.18, Math.PI, 2 * Math.PI, false); sh.lineTo(-1.18, 0); const fg = new THREE.ShapeGeometry(sh, 40); { const p = fg.attributes.position; const uv = fg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 1.18) / 2.36, (p.getY(i) + 1.18) / 1.18); } fg.rotateX(-Math.PI / 2);
    mesh(fg, std({ map: felt, roughness: 0.95, envMap: room.env, envMapIntensity: 0.3 }), O.x, 0.806, O.z, { parent: g, cast: false });
    // Tisch aus Blender (casinotisch.js): gepolsterte Kante, Zarge, geschwungene Beine, Streben, Jetonablage mit Rollen, Kartenschlitten, Hängelampe, drei Stühle
    for (const [k, m, cast] of [['leder', tLeder, true], ['lack', tLack, true], ['schwarz', M.black, false], ['messing', vip ? M.gold : M.brass, false], ['gold', M.gold, false], ['chrom', chrome, false], ['stuhl', seatM, true], ['warm', warm, false], ['jeton', tJeton, false]]) if (tGeo[k]) mesh(tGeo[k], m, O.x, 0, O.z, { parent: g, cast });
    { const top = mesh(new THREE.PlaneGeometry(0.09, 0.13), cardMat, O.x + 0.8, 0.903, O.z + 0.12, { parent: g, cast: false }); top.rotation.set(-Math.PI / 2, 0, 0.3); const uv = top.geometry.attributes.uv; const q = cardUV(-1); uv.setXY(0, q.u0, q.v1); uv.setXY(1, q.u1, q.v1); uv.setXY(2, q.u0, q.v0); uv.setXY(3, q.u1, q.v0); }
    { const pt = plateTex([{ t: T.name, s: 92, c: '#ffe08a', y: 0.36 }, { t: `${euro(T.bets[0], true)} – ${euro(T.bets[T.bets.length - 1], true)}`, s: 70, c: '#f2e6c8', y: 0.72 }], { w: 1024, h: 268 }); const pl = mesh(new THREE.PlaneGeometry(0.42, 0.11), std({ map: pt, emissiveMap: pt, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.4 }), O.x - 0.8, 0.9, O.z + 0.12, { parent: g, cast: false }); pl.rotation.x = -0.5; }
    // Lichtkegel der Hängelampe auf dem Filz
    { const pool = mesh(new THREE.CircleGeometry(0.62, 32), poolM, O.x, 0.815, O.z + 0.56, { parent: g, cast: false }); pool.rotation.x = -Math.PI / 2; pool.renderOrder = 2; }
    xCircles.push({ x: tx + O.x, z: tz + O.z + 0.1, r: 1.28 });
    g.updateMatrixWorld(true); const W2 = (v) => g.localToWorld(v.clone());
    const tb = { id: ti, T, g, O: W2(O), dealer: { ...(() => { const p = W2(V3(O.x, 0, O.z - 0.42)); return { x: p.x, z: p.z }; })(), yaw: 0 }, dealerSpot: W2(V3(O.x - 0.08, 0.812, O.z + 0.43)), shoe: W2(V3(O.x + 0.8, 0.95, O.z + 0.12)), seats: [] };
    ANG.forEach((a, j) => { const id = ti * BJ_SEATS + j; const dir = V3(Math.sin(a), 0, Math.cos(a)); const seatP = W2(O.clone().addScaledVector(dir, R_SEAT));
      const s = { id, kind: 'bj', table: ti, j, a, seat: { x: seatP.x, z: seatP.z, yaw: a + Math.PI }, cam: { pos: W2(O.clone().addScaledVector(dir, 1.92).add(V3(0, 1.52, 0))), look: W2(O.clone().addScaledVector(dir, 0.5).add(V3(0, 0.8, 0))) },
        spot: W2(O.clone().addScaledVector(dir, 0.8).add(V3(0, 0.812, 0))), bet: W2(O.clone().addScaledVector(dir, 1.0).add(V3(0, 0.812, 0))), tan: V3(Math.cos(a), 0, -Math.sin(a)), cardYaw: a, look: W2(O.clone().add(V3(0, 0.9, 0))) };
      tb.seats.push(s); seats.push(s); });
    tables.push(tb);
  });
  // Wandbilder mit Kartenfarben, Teo als Herzkönig an der Rückwand
  const art = (sym, red, w, h) => ctex(512, Math.round(512 * h / w), (c, W2, H2) => { c.fillStyle = '#0a2a1c'; c.fillRect(0, 0, W2, H2); const g = c.createRadialGradient(W2 / 2, H2 / 2, 10, W2 / 2, H2 / 2, W2 * 0.7); g.addColorStop(0, 'rgba(58,255,154,.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W2, H2); c.strokeStyle = '#d8a54a'; c.lineWidth = 18; c.strokeRect(9, 9, W2 - 18, H2 - 18); c.lineWidth = 3; c.strokeRect(34, 34, W2 - 68, H2 - 68);
    c.fillStyle = red ? '#d0182c' : '#f2e6c8'; c.shadowColor = red ? '#ff4060' : '#ffffff'; c.shadowBlur = 30; c.font = `${Math.round(H2 * 0.55)}px ${SYM}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sym, W2 / 2, H2 / 2 + 10); c.shadowBlur = 0; }, { clamp: true });
  const frame = (tex, w, h, x, y, z, ry) => { const m = mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, roughness: 0.6, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }), x, y, z, { ry, cast: false }); box(w + 0.12, h + 0.12, 0.05, M.gold, x - Math.sin(ry) * 0.03, y, z - Math.cos(ry) * 0.03, { ry, cast: false }); return m; };
  [['♠', false], ['♥', true], ['♦', true], ['♣', false]].forEach(([s, red], i) => { const t = art(s, red, 1.4, 1.9); frame(t, 1.4, 1.9, X0 + 0.04, 2.6, -33.6 - i * 3.6, Math.PI / 2); frame(t, 1.4, 1.9, X1 - 0.04, 2.6, -33.6 - i * 3.6, -Math.PI / 2); });
  { const king = ctex(512, 720, (c, W2, H2) => { rr(c, 8, 8, W2 - 16, H2 - 16, 40); c.fillStyle = '#fbf8f0'; c.fill(); c.strokeStyle = '#d8a54a'; c.lineWidth = 12; c.stroke(); c.fillStyle = '#c8102e'; c.font = `900 90px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('K', 70, 90); c.font = `70px ${SYM}`; c.fillText('♥', 70, 170); c.save(); c.translate(W2 - 70, H2 - 90); c.rotate(Math.PI); c.font = `900 90px ${SERIF}`; c.fillText('K', 0, 0); c.font = `70px ${SYM}`; c.fillText('♥', 0, -80); c.restore();
      c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(166, 250); c.lineTo(206, 170); c.lineTo(256, 230); c.lineTo(306, 170); c.lineTo(346, 250); c.closePath(); c.fill(); c.fillStyle = '#e8b890'; c.beginPath(); c.arc(256, 330, 84, 0, 7); c.fill(); c.fillStyle = '#2a1a10'; c.beginPath(); c.arc(226, 318, 9, 0, 7); c.arc(286, 318, 9, 0, 7); c.fill(); c.strokeStyle = '#2a1a10'; c.lineWidth = 6; c.beginPath(); c.arc(256, 350, 34, 0.2, Math.PI - 0.2); c.stroke();
      c.fillStyle = '#c8102e'; c.fillRect(150, 420, 212, 160); c.fillStyle = '#f2c14e'; c.fillRect(150, 470, 212, 16); c.font = `900 56px ${FONT}`; c.fillStyle = '#6a0a16'; c.fillText('TEO', 256, 640); }, { clamp: true });
    frame(king, 2.2, 3.1, cx, 3.0, Z0 + 0.04, 0); }
  // Lounge an der Rückwand, Pflanzen, Jetons-Kasse
  const velvet = std({ color: 0x0c3a26, roughness: 0.85, envMap: room.env, envMapIntensity: 0.3 });
  for (const x of [cx - 3.4, cx + 3.4]) { box(2.2, 0.42, 0.8, velvet, x, 0.21, Z0 + 0.7); box(2.2, 0.7, 0.2, velvet, x, 0.56, Z0 + 0.35); for (const sx of [-1, 1]) box(0.18, 0.55, 0.8, velvet, x + sx * 1.1, 0.4, Z0 + 0.7); xBoxes.push({ x0: x - 1.25, x1: x + 1.25, z0: Z0, z1: Z0 + 1.15 }); }
  const potM = std({ color: 0x1a1a1e, roughness: 0.3, metalness: 0.6, envMap: room.env }); const leafM = std({ color: 0x1e5a2a, roughness: 0.7, envMap: room.env, envMapIntensity: 0.3 });
  for (const [x, z] of [[X0 + 0.6, Z0 + 0.6], [X1 - 0.6, Z0 + 0.6], [X0 + 0.6, Z1 - 0.6]]) { cyl(0.28, 0.22, 0.6, potM, x, 0.3, z, { seg: 16 }); for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.3 - i * 0.03, 10, 8), leafM, x + Math.sin(i * 2.2) * 0.12, 0.85 + i * 0.22, z + Math.cos(i * 2.2) * 0.12, { cast: false }); xCircles.push({ x, z, r: 0.45 }); }
  { const kx = X1 - 1.6; const kz = Z1 - 1.9; box(2.4, 1.05, 0.6, M.wood, kx, 0.525, kz, { ry: Math.PI / 2 }); box(2.5, 0.06, 0.7, M.marbleDark, kx, 1.08, kz, { ry: Math.PI / 2 }); const gl = box(0.02, 0.7, 2.3, M.glass, kx - 0.2, 1.45, kz, { cast: false }); void gl;
    const ks = neonSign('JETONS', 1.6, 0.42, { face: '#fff', tube: '#3aff7a', size: 200, depth: 1, glow: 2.6, haloI: 1.2 }); ks.position.set(kx + 0.32, 2.25, kz); ks.rotation.y = -Math.PI / 2; scene.add(ks); K.insideSigns.push(ks); xBoxes.push({ x0: kx - 0.4, x1: kx + 0.4, z0: kz - 1.25, z1: kz + 1.25 }); }
  // Live-Vorrat: eine Karte und ein Jeton jeder Farbe, damit beim Laden alle Shader entstehen (danach unsichtbar)
  const warmup = new THREE.Group(); warmup.userData.live = true; warmup.position.set(cx, -5, cz); scene.add(warmup); warmup.add(new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.1), cardMat)); for (const v of Object.keys(chipMat)) warmup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.005, 16), chipMat[v]));
  const lightSpots = [{ p: [10.1, 5.0, -34.6], c: 0xffe0b0, i: 46, d: 16 }, { p: [15.1, 5.0, -34.6], c: 0xffe0b0, i: 46, d: 16 }, { p: [12.6, 5.0, -42.4], c: 0xffd8a8, i: 52, d: 18 }];
  return { tables, seats, area: { x0: X0, x1: X1, z0: Z0, z1: Z1 }, staff: { x: X1 - 1.15, z: Z1 - 1.9, yaw: -Math.PI / 2 }, lightSpots, cardMat, chipMat, atlas };
}

// ======================================================================
// Roulette-Galerie (Level 4)
// ======================================================================
export function buildRouletteHall(K, cardHall) {
  const { scene, M, room, mesh, box, cyl, ctex, std, neonSign, plateTex, xBoxes, xCircles } = K;
  const X0 = 22.6; const X1 = 40.6; const Z0 = -20; const Z1 = 0.4; const HH = 7; const cx = (X0 + X1) / 2; const cz = (Z0 + Z1) / 2; const W = X1 - X0; const D = Z1 - Z0; const GZ0 = -5.8; const GZ1 = -1.4;
  // Boden: dunkelroter Teppich mit goldenen Kesseln
  { const t = ctex(512, 512, (c, S) => { c.fillStyle = '#3a0610'; c.fillRect(0, 0, S, S); const r = rand(31); for (let i = 0; i < 3000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '140,30,40'},${r() * 0.12})`; c.fillRect(r() * S, r() * S, 2, 2); }
      for (const [x, y] of [[S / 4, S / 4], [3 * S / 4, 3 * S / 4]]) { c.strokeStyle = 'rgba(214,170,80,.45)'; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 70, 0, 7); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(x, y, 50, 0, 7); c.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * 50, y + Math.sin(a) * 50); c.lineTo(x + Math.cos(a) * 70, y + Math.sin(a) * 70); c.stroke(); } }
      c.strokeStyle = 'rgba(214,170,80,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, S / 2); c.lineTo(S, S / 2); c.moveTo(S / 2, 0); c.lineTo(S / 2, S); c.stroke(); });
    t.repeat.set(W / 4, D / 4); t.anisotropy = 8; const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2); mesh(g, std({ map: t, roughness: 0.95, envMap: room.env, envMapIntensity: 0.25 }), cx, 0.004, cz, { cast: false });
    const run = ctex(64, 256, (c, w, h) => { c.fillStyle = '#8a0a1a'; c.fillRect(0, 0, w, h); c.fillStyle = '#d8a54a'; c.fillRect(0, 0, 5, h); c.fillRect(w - 5, 0, 5, h); }); run.repeat.set(1, 4); const rg = new THREE.PlaneGeometry(2.2, 12); rg.rotateX(-Math.PI / 2); rg.rotateY(Math.PI / 2); mesh(rg, std({ map: run, roughness: 0.9, envMap: room.env, envMapIntensity: 0.2 }), X0 + 6, 0.008, -3.6, { cast: false }); }
  // Wände: roter Stoff mit goldenen Pilastern
  { const wt = ctex(512, 512, (c, S) => { c.fillStyle = '#5a0a16'; c.fillRect(0, 0, S, S); const r = rand(9); for (let i = 0; i < 2500; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '160,40,50'},${r() * 0.1})`; c.fillRect(r() * S, r() * S, 2, 2); }
      c.fillStyle = 'rgba(214,170,80,.18)'; for (let y = 0; y < S; y += 64) for (let x = (y / 64) % 2 ? 32 : 0; x < S; x += 64) { c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x + 10, y + 22); c.lineTo(x, y + 36); c.lineTo(x - 10, y + 22); c.closePath(); c.fill(); }
      const g = c.createLinearGradient(0, 0, 40, 0); g.addColorStop(0, '#6a4a1c'); g.addColorStop(0.5, '#e8c070'); g.addColorStop(1, '#6a4a1c'); c.fillStyle = g; c.fillRect(0, 0, 40, S); c.fillStyle = '#2a0408'; c.fillRect(0, S * 0.8, S, S * 0.2); c.fillStyle = '#d8a54a'; c.fillRect(0, S * 0.8, S, 6); }); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
    const wallM = (len) => { const a = wt.clone(); a.needsUpdate = true; a.repeat.set(len / 3, HH / 5); return std({ map: a, roughness: 0.85, envMap: room.env, envMapIntensity: 0.45 }); };
    mesh(new THREE.PlaneGeometry(W, HH), wallM(W), cx, HH / 2, Z0, { cast: false }); mesh(new THREE.PlaneGeometry(W, HH), wallM(W), cx, HH / 2, Z1, { ry: Math.PI, cast: false }); mesh(new THREE.PlaneGeometry(D, HH), wallM(D), X1, HH / 2, cz, { ry: -Math.PI / 2, cast: false });
    const l1 = GZ0 - Z0; mesh(new THREE.PlaneGeometry(l1, HH), wallM(l1), X0, HH / 2, Z0 + l1 / 2, { ry: Math.PI / 2, cast: false }); const l2 = Z1 - GZ1; mesh(new THREE.PlaneGeometry(l2, HH), wallM(l2), X0, HH / 2, GZ1 + l2 / 2, { ry: Math.PI / 2, cast: false }); mesh(new THREE.PlaneGeometry(GZ1 - GZ0, HH - 4.4), wallM(GZ1 - GZ0), X0, (HH + 4.4) / 2, -3.6, { ry: Math.PI / 2, cast: false });
    const ct = ctex(256, 256, (c, S) => { c.fillStyle = '#140608'; c.fillRect(0, 0, S, S); c.strokeStyle = '#8a6a2a'; c.lineWidth = 12; c.strokeRect(0, 0, S, S); c.strokeStyle = '#3a1a10'; c.lineWidth = 5; c.strokeRect(26, 26, S - 52, S - 52); c.fillStyle = 'rgba(214,170,80,.35)'; c.beginPath(); c.arc(S / 2, S / 2, 26, 0, 7); c.fill(); }); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(W / 3, D / 3);
    const cg = new THREE.PlaneGeometry(W, D); cg.rotateX(Math.PI / 2); mesh(cg, new THREE.MeshBasicMaterial({ map: ct, color: new THREE.Color(1.15, 1.05, 1.0), toneMapped: false }), cx, HH, cz, { cast: false });
    for (let x = X0 + 3; x < X1; x += 4.5) for (const z of [Z0 + 0.25, Z1 - 0.25]) { cyl(0.22, 0.26, HH, M.gold, x, HH / 2, z, { seg: 16 }); }
    xBoxes.push({ x0: X0 - 0.3, x1: X0 + 0.05, z0: Z0, z1: GZ0 }, { x0: X0 - 0.3, x1: X0 + 0.05, z0: GZ1, z1: Z1 }, { x0: X1 - 0.05, x1: X1 + 0.3, z0: Z0, z1: Z1 }, { x0: X0, x1: X1, z0: Z1 - 0.3, z1: Z1 + 0.3 }, { x0: X0, x1: X1, z0: Z0 - 0.3, z1: Z0 + 0.5 }, { x0: 17.9, x1: 22.7, z0: GZ0 - 0.2, z1: GZ0 + 0.1 }, { x0: 17.9, x1: 22.7, z0: GZ1 - 0.1, z1: GZ1 + 0.2 });
    // Außenhaut des Anbaus (vom Gehweg aus sichtbar), Leuchtschrift und Fenster zur Straße
    box(W + 0.9, HH + 1.4, 0.4, M.facade, cx + 0.22, (HH + 1.4) / 2 - 0.6, Z1 + 0.23, { cast: false }); box(0.4, HH + 1.4, D + 0.9, M.facade, X1 + 0.23, (HH + 1.4) / 2 - 0.6, cz, { cast: false }); box(W + 0.9, HH + 1.4, 0.4, M.facade, cx + 0.22, (HH + 1.4) / 2 - 0.6, Z0 - 0.23, { cast: false }); box(W + 0.9, 0.4, D + 0.9, M.facade, cx + 0.22, HH + 0.23, cz, { cast: false });
    const wt2 = ctex(128, 256, (c, w, h) => { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffd8a0'); g.addColorStop(1, '#b8502a'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#1a0a06'; c.fillRect(w / 2 - 4, 0, 8, h); c.fillRect(0, h * 0.45, w, 8); c.lineWidth = 12; c.strokeStyle = '#1a0a06'; c.strokeRect(0, 0, w, h); }, { clamp: true });
    for (let i = 0; i < 5; i++) { const x = X0 + 2.2 + i * 3.4; mesh(new THREE.PlaneGeometry(1.4, 2.8), new THREE.MeshBasicMaterial({ map: wt2, color: new THREE.Color(1.3, 1.0, 0.8), toneMapped: false }), x, 3.0, Z1 + 0.86, { cast: false }); box(1.6, 0.12, 0.2, M.gold, x, 1.55, Z1 + 0.92, { cast: false }); }
    const out = neonSign('ROULETTE', 6.4, 1.2, { face: '#fff', tube: '#ff3a3a', size: 230, depth: 1, glow: 3.2, haloI: 1.6 }); out.position.set(cx, HH - 0.6, Z1 + 0.9); scene.add(out); }
  const sign = neonSign('ROULETTE-GALERIE', 6.6, 0.85, { face: '#fff', tube: '#ff3a3a', size: 230, depth: 1, glow: 3.0, haloI: 1.4 }); sign.position.set(X0 + 0.12, 5.2, -3.6); sign.rotation.y = Math.PI / 2; scene.add(sign); K.insideSigns.push(sign);
  // Gemäldegalerie
  const painting = (seed) => ctex(512, 384, (c, w, h) => { const r = rand(seed); const sky = c.createLinearGradient(0, 0, 0, h); const hue = Math.floor(r() * 360); sky.addColorStop(0, `hsl(${hue},45%,${28 + r() * 20}%)`); sky.addColorStop(1, `hsl(${(hue + 40) % 360},55%,${12 + r() * 12}%)`); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    if (seed % 2) { const x = w * (0.3 + r() * 0.4); const y = h * 0.55; c.fillStyle = '#2a160a'; c.beginPath(); c.ellipse(x, y, 120, 46, 0, 0, 7); c.fill(); c.strokeStyle = '#e8c070'; c.lineWidth = 6; c.beginPath(); c.ellipse(x, y, 100, 36, 0, 0, 7); c.stroke(); for (let k = 0; k < 18; k++) { c.strokeStyle = k % 2 ? '#c8142a' : '#141414'; c.lineWidth = 9; const a0 = k / 18 * Math.PI * 2; c.beginPath(); c.ellipse(x, y, 86, 30, 0, a0, a0 + 0.3); c.stroke(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 70, y - 14, 7, 0, 7); c.fill(); }
    else { for (let i = 0; i < 5; i++) { c.fillStyle = `hsla(${(hue + i * 30) % 360},60%,${30 + r() * 30}%,.7)`; c.beginPath(); c.moveTo(0, h * (0.5 + r() * 0.3)); for (let x = 0; x <= w; x += 32) c.lineTo(x, h * (0.45 + i * 0.08) + Math.sin(x * 0.02 + i) * 20); c.lineTo(w, h); c.lineTo(0, h); c.closePath(); c.fill(); } c.fillStyle = 'rgba(255,230,160,.8)'; c.beginPath(); c.arc(w * (0.2 + r() * 0.6), h * 0.25, 26, 0, 7); c.fill(); }
    c.strokeStyle = '#2a1a0a'; c.lineWidth = 16; c.strokeRect(0, 0, w, h); }, { clamp: true });
  let ps = 3; for (let x = X0 + 4.6; x < X1 - 1; x += 4.5) for (const [z, ry] of [[Z0 + 0.05, 0], [Z1 - 0.05, Math.PI]]) { const t = painting(ps++); mesh(new THREE.PlaneGeometry(2.0, 1.5), std({ map: t, roughness: 0.7, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3 }), x, 3.2, z, { ry, cast: false }); box(2.24, 1.74, 0.06, M.gold, x, 3.2, z + (ry ? 0.02 : -0.02), { ry, cast: false }); mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.6), toneMapped: false }), x, 4.2, z + (ry ? -0.1 : 0.1), { cast: false }); }
  for (const z of [-8.6, -15.2]) { const t = painting(ps++); mesh(new THREE.PlaneGeometry(2.4, 1.8), std({ map: t, roughness: 0.7, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.3 }), X1 - 0.05, 3.2, z, { ry: -Math.PI / 2, cast: false }); box(0.06, 2.0, 2.64, M.gold, X1 - 0.02, 3.2, z, { cast: false }); }
  // Kronleuchter (ohne eigenes Licht, leuchtend)
  const crystal = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.8, 2.2), toneMapped: false });
  for (const [x, z] of [[28.6, -8.6], [35.4, -8.6], [32.0, -15.2]]) { const y = HH - 1.4; const rg = new THREE.TorusGeometry(0.9, 0.04, 8, 40); rg.rotateX(Math.PI / 2); mesh(rg, M.gold, x, y, z, { cast: false }); const rg2 = new THREE.TorusGeometry(0.55, 0.035, 8, 32); rg2.rotateX(Math.PI / 2); mesh(rg2, M.gold, x, y + 0.35, z, { cast: false }); cyl(0.02, 0.02, 1.0, M.gold, x, y + 0.9, z, { seg: 6, cast: false });
    const gs = []; for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; const sg = new THREE.SphereGeometry(0.06, 8, 6); sg.translate(x + Math.cos(a) * 0.9, y - 0.12, z + Math.sin(a) * 0.9); gs.push(sg); } for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const sg = new THREE.SphereGeometry(0.05, 8, 6); sg.translate(x + Math.cos(a) * 0.55, y + 0.24, z + Math.sin(a) * 0.55); gs.push(sg); } mesh(mergeGeometries(gs), crystal, 0, 0, 0, { cast: false }); }
  // Bänke und Pflanzen
  const velvet = std({ color: 0x6a0a16, roughness: 0.85, envMap: room.env, envMapIntensity: 0.3 }); const potM = std({ color: 0x1a1a1e, roughness: 0.3, metalness: 0.6, envMap: room.env }); const leafM = std({ color: 0x1e5a2a, roughness: 0.7, envMap: room.env, envMapIntensity: 0.3 });
  for (const x of [26, 38.5]) { box(2.0, 0.42, 0.6, velvet, x, 0.21, Z0 + 1.1); box(2.0, 0.1, 0.6, M.gold, x, 0.03, Z0 + 1.1); xBoxes.push({ x0: x - 1.05, x1: x + 1.05, z0: Z0 + 0.7, z1: Z0 + 1.5 }); }
  for (const [x, z] of [[X0 + 0.7, Z0 + 0.7], [X1 - 0.7, Z0 + 0.7], [X1 - 0.7, Z1 - 0.7], [X0 + 0.7, Z1 - 0.7]]) { cyl(0.3, 0.24, 0.62, potM, x, 0.31, z, { seg: 16 }); for (let i = 0; i < 5; i++) mesh(new THREE.SphereGeometry(0.32 - i * 0.03, 10, 8), leafM, x + Math.sin(i * 2.2) * 0.12, 0.9 + i * 0.22, z + Math.cos(i * 2.2) * 0.12, { cast: false }); xCircles.push({ x, z, r: 0.45 }); }

  // Roulette-Tische
  const chipMat = cardHall ? cardHall.chipMat : {}; const leather = std({ color: 0x2a120a, roughness: 0.55, envMap: room.env, envMapIntensity: 0.6 }); const feltM = std({ color: 0x0c5230, roughness: 0.95, envMap: room.env, envMapIntensity: 0.3 });
  const chrome = std({ color: 0xc8ccd2, metalness: 1, roughness: 0.22, envMap: room.env, envMapIntensity: 1.2 }); const seatM = std({ color: 0x6a0a16, roughness: 0.45, envMap: room.env, envMapIntensity: 0.6 });
  const ballM = std({ color: 0xf8f6f0, roughness: 0.15, metalness: 0.05, envMap: room.env, envMapIntensity: 1.2 }); const rotorT = ctex(1024, 1024, drawRotor, { clamp: true }); const rotorM = std({ map: rotorT, roughness: 0.35, metalness: 0.2, envMap: room.env, envMapIntensity: 0.9 });
  const sepGeo = (() => { const gs = []; for (let i = 0; i < 37; i++) { const th = i * POCKET + POCKET / 2; const b = new THREE.BoxGeometry(0.004, 0.018, 0.07); b.rotateY(Math.PI / 2 + th); b.translate(Math.cos(th) * 0.232, 0.009, -Math.sin(th) * 0.232); gs.push(b); } return mergeGeometries(gs); })();
  const bowlGeo = new THREE.LatheGeometry([[0.3, 0.0], [0.33, 0.035], [0.4, 0.06], [0.44, 0.1], [0.47, 0.12], [0.49, 0.11], [0.5, 0.06], [0.49, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), 64);
  const trackM = std({ color: 0x8a5a2c, roughness: 0.3, envMap: room.env, envMapIntensity: 0.8 }); const bowlM = std({ map: M.wood.map, color: 0x9a6a40, roughness: 0.38, envMap: room.env, envMapIntensity: 0.8, side: THREE.DoubleSide });
  const poolT = ctex(256, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,226,170,.75)'); g.addColorStop(1, 'rgba(255,200,120,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }, { clamp: true }); const poolM = new THREE.MeshBasicMaterial({ map: poolT, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const b64a = (s, Ctor) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Ctor(u.buffer); };
  const rGeo = {}; for (const [k, d] of Object.entries(ROUTISCH)) { const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(b64a(d.p, Float32Array), 3)); gg.setAttribute('normal', new THREE.BufferAttribute(b64a(d.n, Float32Array), 3)); gg.setIndex(new THREE.BufferAttribute(b64a(d.i, d.w === 2 ? Uint16Array : Uint32Array), 1)); gg.computeBoundingSphere(); rGeo[k] = gg; }
  const rLack = std({ color: 0x0a0a0c, metalness: 0.15, roughness: 0.3, envMap: room.env, envMapIntensity: 1.0 }); const rLeder = std({ color: 0x0b0b0d, roughness: 0.42, envMap: room.env, envMapIntensity: 0.7 }); const rHolz = std({ map: M.wood.map, color: 0x7a4a26, roughness: 0.3, envMap: room.env, envMapIntensity: 0.9 });
  const SX = [-0.2, 0.55, 1.3]; const tables = []; const seats = [];
  ROU_TABLES.forEach((T, ti) => {
    const [tx, tz] = [[28.6, -8.6], [35.4, -8.6], [32.0, -15.2]][ti]; const g = new THREE.Group(); g.position.set(tx, 0, tz); scene.add(g); const gold = ti === 2;
    // Tisch aus Blender (casinoroutisch.js): Lackrahmen, gepolsterte Kante, geschwungene Beine, Streben, Holzring mit Goldkanten um den Kessel, drei Stühle
    box(3.2, 0.04, 1.4, feltM, 0, 0.78, 0, { parent: g, cast: false });
    for (const [k, m, cast] of [['lack', rLack, true], ['leder', rLeder, true], ['schwarz', M.black, false], ['holz', rHolz, true], ['gold', M.gold, false], ['chrom', chrome, false], ['stuhl', seatM, true]]) if (rGeo[k]) mesh(rGeo[k], m, 0, 0, 0, { parent: g, cast });
    // Tableau (live: zeigt gesetzte Jetons und die gefallene Zahl)
    const lt = ctex(1536, 750, (c, w, h) => drawRouLayout(c, w, h, {}), { clamp: true }); const lay = mesh(new THREE.PlaneGeometry(2.05, 1.0), std({ map: lt, roughness: 0.92, envMap: room.env, envMapIntensity: 0.3 }), 0.5, 0.802, 0, { parent: g, cast: false, rx: -Math.PI / 2 }); lay.userData.live = true;
    // Kessel
    const wx = -1.12; mesh(bowlGeo, bowlM, wx, 0.8, 0, { parent: g }); { const tr = new THREE.RingGeometry(0.335, 0.455, 64); tr.rotateX(-Math.PI / 2); mesh(tr, trackM, wx, 0.9, 0, { parent: g, cast: false }); }
    const rotor = new THREE.Group(); rotor.position.set(wx, 0.86, 0); rotor.userData.live = true; g.add(rotor); { const d = new THREE.CircleGeometry(0.32, 74); d.rotateX(-Math.PI / 2); rotor.add(new THREE.Mesh(d, rotorM)); const sp = new THREE.Mesh(sepGeo, chrome); rotor.add(sp); const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.07, 0.07, 20), M.gold); cone.position.y = 0.035; rotor.add(cone);
      for (let k = 0; k < 4; k++) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), M.gold); arm.rotation.z = Math.PI / 2; arm.rotation.y = k * Math.PI / 4; arm.position.y = 0.075; rotor.add(arm); } for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; const b = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), M.gold); b.position.set(Math.cos(a) * 0.08, 0.075, Math.sin(a) * 0.08); rotor.add(b); } }
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), ballM); ball.userData.live = true; g.add(ball);
    const dolly = new THREE.Group(); dolly.userData.live = true; dolly.visible = false; g.add(dolly); { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.07, 16), M.gold); a.position.y = 0.035; dolly.add(a); const b = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), ballM); b.position.y = 0.085; dolly.add(b); }
    // Croupier-Seite: Jetonvorrat, Schild, Lichtkegel, Kronleuchter über dem Tisch steht schon
    [100, 500, 2500, 10000].forEach((v, j) => { for (let k = 0; k < 6; k++) cyl(0.021, 0.021, 0.005, chipMat[v] || M.black, -0.3 + j * 0.06, 0.805 + k * 0.006, -0.55, { parent: g, seg: 16, cast: false }); });
    { const pt = plateTex([{ t: T.name, s: 92, c: '#ffe08a', y: 0.36 }, { t: `Jetons ab ${euro(T.min, true)} · bis ${euro(T.max, true)} je Runde`, s: 56, c: '#f2e6c8', y: 0.72 }], { w: 1024, h: 268 }); const pl = mesh(new THREE.PlaneGeometry(0.5, 0.13), std({ map: pt, emissiveMap: pt, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.4 }), 1.3, 0.86, -0.6, { parent: g, cast: false }); pl.rotation.x = -0.6; box(0.52, 0.02, 0.05, gold ? M.gold : M.brass, 1.3, 0.81, -0.62, { parent: g }); }
    { const pool = mesh(new THREE.PlaneGeometry(3.1, 1.3), poolM, 0, 0.812, 0, { parent: g, cast: false, rx: -Math.PI / 2 }); pool.renderOrder = 2; }
    xBoxes.push({ x0: tx - 1.75, x1: tx + 1.75, z0: tz - 0.82, z1: tz + 0.82 });
    g.updateMatrixWorld(true); const W2 = (v) => g.localToWorld(v.clone());
    const tb = { id: ti, T, g, rotor, ball, dolly, layTex: lt, layOut: { x: 0.5, w: 2.05, d: 1.0 }, wheel: { x: wx, y: 0.86 }, croupier: (() => { const p = W2(V3(-0.45, 0, -1.08)); return { x: p.x, z: p.z, yaw: 0 }; })(), st: { phi: ti * 1.7, omega: 0.45, rest: ti * 7 % 37, spin: null }, seats: [] };
    SX.forEach((sx, j) => { const id = ti * ROU_SEATS + j; const sp = W2(V3(sx, 0, 1.2));       const s = { id, kind: 'rou', table: ti, j, seat: { x: sp.x, z: sp.z, yaw: Math.PI }, cam: { pos: W2(V3(0.18 + (sx - 0.55) * 0.3, 2.05, 1.95)), look: W2(V3(0.08, 0.8, -0.12)) }, look: W2(V3(0.2, 0.9, 0)) };
      tb.seats.push(s); seats.push(s); });
    tables.push(tb);
  });
  // Kessel drehen sich gemächlich, die Kugel liegt im zuletzt gefallenen Fach (das Spiel übernimmt beim Drehen)
  const tmp = V3();
  K.anim.push((t, pw, dt) => { for (const tb of tables) { const s = tb.st; if (s.spin) { s.spin.step(dt); continue; } s.phi += s.omega * dt; tb.rotor.rotation.y = s.phi; const th = s.phi + s.rest * POCKET; tmp.set(tb.wheel.x + Math.cos(th) * 0.232, tb.wheel.y + 0.012, -Math.sin(th) * 0.232); tb.ball.position.copy(tmp); } });
  const lightSpots = [{ p: [28.6, 5.4, -8.0], c: 0xffd8b0, i: 54, d: 15 }, { p: [35.4, 5.4, -8.0], c: 0xffd8b0, i: 54, d: 15 }, { p: [32.0, 5.4, -15.0], c: 0xffd0a0, i: 58, d: 16 }];
  return { tables, seats, area: { x0: X0, x1: X1, z0: Z0, z1: Z1 }, lightSpots, POCKET };
}
