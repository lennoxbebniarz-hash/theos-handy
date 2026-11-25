// Theos Seitenscheidel - Spielablauf: Menüs/Lobby, Einstellungen, Rollen (Fahrer/Navigator), Eingabe, Zeitnahme, Kamera, Schlamm/Kurbel, Radio, Anzeige.
// Aufbau (für spätere Erweiterungen): track.js + layouts.js + sim.js = reine Spiellogik (netzwerkfähig: nur `state` teilen),
// raceworld.js/cockpit.js/navigator.js = Darstellung, audio.js/radio.js = Ton, ai.js = KI-Fahrer. Ingenieur (Motor reparieren) folgt später.
import * as THREE from './vendor/three.module.min.js';
import { buildRaceWorld } from './raceworld.js';
import { createRacePost, POST_LEVELS } from './racepost.js';
import { buildTextures, textureSteps } from './racetex.js';
import { upgradeInterior, buildEngine, addDetails, buildHood, createInteriorShadow, figureMaterial } from './raceinterior.js';
import { createFigure } from './racefigure.js';
import { createShifter } from './shifter.js';
import { createMp } from './mp.js';
import { createDino } from './dino.js';
import { createStapel } from './stapel.js';
import { SCHUL_SPIELE, trageEin, mische, rangliste, sauberesBuch, treppchen } from './schulrang.js';
import { createRaceMp, ROLE_NAME } from './racemp.js';
import { MP_VERSION, scanLobbies, peerTransport } from './net.js';
import { buildCockpit, EYE, EYE_N } from './cockpit.js';
import { buildTrack, DIFFICULTIES, DIFFICULTY_ORDER } from './track.js';
import { createState, step, kmh, CAR } from './sim.js';
import { createMoon } from './moon.js';
import { createPark } from './park.js';
import { createChess } from './chess.js';
import { createPong } from './pong.js';
import { createShips } from './ships.js';
import { createRaus } from './raus.js';
import { createBaron } from './baron.js';
import { createKraft } from './kraft.js';
import { createSaege } from './saege.js';
import { createLudwig } from './ludwig.js';
import { createStrom } from './strom.js';
import { createBruno } from './bruno.js';
import { createOzean } from './ozean.js';
import { createCasino } from './casino.js';
import { createTitel, hasTitel } from './titel.js';
import { createSchrank } from './schrank.js';
import { createErfolge } from './erfolge.js';
import { SOUND_GROUPS } from './soundmix.js';
import { createRoadmap, medalOf, campaignWon } from './roadmap.js';
import { buildCar } from './carmodel.js';
import { headlights } from './racescene.js';
import { initUpdate } from './update.js';
import { initSpielstaende } from './spielstaende.js';
import { pokale } from './zimmerwahl.js';
import { GameAudio } from './audio.js';
import { drawTablet, jamTablet } from './navigator.js';
import { aiInput, stepRival, rivalPos } from './ai.js';
import { createVehicle, tickVehicle, computePerf, popWarning, requestNitro, nitroStatus, spawn, urgentDamage, DEFS, NITRO_MAX } from './damage.js';
import { createFx } from './fx.js';
import { targetLabel, neededItem, createEngineer, click as engClick, hold as engHold, release as engRelease, tickEngineer, hintText, highlightIds, createEngineerAI, stepEngineerAI } from './engineer.js';
import { createProps, stepProps, takeProp, putProp } from './props.js';
import { drawDiag, drawWarn, drawNitroGauge, drawGuide, ENG_BOUNDS, ENG_START } from './workshop.js';

