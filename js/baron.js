// Theos Seitenscheidel - Besser als Monopoly (intern baron): Brett, Figuren, Würfel, Karten, Handel, Oberfläche und Netz. Der Host rechnet und spielt die KI-Plätze, Mitspieler schicken nur Wünsche. Allein spielt man gegen zwei KI.
import * as THREE from './vendor/three.module.min.js';
import { SEATS, FIELDS, GROUPS, TOKENS, CARDS, OWNABLE, AI_NAMES, JAIL, BAIL, TAX_FIX, newGame, act, aiMove, actor, rent, canBuild, canSell, canMort, canUnmort, mortValue, unmortCost, houseCost, groupOf, worth, liquid, money } from './baronlogic.js';
import { pipTexture, FACE_UP } from './raus.js';
import { createTour } from './tour.js';

const COL = ['#d3262e', '#2462d6', '#f2b90f'];
const HB = 6.1; const CORNER = 1.6; const SC = 2048 / (HB * 2); const FONT = "Bahnschrift, 'DIN Alternate', 'Segoe UI', sans-serif";
const W = (p, y = 0) => new THREE.Vector3(p.x, y, -p.y);
const rotK = (p, k) => { let { x, y } = p; for (let i = 0; i < k; i++) [x, y] = [y, -x]; return { x, y }; };
// Feld i: Mitte c, Richtung zur Brettmitte n, Laufrichtung t, Seite 0 unten bis 3 rechts
export function fieldGeo(i) { const side = Math.floor(i / 10); const k = i % 10; const local = k === 0 ? { x: HB - 0.8, y: -HB + 0.8 } : { x: HB - CORNER - (k - 1) - 0.5, y: -HB + 0.8 }; return { c: rotK(local, side), n: rotK({ x: 0, y: 1 }, side), t: rotK({ x: -1, y: 0 }, side), side, w: k === 0 ? CORNER : 1, corner: k === 0 }; }
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
function tokenXY(seat, f, jailed) {
  const g = fieldGeo(f); const o = (seat - 1);
  if (g.corner) { const d = Math.hypot(g.c.x, g.c.y); const n = { x: -g.c.x / d, y: -g.c.y / d }; const t = { x: -n.y, y: n.x }; const r = f === JAIL ? (jailed ? 0.36 : -0.5) : -0.15; return add(add(g.c, n, r), t, o * (f === JAIL && jailed ? 0.26 : 0.42)); }
  return add(add(g.c, g.n, -0.28), g.t, o * 0.3);
}
const fieldAt = (p) => { for (let i = 0; i < 40; i++) { const g = fieldGeo(i); const dx = p.x - g.c.x; const dy = p.y - g.c.y; if (g.corner) { if (Math.abs(dx) <= 0.8 && Math.abs(dy) <= 0.8) return i; continue; } if (Math.abs(dx * g.t.x + dy * g.t.y) <= 0.5 && Math.abs(dx * g.n.x + dy * g.n.y) <= 0.8) return i; } return -1; };
// Kleine Bildchen der Figuren für Auswahl und Spielerliste
const TOKEN_SVG = {
  auto: '<rect x="3" y="17" width="34" height="10" rx="3"/><path d="M10 17l5-8h10l5 8z"/><circle cx="11" cy="29" r="4.5"/><circle cx="29" cy="29" r="4.5"/>',
  rakete: '<path d="M20 2c7 6 8 15 5 25H15c-3-10-2-19 5-25z"/><path d="M15 21l-7 9 7-1zM25 21l7 9-7-1z"/><path d="M16.5 29h7L20 38z"/>',
  ente: '<ellipse cx="17" cy="27" rx="14" ry="9"/><circle cx="25" cy="13" r="7.5"/><path d="M31 12l8 2.5-8 3z"/>',
  krone: '<path d="M4 29 3 11l9 8 8-13 8 13 9-8-1 18z"/><rect x="4" y="30" width="32" height="6" rx="1.5"/>',
  kaktus: '<rect x="16" y="5" width="8" height="32" rx="4"/><path d="M16 23h-6a3 3 0 0 1-3-3v-8h4v7h5zM24 19h6v-8h4v9a3 3 0 0 1-3 3h-7z"/>',
  pokal: '<path d="M10 4h20v9a10 10 0 0 1-20 0z"/><path d="M10 7H5a5 5 0 0 0 5 8M30 7h5a5 5 0 0 1-5 8" fill="none" stroke="currentColor" stroke-width="3"/><rect x="18" y="22" width="4" height="8"/><rect x="11" y="30" width="18" height="6" rx="1.5"/>',
};
const tokenIcon = (host, id, col) => { host.innerHTML = `<svg viewBox="0 0 40 40" class="bn-tok" fill="currentColor" aria-hidden="true">${TOKEN_SVG[id] || ''}</svg>`; host.firstChild.style.color = col; };
const tokName = (id) => (TOKENS.find((t) => t.id === id) || { name: '' }).name;
const STEPS = [
  { t: 'Kaufen, bauen, kassieren', x: 'Jeder startet mit 1.500 T auf dem Start. Ihr würfelt mit zwei Würfeln und zieht im Uhrzeigersinn. Wer am Ende als Einziger nicht pleite ist, gewinnt.' },
  { t: 'Grundstücke', x: 'Landest du auf einem freien Grundstück, darfst du es kaufen. Willst du nicht, wird es versteigert. Auf fremden Grundstücken zahlst du Miete. Gehört einem Spieler eine ganze Farbe, kostet es doppelt.' },
  { t: 'Häuser und Hotels', x: 'Mit einer ganzen Farbe baust du Häuser, immer gleichmäßig. Nach vier Häusern kommt ein Hotel. Die Bank hat nur 32 Häuser und 12 Hotels. Klick ein Feld an, um zu bauen oder eine Hypothek aufzunehmen.' },
  { t: 'Pasch und Wache', x: 'Ein Pasch gibt einen weiteren Wurf, der dritte Pasch hintereinander führt in die Wache. Raus kommst du mit 50 T, einer Freikarte oder einem Pasch. Nach drei Versuchen zahlst du 50 T.' },
  { t: 'Karten, Steuern, Handel', x: 'Zufall und Stadtkasse bringen Geld, Kosten oder Ausflüge. Über Start gibt es 200 T. Mit „Handeln“ tauscht ihr Grundstücke, Geld und Freikarten. Kannst du nicht zahlen, verkaufe Häuser oder nimm Hypotheken auf.' },
];

