// Theos Seitenscheidel - Trockne den Ozean aus (intern ozean): Theos Handy ist in den Pazifik gefallen, also wird der Pazifik leer geschöpft.
// Ego-Sicht zu Fuß: am Wasser E gedrückt halten schöpft in den eigenen Tank, beim Wasserhändler am Steg verkaufen (E), im Laden Neues kaufen (F).
// Fahrzeuge (Tanklaster, Saug-U-Boot) mit Verfolgerkamera, F gedrückt halten pumpt. Im Haus: PC (Handy orten, Online-Shop, Statistik, Nachrichten) und Bett.
// Mehrspieler: allein, zu zweit oder zu dritt. Der Host rechnet den Spielstand, die anderen schicken Wünsche und ob sie gerade schöpfen.
// Meersalz und Skillbaum (K): Schwimmen und Tauchen (Salzkristalle und Schätze unter Wasser holen), Rohrpost (Q), stärkere Hände und Roboter.
import * as THREE from './vendor/three.module.min.js';
import { sammeln, learn, rohrpost } from './ozeanlogic.js';
import { MEERE, TOOLS, TANKS, VEHICLES, HELPERS, TURBO, TOOL_ORDER, TANK_ORDER, HELPER_ORDER, SLEEP_FROM, MIN_PER_SEC, HAFEN, BODEN, newSave, fixSave, tick, scoop, sell, suck, buy, canBuy, priceOf, sleep, checkDry, levels, drained, questNow, news, helperRate, helperPrice, helperMax, capOf, fillOf, euro, liter, bigLiter, clockText, clamp, allDry, FIRMA, UPGRADES, UP_ORDER, UP_MAX, UP_STEP, firmaOf, toolRate, lasterRate, helperRateOf, collect, schatzFrei, schatzWert, SCHATZ, SKILLS, SKILL_ORDER, AESTE, SALZ, hasSkill, tauchTiefe, canLearn, learnable, KRISTALL, kristallFrei, kristallWert, ertauchbar, tiefeUeber } from './ozeanlogic.js';
import { buildOzeanWorld, GRID, HOUSE, POOL, HARBOR, bedH, meerAt, depthAt, maskAt, edgeOnPath, waveY, BASE_Y } from './ozeanworld.js';
import { buildModel, oceanPerson, handTool, LOOKS, tint } from './ozeanart.js';
import { createOzeanSound } from './ozeansound.js';
import { createOzeanStory } from './ozeanstory.js';
import { stepVeh, createVehState } from './parklogic.js';
import { createSaves } from './casinosaves.js';
import { createTour } from './tour.js';
import { spriteBlend } from './raceinterior.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const lerp = (a, b, t) => a + (b - a) * t;
const GLASS_MAT = new THREE.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4, clearcoat: 1 }); const WATER_MAT = new THREE.MeshStandardMaterial({ color: 0x3a9ae0, roughness: 0.1, transparent: true, opacity: 0.75, emissive: 0x0a3a70, emissiveIntensity: 0.3 });
const EYE = 1.62; const R = 0.32; const NET_HZ = 1 / 12; const WADE = 1.25; const SWIM_EYE = 0.34; // schwimmend: Augen knapp über dem Wasser
const DEF = {
  laster: { name: 'Tanklaster', len: 7.4, w: 2.5, h: 3.2, wb: 4.65, rear: 1.44, steer: 0.55, gears: [55, 55, 55, 16], acc: 4.2, axle: 2.3 },
  uboot: { name: 'Saug-U-Boot', len: 4.4, w: 1.6, h: 1.4, wb: 2.2, rear: 1.7, steer: 0.7, gears: [32, 32, 32, 12], acc: 3.4, axle: 0 },
};
const pic = (c, w, h, col, sym) => { c.fillStyle = '#0a2a4a'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.font = `900 ${h * 0.34}px Bahnschrift`; c.textAlign = 'center'; c.fillText(sym, w / 2, h * 0.62); };
const STEPS = [
  { t: 'Steuerung', x: 'W A S D laufen, Umschalt rennen, Maus umsehen. E benutzen und am Wasser gedrückt halten (schöpfen), F Laden öffnen. K Skillbaum, Q Rohrpost (wenn gelernt), M Karte, Esc Pause. Im Fahrzeug: W und S Gas und Bremse, A und D lenken, Leertaste Handbremse, F gedrückt halten pumpen, E aussteigen. F11 schaltet Vollbild an und aus. Neue Spielstände, Mehrspieler und Einstellungen findest du im Startbildschirm.', draw: (c, w, h) => pic(c, w, h, '#f9bd00', 'WASD') },
  { t: 'Schöpfen', x: 'Geh ans Ufer und halte E gedrückt. Das Wasser landet in deinem Tank (oben in der Mitte). Ist er voll, bring ihn zum Wasserhändler am Steg. Je besser das Werkzeug, desto schneller geht es.', draw: (c, w, h, t) => { c.fillStyle = '#0a2a4a'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a86d8'; c.fillRect(0, h * 0.6, w, h * 0.4); const y = h * 0.42 + Math.sin(t * 4) * h * 0.12; c.strokeStyle = '#e8f6ff'; c.lineWidth = 6; c.strokeRect(w / 2 - 20, y, 40, 54); } },
  { t: 'Verkaufen und kaufen', x: 'Am Wasserhändler (blaues Schild am Steg) verkaufst du deinen Tank mit E. Mit F öffnest du den Laden: bessere Werkzeuge, größere Tanks, Fahrzeuge und Roboter. Die Kasse gehört allen.', draw: (c, w, h) => pic(c, w, h, '#f9bd00', '€') },
  { t: 'Helfer und Fahrzeuge', x: 'Roboter und XXXXL-Pumpen arbeiten von allein am Ozean, auch wenn ihr woanders seid. Helferroboter laufen mit ihrem Eimer zwischen Wasser und Händler hin und her, Pumproboter fahren der Wasserkante hinterher. Das Wasser zieht sich zurück: Der Tanklaster fährt auf dem trockenen Meeresboden, das Saug-U-Boot im Wasser.', draw: (c, w, h) => pic(c, w, h, '#7affb8', '🤖') },
  { t: 'Firma, Verbessern, Schätze', x: 'Je mehr Liter ihr verkauft, desto höher steigt eure Firma (unten links, 9 Stufen). Jede Stufe schaltet neue Sachen im Laden frei. Im Reiter „Verbessern“ macht ihr Werkzeug und Roboter schneller. Wo das Wasser weg ist, glitzern Schätze am Boden: hingehen und mit E bergen.', draw: (c, w, h) => pic(c, w, h, '#ffd54a', '★') },
  { t: 'Meersalz und Skillbaum', x: 'Meersalz ist eure zweite Währung. Ihr bekommt es für jedes Prozent, das der Ozean trockener wird, für jede erledigte Aufgabe, jede neue Firmenstufe, jeden Schatz und für weiße Salzkristalle am Meeresboden (E). Mit K öffnet ihr den Skillbaum: Schwimmen, Tauchen, Rohrpost (Q), stärkere Arme und schnellere Roboter.', draw: (c, w, h) => pic(c, w, h, '#dff1ff', '🧂') },
  { t: 'Haus, PC und Bett', x: 'Im Haus zwischen den Ozeanen steht der PC: Handy orten, im Online-Shop bestellen, Statistik und Nachrichten. Ab 20 Uhr könnt ihr im Bett schlafen. Die Roboter machen nachts weiter.', draw: (c, w, h) => pic(c, w, h, '#9fb8e8', '☾') },
];

export function createOzean(ctx) {
  const { renderer, audio, $, store, settings, showScreen, G, post, getQuality, shadowSize, endSession } = ctx;
  const C = { on: false, net: null, host: true, W: null, S: null, slot: null, cam: new THREE.PerspectiveCamera(66, 16 / 9, 0.05, 1600), me: { x: 0, y: BASE_Y, z: 8, yaw: 0, pitch: 0, vx: 0, vz: 0, bob: 0, moving: 0, dist: 0 }, keys: {}, ui: null, target: null, drive: null, veh: {}, remotes: new Map(), efforts: {}, scooping: null, sendT: 0, saveT: 0, castT: 0, toastT: 0, t: 0, boxQ: [], mapZoom: 1, shopTab: 'tool', pcTab: 'orten', loading: false, fullT: 0, dirty: false };
  const hud = $('ozean'); const tour = createTour({ root: hud, store, key: 'ozTutSeen', steps: STEPS }); const snd = createOzeanSound(audio);
  const ST = createOzeanStory({ C, $, snd, hud, onEnd: (k, info) => storyEnd(k, info) });
  const saves = createSaves(store, fixSave, { idx: 'ozeanSlots', key: 'ozeanSave.', legacy: null });
  const isHost = () => !C.net || C.host; const myId = () => (C.net && C.net.me ? C.net.me.id : 'me'); const myName = () => (C.net && C.net.me ? C.net.me.name : 'Du');
  const seatOf = (id) => { if (!C.net) return 0; const i = C.net.players.findIndex((p) => p.id === id); return i < 0 ? 0 : i % 4; }; // vierter Platz nur bei neuen Ständen (die Lobby lässt sonst höchstens drei herein)
  const nameOf = (id) => (id === 'me' ? 'Du' : (C.net && C.net.players.find((p) => p.id === id) || {}).name || 'Jemand');
  const save = () => { if (!isHost() || !C.S || !C.slot) return; C.S.purse = Math.round(C.S.geld * 100); C.S.level = C.S.meer + 1; saves.save(C.slot, C.S, C.net ? C.net.players.map((p) => p.name) : null); };

  // ---------------- Aufbau ----------------
  function build() {
    if (C.W) return; const W = C.W = buildOzeanWorld(renderer, { shadows: settings.shadows, shadowSize: shadowSize() });
    // Ego-Sicht: Werkzeug in der Hand vor der Kamera
    C.fp = new THREE.Group(); W.scene.add(C.fp); C.fpTool = { id: null, m: null, piv: new THREE.Group() }; C.fpTool.piv.position.set(0.32, -0.42, -0.62); C.fp.add(C.fpTool.piv);
    // aufgestellte Pumpe am Wasser (beim Schöpfen mit Hand- oder Motorpumpe)
    C.deploy = {}; for (const id of ['handpumpe', 'motorpumpe', 'feuerwehr']) { const m = buildModel(id === 'handpumpe' ? 'Handpumpe' : 'Motorpumpe', { merge: id !== 'feuerwehr' }); if (id === 'feuerwehr') tint(m, (mat) => { if (/Gummi|schwarz|Schlauch/i.test(mat.name)) return null; const c = mat.clone(); c.color.lerp(new THREE.Color(0xd81a1a), 0.75); return c; }); m.group.visible = false; m.group.scale.setScalar(id === 'feuerwehr' ? 2.3 : id === 'motorpumpe' ? 1.6 : 1.15); W.scene.add(m.group); C.deploy[id] = m; }
    // Rohr des U-Boots zum Steg
    C.pipeMat = new THREE.MeshStandardMaterial({ color: 0x2a62c8, roughness: 0.5 }); C.pipes = new Map();
    C.ray = new THREE.Raycaster();
  }
  function nameSprite(text, col) { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.font = '700 50px Bahnschrift, Segoe UI, sans-serif'; x.textAlign = 'center'; x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(text, 256, 64); x.fillStyle = col; x.fillText(text, 256, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); spriteBlend(m); const s = new THREE.Sprite(m); s.scale.set(1.2, 0.225, 1); s.renderOrder = 12; s.userData.text = text; return s; }
  function ensureFigure(id) { let r = C.remotes.get(id); if (r) return r; const look = LOOKS[seatOf(id)]; const p = oceanPerson(C.W.scene, look); const label = nameSprite('?', look.col); C.W.scene.add(label); r = { id, p, label, name: '?', x: 0, y: BASE_Y, z: 0, yaw: 0, tx: 0, ty: BASE_Y, tz: 0, tyaw: 0, sc: 0 }; C.remotes.set(id, r); return r; }

  // ---------------- Fahrzeuge ----------------
  function vehSpawn(key) { const [k, n] = key.split(':'); const i = C.S.meer; const hb = HARBOR[i]; if (k === 'laster') { const p = hb.park[Number(n) % 3]; return { x: p.x, z: p.z, h: Math.atan2(hb.dir.x, hb.dir.z) }; } const lv = levels(C.S)[i]; const e = edgeOnPath(i, lv); let q = null; for (let d = e.d + 8; d < e.d + 400; d += 3) { q = C.W.pathPoint(i, d); const x = q.x + q.dz * (Number(n) - 1) * 4; const z = q.z - q.dx * (Number(n) - 1) * 4; if (lv - bedH(x, z) > 2.2) return { x, z, h: Math.atan2(q.dx, q.dz) }; } q = C.W.pathPoint(i, 9999); return { x: q.x, z: q.z, h: 0 }; }
  function syncVehicles() {
    const S = C.S; const W = C.W;
    for (const k of Object.keys(VEHICLES)) for (let n = 0; n < (S.veh[k] || 0); n++) { const key = `${k}:${n}`; if (C.veh[key]) continue; const g = new THREE.Group(); const m = buildModel(VEHICLES[k].model); if (k === 'laster') { m.group.rotation.y = -Math.PI / 2; m.group.position.z = DEF.laster.axle; } else { m.group.rotation.y = -Math.PI / 2; m.group.scale.setScalar(2.4); m.group.position.z = 0.4; } g.add(m.group); W.scene.add(g);
      const pos = S.vpos[key] || vehSpawn(key); const st = createVehState(pos, DEF[k]); C.veh[key] = { key, k, n, g, m, def: DEF[k], st, spin: 0 }; }
  }
  const driverOf = (key) => { for (const [id, r] of C.remotes) if (r.drive === key) return id; return C.drive === key ? myId() : null; };
  function vehFree(V, x, z, h, prev) { // darf das Fahrzeug hier stehen?
    const d = V.def; if (V.k === 'uboot' && prev) { const lv0 = levels(C.S); const now = depthAt(x, z, lv0); if (now > 0.9 && now > depthAt(prev.x, prev.z, lv0) + 0.002 && !Object.values(C.veh).some((o) => o !== V && Math.hypot(x - o.st.x, z - o.st.z) < 4)) return true; } const c = d.len / 2 - d.rear; const fx = Math.sin(h); const fz = Math.cos(h); const rx = Math.cos(h); const rz = -Math.sin(h); const lv = levels(C.S); const W = C.W;
    for (const [a, b] of [[c + d.len / 2, -d.w / 2], [c + d.len / 2, d.w / 2], [c - d.len / 2, -d.w / 2], [c - d.len / 2, d.w / 2], [c, 0], [c + d.len / 2, 0]]) {
      const px = x + fx * a + rx * b; const pz = z + fz * a + rz * b; if (px < GRID.x0 + 4 || px > GRID.x1 - 4 || pz < GRID.z0 + 4 || pz > GRID.z1 - 4) return false;
      const dep = depthAt(px, pz, lv);
      if (V.k === 'laster') { if (bedH(px, pz) > 14 || dep > 1.1) return false; if (W.pierAt(px, pz) !== null) return false; for (const bx of W.boxes) if (px > bx.x0 && px < bx.x1 && pz > bx.z0 && pz < bx.z1) return false; for (const ci of W.circles.concat(W.dyn)) if (Math.hypot(px - ci.x, pz - ci.z) < ci.r) return false; }
      else if (dep < 0.9) return false;
    }
    for (const o of Object.values(C.veh)) if (o !== V && Math.hypot(x - o.st.x, z - o.st.z) < (o.def.len + d.len) * 0.42) return false;
    return true;
  }
  function enterVehicle(key) { const V = C.veh[key]; if (!V) return; if (driverOf(key)) { toast('Da sitzt schon jemand am Steuer.', 'bad'); return; } stopScoop(); C.drive = key; V.st.v = 0; V.st.gear = 1; C.camYaw = 0; C.chase = null; $('ozDrive').classList.remove('hidden'); $('ozCross').classList.add('hidden'); hint(''); snd.play('door'); }
  function exitVehicle() {
    const V = C.veh[C.drive]; if (!V) return; const st = V.st; if (Math.abs(st.v) > 2) { toast('Erst anhalten.', 'bad'); return; } const m = C.me; const lv = levels(C.S);
    const tries = [[1, 0.4], [-1, 0.4], [1, -1.2], [-1, -1.2], [0, 1.8]]; let ok = false; for (const [sd, fw] of tries) { const x = st.x + Math.cos(st.h) * sd * (V.def.w / 2 + 0.9) + Math.sin(st.h) * (V.def.len / 2 - V.def.rear + fw * 2); const z = st.z - Math.sin(st.h) * sd * (V.def.w / 2 + 0.9) + Math.cos(st.h) * (V.def.len / 2 - V.def.rear + fw * 2); if (depthAt(x, z, lv) < WADE) { m.x = x; m.z = z; ok = true; break; } }
    if (!ok) { toast('Hier ist das Wasser zu tief zum Aussteigen. Fahr ans Ufer.', 'bad'); return; }
    m.y = groundY(m.x, m.z); m.yaw = st.h + Math.PI; m.pitch = 0; C.drive = null; stopScoop(); $('ozDrive').classList.add('hidden'); $('ozCross').classList.remove('hidden'); snd.play('door'); audio.update({ kmh: 0, rpm: 900, throttle: 0, surface: 'road', slip: 0 }, false); if (isHost()) { C.S.vpos[V.key] = { x: st.x, z: st.z, h: st.h }; C.dirty = true; } else act({ k: 'vpos', key: V.key, x: st.x, z: st.z, h: st.h });
  }
  function driveTick(dt) {
    const V = C.veh[C.drive]; const st = V.st; const k = C.keys; const fw = k.KeyW || k.ArrowUp; const bw = k.KeyS || k.ArrowDown;
    if (fw && st.v > -0.5) st.gear = 1; if (bw && st.v < 0.5) st.gear = -1; const th = (st.gear > 0 ? fw : bw) ? 1 : 0; const br = (st.gear > 0 ? bw : fw) ? 1 : 0;
    const inp = { th, br, steer: ((k.KeyA || k.ArrowLeft) ? 1 : 0) - ((k.KeyD || k.ArrowRight) ? 1 : 0) }; st.hand = k.Space ? 1 : 0; if (C.ui || tour.open) { inp.th = 0; inp.br = 1; }
    const prev = { x: st.x, z: st.z, h: st.h }; stepVeh(st, V.def, inp, dt);
    if (!vehFree(V, st.x, st.z, st.h, prev)) { if (Math.abs(st.v) > 4) audio.thud(Math.min(12, Math.abs(st.v))); st.x = prev.x; st.z = prev.z; st.h = prev.h; st.v *= -0.2; }
    const kmh = Math.abs(st.v) * 3.6; $('ozKmh').textContent = Math.round(kmh); const lv = levels(C.S);
    if (V.k === 'laster') { const f = fillOf(C.S, myId(), V.key); const cap = capOf(C.S, V.key); $('ozLoadV').textContent = `${VEHICLES.laster.name} · Tank ${liter(f)} / ${liter(cap)}`; $('ozDriveKeys').textContent = 'W/S Gas und Bremse · A/D lenken · F halten: pumpen · am Händler F: verkaufen · E aussteigen'; }
    else { $('ozLoadV').textContent = `${VEHICLES.uboot.name} · ${(VEHICLES.uboot.rate).toLocaleString('de-DE')} l/s direkt zum Händler · Tiefe ${Math.max(0, depthAt(st.x, st.z, lv)).toFixed(1).replace('.', ',')} m`; $('ozDriveKeys').textContent = 'W/S Gas und Bremse · A/D lenken · F halten: saugen · E aussteigen (nur am Ufer)'; }
    audio.update({ kmh, rpm: st.rpm, throttle: inp.th, surface: V.k === 'uboot' ? 'road' : 'grass', slip: 0, gear: 2 }, true);
    if (isHost()) C.S.vpos[V.key] = { x: st.x, z: st.z, h: st.h };
    // Pumpen / Saugen mit gedrückter F-Taste
    const hold = k.KeyF || k.Mouse0; const hb = nearCounter(st.x, st.z, 9);
    if (V.k === 'laster' && hb && hold && !C.sellT) { C.sellT = 0.6; const r = act({ k: 'sell', veh: V.key, at: hb.i }); if (r && r.ok) snd.play('pour'); else result(r); } C.sellT = Math.max(0, (C.sellT || 0) - dt);
    if (hold && !(V.k === 'laster' && hb)) { const p = vehNozzle(V); const m = meerAt(p.x, p.z); const dep = m < 0 ? -1 : lv[m] - bedH(p.x, p.z); if (dep > 0.05) { C.scooping = { m, veh: V.k === 'laster' ? V.key : null, kind: V.k === 'uboot' ? 'suck' : 'scoop', x: p.x, z: p.z }; } else { C.scooping = null; if (!C.noWaterT) { toast(V.k === 'laster' ? 'Das Schlauchende ist nicht im Wasser. Rückwärts ans Wasser fahren.' : 'Hier ist kein Wasser.', 'bad'); C.noWaterT = 2.5; } } } else C.scooping = null;
    C.noWaterT = Math.max(0, (C.noWaterT || 0) - dt);
  }
  const vehNozzle = (V) => { const st = V.st; if (V.k === 'laster') return { x: st.x - Math.sin(st.h) * (V.def.rear + 0.8), z: st.z - Math.cos(st.h) * (V.def.rear + 0.8) }; return { x: st.x + Math.sin(st.h) * 2.4, z: st.z + Math.cos(st.h) * 2.4 }; };
  function vehVisual(dt) {
    const lv = levels(C.S); const t = C.t;
    for (const V of Object.values(C.veh)) { const st = V.st; const g = V.g; const fx = Math.sin(st.h); const fz = Math.cos(st.h); const c = V.def.len / 2 - V.def.rear; const cx = st.x + fx * c; const cz = st.z + fz * c;
      if (V.k === 'laster') { const hF = bedH(cx + fx * 2.6, cz + fz * 2.6); const hB = bedH(cx - fx * 2.6, cz - fz * 2.6); const hL = bedH(cx + Math.cos(st.h) * 1.1, cz - Math.sin(st.h) * 1.1); const hR = bedH(cx - Math.cos(st.h) * 1.1, cz + Math.sin(st.h) * 1.1); const y = (hF + hB) / 2; g.position.set(st.x, Math.max(y, bedH(st.x, st.z)) - 0.02, st.z); g.rotation.set(0, 0, 0); g.rotation.order = 'YXZ'; g.rotation.y = st.h; g.rotation.x = -Math.atan2(hF - hB, 5.2); g.rotation.z = Math.atan2(hL - hR, 2.2);
        if (Math.abs(st.v || 0) > 3 && maskAt(st.x, st.z) && depthAt(st.x, st.z, lv) < -0.2 && Math.random() < dt * Math.abs(st.v) * 0.8) C.W.puff(V3(st.x - Math.sin(st.h) * 1.5 + (Math.random() - 0.5) * 2, bedH(st.x, st.z) + 0.3, st.z - Math.cos(st.h) * 1.5), 0xc8b088, 1.4);
        V.spin += (st.v || 0) * dt / 0.52; for (const n of ['vorn_L', 'vorn_R', 'hinten_1_L', 'hinten_1_R', 'hinten_2_L', 'hinten_2_R']) { const w = V.m.parts['Tanklaster_Rad_' + n]; if (w) { w.rotation.order = 'YXZ'; w.rotation.z = -V.spin; if (n.startsWith('vorn')) w.rotation.y = (st.steer || 0) * 0.5; } } }
      else { const m = meerAt(cx, cz); const dep = m < 0 ? 0 : lv[m] - bedH(cx, cz); const wy = m < 0 ? 0 : lv[m] + waveY(cx, cz, t, dep); const floor = bedH(cx, cz) + 0.55; g.position.set(st.x, Math.max(floor, wy - 0.55), st.z); g.rotation.order = 'YXZ'; g.rotation.y = st.h; g.rotation.x = Math.sin(t * 1.2 + V.n) * 0.03 - (st.v || 0) * 0.004; g.rotation.z = Math.sin(t * 0.9 + V.n) * 0.04 - (st.steer || 0) * 0.1; }
    }
  }
  // Rohr vom U-Boot zum Steg (nur solange jemand drinsitzt oder es saugt)
  function pipesTick() {
    for (const V of Object.values(C.veh)) { if (V.k !== 'uboot') continue; const on = !!driverOf(V.key); let p = C.pipes.get(V.key); if (!on) { if (p) { C.W.scene.remove(p); p.geometry.dispose(); C.pipes.delete(V.key); } continue; }
      if ((V.pipeT = (V.pipeT || 0) - 1) > 0 && p) continue; V.pipeT = 6; const hb = HARBOR[C.S.meer]; const a = V3(V.g.position.x - Math.sin(V.st.h) * 1.6, V.g.position.y + 0.9, V.g.position.z - Math.cos(V.st.h) * 1.6); const b = V3(hb.pier.x1, hb.pier.y + 0.3, hb.pier.z1); const lv = levels(C.S)[C.S.meer]; const pts = [];
      for (let i = 0; i <= 20; i++) { const u = i / 20; const x = lerp(a.x, b.x, u); const z = lerp(a.z, b.z, u); const y = Math.max(lv + 0.12, bedH(x, z) + 0.15) + Math.sin(u * Math.PI) * 0.2; pts.push(V3(x, i === 0 ? a.y : i === 20 ? b.y : y, z)); }
      const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.16, 6, false); if (p) { p.geometry.dispose(); p.geometry = geo; } else { p = new THREE.Mesh(geo, C.pipeMat); C.W.scene.add(p); C.pipes.set(V.key, p); } }
  }

  // ---------------- Spielstand in die Welt übertragen ----------------
  let lastMeer = -1;
  function applyWorld() {
    const S = C.S; const W = C.W; if (!S || !W) return; W.setLevels(levels(S), S.done); W.setHelpers(S); syncVehicles();
    for (let i = 0; i < 2; i++) { const inPool = !!S.flags.tiere[i]; if (C.poolState === undefined) C.poolState = [null, null]; if (C.poolState[i] !== inPool) { C.poolState[i] = inPool; W.toPool(i, inPool); } }
    const bk = `${S.meer}|${S.done}`; if (lastMeer !== bk) { lastMeer = bk; W.drawBoards(S); } const sk = S.schatz[0].length + S.schatz[1].length * 100; if (C.schatzKey !== sk && W.deko) { C.schatzKey = sk; W.deko.setTreasures(S); } const kk = S.kristall[0].length + S.kristall[1].length * 100; if (C.kristKey !== kk && W.deko) { C.kristKey = kk; W.deko.setCrystals(S); } W.phone.visible = !S.scene.mitte; W.chain.visible = !S.scene.ende;
  }
  function changed(ev) { if (!isHost()) return; applyWorld(); refresh(); C.dirty = true; if (ev) broadcast(ev); }
  function pushState() { if (C.net && C.host && C.S) C.net.broadcast({ t: 'ost', S: C.S }); }
  function broadcast(ev) { if (C.net && C.host) C.net.broadcast({ t: 'oev', ev }); }

  // ---------------- Handlungen: Host führt aus, Mitspieler fragen an ----------------
  function act(a) { if (isHost()) return doAct(myId(), a); C.net.send({ t: 'odo', a }); return null; }
  function doAct(who, a) {
    const S = C.S; let r = { ok: false, why: '?' };
    if (a.k === 'buy') { r = buy(S, a.item); if (r.ok) { broadcast({ k: 'msg', text: `${nameOf(who)} hat gekauft: ${r.name}`, kind: 'gold', not: who }); if (a.item.k === 'veh' || a.item.k === 'helfer') { applyWorld(); } } }
    else if (a.k === 'sell') { const hb = HARBOR[a.at]; if (a.at !== S.meer && !S.done[a.at]) r = { ok: false, why: `Der ${MEERE[a.at].name}-Händler kauft erst ab Stufe ${a.at + 1}. Geh zum ${MEERE[S.meer].name}-Steg.` }; else r = sell(S, who, a.veh || null, a.at); void hb; if (r.ok) broadcast({ k: 'sold', who: nameOf(who), text: r.text, not: who }); }
    else if (a.k === 'sleep') { r = sleep(S); if (r.ok) { const rep = r.rep; for (const e of r.ev) onHostEvent(e); broadcast({ k: 'report', rep }); showReport(rep); r = { ok: true, quiet: true }; } }
    else if (a.k === 'pc') { if (!S.flags.pc) { S.flags.pc = true; r = { ok: true, quiet: true }; } else r = { ok: true, quiet: true }; }
    else if (a.k === 'schatz') { r = collect(S, a.m, a.n, !!a.dive); if (r.ok) { broadcast({ k: 'schatz', who: nameOf(who), text: r.text, post: r.post, not: who }); if (r.post) { const box = { s: 'Flaschenpost', h: 'Da steht was drin …', t: `„${r.post}“`, answers: [['Witzig', null, true]] }; if (who === myId()) showBox(box); else C.net.sendTo(who, { t: 'oev', ev: { k: 'box', box } }); } } }
    else if (a.k === 'salz') { r = sammeln(S, a.m, a.n, !!a.dive); if (r.ok) broadcast({ k: 'msg', text: `${nameOf(who)}: ${r.text}`, kind: '', not: who }); }
    else if (a.k === 'skill') { r = learn(S, a.id); if (r.ok) broadcast({ k: 'msg', text: `${nameOf(who)} hat gelernt: ${SKILLS[a.id].icon} ${SKILLS[a.id].name}`, kind: 'gold', not: who }); }
    else if (a.k === 'rohrpost') { r = rohrpost(S, who); if (r.ok) broadcast({ k: 'sold', who: nameOf(who), text: r.text, not: who }); }
    else if (a.k === 'vpos') { if (C.veh[a.key] && typeof a.x === 'number') { S.vpos[a.key] = { x: a.x, z: a.z, h: a.h }; } return null; }
    if (r.ok || r.why) changed(); if (who !== myId() && C.net) C.net.sendTo(who, { t: 'ores', r }); else result(r); return r;
  }
  function result(r) { if (!r) return; if (r.ok && r.text && !r.quiet) toast(r.text, 'gold'); else if (!r.ok && r.why) { toast(r.why, 'bad'); snd.play('error'); } }
  function onHostEvent(e) {
    if (e.k === 'trocken') { const ev = { k: 'trocken', meer: e.meer }; broadcast(ev); setTimeout(() => onEvent(ev), 500); if (e.meer === 0) { for (const key of Object.keys(C.S.vpos)) C.S.vpos[key] = null; } }
    else if (e.k === 'tiere') { const ev = { k: 'msg', text: `Die Tiere aus dem ${MEERE[e.meer].name} sind ins Tierbecken am Haus umgezogen.`, kind: 'gold' }; broadcast(ev); onEvent(ev); }
    else if (e.k === 'firma') { const ev = { k: 'firma', stufe: e.stufe }; broadcast(ev); onEvent(ev); }
    else if (e.k === 'abend') { const ev = { k: 'msg', text: '20 Uhr: Ab jetzt könnt ihr im Haus schlafen. Die Roboter arbeiten nachts weiter.', kind: '' }; broadcast(ev); onEvent(ev); }
    C.dirty = true;
  }

  // ---------------- Textboxen ----------------
  function showBox(b) { C.boxQ.push(b); if (C.boxQ.length === 1) renderBox(); }
  function renderBox() {
    const b = C.boxQ[0]; const el = $('ozBox'); if (!b) { el.classList.add('hidden'); if (C.ui === 'box') C.ui = null; return; } unlock(); C.ui = 'box';
    el.classList.toggle('report', !!b.report); $('ozBoxS').textContent = b.s || ''; $('ozBoxH').textContent = b.h || ''; $('ozBoxT').textContent = b.t || ''; const A = $('ozBoxA'); A.textContent = '';
    for (const [label, fn, primary] of b.answers || [['Weiter', null, true]]) { const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = label; if (primary) btn.className = 'primary'; btn.onclick = () => { snd.play('ui'); C.boxQ.shift(); renderBox(); if (fn) fn(); }; A.append(btn); }
    el.classList.remove('hidden');
  }
  function showReport(rep) {
    const L = [`Heute geschöpft und verkauft: ${bigLiter(rep.today.liter)}`, `Eingenommen: ${euro(rep.today.geld)} · ausgegeben: ${euro(rep.today.ausgegeben)}`, `Nachtschicht der Roboter: ${bigLiter(rep.night)} (+${euro(rep.nightMoney)})`, '', `Im ${MEERE[rep.meer].name} sind noch ${bigLiter(rep.rest)}.`];
    $('ozFade').classList.add('on'); snd.play('sleep'); if (C.ui) closeUI(); setTimeout(() => { $('ozFade').classList.remove('on'); showBox({ s: 'Guten Morgen', h: `Tag ${rep.next} · 8:00 Uhr`, t: L.join('\n'), report: true, answers: [['Aufstehen', null, true]] }); }, 1300);
  }

  // ---------------- Anzeige ----------------
  function toast(text, kind = '') { const t = $('ozToast'); t.textContent = text; t.className = 'oz-toast ' + kind; void t.offsetWidth; t.classList.add('on'); C.toastT = 3.6; }
  function hint(text) { $('ozHint').textContent = text || ''; }
  function refresh() {
    const S = C.S; if (!S) return; const lv = levels(S); const i = S.meer; const me = myId();
    $('ozMoney').textContent = euro(S.geld); const sz = S.salz || 0; $('ozSalz').textContent = sz.toLocaleString('de-DE'); const lk = learnable(S); const sb = $('ozSalzBox'); sb.classList.toggle('ready', lk.length > 0);
    if (C.salzSeen !== undefined && sz > C.salzSeen) { sb.classList.remove('neu'); void sb.offsetWidth; sb.classList.add('neu'); } C.salzSeen = sz;
    const lkKey = lk.join(); if (C.learnSeen !== undefined && lk.some((id) => !C.learnSeen.split(',').includes(id)) && C.ui !== 'skill') toast(`Neuer Skill lernbar: ${SKILLS[lk.find((id) => !C.learnSeen.split(',').includes(id))].name}. Drück K!`, 'gold'); C.learnSeen = lkKey; $('ozClock').textContent = clockText(S.clock); $('ozDay').textContent = `Tag ${S.day}${S.clock >= SLEEP_FROM ? ' · Bett frei' : ''}`; $('ozClock').parentElement.classList.toggle('late', S.clock >= SLEEP_FROM || S.clock < 5 * 60);
    const veh = C.drive && C.veh[C.drive] && C.veh[C.drive].k === 'laster' ? C.drive : null; const f = fillOf(S, me, veh); const cap = capOf(S, veh); $('ozTankT').textContent = `${veh ? 'Laster' : TANKS[S.tank].name}: ${liter(f)} / ${liter(cap)}`; $('ozTankBar').style.width = `${Math.round(100 * clamp(f / cap, 0, 1))}%`; $('ozTankBox').classList.toggle('full', f >= cap - 1e-6);
    const d = drained(S, i); $('ozSeaT').textContent = allDry(S) ? 'Beide Ozeane trocken!' : `${MEERE[i].name}: noch ${bigLiter(S.rest[i])}`; $('ozSeaBar').style.width = `${(100 * (1 - d)).toFixed(2)}%`; $('ozSeaP').textContent = allDry(S) ? 'staubtrocken' : `${(d * 100).toFixed(d < 0.1 ? 2 : 1).replace('.', ',')} % ausgetrocknet · Pegel ${lv[i].toFixed(2).replace('.', ',')} m`;
    $('ozSeaBox').style.setProperty('--meer', MEERE[i].farbe);
    const hr = helperRate(S); const fi = firmaOf(S); const nf = FIRMA[fi + 1]; const fk = nf ? clamp((S.stats.verkauft - FIRMA[fi].ab) / (nf.ab - FIRMA[fi].ab), 0, 1) : 1; const fkey = `${S.tool}|${S.up.tool}|${Math.round(hr)}|${fi}|${Math.round(fk * 100)}`;
    if (C.toolKey !== fkey) { C.toolKey = fkey; $('ozToolN').textContent = `${TOOLS[S.tool].name}${S.up.tool ? ` · Technik ${S.up.tool}` : ''}`; $('ozToolR').textContent = `${Math.round(toolRate(S) * 10) / 10} l/s beim Schöpfen${hr > 0 ? ` · Roboter: ${Math.round(hr).toLocaleString('de-DE')} l/s` : ''}`; $('ozFirmaT').textContent = `Firma ${fi + 1}/${FIRMA.length}: ${FIRMA[fi].name}`; $('ozFirmaBar').style.width = `${Math.round(fk * 100)}%`; $('ozFirmaN').textContent = nf ? `nächste Stufe ab ${bigLiter(nf.ab)} verkauft` : 'höchste Stufe'; }
    const q = questNow(S); $('ozQuestN').textContent = q.end ? 'Geschafft' : `Aufgabe ${q.n} von ${q.of}`; $('ozQuestT').textContent = q.text; const pb = $('ozQuestBar').parentElement;
    if (q.prog) { pb.classList.remove('hidden'); const fmt = (v) => (q.prog[2] === '€' ? euro(Math.min(v, q.prog[1])) : q.prog[2] === 'Salz' ? `${Math.min(v, q.prog[1])} Meersalz` : bigLiter(Math.min(v, q.prog[1]))); $('ozQuestBar').style.width = `${Math.round(100 * clamp(q.prog[0] / q.prog[1], 0, 1))}%`; $('ozQuestP').textContent = `${fmt(q.prog[0])} / ${q.prog[2] === '€' ? euro(q.prog[1]) : q.prog[2] === 'Salz' ? `${q.prog[1]} Meersalz` : bigLiter(q.prog[1])}`; } else { pb.classList.add('hidden'); $('ozQuestP').textContent = ''; }
    if (C.questSeen !== undefined && C.questSeen !== S.quest) { const el = $('ozQuest'); el.classList.remove('neu'); void el.offsetWidth; el.classList.add('neu'); snd.play('quest'); } C.questSeen = S.quest;
    $('ozOutro').classList.toggle('hidden', !S.scene.ende); $('ozMitte').classList.toggle('hidden', !S.scene.mitte);
    if (C.ui === 'shop') renderShop(); if (C.ui === 'pc') renderPC(); if (C.ui === 'skill' && C.skillKey !== `${sz}|${Object.keys(S.skills).join()}`) renderSkill();
  }

  // ---------------- Eingabe ----------------
  const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyM', 'KeyK', 'KeyQ', 'Space', 'Escape', 'Enter', 'Tab']);
  window.addEventListener('keydown', (e) => { if (!C.on || (e.target && e.target.tagName === 'INPUT')) return; if (!KEYS.has(e.code)) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; C.keys[e.code] = true; onKey(e.code); }, true);
  window.addEventListener('keyup', (e) => { if (!C.on) return; C.keys[e.code] = false; if (KEYS.has(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('blur', () => { C.keys = {}; });
  function onKey(code) {
    if (C.loading || hud.classList.contains('oz-menu')) return;
    if (ST.on) { ST.key(code); return; }
    if (tour.open) { if (code === 'Escape') tour.close(); return; }
    if (C.ui === 'box') { if (code === 'Enter' || code === 'Space') { const b = $('ozBoxA').querySelector('.primary'); if (b) b.click(); } return; }
    if (code === 'Escape') { if (C.ui === 'pause') { if (performance.now() - (C.pauseAt || 0) > 300) closeUI(); return; } if (C.ui) { closeUI(); return; } openUI('pause'); return; }
    if (code === 'KeyM') { if (C.ui === 'map') closeUI(); else if (!C.ui) openUI('map'); return; }
    if (code === 'KeyK') { if (C.ui === 'skill') closeUI(); else if (!C.ui) openUI('skill'); return; }
    if (C.ui) return;
    if (C.drive) { if (code === 'KeyE') exitVehicle(); return; }
    if (code === 'KeyE') interact('e'); if (code === 'KeyF') interact('f');
    if (code === 'KeyQ') { if (!hasSkill(C.S, 'rohrpost')) { toast('Rohrpost (Q) gibt es im Skillbaum (K), Ast „Hände“.', 'bad'); return; } const r = act({ k: 'rohrpost' }); if (r && r.ok) snd.play('pour', 0.7); else if (r) result(r); }
  }
  const canvas = $('gl');
  canvas.addEventListener('mousedown', (e) => { if (!C.on || C.ui || tour.open || C.loading || ST.on) return; audio.init(); snd.init(); if (e.button === 0 && document.pointerLockElement !== canvas) { try { canvas.requestPointerLock(); } catch (err) { /* egal */ } return; } if (e.button === 0) { C.keys.Mouse0 = true; if (!C.drive && C.target && C.target.e && C.target.e.k === 'scoop') interact('e'); } });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) C.keys.Mouse0 = false; });
  window.addEventListener('mousemove', (e) => { if (!C.on || document.pointerLockElement !== canvas) return; const s = 0.0022 * (settings.mouse || 1); if (C.drive) { C.camYaw = clamp((C.camYaw || 0) - e.movementX * s, -2.6, 2.6); C.camPitch = clamp((C.camPitch || 0) - e.movementY * s, -0.3, 0.6); return; } C.me.yaw -= e.movementX * s; C.me.pitch = clamp(C.me.pitch - e.movementY * s, -1.4, 1.4); });
  $('ozMapC').addEventListener('wheel', (e) => { C.mapZoom = clamp(C.mapZoom * (e.deltaY > 0 ? 0.85 : 1.18), 0.7, 8); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { const locked = document.pointerLockElement === canvas; if (!locked && C.on && !C.ui && !C.lockQuiet && !tour.open && !C.loading && !ST.on) openUI('pause'); C.lockQuiet = false; });
  const unlock = () => { if (document.pointerLockElement) { C.lockQuiet = true; document.exitPointerLock(); } };
  const PANELS = { pause: 'ozPause', shop: 'ozShop', map: 'ozMap', pc: 'ozPC', skill: 'ozSkill' };
  function openUI(k) { unlock(); stopScoop(); C.ui = k; C.pauseAt = performance.now(); for (const [key, id] of Object.entries(PANELS)) $(id).classList.toggle('hidden', k !== key); if (k === 'shop') renderShop(); if (k === 'pc') renderPC(); if (k === 'skill') renderSkill(); if (k !== 'pause' && k !== 'map') snd.play('ui'); }
  function closeUI() { C.ui = null; for (const id of Object.values(PANELS)) $(id).classList.add('hidden'); }

  // ---------------- Laufen ----------------
  const inHouse = (x, z) => x > HOUSE.x0 && x < HOUSE.x1 && z > HOUSE.z0 && z < HOUSE.z1;
  function groundY(x, z) { const p = C.W.pierAt(x, z); if (p !== null) return p; if (inHouse(x, z)) return HOUSE.floor; if (x > HOUSE.door.x0 - 0.3 && x < HOUSE.door.x1 + 0.3 && z >= HOUSE.z1 && z < HOUSE.z1 + 0.55) return BASE_Y + 0.1; return bedH(x, z); }
  function vehCircles() { const out = []; for (const V of Object.values(C.veh)) { if (C.drive === V.key) continue; const d = V.def; const c = d.len / 2 - d.rear; for (const k of [-0.3, 0, 0.3]) { const off = c + k * d.len; out.push({ x: V.st.x + Math.sin(V.st.h) * off, z: V.st.z + Math.cos(V.st.h) * off, r: d.w * 0.5 }); } } return out; }
  function collide(x, z, px, pz) {
    const W = C.W; x = clamp(x, GRID.x0 + 3, GRID.x1 - 3); z = clamp(z, GRID.z0 + 3, GRID.z1 - 3); const lv = levels(C.S);
    // zu tief (Waten bis 1,25 m), zu steil (Berge am Rand)
    const onPier = W.pierAt(x, z) !== null; if (!onPier && !hasSkill(C.S, 'schwimmen') && depthAt(x, z, lv) > WADE && depthAt(x, z, lv) > depthAt(px, pz, lv) - 0.01) { if (!C.deepT) { toast('Zu tief! Lern im Skillbaum (K) „Schwimmen“, sonst geht es hier nur mit dem U-Boot weiter.', 'bad'); C.deepT = 3; } x = px; z = pz; }
    if (!onPier && bedH(x, z) > 16) { x = px; z = pz; }
    // Steg: vom Steg fällt man nicht runter (Geländer), auf den Steg kommt man nur am Anfang
    const wasPier = W.pierAt(px, pz) !== null; if (wasPier && !onPier && Math.abs(bedH(x, z) - W.pierAt(px, pz)) > 0.6) { x = px; z = pz; }
    if (!wasPier && onPier && Math.abs(bedH(px, pz) - W.pierAt(x, z)) > 0.6) { x = px; z = pz; }
    for (let it = 0; it < 2; it++) {
      for (const c of W.circles.concat(W.dyn, vehCircles())) { const dx = x - c.x; const dz = z - c.z; const d = Math.hypot(dx, dz); const m = c.r + R; if (d < m && d > 1e-6) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
      for (const b of W.boxes) { const cx = clamp(x, b.x0, b.x1); const cz = clamp(z, b.z0, b.z1); const dx = x - cx; const dz = z - cz; const d = Math.hypot(dx, dz); if (d < R) { if (d > 1e-6) { x = cx + dx / d * R; z = cz + dz / d * R; } else { const pen = [x - b.x0, b.x1 - x, z - b.z0, b.z1 - z]; const k = pen.indexOf(Math.min(...pen)); if (k === 0) x = b.x0 - R; else if (k === 1) x = b.x1 + R; else if (k === 2) z = b.z0 - R; else z = b.z1 + R; } } }
    } return [x, z];
  }
  function surfaceAt(m) { if (C.W.pierAt(m.x, m.z) !== null) return 'holz'; if (inHouse(m.x, m.z)) return 'haus'; const lv = levels(C.S); if (depthAt(m.x, m.z, lv) > 0.05) return 'wasser'; const mk = maskAt(m.x, m.z); if (mk || bedH(m.x, m.z) < 1.2) return 'sand'; return 'gras'; }
  function walk(dt) {
    const m = C.me; const k = C.keys; let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); let s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); if (C.ui || tour.open || C.scooping) { f = 0; s = 0; }
    const lv = levels(C.S); const dep = depthAt(m.x, m.z, lv); const wade = dep > 0.2 && C.W.pierAt(m.x, m.z) === null ? clamp(1 - dep * 0.45, 0.45, 1) : 1; const run = k.ShiftLeft || k.ShiftRight;
    C.swim = C.W.pierAt(m.x, m.z) === null && dep > EYE - SWIM_EYE - 0.02; // so tief, dass man schwimmt (nur mit dem Skill kommt man hin)
    const len = Math.hypot(f, s) || 1; const sp = C.swim ? 3.1 * (run ? 1.35 : 1) * (hasSkill(C.S, 'delfin') ? 2 : 1) : (run ? 7.2 : 4.6) * wade * (hasSkill(C.S, 'sprint') ? 1.3 : 1); const sn = Math.sin(m.yaw); const cs = Math.cos(m.yaw);
    const wx = (-sn * f + cs * s) / len * sp; const wz = (-cs * f - sn * s) / len * sp; const a = 1 - Math.exp(-dt * 10); m.vx += (wx * (f || s ? 1 : 0) - m.vx) * a; m.vz += (wz * (f || s ? 1 : 0) - m.vz) * a;
    const [x, z] = collide(m.x + m.vx * dt, m.z + m.vz * dt, m.x, m.z); const mw = meerAt(x, z); const gy = Math.max(groundY(x, z), mw >= 0 && C.W.pierAt(x, z) === null ? lv[mw] - EYE + SWIM_EYE + (C.swim ? Math.sin(C.t * 2.2) * 0.04 : 0) : -99); m.y = Math.abs(gy - m.y) > 1.2 ? gy : m.y + (gy - m.y) * Math.min(1, dt * 12); const moved = Math.hypot(x - m.x, z - m.z); m.x = x; m.z = z; m.moving = moved / Math.max(dt, 1e-4);
    if (m.moving > 0.3) { m.bob += dt * m.moving * (C.swim ? 0.8 : 2.2); m.dist += moved; if (m.dist > (C.swim ? 1.8 : m.moving > 5 ? 1.2 : 0.85)) { m.dist = 0; snd.step(C.swim ? 'wasser' : surfaceAt(m), m.moving > 5 ? 1 : 0.7); } } else m.bob *= 0.9;
    C.deepT = Math.max(0, (C.deepT || 0) - dt);
  }
  function eyeCam() { const m = C.me; C.cam.position.set(m.x, m.y + EYE + Math.sin(m.bob * 2) * 0.025 * Math.min(1, m.moving / 2), m.z); C.cam.rotation.set(m.pitch, m.yaw, 0, 'YXZ'); C.cam.fov = 66; }
  function chaseCam(dt) {
    const V = C.veh[C.drive]; const st = V.st; const a = st.h + (C.camYaw || 0); const d = V.k === 'laster' ? 12 : 9; const gy = V.g.position.y; const want = V3(st.x - Math.sin(a) * d, 0, st.z - Math.cos(a) * d); want.y = Math.max(gy, bedH(want.x, want.z), levels(C.S)[Math.max(0, meerAt(want.x, want.z))] || 0) + (V.k === 'laster' ? 4.6 : 3.4) + (C.camPitch || 0) * 6;
    if (!C.chase) C.chase = want.clone(); C.chase.lerp(want, 1 - Math.exp(-dt * 5)); C.camYaw *= Math.exp(-dt * 0.6); const cam = C.cam; cam.position.copy(C.chase); cam.lookAt(st.x + Math.sin(st.h) * 3, gy + 1.6, st.z + Math.cos(st.h) * 3); cam.fov = 62;
  }

  // ---------------- Benutzen: was liegt vor mir? ----------------
  const fwd = V3(); const tmp = V3();
  function nearCounter(x, z, r = 3.2) { for (const hb of HARBOR) if (Math.hypot(hb.counterPos.x - x, hb.counterPos.z - z) < r) return hb; return null; }
  function waterSpot() { // Wasser direkt vor den Füßen (oder man steht drin)
    const m = C.me; const lv = levels(C.S); const sn = -Math.sin(m.yaw); const cs = -Math.cos(m.yaw); const onPier = C.W.pierAt(m.x, m.z) !== null;
    for (const d of onPier ? [1.4, 2.2, 3.0] : [0.9, 1.6, 0, 2.4]) { const x = m.x + sn * d; const z = m.z + cs * d; const mm = meerAt(x, z); if (mm < 0) continue; const dep = lv[mm] - bedH(x, z); if (dep > 0.03 && (!onPier || C.W.pierAt(x, z) === null || d >= 1.4)) return { x, z, m: mm, dep, y: lv[mm] }; }
    return null;
  }
  function targets() {
    const S = C.S; const m = C.me; const eye = V3(m.x, m.y + EYE, m.z); fwd.set(-Math.sin(m.yaw) * Math.cos(m.pitch), Math.sin(m.pitch), -Math.cos(m.yaw) * Math.cos(m.pitch)); const out = []; const me = myId(); const fill = fillOf(S, me);
    const look = (x, y, z) => { tmp.set(x - eye.x, y - eye.y, z - eye.z); const d = tmp.length(); return { d, dot: tmp.dot(fwd) / Math.max(d, 1e-4), flat: Math.hypot(x - m.x, z - m.z) }; };
    // Händler
    for (const hb of HARBOR) { const c = hb.counterPos; const q = look(c.x, c.y + 1.3, c.z); if (q.flat > 3.6 || q.dot < 0.2) continue; const open = hb.i === S.meer || S.done[hb.i]; out.push({ d: q.flat, e: fill > 1e-9 ? { k: 'sell', at: hb.i, text: open ? `Wasser verkaufen: ${liter(fill)} für ${euro(fill * MEERE[S.meer].preis)}` : `${MEERE[hb.i].name}-Händler: erst ab Stufe 2` } : { k: 'shop', text: `Laden öffnen (${MEERE[hb.i].name}-Händler)` }, f: { k: 'shop', text: 'Laden öffnen' } }); }
    // Haus: PC und Bett
    if (inHouse(m.x, m.z)) { const s = HOUSE.screen; const q = look(s.x, s.y, s.z); if (q.flat < 2.0 && q.dot > 0.4) out.push({ d: q.flat - 0.3, e: { k: 'pc', text: 'An den PC setzen (Handy orten, Shop, Statistik)' } }); const b = HOUSE.bed; const qb = look(b.x, BASE_Y + 0.6, b.z); if (qb.flat < 2.2 && qb.dot > 0.35) out.push({ d: qb.flat, e: { k: 'sleep', text: S.clock >= SLEEP_FROM || S.clock < 5 * 60 ? 'Schlafen gehen (bis 8 Uhr)' : `Schlafen geht ab ${clockText(SLEEP_FROM)} Uhr` } }); }
    // Fahrzeuge
    for (const V of Object.values(C.veh)) { const st = V.st; const c = V.def.len / 2 - V.def.rear; const cx = st.x + Math.sin(st.h) * c; const cz = st.z + Math.cos(st.h) * c; const q = look(cx, V.g.position.y + 1.2, cz); if (q.flat < V.def.len / 2 + 1.6 && q.dot > 0.2) out.push({ d: q.flat - 1, e: { k: 'enter', key: V.key, text: `Einsteigen (${VEHICLES[V.k].name})` } }); }
    // Schätze am Meeresboden (liegen frei, wenn das Wasser weg ist)
    const inWater = depthAt(m.x, m.z, levels(S)) > 0.5; // im Wasser kann man (mit dem Skill) runtertauchen
    const dive = (mm, s, free, what, ok) => { if (free) return null; const tief = tiefeUeber(S, mm, s); if (tauchTiefe(S) && inWater && ertauchbar(S, mm, s)) return { ...ok, dive: true, text: `Tauchen (${tief.toFixed(1).replace('.', ',')} m): ${ok.text}` }; return { k: 'info', text: tauchTiefe(S) ? `${what} liegt ${Math.round(tief)} m tief. ${inWater ? 'Zu tief zum Tauchen.' : 'Schwimm hin und tauch runter!'}` : `${what} liegt unter Wasser. Mit den Skills „Schwimmen“ und „Tauchen“ (K) kommst du ran, sonst erst austrocknen.` }; };
    for (let mm = 0; mm < 2; mm++) for (let n = 0; n < SCHATZ[mm].length; n++) { const s = SCHATZ[mm][n]; if (Math.abs(s.x - m.x) > 3 || Math.abs(s.z - m.z) > 3 || S.schatz[mm].includes(n)) continue; const q = look(s.x, s.bed + 0.3, s.z); if (q.flat > 2.4 || (q.dot < 0.25 && !C.swim)) continue; const free = schatzFrei(S, mm, n); const ok = { k: 'schatz', m: mm, n, text: `Bergen: ${({ truhe: 'Schatztruhe', flasche: 'Flaschenpost', anker: 'Alter Anker', krone: 'Goldene Krone' })[s.kind]} (etwa ${euro(schatzWert(mm, s))})` }; out.push({ d: q.flat - 0.5, e: free ? ok : dive(mm, s, free, 'Ein Schatz', ok) }); }
    // Salzkristalle (Meersalz für den Skillbaum)
    for (let mm = 0; mm < 2; mm++) for (let n = 0; n < KRISTALL[mm].length; n++) { const s = KRISTALL[mm][n]; if (Math.abs(s.x - m.x) > 3 || Math.abs(s.z - m.z) > 3 || S.kristall[mm].includes(n)) continue; const q = look(s.x, s.bed + 0.2, s.z); if (q.flat > 2.4 || (q.dot < 0.2 && !C.swim)) continue; const free = kristallFrei(S, mm, n); const ok = { k: 'salz', m: mm, n, text: `Salzkristalle aufsammeln (+${kristallWert(S, s)} Meersalz)` }; out.push({ d: q.flat - 0.45, e: free ? ok : dive(mm, s, free, 'Salzkristall', ok) }); }
    // Tierbecken
    { const q = look(POOL.x, BASE_Y, POOL.z); if (q.flat < POOL.r + 2.4 && q.dot > 0.3) out.push({ d: 9, e: { k: 'info', text: S.flags.tiere[0] || S.flags.tiere[1] ? 'Das Tierbecken: Hier wohnen jetzt die Meerestiere.' : 'Das Tierbecken. Noch leer: Die Tiere schwimmen im Ozean.' } }); }
    // Wasser
    const w = waterSpot(); if (w) { const ok = w.m === S.meer; out.push({ d: 1.2, water: w, e: ok ? { k: 'scoop', m: w.m, text: `E halten: schöpfen mit ${TOOLS[S.tool].name} (${liter(fill)} / ${liter(capOf(S))})` } : { k: 'info', text: w.m === 1 ? 'Der Atlantik kommt später dran. Erst der Pazifik: Da liegt Theos Handy.' : 'Der Pazifik ist schon trocken.' } }); }
    out.sort((a, b) => a.d - b.d); return out[0] || null;
  }
  function interact(key) {
    const t = C.target; if (!t) return; const a = key === 'e' ? t.e : t.f; if (!a) return;
    if (a.k === 'info') { toast(a.text); return; } if (a.k === 'enter') { enterVehicle(a.key); return; }
    if (a.k === 'shop') { openUI('shop'); return; } if (a.k === 'pc') { act({ k: 'pc' }); C.pcTab = 'orten'; openUI('pc'); return; }
    if (a.k === 'sleep') { const r = act({ k: 'sleep' }); if (r && !r.ok) result(r); return; }
    if (a.k === 'sell') { const r = act({ k: 'sell', at: a.at }); if (r && r.ok) snd.play('pour'); else if (r) result(r); return; }
    if (a.k === 'schatz') { const r = act({ k: 'schatz', m: a.m, n: a.n, dive: !!a.dive }); if (r && r.ok) snd.play('fanfare', 0.7); else if (r) result(r); return; }
    if (a.k === 'salz') { const r = act({ k: 'salz', m: a.m, n: a.n, dive: !!a.dive }); if (r && r.ok) snd.play('coin', 0.8); else if (r) result(r); return; }
    if (a.k === 'scoop') { startScoop(); }
  }
  // Schöpfen: E gedrückt halten
  function startScoop() { const w = waterSpot(); if (!w || w.m !== C.S.meer) return; C.scooping = { m: w.m, x: w.x, z: w.z, kind: 'scoop', veh: null, sw: C.swim ? 1 : 0 }; C.scoopT = 0; $('ozMeter').classList.remove('hidden'); const tool = C.S.tool; if (C.deploy[tool]) { const d = C.deploy[tool]; const m = C.me; d.group.position.set(lerp(m.x, w.x, 0.6), groundY(lerp(m.x, w.x, 0.6), lerp(m.z, w.z, 0.6)), lerp(m.z, w.z, 0.6)); d.group.rotation.y = m.yaw + Math.PI / 2; d.group.visible = true; } }
  function stopScoop() { if (!C.scooping) return; C.scooping = null; $('ozMeter').classList.add('hidden'); for (const d of Object.values(C.deploy || {})) d.group.visible = false; }
  function scoopTick(dt) {
    const S = C.S; const sc = C.scooping; if (!sc) return; if (!(C.keys.KeyE || C.keys.Mouse0)) { stopScoop(); return; }
    const w = waterSpot(); if (!w) { toast('Hier ist kein Wasser mehr. Geh weiter ans Wasser ran!', 'bad'); stopScoop(); return; } sc.x = w.x; sc.z = w.z; sc.m = w.m; sc.sw = C.swim ? 1 : 0;
    const me = myId(); const f = fillOf(S, me); const cap = capOf(S); $('ozMeterBar').style.width = `${Math.round(100 * clamp(f / cap, 0, 1))}%`; $('ozMeterT').textContent = `${TOOLS[S.tool].name}: ${liter(f)} / ${liter(cap)}${f >= cap - 1e-9 ? ' · VOLL' : ''}`;
    if (f >= cap - 1e-9 && !hasSkill(S, 'meister')) { if (!C.fullT) { toast(hasSkill(S, 'rohrpost') ? 'Tank voll! Q drücken: Rohrpost zum Händler.' : 'Tank voll! Bring ihn zum Wasserhändler am Steg (E am Händler).', 'gold'); snd.play('gluck'); C.fullT = 4; } stopScoop(); return; }
    C.scoopT = (C.scoopT || 0) + dt; const per = S.tool === 'glas' ? 0.55 : S.tool === 'eimer' ? 0.8 : S.tool === 'handpumpe' ? 0.45 : S.tool === 'feuerwehr' ? 0.16 : 0.25; if (C.scoopT > per) { C.scoopT = 0; snd.play(S.tool === 'handpumpe' ? 'pump' : 'scoop', 0.8, 0.9 + Math.random() * 0.2); C.W.splash(V3(w.x, w.y + 0.05, w.z), S.tool === 'feuerwehr' ? 7 : S.tool === 'motorpumpe' ? 4 : 3, S.tool === 'glas' ? 0.12 : S.tool === 'feuerwehr' ? 0.45 : 0.25); }
    const d = C.deploy[S.tool]; if (d) { const P = d.m ? d.m.parts : d.parts; if (P && P.Handpumpe_Schwengel) P.Handpumpe_Schwengel.rotation.z = Math.sin(C.t * 8) * 0.35; }
  }
  // Host: alle, die gerade schöpfen oder saugen
  function effortsHost(dt) {
    const S = C.S; const list = []; if (C.scooping) list.push([myId(), C.scooping]); for (const [id, e] of Object.entries(C.efforts)) if (C.t - e.t < 0.45 && id !== myId()) list.push([id, e]);
    let ev = []; for (const [who, e] of list) { if (e.kind === 'suck') { suck(S, dt, e.m); C.dirty = true; } else { const r = scoop(S, who, dt, e.m, e.veh || null, !!e.sw); if (r.ok) C.dirty = true;
      if ((r.full || (!r.ok && r.full !== undefined)) && !e.veh && hasSkill(S, 'meister')) { const s2 = sell(S, who, null, S.meer); if (s2.ok) { s2.text = `Rohrpost: ${s2.text}`; C.dirty = true; if (who === myId()) { toast(s2.text, 'gold'); snd.play('pour', 0.5); } else if (C.net) C.net.sendTo(who, { t: 'ores', r: s2 }); } } } } // Meisterschöpfer: voller Tank geht von selbst weg
    checkDry(S, ev); for (const e of ev) onHostEvent(e);
  }

  function firmaUnlocks(f) { const out = []; for (const id of TOOL_ORDER) if (TOOLS[id].firma === f && TOOLS[id].preis) out.push(TOOLS[id].name); for (const id of TANK_ORDER) if (TANKS[id].firma === f && TANKS[id].preis) out.push(TANKS[id].name); for (const [id, v] of Object.entries(VEHICLES)) if (v.firma === f) out.push(v.name); for (const id of HELPER_ORDER) if (HELPERS[id].firma === f) out.push(HELPERS[id].name); for (const id of UP_ORDER) if (UPGRADES[id].firma === f) out.push(UPGRADES[id].name); if (TURBO.firma === f) out.push(TURBO.name); return out; }
  // ---------------- Laden ----------------
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const SHOP_TABS = [['tool', 'Werkzeug'], ['tank', 'Tanks'], ['veh', 'Fahrzeuge'], ['helfer', 'Roboter und Pumpen'], ['up', 'Verbessern']];
  function shopRow(L, again, title, sub, price, btn, o = {}) { const d = el('div', 'oz-item' + (o.off ? ' off' : '')); const a = el('div'); const b = el('b', '', title); if (o.tag) { b.append(el('span', 'tag' + (o.tagOk ? ' ok' : ''), o.tag)); } a.append(b, el('small', '', sub)); const p = el('div', 'pr', price); const bt = el('div', 'btns'); if (btn) { const x = el('button', '', btn[0]); x.type = 'button'; x.disabled = !!btn[2]; x.onclick = () => { const r = act(btn[1]()); result(r); snd.play(r && r.ok ? 'buy' : r ? 'error' : 'ui'); setTimeout(again, 60); }; bt.append(x); } d.append(a, p, bt); L.append(d); }
  function shopRows(L, again) {
    const S = C.S; const row = (it, title, sub) => { const c = canBuy(S, it); const p = priceOf(S, it); shopRow(L, again, title, sub, Number.isFinite(p) ? euro(p) : '–', [c.have ? 'Habt ihr' : c.lock ? 'Gesperrt' : 'Kaufen', () => ({ k: 'buy', item: it }), !c.ok], { off: c.have || c.lock, tag: c.have ? (it.k === 'up' ? 'höchste Stufe' : 'gekauft') : c.lock ? (c.firma !== undefined ? `ab Firmenstufe ${c.firma + 1}` : 'ab Stufe 2') : null, tagOk: !!c.have }); };
    if (C.shopTab === 'tool') for (const id of TOOL_ORDER) { if (!TOOLS[id].preis) continue; const t = TOOLS[id]; row({ k: 'tool', id }, t.name, `${t.rate.toLocaleString('de-DE')} Liter pro Sekunde (mit eurer Technik ${Math.round(t.rate * (1 + UP_STEP * S.up.tool)).toLocaleString('de-DE')}) · ${t.blurb}`); }
    if (C.shopTab === 'up') { for (const id of UP_ORDER) { const u = UPGRADES[id]; const lv = S.up[id] || 0; row({ k: 'up', id }, `${u.name} · Stufe ${lv}/${UP_MAX}`, `${u.blurb} Jetzt +${Math.round(lv * UP_STEP * 100)} %, nächste Stufe +${Math.round((lv + 1) * UP_STEP * 100)} %.${id !== 'tool' && HELPERS[id] ? ` Gerade ${Math.round(helperRateOf(S, id)).toLocaleString('de-DE')} l/s.` : ''}`); } L.append(el('p', 'oz-note', `Firmenstufe ${firmaOf(S) + 1} von ${FIRMA.length}: „${FIRMA[firmaOf(S)].name}“. Jede neue Stufe schaltet im Laden Neues frei.`)); }
    if (C.shopTab === 'tank') for (const id of TANK_ORDER) { if (!TANKS[id].preis) continue; const t = TANKS[id]; row({ k: 'tank', id }, t.name, `${liter(t.cap)} · ${t.blurb}`); }
    if (C.shopTab === 'veh') for (const [id, v] of Object.entries(VEHICLES)) row({ k: 'veh', id }, `${v.name} (${S.veh[id] || 0}/${v.max})`, v.blurb);
    if (C.shopTab === 'helfer') { for (const id of HELPER_ORDER) { const h = HELPERS[id]; row({ k: 'helfer', id }, `${h.name} (${S.helfer[id] || 0}/${helperMax(S, id)})`, `${h.rate.toLocaleString('de-DE')} l/s je Stück${S.up[id] ? ` (+${Math.round(S.up[id] * UP_STEP * 100)} % Verbesserung)` : ''}${S.turbo ? ' (mit Turbo doppelt)' : ''} · ${h.blurb}`); } row({ k: 'turbo' }, TURBO.name, TURBO.blurb); L.append(el('p', 'oz-note', `Alle Roboter zusammen: ${Math.round(helperRate(S)).toLocaleString('de-DE')} Liter pro Sekunde. Sie verkaufen selbst, das Geld kommt direkt in die Kasse.`)); }
  }
  function tabsInto(box, list, cur, set) { box.textContent = ''; for (const [k, n] of list) { const b = el('button', k === cur ? 'sel' : '', n); b.type = 'button'; b.onclick = () => { snd.play('ui'); set(k); }; box.append(b); } }
  function renderShop() { const S = C.S; $('ozShopMoney').textContent = euro(S.geld); const L = $('ozShopList'); const sc = L.scrollTop; L.textContent = ''; tabsInto($('ozShopTabs'), SHOP_TABS, C.shopTab, (k) => { C.shopTab = k; renderShop(); }); L.append(el('p', 'oz-note', `Ihr verkauft ${MEERE[S.meer].name}wasser für ${MEERE[S.meer].preis} € pro Liter. Werkzeug und Tanks gelten für alle im Team.`)); shopRows(L, renderShop); L.scrollTop = sc; }

  // ---------------- Skillbaum (K) ----------------
  function renderSkill() {
    const S = C.S; if (!S) return; C.skillKey = `${S.salz || 0}|${Object.keys(S.skills).join()}`; $('ozSkillSalz').textContent = `${(S.salz || 0).toLocaleString('de-DE')} Meersalz`;
    $('ozSkillHow').textContent = `Meersalz bekommt ihr für jedes Prozent, das der Ozean trockener wird (+${SALZ.prozent}), jede erledigte Aufgabe (+${SALZ.aufgabe}), jede neue Firmenstufe (+${SALZ.firma}), jeden Schatz (+${SALZ.schatz}) und für weiße Salzkristalle am Meeresboden (E, +${SALZ.kristallMin} bis +${SALZ.kristallMax}, tiefer = mehr). Salz und Skills gehören dem ganzen Team. Jeder Skill braucht den darüber.`;
    const T = $('ozSkillTree'); const sc = T.scrollTop; T.textContent = '';
    for (const ast of AESTE) { const col = el('div', 'oz-ast'); col.style.setProperty('--ast', ast.farbe); const hd = el('div', 'oz-asth'); hd.append(el('b', '', ast.name), el('small', '', ast.blurb)); col.append(hd);
      for (const id of SKILL_ORDER.filter((k) => SKILLS[k].ast === ast.id)) { const k = SKILLS[id]; const c = canLearn(S, id); const have = hasSkill(S, id); const node = el('div', 'oz-node' + (have ? ' learned' : c.ok ? ' ready' : c.lock ? ' locked' : ''));
        const top = el('div', 'oz-nodet'); top.append(el('span', 'ic', k.icon), el('b', '', k.name), el('em', '', have ? 'gelernt' : `${k.kosten} Salz`)); node.append(top, el('small', '', k.blurb));
        if (!have) { const b = el('button', c.ok ? 'primary' : '', c.ok ? `Lernen (${k.kosten} Meersalz)` : c.lock ? `Erst „${SKILLS[k.need].name}“` : `Noch ${k.kosten - (S.salz || 0)} Salz`); b.type = 'button'; b.disabled = !c.ok; b.onclick = () => { const r = act({ k: 'skill', id }); result(r); snd.play(r && r.ok ? 'levelup' : r ? 'error' : 'ui'); setTimeout(renderSkill, 60); }; node.append(b); }
        col.append(node); }
      T.append(col); }
    T.scrollTop = sc;
  }

  // ---------------- PC im Haus: OzeanOS ----------------
  const PC_TABS = [['orten', 'Handy orten'], ['shop', 'Online-Shop'], ['stats', 'Statistik'], ['news', 'Nachrichten']];
  function renderPC() {
    const S = C.S; $('ozPCMoney').textContent = euro(S.geld); tabsInto($('ozPCTabs'), PC_TABS, C.pcTab, (k) => { C.pcTab = k; renderPC(); }); const L = $('ozPCBody'); const sc = L.scrollTop; L.textContent = ''; $('ozPCMapBox').classList.toggle('hidden', C.pcTab !== 'orten');
    if (C.pcTab === 'orten') { const goal = S.done[0] ? (S.done[1] ? null : 1) : 0; L.append(el('p', 'oz-note', goal === null ? 'Beide Fundstücke sind geborgen. Das Handy hat Theo, die Kette hat Bruno zurück (gegen Bezahlung).' : goal === 0 ? `Theos Handy: Signal aus dem Pazifik, ${Math.abs(BODEN && levels(S)[0] - bedH(BODEN[0][0], BODEN[0][1])).toFixed(1).replace('.', ',')} m unter Wasser. Akku 87 %. Der blinkende Punkt auf der Karte.` : `Brunos Goldkette: Ortung über Brunos Uhr. Atlantik, ${Math.abs(levels(S)[1] - bedH(BODEN[1][0], BODEN[1][1])).toFixed(1).replace('.', ',')} m tief.`)); drawMap($('ozPCMap'), true); }
    if (C.pcTab === 'shop') { const sub = el('div', 'oz-tabs'); tabsInto(sub, SHOP_TABS, C.shopTab, (k) => { C.shopTab = k; renderPC(); }); L.append(el('p', 'oz-note', 'Online bestellen: Die Lieferung kommt sofort an den Hafen.'), sub); shopRows(L, renderPC); }
    if (C.pcTab === 'stats') { const item = (a, b, c) => { const d = el('div', 'oz-item'); const x = el('div'); x.append(el('b', '', a), el('small', '', b)); d.append(x, el('div', 'pr', c || ''), el('div')); L.append(d); };
      item('Geschöpft insgesamt', 'alle zusammen, mit Robotern', bigLiter(S.stats.liter)); item('Verdient', `ausgegeben: ${euro(S.stats.ausgegeben)}`, euro(S.stats.geld)); item('Nachtschichten der Roboter', 'beim Schlafen', bigLiter(S.stats.nacht)); MEERE.forEach((mm, i) => item(mm.name, S.done[i] ? 'trocken' : i === S.meer ? 'wird gerade ausgetrocknet' : 'kommt noch', `${(drained(S, i) * 100).toFixed(1).replace('.', ',')} %`)); item('Roboter', HELPER_ORDER.map((k) => `${HELPERS[k].name} ${S.helfer[k] || 0}`).join(' · '), `${Math.round(helperRate(S)).toLocaleString('de-DE')} l/s`); item('Tag', `${clockText(S.clock)} Uhr`, String(S.day)); item('Spielzeit', 'seit dem ersten Glas', `${Math.floor((S.stats.spielzeit || 0) / 3600)} h ${Math.floor(((S.stats.spielzeit || 0) % 3600) / 60)} min`); item('Schätze', 'am Meeresboden geborgen', `${S.stats.schaetze || 0} von ${SCHATZ[0].length + SCHATZ[1].length}`); item('Firma', FIRMA[firmaOf(S)].name, `Stufe ${firmaOf(S) + 1}/${FIRMA.length}`); item('Meersalz', `insgesamt verdient: ${(S.stats.salz || 0).toLocaleString('de-DE')} · Salzkristalle: ${S.stats.kristalle || 0} von ${KRISTALL[0].length + KRISTALL[1].length}`, (S.salz || 0).toLocaleString('de-DE')); item('Skills', SKILL_ORDER.filter((k) => hasSkill(S, k)).map((k) => SKILLS[k].name).join(', ') || 'noch keine (Taste K)', `${Object.keys(S.skills).length}/${SKILL_ORDER.length}`); }
    if (C.pcTab === 'news') for (const [src, text] of news(S)) { const d = el('div', 'oz-item'); const x = el('div'); x.append(el('small', '', src), el('b', '', text)); d.append(x, el('div'), el('div')); L.append(d); }
    L.scrollTop = sc;
  }
  // ---------------- Karte (M und PC) ----------------
  let base = null; let baseKey = '';
  function mapBase(S) { const lv = levels(S); const key = `${lv[0].toFixed(1)}|${lv[1].toFixed(1)}|${S.done}`; if (base && key === baseKey) return base; baseKey = key; const { nx, nz } = GRID; const c = base || document.createElement('canvas'); c.width = nx; c.height = nz; const x = c.getContext('2d'); const img = x.createImageData(nx, nz);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const k = j * nx + i; const wx = GRID.x0 + i * GRID.cell; const wz = GRID.z0 + j * GRID.cell; const h = bedH(wx, wz); const m = maskAt(wx, wz); let r; let g; let b; if (m && h < lv[m - 1]) { const d = clamp((lv[m - 1] - h) / 10, 0, 1); r = 60 - d * 40; g = 150 - d * 90; b = 210 - d * 80; } else if (m) { r = 214; g = 196; b = 150; } else { const k2 = clamp(h / 30, 0, 1); r = 96 + k2 * 80; g = 140 + k2 * 40; b = 80 + k2 * 80; if (h < 1.2) { r = 214; g = 200; b = 150; } } img.data[k * 4] = r; img.data[k * 4 + 1] = g; img.data[k * 4 + 2] = b; img.data[k * 4 + 3] = 255; }
    x.putImageData(img, 0, 0); base = c; return c; }
  function drawMap(cv, small) {
    const w = cv.clientWidth || 600; const h = cv.clientHeight || 400; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } const c = cv.getContext('2d'); const S = C.S; const me = C.drive ? C.veh[C.drive].st : C.me;
    const zoom = small ? 1 : C.mapZoom; const sc = Math.min(w / (GRID.x1 - GRID.x0), h / (GRID.z1 - GRID.z0)) * zoom; const cx = zoom > 1.4 ? me.x : (GRID.x0 + GRID.x1) / 2; const cz = zoom > 1.4 ? me.z : (GRID.z0 + GRID.z1) / 2; const X = (x) => w / 2 + (x - cx) * sc; const Z = (z) => h / 2 + (z - cz) * sc;
    c.fillStyle = '#081420'; c.fillRect(0, 0, w, h); c.imageSmoothingEnabled = true; c.drawImage(mapBase(S), X(GRID.x0), Z(GRID.z0), (GRID.x1 - GRID.x0) * sc, (GRID.z1 - GRID.z0) * sc);
    c.font = `700 ${Math.max(13, Math.min(22, 7 * sc))}px Bahnschrift`; c.textAlign = 'center'; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillText('PAZIFIK', X(-220), Z(120)); c.fillText('ATLANTIK', X(240), Z(110));
    c.fillStyle = '#c5161d'; c.fillRect(X(HOUSE.x0) - 3, Z(HOUSE.z0) - 3, 8 * sc + 6, 6 * sc + 6); c.fillStyle = '#fff'; c.font = '700 13px Bahnschrift'; c.fillText('Haus', X(HOUSE.x), Z(HOUSE.z0) - 8); c.fillStyle = '#3aa0d0'; c.beginPath(); c.arc(X(POOL.x), Z(POOL.z), POOL.r * sc, 0, 7); c.fill();
    for (const hb of HARBOR) { c.strokeStyle = '#8a6a48'; c.lineWidth = Math.max(2, 2.6 * sc); c.beginPath(); c.moveTo(X(hb.pier.x0), Z(hb.pier.z0)); c.lineTo(X(hb.pier.x1), Z(hb.pier.z1)); c.stroke(); c.fillStyle = '#0a4f9c'; c.fillRect(X(hb.booth.x) - 7, Z(hb.booth.z) - 7, 14, 14); c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(X(hb.booth.x) - 7, Z(hb.booth.z) - 7, 14, 14); c.fillStyle = '#fff'; c.textAlign = hb.i ? 'left' : 'right'; c.fillText(`${MEERE[hb.i].name}-Händler`, X(hb.booth.x) + (hb.i ? 12 : -12), Z(hb.booth.z) + 18); c.textAlign = 'center'; }
    // Schätze: frei liegende golden, noch unter Wasser als blasser Ring
    for (let mm = 0; mm < 2; mm++) SCHATZ[mm].forEach((s, n) => { if (S.schatz[mm].includes(n)) return; const free = schatzFrei(S, mm, n); c.fillStyle = free ? '#ffd040' : 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(X(s.x), Z(s.z), free ? 5 : 3, 0, 7); c.fill(); if (free) { c.strokeStyle = '#141518'; c.lineWidth = 1.5; c.stroke(); } });
    // Salzkristalle: kleine weiße Punkte (blass, solange sie unter Wasser liegen)
    for (let mm = 0; mm < 2; mm++) KRISTALL[mm].forEach((s, n) => { if (S.kristall[mm].includes(n)) return; const free = kristallFrei(S, mm, n); c.fillStyle = free ? '#ffffff' : 'rgba(220,240,255,.3)'; c.fillRect(X(s.x) - (free ? 2.5 : 1.5), Z(s.z) - (free ? 2.5 : 1.5), free ? 5 : 3, free ? 5 : 3); });
    // Fundstück blinkt
    const goal = S.done[0] ? (S.done[1] ? -1 : 1) : 0; if (goal >= 0 && Math.sin(C.t * 6) > -0.2) { const p = BODEN[goal]; c.strokeStyle = goal ? '#ffd060' : '#7ac8ff'; c.lineWidth = 3; c.beginPath(); c.arc(X(p[0]), Z(p[1]), 9 + Math.sin(C.t * 6) * 3, 0, 7); c.stroke(); c.fillStyle = c.strokeStyle; c.fillText(goal ? 'Goldkette' : 'Theos Handy', X(p[0]), Z(p[1]) - 16); }
    for (const V of Object.values(C.veh)) { c.save(); c.translate(X(V.st.x), Z(V.st.z)); c.rotate(-V.st.h); c.fillStyle = V.k === 'laster' ? '#2c62c8' : '#f9bd00'; c.fillRect(-4, -3, 8, Math.max(10, V.def.len * sc)); c.restore(); }
    const dot = (x, z, yaw, col, label) => { c.save(); c.translate(X(x), Z(z)); c.rotate(-yaw); c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 6); c.lineTo(-6, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); if (label) { c.fillStyle = col; c.font = '700 13px Bahnschrift'; c.fillText(label, X(x), Z(z) + 22); } };
    for (const r of C.remotes.values()) dot(r.x, r.z, r.yaw + Math.PI, LOOKS[seatOf(r.id)].col, r.name); dot(me.x, me.z, C.drive ? me.h + Math.PI : C.me.yaw, LOOKS[C.net ? seatOf(myId()) : 0].col, 'Du');
  }
  // Bildschirm am PC (Weltobjekt)
  function pcScreen() { const S = C.S; const cv = C.W.pcCanvas; const c = cv.getContext('2d'); c.fillStyle = '#0a2a4a'; c.fillRect(0, 0, 512, 300); c.fillStyle = '#0a4f9c'; c.fillRect(0, 0, 512, 46); c.fillStyle = '#f9bd00'; c.font = '800 26px Bahnschrift'; c.textAlign = 'left'; c.fillText('OzeanOS', 14, 32); c.fillStyle = '#e2ebf6'; c.textAlign = 'right'; c.fillText(clockText(S.clock), 498, 32); c.textAlign = 'left'; c.font = '700 24px Bahnschrift'; c.fillText(`${MEERE[S.meer].name}: ${(drained(S) * 100).toFixed(1).replace('.', ',')} % trocken`, 18, 92); c.fillStyle = '#7affb8'; c.fillText(`Kasse ${euro(S.geld)}`, 18, 130); c.fillStyle = '#e2ebf6'; c.font = '600 21px Bahnschrift'; c.fillText(S.done[0] ? 'Handy gefunden ✓' : 'Handy-Signal: Pazifik, ganz unten', 18, 170); c.fillText(S.clock >= SLEEP_FROM || S.clock < 300 ? 'Bett: Schlafen möglich' : `Bett: ab ${clockText(SLEEP_FROM)} Uhr`, 18, 202); c.fillStyle = '#f9bd00'; c.font = '800 24px Bahnschrift'; c.fillText('E: an den PC setzen', 18, 266); C.W.pcTex.needsUpdate = true; }

  // ---------------- Netz ----------------
  function netTick(dt) {
    if (!C.net) return; C.sendT += dt; if (C.sendT < NET_HZ) return; C.sendT = 0; const m = C.me; const V = C.drive ? C.veh[C.drive] : null; const r2 = (v) => Math.round(v * 100) / 100; const sc = C.scooping;
    const d = { x: r2(m.x), y: r2(m.y), z: r2(m.z), yaw: r2(m.yaw), mv: m.moving > 0.3 ? r2(m.moving) : 0, drive: C.drive || null, vs: V ? { x: r2(V.st.x), z: r2(V.st.z), h: r2(V.st.h), v: r2(V.st.v), s: r2(V.st.steer) } : null, sc: sc ? { m: sc.m, veh: sc.veh || null, kind: sc.kind, sw: sc.sw || 0 } : null, tool: C.S ? C.S.tool : 'glas', name: myName() };
    if (C.host) { const all = { [myId()]: d }; for (const [id, r] of C.remotes) if (r.last) all[id] = r.last; C.net.broadcast({ t: 'opl', p: all }); if (C.dirty && (C.castT += NET_HZ) > 0.25) { C.castT = 0; C.dirty = false; pushState(); } } else C.net.send({ t: 'omv', ...d });
  }
  function onPos(id, d) {
    if (id === myId()) return; const r = ensureFigure(id); r.last = d; r.name = d.name || r.name; if (r.label.userData.text !== r.name) { C.W.scene.remove(r.label); r.label = nameSprite(r.name, LOOKS[seatOf(id)].col); C.W.scene.add(r.label); }
    r.tx = d.x; r.ty = d.y; r.tz = d.z; r.tyaw = d.yaw + Math.PI; r.drive = d.drive; r.mv = d.mv; r.sc = d.sc; r.tool = d.tool;
    if (C.host) { if (d.sc) C.efforts[id] = { t: C.t, m: d.sc.m, veh: d.sc.veh, kind: d.sc.kind, sw: d.sc.sw || 0 }; else delete C.efforts[id]; }
    if (d.drive && d.vs && C.veh[d.drive] && C.drive !== d.drive) { const st = C.veh[d.drive].st; st.tx = d.vs.x; st.tz = d.vs.z; st.th = d.vs.h; st.v = d.vs.v; st.steer = d.vs.s; if (C.host) C.S.vpos[d.drive] = { x: d.vs.x, z: d.vs.z, h: d.vs.h }; }
  }
  function remotesTick(dt) {
    for (const r of C.remotes.values()) { const k = 1 - Math.exp(-dt * 10); r.x = lerp(r.x, r.tx, k); r.y = lerp(r.y, r.ty, k); r.z = lerp(r.z, r.tz, k); let dy = r.tyaw - r.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.yaw += dy * k;
      const vis = !r.drive; r.p.setVisible(vis); r.label.visible = vis; if (!vis) continue; r.p.place(r.x, r.y, r.z, r.yaw); r.p.mode = r.mv > 0.3 ? 'walk' : 'stand'; r.p.speed = r.mv || 0; r.p.act = r.sc ? 'counter' : 0; r.p.setTool(r.tool === 'glas' || r.tool === 'eimer' ? r.tool : null); r.p.tank.setFill(C.S ? fillOf(C.S, r.id) / capOf(C.S) : 0); r.p.update(dt, C.t); r.label.position.set(r.x, r.y + 2.15, r.z);
      if (r.sc && Math.random() < dt * 3) C.W.splash(V3(r.x + Math.sin(r.yaw) * 1.2, levels(C.S)[r.sc.m] + 0.05, r.z + Math.cos(r.yaw) * 1.2), 2, 0.18); }
    for (const V of Object.values(C.veh)) { const st = V.st; if (st.tx === undefined || C.drive === V.key) continue; if (!driverOf(V.key)) { st.tx = undefined; continue; } const k = 1 - Math.exp(-dt * 12); st.x = lerp(st.x, st.tx, k); st.z = lerp(st.z, st.tz, k); let dh = st.th - st.h; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2; st.h += dh * k; }
  }
  function message(from, m) {
    if (C.loading) { (C.queue = C.queue || []).push([from, m]); return; }
    if (m.t === 'ost' && !C.host) { const first = !C.S || C.firstCast; C.S = fixSave(m.S); C.firstCast = false; for (const key of Object.keys(C.veh)) { const p = C.S.vpos[key]; const V = C.veh[key]; if (p && V && C.drive !== key && !driverOf(key)) Object.assign(V.st, { x: p.x, z: p.z, h: p.h }); } applyWorld(); refresh(); if (first) { spawn(); if (!C.S.scene.intro || C.S.stats.liter < 0.01) ST.play('intro'); } return; }
    if (m.t === 'oev' && !C.host) { if (m.ev.not && m.ev.not === myId()) return; onEvent(m.ev); return; }
    if (m.t === 'ores') { result(m.r); refresh(); return; }
    if (m.t === 'opl' && !C.host) { for (const [id, d] of Object.entries(m.p)) onPos(id, d); return; }
    if (m.t === 'omv' && C.host) { onPos(from, m); return; }
    if (m.t === 'odo' && C.host) doAct(from, m.a || {});
  }
  function onEvent(ev) {
    if (ev.k === 'msg') toast(ev.text, ev.kind || ''); else if (ev.k === 'box') showBox(ev.box); else if (ev.k === 'schatz') { toast(`${ev.who}: ${ev.text}`, 'gold'); snd.play('coin', 0.7); }
    else if (ev.k === 'firma') { snd.play('levelup'); const f = FIRMA[ev.stufe]; const neu = firmaUnlocks(ev.stufe); showBox({ s: `Firmenstufe ${ev.stufe + 1} von ${FIRMA.length}`, h: f.name, t: neu.length ? `Neu im Laden: ${neu.join(', ')}.` : 'Weiter so!', answers: [['Stark', null, true]] }); } else if (ev.k === 'sold') { toast(`${ev.who}: ${ev.text}`, 'gold'); snd.play('coin', 0.6); } else if (ev.k === 'report') showReport(ev.rep);
    else if (ev.k === 'trocken') { if (C.ui) closeUI(); unlock(); stopScoop(); if (C.drive) { const V = C.veh[C.drive]; if (V && V.k === 'uboot') { C.drive = null; $('ozDrive').classList.add('hidden'); $('ozCross').classList.remove('hidden'); } } ST.play(ev.meer === 0 ? 'mitte' : 'ende', { S: C.S }); }
    else if (ev.k === 'film') ST.play(ev.id, { S: C.S });
  }
  // Nach den Filmszenen
  function storyEnd(kind, info = {}) {
    const S = C.S; if (info.replay) { eyeCam(); refresh(); return; } if (isHost() && S) { if (kind === 'intro') S.scene.intro = true; if (kind === 'mitte') S.scene.mitte = true; if (kind === 'ende') S.scene.ende = true; changed(); save(); }
    if (kind === 'mitte') { for (const V of Object.values(C.veh)) { const p = vehSpawn(V.key); Object.assign(V.st, { x: p.x, z: p.z, h: p.h, v: 0 }); } spawn(true); showBox({ s: 'Stufe 2', h: 'Auf zum Atlantik!', t: 'Theos Handy ist gerettet. Aber Bruno hat seine Goldkette in den Atlantik geworfen und wettet, dass ihr den nie leer kriegt.\n\nIhr steht jetzt am Atlantik-Steg (östlich vom Haus). Hier zahlt der Händler 2 € pro Liter. Eure Roboter und Fahrzeuge sind mit umgezogen.', answers: [['Los geht\'s', null, true]] }); }
    else if (kind === 'ende') showBox({ s: 'Das Ende', h: 'Beide Ozeane sind staubtrocken!', t: `Ihr habt den Pazifik und den Atlantik ausgetrocknet: ${bigLiter(S ? S.stats.liter : 0)} in ${S ? S.day : 1} Tagen. Theo hat sein Handy, Bruno seine Kette und die Tiere einen Pool.\n\nDas Spiel ist geschafft. Den Abspann gibt es im Pause-Menü noch einmal.`, answers: [['Weiterspielen', null, true]] });
    else { eyeCam(); hint('Klick ins Bild, damit die Maus einrastet · W A S D laufen · E benutzen (am Wasser gedrückt halten) · F Laden · K Skillbaum · M Karte'); snd.play('quest'); }
    refresh();
  }
  function playerJoined(id, name) { C.net.sendTo(id, { t: 'start', mode: 'ozean' }); setTimeout(pushState, 400); toast(`${name} ist am Ozean angekommen.`); }
  function playerLeft(id) { const r = C.remotes.get(id); if (r) { r.p.setVisible(false); r.p.remove && r.p.remove(); C.W.scene.remove(r.label); C.remotes.delete(id); } delete C.efforts[id]; if (C.S && isHost()) { for (const [key, V] of Object.entries(C.veh)) if (r && r.drive === key) C.S.vpos[key] = { x: V.st.x, z: V.st.z, h: V.st.h }; changed(); } }

  // ---------------- Host: Zeit, Roboter, Ozean ----------------
  function hostTick(dt) {
    const S = C.S; effortsHost(dt); const ev = tick(S, dt); for (const e of ev) onHostEvent(e);
    if ((C.uiT = (C.uiT || 0) + dt) > 0.25) { C.uiT = 0; C.dirty = true; applyWorld(); refresh(); } if ((C.saveT += dt) > 20) { C.saveT = 0; save(); }
  }

  // ---------------- Ablauf ----------------
  function spawn(second) { const m = C.me; const S = C.S; const k = C.net ? seatOf(myId()) : 0; const hb = HARBOR[S ? S.meer : 0]; if (!second && S && S.stats.liter < 0.01 && S.meer === 0) { m.x = HOUSE.x + 1.8 + (k - 1) * 1.1; m.z = HOUSE.z + 6.5; m.yaw = Math.atan2(-(hb.booth.x - m.x), -(hb.booth.z - m.z)); } else { m.x = hb.spawn.x + (k - 1) * 1.2; m.z = hb.spawn.z; m.yaw = Math.atan2(hb.dir.x, hb.dir.z) + Math.PI; } m.y = groundY(m.x, m.z); m.pitch = -0.08; m.vx = 0; m.vz = 0; eyeCam(); }
  const nextPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  function showLoad(on, text) { $('ozLoad').classList.toggle('hidden', !on); if (text) $('ozLoadT').textContent = text; }
  async function enterAsync() {
    hud.classList.remove('hidden'); hud.classList.add('oz-menu'); G.mode = 'ozean'; showScreen(null); $('hud').classList.add('hidden'); C.loading = true; C.queue = [];
    if (!C.W) { showLoad(true, 'Der Ozean wird eingelassen …'); await nextPaint(); build(); showLoad(true, 'Die Fische werden ausgesetzt …'); await nextPaint(); try { const rt = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType }); const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); C.cam.position.set(0, 3, 10); C.cam.lookAt(-40, 0, 30); C.cam.updateMatrixWorld(); await renderer.compileAsync(C.W.scene, C.cam); renderer.setRenderTarget(prev); rt.dispose(); } catch (e) { /* geht auch so */ } }
    showLoad(false); hud.classList.remove('oz-menu'); post.setLevel(getQuality()); post.reset(); C.on = true; C.keys = {}; closeUI(); audio.init(); snd.init();
  }
  function flush() { C.loading = false; const q = C.queue || []; C.queue = []; for (const [f, m] of q) message(f, m); }
  async function openSlot(id) { C.net = null; C.host = true; await enterAsync(); C.slot = id || saves.last() || saves.create('Mein Ozean'); C.S = saves.load(C.slot); begin(); flush(); }
  function begin() { C.drive = null; stopScoop(); for (const V of Object.values(C.veh)) { C.W.scene.remove(V.g); } C.veh = {}; lastMeer = -1; C.poolState = undefined; C.W.helpers.key = ''; C.questSeen = undefined; C.salzSeen = undefined; C.learnSeen = undefined; C.kristKey = undefined; C.schatzKey = undefined; C.swim = false; applyWorld(); refresh(); spawn(); if (isHost() && C.S && !C.S.scene.intro) { broadcast({ k: 'film', id: 'intro' }); ST.play('intro', { S: C.S }); } else hint('Klick ins Bild, damit die Maus einrastet · W A S D laufen · E benutzen · F Laden · K Skillbaum · M Karte' + (ctx.fullscreen && !ctx.fullscreen.on ? ' · F11 Vollbild' : '')); $('ozDrive').classList.add('hidden'); $('ozMeter').classList.add('hidden'); $('ozCross').classList.remove('hidden'); $('ozFade').classList.remove('on'); }
  async function startCoop({ net, host, slot }) { /* slot: in der Lobby gewählter Spielstand */ C.net = net; C.host = host; await enterAsync(); if (C.net !== net) { C.loading = false; return; } if (host) { C.slot = (slot && saves.get(slot) ? slot : null) || saves.last() || saves.create('Online-Ozean'); C.S = saves.load(C.slot); begin(); setTimeout(pushState, 300); } else { C.S = fixSave(null); C.firstCast = true; begin(); } flush(); }
  function back() { if (C.net) { stop(); endSession(); return; } stop(); showScreen('gallery'); }
  function stop() { if (!C.on && !C.loading) return; if (ST.on) ST.finish(false); save(); C.on = false; C.loading = false; unlock(); closeUI(); stopScoop(); hud.classList.add('hidden'); C.boxQ = []; $('ozBox').classList.add('hidden'); snd.quiet(); audio.update({ kmh: 0, rpm: 900, throttle: 0, surface: 'road', slip: 0 }, false); for (const r of C.remotes.values()) { r.p.setVisible(false); C.W.scene.remove(r.label); r.p.remove && r.p.remove(); } C.remotes.clear(); C.efforts = {}; C.drive = null; C.net = null; C.host = true; if (G.mode === 'ozean') G.mode = 'menu'; tour.open = false; tour.el.classList.add('hidden'); }
  $('ozResume').onclick = closeUI; $('ozIntro').onclick = () => { closeUI(); unlock(); ST.play('intro', { S: C.S }); }; $('ozMitte').onclick = () => { closeUI(); unlock(); ST.play('mitte', { S: C.S, replay: true }); }; $('ozOutro').onclick = () => { closeUI(); unlock(); ST.play('ende', { S: C.S, replay: true }); }; $('ozHelp').onclick = () => { closeUI(); tour.show(); }; $('ozFull').onclick = () => { if (ctx.fullscreen) ctx.fullscreen.toggle(); }; $('ozSkillBtn').onclick = () => { closeUI(); openUI('skill'); }; $('ozSkillClose').onclick = closeUI; $('ozQuit').onclick = () => { closeUI(); back(); }; $('ozShopClose').onclick = closeUI; $('ozPCClose').onclick = closeUI; $('ozMapClose').onclick = closeUI;

  // ---------------- Bild ----------------
  function frame(dt, tAbs) {
    if (!C.on || !C.W || !C.S) return; const real = Math.min(dt, 0.1); C.t += real; const W = C.W; const S = C.S;
    if (isHost()) { if (!(ST.on && !C.net)) hostTick(real); } else { S.clock = (S.clock + real * MIN_PER_SEC) % 1440; if ((C.uiT = (C.uiT || 0) + real) > 0.5) { C.uiT = 0; applyWorld(); refresh(); } }
    if (ST.on) { ST.step(real); if (ST.on) { W.setLevels(ST.levels ? ST.levels() : levels(S), ST.dry ? ST.dry() : S.done); W.update(tAbs, real, C.cam.position, S); snd.ambience(real, { coast: 0.6, inside: false, night: false, pumps: 0, under: ST.under(), t: C.t }); netTick(real); draw(real, tAbs, ST.mood(W.mood)); return; } }
    const busy = C.ui || tour.open;
    if (C.drive) { driveTick(real); chaseCam(real); C.target = null; $('ozPrompt').classList.add('hidden'); }
    else { if (!busy) { walk(real); scoopTick(real); } eyeCam(); C.target = busy || C.scooping ? null : targets(); const pr = $('ozPrompt'); if (C.target && (C.target.e || C.target.f)) { $('ozPE').classList.toggle('hidden', !C.target.e); $('ozPF').classList.toggle('hidden', !C.target.f); if (C.target.e) $('ozPromptT').textContent = C.target.e.text; if (C.target.f) $('ozPromptT2').textContent = C.target.f.text; pr.classList.remove('hidden'); } else pr.classList.add('hidden'); }
    // Werkzeug in der Hand
    { const id = !C.drive && (S.tool === 'glas' || S.tool === 'eimer') ? S.tool : null; const T = C.fpTool; if (T.id !== id) { if (T.m) T.piv.remove(T.m.group); T.m = id ? handTool(id) : null; T.water = null; if (T.m) { T.m.group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 6; if (o.userData.mat === 'Glas') o.material = GLASS_MAT; } }); T.m.group.rotation.y = Math.PI / 2; T.piv.add(T.m.group); if (id === 'glas') { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 1, 20).translate(0, 0.5, 0), WATER_MAT); w.position.y = 0.006; w.renderOrder = 5; T.m.group.add(w); T.water = w; } } T.id = id; }
      if (T.water) { const k = clamp(fillOf(S, myId()) / capOf(S), 0, 1); T.water.visible = k > 0.01; T.water.scale.y = Math.max(0.001, 0.105 * k); } const dip = C.scooping ? Math.max(0, Math.sin(C.t * (S.tool === 'glas' ? 11 : 8))) : 0; T.piv.position.set(0.3, -0.42 - dip * 0.25, -0.6 - dip * 0.12); T.piv.rotation.set(-dip * 0.9, 0, 0); T.piv.visible = !!id; }
    vehVisual(real); remotesTick(real); pipesTick(); netTick(real);
    if (C.ui === 'map') drawMap($('ozMapC'), false); if (C.ui === 'pc' && C.pcTab === 'orten') drawMap($('ozPCMap'), true);
    if (C.toastT > 0) { C.toastT -= real; if (C.toastT <= 0) $('ozToast').classList.remove('on'); } C.fullT = Math.max(0, C.fullT - real);
    if ((C.pcT = (C.pcT || 0) + real) > 1) { C.pcT = 0; pcScreen(); }
    if (C.net && (C.plT = (C.plT || 0) + real) > 1) { C.plT = 0; const box = $('ozPlayers'); box.textContent = ''; for (const p of C.net.players) { const d = document.createElement('div'); const i = document.createElement('i'); i.style.background = LOOKS[seatOf(p.id)].col; const b = document.createElement('b'); b.textContent = p.name + (p.id === myId() ? ' (du)' : ''); const s = document.createElement('small'); s.textContent = liter(fillOf(S, p.id)); d.append(i, b, s); box.append(d); } }
    W.setTime(S.clock); const cam = C.cam; C.fp.position.copy(cam.position); C.fp.quaternion.copy(cam.quaternion); W.update(tAbs, real, cam.position, S);
    const m = C.me; const p = C.drive ? C.veh[C.drive].st : m; const lv = levels(S); let coast = 0; for (const d of [0, 8, 18, 32]) for (const a of [0, 1.6, 3.2, 4.8]) { if (depthAt(p.x + Math.sin(a) * d, p.z + Math.cos(a) * d, lv) > 0.05) { coast = Math.max(coast, 1 - d / 40); } }
    snd.ambience(real, { coast, inside: !C.drive && inHouse(m.x, m.z), night: W.night, pumps: Math.min(1, (S.helfer.xxxxl || 0) * 0.4 + (S.helfer.pump || 0) * 0.05) * (Math.hypot(p.x - HARBOR[S.meer].booth.x, p.z - HARBOR[S.meer].booth.z) < 60 ? 1 : 0.2), under: false, t: C.t });
    draw(real, tAbs, W.mood);
  }
  function draw(real, tAbs, mood) {
    const W = C.W; const cam = C.cam; post.watch(real, true); const dprNow = Math.min(window.devicePixelRatio || 1, 1.5); if (renderer.getPixelRatio() !== dprNow) { renderer.setPixelRatio(dprNow); renderer.setSize(window.innerWidth, window.innerHeight, false); }
    cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); if (cam.aspect < 1.3) cam.fov = cam.fov * 1.3 / cam.aspect; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); renderer.shadowMap.needsUpdate = settings.shadows;
    post.render(W.scene, cam, { mood, sky: W.sky, sun: W.sun, sunDir: W.sunDir, dt: real, time: tAbs, speed: C.drive ? Math.abs(C.veh[C.drive].st.v) * 3.6 : 0, nitro: 0, ground: 0, camPos: cam.position });
  }
  // Für Tests
  const debug = { goTo: (x, z, yaw = 0, pitch = 0) => { const m = C.me; m.x = x; m.z = z; m.yaw = yaw; m.pitch = pitch; m.y = groundY(x, z); m.vx = 0; m.vz = 0; }, act: (a) => act(a), target: () => C.target, interact, enterVehicle, exitVehicle, hold: (code, on) => { C.keys[code] = !!on; }, startScoop, stopScoop, scooping: () => C.scooping,
    openUI, closeUI, box: () => (C.boxQ[0] ? { h: C.boxQ[0].h, n: C.boxQ.length } : null), clickBox: (i = 0) => { const b = $('ozBoxA').children[i]; if (b) b.click(); }, changed, story: ST, skipStory: () => ST.finish(), waterSpot, harbor: HARBOR, groundY, drain: (i, k) => { C.S.rest[i] = Math.max(0, C.S.rest[i] - MEERE[i].liter * k); const ev = checkDry(C.S); for (const e of ev) onHostEvent(e); changed(); }, rich: (v = 1e9) => { C.S.geld = v; changed(); }, salz: (v = 1000) => { C.S.salz = v; changed(); }, swim: () => !!C.swim, kristall: () => KRISTALL[C.S.meer].map((q, n) => ({ ...q, n, taken: C.S.kristall[C.S.meer].includes(n), free: kristallFrei(C.S, C.S.meer, n) })), levels: () => levels(C.S), vehicles: () => Object.keys(C.veh), house: HOUSE, pool: POOL, schatz: () => SCHATZ[C.S.meer].map((q, n) => ({ ...q, n, taken: C.S.schatz[C.S.meer].includes(n) })).filter((q) => !q.taken), sleepNow: () => { C.S.clock = SLEEP_FROM + 5; return act({ k: 'sleep' }); }, map: () => drawMap($('ozMapC'), false), snd };
  return { play: openSlot, stop, frame, startCoop, message, playerJoined, playerLeft, active: () => C.on, hide: () => {}, tour, state: C, debug, saves };
}
