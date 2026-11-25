// Theos Seitenscheidel - Spielwelt des Rennmodus in der neuen Grafik: gleiche Strecke, gleiche Bäume und Hitboxen wie world.js, aber Gelände mit Waldboden, echte Fahrbahn, Wald aus raceflora.js, Himmel aus racesky.js.
// Thema je Karte (track.theme): Wald, Gebirge, Rennstrecke, Stadt, Küste; die Kulissen liegen in racescene.js.
import * as THREE from './vendor/three.module.min.js';
import { VERGE_HALF, mulberry32, SEA_Y } from './track.js';
import { buildTextures } from './racetex.js';
import { bakeSky, moodOf, sunVector } from './racesky.js';
import { buildFlora, buildUnder } from './raceflora.js';
import { patchShadow, RT, AMB } from './racemat.js';
import { dressTheme } from './racescene.js';

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Boden: Waldboden, Rasen, Splitt und Schlamm nach Lage, Überhöhung und Rauschen ineinander; zwei Maßstäbe, damit keine Kachel erkennbar wird
const GROUND_VS = 'attribute vec3 aG; varying vec3 vG; varying vec3 vWP;';
const GROUND_PARS = `varying vec3 vG; varying vec3 vWP; uniform sampler2D tFA, tFN, tTA, tTN, tGA, tGN, tMA, tMN, tRA, tRN; uniform float uRockK, uSeaY, uSnowY, uTurfK;
vec4 hb(vec4 a, float wa, vec4 b, float wb) { float d = 0.14; float m = max(a.a + wa, b.a + wb) - d; float x = max(a.a + wa - m, 0.0), y = max(b.a + wb - m, 0.0); return (a * x + b * y) / (x + y + 1e-4); }`;
const GROUND_ALB = `
  vec2 wuv = vWP.xz; float lat = vG.x; float open = vG.y; float mudK = vG.z;
  vec2 u1 = wuv * 0.41, u2 = wuv.yx * 0.13 + 0.31; float macro = texture2D(tFA, wuv * 0.0071 + 0.2).a; float mac2 = texture2D(tTA, wuv * 0.019).a;
  vec4 fA = mix(texture2D(tFA, u1), texture2D(tFA, u2), 0.42); vec4 fN = mix(texture2D(tFN, u1), texture2D(tFN, u2), 0.42);
  vec2 u3 = wuv * 0.31, u4 = wuv.yx * 0.093 + 0.17; vec4 tA = mix(texture2D(tTA, u3), texture2D(tTA, u4), 0.45); vec4 tN = mix(texture2D(tTN, u3), texture2D(tTN, u4), 0.45);
  vec2 u5 = wuv * 0.37; vec4 gA = texture2D(tGA, u5); vec4 gN = texture2D(tGN, u5); vec4 mA = texture2D(tMA, wuv * 0.23); vec4 mN = texture2D(tMN, wuv * 0.23);
  float wT = clamp(smoothstep(0.26, 0.72, open * 0.82 + (macro - 0.5) * 1.5 + (mac2 - 0.5) * 0.7) + uTurfK, 0.0, 1.0); float wG = 1.0 - smoothstep(0.0, 1.0, (lat - 4.75 - mac2 * 2.2) / 1.5); float wM = clamp(mudK * (0.55 + mac2), 0.0, 1.0);
  vec4 cA = hb(fA, 1.0 - wT, tA, wT); vec4 cN = hb(fN, 1.0 - wT, tN, wT); cA = hb(cA, 1.0 - wG, gA, wG); cN = hb(cN, 1.0 - wG, gN, wG); cA = hb(cA, 1.0 - wM, mA, wM); cN = hb(cN, 1.0 - wM, mN, wM);
  { vec3 wnG = inverseTransformDirection(normalize(vNormal), viewMatrix); if (uRockK > 0.0) { float rk = smoothstep(0.86, 0.68, wnG.y + (mac2 - 0.5) * 0.22) * uRockK; vec2 r1 = vec2(wuv.x + vWP.y, wuv.y - vWP.y) * 0.13; vec4 rA = texture2D(tRA, r1); vec4 rN = texture2D(tRN, r1); cA = hb(cA, 1.0 - rk, rA, rk); cN = hb(cN, 1.0 - rk, rN, rk); } if (uSnowY < 900.0) { float sn = smoothstep(uSnowY, uSnowY + 22.0, vWP.y + (macro - 0.5) * 34.0) * smoothstep(0.6, 0.86, wnG.y); cA = mix(cA, vec4(0.86, 0.9, 0.96, 0.6), sn); cN = mix(cN, vec4(0.5, 0.5, 0.8, 0.9), sn); } if (uSeaY > -900.0) { float sa = 1.0 - smoothstep(uSeaY + 0.8, uSeaY + 3.4, vWP.y + (mac2 - 0.5) * 2.0); cA = mix(cA, vec4(gA.rgb * vec3(1.9, 1.62, 1.14) + 0.14, 0.4), sa); } }
  float tone = 0.76 + 0.46 * macro; diffuseColor.rgb = cA.rgb * tone * mix(vec3(1.0), vec3(1.08, 1.02, 0.86), mac2);`;
