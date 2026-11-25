// Theos Seitenscheidel - Moonsweeper 2: Grafik. Alles wird im Spiel selbst erzeugt (keine Dateien): Himmel, Erde, Boden mit Staubschicht, Station, Händler, Fahrzeuge, Astronaut.
// Lackierungen (Streifen, Fenster, Lüftungsgitter) sind Fragment-Shader auf der Karosserie (paint): scharfe Kanten auf runden Formen ohne Texturen.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries, mergeVertices } from './vendor/BufferGeometryUtils.js';
import { STATION, CHUNK_SIZE } from './moonlogic.js';

export const SUN_DIR = new THREE.Vector3(0.48, 0.33, 0.81).normalize();
const EARTH_DIR = new THREE.Vector3(-0.52, 0.27, -0.81).normalize();
const WHITE = 0xf2f1ef; const ORANGE = 0xee7a18; const NAVY = 0x1b2130; const STEEL = 0x8f959e; const TYRE = 0x15161a;
export const std = (color, roughness = 0.45, metalness = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
export const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
export const box = (w, h, d, mat, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
export const cyl = (r0, r1, h, mat, x = 0, y = 0, z = 0, seg = 24) => mesh(new THREE.CylinderGeometry(r0, r1, h, seg), mat, x, y, z);
export const sph = (r, mat, x = 0, y = 0, z = 0, seg = 24) => mesh(new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.7)), mat, x, y, z);
export const shadows = (o, cast = true, recv = true) => { o.traverse((c) => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; };

// ---------------- Lack per Shader ----------------
const GLSL_LIB = `
float sdRR(vec2 p, vec2 c, vec2 h, float r) { vec2 d = abs(p - c) - h + r; return length(max(d, 0.)) + min(max(d.x, d.y), 0.) - r; }
float inside(float d) { float w = fwidth(d) + 1e-4; return 1. - smoothstep(-w, w, d); }
float band(float v, float a, float b) { float w = fwidth(v) + 1e-4; return smoothstep(a - w, a + w, v) * (1. - smoothstep(b - w, b + w, v)); }
vec3 C(float r, float g, float b) { return pow(vec3(r, g, b) / 255., vec3(2.2)); }
`;
export function paint(opts, glsl) {
  const m = new THREE.MeshStandardMaterial(opts); m.userData.painted = true;
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vP; varying vec3 vN0;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvP = position; vN0 = normal;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vP; varying vec3 vN0;\n${GLSL_LIB}`).replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n{ vec3 P = vP; vec3 N = normalize(vN0); vec3 col = diffuseColor.rgb; float rough = roughnessFactor; float metal = metalnessFactor;\n${glsl}\n diffuseColor.rgb = col; roughnessFactor = rough; metalnessFactor = metal; }`);
  };
  m.customProgramCacheKey = () => glsl; return m;
}
// Karosserie aus Querschnitten (Superellipsen): fn(t) -> { z, w, y0, y1, n }, geschlossene Enden, vorn = +z
export function loft(fn, ts, na = 44) {
  const pos = []; const idx = []; const rows = ts.length;
  for (const t of ts) { const s = fn(t); const ex = 2 / (s.n || 5); const cy = (s.y0 + s.y1) / 2; const hh = (s.y1 - s.y0) / 2; for (let j = 0; j < na; j++) { const a = (j / na) * Math.PI * 2; const c = Math.cos(a); const q = Math.sin(a); pos.push((s.x || 0) + Math.sign(c) * Math.pow(Math.abs(c), ex) * s.w / 2, cy + Math.sign(q) * Math.pow(Math.abs(q), ex) * hh, s.z); } }
  for (let i = 0; i < rows - 1; i++) for (let j = 0; j < na; j++) { const a = i * na + j; const b = i * na + (j + 1) % na; const c = (i + 1) * na + j; const d = (i + 1) * na + (j + 1) % na; idx.push(a, b, c, b, d, c); }
  const avg = (r) => { let x = 0; let y = 0; let z = 0; for (let j = 0; j < na; j++) { const k = (r * na + j) * 3; x += pos[k]; y += pos[k + 1]; z += pos[k + 2]; } return [x / na, y / na, z / na]; };
  const c0 = pos.length / 3; pos.push(...avg(0)); const c1 = c0 + 1; pos.push(...avg(rows - 1));
  for (let j = 0; j < na; j++) { idx.push(c0, (j + 1) % na, j); idx.push(c1, (rows - 1) * na + j, (rows - 1) * na + (j + 1) % na); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Kastenform mit gerundeten Enden: Breite W, y0..y1, Länge L, r = Rundung der Enden, n = Eckigkeit
export function boxy(W, y0, y1, L, r = 0.3, n = 6, topOnly = false) {
  const ts = []; const k = 7; for (let i = 0; i <= k; i++) ts.push(i / k); for (let i = 1; i < 6; i++) ts.push(1 + i / 6); for (let i = 0; i <= k; i++) ts.push(2 + i / k);
  const fn = (u) => { let z; let e; if (u <= 1) { const th = u * Math.PI / 2; z = -L / 2 + r * (1 - Math.cos(th)); e = 1 - Math.sin(th); } else if (u < 2) { z = -L / 2 + r + (u - 1) * (L - 2 * r); e = 0; } else { const th = (u - 2) * Math.PI / 2; z = L / 2 - r + r * Math.sin(th); e = 1 - Math.cos(th); } return { z, w: W - 2 * r * e, y0: topOnly ? y0 : y0 + r * e, y1: y1 - r * e, n }; };
  return loft(fn, ts);
}
function bake(group) { // Teile gleichen Materials verschmelzen (weniger Zeichenaufrufe)
  group.updateMatrixWorld(true); const inv = group.matrixWorld.clone().invert(); const by = new Map(); const rm = [];
  group.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || o.userData.keep || o.material.userData.painted) return; const g = o.geometry.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); const ng = g.index ? g.toNonIndexed() : g; for (const n of Object.keys(ng.attributes)) if (n !== 'position' && n !== 'normal') ng.deleteAttribute(n); if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(ng); rm.push(o); });
  for (const o of rm) o.parent.remove(o);
  for (const [mat, list] of by) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = true; m.receiveShadow = true; group.add(m); }
  return group;
}

// ---------------- Schriftzüge ----------------
function logoTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 160; const x = c.getContext('2d'); x.fillStyle = '#ee7a18'; x.beginPath(); x.arc(78, 80, 58, 0, 7); x.fill(); x.fillStyle = '#1b2130'; x.beginPath(); x.arc(78, 80, 45, 0, 7); x.fill(); x.fillStyle = '#f2f1ef'; x.beginPath(); x.arc(92, 68, 34, 0, 7); x.fill(); x.fillStyle = '#1b2130'; x.beginPath(); x.arc(106, 58, 30, 0, 7); x.fill();
  x.fillStyle = '#1b2130'; x.font = '800 44px "Segoe UI", sans-serif'; x.fillText('LUNAR', 158, 62); x.font = '700 30px "Segoe UI", sans-serif'; x.fillText('SURFACE', 158, 98); x.fillText('DIVISION', 158, 132);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let logoTex = null;
