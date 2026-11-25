// Theos Seitenscheidel - Kraftprobe (intern kraft): drei Schlagplätze nebeneinander, zehn Ziele. Hämmern zieht den Kraftring auf den Zielkreis, Zuschlagen im grünen Bereich zerlegt das Ziel.
// Allein gegen zwei KI, zu dritt an einem PC oder online. Online rechnet jeder seinen eigenen Ring (sonst spürt man die Verzögerung beim Hämmern), der Host führt den Ablauf, spielt die KI-Plätze und zählt die Punkte.
import * as THREE from './vendor/three.module.min.js';
import { SEATS, TARGETS, COUNT, AIM_TIME, INTRO, SHOW, RT, newRing, tapRing, stepRing, inZone, offset, judge, ringTarget, timeLeft, TIMEOUT, WHY, points, newMatch, record, roundDone, nextRound, hits, newBot, botStep, rng } from './kraftlogic.js';
import { buildKraftWorld, buildTarget, createDebris, createRing, STATION_X, SEAT_COL } from './kraftart.js';
import { createFigure } from './racefigure.js';
import { outerFigureMaterial } from './parkart.js';
import { spriteBlend } from './raceinterior.js';
import { createTour } from './tour.js';

const LOOKS = [{ shirt: 0xc0332a, cap: 0x8a221c, hair: 0x3a2a1e, skin: 0xe2b08c }, { shirt: 0x2c62c8, cap: 0x1c3f86, hair: 0x1e1a18, skin: 0xd8a47e }, { shirt: 0xe8a21c, cap: 0xa86a10, hair: 0x5a3a1e, skin: 0xe8bc98 }];
const BOTS = ['KI Theo', 'KI Bruno', 'KI Nele'];
const DT = 1 / 120; const NET_HZ = 1 / 15; const IMPACT = 0.24;
const TAP_KEYS = new Set(['Space', 'KeyA', 'KeyS', 'KeyJ', 'KeyK']); const HIT_KEYS = new Set(['Enter', 'NumpadEnter']);
const LOCAL_KEYS = [{ tap: 'KeyA', hit: 'KeyW' }, { tap: 'KeyJ', hit: 'KeyI' }, { tap: 'ArrowLeft', hit: 'ArrowUp' }];
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---- Tutorial: der Ring als kleine Zeichnung
function ringDraw(c, w, h, r, rt, tol, green, label) {
  c.fillStyle = '#16120e'; c.fillRect(0, 0, w, h); const s = Math.min(w, h) * 0.42; const x = w / 2; const y = h / 2;
  c.fillStyle = '#6b4a2e'; c.fillRect(x - s * 0.9, y - s * 0.12, s * 1.8, s * 0.24); c.fillStyle = '#4a4440'; c.fillRect(x - s * 0.95, y + s * 0.12, s * 0.35, s * 0.9); c.fillRect(x + s * 0.6, y + s * 0.12, s * 0.35, s * 0.9);
  c.lineWidth = s * (rt + tol - (rt - tol)); c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(x, y, s * rt, 0, 7); c.stroke();
  c.lineWidth = 3; c.strokeStyle = '#ffd88a'; c.beginPath(); c.arc(x, y, s * rt, 0, 7); c.stroke();
  c.lineWidth = 6; c.strokeStyle = green ? '#3df28a' : '#ff5a44'; c.shadowColor = c.strokeStyle; c.shadowBlur = 16; c.beginPath(); c.arc(x, y, s * r, 0, 7); c.stroke(); c.shadowBlur = 0;
  if (label) { c.fillStyle = '#fff'; c.font = `700 ${Math.round(s * 0.16)}px Bahnschrift, sans-serif`; c.textAlign = 'center'; c.fillText(label, x, h - s * 0.12); }
}
const STEPS = [
  { t: 'Der Kraftring', x: 'Über deinem Ziel liegt ein roter Ring. Hämmere auf die Leertaste (oder A, S, J, K, linke Maus), dann zieht er sich zusammen. Hörst du auf, wächst er wieder.', draw: (c, w, h, t) => ringDraw(c, w, h, 0.95 - ((t * 0.4) % 0.55), RT, 0.07, false, 'Hämmern!') },
  { t: 'Grün heißt zuschlagen', x: 'Liegt der Ring genau auf dem goldenen Zielkreis, wird er grün. Jetzt Enter (oder rechte Maus) drücken: Dann zerlegst du das Ziel. Je genauer, desto mehr Punkte.', draw: (c, w, h, t) => ringDraw(c, w, h, RT + Math.sin(t * 3) * 0.03, RT, 0.07, true, 'Enter!') },
  { t: 'Zu viel ist auch daneben', x: 'Hämmerst du zu wild, wird der Ring kleiner als der Zielkreis und wieder rot. Du hast nur einen Schlag pro Ziel und zehn Sekunden Zeit.', draw: (c, w, h, t) => ringDraw(c, w, h, 0.2 + Math.sin(t * 2) * 0.04, RT, 0.07, false, 'Zu viel Kraft') },
  { t: 'Zehn Ziele, drei Spieler', x: 'Alle drei schlagen gleichzeitig auf ihr eigenes Ziel. Von Latten bis Mondgestein wird es immer härter. Wer nach zehn Zielen die meisten Punkte hat, gewinnt.', draw: (c, w, h, t) => { c.fillStyle = '#16120e'; c.fillRect(0, 0, w, h); const n = 10; for (let i = 0; i < n; i++) { const on = i <= Math.floor(t * 1.5) % n; c.fillStyle = on ? '#f2c46a' : '#3a2f26'; const bw = w * 0.07; c.fillRect(w * 0.12 + i * w * 0.077, h * 0.7 - i * h * 0.05, bw, h * 0.05 + i * h * 0.05); } } },
];

