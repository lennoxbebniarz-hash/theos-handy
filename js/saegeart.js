// Theos Seitenscheidel - Hund-Modus (intern saege): Halle, Rolltor, LKW, Knet-Hamster (zwei Hälften mit Schnittfläche), Waffen in der Hand, Blut-Texturen.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { HAM, TRUCK } from './saegelogic.js';

const col = (h) => new THREE.Color(h);
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); } return t; }
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, ...o });
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m; }

// ---------------- Hamster ----------------
// Farben wie Knetfiguren: Fell, Bauch, Ohr innen, Bäckchen
export const LOOKS = [
  { fur: 0xe9b57f, belly: 0xf8eedc },
  { fur: 0xf1cf9f, belly: 0xfbf3e6 },
  { fur: 0xbdb3a8, belly: 0xf4efe8 },
  { fur: 0xb57a4c, belly: 0xf3e2c8 },
];
const PINK = 0xf2a7b0; const BLUSH = 0xf6b9c0; const EYE = 0x15110f; const NOSE = 0xee8f9f;
function paint(g, hex) { const c = col(hex); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
const prep = (g) => { if (g.index) g = g.toNonIndexed(); g.deleteAttribute && g.attributes.uv && g.deleteAttribute('uv'); return g; };
// Halbe Kugel: side -1 = linke Hälfte (x < 0), +1 = rechte
function halfSphere(r, side, ws = 22, hs = 16) { return new THREE.SphereGeometry(r, ws, hs, side < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI); }
function sph(r, ws = 14, hs = 10) { return new THREE.SphereGeometry(r, ws, hs); }
function place(g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) { g.scale(sx, sy, sz); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); return g; }
// Schnittfläche bei x = 0: Fell-Rand, rotes Fleisch, dunkler Kern, weiße Knochen (Schädel, Wirbelsäule, Rippen)
function cutFace(side, look) {
  // Flache Teile liegen in der xy-Ebene (x = später z vorne). Linke Hälfte: Fläche schaut nach +x, rechte nach -x; lx spiegelt, damit vorne vorne bleibt.
  const parts = []; const ry = HAM.r * 0.95; const rz = HAM.r * 0.92; const lx = (z) => (side < 0 ? -z : z); const f = (g, hex, layer) => { g.rotateY(side < 0 ? Math.PI / 2 : -Math.PI / 2); g.translate(-side * (0.001 + 0.0015 * layer), 0, 0); parts.push(paint(prep(g), hex)); };
  const ell = (rr, sy, sz, y, z, hex, layer, seg = 28) => { const g = new THREE.CircleGeometry(rr, seg); g.scale(sz, sy, 1); g.translate(lx(z), y, 0); f(g, hex, layer); };
  ell(1, ry, rz, HAM.cy, 0, look.fur, 0); ell(1, ry * 0.95, rz * 0.95, HAM.cy, 0, 0xe0a58c, 1); ell(1, ry * 0.92, rz * 0.92, HAM.cy, 0, 0xb3121b, 2); ell(1, ry * 0.62, rz * 0.66, HAM.cy - 0.02, 0, 0x7a0a10, 3); ell(1, ry * 0.3, rz * 0.34, HAM.cy - 0.06, -0.02, 0x4e0509, 4);
  ell(0.085, 1, 1.1, HAM.cy + 0.13, 0.08, 0xf4efe4, 4); ell(0.05, 1, 1, HAM.cy + 0.13, 0.1, 0x9c1018, 5); // Schädel mit Hirn
  const spine = new THREE.PlaneGeometry(0.035, 0.24); spine.translate(lx(-0.07), HAM.cy - 0.05, 0); f(spine, 0xf1ebdf, 4);
  for (let i = 0; i < 4; i++) { const rib = new THREE.PlaneGeometry(0.15, 0.022); rib.rotateZ(side < 0 ? -0.25 : 0.25); rib.translate(0.0, HAM.cy - 0.13 + i * 0.055, 0); f(rib, 0xece4d4, 4); }
  return parts;
}
function hamsterHalf(side, look, dead) {
  const s = side; const P = [];
  const add = (g, hex) => P.push(paint(prep(g), hex));
  add(place(halfSphere(HAM.r, s), 0, HAM.cy, 0, 1, 0.95, 0.92), look.fur); // Körper
  add(place(halfSphere(0.27, s, 18, 12), 0, 0.27, 0.13, 1, 0.92, 0.75), look.belly); // heller Bauch und Gesicht
  add(place(halfSphere(0.024, s, 10, 8), 0, 0.37, 0.335, 1.2, 0.85, 1), NOSE); // Nase
  // Mund: kleiner Bogen je Seite
  { const m = new THREE.TorusGeometry(0.024, 0.0055, 6, 10, Math.PI); m.rotateZ(Math.PI); add(place(m, s * 0.024, 0.335, 0.322, 1, 1, 1, -0.25, 0, 0), 0x4a2a22); }
  const ex = s * 0.118; const ey = 0.43; const ez = 0.29;
  if (!dead) { add(place(sph(0.056), ex, ey, ez, 1, 1.08, 0.7), EYE); add(place(sph(0.017, 8, 6), ex + s * -0.016, ey + 0.022, ez + 0.04), 0xffffff); }
  else for (const a of [0.785, -0.785]) { const b = new THREE.BoxGeometry(0.1, 0.018, 0.02); add(place(b, ex, ey, ez + 0.035, 1, 1, 1, 0, 0, a), EYE); } // tot: X-Augen
  add(place(sph(0.052), s * 0.2, 0.34, 0.255, 1, 0.7, 0.45, 0, s * 0.5, 0), BLUSH); // Bäckchen
  add(place(sph(0.095), s * 0.2, 0.63, 0.0, 1, 1, 0.55, 0, 0, -s * 0.35), look.fur); add(place(sph(0.06), s * 0.2, 0.63, 0.035, 1, 1, 0.45, 0, 0, -s * 0.35), PINK); // Ohren
  add(place(sph(0.065), s * 0.17, 0.21, 0.29, 0.8, 1.2, 0.8, 0.5, 0, s * 0.3), look.belly); // Ärmchen
  add(place(sph(0.065), s * 0.13, 0.035, 0.2, 1, 0.55, 1.35), look.belly); // Füße
  for (const g of cutFace(s, look)) P.push(g);
  const g = mergeGeometries(P, false); g.computeBoundingSphere(); return g;
}
const geoCache = new Map();
export function hamsterGeo(look, side, dead) { const k = look + '|' + side + '|' + (dead ? 1 : 0); if (!geoCache.has(k)) geoCache.set(k, hamsterHalf(side, LOOKS[look], dead)); return geoCache.get(k); }
export const hamsterMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0 });
// Ein Hamster: Gruppe mit zwei Drehpunkten (Schnittebene), jede Hälfte hängt daran
export function createHamster(look) {
  const g = new THREE.Group(); const halves = [-1, 1].map((side) => { const piv = new THREE.Object3D(); piv.position.set(0, HAM.cy, 0); const m = new THREE.Mesh(hamsterGeo(look, side, false), hamsterMat); m.position.set(0, -HAM.cy, 0); m.castShadow = true; piv.add(m); g.add(piv); return { piv, mesh: m, side }; });
  return { group: g, halves, look };
}
// Lebende Hamster: beide Hälften in einem Stück (für InstancedMesh, ein Zeichenaufruf je Farbe)
const aliveCache = new Map();
export function aliveGeo(look) { if (!aliveCache.has(look)) { const g = mergeGeometries([hamsterGeo(look, -1, false), hamsterGeo(look, 1, false)], false); g.computeBoundingSphere(); aliveCache.set(look, g); } return aliveCache.get(look); }
// Tote Hälfte mit X-Augen: Drehpunkt in der Schnittebene
export function makeHalf(look, side) { const piv = new THREE.Object3D(); const m = new THREE.Mesh(hamsterGeo(look, side, true), hamsterMat); m.position.set(0, -HAM.cy, 0); m.castShadow = true; piv.add(m); return piv; }
// Fetzen: Fleisch, Knochen, Fell
const chunkGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.8 + Math.sin(i * 7.1) * 0.25), p.getY(i) * (0.7 + Math.cos(i * 3.3) * 0.2), p.getZ(i)); g.computeVertexNormals(); return g; })();
const boneGeo = new THREE.CapsuleGeometry(0.018, 0.11, 3, 6);
const chunkMats = { fleisch: std({ color: 0xa30f17, roughness: 0.35 }), dunkel: std({ color: 0x5e070b, roughness: 0.4 }), knochen: std({ color: 0xf1ead9, roughness: 0.6 }) };
const furMats = LOOKS.map((l) => std({ color: l.fur, roughness: 0.55 }));
export function createChunk(kind, look) { const geo = kind === 'knochen' ? boneGeo : chunkGeo; const mat = kind === 'fell' ? furMats[look] : chunkMats[kind]; const m = new THREE.Mesh(geo, mat); const s = kind === 'knochen' ? 1 : 0.035 + Math.random() * 0.05; m.scale.setScalar(s); m.castShadow = true; return { mesh: m, r: kind === 'knochen' ? 0.03 : s * 0.8 }; }

