// Theos Seitenscheidel - Startbildschirm Trockne den Ozean aus (Lennox, 2026-11-21): Die Freunde stehen mit Eimer, Glas, Pumpe und Schlauch am fast leeren
// Pazifik, das Wasser schießt in den Tanklaster, der Wal liegt verdutzt in der letzten Pfütze. Vorn glitzert Theos Handy: Mama hat angerufen.
import * as THREE from './vendor/three.module.min.js';
import { V3, rng, smooth, lerp, clamp, fbm3, std, mesh, rbox, bake, tube, canvasTex, puffTex, dropTex, skyDome, envFrom, sunLight, particles, TAU } from './titelkit.js';
import { createBuddy } from './titelfigur.js';
import { buildModel, buildGull, phoneModel, LOOKS } from './ozeanart.js';

const LAKE = { x: 0.25, z: -0.75, rx: 4.1, rz: 2.35 };
const lakeE = (x, z) => { const dx = (x - LAKE.x) / LAKE.rx; const dz = (z - LAKE.z) / LAKE.rz; const a = Math.atan2(dz, dx); return Math.hypot(dx, dz) / (1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7 + 2.4)); };
function groundH(x, z) {
  const r = Math.hypot(x, z);
  const dune = r > 6 ? (fbm3(x * 0.07, 3.3, z * 0.07, 3) - 0.46) * 5 * smooth(6, 34, r) : 0;
  return -0.5 * (1 - smooth(0.55, 1.08, lakeE(x, z))) + dune;
}

// ---------------- Meeresboden ----------------
function crackTex() {
  const r = rng(63); const S = 512; const N = 6; const cell = S / N;
  const pts = Array.from({ length: N * N }, () => [0.15 + r() * 0.7, 0.15 + r() * 0.7, r()]);
  return canvasTex(S, S, (c) => {
    const img = c.createImageData(S, S); const d = img.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const cx = Math.floor(x / cell); const cy = Math.floor(y / cell); let f1 = 1e9; let f2 = 1e9; let tone = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const p = pts[((cy + j + N) % N) * N + ((cx + i + N) % N)];
        const q = Math.hypot((cx + i + p[0]) * cell - x, (cy + j + p[1]) * cell - y);
        if (q < f1) { f2 = f1; f1 = q; tone = p[2]; } else if (q < f2) f2 = q;
      }
      const e = f2 - f1; const n = fbm3(x * 0.06, y * 0.06, 1.5, 3); const crack = smooth(1.5, 4.5 + n * 3, e); const rim = smooth(4, 20, e);
      const v = (0.78 + tone * 0.14 + (n - 0.5) * 0.22) * (0.8 + rim * 0.2); const k = 0.5 + 0.5 * crack; const o = (y * S + x) * 4;
      d[o] = 242 * v * k; d[o + 1] = 190 * v * k; d[o + 2] = 128 * v * k * (0.85 + crack * 0.15); d[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }, { repeat: [1, 1] });
}
function buildGround(scene) {
  const NA = 120; const NR = 84; const pos = []; const uv = []; const col = []; const idx = []; const C = new THREE.Color();
  for (let j = 0; j <= NR; j++) {
    const rr = 170 * (Math.exp(5 * j / NR) - 1) / (Math.exp(5) - 1);
    for (let i = 0; i <= NA; i++) {
      const a = i / NA * TAU; const x = LAKE.x + Math.cos(a) * rr; const z = LAKE.z + Math.sin(a) * rr * (rr < 12 ? lerp(0.7, 1, rr / 12) : 1);
      pos.push(x, groundH(x, z), z); uv.push(x / 4.2, z / 4.2);
      const wet = 1 - smooth(1.0, 1.3, lakeE(x, z)); const n = fbm3(x * 0.12, 7.7, z * 0.12, 3);
      C.setRGB(1, 1, 1).lerp(new THREE.Color(0xd79a86), clamp((n - 0.55) * 2.2, 0, 0.5)).lerp(new THREE.Color(0x6a5c4c), wet * 0.85);
      col.push(C.r, C.g, C.b);
    }
  }
  for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) { const a = j * (NA + 1) + i; idx.push(a, a + 1, a + NA + 1, a + 1, a + NA + 2, a + NA + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const tex = crackTex();
  mesh(g, std({ map: tex, bumpMap: tex, bumpScale: 1.4, vertexColors: true, roughness: 0.92, envMapIntensity: 0.4 }), scene).castShadow = false;
}
function buildWater(scene, sun) {
  const N = 72; const M = 12; const pos = []; const edge = []; const idx = [];
  for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
    const a = i / N * TAU; const k = j / M * 1.04; const w = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 7 + 2.4);
    pos.push(LAKE.x + Math.cos(a) * LAKE.rx * k * w, -0.066, LAKE.z + Math.sin(a) * LAKE.rz * k * w); edge.push(k);
  }
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i; idx.push(a, a + 1, a + N + 1, a + 1, a + N + 2, a + N + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); g.setIndex(idx);
  const time = { value: 0 };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    uniforms: { uT: time, uSun: { value: sun.clone().normalize() } },
    vertexShader: 'attribute float aEdge; varying float vE; varying vec3 vP; void main(){ vE = aEdge; vP = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * viewMatrix * vec4(vP, 1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uSun; varying float vE; varying vec3 vP;
