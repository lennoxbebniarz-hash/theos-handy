// Theos Seitenscheidel - Ludwig Zigaretti: Elektro-Erwin, der Elektroladen gegenüber (Spielprinzip Teil 2, 2026-11-21). Ersetzt den „Supermarkt Billig-Bude“.
// Wohnhaus mit zwei Wohnetagen, unten der Laden zum Reingehen: Schaufenster mit sechs flimmernden Fernsehern, Glasschiebetür (geht tagsüber von selbst auf),
// Neon-Schild, drinnen ein Regal voller Kartons, Lochwand mit Kabeln, Wühltisch mit alten Geräten, Theke mit Kasse, Lötstation und Lupenlampe,
// dahinter Fächer mit Vape-Teilen. Erwin (Kittel, Schiebermütze) lötet, wenn keiner da ist, und schaut Ludwig an. Offen von 8 bis 20 Uhr Spielzeit, nachts zu.
// Feste Teile kommen in den gemeinsamen Stapel B (ludwigaussen.js fasst sie zusammen); das Licht im Laden legt ludwigaussen.js an (ERWIN_LIGHT, bindLight).
import * as THREE from './vendor/three.module.min.js';
import { ROOM, OUT_Y } from './ludwigart.js';
import { faceTo } from './casinofig.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { std, mesh, rng, canvasTex, label, glow, wallBox } from './ludwiggfx.js';

const FZ = ROOM.z0 - ROOM.t; const Y = OUT_Y; const HZ = FZ - 21; // Hausfront der Läden gegenüber (wie ludwigstrasse.js)
export const ERWIN_B = { x0: 6, x1: 17, z0: HZ - 6, z1: HZ, hh: 9.2 };
export const ERWIN_SHOP = { x0: 6.25, x1: 12.8, z0: HZ - 5.75, z1: HZ - 0.25, ceil: 3.0, door0: 11.2, door1: 12.4 };
export const ERWIN_AT = { x: 11.45, z: HZ - 4.95 }; // Erwin hinter der Theke
export const ERWIN_COUNTER = { x: 11.45, z: HZ - 3.25 }; // davor spricht man ihn an
export const ERWIN_DOOR = { x: 11.8, z: HZ + 0.45 }; // vor der Ladentür
export const ERWIN_LIGHT = [9.4, Y + 2.65, HZ - 2.9];
const E = ERWIN_SHOP; const bx = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
export const ERWIN_WALK = [bx(E.door0, E.door1, HZ - 1.0, HZ + 1.0), bx(E.x0, E.x1, E.z0, E.z1)]; // Tür, Laden
export const ERWIN_BOXES = [
  bx(10.0, E.x1, E.z0, HZ - 3.7), // Theke und Erwins Platz dahinter
  bx(E.x0, 10.0, E.z0, E.z0 + 0.5), // Regal an der Rückwand
  bx(E.x0, E.x0 + 0.5, E.z0 + 0.5, HZ - 1.1), // Lochwand mit Regal links
  bx(7.9, 9.3, HZ - 3.3, HZ - 2.3), // Wühltisch
  bx(E.x0, 10.9, HZ - 0.85, E.z1), // Fernseher im Schaufenster
];
export const inErwin = (x, z) => x > E.x0 && x < E.x1 && z > E.z0 && z < HZ + 0.05;

