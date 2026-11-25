// Theos Seitenscheidel - Strom-Spiel: Modelle aus Blender entpacken und als three.js-Gruppen bauen (strommodels.js: Erzeuger, Speicher,
// Pickup; stromwelt.js: Bäume, Bunker, Ladeplätze, Büro, Stadt), drehende Teile finden, Figuren im weißen Blitz-Shirt.
// Geometrien werden einmal entpackt und dann geteilt. Für Wald und Straßenmöbel gibt es Instanzen (ein Zeichenaufruf für viele Stück).
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import DATA from './strommodels.js';
import WELT from './stromwelt.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)

const b64 = (s, Ctor) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Ctor(u.buffer); };
const SETS = [DATA, WELT]; const GEO = new Map(); const MATS = new Map();
const setOf = (name) => SETS.find((d) => d.models[name]) || null;
function materials(D) {
  let list = MATS.get(D); if (list) return list;
  list = D.mats.map((d) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(d.c[0], d.c[1], d.c[2]), roughness: d.r, metalness: Math.min(d.m, 0.85), envMapIntensity: 0.9 });
    if (d.e > 0) { m.emissive = m.color.clone(); m.emissiveIntensity = Math.min(3, d.e * 0.45); }
    if (d.a < 0.99) { m.transparent = true; m.opacity = d.a; m.depthWrite = false; }
    m.name = d.n; return m;
  }); MATS.set(D, list); return list;
}
export const matByName = (n) => { for (const D of SETS) { const m = materials(D).find((q) => q.name === n); if (m) return m; } return null; };
function geometry(key, c) {
  let g = GEO.get(key); if (g) return g;
  const q = b64(c.p, Int16Array); const nn = b64(c.n, Int8Array); const n = c.nv; const pos = new Float32Array(n * 3); const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { pos[i * 3 + k] = c.o[k] + q[i * 3 + k] * c.s[k]; nrm[i * 3 + k] = nn[i * 3 + k] / 127; }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(new THREE.BufferAttribute(b64(c.i, c.w === 2 ? Uint16Array : Uint32Array), 1));
  if (c.c) { const cb = b64(c.c, Uint8Array); const col = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) col[i] = Math.pow(cb[i] / 255, 2.2); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  g.computeBoundingSphere(); GEO.set(key, g); return g;
}
export const MODEL_NAMES = SETS.flatMap((d) => Object.keys(d.models));
export const hasModel = (name) => !!setOf(name);

// Modell bauen: { group, parts: { Name: Object3D }, set(name, axis, angle) }
export function buildModel(name, o = {}) {
  const D = setOf(name); if (!D) throw new Error('Modell fehlt: ' + name); const M = D.models[name]; const mats = materials(D); const nodes = [];
  M.forEach((p, i) => {
    const node = new THREE.Group(); node.name = p.name; node.position.set(p.pos[0], p.pos[1], p.pos[2]); node.rotation.set(p.rot[0], p.rot[1], p.rot[2], 'ZYX'); node.userData.rot0 = node.rotation.clone();
    p.geo.forEach((c, j) => { const mesh = new THREE.Mesh(geometry(`${name}|${i}|${j}`, c), c.c ? (o.vcMat || vcMat()) : mats[c.m]); mesh.castShadow = o.shadow !== false && !mats[c.m].transparent; mesh.receiveShadow = true; node.add(mesh); });
    nodes.push(node); if (p.parent >= 0) nodes[p.parent].add(node);
  });
  const parts = Object.fromEntries(nodes.map((n) => [n.name, n]));
  const set = (n, axis, a) => { const p = parts[n]; if (!p) return; const r0 = p.userData.rot0; p.rotation[axis] = r0[axis] + a; };
  return { group: nodes[0], parts, set };
}
let VC = null; const vcMat = () => VC || (VC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));

// Ein Modell als eine einzige Geometrie mit Farben je Punkt (für Bäume, Felsen, Büsche: viele Stück, ein Material)
const MERGED = new Map();
export function modelGeo(name) {
  let g = MERGED.get(name); if (g) return g; const D = setOf(name); if (!D) throw new Error('Modell fehlt: ' + name); const mats = materials(D); const list = []; const M = D.models[name]; const world = [];
  M.forEach((p, i) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rot[0], p.rot[1], p.rot[2], 'ZYX')), new THREE.Vector3(1, 1, 1)); if (p.parent >= 0) m.premultiply(world[p.parent]); world[i] = m;
    p.geo.forEach((c, j) => { const src = geometry(`${name}|${i}|${j}`, c); const q = src.index ? src.toNonIndexed() : src.clone(); q.applyMatrix4(m); const col = mats[c.m].color; const n = q.attributes.position.count; const a = new Float32Array(n * 3); for (let k = 0; k < n; k++) { a[k * 3] = col.r; a[k * 3 + 1] = col.g; a[k * 3 + 2] = col.b; } q.setAttribute('color', new THREE.BufferAttribute(a, 3)); list.push(q); }); });
  g = mergeGeometries(list); g.computeBoundingSphere(); g.computeBoundingBox(); MERGED.set(name, g); return g;
}
let FLAT = null; export const flatMat = () => FLAT || (FLAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, envMapIntensity: 0.5 }));