void main(){
  vec2 p = vP.xz;
  float dx = cos(p.x * 4.1 + p.y * 1.7 + uT * 2.1) * 0.06 + cos(p.x * 9.0 - p.y * 5.0 - uT * 3.4) * 0.04 + cos(p.x * 1.3 + uT * 1.2) * 0.03;
  float dz = cos(p.y * 5.3 - p.x * 1.1 + uT * 1.7) * 0.05 + cos(p.y * 10.0 + p.x * 4.0 + uT * 2.9) * 0.03;
  vec3 n = normalize(vec3(dx, 1.0, dz)); vec3 v = normalize(cameraPosition - vP); vec3 r = reflect(-v, n);
  vec3 c = mix(vec3(0.0, 0.1, 0.3), vec3(0.0, 0.42, 0.6), smoothstep(0.3, 1.0, vE));
  float fr = 0.03 + 0.4 * pow(1.0 - max(dot(v, n), 0.0), 4.0);
  c = mix(c, mix(vec3(0.3, 0.62, 0.9), vec3(0.04, 0.25, 0.7), smoothstep(0.0, 0.5, r.y)), fr);
  c += vec3(1.0, 0.96, 0.8) * pow(max(dot(r, uSun), 0.0), 120.0) * 2.5;
  float foam = smoothstep(0.9, 0.955, vE + sin(p.x * 7.0 + p.y * 5.0 + uT * 2.0) * 0.012) * (0.55 + 0.45 * sin(p.x * 23.0 - p.y * 17.0 + uT * 3.0));
  gl_FragColor = vec4(mix(c, vec3(0.95, 0.98, 1.0), clamp(foam, 0.0, 0.85)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  }));
  scene.add(m); return time;
}

