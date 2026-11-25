// Theos Seitenscheidel - Ludwig Zigaretti: Brunnenplatz gegenüber (2026-11-21, Wunsch Lennox: „ein Springbrunnen mit Park, wo drumrum Leute sitzen und aus Brotdosen essen“).
// Auf dem Rasen rechts neben Elektro-Erwin (zwischen Gehweg gegenüber und Wohnblock): runder Sandstein-Brunnen mit Fontäne (Wassertropfen), oberer Schale, Wasserbecken mit Wellenringen,
// gepflasterter Platz, Kieswege zum Zebrastreifen, zum Vorplatz und nach rechts, vier Bänke, Blumenbeete am Wohnblock, Büsche, drei Bäume, Mülleimer und eine Plakette am Brunnen.
// Tagsüber sitzen drei Leute auf den Bänken und essen aus Brotdosen (Stulle in der Hand, Dose auf dem Schoß), eine Person sitzt mit Handy am Brunnenrand.
// Tauben picken auf dem Platz und fliegen auf, wenn Ludwig näher als 2,3 m kommt; sie landen wieder, wenn er weg ist. Nachts sind Leute und Tauben weg, der Brunnen läuft weiter.
// Keine Lichter in der Gruppe (die Außenwelt wird im Bunker ausgeblendet). Feste Teile in den gemeinsamen Stapel B; Tropfen, Ringe, Tauben und Leute bewegen sich in update().
import * as THREE from './vendor/three.module.min.js';
import { ROOM, OUT_Y } from './ludwigart.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { std, mesh, rng, canvasTex, label } from './ludwiggfx.js';
import { surface, plant } from './ludwigtex.js';

const FZ = ROOM.z0 - ROOM.t; const Y = OUT_Y;
export const BRUNNEN = { x: 31.5, z: FZ - 16.6, r: 2.05, plaza: 4.0 };
const BX = BRUNNEN.x; const BZ = BRUNNEN.z; const WATER = Y + 0.38; const BASE = Y + 0.04; // Platz liegt 4 cm über dem Rasen
const BOWL_Y = Y + 1.37; // Wasser in der oberen Schale
export const BRUNNEN_BENCHES = [-Math.PI / 2, -0.5, -2.65, 0.75].map((a) => ({ a, x: BX + Math.cos(a) * 3.3, z: BZ + Math.sin(a) * 3.3, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) })); // Bänke schauen zum Brunnen
const TREES = [[21.2, FZ - 18.6], [42.2, FZ - 18.9], [39.6, FZ - 13.6]];
const BIN = { x: BX + 1.25, z: BZ - 3.45 }; // Mülleimer rechts neben der hinteren Bank
const bx = (x0, x1, z0, z1) => ({ x0, x1, z0, z1 });
const benchBox = (b) => { const hx = Math.abs(Math.cos(b.yaw)) * 0.82 + Math.abs(Math.sin(b.yaw)) * 0.28; const hz = Math.abs(Math.sin(b.yaw)) * 0.82 + Math.abs(Math.cos(b.yaw)) * 0.28; return bx(b.x - hx, b.x + hx, b.z - hz, b.z + hz); };
export const BRUNNEN_BOXES = [
  bx(BX - 2.0, BX + 2.0, BZ - 0.85, BZ + 0.85), bx(BX - 0.85, BX + 0.85, BZ - 2.0, BZ + 2.0), bx(BX - 1.55, BX + 1.55, BZ - 1.55, BZ + 1.55), // Brunnenbecken (rund, aus drei Kästen)
  ...BRUNNEN_BENCHES.map(benchBox),
  ...TREES.map(([x, z]) => bx(x - 0.28, x + 0.28, z - 0.28, z + 0.28)),
  bx(19.2, 26.6, FZ - 20.6, FZ - 19.85), bx(36.4, 44.2, FZ - 20.6, FZ - 19.85), // Blumenbeete am Wohnblock
  bx(BIN.x - 0.22, BIN.x + 0.22, BIN.z - 0.22, BIN.z + 0.22),
];