function logo(w, h) { logoTex = logoTex || logoTexture(); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 })); m.userData.keep = true; return m; }
export function textSign(text, { w = 512, h = 128, bg = '#1b2130', fg = '#f2f1ef', font = '700 64px "Segoe UI", sans-serif', accent = '#ee7a18' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = accent; x.fillRect(0, h - 10, w, 10); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 - 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------- Himmel + Erde ----------------
function noise2(seed) { let a = seed; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; const N = 256; const t = new Float32Array(N * N); for (let i = 0; i < t.length; i++) t[i] = r(); const s = (x) => x * x * (3 - 2 * x); return (x, y) => { const X = Math.floor(x); const Y = Math.floor(y); const fx = s(x - X); const fy = s(y - Y); const g = (i, j) => t[((j & 255) << 8) + (i & 255)]; const a0 = g(X, Y); const b = g(X + 1, Y); const c = g(X, Y + 1); const d = g(X + 1, Y + 1); return a0 + (b - a0) * fx + (c - a0) * fy + (a0 - b - c + d) * fx * fy; }; }
const fbm = (n, x, y, o = 5) => { let v = 0; let a = 0.5; let f = 1; for (let i = 0; i < o; i++) { v += a * n(x * f, y * f); a *= 0.5; f *= 2.03; } return v; };
function skyTexture() {
  const W = 4096; const H = 2048; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); const img = x.createImageData(W / 4, H / 4); const n = noise2(7);
  for (let j = 0; j < H / 4; j++) for (let i = 0; i < W / 4; i++) { const u = i / (W / 4); const v = j / (H / 4); const cl = Math.sin(v * 3.1416); const sl = Math.cos(v * 3.1416); const qx = Math.cos(u * 6.283) * cl; const qy = Math.sin(u * 6.283) * cl; const f = fbm(n, qx * 2.6 + sl * 1.2 + 9, qy * 2.6 - sl * 2.1 + 5, 5); const g = Math.pow(Math.max(0, f * 1.6 - 0.45), 2.0); const f2 = fbm(n, qx * 5 + 3 + sl * 3, qy * 5 + 7 - sl * 4, 4); const k = g * (0.45 + f2 * 0.8); const p = (j * W / 4 + i) * 4; img.data[p] = 2 + k * 22; img.data[p + 1] = 3 + k * 54; img.data[p + 2] = 9 + k * 128; img.data[p + 3] = 255; }
  const tmp = document.createElement('canvas'); tmp.width = W / 4; tmp.height = H / 4; tmp.getContext('2d').putImageData(img, 0, 0); x.imageSmoothingQuality = 'high'; x.drawImage(tmp, 0, 0, W, H);
  let s = 11; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 5200; i++) { const px = r() * W; const py = r() * H; const b = r(); const R = b > 0.99 ? 2.1 : b > 0.92 ? 1.35 : 0.8; x.fillStyle = `rgba(${215 + r() * 40},${225 + r() * 30},255,${0.35 + r() * 0.65})`; x.beginPath(); x.ellipse(px, py, R, R, 0, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
const LAND = [
  [[-17, 15], [-16, 21], [-13, 27], [-10, 30], [-6, 35], [3, 37], [10, 37], [11, 33], [20, 32], [25, 32], [32, 31], [34, 27], [37, 21], [39, 15], [43, 12], [51, 12], [48, 5], [41, -2], [39, -8], [40, -15], [35, -20], [33, -26], [27, -34], [19, -35], [15, -27], [12, -17], [13, -8], [9, 1], [9, 4], [3, 6], [-4, 5], [-8, 4], [-13, 8]], // Afrika
  [[-9, 37], [-9, 43], [-1, 44], [-4, 48], [3, 51], [8, 54], [12, 54], [20, 55], [24, 59], [30, 60], [22, 61], [24, 66], [18, 62], [17, 58], [12, 56], [6, 58], [6, 62], [14, 68], [26, 71], [40, 66], [44, 68], [68, 69], [70, 73], [100, 77], [112, 74], [140, 73], [170, 69], [178, 65], [162, 60], [156, 52], [155, 59], [140, 54], [135, 44], [128, 39], [126, 35], [122, 40], [118, 38], [122, 30], [116, 22], [108, 21], [109, 12], [105, 9], [100, 13], [101, 3], [97, 8], [94, 16], [89, 22], [80, 14], [77, 8], [72, 20], [66, 25], [57, 26], [52, 29], [48, 30], [52, 24], [59, 22], [55, 16], [44, 12], [39, 21], [35, 28], [35, 36], [28, 36], [26, 40], [23, 38], [20, 40], [18, 42], [13, 45], [18, 40], [16, 38], [10, 44], [3, 43], [0, 39], [-5, 36]], // Eurasien
  [[-168, 65], [-156, 71], [-125, 70], [-95, 72], [-82, 68], [-94, 60], [-80, 52], [-78, 62], [-64, 60], [-56, 52], [-66, 45], [-75, 38], [-81, 31], [-81, 26], [-84, 30], [-97, 28], [-97, 20], [-90, 21], [-87, 16], [-83, 9], [-78, 8], [-85, 11], [-105, 20], [-112, 30], [-122, 38], [-124, 48], [-135, 58], [-152, 60], [-165, 55]], // Nordamerika
  [[-80, -4], [-77, 7], [-72, 12], [-60, 10], [-50, 1], [-35, -6], [-39, -15], [-41, -23], [-48, -28], [-57, -36], [-65, -42], [-69, -52], [-74, -50], [-73, -36], [-70, -18], [-76, -14]], // Südamerika
  [[-52, 61], [-42, 60], [-22, 70], [-18, 77], [-35, 83], [-60, 82], [-72, 77], [-55, 70]], // Grönland
  [[114, -22], [122, -17], [131, -12], [137, -12], [142, -11], [146, -19], [153, -27], [150, -37], [140, -38], [130, -32], [116, -34]], // Australien
  [[44, -16], [50, -14], [47, -25], [44, -24]], [[-5, 50], [1, 51], [-1, 54], [-3, 58], [-6, 57], [-4, 53]], [[-10, 52], [-6, 52], [-6, 55], [-9, 55]], [[-24, 64], [-14, 64], [-15, 66], [-22, 66]], [[130, 32], [136, 34], [141, 37], [141, 41], [137, 37]], [[95, 5], [105, -5], [115, -8], [117, 3], [110, 2]], [[120, 18], [122, 8], [126, 7], [124, 16]],
];
export function earthTexture() {
  const W = 1024; const H = 512; const mk = document.createElement('canvas'); mk.width = W; mk.height = H; const m = mk.getContext('2d', { willReadFrequently: true }); m.fillStyle = '#000'; m.fillRect(0, 0, W, H); m.fillStyle = '#fff';
  const px = (lon, lat) => [(lon + 180) / 360 * W, (90 - lat) / 180 * H];
  for (const poly of LAND) { m.beginPath(); poly.forEach((p, i) => { const [a, b] = px(p[0], p[1]); if (i) m.lineTo(a, b); else m.moveTo(a, b); }); m.closePath(); m.fill(); }
  m.fillRect(0, H - 34, W, 34); // Antarktis
  const mask = m.getImageData(0, 0, W, H).data; const n = noise2(23); const out = m.createImageData(W, H); const c = document.createElement('canvas'); c.width = W; c.height = H; const cx = c.getContext('2d');
  const land = (u, v) => { const i = (Math.min(H - 1, Math.max(0, v | 0)) * W + (((u | 0) + W) % W)) * 4; return mask[i] / 255; };
  for (let j = 0; j < H; j++) { const lat = 90 - (j / H) * 180; for (let i = 0; i < W; i++) {
    const nx = (i / W) * 26; const ny = (j / H) * 13; const wob = (fbm(n, nx, ny, 4) - 0.5) * 26; const wob2 = (fbm(n, nx + 40, ny + 9, 4) - 0.5) * 26; const L = land(i + wob, j + wob2); const k = fbm(n, nx * 3, ny * 3, 4);
    let r; let g; let b;
    if (L > 0.5) { const a = Math.abs(lat); const dry = Math.exp(-Math.pow((a - 24) / 10, 2)); const f = fbm(n, nx * 1.4 + 5, ny * 1.4, 5); const des = Math.min(1, dry * (0.8 + f * 1.1)); r = 58 + des * 158 + k * 30; g = 92 + des * 92 + k * 26; b = 44 + des * 62 + k * 14; if (a > 62) { const q = Math.min(1, (a - 62) / 10); r += (225 - r) * q; g += (232 - g) * q; b += (238 - b) * q; } }
    else { const d = fbm(n, nx * 0.7, ny * 0.7, 3); r = 8 + d * 18; g = 44 + d * 46; b = 110 + d * 70; }
    if (j > H - 36) { r = 236; g = 240; b = 246; }
    const sw = fbm(n, nx * 1.1 + Math.sin(ny * 1.1) * 1.6 + 17, ny * 2.2, 6); const cl = Math.min(1, Math.max(0, (sw - 0.5) * 7.5)) * 0.92; const p = (j * W + i) * 4; out.data[p] = r + (255 - r) * cl; out.data[p + 1] = g + (255 - g) * cl; out.data[p + 2] = b + (255 - b) * cl; out.data[p + 3] = 255;
  } }
  cx.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function buildSky() {
  const g = new THREE.Group(); const dome = new THREE.Mesh(new THREE.SphereGeometry(1150, 32, 20), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false })); dome.renderOrder = -10; g.add(dome);
  const eM = new THREE.MeshStandardMaterial({ map: earthTexture(), roughness: 0.75, metalness: 0, emissive: 0x0a1426, emissiveIntensity: 0.25, envMapIntensity: 0 });
  eM.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.2); gl_FragColor.rgb += vec3(0.25, 0.48, 1.0) * rim * 0.75;'); };
  const earth = new THREE.Mesh(new THREE.SphereGeometry(62, 48, 32), eM); earth.position.copy(EARTH_DIR).multiplyScalar(960); earth.rotation.set(0.32, -1.68, 0.12); g.add(earth);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color: 0x6fa8ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); halo.scale.set(172, 172, 1); halo.position.copy(earth.position).multiplyScalar(1.01); halo.renderOrder = -9; g.add(halo);
  g.userData.earth = earth; return g;
}
function haloTexture() { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 44, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
// Bergkette am Horizont: folgt dem Spieler, verdeckt das Ende des sichtbaren Mond-Ausschnitts
export function buildRidge() {
  const n = noise2(5); const seg = 360; const pos = []; const idx = [];
  for (let i = 0; i <= seg; i++) { const a = (i / seg) * Math.PI * 2; const h = (a2) => 12 + 74 * Math.pow(fbm(n, Math.cos(a2) * 3 + 5, Math.sin(a2) * 3 + 5, 6), 2.1); const t = h(a); for (const [r, y] of [[640, -60], [560, t * 0.72], [520, t], [492, t * 0.6], [462, -8]]) pos.push(Math.cos(a) * r, y, Math.sin(a) * r); }
  const rows = 5; for (let i = 0; i < seg; i++) for (let j = 0; j < rows - 1; j++) { const a = i * rows + j; const b = a + rows; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xa9a9bb, roughness: 1, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.3 })); m.frustumCulled = false; return m;
}