// ---------------- Kulisse ----------------
function buildScenery(scene) {
  const r = rng(21); const g = new THREE.Group(); scene.add(g);
  const at = (x, z, up = 0) => [x, groundH(x, z) + up, z];
  const far = std({ color: 0xc99f7c, roughness: 1 });
  for (let i = 0; i < 26; i++) { // Tafelberge: früher Riffe
    const a = -Math.PI * (0.05 + 0.9 * (i / 25)); const d = 88 + r() * 45; const x = Math.cos(a) * d; const z = Math.sin(a) * d; const h = 1.5 + r() * 5.5; const w = 3 + r() * 8;
    const geo = new THREE.CylinderGeometry(w * 0.62, w, h, 14, 4); const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) { const vx = p.getX(k); const vy = p.getY(k); const vz = p.getZ(k); const n = 0.75 + fbm3(vx * 0.35 + i, vy * 0.4, vz * 0.35, 3) * 0.5; p.setXYZ(k, vx * n, vy, vz * n); }
    geo.computeVertexNormals(); mesh(geo, far, g, [x, groundH(x, z) + h * 0.35, z]).castShadow = false;
  }
  const wood = std({ color: 0x8a6244, roughness: 0.9 }); const white = std({ color: 0xf2efe6 }); const red = std({ color: 0xe0452c, roughness: 0.45 }); const dark = std({ color: 0x3a3f46, metalness: 0.5, roughness: 0.5 });
  // Steg auf viel zu langen Beinen
  const pier = new THREE.Group(); pier.position.set(8.5, 0, -11); pier.rotation.y = 0.5; g.add(pier);
  for (let i = 0; i < 9; i++) mesh(rbox(1.6, 0.1, 0.46, 0.03), wood, pier, [0, 3.0, i * 0.52]);
  for (let i = 0; i < 4; i++) for (const s of [-0.7, 0.7]) { mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.9, 8), wood, pier, [s, 1.1, i * 1.36]); mesh(rbox(0.06, 0.8, 0.06, 0.02), wood, pier, [s, 3.4, i * 1.36]); }
  // Schild
  mesh(rbox(0.14, 1.9, 0.14, 0.03), wood, g, at(1.9, -3.5, 0.9), [0, 0, 0.07]);
  const sign = canvasTex(512, 300, (c, w, h) => {
    c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, h); c.fillStyle = '#0a4f9c'; c.fillRect(14, 14, w - 28, h - 28); c.fillStyle = '#fff'; c.textAlign = 'center';
    c.font = '900 88px Bahnschrift, sans-serif'; c.fillText('PAZIFIK', w / 2, 128); c.font = '600 46px Bahnschrift, sans-serif'; c.fillText('(fast leer)', w / 2, 210);
  });
  mesh(new THREE.BoxGeometry(1.5, 0.88, 0.06), std({ map: sign }), g, at(1.88, -3.42, 1.8), [0, -0.1, 0.07]);
  // Wrack auf der Seite
  const hull = new THREE.Group(); hull.position.set(8, groundH(8, -44) + 0.5, -44); hull.scale.setScalar(0.9); hull.rotation.set(0.1, 0.5, 0.42); g.add(hull);
  const shape = new THREE.Shape([new THREE.Vector2(-3.6, 1.5), new THREE.Vector2(-2.8, -0.9), new THREE.Vector2(2.4, -0.9), new THREE.Vector2(4.4, 1.8), new THREE.Vector2(1.5, 1.4)]);
  mesh(new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.3, bevelSegments: 2 }), std({ color: 0x7a4632, roughness: 0.8 }), hull, [0, 0, -1.1]);
  mesh(rbox(1.8, 1.4, 1.5, 0.12), white, hull, [-1.6, 2.0, 0]); mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8), wood, hull, [1.2, 3.2, 0]);
  // Boje und Anker
  const buoy = new THREE.Group(); const bp = at(5.6, -2.9, 0.4); buoy.position.set(bp[0], bp[1], bp[2]); buoy.rotation.set(0.3, 0, 1.2); g.add(buoy);
  mesh(new THREE.CylinderGeometry(0.36, 0.5, 0.6, 16), red, buoy); mesh(new THREE.CylinderGeometry(0.2, 0.36, 0.5, 16), white, buoy, [0, 0.55, 0]); mesh(new THREE.ConeGeometry(0.2, 0.42, 16), red, buoy, [0, 1.0, 0]);
  const anchor = new THREE.Group(); const ap = at(5.2, -1.3, 0.22); anchor.position.set(ap[0], ap[1], ap[2]); anchor.rotation.set(-1.2, 0.5, 0.3); g.add(anchor);
  mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 10), dark, anchor); mesh(new THREE.TorusGeometry(0.45, 0.075, 8, 20, Math.PI), dark, anchor, [0, -0.2, 0], [0, 0, Math.PI]); mesh(new THREE.TorusGeometry(0.14, 0.045, 8, 16), dark, anchor, [0, 0.76, 0]);
  // Seesterne, Muscheln, Algen, Steine
  const star = new THREE.Shape();
  for (let i = 0; i <= 10; i++) { const a = i / 10 * TAU; const d = i % 2 ? 0.1 : 0.26; if (i) star.lineTo(Math.cos(a) * d, Math.sin(a) * d); else star.moveTo(d, 0); }
  const starG = new THREE.ExtrudeGeometry(star, { depth: 0.03, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.025, bevelSegments: 2 }).rotateX(-Math.PI / 2);
  const starM = [std({ color: 0xf0653c }), std({ color: 0xe84a78 }), std({ color: 0xf5a53a })];
  const shellG = new THREE.SphereGeometry(0.11, 10, 6, 0, TAU, 0, Math.PI / 2); const shellM = std({ color: 0xf6dccb, roughness: 0.4 });
  const rockG = new THREE.IcosahedronGeometry(1, 1); const rockM = std({ color: 0x9c8068, roughness: 1, flatShading: true }); const weedM = std({ color: 0x5f6e3a, roughness: 1 });
  for (let i = 0; i < 100; i++) {
    const x = -9 + r() * 18; const z = -9 + r() * 14; if (lakeE(x, z) < 1.12) continue;
    const t = r(); const y = groundH(x, z); const rot = [0, r() * TAU, 0]; const s = 0.7 + r() * 0.7;
    if (t < 0.14) mesh(starG, starM[Math.floor(r() * 3)], g, [x, y + 0.02, z], rot, s * 0.8);
    else if (t < 0.5) mesh(shellG, shellM, g, [x, y, z], rot, [s, s * 0.6, s * 0.8]);
    else if (t < 0.8) mesh(rockG, rockM, g, [x, y, z], rot, (0.07 + r() * 0.16) * (z < -3 ? 2.2 : 1));
    else for (let k = 0; k < 3; k++) mesh(new THREE.CylinderGeometry(0.01, 0.035, 0.6, 5).translate(0, 0.3, 0), weedM, g, [x + k * 0.07, y, z], [r() * 0.8 - 0.4, 0, 1 + r() * 0.5], s);
  }
  bake(g);
}

