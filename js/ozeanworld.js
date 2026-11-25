// Theos Seitenscheidel - Trockne den Ozean aus: die Welt. Gelände und Meeresboden aus der Blender-Karte (ozeandata.js, Maßstab 1:40.000),
// Pazifik im Westen, Atlantik (Golf) im Südosten, dazwischen das Haus aus Blender. An jedem Ozean ein Hafen mit Steg und Wasserhändler.
// Wasser: je Ozean ein Netz über dem Becken, die Höhe folgt dem Pegel. Leichter Wellengang (Punkte heben sich sanft), Farbe nach Tiefe, Schaum am Ufer.
// Nasser Sand dunkler, trockener Meeresboden hell und rissig. Meerestiere schwimmen nur, wo genug Wasser ist. Tag und Nacht über drei gebackene Himmel.
import * as THREE from './vendor/three.module.min.js';
import { bakeSky, MOODS } from './racesky.js';
import { buildModel, personPlain, NPC, phoneModel, goldChain } from './ozeanart.js';
import { MEERE, HAFEN, BODEN, levelOf } from './ozeanlogic.js';
import { GRID, BASE_Y, WEG, HGT, MASK, bedH, maskAt, meerAt, depthAt, edgeOnPath, pathPoint } from './ozeanmap.js';
import { buildDeko } from './ozeandeko.js';
export { GRID, BASE_Y, WEG, bedH, maskAt, meerAt, depthAt, edgeOnPath, pathPoint };

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- Feste Orte ----------------
// Das Haus steht etwas nördlich vom Blender-Ursprung, damit zwischen Haus, Tierbecken und den beiden Häfen Platz bleibt (der Golf ist sehr nah).
const HX = -6; const HZ = -16;
export const HOUSE = { x: HX, z: HZ, y: BASE_Y, x0: HX - 4, x1: HX + 4, z0: HZ - 3, z1: HZ + 3, floor: BASE_Y + 0.1, door: { x0: HX - 0.62, x1: HX + 0.62 }, bed: { x: HX - 3.2, z: HZ - 1.7 }, desk: { x: HX + 2.2, z: HZ - 2.35 }, chair: { x: HX + 2.2, z: HZ - 1.55 }, screen: { x: HX + 2.2, y: BASE_Y + 1.2, z: HZ - 2.53 } };
export const POOL = { x: 17, z: -19, r: 10, y: BASE_Y - 0.15, floor: BASE_Y - 1.7 };
// Häfen: Steg vom Land ins Wasser, daneben der Wasserhändler. Gerechnet aus der Karte: vom Becken Richtung Haus, bis das Land hoch genug ist.
export const HARBOR = HAFEN.map((h, i) => {
  const dx = HOUSE.x - h[0]; const dz = HOUSE.z + 6 - h[1]; const L = Math.hypot(dx, dz); const ux = dx / L; const uz = dz / L; let s = 0; while (s < L && bedH(h[0] + ux * s, h[1] + uz * s) < 1.3) s += 0.5;
  const lx = h[0] + ux * s; const lz = h[1] + uz * s; const yaw = Math.atan2(-ux, -uz); // Steg zeigt vom Land weg ins Wasser
  const booth = { x: lx + ux * 6 + uz * 6, z: lz + uz * 6 - ux * 6 }; const pierLen = 26;
  return { i, coast: { x: lx, z: lz }, dir: { x: -ux, z: -uz }, yaw, booth, counter: { x: booth.x - ux * 1.9, z: booth.z - uz * 1.9 }, pier: { x0: lx + ux * 2, z0: lz + uz * 2, x1: lx - ux * pierLen, z1: lz - uz * pierLen, w: 2.6, y: BASE_Y - 0.15 }, spawn: { x: lx + ux * 9, z: lz + uz * 9 } };
});

