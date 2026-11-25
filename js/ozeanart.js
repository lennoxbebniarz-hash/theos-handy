// Theos Seitenscheidel - Trockne den Ozean aus: Modelle aus Blender entpacken (ozeanmodels.js) und als three.js-Gruppen bauen.
// Werkzeuge (Glas, Eimer, Handpumpe, Motorpumpe), Tanklaster, XXXXL-Pumpe, Haus, Meerestiere, Roboter. Geometrien werden einmal entpackt und geteilt.
// Dazu die Spielfiguren (Figur vom Startbildschirm) mit Rückentank und Werkzeug in der Hand, und das Handy aus dem Vorspann.
import * as THREE from './vendor/three.module.min.js';
import DATA from './ozeanmodels.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const b64 = (s, Ctor) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Ctor(u.buffer); };
const GEO = new Map(); let MATS = null;
function materials() {
  if (MATS) return MATS;
  MATS = DATA.mats.map((d) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(d.c[0], d.c[1], d.c[2]), roughness: d.r, metalness: Math.min(d.m, 0.9), envMapIntensity: 1 });
    if (d.v) { m.vertexColors = true; m.color.setRGB(1, 1, 1); }
    if (d.e > 0) { m.emissive = new THREE.Color().setRGB(d.c[0], d.c[1], d.c[2]); m.emissiveIntensity = Math.min(3, d.e * 0.5); }
    if (d.a < 0.99) { m.transparent = true; m.opacity = Math.max(0.18, d.a); m.depthWrite = false; m.side = THREE.DoubleSide; }
    m.name = d.n; return m;
  }); return MATS;
}
export const matByName = (n) => materials().find((m) => m.name === n) || null;
function geometry(key, c) {
  let g = GEO.get(key); if (g) return g;
  const q = b64(c.p, Int16Array); const nn = b64(c.n, Int8Array); const n = c.nv; const pos = new Float32Array(n * 3); const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { pos[i * 3 + k] = c.o[k] + q[i * 3 + k] * c.s[k]; nrm[i * 3 + k] = nn[i * 3 + k] / 127; }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(new THREE.BufferAttribute(b64(c.i, c.w === 2 ? Uint16Array : Uint32Array), 1));
  if (c.c) { const cb = b64(c.c, Uint8Array); const col = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) col[i] = Math.pow(cb[i] / 255, 2.2); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  g.computeBoundingSphere(); GEO.set(key, g); return g;
}
export const MODEL_NAMES = Object.keys(DATA.models);

