// Theos Seitenscheidel - der Schrank-Hub (seit 2026-11-22): Theos Gamerzimmer bei Nacht mit dem alten Holzschrank.
// Der Türspalt sitzt seitlich: Er ist der Seitenscheitel, oben drauf liegt die Frisur. Hier stehen nur Raum und Möbel,
// die Spiele als Gegenstände baut schranksachen.js, Bett, Besuch, Trophäen und Wetter schrankleben.js, Ablauf, Maus und Kamera macht schrank.js.
// Maße in Metern: Rückwand z = 0, Boden y = 0, Schrankfront z = 0.6, rechts = +x.
import * as THREE from './vendor/three.module.min.js';
import { V3, TAU, clamp, lerp, smooth, rng, std, glowMat, mesh, rbox, tube, bake, canvasTex, glowSprite, envFrom, softTex } from './titelkit.js';

export const MARKER = "700 100px 'Segoe Print', 'Segoe UI', sans-serif"; // Filzstift auf Klebeband
const INNER = 0.956; // halbe Innenbreite
const GAP = -0.3; // der Seitenscheitel
export const FRONT = 0.6;
export const BEENDEN_X = -2.03; // Lichtschalter „Beenden“ (weiter links wäre er bei schmalen Fenstern aus dem Bild)
export const SCHULE_X = -1.85; // Schalter für den Schulmodus: wie ein Doppelschalter direkt rechts daneben, Schild oben drüber (weiter rechts verdeckt ihn die offene Tür)

// ---------------- Fächer ----------------
// Große Spiele auf Augenhöhe (zwei Reihen zu dritt), kleine unten (zwei Reihen zu fünft)
const ROWS = [
  { ids: ['bruno', 'ludwig', 'moon'], floor: 1.5, h: 0.525 },
  { ids: ['strom', 'ozean', 'casino'], floor: 0.97, h: 0.502 },
  { ids: ['race', 'park', 'chess', 'pong', 'ships'], floor: 0.69, h: 0.252 },
  { ids: ['raus', 'baron', 'kraft', 'saege', 'rv'], floor: 0.405, h: 0.257 },
];
// Schulmodus (Lennox, 2026-11-23): derselbe Schrank, andere Spiele. Unten quer: die Rangliste mit Theo, Ludi und Bruno auf dem Treppchen.
export const ROWS_SCHULE = [
  { ids: ['stapel', 'dino'], floor: 1.5, h: 0.525, big: true },
  { ids: ['chess', 'pong', 'ships'], floor: 0.97, h: 0.502, big: true },
  { ids: ['rang'], floor: 0.405, h: 0.545, big: true, wide: true },
];
export const slotsOf = (rows) => rows.flatMap((R, row) => R.ids.map((id, col) => {
  const step = (INNER * 2) / R.ids.length;
  return { id, row, col, big: R.big !== undefined ? R.big : R.ids.length === 3, wide: !!R.wide, bottom: R.floor < 0.45, x: -INNER + step * (col + 0.5), y: R.floor, w: step - 0.026, h: R.h };
}));
export const SLOTS = slotsOf(ROWS);
export const FACH = { // Farbe des Fachs und Schild am Brett
  bruno: [0xff6a2a, 'Big Bruno'], ludwig: [0xff9a4a, 'Ludwig'], moon: [0x7f9cff, 'Moonsweeper'],
  strom: [0xffd21a, 'Strom aus'], ozean: [0x2fb8e8, 'Ozean'], casino: [0xe8305a, "Teo's Casino"],
  race: [0xff4a3a, 'Rennen'], park: [0x58c890, 'Parken'], chess: [0xd9b46a, 'Dreierschach'], pong: [0x9a6aff, 'Pong'], ships: [0x4a90e8, 'Schiffe'],
  raus: [0xef5a4c, 'Raus mit dir!'], baron: [0x3fc47a, 'Besser als Monopoly'], kraft: [0xff8a2a, 'Kraftprobe'], saege: [0xc8a070, ''], rv: [0xff7ab8, 'Cooles Game'],
  stapel: [0x46e0d0, 'Stapelturm'], dino: [0x7ed957, 'Dino-Lauf'], rang: [0xffc34a, 'Rangliste'],
};

// ---------------- Gezeichnete Flächen ----------------
export function fitFont(c, text, max, size, font = MARKER) {
  let s = size;
  for (;;) { c.font = font.replace('100px', `${s}px`); if (s <= 12 || c.measureText(text).width <= max) return s; s -= 3; }
}
function roundRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
// Malerkrepp mit Filzstift
export function tapeTex(text, { w = 512, h = 112, bg = '#ead9a8', fg = '#2b2230' } = {}) {
  return canvasTex(w, h, (c) => {
    const r = rng(text.length * 37 + w);
    c.beginPath(); c.moveTo(14, 6); c.lineTo(w - 14, 3);
    for (let y = 3; y < h - 4; y += 9) c.lineTo(w - 4 - r() * 14, y);
    c.lineTo(w - 12, h - 4); c.lineTo(12, h - 7);
    for (let y = h - 7; y > 6; y -= 9) c.lineTo(4 + r() * 14, y);
    c.closePath(); c.fillStyle = bg; c.fill();
    c.save(); c.clip();
    for (let i = 0; i < 70; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(120,90,40,.07)'; c.fillRect(r() * w, 0, 1 + r() * 3, h); }
    c.restore();
    fitFont(c, text, w - 52, Math.round(h * 0.6));
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h * 0.52);
  });
}
function grain(c, w, h, [base, dark, light], across, seed) {
  const r = rng(seed); c.fillStyle = base; c.fillRect(0, 0, w, h);
  const long = across ? w : h; const short = across ? h : w;
  for (let i = 0; i < short * 0.9; i++) {
    const at = r() * short; const bend = (r() - 0.5) * 14; c.strokeStyle = r() < 0.62 ? dark : light; c.globalAlpha = 0.1 + r() * 0.22; c.lineWidth = 0.6 + r() * 2.6;
    c.beginPath();
    for (let k = 0; k <= 8; k++) { const l = k / 8 * long; const s = at + Math.sin(k * 0.8 + i) * bend * 0.3; if (across) c[k ? 'lineTo' : 'moveTo'](l, s); else c[k ? 'lineTo' : 'moveTo'](s, l); }
    c.stroke();
  }
  for (let i = 0; i < 4; i++) {
    const x = r() * w; const y = r() * h; c.strokeStyle = dark;
    for (let k = 1; k < 6; k++) { c.globalAlpha = 0.22; c.lineWidth = 1.6; c.beginPath(); c.ellipse(x, y, (across ? 7 : 3) * k, (across ? 3 : 7) * k, 0, 0, TAU); c.stroke(); }
  }
  c.globalAlpha = 1;
}
const OAK = ['#7c4b2b', '#3c2012', '#a9714a'];

