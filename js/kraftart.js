// Theos Seitenscheidel - Kraftprobe: Werkhof bei Abendsonne, drei Schlagplätze, die zehn Ziele und ihr Zerbrechen. Gleiche Bildkette wie im Rennmodus (Himmel, Sonne, Schatten, racepost).
// Jedes Ziel ist schon beim Bauen in Splitter zerlegt (Voronoi-Zellen, mit Fase extrudiert). Solange es heil ist, liegen die Splitter lückenlos aneinander; beim Treffer fliegen sie einzeln.
import * as THREE from './vendor/three.module.min.js';
import { buildTextures } from './racetex.js';
import { bakeSky, moodOf, sunVector } from './racesky.js';
import { surface } from './racemat.js';
import { spriteBlend } from './raceinterior.js';

export const STATION_X = [-2.6, 0, 2.6]; export const TOP = 0.9; // Oberkante der Säulen
export const SEAT_COL = ['#e5483c', '#3f86e8', '#f0b52a']; const SEAT_HEX = [0xe5483c, 0x3f86e8, 0xf0b52a];
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// ---------------- kleine Hilfen ----------------
function rand(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
function noise2(seed) { const r = rand(seed); const N = 64; const g = new Float32Array(N * N); for (let i = 0; i < g.length; i++) g[i] = r(); const at = (x, y) => g[((y % N + N) % N) * N + ((x % N + N) % N)]; return (x, y) => { const xi = Math.floor(x); const yi = Math.floor(y); const fx = x - xi; const fy = y - yi; const sx = fx * fx * (3 - 2 * fx); const sy = fy * fy * (3 - 2 * fy); const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx; const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx; return a + (b - a) * sy; }; }
const fbm = (n, x, y, o = 4) => { let v = 0; let a = 0.5; let f = 1; for (let i = 0; i < o; i++) { v += n(x * f, y * f) * a; a *= 0.5; f *= 2; } return v; };
function canvasTex(w, h, paint, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const img = x.createImageData(w, h); paint(img.data, w, h); x.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
const mix = (a, b, k) => a + (b - a) * k; const sat = (v) => Math.max(0, Math.min(1, v));
function px(d, i, r, g, b) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; }

// ---------------- Oberflächen (einmal gerechnet, dann geteilt) ----------------
const TEX = {};
function tex(key) {
  if (TEX[key]) return TEX[key]; const n = noise2(key.length * 977 + key.charCodeAt(0)); let t;
  if (key === 'fichte' || key === 'eiche') { const dark = key === 'eiche'; t = canvasTex(512, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w; const v = y / h; const warp = fbm(n, u * 3, v * 9) * 3; const ring = Math.sin((v * (dark ? 46 : 30) + warp) * Math.PI); const k = sat(0.5 + ring * 0.5); const fl = fbm(n, u * 40, v * 3, 2); const knot = Math.max(0, 1 - Math.hypot((u - 0.3) * 6, (v - 0.55) * 3)) * (dark ? 0.6 : 0.3); const l = mix(dark ? 0.62 : 0.86, dark ? 0.42 : 0.68, k) * (0.92 + fl * 0.16) - knot * 0.3; px(d, (y * w + x) * 4, 255 * l * (dark ? 0.78 : 1.0), 255 * l * (dark ? 0.55 : 0.78), 255 * l * (dark ? 0.34 : 0.52)); } }); }
  if (key === 'ziegel') t = canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = fbm(n, x / 18, y / 18); const sp = n(x * 0.9, y * 0.9) > 0.93 ? 0.7 : 1; const l = (0.78 + f * 0.3) * sp; px(d, (y * w + x) * 4, 210 * l, 98 * l, 58 * l); } });
  if (key === 'granit') t = canvasTex(256, 256, (d, w, h) => { const r = rand(5); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = fbm(n, x / 24, y / 24); const s = r(); const k = s > 0.9 ? 0.35 : s > 0.75 ? 1.25 : s > 0.68 ? 1.05 : 0.85; const l = (0.55 + f * 0.25) * k; const pink = s > 0.68 && s < 0.75 ? 1 : 0; px(d, (y * w + x) * 4, 255 * Math.min(1, l * (1 + pink * 0.25)), 255 * Math.min(1, l * 0.98), 255 * Math.min(1, l * (1.02 - pink * 0.1))); } });
  if (key === 'kohle' || key === 'kohleGlut') { const glow = key === 'kohleGlut'; t = canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = fbm(n, x / 20, y / 20, 5); const crack = Math.abs(fbm(n, x / 38 + 9, y / 38 + 3, 4) - 0.5); const vein = sat(1 - crack * 22); if (glow) px(d, (y * w + x) * 4, 255 * vein, 110 * vein * vein, 20 * vein * vein * vein); else { const l = 0.07 + f * 0.09; px(d, (y * w + x) * 4, 255 * l, 255 * l, 255 * l * 1.05); } } }); }
  if (key === 'marmor') t = canvasTex(512, 512, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w; const v = y / h; const q = fbm(n, u * 4, v * 4, 5); const vein = Math.abs(Math.sin((u * 3 + v * 1.4 + q * 2.6) * Math.PI)); const grey = sat(1 - vein * 9); const gold = sat(1 - Math.abs(Math.sin((u * 1.2 - v * 0.8 + q * 1.9) * Math.PI)) * 16); const l = 0.93 - grey * 0.32 + (fbm(n, u * 30, v * 30, 2) - 0.5) * 0.04; px(d, (y * w + x) * 4, 255 * mix(l, 0.86, gold), 255 * mix(l, 0.66, gold), 255 * mix(l * 1.01, 0.28, gold)); } });
  if (key === 'mond' || key === 'mondGlut') { const glow = key === 'mondGlut'; t = canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = fbm(n, x / 16, y / 16, 5); const crater = Math.max(0, 1 - Math.hypot(((x % 96) - 48) / 30, ((y % 80) - 40) / 26)); const vein = sat(1 - Math.abs(fbm(n, x / 30 + 4, y / 30, 4) - 0.5) * 26); if (glow) px(d, (y * w + x) * 4, 60 * vein, 230 * vein, 255 * vein); else { const l = 0.36 + f * 0.24 - crater * 0.08; px(d, (y * w + x) * 4, 255 * l, 255 * l * 0.98, 255 * l * 1.04); } } }); }
  if (key === 'eis') t = canvasTex(256, 256, (d, w, h) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const f = fbm(n, x / 14, y / 14, 4); const crack = sat(1 - Math.abs(fbm(n, x / 40, y / 40, 3) - 0.5) * 30); const l = 0.04 + f * 0.1 + crack * 0.25; px(d, (y * w + x) * 4, 255 * l, 255 * l, 255 * l); } }, false);
  if (key === 'banner') t = null;
  TEX[key] = t; return t;
}
const MATS = {};
function material(key) {
  if (MATS[key]) return MATS[key]; let m;
  if (key === 'fichte') m = new THREE.MeshStandardMaterial({ map: tex('fichte'), roughness: 0.78 });
  if (key === 'eiche') m = new THREE.MeshStandardMaterial({ map: tex('eiche'), roughness: 0.62 });
  if (key === 'ziegel') m = new THREE.MeshStandardMaterial({ map: tex('ziegel'), roughness: 0.86 });
  if (key === 'eis') m = new THREE.MeshPhysicalMaterial({ color: 0xeef9ff, roughness: 0.03, roughnessMap: tex('eis'), transmission: 1, thickness: 0.18, ior: 1.31, attenuationColor: new THREE.Color(0xbfe6ff), attenuationDistance: 1.6, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2, emissive: new THREE.Color(0.02, 0.05, 0.08) });
  if (key === 'granit') m = new THREE.MeshStandardMaterial({ map: tex('granit'), roughness: 0.58, envMapIntensity: 0.8 });
  if (key === 'kohle') m = new THREE.MeshStandardMaterial({ map: tex('kohle'), emissiveMap: tex('kohleGlut'), emissive: new THREE.Color(5, 1.6, 0.4), roughness: 0.55, metalness: 0.15 });
  if (key === 'marmor') m = new THREE.MeshPhysicalMaterial({ map: tex('marmor'), roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.1 });
  if (key === 'stahl') m = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.32, metalness: 1, envMapIntensity: 1.2 });
  if (key === 'stahlGlut') m = new THREE.MeshStandardMaterial({ color: 0x7a7d82, roughness: 0.4, metalness: 1, emissive: new THREE.Color(2.4, 0.35, 0.05), envMapIntensity: 1 });
  if (key === 'gold') m = new THREE.MeshStandardMaterial({ color: 0xffc94a, roughness: 0.16, metalness: 1, envMapIntensity: 1.5, side: THREE.DoubleSide });
  if (key === 'sockel') m = new THREE.MeshStandardMaterial({ color: 0x2a1c14, roughness: 0.5 });
  if (key === 'mond') m = new THREE.MeshStandardMaterial({ map: tex('mond'), emissiveMap: tex('mondGlut'), emissive: new THREE.Color(0.4, 2.6, 3.4), roughness: 0.9 });
  MATS[key] = m; return m;
}

