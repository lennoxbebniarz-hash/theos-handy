// Theos Seitenscheidel - Himmel und Stimmung des Rennmodus: Tageszeit je Strecke, Himmel mit Wolken und fernen Hügeln (einmal in eine Würfeltextur gerechnet), Umgebungslicht für Spiegelungen.
// Keine fremden Dateien: alles entsteht beim Laden auf der Grafikkarte.
import * as THREE from './vendor/three.module.min.js';

// az: Sonnenrichtung (Grad, 0 = +z), el: Sonnenhöhe. Tiefe Sonne ergibt lange Schatten quer über die Straße und Lichtstrahlen zwischen den Stämmen.
export const MOODS = {
  easy: { name: 'Sommermorgen', az: 118, el: 40, sun: 0xffe4b8, sunI: 4.3, zen: 0x2f6fc4, hor: 0xbfd8ea, gnd: 0x2c3a24, cloud: 0.46, cloudLit: 0xfff6e8, cloudDark: 0x8ea4bf, fogD: 0.0021, fogH: 42, vol: 1.0, exposure: 0.92, sat: 1.1, tint: [1.02, 1.0, 0.97], envI: 0.95, leaf: [0.46, 0.55, 0.26] },
  classic: { name: 'Mittagslicht', az: 200, el: 52, sun: 0xfff0d6, sunI: 4.6, zen: 0x2a68c0, hor: 0xc6dcea, gnd: 0x303e26, cloud: 0.5, cloudLit: 0xffffff, cloudDark: 0x93a7be, fogD: 0.0017, fogH: 46, vol: 0.7, exposure: 0.86, sat: 1.08, tint: [1.0, 1.0, 0.99], envI: 1.0, leaf: [0.44, 0.54, 0.26] },
  hard: { name: 'Goldene Stunde', az: 262, el: 21, sun: 0xffb46a, sunI: 4.9, zen: 0x3a68ad, hor: 0xf3c595, gnd: 0x2e3020, cloud: 0.54, cloudLit: 0xffd9ae, cloudDark: 0x7e6f8a, fogD: 0.0016, fogH: 36, vol: 0.62, exposure: 0.98, sat: 1.12, tint: [1.04, 0.99, 0.94], envI: 0.85, leaf: [0.52, 0.5, 0.2] },
  impossible: { name: 'Gewitterlicht', az: 35, el: 28, sun: 0xffd2a6, sunI: 2.5, zen: 0x37495f, hor: 0x9aa7ae, gnd: 0x20281e, cloud: 0.86, cloudLit: 0xc9cdd2, cloudDark: 0x3c434e, fogD: 0.0052, fogH: 30, vol: 1.0, exposure: 1.1, sat: 0.96, tint: [0.97, 1.0, 1.03], envI: 1.0, leaf: [0.36, 0.47, 0.25] },
};
Object.assign(MOODS, {
  birken: { ...MOODS.classic, name: 'Mittagslicht', fogD: 0.0015, vol: 0.8, sat: 1.12 },
  herbst: { name: 'Goldener Oktober', az: 244, el: 19, sun: 0xffa95c, sunI: 5.0, zen: 0x4a6fa8, hor: 0xf5c08a, gnd: 0x3a2c18, cloud: 0.5, cloudLit: 0xffd2a0, cloudDark: 0x86708a, fogD: 0.0022, fogH: 34, vol: 0.9, exposure: 0.98, sat: 1.16, tint: [1.05, 0.98, 0.9], envI: 0.85, leaf: [0.6, 0.45, 0.16] },
  berg: { name: 'Hochgebirge', az: 140, el: 46, sun: 0xfff4e4, sunI: 5.0, zen: 0x1f5fc0, hor: 0xc8dcf0, gnd: 0x6a6a68, cloud: 0.36, cloudLit: 0xffffff, cloudDark: 0x9db0c6, fogD: 0.0005, fogH: 90, vol: 0.08, exposure: 0.84, sat: 1.06, tint: [1, 1, 1.01], envI: 1.0, leaf: [0.4, 0.48, 0.3], ridge: 2.6, snowRidge: 1 },
  ring: { name: 'Renntag', az: 165, el: 58, sun: 0xfff6e6, sunI: 4.6, zen: 0x2a6cd0, hor: 0xcfe2f2, gnd: 0x3c4a2a, cloud: 0.38, cloudLit: 0xffffff, cloudDark: 0x9db0c6, fogD: 0.0005, fogH: 60, vol: 0.06, exposure: 0.86, sat: 1.1, tint: [1, 1, 0.99], envI: 1.0, leaf: [0.44, 0.54, 0.26], ridge: 0.7 },
  stadt: { name: 'Spätnachmittag', az: 250, el: 33, sun: 0xffd9a8, sunI: 4.6, zen: 0x3a78c8, hor: 0xe6dcc8, gnd: 0x55504a, cloud: 0.42, cloudLit: 0xfff0dc, cloudDark: 0x8a93a8, fogD: 0.0012, fogH: 50, vol: 0.45, exposure: 0.92, sat: 1.08, tint: [1.02, 1, 0.97], envI: 0.95, leaf: [0.44, 0.5, 0.26], ridge: 0.4 },
  kueste: { name: 'Mittelmeerlicht', az: 205, el: 50, sun: 0xfff2da, sunI: 5.0, zen: 0x1e6ed8, hor: 0xbfe4f4, gnd: 0x3f5a3a, cloud: 0.28, cloudLit: 0xffffff, cloudDark: 0xa4b8cc, fogD: 0.0005, fogH: 70, vol: 0.08, exposure: 0.86, sat: 1.16, tint: [1.01, 1, 0.98], envI: 1.05, leaf: [0.46, 0.54, 0.26], ridge: 0.45 },
  nacht: { name: 'Mondnacht', az: 60, el: 38, sun: 0x9fb8e8, sunI: 0.55, zen: 0x050a18, hor: 0x16223a, gnd: 0x05070a, cloud: 0.4, cloudLit: 0x2c3a58, cloudDark: 0x0a0f1a, fogD: 0.0042, fogH: 26, vol: 0.5, exposure: 1.25, sat: 0.9, tint: [0.9, 0.96, 1.08], envI: 0.22, leaf: [0.06, 0.09, 0.06], stars: 1 },
});
export const moodOf = (diff) => MOODS[diff] || MOODS.easy;
export const sunVector = (m) => { const a = m.az * Math.PI / 180; const e = m.el * Math.PI / 180; return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)); };