// Bewegliche Teile bleiben einzeln, alles andere wird je Material zu einem Teil zusammengefasst (viel weniger Zeichenaufrufe, flüssigeres Bild)
const KEEP = { Handpumpe: ['Handpumpe_Schwengel'], Tanklaster: ['Tanklaster_Rad_'], XXXXL: ['XXXXL_Pumpe_Laufrad'], Helfer: ['Helferroboter_Bein_'], Hai: ['Hai_Schwanzflosse', 'Hai_Brustflosse'], Wal: ['Wal_Fluke', 'Wal_Flosse_'], Schildkroete: ['Schildkröte_Flossen'] };
const MERGED = new Map();
// Modell bauen: { group, parts: { Name: Object3D }, box } – die Teile hängen an ihren Drehpunkten (Schwengel, Flossen, Beine). o.merge === false: alles einzeln
export function buildModel(name, o = {}) {
  if (o.merge !== false && !o.mat) return buildMerged(name, o);
  const M = DATA.models[name]; if (!M) throw new Error('Modell fehlt: ' + name); const mats = materials(); const nodes = [];
  M.forEach((p, i) => {
    const node = new THREE.Group(); node.name = p.name; node.position.set(p.pos[0], p.pos[1], p.pos[2]);
    p.geo.forEach((c, j) => { const mat = o.mat ? o.mat(mats[c.m]) || mats[c.m] : mats[c.m]; const mesh = new THREE.Mesh(geometry(`${name}|${i}|${j}`, c), mat); mesh.castShadow = o.shadow !== false && !mat.transparent; mesh.receiveShadow = o.receive !== false; mesh.userData.mat = mats[c.m].name; node.add(mesh); });
    nodes.push(node); if (p.parent >= 0) nodes[p.parent].add(node);
  });
  const parts = Object.fromEntries(nodes.map((n) => [n.name, n])); const root = new THREE.Group(); root.name = 'oz:' + name; root.add(nodes[0]);
  const box = new THREE.Box3().setFromObject(nodes[0]); return { group: root, parts, box, find: (pre) => nodes.filter((n) => n.name.startsWith(pre)) };
}
function buildMerged(name, o) {
  const M = DATA.models[name]; if (!M) throw new Error('Modell fehlt: ' + name); const mats = materials(); const keep = KEEP[name] || [];
  const isKeep = M.map((p) => keep.some((k) => p.name.startsWith(k))); const kept = M.map((p, i) => { let q = i; while (q >= 0) { if (isKeep[q]) return q; q = M[q].parent; } return -1; }); // welches bewegliche Teil trägt diesen Knoten?
  const abs = []; M.forEach((p, i) => { const par = p.parent >= 0 ? abs[p.parent] : [0, 0, 0]; abs[i] = [par[0] + p.pos[0], par[1] + p.pos[1], par[2] + p.pos[2]]; });
  const root = new THREE.Group(); root.name = 'oz:' + name; const parts = {}; const body = new THREE.Group(); body.name = M[0].name; root.add(body); parts[M[0].name] = body;
  // feste Teile: je Material eine Geometrie (einmal gerechnet, dann geteilt)
  let cache = MERGED.get(name);
  if (!cache) { const byMat = new Map(); M.forEach((p, i) => { if (kept[i] >= 0) return; p.geo.forEach((c, j) => { const g = geometry(`${name}|${i}|${j}`, c).clone(); g.translate(abs[i][0], abs[i][1], abs[i][2]); if (!byMat.has(c.m)) byMat.set(c.m, []); byMat.get(c.m).push(g); }); });
    cache = []; for (const [m, list] of byMat) { const hasCol = list.some((g) => g.attributes.color); for (const g of list) if (hasCol && !g.attributes.color) { const n = g.attributes.position.count; g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3)); } const mg = list.length === 1 ? list[0] : mergeGeometries(list); mg.computeBoundingSphere(); cache.push({ m, g: mg }); }
    MERGED.set(name, cache); }
  for (const { m, g } of cache) { const mat = mats[m]; const mesh = new THREE.Mesh(g, mat); mesh.castShadow = o.shadow !== false && !mat.transparent; mesh.receiveShadow = o.receive !== false; mesh.userData.mat = mat.name; body.add(mesh); }
  // bewegliche Teile: eigene Gruppe am Drehpunkt, darin ihre Unterteile
  const groups = {}; M.forEach((p, i) => { if (!isKeep[i] || (p.parent >= 0 && kept[p.parent] >= 0)) return; const gr = new THREE.Group(); gr.name = p.name; gr.position.set(abs[i][0], abs[i][1], abs[i][2]); root.add(gr); groups[i] = gr; parts[p.name] = gr; });
  M.forEach((p, i) => { const k = kept[i]; if (k < 0) return; const gr = groups[k]; if (!gr) return; p.geo.forEach((c, j) => { const mat = mats[c.m]; const mesh = new THREE.Mesh(geometry(`${name}|${i}|${j}`, c), mat); mesh.position.set(abs[i][0] - abs[k][0], abs[i][1] - abs[k][1], abs[i][2] - abs[k][2]); mesh.castShadow = o.shadow !== false && !mat.transparent; mesh.receiveShadow = o.receive !== false; mesh.userData.mat = mat.name; gr.add(mesh); }); });
  const box = new THREE.Box3().setFromObject(root); return { group: root, parts, box, find: (pre) => Object.values(parts).filter((n) => n.name.startsWith(pre)) };
}
// Möwe: Körper, Kopf, Schnabel, zwei Flügel zum Schlagen (Vorspann und über der Küste)
export function buildGull() {
  const g = new THREE.Group(); const white = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.7 }); const grey = new THREE.MeshStandardMaterial({ color: 0x9aa2aa, roughness: 0.7, side: THREE.DoubleSide }); const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: 0.7, side: THREE.DoubleSide }); const beak = new THREE.MeshStandardMaterial({ color: 0xf0a020, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), white); body.scale.set(1, 0.85, 2.0); g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), white); head.position.set(0, 0.1, 0.36); g.add(head);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.14, 8), beak); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.08, 0.5); g.add(bk);
  for (const e of [-1, 1]) { const ey = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), dark); ey.position.set(e * 0.06, 0.14, 0.42); g.add(ey); }
  const tail = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22), grey); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0.02, -0.42); g.add(tail);
  const wings = []; for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(s * 0.12, 0.06, 0.02); g.add(piv); const w = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.26).translate(s * 0.36, 0, 0), grey); w.rotation.x = -Math.PI / 2; piv.add(w); const tip = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22).translate(s * 0.82, 0, 0), dark); tip.rotation.x = -Math.PI / 2; piv.add(tip); wings.push({ piv, s }); }
  g.flap = (t, k = 1) => { for (const w of wings) w.piv.rotation.z = w.s * Math.sin(t * 14) * 0.7 * k; };
  g.traverse((q) => { q.castShadow = true; }); g.visible = false; return g;
}
// Alle Meshes eines Modells mit einem Material (z. B. Gold für die Kette, Leuchten für die Vorschau)
export function tint(model, fn) { model.group.traverse((o) => { if (o.isMesh) { const m = fn(o.material, o); if (m) o.material = m; } }); }