// ---------------- Zerlegen: Voronoi-Zellen in einer Fläche, extrudiert ----------------
function clip(poly, nx, nz, c) { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i]; const b = poly[(i + 1) % poly.length]; const da = a[0] * nx + a[1] * nz - c; const db = b[0] * nx + b[1] * nz - c; if (da <= 0) out.push(a); if ((da < 0) !== (db < 0)) { const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; }
function cells(domain, sites, sx = 1) {
  const D = domain.map(([x, z]) => [x * sx, z]); const S = sites.map(([x, z]) => [x * sx, z]); const res = [];
  for (let i = 0; i < S.length; i++) { let p = D; for (let j = 0; j < S.length && p.length > 2; j++) { if (i === j) continue; const nx = S[j][0] - S[i][0]; const nz = S[j][1] - S[i][1]; const c = (nx * (S[i][0] + S[j][0]) + nz * (S[i][1] + S[j][1])) / 2; p = clip(p, nx, nz, c); } if (p.length > 2) res.push(p.map(([x, z]) => [x / sx, z])); }
  return res;
}
const rect = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
// Prisma aus einem Umriss (x, z) von y0 bis y1, Kanten gefast. Mittelpunkt wird zum Ursprung des Splitters.
function prism(poly, y0, y1, mat, uv = 1, bevel = 0.004) {
  const sh = new THREE.Shape(); poly.forEach(([x, z], i) => (i ? sh.lineTo(x, -z) : sh.moveTo(x, -z))); const h = y1 - y0; const bt = Math.min(bevel, h * 0.3);
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.0005, h - 2 * bt), bevelEnabled: bt > 0, bevelThickness: bt, bevelSize: bt, bevelOffset: -bt, bevelSegments: 1, curveSegments: 1 }); g.rotateX(-Math.PI / 2); g.translate(0, y0 + bt, 0);
  const a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * uv, a.getY(i) * uv);
  g.computeBoundingBox(); const c = g.boundingBox.getCenter(V3()); g.translate(-c.x, -c.y, -c.z); g.computeVertexNormals(); g.computeBoundingSphere();
  const m = new THREE.Mesh(g, mat); m.position.copy(c); m.castShadow = true; m.receiveShadow = true; return m;
}
// Splitter einer Platte. sites: Bruchpunkte (x, z); layers: waagrechte Schichten
function slab(group, domain, sites, y0, y1, mat, o = {}) { const L = o.layers || 1; const out = []; for (let k = 0; k < L; k++) { const a = y0 + (y1 - y0) * k / L; const b = y0 + (y1 - y0) * (k + 1) / L; for (const c of cells(domain, sites, o.sx || 1)) { const m = prism(c, a, b, mat, o.uv || 1, o.bevel); group.add(m); out.push(m); } } return out; }
function scatter(r, n, w, d, cx = 0, spread = 1) { const s = []; for (let i = 0; i < n; i++) s.push([cx + (r() - 0.5) * w * spread, (r() - 0.5) * d]); return s; }
// Sägezahn um die Mitte: zwei große Hälften und viele Splitter in der Bruchzone
function breakSites(r, w, d, big = 2, small = 6, zone = 0.14) { const s = [[-w * 0.3, (r() - 0.5) * d * 0.4], [w * 0.3, (r() - 0.5) * d * 0.4]]; if (big > 2) s.push([-w * 0.12, d * 0.3], [w * 0.13, -d * 0.3]); for (let i = 0; i < small; i++) s.push([(r() - 0.5) * zone * 2, (r() - 0.5) * d * 0.95]); return s; }

