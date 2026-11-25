// Theos Seitenscheidel - Big Bruno kommt auf die Erde: Grafik. Modelle aus Blender (brunomodels.js: Raumschiff TS-1, Werkzeuge,
// Drohne, Schiffsraum), Fels des Asteroiden aus dem Raster (brunomesh.js): Staubschicht außen, frischer rissiger Fels innen, rote
// Erzfelder, Eis mit Raureif, Goldadern, Kernkristall, Glut an frischen Schnitten, Zielumrisse. Dazu lose Steine, Eiskristalle und
// Nuggets auf der Oberfläche, Weltall mit Milchstraße, Sonne und wachsender Erde, Bilder der Werkzeuge fürs Terminal.
import * as THREE from './vendor/three.module.min.js';
import { mergeVertices } from './vendor/BufferGeometryUtils.js';
import DATA from './brunomodels.js';
import { buildAstronaut, poseAstronaut, earthTexture } from './moonart.js';
import { meshChunk } from './brunomesh.js';
import { CN, MAT, rng } from './brunovox.js';
import { rockTexture, glowTexture, sunTexture, skyTexture, signTexture } from './brunotex.js';

export const SUN_DIR = new THREE.Vector3(0.55, 0.45, 0.70).normalize();
export const EARTH_DIR = new THREE.Vector3(-0.86, 0.2, -0.47).normalize();
export const SHIP = new THREE.Vector3(0, 70, 0); // Raumschiff schwebt über dem „Nordpol“ von Big Bruno
export const INSIDE = new THREE.Vector3(0, 2400, 0); // Schiffsraum liegt weit weg (eigene Kulisse)
export const ACCENTS = [0xee7a18, 0xe24a86, 0x2fb8c6, 0x4cbf3a]; // Orange, Pink, Türkis, Grün (vierter Spieler nur in neuen Ständen)
export const HN = 32; // gleichzeitige Glutstellen im Fels

// ---------------- Modelle aus Blender entpacken ----------------
const b64 = (s, Ctor) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Ctor(u.buffer); };
const GEO = new Map(); let MATS = null; let DETAIL = null;
export function detailTexture() { return DETAIL || (DETAIL = rockTexture(1024)); }
// Leichte Unruhe auf lackierten Flächen (Flecken, Glanzwechsel), damit nichts wie aus einem Guss aussieht
function grunge(m) {
  m.onBeforeCompile = (s) => { s.uniforms.uGr = { value: detailTexture() };
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGP; varying vec3 vGN;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvGP = (modelMatrix * vec4(transformed, 1.0)).xyz; vGN = normalize(mat3(modelMatrix) * objectNormal);');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uGr; varying vec3 vGP; varying vec3 vGN;')
      .replace('#include <color_fragment>', '#include <color_fragment>\nvec3 gW = pow(abs(vGN), vec3(4.0)); gW /= (gW.x + gW.y + gW.z + 1e-4); vec4 gT = texture2D(uGr, vGP.zy * 0.33) * gW.x + texture2D(uGr, vGP.xz * 0.33) * gW.y + texture2D(uGr, vGP.xy * 0.33) * gW.z; diffuseColor.rgb *= 0.84 + 0.3 * gT.b;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.75 + 0.5 * gT.b), 0.05, 1.0);'); };
  return m;
}
function materials() {
  if (MATS) return MATS;
  MATS = DATA.mats.map((d) => { const m = new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(d.c[0], d.c[1], d.c[2]), roughness: d.r, metalness: Math.min(d.m, 0.9), envMapIntensity: 1.0 }); if (d.e > 0) { m.emissive = m.color.clone(); m.emissiveIntensity = Math.min(5, d.e * 0.7); } if (d.a < 0.99) { m.transparent = true; m.opacity = d.a; m.depthWrite = false; } else if (!(d.e > 0)) grunge(m); m.name = d.n; return m; });
  return MATS;
}
export const matByName = (n) => materials().find((m) => m.name === n) || null;
function geometry(key, c) {
  let g = GEO.get(key); if (g) return g; const q = b64(c.p, Int16Array); const nn = b64(c.n, Int8Array); const n = c.nv; const pos = new Float32Array(n * 3); const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { pos[i * 3 + k] = c.o[k] + q[i * 3 + k] * c.s[k]; nrm[i * 3 + k] = nn[i * 3 + k] / 127; }
  g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setIndex(new THREE.BufferAttribute(b64(c.i, c.w === 2 ? Uint16Array : Uint32Array), 1)); g.computeBoundingSphere(); GEO.set(key, g); return g;
}
// Neue Waffen (2026-11-13): direkt in three.js gebaut, mit den Blender-Materialien, gleiche Form wie buildModel ({ group, parts }).
// Maße wie die Blender-Werkzeuge: Laserschneider ~0,5 m lang, Mündung bei z -0,47. Teilenamen wie in Blender: Modell_Teil.
const PROC = {
  Sprengladung: (mat) => { // drei rote Stangen, schwarzes Klebeband, Zünder mit roter Lampe
    const root = new THREE.Group(); const stick = new THREE.CylinderGeometry(0.034, 0.034, 0.26, 14); for (const [x, z] of [[-0.036, 0.02], [0.036, 0.02], [0, -0.042]]) { const s = new THREE.Mesh(stick, mat('BB_Rot')); s.position.set(x, 0.13, z); root.add(s); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 14), mat('BB_Papier')); cap.position.set(x, 0.262, z); root.add(cap); }
    for (const y of [0.06, 0.2]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.028, 18), mat('BB_Schwarz')); band.position.y = y; band.scale.z = 0.95; root.add(band); }
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.03), mat('BB_Stahl_Dunkel')); box.position.set(0, 0.14, 0.072); root.add(box); const led = new THREE.Group(); led.name = 'Sprengladung_Licht'; led.position.set(0.018, 0.15, 0.09); led.add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), mat('BB_Leucht_Rot'))); root.add(led);
    const wire = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.004, 6, 16, Math.PI), mat('BB_Warngelb')); wire.position.set(-0.01, 0.17, 0.075); root.add(wire); return root; },
  Plasmawerfer: (mat) => { // weißes Gehäuse, Lauf mit grünen Spulen, Plasmatank oben, Griff
    const root = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.3), mat('BB_Weiss')); body.position.set(0, 0.13, -0.04); root.add(body);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.02, 0.24), mat('BB_Orange')); stripe.position.set(0, 0.1, -0.04); root.add(stripe);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.26, 16), mat('BB_Stahl_Dunkel')); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.13, -0.3); root.add(barrel);
    for (let i = 0; i < 4; i++) { const coil = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.009, 8, 20), mat('BB_Leucht_Gruen')); coil.position.set(0, 0.13, -0.22 - i * 0.055); root.add(coil); }
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.15, 14), mat('BB_Glas')); tank.rotation.x = Math.PI / 2; tank.position.set(0, 0.205, -0.02); root.add(tank); const goo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 12), mat('BB_Leucht_Gruen')); goo.rotation.x = Math.PI / 2; goo.position.copy(tank.position); root.add(goo);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.06), mat('BB_Gummi')); grip.position.set(0, 0.03, 0.06); grip.rotation.x = -0.25; root.add(grip);
    const mz = new THREE.Group(); mz.name = 'Plasmawerfer_Muendung'; mz.position.set(0, 0.13, -0.45); const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.04, 16), mat('BB_Chrom')); tip.rotation.x = Math.PI / 2; mz.add(tip); root.add(mz); return root; },
  Antimaterie: (mat) => { // leuchtender lila Kern in einem Chromkäfig mit zwei Kappen
    const root = new THREE.Group(); const core = new THREE.Group(); core.name = 'Antimaterie_Kern'; core.add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), mat('BB_Leucht_Lila'))); root.add(core);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 16), mat('BB_Glas')); root.add(glass);
    for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.05, 20), mat('BB_Stahl_Dunkel')); cap.position.y = s * 0.1; if (s < 0) cap.rotation.x = Math.PI; root.add(cap); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.008, 8, 24), mat('BB_Leucht_Pink')); ring.rotation.x = Math.PI / 2; ring.position.y = s * 0.085; root.add(ring); }
    for (let i = 0; i < 4; i++) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 8), mat('BB_Chrom')); const a = i * Math.PI / 2 + 0.4; bar.position.set(Math.cos(a) * 0.098, 0, Math.sin(a) * 0.098); root.add(bar); }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.01, 8, 28), mat('BB_Warngelb')); band.rotation.x = Math.PI / 2; root.add(band); return root; },
};
export const hasModel = (name) => !!DATA.models[name] || !!PROC[name];
// o: { shadow, receive, mat (ein Material für alles, z. B. Hologramm) }
export function buildModel(name, o = {}) {
  if (PROC[name]) { const mats = materials(); const byName = (n) => mats[Math.max(0, DATA.mats.findIndex((q) => q.n === n))]; const root = PROC[name]((n) => o.mat || byName(n)); root.name = name + '_Root'; const parts = {}; root.traverse((x) => { if (x.name) parts[x.name] = x; if (x.isMesh) { x.castShadow = o.shadow !== false && !x.material.transparent; x.receiveShadow = o.receive !== false; x.userData.mat0 = x.material; } }); return { group: root, parts }; }
  const M = DATA.models[name]; if (!M) throw new Error('Modell fehlt: ' + name); const mats = materials(); const nodes = [];
  M.forEach((p, i) => { const node = new THREE.Group(); node.name = p.name; node.position.set(p.pos[0], p.pos[1], p.pos[2]); node.rotation.set(p.rot[0], p.rot[1], p.rot[2], 'ZYX'); node.userData.pos0 = node.position.clone();
    p.geo.forEach((c, j) => { const mesh = new THREE.Mesh(geometry(`${name}|${i}|${j}`, c), o.mat || mats[c.m]); mesh.castShadow = o.shadow !== false && !mats[c.m].transparent; mesh.receiveShadow = o.receive !== false; mesh.userData.mat0 = mats[c.m]; node.add(mesh); });
    nodes.push(node); if (p.parent >= 0) nodes[p.parent].add(node); });
  const parts = Object.fromEntries(nodes.map((n) => [n.name, n]));
  return { group: nodes[0], parts };
}

