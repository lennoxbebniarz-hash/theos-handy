// Theos Seitenscheidel - Big Bruno kommt auf die Erde (intern „bruno“). Ein Asteroid trifft in 90 Tagen die Erde: Ihr landet mit dem
// Raumschiff TS-1 auf ihm und baut ihn ab, bis der Rest in der Luft verglüht. Ego-Perspektive, Schwerkraft zur Mitte des Asteroiden.
// Aufbau: brunovox.js (Raster, Abbau), brunomesh.js (Oberfläche), brunologic.js (Regeln), brunoart.js (Fels, Weltall, Schiff, Modelle
// aus Blender), brunofx.js (Brocken, Funken, Feuer), brunotex.js (Texturen), brunostory.js (Comic), hier: Ablauf, Steuerung, Werkzeuge,
// Schiff mit Handelsdepot, Anzeige, Speichern, Mehrspieler (bis drei; der Host hält Kasse, Zeit, Drohnen; jeder Abbau geht als
// Kugel-Eingriff an alle, die Reihenfolge ist egal).
import * as THREE from './vendor/three.module.min.js';
import * as V from './brunovox.js';
import * as L from './brunologic.js';
import { createRock, createProps, buildSpace, buildShip, buildInside, insideBlocks, buildHand, buildBuddy, buildModel, toolIcons, SHIP, INSIDE, ACCENTS } from './brunoart.js';
import { createFx, createBeam, buildHole } from './brunofx.js';
import { createStory, STORY_INFO } from './brunostory.js';
import { createSaves } from './casinosaves.js';
import { createTour } from './tour.js';

const EYE = 1.6; const BODY_R = 0.34; const GRAV = 3.0; const NET_HZ = 1 / 12; const RECALL_SEC = 1.2;
const MOOD_OUT = { fogD: 0, fogH: 50, vol: 0, exposure: 0.84, sat: 1.07, tint: [1, 1, 1], adapt: [0.85, 1.3] }; const MOOD_IN = { ...MOOD_OUT, exposure: 0.92, adapt: [0.8, 1.2] };
const KINDS = ['pick', 'hammer', 'drill', 'laser', 'remote']; const TOOL_FX = { hacke: 'pick', hammer: 'hammer', bohrer: 'drill', laser: 'laser', plasma: 'hammer' };
const ICON = { hacke: 'Spitzhacke', hammer: 'Schlaghammer', bohrer: 'Bohrer', laser: 'Laserschneider', drohnen: 'Drohne', loch: 'Loch_Kapsel', orbit: 'Zielgeraet', spreng: 'Sprengladung', plasma: 'Plasmawerfer', anti: 'Antimaterie' };
const ORE_RGB = { eis: [0.12, 0.42, 0.95], eisen: [0.5, 0.09, 0.04], gold: [0.95, 0.55, 0.04], kern: [0.5, 0.15, 0.95] };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)); const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const pic = (c, w, h, col, sym) => { c.fillStyle = '#0b1020'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.font = `900 ${h * 0.32}px Bahnschrift`; c.textAlign = 'center'; c.fillText(sym, w / 2, h * 0.62); };
const STEPS = [
  { t: 'Steuerung', x: 'W A S D laufen, Umschalt rennen, Leertaste springen (wenig Schwerkraft!). Maus umsehen, Linksklick abbauen. Tasten 1 bis 9 und 0 oder Mausrad wechseln das Werkzeug. E benutzen, R halten: zurück ins Schiff. Esc Pause. Neue Einsätze, Mehrspieler und Einstellungen findest du im Startbildschirm.', draw: (c, w, h) => pic(c, w, h, '#ffd34a', 'WASD') },
  { t: 'Big Bruno abbauen', x: 'Oben in der Mitte steht, wie viele Kubikmeter Big Bruno noch hat. Wird die Zahl rot, seid ihr zu langsam. Ist er kleiner als die Verglühgrenze, verglüht der Rest in der Luft: gewonnen.', draw: (c, w, h) => pic(c, w, h, '#ee7a18', 'm³') },
  { t: 'Erz und Geld', x: 'Blaues Eis, rotes Eisenerz, Gold aus den Adern und lila Kernkristalle landen im Rucksack. Im Schiff im Handelsdepot in die Erzannahme kippen (oranger Trichter, E): Das Förderband holt es ab, das Geld kommt sofort. Am Terminal daneben kauft ihr Werkzeuge.', draw: (c, w, h) => pic(c, w, h, '#6ec8ff', '◆') },
  { t: 'Luft', x: 'Draußen geht die Luft langsam aus (Anzeige unten links). Im Schiff füllt sie sich wieder auf. Geht sie aus, wirst du ohnmächtig, das Schiff holt dich zurück, und der Rucksack ist leer.', draw: (c, w, h) => pic(c, w, h, '#8affc8', 'O₂') },
  { t: 'Ränge', x: 'Jeder Kubikmeter, den ihr zusammen abbaut, zählt für euren Rang (unten links). Jeder neue Rang schaltet ein Werkzeug frei, das ihr dann am Terminal kaufen könnt: Hammer ab 80 m³, Bohrer ab 500, Sprengladung ab 1.500, Laser ab 4.000, Drohnen ab 10.000, Plasmawerfer ab 18.000, Schwarzes Loch ab 28.000, Antimaterie ab 70.000.', draw: (c, w, h) => pic(c, w, h, '#8dff9a', '★') },
  { t: 'Große Werkzeuge', x: 'Sprengladung (8) und Antimaterie-Bombe (0) werfen, dann Abstand halten. Plasmawerfer (9) schießt Krater aus 60 m. Drohnenschwarm: Bake setzen, sechs Drohnen graben allein. Schwarzes Loch frisst eine riesige Kugel. Ab Tag 15 öffnet der Maschinenraum: Mit Rang Kanonier (40.000 m³) die Schiffswaffe an der Orbit-Konsole reparieren, dann einmal am Tag Orbitalschlag (Taste 7).', draw: (c, w, h) => pic(c, w, h, '#b05aff', '●') },
];

