// Theos Seitenscheidel - Startbildschirm Big Bruno kommt auf die Erde: Der Asteroid hat Brunos Gesicht, seine schwarze Cap und seine Goldkette.
// Unten links wartet die Erde, vier Astronauten hacken auf ihm herum, TS-1 schwebt daneben. Eigene Figur, nichts aus fremden Spielen.
import * as THREE from './vendor/three.module.min.js';
import { mergeVertices } from './vendor/BufferGeometryUtils.js';
import { V3, rng, smooth, lerp, clamp, fbm3, std, glowMat, mesh, rbox, bake, canvasTex, glowSprite, puffTex, envFrom, sunLight, particles, TAU } from './titelkit.js';
import { buildAstronaut, earthTexture } from './moonart.js';
import { buildModel, detailTexture, ACCENTS } from './brunoart.js';
import { skyTexture } from './brunotex.js';

const R = 2.25;
const LEAD = V3(-0.8, -0.55, 0.05).normalize(); // Seite, mit der er auf die Erde zurast

const gauss = (q) => Math.exp(-q * q);
function segDist(u, v, ax, ay, bx, by) { const dx = bx - ax; const dy = by - ay; const t = clamp(((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy), 0, 1); return Math.hypot(u - ax - t * dx, v - ay - t * dy); }
// Mund: breites fieses Grinsen. Wert > 0 = innen
function mouthK(u, v) {
  const W = 0.5; if (Math.abs(u) >= W) return -1;
  const q = 1 - (u / W) ** 2; const top = -0.27 + 0.42 * u * u; const bot = top - 0.27 * Math.pow(q, 0.7);
  return Math.min(top - v, v - bot);
}
const CRATERS = (() => {
  const r = rng(90); const list = [];
  while (list.length < 26) { const d = V3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); if (d.lengthSq() > 1 || d.lengthSq() < 0.05) continue; d.normalize(); if (d.z > 0.62 && d.y < 0.5 && Math.abs(d.x) < 0.65) continue; list.push({ d, r: 0.1 + r() * 0.18 }); }
  return list;
})();
// Oberfläche des Kopfes: Abstand je Richtung, dazu Mund und Vertiefung
function surface(d) {
  const { x: u, y: v, z } = d; const face = smooth(0.12, 0.5, z); const calm = 1 - smooth(0.3, 0.55, v) * 0.8;
  let rough = (fbm3(u * 1.7 + 5, v * 1.7, z * 1.7, 4) - 0.5) * 0.36 * (1 - face * 0.55);
  rough += (Math.abs(fbm3(u * 5.2, v * 5.2 + 3, z * 5.2, 3) - 0.5) - 0.1) * 0.16;
  let crater = 0;
  for (const c of CRATERS) { const q = Math.acos(clamp(d.dot(c.d), -1, 1)) / c.r; if (q < 1.6) crater += q < 1 ? -0.075 * (1 - q * q) + 0.025 * q * q : 0.025 * (1 - (q - 1) / 0.6) ** 2; }
  let f = 0; let mouth = 0;
  if (face > 0) {
    for (const s of [1, -1]) {
      f += 0.13 * gauss(segDist(u, v, s * 0.1, 0.2, s * 0.5, 0.36) / 0.075); // Brauenwulst, innen tief
      f -= 0.09 * gauss(Math.hypot((u - s * 0.29) / 0.17, (v - 0.12) / 0.11) ** 1.5);
      f += 0.085 * gauss(Math.hypot((u - s * 0.52) / 0.16, (v + 0.17) / 0.15));
    }
    f += 0.21 * gauss(Math.hypot(u / 0.115, (v + 0.06) / 0.13));
    f += 0.1 * gauss(Math.hypot(u / 0.3, (v + 0.72) / 0.14));
    const m = mouthK(u, v);
    mouth = smooth(-0.005, 0.035, m) * face; f -= 0.16 * mouth;
    if (m > -0.1) f += 0.05 * gauss((m + 0.04) / 0.035) * (1 - mouth);
    f *= face;
  }
  return { r: 1 + rough * calm + crater * calm + f, mouth, cave: f + crater };
}
const onSkin = (u, v, lift = 0) => { const d = V3(u, v, Math.sqrt(Math.max(0.0001, 1 - u * u - v * v))); return d.multiplyScalar(R * surface(d).r + lift); };