// ---------------- die zehn Ziele ----------------
// Rückgabe: { group, pieces, top (Oberkante), gap (halber Säulenabstand), fx }
export function buildTarget(id, seed = 1) {
  const r = rand(seed * 7919 + id.length * 31); const g = new THREE.Group(); let pieces = []; let top = TOP; let gap = 0.42; let fx = 'stein';
  const y = (h) => [top, (top += h)];
  if (id === 'latten') { fx = 'holz'; for (let i = 0; i < 3; i++) { const [a, b] = y(0.028); pieces.push(...slab(g, rect(1.18, 0.2), breakSites(r, 1.18, 0.2, 2, 5, 0.1), a, b, material('fichte'), { sx: 0.25, uv: 1.4 })); top += 0.004; } }
  if (id === 'bohle') { fx = 'holz'; const [a, b] = y(0.09); pieces = slab(g, rect(1.2, 0.3), breakSites(r, 1.2, 0.3, 2, 8, 0.12), a, b, material('eiche'), { sx: 0.3, uv: 1.2, bevel: 0.01 }); }
  if (id === 'ziegel') { fx = 'ziegel'; for (let i = 0; i < 5; i++) { const [a, b] = y(0.022); pieces.push(...slab(g, rect(1.0, 0.36), breakSites(r, 1.0, 0.36, 3, 5, 0.18), a, b, material('ziegel'), { uv: 3 })); const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.3), material('eiche')); sp.position.set(0.33 * (i % 2 ? -1 : 1), top + 0.006, 0); sp.castShadow = true; if (i < 4) { g.add(sp); pieces.push(sp); } top += 0.012; } }
  if (id === 'eis') { fx = 'eis'; gap = 0.36; const [a, b] = y(0.3); pieces = slab(g, rect(0.86, 0.38), [...breakSites(r, 0.86, 0.38, 3, 6, 0.16), ...scatter(r, 5, 0.86, 0.38)], a, b, material('eis'), { layers: 2, uv: 2, bevel: 0.008 }); }
  if (id === 'pflaster') { fx = 'stein'; gap = 0.34; for (let i = 0; i < 3; i++) { const [a, b] = y(0.11); pieces.push(...slab(g, rect(0.82, 0.3), breakSites(r, 0.82, 0.3, 3, 4, 0.14), a, b, material('granit'), { uv: 2.4, bevel: 0.012 })); top += 0.003; } }
  if (id === 'kohle') { fx = 'glut'; gap = 0.33; const hull = []; for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; hull.push([Math.cos(a) * (0.42 + r() * 0.05), Math.sin(a) * (0.2 + r() * 0.04)]); } const [a, b] = y(0.26); pieces = slab(g, hull, [...breakSites(r, 0.8, 0.36, 3, 5, 0.16), ...scatter(r, 4, 0.8, 0.36)], a, b, material('kohle'), { layers: 2, uv: 2, bevel: 0.012 }); }
  if (id === 'marmor') { fx = 'stein'; const [a, b] = y(0.07); pieces = slab(g, rect(1.12, 0.42), breakSites(r, 1.12, 0.42, 3, 9, 0.2), a, b, material('marmor'), { uv: 0.9, bevel: 0.006 }); }
  if (id === 'scheibe') { fx = 'metall'; gap = 0.3; for (let k = 0; k < 2; k++) { const [a, b] = y(0.034); const seg = 7 + Math.floor(r() * 3); const lens = []; for (let i = 0; i < seg; i++) lens.push(0.7 + r() * 0.6); const sum = lens.reduce((x, v) => x + v, 0); let ang = r() * 6.283; for (let i = 0; i < seg; i++) { const a0 = ang; const a1 = ang + Math.PI * 2 * lens[i] / sum; ang = a1; /* Stücke ergeben genau einen ganzen Kreis */ const poly = []; const R0 = 0.11; const R1 = 0.33; const st = 6; for (let j = 0; j <= st; j++) { const t = a0 + (a1 - a0) * j / st; poly.push([Math.cos(t) * R1, Math.sin(t) * R1]); } for (let j = st; j >= 0; j--) { const t = a0 + (a1 - a0) * j / st; poly.push([Math.cos(t) * R0, Math.sin(t) * R0]); } const m = prism(poly, a, b, material(k ? 'stahl' : 'stahlGlut'), 1, 0.003); g.add(m); pieces.push(m); } top += 0.006; } }
  if (id === 'pokal') { fx = 'gold'; gap = 0.3; const [a, b] = y(0.05); pieces = slab(g, rect(0.8, 0.3), breakSites(r, 0.8, 0.3, 2, 6, 0.12), a, b, material('sockel'), { sx: 0.3, uv: 1 }); const prof = [[0, 0], [0.11, 0], [0.11, 0.025], [0.03, 0.05], [0.025, 0.16], [0.07, 0.2], [0.13, 0.3], [0.15, 0.42], [0.14, 0.44]].map(([x, yy]) => new THREE.Vector2(x, yy)); const n = 6; for (let i = 0; i < n; i++) { const geo = new THREE.LatheGeometry(prof, 6, (i / n) * Math.PI * 2, Math.PI * 2 / n); geo.computeBoundingBox(); const c = geo.boundingBox.getCenter(V3()); geo.translate(-c.x, -c.y, -c.z); const m = new THREE.Mesh(geo, material('gold')); m.position.set(c.x, c.y + top, c.z); m.castShadow = true; g.add(m); pieces.push(m); } for (const s of [1, -1]) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 8, 20, Math.PI * 1.2), material('gold')); h.position.set(s * 0.15, top + 0.33, 0); h.rotation.z = s > 0 ? -Math.PI * 0.6 : Math.PI * 1.6; h.castShadow = true; g.add(h); pieces.push(h); } top += 0.44; }
  if (id === 'mond') { fx = 'mond'; gap = 0.32; const hull = []; for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; hull.push([Math.cos(a) * (0.4 + r() * 0.07), Math.sin(a) * (0.24 + r() * 0.05)]); } const [a, b] = y(0.34); pieces = slab(g, hull, [...breakSites(r, 0.8, 0.44, 3, 6, 0.18), ...scatter(r, 6, 0.8, 0.44)], a, b, material('mond'), { layers: 3, uv: 2.2, bevel: 0.016 }); for (const p of pieces) { p.rotation.y = (r() - 0.5) * 0.04; } }
  for (const p of pieces) { p.userData.home = p.position.clone(); p.userData.homeQ = p.quaternion.clone(); }
  return { group: g, pieces, top, gap, fx };
}

