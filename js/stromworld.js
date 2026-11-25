// Theos Seitenscheidel - Strom-Spiel: die Karte. Wellblechhalle am Waldrand mit Tor, Tür, Dach (Leiter), Büro-Anbau und Mine im Keller,
// gleich daneben der Fluss mit Brücke und Steg, im Wald der Hügelbunker des Schwarzmarkts, im Osten erst die Stadt mit dem Dönerladen
// und dahinter das Energiedepot. Hügeliges Gelände, Wald aus Blender-Bäumen in Stufen (fällbar), Tag und Nacht über drei gebackene Himmel.
// Ebenen für Laufen und Kollision: 'boden' (Gelände, Halle, Büro, Bunker), 'dach' (y 8), 'mine' (y −6, Treppe aus der Halle).
import * as THREE from './vendor/three.module.min.js';
import { bakeOnly } from './racetex.js';
import { bakeSky, MOODS } from './racesky.js';
import { surface } from './racemat.js';
import { buildModel, modelGeo, flatMat, instances } from './stromart.js';
import { buildCity } from './stromcity.js';
import { createRegen } from './stromregen.js';
import { HALL, OFFICE, CHARGERS, GEN, GENS, SPOTS, genPos, riverX, ROAD_Z, BUNKER, BUNKER_DOOR, DEPOT, CITY, BOUNDS, TREES, MINE_LVL, BENCH_DZ } from './stromlogic.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const WATER_Y = -0.72; export const BRIDGE_X = riverX(ROAD_Z);
export const STAIRS = { x0: 15.0, x1: 16.6, z0: -5.6, z1: 2.4 }; // Treppe in die Mine (oben bei z1)
export const MINE = { x0: 6, x1: 17.6, z0: -10, z1: 10, y: -6 };
export const COAL = [{ x: 6.35, z: -6.5 }, { x: 6.35, z: 0.5 }, { x: 9.5, z: -9.65 }, { x: 13.2, z: -9.65 }, { x: 6.35, z: 6.8 }, { x: 9.6, z: 9.65 }]; // Kohleflöze in der Mine
export { BUNKER, DEPOT, ROAD_Z };

// ---------------- Gelände: flach, wo gespielt wird, sonst Hügel, am Rand Berge ----------------
const hash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, z) => { const ix = Math.floor(x); const iz = Math.floor(z); const fx = x - ix; const fz = z - iz; const u = fx * fx * (3 - 2 * fx); const v = fz * fz * (3 - 2 * fz); const a = hash(ix, iz); const b = hash(ix + 1, iz); const c = hash(ix, iz + 1); const d = hash(ix + 1, iz + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
export const fbm = (x, z) => 0.55 * vnoise(x, z) + 0.3 * vnoise(x * 2.1 + 7, z * 2.1 + 3) + 0.15 * vnoise(x * 4.3 + 1, z * 4.3 + 9);
const rectD = (x, z, x0, x1, z0, z1) => Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));
const BX = BUNKER_DOOR.x; const BZ = BUNKER_DOOR.z;
export function flatDist(x, z) { // Abstand zum nächsten Stück, das eben sein muss
  let d = Math.abs(z - ROAD_Z) - 13; d = Math.min(d, Math.abs(x - riverX(z)) - 11);
  d = Math.min(d, rectD(x, z, -34, 34, -26, 30), rectD(x, z, BX - 26, BX + 24, BZ - 16, BZ + 16), rectD(x, z, BX + 2, BX + 14, BZ, ROAD_Z), rectD(x, z, CITY.x0 - 6, CITY.x1 + 6, CITY.z0 - 4, CITY.z1 + 4), rectD(x, z, DEPOT.x0 - 22, DEPOT.x1 + 22, DEPOT.z0 - 20, 46));
  d = Math.min(d, Math.hypot(x - GEN.windgross.x, z - GEN.windgross.z) - 9); return Math.max(0, d);
}
export function terrainH(x, z) {
  const m = smooth(4, 64, flatDist(x, z)); let h = m > 0 ? m * 10 * fbm(x * 0.014 + 3, z * 0.014 + 5) : 0;
  const e = Math.max(smooth(138, 206, Math.abs(z)), smooth(-188, -246, x), smooth(326, 368, x)); if (e > 0) h += e * e * 40 * (0.55 + 0.45 * vnoise(x * 0.02 + 11, z * 0.02 + 2));
  const d = Math.abs(x - riverX(z)); if (d < 8.5) { const s = smooth(3.2, 8.5, d); h = h * s - 2.0 * (1 - s); }
  return h;
}
export const onBridge = (x, z) => Math.abs(z - ROAD_Z) < 4.2 && Math.abs(x - BRIDGE_X) < 9;
export const inHall = (x, z) => x > HALL.x0 && x < HALL.x1 && z > HALL.z0 && z < HALL.z1;
export const inOffice = (x, z) => x >= HALL.x1 - 0.2 && x < OFFICE.x1 && z > OFFICE.z0 && z < OFFICE.z1;
export const inBunker = (x, z) => (x > BUNKER.x0 - 0.3 && x < BUNKER.x1 + 0.3 && z > BUNKER.z0 - 0.3 && z < BUNKER.z1 + 0.3) || (x >= BUNKER.x1 && x < BX + 0.4 && Math.abs(z - BZ) < 1.2);
export const inStairs = (x, z) => x > STAIRS.x0 && x < STAIRS.x1 && z > STAIRS.z0 && z < STAIRS.z1;
export function groundY(x, z, lvl) {
  if (lvl === 'dach') return HALL.h; if (lvl === 'mine') return inStairs(x, z) ? MINE.y + (-MINE.y) * (z - STAIRS.z0) / (STAIRS.z1 - STAIRS.z0) : MINE.y;
  if (inHall(x, z) || inOffice(x, z) || onBridge(x, z) || inBunker(x, z)) return 0; return terrainH(x, z);
}
export const isInside = (p, lvl) => lvl === 'mine' || (lvl !== 'dach' && ((inHall(p.x, p.z) && p.y < HALL.h - 0.2) || inOffice(p.x, p.z))) || inBunker(p.x, p.z);
export const riverBlocked = (x, z) => Math.abs(x - riverX(z)) < 4.8 && !onBridge(x, z);

function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const std = (o) => new THREE.MeshStandardMaterial(o);
const decal = (m, k = 1) => { m.polygonOffset = true; m.polygonOffsetFactor = -1 * k; m.polygonOffsetUnits = -4 * k; return m; };
function tileUV(g, s) { const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * s[0], a.getY(i) * s[1]); return g; }
const TREE_HI = ['Baum_Fichte', 'Baum_Kiefer', 'Baum_Eiche', 'Baum_Birke']; const TREE_LO = ['Baum_Fichte_Fern', 'Baum_Kiefer_Fern', 'Baum_Eiche_Fern', 'Baum_Birke_Fern'];
const TREE_R = [0.3, 0.32, 0.45, 0.2]; const ALT = { 0: ['Baum_Stumpf', 'Baum_Stumpf'], 1: ['Baum_Nadel_Setzling', 'Baum_Laub_Setzling'], 2: ['Baum_Nadel_Jung', 'Baum_Laub_Jung'] };

