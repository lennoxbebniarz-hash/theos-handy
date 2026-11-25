// Theos Seitenscheidel - Startbildschirm Ludwig Zigaretti (Lennox, 2026-11-21): Ludwig, Rot, Gelb und Grün sitzen im Himmel auf der rauchenden Riesenzigarette.
// Zwei rauchen, zwei vapen, die Beine baumeln, unten zieht das Wolkenmeer vorbei. Hinten auf dem Filter: Taube Günther mit Krone (Easter Egg aus dem Spiel).
import * as THREE from './vendor/three.module.min.js';
import { V3, rng, smooth, lerp, fbm3, std, mesh, rbox, bake, canvasTex, glowSprite, puffTex, skyDome, envFrom, sunLight, particles, TAU } from './titelkit.js';
import { createBuddy } from './titelfigur.js';
import { PLAYER_LOOKS } from './casinofig.js';
import { LUDWIG_LOOK } from './ludwigart.js';

const R = 0.6; // Dicke der Riesenzigarette (Radius)
const X0 = -3.0; const FILTER = -1.5; const BURN = 2.55; const ASH = 2.72; const TIP = 3.22;
const look = (name) => PLAYER_LOOKS.find((l) => l.name === name);
const along = (r0, r1, len, seg = 48) => new THREE.CylinderGeometry(r1, r0, len, seg, 1, true, Math.PI).rotateZ(-Math.PI / 2); // liegt auf der x-Achse, Naht hinten