// Aufkleber: nur Sachen aus den eigenen Spielen
const KLEBER = {
  startnummer(c) {
    c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(0, 0, 70, 0, TAU); c.fill();
    c.fillStyle = '#c8281c'; c.beginPath(); c.arc(0, 0, 59, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = "900 70px 'Segoe UI Black', sans-serif"; c.fillText('7', 0, 14);
    c.font = "700 26px 'Segoe UI', sans-serif"; c.fillText('THEO', 0, 43);
  },
  bruno(c) {
    c.fillStyle = '#15151a'; roundRect(c, -118, -40, 236, 80, 12); c.fill();
    c.fillStyle = '#f0bd52'; c.textAlign = 'center'; c.font = "900 29px 'Segoe UI Black', sans-serif"; c.fillText('BRUNO', 0, -3);
    c.font = "700 25px 'Segoe Print', sans-serif"; c.fillText('war hier', 0, 27);
  },
  zock(c) {
    c.fillStyle = '#fff6e6'; roundRect(c, -112, -56, 224, 112, 8); c.fill();
    c.fillStyle = '#26202a'; c.textAlign = 'center'; c.font = "900 33px 'Segoe UI Black', sans-serif"; c.fillText('Zockverbot', 0, -10);
    c.strokeStyle = '#e0322c'; c.lineWidth = 9; c.beginPath(); c.moveTo(-96, -6); c.lineTo(96, -34); c.stroke();
    c.fillStyle = '#e0322c'; c.font = "700 27px 'Segoe Print', sans-serif"; c.fillText('aufgehoben!', 0, 38);
  },
  blitz(c) {
    c.beginPath(); [[14, -84], [-42, 14], [-6, 14], [-20, 84], [44, -16], [8, -16], [28, -84]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    c.fillStyle = '#ffd21a'; c.fill(); c.lineWidth = 8; c.lineJoin = 'round'; c.strokeStyle = '#1b2430'; c.stroke();
  },
  mond(c) {
    c.fillStyle = '#1a2242'; c.beginPath(); c.arc(0, 0, 66, 0, TAU); c.fill();
    c.fillStyle = '#e4e4ee'; c.beginPath(); c.arc(0, 0, 47, 0, TAU); c.fill();
    c.fillStyle = '#b2b3c6'; for (const [x, y, r] of [[-15, -14, 11], [17, 8, 14], [-12, 22, 7], [20, -22, 5]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  },
  welle(c) {
    c.fillStyle = '#1672c8'; roundRect(c, -96, -54, 192, 108, 54); c.fill();
    c.strokeStyle = '#d8f2ff'; c.lineWidth = 9; c.lineCap = 'round';
    for (const y of [-14, 18]) { c.beginPath(); c.moveTo(-60, y); for (let i = 0; i < 4; i++) c.quadraticCurveTo(-45 + i * 30, y + (i % 2 ? 22 : -22), -30 + i * 30, y); c.stroke(); }
  },
  flagge(c) {
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#17181b' : '#f4f2ea'; c.fillRect(-84 + i * 28, -56 + j * 28, 28, 28); }
  },
  packung(c) {
    c.fillStyle = '#b8221c'; roundRect(c, -62, -82, 124, 164, 10); c.fill(); c.fillStyle = '#f7efdc'; c.fillRect(-62, -10, 124, 52);
    c.textAlign = 'center'; c.fillStyle = '#f7efdc'; c.font = "700 27px Georgia, serif"; c.fillText('Ludwig', 0, -36);
    c.fillStyle = '#7a1612'; c.font = "italic 700 24px Georgia, serif"; c.fillText('Zigaretti', 0, 24);
  },
  wuerfel(c) {
    c.fillStyle = '#f8f5ec'; roundRect(c, -48, -48, 96, 96, 18); c.fill(); c.fillStyle = '#25232a';
    for (const [x, y] of [[-23, -23], [23, -23], [0, 0], [-23, 23], [23, 23]]) { c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); }
  },
  krone(c) {
    c.beginPath(); [[-62, 40], [-70, -36], [-30, -2], [0, -56], [30, -2], [70, -36], [62, 40]].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    c.fillStyle = '#f2c14e'; c.fill(); c.lineWidth = 7; c.strokeStyle = '#7a4c08'; c.stroke();
  },
  jeton(c) {
    c.fillStyle = '#c21f45'; c.beginPath(); c.arc(0, 0, 58, 0, TAU); c.fill();
    c.strokeStyle = '#fff'; c.lineWidth = 12; c.setLineDash([20, 20]); c.beginPath(); c.arc(0, 0, 50, 0, TAU); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.font = "italic 700 30px Georgia, serif"; c.fillText("Teo's", 0, 11);
  },
  finger(c) {
    c.fillStyle = '#ead9a8'; c.fillRect(-120, -36, 240, 72);
    c.fillStyle = '#2b2230'; c.textAlign = 'center'; c.font = "700 35px 'Segoe Print', sans-serif"; c.fillText('Finger weg!', 0, 13);
  },
};
function doorOutside(side, W) {
  const H = 1200; const px = Math.round(H * W / 1.63);
  return canvasTex(px, H, (c, w, h) => {
    grain(c, w, h, OAK, false, side < 0 ? 11 : 29);
    c.strokeStyle = 'rgba(20,8,4,.55)'; c.lineWidth = 10; c.strokeRect(w * 0.1, h * 0.05, w * 0.8, h * 0.9);
    c.strokeStyle = 'rgba(255,220,180,.16)'; c.lineWidth = 4; c.strokeRect(w * 0.1 + 9, h * 0.05 + 9, w * 0.8 - 18, h * 0.9 - 18);
    const list = side < 0
      ? [['startnummer', 0.42, 0.17, -0.18, 1.15], ['finger', 0.46, 0.34, 0.07, 0.95], ['welle', 0.4, 0.49, -0.2, 0.9], ['blitz', 0.5, 0.67, 0.25, 0.95], ['wuerfel', 0.36, 0.84, -0.35, 0.8], ['krone', 0.7, 0.87, 0.2, 0.55]]
      : [['zock', 0.4, 0.16, -0.1, 1.2], ['mond', 0.79, 0.12, 0.2, 1], ['bruno', 0.62, 0.31, 0.12, 1.15], ['packung', 0.82, 0.48, -0.16, 1.05], ['flagge', 0.4, 0.5, 0.08, 1], ['jeton', 0.6, 0.67, 0.3, 1.05], ['blitz', 0.3, 0.82, -0.3, 0.6], ['startnummer', 0.82, 0.86, 0.14, 0.72]];
    for (const [kind, x, y, rot, s] of list) {
      c.save(); c.translate(x * w, y * h); c.rotate(rot); c.scale(s, s); c.shadowColor = 'rgba(0,0,0,.4)'; c.shadowBlur = 4; c.shadowOffsetY = 2;
      KLEBER[kind](c); c.restore();
    }
    const r = rng(side < 0 ? 5 : 8); // Kratzer
    for (let i = 0; i < 26; i++) { const x = r() * w; const y = r() * h; c.strokeStyle = 'rgba(235,190,150,.18)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 60); c.stroke(); }
  });
}
function doorInside(side, W) {
  const H = 1000; const px = Math.round(H * W / 1.63);
  return canvasTex(px, H, (c, w, h) => {
    grain(c, w, h, ['#6b4027', '#341b10', '#93603c'], false, side < 0 ? 31 : 37);
    const paper = (x, y, pw, ph, rot, draw) => { c.save(); c.translate(x * w, y * h); c.rotate(rot); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 10; draw(pw, ph); c.restore(); };
    if (side < 0) {
      paper(0.5, 0.24, w * 0.74, 250, -0.05, (pw, ph) => {
        c.fillStyle = '#f2ead6'; c.fillRect(-pw / 2, -ph / 2, pw, ph); c.shadowBlur = 0; c.fillStyle = '#2b2230'; c.textAlign = 'left';
        c.font = "700 33px 'Segoe Print', sans-serif";
        ['To-do:', 'Mond putzen', 'Ozean leeren', 'Erde retten', 'Mathe'].forEach((t, i) => c.fillText(t, -pw / 2 + 18, -ph / 2 + 48 + i * 45));
        c.strokeStyle = '#d0342c'; c.lineWidth = 4; c.beginPath(); c.moveTo(-pw / 2 + 14, ph / 2 - 30); c.lineTo(-pw / 2 + 112, ph / 2 - 36); c.stroke();
      });
      c.strokeStyle = 'rgba(245,225,200,.7)'; c.fillStyle = 'rgba(245,225,200,.8)'; c.lineWidth = 3; c.font = "700 24px 'Segoe Print', sans-serif"; c.textAlign = 'left';
      [['Theo 6', 0.86], ['Theo 9', 0.75], ['Theo 12', 0.63], ['Theo 15', 0.5]].forEach(([t, y]) => { c.beginPath(); c.moveTo(w * 0.1, y * h); c.lineTo(w * 0.4, y * h); c.stroke(); c.fillText(t, w * 0.44, y * h + 8); });
    } else {
      paper(0.5, 0.27, w * 0.66, 360, 0.04, (pw, ph) => { // Plakat Big Bruno: ein Felsbrocken mit Feuerschweif
        c.fillStyle = '#0b1028'; c.fillRect(-pw / 2, -ph / 2, pw, ph); c.shadowBlur = 0; const r = rng(12); c.fillStyle = '#fff';
        for (let i = 0; i < 80; i++) c.fillRect((r() - 0.5) * pw, (r() - 0.5) * ph, 2, 2);
        const tail = c.createLinearGradient(-170, -165, 0, -25); tail.addColorStop(0, 'rgba(255,120,20,0)'); tail.addColorStop(1, '#ff7a1a');
        c.fillStyle = tail; c.beginPath(); c.moveTo(-pw / 2 + 4, -ph / 2 + 4); c.lineTo(66, -84); c.lineTo(-76, 36); c.closePath(); c.fill();
        const rock = []; for (let i = 0; i < 17; i++) { const a = i / 17 * TAU; const d = 78 + r() * 22; rock.push([Math.cos(a) * d, -22 + Math.sin(a) * d * 0.9]); }
        c.fillStyle = '#7b7a7c'; c.beginPath(); rock.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
        c.fillStyle = '#58575c'; for (const [x, y, s] of [[-58, 8, 17], [56, -2, 13], [8, -78, 15], [62, -56, 8], [-30, 42, 9]]) { c.beginPath(); c.ellipse(x, y, s * 1.2, s, 0.3, 0, TAU); c.fill(); }
        c.fillStyle = '#ffb021'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 10, -28); c.lineTo(s * 58, -48); c.lineTo(s * 44, -22); c.closePath(); c.fill(); }
        c.fillStyle = '#2a1c18'; c.beginPath(); c.moveTo(-50, 8);
        for (let i = 0; i <= 8; i++) c.lineTo(-50 + i * 12.5, i % 2 ? 22 : 8);
        c.lineTo(28, 44); c.lineTo(-28, 44); c.closePath(); c.fill();
        c.textAlign = 'center'; c.fillStyle = '#f0bd52'; c.font = "900 42px 'Segoe UI Black', sans-serif"; c.fillText('BIG BRUNO', 0, ph / 2 - 52);
        c.fillStyle = '#fff'; c.font = "700 22px 'Segoe UI', sans-serif"; c.fillText('kommt auf die Erde', 0, ph / 2 - 20);
      });
      paper(0.42, 0.68, w * 0.5, 190, -0.07, (pw, ph) => {
        c.fillStyle = '#ffe27a'; c.fillRect(-pw / 2, -ph / 2, pw, ph); c.shadowBlur = 0; c.fillStyle = '#3a2a10'; c.textAlign = 'center'; c.font = "700 34px 'Segoe Print', sans-serif";
        c.fillText('Nur noch', 0, -22); c.fillText('eine Runde.', 0, 28);
      });
      c.save(); c.translate(w * 0.78, h * 0.82); c.rotate(0.2); KLEBER.mond(c); c.restore();
    }
  });
}

// ---------------- Formen ----------------
function strand(points, R, mat, parent) { // Haarsträhne: in der Mitte dick, außen spitz
  const curve = new THREE.CatmullRomCurve3(points.map((p) => V3(p[0], p[1], p[2])));
  const N = 34; const M = 8; const g = new THREE.TubeGeometry(curve, N, 1, M, false); const p = g.attributes.position; const c = V3();
  for (let i = 0; i <= N; i++) {
    const t = i / N; curve.getPointAt(t, c); const r = R * (0.12 + 0.88 * Math.pow(Math.sin(Math.PI * clamp(t * 0.86 + 0.06, 0, 1)), 0.6));
    for (let j = 0; j <= M; j++) { const k = i * (M + 1) + j; p.setXYZ(k, c.x + (p.getX(k) - c.x) * r, c.y + (p.getY(k) - c.y) * r, c.z + (p.getZ(k) - c.z) * r); }
  }
  g.computeBoundingSphere(); g.computeBoundingBox(); return mesh(g, mat, parent);
}
function hitBox(parent, w, h, d, pos, id) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial()); m.visible = false; m.userData.keep = true; m.userData.hit = id;
  m.position.set(pos[0], pos[1], pos[2]); parent.add(m); return m;
}
const keep = (o) => { o.userData.keep = true; return o; };
function decal(tex, w, h, parent, pos, rot = null, o = {}) {
  const m = mesh(new THREE.PlaneGeometry(w, h), std({ map: tex, alphaTest: 0.4, roughness: 0.85, ...o }), parent, pos, rot); m.castShadow = false; return m;
}