const SKY_FS = `
varying vec3 vDir; uniform vec3 uSun, uSunCol, uZen, uHor, uGnd, uLit, uDark; uniform float uCover, uDisk, uSeed, uRidge, uStars;
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p, int n) { float a = 0.5, s = 0.0; mat2 m = mat2(1.62, 1.18, -1.18, 1.62); for (int i = 0; i < n; i++) { s += a * vn(p); p = m * p + 3.7; a *= 0.5; } return s; }
float ridge(float az, float s, float k) { return fbm(vec2(az * s, k), 5); }
void main() {
  vec3 d = normalize(vDir); float y = d.y; float c = dot(d, uSun);
  vec3 col = mix(uHor, uZen, 1.0 - exp(-max(y, 0.0) * 4.2));
  float glow = pow(max(c, 0.0), 5.0) * 0.32 + pow(max(c, 0.0), 42.0) * 0.8 + pow(max(c, 0.0), 420.0) * 3.0;
  col += uSunCol * glow * (0.25 + 0.75 * exp(-max(y, 0.0) * 2.6));
  // Haufenwolken: Dichtefeld auf einer gedachten Ebene, drei Schritte zur Sonne ergeben helle Ränder und dunkle Bäuche
  if (y > 0.0) {
    vec2 p = d.xz / (y + 0.09) * 0.9 + uSeed; float f = fbm(p * 1.25, 7); float th = 1.0 - uCover; float dens = smoothstep(th, th + 0.2, f) * smoothstep(0.012, 0.16, y);
    if (dens > 0.001) { vec2 toSun = normalize(uSun.xz + 1e-4) * 0.16; float occ = 0.0; for (int i = 1; i <= 3; i++) occ += smoothstep(th - 0.06, th + 0.26, fbm((p + toSun * float(i)) * 1.25, 5)); float lit = exp(-occ * 0.95);
      vec3 cl = mix(uDark, uLit * (1.0 + 0.5 * uSunCol), lit); cl += uSunCol * pow(max(c, 0.0), 8.0) * (1.0 - dens) * 1.5; col = mix(col, cl, dens * 0.96); }
  }
  // ferne bewaldete Hügel in drei Lagen, jede weiter hinten heller und blauer
  float az = atan(d.x, d.z); vec3 hz = uHor * 0.92;
  float r3 = (0.09 + 0.09 * ridge(az, 2.2, 3.1)) * uRidge; float r2 = (0.075 + 0.06 * ridge(az, 3.4, 7.7) + 0.01 * ridge(az, 30.0, 4.0)) * uRidge; float r1 = (0.075 + 0.05 * ridge(az, 5.3, 1.9) + 0.022 * ridge(az, 46.0, 2.0) + 0.012 * ridge(az, 130.0, 9.0)) * mix(uRidge, 1.0, 0.25);
  if (uStars > 0.5 && y > 0.02) { vec3 q = d * 210.0; vec3 i3 = floor(q); float h3 = fract(sin(dot(i3, vec3(12.9, 78.2, 37.7))) * 43758.5); float tw = smoothstep(0.9965, 1.0, h3); col += vec3(0.8, 0.86, 1.0) * tw * 1.6 * smoothstep(0.02, 0.2, y) * (1.0 - smoothstep(0.34, 0.6, uCover * 0.9)) ; }
  if (y < r3) col = mix(col, mix(uGnd * 1.5, hz, 0.74), smoothstep(r3 + 0.0015, r3 - 0.0015, y));
  if (y < r2) col = mix(col, mix(uGnd * 1.3, hz, 0.48), smoothstep(r2 + 0.0015, r2 - 0.0015, y));
  if (y < r1) col = mix(col, mix(uGnd * 1.0, hz, 0.2), smoothstep(r1 + 0.0015, r1 - 0.0015, y));
  if (y < 0.0) col = mix(mix(uGnd * 1.0, hz, 0.2), uGnd, smoothstep(0.0, -0.12, y));
  if (uDisk > 0.5 && y > 0.0) { float dk = smoothstep(0.99996, 0.999985, c); float veil = 1.0 - smoothstep(0.75, 1.0, uCover); col += uSunCol * dk * mix(14.0, 90.0, veil); }
  gl_FragColor = vec4(col, 1.0);
}`;