function buildHead(parent) {
  let g = new THREE.IcosahedronGeometry(1, 44); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g, 1e-5);
  const p = g.attributes.position; const col = new Float32Array(p.count * 3); const heat = new Float32Array(p.count * 2); const d = V3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const s = surface(d); const n = fbm3(d.x * 3 + 11, d.y * 3, d.z * 3, 3); const dark = clamp(-s.cave * 5, 0, 0.75); const t = smooth(0.36, 0.66, n);
    col[i * 3] = lerp(0.17, 0.4, t) * (1 - dark); col[i * 3 + 1] = lerp(0.105, 0.235, t) * (1 - dark); col[i * 3 + 2] = lerp(0.075, 0.135, t) * (1 - dark);
    heat[i * 2] = smooth(0.2, 0.95, d.dot(LEAD) + (n - 0.5) * 0.35); heat[i * 2 + 1] = s.mouth;
    p.setXYZ(i, d.x * R * s.r, d.y * R * s.r, d.z * R * s.r);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('aHeat', new THREE.BufferAttribute(heat, 2)); g.computeVertexNormals();
  const U = { uRock: { value: detailTexture() }, uT: { value: 0 } };
  const m = std({ vertexColors: true, roughness: 0.93, envMapIntensity: 0.3 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aHeat; varying vec2 vHeat; varying vec3 vOP; varying vec3 vON;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvHeat = aHeat; vOP = position; vON = normal;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uRock; uniform float uT; varying vec2 vHeat; varying vec3 vOP; varying vec3 vON;
vec4 tbTri(float k){ vec3 w = pow(abs(normalize(vON)), vec3(5.0)); w /= w.x + w.y + w.z; return texture2D(uRock, vOP.zy * k) * w.x + texture2D(uRock, vOP.xz * k) * w.y + texture2D(uRock, vOP.xy * k) * w.z; }
vec3 tbBump(vec3 sp, vec3 sn, float h){ vec3 sx = dFdx(sp); vec3 sy = dFdy(sp); vec3 r1 = cross(sy, sn); vec3 r2 = cross(sn, sx); float det = dot(sx, r1); vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2); return normalize(abs(det) * sn - g); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec4 tA = tbTri(0.22); vec4 tB = tbTri(0.62);
float crack = smoothstep(0.0, 0.5, min(tA.g, tB.g + 0.15));
float tbH = tA.r * 0.028 + tB.r * 0.005;
diffuseColor.rgb *= (0.55 + 0.75 * tA.b) * (0.8 + 0.4 * tB.b) * mix(0.35, 1.0, crack);
diffuseColor.rgb *= 1.0 - 0.8 * vHeat.y;`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = tbBump(-vViewPosition, normal, tbH);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
float pulse = 0.8 + 0.2 * sin(uT * 3.0 + vOP.y * 2.0);
float glowC = pow(1.0 - crack, 2.0);
totalEmissiveRadiance += vec3(1.0, 0.22, 0.03) * vHeat.x * (glowC * 4.0 + vHeat.x * vHeat.x * 0.28) * pulse;
totalEmissiveRadiance += vec3(1.0, 0.25, 0.03) * vHeat.y * (0.55 + glowC * 3.0 + tB.b * 0.5) * pulse;`);
  };
  mesh(g, m, parent);

  // Augen, Pupillen, Zähne
  const decal = (pts, lift) => {
    const geo = new THREE.BufferGeometry(); const pos = []; const idx = []; const n = pts.length; const rings = 4;
    let cu = 0; let cv = 0; for (const [a, b] of pts) { cu += a / n; cv += b / n; }
    const c = onSkin(cu, cv, lift); pos.push(c.x, c.y, c.z);
    for (let j = 1; j <= rings; j++) for (const [a, b] of pts) { const q = onSkin(lerp(cu, a, j / rings), lerp(cv, b, j / rings), lift); pos.push(q.x, q.y, q.z); }
    for (let i = 0; i < n; i++) {
      const k = (i + 1) % n; idx.push(0, 1 + i, 1 + k);
      for (let j = 0; j < rings - 1; j++) { const a = 1 + j * n + i; const b = 1 + j * n + k; idx.push(a, a + n, b + n, a, b + n, b); }
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  };
  const eyeM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff9418).multiplyScalar(1.5), side: THREE.DoubleSide });
  const pupilM = new THREE.MeshBasicMaterial({ color: 0x1a0603, side: THREE.DoubleSide });
  const pupils = []; const glows = [];
  for (const s of [1, -1]) {
    const pts = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; const u = Math.cos(a) * 0.135; const v = Math.sin(a) * 0.1; pts.push([s * (0.29 + u), 0.12 + Math.min(v, 0.022 + u * 0.36)]); }
    if (s < 0) pts.reverse();
    mesh(decal(pts, 0.075), eyeM, parent).castShadow = false;
    const pg = new THREE.Group(); parent.add(pg); pupils.push(pg);
    const c = onSkin(s * 0.28, 0.092, 0.15);
    mesh(new THREE.SphereGeometry(1, 18, 12), pupilM, pg, [c.x, c.y, c.z], [0, s * 0.25, 0], [0.11, 0.135, 0.06]).castShadow = false;
    mesh(new THREE.SphereGeometry(1, 10, 8), glowMat(0xfff2c0, 1.5), pg, [c.x + 0.04, c.y + 0.045, c.z + 0.05], null, 0.026).castShadow = false;
    const at = onSkin(s * 0.29, 0.11, 0.3); glows.push(glowSprite(parent, 0xff7a1a, 1.0, [at.x, at.y, at.z], 0.25));
  }
  const toothG = rbox(1, 1, 1, 0.26, 2); const toothM = std({ color: 0xf6e6c4, roughness: 0.4, emissive: 0x4a3018 });
  const teeth = new THREE.Group(); parent.add(teeth); const r = rng(4); const Z = V3(0, 0, 1);
  for (let i = 0; i < 8; i++) {
    const u = -0.36 + i * 0.103; const q = 1 - (u / 0.5) ** 2; const top = -0.27 + 0.42 * u * u; const bot = top - 0.27 * Math.pow(q, 0.7);
    for (const [v, h, skip] of [[top - 0.025, 0.22 + r() * 0.06, i === 4], [bot + 0.03, 0.15 + r() * 0.05, i === 0 || i === 7 || i === 2]]) {
      if (skip) continue; // Zahnlücken
      const at = onSkin(u, v, 0.17); const t = mesh(toothG, toothM, teeth, [at.x, at.y, at.z], null, [0.17 + r() * 0.03, h, 0.13]);
      t.quaternion.setFromUnitVectors(Z, V3(u, v * 0.4, 1).normalize()); t.rotateZ((r() - 0.5) * 0.25);
    }
  }
  bake(teeth);
  return { U, pupils, glows };
}

