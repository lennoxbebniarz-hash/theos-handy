// Theos Seitenscheidel - Bildkette des Rennmodus: HDR-Bild mit Kantenglättung, Umgebungsverdeckung (AO), Dunst nach Tiefe, echte Lichtstrahlen aus der Schattenkarte, Bewegungsunschärfe,
// Bloom, Augenanpassung, Filmkurve und Farbstimmung. Innenraum-Pixel schreiben Alpha 0 (raceinterior.js): Sie bleiben von Dunst und Bewegungsunschärfe verschont.
import * as THREE from './vendor/three.module.min.js';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const COMMON = `#include <packing>
varying vec2 vUv; uniform sampler2D tDepth; uniform mat4 uInvProj, uInvView;
vec3 viewAt(vec2 uv, float d) { vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0); return v.xyz / v.w; }
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;

// Umgebungsverdeckung: Stichproben auf einer Spirale, Normale aus der Tiefe (die jeweils kleinere Differenz schont die Kanten)
const AO_FS = `${COMMON}
uniform vec2 uPx; uniform float uR, uScale, uI;
vec3 vp(vec2 uv) { return viewAt(uv, texture2D(tDepth, uv).x); }
void main() {
  float d = texture2D(tDepth, vUv).x; if (d >= 0.99999) { gl_FragColor = vec4(1.0); return; }
  vec3 P = viewAt(vUv, d); vec3 l = P - vp(vUv - vec2(uPx.x, 0.0)), r = vp(vUv + vec2(uPx.x, 0.0)) - P, b = P - vp(vUv - vec2(0.0, uPx.y)), t = vp(vUv + vec2(0.0, uPx.y)) - P;
  vec3 N = normalize(cross(abs(l.z) < abs(r.z) ? l : r, abs(b.z) < abs(t.z) ? b : t));
  float R = uR * clamp(-P.z * 0.16, 0.14, 1.0); float pr = min(R * uScale / max(-P.z, 0.05), 90.0); if (pr < 1.6) { gl_FragColor = vec4(1.0); return; }
  float a0 = ign(gl_FragCoord.xy) * 6.2832; float sum = 0.0;
  for (int i = 0; i < SAMPLES; i++) { float f = (float(i) + 0.5) / float(SAMPLES); float a = a0 + f * 6.2832 * 3.0; vec2 uv = vUv + vec2(cos(a), sin(a)) * f * pr * uPx; vec3 v = vp(uv) - P; float vv = dot(v, v); float rc = smoothstep(1.0, 0.0, vv / (R * R * 2.2)); sum += rc * max(0.0, dot(v, N) - 0.006 * -P.z) / (vv + 0.0004); }
  gl_FragColor = vec4(vec3(pow(max(0.0, 1.0 - 2.0 * uI * R * sum / float(SAMPLES) ), 1.4)), 1.0);
}`;
const BLUR_FS = `${COMMON}
uniform sampler2D tSrc; uniform vec2 uDir; uniform vec2 uNF; uniform float uSoft;
float lz(float d) { return uNF.x * uNF.y / ((uNF.y - uNF.x) * d - uNF.y); }
void main() { float z0 = lz(texture2D(tDepth, vUv).x); vec4 s = texture2D(tSrc, vUv) * 0.28; float w = 0.28; for (int i = -3; i <= 3; i++) { if (i == 0) continue; float k = 1.0 - abs(float(i)) * 0.22; vec2 uv = vUv + uDir * float(i); float dz = abs(lz(texture2D(tDepth, uv).x) - z0) / max(-z0, 0.2); float g = k * mix(exp(-dz * dz * 900.0), 1.0, uSoft); s += texture2D(tSrc, uv) * g; w += g; } gl_FragColor = s / w; }`;

// Lichtstrahlen: Der Blickstrahl läuft durch die Luft und fragt bei jedem Schritt die Schattenkarte, ob dort Sonne hinkommt
const VOL_FS = `${COMMON}
uniform sampler2D tShadow; uniform mat4 uShadow; uniform vec3 uCam, uSun, uSunCol; uniform float uDens, uMax, uG, uFogH, uGround, uFrame, uTime;
float noise3(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); vec3 h = vec3(1.0, 57.0, 113.0); vec4 a = fract(sin(vec4(dot(i, h), dot(i + vec3(1, 0, 0), h), dot(i + vec3(0, 1, 0), h), dot(i + vec3(1, 1, 0), h))) * 43758.5453), b = fract(sin(vec4(dot(i + vec3(0, 0, 1), h), dot(i + vec3(1, 0, 1), h), dot(i + vec3(0, 1, 1), h), dot(i + vec3(1, 1, 1), h))) * 43758.5453); vec4 m = mix(a, b, f.z); vec2 n = mix(m.xy, m.zw, f.y); return mix(n.x, n.y, f.x); }
void main() {
  float d = texture2D(tDepth, vUv).x; vec3 V = viewAt(vUv, min(d, 0.999999)); vec3 P = (uInvView * vec4(V, 1.0)).xyz; vec3 rd = P - uCam; float dist = length(rd); rd /= dist; float L = min(dist, uMax); if (d >= 0.99999) L = uMax;
  float st = L / float(STEPS); vec3 p = uCam + rd * st * ign(gl_FragCoord.xy + uFrame * 5.588); float sum = 0.0;
  for (int i = 0; i < STEPS; i++) { vec4 sc = uShadow * vec4(p, 1.0); float s = 1.0; if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) s = step(sc.z - 0.002, unpackRGBAToDepth(texture2D(tShadow, sc.xy))); float h = exp(-max(p.y - uGround, 0.0) / uFogH); float n = 0.65 + 0.7 * noise3(p * 0.07 + vec3(uTime * 0.08, 0.0, uTime * 0.05)); float fade = exp(-float(i) * st / 34.0); sum += s * h * n * fade; p += rd * st; }
  float c = dot(rd, uSun); float g = uG; float phase = (1.0 - g * g) / (12.566 * pow(1.0 + g * g - 2.0 * g * c, 1.5)) + 0.022;
  gl_FragColor = vec4(uSunCol * sum * st * uDens * phase, 1.0);
}`;

// Zusammensetzen im linearen Lichtraum: AO, Dunst (Farbe kommt aus dem Himmel in Blickrichtung), Lichtstrahlen
const COMP_FS = `${COMMON}
uniform sampler2D tColor, tAO, tVol; uniform samplerCube tSky; uniform vec3 uCam; uniform float uFogD, uFogH, uGround, uAOon, uVolOn; uniform vec2 uNF, uVolPx;
float lz(float d) { return uNF.x * uNF.y / ((uNF.y - uNF.x) * d - uNF.y); }
vec3 volUp(float d0) { vec2 g = vUv / uVolPx - 0.5; vec2 i = floor(g), f = g - i; float z0 = -lz(d0); vec3 s = vec3(0.0); float w = 0.0; for (int y = 0; y < 2; y++) for (int x = 0; x < 2; x++) { vec2 o = vec2(float(x), float(y)); vec2 uv = (i + o + 0.5) * uVolPx; float b = (o.x > 0.5 ? f.x : 1.0 - f.x) * (o.y > 0.5 ? f.y : 1.0 - f.y) + 1e-3; float dz = abs(-lz(texture2D(tDepth, uv).x) - z0) / max(z0, 0.3); float k = b / (1.0 + dz * dz * 400.0); s += texture2D(tVol, uv).rgb * k; w += k; } return s / w; }
void main() {
  vec4 c = texture2D(tColor, vUv); float d = texture2D(tDepth, vUv).x; vec3 col = c.rgb; float inner = 1.0 - step(0.5, c.a);
  if (uAOon > 0.5) { float ao = texture2D(tAO, vUv).r; float lum = dot(col, vec3(0.3, 0.6, 0.1)); col *= mix(ao, 1.0, smoothstep(0.8, 5.0, lum) * 0.7); }
  if (d < 0.99999 && inner < 0.5) { vec3 P = (uInvView * vec4(viewAt(vUv, d), 1.0)).xyz; vec3 r = P - uCam; float dist = length(r); float h = 0.5 * (max(P.y - uGround, 0.0) + max(uCam.y - uGround, 0.0)); float od = uFogD * dist * exp(-h / uFogH); vec3 dir = r / dist; dir.y = max(dir.y, 0.03); vec3 fc = textureLod(tSky, normalize(dir), 5.0).rgb; col = mix(fc, col, exp(-od)); }
  if (uVolOn > 0.5) col += min(texture2D(tVol, vUv).rgb, vec3(0.8)) * mix(1.0, 0.35, inner);
  gl_FragColor = vec4(col, c.a);
}`;

// Bewegungsunschärfe: nur die Kamerafahrt, aus Tiefe und der Kamera des letzten Bildes; Innenraum bleibt scharf
const MB_FS = `${COMMON}
uniform sampler2D tSrc; uniform mat4 uPrevVP; uniform float uAmt; uniform vec2 uPx;
void main() {
  vec4 c0 = texture2D(tSrc, vUv); if (c0.a < 0.5) { gl_FragColor = c0; return; }
  float d = texture2D(tDepth, vUv).x; vec3 V = viewAt(vUv, min(d, 0.9999)); vec4 q = uPrevVP * (uInvView * vec4(V, 1.0)); vec2 prev = q.xy / q.w * 0.5 + 0.5; vec2 vel = (vUv - prev) * uAmt; float len = length(vel / uPx); if (len < 0.8) { gl_FragColor = c0; return; } if (len > 46.0) vel *= 46.0 / len;
  float j = ign(gl_FragCoord.xy) - 0.5; vec3 s = c0.rgb; float w = 1.0; for (int i = 0; i < 8; i++) { float t = (float(i) + j + 0.5) / 8.0 - 0.5; vec4 c = texture2D(tSrc, vUv + vel * t); float k = step(0.5, c.a); s += c.rgb * k; w += k; } gl_FragColor = vec4(s / w, c0.a);
}`;

const DOWN_FS = `varying vec2 vUv; uniform sampler2D tSrc; uniform vec2 uPx; uniform float uFirst, uTh;
vec3 s(vec2 o) { return texture2D(tSrc, vUv + o * uPx).rgb; }
void main() { vec3 a = s(vec2(-2, 2)), b = s(vec2(0, 2)), c = s(vec2(2, 2)), d = s(vec2(-2, 0)), e = s(vec2(0)), f = s(vec2(2, 0)), g = s(vec2(-2, -2)), h = s(vec2(0, -2)), i = s(vec2(2, -2)), j = s(vec2(-1, 1)), k = s(vec2(1, 1)), l = s(vec2(-1, -1)), m = s(vec2(1, -1));
  vec3 col = e * 0.125 + (a + c + g + i) * 0.03125 + (b + d + f + h) * 0.0625 + (j + k + l + m) * 0.125;
  if (uFirst > 0.5) { col = min(col, vec3(40.0)); float br = max(col.r, max(col.g, col.b)); float q = clamp(br - uTh * 0.55, 0.0, uTh * 0.9); q = q * q / (uTh * 3.6 + 1e-4); col *= max(q, br - uTh) / max(br, 1e-4); } gl_FragColor = vec4(col, 1.0); }`;
const UP_FS = `varying vec2 vUv; uniform sampler2D tSrc, tBase; uniform vec2 uPx; uniform float uK;
vec3 s(vec2 o) { return texture2D(tSrc, vUv + o * uPx).rgb; }
void main() { vec3 c = (s(vec2(-1, 1)) + s(vec2(1, 1)) + s(vec2(-1, -1)) + s(vec2(1, -1)) + 2.0 * (s(vec2(0, 1)) + s(vec2(0, -1)) + s(vec2(-1, 0)) + s(vec2(1, 0))) + 4.0 * s(vec2(0))) / 16.0; gl_FragColor = vec4(texture2D(tBase, vUv).rgb + c * uK, 1.0); }`;
// Augenanpassung: mittlere Helligkeit (Bildmitte zählt mehr), nähert sich langsam an; merkt sich den Wert in einem 1x1-Ziel
const ADAPT_FS = `varying vec2 vUv; uniform sampler2D tSrc, tPrev; uniform float uK;
void main() { float s = 0.0, w = 0.0; for (int y = 0; y < 5; y++) for (int x = 0; x < 7; x++) { vec2 uv = vec2((float(x) + 0.5) / 7.0, (float(y) + 0.5) / 5.0); float k = 1.0 - 0.75 * length(uv - 0.5); vec3 c = texture2D(tSrc, uv).rgb; s += log(max(dot(c, vec3(0.3, 0.6, 0.1)), 0.02)) * k; w += k; } float cur = exp(s / w); float p = texture2D(tPrev, vec2(0.5)).r; gl_FragColor = vec4(vec3(p <= 0.0 ? cur : mix(p, cur, uK)), 1.0); }`;
const FINAL_FS = `varying vec2 vUv; uniform sampler2D tSrc, tBloom, tAdapt, tDirt; uniform float uBloom, uExposure, uSat, uTime, uCA, uVig, uDirtK, uNitro, uSharp; uniform vec3 uTint; uniform vec2 uPx; uniform vec2 uAdapt;
vec3 aces(vec3 x) { x = mat3(0.59719, 0.076, 0.0284, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * x; vec3 a = x * (x + 0.0245786) - 0.000090537; vec3 b = x * (0.983729 * x + 0.432951) + 0.238081; x = a / b; return clamp(mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * x, 0.0, 1.0); }
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(0.0031308, c)); }
float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 c = vUv - 0.5; float r2 = dot(c, c); vec2 ca = c * r2 * uCA; vec3 col = vec3(texture2D(tSrc, vUv + ca).r, texture2D(tSrc, vUv).g, texture2D(tSrc, vUv - ca).b);
  if (uSharp > 0.0) { vec3 n = texture2D(tSrc, vUv + vec2(uPx.x, 0)).rgb + texture2D(tSrc, vUv - vec2(uPx.x, 0)).rgb + texture2D(tSrc, vUv + vec2(0, uPx.y)).rgb + texture2D(tSrc, vUv - vec2(0, uPx.y)).rgb; col = max(col + (col - n * 0.25) * uSharp, vec3(0.0)); }
  vec3 bl = texture2D(tBloom, vUv).rgb; float dirt = texture2D(tDirt, vUv * vec2(1.7, 1.0)).r; col += bl * (uBloom + dirt * uDirtK);
  float ad = texture2D(tAdapt, vec2(0.5)).r; float ex = uExposure * clamp(0.4 / max(ad, 0.001), uAdapt.x, uAdapt.y); col *= ex * (1.0 + uNitro * 0.12);
  col *= uTint; col = aces(col); float l = dot(col, vec3(0.2126, 0.7152, 0.0722)); col = mix(vec3(l), col, uSat);
  col *= 1.0 - uVig * smoothstep(0.1, 0.62, r2 * 1.9); col = srgb(clamp(col, 0.0, 1.0));
  float g = h(vUv + fract(uTime)) - 0.5; col += g * 0.012; gl_FragColor = vec4(col, 1.0);
}`;

// Staubfilm auf der Scheibe: leuchtet nur, wo Sonne oder Bloom draufliegt
function dirtTexture() {
  const S = 512; const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'); c.fillStyle = '#1c1c1c'; c.fillRect(0, 0, S, S); let s = 4242; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 900; i++) { const x = r() * S; const y = r() * S; const R = 2 + r() * r() * 34; const a = 0.03 + r() * 0.14; const g = c.createRadialGradient(x, y, 0, x, y, R); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill(); }
  for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; c.lineWidth = 1 + r() * 4; c.beginPath(); const x = r() * S; const y = r() * S; c.moveTo(x, y); c.quadraticCurveTo(x + r() * 90 - 45, y + r() * 90 - 45, x + r() * 200 - 100, y + r() * 200 - 100); c.stroke(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export const POST_LEVELS = {
  low: { msaa: 0, ao: false, aoSamples: 4, volSteps: 6, vol: false, mb: false, bloomN: 4, scale: 0.72, shadow: 1024, sharp: 0.3 },
  high: { msaa: 4, ao: true, aoSamples: 8, volSteps: 12, vol: true, mb: true, bloomN: 5, scale: 0.85, shadow: 2048, sharp: 0.2 },
  ultra: { msaa: 4, ao: true, aoSamples: 11, volSteps: 18, vol: true, mb: true, bloomN: 6, scale: 1.0, shadow: 4096, sharp: 0.14 },
};

export function createRacePost(renderer) {
  const qs = new THREE.Scene(); const qm = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); qm.frustumCulled = false; qs.add(qm); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const P = { w: 0, h: 0, level: POST_LEVELS.high, rts: null, frame: 0, prevVP: new THREE.Matrix4(), hasPrev: false, resScale: 1, lastT: 0 };
  const dirt = dirtTexture();
  const mat = (fs, uniforms, defines = {}) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, defines, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.NoBlending });
  const draw = (m, target) => { qm.material = m; renderer.setRenderTarget(target); renderer.render(qs, qc); };
  const U = (v) => ({ value: v });
  const cam = { uInvProj: U(new THREE.Matrix4()), uInvView: U(new THREE.Matrix4()), tDepth: U(null) };
  let M = null;
  function buildMaterials() {
    const L = P.level; const defs = { SAMPLES: L.aoSamples }; const defsV = { STEPS: L.volSteps };
    if (M) for (const m of Object.values(M)) m.dispose();
    M = {
      ao: mat(AO_FS, { ...cam, uPx: U(new THREE.Vector2()), uR: U(0.9), uScale: U(1), uI: U(0.11) }, defs),
      blur: mat(BLUR_FS, { ...cam, tSrc: U(null), uDir: U(new THREE.Vector2()), uNF: U(new THREE.Vector2(0.05, 2000)), uSoft: U(0) }),
      vol: mat(VOL_FS, { ...cam, tShadow: U(null), uShadow: U(new THREE.Matrix4()), uCam: U(new THREE.Vector3()), uSun: U(new THREE.Vector3()), uSunCol: U(new THREE.Color()), uDens: U(1), uMax: U(80), uG: U(0.62), uFogH: U(30), uGround: U(0), uFrame: U(0), uTime: U(0) }, defsV),
      comp: mat(COMP_FS, { ...cam, tColor: U(null), tAO: U(null), tVol: U(null), tSky: U(null), uCam: U(new THREE.Vector3()), uFogD: U(0.002), uFogH: U(40), uGround: U(0), uAOon: U(1), uVolOn: U(1), uNF: U(new THREE.Vector2()), uVolPx: U(new THREE.Vector2()) }),
      mb: mat(MB_FS, { ...cam, tSrc: U(null), uPrevVP: U(new THREE.Matrix4()), uAmt: U(0.5), uPx: U(new THREE.Vector2()) }),
      down: mat(DOWN_FS, { tSrc: U(null), uPx: U(new THREE.Vector2()), uFirst: U(0), uTh: U(1.4) }),
      up: mat(UP_FS, { tSrc: U(null), tBase: U(null), uPx: U(new THREE.Vector2()), uK: U(0.7) }),
      adapt: mat(ADAPT_FS, { tSrc: U(null), tPrev: U(null), uK: U(0.03) }),
      final: mat(FINAL_FS, { tSrc: U(null), tBloom: U(null), tAdapt: U(null), tDirt: U(dirt), uBloom: U(0.05), uExposure: U(1), uSat: U(1.08), uTime: U(0), uCA: U(0.004), uVig: U(0.34), uDirtK: U(0.14), uNitro: U(0), uTint: U(new THREE.Vector3(1, 1, 1)), uSharp: U(0), uPx: U(new THREE.Vector2()), uAdapt: U(new THREE.Vector2(0.62, 2.2)) }),
    };
  }
  function disposeTargets() { if (!P.rts) return; const r = P.rts; for (const k of ['main', 'hdr', 'hdr2', 'aoA', 'aoB', 'volA', 'volB', 'ad0', 'ad1']) if (r[k]) { if (r[k].depthTexture) r[k].depthTexture.dispose(); r[k].dispose(); } for (const b of r.down) b.dispose(); for (const b of r.up) b.dispose(); P.rts = null; }
  function setSize(w, h) {
    if (w === P.w && h === P.h && P.rts) return; P.w = w; P.h = h; disposeTargets(); const L = P.level; const hf = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
    const depth = new THREE.DepthTexture(w, h, THREE.UnsignedIntType); depth.minFilter = depth.magFilter = THREE.NearestFilter;
    const r = { main: new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: L.msaa, depthTexture: depth, depthBuffer: true, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }), hdr: new THREE.WebGLRenderTarget(w, h, hf), hdr2: new THREE.WebGLRenderTarget(w, h, hf), down: [], up: [] };
    const small = { type: THREE.UnsignedByteType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false }; const hw = Math.ceil(w / 2); const hh = Math.ceil(h / 2);
    r.aoA = new THREE.WebGLRenderTarget(hw, hh, small); r.aoB = new THREE.WebGLRenderTarget(hw, hh, small); const qw = Math.ceil(w / 3); const qh = Math.ceil(h / 3); r.volA = new THREE.WebGLRenderTarget(qw, qh, hf); r.volB = new THREE.WebGLRenderTarget(qw, qh, hf);
    let bw = w; let bh = h; for (let i = 0; i < L.bloomN; i++) { bw = Math.max(2, bw >> 1); bh = Math.max(2, bh >> 1); r.down.push(new THREE.WebGLRenderTarget(bw, bh, hf)); if (i < L.bloomN - 1) r.up.push(new THREE.WebGLRenderTarget(bw, bh, hf)); }
    r.ad0 = new THREE.WebGLRenderTarget(1, 1, { ...hf, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); r.ad1 = new THREE.WebGLRenderTarget(1, 1, { ...hf, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); P.rts = r; P.hasPrev = false;
  }
  function setLevel(name) { const L = POST_LEVELS[name] || POST_LEVELS.high; if (L === P.level && M) return; P.level = L; disposeTargets(); P.w = 0; buildMaterials(); }
  const invVP = new THREE.Matrix4(); const vp = new THREE.Matrix4(); const toSun = new THREE.Vector3(); const sz = new THREE.Vector2();
  // o: { mood, sky, sun, dt, time, speed, nitro, ground, shadows }
  function render(scene, camera, o) {
    if (!M) buildMaterials();
    renderer.getDrawingBufferSize(sz); const w = Math.max(2, Math.round(sz.x * P.level.scale * P.resScale)); const h = Math.max(2, Math.round(sz.y * P.level.scale * P.resScale)); setSize(w, h); const r = P.rts; const m = o.mood; P.frame++;
    renderer.setRenderTarget(r.main); renderer.render(scene, camera);
    camera.updateMatrixWorld(); cam.uInvProj.value.copy(camera.projectionMatrixInverse); cam.uInvView.value.copy(camera.matrixWorld); cam.tDepth.value = r.main.depthTexture;
    const camPos = o.camPos; const sh = P.level.vol && o.sun && o.sun.castShadow && o.sun.shadow.map ? o.sun.shadow : null; const prevAuto = renderer.shadowMap.autoUpdate; renderer.shadowMap.needsUpdate = false;
    const aoOn = P.level.ao && P.resScale > 0.65; if (aoOn) { const a = M.ao.uniforms; a.uPx.value.set(1 / r.aoA.width, 1 / r.aoA.height); a.uScale.value = r.aoA.height * 0.5 / Math.tan(camera.fov * Math.PI / 360); draw(M.ao, r.aoA); const b = M.blur.uniforms; b.uSoft.value = 0; b.uNF.value.set(camera.near, camera.far); b.tSrc.value = r.aoA.texture; b.uDir.value.set(1.2 / r.aoA.width, 0); draw(M.blur, r.aoB); b.tSrc.value = r.aoB.texture; b.uDir.value.set(0, 1.2 / r.aoA.height); draw(M.blur, r.aoA); }
    if (sh) { const v = M.vol.uniforms; v.tShadow.value = sh.map.texture; v.uShadow.value.copy(sh.matrix); v.uCam.value.copy(camPos); v.uSun.value.copy(toSun.copy(o.sunDir)); v.uSunCol.value.copy(o.sun.color).multiplyScalar(o.sun.intensity); v.uDens.value = 0.3 * m.vol; v.uFogH.value = m.fogH * 0.55; v.uGround.value = o.ground; v.uFrame.value = P.frame % 64; v.uTime.value = o.time; draw(M.vol, r.volA); const b = M.blur.uniforms; b.uSoft.value = 1; b.tSrc.value = r.volA.texture; b.uDir.value.set(1.3 / r.volA.width, 0); draw(M.blur, r.volB); b.tSrc.value = r.volB.texture; b.uDir.value.set(0, 1.3 / r.volA.height); draw(M.blur, r.volA); }
    const c = M.comp.uniforms; c.tColor.value = r.main.texture; c.tAO.value = r.aoA.texture; c.tVol.value = r.volA.texture; c.tSky.value = o.sky.cube; c.uCam.value.copy(camPos); c.uFogD.value = m.fogD * (o.fogMul || 1); c.uFogH.value = m.fogH; c.uGround.value = o.ground; c.uAOon.value = aoOn ? 1 : 0; c.uVolOn.value = sh ? 1 : 0; c.uNF.value.set(camera.near, camera.far); c.uVolPx.value.set(1 / r.volA.width, 1 / r.volA.height); draw(M.comp, r.hdr);
    let src = r.hdr; vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (P.level.mb && P.hasPrev && o.speed > 2) { const b = M.mb.uniforms; b.tSrc.value = r.hdr.texture; b.uPrevVP.value.copy(P.prevVP); b.uAmt.value = Math.min(0.75, 0.42 * (o.dt > 0 ? (1 / 60) / o.dt : 1)) ; b.uPx.value.set(1 / w, 1 / h); draw(M.mb, r.hdr2); src = r.hdr2; }
    P.prevVP.copy(vp); P.hasPrev = true;
    const d = M.down.uniforms; let last = src; r.down.forEach((t, i) => { d.tSrc.value = last.texture; d.uPx.value.set(1 / last.width, 1 / last.height); d.uFirst.value = i === 0 ? 1 : 0; d.uTh.value = 1.5; draw(M.down, t); last = t; });
    const u = M.up.uniforms; let top = r.down[r.down.length - 1]; for (let i = r.up.length - 1; i >= 0; i--) { u.tSrc.value = top.texture; u.tBase.value = r.down[i].texture; u.uPx.value.set(1 / r.up[i].width, 1 / r.up[i].height); u.uK.value = 0.75; draw(M.up, r.up[i]); top = r.up[i]; }
    const ad = M.adapt.uniforms; ad.tSrc.value = r.down[Math.min(3, r.down.length - 1)].texture; ad.tPrev.value = r.ad0.texture; ad.uK.value = 1 - Math.exp(-(o.dt || 0.016) * 1.4); draw(M.adapt, r.ad1); { const t = r.ad0; r.ad0 = r.ad1; r.ad1 = t; }
    const f = M.final.uniforms; f.tSrc.value = src.texture; f.tBloom.value = top.texture; f.tAdapt.value = r.ad0.texture; f.uExposure.value = m.exposure; if (m.adapt) f.uAdapt.value.set(m.adapt[0], m.adapt[1]); else f.uAdapt.value.set(0.62, 2.2); /* adapt: Grenzen der Augenanpassung (Weltall: eng, sonst wird das schwarze All hochgezogen) */ f.uSat.value = m.sat; f.uTime.value = o.time % 17; f.uCA.value = 0.0035 + Math.min(0.012, (o.speed || 0) * 0.00011) + (o.nitro || 0) * 0.012; f.uNitro.value = o.nitro || 0; f.uTint.value.set(m.tint[0], m.tint[1], m.tint[2]); f.uSharp.value = P.level.sharp; f.uPx.value.set(1 / w, 1 / h); draw(M.final, null);
    renderer.shadowMap.autoUpdate = prevAuto;
  }
  const STEPS = [1, 0.86, 0.72, 0.6]; const W = { t: 0, n: 0, i: 0, good: 0, block: 0 };
  function watch(dt, enabled) { if (!enabled) { W.t = 0; W.n = 0; return; } W.t += dt; W.n++; W.block = Math.max(0, W.block - dt); if (W.t < 2.5) return; const fps = W.n / W.t; W.t = 0; W.n = 0;
    if (fps < 45 && W.i < STEPS.length - 1) { W.i++; W.good = 0; W.block = 45; P.resScale = STEPS[W.i]; } else if (fps >= 58 && W.i > 0 && W.block <= 0) { W.good++; if (W.good >= 8) { W.i--; W.good = 0; P.resScale = STEPS[W.i]; W.block = 30; } } else W.good = 0; }
  function reset() { P.hasPrev = false; if (P.rts) { for (const t of [P.rts.ad0, P.rts.ad1]) { renderer.setRenderTarget(t); renderer.setClearColor(0x000000, 0); renderer.clear(); } renderer.setRenderTarget(null); } }
  // Bildketten-Shader vorab übersetzen, einer je Aufruf (Spielstart)
  function* warm() { if (!M) buildMaterials(); const t = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false }); const prev = renderer.getRenderTarget(); for (const k of Object.keys(M)) { draw(M[k], t); yield k; } renderer.setRenderTarget(prev); t.dispose(); }
  return { render, setLevel, reset, watch, warm, W, P, dispose() { disposeTargets(); if (M) for (const m of Object.values(M)) m.dispose(); M = null; } };
}