const GROUND_NOR = `
  { vec2 t = (cN.xy * 2.0 - 1.0) * 1.15; vec3 wn = inverseTransformDirection(normal, viewMatrix); wn = normalize(vec3(wn.x + t.x, wn.y, wn.z + t.y)); normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); }`;
function groundMaterial(T, track) {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0.8 });
  m.onBeforeCompile = (s) => { patchShadow(s); Object.assign(s.uniforms, { tFA: { value: T.forest.a }, tFN: { value: T.forest.n }, tTA: { value: T.turf.a }, tTN: { value: T.turf.n }, tGA: { value: T.gravel.a }, tGN: { value: T.gravel.n }, tMA: { value: T.mud.a }, tMN: { value: T.mud.n }, tRA: { value: T.rock.a }, tRN: { value: T.rock.n }, uRockK: { value: track.theme === 'mountain' ? 1 : track.theme === 'coast' ? 0.9 : 0 }, uSeaY: { value: track.theme === 'coast' ? SEA_Y : -999 }, uSnowY: { value: track.theme === 'mountain' ? 42 : 999 }, uTurfK: { value: track.theme === 'circuit' || track.theme === 'city' ? 1 : track.theme === 'coast' || track.theme === 'mountain' ? 0.35 : 0 } });
    s.vertexShader = s.vertexShader.replace('#include <common>', `#include <common>\n${GROUND_VS}`).replace('#include <begin_vertex>', '#include <begin_vertex>\nvG = aG; vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\n${GROUND_PARS}`).replace('#include <map_fragment>', GROUND_ALB).replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(cN.b * 1.2, 0.05, 1.0);').replace('#include <normal_fragment_maps>', GROUND_NOR)
      .replace('#include <aomap_fragment>', 'float gAO = (0.36 + 0.64 * open) * mix(1.0, cN.a, 0.8); vec3 cTint = mix(vec3(0.74, 0.92, 0.6), vec3(1.0), open * open); float gl = dot(reflectedLight.indirectDiffuse, vec3(0.3, 0.6, 0.1)); reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse, vec3(gl) * vec3(1.04, 1.0, 0.9), 0.45) * gAO * cTint; reflectedLight.indirectSpecular *= gAO * cTint * 0.55; reflectedLight.directDiffuse *= mix(1.0, cN.a, 0.35);'); };
  m.customProgramCacheKey = () => 'raceGround'; return m;
}

