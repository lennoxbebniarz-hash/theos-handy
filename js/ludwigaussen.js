// Theos Seitenscheidel - Ludwig Zigaretti: die Außenwelt vor Ludwigs Fenster (Teil 1, 2026-11-19).
// Häuserzeile mit Ludwigs Haus (Fenster als Loch, daneben die Überwachungskamera mit rotem Bereich: sieht sie Ludwig eine Sekunde, gibt es Ärger),
// Querstraße, Kiosk „Eck-Ede“ an der Ecke (vorne Getränke und Snacks), dahinter Kalles Hinterhof (Tabak und Blättchen), ein kleiner Park,
// die Einfahrt zur Tiefgarage (Weg in den Bunker). Alles im Code, keine fremden Dateien. Welt-Koordinaten wie das Zimmer (Fenster nach -z).
// Laufen draußen: Ludwig ist immer in einem der Rechtecke WALK und stößt an die Kästen BOXES.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { ROOM, WIN, OUT_Y } from './ludwigart.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { KIOSK_B, YARD, KALLE_AT, COUNTER, KIOSK_WALK, KIOSK_BOXES, KIOSK_LIGHTS, buildKiosk } from './ludwigkiosk.js';
import { buildStrasse, STRASSE_BOXES, carGeo } from './ludwigstrasse.js';
import { ERWIN_WALK, ERWIN_BOXES, ERWIN_LIGHT, ERWIN_COUNTER, ERWIN_DOOR, ERWIN_SHOP, buildErwin, inErwin } from './ludwigerwin.js'; // Elektro-Erwin (Teil 2)
export { ERWIN_COUNTER, ERWIN_DOOR, ERWIN_SHOP, inErwin }; // Grafik-Update Teil 2: Texturen, Licht, Bäume, Läden, Leben
import { BRUNNEN_BOXES, buildBrunnen } from './ludwigpark.js'; // Brunnenplatz gegenüber mit Leuten und Tauben (2026-11-21)
export { KIOSK_B, YARD, KALLE_AT, COUNTER }; // Kiosk „Eck-Ede“ und Kalles Hof stehen seit 2026-11-20 in ludwigkiosk.js (Laden zum Reingehen, Ede hinter der Theke)

export const FZ = ROOM.z0 - ROOM.t; // Hausfront der Häuserzeile (Ludwigs Fenster liegt darin)
export const STREET = { near: FZ - 3.85, far: FZ - 10.4 }; // Fahrbahn zwischen den Bordsteinen
export const CROSS = { x0: 27, x1: 33, z1: FZ + 22 }; // Querstraße an der Ecke
export const GATE = { x: -30, z: FZ - 0.2 }; // Einfahrt zur Tiefgarage (zwischen den Häusern)
export const WIN_OUT = { x: 0.42, z: FZ - 0.9 }; // hier landet man, wenn man aus dem Fenster klettert
// Überwachungskamera rechts neben dem Fenster: dreht sich hin und her, sieht in einem Kegel (half) bis r1 Meter weit
export const CAM = { x: 1.45, y: 2.45, z: FZ - 0.1, r0: 0.6, r1: 4.2, half: 0.35, sweep: 0.96, period: 9, need: 1.0 }; // reicht über Vorgarten und Gehweg, nicht bis auf die Fahrbahn
export const WALK = [ // Rechtecke, in denen man draußen laufen darf (überlappen sich an den Übergängen)
  { x0: -44.5, x1: 44.5, z0: FZ - 20.6, z1: FZ - 0.15 }, // Vorgärten, Gehweg, Straße, Park, gegenüber
  { x0: 26.7, x1: 35.3, z0: FZ - 1.0, z1: CROSS.z1 }, // Querstraße mit Gehweg
  ...KIOSK_WALK, // Ladentür, Laden, Tor in den Hof, Hinterhof
  ...ERWIN_WALK, // Elektro-Erwin: Tür und Laden
];
export const BOXES = [ // Hindernisse (x0, x1, z0, z1)
  { x0: -5.5, x1: -1.05, z0: FZ - 1.25, z1: FZ - 0.85 }, { x0: 1.05, x1: 5.5, z0: FZ - 1.25, z1: FZ - 0.85 }, // Hecken vor Ludwigs Haus
  { x0: 1.78, x1: 2.02, z0: FZ - 2.42, z1: FZ - 2.18 }, // Laterne (das Familienauto ist ein bewegliches Hindernis)
  { x0: 17, x1: 27, z0: FZ, z1: CROSS.z1 }, { x0: 35, x1: 45, z0: YARD.z1, z1: CROSS.z1 + 1 }, // Eckhaus gegenüber, Hinterhaus hinter dem Hof
  ...KIOSK_BOXES, // Kiosk-Wände, Theke, Regale, Sachen vor dem Laden, Hof mit Kalle (ludwigkiosk.js)
  ...STRASSE_BOXES, // Straßenbäume, geparkte Autos, Bushaltestelle, Litfaßsäule, Poller, Schilder, Bänke (ludwigstrasse.js)
  ...ERWIN_BOXES, // Theke, Regale, Wühltisch, Fernseher (ludwigerwin.js)
  ...BRUNNEN_BOXES, // Brunnen, Bänke, Bäume, Blumenbeete, Mülleimer auf dem Brunnenplatz (ludwigpark.js)
];
const PARK = { x0: -44.3, x1: -19.5, z0: FZ - 20.4, z1: FZ - 12.55, gap0: -33.2, gap1: -30.8 };
const HEDGES = [[-44, -34.5], [-26.3, -19], [-17.5, -9.6], [9.6, 12.4], [14.0, 15.6], [18.2, 25.8]];
export const NB_AT = { x: 13.2, z: FZ - 1.05 }; // Herr Krause steht vor seiner Haustür
export const BANKS = [[-31.8, FZ - 19.6], [-25.2, FZ - 19.6]]; // Parkbänke (Kunden sitzen dort) // weitere Hecken vor den Nachbarhäusern
for (const [a, b] of HEDGES) BOXES.push({ x0: a, x1: b, z0: FZ - 1.25, z1: FZ - 0.85 });
for (const [a, b] of [[PARK.x0, PARK.gap0], [PARK.gap1, PARK.x1]]) BOXES.push({ x0: a, x1: b, z0: PARK.z1 - 0.06, z1: PARK.z1 + 0.06 }); // Parkzaun mit Eingang
const TREES = [[-41, FZ - 16.5], [-36.5, FZ - 18.8], [-27.5, FZ - 17.2], [-23, FZ - 15.2], [-38.6, FZ - 14.2]]; for (const [x, z] of TREES) BOXES.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
const BENCHES = BANKS; for (const [x, z] of BENCHES) BOXES.push({ x0: x - 0.95, x1: x + 0.95, z0: z - 0.35, z1: z + 0.35 });
// Bodenhöhe draußen (für die Augenhöhe): Fahrbahn liegt tiefer als Gehweg und Vorgarten
export function groundY(x, z) { return z < STREET.near && z > STREET.far ? OUT_Y - 0.1 : OUT_Y + 0.02; }