const CAP = { r: 2.28, sy: 0.72, y: 1.0, tilt: -0.17 };
function buildCap(parent) {
  const g = new THREE.Group(); g.position.y = CAP.y; g.rotation.x = CAP.tilt; parent.add(g);
  const cloth = canvasTex(512, 256, (c, w, h) => { c.fillStyle = '#202126'; c.fillRect(0, 0, w, h); const r = rng(6); for (let i = 0; i < 9000; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.2)'; c.fillRect(r() * w, r() * h, 2, 3); } c.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 6; i++) c.fillRect(i * w / 6, 0, 3, h); });
  const capM = std({ map: cloth, roughness: 0.85 });
  mesh(new THREE.SphereGeometry(CAP.r, 48, 18, 0, TAU, 0, Math.PI / 2), capM, g, [0, 0, 0], null, [1, CAP.sy, 1]);
  mesh(new THREE.CylinderGeometry(CAP.r * 1.003, CAP.r * 1.003, 0.17, 48, 1, true), capM, g);
  mesh(new THREE.SphereGeometry(0.17, 16, 10), capM, g, [0, CAP.r * CAP.sy + 0.02, 0], null, [1, 0.6, 1]);
  const pos = []; const idx = []; const nu = 30; const nv = 6;
  for (let layer = 0; layer < 2; layer++) for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu * 2 - 1; const v = j / nv; const a = u * 1.05; const r = CAP.r * 0.99 + v * 1.25 * Math.pow(Math.max(0, Math.cos(u * 1.35)), 0.55);
    pos.push(Math.sin(a) * r, (layer ? -0.07 : 0.04) + v * 0.1 - u * u * 0.3 * v, Math.cos(a) * r);
  }
  const L = (nu + 1) * (nv + 1);
  for (let layer = 0; layer < 2; layer++) for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = layer * L + j * (nu + 1) + i; const b = a + nu + 1; if (layer) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
  for (let i = 0; i < nu; i++) { const a = nv * (nu + 1) + i; idx.push(a, a + L, a + 1, a + 1, a + L, a + L + 1); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals();
  mesh(bg, std({ color: 0x111215, roughness: 0.6, side: THREE.DoubleSide }), g);
  const tag = canvasTex(1024, 300, (c, w, h) => {
    const gr = c.createLinearGradient(0, 30, 0, h - 20); gr.addColorStop(0, '#fff0a8'); gr.addColorStop(0.5, '#e2a93a'); gr.addColorStop(1, '#8a5a12');
    c.font = '900 250px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.fillStyle = gr; c.fillText('BRUNO', w / 2, h * 0.83);
  });
  const tg = new THREE.PlaneGeometry(1, 1, 24, 8); const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) { const a = tp.getX(i) * 1.15; const lat = 0.54 + tp.getY(i) * 0.48; tp.setXYZ(i, Math.sin(a) * Math.cos(lat) * (CAP.r + 0.03), Math.sin(lat) * (CAP.r + 0.03) * CAP.sy, Math.cos(a) * Math.cos(lat) * (CAP.r + 0.03)); }
  tg.computeVertexNormals();
  mesh(tg, std({ map: tag, transparent: true, alphaTest: 0.3, metalness: 0.3, roughness: 0.35, emissive: 0x2a1a04 }), g).castShadow = false;
  return g;
}
function buildChain(parent) {
  const g = new THREE.Group(); parent.add(g);
  const gold = std({ color: 0xf0bd52, metalness: 0.92, roughness: 0.2, emissive: 0x241300 }); const link = new THREE.TorusGeometry(0.2, 0.062, 8, 18); const Z = V3(0, 0, 1);
  const at = (a) => { const d = V3(Math.sin(a), -0.78 - 0.22 * Math.max(0, Math.cos(a)), Math.cos(a)).normalize(); return d.multiplyScalar(R * surface(d).r + 0.2); };
  const N = 40;
  for (let i = 0; i < N; i++) {
    const a = i / N * TAU; const p = at(a); const m = mesh(link, gold, g, [p.x, p.y, p.z], null, [1.35, 1, 1]);
    const along = at(a + 0.05).sub(p).normalize(); const out = p.clone().normalize(); out.addScaledVector(along, -out.dot(along)).normalize();
    if (i % 2) out.cross(along);
    m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, V3().crossVectors(out, along), out));
  }
  const p = at(0); p.y -= 0.36; p.z += 0.16;
  mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 28).rotateX(Math.PI / 2), std({ color: 0xf0bd52, metalness: 0.4, roughness: 0.25, emissive: 0x3a2000 }), g, [p.x, p.y, p.z], [-0.12, 0, 0]);
  mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 32), gold, g, [p.x, p.y + 0.01, p.z + 0.07], [-0.12, 0, 0]);
  bake(g);
  const b = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#7a4c08'; c.font = '900 210px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.fillText('B', w / 2, h * 0.8); });
  mesh(new THREE.PlaneGeometry(0.58, 0.58), std({ map: b, transparent: true, alphaTest: 0.3, roughness: 0.4 }), parent, [p.x, p.y + 0.012, p.z + 0.085], [-0.12, 0, 0]);
}

