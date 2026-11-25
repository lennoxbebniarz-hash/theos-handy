// Theos Seitenscheidel - Big Bruno: Effekte beim Abbauen. Brocken (Fels, Eissplitter, Goldnuggets) fliegen mit Schwerkraft zur Mitte,
// prallen am Fels ab und bleiben liegen, heiße Brocken glühen nach. Funken als Leuchtstriche, Staubwolken, Feuerbälle, Druckwellen,
// Lichtblitze, grüne Zielklammern der Drohnen, Strahlen (Laser, Drohnen, Orbit) und das Schwarze Loch.
import * as THREE from './vendor/three.module.min.js';
import { glowTexture, flareTexture, fireTexture, smokeTexture, ringTexture, bracketTexture } from './brunotex.js';
import { rockGeo, shardGeo, nuggetGeo, MATS_FX } from './brunoart.js';
import { MAT_COL } from './brunomesh.js';

const GRAV = 3.4; const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SPARK = [[1.0, 0.82, 0.5], [0.6, 0.85, 1.0], [1.0, 0.5, 0.25], [1.0, 0.8, 0.3], [0.8, 0.5, 1.0]];

export function createFx(scene, A) {
  const F = { rock: null, t: 0 }; const _n = { x: 0, y: 1, z: 0 }; const _v = V3(); const _p = V3(); const m4 = new THREE.Matrix4(); const q = new THREE.Quaternion(); const sc = V3(); const col = new THREE.Color(); const ZERO = new THREE.Matrix4().makeScale(0, 0, 0); const Yv = V3(0, 1, 0); const Zv = V3(0, 0, 1);
  // ---------- Brocken ----------
  const pool = (geo, mat, n, hot) => {
    if (hot) { geo.setAttribute('aHeat', new THREE.InstancedBufferAttribute(new Float32Array(n), 1)); mat.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aHeat; varying float vHeat;').replace('#include <fog_vertex>', '#include <fog_vertex>\nvHeat = aHeat;'); s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vHeat;').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.3, 0.05) * vHeat * 3.2 + vec3(1.0, 0.8, 0.45) * vHeat * vHeat * vHeat * 2.0;'); }; }
    const im = new THREE.InstancedMesh(geo, mat, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; for (let i = 0; i < n; i++) { im.setMatrixAt(i, ZERO); im.setColorAt(i, col.setRGB(1, 1, 1)); } scene.add(im);
    return { im, n, i: 0, hot, live: 0, a: Array.from({ length: n }, () => ({ on: false, rest: false, p: V3(), v: V3(), e: new THREE.Euler(), w: V3(), s: V3(1, 1, 1), size: 0.1, t: 0, life: 4, heat: 0 })) };
  };
  const P = { rock: pool(rockGeo(2), MATS_FX.rock(), 520, true), ice: pool(shardGeo(), MATS_FX.ice(), 170, false), gold: pool(nuggetGeo(), MATS_FX.gold(), 170, false) };
  // kind 'rock' | 'ice' | 'gold'; p Ort, n Richtung, o: { count, speed, size, heat, color [r,g,b], spread, life, up }
  F.chunks = (kind, p, n, o = {}) => {
    const L = P[kind]; const cnt = o.count || 6; const speed = o.speed || 4; const size = o.size || 0.12; const spread = o.spread === undefined ? 1.3 : o.spread;
    for (let k = 0; k < cnt; k++) { const c = L.a[L.i]; const idx = L.i; L.i = (L.i + 1) % L.n; c.on = true; c.rest = false; c.p.copy(p); if (o.jitter) c.p.x += (Math.random() - 0.5) * o.jitter, c.p.y += (Math.random() - 0.5) * o.jitter, c.p.z += (Math.random() - 0.5) * o.jitter;
      c.v.set(n.x + (Math.random() - 0.5) * spread, n.y + (Math.random() - 0.5) * spread, n.z + (Math.random() - 0.5) * spread).normalize().multiplyScalar(speed * (0.35 + Math.random() * 0.9)); c.w.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12); c.e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      const s = size * (0.45 + Math.random() * 1.1); c.size = s; if (kind === 'ice') c.s.set(s * 0.45, s * 0.9, s * 0.45); else c.s.set(s * (0.8 + Math.random() * 0.5), s * (0.7 + Math.random() * 0.5), s); c.t = 0; c.life = (o.life || 5) * (0.7 + Math.random() * 0.6); c.heat = o.heat || 0;
      if (kind === 'rock') { const b = o.color || MAT_COL[0]; const sh = 0.7 + Math.random() * 0.5; L.im.setColorAt(idx, col.setRGB(b[0] * sh, b[1] * sh, b[2] * sh)); } }
    if (kind === 'rock') L.im.instanceColor.needsUpdate = true;
  };
  function stepChunks(dt) {
    for (const L of Object.values(P)) { let any = false; const heatA = L.hot ? L.im.geometry.attributes.aHeat : null;
      for (let i = 0; i < L.n; i++) { const c = L.a[i]; if (!c.on) continue; any = true; c.t += dt;
        if (c.t > c.life) { c.on = false; L.im.setMatrixAt(i, ZERO); if (heatA) heatA.array[i] = 0; continue; }
        if (!c.rest) { const l = c.p.length() || 1; c.v.addScaledVector(c.p, -GRAV * dt / l); c.p.addScaledVector(c.v, dt); c.e.x += c.w.x * dt; c.e.y += c.w.y * dt; c.e.z += c.w.z * dt;
          if (c.t > 0.06) { const d = A.dist(c.p.x, c.p.y, c.p.z); const rr = c.size * 0.42; if (d < rr) { A.normal(c.p.x, c.p.y, c.p.z, _n); const vn = c.v.x * _n.x + c.v.y * _n.y + c.v.z * _n.z; if (vn < 0) { c.v.x -= 1.4 * vn * _n.x; c.v.y -= 1.4 * vn * _n.y; c.v.z -= 1.4 * vn * _n.z; c.v.multiplyScalar(0.68); c.w.multiplyScalar(0.6); } const push = Math.min(0.6, rr - d); c.p.x += _n.x * push; c.p.y += _n.y * push; c.p.z += _n.z * push; if (c.v.lengthSq() < 0.35) c.rest = true; } }
          if (l > 140) c.t = c.life; }
        if (c.heat > 0) c.heat = Math.max(0, c.heat - dt * 0.28); if (heatA) heatA.array[i] = c.heat;
        const k = Math.min(1, (c.life - c.t) * 2.2) * Math.min(1, c.t * 30 + 0.3); q.setFromEuler(c.e); sc.copy(c.s).multiplyScalar(k); m4.compose(c.p, q, sc); L.im.setMatrixAt(i, m4); }
      if (any || L.live) { L.im.instanceMatrix.needsUpdate = true; if (heatA) heatA.needsUpdate = true; } L.live = any; }
  }
  // ---------- Funken: Leuchtstriche ----------
  const SN = 800; const sPos = new Float32Array(SN * 6); const sCol = new Float32Array(SN * 6); const sp = { p: new Float32Array(SN * 3), v: new Float32Array(SN * 3), c: new Float32Array(SN * 3), t: new Float32Array(SN), life: new Float32Array(SN).fill(0), i: 0, live: false };
  const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3).setUsage(THREE.DynamicDrawUsage)); sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3).setUsage(THREE.DynamicDrawUsage));
  const sparks = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false })); sparks.frustumCulled = false; sparks.renderOrder = 4; scene.add(sparks);
  // color: Index in SPARK oder [r,g,b]
  F.sparks = (p, n, color = 0, count = 8, speed = 6, life = 0.5, spread = 1.6) => { const c = Array.isArray(color) ? color : SPARK[color]; for (let k = 0; k < count; k++) { const i = sp.i; sp.i = (sp.i + 1) % SN; sp.p[i * 3] = p.x; sp.p[i * 3 + 1] = p.y; sp.p[i * 3 + 2] = p.z; _v.set(n.x + (Math.random() - 0.5) * spread, n.y + (Math.random() - 0.5) * spread, n.z + (Math.random() - 0.5) * spread).normalize().multiplyScalar(speed * (0.3 + Math.random())); sp.v[i * 3] = _v.x; sp.v[i * 3 + 1] = _v.y; sp.v[i * 3 + 2] = _v.z; sp.c[i * 3] = c[0]; sp.c[i * 3 + 1] = c[1]; sp.c[i * 3 + 2] = c[2]; sp.t[i] = 0; sp.life[i] = life * (0.5 + Math.random()); } sp.live = true; };
  function stepSparks(dt) {
    if (!sp.live) return; let any = false;
    for (let i = 0; i < SN; i++) { const o = i * 6; const a = i * 3; if (sp.life[i] <= 0) continue; sp.t[i] += dt; if (sp.t[i] >= sp.life[i]) { sp.life[i] = 0; sPos[o] = sPos[o + 1] = sPos[o + 2] = sPos[o + 3] = sPos[o + 4] = sPos[o + 5] = 0; continue; } any = true;
      const px = sp.p[a]; const py = sp.p[a + 1]; const pz = sp.p[a + 2]; const l = Math.hypot(px, py, pz) || 1; const g = GRAV * 0.8 * dt / l; sp.v[a] -= px * g; sp.v[a + 1] -= py * g; sp.v[a + 2] -= pz * g; const dm = 1 - dt * 1.1; sp.v[a] *= dm; sp.v[a + 1] *= dm; sp.v[a + 2] *= dm;
      sp.p[a] += sp.v[a] * dt; sp.p[a + 1] += sp.v[a + 1] * dt; sp.p[a + 2] += sp.v[a + 2] * dt; const k = 1 - sp.t[i] / sp.life[i]; const tl = 0.05;
      sPos[o] = sp.p[a]; sPos[o + 1] = sp.p[a + 1]; sPos[o + 2] = sp.p[a + 2]; sPos[o + 3] = sp.p[a] - sp.v[a] * tl; sPos[o + 4] = sp.p[a + 1] - sp.v[a + 1] * tl; sPos[o + 5] = sp.p[a + 2] - sp.v[a + 2] * tl;
      const b = k * 3.2; sCol[o] = sp.c[a] * b; sCol[o + 1] = sp.c[a + 1] * b; sCol[o + 2] = sp.c[a + 2] * b; sCol[o + 3] = sp.c[a] * k * 0.25; sCol[o + 4] = sp.c[a + 1] * k * 0.25; sCol[o + 5] = sp.c[a + 2] * k * 0.25; }
    sGeo.attributes.position.needsUpdate = true; sGeo.attributes.color.needsUpdate = true; sp.live = any;
  }
  // ---------- Leuchtpunkte, Lichtsterne, Staub, Feuer, Klammern (Sprites aus Vorräten) ----------
  const spritePool = (n, map, blending, order = 3) => { const a = []; for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending, toneMapped: false })); s.visible = false; s.renderOrder = order; scene.add(s); a.push({ s, p: V3(), v: V3(), t: 0, life: 1, s0: 1, s1: 1, c: [1, 1, 1], k: 1, rot: 0 }); } return { a, i: 0 }; };
  const GL = spritePool(70, glowTexture(), THREE.AdditiveBlending, 5); const FL = spritePool(18, flareTexture(), THREE.AdditiveBlending, 6); const DU = spritePool(120, smokeTexture(), THREE.NormalBlending, 2); const FI = spritePool(80, fireTexture(), THREE.AdditiveBlending, 4); const BR = spritePool(28, bracketTexture(), THREE.NormalBlending, 7);
  const take = (Pl) => { const e = Pl.a[Pl.i]; Pl.i = (Pl.i + 1) % Pl.a.length; e.t = 0; e.s.visible = true; return e; };
  F.glow = (p, c, size, life = 0.2, k = 1) => { const e = take(GL); e.p.copy(p); e.v.set(0, 0, 0); e.life = life; e.s0 = size; e.s1 = size * 0.6; e.c = c; e.k = k; };
  F.flare = (p, c, size, life = 0.12, k = 1) => { const e = take(FL); e.p.copy(p); e.v.set(0, 0, 0); e.life = life; e.s0 = size; e.s1 = size * 1.3; e.c = c; e.k = k; e.s.material.rotation = Math.random() * 3; };
  F.dust = (p, n, size = 1, count = 2, tint = [0.42, 0.36, 0.29], life = 2.2, speed = 1, dens = 0.5) => { for (let i = 0; i < count; i++) { const e = take(DU); e.p.copy(p).add(_v.set((Math.random() - 0.5) * size * 0.5, (Math.random() - 0.5) * size * 0.5, (Math.random() - 0.5) * size * 0.5)); e.v.copy(n).multiplyScalar((0.5 + Math.random()) * speed).add(_v.set((Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed)); e.life = life * (0.7 + Math.random() * 0.6); e.s0 = size * (0.5 + Math.random() * 0.4); e.s1 = size * (1.6 + Math.random()); e.c = tint; e.k = dens * (0.8 + Math.random() * 0.4); e.s.material.rotation = Math.random() * 6; } };
  F.fire = (p, size = 2, count = 5, speed = 1) => { for (let i = 0; i < count; i++) { const e = take(FI); e.p.copy(p).add(_v.set((Math.random() - 0.5) * size * 0.6, (Math.random() - 0.5) * size * 0.6, (Math.random() - 0.5) * size * 0.6)); e.v.set((Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed, (Math.random() - 0.5) * speed).addScaledVector(_p.copy(p).normalize(), speed * 0.8); e.life = 0.45 + Math.random() * 0.5; e.s0 = size * (0.35 + Math.random() * 0.3); e.s1 = size * (1.0 + Math.random() * 0.7); e.s.material.rotation = Math.random() * 6; } };
  F.bracket = (p, size = 0.9) => { const e = take(BR); e.p.copy(p); e.life = 0.75; e.s0 = size * 1.5; e.s1 = size; };
  function stepSprites(dt) {
    for (const e of GL.a) { if (!e.s.visible) continue; e.t += dt; const k = 1 - e.t / e.life; if (k <= 0) { e.s.visible = false; continue; } e.s.position.copy(e.p); e.s.scale.setScalar(e.s0 + (e.s1 - e.s0) * (1 - k)); e.s.material.color.setRGB(e.c[0] * e.k * 2.4, e.c[1] * e.k * 2.4, e.c[2] * e.k * 2.4); e.s.material.opacity = k; }
    for (const e of FL.a) { if (!e.s.visible) continue; e.t += dt; const k = 1 - e.t / e.life; if (k <= 0) { e.s.visible = false; continue; } e.s.position.copy(e.p); e.s.scale.setScalar(e.s0 + (e.s1 - e.s0) * (1 - k)); e.s.material.color.setRGB(e.c[0] * e.k * 3, e.c[1] * e.k * 3, e.c[2] * e.k * 3); e.s.material.opacity = k; }
    for (const e of DU.a) { if (!e.s.visible) continue; e.t += dt; const u = e.t / e.life; if (u >= 1) { e.s.visible = false; continue; } const l = e.p.length() || 1; e.v.addScaledVector(e.p, -0.35 * dt / l); e.v.multiplyScalar(1 - dt * 0.9); e.p.addScaledVector(e.v, dt); e.s.position.copy(e.p); e.s.scale.setScalar(e.s0 + (e.s1 - e.s0) * (1 - (1 - u) * (1 - u))); e.s.material.color.setRGB(e.c[0], e.c[1], e.c[2]); e.s.material.opacity = e.k * Math.min(1, u * 8) * (1 - u) * (1 - u); }
    for (const e of FI.a) { if (!e.s.visible) continue; e.t += dt; const u = e.t / e.life; if (u >= 1) { e.s.visible = false; continue; } e.v.multiplyScalar(1 - dt * 1.5); e.p.addScaledVector(e.v, dt); e.s.position.copy(e.p); e.s.scale.setScalar(e.s0 + (e.s1 - e.s0) * (1 - (1 - u) * (1 - u))); e.s.material.rotation += dt * 0.6;
      if (u < 0.12) e.s.material.color.setRGB(2.6, 1.5, 0.5); else if (u < 0.5) { const w = (u - 0.12) / 0.38; e.s.material.color.setRGB(2.6 - 0.9 * w, 1.5 - 1.0 * w, 0.5 - 0.42 * w); } else { const w = (u - 0.5) / 0.5; e.s.material.color.setRGB(1.7 - 1.4 * w, 0.5 - 0.44 * w, 0.08 - 0.06 * w); } e.s.material.opacity = Math.min(1, (1 - u) * 1.8) * 0.62; }
    for (const e of BR.a) { if (!e.s.visible) continue; e.t += dt; const u = e.t / e.life; if (u >= 1) { e.s.visible = false; continue; } e.s.position.copy(e.p); e.s.scale.setScalar(e.s0 + (e.s1 - e.s0) * Math.min(1, u * 5)); e.s.material.opacity = u < 0.7 ? 1 : (1 - u) / 0.3; }
  }
  // ---------- Druckwellen (Ringe auf der Oberfläche) und Lichtblitze ----------
  const rings = []; const rT = ringTexture(); for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: rT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.visible = false; m.renderOrder = 4; scene.add(m); rings.push({ m, t: 0, life: 1, r0: 1, r1: 2, c: [1, 1, 1] }); } let ri = 0;
  F.ring = (p, n, r0, r1, c = [1, 0.85, 0.6], life = 0.4) => { const e = rings[ri]; ri = (ri + 1) % rings.length; e.t = 0; e.life = life; e.r0 = r0; e.r1 = r1; e.c = c; e.m.visible = true; e.m.position.copy(p).addScaledVector(n, 0.25); e.m.quaternion.setFromUnitVectors(Zv, _v.set(n.x, n.y, n.z).normalize()); };
  const lights = new THREE.Group(); scene.add(lights); const LP = []; for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffffff, 0, 30, 1.6); lights.add(l); LP.push({ l, t: 0, life: 0.2, k: 0 }); } let li = 0;
  F.lights = lights;
  F.flash = (p, color, k = 20, range = 14, life = 0.18) => { const e = LP[li]; li = (li + 1) % LP.length; e.l.position.copy(p); e.l.color.set(color); e.l.distance = range; e.k = k; e.t = 0; e.life = life; };
  function stepRings(dt) {
    for (const e of rings) { if (!e.m.visible) continue; e.t += dt; const u = e.t / e.life; if (u >= 1) { e.m.visible = false; continue; } const s = e.r0 + (e.r1 - e.r0) * (1 - (1 - u) * (1 - u)); e.m.scale.setScalar(s); const k = (1 - u) * (1 - u) * 2.5; e.m.material.color.setRGB(e.c[0] * k, e.c[1] * k, e.c[2] * k); }
    for (const e of LP) { if (e.k <= 0) { e.l.intensity = 0; continue; } e.t += dt; const u = e.t / e.life; if (u >= 1) { e.k = 0; e.l.intensity = 0; continue; } e.l.intensity = e.k * (1 - u) * (1 - u); }
  }
  F.step = (dt) => { F.t += dt; stepChunks(dt); stepSparks(dt); stepSprites(dt); stepRings(dt); };

  // ---------- Fertige Abläufe: ein Abbau-Eingriff je nach Werkzeug ----------
  // res: Ergebnis von A.dig (vol, mat[5]); kind: 'pick' | 'hammer' | 'drill' | 'laser' | 'drone' | 'big' | 'remote'
  const dom = (res) => { let b = 0; for (let i = 1; i < 5; i++) if (res.mat[i] > res.mat[b]) b = i; return res.vol > 0 && res.mat[b] > res.vol * 0.12 ? b : 0; };
  F.dig = (kind, x, y, z, r, res) => {
    if (kind === 'quiet') return;
    if (!res || res.vol <= 0.0005) { if (kind === 'laser') { _p.set(x, y, z); F.sparks(_p, _p.clone().normalize(), 2, 2, 4, 0.25); } return; }
    const p = V3(x, y, z); A.normal(x, y, z, _n); const n = V3(_n.x, _n.y, _n.z); const b = dom(res); const c = MAT_COL[b]; const amt = Math.min(1, res.vol / 2); const surf = V3().copy(p).addScaledVector(n, Math.min(r, 0.6));
    const ore = (cnt, speed, size) => { if (res.mat[1] > 0.02) F.chunks('ice', surf, n, { count: Math.max(1, Math.round(cnt * Math.min(1, res.mat[1] / res.vol + 0.3))), speed, size: size * 1.5, jitter: r * 0.5 }); if (res.mat[3] > 0.01) F.chunks('gold', surf, n, { count: Math.max(1, Math.round(cnt * 0.8 * Math.min(1, res.mat[3] / res.vol + 0.3))), speed: speed * 0.9, size: size * 1.2, jitter: r * 0.5 }); };
    const dustTint = b === 2 ? [0.45, 0.2, 0.14] : b === 3 ? [0.7, 0.56, 0.2] : b === 1 ? [0.5, 0.62, 0.76] : [0.42, 0.36, 0.29];
    if (kind === 'pick') { F.chunks('rock', surf, n, { count: 5 + Math.round(amt * 7), speed: 4.2, size: 0.11, color: c, jitter: 0.3 }); ore(3, 3.6, 0.09); F.dust(surf, n, 1.0, 2, dustTint, 1.8, 1.1); F.sparks(surf, n, b === 1 ? 1 : b === 3 ? 3 : 0, 10, 6, 0.45); F.flare(surf, [1, 0.95, 0.85], 1.3, 0.09); F.flash(surf, 0xfff0d8, 4, 6, 0.12); }
    else if (kind === 'hammer') { F.chunks('rock', surf, n, { count: 14 + Math.round(amt * 8), speed: 6.5, size: 0.2, color: c, jitter: 0.6 }); ore(6, 5, 0.12); F.dust(surf, n, 1.9, 5, dustTint, 2.6, 2.0); F.sparks(surf, n, b === 3 ? 3 : 0, 22, 8, 0.55); F.flare(surf, [1, 0.9, 0.75], 2.4, 0.11); F.ring(surf, n, 0.4, 3.4, [1, 0.9, 0.7], 0.32); F.flash(surf, 0xffe8c8, 9, 10, 0.16); }
    else if (kind === 'drill') { F.chunks('rock', surf, n, { count: 2, speed: 5.5, size: 0.07, color: c, spread: 0.9, life: 3 }); if (Math.random() < 0.5) ore(1, 4, 0.07); F.sparks(surf, n, 0, 5, 7, 0.3, 1.1); if (Math.random() < 0.35) F.dust(surf, n, 0.7, 1, dustTint, 1.5, 1.4); }
    else if (kind === 'laser') { F.sparks(surf, n, 2, 7, 9, 0.4); F.chunks('rock', surf, n, { count: 2, speed: 6, size: 0.1, color: c, heat: 1, life: 4 }); if (Math.random() < 0.6) ore(1, 5, 0.08); if (Math.random() < 0.4) F.dust(surf, n, 0.9, 1, [0.4, 0.34, 0.36], 2.4, 1.3); if (F.rock) F.rock.heat(x, y, z, r, 5.5, 0, 1.1); }
    else if (kind === 'drone') { F.fire(surf, 1.5, 3, 1.5); F.sparks(surf, n, 2, 12, 8, 0.5); F.chunks('rock', surf, n, { count: 6, speed: 6, size: 0.14, color: c, heat: 0.7 }); ore(2, 5, 0.1); F.dust(surf, n, 1.6, 2, dustTint, 2.4, 1.6); F.bracket(surf, 1.0); F.flash(surf, 0xffc890, 9, 9, 0.16); if (F.rock) F.rock.heat(x, y, z, r, 3, 0, 0.9); }
    else if (kind === 'big') { F.chunks('rock', surf, n, { count: 16, speed: 7 + r * 0.9, size: 0.3 + r * 0.035, color: c, jitter: r, heat: 0.5, life: 7 }); ore(5, 8, 0.2); F.dust(surf, n, 2.2 + r * 0.3, 3, dustTint, 3.2, 2.5 + r * 0.3, 0.3); }
    else { F.chunks('rock', surf, n, { count: 3, speed: 4, size: 0.1, color: c }); F.dust(surf, n, 0.9, 1, dustTint, 1.6, 1); F.sparks(surf, n, 0, 4, 5, 0.35); }
  };
  // Große Explosion (Orbitalschlag, Ende des Schwarzen Lochs): Feuerball, Druckwelle, Glutregen, Rauch
  F.explode = (p, n, r, o = {}) => {
    const up = V3().copy(n); F.fire(V3().copy(p).addScaledVector(up, r * 0.35), r * 0.8, o.fire || 10, r * 0.7); F.fire(V3().copy(p).addScaledVector(up, r * 0.9), r * 0.5, 4, r * 1.2); F.ring(p, n, r * 0.4, r * 2.6, o.ring || [1, 0.75, 0.45], 0.7); F.ring(p, n, r * 0.2, r * 1.6, [1, 0.95, 0.85], 0.4);
    F.flare(V3().copy(p).addScaledVector(up, r * 0.4), o.flare || [1, 0.8, 0.5], r * 2.6, 0.22, 1.0); F.flash(V3().copy(p).addScaledVector(up, r * 0.7), o.light || 0xffa060, 46, r * 6, 0.7);
    F.sparks(p, up, o.spark === undefined ? 2 : o.spark, 90, 14 + r, 1.3, 1.5); F.chunks('rock', V3().copy(p).addScaledVector(up, 0.5), up, { count: 46, speed: 9 + r * 0.8, size: 0.45, heat: 1, jitter: r * 0.9, life: 8, color: MAT_COL[0] });
    F.dust(V3().copy(p).addScaledVector(up, r * 0.3), up, r * 0.55, 6, [0.36, 0.3, 0.25], 4.2, r * 0.5, 0.34); F.dust(V3().copy(p).addScaledVector(up, r * 0.8), up, r * 0.5, 5, [0.09, 0.075, 0.07], 5.5, r * 0.35, 0.55);
  };
  return F;
}

