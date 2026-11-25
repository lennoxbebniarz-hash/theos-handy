// Theos Seitenscheidel - Ludwig Zigaretti (intern ludwig): Ludwigs Eltern sind streng. PC aus, Zockverbot. Also dreht er heimlich Kippen und verkauft sie durchs Fenster.
// Teil 1 (2026-11-19): großes Zimmer zu Fuß (Ich-Sicht), großer Tisch mit drei Stühlen (E hinsetzen, Klick oder Leertaste dreht), gemeinsame Box in vier Stufen,
// Kippen selbst aus der Box nehmen und ans Fenster tragen, mit den Kunden feilschen, Upgrades am PC, Material im Hinterhof vom Kiosk (K). Allein.
// Kommen später: Vorspann mit Stimmen, Elternkontrollen, Kumpels, Skillbaum, Maschinen, Bunker, drei Spieler online.
import * as THREE from './vendor/three.module.min.js';
import { EGG_RESP, findEgg, newSave, ROLL_STEPS, KIOSK, KIOSK_VORNE, buyVorne, buyToSack, unpackSack, sackCap, sackUsed, lieferOn, UPGRADES, UP_ORDER, ELTERN, KUMPEL, fixSave, roll, tick, take, putBack, offer, buy, canBuy, buyUpgrade, nextTier, tier, euro, materialFor, boxCap, handCap, rollSpeed, tickEltern, elternCheck, elternDone, kumpelStart, kumpelDone, kumpelDur, warnTime, kioskPrice, kioskPack, tickAuto, tickScreen, rewardGame, screenLimit, autoRates, SORTEN, SORT_ORDER, MATS, MAT_NAMES, TOOLS, boxOf, handOf, boxTotal, handTotal, matOf, sortWord, sortUnlocked, sortReady, setSorte, rollSort, stepOf, materialForSort, kioskShown, handRoom, kisteSlots, kisteUsed, kisteRoom, addMatCapped, MAT_ORDER, ERWIN, erwinOpen, teilOf, takeAblage, ablageTotal, werkReady, teileUsed, TEILE_SLOTS, unpackTeile } from './ludwiglogic.js';
import { createLudwigPhone } from './ludwigphone.js';
import { NODES as SKILL_NODES, buySkill } from './ludwigskills.js';
import { buildLudwigWorld, ROOM, DOOR, SEATS, BOX_POS, CABINET, PC_POS, CIG, VIEWS, EYE, GLASS_Z, CUST_Z, OUT_Y, seatView, seatAt, colliders, newPose, LUDWIG_LOOK } from './ludwigart.js';
import { createOutline, pickOutline } from './ludwigoutline.js'; // leuchtende Umrandung beim Anschauen (2026-11-21)
import { createEggs } from './ludwigeggs.js'; // 10 Easter Eggs (2026-11-21)
import { buyMachine, tickBunker, bunkerOpen, operate, lagerPut, lagerTake, warnChat, unitStatus, buildProgress, unitInfo, assignOps, MACHINES, LOCK, chat as bunkerChat } from './ludwigbunker.js';
import { buildBunker, buildHatch, BUNKER, GARAGE, LADDER, BPC, LAGER, SLOTS, SIZE, HATCH, PILLARS, DECO } from './ludwigbunkerart.js';
import { createBunkerDesk } from './ludwigbunkerpc.js';
import { buildAussen, collideOut, groundY, FZ, WIN_OUT, KALLE_AT, COUNTER, GATE, CAM, BANKS, ERWIN_COUNTER, ERWIN_DOOR, inErwin } from './ludwigaussen.js';
import { tickWelt, clock, elternFaktor, parkSell, polizeiKontrolle, setHour } from './ludwigwelt.js';
import { createLudwigStory } from './ludwigstory.js';
import { WHO, VOICE, KLINES, KALLE_LINES, ERWIN_LINES } from './ludwigvoice.js';
import { walkTo, faceTo } from './casinofig.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { SAETZE } from './ludwigtexte.js'; // Stimmen-Update (2026-11-22)
import { createStimmen, satz, kundenSatz } from './ludwigstimmen.js';
import { createReden } from './ludwigreden.js';
import { tickEreignis, ausloesen, tuerWahl } from './ludwigereignis.js';
import { createClientSync, createHostSync, newPlayer, applyFromClient, returnPlayer, rollMul, elternMul, platzFuer, alsLudwig, assemble, SEAT_KEY, SEAT_NAME } from './ludwigmp.js'; // Mehrspieler zu viert (2026-11-21)
import { createLudwigSound } from './ludwigsound.js';
import { createSaves } from './casinosaves.js';
import { createTour } from './tour.js';
import { createLudwigPC } from './ludwigpc.js';
import { buildSortArt } from './ludwigsortart.js';
import { createQuests, primeQuests } from './ludwigquests.js';
import { createInventory } from './ludwiginv.js';
import { buildKiste, KISTE_BOX } from './ludwigkiste.js';
import { createBirthdayCard } from './ludwigcard.js';
import { createWerkbank } from './ludwigvape.js';
import { buildWerkbank, WERK_BOXES } from './ludwigwerkbank.js';
import { createLudwigRauch } from './ludwigrauch.js'; // selber rauchen (2026-11-22)
import { SHOP } from './ludwigkiosk.js';
import { createPaket } from './ludwigpaket.js'; // Abstimmung Paket 4 (2026-11-22)
import { createTeil3 } from './ludwigteil3.js'; // Abstimmung Paket 5 (2026-11-23)
import { auftragWort } from './ludwigbunker3.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t; const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const DUR = [1.1, 1.4, 1.6, 2.2]; // Sekunden je Dreh-Schritt ohne Upgrade (6,3 s pro Kippe; seit 2026-11-19 langsamer, damit sich Upgrades lohnen)
const THETA_FLAT = 0.12; const THETA_ROLL = Math.PI * 2 * 1.04; const R = 0.28; const WALK = 2.6; const RUN = 4.3;
const EDE = ['Was darf’s sein?', 'Energy gibt’s nur gekühlt.', 'Für Tabak musst du hinten zu Kalle.', 'Kaugummi gegen Mamas Nase. Läuft.'];
const KALLE = ['Ich hab nix gesehen.', 'Bar auf die Hand. Keine Fragen.', 'Wenn einer fragt: Du warst nie hier.', 'Schon wieder du? Läuft wohl.', 'Hinten raus, nicht durch den Laden.'];
const START_POS = { x: 0.35, z: 2.25, yaw: 0, pitch: -0.12 };
const STOP_X = 0.42; // Kunden stehen vor dem rechten Flügel (der geht auf), nicht hinter dem Mittelpfosten

// ---- Kurz erklärt (Bilder zeichnen sich selbst)
function pic(c, w, h, bg, col, sym) { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = col; c.font = `900 ${Math.round(Math.min(w, h) * 0.3)}px Bahnschrift, sans-serif`; c.textAlign = 'center'; c.fillText(sym, w / 2, h * 0.6); }
function drawSteps(c, w, h, t) {
  c.fillStyle = '#1a1f2a'; c.fillRect(0, 0, w, h); const k = Math.floor(t * 1.2) % 4; const names = ['Papier', 'Tabak', 'Drehen', 'Klopfen']; const bw = w * 0.2; const gap = w * 0.04; const x0 = (w - 4 * bw - 3 * gap) / 2; const y = h * 0.62;
  for (let i = 0; i < 4; i++) { const x = x0 + i * (bw + gap); c.fillStyle = i === k ? '#f9bd00' : '#2f3a4a'; c.fillRect(x, y, bw, h * 0.16); c.fillStyle = i === k ? '#141518' : '#cfd6dc'; c.font = `700 ${Math.round(bw * 0.17)}px Bahnschrift, sans-serif`; c.textAlign = 'center'; c.fillText(names[i], x + bw / 2, y + h * 0.11); }
  const cx = w / 2; const cy = h * 0.32; c.fillStyle = '#f4f1ea'; if (k < 2) c.fillRect(cx - w * 0.2, cy - h * 0.06, w * 0.4, h * 0.12); if (k === 1) { c.fillStyle = '#7a4a22'; c.fillRect(cx - w * 0.16, cy - h * 0.025, w * 0.32, h * 0.05); }
  if (k >= 2) { c.fillStyle = '#f7f5f0'; c.fillRect(cx - w * 0.2, cy - h * 0.025 + (k === 3 ? Math.abs(Math.sin(t * 12)) * -h * 0.04 : 0), w * 0.4, h * 0.05); c.fillStyle = '#7a4a22'; c.fillRect(cx - w * 0.205, cy - h * 0.022, w * 0.012, h * 0.044); c.fillRect(cx + w * 0.193, cy - h * 0.022, w * 0.012, h * 0.044); }
}
function drawDeal(c, w, h, t) {
  c.fillStyle = '#0c1630'; c.fillRect(0, 0, w, h); c.fillStyle = '#2c62c8'; c.beginPath(); c.arc(w * 0.28, h * 0.95, w * 0.14, Math.PI, 0); c.fill(); c.fillStyle = '#d8a47e'; c.beginPath(); c.arc(w * 0.28, h * 0.52, w * 0.08, 0, 7); c.fill();
  const fs = w * 0.04; const bx = w * 0.5; c.fillStyle = '#f5f6f4'; c.fillRect(bx, h * 0.14, w * 0.44, h * 0.6); c.fillStyle = '#141518'; c.textAlign = 'left'; c.font = `700 ${Math.round(fs * 1.1)}px Bahnschrift, sans-serif`; c.fillText('Bruno will 3', bx + 12, h * 0.25);
  const n = 3 + (Math.floor(t * 0.8) % 3); c.font = `400 ${Math.round(fs)}px Bahnschrift, sans-serif`; c.fillText(`Menge  –  ${n}  +`, bx + 12, h * 0.4); c.fillText(`Preis  –  ${(1 + (n - 3) * 0.1).toFixed(2).replace('.', ',')} €  +`, bx + 12, h * 0.52);
  c.fillStyle = '#f9bd00'; c.fillRect(bx + 10, h * 0.58, w * 0.22, h * 0.1); c.fillStyle = '#141518'; c.font = `700 ${Math.round(fs)}px Bahnschrift, sans-serif`; c.fillText('Anbieten', bx + 18, h * 0.65);
}
const STEPS = [
  { t: 'Laufen und hinsetzen', x: 'Klick ins Bild, dann lenkst du mit der Maus. W A S D laufen, Umschalt rennen. Am großen Tisch stehen drei Stühle: hinschauen und E drücken, dann sitzt du. E noch einmal steht wieder auf. Oben links stehen deine nächsten Aufgaben: Für jede erledigte gibt es Respekt. Tab zeigt deine Taschen und den Rucksack. Neue Spielstände, Mehrspieler und Einstellungen findest du im Startbildschirm.', draw: (c, w, h) => pic(c, w, h, '#1a1f2a', '#f9bd00', 'WASD') },
  { t: 'Kippen drehen', x: 'Im Sitzen ist jeder Klick (oder die Leertaste) ein Schritt: Blättchen hinlegen, Tabak rein, drehen, festklopfen. Die fertige Kippe fliegt in die Box mitten auf dem Tisch. Ist die Box voll, geht nichts mehr: am PC eine größere kaufen.', draw: drawSteps },
  { t: 'Tragen und feilschen', x: 'Klopft jemand ans Fenster, steh auf, öffne die Box mit E und zieh Kippen mit der Maus in deine Taschen (3 Plätze à 10 Stück; Doppelklick nimmt so viel wie geht, Rechtsklick die Hälfte, F legt alles zurück). Dann ans Fenster und E: Menge und Preis einstellen und anbieten. Zu teuer? Dann sagt der Kunde, was er zahlt. Wer dreimal zu viel verlangt, wird ihn los.', draw: drawDeal },
  { t: 'PC und Kiosk', x: 'Am Gaming-PC (Zockverbot, aber der Shop geht) kaufst du größere Boxen, mehr Taschen, schnelleres Drehen, einen größeren Rucksack, Verpackung, Raumduft und eine Powerbank. Blättchen und Tabak holst du selbst: am Fenster F (raus), rechts die Straße runter zum Kiosk an der Ecke, hinten im Hof steht Kalle. Zu Hause räumst du den Rucksack in die Materialkiste neben deinem Stuhl (E, Packungen rüberziehen), erst dann kannst du damit drehen. Die Kiste hat nur 6 Fächer, eine größere gibt es im Shop. Vorsicht vor der Kamera neben dem Fenster: Sieht sie dich eine Sekunde lang, kommen die Eltern. Esc ist Pause, der Spielstand speichert sich selbst.', draw: (c, w, h) => pic(c, w, h, '#121620', '#7affb8', 'PC  F') },
  { t: 'Handy und Boss-Plan', x: 'T holt das Handy aus der Tasche. Aber Mama hat nur 1 Minute Bildschirmzeit eingestellt, danach ist Sperre, bis sie wieder voll ist. Auf dem Handy: der Boss-Plan (Skilltree, bezahlt mit Respekt von zufriedenen Kunden; neue Knoten tauchen erst auf, wenn du den davor freigeschaltet hast) und drei Minispiele. Esc geht zurück, T steckt es weg.', draw: (c, w, h) => pic(c, w, h, '#1d1640', '#ffcf5a', '⭐ T') },
  { t: 'Neue Sorten', x: 'Im Boss-Plan (Ast Produktion) schaltest du neue Sorten frei: Stopfkippen, Aromakippen, Zigarillos und Joints. Das Werkzeug dafür kaufst du im Shop am PC, das Material hat Kalle. Am Tisch wählst du die Sorte mit den Tasten 1 bis 5, jede hat eigene Schritte. Kunden haben Lieblingssorten und wollen mit der Zeit immer mehr. Joints bringen viel Geld, riechen aber: Mama sucht gründlicher, die Polizei verlangt dreifache Strafe. Was in Box und Taschen liegt, zeigt die App Lager auf dem Handy.', draw: (c, w, h) => pic(c, w, h, '#1a1f2a', '#8dffb8', '1 2 3 4 5') },
  { t: 'Vapes', x: 'Mit dem Boss-Plan-Knoten „Vapes“ (nach den Joints) verkauft Elektro-Erwin gegenüber die Teile: Akkus, Platinen, Verdampferköpfe, Tanks, Gehäuse, Liquid-Base und Aromen. Er hat von 8 bis 20 Uhr offen. Die Werkbank kaufst du im Shop am PC, sie steht dann im Bunker unter dem großen Bildschirm. Die Teile kommen über den Rucksack in die Teilekiste neben der Werkbank. An der Werkbank: Liquid mischen, drei Lötpunkte treffen (Leertaste, wenn der Lötkolben im grünen Feld ist, sonst brennt die Platine durch), dann die Teile von innen nach außen ins Gehäuse ziehen. Vapes bringen 15 bis 25 Euro, Kunden nehmen höchstens drei.', draw: (c, w, h) => pic(c, w, h, '#0a1a2a', '#5ad8ff', 'VAPE') },
  { t: 'Selber rauchen', x: 'Alle fünf Minuten wird alles schwarz-weiß: Du brauchst eine Zigarette. Geh raus und halte R, dann rauchst du etwas aus deinen Taschen (R nur antippen wechselt die Sorte, der Joint bleibt für Kunden). Vorteile bringt es keine, nur Husten. Rauchst du im Zimmer, steht alles voll Qualm: Nimm das Handtuch vom Bett (E) und schüttel ihn mit Klicks oder der Leertaste raus. Wasser am Brunnen (F) bringt die Farben auch zurück, ganz ohne Rauch.', draw: (c, w, h) => pic(c, w, h, '#4a4a4a', '#d8d8d8', 'R') },
  { t: 'Reden und Ereignisse', x: 'Draußen kannst du mit allen reden: jemanden anschauen, G drücken, dann mit den Zahlentasten fragen. Morgens, mittags, abends und nachts sind andere Leute da und erzählen anderes. Manche brauchen Hilfe: Das bringt Respekt oder Geld. Dazu passiert alle ein bis zwei Minuten etwas. Klopft die Familie an deine Tür, antworte mit 1, 2 oder 3. Gute Antworten halten die Kontrolle auf, schlechte holen sie her. Qualm im Zimmer riechen die Eltern nach 18 Sekunden.', draw: (c, w, h) => pic(c, w, h, '#1c3a2a', '#bfe3a8', 'G') },
  { t: 'Rad, Kumpels und deine Marke', x: 'Im Shop am PC gibt es Fahrrad (300 €) und E-Roller (900 €): Draußen steigst du mit B auf und ab. Dort kaufst du auch acht Sachen fürs Zimmer, jede tarnt ein bisschen. In der App „Meine Marke“ am PC gestaltest du Name, Farbe und Zeichen. Auf dem Handy warnen dich die Kumpels (App „Kumpels“) und schreiben Quatsch. Bei Rudi vor dem Kiosk steht eine Wasserpfeife: E. Sie bringt nur die Farben zurück und Husten. Hast du den Doppelgänger-Trick, sitzt die Puppe an deinem Schreibtisch.', draw: (c, w, h) => pic(c, w, h, '#10302a', '#8dffd0', 'B') },
  { t: 'Tag und Nacht draußen', x: 'Ein Tag dauert 20 Minuten (Uhr oben links). Nachts fährt oft die Polizei Streife: Mit Ware in den Taschen bist du dran. Tagsüber fahren die Eltern manchmal einkaufen, dann kontrolliert keiner, aber pass auf, wenn das Auto zurückkommt. Herr Krause von nebenan petzt, und im Park warten Kunden, die mehr zahlen.', draw: (c, w, h) => pic(c, w, h, '#16243a', '#ffcf5a', '☀️🌙') },
  { t: 'Später: der Bunker', x: 'Im Boss-Plan (Tarnung) gibt es die Falltür. Unter dem kleinen Teppich neben dem Tisch geht es dann per Leiter in einen riesigen Bunker mit Tiefgarage. Maschinen schaltest du im Boss-Plan frei und kaufst sie mit Geld im Shop am Gaming-PC. Unten werden sie dann aufgebaut, manche musst du mit E bedienen. Am Bunker-PC kommen Aufträge von Läden, geliefert wird per Lastwagen. Vor Mama warnt dich unten nur der KippCord-Chat. Mach die Falltür zu, sonst nagelt sie sie zu.', draw: (c, w, h) => pic(c, w, h, '#20242a', '#e8b81c', '▼ BUNKER') },
  { t: 'Bunker: Regale, Sorten-Maschinen, Razzia', x: 'Im Bunker stehen hinter dem Lager fünf Regale, eins je Sorte (die drei Vapes teilen sich eins). E legt alle Stück der Sorte aus den Taschen hinein, F nimmt heraus. Im Shop am PC gibt es je eine Maschine für Stopfkippen, Aromakippen, Zigarillos und Liquid-Base. Sie nehmen Material aus der Kiste und füllen die Regale. Joints bleiben Handarbeit. Die Großhändler wollen manchmal auch neue Sorten, geliefert wird dann aus dem passenden Regal. Selten kommt eine Razzia: zwei Minuten, um vier Dinge zu erledigen (Plane über die Paletten, Vorhang vor die Regale, Maschinen aus, Rolltor runter). Schaffst du alle, gibt es Respekt, sonst ist ein Drittel vom Lager und von den Regalen weg.' },
];

