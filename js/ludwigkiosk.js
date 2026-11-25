// Theos Seitenscheidel - Ludwig Zigaretti: der Kiosk „Eck-Ede“ ganz neu (2026-11-20).
// Eckhaus mit zwei Wohnetagen und Balkon, unten der Laden zum Reingehen: Schaufenster mit Auslage, Glastür (geht von selbst auf), Regale voller Ware,
// drei leuchtende Kühlschränke, Theke mit Kasse und Kaffeemaschine, Tabakwand hinter Ede, Fernseher mit Fußball, Leuchtschild und Markise.
// Davor Eistruhe mit schlafender Katze, Zeitungsständer, Stehtisch mit Stammgast, Getränkekisten, Kundenstopper, Tauben. An der Seite Zigarettenautomat, Plakate, Fahrrad.
// Dahinter Kalles Hinterhof: Hinterhaus, Feuertonne, Lichterkette, altes Sofa, Container, Paletten, Kalles Klapptisch mit Ware und Laterne.
// Ede und Kalle haben einen Tagesablauf (Handy, Theke wischen, Regal einräumen, Hände am Feuer wärmen) und schauen Ludwig an, wenn er kommt.
// Alles im Code, keine fremden Dateien. Feste Teile kommen in den gemeinsamen Stapel B (ludwigaussen.js fasst sie zusammen).
import * as THREE from './vendor/three.module.min.js';
import { ROOM, OUT_Y } from './ludwigart.js';
import { walkTo, faceTo } from './casinofig.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { std, mesh, rng, canvasTex, label, glow, wallBox, uvCell, sagLine } from './ludwiggfx.js';
import { surface } from './ludwigtex.js';

const FZ = ROOM.z0 - ROOM.t; const Y = OUT_Y;
export const KIOSK_B = { x0: 35, x1: 43, z0: FZ, z1: FZ + 7, h: 3.3 }; // Grundfläche des Eckhauses (unten der Laden)
export const YARD = { x0: 35, x1: 43, z0: FZ + 7, z1: FZ + 15, gate0: FZ + 9.4, gate1: FZ + 11.6 }; // Hinterhof, Tor zur Querstraße
export const SHOP = { x0: 35.25, x1: 42.75, z0: FZ + 0.25, z1: FZ + 6.75, ceil: 3.05, door0: 38.45, door1: 39.75 }; // Laden innen, Tür vorne
export const KALLE_AT = { x: 40.4, z: FZ + 12.4 }; export const EDE_AT = { x: 40.35, z: FZ + 5.6 };
export const COUNTER = { x: 40.35, z: FZ + 4.3 }; // vor der Theke (hier spricht man Ede an)
export const KIOSK_LIGHTS = { shop: [39.4, Y + 2.5, FZ + 3.1], fire: [37.5, Y + 1.5, FZ + 8.1] };
const FIRE = { x: 37.5, z: FZ + 8.0 }; const WARM = { x: 38.15, z: FZ + 8.75 }; // Feuertonne und Kalles Platz daneben
const bx = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
export const KIOSK_WALK = [
  bx(SHOP.door0, SHOP.door1, FZ - 1.0, FZ + 1.3), bx(SHOP.x0, SHOP.x1, SHOP.z0, SHOP.z1), // Ladentür, Laden
  bx(34.6, 35.8, YARD.gate0, YARD.gate1), bx(35.25, 42.75, YARD.z0 + 0.25, YARD.z1 - 0.25), // Tor, Hinterhof
];
export const KIOSK_BOXES = [
  // Laden: Wände (die Tür bleibt frei), Theke mit Edes Bereich, Kühlschränke, Kistenstapel, Wandregal, Mittelregal, Zeitschriften, Auslagen in den Schaufenstern
  bx(35, SHOP.door0, FZ, FZ + 0.25), bx(SHOP.door1, 43, FZ, FZ + 0.25), bx(35, 35.25, FZ, FZ + 7), bx(42.75, 43, FZ, FZ + 7), bx(35, 43, FZ + 6.75, FZ + 7),
  bx(38.6, 42.75, FZ + 4.45, FZ + 6.75), bx(35.25, 38.05, FZ + 6.0, FZ + 6.75), bx(38.05, 38.6, FZ + 5.3, FZ + 6.75),
  bx(35.25, 35.8, FZ + 1.1, FZ + 5.4), bx(36.75, 37.55, FZ + 1.7, FZ + 4.0), bx(42.3, 42.75, FZ + 0.65, FZ + 4.2), bx(35.25, 38.12, FZ + 0.25, FZ + 0.74), bx(40.08, 42.75, FZ + 0.25, FZ + 0.74),
  // vor dem Laden: Zeitungsständer, Stehtisch, Stammgast, Kundenstopper, Eistruhe, Eis-Schild, Getränkekisten
  bx(35.2, 35.95, FZ - 0.45, FZ), bx(36.28, 36.92, FZ - 1.37, FZ - 0.73), bx(36.3, 36.9, FZ - 1.95, FZ - 1.4), bx(37.62, 38.18, FZ - 2.25, FZ - 1.85),
  bx(40.25, 41.55, FZ - 0.82, FZ), bx(41.66, 41.84, FZ - 0.42, FZ - 0.24), bx(41.95, 42.85, FZ - 0.52, FZ),
  // Seite zur Querstraße: Zigarettenautomat, Fahrrad
  bx(34.78, 35, FZ + 1.25, FZ + 2.0), bx(34.55, 35, FZ + 5.1, FZ + 6.5),
  // Hinterhof: Mauern am Tor, Kalle, Klapptisch, Stuhl, Feuertonne, Paletten, Container, Sofa, Mülltonnen, Kisten
  bx(35, 35.25, YARD.z0, YARD.gate0), bx(35, 35.25, YARD.gate1, YARD.z1),
  bx(KALLE_AT.x - 0.3, KALLE_AT.x + 0.3, KALLE_AT.z - 0.3, KALLE_AT.z + 0.3), bx(40.55, 41.65, FZ + 10.9, FZ + 11.6), bx(41.65, 42.2, FZ + 11.65, FZ + 12.2),
  bx(37.2, 37.8, FZ + 7.7, FZ + 8.3), bx(35.25, 36.5, FZ + 7.25, FZ + 8.4), bx(41.55, 42.75, FZ + 7.25, FZ + 8.9), bx(37.85, 40.05, FZ + 13.95, FZ + 14.75), bx(36.35, 37.65, FZ + 13.75, FZ + 14.75), bx(41.3, 42.75, FZ + 12.9, FZ + 14.75),
];

