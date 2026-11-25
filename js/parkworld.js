// Theos Seitenscheidel - Parkmodus: die Welt eines Levels. Gleiche Bildkette wie im Rennmodus (Himmel, Sonne, Schatten, racepost), Hindernisse instanziert, Lücke leuchtet.
import * as THREE from './vendor/three.module.min.js';
import { buildTextures } from './racetex.js';
import { bakeSky, moodOf, sunVector } from './racesky.js';
import { surface, patchShadow } from './racemat.js';
import { propGeo, propMaterial } from './parkart.js';
import { OBJ } from './parklevels.js';
import { moverRect } from './parklogic.js';
import { spriteBlend } from './raceinterior.js';

const LOOK = {
  market: { mood: 'easy', ground: 'asphalt', col: 0xb0b0ae, out: 'turf', outCol: 0x8fae6a },
  city: { mood: 'stadt', ground: 'asphalt', col: 0xa8a4a0, out: 'asphalt', outCol: 0x8c8884 },
  garage: { mood: 'nacht', ground: 'asphalt', col: 0x8c8c88, out: 'asphalt', outCol: 0x55554f, indoor: true },
  harbor: { mood: 'kueste', ground: 'asphalt', col: 0xa0a2a4, out: null, sea: true },
  site: { mood: 'classic', ground: 'gravel', col: 0xc8b89a, out: 'mud', outCol: 0xa89878 },
  scrap: { mood: 'classic', ground: 'mud', col: 0xa89880, out: 'mud', outCol: 0x8c7a62 },
  base: { mood: 'hard', ground: 'asphalt', col: 0xa8a48e, out: 'turf', outCol: 0x9aa066 },
  airport: { mood: 'ring', ground: 'asphalt', col: 0xb8b8b4, out: 'turf', outCol: 0x98b070 },
};
const PAL = {
  car: [0xb8342c, 0x2c5a9a, 0xd8d8d8, 0x2a2c30, 0xe0a020, 0x3e8a5a, 0x8a8e94, 0xf2efe6], suvp: [0x2a2c30, 0xd8d8d8, 0x2c5a9a, 0x6a2a2a], vanp: [0xf2efe6, 0xd8d8d8, 0x3a6a9a], bus: [0xe8c030, 0xc8281c], truckp: [0xc8281c, 0x2c5a9a, 0xe0a020], tanker: [0xf2efe6, 0xdcdcd8], trailer: [0xdcdcd8, 0x3a6a9a],
  container: [0xa83c24, 0x2a5a8a, 0x3a7a4a, 0xd87a20, 0x9a9ea2, 0x7a3a5a], house: [0xe2c89a, 0xc98f6c, 0x9fb0a4, 0xd9b45c, 0xb5534a, 0xe4dfd2], cessnap: [0xf2efe6, 0xd83a2a, 0x2a6ac8], jet: [0xf2efe6, 0xe8e8ec],
};
const skyCache = new Map();
function skyFor(renderer, key, mood) { let s = skyCache.get(key); if (!s) { s = bakeSky(renderer, mood, 11); skyCache.set(key, s); } return s; }
const rng = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const M4 = new THREE.Matrix4(); const Q = new THREE.Quaternion(); const P = new THREE.Vector3(); const S = new THREE.Vector3(); const Y = new THREE.Vector3(0, 1, 0); const C = new THREE.Color();

function instances(scene, kind, list, mat, r) {
  const im = new THREE.InstancedMesh(propGeo(kind), mat, list.length); im.castShadow = true; im.receiveShadow = true; const pal = PAL[kind];
  list.forEach((o, i) => { P.set(o.x, o.y || 0, o.z); Q.setFromAxisAngle(Y, o.h); S.set(o.s || 1, o.s || 1, o.s || 1); M4.compose(P, Q, S); im.setMatrixAt(i, M4); C.set(pal ? pal[(o.c ?? Math.floor(r() * pal.length)) % pal.length] : 0xffffff); im.setColorAt(i, C); });
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); scene.add(im); return im;
}
function plane(scene, w, d, x, z, y, mat, uvScale = 0.11) { const g = new THREE.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w * uvScale, uv.getY(i) * d * uvScale); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; }

