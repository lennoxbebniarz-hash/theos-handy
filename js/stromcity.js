// Theos Seitenscheidel - Strom-Spiel: die Stadt zwischen Halle und Energiedepot. Hauptstraße mit Gehwegen, Querstraße, Häuser mit
// Läden, Dönerladen mit Parkplatz, Brunnenplatz, Laternen, Bänke, Ampeln, parkende Autos. Die Häuser sind Kulisse (nicht begehbar).
// W.cityPower (0 bis 1): Seit Brunos Geschirrspüler ist die Stadt dunkel, erst nach dem letzten Auftrag leuchten die Fenster wieder.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { buildVehicle } from './parkart.js';
import { CITY, DOENER, ROAD_Z } from './stromlogic.js';

const PAL = [ // Wandfarbe, Fensterrahmen, Dach
  ['#d9c9a8', '#f4efe2', 0x8a4a36], ['#c9836a', '#f2e6d8', 0x5a3a30], ['#b9c7cf', '#ffffff', 0x4a5258], ['#e2d28a', '#fbf6e2', 0x8a4a36], ['#9aa6a0', '#e8ece8', 0x3c4246], ['#d7a9a4', '#fff4f0', 0x6a3a34], ['#c8c2b6', '#f0ece4', 0x4a4a4e],
];
const SHOPS = [['BÄCKEREI KRÜMEL', '#b8742a'], ['SPÄTI 24', '#2a6ab8'], ['FRISEUR SCHNIPP', '#b82a6a'], ['APOTHEKE', '#c0332a'], ['FAHRRAD-MAX', '#2a8a4a'], ['EISDIELE VENEZIA', '#d85a8a'], ['WASCHSALON', '#2a8aa8'], ['BLUMEN ROSI', '#4a9a3a'], ['PIZZERIA NAPOLI', '#a83a2a'], ['KIOSK', '#8a6a2a'], ['BUCHLADEN', '#5a4a8a'], ['SPARKASSE', '#c0332a'], ['POST', '#d8a81a'], ['HANDY-DOKTOR', '#3a3a3a']];

