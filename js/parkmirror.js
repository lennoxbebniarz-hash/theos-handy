// Theos Seitenscheidel - Parkmodus: Rückspiegel für die Endgegner-Level.
// Eine eigene Kamera sitzt erhöht über dem Heck (beim Sattelzug über dem Ende des Aufliegers) und schaut schräg nach hinten unten.
// Das Bild wird gespiegelt oben in der Mitte gezeigt, wie ein breiter Innenspiegel, damit links und rechts zum Lenken passen.
import * as THREE from './vendor/three.module.min.js';

const VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FS = `varying vec2 vUv; uniform sampler2D tSrc; uniform float uExp; uniform vec2 uSize;
vec3 aces(vec3 x) { x = mat3(0.59719, 0.076, 0.0284, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777) * x; vec3 a = x * (x + 0.0245786) - 0.000090537; vec3 b = x * (0.983729 * x + 0.432951) + 0.238081; x = a / b; return clamp(mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602) * x, 0.0, 1.0); }
vec3 srgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666)) - 0.055, step(0.0031308, c)); }
float box(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec2 px = vUv * uSize; float rr = uSize.y * 0.22; float d = box(px - uSize * 0.5, uSize * 0.5, rr);
  if (d > 0.0) discard;
  float frame = max(3.0, uSize.y * 0.045);
  if (d > -frame) { float k = smoothstep(-frame, 0.0, d); gl_FragColor = vec4(mix(vec3(0.16), vec3(0.04), k), 1.0); return; }
  vec3 c = texture2D(tSrc, vec2(1.0 - vUv.x, vUv.y)).rgb * uExp; c = srgb(aces(c));
  float glare = smoothstep(0.55, 1.0, vUv.y) * 0.05; float edge = smoothstep(-frame * 3.0, -frame, d) * 0.25;
  gl_FragColor = vec4(c * (1.0 - edge) + glare, 1.0);
}`;

export function createParkMirror(renderer) {
  const cam = new THREE.PerspectiveCamera(68, 3.2, 0.15, 700);
  const qs = new THREE.Scene(); const qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const mat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, uniforms: { tSrc: { value: null }, uExp: { value: 1 }, uSize: { value: new THREE.Vector2(1, 1) } }, depthTest: false, depthWrite: false, toneMapped: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; qs.add(quad);
  let rt = null; const css = new THREE.Vector2(); const look = new THREE.Vector3();
  const M = { rect: null, cam };

  // Wo die Kamera sitzt: über dem hintersten Punkt des Fahrzeugs, leicht nach vorn versetzt, damit das eigene Heck unten im Bild bleibt
  function mount(st, def) {
    let h = st.h; let x = st.x; let z = st.z; let back = 1e9; let top = def.h;
    if (def.trailer) { const t = def.trailer; h = st.th2; const s2 = Math.sin(h); const c2 = Math.cos(h); const ax = st.x - s2 * t.len; const az = st.z - c2 * t.len; const oc = t.len - t.c; x = ax + s2 * oc; z = az + c2 * oc; back = -t.l; top = Math.max(top, t.h); }
    else for (const b of def.boxes) back = Math.min(back, b.c - b.l);
    const s = Math.sin(h); const c = Math.cos(h); const fwd = Math.min(1.2, Math.max(0.4, def.len * 0.08));
    const rx = x + s * (back + fwd); const rz = z + c * (back + fwd); const y = Math.min(top + 1.4, top * 1.25 + 1);
    const far = Math.max(10, Math.min(30, def.len * 1.4 + 6));
    cam.position.set(rx, y, rz); look.set(rx - s * far, 0, rz - c * far); cam.lookAt(look);
  }

  // Nach dem normalen Bild aufrufen: rendert die Rücksicht und legt sie oben in die Mitte
  M.render = (scene, st, def, exposure = 1) => {
    renderer.getSize(css); const pr = renderer.getPixelRatio(); const w = Math.round(Math.min(css.x * 0.36, 620)); const h = Math.round(w / 3.2); if (w < 40) return;
    const W = Math.round(w * pr); const H = Math.round(h * pr);
    if (!rt || rt.width !== W || rt.height !== H) { if (rt) rt.dispose(); rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 2, depthBuffer: true }); }
    mount(st, def); cam.aspect = w / h; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const prevShadow = renderer.shadowMap.needsUpdate; renderer.shadowMap.needsUpdate = false;
    renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null);
    renderer.shadowMap.needsUpdate = prevShadow;
    const x = Math.round((css.x - w) / 2); const yTop = 60; /* unter der Uhr */ const y = css.y - yTop - h; M.rect = { x, y: yTop, w, h };
    mat.uniforms.tSrc.value = rt.texture; mat.uniforms.uExp.value = exposure; mat.uniforms.uSize.value.set(W, H);
    const auto = renderer.autoClear; renderer.autoClear = false; renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h); renderer.setScissorTest(true);
    renderer.render(qs, qc);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, css.x, css.y); renderer.setScissor(0, 0, css.x, css.y); renderer.autoClear = auto;
  };
  M.dispose = () => { if (rt) rt.dispose(); rt = null; mat.dispose(); quad.geometry.dispose(); };
  return M;
}