// ---------------- Fels ----------------
const ROCK_PARS = `
#define HN ${HN}
uniform sampler2D uRock; uniform float uTime; uniform vec4 uHot[HN]; uniform vec4 uHotB[HN]; uniform vec4 uMark[3]; uniform vec4 uMarkC[3];
varying vec4 vMat; varying vec2 vAux; varying vec3 vWP; varying vec3 vWN;
vec4 bbTri(float k) { vec3 bw = pow(abs(vWN), vec3(6.0)); bw /= (bw.x + bw.y + bw.z + 1e-5); return texture2D(uRock, vWP.zy * k) * bw.x + texture2D(uRock, vWP.xz * k) * bw.y + texture2D(uRock, vWP.xy * k) * bw.z; }
float bbHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
vec3 bbPerturb(vec3 sp, vec3 sn, float h) { vec3 sx = dFdx(sp); vec3 sy = dFdy(sp); vec3 r1 = cross(sy, sn); vec3 r2 = cross(sn, sx); float det = dot(sx, r1); vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2); return normalize(abs(det) * sn - g); }
`;
const ROCK_COLOR = `
float bbDepth = vAux.x; float bbAo = vAux.y;
vec4 tA = bbTri(0.08); vec4 tB = bbTri(0.47); vec4 tC = bbTri(1.9);
float bbH = tA.r * 0.34 + tB.r * 0.11 + tC.r * 0.028; float grain = tC.b;
float fresh = smoothstep(0.1, 0.5, bbDepth + (tB.r - 0.4) * 0.3);
vec3 dust = mix(vec3(0.31, 0.25, 0.185), vec3(0.47, 0.395, 0.30), tA.b); dust *= (0.72 + 0.6 * tB.r) * (0.88 + 0.24 * grain); dust = mix(dust * 0.6, dust, smoothstep(0.06, 0.4, tB.r));
vec3 rockc = mix(vec3(0.115, 0.115, 0.13), vec3(0.20, 0.195, 0.21), tA.b) * (0.75 + 0.5 * grain);
float crackF = min(smoothstep(0.0, 0.55, tB.g), 0.35 + 0.65 * smoothstep(0.0, 0.5, tA.g)); rockc *= mix(0.3, 1.0, crackF);
vec3 col = mix(dust, rockc, fresh); float bbRough = mix(0.97, 0.86, fresh); vec3 bbEmis = vec3(0.0);
float edgeN = (tB.b - 0.5) * 0.9 + (tA.b - 0.5) * 0.5;
float kE = smoothstep(0.38, 0.62, vMat.x + edgeN * 0.5); float kI = smoothstep(0.38, 0.62, vMat.y + edgeN * 0.5); float kG = smoothstep(0.12, 0.5, vMat.z + edgeN * 0.3); float kK = smoothstep(0.3, 0.6, vMat.w);
vec3 red = mix(vec3(0.30, 0.055, 0.03), vec3(0.47, 0.12, 0.055), tA.b) * (0.8 + 0.4 * grain);
float fleck = max(tA.a, tB.a * 0.7) * (1.0 - fresh * 0.5); red = mix(red, vec3(0.50, 0.43, 0.34) * (0.8 + 0.4 * tB.r), fleck * 0.9); red = mix(red, red * mix(0.35, 1.0, crackF), fresh);
col = mix(col, red, kI); bbRough = mix(bbRough, 0.72, kI);
float frost = clamp(smoothstep(0.5, 0.05, tB.g) * 0.9 + smoothstep(0.35, 0.0, tA.g) * 0.7 + tC.a * 0.5, 0.0, 1.0);
vec3 ice = mix(vec3(0.05, 0.22, 0.62), vec3(0.16, 0.45, 0.85), tA.b); ice = mix(ice, vec3(0.80, 0.90, 1.0), frost);
col = mix(col, ice, kE); bbRough = mix(bbRough, mix(0.18, 0.5, frost), kE); bbEmis += ice * 0.10 * kE; bbH += frost * 0.03 * kE;
float vein = max(smoothstep(0.42, 0.08, tA.g), smoothstep(0.3, 0.05, tB.g) * 0.55) * kG; vein = max(vein, smoothstep(0.8, 1.0, vMat.z + (tB.r - 0.5) * 0.5) * kG);
vec3 gold = vec3(1.0, 0.56, 0.07) * (0.75 + 0.5 * tC.r);
col = mix(col * mix(1.0, 0.6, kG), gold, vein); bbRough = mix(bbRough, 0.3, vein); bbH += vein * 0.16; bbEmis += gold * vein * 0.22;
vec3 core = vec3(0.42, 0.12, 0.95); float fac = smoothstep(0.0, 0.5, tB.g);
col = mix(col, core * (0.35 + 0.65 * fac), kK); bbRough = mix(bbRough, 0.22, kK); bbEmis += core * kK * (0.5 + 0.35 * sin(uTime * 2.0 + vWP.y * 0.7)) * (1.3 - fac);
float tw = bbHash(floor(vWP * 11.0)); float glint = step(0.991, tw) * (0.4 + 0.6 * sin(uTime * 3.5 + tw * 97.0));
bbEmis += (kE * vec3(0.7, 0.9, 1.0) * 1.6 + vein * vec3(1.0, 0.8, 0.35) * 2.5 + kK * vec3(0.8, 0.5, 1.0) * 2.0) * max(glint, 0.0);
float heat = 0.0; vec3 heatCol = vec3(0.0);
for (int i = 0; i < HN; i++) { vec4 hb = uHotB[i]; float age = uTime - hb.x; if (hb.w <= 0.0 || age < 0.0 || age > hb.y) continue; vec4 hs = uHot[i]; float dd = distance(vWP, hs.xyz); float e = smoothstep(hs.w + 0.75, hs.w - 0.35, dd); if (e <= 0.0) continue; float k = 1.0 - age / hb.y; float v = e * k * k * hb.w; heat += v; heatCol += v * (hb.z < 0.5 ? vec3(1.0, 0.30, 0.04) : hb.z < 1.5 ? vec3(0.55, 0.18, 1.0) : vec3(1.0, 0.22, 0.7)); }
if (heat > 0.002) { heatCol /= heat; float hk = min(heat, 1.6); float lava = smoothstep(0.42, 0.85, tB.r * 0.7 + tC.b * 0.5 + hk * 0.22 - 0.1); float veinH = min(smoothstep(0.5, 0.05, tB.g) * 0.9 + smoothstep(0.4, 0.05, tA.g) * 0.6, 1.0); float glowH = hk * (0.05 + 1.25 * max(lava, veinH * (0.4 + 0.6 * hk))); bbEmis += heatCol * glowH * 0.9 + vec3(1.0, 0.8, 0.45) * pow(max(hk - 1.0, 0.0), 2.0) * 1.2; col *= 1.0 - 0.7 * min(hk, 1.0); bbRough = mix(bbRough, 0.55, min(hk, 1.0)); }
float dCam = length(vViewPosition);
for (int i = 0; i < 3; i++) { vec4 mk = uMark[i]; if (mk.w <= 0.0) continue; float dd = distance(vWP, mk.xyz); float wdt = 0.035 + dCam * 0.0035; float ring = smoothstep(wdt * 2.0, wdt * 0.5, abs(dd - mk.w)); float inner = smoothstep(wdt * 1.6, wdt * 0.4, abs(dd - mk.w * 0.1 - 0.15)); bbEmis += uMarkC[i].rgb * (ring + inner * 0.7 + step(dd, mk.w) * 0.01) * uMarkC[i].a; }
diffuseColor.rgb = col * mix(1.0, bbAo, 0.85);
`;
export function rockMaterial() {
  const U = { uRock: { value: detailTexture() }, uTime: { value: 0 }, uHot: { value: Array.from({ length: HN }, () => new THREE.Vector4()) }, uHotB: { value: Array.from({ length: HN }, () => new THREE.Vector4()) }, uMark: { value: [0, 1, 2].map(() => new THREE.Vector4()) }, uMarkC: { value: [0, 1, 2].map(() => new THREE.Vector4()) } };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0, envMapIntensity: 0.35 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 matw; attribute vec2 aux; varying vec4 vMat; varying vec2 vAux; varying vec3 vWP; varying vec3 vWN;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal); vMat = matw; vAux = aux;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\n' + ROCK_PARS).replace('#include <color_fragment>', ROCK_COLOR)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = bbRough;').replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = bbPerturb(-vViewPosition, normal, bbH);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += bbEmis;');
  };
  m.userData.U = U; return m;
}
// Alle Felsblöcke: neu bauen, was sich geändert hat (höchstens budget Blöcke je Bild). Dazu Glutstellen und Zielumrisse.
export function createRock(scene, A, { shadows = true } = {}) {
  const mat = rockMaterial(); const U = mat.userData.U; const meshes = new Map(); const group = new THREE.Group(); scene.add(group); let hi = 0; let last = -1;
  function build(c) {
    const r = meshChunk(A, c); const old = meshes.get(c); if (old) { group.remove(old); old.geometry.dispose(); meshes.delete(c); } if (!r) return;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(r.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(r.nrm, 3)); g.setAttribute('matw', new THREE.BufferAttribute(r.mat, 4, true)); g.setAttribute('aux', new THREE.BufferAttribute(r.aux, 2)); g.setIndex(new THREE.BufferAttribute(r.idx, 1)); g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = shadows; mesh.receiveShadow = true; group.add(mesh); meshes.set(c, mesh);
  }
  const R = { group, mat, meshes, t: 0,
    all() { A.dirty.clear(); for (let c = 0; c < CN * CN * CN; c++) build(c); },
    update(budget = 6) { let n = 0; for (const c of A.dirty) { A.dirty.delete(c); build(c); if (++n >= budget) break; } return n; },
    tris() { let t = 0; for (const m of meshes.values()) t += m.geometry.index.count / 3; return t; },
    setTime(t) { R.t = t; U.uTime.value = t; },
    // Glut: frische Schnittfläche leuchtet nach und kühlt ab. kind 0 orange, 1 violett (Schwarzes Loch), 2 pink (Laser)
    heat(x, y, z, r, life = 5, kind = 0, k = 1) {
      if (last >= 0) { const h = U.uHot.value[last]; const b = U.uHotB.value[last]; if (b.z === kind && R.t - b.x < 0.6 && Math.hypot(h.x - x, h.y - y, h.z - z) < 0.4 && Math.abs(h.w - r) < 0.3) { b.x = R.t; b.y = life; return; } }
      let best = 0; let bt = Infinity; for (let i = 0; i < HN; i++) { const b = U.uHotB.value[(hi + i) % HN]; const left = b.w <= 0 ? -1 : b.x + b.y - R.t; if (left < bt) { bt = left; best = (hi + i) % HN; if (left < 0) break; } }
      U.uHot.value[best].set(x, y, z, r); U.uHotB.value[best].set(R.t, life, kind, k); last = best; hi = (best + 1) % HN;
    },
    mark(i, x, y, z, r, color, k = 1) { U.uMark.value[i].set(x, y, z, r); const c = new THREE.Color(color); U.uMarkC.value[i].set(c.r, c.g, c.b, k); },
    unmark(i) { U.uMark.value[i].w = 0; },
    dispose() { scene.remove(group); for (const m of meshes.values()) m.geometry.dispose(); meshes.clear(); mat.dispose(); },
  };
  return R;
}