// ---------------- Splitter, Staub, Funken ----------------
const DUST = { holz: 0xc9a77a, ziegel: 0xc4734c, eis: 0xe8f6ff, stein: 0xbab4ac, glut: 0x3a302a, metall: 0x8a8a88, gold: 0xffe08a, mond: 0x9ab0c0 };
const SPARK = { glut: [6, 2.2, 0.5], metall: [6, 4, 1.6], gold: [5, 4, 1.4], mond: [0.8, 4, 6], eis: [3, 4, 5] };
function softDot() { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t; }
export function createDebris(scene) {
  const dot = softDot(); const D = { flying: [], parts: [] };
  const dustMat = (col) => { const m = new THREE.SpriteMaterial({ map: dot, color: col, transparent: true, depthWrite: false, opacity: 0.6 }); return m; };
  const sparkMat = (rgb) => new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(...rgb), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  D.shatter = (tgt, at, power, slow) => { // tgt: Ziel, at: Treffpunkt (Welt), power 0..1
    for (const p of tgt.pieces) { const w = V3(); p.getWorldPosition(w); const dir = w.clone().sub(at); dir.y *= 0.4; const dist = Math.max(0.05, dir.length()); dir.normalize(); const sp = (1.4 + Math.random() * 2.2) * (0.7 + power * 0.6) / Math.sqrt(dist + 0.2); p.userData.v = V3(dir.x * sp, -0.6 - Math.random() * 1.6 + (Math.abs(w.x - at.x) > 0.25 ? 1.2 : 0), dir.z * sp + (Math.random() - 0.3) * 1.2); p.userData.w = V3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 14); p.userData.rad = p.geometry.boundingSphere ? p.geometry.boundingSphere.radius * 0.45 : 0.03; p.userData.rest = 0; D.flying.push(p); }
    const n = { holz: 26, ziegel: 40, eis: 34, stein: 46, glut: 30, metall: 18, gold: 20, mond: 40 }[tgt.fx] || 30;
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(dustMat(DUST[tgt.fx] || 0xbbbbbb)); s.position.copy(at).add(V3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.3)); const sc = 0.08 + Math.random() * 0.18; s.scale.set(sc, sc, 1); s.userData = { v: V3((Math.random() - 0.5) * 2.4, Math.random() * 1.6, (Math.random() - 0.3) * 1.8), life: 1.2 + Math.random() * 1.4, t: 0, grow: 0.5 + Math.random(), kind: 'dust', base: 0.55 }; scene.add(s); D.parts.push(s); }
    const sp = SPARK[tgt.fx]; if (sp) for (let i = 0; i < 60; i++) { const s = new THREE.Sprite(sparkMat(sp)); s.position.copy(at); const sc = 0.02 + Math.random() * 0.03; s.scale.set(sc, sc, 1); const a = Math.random() * Math.PI * 2; const v = 2 + Math.random() * 5; s.userData = { v: V3(Math.cos(a) * v, 1 + Math.random() * 4, Math.sin(a) * v * 0.6 + 1), life: 0.5 + Math.random() * 0.9, t: 0, kind: 'spark', base: 1 }; scene.add(s); D.parts.push(s); }
    if (slow) D.slow = slow;
  };
  D.chips = (at, fx) => { for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(dustMat(DUST[fx] || 0xbbbbbb)); s.position.copy(at); const sc = 0.04 + Math.random() * 0.08; s.scale.set(sc, sc, 1); s.userData = { v: V3((Math.random() - 0.5) * 1.6, 0.5 + Math.random() * 1.4, Math.random() * 1.2), life: 0.7 + Math.random() * 0.6, t: 0, grow: 0.3, kind: 'dust', base: 0.5 }; scene.add(s); D.parts.push(s); } };
  D.update = (dt, solids) => {
    for (let i = D.flying.length - 1; i >= 0; i--) { const p = D.flying[i]; const u = p.userData; if (u.rest > 0.6) { D.flying.splice(i, 1); continue; } u.v.y -= 9.8 * dt; p.position.addScaledVector(u.v, dt); p.rotation.x += u.w.x * dt; p.rotation.y += u.w.y * dt; p.rotation.z += u.w.z * dt; const wp = p.parent.localToWorld(p.position.clone()); let floor = u.rad; for (const s of solids) if (Math.abs(wp.x - s.x) < s.hw && Math.abs(wp.z - s.z) < s.hd && wp.y > s.top - 0.15) floor = Math.max(floor, s.top + u.rad); if (wp.y < floor) { const dy = floor - wp.y; p.position.y += dy; if (u.v.y < 0) u.v.y = -u.v.y * 0.28; u.v.x *= 0.62; u.v.z *= 0.62; u.w.multiplyScalar(0.55); if (Math.abs(u.v.y) < 0.4) { u.v.y = 0; u.rest += dt; } } }
    for (let i = D.parts.length - 1; i >= 0; i--) { const s = D.parts[i]; const u = s.userData; u.t += dt; if (u.t >= u.life) { scene.remove(s); s.material.dispose(); D.parts.splice(i, 1); continue; } const k = u.t / u.life; if (u.kind === 'dust') { u.v.multiplyScalar(Math.exp(-dt * 2.2)); u.v.y += 0.15 * dt; const sc = s.scale.x * (1 + u.grow * dt); s.scale.set(sc, sc, 1); s.material.opacity = u.base * (1 - k) * Math.min(1, u.t * 8); } else { u.v.y -= 9.8 * dt; if (s.position.y < 0.02 && u.v.y < 0) { u.v.y *= -0.35; u.v.x *= 0.5; u.v.z *= 0.5; } s.material.opacity = 1 - k * k; } s.position.addScaledVector(u.v, dt); }
  };
  D.clear = () => { for (const s of D.parts) { scene.remove(s); s.material.dispose(); } D.parts = []; D.flying = []; };
  return D;
}

