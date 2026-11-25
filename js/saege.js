// Theos Seitenscheidel - Hund-Modus (intern saege, das Spiel hat absichtlich keinen Namen, nur den Hund als Bild).
// Halle, Rolltor geht auf, LKW setzt rückwärts rein, Türen auf, Knet-Hamster ploppen raus. Welle 1: 100, Welle 2: 200, Welle 3: 300 ... bis alle tot sind.
// Waffe je Welle für alle gleich: Kettensäge, Sägeblatt-Werfer, Minigun, Schrotflinte, Häcksler, Granatwerfer, dann wieder von vorn.
// Allein oder online bis zu viert. Online rechnet der Host die Hamster, Treffer und Bisse; jeder bewegt sich selbst und schickt Blick und Abzug.
// Gore (Hälften, Fetzen, Tropfen, Lachen, Bildschirm-Blut) und Schreie entstehen bei jedem selbst aus den Treffer-Nachrichten.
import * as THREE from './vendor/three.module.min.js';
import { weaponOf, wave, FIELD_MAX, HALL, TRUCK, PLAYER, HAM, SEAT_COL, spawnPoint, raySphere, inSawCone, inFront, clampHall, pushOutOfTruck, createGrid } from './saegelogic.js';
import { buildHall, buildTruck, aliveGeo, makeHalf, hamsterMat, createChunk, splatTexture, buildWeapons, bladeMesh, grenadeMesh, buildAvatar, boomTexture, LOOKS } from './saegeart.js';
import { createSaegeSound } from './saegesound.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const rand = (a, b) => a + Math.random() * (b - a); const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const MAXP = 2600; const MAXS = 3200; const MAXGIB = 700; const GRAV = 15; const CAP = FIELD_MAX + 24;
const PHASE_LEN = { tor: 2.4, lkw: 4.6, tueren: 1.1, geschafft: 7 };
const KIND = ['split', 'fetzen', 'saege', 'haecksel', 'boom']; const kcode = (k) => Math.max(0, KIND.indexOf(k));
const STATE = ['inside', 'fly', 'run'];

