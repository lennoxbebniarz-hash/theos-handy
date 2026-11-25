// Theos Seitenscheidel - selbst erzeugte Texturen des Rennmodus: Boden, Rinde, Blätter, Gras und die Oberflächen von Innenraum und Motor. Alles entsteht beim Laden (Grafikkarte bzw. Canvas), keine fremden Dateien.
// Jede Fläche kommt als Paar: A = Farbe (rgb) + Höhe (a), N = Normale (rg), Rauheit (b), Verdeckung (a).
import * as THREE from './vendor/three.module.min.js';

const LIB = `
varying vec2 vUv;
float h21(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
vec2 h22(vec2 p) { vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz) * q.zy); }
float vn(vec2 p, vec2 per) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(mod(i, per)), h21(mod(i + vec2(1, 0), per)), f.x), mix(h21(mod(i + vec2(0, 1), per)), h21(mod(i + vec2(1, 1), per)), f.x), f.y); }
float vn(vec2 p, float per) { return vn(p, vec2(per)); }
float fbm(vec2 p, vec2 per, int n) { float a = 0.5, s = 0.0, t = 0.0; for (int i = 0; i < n; i++) { s += a * vn(p, per); t += a; p = p * 2.0 + 17.0; per *= 2.0; a *= 0.5; } return s / t; }
float fbm(vec2 p, float per, int n) { return fbm(p, vec2(per), n); }
// Zellrauschen, kachelbar: x = Abstand nächste Zelle, y = zweitnächste, z = Zellzufall
vec3 cells(vec2 p, vec2 per) { vec2 i = floor(p), f = fract(p); float a = 9.0, b = 9.0, id = 0.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 c = mod(i + g, per); vec2 o = h22(c); float d = length(g + o - f); if (d < a) { b = a; a = d; id = h21(c + 7.7); } else if (d < b) b = d; } return vec3(a, b, id); }
vec3 cells(vec2 p, float per) { return cells(p, vec2(per)); }
vec3 srgb2lin(vec3 c) { return pow(c, vec3(2.2)); }
`;
// Rumpf: height(uv) und shade(uv, h) kommen vom Aufrufer; die Normale wird aus der Höhe abgeleitet
const body = (s) => `${LIB}
uniform float uTexel, uNormal, uPass;
${s}
void main() {
  float h = height(vUv);
  if (uPass < 0.5) { gl_FragColor = vec4(shade(vUv, h), h); return; }
  float e = uTexel; float dx = height(vUv + vec2(e, 0.0)) - height(vUv - vec2(e, 0.0)); float dy = height(vUv + vec2(0.0, e)) - height(vUv - vec2(0.0, e));
  vec3 n = normalize(vec3(-dx * uNormal, -dy * uNormal, 1.0)); gl_FragColor = vec4(n.xy * 0.5 + 0.5, rough(vUv, h), occl(vUv, h));
}`;