export function createBruno(ctx) {
  const { renderer, audio, $, store, settings, showScreen, G, post, getQuality, shadowSize, endSession } = ctx;
  const hud = $('bruno'); const canvas = renderer.domElement;
  const C = { on: false, loading: false, net: null, host: true, W: null, A: null, rock: null, props: null, S: null, slot: null, cam: new THREE.PerspectiveCamera(72, 16 / 9, 0.05, 3200), icons: {},
    me: { p: V3(), v: V3(), fwd: V3(0, 0, -1), up: V3(0, 1, 0), gn: V3(0, 1, 0), jumpT: 9, pitch: 0, inShip: true, ground: false, air: 150, recall: 0, bob: 0, moving: 0, jumpCd: 0 }, keys: {}, ui: null, cargo: {}, mine: 0, tool: 'hacke', cd: 0, swing: 0, hitAt: -1, lmb: false, kick: 0, wasOut: false,
    remotes: new Map(), holes: [], strikes: [], throws: [], charges: [], shots: [], drones: new Map(), msgQ: [], msg: null, t: 0, outOps: [], queue: [], toastT: 0, shake: 0, beaming: 0, fullWarn: 0, airWarn: 0, saveT: 0, quest: -1, pour: null, ore: [], oreI: 0, termTab: 'tools', soldT: 0, orb: null };
  const tour = createTour({ root: hud, store, key: 'bbTutSeen', steps: STEPS });
  const story = createStory({ root: hud, onEnd: (k, done) => storyEnd(k, done) });
  const saves = createSaves(store, L.fixSave, { idx: 'brunoSlots', key: 'brunoSave.', legacy: null });
  const isHost = () => !C.net || C.host; const myId = () => (C.net && C.net.me ? C.net.me.id : 'me');
  const seatOf = (id) => { if (!C.net) return 0; const i = C.net.players.findIndex((p) => p.id === id); return i < 0 ? 0 : i % 4; }; // vierter Platz nur bei neuen Ständen (die Lobby lässt sonst höchstens drei herein)
  const nameOf = (id) => (id === myId() ? 'Du' : (C.net && C.net.players.find((p) => p.id === id) || {}).name || 'Jemand');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  // ---------------- Spielstand: Werte im localStorage, Raster in IndexedDB ----------------
  function idb() { return new Promise((res, rej) => { const r = indexedDB.open('bigbruno', 1); r.onupgradeneeded = () => r.result.createObjectStore('grid'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
  async function gridPut(id, s) { try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('grid', 'readwrite'); t.objectStore('grid').put(s, id); t.oncomplete = res; t.onerror = () => rej(t.error); }); db.close(); } catch (e) { console.warn('[bruno] Raster nicht gespeichert', e); } }
  async function gridGet(id) { try { const db = await idb(); const v = await new Promise((res, rej) => { const q = db.transaction('grid', 'readonly').objectStore('grid').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); db.close(); return v || ''; } catch (e) { return ''; } }
  async function gridDel(id) { try { const db = await idb(); await new Promise((res) => { const t = db.transaction('grid', 'readwrite'); t.objectStore('grid').delete(id); t.oncomplete = res; t.onerror = res; }); db.close(); } catch (e) { /* egal */ } }
  function save() { if (!isHost() || !C.S || !C.slot || !C.A) return; C.S.vol = C.A.vol; saves.save(C.slot, C.S, C.net ? C.net.players.map((p) => p.name) : null); C.lastSave = gridPut(C.slot, V.packChunks(C.A)); }

  // ---------------- Welt aufbauen ----------------
  function buildWorld() {
    if (C.W) return C.W; const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010103);
    const space = buildSpace(scene, renderer, { shadows: settings.shadows, shadowSize: shadowSize() }); const ship = buildShip(scene); const inside = buildInside(scene);
    scene.add(C.cam); const hand = buildHand(C.cam);
    const lamp = new THREE.SpotLight(0xfff2e2, 30, 30, 0.85, 0.8, 1.5); lamp.position.set(0.22, 0.12, 0.1); C.cam.add(lamp); C.cam.add(lamp.target); lamp.target.position.set(0, -0.22, -1); // Helmlampe
    const fx = createFx(scene, { dist: (x, y, z) => C.A.dist(x, y, z), normal: (x, y, z, o) => C.A.normal(x, y, z, o) });
    const laser = createBeam(scene, 0xff3ad0, 0.075); const aimLine = createBeam(scene, 0xff3a2a, 0.02); const orbitBeam = createBeam(scene, 0xff8a4a, 1.3); const beams = Array.from({ length: 10 }, () => createBeam(scene, 0x7aff9a, 0.018));
    const lasLight = new THREE.PointLight(0xff3ad0, 0, 10, 2); fx.lights.add(lasLight);
    C.icons = toolIcons(renderer, Object.values(ICON));
    C.W = { scene, space, ship, inside, hand, fx, laser, aimLine, orbitBeam, beams, lasLight, lamp, beamI: 0, lit: null }; return C.W;
  }
  // Lichter: draußen (Schiff, Effekte, Helmlampe) und drinnen (Raumlichter) nie gleichzeitig, das spart Rechenzeit
  function setLights(inside) { const W = C.W; if (W.lit === inside) return; W.lit = inside; W.inside.lights.visible = inside; W.ship.lights.visible = !inside; W.fx.lights.visible = !inside; W.lamp.visible = !inside; W.hand.fill.visible = !inside; }
  function setAsteroid(seed, grid) {
    const W = C.W; if (C.rock) C.rock.dispose(); if (C.props) C.props.dispose();
    C.A = V.createAsteroid(seed); if (grid) V.unpackChunks(C.A, grid); C.rock = createRock(W.scene, C.A, { shadows: settings.shadows }); C.rock.all(); W.fx.rock = C.rock;
    C.props = createProps(W.scene, C.A, propGone); STORY_INFO.vol = L.fmt(C.A.vol0);
  }
  // Ein weggebaggerter Stein, Kristall oder Nugget fliegt als Brocken davon
  function propGone(o, n) { if (n > 16 && Math.random() < 0.65) return; const p = V3(o.x, o.y, o.z); const out = p.clone().normalize(); if (o.kind === 'rock') C.W.fx.chunks('rock', p, out, { count: 1, speed: 4 + Math.random() * 4, size: Math.min(0.5, o.size * 0.9), color: o.col }); else C.W.fx.chunks(o.kind, p, out, { count: 2, speed: 5.5, size: o.kind === 'gold' ? o.size * 0.8 : o.size * 0.55 }); }
  const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  function showLoad(on, text) { $('bbLoad').classList.toggle('hidden', !on); if (text) $('bbLoadT').textContent = text; }
  async function enterAsync() {
    hud.classList.remove('hidden'); G.mode = 'bruno'; showScreen(null); $('hud').classList.add('hidden'); C.loading = true; C.queue = [];
    if (!C.W) { showLoad(true, 'Das Raumschiff TS-1 wird betankt …'); await nextPaint(); buildWorld(); }
    showLoad(false); post.setLevel(getQuality()); post.reset(); C.keys = {}; closeUI(); audio.init();
  }
  async function loadSlot(id) {
    showLoad(true, 'Big Bruno wird vermessen …'); await nextPaint(); C.slot = id; C.S = saves.load(id); let grid = await gridGet(id);
    if ((C.S.v || 1) < V.GRID_V) { const name = (saves.get(id) || {}).name; C.S = L.newSave(); C.S.introSeen = true; saves.save(id, C.S); await gridDel(id); grid = ''; C.oldSave = name || 'Einsatz'; } // alter Stand (grobes Raster): passt nicht mehr, fängt neu an
    setAsteroid(C.S.seed, grid); if (!C.S.vol0) { C.S.vol0 = C.A.vol0; C.S.dayVol = C.A.vol; } showLoad(false);
  }
  function begin() {
    C.on = true; C.loading = false; C.cargo = {}; C.mine = 0; C.msgQ = []; C.msg = null; C.lmb = false; C.ui = null; C.quest = -1; C.pour = null; C.wasOut = false; C.wallKey = '';
    for (const h of C.holes) { C.W.scene.remove(h.hole.group); C.W.scene.remove(h.cap.group); } C.holes = []; C.strikes = []; for (const t of C.throws) C.W.scene.remove(t.model.group); C.throws = []; for (const q of [...C.charges, ...C.shots]) C.W.scene.remove(q.group); C.charges = []; C.shots = [];
    for (const d of C.drones.values()) { for (const m of d.models) C.W.scene.remove(m.group); C.W.scene.remove(d.bake.group); } C.drones.clear(); C.rock.unmark(0); C.rock.unmark(1); C.rock.unmark(2);
    spawnInShip(); selectTool('hacke'); refreshHud(true); $('bbFade').classList.remove('on'); $('bbMsg').classList.add('hidden');
    if (isHost() && !C.S.introSeen) { C.S.introSeen = true; save(); story.play('intro'); if (C.net) broadcast({ k: 'story', kind: 'intro' }); } else afterIntro();
  }
  function afterIntro() {
    if (C.oldSave) { toast(`„${C.oldSave}“ war noch auf dem alten, groben Asteroiden gespeichert und fängt deshalb neu an.`, 'bad'); C.oldSave = null; }
    else if (C.S && C.S.over) toast(C.S.over === 'won' ? 'Die Erde ist gerettet. Ihr könnt Big Bruno trotzdem weiter abbauen.' : 'Big Bruno ist eingeschlagen. Im Pausemenü: Nochmal von vorn.', 'gold');
    if (!store.get('bbTutSeen', false)) setTimeout(() => { if (C.on && !story.on) tour.show(); }, 400);
  }

  // ---------------- Spieler ----------------
  function spawnInShip() { const m = C.me; m.inShip = true; m.p.copy(C.W.inside.spots.spawn); m.v.set(0, 0, 0); m.fwd.set(0, 0, -1); m.pitch = 0; m.air = L.upVal(C.S, 'luft'); }
  function exitShip() { // durch die Schleuse nach unten auf den Asteroiden
    const A = C.A; const from = C.W.ship.luke; const dir = V3().copy(from).negate().normalize(); const hit = A.raycast(from.x, from.y, from.z, dir.x, dir.y, dir.z, 200); const m = C.me;
    if (hit) m.p.set(hit.x, hit.y, hit.z).addScaledVector(dir, -1.2); else m.p.set(0, 5, 0);
    m.inShip = false; C.orb = null; C.wasOut = true; m.v.set(0, 0, 0); const up = V3().copy(m.p).normalize(); m.up.copy(up); m.gn.copy(up); m.jumpT = 9; m.fwd.set(0, 0, -1).addScaledVector(up, -up.z).normalize(); m.pitch = -0.15; C.beaming = 1.2; sfx('beam'); fade(0.5);
  }
  function enterShip(why) { spawnInShip(); C.beaming = 1.2; sfx('beam'); fade(0.6); if (why) toast(why, 'bad'); }
  const upOf = (p, out = V3()) => (C.me.inShip ? out.set(0, 1, 0) : p === C.me.p && C.me.up.lengthSq() > 0.5 ? out.copy(C.me.up) : out.copy(p).normalize()); // eigene Figur: geglättete Bodenrichtung (siehe settle)
  const _up = V3(); const _r = V3(); const _w = V3(); const _n = { x: 0, y: 0, z: 0 }; const _c = V3(); const _q = new THREE.Quaternion(); const _m4 = new THREE.Matrix4(); const _o = V3(); const _d = V3(); const _tg = V3();
  function walk(dt) {
    const m = C.me; const K = C.keys; const busy = !!C.ui || tour.open || story.on; const up = upOf(m.p, _up);
    m.fwd.addScaledVector(up, -m.fwd.dot(up)); if (m.fwd.lengthSq() < 1e-6) m.fwd.set(1, 0, 0).addScaledVector(up, -up.x); m.fwd.normalize(); _r.crossVectors(m.fwd, up).normalize();
    let ix = 0; let iz = 0; if (!busy) { if (K.KeyW) iz += 1; if (K.KeyS) iz -= 1; if (K.KeyD) ix += 1; if (K.KeyA) ix -= 1; }
    const run = K.ShiftLeft || K.ShiftRight; const sp = m.inShip ? (run ? 5.4 : 3.6) : (run ? 6.4 : 4.0); _w.set(0, 0, 0).addScaledVector(m.fwd, iz).addScaledVector(_r, ix); if (_w.lengthSq() > 1) _w.normalize(); _w.multiplyScalar(sp);
    if (m.inShip) {
      m.v.lerp(_w, 1 - Math.exp(-dt * 12)); m.p.addScaledVector(m.v, dt); m.p.y = INSIDE.y;
      for (const b of insideBlocks(C.S.orbit.open || C.S.orbit.unlocked)) { const x0 = INSIDE.x + b[0]; const z0 = INSIDE.z + b[1]; const x1 = INSIDE.x + b[2]; const z1 = INSIDE.z + b[3]; const cx = clamp(m.p.x, x0, x1); const cz = clamp(m.p.z, z0, z1); const dx = m.p.x - cx; const dz = m.p.z - cz; const d = Math.hypot(dx, dz); if (d < BODY_R) { if (d < 1e-5) { const ex = Math.min(m.p.x - x0, x1 - m.p.x); const ez = Math.min(m.p.z - z0, z1 - m.p.z); if (ex < ez) m.p.x = m.p.x - x0 < x1 - m.p.x ? x0 - BODY_R : x1 + BODY_R; else m.p.z = m.p.z - z0 < z1 - m.p.z ? z0 - BODY_R : z1 + BODY_R; continue; } m.p.x = cx + dx / d * BODY_R; m.p.z = cz + dz / d * BODY_R; } }
      m.ground = true; m.moving = Math.hypot(m.v.x, m.v.z); return;
    }
    if (m.ground) { _w.addScaledVector(m.gn, -_w.dot(m.gn)); const l = _w.length(); if (l > 1e-4) _w.multiplyScalar(Math.min(sp, l * 1.15) / l); } // am Boden: entlang des Hangs statt hinein
    // Wippen beim Stehen (2026-11-13, Lennox-Clip: „man buggt nach oben und unten“): tang lag in _c, das collide/settle mit der Position überschreiben.
    // m.moving war darum immer ~46 (Abstand zur Mitte), das Kopfwippen lief auch im Stand mit voller Höhe und ~70 Schritten pro Sekunde. Eigener Vektor _tg.
    m.jumpT += dt; const vn = m.ground ? 0 : m.v.dot(up); const tang = _tg.copy(m.v).addScaledVector(up, -vn); const k = m.ground ? 1 - Math.exp(-dt * (ix || iz ? 10 : 14)) : 1 - Math.exp(-dt * 1.2);
    tang.lerp(_w, k); m.v.copy(tang).addScaledVector(up, vn);
    if (m.ground && !ix && !iz) m.v.addScaledVector(m.gn, -GRAV * dt * Math.max(0, m.gn.dot(up))); else m.v.addScaledVector(up, -GRAV * dt); // Haftreibung: im Stand drückt die Schwerkraft in den Hang, nicht hinunter
    if (!busy && K.Space && m.ground && m.jumpCd <= 0) { m.v.addScaledVector(up, L.upVal(C.S, 'sprung')); m.ground = false; m.jumpCd = 0.35; m.jumpT = 0; sfx('jump'); }
    m.jumpCd = Math.max(0, m.jumpCd - dt);
    const steps = Math.max(1, Math.ceil(m.v.length() * dt / 0.2)); m.ground = false; for (let s = 0; s < steps; s++) { m.p.addScaledVector(m.v, dt / steps); collide(); }
    settle(dt);
    if (m.p.length() > 400) enterShip('Du bist zu weit weggeflogen. Das Schiff hat dich eingesammelt.');
    m.moving = _tg.copy(m.v).addScaledVector(m.up, -m.v.dot(m.up)).length(); // echtes Tempo nach dem Anstoßen (gegen eine Wand gelaufen: kein Wippen)
  }
  // Geisterboden (2026-11-13, Lennox: „über der Grube läuft man im Nichts, es zittert, man kann nicht reinspringen“): Abbauen senkt die Dichte nur
  // (min), über der alten Oberfläche bleibt der alte Luftwert stehen. A.dist meldet dort weiter „0,3 m bis zum Boden“, obwohl darunter eine Grube ist.
  // Deshalb jede Bodenberührung mit einem kurzen Strahl prüfen: nur echter Fels in Gegenrichtung der Normale zählt.
  const realRock = (x, y, z, n, len) => !!C.A.raycast(x, y, z, -n.x, -n.y, -n.z, len);
  // Grubenkante: Oben kippte mit der Kante mit, die Schwerkraft (entlang Oben) drückte die Figur an die Kante, man hing fest statt hineinzurutschen.
  // Jetzt zählt nur Boden, der höchstens ~57° steiler ist als die Richtung zur Mitte (WALL); Oben kippt höchstens 35° (UP_TILT) davon weg.
  const WALL = 0.55; const UP_TILT = Math.cos(35 * Math.PI / 180); const radDot = (p, n) => { const l = Math.hypot(p.x, p.y, p.z) || 1; return (p.x * n.x + p.y * n.y + p.z * n.z) / l; };
  function collide() {
    const m = C.me; const A = C.A; const up = upOf(m.p, _up);
    for (let it = 0; it < 3; it++) for (const h of [0.34, 0.95, 1.45]) {
      _c.copy(m.p).addScaledVector(up, h); const d = A.dist(_c.x, _c.y, _c.z); if (d >= BODY_R) continue; A.normal(_c.x, _c.y, _c.z, _n); if (d > 0 && !realRock(_c.x, _c.y, _c.z, _n, BODY_R + 0.05)) continue; const push = BODY_R - d;
      m.p.x += _n.x * push; m.p.y += _n.y * push; m.p.z += _n.z * push; const into = m.v.x * _n.x + m.v.y * _n.y + m.v.z * _n.z; if (into < 0) { m.v.x -= _n.x * into; m.v.y -= _n.y * into; m.v.z -= _n.z * into; }
      if (h < 0.5 && _n.x * up.x + _n.y * up.y + _n.z * up.z > 0.5 && radDot(m.p, _n) > WALL) m.ground = true;
    }
  }
  // Bodenhaftung (2026-11-13, Lennox: „man buggt auf der Oberfläche rum“): Vorher wechselte das Spiel bis zu 2.600-mal in acht Minuten zwischen Boden und Luft,
  // in der Luft gab es kaum Steuerung, und Oben zeigte stur zur Mitte, auch an schrägen Wänden. Jetzt: Füße rasten bis 22 cm auf den Boden ein,
  // Oben folgt weich der breit gemessenen Bodennormale (70 %) und der Richtung von der Mitte weg (30 %). Gemessen im Nachbau: 78 Wechsel, nach 300 Gruben 25-mal weniger Feststecken.
  const _g = V3(); const _rad = V3(); const _sn = { x: 0, y: 0, z: 0 };
  function broadNormal(x, y, z, out) { const A = C.A; const e = 1.1; const gx = A.sample(x - e, y, z) - A.sample(x + e, y, z); const gy = A.sample(x, y - e, z) - A.sample(x, y + e, z); const gz = A.sample(x, y, z - e) - A.sample(x, y, z + e); const l = Math.hypot(gx, gy, gz); if (l < 1e-3) return false; out.set(gx / l, gy / l, gz / l); return true; }
  function settle(dt) {
    const m = C.me; const A = C.A; const up = m.up; _rad.copy(m.p).normalize(); if (up.lengthSq() < 0.5 || up.dot(_rad) < 0.2) up.copy(_rad); // nach einem Sprung ans andere Ende (Test, Wiedereintritt) nicht mit alter Richtung weiterlaufen
    _c.copy(m.p).addScaledVector(up, BODY_R); const d = A.dist(_c.x, _c.y, _c.z); const rising = m.jumpT < 0.3 || m.v.dot(up) > 2.5;
    if (!rising && d < BODY_R + 0.22) { A.normal(_c.x, _c.y, _c.z, _sn); if (_sn.x * up.x + _sn.y * up.y + _sn.z * up.z > 0.35 && radDot(m.p, _sn) > WALL && (d <= 0 || realRock(_c.x, _c.y, _c.z, _sn, BODY_R + 0.27))) { m.ground = true; m.gn.set(_sn.x, _sn.y, _sn.z); if (d > BODY_R) { const s = d - BODY_R; m.p.x -= _sn.x * s; m.p.y -= _sn.y * s; m.p.z -= _sn.z * s; } const into = m.v.dot(m.gn); if (into < 0) m.v.addScaledVector(m.gn, -into); } }
    let tgt = _rad; if (m.ground && broadNormal(m.p.x, m.p.y, m.p.z, _g)) { _g.multiplyScalar(0.7).addScaledVector(_rad, 0.3).normalize(); tgt = _g; }
    up.lerp(tgt, 1 - Math.exp(-dt * (m.ground ? 4 : 1.5))).normalize();
    const c = up.dot(_rad); if (c < UP_TILT) { _g.copy(up).addScaledVector(_rad, -c); if (_g.lengthSq() < 1e-8) up.copy(_rad); else { _g.normalize(); up.copy(_rad).multiplyScalar(UP_TILT).addScaledVector(_g, Math.sqrt(1 - UP_TILT * UP_TILT)).normalize(); } }
  }
  function eyeCam(dt) {
    if (C.orb) { const cam = C.cam; cam.position.set(SHIP.x, SHIP.y - 4.2, SHIP.z + 2); const d = _c.set(Math.tan(C.orb.ax), -1, Math.tan(C.orb.az)).normalize(); cam.up.set(0, 0, -1); cam.lookAt(cam.position.x + d.x, cam.position.y + d.y, cam.position.z + d.z); cam.up.set(0, 1, 0); if (C.shake > 0) { cam.rotateZ((Math.random() - 0.5) * C.shake * 0.05); C.shake = Math.max(0, C.shake - dt * 1.4 * (0.4 + C.shake)); } return; }
    const m = C.me; const cam = C.cam; const up = upOf(m.p, _up); _r.crossVectors(m.fwd, up).normalize(); const back = _c.copy(m.fwd).negate();
    _m4.makeBasis(_r, up, back); _q.setFromRotationMatrix(_m4); cam.quaternion.copy(_q); C.kick = Math.max(0, C.kick - dt * 6 * (C.kick + 0.05)); cam.rotateX(m.pitch + C.kick);
    m.bob += dt * (m.moving > 0.3 && m.ground ? m.moving * 1.9 : 0); const bob = m.ground ? Math.sin(m.bob * 2) * 0.035 * Math.min(1, m.moving / 4) : 0;
    cam.position.copy(m.p).addScaledVector(up, EYE + bob); if (C.shake > 0) { cam.position.x += (Math.random() - 0.5) * C.shake; cam.position.y += (Math.random() - 0.5) * C.shake; cam.position.z += (Math.random() - 0.5) * C.shake; C.shake = Math.max(0, C.shake - dt * 1.4 * (0.4 + C.shake)); }
  }
  // Rückruf: R halten, das Schiff holt dich mit dem Strahl hoch
  function recallTick(dt) { const m = C.me; const want = C.keys.KeyR && !m.inShip && !C.ui && !story.on; m.recall = want ? m.recall + dt : 0; $('bbRecall').classList.toggle('hidden', !want); $('bbRecall').style.setProperty('--p', String(clamp(m.recall / RECALL_SEC, 0, 1))); if (m.recall >= RECALL_SEC) { m.recall = 0; enterShip(); } }
  function airTick(dt) { const m = C.me; const cap = L.upVal(C.S, 'luft'); if (m.inShip) { m.air = Math.min(cap, m.air + dt * 40); return; } m.air -= dt; if (m.air < 20 && (C.airWarn -= dt) <= 0) { C.airWarn = 4; sfx('warn'); toast('Luft wird knapp! R halten: zurück ins Schiff.', 'bad'); } if (m.air <= 0) { C.cargo = {}; enterShip('Die Luft ist ausgegangen. Das Schiff hat dich ohnmächtig eingesammelt, der Rucksack ist leer.'); } }

  // ---------------- Werkzeuge ----------------
  const owned = (id) => { const S = C.S; const t = L.toolById(id); if (!t || !S) return false; if (t.kind === 'orbit') return S.orbit.unlocked; if (t.kind === 'hole' || t.kind === 'charge') return !!S.owned[id]; if (t.kind === 'drones') return S.swarmsOwned > 0; return !!S.owned[id]; };
  function selectTool(id) { if (!owned(id)) return; C.tool = id; const t = L.toolById(id); const H = C.W.hand; for (const [n, m] of Object.entries(H.tools)) m.group.visible = n === t.model; C.swing = 0; C.raise = 0; C.cd = 0; C.hitAt = -1; renderBar(); } // Abklingzeit des alten Werkzeugs gilt nicht für das neue
  function cycleTool(dir) { const list = L.TOOLS.filter((t) => owned(t.id)); if (!list.length) return; const i = list.findIndex((t) => t.id === C.tool); selectTool(list[(i + dir + list.length) % list.length].id); }
  function aim(range) { const cam = C.cam; cam.getWorldPosition(_o); cam.getWorldDirection(_d); return C.A.raycast(_o.x, _o.y, _o.z, _d.x, _d.y, _d.z, range); }
  const r2 = (v) => Math.round(v * 100) / 100; // Eingriffe gerundet anwenden und verschicken: so haben alle genau dasselbe Raster
  // Ein eigener Abbau: Raster ändern, lose Steine weg, Erz einsammeln, Effekte, an alle schicken
  function myDig(x0, y0, z0, r0, kind) {
    const x = r2(x0); const y = r2(y0); const z = r2(z0); const r = r2(r0); const res = C.A.dig(x, y, z, r); C.props.dig(x, y, z, r); C.outOps.push([x, y, z, r, KINDS.indexOf(kind)]);
    if (res.vol > 0.0005) { C.mine += res.vol; const lost = L.stow(C.cargo, L.oreOf(res.mat), L.upVal(C.S, 'sack')); if (lost > 0.01 && C.t - C.fullWarn > 6) { C.fullWarn = C.t; toast('Rucksack voll! R halten, im Schiff an der Erzannahme abgeben.', 'bad'); sfx('error'); } }
    C.W.fx.dig(kind, x, y, z, r, res); return res;
  }
  function anyDig(x, y, z, r, kind) { const res = C.A.dig(x, y, z, r); C.props.dig(x, y, z, r); C.W.fx.dig(kind, x, y, z, r, res); return res; }
  function useTool(dt) {
    const t = L.toolById(C.tool); const m = C.me; C.cd = Math.max(0, C.cd - dt); const W = C.W; W.laser.hide(); W.lasLight.intensity = 0; W.aimLine.hide(); let marked = false;
    if (C.orb) { C.drill = false; const r = L.upVal(C.S, 'orbit'); const ready = C.S.orbit.ready > 0; const h = C.ui ? null : aim(300); C.orb.h = h; if (h) C.rock.mark(0, h.x, h.y, h.z, r, ready ? 0xff6a3a : 0x777777, 1.3); else C.rock.unmark(0); if (C.lmb && C.cd <= 0) { C.cd = 0.8; C.lmb = false; if (!ready) { toast('Der Orbitallaser lädt noch. Morgen wieder.', 'bad'); sfx('error'); } else if (h) act({ k: 'orbit', x: h.x, y: h.y, z: h.z }); } return; }
    if (m.inShip || C.ui || tour.open || story.on) { C.drill = false; C.rock.unmark(0); return; }
    if (t.kind === 'hit') {
      if (C.lmb && C.cd <= 0) { C.cd = t.cd; C.swing = 1; C.hitAt = 0.12; sfx('swing'); }
      if (C.hitAt >= 0) { C.hitAt -= dt; if (C.hitAt < 0) { const h = aim(t.range); if (h) { C.cam.getWorldDirection(_d); const res = myDig(h.x + _d.x * 0.2, h.y + _d.y * 0.2, h.z + _d.z * 0.2, t.r, TOOL_FX[t.id]); sfx(res.mat[3] > 0.01 ? 'gold' : res.mat[1] > 0.02 ? 'ice' : 'hit', t.id === 'hammer' ? 1.5 : 1); C.shake = Math.max(C.shake, t.id === 'hammer' ? 0.09 : 0.035); C.kick = t.id === 'hammer' ? 0.05 : 0.025; } else sfx('miss'); } }
    } else if (t.kind === 'drill' || t.kind === 'beam') {
      const on = C.lmb; C.drill = on; if (!on) { C.rock.unmark(0); return; } const h = aim(t.range); C.cam.getWorldDirection(_d);
      if (t.kind === 'beam') { const a = V3(); W.hand.tools.Laserschneider.parts.Laserschneider_Muendung.getWorldPosition(a); const b = h ? V3(h.x, h.y, h.z) : V3().copy(a).addScaledVector(_d, t.range); W.laser.set(a, b, C.t); W.lasLight.position.copy(b).addScaledVector(_d, -0.5); W.lasLight.intensity = 22; if ((C.flT = (C.flT || 0) - dt) <= 0) { C.flT = 0.045; W.fx.flare(a, [1, 0.45, 0.9], 0.5, 0.07); if (h) W.fx.glow(b, [1, 0.5, 0.9], 1.5, 0.09); } }
      if (h && C.cd <= 0) { C.cd = t.cd; const off = t.kind === 'drill' ? 0.45 : 0.3; myDig(h.x + _d.x * off, h.y + _d.y * off, h.z + _d.z * off, t.r, TOOL_FX[t.id]); C.shake = Math.max(C.shake, t.kind === 'drill' ? 0.02 : 0.012); }
    } else if (t.kind === 'drones') {
      const h = aim(30); if (h) { C.rock.mark(0, h.x, h.y, h.z, L.SWARM_R, 0x7aff5a, 0.9); marked = true; }
      if (C.lmb && C.cd <= 0) { C.cd = 0.6; C.lmb = false; if (C.S.swarms.length >= C.S.swarmsOwned) { toast('Alle Schwärme sind draußen. Mit E an einer Bake einsammeln.', 'bad'); sfx('error'); } else if (h) throwThing('bake', h); else toast('Zu weit weg.', 'bad'); }
    } else if (t.kind === 'hole') {
      const h = aim(30); if (h) { C.rock.mark(0, h.x, h.y, h.z, t.r, 0xb05aff, 0.9); marked = true; }
      if (C.lmb && C.cd <= 0) { C.cd = 0.8; C.lmb = false; if (C.S.caps <= 0) { toast('Keine Kapsel mehr. Am Terminal kaufen.', 'bad'); sfx('error'); } else if (h) throwThing('loch', h); else toast('Zu weit weg.', 'bad'); }
    } else if (t.kind === 'charge') { // Sprengladung, Antimaterie: werfen wie die Kapsel
      const h = aim(30); if (h) { C.rock.mark(0, h.x, h.y, h.z, t.r, t.id === 'anti' ? 0xff4adf : 0xff7a2a, 0.9); marked = true; }
      if (C.lmb && C.cd <= 0) { C.cd = 0.7; C.lmb = false; if (!((C.S.ammo || {})[t.id] > 0)) { toast(`Keine ${t.name} mehr. Am Terminal kaufen.`, 'bad'); sfx('error'); } else if (h) throwThing(t.id, h); else toast('Zu weit weg.', 'bad'); }
    } else if (t.kind === 'shot') { // Plasmawerfer: Kugel fliegt zum Ziel, dort Krater (eigener Abbau, Erz in den Rucksack)
      const h = aim(t.range); if (h) { C.rock.mark(0, h.x, h.y, h.z, t.r, 0x5aff7a, 0.7); marked = true; }
      if (C.lmb && C.cd <= 0) { C.cd = t.cd; C.kick = 0.06; fireShot(t, h); }
    } else if (t.kind === 'orbit') {
      const r = L.upVal(C.S, 'orbit'); const ready = C.S.orbit.ready > 0; const h = aim(140); if (h) { C.rock.mark(0, h.x, h.y, h.z, r, ready ? 0xff6a3a : 0x777777, 1.1); marked = true; if (ready) W.aimLine.set(GUN(), V3(h.x, h.y, h.z), C.t, 0.8); }
      if (C.lmb && C.cd <= 0) { C.cd = 0.8; C.lmb = false; if (!ready) { toast('Der Orbitallaser lädt noch. Morgen wieder.', 'bad'); sfx('error'); } else if (h) act({ k: 'orbit', x: h.x, y: h.y, z: h.z }); }
    }
    if (!marked) C.rock.unmark(0);
  }
  // Schießen (Bake, Kapsel): fliegt im Bogen genau zum markierten Punkt
  function throwThing(kind, h) { const o = V3(); C.cam.getWorldPosition(o); C.cam.getWorldDirection(_d); const model = buildModel(kind === 'loch' ? 'Loch_Kapsel' : kind === 'bake' ? 'Bake' : L.toolById(kind).model, { shadow: false }); const from = o.clone().addScaledVector(_d, 0.6).addScaledVector(upOf(C.me.p, _up), -0.25); model.group.position.copy(from); C.W.scene.add(model.group); const to = V3(h.x, h.y, h.z); C.throws.push({ kind, from, to, model, t: 0, dur: clamp(from.distanceTo(to) / 22, 0.25, 1.1) }); sfx('throw'); C.kick = 0.03; }
  function throwsTick(dt) {
    for (const th of [...C.throws]) { th.t += dt; const u = Math.min(1, th.t / th.dur); const g = th.model.group; g.position.lerpVectors(th.from, th.to, u).addScaledVector(_c.copy(th.to).normalize(), Math.sin(u * Math.PI) * th.from.distanceTo(th.to) * 0.12); g.rotation.x += dt * 9; g.rotation.z += dt * 5;
      if (u >= 1) { C.W.scene.remove(g); C.throws.splice(C.throws.indexOf(th), 1); act(th.kind === 'loch' ? { k: 'hole', x: th.to.x, y: th.to.y, z: th.to.z } : th.kind === 'bake' ? { k: 'swarm', x: th.to.x, y: th.to.y, z: th.to.z } : { k: 'charge', id: th.kind, x: th.to.x, y: th.to.y, z: th.to.z }); } }
  }
  function handTick(dt) {
    const t = L.toolById(C.tool); const H = C.W.hand; const g = H.tools[t.model].group; const P = H.POSE[t.model]; const m = C.me; H.holder.visible = !m.inShip && !story.on;
    C.raise = Math.min(1, (C.raise || 0) + dt * 4.5); const drop = (1 - C.raise) * (1 - C.raise) * 0.5; if (C.swing > 0) C.swing = Math.max(0, C.swing - dt * 2.7); const s = C.swing; const k = s > 0 ? Math.sin(Math.min(1, (1 - s) * 1.35) * Math.PI) : 0; const sway = Math.sin(m.bob * 2) * 0.012 * Math.min(1, (m.moving || 0) / 4);
    g.position.set(P[0] + sway, P[1] + Math.abs(sway) - k * 0.06 - drop, P[2] - k * 0.14); g.rotation.set(P[3] - k * 1.3, P[4], P[5] + k * 0.15);
    if (t.kind === 'drill') { const b = H.tools.Bohrer.parts.Bohrer_Dreh; if (b) b.rotation.z += dt * (C.drill ? 44 : 1.2); if (C.drill) { g.position.x += (Math.random() - 0.5) * 0.007; g.position.y += (Math.random() - 0.5) * 0.005; } }
    if (t.kind === 'beam' && C.drill) { g.position.z += 0.012 + 0.006 * Math.sin(C.t * 70); g.position.y += (Math.random() - 0.5) * 0.003; }
  }

  // ---------------- Handlungen: Host führt aus, Mitspieler fragen an ----------------
  function act(a) { if (isHost()) return doAct(myId(), a); C.net.send({ t: 'bdo', a }); return null; }
  function doAct(who, a) {
    const S = C.S; let r = { ok: false, why: '?' };
    if (a.k === 'sell') { r = L.sell(S, a.cargo || {}); if (r.ok && who !== myId()) toast(`${nameOf(who)}: ${r.text}`, 'gold'); if (r.ok) broadcast({ k: 'sold', who, text: `${nameOf(who)}: ${r.text}` }); }
    else if (a.k === 'buy') { r = L.buy(S, a.id, !!a.up, C.A.vol); }
    else if (a.k === 'charge') { const t = L.toolById(a.id); if (!t || t.kind !== 'charge' || !((S.ammo || {})[a.id] > 0)) r = { ok: false, why: 'Keine Ladung mehr.' }; else { S.ammo[a.id]--; const ev = { k: 'charge', id: a.id, x: r2(a.x), y: r2(a.y), z: r2(a.z), r: t.r, fuse: t.fuse }; broadcast(ev); onEvent(ev); r = { ok: true, quiet: true }; } }
    else if (a.k === 'swarm') { if (S.swarms.length >= S.swarmsOwned) r = { ok: false, why: 'Kein freier Schwarm.' }; else { S.swarms.push({ id: S.nextId++, x: r2(a.x), y: r2(a.y), z: r2(a.z), left: L.SWARM_CAP, miss: 0 }); r = { ok: true, text: 'Drohnenschwarm ausgesetzt. Er gräbt jetzt allein.' }; } }
    else if (a.k === 'pickup') { const i = S.swarms.findIndex((s) => s.id === a.id); if (i >= 0) { S.swarms.splice(i, 1); r = { ok: true, text: 'Bake eingesammelt.' }; } }
    else if (a.k === 'hole') { if (S.caps <= 0) r = { ok: false, why: 'Keine Kapsel mehr.' }; else { S.caps--; const ev = { k: 'hole', x: r2(a.x), y: r2(a.y), z: r2(a.z), r: L.toolById('loch').r }; broadcast(ev); onEvent(ev); r = { ok: true, quiet: true }; } }
    else if (a.k === 'orbit') { if (!S.orbit.unlocked || !(S.orbit.ready > 0)) r = { ok: false, why: 'Der Orbitallaser lädt noch.' }; else { S.orbit.ready = 0; S.stats.orbitShots = (S.stats.orbitShots || 0) + 1; const ev = { k: 'orbit', x: r2(a.x), y: r2(a.y), z: r2(a.z), r: L.upVal(S, 'orbit') }; broadcast(ev); onEvent(ev); r = { ok: true, quiet: true }; } }
    if (r.ok || r.why) changed(); if (who !== myId() && C.net) C.net.sendTo(who, { t: 'bres', r, a: a.k }); else result(r, a.k); return r;
  }
  function result(r, k) {
    if (!r) return;
    if (r.ok && k === 'sell') { sfx('coin'); showSold(r.value, C.soldCargo || {}); refreshHud(true); if (C.ui) renderUI(); return; }
    if (r.ok && k === 'buy') { sfx('buy'); if (C.ui) renderUI(); renderBar(); const t = L.toolById(C.lastBuy); if (t && t.kind !== 'hole' && t.kind !== 'drones' && owned(t.id)) selectTool(t.id); const b = document.querySelector(`#bbTermBody [data-card="${C.lastBuy}"]`); if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); } }
    if (r.ok && r.text && !r.quiet) toast(r.text, 'gold'); else if (!r.ok && r.why) { toast(r.why, 'bad'); sfx('error'); }
  }
  function changed() { if (!isHost()) return; refreshHud(true); pushState(); }
  function pushState() { if (C.net && C.host && C.S) C.net.broadcast({ t: 'bS', S: C.S }); }
  function broadcast(ev) { if (C.net && C.host) C.net.broadcast({ t: 'bev', ev }); }
  function onEvent(ev) {
    if (ev.k === 'toast') toast(ev.text, ev.kind);
    else if (ev.k === 'sold') { if (ev.who !== myId()) { toast(ev.text, 'gold'); sfx('coin'); } }
    else if (ev.k === 'msg') C.msgQ.push(ev.m);
    else if (ev.k === 'day') { toast(`Tag ${ev.rep.day} ist vorbei: ${L.fmt(ev.rep.removed)} m³ abgebaut, die Erde zahlt +${L.cr(ev.rep.praemie)}.`, 'gold'); sfx('day'); }
    else if (ev.k === 'hole') startHole(ev);
    else if (ev.k === 'charge') startCharge(ev);
    else if (ev.k === 'orbit') startStrike(ev);
    else if (ev.k === 'story') { if (C.ui) closeUI(); unlock(); story.play(ev.kind); }
    else if (ev.k === 'over') { C.S.over = ev.over; if (C.ui) closeUI(); unlock(); story.play(ev.over); }
  }

  // ---------------- Schwarzes Loch ----------------
  function startHole(ev) { const hole = buildHole(); hole.group.position.set(ev.x, ev.y, ev.z); hole.group.scale.setScalar(0.01); const cap = buildModel('Loch_Kapsel', { shadow: false }); cap.group.position.set(ev.x, ev.y, ev.z).addScaledVector(V3(ev.x, ev.y, ev.z).normalize(), 0.12); cap.group.scale.setScalar(1.6); C.W.scene.add(hole.group); C.W.scene.add(cap.group); C.holes.push({ ...ev, t: 0, hole, cap, step: 0, n: V3(ev.x, ev.y, ev.z).normalize() }); C.rock.mark(1, ev.x, ev.y, ev.z, ev.r, 0xb05aff, 1.2); sfx('arm'); }
  function holesTick(dt) {
    const fx = C.W.fx;
    for (const h of [...C.holes]) {
      h.t += dt; const T = h.t; const p = h.hole.group.position; const near = C.cam.position.distanceTo(p);
      if (T < 2.6) { h.cap.group.visible = Math.sin(T * (6 + T * 7)) > -0.3; h.cap.group.rotation.y += dt * 3; if (Math.random() < dt * 8) fx.sparks(p, h.n, 4, 2, 2, 0.4); continue; }
      h.cap.group.visible = false; const g = clamp((T - 2.6) / 2.2, 0, 1); const s = T < 4.8 ? 0.35 + g * 2.4 : Math.max(0.01, 2.75 * (1 - (T - 4.8) / 0.55));
      h.hole.group.scale.setScalar(s); h.hole.ring.rotation.z += dt * 5; h.hole.ring2.rotation.z -= dt * 7; h.hole.group.quaternion.setFromUnitVectors(V3(0, 1, 0), h.n);
      if (h.step === 0) { h.step = 1; sfx('hole'); fx.flash(p, 0xb070ff, 24, 30, 2.6); }
      while (h.step <= 8 && T >= 2.6 + h.step * 0.26) { const r = h.r * h.step / 8; anyDig(h.x, h.y, h.z, r, h.step % 3 === 0 ? 'big' : 'quiet'); h.step++; }
      // Alles wird hineingesaugt: Funken und Staub fliegen zur Mitte
      for (let i = 0; i < 3; i++) { const q = V3().randomDirection().multiplyScalar(h.r * (0.9 + Math.random() * 0.7)).add(p); if (C.A.dist(q.x, q.y, q.z) > 2.5) continue; fx.sparks(q, V3().copy(p).sub(q).normalize(), 4, 1, q.distanceTo(p) * 1.6, 0.55, 0.2); }
      if (Math.random() < dt * 14) { const q = V3().randomDirection().multiplyScalar(h.r * 1.1).add(p); fx.chunks('rock', q, V3().copy(p).sub(q).normalize(), { count: 1, speed: 9, size: 0.3, spread: 0.2, life: 0.9 }); }
      if (near < 50) C.shake = Math.max(C.shake, 0.14 * (1 - near / 50));
      if (T > 5.35) { fx.explode(p, h.n, h.r * 0.55, { ring: [0.7, 0.35, 1.0], flare: [0.8, 0.5, 1.0], light: 0xb070ff, spark: 4, fire: 5 }); C.rock.heat(h.x, h.y, h.z, h.r, 12, 1, 0.55); C.rock.unmark(1); C.W.scene.remove(h.hole.group); C.W.scene.remove(h.cap.group); C.holes.splice(C.holes.indexOf(h), 1); sfx('boom', 0.7); }
    }
  }
  // ---------------- Sprengladung, Antimaterie-Bombe (alle sehen sie, jeder gräbt selbst gleich) ----------------
  function startCharge(ev) { const t = L.toolById(ev.id); const m = buildModel(t.model, { shadow: false }); const n = V3(ev.x, ev.y, ev.z).normalize(); m.group.position.set(ev.x, ev.y, ev.z).addScaledVector(n, 0.05); m.group.quaternion.setFromUnitVectors(V3(0, 1, 0), n); m.group.scale.setScalar(ev.id === 'anti' ? 2.2 : 1.6); C.W.scene.add(m.group); C.charges.push({ ...ev, t: 0, group: m.group, parts: m.parts, n, step: 0, boom: false, beep: 0 }); C.rock.mark(1, ev.x, ev.y, ev.z, ev.r, ev.id === 'anti' ? 0xff4adf : 0xff7a2a, 1.2); sfx('arm'); }
  function chargesTick(dt) {
    const fx = C.W.fx;
    for (const c of [...C.charges]) {
      c.t += dt; const p = V3(c.x, c.y, c.z); const near = C.cam.position.distanceTo(p); const left = c.fuse - c.t; const big = c.id === 'anti';
      if (!c.boom) { const blink = Math.sin(c.t * (8 + c.t * 9)) > 0; const led = c.parts.Sprengladung_Licht || c.parts.Antimaterie_Kern; if (led) led.visible = blink || big; if (big) c.group.rotation.y += dt * (2 + c.t * 3); if ((c.beep -= dt) <= 0) { c.beep = Math.max(0.12, left * 0.35); sfx('warn'); } if (big && Math.random() < dt * 10) fx.sparks(p, c.n, 4, 2, 3, 0.4); }
      if (left <= 0 && !c.boom) { c.boom = true; C.W.scene.remove(c.group); C.rock.unmark(1); if (!big) { anyDig(c.x, c.y, c.z, c.r, 'big'); fx.explode(p, c.n, c.r * 0.9, { fire: 5, spark: 0 }); C.rock.heat(c.x, c.y, c.z, c.r, 8, 0, 0.8); sfx('boom', 0.55); if (near < 25) C.shake = Math.max(C.shake, 0.3 * (1 - near / 25)); C.charges.splice(C.charges.indexOf(c), 1); continue; }
        fx.explode(p, c.n, c.r * 0.8, { ring: [1, 0.4, 0.9], flare: [1, 0.6, 1], light: 0xff60e0, spark: 4, fire: 12 }); flashScreen(Math.max(0.25, 1 - near / 120)); sfx('boom', 1.2); sfx('hole'); }
      if (c.boom && big) { while (c.step < 8 && c.t >= c.fuse + c.step * 0.12) { c.step++; anyDig(c.x, c.y, c.z, c.r * c.step / 8, c.step % 3 === 0 ? 'big' : 'quiet'); } if (near < 90) C.shake = Math.max(C.shake, 0.45 * (1 - near / 90)); if (c.step >= 8) { C.rock.heat(c.x, c.y, c.z, c.r, 22, 2, 0.8); C.charges.splice(C.charges.indexOf(c), 1); } }
    }
  }
  const PLASMA = 0x5aff7a;
  function fireShot(t, h) { const W = C.W; const a = V3(); const mz = W.hand.tools.Plasmawerfer.parts.Plasmawerfer_Muendung; if (mz) mz.getWorldPosition(a); else C.cam.getWorldPosition(a); C.cam.getWorldDirection(_d); const b = h ? V3(h.x, h.y, h.z) : V3().copy(a).addScaledVector(_d, t.range);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 4, 1.8), toneMapped: false })); ball.position.copy(a); W.scene.add(ball); C.shots.push({ group: ball, a, b, t: 0, dur: Math.max(0.05, a.distanceTo(b) / t.speed), hit: !!h, r: t.r, dir: V3().copy(_d) }); W.fx.flare(a, [0.4, 1, 0.5], 0.9, 0.08); sfx('plasma'); }
  function shotsTick(dt) {
    const W = C.W; const fx = W.fx;
    for (const q of [...C.shots]) { q.t += dt; const u = Math.min(1, q.t / q.dur); q.group.position.lerpVectors(q.a, q.b, u); if (Math.random() < dt * 30) fx.glow(V3().copy(q.group.position), [0.4, 1, 0.5], 0.7, 0.12);
      if (u >= 1) { W.scene.remove(q.group); C.shots.splice(C.shots.indexOf(q), 1); if (!q.hit) continue; const off = q.dir.clone().multiplyScalar(0.4); const res = myDig(q.b.x + off.x, q.b.y + off.y, q.b.z + off.z, q.r, 'hammer'); C.A.normal(q.b.x, q.b.y, q.b.z, _n); const n = V3(_n.x, _n.y, _n.z); fx.explode(q.b, n, q.r * 0.7, { ring: [0.4, 1, 0.5], flare: [0.5, 1, 0.6], light: PLASMA, spark: 0, fire: 3 }); C.rock.heat(q.b.x, q.b.y, q.b.z, q.r, 6, 0, 0.9); sfx(res.mat[3] > 0.01 ? 'gold' : 'boom', res.mat[3] > 0.01 ? 1 : 0.35); const near = C.cam.position.distanceTo(q.b); if (near < 20) C.shake = Math.max(C.shake, 0.12 * (1 - near / 20)); } }
  }
  // ---------------- Orbitalschlag ----------------
  const GUN = () => V3(SHIP.x, SHIP.y - 2.6, SHIP.z - 8.5); // Mündung am Bug des Schiffs
  // Zielkamera an der Orbit-Konsole: Blick vom Schiff senkrecht auf Big Bruno, Maus zielt, Linksklick feuert
  function orbitView(on) { if (on && !C.S.orbit.unlocked) return; C.orb = on ? { ax: 0, az: 0.25, h: null } : null; C.lmb = false; C.rock.unmark(0); if (on) { lock(); toast('Zielkamera: Maus zielt, Linksklick feuert, E geht zurück.'); sfx('open'); } }
  function startStrike(ev) { C.A.normal(ev.x, ev.y, ev.z, _n); C.strikes.push({ ...ev, t: 0, step: 0, n: V3(_n.x, _n.y, _n.z), boom: false }); C.rock.mark(1, ev.x, ev.y, ev.z, ev.r, 0xff6a3a, 1.5); sfx('arm'); toast('Orbitalschlag! In Deckung!', 'bad'); }
  function strikesTick(dt) {
    const W = C.W; const fx = W.fx; let beam = false;
    for (const s of [...C.strikes]) {
      s.t += dt; const T = s.t; const p = V3(s.x, s.y, s.z); const from = GUN(); const near = C.orb ? 60 : C.cam.position.distanceTo(p);
      if (T < 2.5) { C.rock.mark(1, s.x, s.y, s.z, s.r, 0xff6a3a, 1.2 + Math.sin(T * (5 + T * 6)) * 0.8); W.aimLine.set(from, p, C.t, 1 + T); }
      else if (T < 3.7) { const w = Math.min(1, (T - 2.5) * 6) * (1 - Math.max(0, T - 3.3) * 2.5); W.orbitBeam.set(from, p, C.t, Math.max(0.05, w)); beam = true; if (s.step === 0) { s.step = 1; sfx('orbit'); } if (Math.random() < dt * 40) fx.sparks(p, s.n, 2, 6, 18, 0.7); }
      while (s.step >= 1 && s.step <= 6 && T >= 2.55 + s.step * 0.1) { const r = s.r * s.step / 6; anyDig(s.x, s.y, s.z, r, s.step % 2 === 0 ? 'big' : 'quiet'); s.step++; }
      if (T >= 2.62 && !s.boom) { s.boom = true; fx.explode(p, s.n, s.r, {}); C.rock.heat(s.x, s.y, s.z, s.r, 20, 0, 0.8); C.rock.unmark(1); flashScreen(Math.max(0.15, 1 - near / 140)); sfx('boom', 1); }
      if (T > 2.5 && T < 4.2) C.shake = Math.max(C.shake, 0.4 * Math.max(0.15, 1 - near / 130));
      if (T > 4.4) C.strikes.splice(C.strikes.indexOf(s), 1);
    }
    if (!beam) W.orbitBeam.hide();
  }
  function flashScreen(k) { const f = $('bbFlash'); f.style.opacity = String(Math.min(0.9, k)); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  // ---------------- Drohnen (Host gräbt, alle sehen sie fliegen) ----------------
  function swarmsHost(dt) {
    const S = C.S; C.swarmT = (C.swarmT || 0) + dt; if (C.swarmT < 0.45) return; C.swarmT = 0; const done = [];
    for (const s of S.swarms) {
      let hit = null; for (let tries = 0; tries < 6 && !hit; tries++) { const q = V3().randomDirection().multiplyScalar(Math.cbrt(Math.random()) * L.SWARM_R).add(V3(s.x, s.y, s.z)); if (C.A.sample(q.x, q.y, q.z) >= V.ISO) hit = q; }
      if (!hit) { s.miss++; if (s.miss > 40) done.push(s); continue; } s.miss = 0; hit.set(r2(hit.x), r2(hit.y), r2(hit.z));
      const op = [hit.x, hit.y, hit.z, 1.0, 4]; const res = droneDig(s.id, op); s.left -= res.vol; S.stats.droneM3 = (S.stats.droneM3 || 0) + res.vol; const hv = L.droneHaul(res.mat); S.purse += hv.value; S.stats.earned += hv.value; const H = (C.haul = C.haul || { ore: {}, rock: 0, value: 0 }); H.rock += hv.rock; H.value += hv.value; S.stats.droneKg = (S.stats.droneKg || 0) + hv.rock; for (const [id, kg] of Object.entries(hv.ore)) { H.ore[id] = (H.ore[id] || 0) + kg; S.stats.ore[id] = (S.stats.ore[id] || 0) + kg; }
      if (C.net) C.net.broadcast({ t: 'bd', o: [op], d: s.id }); if (s.left <= 0) done.push(s);
    }
    // Lieferschein alle 20 s: was die Drohnen ins Schiff gebracht haben (für alle sichtbar)
    C.haulT = (C.haulT || 0) + 0.45; if (C.haul && C.haulT >= 20 && C.haul.value >= 1) { C.haulT = 0; const H = C.haul; C.haul = null; const parts = [`${Math.round(H.rock)} kg Gestein`]; for (const o of L.ORES) if (o && H.ore[o.id] >= 0.05) parts.push(`${H.ore[o.id].toFixed(1).replace('.', ',')} kg ${o.name}`); const text = `Drohnen liefern: ${parts.join(', ')} · +${L.cr(H.value)}`; broadcast({ k: 'toast', text, kind: '' }); toast(text); }
    for (const s of done) { S.swarms.splice(S.swarms.indexOf(s), 1); broadcast({ k: 'toast', text: 'Ein Drohnenschwarm ist fertig. Er kann neu ausgesetzt werden.', kind: '' }); toast('Ein Drohnenschwarm ist fertig. Er kann neu ausgesetzt werden.'); pushState(); renderBar(); }
  }
  function droneDig(id, op) { const res = anyDig(op[0], op[1], op[2], op[3], 'drone'); const d = C.drones.get(id); if (d) { const k = (d.zap = (d.zap + 1) % d.models.length); const m = d.models[k]; m.target = V3(op[0], op[1], op[2]); m.zapT = 0.3; } return res; }
  function dronesVisual(dt) {
    const want = new Set((C.S.swarms || []).map((s) => s.id)); let nearest = null; let nd = 1e9;
    for (const [id, d] of C.drones) if (!want.has(id)) { for (const m of d.models) C.W.scene.remove(m.group); C.W.scene.remove(d.bake.group); C.drones.delete(id); }
    for (const s of C.S.swarms || []) {
      let d = C.drones.get(s.id); if (!d) { const bake = buildModel('Bake', { shadow: false }); bake.group.scale.setScalar(2.2); C.W.scene.add(bake.group); d = { bake, models: [], zap: 0 }; for (let i = 0; i < 6; i++) { const m = buildModel('Drohne', { shadow: false }); m.group.scale.setScalar(1.7); m.group.position.set(s.x, s.y, s.z).multiplyScalar(1 + 5 / Math.max(1, Math.hypot(s.x, s.y, s.z))); C.W.scene.add(m.group); d.models.push({ group: m.group, parts: m.parts, ph: i * 1.05, zapT: 0, target: null }); } C.drones.set(s.id, d); }
      const base = V3(s.x, s.y, s.z); const up = V3().copy(base).normalize(); d.bake.group.position.copy(base); d.bake.group.quaternion.setFromUnitVectors(V3(0, 1, 0), up); const dd = C.me.inShip ? 1e9 : base.distanceTo(C.me.p); if (dd < nd) { nd = dd; nearest = s; }
      const t1 = V3(1, 0, 0).cross(up); if (t1.lengthSq() < 0.01) t1.set(0, 0, 1).cross(up); t1.normalize(); const t2 = V3().crossVectors(up, t1);
      d.models.forEach((m, i) => { const a = C.t * 0.7 + m.ph; const pos = V3().copy(base).addScaledVector(up, 5.5 + Math.sin(C.t * 1.3 + i) * 0.8).addScaledVector(t1, Math.cos(a) * 6).addScaledVector(t2, Math.sin(a) * 6); m.group.position.lerp(pos, 1 - Math.exp(-dt * 3)); m.group.quaternion.setFromUnitVectors(V3(0, 1, 0), up); for (let r = 1; r <= 4; r++) { const rot = m.parts['Drohne_Rotor_' + r]; if (rot) rot.rotation.y += dt * 40; }
        if (m.zapT > 0 && m.target) { m.zapT -= dt; const b = C.W.beams[(C.W.beamI = (C.W.beamI + 1) % C.W.beams.length)]; b.set(V3().copy(m.group.position).addScaledVector(up, -0.3), m.target, C.t); b.until = C.t + 0.06; } });
    }
    for (const b of C.W.beams) if (b.grp.visible && C.t > (b.until || 0)) b.hide();
    if (nearest && nd < 60) C.rock.mark(2, nearest.x, nearest.y, nearest.z, L.SWARM_R, 0x7aff5a, 0.45); else C.rock.unmark(2);
  }

  // ---------------- Schiff: Schleuse, Erzannahme, Terminal, Orbit-Konsole, Andockstrahl ----------------
  function targets() {
    const m = C.me; if (C.orb) return { e: 'orbout', text: 'zurück zur Konsole · Linksklick: feuern' };
    if (m.inShip) { const sp = C.W.inside.spots; const near = (v, r) => Math.hypot(m.p.x - v.x, m.p.z - v.z) < r; if (near(sp.hopper, 2.5)) return { e: 'hopper', text: L.cargoKg(C.cargo) > 0.05 ? `Erzannahme: ${L.cargoKg(C.cargo).toFixed(1).replace('.', ',')} kg abgeben (${L.cr(L.oreValue(C.cargo))})` : 'Erzannahme (Rucksack ist leer)' }; if (near(sp.term, 1.7)) return { e: 'term', text: 'Terminal 03: Werkzeuge kaufen' }; if ((C.S.orbit.open || C.S.orbit.unlocked) && near(sp.orbit, 1.9)) return { e: 'orbit', text: C.S.orbit.unlocked ? 'Orbit-Konsole' : 'Orbit-Konsole: Schiffswaffe reparieren' }; if (near(sp.lock, 2.0)) return { e: 'lock', text: 'Luftschleuse: raus auf Big Bruno' }; if (near(sp.wall, 1.4) || (m.p.x < INSIDE.x - 5.2 && Math.abs(m.p.z - INSIDE.z - 1) < 4.4)) return { e: 'term', text: 'Werkzeugwand: ansehen und kaufen' }; if (!(C.S.orbit.open || C.S.orbit.unlocked) && Math.abs(m.p.z - (INSIDE.z - 8.4)) < 1.2 && Math.abs(m.p.x - INSIDE.x) < 1.6) return { e: 'locked', text: 'Maschinenraum (gesperrt bis Tag 15)' }; return null; }
    for (const s of C.S.swarms) if (m.p.distanceTo(V3(s.x, s.y, s.z)) < 3) return { e: 'pickup', id: s.id, text: 'Drohnen-Bake einsammeln' };
    const toShip = V3().copy(SHIP).normalize(); const along = m.p.dot(toShip); const off = V3().copy(m.p).addScaledVector(toShip, -along).length(); if (off < 3.2 && along > 0) return { e: 'beam', text: 'Andockstrahl: hoch ins Schiff' };
    return null;
  }
  function interact() { const t = C.target; if (!t) return; if (t.e === 'term') openUI('term'); else if (t.e === 'hopper') dumpOre(); else if (t.e === 'orbit') openUI('orbit'); else if (t.e === 'orbout') orbitView(false); else if (t.e === 'lock') exitShip(); else if (t.e === 'beam') enterShip(); else if (t.e === 'pickup') act({ k: 'pickup', id: t.id }); else if (t.e === 'locked') { toast('Der Maschinenraum ist zu. Die Erde gibt ihn ab Tag 15 frei.', 'bad'); sfx('error'); } }
  // Erz abgeben: Der Rucksack wird in den Trichter gekippt, das Förderband holt die Brocken ab, das Geld kommt sofort
  function dumpOre() {
    const kg = L.cargoKg(C.cargo); if (kg <= 0.05) { toast('Der Rucksack ist leer. Draußen Erz abbauen: Eis, Eisenerz, Gold.', 'bad'); sfx('error'); return; }
    const cargo = { ...C.cargo }; C.cargo = {}; C.soldCargo = cargo; const cols = []; for (const [id, k] of Object.entries(cargo)) { const n = Math.max(1, Math.round(k / kg * 12)); for (let i = 0; i < n; i++) cols.push(ORE_RGB[id] || [0.6, 0.6, 0.6]); }
    C.pour = { t: 0, dur: clamp(0.9 + kg / 45, 1.0, 2.8), n: clamp(Math.round(kg * 0.7), 10, 70), sent: 0, cols }; act({ k: 'sell', cargo }); sfx('pour'); refreshHud(true);
  }
  const _oc = new THREE.Color(); const _om = new THREE.Matrix4(); const _oq = new THREE.Quaternion(); const _os = V3(); const _op = V3();
  function oreTick(dt) {
    const I = C.W.inside; const im = I.ore; const P = C.pour; const sp = I.spots; let any = false;
    if (P) { P.t += dt; const want = Math.min(P.n, Math.ceil(P.t / P.dur * P.n)); const m = C.me; while (P.sent < want) { let o = C.ore[C.oreI]; if (!o) o = C.ore[C.oreI] = { ph: 0, t: 0, a: V3(), b: V3(), s: 0.1, e: new THREE.Euler() }; const i = C.oreI; C.oreI = (C.oreI + 1) % I.ORE; o.ph = 1; o.t = 0; o.a.copy(m.p).addScaledVector(m.fwd, 0.45); o.a.y += 1.15; o.b.set(sp.hopper.x + (Math.random() - 0.5) * 1.3, sp.hopper.y + 0.25 + Math.random() * 0.3, sp.hopper.z + (Math.random() - 0.5) * 1.3); o.s = 0.045 + Math.random() * 0.06; o.e.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); const c = P.cols[P.sent % P.cols.length]; im.setColorAt(i, _oc.setRGB(c[0], c[1], c[2])); im.instanceColor.needsUpdate = true; P.sent++; if (P.sent % 3 === 0) sfx('clack'); } if (P.t > P.dur) C.pour = null; }
    for (let i = 0; i < C.ore.length; i++) { const o = C.ore[i]; if (!o || !o.ph) continue; any = true; o.t += dt; let k = 1;
      if (o.ph === 1) { const u = Math.min(1, o.t / 0.5); _op.lerpVectors(o.a, o.b, u); _op.y += Math.sin(u * Math.PI) * 0.55; o.e.x += dt * 7; if (u >= 1) { o.ph = 2; o.t = 0; o.wait = 0.5 + Math.random() * 1.3; } }
      else if (o.ph === 2) { _op.copy(o.b); _op.y -= Math.min(0.3, o.t * 0.25); if (o.t > o.wait) { o.ph = 3; o.t = 0; o.off = (Math.random() - 0.5) * 0.55; } }
      else { const u = o.t / 3.2; _op.lerpVectors(sp.bandA, sp.bandB, u); _op.x += o.off; _op.y += o.s * 0.5; if (u >= 1) { o.ph = 0; k = 0; } }
      _oq.setFromEuler(o.e); _os.setScalar(o.s * k); _om.compose(_op, _oq, _os); im.setMatrixAt(i, _om); }
    if (any || C.oreLive) im.instanceMatrix.needsUpdate = true; C.oreLive = any;
  }
  function shipTick(dt) {
    const W = C.W; const S = C.S; const I = W.inside; W.ship.group.position.y = SHIP.y + Math.sin(C.t * 0.6) * 0.4; W.ship.group.rotation.z = Math.sin(C.t * 0.4) * 0.01;
    if (!C.me.inShip) { const L0 = W.ship.luke; const dir = V3().copy(L0).negate().normalize(); if ((C.beamT = (C.beamT || 0) - dt) <= 0) { C.beamT = 0.3; const h = C.A.raycast(L0.x, L0.y, L0.z, dir.x, dir.y, dir.z, 200); C.beamLen = h ? h.t + 0.5 : 60; } W.ship.beam.scale.y = C.beamLen || 30; }
    C.beaming = Math.max(0, C.beaming - dt); W.ship.beamMat.opacity = 0.1 + 0.25 * C.beaming + 0.03 * Math.sin(C.t * 3); W.ship.beam.visible = !C.orb;
    if (!C.me.inShip) return;
    // Tür zum Maschinenraum gleitet auf, sobald die Erde ihn freigibt; Lampen grün
    const open = S.orbit.open || S.orbit.unlocked ? 1 : 0; C.doorK = (C.doorK === undefined ? open : C.doorK + clamp(open - C.doorK, -dt * 0.7, dt * 0.7)); if (I.doorL) { I.doorL.position.x = I.doorL.userData.pos0.x - C.doorK * 1.22; I.doorR.position.x = I.doorR.userData.pos0.x + C.doorK * 1.22; }
    if (I.lamp) { I.lamp.color.set(open ? 0x3aff7a : 0xff3a2a); I.lamp.emissive.set(open ? 0x3aff7a : 0xff3a2a); }
    if (I.charge) I.charge.emissiveIntensity = !S.orbit.unlocked ? 0.3 : S.orbit.ready > 0 ? 3.5 + Math.sin(C.t * 4) * 0.8 : 0.8;
    if (I.plasma) I.plasma.emissiveIntensity = 5 + Math.sin(C.t * 9) * 0.7 + Math.sin(C.t * 23) * 0.4; if (I.rings[0]) { I.rings[0].rotation.y += dt * 0.9; I.rings[1].rotation.y -= dt * 1.4; }
    oreTick(dt); if ((C.scrT = (C.scrT || 0) - dt) <= 0) { C.scrT = 0.6; drawScreens(); }
    const wk = L.TOOLS.map((t) => (owned(t.id) ? 1 : 0)).join('') + '|' + S.caps + '|' + S.swarmsOwned + '|' + L.rankOf(L.removed(S, C.A.vol)).i + '|' + S.orbit.open; if (wk !== C.wallKey) { C.wallKey = wk; drawWall(); }
  }
  function drawWall() {
    const S = C.S;
    for (const w of C.W.inside.wall) { const t = L.toolById(w.id); const has = owned(w.id); w.real.visible = has; w.ghost.visible = !has; w.led.material.color.set(has ? 0x3aff7a : 0xff3a2a); const x = w.canvas.getContext('2d'); x.fillStyle = '#0c1014'; x.fillRect(0, 0, 256, 44); x.fillStyle = has ? '#8dff9a' : '#ffb07a'; x.font = '700 21px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      const txt = t.kind === 'orbit' ? (has ? 'ORBITALSCHLAG' : S.orbit.open ? 'REPARIEREN' : 'AB TAG 15') : !has && L.removed(S, C.A.vol) < t.need ? `AB ${L.fmt(t.need)} M³` : has ? (t.kind === 'hole' ? `${S.caps} KAPSELN` : t.kind === 'drones' ? `${S.swarmsOwned} SCHWÄRME` : t.name.toUpperCase()) : `${t.name.toUpperCase()} · ${L.cr(t.price)}`; x.fillText(txt, 128, 23, 244); w.tex.needsUpdate = true; }
  }
  function drawScreens() {
    const S = C.S; const A = C.A; const I = C.W.inside; const vol0 = S.vol0 || A.vol0; const goal = L.goalVol(vol0);
    // Terminal 03
    let c = I.term.canvas; let x = c.getContext('2d'); let w = c.width; let h = c.height; const g0 = x.createLinearGradient(0, 0, 0, h); g0.addColorStop(0, '#07202a'); g0.addColorStop(1, '#04121a'); x.fillStyle = g0; x.fillRect(0, 0, w, h);
    x.fillStyle = '#7fe3ea'; x.font = '800 38px Bahnschrift'; x.textAlign = 'left'; x.fillText('TERMINAL 03', 36, 62); x.fillStyle = '#8dff9a'; x.font = '700 30px Bahnschrift'; x.textAlign = 'right'; x.fillText(`● TAG ${Math.min(S.day, 90)}`, w - 36, 60);
    x.strokeStyle = '#1f6b78'; x.lineWidth = 3; x.strokeRect(30, 96, w - 60, 250); x.textAlign = 'left'; x.fillStyle = '#5fb7c0'; x.font = '700 26px Bahnschrift'; x.fillText('KASSE', 56, 142); x.fillStyle = '#ffd34a'; x.font = '900 120px Bahnschrift'; x.fillText(L.cr(S.purse), 52, 270);
    const nt = L.nextTool(S); x.fillStyle = '#5fb7c0'; x.font = '700 26px Bahnschrift'; if (nt) { x.fillText('NÄCHSTES WERKZEUG', 56, 404); x.fillStyle = '#eaf7f8'; x.font = '800 44px Bahnschrift'; x.fillText(nt.name, 56, 456); x.fillStyle = '#12303a'; x.fillRect(56, 478, w - 112, 20); x.fillStyle = '#3ae0ff'; x.fillRect(56, 478, (w - 112) * clamp(S.purse / nt.price, 0, 1), 20); x.fillStyle = '#7fe3ea'; x.font = '600 28px Bahnschrift'; const hv = L.removed(S, A.vol); x.fillText(hv < nt.need ? `ab ${L.fmt(nt.need)} m³ (noch ${L.fmt(nt.need - hv)} m³)` : S.purse >= nt.price ? 'Jetzt kaufen!' : `noch ${L.cr(nt.price - S.purse)}`, 56, 540); }
    x.fillStyle = '#ff8a2a'; x.fillRect(w - 330, h - 96, 294, 60); x.fillStyle = '#10161e'; x.font = '800 34px Bahnschrift'; x.textAlign = 'center'; x.fillText('E  ÖFFNEN', w - 183, h - 54); I.term.tex.needsUpdate = true;
    // Preistafel über der Erzannahme
    c = I.prices.canvas; x = c.getContext('2d'); w = c.width; h = c.height; x.fillStyle = '#0a1418'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff8a2a'; x.fillRect(0, 0, w, 10); x.fillStyle = '#eaf7f8'; x.font = '800 40px Bahnschrift'; x.textAlign = 'left'; x.fillText('ERZANNAHME', 24, 62); x.font = '600 21px Bahnschrift'; x.fillStyle = '#7fe3ea'; x.fillText('Preise je Kilogramm', 26, 92);
    L.ORES.slice(1).forEach((o, i) => { const y = 142 + i * 42; x.fillStyle = o.col; x.beginPath(); x.moveTo(40, y - 22); x.lineTo(54, y - 10); x.lineTo(40, y + 2); x.lineTo(26, y - 10); x.fill(); x.fillStyle = '#eaf7f8'; x.font = '700 28px Bahnschrift'; x.textAlign = 'left'; x.fillText(o.name, 70, y); x.textAlign = 'right'; x.fillStyle = '#ffd34a'; x.fillText(`${o.price} ₵`, w - 28, y); });
    x.textAlign = 'left'; x.fillStyle = '#8dff9a'; x.font = '600 21px Bahnschrift'; x.fillText(`Abgegeben: ${L.fmt(S.stats.sold)} kg`, 26, h - 20); I.prices.tex.needsUpdate = true;
    // Missionstafel
    c = I.board.canvas; x = c.getContext('2d'); w = c.width; h = c.height; x.fillStyle = '#06141a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ee7a18'; x.fillRect(0, 0, w, 12); x.textAlign = 'left'; x.fillStyle = '#7fe3ea'; x.font = '800 34px Bahnschrift'; x.fillText('MISSION BIG BRUNO', 36, 62); x.textAlign = 'right'; x.fillStyle = S.day >= 80 ? '#ff6a4a' : '#eaf7f8'; x.fillText(`TAG ${Math.min(S.day, 90)} VON 90`, w - 36, 62);
    const late = A.vol > L.sollVol(vol0, L.dayF(S)) * 1.01; x.textAlign = 'left'; x.fillStyle = late ? '#ff4a3a' : '#f4f6fa'; x.font = '900 96px Bahnschrift'; x.fillText(L.fmt(A.vol), 36, 176); const tw = x.measureText(L.fmt(A.vol)).width; x.fillStyle = '#9fb0c8'; x.font = '700 34px Bahnschrift'; x.fillText('m³ übrig', 52 + tw, 172);
    x.font = '600 24px Bahnschrift'; x.fillStyle = '#9fb0c8'; x.fillText(`Verglühgrenze ${L.fmt(goal)} m³ · Soll heute ${L.fmt(L.sollVol(vol0, L.dayF(S)))} m³ · ${late ? 'ZU LANGSAM' : 'IM PLAN'}`, 38, 214);
    const gx = 60; const gy = 250; const gw = w - 120; const gh = h - 310; x.strokeStyle = '#1f4a56'; x.lineWidth = 2; x.strokeRect(gx, gy, gw, gh); const X = (d) => gx + (d - 1) / 90 * gw; const Y = (v) => gy + gh - v / vol0 * gh;
    x.setLineDash([10, 8]); x.strokeStyle = '#3ae0ff'; x.beginPath(); for (let d = 1; d <= 91; d += 2) { const px = X(d); const py = Y(L.sollVol(vol0, d)); if (d === 1) x.moveTo(px, py); else x.lineTo(px, py); } x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#ffd34a'; x.lineWidth = 2; x.beginPath(); x.moveTo(gx, Y(goal)); x.lineTo(gx + gw, Y(goal)); x.stroke(); x.fillStyle = '#ffd34a'; x.font = '600 20px Bahnschrift'; x.fillText('Verglühgrenze', gx + 8, Y(goal) - 8);
    x.strokeStyle = late ? '#ff5a3a' : '#8dff9a'; x.lineWidth = 5; x.beginPath(); x.moveTo(X(1), Y(vol0)); (S.hist || []).forEach((v, i) => x.lineTo(X(i + 2), Y(v))); x.lineTo(X(L.dayF(S)), Y(A.vol)); x.stroke(); x.fillStyle = x.strokeStyle; x.beginPath(); x.arc(X(L.dayF(S)), Y(A.vol), 8, 0, 7); x.fill();
    x.fillStyle = '#9fb0c8'; x.font = '600 20px Bahnschrift'; x.textAlign = 'center'; for (const d of [1, 15, 30, 45, 60, 75, 90]) x.fillText('Tag ' + d, X(d), gy + gh + 28); x.textAlign = 'left'; x.fillStyle = '#3ae0ff'; x.fillText('- - Soll', gx + gw - 250, gy + 30); x.fillStyle = '#8dff9a'; x.fillText('— Ihr', gx + gw - 110, gy + 30); I.board.tex.needsUpdate = true;
    // Orbit-Konsole
    c = I.orbit.canvas; x = c.getContext('2d'); w = c.width; h = c.height; x.fillStyle = '#150a0a'; x.fillRect(0, 0, w, h); x.textAlign = 'left'; x.fillStyle = '#ff6a4a'; x.font = '800 34px Bahnschrift'; x.fillText('ORBITALLASER', 22, 52); x.font = '800 44px Bahnschrift'; x.fillStyle = S.orbit.ready > 0 ? '#8dff9a' : '#ffb07a'; x.fillText(!S.orbit.unlocked ? (S.orbit.open ? 'KAPUTT' : 'GESPERRT') : S.orbit.ready > 0 ? 'BEREIT' : 'LÄDT BIS MORGEN', 22, 122); x.fillStyle = '#c8b0a8'; x.font = '600 24px Bahnschrift'; x.fillText(`Stufe ${(S.up.orbit || 0) + 1} · Radius ${L.upVal(S, 'orbit')} m`, 22, 172); x.fillText('Zielen draußen mit Taste 7 · E: Ausbau', 22, 212); I.orbit.tex.needsUpdate = true;
  }

  // ---------------- Anzeige ----------------
  function toast(text, kind = '') { const t = $('bbToast'); t.textContent = text; t.className = 'bb-toast on ' + kind; C.toastT = 4; }
  function fade(sec) { $('bbFade').classList.add('on'); C.fadeT = sec; }
  function showSold(value, cargo) { $('bbSoldV').textContent = '+' + L.cr(value); const box = $('bbSoldL'); box.textContent = ''; for (let i = 1; i < L.ORES.length; i++) { const o = L.ORES[i]; const k = cargo[o.id] || 0; if (k < 0.05) continue; const d = el('span'); const g = el('i'); g.style.background = o.col; d.append(g, el('b', '', `${k.toFixed(1).replace('.', ',')} kg`), el('small', '', o.name)); box.append(d); } const s = $('bbSold'); s.classList.remove('hidden'); s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); C.soldT = 4.2; }
  function msgTick(dt) { if (!C.msg && C.msgQ.length && !story.on) { C.msg = { ...C.msgQ.shift(), t: 0 }; $('bbMsgH').textContent = C.msg.head; $('bbMsgT').textContent = C.msg.text; $('bbMsg').classList.remove('hidden'); sfx('msg'); } if (C.msg) { C.msg.t += dt; if (C.msg.t > 13) { C.msg = null; $('bbMsg').classList.add('hidden'); } } }
  const DIG = []; function setCounter(n) { const box = $('bbCount'); if (!DIG.length) { box.textContent = ''; for (let i = 0; i < 7; i++) { const d = el('span', 'bb-dig'); box.append(d); DIG.push(d); } } const str = Math.max(0, Math.round(n)).toLocaleString('de-DE').replace(/\./g, ' ').padStart(7, ' '); for (let i = 0; i < 7; i++) { const ch = str[str.length - 7 + i] || ' '; if (DIG[i].textContent !== ch) { DIG[i].textContent = ch; DIG[i].classList.remove('roll'); void DIG[i].offsetWidth; if (ch.trim()) DIG[i].classList.add('roll'); } DIG[i].classList.toggle('sp', ch === ' '); } }
  function refreshHud(force) {
    const S = C.S; const A = C.A; if (!S || !A) return; const vol = A.vol; const vol0 = S.vol0 || A.vol0; const soll = L.sollVol(vol0, L.dayF(S)); const goal = L.goalVol(vol0); const late = vol > soll * 1.01;
    $('bbDay').textContent = S.day > L.DAYS ? 'VORBEI' : S.day === L.DAYS ? 'TAG 90 · DER LETZTE' : `TAG ${S.day}`; $('bbDay').classList.toggle('last', S.day >= L.DAYS);
    setCounter(vol); $('bbCount').classList.toggle('late', late); $('bbGoal').textContent = `Verglühgrenze ${L.fmt(goal)} m³ · Soll heute ${L.fmt(soll)} m³`; $('bbClockF').style.width = (clamp(S.t / L.DAY_SEC, 0, 1) * 100).toFixed(1) + '%';
    $('bbPurse').textContent = L.cr(S.purse); const cap = L.upVal(S, 'sack'); const kg = L.cargoKg(C.cargo); $('bbCargoT').textContent = `${kg.toFixed(1).replace('.', ',')} / ${cap} kg · ${L.cr(L.oreValue(C.cargo))}`; $('bbCargoF').style.width = (clamp(kg / cap, 0, 1) * 100).toFixed(1) + '%'; $('bbCargo').classList.toggle('full', kg >= cap - 0.05);
    const ac = L.upVal(S, 'luft'); const air = C.me.inShip ? ac : C.me.air; $('bbAirT').textContent = C.me.inShip ? 'voll (im Schiff)' : `${Math.ceil(Math.max(0, air))} s`; $('bbAirF').style.width = (clamp(air / ac, 0, 1) * 100).toFixed(1) + '%'; $('bbAir').classList.toggle('low', !C.me.inShip && air < 30);
    const big = !C.me.inShip && air < 30; $('bbAirBig').classList.toggle('hidden', !big); if (big) { const s = Math.max(0, Math.ceil(air)); $('bbAirBigT').textContent = `0:${String(s).padStart(2, '0')}`; $('bbAirBigF').style.width = (clamp(air / 30, 0, 1) * 100).toFixed(0) + '%'; }
    // Rang: abgebaute m³ vom ganzen Team, Balken bis zum nächsten Rang; beim Aufstieg Meldung, was jetzt frei ist
    const hv = L.removed(S, vol); const rk = L.rankOf(hv); const lo = rk.need; const hi = rk.next ? rk.next.need : lo; $('bbRankT').textContent = rk.next ? `${rk.name} · ${L.fmt(hv)} / ${L.fmt(hi)} m³` : `${rk.name} · ${L.fmt(hv)} m³`; $('bbRankF').style.width = (rk.next ? clamp((hv - lo) / (hi - lo), 0, 1) * 100 : 100).toFixed(1) + '%';
    if (C.rankI === undefined || C.rankI > rk.i) C.rankI = rk.i; else if (rk.i > C.rankI) { C.rankI = rk.i; const un = rk.unlocks.map((t) => t.name).join(', '); toast(`Neuer Rang: ${rk.name}!` + (un ? ` Freigeschaltet: ${un} (${rk.unlocks.some((t) => t.kind === 'orbit') ? 'an der Orbit-Konsole, ab Tag 15' : 'am Terminal'}).` : ''), 'gold'); sfx('rank'); const g = $('bbRank'); g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
    // Aufgabe oben rechts: erste, die noch nicht erledigt ist
    const x = { mine: C.mine, cargo: kg, inShip: C.me.inShip, out: C.wasOut, vol, vol0 }; if (vol0 - vol > 60) x.mine = Math.max(x.mine, 2);
    let qi = L.QUESTS.findIndex((q) => !q.done(S, x)); if (qi < 0) qi = L.QUESTS.length - 1; if (qi !== C.quest) { if (C.quest >= 0 && qi > C.quest) sfx('quest'); C.quest = qi; const q = L.QUESTS[qi]; $('bbQuestN').textContent = `Aufgabe ${qi + 1} von ${L.QUESTS.length}`; $('bbQuestT').textContent = q.t; $('bbQuestD').innerHTML = q.d; const g = $('bbQuest'); g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
    if (force) renderBar();
  }
  function renderBar() {
    const S = C.S; if (!S) return; const box = $('bbBar'); box.textContent = '';
    for (const t of L.TOOLS) { const d = el('div', 'bb-slot' + (owned(t.id) ? '' : ' off') + (C.tool === t.id ? ' sel' : '')); const img = el('img'); img.src = C.icons[ICON[t.id]] || ''; img.alt = ''; d.append(img, el('kbd', '', String(t.key)), el('b', '', t.short || t.name));
      if (t.kind === 'hole' && S.owned.loch) d.append(el('small', '', `${S.caps} Kapseln`)); if (t.kind === 'charge' && S.owned[t.id]) d.append(el('small', '', `${(S.ammo || {})[t.id] || 0} Stück`)); if (t.kind === 'drones' && S.swarmsOwned) d.append(el('small', '', `${S.swarms.length} / ${S.swarmsOwned} draußen`)); if (t.kind === 'orbit' && S.orbit.unlocked) d.append(el('small', '', S.orbit.ready > 0 ? 'bereit' : 'lädt')); d.onclick = () => selectTool(t.id); box.append(d); }
  }
  // ---------------- Fenster: Terminal, Orbit-Konsole, Pause, Spielstände ----------------
  const PANELS = { term: 'bbTerm', orbit: 'bbOrbitUI', pause: 'bbPause' };
  function unlock() { if (document.pointerLockElement === canvas) { C.lockQuiet = true; document.exitPointerLock(); setTimeout(() => { C.lockQuiet = false; }, 200); } }
  function lock() { if (document.pointerLockElement !== canvas) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* egal */ } } }
  function openUI(k) { unlock(); C.lmb = false; C.ui = k; for (const [key, id] of Object.entries(PANELS)) $(id).classList.toggle('hidden', k !== key); renderUI(); sfx('open'); }
  function closeUI() { C.ui = null; for (const id of Object.values(PANELS)) $(id).classList.add('hidden'); }
  const stat = (t) => (t.kind === 'hit' ? `Loch ${String(t.r * 2).replace('.', ',')} m · Schlag alle ${String(t.cd).replace('.', ',')} s` : t.kind === 'drill' ? 'Dauerbetrieb · 3,8 m Reichweite' : t.kind === 'beam' ? 'Dauerstrahl · 28 m Reichweite' : t.kind === 'drones' ? `gräbt ${L.fmt(L.SWARM_CAP)} m³ je Einsatz` : t.kind === 'hole' ? `frisst eine Kugel mit ${t.r * 2} m` : t.kind === 'charge' ? `Krater ${String(t.r * 2).replace('.', ',')} m · ${t.pack} je Kauf` : t.kind === 'shot' ? `Krater ${String(t.r * 2).replace('.', ',')} m · ${t.range} m weit` : 'einmal am Tag');
  function renderUI() {
    const S = C.S; if (!S) return;
    if (C.ui === 'term') {
      $('bbTDay').textContent = `● TAG ${Math.min(S.day, 90)}`; $('bbTPurse').textContent = L.cr(S.purse); $('bbTBonus').textContent = `Prämie heute Abend: +${L.cr(S.today * L.PRAEMIE)} (für ${L.fmt(S.today)} m³)`;
      const cb = $('bbTCargo'); cb.textContent = ''; const kg = L.cargoKg(C.cargo); for (let i = 1; i < L.ORES.length; i++) { const o = L.ORES[i]; const k = C.cargo[o.id] || 0; const r = el('div', 'bb-orow' + (k > 0.05 ? '' : ' none')); const g = el('i'); g.style.background = o.col; r.append(g, el('span', '', o.name), el('em', '', `${k.toFixed(1).replace('.', ',')} kg`), el('b', '', L.cr(k * o.price))); cb.append(r); }
      $('bbTHint').textContent = kg > 0.05 ? `Im Rucksack: ${L.cr(L.oreValue(C.cargo))}. An der Erzannahme abgeben (oranger Trichter nebenan, E).` : 'Rucksack leer. Erz gibt es draußen: blaues Eis, rotes Eisenerz, Goldadern.';
      const nt = L.nextTool(S); $('bbTNext').textContent = nt ? nt.name : 'Alles gekauft'; $('bbTNextF').style.width = (nt ? clamp(S.purse / nt.price, 0, 1) * 100 : 100) + '%'; const hv = L.removed(S, C.A.vol); $('bbTNextT').textContent = nt ? (hv < nt.need ? `Ab ${L.fmt(nt.need)} m³ abgebaut (noch ${L.fmt(nt.need - hv)} m³)` : S.purse >= nt.price ? 'Genug Credits: jetzt kaufen!' : `noch ${L.cr(nt.price - S.purse)}`) : '';
      $('bbTStats').textContent = `Abgebaut ${L.fmt((S.vol0 || 0) - C.A.vol)} m³ · abgegeben ${L.fmt(S.stats.sold)} kg · verdient ${L.cr(S.stats.earned)}`;
      for (const b of document.querySelectorAll('#bbTermTabs button')) b.classList.toggle('sel', b.dataset.tab === C.termTab); const box = $('bbTermBody'); box.textContent = '';
      if (C.termTab === 'tools') {
        for (const t of [...L.TOOLS].sort((a, b) => a.need - b.need)) { const orbit = t.kind === 'orbit'; const multi = t.kind === 'hole' || t.kind === 'drones' || t.kind === 'charge'; const has = owned(t.id); const full = t.kind === 'drones' && S.swarmsOwned >= L.MAX_SWARMS; const rank = hv >= t.need; const can = S.purse >= t.price && rank;
          const card = el('div', 'bb-tool' + (has ? ' owned' : '') + (!has && !can && !orbit ? ' cant' : '')); card.dataset.card = t.id; const pc = el('div', 'pic'); const img = el('img'); img.src = C.icons[ICON[t.id]] || ''; img.alt = ''; pc.append(img, el('kbd', '', String(t.key))); card.append(pc, el('b', '', t.name), el('p', '', t.desc), el('small', '', stat(t)));
          const foot = el('div', 'foot'); if (orbit) foot.append(el('span', 'tag' + (has ? ' ok' : ''), has ? 'REPARIERT' : !S.orbit.open ? 'AB TAG 15' : !rank ? `AB ${L.fmt(t.need)} m³` : 'IM MASCHINENRAUM'));
          else if (!rank && !has) foot.append(el('span', 'tag', `AB ${L.fmt(t.need)} m³`));
          else { if (has) foot.append(el('span', 'tag ok', multi ? (t.kind === 'hole' ? `${S.caps} im Lager` : t.kind === 'charge' ? `${(S.ammo || {})[t.id] || 0} im Lager` : `${S.swarmsOwned} / ${L.MAX_SWARMS}`) : 'GEKAUFT')); if (!has || (multi && !full)) { const b = el('button', can ? 'buy' : 'buy no', (multi && has ? (t.kind === 'charge' && t.pack > 1 ? `+${t.pack} · ` : '+1 · ') : '') + L.cr(t.price)); b.type = 'button'; b.dataset.buy = t.id; b.onclick = () => { C.lastBuy = t.id; act({ k: 'buy', id: t.id }); }; foot.append(b); } }
          card.append(foot); box.append(card); }
      } else {
        for (const u of L.UPGRADES) { if (u.id === 'orbit') continue; const lv = S.up[u.id] || 0; const nx = u.lv[lv + 1]; const can = nx && S.purse >= nx.price; const card = el('div', 'bb-tool up' + (!nx ? ' owned' : !can ? ' cant' : '')); card.dataset.card = u.id; const pips = el('div', 'pips'); u.lv.forEach((_, i) => pips.append(el('i', i <= lv ? 'on' : '')));
          card.append(el('div', 'upic', u.id === 'sack' ? '🎒' : u.id === 'luft' ? 'O₂' : '🥾'), el('b', '', u.name), pips, el('p', '', `Jetzt: ${L.fmt(u.lv[lv].v)} ${u.unit}` + (nx ? ` → danach ${L.fmt(nx.v)} ${u.unit}` : '')), el('small', '', u.id === 'sack' ? 'Mehr Erz je Ausflug.' : u.id === 'luft' ? 'Länger draußen bleiben.' : 'Höher und weiter springen.'));
          const foot = el('div', 'foot'); if (!nx) foot.append(el('span', 'tag ok', 'GANZ AUSGEBAUT')); else { const b = el('button', can ? 'buy' : 'buy no', L.cr(nx.price)); b.type = 'button'; b.dataset.buy = u.id; b.onclick = () => { C.lastBuy = u.id; act({ k: 'buy', id: u.id }); }; foot.append(b); } card.append(foot); box.append(card); }
      }
    }
    if (C.ui === 'orbit' && !S.orbit.unlocked) { const box = $('bbOrbitBody'); box.textContent = ''; const t = L.toolById('orbit'); const hv = L.removed(S, C.A.vol); const rank = hv >= t.need; box.append(el('p', '', `Die Schiffswaffe ist beim Anflug kaputtgegangen. Reparieren geht ab Rang „${L.rankOf(t.need).name}“ (${L.fmt(t.need)} m³ abgebaut, ihr habt ${L.fmt(hv)}) und kostet ${L.cr(t.price)}.`)); const fix = el('button', rank && S.purse >= t.price ? 'primary' : '', rank ? `Reparieren · ${L.cr(t.price)}` : `Noch ${L.fmt(t.need - hv)} m³`); fix.type = 'button'; fix.id = 'bbOrbitFix'; fix.disabled = !rank; fix.onclick = () => { C.lastBuy = 'orbit'; act({ k: 'buy', id: 'orbit' }); }; box.append(fix); }
    if (C.ui === 'orbit' && S.orbit.unlocked) { const box = $('bbOrbitBody'); box.textContent = ''; const u = L.upById('orbit'); const lv = S.up.orbit || 0; const nx = u.lv[lv + 1]; box.append(el('p', '', S.orbit.ready > 0 ? 'Der Orbitallaser ist geladen. Mit der Zielkamera von oben zielen, oder draußen mit Taste 7.' : 'Der Orbitallaser lädt. Morgen früh ist er wieder bereit.')); const go = el('button', 'primary', 'Zielkamera öffnen'); go.type = 'button'; go.id = 'bbOrbitGo'; go.onclick = () => { closeUI(); orbitView(true); }; box.append(go); const row = el('div', 'bb-item'); const a = el('div'); a.append(el('b', '', `Stufe ${lv + 1}: Radius ${u.lv[lv].v} m`), el('small', '', nx ? `Stufe ${lv + 2}: Radius ${nx.v} m${nx.need ? ` · ab ${L.fmt(nx.need)} m³` : ''}` : 'Ganz ausgebaut.')); const btn = el('button', nx && S.purse >= nx.price ? 'primary' : '', nx ? L.cr(nx.price) : 'fertig'); btn.type = 'button'; btn.disabled = !nx; btn.onclick = () => { C.lastBuy = 'orbit'; act({ k: 'buy', id: 'orbit', up: true }); }; row.append(a, btn); box.append(row); }
  }
  for (const b of document.querySelectorAll('#bbTermTabs button')) b.onclick = () => { C.termTab = b.dataset.tab; renderUI(); sfx('open'); };
  $('bbTermClose').onclick = () => closeUI(); $('bbOrbitClose').onclick = () => closeUI();
  $('bbResume').onclick = () => closeUI(); $('bbHelp').onclick = () => { closeUI(); tour.show(); }; $('bbIntro').onclick = () => { closeUI(); story.play('intro'); }; $('bbQuit').onclick = () => { closeUI(); back(); };
  $('bbRestart').onclick = async () => { if (!isHost() || !C.slot) return; const b = $('bbRestart'); if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Wirklich? Alles fängt bei Tag 1 an'; return; } delete b.dataset.sure; b.textContent = 'Nochmal von vorn'; closeUI(); const S = L.newSave(); S.introSeen = true; saves.save(C.slot, S); await gridDel(C.slot); await loadSlot(C.slot); begin(); pushState(); sendGrid(); };
  function removeSlot(id) { saves.remove(id); gridDel(id); } // Löschen im Startbildschirm: Werte und Raster
  async function openSlot(id) { hud.classList.remove('bb-menu'); C.net = null; C.host = true; await enterAsync(); await loadSlot(id); begin(); flush(); }
  function back() { if (C.net) { stop(); endSession(); return; } stop(); showScreen('gallery'); }
  function storyEnd(kind) { if (kind === 'intro') afterIntro(); if ((kind === 'won' || kind === 'lost') && C.on) toast(kind === 'won' ? 'Die Erde ist gerettet! Ihr dürft weiter abbauen.' : 'Big Bruno ist eingeschlagen. Im Pausemenü (Esc): Nochmal von vorn.', kind === 'won' ? 'gold' : 'bad'); }

  // ---------------- Eingabe ----------------
  const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyR', 'Space', 'ShiftLeft', 'ShiftRight', 'Escape', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Tab']);
  window.addEventListener('keydown', (e) => {
    if (!C.on || (e.target && e.target.tagName === 'INPUT')) return; if (!KEYS.has(e.code)) return; e.preventDefault(); e.stopImmediatePropagation();
    if (story.on) { if (!e.repeat) story.key(e.code); return; } if (tour.open) { if (e.code === 'Escape') tour.close(); return; }
    if (C.orb && !C.ui) { if ((e.code === 'KeyE' || e.code === 'Escape') && !e.repeat) orbitView(false); return; }
    if (e.code === 'Escape') { if (C.ui) closeUI(); else openUI('pause'); return; }
    if (C.ui) { if (e.code === 'KeyE' && !e.repeat && C.ui !== 'pause') closeUI(); return; } C.keys[e.code] = true; if (e.repeat) return;
    if (e.code === 'KeyE') interact(); const d = /^Digit(\d)$/.exec(e.code); if (d) { const t = L.TOOLS.find((q) => q.key === Number(d[1])); if (t) { if (owned(t.id)) selectTool(t.id); else { const hv = L.removed(C.S, C.A.vol); toast(t.kind === 'orbit' ? (C.S.orbit.open ? `Schiffswaffe ist kaputt: ab ${L.fmt(t.need)} m³ an der Orbit-Konsole reparieren.` : 'Der Orbitalschlag kommt frühestens ab Tag 15.') : hv < t.need ? `${t.name}: ab Rang „${L.rankOf(t.need).name}“ (${L.fmt(t.need)} m³), dann am Terminal kaufen.` : `${t.name} gibt es am Terminal im Schiff.`, 'bad'); } } }
  }, true);
  window.addEventListener('keyup', (e) => { if (!C.on) return; C.keys[e.code] = false; if (KEYS.has(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('blur', () => { C.keys = {}; C.lmb = false; });
  canvas.addEventListener('mousedown', (e) => { if (!C.on || C.loading) return; if (story.on) { story.next(); return; } if (C.ui || tour.open) return; audio.init(); if (document.pointerLockElement !== canvas) lock(); if (e.button === 0) C.lmb = true; });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) C.lmb = false; });
  window.addEventListener('mousemove', (e) => { if (!C.on || document.pointerLockElement !== canvas || C.ui) return; const s = 0.0022 * (settings.mouse || 1); if (C.orb) { C.orb.ax = clamp(C.orb.ax + e.movementX * s * 0.55, -1.15, 1.15); C.orb.az = clamp(C.orb.az + e.movementY * s * 0.55, -1.15, 1.15); return; } const m = C.me; const up = upOf(m.p, _up); m.fwd.applyAxisAngle(up, -e.movementX * s); m.pitch = clamp(m.pitch - e.movementY * s, -1.45, 1.45); });
  canvas.addEventListener('wheel', (e) => { if (C.on && !C.ui && !story.on) cycleTool(e.deltaY > 0 ? 1 : -1); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { const locked = document.pointerLockElement === canvas; if (!locked && C.on && C.orb && !C.lockQuiet) { orbitView(false); return; } if (!locked && C.on && !C.ui && !C.lockQuiet && !tour.open && !story.on && !C.loading) openUI('pause'); });

  // ---------------- Geräusche (synthetisch, über das Mischpult: Kanal bruno.*) ----------------
  function sfx(k, a = 1) {
    if (!audio.ready || !audio.ctx || audio.ctx.state !== 'running') return; const c = audio.ctx; const out = audio.out ? audio.out('bruno.' + (['hit', 'gold', 'ice', 'miss', 'swing', 'hole', 'orbit', 'arm', 'throw', 'boom', 'plasma'].includes(k) ? 'abbau' : 'signal')) : audio.master; const t0 = c.currentTime;
    const tone = (f, f2, dur, type = 'sine', vol = 0.05, at = 0) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0 + at); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + at + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur); o.connect(g); g.connect(out); o.start(t0 + at); o.stop(t0 + at + dur + 0.02); };
    const noise = (f, f2, dur, vol = 0.05, type = 'bandpass', at = 0) => { if (!audio.noiseBuf) return; const s = c.createBufferSource(); s.buffer = audio.noiseBuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t0 + at); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + at + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0 + at); g.gain.linearRampToValueAtTime(vol, t0 + at + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur); s.connect(fl); fl.connect(g); g.connect(out); s.start(t0 + at, Math.random()); s.stop(t0 + at + dur + 0.02); };
    if (k === 'hit') { noise(900 * a, 300, 0.2, 0.13 * a, 'lowpass'); tone(130, 55, 0.16, 'triangle', 0.09 * a); noise(3000, 1500, 0.06, 0.03); }
    else if (k === 'gold') { noise(900, 300, 0.18, 0.1, 'lowpass'); tone(1320, null, 0.25, 'sine', 0.04); tone(1760, null, 0.3, 'sine', 0.03, 0.06); }
    else if (k === 'ice') { noise(900, 300, 0.16, 0.09, 'lowpass'); for (let i = 0; i < 4; i++) tone(2200 + Math.random() * 1800, null, 0.09, 'sine', 0.02, i * 0.03); }
    else if (k === 'miss' || k === 'swing') noise(2400, 900, 0.12, 0.025);
    else if (k === 'jump') tone(180, 420, 0.18, 'sine', 0.04);
    else if (k === 'coin' || k === 'buy') { for (const [f, at] of [[1046, 0], [1568, 0.07], [2093, 0.13]]) tone(f, null, 0.22, 'sine', 0.05, at); }
    else if (k === 'pour') { for (let i = 0; i < 9; i++) noise(700 + Math.random() * 900, 300, 0.09, 0.05, 'bandpass', i * 0.11); }
    else if (k === 'clack') noise(1200 + Math.random() * 1400, 500, 0.05, 0.03);
    else if (k === 'error') { tone(190, 150, 0.17, 'square', 0.03); }
    else if (k === 'warn') { tone(880, null, 0.1, 'square', 0.03); tone(880, null, 0.1, 'square', 0.03, 0.18); }
    else if (k === 'beam') { noise(300, 3200, 0.9, 0.08); tone(220, 880, 0.9, 'sine', 0.035); }
    else if (k === 'msg') { tone(660, null, 0.09, 'sine', 0.04); tone(990, null, 0.12, 'sine', 0.04, 0.1); }
    else if (k === 'quest') { tone(880, null, 0.1, 'sine', 0.04); tone(1175, null, 0.16, 'sine', 0.04, 0.08); }
    else if (k === 'day') { for (const [f, at] of [[523, 0], [659, 0.1], [784, 0.2]]) tone(f, null, 0.3, 'triangle', 0.05, at); }
    else if (k === 'throw') noise(1600, 500, 0.25, 0.04);
    else if (k === 'arm') { for (let i = 0; i < 5; i++) tone(520, null, 0.08, 'triangle', 0.035, i * 0.5 * Math.pow(0.82, i)); } // vorher 1400-Hz-Rechteck: zu schrill
    else if (k === 'hole') { tone(90, 28, 2.6, 'sawtooth', 0.05); noise(200, 2600, 2.4, 0.12); }
    else if (k === 'orbit') { noise(3200, 140, 1.3, 0.22); tone(330, 40, 1.2, 'sawtooth', 0.05); }
    else if (k === 'boom') { noise(500, 40, 1.6, 0.3 * a, 'lowpass'); tone(60, 24, 1.4, 'sine', 0.24 * a); noise(2400, 300, 0.4, 0.1 * a); }
    else if (k === 'open') tone(420, 760, 0.1, 'triangle', 0.04);
    else if (k === 'plasma') { tone(1100, 180, 0.24, 'sawtooth', 0.03); noise(2600, 500, 0.18, 0.05); }
    else if (k === 'rank') { for (const [f, at] of [[523, 0], [784, 0.09], [1046, 0.18], [1568, 0.3]]) tone(f, null, 0.28, 'triangle', 0.05, at); }
  }
  let loop = null; function toolLoop() { // Bohrer/Laser brummen, solange sie laufen
    if (!audio.ready || !audio.ctx || audio.ctx.state !== 'running') return; const c = audio.ctx; const want = C.drill && C.on ? (L.toolById(C.tool).kind === 'beam' ? 'laser' : 'drill') : null;
    // Laser (2026-11-13, Lennox: „der hohe Ton ist übelst nervig“): statt 620-Hz-Sägezahn ein tiefes Plasma-Brummen, zwei leicht verstimmte Sägezähne
    // bei 98 Hz durch einen Tiefpass, dessen Grenze langsam wabert (wwomm-wwomm). Bohrer klingt wie vorher (Filter offen, zweiter Ton stumm).
    if (!loop && want) { const o = c.createOscillator(); const o2 = c.createOscillator(); const g2 = c.createGain(); const fl = c.createBiquadFilter(); const g = c.createGain(); o.type = 'sawtooth'; o2.type = 'sawtooth'; g2.gain.value = 0; fl.type = 'lowpass'; fl.frequency.value = 8000; fl.Q.value = 0.7; g.gain.value = 0; o.connect(fl); o2.connect(g2); g2.connect(fl); fl.connect(g); g.connect(audio.out ? audio.out('bruno.abbau') : audio.master); o.start(); o2.start(); loop = { o, o2, g2, fl, g }; }
    if (loop) { const laser = want === 'laser'; const t = c.currentTime; const f = laser ? 98 : want === 'drill' ? 140 + Math.random() * 25 : 100; loop.o.frequency.setTargetAtTime(f, t, 0.03); loop.o2.frequency.setTargetAtTime(f * 1.012, t, 0.03); loop.g2.gain.setTargetAtTime(laser ? 0.8 : 0, t, 0.05);
      loop.fl.frequency.setTargetAtTime(laser ? 520 + Math.sin(C.t * 6.5) * 260 : 8000, t, 0.04); loop.fl.Q.setTargetAtTime(laser ? 7 : 0.7, t, 0.05); loop.g.gain.setTargetAtTime(want ? (laser ? 0.05 : 0.03) : 0, t, 0.05); }
  }

  // ---------------- Mehrspieler ----------------
  function flush() { C.loading = false; const q = C.queue || []; C.queue = []; for (const [f, m] of q) message(f, m); }
  function sendGrid(to) { if (!C.net || !C.host || !C.A) return; const parts = V.packChunks(C.A).split(';').filter(Boolean); const n = Math.max(1, Math.ceil(parts.length / 40)); for (let i = 0; i < n; i++) { const m = { t: 'bG', i, n, g: parts.slice(i * 40, (i + 1) * 40).join(';') }; if (to) C.net.sendTo(to, m); else C.net.broadcast(m); } }
  async function startCoop({ net, host, slot }) { // slot: in der Lobby gewählter Spielstand
    C.net = net; C.host = host; hud.classList.remove('bb-menu'); await enterAsync(); if (C.net !== net) { C.loading = false; return; }
    if (host) { const id = (slot && saves.get(slot) ? slot : null) || saves.last() || saves.create('Online-Einsatz'); await loadSlot(id); begin(); setTimeout(() => { pushState(); sendGrid(); }, 300); flush(); }
    else { C.loading = true; showLoad(true, 'Warte auf Big Bruno vom Host …'); }
  }
  async function clientInit(S) { // Mitspieler: Asteroid aus dem Startwert erzeugen, danach kommen die geänderten Blöcke
    C.initing = true; C.S = L.fixSave(S); showLoad(true, 'Big Bruno wird vermessen …'); await nextPaint(); setAsteroid(S.seed, ''); showLoad(false); C.S.introSeen = true; begin(); C.initing = false; C.loading = false;
    const q = C.queue; C.queue = []; for (const [f, m] of q) message(f, m);
  }
  function message(from, m) {
    if (!C.net) return;
    if (m.t === 'bS' && !C.host && (!C.A || C.A.seed !== m.S.seed)) { if (!C.initing) clientInit(m.S); return; }
    if (C.loading || C.initing || !C.A) { C.queue.push([from, m]); return; }
    if (m.t === 'bS' && !C.host) { const keepIntro = C.S.introSeen; C.S = L.fixSave(m.S); C.S.introSeen = keepIntro; refreshHud(false); if (C.ui) renderUI(); return; }
    if (m.t === 'bG' && !C.host) { V.unpackChunks(C.A, m.g); return; }
    if (m.t === 'bd') { for (const o of m.o || []) { if (m.d) droneDig(m.d, o); else anyDig(o[0], o[1], o[2], o[3], KINDS[o[4]] || 'remote'); } if (C.host && from !== myId()) C.net.broadcast(m, from); return; }
    if (m.t === 'bdo' && C.host) { doAct(from, m.a); return; }
    if (m.t === 'bres') { result(m.r, m.a); return; }
    if (m.t === 'bev') { onEvent(m.ev); return; }
    if (m.t === 'bp') { if (C.host) C.net.broadcast({ ...m, id: from }, from); const id = m.id || from; if (id === myId()) return; let r = C.remotes.get(id); if (!r) { r = { b: buildBuddy(C.W.scene, seatOf(id)), p: V3(), f: V3(0, 0, -1), tp: V3(), tf: V3(0, 0, -1), sp: 0, inShip: false }; C.remotes.set(id, r); } r.tp.fromArray(m.p); r.tf.fromArray(m.f); r.inShip = !!m.i; r.sp = m.s || 0; }
  }
  function playerJoined(id, name) { if (!C.host) return; C.net.sendTo(id, { t: 'start', mode: 'bruno' }); setTimeout(() => { if (!C.net) return; C.net.sendTo(id, { t: 'bS', S: C.S }); sendGrid(id); }, 400); toast(`${name || 'Jemand'} landet auf Big Bruno.`); }
  function playerLeft(id) { const r = C.remotes.get(id); if (r) { C.W.scene.remove(r.b.holder); C.remotes.delete(id); } }
  function netTick(dt) {
    if (!C.net) return; C.netT = (C.netT || 0) + dt; if (C.netT < NET_HZ) return; C.netT = 0; const m = C.me;
    if (C.outOps.length) { const msg = { t: 'bd', o: C.outOps.splice(0, 60) }; if (C.host) C.net.broadcast(msg); else C.net.send(msg); }
    const pm = { t: 'bp', p: [+m.p.x.toFixed(2), +m.p.y.toFixed(2), +m.p.z.toFixed(2)], f: [+m.fwd.x.toFixed(3), +m.fwd.y.toFixed(3), +m.fwd.z.toFixed(3)], i: m.inShip ? 1 : 0, s: +(m.moving || 0).toFixed(1) }; if (C.host) C.net.broadcast({ ...pm, id: myId() }); else C.net.send(pm);
    if (C.host && (C.stT = (C.stT || 0) + NET_HZ) > 1) { C.stT = 0; pushState(); }
  }
  function remotesTick(dt) {
    for (const r of C.remotes.values()) { r.p.lerp(r.tp, 1 - Math.exp(-dt * 10)); r.f.lerp(r.tf, 1 - Math.exp(-dt * 10)).normalize(); const up = r.inShip ? V3(0, 1, 0) : V3().copy(r.p).normalize(); const fw = V3().copy(r.f).addScaledVector(up, -r.f.dot(up)).normalize(); const right = V3().crossVectors(fw, up).normalize(); _m4.makeBasis(right, up, fw); r.b.holder.quaternion.setFromRotationMatrix(_m4); r.b.holder.position.copy(r.p); r.b.pose({ speed: r.sp, scrub: false }, dt); }
  }

  // ---------------- Host: Zeit, Nachrichten, Ende ----------------
  function hostTick(dt) {
    const S = C.S; const A = C.A; if (story.on && !C.net) return; const ev = L.tick(S, dt, A.vol); if (ev && ev.dayEnd) { const e = { k: 'day', rep: ev.dayEnd }; broadcast(e); onEvent(e); save(); pushState(); renderBar(); }
    for (const msg of L.pendingMsgs(S, { vol: A.vol, vol0: S.vol0 })) { const e = { k: 'msg', m: msg }; broadcast(e); onEvent(e); }
    const v = L.verdict(S, A.vol, S.vol0); if (v && !S.over) { S.over = v; save(); const e = { k: 'over', over: v }; broadcast(e); onEvent(e); }
    swarmsHost(dt); C.saveT += dt; if (C.saveT > 20) { C.saveT = 0; save(); }
  }

  // ---------------- Bild ----------------
  function frame(dt, tAbs) {
    if (!C.on || !C.W || !C.S || !C.A) return; const real = Math.min(dt, 0.1); C.t += real; const W = C.W; const S = C.S;
    if (story.on) story.step(real);
    if (isHost()) hostTick(real); else S.t = Math.min(L.DAY_SEC, S.t + real);
    if (!story.on || C.net) { if (!C.orb) walk(real); recallTick(real); airTick(real); }
    const inShip = C.me.inShip && !C.orb; C.rock.setTime(C.t); setLights(inShip);
    eyeCam(real); handTick(real); useTool(real); throwsTick(real); holesTick(real); chargesTick(real); shotsTick(real); strikesTick(real); dronesVisual(real); shipTick(real); remotesTick(real); netTick(real); msgTick(real); toolLoop();
    C.target = C.ui || story.on ? null : targets(); const pr = $('bbPrompt'); if (C.target) { const txt = C.target.text; if (C.promptTxt !== txt) { C.promptTxt = txt; pr.textContent = ''; pr.append(el('kbd', '', 'E'), el('span', '', txt)); } pr.classList.remove('hidden'); } else pr.classList.add('hidden');
    C.rock.update(C.A.dirty.size <= 27 ? 27 : 10); W.fx.step(real); // ein Eingriff berührt bis zu 27 Blöcke: alle im selben Bild neu bauen, sonst klaffen für ein paar Bilder Ritzen zwischen altem und neuem Block
    if ((C.hudT = (C.hudT || 0) - real) <= 0) { C.hudT = 0.2; refreshHud(false); }
    if (C.fadeT > 0) { C.fadeT -= real; if (C.fadeT <= 0) $('bbFade').classList.remove('on'); }
    if (C.toastT > 0) { C.toastT -= real; if (C.toastT <= 0) $('bbToast').classList.remove('on'); } if (C.soldT > 0) { C.soldT -= real; if (C.soldT <= 0) $('bbSold').classList.add('hidden'); }
    if (C.net && (C.plT = (C.plT || 0) + real) > 1) { C.plT = 0; const box = $('bbPlayers'); box.textContent = ''; for (const p of C.net.players) { const d = el('div'); const i = el('i'); i.style.background = '#' + ACCENTS[seatOf(p.id)].toString(16).padStart(6, '0'); d.append(i, el('b', '', p.name + (p.id === myId() ? ' (du)' : ''))); box.append(d); } }
    W.space.setDay(L.dayF(S)); W.space.follow(C.cam, C.orb ? (C.orb.h ? _o.set(C.orb.h.x, C.orb.h.y, C.orb.h.z) : _o.set(0, 34, 0)) : C.me.p, inShip); $('bbCross').classList.toggle('hidden', inShip || !!C.ui); hud.classList.toggle('bb-orb', !!C.orb);
    draw(real, tAbs);
  }
  function draw(real, tAbs) {
    const W = C.W; const cam = C.cam; post.watch(real, true); const dprNow = Math.min(window.devicePixelRatio || 1, 1.5); if (renderer.getPixelRatio() !== dprNow) { renderer.setPixelRatio(dprNow); renderer.setSize(window.innerWidth, window.innerHeight, false); }
    cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); cam.fov = 72; if (cam.aspect < 1.3) cam.fov = cam.fov * 1.3 / cam.aspect; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); renderer.shadowMap.needsUpdate = settings.shadows;
    if (!C.skyCube) { const faces = Array.from({ length: 6 }, () => { const c = document.createElement('canvas'); c.width = c.height = 2; const x = c.getContext('2d'); x.fillStyle = '#010103'; x.fillRect(0, 0, 2, 2); return c; }); C.skyCube = new THREE.CubeTexture(faces); C.skyCube.needsUpdate = true; }
    post.render(W.scene, cam, { mood: C.me.inShip && !C.orb ? MOOD_IN : MOOD_OUT, sky: { cube: C.skyCube }, sun: null, sunDir: W.space.sun.position, dt: real, time: tAbs, speed: 0, nitro: 0, ground: -1000, camPos: cam.position });
  }
  function stop() {
    if (!C.on && !C.loading) return; if (story.on) story.finish(false); save(); C.on = false; C.loading = false; unlock(); closeUI(); tour.open = false; tour.el.classList.add('hidden'); hud.classList.add('hidden'); hud.classList.remove('bb-menu');
    for (const r of C.remotes.values()) C.W.scene.remove(r.b.holder); C.remotes.clear(); C.drill = false; toolLoop(); if (loop) { try { loop.o.stop(); loop.o2.stop(); } catch (e) { /* egal */ } loop = null; } C.net = null; C.host = true; if (G.mode === 'bruno') G.mode = 'menu';
  }
  // Für Tests
  const debug = {
    goTo: (x, y, z) => { const m = C.me; m.inShip = false; C.wasOut = true; m.p.set(x, y, z); m.v.set(0, 0, 0); m.up.copy(m.p).normalize(); m.gn.copy(m.up); m.jumpT = 9; }, surface: (dx = 0, dy = 1, dz = 0) => { const d = V3(dx, dy, dz).normalize(); const o = V3().copy(d).multiplyScalar(120); return C.A.raycast(o.x, o.y, o.z, -d.x, -d.y, -d.z, 200); },
    look: (x, y, z) => { const m = C.me; const up = upOf(m.p, _up); const eye = V3().copy(m.p).addScaledVector(up, EYE); const dir = V3(x, y, z).sub(eye).normalize(); const vert = dir.dot(up); m.fwd.copy(dir).addScaledVector(up, -vert).normalize(); m.pitch = Math.asin(clamp(vert, -1, 1)); },
    act: (a) => act(a), interact, target: () => C.target, select: (id) => selectTool(id), hold: (on) => { C.lmb = !!on; }, key: (code, on) => { C.keys[code] = !!on; }, exitShip, enterShip, openUI, closeUI, story, setDay: (d) => { C.S.day = d; C.S.t = 0; }, tick: (sec) => { for (let i = 0; i < sec * 10; i++) hostTick(0.1); }, save, gridGet: () => gridGet(C.slot), cargo: () => C.cargo, mine: () => C.mine, dumpOre, owned, orbitView, orb: (ax, az) => { if (C.orb) { C.orb.ax = ax; C.orb.az = az; } },
    inside: (x, z) => { const m = C.me; m.inShip = true; m.p.set(INSIDE.x + x, INSIDE.y, INSIDE.z + z); m.v.set(0, 0, 0); },
  };
  return { play: openSlot, remove: removeSlot, stop, frame, startCoop, message, playerJoined, playerLeft, active: () => C.on || C.loading, hide: () => {}, tour, state: C, debug, saves, story };
}