export function createBaron({ $, store, showScreen, endSession }) {
  const C = { S: null, view: null, target: null, on: false, net: null, host: true, solo: false, peers: {}, online: [true, true, true], queue: [], steps: [], busy: 0, metas: {}, lastId: 0, playing: null, dirty: false, sel: -1, rot: 0, fast: 1, aiAt: 0, trade: null };
  const canvas = $('bnBoard');
  const tour = createTour({ root: $('baron'), store, key: 'baronTutSeen', steps: STEPS.map((s, i) => ({ ...s, draw: (c, w, h) => tutDraw(c, w, h, i) })) });
  let R = null; let scene; let cam; let boardMesh; let dice = []; let diceState = null; let sel; const tokens = [null, null, null]; const tokenIds = [null, null, null]; const deco = {}; const ray = new THREE.Raycaster(); const sparks = [];
  // ---- Brett als Bild
  function wrapLines(c, text, maxW, size) { c.font = `700 ${size}px ${FONT}`; if (c.measureText(text).width <= maxW) return [text]; const words = text.split(' '); if (words.length > 1) { const best = []; let line = ''; for (const w of words) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { best.push(line); line = w; } else line = t; } best.push(line); if (best.every((l) => c.measureText(l).width <= maxW)) return best; } for (let k = Math.ceil(text.length / 2); k < text.length - 2; k++) { const a = text.slice(0, k) + '-'; const b = text.slice(k); if (c.measureText(a).width <= maxW && c.measureText(b).width <= maxW) return [a, b]; } return [text]; }
  function label(c, text, y, maxW, size, color = '#1b231f', weight = 700) { let s = size; let L = wrapLines(c, text, maxW, s); while (s > 14 && L.some((l) => c.measureText(l).width > maxW)) { s -= 1; L = wrapLines(c, text, maxW, s); } c.font = `${weight} ${s}px ${FONT}`; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; L.forEach((l, k) => c.fillText(l, 0, y + k * s * 1.08)); return L.length; }
  function icon(c, kind, y, u) {
    c.save(); c.translate(0, y); c.lineWidth = 5; c.strokeStyle = '#1b231f'; c.fillStyle = '#1b231f';
    if (kind === 'station') { c.fillStyle = '#c7342b'; c.fillRect(-0.2 * u, -0.26 * u, 0.32 * u, 0.5 * u); c.fillStyle = '#f5f2e6'; c.fillRect(-0.15 * u, -0.2 * u, 0.22 * u, 0.13 * u); c.beginPath(); c.moveTo(0.12 * u, -0.12 * u); c.lineTo(0.24 * u, -0.05 * u); c.lineTo(0.24 * u, 0.16 * u); c.stroke(); }
    if (kind === 'strom') { c.fillStyle = '#f4c21f'; c.beginPath(); c.moveTo(0.05 * u, -0.3 * u); c.lineTo(-0.18 * u, 0.04 * u); c.lineTo(-0.01 * u, 0.04 * u); c.lineTo(-0.08 * u, 0.3 * u); c.lineTo(0.18 * u, -0.06 * u); c.lineTo(0.01 * u, -0.06 * u); c.closePath(); c.fill(); c.stroke(); }
    if (kind === 'wasser') { c.fillStyle = '#3a8fd6'; c.beginPath(); c.moveTo(0, -0.3 * u); c.bezierCurveTo(0.24 * u, 0, 0.22 * u, 0.26 * u, 0, 0.26 * u); c.bezierCurveTo(-0.22 * u, 0.26 * u, -0.24 * u, 0, 0, -0.3 * u); c.fill(); c.stroke(); }
    if (kind === 'z') { c.font = `800 ${0.72 * u}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ef7d1a'; c.fillText('?', 0, 0); c.lineWidth = 3; c.strokeText('?', 0, 0); }
    if (kind === 'k') { c.fillStyle = '#e9c43c'; c.fillRect(-0.28 * u, -0.12 * u, 0.56 * u, 0.34 * u); c.strokeRect(-0.28 * u, -0.12 * u, 0.56 * u, 0.34 * u); c.fillStyle = '#c99a1c'; c.beginPath(); c.ellipse(0, -0.12 * u, 0.28 * u, 0.14 * u, 0, Math.PI, 0); c.fill(); c.stroke(); c.fillStyle = '#1b231f'; c.fillRect(-0.05 * u, -0.06 * u, 0.1 * u, 0.12 * u); }
    if (kind === 'income') { c.font = `800 ${0.42 * u}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('%', 0, 0); }
    if (kind === 'lux') { c.fillStyle = '#8fd3f0'; c.beginPath(); c.moveTo(-0.24 * u, -0.08 * u); c.lineTo(-0.12 * u, -0.22 * u); c.lineTo(0.12 * u, -0.22 * u); c.lineTo(0.24 * u, -0.08 * u); c.lineTo(0, 0.24 * u); c.closePath(); c.fill(); c.stroke(); }
    c.restore();
  }
  function paintField(c, i) {
    const F = FIELDS[i]; const g = fieldGeo(i); const u = SC; const w = g.w * u; const h = 1.6 * u; c.save(); c.translate((g.c.x + HB) * u, (HB - g.c.y) * u); c.rotate(g.side * Math.PI / 2);
    c.fillStyle = '#fbfaf3'; c.fillRect(-w / 2, -h / 2, w, h); c.lineWidth = 3; c.strokeStyle = '#26332c'; c.strokeRect(-w / 2, -h / 2, w, h); const mw = w - 0.14 * u; const price = (y) => label(c, money(F.price), y, mw, 22, '#1b231f', 600);
    if (F.t === 'street') { c.fillStyle = GROUPS[F.g].col; c.fillRect(-w / 2, -h / 2, w, 0.36 * u); c.strokeRect(-w / 2, -h / 2, w, 0.36 * u); }
    if (!g.corner && g.side === (6 - (C.rot || 0)) % 4) { c.rotate(Math.PI); if (F.t === 'street') c.translate(0, -0.36 * u); } // was gerade oben liegt, stünde auf dem Kopf (der Farbstreifen bleibt innen)
    if (F.t === 'street') { label(c, F.name.toUpperCase(), -h / 2 + 0.6 * u, mw, 23); price(h / 2 - 0.2 * u); }
    if (F.t === 'station') { const [a, b] = F.name.split(' '); label(c, a.toUpperCase(), -h / 2 + 0.22 * u, mw, 21); label(c, b.toUpperCase(), -h / 2 + 0.46 * u, mw, 23); icon(c, 'station', 0.18 * u, u); price(h / 2 - 0.2 * u); }
    if (F.t === 'util') { label(c, F.name.toUpperCase(), -h / 2 + 0.3 * u, mw, 22); icon(c, F.kind, 0.12 * u, u); price(h / 2 - 0.2 * u); }
    if (F.t === 'card') { label(c, F.name.toUpperCase(), -h / 2 + 0.28 * u, mw, 21); icon(c, F.deck, 0.16 * u, u); }
    if (F.t === 'tax') { label(c, F.name.toUpperCase(), -h / 2 + 0.3 * u, mw, 21); icon(c, F.kind, 0.1 * u, u); label(c, F.kind === 'lux' ? 'ZAHLE 100 T' : '200 T ODER 10 %', h / 2 - 0.22 * u, mw, 18, '#1b231f', 600); }
    if (g.corner) {
      c.rotate(Math.PI / 4); const big = (t, y, s, col = '#1b231f') => { c.font = `800 ${s}px ${FONT}`; c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, 0, y); };
      if (F.t === 'start') { big('START', -0.1 * u, 64, '#c7342b'); big('+200 T', 0.32 * u, 30); c.fillStyle = '#c7342b'; c.beginPath(); c.moveTo(-0.55 * u, -0.52 * u); c.lineTo(0.35 * u, -0.52 * u); c.lineTo(0.35 * u, -0.64 * u); c.lineTo(0.6 * u, -0.44 * u); c.lineTo(0.35 * u, -0.24 * u); c.lineTo(0.35 * u, -0.36 * u); c.lineTo(-0.55 * u, -0.36 * u); c.fill(); }
      if (F.t === 'park') { c.fillStyle = '#0a4f9c'; c.fillRect(-0.36 * u, -0.5 * u, 0.72 * u, 0.72 * u); big('P', -0.13 * u, 96, '#f5f6f4'); big('PARKPLATZ', 0.46 * u, 30); }
      if (F.t === 'gojail') { c.fillStyle = '#2462d6'; c.beginPath(); c.arc(0, -0.2 * u, 0.26 * u, Math.PI, 0); c.fill(); c.fillRect(-0.32 * u, -0.2 * u, 0.64 * u, 0.1 * u); c.fillStyle = '#ffda3a'; c.beginPath(); c.arc(0, -0.3 * u, 0.08 * u, 0, 7); c.fill(); big('AB ZUR', 0.18 * u, 30); big('WACHE!', 0.46 * u, 38, '#c7342b'); }
      if (F.t === 'jail') { big('NUR ZU BESUCH', 0.62 * u, 20); }
    }
    c.restore();
    if (F.t === 'jail') { const d = Math.hypot(g.c.x, g.c.y); const cx = g.c.x - g.c.x / d * 0.36; const cy = g.c.y - g.c.y / d * 0.36; const x = (cx + HB) * u; const y = (HB - cy) * u; const s = 0.95 * u; c.fillStyle = '#f08a1c'; c.fillRect(x - s / 2, y - s / 2, s, s); c.strokeStyle = '#26332c'; c.lineWidth = 3; c.strokeRect(x - s / 2, y - s / 2, s, s); c.lineWidth = 7; for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(x - s / 2 + k * s / 5, y - s / 2); c.lineTo(x - s / 2 + k * s / 5, y + s / 2); c.stroke(); } c.font = `800 26px ${FONT}`; c.fillStyle = '#fbfaf3'; c.textAlign = 'center'; c.fillText('WACHE', x, y + s / 2 - 16); }
  }
  function boardTexture() {
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 2048; const c = cv.getContext('2d'); c.fillStyle = '#d6eadc'; c.fillRect(0, 0, 2048, 2048); for (let i = 0; i < 40; i++) paintField(c, i); c.lineWidth = 6; c.strokeStyle = '#26332c'; c.strokeRect(3, 3, 2042, 2042); const inner = CORNER * SC; c.strokeRect(inner, inner, 2048 - inner * 2, 2048 - inner * 2);
    const pile = (x, y, col, title, kind) => { c.save(); c.translate(x, y); c.rotate(-Math.PI / 4); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(-150, -92, 310, 194); c.fillStyle = col; c.fillRect(-160, -100, 310, 194); c.strokeStyle = '#26332c'; c.lineWidth = 4; c.strokeRect(-160, -100, 310, 194); c.font = `800 34px ${FONT}`; c.fillStyle = '#1b231f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(title, -5, -48); c.scale(1.7, 1.7); icon(c, kind, 16, SC * 0.9); c.restore(); };
    pile(660, 660, '#f6a14a', 'ZUFALL', 'z'); pile(1388, 1388, '#f6dc6e', 'STADTKASSE', 'k');
    c.save(); c.translate(1024, 1024); c.rotate(-Math.PI / 4); c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(-560, -104, 1130, 220); c.fillStyle = '#d8261f'; c.fillRect(-570, -114, 1130, 220); c.strokeStyle = '#fbfaf3'; c.lineWidth = 10; c.strokeRect(-550, -94, 1090, 180); c.font = `800 76px ${FONT}`; c.fillStyle = '#fbfaf3'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BESSER ALS', -5, -40); c.font = `800 88px ${FONT}`; c.fillText('MONOPOLY', -5, 42); c.font = `600 34px ${FONT}`; c.fillStyle = '#26332c'; c.fillText('(Besser als Bruno Referenz)', -5, 160); c.restore();
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
  }
  function tutDraw(c, w, h, i) {
    c.fillStyle = '#d6eadc'; c.fillRect(0, 0, w, h); const s = Math.min(w, h) / 13; c.save(); c.translate(w / 2, h / 2); const F = (k) => fieldGeo(k).c; for (let k = 0; k < 40; k++) { const g = fieldGeo(k); const p = F(k); const T = FIELDS[k]; c.fillStyle = T.g ? GROUPS[T.g].col : T.t === 'card' ? '#f6a14a' : '#fbfaf3'; const r = g.corner ? 0.7 : 0.42; c.fillRect(p.x * s - r * s, -p.y * s - r * s, r * 2 * s, r * 2 * s); }
    c.font = `800 ${s * 0.9}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#d8261f'; c.fillText(['1.500 T', 'KAUFEN', '4 + HOTEL', 'PASCH!', 'HANDEL'][i], 0, 0); c.restore();
  }
  // ---- 3D-Szene
  function makeToken(id, col) {
    const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.28, metalness: 0.45 }); const dark = new THREE.MeshStandardMaterial({ color: '#23262b', roughness: 0.5 }); const g = new THREE.Group(); const put = (geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; g.add(o); return o; };
    if (id === 'auto') { put(new THREE.BoxGeometry(0.5, 0.14, 0.26), mat, 0, 0.12, 0); put(new THREE.BoxGeometry(0.26, 0.12, 0.22), mat, -0.03, 0.25, 0); for (const [x, z] of [[-0.16, 0.14], [0.16, 0.14], [-0.16, -0.14], [0.16, -0.14]]) put(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), dark, x, 0.07, z, Math.PI / 2); }
    if (id === 'rakete') { put(new THREE.CylinderGeometry(0.1, 0.12, 0.42, 20), mat, 0, 0.29, 0); put(new THREE.ConeGeometry(0.1, 0.2, 20), mat, 0, 0.6, 0); for (let k = 0; k < 3; k++) { const f = put(new THREE.BoxGeometry(0.03, 0.16, 0.14), mat, 0, 0.12, 0); f.position.set(Math.sin(k * 2.094) * 0.12, 0.12, Math.cos(k * 2.094) * 0.12); f.rotation.y = k * 2.094; } }
    if (id === 'ente') { put(new THREE.SphereGeometry(0.2, 20, 14), mat, 0, 0.17, 0).scale.set(1.25, 0.8, 1); put(new THREE.SphereGeometry(0.12, 18, 12), mat, 0.13, 0.36, 0); put(new THREE.ConeGeometry(0.05, 0.12, 12), new THREE.MeshStandardMaterial({ color: '#f08a1c' }), 0.27, 0.35, 0, 0, 0, -Math.PI / 2); }
    if (id === 'krone') { put(new THREE.CylinderGeometry(0.2, 0.18, 0.14, 24, 1, true), mat, 0, 0.1, 0).material.side = THREE.DoubleSide; for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5; put(new THREE.ConeGeometry(0.05, 0.16, 10), mat, Math.sin(a) * 0.18, 0.24, Math.cos(a) * 0.18); put(new THREE.SphereGeometry(0.03, 10, 8), mat, Math.sin(a) * 0.18, 0.33, Math.cos(a) * 0.18); } }
    if (id === 'kaktus') { put(new THREE.CylinderGeometry(0.08, 0.09, 0.5, 16), mat, 0, 0.25, 0); put(new THREE.SphereGeometry(0.08, 16, 10), mat, 0, 0.5, 0); put(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 12), mat, -0.15, 0.33, 0); put(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12), mat, -0.1, 0.25, 0, 0, 0, Math.PI / 2); put(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12), mat, 0.14, 0.38, 0); put(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12), mat, 0.1, 0.31, 0, 0, 0, Math.PI / 2); }
    if (id === 'pokal') { const pts = [[0, 0], [0.18, 0], [0.18, 0.05], [0.06, 0.08], [0.04, 0.2], [0.07, 0.26], [0.17, 0.34], [0.2, 0.52], [0.18, 0.52], [0.15, 0.36], [0, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)); put(new THREE.LatheGeometry(pts, 28), mat, 0, 0, 0).material.side = THREE.DoubleSide; }
    if (!g.children.length) put(new THREE.SphereGeometry(0.2, 16, 12), mat, 0, 0.2, 0);
    g.scale.setScalar(1.25); return g;
  }
  function houseMesh(hotel) { const m = new THREE.MeshStandardMaterial({ color: hotel ? '#c8261f' : '#1d9a4a', roughness: 0.4 }); const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(hotel ? 0.42 : 0.17, 0.13, 0.17), m); b.position.y = 0.07; const r = new THREE.Mesh(new THREE.CylinderGeometry(0.001, hotel ? 0.32 : 0.13, 0.1, 4, 1).rotateY(Math.PI / 4), m); r.scale.set(1, 1, hotel ? 0.42 : 1); r.position.y = 0.18; for (const o of [b, r]) { o.castShadow = true; g.add(o); } return g; }
  function build() {
    R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.NoToneMapping; scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(38, 1.6, 0.5, 90);
    scene.add(new THREE.HemisphereLight('#fff6e6', '#6a5a4a', 1.55)); const sun = new THREE.DirectionalLight('#ffffff', 2.0); sun.position.set(4, 16, 7); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 36 }); sun.shadow.bias = -0.0006; scene.add(sun);
    const base = new THREE.Mesh(new THREE.BoxGeometry(HB * 2 + 0.5, 0.3, HB * 2 + 0.5), new THREE.MeshStandardMaterial({ color: '#7a4a28', roughness: 0.45 })); base.position.y = -0.16; base.receiveShadow = true; scene.add(base);
    boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(HB * 2, HB * 2), new THREE.MeshStandardMaterial({ map: boardTexture(), roughness: 0.7 })); boardMesh.rotation.x = -Math.PI / 2; boardMesh.position.y = 0.002; boardMesh.receiveShadow = true; scene.add(boardMesh);
    const markGeo = new THREE.PlaneGeometry(1, 1); for (const f of OWNABLE) { const g = fieldGeo(f); const d = { houses: [], hotel: null }; const mk = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: '#fff' })); mk.rotation.x = -Math.PI / 2; mk.rotation.z = g.side * -Math.PI / 2; mk.scale.set(0.86, 0.12, 1); mk.position.copy(W(add(g.c, g.n, -0.72), 0.01)); mk.visible = false; scene.add(mk); d.mark = mk;
      const sh = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: '#101412', transparent: true, opacity: 0.45, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.rotation.z = g.side * -Math.PI / 2; sh.scale.set(0.98, 1.58, 1); sh.position.copy(W(g.c, 0.012)); sh.visible = false; scene.add(sh); d.mort = sh;
      if (FIELDS[f].t === 'street') { for (let k = 0; k < 4; k++) { const hm = houseMesh(false); hm.position.copy(W(add(add(g.c, g.n, 0.62), g.t, (k - 1.5) * 0.22), 0)); hm.rotation.y = g.side * -Math.PI / 2; hm.visible = false; scene.add(hm); d.houses.push(hm); } const ht = houseMesh(true); ht.position.copy(W(add(g.c, g.n, 0.62), 0)); ht.rotation.y = g.side * -Math.PI / 2; ht.visible = false; scene.add(ht); d.hotel = ht; }
      deco[f] = d; }
    sel = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color: '#ffd02e', transparent: true, opacity: 0.35, depthWrite: false })); sel.rotation.x = -Math.PI / 2; sel.visible = false; scene.add(sel);
    const mats = [2, 5, 1, 6, 3, 4].map((n) => new THREE.MeshStandardMaterial({ map: pipTexture(n), color: '#bdbdbd', roughness: 0.42 })); dice = [0, 1].map((k) => { const d = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), mats); d.castShadow = true; d.position.set(k ? 0.55 : -0.55, 0.31, 1.3); scene.add(d); return d; });
  }
  const mySeat = () => { if (!C.S && !C.view) return 0; if (!C.net) return 0; const S = C.view || C.S; const n = C.net.me && C.net.me.name; return S.names.indexOf(n); };
  function camera() { if (boardMesh && boardMesh.userData.rot !== C.rot) { boardMesh.material.map.dispose(); boardMesh.material.map = boardTexture(); boardMesh.userData.rot = C.rot; } const a = C.rot * Math.PI / 2; const d = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)); cam.position.copy(d).multiplyScalar(9.6).setY(14.6); cam.lookAt(d.clone().multiplyScalar(0.5)); }
  function fit() { const w = canvas.clientWidth; const h = canvas.clientHeight; if (!w || !h) return; const dpr = Math.min(window.devicePixelRatio || 1, 2); if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { R.setPixelRatio(dpr); R.setSize(w, h, false); } cam.aspect = w / h; cam.fov = cam.aspect < 1.2 ? 38 * 1.2 / cam.aspect : 38; cam.updateProjectionMatrix(); }
  // ---- Figuren, Häuser und Marker nach Spielstand
  function ensureTokens(S) { for (let s = 0; s < 3; s++) { const id = S.tokens[s]; if (tokenIds[s] === id) continue; if (tokens[s]) scene.remove(tokens[s]); tokens[s] = id ? makeToken(id, COL[s]) : null; tokenIds[s] = id; if (tokens[s]) { tokens[s].position.copy(W(tokenXY(s, S.pos[s], !!S.jail[s]), 0)); scene.add(tokens[s]); } } }
  function decorate(S) { for (const f of OWNABLE) { const d = deco[f]; const o = S.own[f]; d.mark.visible = o >= 0; if (o >= 0) d.mark.material.color.set(COL[o]); d.mort.visible = S.m[f]; d.houses.forEach((hm, k) => { hm.visible = S.h[f] < 5 && k < S.h[f]; }); if (d.hotel) d.hotel.visible = S.h[f] === 5; } }
  function placeAll(S) { if (!scene) return; ensureTokens(S); for (let s = 0; s < 3; s++) { const t = tokens[s]; if (!t) continue; delete t.userData.hop; t.visible = !S.out[s]; t.position.copy(W(tokenXY(s, S.pos[s], !!S.jail[s]), 0)); } decorate(S); C.busy = 0; }
  // ---- Abspielen
  function hop(seat, list, ms, big) { const t = tokens[seat]; if (!t || !list.length) return; C.busy++; t.userData.hop = { list, i: 0, t: 0, from: t.position.clone(), ms, big }; }
  function rollAnim(d) { C.busy++; diceState = { t: 0, d, spin: [0, 1].map(() => [5 + Math.random() * 7, 7 + Math.random() * 7, 4 + Math.random() * 6]) }; }
  function pop(text, col) { const box = $('bnPops'); const el = document.createElement('div'); el.className = 'bn-pop'; el.textContent = text; el.style.color = col; box.append(el); setTimeout(() => el.remove(), 1900); }
  function showCard(deck, id, seat) { const el = $('bnCardShow'); el.className = 'bn-cardshow ' + (deck === 'z' ? 'z' : 'k'); $('bnCardDeck').textContent = deck === 'z' ? 'Zufall' : 'Stadtkasse'; $('bnCardText').textContent = CARDS[deck][id].x; $('bnCardWho').textContent = (C.playing || C.view).names[seat] + ' zieht'; C.busy++; let done = false; const end = () => { if (done) return; done = true; el.classList.add('hidden'); el.onclick = null; C.busy--; }; el.onclick = end; C.cardT = setTimeout(end, 2600 / C.fast); }
  function runStep(x) {
    const S = C.playing || C.view;
    if (x.k === 'note') note(x.t, x.loud); if (x.k === 'cash') pop(`${S.names[x.seat]} ${x.v > 0 ? '+' : '−'}${money(Math.abs(x.v))}`, x.v > 0 ? '#1d9a4a' : '#c8261f');
    if (x.k === 'dice') rollAnim(x.d);
    if (x.k === 'walk') { ensureTokens(S); const L = []; let p = x.from; while (p !== x.to) { p = (p + (x.back ? 39 : 1)) % 40; L.push(W(tokenXY(x.seat, p, false), 0)); } hop(x.seat, L, Math.min(150, 2400 / Math.max(1, L.length)), false); }
    if (x.k === 'jump') { ensureTokens(S); hop(x.seat, [W(tokenXY(x.seat, x.to, x.jail), 0)], 560, true); }
    if (x.k === 'card') showCard(x.deck, x.id, x.seat);
    if (x.k === 'build') decorate(S); if (x.k === 'out' && tokens[x.seat]) { burst(tokens[x.seat].position, COL[x.seat]); tokens[x.seat].visible = false; } if (x.k === 'new') { $('bnResult').classList.add('hidden'); placeAll(S); }
  }
  function burst(pos, color) { for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.copy(pos).setY(0.4); const a = Math.random() * 6.283; m.userData = { v: new THREE.Vector3(Math.cos(a) * (1 + Math.random() * 2.5), 2.5 + Math.random() * 3, Math.sin(a) * (1 + Math.random() * 2.5)), t: 0 }; scene.add(m); sparks.push(m); } }
  function note(t, loud) { const n = $('bnNote'); n.textContent = t; n.classList.toggle('loud', !!loud); n.classList.remove('pop'); void n.offsetWidth; n.classList.add('pop'); }
  function receive(S) { C.target = S; if (!C.view) { C.view = S; C.lastId = S.ev ? S.ev.id : 0; placeAll(S); panel(); return; } const id = S.ev ? S.ev.id : 0; if (id !== C.lastId) { C.lastId = id; C.queue.push(S); } else C.dirty = true; }
  function pump() {
    if (C.busy) return; while (!C.busy && C.steps.length) runStep(C.steps.shift()); if (C.busy || C.steps.length) return;
    if (C.queue.length) { const S = C.queue.shift(); C.playing = S; C.steps = S.ev && S.ev.steps ? S.ev.steps.slice() : []; return; }
    if (C.playing || C.dirty) { C.view = C.target; C.playing = null; C.dirty = false; placeAll(C.view); panel(); }
  }
  const idle = () => !!C.view && !C.busy && !C.steps.length && !C.queue.length && !C.playing && C.view === C.target;
  const me = () => mySeat();
  const myTurn = () => idle() && actor(C.view) === me() && C.view.phase !== 'over' && !C.view.out[me()];
  const canManage = () => idle() && ['roll', 'end', 'buy', 'tax', 'debt'].includes(C.view.phase) && !C.view.trade && me() >= 0 && !C.view.out[me()];
  // ---- Seitenleiste
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function btn(text, c, extra = {}, primary = false, off = false) { const b = el('button', primary ? 'primary' : '', text); b.type = 'button'; b.dataset.cmd = JSON.stringify({ c, ...extra }); b.disabled = off; return b; }
  function panel() {
    const S = C.view; if (!S) return; const m = me(); const a = actor(S); const st = $('bnStatus'); st.className = 'cs-status'; const nm = (q) => S.names[q]; const you = a === m;
    const T = { pick: 'Wählt eure Figuren', open: you ? 'Du würfelst: Wer beginnt?' : `${nm(a)} würfelt: Wer beginnt?`, roll: S.jail[S.turn] ? (you ? 'Du sitzt in der Wache' : `${nm(S.turn)} sitzt in der Wache`) : you ? 'Du bist am Zug' : `${nm(S.turn)} ist am Zug`, buy: you ? `${FIELDS[S.offer] ? FIELDS[S.offer].name : ''}: kaufen?` : `${nm(S.turn)} überlegt`, auction: S.auction ? `Versteigerung: ${FIELDS[S.auction.f].name}` : '', tax: you ? 'Einkommensteuer wählen' : `${nm(S.turn)} wählt die Steuer`, debt: S.debts[0] ? (S.debts[0].seat === m ? `Du schuldest ${money(S.debts[0].amount)}` : `${nm(S.debts[0].seat)} muss Geld beschaffen`) : '', end: you ? 'Bauen, handeln oder Zug beenden' : `${nm(S.turn)} ist am Zug`, over: S.winner !== null ? `${nm(S.winner)} gewinnt!` : '' };
    const gone = S.names.filter((_, i) => !C.online[i] && !S.out[i]); st.textContent = S.trade ? (S.trade.to === m ? `${nm(S.trade.from)} bietet dir einen Handel an` : `Handel: ${nm(S.trade.to)} überlegt`) : T[S.phase] || ''; if (you && S.phase !== 'over' && S.phase !== 'pick') st.classList.add('mine'); if (S.phase === 'debt' && S.debts[0] && S.debts[0].seat === m) st.classList.add('alarm');
    if (gone.length && S.phase !== 'over') st.textContent += ` · ${gone.join(', ')} weg, die KI spielt weiter`;
    const box = $('bnSeats'); box.textContent = ''; S.names.forEach((n, i) => { const d = el('div', 'cs-seat bn-seat' + (S.turn === i && S.phase !== 'over' && S.phase !== 'pick' ? ' on' : '') + (S.out[i] ? ' out' : '')); const dot = el('i'); dot.style.background = COL[i]; if (S.tokens[i]) tokenIcon(dot, S.tokens[i], '#fff'); const tx = el('div'); tx.append(el('b', '', n)); const cnt = OWNABLE.filter((f) => S.own[f] === i).length; const bits = [SEATS[i]]; if (i === m && C.net) bits.push('du'); if (S.ai[i]) bits.push('KI'); bits.push(cnt + (cnt === 1 ? ' Grundstück' : ' Grundstücke')); if (S.jail[i]) bits.push('Wache'); if (S.free[i].length) bits.push(S.free[i].length + '× Freikarte'); if (S.out[i]) bits.push('pleite'); if (S.phase === 'open' && S.open[i] !== null) bits.push('Wurf ' + S.open[i]); tx.append(el('small', '', bits.join(' · '))); d.append(dot, tx, el('em', '', money(S.cash[i]))); box.append(d); });
    $('bnBank').textContent = `Bank: ${S.bank.houses} Häuser · ${S.bank.hotels} Hotels`; $('bnDice').textContent = S.dice ? `${S.dice[0]} + ${S.dice[1]}` : '–';
    acts(); info(); pickBox(); offerBox(); $('bnTrade').disabled = !(myTurn() && ['roll', 'end'].includes(S.phase) && !S.trade);
    if (S.phase === 'over' && idle()) { $('bnResTitle').textContent = `${nm(S.winner)} gewinnt!`; $('bnResText').textContent = `${nm(S.winner)} hat als Einziger nicht Pleite gemacht und besitzt am Ende ${money(worth(S, S.winner))}.`; $('bnResult').classList.remove('hidden'); }
  }
  function acts() {
    const S = C.view; const box = $('bnActs'); box.textContent = ''; const m = me(); const go = myTurn(); const r = { rev: S.rev };
    if (S.trade) { if (S.trade.from === m && idle()) box.append(btn('Angebot zurückziehen', 'cancel')); return; }
    if (S.phase === 'auction' && S.auction) { const A = S.auction; const p = el('p', 'bn-auct', A.high >= 0 ? `Höchstgebot ${money(A.bid)} von ${S.names[A.high]}` : `Noch kein Gebot · Listenpreis ${money(FIELDS[A.f].price)}`); box.append(p); if (go) { for (const k of [10, 50, 100]) box.append(btn(`+${k}`, 'bid', { v: A.bid + k, ...r }, k === 10, A.bid + k > S.cash[m])); box.append(btn('Passen', 'pass', r)); } else box.append(el('p', 'bn-wait', `${S.names[actor(S)]} ist mit Bieten dran.`)); return; }
    if (!go) { if (S.phase !== 'over' && S.phase !== 'pick') box.append(el('p', 'bn-wait', idle() ? `Warte auf ${S.names[actor(S)]} …` : '…')); return; }
    if (S.phase === 'open') box.append(btn('Würfeln', 'roll', r, true));
    if (S.phase === 'roll') { if (S.jail[m]) { box.append(btn(`Pasch versuchen (${S.jail[m]}/3)`, 'roll', r, true)); box.append(btn(`${money(BAIL)} zahlen`, 'jailPay', r, false, S.cash[m] < BAIL)); if (S.free[m].length) box.append(btn('Freikarte nutzen', 'jailCard', r)); } else box.append(btn(S.dbl ? 'Pasch! Nochmal würfeln' : 'Würfeln', 'roll', r, true)); }
    if (S.phase === 'buy') { const F = FIELDS[S.offer]; box.append(btn(`Kaufen für ${money(F.price)}`, 'buy', r, true, S.cash[m] < F.price)); box.append(btn('Versteigern', 'decline', r)); }
    if (S.phase === 'tax') { box.append(btn(`${money(TAX_FIX)} zahlen`, 'tax', { pct: false, ...r }, true)); box.append(btn('10 % vom Vermögen', 'tax', { pct: true, ...r })); }
    if (S.phase === 'debt') { const d = S.debts[0]; box.append(btn(`${money(d.amount)} bezahlen`, 'pay', r, true, S.cash[m] < d.amount)); box.append(btn('Bankrott erklären', 'bankrupt', r)); box.append(el('p', 'bn-wait', liquid(S, m) < d.amount ? 'Selbst mit allen Häusern und Hypotheken reicht es nicht.' : 'Klick deine Grundstücke an: Häuser verkaufen oder Hypotheken aufnehmen.')); }
    if (S.phase === 'end') box.append(btn('Zug beenden', 'end', r, true));
  }
  function info() {
    const S = C.view; const box = $('bnInfo'); box.textContent = ''; const m = me(); let f = C.sel; if (f < 0 && S.phase === 'buy') f = S.offer; if (f < 0 && S.phase === 'auction' && S.auction) f = S.auction.f;
    if (sel) { sel.visible = f >= 0; if (f >= 0) { const g = fieldGeo(f); sel.position.copy(W(g.c, 0.014)); sel.rotation.z = g.side * -Math.PI / 2; sel.scale.set(g.corner ? 1.6 : 1, 1.6, 1); } }
    const mine = OWNABLE.filter((q) => S.own[q] === m); const chips = el('div', 'bn-chips'); for (const q of mine) { const ch = el('button', 'bn-chip' + (q === f ? ' sel' : '') + (S.m[q] ? ' mort' : '')); ch.type = 'button'; ch.title = FIELDS[q].name; ch.style.background = FIELDS[q].g ? GROUPS[FIELDS[q].g].col : '#cfd6dc'; ch.textContent = S.h[q] === 5 ? 'H' : S.h[q] ? String(S.h[q]) : ''; ch.onclick = () => { C.sel = q === C.sel ? -1 : q; info(); }; chips.append(ch); }
    if (f < 0) { box.append(el('p', 'bn-hint', mine.length ? 'Deine Grundstücke (anklicken zum Verwalten):' : 'Klick ein Feld auf dem Brett an, um seine Karte zu sehen.')); if (mine.length) box.append(chips); return; }
    const F = FIELDS[f]; const card = el('div', 'bn-deed'); const head = el('div', 'bn-deedhead'); head.style.background = F.g ? GROUPS[F.g].col : '#e7ebe8'; if (F.g === 'blau' || F.g === 'gruen' || F.g === 'braun' || F.g === 'rot' || F.g === 'pink') head.style.color = '#fff'; head.append(el('small', '', F.t === 'street' ? 'Besitzrechtkarte' : F.t === 'station' ? 'Tankstelle' : F.t === 'util' ? 'Versorger' : F.t === 'card' ? 'Kartenfeld' : 'Feld'), el('b', '', F.name)); card.append(head);
    const rows = []; const o = F.price ? S.own[f] : -1;
    if (F.t === 'street') { rows.push(['Miete', money(F.rent[0])], ['Ganze Farbe', money(F.rent[0] * 2)]); for (let k = 1; k <= 4; k++) rows.push([`Mit ${k} ${k === 1 ? 'Haus' : 'Häusern'}`, money(F.rent[k])]); rows.push(['Mit Hotel', money(F.rent[5])], ['Hauspreis', money(houseCost(f))]); }
    if (F.t === 'station') rows.push(['1 Tankstelle', money(25)], ['2 Tankstellen', money(50)], ['3 Tankstellen', money(100)], ['4 Tankstellen', money(200)]);
    if (F.t === 'util') rows.push(['Ein Versorger', '4 × Wurf'], ['Beide Versorger', '10 × Wurf']);
    if (F.price) rows.push(['Kaufpreis', money(F.price)], ['Hypothek', money(mortValue(f))]);
    if (F.t === 'card') rows.push(['Wirkung', 'Karte ziehen und befolgen']); if (F.t === 'tax') rows.push(['Steuer', F.kind === 'lux' ? money(F.v) : `${money(TAX_FIX)} oder 10 %`]); if (F.t === 'start') rows.push(['Über Start', '+200 T']); if (F.t === 'jail') rows.push(['Raus', `Pasch, Freikarte oder ${money(BAIL)}`]); if (F.t === 'gojail') rows.push(['Achtung', 'Direkt in die Wache']); if (F.t === 'park') rows.push(['Parkplatz', 'Hier passiert nichts']);
    const tb = el('div', 'bn-rows'); for (const [k, v] of rows) { const r = el('div'); r.append(el('span', '', k), el('b', '', v)); tb.append(r); } card.append(tb);
    if (F.price) { const own = el('p', 'bn-own', o < 0 ? 'Gehört der Bank' : `Gehört ${S.names[o]}${S.m[f] ? ' · Hypothek' : ''}${S.h[f] ? ' · ' + (S.h[f] === 5 ? 'Hotel' : S.h[f] + (S.h[f] === 1 ? ' Haus' : ' Häuser')) : ''}${o >= 0 && !S.m[f] ? ' · Miete jetzt ' + (F.t === 'util' ? (rent(S, f, 1) === 10 ? '10 × Wurf' : '4 × Wurf') : money(rent(S, f))) : ''}`); if (o >= 0) own.style.borderColor = COL[o]; card.append(own); }
    box.append(card);
    if (o === m && canManage()) { const row = el('div', 'bn-manage'); if (F.t === 'street') { row.append(btn(S.h[f] === 4 ? `Hotel bauen (${money(houseCost(f))})` : `Haus bauen (${money(houseCost(f))})`, 'build', { f }, false, !canBuild(S, m, f))); row.append(btn(`${S.h[f] === 5 ? 'Hotel' : 'Haus'} verkaufen (+${money(houseCost(f) / 2)})`, 'sell', { f }, false, !canSell(S, m, f))); } if (S.m[f]) row.append(btn(`Hypothek ablösen (${money(unmortCost(f))})`, 'unmort', { f }, false, !canUnmort(S, m, f))); else row.append(btn(`Hypothek (+${money(mortValue(f))})`, 'mort', { f }, false, !canMort(S, m, f))); box.append(row); }
    if (mine.length) box.append(chips);
  }
  // Charakterauswahl
  function pickBox() {
    const S = C.view; const box = $('bnPick'); const on = S.phase === 'pick' && (C.solo || C.net); box.classList.toggle('hidden', !on || tour.open); if (!on) return; const m = me(); const grid = $('bnTokens'); grid.textContent = '';
    for (const t of TOKENS) { const who = S.tokens.indexOf(t.id); const b = el('button', 'bn-tokbtn' + (who >= 0 ? ' taken' : '')); b.type = 'button'; tokenIcon(b, t.id, who >= 0 ? COL[who] : '#2b3138'); b.append(el('b', '', t.name), el('small', '', who >= 0 ? S.names[who] : 'frei')); b.disabled = who >= 0 || S.tokens[m] !== null; b.onclick = () => send({ c: 'pick', token: t.id }); grid.append(b); }
    $('bnPickInfo').textContent = S.tokens[m] ? `Du spielst mit ${tokName(S.tokens[m])}. Warte auf ${S.names.filter((_, i) => S.tokens[i] === null).join(', ')} …` : `Du bist ${SEATS[m]}. Jede Figur gibt es nur einmal.`;
  }
  // ---- Handel
  function side(S, q) { return OWNABLE.filter((f) => S.own[f] === q && !groupOf(FIELDS[f].g || '__').some((x) => S.h[x] > 0)); }
  function tradeOpen() {
    const S = C.view; const m = me(); if (!myTurn() || S.trade) return; const others = [0, 1, 2].filter((q) => q !== m && !S.out[q]); if (!others.length) return; C.trade = { to: C.trade && others.includes(C.trade.to) ? C.trade.to : others[0], give: new Set(), get: new Set() }; $('bnTradeBox').classList.remove('hidden'); tradeRender();
  }
  function tradeRender() {
    const S = C.view; const m = me(); const T = C.trade; const who = $('bnTrWho'); who.textContent = ''; for (const q of [0, 1, 2]) { if (q === m || S.out[q]) continue; const b = el('button', q === T.to ? 'primary' : '', S.names[q]); b.type = 'button'; b.onclick = () => { T.to = q; T.get.clear(); tradeRender(); }; who.append(b); }
    const col = (id, q, set, cashId, cardId) => { const box = $(id); box.textContent = ''; box.append(el('p', 'label', q === m ? 'Du gibst' : `${S.names[q]} gibt`)); const L = side(S, q); if (!L.length) box.append(el('p', 'bn-hint', 'Keine handelbaren Grundstücke.')); for (const f of L) { const lab = el('label', 'bn-trrow'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = set.has(f); cb.onchange = () => { if (cb.checked) set.add(f); else set.delete(f); }; const sw = el('i'); sw.style.background = FIELDS[f].g ? GROUPS[FIELDS[f].g].col : '#cfd6dc'; lab.append(cb, sw, el('span', '', FIELDS[f].name + (S.m[f] ? ' (Hypothek)' : ''))); box.append(lab); }
      const cash = el('label', 'bn-trnum'); cash.append(el('span', '', `Geld (max. ${money(S.cash[q])})`)); const ci = el('input'); ci.type = 'number'; ci.min = '0'; ci.max = String(S.cash[q]); ci.step = '10'; ci.value = '0'; ci.id = cashId; ci.addEventListener('keydown', (e) => e.stopPropagation()); cash.append(ci); box.append(cash);
      if (S.free[q].length) { const cl = el('label', 'bn-trnum'); cl.append(el('span', '', `Freikarten (max. ${S.free[q].length})`)); const k = el('input'); k.type = 'number'; k.min = '0'; k.max = String(S.free[q].length); k.value = '0'; k.id = cardId; k.addEventListener('keydown', (e) => e.stopPropagation()); cl.append(k); box.append(cl); } };
    col('bnTrGive', m, T.give, 'bnTrGiveCash', 'bnTrGiveCards'); col('bnTrGet', T.to, T.get, 'bnTrGetCash', 'bnTrGetCards'); $('bnTrErr').textContent = '';
  }
  const num = (id) => { const e = $(id); return e ? Math.max(0, Math.floor(Number(e.value) || 0)) : 0; };
  function tradeSend() { const S = C.view; const T = C.trade; const m = me(); const give = { f: [...T.give], cash: num('bnTrGiveCash'), cards: num('bnTrGiveCards') }; const get = { f: [...T.get], cash: num('bnTrGetCash'), cards: num('bnTrGetCards') }; if (give.cash > S.cash[m] || get.cash > S.cash[T.to]) { $('bnTrErr').textContent = 'So viel Geld ist nicht da.'; return; } if (!give.f.length && !get.f.length && !give.cash && !get.cash && !give.cards && !get.cards) { $('bnTrErr').textContent = 'Wähle etwas aus.'; return; } send({ c: 'trade', to: T.to, give, get }); $('bnTradeBox').classList.add('hidden'); }
  function offerBox() {
    const S = C.view; const T = S.trade; const box = $('bnOfferBox'); const on = !!T && T.to === me() && idle(); box.classList.toggle('hidden', !on); if (!on) return; $('bnOfferTitle').textContent = `${S.names[T.from]} bietet dir einen Handel an`; const body = $('bnOfferBody'); body.textContent = '';
    const list = (title, x) => { const d = el('div', 'bn-offcol'); d.append(el('p', 'label', title)); const items = x.f.map((f) => FIELDS[f].name + (S.m[f] ? ' (Hypothek)' : '')); if (x.cash) items.push(money(x.cash)); if (x.cards) items.push(x.cards + '× Freikarte'); if (!items.length) items.push('nichts'); const ul = el('ul'); for (const t of items) ul.append(el('li', '', t)); d.append(ul); return d; };
    body.append(list('Du bekommst', T.give), list('Du gibst', T.get));
  }
  // ---- Host
  const FLOW = ['roll', 'jailPay', 'jailCard', 'buy', 'decline', 'bid', 'pass', 'tax', 'end', 'pay', 'bankrupt'];
  const send = (m) => { if (C.host) hostAct(C.net ? mySeat() : 0, m); else C.net.send({ t: 'bncmd', m }); };
  function hostAct(seat, m) { const S = C.S; if (!S || seat < 0 || !m) return; if (FLOW.includes(m.c) && m.rev !== undefined && m.rev !== S.rev) return; if (S.ai[seat] && m.c !== 'again') return; if (act(S, seat, m, C.rnd || Math.random)) push(); }
  function push() { const S = JSON.parse(JSON.stringify(C.S)); store.set(C.solo ? 'baronSolo' : 'baronGame', S); if (C.net) C.net.broadcast({ t: 'bnstate', S, on: C.online }); receive(S); }
  function aiTick(now) { if (!C.host || !C.S || !idle() || C.view.rev !== C.S.rev || tour.open) { C.aiAt = 0; return; } const a = aiMove(C.S); if (!a) { C.aiAt = 0; return; } if (!C.aiAt) { C.aiAt = now + (C.S.phase === 'pick' ? 500 : a.m.c === 'end' || a.m.c === 'roll' ? 750 : 950) / C.fast; return; } if (now < C.aiAt) return; C.aiAt = 0; if (act(C.S, a.seat, a.m, C.rnd || Math.random)) push(); }
  const pick = (e) => { const r = canvas.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), cam); const hit = ray.intersectObject(boardMesh)[0]; return hit ? fieldAt({ x: hit.point.x, y: -hit.point.z }) : -1; };
  canvas.addEventListener('click', (e) => { if (!scene || !C.view) return; const f = pick(e); C.sel = f === C.sel ? -1 : f; info(); });
  $('bnActs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled || !b.dataset.cmd) return; send(JSON.parse(b.dataset.cmd)); });
  $('bnInfo').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.disabled || !b.dataset.cmd) return; send(JSON.parse(b.dataset.cmd)); });
  function loop(now) {
    if (!C.on) { C.raf = 0; return; } const dt = Math.min(0.05, (now - (C.last || now)) / 1000) * C.fast; C.last = now; pump(); aiTick(now); if (C.tourWas && !tour.open && C.view) panel(); C.tourWas = tour.open;
    if (diceState) { const d = diceState; d.t += dt; const T = 0.9; dice.forEach((m, k) => { const home = new THREE.Vector3(k ? 0.55 : -0.55, 0.31, 1.3); if (d.t < T) { const u = d.t / T; m.position.copy(home).setY(0.31 + Math.abs(Math.sin(u * 9.4 + k)) * 1.6 * (1 - u)); m.rotation.x += d.spin[k][0] * dt * 2.4; m.rotation.y += d.spin[k][1] * dt * 2.4; m.rotation.z += d.spin[k][2] * dt * 2.4; } else { const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...FACE_UP[d.d[k]])); m.quaternion.slerp(q, Math.max(Math.min(1, (d.t - T) / 0.2), 0.3)); m.position.copy(home); if (d.t - T >= 0.2) m.quaternion.copy(q); } }); if (d.t - T >= 0.2) { diceState = null; C.busy--; } }
    for (let s = 0; s < 3; s++) { const t = tokens[s]; const h = t && t.userData.hop; if (!h) continue; h.t += dt * 1000 / h.ms; const to = h.list[h.i]; const u = Math.min(1, h.t); t.position.lerpVectors(h.from, to, u); t.position.y = to.y + Math.sin(u * Math.PI) * (h.big ? 2.4 : 0.4); if (u >= 1) { h.from = to.clone(); h.t = 0; h.i++; if (h.i >= h.list.length) { delete t.userData.hop; C.busy--; } } }
    for (let i = sparks.length - 1; i >= 0; i--) { const m = sparks[i]; const u = m.userData; u.t += dt; u.v.y -= 9 * dt; m.position.addScaledVector(u.v, dt); m.material.opacity = 1 - u.t / 0.8; if (u.t > 0.8) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); sparks.splice(i, 1); } }
    if (myTurn() && (C.view.phase === 'roll' || C.view.phase === 'open') && !diceState) dice.forEach((m, k) => { m.position.y = 0.31 + Math.abs(Math.sin(now / 240 + k)) * 0.16; });
    fit(); R.render(scene, cam); C.raf = requestAnimationFrame(loop);
  }
  function run() { if (!R) build(); C.on = true; camera(); if (!C.raf) C.raf = requestAnimationFrame(loop); }
  function reset() { clearTimeout(C.cardT); C.view = null; C.target = null; C.queue = []; C.steps = []; C.playing = null; C.busy = 0; C.dirty = false; C.sel = -1; C.aiAt = 0; diceState = null; for (const id of ['bnResult', 'bnTradeBox', 'bnOfferBox', 'bnPick', 'bnCardShow']) $(id).classList.add('hidden'); note('Wählt eure Figuren.'); }
  // ---- Allein gegen zwei KI
  function solo(fresh) { C.net = null; C.host = true; C.solo = true; C.online = [true, true, true]; const name = (store.get('mpName', 'Du') || 'Du').slice(0, 16); const old = store.get('baronSolo', null); C.S = !fresh && old && old.winner === null ? old : newGame([name, AI_NAMES[0], AI_NAMES[1]], [false, true, true]); C.S.names[0] = name; reset(); $('bnGate').classList.add('hidden'); showScreen('baron'); run(); push(); tour.first(); if (!fresh && old && old.winner === null) note('Deine Partie geht weiter.'); }
  // ---- Sitzung: Menschen sitzen vorn, freie Plätze spielt die KI; der neueste Stand derselben Menschen wird fortgesetzt
  const same = (a, b) => [...a].sort().join('|') === [...b].sort().join('|');
  function hostBegin() {
    clearTimeout(C.helloT); const names = C.net.players.map((p) => p.name); const list = [store.get('baronGame', null), ...Object.values(C.metas)].filter((q) => q && q.winner === null && q.humans && same(q.humans, names)).sort((a, b) => b.rev - a.rev);
    if (list[0]) { C.S = list[0]; C.S.ai = C.S.names.map((n) => !names.includes(n)); } else { const all = names.slice(0, 3); let k = 0; while (all.length < 3) all.push(AI_NAMES[k++]); C.S = newGame(all, all.map((n, i) => i >= names.length)); C.S.humans = names.slice(0, 3); }
    C.online = C.S.names.map((n) => !C.S.humans.includes(n) || names.includes(n)); C.net.players.forEach((p) => { if (p.id !== 'host') C.peers[p.id] = C.S.names.indexOf(p.name); }); reset(); run(); push(); if (list[0]) note('Eure unterbrochene Partie geht weiter.');
  }
  C.startCoop = ({ net, host }) => { C.net = net; C.host = host; C.solo = false; C.S = null; C.peers = {}; C.metas = {}; C.online = [true, true, true]; reset(); showScreen('baron'); $('bnGate').classList.add('hidden'); run(); tour.first(); if (!host) return; net.broadcast({ t: 'bnhello' }); C.helloT = setTimeout(hostBegin, 2500); };
  C.open = () => { C.net = null; C.solo = false; const old = store.get('baronSolo', null); $('bnSoloGo').classList.toggle('hidden', !(old && old.winner === null)); showScreen('baron'); $('bnGate').classList.remove('hidden'); };
  C.message = (from, m) => {
    if (m.t === 'bnhello' && !C.host) { C.net.send({ t: 'bnmeta', S: store.get('baronGame', null) }); return; } if (m.t === 'bnmeta' && C.host) { C.metas[from] = m.S; if (Object.keys(C.metas).length >= C.net.players.length - 1) hostBegin(); return; }
    if (m.t === 'bnstate' && !C.host) { C.S = m.S; C.online = m.on; store.set('baronGame', m.S); receive(m.S); if (idle()) panel(); return; } if (m.t === 'bncmd' && C.host) { const seat = C.peers[from]; if (seat !== undefined) hostAct(seat, m.m); }
  };
  C.playerLeft = (id) => { const s = C.peers[id]; if (s === undefined || !C.S) return; C.online[s] = false; C.S.ai[s] = true; if (C.S.trade && C.S.trade.to === s) C.S.trade = null; delete C.peers[id]; push(); note(`${C.S.names[s]} ist weg. Die KI spielt den Platz, bis er zurückkommt.`, true); };
  C.playerJoined = (id, name) => { if (!C.S) return; let s = C.S.names.indexOf(name); if (s < 0 || C.online[s]) s = C.online.findIndex((on, i) => !on && !C.S.out[i]); if (s < 0) s = C.S.ai.findIndex((a, i) => a && !C.S.out[i]); if (s < 0) return; C.S.names[s] = name; if (C.S.humans && !C.S.humans.includes(name)) C.S.humans.push(name); C.peers[id] = s; C.online[s] = true; C.S.ai[s] = false; C.net.sendTo(id, { t: 'start', mode: 'baron' }); setTimeout(() => { if (C.S) push(); }, 300); };
  $('bnHelp').onclick = tour.show; $('bnBack').onclick = () => { C.stop(); if (endSession && C.wasNet) endSession(); else showScreen('gallery'); }; $('bnResBack').onclick = () => $('bnBack').onclick(); $('bnAgain').onclick = () => { if (C.view) send({ c: 'again' }); }; $('bnGateBack').onclick = () => { $('bnGate').classList.add('hidden'); showScreen('gallery'); };
  $('bnSolo').onclick = () => solo(true); $('bnSoloGo').onclick = () => solo(false); $('bnTurnB').onclick = () => { C.rot = (C.rot + 1) % 4; camera(); }; $('bnTrade').onclick = tradeOpen; $('bnTrCancel').onclick = () => $('bnTradeBox').classList.add('hidden'); $('bnTrSend').onclick = tradeSend;
  $('bnOfferNo').onclick = () => send({ c: 'answer', yes: false }); $('bnOfferYes').onclick = () => send({ c: 'answer', yes: true });
  const primary = () => { const b = $('bnActs').querySelector('button.primary:not(:disabled)'); const d = b && JSON.parse(b.dataset.cmd); if (d && ['roll', 'end'].includes(d.c)) send(d); };
  window.addEventListener('keydown', (e) => { if ($('baron').classList.contains('hidden')) return; if (C.on && !tour.open && e.code === 'Space' && e.target.tagName !== 'INPUT') { e.preventDefault(); e.stopImmediatePropagation(); primary(); } if (e.code === 'Escape') { e.stopImmediatePropagation(); if (tour.open) tour.close(); else if (!$('bnTradeBox').classList.contains('hidden')) $('bnTradeBox').classList.add('hidden'); else if (!$('bnGate').classList.contains('hidden')) $('bnGateBack').onclick(); else if (C.sel >= 0) { C.sel = -1; info(); } } }, true);
  C.hide = () => { C.on = false; };
  C.stop = () => { clearTimeout(C.helloT); clearTimeout(C.cardT); if (C.S) store.set(C.solo ? 'baronSolo' : 'baronGame', C.S); C.wasNet = !!C.net; C.on = false; C.S = null; C.net = null; C.host = true; C.solo = false; C.view = null; C.target = null; C.queue = []; C.steps = []; C.playing = null; tour.open = false; tour.el.classList.add('hidden'); for (const id of ['bnResult', 'bnTradeBox', 'bnOfferBox', 'bnPick', 'bnCardShow']) $(id).classList.add('hidden'); };
  C.active = () => !!C.net || C.solo; C.tour = tour; C.send = send; C.mySeat = mySeat; C.idle = idle; C.myTurn = myTurn; C.placeForTest = () => { placeAll(C.view); panel(); }; C.fieldGeo = fieldGeo; C.panel = panel;
  return C;
}