const SURF = {
  // Waldboden: Laub, Nadeln, Erde
  forest: { size: 1024, normal: 34, s: `
    float leafField(vec2 uv, float sc, float seed) { vec3 c = cells(uv * sc + seed, sc); return smoothstep(0.05, 0.42, c.y - c.x) * (0.5 + 0.5 * c.z); }
    float height(vec2 uv) { float a = leafField(uv, 13.0, 0.0), b = leafField(uv + 0.31, 19.0, 3.0), c = leafField(uv + 0.63, 29.0, 7.0); return clamp(0.42 * fbm(uv * 8.0, 8.0, 5) + 0.38 * max(a, b * 0.86) + 0.2 * c, 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 c = cells(uv * 13.0, 13.0); float t = fract(c.z * 7.3); vec3 leaf = mix(vec3(0.33, 0.21, 0.10), vec3(0.50, 0.33, 0.13), t); leaf = mix(leaf, vec3(0.19, 0.13, 0.08), step(0.72, c.z)); leaf = mix(leaf, vec3(0.28, 0.30, 0.12), step(0.86, fract(c.z * 3.1))); vec3 soil = vec3(0.11, 0.075, 0.05); vec3 col = mix(soil, leaf, smoothstep(0.32, 0.56, h)); col *= 0.82 + 0.34 * fbm(uv * 26.0, 26.0, 3); return col * (0.55 + 0.75 * h); }
    float rough(vec2 uv, float h) { return 0.74 + 0.2 * (1.0 - h); } float occl(vec2 uv, float h) { return smoothstep(0.08, 0.5, h); }` },
  // kurzer Rasen von oben
  turf: { size: 1024, normal: 26, s: `
    float blades(vec2 uv, float sc, float seed) { vec2 p = uv * sc + seed; vec2 c = vec2(p.x, p.y * 0.25); vec3 r = cells(c, vec2(sc, sc * 0.25)); return smoothstep(0.42, 0.04, r.x) * (0.45 + 0.55 * r.z); }
    float height(vec2 uv) { return clamp(0.34 * fbm(uv * 7.0, 7.0, 4) + 0.5 * max(blades(uv, 44.0, 0.0), blades(uv.yx, 52.0, 3.0)) + 0.25 * blades(uv + 0.5, 32.0, 7.0), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { float m = fbm(uv * 5.0, 5.0, 4); vec3 a = vec3(0.10, 0.23, 0.05), b = vec3(0.30, 0.43, 0.09), c = vec3(0.45, 0.46, 0.15); vec3 col = mix(a, b, smoothstep(0.2, 0.75, h)); col = mix(col, c, smoothstep(0.55, 0.8, m) * 0.55); col = mix(col, vec3(0.16, 0.12, 0.06), smoothstep(0.34, 0.1, h)); return col; }
    float rough(vec2 uv, float h) { return 0.62 + 0.25 * (1.0 - h); } float occl(vec2 uv, float h) { return smoothstep(0.05, 0.42, h); }` },
  // Bankett: Splitt, Erde, kleine Steine
  gravel: { size: 1024, normal: 30, s: `
    float stones(vec2 uv, float sc, float seed) { vec3 c = cells(uv * sc + seed, sc); return smoothstep(0.02, 0.3, c.y - c.x) * (0.3 + 0.7 * c.z); }
    float height(vec2 uv) { return clamp(0.26 * fbm(uv * 6.0, 6.0, 5) + 0.58 * max(stones(uv, 22.0, 0.0), stones(uv, 38.0, 5.0) * 0.8) + 0.16 * stones(uv, 64.0, 9.0), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 c = cells(uv * 22.0, 22.0); vec3 st = mix(vec3(0.34, 0.31, 0.27), vec3(0.52, 0.47, 0.40), c.z); st = mix(st, vec3(0.42, 0.28, 0.18), step(0.82, fract(c.z * 5.7))); vec3 soil = mix(vec3(0.16, 0.115, 0.075), vec3(0.24, 0.18, 0.12), fbm(uv * 9.0, 9.0, 4)); return mix(soil, st, smoothstep(0.26, 0.5, h)) * (0.72 + 0.5 * h); }
    float rough(vec2 uv, float h) { return 0.78 + 0.16 * (1.0 - h); } float occl(vec2 uv, float h) { return smoothstep(0.1, 0.45, h); }` },
  // Schlamm: nass, mit Furchen
  mud: { size: 1024, normal: 22, s: `
    float height(vec2 uv) { float f = fbm(uv * 6.0, 6.0, 6); float r = 1.0 - abs(2.0 * fbm(uv * 4.0 + 3.0, 4.0, 4) - 1.0); return clamp(0.6 * f + 0.4 * pow(r, 3.0), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 a = vec3(0.075, 0.05, 0.03), b = vec3(0.20, 0.145, 0.09); return mix(a, b, smoothstep(0.3, 0.7, h)) * (0.8 + 0.4 * fbm(uv * 30.0, 30.0, 3)); }
    float rough(vec2 uv, float h) { return mix(0.12, 0.62, smoothstep(0.34, 0.6, h)); } float occl(vec2 uv, float h) { return 0.7 + 0.3 * h; }` },
  // Asphalt: helle Körnung im dunklen Bindemittel (Kachel 3,2 m)
  asphalt: { size: 1024, normal: 9, s: `
    float height(vec2 uv) { vec3 a = cells(uv * 74.0, 74.0), b = cells(uv * 130.0 + 3.0, 130.0); return clamp(0.56 * smoothstep(0.0, 0.34, a.y - a.x) * (0.45 + 0.55 * a.z) + 0.3 * smoothstep(0.0, 0.3, b.y - b.x) * b.z + 0.14 * fbm(uv * 16.0, 16.0, 4), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 a = cells(uv * 74.0, 74.0), b = cells(uv * 130.0 + 3.0, 130.0); vec3 st = mix(vec3(0.16, 0.155, 0.15), vec3(0.34, 0.32, 0.30), a.z * a.z); st = mix(st, vec3(0.42, 0.34, 0.27), step(0.9, fract(a.z * 9.1))); vec3 fine = mix(vec3(0.075), vec3(0.2, 0.19, 0.18), b.z); vec3 bind = vec3(0.038, 0.037, 0.04); vec3 col = mix(bind, fine, smoothstep(0.1, 0.3, h)); col = mix(col, st, smoothstep(0.26, 0.42, h)); return col * (0.8 + 0.4 * fbm(uv * 7.0, 7.0, 3)); }
    float rough(vec2 uv, float h) { return 0.6 + 0.26 * (1.0 - h); } float occl(vec2 uv, float h) { return smoothstep(0.02, 0.32, h) * 0.6 + 0.4; }` },
  // Eichenrinde: längs gestreckte Furchen
  barkOak: { size: 1024, normal: 42, s: `
    float height(vec2 uv) { vec2 p = vec2(uv.x * 9.0, uv.y * 3.0); vec3 c = cells(p + 0.5 * vec2(vn(uv * vec2(9.0, 3.0) + 2.0, vec2(9.0, 3.0)), vn(uv * vec2(9.0, 3.0), vec2(9.0, 3.0))), vec2(9.0, 3.0)); float ridge = smoothstep(0.02, 0.34, c.y - c.x); return clamp(0.7 * ridge + 0.3 * fbm(uv * vec2(24.0, 12.0), vec2(24.0, 12.0), 5), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 col = mix(vec3(0.05, 0.036, 0.026), vec3(0.235, 0.18, 0.13), smoothstep(0.1, 0.8, h)); float moss = smoothstep(0.52, 0.76, fbm(uv * 4.0 + 1.3, 4.0, 5)); col = mix(col, vec3(0.13, 0.20, 0.06) * (0.6 + h), moss * 0.7); return col; }
    float rough(vec2 uv, float h) { return 0.86; } float occl(vec2 uv, float h) { return smoothstep(0.0, 0.42, h); }` },
  // Kiefernrinde: rötliche Platten
  barkPine: { size: 1024, normal: 46, s: `
    float height(vec2 uv) { vec2 p = vec2(uv.x * 7.0, uv.y * 4.0); vec3 c = cells(p, vec2(7.0, 4.0)); float pl = smoothstep(0.01, 0.2, c.y - c.x); return clamp(pl * (0.5 + 0.5 * c.z) + 0.24 * fbm(uv * vec2(30.0, 18.0), vec2(30.0, 18.0), 4), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 c = cells(vec2(uv.x * 7.0, uv.y * 4.0), vec2(7.0, 4.0)); vec3 col = mix(vec3(0.06, 0.04, 0.03), mix(vec3(0.40, 0.21, 0.12), vec3(0.28, 0.17, 0.11), c.z), smoothstep(0.14, 0.6, h)); return col; }
    float rough(vec2 uv, float h) { return 0.84; } float occl(vec2 uv, float h) { return smoothstep(0.0, 0.36, h); }` },
  // Birke: weiß, schwarze Querstriche, schälende Ringe
  barkBirch: { size: 1024, normal: 18, s: `
    float marks(vec2 uv) { vec2 p = vec2(uv.x * 5.0, uv.y * 11.0); vec2 i = floor(p); vec2 f = fract(p); float d = 0.0; for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) { vec2 g = vec2(float(x), float(y)); vec2 c = mod(i + g, vec2(5.0, 11.0)); vec2 o = h22(c + 3.3); if (h21(c) > 0.62) { vec2 q = (g + o - f) * vec2(0.8, 7.0); d = max(d, smoothstep(1.0, 0.55, length(q))); } } return d; }
    float height(vec2 uv) { return clamp(0.82 - 0.5 * marks(uv) + 0.2 * fbm(uv * vec2(6.0, 40.0), vec2(6.0, 40.0), 4) - 0.1, 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 w = mix(vec3(0.72, 0.70, 0.64), vec3(0.87, 0.86, 0.81), fbm(uv * vec2(4.0, 22.0), vec2(4.0, 22.0), 4)); float m = marks(uv); w = mix(w, vec3(0.045, 0.04, 0.035), smoothstep(0.1, 0.6, m)); float low = smoothstep(0.4, 0.75, fbm(uv * vec2(3.0, 5.0) + 2.0, vec2(3.0, 5.0), 4)); return mix(w, w * vec3(0.72, 0.62, 0.5), low * 0.42); }
    float rough(vec2 uv, float h) { return 0.66; } float occl(vec2 uv, float h) { return smoothstep(0.1, 0.6, h); }` },
  // Fels mit Flechten
  rock: { size: 1024, normal: 40, s: `
    float height(vec2 uv) { vec3 c = cells(uv * 5.0, 5.0); float f = fbm(uv * 8.0, 8.0, 6); return clamp(0.55 * f + 0.45 * smoothstep(0.0, 0.25, c.y - c.x), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { vec3 col = mix(vec3(0.17, 0.165, 0.16), vec3(0.46, 0.45, 0.42), h); float li = smoothstep(0.58, 0.68, fbm(uv * 20.0, 20.0, 4)); return mix(col, vec3(0.50, 0.50, 0.28), li * 0.5); }
    float rough(vec2 uv, float h) { return 0.82; } float occl(vec2 uv, float h) { return smoothstep(0.1, 0.5, h); }` },
  // ---- Innenraum und Motor ----
  grain: { size: 512, normal: 2.2, s: `
    float height(vec2 uv) { vec3 c = cells(uv * 96.0, 96.0); return clamp(smoothstep(0.0, 0.3, c.y - c.x) * (0.6 + 0.4 * c.z) + 0.1 * fbm(uv * 14.0, 14.0, 3), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { return vec3(0.9 + 0.1 * h); } float rough(vec2 uv, float h) { return 0.52 + 0.22 * (1.0 - h); } float occl(vec2 uv, float h) { return 0.8 + 0.2 * h; }` },
  leather: { size: 512, normal: 4.0, s: `
    float height(vec2 uv) { vec3 c = cells(uv * 34.0, 34.0); return clamp(smoothstep(0.0, 0.2, c.y - c.x) + 0.14 * fbm(uv * 80.0, 80.0, 3) - 0.1, 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { return vec3(0.82 + 0.18 * h); } float rough(vec2 uv, float h) { return 0.44 + 0.2 * (1.0 - h); } float occl(vec2 uv, float h) { return 0.72 + 0.28 * h; }` },
  fabric: { size: 512, normal: 3.4, s: `
    float height(vec2 uv) { vec2 p = uv * 96.0; float w = sin(p.x * 6.2832) * sin(p.y * 6.2832); float o = mod(floor(p.x) + floor(p.y), 2.0); return clamp(0.5 + 0.34 * (o > 0.5 ? abs(sin(p.x * 3.1416)) : abs(sin(p.y * 3.1416))) * (1.0 - 0.3 * w) + 0.08 * fbm(uv * 40.0, 40.0, 3), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { return vec3(0.68 + 0.32 * h); } float rough(vec2 uv, float h) { return 0.92; } float occl(vec2 uv, float h) { return 0.62 + 0.38 * h; }` },
  // gebürstetes Metall: feine Längsriefen, einzelne Kratzer
  brushed: { size: 512, normal: 1.5, s: `
    float height(vec2 uv) { return clamp(0.5 + 0.34 * (fbm(vec2(uv.x * 2.0, uv.y * 180.0), vec2(2.0, 180.0), 4) - 0.5) + 0.2 * (fbm(vec2(uv.x * 7.0, uv.y * 430.0), vec2(7.0, 430.0), 3) - 0.5), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { return vec3(0.82 + 0.26 * h); } float rough(vec2 uv, float h) { return 0.27 + 0.2 * h + 0.2 * smoothstep(0.55, 0.8, fbm(uv * 7.0, 7.0, 5)); } float occl(vec2 uv, float h) { return 1.0; }` },
  // Guss: narbige Oberfläche von Motorblock und Krümmern
  cast: { size: 512, normal: 5.0, s: `
    float height(vec2 uv) { vec3 c = cells(uv * 62.0, 62.0); return clamp(0.5 * smoothstep(0.0, 0.42, c.x) + 0.5 * fbm(uv * 36.0, 36.0, 5), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { return vec3(0.68 + 0.42 * h); } float rough(vec2 uv, float h) { return 0.5 + 0.3 * (1.0 - h); } float occl(vec2 uv, float h) { return 0.7 + 0.3 * h; }` },
  // Riffelblech: versetzte Rauten
  diamond: { size: 1024, normal: 18, s: `
    float rib(vec2 p, float a) { float c = cos(a), s = sin(a); vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y); return smoothstep(0.32, 0.12, length(vec2(q.x * 0.28, q.y))); }
    float height(vec2 uv) { vec2 p = uv * 10.0; vec2 c = floor(p); vec2 f = fract(p) - 0.5; float o = mod(c.x + c.y, 2.0); float h = rib(f, o > 0.5 ? 0.785 : -0.785); return clamp(h * 0.92 + 0.04 * fbm(uv * 60.0, 60.0, 3), 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { float rust = smoothstep(0.54, 0.74, fbm(uv * 5.0, 5.0, 5)); vec3 m = vec3(0.56, 0.58, 0.60); return mix(m, vec3(0.20, 0.13, 0.09), rust * 0.6) * (0.74 + 0.3 * h); }
    float rough(vec2 uv, float h) { return mix(0.36, 0.72, smoothstep(0.42, 0.72, fbm(uv * 5.0, 5.0, 5))) - 0.08 * h; } float occl(vec2 uv, float h) { return 0.58 + 0.42 * smoothstep(0.0, 0.3, h); }` },
  // Sichtcarbon
  carbon: { size: 512, normal: 2.6, s: `
    float height(vec2 uv) { vec2 p = uv * 48.0; vec2 c = floor(p); vec2 f = fract(p); float o = mod(c.x + floor(c.y * 0.5) * 2.0 + mod(c.y, 2.0), 4.0); float a = o < 2.0 ? sin(f.x * 3.1416) : sin(f.y * 3.1416); return clamp(0.25 + 0.7 * a, 0.0, 1.0); }
    vec3 shade(vec2 uv, float h) { return vec3(0.022 + 0.05 * h); } float rough(vec2 uv, float h) { return 0.32; } float occl(vec2 uv, float h) { return 1.0; }` },
};