// ---------------- Boden ----------------
export function detailTexture() {
  const S = 1024; const R = new Float32Array(S * S); let a = 77; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; const toPx = S / 25.6;
  for (let i = 0; i < 1250; i++) { const cx = r() * S; const cz = r() * S; const b = r(); const rad = (0.04 + b * b * b * 0.36) * toPx; const dep = 0.3 + r() * 0.5; const q = Math.ceil(rad * 1.5); for (let y = -q; y <= q; y++) for (let x = -q; x <= q; x++) { const d = Math.hypot(x, y) / rad; if (d > 1.5) continue; const h = d < 1 ? (d * d - 1) * dep : 0.2 * dep * Math.pow((1.5 - d) / 0.5, 2) * (d >= 1 ? 1 : 0); const k = (((Math.floor(cz) + y) % S + S) % S) * S + ((Math.floor(cx) + x) % S + S) % S; R[k] += h; } }
  const n = noise2(3); const data = new Uint8Array(S * S * 4); const per = 12; const pn = (x, y, p) => { const X = x * p; const Y = y * p; const fx = X - Math.floor(X); const fy = Y - Math.floor(Y); const A = n(Math.floor(X) % p, Math.floor(Y) % p); const B = n((Math.floor(X) + 1) % p, Math.floor(Y) % p); const C = n(Math.floor(X) % p, (Math.floor(Y) + 1) % p); const D = n((Math.floor(X) + 1) % p, (Math.floor(Y) + 1) % p); const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy); return A + (B - A) * sx + (C - A) * sy + (A - B - C + D) * sx * sy; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4; const u = x / S; const v = y / S; data[i] = Math.max(0, Math.min(255, 150 + R[y * S + x] * 105)); data[i + 1] = 255 * (pn(u, v, per) * 0.5 + pn(u, v, per * 3) * 0.3 + pn(u, v, per * 9) * 0.2); data[i + 2] = 255 * (pn(u, v, per * 7) * 0.35 + pn(u, v, per * 21) * 0.3 + pn(u, v, per * 42) * 0.35); data[i + 3] = 255 * Math.pow(r(), 6); }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true; return t;
}
export function groundMaterial(mask, detail) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0, envMapIntensity: 0.25 });
  const U = { uMask: { value: mask }, uDetail: { value: detail }, uDust: { value: new THREE.Color(0xb3b2c4) }, uClean: { value: new THREE.Color(0xdcdce8) } };
  m.userData.U = U;
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aMoon; varying vec2 vMoon; varying vec2 vCUv;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMoon = aMoon; vCUv = (uv * 512.0 + 0.5) / 513.0;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uMask; uniform sampler2D uDetail; uniform vec3 uDust; uniform vec3 uClean; varying vec2 vMoon; varying vec2 vCUv; float gDustK; float gLip; float gMk;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec4 dn = texture2D(uDetail, vMoon / 25.6); vec4 lg = texture2D(uDetail, vMoon / 204.8 + 0.37); vec4 fine = texture2D(uDetail, vMoon / 6.4 + 0.11);
        float mk = texture2D(uMask, vCUv).r; gMk = mk; float jag = (dn.b - 0.5) * 0.16 + (fine.b - 0.5) * 0.14; float thr = smoothstep(0.4, 0.5, mk + jag * (0.15 + mk)); gDustK = thr;
        float castS = 0.0; if (thr < 0.995) { vec2 sunUv = vec2(0.51, 0.86) / 513.0; float wall = max(max(textureLod(uMask, vCUv + sunUv, 0.0).r, textureLod(uMask, vCUv + sunUv * 2.0, 0.0).r), textureLod(uMask, vCUv + sunUv * 3.4, 0.0).r); castS = clamp((wall - 0.45) * 3.0, 0.0, 1.0) * (1.0 - thr); }
        vec3 dustC = uDust * (0.84 + 0.34 * lg.g) * (0.92 + 0.16 * dn.g); vec3 cleanC = uClean * (0.965 + 0.06 * dn.g);
        gLip = smoothstep(0.0, 0.3, thr) * (1.0 - smoothstep(0.62, 1.0, thr));
        diffuseColor.rgb = mix(cleanC, dustC, thr); diffuseColor.rgb *= 1.0 - 0.34 * gLip; diffuseColor.rgb *= 1.0 - 0.6 * castS;
        float peb = smoothstep(0.62, 0.92, fine.a + gLip * 0.75); diffuseColor.rgb *= 1.0 - 0.45 * peb * thr;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float mL = 0.0; float mR = 0.0; float mU = 0.0; float mD = 0.0; if (gMk > 0.004 && gMk < 0.996) { vec2 stp = vec2(1.0 / 513.0, 0.0); mL = textureLod(uMask, vCUv - stp.xy, 0.0).r; mR = textureLod(uMask, vCUv + stp.xy, 0.0).r; mU = textureLod(uMask, vCUv - stp.yx, 0.0).r; mD = textureLod(uMask, vCUv + stp.yx, 0.0).r; }
          float e = 2.0 / 1024.0; vec2 q = vMoon / 25.6; float hL = texture2D(uDetail, q - vec2(e, 0.0)).r; float hR = texture2D(uDetail, q + vec2(e, 0.0)).r; float hU = texture2D(uDetail, q - vec2(0.0, e)).r; float hD = texture2D(uDetail, q + vec2(0.0, e)).r;
          vec2 q2 = vMoon / 6.4 + 0.11; float nL = texture2D(uDetail, q2 - vec2(e, 0.0)).b; float nR = texture2D(uDetail, q2 + vec2(e, 0.0)).b; float nU = texture2D(uDetail, q2 - vec2(0.0, e)).b; float nD = texture2D(uDetail, q2 + vec2(0.0, e)).b;
          vec2 g = vec2(mR - mL, mD - mU) * 2.4 + vec2(hR - hL, hD - hU) * (0.45 + 2.3 * gDustK) + vec2(nR - nL, nD - nU) * 0.55 * gDustK;
          vec3 vx = normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz); vec3 vz = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz); normal = normalize(normal - g.x * vx - g.y * vz); }`);
  };
  m.customProgramCacheKey = () => 'moon-ground-1'; return m;
}
export function chunkGeometry(cx, cz, heightFn, seg = 32) {
  const v = seg + 1; const pos = new Float32Array(v * v * 3); const nor = new Float32Array(v * v * 3); const uv = new Float32Array(v * v * 2); const moon = new Float32Array(v * v * 2); const S = CHUNK_SIZE; const st = S / seg; const idx = [];
  for (let j = 0; j < v; j++) for (let i = 0; i < v; i++) { const k = j * v + i; const x = cx + i * st; const z = cz + j * st; pos[k * 3] = i * st; pos[k * 3 + 1] = heightFn(x, z); pos[k * 3 + 2] = j * st; const e = 1.5; const nx = heightFn(x - e, z) - heightFn(x + e, z); const nz = heightFn(x, z - e) - heightFn(x, z + e); const l = Math.hypot(nx, 2 * e, nz); nor[k * 3] = nx / l; nor[k * 3 + 1] = 2 * e / l; nor[k * 3 + 2] = nz / l; uv[k * 2] = i / seg; uv[k * 2 + 1] = j / seg; moon[k * 2] = x; moon[k * 2 + 1] = z; }
  for (let j = 0; j < seg; j++) for (let i = 0; i < seg; i++) { const a = j * v + i; idx.push(a, a + v, a + 1, a + 1, a + v, a + v + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aMoon', new THREE.BufferAttribute(moon, 2)); g.setIndex(idx); g.computeBoundingSphere(); return g;
}
export function rockGeometries() { const out = []; for (let s = 0; s < 3; s++) { let g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-4); const p = g.attributes.position; const n = noise2(40 + s * 13); for (let i = 0; i < p.count; i++) { const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i); const k = 0.5 + fbm(n, x * 2.6 + 9 + s * 3, z * 2.6 + y * 2.6 + 9, 5) * 1.25; p.setXYZ(i, x * k * (1 + 0.3 * Math.sin(s * 2.1)), y * k * 0.62, z * k); } g = g.toNonIndexed(); g.computeVertexNormals(); out.push(g); } return out; }

// ---------------- Räder ----------------
function wheel(r, w, hub = 0x9ba1a9) {
  const g = new THREE.Group(); const tyreM = std(TYRE, 0.86); const pr = []; const n = 14; for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI; pr.push(new THREE.Vector2(r - 0.22 * r + Math.cos(a) * 0.22 * r * 1.05, Math.sin(a) * w / 2)); }
  const lat = [new THREE.Vector2(r * 0.55, -w / 2), ...pr, new THREE.Vector2(r * 0.55, w / 2)]; const t = new THREE.Mesh(new THREE.LatheGeometry(lat, 30), tyreM); t.rotation.z = Math.PI / 2; g.add(t);
  const lug = new THREE.BoxGeometry(w * 0.42, r * 0.08, r * 0.17); const im = new THREE.InstancedMesh(lug, tyreM.clone(), 44); const d = new THREE.Object3D(); for (let i = 0; i < 44; i++) { const a = (i / 44) * Math.PI * 2; const side = i % 2 ? 1 : -1; d.position.set(side * w * 0.24, Math.cos(a) * (r * 0.98), Math.sin(a) * (r * 0.98)); d.rotation.set(a, 0, 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); } im.castShadow = true; g.add(im);
  const hubM = std(hub, 0.42, 0.45); const rim = cyl(r * 0.6, r * 0.62, w * 0.72, hubM); rim.rotation.z = Math.PI / 2; g.add(rim);
  for (const s of [-1, 1]) { const dish = cyl(r * 0.42, r * 0.52, 0.03, std(0xc8ccd2, 0.35, 0.55), s * w * 0.37); dish.rotation.z = Math.PI / 2; g.add(dish); const c = cyl(r * 0.16, r * 0.2, 0.06, std(0x4a4f58, 0.4, 0.6), s * w * 0.4); c.rotation.z = Math.PI / 2; g.add(c); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(sph(r * 0.035, std(0x30343c, 0.4, 0.6), s * w * 0.39, Math.cos(a) * r * 0.31, Math.sin(a) * r * 0.31, 8)); } }
  return shadows(g);
}

// Rotationsbürste für Schiebekehrer: Boden bei y = 0, Radius R
function rotary(R, color = 0xdf7416) {
  const b = new THREE.Group(); const n = 190; const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.022, 0.21, 0.022), std(color, 0.72), n); const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const a = i * 2.399963; const q = Math.sqrt((i + 1) / n); const r = 0.08 + (R - 0.13) * q; const t = 0.2 + 0.5 * q; o.position.set(Math.cos(a) * r, 0.096, Math.sin(a) * r); o.rotation.set(-Math.sin(a) * t, 0, Math.cos(a) * t); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } im.castShadow = true; b.add(im);
  b.add(cyl(R * 0.72, R * 0.8, 0.05, std(0x2a2e38, 0.5, 0.3), 0, 0.2, 0, 26)); b.add(cyl(0.11, 0.15, 0.16, std(0x22252d, 0.5, 0.3), 0, 0.3, 0, 16)); b.add(cyl(0.065, 0.065, 0.03, std(0xc8ccd2, 0.35, 0.55), 0, 0.39, 0, 14)); return b;
}

// ---------------- Lunar-Bus (Bild 1) ----------------
const BUS_PAINT = `
  col = C(242., 241., 239.);
  float nose = smoothstep(1.7, 2.4, P.z); float vee = 1.13 - 0.2 * nose * (1.0 - smoothstep(0.0, 0.8, abs(P.x)));     // V-Linie der Bugfront
  float strip = band(P.y, vee, vee + 0.24); col = mix(col, C(238., 122., 24.), strip); col = mix(col, C(238., 122., 24.), band(P.y, 0.97, 0.995) * (1.0 - nose)); float navy = 1.0 - smoothstep(0.8, 0.82, P.y); col = mix(col, C(27., 33., 48.), navy);
  float roofS = band(P.y, 1.95, 2.0) * (1.0 - nose); col = mix(col, C(238., 122., 24.), roofS);
  float side = step(0.55, abs(N.x)); vec2 sp = vec2(P.z, P.y); float w = 1.0;
  for (int i = 0; i < 4; i++) { float cz = -1.62 + float(i) * 0.98; w = min(w, sdRR(sp, vec2(cz, 1.65), vec2(0.44, 0.235), 0.1)); }
  float win = inside(w) * side; float fr = inside(w - 0.035) * side * (1.0 - win); col = mix(col, C(27., 33., 48.), fr);
  float front = step(0.32, N.z) * step(1.5, P.z); vec2 fp = vec2(abs(P.x), P.y); float wf = sdRR(fp, vec2(0.46, 1.66), vec2(0.41, 0.235), 0.1); float wfi = inside(wf) * front; col = mix(col, C(27., 33., 48.), inside(wf - 0.03) * front * (1.0 - wfi));
  float back = step(0.5, -N.z); float wb = sdRR(fp, vec2(0.0, 1.64), vec2(0.62, 0.22), 0.1); float wbi = inside(wb) * back;
  float glass = max(max(win, wfi), wbi); col = mix(col, C(30., 44., 58.), glass); rough = mix(rough, 0.06, glass); metal = mix(metal, 0.6, glass);
  for (int i = 0; i < 2; i++) { float z0 = i == 0 ? -1.42 : 1.42; float ar = inside(length(vec2(P.z - z0, P.y - 0.42)) - 0.62) * side; col = mix(col, vec3(0.012), ar); }
`;
export function buildBus() {
  const g = new THREE.Group(); const L = 4.9;
  const fn = (u) => { const e = (t) => Math.sin(Math.min(1, t) * Math.PI / 2); const t = u; const z = -L / 2 + t * L; const a = e(t * 15); const b = e((1 - t) * 8.5); const k = Math.min(a, b); const top = 2.1 - 0.55 * Math.pow(Math.max(0, t - 0.8) / 0.2, 2.2); return { z, w: 0.6 + 1.34 * k, y0: 0.5 + (1 - k) * 0.42, y1: 0.96 + (top - 0.96) * Math.sqrt(k), n: 5 }; };
  const ts = []; for (let i = 0; i <= 56; i++) { const q = i / 56; ts.push(q < 0.5 ? 2 * q * q : 1 - 2 * (1 - q) * (1 - q)); }
  const body = mesh(loft(fn, ts, 56), paint({ color: 0xffffff, roughness: 0.32, metalness: 0.04 }, BUS_PAINT)); g.add(body);
  const chrome = std(0xdfe2e6, 0.22, 0.85); const navy = std(NAVY, 0.5, 0.1); const orange = std(ORANGE, 0.42, 0.05);
  for (const [z, ang] of [[-1.42, 0], [1.42, 0]]) for (const s of [-1, 1]) { const w = wheel(0.5, 0.44); w.position.set(s * 0.98, 0.5, z); w.rotation.y = ang; w.userData.wheel = true; w.userData.front = z > 0; g.add(w); }
  for (const s of [-1, 1]) { const ring = mesh(new THREE.TorusGeometry(0.17, 0.035, 10, 28), chrome, s * 0.58, 1.02, 2.385); ring.rotation.y = s * 0.12; g.add(ring); g.add(sph(0.15, std(0xfff4d8, 0.2, 0, { emissive: 0xffe8b0, emissiveIntensity: 0.9 }), s * 0.58, 1.02, 2.33, 18)); g.add(sph(0.07, std(ORANGE, 0.3, 0, { emissive: 0xee7a18, emissiveIntensity: 0.4 }), s * 0.8, 0.78, 2.3, 12)); }
  const bum = mesh(boxy(1.92, 0.58, 0.76, 0.2, 0.05, 5), orange, 0, 0, 2.44); g.add(bum); g.add(mesh(boxy(1.94, 0.6, 0.74, 0.18, 0.05, 5), navy, 0, 0, -2.42)); g.add(box(0.5, 0.12, 0.03, navy, 0, 0.66, 2.55));
  const em = logo(0.44, 0.14); em.position.set(0, 1.26, 2.44); g.add(em); for (const s of [-1, 1]) { const l = logo(1.0, 0.31); l.position.set(s * 0.975, 0.93, -0.4); l.rotation.y = s * Math.PI / 2; g.add(l); }
  // Dachträger + Gepäck
  const rack = std(0x2a2e38, 0.45, 0.5); for (const s of [-1, 1]) { const r = box(0.05, 0.05, 3.1, rack, s * 0.74, 2.25, -0.3); g.add(r); for (const z of [-1.7, -0.7, 0.3, 1.1]) g.add(box(0.04, 0.2, 0.04, rack, s * 0.74, 2.15, z)); } for (const z of [-1.7, -1.1, -0.5, 0.1, 0.7, 1.1]) g.add(box(1.5, 0.04, 0.04, rack, 0, 2.25, z));
  g.add(box(0.8, 0.26, 0.5, std(0x3a3f4a, 0.7), -0.2, 2.42, -1.2)); g.add(box(0.5, 0.3, 0.7, std(ORANGE, 0.6), 0.32, 2.43, -0.3)); g.add(box(0.7, 0.2, 0.5, std(0xd8d6d0, 0.7), -0.25, 2.38, 0.5)); const tube = cyl(0.13, 0.13, 1.2, std(0x59606d, 0.5, 0.2), 0.45, 2.42, 0.62, 14); tube.rotation.x = Math.PI / 2; g.add(tube);
  const bar = new THREE.Group(); g.add(bar); bar.add(box(2.3, 0.14, 0.34, orange, 0, 0.2, -2.55)); bar.add(bristles(2.3, 0.2, 0.3, 0, 0.09, -2.55)); g.userData.bar = bar;
  g.userData.seats = [{ x: -0.42, y: 0.98, z: 1.0 }, { x: 0.42, y: 0.98, z: 1.0 }, { x: 0, y: 0.98, z: -0.3 }]; return shadows(g);
}
function bristles(w, h, d, x, y, z, color = 0x23242a) { const n = Math.max(12, Math.floor(w * 22)); const g = new THREE.BoxGeometry(0.014, h, 0.014); const m = new THREE.InstancedMesh(g, std(color, 0.8), n * 3); const o = new THREE.Object3D(); let a = 3; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; for (let i = 0; i < n * 3; i++) { o.position.set(x + (r() - 0.5) * w, y + (r() - 0.5) * 0.02, z + (r() - 0.5) * d); o.rotation.set((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4); o.scale.set(1 + r(), 1, 1 + r()); o.updateMatrix(); m.setMatrixAt(i, o.matrix); } m.castShadow = true; return m; }

// ---------------- Kehrmaschine (Bild 3) ----------------
const CAB_PAINT = `
  col = C(242., 241., 239.); float lowf = 1.0 - smoothstep(0.98, 1.0, P.y); col = mix(col, C(24., 29., 42.), lowf);
  float f = step(0.45, N.z); vec2 fp = vec2(P.x, P.y); float ws = sdRR(fp, vec2(0.0, 2.27), vec2(1.14, 0.78), 0.14); float wsi = inside(ws) * f; col = mix(col, C(24., 29., 42.), inside(ws - 0.06) * f * (1.0 - wsi));
  float s = step(0.6, abs(N.x)); vec2 sp = vec2(P.z, P.y); float dw = sdRR(sp, vec2(0.28, 2.3), vec2(0.44, 0.72), 0.1); float dwi = inside(dw) * s; col = mix(col, C(24., 29., 42.), inside(dw - 0.05) * s * (1.0 - dwi));
  float dw2 = sdRR(sp, vec2(-0.72, 2.45), vec2(0.34, 0.5), 0.08); float dw2i = inside(dw2) * s; col = mix(col, C(24., 29., 42.), inside(dw2 - 0.05) * s * (1.0 - dw2i));
  float seam = inside(abs(sdRR(sp, vec2(0.28, 1.86), vec2(0.56, 1.2), 0.1)) - 0.006) * s; col = mix(col, C(150., 152., 158.), seam);
  float gl = max(max(wsi, dwi), dw2i); col = mix(col, mix(C(52., 72., 96.), C(18., 26., 40.), smoothstep(1.6, 3.0, P.y)), gl); rough = mix(rough, 0.05, gl); metal = mix(metal, 0.7, gl);
  float roofS = band(P.y, 3.22, 3.26); col = mix(col, C(238., 122., 24.), roofS);