// ---------------- Wal mit Gesicht ----------------
function buildWhale(scene) {
  const g = new THREE.Group(); g.position.set(0.35, 0.36, -0.95); g.rotation.y = -0.36; scene.add(g);
  const inner = new THREE.Group(); inner.scale.setScalar(0.5); g.add(inner);
  const model = buildModel('Wal'); inner.add(model.group);
  const ball = new THREE.SphereGeometry(1, 22, 14); const eyes = []; const brows = [];
  const white = std({ color: 0xffffff, roughness: 0.2 }); const black = std({ color: 0x11151a, roughness: 0.2 }); const browM = std({ color: 0x163a5c });
  const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const s of [1, -1]) {
    const e = new THREE.Group(); e.position.set(4.35, 0.14, s * 0.99); e.rotation.y = s * 0.28; inner.add(e); eyes.push(e);
    mesh(ball, white, e, [0, 0, 0], null, [0.37, 0.43, 0.17]);
    const p = new THREE.Group(); p.position.z = s * 0.15; e.add(p); e.userData.p = p;
    mesh(ball, black, p, [0, 0, 0], null, [0.19, 0.22, 0.08]); mesh(ball, shine, p, [0.07, 0.09, s * 0.07], null, 0.06);
    brows.push(mesh(rbox(0.62, 0.13, 0.12, 0.06), browM, inner, [4.3, 0.75, s * 0.86], [0, s * 0.28, 0.22]));
    mesh(ball, black, inner, [5.35, -0.36, s * 0.66], [0, s * 0.75, 0], [0.2, 0.17, 0.08]);
  }
  const drop = new THREE.Group(); drop.position.set(3.5, 0.75, 0.9); inner.add(drop);
  const sweat = std({ color: 0x8fdcff, roughness: 0.1, emissive: 0x1a6a9a });
  mesh(ball, sweat, drop, [0, 0, 0], null, 0.15); mesh(new THREE.ConeGeometry(0.13, 0.3, 14), sweat, drop, [0, 0.17, 0]);
  return { g, inner, model, eyes, brows, drop };
}

// Strahl: Bogen mit laufenden Streifen
function buildStream(scene, a, top, b, r, tex) {
  const c = new THREE.QuadraticBezierCurve3(a, top, b); const t = tex.clone(); t.needsUpdate = true; t.repeat.set(3, 1);
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, 44, r, 10, false), new THREE.MeshStandardMaterial({ color: 0x9fe4ff, map: t, transparent: true, opacity: 0.9, roughness: 0.08, emissive: 0x0f5f90, emissiveIntensity: 0.5, depthWrite: false }));
  m.renderOrder = 3; scene.add(m); return { tex: t, curve: c };
}