const $ = (id) => document.getElementById(id);
const store = { get(k, d) { try { const v = localStorage.getItem('www.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('www.' + k, JSON.stringify(v)); } catch { /* egal */ } } };
// ---------------- Schulmodus (Lennox, 2026-11-23) ----------------
// Schalter „Schule“ neben „Beenden“ im Zimmer: derselbe Schrank mit Schul-Spielen, stumm, leichte Grafik. Startet immer normal.
// Taste N schließt Theos sofort (nur im Schulmodus, nie beim Tippen in ein Feld). Steht ganz vorn, damit keine andere Taste sie abfängt.
const schul = { an: false, tonVorher: false };
window.addEventListener('keydown', (e) => {
  if (!schul.an || e.code !== 'KeyN' || e.ctrlKey || e.altKey || e.metaKey) return;
  const t = e.target; if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  document.documentElement.style.visibility = 'hidden'; // sofort nichts mehr zu sehen, auch wenn das Schließen einen Moment dauert
  try { window.close(); } catch { /* egal */ }
}, true);
const fmt = (t) => { const m = Math.floor(t / 60); const s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ---------------- Einstellungen und Tastenbelegung ----------------
const BIND_DEFAULT = { throttle: 'KeyW', brake: 'KeyS', left: 'KeyA', right: 'KeyD', hand: 'Space', use: 'KeyE', look: 'KeyC', reset: 'Backspace', role: 'Tab', nitro: 'KeyN' };
const BIND_LABEL = { throttle: 'Gas', brake: 'Bremse, im Stand rückwärts', left: 'Links lenken', right: 'Rechts lenken', hand: 'Handbremse', use: 'Benutzen (Navigator: Kurbel halten)', look: 'Maus-Umsehen an/aus', reset: 'Strecke neu starten', role: 'Rolle wechseln (Solo-Test)', nitro: 'Nitro rufen (Zuruf an den Ingenieur, der zündet)' };
const ALT = { throttle: 'ArrowUp', brake: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const FIXED_KEYS = ['KeyQ', 'Escape', 'Enter', 'KeyT', 'KeyG', 'KeyH', 'KeyV', 'KeyB', 'KeyM', 'F11'];
const settings = { quality: 'high', shadows: true, volume: 80, radioVolume: 60, difficulty: 'easy', role: 'driver', damage: 'normal', engAI: 'slow', ...store.get('settings', {}) };
if (!DIFFICULTIES[settings.difficulty]) settings.difficulty = 'easy'; settings.binds = { ...BIND_DEFAULT, ...(settings.binds || {}) }; if (settings.binds.reset === 'KeyR') settings.binds.reset = 'Backspace'; // R gehört der Schaltkulisse
if (!settings.sound || typeof settings.sound !== 'object') settings.sound = {};
const saveSettings = () => store.set('settings', settings);
// Vollbild: das ganze Fenster über das Hauptprogramm (Esc beendet es nicht), die Wahl wird gemerkt und beim nächsten Start wieder angeschaltet.
// Immer F11 (das Hauptprogramm fängt die Taste ab, bevor ein Spiel sie sieht). Ohne Electron (Browser) gilt das Vollbild der Seite.
const fullscreen = {
  on: false,
  async set(want) {
    if (window.fenster) { try { this.on = !!(await window.fenster.vollbild(want)); } catch { /* Fenster weg */ } }
    else { try { if (want === 'toggle') want = !document.fullscreenElement; if (want && !document.fullscreenElement) await document.documentElement.requestFullscreen(); else if (!want && document.fullscreenElement) await document.exitFullscreen(); } catch { /* nicht erlaubt */ } this.on = !!document.fullscreenElement; }
    settings.fullscreen = this.on; saveSettings(); return this.on;
  },
  toggle() { return this.set('toggle'); },
};
if (window.fenster) { if (window.fenster.onChange) window.fenster.onChange((on) => { if (fullscreen.on === on && settings.fullscreen === on) return; fullscreen.on = on; settings.fullscreen = on; saveSettings(); }); if (settings.fullscreen) fullscreen.set(true); else window.fenster.vollbild().then((v) => { fullscreen.on = !!v; }).catch(() => {}); }
const keyName = (code) => ({ Space: 'Leertaste', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ControlLeft: 'Strg', Enter: 'Enter' }[code] || code.replace(/^Key/, '').replace(/^Digit/, ''));

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('menu').classList.add('hidden'); $('fatalMsg').textContent = 'WebGL konnte nicht gestartet werden: ' + (e && e.message); $('fatal').classList.remove('hidden'); throw e;
}
if (!settings.gfx2) { settings.gfx2 = 1; try { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); const nm = e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : ''; if (settings.quality !== 'low' && /RTX|RX\s?[5-9]\d{3}|RX\s?[5-9]\d\d\b|Arc\b/i.test(nm)) settings.quality = 'ultra'; } catch { /* egal */ } saveSettings(); }
let quality = settings.quality;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;

const post = createRacePost(renderer); const postCam = new THREE.Vector3();
const cockpit = buildCockpit();
const audio = new GameAudio(); audio.mix = settings.sound;
const car = new THREE.Group(); car.add(cockpit.root); const LAYER_BODY = 2; const LAYER_GRASS = 3; const ownBody = buildCar({ paint: 0xa81a12, trim: 0xf0ece0, number: 7, name: 'THEO' }); ownBody.group.traverse((o) => o.layers.set(LAYER_BODY)); car.add(ownBody.group); const headL = headlights(); headL.visible = false; car.add(headL);
const camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.05, 1500); camera.layers.enable(cockpit.LAYER_COCKPIT); camera.layers.enable(3);
camera.rotation.order = 'YXZ'; camera.position.copy(EYE); car.add(camera);
const menuCam = new THREE.PerspectiveCamera(55, 16 / 9, 0.5, 1500); menuCam.layers.enable(cockpit.LAYER_COCKPIT); menuCam.layers.enable(3);
let activeCam = menuCam;
let track = null; let world = null; let scene = null; let trackKey = null;

// Strecke laden: baut Strecke und Welt neu (die alte Welt wird freigegeben); Auto und Menükamera ziehen in die neue Szene um
const boot = { it: null, hold: false, warm: null, compiling: false, shown: false };
function bootStep() {
  if (boot.compiling) return; if (boot.warm) { if (boot.warm.next().done) { boot.warm = null; boot.hold = false; } return; } if (!boot.it) { boot.hold = false; return; }
  if (!boot.it.next().done) return; boot.it = null; if (world) return; loadTrack(G.diff); boot.hold = true; boot.compiling = true; const done = () => { boot.compiling = false; boot.warm = post.warm(); };
  menuCam.updateMatrixWorld(true); Promise.resolve().then(() => renderer.compileAsync(scene, menuCam)).then(done, done);
}
// Innenraum und Motorraum: Beim ersten Bedarf umrüsten
let inner = null;
function fineInterior() {
  if (inner) return; const T = buildTextures(renderer); const u = upgradeInterior(cockpit, T); const engine = buildEngine(T); const ws = cockpit.workshop; for (const c of ws.eng.children) if (c !== ws.bay) c.visible = false; ws.eng.add(engine.group); const details = addDetails(cockpit, T); const hood = buildHood(T); hood.position.set(0, 0.79, 2.3); hood.rotation.x = 0.08; cockpit.root.add(hood); hood.traverse((o) => { o.layers.set(cockpit.LAYER_COCKPIT); if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); engine.group.traverse((o) => o.layers.set(cockpit.LAYER_COCKPIT)); cockpit.hoodBox.visible = false; inner = { u, engine, details, hood, shadow: createInteriorShadow(renderer, cockpit.LAYER_COCKPIT), frame: 0 };
  const skinM = figureMaterial(); const mk = (shirt, cap, hair, skin) => createFigure({ material: skinM, shirt, cap, hair, skin }); cockpit.attachFigures({ driver: mk(0xc0332a, 0x8a221c, 0x3a2a1e, 0xe2b08c), navigator: mk(0x2c62c8, 0x1c3f86, 0x1e1a18, 0xd8a47e), engineer: mk(0xe8821e, 0xa8540e, 0x5a3a20, 0xeabc98) }); applyRole(G.role);
}
// ---------------- Spiegel: Das Auge wird an der Glasebene gespiegelt, die Kamera blickt von dort durch das Glas (Sichtkegel genau auf die Glasfläche). Reihum ein Spiegel je Bild, Gras bleibt draußen ----------------
const MIRROR = { i: 0, list: [], v: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], N: new THREE.Vector3(), U: new THREE.Vector3(), X: new THREE.Vector3(), Z: new THREE.Vector3(), C: new THREE.Vector3(), E: new THREE.Vector3(), R: new THREE.Vector3(), m: new THREE.Matrix4() };
function mirrorsReady() { if (MIRROR.list.length) return; for (const t of cockpit.mirrors) { const sc = quality === 'ultra' ? 1.5 : quality === 'high' ? 1 : 0.7; const inner0 = t.kind === 'inner'; const rt = new THREE.WebGLRenderTarget(Math.round((inner0 ? 512 : 300) * sc), Math.round((inner0 ? 128 : 190) * sc), { type: THREE.HalfFloatType, depthBuffer: true, samples: 0, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }); const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 900); cam.matrixAutoUpdate = true; cam.layers.set(0); if (inner0) cam.layers.enable(cockpit.LAYER_COCKPIT); else cam.layers.enable(LAYER_BODY); t.mesh.material.map = rt.texture; t.mesh.material.needsUpdate = true; if (t.mesh.userData.fine) { t.mesh.userData.fine.map = rt.texture; t.mesh.userData.fine.needsUpdate = true; } MIRROR.list.push({ ...t, rt, cam }); } }
function renderMirrors() {
  mirrorsReady(); const M = MIRROR; const n = M.list.length; if (!n) return; const t = M.list[M.i % n]; M.i++; const g = t.mesh; g.updateWorldMatrix(true, false); const hw = t.w / 2; const hh = t.h / 2; M.v[0].set(-hw, -hh, 0).applyMatrix4(g.matrixWorld); M.v[1].set(hw, -hh, 0).applyMatrix4(g.matrixWorld); M.v[2].set(hw, hh, 0).applyMatrix4(g.matrixWorld); M.v[3].set(-hw, hh, 0).applyMatrix4(g.matrixWorld);
  M.C.setFromMatrixPosition(g.matrixWorld); M.N.set(0, 0, 1).transformDirection(g.matrixWorld); camera.getWorldPosition(M.E); const dist = M.E.clone().sub(M.C).dot(M.N); if (dist < 0.02) return; M.R.copy(M.E).addScaledVector(M.N, -2 * dist); M.U.copy(M.v[3]).sub(M.v[0]).normalize(); M.Z.copy(M.N).negate(); M.X.crossVectors(M.U, M.Z).normalize();
  let l = 1e9; let r = -1e9; let b = 1e9; let tp = -1e9; for (const p of M.v) { const dx = p.x - M.R.x; const dy = p.y - M.R.y; const dz = p.z - M.R.z; const x = dx * M.X.x + dy * M.X.y + dz * M.X.z; const y = dx * M.U.x + dy * M.U.y + dz * M.U.z; l = Math.min(l, x); r = Math.max(r, x); b = Math.min(b, y); tp = Math.max(tp, y); }
  const near = dist; const cam = t.cam; cam.position.copy(M.R); cam.quaternion.setFromRotationMatrix(M.m.makeBasis(M.X, M.U, M.Z)); cam.updateMatrixWorld(true); cam.projectionMatrix.makePerspective(l, r, tp, b, near, 900); cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  const prev = renderer.getRenderTarget(); const nu = renderer.shadowMap.needsUpdate; renderer.shadowMap.needsUpdate = false; if (t.kind === 'inner' && inner) lampsFor(cam); g.visible = false; renderer.setRenderTarget(t.rt); renderer.render(scene, cam); g.visible = true; if (t.kind === 'inner' && inner) lampsFor(camera); renderer.setRenderTarget(prev); renderer.shadowMap.needsUpdate = nu;
}
const LAMP = [new THREE.Vector3(0.35, 1.7, -2.05), new THREE.Vector3(-0.35, 1.7, -2.75), new THREE.Vector3(0, 0.9, -2.5), new THREE.Vector3(0.53, 0.66, -2.62)]; const lampV = new THREE.Vector3();
function lampsFor(cam) { const I = inner.u.IN; const heat = I.heat.value; const col = [[2.4, 2.25, 1.95], [2.4, 2.25, 1.95], [0.3, 0.26, 0.2], [3.4 * heat * heat, 0.8 * heat * heat, 0.1 * heat * heat]]; LAMP.forEach((l, i) => { lampV.copy(l).applyMatrix4(car.matrixWorld).applyMatrix4(cam.matrixWorldInverse); I.lampP.value[i].copy(lampV); I.lampC.value[i].set(col[i][0], col[i][1], col[i][2]); }); }
function interiorFrame(dt, inp, cam) {
  inner.u.IN.sky.value = world.sky.cube;
  const load = clamp((inp.throttle || 0) * (0.25 + G.rpm / 9000) + (G.perf ? G.perf.nitro : 0), 0, 1); inner.engine.update(dt, active3d() ? G.rpm : 0, load); inner.details.shift(G.rpm); const I = inner.u.IN; I.carI.value.copy(car.matrixWorld).invert();
  lampsFor(cam);
  if (settings.shadows && (inner.frame++ % 2 === 0)) inner.shadow.render(scene, car, world.sunDir);
}
const active3d = () => G.mode === 'racing' || G.mode === 'countdown' || G.mode === 'crashed' || G.mode === 'finished';
function loadTrack(diff) {
  const key = diff;
  if (trackKey === key && track) return;
  const old = world;
  track = buildTrack({ difficulty: diff }); post.setLevel(quality);
  fineInterior(); world = buildRaceWorld(track, { renderer, level: quality, shadows: settings.shadows, diff, shadowSize: POST_LEVELS[quality].shadow }); scene = world.scene; trackKey = key; post.reset();
  scene.add(car); scene.add(menuCam); headL.visible = !!track.cfg.night; if (track.cfg.rival) scene.add(rivalCar().group);
  if (old) { old.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); if (old.dispose) old.dispose(); }
  G.sim = createState(track.poseAt(4)); G.sim.lane = track.nearest(G.sim.x, G.sim.z); G.cpIndex = 0;
}
const baseDpr = () => (quality === 'low' || schul.an ? 1 : Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2));
function resize() {
  const dpr = baseDpr();
  renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = menuCam.aspect = window.innerWidth / Math.max(1, window.innerHeight); camera.updateProjectionMatrix(); menuCam.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

// ---------------- Zustand ----------------
const G = {
  mode: 'menu',            // menu | countdown | racing | paused | crashed | finished
  prevMode: 'menu', role: 'driver', diff: settings.difficulty,
  sim: createState({ x: 0, z: 0, psi: 0 }), time: 0, penalty: 0, countdown: 0, resets: 0,
  nav: { tablet: 1, crank: 0 }, V: null, E: null, P: null, A: null, perf: null, eng: { x: 0, z: -1.8 }, sway: { x: 0, z: 0 }, warn: { cur: null, t: 0 }, mouse: { x: 0, y: 0, down: false, in: false }, drag: false, hover: null, reach: null, heldProp: null, lastNitro: 'ready', hopVis: 0, wrecked: false, cutPrev: false, wiperOn: false, wiperPhase: 0, wiperAngle: 0, mudCov: 0, mudTimer: 0,
  manual: true, neutral: true, stallT: 0, blip: 0, gear: 1, rpm: 900, launch: 0, kick: 0, shiftT: 0, shiftAnim: -1, look: { yaw: 0, pitch: 0 }, locked: false, cpIndex: 0, shake: 0,
  head: new THREE.Vector3(), camA: 0, camB: 0, bodyA: 0, bodyB: 0, visY: 0, pitch: 0, roll: 0, menuT: 0, frame: 0, lastStatus: '', crashed: false, mp: null, wipeLocal: false, wipeNet: false, holdId: null, lastInp: null,
};
const fx = createFx($('fx'));
const keys = Object.create(null);
let acc = 0;
const down = (a) => !!(keys[settings.binds[a]] || (ALT[a] && keys[ALT[a]]));
const bestKey = (d) => 'best.' + d;
const bestOf = (d) => store.get(bestKey(d), 0);

// ---------------- Rivale Bruno (nur auf Karten mit rival): eigener Wagen, läuft auf dem Host mit, Mitspieler bekommen ihn im Schnappschuss ----------------
let rivalC = null; const rivalCar = () => { if (!rivalC) rivalC = buildCar({ paint: 0x123a8c, trim: 0xffc53a, number: 13, name: 'BRUNO', short: true }); return rivalC; };
const R = { st: null, lap: 1, last: 0, done: false, gap: 0, level: 1.1, tgt: null };
function rivalStart() { R.st = null; R.tgt = null; if (rivalC) rivalC.group.visible = false; if (!track.cfg.rival) return; const st = { s: 16, u: 0, laneV: 2.8, x: 0, z: 0, psi: 0, steer: 0, lane: { s: 16 } }; rivalPos(st, track); R.st = st; R.lap = 1; R.done = false; R.gap = 0; rivalC.group.visible = true; }
function rivalProgress(lap, s) { return (lap - 1) * track.length + s; }
function rivalStep(dt) { // 120 Hz, nur Host/Einzelspieler
  const st = R.st; if (!st || R.done) return; if (G.mode !== 'racing') { if (G.mode === 'finished' || G.mode === 'crashed') { st.u = Math.max(0, st.u - 16 * dt); stepRival(st, track, dt, 0.2, CAR, st.laneV); st.lane.s = st.s; } return; }
  // Gummiband: Liegt Bruno vorn, nimmt er sich zurück (bleibt schlagbar). Holt man auf oder liegt vorn, fährt er die Kurven dreimal so schnell wie die normale KI. Sitzt die KI am Steuer, bleibt er zahm
  const humanDrives = G.mp ? rm.hasHuman('driver') : G.role === 'driver'; const ps = G.sim.lane ? G.sim.lane.s : 0; const g = rivalProgress(R.lap, st.s) - rivalProgress(G.lap, ps); const K = humanDrives ? clamp(3 - Math.max(0, g) * 0.0095, 1.4, 3) : 0.95; R.level = K;
  // Überholen: fährt der Spieler vor ihm auf seiner Spur, zieht er auf die andere Seite
  const lat = G.sim.lane ? G.sim.lane.lat : 0; const ahead = -g; let laneT = 1.4; if (ahead > 0 && ahead < 45 && Math.abs(lat - st.laneV) < 3) laneT = lat > 0 ? -3.6 : 3.6; else if (ahead <= 0 && ahead > -30) laneT = lat > 0 ? -3 : 3;
  if (stepRival(st, track, dt, K, CAR, laneT)) { R.lap++; if (R.lap > track.laps) { R.done = true; rivalWins(); } } st.lane.s = st.s;
  // Berührung: Der Rivale klebt auf der Linie, der Spieler wird weggeschoben
  const dx = st.x - G.sim.x; const dz = st.z - G.sim.z; const dist = Math.hypot(dx, dz); if (dist < 2.3 && dist > 0.01) { const k = (2.3 - dist) / dist; G.sim.x -= dx * k; G.sim.z -= dz * k; const rel = G.sim.u - st.u; if (Math.abs(rel) > 3) { st.u += rel * 0.2; G.sim.u -= rel * 0.25; } }
}
function rivalDraw(dt) { const st = R.st; if (!st || !rivalC) return; if (G.mp && !G.mp.host && R.tgt) { const T = R.tgt; const sn = Math.sin(T.psi); const cs = Math.cos(T.psi); T.x += T.u * sn * dt; T.z += T.u * cs * dt; const k = 1 - Math.exp(-dt * 10); st.x += (T.x - st.x) * k; st.z += (T.z - st.z) * k; st.psi += Math.atan2(Math.sin(T.psi - st.psi), Math.cos(T.psi - st.psi)) * k; st.u = T.u; st.steer = T.steer; st.lane = { s: track.nearest(st.x, st.z).s }; } const y = track.heightAt(st.x, st.z); const g = rivalC.group; g.position.set(st.x, y + 0.02, st.z); g.rotation.set(0, st.psi, 0); rivalC.update(dt, st.u, st.steer); R.gap = rivalProgress(R.lap, st.lane ? st.lane.s : 0) - rivalProgress(G.lap, G.sim.lane ? G.sim.lane.s : 0); }
function lapLogic(q) { const L = track.length; if (G.lapS > L - 140 && q.s < 140) { G.lap++; if (G.lap > track.laps) { finish(); return; } const zt = `Runde ${G.lap} von ${track.laps}: ${fmt(G.time + G.penalty)}`; toast(zt, 2400); if (G.mp) rm.bcast({ t: 'rtoast', text: zt, ms: 2400 }); } G.lapS = q.s; }
function rivalWins() { if (G.mode !== 'racing') return; G.mode = 'finished'; G.lost = true; const sub = 'Bruno hat die Zielflagge zuerst gesehen. Die nächste Station bleibt zu.'; $('rPanel').classList.add('bad'); $('rTitle').textContent = 'BRUNO WAR SCHNELLER'; $('rSub').textContent = sub; $('rTime').textContent = fmt(G.time + G.penalty); $('rAgain').textContent = 'Revanche'; $('rAgain').classList.remove('hidden'); showScreen('result'); audio.blip(220, 0.4); if (G.mp) { $('rAgain').classList.add('hidden'); rm.bcast({ t: 'rres', kind: 'finish', title: $('rTitle').textContent, sub, time: $('rTime').textContent }); } }

function resetCar(sPos, penalty) {
  const s = Math.max(4, sPos); const p = track.poseAt(s);
  G.sim = createState({ x: p.x, z: p.z, psi: p.psi });
  G.sim.lane = track.nearest(p.x, p.z);
  G.visY = p.y; G.pitch = 0; G.roll = 0; G.shake = 0; if (track.laps) G.lapS = s;
  if (penalty) { G.penalty += penalty; G.resets++; }
}
function applyRole(role) { G.role = role; cockpit.setRole(role); $('navPad').classList.toggle('hidden', role !== 'navigator'); $('engPad').classList.toggle('hidden', role !== 'engineer'); $('gl').style.cursor = role === 'engineer' ? 'none' : 'default'; $('crosshair').classList.toggle('hidden', role !== 'engineer'); if (role !== 'engineer') $('tip').classList.add('hidden'); G.look.yaw = 0; G.look.pitch = 0; if (role === 'engineer') camera.add(cockpit.workshop.heldRoot); else cockpit.root.add(cockpit.workshop.heldRoot); if (G.E) { engRelease(G.E); G.mouse.down = false; } updateRoleBadge(); }
function updateRoleBadge() { if (G.mp) { $('hRole').textContent = ROLE_NAME[G.role] + ' (du), ' + rm.crewText(); return; } $('hRole').textContent = G.role === 'navigator' ? 'Navigator, die KI fährt' : G.role === 'engineer' ? 'Ingenieur, die KI fährt' : 'Fahrer'; }
function startRun() {
  loadTrack(G.diff); resetCar(4, 0); G.lap = 1; G.lapS = 4; G.lost = false; rivalStart(); if (track.cfg.rival) { const p = track.poseAt(4); G.sim.x -= Math.cos(p.psi) * 2.8; G.sim.z += Math.sin(p.psi) * 2.8; } $('hLapBox').classList.toggle('hidden', !track.laps); $('hDistBox').classList.toggle('hidden', !!track.laps); $('hRivalBox').classList.toggle('hidden', !track.cfg.rival); G.time = 0; G.penalty = 0; G.resets = 0; G.cpIndex = 0; cockpit.clearMud(); G.mudCov = 0; G.wiperOn = false; G.nav.tablet = 1; G.nav.crank = 0;
  G.wrecked = false; $('rAgain').classList.remove('hidden'); $('rMap').classList.toggle('hidden', !!(G.mp && !G.mp.host)); fx.clear(); $('dmgClock').classList.add('hidden'); G.gear = 1; G.manual = !window.__holzwegAuto && (!G.mp || G.role === 'driver'); G.neutral = true; G.stallT = 0; shifter.end(); if (G.manual) setTimeout(() => toast('Handschaltung: R gedrückt halten, Maus bewegen, 1. Gang einlegen – dann Gas!', 5200), 600); G.rpm = 900; G.launch = 0; G.kick = 0; G.shiftT = 0; G.mode = 'countdown'; G.countdown = 3.2; showScreen(null); $('hud').classList.remove('hidden');
  newVehicle(); applyRole(G.role); audio.init(); if (audio.radio) audio.radio.setVolume(settings.radioVolume / 100); applyVolume(); toast('');
  G.wipeLocal = false; G.wipeNet = false; G.lastInp = null; G.crashed = false; if (G.mp) { G.mp.tgt = null; G.mp.hr = null; G.mp.eo = null; G.mp.snap = { th: 0, br: 0, rpm: 900, gear: 1 }; $('rAgain').classList.add('hidden'); $('rRestart').classList.toggle('hidden', !G.mp.host); $('pRestart').classList.toggle('hidden', !G.mp.host); rm.localReady(); updateRoleBadge(); } else { $('rRestart').classList.remove('hidden'); $('pRestart').classList.remove('hidden'); }
}
// Mehrspieler-Rennen: Rollen kommen aus der Lobby; Strecke ist pro Schwierigkeit fest (gleiche Seeds), Zustand liefert der Host
const LOAD_TEXT = { forest: 'Wald pflanzen, Asphalt legen, Schlamm anrühren.', mountain: 'Berge auffalten, Leitplanken schrauben.', circuit: 'Reifen stapeln, Tribünen füllen.', city: 'Häuser hochziehen, Baustellen absperren.', coast: 'Meer einlassen, Leuchtturm putzen.' };
function loadingScreen() { $('loadSub').textContent = LOAD_TEXT[DIFFICULTIES[G.diff].theme] || LOAD_TEXT.forest; showScreen('loading'); }
function startRaceMp(opts) {
  roadmap.hide(); rm.begin({ net: opts.net, host: opts.host, roles: opts.roles, diff: opts.diff }); G.diff = opts.diff; G.role = opts.roles[opts.net.me.id] || 'driver';
  if (trackKey !== G.diff) { loadingScreen(); setTimeout(() => { startRun(); }, 60); } else startRun();
}
function startRace() {
  G.diff = settings.difficulty; G.role = settings.role; roadmap.hide();
  if (trackKey !== G.diff) { loadingScreen(); setTimeout(() => { startRun(); }, 60); } else startRun();
}

// ---------------- Oberfläche ----------------
let dino = null; let stapel = null; let park = null; let chess = null; let pong = null; let ships = null; let raus = null; let baron = null; let kraft = null; let casino = null; let strom = null; let bruno = null; let ozean = null; let saege = null; let ludwig = null; let titel = null; let schrank = null; // entstehen weiter unten, das Menü öffnet schon vorher
const schrankOn = () => !!schrank && !schrank.failed; // false: das Zimmer geht nicht, dann gilt die einfache Liste vor der Rennwelt
const screens = ['menu', 'gallery', 'lobby', 'join', 'settings', 'pause', 'result', 'loading', 'roadmap', 'parkmap', 'pkResult', 'chess', 'pong', 'ships', 'raus', 'baron', 'start', 'titel', 'dino', 'stapel'];
// Notliste (nur ohne Zimmer): Passt sie nicht ins Fenster, wird sie als Ganzes kleiner, statt links und rechts abgeschnitten zu werden
function fitGallery() { const g = document.querySelector('#gallery .gitems'); if (!g || $('gallery').classList.contains('hidden')) return; g.style.zoom = ''; const items = g.querySelectorAll('.gitem'); if (!items.length) return; const a = items[0].getBoundingClientRect(); const b = items[items.length - 1].getBoundingClientRect(); const need = b.right - a.left + 32; if (need > window.innerWidth) g.style.zoom = (window.innerWidth / need).toFixed(4); }
window.addEventListener('resize', fitGallery);
function showScreen(name) { if (name === 'gallery' && G.startBack) { const m = G.startBack; G.startBack = null; openStart(m); return; } /* aus dem Startbildschirm geöffnet: „Zurück“ führt wieder dorthin */ for (const s of screens) $(s).classList.toggle('hidden', s !== name); G.screen = name; titelSync(name); if (name === 'gallery') fitGallery(); if (name !== 'roadmap' && roadmap) roadmap.hide(); if (name !== 'parkmap' && park) park.hide(); if (name !== 'chess' && chess) chess.hide(); if (name !== 'pong' && pong) pong.hide(); if (name !== 'ships' && ships) ships.hide(); if (name !== 'raus' && raus) raus.hide(); if (name !== 'baron' && baron) baron.hide(); if (schrank) schrank.onScreen(name); }
// Große Startbildschirme: räumen auf, bevor ein Spiel den Renderer übernimmt (auch beim Start aus der Lobby), und bleiben hinter ihrer Lobby stehen
function titelSync(name) {
  if (!titel) return;
  if (titel.on && G.mode !== 'titel') titel.stop();
  if (name === 'join' && G.mode === 'menu' && hasTitel(mp.fixed)) titel.background(mp.fixed);
}
// Spielstart aus der Lobby: erst den Renderer zurückgeben, dann übernimmt das Spiel. „Verlassen“ im Spiel führt wieder zum Startbildschirm
function titelLaunch() { if (!titel || !titel.on) return; const m = titel.mode; titel.stop(); if (mp.lobby.mode === m) G.startBack = m; }
let toastT = 0; let settingsBack = 'menu';
function toast(msg, ms = 2200) { const el = $('hToast'); el.textContent = msg; el.classList.toggle('hidden', !msg); toastT = msg ? ms / 1000 : 0; }
// Renn-Anzeigen außerhalb des HUD: hingen sonst über dem Zimmer
function clearRaceBits() { for (const id of ['crosshair', 'tip', 'gearTag', 'shifter']) $(id).classList.add('hidden'); }
function openMenu() { G.startBack = null; clearRaceBits(); if (titel) titel.stop(); if (window.__holzweg && window.__holzweg.mp && window.__holzweg.mp.inSession) window.__holzweg.mp.hostEnds(); if (moon.active()) moon.stop(); if (park && park.active()) park.stop(); if (chess && chess.active()) chess.stop(); if (pong && pong.active()) pong.stop(); if (ships && ships.active()) ships.stop(); if (raus && raus.active()) raus.stop(); if (baron && baron.active()) baron.stop(); if (kraft && kraft.active()) kraft.stop(); if (casino && casino.active()) casino.stop(); if (strom && strom.active()) strom.stop(); if (ozean && ozean.active()) ozean.stop(); if (bruno && bruno.active()) bruno.stop(); if (saege && saege.active()) saege.stop(); if (ludwig && ludwig.active()) ludwig.stop(); if (dino && dino.active()) dino.stop(); if (stapel && stapel.active()) stapel.stop(); if (rm.active) { rm.end(); $('hBig').classList.add('hidden'); } G.mode = 'menu'; fx.clear(); showScreen('menu'); $('hud').classList.add('hidden'); $('navPad').classList.add('hidden'); $('engPad').classList.add('hidden'); $('holdRing').classList.add('hidden'); $('nitroFx').style.opacity = '0'; cockpit.root.visible = false; audio.ready && audio.update({ kmh: 0, rpm: 900, throttle: 0, surface: 'road', slip: 0 }, false); }
function pause(on) {
  if (on) toggleLook(false);
  if (G.mp && (G.mode === 'racing' || G.mode === 'countdown' || G.mode === 'crashed' || G.mode === 'finished')) { if (on) { G.mpPaused = true; showScreen('pause'); } else { G.mpPaused = false; showScreen(null); } return; }
  if (on && G.mode === 'park') { G.prevMode = 'park'; G.mode = 'paused'; $('pRestart').classList.add('hidden'); showScreen('pause'); if (!park.mp) audio.suspend(true); return; }
  if (on && G.mode === 'moon') { if (moon.phase !== 'play') return; G.prevMode = 'moon'; G.mode = 'paused'; $('pRestart').classList.add('hidden'); showScreen('pause'); if (!moon.mp) audio.suspend(true); return; }
  if (on && (G.mode === 'racing' || G.mode === 'countdown')) { G.prevMode = G.mode; G.mode = 'paused'; $('pRestart').classList.remove('hidden'); showScreen('pause'); audio.suspend(true); }
  else if (!on && G.mode === 'paused') { G.mode = G.prevMode; showScreen(null); audio.suspend(false); }
}
function quit() { const close = () => { try { window.close(); } catch { /* egal */ } }; if (moon.active()) moon.save().finally(close); else close(); }
const code4 = () => { const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = 'HOLZ-'; for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)]; return s; };