// Strahl (Laser, Drohnen, Orbit): heller Kern mit farbigem Schein zwischen zwei Punkten
export function createBeam(scene, color, radius = 0.05) {
  const g = new THREE.CylinderGeometry(1, 1, 1, 10, 1, true); g.translate(0, 0.5, 0); g.rotateX(Math.PI / 2); const c = new THREE.Color(color);
  const mk = (col, op) => { const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); m.frustumCulled = false; m.renderOrder = 5; return m; };
  const core = mk(new THREE.Color(3, 3, 3), 1); const glow = mk(new THREE.Color(c.r * 2.2, c.g * 2.2, c.b * 2.2), 0.6); const haze = mk(c.clone(), 0.16); const grp = new THREE.Group(); grp.add(core, glow, haze); grp.visible = false; scene.add(grp);
  return { grp, set(a, b, t = 0, w = 1) { grp.visible = true; grp.position.copy(a); grp.lookAt(b); const L = a.distanceTo(b); const f = (0.82 + 0.18 * Math.sin(t * 47) * Math.sin(t * 31)) * w; core.scale.set(radius * 0.4 * f, radius * 0.4 * f, L); glow.scale.set(radius * 1.5 * f, radius * 1.5 * f, L); haze.scale.set(radius * 5 * f, radius * 5 * f, L); }, hide() { grp.visible = false; } };
}
// Schwarzes Loch: dunkle Kugel, zwei gegenläufige Leuchtringe, Schein, Licht
export function buildHole() {
  const g = new THREE.Group(); const core = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: 0x000000 })); g.add(core);
  const ringT = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const gr = x.createRadialGradient(128, 128, 40, 128, 128, 128); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.32, 'rgba(255,235,255,1)'); gr.addColorStop(0.45, 'rgba(190,90,255,.85)'); gr.addColorStop(0.7, 'rgba(90,30,200,.35)'); gr.addColorStop(1, 'rgba(40,0,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 256); x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(0,0,0,${0.3 + Math.random() * 0.5})`; x.lineWidth = 2 + Math.random() * 5; x.beginPath(); const a = Math.random() * 6.283; x.arc(128, 128, 46 + Math.random() * 76, a, a + 0.5 + Math.random()); x.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mk = (s, tilt) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ map: ringT, color: new THREE.Color(2.2, 1.6, 2.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); m.rotation.x = tilt; g.add(m); return m; };
  const ring = mk(4.6, -Math.PI / 2 + 0.3); const ring2 = mk(3.4, -Math.PI / 2 - 0.5);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(1.2, 0.5, 2.2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.scale.setScalar(7); glow.renderOrder = 3; g.add(glow);
  return { group: g, core, ring, ring2, glow };
}