const QVS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
function bakeSurface(renderer, def, aniso) {
  const size = def.size; const opt = (cs) => ({ type: THREE.UnsignedByteType, colorSpace: cs, wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: true, anisotropy: aniso, depthBuffer: false });
  const A = new THREE.WebGLRenderTarget(size, size, opt(THREE.SRGBColorSpace)); const N = new THREE.WebGLRenderTarget(size, size, opt(THREE.NoColorSpace));
  const mat = new THREE.ShaderMaterial({ vertexShader: QVS, fragmentShader: body(def.s), uniforms: { uTexel: { value: 1 / size }, uNormal: { value: def.normal }, uPass: { value: 0 } }, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.NoBlending });
  const s = new THREE.Scene(); const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); q.frustumCulled = false; s.add(q); const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  renderer.setRenderTarget(A); renderer.render(s, c); mat.uniforms.uPass.value = 1; renderer.setRenderTarget(N); renderer.render(s, c); mat.dispose(); q.geometry.dispose();
  return { a: A.texture, n: N.texture };
}

// ---------------- Blätter und Pflanzen (Canvas: Tausende einzelner Blätter, danach Farbe unter transparente Stellen ziehen, sonst dunkle Säume in den Mipmaps) ----------------
const mix = (a, b, t) => a + (b - a) * t;
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function leafPath(c, len, wid, tip = 0.5) { c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(len * 0.2, -wid, len * (0.5 + tip * 0.3), -wid * 0.9, len, 0); c.bezierCurveTo(len * (0.5 + tip * 0.3), wid * 0.9, len * 0.2, wid, 0, 0); c.closePath(); }
function drawLeaf(c, x, y, ang, len, wid, h, s, l, r, tip) {
  c.save(); c.translate(x, y); c.rotate(ang); leafPath(c, len, wid, tip); const g = c.createLinearGradient(0, -wid, 0, wid); g.addColorStop(0, `hsl(${h},${s}%,${l + 5}%)`); g.addColorStop(0.5, `hsl(${h + 2},${s}%,${l + 1}%)`); g.addColorStop(1, `hsl(${h - 4},${s - 6}%,${l - 7}%)`); c.fillStyle = g; c.fill();
  c.strokeStyle = `hsla(${h + 10},${s - 12}%,${l + 16}%,0.55)`; c.lineWidth = Math.max(0.6, wid * 0.09); c.beginPath(); c.moveTo(0, 0); c.lineTo(len * 0.96, 0); c.stroke();
  if (len > 22) { c.lineWidth = Math.max(0.4, wid * 0.05); for (let i = 1; i < 5; i++) { const t = i / 5.4; c.beginPath(); c.moveTo(len * t, 0); c.lineTo(len * (t + 0.13), -wid * 0.62 * Math.sin(t * 3.1)); c.moveTo(len * t, 0); c.lineTo(len * (t + 0.13), wid * 0.62 * Math.sin(t * 3.1)); c.stroke(); } }
  c.restore();
}
// Blattbüschel: Blätter sitzen an Zweigen, die von unten in die Zelle wachsen. Hinten dunkel, vorn hell: das ergibt Tiefe, ohne dass Licht gerechnet wird.
function leafCluster(c, S, r, o) {
  const twigs = o.twigs; const tips = [];
  c.lineCap = 'round';
  for (let t = 0; t < twigs; t++) { const a0 = -Math.PI / 2 + (r() - 0.5) * 1.9; let x = S / 2 + (r() - 0.5) * S * 0.14; let y = S * 0.97; let a = a0; const n = 7; const st = S * (0.1 + r() * 0.05); c.strokeStyle = `hsl(28,28%,${16 + r() * 8}%)`; for (let i = 0; i < n; i++) { const nx = x + Math.cos(a) * st; const ny = y + Math.sin(a) * st; c.lineWidth = (n - i) * S * 0.0016 + 0.8; c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke(); x = nx; y = ny; a += (r() - 0.5) * 0.5; tips.push([x, y, a]); } }
  const layers = [[0.42, -14, 0.72], [0.7, -7, 0.85], [1.0, 0, 1.0]];
  for (const [k, dl, sc] of layers) { const n = Math.round(o.leaves * k); for (let i = 0; i < n; i++) { const tp = tips[(r() * tips.length) | 0]; const a = tp[2] + (r() - 0.5) * 2.7; const d = r() * S * 0.1; const x = tp[0] + Math.cos(a) * d; const y = tp[1] + Math.sin(a) * d; const ed = Math.hypot(x - S / 2, y - S * 0.54) / (S * 0.5); if (ed > 1.0) continue; const light = o.l + dl + (r() - 0.5) * o.dl + (1 - y / S) * 7; const hh = o.h + (r() - 0.5) * o.dh; const len = S * o.len * (0.72 + r() * 0.5) * sc; drawLeaf(c, x, y, a, len, len * o.wid, hh, o.s + (r() - 0.5) * 14, light, r, o.tip); } }
}
function needleCluster(c, S, r, o) { // Kiefernzweig: Mittelast, Bündel langer Nadeln
  for (let b = 0; b < 3; b++) { let x = S * (0.3 + 0.2 * b); let y = S * 0.98; let a = -Math.PI / 2 + (b - 1) * 0.36; const seg = 12; const st = S * 0.073; for (let i = 0; i < seg; i++) { const nx = x + Math.cos(a) * st; const ny = y + Math.sin(a) * st; c.strokeStyle = `hsl(25,30%,${14 + r() * 6}%)`; c.lineWidth = (seg - i) * S * 0.0009 + 1; c.beginPath(); c.moveTo(x, y); c.lineTo(nx, ny); c.stroke(); for (let k = 0; k < 42; k++) { const t = r(); const px = x + (nx - x) * t; const py = y + (ny - y) * t; const na = a + (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.8); const len = S * (0.075 + r() * 0.055) * (1 - i / seg * 0.4); const l = o.l + (r() - 0.5) * 14; c.strokeStyle = `hsl(${o.h + (r() - 0.5) * 12},${o.s}%,${l}%)`; c.lineWidth = 1.1 + r() * 0.7; c.beginPath(); c.moveTo(px, py); c.lineTo(px + Math.cos(na) * len, py + Math.sin(na) * len); c.stroke(); } x = nx; y = ny; a += (r() - 0.5) * 0.25; } }
}
function grassTuft(c, x0, y0, W, H, r, o) { // Halme als geschwungene, sich verjüngende Flächen
  for (let i = 0; i < o.n; i++) { const t = r(); const bx = x0 + W * (0.12 + 0.76 * t); const lean = (t - 0.5) * W * 0.7 + (r() - 0.5) * W * 0.25; const h = H * (0.45 + r() * 0.53); const wd = W * (0.012 + r() * 0.016); const tx = bx + lean; const ty = y0 + H - h; const cx = bx + lean * 0.15; const cy = y0 + H - h * 0.62; const g = c.createLinearGradient(0, y0 + H, 0, ty); const hh = o.h + (r() - 0.5) * o.dh; const l = o.l + (r() - 0.5) * 12; g.addColorStop(0, `hsl(${hh - 12},${o.s - 8}%,${l - 15}%)`); g.addColorStop(0.5, `hsl(${hh},${o.s}%,${l}%)`); g.addColorStop(1, `hsl(${hh + 6},${o.s}%,${l + 10}%)`); c.fillStyle = g; c.beginPath(); c.moveTo(bx - wd, y0 + H); c.quadraticCurveTo(cx - wd * 0.7, cy, tx, ty); c.quadraticCurveTo(cx + wd * 0.7, cy, bx + wd, y0 + H); c.fill(); }
}
function fernFrond(c, x0, y0, W, H, r) { // Wedel: Blattspindel mit gegenständigen Fiedern, Spitze oben
  const cx = x0 + W / 2; const n = 26; c.strokeStyle = 'hsl(95,42%,22%)'; c.lineWidth = W * 0.012; c.beginPath(); c.moveTo(cx, y0 + H); c.lineTo(cx, y0 + H * 0.02); c.stroke();
  for (let i = 0; i < n; i++) { const t = i / n; const y = y0 + H * (0.97 - 0.94 * t); const len = W * 0.47 * Math.sin(Math.min(1, (1 - t) * 1.2 + 0.08) * 1.57) * (t < 0.1 ? t / 0.1 * 0.6 + 0.4 : 1); for (const s of [-1, 1]) { const a = s > 0 ? -0.34 : Math.PI + 0.34; const l = 24 + r() * 8 + t * 6; c.save(); c.translate(cx, y); c.rotate(a); const wid = H * 0.0125; c.beginPath(); c.moveTo(0, 0); for (let k = 0; k <= 8; k++) { const q = k / 8; c.lineTo(len * q, -wid * (1 - q * q) * (1 + 0.28 * Math.sin(q * 34))); } for (let k = 8; k >= 0; k--) { const q = k / 8; c.lineTo(len * q, wid * (1 - q * q) * (1 + 0.28 * Math.sin(q * 34))); } c.closePath(); c.fillStyle = `hsl(${96 + r() * 12},${48 + r() * 12}%,${l}%)`; c.fill(); c.restore(); } }
}
function flowers(c, x0, y0, W, H, r, col, kind) { grassTuft(c, x0, y0 + H * 0.3, W, H * 0.7, r, { n: 26, h: 95, dh: 16, s: 45, l: 28 }); for (let i = 0; i < 16; i++) { const x = x0 + W * (0.12 + 0.76 * r()); const y = y0 + H * (0.08 + r() * 0.5); c.strokeStyle = 'hsl(100,38%,26%)'; c.lineWidth = W * 0.006; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * W * 0.1, y0 + H); c.stroke(); const R = W * (0.028 + r() * 0.018); for (let p = 0; p < 7; p++) { const a = p / 7 * 6.283; c.fillStyle = col; c.beginPath(); c.ellipse(x + Math.cos(a) * R, y + Math.sin(a) * R * 0.75, R * (kind ? 0.42 : 0.7), R * 0.38, a, 0, 7); c.fill(); } c.fillStyle = kind ? '#e8b92a' : '#d8a018'; c.beginPath(); c.arc(x, y, R * 0.5, 0, 7); c.fill(); } }
// transparente Pixel bekommen die Farbe der Zelle (Mittelwert der deckenden Pixel), damit die Mipmaps keinen schwarzen Rand ziehen
function toTexture(cv, cellsX, cellsY, aniso) {
  const W = cv.width; const H = cv.height; const c = cv.getContext('2d', { willReadFrequently: true }); const im = c.getImageData(0, 0, W, H); const d = im.data; const cw = W / cellsX; const ch = H / cellsY;
  for (let cy = 0; cy < cellsY; cy++) for (let cx = 0; cx < cellsX; cx++) { let r = 0; let g = 0; let b = 0; let n = 0; const x0 = Math.round(cx * cw); const x1 = Math.round((cx + 1) * cw); const y0 = Math.round(cy * ch); const y1 = Math.round((cy + 1) * ch); for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const k = (y * W + x) * 4; if (d[k + 3] > 180) { r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; } } if (!n) continue; r /= n; g /= n; b /= n; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (y * W + x) * 4; const a = d[k + 3]; if (a < 8) { d[k] = r; d[k + 1] = g; d[k + 2] = b; } } }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.UnsignedByteType); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = aniso; t.flipY = false; t.needsUpdate = true; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// Zellen 4x4 à 512 px; die Geometrie (raceflora.js) greift über ATLAS auf sie zu