// Lobby: Modus, Strecke, Rolle
function refreshLobby() {
  for (const b of document.querySelectorAll('#roleCards .card')) b.classList.toggle('sel', b.dataset.role === settings.role);
  $('lobbyNote').textContent = settings.role === 'engineer' ? 'Die KI fährt, du arbeitest hinten. W/A/S/D gehen, linke Maustaste nehmen und halten, rechte Maustaste umsehen. Jeder Schaden muss in 60 Sekunden repariert sein.' : settings.role === 'navigator' ? 'Die KI fährt, du liest die Kurven. E halten kurbelt die Scheibe frei, wenn sie verschmiert ist.' : 'Du fährst selbst. W/A/S/D steuern, Leertaste zieht die Handbremse.';
}
for (const b of document.querySelectorAll('#roleCards .card:not(.locked)')) b.onclick = () => { settings.role = b.dataset.role; saveSettings(); refreshLobby(); };
$('bPlay').onclick = () => { refreshLobby(); showScreen('lobby'); };
$('lBack').onclick = () => showScreen('gallery');
$('bGallery').onclick = () => { G.startBack = null; showScreen('gallery'); };
$('gBack').onclick = () => showScreen('menu');
$('bStart').onclick = () => openRoadmap();
// Kampagne: Fortschritt je Rechner, im Mehrspieler zählt beim Fahren der Stand des Hosts
const loadCampaign = () => { const p = store.get('campaign', null); const c = p && p.done ? p : { done: {} }; if (!c.fails) c.fails = {}; return c; };
const saveFail = (id) => { const p = loadCampaign(); p.fails[id] = (p.fails[id] || 0) + 1; store.set('campaign', p); };
const saveWin = (id, t) => { const p = loadCampaign(); const medal = medalOf(DIFFICULTIES[id], t); const old = p.done[id]; if (!old || t < old.t) p.done[id] = { t, medal: Math.max(medal, old ? old.medal : 0) }; store.set('campaign', p); return p; };
const roadmap = createRoadmap({ $, order: DIFFICULTY_ORDER, maps: DIFFICULTIES, fmt, onStart: (id) => { audio.init(); if (mp.inSession) { mp.startMap(id); return; } settings.difficulty = id; saveSettings(); startRace(); }, onBack: () => { if (mp.inSession) { mp.hostEnds(); return; } refreshLobby(); showScreen('lobby'); } });
function openRoadmap(o = null) { G.mode = 'menu'; fx.clear(); clearRaceBits(); $('hud').classList.add('hidden'); $('navPad').classList.add('hidden'); $('engPad').classList.add('hidden'); cockpit.root.visible = false; showScreen('roadmap'); $('rmBack').textContent = o ? (o.host ? 'Sitzung beenden' : 'Sitzung verlassen') : 'Zurück'; roadmap.show({ progress: o && o.progress ? o.progress : loadCampaign(), readonly: !!(o && !o.host) }); }
$('bMoon').onclick = () => { resize(); moon.open(); };
$('bPark').onclick = () => { audio.init(); resize(); park.open(); };
$('bBaron').onclick = () => { audio.init(); baron.open(); };
$('bSaege').onclick = () => { audio.init(); resize(); saege.open(); };
for (const [mode, tile] of [['ludwig', 'bLudwig'], ['strom', 'bStrom'], ['ozean', 'bOzean'], ['bruno', 'bBruno']]) $(tile).onclick = () => titel.open(mode); // diese vier haben große Startbildschirme (titel.js)
// ---------------- Startbildschirm je Spiel (seit 2026-11-21, Lennox: „jedes Spiel ein Startbildschirm mit Mehrspieler, ohne Code; ganz einfach, wie bei Ludwig“) ----------------
// Einzelspieler öffnet das Spiel wie bisher, Mehrspieler die Lobby nur für dieses Spiel, Einstellungen die normalen Einstellungen. Titel, Text und Bild kommen von der Galerie-Kachel.
// Spiele mit eigenem Menü (Rennen, Parken, Moonsweeper, Hund, Monopoly) haben den Mehrspieler-Knopf direkt dort, Ludwig, Strom, Ozean und Big Bruno in ihrem großen Startbildschirm. Den Mehrspieler-Knopf im Hauptmenü gibt es nicht mehr.
const START = {
  chess: { tile: 'bChess', acc: '#d9b46a', single: () => { audio.init(); chess.open(); } },
  pong: { tile: 'bPong', acc: '#4fc3f7', single: () => { audio.init(); pong.open(); } },
  ships: { tile: 'bShips', acc: '#5aa0e6', single: () => { audio.init(); ships.open(); } },
  raus: { tile: 'bRaus', acc: '#ef5a4c', single: null, rules: () => raus.rules }, // nur online zu dritt: Mehrspieler und Regeln
  kraft: { tile: 'bKraft', acc: '#ff8a2a', single: () => { audio.init(); resize(); kraft.open(); } },
  casino: { tile: 'bCasino', acc: '#f2c14e', single: () => { audio.init(); resize(); casino.open(); } },
};
function openStart(mode) {
  if (hasTitel(mode)) { titel.open(mode); return; }
  const c = START[mode]; if (!c) return; G.startMode = mode; G.startBack = null; const tile = $(c.tile); const plate = tile.querySelector('.gplate'); const small = plate.querySelector('small'); const face = tile.querySelector('.gface');
  $('stTitle').textContent = plate.querySelector('b').textContent; $('stLead').textContent = small ? small.textContent : ''; $('stArt').innerHTML = face ? face.innerHTML : '';
  $('start').style.setProperty('--st-acc', c.acc); $('stSingle').classList.toggle('hidden', !c.single); $('stMulti').classList.toggle('primary', !c.single); $('stRulesBtn').classList.toggle('hidden', !c.rules); $('stRules').classList.add('hidden');
  showScreen('start');
}
const lobbyFor = (mode, back) => { audio.init(); mp.openFor(mode, { onBack: back }); }; // Lobby nur für dieses Spiel; Zurück führt zum Startbildschirm bzw. ins Menü des Spiels
$('stSingle').onclick = () => { const c = START[G.startMode]; if (!c || !c.single) return; c.single(); G.startBack = G.startMode; }; // „Zurück“ im Spiel führt dann wieder hierher
$('stMulti').onclick = () => { const mode = G.startMode; lobbyFor(mode, () => openStart(mode)); };
$('stSettings').onclick = () => { settingsBack = 'start'; openSettings(); };
$('stRulesBtn').onclick = () => { const c = START[G.startMode]; const box = $('stRules'); if (!c || !c.rules) return; if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; } box.textContent = ''; for (const s of c.rules()) { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = `${s.t}: `; li.append(b, s.x); box.append(li); } box.classList.remove('hidden'); };
$('stBack').onclick = () => { G.startBack = null; showScreen('gallery'); };
for (const [mode, c] of Object.entries(START)) $(c.tile).onclick = () => openStart(mode);
// Spiele mit eigenem Menü: Mehrspieler dort (das Spiel wird vorher geschlossen, Zurück öffnet sein Menü wieder)
$('lMp').onclick = () => lobbyFor('race', () => $('bPlay').onclick());
$('pmMp').onclick = () => { openMenu(); lobbyFor('park', () => $('bPark').onclick()); };
$('sgMp').onclick = () => { openMenu(); lobbyFor('saege', () => $('bSaege').onclick()); };
$('bnMp').onclick = () => { $('bnGate').classList.add('hidden'); openMenu(); lobbyFor('baron', () => $('bBaron').onclick()); };
{ // Die Kachel hat sonst keinen Text. Die Rückmeldung erscheint nur kurz darunter (der Toast liegt im Renn-HUD und ist in der Galerie unsichtbar).
  const plate = $('bRV').querySelector('.gplate'); let back = 0;
  const say = (t) => { let s = plate.querySelector('small'); if (!s) { s = document.createElement('small'); plate.appendChild(s); } s.textContent = t; clearTimeout(back); back = setTimeout(() => { s.remove(); }, 4000); };
  $('bRV').onclick = async () => {
    if (!window.steamLauncher) { say('Das geht nur in der Desktop-App.'); return; }
    say('Steam wird gestartet …');
    const r = await window.steamLauncher.launch('rvthereyet').catch(() => ({ ok: false }));
    say(r.ok ? 'Steam startet das Spiel – einen Moment.' : r.fallback ? 'Steam nicht gefunden – die Steam-Seite ist offen.' : 'Das Spiel ließ sich nicht starten.');
  };
}
$('jBack').onclick = () => mp.back(); // aus einem Startbildschirm geöffnet: zurück dorthin
$('bSettings').onclick = () => { settingsBack = 'menu'; openSettings(); };
$('pSettings').onclick = () => { settingsBack = 'pause'; openSettings(); };
$('sBack').onclick = () => { cancelRebind(); showScreen(settingsBack); };
$('bQuit').onclick = quit; $('pQuit').onclick = quit;
$('pResume').onclick = () => pause(false);
$('pRestart').onclick = () => { if (G.mp) { if (G.mp.host) mp.restartRace(); return; } audio.suspend(false); startRun(); };
$('pMenu').onclick = () => { audio.suspend(false); openMenu(); };
$('rAgain').onclick = () => resumeAfterResult();
$('rRestart').onclick = () => { if (G.mp) { if (G.mp.host) mp.restartRace(); return; } startRun(); };
$('rMenu').onclick = () => openMenu();
$('rMap').onclick = () => { if (G.mp) { if (G.mp.host) mp.toRoadmap(loadCampaign()); return; } openRoadmap(); };

// Einstellungen: Grafik, Steuerung (Tasten umbelegen), Ton
let rebinding = null;
function cancelRebind() { rebinding = null; renderBinds(); }
function renderBinds() {
  const box = $('bindList'); box.textContent = '';
  for (const a of Object.keys(BIND_DEFAULT)) {
    const l = document.createElement('div'); l.textContent = BIND_LABEL[a]; const b = document.createElement('button'); b.type = 'button'; b.className = 'key' + (rebinding === a ? ' wait' : '');
    b.textContent = rebinding === a ? 'Taste drücken …' : keyName(settings.binds[a]) + (ALT[a] ? ` / ${keyName(ALT[a])}` : ''); b.dataset.act = a; b.onclick = () => { rebinding = a; renderBinds(); };
    box.append(l, b);
  }
}
function applyVolume() { if (audio.setVolume) audio.setVolume(settings.volume / 100); if (audio.radio) audio.radio.setVolume(settings.radioVolume / 100); }
function renderSettings() {
  const pick = (id, v) => { for (const b of $(id).children) b.classList.toggle('sel', b.dataset.v === v); }; pick('segQuality', quality); pick('segShadow', settings.shadows ? 'on' : 'off'); pick('segDamage', settings.damage); pick('segEngAI', settings.engAI === 'off' ? 'off' : 'slow');
  $('volMaster').value = String(settings.volume); $('volRadio').value = String(settings.radioVolume); $('volMasterV').textContent = `${settings.volume} %`; $('volRadioV').textContent = `${settings.radioVolume} %`;
  renderBinds();
}
function openSettings() { renderSettings(); renderMixer(); selectTab('gfx'); showScreen('settings'); }
function selectTab(t) { for (const b of document.querySelectorAll('#settings .tab')) b.classList.toggle('sel', b.dataset.tab === t); for (const p of document.querySelectorAll('#settings .tabpane')) p.classList.toggle('hidden', p.dataset.tab !== t); }
for (const b of document.querySelectorAll('#settings .tab')) b.onclick = () => { cancelRebind(); selectTab(b.dataset.tab); };
function setQuality(q) { quality = q; settings.quality = q; saveSettings(); resize(); renderSettings(); if (G.mode === 'menu' && !schrankOn()) { const d = G.diff; trackKey = null; loadTrack(d); } else trackKey = null; } // hinter dem Schrank liegt keine Rennwelt, sie entsteht erst beim Rennen
const seg = (id, fn) => { for (const b of $(id).children) b.onclick = () => fn(b.dataset.v); };
seg('segQuality', (v) => setQuality(v));
seg('segShadow', (v) => { settings.shadows = v === 'on'; saveSettings(); if (world) world.sun.castShadow = settings.shadows; renderSettings(); });
$('volMaster').oninput = (e) => { settings.volume = Number(e.target.value); saveSettings(); applyVolume(); renderSettings(); };
$('volRadio').oninput = (e) => { settings.radioVolume = Number(e.target.value); saveSettings(); applyVolume(); renderSettings(); };
// Sound-Mischpult: je Spiel eine Gruppe, je Geräusch ein Regler
function renderMixer() { const box = $('mixList'); if (!box) return; box.textContent = ''; for (const g of SOUND_GROUPS) { const sec = document.createElement('details'); sec.className = 'mixgroup'; if (g.id === 'casino') sec.open = true; const sum = document.createElement('summary'); sum.textContent = g.name; const avg = g.items.reduce((s, [k]) => s + (settings.sound[g.id + '.' + k] === undefined ? 1 : settings.sound[g.id + '.' + k]), 0) / g.items.length; const small = document.createElement('small'); small.textContent = Math.round(avg * 100) + ' %'; sum.append(small); sec.append(sum);
  for (const [k, label] of g.items) { const key = g.id + '.' + k; const v = Math.round((settings.sound[key] === undefined ? 1 : settings.sound[key]) * 100); const row = document.createElement('div'); row.className = 'slider mixrow'; const lb = document.createElement('label'); lb.textContent = label; const inp = document.createElement('input'); inp.type = 'range'; inp.min = '0'; inp.max = '150'; inp.step = '5'; inp.value = String(v); inp.dataset.key = key; const out = document.createElement('span'); out.textContent = v + ' %'; inp.oninput = () => { const x = Number(inp.value); audio.setMix(key, x / 100); settings.sound[key] = x / 100; if (x === 100) delete settings.sound[key]; out.textContent = x + ' %'; saveSettings(); }; row.append(lb, inp, out); sec.append(row); } box.append(sec); } }
$('mixReset').onclick = () => { for (const k of Object.keys(settings.sound)) { audio.setMix(k, 1); delete settings.sound[k]; } saveSettings(); renderMixer(); };
seg('segDamage', (v) => { settings.damage = v; saveSettings(); renderSettings(); });
seg('segEngAI', (v) => { settings.engAI = v; saveSettings(); renderSettings(); });
$('bindReset').onclick = () => { settings.binds = { ...BIND_DEFAULT }; saveSettings(); renderBinds(); };