// ---------------- Texturen ----------------
const shade = (hex, v) => { const n = parseInt(hex.slice(1), 16); const c = (k) => Math.max(0, Math.min(255, ((n >> k) & 255) + v)) | 0; return `rgb(${c(16)},${c(8)},${c(0)})`; };
const plaster = (base, seed) => canvasTex(256, 256, (x, w, h) => { const r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * 0.08})` : `rgba(255,255,255,${r() * 0.05})`; x.fillRect(r() * w, r() * h, 2, 2); } }, [1, 1]);
const tiles = (base, grout, n, seed, vary = 10) => canvasTex(256, 256, (x, w) => { const r = rng(seed); x.fillStyle = grout; x.fillRect(0, 0, w, w); const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = shade(base, (r() - 0.5) * vary); x.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(i * s + 3, j * s + 3, s - 6, (s - 6) * 0.3); } }, [1, 1]);
const woodT = (base, dark, seed) => canvasTex(256, 256, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); const r = rng(seed); x.globalAlpha = 0.25; for (let k = 0; k < 40; k++) { x.strokeStyle = r() < 0.6 ? dark : '#fff3dc'; x.lineWidth = 0.6 + r() * 2; x.beginPath(); const y0 = r() * h; x.moveTo(0, y0); for (let s = 0; s <= 8; s++) x.lineTo(w * s / 8, y0 + Math.sin(s * 0.8 + k) * 4); x.stroke(); } x.globalAlpha = 1; }, [1, 1]);
function graffiti(seed, words, w = 512, h = 256) { return canvasTex(w, h, (x) => { const r = rng(seed); x.clearRect(0, 0, w, h); const cols = ['#ff4ab0', '#40d0ff', '#ffd23a', '#7aff6a', '#ff7a2a', '#b07aff']; for (const wd of words) { x.save(); x.translate(30 + r() * (w - 220), 70 + r() * (h - 110)); x.rotate((r() - 0.5) * 0.4); x.font = `900 ${50 + r() * 40}px Bahnschrift, sans-serif`; x.lineWidth = 9; x.strokeStyle = '#111'; x.strokeText(wd, 0, 0); x.fillStyle = cols[(r() * cols.length) | 0]; x.fillText(wd, 0, 0); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,.6)'; x.strokeText(wd, 0, 0); x.restore(); } }); }
// Sammeltextur der Ware: 16 × 8 Bildchen (Dosen, Flaschen, Chips, Süßes, Packungen, Zeitschriften, Schachteln), alles ausgedachte Marken
const KROW = { can: 0, bottle: 2, chips: 3, candy: 4, pack: 5, mag: 6, box: 7 };
function wareAtlas() {
  const N = { can: ['KOLA', 'ZACK', 'LIMO', 'MATE', 'POWER', 'ZISCH', 'BLITZ', 'TURBO', 'EISTEE', 'ORANGE', 'SPRUDEL', 'MALZ', 'APFEL', 'MANGO', 'WUMMS', 'COOL'], bottle: ['WASSER', 'SAFT', 'LIMO', 'KOLA', 'MATE', 'TEE', 'MILCH', 'ZITRO'],
    chips: ['CHIPS', 'KNUSPR', 'PAPRIKA', 'SALZ', 'WELLE', 'CRUNCH', 'FLIPS', 'NACHOS'], candy: ['SCHOKO', 'NUSS', 'KARAMELL', 'RIEGEL', 'KEKS', 'GUMMI', 'KAUGUMMI', 'MINZE'], pack: ['ROT', 'BLAU', 'GOLD', 'MOND', 'STERN', 'NORD', 'KÖNIG', 'EDE'],
    mag: ['STAR', 'AUTO', 'KICK', 'GAMEZ', 'PROMI', 'TV HEUTE', 'RÄTSEL', 'MODE'], box: ['KAFFEE', 'TEE', 'ZUCKER', 'FEUER', 'BATTERIE', 'TASCHENT.', 'WASCH', 'KEKSE'] };
  const C = ['#e8322a', '#2a6ae8', '#f2c81c', '#2ab85a', '#f07a1a', '#a83ae8', '#1ab8c8', '#e83a8a', '#f4f0e6', '#26282c', '#9a6a3a', '#c8d8e8']; const kinds = ['can', 'can', 'bottle', 'chips', 'candy', 'pack', 'mag', 'box'];
  return canvasTex(1024, 512, (x) => {
    const r = rng(404); x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 16; col++) {
      const X = col * 64; const Yc = row * 64; const kind = kinds[row]; const name = N[kind][(col + row * 3) % N[kind].length]; const c1 = C[(r() * C.length) | 0]; let c2 = C[(r() * C.length) | 0]; if (c2 === c1) c2 = '#ffffff';
      const ink = c1 === '#f4f0e6' || c1 === '#f2c81c' || c1 === '#c8d8e8' ? '#1c1c1c' : '#ffffff';
      const txt = (s, y, size, col2, wgt = 900) => { x.fillStyle = col2; let fs = size; x.font = `${wgt} ${fs}px Bahnschrift, sans-serif`; while (x.measureText(s).width > 58 && fs > 6) { fs -= 1; x.font = `${wgt} ${fs}px Bahnschrift, sans-serif`; } x.fillText(s, X + 32, Yc + y); };
      x.save(); x.beginPath(); x.rect(X, Yc, 64, 64); x.clip(); x.fillStyle = c1; x.fillRect(X, Yc, 64, 64);
      if (kind === 'can') { x.fillStyle = c2; x.beginPath(); x.moveTo(X, Yc + 42); x.lineTo(X + 64, Yc + 28); x.lineTo(X + 64, Yc + 40); x.lineTo(X, Yc + 54); x.fill(); txt(name, 25, 15, ink); x.fillStyle = '#c4c8cc'; x.fillRect(X, Yc, 64, 5); x.fillRect(X, Yc + 59, 64, 5); }
      else if (kind === 'bottle') { const body = ['#2f6a3a', '#5a3a1a', '#8ab0c8', '#c8d8e0'][col % 4]; x.fillStyle = body; x.fillRect(X, Yc, 64, 64); x.fillStyle = c1; x.fillRect(X, Yc + 22, 64, 26); txt(name, 35, 13, ink); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(X + 6, Yc, 6, 64); }
      else if (kind === 'chips') { x.fillStyle = c2; x.beginPath(); x.ellipse(X + 32, Yc + 34, 24, 17, 0, 0, 7); x.fill(); txt(name, 34, 14, c2 === '#ffffff' || c2 === '#f2c81c' || c2 === '#f4f0e6' ? '#1c1c1c' : '#ffffff'); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(X, Yc + 4, 64, 4); x.fillRect(X, Yc + 56, 64, 4); }
      else if (kind === 'candy') { x.fillStyle = c2; x.fillRect(X, Yc + 22, 64, 20); txt(name, 32, 12, c2 === '#ffffff' || c2 === '#f2c81c' ? '#1c1c1c' : '#ffffff'); x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X, Yc, 64, 6); x.fillRect(X, Yc + 58, 64, 6); }
      else if (kind === 'pack') { const top = ['#f4f0e6', '#c8231c', '#1c4aa8', '#d8b04a', '#f4f0e6', '#26282c'][col % 6]; x.fillStyle = top; x.fillRect(X, Yc, 64, 38); txt(name, 18, 14, top === '#f4f0e6' || top === '#d8b04a' ? '#1c1c1c' : '#ffffff'); x.fillStyle = '#141414'; x.fillRect(X, Yc + 38, 64, 26); txt('RAUCHEN', 46, 9, '#ffffff', 700); txt('SCHADET', 56, 9, '#ffffff', 700); }
      else if (kind === 'mag') { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(X, Yc, 64, 15); txt(name, 8, 12, '#ffffff'); x.fillStyle = c2; x.beginPath(); x.arc(X + 30, Yc + 36, 13, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 3; i++) x.fillRect(X + 6, Yc + 52 + i * 4, 30 + r() * 20, 2); }
      else { x.fillStyle = '#f4f0e6'; x.fillRect(X + 6, Yc + 18, 52, 26); txt(name, 31, 12, c1 === '#f4f0e6' ? '#c8231c' : c1); }
      x.restore();
    }
  });
}
// Leuchtschild über dem Laden (dunkel, die Schrift leuchtet über emissiveMap)
function fasciaTex() {
  return canvasTex(1024, 128, (x, w, h) => {
    x.fillStyle = '#121619'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3a4248'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); x.textBaseline = 'middle'; x.textAlign = 'center';
    x.shadowBlur = 18; x.shadowColor = '#ff2a9a'; x.fillStyle = '#ff6ac0'; x.font = '900 92px Bahnschrift, sans-serif'; x.fillText('KIOSK', w / 2, h / 2 + 4); x.shadowBlur = 0; x.fillStyle = 'rgba(255,255,255,.55)'; x.fillText('KIOSK', w / 2, h / 2 + 4);
    x.shadowBlur = 14; x.shadowColor = '#2aa0ff'; x.fillStyle = '#7ad8ff'; x.font = '900 46px Bahnschrift, sans-serif'; x.fillText('ECK-EDE', w * 0.83, h / 2 + 2); x.shadowColor = '#ffb020'; x.fillStyle = '#ffd25a'; x.font = '800 34px Bahnschrift, sans-serif'; x.fillText('TABAK · LOTTO · ZEITUNG', w * 0.17, h / 2 + 2); x.shadowBlur = 0;
  });
}
function stickerTex(lines, { bg = '#f2c81c', fg = '#1c1c1c', w = 256, h = 128, round = false } = {}) {
  return canvasTex(w, h, (x) => { x.clearRect(0, 0, w, h); x.fillStyle = bg; if (round) { x.beginPath(); x.arc(w / 2, h / 2, Math.min(w, h) / 2 - 3, 0, 7); x.fill(); } else x.fillRect(4, 4, w - 8, h - 8); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; const n = lines.length;
    lines.forEach((s, i) => { let fs = (h * 0.62) / n; x.font = `900 ${fs}px Bahnschrift, sans-serif`; while (x.measureText(s).width > w - 30 && fs > 8) { fs -= 1; x.font = `900 ${fs}px Bahnschrift, sans-serif`; } x.fillText(s, w / 2, h * (i + 0.5) / n + 2); }); });
}
function chalkTex() {
  return canvasTex(256, 360, (x, w, h) => { x.fillStyle = '#1e2622'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a6a3a'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14); x.textAlign = 'center'; const f = '"Segoe Print", "Comic Sans MS", cursive';
    x.fillStyle = '#f4f0e0'; x.font = `bold 38px ${f}`; x.fillText('HEUTE', w / 2, 62); x.fillStyle = '#ffd25a'; x.font = `bold 27px ${f}`; x.fillText('Energy', w / 2, 120); x.fillText('2 für 3 €', w / 2, 152);
    x.fillStyle = '#7ad8ff'; x.fillText('Kaffee 1,50', w / 2, 210); x.fillStyle = '#ff8ac8'; x.fillText('Eis ab 1 €', w / 2, 262); x.fillStyle = '#f4f0e0'; x.font = `22px ${f}`; x.fillText('Ede grüßt :)', w / 2, 320); });
}
function newsTex() {
  return canvasTex(512, 256, (x, w, h) => { const heads = [['STADTBOTE', 'KIPPEN-BANDE', 'IN DER STADT?'], ['SPORT AKTUELL', 'LZ 09 SIEGT', '3:1 IM DERBY'], ['TAGESBLATT', 'ELTERN IN SORGE', 'WAS MACHT IHR KIND?']];
    heads.forEach(([a, b, c], i) => { const X = (i * w) / 3; x.fillStyle = '#ece8dc'; x.fillRect(X + 4, 0, w / 3 - 8, h); x.fillStyle = i === 1 ? '#1c4aa8' : '#c8231c'; x.fillRect(X + 4, 0, w / 3 - 8, 46); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 24px Bahnschrift, sans-serif'; x.fillText(a, X + w / 6, 32);
      x.fillStyle = '#1c1c1c'; x.font = '900 22px Bahnschrift, sans-serif'; x.fillText(b, X + w / 6, 84); x.font = '700 17px Bahnschrift, sans-serif'; x.fillText(c, X + w / 6, 110); x.fillStyle = '#9a9a96'; x.fillRect(X + 14, 128, w / 3 - 28, 60); x.fillStyle = 'rgba(0,0,0,.45)'; for (let k = 0; k < 6; k++) x.fillRect(X + 14, 198 + k * 9, w / 3 - 28 - (k % 3) * 18, 3); }); });
}
function posterTex(kind) {
  return canvasTex(256, 360, (x, w, h) => {
    const P = { bruno: ['#1c1030', '#ff4ab0', 'BRUNO', 'LIVE', 'SA · 22 UHR · KELLER'], floh: ['#f2c81c', '#1c1c1c', 'FLOH-', 'MARKT', 'SONNTAG AM PARK'], zirkus: ['#c8231c', '#ffd25a', 'ZIRKUS', 'KUNTER-BUNT', 'NUR 3 TAGE'], party: ['#12304a', '#7ad8ff', 'ABI', 'PARTY', 'EINLASS AB 16'] }[kind];
    x.fillStyle = P[0]; x.fillRect(0, 0, w, h); x.fillStyle = P[1]; x.textAlign = 'center'; x.font = '900 62px Bahnschrift, sans-serif'; x.fillText(P[2], w / 2, 110); x.font = '900 48px Bahnschrift, sans-serif'; x.fillText(P[3], w / 2, 172); x.font = '700 20px Bahnschrift, sans-serif'; x.fillText(P[4], w / 2, 300);
    const r = rng(kind.length * 7); x.globalAlpha = 0.18; x.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) x.fillRect(r() * w, r() * h, 2 + r() * 30, 1 + r() * 3); x.globalAlpha = 1;
  });
}
function automatTex() {
  return canvasTex(256, 384, (x, w, h) => { x.fillStyle = '#b8bcc0'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8231c'; x.fillRect(0, 0, w, 64); x.fillStyle = '#fff'; x.font = '900 34px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('ZIGARETTEN', w / 2, 44);
    const cols = ['#f4f0e6', '#c8231c', '#1c4aa8', '#d8b04a', '#26282c', '#2ab85a']; for (let r0 = 0; r0 < 4; r0++) for (let c = 0; c < 4; c++) { const X = 18 + c * 58; const Yp = 84 + r0 * 62; x.fillStyle = '#20242a'; x.fillRect(X - 4, Yp - 4, 50, 54); x.fillStyle = cols[(r0 * 4 + c) % cols.length]; x.fillRect(X, Yp, 42, 30); x.fillStyle = '#141414'; x.fillRect(X, Yp + 30, 42, 12); x.fillStyle = '#e8e2d0'; x.beginPath(); x.arc(X + 21, Yp + 48, 4, 0, 7); x.fill(); }
    x.fillStyle = '#20242a'; x.fillRect(30, 340, 80, 26); x.fillRect(150, 336, 70, 34); x.fillStyle = '#7ad8ff'; x.fillRect(34, 344, 72, 18); x.fillStyle = '#1c1c1c'; x.font = '700 13px Bahnschrift, sans-serif'; x.fillText('ALTER PRÜFEN', 70, 357); });
}
// Fernseher hinter der Theke: Fußball (wird neu gemalt, solange Ludwig im Laden ist)
function drawTv(c, t) {
  const x = c.getContext('2d'); const w = c.width; const h = c.height; x.fillStyle = '#2a8a3a'; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#2f9440' : '#2a8a3a'; x.fillRect(i * w / 8, 0, w / 8, h); }
  x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 2; x.strokeRect(8, 8, w - 16, h - 16); x.beginPath(); x.moveTo(w / 2, 8); x.lineTo(w / 2, h - 8); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 18, 0, 7); x.stroke();
  const bxp = w / 2 + Math.sin(t * 0.9) * w * 0.33 + Math.sin(t * 2.3) * 14; const byp = h / 2 + Math.sin(t * 1.4 + 1) * h * 0.3;
  for (let i = 0; i < 10; i++) { const a = i * 1.7 + t * 0.4; x.fillStyle = i < 5 ? '#e8322a' : '#2a6ae8'; x.beginPath(); x.arc(bxp + Math.sin(a) * (30 + i * 9), byp + Math.cos(a * 1.3) * (14 + i * 4), 4, 0, 7); x.fill(); }
  x.fillStyle = '#fff'; x.beginPath(); x.arc(bxp, byp, 3, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(6, 6, 104, 20); x.fillStyle = '#fff'; x.font = '800 14px Bahnschrift, sans-serif'; x.textAlign = 'left'; x.fillText(`LZ 2 : 1 EDE  ${String(60 + Math.floor(t / 4) % 30)}'`, 10, 21);
}