export function buildErwin(scene, g, B, M, winMats) {
  const r = rng(707); const HH = ERWIN_B.hh; const X0 = ERWIN_B.x0; const X1 = ERWIN_B.x1; const Z0 = ERWIN_B.z0; const Z1 = ERWIN_B.z1;
  const MS = { trim: std({ color: 0xd8d4cc, roughness: 0.8 }), dark: std({ color: 0x1c1e22, roughness: 0.6, metalness: 0.3 }), inner: std({ color: 0xe8e4d8, roughness: 0.9 }), ceil: std({ color: 0xd8d6d0, roughness: 0.95, emissive: 0x3a3a36 }), /* etwas Eigenleuchten: sonst wirkt die Decke dunkel (das Licht hängt knapp darunter) */
    shelf: std({ color: 0x8a9096, roughness: 0.45, metalness: 0.6 }), wood: std({ color: 0x5a3c24, roughness: 0.75 }), top: std({ color: 0xb8a07a, roughness: 0.6 }), black: std({ color: 0x101114, roughness: 0.45 }),
    tube: std({ color: 0x000000, emissive: 0xf0f6ff, emissiveIntensity: 2.2 }), red: std({ color: 0xb8231c, roughness: 0.5 }), chrome: std({ color: 0xc8ccd0, roughness: 0.25, metalness: 0.9 }), green: std({ color: 0x1f6a3a, roughness: 0.5 }) };
  const tex = (w, h, draw) => canvasTex(w, h, draw);
  // ---- Obergeschosse wie die Nachbarhäuser: Putz, Fenster, Simse, Dachkante, Schornstein (sein Rauch kommt aus ludwigstrasse.js)
  wallBox(B, M.wallB, X0, Y + 3.4, Z0, X1, Y + HH, Z1); B.box(MS.trim, X0 - 0.05, Y + HH, Z0, X1 + 0.05, Y + HH + 0.25, Z1 + 0.15); B.box(MS.trim, X0, Y + 3.3, Z1, X1, Y + 3.42, Z1 + 0.1);
  for (let wx = X0 + 1.2; wx < X1 - 0.7; wx += 2.4) for (const wy of [Y + 4.7, Y + 7.5]) { const k = (r() * 5) | 0; B.add(winMats[k], new THREE.PlaneGeometry(1.0, 1.35), wx, wy, Z1 + 0.025); B.box(MS.trim, wx - 0.6, wy - 0.75, Z1, wx + 0.6, wy - 0.68, Z1 + 0.12); B.box(MS.trim, wx - 0.58, wy + 0.68, Z1, wx + 0.58, wy + 0.78, Z1 + 0.06); }
  B.box(MS.dark, X0 + 3.2, Y + HH + 0.25, Z1 - 3.5, X0 + 3.8, Y + HH + 1.3, Z1 - 2.9);
  // ---- Erdgeschoss: Außenwände mit Schaufenster und Tür, Seitenwände, Rückwand; innen helle Wände, Fliesenboden, Decke mit Leuchtröhren
  const gf = (x0, x1, y0, y1) => wallBox(B, M.wallB, x0, y0, Z1 - 0.25, x1, y1, Z1);
  gf(X0, E.x0 + 0.1, Y - 0.2, Y + 3.4); gf(E.x0 + 0.1, 10.9, Y - 0.2, Y + 0.45); gf(E.x0 + 0.1, 10.9, Y + 2.45, Y + 3.4); gf(10.9, E.door0, Y - 0.2, Y + 3.4); gf(E.door0, E.door1, Y + 2.3, Y + 3.4); gf(E.door1, X1, Y - 0.2, Y + 3.4);
  wallBox(B, M.wallB, X0, Y - 0.2, Z0, X0 + 0.25, Y + 3.4, Z1 - 0.25); wallBox(B, M.wallB, X1 - 0.25, Y - 0.2, Z0, X1, Y + 3.4, Z1 - 0.25); wallBox(B, M.wallB, X0, Y - 0.2, Z0, X1, Y + 3.4, Z0 + 0.25); wallBox(B, M.wallB, E.x1, Y - 0.2, Z0 + 0.25, E.x1 + 0.2, Y + 3.4, Z1 - 0.25);
  B.box(MS.dark, X0, Y - 0.2, Z1, E.door0, Y + 0.35, Z1 + 0.04); B.box(MS.dark, E.door1, Y - 0.2, Z1, X1, Y + 0.35, Z1 + 0.04); // Sockel (die Tür bleibt frei)
  const iw = E.x1 - E.x0; const id = E.z1 - E.z0; const cx = (E.x0 + E.x1) / 2; const cz = (E.z0 + E.z1) / 2;
  B.add(MS.inner, new THREE.PlaneGeometry(id, E.ceil), E.x0 + 0.005, Y + E.ceil / 2, cz, 0, Math.PI / 2, 0); B.add(MS.inner, new THREE.PlaneGeometry(id, E.ceil), E.x1 - 0.005, Y + E.ceil / 2, cz, 0, -Math.PI / 2, 0);
  B.add(MS.inner, new THREE.PlaneGeometry(iw, E.ceil), cx, Y + E.ceil / 2, E.z0 + 0.005);
  for (const [a, b2, y0, y1] of [[E.x0, 10.9, Y + 0.45, Y], [E.x0, 10.9, Y + E.ceil, Y + 2.45], [10.9, E.door0, Y + E.ceil, Y], [E.door0, E.door1, Y + E.ceil, Y + 2.3], [E.door1, E.x1, Y + E.ceil, Y]]) B.add(MS.inner, new THREE.PlaneGeometry(b2 - a, Math.abs(y1 - y0)), (a + b2) / 2, (y0 + y1) / 2, E.z1 - 0.005, 0, Math.PI, 0); // Innenseite der Front
  const tiles = tex(512, 512, (x, w, h) => { const n = 12; const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#d8dcde' : '#a8b0b6'; x.fillRect(i * s, j * s, s, s); } x.strokeStyle = 'rgba(60,60,60,.35)'; x.lineWidth = 2; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, h); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); } });
  B.add(std({ map: tiles, roughness: 0.35, metalness: 0.05 }), new THREE.PlaneGeometry(iw, id), cx, Y + 0.026, cz, -Math.PI / 2, 0, 0);
  B.add(MS.ceil, new THREE.PlaneGeometry(iw, id), cx, Y + E.ceil, cz, Math.PI / 2, 0, 0);
  for (const tz of [HZ - 1.6, HZ - 3.6]) for (const tx of [7.8, 10.6]) { B.box(MS.shelf, tx - 0.75, Y + E.ceil - 0.06, tz - 0.07, tx + 0.75, Y + E.ceil - 0.01, tz + 0.07); B.box(MS.tube, tx - 0.7, Y + E.ceil - 0.085, tz - 0.035, tx + 0.7, Y + E.ceil - 0.06, tz + 0.035); }
  // ---- Schaufenster: Rahmen, Glas, sechs Fernseher (flimmern), Preisschilder
  B.box(MS.dark, E.x0 + 0.1, Y + 0.42, Z1 - 0.18, 10.9, Y + 0.48, Z1 - 0.06); B.box(MS.dark, E.x0 + 0.1, Y + 2.42, Z1 - 0.18, 10.9, Y + 2.48, Z1 - 0.06); for (const mx of [E.x0 + 0.13, 8.6, 10.87]) B.box(MS.dark, mx - 0.03, Y + 0.45, Z1 - 0.18, mx + 0.03, Y + 2.45, Z1 - 0.06);
  B.add(M.glass, new THREE.PlaneGeometry(10.9 - E.x0 - 0.1, 2.0), (E.x0 + 0.1 + 10.9) / 2, Y + 1.45, Z1 - 0.12);
  B.box(MS.black, E.x0 + 0.15, Y, HZ - 0.8, 10.85, Y + 0.45, HZ - 0.35); // Podest
  const tvT = tex(160, 120, () => {}); const tvC = tvT.userData.canvas.getContext('2d'); const tvM = std({ color: 0x000000, map: tvT, emissiveMap: tvT, emissive: 0xffffff, emissiveIntensity: 1.0, roughness: 0.3 });
  const tvOff = std({ color: 0x0c0e10, roughness: 0.25, metalness: 0.2 }); const screens = [];
  for (let row = 0; row < 2; row++) for (let i = 0; i < 3; i++) { const x = 7.3 + i * 1.25; const y = Y + 0.85 + row * 0.75; const w = 0.95 - row * 0.12; const h = w * 0.62;
    B.box(MS.black, x - w / 2 - 0.05, y - h / 2 - 0.05, HZ - 0.7, x + w / 2 + 0.05, y + h / 2 + 0.05, HZ - 0.5); if (row === 0) B.box(MS.black, x - 0.08, Y + 0.45, HZ - 0.62, x + 0.08, y - h / 2, HZ - 0.56);
    screens.push(mesh(new THREE.PlaneGeometry(w, h), tvM, x, y, HZ - 0.495, g)); }
  const price = std({ map: label('HEUTE BILLIG', { w: 512, h: 96, bg: '#f2c81c', fg: '#a8140e', size: 60 }), roughness: 0.6 }); mesh(new THREE.PlaneGeometry(0.9, 0.17), price, 9.7, Y + 0.3, HZ - 0.34, g);
  // ---- Neon-Schild über Fenster und Tür, Leuchtkasten
  const st = label('ELEKTRO-ERWIN', { w: 1024, h: 128, bg: '#06202a', fg: '#5ad8ff', size: 88, glowC: '#5ad8ff' }); const sgnM = std({ map: st, emissiveMap: st, emissive: 0xffffff, emissiveIntensity: 1.2, roughness: 0.5 });
  B.box(MS.dark, E.x0 + 0.15, Y + 2.58, Z1, E.door1 + 0.1, Y + 3.24, Z1 + 0.14); mesh(new THREE.PlaneGeometry(E.door1 + 0.1 - E.x0 - 0.25, 0.58), sgnM, (E.x0 + 0.15 + E.door1 + 0.1) / 2, Y + 2.91, Z1 + 0.145, g);
  const sgGlow = glow(g, (E.x0 + E.door1) / 2, Y + 2.9, Z1 + 0.6, 0x5ad8ff, 5.5, 0.16);
  const sub = std({ map: label('Reparatur · An- und Verkauf · Akkus · Kabel', { w: 1024, h: 72, bg: '#f2f0ea', fg: '#1c3f86', size: 40 }), roughness: 0.7 }); mesh(new THREE.PlaneGeometry(4.4, 0.3), sub, 14.55, Y + 2.85, Z1 + 0.02, g);
  // ---- Ladentür: zwei Glasflügel (schieben auseinander), Schild OFFEN / GESCHLOSSEN, daneben die Haustür mit Klingeln
  const doorG = new THREE.Group(); g.add(doorG); const dw = (E.door1 - E.door0) / 2; const panes = [];
  for (const s of [-1, 1]) { const p = new THREE.Group(); p.position.set((E.door0 + E.door1) / 2 + s * dw / 2, Y, Z1 - 0.1); doorG.add(p); mesh(new THREE.PlaneGeometry(dw - 0.04, 2.24), M.glass, 0, 1.15, 0, p); for (const [w2, h2, x2, y2] of [[0.04, 2.26, -dw / 2 + 0.02, 1.15], [0.04, 2.26, dw / 2 - 0.02, 1.15], [dw, 0.06, 0, 0.03], [dw, 0.06, 0, 2.27], [dw - 0.1, 0.04, 0, 1.05]]) mesh(new THREE.BoxGeometry(w2, h2, 0.05), MS.chrome, x2, y2, 0, p); panes.push({ p, s, x0: p.position.x }); }
  const openM = std({ map: label('OFFEN', { w: 256, h: 96, bg: '#0a2a14', fg: '#5aff8a', size: 64, glowC: '#5aff8a' }), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 }); openM.emissiveMap = openM.map;
  const shutM = std({ map: label('GESCHLOSSEN', { w: 256, h: 96, bg: '#2a0a0a', fg: '#ff6a5a', size: 48, glowC: '#ff6a5a' }), emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.4 }); shutM.emissiveMap = shutM.map;
  const hours = std({ map: label('Mo–So 8–20 Uhr', { w: 256, h: 64, bg: '#f2f0ea', fg: '#2a2a2a', size: 30 }), roughness: 0.7 });
  const signP = mesh(new THREE.PlaneGeometry(0.42, 0.16), openM, 0, 1.5, 0.03, panes[1].p); mesh(new THREE.PlaneGeometry(0.42, 0.1), hours, 0, 1.3, 0.03, panes[1].p); // Schild fährt mit dem Flügel
  B.box(MS.wood, 14.9, Y, Z1, 16.0, Y + 2.15, Z1 + 0.05); B.box(MS.trim, 14.8, Y + 2.15, Z1, 16.1, Y + 2.25, Z1 + 0.2); B.box(MS.chrome, 16.2, Y + 1.2, Z1, 16.4, Y + 1.6, Z1 + 0.03); // Haustür, Klingelschild
  // ---- Einrichtung: Regal an der Rückwand voller Kartons, Lochwand mit Kabeln, Wühltisch, Theke mit Kasse, Lötstation und Lupe, Fächer mit Vape-Teilen
  const boxesT = tex(512, 384, (x, w, h) => { const sr = rng(91); x.fillStyle = '#c8ccd0'; x.fillRect(0, 0, w, h); for (let s = 0; s < 5; s++) { const y0 = s * (h / 5); x.fillStyle = '#6a7076'; x.fillRect(0, y0 + h / 5 - 6, w, 6); let px = 4; while (px < w - 20) { const bw = 26 + sr() * 50; const bh = 30 + sr() * 34; x.fillStyle = ['#e8e2d0', '#2a5a9a', '#c8231c', '#1c1c20', '#f2c81c', '#3a8a5a', '#e87a2a'][(sr() * 7) | 0]; x.fillRect(px, y0 + h / 5 - 6 - bh, bw - 3, bh); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(px + 4, y0 + h / 5 - bh + 2, bw * 0.5, 4); px += bw; } } });
  B.box(MS.shelf, E.x0 + 0.05, Y, E.z0, 10.0, Y + 2.25, E.z0 + 0.04); for (const sx of [E.x0 + 0.08, 8.1, 9.95]) B.box(MS.shelf, sx - 0.03, Y, E.z0, sx + 0.03, Y + 2.25, E.z0 + 0.48); for (let k = 0; k < 5; k++) B.box(MS.shelf, E.x0 + 0.05, Y + 0.12 + k * 0.48, E.z0, 10.0, Y + 0.15 + k * 0.48, E.z0 + 0.48);
  B.add(std({ map: boxesT, roughness: 0.8 }), new THREE.PlaneGeometry(10.0 - E.x0 - 0.1, 2.25), (E.x0 + 10.0) / 2, Y + 1.13, E.z0 + 0.3);
  const cableT = tex(512, 256, (x, w, h) => { x.fillStyle = '#b89a6a'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(60,40,20,.35)'; for (let i = 0; i < w; i += 16) for (let j = 0; j < h; j += 16) x.fillRect(i + 7, j + 7, 3, 3); const sr = rng(55); for (let i = 0; i < 14; i++) { const hx = 20 + i * 35; x.strokeStyle = ['#1c1c20', '#c8231c', '#2a5a9a', '#f2c81c', '#e8e2d0', '#3a8a5a'][(sr() * 6) | 0]; x.lineWidth = 6; x.beginPath(); x.moveTo(hx, 30); x.bezierCurveTo(hx - 24, 130 + sr() * 60, hx + 24, 130 + sr() * 60, hx, 30); x.stroke(); x.fillStyle = '#5a5a5a'; x.fillRect(hx - 3, 22, 6, 12); } });
  B.add(std({ map: cableT, roughness: 0.85 }), new THREE.PlaneGeometry(HZ - 1.2 - (E.z0 + 0.6), 1.5), E.x0 + 0.012, Y + 1.65, (E.z0 + 0.6 + HZ - 1.2) / 2, 0, Math.PI / 2, 0);
  B.box(MS.shelf, E.x0, Y + 0.7, E.z0 + 0.5, E.x0 + 0.45, Y + 0.74, HZ - 1.1); B.box(MS.shelf, E.x0, Y, E.z0 + 0.5, E.x0 + 0.45, Y + 0.04, HZ - 1.1);
  for (let i = 0; i < 9; i++) { const bz = E.z0 + 0.7 + i * 0.45; B.box([MS.red, MS.green, MS.dark][i % 3], E.x0 + 0.05, Y + 0.74, bz, E.x0 + 0.4, Y + 0.74 + 0.16 + (i % 3) * 0.06, bz + 0.34); B.box(MS.dark, E.x0 + 0.06, Y + 0.04, bz, E.x0 + 0.42, Y + 0.32, bz + 0.38); }
  B.box(MS.wood, 7.9, Y + 0.76, HZ - 3.3, 9.3, Y + 0.8, HZ - 2.3); for (const [lx, lz] of [[7.95, -3.25], [9.25, -3.25], [7.95, -2.35], [9.25, -2.35]]) B.box(MS.dark, lx - 0.025, Y, HZ + lz - 0.025, lx + 0.025, Y + 0.76, HZ + lz + 0.025);
  B.box(MS.top, 8.0, Y + 0.8, HZ - 3.1, 8.5, Y + 1.05, HZ - 2.8); B.box(MS.dark, 8.06, Y + 0.84, HZ - 2.8, 8.44, Y + 1.0, HZ - 2.795); // altes Radio
  B.box(MS.black, 8.65, Y + 0.8, HZ - 3.2, 9.15, Y + 1.2, HZ - 2.75); mesh(new THREE.PlaneGeometry(0.4, 0.3), tvOff, 8.9, Y + 1.0, HZ - 2.745, g); // Röhrenfernseher
  for (let i = 0; i < 6; i++) B.box([MS.red, MS.chrome, MS.dark, MS.green][i % 4], 8.05 + (i % 3) * 0.38, Y + 0.8, HZ - 2.65 + Math.floor(i / 3) * 0.15, 8.25 + (i % 3) * 0.38, Y + 0.84 + (i % 2) * 0.04, HZ - 2.55 + Math.floor(i / 3) * 0.15);
  const grab = std({ map: label('ALLES 1 €', { w: 256, h: 96, bg: '#f2c81c', fg: '#a8140e', size: 60 }), roughness: 0.6 }); mesh(new THREE.PlaneGeometry(0.4, 0.15), grab, 8.6, Y + 0.6, HZ - 2.295, g);
  B.box(MS.wood, 10.0, Y, HZ - 4.3, E.x1, Y + 1.0, HZ - 3.7); B.box(MS.top, 9.96, Y + 1.0, HZ - 4.34, E.x1, Y + 1.05, HZ - 3.66); // Theke
  const rep = std({ map: label('REPARATUREN', { w: 512, h: 96, bg: '#1c3f86', fg: '#f2f0ea', size: 58 }), roughness: 0.6 }); mesh(new THREE.PlaneGeometry(1.2, 0.22), rep, 11.4, Y + 0.6, HZ - 3.695, g);
  B.box(MS.dark, 10.25, Y + 1.05, HZ - 4.2, 10.7, Y + 1.25, HZ - 3.85); const kasse = std({ color: 0x000000, emissive: 0x5aff8a, emissiveIntensity: 1.2 }); B.box(kasse, 10.3, Y + 1.27, HZ - 4.0, 10.6, Y + 1.36, HZ - 3.98); B.box(MS.dark, 10.4, Y + 1.25, HZ - 4.02, 10.5, Y + 1.27, HZ - 3.98); // Kasse
  B.box(MS.black, 11.8, Y + 1.05, HZ - 4.2, 12.1, Y + 1.15, HZ - 3.95); B.box(MS.red, 11.95, Y + 1.12, HZ - 3.96, 12.0, Y + 1.13, HZ - 3.95); B.box(MS.chrome, 12.12, Y + 1.05, HZ - 4.1, 12.16, Y + 1.25, HZ - 4.06); // Lötstation
  const pen = mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.2, 8), MS.dark, 12.15, Y + 1.3, HZ - 4.08, g, { rz: 0.6 }); void pen;
  const loupe = new THREE.Group(); loupe.position.set(12.45, Y + 1.05, HZ - 4.1); g.add(loupe); mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 12), MS.dark, 0, 0.015, 0, loupe); mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6), MS.chrome, 0, 0.19, 0, loupe); const ring = mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), MS.dark, -0.08, 0.38, 0.04, loupe, { rx: -0.9 }); void ring;
  const binT = ['AKKUS', 'PLATINEN', 'KÖPFE', 'TANKS', 'GEHÄUSE', 'LIQUID'].map((n) => std({ map: label(n, { w: 256, h: 64, bg: '#f2f0ea', fg: '#1c1c20', size: 34 }), roughness: 0.7 }));
  B.box(MS.shelf, 10.1, Y, E.z0, E.x1, Y + 2.0, E.z0 + 0.03); for (let k = 0; k < 3; k++) B.box(MS.shelf, 10.1, Y + 0.6 + k * 0.5, E.z0, E.x1, Y + 0.63 + k * 0.5, E.z0 + 0.35);
  binT.forEach((m, i) => { const col = i % 3; const row = Math.floor(i / 3); const x = 10.55 + col * 0.8; const y = Y + 1.13 + row * 0.5; B.box([MS.red, MS.green, std({ color: 0x2a5a9a, roughness: 0.5 })][col], x - 0.32, y - 0.5, E.z0 + 0.04, x + 0.32, y - 0.32, E.z0 + 0.33); mesh(new THREE.PlaneGeometry(0.4, 0.1), m, x, y - 0.41, E.z0 + 0.335, g); });
  // ---- Erwin: grauer Kittel, Schiebermütze, graue Haare
  const erwin = createPerson(scene, { outfit: 'schlicht', shirt: 0x8a9298, cap: 0x7a6a4a, brim: 0x5a4a30, pants: 0x2a2c32, skin: 0xe0b498, hair: 0xa0a0a0, brille: true, bart: 'voll', face: 'flat', shoe: 0x3a2a20 });
  erwin.place(ERWIN_AT.x, Y + 0.03, ERWIN_AT.z, 0); erwin.mode = 'stand'; erwin.act = 'piano'; erwin.setVisible(true); erwin.update(0.016, 0);
  // ---- Zustand: offen/zu, Tür, Fernseher
  const S = { open: true, door: 0, tvT: 0, light: null, frame: 0 }; let shownOpen = null;
  function drawTV() { const w = 160; const h = 120; S.frame++; const k = Math.floor(S.frame / 12) % 4; const x = tvC;
    if (k === 0) { const cols = ['#e8e8e8', '#f2e21c', '#1ce8e8', '#1ce81c', '#e81ce8', '#e81c1c', '#1c1ce8']; cols.forEach((c, i) => { x.fillStyle = c; x.fillRect(i * w / 7, 0, w / 7 + 1, h * 0.7); }); x.fillStyle = '#101010'; x.fillRect(0, h * 0.7, w, h * 0.3); x.fillStyle = '#fff'; x.font = '900 18px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('ERWIN TV', w / 2, h * 0.9); }
    else if (k === 1) { const img = x.createImageData(w, h); for (let i = 0; i < img.data.length; i += 4) { const v = (Math.random() * 255) | 0; img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255; } x.putImageData(img, 0, 0); }
    else if (k === 2) { x.fillStyle = '#2a7a3a'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 2; x.strokeRect(8, 8, w - 16, h - 16); x.beginPath(); x.moveTo(w / 2, 8); x.lineTo(w / 2, h - 8); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(40 + (S.frame % 80), 40 + Math.sin(S.frame * 0.2) * 20, 4, 0, 7); x.fill(); x.fillStyle = '#000'; x.fillRect(4, 4, 46, 14); x.fillStyle = '#fff'; x.font = '700 11px Bahnschrift, sans-serif'; x.textAlign = 'left'; x.fillText('FCT 2:1', 7, 15); }
    else { x.fillStyle = '#0a1a3a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffcf5a'; x.font = '900 22px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('AKKUS', w / 2, 48); x.fillStyle = '#5ad8ff'; x.fillText('-30 %', w / 2, 82); }
    tvT.needsUpdate = true; }
  drawTV();
  function setOpen(on) { if (shownOpen === on) return; shownOpen = on; S.open = on; signP.material = on ? openM : shutM; sgnM.emissiveIntensity = on ? 1.2 : 0.12; sgGlow.material.opacity = on ? 0.16 : 0.02; for (const s of screens) s.material = on ? tvM : tvOff; if (S.light) S.light.intensity = on ? 7 : 0.8; }
  // px/pz: Ludwig (Welt), open: Öffnungszeit; inside: Ludwig ist im Laden (dann geht die Tür zum Rausgehen auch abends auf)
  function update(t, dt, px, pz, open) {
    setOpen(open); const inside = inErwin(px, pz); const near = Math.abs(px - (E.door0 + E.door1) / 2) < 1.6 && pz > HZ - 1.8 && pz < HZ + 2.2;
    S.door = Math.max(0, Math.min(1, S.door + ((near && (open || inside)) ? 1 : -1) * dt * 2.6)); for (const q of panes) q.p.position.x = q.x0 + q.s * S.door * (dw - 0.06);
    if (open) { S.tvT += dt; if (S.tvT > 0.1) { S.tvT = 0; drawTV(); } }
    const here = open || inside; if (erwin.visible !== here) erwin.setVisible(here);
    if (here) { if (inside) { erwin.act = 'counter'; faceTo(erwin, px, pz, dt); } else { erwin.act = 'piano'; erwin.lookAt = null; } erwin.update(dt, t); }
  }
  // Nachts zu: die Tür ist ein Hindernis, solange Ludwig draußen steht
  const doorBox = (px, pz, open) => (open || inErwin(px, pz) ? [] : [bx(E.door0 - 0.05, E.door1 + 0.05, HZ - 0.3, HZ + 0.05)]);
  return { update, setOpen, doorBox, erwin, bindLight: (l) => { S.light = l; S.light.intensity = S.open ? 7 : 0.8; }, state: S, screens };
}