function resumeAfterResult() { // Weiterfahren gibt es nicht: Jeder Fehler heißt von vorn
  if (G.mp) { if (G.mp.host) mp.restartRace(); return; }
  startRun();
}
function crash(speed) {
  if (G.mode !== 'racing') return; G.mode = 'crashed'; G.shake = 1; audio.crash(speed);
  G.sim.u *= 0.12; G.sim.v *= 0.12; G.sim.r *= 0.25; // der Baum stoppt den Wagen sofort
  const big = $('hBig'); big.textContent = 'DU HAST VERKACKT!'; big.classList.remove('hidden'); saveFail(G.diff);
  $('rPanel').classList.add('bad'); $('rTitle').textContent = 'DU HAST VERKACKT'; $('rSub').textContent = `Einschlag mit ${Math.round(speed * 3.6)} km/h bei Meter ${Math.round(G.sim.lane ? G.sim.lane.s : 0)}. Die Strecke beginnt von vorn.`;
  $('rTime').textContent = fmt(G.time + G.penalty); $('rAgain').classList.add('hidden');
  if (G.mp) { rm.bcast({ t: 'rres', kind: 'crash', title: $('rTitle').textContent, sub: $('rSub').textContent, time: $('rTime').textContent, sp: speed, failMap: G.diff }); }
  setTimeout(() => { if (G.mode === 'crashed') { $('hBig').classList.add('hidden'); showScreen('result'); } }, 1100);
  if (G.mp && G.mp.host) setTimeout(() => { if (G.mode === 'crashed' && G.mp) mp.restartRace(); }, 3600);
}
function wreckRun() {
  if (G.mode !== 'racing') return; const V = G.V; G.mode = 'crashed'; G.wrecked = true; G.shake = 1; audio.wreck(); if (audio.setAlarm) audio.setAlarm(0);
  G.sim.u *= 0.5; const big = $('hBig'); big.textContent = 'TOTALSCHADEN!'; big.classList.remove('hidden'); saveFail(G.diff);
  $('rPanel').classList.add('bad'); $('rTitle').textContent = 'TOTALSCHADEN'; $('rSub').textContent = `${V.wrecked.name} wurde nicht innerhalb von ${V.wreckLimit} s repariert – der Wagen ist Schrott. Alles von vorne!`;
  $('rTime').textContent = fmt(G.time + G.penalty); $('rAgain').classList.add('hidden');
  if (G.mp) rm.bcast({ t: 'rres', kind: 'wreck', title: $('rTitle').textContent, sub: $('rSub').textContent, time: $('rTime').textContent, failMap: G.diff });
  setTimeout(() => { if (G.mode === 'crashed' && G.wrecked) { $('hBig').classList.add('hidden'); showScreen('result'); } }, 1800);
}
function finish() {
  if (G.mode !== 'racing') return; G.mode = 'finished'; const t = G.time + G.penalty; const best = bestOf(G.diff); const cfg = DIFFICULTIES[G.diff]; const medal = medalOf(cfg, t); const isBest = !best || t < best; const prog = saveWin(G.diff, t); const won = campaignWon(DIFFICULTY_ORDER, prog);
  if (isBest) store.set(bestKey(G.diff), t);
  $('rPanel').classList.remove('bad'); $('rTitle').textContent = won ? 'IHR HABT GEWONNEN!' : 'ZIEL ERREICHT'; $('rSub').textContent = `${cfg.name}: ${['angekommen', 'Bronze', 'Silber', 'Gold'][medal]}${isBest ? ', neue Bestzeit!' : `, Bestzeit ${fmt(best)}`}`;
  $('rTime').textContent = fmt(t); $('rAgain').textContent = 'Nochmal fahren'; showScreen('result'); audio.blip(880, 0.2);
  if (G.mp) { $('rAgain').classList.add('hidden'); rm.bcast({ t: 'rres', kind: 'finish', title: $('rTitle').textContent, sub: $('rSub').textContent, time: $('rTime').textContent, map: G.diff, tt: t }); }
}

// ---------------- Eingabe ----------------
function switchRole() {
  if (G.mp) { toast('Im Mehrspieler ist die Rolle fest – im Lobby-Bildschirm wählbar', 2200); return; }
  if (G.mode !== 'racing' && G.mode !== 'countdown') return;
  const order = ['driver', 'navigator', 'engineer']; applyRole(order[(order.indexOf(G.role) + 1) % order.length]);
  toast(G.role === 'navigator' ? 'Navigator – die KI fährt. E halten = Kurbel, Tab = nächste Rolle' : G.role === 'engineer' ? 'Ingenieur – ab in die Werkstatt hinten! WASD gehen, Maus klicken/halten, rechte Maustaste umsehen' : 'Du fährst wieder', 3200);
}
// Menüs lassen sich mit den Pfeiltasten bedienen, Enter drückt den gewählten Knopf
function menuNav(code) {
  if (!/^Arrow(Up|Down|Left|Right)$/.test(code) || !G.screen || G.screen === 'roadmap' || G.screen === 'parkmap') return false; const a = document.activeElement; if (a && (a.tagName === 'SELECT' || a.tagName === 'INPUT')) return false;
  const list = [...$(G.screen).querySelectorAll('button')].filter((b) => b.offsetParent !== null && !b.disabled); if (!list.length) return false; const i = list.indexOf(a); const step = code === 'ArrowDown' || code === 'ArrowRight' ? 1 : -1; list[i < 0 ? 0 : (i + step + list.length) % list.length].focus({ focusVisible: true }); return true;
}
function onKey(code, isDown, repeat) {
  keys[code] = isDown; if (!isDown) return;
  if (rebinding) { // Taste für eine Aktion festlegen (Esc bricht ab)
    if (code !== 'Escape' && !FIXED_KEYS.includes(code)) { for (const a of Object.keys(settings.binds)) if (settings.binds[a] === code) settings.binds[a] = settings.binds[rebinding]; settings.binds[rebinding] = code; saveSettings(); }
    cancelRebind(); return;
  }
  audio.init();
  if (code === 'F11' && !repeat) { fullscreen.toggle(); return; } // Vollbild geht in jedem Spiel, auch wo F belegt ist
  if (schrank && schrank.key(code, repeat)) return; // im Zimmer: Pfeile wählen, Enter nimmt
  if (code === 'Enter' && G.screen && document.activeElement && document.activeElement.tagName === 'BUTTON') return; // der Knopf selbst löst aus
  if (menuNav(code)) return;
  if (G.screen === 'roadmap' && roadmap.key(code)) return;
  if (G.screen === 'parkmap' && park.mapKey(code)) return;
  if (G.screen === 'chess' && chess.onKey(code)) return;
  if ((G.mode === 'park' || (G.mode === 'paused' && G.prevMode === 'park')) && park.onKey(code, true, repeat)) return;
  if ((G.mode === 'moon' || (G.mode === 'paused' && G.prevMode === 'moon')) && moon.onKey(code, true, repeat)) return;
  if (code === 'Escape') {
    if (G.mode === 'paused' || (G.mp && G.screen === 'pause')) pause(false); else if (G.mode === 'racing' || G.mode === 'countdown' || G.mode === 'moon' || (G.mode === 'park' && G.screen !== 'pkResult') || (G.mp && G.screen !== 'result')) pause(true);
    else if (G.screen === 'settings') $('sBack').onclick(); else if (G.screen === 'lobby') showScreen('gallery'); else if (G.screen === 'join') mp.back(); else if (G.screen === 'start') $('stBack').onclick(); else if (G.screen === 'titel') titel.back(); else if (G.screen === 'gallery') showScreen('menu');
    return;
  }
  if (code === 'KeyR' && !repeat && (G.mode === 'racing' || G.mode === 'countdown') && G.role === 'driver') { if (!shifter.open) shifter.begin('race', G.manual ? (G.neutral ? 0 : G.gear) : 'A'); return; }
  if (code === 'Enter' && (G.mode === 'crashed' || G.mode === 'finished')) { if (G.mp) { if (G.mp.host && G.mode === 'finished') mp.restartRace(); return; } startRun(); return; }
  if (code === 'Enter' && G.mode === 'menu' && G.screen === 'lobby') { openRoadmap(); return; }
  if (code === 'KeyM' && !repeat) { audio.setMuted(!audio.muted); toast(audio.muted ? 'Ton aus' : 'Ton an', 1200); return; }
  const playing = G.mode === 'racing' || G.mode === 'countdown' || G.mode === 'crashed';
  if (!playing) return;
  const B = settings.binds;
  if (code === B.reset && !repeat && G.mp) { if (G.role === 'driver') { if (G.mp.host) mp.restartRace(); else rm.sendCmd('reset'); } return; }
  if (code === B.reset && !repeat) { startRun(); return; }
  if (code === B.look && !repeat) { toggleLook(); return; }
  if (code === B.role && !repeat) { switchRole(); return; }
  if (code === B.nitro && !repeat) { requestNitroAction('Taste'); return; }
  if (code === 'KeyQ' && !repeat && G.role === 'engineer') { engineerClick('display'); return; }
  if (code === B.use && !repeat && G.role === 'driver' && !(G.mp && !rm.hasHuman('navigator'))) { toast('Die Scheibe kurbelt der Navigator (im Solo-Test: Tab, dann E halten)', 2600); return; }
  if (!audio.radio) return;
  if (code === 'KeyT' && !repeat) { const on = audio.radio.power(); toast(on ? `Radio an: ${audio.radio.info.name}` : 'Radio aus', 1400); }
  else if (code === 'KeyG') { const s = audio.radio.tune(1); if (audio.radio.on) toast(`${s.name} ${s.freq}`, 1400); }
  else if (code === 'KeyH') { const s = audio.radio.tune(-1); if (audio.radio.on) toast(`${s.name} ${s.freq}`, 1400); }
  else if (code === 'KeyB') audio.radio.setVolume(audio.radio.volume + 0.1);
  else if (code === 'KeyV') audio.radio.setVolume(audio.radio.volume - 0.1);
}
const isGameKey = (c) => FIXED_KEYS.includes(c) || Object.values(settings.binds).includes(c) || Object.values(ALT).includes(c) || c === 'Space';
window.addEventListener('keydown', (e) => { if (isGameKey(e.code) && !(e.target && e.target.tagName === 'INPUT')) e.preventDefault(); onKey(e.code, true, e.repeat); });
window.addEventListener('keyup', (e) => { keys[e.code] = false; if (e.code === 'KeyR' && shifter.open) shifter.end(); });
// Grafik-Diagnose (F3): zeigt, auf welcher Grafikkarte das Spiel läuft, welche Stufe gilt und ob die Auflösung automatisch gesenkt wurde. Zum Foto-Schicken bei Grafikproblemen.
{
  let box = null; let timer = 0; let frames = 0; let fps = 0; let last = performance.now();
  const gpuName = () => { try { const gl = renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : 'unbekannt'; } catch { return 'unbekannt'; } };
  const tick = () => { frames++; const n = performance.now(); if (n - last >= 1000) { fps = Math.round(frames * 1000 / (n - last)); frames = 0; last = n; } if (box) requestAnimationFrame(tick); };
  const fill = () => {
    if (!box) return; const nm = gpuName(); const weak = /Intel|UHD|Iris|SwiftShader|Basic Render|llvmpipe|Software/i.test(nm);
    const rs = post.P ? post.P.resScale : 1;
    const lines = ['GRAFIK-INFO (F3 schließt)', 'Grafikkarte: ' + nm, 'Stufe: ' + quality + ' | Schatten: ' + (settings.shadows ? 'an' : 'aus'), 'Bilder pro Sekunde: ' + fps, 'Auto-Absenkung: ' + Math.round(rs * 100) + ' % Auflösung' + (rs < 1 ? ' (gesenkt, weil zu langsam)' : ''), 'Bild: ' + renderer.domElement.width + 'x' + renderer.domElement.height + ' | Skalierung ' + (window.devicePixelRatio || 1) + ' | Spiel: ' + (G.mode || '?') + ' | v' + MP_VERSION];
    if (weak) lines.push('ACHTUNG: schwache oder Software-Grafik. Windows-Einstellungen > System > Anzeige > Grafik > Spiel hinzufügen > Höchstleistung.');
    box.textContent = lines.join('\n');
  };
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'F3' || e.repeat) return; e.preventDefault();
    if (box) { box.remove(); box = null; clearInterval(timer); return; }
    box = document.createElement('pre'); box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;margin:0;padding:10px 12px;max-width:min(640px,90vw);white-space:pre-wrap;font:600 13px/1.45 Consolas,monospace;color:#f5f6f4;background:rgba(10,14,12,.88);border:1px solid #f9bd00;border-radius:8px;pointer-events:none';
    document.body.appendChild(box); frames = 0; last = performance.now(); requestAnimationFrame(tick); fill(); timer = setInterval(fill, 500);
  });
}
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (G.mode === 'racing' || G.mode === 'moon') pause(true); });
window.addEventListener('wheel', (e) => { if (audio.radio && (G.mode === 'racing' || G.mode === 'countdown')) audio.radio.setVolume(audio.radio.volume + (e.deltaY < 0 ? 0.05 : -0.05)); }, { passive: true });
document.addEventListener('pointerlockchange', () => { G.locked = document.pointerLockElement === $('gl'); });
window.addEventListener('mousemove', (e) => { if (G.mode === 'park') { if (G.locked) park.mouseLook(e.movementX, e.movementY); return; } if (G.mode === 'moon') { if (G.locked) moon.mouseLook(e.movementX, e.movementY); return; } if (shifter.open && G.locked) { shifter.move(e.movementX, e.movementY); return; } if (!G.locked) return; G.look.yaw = clamp(G.look.yaw - e.movementX * 0.0022, -3.14, 3.14); G.look.pitch = clamp(G.look.pitch - e.movementY * 0.0022, -1.15, 0.95); });
function toggleLook(on) { try { if (on === false || document.pointerLockElement === $('gl')) document.exitPointerLock(); else { const p = $('gl').requestPointerLock(); if (p && p.catch) p.catch(() => {}); } } catch { /* ohne Zeigersperre egal */ } }
$('gl').addEventListener('pointerdown', (e) => {
  if (G.role === 'engineer') return;
  if (!audio.radio || !(G.mode === 'racing' || G.mode === 'countdown')) return; audio.init();
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  const hit = cockpit.pick(ndc, camera);
  if (!hit && !G.locked) { toggleLook(true); return; }
  if (hit === 'radio_power') audio.radio.power(); else if (hit === 'radio_next') audio.radio.tune(1); else if (hit === 'radio_prev') audio.radio.tune(-1); else if (hit === 'radio_vol') audio.radio.setVolume(audio.radio.volume >= 0.95 ? 0.1 : audio.radio.volume + 0.15);
});
$('gl').addEventListener('contextmenu', (e) => e.preventDefault());
$('gl').addEventListener('pointerdown', (e) => {
  if (G.mode === 'moon') { audio.init(); moon.pointerDown(e); return; }
  if (G.mode === 'park') { audio.init(); park.pointerDown(e); return; }
  if (G.role !== 'engineer' || !(G.mode === 'racing' || G.mode === 'countdown')) return; audio.init(); G.mouse.x = e.clientX; G.mouse.y = e.clientY; G.mouse.in = true;
  if (e.button === 2) { G.drag = true; try { $('gl').setPointerCapture(e.pointerId); } catch { /* egal */ } return; }
  if (e.button === 0) { G.mouse.down = true; const hit = pickAt(e.clientX, e.clientY); if (hit) { if (hit.dist <= REACH) engineerClick(hit.id); else toast('Zu weit weg – näher heran (W/A/S/D)', 1400); } }
});
window.addEventListener('pointermove', (e) => { G.mouse.x = e.clientX; G.mouse.y = e.clientY; G.mouse.in = true; if (G.drag) { G.look.yaw = clamp(G.look.yaw - e.movementX * 0.0035, -2.8, 2.8); G.look.pitch = clamp(G.look.pitch - e.movementY * 0.0035, -1.1, 0.9); } });
window.addEventListener('pointerup', () => { if (G.mode === 'moon') { moon.pointerUp(); return; } G.mouse.down = false; G.drag = false; });
$('gl').addEventListener('pointerleave', () => { G.mouse.in = false; });
// Eingaben: Fahrer = Tastatur, Navigator/Ingenieur = KI am Steuer (Solo-Test)
function readInput() {
  const src = G.mp ? rm.driverSource() : (G.role === 'driver' ? 'local' : 'ai'); const human = src === 'local';
  if (G.mp && src === 'snap') { const i = rm.snapInput(); return { ...i, hand: G.sim.hand, perf: G.perf }; } // Mitspieler: Pedalstellung vom Host (nur Anzeige und Ton)
  const rem = G.mp && src === 'remote' ? rm.remoteDriverInput() : null;
  const idle = human && G.mp && G.screen === 'pause'; // Pausemenü im Mehrspieler: Welt läuft weiter, Wagen rollt aus
  if (G.mode === 'countdown') return { throttle: rem ? (rem.throttle > 0.5 ? 1 : 0) : human && !idle && down('throttle') ? 1 : 0, brake: 0, steer: 0, hand: 1, perf: G.perf };
  if (G.mode !== 'racing') return { throttle: 0, brake: G.mode === 'finished' ? 0.6 : G.mode === 'crashed' ? 1 : 0, steer: 0, hand: G.mode === 'crashed' ? 1 : 0, perf: G.perf };
  if (rem) return { throttle: rem.throttle, brake: rem.brake, steer: rem.steer, hand: rem.hand, kick: rem.kick, launch: rem.launch, perf: G.perf };
  if (idle) return { throttle: 0, brake: 0, steer: 0, hand: 0, kick: G.kick, launch: 0, perf: G.perf };
  if (!human) { const a = aiInput(G.sim, track, (track.cfg.rival ? 1.16 : 0.92) * (G.perf ? clamp(Math.sqrt(G.perf.brake), 0.55, 1) : 1), track.cfg.rival ? -1.4 : 0); return { ...a, kick: G.kick, launch: 0, perf: G.perf }; }
  return { throttle: down('throttle') ? 1 : 0, brake: down('brake') ? 1 : 0, steer: (down('left') ? 1 : 0) - (down('right') ? 1 : 0), hand: down('hand') ? 1 : 0, kick: G.kick, launch: G.launch, perf: G.perf };
}