export function buildCity(kit) {
  const { W, scene, add, B, box, circle, std, ctex, decal, strip, put, inst, flatInst, label, R, PAVE, ASPHALT } = kit;
  const bucket = new Map(); const push = (key, mat, g) => { let b = bucket.get(key); if (!b) { b = { mat, list: [] }; bucket.set(key, b); } b.list.push(g); };
  const noise = (c, w, h, n, cols, size) => { for (let i = 0; i < n; i++) { c.fillStyle = cols[(Math.random() * cols.length) | 0]; const s = size * (0.4 + Math.random()); c.fillRect(Math.random() * w, Math.random() * h, s, s * (0.6 + Math.random() * 2.2)); } };
  // Fassaden: eine Kachel mit 2 x 2 Fenstern, dazu eine Leuchtkarte für die Nacht
  const walls = PAL.map(([wallC, frameC], k) => {
    const lit = [[0, 0], [1, 1], [k % 2, (k + 1) % 2]]; const draw = (c, w, h, glow) => { c.fillStyle = glow ? '#000' : wallC; c.fillRect(0, 0, w, h); if (!glow) { noise(c, w, h, 900, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.05)'], 4); c.fillStyle = 'rgba(0,0,0,.10)'; c.fillRect(0, h / 2 - 2, w, 3); c.fillRect(0, h - 3, w, 3); }
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x = i * 128 + 36; const y = j * 128 + 26; const on = lit.some(([a, b]) => a === i && b === j);
        if (glow) { if (on) { c.fillStyle = (i + j) % 2 ? '#ffd9a0' : '#ffe9c4'; c.fillRect(x + 4, y + 4, 48, 64); } continue; }
        c.fillStyle = frameC; c.fillRect(x - 4, y - 4, 64, 80); c.fillStyle = on ? '#6f8794' : '#4c6470'; c.fillRect(x, y, 56, 72); const g = c.createLinearGradient(x, y, x + 56, y + 72); g.addColorStop(0, 'rgba(255,255,255,.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(x, y, 56, 72);
        c.fillStyle = frameC; c.fillRect(x + 26, y, 4, 72); c.fillRect(x, y + 30, 56, 3); c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x - 6, y + 76, 68, 5); if ((i + j + k) % 3 === 0) { c.fillStyle = 'rgba(240,230,210,.55)'; c.fillRect(x, y, 14, 72); c.fillRect(x + 42, y, 14, 72); } } };
    const map = ctex(256, 256, (c, w, h) => draw(c, w, h, false)); const em = ctex(256, 256, (c, w, h) => draw(c, w, h, true)); map.wrapS = map.wrapT = em.wrapS = em.wrapT = THREE.RepeatWrapping;
    return std({ map, emissive: 0xffffff, emissiveMap: em, emissiveIntensity: 0, roughness: 0.85, envMapIntensity: 0.4 });
  });
  const shopT = ctex(256, 256, (c, w, h) => { c.fillStyle = '#3a3c40'; c.fillRect(0, 0, w, h); c.fillStyle = '#23262a'; c.fillRect(0, h - 40, w, 40); const g = c.createLinearGradient(0, 30, w, h - 50); g.addColorStop(0, '#9fc0d0'); g.addColorStop(0.5, '#5a7886'); g.addColorStop(1, '#84a6b6'); c.fillStyle = g; c.fillRect(14, 30, w - 28, h - 80); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.moveTo(30, 30); c.lineTo(110, 30); c.lineTo(50, h - 50); c.lineTo(14, h - 50); c.fill(); c.fillStyle = '#23262a'; c.fillRect(w / 2 - 3, 30, 6, h - 80); c.fillRect(0, 0, w, 22); }); shopT.wrapS = THREE.RepeatWrapping;
  const shopM = std({ map: shopT, roughness: 0.35, metalness: 0.2, envMapIntensity: 0.8, emissive: 0xffe6b0, emissiveMap: shopT, emissiveIntensity: 0 });
  const roofs = new Map(); const roofM = (col) => { let m = roofs.get(col); if (!m) { m = std({ color: col, roughness: 0.9 }); roofs.set(col, m); } return m; };
  const quad = (key, mat, x, y, z, w, h, ry, ur, vr) => { const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ur, uv.getY(i) * vr); g.rotateY(ry); g.translate(x, y, z); push(key, mat, g); };
  const G0 = 3.4; const FL = 3.0; const signs = [];
  // Haus: Erdgeschoss (vorn Schaufenster), darüber Stockwerke mit Fenstern, Dach flach oder mit Giebel
  function house(x0, x1, z0, z1, floors, k, o = {}) {
    const p = k % PAL.length; const wm = walls[p]; const w = x1 - x0; const d = z1 - z0; const hh = G0 + floors * FL; const cx = (x0 + x1) / 2; const cz = (z0 + z1) / 2;
    const sides = [['s', cx, z1, w, 0], ['n', cx, z0, w, Math.PI], ['e', x1, cz, d, Math.PI / 2], ['w', x0, cz, d, -Math.PI / 2]];
    for (const [id, a, b, len, ry] of sides) { const px = id === 's' || id === 'n' ? a : a; const pz = id === 's' || id === 'n' ? b : b; const ur = Math.max(1, Math.round(len / 6.4));
      quad('w' + p, wm, px, G0 + floors * FL / 2, pz, len, floors * FL, ry, ur, floors / 2);
      if (o.front === id && o.shop !== false) quad('shop', shopM, px, G0 / 2, pz, len, G0, ry, Math.max(1, Math.round(len / 4)), 1); else quad('w' + p, wm, px, G0 / 2, pz, len, G0, ry, ur, 0.5); }
    const rm = roofM(PAL[p][2]);
    if (o.gable) { const along = w >= d; const L = along ? w : d; const S = (along ? d : w) / 2 + 0.35; const rh = Math.min(3.2, S * 0.75); const g = new THREE.BufferGeometry(); const a = -L / 2 - 0.3; const b2 = L / 2 + 0.3;
      const P = [a, 0, -S, b2, 0, -S, b2, rh, 0, a, rh, 0, a, 0, S, b2, 0, S]; g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex([0, 3, 2, 0, 2, 1, 4, 5, 2, 4, 2, 3, 0, 4, 3, 1, 2, 5]); g.computeVertexNormals(); const ng = g.toNonIndexed(); ng.computeVertexNormals(); if (!along) ng.rotateY(Math.PI / 2); ng.translate(cx, hh, cz); push('roof' + PAL[p][2], rm, ng); }
    else { const g = new THREE.BoxGeometry(w + 0.3, 0.5, d + 0.3); g.translate(cx, hh + 0.25, cz); push('roof' + PAL[p][2], rm, g.toNonIndexed()); if (floors > 2 && R() < 0.6) { const u = new THREE.BoxGeometry(1.6, 1.2, 1.6); u.translate(cx + (R() - 0.5) * w * 0.4, hh + 1.1, cz + (R() - 0.5) * d * 0.4); push('roof' + PAL[p][2], rm, u.toNonIndexed()); } }
    box(x0, x1, z0, z1, 'boden', { veh: true });
    if (o.shop) signs.push({ text: o.shop[0], col: o.shop[1], front: o.front, x0, x1, z0, z1 });
  }
  const X0 = CITY.x0; const X1 = CITY.x1; const NZ = ROAD_Z - 6.4; const SZ = ROAD_Z + 6.4; const CX0 = 180; const CX1 = 188; let si = 0; const shop = () => SHOPS[si++ % SHOPS.length];
  // Reihe an der Hauptstraße: Nordseite (Front nach Süden), Südseite (Front nach Norden)
  const row = (from, to, side, skip) => { let x = from; let k = Math.floor(R() * 7); while (x < to - 6) { const w = Math.min(to - x, 9 + Math.floor(R() * 4) * 2); const dep = 8 + Math.floor(R() * 3); const fl = 2 + Math.floor(R() * 3); if (!(skip && x < skip[1] && x + w > skip[0])) { if (side < 0) house(x, x + w - 0.4, NZ - dep, NZ, fl, k, { front: 's', shop: shop(), gable: R() < 0.45 }); else house(x, x + w - 0.4, SZ, SZ + dep, fl, k, { front: 'n', shop: shop(), gable: R() < 0.45 }); } x += w; k += 1 + Math.floor(R() * 3); } };
  row(X0 + 2, 148, -1); row(190, X1 - 2, -1); row(X0 + 2, CX0 - 2, 1); row(206, X1 - 2, 1);
  // Querstraße: Häuser links und rechts
  for (const [z0, z1] of [[CITY.z0 + 2, NZ - 12], [SZ + 13, CITY.z1 - 2]]) { let z = z0; let k = 3; while (z < z1 - 6) { const d = Math.min(z1 - z, 9 + Math.floor(R() * 3) * 2); house(CX0 - 2 - 9, CX0 - 2, z, z + d - 0.4, 2 + Math.floor(R() * 3), k, { front: 'e', shop: R() < 0.5 ? shop() : null, gable: R() < 0.4 }); house(CX1 + 2, CX1 + 2 + 9, z, z + d - 0.4, 2 + Math.floor(R() * 3), k + 2, { front: 'w', shop: R() < 0.5 ? shop() : null, gable: R() < 0.4 }); z += d; k += 3; } }
  // zweite Reihe als Kulisse: höhere Blöcke hinter den Läden
  for (const [x0, x1, z0, z1, fl, k] of [[104, 122, -18, -4, 5, 2], [128, 146, -20, -6, 6, 4], [150, 166, -6, 8, 4, 6], [196, 216, -18, -2, 6, 0], [106, 126, 56, 72, 5, 5], [132, 150, 60, 78, 7, 2], [154, 172, 54, 70, 4, 1], [200, 220, 58, 76, 6, 3]]) house(x0, x1, z0, z1, fl, k, { front: null, shop: false });
  // Dönerladen: Hausblock dahinter, offene Theke vorn (Modell), daneben der Parkplatz
  { const D = DOENER; const cx = (D.x0 + D.x1) / 2; const fz = 22.0; house(D.x0, D.x1, D.z0, 20.1, 3, 1, { front: null, shop: false });
    const brick = std({ color: 0x9a5a44, roughness: 0.9 }); for (const [a, b] of [[D.x0, cx - 3.2], [cx + 3.2, D.x1]]) add(B(b - a, 3.45, 2.4), brick, (a + b) / 2, 1.725, 21.3); add(B(D.x1 - D.x0 + 0.3, 0.3, 2.9), std({ color: 0x4a4a4e, roughness: 0.9 }), cx, 3.6, 21.35);
    const dm = put('Doener_Laden', cx, 0.02, fz, 0); W.doenerModel = dm; box(D.x0, D.x1, 20.1, fz + 0.55, 'boden', { veh: true });
    const sg = label(1024, 192, (c, w, h) => { c.fillStyle = '#b8201a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd21a'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#fff6d8'; c.font = '900 118px Bahnschrift'; c.textAlign = 'center'; c.fillText('THEOS DÖNER', w / 2, 136); }, { glow: 0.9 }); add(B(8.2, 1.5, 0.14), std({ color: 0x2a2a2a, roughness: 0.6 }), cx, 4.55, 22.6); add(new THREE.PlaneGeometry(8, 1.4), sg, cx, 4.55, 22.68, { cast: false });
    const karte = label(512, 256, (c, w, h) => { c.fillStyle = '#1a1410'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd21a'; c.font = '800 44px Bahnschrift'; c.textAlign = 'left'; c.fillText('Döner', 30, 70); c.fillText('Ayran', 30, 140); c.fillText('Dönerteller', 30, 210); c.textAlign = 'right'; c.fillStyle = '#fff'; c.fillText('5 €', w - 30, 70); c.fillText('2,50 €', w - 30, 140); c.fillText('9 €', w - 30, 210); }, { glow: 0.8 }); add(new THREE.PlaneGeometry(1.4, 0.6), karte, cx, 2.77, fz - 1.83, { cast: false });
    const l = new THREE.PointLight(0xffe2b0, 16, 10, 1.7); l.position.set(cx, 2.6, fz + 0.4); scene.add(l); W.lamps.push(l);
    W.doener = { x: cx + 0.3, z: fz - 0.75, yaw: 0, counter: { x: cx + 0.3, z: fz + 1.25 } };
    strip(163, 177.5, D.z0 + 1, NZ, ASPHALT, { rep: 6, y: 0.026 }); const lm = decal(std({ color: 0xf2f0e8, roughness: 0.6 }), 2); for (let x = 163.4; x <= 177.4; x += 2.8) add(new THREE.PlaneGeometry(0.12, 5.2).rotateX(-Math.PI / 2), lm, x, 0.034, 18.8, { cast: false });
    const ps = label(128, 128, (c, w, h) => { c.fillStyle = '#1a4aa8'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 100px Bahnschrift'; c.textAlign = 'center'; c.fillText('P', w / 2, 100); }); add(B(0.08, 2.6, 0.08), std({ color: 0x6e747a, metalness: 0.7, roughness: 0.4 }), 162.6, 1.3, 23.3); add(new THREE.PlaneGeometry(0.7, 0.7), ps, 162.6, 2.4, 23.36, { cast: false }); }
  // Fassaden und Dächer zusammenfassen (wenige Zeichenaufrufe)
  for (const [key, b] of bucket) { const roof = key.startsWith('roof'); const g = mergeGeometries(b.list.map((q) => { const n = q.index ? q.toNonIndexed() : q; if (roof) n.deleteAttribute('uv'); return n; })); const m = new THREE.Mesh(g, b.mat); m.castShadow = key.startsWith('roof') || key.startsWith('w'); m.receiveShadow = true; scene.add(m); }
  // Ladenschilder
  for (const s of signs) { const along = s.front === 's' || s.front === 'n'; const len = Math.min(along ? s.x1 - s.x0 : s.z1 - s.z0, 9) - 1.2; const mat = label(512, 96, (c, w, h) => { c.fillStyle = s.col; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `800 ${s.text.length > 14 ? 44 : 56}px Bahnschrift`; c.textAlign = 'center'; c.fillText(s.text, w / 2, 66); }, { glow: 0.55 });
    const cx = (s.x0 + s.x1) / 2; const cz = (s.z0 + s.z1) / 2; const y = G0 - 0.42; const g = new THREE.PlaneGeometry(len, len * 96 / 512 > 0.9 ? 0.9 : Math.max(0.6, len * 0.13));
    if (s.front === 's') add(g, mat, cx, y, s.z1 + 0.05, { cast: false }); else if (s.front === 'n') add(g, mat, cx, y, s.z0 - 0.05, { cast: false, ry: Math.PI }); else if (s.front === 'e') add(g, mat, s.x1 + 0.05, y, cz, { cast: false, ry: Math.PI / 2 }); else add(g, mat, s.x0 - 0.05, y, cz, { cast: false, ry: -Math.PI / 2 }); }

  // ---------------- Straßen, Gehwege, Bordsteine ----------------
  strip(CX0, CX1, CITY.z0, ROAD_Z - 4, ASPHALT, { rep: 8, y: 0.026 }); strip(CX0, CX1, ROAD_Z + 4, CITY.z1, ASPHALT, { rep: 8, y: 0.026 });
  const walk = (x0, x1, z0, z1) => strip(x0, x1, z0, z1, PAVE, { rep: 2.4, y: 0.03, rough: 0.9, k: 1.5 });
  walk(X0, CX0, NZ, ROAD_Z - 4); walk(CX1, X1, NZ, ROAD_Z - 4); walk(X0, CX0, ROAD_Z + 4, SZ); walk(CX1, X1, ROAD_Z + 4, SZ); walk(CX0 - 2, CX0, CITY.z0, NZ); walk(CX1, CX1 + 2, CITY.z0, NZ); walk(CX0 - 2, CX0, SZ, CITY.z1); walk(CX1, CX1 + 2, SZ, CITY.z1); walk(190, 206, SZ, SZ + 14);
  const curb = std({ color: 0x8e8c86, roughness: 0.9 }); for (const [x0, x1] of [[X0, CX0], [CX1, X1]]) for (const s of [-1, 1]) add(B(x1 - x0, 0.1, 0.16), curb, (x0 + x1) / 2, 0.05, ROAD_Z + s * 4.08, { cast: false });
  { const lm = decal(std({ color: 0xf2f0e8, roughness: 0.6 }), 2); for (const [x, z0] of [[CX0 - 3.4, ROAD_Z - 3.6], [CX1 + 3.4, ROAD_Z - 3.6]]) for (let i = 0; i < 9; i++) add(new THREE.PlaneGeometry(2.6, 0.45).rotateX(-Math.PI / 2), lm, x, 0.034, z0 + i * 0.9, { cast: false }); }
  // Ortsschild
  { const m = label(512, 256, (c, w, h) => { c.fillStyle = '#f2c81a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#16171a'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16); c.fillStyle = '#16171a'; c.font = '900 88px Bahnschrift'; c.textAlign = 'center'; c.fillText('Theostadt', w / 2, 130); c.font = '700 40px Bahnschrift'; c.fillText('Kreis Seitenscheidel', w / 2, 200); }); const pm = std({ color: 0x6e747a, metalness: 0.7, roughness: 0.4 });
    for (const [x, ry] of [[X0 - 3, -Math.PI / 2], [X1 + 3, Math.PI / 2]]) { for (const dz of [-0.8, 0.8]) add(B(0.08, 2.6, 0.08), pm, x, 1.3, ROAD_Z - 5.6 + dz); add(new THREE.PlaneGeometry(2.2, 1.1), m, x + (ry < 0 ? -0.06 : 0.06), 2.0, ROAD_Z - 5.6, { ry, cast: false }); circle(x, ROAD_Z - 5.6, 0.9); } }
  // ---------------- Straßenmöbel ----------------
  const lamps = []; const benches = []; const bins = []; const hyd = []; const pots = []; const poll = []; const trees = [];
  for (let x = X0 + 6; x < X1 - 4; x += 21) { if (x > CX0 - 5 && x < CX1 + 5) continue; lamps.push({ x, z: ROAD_Z - 4.6, ry: -Math.PI / 2 }); lamps.push({ x: x + 10.5, z: ROAD_Z + 4.6, ry: Math.PI / 2 }); circle(x, ROAD_Z - 4.6, 0.25); circle(x + 10.5, ROAD_Z + 4.6, 0.25); }
  for (const z of [CITY.z0 + 8, NZ - 14, SZ + 16, CITY.z1 - 10]) { lamps.push({ x: CX0 - 0.6, z, ry: 0 }); lamps.push({ x: CX1 + 0.6, z: z + 6, ry: Math.PI }); }
  for (let x = X0 + 14; x < X1 - 8; x += 26) { if ((x > 146 && x < 192)) continue; benches.push({ x, z: NZ + 0.55, ry: 0 }); bins.push({ x: x + 1.6, z: NZ + 0.5 }); benches.push({ x: x + 12, z: SZ - 0.55, ry: Math.PI }); pots.push({ x: x + 5, z: NZ + 0.5 }); pots.push({ x: x + 17, z: SZ - 0.5 }); trees.push({ x: x + 8.5, z: ROAD_Z - 5.4, ry: R() * 6, s: 1.25 }); trees.push({ x: x - 4, z: ROAD_Z + 5.4, ry: R() * 6, s: 1.2 }); }
  hyd.push({ x: 126, z: ROAD_Z - 4.8 }, { x: 212, z: ROAD_Z + 4.8 }, { x: CX1 + 1, z: 6 }); for (const [x, z] of [[CX0 - 1, ROAD_Z - 4.7], [CX1 + 1, ROAD_Z - 4.7], [CX0 - 1, ROAD_Z + 4.7], [CX1 + 1, ROAD_Z + 4.7], [162.4, ROAD_Z - 4.5], [148.6, ROAD_Z - 4.5]]) poll.push({ x, z });
  inst('Laterne', lamps); inst('Parkbank', benches); inst('Muelleimer', bins); inst('Hydrant', hyd); inst('Blumenkuebel', pots); inst('Poller', poll); flatInst('Baum_Laub_Jung', trees); for (const t of trees) circle(t.x, t.z, 0.2); for (const b of benches) circle(b.x, b.z, 0.55, { veh: true }); for (const p of pots) circle(p.x, p.z, 0.55);
  inst('Ampel', [{ x: CX0 - 0.7, z: ROAD_Z - 4.6, ry: -Math.PI / 2 }, { x: CX1 + 0.7, z: ROAD_Z + 4.6, ry: Math.PI / 2 }, { x: CX1 + 0.7, z: ROAD_Z - 4.6, ry: Math.PI }, { x: CX0 - 0.7, z: ROAD_Z + 4.6, ry: 0 }]);
  put('Bushaltestelle', 128, 0, SZ - 0.9, Math.PI); circle(128, SZ - 1.2, 1.2); put('Briefkasten', 143, 0, NZ + 0.4, 0); inst('Verkehrsschild', [{ x: X0 + 1, z: ROAD_Z + 5, ry: -Math.PI / 2 }, { x: CX0 - 1.2, z: NZ - 6, ry: Math.PI }]);
  // Brunnenplatz
  { const fx = 198; const fz = SZ + 7; const stone = std({ color: 0xb4b1a8, roughness: 0.85 }); add(new THREE.CylinderGeometry(2.7, 2.9, 0.55, 22), stone, fx, 0.27, fz); add(new THREE.CylinderGeometry(2.4, 2.4, 0.1, 22), std({ color: 0x3a8aa8, roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.85 }), fx, 0.5, fz, { cast: false }); add(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 10), stone, fx, 0.95, fz); add(new THREE.CylinderGeometry(0.9, 0.3, 0.3, 14), stone, fx, 1.85, fz); circle(fx, fz, 3.0);
    inst('Parkbank', [{ x: fx - 5, z: fz, ry: Math.PI / 2 }, { x: fx + 5, z: fz, ry: -Math.PI / 2 }, { x: fx, z: fz + 5, ry: Math.PI }]); flatInst('Baum_Laub_Jung', [{ x: fx - 6, z: fz + 5, s: 1.5 }, { x: fx + 6, z: fz + 5, s: 1.4, ry: 2 }, { x: fx - 6, z: fz - 4.6, s: 1.3, ry: 4 }]); }
  // parkende Autos (stehen nur da)
  for (const [x, z, h, col, kind] of [[164.8, 18.8, Math.PI, 0xb83a2a, 'sedan'], [173.2, 18.8, Math.PI, 0xe8e6e0, 'sedan'], [184, 0, 0, 0x2a5aa8, 'sedan'], [184, 60, Math.PI, 0x3a3a3e, 'sedan']]) { try { const api = buildVehicle(kind, col); api.setInside && api.setInside(false); api.group.position.set(x, 0, z + (h === Math.PI ? 1.4 : -1.4)); api.group.rotation.y = h; scene.add(api.group); box(x - 1.0, x + 1.0, z - 2.4, z + 2.4, 'boden', { veh: true }); } catch (e) { /* ohne Parkautos geht es auch */ } }
  // Leute in der Stadt (nur Kulisse) und der Mann am Spieß
  W.cityPeople = [{ x: 129.2, z: SZ - 1.2, yaw: Math.PI, k: 0 }, { x: 150.2, z: NZ + 1.6, yaw: 0.6, k: 1 }, { x: 196.4, z: SZ + 2.4, yaw: 2.4, k: 2 }, { x: 113, z: NZ + 1.2, yaw: 0, k: 3 }];
  W.cityTick = (t) => { if (W.doenerModel) W.doenerModel.set('DL_Spiess_Dreh', 'y', t * 0.9); const want = (W.dusk ? (W.night ? 1.4 : 0.6) : 0) * (W.cityPower === undefined ? 1 : W.cityPower); if (W.cityGlow !== want) { W.cityGlow = want; for (const m of walls) m.emissiveIntensity = want; shopM.emissiveIntensity = want * 0.5; } };
}