// ---------------- Zimmer ----------------
export function buildZimmer({ renderer, shadows = true, low = false, schule = false }) {
  const rows = schule ? ROWS_SCHULE : ROWS; const slots = schule ? slotsOf(ROWS_SCHULE) : SLOTS;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070910);
  scene.environment = envFrom(renderer, {
    top: 0x232a48, low: 0x2c2230, bottom: 0x120d10,
    lamps: [{ dir: V3(0.4, 1, 0.8), color: 0xffd2a0, k: 3, size: 7 }, { dir: V3(0, 0.5, -1), color: 0xff4f9a, k: 2, size: 6 }, { dir: V3(1, 0, 0.1), color: 0x46e0d0, k: 1.5, size: 5 }],
  });
  scene.environmentIntensity = 0.5;

  const room = new THREE.Group(); scene.add(room);
  const still = new THREE.Group(); room.add(still); // alles, was sich nie bewegt
  const oakV = std({ map: canvasTex(384, 768, (c, w, h) => grain(c, w, h, OAK, false, 3)), roughness: 0.6 });
  const oakH = std({ map: canvasTex(768, 192, (c, w, h) => grain(c, w, h, OAK, true, 4)), roughness: 0.6 });
  const inside = std({ map: canvasTex(384, 384, (c, w, h) => grain(c, w, h, ['#4a2c1e', '#24120c', '#6a412c'], false, 9)), roughness: 0.85 });
  const brass = std({ color: 0xd2a354, metalness: 0.85, roughness: 0.28 });
  const dark = std({ color: 0x16181f, roughness: 0.5 });

  // Wände und Boden
  const wall = std({ map: canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#29304f'; c.fillRect(0, 0, w, h); c.fillStyle = '#242a47'; for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 15, h); }, { repeat: [7, 3] }), roughness: 0.95 });
  mesh(new THREE.PlaneGeometry(10, 5), wall, still, [0, 2.5, 0]);
  for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(8, 5), wall, still, [s * 3.75, 2.5, 4], [0, -s * Math.PI / 2, 0]);
  const planks = canvasTex(1024, 1024, (c, w, h) => {
    const r = rng(17);
    for (let i = 0; i < 10; i++) {
      c.save(); c.translate(0, i * h / 10); c.beginPath(); c.rect(0, 0, w, h / 10); c.clip();
      grain(c, w, h / 10, [['#4a3022', '#523627', '#422a1e', '#58392a'][i % 4], '#22120c', '#6e4a36'], true, 40 + i);
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(0, 0, w, 3); c.fillRect(r() * w, 0, 3, h / 10); c.restore();
    }
  }, { repeat: [3, 3] });
  mesh(new THREE.PlaneGeometry(10, 9), std({ map: planks, roughness: 0.55 }), still, [0, 0, 4.2], [-Math.PI / 2, 0, 0]);
  mesh(rbox(7.6, 0.1, 0.03, 0.008, 1), dark, still, [0, 0.05, 0.015]);
  const rug = canvasTex(512, 512, (c, w) => { [['#202748', 1], ['#ff4f9a', 0.86], ['#202748', 0.82], ['#46d8c8', 0.6], ['#2b3359', 0.56]].forEach(([col, k]) => { c.fillStyle = col; c.beginPath(); c.arc(w / 2, w / 2, w / 2 * k, 0, TAU); c.fill(); }); });
  mesh(new THREE.CircleGeometry(1.25, 48), std({ map: rug, roughness: 1 }), still, [0.1, 0.006, 2.2], [-Math.PI / 2, 0, 0]);

  // Schrank: Korpus, Böden, Füße
  for (const s of [-1, 1]) {
    mesh(rbox(0.044, 2.02, 0.54, 0.01, 2), oakV, still, [s * 0.978, 1.05, 0.31]);
    mesh(rbox(0.14, 0.07, 0.14, 0.025, 2), oakH, still, [s * 0.9, 0.035, 0.5]);
  }
  mesh(new THREE.PlaneGeometry(1.92, 2.0), inside, still, [0, 1.05, 0.035]);
  mesh(rbox(2.04, 0.06, 0.58, 0.015, 2), oakH, still, [0, 2.06, 0.31]);
  mesh(rbox(1.94, 0.07, 0.54, 0.01, 2), oakH, still, [0, 0.37, 0.31]);
  mesh(rbox(1.94, 0.05, 0.5, 0.01, 2), dark, still, [0, 0.06, 0.29]);
  for (const R of rows) if (R.floor > 0.45) mesh(rbox(1.915, 0.028, 0.515, 0.006, 1), oakH, still, [0, R.floor - 0.014, 0.295]); // der unterste steht auf dem Schrankboden
  for (const R of rows) {
    const n = R.ids.length;
    for (let i = 1; i < n; i++) mesh(rbox(n === 3 ? 0.022 : 0.014, R.h - 0.004, 0.46, 0.004, 1), oakV, still, [-INNER + i * INNER * 2 / n, R.floor + R.h / 2, 0.27]);
  }

  // Frisur: zwei Schwünge, dazwischen genau über dem Türspalt der Scheitel
  const hairM = [std({ color: 0x2b1911, roughness: 0.5 }), std({ color: 0x6b4128, roughness: 0.42 }), std({ color: 0x48291a, roughness: 0.38 }), std({ color: 0x86542f, roughness: 0.45 })];
  const dome = new THREE.SphereGeometry(1, 28, 10, 0, TAU, 0, Math.PI / 2);
  mesh(dome, hairM[0], still, [0.37, 2.085, 0.3], null, [0.72, 0.22, 0.27]); mesh(dome, hairM[0], still, [-0.67, 2.085, 0.3], null, [0.4, 0.15, 0.27]);
  mesh(rbox(0.034, 0.13, 0.4, 0.014, 2), std({ color: 0xd9a77c, roughness: 0.7 }), still, [GAP, 2.12, 0.36]); // die Kopfhaut im Scheitel
  const hr = rng(13);
  for (const side of [1, -1]) {
    (side > 0 ? [13, 9, 6] : [8, 6, 4]).forEach((n, layer) => {
      for (let k = 0; k < n; k++) {
        const a = k / (n - 1); const j = hr(); const z = 0.585 - layer * 0.16 + (j - 0.5) * 0.04;
        const far = k % 3 === 0 || layer > 0; // lange Strähnen hängen über die Ecke, kurze enden als Locke auf der Blende
        const span = side > 0 ? 1.42 : 0.83; const reach = far ? span : span * (0.58 + 0.34 * hr());
        const x = (f) => GAP + side * (0.025 + reach * f); const arch = (side > 0 ? 0.24 : 0.15) * (0.45 + 0.55 * a);
        const pts = [
          [x(0), 2.1 + 0.03 * a, z - 0.07],
          [x(0.12), 2.15 + arch * 0.75, z],
          [x(0.32 + 0.06 * j), 2.15 + arch + (j - 0.5) * 0.04, z + 0.03],
          [x(0.64), 2.12 + arch * 0.72 + (hr() - 0.5) * 0.05, z + 0.03],
          [x(0.9), 2.09 + arch * 0.25, z + 0.04],
          far ? [x(1), 1.99 - j * 0.1, z - 0.07] : [x(0.99), 2.082, z + 0.055],
        ];
        if (!far) pts.push([x(1.04), 2.125, z + 0.06], [x(0.99), 2.14, z + 0.04]);
        strand(pts, 0.03 + hr() * 0.026, hairM[(k + layer + (j > 0.7 ? 1 : 0)) % 4], still);
      }
    });
  }
  for (let k = 0; k < 6; k++) { // Tolle direkt am Scheitel
    const q = k / 5;
    strand([[GAP + 0.03, 2.12, 0.5], [-0.28 + 0.07 * q, 2.28 + 0.05 * q, 0.6], [-0.06 + 0.07 * q, 2.39 + 0.05 * q, 0.64], [0.2 + 0.12 * q, 2.35 + 0.02 * q, 0.65], [0.3 + 0.14 * q, 2.24, 0.67], [0.25 + 0.14 * q, 2.21, 0.64]], 0.04, hairM[1 + (k % 3)], still);
  }

  // Fächer: farbig beleuchtete Rückwand, Leuchtleiste, Schild
  const shine = canvasTex(160, 128, (c, w, h) => { const g = c.createRadialGradient(w / 2, h * 0.3, 2, w / 2, h * 0.42, w * 0.7); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#777777'); g.addColorStop(1, '#151515'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const cubbies = {};
  for (const S of slots) {
    const [color, name] = FACH[S.id]; const col = new THREE.Color(color);
    const backM = new THREE.MeshBasicMaterial({ map: shine, color: col.clone().multiplyScalar(0.34) });
    const stripM = new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(1.2) });
    const back = keep(mesh(new THREE.PlaneGeometry(S.w, S.h - 0.006), backM, room, [S.x, S.y + S.h / 2, 0.044])); back.castShadow = false;
    const strip = keep(mesh(new THREE.BoxGeometry(S.w * 0.84, 0.007, 0.012), stripM, room, [S.x, S.y + S.h - 0.006, 0.5])); strip.castShadow = false;
    let tagM = null; let tag = null;
    if (name) {
      tagM = std({ map: tapeTex(name, S.big ? {} : { w: name.length > 15 ? 530 : 420, h: 94 }), alphaTest: 0.4, roughness: 0.85, emissive: 0x3a3020 });
      const long = name.length > 15;
      tag = keep(mesh(new THREE.PlaneGeometry(S.big ? 0.32 : long ? 0.345 : 0.275, S.big ? 0.07 : 0.061), tagM, room, [S.x, S.y - 0.024, S.bottom ? 0.585 : 0.556], [0, 0, (S.col % 2 ? 1 : -1) * 0.012]));
      tag.castShadow = false;
    }
    const ring = keep(glowSprite(room, color, Math.max(S.w, S.h) * 1.25, [S.x, S.y + S.h / 2, 0.57], 0)); ring.visible = false;
    cubbies[S.id] = { ...S, col3: col, backM, stripM, tagM, tag, ring, hit: hitBox(room, S.w + 0.01, S.h, 0.5, [S.x, S.y + S.h / 2, 0.32], `spiel:${S.id}`) };
  }

  // Schublade: Einstellungen
  const drawer = new THREE.Group(); drawer.position.set(0, 0.2, 0); room.add(drawer);
  { const g = new THREE.Group(); drawer.add(g);
    mesh(rbox(1.905, 0.262, 0.03, 0.012, 2), oakH, g, [0, 0, 0.585]);
    mesh(rbox(1.8, 0.015, 0.5, 0.004, 1), inside, g, [0, -0.11, 0.33]);
    for (const s of [-1, 1]) mesh(rbox(0.015, 0.16, 0.5, 0.004, 1), inside, g, [s * 0.9, -0.03, 0.33]);
    mesh(rbox(0.46, 0.022, 0.022, 0.01, 2), brass, g, [0.5, 0.03, 0.645]); for (const s of [-1, 1]) mesh(rbox(0.022, 0.022, 0.05, 0.008, 1), brass, g, [0.5 + s * 0.2, 0.03, 0.62]);
    decal(tapeTex('Einstellungen'), 0.4, 0.09, g, [-0.42, 0.005, 0.603], [0, 0, 0.025], { emissive: 0x2a2418 });
    // Krimskrams: Controller, Schraubendreher, Kabel
    const pad = std({ color: 0x2c2f3a, roughness: 0.4 });
    mesh(rbox(0.22, 0.05, 0.13, 0.025, 3), pad, g, [-0.3, -0.06, 0.4], [0, 0.3, 0]);
    for (const [x, c] of [[-0.26, 0xff4f9a], [-0.23, 0x46e0d0]]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 10), std({ color: c }), g, [x, -0.03, 0.39]);
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 8).rotateZ(Math.PI / 2), brass, g, [0.25, -0.08, 0.36], [0, 0.5, 0]); mesh(rbox(0.1, 0.035, 0.035, 0.012, 2), std({ color: 0xd8342c }), g, [0.12, -0.08, 0.43], [0, 0.5, 0]);
    tube([[0.4, -0.09, 0.4], [0.55, -0.08, 0.3], [0.65, -0.09, 0.45], [0.78, -0.07, 0.32], [0.7, -0.08, 0.25]], 0.006, dark, g);
    bake(g);
  }
  const drawerHit = hitBox(drawer, 1.9, 0.27, 0.12, [0, 0, 0.6], 'schublade');

  // Türen: jede einzeln, ungleich breit
  const doors = [];
  for (const side of [-1, 1]) {
    const w = side < 0 ? 0.7 : 1.3; const pivot = new THREE.Group(); pivot.position.set(side * 1.0, 0, 0.585); room.add(pivot);
    const g = new THREE.Group(); pivot.add(g); const cx = -side * w / 2; const dw = w - 0.008; const y = 1.218; const h = 1.648;
    mesh(rbox(dw, h, 0.034, 0.01, 2), oakV, g, [cx, y, 0.017]);
    mesh(new THREE.PlaneGeometry(dw - 0.02, h - 0.02), std({ map: doorOutside(side, w), roughness: 0.55 }), g, [cx, y, 0.0352]);
    mesh(new THREE.PlaneGeometry(dw - 0.02, h - 0.02), std({ map: doorInside(side, w), roughness: 0.7 }), g, [cx, y, -0.0012], [0, Math.PI, 0]);
    for (const yy of [0.62, 1.82]) mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.11, 12), brass, g, [0, yy, 0.032]); // Scharniere
    const hx = -side * (w - 0.07); // Klinke
    mesh(rbox(0.058, 0.27, 0.012, 0.005, 2), brass, g, [hx, 1.21, 0.041]);
    mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.2, 14), brass, g, [hx, 1.21, 0.096]);
    for (const dy of [-0.075, 0.075]) mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.06, 10).rotateX(Math.PI / 2), brass, g, [hx, 1.21 + dy, 0.066]);
    bake(g);
    const glow = keep(glowSprite(pivot, 0xffd08a, 0.34, [hx, 1.21, 0.12], 0.4));
    const handle = hitBox(pivot, 0.31, 0.5, 0.2, [side < 0 ? hx - 0.1 : hx + 0.1, 1.21, 0.1], side < 0 ? 'klinke:L' : 'klinke:R');
    const panel = hitBox(pivot, dw, h, 0.05, [cx, y, 0.017], side < 0 ? 'tuer:L' : 'tuer:R');
    doors.push({ side, w, pivot, glow, handle, panel, grip: V3(hx, 1.21, 0.12), max: side < 0 ? 2.02 : 1.9 });
  }

  // Licht aus dem Spalt: zeigt, wo es losgeht
  const slitM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc37a).multiplyScalar(1.6), transparent: true, depthWrite: false });
  const slit = keep(mesh(new THREE.PlaneGeometry(0.009, 1.79), slitM, room, [GAP, 1.295, 0.624]));
  const spillM = new THREE.MeshBasicMaterial({ map: softTex(), color: 0xffb45a, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
  const slitGlow = keep(mesh(new THREE.PlaneGeometry(0.16, 2.2), spillM, room, [GAP, 1.3, 0.626]));
  const spill = keep(mesh(new THREE.PlaneGeometry(0.5, 1.3), spillM, room, [GAP, 0.012, 0.95], [-Math.PI / 2, 0, 0]));
  for (const m of [slit, slitGlow, spill]) { m.castShadow = false; m.receiveShadow = false; }

  // Neonschrift
  const neonTon = (farbe) => { // ohne Farbe das Pink von Anfang an, sonst die Wahl aus „Zimmer gestalten“
    if (farbe === null) return { schein: '#ff2f88', rand: '#ff5c9e', hell: '#ff9cc6', kern: '#ffe6f1' };
    const f = new THREE.Color(farbe); const misch = (zu, k) => f.clone().lerp(new THREE.Color(zu), k).getStyle();
    return { schein: misch(0x000000, 0.12), rand: f.getStyle(), hell: misch(0xffffff, 0.4), kern: misch(0xffffff, 0.86) };
  };
  const neonBild = (farbe) => canvasTex(2048, 420, (c, w, h) => {
    const text = 'Theos Seitenscheidel'; const font = "700 100px 'Segoe Script', 'Segoe Print', cursive"; const ton = neonTon(farbe);
    fitFont(c, text, w - 170, 210, font); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.shadowColor = ton.schein;
    for (const [blur, width, alpha] of [[70, 12, 0.8], [36, 9, 0.9], [14, 7, 1]]) { c.shadowBlur = blur; c.lineWidth = width; c.globalAlpha = alpha; c.strokeStyle = ton.rand; c.strokeText(text, w / 2, h * 0.5); }
    c.shadowBlur = 6; c.shadowColor = ton.hell; c.fillStyle = ton.kern; c.globalAlpha = 1; c.fillText(text, w / 2, h * 0.5);
  });
  const neonM = new THREE.MeshBasicMaterial({ map: neonBild(null), transparent: true, depthWrite: false, toneMapped: false });
  const neon = keep(mesh(new THREE.PlaneGeometry(2.5, 0.512), neonM, room, [-0.02, 2.71, 0.02])); neon.receiveShadow = false;
  const neonHalo = keep(glowSprite(room, 0xff3f92, 1, [-0.02, 2.71, 0.05], 0.13)); neonHalo.scale.set(3.4, 1.1, 1);

  // Fenster: die Scheibe malt schrankleben.js (echte Tageszeit)
  const pane = keep(mesh(new THREE.PlaneGeometry(0.7, 0.92), new THREE.MeshBasicMaterial({ color: 0xffffff }), room, [-2.6, 1.78, 0.02])); pane.castShadow = false;
  const frame = std({ color: 0xd8d2c8, roughness: 0.5 });
  for (const x of [-0.37, 0, 0.37]) mesh(rbox(x ? 0.05 : 0.028, 1.0, 0.05, 0.008, 1), frame, still, [-2.6 + x, 1.78, 0.04]);
  for (const y of [-0.48, 0.03, 0.48]) mesh(rbox(0.79, Math.abs(y) > 0.1 ? 0.05 : 0.026, 0.05, 0.008, 1), frame, still, [-2.6, 1.78 + y, 0.04]);
  mesh(rbox(0.88, 0.035, 0.15, 0.01, 1), frame, still, [-2.6, 1.28, 0.08]);
  const cloth = std({ color: 0x6a3a78, roughness: 0.95 });
  for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.35, 10), cloth, still, [-3.2 + i * 0.075, 1.72, 0.11 + (i % 2) * 0.025]);


  // Schreibtisch rechts: Monitor, PC, Headset
  mesh(rbox(1.5, 0.045, 0.72, 0.012, 2), dark, still, [2.65, 0.76, 0.4]);
  for (const x of [1.95, 3.35]) mesh(rbox(0.06, 0.74, 0.62, 0.01, 1), dark, still, [x, 0.37, 0.4]);
  mesh(new THREE.BoxGeometry(1.44, 0.012, 0.012), glowMat(0x46e0d0, 1.3), still, [2.65, 0.733, 0.755]).castShadow = false;
  const screenTex = canvasTex(512, 300, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#1b1450'); g.addColorStop(1, '#0b4a5a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#ff5c9e'; c.fillRect(30, h * 0.3, 14, 80); c.fillStyle = '#46e0d0'; c.fillRect(w - 44, h * 0.5, 14, 80); c.fillStyle = '#fff'; c.fillRect(w * 0.6, h * 0.36, 16, 16);
    c.textAlign = 'center'; c.font = "900 54px 'Segoe UI Black', sans-serif"; c.fillText(schule ? 'PAUSE!' : 'ZOCKEN?', w / 2, h * 0.2);
    c.font = "700 24px 'Segoe UI', sans-serif"; c.fillText(schule ? 'Schnell eine Runde.' : 'Ab in den Schrank.', w / 2, h * 0.92);
  });
  mesh(rbox(0.68, 0.42, 0.03, 0.012, 2), dark, still, [2.56, 1.15, 0.22], [0, -0.22, 0]);
  mesh(new THREE.PlaneGeometry(0.64, 0.375), new THREE.MeshBasicMaterial({ map: screenTex, color: 0xd8d8d8 }), still, [2.556, 1.152, 0.237], [0, -0.22, 0]).castShadow = false;
  mesh(rbox(0.07, 0.17, 0.05, 0.01, 1), dark, still, [2.58, 0.87, 0.18]); mesh(rbox(0.26, 0.02, 0.17, 0.008, 1), dark, still, [2.58, 0.793, 0.22]);
  mesh(rbox(0.48, 0.025, 0.16, 0.01, 2), dark, still, [2.5, 0.795, 0.55], [0, -0.08, 0]);
  const keyM = glowMat(0x46e0d0, 0.75);
  for (let i = 0; i < 11; i++) for (let j = 0; j < 3; j++) mesh(new THREE.BoxGeometry(0.026, 0.004, 0.026), (i + j) % 4 ? std({ color: 0x343a48 }) : keyM, still, [2.31 + i * 0.037, 0.81, 0.5 + j * 0.042], [0, -0.08, 0]).castShadow = false;
  mesh(rbox(0.24, 0.5, 0.48, 0.015, 2), dark, still, [3.15, 1.035, 0.34]);
  for (const y of [0.91, 1.15]) { mesh(new THREE.TorusGeometry(0.075, 0.009, 8, 22), glowMat(0xff4f9a, 1.2), still, [3.15, y, 0.585]).castShadow = false; mesh(new THREE.CircleGeometry(0.066, 16), std({ color: 0x07080c, roughness: 0.2 }), still, [3.15, y, 0.584]); }
  const phones = std({ color: 0x23262f, roughness: 0.4 }); mesh(new THREE.TorusGeometry(0.11, 0.014, 8, 20, Math.PI), phones, still, [3.13, 1.35, 0.36], [0, 0.5, 0]); // liegt auf dem PC, vorn steht das Radio
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16).rotateZ(Math.PI / 2), phones, still, [3.13 + s * 0.098, 1.335, 0.36 - s * 0.053], [0, 0.5, 0]);
  mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.125, 16), std({ color: 0x3fc47a, metalness: 0.5, roughness: 0.3 }), still, [2.88, 0.845, 0.62]);

  // Unordnung am Boden
  const card = std({ color: 0xb98a58, roughness: 0.85 });
  mesh(rbox(0.36, 0.04, 0.36, 0.008, 1), card, still, [-1.5, 0.02, 1.95], [0, 0.4, 0]);
  decal(canvasTex(256, 256, (c, w) => { c.fillStyle = '#c99b66'; c.fillRect(0, 0, w, w); c.fillStyle = '#c8372c'; c.beginPath(); c.arc(w / 2, w / 2, 74, 0, TAU); c.fill(); c.fillStyle = '#ffd98a'; c.font = "900 44px 'Segoe UI Black', sans-serif"; c.textAlign = 'center'; c.fillText('PIZZA', w / 2, w / 2 + 16); }), 0.34, 0.34, still, [-1.5, 0.0415, 1.95], [-Math.PI / 2, 0, 0.4]);
  const shoe = std({ color: 0xe8e4dc, roughness: 0.7 }); const sole = std({ color: 0xc8372c, roughness: 0.7 });
  for (const [x, z, r] of [[-1.16, 1.36, 0.5], [-1.34, 1.48, 1.0]]) { mesh(rbox(0.12, 0.08, 0.28, 0.04, 2), shoe, still, [x, 0.07, z], [0, r, 0]); mesh(rbox(0.126, 0.03, 0.29, 0.012, 1), sole, still, [x, 0.022, z], [0, r, 0]); }

  // Lichtschalter: Beenden
  mesh(rbox(0.14, 0.2, 0.02, 0.012, 2), frame, still, [BEENDEN_X, 1.34, 0.012]);
  const rocker = keep(new THREE.Group()); rocker.position.set(BEENDEN_X, 1.34, 0.024); rocker.rotation.x = -0.2; room.add(rocker);
  mesh(rbox(0.075, 0.115, 0.022, 0.01, 2), std({ color: 0xfaf6ee, roughness: 0.3 }), rocker);
  mesh(new THREE.BoxGeometry(0.018, 0.006, 0.004), glowMat(0xff8a3a, 1.4), rocker, [0, -0.035, 0.013]).castShadow = false;
  decal(tapeTex('Beenden', { w: 360 }), 0.36, 0.11, still, [BEENDEN_X, 1.15, 0.012], [0, 0, -0.03], { emissive: 0x3a3020 });
  const switchHit = hitBox(room, 0.18, 0.42, 0.12, [BEENDEN_X, 1.25, 0.06], 'schalter');
  // Daneben der Schalter für den Schulmodus (2026-11-23): im Schulmodus steht „Zurück“ drauf
  mesh(rbox(0.14, 0.2, 0.02, 0.012, 2), frame, still, [SCHULE_X, 1.34, 0.012]);
  const rocker2 = keep(new THREE.Group()); rocker2.position.set(SCHULE_X, 1.34, 0.024); rocker2.rotation.x = schule ? 0.2 : -0.2; room.add(rocker2);
  mesh(rbox(0.075, 0.115, 0.022, 0.01, 2), std({ color: 0xfaf6ee, roughness: 0.3 }), rocker2);
  mesh(new THREE.BoxGeometry(0.018, 0.006, 0.004), glowMat(schule ? 0x46e0d0 : 0x7ed957, 1.4), rocker2, [0, -0.035, 0.013]).castShadow = false;
  decal(tapeTex(schule ? 'Zurück' : 'Schule', { w: 300 }), 0.22, 0.085, still, [SCHULE_X + 0.02, 1.53, 0.012], [0, 0, 0.04], { emissive: 0x3a3020 });
  const switch2Hit = hitBox(room, 0.16, 0.4, 0.12, [SCHULE_X, 1.4, 0.06], 'schule');

  // Paket: Update
  const parcel = keep(new THREE.Group()); parcel.position.set(1.2, 0, 1.0); parcel.rotation.y = -0.3; parcel.visible = false; room.add(parcel);
  const box = new THREE.Group(); parcel.add(box);
  mesh(rbox(0.42, 0.3, 0.36, 0.012, 2), card, box, [0, 0.15, 0]);
  const band = std({ color: 0xff4f9a, roughness: 0.5 });
  mesh(rbox(0.06, 0.306, 0.366, 0.008, 1), band, box, [0, 0.15, 0]); mesh(rbox(0.426, 0.306, 0.05, 0.008, 1), band, box, [0, 0.15, 0]);
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.055, 0.017, 8, 18), band, box, [s * 0.06, 0.345, 0], [0, 0, s * 0.5], [1.2, 0.7, 1]);
  decal(tapeTex('Update', { w: 300, h: 100 }), 0.24, 0.08, box, [0.02, 0.13, 0.188], [0, 0, 0.06], { emissive: 0x3a3020 });
  const parcelGlow = glowSprite(parcel, 0xff6aa8, 0.9, [0, 0.2, 0.22], 0.22);
  const parcelHit = hitBox(parcel, 0.5, 0.42, 0.44, [0, 0.2, 0], 'paket');

  bake(still);

  // ---------------- Licht ----------------
  const hemi = new THREE.HemisphereLight(0x8089c8, 0x30201e, 0.75); scene.add(hemi);
  const aussen = new THREE.DirectionalLight(0x8fb4ff, 0.4); aussen.position.set(-4, 3, 2.5); aussen.target.position.set(0, 1, 0.5); scene.add(aussen, aussen.target); // durchs Fenster: Farbe und Stärke nach Uhrzeit
  const key = new THREE.SpotLight(0xffe0bc, 34, 0, 0.68, 0.85, 2); key.position.set(1.0, 3.5, 3.7); key.target.position.set(-0.1, 1.1, 0.4); scene.add(key, key.target);
  key.castShadow = !!shadows; key.shadow.mapSize.setScalar(low ? 1024 : 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.012; key.shadow.camera.near = 1; key.shadow.camera.far = 9;
  const pink = new THREE.PointLight(0xff4f9a, 1.9, 4, 2); pink.position.set(0, 2.68, 0.62); scene.add(pink);
  const teal = new THREE.PointLight(0x46e0d0, 1.5, 3.4, 2); teal.position.set(2.4, 1.15, 1.0); scene.add(teal);
  const bulbs = [[-0.35, 1.94], [0.4, 1.38], [-0.1, 0.86]].slice(0, low ? 2 : 3).map(([x, y]) => { const l = new THREE.PointLight(0xffc78c, 0, 1.7, 2); l.position.set(x, y, 0.7); scene.add(l); return l; });

  // s = { power: Strom im Zimmer 0..1, open: die weiteste Tür 0..1, both: die engste Tür 0..1 }
  function light(t, s, calm) {
    const dip = !calm && (t % 11) > 10.82 ? 0.72 : 1; const p = s.power;
    hemi.intensity = 0.75 * p; key.intensity = 34 * p;
    pink.intensity = 1.9 * p * dip; teal.intensity = 1.5 * p;
    neonM.color.setScalar(Math.max(0.04, p * dip)); neonHalo.material.opacity = 0.13 * p * dip;
    for (const b of bulbs) b.intensity = lerp(0, 0.42, smooth(0.35, 0.9, s.both)) * p; // die Birnen hängen vorn: erst, wenn keine Tür mehr davor ist
    slitM.opacity = clamp(1 - s.open * 5, 0, 1) * p; spillM.opacity = 0.22 * clamp(1 - s.open * 4, 0, 1) * p;
    slit.visible = slitGlow.visible = spill.visible = slitM.opacity > 0.01;
    for (const id in cubbies) if (cubbies[id].tag) cubbies[id].tag.visible = (cubbies[id].bottom ? s.both : s.open) > 0.02; // unter einer zugezogenen Tür lugt kein Schild hervor
    scene.environmentIntensity = 0.5 * p;
  }

  let neonJetzt = null;
  function setNeon(farbe) {
    if (farbe === neonJetzt) return;
    neonJetzt = farbe;
    const alt = neonM.map; neonM.map = neonBild(farbe); alt.dispose();
    neonHalo.material.color.setHex(farbe === null ? 0xff3f92 : farbe);
    pink.color.setHex(farbe === null ? 0xff4f9a : farbe);
  }

  return {
    scene, root: room, pane, aussen, doors, cubbies, light, setNeon, shadowLight: key,
    drawer: { group: drawer, hit: drawerHit }, rocker: { group: rocker, hit: switchHit }, rocker2: { group: rocker2, hit: switch2Hit }, slots, parcel: { group: parcel, box, glow: parcelGlow, hit: parcelHit },
  };
}