// ---------------- Schaltkulisse (Taste R halten): Handschaltung mit 8 Gängen, A = Automatik ----------------
let rumbleT = 0;
const shifter = createShifter($('shifter'), $('shifterCv'), { onSelect: (g) => shifterSelect(g), onMove: (d) => { const n = performance.now(); if (d > 0.4 && n - rumbleT > 70) { rumbleT = n; audio.rumble && audio.rumble(Math.min(8, d)); } } });
function shifterSelect(g) {
  if (g === 'A') { G.manual = false; G.neutral = false; toast('Automatik', 900); return; }
  G.manual = true; if (g === 0) { G.neutral = true; return; }
  const sp = kmh(G.sim); if (sp / RATIO[g] * 1000 > 7600) { toast('Zu schnell für Gang ' + g + '!', 1400); G.neutral = true; return; }
  const up = g > G.gear; G.neutral = false; G.gear = g; G.shiftAnim = 0; G.shiftT = 0.18; if (!up) G.blip = 0.3; audio.shift(up, up ? 0.8 : 0.4, G.rpm); toast('Gang ' + g, 700);
}
// Handschaltung: offene Kulisse/Leerlauf = keine Kraft, Begrenzer bei 7300/min; hoher Gang bei zu wenig Tempo = schwach bis abgewürgt (ab Gang 3 im Stand)
function manualEffect(inp) {
  if (G.stallT > 0) { inp.throttle = 0; return; } if (shifter.open || G.neutral) { inp.throttle = 0; return; }
  const rpm = G.rpm; if (rpm > 7300) { inp.throttle = 0; return; }
  if (G.gear > 1) { const sp = kmh(G.sim); const need = RATIO[G.gear] * 1.1; if (G.gear >= 3 && sp < need * 0.45 && inp.throttle > 0.1) { G.stallT = 1.8; inp.throttle = 0; toast('Motor abgewürgt – kleineren Gang einlegen!', 1800); audio.thud && audio.thud(3); return; } if (sp < need) inp.throttle *= 0.15 + 0.85 * sp / need; }
}
function gearTagUpdate() { const el = $('gearTag'); const on = (G.mode === 'racing' || G.mode === 'countdown') && G.manual; el.classList.toggle('hidden', !on); const txt = (G.neutral ? 'N' : 'Gang ' + G.gear) + ' · manuell'; if (el.textContent !== txt) el.textContent = txt; }
// ---------------- Getriebe (Anzeige, Motorgeräusch und Schaltruck, abgeleitet vom echten Tempo) ----------------
const RATIO = [0, 9, 14, 20, 27, 35, 44, 54, 66]; // 8 Gänge // km/h je 1000/min (6 Gänge: bei 250 km/h knapp 4500/min im 6.)
function gearbox(dt, inp) {
  const sp = kmh(G.sim); const rev = G.sim.reverse && G.sim.u < 0.5;
  G.kick = Math.max(0, G.kick - dt / 0.42); G.launch = Math.max(0, G.launch - dt / 1.7); G.shiftT = Math.max(0, G.shiftT - dt);
  if (G.shiftAnim >= 0) { G.shiftAnim += dt / 0.62; if (G.shiftAnim >= 1) G.shiftAnim = -1; }
  let target;
  if (rev) { G.gear = 0; target = 900 + sp * 220; }
  else {
    if (G.gear <= 0) G.gear = 1;
    let rpm = sp / RATIO[G.gear] * 1000; const racing = G.mode === 'racing';
    if (racing && !G.manual && G.shiftT <= 0 && rpm > 6300 && G.gear < 8) { G.gear++; G.shiftT = 0.2; G.shiftAnim = 0; if (inp.throttle > 0.3) { G.kick = 1; audio.shift(true, inp.throttle, rpm); } else audio.shift(true, 0, rpm); }
    else if (racing && !G.manual && G.shiftT <= 0 && rpm < 2300 && G.gear > 1) { G.gear--; G.shiftT = 0.15; G.shiftAnim = 0; audio.shift(false, inp.throttle, rpm); }
    rpm = sp / RATIO[G.gear] * 1000;
    target = Math.max(900, rpm); if (sp < 12) target = Math.max(target, 900 + inp.throttle * 3200 * (1 - sp / 14)); else target += inp.throttle * 250;
    if (G.blip > 0) { target += G.blip * 4200; G.blip = Math.max(0, G.blip - dt); } // Zwischengas beim Runterschalten
    if (G.shiftT > 0.08) target *= 0.78;  // Kupplung getreten: Drehzahl sackt kurz ab, dann springt sie wieder hoch
    // Schaltassistent (nur bei Handschaltung): fällt das Tempo beim Bremsen/Ausrollen unter den Punkt, an dem man in diesen Gang hochgeschaltet hätte (6300/min des Gangs darunter), schaltet er mit Rumpeln und Zwischengas herunter – bis in den 1. Gang
    if (G.manual && !G.neutral && racing && G.shiftT <= 0 && !shifter.open && G.gear > 1 && sp > 0.3 && (rpm < 1250 || ((inp.brake > 0.1 || inp.throttle < 0.05) && sp < 6.3 * RATIO[G.gear - 1])) /* gleicher Punkt wie das Hochschalten: unter dem Tempo, bei dem man in diesen Gang käme, geht es zurück */) { G.gear--; G.shiftT = 0.2; G.shiftAnim = 0; G.blip = 0.35; audio.shift(false, 0.4, rpm); audio.rumble && audio.rumble(3); rpm = sp / RATIO[G.gear] * 1000; }
    if (G.manual && G.neutral && G.mode === 'racing') target = 900 + inp.throttle * 5200; // Leerlauf: Motor dreht frei
    if (G.mode === 'menu') target = 900 + inp.throttle * 600;
    if (G.mode === 'countdown') target = inp.throttle ? 5600 + Math.sin(performance.now() / 38) * 380 : 900; // Gas im Countdown: Motor hängt im Begrenzer
  }
  G.rpm += (Math.min(7400, target) - G.rpm) * Math.min(1, dt * (G.shiftT > 0 ? 20 : 8));
}

// ---------------- Fahrzeugdarstellung ----------------
const tv = new THREE.Vector3();
function poseVehicle(dt) {
  const s = G.sim; const sn = Math.sin(s.psi); const cs = Math.cos(s.psi);
  const wp = (f, l) => { const x = s.x + sn * f + cs * l; const z = s.z + cs * f - sn * l; return track.heightAt(x, z); };
  const hF = (wp(1.3, 0.8) + wp(1.3, -0.8)) / 2; const hR = (wp(-1.3, 0.8) + wp(-1.3, -0.8)) / 2; const hL = (wp(0, 0.8) + wp(1.3, 0.8) + wp(-1.3, 0.8)) / 3; const hRi = (wp(0, -0.8) + wp(1.3, -0.8) + wp(-1.3, -0.8)) / 3;
  // Keine Rampenphysik: Das Auto folgt dem Gelände nur sehr sanft (Nicken/Wanken stark begrenzt), hebt nie ab und kippt nie
  const gpMax = track.macro ? 0.1 : 0.05; const gp = clamp(-Math.atan((hF - hR) / 2.6) * (track.macro ? 0.85 : 0.6), -gpMax, gpMax); const gr = clamp(Math.atan((hL - hRi) / 1.6) * 0.5, -0.03, 0.03);
  G.pitch += (gp - G.pitch) * Math.min(1, dt * 5); G.roll += (gr - G.roll) * Math.min(1, dt * 5);
  const y = (hF + hR) / 2 + 0.02; G.visY += (y - G.visY) * Math.min(1, dt * 14);
  car.position.set(s.x, G.visY, s.z);
  car.rotation.order = 'YXZ';
  { const k = 1 - Math.exp(-dt * 4.2); G.bodyA += (clamp(s.ay * 0.00085, -0.026, 0.026) - G.bodyA) * k; G.bodyB += (G.bodyA - G.bodyB) * k; }
  car.rotation.set(G.pitch - clamp(s.ax * 0.0055, -0.03, 0.05), s.psi, G.roll + G.bodyB); // Karosserie neigt sich in Kurven und beim Bremsen
}
function poseCamera(dt, t) {
  if (window.__debugCam) return; // Entwicklerhilfe: freie Kamera für Bildprüfung
  if (G.role === 'engineer') { poseEngCamera(dt, t); return; }
  const s = G.sim; const sp = kmh(s); const eye = G.role === 'navigator' ? EYE_N : EYE;
  const target = tv.set(-clamp(s.ay * 0.0021, -0.045, 0.045), 0.0 - clamp(s.ax * 0.0009, -0.012, 0.02), -clamp(s.ax * 0.0075, -0.05, 0.13));
  G.head.lerp(target, Math.min(1, dt * 4.5));
  // Blick in die Kurve: zweifach geglättet aus der Gierrate. Früher hing er direkt am Lenkrad und schnellte beim Loslassen zurück wie eine Feder
  { const k = 1 - Math.exp(-dt * 5.5); G.camA += (clamp(s.r * 0.07, -0.085, 0.085) - G.camA) * k; G.camB += (G.camA - G.camB) * k; }
  const rough = (s.surface === 'grass' ? 1.0 : s.surface === 'mud' ? 0.8 : 0.35) * Math.min(1, sp / 70);
  const push = clamp(s.ax / 12, 0, 1) * (s.surface === 'road' ? 1 : 0.7); const jx = (Math.sin(t * 31.7) + Math.sin(t * 17.3 + 1.2)) * (0.0022 * rough + 0.0035 * push); const jy = (Math.sin(t * 23.1) + Math.sin(t * 41.3 + 0.7)) * (0.0028 * rough + 0.004 * push);
  const sh = Math.max(G.shake * G.shake, G.perf ? G.perf.nitro * 0.2 + G.perf.shake * 0.4 : 0); G.shake = Math.max(0, G.shake - dt * 1.4);
  { const by = Math.abs(G.look.yaw); const bk = clamp((by - 1.2) / 1.2, 0, 1); G.leanV = (G.leanV || 0) + (bk * bk * (3 - 2 * bk) - (G.leanV || 0)) * Math.min(1, dt * 7); } // Schulterblick: Beim Umdrehen beugt sich die Figur zur Wagenmitte, damit der Sitz nicht im Weg ist
  camera.position.set(eye.x + G.head.x + jx + Math.sin(t * 60) * 0.02 * sh + (G.role === 'navigator' ? 0.24 : -0.24) * G.leanV, eye.y + G.head.y + jy + Math.sin(t * 53 + 1) * 0.025 * sh + 0.04 * G.leanV, eye.z + G.head.z + G.kick * 0.035 + 0.16 * G.leanV);
  if (!G.locked) { const k = Math.exp(-dt * 6); G.look.yaw *= k; G.look.pitch *= k; }
  const lean = G.role === 'navigator' ? 0.4 : 1;
  camera.rotation.set(-0.13 + G.look.pitch + Math.sin(t * 47) * 0.02 * sh, Math.PI + G.look.yaw + G.camB * lean, -G.camB * 0.1 * lean + (Math.sin(t * 37) * 0.015) * sh);
  camera.fov = 72 + Math.min(10, sp * 0.07) + G.kick * 3.5 + clamp(s.ax * 0.45, 0, 6) + G.launch * 3 + (G.perf ? G.perf.nitro * 16 : 0); camera.updateProjectionMatrix();
}

// ---------------- Schlamm und Kurbel ----------------
// Die Scheibe wird NICHT vom Fahrer gewischt: Der Navigator legt mit E (halten) das Tablet weg, fasst die Kurbel an der Tür und kurbelt die Wischer in ~2 s frei.
let mudAcc = 0;
function updateNav(dt) {
  const racing = G.mode === 'racing' || G.mode === 'countdown'; const crank = G.role === 'navigator' || (G.mp && G.role === 'driver' && !rm.hasHuman('navigator')); const want = crank && racing && down('use') && !(G.mp && G.screen === 'pause');
  G.nav.tablet += clamp((want ? 0 : 1) - G.nav.tablet, -dt * 4.5, dt * 4.5);
  G.nav.crank += clamp((want && G.nav.tablet < 0.2 ? 1 : 0) - G.nav.crank, -dt * 8, dt * 8);
  G.wipeLocal = G.nav.crank > 0.7; G.wiperOn = G.wipeLocal || !!G.wipeNet;
}
function updateMud(dt) {
  const s = G.sim; const sp = Math.abs(s.u);
  let rate = 0; // Flecken pro Sekunde
  if (s.surface === 'mud') rate = sp > 3 ? 1.2 + sp * 0.28 : 0; else if (s.surface === 'grass') rate = sp > 5 ? 0.18 + sp * 0.03 : 0; else rate = sp > 8 ? 0.015 : 0;
  mudAcc += rate * dt; while (mudAcc >= 1) { mudAcc -= 1; cockpit.addMud(1, s.surface === 'mud' ? 1.15 : 0.7); }
  // Wischer: laufen, solange gekurbelt wird, und danach bis zur Ruhelage zu Ende
  const run = G.wiperOn || (G.wiperPhase % (2 * Math.PI) > 0.001 && G.wiperPhase > 0);
  if (run) {
    const before = G.wiperPhase; G.wiperPhase += dt * (2 * Math.PI / 0.5);
    if (!G.wiperOn) { const cyc = Math.floor(before / (2 * Math.PI)); if (G.wiperPhase >= (cyc + 1) * 2 * Math.PI) G.wiperPhase = 0; } // nach dem Loslassen bis zur Ruhelage laufen
    if (before > 0 && Math.floor(before / Math.PI) !== Math.floor(G.wiperPhase / Math.PI) && G.wiperPhase > 0) audio.wiperSwish();
    G.wiperAngle = (1 - Math.cos(G.wiperPhase)) / 2 * 2.3; cockpit.wipe(G.wiperAngle);
    if (G.wiperOn) cockpit.fade(1 - Math.exp(-1.3 * dt));
  } else { G.wiperAngle = 0; cockpit.wiperRest(); }
  G.mudTimer += dt; if (G.mudTimer > 0.25) { G.mudTimer = 0; G.mudCov = cockpit.measure(); }
  cockpit.flushMud();
}

// ---------------- Fahrzeugzustand, Schäden, Nitro, Ingenieur ----------------
const DMG_SCALE = { aus: 0, selten: 0.5, normal: 1, viel: 1.7 };
const REACH = 1.6; // so weit kommt der Ingenieur mit der Hand (Meter von den Augen)
function newVehicle() {
  G.V = createVehicle({ seed: (Date.now() & 0xffff) + 1, damageScale: DMG_SCALE[settings.damage] !== undefined ? DMG_SCALE[settings.damage] : 1, infNitro: !!(DIFFICULTIES[G.diff] && DIFFICULTIES[G.diff].infiniteNitro) });
  G.E = createEngineer(); G.P = createProps(cockpit.workshop.propList.map((o) => JSON.parse(JSON.stringify(o)))); G.A = createEngineerAI();
  G.eng = { x: ENG_START.x, z: ENG_START.z }; G.sway = { x: 0, z: 0 }; G.warn = { cur: null, t: 0 }; G.heldProp = null; G.hover = null; G.reach = null; G.lastNitro = 'ready'; G.hopVis = 0;
  cockpit.workshop.setHeld(null); G.perf = computePerf(G.V); $('warnBanner').classList.add('hidden'); $('holdRing').classList.add('hidden');
}
function requestNitroAction(src) {
  if (!G.V || G.mode !== 'racing') return; if (G.mp && !G.mp.host) { rm.sendCmd('nitro'); return; } const r = requestNitro(G.V);
  toast(r.ok ? 'ZURUF: NITRO! – der Ingenieur entscheidet' : r.msg, 2200); if (audio.ready) audio.blip(r.ok ? 700 : 260, 0.08);
}