// ---- kleine Helfer
const std = (o) => new THREE.MeshStandardMaterial(o);
function mesh(geo, mat, x, y, z, parent, { ry = 0, rx = 0, rz = 0 } = {}) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (parent) parent.add(m); return m; }
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } t.userData.canvas = c; return t; }
function label(text, { w = 512, h = 128, bg = '#1c1f24', fg = '#ffcf5a', size = 64, glowC = null, font = 'Bahnschrift, sans-serif' } = {}) {
  return canvasTex(w, h, (x) => { if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); } else x.clearRect(0, 0, w, h); x.fillStyle = fg; let fs = size; x.font = `900 ${fs}px ${font}`; while (x.measureText(text).width > w - 24 && fs > 12) { fs -= 2; x.font = `900 ${fs}px ${font}`; } x.textAlign = 'center'; x.textBaseline = 'middle'; if (glowC) { x.shadowColor = glowC; x.shadowBlur = h * 0.2; } x.fillText(text, w / 2, h / 2 + 3); if (glowC) { x.shadowBlur = 0; x.globalAlpha = 0.7; x.fillStyle = '#fff'; x.fillText(text, w / 2, h / 2 + 3); x.globalAlpha = 1; } });
}
let GLOWTEX = null;
function glow(parent, x, y, z, color, size = 0.6, opacity = 0.8) {
  if (!GLOWTEX) GLOWTEX = canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(0.6, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOWTEX, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(x, y, z); s.scale.set(size, size, 1); parent.add(s); return s;
}
function makeBatch() { // viele feste Teile je Material zu einem Körper zusammenfassen
  const map = new Map(); const mt = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const sv = new THREE.Vector3(); const pv = new THREE.Vector3();
  function add(mat, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { const g = geo.index ? geo.toNonIndexed() : geo.clone(); e.set(rx, ry, rz); q.setFromEuler(e); mt.compose(pv.set(x, y, z), q, sv.set(1, 1, 1)); g.applyMatrix4(mt); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k); if (!map.has(mat)) map.set(mat, []); map.get(mat).push(g); }
  const box = (mat, x0, y0, z0, x1, y1, z1) => add(mat, new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  function flush(parent) { for (const [mat, list] of map) { const g = mergeGeometries(list, false); if (g) { const m = new THREE.Mesh(g, mat); m.receiveShadow = true; parent.add(m); } } map.clear(); }
  return { add, box, flush };
}
// Wandflächen mit Welt-Maßstab (Textur wiederholt sich je 2,5 m)
function wallBox(B, mat, x0, y0, z0, x1, y1, z1, sc = 2.5) { const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); const uv = g.attributes.uv; const p = g.attributes.position; const n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)); const ny = Math.abs(n.getY(i)); const px = p.getX(i) + (x0 + x1) / 2; const py = p.getY(i) + (y0 + y1) / 2 - y0; const pz = p.getZ(i) + (z0 + z1) / 2; if (ny > 0.5) uv.setXY(i, px / sc, pz / sc); else if (nx > 0.5) uv.setXY(i, pz / sc, py / sc); else uv.setXY(i, px / sc, py / sc); }
  B.add(mat, g, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); }
// Fassade für ferne Häuser: 4 × 4 Fensterachsen (je 2,5 m) auf einem Bild, manche Fenster leuchten (zweites Bild fürs Leuchten)
function facadeMat(seed, wall) {
  const draw = (lit) => canvasTex(512, 512, (x, w, h) => { const r = rng(seed); x.fillStyle = lit ? '#000' : wall; x.fillRect(0, 0, w, h); const n = rng(seed + 99); if (!lit) for (let i = 0; i < 1800; i++) { x.fillStyle = `rgba(0,0,0,${n() * 0.08})`; x.fillRect(n() * w, n() * h, 2, 2); }
    for (let row = 0; row < 4; row++) for (let c = 0; c < 4; c++) { const on = r() < 0.42; const tv = r() < 0.18; const wx = c * 128 + 36; const wy = row * 128 + 26; if (lit) { if (on) { x.fillStyle = tv ? '#6a8ae8' : '#ffd08a'; x.fillRect(wx, wy, 56, 72); } continue; }
      x.fillStyle = '#ddd6c8'; x.fillRect(wx - 5, wy - 5, 66, 82); x.fillStyle = on ? (tv ? '#3a5aa8' : '#e8b060') : '#151c26'; x.fillRect(wx, wy, 56, 72); x.fillStyle = '#ddd6c8'; x.fillRect(wx + 26, wy, 4, 72); x.fillRect(wx, wy + 30, 56, 3); } }, [1, 1]);
  const map = draw(false); const em = draw(true); return std({ map, emissiveMap: em, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.95 });
}
// ---- Texturen
const plaster = (base, seed) => canvasTex(256, 256, (x, w, h) => { const r = rng(seed); x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < 2400; i++) { x.fillStyle = r() < 0.5 ? `rgba(0,0,0,${r() * 0.08})` : `rgba(255,255,255,${r() * 0.05})`; x.fillRect(r() * w, r() * h, 2, 2); } const gr = x.createLinearGradient(0, h * 0.75, 0, h); gr.addColorStop(0, 'rgba(30,20,10,0)'); gr.addColorStop(1, 'rgba(30,20,10,.07)'); x.fillStyle = gr; x.fillRect(0, h * 0.75, w, h * 0.25); }, [1, 1]);
const brick = (base, seed) => canvasTex(256, 256, (x, w, h) => { const r = rng(seed); x.fillStyle = '#5a4a40'; x.fillRect(0, 0, w, h); for (let row = 0; row < 16; row++) for (let c = -1; c < 8; c++) { const bx = c * 36 + (row % 2) * 18; const by = row * 16; x.fillStyle = base; x.globalAlpha = 0.75 + r() * 0.25; x.fillRect(bx + 1, by + 1, 34, 14); } x.globalAlpha = 1; for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.12})`; x.fillRect(r() * w, r() * h, 2, 2); } }, [1, 1]);
const cobble = () => canvasTex(256, 256, (x, w, h) => { const r = rng(21); x.fillStyle = '#2a2a2c'; x.fillRect(0, 0, w, h); for (let row = 0; row < 16; row++) for (let c = -1; c < 17; c++) { const v = 70 + r() * 22; x.fillStyle = `rgb(${v},${v - 2},${v - 4})`; const bx = c * 16 + (row % 2) * 8; x.fillRect(bx + 1, row * 16 + 1, 14, 14); } for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(0,0,0,${r() * 0.15})`; x.fillRect(r() * w, r() * h, 2, 2); } }, [1, 1]);
function graffiti(seed, words) { return canvasTex(512, 256, (x, w, h) => { const r = rng(seed); x.clearRect(0, 0, w, h); const cols = ['#ff4ab0', '#40d0ff', '#ffd23a', '#7aff6a', '#ff7a2a']; for (const wd of words) { x.save(); x.translate(40 + r() * (w - 200), 60 + r() * (h - 100)); x.rotate((r() - 0.5) * 0.4); x.font = `900 ${50 + r() * 40}px Bahnschrift, sans-serif`; x.lineWidth = 8; x.strokeStyle = '#111'; x.strokeText(wd, 0, 0); x.fillStyle = cols[(r() * cols.length) | 0]; x.fillText(wd, 0, 0); x.restore(); } }); }
function windowTex(kind, seed) { return canvasTex(128, 160, (x, w, h) => { const r = rng(seed); x.fillStyle = '#e8e2d4'; x.fillRect(0, 0, w, h); const lit = kind !== 'dark'; const g = x.createLinearGradient(0, 0, 0, h); if (kind === 'tv') { g.addColorStop(0, '#3a5aa8'); g.addColorStop(1, '#1a2a5a'); } else if (lit) { g.addColorStop(0, '#ffd890'); g.addColorStop(1, '#d08a3a'); } else { g.addColorStop(0, '#1c2430'); g.addColorStop(1, '#0c1018'); } x.fillStyle = g; x.fillRect(10, 10, w - 20, h - 20);
  x.fillStyle = '#e8e2d4'; x.fillRect(w / 2 - 3, 10, 6, h - 20); x.fillRect(10, h * 0.45, w - 20, 5); if (lit) { x.fillStyle = kind === 'tv' ? 'rgba(160,190,255,.35)' : 'rgba(255,255,255,.18)'; x.fillRect(14, 14, 20, h - 28); } x.fillStyle = `rgba(${lit ? '120,40,30' : '60,70,80'},.55)`; x.fillRect(10, 10, 18 + r() * 10, h - 20); x.fillRect(w - 28 - r() * 10, 10, 18 + r() * 10, h - 20); }); }