export function createKraft(ctx) {
  const { renderer, audio, $, store, settings, showScreen, G, post, getQuality, shadowSize, endSession } = ctx;
  const C = { on: false, mode: 'solo', net: null, host: true, seats: [], M: null, phase: 'off', phaseT: 0, phaseLen: 0, rings: [null, null, null], remote: [RT, RT, RT], bots: [null, null, null], struck: [false, false, false], keys: {}, slow: 0, shake: 0, sendT: 0, W: null, st: [], debris: null, cam: new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 400), seed: 1, intro: 0, lastBlip: -1, paused: false, best: store.get('kraftBest', 0), who: store.get('krWho', 'bots') };
  const hud = $('kraft'); const tour = createTour({ root: hud, store, key: 'krTutSeen', steps: STEPS }); const figMat = outerFigureMaterial(); const hand = () => ({ wrist: V3(), F: V3(), P: V3(), grip: 0.6 }); const foot = () => ({ ankle: V3(), toe: V3() }); const pose = { x: 0, y: 0.97, z: 0, yaw: 0, lean: 0, slump: 0, twist: 0, headYaw: 0, headPitch: 0, hands: { L: hand(), R: hand() }, feet: { L: foot(), R: foot() } };
  const isHost = () => !C.net || C.host;
  const mySeat = () => { if (!C.net) return C.mode === 'local' ? -1 : 0; const id = C.net.me && C.net.me.id; return C.seats.findIndex((s) => s.id === id); };
  const viewSeat = () => Math.max(0, mySeat() < 0 ? 1 : mySeat());
  const simulated = (i) => { const q = C.seats[i]; if (!q) return false; if (!C.net) return true; if (C.host) return q.kind !== 'human' || q.id === 'host'; return i === mySeat(); }; // wessen Ring rechnet dieses Fenster
  const T = () => TARGETS[C.M ? C.M.round : 0];

  // ---------------- Welt und Plätze ----------------
  function nameSprite(text, col) { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.font = '700 52px Bahnschrift, Segoe UI, sans-serif'; x.textAlign = 'center'; x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(text, 256, 66); x.fillStyle = col; x.fillText(text, 256, 66); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); spriteBlend(m); const s = new THREE.Sprite(m); s.scale.set(1.1, 0.21, 1); s.renderOrder = 12; return s; }
  function popSprite() { const c = document.createElement('canvas'); c.width = 512; c.height = 160; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); const s = new THREE.Sprite(m); s.scale.set(1.3, 0.4, 1); s.renderOrder = 13; s.visible = false; s.userData = { c, t, life: 0 }; return s; }
  function setPop(s, text, col) { const { c, t } = s.userData; const x = c.getContext('2d'); x.clearRect(0, 0, 512, 160); x.font = '800 78px Bahnschrift, Segoe UI, sans-serif'; x.textAlign = 'center'; x.lineWidth = 12; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(text, 256, 104); x.fillStyle = col; x.fillText(text, 256, 104); t.needsUpdate = true; s.visible = true; s.userData.life = 2.2; }
  function build() {
    if (C.W) return; C.W = buildKraftWorld(renderer, { shadows: settings.shadows, shadowSize: shadowSize() }); C.debris = createDebris(C.W.scene);
    C.st = C.W.stations.map((s, i) => { const fig = createFigure({ material: figMat, ...LOOKS[i] }); const space = new THREE.Object3D(); space.position.set(s.x, 0, -0.78); C.W.scene.add(space, fig.root); const ring = createRing(); C.W.scene.add(ring.group); const label = nameSprite(SEATS[i], SEAT_COL[i]); C.W.scene.add(label); const pop = popSprite(); C.W.scene.add(pop); const flash = new THREE.PointLight(0xfff0d0, 0, 4, 2); C.W.scene.add(flash); return { ...s, fig, space, ring, label, pop, flash, tgt: null, anim: null, tapT: 9, tapSide: 0, wobble: 0, labelText: '' }; });
  }
  function newTargets() { const id = T().id; C.debris.clear(); C.st.forEach((s, i) => { if (s.tgt) s.group.remove(s.tgt.group); s.tgt = buildTarget(id, C.seed * 3 + C.M.round * 11 + i); s.group.add(s.tgt.group); for (const c of s.cols) c.position.x = Math.sign(c.position.x) * (s.tgt.gap); s.anim = null; s.wobble = 0; s.flash.intensity = 0; }); }
  const solids = () => { const out = []; for (const s of C.st) for (const sg of [-1, 1]) out.push({ x: s.x + sg * (s.tgt ? s.tgt.gap : 0.42), z: 0, hw: 0.18, hd: 0.23, top: 0.9 }); return out; };

  // ---------------- Figuren ----------------
  function basePose(p) { p.x = 0; p.y = 0.95; p.z = 0; p.yaw = 0; p.lean = 0.12; p.slump = 0; p.twist = 0; p.headYaw = 0; p.headPitch = 0.28; for (const [k, sg] of [['L', 1], ['R', -1]]) { const f = p.feet[k]; f.ankle.set(sg * 0.16, 0.09, -0.04); f.toe.set(sg * 0.18, 0.03, 0.13); const h = p.hands[k]; h.F.set(0, -0.4, 1).normalize(); h.P.set(0, -1, 0); h.grip = 0.85; } }
  function figure(s, i, t) {
    const p = pose; basePose(p); const top = s.tgt ? s.tgt.top : 1.0; const L = p.hands.L; const R = p.hands.R; const a = s.anim;
    // Hämmern: abwechselnd tippen die Fäuste kurz auf das Ziel
    const e = Math.exp(-s.tapT / 0.07); for (const [h, sg, side] of [[L, 1, 0], [R, -1, 1]]) { const k = s.tapSide === side ? e : 0; h.wrist.set(sg * 0.2, Math.max(top + 0.12, 1.08) - k * 0.1 + Math.sin(t * 2 + side) * 0.01, 0.42 + k * 0.16); }
    if (a && a.k === 'strike') { // ausholen, durchziehen, kurz liegen lassen, zurück
      const u = a.t; const hy = Math.max(top + 0.12, 1.08); const up = smooth(0, 0.16, u); const down = smooth(0.16, IMPACT, u); const back = smooth(0.9, 1.4, u); const lean = down * (1 - back);
      p.lean = 0.12 - up * (1 - down) * 0.25 + lean * 0.55; p.y = 0.95 - lean * 0.12; p.z = lean * 0.1; p.headPitch = 0.28 + lean * 0.25;
      for (const [h, sg] of [[L, 1], [R, -1]]) { const Wi = V3(sg * 0.2, hy, 0.42); const Wu = V3(sg * 0.1, 1.85, 0.22); const Wd = V3(sg * 0.06, top + 0.05, 0.74); const w = u < 0.16 ? Wi.lerp(Wu, up) : u < 0.9 ? Wu.lerp(Wd, down) : Wd.lerp(Wi, back); h.wrist.copy(w); if (u < 0.16) { h.F.set(0, 1, -0.1); h.P.set(-sg, 0, 0); } else { h.F.set(0, -0.9, 0.45); h.P.set(-sg, 0, 0); } h.F.normalize(); h.grip = 1; }
      if (!a.ok && u > IMPACT && u < 1.4) { const sh = Math.sin(u * 40) * 0.03 * (1 - smooth(0.4, 1.4, u)); R.wrist.set(-0.12 + sh, 1.25 + sh, 0.3); R.F.set(0, 1, 0.2).normalize(); R.P.set(1, 0, 0); p.headPitch = 0.1; }
    }
    if (a && a.k === 'cheer') { const k = smooth(0, 0.3, a.t); for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * (0.2 + k * 0.2), 1.08 + k * 0.95 + Math.sin(t * 9 + sg) * 0.04 * k, 0.42 - k * 0.3); h.F.set(sg * 0.2, 1, 0).normalize(); h.P.set(0, 0, 1); h.grip = 1; } p.headPitch = 0.28 - k * 0.5; }
    if (a && a.k === 'shrug') { const k = smooth(0, 0.3, a.t); for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * (0.2 + k * 0.22), 1.08 + k * 0.05, 0.42 - k * 0.1); h.F.set(sg * 0.5, 0.2, 0.6).normalize(); h.P.set(0, 1, 0); h.grip = 0.1; } p.headPitch = 0.28 - k * 0.2; p.twist = Math.sin(t * 2) * 0.05; }
    s.fig.pose(s.space, p); s.label.position.set(s.x, 2.18, -0.78); s.label.visible = C.mode === 'local' || i !== mySeat(); // den eigenen Namen braucht man nicht über dem Kopf
  }

  // ---------------- Ablauf (Host) ----------------
  function setPhase(ph, len) { C.phase = ph; C.phaseT = 0; C.phaseLen = len; onPhase(); if (C.net && C.host) push(); }
  function push() { if (C.net && C.host) C.net.broadcast({ t: 'kst', M: C.M, seats: C.seats, phase: C.phase, left: Math.max(0, C.phaseLen - C.phaseT) }); }
  function begin() {
    C.seed = (Math.random() * 1e6) | 0; C.M = newMatch(C.seats.map((s) => s.name), C.seats.map((s) => s.kind === 'bot')); C.M.seed = C.seed; $('krResult').classList.add('hidden'); $('krSetup').classList.add('hidden'); setPhase('intro', INTRO);
  }
  function onPhase() {
    const M = C.M; if (!M) return; if (M.seed && M.seed !== C.seed) C.seed = M.seed;
    if (C.phase === 'intro') { newTargets(); C.rings = [null, null, null]; C.struck = [false, false, false]; C.remote = [1, 1, 1]; C.st.forEach((s) => { s.ring.group.visible = false; s.pop.visible = false; }); audio.ding(); C.lastBlip = -1; }
    if (C.phase === 'aim') { for (let i = 0; i < 3; i++) { C.rings[i] = simulated(i) ? newRing() : null; C.bots[i] = C.seats[i] && C.seats[i].kind === 'bot' && isHost() ? newBot(rng(C.seed + M.round * 97 + i * 13), M.round) : null; C.st[i].ring.group.visible = true; } audio.blip(880, 0.12); }
    if (C.phase === 'show') C.st.forEach((s) => { s.ring.group.visible = false; });
    if (C.phase === 'end') showResult();
    panel();
  }
  function hostTick(dt) {
    const M = C.M; if (!M) return; C.phaseT += dt;
    if (C.phase === 'intro' && C.phaseT >= C.phaseLen) setPhase('aim', AIM_TIME + 0.6);
    else if (C.phase === 'aim') { for (let i = 0; i < 3; i++) { const g = C.rings[i]; if (!g || g.done) continue; if (g.t >= AIM_TIME) strike(i, TIMEOUT); } for (let i = 0; i < 3; i++) if (!C.struck[i] && !C.seats[i]) strike(i, TIMEOUT); if ((roundDone(M) || C.phaseT >= C.phaseLen + 1.5) && C.phaseT > 0.3) { for (let i = 0; i < 3; i++) if (!C.struck[i]) strike(i, TIMEOUT); setPhase('show', SHOW); } }
    else if (C.phase === 'show' && C.phaseT >= C.phaseLen) { nextRound(M); setPhase(M.phase === 'end' ? 'end' : 'intro', M.phase === 'end' ? 0 : INTRO); }
  }
  // Ein Platz schlägt zu (lokal sofort zu sehen, der Host zählt)
  function strike(i, res) {
    if (C.struck[i]) return; C.struck[i] = true; const g = C.rings[i]; if (g) g.done = true;
    play(i, res);
    if (isHost()) { record(C.M, i, res); if (C.net) C.net.broadcast({ t: 'khit', seat: i, res }); panel(); }
    else C.net.send({ t: 'ks', res });
  }
  function play(i, res) {
    const s = C.st[i]; s.ring.group.visible = false; const own = i === mySeat() || (C.mode === 'local');
    if (res.why === 'zeit') { s.anim = { k: 'shrug', t: 0, ok: false, res }; setPop(s.pop, 'ZU LANGSAM', '#c9c2b8'); if (own) big(WHY.zeit, 'bad'); return; }
    s.anim = { k: 'strike', t: 0, ok: res.ok, res, hit: false }; audio.blip(res.ok ? 520 : 300, 0.05);
  }
  function impact(i) {
    const s = C.st[i]; const a = s.anim; const res = a.res; const at = V3(s.x, s.tgt.top, 0); const own = i === mySeat() || (C.mode === 'local' && i === 1) || (C.mode === 'local' && res.ok);
    if (res.ok) { C.debris.shatter(s.tgt, at, res.p, null); s.flash.position.set(s.x, s.tgt.top + 0.3, 0.4); s.flash.intensity = 6 + res.p * 8; s.flash.color.set({ glut: 0xff8a3a, metall: 0xffb070, mond: 0x7ae8ff, eis: 0xcfefff }[s.tgt.fx] || 0xfff0d0); audio.crash(10 + res.p * 14); audio.thud(14); setPop(s.pop, '+' + points(res, C.M.round), res.why === 'perfekt' ? '#ffe27a' : '#9df5b8'); if (i === mySeat() || C.mode === 'local') { C.shake = Math.max(C.shake, 0.6 + res.p * 0.5); if (i === mySeat()) C.slow = 0.55; big(WHY[res.why], res.why === 'perfekt' ? 'top' : 'good'); } setTimeout(() => { if (s.anim === a) s.anim = { k: 'cheer', t: 0 }; }, 900); }
    else { C.debris.chips(at, s.tgt.fx); s.wobble = 1; audio.thud(8); setPop(s.pop, WHY[res.why].toUpperCase(), '#ff8a7a'); if (own) { C.shake = Math.max(C.shake, 0.25); big(WHY[res.why], 'bad'); } }
  }
  function big(text, kind) { const b = $('krBig'); b.textContent = text; b.className = 'kr-big ' + kind; void b.offsetWidth; b.classList.add('pop'); clearTimeout(C.bigT); C.bigT = setTimeout(() => b.classList.remove('pop'), 1500); }

  // ---------------- Eingabe ----------------
  function tap(i) { if (C.phase !== 'aim' || C.paused || tour.open) return; const g = C.rings[i]; if (!g || g.done) return; const was = inZone(g, T()); tapRing(g, T()); const s = C.st[i]; s.tapT = 0; s.tapSide ^= 1; if (i === mySeat() || C.mode === 'local') { audio.tick(0.35); if (!was && inZone(g, T())) audio.blip(1180, 0.04); } }
  function hit(i) { if (C.phase !== 'aim' || C.paused || tour.open) return; const g = C.rings[i]; if (!g || g.done || g.t < 0.15) return; strike(i, judge(g, T())); }
  function onDown(e) {
    if (!C.on) return false; const code = e.code;
    if (code === 'Escape') { if (tour.open) tour.close(); else if (!$('krSetup').classList.contains('hidden') || !$('krResult').classList.contains('hidden')) back(); else togglePause(); return true; }
    if (C.paused || !$('krSetup').classList.contains('hidden')) return false;
    if (e.repeat) return TAP_KEYS.has(code) || HIT_KEYS.has(code) || LOCAL_KEYS.some((k) => k.tap === code || k.hit === code); // gedrückt halten zählt nicht als Hämmern
    if (C.mode === 'local') { const i = LOCAL_KEYS.findIndex((k) => k.tap === code); if (i >= 0) { tap(i); return true; } const j = LOCAL_KEYS.findIndex((k) => k.hit === code); if (j >= 0) { hit(j); return true; } return false; }
    const me = mySeat(); if (me < 0) return false; if (TAP_KEYS.has(code)) { tap(me); return true; } if (HIT_KEYS.has(code)) { hit(me); return true; } return false;
  }
  window.addEventListener('keydown', (e) => { if (!C.on || (e.target && e.target.tagName === 'INPUT')) return; if (onDown(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  $('gl').addEventListener('pointerdown', (e) => { if (!C.on || C.mode === 'local' || C.paused) return; audio.init(); const me = mySeat(); if (me < 0) return; if (e.button === 0) tap(me); if (e.button === 2) hit(me); });
  function togglePause() { if (C.net) { $('krPause').classList.toggle('hidden'); return; } C.paused = !C.paused; $('krPause').classList.toggle('hidden', !C.paused); } // online läuft das Spiel weiter

  // ---------------- Anzeige ----------------
  function panel() {
    const M = C.M; const box = $('krSeats'); box.textContent = ''; if (!M) return; const tg = T();
    $('krTarget').textContent = `Ziel ${M.round + 1} von ${COUNT}`; $('krName').textContent = tg.name;
    C.seats.forEach((q, i) => { const d = document.createElement('div'); d.className = 'kr-seat' + (i === mySeat() ? ' me' : ''); const dot = document.createElement('i'); dot.style.background = SEAT_COL[i]; const tx = document.createElement('div'); const b = document.createElement('b'); b.textContent = q.name; const sm = document.createElement('small'); const R = M.res; let marks = ''; for (let r = 0; r < COUNT; r++) marks += R[r] && R[r][i] ? (R[r][i].ok ? '●' : '○') : '·'; sm.textContent = marks; tx.append(b, sm); const em = document.createElement('em'); em.textContent = String(M.score[i]); d.append(dot, tx, em); box.append(d); const s = C.st[i]; if (s && s.labelText !== q.name) { s.labelText = q.name; C.W.scene.remove(s.label); s.label = nameSprite(q.name, SEAT_COL[i]); C.W.scene.add(s.label); } });
    const tw = $('krTower'); tw.textContent = ''; TARGETS.forEach((t, k) => { const li = document.createElement('li'); li.textContent = t.name; if (k === M.round) li.className = 'on'; else if (k < M.round) li.className = 'done'; tw.prepend(li); });
    $('krHint').textContent = C.mode === 'local' ? 'Rot: A hämmern, W schlagen · Blau: J hämmern, I schlagen · Gelb: ← hämmern, ↑ schlagen' : 'Hämmern: Leertaste, A, S, J, K oder linke Maus · Zuschlagen: Enter oder rechte Maus';
    $('krIntro').classList.toggle('hidden', C.phase !== 'intro'); if (C.phase === 'intro') { $('krIntroN').textContent = `Ziel ${M.round + 1} von ${COUNT}`; $('krIntroT').textContent = tg.name; $('krIntroB').textContent = tg.blurb; }
    $('krBackT').textContent = C.net && C.host ? 'Sitzung beenden' : 'Verlassen';
  }
  function hudTick() {
    const M = C.M; if (!M) return; const me = mySeat(); const g = me >= 0 ? C.rings[me] : C.rings.find(Boolean); const tm = $('krTime');
    if (C.phase === 'aim') { const left = g ? timeLeft(g) : Math.max(0, AIM_TIME - C.phaseT); tm.textContent = Math.ceil(left).toString(); tm.classList.toggle('warn', left < 3.5); const n = Math.ceil(left); if (n !== C.lastBlip && n <= 3 && n > 0 && g && !g.done) { C.lastBlip = n; audio.blip(660, 0.06); } } else tm.textContent = C.phase === 'intro' ? '…' : '';
    const bar = $('krPower'); if (g && C.phase === 'aim' && !g.done && C.mode !== 'local') { const o = offset(g, T()); bar.style.setProperty('--k', String(clamp(1 - (g.r - 0.04) / 1.08, 0, 1))); bar.classList.toggle('green', inZone(g, T())); bar.classList.toggle('over', o < -T().tol); bar.classList.remove('hidden'); } else bar.classList.add('hidden');
  }
  function showResult() {
    const M = C.M; const order = [0, 1, 2].filter((i) => C.seats[i]).sort((a, b) => M.score[b] - M.score[a]); const win = M.winner || [order[0]]; $('krResTitle').textContent = win.length > 1 ? 'Unentschieden!' : `${C.seats[win[0]].name} gewinnt!`;
    const list = $('krResList'); list.textContent = ''; order.forEach((i, k) => { const li = document.createElement('li'); li.textContent = `${k + 1}. ${C.seats[i].name}: ${M.score[i]} Punkte, ${hits(M, i)} von ${COUNT} zerlegt`; li.style.color = SEAT_COL[i]; list.append(li); });
    const me = mySeat(); if (me >= 0 && M.score[me] > C.best) { C.best = M.score[me]; store.set('kraftBest', C.best); $('krResText').textContent = `Neuer Rekord: ${C.best} Punkte!`; } else $('krResText').textContent = C.best ? `Dein Rekord: ${C.best} Punkte` : '';
    $('krAgain').classList.toggle('hidden', !!C.net && !C.host); $('krResult').classList.remove('hidden'); audio.ding();
  }

  // ---------------- Bild ----------------
  const camPos = V3(); const camLook = V3(); const tmp = V3();
  function camera(dt, t) {
    const cam = C.cam; const vs = viewSeat(); const sx = C.mode === 'local' ? 0 : STATION_X[vs]; const top = C.st[vs] && C.st[vs].tgt ? C.st[vs].tgt.top : 1;
    if (C.mode === 'local') { camPos.set(0, 2.05, 6.2); camLook.set(0, 1.05, 0); cam.fov = 42; }
    else { camPos.set(sx, 1.72, 3.25); camLook.set(sx, top + 0.26, -0.3); cam.fov = 40; }
    if (C.phase === 'intro') { const u = smooth(0, C.phaseLen, C.phaseT); const a = (1 - u) * 1.1; const d = 1.25 + u * (C.mode === 'local' ? 4.9 : 1.05); const cx = C.mode === 'local' ? STATION_X[1] : sx; const endY = camPos.y; camPos.set(cx + Math.sin(a) * d, top + 0.25 + u * (endY - top - 0.25), Math.cos(a) * d); camLook.set(cx, top - 0.05 + u * 0.03, 0); }
    if (C.phase === 'end') { const a = Math.sin(t * 0.15) * 0.7; camPos.set(Math.sin(a) * 5.4, 2.2, Math.cos(a) * 4.6); camLook.set(0, 1.0, -0.6); }
    const k = 1 - Math.exp(-dt * (C.phase === 'intro' ? 30 : 5)); cam.position.lerp(camPos, k); C.look = C.look ? C.look.lerp(camLook, k) : camLook.clone();
    if (C.shake > 0) { C.shake = Math.max(0, C.shake - dt * 2.2); const s = C.shake * C.shake * 0.05; cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s; }
    cam.lookAt(C.look); cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); if (cam.aspect < 1.3) cam.fov = cam.fov * 1.3 / cam.aspect; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  function frame(dt, tAbs) {
    if (!C.on || !C.W) return; const real = Math.min(dt, 0.1); const paused = C.paused && !C.net;
    if (!paused && C.M) {
      if (isHost()) hostTick(real); else C.phaseT += real;
      if (C.phase === 'aim') { C.acc = (C.acc || 0) + real; while (C.acc >= DT) { C.acc -= DT; for (let i = 0; i < 3; i++) { const g = C.rings[i]; if (!g || g.done) continue; stepRing(g, T(), DT); const b = C.bots[i]; if (b && botStep(b, g, T(), DT)) strike(i, judge(g, T())); else if (b && b.acc < 0.2 && b.rate > 0 && C.st[i].tapT > 0.06) { C.st[i].tapT = 0; C.st[i].tapSide ^= 1; } if (!isHost() && g.t >= AIM_TIME && !g.done) strike(i, TIMEOUT); } } }
      netTick(real);
    }
    const sl = C.slow > 0 ? 0.3 : 1; C.slow = Math.max(0, C.slow - real); const fdt = real * sl;
    C.st.forEach((s, i) => { s.tapT += fdt; if (s.anim) { const was = s.anim.t; s.anim.t += fdt; if (s.anim.k === 'strike' && was < IMPACT && s.anim.t >= IMPACT) impact(i); } if (s.wobble > 0) { s.wobble = Math.max(0, s.wobble - fdt * 2.5); if (s.tgt) s.tgt.group.rotation.z = Math.sin(tAbs * 45) * 0.012 * s.wobble; } s.flash.intensity *= Math.exp(-fdt * 9);
      const g = C.rings[i]; const rr = g ? g.r : C.remote[i]; const tt = g ? g.t : C.phaseT; const tg = T(); if (s.ring.group.visible && s.tgt) { s.ring.group.position.set(s.x, s.tgt.top + 0.03, 0.12); s.ring.group.quaternion.copy(C.cam.quaternion); s.ring.set(rr, ringTarget(tg, tt), tg.tol, Math.abs(rr - ringTarget(tg, tt)) <= tg.tol, tAbs); }
      if (s.pop.visible) { s.pop.userData.life -= real; s.pop.position.set(s.x, (s.tgt ? s.tgt.top : 1) + 0.3 + (2.2 - s.pop.userData.life) * 0.14, 0.3); s.pop.material.opacity = clamp(s.pop.userData.life, 0, 1); if (s.pop.userData.life <= 0) s.pop.visible = false; }
      figure(s, i, tAbs); });
    C.debris.update(fdt, solids()); C.W.update(tAbs); camera(real, tAbs); hudTick();
    post.watch(real, true); const dprNow = Math.min(window.devicePixelRatio || 1, 1.5); if (renderer.getPixelRatio() !== dprNow) { renderer.setPixelRatio(dprNow); renderer.setSize(window.innerWidth, window.innerHeight, false); }
    renderer.shadowMap.needsUpdate = settings.shadows; post.render(C.W.scene, C.cam, { mood: C.W.mood, sky: C.W.sky, sun: C.W.sun, sunDir: C.W.sunDir, dt: real, time: tAbs, speed: 0, nitro: 0, ground: 0, camPos: C.cam.position });
  }

  // ---------------- Netz ----------------
  function netTick(dt) {
    if (!C.net) return; C.sendT += dt; if (C.sendT < NET_HZ) return; C.sendT = 0;
    if (C.host) { if (C.phase === 'aim') C.net.broadcast({ t: 'krs', r: [0, 1, 2].map((i) => (C.rings[i] ? Math.round(C.rings[i].r * 1000) / 1000 : C.remote[i])), at: C.phaseT }); }
    else { const me = mySeat(); const g = me >= 0 ? C.rings[me] : null; if (g && !g.done && C.phase === 'aim') C.net.send({ t: 'kr', r: Math.round(g.r * 1000) / 1000 }); }
  }
  function message(from, m) {
    if (m.t === 'kst' && !C.host) { const fresh = !C.M || m.phase !== C.phase || m.M.round !== C.M.round; C.seats = m.seats; C.M = m.M; if (fresh) { C.phase = m.phase; C.phaseT = 0; C.phaseLen = m.left; onPhase(); } else panel(); if (m.phase !== 'end') $('krResult').classList.add('hidden'); return; }
    if (m.t === 'khit' && !C.host) { if (C.M && C.M.res) { const R = C.M.res[C.M.round] || (C.M.res[C.M.round] = [null, null, null]); if (!R[m.seat]) { R[m.seat] = m.res; C.M.score[m.seat] += points(m.res, C.M.round); } } if (m.seat !== mySeat() && !C.struck[m.seat]) { C.struck[m.seat] = true; play(m.seat, m.res); } panel(); return; }
    if (m.t === 'krs' && !C.host) { m.r.forEach((r, i) => { if (i !== mySeat()) C.remote[i] = r; }); return; }
    if (m.t === 'kr' && C.host) { const i = C.seats.findIndex((q) => q.id === from); if (i >= 0 && Number.isFinite(m.r)) C.remote[i] = clamp(m.r, 0, 1.2); return; }
    if (m.t === 'ks' && C.host && C.phase === 'aim') { const i = C.seats.findIndex((q) => q.id === from); if (i < 0 || C.struck[i]) return; const r = m.res || {}; const res = r.why === 'zeit' ? TIMEOUT : { ok: !!r.ok, p: clamp(Number(r.p) || 0, 0, 1), why: WHY[r.why] ? r.why : 'treffer', left: clamp(Number(r.left) || 0, 0, AIM_TIME) }; if (!res.ok) res.p = 0; strike(i, res); }
  }
  function playerLeft(id) { const q = C.seats.find((s) => s.id === id); if (!q) return; q.kind = 'bot'; q.name += ' (KI)'; const i = C.seats.indexOf(q); if (C.phase === 'aim' && !C.struck[i]) { C.rings[i] = newRing(); C.rings[i].r = C.remote[i]; C.bots[i] = newBot(rng(C.seed + i), C.M.round); } panel(); push(); }
  function playerJoined(id, name) { const q = C.seats.find((s) => s.kind === 'bot'); if (q) { const i = C.seats.indexOf(q); q.kind = 'human'; q.id = id; q.name = name; C.bots[i] = null; if (C.rings[i] && !C.struck[i]) strike(i, TIMEOUT); } C.net.sendTo(id, { t: 'start', mode: 'kraft' }); setTimeout(push, 300); panel(); }

  // ---------------- Öffnen, Starten, Verlassen ----------------
  function enter() { build(); post.setLevel(getQuality()); post.reset(); C.on = true; C.paused = false; G.mode = 'kraft'; showScreen(null); $('hud').classList.add('hidden'); hud.classList.remove('hidden'); $('krPause').classList.add('hidden'); C.look = null; }
  function pickers() { for (const b of $('krWho').children) b.classList.toggle('sel', b.dataset.who === C.who); }
  for (const b of $('krWho').children) b.onclick = () => { C.who = b.dataset.who; store.set('krWho', C.who); pickers(); };
  function open() { C.net = null; C.host = true; C.mode = 'solo'; C.M = null; C.phase = 'off'; enter(); if (!C.st[0].tgt) { C.M = newMatch(['', '', ''], [true, true, true]); newTargets(); C.M = null; } $('krSetup').classList.remove('hidden'); $('krResult').classList.add('hidden'); $('krIntro').classList.add('hidden'); pickers(); $('krSeats').textContent = ''; }
  function go() { audio.init(); C.mode = C.who === 'local' ? 'local' : 'solo'; C.seats = C.mode === 'local' ? [{ name: 'Rot', kind: 'local' }, { name: 'Blau', kind: 'local' }, { name: 'Gelb', kind: 'local' }] : [{ name: store.get('mpName', 'Du') || 'Du', kind: 'me' }, { name: BOTS[1], kind: 'bot' }, { name: BOTS[2], kind: 'bot' }]; begin(); tour.first(); }
  function startCoop({ net, host }) { C.net = net; C.host = host; C.mode = 'net'; C.M = null; C.phase = 'off'; enter(); $('krSetup').classList.add('hidden'); $('krResult').classList.add('hidden'); if (host) { const pl = net.players; C.seats = [0, 1, 2].map((i) => (pl[i] ? { name: pl[i].name, kind: 'human', id: pl[i].id } : { name: BOTS[i], kind: 'bot' })); begin(); } tour.first(); }
  function back() { if (C.net) { stop(); endSession(); return; } if (C.M && C.phase !== 'end' && $('krSetup').classList.contains('hidden')) { open(); return; } stop(); showScreen('gallery'); }
  function stop() { C.on = false; C.M = null; C.phase = 'off'; C.net = null; C.host = true; C.paused = false; hud.classList.add('hidden'); tour.open = false; tour.el.classList.add('hidden'); for (const id of ['krSetup', 'krResult', 'krPause', 'krIntro']) $(id).classList.add('hidden'); if (C.debris) C.debris.clear(); if (G.mode === 'kraft') G.mode = 'menu'; }
  $('krGo').onclick = go; $('krRules').onclick = tour.show; $('krHelp').onclick = tour.show; $('krSetupBack').onclick = back; $('krBack').onclick = back; $('krResBack').onclick = back; $('krAgain').onclick = () => { if (C.net) { C.M = null; begin(); push(); } else begin(); }; $('krResume').onclick = togglePause; $('krQuit').onclick = () => { C.paused = false; $('krPause').classList.add('hidden'); back(); };

  const ring = (i) => { const g = C.rings[i]; return g ? { r: g.r, o: offset(g, T()), tol: T().tol, done: g.done, t: g.t } : null; }; // für Tests
  return { open, stop, frame, startCoop, message, playerJoined, playerLeft, active: () => C.on, hide: () => {}, tour, state: C, mySeat, tap, hit, begin, ring };
}