let bannerT = 0;
function showBanner(w) {
  const el = $('warnBanner'); el.classList.remove('hidden', 'crit', 'warn', 'ok'); el.classList.add(w.fixed ? 'ok' : w.sev >= 3 ? 'crit' : 'warn');
  $('wbTitle').textContent = w.fixed ? 'BEHOBEN – ' + w.title : 'ACHTUNG – ' + w.title; $('wbText').textContent = w.text; bannerT = w.fixed ? 3 : w.sev >= 3 ? 6.5 : 5;
}
function popWarnings(dt) {
  const V = G.V; const W = G.warn; W.t += dt; if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('warnBanner').classList.add('hidden'); }
  if (W.cur && W.t >= W.cur.hold) W.cur = null;
  if (!W.cur || (V.warnQueue.length && W.t > 2.2 && W.cur.sev < 3)) {
    const w = popWarning(V);
    if (w) { W.cur = { ...w, hold: w.fixed ? 3.5 : w.sev >= 3 ? 9 : 6.5 }; W.t = 0; showBanner(w); if (G.mp && G.mp.host) rm.bcast({ t: 'rw', w }); if (w.fixed) { if (audio.ding) audio.ding(); } else if (w.quiet) { if (audio.blip) { audio.blip(540, 0.1); setTimeout(() => audio.blip && audio.blip(420, 0.14), 140); } } else if (audio.alarm) audio.alarm(w.sev); }
  }
  if (W.cur) W.cur.more = V.warnQueue.length;
}
function pickAt(x, y) { return cockpit.workshop.pick(new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera, REACH); }
function applyEngEvents(r) {
  for (const ev of r.events || []) {
    if (ev.type === 'take') G.heldProp = takeProp(G.P, ev.id);
    else if (ev.type === 'drop') {
      const it = G.heldProp && G.heldProp.id === ev.id ? G.heldProp : takeProp(G.P, ev.id);
      if (it) { putProp(G.P, it, ev.where, { x: -0.74 + Math.random() * 0.16, z: -2.3 + Math.random() * 0.4, drop: 0.12 }); if (G.heldProp === it) G.heldProp = null; }
    } else if (ev.type === 'hatch') { if (audio.click) audio.click(); }
    else if (ev.type === 'part_used') { G.heldProp = null; if (audio.tick) audio.tick(); }
    else if (ev.type === 'step_done') { if (audio.tick) audio.tick(); }
    else if (ev.type === 'fixed') { if (audio.ding) audio.ding(); }
    else if (ev.type === 'nitro_fire') { if (audio.click) audio.click(); }
    else if (ev.type === 'nitro_bottle') { if (audio.tick) audio.tick(); }
  }
  cockpit.workshop.setHeld(G.E.hand);
}
function engineerClick(id) { if (!G.E) return; if (G.mp && !G.mp.host) { rm.sendCmd('click', { id }); if (audio.click) audio.click(); return; } const r = engClick(G.E, G.V, id); applyEngEvents(r); if (audio.click && r.ok) audio.click(); }
function engineerUpdate(dt) {
  const E = G.E; const mpc = G.mp && !G.mp.host; if (!mpc) tickEngineer(E, dt); G.holdId = null;
  if (G.mp && G.mp.host) rm.hostTick(dt);
  if (G.role !== 'engineer' || !(G.mode === 'racing' || G.mode === 'countdown')) { if (mpc) hostHoldRing(); else $('holdRing').classList.add('hidden'); G.reach = null; return; }
  // laufen: W/S vor/zurück in Blickrichtung, A/D seitlich
  const f = (down('throttle') ? 1 : 0) - (down('brake') ? 1 : 0); const r = (down('right') ? 1 : 0) - (down('left') ? 1 : 0); const th = G.look.yaw; const spd = 1.3;
  G.eng.x = clamp(G.eng.x + (-Math.sin(th) * f + Math.cos(th) * r) * spd * dt, ENG_BOUNDS.x0, ENG_BOUNDS.x1);
  G.eng.z = clamp(G.eng.z + (-Math.cos(th) * f - Math.sin(th) * r) * spd * dt, ENG_BOUNDS.z0, ENG_BOUNDS.z1);
  // zielen
  const hit = G.mouse.in ? pickAt(G.mouse.x, G.mouse.y) : null; G.hover = hit ? hit.id : null;
  const xh = $('crosshair'); xh.style.left = `${G.mouse.x}px`; xh.style.top = `${G.mouse.y}px`; xh.classList.toggle('on', !!hit && hit.dist <= REACH); xh.classList.toggle('far', !!hit && hit.dist > REACH); xh.classList.toggle('hidden', !G.mouse.in);
  const tip = $('tip'); const tl = hit ? targetLabel(hit.id) : ''; tip.classList.toggle('hidden', !tl || !G.mouse.in); if (tl) { tip.textContent = hit.dist > REACH ? `${tl} – zu weit weg` : tl; tip.style.left = `${G.mouse.x + 22}px`; tip.style.top = `${G.mouse.y + 14}px`; } G.reach = hit && hit.dist <= REACH ? cockpit.root.worldToLocal(hit.point.clone()) : null;
  const holdable = hit && hit.dist <= REACH && (hit.id.startsWith('c:') || hit.id === 'nitroport');
  const ring = $('holdRing');
  if (mpc) { if (G.mouse.down && holdable) G.holdId = hit.id; hostHoldRing(); return; }
  if (G.mouse.down && holdable) {
    const stress = clamp(Math.abs(G.sim.ay) / 16, 0, 1) * 0.85 + clamp(G.hopVis, 0, 1) * 0.5; const res = engHold(E, G.V, hit.id, dt, stress);
    applyEngEvents(res);
    if (res.active) { ring.classList.remove('hidden'); ring.style.left = `${G.mouse.x}px`; ring.style.top = `${G.mouse.y}px`; ring.style.background = `conic-gradient(#ffb24a ${Math.round(res.progress * 360)}deg, rgba(0,0,0,.55) 0)`; if (audio.ready && G.frame % 5 === 0 && audio.tick) audio.tick(0.5); }
    else ring.classList.add('hidden');
  } else { engRelease(E); ring.classList.add('hidden'); }
}
function hostHoldRing() { const ring = $('holdRing'); const h = G.mp && G.mp.hr; if (G.role === 'engineer' && h && h.a) { ring.classList.remove('hidden'); ring.style.left = `${G.mouse.x}px`; ring.style.top = `${G.mouse.y}px`; ring.style.background = `conic-gradient(#ffb24a ${Math.round(h.p * 360)}deg, rgba(0,0,0,.55) 0)`; } else ring.classList.add('hidden'); }
function updateVehicle(dt, inp, events) {
  const V = G.V; const s = G.sim; const racing = G.mode === 'racing';
  const impacts = []; let hop = 0;
  for (const ev of events) { impacts.push(ev.speed); hop = Math.max(hop, Math.min(3, ev.speed * 0.4)); }
  if ((s.surface === 'mud' || s.surface === 'grass') && Math.abs(s.u) > 12 && Math.random() < dt * 5) hop = Math.max(hop, 0.5 + Math.random() * 0.8);
  G.hopVis = Math.max(hop, G.hopVis - dt * 3);
  if (racing) tickVehicle(V, { u: s.u, throttle: inp.throttle, brake: inp.brake, rpm: G.rpm, surface: s.surface, impacts, offroad: Math.abs(s.lane ? s.lane.lat : 0) > 4.7 }, dt);
  if (racing && (G.mp ? rm.engineerAiActive() : (G.role !== 'engineer' && settings.engAI !== 'off'))) stepEngineerAI(G.A, V, dt, 1.0);
  stepProps(G.P, { ay: s.ay, ax: s.ax, hop }, dt);
  popWarnings(dt);
  vehicleFeedback(racing);
  if (V.wrecked && racing) wreckRun();
  engineerUpdate(dt);
}
function vehicleFeedback(racing) {
  const V = G.V;
  const ns = V.nitro.state;
  if (ns !== G.lastNitro) {
    if (ns === 'active') { if (audio.nitroStart) audio.nitroStart(); G.shake = Math.max(G.shake, 0.55); toast('NITRO!', 1200); }
    else if (ns === 'empty') toast('NITRO LEER – Flasche tauschen', 2600);
    else if (ns === 'spent') toast(nitroStatus(V).text, 3200);
    else if (ns === 'ready' && G.lastNitro === 'refilling') toast('NITRO BEREIT', 1500);
    G.lastNitro = ns;
  }
  const cutNow = !!(G.perf && G.perf.cut > 0.4 && racing); if (cutNow && !G.cutPrev) { G.kick = Math.max(G.kick, 0.9); G.shake = Math.max(G.shake, 0.3 + 0.25 * G.perf.cut); if (audio.pop) audio.pop(0, 0.2); } G.cutPrev = cutNow;
  if (audio.setAlarm) audio.setAlarm(racing && !V.wrecked && G.perf ? G.perf.alarm : 0, G.perf ? G.perf.urgency : 0);
}
function updateHudVehicle() {
  const V = G.V; if (!V) return; const n = nitroStatus(V);
  const dots = []; for (let i = 0; i < NITRO_MAX; i++) dots.push(i < n.left ? '●' : '○');
  const short = { ready: 'bereit', pending: 'angefordert', igniting: 'zündet', active: 'AKTIV', empty: 'leer', refilling: `lädt ${Math.ceil(V.nitro.t)} s`, spent: 'verbraucht' }[n.state];
  const t = `${V.infNitro ? '∞' : dots.join(' ')}  ${short}`; if ($('hNitro').textContent !== t) { $('hNitro').textContent = t; $('hNitro').className = `nitro-${n.state}`; }
  $('hTemp').style.width = `${clamp((V.temp - 60) / 80, 0, 1) * 100}%`; $('hTemp').className = V.temp > 121 ? 'crit' : V.temp > 108 ? 'warn' : '';
  const ug = urgentDamage(V); const dm = V.damages.length; const dt = dm ? `${dm} Schaden${dm > 1 ? '' : ''}` : 'ok';
  const clock = $('dmgClock'); clock.classList.toggle('hidden', !ug || G.mode !== 'racing'); if (ug) { $('dcNum').textContent = String(Math.ceil(ug.left)); $('dcName').textContent = DEFS[ug.d.id].name; clock.classList.toggle('crit', ug.left < 10); } if ($('hDmg').textContent !== dt) { $('hDmg').textContent = dt; $('hDmg').className = V.damages.some((d) => d.sev >= 3) ? 'crit' : dm ? 'warn' : ''; }
}
// Blickrichtung aller drei Figuren: eigener Blick, im Mehrspieler der Blick der Mitspieler, sonst kleine KI-Gewohnheiten (Fahrer schaut in die Kurve, Navigator pendelt zwischen Tablet und Straße)
const LOOKS = { driver: { yaw: 0, pitch: 0 }, navigator: { yaw: -0.2, pitch: -0.5 }, engineer: { yaw: 0, pitch: -0.2 } };
function figureLooks(dt) {
  const k = 1 - Math.exp(-dt * 9); G.navLookT = (G.navLookT || 0) + dt; const roadGlance = (G.navLookT % 6.4) > 4.6; const heads = G.mp ? rm.heads() : null;
  for (const r of Object.keys(LOOKS)) { let ty; let tp; const net = heads && heads[r]; if (r === G.role) { ty = G.look.yaw; tp = G.look.pitch; } else if (net) { ty = net[0]; tp = net[1]; } else if (r === 'driver') { ty = clamp(G.sim.steer * 0.55, -0.6, 0.6); tp = -0.05; } else if (r === 'navigator') { ty = roadGlance ? 0.1 : -0.3; tp = roadGlance ? -0.06 : -0.62; } else { ty = 0; tp = G.E && G.E.work ? -0.35 : -0.18; } LOOKS[r].yaw += (ty - LOOKS[r].yaw) * k; LOOKS[r].pitch += (tp - LOOKS[r].pitch) * k; }
  return LOOKS;
}
// Kamera des Ingenieurs: sitzt auf dem Rollhocker, schaut nach hinten, schwankt mit der Fahrzeugbewegung
function poseEngCamera(dt, t) {
  if (window.__debugCam) return; const s = G.sim; const sp = kmh(s); const k = Math.min(1, dt * 6);
  G.sway.x += (clamp(-s.ay * 0.0045, -0.1, 0.1) - G.sway.x) * k; G.sway.z += (clamp(-s.ax * 0.004, -0.08, 0.08) - G.sway.z) * k;
  const rough = (s.surface === 'grass' ? 1.0 : s.surface === 'mud' ? 0.8 : 0.35) * Math.min(1, sp / 70); const sh = Math.max(G.shake * G.shake, G.perf ? G.perf.shake * 0.25 : 0); G.shake = Math.max(0, G.shake - dt * 1.4);
  const jx = (Math.sin(t * 31.7) + Math.sin(t * 17.3)) * (0.0025 * rough + 0.01 * sh); const jy = (Math.sin(t * 23.1) + Math.sin(t * 41.3)) * (0.003 * rough + 0.012 * sh) + G.hopVis * 0.02;
  camera.position.set(G.eng.x + G.sway.x + jx, 1.25 + jy, G.eng.z - 0.1 + G.sway.z);
  camera.rotation.set(-0.1 + G.look.pitch, G.look.yaw, -G.sway.x * 0.25 + Math.sin(t * 37) * 0.01 * sh); camera.fov = 74; camera.updateProjectionMatrix();
}