export function buildAussen(scene, world) {
  const NIGHT = { dome: null, day: null };
  const g = new THREE.Group(); g.name = 'aussenwelt'; scene.add(g); const B = makeBatch(); const r = rng(5); const Y = OUT_Y;
  const M = {
    wallA: std({ map: plaster('#c9b89a', 1), roughness: 0.95 }), wallB: std({ map: plaster('#9aa8b0', 2), roughness: 0.95 }), wallC: std({ map: plaster('#b8907a', 3), roughness: 0.95 }), wallL: std({ map: plaster('#d8d2c4', 4), roughness: 0.95 }),
    brickR: std({ map: brick('#8a4a38', 6), roughness: 0.95 }), brickY: std({ map: brick('#a8805a', 7), roughness: 0.95 }), kioskW: std({ map: plaster('#3f6a5a', 8), roughness: 0.9 }),
    roof: std({ color: 0x3a2622, roughness: 0.9 }), roofG: std({ color: 0x2e3236, roughness: 0.9 }), sill: std({ color: 0xd8d4cc, roughness: 0.8 }), dark: std({ color: 0x1c1e22, roughness: 0.6, metalness: 0.4 }), metal: std({ color: 0x6a7078, roughness: 0.45, metalness: 0.7 }),
    white: std({ color: 0xeceae4, roughness: 0.5 }), black: std({ color: 0x0e0f12, roughness: 0.5 }), wood: std({ color: 0x7a5232, roughness: 0.8 }), woodL: std({ color: 0xa8804c, roughness: 0.85 }), green: std({ color: 0x2f5a34, roughness: 0.9 }), leaf: std({ color: 0x2a4a22, roughness: 0.95 }),
    asphalt: std({ color: 0x2a2c30, roughness: 0.92 }), pave: std({ color: 0x5f5e5a, roughness: 0.95 }), cobble: std({ map: cobble(), roughness: 0.95 }), stripe: std({ color: 0xe8e4d8, roughness: 0.8 }),
    red: std({ color: 0xb8231c, roughness: 0.5 }), yellow: std({ color: 0xf2b81c, roughness: 0.5 }), card: std({ color: 0xb98c56, roughness: 0.9 }), bin: std({ color: 0x2a5a3a, roughness: 0.6 }), binB: std({ color: 0x2a3a6a, roughness: 0.6 }),
    glass: std({ color: 0x9ab8d0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35, depthWrite: false }), bulb: std({ color: 0x000000, emissive: 0xffd8a0, emissiveIntensity: 3 }), sodium: std({ color: 0x000000, emissive: 0xffb050, emissiveIntensity: 3 }),
  };
  const winMats = ['lit', 'dark', 'tv', 'dark', 'lit'].map((k, i) => { const t = windowTex(k, 30 + i); return k === 'dark' ? std({ map: t, roughness: 0.4 }) : std({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 }); });
  const win = (x, y, z, w = 1.1, h = 1.4, k = 0) => { B.add(winMats[k % winMats.length], new THREE.PlaneGeometry(w, h), x, y, z, 0, Math.PI, 0); B.box(M.sill, x - w / 2 - 0.06, y - h / 2 - 0.08, z - 0.12, x + w / 2 + 0.06, y - h / 2, z + 0.02); }; // Fenster schauen zur Straße (-z)
  const roofOver = (x0, x1, h, rise = 2.4) => { const sh = new THREE.Shape(); sh.moveTo(-0.1, 0); sh.lineTo(9.1, 0); sh.lineTo(4.5, rise); sh.closePath(); const rg = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0, bevelEnabled: false }); rg.rotateY(-Math.PI / 2); B.add(M.roof, rg, x1, Y + h, FZ - 0.1); }; // Satteldach von der Hausfront nach hinten
  // ---- Häuserzeile auf Ludwigs Seite: Fassaden (Rückseite liegt hinter der Hausfront), Fenster, Dächer
  const ROW = [[-44.5, -33, M.brickR, 6.4], [-27, -17.8, M.wallB, 6.0], [-17.8, -9.0, M.wallC, 6.6], [9.0, 17.0, M.wallB, 6.2], [17.0, 27.0, M.brickY, 6.8]];
  for (const [x0, x1, mat, h] of ROW) { wallBox(B, mat, x0, Y - 0.2, FZ - 0.02, x1, Y + h, FZ + 9); for (let x = x0 + 1.4; x < x1 - 0.8; x += 2.6) { win(x, Y + 1.6, FZ - 0.03, 1.1, 1.3, (r() * 5) | 0); win(x, Y + 4.4, FZ - 0.03, 1.1, 1.3, (r() * 5) | 0); }
    roofOver(x0, x1, h); }
  B.box(M.wood, 12.6, Y, FZ - 0.06, 13.8, Y + 2.15, FZ - 0.02); B.box(M.sill, 12.5, Y + 2.15, FZ - 0.2, 13.9, Y + 2.25, FZ); // Haustür von Herrn Krause
  // Ludwigs Haus: Fassade rund um sein Fenster (das Loch bleibt frei), Haustür, Fenster der Eltern oben
  const LH = 6.2; const W0 = WIN.x0 - 0.05; const W1 = WIN.x1 + 0.05; const fz0 = FZ - 0.03; const fz1 = FZ;
  wallBox(B, M.wallL, -9.0, Y - 0.2, fz0, W0, Y + LH, fz1); wallBox(B, M.wallL, W1, Y - 0.2, fz0, 9.0, Y + LH, fz1); wallBox(B, M.wallL, W0, Y - 0.2, fz0, W1, WIN.y0, fz1); wallBox(B, M.wallL, W0, WIN.y1, fz0, W1, Y + LH, fz1);
  B.box(M.sill, W0 - 0.1, WIN.y0 - 0.08, FZ - 0.16, W1 + 0.1, WIN.y0, FZ); // Fensterbank draußen
  for (const [x, k] of [[-6.2, 0], [-3.4, 2], [3.6, 1], [6.4, 0]]) win(x, Y + 4.4, FZ - 0.04, 1.2, 1.3, k); win(-6.0, Y + 1.6, FZ - 0.04, 1.3, 1.3, 0); // oben Eltern, unten Wohnzimmer
  B.box(M.wood, 4.6, Y, FZ - 0.06, 5.8, Y + 2.15, FZ - 0.02); B.box(M.sill, 4.5, Y + 2.15, FZ - 0.2, 5.9, Y + 2.25, FZ); mesh(new THREE.PlaneGeometry(0.5, 0.14), std({ map: label('Familie L.', { w: 256, h: 72, bg: '#e8e2d0', fg: '#2a2a2a', size: 34 }) }), 5.2, Y + 1.5, FZ - 0.065, g, { ry: Math.PI }); // Haustür mit Schild
  roofOver(-9.0, 9.0, LH, 2.6);
  B.box(M.brickR, 2.6, Y + LH + 0.8, FZ + 2.4, 3.3, Y + LH + 2.6, FZ + 3.1); // Schornstein
  // ---- Überwachungskamera rechts neben dem Fenster (dreht sich), darunter der rote Bereich
  const cam = new THREE.Group(); cam.position.set(CAM.x, CAM.y, CAM.z); g.add(cam); B.box(M.white, CAM.x - 0.06, CAM.y - 0.02, FZ - 0.05, CAM.x + 0.06, CAM.y + 0.14, FZ); B.box(M.white, CAM.x - 0.02, CAM.y + 0.02, FZ - 0.14, CAM.x + 0.02, CAM.y + 0.06, FZ - 0.04);
  const head = new THREE.Group(); head.rotation.x = -0.42; cam.add(head); mesh(new THREE.BoxGeometry(0.13, 0.12, 0.28), M.white, 0, 0, -0.1, head); mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), M.black, 0, 0, -0.245, head, { rx: Math.PI / 2 }); mesh(new THREE.BoxGeometry(0.17, 0.02, 0.3), M.white, 0, 0.07, -0.11, head);
  const ledMat = std({ color: 0x300000, emissive: 0xff1a0a, emissiveIntensity: 3 }); mesh(new THREE.SphereGeometry(0.012, 8, 6), ledMat, 0.045, -0.035, -0.235, head); const ledGlow = glow(head, 0.045, -0.035, -0.26, 0xff2010, 0.12, 0.9);
  const zoneMat = new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide }); const ZA = CAM.sweep + CAM.half;
  const zone = mesh(new THREE.RingGeometry(CAM.r0, CAM.r1, 40, 1, Math.PI / 2 - ZA, ZA * 2), zoneMat, CAM.x, Y + 0.035, FZ, g, { rx: -Math.PI / 2 }); void zone; // fester roter Bereich (so weit schaut die Kamera)
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const cone = mesh(new THREE.RingGeometry(CAM.r0, CAM.r1, 16, 1, Math.PI / 2 - CAM.half, CAM.half * 2), coneMat, CAM.x, Y + 0.04, FZ, g); cone.rotation.order = 'YXZ'; cone.rotation.set(-Math.PI / 2, 0, 0); // wohin sie gerade schaut
  const rimPts = []; for (let i = 0; i <= 40; i++) { const a = Math.PI / 2 - ZA + (i / 40) * ZA * 2; rimPts.push(new THREE.Vector3(CAM.x + Math.cos(a) * CAM.r1, Y + 0.05, FZ - Math.sin(a) * CAM.r1)); } g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(rimPts), new THREE.LineBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.6 })));
  // ---- Querstraße und Gehwege an der Ecke (liegen über dem Boden aus dem Zimmer-Bild)
  wallBox(B, M.asphalt, CROSS.x0, Y - 0.12, FZ - 1.85, CROSS.x1, Y + 0.012, CROSS.z1 + 2, 4); wallBox(B, M.pave, CROSS.x0 - 0.3, Y - 0.12, FZ, CROSS.x0, Y + 0.03, CROSS.z1 + 2, 2); wallBox(B, M.pave, CROSS.x1, Y - 0.12, FZ - 0.1, CROSS.x1 + 2.0, Y + 0.03, CROSS.z1 + 2, 2);
  for (let z = STREET.near - 0.3; z > STREET.far + 0.4; z -= 1.0) B.box(M.stripe, 23.4, Y - 0.1, z - 0.5, 26.0, Y - 0.094, z); // Zebrastreifen über die Straße
  for (let z = FZ + 1; z < CROSS.z1; z += 3) B.box(M.stripe, (CROSS.x0 + CROSS.x1) / 2 - 0.06, Y + 0.012, z, (CROSS.x0 + CROSS.x1) / 2 + 0.06, Y + 0.016, z + 1.5);
  wallBox(B, M.brickR, CROSS.x0 - 10, Y - 0.2, CROSS.z1 + 2, CROSS.x1 + 12, Y + 4.5, CROSS.z1 + 2.4); mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: graffiti(41, ['LZ', 'KIPPE', 'BRUNO']), transparent: true, depthWrite: false }), (CROSS.x0 + CROSS.x1) / 2, Y + 1.8, CROSS.z1 + 1.98, g, { ry: Math.PI });
  // ---- Kiosk „Eck-Ede“ mit Laden, Wohnetagen, Hinterhof und Kalle (ludwigkiosk.js, 2026-11-20)
  const KI = buildKiosk(scene, g, B, M, winMats); const { ede, kalle } = KI;
  // ---- Einfahrt zur Tiefgarage (zwischen den Häusern links): Rampe nach unten, Rolltor, Schild
  { const gx0 = -33; const gx1 = -27; for (const x of [gx0, gx1]) wallBox(B, M.wallB, x - 0.15, Y - 2.6, FZ - 0.02, x + 0.15, Y + 6.0, FZ + 9); const ramp = mesh(new THREE.PlaneGeometry(gx1 - gx0 - 0.3, 6.6), M.asphalt, (gx0 + gx1) / 2, Y - 1.2, FZ + 3.1, g); ramp.rotation.set(-Math.PI / 2 + Math.atan2(2.3, 6.2), 0, 0);
    B.box(M.dark, gx0, Y - 2.4, FZ + 6.2, gx1, Y + 0.6, FZ + 6.3); for (let y = -2.3; y < 0.5; y += 0.18) B.box(M.metal, gx0 + 0.2, Y + y, FZ + 6.15, gx1 - 0.2, Y + y + 0.1, FZ + 6.2); for (const s of [0, 1]) B.box(M.yellow, s ? gx1 - 0.35 : gx0 + 0.15, Y - 2.4, FZ + 6.1, s ? gx1 - 0.15 : gx0 + 0.35, Y + 0.6, FZ + 6.15);
    { const st = label('TIEFGARAGE · EINFAHRT', { w: 512, h: 96, bg: '#1c2a4a', fg: '#ffffff', size: 44 }); mesh(new THREE.PlaneGeometry(3.4, 0.6), std({ map: st, emissiveMap: st, emissive: 0xffffff, emissiveIntensity: 0.4 }), (gx0 + gx1) / 2, Y + 2.9, FZ - 0.05, g, { ry: Math.PI }); } B.box(M.dark, gx0, Y + 2.55, FZ - 0.04, gx1, Y + 3.25, FZ + 0.1);
    B.box(M.sodium, -30.4, Y + 2.4, FZ + 0.1, -29.6, Y + 2.46, FZ + 0.3); glow(g, -30, Y + 2.3, FZ + 0.4, 0xffa040, 2.4, 0.5); for (const s of [-1, 1]) B.box(M.yellow, -30 + s * 2.9 - 0.08, Y, FZ - 0.4, -30 + s * 2.9 + 0.08, Y + 1.0, FZ - 0.24); }
  // ---- Park gegenüber links: Zaun mit Eingang, Bäume, Bänke, Laterne, Weg
  for (let x = PARK.x0; x <= PARK.x1; x += 1.25) { if (x > PARK.gap0 && x < PARK.gap1) continue; B.box(M.green, x - 0.04, Y, PARK.z1 - 0.04, x + 0.04, Y + 1.0, PARK.z1 + 0.04); }
  for (const [a, b] of [[PARK.x0, PARK.gap0], [PARK.gap1, PARK.x1]]) for (const y of [0.35, 0.85]) B.box(M.green, a, Y + y, PARK.z1 - 0.025, b, Y + y + 0.05, PARK.z1 + 0.025);
  B.box(std({ color: 0x6a5e4e, roughness: 1 }), PARK.gap0 + 0.2, Y + 0.005, PARK.z0 + 1.2, PARK.gap1 - 0.2, Y + 0.015, PARK.z1); B.box(std({ color: 0x6a5e4e, roughness: 1 }), PARK.x0 + 2, Y + 0.006, PARK.z0 + 1.0, PARK.x1 - 2, Y + 0.016, PARK.z0 + 2.4);
  // Bäume im Park baut jetzt ludwigstrasse.js aus Laubkarten (TREES)
  for (const [x, z] of BENCHES) { B.box(M.wood, x - 0.9, Y + 0.42, z - 0.25, x + 0.9, Y + 0.47, z + 0.2); B.box(M.wood, x - 0.9, Y + 0.5, z - 0.24, x + 0.9, Y + 0.9, z - 0.18); for (const s of [-1, 1]) B.box(M.dark, x + s * 0.75 - 0.04, Y, z - 0.2, x + s * 0.75 + 0.04, Y + 0.45, z + 0.2); }
  { const px = -27.5; const pz = FZ - 14.2; B.add(M.dark, new THREE.CylinderGeometry(0.05, 0.07, 3.4, 10), px, Y + 1.7, pz); B.add(M.bulb, new THREE.SphereGeometry(0.2, 12, 8), px, Y + 3.5, pz); glow(g, px, Y + 3.5, pz, 0xffd8a0, 3.2, 0.55); BOXES.push({ x0: px - 0.12, x1: px + 0.12, z0: pz - 0.12, z1: pz + 0.12 }); } // Parklaterne
  mesh(new THREE.PlaneGeometry(1.4, 0.35), std({ map: label('STADTPARK', { w: 512, h: 128, bg: '#2f5a34', fg: '#f4efe2', size: 64 }) }), (PARK.gap0 + PARK.gap1) / 2, Y + 1.5, PARK.z1 + 0.06, g); B.box(M.green, PARK.gap0 + 0.2, Y, PARK.z1, PARK.gap0 + 0.28, Y + 1.7, PARK.z1 + 0.08); B.box(M.green, PARK.gap1 - 0.28, Y, PARK.z1, PARK.gap1 - 0.2, Y + 1.7, PARK.z1 + 0.08);
  // ---- Hecken vor den Nachbarhäusern, Laternen entlang der Straße, Mülltonnen am Kiosk, Fahrradständer
  // Hecken vor den Nachbarhäusern baut jetzt ludwigstrasse.js mit Laub (HEDGES)
  const lamps = [[-24, FZ - 2.3], [13.5, FZ - 2.3], [30.0 + 3.8, FZ + 6.5], [-30, FZ - 13.9], [24, FZ - 13.9]];
  for (const [x, z] of lamps) { B.add(M.dark, new THREE.CylinderGeometry(0.05, 0.07, 4.2, 10), x, Y + 2.1, z); B.box(M.dark, x - 0.5, Y + 4.1, z - 0.12, x + 0.05, Y + 4.2, z + 0.12); B.box(M.sodium, x - 0.45, Y + 4.08, z - 0.08, x - 0.1, Y + 4.1, z + 0.08); glow(g, x - 0.28, Y + 4.0, z, 0xffb060, 2.6, 0.45); BOXES.push({ x0: x - 0.12, x1: x + 0.12, z0: z - 0.12, z1: z + 0.12 }); }
  for (const [x, z] of [[34.2, FZ - 0.8], [34.7, FZ - 0.8]]) { B.add(M.bin, new THREE.CylinderGeometry(0.25, 0.22, 0.85, 14), x, Y + 0.45, z); } BOXES.push({ x0: 33.9, x1: 35.0, z0: FZ - 1.1, z1: FZ - 0.5 });
  // ---- Straßenenden und gegenüber: hohe Wohnblöcke und Häuser, damit die Welt nicht im Schwarzen endet; dazu ein Nachthimmel rundum
  const facA = facadeMat(51, '#8a8478'); const facB = facadeMat(52, '#6a7480'); const facC = facadeMat(53, '#9a7a62'); const facD = facadeMat(54, '#7a6a5a');
  wallBox(B, facA, 46, Y - 0.2, FZ - 26, 64, Y + 15, FZ + 24, 10); wallBox(B, facB, -64, Y - 0.2, FZ - 26, -46, Y + 15, FZ + 12, 10); // Wohnblöcke am Ende der Straße
  wallBox(B, facC, 18.5, Y - 0.2, FZ - 28, 46, Y + 9, FZ - 21, 10); wallBox(B, facD, -46, Y - 0.2, FZ - 30, -18.5, Y + 8, FZ - 21, 10); // gegenüber rechts, hinter dem Park
  wallBox(B, facD, 43, Y - 0.2, FZ, 46, Y + 7.5, CROSS.z1 + 2.4, 10); wallBox(B, facC, CROSS.x0 - 12, Y - 0.2, CROSS.z1 + 2.4, CROSS.x1 + 14, Y + 10, CROSS.z1 + 12, 10); // Ecke hinter dem Hof, Ende der Querstraße
  const ST = buildStrasse(scene, g, B, M, { winMats, W: world, lamps, trees: TREES, hedges: HEDGES, facs: [facA, facB, facC, facD] }); // Grafik-Update Teil 2: Texturen, Licht, Bäume, Läden, Leben
  const ER = buildErwin(scene, g, B, M, winMats); // Elektro-Erwin gegenüber (Teil 2)
  const BR = buildBrunnen(scene, g, B); // Brunnenplatz rechts neben Erwin: Brunnen, Bänke, Leute mit Brotdosen, Tauben (2026-11-21)
  B.flush(g);
  { const sky = canvasTex(4096, 1024, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#04060e'); gr.addColorStop(0.42, '#0b1022'); gr.addColorStop(0.5, '#1c1a30'); gr.addColorStop(0.56, '#0a0c14'); gr.addColorStop(1, '#050608'); x.fillStyle = gr; x.fillRect(0, 0, w, h); const sr = rng(77); for (let i = 0; i < 2600; i++) { const y = sr() * h * 0.47; x.fillStyle = `rgba(255,255,255,${0.15 + sr() * 0.5})`; x.fillRect(sr() * w, y, 1, 1); } });
    const dome = mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.MeshBasicMaterial({ map: sky, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true }), 0, 0, 0, g); dome.renderOrder = -10; NIGHT.dome = dome; // Nachthimmel rundum
    const daySky = canvasTex(512, 512, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a78d0'); gr.addColorStop(0.45, '#8ec0f0'); gr.addColorStop(0.52, '#dce8f0'); gr.addColorStop(0.58, '#8a9a8a'); gr.addColorStop(1, '#4a5248'); x.fillStyle = gr; x.fillRect(0, 0, w, h); const cr = rng(12); x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 14; i++) { const cx = cr() * w; const cy = h * (0.18 + cr() * 0.22); for (let k = 0; k < 6; k++) { x.beginPath(); x.ellipse(cx + (k - 3) * 14, cy + cr() * 6, 26 + cr() * 18, 9 + cr() * 6, 0, 0, 7); x.fill(); } } });
    const dayDome = mesh(new THREE.SphereGeometry(196, 32, 16), new THREE.MeshBasicMaterial({ map: daySky, side: THREE.BackSide, fog: false, depthWrite: false, transparent: true, opacity: 0 }), 0, 0, 0, g); dayDome.renderOrder = -9; NIGHT.day = dayDome; }
  // ---- Licht: Kiosk-Neon, Hof-Lampe, zwei Straßenlaternen (gleich viele Lichter immer, damit nichts neu übersetzt werden muss)
  const lights = []; for (const [x, y, z, c, i, d] of [[...KIOSK_LIGHTS.shop, 0xfff0dc, 9, 10], [39, Y + 2.7, KIOSK_B.z0 - 2.4, 0xff4ab0, 3.5, 8], [...KIOSK_LIGHTS.fire, 0xff9a48, 9, 11], [-24.3, Y + 3.9, FZ - 2.5, 0xffa848, 14, 14], [13.2, Y + 3.9, FZ - 2.5, 0xffa848, 14, 14], [33.6, Y + 3.9, FZ + 6.5, 0xffa848, 12, 14], [-30, Y + 1.8, FZ + 1.8, 0xffa040, 7, 9], [-27.5, Y + 3.3, FZ - 14.2, 0xffd8a0, 8, 11], [...ERWIN_LIGHT, 0xe8f4ff, 7, 9]]) { const l = new THREE.PointLight(c, i, d, 1.6); l.position.set(x, y, z); g.add(l); lights.push(l); } KI.bindLights({ fire: lights[2] }); ER.bindLight(lights[lights.length - 1]);
  // ---- Kamera: schaut hin und her, sieht Ludwig im Kegel (nur draußen). Gibt die Zeit zurück, die sie ihn schon sieht.
  let seenT = 0; let ang = 0; let T = 0; let fix = null; // fix: Kamera festhalten (nur für Tests)
  function update(t, dt, out, px, pz, watching) {
    T += dt; ang = fix !== null ? fix : CAM.sweep * Math.sin((T * Math.PI * 2) / CAM.period); cam.rotation.y = -ang; cone.rotation.y = -ang; ledMat.emissiveIntensity = Math.sin(T * 6) > 0 ? 3 : 0.4; ledGlow.material.opacity = ledMat.emissiveIntensity > 1 ? 0.9 : 0.1;
    let see = false; if (out && watching) { const dx = px - CAM.x; const dz = pz - FZ; const d = Math.hypot(dx, dz); if (d > CAM.r0 && d < CAM.r1) { const a = Math.atan2(dx, -dz); see = Math.abs(a - ang) < CAM.half; } }
    seenT = see ? seenT + dt : Math.max(0, seenT - dt * 0.6); coneMat.opacity = see ? 0.55 + Math.sin(T * 20) * 0.15 : 0.3; coneMat.color.setHex(see ? 0xff0000 : 0xff2a1a);
    if (!g.userData.hidden) { ST.update(t, dt, px, pz, pol.on); BR.update(t, dt, px, pz); } if (out) { KI.update(t, dt, px, pz); if (nbOut) nb.update(dt, t); for (const P of parkFig) if (P.visible) P.update(dt, t); } return seenT;
  }
  const reset = () => { seenT = 0; };
  // ---- Autos: Polizeistreife (fährt die Straße entlang) und das Familienauto (fährt einkaufen und kommt zurück)
  function makeCar(col, police) {
    const c = new THREE.Group(); g.add(c); const paint = std({ color: col, roughness: 0.4, metalness: 0.2 }); const glass = std({ color: 0x22303c, roughness: 0.12, metalness: 0.3 }); /* weniger Metall: am Tag sonst fast schwarz */
    const CG = carGeo(); mesh(CG.bodyF, paint, 0, 0.02, 0, c); mesh(CG.glassF, glass, 0, 0.02, 0, c); /* runde Karosserie wie die geparkten Autos (vorher drei Kisten) */
    for (const [x, z] of [[-1.35, -0.86], [1.35, -0.86], [-1.35, 0.86], [1.35, 0.86]]) mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.22, 16), M.black, x, 0.33, z, c, { rx: Math.PI / 2 });
    const head = std({ color: 0x000000, emissive: 0xfff2d0, emissiveIntensity: 2.4 }); const tail = std({ color: 0x300000, emissive: 0xff2010, emissiveIntensity: 1.6 }); const glows = [];
    for (const z of [-0.6, 0.6]) { mesh(new THREE.BoxGeometry(0.04, 0.14, 0.32), head, 2.16, 0.7, z, c); glows.push(glow(c, 2.3, 0.7, z, 0xfff0c8, 1.4, 0.7)); mesh(new THREE.BoxGeometry(0.04, 0.12, 0.3), tail, -2.16, 0.72, z, c); }
    const beam = mesh(new THREE.ConeGeometry(2.6, 9, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }), 6.6, 0.55, 0, c, { rz: Math.PI / 2 }); // Lichtkegel nach vorn
    let bar = null; if (police) { for (const zz of [-0.91, 0.91]) { const t = label('POLIZEI', { w: 512, h: 96, bg: null, fg: '#1a4ac8', size: 70 }); const p = mesh(new THREE.PlaneGeometry(2.2, 0.36), new THREE.MeshBasicMaterial({ map: t, transparent: true }), 0.2, 0.66, zz, c, { ry: zz > 0 ? 0 : Math.PI }); void p; }
      mesh(new THREE.BoxGeometry(4.32, 0.14, 1.82), std({ color: 0x1a4ac8, roughness: 0.4 }), 0, 0.55, 0, c); const blue = std({ color: 0x000820, emissive: 0x2050ff, emissiveIntensity: 3 }); const red = std({ color: 0x200000, emissive: 0xff2020, emissiveIntensity: 3 });
      mesh(new THREE.BoxGeometry(0.3, 0.12, 0.5), blue, -0.25, 1.46, -0.3, c); mesh(new THREE.BoxGeometry(0.3, 0.12, 0.5), red, -0.25, 1.46, 0.3, c); bar = { blue, red, gb: glow(c, -0.25, 1.55, -0.3, 0x3060ff, 1.6, 0.8), gr: glow(c, -0.25, 1.55, 0.3, 0xff3030, 1.6, 0.8) }; }
    c.visible = false; return { c, glows, beam, bar, head };
  }
  const LANE = { plus: FZ - 6.7, minus: FZ - 9.0 }; const FAM_Z = FZ - 4.75; // rechts fahren: Richtung +x auf der nahen Spur; das Familienauto parkt am Bordstein (vorher fuhr die Streife durch das geparkte Auto)
  const pol = { ...makeCar(0xf4f4f0, true), on: false, dir: 1, x: 0, z: 0, speed: 9 };
  const fam = { ...makeCar(0x8a1c1c, false), state: 'parkt', x: -3.2, z: FAM_Z, speed: 8, onParked: null }; fam.c.visible = true; fam.c.position.set(fam.x, Y - 0.1, fam.z); fam.beam.visible = false;
  function startPolice(dir) { pol.on = true; pol.dir = dir; pol.x = dir > 0 ? -66 : 66; pol.z = dir > 0 ? LANE.plus : LANE.minus; pol.c.visible = true; pol.c.rotation.y = dir > 0 ? 0 : Math.PI; }
  function famLeave() { if (fam.state !== 'parkt') return; fam.state = 'weg'; fam.go = 1; }
  function famArrive(onParked) { fam.state = 'kommt'; fam.x = -66; fam.z = LANE.plus; fam.c.visible = true; fam.c.rotation.y = 0; fam.onParked = onParked || null; fam.beam.visible = true; }
  const famBox = () => (fam.state === 'parkt' && fam.c.visible ? [{ x0: fam.x - 2.15, x1: fam.x + 2.15, z0: fam.z - 0.9, z1: fam.z + 0.9 }] : []);
  // ---- Herr Krause, der Nachbar: steht ab und zu vor seiner Tür und schaut die Straße entlang
  const nb = createPerson(scene, { outfit: 'schlicht', shirt: 0x7a8a6a, cap: 0x5a5a5a, brim: 0x3a3a3a, pants: 0x3a3a40, skin: 0xe0b090, hair: 0xb8b0a0, brille: true, bart: 'schnauzer', face: 'frown', shoe: 0x3a2a20 }); nb.place(NB_AT.x, Y + 0.02, NB_AT.z, Math.PI); nb.mode = 'stand'; nb.update(0.016, 0); nb.setVisible(false);
  const bang = glow(g, NB_AT.x, Y + 2.25, NB_AT.z, 0xffd020, 0.0, 0); { const t = label('!', { w: 128, h: 128, bg: null, fg: '#ffd020', size: 110, glowC: '#ff9a00' }); bang.material.map = t; bang.material.blending = THREE.NormalBlending; bang.material.needsUpdate = true; }
  let nbOut = false; const nbBox = () => (nbOut ? [{ x0: NB_AT.x - 0.3, x1: NB_AT.x + 0.3, z0: NB_AT.z - 0.3, z1: NB_AT.z + 0.3 }] : []);
  function setNachbar(out) { nbOut = out; nb.setVisible(out); if (!out) { bang.material.opacity = 0; W.nb = 0; } }
  // ---- Kunden im Park (sitzen auf den Bänken, schauen zur Straße)
  const parkFig = [0, 1].map((i) => { const look = [{ shirt: 0xe8e8e8, cap: 0xd8b030, brim: 0x8a6a10, pants: 0x101014, skin: 0xd8a47e, hair: 0xd8c080, face: 'grin' }, { shirt: 0x1c9a5a, cap: 0xf2f2ee, brim: 0x1c9a5a, pants: 0x1a1a22, skin: 0xb07a52, hair: 0x100c0a, face: 'grin' }][i]; /* dieselben wie die Kunden Kevin und Emre */ const P = createPerson(scene, look); P.mode = 'sit'; P.seat = 0.45; P.place(BANKS[i][0], Y + 0.02, BANKS[i][1] - 0.05, 0); P.update(0.016, 0); P.setVisible(false); return P; });
  function syncPark(list) { for (let i = 0; i < 2; i++) parkFig[i].setVisible(list.some((p) => p.bank === i)); }
  // ---- Tag und Nacht: Himmel, Laternen, leuchtende Fenster
  const lit = winMats.filter((m) => m.emissiveMap).concat([facA, facB, facC, facD]); let lastL = -1;
  function setDay(light) {
    if (Math.abs(light - lastL) < 0.004) return; lastL = light; const night = 1 - light;
    if (NIGHT.dome) NIGHT.dome.material.opacity = Math.min(1, 0.15 + night); if (NIGHT.day) { NIGHT.day.material.opacity = light; NIGHT.day.material.color.setRGB(1, 0.72 + 0.28 * light, 0.55 + 0.45 * light); }
    for (const m of lit) m.emissiveIntensity = 0.15 + 0.75 * night; lights.forEach((l, i) => { const k = i < 2 ? 0.55 + 0.45 * night : night; l.userData.dayK = k; l.intensity = (l.userData.i0 === undefined ? (l.userData.i0 = l.intensity) : l.userData.i0) * k; }); // Kiosk innen und Neon bleiben an
    for (const c of [pol, fam]) for (const gl of c.glows) gl.material.opacity = 0.2 + 0.6 * night; fam.beam.material.opacity = 0.05 * night; ST.setDay(light); BR.setDay(light);
  }
  // ---- Wer sieht Ludwig gerade? Polizei (Lichtkegel vorn oder ganz nah), Mama/Papa im Auto, Herr Krause (nur wenn Ludwig etwas dabeihat)
  const W = { pol: 0, fam: 0, nb: 0 };
  const inCone = (cx, cz, dirx, dirz, px, pz, range, half, near) => { const dx = px - cx; const dz = pz - cz; const d = Math.hypot(dx, dz); if (d < near) return true; if (d > range) return false; const a = Math.acos(Math.max(-1, Math.min(1, (dx * dirx + dz * dirz) / d))); return a < half; };
  function watch(dt, out, px, pz, carrying, night) {
    const tick = (k, see, decay = 0.6) => { W[k] = see ? W[k] + dt : Math.max(0, W[k] - dt * decay); };
    tick('pol', out && pol.on && (carrying || night) && inCone(pol.x, pol.z, pol.dir, 0, px, pz, 12, 0.55, 4.5) /* Spur liegt seit 2026-11-20 1 m weiter weg: Sicht um 1 m größer, Balance wie vorher */);
    tick('fam', out && fam.state === 'kommt' && inCone(fam.x, fam.z, 1, 0, px, pz, 17, 0.5, 6));
    const nbLook = { x: Math.sin(T * 0.5) * 0.9, z: -1 }; const nl = Math.hypot(nbLook.x, nbLook.z); tick('nb', out && nbOut && carrying && inCone(NB_AT.x, NB_AT.z, nbLook.x / nl, nbLook.z / nl, px, pz, 9, 0.75, 2.0), 0.4);
    nb.lookAt = new THREE.Vector3(NB_AT.x + nbLook.x * 6, 1.5, NB_AT.z - 6); bang.material.opacity = nbOut ? Math.min(1, W.nb * 1.2) : 0; bang.scale.setScalar(0.5 + Math.min(1, W.nb) * 0.25);
    return W;
  }
  function moveCars(dt, t) {
    if (pol.on) { pol.x += pol.dir * pol.speed * dt; pol.c.position.set(pol.x, Y - 0.1, pol.z); const on = Math.sin(t * 14) > 0; pol.bar.blue.emissiveIntensity = on ? 3.5 : 0.3; pol.bar.red.emissiveIntensity = on ? 0.3 : 3.5; pol.bar.gb.material.opacity = on ? 0.9 : 0.1; pol.bar.gr.material.opacity = on ? 0.1 : 0.9; if (Math.abs(pol.x) > 67) { pol.on = false; pol.c.visible = false; W.pol = 0; } }
    if (fam.state === 'weg') { fam.x += fam.speed * dt * Math.min(1, (fam.go = (fam.go || 0) + dt * 0.6)); fam.c.position.set(fam.x, Y - 0.1, fam.z + Math.min(0.7, (fam.x + 3.2) * 0.1)); if (fam.x > 67) { fam.c.visible = false; fam.state = 'unterwegs'; } }
    else if (fam.state === 'kommt') { const left = -3.2 - fam.x; const v = Math.max(1.2, Math.min(fam.speed, left * 0.9)); fam.x = Math.min(-3.2, fam.x + v * dt); fam.c.position.set(fam.x, Y - 0.1, LANE.plus + Math.max(0, 1 - left / 8) * (FAM_Z - LANE.plus)); if (left < 0.02) { fam.state = 'parkt'; fam.z = FAM_Z; fam.beam.visible = false; W.fam = 0; const cb = fam.onParked; fam.onParked = null; if (cb) cb(); } }
  }
  // Alle Modelle in eine Untergruppe (zum Ausblenden im Bunker), die Lichter bleiben direkt in g und damit immer an
  const content = new THREE.Group(); content.name = 'aussen-inhalt'; for (const o of [...g.children]) if (!o.isLight) content.add(o); g.add(content);
  return { g, content, update, reset, lights, kalle, ede, KI, cam, camAngle: () => ang, setFix: (a) => { fix = a; }, seen: () => seenT,
    police: { start: startPolice, on: () => pol.on, pos: () => [pol.x, pol.z] }, fam: { leave: famLeave, arrive: famArrive, state: () => fam.state, pos: () => [fam.x, fam.z], setAway: (away) => { if (away) { fam.state = 'unterwegs'; fam.c.visible = false; } else { fam.state = 'parkt'; fam.x = -3.2; fam.z = FAM_Z; fam.c.visible = true; fam.c.position.set(fam.x, Y - 0.1, fam.z); fam.c.rotation.y = 0; fam.beam.visible = false; } } }, setNachbar, nachbarOut: () => nbOut, syncPark, setDay, watch, moveCars,
    strasse: ST, extraBoxes: (px = 0, pz = 0) => famBox().concat(nbBox(), ER.doorBox(px, pz, ER.state.open)), erwin: ER, brunnen: BR, resetWatch: () => { W.pol = 0; W.fam = 0; W.nb = 0; }, figures: { nb, park: parkFig } };
}
// Laufen draußen: nur in WALK-Rechtecken, an BOXES abprallen (R = Radius von Ludwig)
export function collideOut(px, pz, x, z, R, extra = []) {
  const inside = (a, b) => WALK.some((w) => a >= w.x0 + R && a <= w.x1 - R && b >= w.z0 + R && b <= w.z1 - R);
  if (!inside(x, z)) { if (inside(x, pz)) z = pz; else if (inside(px, z)) x = px; else { x = px; z = pz; } }
  for (let it = 0; it < 2; it++) for (const b of BOXES.concat(extra)) { const cx = Math.max(b.x0, Math.min(b.x1, x)); const cz = Math.max(b.z0, Math.min(b.z1, z)); const dx = x - cx; const dz = z - cz; const d = Math.hypot(dx, dz); if (d < R) { if (d > 1e-6) { x = cx + (dx / d) * R; z = cz + (dz / d) * R; } else { const pen = [x - b.x0, b.x1 - x, z - b.z0, b.z1 - z]; const k = pen.indexOf(Math.min(...pen)); if (k === 0) x = b.x0 - R; else if (k === 1) x = b.x1 + R; else if (k === 2) z = b.z0 - R; else z = b.z1 + R; } } }
  if (!inside(x, z)) { x = px; z = pz; } return [x, z];
}