// ---------------- Kraftring über dem Ziel ----------------
export function createRing() {
  const g = new THREE.Group(); g.renderOrder = 10; const mk = (geo, col, op = 1, add = false) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthTest: false, depthWrite: false, side: THREE.DoubleSide, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); m.renderOrder = 10; g.add(m); return m; };
  const S = 0.5; // Ring 1 = 50 cm
  const zone = mk(new THREE.RingGeometry(0.98, 1, 96), 0xffffff, 0.16); const target = mk(new THREE.RingGeometry(0.965, 1.035, 96), new THREE.Color(2.2, 1.9, 1.2), 0.95); const outer = mk(new THREE.RingGeometry(0.93, 1, 128), new THREE.Color(3, 0.5, 0.35), 1, true); const halo = mk(new THREE.RingGeometry(0.86, 1.06, 96), new THREE.Color(1, 0.2, 0.1), 0.28, true); const dot = mk(new THREE.CircleGeometry(0.02, 20), 0xffffff, 0.8);
  const ticks = []; for (let i = 0; i < 4; i++) { const t = mk(new THREE.PlaneGeometry(0.012, 0.07), new THREE.Color(2.2, 1.9, 1.2), 0.9); ticks.push(t); }
  const api = { group: g, S, flash: 0 };
  let zoneKey = '';
  api.set = (r, rt, tol, inZone, time) => { const green = inZone; const c = outer.material.color; if (green) c.setRGB(0.4, 3.4, 1.2); else c.setRGB(3.2, 0.55, 0.38); halo.material.color.copy(c).multiplyScalar(0.35); outer.scale.setScalar(r * S); halo.scale.setScalar(r * S); target.scale.setScalar(rt * S); const key = tol.toFixed(3); if (key !== zoneKey) { zoneKey = key; zone.geometry.dispose(); zone.geometry = new THREE.RingGeometry(Math.max(0.01, (0.36 - tol) / (0.36 + tol)), 1, 96); } zone.scale.setScalar((rt + tol) * S); zone.material.opacity = green ? 0.32 : 0.14 + 0.06 * Math.sin(time * 6); ticks.forEach((t, i) => { const a = i * Math.PI / 2; const rr = rt * S; t.position.set(Math.cos(a) * rr, Math.sin(a) * rr, 0); t.rotation.z = a + Math.PI / 2; }); const f = api.flash; outer.material.opacity = 1; if (f > 0) { halo.material.opacity = 0.28 + f * 0.6; } else halo.material.opacity = green ? 0.42 : 0.24; };
  return api;
}