// ---------------- Hauptschleife ----------------
let last = performance.now(); let tAbs = 0;
const wheelsDust = [[-0.8, -1.25], [0.8, -1.25]];
const navCtx = $('navPad').getContext('2d'); const engCtx = $('engPad').getContext('2d'); const aiVec = new THREE.Vector3();
// Host: sitzt ein Mitspieler am Steuer, kommen Drehzahl und Gang von ihm (er schaltet selbst)
function hostGearbox(dt, inp) {
  if (G.mp && G.role !== 'driver' && rm.driverSource() === 'remote') { const r = rm.remoteDriverInput(); G.rpm += ((r.rpm || 900) - G.rpm) * Math.min(1, dt * 10); const g = r.gear || 1; if (g !== G.gear) G.shiftAnim = 0; G.gear = g; G.kick = r.kick || 0; G.launch = r.launch || 0; G.neutral = false; return; }
  gearbox(dt, inp);
}
function emitDust(dt) {
  const sp = Math.abs(G.sim.u);
  if (sp > 5 && G.sim.surface !== 'mud') { const sn = Math.sin(G.sim.psi); const cs = Math.cos(G.sim.psi);
    for (const [l, f] of wheelsDust) if (Math.random() < dt * (6 + sp * 0.25 + G.sim.slip * 60)) world.emitDust(G.sim.x + sn * f + cs * l, G.visY - 0.1, G.sim.z + cs * f - sn * l, G.sim.u * sn, G.sim.u * cs, 1, G.sim.surface === 'grass' ? 0x7f9a5a : 0xb9b5ad); }
  else if (sp > 4 && G.sim.surface === 'mud') { const sn = Math.sin(G.sim.psi); const cs = Math.cos(G.sim.psi); for (const [l, f] of wheelsDust) if (Math.random() < dt * 10) world.emitDust(G.sim.x + sn * f + cs * l, G.visY - 0.1, G.sim.z + cs * f - sn * l, G.sim.u * sn, G.sim.u * cs, 1, 0x4c3a24); }
}
// Mitspieler (Client): kein eigener Physikschritt, der Host liefert das Auto; Getriebe/Kurbel/Anzeigen laufen lokal
function clientRaceFrame(dt, inp) {
  const racing = G.mode === 'racing'; rm.clientStep(dt);
  G.stallT = Math.max(0, G.stallT - dt); if (G.role === 'driver') gearbox(dt, inp); else { G.kick = Math.max(0, G.kick - dt / 0.42); G.launch = Math.max(0, G.launch - dt / 1.7); G.shiftT = Math.max(0, G.shiftT - dt); if (G.shiftAnim >= 0) { G.shiftAnim += dt / 0.62; if (G.shiftAnim >= 1) G.shiftAnim = -1; } }
  shifter.update(dt); gearTagUpdate(); updateNav(dt); updateMud(dt); popWarnings(dt); vehicleFeedback(racing); engineerUpdate(dt); emitDust(dt); rm.clientTick(dt, inp);
}
function launchFx() { G.losT = 0.9; audio.blip(990, 0.25); if (G.role === 'driver' && down('throttle')) { G.launch = 1; G.kick = 1; G.shake = Math.max(G.shake, 0.5); audio.shift(true, 1, 6500); toast('RAKETENSTART!', 1400); } }
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; tAbs += dt; G.frame++;
  { const m = G.mode === 'paused' ? G.prevMode : G.mode; audio.scope = m === 'menu' || m === 'titel' ? 'menu' : m === 'moon' || m === 'park' || m === 'kraft' || m === 'casino' ? m : 'rennen'; }
  if (schrank && G.mode !== 'menu') schrank.leave(); // Musik aus, Auflösung zurück, bevor das Spiel malt
  { const show = G.mode !== 'menu' || (schrankOn() ? schrank.ready : !!world && !boot.hold); if (show !== boot.shown) { boot.shown = show; $('gl').style.opacity = show ? '1' : '0'; } } // Bild blendet erst ein, wenn etwas zu sehen ist
  if (G.mode === 'moon' || (G.mode === 'paused' && G.prevMode === 'moon')) { moon.frame(dt, tAbs); return; }
  if (G.mode === 'park' || (G.mode === 'paused' && G.prevMode === 'park')) { park.frame(dt, tAbs); return; }
  if (G.mode === 'titel') { titel.frame(dt); return; }
  if (G.mode === 'kraft') { kraft.frame(dt, tAbs); return; }
  if (G.mode === 'saege') { saege.frame(dt, tAbs); return; }
  if (G.mode === 'ludwig') { ludwig.frame(dt, tAbs); return; }
  if (G.mode === 'casino') { casino.frame(dt, tAbs); return; }
  if (G.mode === 'strom') { strom.frame(dt, tAbs); return; }
  if (G.mode === 'bruno') { bruno.frame(dt, tAbs); return; }
  if (G.mode === 'ozean') { ozean.frame(dt, tAbs); return; }
  if (G.mode === 'dino') { dino.frame(dt); return; }
  if (G.mode === 'stapel') { stapel.frame(dt); return; }
  if (G.mode === 'menu' && schrankOn()) {
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('hToast').classList.add('hidden'); }
    if (schrank.frame(dt)) return; // Zimmer mit Schrank statt Rennwelt
  }
  if (!world || (boot.hold && G.mode === 'menu')) { bootStep(); return; }
  if (boot.hold) boot.hold = false;
  if (G.screen === 'roadmap') return; // die Karte deckt alles zu
  G.perf = G.V ? computePerf(G.V) : null;
  const inp = readInput(); if (G.manual && G.mode === 'racing') manualEffect(inp); G.lastInp = inp; const mpc = !!(G.mp && !G.mp.host);
  const active = G.mode === 'racing' || G.mode === 'countdown' || G.mode === 'crashed' || G.mode === 'finished';

  if (G.mode === 'countdown') {
    const waiting = !!(G.mp && G.mp.host && rm.holdCountdown(dt)); if (!G.mp || (G.mp.host && !waiting)) G.countdown -= dt; const n = Math.ceil(G.countdown - 0.2);
    const big = $('hBig'); if (waiting) { big.textContent = 'Warte auf Mitspieler …'; big.classList.remove('hidden'); } else if (n > 0) { big.textContent = String(n); big.classList.remove('hidden'); } else { big.textContent = 'LOS!'; big.classList.remove('hidden'); }
    if (G.countdown <= 0 && !mpc) { if (G.mode === 'countdown') { G.mode = 'racing'; launchFx(); } }
    else if (Math.ceil(G.countdown - 0.2) !== G.lastCount) { G.lastCount = Math.ceil(G.countdown - 0.2); if (G.lastCount > 0) audio.blip(520, 0.12); }
  }
  if (G.losT > 0) { G.losT -= dt; if (G.losT <= 0) $('hBig').classList.add('hidden'); }

  if (active && G.mode !== 'paused' && mpc) clientRaceFrame(dt, inp);
  else if (active && G.mode !== 'paused') {
    acc += dt; const events = [];
    while (acc >= 1 / 120) { step(G.sim, inp, track, 1 / 120, events); if (R.st) rivalStep(1 / 120); acc -= 1 / 120; if (G.mode === 'racing') G.time += 1 / 120; }
    for (const ev of events) {
      if (ev.type === 'crash' && !window.__holzwegNoCrash) crash(ev.speed);
      else { G.shake = Math.max(G.shake, Math.min(0.9, ev.speed / 12)); audio.thud(ev.speed); if (G.mp) rm.bcast({ t: 'rimp', sp: Math.round(ev.speed * 10) / 10 }); }
    }
    const q = G.sim.lane;
    if (q && G.mode === 'racing') {
      const cps = track.checkpoints; while (G.cpIndex + 1 < cps.length && q.s >= cps[G.cpIndex + 1]) { G.cpIndex++; const zt = `Zwischenzeit ${G.cpIndex}: ${fmt(G.time + G.penalty)}`; toast(zt, 2400); if (G.mp) rm.bcast({ t: 'rtoast', text: zt, ms: 2400 }); }
      if (track.laps) lapLogic(q); else if (q.s >= track.length - 12) finish();
    }
    G.stallT = Math.max(0, G.stallT - dt); hostGearbox(dt, inp); shifter.update(dt); gearTagUpdate();
    updateNav(dt);
    updateMud(dt);
    updateVehicle(dt, inp, events);
    emitDust(dt);
  }
  if (world && ((G.launch > 0.05 && Math.abs(G.sim.u) < 28) || (G.mode === 'countdown' && G.role === 'driver' && down('throttle')))) { const sn = Math.sin(G.sim.psi); const cs = Math.cos(G.sim.psi); for (const [l, f] of wheelsDust) if (Math.random() < dt * 55) world.emitDust(G.sim.x + sn * f + cs * l, G.visY - 0.1, G.sim.z + cs * f - sn * l, -sn * 4, -cs * 4, 1, 0xd8d4cc); }
  if (world && G.perf && G.perf.nitro > 0.05) { const sn = Math.sin(G.sim.psi); const cs = Math.cos(G.sim.psi); for (const [l, f] of wheelsDust) for (let k = 0; k < 2; k++) if (Math.random() < dt * 60) world.emitDust(G.sim.x + sn * (f - 0.6) + cs * l * 0.5, G.visY + 0.2, G.sim.z + cs * (f - 0.6) - sn * l * 0.5, -sn * 10, -cs * 10, 1, Math.random() < 0.5 ? 0xff8a1a : 0xffd24a); }
  world.updateDust(dt); rivalDraw(dt);
  { let storm = null; if (track.cfg.storm) { G.flashT = (G.flashT === undefined ? 5 : G.flashT) - dt; if (G.flashT < 0) { G.flashT = 5 + Math.random() * 11; G.flash = 0.7 + Math.random() * 0.3; setTimeout(() => { if (audio.ready && G.mode !== 'menu') audio.thud(9 + Math.random() * 7); }, 500 + Math.random() * 1500); } G.flash = (G.flash || 0) * Math.exp(-dt * 8); storm = { flash: G.flash }; if (world) world.sun.intensity = world.mood.sunI * (1 + (G.flash || 0) * 5); } fx.update(dt, G.perf, (G.mode === 'racing' || G.mode === 'crashed') && G.role !== 'engineer', storm); }

  // Kamera / Darstellung je nach Modus
  if (active || G.mode === 'paused') {
    cockpit.root.visible = true; poseVehicle(dt); poseCamera(dt, tAbs); activeCam = camera;
    car.updateMatrixWorld(true);
    world.follow(G.sim.x, G.visY, G.sim.z, camera);
    // Instrumente (30 Hz reicht), Tablet (Navigator 20 Hz)
    if (G.frame % 2 === 0) {
      if (!(G.perf && G.perf.flicker > 0 && Math.random() < G.perf.flicker * 0.5)) { cockpit.drawSpeedo(kmh(G.sim), G.rpm); cockpit.drawAux(G.rpm, G.mudCov, G.wiperOn, G.sim.reverse && G.sim.u < 0.5 ? 0 : G.gear); } // Elektrikfehler: Anzeigen flackern
      const r = audio.radio; const ri = r ? r.info : { on: false, name: 'WALDFUNK', freq: '88.1', sub: '', volume: 0.6, level: 0 };
      cockpit.drawRadio(ri);
    }
    if (G.frame % (G.role === 'navigator' ? 3 : 8) === 0) {
      const tb = cockpit.tablet; const jam = G.perf ? G.perf.signal : 0; // WLAN-Router defekt: Tablet rauscht, springt und fällt immer wieder aus
      if (!(jam > 0 && G.tabletOut)) drawTablet(tb.ctx, tb.cv.width, tb.cv.height, track, G.sim, { s: G.sim.lane ? G.sim.lane.s : 0, kmh: kmh(G.sim), time: G.time + G.penalty, length: track.length, rival: R.st });
      G.tabletOut = jam > 0 ? jamTablet(tb.ctx, tb.cv.width, tb.cv.height, jam, tAbs) : false; tb.tex.needsUpdate = true;
      if (G.role === 'navigator') navCtx.drawImage(tb.cv, 0, 0);
    }
    if (G.V && G.frame % 3 === 0) { const wx = cockpit.workshop; drawDiag(wx.diag.ctx, 640, 480, G.V, G.E, tAbs); wx.diag.tex.needsUpdate = true; drawNitroGauge(wx.gauge.ctx, 128, G.V); wx.gauge.tex.needsUpdate = true; }
    if (G.V && G.role === 'engineer' && G.frame % 2 === 0) drawGuide(engCtx, 400, 720, G.V, G.E, tAbs);
    if (G.V && G.frame % 3 === 0) { drawWarn(cockpit.workshop.warn.ctx, 512, 300, G.warn.cur, tAbs, urgentDamage(G.V)); cockpit.workshop.warn.tex.needsUpdate = true; }
    $('navPad').classList.toggle('away', G.nav.tablet < 0.5);
    let aiReach = null; const eo = G.mp ? rm.engOther() : null; if (G.role !== 'engineer' && !eo && !(G.mp && rm.hasHuman('engineer'))) { const w = G.A && G.A.work ? G.A.work.d : null; const st = w ? w.steps.find((q) => q.at) : null; const hit = st ? cockpit.workshop.targetPoint('c:' + st.at, aiVec) : null; const tx = hit ? clamp(aiVec.x * 0.8, ENG_BOUNDS.x0, ENG_BOUNDS.x1) : ENG_START.x; const tz = hit ? clamp(aiVec.z + 0.75, ENG_BOUNDS.z0, ENG_BOUNDS.z1) : ENG_START.z; const dx = tx - G.eng.x; const dz = tz - G.eng.z; const d = Math.hypot(dx, dz); if (d > 0.02) { const st2 = Math.min(d, 1.1 * dt) / d; G.eng.x += dx * st2; G.eng.z += dz * st2; } if (hit && d < 0.3) aiReach = aiVec; }
    cockpit.update({ steer: G.sim.steer, wiperAngle: G.wiperAngle, hand: G.sim.hand, throttle: inp.throttle, brake: inp.brake, clutch: G.shiftAnim >= 0 && G.shiftAnim < 0.5 ? 1 : 0, shiftP: G.shiftAnim, gear: G.gear, nav: (G.mp && G.role !== 'navigator' && rm.navOther()) || G.nav, eng: { x: eo ? eo.x : G.eng.x, z: eo ? eo.z : G.eng.z, reach: G.role === 'engineer' ? G.reach : eo ? eo.reach : aiReach, work: G.role === 'engineer' ? G.E.work : eo ? eo.work : (aiReach ? 1 : 0), holding: !!(G.E && G.E.hand), fp: G.role === 'engineer' },
      ws: { need: G.role === 'engineer' || G.mode === 'racing' ? neededItem(G.E, G.V) : null, hatches: G.E.hatches, props: G.P.items, stock: G.V.parts, v: G.V, highlight: G.role === 'engineer' ? highlightIds(G.E, G.V) : null, hover: G.role === 'engineer' ? G.hover : null, labels: G.role === 'engineer', eye: { x: G.eng.x + G.sway.x, y: 1.25, z: G.eng.z - 0.1 }, warn: G.warn.cur }, radio: audio.radio ? audio.radio.info : { on: false, volume: 0.6 }, looks: figureLooks(dt) });
    if (G.mode !== 'paused') audio.update({ kmh: kmh(G.sim), rpm: G.rpm, throttle: inp.throttle, surface: G.sim.surface, slip: G.sim.slip, hand: G.sim.hand, nitro: G.perf ? G.perf.nitro : 0, whistle: G.perf ? G.perf.whistle : 0, sputter: G.perf ? G.perf.sputter : 0, cut: G.perf ? G.perf.cut : 0, spin: (G.mode === 'countdown' && inp.throttle) ? 0.8 : G.launch > 0.05 && Math.abs(G.sim.u) < 28 ? G.launch : 0 }, G.mode !== 'finished' && G.mode !== 'crashed');
  } else { // Menühintergrund: langsamer Kameraflug über dem Start der Strecke
    G.menuT += dt; cockpit.root.visible = false;
    const p = track.poseAt(60 + 90 * (0.5 + 0.5 * Math.sin(G.menuT * 0.07)));
    { const s1 = (40 + G.menuT * 3.2) % (track.length - 120); const c = track.poseAt(s1); const l = track.poseAt(s1 + 26); const q = Math.sin(G.menuT * 0.11) * 1.4; menuCam.position.set(c.x + Math.cos(c.psi) * q, c.y + 1.7 + Math.sin(G.menuT * 0.17) * 0.35, c.z - Math.sin(c.psi) * q); menuCam.lookAt(l.x, l.y + 2.4, l.z); } // Kamerafahrt knapp über der Straße, die Bäume sind jetzt zu hoch für den Rundflug
    activeCam = menuCam;
    menuCam.updateMatrixWorld(true); world.follow(p.x, p.y, p.z, menuCam);
  }

  { post.watch(dt, active && G.mode !== 'paused'); const dprNow = Math.min(window.devicePixelRatio || 1, 1.5); if (renderer.getPixelRatio() !== dprNow) { renderer.setPixelRatio(dprNow); renderer.setSize(window.innerWidth, window.innerHeight, false); } // die Bildkette glättet selbst, mehr Pixel wären nur Last
    if (inner && cockpit.root.visible && activeCam === camera) { camera.updateMatrixWorld(); interiorFrame(dt, inp, camera); ownBody.update(dt, G.sim.u, G.sim.steer); if (G.role !== 'engineer' && !window.__debugCam && G.mode !== 'paused') renderMirrors(); }
    renderer.shadowMap.needsUpdate = settings.shadows && world.shadowDirty; activeCam.getWorldPosition(postCam); post.render(scene, activeCam, { mood: world.mood, sky: world.sky, sun: world.sun, sunDir: world.sunDir, dt, time: tAbs, speed: active ? Math.abs(G.sim.u) : 0, nitro: G.perf ? G.perf.nitro : 0, ground: activeCam === camera ? G.visY : track.heightAt(postCam.x, postCam.z), camPos: postCam }); }

  // Anzeige
  if (G.mode !== 'menu') {
    const tt = G.time + G.penalty; $('hTime').textContent = fmt(tt);
    const s = G.sim.lane ? G.sim.lane.s : 0; const lapsN = track.laps || 1; const sAll = (Math.min(G.lap || 1, lapsN) - 1) * track.length + s; $('hBar').style.width = `${clamp(sAll / (track.length * lapsN), 0, 1) * 100}%`; $('hDist').textContent = `${Math.round(sAll)} / ${Math.round(track.length * lapsN)} m`; if (track.laps) $('hLap').textContent = `${Math.min(G.lap, track.laps)}/${track.laps}`; if (R.st) { const g = Math.round(R.gap); const tx = g > 0 ? `${g} m vor dir` : `${-g} m hinter dir`; if ($('hRival').textContent !== tx) $('hRival').textContent = tx; }
    $('hMud').style.width = `${clamp(1 - G.mudCov * 2.2, 0, 1) * 100}%`;
    updateHudVehicle(); $('nitroFx').style.opacity = String(G.perf ? G.perf.nitro : 0);
    let hint = '';
    if (G.mode === 'racing' || G.mode === 'countdown') {
      if (G.role === 'engineer' && G.E) hint = (G.E.msg ? `${G.E.msg}, ` : '') + hintText(G.E, G.V);
      else if (G.sim.stuck > 2.5) hint = `Festgefahren? ${keyName(settings.binds.reset)} startet die Strecke neu`;
      else if (G.mp && G.role === 'driver' && !rm.hasHuman('navigator') && G.mudCov > 0.28) hint = `Scheibe verschmiert – kein Navigator da: ${keyName(settings.binds.use)} HALTEN und selbst kurbeln`;
      else if (G.role === 'navigator' && G.perf && G.perf.signal > 0) hint = 'Dein Tablet ist gestört – der Ingenieur muss den WLAN-Router an der Decke reparieren';
      else if (G.role === 'navigator') hint = G.mudCov > 0.28 ? `Scheibe verschmiert – ${keyName(settings.binds.use)} HALTEN: Tablet weg, Kurbel drehen (2 s)` : `Navigator: Kurven ansagen · ${keyName(settings.binds.use)} halten = Scheibe kurbeln${G.mp ? '' : ' · ' + keyName(settings.binds.role) + ' = ans Steuer'}`;
      else if (G.mudCov > 0.28) hint = G.mp ? 'Scheibe verschmiert – der Navigator kurbelt' : `Scheibe verschmiert – der Navigator kurbelt (Solo-Test: ${keyName(settings.binds.role)}, dann ${keyName(settings.binds.use)} halten)`;
      else if (G.time < 14 && G.mode === 'racing') hint = `${keyName(settings.binds.throttle)} Gas, ${keyName(settings.binds.brake)} Bremse, ${keyName(settings.binds.left)}/${keyName(settings.binds.right)} lenken, ${keyName(settings.binds.hand)} Handbremse${G.mp ? ', ' + keyName(settings.binds.nitro) + ' Nitro rufen' : ', ' + keyName(settings.binds.role) + ' Navigator-Ansicht (Solo)'}`;
      else if (Math.abs(G.sim.lane ? G.sim.lane.lat : 0) > 4.6 && Math.abs(G.sim.u) > 3) hint = 'Neben der Straße – Gras bremst und spritzt Schlamm';
    }
    if (hint !== G.lastHint) { $('hHint').textContent = hint; G.lastHint = hint; }
  }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('hToast').classList.add('hidden'); }
}
// ---------------- Race-Mehrspieler (Rollen, Host-Simulation; Logik in racemp.js) ----------------
function hostResetCar() { mp.restartRace(); }
function onRaceMode(prev, next) {
  if (next === 'racing' && prev === 'countdown') { $('hBig').textContent = 'LOS!'; launchFx(); }
  if ((next === 'racing' || next === 'countdown') && G.screen === 'result') { $('hBig').classList.add('hidden'); showScreen(null); }
}
function onRaceResult(m) {
  $('rPanel').classList.toggle('bad', m.kind !== 'finish'); $('rTitle').textContent = m.title; $('rSub').textContent = m.sub; $('rTime').textContent = m.time; $('rAgain').classList.add('hidden'); $('rRestart').classList.add('hidden'); $('rMap').classList.add('hidden'); if (m.map) saveWin(m.map, m.tt); if (m.failMap) saveFail(m.failMap);
  const big = $('hBig');
  if (m.kind === 'crash') { G.shake = 1; audio.crash(m.sp || 30); big.textContent = 'DU HAST VERKACKT!'; big.classList.remove('hidden'); setTimeout(() => { if (G.mp && G.mode === 'crashed') { big.classList.add('hidden'); showScreen('result'); } }, 1100); }
  else if (m.kind === 'wreck') { G.shake = 1; audio.wreck(); if (audio.setAlarm) audio.setAlarm(0); big.textContent = 'TOTALSCHADEN!'; big.classList.remove('hidden'); setTimeout(() => { if (G.mp && G.mode === 'crashed') { big.classList.add('hidden'); showScreen('result'); } }, 1800); }
  else { big.classList.add('hidden'); showScreen('result'); audio.blip(880, 0.2); }
}
function onRaceWarn(w) {
  G.warn.cur = { ...w, hold: w.fixed ? 3.5 : w.sev >= 3 ? 9 : 6.5 }; G.warn.t = 0; showBanner(w);
  if (w.fixed) { if (audio.ding) audio.ding(); } else if (w.quiet) { if (audio.blip) audio.blip(540, 0.1); } else if (audio.alarm) audio.alarm(w.sev);
}
const rm = createRaceMp({
  G, THREE, version: MP_VERSION, track: () => track, toast: (t, ms) => toast(t, ms), setHeld: (h) => cockpit.workshop.setHeld(h),
  hostClick: (id) => { const r = engClick(G.E, G.V, id); applyEngEvents(r); },
  hostHold: (id, dt) => { const stress = clamp(Math.abs(G.sim.ay) / 16, 0, 1) * 0.85 + clamp(G.hopVis, 0, 1) * 0.5; const res = engHold(G.E, G.V, id, dt, stress); applyEngEvents(res); return res; },
  hostRelease: () => { if (G.E) engRelease(G.E); },
  hostNitro: () => { const r = requestNitro(G.V); return { ok: r.ok, text: r.ok ? 'ZURUF: NITRO! – der Ingenieur entscheidet' : r.msg }; },
  rival: R, hostReset: hostResetCar, onModeChange: onRaceMode, onResult: onRaceResult, onWarn: onRaceWarn,
  onImpact: (sp) => { G.shake = Math.max(G.shake, Math.min(0.9, sp / 12)); audio.thud(sp); }, onRoles: () => { if (G.mp) updateRoleBadge(); },
  onGearChange: (g, prev) => { G.shiftAnim = 0; audio.shift(g > prev, 0.6, G.rpm); },
});
rm.hostReset = hostResetCar;
const moon = createMoon({ renderer, audio, $, store, keys, settings, baseDpr, resize, showScreen, down: (a) => down(a), G, toggleLook: (on) => toggleLook(on), openMenu: () => openMenu(), openCoop: () => { openMenu(); mp.openFor('moon', { onBack: () => $('bMoon').onclick() }); } }); // „Mit Freunden putzen“: Lobby nur für den Mond
// Spielstart: Das Menü steht sofort; Texturen, Wald und Shader entstehen Schritt für Schritt dahinter, dann blendet das Bild ein. Wer vorher startet, bekommt den Rest im Ladebild (loadTrack rechnet fertig)
{ track = buildTrack({ difficulty: G.diff }); G.sim = createState(track.poseAt(4)); G.sim.lane = track.nearest(G.sim.x, G.sim.z); boot.it = textureSteps(renderer); $('gl').style.opacity = '0'; }
requestAnimationFrame((t) => { last = t; frame(t); });
openMenu();