// Viele gleiche Modelle mit ihren echten Materialien (Lampen leuchten weiter): je Material-Block ein InstancedMesh.
// list: [{ x, y, z, ry, s }]
export function instances(name, list, o = {}) {
  const D = setOf(name); if (!D) throw new Error('Modell fehlt: ' + name); const mats = materials(D); const M = D.models[name]; const grp = new THREE.Group(); grp.name = 'inst:' + name; const world = [];
  const T = list.map((t) => new THREE.Matrix4().compose(new THREE.Vector3(t.x, t.y || 0, t.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.ry || 0), new THREE.Vector3(t.s || 1, t.s || 1, t.s || 1))); const tmp = new THREE.Matrix4();
  M.forEach((p, i) => { const m = new THREE.Matrix4().compose(new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]), new THREE.Quaternion().setFromEuler(new THREE.Euler(p.rot[0], p.rot[1], p.rot[2], 'ZYX')), new THREE.Vector3(1, 1, 1)); if (p.parent >= 0) m.premultiply(world[p.parent]); world[i] = m;
    p.geo.forEach((c, j) => { const im = new THREE.InstancedMesh(geometry(`${name}|${i}|${j}`, c), mats[c.m], list.length); T.forEach((t, k) => { im.setMatrixAt(k, tmp.multiplyMatrices(t, m)); }); im.castShadow = o.shadow !== false && !mats[c.m].transparent; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); grp.add(im); }); });
  return grp;
}

// Figur wie auf dem Startbildschirm (spielfigur.js): weißes Shirt mit Blitz auf der Brust
export function stromPerson(scene, look) {
  return createPerson(scene, { ...look, bolt: true });
}
export const LOOKS = [
  { name: 'Rot', shirt: 0xf4f4f0, cap: 0x8a221c, brim: 0x241c1a, hair: 0x3a2a1e, skin: 0xe2b08c, pants: 0x2a2f3a, col: '#e5483c', iris: 0x5a3a1e },
  { name: 'Blau', shirt: 0xf4f4f0, cap: 0x1c3f86, brim: 0x141a2a, hair: 0x1e1a18, skin: 0xd8a47e, pants: 0x2a2f3a, col: '#3f86e8', iris: 0x2a5a8a },
  { name: 'Gelb', shirt: 0xf4f4f0, cap: 0xa86a10, brim: 0x2a1c0a, hair: 0x5a3a1e, skin: 0xe8bc98, pants: 0x2a2f3a, col: '#f0b52a', iris: 0x3a6a3a },
  { name: 'Grün', shirt: 0xf4f4f0, cap: 0x1f6a34, brim: 0x0e2a16, hair: 0x2a1c14, skin: 0xc8946a, pants: 0x2a2f3a, col: '#3fbf5a', iris: 0x2a4a2a }, // vierter Spieler (nur neue Stände)
];
export const NPC = {
  haendler: { shirt: 0x2a2a26, cap: 0x141412, brim: 0x141412, hair: 0x2a1c14, skin: 0xc8946a, pants: 0x1a1a18 },
  boss: { shirt: 0x5a2a3a, cap: 0x2a1418, brim: 0x1a0c10, hair: 0x101010, skin: 0xd8a47e, pants: 0x1c1c22 },
  depot: { shirt: 0xe8b422, cap: 0x1a3a6a, brim: 0x10203a, hair: 0x3a2a1e, skin: 0xe2b08c, pants: 0x1e2a44 },
  polizei: { shirt: 0x1e3a6a, cap: 0x10203e, brim: 0x0a0a10, hair: 0x5a3a1e, skin: 0xe8bc98, pants: 0x14203a },
  doener: { shirt: 0xf2f0ea, cap: 0xc0332a, brim: 0x8a221c, hair: 0x141210, skin: 0xc8946a, pants: 0x2a2a2a },
  stadt: [{ shirt: 0x3a6a8a, cap: 0x2a3a4a, brim: 0x1a2a3a, hair: 0x5a3a1e, skin: 0xe8bc98, pants: 0x3a3a4a }, { shirt: 0x9a3a4a, cap: 0x4a2a2a, brim: 0x2a1a1a, hair: 0x2a1c14, skin: 0xd8a47e, pants: 0x2a2a34 }, { shirt: 0x5a7a4a, cap: 0x3a4a2a, brim: 0x2a3a1a, hair: 0x8a6a3a, skin: 0xe2b08c, pants: 0x4a4038 }, { shirt: 0xd8b04a, cap: 0x6a5a2a, brim: 0x4a3a1a, hair: 0x1e1a18, skin: 0xc8946a, pants: 0x30303a }],
};
export const personPlain = (scene, look) => createPerson(scene, look);