export function buildTitel({ renderer, shadows, low }) {
  const scene = new THREE.Scene(); const sun = V3(0.5, 0.75, 0.5);
  scene.fog = new THREE.Fog(0xe9dfc4, 24, 135);
  scene.add(skyDome({ top: 0x04389c, mid: 0x1c7fd4, low: 0xeee4c8, bottom: 0xe9dfc4, radius: 300 }));
  scene.environment = envFrom(renderer, { top: 0x3c98dc, low: 0xdcefff, bottom: 0xd8b27a, lamps: [{ dir: sun, color: 0xfff3d0, k: 6 }] });
  scene.environmentIntensity = 0.5;
  scene.add(new THREE.HemisphereLight(0xbfe4ff, 0xd8a878, 0.65));
  sunLight(scene, { color: 0xfff0d0, power: 3.0, from: V3(5, 9, 6), size: 7.5, shadows });
  buildGround(scene); const waterT = buildWater(scene, sun); buildScenery(scene);

  const truck = buildModel('Tanklaster'); truck.group.position.set(-2.4, groundH(-2.4, -7.6), -7.6); truck.group.rotation.y = -0.32; truck.group.scale.setScalar(0.85); scene.add(truck.group); truck.group.updateMatrixWorld(true);
  const big = buildModel('XXXXL'); big.group.position.set(6.6, groundH(6.6, -8.8), -8.8); big.group.rotation.y = 1.0; big.group.scale.setScalar(0.5); scene.add(big.group);
  const krake = buildModel('Krake'); krake.group.position.set(3.0, groundH(3.0, -3.7), -3.7); krake.group.rotation.y = 0.2; krake.group.scale.setScalar(0.8); scene.add(krake.group);
  const turtle = buildModel('Schildkroete'); turtle.group.position.set(4.3, 0.12, 2.4); turtle.group.rotation.y = 0.9; turtle.group.scale.setScalar(0.55); scene.add(turtle.group);
  const whale = buildWhale(scene);
  const gulls = [0, 1, 2, 3].map(() => { const g = buildGull(); g.visible = true; g.scale.setScalar(0.85); scene.add(g); return g; });

  const phone = phoneModel(); phone.scale.setScalar(4.2); phone.position.set(1.65, 0.24, 2.35); phone.rotation.set(-0.8, -0.35, 0.12); scene.add(phone);
  phone.draw((x, w, h) => {
    const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1c4f9c'); gr.addColorStop(1, '#0d7c86'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.font = '700 34px Bahnschrift, sans-serif'; x.fillText('12:07', w / 2, 52);
    x.fillStyle = 'rgba(255,255,255,.92)'; x.fillRect(6, 78, w - 12, 100); x.fillStyle = '#c5161d'; x.font = '900 38px Bahnschrift, sans-serif'; x.fillText('MAMA', w / 2, 122);
    x.fillStyle = '#222'; x.font = '700 18px Bahnschrift, sans-serif'; x.fillText('37 verpasste', w / 2, 146); x.fillText('Anrufe', w / 2, 167);
  });

  const look = (name) => LOOKS.find((l) => l.name === name);
  // Blau pumpt
  const pump = buildModel('Handpumpe'); pump.group.position.set(-1.65, 0, 1.6); scene.add(pump.group);
  const lever = pump.parts.Handpumpe_Schwengel; const leverEnd = V3(); let far = 0; const v = V3();
  if (lever) lever.traverse((o) => { if (!o.isMesh) return; const p = o.geometry.attributes.position; for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).add(o.position); if (v.x < far) { far = v.x; leverEnd.copy(v); } } });
  const pumper = createBuddy(scene, look('Blau')).place(-1.65 + (lever ? lever.position.x : 0) + far - 0.4, 0, 1.6, Math.PI / 2);
  // Theo (Rot) schöpft mit dem Glas
  const theo = createBuddy(scene, look('Rot')).place(-0.15, 0, 1.95, 1.72);
  const glass = new THREE.Group(); theo.root.add(glass);
  mesh(new THREE.CylinderGeometry(0.1, 0.078, 0.27, 20, 1, true), std({ color: 0xe8f8ff, transparent: true, opacity: 0.42, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 2 }), glass);
  const glassW = mesh(new THREE.CylinderGeometry(0.086, 0.074, 0.16, 18), std({ color: 0x2a9ee0, emissive: 0x0a4a80, roughness: 0.1 }), glass, [0, -0.05, 0]);
  // Gelb schleppt den Eimer
  const carrier = createBuddy(scene, look('Gelb')).place(3.4, 0, 0.95, -1.75);
  const bucket = new THREE.Group(); carrier.root.add(bucket);
  const bm = buildModel('Eimer'); bm.group.position.y = -0.46; bm.group.scale.setScalar(1.15); bucket.add(bm.group);
  // Grün hält den Schlauch
  const hoser = createBuddy(scene, look('Grün')).place(-4.05, groundH(-4.05, -1.3), -1.3, 2.3);
  const nozzle = new THREE.Group(); hoser.root.add(nozzle);
  mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.46, 14).rotateX(Math.PI / 2), std({ color: 0xd9a540, metalness: 0.8, roughness: 0.25 }), nozzle, [0, 0, 0.12]);
  hoser.root.updateMatrixWorld(true);
  const nozzleW = hoser.root.localToWorld(V3(0, 1.32, 0.72)); const hoseIn = hoser.root.localToWorld(V3(0, 1.08, 0.3));
  const hoseM = std({ color: 0xd8402c, roughness: 0.6 });
  tube([hoseIn, hoser.root.localToWorld(V3(0.1, 0.3, -0.2)), V3(-2.9, 0.06, 0.6), V3(-2.2, 0.06, 0.9), V3(-1.8, 0.25, 1.3), V3(-1.63, 0.35, 1.56)], 0.06, hoseM, scene, 50, 8);
  tube([V3(-1.6, 0.2, 1.56), V3(-1.2, 0.05, 1.2), V3(-0.9, 0.02, 0.8), V3(-0.7, -0.25, 0.1)], 0.06, std({ color: 0x23262a }), scene, 30, 8);

  const streak = canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, 0, w, h); const r = rng(8);
    for (let i = 0; i < 60; i++) { c.fillStyle = `rgba(255,255,255,${0.4 + r() * 0.6})`; c.fillRect(r() * w, r() * h, 10 + r() * 50, 2 + r() * 4); }
  }, { repeat: [1, 1] });
  const land = truck.group.localToWorld(V3(-1.2, 3.1, 0));
  const spoutA = big.group.localToWorld(V3(0, 0, 0)).add(V3(0, 3.0, 0.7));
  const streams = [
    buildStream(scene, nozzleW, V3(-3.2, 5.6, -4.0), land, 0.085, streak),
    buildStream(scene, spoutA, V3(9, 5.0, -8.2), V3(13, 0, -8.7), 0.16, streak),
    buildStream(scene, V3(-1.36, 0.8, 1.6), V3(-1.1, 0.85, 1.6), V3(-1.05, 0.02, 1.62), 0.03, streak),
  ];

  const drops = particles(scene, low ? 260 : 520, { map: dropTex() });
  const mist = particles(scene, 120, { map: puffTex() });
  const tmp = V3(); const t2 = V3(); const Y = V3(0, 1, 0); let acc = 0; let spoutT = 1;

  function pumpPose(t) {
    const F = pumper; const s = Math.sin(t * 3.6) * 0.5 + 0.5; const p = F.rest();
    if (lever) { lever.rotation.z = -0.62 + s * 0.62; lever.updateMatrixWorld(true); tmp.copy(leverEnd); lever.localToWorld(tmp); F.root.worldToLocal(tmp); } else tmp.set(0, 0.9, 0.4);
    p.hip.set(0, 0.78 - s * 0.09, -0.06); p.lean = 0.22 + s * 0.34; p.head.set(-0.1 - s * 0.1, -0.75, 0);
    p.foot.L.set(0.18, 0.092, 0.2); p.foot.R.set(-0.18, 0.092, -0.22);
    p.hand.L.set(tmp.x + 0.07, tmp.y + 0.02, tmp.z - 0.09); p.hand.R.set(tmp.x - 0.07, tmp.y + 0.02, tmp.z - 0.09);
    F.face(s > 0.6 ? 'grit' : 'o', 0.3, 0, 0.85); F.apply(t);
  }
  function theoPose(t) {
    const F = theo; const k = (t % 2.8) / 2.8; const up = smooth(0.3, 0.52, k) * (1 - smooth(0.82, 1, k)); const pour = smooth(0.56, 0.66, k) * (1 - smooth(0.76, 0.86, k));
    const p = F.rest();
    p.hip.set(0, 0.42, -0.05); p.lean = 0.6 - up * 0.55; p.twist = -up * 0.4; p.head.set(-0.22 + up * 0.1, -0.75 - up * 0.2, 0);
    p.foot.R.set(-0.15, 0.1, -0.43); p.knee.R.set(0, -1, 0.8); p.toe.R = 1.1; p.foot.L.set(0.18, 0.092, 0.32); p.knee.L.set(0.2, 1, 0.6);
    p.hand.L.set(0.2, 0.45 + up * 0.1, 0.36); p.hand.R.set(lerp(-0.12, -0.5, up), lerp(0.2, 1.22, up), lerp(0.62, 0.05, up));
    p.axis.R.set(0, 1, 0); p.pole.R.set(-1, -0.4, -0.2);
    F.face(up > 0.5 ? 'grin' : 'grit', up > 0.5 ? 0 : 0.35, 0); F.apply(t);
    tmp.set(0, 0.02, 0.11); F.hands.R.localToWorld(tmp); F.root.worldToLocal(tmp);
    glass.position.copy(tmp); glass.position.y += 0.07; glass.rotation.z = pour * 2.0; glassW.visible = k > 0.22 && k < 0.66;
    if (pour > 0.6) for (let i = 0; i < 2; i++) { t2.set(-0.1, 0.16, 0); glass.localToWorld(t2); drops.emit(t2.x, t2.y, t2.z, -0.4 - Math.random() * 0.4, 0.5, 0.3 + Math.random() * 0.4, { life: 1, size: 0.07, gravity: 7, color: 0x5fc8f4, alpha: 0.9, fadeIn: 0.01 }); }
  }
  function bucketPose(t) {
    const F = carrier; const k = ((t + 1.1) % 3.2) / 3.2; const lift = smooth(0.28, 0.5, k) * (1 - smooth(0.84, 1, k)); const thr = smooth(0.54, 0.64, k) * (1 - smooth(0.8, 0.95, k));
    const p = F.rest(); const tw = lift * 0.3 + thr * 1.25;
    p.hip.set(0, lerp(0.6, 0.79, lift), -0.05); p.lean = lerp(0.8, 0.1, lift); p.twist = tw * 0.7; p.head.set(-0.15, 0.55 - thr * 0.3, 0);
    p.foot.L.set(0.2, 0.092, 0.16); p.foot.R.set(-0.2, 0.092, -0.16);
    tmp.set(0, lerp(0.46, 0.98, lift) + thr * 0.2, lerp(0.56, 0.44, lift)); tmp.applyAxisAngle(Y, tw);
    t2.set(0.07, 0, 0).applyAxisAngle(Y, tw);
    p.hand.L.copy(tmp).add(t2); p.hand.R.copy(tmp).sub(t2);
    F.face(thr > 0.2 ? 'grin' : 'grit', thr > 0.2 ? 0 : 0.35); F.apply(t);
    bucket.position.copy(tmp).addScaledVector(t2.set(Math.sin(tw), 0, Math.cos(tw)), 0.06); bucket.rotation.set(-thr * 1.5, tw, 0, 'YXZ');
    if (k > 0.58 && k < 0.7) for (let i = 0; i < 7; i++) { t2.set((Math.random() - 0.5) * 0.2, -0.05, 0.12); bucket.localToWorld(t2); drops.emit(t2.x, t2.y, t2.z, 0.6 + Math.random(), 1.6 + Math.random() * 1.2, 1.2 + Math.random() * 1.4, { life: 1.1, size: 0.12, end: 0.06, gravity: 7, color: Math.random() < 0.3 ? 0xe8f8ff : 0x4fbce8, alpha: 0.9, fadeIn: 0.01 }); }
  }
  function hosePose(t) {
    const F = hoser; const p = F.rest(); const j = Math.sin(t * 23) * 0.012;
    p.hip.set(0, 0.76, 0); p.lean = -0.14; p.twist = -0.3; p.head.set(-0.1, -1.05, 0); p.foot.L.set(0.22, 0.092, 0.14); p.foot.R.set(-0.22, 0.092, -0.2);
    p.hand.L.set(0.07, 1.23 + j, 0.46); p.hand.R.set(-0.07, 1.12 + j, 0.33); p.axis.L.set(0, 0.4, 1); p.axis.R.set(0, 0.4, 1);
    F.face('grin', 0.15); F.apply(t);
    nozzle.position.set(0, 1.17 + j, 0.4); nozzle.rotation.x = -0.45;
  }
  function whalePose(t) {
    const W = whale; W.g.position.y = 0.36 + Math.sin(t * 1.1) * 0.03; W.g.rotation.x = 0.06 + Math.sin(t * 0.8) * 0.03; W.g.rotation.z = Math.sin(t * 0.9) * 0.015;
    const f = W.model.parts.Wal_Fluke; if (f) f.rotation.z = Math.sin(t * 1.7) * 0.22;
    const look = Math.sin(t * 0.75); const blink = (t % 4.3) < 0.15 ? 0.12 : 1;
    for (const e of W.eyes) { e.userData.p.position.x = look * 0.14; e.userData.p.position.y = -0.05 + Math.sin(t * 0.5) * 0.06; e.scale.y = blink; }
    for (const b of W.brows) b.position.y = 0.75 + Math.max(0, Math.sin(t * 1.2)) * 0.12;
    const s = (t * 0.45) % 1; W.drop.position.y = 0.8 - s * 0.5; W.drop.scale.setScalar(Math.sin(Math.min(1, s * 1.2) * Math.PI));
  }

  function update(t, dt) {
    waterT.value = t; pumpPose(t); theoPose(t); bucketPose(t); hosePose(t); whalePose(t);
    for (const s of streams) s.tex.offset.x = -t * 2.6;
    gulls.forEach((g, i) => { const a = t * 0.22 + i * 1.7; const x = 1.5 + Math.cos(a) * (3 + i * 1.3); const z = -12 - i + Math.sin(a) * 3; g.position.set(x, 5.0 + i * 0.6 + Math.sin(t + i) * 0.3, z); g.rotation.y = -a; g.flap(t * 0.7 + i); });
    krake.group.rotation.z = Math.sin(t * 2.2) * 0.05; turtle.group.position.x = 4.3 + Math.sin(t * 0.2) * 0.25;
    if (turtle.parts['Schildkröte_Flossen']) turtle.parts['Schildkröte_Flossen'].rotation.y = Math.sin(t * 2) * 0.2;
    acc += dt * (low ? 30 : 60);
    while (acc >= 1) {
      acc -= 1;
      drops.emit(land.x, land.y, land.z, (Math.random() - 0.5) * 1.4, 0.6 + Math.random(), (Math.random() - 0.2) * 1.2, { life: 1, size: 0.14, end: 0.06, gravity: 6, color: 0xbfeeff, alpha: 0.8, fadeIn: 0.01 });
      streams[0].curve.getPoint(Math.random(), tmp);
      drops.emit(tmp.x, tmp.y, tmp.z, (Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4, { life: 0.8, size: 0.06, gravity: 5, color: 0xd8f4ff, alpha: 0.7, fadeIn: 0.01 });
    }
    spoutT -= dt;
    if (spoutT <= 0.6) { // der Wal prustet nur noch ganz schwach
      tmp.set(3.4, 1.02, 0); whale.inner.localToWorld(tmp);
      if (Math.random() < dt * 30) { drops.emit(tmp.x, tmp.y, tmp.z, (Math.random() - 0.5) * 0.5, 1.3 + Math.random() * 0.7, (Math.random() - 0.5) * 0.5, { life: 0.8, size: 0.1, gravity: 5, color: 0xe8f8ff, alpha: 0.9, fadeIn: 0.01 }); mist.emit(tmp.x, tmp.y + 0.1, tmp.z, 0, 0.6, 0, { life: 1.2, size: 0.15, end: 0.55, alpha: 0.3, color: 0xffffff }); }
      if (spoutT <= 0) spoutT = 3.5;
    }
    drops.step(dt); mist.step(dt);
  }

  return { scene, update, exposure: 1.0, view: { pos: V3(0.98, 2.5, 11.0), at: V3(0.28, 1.25, 0.2), w: 7.7, h: 3.9 } };
}