// ---------------- Lose Steine, Eiskristalle, Nuggets auf der Oberfläche ----------------
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
export function rockGeo(seed = 1) { let g = new THREE.IcosahedronGeometry(1, 2); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i); const f = 0.74 + 0.2 * Math.sin(x * 2.3 + seed) * Math.sin(y * 2.9 + seed * 1.7) + 0.14 * Math.sin(z * 3.7 + x * 1.9 + seed * 0.6) + 0.16 * hash3(Math.round(x * 2) + seed, Math.round(y * 2), Math.round(z * 2) - seed); p.setXYZ(i, x * f, y * f * 0.7, z * f * 0.92); } g.computeVertexNormals(); return g; }
export function shardGeo() { const g = new THREE.ConeGeometry(0.5, 2, 5, 1).toNonIndexed(); g.translate(0, 1, 0); g.computeVertexNormals(); return g; }
export function nuggetGeo() { let g = new THREE.IcosahedronGeometry(1, 2); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-4); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i); const f = 0.78 + 0.2 * Math.sin(x * 4.1 + 1) * Math.sin(y * 3.7 + 2) + 0.16 * Math.sin(z * 5.3 + y * 2) + 0.1 * Math.sin(x * 9 + z * 7); p.setXYZ(i, x * f, y * f * 0.8, z * f); } g.computeVertexNormals(); return g; }
// Felsmuster für lose Brocken: Flecken, Körnung und Buckel aus derselben Textur wie der Boden
function rockLook(m) {
  m.onBeforeCompile = (s) => { s.uniforms.uGr = { value: detailTexture() };
    s.vertexShader = s.vertexShader.replace(`#include <common>`, `#include <common>
varying vec3 vRP; varying vec3 vRN;`).replace(`#include <fog_vertex>`, `#include <fog_vertex>
vRP = transformed * 0.9 + vec3(float(gl_InstanceID) * 0.37); vRN = normalize(objectNormal);`);
    s.fragmentShader = s.fragmentShader.replace(`#include <common>`, `#include <common>
uniform sampler2D uGr; varying vec3 vRP; varying vec3 vRN;
vec3 rkPerturb(vec3 sp, vec3 sn, float h) { vec3 sx = dFdx(sp); vec3 sy = dFdy(sp); vec3 r1 = cross(sy, sn); vec3 r2 = cross(sn, sx); float det = dot(sx, r1); vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2); return normalize(abs(det) * sn - g); }`)
      .replace(`#include <color_fragment>`, `#include <color_fragment>
vec3 rW = pow(abs(vRN), vec3(4.0)); rW /= (rW.x + rW.y + rW.z + 1e-4); vec4 rT = texture2D(uGr, vRP.zy * 0.9) * rW.x + texture2D(uGr, vRP.xz * 0.9) * rW.y + texture2D(uGr, vRP.xy * 0.9) * rW.z; diffuseColor.rgb *= (0.6 + 0.75 * rT.r) * (0.8 + 0.4 * rT.b) * mix(0.45, 1.0, smoothstep(0.0, 0.5, rT.g));`)
      .replace(`#include <normal_fragment_maps>`, `#include <normal_fragment_maps>
normal = rkPerturb(-vViewPosition, normal, rT.r * 0.05);`); };
  return m;
}
export const MATS_FX = {
  rock: () => rockLook(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0, envMapIntensity: 0.3 })),
  ice: () => new THREE.MeshStandardMaterial({ color: 0x79c6ff, roughness: 0.12, metalness: 0, emissive: 0x1d5fb8, emissiveIntensity: 0.6, envMapIntensity: 1.4 }),
  gold: () => new THREE.MeshStandardMaterial({ color: 0xffb21e, roughness: 0.26, metalness: 0.85, emissive: 0x8a5200, emissiveIntensity: 0.55, envMapIntensity: 1.6 }),
};
// onRemove(kind 'rock' | 'ice' | 'gold', position, size) meldet weggebaggerte Stücke (fliegen dann als Brocken davon)
export function createProps(scene, A, onRemove) {
  const r = rng(A.seed * 97 + 3); const list = []; const hash = new Map(); const key = (x, y, z) => ((Math.floor(x / 4) + 40) << 14) | ((Math.floor(y / 4) + 40) << 7) | (Math.floor(z / 4) + 40);
  const want = { rock0: [], rock1: [], rock2: [], ice: [], gold: [] }; const dir = new THREE.Vector3(); const p = new THREE.Vector3(); const n = { x: 0, y: 1, z: 0 }; const nv = new THREE.Vector3(); const q = new THREE.Quaternion(); const q2 = new THREE.Quaternion(); const Y = new THREE.Vector3(0, 1, 0); const sc = new THREE.Vector3(); const e = new THREE.Euler();
  for (let i = 0; i < 26000; i++) {
    const u = r() * 2 - 1; const a = r() * Math.PI * 2; const s = Math.sqrt(1 - u * u); dir.set(s * Math.cos(a), u, s * Math.sin(a)); const pick = r(); const sz = r(); const rot = [r(), r(), r(), r(), r()];
    let t0 = 18; let t1 = 70; for (let k = 0; k < 13; k++) { const t = (t0 + t1) / 2; if (A.depth0(dir.x * t, dir.y * t, dir.z * t) > 0) t0 = t; else t1 = t; }
    p.copy(dir).multiplyScalar(t0); if (Math.abs(A.dist(p.x, p.y, p.z)) > 0.5) continue; // dort ist schon gebaggert
    const mt = A.matAtPos(p.x - dir.x * 0.45, p.y - dir.y * 0.45, p.z - dir.z * 0.45); A.normal(p.x, p.y, p.z, n); nv.set(n.x, n.y, n.z);
    if (mt === MAT.EIS) { if (pick > 0.42 || want.ice.length > 2400) continue; const cnt = 2 + Math.floor(sz * 4); for (let c = 0; c < cnt; c++) { const hgt = 0.25 + r() * r() * 1.1; const tilt = r() * 0.75; const az = r() * 6.283; e.set(Math.sin(az) * tilt, r() * 6.283, Math.cos(az) * tilt); q.setFromUnitVectors(Y, nv); q2.setFromEuler(e); q.multiply(q2); const off = 0.15 + r() * 0.5; const oa = r() * 6.283; const px = p.x + Math.cos(oa) * off * (1 - Math.abs(nv.x)); const py = p.y + Math.sin(oa) * off * (1 - Math.abs(nv.y)); const pz = p.z + Math.cos(oa + 2) * off * (1 - Math.abs(nv.z)); want.ice.push({ kind: 'ice', x: px - nv.x * 0.12, y: py - nv.y * 0.12, z: pz - nv.z * 0.12, q: q.clone(), s: [0.1 + hgt * 0.14, hgt * 0.5, 0.1 + hgt * 0.14], size: hgt * 0.5 }); } }
    else if (mt === MAT.GOLD) { if (pick > 0.36) continue; const size = 0.1 + sz * sz * 0.34; e.set(rot[0] * 6, rot[1] * 6, rot[2] * 6); q.setFromEuler(e); want.gold.push({ kind: 'gold', x: p.x + nv.x * size * 0.3, y: p.y + nv.y * size * 0.3, z: p.z + nv.z * size * 0.3, q: q.clone(), s: [size, size, size], size }); }
    else if (mt === MAT.GESTEIN || mt === MAT.EISEN) { if (pick > 0.115) continue; const size = 0.06 + sz * sz * sz * 0.6; e.set(rot[0] * 6, rot[1] * 6, rot[2] * 6); q.setFromUnitVectors(Y, nv); q2.setFromEuler(e); q.multiply(q2); const tint = mt === MAT.EISEN ? [0.34, 0.11, 0.07] : [0.4, 0.34, 0.26]; const sh = 0.75 + rot[3] * 0.5; want['rock' + (i % 3)].push({ kind: 'rock', x: p.x + nv.x * size * 0.25, y: p.y + nv.y * size * 0.25, z: p.z + nv.z * size * 0.25, q: q.clone(), s: [size * (0.8 + rot[4] * 0.5), size, size * (0.8 + rot[3] * 0.4)], size, col: [tint[0] * sh, tint[1] * sh, tint[2] * sh] }); }
  }
  const group = new THREE.Group(); scene.add(group); const m4 = new THREE.Matrix4(); const col = new THREE.Color(); const ZERO = new THREE.Matrix4().makeScale(0, 0, 0); const dirty = new Set();
  const make = (arr, geo, mat, shadow) => { if (!arr.length) return; const im = new THREE.InstancedMesh(geo, mat, arr.length); arr.forEach((o, i) => { p.set(o.x, o.y, o.z); sc.set(o.s[0], o.s[1], o.s[2]); m4.compose(p, o.q, sc); im.setMatrixAt(i, m4); if (o.col) { col.setRGB(o.col[0], o.col[1], o.col[2]); im.setColorAt(i, col); } o.im = im; o.i = i; o.alive = true; delete o.q; list.push(o); const k = key(o.x, o.y, o.z); let b = hash.get(k); if (!b) hash.set(k, b = []); b.push(o); }); im.castShadow = shadow; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; im.computeBoundingSphere(); group.add(im); };
  make(want.rock0, rockGeo(1), MATS_FX.rock(), true); make(want.rock1, rockGeo(5), MATS_FX.rock(), true); make(want.rock2, rockGeo(9), MATS_FX.rock(), true); make(want.ice, shardGeo(), MATS_FX.ice(), false); make(want.gold, nuggetGeo(), MATS_FX.gold(), true);
  const P = { group, count: list.length, counts: { rock: want.rock0.length + want.rock1.length + want.rock2.length, ice: want.ice.length, gold: want.gold.length },
    // Alles im Umkreis der Abbau-Kugel verschwindet (und fliegt als Brocken davon)
    // Dazu (2026-11-13, Lennox: „viele Fitzel hängen in der Luft“): Steine am Rand, unter denen kein Fels mehr ist, fallen mit weg
    dig(x, y, z, rad) { const R = rad + 2.5; let n2 = 0; for (let cz = Math.floor((z - R) / 4); cz <= Math.floor((z + R) / 4); cz++) for (let cy = Math.floor((y - R) / 4); cy <= Math.floor((y + R) / 4); cy++) for (let cx = Math.floor((x - R) / 4); cx <= Math.floor((x + R) / 4); cx++) { const b = hash.get(((cx + 40) << 14) | ((cy + 40) << 7) | (cz + 40)); if (!b) continue; for (const o of b) { if (!o.alive) continue; const d = Math.hypot(o.x - x, o.y - y, o.z - z); if (d > R) continue; if (d > rad + o.size * 0.5) { const l = Math.hypot(o.x, o.y, o.z) || 1; if (A.raycast(o.x, o.y, o.z, -o.x / l, -o.y / l, -o.z / l, 0.45 + o.size)) continue; } /* Strahl Richtung Mitte: liegt der Stein noch auf Fels? */ o.alive = false; o.im.setMatrixAt(o.i, ZERO); dirty.add(o.im); n2++; if (onRemove) onRemove(o, n2); } } for (const im of dirty) im.instanceMatrix.needsUpdate = true; dirty.clear(); return n2; },
    dispose() { scene.remove(group); for (const c of group.children) { c.geometry.dispose(); c.material.dispose(); } },
  };
  return P;
}