export function createSaege(ctx) {
  const { renderer, audio, $, store, settings, showScreen, G, shadowSize, endSession } = ctx;
  const snd = createSaegeSound(audio); const canvas = $('gl'); const hud = $('saege');
  const C = { on: false, W: null, cam: new THREE.PerspectiveCamera(74, 16 / 9, 0.03, 300), phase: 'off', phaseT: 0, wave: 0, cfg: wave(0), weapon: 'saege', net: null, host: true, meId: 'me', players: [],
    ham: [], byId: new Map(), deadIds: new Set(), gibs: [], proj: [], toSpawn: 0, killed: 0, alive: 0, nextId: 1, projId: 1, killQ: [], truck: { rear: TRUCK.rearOut, doorK: 0, gateK: 0 }, spawnT: 0,
    paused: false, quiet: false, best: store.get('sgBest', 0), kills: store.get('sgKills', 0), tAbs: 0, sendT: 0, snapT: 0, kick: 0, swapT: 1, keys: {}, flashT: 0, edges: 0, fire: false };
  const T = {}; const grid = createGrid(1);
  const tmp = V3(); const tmp2 = V3(); const tmp3 = V3(); const qTmp = new THREE.Quaternion(); const qId = new THREE.Quaternion(); const mTmp = new THREE.Matrix4(); const dummy = new THREE.Object3D(); const zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  const isHost = () => !C.net || C.host;
  const me = () => C.players.find((p) => p.id === C.meId) || null;
  const newWs = () => ({ fireT: 0, spinV: 0, sawStartT: 0, cutting: 0, edge: false, lastE: 0 });
  const newPlayer = (id, name, seat) => { const s = spawnPoint(seat); return { id, name, seat, x: s.x, z: s.z, yaw: 0, pitch: -0.12, hp: PLAYER.hp, vx: 0, vz: 0, bob: 0, hurtT: 9, biteCd: 0, dead: false, fire: false, ws: newWs(), kills: 0, av: null, tx: s.x, tz: s.z, tyaw: 0 }; };

  // ---------------- Aufbau ----------------
  function build() {
    if (C.W) return; C.W = buildHall(renderer, { shadows: settings.shadows, shadowSize: shadowSize ? shadowSize() : 2048 }); const sc = C.W.scene;
    T.truck = buildTruck(); sc.add(T.truck.group);
    T.wp = buildWeapons(); C.cam.add(T.wp.root); sc.add(C.cam); sc.add(T.wp.flash); T.muzzleLight = new THREE.PointLight(0xffc870, 0, 9, 2); sc.add(T.muzzleLight); T.boomLight = new THREE.PointLight(0xff9a40, 0, 16, 2); sc.add(T.boomLight);
    // Lebende Hamster: je Farbe ein InstancedMesh
    T.inst = LOOKS.map((_, look) => { const m = new THREE.InstancedMesh(aliveGeo(look), hamsterMat, CAP); m.castShadow = true; m.frustumCulled = false; for (let i = 0; i < CAP; i++) m.setMatrixAt(i, zeroM); sc.add(m); return { m, free: Array.from({ length: CAP }, (_, i) => CAP - 1 - i), dirty: true }; });
    T.drops = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0x9a0008, roughness: 0.25, metalness: 0.05 }), MAXP); T.drops.count = 0; T.drops.frustumCulled = false; sc.add(T.drops);
    T.P = { x: new Float32Array(MAXP), y: new Float32Array(MAXP), z: new Float32Array(MAXP), vx: new Float32Array(MAXP), vy: new Float32Array(MAXP), vz: new Float32Array(MAXP), s: new Float32Array(MAXP), l: new Float32Array(MAXP), n: 0 };
    const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2); const sm = new THREE.MeshStandardMaterial({ color: 0xffffff, map: splatTexture(), transparent: true, depthWrite: false, roughness: 0.18, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    T.splats = new THREE.InstancedMesh(sg, sm, MAXS); T.splats.count = 0; T.splats.frustumCulled = false; T.splats.receiveShadow = true; T.splats.renderOrder = 1; sc.add(T.splats); T.splatN = 0; T.splatI = 0; T.splats.setColorAt(0, new THREE.Color(0x880000));
    T.tracers = []; for (let i = 0; i < 24; i++) { const g = new THREE.BufferGeometry().setFromPoints([V3(), V3(0, 0, -1)]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, depthWrite: false })); l.frustumCulled = false; sc.add(l); T.tracers.push({ l, life: 0 }); } T.trI = 0;
    T.booms = []; const bt = boomTexture(); for (let i = 0; i < 6; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.visible = false; sc.add(s); T.booms.push({ s, life: 0 }); }
    T.bc = $('sgBlood'); T.bc.width = 480; T.bc.height = 270; T.bx = T.bc.getContext('2d');
    setWeaponModel(C.weapon, true);
  }

  // ---------------- Blut ----------------
  function emit(x, y, z, dx, dy, dz, n, speed, spread, smin = 0.012, smax = 0.035) {
    const P = T.P; for (let k = 0; k < n; k++) { let i = P.n; if (i >= MAXP) i = (Math.random() * MAXP) | 0; else P.n++; const sp = speed * rand(0.35, 1.15); P.x[i] = x + rand(-0.04, 0.04); P.y[i] = y + rand(-0.04, 0.04); P.z[i] = z + rand(-0.04, 0.04); P.vx[i] = dx * sp + rand(-1, 1) * speed * spread; P.vy[i] = dy * sp + rand(-0.4, 1) * speed * spread; P.vz[i] = dz * sp + rand(-1, 1) * speed * spread; P.s[i] = rand(smin, smax); P.l[i] = 0; }
  }
  const splatCol = new THREE.Color();
  function splat(x, z, size, fresh = 1) {
    if (x < HALL.x0 - 0.6 || x > HALL.x1 + 0.6 || z < HALL.z0 - 0.6 || z > HALL.z1 + 0.6) return; const i = T.splatI; T.splatI = (T.splatI + 1) % MAXS; T.splatN = Math.min(MAXS, T.splatN + 1);
    dummy.position.set(x, 0.004 + (i % 64) * 0.00003, z); dummy.rotation.set(0, Math.random() * 6.28, 0); dummy.scale.set(size * rand(0.8, 1.25), 1, size * rand(0.8, 1.25)); dummy.updateMatrix(); T.splats.setMatrixAt(i, dummy.matrix);
    splatCol.setRGB(rand(0.42, 0.62) * fresh + 0.25 * (1 - fresh), 0.0, 0.01); T.splats.setColorAt(i, splatCol); T.splats.count = T.splatN; T.splats.instanceMatrix.needsUpdate = true; if (T.splats.instanceColor) T.splats.instanceColor.needsUpdate = true;
  }
  const camPos = V3();
  function stepDrops(dt) {
    const P = T.P; C.cam.getWorldPosition(camPos); const dmp = Math.exp(-dt * 0.6);
    for (let i = 0; i < P.n; i++) {
      P.vy[i] -= GRAV * dt; P.vx[i] *= dmp; P.vz[i] *= dmp; P.x[i] += P.vx[i] * dt; P.y[i] += P.vy[i] * dt; P.z[i] += P.vz[i] * dt; P.l[i] += dt;
      if (P.y[i] <= 0.01 || P.l[i] > 4) { if (P.y[i] <= 0.01 && Math.random() < 0.55) splat(P.x[i], P.z[i], P.s[i] * rand(5, 11)); const j = --P.n; P.x[i] = P.x[j]; P.y[i] = P.y[j]; P.z[i] = P.z[j]; P.vx[i] = P.vx[j]; P.vy[i] = P.vy[j]; P.vz[i] = P.vz[j]; P.s[i] = P.s[j]; P.l[i] = P.l[j]; i--; continue; }
      const cx = P.x[i] - camPos.x; const cy = P.y[i] - camPos.y; const cz = P.z[i] - camPos.z; const s = cx * cx + cy * cy + cz * cz < 0.7 ? 0 : P.s[i]; const st = 1 + Math.min(2, Math.abs(P.vy[i]) * 0.12); mTmp.makeScale(s, s * st, s); mTmp.setPosition(P.x[i], P.y[i], P.z[i]); T.drops.setMatrixAt(i, mTmp);
    }
    T.drops.count = P.n; T.drops.instanceMatrix.needsUpdate = true;
  }
  // Blut auf der Kamera: Flecken verblassen nach gut zwei Sekunden
  const blots = [];
  function screenBlood(amount, side = 0) {
    const w = T.bc.width; const h = T.bc.height;
    for (let k = 0; k < amount; k++) { if (blots.length > 40) blots.shift(); const cx = clamp(w * (0.55 + side * 0.2) + rand(-0.45, 0.45) * w, 0, w); const cy = h * rand(0.15, 0.95); const r = rand(5, 18); const pts = []; for (let a = 0; a < 20; a++) pts.push(r * rand(0.7, 1.2)); const drops = []; for (let d = 0; d < 4; d++) drops.push([rand(-2, 2) * r, rand(-2, 2) * r, rand(1.5, 5)]); blots.push({ cx, cy, pts, drops, run: Math.random() < 0.5 ? rand(10, 50) : 0, col: (110 + Math.random() * 60) | 0, a: rand(0.65, 0.9), age: 0, life: rand(1.6, 2.6) }); }
  }
  function fadeScreenBlood(dt) {
    if (!blots.length && !C.bloodDirty) return; const x = T.bx; x.clearRect(0, 0, T.bc.width, T.bc.height); C.bloodDirty = blots.length > 0;
    for (let i = blots.length - 1; i >= 0; i--) { const b = blots[i]; b.age += dt; const al = b.a * clamp(1 - (b.age - b.life * 0.4) / (b.life * 0.6), 0, 1); if (b.age >= b.life) { blots.splice(i, 1); continue; } x.fillStyle = `rgba(${b.col},0,4,${al})`; x.beginPath(); for (let k = 0; k < 20; k++) { const t = (k / 20) * Math.PI * 2; x.lineTo(b.cx + Math.cos(t) * b.pts[k], b.cy + Math.sin(t) * b.pts[k]); } x.fill(); for (const d of b.drops) { x.beginPath(); x.arc(b.cx + d[0], b.cy + d[1], d[2], 0, 7); x.fill(); } if (b.run) x.fillRect(b.cx - 1.5, b.cy, 3, b.run * Math.min(1, b.age * 2)); }
  }

  // ---------------- Hamster (Darstellung, bei Host und Mitspielern gleich) ----------------
  function allocSlot(h) { for (let k = 0; k < LOOKS.length; k++) { const look = (h.look + k) % LOOKS.length; const I = T.inst[look]; if (I.free.length) { h.look = look; h.slot = I.free.pop(); return true; } } h.slot = -1; return false; }
  function freeSlot(h) { if (h.slot < 0) return; const I = T.inst[h.look]; I.m.setMatrixAt(h.slot, zeroM); I.free.push(h.slot); I.dirty = true; h.slot = -1; }
  function addHam(id, look, sc, x, y, z, state) { const h = { id, look, sc, pos: V3(x, y, z), tgt: V3(x, y, z), vel: V3(), yaw: 0, tyaw: 0, state, hp: 1, phase: Math.random() * 6, sp: rand(2.6, 4.2), biteT: rand(0.2, 0.9), squash: 0, shake: 0, scr: false, slot: -1, target: null }; if (!allocSlot(h)) return null; C.ham.push(h); C.byId.set(id, h); return h; }
  function removeHam(h) { freeSlot(h); C.byId.delete(h.id); const i = C.ham.indexOf(h); if (i >= 0) C.ham.splice(i, 1); }
  function drawHam(h) {
    if (h.slot < 0) return; const I = T.inst[h.look]; dummy.position.copy(h.pos); if (h.shake > 0) { dummy.position.x += rand(-1, 1) * 0.03 * h.shake; dummy.position.z += rand(-1, 1) * 0.03 * h.shake; }
    dummy.rotation.set(h.squash < 0 ? h.squash * -0.35 : 0, h.yaw, 0); const sq = h.squash > 0 ? h.squash * 0.25 : 0; dummy.scale.set(h.sc * (1 + sq), h.sc * (1 - sq), h.sc * (1 + sq)); dummy.updateMatrix(); I.m.setMatrixAt(h.slot, dummy.matrix); I.dirty = true;
  }
  function flushInst() { for (const I of T.inst) if (I.dirty) { I.m.instanceMatrix.needsUpdate = true; I.dirty = false; } }

  // ---------------- Hamster-Verhalten (nur Host) ----------------
  function spawnInside() {
    const r = C.truck.rear; const h = addHam(C.nextId++, (Math.random() * LOOKS.length) | 0, rand(1.15, 1.5), rand(-T.truck.inner.x, T.truck.inner.x), T.truck.floorY + 0.06, r - rand(0.7, T.truck.inner.len - 0.6), 'inside'); if (!h) return false; h.sp *= C.cfg.speed; C.alive++; return true;
  }
  const insideCount = () => { let n = 0; for (const h of C.ham) if (h.state === 'inside') n++; return n; };
  const livePlayers = () => C.players.filter((p) => !p.dead);
  function nearestPlayer(x, z) { let b = null; let bd = 1e9; for (const p of C.players) { if (p.dead) continue; const d = (p.x - x) ** 2 + (p.z - z) ** 2; if (d < bd) { bd = d; b = p; } } return b; }
  function stepHamstersHost(dt) {
    const solids = C.W.solids; const list = C.ham; const n = list.length; const fighting = C.phase !== 'ende' && C.phase !== 'geschafft';
    grid.build(list, (h) => h.state === 'run');
    for (let i = 0; i < n; i++) {
      const h = list[i]; const pos = h.pos;
      if (h.state === 'inside') { pos.z += dt * h.sp * 0.9; h.phase += dt * 10; pos.y = T.truck.floorY + 0.06 + Math.abs(Math.sin(h.phase)) * 0.08; h.yaw = 0; if (pos.z >= C.truck.rear - 0.15) { h.state = 'fly'; h.vel.set(rand(-1.8, 1.8), rand(3.4, 5.6), rand(2.6, 6.2)); snd.pop(distMe(pos), panOf(pos)); } }
      else if (h.state === 'fly') { h.vel.y -= GRAV * dt; pos.addScaledVector(h.vel, dt); h.yaw += dt * 3; if (pos.y <= 0 && h.vel.y < 0) { pos.y = 0; h.state = 'run'; h.squash = 1; } }
      else if (h.state === 'run') {
        if (!h.target || h.target.dead || Math.random() < dt * 2) h.target = nearestPlayer(pos.x, pos.z); const p = h.target; let mx = 0; let mz = 0; let d = 99; const reach = 0.42 * h.sc + 0.38;
        if (p) { const dx = p.x - pos.x; const dz = p.z - pos.z; d = Math.hypot(dx, dz) || 1; if (d > reach) { mx = dx / d; mz = dz / d; } else if (fighting) { h.biteT -= dt; if (h.biteT <= 0) { h.biteT = PLAYER.biteEvery * rand(0.8, 1.3); h.squash = -0.7; bite(p); } } const want = Math.atan2(dx, dz); let dy = want - h.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); h.yaw += dy * Math.min(1, dt * 8); }
        let sx = 0; let sz = 0; grid.each(pos.x, pos.z, (j) => { if (j === i) return; const o = list[j]; const ex = pos.x - o.pos.x; const ez = pos.z - o.pos.z; const md = 0.36 * (h.sc + o.sc); const dd = ex * ex + ez * ez; if (dd < md * md && dd > 1e-6) { const l = Math.sqrt(dd); const k = (md - l) / md; sx += (ex / l) * k; sz += (ez / l) * k; } });
        const v = h.sp; pos.x += (mx * v + sx * 3.2) * dt; pos.z += (mz * v + sz * 3.2) * dt;
        for (const s of solids) { const ex = pos.x - s.x; const ez = pos.z - s.z; const md = s.r + 0.3 * h.sc; const dd = ex * ex + ez * ez; if (dd < md * md) { const l = Math.sqrt(dd) || 1; pos.x = s.x + (ex / l) * md; pos.z = s.z + (ez / l) * md; } }
        for (const q of C.players) { if (q.dead) continue; const ex = pos.x - q.x; const ez = pos.z - q.z; const md = 0.32 + 0.3 * h.sc; const dd = ex * ex + ez * ez; if (dd < md * md && dd > 1e-6) { const l = Math.sqrt(dd); pos.x = q.x + (ex / l) * md; pos.z = q.z + (ez / l) * md; } } // Spieler werden nicht weggeschoben
        clampHall(pos, 0.3 * h.sc); h.phase += dt * (d > reach ? h.sp * 3.2 : 4); pos.y = d > reach ? Math.abs(Math.sin(h.phase)) * 0.12 * h.sc : 0;
      }
      h.squash += (0 - h.squash) * Math.min(1, dt * 7); h.shake = Math.max(0, h.shake - dt * 4); drawHam(h);
    }
  }
  // Mitspieler: Hamster gleiten zu den Positionen aus dem letzten Bild des Hosts
  function stepHamstersClient(dt) { const k = 1 - Math.exp(-dt * 12); for (const h of C.ham) { h.pos.lerp(h.tgt, k); let dy = h.tyaw - h.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); h.yaw += dy * k; h.squash += (0 - h.squash) * Math.min(1, dt * 7); h.shake = Math.max(0, h.shake - dt * 4); drawHam(h); } }
  function distMe(pos) { const p = me(); return p ? Math.hypot(pos.x - p.x, pos.z - p.z) : 5; }
  function panOf(pos) { const p = me(); if (!p) return 0; const rx = Math.cos(p.yaw); const rz = -Math.sin(p.yaw); const dx = pos.x - p.x; const dz = pos.z - p.z; const d = Math.hypot(dx, dz) || 1; return clamp((dx * rx + dz * rz) / d, -1, 1) * 0.8; }
  function bite(p) { if (p.biteCd > 0) return; p.biteCd = PLAYER.biteGap; p.hp = Math.max(0, p.hp - PLAYER.bite); p.hurtT = 0; if (p.id === C.meId) { snd.bite(); if (Math.random() < 0.4) snd.hurt(); } if (p.hp <= 0 && !p.dead) playerDies(p); }

  // Töten: bei allen gleich (Gore entsteht lokal). Der Host zählt und meldet weiter.
  function kill(h, kind, dir, by) {
    if (!h || h.state === 'dead') return; const sc = h.sc; const pos = h.pos.clone(); h.state = 'dead'; C.deadIds.add(h.id);
    if (isHost()) { C.alive--; C.killed++; C.kills++; if (by) by.kills++; if (C.net) C.killQ.push(h.id, kcode(kind), Math.round(dir.x * 100), Math.round(dir.z * 100)); }
    const center = tmp.set(pos.x, pos.y + HAM.cy * sc, pos.z); const ax = V3(Math.cos(h.yaw), 0, -Math.sin(h.yaw)); const az = V3(Math.sin(h.yaw), 0, Math.cos(h.yaw)); const fetzen = kind === 'fetzen' || kind === 'haecksel' || kind === 'boom'; const power = kind === 'boom' ? 3 : kind === 'haecksel' ? 1.6 : 1;
    for (const side of [-1, 1]) { const piv = makeHalf(h.look, side); piv.position.copy(center); piv.rotation.set(0, h.yaw, 0); piv.scale.setScalar(sc); C.W.scene.add(piv); const k = kind === 'saege' ? 1 : 1.3; const vel = V3().addScaledVector(ax, side * rand(1.2, 2.6) * k).addScaledVector(dir, power * rand(1.2, 2.6)).add(V3(0, rand(2.2, 4.2) * (fetzen ? 1.3 : 1) * (kind === 'boom' ? 1.6 : 1), 0)); const ang = V3().addScaledVector(az, -side * rand(5, 10)).add(V3(rand(-2, 2), rand(-3, 3), rand(-2, 2))); addGib({ obj: piv, vel, ang, kind: 'half', side, sc, faceUp: Math.random() < 0.72, bleed: rand(1.2, 2.2) }); }
    removeHam(h);
    const bn = kind === 'saege' ? 60 : fetzen ? 75 : 45; emit(center.x, center.y, center.z, dir.x * 0.6, 0.8, dir.z * 0.6, bn, rand(3.5, 6) * (kind === 'boom' ? 1.4 : 1), 0.75, 0.01, 0.032); splat(pos.x, pos.z, sc * rand(1.1, 1.8)); splat(pos.x + dir.x * 0.6, pos.z + dir.z * 0.6, sc * rand(0.6, 1.1));
    if (fetzen) { const parts = ['fleisch', 'fleisch', 'dunkel', 'knochen', 'knochen', 'fell', 'fell', 'fleisch']; const cnt = (kind === 'haecksel' ? 7 : 4) + ((Math.random() * 4) | 0); for (let k = 0; k < cnt; k++) { const ch = createChunk(parts[k % parts.length], h.look); ch.mesh.position.copy(center); C.W.scene.add(ch.mesh); addGib({ obj: ch.mesh, vel: V3(rand(-3, 3), rand(2, 6), rand(-3, 3)).addScaledVector(dir, power * rand(1, 4)), ang: V3(rand(-12, 12), rand(-12, 12), rand(-12, 12)), kind: 'chunk', r: ch.r, bleed: rand(0.3, 1) }); } }
    const d = distMe(pos); const pan = panOf(pos); if (!h.scr || Math.random() < 0.5) snd.scream(d, pan, kind === 'saege' ? 1.2 : 1); snd.meat(d, pan, fetzen ? 1.3 : 1); snd.splat(d, pan, fetzen ? 1.2 : 0.8);
    if (d < 2.6) screenBlood(kind === 'saege' || kind === 'haecksel' ? 2 : 1, kind === 'saege' ? 0.5 : 0);
  }
  function addGib(gb) { gb.floor = false; gb.sink = 0; gb.dripT = 0; C.gibs.push(gb); if (C.gibs.length > MAXGIB) { const old = C.gibs.shift(); C.W.scene.remove(old.obj); } }
  const axisTmp = V3(); const nTmp = V3();
  function stepGibs(dt, sinking) {
    for (let i = C.gibs.length - 1; i >= 0; i--) {
      const gb = C.gibs[i]; const o = gb.obj; const rest = gb.kind === 'half' ? (gb.faceUp ? HAM.r * gb.sc * 0.98 : 0.03 * gb.sc) : gb.r;
      if (sinking) { gb.sink += dt; o.position.y -= dt * 0.35 * gb.sink; if (o.position.y < -0.8) { C.W.scene.remove(o); C.gibs.splice(i, 1); } continue; }
      if (!gb.floor) {
        gb.vel.y -= GRAV * dt; o.position.addScaledVector(gb.vel, dt); const w = gb.ang.length(); if (w > 1e-4) { axisTmp.copy(gb.ang).divideScalar(w); qTmp.setFromAxisAngle(axisTmp, w * dt); o.quaternion.premultiply(qTmp); }
        const ground = gb.kind === 'half' ? 0.16 * gb.sc : gb.r;
        if (o.position.y <= ground && gb.vel.y < 0) { o.position.y = ground; gb.vel.y *= -0.28; gb.vel.x *= 0.55; gb.vel.z *= 0.55; gb.ang.multiplyScalar(0.45); splat(o.position.x, o.position.z, (gb.kind === 'half' ? 0.7 : 0.3) * (gb.sc || 1)); if (Math.abs(gb.vel.y) < 0.9) gb.floor = true; }
        clampGib(o.position);
      } else {
        const k = Math.exp(-dt * 6); gb.vel.x *= k; gb.vel.z *= k; o.position.x += gb.vel.x * dt; o.position.z += gb.vel.z * dt; clampGib(o.position); o.position.y += (rest - o.position.y) * Math.min(1, dt * 6);
        if (gb.kind === 'half') { nTmp.set(-gb.side, 0, 0).applyQuaternion(o.quaternion); tmp2.set(0, gb.faceUp ? 1 : -1, 0); qTmp.setFromUnitVectors(nTmp, tmp2); qId.identity().slerp(qTmp, Math.min(1, dt * 5)); o.quaternion.premultiply(qId); }
        else { const w = gb.ang.length(); if (w > 0.05) { gb.ang.multiplyScalar(Math.exp(-dt * 5)); axisTmp.copy(gb.ang).divideScalar(w); qTmp.setFromAxisAngle(axisTmp, w * dt); o.quaternion.premultiply(qTmp); } }
      }
      if (gb.bleed > 0) { gb.bleed -= dt; gb.dripT -= dt; if (gb.dripT <= 0) { gb.dripT = gb.floor ? 0.25 : 0.03; if (gb.kind === 'half') { nTmp.set(-gb.side, 0, 0).applyQuaternion(o.quaternion); if (!gb.floor) emit(o.position.x, o.position.y, o.position.z, nTmp.x, nTmp.y + 0.3, nTmp.z, 2, 2.2, 0.4, 0.01, 0.026); else splat(o.position.x + rand(-0.3, 0.3), o.position.z + rand(-0.3, 0.3), rand(0.35, 0.7) * gb.sc); } else if (!gb.floor) emit(o.position.x, o.position.y, o.position.z, 0, 0, 0, 1, 0.6, 1, 0.01, 0.02); } }
    }
  }
  function clampGib(p) { p.x = clamp(p.x, HALL.x0 - 0.3, HALL.x1 + 0.3); p.z = clamp(p.z, HALL.z0 - 0.3, HALL.z1 + 0.3); }
  function clearAll() { for (const h of C.ham.slice()) removeHam(h); for (const gb of C.gibs) C.W.scene.remove(gb.obj); for (const pr of C.proj) C.W.scene.remove(pr.mesh); C.ham = []; C.byId.clear(); C.deadIds.clear(); C.gibs = []; C.proj = []; C.alive = 0; T.P.n = 0; T.drops.count = 0; flushInst(); }

  // ---------------- Waffen ----------------
  function setWeaponModel(id, instant) { for (const k of Object.keys(T.wp.all)) T.wp.all[k].group.visible = k === id; C.weapon = id; C.swapT = instant ? 1 : 0; for (const p of C.players) { p.ws = newWs(); if ((id === 'saege' || id === 'haecksler') && !instant) p.ws.sawStartT = 0.95; } if ((id === 'saege' || id === 'haecksler') && !instant) snd.sawStart(); for (const p of C.players) if (p.av) holdWeapon(p); hudWeapon(); }
  const eye = V3(); const fwd = V3(); const qAim = new THREE.Quaternion(); const eAim = new THREE.Euler(0, 0, 0, 'YXZ');
  function aimOf(p, out, spread = 0) { eAim.set(p.pitch, p.yaw, 0); qAim.setFromEuler(eAim); return out.set(rand(-1, 1) * spread, rand(-1, 1) * spread, -1).normalize().applyQuaternion(qAim); }
  function muzzleOf(p, out) { if (p.id === C.meId) { const m = T.wp.all[C.weapon].muzzle; if (m) return m.getWorldPosition(out); } if (p.av) return p.av.holder.getWorldPosition(out); return out.set(p.x, PLAYER.eye - 0.2, p.z); }
  // Nahkampf (Säge, Häcksler): Host richtet Schaden an, der eigene Spieler sieht Blut und hört Schreie sofort
  function melee(p, w, dt, auth, local) {
    const fx = -Math.sin(p.yaw); const fz = -Math.cos(p.yaw); const cand = []; for (const h of C.ham) { if (h.state !== 'run' && h.state !== 'fly') continue; const hit = w.id === 'saege' ? inSawCone(p.x, p.z, fx, fz, h.pos.x, h.pos.z, w.reach + 0.25 * h.sc, w.cone) : inFront(p.x, p.z, fx, fz, h.pos.x, h.pos.z, w.width, w.depth, 0.3 * h.sc); if (hit) cand.push(h); }
    cand.sort((a, b) => ((a.pos.x - p.x) ** 2 + (a.pos.z - p.z) ** 2) - ((b.pos.x - p.x) ** 2 + (b.pos.z - p.z) ** 2)); let n = 0;
    for (const h of cand.slice(0, w.maxCut)) {
      n++; h.shake = 1; if (local && !h.scr) { h.scr = true; snd.scream(distMe(h.pos), panOf(h.pos), 1.4); } if (local && Math.random() < 0.7) emit(h.pos.x - fx * 0.3 * h.sc, h.pos.y + HAM.cy * h.sc, h.pos.z - fz * 0.3 * h.sc, -fx * 0.4, 0.9, -fz * 0.4, 2, 3.8, 0.7, 0.01, 0.028);
      if (auth) { h.hp -= (w.id === 'saege' ? w.dps : 30) * dt; if (h.hp <= 0) kill(h, w.id === 'saege' ? 'saege' : 'haecksel', V3(fx, 0, fz), p); }
    }
    return n;
  }
  function weaponTick(p, dt, auth, local) {
    const w = weaponOf(C.weapon); const ws = p.ws; const fire = p.fire && !p.dead && C.phase !== 'ende' && (!local || (!C.paused && C.swapT >= 1)); ws.fireT -= dt;
    if (w.melee) {
      ws.sawStartT = Math.max(0, ws.sawStartT - dt); const on = ws.sawStartT <= 0 && !p.dead; const gas = on && fire ? 1 : 0; let n = 0; if (gas) n = melee(p, w, dt, auth, local);
      ws.cutting += (Math.min(1, n * 0.6) - ws.cutting) * 0.5;
      if (local) { snd.saw(on, gas, ws.cutting, w.id === 'haecksler'); snd.spin(0); if (n && Math.random() < dt * 9) snd.squelch(1.5); if (n && Math.random() < dt * 3) screenBlood(1, 0.4);
        if (w.id === 'saege') { const sw = T.wp.all.saege; sw.chainTex.offset.y -= dt * (on ? 2 + gas * 26 : 0); } else T.wp.all.haecksler.drum.rotation.x -= dt * (on ? 6 + gas * 40 : 0); }
      return;
    }
    if (local) snd.saw(false, 0, 0);
    if (w.id === 'minigun') { ws.spinV = clamp(ws.spinV + (fire ? dt / w.spin : -dt / (w.spin * 2)), 0, 1); if (local) { snd.spin(ws.spinV); T.wp.all.minigun.barrels.rotation.z += dt * ws.spinV * 40; } if (fire && ws.spinV >= 1) { while (ws.fireT <= 0) { ws.fireT += w.rate; shoot(p, w, auth, local); } } else ws.fireT = Math.max(ws.fireT, 0); return; }
    if (local) snd.spin(0);
    if (w.id === 'blatt' && local) T.wp.all.blatt.blade.rotation.y += dt * (fire ? 30 : 8);
    if (fire && ws.fireT <= 0) { ws.fireT = w.rate; shoot(p, w, auth, local); }
  }
  function shoot(p, w, auth, local) {
    eye.set(p.x, PLAYER.eye, p.z); const mz = muzzleOf(p, V3());
    if (w.id === 'blatt' || w.id === 'granate') { aimOf(p, fwd, w.id === 'blatt' ? 0.01 : 0.005); if (auth || local) spawnProj(w.id, mz, fwd.clone().multiplyScalar(w.speed).add(w.id === 'granate' ? V3(0, 3, 0) : V3()), p, auth); if (local) { if (w.id === 'blatt') snd.blade(); else snd.launch(); C.kick = Math.max(C.kick, w.id === 'granate' ? 0.8 : 0.3); } else if (p.av) p.av.flashT = 0.05; return; }
    if (auth) { let hits = 0; for (let k = 0; k < w.pellets; k++) { aimOf(p, fwd, w.spread); let best = null; let bt = w.range; const tf = fwd.y < -1e-3 ? -eye.y / fwd.y : Infinity; if (tf < bt) bt = tf; for (const h of C.ham) { if (h.state === 'dead' || h.state === 'inside') continue; tmp3.set(h.pos.x, h.pos.y + HAM.cy * h.sc, h.pos.z); const t = raySphere(eye, fwd, tmp3, HAM.r * h.sc * 1.08); if (t >= 0 && t < bt) { bt = t; best = h; } } const end = V3().copy(eye).addScaledVector(fwd, Math.min(bt, w.range)); if (local && w.id === 'minigun') tracer(mz, end); if (best) { hits++; const dir = V3(fwd.x, 0, fwd.z).normalize(); emit(end.x, end.y, end.z, fwd.x, 0.3, fwd.z, 10, 4, 0.6); kill(best, w.id === 'schrot' || Math.random() < 0.55 ? 'fetzen' : 'split', dir, p); } } if (hits && local) snd.hitmark(); }
    else if (local && w.id === 'minigun') { aimOf(p, fwd, w.spread); tracer(mz, V3().copy(eye).addScaledVector(fwd, 20)); }
    if (local) { snd.shot(w.id === 'minigun' ? 'minigun' : 'schrot', 0.15); flash(mz, w.id === 'schrot' ? 0.4 : 0.26, w.id === 'schrot' ? 30 : 14); C.kick = Math.max(C.kick, w.id === 'schrot' ? 1 : 0.22); p.pitch = clamp(p.pitch + (w.id === 'schrot' ? 0.035 : 0.004), -1.45, 1.45); }
    else if (p.av) p.av.flashT = 0.05;
  }
  function flash(at, size, light) { T.wp.flash.position.copy(at); T.wp.flash.visible = true; T.wp.flash.material.rotation = Math.random() * 6; T.wp.flash.scale.setScalar(size); C.flashT = 0.05; T.muzzleLight.position.copy(at); T.muzzleLight.intensity = light; }
  function tracer(a, b) { const t = T.tracers[T.trI]; T.trI = (T.trI + 1) % T.tracers.length; const pa = t.l.geometry.attributes.position; pa.setXYZ(0, a.x, a.y, a.z); pa.setXYZ(1, b.x, b.y, b.z); pa.needsUpdate = true; t.life = 0.06; t.l.material.opacity = 0.9; }
  // Geschosse: Sägeblätter fliegen durch, Granaten explodieren. auth = Host rechnet Treffer, sonst nur Bild.
  function spawnProj(k, at, vel, owner, auth, id = 0) {
    const mesh = k === 'blatt' ? bladeMesh(0.22) : grenadeMesh(); mesh.position.copy(at); C.W.scene.add(mesh); const pr = { k, mesh, vel: vel.clone(), life: k === 'blatt' ? weaponOf('blatt').life : 3, bounces: weaponOf('blatt').bounces, hit: new Set(), owner, auth, id };
    C.proj.push(pr); if (auth && C.net) { pr.id = C.projId++; C.net.broadcast({ t: 'sp', id: pr.id, k, o: owner ? owner.id : '', p: [at.x, at.y, at.z].map((v) => Math.round(v * 100)), v: [vel.x, vel.y, vel.z].map((v) => Math.round(v * 100)) }); }
    return pr;
  }
  function stepProj(dt) {
    for (let i = C.proj.length - 1; i >= 0; i--) {
      const pr = C.proj[i]; const m = pr.mesh; pr.life -= dt; let gone = pr.life <= 0;
      if (pr.k === 'blatt') {
        m.position.addScaledVector(pr.vel, dt); m.rotation.y += dt * 40; if (m.position.y < 0.3) { m.position.y = 0.3; pr.vel.y = Math.abs(pr.vel.y) * 0.4; } pr.vel.y -= dt * 2;
        const p = m.position; if (p.x < HALL.x0 || p.x > HALL.x1) { if (pr.bounces-- > 0) { pr.vel.x *= -1; p.x = clamp(p.x, HALL.x0, HALL.x1); snd.clank(distMe(p)); } else gone = true; } if (p.z < HALL.z0 || p.z > HALL.z1) { if (pr.bounces-- > 0) { pr.vel.z *= -1; p.z = clamp(p.z, HALL.z0, HALL.z1); snd.clank(distMe(p)); } else gone = true; }
        if (pr.auth) { const dir = V3(pr.vel.x, 0, pr.vel.z).normalize(); const r = weaponOf('blatt').radius; for (const h of C.ham.slice()) { if (h.state === 'dead' || h.state === 'inside' || pr.hit.has(h.id)) continue; const dx = h.pos.x - p.x; const dz = h.pos.z - p.z; const dy = h.pos.y + HAM.cy * h.sc - p.y; if (dx * dx + dz * dz < (r + 0.3 * h.sc) ** 2 && Math.abs(dy) < 0.6 * h.sc) { pr.hit.add(h.id); kill(h, 'split', dir, pr.owner); } } }
      } else {
        pr.vel.y -= GRAV * 0.6 * dt; m.position.addScaledVector(pr.vel, dt); m.rotation.x += dt * 10; const p = m.position; let boom = p.y <= 0.06; if (p.x < HALL.x0 || p.x > HALL.x1) { pr.vel.x *= -0.5; p.x = clamp(p.x, HALL.x0, HALL.x1); } if (p.z < HALL.z0 || p.z > HALL.z1) { pr.vel.z *= -0.5; p.z = clamp(p.z, HALL.z0, HALL.z1); }
        if (pr.auth && !boom) for (const h of C.ham) { if (h.state !== 'run' && h.state !== 'fly') continue; const dx = h.pos.x - p.x; const dz = h.pos.z - p.z; const dy = h.pos.y + HAM.cy * h.sc - p.y; if (dx * dx + dz * dz + dy * dy < (0.45 * h.sc) ** 2) { boom = true; break; } }
        if (pr.auth && (boom || gone)) { explode(p.x, Math.max(0.1, p.y), p.z, pr.owner); if (C.net) C.net.broadcast({ t: 'sx', id: pr.id, p: [p.x, p.y, p.z].map((v) => Math.round(v * 100)) }); gone = true; } else if (!pr.auth && p.y <= 0.06) { m.visible = false; pr.vel.set(0, 0, 0); }
      }
      if (gone) { C.W.scene.remove(m); C.proj.splice(i, 1); }
    }
  }
  function explode(x, y, z, owner) {
    boomFx(x, y, z); if (!isHost()) return; const R = weaponOf('granate').radius; for (const h of C.ham.slice()) { if (h.state !== 'run' && h.state !== 'fly') continue; const dx = h.pos.x - x; const dz = h.pos.z - z; const d = Math.hypot(dx, dz); if (d < R) kill(h, d < R * 0.6 ? 'boom' : 'fetzen', V3(dx, 0, dz).normalize(), owner); }
  }
  function boomFx(x, y, z) { const b = T.booms.find((q) => q.life <= 0) || T.booms[0]; b.s.position.set(x, y + 0.5, z); b.s.visible = true; b.life = 0.45; T.boomLight.position.set(x, y + 1, z); T.boomLight.intensity = 60; const d = distMe({ x, z }); snd.boom(d, panOf({ x, z })); if (d < 9) C.kick = Math.max(C.kick, 1.2 - d * 0.1); for (let k = 0; k < 6; k++) splat(x + rand(-1.5, 1.5), z + rand(-1.5, 1.5), rand(0.6, 1.4), 0.5); }

  // ---------------- Spieler ----------------
  function stepMe(dt) {
    const p = me(); if (!p) return; const k = C.keys; let ix = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0); let iz = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0); if (k.ArrowLeft) p.yaw += dt * 2.4; if (k.ArrowRight) p.yaw -= dt * 2.4; if (k.ArrowUp) p.pitch = clamp(p.pitch + dt * 1.6, -1.45, 1.45); if (k.ArrowDown) p.pitch = clamp(p.pitch - dt * 1.6, -1.45, 1.45);
    if (p.dead || C.phase === 'ende' || C.paused) { ix = 0; iz = 0; } const l = Math.hypot(ix, iz) || 1; const sp = k.ShiftLeft || k.ShiftRight ? PLAYER.sprint : PLAYER.speed; const fx = -Math.sin(p.yaw); const fz = -Math.cos(p.yaw); const rx = Math.cos(p.yaw); const rz = -Math.sin(p.yaw);
    const tvx = ((fx * iz + rx * ix) / l) * sp; const tvz = ((fz * iz + rz * ix) / l) * sp; const a = 1 - Math.exp(-dt * 12); p.vx += (tvx - p.vx) * a; p.vz += (tvz - p.vz) * a; p.x += p.vx * dt; p.z += p.vz * dt;
    clampHall(p, 0.35); for (const s of C.W.solids) { const ex = p.x - s.x; const ez = p.z - s.z; const md = s.r + 0.3; const dd = ex * ex + ez * ez; if (dd < md * md) { const q = Math.sqrt(dd) || 1; p.x = s.x + (ex / q) * md; p.z = s.z + (ez / q) * md; } }
    if (C.truck.rear > TRUCK.rearOut + 1) pushOutOfTruck(p, C.truck.rear);
    p.bob += dt * Math.hypot(p.vx, p.vz) * 1.9; p.hurtT += dt;
  }
  function stepPlayersHost(dt) { for (const p of C.players) { p.biteCd = Math.max(0, p.biteCd - dt); if (p.id !== C.meId) p.hurtT += dt; if (!p.dead && p.hurtT > 2.5) p.hp = Math.min(PLAYER.hp, p.hp + PLAYER.regen * dt); } }
  function playerDies(p) { p.dead = true; p.fire = false; p.hp = 0; if (p.id === C.meId) { snd.fail(); C.fire = false; } if (!livePlayers().length) setPhase('ende'); }
  // Mitspieler als Figuren
  function nameSprite(text, col) { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.font = '700 52px Bahnschrift, Segoe UI, sans-serif'; x.textAlign = 'center'; x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(text, 256, 66); x.fillStyle = col; x.fillText(text, 256, 66); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(1.1, 0.21, 1); s.renderOrder = 12; return s; }
  function ensureAvatar(p) { if (p.id === C.meId || p.av) return; const a = buildAvatar(new THREE.Color(SEAT_COL[p.seat % 4]).getHex()); a.label = nameSprite(p.name, SEAT_COL[p.seat % 4]); a.label.position.set(0, 2.05, 0); a.group.add(a.label); const fl = new THREE.Sprite(T.wp.flash.material.clone()); fl.scale.setScalar(0.3); fl.visible = false; a.flash = fl; C.W.scene.add(fl); a.flashT = 0; a.group.position.set(p.x, 0, p.z); C.W.scene.add(a.group); p.av = a; holdWeapon(p); }
  function holdWeapon(p) { const a = p.av; if (!a) return; if (a.gun) a.holder.remove(a.gun); const src = T.wp.all[C.weapon].group; a.gun = src.clone(); a.gun.visible = true; a.gun.position.set(0, 0, 0); a.gun.rotation.set(0, 0, 0); if (C.weapon === 'haecksler') { a.gun.scale.setScalar(0.7); a.gun.position.set(-0.05, -1.0, -0.5); } a.holder.add(a.gun); }
  function dropAvatar(p) { if (!p.av) return; C.W.scene.remove(p.av.group); C.W.scene.remove(p.av.flash); p.av = null; }
  function stepAvatars(dt) {
    const k = 1 - Math.exp(-dt * 10);
    for (const p of C.players) { if (p.id === C.meId) continue; ensureAvatar(p); const a = p.av; const px = a.group.position.x; const pz = a.group.position.z;
      if (isHost()) { a.group.position.x += (p.x - px) * k; a.group.position.z += (p.z - pz) * k; } else { p.x += (p.tx - p.x) * k; p.z += (p.tz - p.z) * k; let dy = p.tyaw - p.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.yaw += dy * k; a.group.position.x = p.x; a.group.position.z = p.z; }
      const moved = Math.hypot(a.group.position.x - px, a.group.position.z - pz) / Math.max(dt, 1e-3); a.walk = (a.walk || 0) + dt * moved * 2.2; a.group.rotation.set(p.dead ? -Math.PI / 2 : 0, p.yaw, 0); a.group.position.y = p.dead ? 0.2 : 0; a.legs.forEach((l, i) => { l.rotation.x = Math.sin(a.walk + i * Math.PI) * Math.min(0.6, moved * 0.12); });
      a.holder.rotation.x = p.pitch * 0.8; a.holder.position.z = C.weapon === 'saege' && p.fire && !p.dead ? -0.35 + Math.sin(C.tAbs * 40) * 0.01 : -0.25;
      if (!isHost() && p.fire && !p.dead && !weaponOf(C.weapon).melee && Math.random() < dt * 14) a.flashT = 0.05; a.flashT -= dt; a.flash.visible = a.flashT > 0; if (a.flash.visible) { a.holder.getWorldPosition(a.flash.position); a.flash.position.addScaledVector(aimOf(p, tmp2), 0.6); }
    }
  }

  // ---------------- Ablauf (Host) ----------------
  function setPhase(ph) { C.phase = ph; C.phaseT = 0; onPhase(ph); hudTop(); if (C.net && C.host) snapshot(); }
  function onPhase(ph) {
    if (ph === 'geschafft') { snd.fanfare(); const nw = wave(C.wave + 1); big(`WELLE ${C.wave + 1} GESCHAFFT!`, `Nächste: ${nw.count} Hamster mit ${weaponOf(nw.weapon).name}`); record(true); }
    if (ph === 'tor') big(`WELLE ${C.wave + 1}`, `${C.cfg.count} Hamster · ${weaponOf(C.cfg.weapon).name}`);
    if (ph === 'ende') { snd.fail(); C.fire = false; unlock(); record(false); showEnd(); }
  }
  function record(done) { const best = C.wave + (done ? 1 : 0); if (best > C.best) { C.best = best; store.set('sgBest', best); } store.set('sgKills', C.kills); }
  function startWave(w) {
    clearAll(); C.wave = w; C.cfg = wave(w); C.killed = 0; C.toSpawn = C.cfg.count; C.truck.rear = TRUCK.rearOut; C.truck.doorK = 0; C.truck.gateK = 0;
    for (const p of C.players) { p.hp = PLAYER.hp; p.dead = false; p.hurtT = 9; } setWeaponModel(C.cfg.weapon, false); $('sgEnd').classList.add('hidden'); setPhase('tor');
  }
  function startGame() { for (const p of C.players) { const s = spawnPoint(p.seat); p.x = s.x; p.z = s.z; p.yaw = 0; p.pitch = -0.12; p.kills = 0; } startWave(0); }
  function stepPhase(dt) {
    C.phaseT += dt; const t = C.phaseT; const tr = C.truck; const ph = C.phase; const L = PHASE_LEN;
    if (ph === 'tor') { tr.gateK = ease(t / L.tor); if (t >= L.tor) setPhase('lkw'); }
    else if (ph === 'lkw') { const u = clamp(t / L.lkw, 0, 1); tr.rear = TRUCK.rearOut + (TRUCK.rearIn - TRUCK.rearOut) * (1 - Math.pow(1 - u, 2.2)); if (t >= L.lkw) setPhase('tueren'); }
    else if (ph === 'tueren') { tr.doorK = ease(t / L.tueren); if (t >= L.tueren) setPhase('raus'); }
    else if (ph === 'raus' || ph === 'kampf') { if (ph === 'raus') { C.spawnT -= dt; while (C.spawnT <= 0 && C.toSpawn > 0 && insideCount() < 32 && C.alive < FIELD_MAX) { C.spawnT += 1 / 20; if (!spawnInside()) break; C.toSpawn--; } if (C.spawnT < -1) C.spawnT = 0; if (C.toSpawn <= 0) setPhase('kampf'); } if (C.phase === 'kampf' && C.alive <= 0) setPhase('geschafft'); }
    else if (ph === 'geschafft') { tr.doorK = 1 - ease((t - 1.2) / 1); const u = clamp((t - 2.3) / 3, 0, 1); tr.rear = TRUCK.rearIn + (TRUCK.rearOut - TRUCK.rearIn) * u * u; tr.gateK = 1 - ease((t - 5.2) / 1.6); if (t >= L.geschafft) startWave(C.wave + 1); }
  }
  // Tor, LKW, Türen: Bild und Ton aus dem Zustand (läuft bei allen)
  let lastDoor = 0; let lastRear = TRUCK.rearOut;
  function stepTruckFx(dt) {
    const tr = C.truck; const p = me(); const dTruck = p ? Math.hypot(p.x, p.z - (tr.rear - 4)) : 15; const moving = Math.abs(tr.rear - lastRear) > dt * 0.3; const ph = C.phase;
    snd.truck(tr.rear > TRUCK.rearOut + 0.5 ? (moving ? 1 : 0.4) : 0, ph === 'lkw' && (C.phaseT % 1) < 0.5, dTruck); snd.gate((ph === 'tor' && C.phaseT < PHASE_LEN.tor) || (ph === 'geschafft' && C.phaseT > 5.2 && C.phaseT < 6.8));
    for (const wh of T.truck.wheels) wh.rotation.x += (tr.rear - lastRear) * 1.9; if ((lastDoor < 0.02 && tr.doorK >= 0.02) || (lastDoor > 0.98 && tr.doorK <= 0.98)) snd.clank(dTruck);
    lastDoor = tr.doorK; lastRear = tr.rear; T.truck.group.position.set(0, 0, tr.rear); T.truck.group.visible = tr.rear > TRUCK.rearOut + 0.5; T.truck.setDoors(tr.doorK); const gt = C.W.gate; C.W.door.position.y = gt.h / 2 + tr.gateK * (gt.h - 0.2);
  }

  // ---------------- Netz ----------------
  const r2 = (v) => Math.round(v * 100);
  function snapshot() {
    const h = []; for (const x of C.ham) h.push(x.id, x.look * 1000 + Math.round(x.sc * 100), r2(x.pos.x), r2(x.pos.y), r2(x.pos.z), r2(x.yaw), STATE.indexOf(x.state));
    C.net.broadcast({ t: 'ss', ph: C.phase, pt: Math.round(C.phaseT * 100) / 100, w: C.wave, tr: [r2(C.truck.rear), r2(C.truck.doorK), r2(C.truck.gateK)], ts: C.toSpawn, k: C.killed, pl: C.players.map((p) => [p.id, p.name, p.seat, r2(p.x), r2(p.z), r2(p.yaw), r2(p.pitch), Math.round(p.hp), p.dead ? 1 : 0, p.fire ? 1 : 0, p.kills]), h });
  }
  function netTick(dt) {
    if (!C.net) return; C.sendT += dt; C.snapT += dt;
    if (C.host) { if (C.killQ.length) { C.net.broadcast({ t: 'sk', k: C.killQ }); C.killQ = []; } if (C.snapT >= 0.1) { C.snapT = 0; snapshot(); } }
    else if (C.sendT >= 0.05) { C.sendT = 0; const p = me(); if (p) C.net.send({ t: 'si', x: r2(p.x), z: r2(p.z), yaw: r2(p.yaw), pitch: r2(p.pitch), f: p.fire ? 1 : 0, e: C.edges }); }
  }
  function message(from, m) {
    if (!C.on || !m) return;
    if (C.host) {
      if (m.t === 'si') { const p = C.players.find((q) => q.id === from); if (!p) return; if (p.dead) { p.fire = false; return; } const n = (v) => (Number.isFinite(v) ? v / 100 : 0); p.x = clamp(n(m.x), HALL.x0, HALL.x1); p.z = clamp(n(m.z), HALL.z0, HALL.z1); p.yaw = n(m.yaw); p.pitch = clamp(n(m.pitch), -1.5, 1.5); p.fire = !!m.f; if (Number.isFinite(m.e) && m.e > p.ws.lastE) { p.ws.lastE = m.e; p.ws.edge = true; } }
      return;
    }
    if (m.t === 'ss') applySnapshot(m);
    else if (m.t === 'sk') { const k = Array.isArray(m.k) ? m.k : []; for (let i = 0; i + 3 < k.length; i += 4) { const h = C.byId.get(k[i]); C.deadIds.add(k[i]); if (h) kill(h, KIND[k[i + 1]] || 'split', V3(k[i + 2] / 100, 0, k[i + 3] / 100).normalize()); } }
    else if (m.t === 'sp') { if (m.o === C.meId) return; const p = (m.p || []).map((v) => v / 100); const v = (m.v || []).map((x) => x / 100); const owner = C.players.find((q) => q.id === m.o); if (p.length === 3 && v.length === 3) spawnProj(m.k === 'granate' ? 'granate' : 'blatt', V3(...p), V3(...v), owner, false, m.id); }
    else if (m.t === 'sx') { const p = (m.p || []).map((v) => v / 100); const at = p.length === 3 ? V3(...p) : null; const i = C.proj.findIndex((q) => q.k === 'granate' && (q.id === m.id || (at && q.mesh.position.distanceTo(at) < 2.5))); if (i >= 0) { C.W.scene.remove(C.proj[i].mesh); C.proj.splice(i, 1); } if (at) boomFx(at.x, at.y, at.z); }
  }
  function applySnapshot(m) {
    if (m.w !== C.wave || !C.got) { const fresh = C.got && m.w !== C.wave; C.got = true; C.wave = m.w | 0; C.cfg = wave(C.wave); setWeaponModel(C.cfg.weapon, !fresh); }
    if (m.ph !== C.phase) { const was = C.phase; C.phase = m.ph; if (m.ph === 'tor') { clearAll(); $('sgEnd').classList.add('hidden'); } if (was !== 'off' || m.ph === 'tor') onPhase(m.ph); hudTop(); } C.phaseT = m.pt || 0;
    if (Array.isArray(m.tr)) { C.truck.rear = m.tr[0] / 100; C.truck.doorK = m.tr[1] / 100; C.truck.gateK = m.tr[2] / 100; } C.toSpawn = m.ts | 0; C.killed = m.k | 0;
    const seen = new Set(); for (const q of m.pl || []) { const [id, name, seat, x, z, yaw, pitch, hp, dead, fire, kills] = q; seen.add(id); let p = C.players.find((o) => o.id === id); if (!p) { p = newPlayer(id, String(name || '?').slice(0, 16), seat | 0); p.x = p.tx = x / 100; p.z = p.tz = z / 100; C.players.push(p); }
      if (id === C.meId) { if (hp < p.hp) { p.hurtT = 0; snd.bite(); if (Math.random() < 0.4) snd.hurt(); } if (dead && !p.dead) { snd.fail(); C.fire = false; } if (C.phase === 'tor' && C.phaseT < 0.25 && C.wave === 0 && !C.placed) { p.x = x / 100; p.z = z / 100; p.yaw = 0; C.placed = true; } p.hp = hp; p.dead = !!dead; p.kills = kills; continue; }
      p.tx = x / 100; p.tz = z / 100; p.tyaw = yaw / 100; p.pitch = pitch / 100; p.hp = hp; p.dead = !!dead; p.fire = !!fire; p.kills = kills; }
    for (const p of C.players.slice()) if (!seen.has(p.id)) { dropAvatar(p); C.players.splice(C.players.indexOf(p), 1); }
    const h = Array.isArray(m.h) ? m.h : []; const live = new Set();
    for (let i = 0; i + 6 < h.length; i += 7) { const id = h[i]; live.add(id); if (C.deadIds.has(id)) continue; const look = clamp(Math.floor(h[i + 1] / 1000), 0, LOOKS.length - 1); const sc = (h[i + 1] % 1000) / 100; const x = h[i + 2] / 100; const y = h[i + 3] / 100; const z = h[i + 4] / 100; const st = STATE[h[i + 6]] || 'run'; let x0 = C.byId.get(id); if (!x0) { x0 = addHam(id, look, sc, x, y, z, st); if (!x0) continue; } x0.tgt.set(x, y, z); x0.tyaw = h[i + 5] / 100; if (x0.state === 'fly' && st === 'run') x0.squash = 1; x0.state = st; }
    for (const x of C.ham.slice()) if (!live.has(x.id)) removeHam(x);
  }
  function playerJoined(id, name) { if (!C.host || C.players.some((p) => p.id === id) || C.players.length >= 4) return; const used = new Set(C.players.map((p) => p.seat)); let seat = 0; while (used.has(seat)) seat++; const p = newPlayer(id, name, seat); if (C.phase !== 'tor') { p.dead = true; p.hp = 0; } C.players.push(p); C.net.sendTo(id, { t: 'start', mode: 'saege' }); setTimeout(() => { if (C.net && C.on) snapshot(); }, 300); }
  function playerLeft(id) { const p = C.players.find((q) => q.id === id); if (!p) return; dropAvatar(p); C.players.splice(C.players.indexOf(p), 1); if (C.host && C.phase !== 'ende' && C.players.length && !livePlayers().length) setPhase('ende'); }

  // ---------------- Anzeige ----------------
  function big(a, b) { const el = $('sgBig'); el.innerHTML = ''; const x = document.createElement('b'); x.textContent = a; const y = document.createElement('small'); y.textContent = b || ''; el.append(x, y); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); clearTimeout(C.bigT); C.bigT = setTimeout(() => el.classList.remove('pop'), 2600); }
  function hudTop() { $('sgWave').textContent = C.phase === 'off' || C.phase === 'start' ? '' : `Welle ${C.wave + 1}`; }
  function hudWeapon() { $('sgWeap').textContent = weaponOf(C.weapon).name; hudAmmo(); }
  function hudAmmo() { const p = me(); const ws = p ? p.ws : newWs(); const txt = C.weapon === 'minigun' ? (ws.spinV < 1 && p && p.fire ? 'läuft an …' : '') : weaponOf(C.weapon).melee ? (ws.sawStartT > 0 ? 'springt an …' : '') : ''; const el = $('sgAmmo'); if (el.textContent !== txt) el.textContent = txt; }
  function hudPlayers() { const box = $('sgPlayers'); box.textContent = ''; if (!C.net) return; for (const p of C.players) { const d = document.createElement('div'); d.className = 'sg-pl' + (p.dead ? ' dead' : '') + (p.id === C.meId ? ' me' : ''); const dot = document.createElement('i'); dot.style.background = SEAT_COL[p.seat % 4]; const nm = document.createElement('b'); nm.textContent = p.name; const bar = document.createElement('span'); const f = document.createElement('em'); f.style.width = `${Math.max(0, p.hp)}%`; bar.append(f); const k = document.createElement('small'); k.textContent = p.dead ? 'raus' : String(p.kills); d.append(dot, nm, bar, k); box.append(d); } }
  function showEnd() {
    $('sgEndTitle').textContent = `Welle ${C.wave + 1} nicht geschafft`; const list = $('sgEndList'); list.textContent = ''; const rows = [...C.players].sort((a, b) => b.kills - a.kills); for (const p of rows) { const li = document.createElement('li'); li.textContent = `${p.name}: ${p.kills} Hamster`; li.style.color = SEAT_COL[p.seat % 4]; list.append(li); }
    $('sgEndText').textContent = `Weiteste Welle: ${C.best} · Hamster insgesamt: ${C.kills}`; $('sgEndAgain').classList.toggle('hidden', !isHost()); $('sgEndWait').classList.toggle('hidden', isHost()); $('sgEnd').classList.remove('hidden');
  }
  let hpT = 0;
  function hudTick(dt) {
    const p = me(); const fighting = C.phase === 'raus' || C.phase === 'kampf'; $('sgCount').textContent = fighting || C.phase === 'ende' ? `🐹 ${isHost() ? C.alive + C.toSpawn : C.ham.length + C.toSpawn}` : ''; if (p) { $('sgHpF').style.width = `${p.hp}%`; $('sgHpF').classList.toggle('low', p.hp < 30); }
    $('sgHurt').style.opacity = String(p ? clamp(1 - p.hurtT * 2.2, 0, 0.7) + (p.hp < 30 && !p.dead ? 0.18 + Math.sin(C.tAbs * 5) * 0.08 : 0) : 0); const locked = document.pointerLockElement === canvas; $('sgHint').classList.toggle('hidden', locked || C.phase === 'ende' || C.paused || C.phase === 'start' || C.phase === 'off');
    $('sgOut').classList.toggle('hidden', !(p && p.dead && C.phase !== 'ende')); hpT += dt; if (C.net && hpT > 0.25) { hpT = 0; hudPlayers(); } hudAmmo();
  }

  // ---------------- Kamera und Bild ----------------
  function camera(dt) {
    const p = me(); const cam = C.cam; if (!p) return; const bob = Math.sin(p.bob) * 0.035 * Math.min(1, Math.hypot(p.vx, p.vz) / 4); cam.position.set(p.x, p.dead ? 0.45 : PLAYER.eye + bob, p.z); cam.rotation.order = 'YXZ'; cam.rotation.set(p.pitch, p.yaw, p.dead ? 0.5 : 0);
    if (C.kick > 0) { cam.rotation.x += C.kick * 0.012; cam.position.x += rand(-1, 1) * C.kick * 0.01; } if (p.ws.cutting > 0.1) { cam.position.x += rand(-1, 1) * 0.006 * p.ws.cutting; cam.position.y += rand(-1, 1) * 0.006 * p.ws.cutting; }
    cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); cam.updateProjectionMatrix();
    const m = T.wp.all[C.weapon]; T.wp.root.visible = !p.dead; if (!m) return; C.swapT = Math.min(1, C.swapT + dt * 3.5); const sw = 1 - ease(C.swapT); m.group.position.copy(m.base); m.group.rotation.copy(m.baseRot); m.group.position.x += Math.cos(p.bob * 0.5) * 0.012; m.group.position.y += Math.abs(Math.sin(p.bob * 0.5)) * 0.012 - sw * 0.5 - C.kick * 0.02; m.group.position.z += C.kick * 0.09; m.group.rotation.x += C.kick * 0.18 - sw * 0.6;
    const ws = p.ws; if (weaponOf(C.weapon).melee) { const on = ws.sawStartT <= 0; const v = on ? (p.fire ? 0.006 : 0.0025) : 0.01 * (ws.sawStartT % 0.32 > 0.16 ? 1 : 0); m.group.position.x += rand(-1, 1) * v; m.group.position.y += rand(-1, 1) * v; if (C.weapon === 'saege' && p.fire && on) { m.group.position.z -= 0.1; m.group.position.y += 0.03; m.group.rotation.x += -0.08 + Math.sin(C.tAbs * 6) * 0.04; m.group.rotation.y += Math.sin(C.tAbs * 3.1) * 0.12; } }
    if (C.weapon === 'granate') T.wp.all.granate.drum.rotation.y = ws.fireT > 0 ? (1 - ws.fireT / weaponOf('granate').rate) * 1.05 : 0;
    C.kick = Math.max(0, C.kick - dt * 6);
  }
  function render(dt) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); if (renderer.getPixelRatio() !== dpr) { renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false); }
    if (C.flashT > 0) { C.flashT -= dt; if (C.flashT <= 0) T.wp.flash.visible = false; } T.muzzleLight.intensity *= Math.exp(-dt * 30); T.boomLight.intensity *= Math.exp(-dt * 8); for (const t of T.tracers) if (t.life > 0) { t.life -= dt; t.l.material.opacity = clamp(t.life / 0.06, 0, 1) * 0.9; }
    for (const b of T.booms) if (b.life > 0) { b.life -= dt; const u = 1 - b.life / 0.45; b.s.scale.setScalar(1 + u * 6); b.s.material.opacity = clamp(1 - u, 0, 1); if (b.life <= 0) b.s.visible = false; }
    renderer.shadowMap.needsUpdate = !!settings.shadows; renderer.render(C.W.scene, C.cam);
  }
  function frame(dt, tAbs) {
    if (!C.on || !C.W) return; const real = Math.min(dt, 0.05); C.tAbs = tAbs; const run = C.phase !== 'start' && !(C.phase === 'off' && isHost()) && !(!C.net && C.paused);
    if (run) {
      const p = me(); if (p) p.fire = C.fire && !C.paused;
      if (isHost()) { stepPhase(real); stepMe(real); stepPlayersHost(real); for (const q of C.players) weaponTick(q, real, true, q.id === C.meId); stepHamstersHost(real); } else { stepMe(real); if (p) weaponTick(p, real, false, true); stepHamstersClient(real); }
      if (C.ham.length && Math.random() < real * 3) { const h = C.ham[(Math.random() * C.ham.length) | 0]; if (h.state === 'run') snd.piep(distMe(h.pos), panOf(h.pos)); }
      stepProj(real); stepAvatars(real); stepTruckFx(real); stepGibs(real, C.phase === 'geschafft' && C.phaseT > 3.6); stepDrops(real); fadeScreenBlood(real); flushInst(); netTick(real);
    } else snd.silence();
    C.W.update(tAbs); camera(real); hudTick(real); render(real);
  }

  // ---------------- Eingabe ----------------
  const isPlaying = () => C.on && !C.paused && C.phase !== 'start' && C.phase !== 'off' && C.phase !== 'ende';
  function lock() { if (document.pointerLockElement !== canvas) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* egal */ } } }
  function unlock() { if (document.pointerLockElement === canvas) { C.quiet = true; document.exitPointerLock(); setTimeout(() => { C.quiet = false; }, 200); } }
  function pause(on) { if (C.phase === 'start' || C.phase === 'ende') return; C.paused = on; C.fire = false; $('sgPause').classList.toggle('hidden', !on); $('sgPauseNet').classList.toggle('hidden', !C.net); if (on) unlock(); }
  function fireDown() { C.fire = true; C.edges++; }
  function onKey(e, down) {
    if (!C.on || (e.target && e.target.tagName === 'INPUT')) return false; const code = e.code;
    if (down && code === 'Escape') { if (!$('sgStart').classList.contains('hidden') || !$('sgEnd').classList.contains('hidden')) back(); else pause(!C.paused); return true; }
    C.keys[code] = down; if (!down || e.repeat) return true; if (!isPlaying()) return true; if (code === 'Space' || code === 'KeyF') fireDown(); return true;
  }
  window.addEventListener('keydown', (e) => { if (onKey(e, true)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('keyup', (e) => { if (!C.on) return; C.keys[e.code] = false; if (e.code === 'Space' || e.code === 'KeyF') C.fire = false; e.stopImmediatePropagation(); }, true);
  window.addEventListener('blur', () => { C.keys = {}; C.fire = false; });
  canvas.addEventListener('mousedown', (e) => { if (!isPlaying()) return; audio.init(); snd.ensure(); if (document.pointerLockElement !== canvas) lock(); if (e.button === 0) fireDown(); });
  window.addEventListener('mouseup', (e) => { if (C.on && e.button === 0) C.fire = false; });
  window.addEventListener('mousemove', (e) => { if (!C.on || document.pointerLockElement !== canvas || C.paused) return; const p = me(); if (!p) return; const s = 0.0021 * (settings.mouse || 1); p.yaw -= e.movementX * s; p.pitch = clamp(p.pitch - e.movementY * s, -1.45, 1.45); });
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas && C.on && !C.quiet && isPlaying()) pause(true); });

  // ---------------- Öffnen, Verlassen ----------------
  function applyRenderer(on) { if (on) { if (C.prevTone === undefined) { C.prevTone = renderer.toneMapping; C.prevExp = renderer.toneMappingExposure; } renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; } else if (C.prevTone !== undefined) { renderer.toneMapping = C.prevTone; renderer.toneMappingExposure = C.prevExp; C.prevTone = undefined; } }
  function enter() { build(); for (const p of C.players) dropAvatar(p); C.on = true; C.paused = false; G.mode = 'saege'; showScreen(null); $('hud').classList.add('hidden'); hud.classList.remove('hidden'); applyRenderer(true); clearAll(); for (const id of ['sgPause', 'sgEnd', 'sgStart']) $(id).classList.add('hidden'); blots.length = 0; T.bx.clearRect(0, 0, T.bc.width, T.bc.height); C.truck.rear = TRUCK.rearOut; C.truck.gateK = 0; C.truck.doorK = 0; C.wave = 0; C.cfg = wave(0); C.got = false; C.placed = false; C.killQ = []; }
  function open() { C.net = null; C.host = true; C.meId = 'me'; enter(); C.players = [newPlayer('me', store.get('mpName', 'Du') || 'Du', 0)]; C.phase = 'start'; stepTruckFx(0); $('sgStart').classList.remove('hidden'); $('sgBest').textContent = C.best ? `Weiteste Welle: ${C.best} · Hamster insgesamt: ${C.kills}` : ''; $('sgCount').textContent = ''; hudTop(); hudPlayers(); setWeaponModel('saege', true); }
  function go() { audio.init(); snd.ensure(); $('sgStart').classList.add('hidden'); startGame(); lock(); }
  function startCoop({ net, host }) {
    C.net = net; C.host = host; C.meId = (net.me && net.me.id) || (host ? 'host' : 'me'); enter(); audio.init(); snd.ensure(); C.phase = 'off';
    if (host) { C.players = net.players.slice(0, 4).map((q, i) => newPlayer(q.id, q.name, i)); if (!me() && C.players[0]) C.meId = C.players[0].id; startGame(); } else C.players = [];
    hudPlayers(); hudTop(); setWeaponModel(C.cfg.weapon, true);
  }
  function again() { if (!isHost()) return; $('sgEnd').classList.add('hidden'); startGame(); lock(); }
  function back() { if (C.net) { stop(); if (endSession) endSession(); return; } stop(); showScreen('gallery'); }
  function stop() { if (!C.on) return; C.on = false; C.paused = false; C.fire = false; C.keys = {}; unlock(); snd.silence(); hud.classList.add('hidden'); for (const id of ['sgStart', 'sgPause', 'sgEnd']) $(id).classList.add('hidden'); if (C.W) { clearAll(); for (const p of C.players) dropAvatar(p); } C.players = []; C.net = null; C.host = true; C.phase = 'off'; applyRenderer(false); store.set('sgKills', C.kills); if (G.mode === 'saege') G.mode = 'menu'; }
  $('sgGo').onclick = go; $('sgBack').onclick = back; $('sgResume').onclick = () => { pause(false); lock(); }; $('sgQuit').onclick = back; $('sgEndAgain').onclick = again; $('sgEndBack').onclick = back;

  // für Tests
  const lookAt = (x, y, z) => { const p = me(); const dx = x - p.x; const dz = z - p.z; p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(y - PLAYER.eye, Math.hypot(dx, dz)); };
  const setFire = (v) => { if (v) fireDown(); else C.fire = false; };
  return { open, stop, frame, startCoop, message, playerJoined, playerLeft, hide: () => {}, active: () => C.on, state: C, go, again, lookAt, setFire, startWave, kill: (h, kind, dir) => kill(h, kind, dir, me()), me, sound: snd, parts: T };
}