export function buildParkWorld(L, { renderer, shadows = true, shadowSize = 3072, level = 'high' }) {
  const T = buildTextures(renderer); const look = LOOK[L.world]; const moodKey = L.final ? 'impossible' : look.mood; const mood0 = moodOf(moodKey); const mood = { ...mood0, vol: mood0.vol * 0.03, fogD: L.final ? mood0.fogD * 0.35 : mood0.fogD }; /* Lichtstrahlen sind für den Wald gemacht, auf freien Plätzen überstrahlen sie alles */ const sky = skyFor(renderer, moodKey, mood); const sunDir = look.indoor ? new THREE.Vector3(0.18, 1, 0.12).normalize() : sunVector(mood); const scene = new THREE.Scene(); scene.background = look.indoor ? new THREE.Color(0x07080a) : sky.cube; scene.environment = sky.env; scene.environmentIntensity = look.indoor ? 0.5 : mood.envI;
  const sun = new THREE.DirectionalLight(look.indoor ? 0xfff0dc : mood.sun, look.indoor ? 1.6 : mood.sunI); sun.castShadow = shadows; sun.shadow.mapSize.set(shadowSize, shadowSize); let big = 0; for (const s of L.stages) big = Math.max(big, s.len > 300 ? 1 : 0); const SR = big ? 150 : 62; const sc = sun.shadow.camera; sc.left = -SR; sc.right = SR; sc.top = SR; sc.bottom = -SR; sc.near = 10; sc.far = 620; sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.3; sun.shadow.radius = 2.2; scene.add(sun); scene.add(sun.target);
  if (look.indoor) scene.add(new THREE.HemisphereLight(0xfff2dc, 0x4a4a48, 2.1));
  const B = L.bounds; const cx = (B.x0 + B.x1) / 2; const cz = (B.z0 + B.z1) / 2; const bw = B.x1 - B.x0; const bd = B.z1 - B.z0; const r = rng(L.n * 131 + 7);
  const groundMat = surface(T[look.ground], { color: look.col, roughness: 0.92, normal: 0.6 }); plane(scene, bw + 8, bd + 8, cx, cz, 0, groundMat, look.ground === 'asphalt' ? 0.42 : 0.2);
  if (look.sea) { const sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x1a4a5a, roughness: 0.14, metalness: 0.3, envMapIntensity: 1.3 })); sea.position.set(cx, -2, cz); scene.add(sea); const k = surface(T.asphalt, { color: 0x8a8a84 }); const q = new THREE.Mesh(new THREE.BoxGeometry(bw + 8, 2.2, bd + 8), k); q.position.set(cx, -1.12, cz); scene.add(q); }
  else { const outMat = surface(T[look.out], { color: look.outCol, roughness: 1 }); plane(scene, 3000, 3000, cx, cz, -0.06, outMat, 0.08); }
  // Hindernisse nach Art zusammenfassen
  const mat = propMaterial(); const by = new Map(); const push = (kind, o) => { let a = by.get(kind); if (!a) { a = []; by.set(kind, a); } a.push(o); };
  for (const o of L.props) push(o.kind, o);
  // Rand: sichtbarer Zaun passend zur Gegend. Lücken dort, wo Querverkehr herkommt
  const WK = { market: 'hedge', city: 'house', garage: 'wall', harbor: 'container', site: 'wall', scrap: 'pile', base: 'wire', airport: 'wire' }; const bk = WK[L.world]; const bo = OBJ[bk]; const inLane = (x, z) => { for (const l of L.lanes) { const u = (x - l.x) * Math.cos(l.h) - (z - l.z) * Math.sin(l.h); if (Math.abs(u) < l.hw + 3 + bo.l / 2) return true; } return false; };
  const edge = (x0, z0, x1, z1) => { const len = Math.hypot(x1 - x0, z1 - z0); const n = Math.ceil(len / (bo.l + (bk === 'house' ? 0.2 : 0))); const h = Math.atan2(x1 - x0, z1 - z0); for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; const x = x0 + (x1 - x0) * t; const z = z0 + (z1 - z0) * t; if (!inLane(x, z)) push(bk, { x, z, h, c: i }); } };
  const off = bo.w / 2 + 0.2; edge(B.x0, B.z0 - off, B.x1, B.z0 - off); edge(B.x0, B.z1 + off, B.x1, B.z1 + off); edge(B.x0 - off, B.z0, B.x0 - off, B.z1); edge(B.x1 + off, B.z0, B.x1 + off, B.z1);
  // Kulisse außerhalb des Spielfelds
  const scat = (kind, n, dist, spread, o = {}) => { for (let i = 0; i < n; i++) { const a = r() * 6.283; const R = 1 + r() * spread; const ex = (bw / 2 + dist) * R; const ez = (bd / 2 + dist) * R; const c = Math.abs(Math.cos(a)); const s = Math.abs(Math.sin(a)); const k = Math.min(ex / Math.max(c, 1e-3), ez / Math.max(s, 1e-3)); push(kind, { x: cx + Math.cos(a) * k, z: cz + Math.sin(a) * k, h: o.fix ? a : Math.round(r() * 4) * Math.PI / 2, ...o }); } };
  const ring = { market() { scat('lamp', 12, 6, 0); push('market', { x: cx, z: B.z1 + 34, h: 0 }); scat('house', 12, 60, 0.6); }, city() { scat('house', 46, 16, 1.6); scat('lamp', 10, 7, 0); }, garage() {}, harbor() { scat('gantry', 4, 34, 0.3); scat('container', 40, 14, 0.8); push('ship', { x: B.x0 - 90, z: cz, h: 0 }); }, site() { scat('tcrane', 3, 26, 0.5); scat('pile', 16, 10, 0.8); scat('digger', 4, 12, 0.5); }, scrap() { scat('pile', 44, 8, 1.2); scat('tires', 20, 6, 0.8); scat('tcrane', 1, 22, 0.2); }, base() { scat('watch', 5, 10, 0.2); scat('hangar', 4, 32, 0.4); scat('tankp', 8, 8, 0.8); scat('radar', 1, 26, 0.2); }, airport() { scat('ctower', 1, 80, 0.2); scat('terminal', 4, 60, 0.5); scat('jet', 3, 120, 0.6); scat('lamp', 12, 10, 0); } }; ring[L.world]();
  const ims = []; for (const [kind, list] of by) ims.push(instances(scene, kind, list, mat, r));
  // Bodenmarkierung: weiße Linien neben Autos, gelb gestrichelte Querstraße
  const paint = new THREE.MeshStandardMaterial({ color: 0xe8e8e0, roughness: 0.7 }); paint.onBeforeCompile = (s) => patchShadow(s); paint.customProgramCacheKey = () => 'parkLine'; const lines = []; if (L.world === 'market' || L.world === 'garage' || L.world === 'city') for (const o of L.props) if (o.kind === 'car' || o.kind === 'suvp' || o.kind === 'vanp') { const k = OBJ[o.kind]; const sn = Math.sin(o.h); const cs = Math.cos(o.h); for (const s of [1, -1]) lines.push({ x: o.x + cs * s * (k.w / 2 + 0.26), z: o.z - sn * s * (k.w / 2 + 0.26), h: o.h, l: k.l + 0.6, w: 0.12 }); }
  for (const l of L.lanes) if (l.type !== 'gate') { const w = (l.hw + 2.2) * 2; for (const s of [1, -1]) lines.push({ x: l.x + Math.cos(l.h) * s * w / 2, z: l.z - Math.sin(l.h) * s * w / 2, h: l.h, l: l.len, w: 0.2, y: 1 }); }
  if (lines.length) { const g = new THREE.BoxGeometry(1, 0.012, 1); const im = new THREE.InstancedMesh(g, paint, lines.length); lines.forEach((q, i) => { P.set(q.x, 0.012, q.z); Q.setFromAxisAngle(Y, q.h); S.set(q.w, 1, q.l); M4.compose(P, Q, S); im.setMatrixAt(i, M4); C.set(q.y ? 0xe8c030 : 0xe8e8e0); im.setColorAt(i, C); }); im.receiveShadow = true; im.instanceColor.needsUpdate = true; scene.add(im); }
  // Tiefgarage: Decke mit Leuchtbändern
  let ceil = null; if (look.indoor) { ceil = new THREE.Group(); const c = new THREE.Mesh(new THREE.BoxGeometry(bw + 20, 0.5, bd + 20), new THREE.MeshStandardMaterial({ color: 0x77776f, emissive: 0x4a4a44, roughness: 0.95 })); c.position.set(cx, 3.2, cz); ceil.add(c); const gw = new THREE.MeshStandardMaterial({ color: 0x8e8e86, emissive: 0x24241f, roughness: 0.95 }); for (const [w, d, x, z] of [[bw + 2, 0.4, cx, B.z0 - 1], [bw + 2, 0.4, cx, B.z1 + 1], [0.4, bd + 2, B.x0 - 1, cz], [0.4, bd + 2, B.x1 + 1, cz]]) { const q = new THREE.Mesh(new THREE.BoxGeometry(w, 3.3, d), gw); q.position.set(x, 1.65, z); scene.add(q); } const lamp = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2dc, emissiveIntensity: 3 }); const ln = Math.ceil(bw / 9); const lz = Math.ceil(bd / 12); const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.06, 2.4), lamp, ln * lz); for (let i = 0; i < ln; i++) for (let j = 0; j < lz; j++) { M4.makeTranslation(B.x0 + (i + 0.5) * 9, 2.92, B.z0 + (j + 0.5) * 12); im.setMatrixAt(i * lz + j, M4); } ceil.add(im); scene.add(ceil); }
  // Parklücke: leuchtender Rahmen mit Pfeil, der immer zum aktuellen Abschnitt passt
  const spotG = new THREE.Group(); const glow = new THREE.MeshStandardMaterial({ color: 0x20ff90, emissive: 0x20ff90, emissiveIntensity: 2.4 }); const floor = new THREE.MeshBasicMaterial({ color: 0x20ff90, transparent: true, opacity: 0.2, depthWrite: false }); spriteBlend(floor); const beam = new THREE.MeshBasicMaterial({ color: 0x40ffa0, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide }); spriteBlend(beam); const parts = {};
  parts.f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), floor); parts.f.position.y = 0.03; spotG.add(parts.f); parts.bars = []; for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 1), glow); b.position.y = 0.03; spotG.add(b); parts.bars.push(b); } parts.b = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 1, 1, 1), beam); parts.b.position.y = 2.5; spotG.add(parts.b); scene.add(spotG);
  const setSpot = (sp) => { spotG.position.set(sp.x, 0, sp.z); spotG.rotation.y = sp.h; parts.f.scale.set(sp.hw * 2, 1, sp.hl * 2); const t = 0.12; parts.bars[0].scale.set(sp.hw * 2 + t, 1, t); parts.bars[0].position.z = sp.hl; parts.bars[1].scale.set(sp.hw * 2 + t, 1, t); parts.bars[1].position.z = -sp.hl; parts.bars[2].scale.set(t, 1, sp.hl * 2); parts.bars[2].position.x = sp.hw; parts.bars[3].scale.set(t, 1, sp.hl * 2); parts.bars[3].position.x = -sp.hw; parts.b.scale.set(sp.hw * 2, 5, sp.hl * 2); };
  setSpot(L.stages[0].spot);
  // Bewegte Hindernisse
  const movers = L.movers.map((m) => { const kind = m.kind; const k = OBJ[kind]; const o = new THREE.Mesh(propGeo(kind), mat.clone()); o.castShadow = true; o.receiveShadow = true; if (m.type === 'gate') o.scale.z = (m.hl * 2) / k.l; const pal = PAL[kind]; if (pal) o.material.color.set(pal[Math.floor(r() * pal.length)]); o.frustumCulled = false; scene.add(o); return { m, o }; });
  const W = { scene, sun, sky, mood, sunDir, shadowDirty: true, ceil, spot: setSpot, spotG, big: !!big, beam: (on) => { parts.b.visible = on; } };
  W.update = (t, time) => { for (const q of movers) { const c = moverRect(q.m, t); q.o.position.set(c.x, 0, c.z); q.o.rotation.y = Math.atan2(c.ux, c.uz); q.o.visible = c.x > B.x0 - 40 && c.x < B.x1 + 40 && c.z > B.z0 - 40 && c.z < B.z1 + 40; } glow.emissiveIntensity = 2 + Math.sin(time * 3.4) * 0.9; };
  const right = new THREE.Vector3().crossVectors(Y, sunDir).normalize(); const up = new THREE.Vector3().crossVectors(sunDir, right).normalize(); const ctr = new THREE.Vector3();
  W.follow = (x, z) => { ctr.set(x, 0, z); const texel = (SR * 2) / sun.shadow.mapSize.x; const a = Math.round(ctr.dot(right) / texel) * texel; const b = Math.round(ctr.dot(up) / texel) * texel; const c = ctr.dot(sunDir); ctr.copy(right).multiplyScalar(a).addScaledVector(up, b).addScaledVector(sunDir, c); sun.target.position.copy(ctr); sun.position.copy(ctr).addScaledVector(sunDir, 300); sun.target.updateMatrixWorld(); sun.updateMatrixWorld(); W.shadowDirty = true; };
  W.dispose = () => { scene.traverse((o) => { if (o.isInstancedMesh) o.dispose(); }); }; void ims; void level;
  return W;
}