// ---------------- Weltall: Sterne, Sonne, Erde mit Mond, Licht, Spiegelungen ----------------
export function buildSpace(scene, renderer, { shadows = true, shadowSize = 2048 } = {}) {
  const sky = new THREE.Group(); scene.add(sky);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false })); dome.renderOrder = -10; dome.frustumCulled = false; sky.add(dome);
  const eM = new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.7, metalness: 0, emissive: 0x0a1426, emissiveIntensity: 0.2, envMapIntensity: 0 });
  eM.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.0); gl_FragColor.rgb += vec3(0.22, 0.45, 1.0) * rim * 0.8;'); };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(62, 64, 40), eM); earth.position.copy(EARTH_DIR).multiplyScalar(1150); earth.rotation.set(0.32, -1.68, 0.12); sky.add(earth);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x4a8cff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); halo.scale.set(190, 190, 1); halo.position.copy(earth.position).multiplyScalar(1.01); halo.renderOrder = -9; sky.add(halo);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 20, 14), new THREE.MeshStandardMaterial({ color: 0xb8b6b0, roughness: 1, envMapIntensity: 0 })); moon.position.copy(earth.position).add(new THREE.Vector3(60, 150, -210)); sky.add(moon);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), color: new THREE.Color(3.2, 3.0, 2.7), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); sunSpr.scale.set(520, 520, 1); sunSpr.position.copy(SUN_DIR).multiplyScalar(1400); sunSpr.renderOrder = -8; sky.add(sunSpr);
  const sun = new THREE.DirectionalLight(0xfff0dc, 3.6); sun.castShadow = shadows; sun.shadow.mapSize.set(shadowSize, shadowSize); const sc = sun.shadow.camera; sc.left = -42; sc.right = 42; sc.top = 42; sc.bottom = -42; sc.near = 1; sc.far = 260; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; scene.add(sun); scene.add(sun.target);
  const fill = new THREE.HemisphereLight(0x7f96c8, 0x4a3c2e, 0.16); scene.add(fill);
  const earthLight = new THREE.DirectionalLight(0x6f9fff, 0.3); scene.add(earthLight); scene.add(earthLight.target);
  // Spiegelungen: kleines Abbild der Umgebung (draußen: Sonne, Erde, Felsboden; drinnen: helle Decke)
  const pm = new THREE.PMREMGenerator(renderer); const mk = (items, bg) => { const s = new THREE.Scene(); s.background = new THREE.Color(bg); for (const [geo, color, pos] of items) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color[0], color[1], color[2]), side: THREE.DoubleSide })); m.position.copy(pos); m.lookAt(0, 0, 0); s.add(m); } const t = pm.fromScene(s, 0.04).texture; s.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); return t; };
  const envOut = mk([[new THREE.CircleGeometry(9, 24), [40, 37, 32], SUN_DIR.clone().multiplyScalar(60)], [new THREE.CircleGeometry(14, 24), [0.35, 0.7, 1.6], EARTH_DIR.clone().multiplyScalar(60)], [new THREE.CircleGeometry(70, 24), [0.42, 0.36, 0.28], new THREE.Vector3(0, -40, 0)]], 0x020308);
  const envIn = mk([[new THREE.PlaneGeometry(60, 60), [2.4, 2.4, 2.5], new THREE.Vector3(0, 30, 0)], [new THREE.PlaneGeometry(80, 40), [0.5, 0.52, 0.56], new THREE.Vector3(40, 0, 0)], [new THREE.PlaneGeometry(80, 40), [0.5, 0.52, 0.56], new THREE.Vector3(-40, 0, 0)], [new THREE.PlaneGeometry(80, 40), [0.6, 0.5, 0.42], new THREE.Vector3(0, 0, 40)], [new THREE.PlaneGeometry(80, 40), [0.45, 0.5, 0.6], new THREE.Vector3(0, 0, -40)], [new THREE.PlaneGeometry(60, 60), [0.12, 0.12, 0.14], new THREE.Vector3(0, -30, 0)]], 0x101216);
  pm.dispose(); scene.environment = envOut;
  const S = { sky, earth, halo, sun, fill, earthLight, sunSpr, envOut, envIn, inside: false };
  // Erde wird mit jedem Tag größer (Tag 1: klein, Tag 90: riesig)
  S.setDay = (dayF) => { const k = Math.min(1, Math.max(0, (dayF - 1) / 89)); const s = 0.8 + 5.2 * Math.pow(k, 1.6); earth.scale.setScalar(s); halo.scale.set(190 * s, 190 * s, 1); earth.rotation.y = -1.68 + dayF * 0.05; };
  // jedes Bild: Himmel folgt der Kamera, Schattenkamera dem Spieler. Drinnen kommt das Hauptlicht von der Decke.
  S.follow = (cam, focus, inside) => {
    sky.position.copy(cam.position);
    if (inside !== S.inside) { S.inside = inside; scene.environment = inside ? envIn : envOut; sun.color.set(inside ? 0xe6edff : 0xfff0dc); sun.intensity = inside ? 1.5 : 3.6; fill.intensity = inside ? 0.5 : 0.16; fill.color.set(inside ? 0xcfd8e8 : 0x7f96c8); fill.groundColor.set(inside ? 0x3a3c42 : 0x4a3c2e); earthLight.intensity = inside ? 0 : 0.3; const c = sun.shadow.camera; const e = inside ? 14 : 42; c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.far = inside ? 60 : 260; c.updateProjectionMatrix(); }
    if (inside) { sun.position.set(INSIDE.x + 2.5, INSIDE.y + 30, INSIDE.z - 2); sun.target.position.set(INSIDE.x, INSIDE.y, INSIDE.z - 3.5); }
    else { sun.position.copy(focus).addScaledVector(SUN_DIR, 120); sun.target.position.copy(focus); earthLight.position.copy(focus).addScaledVector(EARTH_DIR, 100); earthLight.target.position.copy(focus); }
  };
  return S;
}

