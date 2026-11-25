// Theos Seitenscheidel - Ludwig Zigaretti: die Außenwelt mit mehr Leben und Struktur (Grafik-Update Teil 2, 2026-11-20).
// Echte Oberflächen aus Blender (ludwigtex.js) auf Häusern, Straße, Gehwegen, Rasen und Hecken; Nebel bei Nacht und Tag; Laternen mit Lichtkegel und
// Lichtpfütze; Bäume aus Laubkarten; Efeu; Grasbüschel; gegenüber eine neue Häuserzeile mit drei Läden („Späti Mitternacht“, „Getränke Gerd“,
// „Supermarkt Billig-Bude“) und Vorplatz; Bushaltestelle, Litfaßsäule, Briefkasten, Straßenbäume, Fahrradständer, Poller, Schilder, Gullys, Mittellinie;
// geparkte Autos in der Querstraße; Leben: Taxi fährt vorbei, Fußgänger (einer mit Hund), Vögel, Rauch aus Schornsteinen, Katze auf der Hecke, flackernde Fernseher.
// Feste Teile kommen in den gemeinsamen Stapel B von ludwigaussen.js. Hindernisse: STRASSE_BOXES.
import * as THREE from './vendor/three.module.min.js';
import { ROOM, OUT_Y } from './ludwigart.js';
import { walkTo } from './casinofig.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { std, mesh, rng, canvasTex, label, glow, wallBox } from './ludwiggfx.js';
import { surface, plant, worldUV } from './ludwigtex.js';

const FZ = ROOM.z0 - ROOM.t; const Y = OUT_Y;
const bx = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const FAR = { z0: FZ - 10.4, z1: FZ - 12.4 }; const HOUSE_Z = FZ - 21; // Gehweg gegenüber, Hausfront gegenüber
export const STREET_TREES = [[-13.5, FZ - 11.6], [1.5, FZ - 11.6], [11.5, FZ - 11.6]];
export const PARKED = [[27.95, FZ + 3.6, 0x2a4a7a], [27.95, FZ + 15.2, 0x8a8a86], [32.05, FZ + 5.0, 0x6a1c1c], [32.05, FZ + 16.4, 0x1c1c20]];
export const STRASSE_BOXES = [
  ...STREET_TREES.map(([x, z]) => bx(x - 0.25, x + 0.25, z - 0.25, z + 0.25)),
  ...PARKED.map(([x, z]) => bx(x - 0.92, x + 0.92, z - 2.2, z + 2.2)),
  bx(-6.6, -3.4, FZ - 12.4, FZ - 12.2), bx(-6.6, -6.45, FZ - 12.4, FZ - 11.1), bx(-3.55, -3.4, FZ - 12.4, FZ - 11.1), // Bushaltestelle (Rückwand, Seiten)
  bx(-2.98, -2.82, FZ - 10.83, FZ - 10.67), bx(-9.25, -8.75, FZ - 10.95, FZ - 10.55), bx(4.45, 5.55, FZ - 12.15, FZ - 11.05), // Haltestellenschild, Briefkasten, Litfaßsäule
  bx(14.8, 17.2, FZ - 12.35, FZ - 11.75), // Fahrradständer
  bx(-10.15, -9.85, FZ - 11.15, FZ - 10.85), bx(7.85, 8.15, FZ - 11.15, FZ - 10.85), // neue Laternen gegenüber
  ...[[23.0, FZ - 3.7], [26.4, FZ - 3.7], [23.0, FZ - 10.55], [26.4, FZ - 10.55]].map(([x, z]) => bx(x - 0.08, x + 0.08, z - 0.08, z + 0.08)), // Poller am Zebrastreifen
  bx(-12.08, -11.92, FZ - 3.68, FZ - 3.52), bx(7.42, 7.58, FZ - 3.68, FZ - 3.52), // Tempo-30-Schild, Mülleimer am Pfosten
  bx(-1.9, -0.9, FZ - 17.3, FZ - 16.8), bx(10.0, 11.0, FZ - 17.3, FZ - 16.8), // Bänke auf dem Vorplatz
  bx(-1.5, -0.1, FZ - 21, FZ - 20.3), // Getränkekisten (die Einkaufswagen sind mit dem Supermarkt weg)
];

let CARG = null; // Karosserie aus einem Seitenprofil (Front bei -x); bodyF/glassF: Front bei +x
export function carGeo() {
  if (CARG) return CARG; const profile = new THREE.Shape(); [[-2.15, 0.28], [-2.15, 0.72], [-2.02, 0.84], [-0.95, 0.92], [-0.42, 1.36], [0.85, 1.4], [1.45, 0.96], [2.08, 0.9], [2.15, 0.72], [2.15, 0.28]].forEach(([x, y], i) => (i ? profile.lineTo(x, y) : profile.moveTo(x, y))); profile.closePath();
  const body = new THREE.ExtrudeGeometry(profile, { depth: 1.66, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 4 }); body.translate(0, 0, -0.83);
  const cab = new THREE.Shape(); [[-0.86, 0.93], [-0.4, 1.32], [0.82, 1.35], [1.36, 0.97]].forEach(([x, y], i) => (i ? cab.lineTo(x, y) : cab.moveTo(x, y))); cab.closePath(); const glass = new THREE.ExtrudeGeometry(cab, { depth: 1.72, bevelEnabled: false }); glass.translate(0, 0, -0.86);
  CARG = { body, glass, bodyF: body.clone().rotateY(Math.PI), glassF: glass.clone().rotateY(Math.PI) }; return CARG;
}