// ---------------- Spielfiguren ----------------
export const LOOKS = [
  { name: 'Rot', shirt: 0xc0332a, cap: 0x8a221c, brim: 0x241c1a, hair: 0x3a2a1e, skin: 0xe2b08c, pants: 0x2a2f3a, col: '#e5483c', iris: 0x5a3a1e },
  { name: 'Blau', shirt: 0x2c62c8, cap: 0x1c3f86, brim: 0x141a2a, hair: 0x1e1a18, skin: 0xd8a47e, pants: 0x2a2f3a, col: '#3f86e8', iris: 0x2a5a8a },
  { name: 'Gelb', shirt: 0xe8a21c, cap: 0xa86a10, brim: 0x2a1c0a, hair: 0x5a3a1e, skin: 0xe8bc98, pants: 0x2a2f3a, col: '#f0b52a', iris: 0x3a6a3a },
  { name: 'Grün', shirt: 0x2f9a48, cap: 0x1f6a34, brim: 0x0e2a16, hair: 0x2a1c14, skin: 0xc8946a, pants: 0x2a2f3a, col: '#3fbf5a', iris: 0x2a4a2a }, // vierter Spieler (nur neue Stände)
];
export const NPC = {
  haendler: { shirt: 0xf2c21a, cap: 0x10203e, brim: 0x0a0a10, hair: 0x8a8a84, skin: 0xd8a47e, pants: 0x1e2a44 }, // gelbe Öljacke, Kapitänsmütze
};
// Rückentank: Gitterkäfig mit durchsichtigem Kanister, der Füllstand ist zu sehen (wie der Staubtank im Moonsweeper)
export function backTank() {
  const g = new THREE.Group(); const frame = new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.7, roughness: 0.35 });
  const shell = new THREE.MeshStandardMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0.35, roughness: 0.15, depthWrite: false });
  const water = new THREE.MeshStandardMaterial({ color: 0x2a86d8, emissive: 0x0a3a70, emissiveIntensity: 0.4, roughness: 0.1, transparent: true, opacity: 0.85 });
  const W = 0.34; const H = 0.46; const D = 0.2; g.add(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), shell));
  const lvl = new THREE.Mesh(new THREE.BoxGeometry(W - 0.03, 1, D - 0.03), water); lvl.position.y = -H / 2; g.add(lvl);
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, H + 0.02, 6), frame); r.position.set(x, 0, z); g.add(r); }
  for (const y of [-H / 2, 0, H / 2]) for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.018, 0.018), frame); r.position.set(0, y, s * D / 2); g.add(r); }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0xc5161d, roughness: 0.5 })); cap.position.set(0.09, H / 2 + 0.03, 0); g.add(cap);
  g.traverse((o) => { o.castShadow = false; });
  g.setFill = (k) => { k = Math.max(0.001, Math.min(1, k)); lvl.scale.y = (H - 0.03) * k; lvl.position.y = -H / 2 + 0.015 + (H - 0.03) * k / 2; lvl.visible = k > 0.002; };
  g.setFill(0); return g;
}
// Werkzeug in der Hand (Figur und Ego-Sicht). Glas und Eimer werden getragen, Pumpen stehen am Wasser (dann bleibt die Hand leer).
export function handTool(id) {
  if (id === 'glas') { const m = buildModel('Glas', { shadow: false }); m.group.scale.setScalar(1.15); return m; }
  if (id === 'eimer') { const m = buildModel('Eimer', { shadow: false }); m.group.scale.setScalar(0.85); return m; }
  return null;
}
// Figur mit Rückentank und Werkzeug
export function oceanPerson(scene, look) {
  const P = createPerson(scene, look); const spine = P.fig.root.getObjectByName('spine2') || P.fig.bones.spine2; const tank = backTank();
  if (spine) { tank.position.set(0, -0.14, -0.27); spine.add(tank); } else { tank.position.set(0, 1.25, -0.22); P.space.add(tank); }
  P.tank = tank; P.tool = null; P.toolId = null; const hand = P.fig.bones.handR || P.fig.root.getObjectByName('handR');
  P.setTool = (id) => { if (P.toolId === id) return; P.toolId = id; if (P.tool) { P.tool.group.parent && P.tool.group.parent.remove(P.tool.group); P.tool = null; } const m = handTool(id); if (!m || !hand) return; m.group.position.set(0, -0.08, 0.05); hand.add(m.group); P.tool = m; };
  return P;
}
export const personPlain = (scene, look) => createPerson(scene, look);

