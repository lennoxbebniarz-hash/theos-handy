// Theos Seitenscheidel - Parkmodus: Ablauf, Rollen, Kameras, Anzeige, Mehrspieler zu dritt.
// Jeder Spieler ist Fahrer, Einweiser zu Fuß oder Drohnenpilot und kann jederzeit wechseln (E ein-/aussteigen, Tab Drohne). Der Host rechnet das Fahrzeug, die Mitspieler schicken Eingaben und ihre eigene Position.
// Eine Berührung mit irgendetwas startet das ganze Level neu. Rechnet mit fester Schrittweite, genau wie die Musterfahrt der Level.
import * as THREE from './vendor/three.module.min.js';
import { VEH, PARK_DT, clamp, wrapA, rect, rectHit, vehRects, createVehState, stepVeh, hitAny, inSpot, starsOf } from './parklogic.js';
import { CATALOG, PARK_COUNT, buildLevel } from './parklevels.js';
import { buildParkWorld } from './parkworld.js';
import { buildVehicle, outerFigureMaterial } from './parkart.js';
import { createParkMap } from './parkmap.js';
import { createParkMirror } from './parkmirror.js';
import { createFigure } from './racefigure.js';
import { spriteBlend } from './raceinterior.js';

const LOOKS = [{ shirt: 0xc0332a, cap: 0x8a221c, hair: 0x3a2a1e, skin: 0xe2b08c, css: '#e8604f' }, { shirt: 0x2c62c8, cap: 0x1c3f86, hair: 0x1e1a18, skin: 0xd8a47e, css: '#6fa0f0' }, { shirt: 0xe8821c, cap: 0xa85a10, hair: 0x5a3a1e, skin: 0xe8bc98, css: '#f0a040' }];
const PAINTS = [0xc8281c, 0x2c62c8, 0xe8821c, 0x3e8a5a, 0xd8d8d8, 0x2a2c30, 0xe0a020]; const FIXED_PAINT = { tank: 0xc8b070, jeep: 0x9aa858, rocket: 0x7a8a50, jumbo: 0xf2efe6, tug: 0xe8c030, forklift: 0xe8b020, bus: 0xe8c030 }; const GEST = { 1: '✋', 2: '⬅', 3: '➡', 4: '⬇' }; const GEST_TXT = { 1: 'Stopp!', 2: 'Links!', 3: 'Rechts!', 4: 'Komm!' };
const ROLE = { drive: 'Fahrer', walk: 'Einweiser', drone: 'Drohne' }; const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }; const lerp = (a, b, k) => a + (b - a) * k;
const BOSS_FAIL = ['Bruno: „Kratzer ist Kratzer. Von vorn.“', 'Bruno: „Ich hab’s genau gesehen.“', 'Bruno: „Das zahlt die Versicherung nicht.“', 'Bruno: „Nochmal. Langsamer. Ihr Pfeifen.“'];
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export function createPark(ctx) {
  const { renderer, audio, $, store, keys, settings, resize, showScreen, G, toggleLook, openMenu, post, fmt, getQuality, shadowSize } = ctx;
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.08, 3000); const mirror = createParkMirror(renderer); const cv3 = V3(); const figMat = outerFigureMaterial();
  const P = { on: false, phase: 'off', n: 1, L: null, W: null, players: new Map(), me: 'host', mp: null, st: null, def: null, model: null, stage: 0, lt: 0, hold: 0, tries: 0, fails: 0, acc: 0, driver: null, yaw: 0, pitch: 0.34, dist: 1, mark: null, flash: 0, sens: 0, parked: [], time: 0, introT: 0, sent: 0, lastState: 0, auto: false, autoI: 0, resultKind: null, target: null };
  const near = [];
  // ---------------- Spielstand: eigene Datei-Ecke, das Rennen und Moonsweeper bleiben unberührt ----------------
  const loadProg = () => { const p = store.get('parkProgress', null); const q = p && p.done ? p : { done: {} }; if (!q.fails) q.fails = {}; return q; };
  const saveProg = (p) => store.set('parkProgress', p);
  const isHost = () => !P.mp || P.mp.host;

  const map = createParkMap({ $, count: PARK_COUNT, catalog: CATALOG, vehName: (k) => VEH[k].name, fmt, onStart: (n) => { audio.init(); hostLoad(n); }, onBack: () => { if (P.mp) { stop(); ctx.endSession(); return; } stop(); openMenu(); showScreen('gallery'); } });

  // ---------------- Spieler ----------------
  function makePlayer(id, name, idx) {
    const look = LOOKS[idx % 3]; const fig = createFigure({ material: figMat, ...look }); const space = new THREE.Object3D(); const label = nameSprite(name, look.css); const icon = iconSprite(); const pl = { id, name, idx, look, fig, space, label, icon, iconTxt: '', mode: 'walk', x: 0, z: 0, h: 0, y: 8, gest: 0, gestT: 0, ph: 0, sp: 0, tr: null, tgt: null, inp: { th: 0, br: 1, steer: 0 }, inT: 0, drone: droneModel(look.shirt) }; P.players.set(id, pl); return pl;
  }
  function nameSprite(text, col) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.font = 'bold 34px Segoe UI, Arial'; x.textAlign = 'center'; x.lineWidth = 7; x.strokeStyle = 'rgba(0,0,0,.8)'; x.strokeText(text, 128, 44); x.fillStyle = col; x.fillText(text, 128, 44); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); spriteBlend(m); const s = new THREE.Sprite(m); s.scale.set(2, 0.5, 1); return s; }
  function iconSprite() { const c = document.createElement('canvas'); c.width = 128; c.height = 128; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); spriteBlend(m); const s = new THREE.Sprite(m); s.scale.set(1.3, 1.3, 1); s.visible = false; s.userData.c = c; s.userData.t = t; return s; }
  function setIcon(pl, txt) { if (pl.iconTxt === txt) return; pl.iconTxt = txt; const c = pl.icon.userData.c; const x = c.getContext('2d'); x.clearRect(0, 0, 128, 128); if (txt) { x.fillStyle = 'rgba(16,20,28,.86)'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = pl.look.css; x.stroke(); x.font = '70px Segoe UI Emoji, Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(txt, 64, 70); } pl.icon.userData.t.needsUpdate = true; pl.icon.visible = !!txt; }
  function droneModel(col) { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })); m.castShadow = true; g.add(m); const rot = []; for (const [x, z] of [[0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1b1e })); a.scale.set(Math.hypot(x, z) * 25, 1, 1); a.position.set(x / 2, 0.02, z / 2); a.rotation.y = Math.atan2(-z, x); g.add(a); const r = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.03), new THREE.MeshStandardMaterial({ color: 0xc8ccd0 })); r.position.set(x, 0.07, z); g.add(r); rot.push(r); } g.userData.rot = rot; return g; }
  const me = () => P.players.get(P.me);
  function attachPlayers() { const sc = P.W.scene; for (const pl of P.players.values()) { sc.add(pl.fig.root); sc.add(pl.space); sc.add(pl.label); sc.add(pl.icon); sc.add(pl.drone); } }

  // ---------------- Level laden ----------------
  function clearWorld() { if (P.W) { for (const pl of P.players.values()) { P.W.scene.remove(pl.fig.root); P.W.scene.remove(pl.space); P.W.scene.remove(pl.label); P.W.scene.remove(pl.icon); P.W.scene.remove(pl.drone); } P.W.dispose(); P.W = null; } P.model = null; P.parked = []; }
  function spawnVehicle(i) {
    const s = P.L.stages[i]; P.stage = i; P.def = VEH[s.veh]; P.st = createVehState(s.start, P.def); if (P.model) { P.parkedModels.push(P.model); } const col = FIXED_PAINT[s.veh] ?? PAINTS[(P.n * 3 + i) % PAINTS.length]; P.model = buildVehicle(s.veh, col); P.W.scene.add(P.model.group); if (P.model.trailer) P.W.scene.add(P.model.trailer); P.W.spot(s.spot); P.hold = 0; P.dist = 1;
  }
  function resetCoursePlayers() { const s = P.L.stages[P.stage]; const def = VEH[s.veh]; const lx = Math.cos(s.start.h); const lz = -Math.sin(s.start.h); let side = 1; for (const pl of P.players.values()) { if (pl.mode === 'drive') continue; const o = def.w / 2 + 1.4 + (pl.idx % 2); pl.x = s.start.x + lx * side * o; pl.z = s.start.z + lz * side * o; pl.h = s.start.h; side = -side; } }
  function freePlace(pl) { const s = P.L.stages[P.stage]; let best = null; for (let r = 2; r < 16 && !best; r += 1.2) for (let a = 0; a < 8; a++) { const x = s.start.x + Math.cos(a * 0.785) * r; const z = s.start.z + Math.sin(a * 0.785) * r; if (!solidAt(x, z, 0.5)) { best = [x, z]; break; } } if (best) { pl.x = best[0]; pl.z = best[1]; } }
  const vehAt = (x, z, pad) => { const q = rect(x, z, 0, pad, pad); for (const r of vehRects(P.st, P.def)) if (rectHit(q, r)) return true; return false; };
  const solidAt = (x, z, pad) => { const q = rect(x, z, 0, pad, pad); P.L.grid.near(x, z, 12, near); for (const o of near) if (rectHit(q, o)) return true; return false; };
  function load(n, tries = 0) {
    clearWorld(); P.n = n; P.L = buildLevel(n); P.parkedModels = []; P.tries = tries; P.W = buildParkWorld(P.L, { renderer, shadows: settings.shadows, shadowSize: shadowSize(), level: getQuality() }); post.setLevel(getQuality()); post.reset(); attachPlayers(); P.stage = 0; P.model = null; spawnVehicle(0); P.lt = 0; P.acc = 0; P.mark = null; P.markM = markRing(); P.W.scene.add(P.markM); P.markM.visible = false;
    const driverWant = P.driver && P.players.get(P.driver) ? P.driver : null; for (const pl of P.players.values()) { if (pl.id === driverWant) pl.mode = 'drive'; else if (pl.mode === 'drive') pl.mode = 'walk'; pl.tr = null; } if (!driverWant) { const first = [...P.players.values()][0]; first.mode = 'drive'; P.driver = first.id; }
    resetCoursePlayers(); for (const pl of P.players.values()) if (pl.mode === 'walk' && solidAt(pl.x, pl.z, 0.4)) freePlace(pl);
    P.on = true; P.yaw = 0; P.pitch = 0.36; const q = CATALOG[n - 1]; $('pkName').textContent = `Level ${n}: ${q.name}`; G.mode = 'park'; showScreen(null); $('parkHud').classList.remove('hidden'); $('hud').classList.add('hidden'); P.phase = 'intro'; P.introT = 0; $('pkBlurb').textContent = q.blurb; $('pkIntroT').textContent = `Level ${n}${q.final ? ', der letzte Gegner' : q.boss ? ', Endgegner' : ''}`; $('pkIntroN').textContent = q.name; $('pkIntro').classList.remove('hidden'); $('pkIntro').classList.toggle('boss', !!q.boss); hudRoles(); setHelp(); resize(); renderer.shadowMap.needsUpdate = true;
  }
  function markRing() { const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9, depthWrite: false })); spriteBlend(m.material); m.position.y = 0.06; return m; }

  // ---------------- Ablauf ----------------
  function hostLoad(n) { const tr = 0; if (P.mp) P.mp.net.broadcast({ t: 'pload', n, tries: tr }); load(n, tr); }
  function startPlay() { if (P.phase !== 'intro') return; $('pkIntro').classList.add('hidden'); P.phase = 'play'; P.time = 0; P.lt = 0; P.acc = 0; }
  function fail(what) {
    if (P.phase !== 'play') return; P.phase = 'fail'; P.flash = 1; P.failT = 1.15; P.tries++; if (isHost()) { const p = loadProg(); p.fails[P.n] = (p.fails[P.n] || 0) + 1; saveProg(p); } audio.crash(0.55); const q = CATALOG[P.n - 1]; const txt = q.boss ? BOSS_FAIL[P.tries % BOSS_FAIL.length] : `Berührt: ${what}. Von vorn!`; say(txt, 1.4); if (P.mp && P.mp.host) P.mp.net.broadcast({ t: 'pfail', what, tries: P.tries });
  }
  function restart() {
    for (const m of P.parkedModels) { P.W.scene.remove(m.group); if (m.trailer) P.W.scene.remove(m.trailer); } P.parkedModels = []; P.W.scene.remove(P.model.group); if (P.model.trailer) P.W.scene.remove(P.model.trailer); P.model = null; P.parked = []; spawnVehicle(0); P.lt = 0; P.acc = 0; P.time = 0; P.autoI = 0; for (const pl of P.players.values()) { pl.tr = null; if (pl.id === P.driver) pl.mode = 'drive'; } const drv = P.players.get(P.driver); if (!drv && P.players.size) { const f = [...P.players.values()][0]; f.mode = 'drive'; P.driver = f.id; } P.phase = 'play'; post.reset();
  }
  function stageWon() {
    const L = P.L; if (P.stage + 1 < L.stages.length) { // nächstes Fahrzeug im Endgegner-Level
      const def = P.def; for (const r of vehRects(P.st, def)) P.parked.push({ ...r, kind: 'dein Fahrzeug' }); P.stage++; const i = P.stage; const was = P.driver; spawnVehicle(i); if (P.auto) { P.lt = L.stages[i].t0; P.autoI = 0; } for (const pl of P.players.values()) if (pl.mode !== 'drive') { resetCoursePlayers(); break; } audio.ding(); say(`Geschafft! Weiter mit: ${P.def.name}`, 2.4); void was; if (P.mp && P.mp.host) P.mp.net.broadcast({ t: 'pstage', i, lt: P.lt }); return;
    }
    win();
  }
  function win() {
    P.phase = 'won'; const t = P.time; const stars = starsOf(t, P.L.par); let prog = null; if (isHost()) { prog = loadProg(); const o = prog.done[P.n]; if (!o || t < o.t) prog.done[P.n] = { t, stars: Math.max(stars, o ? o.stars : 0) }; saveProg(prog); } if (P.mp && P.mp.host) P.mp.net.broadcast({ t: 'pwin', tt: t, stars, tries: P.tries }); showResult(t, stars);
  }
  function showResult(t, stars) {
    audio.ding(); $('parkHud').classList.add('hidden'); const q = CATALOG[P.n - 1]; $('prTitle').textContent = q.final ? 'BRUNO IST BESIEGT!' : q.boss ? 'ENDGEGNER GESCHAFFT!' : 'PERFEKT GEPARKT!'; $('prSub').textContent = `Level ${P.n}: ${q.name}`; $('prStars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars); $('prTime').textContent = fmt(t); $('prInfo').textContent = `${P.tries ? `${P.tries}× verkackt` : 'Beim ersten Versuch!'} Musterfahrt: ${fmt(P.L.par)}`; const host = isHost(); $('prNext').classList.toggle('hidden', !host || P.n >= PARK_COUNT); $('prAgain').classList.toggle('hidden', !host); $('prMap').classList.toggle('hidden', !host); $('prWait').classList.toggle('hidden', host); showScreen('pkResult'); toggleLook(false); G.mode = 'park';
  }
  function toMap(progress = null) { const p = progress || loadProg(); $('parkHud').classList.add('hidden'); $('pkIntro').classList.add('hidden'); P.phase = 'map'; G.mode = 'menu'; toggleLook(false); showScreen('parkmap'); $('pmBack').textContent = P.mp ? (P.mp.host ? 'Sitzung beenden' : 'Sitzung verlassen') : 'Zurück'; $('pmMp').classList.toggle('hidden', !!P.mp); map.show({ progress: p, readonly: !!(P.mp && !P.mp.host), sel: P.n && p.done[P.n] && P.n < PARK_COUNT ? P.n + 1 : null }); }
  function open() { P.mp = null; P.players.clear(); P.me = 'host'; makePlayer('host', 'Du', 0); P.driver = 'host'; P.n = 0; toMap(); }
  function stop() { if (!P.on && P.phase === 'off') return; clearWorld(); P.on = false; P.phase = 'off'; P.L = null; $('parkHud').classList.add('hidden'); $('pkIntro').classList.add('hidden'); $('pkFlash').classList.add('hidden'); map.hide(); P.mp = null; P.players.clear(); audio.update({ rpm: 800, throttle: 0, kmh: 0, surface: 'road', slip: 0 }, false); }
  $('prNext').onclick = () => { if (isHost()) hostLoad(Math.min(PARK_COUNT, P.n + 1)); }; $('prAgain').onclick = () => { if (isHost()) hostLoad(P.n); }; $('prMap').onclick = () => { if (!isHost()) return; const p = loadProg(); if (P.mp) P.mp.net.broadcast({ t: 'pmap', progress: p }); toMap(p); };

  // ---------------- Eingabe ----------------
  const K = (...c) => c.some((x) => keys[x]);
  function driverInput() { if (P.auto) { const f = P.L.stages[P.stage].frames; const i = P.autoI; if (i + 3 >= f.length) return { th: 0, br: 1, steer: 0 }; P.st.gear = f[i + 3]; P.autoI += 4; return { th: f[i], br: f[i + 1], steer: f[i + 2] }; } if (!P.driver) return { th: 0, br: 1, steer: 0 }; if (P.driver === P.me) { const pl = me(); if (pl.tr || G.mode === 'paused') return { th: 0, br: 1, steer: 0 }; P.st.hand = K('Space') ? 1 : 0; return { th: K('KeyW', 'ArrowUp') ? 1 : 0, br: K('KeyS', 'ArrowDown') ? 1 : 0, steer: (K('KeyA', 'ArrowLeft') ? 1 : 0) - (K('KeyD', 'ArrowRight') ? 1 : 0) }; } const pl = P.players.get(P.driver); if (!pl || pl.tr || performance.now() - pl.inT > 1500) return { th: 0, br: 1, steer: 0 }; P.st.hand = pl.inp.hand ? 1 : 0; return pl.inp; }
  function wantGear(g, id = P.me) { if (id !== P.driver) return; if (!isHost()) { P.mp.net.send({ t: 'pact', a: 'gear', g }); return; } if (P.st.gear === g) return; if ((g < 0) !== (P.st.gear < 0) && Math.abs(P.st.v) > 0.3) { if (id === P.me) say('Erst anhalten!', 1); else P.mp.net.sendTo(id, { t: 'psay', text: 'Erst anhalten!' }); audio.rumble(0.7); return; } P.st.gear = g; audio.shift(g > P.st.gear, 0.4, 1800); }
  function nearVehicle(pl) { const rs = vehRects(P.st, P.def); const q = rect(pl.x, pl.z, 0, 0.3, 0.3); for (const r of rs) if (rectHit(q, r, 1.6)) return true; const w = exitWorld(); return Math.hypot(pl.x - w.x, pl.z - w.z) < 3; }
  function action(id, a, o = {}) {
    const pl = P.players.get(id); if (!pl || P.phase !== 'play' && P.phase !== 'intro') return; if (a === 'e') {
      if (pl.tr) return; if (pl.mode === 'drive') { if (Math.abs(P.st.v) > 0.3) { tell(id, 'Erst anhalten!'); return; } startTrans(pl, 'exit'); } else if (pl.mode === 'walk') { if (P.driver) { tell(id, `${P.players.get(P.driver).name} fährt gerade.`); return; } if (!nearVehicle(pl)) { tell(id, 'Zu weit weg vom Fahrzeug.'); return; } P.driver = id; startTrans(pl, 'enter'); }
    }
    if (a === 'tab') { if (pl.tr || pl.mode === 'drive') { if (pl.mode === 'drive') tell(id, 'Erst aussteigen (E).'); return; } pl.mode = pl.mode === 'walk' ? 'drone' : 'walk'; if (pl.mode === 'drone') { pl.y = Math.max(8, P.def.len * 0.9); pl.x += 0.01; } else { pl.y = 0; if (solidAt(pl.x, pl.z, 0.4)) freePlace(pl); } if (id === P.me) setHelp(); hudRoles(); if (P.mp && id !== P.me && P.mp.host) P.mp.net.sendTo(id, { t: 'pmode', m: pl.mode, x: pl.x, z: pl.z }); }
    if (a === 'mark') { P.mark = { x: o.x, z: o.z, t: 8, by: id }; if (P.mp && P.mp.host) P.mp.net.broadcast({ t: 'pmark', x: o.x, z: o.z, by: id }); }
    if (a === 'gear') wantGear(o.g, id);
  }
  function tell(id, text) { if (id === P.me) say(text, 1.3); else if (P.mp && P.mp.host) P.mp.net.sendTo(id, { t: 'psay', text }); }
  function request(a, o = {}) { if (isHost()) action(P.me, a, o); else P.mp.net.send({ t: 'pact', a, ...o }); }
  function freeNear(w) { const ok = (x, z) => !solidAt(x, z, 0.32) && !vehAt(x, z, 0.4); if (ok(w.x, w.z)) return w; for (let r = 0.6; r < 16; r += 0.6) for (let a = 0; a < 16; a++) { const x = w.x + Math.cos(a * 0.3927) * r; const z = w.z + Math.sin(a * 0.3927) * r; if (ok(x, z)) return { x, z }; } return w; }
  function startTrans(pl, kind) { const e = P.model.exit; const w = kind === 'exit' ? freeNear(exitWorld()) : { x: pl.x, z: pl.z }; pl.tr = { kind, t: 0, T: e.T, ex: w.x, ez: w.z }; pl.gest = 0; if (pl.mode === 'drive' && kind === 'exit') P.st.v = 0; if (pl.id === P.me) { setHelp(); } }
  function endTrans(pl) { const { kind, ex, ez } = pl.tr; pl.tr = null; if (kind === 'exit') { pl.x = ex; pl.z = ez; pl.h = P.st.h; pl.mode = 'walk'; pl.posBlock = performance.now() + 800; if (P.driver === pl.id) P.driver = null; if (pl.id === P.me) { P.yaw = P.st.h; P.pitch = 0.34; } } else { pl.mode = 'drive'; if (pl.id === P.me) { P.yaw = 0; P.pitch = 0.36; } } if (pl.id === P.me) setHelp(); hudRoles(); }
  function exitWorld() { const m = P.model; const e = m.exit; const sn = Math.sin(P.st.h); const cs = Math.cos(P.st.h); const lz = e.doorPos ? e.doorPos[2] : m.seat.z; return { x: P.st.x + cs * e.side * e.ox + sn * lz, z: P.st.z - sn * e.side * e.ox + cs * lz }; }
  function onKey(code, on, repeat) {
    if (!on || repeat) return false; if (code === 'Escape') { if (P.phase === 'map') return map.key(code); return false; } if (G.mode === 'paused') return false;
    if (P.phase === 'intro' && (code === 'Enter' || code === 'Space')) { if (isHost()) { startPlay(); if (P.mp) P.mp.net.broadcast({ t: 'pgo' }); } return true; }
    if (P.phase !== 'play') return P.phase === 'intro' || P.phase === 'fail'; const pl = me(); if (!pl) return false;
    if (code === 'KeyC') { toggleLook(); return true; }
    if (code === 'KeyE') { request('e'); return true; } if (code === 'Tab') { request('tab'); return true; }
    if (pl.mode === 'drive') { if (code === 'Digit1' || code === 'Numpad1') wantGear(1); else if (code === 'Digit2' || code === 'Numpad2') wantGear(2); else if (code === 'Digit3' || code === 'Numpad3') wantGear(3); else if (code === 'KeyR') wantGear(-1); else if (code === 'ShiftLeft') wantGear(P.st.gear < 0 ? 1 : Math.min(3, P.st.gear + 1)); else if (code === 'ControlLeft') wantGear(P.st.gear <= 1 ? -1 : P.st.gear - 1); else return false; return true; }
    if (pl.mode === 'walk' && /^Digit[1-4]$/.test(code)) { const g = +code[5]; pl.gest = pl.gest === g ? 0 : g; pl.gestT = 0; say(pl.gest ? `Du zeigst: ${GEST_TXT[g]}` : 'Arme runter', 1.2); return true; }
    return false;
  }
  function mouseLook(dx, dy) { P.yaw -= dx * 0.0024; P.pitch = clamp(P.pitch + dy * 0.0022, -0.25, 1.45); }
  function pointerDown(e) { if (!G.locked) { toggleLook(true); return; } const pl = me(); if (e.button === 0 && pl && pl.mode === 'drone') { cam.updateMatrixWorld(); cv3.set(0, 0, -1).applyQuaternion(cam.quaternion); if (cv3.y < -0.02) { const k = -cam.position.y / cv3.y; request('mark', { x: cam.position.x + cv3.x * k, z: cam.position.z + cv3.z * k }); } } }
  function pointerUp() {}

  // ---------------- Bewegung zu Fuß und in der Luft ----------------
  function ownMove(dt) {
    const pl = me(); if (!pl || pl.tr || pl.mode === 'drive' || G.mode === 'paused') return; const f = (K('KeyW', 'ArrowUp') ? 1 : 0) - (K('KeyS', 'ArrowDown') ? 1 : 0); const s = (K('KeyA', 'ArrowLeft') ? 1 : 0) - (K('KeyD', 'ArrowRight') ? 1 : 0); const yaw = P.yaw; const sn = Math.sin(yaw); const cs = Math.cos(yaw); const mx = sn * f + cs * s; const mz = cs * f - sn * s; const len = Math.hypot(mx, mz);
    if (pl.mode === 'walk') { const v = K('ShiftLeft') ? 5.4 : 3.2; if (len > 0.01) { const nx = pl.x + mx / len * v * dt; const nz = pl.z + mz / len * v * dt; const blocked = (x, z) => solidAt(x, z, 0.28) || vehAt(x, z, 0.28); const stuck = blocked(pl.x, pl.z); if (stuck || !blocked(nx, pl.z)) pl.x = nx; if (stuck || !blocked(pl.x, nz)) pl.z = nz; pl.h += wrapA(Math.atan2(mx, mz) - pl.h) * Math.min(1, dt * 12); pl.ph += dt * v * 3.1; pl.sp = v; } else pl.sp = 0; const B = P.L.bounds; pl.x = clamp(pl.x, B.x0 - 2, B.x1 + 2); pl.z = clamp(pl.z, B.z0 - 2, B.z1 + 2); }
    else { const v = 8 + pl.y * 0.8; if (len > 0.01) { pl.x += mx / len * v * dt; pl.z += mz / len * v * dt; } pl.h = yaw; pl.y = clamp(pl.y + ((K('Space') ? 1 : 0) - (K('ShiftLeft', 'ControlLeft') ? 1 : 0)) * 10 * dt, 3, 120 + P.def.len); pl.sp = len; }
  }

  // ---------------- Host-Rechnung ----------------
  const extras = [];
  function simStep() {
    const inp = driverInput(); stepVeh(P.st, P.def, inp, PARK_DT); P.lt += PARK_DT; P.time += PARK_DT; extras.length = 0; for (const r of P.parked) extras.push(r); if (Math.abs(P.st.v) > 0.02) for (const pl of P.players.values()) if (pl.mode === 'walk' && !pl.tr) extras.push({ ...rect(pl.x, pl.z, 0, 0.28, 0.28), kind: pl.name });
    const h = hitAny(P.st, P.def, P.L, P.lt, extras); if (h) { fail(NAMES[h.kind] || h.kind || 'Hindernis'); return; }
    const sp = P.L.stages[P.stage].spot; if (Math.abs(P.st.v) < 0.04 && inSpot(P.st, P.def, sp)) { P.hold += PARK_DT; if (P.hold >= 1.5) stageWon(); } else P.hold = 0;
  }
  const NAMES = { car: 'ein Auto', suvp: 'ein Geländewagen', vanp: 'ein Lieferwagen', wall: 'die Wand', bound: 'der Rand', house: 'eine Hauswand', pillar: 'eine Säule', hedge: 'die Hecke', trolley: 'ein Einkaufswagen', cone: 'ein Hütchen', barrier: 'die Absperrung', bollard: 'ein Poller', container: 'ein Container', crate: 'eine Kiste', pallet: 'eine Palette', pipe: 'die Rohre', digger: 'der Bagger', pile: 'ein Schrottberg', tires: 'die Reifen', dock: 'die Rampe', tankp: 'ein Panzer', jeepp: 'ein Jeep', sand: 'die Sandsäcke', wire: 'der Stacheldraht', wreck: 'ein Wrack', bus: 'der Bus', truckp: 'der LKW', tanker: 'der Tanklaster', terminal: 'das Terminal', jet: 'ein Jumbo', cessnap: 'ein Flugzeug', bagcart: 'ein Gepäckwagen', tow: 'Brunos Abschleppwagen', press: 'die Presse' };
  function netTick(dt) {
    if (!P.mp) return; P.sent += dt; const net = P.mp.net; if (P.mp.host) { if (P.sent < 0.05) return; P.sent = 0; const s = P.st; const pl = []; for (const q of P.players.values()) pl.push({ id: q.id, m: q.mode, x: r2(q.x), z: r2(q.z), h: r2(q.h), y: r2(q.y), g: q.gest, p: r2(q.ph), s: r2(q.sp), tr: q.tr ? q.tr.kind : '', tt: q.tr ? r2(q.tr.t) : 0, ex: q.tr ? r2(q.tr.ex) : 0, ez: q.tr ? r2(q.tr.ez) : 0 }); net.broadcast({ t: 'ps', x: r3(s.x), z: r3(s.z), h: r3(s.h), v: r3(s.v), s: r2(s.steer), g: s.gear, th2: r3(s.th2), lt: r2(P.lt), tm: r2(P.time), st: P.stage, hold: r2(P.hold), drv: P.driver, pl }); }
    else { if (P.sent < 0.033) return; P.sent = 0; const q = me(); if (!q) return; const drive = q.mode === 'drive' && !q.tr; const m = { t: 'pi', x: r2(q.x), z: r2(q.z), h: r2(q.h), y: r2(q.y), g: q.gest, p: r2(q.ph), s: r2(q.sp) }; if (drive && G.mode !== 'paused') { m.th = K('KeyW', 'ArrowUp') ? 1 : 0; m.br = K('KeyS', 'ArrowDown') ? 1 : 0; m.st = (K('KeyA', 'ArrowLeft') ? 1 : 0) - (K('KeyD', 'ArrowRight') ? 1 : 0); m.hd = K('Space') ? 1 : 0; } net.send(m); }
  }
  const r2 = (v) => Math.round(v * 100) / 100; const r3 = (v) => Math.round(v * 1000) / 1000;
  function message(from, m) {
    if (P.mp && P.mp.host) {
      if (m.t === 'pi') { const q = P.players.get(from); if (!q) return; if (q.mode !== 'drive' && !q.tr && performance.now() > (q.posBlock || 0)) { q.x = m.x; q.z = m.z; q.h = m.h; q.y = m.y; } q.gest = m.g; q.ph = m.p; q.sp = m.s; if (m.th !== undefined) { q.inp = { th: m.th, br: m.br, steer: m.st, hand: m.hd }; q.inT = performance.now(); } return; } if (m.t === 'pact') { action(from, m.a, m); } return;
    }
    if (m.t === 'pload') { load(m.n, m.tries); return; } if (m.t === 'pgo') { startPlay(); return; } if (m.t === 'pmap') { toMap(m.progress); return; }
    if (m.t === 'pfail') { P.tries = m.tries - 1; P.phase = 'play'; fail(m.what); return; } if (m.t === 'pwin') { P.tries = m.tries; P.phase = 'won'; showResult(m.tt, m.stars); return; } if (m.t === 'psay') { say(m.text, 1.4); return; } if (m.t === 'pmark') { P.mark = { x: m.x, z: m.z, t: 8, by: m.by }; return; } if (m.t === 'pmode') { const q = me(); if (q) { q.mode = m.m; q.x = m.x; q.z = m.z; if (m.m === 'drone') q.y = Math.max(8, P.def.len * 0.9); setHelp(); } return; } if (m.t === 'pstage') { if (P.stage !== m.i) { spawnVehicle(m.i); P.lt = m.lt; audio.ding(); say(`Geschafft! Weiter mit: ${P.def.name}`, 2.4); } return; }
    if (m.t === 'ps' && P.st) {
      if (P.phase === 'intro') startPlay(); if (m.st !== P.stage) spawnVehicle(m.st); P.target = m; P.lt = m.lt; P.time = m.tm; P.hold = m.hold; P.st.gear = m.g; const oldDrv = P.driver; P.driver = m.drv; for (const q of m.pl) { const o = P.players.get(q.id); if (!o) continue; if (q.id !== P.me) { o.tx = q.x; o.tz = q.z; o.th = q.h; o.ty = q.y; o.gest = q.g; o.ph = q.p; o.sp = q.s; } const was = o.mode; if (!o.tr || !q.tr) o.mode = q.tr === 'enter' ? 'walk' : q.tr === 'exit' ? 'drive' : q.m; if (q.tr && !o.tr) { o.tr = { kind: q.tr, t: q.tt, T: P.model.exit.T, ex: q.ex, ez: q.ez }; } else if (!q.tr && o.tr) { const { kind, ex, ez } = o.tr; o.tr = null; if (kind === 'exit') { o.x = o.tx = ex; o.z = o.tz = ez; o.h = o.th = P.st.h; } if (q.id === P.me) setHelp(); } if (q.tr && o.tr) o.tr.t = q.tt; if (was !== o.mode && q.id === P.me) setHelp(); } if (oldDrv !== m.drv) hudRoles();
    }
  }
  function playerJoined(id, name) { if (!P.mp || !P.mp.host || P.players.has(id)) return; const pl = makePlayer(id, name, P.players.size); if (P.W) { P.W.scene.add(pl.fig.root); P.W.scene.add(pl.space); P.W.scene.add(pl.label); P.W.scene.add(pl.icon); P.W.scene.add(pl.drone); freePlace(pl); P.mp.net.sendTo(id, { t: 'pload', n: P.n, tries: P.tries }); } else if (P.phase === 'map') P.mp.net.sendTo(id, { t: 'pmap', progress: loadProg() }); hudRoles(); }
  function playerLeft(id) { const pl = P.players.get(id); if (!pl) return; if (P.W) { P.W.scene.remove(pl.fig.root); P.W.scene.remove(pl.label); P.W.scene.remove(pl.icon); P.W.scene.remove(pl.drone); } P.players.delete(id); if (P.driver === id) P.driver = null; hudRoles(); }
  async function startCoop({ net, host }) { P.mp = { net, host }; P.players.clear(); P.me = net.me ? net.me.id : 'host'; const list = net.players; list.forEach((q, i) => makePlayer(q.id, q.name, i)); P.driver = list[0] ? list[0].id : null; [...P.players.values()].forEach((q, i) => { q.mode = i === 0 ? 'drive' : i === 1 ? 'walk' : 'drone'; }); P.n = 0; if (host) toMap(); else { P.phase = 'map'; toMap({ done: {}, fails: {} }); } }

  // ---------------- Figuren ----------------
  const hand = () => ({ wrist: V3(), F: V3(), P: V3(), grip: 0.4 }); const foot = () => ({ ankle: V3(), toe: V3() }); const pose = { x: 0, y: 1, z: 0, yaw: 0, lean: 0, slump: 0, hands: { L: hand(), R: hand() }, feet: { L: foot(), R: foot() } };
  function setStand(p, phase, sp, gest, t) {
    const amp = clamp(sp / 3, 0, 1.4); p.x = 0; p.z = 0; p.y = 0.97 + Math.abs(Math.cos(phase)) * 0.025 * amp; p.lean = 0.05 * amp; p.slump = 0; p.twist = Math.sin(phase) * 0.14 * amp; p.headYaw = 0; p.headPitch = 0;
    for (const [k, sg, ph] of [['L', 1, phase], ['R', -1, phase + Math.PI]]) { const s = Math.sin(ph); const c = Math.cos(ph); const f = p.feet[k]; const lift = Math.max(0, c) * 0.16 * amp; f.ankle.set(sg * 0.1, 0.09 + lift, s * 0.26 * amp); f.toe.set(sg * 0.11, 0.03 + lift * 0.6, s * 0.26 * amp + 0.17); const h = p.hands[k]; h.wrist.set(sg * 0.25, 0.84, -s * 0.22 * amp); h.F.set(0, -1, 0.05); h.P.set(-sg, 0, 0); h.grip = 0.45; }
    const L = p.hands.L; const R = p.hands.R; const w = Math.sin(t * 7);
    if (gest === 1) { L.wrist.set(0.3, 1.66, 0.26); R.wrist.set(-0.3, 1.66, 0.26); for (const h of [L, R]) { h.F.set(0, 1, 0); h.P.set(0, 0, 1); h.grip = 0; } }
    if (gest === 2) { L.wrist.set(0.74, 1.42 + w * 0.08, 0.1); L.F.set(1, 0.1, 0); L.P.set(0, 0, 1); L.grip = 0; }
    if (gest === 3) { R.wrist.set(-0.74, 1.42 + w * 0.08, 0.1); R.F.set(-1, 0.1, 0); R.P.set(0, 0, 1); R.grip = 0; }
    if (gest === 4) { const b = 0.2 + w * 0.2; L.wrist.set(0.34, 1.38 + b * 0.5, 0.42 - b * 0.4); R.wrist.set(-0.34, 1.38 + b * 0.5, 0.42 - b * 0.4); for (const h of [L, R]) { h.F.set(0, 1, -0.3 - b); h.P.set(0, 0, -1); h.grip = 0.1; } }
  }
  function setSeat(p, m, steer, yaw) {
    const s = m.seat; p.x = s.x; p.y = s.y; p.z = s.z; p.yaw = yaw; p.lean = s.bike ? 0.42 : 0.08; p.slump = 0.06; p.twist = 0; p.headYaw = 0; p.headPitch = s.bike ? 0.3 : 0;
    if (s.bike) { const a = steer * 0.34; for (const [k, sg] of [['L', 1], ['R', -1]]) { const h = p.hands[k]; h.wrist.set(sg * 0.34 * Math.cos(a), 1.12, 1.34 + sg * 0.34 * Math.sin(a) * -1); h.F.set(sg * 0.2, -0.3, 0.9); h.P.set(0, -1, 0); h.grip = 0.9; const f = p.feet[k]; f.ankle.set(sg * 0.2, 0.42, 0.42); f.toe.set(sg * 0.22, 0.34, 0.6); } return; }
    if (s.hatch) { p.y = s.y; for (const [k, sg] of [['L', 1], ['R', -1]]) { const h = p.hands[k]; h.wrist.set(sg * 0.42, 2.44, 0.1); h.F.set(sg, 0, 0.3); h.P.set(0, -1, 0); h.grip = 0.7; const f = p.feet[k]; f.ankle.set(sg * 0.12, 1.0, -0.1); f.toe.set(sg * 0.12, 0.96, 0.08); } return; }
    const cy = s.y + 0.34; const cz = s.z + 0.58; for (const [k, sg] of [['L', 1], ['R', -1]]) { const a = steer * 1.4; const rx = sg * 0.17 * Math.cos(a); const ry = -sg * 0.17 * Math.sin(a); const h = p.hands[k]; h.wrist.set(s.x + rx, cy + ry, cz - 0.06); h.F.set(-sg * 0.4, 0, 1); h.P.set(-sg, 0, 0.1); h.grip = 0.85; const f = p.feet[k]; f.ankle.set(s.x + sg * 0.13, s.y - 0.46, s.z + s.feet); f.toe.set(s.x + sg * 0.13, s.y - 0.5, s.z + s.feet + 0.18); }
  }
  function drawFigure(pl, t) {
    const f = pl.fig; const m = P.model; f.root.visible = pl.mode !== 'drone'; pl.drone.visible = pl.mode === 'drone'; pl.label.visible = pl.id !== P.me && pl.mode !== 'drone'; pl.icon.visible = false; const headY = 2.1;
    if (pl.mode === 'drone') { pl.drone.position.set(pl.x, pl.y, pl.z); pl.drone.rotation.y = pl.h; for (const r of pl.drone.userData.rot) r.rotation.y += 0.9; pl.label.visible = pl.id !== P.me; pl.label.position.set(pl.x, pl.y + 0.5, pl.z); return; }
    if (pl.tr && m) { const u = clamp(pl.tr.t / pl.tr.T, 0, 1); const v = pl.tr.kind === 'exit' ? u : 1 - u; transPose(pl, m, v); f.pose(m.group, pose); const e = m.exit; if (e.door) e.door.set(e.kind === 'slide' ? smooth(0.05, 0.25, v) : smooth(0, 0.2, v) * (1 - smooth(0.78, 1, v))); return; }
    if (pl.mode === 'drive' && m) { if (pl.id === P.me && m.cockpit.noFig) { f.root.visible = false; pl.label.visible = false; return; } setSeat(pose, m, P.st.steer, m.group.rotation.y); f.pose(m.group, pose); pl.label.visible = false; return; }
    pl.space.position.set(pl.x, 0, pl.z); pl.space.rotation.y = pl.h; pose.yaw = pl.h; setStand(pose, pl.ph, pl.sp, pl.gest, t); f.pose(pl.space, pose); pl.label.position.set(pl.x, headY + 0.1, pl.z); if (pl.gest && pl.id !== P.me) { setIcon(pl, GEST[pl.gest]); pl.icon.visible = true; pl.icon.position.set(pl.x, headY + 0.85, pl.z); } else setIcon(pl, '');
  }
  function transPose(pl, m, u) {
    const s = m.seat; const e = m.exit; const stand = smooth(0.15, 0.85, u); setSeat(pose, m, 0, m.group.rotation.y); const hipsS = [s.x, s.y, s.z]; const z = e.doorPos ? e.doorPos[2] : s.z; const dx = pl.tr.ex - P.st.x; const dz = pl.tr.ez - P.st.z; const sn = Math.sin(P.st.h); const cs = Math.cos(P.st.h); const end = [dx * cs - dz * sn, 0.97, dx * sn + dz * cs]; const lz = end[2]; let x; let y; let zz;
    if (e.kind === 'hatch') { if (u < 0.35) { const k = u / 0.35; x = 0; y = lerp(hipsS[1], 3.02, k); zz = s.z; } else if (u < 0.62) { const k = (u - 0.35) / 0.27; x = lerp(0, 2, k); y = lerp(3.02, 2.55, k) + Math.sin(k * Math.PI) * 0.22; zz = s.z; } else { const k = clamp((u - 0.62) / 0.24, 0, 1); x = lerp(2, end[0], k); y = lerp(2.55, 0.97, k * k); zz = lerp(s.z, lz, k); } }
    else if (e.kind === 'slide') { if (u < 0.28) { const k = u / 0.28; x = lerp(s.x, 3, k); y = lerp(s.y, 7.9, k); zz = lerp(s.z, z, k); } else { const k = clamp((u - 0.28) / 0.6, 0, 1); x = lerp(3.4, end[0], k); y = lerp(7.6, 0.97, k); zz = lerp(z, lz, k); } }
    else { const k = smooth(0.2, 0.78, u); x = lerp(s.x, end[0], k); y = lerp(s.y, 0.97, smooth(0.25, 0.8, u)); zz = lerp(s.z, lz, k); }
    pose.x = x; pose.y = y; pose.z = zz; pose.lean = 0.05; pose.slump = 0; for (const [k, sg] of [['L', 1], ['R', -1]]) { const f = pose.feet[k]; const h = pose.hands[k]; const ax = lerp(f.ankle.x, x + sg * 0.1, stand); const ay = lerp(f.ankle.y, y - 0.88, stand); const az = lerp(f.ankle.z, zz, stand); f.ankle.set(ax, ay, az); f.toe.set(ax, ay - 0.05, az + 0.17); h.wrist.lerp(cv3.set(x + sg * 0.26, y - 0.14, zz), stand); h.F.lerp(cv3.set(0, -1, 0), stand).normalize(); h.P.lerp(cv3.set(-sg, 0, 0), stand).normalize(); h.grip = 0.45; }
  }

  // ---------------- Kamera ----------------
  const camPos = V3(); const look = V3();
  function camera(dt) {
    const pl = me(); if (!pl) return; const st = P.st; const def = P.def; cam.fov = pl.mode === 'drive' && !pl.tr && P.phase !== 'intro' ? 78 : 60; const dd = clamp(def.len + (def.trailer ? 12 : 0), 4, 90); if (P.phase === 'intro') { const sp = P.L.stages[P.stage].spot; const k = smooth(0, 3.2, P.introT); const r = dd * 2.1 + 16; const cx = lerp(sp.x, st.x, k); const cz = lerp(sp.z, st.z, k); const a = P.introT * 0.22 + 0.7; cam.position.set(cx + Math.sin(a) * r, r * 0.62, cz + Math.cos(a) * r); cam.lookAt(cx, 1, cz); return; }
    if (pl.mode === 'drone') { cam.position.set(pl.x, pl.y, pl.z); cam.rotation.order = 'YXZ'; cam.rotation.set(-clamp(0.5 + P.pitch * 0.8, 0.2, 1.54), P.yaw + Math.PI, 0); return; }
    if (pl.tr) { const m = P.model; const e = m.exit; const sn = Math.sin(st.h); const cs = Math.cos(st.h); const lz = e.doorPos ? e.doorPos[2] : m.seat.z; const out = e.side * (e.ox + clamp(def.len * 0.28 + 3, 4, 13)); const px = st.x + cs * out + sn * (lz - 2.5); const pz = st.z - sn * out + cs * (lz - 2.5); const ty = e.kind === 'slide' ? 4.6 : Math.min(def.h * 0.5, 2); const tx = st.x + cs * e.side * e.ox * 0.7 + sn * lz; const tz = st.z - sn * e.side * e.ox * 0.7 + cs * lz; const py = ty + 1.3; cam.position.lerp(cv3.set(px, py, pz), 1 - Math.exp(-dt * 7)); cam.lookAt(tx, ty, tz); return; }
    const inCar = pl.mode === 'drive';
    if (inCar) { // Der Fahrer sitzt immer im Fahrzeug: nur der Blick durch die Scheiben, Kopf drehen geht
      const m = P.model; const e = m.cockpit.eye; cv3.set(e[0], e[1], e[2]).applyMatrix4(m.group.matrixWorld); cam.position.copy(cv3); cam.rotation.order = 'YXZ'; cam.rotation.set(clamp(0.16 - P.pitch, -1, 0.7), st.h + Math.PI + clamp(P.yaw, -2.9, 2.9), 0); return;
    }
    const d = 4.4; const yaw = P.yaw; const pc = clamp(P.pitch, -0.2, 1.3); const cp = Math.cos(pc); look.set(pl.x, 1.55, pl.z); cam.position.set(pl.x - Math.sin(yaw) * d * cp, 1.55 + Math.sin(pc) * d, pl.z - Math.cos(yaw) * d * cp); if (cam.position.y < 0.3) cam.position.y = 0.3; if (P.W.ceil) cam.position.y = Math.min(cam.position.y, 2.72); cam.lookAt(look);
  }

  // ---------------- Anzeige ----------------
  function say(text, s = 2) { const el = $('pkToast'); el.textContent = text; el.classList.toggle('hidden', !text); P.sayT = s; }
  function setHelp() { const pl = me(); if (!pl) return; const m = pl.mode; const keysOf = m === 'drive' ? [['W', 'Gas'], ['S', 'Bremse'], ['A', 'links'], ['D', 'rechts'], ['1 2 3 R', 'Gänge'], ['Leertaste', 'Handbremse'], ['E', 'aussteigen'], ['Klick', 'umsehen']] : m === 'walk' ? [['W A S D', 'gehen'], ['1', 'Stopp'], ['2', 'Links'], ['3', 'Rechts'], ['4', 'Komm'], ['E', 'einsteigen'], ['Tab', 'Drohne']] : [['W A S D', 'fliegen'], ['Leertaste', 'hoch'], ['Umschalt', 'runter'], ['Klick', 'markieren'], ['Tab', 'landen']]; $('pkHelp').innerHTML = keysOf.map(([k, t]) => `<span><kbd>${k}</kbd>${t}</span>`).join(''); const helper = m !== 'drive'; for (const id of ['pkGear', 'pkSens', 'pkArrow']) $(id).classList.toggle('hidden', !helper); if (P.W) P.W.beam(helper); }
  function hudRoles() { const el = $('pkRoles'); if (!el) return; el.textContent = ''; for (const q of P.players.values()) { const d = document.createElement('div'); d.style.color = q.look.css; d.textContent = `${q.name}: ${ROLE[q.mode]}${q.id === P.me ? ' (du)' : ''}`; el.appendChild(d); } if (!P.driver && P.phase === 'play') { const d = document.createElement('div'); d.textContent = 'Fahrersitz frei'; el.appendChild(d); } }
  let lastRoleKey = '';
  function hud(dt) {
    const st = P.st; const kmh = Math.abs(st.v) * 3.6; $('pkKmh').textContent = kmh.toFixed(0); $('pkTime').textContent = fmt(P.time); const L = P.L; $('pkInfo').textContent = `${L.stages.length > 1 ? `Abschnitt ${P.stage + 1} von ${L.stages.length}: ` : ''}${VEH[L.stages[P.stage].veh].name}, ${P.tries}× verkackt`; for (const b of document.querySelectorAll('#pkGear [data-g]')) b.classList.toggle('on', +b.dataset.g === st.gear);
    const sp = L.stages[P.stage].spot; const dx = sp.x - st.x; const dz = sp.z - st.z; const yawView = Math.atan2(cv3.set(0, 0, -1).applyQuaternion(cam.quaternion).x, cv3.z); const a = Math.atan2(dx, dz) - yawView; const pl = me(); $('pkArrowI').style.transform = `rotate(${(-a) * 180 / Math.PI}deg)`; $('pkDist').textContent = `${Math.hypot(dx, dz).toFixed(0)} m`; const hold = P.hold / 1.5; $('pkHold').classList.toggle('hidden', hold <= 0); $('pkHoldI').style.width = `${hold * 100}%`; void pl;
    // Der Abstandsbalken gehört den Helfern draußen, im Cockpit gibt es weder Balken noch Piepen
    if (me().mode !== 'drive') { const rs = vehRects(st, P.def); L.grid.near(st.x, st.z, P.def.radius + 4, near); let lvl = 0; for (const [pad, n] of [[1.6, 1], [0.9, 2], [0.45, 3], [0.2, 4]]) { let hit = false; for (const r of rs) { for (const o of near) if (rectHit(r, o, pad)) { hit = true; break; } if (hit) break; } if (hit) lvl = n; else break; } P.sens = lvl; const bars = $('pkSens').children; for (let i = 0; i < bars.length; i++) bars[i].classList.toggle('on', i < lvl); }
    if (P.sayT > 0) { P.sayT -= dt; if (P.sayT <= 0) $('pkToast').classList.add('hidden'); } if (P.flash > 0) { P.flash = Math.max(0, P.flash - dt * 1.3); const f = $('pkFlash'); f.classList.toggle('hidden', P.flash <= 0); f.style.opacity = P.flash; } const rk = [...P.players.values()].map((o) => o.mode).join() + P.driver; if (rk !== lastRoleKey) { lastRoleKey = rk; hudRoles(); }
  }

  // ---------------- Bild ----------------
  function frame(dt, tAbs) {
    if (!P.on) return; const paused = G.mode === 'paused'; if (P.phase === 'intro') { P.introT += paused ? 0 : dt; if (isHost() && P.introT > 3.4 && !P.mp) startPlay(); if (isHost() && P.mp && P.introT > 3.4) { startPlay(); P.mp.net.broadcast({ t: 'pgo' }); } }
    if (P.phase === 'fail') { P.failT -= dt; if (P.failT <= 0) restart(); }
    const run = P.phase === 'play' && !(paused && !P.mp); if (run) { ownMove(dt); for (const pl of P.players.values()) if (pl.tr) { pl.tr.t += dt; if (pl.tr.t >= pl.tr.T && isHost()) endTrans(pl); } if (isHost()) { const sp = P.speed || 1; P.acc += Math.min(dt, 0.1) * sp; let n = 0; while (P.acc >= PARK_DT && n++ < 8 * sp && P.phase === 'play') { simStep(); P.acc -= PARK_DT; } if (n >= 8 * sp) P.acc = 0; } else clientSmooth(dt); netTick(dt); }
    if (P.mark) { P.mark.t -= dt; if (P.mark.t <= 0) P.mark = null; } P.markM.visible = !!P.mark; if (P.mark) { P.markM.position.x = P.mark.x; P.markM.position.z = P.mark.z; const s = 1 + Math.sin(tAbs * 5) * 0.14; P.markM.scale.set(s, 1, s); }
    const st = P.st; const m = P.model; const q0 = me(); const inside = !!q0 && q0.mode === 'drive' && !q0.tr && P.phase !== 'intro'; if (m !== P.insideModel || inside !== P.inside) { P.inside = inside; P.insideModel = m; m.setInside(inside); if (q0) q0.fig.setOwn(inside); } if (inside) m.cockpit.tick(st.v, st.gear, st.steer); m.group.position.set(st.x, 0, st.z); m.group.rotation.y = st.h; m.parked = !P.driver; m.update(dt, st.v, st.steer); if (m.trailer) { m.trailer.position.set(st.x, 0, st.z); m.trailer.rotation.y = st.th2; } m.group.updateMatrixWorld(true);
    for (const pl of P.players.values()) if (pl.id !== P.me && !isHost()) smoothOther(pl, dt); for (const pl of P.players.values()) drawFigure(pl, tAbs);
    P.W.update(P.lt, tAbs); const q = me(); const fx = q && q.mode !== 'drive' ? (q.mode === 'drone' ? q.x : q.x) : st.x; const fz = q && q.mode !== 'drive' ? q.z : st.z; P.W.follow(fx, fz); camera(dt); if (P.W.ceil) P.W.ceil.visible = !(q && q.mode === 'drone'); if (P.phase === 'play' || P.phase === 'fail') hud(dt);
    audio.update({ rpm: st.rpm, throttle: P.driver && Math.abs(st.v) > 0.05 ? 0.3 : 0.05, kmh: Math.abs(st.v) * 3.6, surface: 'road', slip: 0 }, !paused && !!P.driver);
    post.watch(dt, !paused); const dprNow = Math.min(window.devicePixelRatio || 1, 1.5); if (renderer.getPixelRatio() !== dprNow) { renderer.setPixelRatio(dprNow); renderer.setSize(window.innerWidth, window.innerHeight, false); } cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); cam.updateProjectionMatrix(); cam.updateMatrixWorld(); renderer.shadowMap.needsUpdate = settings.shadows; post.render(P.W.scene, cam, { mood: P.W.mood, sky: P.W.sky, sun: P.W.sun, sunDir: P.W.sunDir, dt, time: tAbs, speed: 0, nitro: 0, ground: 0, camPos: cam.position });
    // Endgegner: Der Fahrer bekommt einen Rückspiegel, sonst bleibt es beim reinen Cockpit-Blick
    if (inside && P.L.boss && (P.phase === 'play' || P.phase === 'fail')) mirror.render(P.W.scene, st, P.def, P.W.mood.exposure || 1); else mirror.rect = null; const tEl = $('pkToast'); const tTop = mirror.rect ? `${mirror.rect.y + mirror.rect.h + 16}px` : ''; if (tEl.style.top !== tTop) tEl.style.top = tTop;
  }
  function clientSmooth(dt) { const m = P.target; if (!m) return; const st = P.st; const k = 1 - Math.exp(-dt * 14); st.v = m.v; const fx = Math.sin(st.h) * st.v * dt; const fz = Math.cos(st.h) * st.v * dt; st.x += fx + (m.x - st.x) * k; st.z += fz + (m.z - st.z) * k; st.h += wrapA(m.h - st.h) * k; st.th2 += wrapA(m.th2 - st.th2) * k; st.steer += (m.s - st.steer) * k; st.rpm = 900 + Math.abs(st.v) * 700; }
  function smoothOther(pl, dt) { if (pl.tx === undefined) return; const k = 1 - Math.exp(-dt * 12); pl.x += (pl.tx - pl.x) * k; pl.z += (pl.tz - pl.z) * k; pl.h += wrapA(pl.th - pl.h) * k; pl.y += (pl.ty - pl.y) * k; }

  const api = { open, stop, frame, onKey, mouseLook, pointerDown, pointerUp, startCoop, message, playerJoined, playerLeft, active: () => P.on || P.phase === 'map', toMap, load: hostLoad, state: P, mirror, hide: () => map.hide(), mapKey: (c) => map.key(c), fail, restart, free: (x, z) => !solidAt(x, z, 0.28), inSpot: () => inSpot(P.st, P.def, P.L.stages[P.stage].spot) };
  Object.defineProperty(api, 'mp', { get: () => P.mp });
  return api;
}