// ---------------- Raumschiff außen ----------------
export function buildShip(scene) {
  const m = buildModel('Raumschiff'); const g = new THREE.Group(); g.add(m.group); g.position.copy(SHIP); scene.add(g);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x5ae0ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide, toneMapped: false }); // nur von außen sichtbar: wer im Strahl steht, sieht keinen Schleier
  const geo = new THREE.CylinderGeometry(1.1, 2.6, 1, 28, 1, true); geo.translate(0, -0.5, 0); const beam = new THREE.Mesh(geo, beamMat); beam.position.set(0, -2.9, 2); g.add(beam); beam.frustumCulled = false;
  for (const side of ['L', 'R']) { const p = m.parts['RS_Schild_' + side]; if (!p) continue; const s = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), new THREE.MeshBasicMaterial({ map: signTexture('TS-1', { w: 512, h: 168, bg: null, fg: '#1c2a44', accent: null, font: '900 150px Bahnschrift, sans-serif' }), transparent: true, toneMapped: true })); p.add(s); s.position.z = 0.03; }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(2.5, 1.2, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.scale.setScalar(9); glow.position.set(0, -0.2, 10.6); g.add(glow);
  // Lichter am Schiff (nur draußen an): Flutlicht nach unten, warmes Streulicht vom Fels auf den Bauch
  const lights = new THREE.Group(); g.add(lights); const flood = new THREE.SpotLight(0xdff4ff, 900, 80, 0.5, 0.7, 1.6); flood.position.set(0, -3, 2); flood.target.position.set(0, -40, 2); lights.add(flood, flood.target);
  const bounce = new THREE.PointLight(0xffd9b0, 260, 40, 1.4); bounce.position.set(0, -12, 0); lights.add(bounce);
  return { group: g, model: m, beam, beamMat, lights, luke: new THREE.Vector3(0, -2.9, 2).add(SHIP) };
}