// ---------------- Blut ----------------
export function splatTexture() {
  return canvasTex(256, 256, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.fillStyle = '#fff'; const blob = (cx, cy, r) => { x.beginPath(); for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; const rr = r * (0.78 + Math.random() * 0.38); x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.fill(); };
    blob(128, 128, 62); for (let i = 0; i < 14; i++) { const a = Math.random() * 7; const d = 50 + Math.random() * 60; blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 5 + Math.random() * 16); }
    for (let i = 0; i < 7; i++) { const a = Math.random() * 7; x.lineWidth = 4 + Math.random() * 6; x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.cos(a) * (80 + Math.random() * 40), 128 + Math.sin(a) * (80 + Math.random() * 40)); x.stroke(); }
  });
}

// ---------------- Halle ----------------
export function buildHall(renderer, { shadows, shadowSize }) {
  const scene = new THREE.Scene(); scene.background = col(0x9fc6e6); scene.fog = new THREE.Fog(0x9fc6e6, 40, 120);
  const W = 24; const Z0 = -16; const Z1 = 18; const H = 9; const GW = 6.4; const GH = 5.4;
  const floorTex = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#e7e2d6'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '120,110,95' : '255,255,250'},${Math.random() * 0.08})`; x.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 6); } x.strokeStyle = 'rgba(90,85,75,.35)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); }, [W / 3, (Z1 - Z0) / 3]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, Z1 - Z0), std({ map: floorTex, roughness: 0.85 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, (Z0 + Z1) / 2); floor.receiveShadow = true; scene.add(floor);
  // Warnstreifen vor dem Tor und an der LKW-Spur
  const stripe = canvasTex(256, 64, (x, w, h) => { x.fillStyle = '#f2c31b'; x.fillRect(0, 0, w, h); x.fillStyle = '#1b1b1b'; for (let i = -2; i < 10; i++) { x.beginPath(); x.moveTo(i * 32, h); x.lineTo(i * 32 + 16, h); x.lineTo(i * 32 + 16 + 32, 0); x.lineTo(i * 32 + 32, 0); x.fill(); } }, [1, 1]);
  const stripeMat = std({ map: stripe, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  { const t = stripe.clone(); t.repeat.set(7, 1); t.needsUpdate = true; const m = new THREE.Mesh(new THREE.PlaneGeometry(GW + 2, 0.5), std({ map: t, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.004, Z0 + 0.6); m.receiveShadow = true; scene.add(m); }
  for (const sx of [-1, 1]) { const t = stripe.clone(); t.repeat.set(24, 1); t.needsUpdate = true; const m = new THREE.Mesh(new THREE.PlaneGeometry(10, 0.22), std({ map: t, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.set(sx * 2.2, 0.004, Z0 + 5.2); m.receiveShadow = true; scene.add(m); }
  // Wände: unten grün mit Fugen, oben weiß
  const greenTex = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#3ccf7c'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(0,60,25,.35)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, h); x.stroke(); } x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(0, 0, w, 30); for (let i = 0; i < 4; i++) for (const yy of [40, 210]) { x.fillStyle = 'rgba(0,50,20,.4)'; x.beginPath(); x.arc(i * 128 + 14, yy, 4, 0, 7); x.fill(); x.beginPath(); x.arc(i * 128 + 114, yy, 4, 0, 7); x.fill(); } }, [1, 1]);
  const whiteMat = std({ color: 0xeef0ee, roughness: 0.9 }); const greenMat = (len) => { const t = greenTex.clone(); t.repeat.set(len / 4, 1); t.needsUpdate = true; return std({ map: t, roughness: 0.7 }); };
  const wall = (len, x, z, ry, x0 = 0) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; const lo = new THREE.Mesh(new THREE.PlaneGeometry(len, 3.2), greenMat(len)); lo.position.set(x0, 1.6, 0); lo.receiveShadow = true; const hi = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 3.2), whiteMat); hi.position.set(x0, 3.2 + (H - 3.2) / 2, 0); g.add(lo, hi); const rail = box(len, 0.12, 0.08, std({ color: 0x21894e }), x0, 3.22, 0.04, g); rail.castShadow = false; scene.add(g); return g; };
  wall(W, 0, Z1, Math.PI); wall(Z1 - Z0, -W / 2, (Z0 + Z1) / 2, Math.PI / 2); wall(Z1 - Z0, W / 2, (Z0 + Z1) / 2, -Math.PI / 2);
  const side = (W - GW) / 2; wall(side, -(GW / 2 + side / 2), Z0, 0); wall(side, GW / 2 + side / 2, Z0, 0);
  { const top = new THREE.Mesh(new THREE.PlaneGeometry(GW, H - GH), whiteMat); top.position.set(0, GH + (H - GH) / 2, Z0); scene.add(top); }
  // Rückseiten der Torwand (von draußen zu sehen) und Außenhaut
  { const back = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, H), std({ color: 0x8b98a3, roughness: 0.9 })); back.position.set(0, H / 2, Z0 - 0.35); back.rotation.y = Math.PI; scene.add(back); const hole = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, 0.36), std({ color: 0x2b2f33 })); hole.visible = false; scene.add(hole); }
  for (const sx of [-1, 1]) { const thick = new THREE.Mesh(new THREE.BoxGeometry(side, H, 0.34), std({ color: 0x9aa6b0, roughness: 0.9 })); thick.position.set(sx * (GW / 2 + side / 2), H / 2, Z0 - 0.17); thick.material.side = THREE.FrontSide; scene.add(thick); }
  { const lintel = box(GW, H - GH, 0.34, std({ color: 0x9aa6b0 }), 0, GH + (H - GH) / 2, Z0 - 0.17); scene.add(lintel); }
  // Torpfosten mit Streifen
  const postTex = stripe.clone(); postTex.repeat.set(1, 6); postTex.rotation = Math.PI / 2; postTex.needsUpdate = true; const postMat = std({ map: postTex });
  for (const sx of [-1, 1]) { const p = box(0.5, GH + 0.3, 0.5, postMat, sx * (GW / 2 + 0.25), (GH + 0.3) / 2, Z0 + 0.25); p.castShadow = true; scene.add(p); }
  box(GW + 1.0, 0.5, 0.5, std({ color: 0xf2c31b }), 0, GH + 0.25, Z0 + 0.25, scene);
  // Rolltor
  const doorTex = canvasTex(256, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, 32); g.addColorStop(0, '#c9ced3'); g.addColorStop(0.5, '#9ea5ac'); g.addColorStop(1, '#c9ced3'); for (let y = 0; y < h; y += 32) { x.fillStyle = g; x.save(); x.translate(0, y); x.fillRect(0, 0, w, 32); x.restore(); x.fillStyle = 'rgba(40,45,50,.5)'; x.fillRect(0, y + 30, w, 2); } }, [1, 6]);
  const door = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, 0.1), std({ map: doorTex, metalness: 0.35, roughness: 0.5 })); door.position.set(0, GH / 2, Z0 - 0.05); door.castShadow = true; scene.add(door);
  box(GW + 0.6, 0.8, 0.8, std({ color: 0x5f6870, metalness: 0.3, roughness: 0.5 }), 0, GH + 0.9, Z0 - 0.2, scene); // Torkasten
  // Draußen: Hof mit Asphalt
  { const g = new THREE.Mesh(new THREE.PlaneGeometry(120, 90), std({ color: 0x52575c, roughness: 0.95 })); g.rotation.x = -Math.PI / 2; g.position.set(0, -0.01, Z0 - 45); g.receiveShadow = true; scene.add(g); for (let i = 0; i < 8; i++) box(0.25, 0.01, 2, std({ color: 0xe8e8e0 }), 0, 0.0, Z0 - 6 - i * 5, scene); const far = new THREE.Mesh(new THREE.PlaneGeometry(160, 30), std({ color: 0x6a8f5e })); far.position.set(0, 4, Z0 - 85); scene.add(far); }
  // Decke mit Trägern und Leuchtfeldern
  { const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, Z1 - Z0), std({ color: 0x5b6168, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, (Z0 + Z1) / 2); scene.add(ceil); const beamMat = std({ color: 0x3b4148, metalness: 0.4, roughness: 0.5 }); for (let z = Z0 + 2; z < Z1; z += 4) box(W, 0.4, 0.25, beamMat, 0, H - 0.3, z, scene); const lampMat = new THREE.MeshBasicMaterial({ color: 0xfffbea }); for (let z = Z0 + 4; z < Z1; z += 4) for (const x of [-6, 0, 6]) { const l = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.5), lampMat); l.rotation.x = Math.PI / 2; l.position.set(x, H - 0.52, z); scene.add(l); } }
  // Förderbänder an den Seiten, Kisten, Pfeiler
  const beltTex = canvasTex(64, 256, (x, w, h) => { x.fillStyle = '#26282b'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a3d41'; for (let y = 0; y < h; y += 16) x.fillRect(0, y, w, 6); }, [1, 20]);
  const belts = []; for (const sx of [-1, 1]) { const frame = box(1.2, 0.7, 26, std({ color: 0x6d757c, metalness: 0.3, roughness: 0.5 }), sx * 10.6, 0.35, 3, scene); frame.castShadow = true; frame.receiveShadow = true; const top = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 26), std({ map: beltTex.clone(), roughness: 0.8 })); top.material.map.repeat.set(1, 20); top.material.map.wrapT = THREE.RepeatWrapping; top.rotation.x = -Math.PI / 2; top.position.set(sx * 10.6, 0.705, 3); scene.add(top); belts.push(top.material.map); const rail = box(0.06, 0.12, 26, std({ color: 0xf2c31b }), sx * (10.6 - 0.58), 0.76, 3, scene); rail.castShadow = false; }
  const crateMat = std({ color: 0xb98a55, roughness: 0.9 }); const crateTex = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#c4935c'; x.fillRect(0, 0, w, h); x.fillStyle = '#9b6f3f'; x.fillRect(0, 56, w, 16); x.strokeStyle = '#8a6234'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6); }); crateMat.map = crateTex;
  const solids = []; const crate = (x, z, s, y = s / 2, ry = 0) => { const c = box(s, s, s, crateMat, x, y, z, scene); c.rotation.y = ry; c.castShadow = true; c.receiveShadow = true; solids.push({ x, z, r: s * 0.7 }); };
  for (const [x, z, s, ry] of [[-10.6, 10, 0.7, 0.2], [-10.6, 4, 0.6, 0.5], [10.6, -2, 0.7, 0.1], [10.6, 8, 0.6, 0.6]]) crate(x, z, s, 0.7 + s / 2, ry);
  crate(-9.5, 16.5, 1.2); crate(-8.2, 16.6, 1.0, 0.5, 0.3); crate(-9.3, 16.4, 0.9, 1.2 + 0.45, 0.2); crate(9.6, -14.3, 1.2); crate(8.4, -14.6, 1.0, 0.5, 0.5);
  const pillarMat = std({ color: 0xd9dcdc, roughness: 0.8 }); for (const x of [-7, 7]) for (const z of [-6, 6]) { const p = box(0.6, H, 0.6, pillarMat, x, H / 2, z, scene); p.castShadow = true; solids.push({ x, z, r: 0.45 }); const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.0, 0.62), std({ map: postTex })); b.position.set(x, 0.5, z); scene.add(b); }
  // Licht
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b0a0, 1.2)); const amb = new THREE.AmbientLight(0xffffff, 0.35); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfff6e6, 2.0); sun.position.set(6, 22, 8); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  sun.castShadow = !!shadows; sun.shadow.mapSize.set(shadowSize || 2048, shadowSize || 2048); const sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 60; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  const outside = new THREE.DirectionalLight(0xffffff, 0.8); outside.position.set(-10, 20, -50); scene.add(outside);
  return { scene, door, sun, belts, solids, gate: { w: GW, h: GH, z: Z0 }, update(t) { for (const b of belts) b.offset.y = -t * 0.6; } };
}

