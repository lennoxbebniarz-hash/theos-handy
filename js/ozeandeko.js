// Theos Seitenscheidel - Trockne den Ozean aus: Leben und Deko in der Welt. Gras und Blumen (wiegen im Wind), Büsche, Palmen, Felsen an der Küste,
// Ruderboote am Steg und Fischkutter draußen (liegen auf dem Trockenen, wenn das Wasser weg ist), je Ozean ein Schiffswrack und ein Leuchtturm,
// Bojen, Möwen über der Küste, Kiosk mit Markise, Fässern, Kisten und Rettungsring, Laternen am Steg und die Schätze am Meeresboden.
// Viele gleiche Dinge sind Instanzen (ein Zeichenaufruf für tausend Grasbüschel), Einzelstücke sind je Farbe zu einem Netz verschmolzen.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { GRID, bedH, maskAt, meerAt, SCHAETZE, SALZKRISTALLE } from './ozeanmap.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t;
const std = (o) => new THREE.MeshStandardMaterial(o);
function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
// Teile mit Farbe zu einem Netz verschmelzen: list = [[geometrie, farbe, matrix?], ...]
function merged(list) {
  const geos = list.map(([g, col, m]) => { const q = (g.index ? g.toNonIndexed() : g.clone()); if (m) q.applyMatrix4(m); for (const k of Object.keys(q.attributes)) if (k !== 'position' && k !== 'normal') q.deleteAttribute(k); if (!q.attributes.normal) q.computeVertexNormals(); const c = new THREE.Color(col); const n = q.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } q.setAttribute('color', new THREE.BufferAttribute(a, 3)); return q; });
  const g = mergeGeometries(geos); g.computeBoundingSphere(); return g;
}
const M4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V3(sx, sy, sz));
// Wind für Pflanzen: Spitzen schwingen, der Fuß bleibt stehen (je Instanz eigene Phase)
function windy(mat, uTime, bend = 1) {
  mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = uTime; sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    #ifdef USE_INSTANCING
      vec4 ozIp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    #else
      vec4 ozIp = vec4(0.0);
    #endif
    float ozS = sin(uTime * 1.6 + ozIp.x * 0.27 + ozIp.z * 0.21) * 0.6 + sin(uTime * 2.7 + ozIp.x * 0.9) * 0.25; float ozH = max(position.y, 0.0);
    transformed.x += ozS * 0.09 * ozH * ozH * ${bend.toFixed(2)}; transformed.z += ozS * 0.05 * ozH * ozH * ${bend.toFixed(2)};`); };
  return mat;
}

export function buildDeko(W, { HARBOR, POOL, HOUSE, waveY }) {
  const scene = W.scene; const uTime = W.uniforms.uTime; const D = { boats: [], buoys: [], gulls: [], treasures: [[], []], crystals: [[], []], beams: [], lamps: [] };
  let seed = 4242; const R = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const m4 = new THREE.Matrix4(); const qq = new THREE.Quaternion(); const up = V3(0, 1, 0);
  const slope = (x, z) => Math.hypot(bedH(x + 1, z) - bedH(x - 1, z), bedH(x, z + 1) - bedH(x, z - 1)) / 2;
  const nearStuff = (x, z, r = 0) => Math.abs(x - HOUSE.x) < 7 + r && Math.abs(z - HOUSE.z) < 6 + r || Math.hypot(x - POOL.x, z - POOL.z) < POOL.r + 1.5 + r || HARBOR.some((hb) => Math.hypot(x - hb.booth.x, z - hb.booth.z) < 5 + r || segDist(x, z, hb.pier) < 2.2 + r);
  function segDist(x, z, P) { const dx = P.x1 - P.x0; const dz = P.z1 - P.z0; const L2 = dx * dx + dz * dz; const t = clamp(((x - P.x0) * dx + (z - P.z0) * dz) / L2, 0, 1); return Math.hypot(x - P.x0 - dx * t, z - P.z0 - dz * t); }
  const land = (x, z, h0, h1) => { if (x < GRID.x0 + 6 || x > GRID.x1 - 6 || z < GRID.z0 + 6 || z > GRID.z1 - 6) return false; if (maskAt(x, z)) return false; const h = bedH(x, z); return h >= h0 && h <= h1; };
  const place = (n, tries, ok, near = null) => { const out = []; for (let t = 0; t < tries && out.length < n; t++) { let x; let z; if (near && R() < near.k) { const c = near.pts[Math.floor(R() * near.pts.length)]; x = c.x + (R() - 0.5) * near.r * 2; z = c.z + (R() - 0.5) * near.r * 2; } else { x = GRID.x0 + R() * (GRID.x1 - GRID.x0); z = GRID.z0 + R() * (GRID.z1 - GRID.z0); } if (ok(x, z)) out.push({ x, z, y: bedH(x, z) }); } return out; };
  const inst = (geo, mat, list, f, o = {}) => { const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); list.forEach((p, i) => { f(p, i); im.setMatrixAt(i, m4); }); im.count = list.length; im.castShadow = !!o.cast; im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); return im; };
  const hot = { pts: [{ x: HOUSE.x, z: HOUSE.z }, ...HARBOR.map((h) => h.booth), { x: POOL.x, z: POOL.z }], r: 70, k: 0.75 };

  // ---------------- Gras, Blumen, Büsche ----------------
  { const blades = []; for (let b = 0; b < 7; b++) { const a = b / 7 * Math.PI * 2 + R(); const h = 0.32 + R() * 0.3; const lean = 0.06 + R() * 0.12; const w = 0.035; const cx = Math.cos(a) * 0.06; const cz = Math.sin(a) * 0.06; const tx = cx + Math.cos(a) * lean; const tz = cz + Math.sin(a) * lean; const px = -Math.sin(a) * w; const pz = Math.cos(a) * w;
      blades.push([cx - px, 0, cz - pz, cx + px, 0, cz + pz, tx, h, tz]); }
    const pos = new Float32Array(blades.flat()); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); const n = pos.length / 3; const nrm = new Float32Array(n * 3); const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { nrm[i * 3 + 1] = 1; const k = pos[i * 3 + 1] > 0.01 ? 1 : 0; col[i * 3] = lerp(0.12, 0.42, k); col[i * 3 + 1] = lerp(0.24, 0.6, k); col[i * 3 + 2] = lerp(0.06, 0.16, k); } g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeBoundingSphere();
    const list = place(11000, 60000, (x, z) => land(x, z, 1.05, 9) && slope(x, z) < 0.45 && !nearStuff(x, z, 0.5), hot);
    const mat = windy(std({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide }), uTime, 1.6); const tint = new THREE.Color();
    const im = inst(g, mat, list, (p) => { qq.setFromAxisAngle(up, R() * 6.28); const s = 0.75 + R() * 0.8; m4.compose(V3(p.x, p.y - 0.02, p.z), qq, V3(s, s * (0.8 + R() * 0.5), s)); });
    list.forEach((p, i) => { const d = R(); tint.setRGB(0.85 + d * 0.3, 0.9 + d * 0.2, 0.7 + d * 0.3); if (R() < 0.18) tint.setRGB(1.25, 1.15, 0.6); im.setColorAt(i, tint); }); im.instanceColor.needsUpdate = true; D.grass = im;
    // Blumen: kleine bunte Köpfe auf Stielen
    const fl = place(1600, 20000, (x, z) => land(x, z, 1.1, 6) && slope(x, z) < 0.3 && !nearStuff(x, z, 1), hot); const headG = merged([[new THREE.CylinderGeometry(0.008, 0.008, 0.34, 4), 0x3a6a22, M4(0, 0.17, 0)], [new THREE.OctahedronGeometry(0.045, 0), 0xffffff, M4(0, 0.36, 0)], [new THREE.OctahedronGeometry(0.04, 0), 0xffffff, M4(0.05, 0.3, 0.02)]]);
    const fim = inst(headG, windy(std({ vertexColors: true, roughness: 0.7 }), uTime, 2.2), fl, (p) => { qq.setFromAxisAngle(up, R() * 6.28); const s = 0.8 + R() * 0.6; m4.compose(V3(p.x, p.y - 0.02, p.z), qq, V3(s, s, s)); });
    const FC = [0xf2d03a, 0xe85a4a, 0xf4f4f0, 0xb07ae8, 0x5aa0f0, 0xff9a3a]; fl.forEach((p, i) => { fim.setColorAt(i, tint.setHex(FC[Math.floor(R() * FC.length)])); }); fim.instanceColor.needsUpdate = true;
    // Büsche
    const bg = new THREE.IcosahedronGeometry(1, 2); { const p = bg.attributes.position; const c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)); const f = 0.8 + 0.25 * Math.sin(v.x * 7 + v.y * 5) * Math.sin(v.z * 6); v.multiplyScalar(f); v.y = Math.max(-0.2, v.y) * 0.75 + 0.55; p.setXYZ(i, v.x, v.y, v.z); const k = clamp(v.y / 1.3, 0, 1); c[i * 3] = lerp(0.1, 0.3, k); c[i * 3 + 1] = lerp(0.2, 0.46, k); c[i * 3 + 2] = lerp(0.06, 0.14, k); } bg.setAttribute('color', new THREE.BufferAttribute(c, 3)); bg.computeVertexNormals(); }
    const bl = place(320, 20000, (x, z) => land(x, z, 1.3, 14) && slope(x, z) < 0.6 && !nearStuff(x, z, 2)); inst(bg, windy(std({ vertexColors: true, roughness: 0.85 }), uTime, 0.15), bl, (p) => { qq.setFromAxisAngle(up, R() * 6.28); const s = 0.5 + R() * 0.9; m4.compose(V3(p.x, p.y - 0.15, p.z), qq, V3(s * (1 + R() * 0.4), s, s)); W.circles.push({ x: p.x, z: p.z, r: s * 0.7, veh: true }); }, { cast: true });
  }

  // ---------------- Palmen (Stamm mit Ringen, Wedel wiegen im Wind, Kokosnüsse) ----------------
  { const trunk = []; const segs = 9; for (let s = 0; s < segs; s++) { const y0 = s * 0.7; const bendX = (y) => Math.pow(y / 6.3, 2) * 1.1; const r0 = 0.22 - s * 0.012; const cg = new THREE.CylinderGeometry(r0 * 0.92, r0, 0.7, 8, 1).translate(0, 0.35, 0); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) + y0; p.setXYZ(i, p.getX(i) + bendX(y), y, p.getZ(i)); } trunk.push([cg, s % 2 ? 0x7a5a3a : 0x6a4c30]); }
    trunk.push([new THREE.SphereGeometry(0.13, 8, 6), 0x5a3a1a, M4(1.0, 6.05, 0.15)], [new THREE.SphereGeometry(0.13, 8, 6), 0x5a3a1a, M4(1.15, 6.0, -0.12)], [new THREE.SphereGeometry(0.13, 8, 6), 0x4a3016, M4(0.95, 5.98, -0.05)]);
    const trunkG = merged(trunk);
    const fronds = []; for (let k = 0; k < 9; k++) { const fg = new THREE.PlaneGeometry(0.9, 3.3, 4, 10).translate(0, 1.65, 0); const p = fg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); const y = p.getY(i); const u = y / 3.3; const w = Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u * 0.3); p.setXYZ(i, x * w * 1.1, y, -Math.pow(u, 1.8) * 1.9 + Math.abs(x) * 0.35); } fg.rotateX(Math.PI / 2 - 0.35 - R() * 0.25); fg.rotateY(k / 9 * Math.PI * 2 + R() * 0.3); fg.translate(1.1, 6.2, 0); fronds.push([fg, k % 2 ? 0x2f6a24 : 0x3a7a2a]); }
    const frondG = merged(fronds); const list = place(170, 8000, (x, z) => land(x, z, 0.45, 5.5) && !nearStuff(x, z, 6) && (meerAt(x, z) >= 0 || R() < 0.25));
    const tm = std({ vertexColors: true, roughness: 0.85 }); const fm = windy(std({ vertexColors: true, roughness: 0.75, side: THREE.DoubleSide }), uTime, 0.08);
    const xf = list.map(() => ({ ry: R() * 6.28, s: 0.75 + R() * 0.5 }));
    inst(trunkG, tm, list, (p, i) => { qq.setFromAxisAngle(up, xf[i].ry); m4.compose(V3(p.x, p.y - 0.1, p.z), qq, V3(xf[i].s, xf[i].s, xf[i].s)); W.circles.push({ x: p.x, z: p.z, r: 0.32 * xf[i].s, veh: true }); }, { cast: true });
    inst(frondG, fm, list, (p, i) => { qq.setFromAxisAngle(up, xf[i].ry); m4.compose(V3(p.x, p.y - 0.1, p.z), qq, V3(xf[i].s, xf[i].s, xf[i].s)); }, { cast: true });
  }

  // ---------------- Felsen an der Küste ----------------
  { const rg = new THREE.IcosahedronGeometry(1, 1); { const p = rg.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.72 + Math.abs(Math.sin(p.getX(i) * 4.1 + p.getY(i) * 3.3 + p.getZ(i) * 2.7)) * 0.45; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.7, p.getZ(i) * f); } rg.computeVertexNormals(); }
    const list = place(300, 30000, (x, z) => { const h = bedH(x, z); return h > -1.8 && h < 1.6 && Math.abs(meerAt(x, z)) < 2 && meerAt(x, z) >= 0 && !nearStuff(x, z, 3); });
    const rm = std({ color: 0x8a8278, roughness: 0.92 }); inst(rg, rm, list, (p) => { qq.setFromEuler(new THREE.Euler(R() * 0.4, R() * 6.28, R() * 0.4)); const s = 0.4 + R() * 1.4; m4.compose(V3(p.x, p.y + s * 0.15, p.z), qq, V3(s, s, s)); if (p.y > 0.3) W.circles.push({ x: p.x, z: p.z, r: s * 0.8, veh: true }); }, { cast: true });
  }

  // ---------------- Boote ----------------
  const hullG = (L, H, Wd) => new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(L / 2, H, Wd / 2);
  function rowboat(col) { return merged([[hullG(3.2, 0.55, 1.3), col], [hullG(3.0, 0.5, 1.15).scale(1, 0.98, 1), 0xd8d0c0, M4(0, 0.03, 0)], [new THREE.BoxGeometry(0.12, 0.06, 1.1), 0x8a6a48, M4(0.5, -0.12, 0)], [new THREE.BoxGeometry(0.12, 0.06, 1.0), 0x8a6a48, M4(-0.6, -0.15, 0)], [new THREE.TorusGeometry(0.04, 0.012, 4, 8), 0x9aa0a6, M4(1.55, 0.02, 0, Math.PI / 2)]]); }
  function kutter(col) {
    return merged([[hullG(9, 1.8, 3.2), col], [hullG(8.6, 1.5, 2.9), 0xe8e4dc, M4(0, 0.1, 0)], [new THREE.BoxGeometry(8.4, 0.08, 2.8), 0x8a6a48, M4(0, -0.05, 0)], [new THREE.BoxGeometry(2.0, 1.6, 2.0), 0xf2f0ea, M4(-1.2, 0.8, 0)], [new THREE.BoxGeometry(2.1, 0.12, 2.1), col, M4(-1.2, 1.66, 0)], [new THREE.BoxGeometry(2.02, 0.45, 1.6), 0x1a2a3a, M4(-1.2, 1.1, 0)],
      [new THREE.CylinderGeometry(0.07, 0.09, 5.2, 6), 0xd8d4c8, M4(1.6, 2.6, 0)], [new THREE.CylinderGeometry(0.05, 0.05, 3.2, 6), 0xd8d4c8, M4(2.6, 1.6, 0, 0, 0, Math.PI / 2 - 0.5)], [new THREE.BoxGeometry(0.3, 0.3, 0.3), 0xf9bd00, M4(3.4, 0.25, 0.6)], [new THREE.TorusGeometry(0.28, 0.07, 6, 14), 0xee7a18, M4(-0.19, 0.9, 1.02)]]);
  }
  const boatMat = std({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
  const addBoat = (geo, m, x, z, h, draft, roll) => { const g = new THREE.Mesh(geo, boatMat); g.castShadow = true; g.receiveShadow = true; scene.add(g); D.boats.push({ g, m, x, z, h, draft, roll, ph: R() * 6.28, y: 0 }); };
  HARBOR.forEach((hb, m) => { for (const side of [-1, 1]) { const a = hb.pierLen - 6 - (side + 1) * 4; const x = hb.pier.x0 + Math.sin(hb.pierYaw) * a + Math.cos(hb.pierYaw) * side * 2.6; const z = hb.pier.z0 + Math.cos(hb.pierYaw) * a - Math.sin(hb.pierYaw) * side * 2.6; addBoat(rowboat(side < 0 ? 0x2a62c8 : 0xc5161d), m, x, z, hb.pierYaw + Math.PI / 2, 0.35, 0.22 * side); } });
  const KC = [0xc5161d, 0x0a4f9c, 0x00815a, 0xee7a18, 0x2a2f3a, 0xf9bd00]; for (let m = 0; m < 2; m++) { const pts = place(m ? 5 : 7, 20000, (x, z) => maskAt(x, z) === m + 1 && bedH(x, z) < -2.6 && bedH(x, z) > -8.5 && Math.hypot(x - HARBOR[m].booth.x, z - HARBOR[m].booth.z) > 50); pts.forEach((p) => addBoat(kutter(KC[Math.floor(R() * KC.length)]), m, p.x, p.z, R() * 6.28, 1.2, (R() < 0.5 ? -1 : 1) * (0.25 + R() * 0.2))); }

  // ---------------- Schiffswrack (je Ozean, tief unten) ----------------
  for (let m = 0; m < 2; m++) { const p = place(1, 40000, (x, z) => maskAt(x, z) === m + 1 && bedH(x, z) < -7.2 && bedH(x, z) > -9.5 && SCHAETZE[m].every((s) => Math.hypot(s.x - x, s.z - z) > 10))[0]; if (!p) continue;
    const parts = [[hullG(16, 3.4, 5.4), 0x4a3422], [new THREE.BoxGeometry(14, 0.15, 4.6), 0x6a4a2e, M4(0, -0.3, 0)], [new THREE.CylinderGeometry(0.22, 0.3, 9, 8), 0x5a4028, M4(2, 3.6, 0, 0.2, 0, 0.35)], [new THREE.CylinderGeometry(0.2, 0.26, 5, 8), 0x5a4028, M4(-3, 1.8, 0.3, -0.4, 0, -0.6)], [new THREE.BoxGeometry(3, 2, 4.4), 0x5a3e26, M4(-6, 0.6, 0, 0, 0, 0.15)]];
    for (let k = -5; k <= 5; k++) parts.push([new THREE.TorusGeometry(2.5, 0.1, 5, 14, Math.PI), 0x3a2818, M4(k * 1.2 + 1.5, 0.15, 0, 0, Math.PI / 2, Math.PI)]);
    const g = new THREE.Mesh(merged(parts), std({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide })); g.position.set(p.x, p.y + 0.6, p.z); g.rotation.set(0.12, R() * 6.28, 0.42); g.castShadow = true; g.receiveShadow = true; scene.add(g); W.circles.push({ x: p.x, z: p.z, r: 6, veh: true }); D.wreck = (D.wreck || []).concat({ g, m, x: p.x, z: p.z }); }

  // ---------------- Leuchtturm (je Ozean, auf einer Landspitze) ----------------
  HARBOR.forEach((hb, m) => { const p = place(1, 60000, (x, z) => land(x, z, 0.6, 3.2) && !maskAt(x, z) && [[4, 0], [-4, 0], [0, 4], [0, -4]].filter(([a, b]) => maskAt(x + a, z + b) === m + 1).length >= 2 && Math.hypot(x - hb.booth.x, z - hb.booth.z) > 70 && Math.hypot(x - hb.booth.x, z - hb.booth.z) < 170 && !nearStuff(x, z, 8))[0]; if (!p) return;
    const parts = [[new THREE.CylinderGeometry(2.4, 2.8, 1.2, 16), 0x8a8a84, M4(0, 0.6, 0)]]; for (let k = 0; k < 6; k++) { const r0 = 1.9 - k * 0.12; parts.push([new THREE.CylinderGeometry(r0 - 0.12, r0, 2.2, 16), k % 2 ? 0xc5161d : 0xf5f6f4, M4(0, 1.2 + k * 2.2 + 1.1, 0)]); }
    parts.push([new THREE.CylinderGeometry(1.6, 1.6, 0.25, 16), 0x24272c, M4(0, 14.55, 0)], [new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), 0x24272c, M4(0, 15.5, 0)], [new THREE.ConeGeometry(1.25, 1.4, 16), 0xc5161d, M4(0, 16.9, 0)], [new THREE.TorusGeometry(1.55, 0.05, 4, 24), 0x24272c, M4(0, 15.3, 0, Math.PI / 2)]);
    const g = new THREE.Mesh(merged(parts), std({ vertexColors: true, roughness: 0.6 })); g.position.set(p.x, p.y - 0.2, p.z); g.castShadow = true; g.receiveShadow = true; scene.add(g); W.circles.push({ x: p.x, z: p.z, r: 2.9, veh: true });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 1.4, 14), std({ color: 0xfff4c0, emissive: 0xffe08a, emissiveIntensity: 0.4, roughness: 0.2, transparent: true, opacity: 0.85 })); lamp.position.set(p.x, p.y + 15.4, p.z); scene.add(lamp);
    const beamM = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); const beam = new THREE.Group(); beam.position.copy(lamp.position); scene.add(beam);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(4.5, 60, 16, 1, true).translate(0, -30, 0), beamM); c.rotation.z = s * Math.PI / 2; beam.add(c); }
    const light = new THREE.PointLight(0xffe0a0, 0, 40, 1.6); light.position.copy(lamp.position); scene.add(light); D.beams.push({ beam, beamM, lamp, light }); D.lighthouses = (D.lighthouses || []).concat({ x: p.x, z: p.z, m }); });

  // ---------------- Bojen ----------------
  { const bg = merged([[new THREE.CylinderGeometry(0.35, 0.45, 0.8, 12), 0xc5161d, M4(0, 0, 0)], [new THREE.CylinderGeometry(0.36, 0.36, 0.25, 12), 0xf5f6f4, M4(0, 0.2, 0)], [new THREE.ConeGeometry(0.3, 0.6, 12), 0xc5161d, M4(0, 0.7, 0)], [new THREE.SphereGeometry(0.1, 8, 6), 0xf9bd00, M4(0, 1.05, 0)]]);
    HARBOR.forEach((hb, m) => { for (let k = 0; k < 5; k++) { const a = 30 + k * 16; const side = (k % 2 ? 1 : -1) * (8 + k * 2); const x = hb.pier.x0 + hb.dir.x * a - hb.dir.z * side; const z = hb.pier.z0 + hb.dir.z * a + hb.dir.x * side; if (maskAt(x, z) !== m + 1) continue; const g = new THREE.Mesh(bg, boatMat); g.castShadow = true; scene.add(g); D.buoys.push({ g, m, x, z, ph: R() * 6.28, roll: (R() - 0.5) * 2 }); } }); }

  // ---------------- Möwen über der Küste ----------------
  { const body = merged([[new THREE.SphereGeometry(0.18, 10, 8), 0xf4f4f0, M4(0, 0, 0, 0, 0, 0, 1, 0.85, 2)], [new THREE.SphereGeometry(0.1, 8, 6), 0xf4f4f0, M4(0, 0.1, 0.36)], [new THREE.ConeGeometry(0.03, 0.14, 6), 0xf0a020, M4(0, 0.08, 0.5, Math.PI / 2)], [new THREE.PlaneGeometry(0.2, 0.22), 0x9aa2aa, M4(0, 0.02, -0.42, -Math.PI / 2)]]);
    const wingG = merged([[new THREE.PlaneGeometry(0.72, 0.26).translate(0.36, 0, 0), 0x9aa2aa, M4(0, 0, 0, -Math.PI / 2)], [new THREE.PlaneGeometry(0.2, 0.22).translate(0.82, 0, 0), 0x1a1a1e, M4(0, 0, 0, -Math.PI / 2)]]); const gm = std({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
    HARBOR.forEach((hb, m) => { for (let k = 0; k < 6; k++) { const g = new THREE.Group(); g.add(new THREE.Mesh(body, gm)); const wl = new THREE.Mesh(wingG, gm); wl.position.set(0.12, 0.06, 0.02); const wr = new THREE.Mesh(wingG, gm); wr.position.set(-0.12, 0.06, 0.02); wr.scale.x = -1; g.add(wl, wr); g.scale.setScalar(1.3); scene.add(g);
      D.gulls.push({ g, wl, wr, cx: hb.pier.x1 + hb.dir.x * (10 + R() * 50) + (R() - 0.5) * 40, cz: hb.pier.z1 + hb.dir.z * (10 + R() * 50) + (R() - 0.5) * 40, r: 8 + R() * 14, h: 9 + R() * 9, w: (R() < 0.5 ? -1 : 1) * (0.25 + R() * 0.2), ph: R() * 6.28 }); } }); }

  // ---------------- Kiosk: Markise, Fässer, Kisten, Rettungsring; Laternen am Steg ----------------
  { const awn = ctex(256, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f5f6f4' : '#0a4f9c'; c.fillRect(i * 32, 0, 32, h); } c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(0, h - 8, w, 8); });
    const ring = ctex(128, 16, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#f5f6f4' : '#ee5a18'; c.fillRect(i * 16, 0, 16, h); } }); ring.wrapS = THREE.RepeatWrapping;
    const label = ctex(256, 64, (c, w, h) => { c.fillStyle = '#2a62c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#f5f6f4'; c.font = '800 40px Bahnschrift'; c.textAlign = 'center'; c.fillText('H₂O', w / 2, 46); }); label.wrapS = THREE.RepeatWrapping; label.repeat.set(2, 1);
    const barrelM = [std({ map: label, roughness: 0.5, metalness: 0.3 }), std({ color: 0x1c3f86, roughness: 0.5, metalness: 0.3 }), std({ color: 0x1c3f86, roughness: 0.5, metalness: 0.3 })]; const crateG = merged([[new THREE.BoxGeometry(0.8, 0.6, 0.6), 0xa07a50], [new THREE.BoxGeometry(0.84, 0.08, 0.64), 0x7a5a38, M4(0, 0.2, 0)], [new THREE.BoxGeometry(0.84, 0.08, 0.64), 0x7a5a38, M4(0, -0.2, 0)]]); const crateM = std({ vertexColors: true, roughness: 0.85 });
    const lampG = merged([[new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), 0x24272c, M4(0, 1.3, 0)], [new THREE.BoxGeometry(0.32, 0.06, 0.32), 0x24272c, M4(0, 2.62, 0)], [new THREE.BoxGeometry(0.3, 0.05, 0.3), 0x24272c, M4(0, 3.0, 0)]]); const lampM = std({ vertexColors: true, roughness: 0.5, metalness: 0.4 }); const glowM = std({ color: 0xfff0c0, emissive: 0xffd890, emissiveIntensity: 0, roughness: 0.3 }); D.glowM = glowM;
    HARBOR.forEach((hb) => { const k = hb.k; if (!k) return;
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.3), std({ map: awn, roughness: 0.8, side: THREE.DoubleSide })); aw.position.set(0, 2.45, 2.15); aw.rotation.x = -0.95; aw.castShadow = true; k.add(aw);
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 14), barrelM); b.position.set(2.5 + (i % 2) * 0.7, 0.45, 0.8 - i * 0.7); b.rotation.y = i; b.castShadow = true; k.add(b); }
      for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(crateG, crateM); c.position.set(-2.6 - (i % 2) * 0.85, 0.3 + Math.floor(i / 2) * 0.6, -0.5 + (i % 2) * 0.1); c.rotation.y = (i * 0.37) % 0.6; c.castShadow = true; k.add(c); }
      const lb = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 8, 20), std({ map: ring, roughness: 0.6 })); lb.position.set(2.08, 1.6, 0.2); lb.rotation.y = Math.PI / 2; k.add(lb);
      k.updateMatrixWorld(true); for (const c of [k.localToWorld(V3(2.5, 0, 0.45)), k.localToWorld(V3(-2.6, 0, -0.2))]) W.circles.push({ x: c.x, z: c.z, r: 0.9, veh: true });
      const P = hb.pier; for (let a = 4; a < hb.pierLen; a += 7) for (const side of [-1, 1]) { const x = P.x0 + Math.sin(hb.pierYaw) * a + Math.cos(hb.pierYaw) * side * (P.w / 2 - 0.05); const z = P.z0 + Math.cos(hb.pierYaw) * a - Math.sin(hb.pierYaw) * side * (P.w / 2 - 0.05); const l = new THREE.Mesh(lampG, lampM); l.position.set(x, P.y, z); scene.add(l); const gl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.24), glowM); gl.position.set(x, P.y + 2.8, z); scene.add(gl); }
      const pl = new THREE.PointLight(0xffd890, 0, 26, 1.6); pl.position.set((P.x0 + P.x1) / 2, P.y + 3, (P.z0 + P.z1) / 2); scene.add(pl); D.lamps.push(pl); });
  }

  // ---------------- Schätze am Meeresboden ----------------
  { const gold = 0xe0b050; const wood = 0x6a4428; const iron = 0x4a4c50;
    const G = { truhe: merged([[new THREE.BoxGeometry(0.9, 0.5, 0.6), wood, M4(0, 0.25, 0)], [new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI), wood, M4(0, 0.5, 0, 0, 0, Math.PI / 2)], [new THREE.BoxGeometry(0.94, 0.06, 0.64), gold, M4(0, 0.12, 0)], [new THREE.BoxGeometry(0.94, 0.06, 0.64), gold, M4(0, 0.48, 0)], [new THREE.BoxGeometry(0.12, 0.16, 0.05), gold, M4(0, 0.45, 0.32)], [new THREE.SphereGeometry(0.08, 6, 4), gold, M4(0.32, 0.6, 0.05)], [new THREE.SphereGeometry(0.07, 6, 4), gold, M4(0.42, 0.58, -0.1)]]),
      flasche: merged([[new THREE.CylinderGeometry(0.11, 0.11, 0.42, 10), 0x2a7a4a, M4(0, 0.11, 0, 0, 0, Math.PI / 2)], [new THREE.CylinderGeometry(0.04, 0.06, 0.16, 8), 0x2a7a4a, M4(0.28, 0.11, 0, 0, 0, Math.PI / 2)], [new THREE.CylinderGeometry(0.035, 0.035, 0.06, 8), 0xa07a50, M4(0.38, 0.11, 0, 0, 0, Math.PI / 2)], [new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), 0xf2ead2, M4(0, 0.11, 0, 0, 0, Math.PI / 2)]]),
      anker: merged([[new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8), iron, M4(0, 0.06, 0, 0, 0, Math.PI / 2 - 0.15)], [new THREE.TorusGeometry(0.5, 0.06, 6, 16, Math.PI), iron, M4(-0.7, 0.06, 0, -Math.PI / 2, 0, Math.PI / 2)], [new THREE.TorusGeometry(0.15, 0.04, 6, 12), iron, M4(0.86, 0.06, 0, Math.PI / 2)], [new THREE.BoxGeometry(0.06, 0.06, 0.8), iron, M4(0.55, 0.06, 0)]]),
      krone: merged([[new THREE.CylinderGeometry(0.28, 0.25, 0.22, 16, 1, true), gold, M4(0, 0.11, 0)], ...[0, 1, 2, 3, 4, 5].map((k) => [new THREE.ConeGeometry(0.06, 0.2, 6), gold, M4(Math.cos(k * 1.047) * 0.27, 0.3, Math.sin(k * 1.047) * 0.27)]), ...[0, 1, 2].map((k) => [new THREE.OctahedronGeometry(0.05, 0), [0xc5161d, 0x2a62c8, 0x00815a][k], M4(Math.cos(k * 2.09) * 0.27, 0.12, Math.sin(k * 2.09) * 0.27)])]) };
    const tm = std({ vertexColors: true, roughness: 0.35, metalness: 0.45, side: THREE.DoubleSide });
    const sp = ctex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,250,210,1)'); g.addColorStop(0.3, 'rgba(255,220,120,.6)'); g.addColorStop(1, 'rgba(255,200,80,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,230,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 2); c.lineTo(32, 62); c.moveTo(2, 32); c.lineTo(62, 32); c.stroke(); });
    SCHAETZE.forEach((list, m) => list.forEach((s, n) => { const g = new THREE.Mesh(G[s.kind], tm); g.position.set(s.x, s.bed - 0.05, s.z); g.rotation.y = (n * 2.39) % 6.28; g.rotation.z = (n % 3 - 1) * 0.1; g.castShadow = true; scene.add(g);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sp, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); spr.position.set(s.x, s.bed + 0.9, s.z); spr.scale.setScalar(0.9); spr.visible = false; scene.add(spr); D.treasures[m].push({ g, spr, s, m, n, taken: false }); })); }

  // Salzkristalle: weiße Kristallhaufen am Meeresboden (Meersalz für den Skillbaum), glitzern bläulich, sobald sie trocken liegen
  { const salt = 0xf4f7fb; const blue = 0xd8ecff;
    const geo = merged([[new THREE.OctahedronGeometry(0.22, 0), salt, M4(0, 0.16, 0, 0.3, 0.2, 0, 1, 1.6, 1)], [new THREE.OctahedronGeometry(0.16, 0), blue, M4(0.24, 0.11, 0.08, -0.4, 0.8, 0.3, 1, 1.5, 1)], [new THREE.OctahedronGeometry(0.14, 0), salt, M4(-0.2, 0.09, 0.14, 0.5, 1.2, -0.3, 1, 1.4, 1)], [new THREE.OctahedronGeometry(0.12, 0), blue, M4(-0.06, 0.08, -0.24, -0.2, 0.4, 0.5, 1, 1.5, 1)], [new THREE.CylinderGeometry(0.42, 0.5, 0.04, 9), salt, M4(0, 0.01, 0)]]);
    const cm = std({ vertexColors: true, roughness: 0.18, metalness: 0.05, emissive: 0x9fc8ff, emissiveIntensity: 0.12 });
    const sp = ctex(64, 64, (c, w, h) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(190,225,255,.6)'); g.addColorStop(1, 'rgba(150,200,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(235,245,255,.9)'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 4); c.lineTo(32, 60); c.moveTo(4, 32); c.lineTo(60, 32); c.stroke(); });
    SALZKRISTALLE.forEach((list, m) => list.forEach((s, n) => { const g = new THREE.Mesh(geo, cm); g.position.set(s.x, s.bed - 0.02, s.z); g.rotation.y = (n * 1.7) % 6.28; g.scale.setScalar(0.9 + s.k * 0.7); g.castShadow = true; scene.add(g);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: sp, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); spr.position.set(s.x, s.bed + 0.6, s.z); spr.visible = false; scene.add(spr); D.crystals[m].push({ g, spr, s, m, n, taken: false }); })); }

  // ---------------- Bewegung ----------------
  D.setCrystals = (S) => { for (const list of D.crystals) for (const c of list) { const taken = !!(S.kristall && S.kristall[c.m].includes(c.n)); c.taken = taken; c.g.visible = !taken; } };
  D.setTreasures = (S) => { for (const list of D.treasures) for (const t of list) { const taken = S.schatz[t.m].includes(t.n); t.taken = taken; t.g.visible = !taken; } };
  D.update = (t, dt, cam, S) => {
    const lv = W.levels; const night = W.night;
    for (const b of D.boats) { const far = Math.hypot(b.x - cam.x, b.z - cam.z) > 260; b.g.visible = !far; if (far) continue; const bed = bedH(b.x, b.z); const dep = lv[b.m] - bed; const float = dep > b.draft; const want = float ? lv[b.m] + waveY(b.x, b.z, t, dep) - b.draft * 0.35 : bed + b.draft * 0.25; b.y = b.y ? lerp(b.y, want, Math.min(1, dt * 2)) : want;
      const k = clamp((dep - b.draft * 0.3) / (b.draft * 0.7), 0, 1); b.g.position.set(b.x, b.y, b.z); b.g.rotation.set(Math.sin(t * 0.9 + b.ph) * 0.03 * k, b.h, lerp(b.roll, Math.sin(t * 1.1 + b.ph) * 0.05, k)); }
    for (const b of D.buoys) { const bed = bedH(b.x, b.z); const dep = lv[b.m] - bed; const fl = dep > 0.45; b.g.position.set(b.x, fl ? lv[b.m] + waveY(b.x, b.z, t, dep) + 0.05 : bed + 0.3, b.z); b.g.rotation.set(fl ? Math.sin(t * 1.4 + b.ph) * 0.12 : 1.2 * Math.sign(b.roll), b.ph, fl ? Math.cos(t * 1.2 + b.ph) * 0.12 : 0); }
    for (const q of D.gulls) { const far = Math.hypot(q.cx - cam.x, q.cz - cam.z) > 220; q.g.visible = !far; if (far) continue; const a = t * q.w + q.ph; q.g.position.set(q.cx + Math.cos(a) * q.r, q.h + Math.sin(t * 0.7 + q.ph) * 1.2, q.cz + Math.sin(a) * q.r); q.g.rotation.set(0, Math.atan2(-Math.sin(a) * Math.sign(q.w), Math.cos(a) * Math.sign(q.w)), -0.25 * Math.sign(q.w)); const f = Math.sin(t * 9 + q.ph) * (Math.sin(t * 0.5 + q.ph) > -0.3 ? 0.6 : 0.08); q.wl.rotation.z = f; q.wr.rotation.z = -f; }
    for (const L of D.beams) { L.beam.rotation.y = t * 0.6; L.beamM.opacity = night ? 0.13 : 0; L.light.intensity = night ? 30 : 0; L.lamp.material.emissiveIntensity = night ? 3 : 0.3; }
    if (D.glowM) D.glowM.emissiveIntensity = W.dusk ? 2.5 : 0; for (const l of D.lamps) l.intensity = W.dusk ? 18 : 0;
    for (const list of D.crystals) for (const cr of list) { if (cr.taken) { cr.spr.visible = false; continue; } const free = lv[cr.m] < cr.s.bed + 0.05; const dd = Math.hypot(cr.s.x - cam.x, cr.s.z - cam.z); cr.spr.visible = free && dd < 90 && dd > 1.2; if (cr.spr.visible) { const tw = 0.55 + 0.45 * Math.sin(t * 5 + cr.n * 1.3); cr.spr.material.opacity = tw * Math.min(1, (dd - 1.2) / 5); cr.spr.scale.setScalar(0.45 + tw * 0.45); } }
    for (const list of D.treasures) for (const tr of list) { if (tr.taken) { tr.spr.visible = false; continue; } const free = lv[tr.m] < tr.s.bed + 0.05; const dd = Math.hypot(tr.s.x - cam.x, tr.s.z - cam.z); tr.spr.visible = free && dd < 120 && dd > 1.2; if (tr.spr.visible) { const tw = 0.6 + 0.4 * Math.sin(t * 4 + tr.n); tr.spr.material.opacity = tw * Math.min(1, (dd - 1.2) / 5); tr.spr.scale.setScalar(0.6 + tw * 0.6); tr.spr.position.y = tr.s.bed + 0.8 + Math.sin(t * 2 + tr.n) * 0.15; } }
  };
  return D;
}