// Backt Himmel (mit Sonnenscheibe) und Umgebungslicht (ohne Scheibe, sonst doppeltes Glanzlicht) für eine Stimmung.
export function bakeSky(renderer, mood, seed = 1, size = 1024) {
  const col = (h) => new THREE.Color(h);
  const uniforms = { uSun: { value: sunVector(mood) }, uSunCol: { value: col(mood.sun) }, uZen: { value: col(mood.zen) }, uHor: { value: col(mood.hor) }, uGnd: { value: col(mood.gnd) }, uLit: { value: col(mood.cloudLit) }, uDark: { value: col(mood.cloudDark) }, uCover: { value: mood.cloud }, uDisk: { value: 1 }, uSeed: { value: seed * 7.3 }, uRidge: { value: mood.ridge || 1 }, uStars: { value: mood.stars ? 1 : 0 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: 'varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: SKY_FS, uniforms, side: THREE.BackSide, depthTest: false, depthWrite: false, toneMapped: false });
  const s = new THREE.Scene(); s.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), mat));
  const bg = new THREE.WebGLCubeRenderTarget(size, { type: THREE.HalfFloatType, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const prevT = renderer.getRenderTarget(); const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  new THREE.CubeCamera(0.5, 50, bg).update(renderer, s);
  uniforms.uDisk.value = 0; const low = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  new THREE.CubeCamera(0.5, 50, low).update(renderer, s);
  const pm = new THREE.PMREMGenerator(renderer); const env = pm.fromCubemap(low.texture).texture; pm.dispose(); low.dispose();
  renderer.setRenderTarget(prevT); renderer.shadowMap.autoUpdate = au; mat.dispose();
  return { cube: bg.texture, env, dispose() { bg.dispose(); env.dispose(); } };
}