// ---------------- LKW ----------------
// Ursprung = Heck unten Mitte, Kabine in -z
export function buildTruck() {
  const g = new THREE.Group(); const L = TRUCK.len - 2.4; const Wd = TRUCK.half * 2; const Hh = 3.0; const fl = 1.05;
  const white = std({ color: 0xeef1f3, roughness: 0.6 }); const inside = std({ color: 0x3a3634, roughness: 1, side: THREE.DoubleSide }); const red = std({ color: 0xcc2b2b, roughness: 0.45, metalness: 0.2 }); const dark = std({ color: 0x1c1d20, roughness: 0.8 });
  box(Wd, 0.1, L, inside, 0, fl, -L / 2, g); box(Wd, 0.08, L, white, 0, fl + Hh, -L / 2, g); for (const sx of [-1, 1]) { box(0.06, Hh, L, white, sx * (Wd / 2 - 0.03), fl + Hh / 2, -L / 2, g); box(0.03, Hh - 0.1, L, inside, sx * (Wd / 2 - 0.08), fl + Hh / 2, -L / 2, g); box(0.07, 0.35, L, red, sx * (Wd / 2 + 0.005), fl + 0.6, -L / 2, g); } box(Wd, Hh, 0.06, white, 0, fl + Hh / 2, -L, g);
  box(Wd, 0.35, L, dark, 0, fl - 0.2, -L / 2, g); // Fahrgestell
  // Kabine
  const cab = new THREE.Group(); cab.position.set(0, 0, -L - 0.1); g.add(cab); box(Wd, 2.0, 2.2, red, 0, 1.6, -1.1, cab); box(Wd - 0.1, 0.9, 1.6, red, 0, 3.0, -1.35, cab); const glass = std({ color: 0x1d2a3a, roughness: 0.1, metalness: 0.6 }); box(Wd - 0.3, 0.75, 0.04, glass, 0, 3.0, -2.17, cab); for (const sx of [-1, 1]) box(0.04, 0.7, 1.0, glass, sx * (Wd / 2 + 0.005), 3.0, -1.4, cab); box(Wd + 0.1, 0.3, 0.3, dark, 0, 0.75, -2.25, cab); for (const sx of [-1, 1]) { const l = box(0.35, 0.18, 0.05, new THREE.MeshBasicMaterial({ color: 0xfff3c0 }), sx * 0.9, 1.1, -2.23, cab); l.castShadow = false; }
  // Räder
  const wheelGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.42, 20); wheelGeo.rotateZ(Math.PI / 2); const tire = std({ color: 0x18181a, roughness: 0.9 }); const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.44, 12); hubGeo.rotateZ(Math.PI / 2); const hub = std({ color: 0xa7adb2, metalness: 0.6, roughness: 0.4 });
  const wheels = []; for (const z of [-1.2, -2.3, -L - 1.7]) for (const sx of [-1, 1]) { const w = new THREE.Mesh(wheelGeo, tire); w.position.set(sx * (Wd / 2 - 0.15), 0.52, z); w.castShadow = true; const h = new THREE.Mesh(hubGeo, hub); w.add(h); g.add(w); wheels.push(w); }
  // Heck: Rücklichter, Stoßstange, zwei Flügeltüren
  box(Wd + 0.1, 0.18, 0.2, dark, 0, fl - 0.35, 0.05, g); for (const sx of [-1, 1]) { const l = box(0.22, 0.14, 0.04, new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xaa0000, emissiveIntensity: 1 }), sx * 1.05, fl - 0.12, 0.12, g); l.castShadow = false; }
  const doorMat = std({ color: 0xe4e8ea, roughness: 0.55 }); const doors = [-1, 1].map((sx) => { const hinge = new THREE.Object3D(); hinge.position.set(sx * Wd / 2, fl + 0.05, 0.02); g.add(hinge); const d = box(Wd / 2 - 0.02, Hh - 0.1, 0.06, doorMat, -sx * (Wd / 4), (Hh - 0.1) / 2, 0, hinge); d.castShadow = true; box(0.05, Hh - 0.4, 0.05, std({ color: 0x9aa1a6, metalness: 0.6 }), -sx * (Wd / 2 - 0.25), (Hh - 0.1) / 2, 0.05, hinge); for (const yy of [0.5, 1.5, 2.5]) box(0.12, 0.05, 0.04, dark, -sx * 0.05, yy, 0.04, hinge); return { hinge, sx }; });
  g.traverse((o) => { if (o.isMesh && o.castShadow !== false) o.castShadow = true; });
  return { group: g, doors, wheels, floorY: fl, inner: { x: Wd / 2 - 0.35, len: L }, setDoors(k) { for (const d of doors) d.hinge.rotation.y = d.sx * k * 1.95; } };
}