// ---------------- Werkhof ----------------
function bannerTex(text, col) { const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#1b1612'; x.fillRect(0, 0, 256, 512); x.fillStyle = col; x.fillRect(16, 0, 224, 470); x.beginPath(); x.moveTo(16, 470); x.lineTo(128, 512); x.lineTo(240, 470); x.fill(); x.fillStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 6; i++) x.fillRect(16, 60 + i * 70, 224, 6); x.fillStyle = '#fff6e6'; x.font = '700 64px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.save(); x.translate(128, 250); x.rotate(-Math.PI / 2); x.fillText(text.toUpperCase(), 0, 22); x.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function signTex() { const c = document.createElement('canvas'); c.width = 1024; c.height = 192; const x = c.getContext('2d'); x.fillStyle = '#2b1d14'; x.fillRect(0, 0, 1024, 192); x.strokeStyle = '#c99a4a'; x.lineWidth = 10; x.strokeRect(14, 14, 996, 164); x.fillStyle = '#f2c46a'; x.font = '700 112px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText('KRAFTPROBE', 512, 136); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
let SKY = null;
export function buildKraftWorld(renderer, { shadows = true, shadowSize = 2048 } = {}) {
  const T = buildTextures(renderer); const mood = { ...moodOf('hard'), vol: 0.1, fogD: 0.0016, fogH: 30, exposure: 0.94, sat: 1.1 }; /* wenig Dunst, sonst färbt die Abendsonne alles orange */ if (!SKY) SKY = bakeSky(renderer, mood, 5); const sky = SKY; const sunDir = sunVector(mood);
  const scene = new THREE.Scene(); scene.background = sky.cube; scene.environment = sky.env; scene.environmentIntensity = 0.85;
  const sun = new THREE.DirectionalLight(mood.sun, mood.sunI * 0.85); sun.castShadow = shadows; sun.shadow.mapSize.set(shadowSize, shadowSize); const sc = sun.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 1; sc.far = 60; sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.position.copy(sunDir).multiplyScalar(25); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  scene.add(new THREE.HemisphereLight(0xffd9b0, 0x3a2a20, 0.35));
  // Boden: Steinplatten, dahinter Kies
  const floor = surface(T.rock, { color: 0x9a8e80, roughness: 0.95, normal: 0.9 }); const fg = new THREE.PlaneGeometry(14, 8); fg.rotateX(-Math.PI / 2); { const a = fg.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * 4.2, a.getY(i) * 2.4); } const fm = new THREE.Mesh(fg, floor); fm.position.set(0, 0, -0.6); fm.receiveShadow = true; scene.add(fm);
  const outer = surface(T.gravel, { color: 0x8a7a66, roughness: 1 }); const og = new THREE.PlaneGeometry(400, 400); og.rotateX(-Math.PI / 2); { const a = og.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i) * 60, a.getY(i) * 60); } const om = new THREE.Mesh(og, outer); om.position.y = -0.01; om.receiveShadow = true; scene.add(om);
  const joint = new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 1 }); for (let i = -7; i <= 7; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.004, 8), joint); l.position.set(i, 0.002, -0.6); scene.add(l); } for (let j = -4; j <= 4; j++) { const l = new THREE.Mesh(new THREE.BoxGeometry(14, 0.004, 0.025), joint); l.position.set(0, 0.002, -0.6 + j); scene.add(l); }
  // Rückwand aus Holz mit Schild und Bannern
  const wood = new THREE.MeshStandardMaterial({ map: tex('eiche'), color: 0x8a6a50, roughness: 0.8 }); const wall = new THREE.Group(); scene.add(wall);
  for (let i = -7; i <= 7; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.98, 3.2, 0.08), wood); p.position.set(i, 1.6, -3.6); p.castShadow = true; p.receiveShadow = true; wall.add(p); }
  for (const yy of [0.5, 2.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(15, 0.16, 0.12), wood); b.position.set(0, yy, -3.5); b.castShadow = true; wall.add(b); }
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.98), wood); p.position.set(sx * 7.45, 1.3, -3.1 + k); p.castShadow = true; p.receiveShadow = true; wall.add(p); } // Seitenzäune schließen den Hof
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshStandardMaterial({ map: signTex(), roughness: 0.6, emissive: 0x2a1a08 })); sign.position.set(0, 2.95, -3.5); wall.add(sign);
  const SEAT = ['Rot', 'Blau', 'Gelb']; STATION_X.forEach((x, i) => { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 1.5), new THREE.MeshStandardMaterial({ map: bannerTex(SEAT[i], SEAT_COL[i]), roughness: 0.9, side: THREE.DoubleSide })); b.position.set(x, 1.85, -3.53); wall.add(b); });
  // Fackeln mit Licht und Flammen
  const torches = []; const dot = softDot(); for (const x of [-3.9, -1.3, 1.3, 3.9]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.7, 10), wood); post.position.set(x, 0.85, -2.4); post.castShadow = true; scene.add(post); const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.12, 14), new THREE.MeshStandardMaterial({ color: 0x2a2624, metalness: 0.8, roughness: 0.5 })); bowl.position.set(x, 1.74, -2.4); scene.add(bowl); const light = new THREE.PointLight(0xff8a3a, 3, 7, 1.6); light.position.set(x, 2.0, -2.4); scene.add(light); const flames = []; for (let k = 0; k < 5; k++) { const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: new THREE.Color(5, 1.8 + k * 0.2, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); f.position.set(x, 1.86, -2.4); scene.add(f); flames.push(f); } torches.push({ x, light, flames, ph: Math.random() * 10 }); }
  // Schlagplätze: zwei Säulen je Platz, Name im Boden
  const stone = surface(T.rock, { color: 0x8c8378, roughness: 0.9, normal: 1.2 }); const cap = surface(T.rock, { color: 0x6e665e, roughness: 0.8, normal: 1 }); const stations = STATION_X.map((x, i) => { const g = new THREE.Group(); g.position.x = x; scene.add(g); const cols = []; for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.3, TOP - 0.06, 0.4), stone); c.position.set(s * 0.42, (TOP - 0.06) / 2, 0); c.castShadow = true; c.receiveShadow = true; g.add(c); const t = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.46), cap); t.position.set(s * 0.42, TOP - 0.03, 0); t.castShadow = true; t.receiveShadow = true; g.add(t); cols.push(c, t); } const mark = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.68, 64), new THREE.MeshStandardMaterial({ color: SEAT_HEX[i], roughness: 0.6, emissive: SEAT_HEX[i], emissiveIntensity: 0.25 })); mark.rotation.x = -Math.PI / 2; mark.position.set(0, 0.004, -0.78); g.add(mark); return { x, group: g, cols, seat: i }; });
  // Kulisse: Fässer und Holzstapel am Rand
  const barrel = new THREE.MeshStandardMaterial({ color: 0x6a4428, roughness: 0.7 }); for (const [x, z] of [[-5.6, -2.6], [-5.1, -3.0], [5.4, -2.8], [6.0, -2.2]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.86, 18), barrel); b.position.set(x, 0.43, z); b.castShadow = true; b.receiveShadow = true; scene.add(b); }
  const logs = new THREE.MeshStandardMaterial({ map: tex('fichte'), roughness: 0.85 }); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.6, 12), logs); l.rotation.z = Math.PI / 2; l.position.set(-5.6 + (i % 3) * 0.02, 0.11 + Math.floor(i / 3) * 0.2, -2.3 + (i % 3) * 0.23 - Math.floor(i / 3) * 0.11 + 0.1); l.castShadow = true; l.receiveShadow = true; scene.add(l); }
  const update = (t) => { for (const q of torches) { const f = 0.75 + Math.sin(t * 11 + q.ph) * 0.12 + Math.sin(t * 23 + q.ph * 2) * 0.08; q.light.intensity = 3.2 * f; q.flames.forEach((s, k) => { const u = (t * 1.6 + k / 5 + q.ph) % 1; s.position.set(q.x + Math.sin(t * 7 + k) * 0.03, 1.82 + u * 0.32, -2.4 + Math.cos(t * 5 + k) * 0.02); const sc = (0.26 - u * 0.18) * f; s.scale.set(sc, sc * 1.35, 1); s.material.opacity = 1 - u; }); } };
  return { scene, sky, sun, sunDir, mood, stations, update };
}