// Fahrbahn: Körnung und Fahrspuren, Flickstellen, Risse, Markierung, Bankett, Schlammstellen mit Pfützen. vR = (Querabstand, Länge, Schlamm)
const ROAD_PARS = `varying vec3 vR; varying float vKurve; uniform sampler2D tAA, tAN, tGA, tGN, tMA, tMN, tFA; uniform float uDash, uKerb, uLeaf, uGutter;
float rh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
float rn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rh(i), rh(i + vec2(1, 0)), f.x), mix(rh(i + vec2(0, 1)), rh(i + vec2(1, 1)), f.x), f.y); }`;
const ROAD_ALB = `
  float lat = vR.x, sl = vR.y, mudK = vR.z, a = abs(lat); vec2 ruv = vec2(lat, sl) / 3.2; vec2 ruv2 = vec2(sl, -lat) / 11.3 + 0.13;
  vec4 aA = mix(texture2D(tAA, ruv), texture2D(tAA, ruv2 * 3.1), 0.35); vec4 aN = texture2D(tAN, ruv); float macro = texture2D(tFA, vec2(lat, sl) * 0.0083).a; float m2 = texture2D(tFA, vec2(sl, lat) * 0.031).a; vec3 col = aA.rgb * (0.82 + 0.5 * macro);
  float tracks = exp(-pow((a - 0.92) / 0.42, 2.0)) + exp(-pow((a - 2.72) / 0.44, 2.0)); col *= 1.0 - 0.26 * tracks * (0.6 + 0.8 * m2); float rg = mix(1.0, 0.72, tracks);
  { vec2 p = vec2(sl * 0.11, lat * 0.46); vec2 c = floor(p); float h = rh(c + 3.0); vec2 f = fract(p); if (h > 0.76) { float e = min(min(f.x, 1.0 - f.x) * 8.0, min(f.y, 1.0 - f.y) * 3.0); float pm = smoothstep(0.0, 0.3, e + (rn(vec2(sl, lat) * 2.3) - 0.5) * 0.4); col = mix(col, col * (0.5 + 0.2 * h), pm * 0.9); rg = mix(rg, 0.84, pm); } }
  { float n = rn(vec2(sl * 0.42, lat * 2.2)); float cr = 1.0 - smoothstep(0.0, 0.025, abs(n - 0.5) + 0.012 * rn(vec2(sl, lat) * 7.0)); cr *= smoothstep(0.42, 0.62, rn(vec2(sl * 0.05, lat * 0.2) + 5.0)); col = mix(col, vec3(0.012), cr * 0.85); }
  float lineWear = smoothstep(0.26, 0.58, texture2D(tAA, ruv * 2.4).a + (macro - 0.5) * 0.7); float edge = 1.0 - smoothstep(0.06, 0.08, abs(a - 3.28)); float dash = (1.0 - smoothstep(0.055, 0.075, a)) * step(fract(sl / 12.0), 0.34) * uDash; float paint = max(edge, dash) * lineWear * 0.93; col = mix(col, vec3(0.74, 0.73, 0.68), paint); rg = mix(rg, 0.82, paint);
  { float kb = vKurve * 12.0; float sk = 0.0; for (int i = 0; i < 2; i++) { float o = (i == 0 ? 0.86 : 2.46) + kb * sin(sl * 0.07 + float(i)) * 0.12; float line = smoothstep(0.17, 0.05, abs(a - o)); sk += line; } sk *= smoothstep(0.015, 0.05, abs(vKurve)) * smoothstep(0.26, 0.6, rn(vec2(sl * 0.06, lat * 0.5)) + 0.28 * m2); col = mix(col, vec3(0.012, 0.012, 0.014), min(sk, 1.0) * 0.72); rg = mix(rg, 0.74, min(sk, 1.0)); }
  { vec4 lf = texture2D(tFA, vec2(lat, sl) * 0.41); float m = smoothstep(2.1, 3.5, a + (macro - 0.5) * 2.2) * smoothstep(0.34, 0.62, lf.a + (m2 - 0.5) * 0.8) * 0.82 * uLeaf; col = mix(col, lf.rgb * 0.92, m); rg = mix(rg, 1.1, m); }
  vec4 gA = texture2D(tGA, vec2(lat, sl) * 0.42); vec4 gN = texture2D(tGN, vec2(lat, sl) * 0.42); float sh = smoothstep(3.42 + 0.34 * (macro - 0.5) + 0.3 * m2, 3.9, a + (gA.a - 0.5) * 0.46); col = mix(col, gA.rgb * (0.9 + 0.3 * macro), sh); vec2 nrmXY = mix(aN.xy, gN.xy, sh); float rgh = mix(aN.b * 1.24 * rg, gN.b * 1.2, sh); float aoR = mix(aN.a, gN.a, sh);
  if (uGutter > 0.5) { col = mix(col, aA.rgb * 0.5, sh); nrmXY = mix(nrmXY, aN.xy, sh); rgh = mix(rgh, 0.8, sh); }
  if (uKerb > 0.5) { float ke = smoothstep(3.36, 3.4, a) * (1.0 - smoothstep(4.02, 4.06, a)); float st = step(0.5, fract(sl / 5.0)); vec3 kc = mix(vec3(0.72, 0.05, 0.03), vec3(0.8, 0.79, 0.74), st); col = mix(col, kc, ke); rgh = mix(rgh, 0.5, ke); nrmXY = mix(nrmXY, vec2(0.5), ke); float gr = smoothstep(4.06, 4.12, a); col = mix(col, col * 0.75, gr * 0.0); }
  vec4 mA = texture2D(tMA, vec2(lat, sl) * 0.27); vec4 mN = texture2D(tMN, vec2(lat, sl) * 0.27); float ruts = exp(-pow((a - 1.1) / 0.4, 2.0)); float mw = clamp(mudK * (1.2 + 0.9 * (mA.a - 0.5) - 0.2 * step(3.9, a)), 0.0, 1.0); col = mix(col, mA.rgb, mw); nrmXY = mix(nrmXY, mN.xy, mw); rgh = mix(rgh, mN.b * 1.1, mw); aoR = mix(aoR, mN.a, mw);
  float pud = smoothstep(0.48 - 0.22 * ruts, 0.42 - 0.22 * ruts, mA.a * 0.6 + macro * 0.4) * mudK; col = mix(col, col * vec3(0.32, 0.3, 0.27), pud); rgh = mix(rgh, 0.045, pud); nrmXY = mix(nrmXY, vec2(0.5), pud * 0.96);
  diffuseColor.rgb = col;`;