// ---------------- Schiffsraum: Handelsdepot, Werkzeugwand, Missionstafel, Maschinenraum ----------------
// Hindernisse (x0, z0, x1, z1) im Raum, bezogen auf die Raummitte
export function insideBlocks(doorOpen) {
  const B = [[-9, -18, -7, 10], [7, -18, 9, 10], [-9, 9, 9, 11], [-9, -9.3, -1.3, -8.75], [1.3, -9.3, 9, -8.75], [-9, -18, 9, -16.5], [-7, -16.6, -5, -9.2], [5, -16.6, 7, -9.2],
    [5.2, -1.3, 7, 0.15], [4.05, 2.4, 7, 4.85], [4.75, 4.85, 7, 9], [5.4, -4.2, 7, -2.8], [5.3, -6.3, 7, -4.8], [4.5, -4.1, 5.5, -3.1], // Depot: Terminal, Trichter, Band, Kisten, Fässer
    [-7, -3.3, -6.25, 5.3], [-7, -7.8, -5.6, -4.4], [-6.5, 8.0, -3.3, 9], [-6.3, 7.0, -3.5, 7.6], [3.3, 8.2, 6.5, 9], [-6.3, -8.9, -2.6, -7.75], [2.8, -8.9, 6.4, -8.1], [-4.8, -7.55, -4.1, -6.85], // Werkzeugschränke, Bank, Spinde, Flaschen, Pult, Regal, Stuhl
    [-3.1, 5.4, -1.85, 6.8], [-4.1, 5.4, -3.1, 6.4], [2.0, 6.2, 2.7, 6.9], [2.2, -7.0, 3.0, -6.2], // Kisten, Sackkarre, Kabeltrommel
    [-1.7, -16.1, 1.7, -12.7], [-4.2, -12.8, -3.0, -10.4], [2.6, -12.8, 4.4, -11.0], [3.8, -10.3, 4.8, -9.7], [-4.7, -16.3, -3.2, -15.3], [3.6, -16.2, 4.8, -15.2]]; // Reaktor, Orbit-Konsole, Laserverschluss, Schrank, Fässer, Kiste
  if (!doorOpen) B.push([-1.3, -9.3, 1.3, -8.75]); return B;
}
export function buildInside(scene) {
  const m = buildModel('Schiffsraum'); m.group.position.copy(INSIDE); scene.add(m.group); const parts = m.parts;
  if (parts.SR_Decke) parts.SR_Decke.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  const glas = matByName('BB_Glas'); const wp = (name, out = new THREE.Vector3()) => { m.group.updateMatrixWorld(true); return parts[name].getWorldPosition(out); };
  if (glas) { glas.opacity = 0.14; glas.color.set(0xa8d4ff); glas.roughness = 0.05; glas.envMapIntensity = 1.6; } // Fensterglas klar, damit man Sterne und Erde sieht
  // Lichter aus den Ankern (SR_Licht_<Farbe>_...): W weiß, O orange, C cyan
  const lights = new THREE.Group(); scene.add(lights); const LC = { W: [0xf2f5ff, 34, 16], O: [0xffa55a, 26, 12], C: [0x7fe0ff, 16, 11] };
  for (const name of Object.keys(parts)) { const k = /^SR_Licht_([WOC])_/.exec(name); if (!k) continue; const [c, i, d] = LC[k[1]]; const l = new THREE.PointLight(c, i, d, 1.5); wp(name, l.position); lights.add(l); }
  // Bildschirme und Schilder (Leinwand)
  const plane = (name, w, h, map, o = {}) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, toneMapped: false, transparent: !!o.transparent, ...(o.color ? { color: o.color } : {}) })); parts[name].add(mesh); mesh.position.z = 0.012; return mesh; };
  const screen = (name, w, h, px = 512) => { const c = document.createElement('canvas'); c.width = px; c.height = Math.round(px * h / w); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; const mesh = plane(name, w, h, t, { color: new THREE.Color(1.25, 1.25, 1.25) }); return { canvas: c, tex: t, mesh }; };
  const term = screen('SR_Schirm_Terminal', 1.4, 0.86, 1024); const board = screen('SR_Schirm_Tafel', 3.7, 2.0, 1024); const prices = screen('SR_Schirm_Preise', 1.75, 1.1, 512); const orbit = screen('SR_Schirm_Orbit', 1.55, 0.82, 512);
  plane('SR_Schild_Depot', 4.4, 0.7, signTexture('HANDELSDEPOT', { sub: 'ERZANNAHME · TERMINAL 03' })); plane('SR_Schild_Maschine', 2.5, 0.44, signTexture('MASCHINENRAUM', { h: 180 })); plane('SR_Schild_Schleuse', 2.2, 0.4, signTexture('LUFTSCHLEUSE', { h: 180, accent: '#3ae0ff' })); plane('SR_Schild_Werkzeug', 4.2, 0.44, signTexture('WERKZEUGE', { h: 110, font: '900 84px Bahnschrift, sans-serif' }));
  plane('SR_Schild_Boden', 3.2, 1.3, signTexture('TS-1', { w: 512, h: 208, bg: null, fg: 'rgba(230,200,60,.85)', accent: null, font: '900 170px Bahnschrift, sans-serif' }), { transparent: true });
  // Werkzeugwand: jedes Werkzeug hängt an seinem Platz (noch nicht gekauft: blaues Abbild)
  const holo = new THREE.MeshBasicMaterial({ color: 0x3ae0ff, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }); const wall = [];
  const WALL = [['hacke', 'Spitzhacke', [0, -0.5, 0.06], [0, 0, 0.5], 1.75], ['hammer', 'Schlaghammer', [0, -0.5, 0.1], [0, 0, 0.5], 1.75], ['bohrer', 'Bohrer', [0.3, 0.3, 0.12], [0, Math.PI / 2, 0], 2.3], ['laser', 'Laserschneider', [0.34, 0.3, 0.12], [0, Math.PI / 2, 0], 2.2], ['drohnen', 'Drohne', [0, 0.55, 0.22], [0.5, 0, 0], 2.4], ['loch', 'Loch_Kapsel', [0, 0.55, 0.2], [0, 0, 0], 3.6], ['orbit', 'Zielgeraet', [0, 0.35, 0.16], [0, Math.PI, 0], 3.0]];
  WALL.forEach(([id, model, off, rot, s], i) => { const slot = parts['SR_Wand_' + (7 - i)]; if (!slot) return; const real = buildModel(model, { shadow: false }); const ghost = buildModel(model, { shadow: false, mat: holo }); for (const g of [real.group, ghost.group]) { g.position.set(off[0], off[1], off[2]); g.rotation.set(rot[0], rot[1], rot[2]); g.scale.setScalar(s); slot.add(g); }
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3a2a, toneMapped: false })); led.position.set(0, 1.5, 0.02); slot.add(led);
    const c = document.createElement('canvas'); c.width = 256; c.height = 44; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.148), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: new THREE.Color(1.7, 1.7, 1.7) })); lab.position.set(0, -0.57, -0.135); slot.add(lab); wall.push({ id, real: real.group, ghost: ghost.group, led, canvas: c, tex: t, state: null }); });
  // Erz im Trichter und auf dem Band (kleine Brocken, Farbe je Sorte)
  const ORE = 90; const ore = new THREE.InstancedMesh(rockGeo(3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.2, envMapIntensity: 1 }), ORE); ore.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ore.frustumCulled = false; ore.castShadow = false; const zero = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < ORE; i++) { ore.setMatrixAt(i, zero); ore.setColorAt(i, new THREE.Color(1, 1, 1)); } scene.add(ore);
  const I = { model: m, parts, lights, term, board, prices, orbit, wall, ore, ORE, doorL: parts.SR_Tuer_L, doorR: parts.SR_Tuer_R, rings: [parts.SR_Reaktor_Ring_1, parts.SR_Reaktor_Ring_2], lamp: matByName('BB_Tuerlampe'), charge: matByName('BB_Laser_Ladung'), plasma: matByName('BB_Reaktor_Plasma'),
    spots: { term: wp('SR_Terminal').clone(), hopper: wp('SR_Trichter').clone(), lock: wp('SR_Schleuse').clone(), orbit: wp('SR_Orbit').clone(), spawn: wp('SR_Start').clone(), bandA: wp('SR_Band_A').clone(), bandB: wp('SR_Band_B').clone(), wall: new THREE.Vector3(-5.6, 0, 1).add(INSIDE) } };
  return I;
}