`;
const TANK_PAINT = `
  col = C(238., 238., 238.); float s1 = band(P.y, 2.02, 2.1); float s2 = band(P.y, 1.9, 1.96); col = mix(col, C(238., 122., 24.), max(s1, s2)); col = mix(col, C(60., 66., 78.), band(P.y, 1.78, 1.84));
  float low = 1.0 - smoothstep(1.0, 1.02, P.y); col = mix(col, C(24., 29., 42.), low);
  float seam = 0.0; for (int i = 0; i < 3; i++) seam = max(seam, inside(abs(P.z + 3.4 + float(i) * 0.9) - 0.006)); col = mix(col, C(170., 172., 178.), seam);
`;
export function buildTruck() {
  const g = new THREE.Group(); const orange = std(ORANGE, 0.45); const navy = std(NAVY, 0.5, 0.15); const dark = std(0x171a22, 0.55, 0.2); const steel = std(STEEL, 0.4, 0.6);
  const cab = mesh(boxy(2.72, 0.75, 3.18, 2.5, 0.3, 7), paint({ color: 0xffffff, roughness: 0.3 }, CAB_PAINT), 0, 0, 0.6); g.add(cab);
  const tank = mesh(boxy(2.5, 0.85, 3.05, 4.3, 0.42, 5), paint({ color: 0xffffff, roughness: 0.38 }, TANK_PAINT), 0, 0, -3.2); g.add(tank); for (const s of [-1, 1]) { const l = logo(1.5, 0.47); l.position.set(s * 1.256, 2.42, -3.0); l.rotation.y = s * Math.PI / 2; g.add(l); }
  g.add(box(2.52, 0.48, 7.0, dark, 0, 0.72, -1.2));
  // Front: Kühlergitter, LED-Scheinwerfer, Stoßstange
  g.add(box(2.3, 0.5, 0.1, dark, 0, 1.08, 1.86)); for (let i = 0; i < 7; i++) g.add(box(1.06, 0.022, 0.03, std(0x9aa0a8, 0.4, 0.6), 0, 0.92 + i * 0.05, 1.92)); for (const s of [-1, 1]) { g.add(box(0.46, 0.2, 0.06, std(0xffffff, 0.2, 0, { emissive: 0xfff7e8, emissiveIntensity: 1.6 }), s * 0.84, 1.1, 1.92)); g.add(box(0.5, 0.05, 0.05, orange, s * 0.84, 0.94, 1.92)); }
  g.add(box(2.46, 0.3, 0.32, navy, 0, 0.7, 1.86)); g.add(box(0.5, 0.16, 0.05, std(0x2b303c, 0.4, 0.4), 0, 0.7, 2.03));
  // Spiegel an Auslegern
  for (const s of [-1, 1]) { const arm = box(0.42, 0.04, 0.04, dark, s * 1.42, 2.75, 1.62); g.add(arm); g.add(box(0.05, 0.05, 0.9, dark, s * 1.62, 2.4, 1.62)); g.add(mesh(boxy(0.22, 2.2, 2.92, 0.1, 0.03, 6), dark, s * 1.62, 0, 1.68)); }
  // Blinklicht, Abgasrohr
  g.add(mesh(boxy(1.1, 3.28, 3.42, 0.3, 0.08, 6), orange, 0, 0, 0.7)); g.add(cyl(0.05, 0.05, 1.2, steel, 1.18, 3.2, -0.72, 10));
  for (const [z, s] of [[0.0, -1], [0.0, 1], [-3.8, -1], [-3.8, 1]]) { const w = wheel(0.72, 0.56, 0x8e949c); w.position.set(s * 1.2, 0.72, z); w.userData.wheel = true; w.userData.front = z > -1; g.add(w); }
  // Drei Rotationsbürsten an Auslegern (drehen sich)
  const spin = []; for (const [x, z] of [[-1.6, 3.15], [0, 3.55], [1.6, 3.15]]) { const b = new THREE.Group(); b.position.set(x, 0.27, z); const hub = cyl(0.38, 0.44, 0.26, std(0x22252d, 0.5, 0.3), 0, 0.18); b.add(hub); b.add(cyl(0.22, 0.26, 0.16, std(0x7f858e, 0.4, 0.6), 0, 0.38)); const pl = cyl(0.78, 0.8, 0.09, orange, 0, 0.02); b.add(pl); const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 40, 1, true), std(0x17181c, 0.85, 0, { side: THREE.DoubleSide })); skirt.position.y = -0.1; b.add(skirt); const n = 150; const br = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.22, 0.018), std(0x1c1d22, 0.8), n); const o = new THREE.Object3D(); for (let i = 0; i < n; i++) { const a = i * 2.399963; const r = 0.4 + 0.5 * Math.sqrt((i + 1) / n); o.position.set(Math.cos(a) * r, -0.13, Math.sin(a) * r); o.rotation.set(-Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3); o.updateMatrix(); br.setMatrixAt(i, o.matrix); } b.add(br); g.add(b); spin.push(b); g.add(box(0.1, 0.1, 1.5, dark, x * 0.75, 0.6, z - 0.72)); }
  g.add(box(3.0, 0.1, 0.12, dark, 0, 0.62, 2.3));
  g.userData.spin = spin; g.userData.seats = [{ x: -0.55, y: 1.65, z: 0.7 }, { x: 0.55, y: 1.65, z: 0.7 }]; return shadows(g);
}

// ---------------- Kehrtrike (Bild 2: Aufsitzmaschine) ----------------
export function buildTrike() {
  const g = new THREE.Group(); const body = paint({ color: 0xffffff, roughness: 0.34 }, `col = C(242., 241., 239.); float s = band(P.y, 0.82, 0.9); col = mix(col, C(238., 122., 24.), s); float lo = 1.0 - smoothstep(0.58, 0.6, P.y); col = mix(col, C(30., 35., 48.), lo);`);
  g.add(mesh(boxy(1.2, 0.42, 1.28, 2.2, 0.32, 5), body, 0, 0, 0.1)); g.add(mesh(boxy(0.92, 1.1, 1.72, 0.8, 0.22, 5), body, 0, 0, -0.62));
  const seat = mesh(boxy(0.62, 1.12, 1.26, 0.6, 0.12, 5), std(0x2a2e38, 0.7), 0, 0, -0.02); g.add(seat); g.add(mesh(boxy(0.62, 1.2, 1.84, 0.16, 0.06, 5), std(0x2a2e38, 0.7), 0, 0, -0.28));
  const col = cyl(0.03, 0.03, 0.62, std(0x30343e, 0.4, 0.5), 0, 1.42, 0.62, 10); col.rotation.x = -0.45; g.add(col); const whl = mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 22), std(0x20232b, 0.5), 0, 1.72, 0.48); whl.rotation.x = 1.0; g.add(whl);
  for (const [x, z] of [[-0.82, -0.64], [0.82, -0.64], [-0.82, 0.7], [0.82, 0.7]]) { const w = wheel(0.44, 0.34); w.position.set(x, 0.44, z); w.userData.wheel = true; w.userData.front = z > 0; g.add(w); }
  const orange = std(ORANGE, 0.45); const bar = new THREE.Group(); g.add(bar); bar.add(box(1.9, 0.12, 0.32, orange, 0, 0.2, 1.46)); bar.add(bristles(1.9, 0.18, 0.28, 0, 0.08, 1.46)); g.userData.bar = bar; g.add(box(1.5, 0.07, 0.07, std(0x2a2e38, 0.4, 0.5), 0, 0.42, 1.2)); for (const s of [-1, 1]) g.add(box(0.06, 0.28, 0.36, std(0x2a2e38, 0.4, 0.5), s * 0.42, 0.36, 1.26));
  g.userData.seats = [{ x: 0, y: 1.0, z: -0.02 }]; return shadows(g);
}

// ---------------- Roboter ----------------
export function buildRobot(big = false, barW = big ? 2.4 : 0.8) {
  const g = new THREE.Group(); const k = big ? 1.5 : 0.9; const b = paint({ color: 0xffffff, roughness: 0.3 }, `col = C(242., 241., 239.); float r = length(P.xz); col = mix(col, C(238., 122., 24.), band(r, 0.5, 0.56)); col = mix(col, C(28., 33., 46.), 1.0 - smoothstep(0.14, 0.16, P.y)); col = mix(col, C(36., 44., 60.), inside(r - 0.24) * step(0.5, N.y));`);
  const lat = [new THREE.Vector2(0, 0.08), new THREE.Vector2(0.66, 0.08), new THREE.Vector2(0.7, 0.14), new THREE.Vector2(0.68, 0.27), new THREE.Vector2(0.6, 0.33), new THREE.Vector2(0, 0.35)]; g.add(mesh(new THREE.LatheGeometry(lat, 36), b));
  for (const s of [-1, 1]) g.add(sph(0.07, std(0x9ee6ff, 0.2, 0, { emissive: 0x6fd8ff, emissiveIntensity: 1.5 }), s * 0.2, 0.25, 0.6, 12));
  if (big) { g.add(mesh(boxy(0.8, 0.3, 0.92, 0.7, 0.16, 5), paint({ color: 0xffffff, roughness: 0.35 }, `col = C(242., 241., 239.); col = mix(col, C(238., 122., 24.), band(P.y, 0.56, 0.64));`), 0, 0, -0.1)); g.add(cyl(0.05, 0.02, 0.6, std(0x30343e, 0.4, 0.5), 0, 1.2, -0.3, 8)); }
  g.add(box(barW / k, 0.05, 0.2, std(ORANGE, 0.5), 0, 0.05, 0.6)); g.add(bristles(barW / k, 0.06, 0.18, 0, 0.0, 0.6)); g.scale.setScalar(k); g.userData.spin = [g]; return shadows(g);
}

// ---------------- Astronaut (Bild 4) ----------------
const down = new THREE.Vector3(0, -1, 0);
function limb(a, b, ra, rb, mat, ringM, joint, footM) {
  const up = new THREE.Group(); const u = cyl(ra, ra * 0.86, a, mat); u.position.y = -a / 2; up.add(u); up.add(sph(ra * 1.02, mat));
  const lo = new THREE.Group(); lo.position.y = -a; up.add(lo); lo.add(sph(ra * 0.92, joint, 0, 0, 0, 14)); const l = cyl(rb, rb * 0.88, b, mat); l.position.y = -b / 2; lo.add(l); const ring = mesh(new THREE.TorusGeometry(rb * 1.02, 0.018, 8, 20), ringM, 0, -0.03); ring.rotation.x = Math.PI / 2; lo.add(ring);
  const end = new THREE.Group(); end.position.y = -b; lo.add(end); if (footM) end.add(footM); return { up, lo, end, a, b };
}
const _v = new THREE.Vector3(); const _d = new THREE.Vector3(); const _ax = new THREE.Vector3(); const _q = new THREE.Quaternion(); const _u = new THREE.Vector3(); const _e = new THREE.Vector3();
function ik(L, tx, ty, tz, px, py, pz) { // tx.. = Ziel im Elternraum von L.up; px.. = Pol (Richtung, in die das Gelenk knickt)
  _v.set(tx, ty, tz).sub(L.up.position); const dist = Math.min(L.a + L.b - 0.002, Math.max(0.06, _v.length())); _d.copy(_v).normalize();
  const cosA = Math.min(1, Math.max(-1, (L.a * L.a + dist * dist - L.b * L.b) / (2 * L.a * dist))); const A = Math.acos(cosA); _ax.set(px, py, pz).cross(_d).normalize(); if (_ax.lengthSq() < 0.01) _ax.set(1, 0, 0);
  _u.copy(_d).applyAxisAngle(_ax, -A); L.up.quaternion.setFromUnitVectors(down, _u); _e.copy(_u).multiplyScalar(L.a); _v.copy(_d).multiplyScalar(dist).sub(_e).normalize(); _q.copy(L.up.quaternion).invert(); _v.applyQuaternion(_q); L.lo.quaternion.setFromUnitVectors(down, _v);
}
export function buildAstronaut({ accent = ORANGE, stripe = null } = {}) {
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body); const white = std(0xf3f2f0, 0.5); const grey = std(0xb6b4ae, 0.62, 0.05); const dark = std(0x4c4f58, 0.6, 0.1); const acc = std(accent, 0.48);
  const pelvis = new THREE.Group(); pelvis.position.y = 0.72; body.add(pelvis);
  const torso = new THREE.Group(); pelvis.add(torso);
  const chest = sph(0.37, white, 0, 0.3, 0, 26); chest.scale.set(1.05, 1.0, 0.86); torso.add(chest); const belly = sph(0.31, white, 0, 0.06, 0, 20); belly.scale.set(1.04, 0.72, 0.9); torso.add(belly);
  const belt = mesh(new THREE.TorusGeometry(0.29, 0.03, 8, 30), grey, 0, -0.07); belt.rotation.x = Math.PI / 2; torso.add(belt); torso.add(box(0.14, 0.09, 0.05, dark, 0, -0.07, 0.27));
  const panel = mesh(boxy(0.36, 0.2, 0.42, 0.1, 0.03, 5), paint({ color: 0xffffff, roughness: 0.5 }, `col = C(150., 150., 146.); for (int i = 0; i < 3; i++) { float d = sdRR(P.xy, vec2(-0.1 + float(i) * 0.1, 0.33), vec2(0.04, 0.035), 0.012); float k = inside(d); col = mix(col, i == 1 ? C(60., 200., 190.) : C(70., 78., 90.), k); } col = mix(col, C(238., 122., 24.), inside(sdRR(P.xy, vec2(-0.12, 0.25), vec2(0.025, 0.018), 0.008)));`), 0, 0, 0.3); torso.add(panel);
  const neck = mesh(new THREE.TorusGeometry(0.235, 0.048, 12, 30), grey, 0, 0.61); neck.rotation.x = Math.PI / 2; torso.add(neck);
  // Helm: groß, weiß, schwarzes Visier mit zwei hellen Augen
  const head = new THREE.Group(); head.position.y = 0.91; torso.add(head);
  const shell = sph(0.385, white, 0, 0, 0, 36); head.add(shell); const rim = mesh(new THREE.TorusGeometry(0.316, 0.042, 14, 44), grey, 0, -0.005, 0.222); rim.scale.y = 0.93; head.add(rim);
  const visorM = std(0x05060a, 0.08, 0.2, { envMapIntensity: 1.6 }); const visor = sph(0.31, visorM, 0, -0.005, 0.2, 30); visor.scale.set(1, 0.93, 0.8); head.add(visor);
  const eyeM = std(0xffffff, 0.3, 0, { emissive: 0xffffff, emissiveIntensity: 1.05 }); for (const s of [-1, 1]) { const e = sph(0.066, eyeM, s * 0.105, 0.02, 0.436, 18); e.scale.set(0.74, 1.3, 0.14); e.rotation.y = s * 0.3; head.add(e); }
  if (stripe !== null) { const st = mesh(new THREE.TorusGeometry(0.388, 0.022, 10, 44, Math.PI * 1.06), std(stripe, 0.45), 0, 0, 0); st.rotation.set(0, Math.PI / 2, 0); st.rotation.z = -0.09; head.add(st); const st2 = st.clone(); st2.position.x = 0.09; st2.scale.setScalar(0.985); head.add(st2); const st3 = st.clone(); st3.position.x = -0.09; st3.scale.setScalar(0.985); head.add(st3); }
  for (const s of [-1, 1]) { const c = cyl(0.05, 0.05, 0.05, grey, s * 0.385, 0.02, 0, 14); c.rotation.z = Math.PI / 2; head.add(c); }
  // Rucksack mit Staubtank (Füllstand sichtbar)
  const pack = new THREE.Group(); pack.position.set(0, 0.28, -0.34); torso.add(pack); pack.add(mesh(boxy(0.56, -0.24, 0.34, 0.26, 0.09, 5), std(0xe9e8e4, 0.5))); const glass = cyl(0.1, 0.1, 0.46, std(0xbcd3e6, 0.15, 0.1, { transparent: true, opacity: 0.35 }), 0, 0.04, -0.17, 16); glass.userData.keep = true; pack.add(glass); const fill = cyl(0.085, 0.085, 0.44, std(0x9c9aac, 0.8), 0, 0.04, -0.17, 14); fill.geometry.translate(0, 0.22, 0); fill.position.y = -0.18; pack.add(fill); pack.add(cyl(0.11, 0.11, 0.03, acc, 0, 0.28, -0.17, 16)); pack.add(cyl(0.11, 0.11, 0.03, acc, 0, -0.2, -0.17, 16));
  // Gliedmaßen
  const glove = sph(0.1, grey, 0, -0.04, 0, 16); glove.scale.set(1, 1.12, 0.92); const boot = new THREE.Group(); const bt = mesh(boxy(0.26, -0.02, 0.16, 0.42, 0.1, 4), grey, 0, -0.14, 0.05); boot.add(bt); boot.add(box(0.24, 0.035, 0.38, dark, 0, -0.145, 0.05));
  const armL = limb(0.3, 0.27, 0.105, 0.098, white, grey, grey, glove.clone()); armL.up.position.set(0.39, 0.44, 0.02); torso.add(armL.up);
  const armR = limb(0.3, 0.27, 0.105, 0.098, white, grey, grey, glove.clone()); armR.up.position.set(-0.39, 0.44, 0.02); torso.add(armR.up);
  const legL = limb(0.32, 0.29, 0.135, 0.125, white, grey, grey, boot.clone()); legL.up.position.set(0.17, 0, 0); pelvis.add(legL.up);
  const legR = limb(0.32, 0.29, 0.135, 0.125, white, grey, grey, boot.clone()); legR.up.position.set(-0.17, 0, 0); pelvis.add(legR.up);
  const toolMount = new THREE.Group(); root.add(toolMount); shadows(root);
  const R = { root, body, pelvis, torso, head, armL, armR, legL, legR, fill, pack, toolMount, tool: null, toolId: null, phase: 0, walk: 0, scrub: 0, crouch: 0, seat: 0, materials: null };
  R.tip = { x: 0, z: 1, on: false }; // Lage des Werkzeugkopfs relativ zur Figur
  R.setFill = (p) => { fill.scale.y = Math.max(0.02, Math.min(1, p)); };
  R.setPackScale = (k) => { pack.scale.setScalar(k); };
  R.setTool = (id, kind, w) => { if (R.toolId === id) return; if (R.tool) toolMount.remove(R.tool); R.tool = toolModel(kind, w); R.toolKind = kind; R.toolId = id; toolMount.add(R.tool); };
  R.ghost = (on) => { body.traverse((o) => { if (!o.isMesh) return; if (on) { o.userData.mat = o.userData.mat || o.material; o.material = GHOST; } else if (o.userData.mat) o.material = o.userData.mat; }); };
  return R;
}
const GHOST = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
// Pose je Bild: st = { speed (m/s), scrub (0/1), kneel (0/1), seat (0/1), air }, tp = Sekunden
const _T = new THREE.Vector3(); const _H = new THREE.Vector3(); const _dir = new THREE.Vector3();
export function poseAstronaut(R, st, dt) {
  const k = 1 - Math.exp(-dt * 10); R.walk += (Math.min(1, st.speed / 2.2) - R.walk) * k; R.scrub += ((st.scrub ? 1 : 0) - R.scrub) * k; R.crouch += ((st.kneel ? 1 : 0) - R.crouch) * (1 - Math.exp(-dt * 7)); R.seat += ((st.seat ? 1 : 0) - R.seat) * k; R.phase += dt * (3 + st.speed * 2.6);
  if (!st.seat && R.seat < 0.003) R.seat = 0; // Der Sitz-Wert klingt nur exponentiell ab und erreichte nie 0: Danach blieb das Werkzeug nach dem Aussteigen für immer unsichtbar und der Kopf „aus“
  const p = R.phase; const sw = Math.sin(p) * R.walk * (st.air ? 0.3 : 1); const bob = Math.abs(Math.cos(p)) * 0.05 * R.walk; const seat = R.seat; const kn = R.crouch * (1 - seat);
  const hipY = 0.72 + bob - 0.33 * kn - 0.2 * seat; R.pelvis.position.y = hipY; R.torso.rotation.x = 0.1 * R.walk + 0.5 * kn + (R.toolKind === 'pusher' ? 0.42 : 0.18) * R.scrub * (1 - kn); R.torso.rotation.y = Math.sin(p * 0.5) * 0.06 * R.walk; R.head.rotation.x = -0.22 * R.torso.rotation.x - 0.12 * R.scrub;
  // Beine
  const footZ = (s) => s * 0.36 * R.walk; const footY = (s) => Math.max(0, -s) * 0.16 * R.walk; const stride = sw;
  if (seat > 0.5) { ik(R.legL, 0.2, -0.28, 0.5, 0, 0, 1); ik(R.legR, -0.2, -0.28, 0.5, 0, 0, 1); }
  else if (kn > 0.5) { ik(R.legL, 0.2, -hipY + 0.14, -0.44 + sw * 0.1, 0, -0.3, 1); ik(R.legR, -0.2, -hipY + 0.14, 0.34 - sw * 0.1, 0, 0, 1); }
  else { ik(R.legL, 0.17, -hipY + 0.15 + footY(stride), footZ(stride), 0, 0, 1); ik(R.legR, -0.17, -hipY + 0.15 + footY(-stride), footZ(-stride), 0, 0, 1); }
  // Werkzeug und Arme
  const t = R.tool; const kind = R.toolKind || 'brush';
  const sitting = seat > 0.05; // sitzt (auch beim Aufstehen noch ein paar Bilder), danach gilt wieder das Werkzeug
  if (t && !sitting) {
    const push = kind === 'pusher'; const flat = kind === 'brush' || kind === 'hand'; const osc = Math.sin(p * (R.scrub > 0.3 ? 1.9 : 1) + 0.6) * (st.oscW || 0) * R.scrub; const reach = kind === 'brush' ? 0.86 : kind === 'hand' ? 0.9 : kind === 'drill' ? 0.5 : push ? 1.2 : 1.28; const idle = push ? 0 : 1 - R.scrub; const hy = push ? 0 : flat ? 0.04 + idle * (0.86 - 0.36 * kn) : 0.05 + idle * 0.07; const hz = reach - idle * (flat ? 0.42 : 0.16);
    const hx = flat ? -0.04 : push ? 0 : -0.02; _H.set(hx + osc, hy, hz + (push ? 0 : Math.sin(p * 3.8) * 0.03 * R.scrub)); const top = t.userData.top; R.tip.x = _H.x; R.tip.z = _H.z + (t.userData.brushZ || 0); R.tip.on = R.scrub > 0.7; if (t.userData.spin) for (const b of t.userData.spin) b.rotation.y += dt * (R.scrub > 0.5 ? 22 : 0.5); if (push) t.traverse((c) => { if (c.userData.toolWheel) c.rotation.x += st.speed * dt / 0.25; }); const gripN = t.userData.grip;
    if (top) { _T.set(-0.1, 1.05 - 0.24 * kn, 0.3); _dir.copy(_T).sub(_H).normalize(); t.position.copy(_H); t.quaternion.setFromUnitVectors(_U, _dir); } else { t.position.copy(_H); t.quaternion.identity(); if (!push) { t.rotateY(osc * 0.8); if (idle > 0.5) t.rotation.x = -0.5 * idle; } }
    const g0 = gripN[0]; const g1 = gripN[1]; const toW = (g) => _v3.set(g[0], g[1], g[2]).applyQuaternion(t.quaternion).add(t.position); const c = R.torso; c.updateMatrix(); R.pelvis.updateMatrix(); const inv = _m.copy(R.pelvis.matrix).multiply(c.matrix).invert();
    const a = toW(g0).applyMatrix4(inv); ik(R.armR, a.x, a.y + 0.0, a.z, -0.5, -0.8, -0.3); const b = toW(g1).applyMatrix4(inv); ik(R.armL, b.x, b.y, b.z, 0.5, -0.8, -0.3);
  } else if (sitting) { ik(R.armR, -0.18, 0.2, 0.55, -0.5, -0.8, 0); ik(R.armL, 0.18, 0.2, 0.55, 0.5, -0.8, 0); if (t) t.visible = false; R.tip.on = false; }
  else { const a = sw * 0.34; ik(R.armR, -0.46, -0.08, -a * 0.8, -0.4, 0, -1); ik(R.armL, 0.46, -0.08, a * 0.8, 0.4, 0, -1); }
  if (t && !sitting) t.visible = true;
}
const _U = new THREE.Vector3(0, 1, 0); const _v3 = new THREE.Vector3(); const _m = new THREE.Matrix4();

// ---------------- Werkzeuge: Kopf im Ursprung, Griff entlang +y; userData.grip = zwei Griffpunkte ----------------
export function toolModel(kind, w = 1) {
  const g = new THREE.Group(); const orange = std(ORANGE, 0.42); const dark = std(0x22242c, 0.6, 0.2); const white = std(0xf2f1ef, 0.4); const steel = std(0xa6abb3, 0.35, 0.65);
  if (kind === 'brush') { // Zahnbürste: Griff parallel zum Boden (nach hinten), Borsten nach unten
    const h = mesh(boxy(0.1, 0.0, 0.05, 0.62, 0.025, 5), white, 0, 0.06, -0.26); g.add(h); g.add(box(0.05, 0.03, 0.4, orange, 0, 0.1, -0.3)); g.add(box(w, 0.03, 0.26, white, 0, 0.06, 0.02)); g.add(bristles(w, 0.08, 0.24, 0, 0.0, 0.02, 0xf4f6ff)); g.add(bristles(w * 0.7, 0.09, 0.08, 0, 0.0, 0.08, ORANGE));
    g.userData.grip = [[0.02, 0.1, -0.42], [0.02, 0.1, -0.42]];
  } else if (kind === 'pusher') {
    const body = paint({ color: 0xffffff, roughness: 0.36 }, `col = C(233., 229., 217.); col = mix(col, C(28., 34., 46.), 1.0 - smoothstep(0.33, 0.36, P.y)); float side = step(0.5, abs(N.x)); col = mix(col, C(238., 122., 24.), band(P.y, 0.4, 0.43) * step(0.1, P.z) * side); vec2 sp = vec2(P.z, P.y); float pn = inside(sdRR(sp, vec2(-0.2, 0.5), vec2(0.17, 0.11), 0.02)) * side; col = mix(col, C(238., 122., 24.), pn); float ln = inside(abs(fract((P.y - 0.42) / 0.05) - 0.5) * 0.05 - 0.012) * pn; col = mix(col, C(30., 34., 44.), ln * step(P.z, -0.2)); for (int i = 0; i < 3; i++) { col = mix(col, C(238., 122., 24.), inside(sdRR(sp + vec2(-0.2 - float(i) * 0.05 - (P.y - 0.5) * 0.4, 0.0), vec2(0.0, 0.5), vec2(0.014, 0.05), 0.004)) * side); }`); g.add(mesh(boxy(0.86, 0.14, 0.66, 1.16, 0.2, 4), body, 0, 0, -0.04)); g.add(box(0.4, 0.02, 0.3, orange, 0, 0.665, -0.3)); for (let i = 0; i < 3; i++) g.add(box(0.28, 0.024, 0.03, dark, 0, 0.672, -0.38 + i * 0.08));
    for (const s of [-1, 1]) { const wh = wheel(0.25, 0.13); wh.position.set(s * 0.5, 0.25, -0.28); wh.userData.toolWheel = true; g.add(wh); const tube = cyl(0.022, 0.022, 0.7, dark, s * 0.2, 0.84, -0.7, 8); tube.rotation.x = -0.78; g.add(tube); }
    const bar = cyl(0.026, 0.026, 0.54, dark, 0, 1.08, -0.95, 8); bar.rotation.z = Math.PI / 2; g.add(bar); const spin = []; for (const s of [-1, 1]) { const b = rotary(0.34); b.position.set(s * (w / 2 - 0.34), 0, 0.56); g.add(b); spin.push(b); g.add(box(0.07, 0.07, 0.5, dark, s * (w / 2 - 0.34) * 0.7, 0.34, 0.42)); }
    g.userData.spin = spin; g.userData.brushZ = 0.56; g.userData.grip = [[-0.2, 1.08, -0.95], [0.2, 1.08, -0.95]];
  } else if (kind === 'hand') { g.add(mesh(boxy(w, 0.06, 0.16, 0.2, 0.05, 5), orange)); g.add(bristles(w, 0.11, 0.17, 0, 0.0, 0)); const h = box(0.08, 0.05, 0.42, std(0x7c5a38, 0.7), 0, 0.14, -0.3); g.add(h); g.userData.grip = [[0, 0.16, -0.42], [0.1, 0.16, -0.2]]; }
  else if (kind === 'broom') { const head = box(w, 0.09, 0.2, orange, 0, 0.1); g.add(head); g.add(box(w * 0.97, 0.03, 0.16, std(0xc96412, 0.5), 0, 0.15)); g.add(bristles(w * 0.98, 0.12, 0.17, 0, 0.0, 0)); g.add(cyl(0.022, 0.022, 1.28, std(0x2a2e38, 0.4, 0.5), 0, 0.76, 0, 10)); g.add(cyl(0.05, 0.03, 0.1, std(0x2a2e38, 0.4, 0.5), 0, 0.2, 0, 10)); g.userData.top = 1.4; g.userData.grip = [[0, 0.82, 0], [0, 1.2, 0]]; }
  else if (kind === 'vac') { const nz = mesh(boxy(w, 0.02, 0.14, 0.3, 0.09, 5), orange); g.add(nz); g.add(box(w * 0.9, 0.03, 0.06, dark, 0, 0.01, 0.1)); g.add(cyl(0.05, 0.075, 0.2, dark, 0, 0.2, 0, 12)); g.add(cyl(0.042, 0.042, 1.1, std(0xdadde0, 0.35, 0.4), 0, 0.72, 0, 12)); for (let i = 0; i < 6; i++) g.add(mesh(new THREE.TorusGeometry(0.046, 0.009, 6, 16), dark, 0, 0.32 + i * 0.16, 0)).children; g.children.slice(-6).forEach((c) => { c.rotation.x = Math.PI / 2; }); const mot = mesh(boxy(0.2, 1.0, 1.28, 0.34, 0.08, 5), white, 0, 0, 0); g.add(mot); g.add(cyl(0.11, 0.11, 0.02, orange, 0, 1.3, 0, 16)); g.userData.top = 1.4; g.userData.grip = [[0, 0.92, 0], [0, 1.2, 0]]; }
  else { g.add(box(w, 0.09, 0.2, orange, 0, 0.12, 0)); g.add(bristles(w, 0.12, 0.2, 0, 0.0, 0)); g.add(cyl(0.02, 0.06, 0.26, steel, 0, 0.13, 0.16, 12)); g.add(cyl(0.05, 0.05, 0.42, std(0xdadde0, 0.35, 0.5), 0, 0.46, 0, 12)); g.add(mesh(boxy(0.2, 0.64, 0.86, 0.2, 0.07, 5), orange)); const t = cyl(0.03, 0.03, 0.62, dark, 0, 0.92, 0, 10); t.rotation.z = Math.PI / 2; g.add(t); g.userData.top = 1.0; g.userData.grip = [[-0.22, 0.92, 0], [0.22, 0.92, 0]]; }
  g.traverse((c) => { if (c.isMesh) c.castShadow = true; }); return g;
}

// ---------------- Raumstation (Bild 1 und 2) ----------------
const hullPaint = (hx, hz, doorW) => `
  col = C(240., 239., 236.); float y = P.y; float sZ = step(0.7, abs(N.z)); float sX = step(0.7, abs(N.x)); float along = sZ > 0.5 ? P.x : P.z;
  float sk = 1.0 - smoothstep(0.62, 0.66, y); col = mix(col, C(38., 42., 52.), sk);
  col = mix(col, C(238., 122., 24.), band(y, 8.9, 9.3)); col = mix(col, C(238., 122., 24.), band(y, 1.02, 1.14)); col = mix(col, C(58., 62., 72.), band(y, 8.74, 8.82));
  float seam = inside(abs(fract(along / 4.0 + 0.5) - 0.5) * 4.0 - 0.012) * step(1.2, y) * (1.0 - step(8.7, y)) * step(0.5, sZ + sX); col = mix(col, C(186., 186., 188.), seam); float seam2 = inside(abs(y - 4.9) - 0.01); col = mix(col, C(186., 186., 188.), seam2 * 0.7);
  float lv = 1.0; for (int i = -2; i <= 2; i++) { lv = min(lv, sdRR(vec2(along, y), vec2(float(i) * 6.6, 10.2), vec2(2.8, 0.55), 0.08)); } float lm = inside(lv) * step(0.5, sZ + sX); float sl = 0.5 + 0.5 * sin(y * 44.0); col = mix(col, mix(C(26., 30., 38.), C(58., 62., 74.), step(0.72, sl)), lm);
  float wn = 1.0; for (int i = -3; i <= 3; i++) { if (i == 0) continue; wn = min(wn, sdRR(vec2(along, y), vec2(float(i) * 4.0, 4.9), vec2(0.48, 3.3), 0.12)); } float wfr = inside(wn - 0.1) * sZ; float wg = inside(wn) * sZ; col = mix(col, C(214., 214., 214.), wfr); col = mix(col, C(92., 158., 206.), wg); rough = mix(rough, 0.1, wg); metal = mix(metal, 0.25, wg);
  float hatch = inside(sdRR(vec2(along, y), vec2(0.0, 4.4), vec2(1.3, 3.2), 0.2)) * step(0.5, sX); col = mix(col, C(58., 62., 72.), hatch * 0.6);
  if (P.z > 0.0 && N.z > 0.5 && abs(P.x) < ${doorW.toFixed(2)} && P.y < 3.4) discard;