// ---------------- Wolkenmeer: Bildtafeln, von hinten nach vorn angelegt ----------------
function cloudAtlas() {
  return canvasTex(1024, 512, (c, w, h) => {
    const r = rng(404);
    for (let cell = 0; cell < 4; cell++) {
      const x0 = (cell % 2) * w / 2; const y0 = Math.floor(cell / 2) * h / 2; const cw = w / 2; const ch = h / 2; const blobs = [];
      for (let i = 0; i < 52; i++) {
        const u = r() * 2 - 1; const top = (1 - u * u) * (0.55 + r() * 0.45); const s = ch * (0.1 + 0.12 * (1 - Math.abs(u)) * (0.6 + r() * 0.6));
        blobs.push({ x: x0 + cw / 2 + u * cw * 0.34, y: y0 + ch * 0.76 - top * ch * 0.4 * r(), s, u });
      }
      blobs.sort((a, b) => b.y - a.y);
      for (const b of blobs) {
        const low = Math.min(1, Math.max(0, ((b.y - y0) / ch - 0.36) / 0.4));
        const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.s);
        const col = `${Math.round(255 - low * 92)},${Math.round(250 - low * 88)},${Math.round(242 - low * 30)}`;
        g.addColorStop(0, `rgba(${col},.95)`); g.addColorStop(0.62, `rgba(${col},.6)`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.s, 0, TAU); c.fill();
      }
    }
  });
}
function buildClouds(scene, low) {
  const r = rng(77); const list = [];
  const add = (x, y, z, w, speed) => list.push({ x, y, z, w, h: w * 0.5, cell: Math.floor(r() * 4), speed });
  for (let i = 0; i < (low ? 170 : 330); i++) { const z = -84 + Math.pow(r(), 0.8) * 82; add((r() - 0.5) * 150, -4.6 - r() * 2.4 + z * 0.015, z, 6 + r() * 8, 0.9 + r() * 0.5); }
  for (let i = 0; i < 22; i++) add((r() - 0.5) * 150, 5 + r() * 14, -45 - r() * 40, 8 + r() * 10, 0.7 + r() * 0.4);
  for (let i = 0; i < 16; i++) add((r() - 0.5) * 150, -3.9 - r(), -1.5 + r() * 3.5, 3.5 + r() * 3, 1.9 + r());
  list.sort((a, b) => a.z - b.z);
  const quad = new THREE.PlaneGeometry(1, 1); const g = new THREE.InstancedBufferGeometry();
  g.index = quad.index; g.setAttribute('position', quad.attributes.position); g.setAttribute('uv', quad.attributes.uv);
  g.setAttribute('aP', new THREE.InstancedBufferAttribute(new Float32Array(list.flatMap((q) => [q.x, q.y, q.z])), 3));
  g.setAttribute('aS', new THREE.InstancedBufferAttribute(new Float32Array(list.flatMap((q) => [q.w, q.h, q.cell, q.speed])), 4));
  g.instanceCount = list.length;
  const time = { value: 0 };
  const m = new THREE.Mesh(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMap: { value: cloudAtlas() }, uT: time, uHaze: { value: new THREE.Color(0xf6c4a8) } },
    vertexShader: `attribute vec3 aP; attribute vec4 aS; uniform float uT; varying vec2 vUv; varying float vA; varying float vH;
void main(){
  vec3 p = aP; p.x = mod(p.x + uT * aS.w + 75.0, 150.0) - 75.0;
  vec4 mv = modelViewMatrix * vec4(p, 1.0); mv.xy += position.xy * aS.xy;
  vUv = (uv + vec2(mod(aS.z, 2.0), floor(aS.z / 2.0))) * 0.5;
  vA = smoothstep(75.0, 66.0, abs(p.x)) * smoothstep(1.5, 6.0, -mv.z);
  vH = smoothstep(16.0, 95.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`,
    fragmentShader: `uniform sampler2D uMap; uniform vec3 uHaze; varying vec2 vUv; varying float vA; varying float vH;
void main(){
  vec4 t = texture2D(uMap, vUv); if (t.a < 0.004) discard;
  gl_FragColor = vec4(mix(t.rgb * 1.22, uHaze, vH * 0.7), t.a * vA);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
  }));
  m.frustumCulled = false; m.renderOrder = -2; scene.add(m);
  return time;
}

// ---------------- Riesenzigarette ----------------
function buildGiant(rig) {
  const r = rng(12); const fixed = new THREE.Group(); rig.add(fixed);
  const len = BURN - FILTER; const ppm = 1024 / (TAU * R);
  const paper = canvasTex(1024, Math.round(len * ppm), (c, w, h) => {
    c.fillStyle = '#f7f2e8'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 7) { c.fillStyle = `rgba(150,130,100,${0.05 + r() * 0.06})`; c.fillRect(0, y, w, 2); }
    for (let i = 0; i < 2600; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.5)' : 'rgba(120,100,70,.07)'; c.fillRect(r() * w, r() * h, 2, 2 + r() * 9); }
    const g = c.createLinearGradient(0, 0, 0, h * 0.09); g.addColorStop(0, 'rgba(60,30,10,.75)'); g.addColorStop(1, 'rgba(120,70,30,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h * 0.09);
    c.save(); c.translate(w * 0.574, h * 0.54); c.rotate(-Math.PI / 2);
    c.font = '700 74px "Sitka Banner", Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#9a5f1c'; c.fillText('LUDWIG ZIGARETTI', 0, 0, h * 0.86);
    c.fillRect(-h * 0.43, -50, h * 0.86, 4); c.fillRect(-h * 0.43, 44, h * 0.86, 4); c.restore();
  });
  mesh(along(R, R, len), std({ map: paper, roughness: 0.9 }), fixed, [(FILTER + BURN) / 2, 0, 0]);
  const cork = canvasTex(1024, 420, (c, w, h) => {
    c.fillStyle = '#d5924a'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 1700; i++) { const s = 2 + r() * 9; c.fillStyle = r() < 0.5 ? `rgba(255,222,150,${0.25 + r() * 0.4})` : `rgba(120,62,20,${0.15 + r() * 0.3})`; c.beginPath(); c.ellipse(r() * w, r() * h, s, s * (0.4 + r() * 0.6), r() * 3, 0, TAU); c.fill(); }
    c.fillStyle = '#e9c064'; c.fillRect(0, 10, w, 16); c.fillRect(0, 38, w, 8); c.fillStyle = 'rgba(90,50,20,.35)'; c.fillRect(0, 0, w, 5);
  });
  mesh(along(R + 0.012, R + 0.012, FILTER - X0), std({ map: cork, roughness: 0.65 }), fixed, [(X0 + FILTER) / 2, 0, 0]);
  const wad = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#eadbc0'; c.fillRect(0, 0, w, h); for (let i = 0; i < 2200; i++) { c.fillStyle = r() < 0.5 ? '#fff6e4' : '#cdb68e'; c.fillRect(r() * w, r() * h, 2, 2); } });
  mesh(new THREE.CircleGeometry(R + 0.012, 48), std({ map: wad, roughness: 1 }), fixed, [X0, 0, 0], [0, -Math.PI / 2, 0]);
  bake(fixed);

  // Glutring und Asche
  const cracks = (base, hot, n) => canvasTex(1024, 256, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h); c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      let x = r() * w; let y = r() * h; c.strokeStyle = hot[Math.floor(r() * hot.length)]; c.lineWidth = 1 + r() * 5; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 46; y += (r() - 0.5) * 34; c.lineTo(x, y); }
      c.stroke();
    }
  });
  const emberTex = cracks('#30100a', ['#ff5a14', '#ff8a20', '#ffd060', '#c8300c'], 520);
  const emberM = std({ color: 0x281008, map: emberTex, emissive: 0xffffff, emissiveMap: emberTex, emissiveIntensity: 1.6, roughness: 1 });
  mesh(along(R + 0.006, R * 0.99, ASH - BURN + 0.02), emberM, rig, [(BURN + ASH) / 2, 0, 0]);
  const ashG = new THREE.CylinderGeometry(0.3, 0.585, TIP - ASH, 72, 22, false, Math.PI).rotateZ(-Math.PI / 2); ashG.translate((ASH + TIP) / 2, 0, 0);
  const p = ashG.attributes.position; const col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i); const y = p.getY(i); const z = p.getZ(i); const u = Math.min(1, Math.max(0, (x - ASH) / (TIP - ASH)));
    const n = fbm3(x * 5, y * 5, z * 5, 4); const bulge = Math.sqrt(Math.max(0, 1 - u * u * 0.75)) / Math.max(0.4, 1 - u * 0.49);
    const k = bulge * (1 + (n - 0.5) * 0.5 * Math.min(1, u * 4 + 0.15));
    p.setXYZ(i, x + (n - 0.5) * 0.16 * u, y * k, z * k);
    const v = Math.max(0.015, -0.04 + n * 0.3 + (fbm3(x * 16, y * 16, z * 16, 2) - 0.5) * 0.3); col.push(v, v * 0.97, v * 0.95);
  }
  ashG.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ashG.computeVertexNormals();
  const ashM = std({ vertexColors: true, roughness: 1, emissive: 0xffffff, emissiveMap: cracks('#000', ['#ff5a14', '#ff8a20', '#7a1c08'], 120), emissiveIntensity: 1.3 });
  mesh(ashG, ashM, rig);
  const halo = glowSprite(rig, 0xff6a1e, 2.6, [ASH, 0, 0.3], 0.45);
  const light = new THREE.PointLight(0xff6a22, 5, 4.5, 1.6); light.position.set(ASH - 0.1, 0.5, 1.0); rig.add(light);
  return { emberM, ashM, halo, light };
}

function buildPigeon(parent) {
  const g = new THREE.Group(); parent.add(g); const ball = new THREE.SphereGeometry(1, 18, 12);
  const grey = std({ color: 0x8d96a3 }); const dark = std({ color: 0x555d68 }); const gold = std({ color: 0xf0c050, metalness: 0.9, roughness: 0.2 }); const pink = std({ color: 0xe0788a });
  const body = new THREE.Group(); g.add(body);
  mesh(ball, grey, body, [0, 0.21, 0], [-0.2, 0, 0], [0.17, 0.15, 0.25]);
  for (const s of [-1, 1]) { mesh(ball, dark, body, [s * 0.13, 0.22, -0.05], [-0.25, 0, 0], [0.06, 0.11, 0.21]); mesh(ball, pink, body, [s * 0.06, 0.03, 0.06], null, [0.03, 0.05, 0.05]); }
  mesh(rbox(0.16, 0.025, 0.2, 0.01), dark, body, [0, 0.2, -0.28], [0.25, 0, 0]);
  mesh(ball, std({ color: 0x3f8f78, metalness: 0.6, roughness: 0.3 }), body, [0, 0.32, 0.14], null, [0.1, 0.11, 0.1]);
  bake(body);
  const head = new THREE.Group(); head.position.set(0, 0.43, 0.17); g.add(head);
  mesh(ball, grey, head, [0, 0, 0], null, 0.095);
  mesh(new THREE.ConeGeometry(0.03, 0.08, 8).rotateX(Math.PI / 2), std({ color: 0xe8b068 }), head, [0, -0.015, 0.11]);
  for (const s of [-1, 1]) { mesh(ball, std({ color: 0xff8a2a }), head, [s * 0.07, 0.02, 0.05], null, 0.026); mesh(ball, std({ color: 0x111111 }), head, [s * 0.084, 0.022, 0.06], null, 0.015); }
  mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.045, 12, 1, true), gold, head, [0, 0.1, 0]);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mesh(new THREE.ConeGeometry(0.022, 0.06, 6), gold, head, [Math.sin(a) * 0.072, 0.145, Math.cos(a) * 0.072]); }
  bake(head);
  return { g, head };
}

// Kippe oder Vape: Mundstück im Ursprung, zeigt nach +z
function buildHeld(parent, kind, color) {
  const g = new THREE.Group(); parent.add(g); let lampM;
  if (kind === 'kippe') {
    lampM = std({ color: 0x401008, emissive: 0xff5a18, emissiveIntensity: 1.5 });
    const rod = new THREE.CylinderGeometry(0.026, 0.026, 1, 14).rotateX(Math.PI / 2);
    mesh(rod, std({ color: 0xd5924a }), g, [0, 0, 0.045], null, [1, 1, 0.09]);
    mesh(rod, std({ color: 0xf7f2e8 }), g, [0, 0, 0.18], null, [1, 1, 0.18]);
    mesh(rod, lampM, g, [0, 0, 0.28], null, [1, 1, 0.025]);
  } else {
    lampM = std({ color: 0x103040, emissive: color, emissiveIntensity: 1 });
    mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.07, 12).rotateX(Math.PI / 2), std({ color: 0x18191c }), g, [0, 0, 0.035]);
    mesh(rbox(0.12, 0.075, 0.25, 0.028), std({ color, metalness: 0.5, roughness: 0.25 }), g, [0, 0, 0.19]);
    mesh(rbox(0.06, 0.01, 0.1, 0.004), lampM, g, [0, 0.041, 0.2]);
  }
  if (kind === 'kippe') g.scale.setScalar(1.45);
  return { g, lampM };
}

export function buildTitel({ renderer, shadows, low }) {
  const scene = new THREE.Scene();
  const sunDir = V3(0.42, 0.1, -1).normalize();
  scene.add(skyDome({ top: 0x0b3486, mid: 0x2f78cc, low: 0xffab70, bottom: 0x9a86c0, sun: sunDir, sunColor: 0xffd9a0, sunGlow: 0.42 }));
  scene.environment = envFrom(renderer, { top: 0x3f7fd0, low: 0xffcfa0, bottom: 0xc8b4d8, lamps: [{ dir: sunDir, color: 0xffd9a0, k: 5 }] });
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0xbcdcff, 0xe8a890, 0.9));
  sunLight(scene, { color: 0xfff0d8, power: 2.5, from: V3(4, 7, 7.5), size: 4.5, shadows });
  const rim = new THREE.DirectionalLight(0xff9a50, 1.5); rim.position.set(4, 2, -8); scene.add(rim);
  const cloudT = buildClouds(scene, low);

  const rig = new THREE.Group(); scene.add(rig);
  const giant = buildGiant(rig);
  const pigeon = buildPigeon(rig); pigeon.g.position.set(-2.72, R, -0.05); pigeon.g.rotation.y = 0.7;

  const smoke = particles(scene, low ? 240 : 480, { map: puffTex() });
  const sparks = particles(scene, 90, { additive: true });

  const ludwig = { ...LUDWIG_LOOK, capText: 'BOSS' };
  const cast = [
    { look: look('Rot'), x: -1.98, kind: 'kippe', off: 2.2, yaw: 0.16, face: 'smile' },
    { look: ludwig, x: -0.66, kind: 'kippe', off: 0.2, yaw: 0.04, face: 'grin', boss: true },
    { look: look('Gelb'), x: 0.68, kind: 'vape', color: 0xffb13a, puff: 0xfff0d6, off: 4.4, yaw: -0.06, face: 'smile' },
    { look: look('Grün'), x: 1.95, kind: 'vape', color: 0x35d6a0, puff: 0xdffff2, off: 1.2, yaw: -0.16, face: 'grin', wave: true },
  ].map((c) => {
    const F = createBuddy(rig, c.look); F.place(c.x, 0, 0, c.yaw);
    return { ...c, F, held: buildHeld(F.root, c.kind, c.color), acc: 0 };
  });

  const tip = V3(); const mouth = V3(); const dir = V3(); const from = V3(); const DOWN = V3(); const AT = V3(); const FRONT = V3(0, 0, 1); const w = V3();
  let smokeAcc = 0; let sparkAcc = 0;

  function person(c, t, dt) {
    const F = c.F; const p = F.rest(); const k = ((t + c.off) % 6.6) / 6.6; const up = smooth(0.02, 0.15, k) * (1 - smooth(0.36, 0.48, k));
    const inhale = k > 0.15 && k < 0.36; const exhale = k > 0.5 && k < 0.7;
    const sway = Math.sin(t * 1.1 + c.x) * 0.035;
    p.hip.set(0, R + 0.11, 0.06); p.lean = (exhale ? -0.12 : -0.03) + up * 0.05; p.roll = sway;
    p.head.set(exhale ? -0.22 : up * 0.06, Math.sin(t * 0.43 + c.off) * 0.3 * (1 - up), -sway * 1.5);
    for (const [key, s] of [['L', 1], ['R', -1]]) {
      const sw = Math.sin(t * 2.3 + c.x * 1.7 + (s > 0 ? 0 : 2.2));
      p.foot[key].set(s * 0.17, 0.35 + sw * 0.035, 0.64 + sw * 0.075); p.knee[key].set(0, 1, 0.35); p.toe[key] = 0.35 - sw * 0.2;
    }
    p.hand.L.set(0.42, 0.645, -0.02); p.pole.L.set(0.7, 0, -0.7);
    if (c.wave) { const h = smooth(0.74, 0.8, k) * (1 - smooth(0.94, 1, k)); p.hand.L.lerp(AT.set(0.52 + Math.sin(t * 11) * 0.09, 1.66, 0.14), h); p.pole.L.lerp(AT.set(1, -0.5, 0), h); }
    p.hand.R.set(lerp(-0.3, -0.17, up), lerp(0.93, 1.33, up) + Math.sin(up * Math.PI) * 0.05, lerp(0.4, 0.36, up));
    p.pole.R.set(-0.7, -0.7, -0.1); p.axis.R.set(0.6, 0.5, 0);
    const base = c.boss || c.wave ? 'grin' : c.face;
    F.face(exhale || inhale ? 'o' : base, c.boss ? 0.14 : 0, exhale ? 0.6 : 0, inhale ? 0.5 : exhale ? 0.75 : 1);
    F.look(Math.sin(t * 0.37 + c.off) * 0.7, 0);
    F.apply(t); F.root.updateMatrixWorld(true);

    const g = c.held.g; tip.set(0, 0.02, 0.1); F.root.worldToLocal(F.hands.R.localToWorld(tip));
    F.mouthWorld(mouth); F.root.worldToLocal(mouth); mouth.z -= 0.02;
    if (c.kind === 'kippe') { from.copy(tip).add(AT.set(0, 0.01, -0.07)); DOWN.set(-0.15, 0.4, 1); dir.copy(DOWN).lerp(AT.set(-0.22, -0.08, 1), up); } else { from.copy(tip).add(AT.set(0.01, 0.17, -0.04)); DOWN.set(0, -1, 0.25); dir.copy(DOWN).lerp(AT.set(-0.35, -0.7, 0.5), up); }
    g.position.copy(from).lerp(mouth, smooth(0.55, 1, up)); g.quaternion.setFromUnitVectors(FRONT, dir.normalize());
    c.held.lampM.emissiveIntensity = inhale ? 4 + Math.sin(t * 24) * 0.6 : 1.1;

    if (exhale) {
      c.acc += dt * (c.kind === 'vape' ? 30 : 16); F.mouthWorld(w);
      while (c.acc >= 1) {
        c.acc -= 1;
        if (c.kind === 'vape') smoke.emit(w.x, w.y, w.z, 0.65 + Math.random() * 0.35, 0.3 + Math.random() * 0.2, 0.45 + Math.random() * 0.3, { life: 2.2 + Math.random(), size: 0.12, end: 1.05, alpha: 0.4, drag: 1.1, gravity: -0.22, color: c.puff, spin: 0.4 });
        else smoke.emit(w.x, w.y, w.z, 0.55 + Math.random() * 0.25, 0.3 + Math.random() * 0.15, 0.4 + Math.random() * 0.2, { life: 2 + Math.random(), size: 0.08, end: 0.62, alpha: 0.36, drag: 1, gravity: -0.3, color: 0xe4e2ea, spin: 0.5 });
      }
    } else c.acc = 0;
  }

  function update(t, dt) {
    cloudT.value = t;
    rig.position.y = Math.sin(t * 0.8) * 0.09; rig.rotation.z = 0.045 + Math.sin(t * 0.5) * 0.018; rig.updateMatrixWorld(true);
    for (const c of cast) person(c, t, dt);
    const f = 0.8 + Math.sin(t * 7.1) * 0.1 + Math.sin(t * 13.3) * 0.08;
    giant.emberM.emissiveIntensity = 1.7 * f; giant.ashM.emissiveIntensity = 1.4 * f; giant.light.intensity = 5 * f; giant.halo.material.opacity = 0.42 * f;
    pigeon.head.rotation.y = Math.sin(t * 0.9) * 0.8; pigeon.head.position.z = 0.17 + Math.max(0, Math.sin(t * 5)) * 0.03;
    smokeAcc += dt * (low ? 7 : 12); sparkAcc += dt * 14;
    while (smokeAcc >= 1) {
      smokeAcc -= 1; w.set(TIP - 0.05, 0.3 + Math.random() * 0.15, (Math.random() - 0.5) * 0.3); rig.localToWorld(w);
      smoke.emit(w.x, w.y, w.z, -0.12 + Math.random() * 0.22, 0.8 + Math.random() * 0.4, -0.25 - Math.random() * 0.2, { life: 4.2 + Math.random() * 2, size: 0.4, end: 2.1, alpha: 0.46, color: 0xb9b3c4, gravity: -0.08, spin: 0.25 });
    }
    while (sparkAcc >= 1) {
      sparkAcc -= 1; w.set(ASH + Math.random() * 0.3, (Math.random() - 0.3) * 0.6, 0.35); rig.localToWorld(w);
      sparks.emit(w.x, w.y, w.z, 0.7 + Math.random(), 0.3 + Math.random() * 0.8, (Math.random() - 0.4) * 0.5, { life: 1 + Math.random(), size: 0.09, end: 0.02, color: 0xff8a2a, bright: 2, fadeIn: 0.02 });
    }
    smoke.step(dt); sparks.step(dt);
  }

  return { scene, update, exposure: 1.02, view: { pos: V3(2.2, 1.0, 10.5), at: V3(0.3, 0.98, 0.1), w: 6.6, h: 3.3 } };
}
