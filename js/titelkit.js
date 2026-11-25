// Theos Seitenscheidel - Startbildschirme: gemeinsame Bausteine für die 3D-Titelszenen (titelludwig, titelstrom, titelozean, titelbruno).
// Formen, gezeichnete Texturen, Himmel, Spiegelungen, weiche Teilchen (Rauch, Funken, Tropfen) und das Zusammenfassen fester Teile.
// Alles entsteht im Code, keine Dateien, kein Netz.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const TAU = Math.PI * 2;
export function rng(seed = 1) { let s = (seed >>> 0) % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// ---------------- Rauschen (für Fels, Asche, Dünen) ----------------
const hash3 = (x, y, z) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
export function noise3(x, y, z) {
  const i = Math.floor(x); const j = Math.floor(y); const k = Math.floor(z);
  const s = (t) => t * t * (3 - 2 * t); const u = s(x - i); const v = s(y - j); const w = s(z - k);
  const at = (a, b, c) => hash3(i + a, j + b, k + c);
  return lerp(lerp(lerp(at(0, 0, 0), at(1, 0, 0), u), lerp(at(0, 1, 0), at(1, 1, 0), u), v),
    lerp(lerp(at(0, 0, 1), at(1, 0, 1), u), lerp(at(0, 1, 1), at(1, 1, 1), u), v), w);
}
export function fbm3(x, y, z, oct = 4) {
  let sum = 0; let amp = 0.5; let f = 1; let norm = 0;
  for (let o = 0; o < oct; o++) { sum += noise3(x * f + o * 17.3, y * f + o * 9.1, z * f + o * 4.7) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
  return sum / norm;
}

// ---------------- Material, Netze, Formen ----------------
export const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, ...o });
export const glowMat = (color, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });
export function mesh(geo, mat, parent, pos = [0, 0, 0], rot = null, scale = null) {
  const m = new THREE.Mesh(geo, mat); m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) { if (typeof scale === 'number') m.scale.setScalar(scale); else m.scale.set(scale[0], scale[1], scale[2]); }
  m.castShadow = !mat.transparent; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
const BOXES = new Map();
// Kasten mit runden Kanten
export function rbox(w, h, d, r = 0.02, segs = 3) {
  const key = [w, h, d, r, segs].join('|'); let g = BOXES.get(key); if (g) return g;
  r = Math.min(r, w / 2, h / 2, d / 2);
  const n = segs * 2 + 1; const half = 0.5 / n; const inner = V3(w / 2 - r, h / 2 - r, d / 2 - r);
  g = new THREE.BoxGeometry(1, 1, 1, n, n, n).toNonIndexed();
  const p = g.attributes.position; const no = g.attributes.normal; const v = V3(); const dir = V3(); const sg = V3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); sg.set(Math.sign(v.x), Math.sign(v.y), Math.sign(v.z));
    dir.set(v.x - sg.x * half, v.y - sg.y * half, v.z - sg.z * half).normalize();
    no.setXYZ(i, dir.x, dir.y, dir.z);
    p.setXYZ(i, inner.x * sg.x + dir.x * r, inner.y * sg.y + dir.y * r, inner.z * sg.z + dir.z * r);
  }
  g.computeBoundingSphere(); g.computeBoundingBox(); BOXES.set(key, g); return g;
}
const UP = V3(0, 1, 0); const _d = V3();
// Einheitszylinder (steht auf y 0..1) zwischen zwei Punkte legen
export function between(m, a, b) {
  _d.subVectors(b, a); const l = _d.length() || 1e-4;
  m.position.copy(a); m.scale.y = l; m.quaternion.setFromUnitVectors(UP, _d.divideScalar(l)); return m;
}
export function tube(points, r, mat, parent, segs = 40, radial = 8) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map((p) => (Array.isArray(p) ? V3(p[0], p[1], p[2]) : p))), segs, r, radial, false);
  return mesh(g, mat, parent);
}