// ---------------- Handy (Vorspann, Fundstück) ----------------
export function phoneModel(text = '') {
  const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.155, 0.009), new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.6, roughness: 0.3 })); g.add(body);
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.067, 0.142), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.2 })); scr.position.z = 0.0048; g.add(scr);
  g.draw = (fn) => { const x = c.getContext('2d'); fn(x, 128, 256); t.needsUpdate = true; };
  g.draw((x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a7ae0'); gr.addColorStop(1, '#ff9a4a'); x.fillStyle = gr; x.fillRect(0, 0, w, h); x.fillStyle = '#fff'; x.font = '700 30px Bahnschrift'; x.textAlign = 'center'; x.fillText(text || '12:00', w / 2, 60); });
  g.traverse((o) => { o.castShadow = false; }); return g;
}
// Brunos Goldkette (liegt am Grund des Atlantiks)
export function goldChain() {
  const g = new THREE.Group(); const gold = new THREE.MeshStandardMaterial({ color: 0xe0b050, metalness: 1, roughness: 0.18, emissive: 0x3a2400, emissiveIntensity: 0.3 });
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; const l = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12), gold); l.position.set(Math.cos(a) * 0.26, 0.012, Math.sin(a) * 0.2); l.rotation.set(Math.PI / 2, 0, a + (i % 2) * Math.PI / 2); g.add(l); }
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 24), gold); p.position.set(0, 0.012, 0.26); g.add(p); return g;
}