// ---------------- Werkzeug vor der Kamera ----------------
export function buildHand(cam) {
  const holder = new THREE.Group(); cam.add(holder); const tools = {}; const fill = new THREE.PointLight(0xfff2e4, 0.55, 2.6, 1.5); fill.position.set(0.05, 0.3, 0.3); cam.add(fill);
  for (const name of ['Spitzhacke', 'Schlaghammer', 'Bohrer', 'Laserschneider', 'Bake', 'Loch_Kapsel', 'Zielgeraet', 'Sprengladung', 'Plasmawerfer', 'Antimaterie']) { const m = buildModel(name, { shadow: false, receive: false }); m.group.visible = false; holder.add(m.group); tools[name] = m; }
  // Lage je Werkzeug: Stiele schräg nach vorn oben, Geräte wie eine Pistole
  const POSE = { Spitzhacke: [0.42, -0.78, -0.78, -0.35, 0.3, -0.25], Schlaghammer: [0.44, -0.8, -0.8, -0.3, 0.3, -0.2], Bohrer: [0.3, -0.38, -0.7, 0, 0.05, 0], Laserschneider: [0.3, -0.37, -0.68, 0, 0.05, 0], Bake: [0.34, -0.5, -0.8, 0, 0, 0], Loch_Kapsel: [0.3, -0.34, -0.72, 0, 0, 0], Zielgeraet: [0.24, -0.34, -0.6, 0.85, 0, 0], Sprengladung: [0.3, -0.46, -0.7, 0.25, 0.5, 0], Plasmawerfer: [0.34, -0.42, -0.76, 0, 0.05, 0], Antimaterie: [0.3, -0.36, -0.72, 0.3, 0, 0] };
  return { holder, tools, POSE, fill };
}
// Bilder der Werkzeuge fürs Terminal und die Leiste (einmal gerendert, als Daten-URL)
export function toolIcons(renderer, names, size = 256) {
  const out = {}; const big = size * 2; const rt = new THREE.WebGLRenderTarget(big, big, { type: THREE.UnsignedByteType, colorSpace: THREE.SRGBColorSpace }); const s = new THREE.Scene(); const key = new THREE.DirectionalLight(0xffffff, 6.5); key.position.set(2, 3, 4); const rim = new THREE.DirectionalLight(0x7fd8ff, 4.5); rim.position.set(-3, 1.5, -2); s.add(key, rim, new THREE.HemisphereLight(0xeef2ff, 0x6a5a4a, 3.4));
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 50); const box = new THREE.Box3(); const c = new THREE.Vector3(); const sz = new THREE.Vector3(); const buf = new Uint8Array(big * big * 4); const cb = document.createElement('canvas'); cb.width = cb.height = big; const xb = cb.getContext('2d'); const cv = document.createElement('canvas'); cv.width = cv.height = size; const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; const prev = renderer.getRenderTarget(); const pc = new THREE.Color(); renderer.getClearColor(pc); const pa = renderer.getClearAlpha(); const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
  for (const name of names) { const m = buildModel(name, { shadow: false }); s.add(m.group); m.group.rotation.set(0, name === 'Spitzhacke' || name === 'Schlaghammer' ? -0.5 : -1.05, name === 'Spitzhacke' || name === 'Schlaghammer' ? -0.5 : 0); m.group.updateMatrixWorld(true); box.setFromObject(m.group); box.getCenter(c); box.getSize(sz); const r = Math.max(sz.x, sz.y, sz.z) * 0.58; cam.left = -r; cam.right = r; cam.top = r; cam.bottom = -r; cam.updateProjectionMatrix(); cam.position.set(c.x + 3, c.y + 2.2, c.z + 6); cam.lookAt(c);
    renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(s, cam); renderer.readRenderTargetPixels(rt, 0, 0, big, big, buf); const img = xb.createImageData(big, big); for (let j = 0; j < big; j++) img.data.set(buf.subarray((big - 1 - j) * big * 4, (big - j) * big * 4), j * big * 4); xb.putImageData(img, 0, 0); x.clearRect(0, 0, size, size); x.drawImage(cb, 0, 0, size, size); out[name] = cv.toDataURL('image/png'); s.remove(m.group); }
  renderer.setRenderTarget(prev); renderer.setClearColor(pc, pa); renderer.toneMapping = tm; rt.dispose(); return out;
}
// Mitspieler als Astronaut (aus Moonsweeper), aufgerichtet nach der Schwerkraft
export function buildBuddy(scene, seat) {
  const R = buildAstronaut({ accent: ACCENTS[seat % 4], stripe: ACCENTS[seat % 4] }); const holder = new THREE.Group(); holder.add(R.root); scene.add(holder);
  return { R, holder, pose: (st, dt) => poseAstronaut(R, st, dt) };
}
