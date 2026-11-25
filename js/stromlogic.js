// Theos Seitenscheidel - Strom-Spiel (intern strom): Regeln ohne Grafik. Erzeuger, Ladeplätze, Speicher, Kabel, Brennstoff,
// Uhr und Wetter, Verkauf am Energiedepot, Schwarzmarkt, Aufträge mit XP und Level, Schlafen mit Tagesbericht, Döner-Stärkung,
// Bäume fällen und die Polizei an der Hallentür. Der Host rechnet, alle anderen schicken Wünsche.
// Geld in Cent, Energie in kWh, Leistung in kW, Zeit in Spielminuten (0..1440).

export const MIN_PER_SEC = 1; // eine Spielminute je Sekunde: der Tag von 8 bis 21 Uhr dauert 13 echte Minuten
export const DAY_START = 8 * 60;
export const DAY_END = 21 * 60; // danach steht die Uhr, bis jemand am PC schlafen geht
export const SLEEP_FROM = 18 * 60;
export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
export const CABLE_M = 10; // ein Kabel reicht zehn Meter
export const CARRY_MAX = 12; // Kohle oder Holz in den Händen
export const MINE_LVL = 5; // die Mine ist bis dahin vergittert

export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function euro(c) { const v = Math.round(c) / 100; const neg = v < 0; const s = Math.abs(v).toFixed(2).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (neg ? '−' : '') + s[0] + (s[1] === '00' ? '' : ',' + s[1]) + ' €'; }
export const kwh = (v) => (v < 10 ? v.toFixed(3) : v < 100 ? v.toFixed(1) : Math.round(v).toString()).replace('.', ',') + ' kWh';
export const clockText = (min) => { const m = ((Math.floor(min) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
export const dayInfo = (day) => ({ week: Math.ceil(day / 7), wd: ((day - 1) % 7) + 1, name: WEEKDAYS[(day - 1) % 7] });
export const absTime = (S) => S.day * 1440 + S.clock;

// ---------------- Orte (Weltkoordinaten: x Osten, z Süden, Ebene: boden, dach, mine) ----------------
export const HALL = { x0: -18, x1: 18, z0: -11, z1: 11, h: 8 };
export const OFFICE = { x0: 18.15, x1: 24.6, z0: 4.4, z1: 10.6, door: [8.6, 9.8] }; // Büro-Anbau an der Ostwand, Tür in der Hallenwand
export const ROAD_Z = 30;
export const BOUNDS = { x0: -250, x1: 370, z0: -210, z1: 210 };
export const riverX = (z) => 36 + 3.2 * Math.sin(z * 0.031) + 1.6 * Math.sin(z * 0.012 + 1.3); // der Fluss fließt gleich östlich an der Halle vorbei
export const BUNKER_DOOR = { x: -88, z: -24 }; // Schwelle der Bunkertür (blickt nach Osten), der Raum liegt westlich davon im Hügel
export const BUNKER = { x0: BUNKER_DOOR.x - 14, x1: BUNKER_DOOR.x - 3, z0: BUNKER_DOOR.z - 5, z1: BUNKER_DOOR.z + 5 };
export const CITY = { x0: 100, x1: 226, z0: -24, z1: 86 };
export const DEPOT = { x0: 285, x1: 315, z0: -8, z1: 6, bay: { x0: 290, x1: 310, z0: 8, z1: 27 } };
export const DOENER = { x0: 149, x1: 161, z0: 15, z1: 23.6 }; // Laden an der Hauptstraße, Theke nach Süden
export const CHARGERS = [ // Ladeplätze: klein für Autobatterie und Akkuschrank, groß auch für den Container
  { id: 'L1', x: -17.1, z: -9, big: false }, { id: 'L2', x: -17.1, z: -7, big: false }, { id: 'L3', x: -17.1, z: -5, big: false }, { id: 'L4', x: -17.1, z: -3, big: false }, { id: 'L5', x: -17.1, z: -1, big: false },
  { id: 'C1', x: -15.6, z: 3.2, big: true }, { id: 'C2', x: -15.6, z: 7.2, big: true },
];
export const CHARGER = Object.fromEntries(CHARGERS.map((c) => [c.id, c]));

// Erzeuger: kw Spitzenleistung, art (muskel, brenn, sonne, wind, wasser, erde, blitz, atom, fusion), Brennstoff je Spielstunde,
// Verdacht je Stunde bei voller Leistung, lvl = ab welchem Level der Händler ihn verkauft
export const GENS = [
  { id: 'kurbel', name: 'Handkurbel', model: 'Handkurbel', price: 0, kw: 1.2, art: 'muskel', multi: 3, x: -13.6, z: -9.2, y: 0.91, rot: 0, sus: 0, lvl: 1, blurb: 'Kurbeln, bis der Arm abfällt. Per USB direkt an der Batterie.' },
  { id: 'fahrrad', name: 'Fahrrad-Generator', model: 'Fahrrad_Generator', price: 3000, kw: 3, art: 'muskel', x: -9.8, z: -8.6, rot: 0, sus: 0, lvl: 2, blurb: 'Treten statt kurbeln. Mehr als doppelt so viel Strom.' },
  { id: 'solar', name: 'Solarpanel', model: 'Solarpanel', price: 6000, kw: 0.8, art: 'sonne', multi: 6, roof: true, sus: 0.2, lvl: 2, blurb: 'Aufs Dach damit. Läuft von allein, aber nur bei Tag.' },
  { id: 'laufrad', name: 'Laufrad', model: 'Laufrad', price: 9000, kw: 6, art: 'muskel', x: -4.6, z: -8.6, rot: 0, sus: 0.5, lvl: 3, blurb: 'Das Hamsterrad für Menschen. Rennen, rennen, rennen.' },
  { id: 'windklein', name: 'Kleines Windrad', model: 'Windrad_Klein', price: 14000, kw: 1.8, art: 'wind', x: -12, z: -6, roof: true, rot: 0, sus: 0.4, lvl: 3, blurb: 'Dreht sich auf dem Dach. Mal viel, mal wenig.' },
  { id: 'holzofen', name: 'Holzofen mit Dampfmaschine', model: 'Holzofen_Dampfmaschine', price: 35000, kw: 7, art: 'brenn', fuel: 'holz', burn: 4, x: 5.2, z: -8.6, rot: 0, sus: 3, lvl: 3, blurb: 'Holz rein, Dampf raus. Vier Scheite pro Stunde: Bäume fällt ihr mit der Axt.' },
  { id: 'aggregat', name: 'Benzin-Aggregat', model: 'Benzin_Aggregat', price: 20000, kw: 5, art: 'brenn', fuel: 'benzin', burn: 1, x: 0.2, z: -9.2, rot: 0, sus: 3, lvl: 4, blurb: 'Laut und durstig: ein Kanister pro Stunde.' },
  { id: 'wasserrad', name: 'Wasserrad', model: 'Wasserrad', price: 60000, kw: 4, art: 'wasser', x: Math.round((riverX(-14) - 2.9) * 10) / 10, z: -14, rot: Math.PI / 2, out: true, sus: 0.6, lvl: 5, blurb: 'Am Fluss neben der Halle. Läuft Tag und Nacht.' },
  { id: 'kohle', name: 'Kohlekraftwerk', model: 'Kohlekraftwerk', price: 120000, kw: 20, art: 'brenn', fuel: 'kohle', burn: 6, x: 12.6, z: -7.4, rot: 0, sus: 6, lvl: 5, blurb: 'Kohle aus der Mine unter der Halle. Qualmt verdächtig.' },
  { id: 'blitz', name: 'Blitzfänger', model: 'Blitzfaenger', price: 100000, kw: 0, art: 'blitz', strike: 25, x: -12, z: 5, roof: true, rot: 0, sus: 0.5, lvl: 6, blurb: 'Nur bei Gewitter. Ein Treffer bringt 25 kWh auf einmal.' },
  { id: 'biogas', name: 'Biogas-Anlage', model: 'Biogas_Anlage', price: 180000, kw: 12, art: 'brenn', fuel: 'bio', burn: 4, x: 12.4, z: 5.2, rot: Math.PI, sus: 3, lvl: 6, blurb: 'Frisst Bioabfall vom Schwarzmarkt. Stinkt nur ein bisschen.' },
  { id: 'erdwaerme', name: 'Erdwärme-Bohrung', model: 'Erdwaerme_Bohrung', price: 350000, kw: 15, art: 'erde', x: 11.2, z: 4.5, mine: true, rot: Math.PI, sus: 2, lvl: 7, blurb: 'Unten in der Mine. Läuft immer, ganz ohne Brennstoff.' },
  { id: 'windgross', name: 'Großes Windrad', model: 'Windrad_Gross', price: 600000, kw: 40, art: 'wind', x: -62, z: -48, out: true, rot: 0.6, sus: 8, lvl: 7, blurb: 'Zweiundzwanzig Meter Turm. Sieht man von weitem.' },
  { id: 'staudamm', name: 'Staudamm mit Turbine', model: 'Staudamm_Turbine', price: 1200000, kw: 60, art: 'wasser', x: Math.round(riverX(-86) * 10) / 10, z: -86, out: true, rot: 0, y: -1.1, sus: 6, lvl: 8, blurb: 'Der Fluss gehört jetzt euch. Riesig, teuer, unaufhaltsam.' },
  { id: 'atom', name: 'Mini-Atomreaktor', model: 'Mini_Atomreaktor', price: 2500000, kw: 150, art: 'brenn', fuel: 'stab', burn: 1 / 12, x: 5.4, z: 6.6, rot: Math.PI, sus: 22, lvl: 9, blurb: 'Ein Brennstab hält zwölf Stunden. Die Polizei wird neugierig.' },
  { id: 'fusion', name: 'Fusionsreaktor', model: 'Fusionsreaktor', price: 10000000, kw: 500, art: 'fusion', x: -5.2, z: 5.6, rot: Math.PI, sus: 30, lvl: 10, blurb: 'Eine Sonne in der Halle. Mehr geht nicht.' },
];
export const GEN = Object.fromEntries(GENS.map((g) => [g.id, g]));
export const SOLAR_SPOTS = [[1.5, -5.5], [6, -5.5], [10.5, -5.5], [1.5, 0.5], [6, 0.5], [10.5, 0.5]]; // auf dem Dach (y 8)
export const BENCH_DZ = 2.3; // Abstand der drei Werkbänke mit den Kurbeln
export const genPos = (id, k = 0) => { const g = GEN[id]; if (id === 'solar') { const s = SOLAR_SPOTS[k] || SOLAR_SPOTS[0]; return { x: s[0], z: s[1] }; } if (id === 'kurbel') return { x: g.x, z: g.z + BENCH_DZ * k }; return { x: g.x, z: g.z }; };
export const genLevel = (g) => (g.roof ? 'dach' : g.mine ? 'mine' : 'boden');

export const STORES = {
  auto: { name: 'Autobatterie', cap: 1, size: 1, price: 1500, carry: true, lvl: 1 },
  lkw: { name: 'LKW-Batterie', cap: 3, size: 1, price: 4000, carry: true, lvl: 2 },
  schrank: { name: 'Akkuschrank', cap: 10, size: 2, price: 15000, carry: true, lvl: 3 },
  haus: { name: 'Hausspeicher', cap: 30, size: 4, price: 42000, carry: true, lvl: 5 },
  container: { name: 'Speichercontainer', cap: 100, size: 6, price: 120000, carry: false, lvl: 6 },
};
export const VEHICLES = {
  pickup: { name: 'Pickup', cap: 4, price: 0, model: 'Pickup', top: 95, container: false, lvl: 1 },
  van: { name: 'Lieferwagen', cap: 10, price: 90000, park: 'van', top: 85, container: false, lvl: 4 },
  truck: { name: 'LKW', cap: 24, price: 400000, park: 'truck', top: 75, container: true, lvl: 6 },
};
export const FUELS = {
  benzin: { name: 'Benzin', unit: 'Kanister', price: 800, pack: 1, shop: true, lvl: 4 },
  holz: { name: 'Holz', unit: 'Scheite', shop: false },
  kohle: { name: 'Kohle', unit: 'Brocken', shop: false },
  bio: { name: 'Bioabfall', unit: 'Säcke', price: 300, pack: 1, shop: true, lvl: 6 },
  stab: { name: 'Brennstab', unit: 'Stäbe', price: 50000, pack: 1, shop: true, lvl: 9 },
};
export const TOOLS = { axt: { name: 'Axt', price: 2500, lvl: 3, blurb: 'Damit fällt ihr Bäume im Wald. Das Holz frisst der Holzofen.' } };
export const FOOD = { // Dönerladen in der Stadt: Stärkung für eine Weile (Spielminuten)
  doener: { name: 'Döner', price: 500, kraft: 1.5, min: 180, blurb: 'Mit allem und scharf. Drei Stunden lang 50 % mehr Kraft an Kurbel, Fahrrad und Laufrad.' },
  ayran: { name: 'Ayran', price: 250, tempo: 1.3, min: 180, blurb: 'Eiskalt. Drei Stunden lang 30 % schneller laufen.' },
  teller: { name: 'Dönerteller', price: 900, kraft: 1.5, tempo: 1.3, min: 300, blurb: 'Fleisch, Reis, Salat, Soße. Fünf Stunden lang mehr Kraft und schneller laufen.' },
};
export const CABLE_PRICE = 600;
export const SPOTS = { // Treffpunkte der Welt (gemeinsam für Logik, Karte und Tests)
  gate: { x: -15, z: 11 }, door: { x: 6.1, z: 11 }, doorOut: { x: 6.1, z: 12.6 }, ladder: { x: 18.4, z: -4 }, hatch: { x: 15.8, z: 1.2 },
  bunker: { x: BUNKER_DOOR.x + 2, z: BUNKER_DOOR.z }, bunkerLot: { x: BUNKER_DOOR.x + 9, z: BUNKER_DOOR.z }, dealer: { x: BUNKER_DOOR.x - 10.2, z: BUNKER_DOOR.z + 1.2 }, boss: { x: BUNKER_DOOR.x - 7.5, z: BUNKER_DOOR.z - 2.4 },
  depot: { x: 300, z: 12 }, depotBay: { x: 300, z: 18 }, pc: { x: 21.4, z: 5.6 }, doener: { x: 155, z: 24.4 }, city: { x: 160, z: ROAD_Z },
  spawn: { x: -6, z: 0 }, parkPickup: { x: -9.5, z: 15, h: 0 }, parkVan: { x: -3, z: 15, h: 0 }, parkTruck: { x: 4, z: 15, h: 0 },
};
export const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export const cablesFor = (genId, chId, k = 0) => { if (genId === 'kurbel') return 0; const a = genPos(genId, k); const g = GEN[genId]; const extra = g.roof ? 10 : g.mine ? 8 : 0; return Math.max(1, Math.ceil((dist(a, CHARGER[chId]) + extra) / CABLE_M)); };

// ---------------- Level und XP (XP gibt es nur für Aufträge) ----------------
export const LEVELS = [0, 60, 160, 320, 560, 900, 1400, 2100, 3000, 4200];
export const MAX_LVL = LEVELS.length;
export const levelFor = (xp) => { let l = 1; while (l < MAX_LVL && xp >= LEVELS[l]) l++; return l; };
export const xpSpan = (S) => { const l = S.level; if (l >= MAX_LVL) return { have: 1, need: 1, max: true }; return { have: S.xp - LEVELS[l - 1], need: LEVELS[l] - LEVELS[l - 1], max: false }; };
export function unlocksAt(lvl) {
  const out = []; for (const g of GENS) if (g.lvl === lvl && g.price > 0) out.push(g.name); for (const s of Object.values(STORES)) if (s.lvl === lvl && lvl > 1) out.push(s.name);
  for (const v of Object.values(VEHICLES)) if (v.lvl === lvl && lvl > 1) out.push(v.name); for (const t of Object.values(TOOLS)) if (t.lvl === lvl) out.push(t.name); if (lvl === MINE_LVL) out.push('die Mine unter der Halle'); return out;
}

// ---------------- Wald: jeder Baum hat einen festen Platz (für alle Spieler gleich) ----------------
export const TREE_TYPES = ['fichte', 'kiefer', 'eiche', 'birke'];
const inRect = (x, z, r, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;
export function treeFree(x, z) {
  if (Math.abs(z - ROAD_Z) < 10) return false; if (Math.abs(x - riverX(z)) < 9.5) return false;
  if (x > -26 && x < riverX(z) && z > -17 && z < 30) return false; // Hof, Halle, Büro, Ufer
  if (x > BUNKER.x0 - 6 && x < BUNKER_DOOR.x + 18 && z > BUNKER.z0 - 6 && z < BUNKER.z1 + 6) return false; if (x > BUNKER_DOOR.x + 5 && x < BUNKER_DOOR.x + 12 && z > BUNKER.z1 && z < ROAD_Z) return false;
  if (inRect(x, z, CITY, 6)) return false; if (inRect(x, z, { x0: 266, x1: 334, z0: -26, z1: 46 })) return false;
  if (Math.hypot(x - GEN.windgross.x, z - GEN.windgross.z) < 10) return false; if (Math.hypot(x - GEN.staudamm.x, z - GEN.staudamm.z) < 14) return false; if (Math.hypot(x - GEN.wasserrad.x, z - GEN.wasserrad.z) < 7) return false;
  if (z > 37 && z < 47 && x > 44 && x < 284) return false; // Schneise der Strommasten
  return x > BOUNDS.x0 + 4 && x < BOUNDS.x1 - 4 && z > BOUNDS.z0 + 4 && z < BOUNDS.z1 - 4;
}
function makeForest() {
  const r = rng(20261111); const out = []; const grid = new Map(); const cell = 2.6; const key = (x, z) => Math.floor(x / cell) + ':' + Math.floor(z / cell);
  const put = (x, z, mix) => { if (!treeFree(x, z)) return; const k = key(x, z); if (grid.has(k)) return; for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { const q = grid.get(key(x + dx * cell, z + dz * cell)); if (q && Math.hypot(q.x - x, q.z - z) < 2.3) return; }
    const u = r(); let t = 0; let acc = 0; for (let i = 0; i < 4; i++) { acc += mix[i]; if (u < acc) { t = i; break; } } const tr = { x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100, t, s: Math.round((0.8 + r() * 0.5) * 100) / 100, r: Math.round(r() * 628) / 100 }; grid.set(k, tr); out.push(tr); };
  const area = (x0, x1, z0, z1, n, mix) => { for (let i = 0; i < n; i++) put(x0 + r() * (x1 - x0), z0 + r() * (z1 - z0), mix); };
  area(-240, -24, -200, 200, 1500, [0.5, 0.2, 0.2, 0.1]); // der große Wald im Westen
  area(-24, 28, -200, -17, 420, [0.4, 0.2, 0.25, 0.15]); // Wald hinter der Halle
  area(44, 360, -200, -30, 520, [0.3, 0.25, 0.3, 0.15]); // Norden jenseits des Flusses
  area(-24, 360, 46, 200, 620, [0.25, 0.2, 0.35, 0.2]); // südlich der Straße
  area(48, 98, -30, 20, 26, [0.1, 0.1, 0.5, 0.3]); area(228, 268, -30, 20, 30, [0.1, 0.2, 0.4, 0.3]); // Wiesen mit einzelnen Bäumen
  return out;
}
export const TREES = makeForest();
export const TREE_HITS = 5; export const TREE_WOOD = 8; export const YOUNG_WOOD = 3;
// Stufe: 0 Stumpf, 1 Setzling, 2 junger Baum, 3 ausgewachsen. Gefällte Bäume wachsen in sechs Tagen nach.
export function treeStage(S, i) { const d = S.trees[i]; if (d === undefined) return 3; const age = S.day - d; return age < 2 ? 0 : age < 4 ? 1 : age < 6 ? 2 : 3; }

// ---------------- Spielstand ----------------
const newToday = () => ({ kwh: 0, sold: 0, money: 0, spent: 0, xp: 0, jobs: 0, fines: 0, police: 0, wood: 0 });
export function newSave() {
  return { v: 2, day: 1, clock: DAY_START, purse: 2000, level: 1, xp: 0, over: false, won: null, introSeen: false,
    gens: [0, 1, 2].map((k) => ({ uid: k + 1, id: 'kurbel', k, on: true })), links: [0, 1, 2].map((k) => ({ gen: k + 1, ch: 'L' + (k + 1), n: 0, usb: true })), cables: 0,
    stores: [0, 1, 2].map((k) => ({ id: k + 4, t: 'auto', kwh: 0, at: { k: 'ch', ch: 'L' + (k + 1) } })), fuel: { benzin: 0, holz: 0, kohle: 0, bio: 0, stab: 0 }, carry: {}, veh: { pickup: { ...SPOTS.parkPickup } },
    tools: {}, buffs: {}, trees: {}, treeHp: {}, drops: [], job: null, jobsTaken: [], quest: 0, today: newToday(),
    sus: 0, police: null, policeNext: 0, door: { gate: 0, tuer: 0, bunker: 0 }, uid: 10, stats: { sold: 0, kwh: 0, money: 0, police: 0, fines: 0, jobs: 0, loaded: 0, slept: 0, food: 0, wood: 0 }, log: [] };
}
// Neuer Stand für vier Spieler: vierte Werkbank mit Kurbel und Autobatterie an L4 (nur Stände ab 1.14.0, alte bleiben bei drei)
export const BENCHES = (S) => (S && S.gens && S.gens.some((g) => g.id === 'kurbel' && g.k === 3) ? 4 : 3);
export function addFourth(S) { if (BENCHES(S) === 4) return S; const uid = S.uid++; S.gens.push({ uid, id: 'kurbel', k: 3, on: true }); if (!storeAt(S, 'L4')) S.stores.push({ id: S.uid++, t: 'auto', kwh: 0, at: { k: 'ch', ch: 'L4' } }); S.links.push({ gen: uid, ch: 'L4', n: 0, usb: true }); return S; }
export function fixSave(S) {
  const d = newSave(); const old = S && typeof S === 'object' ? S : {}; const o = { ...d, ...old };
  for (const k of ['gens', 'links', 'stores', 'log', 'drops', 'jobsTaken']) if (!Array.isArray(o[k])) o[k] = d[k];
  for (const k of ['fuel', 'door', 'stats', 'today']) o[k] = { ...d[k], ...(o[k] || {}) }; for (const k of ['tools', 'buffs', 'trees', 'treeHp']) if (!o[k] || typeof o[k] !== 'object') o[k] = {};
  o.veh = o.veh && o.veh.pickup ? o.veh : d.veh; o.carry = {}; o.police = null;
  for (const s of o.stores) if (s.at && (s.at.k === 'hand')) s.at = { k: 'ground', x: SPOTS.gate.x + 2, z: 6, lvl: 'boden' };
  if ((old.v || 1) < 2) { // alter Stand: jeder bekommt seine Kurbel mit Batterie, das Level richtet sich nach dem, was schon steht
    for (let k = 1; k < 3; k++) if (!o.gens.some((g) => g.id === 'kurbel' && g.k === k)) { const uid = o.uid++; o.gens.push({ uid, id: 'kurbel', k, on: true }); const ch = 'L' + (k + 1); if (!storeAt(o, ch)) { o.stores.push({ id: o.uid++, t: 'auto', kwh: 0, at: { k: 'ch', ch } }); } o.links.push({ gen: uid, ch, n: 0, usb: true }); }
    const lvl = Math.max(1, ...o.gens.map((g) => (GEN[g.id] ? GEN[g.id].lvl : 1))); o.xp = LEVELS[lvl - 1]; o.clock = clamp(o.clock, DAY_START, DAY_END); o.veh = { ...o.veh }; for (const k of Object.keys(o.veh)) if (o.veh[k].x > 20) o.veh[k] = { ...(k === 'pickup' ? SPOTS.parkPickup : k === 'van' ? SPOTS.parkVan : SPOTS.parkTruck) }; o.v = 2;
  }
  o.gens = o.gens.filter((g) => GEN[g.id]); o.xp = Math.max(0, Number(o.xp) || 0); o.level = levelFor(o.xp); o.quest = Math.max(0, o.quest | 0); return o;
}
export const genOf = (S, uid) => S.gens.find((g) => g.uid === uid) || null;
export const linkOf = (S, uid) => S.links.find((l) => l.gen === uid) || null;
export const storeAt = (S, ch) => S.stores.find((s) => s.at.k === 'ch' && s.at.ch === ch) || null;
export const vehLoad = (S, v) => S.stores.filter((s) => s.at.k === 'veh' && s.at.v === v).reduce((a, s) => a + STORES[s.t].size, 0);
export const owns = (S, id) => S.gens.some((g) => g.id === id);
export const countOf = (S, id) => S.gens.filter((g) => g.id === id).length;
export const totalKw = (S) => S.gens.reduce((a, g) => a + (g.kw || 0), 0);
function log(S, text) { S.log.unshift({ day: S.day, clock: Math.floor(S.clock), text }); if (S.log.length > 30) S.log.length = 30; }

// ---------------- Wetter, Sonne, Wind, Preis ----------------
export function weatherFor(day) {
  const r = rng(day * 2654435 + 97); const x = r(); const kind = day === 1 ? 'sonnig' : x < 0.5 ? 'sonnig' : x < 0.82 ? 'wolkig' : 'gewitter';
  const from = 12 * 60 + Math.floor(r() * 5) * 60; const storm = kind === 'gewitter' ? [from, from + 180] : null;
  // Regen (seit 2026-11-22): immer rund ums Gewitter, dazu an manchen bewölkten Tagen ein Schauer. Eigener Würfel, damit Wetter, Wind und Blitze alter Spielstände gleich bleiben.
  const q = rng(day * 7727 + 311); let regen = storm ? [storm[0] - 30, storm[1] + 30] : null;
  if (kind === 'wolkig' && q() < 0.65) { const a = 9 * 60 + Math.floor(q() * 8) * 60; regen = [a, a + 120 + Math.floor(q() * 3) * 60]; }
  return { kind, name: { sonnig: 'Sonnig', wolkig: 'Bewölkt', gewitter: 'Gewitter' }[kind], storm, regen, seed: (r() * 1e9) >>> 0 };
}
// 0 trocken bis 1 Gewitterguss, setzt in einer Viertelstunde ein und hört genauso auf
export function rainAt(day, min) { const w = weatherFor(day); if (!w.regen || min <= w.regen[0] || min >= w.regen[1]) return 0; return clamp(Math.min(min - w.regen[0], w.regen[1] - min) / 15, 0, 1) * (w.storm ? 1 : 0.6); }
export const weatherText = (w) => (w.storm ? `${w.name} ${clockText(w.storm[0])}–${clockText(w.storm[1])}` : w.regen ? `Regen ${w.regen[0] / 60}–${w.regen[1] / 60} Uhr` : w.name); // Schauer fangen immer zur vollen Stunde an
export const stormNow = (day, min) => { const w = weatherFor(day); return !!(w.storm && min >= w.storm[0] && min < w.storm[1]); };
export function sunAt(day, min) { // 0..1, Sonnenaufgang 6:00, Untergang 20:00
  const m = ((min % 1440) + 1440) % 1440; if (m < 360 || m > 1200) return 0; const s = Math.sin(Math.PI * (m - 360) / 840); const w = weatherFor(day);
  return s * (w.kind === 'sonnig' ? 1 : w.kind === 'wolkig' ? 0.45 : stormNow(day, m) ? 0.12 : 0.35);
}
function noise1(seed, t) { const i = Math.floor(t); const f = t - i; const a = rng(seed + i * 7919)(); const b = rng(seed + (i + 1) * 7919)(); const u = f * f * (3 - 2 * f); return a + (b - a) * u; }
export function windAt(day, min) { const w = weatherFor(day); const base = 0.18 + 0.85 * noise1(w.seed, min / 90); return clamp(base * (stormNow(day, min) ? 1.6 : w.kind === 'wolkig' ? 1.15 : 1), 0, 1.6); }
export const priceFor = (day) => Math.round(350 + rng(day * 31337 + 5)() * 150); // Cent je kWh am Depot
export function offerOfWeek(day) { const wk = Math.ceil(day / 7); const pool = GENS.filter((g) => g.price > 0 && g.price <= 600000); const g = pool[Math.floor(rng(wk * 4099 + 3)() * pool.length)]; return { id: g.id, off: 0.25, week: wk }; }
export function priceOf(S, id) { const g = GEN[id]; if (!g) return 0; const o = offerOfWeek(S.day); return Math.round(g.price * (o.id === id ? 1 - o.off : 1)); }

// ---------------- Stärkung vom Dönerladen ----------------
export function buffOf(S, who) { const b = S.buffs[who] || {}; const t = absTime(S); const kl = Math.max(0, (b.kraft || 0) - t); const tl = Math.max(0, (b.tempo || 0) - t); return { kraft: kl > 0 ? b.kraftV || 1.5 : 1, tempo: tl > 0 ? b.tempoV || 1.3 : 1, kraftLeft: kl, tempoLeft: tl }; }
export function eat(S, who, id) {
  const f = FOOD[id]; if (!f) return { ok: false, why: 'Gibt es nicht' }; if (S.purse < f.price) return { ok: false, why: 'Zu wenig Geld' }; S.purse -= f.price; S.today.spent += f.price; S.stats.food++;
  const b = S.buffs[who] = S.buffs[who] || {}; const until = absTime(S) + f.min; if (f.kraft) { b.kraft = Math.max(b.kraft || 0, until); b.kraftV = f.kraft; } if (f.tempo) { b.tempo = Math.max(b.tempo || 0, until); b.tempoV = f.tempo; }
  return { ok: true, text: `${f.name}: ${f.kraft ? 'mehr Kraft' : ''}${f.kraft && f.tempo ? ' und ' : ''}${f.tempo ? 'schnellere Beine' : ''} für ${Math.round(f.min / 60)} Stunden.` };
}

// ---------------- Leistung je Erzeuger ----------------
// effort: { uid: 0..1,5 } Muskelkraft der Spieler, die gerade kurbeln, treten oder rennen (über 1 nur mit Döner)
export function genPower(S, g, effort = {}) {
  const d = GEN[g.id]; if (!d) return 0;
  if (d.art === 'muskel') return d.kw * clamp(effort[g.uid] || 0, 0, 1.5);
  if (d.art === 'sonne') return d.kw * sunAt(S.day, S.clock);
  if (d.art === 'wind') return d.kw * windAt(S.day, S.clock);
  if (d.art === 'wasser' || d.art === 'erde' || d.art === 'fusion') return d.kw;
  if (d.art === 'brenn') return g.on && (S.fuel[d.fuel] || 0) > 0 ? d.kw : 0;
  return 0;
}

// ---------------- Ablauf (nur Host): dtMin Spielminuten ----------------
function produce(S, dtMin, effort, ev, rand) {
  const h = dtMin / 60; let susUp = 0;
  for (const g of S.gens) {
    const d = GEN[g.id]; const p = genPower(S, g, effort); g.kw = p; let run = 1;
    if (d.art === 'brenn' && g.on) { const have = S.fuel[d.fuel] || 0; const want = d.burn * h; run = want > 0 ? Math.min(1, have / want) : 1; S.fuel[d.fuel] = Math.max(0, have - want); if (S.fuel[d.fuel] <= 1e-6) { S.fuel[d.fuel] = 0; g.on = false; ev.push({ k: 'empty', gen: g.uid, text: `${d.name}: ${FUELS[d.fuel].name} ist alle, ausgeschaltet.` }); } }
    if (p > 0) { charge(S, g.uid, p * h * run, ev); susUp += d.sus * (d.kw ? p / d.kw : 1) * h * run; }
  }
  if (stormNow(S.day, S.clock)) for (const g of S.gens) if (g.id === 'blitz' && rand() < dtMin / 35) { charge(S, g.uid, GEN.blitz.strike, ev); susUp += 0.5; ev.push({ k: 'strike', gen: g.uid }); }
  return susUp;
}
export function tick(S, dtMin, effort = {}, rand = Math.random) {
  const ev = [];
  if (S.clock >= DAY_END) { S.clock = DAY_END; for (const g of S.gens) g.kw = 0; if (!S.lateSaid) { S.lateSaid = true; ev.push({ k: 'late' }); } return ev; } // Feierabend: erst schlafen
  const step = Math.min(dtMin, DAY_END - S.clock); S.clock += step; const h = step / 60;
  const susUp = produce(S, step, effort, ev, rand);
  const gateOpen = S.door.gate > 0.5 ? 1.5 : 1; S.sus = clamp(S.sus + susUp * gateOpen - 1 * h, 0, 100);
  // Polizei: je verdächtiger, desto öfter klopft es (tagsüber, mit Pause dazwischen)
  const m = S.clock; const time = absTime(S);
  if (!S.police && time >= (S.policeNext || 0) && m > 8 * 60 && m < DAY_END - 45 && S.sus >= 25) { const p = clamp((S.sus - 18) / 220, 0, 0.5) * h; if (rand() < p) { S.police = { st: 'kommt', t: 0, seed: (rand() * 1e9) >>> 0 }; ev.push({ k: 'police' }); } }
  if (questStep(S)) ev.push({ k: 'quest' });
  return ev;
}
// Energie in den Speicher am Ladeplatz des Erzeugers (voll oder nicht angeschlossen: verpufft)
export function charge(S, uid, e, ev) {
  const l = linkOf(S, uid); if (!l) { const g = genOf(S, uid); if (g) g.lost = (g.lost || 0) + e; return 0; } const s = storeAt(S, l.ch); if (!s) return 0;
  const cap = STORES[s.t].cap; const add = Math.max(0, Math.min(e, cap - s.kwh)); s.kwh += add; S.stats.kwh += add; S.today.kwh += add; if (add < e && ev && s.kwh >= cap - 1e-6 && !s.fullSaid) { s.fullSaid = true; ev.push({ k: 'full', store: s.id, text: `${STORES[s.t].name} an ${l.ch} ist voll.` }); } return add;
}

// ---------------- Schlafen: Nacht überspringen, Tagesbericht ----------------
export function sleep(S, rand = Math.random) {
  if (S.clock < SLEEP_FROM) return { ok: false, why: `Schlafen geht erst ab ${clockText(SLEEP_FROM)} Uhr.` }; if (S.police) return { ok: false, why: 'Nicht, solange die Polizei vor der Tür steht.' };
  const rep = { day: S.day, name: dayInfo(S.day).name, ...S.today, purse: 0, night: 0, level: S.level, xpAll: S.xp, lost: null };
  const before = S.stats.kwh; const ev = []; let left = 1440 - S.clock + DAY_START; // die Nacht: was von allein läuft, läuft weiter
  while (left > 0) { const step = Math.min(10, left); S.clock += step; if (S.clock >= 1440) { S.clock -= 1440; S.day++; } produce(S, step, {}, ev, rand); left -= step; }
  rep.night = S.stats.kwh - before; S.today = newToday(); S.today.kwh = 0; S.clock = DAY_START; S.sus = clamp(S.sus - 12, 0, 100); S.lateSaid = false; S.stats.slept++;
  if (S.job && S.day > S.job.due) { rep.lost = S.job.who; log(S, `Auftrag verpasst: ${S.job.who}`); S.job = null; }
  for (const k of Object.keys(S.trees)) if (S.day - S.trees[k] >= 6) delete S.trees[k];
  rep.purse = S.purse; const w = weatherFor(S.day); rep.next = { name: dayInfo(S.day).name, day: S.day, weather: weatherText(w), price: priceFor(S.day), offer: dayInfo(S.day).wd === 1 ? offerOfWeek(S.day).id : null };
  log(S, `Neuer Tag: ${rep.next.name}, ${weatherText(w)}`); questStep(S); return { ok: true, rep };
}

// ---------------- Aufträge (nur dafür gibt es XP) ----------------
const JOB_BASE = [0.6, 2, 6, 15, 35, 80, 180, 400, 900, 2000];
const CLIENTS = [['Imbiss „Zur fetten Ente“', 'Die Fritteuse braucht Saft.'], ['Camper am Fluss', 'Handy, Kühlbox, Lichterkette.'], ['Kleingarten Sonnenschein', 'Das Laubenfest steigt am Wochenende.'], ['Musikkeller Bassloch', 'Die Anlage frisst mehr, als der Vermieter wissen darf.'], ['Bauer Hinrichs', 'Der Melkstand läuft nicht mit guten Worten.'], ['Späti an der Ecke', 'Kühlschränke rund um die Uhr.'], ['Eishalle Theostadt', 'Die Kühlung schwitzt.'], ['Werkstatt Schrauber-Kalle', 'Schweißen ohne Zähler, du verstehst.'], ['Zirkus Fantastico', 'Das Karussell dreht sich nicht von allein.'], ['Rechenzentrum im Keller', 'Frag nicht, was da gerechnet wird.']];
// Der letzte Auftrag: ab der Höchststufe will Bruno seinen Geschirrspüler zurück. Kein Lohn, keine Frist, danach kommt das Ende.
export const FINAL_KWH = 5000;
export const FINAL_JOB = { id: 'final', kwh: FINAL_KWH, xp: 0, money: 0, days: 0, final: true, who: 'Brunos Geschirrspüler', text: 'Der Auftraggeber leitet alles direkt in Brunos Küche. Ein Geschirrspüler, eine ganze Stadt ohne Strom. Bringt alles, was ihr habt.' };
export const finalOpen = (S) => S.level >= MAX_LVL && !S.won;
export function jobOffers(S) {
  const r = rng(S.day * 7919 + S.level * 131 + 11); const base = JOB_BASE[S.level - 1]; const fin = finalOpen(S) && !(S.job && S.job.final) ? [{ ...FINAL_JOB }] : [];
  return fin.concat([0.6, 1, 1.7].map((f, i) => { const raw = base * f * (0.85 + r() * 0.3); const e = raw < 10 ? Math.max(0.3, Math.round(raw * 10) / 10) : Math.round(raw); const c = CLIENTS[Math.floor(r() * CLIENTS.length)];
    return { id: `${S.day}-${S.level}-${i}`, kwh: e, xp: Math.round([20, 32, 48][i] * (1 + 0.35 * (S.level - 1))), money: Math.round(e * priceFor(S.day) * 1.1), days: 2, who: c[0], text: c[1] }; }).filter((o) => !S.jobsTaken.includes(o.id)));
}
export const jobDue = (J) => (J.final ? 'ohne Frist' : `bis ${dayInfo(J.due).name} abends`);
export function acceptJob(S, id) {
  if (S.job) return { ok: false, why: 'Ihr habt schon einen Auftrag. Erst den abliefern.' }; const o = jobOffers(S).find((q) => q.id === id); if (!o) return { ok: false, why: 'Den Auftrag gibt es nicht mehr' };
  S.job = { ...o, got: 0, due: o.final ? 99999 : S.day + o.days - 1 }; if (!o.final) { S.jobsTaken.push(id); if (S.jobsTaken.length > 12) S.jobsTaken.shift(); } log(S, `Auftrag angenommen: ${o.who}, ${kwh(o.kwh)}`); questStep(S); return { ok: true, text: `Auftrag angenommen: ${kwh(o.kwh)} für „${o.who}“ ${jobDue(S.job)}.` };
}
// Strom für den Auftrag abgeben: aus dem Speicher in den Händen und aus den Fahrzeugen vor dem Bunker
export function deliverJob(S, who, vehs = []) {
  const J = S.job; if (!J) return { ok: false, why: 'Ihr habt gerade keinen Auftrag.' };
  const src = []; const c = S.carry[who]; if (c && c.k === 'store') { const s = S.stores.find((q) => q.id === c.id); if (s) src.push(s); }
  for (const v of vehs) if (S.veh[v] && dist(S.veh[v], SPOTS.bunkerLot) < 34) for (const s of S.stores) if (s.at.k === 'veh' && s.at.v === v) src.push(s);
  let give = 0; for (const s of src) { const need = J.kwh - J.got; if (need <= 1e-6) break; const e = Math.min(need, s.kwh); if (e > 0) { s.kwh -= e; s.fullSaid = false; J.got += e; give += e; } }
  if (give <= 1e-6) return { ok: false, why: 'Kein Strom dabei. Bring volle Speicher mit (in den Händen oder im Auto vor dem Bunker).' };
  if (J.got < J.kwh - 1e-6) return { ok: true, give, text: `${kwh(give)} abgegeben. Es fehlen noch ${kwh(J.kwh - J.got)}.` };
  if (J.final) { S.won = { day: S.day, kwh: Math.round(S.stats.kwh), money: S.stats.money, jobs: S.stats.jobs }; S.job = null; log(S, 'Brunos Geschirrspüler läuft wieder!'); questStep(S); return { ok: true, give, done: true, finale: true, won: S.won, xp: 0, money: 0, levelUp: 0, text: 'Geschafft: 5.000 kWh für Brunos Geschirrspüler!' }; }
  const lvl0 = S.level; S.xp += J.xp; S.level = levelFor(S.xp); S.purse += J.money; S.stats.jobs++; S.stats.money += J.money; S.today.jobs++; S.today.xp += J.xp; S.today.money += J.money; log(S, `Auftrag erledigt: ${J.who} (+${J.xp} XP, ${euro(J.money)})`); S.job = null; questStep(S);
  return { ok: true, give, done: true, xp: J.xp, money: J.money, levelUp: S.level > lvl0 ? S.level : 0, text: `Auftrag erledigt: +${J.xp} XP und ${euro(J.money)}.` };
}

// ---------------- Aufgaben oben rechts (kein Lohn, es geht einfach mit der nächsten weiter) ----------------
export const QUESTS = [
  { text: () => 'Geh zur Handkurbel auf der Werkbank und halte E gedrückt.', done: (S) => S.stats.kwh >= 0.05 },
  { text: () => 'Kurble eine Autobatterie voll.', prog: (S) => [Math.max(0, ...S.stores.filter((s) => s.t === 'auto').map((s) => s.kwh)), 1, 'kWh'], done: (S) => S.stores.some((s) => s.kwh >= STORES[s.t].cap - 0.005) || S.stats.sold > 0 || S.stats.jobs > 0 },
  { text: () => 'Nimm die volle Batterie mit E und wirf sie hinten in den Pickup vor der Halle.', done: (S) => S.stats.loaded > 0 || S.stats.sold > 0 || S.stats.jobs > 0 },
  { text: () => 'Steig in den Pickup, fahr durch die Stadt zum Energiedepot (M zeigt die Karte) und drück in der Ladebucht F.', done: (S) => S.stats.sold > 0 },
  { text: () => 'Fahr zum Bunker im Wald und hol dir beim Auftraggeber einen Auftrag.', done: (S) => !!S.job || S.stats.jobs > 0 },
  { text: (S) => (S.job ? `Auftrag: Bring ${kwh(S.job.kwh)} zum Auftraggeber im Bunker.` : 'Erfülle einen Auftrag vom Auftraggeber im Bunker.'), prog: (S) => (S.job ? [S.job.got, S.job.kwh, 'kWh'] : null), done: (S) => S.stats.jobs > 0 },
  { text: () => `Ab ${clockText(SLEEP_FROM)} Uhr: Geh ins Büro in der Halle und leg dich am PC schlafen.`, done: (S) => S.stats.slept > 0 },
  { text: () => 'Erfülle Aufträge, bis ihr Level 2 seid.', prog: (S) => [S.xp, LEVELS[1], 'XP'], done: (S) => S.level >= 2 },
  { text: () => 'Kauf beim Schwarzmarkt (im Bunker oder am PC) den Fahrrad-Generator.', done: (S) => owns(S, 'fahrrad') },
  { text: () => 'Kauf Kabel und schließ das Fahrrad an: F am Fahrrad, dann F an einem freien Ladeplatz mit Speicher.', done: (S) => S.gens.some((g) => g.id === 'fahrrad' && linkOf(S, g.uid)) },
  { text: () => 'Hol dir in der Stadt einen Döner: damit hast du mehr Kraft.', done: (S) => S.stats.food > 0 },
];
function endQuest(S) {
  if (S.level < MAX_LVL) { const x = xpSpan(S); return { text: `Erreiche Level ${S.level + 1}: Jeden Tag gibt es neue Aufträge.`, prog: [x.have, x.need, 'XP'] }; }
  if (!S.won && S.job && S.job.final) return { text: `Letzter Auftrag: Bringt ${FINAL_KWH.toLocaleString('de-DE')} kWh zum Auftraggeber im Bunker. Alles geht in Brunos Geschirrspüler.`, prog: [S.job.got, S.job.kwh, 'kWh'] };
  if (!S.won) return { text: 'Letzter Auftrag: Holt euch beim Auftraggeber im Bunker (oder am PC) den Auftrag „Brunos Geschirrspüler“.', prog: null };
  return { text: 'Geschafft! Brunos Geschirrspüler läuft wieder und die Stadt hat Strom. Die Halle gehört euch: Spielt einfach weiter.', prog: null };
}
export function questStep(S) { let ch = false; while (S.quest < QUESTS.length && QUESTS[S.quest].done(S)) { S.quest++; ch = true; } return ch; }
export function questNow(S) { const q = QUESTS[S.quest]; if (!q) return { ...endQuest(S), n: QUESTS.length, of: QUESTS.length, end: true }; return { text: q.text(S), prog: q.prog ? q.prog(S) : null, n: S.quest + 1, of: QUESTS.length, end: false }; }

// ---------------- Handlungen (Host prüft, who = Spieler-Schlüssel) ----------------
const lock = (lvl, S) => (lvl && S.level < lvl ? { ok: false, why: `Gibt es erst ab Level ${lvl}. XP bekommt ihr für Aufträge.` } : null);
const pay = (S, c) => { S.purse -= c; S.today.spent += c; };
export function buy(S, item, n = 1) {
  if (item.k === 'gen') {
    const g = GEN[item.id]; if (!g || !g.price) return { ok: false, why: 'Gibt es nicht' }; const lk = lock(g.lvl, S); if (lk) return lk;
    const have = countOf(S, g.id); if (have >= (g.multi || 1)) return { ok: false, why: g.multi ? 'Alle Plätze auf dem Dach sind belegt' : 'Steht schon in der Halle' };
    const price = priceOf(S, g.id); if (S.purse < price) return { ok: false, why: 'Zu wenig Geld' };
    pay(S, price); const uid = S.uid++; S.gens.push({ uid, id: g.id, k: have, on: false }); log(S, `Gekauft: ${g.name} (${euro(price)})`); questStep(S); return { ok: true, uid, text: `${g.name} gekauft. Der Händler baut es ein.` };
  }
  if (item.k === 'store') {
    const t = STORES[item.id]; if (!t) return { ok: false, why: 'Gibt es nicht' }; const lk = lock(t.lvl, S); if (lk) return lk; if (S.purse < t.price) return { ok: false, why: 'Zu wenig Geld' };
    pay(S, t.price); const id = S.uid++; const free = CHARGERS.find((c) => (c.big || t.size <= 2) && !storeAt(S, c.id) && (t.size <= 2 ? !c.big : true)) || CHARGERS.find((c) => (c.big || t.size <= 2) && !storeAt(S, c.id));
    S.stores.push({ id, t: item.id, kwh: 0, at: free ? { k: 'ch', ch: free.id } : (() => { const n = S.stores.filter((q) => q.at.k === 'ground').length; return { k: 'ground', x: -11.6 + (n % 5) * 0.8, z: 8.4 - (Math.floor(n / 5) % 4) * 0.8, lvl: 'boden' }; })() }); log(S, `Gekauft: ${t.name}`); return { ok: true, id, text: `${t.name} gekauft. Steht ${free ? 'am Ladeplatz ' + free.id : 'im Lager neben dem Tor (alle Ladeplätze sind belegt)'}.` };
  }
  if (item.k === 'cable') { const cost = CABLE_PRICE * n; if (S.purse < cost) return { ok: false, why: 'Zu wenig Geld' }; pay(S, cost); S.cables += n; return { ok: true, text: `${n} Kabel gekauft.` }; }
  if (item.k === 'fuel') { const f = FUELS[item.id]; if (!f || !f.shop) return { ok: false, why: 'Gibt es nicht' }; const lk = lock(f.lvl, S); if (lk) return lk; const cost = f.price * n; if (S.purse < cost) return { ok: false, why: 'Zu wenig Geld' }; pay(S, cost); S.fuel[item.id] += f.pack * n; return { ok: true, text: `${n} ${f.unit} ${f.name} geliefert.` }; }
  if (item.k === 'veh') { const v = VEHICLES[item.id]; if (!v || S.veh[item.id]) return { ok: false, why: 'Habt ihr schon' }; const lk = lock(v.lvl, S); if (lk) return lk; if (S.purse < v.price) return { ok: false, why: 'Zu wenig Geld' }; pay(S, v.price); S.veh[item.id] = { ...(item.id === 'van' ? SPOTS.parkVan : SPOTS.parkTruck) }; log(S, `Gekauft: ${v.name}`); return { ok: true, text: `${v.name} gekauft. Steht vor der Halle.` }; }
  if (item.k === 'tool') { const t = TOOLS[item.id]; if (!t) return { ok: false, why: 'Gibt es nicht' }; if (S.tools[item.id]) return { ok: false, why: 'Habt ihr schon' }; const lk = lock(t.lvl, S); if (lk) return lk; if (S.purse < t.price) return { ok: false, why: 'Zu wenig Geld' }; pay(S, t.price); S.tools[item.id] = true; log(S, `Gekauft: ${t.name}`); return { ok: true, text: `${t.name} gekauft. Jeder von euch hat jetzt eine.` }; }
  return { ok: false, why: '?' };
}
export function connect(S, uid, ch) {
  const g = genOf(S, uid); if (!g || !CHARGER[ch]) return { ok: false, why: 'Geht nicht' }; const old = linkOf(S, uid); if (old && old.ch === ch) return { ok: false, why: 'Hängt schon hier' };
  const need = cablesFor(g.id, ch, g.k); const back = old ? old.n : 0; if (S.cables + back < need) return { ok: false, why: `Ihr braucht ${need} Kabel (habt ${S.cables + back}). Kabel gibt es beim Händler.` };
  if (old) disconnect(S, uid); S.cables -= need; S.links.push({ gen: uid, ch, n: need }); questStep(S); return { ok: true, text: `${GEN[g.id].name} hängt jetzt an ${ch} (${need} Kabel).` };
}
export function disconnect(S, uid) { const i = S.links.findIndex((l) => l.gen === uid); if (i < 0) return { ok: false, why: 'Nicht angeschlossen' }; const l = S.links[i]; if (l.usb) return { ok: false, why: 'Das USB-Kabel bleibt dran' }; S.cables += l.n; S.links.splice(i, 1); return { ok: true, text: `Kabel abgezogen (${l.n} zurück).` }; }
export function toggle(S, uid) { const g = genOf(S, uid); const d = g && GEN[g.id]; if (!d || d.art !== 'brenn') return { ok: false, why: 'Hat keinen Schalter' }; if (!g.on && !(S.fuel[d.fuel] > 0)) return { ok: false, why: `Kein ${FUELS[d.fuel].name} da` }; g.on = !g.on; return { ok: true, text: `${d.name} ${g.on ? 'läuft' : 'aus'}.` }; }
export function feed(S, who, uid) { const g = genOf(S, uid); const d = g && GEN[g.id]; const c = S.carry[who]; if (!d || !c || c.k !== d.fuel) return { ok: false, why: 'Passt nicht' }; S.fuel[d.fuel] += c.n; const n = c.n; delete S.carry[who]; return { ok: true, text: `${n} ${FUELS[d.fuel].name} nachgelegt.` }; }
export function gather(S, who, kind, n) { if (kind === 'kohle' && S.level < MINE_LVL) return { ok: false, why: `Die Mine ist erst ab Level ${MINE_LVL} offen.` }; const c = S.carry[who]; if (c && c.k !== kind) return { ok: false, why: c.k === 'store' ? 'Du trägst schon einen Speicher' : `Du trägst schon ${FUELS[c.k].name}` }; const have = c ? c.n : 0; if (have >= CARRY_MAX) return { ok: false, why: 'Mehr kannst du nicht tragen' }; const add = Math.min(n, CARRY_MAX - have); S.carry[who] = { k: kind, n: have + add }; return { ok: true, n: have + add, add }; }
export function pick(S, who, id) { const s = S.stores.find((q) => q.id === id); if (!s || !STORES[s.t].carry) return { ok: false, why: 'Zu schwer zum Tragen' }; if (S.carry[who]) return { ok: false, why: 'Du hast schon was in den Händen' }; if (s.at.k === 'hand') return { ok: false, why: 'Trägt schon jemand' }; s.at = { k: 'hand', who }; S.carry[who] = { k: 'store', id }; return { ok: true }; }
export function place(S, who, to) { // to: { k: 'ch', ch } | { k: 'veh', v } | { k: 'ground', x, z, lvl }
  const c = S.carry[who]; if (!c || c.k !== 'store') return { ok: false, why: 'Du trägst keinen Speicher' }; const s = S.stores.find((q) => q.id === c.id); if (!s) { delete S.carry[who]; return { ok: false, why: '?' }; }
  if (to.k === 'ch') { const ch = CHARGER[to.ch]; if (!ch) return { ok: false, why: '?' }; if (storeAt(S, to.ch)) return { ok: false, why: 'Da steht schon ein Speicher' }; if (!ch.big && STORES[s.t].size > 2) return { ok: false, why: 'Zu groß für diesen Platz' }; }
  if (to.k === 'veh') { const v = VEHICLES[to.v]; if (!S.veh[to.v]) return { ok: false, why: '?' }; if (vehLoad(S, to.v) + STORES[s.t].size > v.cap) return { ok: false, why: `Der ${v.name} ist voll` }; if (s.kwh > 0.3) S.stats.loaded++; }
  s.at = { ...to }; s.fullSaid = false; delete S.carry[who]; questStep(S); return { ok: true };
}
export function loadContainer(S, id, v) { const s = S.stores.find((q) => q.id === id); const V = VEHICLES[v]; if (!s || !V || !S.veh[v]) return { ok: false, why: '?' }; if (!V.container) return { ok: false, why: 'Container passen nur auf den LKW' }; if (vehLoad(S, v) + STORES[s.t].size > V.cap) return { ok: false, why: 'Der LKW ist voll' }; s.at = { k: 'veh', v }; S.stats.loaded++; return { ok: true, text: 'Container ist auf dem LKW.' }; }
export function unloadContainer(S, id, ch) { const s = S.stores.find((q) => q.id === id); if (!s || !CHARGER[ch] || !CHARGER[ch].big || storeAt(S, ch)) return { ok: false, why: 'Kein freier großer Ladeplatz' }; s.at = { k: 'ch', ch }; s.fullSaid = false; return { ok: true, text: `Container steht an ${ch}.` }; }
export function sell(S, v) {
  const list = S.stores.filter((s) => s.at.k === 'veh' && s.at.v === v && s.kwh > 0.001); const e = list.reduce((a, s) => a + s.kwh, 0); if (e <= 0.001) return { ok: false, why: 'Im Wagen ist kein Strom' };
  const money = Math.round(e * priceFor(S.day)); for (const s of list) { s.kwh = 0; s.fullSaid = false; } S.purse += money; S.stats.sold += e; S.stats.money += money; S.today.sold += e; S.today.money += money; log(S, `Am Depot verkauft: ${kwh(e)} für ${euro(money)}`); questStep(S); return { ok: true, e, money, text: `${kwh(e)} abgegeben: +${euro(money)}` };
}

// ---------------- Bäume fällen (mit der Axt), Holz aufsammeln ----------------
export function chop(S, who, i, ang = 0) {
  const t = TREES[i]; if (!t) return { ok: false, why: '?' }; if (!S.tools.axt) return { ok: false, why: `Dafür braucht ihr die Axt vom Händler (ab Level ${TOOLS.axt.lvl}).` }; const st = treeStage(S, i); if (st < 2) return { ok: false, why: 'Der ist noch zu klein.' };
  const need = st === 3 ? TREE_HITS : 2; const hp = (S.treeHp[i] || 0) + 1; if (hp < need) { S.treeHp[i] = hp; return { ok: true, hit: hp, need }; }
  delete S.treeHp[i]; S.trees[i] = S.day; const n = st === 3 ? TREE_WOOD : YOUNG_WOOD; const id = S.uid++; const d = 2.6 * t.s; S.drops.push({ id, k: 'holz', n, x: Math.round((t.x + Math.sin(ang) * d) * 100) / 100, z: Math.round((t.z + Math.cos(ang) * d) * 100) / 100 }); if (S.drops.length > 40) S.drops.shift();
  S.stats.wood += n; S.today.wood += n; return { ok: true, fell: true, i, ang, n, drop: id };
}
export function takeDrop(S, who, id) { const k = S.drops.findIndex((d) => d.id === id); if (k < 0) return { ok: false, why: 'Schon weg' }; const d = S.drops[k]; const r = gather(S, who, d.k, d.n); if (!r.ok) return r; d.n -= r.add; if (d.n <= 0) S.drops.splice(k, 1); return { ok: true, n: r.n }; }

// ---------------- Polizei an der Tür ----------------
export const OFFICER = 'Kommissarin Brandt';
export const QUESTIONS = [
  { q: 'Guten Tag. Uns wurde ein seltsames Brummen gemeldet. Was machen Sie hier drin?', a: [['Wir proben hier mit unserer Band. Schlagzeug, Bass, alles.', 2], ['Brummen? Das ist der Kühlschrank.', 0], ['Nichts! Hier wird ganz sicher kein Strom gemacht!', -3]] },
  { q: 'Ihr Stromzähler steht seit Wochen still. Wie erklären Sie das?', a: [['Wir sind sehr sparsam. Kerzenlicht, wissen Sie.', 1], ['Der ist kaputt. Haben wir schon gemeldet.', 2], ['Welcher Zähler?', -2]] },
  { q: 'Warum kommt da Rauch aus dem Dach?', a: [['Wir grillen. Wollen Sie eine Wurst?', 2], ['Das ist Nebel. Kommt vom Fluss.', 0], ['Rauch? Ich sehe keinen Rauch. Sie?', -1]] },
  { q: 'Darf ich mal kurz reinschauen?', a: [['Gern, aber der Hund ist gerade sehr schlecht gelaunt.', 1], ['Haben Sie einen Durchsuchungsbeschluss?', 0], ['Nein! Also ja. Also lieber nicht.', -3]] },
  { q: 'Ein Nachbar hat nachts einen Pickup voller Batterien gesehen.', a: [['Wir sammeln Altbatterien. Für die Umwelt.', 2], ['Das war bestimmt jemand anders.', 0], ['Die waren leer! Ehrlich!', -2]] },
  { q: 'Wem gehört diese Halle eigentlich?', a: [['Meiner Oma. Sie lässt grüßen.', 1], ['Einem Verein für Modelleisenbahnen.', 2], ['Das weiß hier keiner so genau.', -2]] },
  { q: 'Warum surrt hier das Kabel am Zaun?', a: [['Das ist eine Lichterkette. Wir feiern bald.', 2], ['Das ist ein Weidezaun. Für die Hühner.', 1], ['Nicht anfassen! Also … bitte nicht.', -2]] },
  { q: 'Wir haben Meldungen über Blitze, die immer hier einschlagen.', a: [['Pech. Die Halle zieht Blitze an.', 0], ['Das ist ein Blitzableiter. Ganz normal.', 2], ['Zufall. Totaler Zufall.', -1]] },
];
export function policeQuestions(seed, n = 3) { const r = rng(seed); const pool = QUESTIONS.map((q, i) => i); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } return pool.slice(0, n); }
// Ergebnis: Punkte der Antworten gegen den Verdacht (offenes Tor macht es schwerer)
export function policeVerdict(S, score, rand = Math.random) {
  const need = S.sus / 22 - 2.2 + (S.door.gate > 0.5 ? 2 : 0); const ok = score + (rand() * 2 - 1) >= need; const time = absTime(S); S.stats.police++; S.today.police++;
  if (ok) { S.sus = clamp(S.sus - 25, 0, 100); S.policeNext = time + 1440; log(S, 'Die Polizei ist wieder gegangen.'); return { ok: true, text: `${OFFICER}: „Na gut. Aber wir behalten Sie im Auge.“ Die Polizei fährt wieder.` }; }
  const fine = Math.min(S.purse, Math.max(5000, Math.round(S.purse * 0.15))); S.purse -= fine; S.stats.fines += fine; S.today.fines += fine; let lost = 0; for (const s of S.stores) if (s.at.k === 'ch') { lost += s.kwh; s.kwh = 0; s.fullSaid = false; }
  S.sus = clamp(S.sus - 40, 0, 100); S.policeNext = time + 1440 * 1.5; log(S, `Polizei: Bußgeld ${euro(fine)}, ${kwh(lost)} beschlagnahmt`); return { ok: false, fine, lost, text: `${OFFICER}: „Das glaube ich Ihnen nicht.“ Bußgeld ${euro(fine)}, der Strom in der Halle (${kwh(lost)}) wird beschlagnahmt.` };
}
export function policeIgnored(S) { S.sus = clamp(S.sus + 15, 0, 100); const time = absTime(S); S.policeNext = time + 600; log(S, 'Niemand hat der Polizei aufgemacht.'); return { text: 'Niemand hat aufgemacht. Die Polizei klebt einen Zettel an die Tür: „Wir kommen wieder.“ (Verdacht steigt)' }; }