export function buildStrasse(scene, g, B, M, deps) {
  const { winMats, W, lamps, trees, hedges, facs = [] } = deps; const r = rng(2026);
  // ---- Oberflächen aus Blender
  const T = { ziegel: surface('ziegel'), putz: surface('putz'), asphalt: surface('asphalt'), gehweg: surface('gehweg'), kopfstein: surface('kopfstein'), rasen: surface('rasen'), kies: surface('kies'), laub: plant('laub'), efeu: plant('efeu'), gras: plant('gras') };
  const nScale = (m, s) => { if (m.normalMap) m.normalScale = new THREE.Vector2(s, s); };
  const put = (m, set, color, s = 0.7) => { m.map = set.map; m.normalMap = set.normalMap; nScale(m, s); if (color !== undefined) m.color.setHex(color); m.needsUpdate = true; };
  put(M.wallA, T.putz, 0xd8c8a6); put(M.wallB, T.putz, 0xaab6be); put(M.wallC, T.putz, 0xcaa08a); put(M.wallL, T.putz, 0xe6e0d2); put(M.brickR, T.ziegel, 0xffffff, 0.9); put(M.brickY, T.ziegel, 0xf2d0a0, 0.9);
  put(M.asphalt, surface('asphalt'), 0xffffff, 0.6); put(M.pave, surface('gehweg'), 0xffffff, 0.7); put(M.cobble, surface('kopfstein'), 0xffffff, 0.9); /* Kästen dazu mit wallBox (Weltmaß): Asphalt 4 m, Gehweg/Kopfstein 2 m */
  // Dächer mit Dachziegeln (Reihen parallel zum First: Bild um 90° gedreht), Wohnblöcke am Rand mit Putz-Relief unter dem Fensterbild
  { const dach = surface('dach', 0.5, 0.5); for (const t of [dach.map, dach.normalMap]) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; } put(M.roof, dach, 0xd8c8c0, 0.8); }
  for (const f of facs) { f.normalMap = surface('putz', 4, 4).normalMap; nScale(f, 0.5); f.needsUpdate = true; }
  // Böden aus ludwigart.js (eine große Fläche je Streifen): UV auf Weltmaß, dann Oberfläche
  const WM = W.M; put(WM.asphalt, surface('asphalt'), 0xffffff, 0.6); put(WM.pave, surface('gehweg'), 0xffffff, 0.7); put(WM.grass, surface('rasen'), 0xbcc8b0, 0.6); put(WM.gravel, surface('kies'), 0xffffff, 0.8);
  W.out.g.traverse((o) => { if (!o.isMesh || !o.geometry || o.geometry.type !== 'PlaneGeometry') return; const m = o.material; const tile = m === WM.asphalt ? 4 : m === WM.pave || m === WM.grass || m === WM.gravel ? 2 : 0; if (tile) worldUV(o, tile); });
  g.traverse((o) => { if (o.isMesh && o.material === M.asphalt && o.geometry.type === 'PlaneGeometry') worldUV(o, 4); }); // Rampe zur Tiefgarage
  const hedgeMat = std({ map: plant('laub'), color: 0x6a8a58, roughness: 0.95 }); WM.hedge.map = hedgeMat.map; WM.hedge.color.setHex(0x6a8a58); WM.hedge.needsUpdate = true;
  for (const o of W.out.g.children) if (o.isMesh && o.material === WM.hedge) { const p = o.geometry.parameters; const uv = o.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, p.width / 0.9), uv.getY(i) * Math.max(1, p.height / 0.9)); uv.needsUpdate = true; }
  const leaf = std({ map: T.laub, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, color: 0x9ab07a }); const ivy = std({ map: T.efeu, alphaTest: 0.45, roughness: 0.6, color: 0x8aa080, side: THREE.DoubleSide });
  const grassM = std({ map: T.gras, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1, color: 0x8a9a70 }); const bark = std({ color: 0x4a3626, roughness: 0.95 });
  const MS = { steel: std({ color: 0x5a6068, roughness: 0.45, metalness: 0.6 }), dark: std({ color: 0x1c1e22, roughness: 0.6, metalness: 0.4 }), glass: std({ color: 0x9ab8d0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.3, depthWrite: false }), white: std({ color: 0xeceae4, roughness: 0.5 }), yellow: std({ color: 0xf2c21c, roughness: 0.45 }), red: std({ color: 0xc0261e, roughness: 0.5 }), blue: std({ color: 0x1f4fa8, roughness: 0.5 }), green: std({ color: 0x1f6a3a, roughness: 0.6 }), trim: std({ color: 0xe9e2d2, roughness: 0.75 }), black: std({ color: 0x101114, roughness: 0.6 }), wood: std({ color: 0x7a5232, roughness: 0.8 }), conc: std({ color: 0x8a8884, roughness: 0.95 }), rubber: std({ color: 0x141416, roughness: 0.9 }), chrome: std({ color: 0xc8ccd0, roughness: 0.2, metalness: 0.9 }), stripe: std({ color: 0xe8e4d8, roughness: 0.8 }) };

  // ---- Bäume aus Laubkarten (Stamm, Äste, Krone aus gekreuzten Blattbüscheln) — ersetzt die Kugelbäume im Park
  function tree(x, z, h = 6, crown = 2.2, seed = 1) {
    const tr = rng(seed); B.add(bark, new THREE.CylinderGeometry(0.11, 0.2, h * 0.55, 9), x, Y + h * 0.275, z);
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + tr(); const L = h * 0.32; const gg = new THREE.CylinderGeometry(0.04, 0.09, L, 6); gg.translate(0, L / 2, 0); gg.rotateZ(0.6 + tr() * 0.3); gg.rotateY(a); B.add(bark, gg, x, Y + h * 0.45, z); }
    const cy = Y + h * 0.66; for (let i = 0; i < 34; i++) { const u = tr() * 2 - 1; const a = tr() * Math.PI * 2; const rr = Math.sqrt(1 - u * u) * crown * (0.55 + tr() * 0.5); const s = 1.3 + tr() * 0.9;
      const px = x + Math.cos(a) * rr; const py = cy + u * crown * 0.75 + 0.3; const pz = z + Math.sin(a) * rr; B.add(leaf, new THREE.PlaneGeometry(s, s), px, py, pz, tr() * 3, tr() * 3, tr() * 3); }
  }
  for (const [x, z] of trees) tree(x, z, 6.2 + r() * 1.4, 2.3 + r() * 0.5, Math.round(x * 7 + z * 3));
  for (const [x, z] of STREET_TREES) { tree(x, z, 5.4, 1.8, Math.round(x * 11)); B.box(MS.dark, x - 0.6, Y + 0.01, z - 0.6, x + 0.6, Y + 0.035, z + 0.6); for (let i = -2; i <= 2; i++) B.box(MS.steel, x + i * 0.22 - 0.015, Y + 0.035, z - 0.55, x + i * 0.22 + 0.015, Y + 0.045, z + 0.55); }
  // Hecken der Nachbarn bekommen Laub statt einfarbiger Kästen
  for (const [a, b] of hedges) { wallBox(B, hedgeMat, a, Y, FZ - 1.25, b, Y + 0.85, FZ - 0.85, 0.9); for (let x = a + 0.3; x < b - 0.2; x += 0.55) B.add(leaf, new THREE.PlaneGeometry(0.7, 0.55), x + r() * 0.2, Y + 0.85, FZ - 1.05 + (r() - 0.5) * 0.3, -0.3 + r() * 0.6, r() * 3, 0); }
  // Grasbüschel: Streifen vor den Häusern, Park, Ränder
  const tuft = (x, z, s) => { for (const ry of [0, Math.PI / 2]) B.add(grassM, new THREE.PlaneGeometry(s, s * 0.8), x, Y + s * 0.4 - 0.02, z, 0, ry + r() * 0.5, 0); };
  for (let x = -44; x < 27; x += 0.55) { if (Math.abs(x - 0.4) < 1.4) continue; tuft(x + r() * 0.3, FZ - 1.15 - r() * 0.6, 0.3 + r() * 0.3); }
  for (let i = 0; i < 170; i++) { const x = -44 + r() * 24.3; const z = FZ - 12.8 - r() * 7.4; if (x > -33.2 && x < -30.8) continue; if (z < FZ - 18.0 && z > FZ - 19.6) continue; tuft(x, z, 0.32 + r() * 0.35); }
  // Efeu an Hauswänden (Platten mit Efeu-Bild, leicht vor der Wand)
  const ivyAt = (x, y0, h, w, z, ry = Math.PI) => { for (let k = 0; k < Math.ceil(h / 1.6); k++) B.add(ivy, new THREE.PlaneGeometry(w, Math.min(1.8, h - k * 1.6 + 0.2)), x + (r() - 0.5) * 0.2, y0 + 0.9 + k * 1.6, z, 0, ry, (r() - 0.5) * 0.1); };
  ivyAt(-8.0, Y, 3.4, 1.9, FZ - 0.06); ivyAt(-34.4, Y, 2.8, 2.0, FZ - 0.06); ivyAt(26.0, Y, 3.6, 1.8, FZ - 0.06); ivyAt(19.5, Y, 2.4, 3.0, FZ + 23.97); ivyAt(36.0, Y, 2.2, 2.4, FZ + 23.97);

  // ---- Mittellinie, Gullys, Kanaldeckel, Bordstein-Abläufe
  for (let x = -44; x < 44; x += 6) { if (x > 21.5 && x < 27) continue; B.box(MS.stripe, x, Y - 0.095, FZ - 7.18, x + 3, Y - 0.089, FZ - 7.04); }
  const manhole = std({ map: canvasTex(128, 128, (x, w) => { x.fillStyle = '#1c1c1e'; x.fillRect(0, 0, w, w); x.strokeStyle = '#3a3a3c'; x.lineWidth = 6; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 6, 0, 7); x.stroke(); x.lineWidth = 3; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(20, 18 + i * 11); x.lineTo(108, 18 + i * 11); x.stroke(); } }), roughness: 0.4, metalness: 0.5, transparent: true, alphaTest: 0.5 });
  for (const [x, z] of [[-12, FZ - 6.0], [6, FZ - 8.9], [19, FZ - 6.1], [-36, FZ - 8.7]]) B.add(manhole, new THREE.CircleGeometry(0.38, 20), x, Y - 0.088, z, -Math.PI / 2, 0, 0);
  for (let x = -40; x < 44; x += 12) { B.box(MS.dark, x, Y - 0.1, FZ - 4.05, x + 0.55, Y - 0.088, FZ - 3.86); for (let i = 0; i < 5; i++) B.box(MS.steel, x + 0.04 + i * 0.1, Y - 0.087, FZ - 4.03, x + 0.07 + i * 0.1, Y - 0.085, FZ - 3.88); }

  // ---- Laternen: Lichtkegel und Lichtpfütze (bei Nacht sichtbar), dazu zwei neue Laternen gegenüber
  const coneT = canvasTex(64, 128, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const poolT = canvasTex(128, 128, (x, w) => { const gr = x.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  const coneM = new THREE.MeshBasicMaterial({ map: coneT, color: 0xffb060, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const poolM = new THREE.MeshBasicMaterial({ map: poolT, color: 0xffa450, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const newLamps = [[-10, FZ - 11.0], [8, FZ - 11.0]]; for (const [x, z] of newLamps) { B.add(MS.dark, new THREE.CylinderGeometry(0.05, 0.07, 4.2, 10), x, Y + 2.1, z); B.box(MS.dark, x - 0.05, Y + 4.1, z - 0.12, x + 0.5, Y + 4.2, z + 0.12); B.box(M.sodium, x + 0.1, Y + 4.08, z - 0.08, x + 0.45, Y + 4.1, z + 0.08); glow(g, x + 0.28, Y + 4.0, z, 0xffb060, 2.6, 0.45); }
  const heads = lamps.map(([x, z]) => [x - 0.28, Y + 4.0, z]).concat([[1.15, Y + 4.05, FZ - 2.3], [-27.5, Y + 3.5, FZ - 14.2]], newLamps.map(([x, z]) => [x + 0.28, Y + 4.0, z]));
  const nightFx = [];
  for (const [x, y, z] of heads) { const h = y - Y; const c = mesh(new THREE.ConeGeometry(h * 0.42, h, 24, 1, true), coneM, x, Y + h / 2, z, g); c.renderOrder = 2; const p = mesh(new THREE.PlaneGeometry(h * 1.5, h * 1.5), poolM, x, Y + 0.04, z, g, { rx: -Math.PI / 2 }); p.renderOrder = 1; nightFx.push(c, p); }

  // ---- Gegenüber: neue Häuserzeile mit drei Läden und Vorplatz (ersetzt die schlichten Häuser aus ludwigart.js)
  W.out.g.traverse((o) => { if (o.name === 'haus-gegenueber') o.visible = false; });
  wallBox(B, M.pave, -18.5, Y - 0.1, HOUSE_Z, 18.5, Y + 0.03, FAR.z1, 2); // Vorplatz vor den Läden
  const ROWG = [[-17, -9, M.wallA, 'SPÄTI MITTERNACHT', '#c070ff', '#2a0a3a'], [-7, 4, M.brickR, 'GETRÄNKE GERD', '#5aff8a', '#0a2a14']]; // seit 2026-11-21 steht bei x 6 bis 17 Elektro-Erwin (ludwigerwin.js, Laden zum Reingehen) statt dem Supermarkt
  const HH = 9.2; const lit = [];
  const shopInside = (seed, tint) => canvasTex(512, 256, (x, w, h) => { const sr = rng(seed); x.fillStyle = '#e8e2d0'; x.fillRect(0, 0, w, h); for (let s = 0; s < 4; s++) { x.fillStyle = '#6a6a66'; x.fillRect(0, 50 + s * 52, w, 5); for (let i = 0; i < 30; i++) { x.fillStyle = ['#e83a2a', '#3a8ae8', '#f2c81c', '#3ac85a', '#e87a2a', tint][(sr() * 6) | 0]; x.fillRect(6 + i * 17, 18 + s * 52, 12, 32); } } x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, h - 30, w, 30); });
  ROWG.forEach(([x0, x1, mat, name, neon, dark], i) => {
    wallBox(B, mat, x0, Y - 0.2, HOUSE_Z - 6, x1, Y + HH, HOUSE_Z); B.box(MS.trim, x0 - 0.05, Y + HH, HOUSE_Z - 6, x1 + 0.05, Y + HH + 0.25, HOUSE_Z + 0.15); B.box(MS.trim, x0, Y + 3.3, HOUSE_Z, x1, Y + 3.42, HOUSE_Z + 0.1); B.box(MS.dark, x0, Y - 0.2, HOUSE_Z, x1, Y + 0.35, HOUSE_Z + 0.04);
    for (let wx = x0 + 1.2; wx < x1 - 0.7; wx += 2.4) for (const wy of [Y + 4.7, Y + 7.5]) { const k = (r() * 5) | 0; B.add(winMats[k], new THREE.PlaneGeometry(1.0, 1.35), wx, wy, HOUSE_Z + 0.025); B.box(MS.trim, wx - 0.6, wy - 0.75, HOUSE_Z, wx + 0.6, wy - 0.68, HOUSE_Z + 0.12); B.box(MS.trim, wx - 0.58, wy + 0.68, HOUSE_Z, wx + 0.58, wy + 0.78, HOUSE_Z + 0.06); }
    const sx0 = x0 + 0.6; const sx1 = x1 - 2.2; const it = shopInside(80 + i, neon); const sm = std({ map: it, emissiveMap: it, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.6 }); lit.push(sm);
    B.add(sm, new THREE.PlaneGeometry(sx1 - sx0, 1.9), (sx0 + sx1) / 2, Y + 1.45, HOUSE_Z + 0.01); B.add(MS.glass, new THREE.PlaneGeometry(sx1 - sx0, 1.9), (sx0 + sx1) / 2, Y + 1.45, HOUSE_Z + 0.06); for (const [a, b2] of [[sx0 - 0.06, sx0], [sx1, sx1 + 0.06], [(sx0 + sx1) / 2 - 0.03, (sx0 + sx1) / 2 + 0.03]]) B.box(MS.dark, a, Y + 0.45, HOUSE_Z, b2, Y + 2.45, HOUSE_Z + 0.08);
    B.box(MS.dark, sx0 - 0.06, Y + 2.4, HOUSE_Z, sx1 + 0.06, Y + 2.46, HOUSE_Z + 0.08); const dx = x1 - 1.6; B.box(MS.dark, dx - 0.55, Y, HOUSE_Z, dx + 0.55, Y + 2.25, HOUSE_Z + 0.05); B.add(sm, new THREE.PlaneGeometry(0.8, 1.9), dx, Y + 1.05, HOUSE_Z + 0.055);
    const st = label(name, { w: 1024, h: 128, bg: dark, fg: neon, size: 84, glowC: neon }); const sgn = std({ map: st, emissiveMap: st, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.5 }); B.box(MS.dark, x0 + 0.4, Y + 2.6, HOUSE_Z, x1 - 0.4, Y + 3.25, HOUSE_Z + 0.14); B.add(sgn, new THREE.PlaneGeometry(x1 - x0 - 0.9, 0.58), (x0 + x1) / 2, Y + 2.925, HOUSE_Z + 0.145); glow(g, (x0 + x1) / 2, Y + 2.9, HOUSE_Z + 0.6, parseInt(neon.slice(1), 16), Math.min(6, x1 - x0), 0.16);
    B.box(MS.dark, x0 + 1.2 + i, Y + HH + 0.25, HOUSE_Z - 3.5, x0 + 1.8 + i, Y + HH + 1.3, HOUSE_Z - 2.9); // Schornstein
  });
  for (const [a, b2] of [[-18.5, -17], [-9, -7], [4, 6], [17, 18.5]]) { wallBox(B, M.brickR, a, Y - 0.2, HOUSE_Z - 0.3, b2, Y + 2.6, HOUSE_Z); B.box(MS.conc, a - 0.02, Y + 2.6, HOUSE_Z - 0.32, b2 + 0.02, Y + 2.7, HOUSE_Z + 0.02); }
  for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) B.box([MS.green, MS.red, MS.blue, MS.yellow][(i + k) % 4], -1.45 + i * 0.34, Y + 0.03 + k * 0.29, HOUSE_Z + 0.15, -1.15 + i * 0.34, Y + 0.3 + k * 0.29, HOUSE_Z + 0.6);
  if (false) for (let i = 0; i < 3; i++) { const cx = 9.4 + i * 0.4; B.box(MS.chrome, cx - 0.25, Y + 0.25, HOUSE_Z + 0.2, cx + 0.25, Y + 0.27, HOUSE_Z + 0.9); /* Einkaufswagen gehörten zum Supermarkt (vor Erwins Schaufenster stören sie) */ for (const [a, b2, c, d] of [[cx - 0.25, cx - 0.24, 0.25, 0.85], [cx + 0.24, cx + 0.25, 0.25, 0.85]]) B.box(MS.chrome, a, Y + c, HOUSE_Z + 0.2, b2, Y + d, HOUSE_Z + 0.9); B.box(MS.red, cx - 0.25, Y + 0.85, HOUSE_Z + 0.85, cx + 0.25, Y + 0.9, HOUSE_Z + 0.95); }
  for (const bxv of [-1.4, 10.5]) { B.box(MS.wood, bxv - 0.5, Y + 0.42, FZ - 17.25, bxv + 0.5, Y + 0.47, FZ - 16.85); B.box(MS.wood, bxv - 0.5, Y + 0.5, FZ - 17.28, bxv + 0.5, Y + 0.85, FZ - 17.22); for (const s of [-1, 1]) B.box(MS.dark, bxv + s * 0.42 - 0.03, Y, FZ - 17.25, bxv + s * 0.42 + 0.03, Y + 0.45, FZ - 16.85); }

  // ---- Gehweg gegenüber: Bushaltestelle, Haltestellenschild, Briefkasten, Litfaßsäule, Fahrradständer; Schilder und Poller am Zebrastreifen; Tempo 30; Mülleimer
  { const x0 = -6.6; const x1 = -3.4; const zb = FZ - 12.3; const zf = FZ - 11.15; B.box(MS.steel, x0, Y, zb - 0.06, x0 + 0.06, Y + 2.4, zf); B.box(MS.steel, x1 - 0.06, Y, zb - 0.06, x1, Y + 2.4, zf); B.box(MS.steel, x0, Y + 2.4, zb - 0.1, x1, Y + 2.5, zf + 0.1);
    B.add(MS.glass, new THREE.PlaneGeometry(x1 - x0, 2.2), (x0 + x1) / 2, Y + 1.25, zb); for (const x of [x0 + 0.03, x1 - 0.03]) B.add(MS.glass, new THREE.PlaneGeometry(zf - zb, 2.2), x, Y + 1.25, (zb + zf) / 2, 0, Math.PI / 2, 0);
    B.box(MS.wood, x0 + 0.4, Y + 0.45, zb + 0.05, x1 - 1.3, Y + 0.5, zb + 0.45); for (const x of [x0 + 0.5, x1 - 1.4]) B.box(MS.steel, x - 0.03, Y, zb + 0.1, x + 0.03, Y + 0.45, zb + 0.4);
    const ad = canvasTex(256, 384, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff4ab0'); gr.addColorStop(1, '#3a0a5a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '900 46px Bahnschrift, sans-serif'; x.fillText('ZACK!', w / 2, 120); x.font = '700 26px Bahnschrift, sans-serif'; x.fillText('ENERGY', w / 2, 160); x.fillStyle = '#ffd23a'; x.beginPath(); x.ellipse(w / 2, 260, 40, 80, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '700 20px Bahnschrift, sans-serif'; x.fillText('jetzt am Kiosk', w / 2, 360); });
    const adm = std({ map: ad, emissiveMap: ad, emissive: 0xffffff, emissiveIntensity: 0.6 }); lit.push(adm); B.add(adm, new THREE.PlaneGeometry(1.1, 1.65), x1 - 0.7, Y + 1.2, zb + 0.07); B.add(adm, new THREE.PlaneGeometry(1.1, 1.65), x1 - 0.7, Y + 1.2, zb - 0.04, 0, Math.PI, 0); B.box(MS.dark, x1 - 1.3, Y + 0.3, zb - 0.03, x1 - 0.1, Y + 2.1, zb + 0.06);
    B.add(MS.steel, new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), -2.9, Y + 1.3, FZ - 10.75); const hs = canvasTex(128, 128, (x, w) => { x.fillStyle = '#f2c21c'; x.beginPath(); x.arc(w / 2, w / 2, w / 2 - 4, 0, 7); x.fill(); x.strokeStyle = '#1f7a3a'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#1f7a3a'; x.font = '900 80px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('H', w / 2, w / 2 + 4); });
    const hm = std({ map: hs, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }); B.add(hm, new THREE.CircleGeometry(0.28, 24), -2.9, Y + 2.45, FZ - 10.75, 0, Math.PI / 2, 0); B.add(MS.white, new THREE.PlaneGeometry(0.35, 0.5), -2.86, Y + 1.7, FZ - 10.75, 0, Math.PI / 2, 0); }
  { B.box(MS.yellow, -9.22, Y + 0.55, FZ - 10.92, -8.78, Y + 1.15, FZ - 10.58); B.add(MS.yellow, new THREE.CylinderGeometry(0.22, 0.22, 0.34, 16, 1, false, 0, Math.PI), -9.0, Y + 1.15, FZ - 10.75, 0, 0, Math.PI / 2); B.box(MS.dark, -9.05, Y, FZ - 10.8, -8.95, Y + 0.55, FZ - 10.7); B.box(MS.black, -9.12, Y + 1.0, FZ - 10.585, -8.88, Y + 1.03, FZ - 10.57); }
  { const lit2 = canvasTex(512, 256, (x, w, h) => { const P = [['#ff4ab0', 'BRUNO LIVE'], ['#f2c81c', 'FLOHMARKT'], ['#3a8ae8', 'ZIRKUS'], ['#2ab85a', 'KINO'], ['#e8322a', 'LZ'], ['#f4f0e6', 'GRILLFEST']]; P.forEach(([c, t], i) => { const X = (i % 3) * 170; const Yp = Math.floor(i / 3) * 128; x.fillStyle = c; x.fillRect(X + 2, Yp + 2, 166, 124); x.fillStyle = c === '#f4f0e6' || c === '#f2c81c' ? '#1c1c1c' : '#ffffff'; x.font = '900 30px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText(t, X + 85, Yp + 72); }); });
    B.add(std({ map: lit2, roughness: 0.85 }), new THREE.CylinderGeometry(0.55, 0.55, 2.4, 24, 1, true), 5, Y + 1.5, FZ - 11.6); B.add(MS.green, new THREE.CylinderGeometry(0.58, 0.58, 0.3, 24), 5, Y + 0.15, FZ - 11.6); B.add(MS.green, new THREE.CylinderGeometry(0.66, 0.6, 0.18, 24), 5, Y + 2.79, FZ - 11.6); B.add(MS.green, new THREE.SphereGeometry(0.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 5, Y + 2.88, FZ - 11.6); }
  { for (let i = 0; i < 4; i++) { const x = 15.1 + i * 0.6; B.add(MS.steel, new THREE.TorusGeometry(0.3, 0.025, 6, 16, Math.PI), x, Y + 0.02, FZ - 12.05); } }
  for (const [x, z] of [[23.0, FZ - 3.7], [26.4, FZ - 3.7], [23.0, FZ - 10.55], [26.4, FZ - 10.55]]) { B.add(MS.white, new THREE.CylinderGeometry(0.07, 0.07, 0.9, 10), x, Y + 0.45, z); B.add(MS.red, new THREE.CylinderGeometry(0.072, 0.072, 0.1, 10), x, Y + 0.75, z); }
  const zebra = canvasTex(128, 128, (x, w) => { x.fillStyle = '#1f4fa8'; x.fillRect(0, 0, w, w); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(w / 2, 14); x.lineTo(w - 14, w - 16); x.lineTo(14, w - 16); x.closePath(); x.fill(); x.fillStyle = '#1c1c1c'; x.fillRect(36, 92, 56, 6); x.beginPath(); x.arc(64, 52, 7, 0, 7); x.fill(); x.fillRect(61, 58, 6, 22); });
  for (const [x, z, ry] of [[22.6, FZ - 3.5, Math.PI], [26.8, FZ - 10.8, 0]]) { B.add(MS.steel, new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), x, Y + 1.3, z); B.add(std({ map: zebra, roughness: 0.5 }), new THREE.PlaneGeometry(0.5, 0.5), x, Y + 2.35, z + (ry ? -0.04 : 0.04), 0, ry, 0); }
  { const t30 = canvasTex(128, 160, (x, w, h) => { x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, w, h); x.strokeStyle = '#1c1c1c'; x.lineWidth = 3; x.strokeRect(2, 2, w - 4, h - 4); x.fillStyle = '#fff'; x.beginPath(); x.arc(w / 2, 62, 46, 0, 7); x.fill(); x.strokeStyle = '#c8231c'; x.lineWidth = 10; x.stroke(); x.fillStyle = '#1c1c1c'; x.font = '900 44px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('30', w / 2, 78); x.font = '900 30px Bahnschrift, sans-serif'; x.fillText('ZONE', w / 2, 146); });
    B.add(MS.steel, new THREE.CylinderGeometry(0.035, 0.035, 2.6, 8), -12, Y + 1.3, FZ - 3.6); B.add(std({ map: t30, roughness: 0.5 }), new THREE.PlaneGeometry(0.45, 0.56), -12, Y + 2.25, FZ - 3.64, 0, Math.PI, 0);
    B.add(MS.steel, new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), 7.5, Y + 0.6, FZ - 3.6); B.add(MS.dark, new THREE.CylinderGeometry(0.2, 0.18, 0.5, 14, 1, true), 7.5, Y + 0.95, FZ - 3.82); }

  // ---- geparkte Autos in der Querstraße (gerundete Form aus einem Seitenprofil)
  const { body: bodyGeo, glass: glassGeo } = carGeo();
  const carGlass = std({ color: 0x1a222c, roughness: 0.1, metalness: 0.4 }); const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18); wheelGeo.rotateX(Math.PI / 2); const hubGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.05, 12); hubGeo.rotateX(Math.PI / 2); const headM = std({ color: 0xfff6e0, emissive: 0x302820, roughness: 0.3 }); const plate = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#f4f2ec'; x.fillRect(0, 0, w, h); x.fillStyle = '#1f4fa8'; x.fillRect(0, 0, 26, h); x.fillStyle = '#1c1c1c'; x.font = '900 40px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('LZ-KI 420', w / 2 + 12, 46); x.strokeStyle = '#1c1c1c'; x.lineWidth = 4; x.strokeRect(2, 2, w - 4, h - 4); }); const plateM = std({ map: plate, roughness: 0.5 });
  function carInto(add, x, z, ry, color) { const paint = std({ color, roughness: 0.35, metalness: 0.35 }); const c = Math.cos(ry); const s = Math.sin(ry); const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    add(paint, bodyGeo, x, Y - 0.08, z, 0, ry, 0); add(carGlass, glassGeo, x, Y - 0.08, z, 0, ry, 0);
    for (const [lx, lz] of [[-1.35, -0.84], [1.35, -0.84], [-1.35, 0.84], [1.35, 0.84]]) { const [wx, wz] = P(lx, lz); add(MS.rubber, wheelGeo, wx, Y + 0.25, wz, 0, ry, 0); const [hx, hz] = P(lx, lz * 1.1); add(MS.chrome, hubGeo, hx, Y + 0.25, hz, 0, ry, 0); }
    for (const sz of [-0.55, 0.55]) { const [fx, fz] = P(-2.2, sz); add(headM, new THREE.BoxGeometry(0.04, 0.12, 0.3), fx, Y + 0.62, fz, 0, ry, 0); const [bx2, bz2] = P(2.2, sz); add(MS.red, new THREE.BoxGeometry(0.04, 0.12, 0.28), bx2, Y + 0.66, bz2, 0, ry, 0); }
    for (const lx of [-2.22, 2.22]) { const [px, pz] = P(lx, 0); add(plateM, new THREE.PlaneGeometry(0.52, 0.12), px, Y + 0.45, pz, 0, ry + (lx < 0 ? -Math.PI / 2 : Math.PI / 2), 0); }
  }
  for (const [x, z, col] of PARKED) carInto(B.add, x, z, Math.PI / 2, col);
  B.box(MS.stripe, 27.15, Y + 0.013, FZ + 1.2, 27.25, Y + 0.017, FZ + 19); B.box(MS.stripe, 32.75, Y + 0.013, FZ + 1.2, 32.85, Y + 0.017, FZ + 19);

  // ---- Leben: Taxi, Fußgänger mit Hund, Vögel, Schornsteinrauch, Katze, flackernde Fernseher
  const taxi = new THREE.Group(); taxi.visible = false; g.add(taxi); carInto((m, geo, x, y, z, rx, ry, rz) => mesh(geo, m, x, y - Y, z, taxi, { rx, ry, rz }), 0, 0, 0, 0xf2c21c);
  { const ts = label('TAXI', { w: 256, h: 96, bg: '#1c1c1c', fg: '#ffd23a', size: 70 }); const tm = std({ map: ts, emissiveMap: ts, emissive: 0xffffff, emissiveIntensity: 0.9 }); mesh(new THREE.BoxGeometry(0.5, 0.16, 0.26), tm, 0.2, 1.47, 0, taxi); }
  const taxiBeam = glow(taxi, -2.6, 0.62, 0, 0xfff0c8, 2.4, 0); const TX = { t: 25 + r() * 30, on: false, x: 0, dir: -1 };
  const walkers = [{ look: { outfit: 'schlicht', shirt: 0x4a5a7a, cap: 0x2a2a30, brim: 0x18181c, pants: 0x2a2c32, skin: 0xd8a888, hair: 0x5a3a22, bart: 'schnauzer' }, z: FZ - 13.6, x0: -16, x1: 16, speed: 1.15 },
    { look: { outfit: 'schlicht', shirt: 0x8a3a4a, cap: 0x6a2a2a, brim: 0x2a1414, pants: 0x30343a, skin: 0xe8bc98, hair: 0x7a3a1a, frau: 'bob', rock: 0x30343a, face: 'grin' }, z: FZ - 3.0, x0: -40, x1: 20, speed: 0.95 }]
    .map((w, i) => { const P = createPerson(scene, w.look); P.place(w.x0 + 4 + i * 9, Y + 0.02, w.z, Math.PI / 2); P.mode = 'walk'; P.update(0.016, 0); return { ...w, P, dir: 1, pause: 0 }; });
  const dogM = std({ color: 0x8a5a2a, roughness: 0.9 }); const dog = new THREE.Group(); g.add(dog); const dogBody = mesh(new THREE.CapsuleGeometry(0.11, 0.32, 4, 8), dogM, 0, 0.32, 0, dog, { rx: Math.PI / 2 }); void dogBody;
  mesh(new THREE.SphereGeometry(0.1, 10, 8), dogM, 0, 0.42, 0.28, dog); mesh(new THREE.BoxGeometry(0.07, 0.06, 0.1), dogM, 0, 0.4, 0.38, dog); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.04, 0.08, 0.03), dogM, s * 0.06, 0.52, 0.27, dog);
  const legs = [[-0.07, 0.15], [0.07, 0.15], [-0.07, -0.15], [0.07, -0.15]].map(([x, z]) => { const l = new THREE.Group(); l.position.set(x, 0.24, z); dog.add(l); mesh(new THREE.BoxGeometry(0.045, 0.24, 0.045), dogM, 0, -0.12, 0, l); return l; }); const dogTail = new THREE.Group(); dogTail.position.set(0, 0.38, -0.24); dog.add(dogTail); mesh(new THREE.BoxGeometry(0.03, 0.03, 0.16), dogM, 0, 0.04, -0.07, dogTail, { rx: -0.6 });
  const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xc8231c })); g.add(leash);
  const birdM = new THREE.MeshBasicMaterial({ color: 0x1a1c22, side: THREE.DoubleSide, fog: false }); const birds = []; for (let i = 0; i < 5; i++) { const b = new THREE.Group(); g.add(b); const wl = mesh(new THREE.PlaneGeometry(0.35, 0.1), birdM, -0.16, 0, 0, b); const wr = mesh(new THREE.PlaneGeometry(0.35, 0.1), birdM, 0.16, 0, 0, b); birds.push({ b, wl, wr, off: [i * 0.9 - 1.8, Math.abs(i - 2) * -0.6, Math.abs(i - 2) * 0.8] }); } const BD = { t: 8, on: false, x: 0, z: 0, dx: 0, dz: 0 };
  const smokeT = canvasTex(64, 64, (x, w) => { const gr = x.createRadialGradient(w / 2, w / 2, 2, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(200,200,205,.55)'); gr.addColorStop(1, 'rgba(200,200,205,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  const smoke = []; for (const [cx, cy, cz] of [[2.95, Y + 8.85, FZ + 2.75], [-15.5, Y + HH + 1.35, HOUSE_Z - 3.2], [8.5, Y + HH + 1.35, HOUSE_Z - 3.2]]) for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeT, transparent: true, depthWrite: false, opacity: 0 })); s.userData = { cx, cy, cz, p: i / 7 }; g.add(s); smoke.push(s); }
  const cat = new THREE.Group(); cat.position.set(10.6, Y + 0.86, FZ - 1.05); cat.rotation.y = 2.6; g.add(cat); const cM = std({ color: 0x141416, roughness: 0.8 }); const cb = mesh(new THREE.SphereGeometry(1, 12, 8), cM, 0, 0.12, 0, cat); cb.scale.set(0.09, 0.13, 0.12); mesh(new THREE.SphereGeometry(0.065, 10, 8), cM, 0, 0.29, 0.05, cat);
  for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.022, 0.05, 6), cM, s * 0.035, 0.36, 0.05, cat); const eyeM = std({ color: 0x000000, emissive: 0xc8ff40, emissiveIntensity: 1.5 }); for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.009, 6, 4), eyeM, s * 0.022, 0.3, 0.11, cat);
  const catTail = new THREE.Group(); catTail.position.set(0, 0.05, -0.1); cat.add(catTail); mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.28, 6), cM, 0, -0.02, -0.12, catTail, { rx: 1.4 });
  const tvMat = winMats[2]; // Fenster mit Fernseher flackern
  const fog = new THREE.FogExp2(0x0c1220, 0.02); if (!scene.fog) scene.fog = fog;
  let lastL = -1; let night = 1;
  function setDay(light) { if (Math.abs(light - lastL) < 0.004) return; lastL = light; night = 1 - light; coneM.opacity = 0.14 * night; poolM.opacity = 0.32 * night; for (const m of lit) m.emissiveIntensity = 0.12 + 0.55 * night;
    fog.color.setRGB(0.047 + 0.62 * light, 0.07 + 0.66 * light, 0.125 + 0.66 * light); fog.density = 0.02 - 0.013 * light; }
  function update(t, dt, px, pz, policeOn) {
    // Taxi fährt ab und zu vorbei (nicht gleichzeitig mit der Streife)
    if (!TX.on) { TX.t -= dt; if (TX.t <= 0 && !policeOn) { TX.on = true; TX.dir = r() < 0.5 ? -1 : 1; TX.x = TX.dir > 0 ? -66 : 66; taxi.visible = true; taxi.rotation.y = TX.dir > 0 ? 0 : Math.PI; taxi.position.z = TX.dir > 0 ? FZ - 6.7 : FZ - 9.0; } }
    else { TX.x += TX.dir * 11 * dt; taxi.position.set(TX.x, Y, taxi.position.z); taxiBeam.material.opacity = 0.7 * night; if (Math.abs(TX.x) > 67) { TX.on = false; taxi.visible = false; TX.t = 35 + r() * 45; } }
    for (const w of walkers) { const P = w.P; if (w.pause > 0) { w.pause -= dt; P.mode = 'stand'; P.lookAt = null; } else { const tx = w.dir > 0 ? w.x1 : w.x0; if (walkTo(P, tx, w.z, dt, w.speed)) { w.dir = -w.dir; w.pause = 2 + r() * 4; } } P.update(dt, t); }
    { const w = walkers[0]; const P = w.P; const back = w.dir > 0 ? -1 : 1; const dz2 = 0.55; dog.position.set(P.x + back * -1.1 * (w.pause > 0 ? 0.6 : 1), Y + 0.02, P.z + dz2); dog.rotation.y = w.pause > 0 ? dog.rotation.y : (w.dir > 0 ? Math.PI / 2 : -Math.PI / 2); const run = w.pause > 0 ? 0 : 1;
      legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 12 + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI : 0)) * 0.5 * run; }); dogTail.rotation.y = Math.sin(t * (run ? 10 : 4)) * 0.5; const a = leash.geometry.attributes.position; a.setXYZ(0, P.x + 0.2 * w.dir, Y + 0.95, P.z + 0.15); a.setXYZ(1, dog.position.x, Y + 0.42, dog.position.z); a.needsUpdate = true; }
    if (!BD.on) { BD.t -= dt; if (BD.t <= 0 && night < 0.85) { BD.on = true; const a = r() * Math.PI * 2; BD.x = px - Math.cos(a) * 60; BD.z = pz - Math.sin(a) * 60; BD.dx = Math.cos(a) * 9; BD.dz = Math.sin(a) * 9; } }
    else { BD.x += BD.dx * dt; BD.z += BD.dz * dt; const yaw = Math.atan2(BD.dx, BD.dz); birds.forEach((b, i) => { const [ox, oy, oz] = b.off; b.b.position.set(BD.x + ox * Math.cos(yaw) - oz * Math.sin(yaw), Y + 16 + oy, BD.z - ox * Math.sin(yaw) - oz * Math.cos(yaw)); b.b.rotation.y = yaw; const f = Math.sin(t * 14 + i) * 0.6; b.wl.rotation.z = f; b.wr.rotation.z = -f; b.b.visible = true; });
      if (Math.hypot(BD.x - px, BD.z - pz) > 70) { BD.on = false; BD.t = 25 + r() * 30; for (const b of birds) b.b.visible = false; } }
    for (const s of smoke) { const u = s.userData; const k = (t * 0.12 + u.p) % 1; s.position.set(u.cx + k * 1.2, u.cy + k * 3.2, u.cz + Math.sin(k * 4 + u.p * 9) * 0.3); s.scale.setScalar(0.5 + k * 2.2); s.material.opacity = 0.42 * Math.sin(k * Math.PI) * (0.4 + 0.6 * night); }
    catTail.rotation.y = Math.sin(t * 1.3) * 0.5; if (tvMat) tvMat.emissiveIntensity = (0.15 + 0.75 * night) * (0.75 + Math.sin(t * 9) * 0.12 + Math.sin(t * 23) * 0.1);
  }
  return { update, setDay, fog, taxi, walkers, dog };
}
