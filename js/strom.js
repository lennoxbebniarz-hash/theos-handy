// Theos Seitenscheidel - Strom aus wegen Brunos Geschirrspüler (früher „Stromhalle“, intern strom): illegal Strom machen. Mit der Handkurbel anfangen (E halten), Speicher mit dem Pickup
// durch die Stadt zum Energiedepot fahren, beim Auftraggeber im Wald-Bunker Aufträge holen (nur dafür gibt es XP und Level), beim
// Schwarzmarkt bessere Erzeuger kaufen, Kabel ziehen, Bäume fällen, Kohle abbauen, am PC im Büro bestellen und schlafen, die Polizei abwimmeln.
// Ego-Perspektive zu Fuß, Verfolgerkamera im Auto. Mehrspieler: bis zu drei, der Host rechnet den Spielstand, die anderen schicken Wünsche.
import * as THREE from './vendor/three.module.min.js';
import { GEN, GENS, CHARGERS, CHARGER, STORES, VEHICLES, FUELS, TOOLS, FOOD, SPOTS, HALL, OFFICE, CITY, DOENER, BOUNDS, CARRY_MAX, CABLE_PRICE, MIN_PER_SEC, DAY_END, SLEEP_FROM, MINE_LVL, MAX_LVL, TREES, TREE_HITS, newSave, fixSave, tick, buy, connect, disconnect, toggle, feed, gather, pick, place, sell, loadContainer, unloadContainer, genOf, linkOf, storeAt, vehLoad, cablesFor, euro, kwh, clockText, dayInfo, weatherFor, weatherText, rainAt, stormNow, windAt, sunAt, priceFor, priceOf, offerOfWeek, countOf, policeQuestions, policeVerdict, policeIgnored, QUESTIONS, OFFICER, genLevel, genPos, clamp, riverX, sleep, jobOffers, acceptJob, deliverJob, questNow, xpSpan, unlocksAt, buffOf, eat, chop, takeDrop, treeStage, dist, jobDue, addFourth, BENCHES } from './stromlogic.js';
import { buildStromWorld, groundY, terrainH, inHall, inOffice, inBunker, inStairs, isInside, STAIRS, MINE, BUNKER, DEPOT, COAL, ROAD_Z, BRIDGE_X } from './stromworld.js';
import { buildModel, stromPerson, personPlain, LOOKS, NPC } from './stromart.js';
import { createStromSound } from './stromsound.js';
import { createStory } from './stromstory.js';
import { walkTo } from './casinofig.js';
import { kannMuskel, poseMuskel } from './stromrad.js';
import { buildVehicle } from './parkart.js';
import { VEH, stepVeh, createVehState } from './parklogic.js';
import { createSaves } from './casinosaves.js';
import { createTour } from './tour.js';
import { spriteBlend } from './raceinterior.js';
import { step as simStep, createState as simState, CAR as SIMCAR } from './sim.js'; // Beschleunigung, Bremse und Handbremse wie im Rennmodus

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const lerp = (a, b, t) => a + (b - a) * t;
const EYE = 1.62; const R = 0.3; const NET_HZ = 1 / 12; const SKY = { sonnig: '☀', wolkig: '☁', regen: '🌧', gewitter: '⛈' }; const skyOf = (w) => SKY[w.kind === 'wolkig' && w.regen ? 'regen' : w.kind];
const PICKUP_DEF = { name: 'Pickup', len: 5.45, w: 2.0, h: 1.9, wb: 3.37, rear: 1.11, steer: 0.62, gears: [95, 95, 95, 22], acc: 5.5 };
const vdef = (k) => (k === 'pickup' ? PICKUP_DEF : { ...VEH[VEHICLES[k].park], gears: Array(3).fill(VEHICLES[k].top).concat([18]), acc: 3.6 });
const BED = [[-0.45, -1.15], [0.45, -1.15], [-0.45, -2.15], [0.45, -2.15]]; // Ladefläche des Pickups (Modell-Koordinaten)
const MUSCLE = { kurbel: 'Kurbeln', fahrrad: 'Treten', laufrad: 'Rennen' };
const POLICE_PATH = [[120, ROAD_Z - 2], [-2, ROAD_Z - 2], [-1, 24], [2.5, 21.5]];
const pic = (c, w, h, col, sym) => { c.fillStyle = '#0e141c'; c.fillRect(0, 0, w, h); c.fillStyle = col; c.font = `900 ${h * 0.36}px Bahnschrift`; c.textAlign = 'center'; c.fillText(sym, w / 2, h * 0.62); };
const STEPS = [ // Nachschlagen im Pause-Menü (kein Vorspann mehr: die Aufgaben oben rechts führen durchs Spiel)
  { t: 'Steuerung', x: 'W A S D laufen, Umschalt rennen, Maus umsehen. E benutzen, F Kabel und Strom abgeben, G ablegen. M Karte, Tab Übersicht, Esc Pause. Im Auto: W und S Gas und Bremse, A und D lenken, Leertaste Handbremse, E aussteigen. Auf der Leiter: W hoch, S runter. Neue Hallen, Mehrspieler und Einstellungen findest du im Startbildschirm.', draw: (c, w, h) => pic(c, w, h, '#ffd21a', 'WASD') },
  { t: 'Strom machen', x: 'Jeder hat eine eigene Handkurbel mit Batterie. Davor stellen und E gedrückt halten. Volle Speicher mit E nehmen und hinten in den Pickup werfen. Speicher könnt ihr mit G überall ablegen und lagern: Geladen wird nur am Ladeplatz.', draw: (c, w, h, t) => { c.fillStyle = '#0e141c'; c.fillRect(0, 0, w, h); const a = t * 6; c.strokeStyle = '#c8c8c0'; c.lineWidth = 10; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2 + Math.cos(a) * h * 0.25, h / 2 + Math.sin(a) * h * 0.25); c.stroke(); c.fillStyle = '#c0332a'; c.beginPath(); c.arc(w / 2 + Math.cos(a) * h * 0.25, h / 2 + Math.sin(a) * h * 0.25, h * 0.06, 0, 7); c.fill(); } },
  { t: 'Geld und Level', x: 'Am Energiedepot hinter der Stadt gibt es Geld für Strom (F in der Ladebucht). XP und damit Level gibt es nur für Aufträge: Der Auftraggeber steht im Bunker, am PC im Büro geht es auch. Abgeliefert wird bei ihm im Bunker. Jedes Level schaltet beim Händler Neues frei. Ab Level 10 kommt der letzte Auftrag: 5.000 kWh für Brunos Geschirrspüler. Damit habt ihr das Spiel geschafft.', draw: (c, w, h) => pic(c, w, h, '#5ad8ff', 'XP') },
  { t: 'Tag und Nacht', x: 'Eine Spielminute dauert eine Sekunde. Um 21 Uhr ist Feierabend, dann läuft nichts mehr. Ab 18 Uhr könnt ihr am PC im Büro schlafen gehen: Danach kommt der Tagesbericht und es ist 8 Uhr am nächsten Morgen. Was von allein läuft, arbeitet nachts weiter. An manchen Tagen regnet es: Wann, steht im Kalender (Tab).', draw: (c, w, h) => pic(c, w, h, '#9fb8e8', '☾') },
  { t: 'Kabel, Holz, Kohle', x: 'Neue Erzeuger anschließen: F am Erzeuger, dann F an einem Ladeplatz. Ein Kabel reicht zehn Meter. Holz für den Ofen: Bäume mit der Axt fällen (E), die Scheite aufsammeln. Kohle gibt es in der Mine unter der Halle, sie öffnet ab Level 5.', draw: (c, w, h) => pic(c, w, h, '#8a6238', '🪓') },
  { t: 'Döner und Polizei', x: 'Der Dönerladen in der Stadt macht stärker oder schneller. Laute, qualmende Erzeuger machen die Nachbarn misstrauisch (Verdacht oben). Klopft die Polizei, geh zur Tür und rede mit ihr. Gute Ausreden helfen, ein offenes Tor nicht.', draw: (c, w, h, t) => { c.fillStyle = Math.sin(t * 8) > 0 ? '#16326a' : '#6a1616'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `900 ${h * 0.16}px Bahnschrift`; c.textAlign = 'center'; c.fillText('POCH POCH', w / 2, h * 0.58); } },
];