export function buildStromWorld(renderer, { shadows = true, shadowSize = 2048 } = {}) {
  const noise = (c, w, h, n, cols, size) => { for (let i = 0; i < n; i++) { c.fillStyle = cols[(Math.random() * cols.length) | 0]; const s = size * (0.4 + Math.random()); c.fillRect(Math.random() * w, Math.random() * h, s, s * (0.6 + Math.random() * 2.2)); } };
  const GRASS = ctex(512, 512, (c, w, h) => { c.fillStyle = '#5b7c38'; c.fillRect(0, 0, w, h); for (let k = 0; k < 9; k++) { const x = Math.random() * w; const y = Math.random() * h; const g = c.createRadialGradient(x, y, 0, x, y, 160); g.addColorStop(0, 'rgba(120,150,66,.35)'); g.addColorStop(1, 'rgba(120,150,66,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); } noise(c, w, h, 9000, ['#648440', '#506e30', '#74944a', '#486428', '#84a052'], 3); noise(c, w, h, 300, ['#94985a', '#aaa86a'], 2); }, [1, 1]);
  const CONCRETE = ctex(512, 512, (c, w, h) => { c.fillStyle = '#a8a59e'; c.fillRect(0, 0, w, h); noise(c, w, h, 6000, ['rgba(80,78,72,.10)', 'rgba(255,255,255,.08)', 'rgba(60,58,54,.12)'], 3); for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(70,66,60,${0.04 + Math.random() * 0.06})`; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 30 + Math.random() * 80, 0, 7); c.fill(); } c.fillStyle = 'rgba(40,38,34,.55)'; c.fillRect(0, 0, w, 3); c.fillRect(0, 0, 3, h); }, [1, 1]);
  const ASPHALT = ctex(512, 512, (c, w, h) => { c.fillStyle = '#3c3d40'; c.fillRect(0, 0, w, h); noise(c, w, h, 14000, ['rgba(255,255,255,.06)', 'rgba(0,0,0,.12)', 'rgba(120,120,125,.10)'], 2); for (let k = 0; k < 5; k++) { c.fillStyle = `rgba(20,20,22,${0.10 + Math.random() * 0.1})`; c.fillRect(Math.random() * w, Math.random() * h, 60 + Math.random() * 120, 30 + Math.random() * 70); } c.strokeStyle = 'rgba(15,15,16,.55)'; c.lineWidth = 1.5; for (let k = 0; k < 7; k++) { let x = Math.random() * w; let y = Math.random() * h; c.beginPath(); c.moveTo(x, y); for (let i = 0; i < 9; i++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.3) * 40; c.lineTo(x, y); } c.stroke(); } }, [1, 1]);
  const GRAVEL = ctex(256, 256, (c, w, h) => { c.fillStyle = '#9c907e'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { c.fillStyle = ['#a89c88', '#8e8272', '#b2a894', '#857a6a', '#9a8e7c'][(Math.random() * 5) | 0]; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 1.5 + Math.random() * 3, 1.2 + Math.random() * 2.4, Math.random() * 3, 0, 7); c.fill(); } }, [1, 1]);
  const PAVE = ctex(256, 256, (c, w, h) => { c.fillStyle = '#b6b2aa'; c.fillRect(0, 0, w, h); noise(c, w, h, 2500, ['rgba(0,0,0,.05)', 'rgba(255,255,255,.06)'], 3); c.strokeStyle = 'rgba(70,68,62,.6)'; c.lineWidth = 2; for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(0, i * 64); c.lineTo(w, i * 64); c.stroke(); for (let j = 0; j < 4; j++) { const x = j * 64 + (i % 2) * 32; c.beginPath(); c.moveTo(x, i * 64); c.lineTo(x, i * 64 + 64); c.stroke(); } } }, [1, 1]);
  const T = bakeOnly(renderer, ['rock', 'mud']);
  const day = { ...MOODS.classic, fogD: 0.00055, fogH: 60, vol: 0.012, exposure: 0.92 }; const gold = { ...MOODS.hard, fogD: 0.0007, fogH: 50, vol: 0.03, exposure: 0.94 }; const night = { ...MOODS.nacht, fogD: 0.0022, vol: 0.06 }; // vol klein: sonst wäscht das Gegenlicht alles aus
  const grauTag = { ...MOODS.classic, zen: 0x56626e, hor: 0x9ba5ab, cloud: 0.98, cloudLit: 0xa9b1b7, cloudDark: 0x59626b, sun: 0xc8d0d8, sunI: 2.2 }; // geschlossene Wolkendecke für Regen und Gewitter
  const skies = { day: bakeSky(renderer, day, 11, 512), gold: bakeSky(renderer, gold, 11, 512), night: bakeSky(renderer, night, 11, 512), regen: bakeSky(renderer, grauTag, 11, 512) };
  const scene = new THREE.Scene(); scene.background = skies.day.cube; scene.environment = skies.day.env; scene.environmentIntensity = 0.85;
  const sun = new THREE.DirectionalLight(0xfff0d6, 4); sun.castShadow = shadows; sun.shadow.mapSize.set(shadowSize, shadowSize); const sc = sun.shadow.camera; sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 240; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x3a3020, 0.35); scene.add(hemi);
  const W = { scene, sun, sunDir: V3(0.3, 0.8, 0.4).normalize(), mood: day, sky: skies.day, skies, boxes: [], circles: [], trees: [], gens: new Map(), stores: new Map(), doors: { gate: { k: 0 }, tuer: { k: 0 }, bunker: { k: 0 }, mine: { k: 0 } }, anim: [], smoke: [], people: [], slots: {} };
  const box = (x0, x1, z0, z1, lvl = 'boden', o = {}) => { W.boxes.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), lvl, ...o }); };
  const circle = (x, z, r, o = {}) => { W.circles.push({ x, z, r, lvl: 'boden', veh: true, ...o }); };
  const add = (geo, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || scene).add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const put = (name, x, y, z, ry = 0, s = 1) => { const m = buildModel(name); m.group.position.set(x, y, z); m.group.rotation.y = ry; if (s !== 1) m.group.scale.setScalar(s); scene.add(m.group); return m; };
  const inst = (name, list, o) => { if (!list.length) return null; const g = instances(name, list, o); scene.add(g); return g; };
  const flatInst = (name, list, cast = true) => { if (!list.length) return null; const im = new THREE.InstancedMesh(modelGeo(name), flatMat(), list.length); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); list.forEach((t, i) => { q.setFromAxisAngle(V3(0, 1, 0), t.ry || 0); m4.compose(V3(t.x, t.y || 0, t.z), q, V3(t.s || 1, (t.s || 1) * (t.sy || 1), t.s || 1)); im.setMatrixAt(i, m4); }); im.castShadow = cast; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); return im; };
  const label = (w, h, draw, o = {}) => { const t = ctex(w, h, draw); return std({ map: t, roughness: 0.7, ...(o.glow ? { emissive: 0xffffff, emissiveMap: t, emissiveIntensity: o.glow } : {}) }); };
  const strip = (x0, x1, z0, z1, map, o = {}) => { const rep = o.rep || 4; const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); tileUV(g, [(x1 - x0) / rep, (z1 - z0) / rep]); const mat = decal(std({ map, color: o.color || 0xffffff, roughness: o.rough || 0.9, envMapIntensity: 0.5 }), o.k || 1); map.wrapS = map.wrapT = THREE.RepeatWrapping; return add(g, mat, (x0 + x1) / 2, o.y || 0.02, (z0 + z1) / 2, { cast: false }); };
  const R = (() => { let a = 12345; return () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; })();
  const kit = { THREE, W, scene, add, B, box, circle, std, ctex, decal, strip, put, inst, flatInst, label, R, V3, PAVE, ASPHALT, CONCRETE, tileUV, terrainH };

  // ---------------- Gelände ----------------
  { const sx = BOUNDS.x1 - BOUNDS.x0; const sz = BOUNDS.z1 - BOUNDS.z0; const nx = Math.round(sx / 2.5); const nz = Math.round(sz / 2.5); const g = new THREE.PlaneGeometry(sx, sz, nx, nz); g.rotateX(-Math.PI / 2); g.translate((BOUNDS.x0 + BOUNDS.x1) / 2, 0, (BOUNDS.z0 + BOUNDS.z1) / 2);
    const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) { const x = p.getX(i); const z = p.getZ(i); const h = terrainH(x, z); p.setY(i, h); const n = fbm(x * 0.03, z * 0.03); const forest = x < -24 ? 1 : smooth(20, 60, flatDist(x, z)); const rock = smooth(16, 34, h); const bank = 1 - smooth(5, 9, Math.abs(x - riverX(z)));
      c.setRGB(0.92 + n * 0.25, 0.95 + n * 0.2, 0.9 + n * 0.1); c.lerp(new THREE.Color(0.62, 0.78, 0.6), forest * 0.55); c.lerp(new THREE.Color(0.85, 0.82, 0.78), rock * 0.9); c.lerp(new THREE.Color(0.7, 0.62, 0.48), bank * 0.75); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); tileUV(g, [sx / 6, sz / 6]); GRASS.wrapS = GRASS.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(g, std({ map: GRASS, vertexColors: true, roughness: 1, envMapIntensity: 0.5 })); m.receiveShadow = true; scene.add(m); }

  // ---------------- Fluss: Wasserband, Kiesbett, Felsen, Schilf, Steg mit Boot ----------------
  { const ribbon = (half, y, v) => { const pos = []; const uv = []; const idx = []; let n = 0; for (let z = BOUNDS.z0 - 2; z <= BOUNDS.z1 + 2; z += 3) { const x = riverX(z); pos.push(x - half, y, z, x + half, y, z); uv.push(0, z / v, 1, z / v); if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } n++; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    const hgt = document.createElement('canvas'); hgt.width = hgt.height = 256; { const c = hgt.getContext('2d'); c.fillStyle = '#808080'; c.fillRect(0, 0, 256, 256); for (let i = 0; i < 500; i++) { const x = Math.random() * 256; const y = Math.random() * 256; const l = 14 + Math.random() * 46; const g = c.createLinearGradient(x, y, x, y + 7); const up = Math.random() < 0.5; g.addColorStop(0, up ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.5)'); g.addColorStop(1, 'rgba(128,128,128,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x, y, 5, l, 0, 0, 7); c.fill(); } }
    const src = hgt.getContext('2d').getImageData(0, 0, 256, 256).data; const nc = document.createElement('canvas'); nc.width = nc.height = 256; const nctx = nc.getContext('2d'); const img = nctx.createImageData(256, 256); const H = (x, y) => src[(((y + 256) % 256) * 256 + ((x + 256) % 256)) * 4] / 255;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 2.2; const dy = (H(x, y + 1) - H(x, y - 1)) * 2.2; const l = Math.hypot(dx, dy, 1); const i = (y * 256 + x) * 4; img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255; } nctx.putImageData(img, 0, 0);
    const nrm = new THREE.CanvasTexture(nc); nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping; nrm.repeat.set(2, 1);
    const water = std({ color: 0x2a7088, roughness: 0.1, metalness: 0.15, transparent: true, opacity: 0.84, envMapIntensity: 1.5, normalMap: nrm, normalScale: new THREE.Vector2(0.55, 0.55) }); W.water = add(ribbon(7.4, WATER_Y, 9), water, 0, 0, 0, { cast: false }); W.waterN = nrm;
    const bedT = ctex(256, 256, (c, w, h) => { c.fillStyle = '#5a5648'; c.fillRect(0, 0, w, h); for (let i = 0; i < 420; i++) { c.fillStyle = ['#787262', '#4a463a', '#8a8472', '#3e3a30', '#6a6454'][(Math.random() * 5) | 0]; c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 2 + Math.random() * 6, Math.random() * 3, 0, 7); c.fill(); } }, [1, 1]); bedT.wrapS = bedT.wrapT = THREE.RepeatWrapping; bedT.repeat.set(3, 1);
    add(ribbon(6.2, -1.85, 5), std({ map: bedT, roughness: 1 }), 0, 0, 0, { cast: false });
    const rocks = [[], [], []]; const reeds = []; const bushes = [];
    for (let z = BOUNDS.z0 + 6; z < BOUNDS.z1 - 6; z += 3.4) { if (Math.abs(z - ROAD_Z) < 8) continue; const x = riverX(z); for (const s of [-1, 1]) { const u = R();
        if (u < 0.34) rocks[(R() * 3) | 0].push({ x: x + s * (4.6 + R() * 3.2), y: -1.1 + R() * 0.7, z: z + R() * 2, ry: R() * 6.28, s: 0.5 + R() * 0.8 }); else if (u < 0.74) reeds.push({ x: x + s * (5.6 + R() * 1.4), y: WATER_Y - 0.25, z: z + R() * 2, ry: R() * 6.28, s: 0.8 + R() * 0.7 });
        else if (u < 0.86 && !(x + s * 11 > -24 && x + s * 11 < 28 && z > -17 && z < 30)) bushes.push({ x: x + s * (9.5 + R() * 2.5), z: z + R() * 2, ry: R() * 6.28, s: 0.8 + R() * 0.8 }); } if (R() < 0.12) rocks[2].push({ x: x + (R() - 0.5) * 6, y: -1.9, z, ry: R() * 6.28, s: 0.6 + R() * 0.5 }); }
    W.scatter = { rocks, reeds, bushes };
    const pz = 7.4; const px = riverX(pz) - 7.2; const steg = put('Steg', px, -0.42, pz, Math.PI / 2); void steg; put('Boot', px + 2.2, WATER_Y - 0.12, pz + 2.1, 0.4); W.pier = { x0: px - 3.1, x1: px + 3.1, z0: pz - 1, z1: pz + 1 };
  }

  // ---------------- Straßen, Hof, Wege ----------------
  { strip(BOUNDS.x0 + 4, BOUNDS.x1 - 4, ROAD_Z - 4, ROAD_Z + 4, ASPHALT, { rep: 8, rough: 0.92, y: 0.03 });
    for (const s of [-1, 1]) { strip(BOUNDS.x0 + 4, CITY.x0, ROAD_Z + s * 4 - (s < 0 ? 1.3 : 0), ROAD_Z + s * 4 + (s > 0 ? 1.3 : 0), GRAVEL, { rep: 3, y: 0.025 }); strip(CITY.x1, BOUNDS.x1 - 4, ROAD_Z + s * 4 - (s < 0 ? 1.3 : 0), ROAD_Z + s * 4 + (s > 0 ? 1.3 : 0), GRAVEL, { rep: 3, y: 0.025 }); }
    const lm = decal(std({ color: 0xf2f0e8, roughness: 0.6 }), 2); const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.16).rotateX(-Math.PI / 2), lm, 104); const m4 = new THREE.Matrix4(); let n = 0; for (let x = BOUNDS.x0 + 8; x < BOUNDS.x1 - 8 && n < 104; x += 6) dash.setMatrixAt(n++, m4.makeTranslation(x, 0.035, ROAD_Z)); dash.count = n; dash.receiveShadow = true; scene.add(dash);
    for (const s of [-1, 1]) add(new THREE.PlaneGeometry(BOUNDS.x1 - BOUNDS.x0 - 8, 0.12).rotateX(-Math.PI / 2), lm, (BOUNDS.x0 + BOUNDS.x1) / 2, 0.035, ROAD_Z + s * 3.75, { cast: false });
    strip(-21, 14.5, 11, ROAD_Z - 4, CONCRETE, { rep: 5, rough: 0.85, y: 0.025 }); const ym = decal(std({ color: 0xf2c21a, roughness: 0.6 }), 2); for (const x of [-11.2, -7.8, -4.7, -1.3, 2.2, 5.8]) add(new THREE.PlaneGeometry(0.12, 6).rotateX(-Math.PI / 2), ym, x, 0.03, 16.4, { cast: false });
    strip(BX + 5.5, BX + 11.5, BZ + 8, ROAD_Z - 4, GRAVEL, { rep: 3, y: 0.025 }); strip(BX + 0.6, BX + 17, BZ - 8, BZ + 8, GRAVEL, { rep: 3, y: 0.025 });
    strip(DEPOT.bay.x0 - 6, DEPOT.bay.x1 + 6, DEPOT.z1, ROAD_Z - 4, ASPHALT, { rep: 6, y: 0.025 }); for (const z of [DEPOT.bay.z0 + 1, (DEPOT.bay.z0 + DEPOT.bay.z1) / 2, DEPOT.bay.z1 - 1.5]) add(new THREE.PlaneGeometry(DEPOT.bay.x1 - DEPOT.bay.x0, 0.18).rotateX(-Math.PI / 2), ym, (DEPOT.bay.x0 + DEPOT.bay.x1) / 2, 0.035, z, { cast: false });
    // Brücke über den Fluss
    const st = std({ color: 0x8a8680, roughness: 0.85 }); const rail = std({ color: 0x4a5056, roughness: 0.5, metalness: 0.6 }); add(B(20, 0.6, 9.4), st, BRIDGE_X, -0.31, ROAD_Z);
    for (const s of [-1, 1]) { add(B(20, 0.35, 0.5), st, BRIDGE_X, 0.17, ROAD_Z + s * 4.45); add(B(20, 0.07, 0.1), rail, BRIDGE_X, 1.05, ROAD_Z + s * 4.45); add(B(20, 0.05, 0.06), rail, BRIDGE_X, 0.68, ROAD_Z + s * 4.45); for (let i = -5; i <= 5; i++) add(B(0.08, 0.75, 0.08), rail, BRIDGE_X + i * 1.95, 0.7, ROAD_Z + s * 4.45); for (const i of [-1, 0, 1]) add(B(1.0, 2.6, 0.9), st, BRIDGE_X + i * 5.2, -1.6, ROAD_Z + s * 3.4); box(BRIDGE_X - 10, BRIDGE_X + 10, ROAD_Z + s * 4.45 - 0.25, ROAD_Z + s * 4.45 + 0.25, 'boden', { veh: true }); }
  }

  // ---------------- Halle ----------------
  const blech = ctex(512, 512, (c, w, h) => { c.fillStyle = '#66755f'; c.fillRect(0, 0, w, h); for (let i = 0; i < 32; i++) { const g = c.createLinearGradient(i * 16, 0, i * 16 + 16, 0); g.addColorStop(0, 'rgba(255,255,255,.12)'); g.addColorStop(0.5, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(255,255,255,.12)'); c.fillStyle = g; c.fillRect(i * 16, 0, 16, h); }
    for (let k = 0; k < 70; k++) { const x = Math.random() * w; const l = 30 + Math.random() * 160; const g = c.createLinearGradient(0, 0, 0, l); g.addColorStop(0, `rgba(${130 + Math.random() * 50},${66 + Math.random() * 30},24,${0.12 + Math.random() * 0.2})`); g.addColorStop(1, 'rgba(120,70,30,0)'); c.fillStyle = g; c.fillRect(x, 0, 2 + Math.random() * 7, l); }
    const d = c.createLinearGradient(0, h - 110, 0, h); d.addColorStop(0, 'rgba(40,36,28,0)'); d.addColorStop(1, 'rgba(40,36,28,.4)'); c.fillStyle = d; c.fillRect(0, h - 110, w, 110); c.fillStyle = 'rgba(0,0,0,.28)'; for (const y of [170, 340]) c.fillRect(0, y, w, 3); c.fillStyle = 'rgba(220,220,210,.5)'; for (const y of [163, 333]) for (let x = 8; x < w; x += 32) c.fillRect(x - 1, y, 3, 3); }, [1, 1]);
  const wallM = (rx, ry) => { const t = blech.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return std({ map: t, roughness: 0.55, metalness: 0.5, envMapIntensity: 0.6 }); };
  const H = HALL.h; const hall = new THREE.Group(); scene.add(hall); const dark = std({ color: 0x2c3034, roughness: 0.6, metalness: 0.7 }); const plinth = std({ map: CONCRETE, color: 0x9a968e, roughness: 0.9 });
  const wall = (x0, x1, z0, z1, y0 = 0, y1 = H) => { const w = x1 - x0; const d = z1 - z0; add(B(w, y1 - y0, d), wallM(Math.max(w, d) / 8, (y1 - y0) / 8), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, { parent: hall }); };
  const OD = OFFICE.door;
  wall(-18.15, 18.15, -11.15, -10.85); wall(-18.15, -17.85, -11, 11); wall(17.85, 18.15, -11, OD[0]); wall(17.85, 18.15, OD[1], 11); wall(17.85, 18.15, OD[0], OD[1], 2.2, H);
  wall(-18.15, -17.5, 10.85, 11.15); wall(-12.5, 5.5, 10.85, 11.15); wall(6.7, 18.15, 10.85, 11.15); wall(-17.5, -12.5, 10.85, 11.15, 4.6, H); wall(5.5, 6.7, 10.85, 11.15, 2.3, H);
  box(-18.2, 18.2, -11.2, -10.8); box(-18.2, -17.8, -11, 11); box(17.8, 18.2, -11, OD[0]); box(17.8, 18.2, OD[1], 11); box(-18.2, -17.5, 10.8, 11.2); box(-12.5, 5.5, 10.8, 11.2); box(6.7, 18.2, 10.8, 11.2);
  box(-17.5, -12.5, 10.8, 11.2, 'boden', { door: 'gate', veh: true }); box(5.5, 6.7, 10.8, 11.2, 'boden', { door: 'tuer' });
  // Sockel, Dachkante, Fensterband, Regenrohre
  for (const [x, z, w, d] of [[0, -11.2, 36.7, 0.14], [-18.2, 0, 0.14, 22.5], [-17.85, 11.2, 0.75, 0.14], [-3.5, 11.2, 18, 0.14], [12.45, 11.2, 11.5, 0.14]]) add(B(w, 1.0, d), plinth, x, 0.5, z, { parent: hall, cast: false });
  add(B(0.14, 1.0, 15.2), plinth, 18.2, 0.5, -3.5, { parent: hall, cast: false });
  for (const [x, z, w, d] of [[0, -11.22, 36.8, 0.1], [0, 11.22, 36.8, 0.1], [-18.22, 0, 0.1, 22.6], [18.22, 0, 0.1, 22.6]]) { add(B(w, 0.5, d), dark, x, H - 0.4, z, { parent: hall, cast: false }); add(B(w + (w > 1 ? 0.3 : 0.2), 0.12, d + (d > 1 ? 0.3 : 0.2)), dark, x, H + 0.86, z, { parent: hall, cast: false }); }
  { const win = ctex(256, 128, (c, w, h) => { c.fillStyle = '#23272b'; c.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { const g = c.createLinearGradient(0, 8, 0, h - 8); g.addColorStop(0, '#8fb2c4'); g.addColorStop(1, '#5d7d8c'); c.fillStyle = g; c.fillRect(6 + i * 63, 8, 55, h - 16); c.fillStyle = 'rgba(60,50,30,.25)'; for (let k = 0; k < 14; k++) c.fillRect(6 + i * 63 + Math.random() * 50, 8 + Math.random() * (h - 20), 2 + Math.random() * 12, 1 + Math.random() * 3); } }); win.wrapS = THREE.RepeatWrapping;
    const band = (x0, x1, z, face) => { const t = win.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set((x1 - x0) / 4.4, 1); const m = std({ map: t, roughness: 0.25, metalness: 0.3, emissive: 0x6a8a9a, emissiveMap: t, emissiveIntensity: 0.12 }); add(new THREE.PlaneGeometry(x1 - x0, 1.25), m, (x0 + x1) / 2, 6.25, z, { parent: hall, cast: false, ry: face > 0 ? 0 : Math.PI }); };
    band(-17, 17, 11.17, 1); band(-17, 17, 10.83, -1); band(-17, 17, -11.17, -1); band(-17, 17, -10.83, 1);
    const pipe = std({ color: 0x3a4044, roughness: 0.5, metalness: 0.6 }); for (const [x, z] of [[-18.28, 11.28], [18.28, 11.28], [-18.28, -11.28], [18.28, -11.28]]) add(new THREE.CylinderGeometry(0.08, 0.08, H, 8), pipe, x, H / 2, z, { parent: hall }); }
  // Dach mit Brüstung, innen Stahlträger
  add(B(36.3, 0.3, 22.3), std({ color: 0x4a4e50, roughness: 0.8, metalness: 0.3 }), 0, H - 0.15, 0, { parent: hall });
  { const pm = wallM(9, 0.1); for (const [x, z, w, d] of [[0, -11, 36.3, 0.3], [0, 11, 36.3, 0.3], [-18, 0, 0.3, 22.3], [18, 0, 0.3, 22.3]]) add(B(w, 0.8, d), pm, x, H + 0.4, z, { parent: hall }); }
  box(-19, 19, -12, -10.75, 'dach'); box(-19, 19, 10.75, 12, 'dach'); box(-19, -17.75, -12, 12, 'dach'); box(17.75, 19, -12, 12, 'dach');
  for (let x = -15; x <= 15; x += 5) { add(B(0.25, 0.5, 22), dark, x, H - 0.55, 0, { parent: hall, cast: false }); for (const z of [-10.6, 10.6]) add(B(0.3, H - 0.8, 0.22), dark, x, (H - 0.8) / 2, z, { parent: hall, cast: false }); }
  // Boden mit Loch für die Treppe
  { const fm = decal(std({ map: CONCRETE, color: 0xd8d4cc, roughness: 0.7, metalness: 0.05, envMapIntensity: 0.7 })); const slab = (x0, x1, z0, z1) => { const g = B(x1 - x0, 0.3, z1 - z0); tileUV(g, [(x1 - x0) / 4, (z1 - z0) / 4]); add(g, fm, (x0 + x1) / 2, -0.15 + 0.012, (z0 + z1) / 2, { parent: hall, cast: false }); };
    slab(-18, STAIRS.x0, -11, 11); slab(STAIRS.x1, 18, -11, 11); slab(STAIRS.x0, STAIRS.x1, -11, STAIRS.z0); slab(STAIRS.x0, STAIRS.x1, STAIRS.z1, 11);
    const rail = std({ color: 0xf2c21a, roughness: 0.5, metalness: 0.3 }); const len = STAIRS.z1 - STAIRS.z0; for (const x of [STAIRS.x0 - 0.1, STAIRS.x1 + 0.1]) { for (const y of [0.55, 1.0]) add(B(0.06, 0.06, len), rail, x, y, (STAIRS.z0 + STAIRS.z1) / 2, { parent: hall }); for (let z = STAIRS.z0; z <= STAIRS.z1 - 0.2; z += 1.4) add(B(0.06, 1.0, 0.06), rail, x, 0.5, z, { parent: hall }); } for (const y of [0.55, 1.0]) add(B(STAIRS.x1 - STAIRS.x0 + 0.26, 0.06, 0.06), rail, (STAIRS.x0 + STAIRS.x1) / 2, y, STAIRS.z0 - 0.1, { parent: hall });
    box(STAIRS.x0 - 0.2, STAIRS.x0, STAIRS.z0 - 0.2, STAIRS.z1 - 0.15); box(STAIRS.x1, STAIRS.x1 + 0.2, STAIRS.z0 - 0.2, STAIRS.z1 - 0.15); box(STAIRS.x0 - 0.2, STAIRS.x1 + 0.2, STAIRS.z0 - 0.3, STAIRS.z0);
    // Gitter vor der Mine (geht ab Level 5 auf)
    const gm = put('Gitter_Mine', (STAIRS.x0 + STAIRS.x1) / 2, 0, STAIRS.z1 + 0.06); add(new THREE.PlaneGeometry(0.86, 0.46), label(256, 128, (c, w, h) => { c.fillStyle = '#f2c21a'; c.fillRect(0, 0, w, h); c.fillStyle = '#16171a'; c.font = '800 44px Bahnschrift'; c.textAlign = 'center'; c.fillText('MINE', w / 2, 52); c.font = '700 30px Bahnschrift'; c.fillText(`ab Level ${MINE_LVL}`, w / 2, 100); }), 0, 1.3, 0.075, { parent: gm.group, cast: false });
    W.doors.mine.apply = (k) => { gm.group.position.y = k * 2.4; gm.group.visible = k < 0.98; }; box(STAIRS.x0, STAIRS.x1, STAIRS.z1 - 0.02, STAIRS.z1 + 0.16, 'boden', { door: 'mine' }); }
  // Tor (Rolltor) mit Rahmen, Tür mit Vordach, Schilder, Lampen
  { const slat = ctex(64, 256, (c, w, h) => { c.fillStyle = '#9aa0a2'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(0, y, w, 2); c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(0, y + 2, w, 2); } }, [3, 1.2]);
    const gate = add(B(5, 4.6, 0.12), std({ map: slat, roughness: 0.5, metalness: 0.6 }), -15, 2.3, 11.0, { parent: hall }); W.doors.gate.mesh = gate; W.doors.gate.apply = (k) => { gate.position.y = 2.3 + k * 4.3; gate.scale.y = 1 - k * 0.9; };
    const haz = ctex(64, 256, (c, w, h) => { c.fillStyle = '#f2c21a'; c.fillRect(0, 0, w, h); c.fillStyle = '#16171a'; for (let y = -64; y < h; y += 64) { c.beginPath(); c.moveTo(0, y + 32); c.lineTo(w, y); c.lineTo(w, y + 32); c.lineTo(0, y + 64); c.fill(); } }); const hm = std({ map: haz, roughness: 0.6 });
    for (const x of [-17.62, -12.38]) add(B(0.24, 4.7, 0.34), hm, x, 2.35, 11.05, { parent: hall }); add(B(5.5, 0.3, 0.4), dark, -15, 4.75, 11.08, { parent: hall });
    const piv = new THREE.Group(); piv.position.set(5.5, 0, 11.0); hall.add(piv); add(B(1.2, 2.3, 0.08), std({ color: 0x5a6670, roughness: 0.45, metalness: 0.6 }), 0.6, 1.15, 0, { parent: piv }); add(B(0.04, 0.04, 0.2), std({ color: 0xd0d0d0, metalness: 1, roughness: 0.3 }), 1.05, 1.05, 0, { parent: piv });
    W.doors.tuer.apply = (k) => { piv.rotation.y = -k * 1.6; }; add(B(2.2, 0.1, 1.2), dark, 6.1, 2.55, 11.7, { parent: hall }); for (const x of [5.1, 7.1]) add(B(0.05, 0.05, 1.3), dark, x, 2.25, 11.7, { parent: hall, rx: 0.5 });
    const sign = label(1024, 256, (c, w, h) => { c.fillStyle = '#e8e2d4'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0332a'; c.fillRect(0, 0, w, 22); c.fillRect(0, h - 22, w, 22); c.fillStyle = '#1a1a1a'; c.font = '900 150px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.fillText('HALLE 7', w / 2, 182); c.fillStyle = 'rgba(90,60,30,.25)'; for (let i = 0; i < 30; i++) c.fillRect(Math.random() * w, 22, 3 + Math.random() * 8, 30 + Math.random() * 150); });
    add(B(6.6, 1.8, 0.1), dark, -2, 4.3, 11.2, { parent: hall }); add(new THREE.PlaneGeometry(6.4, 1.6), sign, -2, 4.3, 11.26, { parent: hall, cast: false });
    const warn = label(256, 256, (c, w, h) => { c.fillStyle = '#f2f0e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0332a'; c.font = '800 34px Bahnschrift'; c.textAlign = 'center'; c.fillText('PRIVAT', w / 2, 70); c.fillStyle = '#1a1a1a'; c.font = '600 26px Bahnschrift'; c.fillText('Betreten', w / 2, 130); c.fillText('verboten', w / 2, 165); c.fillText('Hier ist nichts', w / 2, 215); });
    add(new THREE.PlaneGeometry(0.7, 0.7), warn, 7.6, 1.6, 11.28, { parent: hall, cast: false });
    inst('Aussenlampe', [{ x: -15, y: 5.3, z: 11.16, ry: -Math.PI / 2 }, { x: 6.1, y: 3.0, z: 11.16, ry: -Math.PI / 2 }, { x: 12.5, y: 4.2, z: 11.16, ry: -Math.PI / 2 }, { x: 18.16, y: 4.4, z: -4, ry: 0 }, { x: -18.16, y: 4.2, z: 0, ry: Math.PI }]);
    inst('Lueftung', [{ x: -18.16, y: 3.0, z: -6, ry: Math.PI }, { x: -18.16, y: 3.0, z: 5, ry: Math.PI }, { x: 2.5, y: 3.2, z: -11.16, ry: Math.PI / 2 }, { x: 10, y: 3.2, z: -11.16, ry: Math.PI / 2 }]);
    put('Stromkasten', 9.0, 0, 11.16, -Math.PI / 2); put('Muellcontainer', 11.4, 0, 12.6, 0); circle(11.4, 12.6, 1.0); inst('Fass_Rost', [{ x: -6.4, z: 12.0 }, { x: -5.7, z: 12.2, ry: 1 }]); circle(-6.05, 12.1, 0.55); put('Palette', 0.5, 0, 12.4, 0.1); put('Kiste', 0.5, 0.14, 12.4, 0.3); circle(0.5, 12.4, 0.6); put('Reifenstapel', 1.9, 0, 12.2); circle(1.9, 12.2, 0.4);
    // Zaun um den Hof: seit 2026-11-21 entfernt (Lennox: das Auto blieb darin stecken), samt Hitbox
  }
  // Leiter aufs Dach (Ostwand) mit Rückenschutz
  { const lm = std({ color: 0xc8c8c0, roughness: 0.4, metalness: 0.8 }); const L = SPOTS.ladder; for (const s of [-0.28, 0.28]) add(B(0.06, H + 1.1, 0.06), lm, L.x - 0.1, (H + 1.1) / 2, L.z + s); for (let y = 0.3; y < H + 1; y += 0.32) add(B(0.04, 0.04, 0.56), lm, L.x - 0.1, y, L.z);
    for (let y = 2.6; y < H + 0.9; y += 1.1) { const t = add(new THREE.TorusGeometry(0.78, 0.022, 5, 14, Math.PI), lm, L.x - 0.1, y, L.z, { rx: Math.PI / 2 }); t.rotation.z = -Math.PI / 2; } for (const a of [-0.9, 0, 0.9]) add(B(0.03, H - 1.6, 0.03), lm, L.x - 0.1 + Math.cos(a) * 0.78, 2.6 + (H - 1.6) / 2, L.z + Math.sin(a) * 0.78);
    box(L.x - 0.25, L.x + 0.05, L.z - 0.35, L.z + 0.35); W.ladder = { x: L.x + 0.5, z: L.z, top: H, rung: 0.32, y0: 0.3, wallX: L.x - 0.1 }; }
  // Licht in der Halle
  W.lamps = []; for (const [x, z] of [[-9, -3], [9, -3], [0, 5]]) { const l = new THREE.PointLight(0xffe4c0, 60, 30, 1.6); l.position.set(x, H - 1.2, z); scene.add(l); W.lamps.push(l); add(B(1.2, 0.12, 0.4), std({ color: 0x202020, emissive: 0xfff2d8, emissiveIntensity: 3 }), x, H - 1.05, z, { parent: hall, cast: false }); add(B(0.03, 0.9, 0.03), dark, x, H - 0.6, z, { parent: hall, cast: false }); }
  // Drei Werkbänke mit je einer Kurbel
  for (let k = 0; k < 3; k++) { const p = genPos('kurbel', k); put('Werkbank', p.x, 0, p.z, 0); box(p.x - 0.78, p.x + 0.78, p.z - 0.45, p.z + 0.45); }
  // Vierte Werkbank: nur sichtbar und fest in Spielständen für vier Spieler (applyWorld schaltet sie)
  { const p = genPos('kurbel', 3); const m = put('Werkbank', p.x, 0, p.z, 0); box(p.x - 0.78, p.x + 0.78, p.z - 0.45, p.z + 0.45, 'boden', { off: true }); const b = W.boxes[W.boxes.length - 1]; m.group.visible = false; W.bench4 = { on: false, show(on) { m.group.visible = on; b.off = !on; W.bench4.on = on; } }; }
  void BENCH_DZ;
  // Ladeplätze an der Westwand, darüber die Kabelbahn
  W.chargers = {}; { const led = () => std({ color: 0x111111, emissive: 0x30ff80, emissiveIntensity: 0 }); add(B(0.3, 0.06, 20), dark, -17.7, 3.42, -1, { parent: hall, cast: false });
    for (const c of CHARGERS) { const scr = label(128, 64, (x, w, h) => { x.fillStyle = '#0c1014'; x.fillRect(0, 0, w, h); x.fillStyle = '#7affb8'; x.font = '800 44px Bahnschrift'; x.textAlign = 'center'; x.fillText(c.id, w / 2, 48); }, { glow: 0.9 });
      put(c.big ? 'Ladeplatz_Gross' : 'Ladeplatz_Klein', -17.85, 0, c.z, 0); const l = led();
      if (!c.big) { add(new THREE.PlaneGeometry(0.44, 0.22), scr, -17.53, 1.36, c.z + 0.04, { ry: Math.PI / 2, cast: false }); add(B(0.02, 0.42, 0.05), l, -17.535, 0.9, c.z + 0.22, { cast: false }); W.chargers[c.id] = { x: c.x, z: c.z, sock: V3(-17.5, 0.8, c.z - 0.05), led: l }; }
      else { add(new THREE.PlaneGeometry(0.5, 0.26), scr, -17.205, 1.75, c.z + 0.08, { ry: Math.PI / 2, cast: false }); add(B(0.02, 0.5, 0.08), l, -17.21, 1.1, c.z - 0.5, { cast: false }); box(-17.85, -17.2, c.z - 0.62, c.z + 0.62); W.chargers[c.id] = { x: c.x, z: c.z, sock: V3(-17.1, 1.2, c.z + 0.3), led: l }; } } }
  // Stellplätze am Boden zeigen, was noch kommt
  { const SLOT = { fahrrad: [2.4, 1.4], laufrad: [3.2, 2.6], aggregat: [1.8, 1.6], holzofen: [4.8, 2.4], kohle: [6.6, 3.2], biogas: [5.2, 3.4], atom: [6.2, 4.6], fusion: [7.8, 7.8] };
    for (const g of GENS) { const s = SLOT[g.id]; if (!s) continue; const rot = g.rot === Math.PI; const m = decal(std({ map: ctex(512, Math.round(512 * s[1] / s[0]), (c, w, h) => { c.clearRect(0, 0, w, h); c.strokeStyle = '#f2c21a'; c.lineWidth = 10; c.setLineDash([36, 22]); c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = 'rgba(242,194,26,.92)'; c.textAlign = 'center'; const fs = Math.min(64, h * 0.26); c.font = `800 ${fs}px Bahnschrift`; c.fillText(g.name.length > 18 ? g.name.split(' ')[0] : g.name, w / 2, h / 2 - 4); c.font = `700 ${fs * 0.62}px Bahnschrift`; c.fillText(`ab Level ${g.lvl}`, w / 2, h / 2 + fs * 0.8); }), transparent: true, roughness: 0.8, depthWrite: false }), 2);
      const cx = g.id === 'kohle' ? g.x - 0.55 : g.id === 'atom' ? g.x - 0.4 : g.id === 'laufrad' ? g.x + 0.15 : g.x; const cz = g.id === 'laufrad' ? g.z - 0.4 : g.id === 'holzofen' ? g.z - 0.35 : g.z; const mesh = add(new THREE.PlaneGeometry(s[0], s[1]).rotateX(-Math.PI / 2), m, cx, 0.02, cz, { cast: false, ry: rot ? Math.PI : 0 }); W.slots[g.id] = mesh; } }
  // Kram in der Halle: Regale, Spinde, Fässer, Paletten
  { put('Regal_Lager', 9.6, 0, 10.4, Math.PI); box(8.2, 11.0, 10.0, 10.8); put('Regal_Lager', 12.6, 0, 10.4, Math.PI); box(11.2, 14.0, 10.0, 10.8); put('Spind', 3.6, 0, 10.5, Math.PI); box(2.9, 4.3, 10.2, 10.8);
    inst('Fass', [{ x: -11.4, z: 10.2 }, { x: -10.7, z: 10.3, ry: 0.7 }, { x: -11.0, z: 9.6, ry: 2 }]); circle(-11.05, 10.05, 0.8, { veh: false }); put('Palette', -9.2, 0, 10.1, 0.05); put('Kiste', -9.2, 0.14, 10.1, 0.2); put('Kiste', -9.25, 0.74, 10.1, -0.3, 0.8); box(-9.85, -8.55, 9.5, 10.7);
    put('Palette', 17.0, 0, -9.9, Math.PI / 2); put('Fass_Rost', 17.2, 0.14, -9.9); box(16.4, 17.7, -10.6, -9.3); }

  // ---------------- Büro-Anbau: PC, Stuhl, Feldbett ----------------
  { const O = OFFICE; const cx = (O.x0 + O.x1) / 2; const cz = (O.z0 + O.z1) / 2; const hh = 3.0; const plaster = std({ color: 0xe6e2d8, roughness: 0.9 }); const cladN = wallM(0.8, 0.4);
    const lam = ctex(256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = ['#a8804e', '#9c7444', '#b08a58', '#946c3e'][i % 4]; c.fillRect(0, i * 32, w, 32); c.fillStyle = 'rgba(40,24,10,.35)'; c.fillRect(0, i * 32, w, 1.5); c.fillRect(((i * 97) % 200) + 20, i * 32, 1.5, 32); } noise(c, w, h, 400, ['rgba(60,36,14,.12)'], 6); }, [1, 1]); lam.wrapS = lam.wrapT = THREE.RepeatWrapping; lam.repeat.set(2.4, 2.4);
    add(B(O.x1 - HALL.x1 + 0.1, 0.1, O.z1 - O.z0), decal(std({ map: lam, roughness: 0.6 })), (HALL.x1 + O.x1) / 2, -0.03, cz, { cast: false }); add(B(O.x1 - HALL.x1 + 0.7, 0.2, O.z1 - O.z0 + 0.6), dark, (HALL.x1 + O.x1) / 2 + 0.1, hh + 0.1, cz);
    const wl = (x0, x1, z0, z1, y0 = 0, y1 = hh) => add(B(x1 - x0, y1 - y0, z1 - z0), plaster, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    wl(18.15, O.x1 + 0.2, O.z0 - 0.2, O.z0); wl(18.15, O.x1 + 0.2, O.z1, O.z1 + 0.2); wl(O.x1, O.x1 + 0.2, O.z0, 6.2); wl(O.x1, O.x1 + 0.2, 8.8, O.z1); wl(O.x1, O.x1 + 0.2, 6.2, 8.8, 0, 1.0); wl(O.x1, O.x1 + 0.2, 6.2, 8.8, 2.3, hh);
    for (const [x, z, w, d, ry] of [[cx + 0.1, O.z0 - 0.21, O.x1 - 18.15 + 0.2, 0, Math.PI], [cx + 0.1, O.z1 + 0.21, O.x1 - 18.15 + 0.2, 0, 0], [O.x1 + 0.21, cz, O.z1 - O.z0 + 0.4, 0, Math.PI / 2]]) { const g = new THREE.PlaneGeometry(w, hh); const m = add(g, cladN, x, hh / 2, z, { ry, cast: false }); void m; void d; }
    add(B(0.06, 1.3, 2.6), std({ color: 0x9ac8e8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.35 }), O.x1 + 0.1, 1.65, 7.5, { cast: false }); for (const z of [6.2, 7.5, 8.8]) add(B(0.24, 1.3, 0.06), dark, O.x1 + 0.1, 1.65, z, { cast: false }); for (const y of [1.0, 2.3]) add(B(0.26, 0.06, 2.7), dark, O.x1 + 0.1, y, 7.5, { cast: false });
    box(18.15, O.x1 + 0.2, O.z0 - 0.2, O.z0); box(18.15, O.x1 + 0.2, O.z1, O.z1 + 0.2); box(O.x1, O.x1 + 0.2, O.z0, O.z1);
    add(B(0.34, 2.3, 0.1), dark, 18, 1.15, OD[0], { cast: false }); add(B(0.34, 2.3, 0.1), dark, 18, 1.15, OD[1], { cast: false }); add(B(0.34, 0.1, OD[1] - OD[0] + 0.1), dark, 18, 2.25, (OD[0] + OD[1]) / 2, { cast: false });
    add(new THREE.PlaneGeometry(1.1, 0.34), label(256, 80, (c, w, h) => { c.fillStyle = '#1c2a36'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e2d4'; c.font = '800 52px Bahnschrift'; c.textAlign = 'center'; c.fillText('BÜRO', w / 2, 58); }, { glow: 0.4 }), 17.83, 2.55, (OD[0] + OD[1]) / 2, { ry: -Math.PI / 2, cast: false });
    const dx = SPOTS.pc.x; put('Schreibtisch_PC', dx, 0.02, O.z0 + 0.5); box(dx - 0.9, dx + 0.9, O.z0, O.z0 + 0.95); W.chair = put('Buerostuhl', dx - 0.1, 0.02, O.z0 + 1.35, 0.15);
    put('Aktenregal', 23.75, 0.02, O.z0 + 0.24); box(23.1, 24.4, O.z0, O.z0 + 0.5); put('Feldbett', 22.7, 0.02, O.z1 - 0.55, Math.PI / 2); box(21.65, 23.75, O.z1 - 1.05, O.z1); put('Sideboard_Kaffee', 19.7, 0.02, O.z1 - 0.3, Math.PI); box(19.1, 20.3, O.z1 - 0.6, O.z1); put('Zimmerpflanze', 24.15, 0.02, O.z1 - 1.5);
    add(new THREE.PlaneGeometry(2.6, 1.8).rotateX(-Math.PI / 2), decal(std({ color: 0x8a3a34, roughness: 1 }), 2), cx - 0.3, 0.03, cz + 0.2, { cast: false });
    const pcC = document.createElement('canvas'); pcC.width = 512; pcC.height = 300; W.pcCanvas = pcC; W.pcTex = new THREE.CanvasTexture(pcC); W.pcTex.colorSpace = THREE.SRGBColorSpace; add(new THREE.PlaneGeometry(0.76, 0.44), std({ map: W.pcTex, emissive: 0xffffff, emissiveMap: W.pcTex, emissiveIntensity: 0.9, roughness: 0.3 }), dx - 0.1, 1.22, O.z0 + 0.5 - 0.174, { cast: false });
    add(new THREE.PlaneGeometry(1.0, 0.7), label(256, 180, (c, w, h) => { c.fillStyle = '#f0ead8'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0332a'; c.font = '900 40px Bahnschrift'; c.textAlign = 'center'; c.fillText('⚡ STROM', w / 2, 60); c.fillStyle = '#1a1a1a'; c.font = '700 24px Bahnschrift'; c.fillText('kommt aus der', w / 2, 104); c.fillText('Steckdose.', w / 2, 136); c.font = '600 18px Bahnschrift'; c.fillText('(Sagen wir der Polizei.)', w / 2, 166); }), 19.6, 1.9, O.z0 + 0.01, { cast: false });
    const l = new THREE.PointLight(0xffe8c8, 22, 12, 1.6); l.position.set(cx, 2.6, cz); scene.add(l); W.lamps.push(l); add(B(0.9, 0.06, 0.3), std({ color: 0x202020, emissive: 0xfff2d8, emissiveIntensity: 3 }), cx, hh - 0.04, cz, { cast: false });
    W.pc = { x: dx, z: O.z0 + 1.5, look: { x: dx - 0.1, y: 1.2, z: O.z0 + 0.4 }, bed: { x: 22.7, z: O.z1 - 0.55 } }; }

  // ---------------- Mine unter der Halle ----------------
  { const rock = surface(T.rock, { color: 0x5a5048, roughness: 1, normal: 1.2 }); const Y = MINE.y; const w = MINE.x1 - MINE.x0; const d = MINE.z1 - MINE.z0; const cy = (Y + -0.3) / 2; const hh = -0.3 - Y;
    const fl = B(w, 0.3, d); tileUV(fl, [w / 4, d / 4]); add(fl, surface(T.mud, { color: 0x6a5a48, roughness: 1 }), (MINE.x0 + MINE.x1) / 2, Y - 0.15, 0, { cast: false });
    for (const [x0, x1, z0, z1] of [[MINE.x0 - 0.5, MINE.x1 + 0.5, MINE.z0 - 0.5, MINE.z0], [MINE.x0 - 0.5, MINE.x1 + 0.5, MINE.z1, MINE.z1 + 0.5], [MINE.x0 - 0.5, MINE.x0, MINE.z0, MINE.z1], [MINE.x1, MINE.x1 + 0.5, MINE.z0, MINE.z1]]) { const g = B(x1 - x0, hh, z1 - z0); tileUV(g, [Math.max(x1 - x0, z1 - z0) / 2.2, hh / 2.2]); add(g, rock, (x0 + x1) / 2, cy, (z0 + z1) / 2, { cast: false }); box(x0, x1, z0, z1, 'mine'); }
    const beam = std({ color: 0x5a3a20, roughness: 0.85 }); for (let z = -8; z <= 8; z += 4) { for (const x of [MINE.x0 + 0.3, MINE.x1 - 0.3]) add(B(0.25, hh, 0.25), beam, x, cy, z); add(B(w, 0.25, 0.25), beam, (MINE.x0 + MINE.x1) / 2, -0.55, z, { cast: false }); }
    const steps = 20; const sm = std({ color: 0x6a6a66, roughness: 0.8, metalness: 0.3 }); for (let i = 0; i < steps; i++) { const t = (i + 0.5) / steps; const z = STAIRS.z0 + (STAIRS.z1 - STAIRS.z0) * t; add(B(STAIRS.x1 - STAIRS.x0, 0.12, 0.42), sm, (STAIRS.x0 + STAIRS.x1) / 2, Y + -Y * t - 0.06, z); }
    box(STAIRS.x0 - 0.4, STAIRS.x0, STAIRS.z0, STAIRS.z1 + 1, 'mine'); box(STAIRS.x1, STAIRS.x1 + 0.4, STAIRS.z0, STAIRS.z1 + 1, 'mine');
    const coal = std({ color: 0x0c0c0e, roughness: 0.35, metalness: 0.4, envMapIntensity: 1.6 }); W.coal = [];
    COAL.forEach((c, i) => { const grp = new THREE.Group(); grp.position.set(c.x, Y + 1.25, c.z); grp.rotation.y = c.z < -9 || c.z > 9 ? Math.PI / 2 : 0; scene.add(grp); for (let k = 0; k < 7; k++) { const g = new THREE.DodecahedronGeometry(0.22 + ((i * 7 + k) % 4) * 0.06, 0); const p = g.attributes.position; for (let q = 0; q < p.count; q++) { const x = p.getX(q); const y = p.getY(q); const z = p.getZ(q); const f = 1 + 0.22 * Math.sin(x * 9.1 + y * 7.3 + z * 5.7 + k); p.setXYZ(q, x * f, y * f * 0.85, z * f * 0.6); } g.computeVertexNormals(); const a = k * 2.399; const r = 0.12 + (k % 3) * 0.22; const m = new THREE.Mesh(g, coal); m.position.set(0, Math.sin(a) * r * 1.3, Math.cos(a) * r * 1.6); m.rotation.set(k, k * 1.7, k * 0.6); m.castShadow = true; grp.add(m); } W.coal.push({ ...c, mesh: grp }); });
    for (const [x, z] of [[8, -5], [14, 7], [9, 4]]) { const l = new THREE.PointLight(0xffb070, 18, 14, 1.8); l.position.set(x, Y + 3.2, z); scene.add(l); W.lamps.push(l); add(new THREE.SphereGeometry(0.1, 10, 8), std({ color: 0x111111, emissive: 0xffc070, emissiveIntensity: 4 }), x, Y + 3.2, z, { cast: false }); }
    add(B(1.2, 0.6, 0.8), std({ color: 0x4a3a2a, roughness: 0.7 }), 8.5, Y + 0.45, -2, {}); box(7.9, 9.1, -2.4, -1.6, 'mine'); }

  // ---------------- Wald: Blender-Bäume in Stufen, in Feldern gebündelt (nah genau, fern grob) ----------------
  { const CH = 70; const cells = new Map(); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = V3(0, 1, 0);
    TREES.forEach((t, i) => { const y = terrainH(t.x, t.z) - 0.12; const k = Math.floor(t.x / CH) + ':' + Math.floor(t.z / CH) + ':' + t.t; let c = cells.get(k); if (!c) { c = { t: t.t, list: [], cx: 0, cz: 0 }; cells.set(k, c); } c.list.push(i); c.cx += t.x; c.cz += t.z; W.trees.push({ x: t.x, z: t.z, y, r: TREE_R[t.t] * t.s, on: true, t: t.t, s: t.s, rot: t.r, stage: 3 }); });
    W.treeCells = []; const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const c of cells.values()) { c.cx /= c.list.length; c.cz /= c.list.length; const hi = new THREE.InstancedMesh(modelGeo(TREE_HI[c.t]), flatMat(), c.list.length); const lo = new THREE.InstancedMesh(modelGeo(TREE_LO[c.t]), flatMat(), c.list.length);
      c.list.forEach((i, k) => { const t = W.trees[i]; q.setFromAxisAngle(up, t.rot); m4.compose(V3(t.x, t.y, t.z), q, V3(t.s, t.s * (0.92 + (i % 5) * 0.04), t.s)); hi.setMatrixAt(k, m4); lo.setMatrixAt(k, m4); t.hi = hi; t.lo = lo; t.k = k; t.m4 = m4.clone(); });
      hi.castShadow = true; hi.receiveShadow = true; lo.castShadow = false; lo.receiveShadow = true; hi.computeBoundingSphere(); lo.computeBoundingSphere(); lo.visible = false; scene.add(hi, lo); W.treeCells.push({ hi, lo, cx: c.cx, cz: c.cz }); }
    // Stumpf, Setzling, junger Baum: kleiner Vorrat an Instanzen
    const pools = {}; const POOL = 120; for (const st of [0, 1, 2]) for (const fam of [0, 1]) { const name = ALT[st][fam]; if (pools[name]) continue; const im = new THREE.InstancedMesh(modelGeo(name), flatMat(), POOL); for (let i = 0; i < POOL; i++) im.setMatrixAt(i, zero); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); pools[name] = { im, free: Array.from({ length: POOL }, (_, i) => POOL - 1 - i) }; }
    W.setTree = (i, stage) => { const t = W.trees[i]; if (!t || t.stage === stage) return; if (t.alt) { const p = pools[t.alt.name]; p.im.setMatrixAt(t.alt.slot, zero); p.im.instanceMatrix.needsUpdate = true; p.free.push(t.alt.slot); t.alt = null; }
      const full = stage === 3; t.hi.setMatrixAt(t.k, full ? t.m4 : zero); t.lo.setMatrixAt(t.k, full ? t.m4 : zero); t.hi.instanceMatrix.needsUpdate = true; t.lo.instanceMatrix.needsUpdate = true; t.stage = stage; t.on = stage !== 1; t.r = (full ? TREE_R[t.t] : stage === 2 ? 0.14 : 0.34) * t.s;
      if (!full) { const name = ALT[stage][t.t < 2 ? 0 : 1]; const p = pools[name]; const slot = p.free.pop(); if (slot !== undefined) { q.setFromAxisAngle(up, t.rot); const s = stage === 0 ? t.s * (t.t === 3 ? 0.6 : 1) : t.s; m4.compose(V3(t.x, t.y + (stage === 0 ? 0.1 : 0.05), t.z), q, V3(s, s, s)); p.im.setMatrixAt(slot, m4); p.im.instanceMatrix.needsUpdate = true; t.alt = { name, slot }; } } };
    // Der Baum kippt um (nur Bild), danach bleibt der Stumpf
    W.fellTree = (i, ang) => { const t = W.trees[i]; if (!t) return; const piv = new THREE.Group(); piv.position.set(t.x, t.y + 0.4, t.z); const mesh = new THREE.Mesh(modelGeo(TREE_HI[t.t]), flatMat()); mesh.rotation.y = t.rot; mesh.scale.set(t.s, t.s, t.s); mesh.position.y = -0.4; mesh.castShadow = true; piv.add(mesh); scene.add(piv); const axis = V3(Math.cos(ang), 0, -Math.sin(ang)); W.anim.push({ t: 0, step(dt) { this.t += dt; const k = Math.min(1, this.t / 1.7); piv.quaternion.setFromAxisAngle(axis, 1.5 * k * k * k); if (this.t > 2.3) { const s = Math.max(0, 1 - (this.t - 2.3) / 0.5); piv.scale.setScalar(s); } if (this.t > 2.8) { scene.remove(piv); return true; } return false; } }); };
    W.updateTrees = (cam) => { for (const c of W.treeCells) { const near = Math.hypot(c.cx - cam.x, c.cz - cam.z) < 150; if (c.hi.visible !== near) { c.hi.visible = near; c.lo.visible = !near; } } };
    // Felsen, Büsche, Schilf
    const S = W.scatter; for (let i = 0; i < 260; i++) { const x = BOUNDS.x0 + 10 + R() * (BOUNDS.x1 - BOUNDS.x0 - 20); const z = BOUNDS.z0 + 10 + R() * (BOUNDS.z1 - BOUNDS.z0 - 20); const fd = flatDist(x, z); if (fd < 6) continue; const h = terrainH(x, z); if (R() < 0.45) S.rocks[(R() * 3) | 0].push({ x, y: h - 0.15, z, ry: R() * 6.28, s: 0.6 + R() * 1.4 }); else S.bushes.push({ x, y: h, z, ry: R() * 6.28, s: 0.7 + R() * 1.0 }); }
    for (const [x, z] of [[-22.5, -6], [-23, 4], [-20, -13.5], [-8, -13.8], [4, -14], [15, -13.6], [21.5, -9], [26, 1], [-22.6, 10]]) S.bushes.push({ x, y: terrainH(x, z), z, ry: R() * 6.28, s: 0.9 + R() * 0.6 });
    ['Fels_A', 'Fels_B', 'Fels_C'].forEach((n, k) => { flatInst(n, S.rocks[k]); for (const r of S.rocks[k]) if (r.y > -0.9 && r.s > 0.8 && Math.abs(r.x - riverX(r.z)) > 6) circle(r.x, r.z, 0.7 * r.s); }); flatInst('Busch', S.bushes.map((b) => ({ ...b, y: b.y !== undefined ? b.y : terrainH(b.x, b.z) }))); flatInst('Schilf', S.reeds, false);
  }

  // ---------------- Bunker im Hügel: draußen Portal und Panzertür, drinnen Händler und Auftraggeber ----------------
  { const out = put('Bunker_Aussen', BX, 0, BZ); put('Bunker_Innen', BX, 0.02, BZ); const door = out.parts.BU_Tuer_Dreh; W.doors.bunker.apply = (k) => { if (door) door.rotation.y = k * 1.85; };
    const L = (x0, x1, z0, z1, o) => box(BX + x0, BX + x1, BZ + z0, BZ + z1, 'boden', { veh: true, ...(o || {}) });
    L(-21, -14, -10.6, 10.6); L(-14, -3, -10.6, -5); L(-14, -3, 5, 10.6); L(-3, 0.8, -10.6, -1.1); L(-3, 0.8, 1.1, 10.6); L(0.7, 2.7, -3.5, -1.8); L(0.7, 2.7, 1.8, 3.5); L(2.6, 4.7, -4.5, -3.0); L(2.6, 4.7, 3.0, 4.5); L(0.25, 0.6, -1.1, 1.1, { door: 'bunker' });
    L(-14, -10.7, -5, 5, { veh: false }); L(-10.7, -3, -5, -3.35, { veh: false }); L(-12.1, -5.4, 4.2, 5, { veh: false }); L(-5.0, -3.6, 3.6, 4.8, { veh: false }); L(-5.2, -4.0, 2.6, 3.6, { veh: false });
    for (const [x, z, i] of [[-11.2, 0, 16], [-7.0, -2.6, 14], [-6.5, 2.6, 14], [-1.3, 0, 6]]) { const l = new THREE.PointLight(0xffd8a0, i, 13, 1.7); l.position.set(BX + x, 2.5, BZ + z); scene.add(l); W.lamps.push(l); }
    const sign = label(512, 128, (c, w, h) => { c.fillStyle = '#16120e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff5a2a'; c.font = '800 54px Bahnschrift'; c.textAlign = 'center'; c.fillText('ALLES FÜR STROM', w / 2, 62); c.fillStyle = '#e8dcc8'; c.font = '600 30px Bahnschrift'; c.fillText('keine Fragen · nur bar', w / 2, 106); }, { glow: 0.7 });
    add(B(0.06, 0.66, 2.7), std({ color: 0x16120e, roughness: 0.6 }), BX - 10.74, 2.62, BZ, { cast: false }); add(new THREE.PlaneGeometry(2.6, 0.62), sign, BX - 10.7, 2.62, BZ, { ry: Math.PI / 2, cast: false });
    const sign2 = label(512, 128, (c, w, h) => { c.fillStyle = '#1c2a22'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd21a'; c.font = '800 60px Bahnschrift'; c.textAlign = 'center'; c.fillText('AUFTRÄGE', w / 2, 66); c.fillStyle = '#e8dcc8'; c.font = '600 28px Bahnschrift'; c.fillText('Strom liefern · XP kassieren', w / 2, 108); }, { glow: 0.7 }); add(new THREE.PlaneGeometry(2.4, 0.58), sign2, BX - 7.5, 2.78, BZ - 4.96, { cast: false });
    W.dealer = { x: BX - 12.4, z: BZ, yaw: Math.PI / 2, counter: { x: BX - 10.3, z: BZ } }; W.boss = { x: BX - 7.5, z: BZ - 4.5, yaw: 0, desk: { x: BX - 7.5, z: BZ - 2.9 } }; }

  // ---------------- Stadt mit Dönerladen ----------------
  buildCity(kit);

  // ---------------- Energiedepot hinter der Stadt ----------------
  { const D = DEPOT; const cx = (D.x0 + D.x1) / 2; const cz = (D.z0 + D.z1) / 2; const wm = std({ color: 0xe8e6e0, roughness: 0.6, metalness: 0.2 }); add(B(D.x1 - D.x0, 9, D.z1 - D.z0), wm, cx, 4.5, cz); box(D.x0, D.x1, D.z0, D.z1, 'boden', { veh: true });
    add(B(D.x1 - D.x0 + 0.2, 0.6, D.z1 - D.z0 + 0.2), std({ color: 0xf2c21a, roughness: 0.5 }), cx, 8.7, cz); add(B(D.x1 - D.x0 + 0.1, 1.0, D.z1 - D.z0 + 0.1), std({ color: 0x123a6a, roughness: 0.6 }), cx, 0.5, cz, { cast: false });
    const sign = label(1024, 192, (c, w, h) => { c.fillStyle = '#123a6a'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2c21a'; c.font = '900 110px Bahnschrift'; c.textAlign = 'center'; c.fillText('⚡ ENERGIEDEPOT', w / 2, 132); }, { glow: 0.35 });
    add(new THREE.PlaneGeometry(16, 3), sign, cx, 6.6, D.z1 + 0.02, { cast: false });
    add(B(4, 2.4, 0.3), std({ color: 0x2a3a4a, roughness: 0.3, metalness: 0.4 }), cx, 1.6, D.z1 + 0.1); add(new THREE.PlaneGeometry(3.4, 1.2), std({ color: 0x9ac8e8, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.5 }), cx, 1.8, D.z1 + 0.27, { cast: false });
    add(B(4.2, 0.12, 0.6), std({ color: 0x6a6a6a, roughness: 0.5 }), cx, 1.05, D.z1 + 0.45);
    W.depotBoard = ctex(512, 256, () => {}); add(new THREE.PlaneGeometry(4, 2), std({ map: W.depotBoard, emissive: 0xffffff, emissiveMap: W.depotBoard, emissiveIntensity: 0.8 }), cx + 7, 3, D.z1 + 0.03, { cast: false });
    W.depotWorker = { x: cx, z: D.z1 - 0.7, yaw: 0 }; W.depotCounter = { x: cx, z: D.z1 + 1.2 };
    for (let i = 0; i < 3; i++) { const tx = D.x0 - 7; const tz = -4 + i * 5; add(new THREE.CylinderGeometry(1.6, 1.6, 5, 18), std({ color: 0x8a9a8a, roughness: 0.5, metalness: 0.5 }), tx, 2.5, tz); add(new THREE.SphereGeometry(1.6, 18, 8, 0, 7, 0, 1.57), std({ color: 0x8a9a8a, roughness: 0.5, metalness: 0.5 }), tx, 5, tz); circle(tx, tz, 1.7); }
    // Umspannfeld: Trafos mit Isolatoren hinter einem Zaun
    const tr = std({ color: 0x5a6a62, roughness: 0.6, metalness: 0.4 }); const iso = std({ color: 0xb8a890, roughness: 0.4 }); for (let i = 0; i < 3; i++) { const tx = D.x1 + 7; const tz = -5 + i * 5.5; add(B(2.4, 2.2, 1.8), tr, tx, 1.1, tz); for (const s of [-0.7, 0, 0.7]) { add(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 8), iso, tx + s, 2.65, tz); } for (let k = 0; k < 5; k++) add(B(0.06, 1.6, 1.9), tr, tx + 1.3 + k * 0.09, 1.1, tz, { cast: false }); box(tx - 1.3, tx + 1.8, tz - 1, tz + 1, 'boden', { veh: true }); }
    const fence = []; for (let z = -9; z < 9; z += 3) fence.push({ x: D.x1 + 3.4, z: z + 1.5, ry: Math.PI / 2 }); for (let x = D.x1 + 3.4; x < D.x1 + 12; x += 3) fence.push({ x: x + 1.5, z: 9, ry: 0 }); inst('Zaunfeld', fence); box(D.x1 + 3.3, D.x1 + 3.5, -9, 9, 'boden', { veh: true }); box(D.x1 + 3.4, D.x1 + 12.5, 8.9, 9.1, 'boden', { veh: true });
  }
  // Strommasten von der Brücke bis zum Depot
  { const pm = std({ color: 0x8a8e90, roughness: 0.6, metalness: 0.6 }); const tops = []; for (let x = 62; x <= 272; x += 42) { const z = 42; const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = add(B(0.18, 18.5, 0.18), pm, a * 1.0, 9, b * 1.0, { parent: g }); leg.rotation.set(b * 0.05, 0, -a * 0.05); } for (const y of [12, 16]) add(B(7, 0.25, 0.25), pm, 0, y, 0, { parent: g }); for (let y = 2; y < 17; y += 3) { add(B(1.8, 0.1, 0.1), pm, 0, y, -0.95, { parent: g, rz: 0.6 }); add(B(1.8, 0.1, 0.1), pm, 0, y, 0.95, { parent: g, rz: -0.6 }); } tops.push(x); circle(x, z, 1.4); }
    const wire = std({ color: 0x1a1a1a, roughness: 0.6 }); for (let i = 0; i < tops.length - 1; i++) for (const [y, dz] of [[12, -3.3], [12, 3.3], [16, -3.3], [16, 3.3]]) { const pts = []; for (let k = 0; k <= 12; k++) { const t = k / 12; pts.push(V3(tops[i] + 42 * t, y - 0.12 - Math.sin(Math.PI * t) * 1.6, 42 + dz)); } add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.03, 4), wire, 0, 0, 0, { cast: false }); } }

  // ---------------- Wo man nicht hinkommt: der Fluss (außer Brücke und Steg) und der Kartenrand ----------------
  W.blocked = (x, z) => (riverBlocked(x, z) && !(x > W.pier.x0 && x < W.pier.x1 && z > W.pier.z0 && z < W.pier.z1)) || x < BOUNDS.x0 + 6 || x > BOUNDS.x1 - 6 || z < BOUNDS.z0 + 6 || z > BOUNDS.z1 - 6;
  W.blockedVeh = (x, z) => riverBlocked(x, z) || x < BOUNDS.x0 + 8 || x > BOUNDS.x1 - 8 || z < BOUNDS.z0 + 8 || z > BOUNDS.z1 - 8 || terrainH(x, z) > 14;

  // ---------------- Erzeuger, Speicher, Kabel ----------------
  const FIX = { wasserrad: { y: -1.15, hide: ['Strom_Wasser', 'Strom_Stein', 'Strom_Gras'] }, staudamm: { y: -1.8 } };
  W.placeGen = (g) => {
    if (W.gens.has(g.uid)) return W.gens.get(g.uid); const d = GEN[g.id]; const m = buildModel(d.model); const p = genPos(g.id, g.k); const f = FIX[g.id] || {};
    const y = f.y !== undefined ? f.y : d.y !== undefined ? d.y : d.roof ? HALL.h : d.mine ? MINE.y : d.out ? terrainH(p.x, p.z) : 0; m.group.position.set(p.x, y, p.z); m.group.rotation.y = d.rot || 0; if (g.id === 'solar') m.group.rotation.y = Math.PI;
    if (f.hide) m.group.traverse((o) => { if (o.isMesh && f.hide.includes(o.material.name)) o.visible = false; });
    scene.add(m.group); m.uid = g.uid; m.id = g.id; m.spin = 0; m.pos = V3(p.x, y, p.z); W.gens.set(g.uid, m); if (W.slots[g.id]) W.slots[g.id].visible = false;
    // Kollision (grob, als Rechteck um das Modell); die Kurbel steht auf ihrer Werkbank
    m.group.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(m.group); const lvl = d.roof ? 'dach' : d.mine ? 'mine' : 'boden'; const pad = g.id === 'laufrad' ? 0 : 0.05;
    if (g.id === 'laufrad') { box(bb.min.x, bb.max.x, bb.min.z, bb.min.z + 0.5, lvl, { gen: g.uid }); box(bb.min.x - 0.1, bb.min.x + 0.25, bb.min.z, bb.max.z, lvl, { gen: g.uid }); box(bb.max.x - 0.25, bb.max.x + 0.1, bb.min.z, bb.max.z, lvl, { gen: g.uid }); }
    else if (g.id === 'staudamm') { box(riverX(p.z) - 4.8, riverX(p.z) + 4.8, p.z - 1.2, p.z + 0.6, 'boden', { gen: g.uid, veh: true }); }
    else if (g.id !== 'wasserrad' && g.id !== 'kurbel') box(bb.min.x - pad, bb.max.x + pad, bb.min.z - pad, bb.max.z + pad, lvl, { gen: g.uid, veh: d.out || lvl === 'boden' });
    m.sock = V3(p.x, y + (d.roof ? 0.4 : 0.5), p.z); return m;
  };
  W.removeGen = (uid) => { const m = W.gens.get(uid); if (!m) return; scene.remove(m.group); W.gens.delete(uid); W.boxes = W.boxes.filter((b) => b.gen !== uid); if (W.slots[m.id]) W.slots[m.id].visible = true; };
  W.storeModel = (t) => { const m = buildModel(t === 'auto' || t === 'lkw' ? 'Speicher_Autobatterie' : t === 'schrank' || t === 'haus' ? 'Speicher_Akkuschrank' : 'Speicher_Container'); if (t === 'lkw') m.group.scale.setScalar(1.55); if (t === 'haus') m.group.scale.set(1.5, 1.05, 1.5); return m; };
  // Kabel als Schläuche: vom Erzeuger über den Boden (oder Dach/Mine) zum Ladeplatz
  W.cableGroup = new THREE.Group(); scene.add(W.cableGroup); const cableM = std({ color: 0x141414, roughness: 0.55 }); const usbM = std({ color: 0x2a2a2e, roughness: 0.5 });
  W.setLinks = (S) => {
    for (const c of [...W.cableGroup.children]) { c.geometry.dispose(); W.cableGroup.remove(c); }
    for (const l of S.links) { const m = W.gens.get(l.gen); const ch = W.chargers[l.ch]; if (!m || !ch) continue; const a = m.sock.clone(); const b = ch.sock.clone(); const d = GEN[m.id]; const pts = [a];
      if (l.usb) { const ty = 0.93; pts[0] = V3(a.x - 0.3, ty, a.z - 0.17); pts.push(V3(a.x - 0.7, ty, a.z - 0.15), V3(a.x - 0.84, 0.6, a.z - 0.1), V3(a.x - 1.0, 0.04, a.z + 0.1), V3((a.x + b.x) / 2 - 0.3, 0.03, (a.z + b.z) / 2 + 0.3), V3(b.x + 0.5, 0.03, b.z + 0.1), V3(b.x + 0.12, 0.5, b.z), b); }
      else if (d.roof) { const L = SPOTS.ladder; pts.push(V3(a.x, HALL.h + 0.05, a.z), V3(17.6, HALL.h + 0.05, L.z + 0.6), V3(18.25, HALL.h + 0.3, L.z + 0.6), V3(18.25, 0.05, L.z + 0.6), V3(18.6, 0.03, 3.6), V3(25.2, 0.03, 3.8), V3(25.2, 0.03, 11.4), V3(5, 0.03, 11.6), V3(5, 0.03, 10.6), V3(-16.6, 0.03, 10), V3(-16.6, 0.03, b.z), b); }
      else if (d.mine) { pts.push(V3(a.x, MINE.y + 0.05, a.z), V3(15.8, MINE.y + 0.05, STAIRS.z0 - 0.3), V3(15.8, 0.05, STAIRS.z1 + 0.3), V3(14, 0.03, 9.6), V3(-16.6, 0.03, 9.6), V3(-16.6, 0.03, b.z), b); }
      else if (d.out) { pts.push(V3(a.x, terrainH(a.x, a.z) + 0.05, a.z), V3(Math.max(26, Math.min(a.x, 27)), 0.05, Math.min(a.z + 6, 12)), V3(25.4, 0.05, 12), V3(6.8, 0.04, 11.7), V3(6.8, 0.04, 10.6), V3(-16.6, 0.03, 10), V3(-16.6, 0.03, b.z), b); }
      else { pts.push(V3(a.x, 0.04, a.z + 0.9), V3(a.x, 0.03, Math.min(a.z + 1.6, 10)), V3(-16.4, 0.03, Math.min(a.z + 1.6, 10)), V3(-16.4, 0.03, b.z), b); }
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(400, pts.length * 14), l.usb ? 0.012 : 0.028, 6), l.usb ? usbM : cableM); tube.castShadow = false; tube.receiveShadow = true; W.cableGroup.add(tube); }
  };

  // ---------------- Rauch ----------------
  { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(200,200,200,.9)'); g.addColorStop(1, 'rgba(200,200,200,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); W.smokeMat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, color: 0x8a8a8a });
    for (let i = 0; i < 90; i++) { const s = new THREE.Sprite(W.smokeMat.clone()); s.visible = false; scene.add(s); W.smoke.push({ s, life: 0 }); } }
  W.puff = (p, col = 0x8a8a8a, size = 1) => { const q = W.smoke.find((x) => x.life <= 0); if (!q) return; q.life = 1; q.p = p.clone(); q.v = V3((Math.random() - 0.5) * 0.4, 1.2 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4); q.size = size; q.s.material.color.setHex(col); q.s.visible = true; };

  // ---------------- Regen ----------------
  W.regen = createRegen(scene, (x, z) => (riverBlocked(x, z) ? WATER_Y + 0.03 : groundY(x, z, 'boden') + 0.05));

  // ---------------- Tag und Nacht ----------------
  W.setTime = (dayN, min, storm = false, regen = 0) => {
    const nass = storm ? 0 : Math.min(1, regen / 0.6); W.regen.set(regen); // beim Gewitter ist es schon dunkel genug
    const m = ((min % 1440) + 1440) % 1440; const e = m > 360 && m < 1200 ? Math.sin(Math.PI * (m - 360) / 840) : -0.3; const az = (90 + 180 * clamp((m - 360) / 840, 0, 1)) * Math.PI / 180;
    const key = e > 0.3 ? 'day' : e > 0 ? 'gold' : 'night'; const mood = key === 'day' ? day : key === 'gold' ? gold : night; const sky = key !== 'night' && (storm || regen > 0.3) ? skies.regen : skies[key];
    if (W.sky !== sky) { W.sky = sky; scene.background = sky.cube; scene.environment = sky.env; }
    if (e > 0) { W.sunDir.set(Math.sin(az) * Math.cos(Math.asin(e)), Math.max(0.12, e), -Math.cos(az) * Math.cos(Math.asin(e))).normalize(); sun.color.setHex(mood.sun); sun.intensity = mood.sunI * (0.25 + 0.75 * Math.min(1, e * 1.6)) * (storm ? 0.35 : 1 - nass * 0.72); }
    else { W.sunDir.set(0.4, 0.75, -0.5).normalize(); sun.color.setHex(0x9fb8e8); sun.intensity = 0.45; }
    scene.environmentIntensity = (key === 'night' ? 0.22 : key === 'gold' ? 0.6 : 0.85) * (storm ? 0.6 : 1 - nass * 0.1); hemi.intensity = key === 'night' ? 0.06 : storm ? 0.2 : 0.35 + nass * 0.25;
    W.mood = storm ? { ...mood, exposure: (mood.exposure || 1) * 0.8, fogD: (mood.fogD || 0.002) * 2.2, sat: 0.8 } : nass > 0 ? { ...mood, exposure: (mood.exposure || 1) * (1 - nass * 0.08), fogD: (mood.fogD || 0.002) * (1 + nass * 2), sat: (mood.sat || 1) * (1 - nass * 0.25) } : mood; W.night = key === 'night'; W.dusk = key !== 'day';
  };
  W.flash = 0;
  W.update = (t, dt, cam) => {
    sun.position.copy(cam).add(W.sunDir.clone().multiplyScalar(120)); sun.target.position.copy(cam); sun.target.updateMatrixWorld();
    for (const k of Object.keys(W.doors)) { const d = W.doors[k]; d.v = (d.v === undefined ? d.k : d.v); d.v += (d.k - d.v) * Math.min(1, dt * 3); if (d.apply) d.apply(d.v); }
    for (const q of W.smoke) { if (q.life <= 0) continue; q.life -= dt * 0.22; q.p.addScaledVector(q.v, dt); q.v.x += 0.15 * dt; q.s.position.copy(q.p); const s = (1.6 - q.life) * 1.6 * q.size; q.s.scale.set(s, s, s); q.s.material.opacity = Math.max(0, q.life) * 0.6; if (q.life <= 0) q.s.visible = false; }
    if (W.flash > 0) { W.flash = Math.max(0, W.flash - dt * 3); hemi.intensity += W.flash * 3; }
    if (W.waterN) { W.waterN.offset.y = -t * 0.06; W.waterN.offset.x = Math.sin(t * 0.1) * 0.02; }
    W.regen.update(dt, cam);
    for (let i = W.anim.length - 1; i >= 0; i--) if (W.anim[i].step(dt)) W.anim.splice(i, 1);
    W.updateTrees(cam); if (W.cityTick) W.cityTick(t, dt);
  };
  W.setTime(1, 8 * 60);
  return W;
}