export function buildBrunnen(scene, g, B) {
  const r = rng(4242);
  const stone = std({ color: 0xc8bca6, roughness: 0.85 }); const stoneD = std({ color: 0xa89a82, roughness: 0.9 }); const wood = std({ color: 0x7a5232, roughness: 0.8 }); const iron = std({ color: 0x2c3a32, roughness: 0.55, metalness: 0.3 }); // dunkelgrünes Gusseisen
  const soil = std({ color: 0x4a3424, roughness: 1 }); const bark = std({ color: 0x4a3626, roughness: 0.95 }); const leaf = std({ map: plant('laub'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, color: 0x9ab07a });
  const pv = surface('kopfstein'); const pave = std({ map: pv.map, normalMap: pv.normalMap, roughness: 0.9, color: 0xd8d0c4 }); const gv = surface('kies'); const gravel = std({ map: gv.map, normalMap: gv.normalMap, roughness: 1, color: 0xe0d8c8 });
  // ---- Platz (Kopfstein) und Wege (Kies): Wege 1,5 cm tiefer als der Platz, damit nichts flimmert
  { const plaza = new THREE.CircleGeometry(BRUNNEN.plaza, 56); const uv = plaza.attributes.uv; const k = (BRUNNEN.plaza * 2) / 1.6; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); B.add(pave, plaza, BX, BASE, BZ, -Math.PI / 2, 0, 0); }
  const path = (x0, z0, x1, z1, w = 1.5) => { const len = Math.hypot(x1 - x0, z1 - z0); const geo = new THREE.PlaneGeometry(w, len); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2, uv.getY(i) * len / 2); B.add(gravel, geo, (x0 + x1) / 2, Y + 0.025, (z0 + z1) / 2, -Math.PI / 2, 0, Math.atan2(-(x1 - x0), -(z1 - z0))); };
  path(24.7, FZ - 12.4, BX - 3.2, BZ + 2.3); path(18.6, BZ, BX - 3.85, BZ); path(BX + 3.85, BZ, 44.4, BZ); // vom Zebrastreifen, vom Vorplatz bei Erwin, nach rechts zum Wohnblock
  // ---- Brunnen: Becken (Drehkörper), Wasser, Säule, obere Schale, Spitze, Plakette
  const rim = new THREE.LatheGeometry([new THREE.Vector2(1.72, 0.0), new THREE.Vector2(2.05, 0.0), new THREE.Vector2(2.1, 0.42), new THREE.Vector2(2.04, 0.52), new THREE.Vector2(1.76, 0.52), new THREE.Vector2(1.72, 0.44), new THREE.Vector2(1.72, 0.0)], 56); B.add(stone, rim, BX, BASE, BZ);
  B.add(stoneD, new THREE.CylinderGeometry(0.24, 0.34, 1.25, 18), BX, Y + 0.66, BZ);
  const bowl = new THREE.LatheGeometry([new THREE.Vector2(0.18, 0.0), new THREE.Vector2(0.48, 0.06), new THREE.Vector2(0.74, 0.2), new THREE.Vector2(0.8, 0.27), new THREE.Vector2(0.72, 0.27), new THREE.Vector2(0.46, 0.15), new THREE.Vector2(0.18, 0.1)], 40); B.add(stone, bowl, BX, Y + 1.12, BZ);
  B.add(stoneD, new THREE.CylinderGeometry(0.06, 0.1, 0.45, 12), BX, Y + 1.5, BZ); B.add(stone, new THREE.SphereGeometry(0.11, 14, 10), BX, Y + 1.76, BZ);
  const waterM = std({ color: 0x2f7f9a, roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.86, emissive: 0x06202a }); mesh(new THREE.CircleGeometry(1.72, 48), waterM, BX, WATER, BZ, g, { rx: -Math.PI / 2 }); mesh(new THREE.CircleGeometry(0.71, 32), waterM, BX, BOWL_Y - 0.01, BZ, g, { rx: -Math.PI / 2 });
  const plq = std({ map: label('Brunnenplatz · gestiftet von Elektro-Erwin 1987', { w: 1024, h: 96, bg: '#6a5a3a', fg: '#f2e2b0', size: 46 }), roughness: 0.6, metalness: 0.3 }); mesh(new THREE.PlaneGeometry(1.0, 0.1), plq, BX, Y + 0.3, BZ + 2.12, g);
  // Wellenringe auf dem Wasser (wachsen und verblassen), Tropfen der Fontäne (fallen in die Schale) und vom Schalenrand (fallen ins Becken)
  const rings = []; for (let i = 0; i < 4; i++) { const m = mesh(new THREE.RingGeometry(0.86, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0, depthWrite: false }), BX, WATER + 0.004, BZ, g, { rx: -Math.PI / 2 }); rings.push({ m, k: i / 4 }); }
  const dropT = canvasTex(32, 32, (x, w) => { const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(220,240,255,.6)'); gr.addColorStop(1, 'rgba(200,230,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  const N = 360; const pos = new Float32Array(N * 3); const vel = new Float32Array(N * 3); const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const drops = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xd8f0ff, size: 0.07, map: dropT, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true })); drops.frustumCulled = false; g.add(drops);
  const top = (i) => i % 3 !== 0; // zwei Drittel aus der Spitze, ein Drittel läuft über den Schalenrand
  function spawn(i) { const a = r() * Math.PI * 2; const j = i * 3;
    if (top(i)) { const s = 0.15 + r() * 0.4; pos[j] = BX; pos[j + 1] = Y + 1.82; pos[j + 2] = BZ; vel[j] = Math.cos(a) * s; vel[j + 1] = 2.3 + r() * 0.7; vel[j + 2] = Math.sin(a) * s; }
    else { pos[j] = BX + Math.cos(a) * 0.79; pos[j + 1] = BOWL_Y + 0.02; pos[j + 2] = BZ + Math.sin(a) * 0.79; vel[j] = Math.cos(a) * 0.45; vel[j + 1] = 0.1; vel[j + 2] = Math.sin(a) * 0.45; } }
  const gone = (i) => { const j = i * 3; if (pos[j + 1] < WATER) return true; return top(i) && vel[j + 1] < 0 && pos[j + 1] < BOWL_Y && Math.hypot(pos[j] - BX, pos[j + 2] - BZ) < 0.76; };
  function stepDrop(i, dt) { const j = i * 3; vel[j + 1] -= 9.8 * dt; pos[j] += vel[j] * dt; pos[j + 1] += vel[j + 1] * dt; pos[j + 2] += vel[j + 2] * dt; if (gone(i)) spawn(i); }
  for (let i = 0; i < N; i++) { spawn(i); const tt = r() * 1.2; for (let s = 0; s < tt; s += 0.05) stepDrop(i, 0.05); } // gleich zu Beginn verteilt, nicht alle oben
  // ---- Bänke mit Lehne (Holzlatten auf Gusseisen), vorne ist +z der Bank
  const bench = (b) => { const parts = []; const add = (m, w, h, d, x, y, z) => { const geo = new THREE.BoxGeometry(w, h, d); geo.translate(x, y, z); parts.push([m, geo]); };
    for (let i = 0; i < 3; i++) add(wood, 1.6, 0.04, 0.12, 0, 0.45, 0.14 - i * 0.14); for (let i = 0; i < 2; i++) add(wood, 1.6, 0.11, 0.035, 0, 0.62 + i * 0.16, -0.23);
    for (const sx of [-0.7, 0.7]) { for (const lz of [0.17, -0.17]) add(iron, 0.05, 0.43, 0.05, sx, 0.215, lz); add(iron, 0.05, 0.05, 0.45, sx, 0.43, 0.0); add(iron, 0.05, 0.5, 0.05, sx, 0.68, -0.22); add(iron, 0.05, 0.04, 0.4, sx, 0.64, -0.02); add(iron, 0.04, 0.2, 0.04, sx, 0.54, 0.17); } // Beine, Sitzträger, Lehnenpfosten, Armlehne (vorher volle Seitenplatten, wirkten wie schwarze Klötze)
    for (const [m, geo] of parts) B.add(m, geo, b.x, BASE, b.z, 0, b.yaw, 0); };
  BRUNNEN_BENCHES.forEach(bench);
  B.add(std({ color: 0x2a5a3a, roughness: 0.55 }), new THREE.CylinderGeometry(0.2, 0.18, 0.75, 14), BIN.x, BASE + 0.375, BIN.z); B.add(iron, new THREE.CylinderGeometry(0.21, 0.21, 0.04, 14), BIN.x, BASE + 0.77, BIN.z);
  // ---- Blumenbeete mit bunten Blüten, Büsche, Bäume
  const flowerM = [0xe8384a, 0xf2c81c, 0xb84ad8, 0xf4f0f0, 0xff8a2a].map((c) => std({ color: c, roughness: 0.7 })); const stemM = std({ color: 0x3a6a2a, roughness: 0.9 });
  for (const [x0, x1] of [[19.2, 26.6], [36.4, 44.2]]) { B.box(stoneD, x0, Y, FZ - 20.6, x1, Y + 0.18, FZ - 19.85); B.box(soil, x0 + 0.05, Y + 0.18, FZ - 20.55, x1 - 0.05, Y + 0.2, FZ - 19.9);
    for (let i = 0; i < 46; i++) { const fx = x0 + 0.2 + r() * (x1 - x0 - 0.4); const fz = FZ - 20.48 + r() * 0.52; const h = 0.12 + r() * 0.14; B.add(stemM, new THREE.CylinderGeometry(0.006, 0.006, h, 4), fx, Y + 0.2 + h / 2, fz); B.add(flowerM[(r() * flowerM.length) | 0], new THREE.SphereGeometry(0.035 + r() * 0.02, 6, 5), fx, Y + 0.2 + h, fz); } }
  const bush = (x, z, s) => { for (let i = 0; i < 14; i++) { const u = r() * 2 - 1; const a = r() * Math.PI * 2; const rr = Math.sqrt(1 - u * u) * s * 0.8; const k = 0.7 + r() * 0.6; B.add(leaf, new THREE.PlaneGeometry(k, k), x + Math.cos(a) * rr, Y + 0.38 + (u + 1) * s * 0.32, z + Math.sin(a) * rr, r() * 3, r() * 3, r() * 3); } };
  for (const [x, z] of [[19.6, FZ - 13.4], [27.2, FZ - 19.2], [35.9, FZ - 19.3], [44.0, FZ - 13.6], [36.6, FZ - 13.2]]) bush(x, z, 0.75 + r() * 0.3);
  const tree = (x, z, h, crown) => { B.add(bark, new THREE.CylinderGeometry(0.12, 0.21, h * 0.55, 9), x, Y + h * 0.275, z);
    for (let i = 0; i < 4; i++) { const a = i * 1.6 + r(); const L = h * 0.32; const gg = new THREE.CylinderGeometry(0.04, 0.09, L, 6); gg.translate(0, L / 2, 0); gg.rotateZ(0.6 + r() * 0.3); gg.rotateY(a); B.add(bark, gg, x, Y + h * 0.45, z); }
    const cy = Y + h * 0.66; for (let i = 0; i < 36; i++) { const u = r() * 2 - 1; const a = r() * Math.PI * 2; const rr = Math.sqrt(1 - u * u) * crown * (0.55 + r() * 0.5); const s = 1.3 + r() * 0.9; B.add(leaf, new THREE.PlaneGeometry(s, s), x + Math.cos(a) * rr, cy + u * crown * 0.75 + 0.3, z + Math.sin(a) * rr, r() * 3, r() * 3, r() * 3); } };
  for (const [x, z] of TREES) tree(x, z, 6.4 + r() * 1.2, 2.2 + r() * 0.5);
  // ---- Leute mit Brotdosen: drei essen auf den Bänken (Dose auf dem Schoß, Stulle in der rechten Hand), eine Person sitzt mit Handy auf dem Brunnenrand (Dose neben sich)
  const boxC = [0x2a6ad8, 0xe8384a, 0x3ab85a, 0xf2a81c]; const bread = std({ color: 0xe0b878, roughness: 0.9 }); const salad = std({ color: 0x6ab84a, roughness: 0.8 }); const apple = std({ color: 0xc8231c, roughness: 0.45 });
  const lunchBox = (parent, x, y, z, c) => { const L = new THREE.Group(); L.position.set(x, y, z); parent.add(L); const m = std({ color: c, roughness: 0.4 });
    mesh(new THREE.BoxGeometry(0.22, 0.065, 0.15), m, 0, 0, 0, L); mesh(new THREE.BoxGeometry(0.22, 0.012, 0.15), m, 0, 0.1, -0.1, L, { rx: -1.15 }); // offener Deckel hinten hochgeklappt
    mesh(new THREE.BoxGeometry(0.1, 0.024, 0.09), bread, -0.045, 0.036, 0.0, L); mesh(new THREE.BoxGeometry(0.096, 0.006, 0.086), salad, -0.045, 0.05, 0.0, L); mesh(new THREE.SphereGeometry(0.03, 10, 8), apple, 0.06, 0.05, 0.01, L); return L; };
  const handProp = (P, geo, mat, x, y, z) => { const hand = P.fig.bones?.handR || P.fig.root.getObjectByName('handR'); if (!hand) return null; const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); hand.add(m); return m; };
  const looks = [{ outfit: 'schlicht', shirt: 0x5a7ab8, cap: 0x2a2a30, brim: 0x18181c, pants: 0x2a2c32, skin: 0xe8bc98, hair: 0x6a4a2a, hut: 'keine', brille: true, face: 'flat' },
    { outfit: 'schlicht', shirt: 0xf27a1a, cap: 0xf2c81c, brim: 0xc89a10, pants: 0x3a4a6a, skin: 0xc8946a, hair: 0x2a1a10, hut: 'helm', bart: 'schnauzer', face: 'grin', shoe: 0x5a3820 },
    { outfit: 'schlicht', shirt: 0x8a3a5a, cap: 0x5a2a3a, brim: 0x2a141c, pants: 0x30343a, skin: 0xf0c8a8, hair: 0xc89a5a, frau: 'lang', rock: 0x3a7a5a },
    { shirt: 0x6a6a52, cap: 0x7a6a5a, brim: 0x4a3e32, pants: 0x5a5048, skin: 0xe0b498, hair: 0xc8c8c4, brille: true, bart: 'schnauzer', shoe: 0x3a2a20 }];
  const people = [];
  const sitDown = (look, x, z, yaw, seat, act, ph) => { const P = createPerson(g, look); P.place(x, BASE, z, yaw); P.mode = 'sit'; P.seat = seat; P.act = act; P.t = ph; P.setVisible(true); P.update(0.016, 0); people.push(P); return P; };
  [[BRUNNEN_BENCHES[0], -0.35], [BRUNNEN_BENCHES[1], 0.3], [BRUNNEN_BENCHES[3], -0.3]].forEach(([b, off], i) => {
    const x = b.x + Math.cos(b.yaw) * off; const z = b.z - Math.sin(b.yaw) * off; // entlang der Bank verschoben
    const P = sitDown(looks[i], x, z, b.yaw, 0.47, 'eat', i * 2.1); lunchBox(P.space, 0.04, 0.47 + 0.19, 0.22, boxC[i]);
    const s = handProp(P, new THREE.BoxGeometry(0.1, 0.09, 0.026), bread, 0, -0.075, 0.03); if (s) handProp(P, new THREE.BoxGeometry(0.104, 0.094, 0.006), salad, 0, -0.075, 0.03); });
  { const a = 2.15; const P = sitDown(looks[3], BX + Math.cos(a) * 2.0, BZ + Math.sin(a) * 2.0, Math.atan2(Math.cos(a), Math.sin(a)), 0.52, 'sitphone', 0); // schaut vom Brunnen weg zur Straße
    lunchBox(P.space, 0.4, 0.52 + 0.033, -0.06, boxC[3]); handProp(P, new THREE.BoxGeometry(0.075, 0.15, 0.012), std({ color: 0x1a1a1e, roughness: 0.3 }), 0, -0.08, 0.035); }
  // ---- Tauben: picken auf dem Platz, fliegen auf, wenn Ludwig näher als 2,3 m kommt, und gleiten später zurück
  const pgM = std({ color: 0x8a8e98, roughness: 0.8 }); const pgH = std({ color: 0x5a5e6a, roughness: 0.7 }); const beakM = std({ color: 0xd88a3a, roughness: 0.6 });
  const flock = new THREE.Group(); g.add(flock); const pigeons = [];
  const crownM = std({ color: 0xf2c040, metalness: 0.8, roughness: 0.3, emissive: 0x3a2800, side: THREE.DoubleSide }); const gemM = std({ color: 0xd81c3a, roughness: 0.3 });
  const crown = (q) => { q.king = true; const c = new THREE.Group(); c.position.set(0, 0.045, -0.005); q.head.add(c); mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.022, 10, 1, true), crownM, 0, 0, 0, c); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; mesh(new THREE.ConeGeometry(0.008, 0.024, 4), crownM, Math.cos(a) * 0.03, 0.022, Math.sin(a) * 0.03, c); } mesh(new THREE.SphereGeometry(0.006, 6, 4), gemM, 0, 0.004, 0.033, c); }; // Günther, der König vom Brunnenplatz (Easter Egg): fliegt nie weg
  for (let i = 0; i < 7; i++) { const p = new THREE.Group(); flock.add(p); const body = mesh(new THREE.SphereGeometry(0.09, 10, 8), pgM, 0, 0.1, 0, p); body.scale.set(0.8, 0.75, 1.25);
    const head = new THREE.Group(); head.position.set(0, 0.17, 0.09); p.add(head); mesh(new THREE.SphereGeometry(0.05, 10, 8), pgH, 0, 0, 0, head); mesh(new THREE.ConeGeometry(0.012, 0.04, 6), beakM, 0, -0.005, 0.055, head, { rx: Math.PI / 2 });
    const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 0.03, 0.13, -0.01); p.add(w); mesh(new THREE.BoxGeometry(0.17, 0.012, 0.13), pgM, s * 0.085, 0, 0, w); w.visible = false; w.userData.s = s; return w; });
    let a = r() * Math.PI * 2; let d = 2.6 + r() * 1.2; if (i < 3) { a = -Math.PI / 2 + (i - 1) * 0.35; d = 2.5; } // drei Tauben vor der hinteren Bank (Krümel)
    const q = { p, head, wings, hx: BX + Math.cos(a) * d, hz: BZ + Math.sin(a) * d, x: 0, z: 0, y: 0, yaw: r() * 6, state: 'peck', t: r() * 3, vx: 0, vz: 0 }; q.x = q.hx; q.z = q.hz; pigeons.push(q); if (i === 0) crown(q); }
  const flap = (q, t, k) => { const f = Math.sin(t * 28 + q.hx * 5) * k; for (const w of q.wings) w.rotation.z = w.userData.s * f; };
  function movePigeons(t, dt, px, pz) {
    for (const q of pigeons) { q.t -= dt; const near = Math.hypot(px - q.x, pz - q.z) < 2.3;
      if (q.state !== 'fly' && near && !q.king) { q.state = 'fly'; flyN++; q.t = 6 + r() * 5; const a = Math.atan2(q.z - pz, q.x - px) + (r() - 0.5); q.vx = Math.cos(a) * 3.2; q.vz = Math.sin(a) * 3.2; for (const w of q.wings) w.visible = true; }
      if (q.state === 'fly') { q.y = Math.min(6.5, q.y + dt * 2.6); q.x += q.vx * dt; q.z += q.vz * dt; flap(q, t, 0.9); q.yaw = Math.atan2(q.vx, q.vz); if (q.t <= 0 && Math.hypot(px - q.hx, pz - q.hz) > 4) q.state = 'land'; }
      else if (q.state === 'land') { const dx = q.hx - q.x; const dz = q.hz - q.z; const d = Math.hypot(dx, dz); q.yaw = Math.atan2(dx, dz); const sp = Math.min(3.2, d * 1.5 + 0.4); if (d > 0.04) { q.x += (dx / d) * Math.min(d, sp * dt); q.z += (dz / d) * Math.min(d, sp * dt); }
        q.y = Math.max(0, Math.min(q.y, d * 0.5)); flap(q, t, 0.6); if (d < 0.05 && q.y < 0.01) { q.state = 'peck'; q.y = 0; q.t = 1 + r() * 2; for (const w of q.wings) w.visible = false; } }
      else { if (q.t <= 0) { q.t = 1.5 + r() * 3; const a = r() * Math.PI * 2; let hx = Math.max(BX - 3.7, Math.min(BX + 3.7, q.hx + Math.cos(a) * 0.5)); let hz = Math.max(BZ - 3.7, Math.min(BZ + 3.7, q.hz + Math.sin(a) * 0.5)); const dc = Math.hypot(hx - BX, hz - BZ); if (dc < 2.4) { hx = BX + ((hx - BX) / dc) * 2.4; hz = BZ + ((hz - BZ) / dc) * 2.4; } q.hx = hx; q.hz = hz; }
        const dx = q.hx - q.x; const dz = q.hz - q.z; const d = Math.hypot(dx, dz); if (d > 0.02) { q.x += (dx / d) * Math.min(d, 0.35 * dt); q.z += (dz / d) * Math.min(d, 0.35 * dt); q.yaw = Math.atan2(dx, dz); } q.head.position.y = 0.17 - Math.max(0, Math.sin(t * 7 + q.hx * 3)) * 0.07; }
      q.p.position.set(q.x, BASE + q.y, q.z); q.p.rotation.y = q.yaw; }
  }
  // ---- Tag und Nacht: nachts sitzt keiner mehr da und die Tauben schlafen
  let day = true; function setDay(light) { const on = light > 0.4; if (on === day) return; day = on; for (const P of people) { P.setVisible(on); P.space.visible = on; } flock.visible = on; if (on) for (const q of pigeons) { q.state = 'peck'; q.x = q.hx; q.z = q.hz; q.y = 0; for (const w of q.wings) w.visible = false; } }
  let pplT = 0; let flyN = 0; // flyN: wie oft eine Taube aufgeflogen ist (ludwig.js spielt dann Flattern)
  function update(t, dt, px, pz) {
    for (let i = 0; i < N; i++) stepDrop(i, dt); dg.attributes.position.needsUpdate = true;
    for (const q of rings) { q.k = (q.k + dt * 0.35) % 1; const s = 0.25 + q.k * 1.45; q.m.scale.set(s, s, 1); q.m.material.opacity = 0.35 * (1 - q.k); }
    if (!day) return;
    const far = Math.hypot(px - BX, pz - BZ) > 14; pplT += dt; if (!far || pplT > 0.06) { for (const P of people) P.update(pplT, t); pplT = 0; } // von weitem (Zimmer, Straße) seltener rechnen
    movePigeons(t, dt, px, pz);
  }
  return { update, setDay, people, pigeons, drops, isDay: () => day, flyCount: () => flyN, at: { x: BX, z: BZ } };
}