// ---------------- Kleine Helfer ----------------
function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const std = (o) => new THREE.MeshStandardMaterial(o);
function rippleNormal(size = 256, n = 520, seed = 3) {
  let a = seed; const R = () => { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; };
  const hc = document.createElement('canvas'); hc.width = hc.height = size; const c = hc.getContext('2d'); c.fillStyle = '#808080'; c.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) { const x = R() * size; const y = R() * size; const l = 10 + R() * 34; for (const [ox, oy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) { const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, l); const up = R() < 0.5; g.addColorStop(0, up ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(128,128,128,0)'); c.fillStyle = g; c.beginPath(); c.ellipse(x + ox, y + oy, l, l * 0.45, 0.3, 0, 7); c.fill(); } }
  const src = c.getImageData(0, 0, size, size).data; const nc = document.createElement('canvas'); nc.width = nc.height = size; const x2 = nc.getContext('2d'); const img = x2.createImageData(size, size); const H = (x, y) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 2.0; const dy = (H(x, y + 1) - H(x, y - 1)) * 2.0; const l = Math.hypot(dx, dy, 1); const i = (y * size + x) * 4; img.data[i] = (-dx / l * 0.5 + 0.5) * 255; img.data[i + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
  x2.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(nc); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// Wellen (gleiche Formel im Shader und für Boote/Tiere): Höhe über dem Pegel bei Tiefe dep
export function waveY(x, z, t, dep) { const amp = clamp(dep / 2.5, 0, 1); return amp * (0.08 * Math.sin(x * 0.21 + z * 0.13 + t * 1.1) + 0.06 * Math.sin(-x * 0.11 + z * 0.27 + t * 0.83 + 1.7) + 0.025 * Math.sin(x * 0.37 - z * 0.31 + t * 1.7 + 0.4)); }
const WAVE_GLSL = `
float ozAmp(float dep) { return clamp(dep / 2.5, 0.0, 1.0); }
float ozWave(vec2 p, float t) { return 0.08 * sin(p.x * 0.21 + p.y * 0.13 + t * 1.1) + 0.06 * sin(-p.x * 0.11 + p.y * 0.27 + t * 0.83 + 1.7) + 0.025 * sin(p.x * 0.37 - p.y * 0.31 + t * 1.7 + 0.4); }
vec2 ozSlope(vec2 p, float t) { float a = cos(p.x * 0.21 + p.y * 0.13 + t * 1.1) * 0.08; float b = cos(-p.x * 0.11 + p.y * 0.27 + t * 0.83 + 1.7) * 0.06; float c = cos(p.x * 0.37 - p.y * 0.31 + t * 1.7 + 0.4) * 0.025; return vec2(a * 0.21 - b * 0.11 + c * 0.37, a * 0.13 + b * 0.27 - c * 0.31); }`;

// ================================================================== Welt bauen
export function buildOzeanWorld(renderer, { shadows = true, shadowSize = 2048 } = {}) {
  const day = { ...MOODS.kueste, sunI: 4.3, fogD: 0.00045, fogH: 60, vol: 0.01, exposure: 0.84, sat: 1.12 }; const gold = { ...MOODS.hard, fogD: 0.0006, fogH: 50, vol: 0.016, exposure: 0.92 }; const night = { ...MOODS.nacht, fogD: 0.0018, vol: 0.03, exposure: 1.3 }; // vol klein: auf freien Flächen überstrahlen die Lichtstrahlen sonst alles
  const skies = { day: bakeSky(renderer, day, 5, 512), gold: bakeSky(renderer, gold, 5, 512), night: bakeSky(renderer, night, 5, 512) };
  const scene = new THREE.Scene(); scene.background = skies.day.cube; scene.environment = skies.day.env; scene.environmentIntensity = 0.9;
  const sun = new THREE.DirectionalLight(0xfff0d6, 4); sun.castShadow = shadows; sun.shadow.mapSize.set(shadowSize, shadowSize); const sc = sun.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 300; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.06; scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5a4a30, 0.4); scene.add(hemi);
  const W = { scene, sun, sunDir: V3(0.3, 0.8, 0.4).normalize(), mood: day, sky: skies.day, skies, boxes: [], circles: [], levels: [0, 0], shown: [-99, -99], t: 0, anim: [], smoke: [], animals: [], uniforms: { uTime: { value: 0 }, uLevel: { value: new THREE.Vector2(0, 0) } } };
  const add = (geo, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = o.cast !== false; m.receiveShadow = true; (o.parent || scene).add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const box = (x0, x1, z0, z1, o = {}) => W.boxes.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), ...o });
  const circle = (x, z, r, o = {}) => W.circles.push({ x, z, r, ...o });
  let seed = 777; const R = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

  // ---------------- Gelände und Meeresboden ----------------
  const DETAIL = ctex(256, 256, (c, w, h) => { c.fillStyle = '#d8d8d8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 7000; i++) { const v = 190 + Math.random() * 65; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.5, 1 + Math.random() * 2.5); } }, [1, 1]);
  const CRACK = ctex(512, 512, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,55,40,.55)'; c.lineCap = 'round'; for (let k = 0; k < 70; k++) { let x = Math.random() * w; let y = Math.random() * h; let a = Math.random() * 6.28; c.lineWidth = 1 + Math.random() * 2.2; c.beginPath(); c.moveTo(x, y); for (let i = 0; i < 9; i++) { a += (Math.random() - 0.5) * 1.4; x += Math.cos(a) * 14; y += Math.sin(a) * 14; c.lineTo(x, y); } c.stroke(); } for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, [1, 1]);
  {
    const { nx, nz, cell, x0, z0 } = GRID; const n = nx * nz; const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3); const uv = new Float32Array(n * 2); const am = new Float32Array(n); const c = new THREE.Color();
    const grass = new THREE.Color(0.25, 0.42, 0.14); const grass2 = new THREE.Color(0.38, 0.5, 0.2); const sand = new THREE.Color(0.86, 0.74, 0.52); const mud = new THREE.Color(0.6, 0.48, 0.34); const deepMud = new THREE.Color(0.47, 0.38, 0.28); const rock = new THREE.Color(0.48, 0.45, 0.41); const silt = new THREE.Color(0.36, 0.33, 0.28); const dryGrass = new THREE.Color(0.52, 0.5, 0.26);
    const noise = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
    const vn = (x, z) => { const ix = Math.floor(x); const iz = Math.floor(z); const fx = x - ix; const fz = z - iz; const u = fx * fx * (3 - 2 * fx); const v = fz * fz * (3 - 2 * fz); return lerp(lerp(noise(ix, iz), noise(ix + 1, iz), u), lerp(noise(ix, iz + 1), noise(ix + 1, iz + 1), u), v); };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i; const x = x0 + i * cell; const z = z0 + j * cell; const h = HGT[k] / 100; const m = MASK[k]; pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z; uv[k * 2] = x / 7; uv[k * 2 + 1] = z / 7; am[k] = m;
      const f = vn(x * 0.06, z * 0.06) * 0.6 + vn(x * 0.21, z * 0.21) * 0.4;
      const sl = (Math.abs(HGT[Math.min(k + 1, n - 1)] - HGT[Math.max(k - 1, 0)]) + Math.abs(HGT[Math.min(k + nx, n - 1)] - HGT[Math.max(k - nx, 0)])) / 100 / (2 * cell); const f2 = vn(x * 0.013 + 40, z * 0.013 + 7);
      if (m) { c.copy(sand).lerp(mud, smooth(-0.4, -4.5, h)).lerp(deepMud, smooth(-5, -11, h)); c.lerp(silt, smooth(0.55, 0.85, f2) * smooth(-1, -3, h) * 0.6); c.multiplyScalar(0.9 + f * 0.2); }
      else { c.copy(grass).lerp(grass2, f); c.lerp(dryGrass, smooth(0.62, 0.9, f2) * 0.7); c.lerp(sand, smooth(1.25, 0.55, h)); c.lerp(rock, Math.max(smooth(9, 22, h), smooth(0.35, 0.8, sl))); c.multiplyScalar(0.92 + f * 0.16); }
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); let q = 0; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; const b = a + 1; const c2 = a + nx; const d = c2 + 1; idx[q++] = a; idx[q++] = c2; idx[q++] = b; idx[q++] = b; idx[q++] = c2; idx[q++] = d; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('aM', new THREE.BufferAttribute(am, 1)); g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeVertexNormals(); g.computeBoundingSphere();
    const mat = std({ map: DETAIL, vertexColors: true, roughness: 0.96, envMapIntensity: 0.45 });
    mat.onBeforeCompile = (sh) => { sh.uniforms.uLevel = W.uniforms.uLevel; sh.uniforms.uTime = W.uniforms.uTime; sh.uniforms.tCrack = { value: CRACK }; sh.uniforms.uPool = { value: new THREE.Vector3(POOL.x, POOL.z, POOL.r) };
      sh.vertexShader = 'attribute float aM; varying float vM; varying vec3 vWpos;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvM = aM; vWpos = (modelMatrix * vec4(position, 1.0)).xyz;');
      sh.fragmentShader = 'uniform vec2 uLevel; uniform float uTime; uniform sampler2D tCrack; uniform vec3 uPool; varying float vM; varying vec3 vWpos;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        if (length(vWpos.xz - uPool.xy) < uPool.z) discard;
        if (vM > 0.5) { float lv = vM < 1.5 ? uLevel.x : uLevel.y; float wet = 1.0 - smoothstep(lv, lv + 0.7, vWpos.y); float dry = smoothstep(lv + 0.4, lv + 2.5, vWpos.y) * smoothstep(-0.3, -1.5, vWpos.y);
          vec3 crack = texture2D(tCrack, vWpos.xz / 9.0).rgb; diffuseColor.rgb *= mix(vec3(1.0), crack, dry * 0.85); diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.55, 0.56, 0.6), wet);
          float rip = sin(dot(vWpos.xz, vec2(0.83, 0.55)) * 3.4 + sin(vWpos.x * 0.21) * 2.0 + sin(vWpos.z * 0.17) * 1.6) * 0.5 + 0.5; diffuseColor.rgb *= 0.94 + 0.12 * rip * smoothstep(-4.0, -0.3, vWpos.y) * (1.0 - dry * 0.7);
          float dep = lv - vWpos.y; if (dep > 0.0) { diffuseColor.rgb *= mix(vec3(1.0), vec3(0.3, 0.58, 0.66), smoothstep(0.0, 5.0, dep));
            vec2 cp = vWpos.xz * 0.55; float tt = uTime * 0.8; float c1 = sin(cp.x * 1.7 + sin(cp.y * 1.3 + tt) * 1.4 + tt * 0.7); float c2 = sin(cp.y * 1.9 + sin(cp.x * 1.1 - tt * 0.8) * 1.4 - tt * 0.6);
            float cau = pow(clamp(1.0 - abs(c1 + c2) * 0.7, 0.0, 1.0), 5.0); diffuseColor.rgb += cau * 0.32 * smoothstep(0.0, 0.25, dep) * (1.0 - smoothstep(1.0, 6.0, dep)) * vec3(0.85, 1.0, 0.95); } }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n if (vM > 0.5) { float lv2 = vM < 1.5 ? uLevel.x : uLevel.y; roughnessFactor = mix(roughnessFactor, 0.35, 1.0 - smoothstep(lv2, lv2 + 0.5, vWpos.y)); }'); };
    const t = new THREE.Mesh(g, mat); t.receiveShadow = true; t.castShadow = false; scene.add(t); W.terrain = t;
  }

  // ---------------- Wasser je Ozean ----------------
  const NRM = rippleNormal(256, 520, 9);
  W.water = [1, 2].map((m) => {
    const { nx, nz, cell, x0, z0 } = GRID; const want = new Uint8Array(nx * nz); const D2 = 2;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (MASK[j * nx + i] === m) for (let b = -D2; b <= D2; b++) for (let a = -D2; a <= D2; a++) { const ii = i + a; const jj = j + b; if (ii >= 0 && jj >= 0 && ii < nx && jj < nz) want[jj * nx + ii] = 1; }
    const vid = new Int32Array(nx * nz).fill(-1); const pos = []; const bed = []; const uv = []; const idx = [];
    const v = (i, j) => { const k = j * nx + i; if (vid[k] >= 0) return vid[k]; vid[k] = pos.length / 3; const x = x0 + i * cell; const z = z0 + j * cell; pos.push(x, 0, z); bed.push(HGT[k] / 100); uv.push(x / 16, z / 16); return vid[k]; };
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { if (!want[j * nx + i]) continue; const a = v(i, j); const b = v(i + 1, j); const c = v(i, j + 1); const d = v(i + 1, j + 1); idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aBed', new THREE.Float32BufferAttribute(bed, 1)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(pos.length).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3)); g.setIndex(idx); g.computeBoundingSphere(); g.boundingSphere.radius += 30;
    const mat = std({ color: 0x1a5a8a, roughness: 0.06, metalness: 0.0, envMapIntensity: 0.85, transparent: true, opacity: 1, normalMap: NRM, normalScale: new THREE.Vector2(0.3, 0.3), side: THREE.DoubleSide, depthWrite: false });
    const uLv = { value: 0 };
    mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = W.uniforms.uTime; sh.uniforms.uLv = uLv;
      sh.vertexShader = 'uniform float uTime; uniform float uLv; attribute float aBed; varying float vDep; varying vec3 vWp; varying float vCrest;\n' + WAVE_GLSL + '\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', 'float ozD = uLv - aBed; vec2 ozS = ozSlope(position.xz, uTime) * ozAmp(ozD); vec3 objectNormal = normalize(vec3(-ozS.x, 1.0, -ozS.y));')
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3(position); transformed.y += ozWave(position.xz, uTime) * ozAmp(ozD); vDep = ozD; vCrest = ozWave(position.xz, uTime) * ozAmp(ozD); vWp = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = 'uniform float uTime; varying float vDep; varying vec3 vWp; varying float vCrest;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;', 'vec3 mapN = normalize((texture2D(normalMap, vWp.xz / 14.0 + vec2(uTime * 0.011, uTime * 0.019)).xyz * 2.0 - 1.0) + (texture2D(normalMap, vWp.xz / 5.1 + vec2(-uTime * 0.027, uTime * 0.009)).xyz * 2.0 - 1.0) * 0.65 + vec3(0.0, 0.0, 0.6));')).replace('#include <color_fragment>', `#include <color_fragment>
        float d = vDep; if (d < -0.02) discard;
        vec3 cS = vec3(0.12, 0.6, 0.62); vec3 cM = vec3(0.03, 0.3, 0.5); vec3 cD = vec3(0.01, 0.1, 0.25);
        vec3 cw = mix(cS, cM, smoothstep(0.0, 1.8, d)); cw = mix(cw, cD, smoothstep(1.8, 8.0, d)); diffuseColor.rgb = cw; diffuseColor.a = mix(0.45, 0.95, smoothstep(0.0, 2.2, d));
        diffuseColor.rgb += vec3(0.04, 0.12, 0.1) * clamp(vCrest * 8.0, 0.0, 1.0) * smoothstep(0.5, 3.0, d);
        float fo = (1.0 - smoothstep(0.0, 0.25, d)) * (0.55 + 0.45 * sin(vWp.x * 2.7 + vWp.z * 2.1 + uTime * 1.8)); float band = smoothstep(0.7, 1.0, sin(d * 7.0 - uTime * 1.5 + sin(vWp.x * 0.35 + vWp.z * 0.2) * 1.8)) * (1.0 - smoothstep(0.0, 1.1, d)) * 0.7; fo = clamp(max(fo, band), 0.0, 1.0); diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97), fo * 0.75); diffuseColor.a = max(diffuseColor.a, fo * 0.8);`); };
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 2; mesh.frustumCulled = false; scene.add(mesh); return { mesh, mat, uLv };
  });

  // ---------------- Haus aus Blender ----------------
  { const H = buildModel('Haus'); H.group.position.set(HOUSE.x, HOUSE.y, HOUSE.z); scene.add(H.group); W.house = H;
    const T = 0.25; const hbox = (x0, x1, z0, z1, o) => box(HX + x0, HX + x1, HZ + z0, HZ + z1, o); hbox(-4.1, 4.1, -3.1, -3 + T); hbox(-4.1, -4 + T, -3.1, 3.1); hbox(4 - T, 4.1, -3.1, 3.1); hbox(-4.1, -0.62, 3 - T, 3.1); hbox(0.62, 4.1, 3 - T, 3.1);
    hbox(-3.78, -2.62, -2.8, -0.62, { bed: true }); hbox(1.38, 3.02, -2.75, -1.95); hbox(-2.58, -2.12, -2.78, -2.32); circle(HOUSE.chair.x, HOUSE.chair.z, 0.28);
    const lamp = new THREE.PointLight(0xffe0b0, 9, 11, 1.6); lamp.position.set(HX, HOUSE.y + 3.2, HZ - 0.3); lamp.castShadow = false; scene.add(lamp); W.houseLight = lamp;
    const lamp2 = new THREE.PointLight(0xffd8a0, 2.2, 3.5, 1.6); lamp2.position.set(HX - 2.35, HOUSE.y + 1.05, HZ - 2.55); scene.add(lamp2);
    // Bildschirm am PC: eigene Fläche vor dem Blender-Monitor (das Bild malt ozean.js)
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 300; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; W.pcCanvas = cv; W.pcTex = tex;
    add(new THREE.PlaneGeometry(0.56, 0.32), std({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1 }), HOUSE.screen.x, HOUSE.screen.y, HOUSE.screen.z + 0.015, { cast: false });
    // Schild an der Tür
    const sign = ctex(512, 128, (c, w, h) => { c.fillStyle = '#f5f6f4'; c.fillRect(0, 0, w, h); c.fillStyle = '#0a4f9c'; c.fillRect(8, 8, w - 16, h - 16); c.strokeStyle = '#f5f6f4'; c.lineWidth = 5; c.strokeRect(18, 18, w - 36, h - 36); c.fillStyle = '#f5f6f4'; c.font = '700 54px Bahnschrift'; c.textAlign = 'center'; c.fillText('Basislager', w / 2, 84); });
    add(new THREE.PlaneGeometry(1.4, 0.35), std({ map: sign, roughness: 0.6 }), HX + 1.6, HOUSE.y + 2.35, HZ + 3.03, { cast: false });
  }

  // ---------------- Wegweiser vor dem Haus (gelbe Pfeilschilder wie im Hauptmenü) ----------------
  { const post = std({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.35 }); const px = HX + 3.2; const pz = HZ + 7.5; add(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 10), post, px, BASE_Y + 1.6, pz); box(px - 0.15, px + 0.15, pz - 0.15, pz + 0.15);
    HARBOR.forEach((hb, i) => { const ang = Math.atan2(hb.booth.x - px, hb.booth.z - pz); const d = Math.round(Math.hypot(hb.booth.x - px, hb.booth.z - pz)); const right = Math.sin(ang - Math.PI / 2) > 0;
      const t = ctex(512, 128, (c, w, h) => { c.fillStyle = '#141518'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w - 70, 0); c.lineTo(w, h / 2); c.lineTo(w - 70, h); c.lineTo(0, h); c.closePath(); c.fill(); c.fillStyle = '#f9bd00'; c.beginPath(); c.moveTo(6, 6); c.lineTo(w - 73, 6); c.lineTo(w - 8, h / 2); c.lineTo(w - 73, h - 6); c.lineTo(6, h - 6); c.closePath(); c.fill(); c.fillStyle = '#141518'; c.font = '700 54px Bahnschrift'; c.textAlign = 'left'; c.fillText(`${MEERE[i].name} ${d} m`, 26, 84); });
      const g = new THREE.Group(); g.position.set(px, BASE_Y + 2.75 - i * 0.5, pz); g.rotation.y = ang - Math.PI / 2; scene.add(g); const m = std({ map: t, roughness: 0.5, side: THREE.DoubleSide }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), m); pl.position.x = 1.0; g.add(pl); void right; }); }

  // ---------------- Häfen: Steg, Wasserhändler, Preistafel ----------------
  const WOOD = ctex(256, 256, (c, w, h) => { c.fillStyle = '#8a6a48'; c.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#7d5f40' : '#94724e'; c.fillRect(0, i * 32, w, 30); c.fillStyle = 'rgba(40,25,10,.5)'; c.fillRect(0, i * 32 + 30, w, 2); } for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(50,30,15,${Math.random() * 0.15})`; c.fillRect(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 1); } }, [1, 4]);
  W.boards = []; W.dealers = [];
  HARBOR.forEach((hb, i) => {
    const P = hb.pier; const len = Math.hypot(P.x1 - P.x0, P.z1 - P.z0); const cx = (P.x0 + P.x1) / 2; const cz = (P.z0 + P.z1) / 2; const yaw = Math.atan2(P.x1 - P.x0, P.z1 - P.z0);
    const deck = new THREE.Mesh(B(P.w, 0.16, len), std({ map: WOOD, roughness: 0.85 })); deck.position.set(cx, P.y - 0.08, cz); deck.rotation.y = yaw; deck.castShadow = true; deck.receiveShadow = true; scene.add(deck);
    const postM = std({ color: 0x5a4430, roughness: 0.9 }); for (let s = 0; s <= len; s += 3) for (const side of [-1, 1]) { const x = P.x0 + Math.sin(yaw) * s + Math.cos(yaw) * side * (P.w / 2 - 0.15); const z = P.z0 + Math.cos(yaw) * s - Math.sin(yaw) * side * (P.w / 2 - 0.15); const b0 = bedH(x, z) - 0.4; const hh = P.y - b0; add(new THREE.CylinderGeometry(0.12, 0.14, hh, 8), postM, x, b0 + hh / 2, z); }
    for (const side of [-1, 1]) { const rail = new THREE.Mesh(B(0.08, 0.08, len), postM); rail.position.set(cx + Math.cos(yaw) * side * (P.w / 2 - 0.05), P.y + 0.85, cz - Math.sin(yaw) * side * (P.w / 2 - 0.05)); rail.rotation.y = yaw; scene.add(rail); }
    hb.pierYaw = yaw; hb.pierLen = len;
    // Kiosk: weißes Häuschen, blaues Schild, Tresen zum Wasser hin
    const k = new THREE.Group(); k.position.set(hb.booth.x, bedH(hb.booth.x, hb.booth.z), hb.booth.z); k.rotation.y = hb.yaw; scene.add(k); k.updateMatrixWorld(true); hb.ky = k.position.y; hb.k = k;
    const white = std({ color: 0xf2f0ea, roughness: 0.7 }); const blue = std({ color: 0x0a4f9c, roughness: 0.5 }); const yel = std({ color: 0xf9bd00, roughness: 0.5 });
    const addK = (geo, mat, x, y, z) => add(geo, mat, x, y, z, { parent: k });
    addK(B(4.2, 0.2, 3.2), std({ color: 0x9a948a, roughness: 0.9 }), 0, 0.1, 0); addK(B(4.0, 2.6, 0.15), white, 0, 1.4, -1.5); addK(B(0.15, 2.6, 3.0), white, -2.0, 1.4, 0); addK(B(0.15, 2.6, 3.0), white, 2.0, 1.4, 0);
    addK(B(4.0, 1.05, 0.15), white, 0, 0.62, 1.5); addK(B(4.3, 0.1, 0.6), yel, 0, 1.17, 1.6); addK(B(4.6, 0.18, 3.8), blue, 0, 2.8, 0.1);
    const sign = ctex(1024, 200, (c, w, h) => { c.fillStyle = '#f5f6f4'; c.fillRect(0, 0, w, h); c.fillStyle = '#0a4f9c'; c.fillRect(8, 8, w - 16, h - 16); c.strokeStyle = '#f5f6f4'; c.lineWidth = 7; c.strokeRect(22, 22, w - 44, h - 44); c.fillStyle = '#f5f6f4'; c.font = '700 92px Bahnschrift'; c.textAlign = 'center'; c.fillText('WASSERHÄNDLER', w / 2, 132); });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 0.86), std({ map: sign, roughness: 0.6 })); sg.position.set(0, 3.38, 1.95); k.add(sg); const sgb = new THREE.Mesh(B(4.4, 0.86, 0.06), blue); sgb.position.set(0, 3.38, 1.91); k.add(sgb);
    // Rückseite (Landseite): Schild mit Pfeil zum Eingang am Wasser
    const back = ctex(1024, 256, (c, w, h) => { c.fillStyle = '#f5f6f4'; c.fillRect(0, 0, w, h); c.fillStyle = '#0a4f9c'; c.fillRect(8, 8, w - 16, h - 16); c.strokeStyle = '#f5f6f4'; c.lineWidth = 7; c.strokeRect(22, 22, w - 44, h - 44); c.fillStyle = '#f5f6f4'; c.font = '700 84px Bahnschrift'; c.textAlign = 'center'; c.fillText('WASSERHÄNDLER', w / 2, 118); c.font = '600 50px Bahnschrift'; c.fillText(`${MEERE[i].name} · Eingang am Wasser`, w / 2, 196); });
    const bs = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), std({ map: back, roughness: 0.6 })); bs.position.set(0, 1.75, -1.59); bs.rotation.y = Math.PI; k.add(bs);
    const kl = new THREE.PointLight(0xffd8a0, 0, 16, 1.5); kl.position.set(0, 2.55, 2.2); k.add(kl); W.kioskLights = (W.kioskLights || []).concat(kl);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), std({ color: 0xffffff, emissive: 0xffd8a0, emissiveIntensity: 0 })); bulb.position.set(0, 2.62, 1.9); k.add(bulb); W.kioskBulbs = (W.kioskBulbs || []).concat(bulb);
    const bcv = document.createElement('canvas'); bcv.width = 512; bcv.height = 320; const btx = new THREE.CanvasTexture(bcv); btx.colorSpace = THREE.SRGBColorSpace; const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.94), std({ map: btx, roughness: 0.6, emissive: 0xffffff, emissiveMap: btx, emissiveIntensity: 0.25 })); board.position.set(-2.12, 1.55, 0.6); board.rotation.y = -Math.PI / 2; k.add(board);
    W.boards.push({ cv: bcv, tex: btx, i });
    // Wasserhändler (gelbe Öljacke)
    const p = personPlain(scene, NPC.haendler); const cw = k.localToWorld(V3(0, 0, 0.55)); p.place(cw.x, k.position.y + 0.2, cw.z, hb.yaw); p.act = 'counter'; W.dealers.push(p);
    // Kollision: Kiosk, Geländer des Stegs
    const kc = k.localToWorld(V3(0, 0, -0.1)); circle(kc.x, kc.z, 2.2, { veh: true });
    hb.counterPos = k.localToWorld(V3(0, 0, 2.3)); hb.xxxxl = []; for (let n = 0; n < 12; n++) { const side = n % 2 ? 1 : -1; const m = n < 8 ? n : n - 8; const row = Math.floor(m / 2); const out = n < 8 ? 0 : 7.5; hb.xxxxl.push(k.localToWorld(V3(side * (8 + out + row * 0.5), 0, -4 - out * 0.5 - row * 8.5))); } // 12 Plätze (so viele erlaubt der Atlantik), ab der neunten eine äußere Reihe
    hb.park = [0, 1, 2].map((n) => k.localToWorld(V3(-9 - n * 4.2, 0, 4)));
  });

  // Steht man auf einem Steg? Gibt die Deckhöhe zurück (sonst null)
  W.pierAt = (x, z) => { for (const hb of HARBOR) { const P = hb.pier; const L = hb.pierLen; const ux = Math.sin(hb.pierYaw); const uz = Math.cos(hb.pierYaw); const dx = x - P.x0; const dz = z - P.z0; const a = dx * ux + dz * uz; const b = Math.abs(dx * uz - dz * ux); if (a > -0.3 && a < L + 0.3 && b < P.w / 2 + 0.05) return P.y; } return null; };
  W.onPierEdge = (x, z) => { for (const hb of HARBOR) { const P = hb.pier; const ux = Math.sin(hb.pierYaw); const uz = Math.cos(hb.pierYaw); const dx = x - P.x0; const dz = z - P.z0; const a = dx * ux + dz * uz; const b = Math.abs(dx * uz - dz * ux); if (a > 0 && a < hb.pierLen && b < P.w / 2 + 0.05) return { hb, a, b }; } return null; };

  // ---------------- Tierbecken am Haus ----------------
  { const ring = std({ color: 0xe8e4dc, roughness: 0.7 }); const tile = ctex(256, 256, (c, w, h) => { c.fillStyle = '#7ec8e0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#5aa8c8'; c.lineWidth = 3; for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(i * 32, 0); c.lineTo(i * 32, h); c.stroke(); c.beginPath(); c.moveTo(0, i * 32); c.lineTo(w, i * 32); c.stroke(); } }, [6, 6]);
    add(new THREE.CircleGeometry(POOL.r, 48).rotateX(-Math.PI / 2), std({ map: tile, roughness: 0.4 }), POOL.x, POOL.floor, POOL.z, { cast: false });
    const wall = new THREE.CylinderGeometry(POOL.r, POOL.r, BASE_Y - POOL.floor + 0.05, 48, 1, true); add(wall, std({ map: tile, roughness: 0.4, side: THREE.BackSide }), POOL.x, (BASE_Y + POOL.floor) / 2, POOL.z, { cast: false });
    add(new THREE.TorusGeometry(POOL.r + 0.3, 0.35, 6, 48).rotateX(Math.PI / 2), ring, POOL.x, BASE_Y + 0.02, POOL.z);
    const pw = std({ color: 0x2a90c8, roughness: 0.08, transparent: true, opacity: 0.72, normalMap: NRM, normalScale: new THREE.Vector2(0.3, 0.3), envMapIntensity: 1.2, depthWrite: false });
    const water = add(new THREE.CircleGeometry(POOL.r, 48).rotateX(-Math.PI / 2), pw, POOL.x, POOL.y, POOL.z, { cast: false }); water.renderOrder = 2;
    circle(POOL.x, POOL.z, POOL.r + 0.4, { pool: true });
    const t = ctex(512, 128, (c, w, h) => { c.fillStyle = '#f5f6f4'; c.fillRect(0, 0, w, h); c.fillStyle = '#00815a'; c.fillRect(8, 8, w - 16, h - 16); c.strokeStyle = '#f5f6f4'; c.lineWidth = 5; c.strokeRect(18, 18, w - 36, h - 36); c.fillStyle = '#f5f6f4'; c.font = '700 50px Bahnschrift'; c.textAlign = 'center'; c.fillText('Tierbecken', w / 2, 82); });
    const post = std({ color: 0x9aa0a6, metalness: 0.8, roughness: 0.35 }); add(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), post, POOL.x + 7.4, BASE_Y + 1.1, POOL.z + POOL.r + 1.2); add(new THREE.PlaneGeometry(1.6, 0.4), std({ map: t }), POOL.x + 7.4, BASE_Y + 2.0, POOL.z + POOL.r + 1.25, { cast: false }); }

  // ---------------- Felsen und Seetang am Meeresboden (Palmen, Gras, Boote und mehr: ozeandeko.js) ----------------
  {
    const m4 = new THREE.Matrix4(); const qq = new THREE.Quaternion();
    // Felsen und Seetang
    const rockG = new THREE.IcosahedronGeometry(1, 1); { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const f = 0.75 + Math.abs(Math.sin(p.getX(i) * 5.1 + p.getY(i) * 3.7 + p.getZ(i) * 2.3)) * 0.4; p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.6, p.getZ(i) * f); } rockG.computeVertexNormals(); }
    const rocks = []; const weed = []; for (let t = 0; t < 30000 && (rocks.length < 320 || weed.length < 700); t++) { const x = GRID.x0 + R() * (GRID.x1 - GRID.x0); const z = GRID.z0 + R() * (GRID.z1 - GRID.z0); if (!maskAt(x, z)) continue; const h = bedH(x, z); if (h > -0.6) continue; if (R() < 0.3 && rocks.length < 320) rocks.push({ x, z, y: h, s: 0.4 + R() * 1.6, ry: R() * 6.28 }); else if (weed.length < 700) weed.push({ x, z, y: h, s: 0.6 + R() * 0.9, ry: R() * 6.28 }); }
    const rm = new THREE.InstancedMesh(rockG, std({ color: 0x77706a, roughness: 0.9 }), rocks.length); rocks.forEach((p, i) => { qq.setFromAxisAngle(V3(0, 1, 0), p.ry); m4.compose(V3(p.x, p.y + 0.15 * p.s, p.z), qq, V3(p.s, p.s, p.s)); rm.setMatrixAt(i, m4); }); rm.castShadow = true; rm.receiveShadow = true; rm.computeBoundingSphere(); scene.add(rm);
    const wg = new THREE.PlaneGeometry(0.18, 1.4, 1, 5).translate(0, 0.7, 0); { const p = wg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.sin(y * 2.5) * 0.12); } }
    const wm = std({ color: 0x3a6a2a, roughness: 0.8, side: THREE.DoubleSide }); W.weedMat = wm; const wi = new THREE.InstancedMesh(wg, wm, weed.length * 3); let n2 = 0; weed.forEach((p) => { for (let k = 0; k < 3; k++) { qq.setFromAxisAngle(V3(0, 1, 0), p.ry + k * 2.1); m4.compose(V3(p.x + (k - 1) * 0.15, p.y - 0.05, p.z + (k % 2) * 0.12), qq, V3(1, p.s * (0.7 + k * 0.2), 1)); wi.setMatrixAt(n2++, m4); } }); wi.computeBoundingSphere(); scene.add(wi);
  }

  // ---------------- Handy (Pazifik) und Goldkette (Atlantik) am tiefsten Punkt ----------------
  { const ph = phoneModel('📱'); ph.rotation.x = -Math.PI / 2; ph.rotation.z = 0.6; ph.scale.setScalar(3); const p0 = BODEN[0]; ph.position.set(p0[0], bedH(p0[0], p0[1]) + 0.04, p0[1]); scene.add(ph); W.phone = ph;
    const gc = goldChain(); gc.scale.setScalar(3); const p1 = BODEN[1]; gc.position.set(p1[0], bedH(p1[0], p1[1]) + 0.02, p1[1]); scene.add(gc); W.chain = gc;
    const beacon = (x, z, col) => { const l = new THREE.PointLight(col, 0, 14, 1.4); l.position.set(x, bedH(x, z) + 1.2, z); scene.add(l); return l; }; W.beacons = [beacon(p0[0], p0[1], 0x7ac8ff), beacon(p1[0], p1[1], 0xffd060)]; }

  // ---------------- Meerestiere ----------------
  // need: Mindesttiefe, y: Höhe über dem Boden (bottom) oder Abstand zur Oberfläche, speed m/s, s: Größe
  const KINDS = { Wal: { need: 4.5, top: 1.6, speed: 2.2, s: 1, turn: 0.35 }, Hai: { need: 2.6, top: 1.2, speed: 3.4, s: 1, turn: 0.9 }, Schildkroete: { need: 1.4, top: 0.7, speed: 1.3, s: 1, turn: 0.8 }, Clownfisch: { need: 1.1, top: 0.6, speed: 1.8, s: 1.4, turn: 2 }, Qualle: { need: 2.2, top: 1.4, speed: 0.4, s: 1, turn: 0.4 }, Krake: { need: 1.2, bottom: true, speed: 0.7, s: 1, turn: 0.7 } };
  const SPAWN = [[['Wal', 1], ['Hai', 2], ['Schildkroete', 2], ['Clownfisch', 4], ['Qualle', 3], ['Krake', 1]], [['Wal', 1], ['Hai', 1], ['Schildkroete', 1], ['Clownfisch', 3], ['Qualle', 2]]];
  function pickSpot(m, need, lv, near) { for (let t = 0; t < 60; t++) { let x; let z; if (near && t < 40) { x = near.x + (R() - 0.5) * 70; z = near.z + (R() - 0.5) * 70; } else { x = GRID.x0 + R() * (GRID.x1 - GRID.x0); z = GRID.z0 + R() * (GRID.z1 - GRID.z0); } if (maskAt(x, z) !== m + 1) continue; if (lv - bedH(x, z) >= need) return { x, z }; } return null; }
  SPAWN.forEach((list, m) => list.forEach(([kind, n]) => { for (let k = 0; k < n; k++) { const md = buildModel(kind, { shadow: false }); const K = KINDS[kind]; md.group.scale.setScalar(K.s * (0.85 + R() * 0.3)); scene.add(md.group); const sp = pickSpot(m, K.need, 0) || { x: BODEN[m][0], z: BODEN[m][1] }; const a = { kind, K, m, md, x: sp.x, z: sp.z, y: -2, h: R() * 6.28, tx: sp.x, tz: sp.z, ph: R() * 10, pool: false, krake: kind === 'Krake' && m === 0 }; if (a.krake) { a.x = BODEN[0][0] + 1.5; a.z = BODEN[0][1] + 0.8; } W.animals.push(a); } }));
  function animalTick(a, dt, t, lv) {
    const K = a.K; const md = a.md; const g = md.group;
    if (a.pool) { // im Tierbecken: kleine Kreise
      const r = a.kind === 'Wal' ? 5.5 : 2 + (a.ph % 1) * 6; const w = (K.speed / Math.max(2, r)) * 0.5; const ang = t * w + a.ph; a.x = POOL.x + Math.cos(ang) * r; a.z = POOL.z + Math.sin(ang) * r; a.h = Math.atan2(-Math.sin(ang), Math.cos(ang));
      const yy = a.kind === 'Krake' ? POOL.floor + 0.05 : a.kind === 'Wal' ? POOL.y - 0.9 : POOL.y - 0.5 - (a.ph % 0.6); g.position.set(a.x, yy, a.z); g.rotation.set(0, Math.atan2(-Math.cos(a.h), Math.sin(a.h)), 0);
    } else {
      const here = lv[a.m] - bedH(a.x, a.z); const dist = Math.hypot(a.tx - a.x, a.tz - a.z);
      if (a.krake) { a.tx = BODEN[0][0] + 1.5; a.tz = BODEN[0][1] + 0.8; } else if (dist < 3 || lv[a.m] - bedH(a.tx, a.tz) < K.need) { const s = pickSpot(a.m, K.need, lv[a.m], { x: a.x, z: a.z }); if (s) { a.tx = s.x; a.tz = s.z; } }
      const want = Math.atan2(a.tx - a.x, a.tz - a.z); let dh = want - a.h; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2; a.h += clamp(dh, -K.turn * dt, K.turn * dt);
      const sp = a.krake ? (dist > 0.4 ? K.speed : 0) : K.speed * (here < K.need * 0.7 ? 1.6 : 1); const nx = a.x + Math.sin(a.h) * sp * dt; const nz = a.z + Math.cos(a.h) * sp * dt; if (lv[a.m] - bedH(nx, nz) > Math.min(K.need * 0.6, here + 0.01) || a.krake) { a.x = nx; a.z = nz; }
      const bed = bedH(a.x, a.z); const top = lv[a.m] - (K.top || 0.5); const yy = K.bottom ? bed + 0.02 : clamp(lerp(bed + 0.6, top, 0.7) + Math.sin(t * 0.5 + a.ph) * 0.3, bed + 0.3, top);
      g.position.set(a.x, yy, a.z); g.rotation.set(0, Math.atan2(-Math.cos(a.h), Math.sin(a.h)), 0);
      g.visible = lv[a.m] - bed > 0.3;
    }
    // Bewegung der Teile
    const P = md.parts; const s = Math.sin(t * (a.kind === 'Hai' ? 5 : a.kind === 'Wal' ? 1.4 : 3) + a.ph);
    if (a.kind === 'Hai' && P.Hai_Schwanzflosse) P.Hai_Schwanzflosse.rotation.y = s * 0.35;
    if (a.kind === 'Wal') { if (P.Wal_Fluke) P.Wal_Fluke.rotation.z = s * 0.18; for (const n of ['Wal_Flosse_L', 'Wal_Flosse_R']) if (P[n]) P[n].rotation.x = s * 0.12 * (n.endsWith('L') ? 1 : -1); }
    if (a.kind === 'Qualle') { const k = 1 + Math.sin(t * 2.2 + a.ph) * 0.08; g.scale.set(k, 1 / k, k); }
    if (a.kind === 'Schildkroete' && P['Schildkröte_Flossen']) P['Schildkröte_Flossen'].rotation.x = s * 0.15;
    if (a.kind === 'Krake') { const k = 1 + Math.sin(t * 1.6 + a.ph) * 0.06; g.scale.set(k, 1, k); }
    if (a.kind === 'Clownfisch') g.rotation.y += s * 0.15;
  }
  // Tiere ins Becken (wenn der Ozean fast leer ist)
  W.toPool = (m, on = true) => { for (const a of W.animals) if (a.m === m) { a.pool = on; a.md.group.visible = true; if (on) a.md.group.scale.setScalar(a.kind === 'Wal' ? 0.55 : a.K.s * 0.9); } };

  // ---------------- Rauch, Spritzer ----------------
  { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); W.puffMat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, color: 0xffffff });
    for (let i = 0; i < 120; i++) { const s = new THREE.Sprite(W.puffMat.clone()); s.visible = false; scene.add(s); W.smoke.push({ s, life: 0, v: V3(), p: V3(), g: 0, size: 1 }); } }
  W.puff = (p, col = 0xffffff, size = 1, v = null, grav = 0) => { const q = W.smoke.find((x) => x.life <= 0); if (!q) return; q.life = 1; q.p.copy(p); if (v) q.v.copy(v); else q.v.set((Math.random() - 0.5) * 0.4, 1.0 + Math.random() * 0.6, (Math.random() - 0.5) * 0.4); q.g = grav; q.size = size; q.s.material.color.setHex(col); q.s.visible = true; };
  W.splash = (p, n = 8, size = 0.25) => { for (let i = 0; i < n; i++) W.puff(p, 0xe8f6ff, size * (0.6 + Math.random() * 0.8), V3((Math.random() - 0.5) * 2.2, 1.8 + Math.random() * 2.2, (Math.random() - 0.5) * 2.2), 9); };

  // ---------------- XXXXL-Pumpen mit Leitung, Roboter am Ufer ----------------
  W.helpers = { xxxxl: [], pipes: [], helfer: [], pump: [], schwimm: [], meer: -1, key: '' }; W.dyn = [];
  const pipeM = std({ color: 0xc8ccd0, metalness: 0.85, roughness: 0.25 });
  W.setHelpers = (S) => { // Modelle nach dem Spielstand (nur wenn sich die Zahl ändert)
    const H = W.helpers; const key = `${S.meer}|${S.helfer.xxxxl}|${S.helfer.helfer}|${S.helfer.pump}|${S.helfer.schwimm}`; if (key === H.key) return; H.key = key; const hb = HARBOR[S.meer];
    const sync = (list, n, name, mk) => { while (list.length > n) { const o = list.pop(); scene.remove(o.md.group); } while (list.length < n) { const md = buildModel(name); scene.add(md.group); list.push(mk(md, list.length)); } };
    if (H.meer !== S.meer) { for (const k of ['xxxxl', 'helfer', 'pump', 'schwimm']) sync(H[k], 0); H.meer = S.meer; for (const p of H.pipes) scene.remove(p); H.pipes = []; H.pipeKey = ''; }
    sync(H.xxxxl, S.helfer.xxxxl, 'XXXXL', (md, n) => { const p = hb.xxxxl[n]; md.group.position.set(p.x, bedH(p.x, p.z) - 0.05, p.z); md.group.rotation.y = hb.yaw + Math.PI; md.group.scale.setScalar(0.75); return { md, x: p.x, z: p.z }; });
    W.dyn = H.xxxxl.map((x) => ({ x: x.x, z: x.z, r: 2.6, veh: true }));
    // Jeder Roboter hat seine eigene Bahn (seitlicher Abstand zum Steg) und sucht dort die echte Wasserkante, damit sie sich verteilen und bewegen.
    // Fassung 1 lief nur auf dem Pumpenweg: Solange der Ozean voll war, lag die Kante direkt am Steg, und alle standen auf einem Fleck.
    const lane = (n, a, b) => (n % 2 ? 1 : -1) * (a + Math.floor(n / 2) * b);
    sync(H.helfer, S.helfer.helfer, 'Helfer', (md, n) => ({ md, ph: (n * 0.618) % 1, side: lane(n, 4, 1.7), leg: 0, wait: 0, x: null, z: null, yaw: 0 }));
    sync(H.pump, S.helfer.pump, 'Pumprobo', (md, n) => ({ md, ph: n, side: lane(n, 5.5, 2.6), x: null, z: null, yaw: 0 }));
    sync(H.schwimm, S.helfer.schwimm, 'Schwimmrobo', (md, n) => ({ md, ph: n * 1.7, side: lane(n, 3, 3.2), out: 6 + (n % 3) * 7, x: null, z: null }));
    for (const r of H.schwimm) r.md.group.scale.setScalar(1.6); for (const r of H.pump) r.md.group.scale.setScalar(1.3); for (const r of H.helfer) r.md.group.scale.setScalar(1.25);
  };
  W.pathPoint = pathPoint;
  const WEG_LEN = WEG.map((p) => p.reduce((a, q, k) => a + (k ? Math.hypot(q[0] - p[k - 1][0], q[1] - p[k - 1][1]) : 0), 0));
  function helpersTick(dt, t, S) {
    const H = W.helpers; if (H.meer < 0) return; const i = H.meer; const lv = W.levels[i]; const hb = HARBOR[i]; const e = edgeOnPath(i, lv); const dry = S && S.done[i];
    // Leitung der XXXXL-Pumpen: vom Hafen den Pumpenweg entlang bis ins Wasser
    const pk = `${H.xxxxl.length}|${Math.round(e.d / 4)}`; if (pk !== H.pipeKey) { H.pipeKey = pk; for (const p of H.pipes) { scene.remove(p); p.geometry.dispose(); } H.pipes = [];
      H.xxxxl.forEach((x, n) => { const pts = [V3(x.x, bedH(x.x, x.z) + 1.0, x.z)]; const off = (n - (H.xxxxl.length - 1) / 2) * 1.1; const end = Math.min(e.d + 6, 9999); for (let d = 0; d <= end; d += 4) { const q = pathPoint(i, d); const px = q.x + q.dz * off; const pz = q.z - q.dx * off; pts.push(V3(px, Math.max(bedH(px, pz), lv - 0.6) + 0.35, pz)); } if (pts.length < 3) return; const curve = new THREE.CatmullRomCurve3(pts); const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(400, pts.length * 3), 0.32, 8, false), pipeM); tube.castShadow = true; scene.add(tube); H.pipes.push(tube); }); }
    for (const x of H.xxxxl) { const P = x.md.parts; if (P.XXXXL_Pumpe_Laufrad) P.XXXXL_Pumpe_Laufrad.rotation.x = dry ? 0 : t * 12; }
    // Wasserkante auf jeder Bahn (gemerkt, bis sich der Pegel merklich ändert)
    if (H.laneLv === undefined || Math.abs(H.laneLv - lv) > 0.02 || H.laneMeer !== i) { H.laneLv = lv; H.laneMeer = i; H.lanes = new Map(); }
    const water = (x, z, min) => maskAt(x, z) === i + 1 && lv - bedH(x, z) > min;
    const laneEdge = (side) => { // vom Land (hinter dem Steg) die Bahn entlang, bis Wasser kommt; danach weiter, bis es tief genug zum Schwimmen ist
      let c = H.lanes.get(side); if (c) return c; const len = WEG_LEN[i] + 60; let edge = null; let deep = null;
      for (let d = -34; d < len; d += 1.5) { const q = pathPoint(i, d); const x = q.x + q.dz * side; const z = q.z - q.dx * side; if (!edge) { if (water(x, z, 0.12)) edge = { x, z, dx: q.dx, dz: q.dz, d }; } else if (water(x, z, 0.9)) { deep = { x, z, dx: q.dx, dz: q.dz, d }; break; } else if (d - edge.d > 45) break; }
      if (!edge) { const q = pathPoint(i, e.d); edge = { x: q.x, z: q.z, dx: q.dx, dz: q.dz, d: e.d }; }
      c = { edge, deep: deep || edge }; H.lanes.set(side, c); return c;
    };
    const moveTo = (r, tx, tz, sp, dt) => { const dx = tx - r.x; const dz = tz - r.z; const d = Math.hypot(dx, dz); if (d < 1e-3) return 0; const st = Math.min(d, sp * dt); r.x += (dx / d) * st; r.z += (dz / d) * st; r.yaw = Math.atan2(dx, dz) + Math.PI; return d - st; };
    const cnt = hb.counter; const ux = hb.dir.x; const uz = hb.dir.z;
    // Helferroboter: holen am Wasser einen Eimer voll und bringen ihn zum Händler, jeder auf seiner Bahn
    H.helfer.forEach((r, n) => {
      const L = laneEdge(r.side).edge; const fan = clamp(r.side * 0.3, -5, 5); const hx = cnt.x - ux * 1.2 + uz * fan; const hz = cnt.z - uz * 1.2 - ux * fan; // am Tresen, nebeneinander
      const wx = L.x - L.dx * 0.6; const wz = L.z - L.dz * 0.6; const span = Math.hypot(wx - hx, wz - hz); const sp = clamp(span / 9, 1.8, 9);
      if (r.x === null) { r.x = hx + (wx - hx) * r.ph; r.z = hz + (wz - hz) * r.ph; r.leg = n % 2; }
      let walking = false; if (dry) { /* nichts mehr zu holen */ } else if (r.wait > 0) r.wait -= dt; else { const left = r.leg === 0 ? moveTo(r, wx, wz, sp, dt) : moveTo(r, hx, hz, sp, dt); walking = true; if (left < 0.05) { r.leg ^= 1; r.wait = r.leg ? 1.1 : 0.7; } }
      const g = r.md.group; g.position.set(r.x, Math.max(bedH(r.x, r.z), lv - 0.25), r.z); g.rotation.y = r.wait > 0 && r.leg === 1 ? Math.atan2(L.dx, L.dz) + Math.PI : r.yaw; g.rotation.x = r.wait > 0 && r.leg === 1 ? 0.35 * Math.sin(Math.min(1, (1.1 - r.wait) / 1.1) * Math.PI) : 0; // am Wasser bückt er sich zum Schöpfen
      const P = r.md.parts; const w = walking ? Math.sin(t * 9 + n) * 0.5 : 0; if (P.Helferroboter_Bein_L) P.Helferroboter_Bein_L.rotation.x = w; if (P.Helferroboter_Bein_R) P.Helferroboter_Bein_R.rotation.x = -w;
    });
    // Pumproboter: fahren auf Ketten an die Wasserkante ihrer Bahn und folgen ihr, wenn das Wasser zurückgeht; beim Pumpen rütteln sie
    H.pump.forEach((r) => {
      const L = laneEdge(r.side).edge; const tx = L.x - L.dx * 1.6; const tz = L.z - L.dz * 1.6; if (r.x === null) { r.x = tx; r.z = tz; }
      const left = moveTo(r, tx, tz, 3, dt); const at = left < 0.1; const g = r.md.group; const shake = at && !dry ? Math.sin(t * 38 + r.ph) * 0.02 : 0;
      g.position.set(r.x + shake, bedH(r.x, r.z) + (at && !dry ? Math.abs(Math.sin(t * 19 + r.ph)) * 0.03 : 0), r.z); g.rotation.y = at ? Math.atan2(L.dx, L.dz) + Math.PI : r.yaw;
    });
    // Schwimmroboter: draußen im tiefen Wasser ihrer Bahn, ziehen langsame Kreise und schaukeln auf den Wellen
    H.schwimm.forEach((r, n) => {
      const L = laneEdge(r.side).deep; const cx = L.x + L.dx * r.out; const cz = L.z + L.dz * r.out; const tx = cx + Math.sin(t * 0.25 + r.ph) * 3; const tz = cz + Math.cos(t * 0.25 + r.ph) * 3; if (r.x === null) { r.x = tx; r.z = tz; }
      moveTo(r, tx, tz, 2.5, dt); const dep = lv - bedH(r.x, r.z); const g = r.md.group; g.visible = dep > 0.3 && !dry; g.position.set(r.x, lv + waveY(r.x, r.z, t, dep) - 0.12, r.z); g.rotation.set(Math.sin(t * 1.3 + r.ph) * 0.06, r.yaw, Math.cos(t * 1.1 + r.ph) * 0.06);
    });
  }

  // ---------------- Tag und Nacht ----------------
  W.setTime = (min) => {
    const m = ((min % 1440) + 1440) % 1440; const e = m > 360 && m < 1260 ? Math.sin(Math.PI * (m - 360) / 900) : -0.3; const az = (90 + 180 * clamp((m - 360) / 900, 0, 1)) * Math.PI / 180;
    const key = e > 0.28 ? 'day' : e > 0 ? 'gold' : 'night'; const mood = key === 'day' ? day : key === 'gold' ? gold : night; const sky = skies[key];
    if (W.sky !== sky) { W.sky = sky; scene.background = sky.cube; scene.environment = sky.env; }
    if (e > 0) { W.sunDir.set(Math.sin(az) * Math.cos(Math.asin(e)), Math.max(0.12, e), -Math.cos(az) * Math.cos(Math.asin(e))).normalize(); sun.color.setHex(mood.sun); sun.intensity = mood.sunI * (0.25 + 0.75 * Math.min(1, e * 1.6)); }
    else { W.sunDir.set(0.4, 0.75, -0.5).normalize(); sun.color.setHex(0x9fb8e8); sun.intensity = 0.5; }
    scene.environmentIntensity = key === 'night' ? 0.25 : key === 'gold' ? 0.65 : 0.9; hemi.intensity = key === 'night' ? 0.08 : 0.4; W.mood = mood; W.night = key === 'night'; W.dusk = key !== 'day'; W.houseLight.intensity = W.night ? 14 : 9; for (const l of W.kioskLights) l.intensity = key === 'day' ? 0 : 22; for (const b of W.kioskBulbs) b.material.emissiveIntensity = key === 'day' ? 0 : 3;
  };
  // Pegel setzen (Meter), Wasser ein- und ausblenden
  W.setLevels = (lv, dry) => { W.levels = lv; W.uniforms.uLevel.value.set(lv[0], lv[1]); W.water.forEach((w, i) => { w.mesh.position.y = lv[i]; w.uLv.value = lv[i]; w.mesh.visible = !(dry && dry[i]); }); };
  W.flash = 0;
  W.update = (t, dt, cam, S) => {
    W.t = t; W.uniforms.uTime.value = t; sun.position.copy(cam).add(W.sunDir.clone().multiplyScalar(150)); sun.target.position.copy(cam); sun.target.updateMatrixWorld();
    NRM.offset.set(Math.sin(t * 0.05) * 0.3, t * 0.018);
    for (const q of W.smoke) { if (q.life <= 0) continue; q.life -= dt * (q.g ? 1.4 : 0.35); q.v.y -= q.g * dt; q.p.addScaledVector(q.v, dt); q.s.position.copy(q.p); const s = q.g ? q.size * (0.6 + q.life * 0.6) : (1.6 - q.life) * 1.6 * q.size; q.s.scale.set(s, s, s); q.s.material.opacity = Math.max(0, q.life) * (q.g ? 0.9 : 0.55); if (q.life <= 0) q.s.visible = false; }
    if (W.flash > 0) { W.flash = Math.max(0, W.flash - dt * 3); hemi.intensity += W.flash * 3; }
    for (const a of W.animals) { if (a.cut) continue; const far = Math.hypot(a.x - cam.x, a.z - cam.z) > 170 && !a.pool; if (far) { a.md.group.visible = false; if ((a.skip = (a.skip || 0) + dt) < 0.5) continue; a.skip = 0; } animalTick(a, far ? 0.5 : dt, t, W.levels); if (far) a.md.group.visible = false; }
    if (W.deko) W.deko.update(t, dt, cam, S); helpersTick(dt, t, S); W.dealers.forEach((p) => { if (Math.hypot(p.x - cam.x, p.z - cam.z) < 60) p.update(dt, t); });
    W.beacons.forEach((b, i) => { b.intensity = S && S.done[i] ? 3 + Math.sin(t * 4) * 1.5 : 0; });
    for (let i = W.anim.length - 1; i >= 0; i--) if (W.anim[i](dt)) W.anim.splice(i, 1);
  };
  // Preistafel am Kiosk
  W.drawBoards = (S) => { for (const b of W.boards) { const c = b.cv.getContext('2d'); const w = b.cv.width; const h = b.cv.height; const on = S.meer === b.i || S.done[b.i]; c.fillStyle = '#10161e'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f5f6f4'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); c.fillStyle = '#f9bd00'; c.font = '700 44px Bahnschrift'; c.textAlign = 'center'; c.fillText(`${MEERE[b.i].name}wasser`, w / 2, 76); c.fillStyle = '#f5f6f4'; c.font = '800 92px Bahnschrift';
    c.fillText(S.done[b.i] ? 'AUSVERKAUFT' : `${MEERE[b.i].preis} € / Liter`, w / 2, 180); c.font = '600 32px Bahnschrift'; c.fillStyle = '#9fd0ff'; c.fillText(S.done[b.i] ? 'Der Ozean ist leer.' : on ? 'Wir kaufen jeden Tropfen.' : `ab Stufe ${b.i + 1}`, w / 2, 250); b.tex.needsUpdate = true; } };
  W.deko = buildDeko(W, { HARBOR, POOL, HOUSE, waveY });
  W.setTime(DAY_START_MIN); W.setLevels([levelOf(0, MEERE[0].liter), levelOf(1, MEERE[1].liter)]);
  return W;
}
const DAY_START_MIN = 8 * 60;