// Prüf-/Entwicklerzugang (für automatische Tests; im Spiel unsichtbar)
park = createPark({ renderer, audio, $, store, keys, settings, resize, showScreen, G, toggleLook: (on) => toggleLook(on), openMenu: () => openMenu(), post, fmt, getQuality: () => quality, shadowSize: () => POST_LEVELS[quality].shadow, endSession: () => mp.hostEnds() });
chess = createChess({ $, store, showScreen, toast, endSession: () => mp.hostEnds() });
pong = createPong({ $, store, showScreen, endSession: () => mp.hostEnds() });
ships = createShips({ $, store, showScreen, endSession: () => mp.hostEnds() });
raus = createRaus({ $, store, showScreen, endSession: () => mp.hostEnds() });
baron = createBaron({ $, store, showScreen, endSession: () => mp.hostEnds() });
kraft = createKraft({ renderer, audio, $, store, settings, showScreen, G, post, getQuality: () => quality, shadowSize: () => POST_LEVELS[quality].shadow, endSession: () => mp.hostEnds() });
casino = createCasino({ renderer, audio, $, store, settings, showScreen, G, post, getQuality: () => quality, shadowSize: () => POST_LEVELS[quality].shadow, endSession: () => mp.hostEnds() });
strom = createStrom({ renderer, audio, $, store, settings, showScreen, G, post, getQuality: () => quality, shadowSize: () => POST_LEVELS[quality].shadow, endSession: () => mp.hostEnds() });
bruno = createBruno({ renderer, audio, $, store, settings, showScreen, G, post, getQuality: () => quality, shadowSize: () => POST_LEVELS[quality].shadow, endSession: () => mp.hostEnds() });
saege = createSaege({ renderer, audio, $, store, settings, showScreen, G, shadowSize: () => POST_LEVELS[quality].shadow, endSession: () => mp.hostEnds() });
ludwig = createLudwig({ renderer, audio, $, store, settings, showScreen, G, shadowSize: () => POST_LEVELS[quality].shadow });
ozean = createOzean({ renderer, audio, $, store, settings, fullscreen, showScreen, G, post, getQuality: () => quality, shadowSize: () => POST_LEVELS[quality].shadow, endSession: () => mp.hostEnds() });
// Schul-Rangliste: Rekordbuch auf diesem PC, in der Lobby wird es mit den anderen getauscht (schulrang.js)
const meinName = () => store.get('mpName', 'Spieler');
const buch = () => sauberesBuch(store.get('schulBuch', null));
function melde(spiel, wert, art = 'rekord') { const r = trageEin(buch(), meinName(), spiel, wert, art); store.set('schulBuch', r.buch); if (schrank) schrank.refresh(); return r; }
function rangText(spiel) { return rangliste(buch(), spiel, meinName()).filter((q) => q.wert > 0).slice(0, 5).map((q) => `${q.platz}. ${q.name}${q.ich ? ' (du)' : ''}  ${SCHUL_SPIELE.find((x) => x.id === spiel).einheit(q.wert)}`).join('\n'); }
window.addEventListener('theos:sieg', (e) => { if (SCHUL_SPIELE.some((x) => x.id === e.detail)) melde(e.detail, 0, 'sieg'); });
const zurSchule = () => { openMenu(); showScreen('gallery'); };
dino = createDino({ $, store, showScreen, G, zurueck: zurSchule, melde, rangText });
stapel = createStapel({ renderer, $, store, G, showScreen, resize: () => resize(), zurueck: zurSchule, melde, rangText });
$('bDino').onclick = () => { audio.init(); dino.open(); };
$('bStapel').onclick = () => { audio.init(); stapel.open(); };
$('bRang').onclick = () => { if (schrank && !schrank.failed) schrank.oeffneTafel('rang'); };
const rangTafel = {
  titel: 'Rangliste', zu: 'Fertig',
  bau(inhalt, el) {
    const zeig = (spiel) => {
      inhalt.textContent = '';
      const reiter = el('div', 'srrang-reiter');
      for (const x of SCHUL_SPIELE) { const b = el('button', x.id === spiel ? 'an' : '', x.name); b.type = 'button'; b.dataset.spiel = x.id; b.onclick = () => { zeig(x.id); const n = inhalt.querySelector(`[data-spiel="${x.id}"]`); if (n) n.focus(); }; reiter.append(b); }
      const ol = el('ol', 'srrang-liste'); const S = SCHUL_SPIELE.find((x) => x.id === spiel);
      for (const q of rangliste(buch(), spiel, meinName())) {
        const li = el('li', `${q.platz ? 'p' + q.platz : 'leer'}${q.ich ? ' ich' : ''}`);
        li.append(el('b', '', q.platz ? `${q.platz}.` : '–'), el('span', '', q.name + (q.ich ? ' (du)' : '')), el('em', '', q.wert ? S.einheit(q.wert) : 'noch nichts'));
        ol.append(li);
      }
      inhalt.append(reiter, ol, el('p', 'srrang-info', 'Hier steht, was auf diesem PC bekannt ist. Spielt ihr zusammen in einer Lobby, tauschen alle ihre Rekorde aus. Siege zählen bei Pong, Schach und Schiffen gegen KI oder online, nicht zu dritt an einem PC.'));
    };
    zeig(schul.rangSpiel || 'stapel');
  },
};
function schulStand() {
  const b = buch(); const ich = meinName(); const out = {};
  for (const id of ['stapel', 'dino']) { const r = rangliste(b, id, ich); const me = r.find((q) => q.ich); const S = SCHUL_SPIELE.find((x) => x.id === id); out[id] = { line: me && me.wert ? `Dein Rekord: ${S.einheit(me.wert)}${me.platz ? `, Platz ${me.platz}` : ''}` : 'Noch kein Rekord' }; }
  const t = treppchen(b); out.rang = { line: t[0].punkte ? `${t[0].name} führt` : 'Noch keine Rekorde' };
  return out;
}
function schulmodus(an) {
  an = !!an; if (an === schul.an) { if (schrank) schrank.umbauen(an); return; }
  schul.an = an; document.body.classList.toggle('schule', an); $('schulBadge').classList.toggle('hidden', !an);
  if (an) { schul.tonVorher = audio.muted; audio.setMuted(true); } else audio.setMuted(schul.tonVorher);
  resize();
  if (schrank) schrank.umbauen(an);
}
let pokalQuelle = null; // erfolge.js, entsteht erst weiter unten
const mp = createMp({ schulbuch: { holen: () => buch(), mischen: (b) => { store.set('schulBuch', mische(buch(), b)); if (schrank) schrank.refresh(); } }, trophaeen: (frisch) => pokale(pokalQuelle ? (frisch ? pokalQuelle.collect() : pokalQuelle.stufen()) : {}), $, toast, store, moon, park, chess, pong, ships, raus, baron, kraft, casino, strom, bruno, ozean, saege, ludwig: ludwig.coop, showScreen, openMenu, openRoadmap, race: rm, startRace: (opts) => startRaceMp(opts), onLaunch: () => titelLaunch() });
titel = createTitel({
  renderer, audio, $, store, settings, G, showScreen, games: { ludwig, strom, ozean, bruno }, getQuality: () => quality,
  onPlay: (mode) => { resize(); G.startBack = mode; },
  onMulti: (mode) => lobbyFor(mode, () => titel.open(mode)),
  onSettings: () => { settingsBack = 'titel'; openSettings(); },
  onBack: () => { G.startBack = null; showScreen('gallery'); },
});
try { // der Schrank ist das Hauptmenü. Geht er nicht, startet das Spiel trotzdem (einfache Liste)
  const erfolge = createErfolge({ store, games: { ludwig, strom, ozean, bruno, casino, moon, park } });
  pokalQuelle = erfolge;
  setInterval(() => { const m = G.mode === 'paused' ? G.prevMode : G.mode; if (m !== 'menu' && m !== 'titel') erfolge.watch(m); }, 700); // Trophäen zählen auch für Mitspieler
  schrank = createSchrank({
    renderer, audio, $, store, settings, G, showScreen, quit, erfolge, joinLobby: (mode) => lobbyFor(mode, () => openMenu()), games: { ludwig, strom, ozean, bruno, casino }, getQuality: () => (schul.an ? 'low' : quality), resize: () => resize(),
    schule: { umschalten: (an) => schulmodus(an), stand: schulStand, treppchen: () => treppchen(buch()).map((q) => q.key), tafel: rangTafel },
    scan: () => scanLobbies({ transport: peerTransport() }), canScan: () => !new URLSearchParams(location.search).has('silent'), netBusy: () => !!mp.net,
    focusMode: (name) => (name === 'start' ? G.startMode : name === 'lobby' ? 'race' : mp.fixed),
    openSettings: (back) => { settingsBack = back; openSettings(); },
  });
} catch (e) { console.error('[schrank]', e); schrank = null; document.body.classList.remove('hub'); }
$('mpStart').onclick = () => mp.startSession(loadCampaign());
initSpielstaende({ $, erlaubt: () => (G.mode === 'menu' || G.mode === 'titel') && settingsBack !== 'pause' && !mp.net });
$('sNeu').onclick = () => { if (schrank && !schrank.failed) schrank.oeffneTafel('neues'); };
window.__holzweg = {
  openStart, openLobby: () => { mp.fixed = null; mp.onBack = null; $('mpTitle').textContent = 'Mehrspieler'; showScreen('join'); mp.render(); mp.scan(); }, // die allgemeine Lobby mit Moduswahl gibt es nur noch für Tests
  mp, race: rm, moon, park, chess, pong, ships, raus, baron, dino, stapel, schulmodus, get schule() { return schul.an; }, kraft, casino, strom, bruno, ozean, saege, ludwig, titel, crash: (sp = 30) => crash(sp), finish: () => finish(),
  shifter, G, cockpit, roadmap, openRoadmap, rival: R, renderMirrors, audio, renderer, camera, CAR, THREE, settings, loadTrack, post, setQuality,
  get V() { return G.V; }, get E() { return G.E; }, get P() { return G.P; }, get A() { return G.A; }, workshop: cockpit.workshop,
  forceDamage: (id, sev = 2, wheel = 0) => spawn(G.V, id, sev, { force: true, wheel }), requestNitro: requestNitroAction, engClick: engineerClick,
  engWork: (id, sec = 1, stress = 0) => { let r = null; for (let t = 0; t < sec; t += 0.05) { r = engHold(G.E, G.V, id, 0.05, stress); applyEngEvents(r); } return r; },
  get track() { return track; }, get world() { return world; }, get scene() { return scene; }, get schrank() { return schrank; },
  start: startRun, startRace: (opts = {}) => { if (opts.difficulty) settings.difficulty = opts.difficulty; if (opts.role) settings.role = opts.role; startRace(); }, setRole: (r) => applyRole(r),
  place: (s, speed = 0, dpsi = 0) => { resetCar(s, 0); G.sim.u = speed; G.sim.psi += dpsi; }, key: (code, isDown = true) => { if (isDown) onKey(code, true, false); else keys[code] = false; }, setKey: (code, v) => { keys[code] = v; },
  snapshot: () => ({ mode: G.mode, role: G.role, diff: G.diff, kmh: kmh(G.sim), u: G.sim.u, v: G.sim.v, x: G.sim.x, z: G.sim.z, psi: G.sim.psi, s: G.sim.lane ? G.sim.lane.s : 0, lat: G.sim.lane ? G.sim.lane.lat : 0, steer: G.sim.steer, surface: G.sim.surface,
    time: G.time, penalty: G.penalty, wiperOn: G.wiperOn, wiperAngle: G.wiperAngle, mud: G.mudCov, gear: G.gear, rpm: G.rpm, nav: { ...G.nav }, nitro: G.V ? nitroStatus(G.V) : null, wrecked: G.wrecked, urgent: G.V ? (() => { const u = urgentDamage(G.V); return u ? { id: u.d.id, left: u.left } : null; })() : null, dmg: G.V ? G.V.damages.map((d) => d.id) : [], perf: G.perf, radio: audio.radio ? { ...audio.radio.info } : null, audioState: audio.ctx ? audio.ctx.state : 'none', audioAlarm: audio.alarmState || null, need: G.E && G.V ? neededItem(G.E, G.V) : null }),
};
initUpdate($);
// Direktstart ins Casino (Desktop-Verknüpfung der Testversion startet mit --casino)
if (new URLSearchParams(location.search).has('casino')) setTimeout(() => { try { audio.init(); resize(); casino.open(); } catch (e) { console.error(e); } }, 600);