// Feste Teile je Material zu einem Netz zusammenfassen (weniger Zeichenaufrufe). Was sich bewegt, bekommt userData.keep.
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = root.matrixWorld.clone().invert(); const groups = new Map(); const gone = [];
  const walk = (o) => {
    for (const c of o.children) {
      if (c.userData.keep) continue;
      walk(c);
      if (!c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || Array.isArray(c.material) || c.material.transparent || c.children.length) continue;
      const key = `${c.material.uuid}|${c.castShadow}|${c.receiveShadow}`;
      if (!groups.has(key)) groups.set(key, { mat: c.material, cast: c.castShadow, recv: c.receiveShadow, list: [] });
      groups.get(key).list.push(c); gone.push(c);
    }
  };
  walk(root);
  for (const { mat, cast, recv, list } of groups.values()) {
    const mapped = !!(mat.map || mat.bumpMap || mat.emissiveMap || mat.alphaMap || mat.roughnessMap);
    const geos = list.map((c) => {
      const g = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (!(name === 'position' || name === 'normal' || (name === 'uv' && mapped) || (name === 'color' && mat.vertexColors))) g.deleteAttribute(name);
      if (mapped && !g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups(); g.applyMatrix4(inv.clone().multiply(c.matrixWorld)); return g;
    });
    const merged = mergeGeometries(geos); for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat); m.castShadow = cast; m.receiveShadow = recv; root.add(m);
  }
  for (const c of gone) c.parent.remove(c);
  return root;
}