function roadMaterial(T, track) {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 1.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  m.onBeforeCompile = (s) => { patchShadow(s); Object.assign(s.uniforms, { tAA: { value: T.asphalt.a }, tAN: { value: T.asphalt.n }, tGA: { value: T.gravel.a }, tGN: { value: T.gravel.n }, tMA: { value: T.mud.a }, tMN: { value: T.mud.n }, tFA: { value: T.forest.a }, uDash: { value: track.theme === 'circuit' ? 0 : 1 }, uKerb: { value: track.theme === 'circuit' ? 1 : 0 }, uLeaf: { value: track.theme === 'forest' ? 1 : 0.12 }, uGutter: { value: track.theme === 'city' ? 1 : 0 } });
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute vec3 aR; attribute float aK; varying vec3 vR; varying float vKurve;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvR = aR; vKurve = aK;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\n${ROAD_PARS}`).replace('#include <map_fragment>', ROAD_ALB).replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(rgh, 0.04, 1.0);')
      .replace('#include <normal_fragment_maps>', '{ vec2 t = (nrmXY * 2.0 - 1.0) * 1.05; vec3 wn = inverseTransformDirection(normal, viewMatrix); wn = normalize(vec3(wn.x + t.x, wn.y, wn.z + t.y)); normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz); }').replace('#include <aomap_fragment>', '{ float gl = dot(reflectedLight.indirectDiffuse, vec3(0.3, 0.6, 0.1)); reflectedLight.indirectDiffuse = mix(reflectedLight.indirectDiffuse, vec3(gl) * vec3(1.03, 1.0, 0.92), 0.55) * mix(1.0, aoR, 0.7) * vec3(0.92, 0.96, 0.84); } reflectedLight.indirectSpecular *= vec3(0.4, 0.42, 0.36);'); };
  m.customProgramCacheKey = () => 'raceRoad'; return m;
}

// Baumdichte als Raster: 1 = freier Himmel, 0 = dichtes Blätterdach
function canopyGrid(track, x0, z0, nx, nz, cell) {
  const d = new Float32Array(nx * nz); for (const t of track.trees) { const cx = (t.x - x0) / cell; const cz = (t.z - z0) / cell; const i0 = Math.floor(cx); const j0 = Math.floor(cz); for (let j = j0 - 1; j <= j0 + 2; j++) for (let i = i0 - 1; i <= i0 + 2; i++) { if (i < 0 || j < 0 || i >= nx || j >= nz) continue; const k = Math.max(0, 1 - Math.hypot(i - cx, j - cz) / 2.2); d[j * nx + i] += k * k; } } return (x, z) => { const cx = clamp((x - x0) / cell, 0, nx - 1.01); const cz = clamp((z - z0) / cell, 0, nz - 1.01); const i = Math.floor(cx); const j = Math.floor(cz); const u = cx - i; const v = cz - j; const a = d[j * nx + i]; const b = d[j * nx + i + 1]; const c = d[(j + 1) * nx + i]; const e = d[(j + 1) * nx + i + 1]; return clamp(1 - (a + (b - a) * u + (c - a + (a - b + e - c) * u) * v) * 0.34, 0, 1); };
}
const mudAt = (track, s, lat) => { let k = 0; for (const [a, b] of track.mudZones) { const e = Math.min(sstep(a - 7, a + 2, s), 1 - sstep(b - 2, b + 7, s)); if (e > k) k = e; } return k * (1 - sstep(5.2, 10, Math.abs(lat))); };

function softDot() { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const gr = x.createRadialGradient(64, 64, 3, 64, 64, 62); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.32)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }

export function buildRaceWorld(track, { renderer, level = 'high', shadows = true, diff = 'easy', shadowSize = 3072 } = {}) {
  const ms = {}; let mt = performance.now(); const lap = (n) => { const t = performance.now(); ms[n] = Math.round(t - mt); mt = t; };
  const T = buildTextures(renderer); lap('tex'); const mood = moodOf(diff); const sky = bakeSky(renderer, mood, track.seed % 97); lap('sky'); const sunDir = sunVector(mood); const scene = new THREE.Scene(); scene.background = sky.cube; scene.environment = sky.env; scene.environmentIntensity = mood.envI;
  const sun = new THREE.DirectionalLight(mood.sun, mood.sunI); sun.castShadow = shadows; sun.shadow.mapSize.set(shadowSize, shadowSize); const SR = 105; const sc = sun.shadow.camera; sc.left = -SR; sc.right = SR; sc.top = SR; sc.bottom = -SR; sc.near = 10; sc.far = 520; sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.4; sun.shadow.radius = 2.4; scene.add(sun); scene.add(sun.target);
  // Himmelsfarbe als Umgebungslicht fürs Laub (Standardmaterialien bekommen es aus der Umgebungstextur)
  const cz = new THREE.Color(mood.zen); const ch = new THREE.Color(mood.hor); const lf = mood.leaf; AMB.up.value.copy(cz).lerp(ch, 0.6).multiplyScalar(2.3 * mood.envI); AMB.down.value.setRGB(lf[0], lf[1], lf[2]).multiplyScalar(1.5 * mood.envI);

  // ---------- Gelände ----------
  const OFF = track.vergeHalf - VERGE_HALF; const RK = track.roadHalf / 3.6; const CELL = 4; const MARGIN = track.macro ? 520 : 240; const x0 = Math.floor((track.bbox.x0 - MARGIN) / CELL) * CELL; const z0 = Math.floor((track.bbox.z0 - MARGIN) / CELL) * CELL; const nx = Math.ceil((track.bbox.x1 + MARGIN - x0) / CELL) + 1; const nz = Math.ceil((track.bbox.z1 + MARGIN - z0) / CELL) + 1;
  const canopy = canopyGrid(track, x0 - 8, z0 - 8, Math.ceil((nx * CELL + 16) / 8), Math.ceil((nz * CELL + 16) / 8), 8);
  const tp = new Float32Array(nx * nz * 3); const tg0 = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * CELL; const z = z0 + j * CELL; const k = (j * nx + i) * 3; const q = track.nearest(x, z); const h = track.heightAt(x, z, q); const d = Math.abs(q.lat); tp[k] = x; tp[k + 1] = h - 0.62 * (1 - sstep(15 + OFF, 23 + OFF, d)); tp[k + 2] = z; const op = d > 80 ? 0.12 + 0.2 * canopy(x, z) : canopy(x, z); tg0[k] = d - OFF; tg0[k + 1] = Math.max(op, 1 - sstep(5, 12, d)); tg0[k + 2] = mudAt(track, q.s, q.lat); }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6); { let w = 0; for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i; const b = a + 1; const c = a + nx; const d = c + 1; if ((i + j) % 2) { idx[w++] = a; idx[w++] = c; idx[w++] = b; idx[w++] = b; idx[w++] = c; idx[w++] = d; } else { idx[w++] = a; idx[w++] = c; idx[w++] = d; idx[w++] = a; idx[w++] = d; idx[w++] = b; } } }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3)); tg.setAttribute('aG', new THREE.BufferAttribute(tg0, 3)); tg.setIndex(new THREE.BufferAttribute(idx, 1)); tg.computeVertexNormals();
  lap('terrain'); const groundM = groundMaterial(T, track); const terrain = new THREE.Mesh(tg, groundM); terrain.receiveShadow = true; terrain.frustumCulled = false; scene.add(terrain);
  // feines Band neben der Straße: der Graben ist echte Form, nicht nur Farbe
  const LB = [4.3, 4.6, 5.0, 5.5, 6.1, 6.9, 7.8, 9.0, 10.5, 12.5, 15, 18, 22].map((x) => x + OFF); const rows = track.rows; const sideN = LB.length; const bp = new Float32Array(rows * sideN * 2 * 3); const bg = new Float32Array(rows * sideN * 2 * 3);
  for (let r = 0; r < rows; r++) { const ps = track.pts.psi[r]; const cs = Math.cos(ps); const sn = Math.sin(ps); for (let side = 0; side < 2; side++) { const sg = side ? -1 : 1; for (let c = 0; c < sideN; c++) { const lat = sg * LB[c]; const x = track.pts.x[r] + cs * lat; const z = track.pts.z[r] - sn * lat; const k = (r * sideN * 2 + side * sideN + c) * 3; const q = track.nearest(x, z); const d = Math.abs(q.lat); let y = track.heightAt(x, z, q); if (d < 4.2 + OFF) y -= 0.35; if (c === sideN - 1) y -= 0.7; else if (c === sideN - 2) y -= 0.08; bp[k] = x; bp[k + 1] = y; bp[k + 2] = z; bg[k] = d - OFF; bg[k + 1] = Math.max(canopy(x, z), 1 - sstep(5, 12, d)); bg[k + 2] = mudAt(track, q.s, q.lat); } } }
  const bi = []; for (let r = 0; r < rows - 1; r++) { for (let side = 0; side < 2; side++) for (let c = 0; c < sideN - 1; c++) { const a = r * sideN * 2 + side * sideN + c; const b = a + 1; const cc = a + sideN * 2; const d = cc + 1; if (side) bi.push(a, b, cc, b, d, cc); else bi.push(a, cc, b, b, cc, d); } }
  const bgeo = new THREE.BufferGeometry(); bgeo.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bgeo.setAttribute('aG', new THREE.BufferAttribute(bg, 3)); bgeo.setIndex(bi); bgeo.computeVertexNormals(); const band = new THREE.Mesh(bgeo, groundM); band.receiveShadow = true; band.frustumCulled = false; scene.add(band);

  // ---------- Straße ----------
  const lats = [-4.6, -4.2, -3.8, -3.3, -2.4, -1.2, 0, 1.2, 2.4, 3.3, 3.8, 4.2, 4.6]; const rp = new Float32Array(rows * lats.length * 3); const ra = new Float32Array(rows * lats.length * 3); const rk = new Float32Array(rows * lats.length);
  for (let r = 0; r < rows; r++) { const s = r * 2; let kv = 0; for (let j = Math.max(0, r - 12); j <= Math.min(rows - 1, r + 6); j++) kv = Math.max(kv, Math.abs(track.pts.kappa[j])); for (let c = 0; c < lats.length; c++) { const lat = lats[c]; const k = (r * lats.length + c) * 3; const lw = lat * RK; const x = track.pts.x[r] + Math.cos(track.pts.psi[r]) * lw; const z = track.pts.z[r] - Math.sin(track.pts.psi[r]) * lw; rp[k] = x; rp[k + 1] = track.heightAt(x, z) + 0.055 - (Math.abs(lat) > 4.3 ? 0.07 : 0); rp[k + 2] = z; ra[k] = lat; ra[k + 1] = s; ra[k + 2] = mudAt(track, s, lat); rk[r * lats.length + c] = kv; } }
  const ri = []; for (let r = 0; r < rows - 1; r++) for (let c = 0; c < lats.length - 1; c++) { const a = r * lats.length + c; const b = a + 1; const cc = a + lats.length; const d = cc + 1; ri.push(a, cc, b, b, cc, d); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setAttribute('aR', new THREE.BufferAttribute(ra, 3)); rg.setAttribute('aK', new THREE.BufferAttribute(rk, 1)); rg.setIndex(ri); rg.computeVertexNormals(); const road = new THREE.Mesh(rg, roadMaterial(T, track)); road.receiveShadow = true; road.frustumCulled = false; scene.add(road);

  lap('road');
  // ---------- Wald und Bewuchs ----------
  const flora = buildFlora(renderer, scene, track, T, mood, sunDir, level); lap('flora'); const under = buildUnder(scene, track, T, level); lap('under');

  // ---------- Warnpfosten in Kurven ----------
  if (track.theme === 'forest' || track.theme === 'coast' || track.theme === 'mountain') { const list = []; for (let s = 10; s < track.length - 10; s += 8) { const i = Math.round(s / 2); const k = track.pts.kappa[i]; if (Math.abs(k) < 1 / 140) continue; const side = k > 0 ? -1 : 1; const lat = side * (track.vergeHalf + 0.42); list.push({ x: track.pts.x[i] + Math.cos(track.pts.psi[i]) * lat, z: track.pts.z[i] - Math.sin(track.pts.psi[i]) * lat, a: track.pts.psi[i] }); }
    const pole = new THREE.CylinderGeometry(0.055, 0.065, 1.05, 8); pole.translate(0, 0.52, 0); const band2 = new THREE.CylinderGeometry(0.058, 0.06, 0.26, 8); band2.translate(0, 0.8, 0); const pm = new THREE.MeshStandardMaterial({ color: 0xece9e0, roughness: 0.42 }); const bm = new THREE.MeshStandardMaterial({ color: 0xd8331f, roughness: 0.36, emissive: 0x300804 });
    const m4 = new THREE.Matrix4(); const v = new THREE.Vector3(); const q = new THREE.Quaternion(); const s3 = new THREE.Vector3(1, 1, 1); for (const [g, m] of [[pole, pm], [band2, bm]]) { const im = new THREE.InstancedMesh(g, m, list.length); list.forEach((o, n) => { v.set(o.x, track.heightAt(o.x, o.z), o.z); m4.compose(v, q, s3); im.setMatrixAt(n, m4); }); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); } }

  // ---------- Start- und Zieltor ----------
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xbfc4c8, roughness: 0.34, metalness: 0.75 }); const redP = new THREE.MeshPhysicalMaterial({ color: 0xc92a18, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const gate = (sPos, label, checker) => { const p = track.poseAt(sPos); const g = new THREE.Group(); g.position.set(p.x, p.y, p.z); g.rotation.y = p.psi; scene.add(g); const stripe = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const x = cv.getContext('2d'); const n = checker ? 24 : 12; const rowsN = checker ? 4 : 2; for (let i = 0; i < n; i++) for (let j = 0; j < rowsN; j++) { x.fillStyle = (i + j) % 2 ? '#101012' : '#efefe8'; x.fillRect(i * 512 / n, j * 96 / rowsN, 512 / n + 1, 96 / rowsN + 1); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
    const RH = track.roadHalf; const line = new THREE.Mesh(new THREE.PlaneGeometry(RH * 2, 1.4), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); line.rotation.x = -Math.PI / 2; line.position.set(0, 0.12, 0); line.receiveShadow = true; g.add(line);
    for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 6.2, 16), paint); post.position.set(sx * (RH + 0.9), 3.1, 0); post.castShadow = true; post.receiveShadow = true; g.add(post); const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.34, 16), redP); foot.position.set(sx * (RH + 0.9), 0.17, 0); foot.castShadow = true; g.add(foot); }
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 192; const x = cv.getContext('2d'); const gr = x.createLinearGradient(0, 0, 0, 192); gr.addColorStop(0, checker ? '#26262a' : '#e23a22'); gr.addColorStop(1, checker ? '#0e0e10' : '#a81f12'); x.fillStyle = gr; x.fillRect(0, 0, 1024, 192); x.fillStyle = '#e8821e'; x.fillRect(0, 0, 1024, 12); x.fillRect(0, 180, 1024, 12); x.fillStyle = '#fff3d1'; x.font = 'bold 118px Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label, 512, 102); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const beam = new THREE.Mesh(new THREE.BoxGeometry((RH + 0.9) * 2 + 0.3, 1.3, 0.26), [paint, paint, paint, paint, new THREE.MeshStandardMaterial({ map: t, roughness: 0.46 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.46 })]); beam.position.set(0, 5.7, 0); beam.castShadow = true; g.add(beam); return g; };
  if (track.laps) gate(track.length - 8, 'START · ZIEL', true); else { gate(10, 'START', false); gate(track.length - 12, 'ZIEL', true); }

  // ---------- Staub / Schotter ----------
  const N = 220; const dp = new Float32Array(N * 3); const life = new Float32Array(N); const vel = new Float32Array(N * 3); const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); const dmat = new THREE.PointsMaterial({ map: softDot(), size: 2.1, transparent: true, opacity: 0.3, depthWrite: false, color: 0xcdbb98, sizeAttenuation: true }); const dust = new THREE.Points(dg, dmat); dust.frustumCulled = false; scene.add(dust); for (let i = 0; i < N; i++) dp[i * 3 + 1] = -999; let dHead = 0;
  function emitDust(x, y, z, vx, vz, amount, color) { dmat.color.setHex(color || 0xcdbb98); for (let n = 0; n < amount; n++) { const i = dHead; dHead = (dHead + 1) % N; life[i] = 0.7 + Math.random() * 0.9; dp[i * 3] = x + (Math.random() - 0.5) * 0.7; dp[i * 3 + 1] = y + 0.1 + Math.random() * 0.2; dp[i * 3 + 2] = z + (Math.random() - 0.5) * 0.7; vel[i * 3] = vx * 0.15 + (Math.random() - 0.5) * 1.4; vel[i * 3 + 1] = 0.5 + Math.random() * 1.2; vel[i * 3 + 2] = vz * 0.15 + (Math.random() - 0.5) * 1.4; } }
  function updateDust(dt) { if (W.seaT) W.seaT.value += dt; for (let i = 0; i < N; i++) { if (life[i] <= 0) { dp[i * 3 + 1] = -999; continue; } life[i] -= dt; dp[i * 3] += vel[i * 3] * dt; dp[i * 3 + 1] += vel[i * 3 + 1] * dt; dp[i * 3 + 2] += vel[i * 3 + 2] * dt; vel[i * 3 + 1] *= 0.97; } dg.attributes.position.needsUpdate = true; RT.time.value += dt; }

  // Sonne, Wald und Bewuchs folgen der Kamera. Die Schattenkarte liegt nach vorn versetzt und bleibt am Texelraster verankert: Sie muss nur neu, wenn der Bereich weiterrückt
  const W = { scene, sun, follow, emitDust, updateDust, terrain, road, chunkList: [], stats: { trees: track.trees.length, ms }, race: true, mood, sky, sunDir, flora, under, shadowDirty: true, dispose };
  dressTheme(scene, track, W);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), sunDir).normalize(); const up = new THREE.Vector3().crossVectors(sunDir, right).normalize(); const center = new THREE.Vector3(); const camP = new THREE.Vector3(); const fwd = new THREE.Vector3(); let lastC = new THREE.Vector3(1e9, 0, 0); let lastF = 0; let frames = 0;
  function follow(px, py, pz, cam) {
    camP.set(px, py + 1.2, pz); fwd.set(0, 0, 1); if (cam) { cam.getWorldPosition(camP); fwd.set(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion())); fwd.y = 0; fwd.normalize(); }
    flora.update(camP, fwd.x, fwd.z, false); under.update(camP); RT.car.value.set(px, py, pz);
    frames++; center.set(camP.x + fwd.x * 62, py, camP.z + fwd.z * 62); const moved = center.distanceToSquared(lastC);
    if (moved > 9 * 9 || frames > 24 || !W.shadowReady) { frames = 0; const texel = (SR * 2) / sun.shadow.mapSize.x; const a = Math.round(center.dot(right) / texel) * texel; const b = Math.round(center.dot(up) / texel) * texel; const c = center.dot(sunDir); center.copy(right).multiplyScalar(a).addScaledVector(up, b).addScaledVector(sunDir, c); sun.target.position.copy(center); sun.position.copy(center).addScaledVector(sunDir, 300); sun.target.updateMatrixWorld(); sun.updateMatrixWorld(); lastC.copy(center); W.shadowDirty = true; W.shadowReady = true; } else W.shadowDirty = false;
  }
  function dispose() { sky.dispose(); if (flora.impRT) flora.impRT.dispose(); }
  return W;
}
export { THREE };