export const ATLAS = { oak: [0, 1, 2], birch: [3, 4], pine: [5, 6], poplar: [7, 8], bush: [9], ivy: [10] };
function leafAtlas(aniso) {
  const S = 512; const N = 4; const cv = document.createElement('canvas'); cv.width = cv.height = S * N; const c = cv.getContext('2d', { willReadFrequently: true }); const r = rng(77);
  const cell = (i, fn) => { c.save(); c.translate((i % N) * S, Math.floor(i / N) * S); c.beginPath(); c.rect(0, 0, S, S); c.clip(); fn(); c.restore(); };
  const oak = { twigs: 6, leaves: 420, len: 0.075, wid: 0.34, h: 92, dh: 20, s: 46, l: 27, dl: 13, tip: 0.3 }; const birch = { twigs: 8, leaves: 620, len: 0.048, wid: 0.42, h: 80, dh: 16, s: 56, l: 35, dl: 12, tip: 0.6 }; const poplar = { twigs: 5, leaves: 560, len: 0.055, wid: 0.5, h: 100, dh: 16, s: 40, l: 24, dl: 11, tip: 0.5 };
  for (const i of ATLAS.oak) cell(i, () => leafCluster(c, S, r, oak)); for (const i of ATLAS.birch) cell(i, () => leafCluster(c, S, r, birch)); for (const i of ATLAS.poplar) cell(i, () => leafCluster(c, S, r, poplar));
  for (const i of ATLAS.pine) cell(i, () => needleCluster(c, S, r, { h: 138, s: 32, l: 20 }));
  cell(ATLAS.bush[0], () => leafCluster(c, S, r, { twigs: 9, leaves: 520, len: 0.07, wid: 0.44, h: 108, dh: 18, s: 44, l: 25, dl: 12, tip: 0.5 })); cell(ATLAS.ivy[0], () => leafCluster(c, S, r, { twigs: 7, leaves: 300, len: 0.1, wid: 0.62, h: 112, dh: 12, s: 42, l: 21, dl: 10, tip: 0.2 }));
  return toTexture(cv, N, N, aniso);
}
export const PLANT = { grass: [0, 1, 2], dry: [3], fern: [4], flowerW: [5], flowerY: [6], flowerP: [7] };
function plantAtlas(aniso) {
  const S = 512; const NX = 4; const NY = 2; const cv = document.createElement('canvas'); cv.width = S * NX; cv.height = S * NY; const c = cv.getContext('2d', { willReadFrequently: true }); const r = rng(303);
  const at = (i) => [(i % NX) * S, Math.floor(i / NX) * S];
  const grass = { n: 150, h: 88, dh: 20, s: 46, l: 38 }; for (const i of PLANT.grass) { const [x, y] = at(i); grassTuft(c, x, y, S, S, r, { ...grass, l: 30 + i * 3 }); } { const [x, y] = at(PLANT.dry[0]); grassTuft(c, x, y, S, S, r, { n: 130, h: 58, dh: 16, s: 42, l: 46 }); }
  { const [x, y] = at(PLANT.fern[0]); fernFrond(c, x, y, S, S, r); } { const [x, y] = at(PLANT.flowerW[0]); flowers(c, x, y, S, S, r, '#f4f1e6', 0); } { const [x, y] = at(PLANT.flowerY[0]); flowers(c, x, y, S, S, r, '#f2cc32', 1); } { const [x, y] = at(PLANT.flowerP[0]); flowers(c, x, y, S, S, r, '#a678de', 1); }
  return toTexture(cv, NX, NY, aniso);
}