`;
export function buildStation() {
  const g = new THREE.Group(); const { hx, hz, door } = STATION; const W = 2 * hx + 0.8; const D = 2 * hz + 0.8;
  const hull = mesh(boxy(W, -1.2, 12.4, D, 2.2, 10), paint({ color: 0xffffff, roughness: 0.42, metalness: 0.02, shadowSide: THREE.FrontSide }, hullPaint(hx, hz, door))); hull.userData.keep = true; g.add(hull);
  // Dachaufbauten
  const white = std(0xece9e4, 0.5); const dark = std(0x2a2e38, 0.55, 0.3); g.add(mesh(boxy(16, 12, 13, 8, 0.5, 7), white, -6, 0, -1)); for (const [x, z] of [[-14, 3], [-9, 3], [-4, 3], [9, 2], [13, -3]]) g.add(box(2.4, 0.7, 1.4, dark, x, 12.6, z)); g.add(cyl(0.05, 0.09, 5, dark, 11, 14.5, 2, 8)); const dish = sph(1.1, white, 7.5, 13.6, -3.5, 20); dish.scale.set(1, 0.32, 1); dish.rotation.x = -0.6; g.add(dish);
  // Eingang
  const fr = std(0x2c303a, 0.5, 0.25); const orange = std(ORANGE, 0.45); g.add(box(0.34, 3.6, 0.8, fr, -door - 0.18, 1.8, hz + 0.1)); g.add(box(0.34, 3.6, 0.8, fr, door + 0.18, 1.8, hz + 0.1)); g.add(box(2 * door + 0.7, 0.34, 0.8, fr, 0, 3.54, hz + 0.1)); g.add(box(2 * door + 1.0, 0.1, 2.4, orange, 0, 3.86, hz + 1.3)); for (const s of [-1, 1]) g.add(cyl(0.05, 0.05, 3.8, fr, s * (door + 0.45), 1.9, hz + 2.4, 8));
  const signT = textSign('STATION TRANQUILITY', { w: 768, h: 96, font: '700 54px "Segoe UI", sans-serif' }); const sign = mesh(new THREE.PlaneGeometry(6.4, 0.8), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.5 }), 0, 4.55, hz + 0.45); sign.userData.keep = true; g.add(sign);
  const doorM = std(0xc9ccd2, 0.4, 0.3); const dL = box(door, 3.3, 0.12, doorM, -door / 2, 1.65, hz + 0.2); const dR = box(door, 3.3, 0.12, doorM, door / 2, 1.65, hz + 0.2); dL.userData.keep = dR.userData.keep = true; g.add(dL, dR);
  // Innenraum
  const roomH = 4.6; const rm = paint({ color: 0xffffff, roughness: 0.6, side: THREE.BackSide }, `col = C(214., 215., 220.); bool fl = P.y < ${(-roomH / 2 + 0.02).toFixed(2)}; bool ce = P.y > ${(roomH / 2 - 0.02).toFixed(2)}; if (fl) col = C(70., 76., 90.); if (ce) col = C(190., 192., 198.); float v = inside(abs(fract(P.x / 3.0) - 0.5) * 3.0 - 0.012) + inside(abs(fract(P.z / 3.0) - 0.5) * 3.0 - 0.012); col *= 1.0 - clamp(v, 0., 1.) * 0.3; if (!fl && !ce) { col = mix(col, C(238., 122., 24.), band(P.y, -1.12, -1.0)); col = mix(col, C(46., 50., 60.), 1.0 - step(-2.12, P.y)); } rough = fl ? 0.28 : 0.6; if (P.z > ${(hz - 0.5).toFixed(2)} && abs(P.x) < ${door.toFixed(2)} && P.y < 3.4) discard;`);
  const room = new THREE.Mesh(new THREE.BoxGeometry(2 * hx - 0.3, roomH, 2 * hz - 0.3), rm); room.position.y = roomH / 2 + 0.09; room.userData.keep = true; g.add(room);
  const lightM = std(0xffffff, 0.4, 0, { emissive: 0xffffff, emissiveIntensity: 1.8 }); for (const x of [-11, -3.7, 3.7, 11]) for (const z of [-4, 4]) { const l = box(4.4, 0.06, 0.5, lightM, x, roomH - 0.05, z); l.userData.keep = true; g.add(l); }
  for (const x of [-8, 8]) { const p = new THREE.PointLight(0xfff6ea, 34, 28, 1.5); p.position.set(x, 3.2, 0); g.add(p); }
  // Blick ins All (Panoramascheibe Nordwand)
  const starC = document.createElement('canvas'); starC.width = 512; starC.height = 128; const sx = starC.getContext('2d'); sx.fillStyle = '#04060f'; sx.fillRect(0, 0, 512, 128); for (let i = 0; i < 260; i++) { sx.fillStyle = `rgba(230,236,255,${0.3 + Math.random() * 0.7})`; sx.fillRect(Math.random() * 512, Math.random() * 128, 1.4, 1.4); } const starT = new THREE.CanvasTexture(starC); starT.colorSpace = THREE.SRGBColorSpace;
  const pano = mesh(new THREE.PlaneGeometry(14, 2), new THREE.MeshBasicMaterial({ map: starT }), 7.5, 2.7, -hz + 0.2); pano.userData.keep = true; g.add(pano); g.add(box(14.3, 0.1, 0.1, fr, 7.5, 3.72, -hz + 0.22)); g.add(box(14.3, 0.1, 0.1, fr, 7.5, 1.68, -hz + 0.22));
  // Terminal mit großem Monitor (Reinigungsstand, von moon.js gezeichnet)
  const screenC = document.createElement('canvas'); screenC.width = 1024; screenC.height = 512; const screenT = new THREE.CanvasTexture(screenC); screenT.colorSpace = THREE.SRGBColorSpace; const screen = mesh(new THREE.PlaneGeometry(5.0, 2.5), new THREE.MeshBasicMaterial({ map: screenT }), -8, 2.75, -hz + 0.34); screen.userData.keep = true; g.add(screen); g.add(box(5.3, 2.8, 0.14, fr, -8, 2.75, -hz + 0.25)); g.add(mesh(boxy(5.2, 0, 1.0, 1.3, 0.1, 6), std(0xd5d5d8, 0.45), -8, 0, -6.6)); g.add(box(3.4, 0.05, 0.7, std(0x1f232c, 0.3, 0.3), -8, 1.03, -6.6));
  // Mondglobus (zeigt geputzte Fläche)
  const gC = document.createElement('canvas'); gC.width = 1024; gC.height = 1024; const gT = new THREE.CanvasTexture(gC); gT.colorSpace = THREE.SRGBColorSpace; const globe = sph(1.45, new THREE.MeshStandardMaterial({ map: gT, roughness: 0.6, emissive: 0x8fa0c8, emissiveIntensity: 0.25, emissiveMap: gT }), 6, 2.25, 1.2, 40); globe.userData.keep = true; g.add(globe); g.add(cyl(0.95, 1.2, 0.7, std(0xd9d9dc, 0.45), 6, 0.35, 1.2, 28)); g.add(cyl(0.45, 0.7, 0.3, dark, 6, 0.8, 1.2, 20)); const halo = mesh(new THREE.TorusGeometry(1.75, 0.02, 8, 60), std(0x6fd8ff, 0.2, 0, { emissive: 0x6fd8ff, emissiveIntensity: 1.8 }), 6, 2.25, 1.2); halo.rotation.x = 1.3; halo.userData.keep = true; g.add(halo);
  // Einrichtung: Spinde, Kisten, Sofa, Kaffeeautomat
  for (let i = 0; i < 6; i++) { g.add(box(0.8, 2.1, 0.55, std(i % 2 ? 0xd9dadd : 0xee7a18, 0.5), -hx + 0.55, 1.05, -5 + i * 0.86)); g.add(box(0.03, 0.2, 0.03, dark, -hx + 0.96, 1.2, -5 + i * 0.86)); }
  g.add(mesh(boxy(3.4, 0, 0.5, 1.1, 0.12, 5), std(0x3a4356, 0.8), hx - 2.0, 0, 5.4)); g.add(mesh(boxy(3.4, 0.2, 1.05, 0.34, 0.12, 5), std(0x3a4356, 0.8), hx - 2.0, 0, 6.05)); g.add(box(0.8, 2, 0.6, std(0x2e323c, 0.4, 0.3), hx - 0.7, 1, 1.5)); g.add(box(0.5, 0.42, 0.04, std(0xffc477, 0.3, 0, { emissive: 0xffa040, emissiveIntensity: 1.0 }), hx - 0.7, 1.45, 1.19));
  // Technikladen hinten rechts: Tresen, Regal mit Bauteilen, Schild
  const tx = hx - 4.2; g.add(mesh(boxy(1.1, -0.4, 1.12, 6.2, 0.12, 7), paint({ color: 0xffffff, roughness: 0.45 }, `col = C(46., 92., 150.); col = mix(col, C(238., 241., 245.), band(P.y, 0.86, 1.2)); col = mix(col, C(238., 122., 24.), band(P.y, 0.74, 0.84));`), tx, 0, -4)); for (const z of [-6.3, -4.1, -1.9]) { g.add(box(0.5, 0.42, 0.7, std(z < -5 ? 0xee7a18 : 0x3a8fd9, 0.5), tx, 1.33, z)); } g.add(cyl(0.2, 0.2, 0.5, std(0xf0efec, 0.35), tx - 0.05, 1.37, -3.0, 14));
  for (const y of [1.0, 2.0, 3.0]) g.add(box(0.7, 0.07, 6.2, dark, hx - 0.62, y, -4)); for (const z of [-7, -4, -1]) g.add(box(0.07, 3.3, 0.7, dark, hx - 0.28, 1.65, z)); for (let i = 0; i < 8; i++) g.add(box(0.5, 0.42, 0.52, std([0xee7a18, 0x3a8fd9, 0xd9dadd, 0x4a505c][i % 4], 0.5), hx - 0.62, 1.25 + (i % 3), -6.4 + i * 0.72));
  const techSign = mesh(new THREE.PlaneGeometry(4.6, 0.6), new THREE.MeshStandardMaterial({ map: textSign('TECHNIKLADEN', { w: 768, h: 100, bg: '#16324f' }), roughness: 0.5, emissive: 0x223344, emissiveIntensity: 0.4 }), tx - 0.2, 3.5, -4); techSign.rotation.y = -Math.PI / 2; techSign.userData.keep = true; g.add(techSign); for (const z of [-5.8, -2.2]) g.add(cyl(0.015, 0.015, 0.9, dark, tx - 0.2, 4.1, z, 6));
  // Upgrade-Station vorn links: Werkbank, Greifarm, Anzeige
  const ux = -12.5; const uz = 6.9; g.add(mesh(boxy(5.2, -0.4, 1.05, 1.2, 0.08, 8), paint({ color: 0xffffff, roughness: 0.42 }, `col = C(70., 74., 86.); col = mix(col, C(238., 122., 24.), band(P.y, 0.82, 0.9)); col = mix(col, C(206., 208., 214.), band(P.y, 0.92, 1.1));`), ux, 0, uz)); g.add(cyl(0.3, 0.4, 0.26, dark, ux + 1.5, 1.18, uz, 16)); const armU = box(0.16, 1.1, 0.16, std(ORANGE, 0.45), ux + 1.5, 1.72, uz - 0.12); armU.rotation.x = -0.32; g.add(armU); const armF = box(1.2, 0.14, 0.14, std(ORANGE, 0.45), ux + 0.95, 2.2, uz - 0.3); armF.rotation.z = -0.28; g.add(armF); g.add(cyl(0.03, 0.08, 0.3, steel0(), ux + 0.4, 1.9, uz - 0.3, 10)); for (let i = 0; i < 3; i++) g.add(box(0.8, 0.05, 0.14, std(i ? 0xdadde0 : ORANGE, 0.35, 0.3), ux - 1.2 + i * 0.3, 1.09, uz - 0.2 + i * 0.16));
  const peg = box(4.6, 1.5, 0.05, std(0x2a3346, 0.6), ux, 2.1, hz - 0.2); g.add(peg); for (let i = 0; i < 4; i++) { const t = toolModel(i % 2 ? 'broom' : 'vac', 0.5); t.position.set(ux - 1.6 + i * 1.05, 1.45, hz - 0.26); t.scale.setScalar(0.62); g.add(t); }
  const upSign = mesh(new THREE.PlaneGeometry(4.4, 0.6), new THREE.MeshStandardMaterial({ map: textSign('UPGRADE-STATION', { w: 768, h: 100, bg: '#40240e' }), roughness: 0.5, emissive: 0x332211, emissiveIntensity: 0.4 }), ux, 3.3, hz - 0.72); upSign.rotation.y = Math.PI; upSign.userData.keep = true; g.add(upSign);
  const s = bake(g); s.userData = { dL, dR, globe, screen, screenC, screenT, gC, gT, halo }; for (const o of [hull, room, dL, dR, sign]) { o.castShadow = true; o.receiveShadow = true; } room.castShadow = false; return s;
}
function steel0() { return std(0xa6abb3, 0.35, 0.65); }
// Nebenmodul mit Verbindungsgang (links neben der Station)
export function buildAnnex() {
  const g = new THREE.Group(); g.add(mesh(boxy(19, -1, 6.6, 13, 1.1, 8), paint({ color: 0xffffff, roughness: 0.42 }, `col = C(240., 239., 236.); float y = P.y; col = mix(col, C(38., 42., 52.), 1.0 - smoothstep(0.5, 0.54, y)); col = mix(col, C(238., 122., 24.), band(y, 4.5, 4.8)); float a = abs(N.z) > 0.7 ? P.x : P.z; float lv = sdRR(vec2(a, y), vec2(0., 5.45), vec2(6.4, 0.34), 0.06); float k = inside(lv) * step(0.7, abs(N.z) + abs(N.x)); col = mix(col, mix(C(26., 30., 38.), C(58., 62., 74.), step(0.7, 0.5 + 0.5 * sin(y * 44.))), k); float w = 1.0; for (int i = -2; i <= 2; i++) w = min(w, sdRR(vec2(a, y), vec2(float(i) * 3.4, 2.6), vec2(0.5, 1.2), 0.12)); float wg = inside(w) * step(0.7, abs(N.z)); col = mix(col, C(92., 158., 206.), wg); rough = mix(rough, 0.12, wg);`)));
  const tube = mesh(boxy(2.6, 0.6, 3.0, 13, 0.2, 5), std(0xe8e7e3, 0.45), 15, 0, 0); tube.rotation.y = Math.PI / 2; g.add(tube); for (let i = 0; i < 3; i++) g.add(cyl(1.0, 1.0, 0.3, std(0x2e323c, 0.5, 0.2), 12 + i * 4, 3.0 - 1.1, 0, 8).rotateZ(0)); return shadows(bake(g));
}

// ---------------- Händler + Verkaufstrichter ----------------
export function hopper() { const g = new THREE.Group(); const lat = [new THREE.Vector2(0.25, 0), new THREE.Vector2(0.3, 0.1), new THREE.Vector2(1.5, 1.0), new THREE.Vector2(1.55, 1.2), new THREE.Vector2(1.46, 1.2), new THREE.Vector2(0.3, 0.2)]; const f = mesh(new THREE.LatheGeometry(lat, 36), std(ORANGE, 0.46, 0.05, { side: THREE.DoubleSide }), 0, 1.5, 0); g.add(f); const ring = mesh(new THREE.TorusGeometry(1.52, 0.05, 10, 40), std(0xf0efec, 0.4), 0, 2.72); ring.rotation.x = Math.PI / 2; g.add(ring); const white = std(0xece9e4, 0.5); const coll = mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 30), std(0x2a2e38, 0.5, 0.3), 0, 1.86); coll.rotation.x = Math.PI / 2; g.add(coll); for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.78; const ax = Math.cos(a); const az = Math.sin(a); const leg = new THREE.Vector3(ax * 0.62, 1.86, az * 0.62).sub(new THREE.Vector3(ax * 1.12, 0, az * 1.12)); const l = cyl(0.06, 0.09, leg.length(), std(0x2a2e38, 0.5, 0.3), ax * 0.87, 0.93, az * 0.87, 8); l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), leg.normalize()); g.add(l); g.add(cyl(0.16, 0.2, 0.08, std(0x2a2e38, 0.5, 0.3), ax * 1.12, 0.04, az * 1.12, 10)); } g.add(cyl(0.24, 0.34, 1.62, white, 0, 0.81, 0, 16)); const b = sph(0.12, std(0xff8a2a, 0.3, 0, { emissive: 0xff7a18, emissiveIntensity: 1.6 }), 0, 3.0, 0, 10); g.add(b); return shadows(g); }
export function buildTrader() {
  const g = new THREE.Group(); const orange = std(ORANGE, 0.45); const dark = std(0x2a2e38, 0.55, 0.3);
  const shop = mesh(boxy(16, -1, 5.2, 7.6, 0.8, 8), paint({ color: 0xffffff, roughness: 0.42 }, `col = C(240., 239., 236.); float y = P.y; col = mix(col, C(38., 42., 52.), 1.0 - smoothstep(0.4, 0.44, y)); col = mix(col, C(238., 122., 24.), band(y, 3.7, 3.92)); float k = step(0.7, N.z); float a = P.x; float dr = sdRR(vec2(a, y), vec2(-4.4, 1.6), vec2(1.7, 1.55), 0.08); float di = inside(dr) * k; col = mix(col, mix(C(238., 122., 24.), C(190., 94., 16.), step(0.5, fract(y * 3.2))), di); float w = sdRR(vec2(a, y), vec2(3.6, 2.0), vec2(3.0, 1.1), 0.12); float wi = inside(w) * k; col = mix(col, C(214., 214., 214.), inside(w - 0.1) * k * (1.0 - wi)); col = mix(col, C(92., 158., 206.), wi); rough = mix(rough, 0.1, wi); float lv = sdRR(vec2(a, y), vec2(0., 4.45), vec2(6.6, 0.24), 0.05); col = mix(col, mix(C(26., 30., 38.), C(58., 62., 74.), step(0.7, 0.5 + 0.5 * sin(y * 44.))), inside(lv) * k);`), 0, 0, -7); g.add(shop);
  // Tank mit Glasdach (links, Bild 1)
  const tank = cyl(3, 3, 6.2, paint({ color: 0xffffff, roughness: 0.42 }, `col = C(240., 239., 236.); col = mix(col, C(238., 122., 24.), band(P.y, 0.9, 1.3)); col = mix(col, C(60., 66., 78.), band(P.y, -2.7, -2.5)); float seam = inside(abs(fract(atan(P.z, P.x) * 1.91) - 0.5) - 0.006); col = mix(col, C(186., 186., 188.), seam);`), -13, 3.1, -7, 40); g.add(tank);
  const dome = cyl(2.9, 2.9, 1.4, std(0x101622, 0.12, 0.3), -13, 6.9, -7, 40); g.add(dome); g.add(cyl(3.05, 3.05, 0.14, std(0xe8e7e3, 0.4), -13, 7.68, -7, 40)); g.add(cyl(3.05, 3.05, 0.12, std(0xe8e7e3, 0.4), -13, 6.26, -7, 40)); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(box(0.08, 1.4, 0.12, std(0xd0d0d4, 0.5), -13 + Math.cos(a) * 2.93, 6.9, -7 + Math.sin(a) * 2.93)); }
  // Tresen mit Vordach, Händler-Schild
  const c = mesh(boxy(8, 0, 1.1, 1.0, 0.1, 7), paint({ color: 0xffffff, roughness: 0.5 }, `col = C(238., 122., 24.); col = mix(col, C(242., 241., 239.), band(P.y, 0.85, 1.2));`), 3.6, 0, -1.0); g.add(c);
  g.add(box(9, 0.14, 3.4, orange, 3.6, 3.4, -1.7)); for (const x of [-0.6, 7.8]) g.add(cyl(0.06, 0.06, 3.4, dark, x, 1.7, -0.25, 8));
  const signT = textSign('HÄNDLER · BÜRSTEN-BERND', { w: 1024, h: 128, font: '800 66px "Segoe UI", sans-serif' }); const sign = mesh(new THREE.PlaneGeometry(8.2, 1.04), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.5 }), 3.6, 4.0, -0.12); sign.userData.keep = true; g.add(sign); const pole = box(8.3, 1.14, 0.1, dark, 3.6, 4.0, -0.2); g.add(pole);
  // Ware im Regal
  for (let i = 0; i < 5; i++) { const tk = i % 2 ? 'broom' : 'vac'; const t = toolModel(tk, 0.8); t.position.set(0.9 + i * 1.3, 0.1, -3.0); t.rotation.x = -0.08; g.add(t); }
  const h = hopper(); h.position.set(8, 0, 1); g.add(h);
  g.add(box(0.8, 0.3, 4.2, dark, 8, 1.76, -1.9)); g.add(cyl(0.05, 0.05, 1.6, dark, 8, 0.8, -3.2, 6));
  return shadows(bake(g));
}
export function buildOutpost(name) { const g = new THREE.Group(); const h = hopper(); h.position.set(4, 0, 4); g.add(h); g.add(mesh(boxy(5, 0, 3.4, 5, 0.6, 7), paint({ color: 0xffffff, roughness: 0.45 }, `col = C(240., 239., 236.); col = mix(col, C(238., 122., 24.), band(P.y, 2.2, 2.45)); col = mix(col, C(38., 42., 52.), 1.0 - smoothstep(0.34, 0.38, P.y));`))); const mast = cyl(0.08, 0.14, 14, std(0x2a2e38, 0.5, 0.3), 0, 7, 0, 8); g.add(mast); g.add(sph(0.22, std(0xff8a2a, 0.3, 0, { emissive: 0xff7a18, emissiveIntensity: 2 }), 0, 14.2, 0, 10)); const signT = textSign(name.toUpperCase(), { w: 768, h: 96, font: '700 50px "Segoe UI", sans-serif' }); const s = mesh(new THREE.PlaneGeometry(4.4, 0.55), new THREE.MeshStandardMaterial({ map: signT, roughness: 0.5 }), 0, 2.85, 2.52); s.userData.keep = true; g.add(s); return shadows(g); }
// Deko am Stützpunkt: Lampen, Solarflächen, Rohr, Fahrbahnlinie
export function buildBaseProps(S, T, garage) {
  const g = new THREE.Group(); const dark = std(0x2a2e38, 0.55, 0.3); const glow = std(0xffffff, 0.3, 0, { emissive: 0xfff2d8, emissiveIntensity: 2.2 });
  for (let i = 0; i < 7; i++) { const x = S.x - 78 + i * 26; const z = S.z + 43; g.add(cyl(0.05, 0.08, 4.2, dark, x, 2.1, z, 8)); g.add(box(0.8, 0.08, 0.2, glow, x, 4.2, z - 0.1)); }
  const pipeM = std(0xdedcd6, 0.5); const pipe = cyl(0.14, 0.14, 46, pipeM, (S.x - 17 + T.x + 10) / 2 - 2, 0.6, S.z + 24, 10); pipe.rotation.z = Math.PI / 2; g.add(pipe); for (let i = 0; i < 9; i++) g.add(box(0.1, 0.6, 0.5, dark, T.x + 14 + i * 5.2, 0.3, S.z + 24));
  for (let i = 0; i < 6; i++) { const panel = box(3.4, 0.06, 2.1, std(0x16233f, 0.22, 0.6), S.x + 34 + (i % 3) * 4.1, 1.4, S.z - 8 + (i > 2 ? 2.8 : 0)); panel.rotation.x = 0.5; g.add(panel); g.add(cyl(0.05, 0.05, 1.3, dark, S.x + 34 + (i % 3) * 4.1, 0.65, S.z - 8 + (i > 2 ? 2.8 : 0), 6)); }
  const line = new THREE.Mesh(new THREE.PlaneGeometry(166, 0.14), std(0xd9b23a, 0.8)); line.rotation.x = -Math.PI / 2; line.position.set(S.x, 0.03, S.z + 34); line.userData.keep = true; line.receiveShadow = true; g.add(line);
  const line2 = line.clone(); line2.position.z = S.z + 31.4; g.add(line2); const line3 = line.clone(); line3.position.z = S.z + 36.6; g.add(line3);
  const pad = new THREE.Mesh(new THREE.RingGeometry(7, 7.25, 64), std(0xd9b23a, 0.8)); pad.rotation.x = -Math.PI / 2; pad.position.set(garage.x, 0.03, garage.z); pad.userData.keep = true; g.add(pad);
  for (let i = 0; i < 4; i++) g.add(box(1.0, 0.7 + (i % 2) * 0.5, 1.0, std(i % 2 ? ORANGE : 0xcfd0d2, 0.6), S.x + 22 + i * 1.3, 0.4, S.z + 12 + (i % 2) * 1.4));
  return shadows(bake(g));
}
// Kristallbrocken (nur mit Bohrer abbaubar)
export function buildCrystal() { const g = new THREE.Group(); const rock = mesh(new THREE.IcosahedronGeometry(1.2, 1), std(0x7d7b8c, 0.95)); rock.scale.set(1.1, 0.72, 1); g.add(rock); const cm = std(0x59c8ff, 0.18, 0.1, { emissive: 0x2fa8ff, emissiveIntensity: 1.3 }); for (let i = 0; i < 7; i++) { const c = mesh(new THREE.ConeGeometry(0.2 + (i % 3) * 0.05, 0.9 + (i % 4) * 0.28, 5), cm); const a = i * 2.399963; c.position.set(Math.cos(a) * 0.5, 0.75, Math.sin(a) * 0.5); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(c); } return shadows(g); }