function buildEarth(scene) {
  const g = new THREE.Group(); g.position.set(-16.5, -18.5, -32); scene.add(g);
  const m = std({ map: earthTexture(), roughness: 0.65, emissive: 0x081a38, emissiveIntensity: 0.5, envMapIntensity: 0 });
  m.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <opaque_fragment>', 'float tbRim = pow(1.0 - max(dot(normal, normalize(vViewPosition)), 0.0), 3.0);\noutgoingLight += vec3(0.2, 0.5, 1.0) * tbRim * 1.3;\n#include <opaque_fragment>'); };
  const ball = mesh(new THREE.SphereGeometry(17, 80, 52), m, g, [0, 0, 0], [-0.85, -1.2, 0.15]); ball.castShadow = false; ball.receiveShadow = false;
  const air = new THREE.Mesh(new THREE.SphereGeometry(18.1, 64, 40), new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `varying vec3 vN; varying vec3 vV;
void main(){
  float k = smoothstep(0.0, 0.36, abs(dot(normalize(vN), normalize(vV))));
  gl_FragColor = vec4(vec3(0.16, 0.45, 1.0) * k * k * 0.8, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  }));
  g.add(air);
  return ball;
}

export function buildTitel({ renderer, shadows, low }) {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(300, 40, 24), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, depthWrite: false, toneMapped: false }));
  dome.renderOrder = -10; dome.rotation.y = 2.1; scene.add(dome);
  scene.environment = envFrom(renderer, { top: 0x1a2440, low: 0x182440, bottom: 0x17488c, lamps: [{ dir: V3(1, 1, 0.8), color: 0xfff0dc, k: 7 }, { dir: V3(-1, -1, 0.2), color: 0xff7a2a, k: 2 }] });
  scene.environmentIntensity = 0.7;
  scene.add(new THREE.HemisphereLight(0x5a78b8, 0x2a1a14, 0.45));
  sunLight(scene, { color: 0xfff0dc, power: 3.3, from: V3(6, 6.5, 8), size: 4.8, shadows });
  const back = new THREE.DirectionalLight(0x6fc0ff, 0.9); back.position.set(-6, -3, -5); scene.add(back);
  const fire = new THREE.PointLight(0xff7a1c, 16, 9, 1.6); fire.position.set(-3.3, -2.2, 1.2); scene.add(fire);
  const earth = buildEarth(scene);

  const rig = new THREE.Group(); scene.add(rig);
  const face = buildHead(rig); buildChain(rig); buildCap(rig); rig.updateMatrixWorld(true);

  // Astronauten mit Spitzhacken
  const capPoint = (az, lat) => {
    const c = Math.cos(lat); const n = V3(Math.sin(az) * c, Math.sin(lat) / CAP.sy, Math.cos(az) * c).normalize().applyAxisAngle(V3(1, 0, 0), CAP.tilt);
    const p = V3(Math.sin(az) * c * CAP.r, Math.sin(lat) * CAP.r * CAP.sy, Math.cos(az) * c * CAP.r).applyAxisAngle(V3(1, 0, 0), CAP.tilt); p.y += CAP.y; return { p, n };
  };
  const rockPoint = (x, y, z) => { const n = V3(x, y, z).normalize(); return { p: n.clone().multiplyScalar(R * surface(n).r), n }; };
  const spots = [
    { ...capPoint(-0.75, 0.92), fwd: V3(0.6, 0, 1), period: 1.5, off: 0 },
    { ...capPoint(0.85, 0.78), fwd: V3(-1, 0, 0.45), period: 1.75, off: 0.6 },
    { ...rockPoint(-0.97, 0.12, 0.22), fwd: V3(0.1, -0.2, 1), period: 1.3, off: 0.9 },
    { ...rockPoint(0.97, -0.14, 0.2), fwd: V3(-0.1, -0.2, 1), period: 1.9, off: 0.3 },
  ];
  const crew = spots.map((s, i) => {
    const A = buildAstronaut({ accent: ACCENTS[i], stripe: ACCENTS[i] }); const holder = new THREE.Group(); rig.add(holder); holder.add(A.root);
    holder.position.copy(s.p).addScaledVector(s.n, -0.02);
    const z = s.fwd.clone().addScaledVector(s.n, -s.fwd.dot(s.n)).normalize();
    holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V3().crossVectors(s.n, z), s.n, z)); holder.scale.setScalar(0.66);
    const pick = buildModel('Spitzhacke'); const grip = new THREE.Group(); grip.position.set(0.1, -0.3, 0.02); grip.rotation.set(2.84, 0, -0.1);
    const flip = new THREE.Group(); flip.rotation.y = Math.PI; flip.position.y = -0.12; flip.scale.setScalar(1.35); flip.add(pick.group); grip.add(flip); A.armR.lo.add(grip);
    A.legL.up.rotation.x = -0.28; A.legL.lo.rotation.x = 0.2; A.legR.up.rotation.x = 0.24; A.legR.lo.rotation.x = 0.1;
    return { A, holder, period: s.period, off: s.off, n: 0, hit: V3(0, 0.05, 1.05) };
  });

  // TS-1
  const ship = new THREE.Group(); scene.add(ship);
  const hull = buildModel('Raumschiff', { shadow: false }); hull.group.scale.setScalar(0.066); ship.add(hull.group);
  const engine = glowSprite(ship, 0xff8a3a, 0.9, [0, 0, 0.75], 0.8);

  // mitfliegende Brocken
  const rocks = []; const rr = rng(8); const rockG = new THREE.IcosahedronGeometry(1, 2);
  { const p = rockG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i); const k = 0.65 + fbm3(x * 2 + 4, y * 2, z * 2, 3) * 0.7; p.setXYZ(i, x * k, y * k, z * k); } rockG.computeVertexNormals(); }
  const rockM = std({ color: 0x66503f, roughness: 1, flatShading: true });
  for (let i = 0; i < 22; i++) { const a = rr() * TAU; const d = 3.5 + rr() * 4; const m = mesh(rockG, rockM, scene, [Math.cos(a) * d, Math.sin(a) * d * 0.7, -1 - rr() * 5], null, 0.07 + rr() * 0.2); rocks.push({ m, y: m.position.y, spin: 0.2 + rr() }); }

  const flame = particles(scene, low ? 380 : 760, { additive: true });
  const embers = particles(scene, 160, { additive: true });
  const chips = particles(scene, 260, { map: puffTex() });
  const sparks = particles(scene, 200, { additive: true });
  const w = V3(); const n = V3(); const side = V3(); let acc = 0;

  function update(t, dt) {
    face.U.uT.value = t;
    rig.rotation.y = -0.12 + Math.sin(t * 0.33) * 0.07; rig.rotation.x = Math.sin(t * 0.27) * 0.03; rig.rotation.z = 0.06 + Math.sin(t * 0.21) * 0.02; rig.position.y = Math.sin(t * 0.6) * 0.06;
    rig.updateMatrixWorld(true);
    const look = smooth(-0.3, 0.3, Math.sin(t * 0.55)); // mal zur Erde, mal zum Spieler
    for (const p of face.pupils) { p.position.x = -0.1 * look; p.position.y = -0.05 * look; }
    for (const g of face.glows) g.material.opacity = 0.22 + Math.sin(t * 3) * 0.07;
    for (const c of crew) {
      const raw = (t + c.off) / c.period; const i = Math.floor(raw); const k = raw - i;
      const up = k < 0.6 ? smooth(0.1, 0.56, k) : k < 0.7 ? 1 - smooth(0.6, 0.7, k) : 0; const A = c.A;
      A.torso.rotation.x = lerp(0.5, -0.15, up); A.pelvis.position.y = 0.68 + up * 0.04;
      for (const [arm, s] of [[A.armL, 1], [A.armR, -1]]) { arm.up.rotation.set(lerp(-1.0, -2.5, up), 0, s * -0.5); arm.lo.rotation.set(lerp(-0.2, -0.45, up), 0, 0); }
      A.head.rotation.x = -0.2;
      if (k >= 0.7 && c.n !== i + 1) {
        c.n = i + 1; w.copy(c.hit); c.holder.localToWorld(w); n.set(0, 1, 0).transformDirection(c.holder.matrixWorld);
        for (let q = 0; q < 14; q++) {
          side.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
          chips.emit(w.x, w.y, w.z, n.x + side.x * 2, n.y + side.y * 2, n.z + side.z * 2, { life: 0.8 + Math.random() * 0.6, size: 0.12, end: 0.3, alpha: 0.6, drag: 1.2, color: 0x9a7658 });
          sparks.emit(w.x, w.y, w.z, n.x * 2 + side.x * 4, n.y * 2 + side.y * 4, n.z * 2 + side.z * 4, { life: 0.4 + Math.random() * 0.4, size: 0.09, end: 0.02, color: 0xffb040, bright: 3, fadeIn: 0.01 });
        }
      }
    }
    ship.position.set(3.3 + Math.sin(t * 0.4) * 0.12, 2.85 + Math.sin(t * 0.7) * 0.1, -1.7); ship.rotation.set(0.12, -0.75 + Math.sin(t * 0.3) * 0.1, 0.12);
    engine.material.opacity = 0.65 + Math.sin(t * 19) * 0.2;
    for (const r of rocks) { r.m.rotation.set(t * r.spin, t * r.spin * 0.7, 0); r.m.position.y = r.y + Math.sin(t * 0.5 + r.spin * 5) * 0.12; }
    earth.rotation.y = -1.2 + t * 0.008;
    fire.intensity = 13 + Math.sin(t * 11) * 2;

    acc += dt * (low ? 110 : 230);
    while (acc >= 1) {
      // Glutbogen rund um die Silhouette, vorn (Richtung Erde) am heißesten, der Schweif zieht nach rechts oben weg
      acc -= 1; const a = Math.atan2(LEAD.y, LEAD.x) + (Math.random() + Math.random() + Math.random() - 1.5) * 1.9;
      n.set(Math.cos(a), Math.sin(a), -0.12 - Math.random() * 0.2).normalize();
      w.copy(n).multiplyScalar(R * 1.12); w.y += rig.position.y;
      const hot = Math.max(0, n.dot(LEAD));
      flame.emit(w.x, w.y, w.z, n.x * 0.6 + 2.2 + Math.random() * 2, n.y * 0.6 + 1.1 + Math.random() * 1.2, -0.9 - Math.random() * 0.6, { life: 0.8 + Math.random() * 1.2, size: 0.55 + hot * 0.5, end: 1.4, alpha: 0.24 + hot * 0.2, color: Math.random() < 0.25 ? 0xffc060 : hot > 0.6 ? 0xff7024 : 0xd8340e, bright: 1.5, fadeIn: 0.12 });
      if (Math.random() < 0.13) embers.emit(w.x, w.y, w.z, 1.5 + Math.random() * 3, 0.6 + Math.random() * 2, -0.5 - Math.random(), { life: 1 + Math.random(), size: 0.1, end: 0.02, color: 0xff9a30, bright: 2.5, fadeIn: 0.02 });
    }
    flame.step(dt); embers.step(dt); chips.step(dt); sparks.step(dt);
  }

  return { scene, update, exposure: 1.08, view: { pos: V3(0.4, 1.3, 12), at: V3(0.1, 0.46, 0), w: 6.2, h: 6.9 } };
}