// ---------------- Aufbau ----------------
export function buildKiosk(scene, g, B, M, winMats) {
  const r = rng(77);
  const T = { ware: wareAtlas(), fascia: fasciaTex(), floor: tiles('#bdb8ac', '#7a766c', 4, 91), plinth: tiles('#2c3134', '#151719', 8, 92, 8), pave: tiles('#7a7770', '#4a4844', 2, 93, 16), ceil: tiles('#e6e4de', '#b8b6ae', 2, 94, 4),
    awning: canvasTex(512, 64, (x, w, h) => { for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#f4efe2' : '#b8231c'; x.fillRect((i * w) / 12, 0, w / 12 + 1, h); } x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, h - 6, w, 6); }),
    valance: canvasTex(512, 64, (x, w, h) => { x.clearRect(0, 0, w, h); for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#f4efe2' : '#b8231c'; x.fillRect((i * w) / 12, 0, w / 12 + 1, h * 0.55); x.beginPath(); x.arc((i + 0.5) * w / 12, h * 0.55, w / 24, 0, Math.PI); x.fill(); } }),
    wood: woodT('#8a5a34', '#4a2a14', 95), woodL: woodT('#c49a64', '#7a5530', 96) };
  const MK = {
    green: std({ ...surface('putz'), color: 0x3c7a62, roughness: 0.75 }), upper: std({ ...surface('putz'), color: 0xe0cca6, roughness: 0.95 }), back: std({ ...surface('putz'), color: 0xb4a894, roughness: 0.95 }), /* Putz aus Blender, eingefärbt */ trim: std({ color: 0xe9e2d2, roughness: 0.75 }),
    plinth: std({ map: T.plinth, roughness: 0.35 }), frame: std({ color: 0x23272b, roughness: 0.4, metalness: 0.55 }), inside: std({ map: plaster('#ebe5d6', 84), roughness: 0.9 }), floor: std({ map: T.floor, roughness: 0.3 }), ceil: std({ map: T.ceil, emissiveMap: T.ceil, emissive: 0xffffff, emissiveIntensity: 0.16, roughness: 0.95 }),
    pave: std({ ...surface('gehweg'), roughness: 0.92 }), tube: std({ color: 0x000000, emissive: 0xf2f6ff, emissiveIntensity: 2.6 }), housing: std({ color: 0xeeeeea, roughness: 0.5 }), shelf: std({ color: 0xe6e6e2, roughness: 0.45, metalness: 0.25 }), shelfDark: std({ color: 0x394049, roughness: 0.5, metalness: 0.4 }),
    price: std({ color: 0xf2d23a, roughness: 0.6 }), ware: std({ map: T.ware, roughness: 0.5 }), wareLit: std({ map: T.ware, emissiveMap: T.ware, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.5 }), cap: std({ color: 0xe6e6e6, roughness: 0.4 }),
    fridge: std({ color: 0xdde1e4, roughness: 0.3, metalness: 0.45 }), fridgeBack: std({ color: 0x000000, emissive: 0xdff2ff, emissiveIntensity: 1.5 }), glassShelf: std({ color: 0xd8eef6, roughness: 0.1, transparent: true, opacity: 0.4, depthWrite: false }),
    wood: std({ map: T.wood, roughness: 0.6 }), woodL: std({ map: T.woodL, roughness: 0.7 }), laminate: std({ color: 0x2a2c31, roughness: 0.3 }), steel: std({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.8 }), black: std({ color: 0x111214, roughness: 0.5 }),
    white: std({ color: 0xf0eee8, roughness: 0.5 }), red: std({ color: 0xc0261e, roughness: 0.5 }), blue: std({ color: 0x1f4fa8, roughness: 0.5 }), yellow: std({ color: 0xf2c21c, roughness: 0.5 }), greenP: std({ color: 0x1f8a46, roughness: 0.5 }),
    card: std({ color: 0xb88c56, roughness: 0.9 }), tape: std({ color: 0xd8c27a, roughness: 0.6 }), leaf: std({ color: 0x2f6a2e, roughness: 0.8 }), pot: std({ color: 0xb4583a, roughness: 0.8 }), rust: std({ color: 0x6a3a22, roughness: 0.85, metalness: 0.3 }),
    glass: std({ color: 0xa8c8dc, roughness: 0.05, metalness: 0.25, transparent: true, opacity: 0.28, depthWrite: false }), bulb: std({ color: 0x000000, emissive: 0xffd49a, emissiveIntensity: 3 }), container: std({ color: 0x2a5a3a, roughness: 0.55, metalness: 0.3 }),
    sofa: std({ color: 0x6a3a4a, roughness: 0.95 }), pink: std({ color: 0xe85aa8, roughness: 0.8 }), coin: std({ color: 0xd4a83a, metalness: 0.8, roughness: 0.35 }), bag: std({ color: 0x1c1c1e, roughness: 0.4 }), butt: std({ color: 0xf4f0e6, roughness: 0.8 }), sofaD: std({ color: 0x4a2634, roughness: 0.95 }), concrete: std({ color: 0x8a8884, roughness: 0.95 }), gray: std({ color: 0x5a5e62, roughness: 0.7 }),
  };
  const winMat = (k) => winMats[k % winMats.length];
  // Fassaden-Seiten: a = entlang der Wand, o = Meter vor der Wand (nach außen)
  const FACES = {
    nz: { at: (a, o) => [a, FZ - o], ry: Math.PI }, nx: { at: (a, o) => [35 - o, a], ry: -Math.PI / 2 }, pz: { at: (a, o) => [a, FZ + 7 + o], ry: 0 },
    hz: { at: (a, o) => [a, FZ + 15 - o], ry: Math.PI }, ex: { at: (a, o) => [42.75 - o, a], ry: -Math.PI / 2 }, wx: { at: (a, o) => [35.25 + o, a], ry: Math.PI / 2 },
  };
  const fbox = (face, mat, a0, a1, y0, y1, o0, o1) => { const F = FACES[face]; const [xa, za] = F.at(a0, o0); const [xb, zb] = F.at(a1, o1); B.box(mat, Math.min(xa, xb), y0, Math.min(za, zb), Math.max(xa, xb), y1, Math.max(za, zb)); };
  const fplane = (face, mat, a, y, o, w, h) => { const F = FACES[face]; const [x, z] = F.at(a, o); B.add(mat, new THREE.PlaneGeometry(w, h), x, y, z, 0, F.ry, 0); };
  // Altbaufenster: Bild (Licht an/aus/Fernseher), Faschen, Verdachung, Fensterbank, auf Wunsch Blumenkasten
  function win(face, a, yc, w, h, k, flowers = false) {
    fplane(face, winMat(k), a, yc, 0.025, w, h);
    fbox(face, MK.trim, a - w / 2 - 0.1, a - w / 2, yc - h / 2, yc + h / 2 + 0.1, 0, 0.05); fbox(face, MK.trim, a + w / 2, a + w / 2 + 0.1, yc - h / 2, yc + h / 2 + 0.1, 0, 0.05);
    fbox(face, MK.trim, a - w / 2 - 0.14, a + w / 2 + 0.14, yc + h / 2 + 0.1, yc + h / 2 + 0.2, 0, 0.09); fbox(face, MK.trim, a - w / 2 - 0.12, a + w / 2 + 0.12, yc - h / 2 - 0.07, yc - h / 2, 0, 0.13);
    if (flowers) { fbox(face, MK.pot, a - w / 2 + 0.02, a + w / 2 - 0.02, yc - h / 2 + 0.0, yc - h / 2 + 0.16, 0.13, 0.31); for (let i = 0; i < 7; i++) { const F = FACES[face]; const [x, z] = F.at(a - w / 2 + 0.1 + i * (w - 0.2) / 6, 0.22); B.add(i % 2 ? MK.leaf : [MK.red, MK.yellow, MK.pink][i % 3], new THREE.IcosahedronGeometry(0.07 + r() * 0.03, 0), x, yc - h / 2 + 0.2 + r() * 0.05, z); } }
  }

  // ---- Eckhaus: Laden unten (grün, Wandstücke um Schaufenster und Tür, innen hell), zwei Wohnetagen, Gesimse, Dach mit Brüstung
  const S = SHOP; const WY0 = Y + 0.55; const WY1 = Y + 2.55; const DH = Y + 2.35;
  const front = [[35, 35.4, Y - 0.2, Y + 3.3, MK.green], [35.4, 38.15, Y - 0.2, WY0, MK.plinth], [35.4, 38.15, WY1, Y + 3.3, MK.green], [38.15, S.door0, Y - 0.2, Y + 3.3, MK.green], [S.door0, S.door1, DH, Y + 3.3, MK.green],
    [S.door1, 40.05, Y - 0.2, Y + 3.3, MK.green], [40.05, 42.6, Y - 0.2, WY0, MK.plinth], [40.05, 42.6, WY1, Y + 3.3, MK.green], [42.6, 43, Y - 0.2, Y + 3.3, MK.green]];
  for (const [a, b, y0, y1, mat] of front) { wallBox(B, mat, a, y0, FZ, b, y1, FZ + 0.2, mat === MK.plinth ? 0.8 : 2.5); wallBox(B, MK.inside, a, Math.max(y0, Y + 0.03), FZ + 0.2, b, Math.min(y1, Y + S.ceil), FZ + 0.25); }
  wallBox(B, MK.green, 35, Y - 0.2, FZ + 0.2, 35.2, Y + 3.3, FZ + 7); wallBox(B, MK.inside, 35.2, Y + 0.03, FZ + 0.25, 35.25, Y + S.ceil, FZ + 6.75); // Wand zur Querstraße
  wallBox(B, MK.green, 42.8, Y - 0.2, FZ + 0.2, 43, Y + 3.3, FZ + 7); wallBox(B, MK.inside, 42.75, Y + 0.03, FZ + 0.25, 42.8, Y + S.ceil, FZ + 6.75); // Wand zum Nachbarhaus
  wallBox(B, MK.green, 35, Y - 0.2, FZ + 6.8, 43, Y + 3.3, FZ + 7); wallBox(B, MK.inside, 35.25, Y + 0.03, FZ + 6.75, 42.75, Y + S.ceil, FZ + 6.8); // Rückwand zum Hof
  wallBox(B, MK.upper, 35, Y + 3.3, FZ, 43, Y + 9.3, FZ + 7); // Wohnetagen
  B.box(MK.trim, 34.88, Y + 3.3, FZ - 0.12, 43, Y + 3.42, FZ + 7.12); B.box(MK.trim, 34.94, Y + 6.3, FZ - 0.06, 43, Y + 6.38, FZ + 7.06); B.box(MK.trim, 34.8, Y + 9.3, FZ - 0.2, 43, Y + 9.5, FZ + 7.2); // Gesimse
  B.box(MK.upper, 34.8, Y + 9.5, FZ - 0.2, 43, Y + 9.95, FZ + 0.02); B.box(MK.upper, 34.8, Y + 9.5, FZ, 35.02, Y + 9.95, FZ + 7.2); B.box(MK.upper, 34.8, Y + 9.5, FZ + 6.98, 43, Y + 9.95, FZ + 7.2); // Brüstung
  B.box(MK.gray, 35.02, Y + 9.5, FZ + 0.02, 43, Y + 9.52, FZ + 6.98); for (const [x, z] of [[41.2, FZ + 5.4]]) { B.box(M.brickR, x, Y + 9.3, z, x + 0.7, Y + 10.6, z + 0.7); B.box(MK.concrete, x - 0.05, Y + 10.6, z - 0.05, x + 0.75, Y + 10.7, z + 0.75); } // Schornstein
  { const ax = 37.0; const az = FZ + 3.5; B.add(MK.steel, new THREE.CylinderGeometry(0.025, 0.03, 2.4, 8), ax, Y + 10.5, az); for (const [h, l] of [[11.1, 1.1], [11.4, 0.8], [11.65, 0.5]]) B.box(MK.steel, ax - l / 2, Y + h, az - 0.015, ax + l / 2, Y + h + 0.03, az + 0.015); } // Antenne
  for (const [x, z] of [[42.88, FZ - 0.08]]) B.add(MK.gray, new THREE.CylinderGeometry(0.05, 0.05, 9.4, 8), x, Y + 4.6, z); // Fallrohr vorne
  // Fenster oben: Straßenseite (Balkontür in der Mitte), Querstraße, Hofseite
  for (const [a, k] of [[36.1, 0], [38.05, 1], [42.0, 2]]) win('nz', a, Y + 4.75, 1.0, 1.4, k);
  for (const [a, k] of [[36.1, 3], [38.05, 0], [40.1, 4], [42.0, 1]]) win('nz', a, Y + 7.7, 1.0, 1.4, k, a < 39);
  for (const [a, k] of [[FZ + 1.3, 2], [FZ + 3.5, 3], [FZ + 5.7, 0]]) { win('nx', a, Y + 4.75, 1.0, 1.4, k); win('nx', a, Y + 7.7, 1.0, 1.4, k + 1, a > FZ + 3); }
  for (const [a, k] of [[36.2, 1], [38.4, 2], [40.6, 0], [42.1, 3]]) { win('pz', a, Y + 4.75, 0.95, 1.35, k); win('pz', a, Y + 7.7, 0.95, 1.35, k + 2); }
  // Balkon im ersten Stock mit Geländer, Balkontür, Pflanzen und Wäscheständer
  { fbox('nz', MK.concrete, 39.3, 40.9, Y + 3.92, Y + 4.04, 0, 0.9); fplane('nz', winMat(0), 40.1, Y + 5.0, 0.025, 0.95, 1.95); fbox('nz', MK.trim, 39.52, 40.68, Y + 5.98, Y + 6.08, 0, 0.06);
    for (let a = 39.32; a <= 40.89; a += 0.115) fbox('nz', MK.frame, a - 0.01, a + 0.01, Y + 4.04, Y + 4.98, 0.86, 0.88); for (let o = 0.05; o < 0.86; o += 0.115) for (const a of [39.32, 40.88]) fbox('nz', MK.frame, a - 0.01, a + 0.01, Y + 4.04, Y + 4.98, o, o + 0.02);
    fbox('nz', MK.frame, 39.3, 40.9, Y + 4.98, Y + 5.02, 0.84, 0.9); for (const a of [39.3, 40.86]) fbox('nz', MK.frame, a, a + 0.04, Y + 4.98, Y + 5.02, 0, 0.9);
    for (const [a, o] of [[39.5, 0.65], [40.7, 0.7]]) { const [x, z] = FACES.nz.at(a, o); B.add(MK.pot, new THREE.CylinderGeometry(0.13, 0.1, 0.24, 12), x, Y + 4.16, z); for (let i = 0; i < 6; i++) B.add(MK.leaf, new THREE.IcosahedronGeometry(0.1, 0), x + Math.sin(i * 2.1) * 0.09, Y + 4.36 + (i % 3) * 0.08, z + Math.cos(i * 2.1) * 0.09); } }
  const laundry = new THREE.Group(); g.add(laundry); { const [x, z] = FACES.nz.at(40.1, 0.45); laundry.position.set(x, Y + 4.04, z); for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(0.02, 1.0, 0.02), MK.steel, s * 0.45, 0.48, 0.12, laundry, { rx: 0.25 }); mesh(new THREE.BoxGeometry(0.02, 1.0, 0.02), MK.steel, s * 0.45, 0.48, -0.12, laundry, { rx: -0.25 }); }
    for (const zz of [-0.06, 0.06]) mesh(new THREE.BoxGeometry(0.92, 0.008, 0.008), MK.steel, 0, 0.93, zz, laundry); [0x3a6ac8, 0xe8e4dc, 0xc8323a, 0x2a2a2e].forEach((c, i) => { const cl = mesh(new THREE.PlaneGeometry(0.2, 0.32 + (i % 2) * 0.12), std({ color: c, roughness: 0.95, side: THREE.DoubleSide }), -0.32 + i * 0.21, 0.93 - 0.18 - (i % 2) * 0.06, (i % 2 ? 0.06 : -0.06), laundry); cl.userData.k = i; }); }
  // Satellitenschüssel am zweiten Stock
  { const [x, z] = FACES.nz.at(42.75, 0.32); B.box(MK.steel, x - 0.02, Y + 8.3, FZ - 0.32, x + 0.02, Y + 8.34, FZ); const dish = new THREE.CylinderGeometry(0.34, 0.05, 0.12, 18, 1, true); B.add(std({ color: 0xd8dade, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }), dish, x, Y + 8.5, z, -Math.PI / 2 + 0.4, 0.3, 0); }

  // ---- Leuchtschild, Nasenschild, Markise
  { const sign = std({ map: T.fascia, emissiveMap: T.fascia, emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.5 }); B.box(MK.frame, 35.15, Y + 2.62, FZ - 0.16, 42.85, Y + 3.24, FZ - 0.02); fplane('nz', sign, 39.0, Y + 2.93, 0.165, 7.6, 0.56); glow(g, 39.0, Y + 2.95, FZ - 0.5, 0xff4ab0, 4.5, 0.12); }
  { const t = label('LOTTO', { w: 256, h: 192, bg: '#c8231c', fg: '#ffd25a', size: 92 }); const m = std({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.5 }); B.box(MK.frame, 35.14, Y + 3.52, FZ - 0.98, 35.26, Y + 4.32, FZ - 0.12); B.box(MK.steel, 35.17, Y + 4.32, FZ - 0.95, 35.23, Y + 4.36, FZ);
    B.add(m, new THREE.PlaneGeometry(0.82, 0.76), 35.27, Y + 3.92, FZ - 0.55, 0, Math.PI / 2, 0); B.add(m, new THREE.PlaneGeometry(0.82, 0.76), 35.13, Y + 3.92, FZ - 0.55, 0, -Math.PI / 2, 0); glow(g, 35.2, Y + 3.92, FZ - 0.55, 0xff5030, 1.6, 0.25); }
  { const aw = std({ map: T.awning, roughness: 0.85, side: THREE.DoubleSide }); const L = Math.hypot(1.31, 0.42); B.add(aw, new THREE.PlaneGeometry(7.4, L), 39.0, Y + 2.39, FZ - 0.675, -Math.PI / 2 - Math.atan2(0.42, 1.31), 0, 0);
    B.add(std({ map: T.valance, roughness: 0.85, side: THREE.DoubleSide, alphaTest: 0.5 }), new THREE.PlaneGeometry(7.4, 0.26), 39.0, Y + 2.05, FZ - 1.335, 0, Math.PI, 0);
    B.add(MK.steel, new THREE.CylinderGeometry(0.025, 0.025, 7.4, 8), 39.0, Y + 2.18, FZ - 1.33, 0, 0, Math.PI / 2); for (const x of [35.6, 38.3, 40.0, 42.4]) B.add(MK.steel, new THREE.CylinderGeometry(0.015, 0.015, 1.36, 6), x, Y + 2.1, FZ - 0.66, Math.PI / 2 - 0.13, 0, 0); }

  // ---- Schaufenster und Tür: Rahmen, Glas, Aufkleber, OFFEN-Leuchtschild
  const glassAt = (x0, x1, y0, y1) => { B.add(MK.glass, new THREE.PlaneGeometry(x1 - x0, y1 - y0), (x0 + x1) / 2, (y0 + y1) / 2, FZ + 0.1, 0, Math.PI, 0); B.box(MK.frame, x0, y0, FZ + 0.06, x1, y0 + 0.06, FZ + 0.14); B.box(MK.frame, x0, y1 - 0.06, FZ + 0.06, x1, y1, FZ + 0.14); B.box(MK.frame, x0, y0, FZ + 0.06, x0 + 0.06, y1, FZ + 0.14); B.box(MK.frame, x1 - 0.06, y0, FZ + 0.06, x1, y1, FZ + 0.14); };
  glassAt(35.4, 38.15, WY0, WY1); glassAt(40.05, 42.6, WY0, WY1); B.box(MK.frame, 36.75, WY0, FZ + 0.07, 36.8, WY1, FZ + 0.13); B.box(MK.frame, 41.3, WY0, FZ + 0.07, 41.35, WY1, FZ + 0.13); B.box(MK.frame, 35.4, Y + 2.05, FZ + 0.07, 38.15, Y + 2.1, FZ + 0.13); B.box(MK.frame, 40.05, Y + 2.05, FZ + 0.07, 42.6, Y + 2.1, FZ + 0.13);
  B.box(MK.frame, S.door0 - 0.04, Y, FZ + 0.04, S.door0, DH, FZ + 0.2); B.box(MK.frame, S.door1, Y, FZ + 0.04, S.door1 + 0.04, DH, FZ + 0.2); B.box(MK.frame, S.door0, DH - 0.06, FZ + 0.04, S.door1, DH, FZ + 0.2); B.box(MK.steel, S.door0 - 0.02, Y, FZ - 0.02, S.door1 + 0.02, Y + 0.035, FZ + 0.22); // Türrahmen, Schwelle
  const stick = (tex, x, y, w, h) => { const m = std({ map: tex, transparent: true, alphaTest: 0.05, roughness: 0.6 }); B.add(m, new THREE.PlaneGeometry(w, h), x, y, FZ + 0.09, 0, Math.PI, 0); };
  stick(stickerTex(['GETRÄNKE · SNACKS · ZEITSCHRIFTEN'], { bg: 'rgba(0,0,0,0)', fg: '#f4f0e6', w: 512, h: 48 }), 36.78, Y + 2.33, 2.6, 0.24); stick(stickerTex(['EIS!'], { bg: '#f2c81c', round: true, w: 128, h: 128 }), 35.85, Y + 1.55, 0.36, 0.36);
  stick(stickerTex(['LOTTO', 'HIER'], { bg: '#c8231c', fg: '#ffd25a', w: 128, h: 128 }), 37.75, Y + 1.0, 0.32, 0.32); stick(stickerTex(['PAKET-SHOP'], { bg: '#f2c81c', fg: '#1c1c1c', w: 256, h: 96 }), 40.6, Y + 0.85, 0.6, 0.22);
  stick(stickerTex(['EC-KARTE', 'OK'], { bg: '#1c4aa8', fg: '#ffffff', w: 128, h: 96 }), 42.2, Y + 0.85, 0.26, 0.2);
  const offen = new THREE.MeshBasicMaterial({ map: label('OFFEN', { w: 256, h: 112, bg: null, fg: '#ff4a3a', size: 84, glowC: '#ff2010' }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const offenM = mesh(new THREE.PlaneGeometry(0.78, 0.34), offen, 40.75, Y + 1.95, FZ + 0.16, g, { ry: Math.PI }); const offenG = glow(g, 40.75, Y + 1.95, FZ - 0.05, 0xff3020, 1.1, 0.35); void offenM;
  // Tür: Glas im Rahmen, Griffstange, Aufkleber; dreht sich nach innen, wenn Ludwig davor steht
  const door = new THREE.Group(); door.position.set(S.door0, Y + 0.035, FZ + 0.12); g.add(door); const DW = S.door1 - S.door0;
  { const dg = new THREE.Group(); door.add(dg); for (const [a, b, c, d] of [[0, 0.07, 0, 2.3], [DW - 0.07, DW, 0, 2.3], [0, DW, 0, 0.1], [0, DW, 2.22, 2.3]]) mesh(new THREE.BoxGeometry(b - a, d - c, 0.05), MK.frame, (a + b) / 2, (c + d) / 2, 0, dg);
    mesh(new THREE.PlaneGeometry(DW - 0.14, 2.12), MK.glass, DW / 2, 1.16, -0.01, dg, { ry: Math.PI }); mesh(new THREE.BoxGeometry(DW - 0.3, 0.035, 0.035), MK.steel, DW / 2, 1.05, -0.06, dg); for (const x of [0.2, DW - 0.2]) mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), MK.steel, x, 1.05, -0.04, dg);
    mesh(new THREE.PlaneGeometry(0.42, 0.42), std({ map: stickerTex(['TAG &', 'NACHT', 'OFFEN'], { bg: '#f4f0e6', fg: '#1c1c1c', w: 128, h: 128 }), transparent: true, roughness: 0.6 }), DW / 2, 1.6, -0.03, dg, { ry: Math.PI }); }

  // ---- Laden innen: Boden, Decke mit Leuchtstoffröhren, Regale, Ware
  wallBox(B, MK.floor, S.x0, Y - 0.1, S.z0, S.x1, Y + 0.03, S.z1, 1.2); wallBox(B, MK.ceil, S.x0, Y + S.ceil, S.z0, S.x1, Y + S.ceil + 0.05, S.z1, 1.25);
  B.box(std({ color: 0x3a3430, roughness: 1 }), 38.55, Y + 0.03, FZ + 0.3, 39.65, Y + 0.04, FZ + 0.95); // Fußmatte
  for (const [x, z] of [[36.6, FZ + 1.7], [39.1, FZ + 1.7], [41.4, FZ + 1.7], [36.6, FZ + 3.6], [39.1, FZ + 3.6], [41.4, FZ + 3.6], [36.7, FZ + 5.45], [40.6, FZ + 5.9]]) { B.box(MK.housing, x - 0.64, Y + S.ceil - 0.06, z - 0.09, x + 0.64, Y + S.ceil, z + 0.09); B.box(MK.tube, x - 0.6, Y + S.ceil - 0.075, z - 0.06, x + 0.6, Y + S.ceil - 0.06, z + 0.06); }
  const SZ = { can: [0.066, 0.122, 0.066], bottle: [0.072, 0.2, 0.072], chips: [0.17, 0.23, 0.07], candy: [0.05, 0.13, 0.026], pack: [0.058, 0.088, 0.024], mag: [0.215, 0.285, 0.012], box: [0.125, 0.18, 0.085] };
  const BASE = { can: new THREE.CylinderGeometry(0.033, 0.033, 0.122, 10), bottle: new THREE.CylinderGeometry(0.036, 0.036, 0.2, 10), chips: new THREE.BoxGeometry(0.17, 0.23, 0.07), candy: new THREE.BoxGeometry(0.05, 0.13, 0.026), pack: new THREE.BoxGeometry(0.058, 0.088, 0.024), mag: new THREE.BoxGeometry(0.215, 0.285, 0.012), box: new THREE.BoxGeometry(0.125, 0.18, 0.085) };
  const NECK = new THREE.CylinderGeometry(0.012, 0.03, 0.06, 8); const FACE_RY = { px: Math.PI / 2, nx: -Math.PI / 2, pz: 0, nz: Math.PI };
  // Ware auf einem Brett: entlang axis ('x' oder 'z') von a0 bis a1, Brett-Oberkante y, Tiefe-Mitte d, Blick nach face; immer 2–5 gleiche nebeneinander
  function wareRow(mat, kinds, axis, a0, a1, y, d, face, { rows = 1, fill = 0.94, tilt = 0, run = [2, 5], gap = 0.006 } = {}) {
    let a = a0;
    while (a < a1) {
      const kind = kinds[(r() * kinds.length) | 0]; const s = SZ[kind]; const n = run[0] + ((r() * (run[1] - run[0] + 1)) | 0); const col = (r() * 16) | 0; const row = kind === 'can' ? (r() < 0.5 ? 0 : 1) : KROW[kind];
      for (let i = 0; i < n && a + s[0] <= a1; i++) {
        if (r() < fill) for (let k = 0; k < rows; k++) {
          const geo = uvCell(BASE[kind], col, row, 16, 8); if (tilt) geo.rotateX(-tilt); const dd = d + (k - (rows - 1) / 2) * (s[2] + 0.012);
          const cx = axis === 'x' ? a + s[0] / 2 : dd; const cz = axis === 'x' ? dd : a + s[0] / 2; B.add(mat, geo, cx, y + s[1] / 2, cz, 0, FACE_RY[face] + (r() - 0.5) * 0.08, 0);
          if (kind === 'bottle') B.add(MK.cap, NECK, cx, y + s[1] + 0.03, cz);
        }
        a += s[0] + gap;
      }
      a += 0.014;
    }
  }
  // Wandregal links (Ware schaut nach +x)
  { const x0 = S.x0; const x1 = 35.78; const z0 = FZ + 1.1; const z1 = FZ + 5.4; const H = 1.95; B.box(MK.shelfDark, x0, Y, z0, x0 + 0.03, Y + H, z1); for (const z of [z0, (z0 + z1) / 2, z1]) B.box(MK.shelfDark, x0, Y + 0.03, z - 0.015, x1, Y + H, z + 0.015);
    B.box(MK.shelfDark, x0, Y + H - 0.03, z0, x1, Y + H, z1); [0.1, 0.48, 0.86, 1.24, 1.6].forEach((ly, i) => { B.box(MK.shelf, x0, Y + ly - 0.02, z0, x1, Y + ly, z1); B.box(MK.price, x1 - 0.004, Y + ly - 0.05, z0, x1 + 0.004, Y + ly - 0.005, z1);
      wareRow(MK.ware, [['box'], ['bottle'], ['box', 'chips'], ['candy', 'box'], ['chips']][i], 'z', z0 + 0.03, z1 - 0.03, Y + ly, (x0 + x1) / 2 + 0.03, 'px', { rows: i === 1 ? 3 : 2 }); });
    fplane('wx', std({ map: label('SNACKS · HAUSHALT · GETRÄNKE', { w: 1024, h: 96, bg: '#1f4a3a', fg: '#f4f0e6', size: 54 }), roughness: 0.6 }), (z0 + z1) / 2, Y + 2.25, 0.01, 3.4, 0.32); }
  // Mittelregal (doppelseitig), Schild darüber
  { const x0 = 36.75; const x1 = 37.55; const xm = 37.15; const z0 = FZ + 1.7; const z1 = FZ + 4.0; const H = 1.45; B.box(MK.shelfDark, xm - 0.015, Y, z0, xm + 0.015, Y + H, z1); for (const z of [z0, z1]) B.box(MK.shelfDark, x0, Y, z - 0.02, x1, Y + H, z + 0.02);
    [0.1, 0.45, 0.8, 1.15].forEach((ly, i) => { for (const [a, b, face] of [[x0, xm - 0.015, 'nx'], [xm + 0.015, x1, 'px']]) { B.box(MK.shelf, a, Y + ly - 0.02, z0, b, Y + ly, z1); B.box(MK.price, face === 'nx' ? a - 0.004 : b - 0.004, Y + ly - 0.05, z0, face === 'nx' ? a + 0.004 : b + 0.004, Y + ly - 0.005, z1);
      wareRow(MK.ware, [['box', 'chips'], ['candy'], ['chips'], ['candy', 'box']][(i + (face === 'px' ? 1 : 0)) % 4], 'z', z0 + 0.04, z1 - 0.04, Y + ly, (a + b) / 2, face, { rows: 2 }); } });
    const hs = std({ map: label('SÜSSES & SNACKS', { w: 512, h: 96, bg: '#c8231c', fg: '#ffffff', size: 58 }), roughness: 0.6, side: THREE.DoubleSide }); B.add(hs, new THREE.PlaneGeometry(1.6, 0.3), xm, Y + 2.45, (z0 + z1) / 2, 0, Math.PI / 2, 0); for (const z of [(z0 + z1) / 2 - 0.6, (z0 + z1) / 2 + 0.6]) B.box(MK.steel, xm - 0.004, Y + 2.6, z - 0.004, xm + 0.004, Y + S.ceil, z + 0.004); }
  // Kühlschränke hinten links: Rumpf, leuchtende Rückwand, Glasböden voller Dosen und Flaschen, Glastür mit Griff, Leuchtkopf
  { const ht = label('EISKALT', { w: 512, h: 96, bg: '#0e3a6a', fg: '#bfe8ff', size: 64, glowC: '#4ab0ff' }); const head = std({ map: ht, emissiveMap: ht, emissive: 0xffffff, emissiveIntensity: 0.9 });
    for (let i = 0; i < 3; i++) { const x0 = 35.35 + i * 0.9; const x1 = x0 + 0.88; const z0 = FZ + 6.05; const z1 = S.z1; B.box(MK.fridge, x0, Y, z0, x0 + 0.04, Y + 2.05, z1); B.box(MK.fridge, x1 - 0.04, Y, z0, x1, Y + 2.05, z1); B.box(MK.black, x0, Y, z0, x1, Y + 0.14, z1); B.box(MK.fridge, x0, Y + 1.98, z0, x1, Y + 2.3, z1);
      B.add(head, new THREE.PlaneGeometry(0.8, 0.2), (x0 + x1) / 2, Y + 2.15, z0 - 0.005, 0, Math.PI, 0); B.box(MK.fridgeBack, x0 + 0.04, Y + 0.14, z1 - 0.03, x1 - 0.04, Y + 1.98, z1 - 0.02);
      for (const ly of [0.16, 0.52, 0.88, 1.24, 1.6]) { B.box(MK.glassShelf, x0 + 0.04, Y + ly - 0.012, z0 + 0.05, x1 - 0.04, Y + ly, z1 - 0.04); wareRow(MK.wareLit, ly < 0.5 || (i === 1 && ly > 1.5) ? ['bottle'] : ['can'], 'x', x0 + 0.06, x1 - 0.06, Y + ly, (z0 + z1) / 2 + 0.03, 'nz', { rows: 3, fill: 0.97, run: [3, 6] }); }
      B.add(MK.glass, new THREE.PlaneGeometry(0.82, 1.82), (x0 + x1) / 2, Y + 1.06, z0 - 0.01, 0, Math.PI, 0); for (const [a, b] of [[x0 + 0.02, x0 + 0.06], [x1 - 0.06, x1 - 0.02]]) B.box(MK.frame, a, Y + 0.14, z0 - 0.03, b, Y + 1.98, z0); B.box(MK.frame, x0 + 0.02, Y + 1.94, z0 - 0.03, x1 - 0.02, Y + 1.98, z0); B.box(MK.frame, x0 + 0.02, Y + 0.14, z0 - 0.03, x1 - 0.02, Y + 0.18, z0);
      B.box(MK.steel, x1 - 0.11, Y + 0.7, z0 - 0.07, x1 - 0.09, Y + 1.5, z0 - 0.05); } glow(g, 36.7, Y + 1.1, FZ + 5.9, 0x9ad8ff, 3.2, 0.12); }
  // Kistenstapel in der Ecke neben der Theke
  for (let k = 0; k < 4; k++) for (const [x, z, mat] of [[38.32, FZ + 5.65, k % 2 ? MK.red : MK.blue], [38.32, FZ + 6.3, k % 2 ? MK.greenP : MK.yellow]]) { B.box(mat, x - 0.2, Y + 0.03 + k * 0.3, z - 0.28, x + 0.2, Y + 0.31 + k * 0.3, z + 0.28); if (k === 3) for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) B.add(MK.cap, NECK, x - 0.12 + i * 0.08, Y + 0.33 + k * 0.3, z - 0.1 + j * 0.2); }
  // Zeitschriften an der rechten Wand: vier Stufen, Hefte leicht nach hinten gelehnt
  { const z0 = FZ + 0.68; const z1 = FZ + 4.18; for (let k = 0; k < 4; k++) { const x = 42.36 + k * 0.08; const y = Y + 0.32 + k * 0.36; B.box(MK.shelfDark, x - 0.04, y - 0.03, z0, S.x1, y, z1); B.box(MK.shelfDark, x - 0.05, y - 0.03, z0, x - 0.035, y + 0.09, z1); wareRow(MK.ware, ['mag'], 'z', z0 + 0.03, z1 - 0.03, y, x + 0.01, 'nx', { tilt: 0.22, run: [1, 3], gap: 0.012, fill: 0.97 }); }
    for (const z of [z0, z1]) B.box(MK.shelfDark, 42.3, Y, z - 0.02, S.x1, Y + 1.6, z + 0.02); fplane('ex', std({ map: label('ZEITSCHRIFTEN', { w: 512, h: 96, bg: '#1c4aa8', fg: '#ffffff', size: 60 }), roughness: 0.6 }), (z0 + z1) / 2, Y + 2.1, 0.01, 2.2, 0.36); }
  // Auslage im linken Schaufenster: Dosen-Pyramide, Angebotsschild, Chips, Pflanze
  { B.box(MK.woodL, 35.4, Y, FZ + 0.25, 38.12, Y + 0.55, FZ + 0.74); for (let L = 0; L < 5; L++) { const n = 9 - L * 2; for (let i = 0; i < n; i++) for (const z of [FZ + 0.42, FZ + 0.52]) { const geo = uvCell(BASE.can, (i + L * 3) % 16, L % 2, 16, 8); B.add(MK.ware, geo, 36.1 + (i - (n - 1) / 2) * 0.07, Y + 0.55 + 0.061 + L * 0.124, z); } }
    B.add(std({ map: stickerTex(['ANGEBOT', '2 FÜR 3 €'], { bg: '#f2c81c', fg: '#c8231c', w: 256, h: 160 }), roughness: 0.6 }), new THREE.PlaneGeometry(0.5, 0.31), 37.3, Y + 0.8, FZ + 0.44, 0, Math.PI, 0); B.box(MK.card, 37.28, Y + 0.55, FZ + 0.46, 37.32, Y + 0.65, FZ + 0.56);
    wareRow(MK.ware, ['chips'], 'x', 37.62, 38.08, Y + 0.55, FZ + 0.5, 'nz', { run: [2, 3] }); B.add(MK.pot, new THREE.CylinderGeometry(0.1, 0.08, 0.2, 12), 35.6, Y + 0.65, FZ + 0.5); for (let i = 0; i < 7; i++) B.add(MK.leaf, new THREE.IcosahedronGeometry(0.09, 0), 35.6 + Math.sin(i * 2.3) * 0.07, Y + 0.82 + (i % 3) * 0.08, FZ + 0.5 + Math.cos(i * 2.3) * 0.07); }
  // Auslage rechts: Paketstapel mit Klebeband, Schild „PAKET-SHOP“
  { B.box(MK.woodL, 40.08, Y, FZ + 0.25, 42.6, Y + 0.55, FZ + 0.74); const parcel = std({ map: canvasTex(128, 128, (x, w) => { x.fillStyle = '#b88c56'; x.fillRect(0, 0, w, w); x.fillStyle = '#d8c27a'; x.fillRect(w / 2 - 9, 0, 18, w); x.fillStyle = '#f4f0e6'; x.fillRect(12, 14, 40, 26); x.fillStyle = '#1c1c1c'; for (let i = 0; i < 3; i++) x.fillRect(16, 20 + i * 7, 28, 2); }), roughness: 0.9 });
    for (const [x, w, h, d, y] of [[40.45, 0.5, 0.36, 0.38, 0], [40.95, 0.4, 0.3, 0.34, 0], [40.5, 0.36, 0.24, 0.3, 0.36], [41.45, 0.3, 0.42, 0.3, 0], [40.92, 0.26, 0.2, 0.24, 0.3]]) B.add(parcel, new THREE.BoxGeometry(w, h, d), x, Y + 0.55 + y + h / 2, FZ + 0.5, 0, (r() - 0.5) * 0.3, 0); }
  // Theke: Holz, Süßigkeiten-Vitrine vorne, dunkle Platte; darauf Kasse, Kartenleser, Rubbellose, Kaugummi, Klingel, Trinkgeldglas, Kaffeemaschine, Zeitung, Schild
  { const z0 = FZ + 4.45; const z1 = FZ + 5.05; B.box(MK.wood, 38.6, Y, z0, 39.0, Y + 0.98, z1); B.box(MK.wood, 40.2, Y, z0, 42.75, Y + 0.98, z1); B.box(MK.wood, 39.0, Y, z0 + 0.42, 40.2, Y + 0.98, z1); B.box(MK.wood, 39.0, Y, z0, 40.2, Y + 0.12, z0 + 0.42); B.box(MK.wood, 39.0, Y + 0.92, z0, 40.2, Y + 0.98, z0 + 0.42); B.box(MK.black, 38.6, Y, z0 - 0.01, 42.75, Y + 0.1, z0 + 0.02);
    B.box(MK.fridgeBack, 39.0, Y + 0.12, z0 + 0.4, 40.2, Y + 0.92, z0 + 0.42); B.add(MK.glass, new THREE.PlaneGeometry(1.2, 0.74), 39.6, Y + 0.52, z0 - 0.005, 0, Math.PI, 0); for (const y of [0.15, 0.5]) { B.box(MK.shelf, 39.0, Y + y - 0.015, z0 + 0.02, 40.2, Y + y, z0 + 0.4); wareRow(MK.wareLit, ['candy'], 'x', 39.04, 40.16, Y + y, z0 + 0.2, 'nz', { rows: 2, run: [3, 6] }); }
    B.box(MK.frame, 38.99, Y + 0.12, z0 - 0.015, 40.21, Y + 0.15, z0 + 0.02); B.box(MK.frame, 38.99, Y + 0.89, z0 - 0.015, 40.21, Y + 0.92, z0 + 0.02);
    B.box(MK.laminate, 38.55, Y + 0.98, z0 - 0.07, 42.75, Y + 1.02, z1 + 0.05); const top = Y + 1.02;
    B.box(MK.black, 41.1, top, FZ + 4.62, 41.5, top + 0.11, FZ + 4.95); { const scr = std({ color: 0x000000, emissive: 0x58d0a0, emissiveIntensity: 1.2 }); B.add(MK.black, new THREE.BoxGeometry(0.3, 0.2, 0.03), 41.3, top + 0.25, FZ + 4.82, -0.35, 0, 0); B.add(scr, new THREE.PlaneGeometry(0.26, 0.16), 41.3, top + 0.255, FZ + 4.802, -0.35, Math.PI, 0); B.box(MK.black, 41.28, top + 0.11, FZ + 4.8, 41.32, top + 0.16, FZ + 4.84); }
    B.add(MK.black, new THREE.BoxGeometry(0.08, 0.03, 0.15), 40.85, top + 0.015, FZ + 4.58, 0, 0.3, 0); B.add(std({ color: 0x000000, emissive: 0x7ad8ff, emissiveIntensity: 1 }), new THREE.PlaneGeometry(0.05, 0.04), 40.85, top + 0.032, FZ + 4.57, -Math.PI / 2, 0, 0.3);
    { B.box(MK.frame, 39.4, top, FZ + 4.5, 39.85, top + 0.02, FZ + 4.72); for (let i = 0; i < 5; i++) { const geo = uvCell(new THREE.BoxGeometry(0.075, 0.11, 0.004), (i * 3) % 16, 4, 16, 8); B.add(MK.ware, geo, 39.45 + i * 0.085, top + 0.07, FZ + 4.62, -0.35, Math.PI, 0); } } // Rubbellose
    wareRow(MK.ware, ['candy'], 'x', 40.0, 40.55, top, FZ + 4.58, 'nz', { run: [3, 5] }); B.add(std({ color: 0xd4a83a, metalness: 0.85, roughness: 0.3 }), new THREE.SphereGeometry(0.045, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 41.85, top, FZ + 4.55); B.add(MK.glass, new THREE.CylinderGeometry(0.06, 0.06, 0.16, 14, 1, true), 42.15, top + 0.08, FZ + 4.62);
    for (let i = 0; i < 7; i++) B.add(MK.coin, new THREE.CylinderGeometry(0.012, 0.012, 0.004, 10), 42.15 + (r() - 0.5) * 0.06, top + 0.004 + i * 0.006, FZ + 4.62 + (r() - 0.5) * 0.06);
    B.box(MK.black, 38.68, top, FZ + 4.62, 38.98, top + 0.42, FZ + 4.98); B.box(MK.steel, 38.7, top + 0.12, FZ + 4.58, 38.96, top + 0.14, FZ + 4.62); B.add(std({ color: 0x000000, emissive: 0xff8a3a, emissiveIntensity: 2 }), new THREE.PlaneGeometry(0.05, 0.02), 38.83, top + 0.34, FZ + 4.615, 0, Math.PI, 0); for (let i = 0; i < 5; i++) B.add(MK.white, new THREE.CylinderGeometry(0.04, 0.03, 0.09, 10), 38.78, top + 0.05 + i * 0.03, FZ + 4.47, 0, 0, 0);
    B.add(std({ map: newsTex(), roughness: 0.9 }), new THREE.PlaneGeometry(0.42, 0.21), 41.95, top + 0.003, FZ + 4.85, -Math.PI / 2, 0, 0.2); B.add(std({ map: stickerTex(['KEIN TABAK', 'UNTER 18!'], { bg: '#f4f0e6', fg: '#c8231c', w: 256, h: 128 }), roughness: 0.6 }), new THREE.PlaneGeometry(0.26, 0.13), 40.62, top + 0.09, FZ + 4.47, -0.2, Math.PI, 0); }
  // hinter der Theke: Tabakwand (beleuchtet), Schubladenschrank, Personaltür, Uhr, Fernseher mit Fußball
  { const x0 = 39.6; const x1 = 42.62; const z = S.z1; B.box(std({ color: 0x000000, emissive: 0xfff2dc, emissiveIntensity: 0.7 }), x0, Y + 0.95, z - 0.03, x1, Y + 2.48, z - 0.02); B.box(MK.frame, x0 - 0.04, Y + 0.92, z - 0.26, x0, Y + 2.52, z); B.box(MK.frame, x1, Y + 0.92, z - 0.26, x1 + 0.04, Y + 2.52, z); B.box(MK.frame, x0 - 0.04, Y + 2.48, z - 0.26, x1 + 0.04, Y + 2.52, z);
    for (let k = 0; k < 7; k++) { const y = Y + 0.98 + k * 0.21; B.box(MK.glassShelf, x0, y - 0.01, z - 0.22, x1, y, z - 0.03); wareRow(MK.wareLit, ['pack'], 'x', x0 + 0.02, x1 - 0.02, y, z - 0.1, 'nz', { run: [4, 8], fill: 0.97, gap: 0.004 }); }
    const tsign = label('TABAKWAREN', { w: 512, h: 80, bg: '#14181c', fg: '#ffd25a', size: 56, glowC: '#ff9a20' }); B.add(std({ map: tsign, emissiveMap: tsign, emissive: 0xffffff, emissiveIntensity: 0.9 }), new THREE.PlaneGeometry(1.6, 0.25), (x0 + x1) / 2, Y + 2.68, z - 0.015, 0, Math.PI, 0);
    B.box(MK.wood, x0, Y, z - 0.48, x1, Y + 0.9, z); B.box(MK.laminate, x0 - 0.02, Y + 0.9, z - 0.5, x1 + 0.02, Y + 0.93, z); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const xx = x0 + 0.38 + i * 0.75; B.box(MK.frame, xx - 0.32, Y + 0.08 + j * 0.42, z - 0.485, xx + 0.32, Y + 0.09 + j * 0.42, z - 0.48); B.box(MK.steel, xx - 0.08, Y + 0.3 + j * 0.42, z - 0.5, xx + 0.08, Y + 0.32 + j * 0.42, z - 0.48); }
    B.box(MK.gray, 38.65, Y + 0.03, z - 0.04, 39.45, Y + 2.1, z - 0.01); B.add(std({ map: stickerTex(['NUR', 'PERSONAL'], { bg: '#f4f0e6', fg: '#c8231c', w: 128, h: 96 }), roughness: 0.6 }), new THREE.PlaneGeometry(0.3, 0.22), 39.05, Y + 1.55, z - 0.045, 0, Math.PI, 0); B.box(MK.steel, 39.32, Y + 1.0, z - 0.08, 39.4, Y + 1.03, z - 0.04);
    const clock = canvasTex(128, 128, (x, w) => { x.fillStyle = '#f4f0e6'; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 3, 0, 7); x.fill(); x.strokeStyle = '#1c1c1c'; x.lineWidth = 5; x.stroke(); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.fillStyle = '#1c1c1c'; x.fillRect(w / 2 + Math.sin(a) * 50 - 2, w / 2 - Math.cos(a) * 50 - 2, 4, 4); } x.lineWidth = 4; x.beginPath(); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 + 22, w / 2 - 20); x.moveTo(w / 2, w / 2); x.lineTo(w / 2 - 6, w / 2 - 42); x.stroke(); });
    B.add(std({ map: clock, transparent: true, roughness: 0.6 }), new THREE.CircleGeometry(0.16, 24), 39.05, Y + 2.6, z - 0.012, 0, Math.PI, 0); }
  const tvC = document.createElement('canvas'); tvC.width = 256; tvC.height = 144; drawTv(tvC, 0); const tvT = new THREE.CanvasTexture(tvC); tvT.colorSpace = THREE.SRGBColorSpace;
  { const tv = new THREE.Group(); tv.position.set(42.38, Y + 2.48, FZ + 6.1); tv.rotation.y = -2.45; g.add(tv); mesh(new THREE.BoxGeometry(0.84, 0.5, 0.06), MK.black, 0, 0, 0, tv); mesh(new THREE.PlaneGeometry(0.78, 0.44), new THREE.MeshBasicMaterial({ map: tvT, toneMapped: false }), 0, 0, 0.031, tv); mesh(new THREE.BoxGeometry(0.06, 0.06, 0.4), MK.steel, 0, 0, -0.22, tv); }
  // Sicherheitsspiegel und Kamera an der Decke
  B.add(std({ color: 0xcfd8de, metalness: 1, roughness: 0.12 }), new THREE.SphereGeometry(0.22, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), 35.5, Y + 2.65, FZ + 0.5, -Math.PI / 2 - 0.5, 0.8, 0); B.add(MK.black, new THREE.SphereGeometry(0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 42.4, Y + S.ceil, FZ + 0.6, Math.PI, 0, 0);

  // ---- vor dem Laden: Gehwegplatten, Zeitungsständer, Stehtisch, Kundenstopper, Eistruhe, Eis-Schild, Getränkekisten
  wallBox(B, MK.pave, 33.0, Y - 0.1, FZ - 1.92, 46.0, Y + 0.03, FZ, 2.0);
  { B.box(MK.steel, 35.22, Y, FZ - 0.42, 35.26, Y + 1.1, FZ - 0.06); B.box(MK.steel, 35.89, Y, FZ - 0.42, 35.93, Y + 1.1, FZ - 0.06); const news = std({ map: newsTex(), roughness: 0.9 });
    for (let k = 0; k < 3; k++) { const y = Y + 0.3 + k * 0.3; B.box(MK.steel, 35.22, y, FZ - 0.42 + k * 0.1, 35.93, y + 0.02, FZ - 0.3 + k * 0.1); B.add(news, new THREE.PlaneGeometry(0.66, 0.33), 35.575, y + 0.17, FZ - 0.38 + k * 0.1, -0.35, Math.PI, 0); } }
  { const tx = 36.6; const tz = FZ - 1.05; B.add(MK.steel, new THREE.CylinderGeometry(0.03, 0.03, 1.05, 10), tx, Y + 0.55, tz); B.add(MK.steel, new THREE.CylinderGeometry(0.25, 0.27, 0.03, 18), tx, Y + 0.045, tz); B.add(MK.woodL, new THREE.CylinderGeometry(0.32, 0.32, 0.04, 22), tx, Y + 1.09, tz);
    B.add(MK.black, new THREE.CylinderGeometry(0.06, 0.05, 0.03, 14), tx + 0.12, Y + 1.125, tz + 0.05); for (let i = 0; i < 3; i++) B.add(MK.butt, new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6), tx + 0.1 + i * 0.015, Y + 1.15, tz + 0.05, 0, 0, 1.2 + i * 0.3); }
  { const ax = 37.9; const az = FZ - 2.05; const chalk = std({ map: chalkTex(), roughness: 0.9 }); for (const s of [-1, 1]) { B.add(MK.wood, new THREE.BoxGeometry(0.56, 0.86, 0.025), ax, Y + 0.45, az + s * 0.15, -s * 0.17, 0, 0); B.add(chalk, new THREE.PlaneGeometry(0.47, 0.66), ax, Y + 0.47, az + s * 0.164, -s * 0.17, s > 0 ? 0 : Math.PI, 0); } }
  { const fx0 = 40.28; const fx1 = 41.52; const fz0 = FZ - 0.8; const fz1 = FZ - 0.03; B.box(MK.white, fx0, Y, fz0, fx1, Y + 0.55, fz1); B.box(MK.blue, fx0 - 0.005, Y + 0.55, fz0 - 0.005, fx1 + 0.005, Y + 0.7, fz1); for (const [a, b, c, d] of [[fx0, fx1, fz0, fz0 + 0.05], [fx0, fx1, fz1 - 0.05, fz1], [fx0, fx0 + 0.05, fz0, fz1], [fx1 - 0.05, fx1, fz0, fz1]]) { B.box(MK.white, a, Y + 0.7, c, b, Y + 0.82, d); B.box(MK.frame, a, Y + 0.82, c, b, Y + 0.86, d); }
    B.add(std({ map: label('EIS', { w: 256, h: 96, bg: '#1f4fa8', fg: '#ffffff', size: 72 }), roughness: 0.6 }), new THREE.PlaneGeometry(0.4, 0.14), (fx0 + fx1) / 2, Y + 0.625, fz0 - 0.008, 0, Math.PI, 0); B.box(MK.black, fx0, Y, fz0 - 0.01, fx1, Y + 0.08, fz0);
    for (let i = 0; i < 11; i++) for (let j = 0; j < 4; j++) B.add(MK.wareLit, uvCell(new THREE.BoxGeometry(0.1, 0.035, 0.15), (i * 5 + j) % 16, 4, 16, 8), fx0 + 0.1 + i * 0.1, Y + 0.72, fz0 + 0.12 + j * 0.17, 0, (r() - 0.5) * 0.3, 0);
    B.add(MK.glass, new THREE.PlaneGeometry(fx1 - fx0, fz1 - fz0), (fx0 + fx1) / 2, Y + 0.862, (fz0 + fz1) / 2, -Math.PI / 2, 0, 0);
    B.add(MK.steel, new THREE.CylinderGeometry(0.025, 0.025, 1.7, 8), 41.75, Y + 0.85, FZ - 0.33); const eis = canvasTex(256, 256, (x, w) => { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 4, 0, 7); x.fill(); x.strokeStyle = '#1f4fa8'; x.lineWidth = 14; x.stroke(); x.fillStyle = '#d89a4a'; x.beginPath(); x.moveTo(w / 2 - 34, 120); x.lineTo(w / 2 + 34, 120); x.lineTo(w / 2, 220); x.fill(); for (const [dx, c] of [[-26, '#ff8ac8'], [26, '#7ad8ff'], [0, '#fff2b0']]) { x.fillStyle = c; x.beginPath(); x.arc(w / 2 + dx, dx ? 104 : 80, 34, 0, 7); x.fill(); } });
    const em = std({ map: eis, transparent: true, alphaTest: 0.1, roughness: 0.6, side: THREE.DoubleSide }); B.add(em, new THREE.CircleGeometry(0.28, 24), 41.75, Y + 1.85, FZ - 0.33, 0, Math.PI / 2, 0); }
  for (let k = 0; k < 4; k++) for (const [x, mat] of [[42.15, k % 2 ? MK.greenP : MK.red], [42.62, k % 2 ? MK.yellow : MK.blue]]) { B.box(mat, x - 0.21, Y + 0.03 + k * 0.29, FZ - 0.5, x + 0.21, Y + 0.3 + k * 0.29, FZ - 0.06); if (k === 3) for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) B.add(MK.cap, NECK, x - 0.15 + i * 0.1, Y + 0.32 + k * 0.29, FZ - 0.42 + j * 0.14); }
  // Straßenschild an der Ecke
  { const st = std({ map: label('LINDENSTRASSE', { w: 512, h: 112, bg: '#f4f2ec', fg: '#1c1c1c', size: 66 }), roughness: 0.6 }); B.box(MK.black, 34.97, Y + 2.86, FZ + 0.2, 35.0, Y + 3.12, FZ + 1.2); B.add(st, new THREE.PlaneGeometry(0.96, 0.22), 34.965, Y + 2.99, FZ + 0.7, 0, -Math.PI / 2, 0); }

  // ---- Seite zur Querstraße: Zigarettenautomat, Plakate, Graffiti, Fahrrad
  { const at = automatTex(); const am = std({ map: at, emissiveMap: at, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.45 }); B.box(MK.red, 34.8, Y + 0.85, FZ + 1.27, 35.0, Y + 1.98, FZ + 1.98); B.add(am, new THREE.PlaneGeometry(0.66, 1.08), 34.795, Y + 1.41, FZ + 1.625, 0, -Math.PI / 2, 0); glow(g, 34.7, Y + 1.85, FZ + 1.62, 0xff6040, 0.7, 0.2);
    const posters = ['bruno', 'floh', 'zirkus', 'party', 'bruno']; posters.forEach((k, i) => { B.add(std({ map: posterTex(k), roughness: 0.85 }), new THREE.PlaneGeometry(0.62, 0.87), 34.99 - i * 0.002, Y + 1.25 + (i % 2) * 0.35, FZ + 2.6 + i * 0.48, 0, -Math.PI / 2, (r() - 0.5) * 0.06); });
    mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: graffiti(43, ['EDE', 'LZ', 'KALLE']), transparent: true, depthWrite: false }), 34.985, Y + 1.5, FZ + 5.4, g, { ry: -Math.PI / 2 }); }
  { const bike = new THREE.Group(); bike.position.set(34.82, Y + 0.03, FZ + 5.8); bike.rotation.order = 'ZYX'; bike.rotation.set(0, Math.PI / 2, -0.12); g.add(bike); const fr = std({ color: 0x2a6ac8, roughness: 0.4, metalness: 0.4 });
    for (const s of [-0.52, 0.52]) { mesh(new THREE.TorusGeometry(0.32, 0.022, 8, 28), MK.black, s, 0.34, 0, bike); mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), MK.steel, s, 0.34, 0, bike, { rx: Math.PI / 2 }); }
    const rod = (x0, y0, x1, y1, m = fr, t = 0.018) => { const L = Math.hypot(x1 - x0, y1 - y0); mesh(new THREE.CylinderGeometry(t, t, L, 6), m, (x0 + x1) / 2, (y0 + y1) / 2, 0, bike, { rz: Math.atan2(x0 - x1, y1 - y0) }); };
    rod(-0.52, 0.34, -0.05, 0.36); rod(-0.05, 0.36, 0.38, 0.78); rod(-0.12, 0.8, 0.38, 0.78); rod(-0.05, 0.36, -0.15, 0.86); rod(-0.52, 0.34, -0.13, 0.8); rod(0.52, 0.34, 0.4, 0.9); rod(0.4, 0.9, 0.35, 1.0, MK.steel);
    mesh(new THREE.BoxGeometry(0.22, 0.04, 0.09), MK.black, -0.16, 0.89, 0, bike); mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), MK.black, 0.35, 1.0, 0, bike, { rx: Math.PI / 2 }); }

  // ---- Hinterhof: Kopfsteinpflaster, Mauern, offenes Tor, Hinterhaus, Rückseite des Kiosks, Feuertonne, Lichterkette, Sofa, Container, Paletten, Tonnen, Kisten, Kalles Stand
  wallBox(B, M.cobble, YARD.x0, Y - 0.1, YARD.z0, YARD.x1, Y + 0.02, YARD.z1, 2.0); // Kopfstein aus Blender, 2 m je Kachel
  for (const [a, b, c, d] of [[YARD.x0, YARD.x0 + 0.25, YARD.z0, YARD.gate0], [YARD.x0, YARD.x0 + 0.25, YARD.gate1, YARD.z1], [YARD.x1 - 0.25, YARD.x1, YARD.z0, YARD.z1]]) { wallBox(B, M.brickR, a, Y - 0.1, c, b, Y + 2.4, d); B.box(MK.concrete, a - 0.02, Y + 2.4, c, b + 0.02, Y + 2.48, d); }
  for (const [z0, z1] of [[YARD.gate0 - 0.4, YARD.gate0], [YARD.gate1, YARD.gate1 + 0.4]]) { B.box(M.brickR, 34.9, Y - 0.1, z0, 35.35, Y + 2.7, z1); B.box(MK.concrete, 34.86, Y + 2.7, z0 - 0.04, 35.39, Y + 2.8, z1 + 0.04); }
  { const leaf = new THREE.Group(); leaf.position.set(35.33, Y, YARD.gate1 + 0.45); leaf.rotation.y = Math.PI + 0.06; g.add(leaf); for (let i = 0; i < 8; i++) mesh(new THREE.BoxGeometry(0.03, 1.8, 0.03), MK.frame, 0, 0.95, -0.1 - i * 0.24, leaf); for (const y of [0.25, 1.7]) mesh(new THREE.BoxGeometry(0.04, 0.06, 1.9), MK.frame, 0, y, -0.95, leaf); }
  mesh(new THREE.PlaneGeometry(1.6, 0.4), std({ map: label('PRIVAT · KEIN ZUTRITT', { w: 512, h: 128, bg: '#e8e2d0', fg: '#b8231c', size: 44 }) }), YARD.x0 - 0.01, Y + 1.9, YARD.gate0 - 1.2, g, { ry: -Math.PI / 2 });
  mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: graffiti(61, ['KALLE', 'LZ', '★']), transparent: true, depthWrite: false }), YARD.x1 - 0.26, Y + 1.3, FZ + 10.4, g, { ry: -Math.PI / 2 });
  mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: graffiti(62, ['HOF', 'BRUNO']), transparent: true, depthWrite: false }), YARD.x0 + 0.26, Y + 1.25, FZ + 13.2, g, { ry: Math.PI / 2 });
  // Hinterhaus (Südseite des Hofs, auch zur Querstraße): Fassade, Fenster, Tür, Fallrohr, Dach
  wallBox(B, MK.back, 35, Y - 0.2, FZ + 15, 43, Y + 8.4, FZ + 24); B.box(MK.trim, 34.9, Y + 8.4, FZ + 14.88, 43, Y + 8.6, FZ + 24); B.box(MK.gray, 35, Y - 0.2, FZ + 14.97, 43, Y + 0.45, FZ + 15.0);
  for (const [a, k] of [[36.0, 0], [37.9, 2], [40.6, 1], [42.1, 3]]) { win('hz', a, Y + 3.9, 0.95, 1.3, k); win('hz', a, Y + 6.5, 0.95, 1.3, k + 1, a > 41); }
  for (const a of [35.75, 38.95]) { fplane('hz', winMat(1), a, Y + 1.4, 0.025, 0.6, 0.55); for (let i = 0; i < 5; i++) fbox('hz', MK.frame, a - 0.26 + i * 0.13, a - 0.24 + i * 0.13, Y + 1.12, Y + 1.68, 0.03, 0.05); }
  fbox('hz', MK.wood, 40.15, 41.15, Y + 0.02, Y + 2.15, 0, 0.05); fbox('hz', MK.trim, 40.0, 41.3, Y + 2.15, Y + 2.25, 0, 0.3); fbox('hz', MK.steel, 41.0, 41.05, Y + 1.0, Y + 1.03, 0.05, 0.1);
  B.add(MK.gray, new THREE.CylinderGeometry(0.05, 0.05, 8.5, 8), 37.0, Y + 4.2, FZ + 14.93); B.add(MK.gray, new THREE.CylinderGeometry(0.05, 0.05, 9.4, 8), 42.6, Y + 4.6, FZ + 7.07);
  for (const [a, k] of [[FZ + 16.6, 2], [FZ + 19.2, 0], [FZ + 21.8, 3]]) { win('nx', a, Y + 3.9, 0.95, 1.3, k); win('nx', a, Y + 6.5, 0.95, 1.3, k + 1); }
  fbox('nx', MK.wood, FZ + 18.7, FZ + 19.7, Y + 0.02, Y + 2.15, 0, 0.05); fbox('nx', MK.trim, FZ + 18.55, FZ + 19.85, Y + 2.15, Y + 2.25, 0, 0.3); fplane('nx', std({ map: label('12a', { w: 128, h: 96, bg: '#1c4aa8', fg: '#ffffff', size: 64 }) }), FZ + 20.05, Y + 1.7, 0.01, 0.22, 0.16);
  // Rückseite des Kiosks: Personaltür mit Lampe, Klimagerät mit Lüfter, Stromkasten, plattgedrückte Kartons
  { fbox('pz', MK.gray, 38.65, 39.45, Y + 0.02, Y + 2.1, 0, 0.04); fplane('pz', std({ map: stickerTex(['LIEFER-', 'EINGANG'], { bg: '#f4f0e6', fg: '#1c1c1c', w: 128, h: 96 }), roughness: 0.6 }), 39.05, Y + 1.6, 0.045, 0.3, 0.22);
    fbox('pz', MK.black, 38.95, 39.15, Y + 2.38, Y + 2.48, 0, 0.22); B.box(MK.bulb, 39.0, Y + 2.34, FZ + 7.12, 39.1, Y + 2.38, FZ + 7.2); glow(g, 39.05, Y + 2.33, FZ + 7.25, 0xffd8a0, 1.6, 0.55);
    fbox('pz', MK.white, 40.3, 41.2, Y + 2.0, Y + 2.65, 0, 0.35); fbox('pz', MK.steel, 40.15, 41.35, Y + 1.95, Y + 2.0, 0, 0.4); fbox('pz', MK.gray, 41.9, 42.4, Y + 1.0, Y + 1.7, 0, 0.18);
    for (let i = 0; i < 3; i++) fbox('pz', MK.card, 36.1 + i * 0.12, 36.85 + i * 0.12, Y + 0.02, Y + 1.0 - i * 0.12, 0.05 + i * 0.03, 0.07 + i * 0.03); }
  const fan = new THREE.Group(); fan.position.set(40.75, Y + 2.32, FZ + 7.36); g.add(fan); for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.06, 0.24, 0.01), MK.gray, 0, 0, 0, fan, { rz: i * Math.PI * 2 / 3 }); mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 24), MK.frame, 40.75, Y + 2.32, FZ + 7.36, g);
  // Feuertonne: rostiges Fass mit Rippen, Flammen (überkreuzte Flächen) und Funken
  B.add(MK.rust, new THREE.CylinderGeometry(0.29, 0.29, 0.88, 18, 1, true), FIRE.x, Y + 0.46, FIRE.z); for (const y of [0.18, 0.46, 0.74]) B.add(MK.rust, new THREE.TorusGeometry(0.295, 0.015, 6, 24), FIRE.x, Y + y, FIRE.z, Math.PI / 2, 0, 0); B.add(std({ color: 0x1a0c06, roughness: 1 }), new THREE.CircleGeometry(0.28, 18), FIRE.x, Y + 0.8, FIRE.z, -Math.PI / 2, 0, 0);
  const flameT = canvasTex(128, 256, (x, w, h) => { const gr = x.createRadialGradient(w / 2, h * 0.78, 4, w / 2, h * 0.7, h * 0.62); gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,.95)'); gr.addColorStop(0.6, 'rgba(255,90,20,.55)'); gr.addColorStop(1, 'rgba(255,40,0,0)'); x.fillStyle = gr; x.beginPath(); x.moveTo(w / 2, 0); x.quadraticCurveTo(w, h * 0.6, w * 0.82, h); x.lineTo(w * 0.18, h); x.quadraticCurveTo(0, h * 0.6, w / 2, 0); x.fill(); });
  const flames = new THREE.Group(); flames.position.set(FIRE.x, Y + 0.8, FIRE.z); g.add(flames); const fMat = new THREE.MeshBasicMaterial({ map: flameT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
  for (let i = 0; i < 3; i++) { const f = mesh(new THREE.PlaneGeometry(0.5, 0.75), fMat, 0, 0.3, 0, flames, { ry: (i * Math.PI) / 3 }); f.userData.p = i * 2.1; }
  const fireGlow = glow(g, FIRE.x, Y + 1.15, FIRE.z, 0xff8a30, 2.4, 0.5);
  const NSP = 26; const spPos = new Float32Array(NSP * 3); const spark = []; for (let i = 0; i < NSP; i++) spark.push({ t: r() * 2, x: 0, y: 0, z: 0, vx: 0, vz: 0 });
  const spGeo = new THREE.BufferGeometry(); spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3)); const sparks = new THREE.Points(spGeo, new THREE.PointsMaterial({ color: 0xffb050, size: 0.035, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; g.add(sparks);
  // Lichterkette über dem Hof (drei Bögen von der Kioskwand zum Hinterhaus)
  { const bulbs = []; for (const x of [36.4, 38.9, 41.4]) { const pts = sagLine(new THREE.Vector3(x, Y + 3.6, FZ + 7.02), new THREE.Vector3(x + 0.3, Y + 3.5, FZ + 14.98), 0.75, 16); B.add(MK.black, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.006, 4, false)); pts.forEach((p, i) => { if (i > 0 && i < pts.length - 1) bulbs.push(p); }); }
    const bm = [std({ color: 0x000000, emissive: 0xffd49a, emissiveIntensity: 3 }), std({ color: 0x000000, emissive: 0xff8a5a, emissiveIntensity: 3 }), std({ color: 0x000000, emissive: 0xfff0c0, emissiveIntensity: 3 })];
    bulbs.forEach((p, i) => { B.add(bm[i % 3], new THREE.SphereGeometry(0.035, 8, 6), p.x, p.y - 0.05, p.z); if (i % 4 === 0) glow(g, p.x, p.y - 0.05, p.z, 0xffc880, 0.5, 0.35); }); }
  // altes Sofa an der Hinterhauswand, Mülltonnen, Container, Paletten mit Plane, Kisten mit Kalles Ware
  { const x0 = 37.9; const x1 = 40.0; const z0 = FZ + 13.98; const z1 = FZ + 14.72; B.box(MK.sofaD, x0, Y, z0, x1, Y + 0.42, z1); B.box(MK.sofa, x0, Y + 0.42, z1 - 0.22, x1, Y + 0.95, z1); for (const x of [x0, x1 - 0.2]) B.box(MK.sofa, x, Y + 0.42, z0, x + 0.2, Y + 0.68, z1);
    for (let i = 0; i < 2; i++) { const c = new THREE.BoxGeometry(0.8, 0.14, 0.52); B.add(MK.sofa, c, x0 + 0.6 + i * 0.86, Y + 0.49, z0 + 0.27, 0.05, (r() - 0.5) * 0.1, 0); } B.add(std({ color: 0xd8b04a, roughness: 0.9 }), new THREE.BoxGeometry(0.34, 0.3, 0.12), x0 + 0.5, Y + 0.68, z1 - 0.28, -0.3, 0.3, 0.2); }
  for (const [x, mat] of [[36.7, M.bin || MK.greenP], [37.32, M.binB || MK.blue]]) { B.box(mat, x - 0.27, Y + 0.06, FZ + 13.8, x + 0.27, Y + 1.02, FZ + 14.42); B.box(MK.black, x - 0.29, Y + 1.02, FZ + 13.78, x + 0.29, Y + 1.07, FZ + 14.46); for (const s of [-1, 1]) B.add(MK.black, new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), x + s * 0.2, Y + 0.08, FZ + 14.42, 0, 0, Math.PI / 2); }
  { B.box(MK.container, 41.6, Y + 0.1, FZ + 7.3, 42.72, Y + 1.25, FZ + 8.85); B.add(MK.container, new THREE.BoxGeometry(1.16, 0.05, 1.6), 42.16, Y + 1.32, FZ + 8.07, 0, 0, -0.18); for (const z of [FZ + 7.4, FZ + 8.75]) for (const x of [41.7, 42.62]) B.add(MK.black, new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), x, Y + 0.08, z, Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) B.add(MK.bag, new THREE.SphereGeometry(0.22, 10, 8), 41.35 - i * 0.18, Y + 0.2, FZ + 8.6 + i * 0.12); }
  { for (let k = 0; k < 4; k++) { const y = Y + 0.02 + k * 0.15; B.box(MK.woodL, 35.3, y, FZ + 7.3, 36.45, y + 0.025, FZ + 8.35); for (const z of [FZ + 7.32, FZ + 7.82, FZ + 8.32]) B.box(MK.woodL, 35.3, y + 0.025, z - 0.04, 36.45, y + 0.12, z + 0.04); }
    B.add(std({ color: 0x2a4a8a, roughness: 0.8, side: THREE.DoubleSide }), new THREE.PlaneGeometry(1.25, 1.15), 35.88, Y + 0.64, FZ + 7.83, -Math.PI / 2 + 0.06, 0, 0.04); }
  { const tab = std({ map: label('TABAK', { w: 256, h: 96, bg: '#b98c56', fg: '#2a1a0e', size: 60 }), roughness: 0.9 }); const bl = std({ map: label('BLÄTTCHEN', { w: 256, h: 96, bg: '#b98c56', fg: '#2a1a0e', size: 48 }), roughness: 0.9 });
    for (const [x, z, n] of [[41.9, FZ + 13.5, 3], [42.15, FZ + 14.25, 2], [41.6, FZ + 14.35, 4]]) for (let k = 0; k < n; k++) { B.add(MK.woodL, new THREE.BoxGeometry(0.6, 0.45, 0.5), x, Y + 0.25 + k * 0.46, z, 0, (k % 2) * 0.2, 0); B.add(k % 2 ? bl : tab, new THREE.PlaneGeometry(0.4, 0.15), x - 0.302 * Math.cos((k % 2) * 0.2), Y + 0.27 + k * 0.46, z + 0.302 * Math.sin((k % 2) * 0.2), 0, -Math.PI / 2 + (k % 2) * 0.2, 0); } }
  // Kalles Stand: Klapptisch mit offenem Koffer voller Tabak und Blättchen, Geldkassette, Laterne; Klappstuhl daneben
  const lantern = std({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 2.5 }); let lanternGlow = null;
  { const tx = 41.1; const tz = FZ + 11.25; const ry = 0.35; const tg = new THREE.Group(); tg.position.set(tx, Y + 0.02, tz); tg.rotation.y = ry; g.add(tg); const tp = (geo, mat, x, y, z, o) => mesh(geo, mat, x, y, z, tg, o);
    tp(new THREE.BoxGeometry(1.0, 0.03, 0.6), MK.white, 0, 0.74, 0); for (const s of [-1, 1]) { tp(new THREE.BoxGeometry(0.025, 0.78, 0.025), MK.steel, s * 0.42, 0.37, 0.26, { rz: s * 0.25 }); tp(new THREE.BoxGeometry(0.025, 0.78, 0.025), MK.steel, s * 0.42, 0.37, -0.26, { rz: s * 0.25 }); }
    tp(new THREE.BoxGeometry(0.5, 0.08, 0.34), MK.black, -0.18, 0.795, 0); const lid = tp(new THREE.BoxGeometry(0.5, 0.34, 0.03), MK.black, -0.18, 0.92, -0.18, { rx: -0.25 }); void lid; tp(new THREE.BoxGeometry(0.46, 0.005, 0.3), std({ color: 0x8a1c2a, roughness: 0.9 }), -0.18, 0.836, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) tp(new THREE.BoxGeometry(0.09, 0.03, 0.12), std({ color: [0x1f5a3a, 0x2a4a8a][j], roughness: 0.6 }), -0.36 + i * 0.12, 0.855, -0.07 + j * 0.15);
    tp(new THREE.BoxGeometry(0.2, 0.08, 0.14), std({ color: 0x5a5e66, roughness: 0.4, metalness: 0.6 }), 0.24, 0.795, 0.1); for (let i = 0; i < 3; i++) tp(new THREE.PlaneGeometry(0.13, 0.065), std({ color: 0x6aa86a, roughness: 0.8, side: THREE.DoubleSide }), 0.22 + i * 0.02, 0.84 + i * 0.002, -0.12, { rx: -Math.PI / 2, rz: i * 0.3 });
    tp(new THREE.CylinderGeometry(0.05, 0.06, 0.03, 12), MK.black, 0.38, 0.77, -0.14); tp(new THREE.CylinderGeometry(0.035, 0.035, 0.12, 12), lantern, 0.38, 0.845, -0.14); tp(new THREE.CylinderGeometry(0.045, 0.05, 0.02, 12), MK.black, 0.38, 0.915, -0.14); tp(new THREE.TorusGeometry(0.03, 0.004, 4, 12, Math.PI), MK.black, 0.38, 0.93, -0.14);
    const lp = new THREE.Vector3(0.38, 0.85, -0.14).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); lanternGlow = glow(g, tx + lp.x, Y + 0.87, tz + lp.z, 0xffb060, 0.9, 0.6);
    const ch = new THREE.Group(); ch.position.set(41.95, Y + 0.02, FZ + 11.95); ch.rotation.y = -0.6; g.add(ch); mesh(new THREE.BoxGeometry(0.44, 0.03, 0.4), std({ color: 0x2a5a3a, roughness: 0.8 }), 0, 0.45, 0, ch); mesh(new THREE.BoxGeometry(0.44, 0.4, 0.03), std({ color: 0x2a5a3a, roughness: 0.8 }), 0, 0.68, -0.2, ch, { rx: -0.15 });
    for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(0.02, 0.62, 0.02), MK.steel, s * 0.21, 0.3, 0.12, ch, { rx: 0.45 }); mesh(new THREE.BoxGeometry(0.02, 0.62, 0.02), MK.steel, s * 0.21, 0.3, -0.12, ch, { rx: -0.45 }); } }

  // ---- Figuren: Ede hinter der Theke, Kalle im Hof, Stammgast am Stehtisch; Katze auf der Eistruhe, Tauben auf dem Gehweg
  const ede = createPerson(scene, { outfit: 'schlicht', shirt: 0xe8e4dc, cap: 0x2a2a2a, brim: 0x141414, pants: 0x2a2c32, skin: 0xd8a888, hair: 0x3a2a1e, bart: 'schnauzer', face: 'grin' }); ede.place(EDE_AT.x, Y + 0.03, EDE_AT.z, Math.PI); ede.mode = 'stand'; ede.act = 'counter'; ede.setVisible(true); ede.update(0.016, 0);
  const kalle = createPerson(scene, { outfit: 'schlicht', shirt: 0x4a3426, cap: 0x1a1a1a, brim: 0x0e0e0e, pants: 0x24262c, skin: 0xd8a888, hair: 0x2a2018, bart: 'voll', face: 'flat', shoe: 0x24262c }); kalle.place(KALLE_AT.x, Y + 0.02, KALLE_AT.z, -Math.PI / 2 - 0.4); kalle.mode = 'stand'; kalle.act = 'arms'; kalle.setVisible(true); kalle.update(0.016, 0);
  const gast = createPerson(scene, { outfit: 'schlicht', shirt: 0x5a6a3a, cap: 0x3a3a3a, brim: 0x222222, pants: 0x2a3040, skin: 0xe0b498, hair: 0x6a5a4a, bart: 'voll', face: 'smile', shoe: 0x3a2a20 }); gast.place(36.6, Y + 0.03, FZ - 1.63, 0); gast.mode = 'stand'; gast.act = 'drink'; gast.setVisible(true); gast.update(0.016, 0);
  const handProp = (P, geo, mat, x, y, z, rx = 0) => { const hand = P.fig.bones.handR || P.fig.root.getObjectByName('handR'); if (!hand) return null; const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rx; hand.add(m); return m; };
  const phoneK = handProp(kalle, new THREE.BoxGeometry(0.075, 0.15, 0.012), MK.black, 0, -0.08, 0.035); const phoneE = handProp(ede, new THREE.BoxGeometry(0.075, 0.15, 0.012), MK.black, 0, -0.08, 0.035);
  const bottle = handProp(gast, new THREE.CylinderGeometry(0.03, 0.033, 0.24, 10), std({ color: 0x3a6a2a, roughness: 0.2, transparent: true, opacity: 0.85 }), 0, -0.1, 0.03, Math.PI / 2);
  const cloth = handProp(ede, new THREE.BoxGeometry(0.12, 0.02, 0.1), std({ color: 0x3a8ac8, roughness: 0.95 }), 0, -0.07, 0.03);
  for (const m of [phoneK, phoneE, cloth]) if (m) m.visible = false; void bottle;
  const cat = new THREE.Group(); cat.position.set(40.65, Y + 0.865, FZ - 0.45); cat.rotation.y = 0.6; g.add(cat); const catM = std({ color: 0xd08a3a, roughness: 0.9 }); const catD = std({ color: 0xa8662a, roughness: 0.9 });
  const catBody = mesh(new THREE.SphereGeometry(1, 14, 10), catM, 0, 0.06, 0, cat); catBody.scale.set(0.17, 0.07, 0.12); mesh(new THREE.SphereGeometry(0.06, 12, 10), catM, 0.15, 0.07, 0.04, cat); for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.022, 0.05, 6), catD, 0.16, 0.13, 0.04 + s * 0.035, cat, { rz: -0.2 * s });
  const tail = new THREE.Group(); tail.position.set(-0.14, 0.03, 0.02); cat.add(tail); mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 14, Math.PI * 1.1), catD, 0.1, 0, 0.02, tail, { rx: Math.PI / 2 });
  const pigeons = [[34.0, FZ - 2.4], [34.5, FZ - 2.9], [33.6, FZ - 3.1]].map(([hx, hz], i) => { const pg = new THREE.Group(); pg.position.set(hx, Y + 0.03, hz); pg.rotation.y = i * 2.1; g.add(pg); const pm = std({ color: 0x7a7e86, roughness: 0.8 });
    const body = mesh(new THREE.SphereGeometry(1, 10, 8), pm, 0, 0.09, 0, pg); body.scale.set(0.06, 0.06, 0.1); const head = new THREE.Group(); head.position.set(0, 0.15, 0.07); pg.add(head); mesh(new THREE.SphereGeometry(0.032, 10, 8), std({ color: 0x5a6a72, roughness: 0.7 }), 0, 0, 0, head); mesh(new THREE.ConeGeometry(0.008, 0.03, 6), std({ color: 0xc8a070, roughness: 0.6 }), 0, -0.005, 0.035, head, { rx: Math.PI / 2 });
    const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.05, 0.11, 0); pg.add(w); mesh(new THREE.BoxGeometry(0.1, 0.01, 0.12), pm, s * 0.05, 0, 0, w); return w; }); mesh(new THREE.BoxGeometry(0.04, 0.01, 0.07), pm, 0, 0.09, -0.11, pg, { rx: 0.3 });
    return { g: pg, head, wings, home: [hx, hz], st: 'peck', t: r() * 3, vy: 0, dx: 0, dz: 0 }; });

  // ---- Bewegung: Tür, Ede, Kalle, Stammgast, Katze, Feuer, Funken, Fernseher, Wäsche, Lüfter, Tauben, OFFEN-Schild
  let doorA = 0; let tvT2 = 0; let flick = 1; const look = new THREE.Vector3(); const lookE = new THREE.Vector3(); const lookG = new THREE.Vector3(); let fireLight = null;
  const ES = { t: 2, act: 'counter', yaw: Math.PI, x: EDE_AT.x, z: EDE_AT.z, inShop: false, wave: 0 }; const KS = { mode: 'spot', t: 4, act: 'arms', greeted: false, wave: 0 };
  const inShop = (x, z) => x > S.x0 && x < S.x1 && z > S.z0 - 0.2 && z < S.z1;
  function edeTick(dt, t, px, pz) {
    const here = inShop(px, pz); if (here && !ES.inShop) { ES.wave = 1.3; ES.act = 'counter'; ES.t = 6; } ES.inShop = here;
    if (!here) { ES.t -= dt; if (ES.t <= 0) { const pick = ['wipe', 'phone', 'shelf', 'arms', 'counter', 'wipe', 'shelf'][(r() * 7) | 0]; ES.act = pick; ES.t = 5 + r() * 6; } }
    const shelfMode = !here && ES.act === 'shelf'; const wantYaw = shelfMode ? 0 : Math.PI; let dy = wantYaw - ES.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; ES.yaw += dy * Math.min(1, dt * 3);
    ES.z += ((shelfMode ? EDE_AT.z + 0.45 : EDE_AT.z) - ES.z) * Math.min(1, dt * 2); ES.x += ((shelfMode ? EDE_AT.x + Math.sin(t * 0.4) * 0.6 : EDE_AT.x) - ES.x) * Math.min(1, dt * 1.5); ede.place(ES.x, Y + 0.03, ES.z, ES.yaw);
    if (ES.wave > 0) { ES.wave -= dt; ede.act = 'wave'; } else ede.act = here ? 'counter' : ES.act === 'shelf' && Math.abs(dy) > 0.6 ? 'stand' : ES.act;
    ede.lookAt = here && ede.act !== 'phone' ? lookE.set(px, 1.5, pz) : null; if (phoneE) phoneE.visible = ede.act === 'phone'; if (cloth) cloth.visible = ede.act === 'wipe'; ede.update(dt, t);
  }
  function kalleTick(dt, t, px, pz) {
    const inYard = px > YARD.x0 && px < YARD.x1 && pz > YARD.z0 && pz < YARD.z1; const near = !KS.blind && (inYard || Math.hypot(px - YARD.x0, pz - (YARD.gate0 + YARD.gate1) / 2) < 5); const d = Math.hypot(px - kalle.x, pz - kalle.z);
    if (near && KS.mode === 'fire') KS.mode = 'back';
    if (KS.mode === 'back') { if (walkTo(kalle, KALLE_AT.x, KALLE_AT.z, dt, 1.7)) { KS.mode = 'spot'; KS.t = 4; } }
    else if (KS.mode === 'fire') { if (walkTo(kalle, WARM.x, WARM.z, dt, 1.0)) { faceTo(kalle, FIRE.x, FIRE.z, dt, 4); kalle.act = 'warm'; KS.t -= dt; if (KS.t <= 0) KS.mode = 'back'; } }
    else { if (near) faceTo(kalle, px, pz, dt, 2.5); else faceTo(kalle, 35, (YARD.gate0 + YARD.gate1) / 2, dt, 1.5); KS.t -= dt;
      if (KS.t <= 0) { if (!near && r() < 0.4) { KS.mode = 'fire'; KS.t = 10 + r() * 10; } else { KS.act = ['arms', 'phone', 'look', 'arms', 'phone'][(r() * 5) | 0]; KS.t = 5 + r() * 6; } }
      kalle.act = near ? 'arms' : KS.act; }
    if (near && !KS.greeted && d < 5 && KS.mode === 'spot') { KS.greeted = true; KS.wave = 1.2; } if (!near) KS.greeted = false; if (KS.wave > 0 && KS.mode === 'spot') { KS.wave -= dt; kalle.act = 'wave'; }
    kalle.lookAt = near && d < 7 ? look.set(px, 1.5, pz) : kalle.act === 'look' ? look.set(35, 1.6 + Math.sin(t * 0.7) * 0.3, YARD.gate0 + Math.sin(t * 0.5) * 3) : null; if (phoneK) phoneK.visible = kalle.act === 'phone' && kalle.mode === 'stand'; kalle.update(dt, t);
  }
  function update(t, dt, px, pz) {
    const far = Math.hypot(px - 39, pz - (FZ + 6)) > 34; // weit weg (am Fenster, im Park): Figuren nicht rechnen
    const dd = Math.hypot(px - (S.door0 + S.door1) / 2, pz - FZ); doorA += ((dd < 1.7 ? 1.45 : 0) - doorA) * Math.min(1, dt * 5); door.rotation.y = -doorA;
    const ft = t * 1.0; flames.children.forEach((f) => { const p = f.userData.p; f.scale.set(0.85 + Math.sin(ft * 9 + p) * 0.12, 0.9 + Math.sin(ft * 13 + p) * 0.18 + Math.sin(ft * 5.3 + p) * 0.1, 1); }); flames.rotation.y += dt * 0.6;
    flick = 0.82 + Math.sin(t * 11) * 0.08 + Math.sin(t * 23.7) * 0.06 + Math.sin(t * 4.1) * 0.05; fireGlow.material.opacity = 0.45 * flick; if (fireLight) fireLight.intensity = fireLight.userData.i0 * (fireLight.userData.dayK ?? 1) * flick;
    if (lanternGlow) lanternGlow.material.opacity = 0.55 + Math.sin(t * 7) * 0.05; fan.rotation.z += dt * 9; laundry.children.forEach((c) => { if (c.userData.k !== undefined) c.rotation.x = Math.sin(t * 1.3 + c.userData.k) * 0.12; });
    const blink = (t % 11) > 10.85; offen.opacity = blink ? 0.25 : 1; offenG.material.opacity = blink ? 0.08 : 0.35;
    if (far) return;
    for (let i = 0; i < NSP; i++) { const s = spark[i]; s.t -= dt; if (s.t <= 0) { s.t = 0.8 + r() * 1.4; s.x = FIRE.x + (r() - 0.5) * 0.3; s.y = Y + 0.9; s.z = FIRE.z + (r() - 0.5) * 0.3; s.vx = (r() - 0.5) * 0.3; s.vz = (r() - 0.5) * 0.3; } s.y += dt * (0.9 + (i % 5) * 0.15); s.x += s.vx * dt; s.z += s.vz * dt; spPos[i * 3] = s.x; spPos[i * 3 + 1] = s.y; spPos[i * 3 + 2] = s.z; } spGeo.attributes.position.needsUpdate = true;
    edeTick(dt, t, px, pz); kalleTick(dt, t, px, pz);
    gast.lookAt = Math.hypot(px - gast.x, pz - gast.z) < 3.5 ? lookG.set(px, 1.5, pz) : null; gast.update(dt, t);
    catBody.scale.y = 0.07 + Math.sin(t * 2.2) * 0.004; tail.rotation.y = Math.sin(t * 1.7) * 0.25;
    if (inShop(px, pz) || Math.hypot(px - 40, pz - (FZ + 3)) < 6) { tvT2 += dt; if (tvT2 > 0.12) { tvT2 = 0; drawTv(tvC, t); tvT.needsUpdate = true; } }
    for (const P of pigeons) { const dpl = Math.hypot(px - P.g.position.x, pz - P.g.position.z);
      if (P.st === 'peck') { P.t += dt; P.head.rotation.x = Math.max(0, Math.sin(P.t * 5)) * 0.9; if ((P.t % 4) < dt) P.g.rotation.y += (r() - 0.5) * 1.6; if (dpl < 2.4) { P.st = 'fly'; P.t = 0; P.vy = 2.2; const a = Math.atan2(P.g.position.x - px, P.g.position.z - pz); P.dx = Math.sin(a) * 3; P.dz = Math.cos(a) * 3; P.g.rotation.y = a; } }
      else if (P.st === 'fly') { P.t += dt; P.g.position.x += P.dx * dt; P.g.position.z += P.dz * dt; P.g.position.y += P.vy * dt; P.wings.forEach((w, k) => { w.rotation.z = Math.sin(P.t * 28) * 0.9 * (k ? -1 : 1); }); if (P.t > 2.6) { P.st = 'gone'; P.g.visible = false; P.t = 0; } }
      else { P.t += dt; if (P.t > 14 && Math.hypot(px - P.home[0], pz - P.home[1]) > 7) { P.st = 'peck'; P.g.visible = true; P.g.position.set(P.home[0], Y + 0.03, P.home[1]); P.wings.forEach((w) => { w.rotation.z = 0; }); P.t = 0; } } }
  }
  return { ede, kalle, gast, door, update, bindLights: ({ fire }) => { fireLight = fire || null; if (fireLight && fireLight.userData.i0 === undefined) fireLight.userData.i0 = fireLight.intensity; }, doorAngle: () => doorA, state: () => ({ ede: ES.act, kalle: KS.mode === 'spot' ? KS.act : KS.mode }),
    force: { kalle: (mode, act, blind) => { KS.mode = mode; KS.t = 40; if (act) KS.act = act; KS.blind = !!blind; }, ede: (act) => { ES.act = act; ES.t = 40; } } }; // nur für Tests und Bilder
}