// ---------------- Waffen in der Hand ----------------
const gloveMat = std({ color: 0x2b2d31, roughness: 0.85 }); const sleeveMat = std({ color: 0x23395c, roughness: 0.9 });
function hand(parent, x, y, z, rx = 0, ry = 0, rz = 0) { const h = new THREE.Group(); h.position.set(x, y, z); h.rotation.set(rx, ry, rz); box(0.085, 0.07, 0.11, gloveMat, 0, 0, 0, h); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.34, 10), sleeveMat); s.rotation.x = Math.PI / 2 - 0.9; s.position.set(0, -0.13, 0.12); h.add(s); parent.add(h); return h; }
export function buildWeapons() {
  const root = new THREE.Group(); const all = {};
  // Kettensäge: orange Motor, Griffbügel, lange Schiene mit laufender Kette
  { const g = new THREE.Group(); const orange = std({ color: 0xf07a1a, roughness: 0.45 }); const black = std({ color: 0x1b1c1e, roughness: 0.7 });
    box(0.17, 0.19, 0.34, orange, 0, 0, 0, g); box(0.15, 0.06, 0.2, black, 0, 0.12, 0.02, g); box(0.18, 0.08, 0.1, black, 0, -0.07, 0.16, g);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 8, 18, Math.PI * 1.2), black); bow.rotation.set(0, Math.PI / 2, 0.3); bow.position.set(0, 0.07, -0.08); g.add(bow);
    box(0.04, 0.05, 0.2, black, 0, 0.06, 0.22, g);
    const barMat = std({ color: 0xa9afb4, metalness: 0.7, roughness: 0.35 }); const bar = box(0.022, 0.085, 0.72, barMat, 0, -0.02, -0.5, g);
    const chainTex = canvasTex(32, 256, (x, w, h) => { x.fillStyle = '#2a2b2e'; x.fillRect(0, 0, w, h); x.fillStyle = '#7d8388'; for (let y = 0; y < h; y += 16) { x.fillRect(4, y, w - 8, 9); } x.fillStyle = '#d6dbe0'; for (let y = 0; y < h; y += 32) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + 6); x.lineTo(0, y + 12); x.fill(); } }, [1, 18]);
    const chainMat = std({ map: chainTex, metalness: 0.6, roughness: 0.4 }); const chain = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.105, 0.74), chainMat); chain.position.copy(bar.position); g.add(chain);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0525, 0.0525, 0.028, 16, 1, false, 0, Math.PI), chainMat); tip.rotation.set(0, 0, Math.PI / 2); tip.rotation.y = Math.PI; tip.position.set(0, -0.02, -0.87); g.add(tip);
    hand(g, 0, 0.18, -0.08, 0.2, 0, 0); hand(g, 0.02, 0.06, 0.27, -0.1, 0, 0);
    g.position.set(0.24, -0.34, -0.42); g.rotation.set(0.08, 0.12, 0.05); root.add(g); all.saege = { group: g, chainTex, barMat, chainMat, muzzle: null, base: g.position.clone(), baseRot: g.rotation.clone() };
  }
  // Sägeblatt-Werfer: oben dreht sich ein Kreissägeblatt, vorne kommt das nächste raus
  { const g = new THREE.Group(); const body = std({ color: 0x2f6f3e, roughness: 0.5, metalness: 0.3 }); const dark = std({ color: 0x1d1e21, roughness: 0.5, metalness: 0.5 }); box(0.12, 0.1, 0.42, body, 0, 0, -0.05, g); box(0.05, 0.14, 0.07, dark, 0, -0.1, 0.08, g).rotation.x = -0.25; box(0.16, 0.03, 0.3, dark, 0, 0.065, -0.1, g);
    const blade = bladeMesh(0.12); blade.position.set(0, 0.09, -0.12); g.add(blade); hand(g, 0, -0.1, 0.08, 0.25, 0, 0); hand(g, 0, -0.04, -0.2, 0.1, 0, 0); const mz = new THREE.Object3D(); mz.position.set(0, 0.03, -0.3); g.add(mz);
    g.position.set(0.2, -0.24, -0.44); root.add(g); all.blatt = { group: g, blade, muzzle: mz, base: g.position.clone(), baseRot: g.rotation.clone() }; }
  // Minigun: sechs Läufe, die sich drehen
  { const g = new THREE.Group(); const grey = std({ color: 0x45494e, roughness: 0.4, metalness: 0.7 }); const dark = std({ color: 0x232427, roughness: 0.6, metalness: 0.4 }); box(0.16, 0.16, 0.3, dark, 0, 0, 0.08, g); box(0.1, 0.14, 0.18, std({ color: 0x4f5b3a, roughness: 0.8 }), -0.12, -0.04, 0.12, g);
    const barrels = new THREE.Group(); barrels.position.set(0, 0, -0.08); g.add(barrels); const bg = new THREE.CylinderGeometry(0.013, 0.013, 0.62, 8); bg.rotateX(Math.PI / 2); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const b = new THREE.Mesh(bg, grey); b.position.set(Math.cos(a) * 0.04, Math.sin(a) * 0.04, -0.3); barrels.add(b); } for (const z of [-0.1, -0.5]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14), dark); r.rotation.x = Math.PI / 2; r.position.z = z; barrels.add(r); }
    hand(g, 0.02, 0.11, 0.05, 0.2, 0, 0); hand(g, 0, -0.1, 0.18, 0.1, 0, 0); const mz = new THREE.Object3D(); mz.position.set(0, 0, -0.72); g.add(mz);
    g.position.set(0.2, -0.27, -0.48); g.rotation.set(0.03, 0.06, 0); root.add(g); all.minigun = { group: g, barrels, muzzle: mz, base: g.position.clone(), baseRot: g.rotation.clone() }; }
  // Schrotflinte (Pump)
  { const g = new THREE.Group(); const wood = std({ color: 0x7a4a26, roughness: 0.7 }); const steel = std({ color: 0x2a2c30, roughness: 0.35, metalness: 0.7 }); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 10), steel); b.rotation.x = Math.PI / 2; b.position.set(0, 0.03, -0.35); g.add(b); box(0.06, 0.08, 0.22, steel, 0, 0.01, 0.02, g); box(0.05, 0.1, 0.32, wood, 0, -0.04, 0.27, g).rotation.x = 0.12; const pump = box(0.055, 0.055, 0.18, wood, 0, -0.02, -0.3, g); hand(g, 0, -0.06, -0.3, 0.1, 0, 0); hand(g, 0.01, -0.08, 0.1, 0.25, 0, 0); const mz = new THREE.Object3D(); mz.position.set(0, 0.03, -0.72); g.add(mz);
    g.position.set(0.2, -0.24, -0.44); root.add(g); all.schrot = { group: g, pump, muzzle: mz, base: g.position.clone(), baseRot: g.rotation.clone(), pumpZ: -0.3 }; }
  // Häcksler: breite Walze mit Messern unten vor einem, rotes Gehäuse, Bügelgriff
  { const g = new THREE.Group(); const red = std({ color: 0xd2321e, roughness: 0.45, metalness: 0.2 }); const steel = std({ color: 0xb8bec4, metalness: 0.7, roughness: 0.3 }); const dark = std({ color: 0x1d1e21, roughness: 0.6 });
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.5, 20, 1, true, 0, Math.PI * 1.15), red); hood.material.side = THREE.DoubleSide; hood.rotation.set(0, 0, Math.PI / 2); hood.rotation.x = -0.9; hood.position.set(0, 0, -0.1); g.add(hood);
    const drum = new THREE.Group(); drum.position.set(0, 0, -0.1); g.add(drum); const core = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4, 14), steel); core.rotation.z = Math.PI / 2; drum.add(core); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; for (let k = -3; k <= 3; k++) { const b = box(0.04, 0.2, 0.03, steel, k * 0.2, Math.cos(a) * 0.17, Math.sin(a) * 0.17, drum); b.rotation.x = -a; } }
    for (const sx of [-1, 1]) { box(0.03, 0.03, 0.55, dark, sx * 0.25, 0.22, 0.32, g).rotation.x = 0.5; } box(0.55, 0.035, 0.035, dark, 0, 0.36, 0.56, g); hand(g, -0.18, 0.36, 0.56, 0.4, 0, 0); hand(g, 0.18, 0.36, 0.56, 0.4, 0, 0);
    g.position.set(0, -0.72, -1.05); g.rotation.x = 0.25; root.add(g); all.haecksler = { group: g, drum, muzzle: null, base: g.position.clone(), baseRot: g.rotation.clone() }; }
  // Granatwerfer: dickes Rohr, Trommel
  { const g = new THREE.Group(); const olive = std({ color: 0x4d5a34, roughness: 0.6 }); const dark = std({ color: 0x1f2022, roughness: 0.4, metalness: 0.5 }); const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 14), dark); tube.rotation.x = Math.PI / 2; tube.position.set(0, 0.03, -0.25); g.add(tube); const drm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 8), olive); drm.rotation.x = Math.PI / 2; drm.position.set(0, -0.02, 0.05); g.add(drm); box(0.05, 0.13, 0.06, dark, 0, -0.11, 0.14, g).rotation.x = -0.3; box(0.06, 0.09, 0.26, olive, 0, -0.02, 0.32, g);
    hand(g, 0, -0.11, 0.14, 0.3, 0, 0); hand(g, 0, -0.04, -0.25, 0.1, 0, 0); const mz = new THREE.Object3D(); mz.position.set(0, 0.03, -0.52); g.add(mz); g.position.set(0.2, -0.25, -0.44); root.add(g); all.granate = { group: g, drum: drm, muzzle: mz, base: g.position.clone(), baseRot: g.rotation.clone() }; }
  root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  // Mündungsfeuer
  const flashTex = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.25, 'rgba(255,214,90,.95)'); g.addColorStop(0.6, 'rgba(255,120,20,.4)'); g.addColorStop(1, 'rgba(255,80,0,0)'); x.fillStyle = g; x.beginPath(); for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2; const r = i % 2 ? 26 : 62; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.fill(); });
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true })); flash.scale.setScalar(0.22); flash.visible = false; flash.renderOrder = 20;
  return { root, all, flash, flashTex };
}
// Sägeblatt (fliegt und steckt in der Hand)
const bladeMatA = std({ color: 0xc9cfd4, metalness: 0.85, roughness: 0.25 }); const bladeMatB = std({ color: 0x8c4a1c, metalness: 0.4, roughness: 0.5 });
export function bladeMesh(r = 0.22) {
  const sh = new THREE.Shape(); const n = 24; for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2; const rr = i % 2 ? r : r * 0.84; const x = Math.cos(a) * rr; const y = Math.sin(a) * rr; if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y); } const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.12, 0, Math.PI * 2, true); sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: r * 0.04, bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, r * 0.02, 0); const m = new THREE.Mesh(g, bladeMatA); const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, r * 0.06, 12), bladeMatB); m.add(hub); m.castShadow = true; return m;
}
export function grenadeMesh() { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std({ color: 0x3e4a2a, roughness: 0.5 })); m.scale.set(1, 1, 1.5); m.castShadow = true; return m; }
// Mitspieler: einfache Figur in Spielerfarbe, Waffe in der Hand (holder)
export function buildAvatar(color) {
  const g = new THREE.Group(); const shirt = std({ color, roughness: 0.7 }); const jeans = std({ color: 0x2c3e66, roughness: 0.85 }); const skin = std({ color: 0xe2b08c, roughness: 0.7 });
  const legs = [-1, 1].map((sx) => { const piv = new THREE.Object3D(); piv.position.set(sx * 0.11, 0.85, 0); const l = box(0.15, 0.85, 0.17, jeans, 0, -0.42, 0, piv); l.castShadow = true; g.add(piv); return piv; });
  const torso = box(0.44, 0.6, 0.26, shirt, 0, 1.15, 0, g); torso.castShadow = true; const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), skin); head.position.set(0, 1.6, 0); head.castShadow = true; g.add(head); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), shirt); cap.position.copy(head.position); g.add(cap);
  for (const sx of [-1, 1]) { const a = box(0.11, 0.11, 0.5, shirt, sx * 0.2, 1.28, -0.22, g); a.castShadow = true; }
  const holder = new THREE.Object3D(); holder.position.set(0.05, 1.35, -0.25); g.add(holder);
  return { group: g, legs, holder, head };
}
export function boomTexture() { return canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,250,220,1)'); g.addColorStop(0.3, 'rgba(255,180,60,.95)'); g.addColorStop(0.65, 'rgba(200,60,10,.5)'); g.addColorStop(1, 'rgba(60,20,10,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }); }