const cache = {};
// Einmal je Programmlauf, in kleinen Schritten: Beim Spielstart baut main.js sie zwischen zwei Bildern, damit das Menü sofort steht
export function* textureSteps(renderer) {
  const T = cache; const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  for (const k of Object.keys(SURF)) { if (T[k]) continue; const prev = renderer.getRenderTarget(); const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; T[k] = bakeSurface(renderer, SURF[k], aniso); renderer.setRenderTarget(prev); renderer.shadowMap.autoUpdate = au; yield k; }
  if (!T.leaf) { T.leaf = leafAtlas(aniso); yield 'leaf'; } if (!T.plant) { T.plant = plantAtlas(aniso); yield 'plant'; }
}
// Nur bestimmte Oberflächen backen (das Casino braucht 2 von 16; spart beim ersten Öffnen über eine Sekunde)
export function bakeOnly(renderer, keys) { const T = cache; const aniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8); for (const k of keys) { if (T[k] || !SURF[k]) continue; const prev = renderer.getRenderTarget(); const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; T[k] = bakeSurface(renderer, SURF[k], aniso); renderer.setRenderTarget(prev); renderer.shadowMap.autoUpdate = au; } return T; }
export function buildTextures(renderer) { for (const k of textureSteps(renderer)) { if (!k) break; } return cache; }