export function createStrom(ctx) {
  const { renderer, audio, $, store, settings, showScreen, G, post, getQuality, shadowSize, endSession } = ctx;
  const C = { on: false, net: null, host: true, W: null, S: null, slot: null, cam: new THREE.PerspectiveCamera(65, 16 / 9, 0.05, 1400), me: { x: SPOTS.spawn.x, y: 0, z: SPOTS.spawn.z, yaw: 0, pitch: 0, vx: 0, vz: 0, lvl: 'boden', bob: 0, moving: 0, dist: 0 }, keys: {}, ui: null, target: null, drive: null, veh: {}, remotes: new Map(), effort: 0, efforts: {}, muscle: null, cable: null, climb: null, sendT: 0, saveT: 0, castT: 0, toastT: 0, t: 0, people: {}, police: null, boxQ: [], mapZoom: 1, shopTab: 'gen', shopMode: 'markt', tabTab: 'halle', pcTab: 'jobs', pcMode: 'pc', stores: new Map(), drops: new Map(), treeSeen: new Set(), mineT: 0, chopT: 0, swing: 0 };
  const hud = $('strom'); const tour = createTour({ root: hud, store, key: 'stTutSeen2', steps: STEPS }); const snd = createStromSound(audio); const ST = createStory({ C, $, snd, hud, onEnd: (k, info) => storyEnd(k, info) });
  const saves = createSaves(store, fixSave, { idx: 'stromSlots', key: 'stromSave.', legacy: null, four: addFourth });
  const isHost = () => !C.net || C.host; const myId = () => (C.net && C.net.me ? C.net.me.id : 'me'); const myName = () => (C.net && C.net.me ? C.net.me.name : 'Du');
  const seatOf = (id) => { if (!C.net) return 0; const i = C.net.players.findIndex((p) => p.id === id); return i < 0 ? 0 : i % 4; }; // vierter Platz nur bei neuen Ständen (die Lobby lässt sonst höchstens drei herein)
  const save = () => { if (isHost() && C.S && C.slot) saves.save(C.slot, C.S, C.net ? C.net.players.map((p) => p.name) : null); };

  // ---------------- Aufbau ----------------
  function build() {
    if (C.W) return; const W = C.W = buildStromWorld(renderer, { shadows: settings.shadows, shadowSize: shadowSize() });
    const npc = (key, look, spot) => { const p = personPlain(W.scene, look); p.place(spot.x, 0, spot.z, spot.yaw || 0); p.act = 'counter'; C.people[key] = p; return p; };
    npc('dealer', NPC.haendler, W.dealer); npc('boss', NPC.boss, W.boss); npc('depot', NPC.depot, W.depotWorker); npc('doener', NPC.doener, W.doener);
    (W.cityPeople || []).forEach((s, i) => { const p = npc('stadt' + i, NPC.stadt[s.k % NPC.stadt.length], s); p.act = 0; p.mode = 'stand'; });
    const o = personPlain(W.scene, NPC.polizei); o.setVisible(false); C.people.cop = o;
    // Polizeiauto: Limousine aus dem Parkmodus, weiß-blau mit Blaulicht
    const pc = buildVehicle('sedan', 0xf2f2f2); pc.setInside(false); const lb = new THREE.Group(); lb.position.set(0, 1.47, 1.1); pc.group.add(lb); const blue = new THREE.MeshStandardMaterial({ color: 0x1a3aff, emissive: 0x2a4aff, emissiveIntensity: 0 }); const red = new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff2a2a, emissiveIntensity: 0 });
    for (const [m, x] of [[blue, -0.3], [red, 0.3]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.22), m); b.position.x = x; lb.add(b); }
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.16, 3.2), new THREE.MeshStandardMaterial({ color: 0x1a4aa8, roughness: 0.4 })); stripe.position.set(0, 0.72, 1.2); pc.group.add(stripe);
    pc.group.visible = false; W.scene.add(pc.group); C.police = { api: pc, blue, red, x: POLICE_PATH[0][0], z: POLICE_PATH[0][1], h: -Math.PI / 2, u: 0 };
    // eigene Fahrzeuge (Pickup aus Blender, Lieferwagen und LKW aus dem Parkmodus)
    for (const k of Object.keys(VEHICLES)) { const g = new THREE.Group(); let api = null; let model = null; if (k === 'pickup') { model = buildModel('Pickup'); model.group.position.z = 1.75; g.add(model.group); } else { api = buildVehicle(VEHICLES[k].park, k === 'van' ? 0x2a5aa8 : 0xe0a41a); api.setInside(false); g.add(api.group); } g.visible = false; W.scene.add(g); C.veh[k] = { k, g, api, model, def: vdef(k), st: null, spin: 0, steer: 0 }; }
    // Eigene Hände (Leiter) und die Axt vor der Kamera
    const skin = new THREE.MeshStandardMaterial({ color: 0xe2b08c, roughness: 0.8 }); const sleeve = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: 0.9 });
    const hand = (side) => { const g = new THREE.Group(); const palm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.085, 0.11), skin); palm.position.set(0.02, 0, 0); const fing = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.105), skin); fing.position.set(-0.05, -0.035, 0); const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 0.035), skin); thumb.position.set(-0.01, -0.04, -side * 0.065);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.085, 0.09), skin); arm.position.set(0.25, -0.11, side * 0.02); arm.rotation.z = -0.48; const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.105, 0.11), sleeve); cuff.position.set(0.4, -0.19, side * 0.02); cuff.rotation.z = -0.48; g.add(palm, fing, thumb, arm, cuff); g.traverse((q) => { q.castShadow = false; }); g.visible = false; W.scene.add(g); return g; };
    C.hands = [{ g: hand(-1), y: 0, side: -1 }, { g: hand(1), y: 0, side: 1 }];
    C.fp = new THREE.Group(); W.scene.add(C.fp); C.axePiv = new THREE.Group(); C.axePiv.position.set(0.36, -0.56, -0.72); C.fp.add(C.axePiv); const ax = buildModel('Axt', { shadow: false }); ax.group.rotation.y = -2.36; ax.group.scale.setScalar(1.1); C.axePiv.add(ax.group); C.axePiv.visible = false;
    C.ray = new THREE.Raycaster();
  }
  function ensureFigure(id) { let r = C.remotes.get(id); if (r) return r; const p = stromPerson(C.W.scene, LOOKS[seatOf(id)]); const label = nameSprite('?', LOOKS[seatOf(id)].col); C.W.scene.add(label); r = { id, p, label, name: '?', x: 0, y: 0, z: 0, yaw: 0, tx: 0, ty: 0, tz: 0, tyaw: 0 }; C.remotes.set(id, r); return r; }
  function nameSprite(text, col) { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.font = '700 50px Bahnschrift, Segoe UI, sans-serif'; x.textAlign = 'center'; x.lineWidth = 9; x.strokeStyle = 'rgba(0,0,0,.75)'; x.strokeText(text, 256, 64); x.fillStyle = col; x.fillText(text, 256, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const m = new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }); spriteBlend(m); const s = new THREE.Sprite(m); s.scale.set(1.2, 0.225, 1); s.renderOrder = 12; s.userData.text = text; return s; }

  // ---------------- Spielstand in die Welt übertragen ----------------
  function applyWorld() {
    const S = C.S; const W = C.W; if (!S || !W) return;
    if (W.bench4) W.bench4.show(BENCHES(S) === 4); // vierte Werkbank nur in Ständen für vier
    const want = new Set(S.gens.map((g) => g.uid)); for (const uid of [...W.gens.keys()]) if (!want.has(uid)) W.removeGen(uid); for (const g of S.gens) W.placeGen(g);
    const lk = JSON.stringify(S.links) + '|' + S.gens.length; if (lk !== C.linkKey) { C.linkKey = lk; W.setLinks(S); }
    const ids = new Set(S.stores.map((s) => s.id)); for (const [id, m] of C.stores) if (!ids.has(id)) { m.group.parent && m.group.parent.remove(m.group); C.stores.delete(id); }
    for (const s of S.stores) if (!C.stores.has(s.id)) { const m = W.storeModel(s.t); m.t = s.t; C.stores.set(s.id, m); }
    for (const k of Object.keys(C.veh)) { const V = C.veh[k]; const p = S.veh[k]; V.g.visible = !!p; if (p && !V.st) { V.st = createVehState({ x: p.x, z: p.z, h: p.h }, V.def); } }
    for (const k of ['gate', 'tuer', 'bunker']) W.doors[k].k = S.door[k] || 0; W.doors.mine.k = S.level >= MINE_LVL ? 1 : 0;
    // Bäume: Stumpf, Setzling, junger Baum nach dem Fällen
    for (const k of Object.keys(S.trees)) { const i = +k; W.setTree(i, treeStage(S, i)); C.treeSeen.add(i); } for (const i of [...C.treeSeen]) if (S.trees[i] === undefined) { W.setTree(i, 3); C.treeSeen.delete(i); }
    // Holz am Boden
    const dids = new Set(S.drops.map((d) => d.id)); for (const [id, m] of C.drops) if (!dids.has(id)) { W.scene.remove(m.group); C.drops.delete(id); }
    for (const d of S.drops) if (!C.drops.has(d.id)) { const m = buildModel('Holz_Haufen'); m.group.position.set(d.x, terrainH(d.x, d.z), d.z); m.group.rotation.y = (d.id * 1.7) % 6.28; W.scene.add(m.group); C.drops.set(d.id, m); }
  }
  function changed(ev) { if (!isHost()) return; applyWorld(); refresh(); C.dirty = true; if (ev) broadcast(ev); }
  function pushState() { if (C.net && C.host && C.S) C.net.broadcast({ t: 'sst', S: C.S }); }
  function broadcast(ev) { if (C.net && C.host) C.net.broadcast({ t: 'sev', ev }); }

  // ---------------- Handlungen: Host führt aus, Mitspieler fragen an ----------------
  function act(a) {
    if (isHost()) return doAct(myId(), a);
    // Mitspieler: Aufheben/Ablegen sofort lokal zeigen (Vorhersage), der Host-Zustand korrigiert gleich danach; sonst wartet man auf die Zustandsübertragung
    if (C.S && (a.k === 'pick' || a.k === 'place' || a.k === 'drop')) { const S = C.S; const who = myId(); let r = null; if (a.k === 'pick') r = pick(S, who, a.id); else if (a.k === 'place') r = place(S, who, a.to); else { const c = S.carry[who]; if (c && c.k === 'store') r = place(S, who, a.to); } C.net.send({ t: 'sdo', a }); if (r && r.ok) { applyWorld(); refresh(); return { ok: true, quiet: true }; } return null; }
    C.net.send({ t: 'sdo', a }); return null;
  }
  function doAct(who, a) {
    const S = C.S; let r = { ok: false, why: '?' };
    if (a.k === 'buy') r = buy(S, a.item, a.n || 1);
    else if (a.k === 'connect') r = connect(S, a.gen, a.ch); else if (a.k === 'disconnect') r = disconnect(S, a.gen); else if (a.k === 'toggle') r = toggle(S, a.gen); else if (a.k === 'feed') r = feed(S, who, a.gen);
    else if (a.k === 'gather') { r = gather(S, who, a.kind, a.n); if (r.ok) r.text = `${FUELS[a.kind].name}: ${r.n} / ${CARRY_MAX}`; }
    else if (a.k === 'pick') r = pick(S, who, a.id); else if (a.k === 'place') r = place(S, who, a.to);
    else if (a.k === 'loadC') r = loadContainer(S, a.id, a.v); else if (a.k === 'unloadC') r = unloadContainer(S, a.id, a.ch);
    else if (a.k === 'sell') { r = sell(S, a.v); if (r.ok) broadcast({ k: 'sold', who: nameOf(who), text: r.text }); }
    else if (a.k === 'drop') { const c = S.carry[who]; if (c && c.k === 'store') r = place(S, who, a.to); else if (c) { delete S.carry[who]; r = { ok: true, text: 'Fallen gelassen.' }; } }
    else if (a.k === 'door') { S.door[a.d] = a.open ? 1 : 0; r = { ok: true, quiet: true }; }
    else if (a.k === 'muscle') { C.efforts[a.gen] = { e: clamp(Number(a.e) || 0, 0, buffOf(S, who).kraft), t: C.t, who }; return null; }
    else if (a.k === 'talk') r = policeTalk(who); else if (a.k === 'answer') r = policeAnswer(who, a.i);
    else if (a.k === 'chop') { r = chop(S, who, a.i, Number(a.ang) || 0); if (r.ok && r.fell) { C.W.fellTree(r.i, r.ang); broadcast({ k: 'fell', i: r.i, ang: r.ang }); r.text = `Baum gefällt: ${r.n} Scheite liegen am Boden.`; } else if (r.ok) r.quiet = true; }
    else if (a.k === 'take') { r = takeDrop(S, who, a.id); if (r.ok) r.text = `Holz: ${r.n} / ${CARRY_MAX}`; }
    else if (a.k === 'eat') r = eat(S, who, a.id);
    else if (a.k === 'job') r = acceptJob(S, a.id);
    else if (a.k === 'deliver') { r = deliverJob(S, who, Array.isArray(a.vehs) ? a.vehs.filter((v) => VEHICLES[v]) : []); if (r.ok && r.finale) { const ev = { k: 'finale', won: r.won }; broadcast(ev); r.quiet = true; changed(); save(); setTimeout(() => onEvent(ev), 600); } else if (r.ok && r.done) { broadcast({ k: 'jobdone', text: r.text }); if (r.levelUp) levelUp(r.levelUp); } }
    else if (a.k === 'sleep') { r = sleep(S); if (r.ok) { broadcast({ k: 'report', rep: r.rep }); showReport(r.rep); r.quiet = true; C.boardDay = 0; } }
    if (r.ok || r.why) { changed(); } if (who !== myId() && C.net) C.net.sendTo(who, { t: 'sres', r }); else result(r); return r;
  }
  function result(r) { if (!r) return; if (r.ok && r.text && !r.quiet) toast(r.text, 'gold'); else if (!r.ok && r.why) { toast(r.why, 'bad'); snd.play('error'); } }
  const nameOf = (id) => (id === 'me' ? 'Du' : (C.net && C.net.players.find((p) => p.id === id) || {}).name || 'Jemand');
  function levelUp(lvl) { const list = unlocksAt(lvl); const ev = { k: 'levelup', lvl, list }; broadcast(ev); onEvent(ev); }
  function showReport(rep) {
    const L = [`Strom erzeugt: ${kwh(rep.kwh)}` + (rep.night > 0.005 ? ` · in der Nacht dazu: ${kwh(rep.night)}` : ''), `Am Depot verkauft: ${kwh(rep.sold)}`, `Eingenommen: ${euro(rep.money)} · ausgegeben: ${euro(rep.spent)}`, `Aufträge erledigt: ${rep.jobs} (+${rep.xp} XP) · Level ${rep.level}`];
    if (rep.wood) L.push(`Holz gehackt: ${rep.wood} Scheite`); if (rep.police) L.push(`Polizeibesuche: ${rep.police}` + (rep.fines ? ` · Bußgeld ${euro(rep.fines)}` : '')); if (rep.lost) L.push(`Auftrag verpasst: ${rep.lost}`);
    L.push('', `Kasse: ${euro(rep.purse)}`, `Heute ist ${rep.next.name}, Tag ${rep.next.day} · ${rep.next.weather} · das Depot zahlt ${(rep.next.price / 100).toFixed(2).replace('.', ',')} € je kWh` + (rep.next.offer ? ` · neues Wochenangebot: ${GEN[rep.next.offer].name}` : ''));
    C.fade = 1.6; $('stFade').classList.add('on'); snd.play('sleep'); if (C.ui) closeUI(); setTimeout(() => { $('stFade').classList.remove('on'); showBox({ s: 'Tagesbericht', h: `${rep.name}, Tag ${rep.day}`, t: L.join('\n'), report: true, answers: [['Guten Morgen', null, true]] }); }, 1300);
  }

  // ---------------- Polizei (Host) ----------------
  function policeTalk(who) { const P = C.S.police; if (!P || P.st !== 'klopft') return { ok: false, why: 'Da ist niemand.' }; P.st = 'redet'; P.who = who; P.q = policeQuestions(P.seed); P.i = 0; P.score = 0; C.S.door.tuer = 1; broadcast({ k: 'talk', who: nameOf(who) }); return { ok: true, quiet: true }; }
  function policeAnswer(who, i) { const P = C.S.police; if (!P || P.st !== 'redet' || P.who !== who) return { ok: false, why: '?' }; const q = QUESTIONS[P.q[P.i]]; P.score += (q.a[i] || q.a[1])[1]; P.i++; if (P.i >= P.q.length) { const v = policeVerdict(C.S, P.score); P.st = 'geht'; P.t = 0; C.S.door.tuer = 0; broadcast({ k: 'verdict', ok: v.ok, text: v.text }); showVerdict(v.ok, v.text); } return { ok: true, quiet: true }; }
  function policeHost(dt) {
    const P = C.S.police; if (!P) return; P.t += dt;
    if (P.st === 'kommt' && P.t > 0.1 && C.police.u >= 0.999) { P.st = 'klopft'; P.t = 0; P.knock = 0; broadcast({ k: 'knock' }); knock(); }
    if (P.st === 'klopft') { if ((P.knock = (P.knock || 0) + dt) > 9) { P.knock = 0; broadcast({ k: 'knock2' }); knock(true); } if (P.t > 100) { const r = policeIgnored(C.S); P.st = 'geht'; P.t = 0; broadcast({ k: 'ignored', text: r.text }); showBox({ s: 'Polizei', h: 'Zettel an der Tür', t: r.text, police: true }); changed(); } }
    if (P.st === 'geht' && C.police.u <= 0.001 && P.t > 3) { C.S.police = null; changed(); }
  }
  function policeTick(dt) {
    const P = C.S && C.S.police; const pc = C.police; const cop = C.people.cop; const want = P ? (P.st === 'geht' ? 0 : 1) : 0;
    if (!P && pc.u <= 0) { pc.api.group.visible = false; cop.setVisible(false); return; }
    pc.api.group.visible = true; const seg = POLICE_PATH.length - 1; const lenTot = POLICE_PATH.slice(1).reduce((a, p, i) => a + Math.hypot(p[0] - POLICE_PATH[i][0], p[1] - POLICE_PATH[i][1]), 0);
    const copOut = cop.visible; if (Math.abs(want - pc.u) > 1e-4) { const canDrive = want > pc.u || !copOut; if (canDrive) pc.u = clamp(pc.u + Math.sign(want - pc.u) * dt * 14 / lenTot, 0, 1); }
    let L = pc.u * lenTot; let x = POLICE_PATH[0][0]; let z = POLICE_PATH[0][1]; let h = 0; for (let i = 0; i < seg; i++) { const a = POLICE_PATH[i]; const b = POLICE_PATH[i + 1]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); h = Math.atan2(b[0] - a[0], b[1] - a[1]); if (L <= l || i === seg - 1) { const t = Math.min(1, L / l); x = lerp(a[0], b[0], t); z = lerp(a[1], b[1], t); break; } L -= l; }
    if (want < pc.u - 1e-4) h += Math.PI; pc.api.group.position.set(x, 0, z); pc.api.group.rotation.y = h; pc.api.update(dt, 4 * (Math.abs(want - pc.u) > 1e-4 ? 1 : 0), 0);
    const blink = Math.sin(C.t * 12) > 0; pc.blue.emissiveIntensity = blink ? 6 : 0.2; pc.red.emissiveIntensity = blink ? 0.2 : 6;
    // Polizistin: steigt aus, geht zur Tür, wartet; danach zurück zum Auto
    const door = SPOTS.doorOut; const car = { x: x - 1.2, z: z + 0.4 };
    if (P && pc.u >= 0.999 && P.st !== 'geht') { if (!cop.visible) { cop.place(car.x, 0, car.z, 0); cop.setVisible(true); } if (walkTo(cop, door.x, door.z + 0.2, dt, 1.4)) { cop.yaw = Math.PI; cop.mode = 'stand'; cop.act = P.st === 'klopft' && P.knock < 0.6 ? 'point' : 0; } cop.lookAt = P.st === 'redet' ? V3(door.x, 1.6, door.z - 1.2) : null; }
    else if (cop.visible) { if (walkTo(cop, car.x, car.z, dt, 1.5)) cop.setVisible(false); }
    if (cop.visible) cop.update(dt, C.t);
  }
  function knock(again) { snd.play('knock', again ? 0.8 : 1); if (!again) { showBox({ s: 'Halle 7 · Tür', h: 'POCH! POCH! POCH!', t: `„Polizei! Aufmachen!“ ${OFFICER} steht vor der Tür. Geh zur Tür und rede mit ihr, bevor sie wieder fährt.`, police: true }); } else toast('Es klopft wieder an der Tür …', 'bad'); }
  function showVerdict(ok, text) { showBox({ s: 'Polizei', h: ok ? 'Puh. Sie fährt wieder.' : 'Erwischt!', t: text, police: !ok }); snd.play(ok ? 'quest' : 'error'); }

  // ---------------- Textboxen (bleiben, bis man sie wegklickt) ----------------
  function showBox(b) { C.boxQ.push(b); if (C.boxQ.length === 1) renderBox(); }
  function renderBox() {
    const b = C.boxQ[0]; const el = $('stBox'); if (!b) { el.classList.add('hidden'); if (C.ui === 'box') C.ui = null; return; } unlock(); C.ui = 'box';
    el.classList.toggle('police', !!b.police); el.classList.toggle('report', !!b.report); $('stBoxS').textContent = b.s || ''; $('stBoxH').textContent = b.h || ''; $('stBoxT').textContent = b.t || ''; const A = $('stBoxA'); A.textContent = '';
    for (const [label, fn, primary] of b.answers || [['Wegklicken', null, true]]) { const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = label; if (primary) btn.className = 'primary'; btn.onclick = () => { snd.play('ui'); C.boxQ.shift(); renderBox(); if (fn) fn(); }; A.append(btn); }
    el.classList.remove('hidden');
  }
  // Mitspieler: Bis der neue Stand vom Host da ist, zeigt P.i noch die beantwortete Frage. Darum merken, was schon beantwortet ist.
  function askPolice() { const P = C.S && C.S.police; if (!P || P.st !== 'redet' || P.who !== myId() || C.boxQ.some((b) => b.q === P.i) || (C.ans && C.ans.seed === P.seed && C.ans.i >= P.i)) return; const q = QUESTIONS[P.q[P.i]]; const qi = P.i; showBox({ q: P.i, s: `${OFFICER} · Frage ${P.i + 1} von ${P.q.length}`, h: q.q, t: 'Was antwortest du?', police: true, answers: q.a.map((a, i) => [a[0], () => { C.ans = { seed: P.seed, i: qi }; act({ k: 'answer', i }); }]) }); }

  // ---------------- Anzeige ----------------
  function toast(text, kind = '') { const t = $('stToast'); t.textContent = text; t.className = 'st-toast ' + kind; void t.offsetWidth; t.classList.add('on'); C.toastT = 3.4; }
  function hint(text) { $('stHint').textContent = text || ''; }
  const hm = (min) => { const m = Math.max(0, Math.round(min)); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} h`; };
  function refresh() {
    const S = C.S; if (!S) return; $('stMoney').textContent = euro(S.purse); $('stClock').textContent = clockText(S.clock); const di = dayInfo(S.day); const w = weatherFor(S.day); $('stDay').textContent = `${di.name} · Tag ${S.day} · ${rainAt(S.day, S.clock) > 0 ? (w.storm ? SKY.gewitter : SKY.regen) : SKY[w.kind]} ${stormNow(S.day, S.clock) ? 'Gewitter!' : rainAt(S.day, S.clock) > 0 ? 'Regen' : w.name}`; $('stClock').parentElement.classList.toggle('late', S.clock >= DAY_END);
    $('stSusBar').style.width = `${S.sus}%`; $('stSusBar').parentElement.parentElement.classList.toggle('hot', S.sus > 60);
    const xs = xpSpan(S); $('stLvlT').textContent = xs.max ? `Level ${S.level} · Höchststufe` : `Level ${S.level} · ${Math.round(xs.have)} / ${xs.need} XP`; $('stLvlBar').style.width = `${Math.round(100 * clamp(xs.have / xs.need, 0, 1))}%`;
    // Aufgabe oben rechts
    $('stOutro').classList.toggle('hidden', !S.won); const q = questNow(S); $('stQuestN').textContent = q.end ? 'Ziel' : `Aufgabe ${q.n} von ${q.of}`; $('stQuestT').textContent = q.text; const pb = $('stQuestBar').parentElement; if (q.prog) { pb.classList.remove('hidden'); const f = (v) => (q.prog[2] === 'kWh' ? v.toFixed(2).replace('.', ',') : Math.round(v).toLocaleString('de-DE')); $('stQuestBar').style.width = `${Math.round(100 * clamp(q.prog[0] / q.prog[1], 0, 1))}%`; $('stQuestP').textContent = `${f(Math.min(q.prog[0], q.prog[1]))} / ${f(q.prog[1])} ${q.prog[2]}`; } else { pb.classList.add('hidden'); $('stQuestP').textContent = ''; }
    if (C.questSeen !== undefined && C.questSeen !== S.quest) { const el = $('stQuest'); el.classList.remove('neu'); void el.offsetWidth; el.classList.add('neu'); snd.play('quest'); } C.questSeen = S.quest;
    const je = $('stJob'); if (S.job) { je.classList.remove('hidden'); je.textContent = S.job.final ? `Letzter Auftrag „${S.job.who}“: ${kwh(S.job.got)} von ${kwh(S.job.kwh)} · ohne Frist` : `Auftrag „${S.job.who}“: ${kwh(S.job.got)} von ${kwh(S.job.kwh)} · bis ${dayInfo(S.job.due).name} abends · +${S.job.xp} XP`; } else je.classList.add('hidden');
    const bf = buffOf(S, myId()); const be = $('stBuff'); if (bf.kraft > 1 || bf.tempo > 1) { be.classList.remove('hidden'); be.textContent = [bf.kraft > 1 ? `Döner-Kraft +${Math.round((bf.kraft - 1) * 100)} % (${hm(bf.kraftLeft)})` : '', bf.tempo > 1 ? `Tempo +${Math.round((bf.tempo - 1) * 100)} % (${hm(bf.tempoLeft)})` : ''].filter(Boolean).join(' · '); } else be.classList.add('hidden');
    const c = S.carry[myId()]; const ce = $('stCarry'); if (c) { ce.classList.remove('hidden'); if (c.k === 'store') { const s = S.stores.find((q2) => q2.id === c.id); ce.textContent = s ? `In den Händen: ${STORES[s.t].name} · ${kwh(s.kwh)} von ${STORES[s.t].cap} kWh · G ablegen` : ''; } else ce.textContent = `In den Händen: ${FUELS[c.k].name} ${Math.round(c.n)} / ${CARRY_MAX} · G fallen lassen`; } else if (C.cable) { ce.classList.remove('hidden'); const g = genOf(S, C.cable); ce.textContent = `Kabelende von ${g ? GEN[g.id].name : '?'} in der Hand: F an einem Ladeplatz einstecken · Esc lässt los`; } else ce.classList.add('hidden');
    // Fenster (Laden, Übersicht, PC) nicht bei jedem Netz-Paket neu bauen: sonst verschwindet der Knopf zwischen Maus-Druck und Loslassen und der Klick geht ins Leere
    if (C.ui === 'shop' || C.ui === 'tab' || C.ui === 'pc') { const now = performance.now(); if (C.mouseDown || now - (C.uiRT || 0) < 600) { C.uiPend = true; return; } C.uiRT = now; C.uiPend = false; if (C.ui === 'shop') renderShop(); if (C.ui === 'tab') renderTab(); if (C.ui === 'pc') renderPC(); }
  }

  // ---------------- Eingabe ----------------
  const KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyF', 'KeyG', 'KeyR', 'KeyM', 'Tab', 'Space', 'Escape', 'Enter']);
  window.addEventListener('keydown', (e) => { if (!C.on || (e.target && e.target.tagName === 'INPUT')) return; if (!KEYS.has(e.code)) return; e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; C.keys[e.code] = true; onKey(e.code); }, true);
  window.addEventListener('keyup', (e) => { if (!C.on) return; C.keys[e.code] = false; if (KEYS.has(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('blur', () => { C.keys = {}; });
  window.addEventListener('pointerdown', () => { C.mouseDown = true; }, true);
  window.addEventListener('pointerup', () => { C.mouseDown = false; if (C.uiPend) setTimeout(() => { if (C.uiPend && !C.mouseDown) refresh(); }, 120); }, true);
  setInterval(() => { if (C.on && C.uiPend && !C.mouseDown) refresh(); }, 650);
  function onKey(code) {
    if (C.loading || hud.classList.contains('st-menu')) return;
    if (ST.on) { ST.key(code); return; }
    if (tour.open) { if (code === 'Escape') tour.close(); return; }
    if (C.ui === 'box') return; // erst wegklicken
    if (code === 'Escape') { if (C.ui === 'pause') { if (performance.now() - (C.pauseAt || 0) > 300) closeUI(); return; } if (C.ui) { closeUI(); return; } if (C.muscle) { stopMuscle(); return; } if (C.cable) { C.cable = null; refresh(); return; } openUI('pause'); return; }
    if (code === 'KeyM') { if (C.ui === 'map') closeUI(); else if (!C.ui) openUI('map'); return; }
    if (code === 'Tab') { if (C.ui === 'tab') closeUI(); else if (!C.ui) openUI('tab'); return; }
    if (C.ui) return;
    if (C.muscle) return; // läuft, solange E gehalten wird
    if (C.climb) { if (code === 'KeyE' || code === 'Space') leaveLadder(); return; }
    if (C.drive) { if (code === 'KeyE') exitVehicle(); if (code === 'KeyR') unstuck(); if (code === 'KeyF') { const v = C.drive; if (inBay(C.veh[v].st)) result(act({ k: 'sell', v })); } return; }
    if (code === 'KeyE') interact('e'); if (code === 'KeyF') interact('f'); if (code === 'KeyG') dropCarry();
  }
  const canvas = $('gl');
  canvas.addEventListener('mousedown', (e) => { if (!C.on || C.ui || tour.open || C.loading) return; audio.init(); snd.init(); if (e.button === 0 && document.pointerLockElement !== canvas) { try { canvas.requestPointerLock(); } catch (err) { /* egal */ } } });
  window.addEventListener('mousemove', (e) => { if (!C.on || document.pointerLockElement !== canvas) return; const s = 0.0022 * (settings.mouse || 1); if (C.drive) { C.camYaw = clamp((C.camYaw || 0) - e.movementX * s, -2.6, 2.6); C.camPitch = clamp((C.camPitch || 0) - e.movementY * s, -0.7, 0.6); return; } C.me.yaw -= e.movementX * s; C.me.pitch = clamp(C.me.pitch - e.movementY * s, -1.35, 1.35); if (C.climb) C.me.yaw = clamp(C.me.yaw, Math.PI / 2 - 1.3, Math.PI / 2 + 1.3); });
  canvas.addEventListener('wheel', (e) => { if (C.on && C.ui === 'map') C.mapZoom = clamp(C.mapZoom * (e.deltaY > 0 ? 0.85 : 1.18), 0.6, 8); }, { passive: true });
  $('stMapC').addEventListener('wheel', (e) => { C.mapZoom = clamp(C.mapZoom * (e.deltaY > 0 ? 0.85 : 1.18), 0.6, 8); }, { passive: true });
  document.addEventListener('pointerlockchange', () => { const locked = document.pointerLockElement === canvas; if (!locked && C.on && !C.ui && !C.lockQuiet && !tour.open && !C.loading) openUI('pause'); C.lockQuiet = false; });
  const unlock = () => { if (document.pointerLockElement) { C.lockQuiet = true; document.exitPointerLock(); } };
  const PANELS = { pause: 'stPause', shop: 'stShop', tab: 'stTab', map: 'stMap', pc: 'stPC' };
  function openUI(k) { unlock(); if (C.muscle) stopMuscle(); C.ui = k; C.pauseAt = performance.now(); for (const [key, id] of Object.entries(PANELS)) $(id).classList.toggle('hidden', k !== key); if (k === 'shop') renderShop(); if (k === 'tab') renderTab(); if (k === 'pc') renderPC(); if (k !== 'pause' && k !== 'map') snd.play('ui'); }
  function closeUI() { C.ui = null; for (const id of Object.values(PANELS)) $(id).classList.add('hidden'); }

  // ---------------- Laufen und Kollision ----------------
  function vehicleCircles() { const out = []; for (const V of Object.values(C.veh)) { if (!V.g.visible || !V.st || C.drive === V.k) continue; const d = V.def; const c = d.len / 2 - d.rear; for (const k of [-0.33, 0, 0.33]) { const off = c + k * d.len; out.push({ x: V.st.x + Math.sin(V.st.h) * off, z: V.st.z + Math.cos(V.st.h) * off, r: d.w * 0.5 }); } } return out; }
  function collide(x, z, lvl, px, pz) {
    const W = C.W; if (lvl === 'boden' && W.blocked(x, z)) { x = px; z = pz; }
    const vc = lvl === 'boden' ? vehicleCircles() : []; const out = lvl === 'boden' && !inHall(x, z);
    for (let it = 0; it < 2; it++) {
      for (const c of W.circles.concat(vc)) { if ((c.lvl || 'boden') !== lvl) continue; const dx = x - c.x; const dz = z - c.z; const d = Math.hypot(dx, dz); const m = c.r + R; if (d < m && d > 1e-6) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
      if (out) for (const c of W.trees) { if (!c.on) continue; const dx = x - c.x; if (dx > 2 || dx < -2) continue; const dz = z - c.z; if (dz > 2 || dz < -2) continue; const d = Math.hypot(dx, dz); const m = c.r + R; if (d < m && d > 1e-6) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
      for (const b of W.boxes) { if (b.off || b.lvl !== lvl || (b.door && W.doors[b.door].v > 0.6)) continue; const cx = clamp(x, b.x0, b.x1); const cz = clamp(z, b.z0, b.z1); const dx = x - cx; const dz = z - cz; const d = Math.hypot(dx, dz); if (d < R) { if (d > 1e-6) { x = cx + dx / d * R; z = cz + dz / d * R; } else { const pen = [x - b.x0, b.x1 - x, z - b.z0, b.z1 - z]; const k = pen.indexOf(Math.min(...pen)); if (k === 0) x = b.x0 - R; else if (k === 1) x = b.x1 + R; else if (k === 2) z = b.z0 - R; else z = b.z1 + R; } } }
    } return [x, z];
  }
  function surfaceAt(m) { if (m.lvl === 'dach') return 'metall'; if (m.lvl === 'mine') return 'kies'; if (inOffice(m.x, m.z)) return 'holz'; if (inHall(m.x, m.z) || inBunker(m.x, m.z)) return 'beton'; if (Math.abs(m.z - ROAD_Z) < 4.2 || (m.x > CITY.x0 && m.x < CITY.x1 && m.z > CITY.z0 && m.z < CITY.z1) || (m.x > -21 && m.x < 14.5 && m.z > 11 && m.z < 26)) return 'asphalt'; if (Math.abs(m.x - riverX(m.z)) < 9) return 'kies'; return 'gras'; }
  function walk(dt) {
    const m = C.me; const k = C.keys; let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); let s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); if (C.ui || tour.open) { f = 0; s = 0; }
    const heavy = (() => { const c = C.S && C.S.carry[myId()]; if (!c || c.k !== 'store') return 1; const st = C.S.stores.find((q) => q.id === c.id); return st && st.t === 'haus' ? 0.45 : st && st.t === 'schrank' ? 0.6 : 0.85; })();
    const len = Math.hypot(f, s) || 1; const sp = (k.ShiftLeft || k.ShiftRight ? 5.2 : 3.0) * heavy * buffOf(C.S, myId()).tempo; const sn = Math.sin(m.yaw); const cs = Math.cos(m.yaw);
    const wx = (-sn * f + cs * s) / len * sp; const wz = (-cs * f - sn * s) / len * sp; const a = 1 - Math.exp(-dt * 10); m.vx += (wx * (f || s ? 1 : 0) - m.vx) * a; m.vz += (wz * (f || s ? 1 : 0) - m.vz) * a;
    let [x, z] = collide(m.x + m.vx * dt, m.z + m.vz * dt, m.lvl, m.x, m.z);
    // Ebenenwechsel über die Treppe in die Mine
    if (m.lvl === 'boden' && inStairs(x, z) && z < STAIRS.z1 - 0.1) { m.lvl = 'mine'; } else if (m.lvl === 'mine' && z > STAIRS.z1 && x > STAIRS.x0 && x < STAIRS.x1) { m.lvl = 'boden'; }
    const gy = groundY(x, z, m.lvl); m.y = Math.abs(gy - m.y) > 1.2 ? gy : m.y + (gy - m.y) * Math.min(1, dt * 12); const moved = Math.hypot(x - m.x, z - m.z); m.x = x; m.z = z; m.moving = moved / Math.max(dt, 1e-4);
    if (m.moving > 0.3) { m.bob += dt * m.moving * 2.2; m.dist += moved; if (m.dist > (m.moving > 4 ? 1.15 : 0.8)) { m.dist = 0; snd.step(surfaceAt(m), m.moving > 4 ? 1 : 0.7); } } else m.bob *= 0.9;
  }
  function eyeCam() { const m = C.me; C.cam.position.set(m.x, m.y + EYE + Math.sin(m.bob * 2) * 0.025 * Math.min(1, m.moving / 2), m.z); C.cam.rotation.set(m.pitch, m.yaw, 0, 'YXZ'); C.cam.fov = 65; }

  // ---------------- Leiter: W hoch, S runter, die Hände greifen die Sprossen ----------------
  function enterLadder(top) { const L = C.W.ladder; const m = C.me; if (C.S.carry[myId()] && C.S.carry[myId()].k === 'store') { toast('Mit einem Speicher in den Händen geht das nicht. Erst ablegen (G).', 'bad'); return; } C.climb = { y: top ? L.top - 0.02 : 0 }; m.x = L.x; m.z = L.z; m.lvl = 'boden'; m.y = C.climb.y; m.yaw = Math.PI / 2; m.pitch = top ? -0.5 : 0.25; m.vx = 0; m.vz = 0; for (const h of C.hands) { h.y = 0; h.g.visible = true; } hint('Leiter: W hoch · S runter'); snd.play('ladder'); }
  function leaveLadder() { const c = C.climb; if (!c) return; const L = C.W.ladder; const m = C.me; if (c.y > L.top - 0.5) { m.lvl = 'dach'; m.x = L.wallX - 1.2; m.y = L.top; m.yaw = Math.PI / 2; } else if (c.y < 1.2) { m.lvl = 'boden'; m.x = L.x + 0.6; m.y = 0; } else { toast('Erst ganz hoch oder ganz runter.', 'bad'); return; } m.pitch = 0; C.climb = null; for (const h of C.hands) h.g.visible = false; hint(''); }
  function climbTick(dt) {
    const c = C.climb; const L = C.W.ladder; const k = C.keys; const dir = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); c.y = clamp(c.y + dir * 1.8 * dt, 0, L.top); const m = C.me; m.y = c.y; m.moving = 0;
    if ((c.y >= L.top - 0.001 && dir > 0) || (c.y <= 0.001 && dir < 0)) { leaveLadder(); return; }
    const base = c.y + EYE + 0.42; C.hands.forEach((h, i) => { const n = Math.floor((base - L.y0 - i * L.rung) / (2 * L.rung)); const want = L.y0 + i * L.rung + n * 2 * L.rung; if (!h.y) h.y = want; if (Math.abs(want - h.y) > 0.01 && !h.moving) { h.moving = true; snd.play('ladder', 0.5, 0.9 + Math.random() * 0.2); } h.y += (want - h.y) * Math.min(1, dt * 16); if (Math.abs(want - h.y) < 0.02) h.moving = false; h.g.position.set(L.wallX + 0.05, h.y + 0.02, L.z + h.side * 0.17); });
  }

  // ---------------- Fahren ----------------
  const inBay = (st) => !!st && st.x > DEPOT.bay.x0 && st.x < DEPOT.bay.x1 && st.z > DEPOT.bay.z0 && st.z < DEPOT.bay.z1;
  const driverOf = (k) => { for (const [id, r] of C.remotes) if (r.drive === k) return id; return null; };
  function enterVehicle(k) { const V = C.veh[k]; if (driverOf(k)) { toast('Da sitzt schon jemand am Steuer.', 'bad'); return; } if (C.S.carry[myId()] && C.S.carry[myId()].k === 'store') { toast('Erst den Speicher abstellen (G) oder hinten reinwerfen.', 'bad'); return; } C.drive = k; V.st.v = 0; V.st.gear = 1; V.st.sim = null; V.st.gi = 1; C.camYaw = 0; C.chase = null; $('stDrive').classList.remove('hidden'); $('stCross').classList.add('hidden'); hint(''); snd.play('door'); }
  function exitVehicle() { const V = C.veh[C.drive]; if (!V) return; const st = V.st; if (Math.abs(st.v) > 2) { toast('Erst anhalten.', 'bad'); return; } const sx = Math.cos(st.h); const sz = -Math.sin(st.h); const m = C.me; m.x = st.x + sx * 1.6 + Math.sin(st.h) * 1.6; m.z = st.z + sz * 1.6 + Math.cos(st.h) * 1.6; m.lvl = 'boden'; m.y = groundY(m.x, m.z, 'boden'); m.yaw = st.h + Math.PI; m.pitch = 0; [m.x, m.z] = collide(m.x, m.z, 'boden', m.x, m.z); C.drive = null; $('stDrive').classList.add('hidden'); $('stCross').classList.remove('hidden'); snd.play('door'); audio.update({ kmh: 0, rpm: 900, throttle: 0, surface: 'road', slip: 0 }, false); if (isHost()) { C.S.veh[V.k] = { x: st.x, z: st.z, h: st.h }; C.dirty = true; } }
  // R beim Fahren: „Fahrzeug befreien“ setzt das Auto einfach auf seinen Parkplatz vor der Halle (seit 2026-11-21, Lennox: „einfach vor die Garage teleportieren“)
  function unstuck() {
    const V = C.veh[C.drive]; if (!V) return; const st = V.st; const d = V.k === 'truck' ? SPOTS.parkTruck : V.k === 'van' ? SPOTS.parkVan : SPOTS.parkPickup;
    st.x = d.x; st.z = d.z; st.h = d.h;
    st.v = 0; st.steer = 0; st.sim = null; if (isHost()) { C.S.veh[V.k] = { x: st.x, z: st.z, h: st.h }; C.dirty = true; } snd.play('door'); toast('Fahrzeug befreit.', 'gold');
  }
  function vehHits(V, st, why) { const hit = (r) => { if (why) why.push(r); return !why; };
    const d = V.def; const c = d.len / 2 - d.rear; const fx = Math.sin(st.h); const fz = Math.cos(st.h); const rx = Math.cos(st.h); const rz = -Math.sin(st.h); const W = C.W;
    for (const [a, b] of [[c + d.len / 2, -d.w / 2], [c + d.len / 2, d.w / 2], [c - d.len / 2, -d.w / 2], [c - d.len / 2, d.w / 2], [c + d.len / 2, 0], [c, -d.w / 2], [c, d.w / 2], [c - d.len / 2, 0]]) {
      const x = st.x + fx * a + rx * b; const z = st.z + fz * a + rz * b; if (W.blockedVeh(x, z) && hit('fluss/rand')) return true;
      for (const bx of W.boxes) { if (bx.off || bx.lvl !== 'boden' || (bx.door && W.doors[bx.door].v > 0.6)) continue; if (x > bx.x0 && x < bx.x1 && z > bx.z0 && z < bx.z1 && hit('box ' + JSON.stringify(bx))) return true; }
      for (const ci of W.circles) { if (!ci.veh) continue; if (Math.hypot(x - ci.x, z - ci.z) < ci.r && hit('kreis')) return true; }
      for (const t of W.trees) { if (!t.on) continue; const dx = x - t.x; if (dx > 1 || dx < -1) continue; if (Math.hypot(dx, z - t.z) < t.r + 0.1 && hit('baum')) return true; }
      for (const r of C.remotes.values()) if (!r.drive && r.p.visible && Math.abs(r.y - groundY(r.x, r.z, 'boden')) < 1 && Math.hypot(x - r.x, z - r.z) < 0.45 && hit('person')) return true;
      for (const o of Object.values(C.veh)) if (o !== V && o.g.visible && o.st && Math.hypot(x - (o.st.x + Math.sin(o.st.h) * (o.def.len / 2 - o.def.rear)), z - (o.st.z + Math.cos(o.st.h) * (o.def.len / 2 - o.def.rear))) < o.def.w * 0.55 + 0.6 && hit('auto ' + o.k)) return true;
    } return false;
  }
  // ---------------- Rennmodus-Beschleunigung, Gangschaltung und Motorsound (sim.js, audio.js) ----------------
  const FAKE_TRACK = { rows: 0, nearest: (x, z) => ({ i: 0, dist: 0, lat: 0, cx: x, cz: z, psi: 0, s: 0 }), surfaceAt: (x, z) => (Math.abs(z - ROAD_Z) < 4.4 || (x > CITY.x0 && x < CITY.x1) ? 'road' : 'grass'), treesNear: () => [] };
  function simCar(V) { if (V.car) return V.car; const f = V.k === 'truck' ? 0.6 : 1; V.car = { ...SIMCAR, vmax: SIMCAR.vmax, maxDrive: SIMCAR.maxDrive * f, power: SIMCAR.power * f, noAero: true }; return V.car; }
  // Automatik wie im Rennmodus: 8 Gänge, hoch bei 6300/min, runter unter 2300/min, Schaltruck und Schaltgeräusch
  function gearboxStrom(V, st, inp, dt) {
    const sp = Math.abs(st.v) * 3.6; const RATIO = [0, 9, 14, 20, 27, 35, 44, 54, 66]; // wie im Rennmodus: km/h je 1000/min, 8 Gänge
    st.shiftT = Math.max(0, (st.shiftT || 0) - dt); st.blip = Math.max(0, (st.blip || 0) - dt); if (!st.gi) st.gi = 1;
    if (st.v < -0.3) { st.gi = 0; st.rpm += ((900 + sp * 220) - (st.rpm || 900)) * Math.min(1, dt * 8); return; }
    if (st.gi === 0) st.gi = 1;
    let rpm = sp / RATIO[st.gi] * 1000;
    if (st.shiftT <= 0 && rpm > 6300 && st.gi < 8) { st.gi++; st.shiftT = 0.2; audio.shift(true, inp.throttle > 0.3 ? inp.throttle : 0, rpm); }
    else if (st.shiftT <= 0 && rpm < 2300 && st.gi > 1) { st.gi--; st.shiftT = 0.15; st.blip = 0.3; audio.shift(false, inp.throttle, rpm); }
    rpm = sp / RATIO[st.gi] * 1000; let target = Math.max(900, rpm); if (sp < 12) target = Math.max(target, 900 + inp.throttle * 3200 * (1 - sp / 14)); else target += inp.throttle * 250;
    if (st.blip > 0) target += st.blip * 4200; if (st.shiftT > 0.08) target *= 0.78;
    st.rpm = (st.rpm || 900) + (Math.min(7400, target) - (st.rpm || 900)) * Math.min(1, dt * (st.shiftT > 0 ? 20 : 8));
  }
  function driveTick(dt) {
    const V = C.veh[C.drive]; const st = V.st; const k = C.keys; const fw = k.KeyW || k.ArrowUp; const bw = k.KeyS || k.ArrowDown;
    const busy = C.ui || tour.open; const inp = { throttle: !busy && fw ? 1 : 0, brake: busy ? (Math.abs(st.v) > 1 ? 1 : 0) : (bw ? 1 : 0), steer: busy ? 0 : ((k.KeyA || k.ArrowLeft) ? 1 : 0) - ((k.KeyD || k.ArrowRight) ? 1 : 0), hand: busy || k.Space ? 1 : 0, car: simCar(V) };
    // Längsdynamik wie im Rennmodus (Beschleunigung, Bremse, Handbremse aus sim.js); Lenkung und Bewegung bleiben die alte, einfache Fahrphysik
    if (!st.sim) { st.sim = simState({ x: st.x, z: st.z, psi: st.h }); st.sim.u = st.v || 0; } const sm = st.sim; sm.x = st.x; sm.z = st.z; sm.psi = st.h; sm.v = 0; sm.r = 0;
    C.simAcc = Math.min(0.25, (C.simAcc || 0) + dt); let n = 0; const ev = []; while (C.simAcc >= 1 / 120 && n++ < 30) { simStep(sm, { ...inp, steer: 0 }, FAKE_TRACK, 1 / 120, ev); C.simAcc -= 1 / 120; }
    st.v = sm.u; st.hand = sm.hand; st.steer += clamp(inp.steer - st.steer, -2.2 * dt, 2.2 * dt); const def = V.def;
    // Lenkung bleibt wie früher bis 95 km/h; darüber (bis 300 wie im Rennmodus) wird der Einschlag kleiner, sonst wäre der Wagen nicht mehr fahrbar
    const av = Math.abs(st.v); const sc = av > 26.4 ? Math.pow(26.4 / av, 2.8) : 1; const ang = Math.atan(Math.tan(st.steer * def.steer) * sc);
    const steps = Math.max(1, Math.ceil(av * dt / 0.45)); const sdt = dt / steps; let hit = 0;
    for (let i = 0; i < steps; i++) { const prev = { x: st.x, z: st.z, h: st.h }; st.h += (st.v * Math.tan(ang) / def.wb) * sdt; st.x += Math.sin(st.h) * st.v * sdt; st.z += Math.cos(st.h) * st.v * sdt; if (vehHits(V, st)) { hit = Math.max(hit, av); st.x = prev.x; st.z = prev.z; st.h = prev.h; st.v *= 0.25; sm.u = st.v; break; } }
    if (hit > 4) audio.thud(Math.min(14, hit));
    gearboxStrom(V, st, inp, dt);
    const kmh = Math.abs(st.v) * 3.6; $('stKmh').textContent = Math.round(kmh) + (st.gi > 0 ? ' · ' + st.gi + '. Gang' : st.gi === 0 ? ' · R' : ''); const load = vehLoad(C.S, V.k); $('stLoadV').textContent = `${VEHICLES[V.k].name} · Ladung ${load} / ${VEHICLES[V.k].cap}` + (inBay(st) ? ' · F: Strom abgeben' : '') + ' · R: befreien';
    const onRoad = Math.abs(st.z - ROAD_Z) < 4.4 || (st.x > CITY.x0 && st.x < CITY.x1); audio.update({ kmh, rpm: st.rpm, throttle: inp.throttle, surface: onRoad ? 'road' : 'grass', slip: 0, hand: st.hand, gear: st.gi || 1 }, true);
    if (isHost()) C.S.veh[V.k] = { x: st.x, z: st.z, h: st.h };
  }
  function vehVisual(dt) {
    for (const V of Object.values(C.veh)) { if (!V.g.visible || !V.st) continue; const st = V.st; const y = groundY(st.x + Math.sin(st.h) * 1.5, st.z + Math.cos(st.h) * 1.5, 'boden'); V.g.position.set(st.x, y, st.z); V.g.rotation.y = st.h;
      V.spin += (st.v || 0) * dt / 0.42; if (V.model) { const P = V.model.parts; for (const n of ['VL', 'VR', 'HL', 'HR']) { const w = P[`PU_Rad_${n}_Dreh`]; if (!w) continue; w.rotation.order = 'YXZ'; w.rotation.x = V.spin; if (n[0] === 'V') w.rotation.y = (st.steer || 0) * 0.55; } } else if (V.api) V.api.update(dt, st.v || 0, st.steer || 0); }
  }
  function chaseCam(dt) {
    const V = C.veh[C.drive]; const st = V.st; const a = st.h + (C.camYaw || 0); const d = V.k === 'truck' ? 13 : V.k === 'van' ? 10 : 8.5; const gy = groundY(st.x, st.z, 'boden'); const want = V3(st.x - Math.sin(a) * d, 0, st.z - Math.cos(a) * d); want.y = Math.max(gy, groundY(want.x, want.z, 'boden')) + (V.k === 'truck' ? 5.2 : 3.6);
    if (!C.chase) C.chase = want.clone(); C.chase.lerp(want, 1 - Math.exp(-dt * 5)); C.camYaw *= Math.exp(-dt * 0.6); const cam = C.cam; cam.position.copy(C.chase); cam.lookAt(st.x + Math.sin(st.h) * 3, 1.4 + gy, st.z + Math.cos(st.h) * 3); cam.fov = 62;
  }

  // ---------------- Benutzen: was liegt vor mir? ----------------
  const fwd = V3(); const tmp = V3();
  const nearVehs = () => Object.values(C.veh).filter((V) => V.g.visible && V.st && dist(V.st, SPOTS.bunkerLot) < 34).map((V) => V.k);
  function targets() {
    const S = C.S; const W = C.W; const m = C.me; const eye = V3(m.x, m.y + EYE, m.z); fwd.set(-Math.sin(m.yaw) * Math.cos(m.pitch), Math.sin(m.pitch), -Math.cos(m.yaw) * Math.cos(m.pitch)); const out = []; const who = myId(); const carry = S.carry[who];
    const look = (x, y, z) => { tmp.set(x - eye.x, y - eye.y, z - eye.z); const d = tmp.length(); return { d, dot: tmp.dot(fwd) / Math.max(d, 1e-4), flat: Math.hypot(x - m.x, z - m.z) }; };
    const T = (o) => out.push(o);
    // Erzeuger
    for (const g of S.gens) { const d = GEN[g.id]; if (genLevel(d) !== m.lvl) continue; const md = W.gens.get(g.uid); if (!md) continue; const big = ['kohle', 'biogas', 'atom', 'fusion', 'staudamm', 'windgross', 'erdwaerme', 'wasserrad', 'holzofen', 'blitz', 'laufrad'].includes(g.id); const reach = big ? 4.2 : 2.3; const q = look(md.pos.x, md.pos.y + (g.id === 'kurbel' ? 0.15 : 0.8), md.pos.z); if (q.flat > reach + (g.id === 'fusion' || g.id === 'staudamm' ? 2 : 0) || q.dot < 0.45) continue;
      const l = linkOf(S, g.uid); const t = { d: q.flat - (big ? 1.5 : 0), name: d.name }; const info = `${d.name}: ${g.kw ? (g.kw).toFixed(1).replace('.', ',') + ' kW' : 'steht'}${l ? ' → ' + l.ch : ' · nicht angeschlossen!'}`;
      if (d.art === 'muskel') { t.e = { k: 'muscle', uid: g.uid, text: `E halten: ${MUSCLE[g.id]} (${d.name})` }; }
      else if (d.art === 'brenn') { if (carry && carry.k === d.fuel) t.e = { k: 'feed', uid: g.uid, text: `${FUELS[d.fuel].name} nachlegen (${Math.round(carry.n)})` }; else t.e = { k: 'toggle', uid: g.uid, text: `${g.on ? 'Ausschalten' : 'Einschalten'} · ${FUELS[d.fuel].name}: ${Math.ceil(S.fuel[d.fuel] * 10) / 10} ${FUELS[d.fuel].unit}` }; }
      else t.e = { k: 'info', text: info };
      if (C.cable === g.uid) t.f = { k: 'cancel', text: 'Kabelende wieder ablegen' }; else if (!l || !l.usb) t.f = l ? { k: 'unplug', uid: g.uid, text: `Kabel abziehen (${l.n} zurück)` } : { k: 'plug', uid: g.uid, text: `Kabel anschließen (braucht ${cablesFor(g.id, 'L1', g.k)}–${cablesFor(g.id, 'C2', g.k)}, habt ${S.cables})` };
      t.hint = info; T(t); }
    // Ladeplätze
    if (m.lvl === 'boden' && inHall(m.x, m.z)) for (const c of CHARGERS) { const q = look(c.x, 0.6, c.z); if (q.flat > (c.big ? 3 : 2) || q.dot < 0.4) continue; const s = storeAt(S, c.id); const t = { d: q.flat };
      if (carry && carry.k === 'store') t.e = { k: 'place', to: { k: 'ch', ch: c.id }, text: `Speicher an ${c.id} abstellen` }; else if (s && STORES[s.t].carry) t.e = { k: 'pick', id: s.id, text: `${STORES[s.t].name} nehmen · ${kwh(s.kwh)} / ${STORES[s.t].cap}` }; else if (s) { const tr = C.veh.truck; t.e = tr && tr.g.visible && Math.hypot(tr.st.x - c.x, tr.st.z - c.z) < 9 ? { k: 'loadC', id: s.id, v: 'truck', text: `Container auf den LKW laden (${kwh(s.kwh)})` } : { k: 'info', text: `Speichercontainer · ${kwh(s.kwh)} / 100 · zum Laden den LKW daneben parken` }; } else t.e = { k: 'info', text: `Ladeplatz ${c.id} ist frei${c.big ? ' (auch für große Speicher)' : ''}` };
      if (C.cable) t.f = { k: 'plugIn', ch: c.id, text: `Kabel an ${c.id} einstecken (${cablesFor(genOf(S, C.cable).id, c.id, genOf(S, C.cable).k)} Kabel)` }; T(t); }
    // Speicher am Boden (überall ablegbar)
    for (const s of S.stores) { if (s.at.k !== 'ground' || (s.at.lvl || 'boden') !== m.lvl) continue; const q = look(s.at.x, m.y + 0.4, s.at.z); if (q.flat < 1.9 && q.dot > 0.3) T({ d: q.flat - 0.4, e: !carry && STORES[s.t].carry ? { k: 'pick', id: s.id, text: `${STORES[s.t].name} aufheben · ${kwh(s.kwh)} / ${STORES[s.t].cap}` } : { k: 'info', text: `${STORES[s.t].name} · ${kwh(s.kwh)}` } }); }
    // Fahrzeuge
    if (m.lvl === 'boden') for (const V of Object.values(C.veh)) { if (!V.g.visible || !V.st) continue; const st = V.st; if (Math.hypot(st.x - m.x, st.z - m.z) > 12) continue; const fx = Math.sin(st.h); const fz = Math.cos(st.h); const c = V.def.len / 2 - V.def.rear; const door = { x: st.x + fx * (c + 0.3) + Math.cos(st.h) * (V.def.w / 2 + 0.3), z: st.z + fz * (c + 0.3) - Math.sin(st.h) * (V.def.w / 2 + 0.3) }; const back = { x: st.x + fx * (c - V.def.len / 2 - 0.4), z: st.z + fz * (c - V.def.len / 2 - 0.4) };
      const qd = look(door.x, m.y + 1.2, door.z); if (qd.flat < 1.9 && qd.dot > 0.2) T({ d: qd.flat - 0.2, e: { k: 'enter', v: V.k, text: `Einsteigen (${VEHICLES[V.k].name})` }, f: inBay(st) ? { k: 'sell', v: V.k, text: 'Strom abgeben' } : null });
      const qb = look(back.x, m.y + 1, back.z); if (qb.flat < 2.2 && qb.dot > 0.2) { const load = vehLoad(S, V.k); const inside = S.stores.filter((s) => s.at.k === 'veh' && s.at.v === V.k); const t = { d: qb.flat };
        if (carry && carry.k === 'store') t.e = { k: 'place', to: { k: 'veh', v: V.k }, text: `Hinten in den ${VEHICLES[V.k].name} werfen (${load} / ${VEHICLES[V.k].cap})` }; else if (inside.length) { const top = inside.filter((s) => STORES[s.t].carry).pop(); t.e = top ? { k: 'pick', id: top.id, text: `${STORES[top.t].name} ausladen · ${kwh(top.kwh)}` } : { k: 'info', text: 'Container auf der Ladefläche' }; const cont = inside.find((s) => s.t === 'container'); const free = CHARGERS.find((q) => q.big && !storeAt(S, q.id) && Math.hypot(q.x - back.x, q.z - back.z) < 10); if (cont && free) t.f = { k: 'unloadC', id: cont.id, ch: free.id, text: `Container an ${free.id} abladen` }; } else t.e = { k: 'info', text: `${VEHICLES[V.k].name}: leer (${VEHICLES[V.k].cap} Plätze)` };
        if (inBay(st) && !t.f) t.f = { k: 'sell', v: V.k, text: 'Strom abgeben' }; T(t); } }
    if (m.lvl === 'boden') {
      // Türen, Leiter, Mine
      { const g = SPOTS.gate; for (const side of [-1.6, 1.6]) { const q = look(g.x + 3, 1.4, g.z + side * 0.4); if (q.flat < 3.4 && q.dot > 0.35 && Math.sign(m.z - 11) === Math.sign(side)) T({ d: q.flat, e: { k: 'door', d: 'gate', open: !(S.door.gate > 0.5), text: S.door.gate > 0.5 ? 'Tor schließen' : 'Tor öffnen' } }); } }
      { const P = S.police; const dd = SPOTS.door; const q = look(dd.x, 1.2, dd.z); if (q.flat < 2.4 && q.dot > 0.35) T({ d: q.flat - 0.3, e: P && P.st === 'klopft' ? { k: 'talk', text: 'Tür öffnen und mit der Polizei reden' } : { k: 'door', d: 'tuer', open: !(S.door.tuer > 0.5), text: S.door.tuer > 0.5 ? 'Tür schließen' : 'Tür öffnen' } }); }
      { const L = W.ladder; const q = look(L.wallX, 1.5, L.z); if (q.flat < 1.9 && q.dot > 0.3 && m.x > 18.2) T({ d: q.flat, e: { k: 'climb', up: true, text: 'Auf die Leiter (W hoch, S runter)' } }); }
      if (S.level < MINE_LVL) { const q = look((STAIRS.x0 + STAIRS.x1) / 2, 1.2, STAIRS.z1); if (q.flat < 2.2 && q.dot > 0.4) T({ d: q.flat, e: { k: 'info', text: `Die Mine ist vergittert: offen ab Level ${MINE_LVL}. XP gibt es für Aufträge.` } }); }
      // Büro: PC
      if (inOffice(m.x, m.z)) { const p = W.pc; const q = look(p.look.x, p.look.y, p.look.z); if (q.flat < 2.6 && q.dot > 0.35) T({ d: q.flat - 0.5, e: { k: 'pc', text: 'An den PC setzen (Aufträge, Schwarzmarkt, Schlafen)' } }); const qb = look(p.bed.x, 0.5, p.bed.z); if (qb.flat < 2 && qb.dot > 0.4) T({ d: qb.flat, e: { k: 'info', text: S.clock >= SLEEP_FROM ? 'Schlafen gehst du am PC (Reiter „Schlafen“).' : `Noch zu früh. Schlafen geht ab ${clockText(SLEEP_FROM)} Uhr am PC.` } }); }
      // Bunker: Tür, Händler, Auftraggeber
      { const bx = BUNKER.x1 + 3; const bz = (BUNKER.z0 + BUNKER.z1) / 2; const q = look(bx + 0.4, 1.3, bz); if (q.flat < 3 && q.dot > 0.3) T({ d: q.flat, e: { k: 'door', d: 'bunker', open: !(S.door.bunker > 0.5), text: S.door.bunker > 0.5 ? 'Bunkertür zuziehen' : 'Bunkertür aufziehen' } }); }
      if (inBunker(m.x, m.z)) { const c = W.dealer.counter; const q = look(c.x - 0.6, 1.2, c.z); if (q.flat < 2.8 && q.dot > 0.3) T({ d: q.flat, e: { k: 'shop', text: 'Mit dem Händler reden (Schwarzmarkt)' } });
        const b = W.boss.desk; const qb = look(b.x, 1.1, b.z - 0.8); if (qb.flat < 3 && qb.dot > 0.3) T({ d: qb.flat - 0.2, e: { k: 'boss', text: 'Mit dem Auftraggeber reden (Aufträge)' }, f: S.job ? { k: 'deliver', text: `Strom für den Auftrag abgeben (${kwh(S.job.got)} von ${kwh(S.job.kwh)})` } : null }); }
      // Depot, Dönerladen
      { const c = W.depotCounter; const q = look(c.x, 1.3, c.z - 1); if (q.flat < 3 && q.dot > 0.3) { const v = Object.values(C.veh).find((V) => V.g.visible && inBay(V.st) && !driverOf(V.k)); T({ d: q.flat, e: v ? { k: 'sell', v: v.k, text: `Strom aus dem ${VEHICLES[v.k].name} abgeben (${priceFor(S.day) / 100} €/kWh)` } : { k: 'info', text: `Energiedepot: heute ${(priceFor(S.day) / 100).toFixed(2).replace('.', ',')} € je kWh. Auto in die Ladebucht stellen.` } }); } }
      { const c = W.doener.counter; const q = look(c.x, 1.3, c.z - 1.2); if (q.flat < 3.2 && q.dot > 0.3) T({ d: q.flat, e: { k: 'food', text: 'Beim Dönermann bestellen' } }); }
      // Holz am Boden, Bäume
      for (const d of S.drops) { const q = look(d.x, m.y + 0.3, d.z); if (q.flat < 2.3 && q.dot > 0.25) T({ d: q.flat - 0.6, e: { k: 'take', id: d.id, text: `Holz aufsammeln (${d.n} Scheite · du trägst ${carry && carry.k === 'holz' ? Math.round(carry.n) : 0} / ${CARRY_MAX})` } }); }
      if (!inHall(m.x, m.z) && !inOffice(m.x, m.z) && !inBunker(m.x, m.z)) { let best = -1; let bd = 2.7; for (let i = 0; i < W.trees.length; i++) { const t = W.trees[i]; const dx = t.x - m.x; if (dx > 3 || dx < -3) continue; const dz = t.z - m.z; if (dz > 3 || dz < -3) continue; if (t.stage < 2) continue; const d2 = Math.hypot(dx, dz) - t.r; if (d2 < bd && (dx * fwd.x + dz * fwd.z) / (Math.hypot(dx, dz) || 1) > 0.55) { bd = d2; best = i; } }
        if (best >= 0) { const hp = S.treeHp[best] || 0; const need = W.trees[best].stage === 3 ? TREE_HITS : 2; T({ d: bd + 0.3, tree: best, e: S.tools.axt ? { k: 'chop', i: best, text: `Baum fällen mit der Axt (${hp} / ${need})` } : { k: 'info', text: `Zum Fällen braucht ihr die Axt vom Händler (ab Level ${TOOLS.axt.lvl}).` } }); } }
    }
    if (m.lvl === 'dach') { const L = W.ladder; const q = look(L.wallX, HALL.h + 0.5, L.z); if (q.flat < 2.4 && q.dot > 0.2) T({ d: q.flat, e: { k: 'climb', up: false, text: 'Die Leiter runterklettern' } }); }
    if (m.lvl === 'mine') for (const c of COAL) { const q = look(c.x, MINE.y + 1.2, c.z); if (q.flat < 2.4 && q.dot > 0.4) T({ d: q.flat, e: { k: 'gather', kind: 'kohle', n: 1, text: `Kohle abbauen (${carry && carry.k === 'kohle' ? Math.round(carry.n) : 0} / ${CARRY_MAX})` } }); }
    out.sort((a, b) => a.d - b.d); return out[0] || null;
  }
  function interact(key) {
    const t = C.target; if (!t) { if (key === 'f' && C.cable) { C.cable = null; refresh(); } return; } const a = key === 'e' ? t.e : t.f; if (!a) return;
    if (a.k === 'info') { toast(a.text); return; } if (a.k === 'muscle') { startMuscle(a.uid); return; } if (a.k === 'enter') { enterVehicle(a.v); return; } if (a.k === 'climb') { enterLadder(!a.up); return; }
    if (a.k === 'shop') { C.shopMode = 'markt'; openUI('shop'); return; } if (a.k === 'food') { C.shopMode = 'food'; openUI('shop'); return; } if (a.k === 'pc') { C.pcMode = 'pc'; openUI('pc'); return; } if (a.k === 'boss') { C.pcMode = 'boss'; C.pcTab = 'jobs'; openUI('pc'); return; }
    if (a.k === 'deliver') { const r = act({ k: 'deliver', vehs: nearVehs() }); if (r && r.ok) snd.play(r.done ? 'levelup' : 'coin'); return; }
    if (a.k === 'plug') { C.cable = a.uid; refresh(); snd.play('plug'); toast('Kabelende in der Hand. Jetzt zu einem Ladeplatz und F drücken.'); return; } if (a.k === 'cancel') { C.cable = null; refresh(); return; }
    if (a.k === 'plugIn') { const uid = C.cable; C.cable = null; snd.play('plug'); result(act({ k: 'connect', gen: uid, ch: a.ch })); refresh(); return; }
    if (a.k === 'unplug') { snd.play('plug'); result(act({ k: 'disconnect', gen: a.uid })); return; }
    if (a.k === 'toggle') { snd.play('ui'); result(act({ k: 'toggle', gen: a.uid })); return; } if (a.k === 'feed') { snd.play('drop'); result(act({ k: 'feed', gen: a.uid })); return; }
    if (a.k === 'gather') { if (C.t - C.mineT < 0.35) return; C.mineT = C.t; snd.play('chop', 0.8, 0.7); if (a.kind === 'kohle') C.W.puff(V3(C.me.x - Math.sin(C.me.yaw) * 1.6, MINE.y + 1.1, C.me.z - Math.cos(C.me.yaw) * 1.6), 0x2a2622, 0.4); const r = act({ k: 'gather', kind: a.kind, n: a.n }); if (r && r.ok) toast(r.text); else result(r); return; }
    if (a.k === 'chop') { if (C.t - C.chopT < 0.5) return; C.chopT = C.t; C.swing = 1; const tr = C.W.trees[a.i]; const ang = Math.atan2(tr.x - C.me.x, tr.z - C.me.z); setTimeout(() => { snd.play('chop'); if (C.W) C.W.puff(V3(tr.x, tr.y + 1.1, tr.z), 0xd2ac74, 0.25); const r = act({ k: 'chop', i: a.i, ang }); if (r && r.fell) snd.play('treefall'); }, 170); return; }
    if (a.k === 'take') { snd.play('pickup'); act(a); return; }
    if (a.k === 'pick' || a.k === 'place' || a.k === 'loadC' || a.k === 'unloadC' || a.k === 'sell' || a.k === 'door' || a.k === 'talk') { const r = act(a); if (a.k === 'door') snd.play(a.d === 'gate' ? 'gate' : 'door'); if (a.k === 'sell' && r && r.ok) snd.play('coin'); if (r && (a.k === 'pick' || a.k === 'place') && r.ok) { snd.play(a.k === 'pick' ? 'pickup' : 'drop'); refresh(); return; } result(r); }
  }
  // Ablegen: Speicher landen einen Schritt vor einem, überall (zum Lagern)
  function dropCarry() { const c = C.S.carry[myId()]; if (!c) return; const m = C.me; let x = m.x - Math.sin(m.yaw) * 0.95; let z = m.z - Math.cos(m.yaw) * 0.95; [x, z] = collide(x, z, m.lvl, m.x, m.z); let to = { k: 'ground', x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, lvl: m.lvl };
    // G hinter einem Auto: Speicher fliegt auf die Ladefläche (ist sie voll, landet er auf dem Boden)
    if (c.k === 'store' && m.lvl === 'boden') for (const V of Object.values(C.veh)) { if (!V.g.visible || !V.st || !V.model) continue; const st = V.st; const cc = V.def.len / 2 - V.def.rear; const bx = st.x + Math.sin(st.h) * (cc - V.def.len / 2 - 0.4); const bz = st.z + Math.cos(st.h) * (cc - V.def.len / 2 - 0.4); if (Math.hypot(bx - m.x, bz - m.z) < 2.6) { const s = C.S.stores.find((q) => q.id === c.id); if (s && vehLoad(C.S, V.k) + STORES[s.t].size <= VEHICLES[V.k].cap) { to = { k: 'veh', v: V.k }; break; } } }
    snd.play('drop'); result(act({ k: 'drop', to })); }
  // Kurbeln, Treten, Rennen: E gedrückt halten
  function startMuscle(uid) { C.muscle = uid; C.effort = 0; $('stMeter').classList.remove('hidden'); const g = genOf(C.S, uid); $('stMeterT').textContent = `${GEN[g.id].name}: ${MUSCLE[g.id]}!`; }
  function stopMuscle() { const uid = C.muscle; if (!uid) return; C.muscle = null; C.effort = 0; $('stMeter').classList.add('hidden'); if (isHost()) C.efforts[uid] = { e: 0, t: C.t }; else C.net.send({ t: 'sdo', a: { k: 'muscle', gen: uid, e: 0 } }); }
  function muscleTick(dt) {
    const g = genOf(C.S, C.muscle); if (!g || !C.keys.KeyE || C.S.clock >= DAY_END) { if (C.S.clock >= DAY_END && C.keys.KeyE) toast('Feierabend: Nach 21 Uhr läuft nichts mehr. Geh am PC schlafen.', 'bad'); stopMuscle(); return; }
    const max = buffOf(C.S, myId()).kraft; C.effort = Math.min(max, C.effort + dt * 1.8); $('stMeterBar').style.width = `${Math.round(Math.min(1, C.effort / 1.5) * 100)}%`; const s = storeAt(C.S, (linkOf(C.S, g.uid) || {}).ch); const full = s && s.kwh >= STORES[s.t].cap - 1e-6;
    $('stMeterT').textContent = `${GEN[g.id].name}: ${(GEN[g.id].kw * C.effort).toFixed(2).replace('.', ',')} kW` + (s ? ` · ${STORES[s.t].name} ${kwh(s.kwh)} / ${STORES[s.t].cap}${full ? ' · VOLL' : ''}` : ' · kein Speicher am Ladeplatz!');
    if ((C.crankT = (C.crankT || 0) + dt * (0.6 + C.effort)) > 0.22) { C.crankT = 0; snd.play('crank', 0.5, 0.85 + C.effort * 0.3); }
    if (isHost()) C.efforts[C.muscle] = { e: C.effort, t: C.t, who: myId() }; else if ((C.mT = (C.mT || 0) + dt) > 0.2) { C.mT = 0; C.net.send({ t: 'sdo', a: { k: 'muscle', gen: C.muscle, e: Math.round(C.effort * 100) / 100 } }); }
  }

  // ---------------- Schwarzmarkt und Dönerladen ----------------
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const SHOP_TABS = [['gen', 'Erzeuger'], ['store', 'Speicher & Kabel'], ['fuel', 'Brennstoff & Werkzeug'], ['veh', 'Fahrzeuge']];
  function shopRow(L, again, title, sub, price, btns, o = {}) { const d = el('div', 'st-item' + (o.off ? ' off' : '')); const a = el('div'); const b = el('b', '', title); if (o.tag) { const tg = el('span', 'tag' + (o.tagOk ? ' ok' : ''), o.tag); b.append(tg); } a.append(b, el('small', '', sub)); const p = el('div', 'pr'); if (o.old) p.append(el('s', '', euro(o.old))); p.append(document.createTextNode(price)); const bt = el('div', 'btns'); for (const [label, fn, dis] of btns) { const x = el('button', '', label); x.type = 'button'; x.disabled = !!dis; x.onclick = () => { const r = act(fn()); result(r); snd.play(r && r.ok ? 'buy' : r ? 'error' : 'ui'); setTimeout(again, 50); }; bt.append(x); } d.append(a, p, bt); L.append(d); }
  function marketRows(L, again) {
    const S = C.S; const offer = offerOfWeek(S.day); const row = (...a) => shopRow(L, again, ...a); const lk = (lvl) => (lvl && S.level < lvl ? `ab Level ${lvl}` : null);
    if (C.shopTab === 'gen') for (const g of GENS) { if (g.price === 0) continue; const have = countOf(S, g.id); const full = have >= (g.multi || 1); const pr = priceOf(S, g.id); const lock = lk(g.lvl); row(g.name + (g.multi ? ` (${have}/${g.multi})` : ''), `${g.kw ? g.kw.toString().replace('.', ',') + ' kW · ' : ''}${g.blurb}`, euro(pr), [[full ? 'Steht schon' : lock ? 'Gesperrt' : 'Kaufen', () => ({ k: 'buy', item: { k: 'gen', id: g.id } }), full || !!lock || S.purse < pr]], { off: full || !!lock, tag: lock || (offer.id === g.id ? 'Angebot der Woche −25 %' : null), old: !lock && offer.id === g.id ? g.price : null }); }
    if (C.shopTab === 'store') { for (const [id, t] of Object.entries(STORES)) { const lock = lk(t.lvl); row(t.name, `${t.cap} kWh · braucht ${t.size} Platz im Auto${t.carry ? '' : ' · nur mit dem LKW'}${t.size > 2 ? ' · nur an großen Ladeplätzen' : ''} · ihr habt ${S.stores.filter((s) => s.t === id).length}`, euro(t.price), [[lock ? 'Gesperrt' : 'Kaufen', () => ({ k: 'buy', item: { k: 'store', id } }), !!lock || S.purse < t.price]], { off: !!lock, tag: lock }); }
      L.append(el('p', 'st-note', 'Speicher könnt ihr so viele kaufen, wie ihr wollt, und mit G überall ablegen. Geladen wird nur am Ladeplatz.')); row('Kabel (10 m)', `Habt ${S.cables} übrig. Für den Weg vom Erzeuger zum Ladeplatz.`, euro(CABLE_PRICE), [[' +1 ', () => ({ k: 'buy', item: { k: 'cable' }, n: 1 }), S.purse < CABLE_PRICE], [' +5 ', () => ({ k: 'buy', item: { k: 'cable' }, n: 5 }), S.purse < CABLE_PRICE * 5], [' +10 ', () => ({ k: 'buy', item: { k: 'cable' }, n: 10 }), S.purse < CABLE_PRICE * 10]]); }
    if (C.shopTab === 'fuel') { for (const [id, t] of Object.entries(TOOLS)) { const lock = lk(t.lvl); const have = !!S.tools[id]; row(t.name, t.blurb, euro(t.price), [[have ? 'Habt ihr' : lock ? 'Gesperrt' : 'Kaufen', () => ({ k: 'buy', item: { k: 'tool', id } }), have || !!lock || S.purse < t.price]], { off: have || !!lock, tag: lock || (have ? 'im Gepäck' : null), tagOk: have }); }
      for (const [id, f] of Object.entries(FUELS)) { if (!f.shop) { row(f.name, id === 'kohle' ? `Gibt es nicht zu kaufen: selbst abbauen, in der Mine unter der Halle (ab Level ${MINE_LVL}).` : 'Gibt es nicht zu kaufen: Bäume mit der Axt fällen und die Scheite aufsammeln.', '–', [], { off: true }); continue; } const lock = lk(f.lvl); row(f.name, `In der Halle: ${Math.round(S.fuel[id] * 10) / 10} ${f.unit}. Wird direkt geliefert.`, euro(f.price), [[' +1 ', () => ({ k: 'buy', item: { k: 'fuel', id }, n: 1 }), !!lock || S.purse < f.price], [' +5 ', () => ({ k: 'buy', item: { k: 'fuel', id }, n: 5 }), !!lock || S.purse < f.price * 5]], { off: !!lock, tag: lock }); } }
    if (C.shopTab === 'veh') for (const [id, v] of Object.entries(VEHICLES)) { const have = !!S.veh[id]; const lock = lk(v.lvl); row(v.name, `${v.cap} Plätze${v.container ? ' · nimmt auch Container' : ''} · bis ${v.top} km/h`, v.price ? euro(v.price) : 'Startauto', [[have ? 'Habt ihr' : lock ? 'Gesperrt' : 'Kaufen', () => ({ k: 'buy', item: { k: 'veh', id } }), have || !!lock || S.purse < v.price]], { off: have || !!lock, tag: have ? 'vor der Halle' : lock, tagOk: have }); }
  }
  function tabsInto(box, list, cur, set) { box.textContent = ''; for (const [k, n] of list) { const b = el('button', k === cur ? 'sel' : '', n); b.type = 'button'; b.onclick = () => { snd.play('ui'); set(k); }; box.append(b); } }
  function renderShop() {
    const S = C.S; $('stShopMoney').textContent = euro(S.purse); const L = $('stShopList'); L.textContent = ''; const tabs = $('stShopTabs');
    if (C.shopMode === 'food') { $('stShopH').textContent = 'Theos Döner'; tabs.textContent = ''; const b = buffOf(S, myId()); L.append(el('p', 'st-note', b.kraft > 1 || b.tempo > 1 ? `Du bist gestärkt: ${[b.kraft > 1 ? 'Kraft noch ' + hm(b.kraftLeft) : '', b.tempo > 1 ? 'Tempo noch ' + hm(b.tempoLeft) : ''].filter(Boolean).join(', ')}.` : '„Mit allem? Mit scharf?“ Die Stärkung gilt nur für den, der isst.'));
      for (const [id, f] of Object.entries(FOOD)) shopRow(L, renderShop, f.name, f.blurb, euro(f.price), [['Essen', () => ({ k: 'eat', id }), S.purse < f.price]]); return; }
    $('stShopH').textContent = `Schwarzmarkt · ihr seid Level ${S.level}`; tabsInto(tabs, SHOP_TABS, C.shopTab, (k) => { C.shopTab = k; renderShop(); }); marketRows(L, renderShop);
  }
  // ---------------- PC im Büro und Auftraggeber im Bunker: Aufträge, Bestellen, Schlafen ----------------
  const PC_TABS = [['jobs', 'Aufträge'], ['markt', 'Schwarzmarkt bestellen'], ['sleep', 'Schlafen']];
  function renderPC() {
    const S = C.S; const boss = C.pcMode === 'boss'; $('stPCH').textContent = boss ? 'Auftraggeber' : 'PC im Büro'; $('stPCMoney').textContent = euro(S.purse); const tabs = $('stPCTabs'); const L = $('stPCBody'); L.textContent = '';
    if (boss) tabs.textContent = ''; else tabsInto(tabs, PC_TABS, C.pcTab, (k) => { C.pcTab = k; renderPC(); });
    if (C.pcTab === 'jobs' || boss) {
      const xs = xpSpan(S); L.append(el('div', 'st-h3', xs.max ? `Level ${S.level}: Höchststufe erreicht` : `Level ${S.level} · ${Math.round(xs.have)} von ${xs.need} XP bis Level ${S.level + 1}`)); if (!xs.max) L.append(el('p', 'st-note', `Level ${S.level + 1} schaltet frei: ${unlocksAt(S.level + 1).join(', ') || 'nichts Neues'}. XP gibt es nur für Aufträge.`));
      if (S.job) { L.append(el('div', 'st-h3', 'Euer Auftrag')); const J = S.job; shopRow(L, renderPC, J.who, `${J.text} Bringt den Strom zum Auftraggeber in den Bunker: Speicher in den Händen oder im Auto vor dem Bunker. Ihr könnt in mehreren Fahrten liefern, ${jobDue(J)}.`, `${kwh(J.got)} / ${kwh(J.kwh)}`, boss ? [['Strom abgeben', () => ({ k: 'deliver', vehs: nearVehs() }), false]] : [], { tag: J.final ? 'Der letzte Auftrag' : `+${J.xp} XP · ${euro(J.money)}`, tagOk: true }); }
      L.append(el('div', 'st-h3', `Angebote von heute (${dayInfo(S.day).name})`)); const off = jobOffers(S); if (!off.length) L.append(el('p', 'st-note', 'Für heute ist alles vergeben. Morgen gibt es neue Aufträge.'));
      for (const o of off) shopRow(L, renderPC, o.who, o.final ? `${o.text} Liefert ${kwh(o.kwh)}, so viele Fahrten ihr braucht. Ohne Frist.` : `${o.text} Liefert ${kwh(o.kwh)} bis ${dayInfo(S.day + o.days - 1).name} abends.`, o.final ? 'Das Ende' : `+${o.xp} XP`, [[S.job ? 'Erst den anderen' : 'Annehmen', () => ({ k: 'job', id: o.id }), !!S.job]], { tag: o.final ? 'Letzter Auftrag' : euro(o.money), tagOk: true });
    } else if (C.pcTab === 'markt') { const sub = el('div', 'st-tabs'); tabsInto(sub, SHOP_TABS, C.shopTab, (k) => { C.shopTab = k; renderPC(); }); L.append(el('p', 'st-note', `Bestellung beim Schwarzmarkt: Der Händler liefert sofort und baut alles ein. Ihr seid Level ${S.level}.`), sub); marketRows(L, renderPC); }
    else { const t = S.today; const can = S.clock >= SLEEP_FROM; L.append(el('div', 'st-h3', `Heute bisher (${dayInfo(S.day).name}, ${clockText(S.clock)} Uhr)`)); for (const [a, b] of [['Strom erzeugt', kwh(t.kwh)], ['Am Depot verkauft', `${kwh(t.sold)}`], ['Eingenommen', euro(t.money)], ['Ausgegeben', euro(t.spent)], ['Aufträge', `${t.jobs} (+${t.xp} XP)`]]) { const d = el('div', 'st-item'); const x = el('div'); x.append(el('b', '', a)); d.append(x, el('div', 'pr', b), el('div')); L.append(d); }
      L.append(el('p', 'st-note', can ? 'Wer schlafen geht, überspringt die Nacht für alle. Was von allein läuft (Wasser, Wind, Öfen mit Brennstoff), arbeitet weiter. Danach kommt der Tagesbericht.' : `Schlafen geht ab ${clockText(SLEEP_FROM)} Uhr. Um ${clockText(DAY_END)} Uhr ist Feierabend, dann läuft nichts mehr.`)); const b = el('button', 'primary', can ? 'Schlafen gehen' : `Noch zu früh (ab ${clockText(SLEEP_FROM)} Uhr)`); b.type = 'button'; b.disabled = !can; b.onclick = () => { const r = act({ k: 'sleep' }); if (r && !r.ok) result(r); if (!r) closeUI(); }; L.append(b); }
  }
  // ---------------- Übersicht (Tab) ----------------
  const TAB_TABS = [['halle', 'Halle'], ['kal', 'Kalender'], ['log', 'Logbuch']];
  function renderTab() {
    const S = C.S; $('stTabMoney').textContent = euro(S.purse); tabsInto($('stTabTabs'), TAB_TABS, C.tabTab, (k) => { C.tabTab = k; renderTab(); });
    const L = $('stTabBody'); L.textContent = ''; const item = (a, b, c) => { const d = el('div', 'st-item'); const x = el('div'); x.append(el('b', '', a), el('small', '', b)); d.append(x, el('div', 'pr', c || ''), el('div')); L.append(d); };
    if (C.tabTab === 'halle') {
      const total = S.gens.reduce((a, g) => a + (g.kw || 0), 0); L.append(el('div', 'st-h3', `Erzeuger · gerade ${total.toFixed(1).replace('.', ',')} kW`));
      for (const g of S.gens) { const d = GEN[g.id]; const l = linkOf(S, g.uid); item(d.name + (d.multi ? ` ${g.k + 1}` : ''), `${l ? 'hängt an ' + l.ch + (l.usb ? ' (USB)' : ` (${l.n} Kabel)`) : 'NICHT angeschlossen: Strom verpufft'}${d.art === 'brenn' ? ` · ${g.on ? 'läuft' : 'aus'} · ${FUELS[d.fuel].name}: ${Math.round(S.fuel[d.fuel] * 10) / 10}` : ''}${d.art === 'sonne' ? ` · Sonne ${Math.round(sunAt(S.day, S.clock) * 100)} %` : ''}${d.art === 'wind' ? ` · Wind ${Math.round(windAt(S.day, S.clock) * 100)} %` : ''}`, `${(g.kw || 0).toFixed(2).replace('.', ',')} kW`); }
      L.append(el('div', 'st-h3', `Speicher · ${S.cables} Kabel übrig`)); for (const s of S.stores) { const at = s.at.k === 'ch' ? 'am Ladeplatz ' + s.at.ch : s.at.k === 'veh' ? 'im ' + VEHICLES[s.at.v].name : s.at.k === 'hand' ? 'getragen von ' + nameOf(s.at.who) : s.at.lvl === 'dach' ? 'liegt auf dem Dach' : s.at.lvl === 'mine' ? 'liegt in der Mine' : inHall(s.at.x, s.at.z) ? 'gelagert in der Halle' : 'liegt draußen'; item(STORES[s.t].name, at, `${kwh(s.kwh)} / ${STORES[s.t].cap}`); }
      L.append(el('div', 'st-h3', 'Brennstoff in der Halle')); for (const [id, f] of Object.entries(FUELS)) item(f.name, f.shop ? 'beim Händler' : id === 'kohle' ? 'aus der Mine' : 'aus dem Wald (Axt)', `${Math.round(S.fuel[id] * 10) / 10} ${f.unit}`);
      L.append(el('div', 'st-h3', 'Statistik')); item('Verkauft', `${kwh(S.stats.sold)} für ${euro(S.stats.money)}`, ''); item('Erzeugt', kwh(S.stats.kwh), ''); item('Aufträge', `${S.stats.jobs} erledigt · Level ${S.level} · ${Math.round(S.xp)} XP`, ''); item('Polizeibesuche', `${S.stats.police}, Bußgelder ${euro(S.stats.fines)}`, `Verdacht ${Math.round(S.sus)} %`);
    }
    if (C.tabTab === 'kal') { const di = dayInfo(S.day); const first = S.day - di.wd + 1; L.append(el('div', 'st-h3', `Woche ${di.week}`)); const cal = el('div', 'st-cal'); for (let d = first; d < first + 7; d++) { const w = weatherFor(d); const c = el('div', d === S.day ? 'today' : d < S.day ? 'past' : ''); c.append(el('small', '', dayInfo(d).name.slice(0, 2) + ' · Tag ' + d), el('b', '', skyOf(w)), el('small', '', weatherText(w)), el('small', '', `Depot ${(priceFor(d) / 100).toFixed(2).replace('.', ',')} €`)); cal.append(c); } L.append(cal); const o = offerOfWeek(S.day); L.append(el('div', 'st-h3', 'Angebot der Woche beim Händler')); item(GEN[o.id].name, '25 % billiger, nur diese Woche', euro(priceOf(S, o.id))); }
    if (C.tabTab === 'log') { for (const e of S.log) item(e.text, `${dayInfo(e.day).name}, Tag ${e.day}, ${clockText(e.clock)}`, ''); if (!S.log.length) item('Noch nichts passiert', '', ''); }
  }
  // ---------------- Karte (M) ----------------
  function drawMap() {
    const cv = $('stMapC'); const w = cv.clientWidth; const h = cv.clientHeight; if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; } const c = cv.getContext('2d'); const S = C.S; const me = C.drive ? C.veh[C.drive].st : C.me;
    const sc = Math.min(w / (BOUNDS.x1 - BOUNDS.x0 + 20), h / (BOUNDS.z1 - BOUNDS.z0 + 20)) * C.mapZoom; const cx = C.mapZoom > 1.5 ? me.x : (BOUNDS.x0 + BOUNDS.x1) / 2; const cz = C.mapZoom > 1.5 ? me.z : 0; const X = (x) => w / 2 + (x - cx) * sc; const Z = (z) => h / 2 + (z - cz) * sc;
    c.fillStyle = '#10161c'; c.fillRect(0, 0, w, h); c.fillStyle = '#3a5230'; c.fillRect(X(BOUNDS.x0), Z(BOUNDS.z0), (BOUNDS.x1 - BOUNDS.x0) * sc, (BOUNDS.z1 - BOUNDS.z0) * sc);
    c.fillStyle = 'rgba(20,48,26,.75)'; if (sc > 0.9) { for (const t of TREES) { c.beginPath(); c.arc(X(t.x), Z(t.z), Math.max(1.2, 1.8 * sc), 0, 7); c.fill(); } } else { c.fillRect(X(BOUNDS.x0), Z(BOUNDS.z0), (-24 - BOUNDS.x0) * sc, (BOUNDS.z1 - BOUNDS.z0) * sc); c.fillRect(X(-24), Z(BOUNDS.z0), (BOUNDS.x1 + 24) * sc, (-30 - BOUNDS.z0) * sc); c.fillRect(X(-24), Z(46), (BOUNDS.x1 + 24) * sc, (BOUNDS.z1 - 46) * sc); }
    c.strokeStyle = '#2a7aa0'; c.lineWidth = Math.max(3, 11 * sc); c.lineCap = 'round'; c.beginPath(); for (let z = BOUNDS.z0; z <= BOUNDS.z1; z += 6) { if (z === BOUNDS.z0) c.moveTo(X(riverX(z)), Z(z)); else c.lineTo(X(riverX(z)), Z(z)); } c.stroke();
    c.fillStyle = '#56585c'; c.fillRect(X(BOUNDS.x0), Z(ROAD_Z - 4), (BOUNDS.x1 - BOUNDS.x0) * sc, 8 * sc); c.fillRect(X(180), Z(CITY.z0), 8 * sc, (CITY.z1 - CITY.z0) * sc); c.fillStyle = '#8a8a86'; c.fillRect(X(-21), Z(11), 35.5 * sc, 15 * sc); c.fillStyle = '#8a7a62'; c.fillRect(X(BUNKER.x1 + 8.5), Z(BUNKER.z1 + 3), 6 * sc, (ROAD_Z - 4 - BUNKER.z1 - 3) * sc); c.fillRect(X(BUNKER.x1 + 3.6), Z(BUNKER.z0 - 3), 16.4 * sc, 16 * sc); c.fillStyle = '#4a4a4a'; c.fillRect(X(DEPOT.bay.x0 - 6), Z(DEPOT.z1), 32 * sc, 20 * sc);
    const bld = (x0, z0, x1, z1, col, label) => { c.fillStyle = col; c.fillRect(X(x0), Z(z0), (x1 - x0) * sc, (z1 - z0) * sc); if (label) { c.fillStyle = '#fff'; c.font = `700 ${Math.max(12, Math.min(18, 3.2 * sc))}px Bahnschrift`; c.textAlign = 'center'; c.fillText(label, X((x0 + x1) / 2), Z(z0) - 6); } };
    c.fillStyle = 'rgba(190,170,150,.5)'; for (const b of C.W.boxes) if (b.veh && b.x0 > CITY.x0 - 1 && b.x1 < CITY.x1 + 1 && b.x1 - b.x0 > 4) c.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * sc, (b.z1 - b.z0) * sc);
    bld(HALL.x0, HALL.z0, HALL.x1, HALL.z1, '#6d7d68', 'Halle 7'); bld(OFFICE.x0, OFFICE.z0, OFFICE.x1, OFFICE.z1, '#b8b4a8'); bld(BUNKER.x0 - 6, BUNKER.z0 - 5, BUNKER.x1 + 3.6, BUNKER.z1 + 5, '#4f6a3c', 'Bunker: Schwarzmarkt und Aufträge'); bld(DEPOT.x0, DEPOT.z0, DEPOT.x1, DEPOT.z1, '#e8e6e0', 'Energiedepot'); bld(DOENER.x0, DOENER.z0, DOENER.x1, DOENER.z1, '#c0332a', 'Döner');
    c.fillStyle = 'rgba(255,255,255,.8)'; c.font = '700 14px Bahnschrift'; c.textAlign = 'center'; c.fillText('Theostadt', X((CITY.x0 + CITY.x1) / 2), Z(CITY.z0) - 8); c.font = '600 13px Bahnschrift'; c.fillStyle = 'rgba(255,255,255,.7)'; c.fillText('Fluss', X(riverX(-120) + 16), Z(-120)); c.fillText('Wald', X(-150), Z(-100)); c.fillText('Brücke', X(BRIDGE_X), Z(ROAD_Z + 11));
    for (const g of S.gens) { const d = GEN[g.id]; if (!d.out) continue; c.fillStyle = '#ffd21a'; c.beginPath(); c.arc(X(d.x), Z(d.z), 5, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '600 12px Bahnschrift'; c.textAlign = 'left'; c.fillText(d.name, X(d.x) + 8, Z(d.z) + 4); }
    c.fillStyle = '#d2ac74'; for (const d of S.drops) { c.beginPath(); c.arc(X(d.x), Z(d.z), 3.5, 0, 7); c.fill(); }
    for (const V of Object.values(C.veh)) { if (!V.g.visible || !V.st) continue; c.save(); c.translate(X(V.st.x), Z(V.st.z)); c.rotate(-V.st.h); c.fillStyle = V.k === 'pickup' ? '#2ad06a' : V.k === 'van' ? '#4a8af0' : '#e0a41a'; const ww = Math.max(4, 2 * sc); c.fillRect(-ww / 2, -ww / 2, ww, Math.max(9, V.def.len * sc)); c.restore(); }
    if (C.police.api.group.visible) { c.fillStyle = Math.sin(C.t * 10) > 0 ? '#2a4aff' : '#ff2a2a'; c.beginPath(); c.arc(X(C.police.api.group.position.x), Z(C.police.api.group.position.z), 7, 0, 7); c.fill(); }
    const dot = (x, z, yaw, col, label) => { c.save(); c.translate(X(x), Z(z)); c.rotate(-yaw); c.fillStyle = col; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 6); c.lineTo(-6, 6); c.closePath(); c.fill(); c.stroke(); c.restore(); if (label) { c.fillStyle = col; c.font = '700 13px Bahnschrift'; c.textAlign = 'center'; c.fillText(label, X(x), Z(z) + 22); } };
    for (const r of C.remotes.values()) if (r.p.visible || r.drive) dot(r.x, r.z, r.yaw + Math.PI, LOOKS[seatOf(r.id)].col, r.name);
    dot(me.x, me.z, C.drive ? me.h + Math.PI : C.me.yaw, LOOKS[C.net ? seatOf(myId()) : 0].col, 'Du');
  }

  // ---------------- Speicher-Modelle an ihren Platz ----------------
  function storesTick() {
    const S = C.S; const W = C.W; const per = {};
    for (const s of S.stores) { const m = C.stores.get(s.id); if (!m) continue; const g = m.group; const at = s.at; let parent = W.scene; let x = 0; let y = 0; let z = 0; let ry = 0; let vis = true; const tall = s.t === 'schrank' || s.t === 'haus';
      if (at.k === 'ch') { const c = CHARGER[at.ch]; x = c.big ? c.x + 0.2 : c.x; z = c.z; ry = Math.PI / 2; y = 0.02; }
      else if (at.k === 'veh') { const V = C.veh[at.v]; if (!V || !V.model) { vis = false; } else { parent = V.model.group; const i = per[at.v] || 0; const sz = STORES[s.t].size; per[at.v] = i + sz; const slots = BED.slice(i, i + sz); if (!slots.length) vis = false; else { x = slots.reduce((a, q) => a + q[0], 0) / slots.length; z = slots.reduce((a, q) => a + q[1], 0) / slots.length; y = 0.81; ry = 0; } } }
      else if (at.k === 'ground') { x = at.x; z = at.z; y = groundY(at.x, at.z, at.lvl || 'boden') + 0.02; ry = (s.id * 2.4) % 6.28; }
      else if (at.k === 'hand') { if (at.who === myId()) { if (C.drive || C.climb) vis = false; const m2 = C.me; x = m2.x - Math.sin(m2.yaw) * 0.55; z = m2.z - Math.cos(m2.yaw) * 0.55; y = m2.y + (tall ? 0.25 : 0.85); ry = m2.yaw; } else { const r = C.remotes.get(at.who); if (!r) vis = false; else { x = r.x + Math.sin(r.yaw) * 0.45; z = r.z + Math.cos(r.yaw) * 0.45; y = r.y + (tall ? 0.2 : 0.8); ry = r.yaw; } } }
      if (g.parent !== parent) parent.add(g); g.position.set(x, y, z); g.rotation.y = ry; g.visible = vis; }
    // Lämpchen an den Ladeplätzen: grün lädt, gelb voll, aus leer
    for (const c of CHARGERS) { const l = W.chargers[c.id].led; const s = storeAt(S, c.id); if (!s) { l.emissiveIntensity = 0; continue; } const full = s.kwh >= STORES[s.t].cap - 1e-6; const busy = S.links.some((k) => k.ch === c.id && (genOf(S, k.gen) || {}).kw > 0); l.emissive.setHex(full ? 0xffd21a : 0x30ff80); l.emissiveIntensity = full ? 2.2 : busy ? 1.6 + Math.sin(C.t * 8) * 1.2 : 0.35; }
  }
  // ---------------- Erzeuger bewegen sich, qualmen, blitzen ----------------
  function gensTick(dt) {
    const S = C.S; const W = C.W;
    for (const g of S.gens) { const m = W.gens.get(g.uid); if (!m) continue; const d = GEN[g.id]; const p = d.kw ? (g.kw || 0) / d.kw : 0; m.spin += dt * p;
      if (g.id === 'kurbel') m.set('HK_Kurbel_Dreh', 'x', -m.spin * 9); else if (g.id === 'fahrrad') { m.set('FG_Hinterrad_Dreh', 'z', -m.spin * 14); m.set('FG_Tretkurbel_Dreh', 'z', -m.spin * 6); m.set('FG_Rolle_Dreh', 'z', m.spin * 120); }
      else if (g.id === 'laufrad') m.set('LR_Rad_Dreh', 'z', m.spin * 5); else if (g.id === 'holzofen') m.set('HO_Schwungrad_Dreh', 'z', -m.spin * 12); else if (g.id === 'wasserrad') m.set('WR_Rad_Dreh', 'z', C.t * 0.9);
      else if (g.id === 'windklein') { m.set('WK_Rotor_Dreh', 'z', m.spin * 22); m.set('WK_Gondel_Dreh', 'y', Math.sin(C.t * 0.05) * 0.4); } else if (g.id === 'windgross') m.set('WG_Rotor_Dreh', 'z', m.spin * 3.5); else if (g.id === 'erdwaerme') m.set('EW_Bohrer_Dreh', 'y', C.t * 2);
      if (d.art === 'brenn' && g.on && (g.puffT = (g.puffT || 0) + dt) > (g.id === 'kohle' ? 0.12 : 0.3)) { g.puffT = 0; const o = { kohle: [-0.65, 8.1, 0.3], aggregat: [-0.4, 0.5, 0.2], holzofen: [-0.75, 2.85, 0], biogas: [1.55, 2.1, -0.2], atom: [1.9, 2.1, -1.05] }[g.id]; if (o) { const v = V3(o[0], o[1], o[2]).applyAxisAngle(V3(0, 1, 0), m.group.rotation.y).add(m.pos); W.puff(v, g.id === 'kohle' ? 0x3a3a3a : g.id === 'atom' ? 0xe8eef2 : 0x9a9a9a, g.id === 'kohle' ? 2 : 1); } } }
    const plasma = C.W.gens.size && S.gens.some((g) => g.id === 'fusion'); if (plasma) { const mt = [...C.W.gens.values()].find((m) => m.id === 'fusion'); if (mt) mt.group.traverse((o) => { if (o.isMesh && o.material.name === 'Strom_Plasma') o.material.emissiveIntensity = 3 + Math.sin(C.t * 6) * 1.5; }); }
  }
  // Bildschirm im Büro
  function pcScreen() {
    const S = C.S; const W = C.W; const cv = W.pcCanvas; const c = cv.getContext('2d'); c.fillStyle = '#081420'; c.fillRect(0, 0, 512, 300); c.fillStyle = '#12304a'; c.fillRect(0, 0, 512, 44); c.fillStyle = '#ffd21a'; c.font = '800 26px Bahnschrift'; c.textAlign = 'left'; c.fillText('⚡ HALLE-OS', 14, 31); c.fillStyle = '#9ad8ff'; c.textAlign = 'right'; c.fillText(clockText(S.clock), 498, 31);
    c.textAlign = 'left'; c.fillStyle = '#e8f2f8'; c.font = '700 24px Bahnschrift'; c.fillText(`${dayInfo(S.day).name} · Tag ${S.day}`, 18, 86); c.fillStyle = '#7affb8'; c.fillText(`Level ${S.level} · Kasse ${euro(S.purse)}`, 18, 122); c.fillStyle = '#e8f2f8'; c.font = '600 21px Bahnschrift'; c.fillText(S.job ? `Auftrag: ${kwh(S.job.got)} / ${kwh(S.job.kwh)}` : `${jobOffers(S).length} neue Aufträge`, 18, 162); c.fillText(S.clock >= SLEEP_FROM ? 'Schlafen möglich' : `Schlafen ab ${clockText(SLEEP_FROM)}`, 18, 194);
    c.fillStyle = S.clock >= DAY_END ? '#ff6a5a' : '#ffd21a'; c.font = '800 24px Bahnschrift'; c.fillText(S.clock >= DAY_END ? 'FEIERABEND: schlafen gehen!' : 'E: an den PC setzen', 18, 262); W.pcTex.needsUpdate = true;
  }

  // ---------------- Netz ----------------
  function netTick(dt) {
    if (!C.net) return; C.sendT += dt; if (C.sendT < NET_HZ) return; C.sendT = 0; const m = C.me; const V = C.drive ? C.veh[C.drive] : null; const r2 = (v) => Math.round(v * 100) / 100;
    const d = { x: r2(m.x), y: r2(m.y), z: r2(m.z), yaw: r2(m.yaw), lvl: m.lvl, mv: m.moving > 0.3 ? r2(m.moving) : 0, drive: C.drive || null, vs: V ? { x: r2(V.st.x), z: r2(V.st.z), h: r2(V.st.h), v: r2(V.st.v), s: r2(V.st.steer) } : null, mus: C.muscle || 0, name: myName() };
    if (C.host) { const all = { [myId()]: d }; for (const [id, r] of C.remotes) if (r.last) all[id] = r.last; const P = C.police; C.net.broadcast({ t: 'spl', p: all, pol: C.S && C.S.police ? { u: r2(P.u) } : null }); if (C.dirty) { C.dirty = false; pushState(); } } else C.net.send({ t: 'smv', ...d });
  }
  function onPos(id, d) { if (id === myId()) return; const r = ensureFigure(id); r.last = d; r.name = d.name || r.name; if (r.label.userData.text !== r.name) { C.W.scene.remove(r.label); r.label = nameSprite(r.name, LOOKS[seatOf(id)].col); C.W.scene.add(r.label); } r.tx = d.x; r.ty = d.y; r.tz = d.z; r.tyaw = d.yaw + Math.PI; r.drive = d.drive; r.mv = d.mv; r.mus = d.mus; r.lvl = d.lvl; if (d.drive && d.vs && C.veh[d.drive] && C.drive !== d.drive) { const st = C.veh[d.drive].st; if (st) { st.tx = d.vs.x; st.tz = d.vs.z; st.th = d.vs.h; st.v = d.vs.v; st.steer = d.vs.s; } if (C.host && C.S.veh[d.drive]) C.S.veh[d.drive] = { x: d.vs.x, z: d.vs.z, h: d.vs.h }; } }
  function remotesTick(dt) {
    for (const r of C.remotes.values()) { const k = 1 - Math.exp(-dt * 10); r.x = lerp(r.x, r.tx, k); r.y = lerp(r.y, r.ty, k); r.z = lerp(r.z, r.tz, k); let dy = r.tyaw - r.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; r.yaw += dy * k;
      const vis = !r.drive; r.p.setVisible(vis); r.label.visible = vis; if (!vis) continue;
      // Wer kurbelt, tritt oder rennt, sitzt und steht sichtbar am Gerät (stromrad.js)
      const geraet = r.mus ? C.W.gens.get(r.mus) : null;
      if (kannMuskel(geraet) && r.lvl === 'boden') { const g = genOf(C.S, r.mus); const kraft = g ? (g.kw || 0) / GEN[g.id].kw : 0; const hoch = poseMuskel(r.p, geraet, dt, C.t, kraft); r.label.position.set(r.p.x, r.p.y + hoch, r.p.z); continue; }
      r.p.place(r.x, r.y, r.z, r.yaw); r.p.mode = r.mv > 0.3 ? 'walk' : 'stand'; r.p.speed = r.mv || 0; r.p.update(dt, C.t); r.label.position.set(r.x, r.y + 2.15, r.z); }
    for (const V of Object.values(C.veh)) { const st = V.st; if (!st || st.tx === undefined || C.drive === V.k) continue; if (!driverOf(V.k)) { st.tx = undefined; continue; } const k = 1 - Math.exp(-dt * 12); st.x = lerp(st.x, st.tx, k); st.z = lerp(st.z, st.tz, k); let dh = st.th - st.h; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2; st.h += dh * k; }
  }
  function message(from, m) {
    if (C.loading) { (C.queue = C.queue || []).push([from, m]); return; }
    if (m.t === 'sst' && !C.host) { const first = !C.S || C.firstCast; C.S = m.S; C.firstCast = false; for (const k of Object.keys(C.veh)) if (C.S.veh[k] && C.veh[k].st && C.drive !== k && !driverOf(k)) Object.assign(C.veh[k].st, { x: C.S.veh[k].x, z: C.S.veh[k].z, h: C.S.veh[k].h }); applyWorld(); refresh(); if (first) { spawn(); if (C.S.day === 1 && C.S.quest === 0 && C.S.stats.kwh < 0.05) ST.play('intro'); } askPolice(); return; }
    if (m.t === 'sev' && !C.host) { onEvent(m.ev); return; }
    if (m.t === 'sres') { result(m.r); refresh(); return; }
    if (m.t === 'spl' && !C.host) { for (const [id, d] of Object.entries(m.p)) onPos(id, d); if (m.pol) C.police.u = m.pol.u; return; }
    if (m.t === 'smv' && C.host) { onPos(from, m); return; }
    if (m.t === 'sdo' && C.host) { if (m.a && m.a.k === 'vehpos') return; doAct(from, m.a || {}); }
  }
  function onEvent(ev) {
    if (ev.k === 'knock') knock(); else if (ev.k === 'knock2') knock(true); else if (ev.k === 'talk') { if (ev.who !== myName()) toast(`${ev.who} redet mit der Polizei …`); } else if (ev.k === 'verdict') showVerdict(ev.ok, ev.text); else if (ev.k === 'ignored') showBox({ s: 'Polizei', h: 'Zettel an der Tür', t: ev.text, police: true });
    else if (ev.k === 'sold') { toast(`${ev.who === myName() ? '' : ev.who + ': '}${ev.text}`, 'gold'); snd.play('coin'); } else if (ev.k === 'strike') { C.W.flash = 1; audio.crash(12); } else if (ev.k === 'msg') toast(ev.text, ev.kind || '');
    else if (ev.k === 'fell') { C.W.fellTree(ev.i, ev.ang); snd.play('treefall', 0.7); } else if (ev.k === 'report') showReport(ev.rep); else if (ev.k === 'jobdone') { toast(ev.text, 'gold'); snd.play('coin'); }
    else if (ev.k === 'levelup') { snd.play('levelup'); showBox({ s: 'Aufgestiegen', h: `Level ${ev.lvl}!`, t: ev.list && ev.list.length ? `Neu beim Schwarzmarkt (Bunker oder PC): ${ev.list.join(', ')}.` : 'Weiter so.', answers: [['Stark', null, true]] }); }
    else if (ev.k === 'late') lateBox();
    else if (ev.k === 'finale') { if (C.ui) closeUI(); unlock(); ST.play('finale', { won: ev.won || (C.S && C.S.won) || {} }); }
  }
  // Nach den Filmszenen: zurück ins Spiel (Vorspann) oder die Abschlusstafel (Abspann)
  function storyEnd(kind) { eyeCam(); refresh(); if (kind === 'intro') { hint('Klick ins Bild, damit die Maus einrastet · W A S D laufen · E benutzen · F Kabel · G ablegen'); snd.play('quest'); } else showBox({ s: 'Das Ende', h: 'Brunos Geschirrspüler läuft wieder!', t: 'Ihr habt Theostadt den Strom zurückgebracht. Das Spiel ist geschafft. Die Halle gehört euch: Ihr könnt einfach weiterspielen, Aufträge erfüllen und Geld scheffeln. Den Abspann gibt es im Pause-Menü noch einmal.', answers: [['Weiterspielen', null, true]] }); }
  function lateBox() { snd.play('quest'); showBox({ s: 'Halle 7', h: '21 Uhr: Feierabend', t: 'Ab jetzt läuft nichts mehr. Geh ins Büro in der Halle (Tür an der Ostwand) und leg dich am PC schlafen. Dann kommt der Tagesbericht und es ist wieder Morgen.', answers: [['Alles klar', null, true]] }); }
  function playerJoined(id, name) { C.net.sendTo(id, { t: 'start', mode: 'strom' }); setTimeout(pushState, 400); toast(`${name} kommt in die Halle.`); }
  function playerLeft(id) { const r = C.remotes.get(id); if (r) { r.p.setVisible(false); r.p.remove && r.p.remove(); C.W.scene.remove(r.label); C.remotes.delete(id); } if (C.S && isHost()) { const c = C.S.carry[id]; if (c && c.k === 'store') { const s = C.S.stores.find((q) => q.id === c.id); if (s) s.at = { k: 'ground', x: r ? r.x : 0, z: r ? r.z : 0, lvl: r ? r.lvl || 'boden' : 'boden' }; } delete C.S.carry[id]; for (const k of Object.keys(C.efforts)) if (C.efforts[k].who === id) delete C.efforts[k]; changed(); } }

  // ---------------- Host: Zeit, Strom, Ereignisse ----------------
  function hostTick(dt) {
    const S = C.S; const eff = {}; for (const [uid, o] of Object.entries(C.efforts)) if (C.t - o.t < 0.8) eff[uid] = o.e;
    const ev = tick(S, dt * MIN_PER_SEC, eff); for (const e of ev) { if (e.k === 'strike') { C.W.flash = 1; audio.crash(12); broadcast({ k: 'strike' }); } else if (e.k === 'late') { broadcast({ k: 'late' }); lateBox(); } else if (e.text) { toast(e.text, e.k === 'full' ? 'gold' : 'bad'); broadcast({ k: 'msg', text: e.text, kind: e.k === 'full' ? 'gold' : 'bad' }); } C.dirty = true; }
    if (S.clock >= DAY_END && (C.lateT = (C.lateT || 0) + dt) > 45) { C.lateT = 0; toast('Feierabend: Geh am PC im Büro schlafen.', 'gold'); }
    policeHost(dt); if (C.net) C.dirty = true; if ((C.uiT = (C.uiT || 0) + dt) > 0.2) { C.uiT = 0; C.dirty = true; refresh(); }
    if ((C.saveT += dt) > 20) { C.saveT = 0; save(); }
  }

  // ---------------- Ablauf ----------------
  function spawn() { const m = C.me; const s = SPOTS.spawn; const k = C.net ? seatOf(myId()) : 0; const b = genPos('kurbel', k); m.x = s.x + (k - 1) * 1.2; m.z = s.z + 2; m.y = 0; m.lvl = 'boden'; m.yaw = Math.atan2(-(b.x - m.x), -(b.z - m.z)); m.pitch = -0.12; m.vx = 0; m.vz = 0; C.climb = null; if (C.hands) for (const h of C.hands) h.g.visible = false; eyeCam(); hint('Klick ins Bild, damit die Maus einrastet · W A S D laufen · E benutzen · F Kabel · G ablegen'); }
  const nextPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  function showLoad(on, text) { $('stLoad').classList.toggle('hidden', !on); if (text) $('stLoadT').textContent = text; }
  async function enterAsync() {
    hud.classList.remove('hidden'); hud.classList.add('st-menu'); G.mode = 'strom'; showScreen(null); $('hud').classList.add('hidden'); C.loading = true; C.queue = [];
    if (!C.W) { showLoad(true, 'Die Halle wird aufgeschlossen …'); await nextPaint(); build(); showLoad(true, 'Der Wald wird gepflanzt …'); await nextPaint(); try { const rt = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType }); const prev = renderer.getRenderTarget(); renderer.setRenderTarget(rt); C.cam.position.set(0, 1.6, 4); C.cam.lookAt(0, 1.6, -6); C.cam.updateMatrixWorld(); await renderer.compileAsync(C.W.scene, C.cam); renderer.setRenderTarget(prev); rt.dispose(); } catch (e) { /* ohne Vorab-Übersetzung geht es auch */ } }
    showLoad(false); hud.classList.remove('st-menu'); post.setLevel(getQuality()); post.reset(); C.on = true; C.keys = {}; closeUI(); audio.init(); snd.init(); snd.load();
  }
  function flush() { C.loading = false; const q = C.queue || []; C.queue = []; for (const [f, m] of q) message(f, m); }
  async function openSlot(id) { C.net = null; C.host = true; await enterAsync(); C.slot = id || saves.last() || saves.create('Halle 7'); C.S = saves.load(C.slot); begin(); flush(); }
  function begin() { C.drive = null; C.muscle = null; C.cable = null; C.climb = null; C.questSeen = undefined; C.boardDay = 0; for (const k of Object.keys(C.veh)) C.veh[k].st = null; C.linkKey = null; C.police.u = 0; applyWorld(); refresh(); spawn(); if (isHost() && C.S && !C.S.introSeen) { C.S.introSeen = true; save(); ST.play('intro'); } $('stDrive').classList.add('hidden'); $('stMeter').classList.add('hidden'); $('stCross').classList.remove('hidden'); $('stFade').classList.remove('on'); }
  async function startCoop({ net, host, slot }) { /* slot: in der Lobby gewählter Spielstand */ C.net = net; C.host = host; await enterAsync(); if (C.net !== net) { C.loading = false; return; } if (host) { C.slot = (slot && saves.get(slot) ? slot : null) || saves.last() || saves.create('Online-Halle'); C.S = saves.load(C.slot); begin(); setTimeout(pushState, 300); } else { C.S = fixSave(null); C.firstCast = true; begin(); } flush(); }
  function back() { if (C.net) { stop(); endSession(); return; } stop(); showScreen('gallery'); }
  function stop() { if (!C.on && !C.loading) return; if (ST.on) ST.finish(false); save(); C.on = false; C.loading = false; unlock(); closeUI(); hud.classList.add('hidden'); C.boxQ = []; $('stBox').classList.add('hidden'); snd.quiet(); audio.update({ kmh: 0, rpm: 900, throttle: 0, surface: 'road', slip: 0 }, false); for (const [id] of C.remotes) { const r = C.remotes.get(id); r.p.setVisible(false); C.W.scene.remove(r.label); r.p.remove && r.p.remove(); } C.remotes.clear(); C.drive = null; C.muscle = null; C.cable = null; C.climb = null; C.net = null; C.host = true; if (G.mode === 'strom') G.mode = 'menu'; tour.open = false; tour.el.classList.add('hidden'); }
  $('stResume').onclick = closeUI; $('stIntro').onclick = () => { closeUI(); unlock(); ST.play('intro'); }; $('stOutro').onclick = () => { if (!C.S || !C.S.won) return; closeUI(); unlock(); ST.play('finale', { won: C.S.won }); }; $('stHelp').onclick = () => { closeUI(); tour.show(); }; $('stQuit').onclick = () => { closeUI(); back(); }; $('stShopClose').onclick = closeUI; $('stTabClose').onclick = closeUI; $('stPCClose').onclick = closeUI;

  // ---------------- Bild ----------------
  function frame(dt, tAbs) {
    if (!C.on || !C.W || !C.S) return; const real = Math.min(dt, 0.1); C.t += real; const W = C.W; const S = C.S;
    if (isHost()) { if (!(ST.on && !C.net)) hostTick(real); } else { S.clock = Math.min(DAY_END, S.clock + real * MIN_PER_SEC); if ((C.uiT = (C.uiT || 0) + real) > 0.5) { C.uiT = 0; refresh(); } }
    if (ST.on) { ST.step(real); if (ST.on) { W.regen.set(0); /* in den Filmen bleibt es trocken */ W.update(tAbs, real, C.cam.position); snd.ambience(real, { inside: true, river: 0, city: 0, night: 1, drive: false, storm: false, gens: 0 }); netTick(real); draw(real, tAbs, ST.mood()); return; } }
    W.cityPower = S.won ? 1 : 0.04;
    const busy = C.ui || tour.open;
    if (C.drive) { driveTick(real); chaseCam(real); C.target = null; $('stPrompt').classList.add('hidden'); }
    else { if (C.climb) climbTick(real); else if (!busy && !C.muscle) walk(real); eyeCam(); if (C.muscle) muscleTick(real); C.target = busy || C.muscle || C.climb ? null : targets(); const pr = $('stPrompt'); if (C.target && (C.target.e || C.target.f)) { $('stPE').classList.toggle('hidden', !C.target.e); $('stPF').classList.toggle('hidden', !C.target.f); if (C.target.e) $('stPromptT').textContent = C.target.e.text; if (C.target.f) $('stPromptT2').textContent = C.target.f.text; pr.classList.remove('hidden'); } else pr.classList.add('hidden'); }
    // Axt vor der Kamera: sichtbar am Baum, schwingt beim Schlag
    { const show = !C.drive && !C.climb && !!S.tools.axt && ((C.target && C.target.tree !== undefined) || C.swing > 0); C.axePiv.visible = show; if (C.swing > 0) C.swing = Math.max(0, C.swing - real * 2.6); const p = 1 - C.swing; C.axePiv.rotation.set(-0.25 - (C.swing > 0 ? Math.sin(Math.min(1, p * 1.25) * Math.PI) * 1.25 : 0), 0.25, -0.12); }
    askPolice(); vehVisual(real); remotesTick(real); storesTick(); gensTick(real); policeTick(real); netTick(real);
    if (C.ui === 'map') drawMap();
    if (C.toastT > 0) { C.toastT -= real; if (C.toastT <= 0) $('stToast').classList.remove('on'); }
    if ((C.pcT = (C.pcT || 0) + real) > 1) { C.pcT = 0; pcScreen(); }
    if (C.net && (C.plT = (C.plT || 0) + real) > 1) { C.plT = 0; const box = $('stPlayers'); box.textContent = ''; for (const p of C.net.players) { const d = document.createElement('div'); const i = document.createElement('i'); i.style.background = LOOKS[seatOf(p.id)].col; const b = document.createElement('b'); b.textContent = p.name + (p.id === myId() ? ' (du)' : ''); d.append(i, b); box.append(d); } }
    // Depot-Tafel einmal am Tag
    if (C.boardDay !== S.day) { C.boardDay = S.day; const cv = W.depotBoard.image; const x = cv.getContext('2d'); x.fillStyle = '#0a1a10'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#7affb8'; x.font = '700 40px Bahnschrift'; x.textAlign = 'center'; x.fillText('HEUTE', 256, 70); x.font = '900 96px Bahnschrift'; x.fillText(`${(priceFor(S.day) / 100).toFixed(2).replace('.', ',')} €`, 256, 170); x.font = '600 34px Bahnschrift'; x.fillText('je kWh · keine Fragen', 256, 226); W.depotBoard.needsUpdate = true; applyWorld(); }
    const regen = rainAt(S.day, S.clock); W.setTime(S.day, S.clock, stormNow(S.day, S.clock), regen); if (stormNow(S.day, S.clock) && Math.random() < real / 9) { W.flash = 0.7; setTimeout(() => audio.thud(10), 400 + Math.random() * 900); }
    const cam = C.cam; C.fp.position.copy(cam.position); C.fp.quaternion.copy(cam.quaternion); W.update(tAbs, real, cam.position); for (const [k, p] of Object.entries(C.people)) if (k !== 'cop' && Math.hypot(p.x - cam.position.x, p.z - cam.position.z) < 40) { p.lookAt = Math.hypot(p.x - C.me.x, p.z - C.me.z) < 5 ? V3(C.me.x, C.me.y + EYE, C.me.z) : null; p.update(real, C.t); }
    const m = C.me; const inside = !C.drive && isInside({ x: m.x, y: m.y, z: m.z }, m.lvl); snd.ambience(real, { inside, river: clamp(1 - (Math.abs((C.drive ? C.veh[C.drive].st.x : m.x) - riverX(m.z)) - 6) / 40, 0, 1), city: m.x > CITY.x0 - 20 && m.x < CITY.x1 + 20 ? 1 : 0, night: W.night ? 1 : 0, drive: !!C.drive, storm: stormNow(S.day, S.clock), regen: m.lvl === 'mine' ? 0 : regen, underRoof: !C.drive && m.lvl === 'boden' && (inHall(m.x, m.z) || inOffice(m.x, m.z)), gens: S.gens.reduce((a, g) => a + (GEN[g.id].art !== 'muskel' && g.kw > 0 ? GEN[g.id].sus + 1 : 0), 0) * (inHall(m.x, m.z) ? 1 : 0.15) });
    draw(real, tAbs, inside ? { ...W.mood, fogD: 0.0004, vol: 0 } : W.mood);
  }
  function draw(real, tAbs, mood) {
    const W = C.W; const cam = C.cam; post.watch(real, true); const dprNow = Math.min(window.devicePixelRatio || 1, 1.5); if (renderer.getPixelRatio() !== dprNow) { renderer.setPixelRatio(dprNow); renderer.setSize(window.innerWidth, window.innerHeight, false); }
    cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); if (cam.aspect < 1.3) cam.fov = cam.fov * 1.3 / cam.aspect; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); renderer.shadowMap.needsUpdate = settings.shadows;
    post.render(W.scene, cam, { mood, sky: W.sky, sun: W.sun, sunDir: W.sunDir, dt: real, time: tAbs, speed: C.drive ? Math.abs(C.veh[C.drive].st.v) * 3.6 : 0, nitro: 0, ground: 0, camPos: cam.position });
  }
  // Für Tests
  const debug = { openUI, closeUI, unstuck, vehHitWhy: (k) => { const w = []; vehHits(C.veh[k], C.veh[k].st, w); return w; }, goTo: (x, z, yaw = 0, pitch = 0, lvl = 'boden') => { const m = C.me; if (C.climb) { C.climb = null; for (const h of C.hands) h.g.visible = false; } m.x = x; m.z = z; m.yaw = yaw; m.pitch = pitch; m.lvl = lvl; m.y = groundY(x, z, lvl); m.vx = 0; m.vz = 0; }, act: (a) => act(a), target: () => C.target, interact, enterVehicle, exitVehicle, startMuscle, stopMuscle, hold: (code, on) => { C.keys[code] = !!on; }, tick: (min) => { for (let i = 0; i < min; i++) tick(C.S, 1, {}); changed(); }, police: () => { C.S.police = { st: 'kommt', t: 0, seed: 7 }; C.dirty = true; }, openUI, closeUI, box: () => (C.boxQ[0] ? { h: C.boxQ[0].h, n: C.boxQ.length, answers: (C.boxQ[0].answers || []).length } : null), clickBox: (i = 0) => { const b = $('stBoxA').children[i]; if (b) b.click(); }, changed, nearVehs, climb: () => C.climb, snd, story: ST, skipStory: () => ST.finish() };
  return { play: openSlot, stop, frame, startCoop, message, playerJoined, playerLeft, active: () => C.on, hide: () => {}, tour, state: C, debug, saves };
}