export function createLudwig(ctx) {
  const { renderer, audio, $, store, settings, showScreen, G, shadowSize } = ctx;
  const hud = $('ludwig'); const canvas = $('gl'); const snd = createLudwigSound(audio);
  const saves = createSaves(store, fixSave, { idx: 'ludwigSlots', key: 'ludwigSave.', legacy: null });
  const tour = createTour({ root: hud, store, key: 'lwTutSeen2', steps: STEPS });
  const bday = createBirthdayCard({ root: hud, store, snd }); // Geburtstagskarte für Ludwig (22.11.2026), einmal pro PC
  const C = { on: false, W: null, S: null, slot: null, cam: new THREE.PerspectiveCamera(70, 16 / 9, 0.02, 260), mode: 'menu', area: 'zimmer', climb: null, truckQ: 0, seat: -1, rollSeat: 1, me: { x: START_POS.x, z: START_POS.z, yaw: 0, pitch: 0, vx: 0, vz: 0, bob: 0, moving: 0, dist: 0 }, keys: {},
    camFrom: null, camT: 1, ui: null, anim: null, queued: 0, t: 0, saveT: 0, toastT: 0, vis: null, giveA: null, deal: null, target: null, fast: false, dirty: true, prevTone: undefined, lockQuiet: false, held: null, heldN: -1 };
  const camPos = V3(); const camLook = V3(); const tmp = V3(); const tmp2 = V3(); const fwd = V3(); const CP = newPose(); const LP = newPose();

  // ---------------- Aufbau ----------------
  function build() {
    if (C.W) return; C.W = buildLudwigWorld(renderer, { shadows: !!settings.shadows, shadowSize: shadowSize ? shadowSize() : 2048 }); C.W.scene.add(C.cam); C.BK = buildBunker(C.W.scene, C.W.cigGeo, C.W.cigMats, renderer); C.WB = buildWerkbank(C.BK.root); C.HT = buildHatch(C.W.scene, C.W.T.rug); C.AU = buildAussen(C.W.scene, C.W); RD.build(); C.SA = buildSortArt(C.W); C.KI = buildKiste(C.W); C.OL = createOutline(); C.EG = createEggs({ W: C.W, AU: C.AU, BK: C.BK, snd, toast, getS: () => C.S, found: foundEgg }); RA.build(); PA.build(); T3.build(); C.W.out.g.traverse((o) => { if (o.isGroup && Math.abs(o.position.x + 3.2) < 0.01 && Math.abs(o.position.z - (FZ - 5.0)) < 0.05) o.visible = false; });
    C.dayRefs = {}; const R0 = C.dayRefs; for (const o of C.W.scene.children) { if (o.isHemisphereLight && !R0.hemi) { R0.hemi = o; R0.hemi0 = o.intensity; } else if (o.isDirectionalLight && !R0.moon) { R0.moon = o; R0.moon0 = o.intensity; } else if (o.isSpotLight && o.intensity > 20 && !R0.street) { R0.street = o; R0.street0 = o.intensity; } } /* nur die Lichter des Zimmers (der Bunker hat eigene) */
    C.W.out.g.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.parameters && o.geometry.parameters.width === 220 && !R0.sky) { R0.sky = o; o.material.transparent = true; } });
    C.shadowLights = []; C.W.scene.traverse((o) => { if (o.isSpotLight) C.shadowLights.push(o); }); // Schatten im Spiel an/aus
    C.story = createLudwigStory({ W: C.W, snd, $, hud, setCam: (p, l, f) => { C.cineCam = { p: p.clone(), l: l.clone(), f }; }, frontWall: (on) => { for (const w of C.W.room.front) w.visible = on; } });
    const held = new THREE.Group(); held.position.set(0.27, -0.24, -0.48); held.rotation.set(0.25, -0.35, 0.1); C.cam.add(held); C.held = held; // Kippen in der Hand (unten rechts im Bild)
    // seit 2026-11-21 je Sorte eigene Stäbe (vorher immer 12 Kippen, auch mit Vapes, Joints oder Zigarillos in der Tasche): 12 Stück je Sorte, sichtbar nur, was gerade in der Hand ist
    C.heldPool = {}; const heldKind = (k, geo, mat) => { C.heldPool[k] = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(geo, mat); m.visible = false; held.add(m); return m; }); };
    heldKind('kippe', C.W.cigGeo, C.W.cigMats); for (const k of Object.keys(C.SA.geos)) heldKind(k, C.SA.geos[k], C.SA.mat);
  }
  function applyRenderer(on) { if (on) { if (C.prevTone === undefined) { C.prevTone = renderer.toneMapping; C.prevExp = renderer.toneMappingExposure; } renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; } else if (C.prevTone !== undefined) { renderer.toneMapping = C.prevTone; renderer.toneMappingExposure = C.prevExp; C.prevTone = undefined; } }

  // ---------------- Oberfläche ----------------
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  function toast(msg, ms = 2600) { const t = $('lwToast'); t.textContent = msg; t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); C.toastT = ms / 1000; }
  // Zahlen in der Leiste zählen hoch oder runter und hüpfen kurz, wenn sie sich ändern
  const shown = {};
  function setNum(id, value, fmt, segId) {
    const e = $(id); const old = shown[id]; if (old === value) return; shown[id] = value; const seg = segId ? $(segId) : null;
    if (old === undefined || typeof value !== 'number' || typeof old !== 'number') { e.textContent = fmt(value); return; }
    const t0 = performance.now(); const from = old; const run = (now) => { if (shown[id] !== value) return; const k = clamp((now - t0) / 380, 0, 1); const v = Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3))); e.textContent = fmt(v); if (k < 1) requestAnimationFrame(run); }; requestAnimationFrame(run);
    if (seg) { seg.classList.remove('lw-pop'); void seg.offsetWidth; seg.classList.add('lw-pop'); }
  }
  function gain(text) {
    const seg = $('lwSegMoney'); const g = el('div', 'lw-gain', text); seg.append(g); setTimeout(() => g.remove(), 1600);
    for (let i = 0; i < 12; i++) { const s = el('i', 'lw-spark'); const a = Math.random() * Math.PI * 2; const d = 30 + Math.random() * 50; s.style.left = '30px'; s.style.top = '22px'; s.style.setProperty('--dx', `${Math.cos(a) * d}px`); s.style.setProperty('--dy', `${Math.sin(a) * d - 20}px`); seg.append(s); setTimeout(() => s.remove(), 950); }
  }
  function plusOne(text = '+1 Kippe') { const p = el('div', 'lw-plus', text); hud.append(p); setTimeout(() => p.remove(), 1000); }
  function respPop(n) { if (!(n > 0)) return; const seg = $('lwSegResp'); const g = el('div', 'lw-gain resp', `+${n} ⭐`); seg.append(g); setTimeout(() => g.remove(), 1600); }
  const kioskWay = (S) => (lieferOn(S) ? 'Bestellen mit K.' : 'Raus zum Kiosk: F am Fenster.');
  function refresh() {
    const S = C.S; if (!S) return; C.dirty = false; const cap = boxCap(S); const hc = handCap(S);
    setNum('lwGeld', S.geld, euro, 'lwSegMoney'); setNum('lwResp', S.respekt, (v) => v.toLocaleString('de-DE'), 'lwSegResp'); $('lwSegLager').classList.toggle('hidden', !bunkerOpen(S)); setNum('lwLager', S.bunker.lager, (v) => v.toLocaleString('de-DE'), 'lwSegLager'); const bt = boxTotal(S); const ht = handTotal(S); setNum('lwKippen', bt, (v) => `${v}/${cap}`, 'lwSegBox'); setNum('lwHand', ht, (v) => `${v}/${hc}`, 'lwSegHand'); setNum('lwPapier', S.papier, String, 'lwSegPapier'); setNum('lwTabak', S.tabak, String, 'lwSegTabak'); { const ck = clock(S); $('lwZeit').textContent = ck.text; $('lwZeitP').textContent = { morgen: 'Morgen', tag: 'Tag', abend: 'Abend', nacht: 'Nacht' }[ck.phase] + (S.welt.weg > 0 ? ' · Eltern weg' : ''); $('lwZeitI').textContent = ck.light > 0.5 ? '☀️' : '🌙'; } $('lwSegSack').classList.toggle('hidden', !(C.area === 'draussen' || sackUsed(S) > 0)); setNum('lwSack', sackUsed(S), (v) => `${v}/${sackCap(S)}`, 'lwSegSack');
    C.WB.set(S); // Werkbank im Bunker (Teil 2)
    PA.refresh(); // Marke, Zimmer, Räder (Paket 4)
    C.KI.set(S.up.kiste || 0, Object.fromEntries(MAT_ORDER.map((k) => [k, matOf(S, k) > 0]))); // Packungen in der Materialkiste
    if (shown.cap !== cap) { shown.cap = cap; $('lwKippen').textContent = `${bt}/${cap}`; } if (shown.hc !== hc) { shown.hc = hc; $('lwHand').textContent = `${ht}/${hc}`; } sortHud(S);
    $('lwBoxFill').style.width = `${clamp(bt / cap, 0, 1) * 100}%`; $('lwSegBox').classList.toggle('full', bt >= cap); $('lwSegPapier').classList.toggle('low', S.papier < 3); $('lwSegTabak').classList.toggle('low', S.tabak < 3); $('lwSegHand').classList.toggle('has', ht > 0);
    const sitting = C.mode === 'sit'; $('lwRoll').classList.toggle('hidden', !sitting); if (!sitting) $('lwSorts').classList.add('hidden'); // Sortenwahl nur im Sitzen (links unten) $('lwCross').classList.toggle('hidden', C.mode !== 'walk');
    let hint = ''; let warn = false; const sid = S.sorte || 'kippe'; const SD = SORTEN[sid]; const sst = stepOf(S, sid); const left = materialForSort(S, sid);
    if (sitting) {
      const need = Object.entries(SD.steps[sst].use || {}).find(([k, n]) => matOf(S, k) < n);
      if (sst === 0 && bt >= cap) { hint = 'Box voll! Am PC gibt es eine größere. E zum Aufstehen.'; warn = true; }
      else if (!sortReady(S, sid)) { hint = `Für ${SD.plural} fehlt das Werkzeug: ${TOOLS[SD.tool].name} im Shop am PC.`; warn = true; }
      else if (need) { hint = `${need[0] === 'papier' ? 'Keine Blättchen' : need[0] === 'tabak' ? 'Kein Tabak' : `Keine ${MAT_NAMES[need[0]]}`} mehr. ${wayFor(S, need[0])}`; warn = true; }
      else if (left <= 3) { hint = `Material reicht nur noch für ${left} ${sortWord(sid, left)}. ${kioskWay(S)}`; warn = true; } else hint = `Klick oder Leertaste: ${SD.steps[sst].verb}${sortChoices(S).length > 1 ? ' · 1 bis 5: Sorte' : ''} · E aufstehen`;
    }
    $('lwHint').textContent = hint; $('lwHint').classList.toggle('warn', warn);
    const front = S.queue[0]; const w = $('lwWin'); const showWin = !!front && C.mode !== 'menu' && !C.ctrl; const ar = S.eltern ? S.eltern.arrest : 0; $('lwArrest').classList.toggle('hidden', !(ar > 0) || !!C.ctrl); if (ar > 0) $('lwArrestT').textContent = `${Math.floor(ar / 60)}:${String(Math.ceil(ar % 60) % 60).padStart(2, '0')}`; if (showWin && w.classList.contains('hidden')) { w.classList.remove('hidden'); } else if (!showWin) w.classList.add('hidden');
    if (front) { $('lwWinT').textContent = `${front.name} will ${front.want} ${sortWord(front.sorte || 'kippe', front.want)}`; $('lwWinN').textContent = S.queue.length > 1 ? `+${S.queue.length - 1} ${S.queue.length === 2 ? 'wartet' : 'warten'} draußen` : ''; }
  }
  // Geduld als abbrennende Zigarette: das Papier wird kürzer, die Glut wandert nach links
  function winTick() {
    const S = C.S; const c = S && S.queue[0]; const f = $('lwFuse'); if (!c) return; const k = c.max < 0 ? 1 : clamp(c.wait / c.max, 0, 1); const W = 116 * k;
    $('lwFuseP').style.width = `${W}px`; $('lwFuseE').style.left = `${34 + W - 2}px`; $('lwFuseS').style.left = `${34 + W - 4}px`; f.classList.toggle('low', k < 0.3); f.style.opacity = c.max < 0 ? '0.55' : '1';
  }
  // Drehstation: jeder Schritt hat einen Glut-Ring als Ladebalken, dazu ein Balken für die ganze Kippe
  const RING = 169.6;
  function rollUiTick() {
    if (C.mode !== 'sit' || !C.S) return; const S = C.S; const a = C.anim; const id = a ? a.sorte : (S.sorte || 'kippe'); syncRollSteps(id); const n = SORTEN[id].steps.length; const cur = stepOf(S, id);
    const k = a ? clamp(a.t / a.dur, 0, 1) : 0; const steps = $('lwRSteps').children; const active = a ? a.step : cur;
    for (let i = 0; i < steps.length; i++) { const done = a ? i < a.step : i < cur; const on = i === active; steps[i].classList.toggle('on', on); steps[i].classList.toggle('done', done); const ring = steps[i].querySelector('.p'); ring.style.strokeDashoffset = String(done ? 0 : on && a ? RING * (1 - k) : RING); }
    $('lwRBar').style.width = `${((a ? a.step + k : cur) / n) * 100}%`; sortBarTick(S);
  }
  // ---------------- Sorten (Spielprinzip Teil 1, 2026-11-20): Auswahl mit 1 bis 5, eigene Schritte, Anzeige in der Leiste ----------------
  let rollKids0 = null; let rollFor = 'kippe';
  function syncRollSteps(id) { // die klassische Kippe behält ihre gezeichneten Schritte (dieselben Elemente, kein innerHTML: die Ringe tragen schon style-Werte, die CSP verbietet sie im HTML), die neuen Sorten zeigen Bildchen
    if (rollFor === id) return; const box = $('lwRSteps'); if (rollKids0 === null) rollKids0 = [...box.children]; rollFor = id;
    if (id === 'kippe') { box.replaceChildren(...rollKids0); return; } box.textContent = '';
    for (const sp of SORTEN[id].steps) { const d = el('div', 'lw-rstep'); const ico = el('div', 'ico'); ico.innerHTML = '<svg class="ring" viewBox="0 0 62 62"><circle class="bg" cx="31" cy="31" r="27"/><circle class="p" cx="31" cy="31" r="27"/></svg>'; ico.append(el('i', 'emo', sp.ico)); d.append(ico, el('span', '', sp.name)); box.append(d); }
  }
  // ---- Hand unten rechts im Bild: bis zu 12 Stäbe, reihum auf die Sorten verteilt (jede Sorte in der Tasche ist zu sehen), nebeneinander in Bündeln zu drei übereinander
  const HELD_R = { kippe: CIG.r, stopf: CIG.r, aroma: CIG.r, zigarillo: 0.0102, joint: 0.0105, vmango: 0.0092, vmenthol: 0.0092, vkirsche: 0.0092 };
  function heldShares(S) {
    const list = []; if (S.hand > 0) list.push(['kippe', S.hand, 0]); for (const id of SORT_ORDER) { const n = S.sorten && S.sorten[id] ? S.sorten[id].hand : 0; if (n > 0) list.push([id, n, 0]); }
    let left = 12; let more = true; while (left > 0 && more) { more = false; for (const o of list) if (left > 0 && o[2] < o[1]) { o[2]++; left--; more = true; } }
    return list.filter((o) => o[2] > 0).map(([k, , s]) => [k, s]);
  }
  function layoutHeld(parts) {
    for (const arr of Object.values(C.heldPool)) for (const m of arr) m.visible = false; let x = 0; const placed = [];
    for (const [k, s] of parts) { const pool = C.heldPool[k] || C.heldPool.kippe; const sp = (HELD_R[k] || 0.009) * 2 + 0.0015;
      for (let j = 0; j < s; j++) { const m = pool[j]; m.position.set(x + Math.floor(j / 3) * sp, (j % 3) * sp, (((j * 7) % 3) - 1) * 0.006); m.rotation.set(0, Math.PI / 2 + (((j * 5) % 3) - 1) * 0.04, 0); m.visible = true; placed.push(m); }
      x += Math.ceil(s / 3) * sp + 0.004; }
    const shift = Math.max(0, x - 0.004) / 2; for (const m of placed) m.position.x -= shift;
  }
  const sortChoices = (S) => SORT_ORDER.filter((id) => sortUnlocked(S, id) && !SORTEN[id].werkbank); // Vapes entstehen an der Werkbank, nicht am Tisch
  function sortBarTick(S) {
    const bar = $('lwSorts'); const list = sortChoices(S); bar.classList.toggle('hidden', list.length < 2); if (list.length < 2) return;
    const key = list.map((id) => id + (sortReady(S, id) ? '1' : '0')).join(',');
    if (bar.dataset.k !== key) { bar.dataset.k = key; bar.textContent = ''; for (const id of list) { const D = SORTEN[id]; const b = el('button', 'lw-sort'); b.type = 'button'; b.dataset.s = id; const tx = el('span'); tx.append(el('b', '', D.plural), el('small', '', '')); b.append(el('i', 'lw-key', String(SORT_ORDER.indexOf(id) + 1)), el('em', '', D.icon), tx); bar.append(b); } }
    for (const b of bar.children) { const id = b.dataset.s; const ready = sortReady(S, id); b.classList.toggle('sel', id === (S.sorte || 'kippe')); b.classList.toggle('locked', !ready); const t = ready ? `${boxOf(S, id)} in der Box` : 'Werkzeug fehlt'; const sm = b.querySelector('small'); if (sm.textContent !== t) sm.textContent = t; }
  }
  $('lwSorts').addEventListener('click', (e) => { const b = e.target.closest('button[data-s]'); if (b) chooseSort(b.dataset.s); });
  function chooseSort(id) {
    const S = C.S; if (!S || !SORTEN[id]) return false; if (!sortUnlocked(S, id)) { snd.nope(); toast(`${SORTEN[id].plural} sind noch nicht frei: Boss-Plan, Ast Produktion.`); return false; }
    if (!sortReady(S, id)) { snd.nope(); toast(`Für ${SORTEN[id].plural} fehlt das Werkzeug: ${TOOLS[SORTEN[id].tool].name} im Shop am PC.`, 3200); return false; }
    C.pickT = performance.now(); if (S.sorte === id) return true; setSorte(S, id); snd.ui(); C.dirty = true; toast(`Jetzt: ${SORTEN[id].plural}`, 1400); save(); return true;
  }
  // Leiste oben: Box und Taschen zählen alle Sorten, darunter steht die gewählte Sorte, daneben ihr Spezialmaterial (alles andere zeigt die App Lager auf dem Handy)
  function sortHud(S) {
    const multi = sortChoices(S).length > 1; const id = S.sorte || 'kippe'; const D = SORTEN[id];
    const bl = multi ? `${D.icon} ${boxOf(S, id)} ${D.plural}` : 'Box'; if (shown.boxL !== bl) { shown.boxL = bl; $('lwBoxL').textContent = bl; }
    const hs = SORT_ORDER.filter((k) => handOf(S, k) > 0); const hl = multi && hs.length ? hs.map((k) => `${SORTEN[k].icon} ${handOf(S, k)}`).join('  ') : 'Taschen'; if (shown.handL !== hl) { shown.handL = hl; $('lwHandL').textContent = hl; }
    const mats = id === 'kippe' ? [] : [...new Set(D.steps.flatMap((sp) => Object.keys(sp.use || {})))].filter((k) => MATS[k]); $('lwSegMat').classList.toggle('hidden', !mats.length); if (!mats.length) return;
    const m0 = mats[0]; const lab = [MATS[m0].name, ...mats.slice(1).map((k) => `${MATS[k].name} ${matOf(S, k)}`)].join(' · '); const sig = `${m0}|${matOf(S, m0)}|${lab}`;
    if (shown.matL !== sig) { shown.matL = sig; $('lwMatI').textContent = MATS[m0].ico; $('lwMat').textContent = String(matOf(S, m0)); $('lwMatL').textContent = lab; } $('lwSegMat').classList.toggle('low', mats.some((k) => matOf(S, k) < 3));
  }
  // Welche Sorte E an der Box nimmt: die eben gewählte (Taste 1 bis 5), sonst die, die der Kunde am Fenster will, sonst die gewählte, sonst die erste, die da ist
  function takeSort(S) {
    const sel = S.sorte || 'kippe'; const front = S.queue[0]; const want = front ? front.sorte || 'kippe' : null; const recent = C.pickT && performance.now() - C.pickT < 15000;
    if (recent && boxOf(S, sel) > 0) return sel; if (want && boxOf(S, want) > 0) return want; if (boxOf(S, sel) > 0) return sel; return SORT_ORDER.find((k) => boxOf(S, k) > 0) || null;
  }
  function bubbleTick() {
    const b = $('lwBubble'); const v = C.vis; const show = v && !C.ui && C.area === 'zimmer' && (v.phase === 'knock' || v.phase === 'wait' || v.phase === 'take' || (v.phase === 'out' && v.say && v.t < 1.6));
    if (!show) { b.classList.add('hidden'); return; } tmp.set(v.x, OUT_Y + 0.96 + 0.72, CUST_Z); const fern = Math.max(0.3, tmp.distanceTo(C.cam.position)); tmp.project(C.cam); if (tmp.z > 1 || Math.abs(tmp.x) > 1.1 || Math.abs(tmp.y) > 1.1) { b.classList.add('hidden'); return; }
    b.classList.remove('hidden'); const c = C.S.queue.find((q) => q.id === v.id); $('lwBName').textContent = v.name; $('lwBText').textContent = (v.phase === 'take' || v.phase === 'out') ? (v.say || '') : (c ? c.text : '');
    const W = window.innerWidth; const H = window.innerHeight; const bw = b.offsetWidth || 270; const bh = b.offsetHeight || 90; const cx = (tmp.x * 0.5 + 0.5) * W; const kopf = 0.3 * H / 2 * C.cam.projectionMatrix.elements[5] / fern + 12; /* neben dem großen Kopf, nicht davor */
    const x = clamp(cx + kopf + bw < W - 12 ? cx + kopf : cx - kopf - bw, 12, W - bw - 12); const y = clamp((-tmp.y * 0.5 + 0.5) * H - bh * 0.4, 205, H - bh - 170); b.style.transform = `translate(${x | 0}px, ${y | 0}px)`;
  }
  function promptTick() {
    const p = $('lwPrompt'); const t = C.target; $('lwCross').classList.toggle('aim', !!t && !t.info && C.mode === 'walk' && !C.ui);
    if (!t || C.ui || C.mode !== 'walk') { p.classList.add('hidden'); return; } p.classList.remove('hidden'); $('lwPE').textContent = t.e || ''; $('lwPEk').classList.toggle('hidden', !t.e || !!t.info || /voll|leer/.test(t.e) || !!t.info2); $('lwPF').textContent = t.f || ''; $('lwPFk').classList.toggle('hidden', !t.f);
  }

  // ---------------- Laufen ----------------
  function collide(x, z) {
    if (C.area === 'bunker') return collideBunker(x, z);
    if (C.area === 'draussen') return collideOut(C.me.x, C.me.z, x, z, R, C.AU.extraBoxes(C.me.x, C.me.z).concat(PA.draussenBoxen())); // nachts ist Erwins Tür zu
    const RM = ROOM; x = clamp(x, RM.x0 + R, RM.x1 - R); z = clamp(z, RM.z0 + R, RM.z1 - R);
    for (let it = 0; it < 2; it++) for (const b of [...colliders(C.S ? C.S.up.box : 0), KISTE_BOX, ...PA.zimmerBoxen()]) { const cx = clamp(x, b.x0, b.x1); const cz = clamp(z, b.z0, b.z1); const dx = x - cx; const dz = z - cz; const d = Math.hypot(dx, dz); if (d < R) { if (d > 1e-6) { x = cx + dx / d * R; z = cz + dz / d * R; } else { const pen = [x - b.x0, b.x1 - x, z - b.z0, b.z1 - z]; const k = pen.indexOf(Math.min(...pen)); if (k === 0) x = b.x0 - R; else if (k === 1) x = b.x1 + R; else if (k === 2) z = b.z0 - R; else z = b.z1 + R; } } }
    return [x, z];
  }
  function walk(dt) {
    const m = C.me; const k = C.keys; let f = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); let s = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0); if (C.ui || tour.open || busyCtrl() || C.hiddenSpot) { f = 0; s = 0; }
    const faehrt = C.area === 'draussen' ? PA.tempo() : 0; const run = !faehrt && (k.ShiftLeft || k.ShiftRight); const len = Math.hypot(f, s) || 1; const sp = faehrt || (run ? RUN : WALK) * (C.S && C.S.buff && C.S.buff.energy > 0 ? 1.3 : 1); const sn = Math.sin(m.yaw); const cs = Math.cos(m.yaw);
    const wx = (-sn * f + cs * s) / len * sp; const wz = (-cs * f - sn * s) / len * sp; const a = 1 - Math.exp(-dt * 12); m.vx += (wx * (f || s ? 1 : 0) - m.vx) * a; m.vz += (wz * (f || s ? 1 : 0) - m.vz) * a;
    const x0 = m.x; const z0 = m.z; const teile = Math.max(1, Math.ceil(Math.hypot(m.vx, m.vz) * dt / 0.15)); /* schnell fahren: in Schritten, sonst springt man durch dünne Hindernisse */
    for (let i = 0; i < teile; i++) [m.x, m.z] = collide(m.x + m.vx * dt / teile, m.z + m.vz * dt / teile);
    const { x, z } = m; const moved = Math.hypot(x - x0, z - z0); if (C.area === 'draussen') m.gy = (m.gy || 0) + (groundY(x, z) - (m.gy || 0)) * Math.min(1, dt * 10); m.moving = moved / Math.max(dt, 1e-4);
    if (faehrt) { m.bob = 0; m.dist = 0; } else if (m.moving > 0.3) { m.bob += dt * m.moving * 2.4; m.dist += moved; if (m.dist > (run ? 0.95 : 0.7)) { m.dist = 0; snd.step(run ? 1 : 0.7); } } else m.bob *= 0.9;
  }
  const eyePos = (out) => out.set(C.me.x, EYE + (C.area === 'draussen' ? C.me.gy || 0 : 0) + Math.sin(C.me.bob * 2) * 0.022 * Math.min(1, C.me.moving / 2), C.me.z);

  // ---------------- Benutzen (E und F) ----------------
  const boxToLager = (S) => handTotal(S) === 0 && S.kippen > 0 && bunkerOpen(S) && !(S.bunker.lock > 0); // Box -> Lager im Bunker (F an der Box)
  const boxAnchor = () => (C.S && C.S.up.box >= 3 ? V3((CABINET.x0 + CABINET.x1) / 2, 0.8, (CABINET.z0 + CABINET.z1) / 2) : V3(BOX_POS.x, BOX_POS.y + 0.08, BOX_POS.z));
  // ---- Anschauen (seit 2026-11-21, Wunsch Lennox): leiser Pieps, wenn das Ziel wechselt, und eine leuchtende Umrandung um das, was Ludwig anschaut
  const figHl = (P) => (P && P.fig ? P.fig.root : undefined); // Leute: die ganze Figur
  function hoverTick(dt) { // läuft direkt nach targets(): tmp2 = Augen, fwd = Blickrichtung
    if (!C.OL) return; const t = C.target; const key = t ? `${t.k}:${t.i ?? ''}:${t.id ?? ''}:${t.egg ?? ''}` : '';
    const pick = () => C.OL.set(t ? (t.hl !== undefined ? t.hl : pickOutline(C.W.scene, tmp2, fwd, t.p, C.cam)) : null);
    if (key !== C.hoverKey) { C.hoverKey = key; const now = performance.now(); if (t && now - (C.hoverAt || 0) > 90) { snd.hover(); C.hoverAt = now; } C.olT = 1; C.olW = 0; pick(); }
    else if (t && t.hl === undefined && !C.OL.current() && C.olT > 0) { C.olT -= dt; C.olW -= dt; if (C.olW <= 0) { C.olW = 0.15; pick(); } } // nichts getroffen: kurz weiter versuchen (eigene Zähler: C.pickT gehört der Sortenwahl, die E an der Box 15 s lang bevorzugt)
    C.OL.update(C.t, C.cam);
  }
  // ---- Easter Eggs: Fund melden (3 Respekt, Glitzern), bei allen zehn kommt die goldene Kippe ins Regal (ludwigeggs.js zeigt sie)
  function foundEgg(id) {
    const S = C.S; if (!S) return null; const r = findEgg(S, id);
    if (r.neu) { snd.egg(r.alle); respPop(EGG_RESP); C.dirty = true; save(); if (r.alle) setTimeout(() => { if (C.on) toast('Alle 10 Easter Eggs gefunden! Die goldene Kippe steht jetzt auf deinem Bücherregal.', 5200); }, 4400); }
    return r;
  }
  // ---- Ausreden bei der Kontrolle (seit 2026-11-21 zwölf statt zwei, nie zweimal hintereinander; auf Papas Ladekabel-Frage die passende Antwort) und Sätze beim Erwischtwerden
  const EXCUSES = Array.from({ length: 12 }, (_, i) => `l_ausrede${i + 1}`);
  const pickNot = (list, last) => { const pool = list.length > 1 ? list.filter((id) => id !== last) : list; return pool[(Math.random() * pool.length) | 0]; };
  function excuseFor(c) { if (c.inId === 'p_in2') return 'l_kabel'; C.lastExcuse = pickNot(EXCUSES, C.lastExcuse); return C.lastExcuse; }
  function caughtLine(who) { C.lastCaught = pickNot(['l_erwischt1', 'l_erwischt2', 'l_erwischt4', ...(who === 'mama' ? ['l_erwischt3'] : [])], C.lastCaught); return C.lastCaught; }
  function targets() {
    if (C.mode !== 'walk' || C.ui || !C.S || busyCtrl()) return null; const S = C.S; eyePos(tmp2); fwd.set(-Math.sin(C.me.yaw) * Math.cos(C.me.pitch), Math.sin(C.me.pitch), -Math.cos(C.me.yaw) * Math.cos(C.me.pitch));
    const cand = []; const add = (p, reach, data) => { const d = tmp.copy(p).sub(tmp2); const dist = d.length(); const flat = Math.hypot(p.x - C.me.x, p.z - C.me.z); if (flat > reach) return; const dot = d.dot(fwd) / Math.max(dist, 1e-4); if (dot < (data.minDot || 0.8)) return; const c = { ...data, score: dot - flat * 0.05 }; delete c.hl; Object.defineProperties(c, { hl: { value: data.hl, writable: true }, p: { value: p, writable: true } }); cand.push(c); }; // minDot: genauer hinschauen (Lampe, Rauchmelder); hl (3D-Objekt) und p nicht aufzählbar, damit Ziele als JSON lesbar bleiben
    if (C.area === 'bunker') { bunkerTargets(add); T3.targets(add); C.EG.targets(add, 'bunker'); cand.sort((a, b) => b.score - a.score); return cand[0] || null; }
    if (C.area === 'draussen') { outsideTargets(add); PA.targets(add); C.EG.targets(add, 'draussen'); cand.sort((a, b) => b.score - a.score); return cand[0] || null; }
    if (C.ctrl) { ctrlTargets(add); cand.sort((a, b) => b.score - a.score); return cand[0] || null; }
    SEATS.forEach((s, i) => { if (C.mp ? i !== C.mp.seat : (S.kumpels && i !== 1)) return; add(V3(s.x, 0.62, s.z), 1.25, { k: 'seat', i, e: 'Hinsetzen und drehen' }); });
    const front = S.queue[0]; const busyW = !!(C.mp && front && front.by && front.by !== C.mp.me); add(V3(0, 1.45, ROOM.z0), 1.9, busyW ? { k: 'window', e: `${mpName(front.by)} verhandelt gerade mit ${front.name}`, info2: true, f: 'Aus dem Fenster klettern' } : front ? { k: 'window', e: `Mit ${front.name} verhandeln (${handOf(S, front.sorte || 'kippe')} ${sortWord(front.sorte || 'kippe', handOf(S, front.sorte || 'kippe'))} dabei)`, f: 'Aus dem Fenster klettern' } : { k: 'window', e: 'Gerade klopft niemand.', info2: true, f: 'Aus dem Fenster klettern' });
    { const ht = handTotal(S); add(boxAnchor(), 1.9, { k: 'box', sid: takeSort(S), e: `Box öffnen (${boxTotal(S).toLocaleString('de-DE')} drin)`, f: ht > 0 ? 'Alles zurücklegen' : boxToLager(S) ? 'Alles runter ins Lager (Keller)' : '' }); } // seit 2026-11-20: E öffnet das Inventar
    { const su = sackUsed(S); add(C.KI.anchor, 1.7, { k: 'kiste', hl: C.KI.g, e: `${su > 0 ? 'Materialkiste: Rucksack ausräumen' : 'Materialkiste öffnen'} (${kisteUsed(S)}/${kisteSlots(S)} Fächer)`, f: su > 0 ? 'Alles einräumen' : '' }); }
    add(PC_POS, 1.7, { k: 'pc', hl: C.W.pc && (C.W.pc.mon || C.W.pc.g), e: 'PC: Upgrades kaufen' }); zimmerBunkerTargets(add); C.EG.targets(add, 'zimmer'); RA.targets(add);
    cand.sort((a, b) => b.score - a.score); const t = cand[0] || null; if (t && t.k === 'box' && !t.e && !t.f) t.e = handTotal(S) >= handCap(S) ? 'Taschen voll' : 'Box ist leer'; if (t && t.info) t.e = 'Gerade klopft niemand.'; return t;
  }
  function interact(key) {
    const t = C.target; if (!t || !C.S) return; const S = C.S;
    if (PA.interact(t, key)) return;
    if (T3.interact(t, key)) return;
    if (RA.interact(t, key)) return; if (C.EG && C.EG.interact(t, key)) return; if (bunkerInteract(t, key) || outsideInteract(t, key)) return;
    if (key === 'f' && t.k === 'window') { climbWindow('out'); return; }
    if (key === 'e' && t.k === 'hideme') { hideMe(t.spot); return; } // Mitspieler verstecken sich selbst vor den Eltern (Mehrspieler)
    if (key === 'e' && t.k === 'hide') { hideItem(t.what); return; }
    if (key === 'e' && t.k === 'seat') { sitDown(t.i); return; }
    if (key === 'e' && t.k === 'pc') { openUI('pc'); return; }
    if (key === 'e' && t.k === 'window') { if (S.queue[0] && C.vis && C.vis.id === S.queue[0].id && (C.vis.phase === 'wait' || C.vis.phase === 'knock')) openDeal(); else if (S.queue[0]) toast(`${S.queue[0].name} ist gleich am Fenster.`); return; }
    if (t.k === 'kiste') { // Materialkiste: E öffnet (Rucksack links, Kiste rechts), F räumt alles ein, was passt
      if (key === 'e') { openInv('mat'); return; }
      if (key === 'f') { const g = unpackSack(S); if (g && Object.keys(g).some((k) => !['n', 'rest'].includes(k) && g[k] > 0)) { /* auch halbe Packungen zählen */ snd.take(); toast(g.rest ? `Eingeräumt. ${g.rest} ${g.rest === 1 ? 'Packung passt' : 'Packungen passen'} nicht mehr rein.` : 'Alles in die Materialkiste geräumt.'); } else { snd.nope(); toast(sackUsed(S) > 0 ? 'Die Materialkiste ist voll. Eine größere gibt es im Shop am PC.' : 'Der Rucksack ist leer.'); } C.dirty = true; save(); }
      return;
    }
    if (t.k === 'box') {
      if (key === 'e') { if (!C.ctrl) openInv('box'); return; } // Inventar: Box links, Taschen rechts, ziehen
      if (key === 'f' && boxToLager(S)) { const n = S.kippen; S.kippen = 0; S.bunker.lager += n; snd.take(); toast(`${n} ${n === 1 ? 'Kippe' : 'Kippen'} aus der Box runter ins Lager gebracht.`); } // oben gedreht bleibt in der Box, F bringt es in den Keller
      else if (key === 'f') { const r = putBack(S); if (r.ok) { snd.take(); toast(`${r.n} zurück in die Box.`); } else { snd.nope(); toast(r.why === 'voll' ? 'Die Box ist voll.' : 'Du hast nichts dabei.'); } }
      C.dirty = true; save();
    }
  }

  // ---------------- Sitzen und Drehen ----------------
  function sitDown(i) { if (C.mode !== 'walk') return; C.seat = i; C.rollSeat = i; setMode('sit'); snd.sit(); unlock(); C.dirty = true; }
  function standUp() { if (C.mode !== 'sit') return; const s = SEATS[C.seat]; [C.me.x, C.me.z] = seatAt(s, 0.55); C.me.x += s.tz * 0.3; C.me.z -= s.tx * 0.3; C.me.yaw = Math.atan2(-s.tx, -s.tz); C.me.pitch = -0.25; [C.me.x, C.me.z] = collide(C.me.x, C.me.z); C.seat = -1; C.anim = null; C.queued = 0; setMode('walk'); C.dirty = true; }
  const canRoll = () => C.on && C.S && !C.ui && !tour.open && C.mode === 'sit';
  function tryRoll() { if (!canRoll()) return; if (C.anim) { if (C.queued < 1) C.queued = 1; return; } startRoll(); }
  // Was fehlt, in Worten (seit 2026-11-20 auch Werkzeug und Material der neuen Sorten)
  function needText(need, id) {
    if (need === 'box') return 'Die Box ist voll! Am PC gibt es eine größere.'; if (need === 'tool') return `Für ${SORTEN[id].plural} fehlt das Werkzeug: ${TOOLS[SORTEN[id].tool].name} im Shop am PC.`;
    const what = need === 'papier' ? 'Keine Blättchen' : need === 'tabak' ? 'Kein Tabak' : `Keine ${MAT_NAMES[need] || need}`; return `${what} mehr! ${wayFor(C.S, need)}`;
  }
  // Fehlt Material, das noch im Rucksack steckt: erst in die Materialkiste räumen (seit 2026-11-20 nicht mehr von selbst)
  const wayFor = (S, k) => (S.sack && S.sack[k] > 0 ? 'Im Rucksack ist noch welches: neben deinem Stuhl in die Materialkiste räumen (E).' : kioskWay(S));
  const STEP_SND = { 'stopf:tube': 'tube', 'stopf:press': 'press', 'stopf:finish': 'pop', 'aroma:extra': 'capsule', 'zigarillo:paper': 'leaf', 'zigarillo:finish': 'band', 'joint:extra': 'tipRoll', 'joint:fill': 'herb', 'joint:finish': 'lick' };
  function startRoll() {
    const S = C.S; const id = S.sorte || 'kippe'; const D = SORTEN[id]; const r = rollSort(S, id);
    if (!r.ok) { snd.nope(); toast(needText(r.need, id)); C.dirty = true; return; }
    const sp = D.steps[r.step]; const last = r.step === D.steps.length - 1;
    C.anim = { step: r.step, t: 0, dur: C.fast ? 0.02 : sp.dur / rollSpeed(S) * rollMul(S), seat: C.rollSeat, slot: r.done && id === 'kippe' ? S.kippen - 1 - (r.extra || 0) : -1, extra: r.extra || 0, sorte: id, last }; C.dirty = true;
    const ro = sp.role; const own = STEP_SND[id + ':' + ro]; /* eigene Geräusche je Sorte (seit 2026-11-21) */ if (own) snd[own](); else if (ro === 'paper' || ro === 'tube') snd.paper(); else if (ro === 'fill' || ro === 'extra') snd.crumble(); else if (ro === 'roll') snd.roll(); else if (ro === 'press') snd.crank(); else snd.tap();
  }
  function endRoll() { const a = C.anim; C.anim = null; if (a && a.last) { snd.whoosh(); plusOne(a.sorte === 'kippe' ? (a.extra ? '+2 Kippen!' : '+1 Kippe') : `+1 ${SORTEN[a.sorte].name}`); C.dirty = true; save(); } if (C.queued > 0 && canRoll()) { C.queued = 0; startRoll(); } else C.queued = 0; }
  // Sichtbare Dreh-Sachen: an Ludwigs Platz (Schritte per Klick) und an den Plätzen der Kumpels (laufen von selbst)
  function renderSeat(si, a, state) {
    const W = C.W; const S = C.S; const pr = W.seats[si]; const SS = SEATS[si]; const P0 = pr.lspot; const k = a ? clamp(a.t / a.dur, 0, 1) : 1; const step = a ? a.step : -1; const curl = pr.curl; const tob = pr.tob; const cig = pr.cig;
    curl.mesh.visible = state >= 1 && state <= 3; tob.visible = state >= 2 && state <= 3; cig.visible = state === 4;
    if (curl.mesh.visible) {
      if (step === 0) { const e = ease(k); const B = pr.lbook; curl.mesh.position.set(lerp(B.x, P0.x, e), lerp(B.y + 0.012, P0.y, e) + Math.sin(e * Math.PI) * 0.07, lerp(B.z, P0.z, e)); curl.mesh.rotation.set(0, lerp(0.18, 0, e), Math.sin(e * Math.PI) * 0.25); curl.set(THETA_FLAT); }
      else { curl.mesh.position.copy(P0); curl.mesh.rotation.set(0, 0, 0); curl.set(step === 2 ? lerp(THETA_FLAT, THETA_ROLL, ease(k)) : state >= 3 ? THETA_ROLL : THETA_FLAT); }
    }
    if (tob.visible) { const r = curl.radius(); const rolled = step === 2 ? ease(k) : state >= 3 ? 1 : 0; const inner = Math.min(CIG.r * 0.86, r * 0.9); const grow = step === 1 ? Math.max(0.05, ease(k)) : 1; const sy = lerp(0.0042, inner, rolled) * grow; const sz = lerp(0.016, inner, rolled) * Math.max(0.2, grow); pr.log.scale.set(0.031 * Math.max(0.3, grow), sy, sz); tob.position.set(P0.x, P0.y + lerp(sy * 0.65, r, rolled), P0.z); pr.setCrumbs(step === 1 ? k : 1, lerp(1, 0.25, rolled)); tob.children[1].visible = rolled < 0.9; }
    if (cig.visible) { // Festklopfen, dann fliegt sie genau an ihren Platz in der Box (die Kippe liegt in der Welt, der Platz ist gedreht)
      const Q = SS.spot; const qx = Math.cos(SS.rot) * 0.02; const qz = -Math.sin(SS.rot) * 0.02;
      if (k < 0.5) { const u = k / 0.5; const up = ease(Math.min(1, u * 2.2)); const tap = u > 0.45 ? Math.abs(Math.sin((u - 0.45) / 0.55 * Math.PI * 2)) * 0.03 : 0; cig.position.set(Q.x + up * qx, Q.y + CIG.r + up * (CIG.len / 2 - CIG.r) + tap + 0.002, Q.z + up * qz); cig.rotation.set(0, SS.rot, up * Math.PI / 2); }
      else { const u = ease((k - 0.5) / 0.5); const B = W.stash.slot(S.up.box, Math.max(0, a.slot), tmp); cig.position.set(lerp(Q.x + qx, B.x, u), lerp(Q.y + CIG.len / 2, B.y, u) + Math.sin(u * Math.PI) * 0.22, lerp(Q.z + qz, B.z, u)); cig.rotation.set(0, SS.rot + u * Math.PI * 2, lerp(Math.PI / 2, 0, u)); }
    }
  }
  function propsTick() {
    const W = C.W; const S = C.S; const a = C.anim; const hidden = C.ctrl && C.ctrl.hidden.mat; const mine = a ? a.seat : C.mode === 'sit' ? C.seat : C.rollSeat; const sid = a ? a.sorte : (S.sorte || 'kippe'); if (C.mp) { mpProps(a, hidden, mine, sid); return; } /* Mehrspieler: die Plätze der anderen nach ihren Posen */
    for (let i = 0; i < SEATS.length; i++) {
      const K = C.kumpel.find((q) => q.seat === i); let anim = null; let state = 0;
      if (i === mine && !(K && S.kumpels) && sid !== 'kippe' && !hidden) { C.SA.render(i, sid, SORTEN[sid], a, stepOf(S, sid), S, SEATS[i], S.up.box); continue; } // neue Sorte: eigene Sachen am Platz (ludwigsortart.js)
      C.SA.hide(i);
      if (i === mine && !(K && S.kumpels)) { anim = a; state = a ? a.step + 1 : S.roll; } else if (K && S.kumpels) { anim = kumpelAnim(K); state = anim ? anim.step + 1 : 0; }
      if (hidden) state = 0; renderSeat(i, anim, state);
    }
    W.stash.set(S.up.box, S.kippen - (a && a.sorte === 'kippe' && a.last ? 1 : 0)); C.SA.stashSet(S.up.box, S, a && a.sorte !== 'kippe' && a.last ? a.sorte : null);
  }

  // ---------------- Kunden ----------------
  // Jeder Kunde spricht seine Sätze mit seiner eigenen Stimme (Aufnahmen werden beim Erscheinen geladen)
  const CUST_IDS = ['dank1', 'dank2', 'dank3', 'weg1', 'weg2', 'teuer1', 'teuer2', 'genervt1', 'zuviel1', 'wenig1', 'hand1'];
  const grussFuer = (c) => (c.bruno || Math.random() > 0.65 ? null : (C.S && C.S.rauch > 0.5 ? 'gruss_r' : 'gruss_' + clock(C.S).phase));
  function preloadCust(c) { if (!c || !C.S) return; for (const id of [c.say, ...CUST_IDS, ...(c.bruno ? ['bruno_dank'] : [])]) snd.loadVoice(`kunden/${c.voice}_${id}`); }
  function custSay(c, id, withSub = true, vor = null) { // seit 2026-11-22 eigene Worte je Kunde, vorher manchmal ein Gruß passend zur Uhrzeit
    if (!c || !id || C.area === 'bunker' || C.mode === 'cine' || RD.aktiv) return; // mitten im Gespräch redet kein Kunde dazwischen
    const z = kundenSatz(c.voice, id, c.name) || { file: `kunden/${c.voice}_${id}`, name: c.name, col: '#ffcf9a', text: KLINES[id] || '' };
    const g = vor ? kundenSatz(c.voice, vor, c.name) : null;
    ST.sag([g, { ...z, gain: 0.95, stumm: !withSub }]);
  }
  function kundeKommt(c, versuch = 0) { // redet gerade jemand, wartet der Kunde kurz
    if (!C.on || !C.S || !C.vis || C.vis.id !== c.id || C.ctrl) return;
    if ((ST.redet() || RD.aktiv) && versuch < 8) { setTimeout(() => kundeKommt(c, versuch + 1), 1200); return; }
    custSay(c, c.say, true, grussFuer(c));
  }
  function visTick(dt) {
    if (C.ctrl) return; const S = C.S; const W = C.W; const front = S.queue[0] || null; let v = C.vis;
    if (v && (v.phase === 'in' || v.phase === 'knock' || v.phase === 'wait') && (!front || front.id !== v.id)) { v.phase = 'out'; v.t = 0; v.say = v.say || ''; if (C.ui === 'deal') closeUI(); }
    if (!v && front && !C.giveA) { const f = W.customers[front.look]; if (f && !f.root.visible) { v = C.vis = { id: front.id, look: front.look, name: front.name, phase: 'in', t: 0, x: 3.6, say: '', step: 0 }; f.root.visible = true; } }
    if (!v) return; v.t += dt; const f = W.customers[v.look];
    if (v.phase === 'in') { v.x = Math.max(STOP_X, v.x - dt * 1.7); v.step += dt * 9; if (v.x <= STOP_X) { v.phase = 'knock'; v.t = 0; snd.knock(); C.knockT = 0.55; const fc = front; setTimeout(() => kundeKommt(fc), 650); if (C.mode !== 'menu') toast(`Es klopft! ${v.name} steht am Fenster.`); } }
    else if (v.phase === 'knock' && v.t > 0.75) { v.phase = 'wait'; v.t = 0; }
    else if (v.phase === 'out') { if (v.t > (v.say ? 0.9 : 0.15)) { v.x -= dt * 1.8; v.step += dt * 9; } if (v.x < -3.8) { f.root.visible = false; C.vis = null; return; } }
    poseCustomer(f, v);
  }
  function poseCustomer(f, v) {
    const p = CP; const walking = v.phase === 'in' || (v.phase === 'out' && v.t > (v.say ? 0.9 : 0.15));
    const yaw = walking ? -Math.PI / 2 : 0; const fw = V3(Math.sin(yaw), 0, Math.cos(yaw)); const lf = V3(Math.cos(yaw), 0, -Math.sin(yaw)); const hz = CUST_Z; const bob = walking ? Math.abs(Math.sin(v.step)) * 0.025 : Math.sin(C.t * 1.7 + v.id) * 0.004;
    p.x = v.x; p.y = OUT_Y + 0.95 + bob; p.z = hz; p.yaw = yaw; p.lean = walking ? 0.05 : 0.02; p.slump = 0; p.twist = 0; p.headYaw = 0; p.headPitch = walking ? 0.05 : 0.12;
    p.armPole = { L: V3().addScaledVector(lf, 0.6).add(V3(0, -1, 0)).addScaledVector(fw, -0.2), R: V3().addScaledVector(lf, -0.6).add(V3(0, -1, 0)).addScaledVector(fw, -0.2) }; p.legPole = { L: V3().addScaledVector(fw, 1).add(V3(0, 0.3, 0)), R: V3().addScaledVector(fw, 1).add(V3(0, 0.3, 0)) };
    for (const [k, s] of [['L', 1], ['R', -1]]) { const ph = v.step + (s > 0 ? 0 : Math.PI); const st = walking ? Math.sin(ph) * 0.2 : 0; const lift = walking ? Math.max(0, Math.cos(ph)) * 0.07 : 0; const ft = p.feet[k]; ft.ankle.set(v.x, OUT_Y + 0.09 + lift, hz).addScaledVector(lf, s * 0.11).addScaledVector(fw, st); ft.toe.copy(ft.ankle).addScaledVector(fw, 0.13); ft.toe.y = OUT_Y + 0.03 + lift * 0.6; const h = p.hands[k]; h.wrist.set(v.x, p.y - 0.03, hz).addScaledVector(lf, s * 0.175).addScaledVector(fw, 0.05); h.F.set(0, -1, 0); h.P.copy(lf).multiplyScalar(-s); h.grip = 0.75; }
    const Rh = p.hands.R; const gz = GLASS_Z - 0.07;
    if (v.phase === 'knock') { const kk = Math.max(0, Math.sin(clamp(v.t / 0.55, 0, 1) * Math.PI * 3)); Rh.wrist.set(v.x - 0.14, 1.45, gz - 0.03 + kk * 0.03); Rh.F.set(0, 1, 0.25).normalize(); Rh.P.set(0, 0, 1); Rh.grip = 0.95; }
    if (v.phase === 'take') { Rh.wrist.set(v.x - 0.08, 1.15, gz + 0.04); Rh.F.set(0, 0.2, 1).normalize(); Rh.P.set(0, 1, 0); Rh.grip = 0.4; }
    if (v.phase === 'wait' || v.phase === 'knock') p.headYaw = Math.sin(C.t * 0.6 + v.id) * 0.15;
    f.pose(C.W.space, p);
  }

  // ---------------- Feilschen am Fenster ----------------
  function openDeal() { const S = C.S; const c = S.queue[0]; if (!c) return; if (C.mp) { if (c.by && c.by !== C.mp.me) { snd.nope(); toast(`${mpName(c.by)} verhandelt gerade mit ${c.name}.`); return; } c.by = C.mp.me; } /* Mehrspieler: einer verhandelt, die anderen sehen zu */ C.deal = { n: Math.min(c.want, Math.max(1, handOf(S, c.sorte || 'kippe'))), preis: c.preis, msg: c.text, mood: '' }; openUI('deal'); renderDeal(); }
  function renderDeal() {
    const S = C.S; const c = S.queue[0]; const D = C.deal; if (!c || !D) return; $('lwDName').textContent = c.name; $('lwDText').textContent = `„${D.msg}“`; $('lwDText').className = 'lw-dtext' + (D.mood ? ' ' + D.mood : '');
    const sid = c.sorte || 'kippe'; const have = handOf(S, sid); $('lwDWant').textContent = `Will ${c.want} ${sortWord(sid, c.want)} für ${euro(c.preis)} pro Stück` + (D.hint ? ` · ${D.hint}` : ''); $('lwDN').textContent = String(D.n); $('lwDP').textContent = euro(D.preis); $('lwDSum').textContent = euro(D.n * D.preis);
    $('lwDHand').textContent = `Du hast ${have} ${sortWord(sid, have)} dabei.`; $('lwDHand').classList.toggle('warn', have < D.n);
    $('lwDOffer').disabled = have < D.n; $('lwDTries').textContent = c.tries ? `Genervt: ${'●'.repeat(c.tries)}${'○'.repeat(3 - c.tries)}` : '';
  }
  function dealOffer() {
    const S = C.S; const D = C.deal; if (!D) return; const r = offer(S, D.n, D.preis);
    if (r.ok) { closeUI(); custSay(r.c, r.say); const v = C.vis; if (v) { v.phase = 'take'; v.t = 0; v.say = r.text; } C.giveA = { t: 0, n: Math.min(10, r.n), cash: r.cash, paid: false }; snd.window(true); C.dirty = true; save(); if (r.resp) setTimeout(() => { if (C.on) respPop(r.resp); }, 900); if (r.c.bruno) setTimeout(() => { if (C.on) toast('Bruno erzählt es weiter. Bald klopfen mehr Leute.', 3200); }, 1700); return; }
    if (r.why === 'weg') { closeUI(); if (C.vis) C.vis.say = r.text; snd.leave(); custSay(r.c, r.say); toast(`${r.c.name} ist weg.`); C.dirty = true; save(); return; }
    if (r.why === 'teuer') { D.msg = r.text; D.hint = `zahlt höchstens ${euro(r.preis)} pro Stück`; D.preis = r.preis; D.mood = 'bad'; snd.deny(); } else if (r.why === 'zuviel') { D.msg = r.text; D.hint = `nimmt höchstens ${r.n} Stück`; D.n = r.n; D.mood = 'bad'; snd.deny(); } else if (r.why === 'hand') { D.msg = r.text; D.hint = `du hast nur ${handOf(S, r.c.sorte || 'kippe')} dabei, hol mehr aus der Box`; D.mood = 'bad'; snd.nope(); }
    if (r.say) custSay(r.c, r.say, false);
    renderDeal();
  }
  $('lwDMinusN').onclick = () => { if (C.deal) { C.deal.n = Math.max(1, C.deal.n - 1); renderDeal(); } }; $('lwDPlusN').onclick = () => { if (C.deal) { C.deal.n = Math.min(99, C.deal.n + 1); renderDeal(); } };
  $('lwDMinusP').onclick = () => { if (C.deal) { C.deal.preis = Math.max(10, C.deal.preis - 10); renderDeal(); } }; $('lwDPlusP').onclick = () => { if (C.deal) { C.deal.preis = Math.min(9990, C.deal.preis + 10); renderDeal(); } };
  $('lwDOffer').onclick = dealOffer; $('lwDClose').onclick = () => closeUI();
  function giveTick(dt) {
    const A = C.giveA; const W = C.W; const hinge = W.win.hinge; const fly = W.fly;
    if (!A) { hinge.rotation.y = Math.max(0, hinge.rotation.y - dt * 3); for (const m of fly) m.visible = false; return; }
    A.t += dt; const open = A.t < 1.25 ? ease(A.t / 0.3) : 1 - ease((A.t - 1.25) / 0.35); hinge.rotation.y = open * 1.25;
    const v = C.vis; const to = V3(v ? v.x - 0.08 : 0, 1.15, GLASS_Z - 0.05); const from = C.cam.localToWorld(V3(0.22, -0.2, -0.45));
    for (let i = 0; i < fly.length; i++) { const m = fly[i]; const s = 0.28 + i * 0.06; const u = (A.t - s) / 0.45; m.visible = i < A.n && u > 0 && u < 1; if (!m.visible) continue; const e = ease(u); m.position.set(lerp(from.x, to.x, e), lerp(from.y, to.y, e) + Math.sin(e * Math.PI) * 0.15, lerp(from.z, to.z, e)); m.rotation.set(e * 2, e * 3, 0); }
    if (!A.paid && A.t > 0.28 + A.n * 0.06 + 0.3) { A.paid = true; snd.coin(A.n); gain('+' + euro(A.cash)); }
    if (A.t > 1.25 && !A.closed) { A.closed = true; snd.window(false); }
    if (A.t > 1.65) { C.giveA = null; if (v) { v.phase = 'out'; v.t = 0; } }
  }

  // ---------------- PC und Kiosk ----------------
  function renderKiosk() {
    const S = C.S; const mode = C.kioskMode || 'kalle'; const box = $('lwKioskList'); box.textContent = ''; $('lwKioskGeld').textContent = euro(S.geld);
    const sackMode = mode === 'kalle' || mode === 'erwin'; // Einkauf kommt in den Rucksack
    $('lwKioskLabel').textContent = mode === 'vorne' ? 'Kiosk an der Ecke' : mode === 'liefer' ? 'Lieferdienst' : mode === 'erwin' ? 'Elektro-Erwin' : 'Hinterhof vom Kiosk'; $('lwKioskWho').textContent = mode === 'vorne' ? 'Ede' : mode === 'liefer' ? 'Kalles Neffe' : mode === 'erwin' ? 'Erwin' : 'Kalle';
    $('lwKioskSack').textContent = mode === 'erwin' ? `Rucksack: ${sackUsed(S)} von ${sackCap(S)} Packungen. Die Teile kommen im Bunker in die Teilekiste an der Werkbank.` : mode === 'kalle' ? `Rucksack: ${sackUsed(S)} von ${sackCap(S)} Packungen. Zu Hause in die Materialkiste räumen.` : mode === 'liefer' ? `Kommt direkt in die Materialkiste (${kisteUsed(S)} von ${kisteSlots(S)} Fächern belegt).` : '';
    $('lwKioskClose').innerHTML = mode === 'liefer' ? '<kbd>K</kbd>Zurück' : '<kbd>Esc</kbd>Fertig';
    if (mode === 'vorne') { for (const it of KIOSK_VORNE) { const row = el('div', 'lw-krow'); const a = el('div'); const has = it.id === 'kaugummi' && S.flags.gum; a.append(el('b', '', it.name), el('small', '', has ? 'Hast du schon im Mund.' : it.text + (it.id === 'energy' && S.buff.energy > 0 ? ` Wirkt noch ${Math.ceil(S.buff.energy)} s.` : ''))); const b = el('button', 'primary', 'Kaufen'); b.type = 'button'; b.disabled = S.geld < it.preis || has; b.dataset.vorne = it.id; const btns = el('div', 'lw-kbtns'); btns.append(b); row.append(a, el('span', 'lw-kprice', euro(it.preis)), btns); box.append(row); } return; }
    const items = (mode === 'erwin' ? ERWIN : KIOSK).filter((q) => kioskShown(S, q));
    if (mode === 'erwin' && !items.length) { const row = el('div', 'lw-krow'); const a = el('div'); a.append(el('b', '', 'Noch nichts für dich'), el('small', '', 'Erwin: „Vapes? Dann komm wieder, wenn du weißt, was du tust.“ (Boss-Plan, Produktion: Vapes)')); row.append(a); box.append(row); return; }
    for (const it of items) { const pr = kioskPrice(S, it); const pk = kioskPack(S, it); const row = el('div', 'lw-krow'); const a = el('div'); a.append(el('b', '', it.name), el('small', '', `${pk > it.pack ? `Jetzt ${pk} Stück pro Packung (Boss-Plan).` : it.text} Du hast ${it.erwin ? teilOf(S, it.id) : matOf(S, it.id)}${sackMode && S.sack[it.id] ? `, im Rucksack ${S.sack[it.id]}` : ''}.`)); const price = el('span', 'lw-kprice', euro(pr)); const btns = el('div', 'lw-kbtns');
      for (const n of [1, 5]) { const b = el('button', n === 1 ? 'primary' : '', n === 1 ? 'Kaufen' : `5 × (${euro(pr * 5)})`); b.type = 'button'; b.disabled = !canBuy(S, it.id, n) || (sackMode && sackUsed(S) + n > sackCap(S)) || (mode === 'liefer' && kisteRoom(S, it.id) < pk * n); b.dataset.buy = it.id; b.dataset.n = String(n); btns.append(b); }
      row.append(a, price, btns); box.append(row); }
  }
  $('lwKioskList').addEventListener('click', (e) => { const b = e.target.closest('button[data-buy], button[data-vorne]'); if (!b || !C.S) return; const S = C.S; const mode = C.kioskMode || 'kalle'; let ok = false;
    if (b.dataset.vorne) { const r = buyVorne(S, b.dataset.vorne); ok = r.ok; if (ok) toast(b.dataset.vorne === 'energy' ? 'Energy-Drink: zwei Minuten schneller laufen!' : 'Kaugummi im Mund: Bei der nächsten Kontrolle hast du 5 Sekunden mehr.'); }
    else if (mode === 'kalle' || mode === 'erwin') { const r = buyToSack(S, b.dataset.buy, Number(b.dataset.n)); ok = r.ok; if (!ok && r.why === 'voll') toast('Der Rucksack ist voll. Ein größerer steht im Shop am PC.'); }
    else { ok = buy(S, b.dataset.buy, Number(b.dataset.n)); if (ok) toast('Kalles Neffe bringt es gleich, es kommt in die Materialkiste.'); else if (S.geld >= kioskPrice(S, kioskItemOf(b.dataset.buy)) * Number(b.dataset.n)) toast('Die Materialkiste ist voll. Eine größere gibt es im Shop am PC.'); }
    if (ok) { snd.buy(); C.dirty = true; save(); } else snd.nope(); renderKiosk(); });
  $('lwKioskClose').onclick = () => closeUI();
  function openKiosk(mode) { C.kioskMode = mode; openUI('kiosk'); }
  const pc = createLudwigPC({ root: $('lwPC'), snd, getS: () => C.S, onChange: (r) => { C.dirty = true; save(); toast(r.marke ? `Ab jetzt heißt deine Marke „${C.S.marke.name}“.` : `Geliefert: ${r.tier.name}!`); }, onClose: () => { if (C.ui === 'pc') closeUI(); } });
  // ---------------- Handy (T): Boss-Plan, Minispiele, 1 Minute Bildschirmzeit ----------------
  const phone = createLudwigPhone({ root: $('lwPhone'), snd, getS: () => C.S,
    onBuy: (r) => { C.dirty = true; save(); if (r.id === 't_falltuer') setTimeout(() => { if (C.on) toast('Die Falltür ist frei! Unter dem kleinen Teppich neben dem Tisch: E.', 4600); }, 700); else if (MACHINES[r.id]) setTimeout(() => { if (C.on) toast(`${MACHINES[r.id].name} freigeschaltet! Kaufen kannst du sie im Shop am PC.`, 3600); }, 700); if (r.final) { setTimeout(() => { if (C.on && C.S) { if (C.ui === 'phone') closeUI(); finale(); } }, 900); } },
    onReward: (kind, rw) => { if (!C.S) return null; const got = rewardGame(C.S, rw); C.dirty = true; save(); if (got.resp) respPop(got.resp); if (got.geld) gain('+' + euro(got.geld)); return got; },
    onClose: () => { if (C.ui === 'phone') closeUI(); } });
  // ---------------- Aufgaben oben links (statt Tutorial am Anfang, seit 2026-11-20) ----------------
  const quests = createQuests({ root: hud, getS: () => C.S, onDone: (q, r) => { if (!C.on) return; snd.buy(); respPop(r); C.dirty = true; save(); } });
  // ---------------- Selber rauchen (2026-11-22, Wunsch Lennox): ludwigsucht.js Regeln, ludwigrauch.js Bild ----------------
  const rauchOrt = () => { if (C.area === 'zimmer') return 'zimmer'; if (C.area !== 'draussen') return null; const { x, z } = C.me; return inErwin(x, z) || (x > SHOP.x0 && x < SHOP.x1 && z > SHOP.z0 - 0.2 && z < SHOP.z1) ? null : 'draussen'; };
  const rauchDarf = () => !!(C.on && C.S && !C.ui && !tour.open && !C.finaleOn && !C.giveA && !C.hiddenSpot && (C.mode === 'walk' || C.mode === 'sit') && !busyCtrl());
  const RA = createLudwigRauch({ C, hud, snd, toast, ort: rauchOrt, darf: rauchDarf, save: () => save() });
  // ---------------- Stimmen, Reden (G), Ereignisse (Stimmen-Update 2026-11-22, Wunsch Lennox) ----------------
  function untertitel(name, col, text, sek) { $('lwSubN').textContent = name; $('lwSubN').style.color = col; $('lwSubT').textContent = text; const s = $('lwSub'); s.classList.remove('hidden', 'lw-subin'); void s.offsetWidth; s.classList.add('lw-subin'); subT = sek + 0.3; }
  const ST = createStimmen({ snd, darf: () => C.on && !!C.S && C.mode !== 'cine', zeige: (z, sek) => { if (!z.stumm) untertitel(z.name, z.col, z.text, sek); } });
  const redDarf = () => !!(C.on && C.S && !C.ui && !tour.open && !C.finaleOn && (C.mode === 'walk' || C.mode === 'sit') && !busyCtrl());
  const kumpelFrei = () => { /* Kumpels, hinter denen gerade kein echter Spieler steckt */
    const belegt = new Set(C.mp ? [C.mp.seat, ...(C.mp.players ? [...C.mp.players.values()].map((r) => r.seat) : [])].map((s) => SEAT_KEY[s]) : []);
    return ['rot', 'gelb', 'gruen'].filter((k) => !belegt.has(k));
  };
  const PA = createPaket({ C, hud, snd, toast, rauch: RA, save: () => save(), client: () => isClient(), frei: kumpelFrei, faktor: () => (C.fast ? 30 : 1) * elternFaktor(C.S) * elternMul(C.S) }); // Abstimmung Paket 4
  const T3 = createTeil3({ C, hud, snd, toast, save: () => save(), client: () => isClient(), chat: (art) => PA.melde(art) }); // Abstimmung Paket 5
  const RD = createReden({ C, hud, snd, ST, toast, darf: redDarf, save: () => save(), fern: () => (isClient() ? (id, wahl) => mpSend({ t: 'lw-tuer', id, i: wahl }) : null), wirkung: (r) => { if (r.geld > 0) { snd.coin(1); gain('+' + euro(r.geld)); } if (r.resp) respPop(r.resp); C.dirty = true; } });
  const dunkel = el('div', 'lw-dunkel hidden'); dunkel.id = 'lwDunkel'; hud.prepend(dunkel);
  function ereignisZeig(e) {
    if (!C.S) return;
    if (e.k === 'tuer') { if (C.area === 'zimmer' && redDarf()) RD.klopft(e.id, !binLudwig()); return; }
    const drin = C.area === 'zimmer'; const hoert = e.k === 'geruch' || e.wo === 'haus' ? drin : C.area !== 'bunker';
    if (hoert && !RD.aktiv && C.mode !== 'cine' && !C.ctrl) ST.sag(e.sag.map(satz));
    if (e.text) toast(e.text, 4600);
    if (e.dunkel) { C.dunkelT = e.dunkel; }
    if (e.nachbarWeg && C.AU) C.AU.setNachbar(false);
    C.dirty = true;
  }
  function ereignisTick(dt) { // nur Gastgeber oder allein
    const frei = redDarf() && !C.ctrl && !C.giveA && !RD.aktiv && !ST.redet() && !(subT > 0);
    const e = tickEreignis(C.S, dt, { ort: ctrlArea(), frei, mp: !!C.mp }); // ort: wo Ludwig ist
    if (!e) return; if (e.k === 'tuer') C.tuerOffen = e.id; ereignisZeig(e); if (isHost()) mpEvent('ereignis', e);
  }
  const PUH = ['l_puh', 'r_puh', 'gr_puh1', 'gr_puh2']; const SATZ_VOR = ['m_rauch1', 'm_rauch2', 'p_rauch1', 'p_rauch2', 'l_rauch1', 'l_rauch2', 'l_rauch3', 'pol_3', 'pol_4', 'pol_5', 'pol_6', 'nb_2', 'nb_3', 'gr_puh1', 'gr_puh2', 'gr_mist1'];
  const einer = (list) => { const l = list.filter((id) => VOICE[id] || SAETZE[id]); return l[(Math.random() * l.length) | 0]; };
  const vorladen = () => { for (const id of SATZ_VOR) { const z = satz(id); if (z) snd.loadVoice(z.file); } };
  // ---------------- Inventar (seit 2026-11-20): Box und Taschen, Rucksack und Materialkiste, Tab = eigene Sachen ----------------
  const inv = createInventory({ root: hud, getS: () => C.S, snd, onChange: () => { C.dirty = true; save(); }, onClose: () => { if (C.ui === 'inv') closeUI(); } });
  // ---------------- Werkbank im Bunker (seit 2026-11-21): Vapes bauen ----------------
  const werk = createWerkbank({ root: hud, getS: () => C.S, snd, onChange: () => { C.dirty = true; save(); }, onClose: () => { if (C.ui === 'werk') closeUI(); },
    onBuilt: (r) => { plusOne(`+1 ${SORTEN[r.id].name}`); C.dirty = true; save(); } });
  function openInv(mode) { if (!C.S || C.ui || C.ctrl || C.giveA) return; C.invMode = mode; openUI('inv'); }
  const kioskItemOf = (id) => KIOSK.find((q) => q.id === id) || KIOSK[0];
  function togglePhone() {
    if (C.ui === 'phone') { closeUI(); return; } if (C.ui || !C.S) return;
    if (C.ctrl) { toast(C.ctrl.phase === 'warn' ? 'Jetzt nicht! Erst verstecken!' : 'Bloß nicht, die Eltern stehen im Zimmer!'); snd.nope(); return; }
    if (C.mode !== 'walk' && C.mode !== 'sit') return; C.anim = null; C.queued = 0; openUI('phone');
  }
  // Finale: die Riesenzigarette (letzter Knoten im Boss-Plan)
  function finale() {
    const S = C.S; const f = $('lwFinale'); $('lwFinStats').textContent = `${S.stats.gedreht.toLocaleString('de-DE')} Kippen gedreht · ${S.stats.verkauft.toLocaleString('de-DE')} verkauft · ${euro(S.stats.umsatz)} Umsatz · ${S.eltern.geschafft} ${S.eltern.geschafft === 1 ? 'Kontrolle' : 'Kontrollen'} überstanden`;
    f.classList.remove('hidden', 'lit'); void f.offsetWidth; snd.skill(true); setTimeout(() => { f.classList.add('lit'); snd.sting(); }, 1400); C.finaleOn = true;
  }
  $('lwFinOk').onclick = () => { $('lwFinale').classList.add('hidden'); C.finaleOn = false; toast('Der Zigarettenboss dreht weiter. Für immer.', 3200); };

  // ---------------- Fenster, Pause, Start ----------------
  const PANELS = { kiosk: 'lwKiosk', deal: 'lwDeal', pause: 'lwPause', settings: 'lwSettings', inv: 'lwInv', werk: 'lwWerk' }; // der PC (LudwigOS) zeigt und versteckt sich selbst
  function openUI(k) { if (!C.S || C.giveA) return; unlock(); C.ui = k; C.pauseAt = performance.now(); for (const [key, id] of Object.entries(PANELS)) $(id).classList.toggle('hidden', key !== k); if (k === 'phone') { phone.open(); C.dirty = true; return; } if (k === 'werk') { werk.open(); snd.ui(); C.dirty = true; return; } if (k === 'inv') { const q = C.S.queue[0]; inv.open(C.invMode || 'self', { want: q && C.invMode === 'box' ? q.sorte || 'kippe' : null }); snd.ui(); C.dirty = true; return; } if (k === 'kiosk') { ST.stop(); if (C.kioskMode === 'vorne') { const z = satz('ede_wache' + (1 + Math.floor(Math.random() * 4))); $('lwKalle').textContent = '„' + (z ? z.text : EDE[(Math.random() * EDE.length) | 0]) + '“'; if (z) snd.loadVoice(z.file).then((b) => { if (b && C.ui === 'kiosk') snd.playVoice(z.file); }); } else if (C.kioskMode === 'erwin') { const n = 1 + Math.floor(Math.random() * ERWIN_LINES.length); $('lwKalle').textContent = '„' + ERWIN_LINES[n - 1] + '“'; snd.loadVoice('erwin' + n).then((b) => { if (b && C.ui === 'kiosk') snd.playVoice('erwin' + n); }); } else { const n = 1 + Math.floor(Math.random() * KALLE_LINES.length); $('lwKalle').textContent = '„' + KALLE_LINES[n - 1] + '“'; snd.loadVoice('kalle' + n).then((b) => { if (b && C.ui === 'kiosk') snd.playVoice('kalle' + n); }); } renderKiosk(); } if (k === 'bpc') { C.camFrom = { pos: camPos.clone(), look: camLook.clone(), fov: C.cam.fov }; C.camT = 0; setTimeout(() => { if (C.ui === 'bpc') bpc.open(); }, 420); setTimeout(() => { if (C.ui === 'bpc' && bpc.isOpen) { bpc.openApp('auftraege'); bpc.openApp('kippcord'); } }, 1500); }
    if (k === 'pc') { C.camFrom = { pos: camPos.clone(), look: camLook.clone(), fov: C.cam.fov }; C.camT = 0; setTimeout(() => { if (C.ui === 'pc') pc.open(); }, 420); } if (k !== 'pause') snd.ui(); C.dirty = true; }
  function closeUI() { if (C.ui === 'deal' && C.mp && C.S && C.S.queue[0] && C.S.queue[0].by === C.mp.me) delete C.S.queue[0].by; const wasPc = C.ui === 'pc'; const wasBpc = C.ui === 'bpc'; if (C.ui === 'phone' || phone.isOpen) phone.close(); if (inv.isOpen) inv.close(); if (werk.isOpen) werk.close(); C.ui = null; C.deal = null; for (const id of Object.values(PANELS)) $(id).classList.add('hidden'); if (wasPc) { C.camFrom = { pos: camPos.clone(), look: camLook.clone(), fov: C.cam.fov }; C.camT = 0; if (pc.isOpen) pc.shutdown(); else $('lwPC').classList.add('hidden'); }
    if (wasBpc) { C.camFrom = { pos: camPos.clone(), look: camLook.clone(), fov: C.cam.fov }; C.camT = 0; if (bpc.isOpen) bpc.shutdown(); else $('lwBPC').classList.add('hidden'); } C.dirty = true; }
  // ---- Codes im Pause-Menü (seit 2026-11-21): GEBURTSTAG zeigt die Geburtstagskarte noch einmal. Den Test-Code VAPE hat Lennox wieder entfernt („bringt nichts“).
  function useCode(raw) {
    const S = C.S; const code = String(raw || '').trim().toUpperCase(); const inp = $('lwCode'); inp.value = ''; inp.blur(); if (!S || !code) return '';
    if (code === 'GEBURTSTAG') { bday.show(); return code; } // die Pause bleibt dahinter offen
    snd.nope(); toast('Diesen Code gibt es nicht.'); return 'falsch';
  }
  $('lwCodeGo').onclick = () => useCode($('lwCode').value);
  $('lwCode').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') useCode($('lwCode').value); else if (e.key === 'Escape') $('lwCode').blur(); });
  $('lwResume').onclick = () => closeUI(); $('lwReplay').onclick = () => { closeUI(); C.replay = true; startIntro(true); }; $('lwHelp').onclick = () => { closeUI(); tour.show(); };
  // ---- Einstellungen (Pause-Menü): Ton, Stimmen, Untertitel, Bildschärfe, Schatten, Effekte, Maus. Wirken sofort, gespeichert wie im Hauptmenü.
  const SFX = ['drehen', 'kunden', 'kasse', 'signale', 'eltern']; const saveSet = () => store.set('settings', settings); const mixV = (k) => (settings.sound && settings.sound['ludwig.' + k] !== undefined ? settings.sound['ludwig.' + k] : 1);
  function setMix(k, v) { if (!settings.sound) settings.sound = {}; settings.sound['ludwig.' + k] = v; if (audio.setMix) audio.setMix('ludwig.' + k, v); }
  function applySettings() { hud.classList.toggle('lw-nosub', settings.ludwigSubs === false); if (C.BK && C.BK.setFx) C.BK.setFx(settings.ludwigFx !== false); if (C.shadowLights) { for (const l of C.shadowLights) l.castShadow = !!settings.shadows; renderer.shadowMap.enabled = !!settings.shadows; } }
  function renderSet() {
    const put = (id, v, txt) => { $(id).value = String(v); $(id + 'V').textContent = txt; };
    put('lwVolMaster', settings.volume, `${settings.volume} %`); put('lwVolVoice', Math.round(mixV('stimmen') * 100), `${Math.round(mixV('stimmen') * 100)} %`); put('lwVolSfx', Math.round(mixV('drehen') * 100), `${Math.round(mixV('drehen') * 100)} %`); put('lwVolAmb', Math.round(mixV('umgebung') * 100), `${Math.round(mixV('umgebung') * 100)} %`); put('lwMouse', Math.round((settings.mouse || 1) * 100), `${Math.round((settings.mouse || 1) * 100)} %`);
    const mark = (id, v) => { for (const b of $(id).querySelectorAll('button')) b.classList.toggle('sel', b.dataset.v === v); };
    mark('lwSegSubs', settings.ludwigSubs === false ? 'off' : 'on'); mark('lwSegRes', String(settings.ludwigRes || 1)); mark('lwSegShadow', settings.shadows ? 'on' : 'off'); mark('lwSegFx', settings.ludwigFx === false ? 'off' : 'on');
  }
  const onSlide = (id, fn) => { const i = $(id); i.addEventListener('input', () => { fn(Number(i.value)); saveSet(); renderSet(); }); i.addEventListener('change', () => i.blur()); };
  onSlide('lwVolMaster', (v) => { settings.volume = v; if (audio.setVolume) audio.setVolume(v / 100); }); onSlide('lwVolVoice', (v) => setMix('stimmen', v / 100)); onSlide('lwVolSfx', (v) => { for (const k of SFX) setMix(k, v / 100); }); onSlide('lwVolAmb', (v) => setMix('umgebung', v / 100)); onSlide('lwMouse', (v) => { settings.mouse = v / 100; });
  const onSeg = (id, fn) => { $(id).addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (!b) return; fn(b.dataset.v); saveSet(); applySettings(); renderSet(); snd.ui(); }); };
  onSeg('lwSegSubs', (v) => { settings.ludwigSubs = v === 'on'; }); onSeg('lwSegRes', (v) => { settings.ludwigRes = Number(v); }); onSeg('lwSegShadow', (v) => { settings.shadows = v === 'on'; }); onSeg('lwSegFx', (v) => { settings.ludwigFx = v === 'on'; });
  $('lwSetBtn').onclick = () => { closeUI(); openUI('settings'); renderSet(); }; $('lwSetBack').onclick = () => { closeUI(); openUI('pause'); }; $('lwQuit').onclick = () => back();
  function setMode(m) { C.camFrom = { pos: camPos.clone(), look: camLook.clone(), fov: C.cam.fov }; C.camT = 0; C.mode = m; for (const w of C.W.room.front) w.visible = m !== 'menu'; C.W.ludwig.root.visible = m === 'menu'; C.dirty = true; }
  function showRoom() { // Zimmer von außen: von hier fährt die Kamera an den Tisch, Mitspieler warten hier auf den Gastgeber. Die Auswahl macht der Startbildschirm (titel.js)
    applyDay(0); hud.classList.add('lw-menu'); C.mode = 'menu'; C.camT = 1; const z = VIEWS.zimmer; camPos.set(...z.pos); camLook.set(...z.look); C.cam.fov = z.fov; for (const w of C.W.room.front) w.visible = false; C.W.ludwig.root.visible = true;
    placeKumpels(); C.ctrlReset();
  }
  function begin(slot) {
    if (bday.open) bday.hide(); hud.classList.remove('lw-menu'); C.slot = slot; C.S = saves.load(slot); RA.reset(); PA.reset(); T3.reset(); RD.reset(); ST.stop(); C.dunkelT = 0; vorladen(); primeQuests(C.S); quests.reset(); C.pickT = 0; C.anim = null; C.queued = 0; C.giveA = null; C.deal = null; C.seat = -1; $('lwFinale').classList.add('hidden'); C.finaleOn = false;
    Object.assign(C.me, { x: START_POS.x, z: START_POS.z, yaw: START_POS.yaw, pitch: START_POS.pitch, vx: 0, vz: 0, bob: 0, moving: 0 }); for (const f of C.W.customers) f.root.visible = false; C.vis = null; C.W.win.hinge.rotation.y = 0; C.W.stash.set(C.S.up.box, C.S.kippen); setArea('zimmer'); C.climb = null; C.truckQ = 0; $('lwFade').classList.remove('on');
    if (C.S.bunker && C.S.bunker.kumpel) C.S.bunker.kumpel = null; C.wclimb = null; if (C.AU) { C.AU.reset(); C.AU.setNachbar(C.S.welt.nbOut); C.AU.syncPark(C.S.welt.park); C.AU.fam.setAway(C.S.welt.weg > 0); } C.dayL = undefined; // Kumpels helfen nicht mehr mit; der Rucksack wird seit 2026-11-20 nicht mehr von selbst ausgepackt (Materialkiste)
    C.ctrlReset(); placeKumpels(); audio.init(); snd.ensure(); snd.ambience(true); snd.preload(Object.keys(VOICE)); // alle Sätze (Eltern, Kumpels) vorladen, sonst bleibt der erste Satz stumm
    if (!C.S.introSeen) { save(); startIntro(false); return; }
    setMode('walk'); C.dirty = true; save();
  }
  function enter() { build(); applySettings(); C.on = true; C.ui = null; G.mode = 'ludwig'; showScreen(null); $('hud').classList.add('hidden'); hud.classList.remove('hidden'); applyRenderer(true); for (const id of Object.values(PANELS)) $(id).classList.add('hidden'); }
  function open() { enter(); C.S = null; showRoom(); }
  function play(slot) { open(); begin(slot); }
  function save() { if (C.S && C.slot) saves.save(C.slot, C.S); }
  function back() { if (C.mp) { const n = C.mp.net; mpStop('', false); try { n.leave(); } catch (e) { /* schon weg */ } } stop(); showScreen('gallery'); }
  function stop() { if (!C.on) return; if (isHost() && C.S) for (const r of C.mp.players.values()) returnPlayer(C.S, r.P); save(); unlock(); C.on = false; C.wclimb = null; $('lwCam').classList.add('hidden'); if (C.story && C.story.on) C.story.end(false); C.ctrlReset(); if (phone.isOpen) phone.close(); if (bpc.isOpen) bpc.shutdown(); setArea('zimmer'); $('lwFinale').classList.add('hidden'); C.finaleOn = false; C.ui = null; C.S = null; C.keys = {}; RA.reset(); PA.reset(); T3.reset(); RD.reset(); ST.stop(); C.dunkelT = 0; dunkel.classList.add('hidden'); hud.classList.add('hidden'); snd.quiet(); applyRenderer(false); tour.open = false; tour.el.classList.add('hidden'); quests.show(false); if (G.mode === 'ludwig') G.mode = 'menu'; }

  // ---------------- Eingabe ----------------
  function lock() { if (document.pointerLockElement !== canvas) { try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* egal */ } } }
  function unlock() { if (document.pointerLockElement === canvas) { C.lockQuiet = true; document.exitPointerLock(); } }
  window.addEventListener('keydown', (e) => {
    if (!C.on || (e.target && e.target.tagName === 'INPUT') || G.screen === 'join') return; const code = e.code; if (code === 'F11' || code === 'F3') return; e.preventDefault(); e.stopImmediatePropagation(); if (e.repeat) return; C.keys[code] = true; // Lobby offen: Tasten gehören dem Lobby-Fenster
    if (C.mode === 'cine') { if (code === 'Escape' && C.replay) C.story.end(true); return; } // der Vorspann ist beim ersten Mal nicht überspringbar
    if (code === 'Escape') { if (C.finaleOn) { $('lwFinOk').click(); return; } if (tour.open) { tour.close(); return; } if (bday.open) { bday.hide(); return; } if (C.mode === 'menu') { back(); return; } if (C.ui === 'pause') { if (performance.now() - (C.pauseAt || 0) > 250) closeUI(); return; } if (C.ui === 'settings') { closeUI(); openUI('pause'); return; } if (C.ui === 'phone') { phone.back(); return; } if (C.ui) { closeUI(); return; } openUI('pause'); return; }
    if (!C.S || tour.open || C.ui === 'pause' || C.finaleOn) return;
    if (code === 'KeyT') { togglePhone(); return; } // Handy raus oder weg
    if (C.ui === 'phone') { phone.key(code); return; }
    if (code === 'KeyK') { if (C.ctrl) return; if (C.ui === 'kiosk') closeUI(); else if (!C.ui) { if (lieferOn(C.S)) openKiosk('liefer'); else { snd.nope(); toast('Kein Lieferdienst. Geh selbst hin: am Fenster F, dann rechts die Straße runter zum Kiosk an der Ecke. Kalle steht hinten im Hof.', 4600); } } return; }
    if (C.ui === 'deal') { if (code === 'Enter' || code === 'Space') dealOffer(); return; }
    if (C.ui === 'inv') { if (code === 'KeyE' || code === 'Tab') closeUI(); return; }
    if (C.ui === 'werk') { if (code === 'KeyE') closeUI(); else werk.key(code); return; } // Werkbank: Leertaste lötet, 1 bis 3 Geschmack
    if (code === 'Tab' && !C.ui && (C.mode === 'walk' || C.mode === 'sit')) { if (C.ctrl) { snd.nope(); toast('Jetzt nicht, die Eltern kommen!'); } else openInv('self'); return; } // Tab: eigene Taschen und Rucksack
    if (C.ui) return;
    if (code === 'KeyG' || /^(Digit|Numpad)\d$/.test(code)) { audio.init(); snd.ensure(); if (RD.key(code)) return; } // G reden, Zahlen antworten (vor der Sortenwahl)
    if (code === 'KeyR') { audio.init(); snd.ensure(); RA.rDown(); return; } // halten raucht, tippen wechselt die Sorte
    if (code === 'Space' && C.mode === 'walk' && RA.tuch) { RA.schuetteln(); return; } // Handtuch
    const dig = /^Digit[1-5]$/.test(code) && sortChoices(C.S).length > 1 ? SORT_ORDER[Number(code.slice(5)) - 1] : null; // 1 bis 5: Sorte wählen
    if (C.mode === 'sit') { if (code === 'Space' || code === 'Enter') tryRoll(); else if (code === 'KeyE' || code === 'KeyQ') standUp(); else if (code === 'KeyH') tour.show(); else if (dig) chooseSort(dig); return; }
    if (C.mode === 'walk') { if (code === 'KeyE') interact('e'); else if (code === 'KeyF') interact('f'); else if (code === 'KeyB') PA.taste(); else if (code === 'KeyH') tour.show(); else if (dig) chooseSort(dig); }
  }, true);
  window.addEventListener('keyup', (e) => { if (!C.on) return; C.keys[e.code] = false; phone.keyUp(e.code); if (e.code === 'KeyR') RA.rUp(); if (e.code !== 'F11' && e.code !== 'F3') { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  window.addEventListener('blur', () => { C.keys = {}; RA.state.halten = null; });
  hud.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) setTimeout(() => { const a = document.activeElement; if (a && a.blur && a.tagName === 'BUTTON') a.blur(); }, 0); }); // sonst drückt die Leertaste den zuletzt geklickten Knopf
  canvas.addEventListener('mousedown', (e) => { if (!C.on || e.button !== 0 || !C.S || C.ui || tour.open || C.mode === 'cine') return; audio.init(); snd.ensure(); if (C.mode === 'sit') { tryRoll(); return; } if (C.mode === 'walk') { if (RA.tuch && document.pointerLockElement === canvas) RA.schuetteln(); else lock(); } });
  window.addEventListener('mousemove', (e) => { if (!C.on || C.mode !== 'walk' || document.pointerLockElement !== canvas) return; const s = 0.0022 * (settings.mouse || 1); C.me.yaw -= e.movementX * s; C.me.pitch = clamp(C.me.pitch - e.movementY * s, -1.35, 1.35); });
  document.addEventListener('pointerlockchange', () => { const locked = document.pointerLockElement === canvas; if (!locked && C.on && C.S && C.mode === 'walk' && !C.ui && !C.lockQuiet && !tour.open) openUI('pause'); C.lockQuiet = false; });

  // ---------------- Vorspann ----------------
  function startIntro(replay) {
    if (!C.story) return; C.mode = 'cine'; applyDay(0); unlock(); closeUI(); C.cineCam = null; C.ctrlReset && C.ctrlReset(); for (const K of C.kumpel) C.W.cast[K.key].setVisible(false); for (const f of C.W.customers) f.root.visible = false; C.vis = null; C.W.ludwig.root.visible = false; snd.ambience(true);
    C.story.play(() => { C.cineCam = null; C.replay = false; const S = C.S; if (!S || !C.on) return; if (!replay) { S.introSeen = true; S.kumpels = true; save(); } C.mode = 'walk'; C.camFrom = null; C.camT = 1; if (isClient()) placeAtSeat(); else Object.assign(C.me, { x: START_POS.x, z: START_POS.z, yaw: START_POS.yaw, pitch: START_POS.pitch, vx: 0, vz: 0 }); placeKumpels(); C.dirty = true; });
  }
  // Zeile mit Stimme und Untertitel (Elternkontrolle, Kumpels); gibt die Länge in Sekunden zurück
  let subT = 0;
  function line(id) { const neu = !VOICE[id] && satz(id); if (neu) { ST.stop(); snd.stopVoice(); let d = snd.playVoice(neu.file); if (!d) { const t0 = performance.now(); snd.loadVoice(neu.file).then((b) => { if (b && C.on && performance.now() - t0 < 1500 && $('lwSubT').textContent === neu.text) snd.playVoice(neu.file); }); d = 0.6 + neu.text.length * 0.075; } untertitel(neu.name, neu.col, neu.text, d); return d; }
    const v = VOICE[id]; if (!v) return 0; ST.stop(); const w = WHO[v.who] || { name: '', col: '#fff' }; $('lwSubN').textContent = w.name; $('lwSubN').style.color = w.col; $('lwSubT').textContent = v.text; const s = $('lwSub'); s.classList.remove('hidden', 'lw-subin'); void s.offsetWidth; s.classList.add('lw-subin'); let d = snd.playVoice(id); if (!d) { /* noch nicht geladen: laden und sofort nachholen (vorher blieben die Eltern stumm) */ const t0 = performance.now(); snd.loadVoice(id).then((b) => { if (b && C.on && performance.now() - t0 < 1500 && $('lwSubT').textContent === v.text) snd.playVoice(id); }); d = 0.6 + v.text.length * 0.065; } subT = d + 0.3; return d; }

  // ---------------- Kumpels: sitzen links (Rot) und rechts (Gelb), drehen mit, verstecken sich vor den Eltern ----------------
  // Drei Kumpels am quadratischen Tisch: Rot links, Gelb rechts, Grün hinten (Ludwig vorn). Grün kommt nach dem Vorspann dazu.
  C.kumpel = [{ key: 'rot', seat: 0, path: [[-1.95, 0.1], [-2.7, -1.95]], spot: 'schrank', busy: false, t: 0, retry: 1.5, state: 'sit' }, { key: 'gelb', seat: 2, path: [[1.95, 0.9], [2.15, -0.55]], spot: 'bett', busy: false, t: 0, retry: 3, state: 'sit' },
    { key: 'gruen', seat: 3, path: [[0.9, -1.75], [2.3, -1.1]], spot: 'bett', busy: false, t: 0, retry: 4.5, state: 'sit' }];
  function placeKumpels() { const on = !!(C.S && C.S.kumpels) && !C.mp; /* im Mehrspieler sind die Kumpels echte Spieler */ for (const K of C.kumpel) { const P = C.W.cast[K.key]; const s = SEATS[K.seat]; P.setVisible(on); K.state = 'sit'; K.busy = false; K.t = 0; const [px, pz] = seatAt(s, -0.08); P.place(px, 0, pz, s.face); P.mode = 'sit'; P.seat = 0.47; P.act = 0; P.lookAt = V3(s.spot.x, TABLE_Y, s.spot.z); } placeBunkerKumpel(); }
  function kumpelsTick(dt, run) {
    const S = C.S; if (!S || !S.kumpels || C.mode === 'cine' || C.mp) return; run = false; // seit 2026-11-19 drehen die Kumpels nicht mehr mit: das Spiel wird für vier echte Spieler gebaut
    for (const K of C.kumpel) {
      const P = C.W.cast[K.key]; if (!P.visible && K.state !== 'hidden') P.setVisible(true);
      if (K.state === 'sit') {
        if (run && !C.ctrl) { const busy = C.kumpel.filter((q) => q.busy).length; if (!K.busy) { K.retry -= dt; if (K.retry <= 0) { if (kumpelStart(S, busy)) { K.busy = true; K.t = 0; C.dirty = true; } else K.retry = 2.5; } } else { K.t += dt * (C.fast ? 25 : 1); if (K.t >= kumpelDur(S)) { K.busy = false; K.retry = 0.7; if (kumpelDone(S)) { snd.whoosh(); C.dirty = true; } } } }
        P.act = K.busy && !C.ctrl ? 'piano' : 0; P.update(dt, C.t);
      } else if (K.state === 'down' || K.state === 'bunker') { bunkerKumpelTick(K, P, dt);
      } else if (K.state === 'go') { const q = K.go[0]; if (walkTo(P, q[0], q[1], dt, 2.7)) { K.go.shift(); if (!K.go.length) { K.state = 'hidden'; P.setVisible(false); snd.hide(); if (K.toBunker && C.S.bunker.hatch === 'zu') C.S.bunker.hatch = 'offen'; /* runter durch die Falltür: sie bleibt offen */ } } P.update(dt, C.t); }
    }
  }
  // Die Dreh-Sachen der Kumpels: vier Abschnitte über KUMPEL.dur, die fertige Kippe fliegt in die Box
  function kumpelAnim(K) { if (!K.busy || K.state !== 'sit') return null; const u = clamp(K.t / kumpelDur(C.S), 0, 0.999); const st = Math.floor(u * 4); return { step: st, t: u * 4 - st, dur: 1, seat: K.seat, slot: C.S.kippen }; }

  // ---------------- Elternkontrolle ----------------
  // Ablauf: 10 s Warnung (verstecken), Tür auf, Mama oder Papa kommt rein, sagt etwas, schaut (Mama manchmal ins Versteck), Ergebnis, geht wieder.
  const HIDE = { bett: V3(2.95, 0.12, -1.95), schrank: V3(-2.85, 1.0, -2.65) };
  function startCtrl(ev) {
    const S = C.S; const below = C.area === 'bunker'; if (C.ui && !(below && C.ui === 'bpc')) closeUI(); if (C.mode === 'sit') standUp(); C.anim = null; C.queued = 0;
    C.ctrl = { who: ev.who, first: ev.first, phase: 'warn', t: 0, warn: warnTime(S) + (below ? 4 : 0), hidden: { box: S.up.box >= 3, mat: false, stuehle: !S.kumpels }, fly: [], kumpelIn: {}, beat: 0, step: 0, line: 0, below, seen: !below };
    const viaHatch = bunkerOpen(S) && !(S.bunker.lock > 0); // mit Bunker verstecken sich die Kumpels unten (durch die Falltür)
    for (const K of (C.mp ? [] : C.kumpel)) { const P = C.W.cast[K.key]; if (!P.visible || K.state === 'bunker' || K.state === 'down') continue; K.state = 'go'; K.busy = false; K.toBunker = viaHatch; K.go = viaHatch ? [seatAt(SEATS[K.seat], 0.6), [HATCH.x, HATCH.z]] : K.path.map((q) => q.slice()); P.mode = 'walk'; P.act = 0; P.lookAt = null; if (!viaHatch) C.ctrl.kumpelIn[K.spot] = true; }
    if (C.vis) { const f = C.W.customers[C.vis.look]; if (f) f.root.visible = false; C.vis = null; }
    $('lwAlWho').textContent = ev.who === 'mama' ? 'MAMA KOMMT!' : 'PAPA KOMMT!'; $('lwAlTip').textContent = ev.first ? 'Erste Kontrolle! Schau die Box an und drück E (unters Bett), dann die Materialkiste neben deinem Stuhl (E, in den Schrank) und einen Stuhl der Kumpels (E, Stühle weg). Kippen in den Taschen vorher mit F zurück in die Box.' : ''; if (C.area === 'draussen') $('lwAlTip').textContent = 'Du bist draußen! Schnell zurück durchs Fenster (F), sonst bist du dran.';
    $('lwAlBox').classList.toggle('off', S.up.box >= 3); $('lwAlChairs').classList.toggle('off', !S.kumpels); $('lwAlarm').classList.remove('hidden', 'inside'); $('lwAlLuke').classList.toggle('off', !bunkerOpen(S)); if (bunkerOpen(S)) { warnChat(S, ev.who); snd.ping(true); }
    if (below) $('lwAlarm').classList.add('hidden'); else { snd.sting(); line(ev.who === 'mama' ? 'w_mama' : 'w_papa'); } C.dirty = true; // unten sieht man die Warnung nur im KippCord
    if (isHost()) mpSend({ t: 'lw-ctrl', op: 'start', ev: { who: ev.who, first: !!ev.first } }); else if (isClient()) C.ctrl.follow = true; // Mehrspieler: Mama kommt für alle, das Ergebnis bestimmt der Gastgeber
  }
  function hideItem(k, net = false) {
    const c = C.ctrl; if (!c || c.phase !== 'warn' || c.hidden[k]) return; c.hidden[k] = true; snd.hide(); if (isHost()) mpSend({ t: 'lw-ctrl', op: 'hid', k }); else if (isClient() && !net) mpSend({ t: 'lw-hide', k }); // jeder kann verstecken helfen
    if (k === 'box') { const g = C.W.stash.g; c.fly.push({ o: g, from: g.position.clone(), to: V3(HIDE.bett.x - BOX_POS.x, -0.62, HIDE.bett.z - BOX_POS.z), t: 0, s0: 1, s1: 0.55 }); toast('Box liegt unterm Bett.'); }
    else if (k === 'stuehle') { C.W.table.chairs.forEach((ch, i) => { if (i === 1) return; c.fly.push({ o: ch, from: ch.position.clone(), to: HIDE.schrank.clone().add(V3((i - 1.5) * 0.25, -0.9, 0.3)), t: 0, s0: 1, s1: 0.35 }); }); toast('Die Stühle der Kumpels sind weg. Nur Ludwigs Stuhl steht noch da.'); }
    else { for (const sp of C.W.seats) for (const o of [sp.booklet, sp.pouch]) c.fly.push({ o, from: o.position.clone(), to: sp.g.worldToLocal(HIDE.schrank.clone().add(V3((Math.random() - 0.5) * 0.3, Math.random() * 0.3, 0))), t: 0, s0: 1, s1: 0.4, mat: true }); const kg = C.KI.g; c.fly.push({ o: kg, from: kg.position.clone(), to: HIDE.schrank.clone().add(V3(0.15, -0.95, 0.3)), t: 0, s0: 1, s1: 0.5 }); toast('Materialkiste, Tabak und Blättchen sind im Schrank.'); }
    C.dirty = true;
  }
  function restoreItems() { const c = C.ctrl; if (!c) return; for (const f of c.fly) { f.o.position.copy(f.from); f.o.scale.setScalar(1); f.o.visible = true; } C.W.stash.g.position.set(0, 0, 0); C.W.stash.g.scale.setScalar(1); C.W.stash.g.visible = true; }
  function ctrlTargets(add) { const c = C.ctrl; if (!c || c.phase !== 'warn') return false; if (!binLudwig() && C.area === 'zimmer' && !C.hiddenSpot) { add(V3(HIDE.schrank.x, 1.0, HIDE.schrank.z), 2.4, { k: 'hideme', spot: 'schrank', e: 'Selbst in den Schrank verstecken' }); add(V3(HIDE.bett.x, 0.3, HIDE.bett.z), 2.4, { k: 'hideme', spot: 'bett', e: 'Selbst unters Bett kriechen' }); } if (!c.hidden.box) add(boxAnchor(), 2.0, { k: 'hide', what: 'box', e: 'Box unters Bett verstecken' }); if (!c.hidden.mat) add(C.KI.anchor, 2.2, { k: 'hide', what: 'mat', e: 'Materialkiste in den Schrank' }); if (!c.hidden.stuehle) for (const i of [0, 2, 3]) add(V3(SEATS[i].x, 0.6, SEATS[i].z), 2.4, { k: 'hide', what: 'stuehle', e: 'Stühle der Kumpels wegräumen' }); if (handTotal(C.S) > 0 && !c.hidden.box) add(boxAnchor(), 2.0, { k: 'box', e: '', f: 'Kippen aus den Taschen zurücklegen' }); zimmerHatchTarget(add, true); return true; }
  function ctrlTick(dt) {
    const c = C.ctrl; if (!c) return; const S = C.S; c.t += dt; const W = C.W; const door = W.furn.door; const P = W.cast[c.who];
    for (const f of c.fly) { if (f.t >= 1) continue; f.t = Math.min(1, f.t + dt / 0.55); const e = ease(f.t); f.o.position.lerpVectors(f.from, f.to, e); f.o.position.y += Math.sin(e * Math.PI) * 0.4; f.o.scale.setScalar(lerp(f.s0, f.s1, e)); if (f.t >= 1) f.o.visible = false; }
    if (subT > 0) { subT -= dt; if (subT <= 0) $('lwSub').classList.add('hidden'); }
    if (c.phase === 'warn') {
      if (!c.seen) checkSeen(c);
      const left = Math.max(0, c.warn - c.t); $('lwAlTime').textContent = String(Math.ceil(left)); $('lwAlArc').style.strokeDashoffset = String(213.6 * (1 - left / c.warn));
      $('lwAlBox').classList.toggle('done', !!c.hidden.box); $('lwAlMat').classList.toggle('done', !!c.hidden.mat); $('lwAlChairs').classList.toggle('done', !!c.hidden.stuehle); $('lwAlLuke').classList.toggle('done', !bunkerOpen(S) || S.bunker.hatch !== 'offen'); $('lwAlHand').classList.toggle('done', handTotal(S) === 0);
      c.beat -= dt; if (c.beat <= 0) { c.beat = left < 4 ? 0.45 : 0.75; if (c.seen) snd.heart(left < 4 ? 1.2 : 0.8); } c.step -= dt; if (c.step <= 0) { c.step = 0.55; if (C.area === 'zimmer') snd.hallStep(0.3 + (1 - left / c.warn) * 0.9); }
      if (left <= 0) { c.phase = 'door'; c.t = 0; $('lwAlarm').classList.add('inside'); snd.door(true); P.setVisible(true); P.place(ROOM.x1 + 1.0, 0, (DOOR.z0 + DOOR.z1) / 2, -Math.PI / 2); P.mode = 'stand'; P.act = 0; P.lookAt = null; c.goal = [[ROOM.x1 - 0.05, (DOOR.z0 + DOOR.z1) / 2 + 0.1], [ROOM.x1 - 0.9, DOOR.z1 - 0.23]] /* am offenen Türblatt vorbei: der Kopf ist seit den neuen Figuren doppelt so breit */; }
    } else if (c.phase === 'door') {
      door.rotation.y = -1.25 * ease(c.t / 0.7); W.furn.hallLight.intensity = 1.6 * ease(c.t / 0.5);
      if (c.goal.length && walkTo(P, c.goal[0][0], c.goal[0][1], dt, 1.3)) c.goal.shift();
      if (c.t > 1.4 && !c.goal.length) { c.phase = 'talk'; c.t = 0; c.absent = ctrlArea() === 'bunker'; c.out = !c.kamera && ctrlArea() === 'draussen'; P.lookAt = c.out ? V3(0.4, 1.4, ROOM.z0) : c.absent ? V3(0, 1.4, 0.1) : V3(ctrlMe().x, 1.5, ctrlMe().z); const ids = c.auto ? [c.who === 'mama' ? 'm_auto' : 'p_auto'] : c.kamera ? [c.who === 'mama' ? 'm_kamera1' : 'p_kamera1'] : c.out ? [c.who === 'mama' ? 'm_draussen' : 'p_draussen'] : c.absent ? [c.who === 'mama' ? 'm_weg1' : 'p_weg'] : S.rauch > 0.4 ? (c.who === 'mama' ? ['m_rauch1', 'm_rauch2'] : ['p_rauch1', 'p_rauch2']) : c.who === 'mama' ? ['m_in1', 'm_in2', 'm_in3'] : ['p_in1', 'p_in2']; c.inId = ids[(Math.random() * ids.length) | 0]; c.wait = line(c.inId) + 0.35; }
      P.update(dt, C.t);
    } else if (c.phase === 'talk') {
      if (!c.absent && !c.out) faceTo(P, ctrlMe().x, ctrlMe().z, dt); P.update(dt, C.t); c.wait -= dt;
      if (c.wait <= 0 && !c.excuse) { c.excuse = true; c.wait = c.out ? 0.2 : c.absent ? (c.who === 'mama' ? line('m_weg2') + 0.3 : 0) : line(/_rauch/.test(c.inId || '') ? einer(['l_rauch1', 'l_rauch2', 'l_rauch3']) : excuseFor(c)) + 0.3; }
      else if (c.wait <= 0 && c.kamera && !c.auto && !c.k2) { c.k2 = true; c.wait = line(c.who === 'mama' ? 'm_kamera2' : 'p_kamera2') + 0.3; } // das fette Gespräch geht weiter
      else if (c.wait <= 0 && (!c.follow || c.hostRes)) { c.res = c.follow ? c.hostRes : c.kamera ? { caught: true, seen: ['kamera'], spot: null } : mpGuests() || alsLudwig(S, ludwigP(), (Q) => elternCheck(Q, { who: c.who, first: c.first, hidden: c.hidden, kumpelIn: mpKumpelIn(c), absent: ctrlArea() === 'bunker', draussen: !!c.out })); if (isHost()) mpSend({ t: 'lw-ctrl', op: 'res', res: c.res }); if (c.res.inBox > 0 && binLudwig()) { toast(`Schnell: ${c.res.inBox} aus den Taschen in die Box gesteckt.`, 2600); C.dirty = true; } if (c.res.spot) { c.phase = 'search'; c.t = 0; const tgt = c.res.spot === 'bett' ? [2.1, -0.55] : [-2.2, -1.85]; c.goal = [[1.6, 1.4], tgt]; c.wait = line(c.res.spot === 'bett' ? 'm_bett' : 'm_schrank') + 0.2; } else { c.phase = 'verdict'; c.t = 0; c.wait = 0; } }
    } else if (c.phase === 'search') {
      if (c.goal.length) { if (walkTo(P, c.goal[0][0], c.goal[0][1], dt, 1.5)) c.goal.shift(); } else { P.act = 'look'; c.wait -= dt; if (c.wait <= 0 && c.t > 1.2) { c.phase = 'verdict'; c.t = 0; c.wait = 0; } }
      P.update(dt, C.t);
    } else if (c.phase === 'verdict') {
      P.update(dt, C.t); if (c.out && !c.home && c.res && c.res.caught) { c.home = true; bringHome(); c.t = -0.6; return; } if (c.t < 0.1) return; /* draußen erwischt: Mama holt Ludwig rein */ if (!c.said) { c.said = true; const r = c.res; P.act = r.caught ? 'point' : 0;
        if (r.caught) { c.wait = line(r.seen && r.seen.includes('luke') ? (c.who === 'mama' ? 'm_luke' : 'p_luke') : r.kumpel ? 'm_kumpel' : c.who === 'mama' ? 'm_caught1' : 'p_caught') + 0.25; } else c.wait = line(r.spot ? 'm_sauber' : c.who === 'mama' ? ['m_ok1', 'm_ok2', 'm_ok3'][(Math.random() * 3) | 0] : ['p_ok1', 'p_ok2'][(Math.random() * 2) | 0]) + 0.2;
      }
      c.wait -= dt; if (c.wait > 0) return;
      if (c.res.caught && !c.saidL && !c.out && !c.absent && !c.kamera && !c.auto && !c.res.kumpel && !(c.res.seen && c.res.seen.includes('luke'))) { c.saidL = true; c.wait = line(caughtLine(c.who)) + 0.15; return; } // Ludwig redet sich raus
      if (c.res.caught && c.who === 'mama' && !c.said2) { c.said2 = true; c.wait = line('m_caught2') + 0.2; return; }
      if (c.follow && !c.hostDone) return; const taken = c.follow ? c.hostDone.taken : alsLudwig(S, ludwigP(), (Q) => elternDone(Q, c.res.caught)); const luke = !!(c.res.seen && c.res.seen.includes('luke')); if (luke) { if (c.follow) liftUp(); else nailHatch(); } if (isHost()) mpSend({ t: 'lw-ctrl', op: 'done', taken }); showResult(c.res.caught, taken, c.who, luke, c.auto ? 'auto' : c.kamera ? 'kamera' : c.out ? 'draussen' : ''); c.phase = 'leave'; c.t = 0; P.act = 0; P.lookAt = null; c.goal = [[ROOM.x1 - 1.05, DOOR.z1 - 0.2], [ROOM.x1 - 0.05, (DOOR.z0 + DOOR.z1) / 2 + 0.1], [ROOM.x1 + 1.2, (DOOR.z0 + DOOR.z1) / 2]]; C.dirty = true; save();
    } else if (c.phase === 'leave') {
      if (c.goal.length) { if (walkTo(P, c.goal[0][0], c.goal[0][1], dt, 1.5)) c.goal.shift(); P.update(dt, C.t); }
      else if (!c.closing) { c.closing = true; c.t = 0; P.setVisible(false); snd.door(false); }
      if (c.closing) { door.rotation.y = -1.25 * (1 - ease(c.t / 0.5)); W.furn.hallLight.intensity = 1.6 * (1 - ease(c.t / 0.5)); if (c.t > 0.7) endCtrl(); }
    }
  }
  function showResult(caught, taken, who, luke = false, why = '') {
    const r = $('lwResult'); r.classList.remove('hidden', 'bad', 'good'); r.classList.add(caught ? 'bad' : 'good'); $('lwResT').textContent = caught ? 'ERWISCHT!' : 'GESCHAFFT!';
    const ar = Math.round(C.S ? C.S.eltern.arrest : 60);
    $('lwResText').textContent = caught ? `${why === 'kamera' ? 'Die Kamera hat dich draußen gesehen. ' : why === 'auto' ? `${who === 'mama' ? 'Mama' : 'Papa'} hat dich vom Auto aus gesehen. ` : why === 'draussen' ? 'Du warst nicht im Zimmer. ' : ''}${who === 'mama' ? 'Mama' : 'Papa'} nimmt ${taken.kippen + taken.hand} Kippen, ${taken.tabak} Tabak und ${taken.papier} Blättchen mit.${taken.sack ? ` Der Rucksack ist auch weg (${taken.sack} ${taken.sack === 1 ? 'Packung' : 'Packungen'}).` : ''} ${ar} Sekunden Hausarrest: Niemand klopft.${luke ? ' Die Falltür ist 2 Minuten zugenagelt.' : ''}` : `${who === 'mama' ? 'Mama' : 'Papa'} hat nichts gemerkt.${taken.resp ? ` +${taken.resp} Respekt.` : ''}`;
    if (!caught && taken.resp) respPop(taken.resp);
    if (caught) { snd.nope(); } else snd.buy(); setTimeout(() => r.classList.add('hidden'), caught ? 5200 : 2800);
  }
  function endCtrl() {
    const c = C.ctrl; if (!c) return; if (C.hiddenSpot) unhideMe(); if (isHost()) for (const r of C.mp.players.values()) r.hidden = null; restoreItems(); const caught = c.res && c.res.caught; C.ctrl = null; $('lwAlarm').classList.add('hidden'); C.W.furn.door.rotation.y = 0; C.W.furn.hallLight.intensity = 0; C.W.cast.mama.setVisible(false); C.W.cast.papa.setVisible(false);
    placeKumpels(); setTimeout(() => { if (C.on && C.S && !C.ctrl) line(einer(caught ? ['g_mist', 'gr_mist1'] : PUH)); }, 600); C.dirty = true;
  }
  C.ctrlReset = () => { if (C.ctrl) { restoreItems(); C.ctrl = null; } $('lwAlarm').classList.add('hidden'); C.W.furn.door.rotation.y = 0; C.W.furn.hallLight.intensity = 0; C.W.cast.mama.setVisible(false); C.W.cast.papa.setVisible(false); };
  const busyCtrl = () => !!(C.ctrl && C.ctrl.phase !== 'warn' && C.area === 'zimmer'); // während die Eltern im Zimmer sind: nicht laufen, nichts benutzen

  // ---------------- Bunker: Falltür, Leiter, Maschinen, Lager, Bunker-PC, Lastwagen, Kumpel unten ----------------
  const KNAME = { rot: 'Rot', gelb: 'Gelb', gruen: 'Grün' };
  const bW = (x, y, z) => V3(BUNKER.x + x, y, BUNKER.z + z);
  const bdesk = createBunkerDesk({ getS: () => C.S, snd,
    onDeliver: (r) => { C.dirty = true; save(); C.truckQ++; gain('+' + euro(r.cash)); if (r.resp) respPop(r.resp); toast(r.mega ? 'MEGA-AUFTRAG ERLEDIGT! Jetzt geht das Finale im Boss-Plan.' : `Der Lastwagen holt ${r.o.n.toLocaleString('de-DE')} ${auftragWort(r.o.sorte)} für ${r.o.shop}. +${euro(r.cash)}`, 3600); },
    onAction: () => { C.dirty = true; save(); } });
  const bpc = createLudwigPC({ root: $('lwBPC'), snd, getS: () => C.S, onChange: () => {}, onClose: () => { if (C.ui === 'bpc') closeUI(); }, desk: bdesk });
  function setArea(a) { C.area = a; if (C.BK) C.BK.update(C.t, 0, a === 'bunker'); }
  // Laufen im Bunker: Halle und Garage, Wand mit Durchgang, Maschinen, Paletten, PC-Tisch, Autos, Säulen
  function bunkerBoxes() {
    const out = [{ x0: 16, x1: 16.4, z0: -11, z1: GARAGE.open0 }, { x0: BPC.x - 0.95, x1: BPC.x + 0.95, z0: BPC.z - 0.45, z1: BPC.z + 1.0 }, { x0: LAGER.x - 2.2, x1: LAGER.x + 1.4, z0: LAGER.z - 2.9, z1: LAGER.z + 2.9 }, { x0: LADDER.x - 0.35, x1: LADDER.x + 0.35, z0: LADDER.z - 0.9, z1: LADDER.z - 0.4 }];
    for (const x of [GARAGE.x0 + 2.8, GARAGE.x0 + 8]) out.push({ x0: x - 1.15, x1: x + 1.15, z0: -10.6, z1: -6.2 }); for (let x = GARAGE.x0 + 3; x < GARAGE.x1; x += 6) for (const z of [-4, 1]) out.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
    for (const [x, z] of PILLARS) out.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 }); out.push(...DECO, ...C.BK.flowBoxes(), ...T3.boxen()); if (C.S.tools && C.S.tools.werkbank) out.push(...WERK_BOXES); // Hauptband, Packstation, Lifte
    for (const u of C.S.bunker.units) { const sl = SLOTS[u.id] && SLOTS[u.id][u.i]; if (!sl || u.id === 'c_robo') continue; const [w, d] = SIZE[u.id]; out.push({ x0: sl[0] - w / 2, x1: sl[0] + w / 2, z0: sl[1] - d / 2, z1: sl[1] + d / 2 }); }
    return out;
  }
  function collideBunker(x, z) {
    let lx = clamp(x - BUNKER.x, BUNKER.x0 + R, GARAGE.x1 - R); let lz = clamp(z - BUNKER.z, BUNKER.z0 + R, BUNKER.z1 - R); const boxes = bunkerBoxes();
    for (let it = 0; it < 2; it++) for (const b of boxes) { const cx = clamp(lx, b.x0, b.x1); const cz = clamp(lz, b.z0, b.z1); const dx = lx - cx; const dz = lz - cz; const d = Math.hypot(dx, dz); if (d < R) { if (d > 1e-6) { lx = cx + dx / d * R; lz = cz + dz / d * R; } else { const pen = [lx - b.x0, b.x1 - lx, lz - b.z0, b.z1 - lz]; const k = pen.indexOf(Math.min(...pen)); if (k === 0) lx = b.x0 - R; else if (k === 1) lx = b.x1 + R; else if (k === 2) lz = b.z0 - R; else lz = b.z1 + R; } } }
    return [lx + BUNKER.x, lz + BUNKER.z];
  }
  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.ceil(s % 60) % 60).padStart(2, '0')}`;
  function zimmerHatchTarget(add, inCtrl) {
    const S = C.S; if (!bunkerOpen(S)) return; const B = S.bunker; const p = V3(HATCH.x, 0.05, HATCH.z);
    if (B.lock > 0) { if (!inCtrl) add(p, 1.8, { k: 'hatch', e: `Falltür ist zugenagelt (${mmss(B.lock)})`, info2: true }); return; }
    add(p, 1.8, { k: 'hatch', e: B.hatch === 'zu' ? 'Falltür öffnen' : inCtrl ? 'Runter in den Bunker (verstecken)' : 'Runter in den Bunker', f: B.hatch === 'offen' ? 'Falltür zu, Teppich drüber' : '' });
  }
  function zimmerBunkerTargets(add) {
    const S = C.S; if (!bunkerOpen(S)) return; zimmerHatchTarget(add, false); if (S.bunker.kumpel || S.bunker.lock > 0) return;
  }
  function bunkerTargets(add) {
    const S = C.S; const B = S.bunker; const cap = handCap(S);
    add(bW(LADDER.x, 1.4, LADDER.z - 0.5), 1.9, { k: 'ladder', e: 'Hoch ins Zimmer', f: B.hatch === 'offen' ? 'Luke von unten zuziehen' : '' });
    add(bW(BPC.x, 1.0, BPC.z), 1.9, { k: 'bpc', e: 'Bunker-PC: Aufträge und KippCord' }); add(bW(GARAGE.x1 - 0.7, 1.2, 6.5), 2.4, { k: 'rampUp', e: 'Rampe hoch, raus auf die Straße' });
    if (!(T3.aktiv() && !B.razzia.hidden.lager)) add(bW(LAGER.x, 1.0, LAGER.z), 3.4, { k: 'lager', e: S.hand > 0 ? `${S.hand} Kippen ins Lager legen` : `Lager: ${B.lager.toLocaleString('de-DE')} Kippen`, info2: !(S.hand > 0), f: B.lager > 0 && handRoom(S, 'kippe') > 0 ? 'Kippen aus dem Lager nehmen' : '' });
    B.units.forEach((u, i) => {
      const sl = SLOTS[u.id] && SLOTS[u.id][u.i]; if (!sl) return; const M = MACHINES[u.id]; const [w, d] = SIZE[u.id]; const st = unitStatus(u); const nm = M.name + (B.units.filter((q) => q.id === u.id).length > 1 ? ' ' + (u.i + 1) : '');
      const inf = unitInfo(S, u); const rateT = inf.rate !== undefined ? `${inf.rate.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${inf.what}/Min.` : ''; const madeT = inf.made !== undefined ? `, bisher ${inf.made.toLocaleString('de-DE')}` : '';
      const e = st === 'bau' ? `${nm}: wird aufgebaut (${Math.round(buildProgress(u) * 100)} %)` : st === 'wartet' ? `${nm} anwerfen (${rateT})` : st === 'klemmt' ? `${nm} klemmt: draufhauen!` : st === 'material' ? `${nm}: kein Tabak oder keine Blättchen` : inf.line ? `${nm}: ${inf.line}` : M.kind === 'hand' ? `${nm} läuft: ${rateT}${madeT}${u.op ? (u.op === 'kumpel' ? ' (Kumpel bedient)' : ' (Roboter bedient)') : ', noch ' + Math.ceil(u.run) + ' s'}` : `${nm} läuft: ${rateT}${madeT}`;
      add(bW(sl[0], 1.0, sl[1]), Math.max(w, d) / 2 + 1.3, { k: 'unit', i, e, info2: !(st === 'wartet' || st === 'klemmt') });
    });
    if (S.tools && S.tools.werkbank) { const A = C.WB.anchors; const ab = ablageTotal(S); // Werkbank, Teilekiste, Ablage (Teil 2)
      add(bW(A.werk.x, A.werk.y, A.werk.z), 1.9, { k: 'werk', e: S.werk.liquid ? 'Werkbank: Vape weiterbauen' : 'Werkbank: Vapes bauen' });
      add(bW(A.kiste.x, A.kiste.y, A.kiste.z), 1.6, { k: 'teilekiste', e: `Teilekiste (${teileUsed(S)}/${TEILE_SLOTS} Fächer)`, f: sackUsed(S) > 0 ? 'Teile aus dem Rucksack einräumen' : '' });
      if (ab > 0) add(bW(A.ablage.x, A.ablage.y, A.ablage.z), 1.6, { k: 'ablage', e: `${ab} fertige ${ab === 1 ? 'Vape' : 'Vapes'} in die Taschen` }); }
    const K = C.kumpel.find((q) => q.state === 'bunker'); if (K) { const P = C.W.cast[K.key]; add(V3(P.x, 1.2, P.z), 1.7, { k: 'kumpelUp', key: K.key, e: `${KNAME[K.key]}: hoch an den Tisch` }); }
  }
  function bunkerInteract(t, key) {
    const S = C.S; const B = S.bunker;
    if (t.k === 'hatch') { if (B.lock > 0) { snd.nope(); return true; } if (key === 'e') { if (B.hatch === 'zu') { B.hatch = 'offen'; snd.hatch(true); } else climb('down'); } else if (key === 'f' && B.hatch === 'offen') { B.hatch = 'zu'; snd.hatch(false); toast('Falltür zu, Teppich drüber.'); } C.dirty = true; save(); return true; }
    if (t.k === 'ladder') { if (key === 'e') climb('up'); else if (key === 'f' && B.hatch === 'offen') { B.hatch = 'zu'; snd.hatch(false); toast('Ludwig zieht an der Schnur: Luke zu, der Teppich rutscht oben drüber.', 3200); save(); } return true; }
    if (t.k === 'bpc') { if (key === 'e') openUI('bpc'); return true; }
    if (t.k === 'werk') { if (key === 'e') { if (werkReady(S)) openUI('werk'); else { snd.nope(); toast('Für Vapes brauchst du erst den Boss-Plan-Knoten „Vapes“.'); } } return true; }
    if (t.k === 'teilekiste') { if (key === 'e') openInv('teile'); else if (key === 'f') { const g = unpackTeile(S); const ok = Object.keys(g).some((k) => !['n', 'rest'].includes(k) && g[k] > 0); if (ok) { snd.take(); toast(g.rest ? `Teile eingeräumt. ${g.rest} ${g.rest === 1 ? 'Packung passt' : 'Packungen passen'} nicht mehr rein.` : 'Alle Teile in die Teilekiste geräumt.'); } else { snd.nope(); toast('Keine Teile im Rucksack oder die Teilekiste ist voll.'); } C.dirty = true; save(); } return true; }
    if (t.k === 'ablage') { if (key === 'e') { const r = takeAblage(S); if (r.ok) { snd.take(); toast(`${r.n} ${r.n === 1 ? 'Vape' : 'Vapes'} eingesteckt.${r.left ? ` ${r.left} passen nicht mehr in die Taschen.` : ''}`); } else { snd.nope(); toast(r.why === 'voll' ? 'Deine Taschen sind voll.' : 'Die Ablage ist leer.'); } C.dirty = true; save(); } return true; }
    if (t.k === 'lager') { if (key === 'e') { const r = lagerPut(S); if (r.ok) { snd.take(); toast(`${r.n} Kippen ins Lager gelegt.`); } else snd.nope(); } else if (key === 'f') { const r = lagerTake(S, handRoom(S, 'kippe') + handTotal(S)); /* Platz nach Taschen-Plätzen */ if (r.ok) { snd.take(); toast(`${r.n} Kippen aus dem Lager genommen.`); } else { snd.nope(); toast(r.why === 'voll' ? 'Deine Taschen sind voll.' : 'Das Lager ist leer.'); } } C.dirty = true; save(); return true; }
    if (t.k === 'unit') { if (key !== 'e') return true; const r = operate(S, t.i); if (r.ok) { if (r.fixed) { snd.clank(); toast(`${MACHINES[r.u.id].name} läuft wieder.`); } else { snd.crank(); toast(`${MACHINES[r.u.id].name} läuft: eine Ladung, 30 Sekunden.`); } C.dirty = true; save(); } else snd.nope(); return true; }
    if (t.k === 'rampUp') { if (key === 'e') garageMove('up'); return true; }
    if (t.k === 'kumpelDown') { if (key === 'e') sendKumpelDown(t.key); return true; }
    if (t.k === 'kumpelUp') { if (key === 'e') callKumpelUp(t.key); return true; }
    return false;
  }
  // Ein Kumpel geht runter und bedient die Handmaschinen (er muss sich bei Kontrollen nicht verstecken)
  function sendKumpelDown(key) {
    const S = C.S; const K = C.kumpel.find((q) => q.key === key); if (!K || K.state !== 'sit' || S.bunker.kumpel || !bunkerOpen(S) || S.bunker.lock > 0) return false;
    if (K.busy) { K.busy = false; S.papier++; S.tabak++; } K.state = 'down'; K.go = [seatAt(SEATS[K.seat], 0.6), [HATCH.x + 0.5, HATCH.z]]; const P = C.W.cast[key]; P.mode = 'walk'; P.act = 0; P.lookAt = null; S.bunker.kumpel = key;
    toast(`${KNAME[key]} geht runter in den Bunker und bedient die Maschinen.`); C.dirty = true; save(); return true;
  }
  function callKumpelUp(key) { const S = C.S; if (S.bunker.kumpel !== key) return false; S.bunker.kumpel = null; placeKumpels(); toast(`${KNAME[key]} geht wieder hoch an den Tisch.`); C.dirty = true; save(); return true; }
  function placeBunkerKumpel() { const S = C.S; if (!S || !S.bunker || !S.kumpels) return; for (const K of C.kumpel) if (S.bunker.kumpel === K.key) { K.state = 'bunker'; K.busy = false; } }
  function bunkerKumpelTick(K, P, dt) {
    if (K.state === 'down') { const q = K.go[0]; if (q && walkTo(P, q[0], q[1], dt, 2.4)) K.go.shift(); if (!K.go.length) { K.state = 'bunker'; snd.hide(); } P.update(dt, C.t); return; }
    const u = C.S.bunker.units.find((q) => q.op === 'kumpel'); let x = BPC.x + 1.4; let z = BPC.z + 1.6; let face = Math.atan2(BPC.x - x, BPC.z - z);
    if (u) { const sl = SLOTS[u.id][u.i]; x = sl[0] - 0.3; z = sl[1] + SIZE[u.id][1] / 2 + 0.5; face = Math.PI; }
    P.place(BUNKER.x + x, 0, BUNKER.z + z, face); P.mode = 'stand'; P.act = u && u.run > 0 ? 'piano' : 0; P.lookAt = null; if (!P.visible) P.setVisible(true); P.update(dt, C.t);
  }
  // Leiter: Kamera fährt zur Luke, Abblenden, auf der anderen Seite weiter (unten wie oben)
  function climb(dir) {
    if (C.mode !== 'walk' || C.climb || !C.S) return; const S = C.S; if (dir === 'down' && (S.bunker.hatch !== 'offen' || S.bunker.lock > 0)) return;
    unlock(); C.mode = 'climb'; C.camT = 1; C.climb = { dir, t: 0, from: eyePos(V3()), swapped: false }; if (dir === 'up' && S.bunker.hatch === 'zu') { S.bunker.hatch = 'offen'; snd.hatch(true); } snd.step(1);
  }
  function climbTick(dt) {
    const c = C.climb; if (!c) return; const prev = c.t; c.t += dt; const f = $('lwFade');
    if (c.t > 0.45 && !c.fading) { c.fading = true; f.style.transition = 'opacity .28s ease'; f.classList.add('on'); }
    if (c.t > 0.75 && !c.swapped) { c.swapped = true; const S = C.S;
      if (c.dir === 'down') { setArea('bunker'); snd.bunkerIn(); Object.assign(C.me, { x: BUNKER.x + LADDER.x, z: BUNKER.z + LADDER.z + 0.6, yaw: Math.PI, pitch: -0.05, vx: 0, vz: 0 }); enteredBunker(); }
      else { setArea('zimmer'); snd.bunkerOut(); Object.assign(C.me, { x: HATCH.x + 0.75, z: HATCH.z, yaw: -Math.PI / 2, pitch: -0.15, vx: 0, vz: 0 }); }
      f.classList.remove('on'); }
    if (Math.floor(c.t / 0.24) !== Math.floor(prev / 0.24)) snd.rung(0.8); // Metallsprossen der Leiter
    if (c.t > 1.3) { C.climb = null; C.mode = 'walk'; f.style.transition = ''; C.dirty = true; save(); }
  }
  function climbCam(outPos, outLook) {
    const c = C.climb; const k = ease(Math.min(1, c.t / 0.75)); const k2 = ease(Math.max(0, Math.min(1, (c.t - 0.75) / 0.55))); const lx = BUNKER.x + LADDER.x; const lz = BUNKER.z + LADDER.z;
    if (c.dir === 'down') { if (!c.swapped) { outPos.set(lerp(c.from.x, HATCH.x, k), lerp(c.from.y, 0.9, k), lerp(c.from.z, HATCH.z + 0.25, k)); outLook.set(HATCH.x, -1.5, HATCH.z - 0.2); } else { outPos.set(lx, lerp(4.6, EYE, k2), lz + 0.1 + 0.5 * k2); outLook.set(lx, lerp(2.0, EYE - 0.1, k2), lz + 2.5); } }
    else if (!c.swapped) { outPos.set(lerp(c.from.x, lx, k), lerp(c.from.y, 3.6, k), lerp(c.from.z, lz - 0.1, k)); outLook.set(lx, 8, lz - 0.6); }
    else { outPos.set(HATCH.x + 0.1 + 0.65 * k2, lerp(0.2, EYE, k2), HATCH.z); outLook.set(HATCH.x + 3, lerp(1.0, EYE - 0.2, k2), HATCH.z); }
    return 70;
  }
  // Mama findet die offene Falltür: zugenagelt, und wer unten ist, wird hochgeholt
  function nailHatch() {
    const S = C.S; S.bunker.lock = LOCK; S.bunker.hatch = 'zu'; bunkerChat(S, 'kumpels', 'Gelb', 'Alter. Mama hat die Falltür zugenagelt. Zwei Minuten kommt keiner rein.');
    liftUp();
  }
  function liftUp() { if (C.area === 'bunker') { if (C.ui === 'bpc') closeUI(); setArea('zimmer'); C.climb = null; C.mode = 'walk'; Object.assign(C.me, { x: HATCH.x + 0.75, z: HATCH.z, yaw: -Math.PI / 2, pitch: -0.1, vx: 0, vz: 0 }); } } // wer unten ist, wird hochgeholt
  // Unten sieht man die Eltern-Warnung nur, wenn man auf den KippCord schaut (Wandbildschirm oder Bunker-PC)
  function checkSeen(c) {
    if (C.area !== 'bunker') c.seen = true; else if (C.ui === 'bpc' && bdesk.chatOpen()) c.seen = true;
    else { const p = C.BK.wallScreenPos(); if (p.distanceTo(camPos) < 16) { tmp.copy(p).project(C.cam); if (tmp.z < 1 && Math.abs(tmp.x) < 0.95 && Math.abs(tmp.y) < 0.95) c.seen = true; } }
    if (c.seen) { $('lwAlarm').classList.remove('hidden'); snd.sting(); line(c.who === 'mama' ? 'w_mama' : 'w_papa'); }
  }
  function bunkerEvent(e) {
    const inB = C.area === 'bunker'; C.dirty = true;
    if (e.k === 'fertig') { toast(`${MACHINES[e.u.id].name} ist fertig aufgebaut!`, 2800); snd.buy(); }
    else if (e.k === 'klemmt') { if (inB) { snd.clank(); toast(`${MACHINES[e.u.id].name} klemmt! Hin und E drücken.`, 2800); } }
    else if (e.k === 'auftrag') { snd.ping(); toast(e.o.mega ? 'MEGA-AUFTRAG am Bunker-PC: Beliefere die ganze Welt!' : `Neue Anfrage am Bunker-PC: ${e.o.shop} will ${e.o.n.toLocaleString('de-DE')} ${auftragWort(e.o.sorte)}.`, 3600); }
    else if (e.k === 'abgelehnt' && e.auto) toast(`${e.o.shop} hat keine Antwort bekommen. −${e.pen} Respekt.`, 3000);
    else if (e.k === 'verpasst') { snd.nope(); toast(`Auftrag von ${e.o.shop} verpasst! −${e.pen} Respekt.`, 3600); }
    else if (e.k === 'gag' && inB) snd.ping();
  }
  // Außenwelt aus- und einblenden; ihre Lichter bleiben an (weniger Lichter würden jeden Shader neu übersetzen: sekundenlanges Ruckeln beim Runtergehen)
  function outsideVisible(on) { if (!C.AU || C.outVis === on) return; C.outVis = on; C.AU.content.visible = on; C.AU.g.userData.hidden = !on; C.W.out.g.visible = on; }
  function bunkerVisuals(dt) {
    const S = C.S; if (!C.BK) return; const open = !!(S && bunkerOpen(S)); C.HT.set(open, open && S.bunker.hatch === 'offen'); C.HT.update(dt);
    if (open && !C.bkWarm) { C.bkWarm = true; C.BK.precompile(C.cam); } // Bunker-Shader vorbereiten, sobald die Falltür freigeschaltet ist
    const inB = C.area === 'bunker'; C.BK.update(C.t, dt, inB); outsideVisible(!inB); /* Bunker und Garage liegen dort, wo draußen der Wohnblock am Straßenende steht: Außenwelt im Bunker aus */ if (!inB || !S) return; const B = S.bunker; assignOps(S);
    C.BK.setHatchLight(B.hatch === 'offen'); C.BK.setAlarm(!!(C.ctrl && C.ctrl.phase === 'warn' && C.ctrl.seen) || T3.aktiv()); C.BK.setLager(B.lager); C.BK.setChat(B.chat, !!(C.ctrl && C.ctrl.phase === 'warn' && Math.sin(C.t * 10) > 0));
    C.BK.syncFlow(B.units); for (const u of B.units) C.BK.showUnit(u, unitStatus(u), buildProgress(u), C.t, camPos, unitInfo(S, u));
    for (const u of B.units) { if (u.id !== 'c_robo' || u.build > 0) continue; const U = C.BK.units.get('c_robo:' + u.i); if (!U) continue; const job = B.units.find((q) => q.op === 'robo' + u.i); if (job) { const sl = SLOTS[job.id][job.i]; U.g.position.set(sl[0] + 0.45, 0, sl[1] + SIZE[job.id][1] / 2 + 0.5); U.g.rotation.y = Math.PI; } else { const sl = SLOTS.c_robo[u.i]; U.g.position.set(sl[0], 0, sl[1]); U.g.rotation.y = Math.PI / 2; } }
    if (C.truckQ > 0 && !C.BK.truckBusy()) { C.truckQ--; C.BK.startTruck(); snd.truck(); }
  }

  // ---------------- Draußen: Fenster, Kamera, Kalle und Ede, Tiefgarage ----------------
  function outsideTargets(add) {
    const S = C.S; const front = S.queue[0];
    add(V3(0.42, 1.3, FZ), 1.9, { k: 'winIn', e: front ? `${front.name} wartet am Fenster: rein und verkaufen` : 'Ludwigs Fenster', info2: true, f: 'Durchs Fenster reinklettern' });
    add(V3(KALLE_AT.x, 1.4, KALLE_AT.z), 2.2, { k: 'kalle', hl: figHl(C.AU.kalle), e: `Kalle: Tabak und Blättchen${sortChoices(S).length > 1 ? ' und mehr' : ''} (Rucksack ${sackUsed(S)}/${sackCap(S)})` });
    add(V3(COUNTER.x, 1.4, COUNTER.z), 2.0, { k: 'ede', hl: figHl(C.AU.ede), e: 'Ede: Getränke und Snacks' });
    for (const p of S.welt.park) { const [bx, bz] = BANKS[p.bank]; add(V3(bx, 1.0, bz + 0.1), 2.2, S.hand > 0 ? { k: 'park', id: p.id, hl: figHl(C.AU.figures && C.AU.figures.park[p.bank]), e: `Verkaufen: will ${p.want} Kippen, zahlt ${euro(p.preis)} pro Stück` } : { k: 'park', id: p.id, hl: figHl(C.AU.figures && C.AU.figures.park[p.bank]), e: `Will ${p.want} Kippen (du hast keine dabei)`, info2: true }); }
    { const open = erwinOpen(clock(S).h); const inside = inErwin(C.me.x, C.me.z); // Elektro-Erwin gegenüber (Teil 2), offen 8 bis 20 Uhr
      if (open || inside) add(V3(ERWIN_COUNTER.x, 1.4, ERWIN_COUNTER.z), 2.2, open ? { k: 'erwin', hl: figHl(C.AU.erwin && C.AU.erwin.erwin), e: 'Elektro-Erwin: Teile für Vapes' } : { k: 'erwin', hl: figHl(C.AU.erwin && C.AU.erwin.erwin), e: 'Erwin macht Feierabend. Morgen ab 8 Uhr.', info2: true });
      else add(V3(ERWIN_DOOR.x, 1.3, ERWIN_DOOR.z - 0.5), 2.4, { k: 'erwinZu', e: 'Elektro-Erwin: geschlossen (offen von 8 bis 20 Uhr)', info2: true }); }
    add(V3(GATE.x, 1.2, GATE.z), 2.4, bunkerOpen(S) ? { k: 'gateDown', e: 'Runter in die Tiefgarage (zum Bunker)' } : { k: 'gateDown', e: 'Das Tor zur Tiefgarage ist zu.', info2: true });
  }
  function outsideInteract(t, key) {
    if (C.area !== 'draussen') return false;
    if (t.k === 'winIn') { if (key === 'f') climbWindow('in'); return true; }
    if (t.k === 'kalle') { if (key === 'e') openKiosk('kalle'); return true; }
    if (t.k === 'ede') { if (key === 'e') openKiosk('vorne'); return true; }
    if (t.k === 'erwin') { if (key === 'e' && erwinOpen(clock(C.S).h)) openKiosk('erwin'); return true; }
    if (t.k === 'erwinZu') return true;
    if (t.k === 'gateDown') { if (key === 'e' && bunkerOpen(C.S)) garageMove('down'); return true; }
    if (t.k === 'park') { if (key === 'e') { const r = parkSell(C.S, t.id); if (r.ok) { snd.coin(r.n); gain('+' + euro(r.cash)); if (r.resp) respPop(r.resp); toast(`${r.n} ${r.n === 1 ? 'Kippe' : 'Kippen'} im Park verkauft.`); C.AU.syncPark(C.S.welt.park); C.dirty = true; save(); } else { snd.nope(); toast(r.why === 'leer' ? 'Du hast keine Kippen in den Taschen.' : 'Der Kunde ist weg.'); } } return true; }
    return true;
  }
  // Heimkommen: seit 2026-11-20 nur ein Hinweis, ausgeräumt wird an der Materialkiste (Inventar)
  function unpack() { const n = sackUsed(C.S); if (n > 0) toast(`Im Rucksack: ${n} ${n === 1 ? 'Packung' : 'Packungen'}. Neben deinem Stuhl in die Materialkiste räumen (E).`, 3600); }
  // Aus dem Fenster und wieder rein: Kamerafahrt durch den offenen rechten Flügel (kein Abblenden, draußen ist ja direkt da)
  const WX = 0.42;
  function climbWindow(dir) {
    const S = C.S; if (C.mode !== 'walk' || C.wclimb || !S) return;
    const arr = Math.max(S.eltern.arrest, S.parrest || 0); if (dir === 'out' && arr > 0) { snd.nope(); toast(`Hausarrest! Noch ${mmss(arr)}, du kommst nicht raus.`); return; } /* parrest: persönlicher Hausarrest (Polizei, Mehrspieler) */
    if (dir === 'out' && C.ctrl) { snd.nope(); toast('Jetzt nicht, die Eltern kommen!'); return; }
    unlock(); C.mode = 'wclimb'; C.camT = 1; C.wclimb = { dir, t: 0, from: eyePos(V3()) }; snd.step(1); if (C.AU) C.AU.reset();
  }
  function wclimbTick(dt) {
    const c = C.wclimb; if (!c) return; const S = C.S; c.t += dt; C.W.win.hinge.rotation.y = 1.5 * Math.sin(Math.min(1, c.t / 1.5) * Math.PI);
    if (!c.swapped && c.t > 0.75) { c.swapped = true; if (c.dir === 'out') { setArea('draussen'); Object.assign(C.me, { x: WX, z: WIN_OUT.z, yaw: 0, pitch: -0.1, vx: 0, vz: 0, gy: groundY(WX, WIN_OUT.z) }); } else { setArea('zimmer'); Object.assign(C.me, { x: WX, z: ROOM.z0 + 0.95, yaw: Math.PI, pitch: -0.1, vx: 0, vz: 0, gy: 0 }); } }
    if (Math.floor(c.t / 0.3) !== Math.floor((c.t - dt) / 0.3)) snd.step(0.6);
    if (c.t > 1.5) { C.wclimb = null; C.mode = 'walk'; C.W.win.hinge.rotation.y = 0; C.dirty = true; if (c.dir === 'in') unpack(); else if (!S.flags.draussenTip) { S.flags.draussenTip = true; toast('Draußen! Die Kamera am Fenster dreht sich hin und her: Bleib aus dem roten Bereich. Der Kiosk ist rechts an der Ecke, Kalle hinten im Hof.', 5200); } save(); }
  }
  function wclimbCam(outPos, outLook) {
    const c = C.wclimb; const k = ease(Math.min(1, c.t / 1.5)); const inside = [V3(WX, 1.5, ROOM.z0 + 0.5), V3(WX, 1.62, ROOM.z0 - 0.08), V3(WX, 1.55, FZ - 0.45)];
    const pts = c.dir === 'out' ? [c.from, ...inside, V3(WX, EYE + groundY(WX, WIN_OUT.z), WIN_OUT.z)] : [c.from, ...inside.slice().reverse(), V3(WX, EYE, ROOM.z0 + 0.95)];
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1])); const d = k * L[L.length - 1]; let i = 1; while (i < pts.length - 1 && L[i] < d) i++;
    outPos.lerpVectors(pts[i - 1], pts[i], (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1])); outLook.copy(outPos).add(c.dir === 'out' ? V3(0, -0.18, -1) : V3(0, -0.1, 1)); return 70;
  }
  // Kamera: sieht sie Ludwig draußen eine Sekunde lang, kommen die Eltern zum Gespräch
  function camWatch(dt) {
    if (!C.AU) return; const S = C.S; const out = C.area === 'draussen'; const watching = out && C.mode === 'walk' && !C.ctrl && (!C.ui || C.ui === 'phone'); const cam = C.AU.update(C.t, dt, out, C.me.x, C.me.z, watching);
    const w = C.AU.watch(dt, watching, C.me.x, C.me.z, handTotal(S) > 0 || sackUsed(S) > 0, clock(S).phase === 'nacht');
    const list = [[cam, CAM.need, 'KAMERA SIEHT DICH'], [w.pol, 1.0, 'POLIZEI SIEHT DICH'], [w.fam, 0.8, (S.welt.wer === 'papa' ? 'PAPA' : 'MAMA') + ' SIEHT DICH VOM AUTO'], [w.nb, 1.5, 'HERR KRAUSE SCHAUT']]; let top = list[0]; for (const it of list) if (it[0] / it[1] > top[0] / top[1]) top = it;
    $('lwCam').classList.toggle('hidden', !(top[0] > 0.02)); $('lwCamB').textContent = top[2]; $('lwCamBar').style.width = `${Math.min(1, top[0] / top[1]) * 100}%`;
    if (!watching) return; if (cam >= CAM.need) kameraErwischt(); else if (w.pol >= 1.0) polizeiErwischt(); else if (w.fam >= 0.8) autoErwischt(S.welt.wer); else if (w.nb >= 1.5) nachbarPetzt();
  }
  // Tag und Nacht: Himmel, Sonne/Mond, Laterne vor dem Fenster, Hintergrund
  function applyDay(force) { const S = C.S; if (!C.dayRefs || !C.AU || (!S && force === undefined)) return; const L = force !== undefined ? force : clock(S).light; /* force: Menü und Vorspann sind immer nachts */ if (Math.abs(L - (C.dayL === undefined ? -1 : C.dayL)) < 0.004) return; C.dayL = L; C.AU.setDay(L); const R = C.dayRefs;
    if (!R.glow) { R.glow = []; C.W.out.g.traverse((o) => { const m = o.material; if (m && m.emissiveIntensity > 0 && m.emissive && (m.emissive.r + m.emissive.g + m.emissive.b) > 0 && !R.glow.some((q) => q.m === m)) R.glow.push({ m, i0: m.emissiveIntensity, c0: m.map ? m.color.clone() : null }); }); } /* Fenster und Laterne gegenüber: am Tag fast aus */
    for (const q of R.glow) { q.m.emissiveIntensity = q.i0 * (0.2 + 0.8 * (1 - L)); if (q.c0) q.m.color.copy(q.c0).multiplyScalar(1 + 1.6 * L); } /* Fassaden gegenüber stehen im Gegenlicht: am Tag heller */
    if (R.hemi) { R.hemi.intensity = R.hemi0 + L * 0.75; R.hemi.color.setRGB(0.56 + 0.3 * L, 0.61 + 0.27 * L, 0.82 + 0.15 * L); } if (R.moon) { R.moon.intensity = R.moon0 + L * 0.35; R.moon.color.setRGB(0.62 + 0.38 * L, 0.7 + 0.26 * L, 1.0 - 0.1 * L); }
    if (R.street) R.street.intensity = R.street0 * (1 - L); if (R.sky) R.sky.material.opacity = 1 - L; C.W.scene.background.setRGB(0.027 + 0.45 * L, 0.035 + 0.55 * L, 0.06 + 0.8 * L); }
  function weltEvent(e) {
    const S = C.S; const wer = (w) => (w === 'papa' ? 'Papa' : 'Mama');
    PA.welt(e);
    if (e.k === 'polizei') C.AU.police.start(e.dir);
    else if (e.k === 'einkauf') { if (C.ctrl) { S.welt.weg = 0; return; } /* mitten in der Kontrolle fährt keiner los */ C.AU.fam.leave(); toast(`${wer(e.who)} ist einkaufen gefahren. Eine Weile kontrolliert keiner. Pass auf, wenn das Auto zurückkommt!`, 4600); }
    else if (e.k === 'zurueck') C.AU.fam.arrive(() => { if (!C.on || !C.S || C.ctrl) return; if (e.who === 'mama') line('m_zurueck'); toast(`${wer(e.who)} ist zurück vom Einkaufen und schaut gleich nach dir!`, 3600); setTimeout(() => { if (C.on && C.S && !C.ctrl) startCtrl({ who: e.who, first: false }); }, 1800); });
    else if (e.k === 'nachbar') C.AU.setNachbar(e.out);
    else if (e.k === 'parkKunde') { C.AU.syncPark(S.welt.park); if (C.area === 'draussen') toast('Im Park sitzt jemand und will Kippen.', 2800); }
    else if (e.k === 'parkWeg') C.AU.syncPark(S.welt.park);
  }
  // Polizei: wer etwas dabeihat (oder nachts unterwegs ist), wird angehalten und nach Hause gebracht
  function showCard(title, text) { const r = $('lwResult'); r.classList.remove('hidden', 'bad', 'good'); r.classList.add('bad'); $('lwResT').textContent = title; $('lwResText').textContent = text; snd.nope(); setTimeout(() => r.classList.add('hidden'), 5600); }
  function polizeiErwischt() {
    const S = C.S; if (C.ui) closeUI(); C.AU.resetWatch(); $('lwCam').classList.add('hidden'); snd.sting(); const t = C.mp ? polizeiMP(S) : polizeiKontrolle(S); line(einer(t.hand > 0 || t.sack > 0 ? ['pol_1', 'pol_3', 'pol_4', 'pol_5'] : ['pol_2', 'pol_4', 'pol_6']));
    showCard('POLIZEI!', (t.hand > 0 || t.sack > 0 ? `Die Streife nimmt dir ${t.hand} ${sortChoices(S).length > 1 ? 'Stück Ware' : 'Kippen'}${t.sack ? ` und den Rucksack (${t.sack} ${t.sack === 1 ? 'Packung' : 'Packungen'})` : ''} ab, dazu ${euro(t.fine)} Strafe${t.joints ? ' (dreifach, wegen der Joints)' : ''}. ` : '') + 'Sie bringen dich nach Hause: 60 Sekunden Hausarrest.'); bringHome(); C.dirty = true; save();
  }
  function autoErwischt(who) { if (isClient() || !binLudwig()) { personalCatch(`${who === 'papa' ? 'Papa' : 'Mama'} hat dich vom Auto aus gesehen!`); return; } if (C.ui) closeUI(); C.AU.resetWatch(); $('lwCam').classList.add('hidden'); snd.sting(); toast(`${who === 'papa' ? 'Papa' : 'Mama'} hat dich vom Auto aus gesehen!`, 2400); bringHome(() => { startCtrl({ who, first: false }); if (C.ctrl) { C.ctrl.kamera = true; C.ctrl.auto = true; C.ctrl.t = C.ctrl.warn; if (isHost()) mpSend({ t: 'lw-ctrl', op: 'patch', data: { kamera: true, auto: true, t: C.ctrl.warn } }); } }); }
  function nachbarPetzt() { const S = C.S; if (C.ctrl) return; if (isClient()) { C.AU.resetWatch(); $('lwCam').classList.add('hidden'); line(einer(['nb_1', 'nb_2', 'nb_3'])); toast('Herr Krause hat dich mit Ware gesehen und sagt es Ludwigs Eltern!', 3800); mpSend({ t: 'lw-ctrlreq', who: 'mama' }); return; } C.AU.resetWatch(); $('lwCam').classList.add('hidden'); S.welt.nbOut = false; S.welt.nbT = 120; line(einer(['nb_1', 'nb_2', 'nb_3'])); const who = homeParent('mama'); toast(`Herr Krause hat dich mit Tabak gesehen und sagt es ${who === 'mama' ? 'Mama' : 'Papa'}! Schnell nach Hause!`, 4200); setTimeout(() => { C.AU.setNachbar(false); if (C.on && C.S && !C.ctrl) startCtrl({ who, first: false }); }, 2400); }
  /* wer gerade zu Hause ist: ist einer einkaufen, kommt der andere */
  function homeParent(pref) { const W = C.S.welt; return W.weg > 0 ? (W.wer === 'mama' ? 'papa' : 'mama') : pref; }
  function kameraErwischt() {
    if (isClient() || !binLudwig()) { personalCatch('Die Kamera hat dich gesehen!'); return; } // Mehrspieler: wer erwischt wird, kommt allein in Hausarrest
    if (C.ui) closeUI(); C.AU.reset(); $('lwCam').classList.add('hidden'); snd.sting(); toast('Die Kamera hat dich gesehen!', 2400);
    bringHome(() => { startCtrl({ who: homeParent(Math.random() < 0.5 ? 'mama' : 'papa'), first: false }); if (C.ctrl) { C.ctrl.kamera = true; C.ctrl.t = C.ctrl.warn; if (isHost()) mpSend({ t: 'lw-ctrl', op: 'patch', data: { kamera: true, t: C.ctrl.warn } }); } });
  }
  // Abblenden, Ludwig steht wieder im Zimmer am Fenster (der Rucksack bleibt dabei, bei „erwischt“ nimmt Mama ihn mit)
  function bringHome(then) {
    const f = $('lwFade'); f.style.transition = 'opacity .3s ease'; f.classList.add('on'); C.mode = 'wait'; C.wclimb = null;
    setTimeout(() => { if (!C.on || !C.S) return; setArea('zimmer'); C.W.win.hinge.rotation.y = 0; Object.assign(C.me, { x: WX, z: ROOM.z0 + 1.1, yaw: Math.PI, pitch: -0.05, vx: 0, vz: 0, gy: 0 }); C.mode = 'walk'; f.classList.remove('on'); C.dirty = true; if (then) then(); }, 380);
  }
  // Tiefgarage <-> Straße (Abblenden)
  function garageMove(dir) {
    if (C.mode !== 'walk') return; const f = $('lwFade'); f.style.transition = 'opacity .3s ease'; f.classList.add('on'); C.mode = 'wait'; snd.step(1); snd.gate(); // Rolltor der Tiefgarage
    setTimeout(() => { if (!C.on || !C.S) return; if (dir === 'down') { setArea('bunker'); snd.bunkerIn(); unpack(); Object.assign(C.me, { x: BUNKER.x + GARAGE.x1 - 1.8, z: BUNKER.z + 6.5, yaw: Math.PI / 2, pitch: -0.05, vx: 0, vz: 0, gy: 0 }); enteredBunker(); } else { setArea('draussen'); Object.assign(C.me, { x: GATE.x, z: GATE.z - 1.1, yaw: 0, pitch: -0.05, vx: 0, vz: 0, gy: groundY(GATE.x, GATE.z - 1.1) }); }
      C.mode = 'walk'; f.classList.remove('on'); C.dirty = true; save(); }, 380);
  }
  function enteredBunker() { const S = C.S; if (!S.bunker.started) { S.bunker.started = true; bunkerChat(S, 'kumpels', 'Grün', 'Willkommen im Bunker! Hier ist ja noch gar nichts. Aufträge kommen gleich über den PC.'); setTimeout(() => { if (C.on) toast('Der Bunker. Noch leer: Maschinen schaltest du im Boss-Plan frei und kaufst sie am Gaming-PC im Shop, aufgebaut werden sie hier. Aufträge kommen am Bunker-PC.', 6200); }, 900); } }

  // ---------------- Ludwig (nur in der Übersicht zu sehen) ----------------
  function poseLudwig() {
    const p = LP; const s = SEATS[1]; p.x = s.x; p.y = 0.6 + Math.sin(C.t * 1.5) * 0.003; p.z = s.z + 0.02; p.yaw = Math.PI; p.lean = 0.3; p.slump = 0.06; p.twist = 0; p.headPitch = 0.55; p.headYaw = Math.sin(C.t * 0.4) * 0.08;
    for (const [k, sg] of [['L', -1], ['R', 1]]) { const h = p.hands[k]; h.wrist.set(s.x + sg * 0.15, TABLE_Y + 0.03, s.spot.z + 0.16); h.F.set(0, -0.25, -1).normalize(); h.P.set(0, -1, 0); h.grip = 0.45; const ft = p.feet[k]; ft.ankle.set(s.x + sg * 0.13, 0.09, s.z - 0.42); ft.toe.set(s.x + sg * 0.14, 0.02, s.z - 0.55); }
    p.armPole = { L: V3(-0.6, -1, 0.3), R: V3(0.6, -1, 0.3) }; p.legPole = { L: V3(-0.15, 1, -0.6), R: V3(0.15, 1, -0.6) }; C.W.ludwig.pose(C.W.space, p);
  }
  const TABLE_Y = 0.76;
  function capGain(S, k, before) { const got = S[k] - before; if (got <= 0) return; S[k] = before; addMatCapped(S, k, got); }

  // ---------------- Kamera und Bild ----------------
  function camTarget(outPos, outLook) {
    if (C.mode === 'cine' && C.cineCam) { outPos.copy(C.cineCam.p); outLook.copy(C.cineCam.l); return C.cineCam.f; }
    if (C.ui === 'pc') { outPos.set(-2.6, 1.09, -0.9); outLook.set(-3.4, 1.075, -0.9); return 50; }
    if (C.ui === 'bpc') { outPos.set(BUNKER.x + BPC.x, 1.08, BUNKER.z + BPC.z + 0.55); outLook.set(BUNKER.x + BPC.x, 1.03, BUNKER.z + BPC.z - 0.3); return 50; } // Bunker-PC
    if (C.mode === 'wclimb' && C.wclimb) return wclimbCam(outPos, outLook);
    if (C.mode === 'climb' && C.climb) return climbCam(outPos, outLook); // am PC: Kamera fährt an den Monitor
    if (C.mode === 'menu') { const z = VIEWS.zimmer; outPos.set(...z.pos); outLook.set(...z.look); return z.fov; }
    if (C.mode === 'sit') { const v = seatView(C.seat); outPos.set(...v.pos); outLook.set(...v.look); return v.fov; }
    eyePos(outPos); outLook.set(outPos.x - Math.sin(C.me.yaw) * Math.cos(C.me.pitch), outPos.y + Math.sin(C.me.pitch), outPos.z - Math.cos(C.me.yaw) * Math.cos(C.me.pitch)); return 70;
  }
  function camTick(dt) {
    const tp = V3(); const tl = V3(); const fov = camTarget(tp, tl);
    if (C.camT < 1 && C.camFrom) { C.camT = Math.min(1, C.camT + dt / 0.75); const e = ease(C.camT); camPos.lerpVectors(C.camFrom.pos, tp, e); camLook.lerpVectors(C.camFrom.look, tl, e); C.cam.fov = lerp(C.camFrom.fov, fov, e); } else { camPos.copy(tp); camLook.copy(tl); C.cam.fov = fov; }
    C.cam.position.copy(camPos); C.cam.lookAt(camLook); C.cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); if (C.cam.aspect < 1.3) C.cam.fov = C.cam.fov * 1.3 / C.cam.aspect; C.cam.updateProjectionMatrix(); C.cam.updateMatrixWorld();
    if (C.knockT > 0) C.knockT -= dt; for (const pn of C.W.win.panes) { if (pn.userData.z0 === undefined) pn.userData.z0 = pn.position.z; pn.position.z = pn.userData.z0 + (C.knockT > 0 ? Math.sin(C.knockT * 90) * 0.002 : 0); }
    { const parts = C.S && C.mode === 'walk' ? heldShares(C.S) : []; const key = parts.map(([k, s]) => k + s).join(','); if (key !== C.heldN) { C.heldN = key; layoutHeld(parts); } } // was in der Hand ist, unten rechts im Bild (je Sorte)
    if (C.mode !== 'cine') RA.kamera(C.cam); // Husten wackelt
  }
  function frame(dt, tAbs) {
    if (!C.on || !C.W) return; const real = Math.min(dt, 0.05); C.t += real; const S = C.S;
    if (C.mode === 'cine') { C.story.step(real); if (S) RA.tick(real, false); }
    else if (S) {
      const run = !!C.mp || ((!C.ui || C.ui === 'phone') && !tour.open && !C.finaleOn); // mit dem Handy in der Hand läuft die Welt weiter; im Mehrspieler läuft sie immer
      if (run) {
        if (!C.ctrl && !isClient()) { // Mitspieler: die Welt läuft nur beim Gastgeber
          for (const ev of tick(S, real)) { if (isHost()) mpEvent('tick', ev); if (ev.k === 'kunde') { preloadCust(ev.c); if (ev.c.bruno) toast('Es klopft am Fenster. Das ist Bruno!'); } else if (ev.k === 'weg') { if (C.vis && C.vis.id === ev.c.id) C.vis.say = ev.text; snd.leave(); custSay(ev.c, ev.say); toast(`${ev.c.name} ist weg.`); } C.dirty = true; }
          const ce = tickEltern(S, real * (C.fast ? 30 : 1) * elternFaktor(S) * elternMul(S)); /* nachts seltener, beim Einkaufen gar nicht */ if (ce && ce.skip) { toast(`${ce.who === 'mama' ? 'Mama' : 'Papa'} wollte kontrollieren, wurde aber abgelenkt. Glück gehabt!`, 3200); C.dirty = true; } else if (ce) startCtrl(ce);
          if (!C.ctrl) ereignisTick(real); // Ereignisse (2026-11-22)
        } else ctrlTick(real);
        // Boss-Plan: Maschinen, Nachschub, Boten. Bildschirmzeit läuft nur bei offenem Handy.
        const au = isClient() ? {} : tickAuto(S, real * (C.fast ? 30 : 1)); if (au.made || au.sold || au.tabak || au.papier) { C.dirty = true; C.autoCash = (C.autoCash || 0) + au.cash; C.autoResp = (C.autoResp || 0) + au.resp; }
        if ((C.autoT = (C.autoT || 0) + real) > 4) { C.autoT = 0; if (C.autoCash > 0) { gain('+' + euro(C.autoCash)); snd.coin(2); } if (C.autoResp > 0) respPop(C.autoResp); C.autoCash = 0; C.autoResp = 0; }
        if (!isClient()) { const p0 = S.papier; const t0 = S.tabak; const evs = tickBunker(S, real * (C.fast ? 30 : 1)); capGain(S, 'papier', p0); capGain(S, 'tabak', t0); for (const e of evs) { bunkerEvent(e); if (isHost()) mpEvent('bunker', e); } } // Bunker-Nachschub nur, solange die Materialkiste Platz hat
        if (!isClient()) for (const e of tickWelt(S, real * (C.fast ? 30 : 1))) { weltEvent(e); if (isHost()) mpEvent('welt', e); } if (C.AU) C.AU.moveCars(real, C.t); applyDay();
        if (C.AU && C.area !== 'bunker') C.AU.erwin.update(C.t, real, C.me.x, C.me.z, erwinOpen(clock(S).h)); // Erwins Laden: Tür, Fernseher, Erwin
        if (C.AU) { // Geräusche je Ort (seit 2026-11-21): Türgong bei Erwin, Tauben flattern, Umgebung (Bunker, Stadt, Brunnen)
          const BRN = C.AU.brunnen; const dr = C.AU.erwin.state.door; if (C.area !== 'bunker' && C.erDoor !== undefined && dr > 0.02 && C.erDoor <= 0.02) snd.chime(); if (C.area !== 'bunker') C.erDoor = dr;
          const fc = BRN.flyCount(); if (C.flyN !== undefined && fc > C.flyN && C.area === 'draussen') snd.flutter(fc - C.flyN); C.flyN = fc;
          snd.place(real, C.area, { day: BRN.isDay(), fountain: C.area === 'draussen' ? Math.hypot(C.me.x - BRN.at.x, C.me.z - BRN.at.z) : 99, mute: C.mode === 'cine' });
        }
        const se = tickScreen(S, real, C.ui === 'phone' && phone.isOpen); if (se === 'leer' && C.ui === 'phone') phone.limit(); else if (se === 'voll') toast(`Bildschirmzeit wieder voll: ${Math.round(screenLimit(S))} Sekunden.`);
        if (S.respekt > 0 && !S.flags.phoneHint && C.mode !== 'cine') { S.flags.phoneHint = true; setTimeout(() => { if (C.on) toast('Respekt bekommen! Drück T: Handy raus, Boss-Plan öffnen.', 4200); }, 1800); }
        if (C.anim) { C.anim.t += real; if (C.anim.t >= C.anim.dur) endRoll(); }
        if (C.mode === 'walk') walk(real); if (C.mode === 'climb') climbTick(real); visTick(real); giveTick(real); if (C.mode === 'wclimb') wclimbTick(real); camWatch(real); if (S.parrest > 0) S.parrest = Math.max(0, S.parrest - real);
      }
      kumpelsTick(real, run); if (!C.ctrl && subT > 0) { subT -= real; if (subT <= 0) $('lwSub').classList.add('hidden'); }
      if (C.ui === 'phone') phone.tick(real); if (C.ui === 'bpc') bpc.tick(real); if (C.ui === 'werk') werk.tick(real);
      RA.tick(real, run);
      PA.tick(real, run);
      T3.tick(real, run);
      RD.tick(real, run); ST.tick(real);
      if (C.dunkelT > 0 && run) C.dunkelT -= real; dunkel.classList.toggle('hidden', !(C.dunkelT > 0) || C.area === 'bunker');
      C.target = targets(); hoverTick(real); if (C.EG) C.EG.update(C.t, real, C.me.x, C.me.z, C.area); propsTick(); rollUiTick(); quests.show(C.mode !== 'menu' && C.mode !== 'cine' && (!C.ui || C.ui === 'phone')); inv.pockets(S, (C.mode === 'walk' || C.mode === 'sit') && (!C.ui || C.ui === 'phone')); if (!C.noQuests) quests.tick(real);
      if ((C.saveT += real) > 5) { C.saveT = 0; save(); }
      if (C.dirty || (C.uiT = (C.uiT || 0) + real) > 0.25) { C.uiT = 0; refresh(); }
      winTick(); promptTick(); bubbleTick();
    }
    if (C.mp && C.S) { mpTick(real); mpAvatars(real); } // Mehrspieler: Änderungen, Stände, Posen
    if (C.mode === 'menu') poseLudwig();
    if (C.toastT > 0) { C.toastT -= real; if (C.toastT <= 0) $('lwToast').classList.remove('on'); }
    C.W.update(C.t, C.S ? clock(C.S).h : 20); bunkerVisuals(real); camTick(real); render();
  }
  function render() { const dpr = Math.max(0.4, Math.min(2.5, Math.min(window.devicePixelRatio || 1, 1.5) * (settings.ludwigRes || 1))); if (renderer.getPixelRatio() !== dpr) { renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false); } renderer.shadowMap.needsUpdate = !!settings.shadows; renderer.render(C.W.scene, C.cam); }

  // ---------------- Mehrspieler (seit 2026-11-21, Lennox: „zu viert, alles gebalanced“) ----------------
  // Gastgeber = Ludwig (Sitz 1), Mitspieler = Rot, Gelb, Grün (Sitze 0, 2, 3). Der Gastgeber hat den echten Spielstand und lässt die Welt laufen, Mitspieler spielen auf einer
  // Kopie und schicken alle 100 ms ihre Änderungen (ludwigmp.js). Posen zehnmal pro Sekunde; Ereignisse (Kunden, Polizei, Bunker) und die Elternkontrolle gehen vom Gastgeber
  // an alle. Mama kommt für alle; Mitspieler im Zimmer verstecken sich selbst (Schrank, Bett), wer draußen erwischt wird, kommt allein in Hausarrest (S.parrest).
  function isClient() { return !!(C.mp && !C.mp.host); }
  function isHost() { return !!(C.mp && C.mp.host); }
  function mpName(id) { const mp = C.mp; if (!mp) return 'Jemand'; if (id === 'host') return mp.hostName || 'Ludwig'; if (mp.host) { const r = mp.players.get(id); return r ? r.name : 'Jemand'; } return (mp.names && mp.names[id]) || 'Jemand'; }
  function mpSend(m) { const mp = C.mp; if (!mp || !mp.net) return; if (mp.host) mp.net.broadcast(m); else mp.net.send(m); }
  function mpStart({ net, host, slot, intro }) {
    if (C.on) stop(); open(); C.mp = { net, host: !!host, me: host ? 'host' : (net.me && net.me.id) || 'p?', hostName: host ? (net.me && net.me.name) || 'Ludwig' : net.hostName || 'Ludwig', seat: host ? 1 : -1, players: new Map(), poses: new Map(), names: {}, sendT: 0, poseT: 0, evq: [], intro: !!intro, sync: null };
    if (host) { if (!slot || !saves.get(slot)) slot = saves.last() && saves.get(saves.last()) ? saves.last() : saves.create('Ludwigs Zimmer'); begin(slot); C.mp.sync = createHostSync(); C.S.mpN = 1; C.rollSeat = 1; C.tuerOffen = null; for (const p of net.players) if (!p.host) mpJoined(p.id, p.name, false); toast(`Mehrspieler: Du bist ${SEAT_NAME[C.mp.seat]}.${C.mp.players.size ? '' : ' Die anderen können jederzeit beitreten.'}`, 3600); return; }
    hud.classList.remove('lw-menu'); if (bday.open) bday.hide(); C.S = null; C.mode = 'wait'; toast(`Verbinde mit ${C.mp.hostName} …`, 8000);
  }
  function mpStop(text, reopen = true) { const mp = C.mp; if (!mp) return; if (mp.host && C.S) for (const r of mp.players.values()) returnPlayer(C.S, r.P); C.mp = null; C.hiddenSpot = null; mpHideAll(); if (C.on && reopen) stop(); /* die Lobby zeigt dahinter den Startbildschirm */ if (text) toast(text, 4200); }
  function mpJoined(id, name, late = true) { // nur Gastgeber: Sitz geben, leere Taschen, den ganzen Stand schicken
    const mp = C.mp; if (!mp || !mp.host || !C.S) return; let r = mp.players.get(id);
    if (!r) { const platz = platzFuer(mp.hostName, mp.seat, [...mp.players.values()].map((q) => q.seat), name); const { seat } = platz; if (seat < 0) { mp.net.sendTo(id, { t: 'lw-full' }); return; } hostPlatz(platz.host); r = { id, name, seat, P: newPlayer(C.S), ack: 0, ackSent: -1, hidden: null }; mp.players.set(id, r); }
    C.S.mpN = 1 + mp.players.size; mp.sync.forget(id); if (late) mp.net.sendTo(id, { t: 'start', mode: 'ludwig' }); // spät dazu: erst ins Spiel holen, dann der Stand
    mp.net.sendTo(id, { t: 'lw-st', full: true, keys: mp.sync.snapshot(C.S, id, r.P, true), ack: r.ack, seat: r.seat }); r.ackSent = r.ack;
    toast(`${name} ist dabei (${SEAT_NAME[r.seat]}).`, 3200); C.dirty = true;
  }
  function mpLeft(id) { const mp = C.mp; if (!mp || !mp.host) return; const r = mp.players.get(id); if (!r) return; if (C.S) { returnPlayer(C.S, r.P); for (const c of C.S.queue) if (c.by === id) delete c.by; } mp.players.delete(id); mp.poses.delete(id); mp.sync.forget(id); if (C.S) C.S.mpN = 1 + mp.players.size; mpHideFig(r.seat); if (r.seat === 1) hostPlatz(1); /* ohne Ludwig ist es wieder der Gastgeber */ toast(`${r.name} ist gegangen. Die Taschen sind zurück in der Box.`, 3200); C.dirty = true; }
  function mpMessage(from, m) {
    const mp = C.mp; if (!mp || !m) return;
    if (mp.host) {
      const r = mp.players.get(from); if (!r) return;
      if (m.t === 'lw-d') { if (C.S) { for (const x of m.list || [{ seq: m.seq, d: m.d }]) { if ((x.seq | 0) <= r.ack) continue; applyFromClient(C.S, r.P, x.d); r.ack = x.seq | 0; } C.dirty = true; } return; } // in Reihenfolge, doppelt Geschicktes nur einmal
      if (m.t === 'lw-pose') { mp.poses.set(from, m.p || {}); return; }
      if (m.t === 'lw-hide') { hideItem(m.k); return; }
      if (m.t === 'lw-hideme') { r.hidden = m.spot || null; return; }
      if (m.t === 'lw-tuer') { if (C.S && r.seat === 1 && C.tuerOffen && m.id === C.tuerOffen) { C.tuerOffen = null; tuerWahl(C.S, m.id, Number.isInteger(m.i) ? m.i : -1); C.dirty = true; save(); } return; }
      if (m.t === 'lw-ctrlreq') { if (C.S && !C.ctrl) startCtrl({ who: m.who === 'papa' ? 'papa' : 'mama', first: false }); return; }
      return;
    }
    if (m.t === 'lw-st') { mpState(m); return; }
    if (m.t === 'lw-poses') { const ids = new Set(); for (const p of m.list || []) { ids.add(p.id); mp.names[p.id] = p.name; if (p.id !== mp.me) mp.poses.set(p.id, p); } for (const id of [...mp.poses.keys()]) if (!ids.has(id)) mp.poses.delete(id); return; }
    if (m.t === 'lw-ev') { for (const e of m.list || []) mpEventIn(e); return; }
    if (m.t === 'lw-ctrl') { mpCtrlIn(m); return; }
    if (m.t === 'lw-full') toast('Ludwigs Zimmer ist voll: vier Spieler sind schon da.', 4200);
  }
  function mpState(m) { // Mitspieler: erster Stand startet das Spiel, danach nur neu aufbauen (eigene, noch unbestätigte Aktionen bleiben)
    const mp = C.mp; if (!mp) return;
    if (!C.S) { const S = Object.assign(newSave(), assemble(m.keys)); S.parrest = 0; C.S = S; mp.sync = createClientSync(S); mp.seat = m.seat; C.rollSeat = m.seat; mpBeginClient(mp.intro && !S.introSeen); return; }
    mp.sync.receive(C.S, m.keys, m.ack | 0, !!m.full); C.dirty = true;
    if (C.AU && Object.keys(m.keys || {}).some((k) => k.startsWith('welt'))) { C.AU.syncPark(C.S.welt.park); C.AU.setNachbar(C.S.welt.nbOut); }
  }
  function placeAtSeat() { const s = SEATS[C.mp && C.mp.seat >= 0 ? C.mp.seat : 1]; const [px, pz] = seatAt(s, 0.55); Object.assign(C.me, { x: px + s.tz * 0.3, z: pz - s.tx * 0.3, yaw: Math.atan2(-s.tx, -s.tz), pitch: -0.2, vx: 0, vz: 0, bob: 0, moving: 0 }); [C.me.x, C.me.z] = collide(C.me.x, C.me.z); }
  function mpBeginClient(intro) {
    C.slot = null; RA.reset(); RD.reset(); ST.stop(); C.dunkelT = 0; vorladen(); primeQuests(C.S); quests.reset(); C.pickT = 0; C.anim = null; C.queued = 0; C.giveA = null; C.deal = null; C.seat = -1; $('lwFinale').classList.add('hidden'); C.finaleOn = false;
    for (const f of C.W.customers) f.root.visible = false; C.vis = null; C.W.win.hinge.rotation.y = 0; C.W.stash.set(C.S.up.box, C.S.kippen); setArea('zimmer'); C.climb = null; C.truckQ = 0; C.wclimb = null; $('lwFade').classList.remove('on');
    if (C.AU) { C.AU.reset(); C.AU.setNachbar(C.S.welt.nbOut); C.AU.syncPark(C.S.welt.park); C.AU.fam.setAway(C.S.welt.weg > 0); } C.dayL = undefined; C.ctrlReset(); placeKumpels(); audio.init(); snd.ensure(); snd.ambience(true); snd.preload(Object.keys(VOICE));
    placeAtSeat(); if (intro) { C.replay = true; startIntro(true); return; } setMode('walk'); C.dirty = true; toast(`Du bist ${SEAT_NAME[C.mp.seat]}. Dein Platz am Tisch: hinschauen und E.`, 4600);
  }
  function mpTick(dt) {
    const mp = C.mp; if (!mp || !C.S || (!mp.host && !mp.sync)) return; mp.sendT += dt; mp.poseT += dt;
    if (mp.poseT >= 0.1) { mp.poseT = 0; const me = mpMyPose();
      if (mp.host) { const list = [{ ...me, id: 'host', name: mp.hostName, home: mp.seat }]; for (const [id, r] of mp.players) { const p = mp.poses.get(id); list.push(p ? { ...p, id, name: r.name, home: r.seat, hid: !!r.hidden || !!p.hid } : { id, name: r.name, home: r.seat, area: 'zimmer', mode: 'wait', x: 0, z: 0, yaw: 0, seat: -1, mv: 0, hid: true }); } mp.net.broadcast({ t: 'lw-poses', list }); }
      else mp.net.send({ t: 'lw-pose', p: me }); }
    if (mp.sendT >= 0.1) { mp.sendT = 0;
      if (mp.host) { for (const [id, r] of mp.players) { const keys = mp.sync.snapshot(C.S, id, r.P); if (Object.keys(keys).length || r.ack !== r.ackSent) { r.ackSent = r.ack; mp.net.sendTo(id, { t: 'lw-st', keys, ack: r.ack }); } } if (mp.evq.length) { mp.net.broadcast({ t: 'lw-ev', list: mp.evq }); mp.evq = []; } }
      else { const list = mp.sync.take(C.S); if (list) mp.net.send({ t: 'lw-d', list }); } }
  }
  function mpMyPose() { const a = C.anim; const r2 = (v) => Math.round((v || 0) * 100) / 100; return { x: r2(C.me.x), z: r2(C.me.z), yaw: r2(C.me.yaw), area: C.area, mode: C.mode === 'sit' ? 'sit' : (C.mode === 'cine' || C.mode === 'wait' || C.mode === 'menu') ? 'cine' : 'walk', seat: C.mode === 'sit' ? C.seat : -1, mv: Math.round((C.me.moving || 0) * 10) / 10, hid: !!C.hiddenSpot, raucht: RA.raucht || PA.zieht, rad: PA.fahrt, anim: a ? { step: a.step, t: r2(clamp(a.t / Math.max(a.dur, 1e-3), 0, 1)), sorte: a.sorte } : null }; }
  function mpEvent(src, e) { const mp = C.mp; if (!mp || !mp.host) return; try { mp.evq.push({ ...JSON.parse(JSON.stringify(e)), src }); } catch (er) { /* nicht verschickbar */ } }
  function mpEventIn(e) { // Mitspieler: was beim Gastgeber passiert ist (Ton, Meldung, Bild); der Stand selbst kommt mit dem nächsten Stand
    if (!C.S) return; const wer = e.who === 'papa' ? 'Papa' : 'Mama';
    if (e.src === 'tick') { if (e.k === 'kunde' && e.c) { preloadCust(e.c); if (e.c.bruno) toast('Es klopft am Fenster. Das ist Bruno!'); } else if (e.k === 'weg' && e.c) { if (C.vis && C.vis.id === e.c.id) C.vis.say = e.text; snd.leave(); custSay(e.c, e.say); toast(`${e.c.name} ist weg.`); } return; }
    if (e.src === 'welt') { if (e.k === 'polizei') C.AU.police.start(e.dir); else if (e.k === 'einkauf') { C.AU.fam.leave(); toast(`${wer} ist einkaufen gefahren. Eine Weile kontrolliert keiner.`, 3600); } else if (e.k === 'zurueck') C.AU.fam.arrive(() => { if (C.on) toast(`${wer} ist zurück vom Einkaufen!`, 3000); }); else if (e.k === 'nachbar') C.AU.setNachbar(e.out); else if (e.k === 'parkKunde' || e.k === 'parkWeg') C.AU.syncPark(C.S.welt.park); return; }
    if (e.src === 'bunker') bunkerEvent(e);
    if (e.src === 'ereignis') ereignisZeig(e);
  }
  function mpCtrlIn(m) { // Mitspieler: die Elternkontrolle läuft beim Gastgeber, hier nur mit
    if (m.op === 'start') { if (C.S && !C.ctrl && C.mode !== 'cine') { startCtrl(m.ev || { who: 'mama' }); if (C.ctrl) C.ctrl.follow = true; } return; }
    const c = C.ctrl; if (!c) return;
    if (m.op === 'patch') Object.assign(c, m.data || {}); else if (m.op === 'hid') hideItem(m.k, true); else if (m.op === 'res') c.hostRes = m.res; else if (m.op === 'done') c.hostDone = { taken: m.taken || {} };
  }
  // ---- Wer ist Ludwig? Platz 1 (seit 2026-11-22 nach dem Namen, nicht mehr immer der Gastgeber)
  function binLudwig() { return !C.mp || C.mp.seat === 1; }
  function ludwigPose() { if (binLudwig()) return null; for (const [id, p] of C.mp.poses) if ((C.mp.host ? (C.mp.players.get(id) || {}).seat : p.home) === 1) return p; return null; }
  function ludwigP() { if (!isHost() || binLudwig()) return null; for (const r of C.mp.players.values()) if (r.seat === 1) return r.P; return null; } // Ludwigs Taschen, wenn ein Mitspieler Ludwig ist
  function hostPlatz(seat) { const mp = C.mp; if (!mp || mp.seat === seat) return; if (C.mode === 'sit') standUp(); C.anim = null; if (seat === 1 && C.hiddenSpot) unhideMe(); mp.seat = seat; C.rollSeat = seat; C.dirty = true; toast(`Du bist jetzt ${SEAT_NAME[seat]}.`, 4200); }
  function mpGuests() { if (!isHost()) return null; const gesehen = { caught: true, seen: ['kumpel'], spot: null, kumpel: true }; if (!binLudwig() && C.area === 'zimmer' && C.mode !== 'cine' && !C.hiddenSpot) return gesehen; for (const r of C.mp.players.values()) { if (r.seat === 1) continue; const p = C.mp.poses.get(r.id); if (p && p.area === 'zimmer' && p.mode !== 'cine' && !r.hidden) return gesehen; } return null; } // ein Kumpel steht sichtbar im Zimmer (Ludwig darf)
  function mpKumpelIn(c) { if (!isHost()) return c.kumpelIn; const k = { ...c.kumpelIn }; if (C.hiddenSpot) k[C.hiddenSpot] = true; for (const r of C.mp.players.values()) if (r.hidden) k[r.hidden] = true; return k; } // wo sich Mitspieler versteckt haben (Mama schaut manchmal nach)
  function ctrlArea() { if (binLudwig()) return C.area; const p = ludwigPose(); return p ? p.area : 'zimmer'; } // die Eltern reden mit Ludwig
  function ctrlMe() { if (binLudwig()) return C.me; const p = ludwigPose(); return p && Number.isFinite(p.x) ? p : C.me; }
  function hideMe(spot) { const c = C.ctrl; const h = HIDE[spot]; if (!c || c.phase !== 'warn' || binLudwig() || C.hiddenSpot || !h) return; C.hiddenSpot = spot; Object.assign(C.me, { x: clamp(h.x + (spot === 'bett' ? -0.55 : 0.45), ROOM.x0 + R, ROOM.x1 - R), z: clamp(h.z + (spot === 'bett' ? 0 : 0.45), ROOM.z0 + R, ROOM.z1 - R), vx: 0, vz: 0 }); snd.hide(); toast(spot === 'schrank' ? 'Du hockst im Schrank. Nicht bewegen, bis Mama weg ist!' : 'Du liegst unterm Bett. Ganz still, bis Mama weg ist!', 3600); mpSend({ t: 'lw-hideme', spot }); }
  function unhideMe() { C.hiddenSpot = null; mpSend({ t: 'lw-hideme', spot: null }); }
  function personalCatch(text) { if (C.ui) closeUI(); C.AU.resetWatch(); C.AU.reset(); $('lwCam').classList.add('hidden'); snd.sting(); C.S.parrest = 60; toast(`${text} Ab nach Hause: 60 Sekunden Hausarrest (nur du).`, 4000); bringHome(); }
  function polizeiMP(S) { const q = S.queue; const v = S.stats.verpasst; const a = S.eltern.arrest; const er = S.eltern.erwischt; const t = polizeiKontrolle(S); S.queue = q; S.stats.verpasst = v; S.eltern.arrest = a; S.eltern.erwischt = er; S.parrest = 60; return t; } // Taschen, Rucksack, Strafe wie immer, aber Kunden und Hausarrest der anderen bleiben
  function mpProps(a, hidden, mine, sid) { // Dreh-Sachen: mein Platz wie immer, die Plätze der anderen nach ihren Posen
    const W = C.W; const S = C.S; const remote = {}; for (const [id, p] of C.mp.poses) { if (id === C.mp.me || p.mode !== 'sit' || !(p.seat >= 0)) continue; remote[p.seat] = p; }
    for (let i = 0; i < SEATS.length; i++) {
      if (i === mine) { if (sid !== 'kippe' && !hidden) { C.SA.render(i, sid, SORTEN[sid], a, stepOf(S, sid), S, SEATS[i], S.up.box); continue; } C.SA.hide(i); renderSeat(i, hidden ? null : a, hidden ? 0 : a ? a.step + 1 : S.roll); continue; }
      const p = remote[i]; const ra = p && p.anim ? { step: p.anim.step, t: p.anim.t, dur: 1, seat: i, slot: S.kippen, sorte: p.anim.sorte || 'kippe' } : null;
      if (ra && ra.sorte !== 'kippe' && !hidden && SORTEN[ra.sorte]) { C.SA.render(i, ra.sorte, SORTEN[ra.sorte], ra, ra.step, S, SEATS[i], S.up.box); continue; }
      C.SA.hide(i); renderSeat(i, hidden ? null : ra, hidden || !ra ? 0 : ra.step + 1);
    }
    W.stash.set(S.up.box, S.kippen - (a && a.sorte === 'kippe' && a.last ? 1 : 0)); C.SA.stashSet(S.up.box, S, a && a.sorte !== 'kippe' && a.last ? a.sorte : null);
  }
  // Figuren der anderen: Gastgeber als eigene Ludwig-Figur, Mitspieler als Rot, Gelb, Grün; Namensschild darüber
  const mpFigs = {}; const mpLabels = {}; const SEAT_COL = { 0: '#ff6a5a', 1: '#8fd0ff', 2: '#ffd24a', 3: '#7affb8' };
  function figFor(home) { if (home === 1) { if (!mpFigs[1]) { mpFigs[1] = createPerson(C.W.scene, LUDWIG_LOOK); mpFigs[1].setVisible(false); } return mpFigs[1]; } const k = SEAT_KEY[home]; return k ? C.W.cast[k] : null; }
  function labelFor(home, name) {
    let L = mpLabels[home]; if (L && L.name === name) return L.sp;
    if (!L) { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(0.8, 0.2, 1); sp.renderOrder = 5; C.W.scene.add(sp); L = mpLabels[home] = { c, tex, sp, name: '' }; }
    const x = L.c.getContext('2d'); x.clearRect(0, 0, 256, 64); x.fillStyle = 'rgba(10,12,16,.62)'; x.beginPath(); x.roundRect(8, 10, 240, 44, 16); x.fill(); x.fillStyle = SEAT_COL[home] || '#fff'; x.font = '700 28px Bahnschrift, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(name || '').slice(0, 14), 128, 33); L.tex.needsUpdate = true; L.name = name; return L.sp;
  }
  function mpHideFig(home) { PA.fremdWeg(home); const P = home === 1 ? mpFigs[1] : SEAT_KEY[home] ? C.W.cast[SEAT_KEY[home]] : null; if (P && P.visible) P.setVisible(false); if (mpLabels[home]) mpLabels[home].sp.visible = false; }
  function mpHideAll() { for (const h of [0, 1, 2, 3]) mpHideFig(h); }
  function mpAvatars(dt) {
    const mp = C.mp; if (!mp || !C.W || C.mode === 'cine') return; const shown = new Set();
    for (const [id, p] of mp.poses) {
      if (id === mp.me) continue; const home = mp.host ? (mp.players.get(id) || {}).seat : p.home; if (!(home >= 0)) continue; const P = figFor(home); if (!P) continue;
      const vis = p.mode !== 'cine' && p.mode !== 'wait' && !p.hid && ((C.area === 'bunker') === (p.area === 'bunker')); if (!vis) continue; shown.add(home);
      const fy = (p.yaw || 0) + Math.PI; if (!P.visible) { P.setVisible(true); P.place(p.x, 0, p.z, fy); }
      if (p.mode === 'sit' && SEATS[p.seat]) { const s = SEATS[p.seat]; const [px, pz] = seatAt(s, -0.08); P.place(px, 0, pz, s.face); P.mode = 'sit'; P.seat = 0.47; P.act = p.anim ? 'piano' : 0; P.lookAt = V3(s.spot.x, TABLE_Y, s.spot.z); }
      else { const far = Math.hypot(p.x - P.x, p.z - P.z) > 3; const k = far ? 1 : Math.min(1, dt * 10); let dy = fy - P.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; const gy = p.area === 'draussen' ? groundY(p.x, p.z) : 0; P.place(P.x + (p.x - P.x) * k, gy, P.z + (p.z - P.z) * k, P.yaw + dy * k); P.mode = p.mv > 0.3 ? 'walk' : 'stand'; P.speed = p.mv || 0; P.act = 0; P.lookAt = null;
        if (p.area === 'draussen' && p.rad === 'rad') { P.mode = 'sit'; P.seat = 0.82; P.act = 'rad'; } else if (p.area === 'draussen' && p.rad === 'roller') { P.mode = 'stand'; P.act = 'lenker'; } }
      PA.fremd(home, P, p, dt);
      P.update(dt, C.t); if (p.raucht) RA.fremd(id, P, dt); const L = labelFor(home, (mp.host ? (mp.players.get(id) || {}).name : p.name) || SEAT_NAME[home]); L.visible = true; L.position.set(P.x, (P.y || 0) + (P.mode === 'sit' && P.act !== 'rad' ? 1.85 : 2.28), P.z);
    }
    for (const h of [0, 1, 2, 3]) if (!shown.has(h)) mpHideFig(h);
  }

  // Für Tests
  const debug = {
    fast: (on = true) => { C.fast = on; }, roll: () => tryRoll(), sit: (i = 1) => { if (C.mode === 'sit') standUp(); C.mode = 'walk'; sitDown(i); }, stand: standUp, interact, target: () => C.target,
    goTo: (x, z, yaw = 0, pitch = 0) => { Object.assign(C.me, { x, z, yaw, pitch, vx: 0, vz: 0 }); }, lookAt: (x, y, z) => { const e = eyePos(V3()); C.me.yaw = Math.atan2(-(x - e.x), -(z - e.z)); C.me.pitch = Math.atan2(y - e.y, Math.hypot(x - e.x, z - e.z)); },
    hold: (code, on) => { C.keys[code] = !!on; }, rollFull: () => { const n = SORTEN[C.S.sorte || 'kippe'].steps.length; for (let i = 0; i < n; i++) { if (C.anim) endRoll(); startRoll(); if (C.anim) { C.anim.t = C.anim.dur; endRoll(); } } }, sorte: (id) => chooseSort(id), eggs: () => C.EG, outline: () => C.OL, hover: () => C.hoverKey, excuse: (c) => excuseFor(c || {}), caughtLine, held: () => C.heldN, heldVisible: () => Object.fromEntries(Object.entries(C.heldPool || {}).map(([k, a]) => [k, a.filter((m) => m.visible).length]).filter(([, n]) => n > 0)), quests: () => quests, inv, openInv, KI: () => C.KI, bday, werk, WB: () => C.WB, useCode, snd, questsOff: (on = true) => { C.noQuests = on; }, SA: () => C.SA,
    noKumpel: (on = true) => { C.noKumpel = on; }, skipIntro: () => { if (C.story && C.story.on) C.story.end(true); }, story: () => C.story, startCtrl: (who = 'mama', first = false) => startCtrl({ who, first }), ctrl: () => C.ctrl, hideItem, endWarn: () => { if (C.ctrl) C.ctrl.t = C.ctrl.warn; }, kumpel: () => C.kumpel,
    pc, deal: () => C.deal, setDeal: (n, preis) => { if (C.deal) { C.deal.n = n; C.deal.preis = preis; renderDeal(); } }, offer: dealOffer, openUI, closeUI, vis: () => C.vis, cam: () => ({ pos: camPos.toArray(), look: camLook.toArray() }), snd,
    bunker: () => C.S && C.S.bunker, area: () => C.area, buyMachine: (id) => { const S = C.S; S.geld += 1e8; const r = buyMachine(S, id); S.geld -= 1e8; C.dirty = true; return !!r.ok; }, skill: (id) => { const S = C.S; const r0 = S.respekt; S.respekt = 1e9; const r = buySkill(S, id); S.respekt = r0; C.dirty = true; return !!r.ok; }, BKC: { HATCH, BUNKER, LADDER, BPC, LAGER, SLOTS }, climb: (d) => climb(d), climbing: () => !!C.climb, BK: () => C.BK, HT: () => C.HT, bpc: () => bpc, desk: () => bdesk, sendKumpel: (k) => sendKumpelDown(k), callKumpel: (k) => callKumpelUp(k), checkSeen: () => C.ctrl && C.ctrl.seen,
    AU: () => C.AU, aussen: { FZ, WIN_OUT, KALLE_AT, COUNTER, GATE, CAM, BANKS }, setHour: (h) => { setHour(C.S, h); C.dayL = undefined; }, clock: () => clock(C.S), welt: () => C.S.welt, polizei: (d = 1) => C.AU.police.start(d), einkauf: () => { C.S.welt.weg = 200; C.S.welt.wer = 'mama'; C.AU.fam.leave(); }, nachbar: (on = true) => { C.S.welt.nbOut = on; C.S.welt.nbT = 999; C.AU.setNachbar(on); }, parkKunde: () => { C.S.welt.parkT = 0; }, wclimb: (d) => climbWindow(d), wclimbing: () => !!C.wclimb, kamera: () => kameraErwischt(), garage: (d) => garageMove(d), openKiosk,
    paket: () => PA, teil3: () => T3, rauch: () => RA, rauchOrt: () => rauchOrt(), reden: () => RD, stimmen: () => ST, ereignis: (id) => { const e = ausloesen(C.S, id); if (e) ereignisZeig(e); return e; }, klopft: (id) => RD.klopft(id),
    mp: () => C.mp, mpPose: () => mpMyPose(), mpFigs: () => ({ ludwig: !!(mpFigs[1] && mpFigs[1].visible), rot: !!C.W.cast.rot.visible, gelb: !!C.W.cast.gelb.visible, gruen: !!C.W.cast.gruen.visible, rotMode: C.W.cast.rot.mode }), phone, togglePhone, giveResp: (n) => { if (C.S) { C.S.respekt += n; C.dirty = true; } }, finale, skillCount: () => SKILL_NODES.length, rates: () => (C.S ? autoRates(C.S) : null),
  };
  const coop = { saves, startCoop: mpStart, stop: (text) => { mpStop(text); return 'stay'; }, active: () => !!C.mp, playerJoined: (id, name) => mpJoined(id, name, true), playerLeft: mpLeft, message: mpMessage, needsIntro: (slot) => { const S = slot && saves.get(slot) ? saves.load(slot) : null; return !S || !S.introSeen; } }; // Schnittstelle für die Lobby (mp.js)
  return { play, stop, frame, active: () => C.on, hide: () => {}, state: C, debug, saves, tour, coop };
}