// ---------------- Gezeichnete Texturen ----------------
export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (!o.data) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
  return t;
}
const TEX = new Map();
const cached = (key, make) => { if (!TEX.has(key)) TEX.set(key, make()); return TEX.get(key); };
export const softTex = () => cached('soft', () => canvasTex(96, 96, (c, w) => {
  const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.62)'); g.addColorStop(0.55, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
}));
export const puffTex = () => cached('puff', () => canvasTex(192, 192, (c, w) => {
  const r = rng(91);
  for (let i = 0; i < 46; i++) {
    const a = r() * TAU; const d = Math.sqrt(r()) * w * 0.25; const x = w / 2 + Math.cos(a) * d; const y = w / 2 + Math.sin(a) * d; const s = w * (0.1 + r() * 0.13);
    const g = c.createRadialGradient(x, y, 0, x, y, s); const v = Math.round(255 - (y / w) * 38);
    g.addColorStop(0, `rgba(${v},${v},${v},.3)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill();
  }
}));
export const dropTex = () => cached('drop', () => canvasTex(64, 64, (c, w) => {
  const g = c.createRadialGradient(w * 0.4, w * 0.36, 0, w / 2, w / 2, w * 0.46);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, w, w);
}));
export function glowSprite(parent, color, size, pos, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.position.set(pos[0], pos[1], pos[2]); s.scale.setScalar(size); parent.add(s); return s;
}

// ---------------- Himmel und Spiegelungen ----------------
export function skyDome({ top, mid, low, bottom = low, sun = null, sunColor = 0xfff2d8, sunSize = 900, sunGlow = 0.35, radius = 400 }) {
  const col = (c) => ({ value: new THREE.Color(c) });
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uTop: col(top), uMid: col(mid), uLow: col(low), uBot: col(bottom), uSunC: col(sunColor), uSun: { value: sun ? sun.clone().normalize() : V3(0, -1, 0) }, uSize: { value: sunSize }, uGlow: { value: sun ? sunGlow : 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uMid, uLow, uBot, uSunC, uSun; uniform float uSize, uGlow; varying vec3 vD;
void main(){
  vec3 d = normalize(vD); float y = d.y;
  vec3 c = y > 0.0 ? mix(mix(uLow, uMid, smoothstep(0.0, 0.2, y)), uTop, smoothstep(0.12, 0.62, y)) : mix(uLow, uBot, smoothstep(0.0, 0.25, -y));
  float s = max(dot(d, uSun), 0.0);
  c += uSunC * (pow(s, 7.0) * uGlow + pow(s, 60.0) * uGlow + pow(s, uSize) * 3.0 * step(0.001, uGlow));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 24), mat); m.renderOrder = -10; m.frustumCulled = false; return m;
}
// Spiegelungen: lamps = [{ dir, color, k, size }]
export function envFrom(renderer, { top, low, bottom, lamps = [] }) {
  const s = new THREE.Scene();
  s.add(skyDome({ top, mid: low, low, bottom, radius: 60 }));
  for (const l of lamps) { const m = new THREE.Mesh(new THREE.CircleGeometry(l.size || 8, 20), glowMat(l.color, l.k || 1)); m.material.side = THREE.DoubleSide; m.position.copy(l.dir).normalize().multiplyScalar(40); m.lookAt(0, 0, 0); s.add(m); }
  const pm = new THREE.PMREMGenerator(renderer); const tex = pm.fromScene(s, 0.04).texture; pm.dispose();
  s.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}
// Sonne/Mond/Spot mit engem Schatten um die Szene
export function sunLight(scene, { color, power, from, at = V3(), size = 6, shadows = true }) {
  const l = new THREE.DirectionalLight(color, power); l.position.copy(from); l.target.position.copy(at); scene.add(l, l.target);
  l.castShadow = !!shadows; l.shadow.mapSize.set(2048, 2048);
  const c = l.shadow.camera; c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 0.5; c.far = from.distanceTo(at) + size * 3; c.updateProjectionMatrix();
  l.shadow.bias = -0.0004; l.shadow.normalBias = 0.025;
  return l;
}

// ---------------- Weiche Teilchen: jedes mit eigener Größe, Farbe, Deckkraft und Drehung ----------------
export const VIEW_H = { value: 720 }; // Bildhöhe in Pixeln, setzt titel.js je Bild
const P_VERT = `attribute float aSize; attribute float aRot; attribute vec4 aCol; uniform float uH; varying vec4 vC; varying float vR;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aCol.a <= 0.0 ? 0.0 : min(900.0, aSize * uH * 0.5 * projectionMatrix[1][1] / max(0.1, -mv.z));
  vC = aCol; vR = aRot; gl_Position = projectionMatrix * mv;
}`;
const P_FRAG = `uniform sampler2D uMap; varying vec4 vC; varying float vR;
void main(){
  vec2 p = gl_PointCoord - 0.5; float c = cos(vR); float s = sin(vR); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) discard;
  vec4 t = texture2D(uMap, vec2(p.x, 1.0 - p.y)); gl_FragColor = vec4(t.rgb * vC.rgb, t.a * vC.a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
export function particles(parent, n, { map = softTex(), additive = false, floor = null } = {}) {
  const pos = new Float32Array(n * 3); const col = new Float32Array(n * 4); const size = new Float32Array(n); const rot = new Float32Array(n);
  const g = new THREE.BufferGeometry();
  for (const [name, arr, k] of [['position', pos, 3], ['aCol', col, 4], ['aSize', size, 1], ['aRot', rot, 1]]) { const a = new THREE.BufferAttribute(arr, k); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); }
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { uMap: { value: map }, uH: VIEW_H }, vertexShader: P_VERT, fragmentShader: P_FRAG, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));
  pts.frustumCulled = false; pts.renderOrder = 4; parent.add(pts);
  const P = Array.from({ length: n }, () => ({ life: 0, max: 1, v: V3(), g: 0, drag: 0, s0: 0.1, s1: 0.1, a: 1, spin: 0, fade: 0.1 }));
  const C = new THREE.Color(); let next = 0;
  return {
    points: pts,
    emit(x, y, z, vx, vy, vz, o = {}) {
      const i = next; next = (next + 1) % n; const p = P[i];
      p.max = p.life = o.life || 1; p.v.set(vx, vy, vz); p.g = o.gravity || 0; p.drag = o.drag || 0; p.s0 = o.size || 0.1; p.s1 = o.end === undefined ? p.s0 : o.end;
      p.a = o.alpha === undefined ? 1 : o.alpha; p.spin = o.spin || 0; p.fade = o.fadeIn === undefined ? 0.1 : o.fadeIn;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      C.set(o.color === undefined ? 0xffffff : o.color); if (o.bright) C.multiplyScalar(o.bright);
      col[i * 4] = C.r; col[i * 4 + 1] = C.g; col[i * 4 + 2] = C.b; col[i * 4 + 3] = 0;
      rot[i] = o.rot === undefined ? Math.random() * TAU : o.rot;
    },
    step(dt) {
      for (let i = 0; i < n; i++) {
        const p = P[i]; if (p.life <= 0) { col[i * 4 + 3] = 0; continue; }
        p.life -= dt; const k = clamp(1 - p.life / p.max, 0, 1);
        p.v.y -= p.g * dt; if (p.drag) p.v.multiplyScalar(Math.exp(-p.drag * dt));
        pos[i * 3] += p.v.x * dt; pos[i * 3 + 1] += p.v.y * dt; pos[i * 3 + 2] += p.v.z * dt;
        if (floor !== null && pos[i * 3 + 1] < floor) { pos[i * 3 + 1] = floor; p.v.y *= -0.3; p.v.x *= 0.5; p.v.z *= 0.5; }
        size[i] = lerp(p.s0, p.s1, Math.sqrt(k)); rot[i] += p.spin * dt;
        col[i * 4 + 3] = p.life > 0 ? p.a * Math.min(1, k / Math.max(1e-3, p.fade)) * (1 - k * k) : 0;
      }
      for (const name of ['position', 'aCol', 'aSize', 'aRot']) g.attributes[name].needsUpdate = true;
    },
  };
}
