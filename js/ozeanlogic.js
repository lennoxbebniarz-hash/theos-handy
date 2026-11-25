// Theos Seitenscheidel - Trockne den Ozean aus: die Spielregeln (reine Logik, ohne three.js, läuft auch im Node-Test).
// Theos Handy ist in den Pazifik gefallen. Also wird der Pazifik leer geschöpft: erst mit dem Glas, dann mit Eimer, Pumpen, Tanklaster,
// Saug-U-Boot, Robotern und XXXXL-Pumpen. Wasser im eigenen Tank zum Händler am Steg bringen und verkaufen, vom Geld Besseres kaufen.
// Stufe 1 ist der Pazifik (Westen), Stufe 2 der Atlantik (Osten), dort liegt Brunos Goldkette. Kasse und Einkäufe gehören dem Team,
// jeder hat seinen eigenen Tank. Eine Spielminute dauert eine Sekunde, ab 20 Uhr kann man im Haus schlafen (die Roboter arbeiten nachts weiter).
// Langer Weg: Die Firma wächst in Stufen (verkaufte Liter schalten Neues frei), jedes Werkzeug und jede Roboterart lässt sich in Stufen verbessern,
// und am Meeresboden warten Schätze, die erst frei liegen, wenn das Wasser weg ist. Allein dauert alles zusammen gut drei Stunden
// (Stand 2026-11-13, auf Wunsch leichter gemacht: niedrigere Firmenstufen, alles ab der Handpumpe kostet nur noch 30 %, kleinerer Atlantik;
// mit dem Skillbaum wurde der Atlantik wieder etwas größer, damit es mit Skills bei knapp drei Stunden bleibt).
// Zweite Währung Meersalz (für jedes Prozent trockener Ozean, Aufgaben, Firmenstufen, Schätze und Salzkristalle am Meeresboden), dafür gibt es
// den Skillbaum mit drei Ästen: Körper (Schwimmen, Tauchen …), Hände (Schöpfen, Handel, Rohrpost …) und Technik (Roboter).
import TAB from './ozeantab.js';
import { SCHAETZE, SCHATZ_ARTEN, SALZKRISTALLE } from './ozeanmap.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const MIN_PER_SEC = 1; export const DAY_START = 8 * 60; export const SLEEP_FROM = 20 * 60; export const NIGHT_SHIFT = 0.25; // Roboter schaffen nachts ein Viertel
export const MEERE = [
  { id: 'pazifik', name: 'Pazifik', liter: 250e6, preis: 1, ziel: 'Theos Handy', seite: 'Westen', farbe: '#2a7ae0' },
  { id: 'atlantik', name: 'Atlantik', liter: 1.3e9, preis: 2, ziel: 'Brunos Goldkette', seite: 'Osten', farbe: '#1fa8a0' },
];
// Firma: Die verkauften Liter (alle zusammen, mit Robotern) schalten Stufe für Stufe Neues frei
export const FIRMA = [
  { name: 'Ein Glas, ein Plan', ab: 0 },
  { name: 'Eimer-Brigade', ab: 25 },
  { name: 'Pumpen-Werkstatt', ab: 800 },
  { name: 'Wasserhandel Theo & Co.', ab: 10000 },
  { name: 'Ozean GmbH', ab: 120000 },
  { name: 'Ozean AG', ab: 1.2e6 },
  { name: 'Weltmeer-Konzern', ab: 12e6 },
  { name: 'Planetare Trockenlegung', ab: 320e6 },
  { name: 'Galaktische Wasserwerke', ab: 700e6 },
];
// Werkzeuge: wie viel Liter pro Sekunde man mit gedrücktem E schöpft (das beste gekaufte gilt für alle)
export const TOOLS = {
  glas: { name: 'Wasserglas', rate: 1, preis: 0, firma: 0, model: 'Glas', blurb: 'Ein ganz normales Trinkglas. Damit fängt alles an.' },
  eimer: { name: 'Eimer', rate: 5, preis: 12, firma: 1, model: 'Eimer', blurb: 'Ein Schwung, ein paar Liter. Fünfmal schneller als das Glas.' },
  handpumpe: { name: 'Handpumpe', rate: 25, preis: 120, firma: 2, model: 'Handpumpe', blurb: 'Schwengel rauf, Schwengel runter.' },
  motorpumpe: { name: 'Motorpumpe', rate: 120, preis: 3600, firma: 3, model: 'Motorpumpe', blurb: 'Die sehr große Pumpe mit Motor, Saug- und Druckschlauch.' },
  feuerwehr: { name: 'Feuerwehrpumpe', rate: 700, preis: 150000, firma: 5, model: 'Motorpumpe', blurb: 'Leihgabe der Feuerwehr Theostadt. Rot, laut, 700 Liter pro Sekunde.' },
};
export const TOOL_ORDER = ['glas', 'eimer', 'handpumpe', 'motorpumpe', 'feuerwehr'];
// Tanks: so viel Wasser trägt jeder mit sich (das beste gekaufte gilt für alle)
export const TANKS = {
  glas: { name: 'Glas', cap: 0.25, preis: 0, firma: 0, blurb: 'Ein Glas voll. Mehr passt nicht rein.' },
  kanister: { name: 'Kanister', cap: 10, preis: 3, firma: 0, blurb: '10 Liter.' },
  fass: { name: 'Fass', cap: 80, preis: 21, firma: 1, blurb: '80 Liter auf dem Rücken.' },
  ibc: { name: 'IBC-Container', cap: 1000, preis: 450, firma: 2, blurb: '1.000 Liter im Gitterkäfig.' },
  ruecken: { name: 'Rückentank', cap: 5000, preis: 7500, firma: 3, blurb: '5.000 Liter. Gut für den Rücken ist das nicht.' },
  gross: { name: 'Großtank', cap: 30000, preis: 90000, firma: 4, blurb: '30.000 Liter. Gilt auch im Tanklaster.' },
  riesen: { name: 'Riesentank', cap: 150000, preis: 1.2e6, firma: 5, blurb: '150.000 Liter. Gilt auch im Tanklaster.' },
  mega: { name: 'Megatank', cap: 800000, preis: 18e6, firma: 7, meer: 1, blurb: '800.000 Liter. Nur im Atlantik.' },
  ozean: { name: 'Ozeantank', cap: 5e6, preis: 210e6, firma: 8, meer: 1, blurb: 'Fünf Millionen Liter. Ein kleiner Ozean zum Mitnehmen.' },
};
export const TANK_ORDER = ['glas', 'kanister', 'fass', 'ibc', 'ruecken', 'gross', 'riesen', 'mega', 'ozean'];
// Fahrzeuge: je Spieler eins. Der Tanklaster fährt an Land und auf dem trockenen Meeresboden, hat einen eigenen Tank und eine Pumpe.
// Das Saug-U-Boot fährt nur im Wasser und schickt alles über sein Rohr direkt zum Händler (kein Tank, wird sofort bezahlt).
export const VEHICLES = {
  laster: { name: 'Tanklaster', preis: 60000, cap: 30000, rate: 600, max: 3, firma: 4, top: 55, model: 'Tanklaster', blurb: 'Eigener Tank mit 30.000 Litern (oder eurem größeren Tank) und eine Pumpe mit 600 Litern pro Sekunde. Fährt auch auf dem trockenen Meeresboden.' },
  uboot: { name: 'Saug-U-Boot', preis: 750000, rate: 2500, max: 3, firma: 5, top: 32, model: 'Tauchrobo', blurb: 'Fährt im Wasser und saugt 2.500 Liter pro Sekunde. Das Rohr führt zum Händler: Ihr bekommt sofort Geld.' },
};
// Helfer arbeiten allein am aktuellen Ozean, auch nachts (dann ein Viertel so schnell)
export const HELPERS = {
  helfer: { name: 'Helferroboter', rate: 2, preis: 90, max: [20, 20], firma: 2, model: 'Helfer', blurb: 'Läuft mit seinem Eimer zwischen Wasser und Händler hin und her.' },
  pump: { name: 'Pumproboter', rate: 20, preis: 1800, max: [20, 20], firma: 3, model: 'Pumprobo', blurb: 'Fährt auf Ketten ans Wasser und pumpt.' },
  schwimm: { name: 'Schwimmroboter', rate: 150, preis: 36000, max: [20, 20], firma: 4, model: 'Schwimmrobo', blurb: 'Schwimmt auf dem Wasser und saugt mit seinem Strahlrohr.' },
  xxxxl: { name: 'XXXXL-Pumpe', rate: 5000, preis: 1.5e6, max: [8, 12], firma: 5, model: 'XXXXL', blurb: '7 Meter hoch. Die Leitung folgt dem Wasser bis ganz nach unten.' },
};
export const HELPER_ORDER = ['helfer', 'pump', 'schwimm', 'xxxxl'];
export const TURBO = { name: 'Turbo für alle Roboter und Pumpen', preis: 270e6, mult: 2, meer: 1, firma: 8, blurb: 'Alle Helfer und XXXXL-Pumpen schaffen doppelt so viel.' };
export const GROWTH = 1.16; // jeder weitere Helfer derselben Art kostet 16 % mehr
// Verbesserungen in Stufen: Schöpftechnik (Werkzeug von Hand) und je Roboterart. Jede Stufe +25 %, der Preis steigt stark.
export const UP_MAX = 10; export const UP_STEP = 0.25;
export const UPGRADES = {
  tool: { name: 'Schöpftechnik', base: 18, mal: 2.4, firma: 1, blurb: 'Schneller schöpfen und pumpen von Hand (alle Werkzeuge, auch im Laster).' },
  helfer: { name: 'Helferroboter: größere Eimer', base: 1500, mal: 2.4, firma: 2, blurb: 'Alle Helferroboter schaffen mehr.' },
  pump: { name: 'Pumproboter: stärkere Motoren', base: 24000, mal: 2.4, firma: 3, blurb: 'Alle Pumproboter schaffen mehr.' },
  schwimm: { name: 'Schwimmroboter: dickere Strahlrohre', base: 600000, mal: 2.4, firma: 4, blurb: 'Alle Schwimmroboter schaffen mehr.' },
  xxxxl: { name: 'XXXXL-Pumpe: größere Laufräder', base: 18e6, mal: 2.4, firma: 5, blurb: 'Alle XXXXL-Pumpen schaffen mehr.' },
};
export const UP_ORDER = ['tool', 'helfer', 'pump', 'schwimm', 'xxxxl'];
// Meersalz: so viel gibt es wofür (Salzkristalle je nach Tiefe 2 bis 5)
export const SALZ = { prozent: 1, aufgabe: 2, firma: 4, schatz: 3, kristallMin: 2, kristallMax: 5 };
// Skillbaum: drei Äste, jeder Skill braucht den davor. Salz und Skills gehören dem ganzen Team.
export const AESTE = [
  { id: 'koerper', name: 'Körper', farbe: '#3f9be8', blurb: 'Laufen, schwimmen, tauchen' },
  { id: 'haende', name: 'Hände', farbe: '#f9bd00', blurb: 'Schöpfen und Handel' },
  { id: 'technik', name: 'Technik', farbe: '#3fbf7a', blurb: 'Roboter und Maschinen' },
];
export const SKILLS = {
  sprint: { ast: 'koerper', name: 'Sprinter', icon: '👟', kosten: 8, need: null, blurb: 'Du läufst und rennst 30 % schneller.' },
  schwimmen: { ast: 'koerper', name: 'Schwimmen', icon: '🏊', kosten: 15, need: 'sprint', blurb: 'Du kommst ins tiefe Wasser und schwimmst. Schwimmend schöpfst du überall, auch mitten im Ozean.' },
  tauchen: { ast: 'koerper', name: 'Tauchen', icon: '🤿', kosten: 30, need: 'schwimmen', blurb: 'Im Wasser tauchst du runter und holst Schätze und Salzkristalle, die bis zu 4 m tief liegen.' },
  tiefsee: { ast: 'koerper', name: 'Tiefseetaucher', icon: '🐙', kosten: 55, need: 'tauchen', blurb: 'Tauchen bis 15 m tief: Fast alles am Meeresboden ist erreichbar.' },
  delfin: { ast: 'koerper', name: 'Delfin', icon: '🐬', kosten: 90, need: 'tiefsee', blurb: 'Im Wasser schwimmst du doppelt so schnell und schöpfst schwimmend doppelt so viel.' },
  arme: { ast: 'haende', name: 'Starke Arme', icon: '💪', kosten: 8, need: null, blurb: 'Schöpfen von Hand 50 % schneller (mit jedem Werkzeug).' },
  rucksack: { ast: 'haende', name: 'Großer Rucksack', icon: '🎒', kosten: 15, need: 'arme', blurb: 'In jeden Tank passt die Hälfte mehr, auch in den Tanklaster.' },
  feilschen: { ast: 'haende', name: 'Feilschen', icon: '🤝', kosten: 30, need: 'rucksack', blurb: 'Der Händler zahlt 20 % mehr für Wasser von Hand, aus dem Laster und aus dem U-Boot.' },
  rohrpost: { ast: 'haende', name: 'Rohrpost', icon: '📮', kosten: 55, need: 'feilschen', blurb: 'Taste Q: Dein Tank saust per Rohrpost zum Händler, egal wo du gerade bist.' },
  meister: { ast: 'haende', name: 'Meisterschöpfer', icon: '🏆', kosten: 90, need: 'rohrpost', blurb: 'Schöpfen von Hand noch einmal doppelt so schnell, und ein voller Tank geht von selbst per Rohrpost weg.' },
  rabatt: { ast: 'technik', name: 'Roboter-Rabatt', icon: '🏷️', kosten: 10, need: null, blurb: 'Alle Roboter und XXXXL-Pumpen kosten im Laden 20 % weniger.' },
  nacht: { ast: 'technik', name: 'Nachtschicht', icon: '🌙', kosten: 18, need: 'rabatt', blurb: 'Nachts arbeiten die Roboter halb so schnell wie am Tag statt nur ein Viertel.' },
  sieder: { ast: 'technik', name: 'Salzsieder', icon: '🧂', kosten: 30, need: 'nacht', blurb: 'Doppelt so viel Meersalz aus Salzkristallen und für jedes Prozent trockener Ozean.' },
  ueberstunden: { ast: 'technik', name: 'Überstunden', icon: '⚙️', kosten: 60, need: 'sieder', blurb: 'Alle Roboter und XXXXL-Pumpen schaffen 20 % mehr.' },
  superchip: { ast: 'technik', name: 'KI-Superchip', icon: '🧠', kosten: 100, need: 'ueberstunden', blurb: 'Roboter, XXXXL-Pumpen, Tanklaster und U-Boot schaffen noch einmal 25 % mehr.' },
};
export const SKILL_ORDER = Object.keys(SKILLS);
export const hasSkill = (S, id) => !!(S.skills && S.skills[id]);
export const tauchTiefe = (S) => (hasSkill(S, 'tiefsee') ? 15 : hasSkill(S, 'tauchen') ? 4 : 0);
// Texte der Flaschenposten (eine je Fundstück)
export const FLASCHENPOST = [
  'Wer das liest, ist doof. Gruß, Bruno', 'Hilfe! Ich bin auf einer einsamen Insel. Ach nee, das ist jetzt ja Festland.', 'Einkaufsliste: Milch, Brot, 400 Millionen Liter Wasser zurück.',
  'Lieber Finder, die Krake hat mein Handy auch geklaut.', 'Ich hab meine Brille verloren. Falls du sie siehst: Ich seh dich nicht.', 'Theo war hier. Glaub ich.', 'Rezept für Pazifik: Wasser, Salz, viel Geduld.',
];

// ---------------- Formate ----------------
const dots = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export function euro(v) { const r = Math.round((v || 0) * 100) / 100; if (Math.abs(r) >= 1e7) return (r < 0 ? '−' : '') + (Math.abs(r) / 1e6).toFixed(Math.abs(r) >= 1e9 ? 0 : 1).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Mio. €'; const s = Math.abs(r).toFixed(2).split('.'); return (r < 0 ? '−' : '') + dots(s[0]) + (s[1] === '00' ? '' : ',' + s[1]) + ' €'; }
export function liter(v) { v = Math.max(0, v || 0); if (v < 10) return v.toFixed(2).replace('.', ',').replace(/,00$/, '') + ' l'; return dots(Math.round(v)) + ' l'; }
export function bigLiter(v) { v = Math.max(0, v || 0); if (v >= 1e9) return (v / 1e9).toFixed(2).replace('.', ',') + ' Mrd. Liter'; if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace('.', ',') + ' Mio. Liter'; return dots(Math.round(v)) + ' Liter'; }
export const clockText = (min) => { const m = ((Math.floor(min) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

// ---------------- Spielstand ----------------
const UP0 = () => ({ tool: 0, helfer: 0, pump: 0, schwimm: 0, xxxxl: 0 });
export function newSave() {
  return { v: 4, meer: 0, rest: MEERE.map((m) => m.liter), geld: 0, tool: 'glas', tank: 'glas', fill: {}, vfill: {}, helfer: { helfer: 0, pump: 0, schwimm: 0, xxxxl: 0 }, up: UP0(), turbo: 0, veh: { laster: 0, uboot: 0 }, vpos: {},
    day: 1, clock: DAY_START, done: [false, false], scene: { intro: false, mitte: false, ende: false }, flags: { pc: false, tiere: [false, false] }, quest: 0, won: null, firma: 0, schatz: [[], []],
    salz: 0, skills: {}, kristall: [[], []], salzPct: [0, 0],
    stats: { liter: 0, geld: 0, verkauft: 0, sales: 0, salesA: 0, nacht: 0, ausgegeben: 0, schaetze: 0, spielzeit: 0, salz: 0, kristalle: 0 }, today: { liter: 0, geld: 0, ausgegeben: 0 }, log: [] };
}
export function fixSave(o) {
  const S = newSave(); if (!o || typeof o !== 'object') return S;
  const old = !o.v || o.v < 2; // Spielstand aus der ersten Fassung (kleinere Ozeane): Anteil übernehmen
  for (const k of Object.keys(S)) if (o[k] !== undefined) S[k] = o[k];
  for (const k of ['helfer', 'veh', 'stats', 'today', 'scene', 'flags', 'up']) S[k] = { ...newSave()[k], ...(o[k] || {}) };
  if (!TOOLS[S.tool]) S.tool = 'glas'; if (!TANKS[S.tank]) S.tank = 'glas'; if (!Array.isArray(S.rest) || S.rest.length !== 2) S.rest = MEERE.map((m) => m.liter);
  if (old && Array.isArray(o.rest) && o.rest.length === 2) { const L0 = [5e6, 40e6]; S.rest = o.rest.map((r, i) => clamp((Number(r) || 0) / L0[i], 0, 1) * MEERE[i].liter); }
  else if ((o.v === 2 || o.v === 3) && Array.isArray(o.rest) && o.rest.length === 2) S.rest[1] = clamp((Number(o.rest[1]) || 0) / (o.v === 2 ? 1.6e9 : 1e9), 0, 1) * MEERE[1].liter; // Fassung 2 und 3 hatten einen anderen Atlantik (1,6 und 1 Mrd.): Anteil übernehmen
  S.rest = S.rest.map((r, i) => clamp(Number(r) || 0, 0, MEERE[i].liter)); S.meer = S.meer === 1 ? 1 : 0; if (!Array.isArray(S.done)) S.done = [false, false]; S.v = 4;
  if (!S.fill || typeof S.fill !== 'object') S.fill = {}; if (!S.vfill || typeof S.vfill !== 'object') S.vfill = {}; if (!S.vpos || typeof S.vpos !== 'object') S.vpos = {}; if (!Array.isArray(S.log)) S.log = [];
  if (!Array.isArray(S.flags.tiere)) S.flags.tiere = [false, false]; if (!Array.isArray(S.schatz) || S.schatz.length !== 2) S.schatz = [[], []];
  for (const k of UP_ORDER) S.up[k] = clamp(Math.floor(Number(S.up[k]) || 0), 0, UP_MAX); S.firma = firmaOf(S);
  S.salz = Math.max(0, Math.floor(Number(S.salz) || 0)); if (!S.skills || typeof S.skills !== 'object' || Array.isArray(S.skills)) S.skills = {}; for (const k of Object.keys(S.skills)) if (!SKILLS[k]) delete S.skills[k];
  if (!Array.isArray(S.kristall) || S.kristall.length !== 2) S.kristall = [[], []]; if (!Array.isArray(S.salzPct) || S.salzPct.length !== 2) S.salzPct = [0, 0]; // alte Stände bekommen das Salz für schon trockene Prozente nachgezahlt
  return S;
}
export function addSalz(S, n) { n = Math.max(0, Math.round(n)); S.salz = (S.salz || 0) + n; S.stats.salz = (S.stats.salz || 0) + n; return n; }
function log(S, text) { S.log.unshift({ text, day: S.day, clock: S.clock }); if (S.log.length > 40) S.log.length = 40; }

// ---------------- Ozean: Pegel aus der Wassermenge ----------------
// Anteil Wasser (0..1) -> Wasserhöhe in Metern (0 = voll, Boden = tief). Die Tabelle kommt aus Blender (Form des Beckens).
export function levelOf(i, rest) {
  const T = TAB[MEERE[i].id]; const k = clamp(rest / MEERE[i].liter, 0, 1); if (k <= 0) return T.tief - 0.5; const want = k * T.m3[T.m3.length - 1];
  let a = 0; let b = T.m3.length - 1; while (b - a > 1) { const c = (a + b) >> 1; if (T.m3[c] < want) a = c; else b = c; }
  const f = (want - T.m3[a]) / Math.max(1e-9, T.m3[b] - T.m3[a]); return T.pegel[a] + (T.pegel[b] - T.pegel[a]) * clamp(f, 0, 1);
}
export const levels = (S) => [levelOf(0, S.rest[0]), levelOf(1, S.rest[1])];
export const drained = (S, i = S.meer) => 1 - S.rest[i] / MEERE[i].liter;
export const BODEN = MEERE.map((m) => TAB[m.id].boden); export const HAFEN = MEERE.map((m) => TAB[m.id].hafen); export const TIEF = MEERE.map((m) => TAB[m.id].tief);

// ---------------- Werte ----------------
export const firmaOf = (S) => { let f = 0; for (let k = 0; k < FIRMA.length; k++) if ((S.stats.verkauft || 0) >= FIRMA[k].ab) f = k; return f; };
export const handMult = (S) => (hasSkill(S, 'arme') ? 1.5 : 1) * (hasSkill(S, 'meister') ? 2 : 1);
export const robotMult = (S) => (hasSkill(S, 'ueberstunden') ? 1.2 : 1) * (hasSkill(S, 'superchip') ? 1.25 : 1);
export const vehMult = (S) => (hasSkill(S, 'superchip') ? 1.25 : 1);
export const priceMult = (S) => (hasSkill(S, 'feilschen') ? 1.2 : 1);
export const toolRate = (S) => TOOLS[S.tool].rate * (1 + UP_STEP * (S.up.tool || 0)) * handMult(S);
export const toolOf = (S) => TOOLS[S.tool]; export const tankOf = (S) => TANKS[S.tank];
export const capOf = (S, veh) => (veh ? Math.max(VEHICLES[veh.split(':')[0]].cap || 0, TANKS[S.tank].cap) : TANKS[S.tank].cap) * (hasSkill(S, 'rucksack') ? 1.5 : 1);
export const fillOf = (S, who, veh) => (veh ? S.vfill[veh] || 0 : S.fill[who] || 0);
export const helperRateOf = (S, k) => HELPERS[k].rate * (S.helfer[k] || 0) * (1 + UP_STEP * (S.up[k] || 0)) * (S.turbo ? TURBO.mult : 1) * robotMult(S);
export const helperRate = (S) => HELPER_ORDER.reduce((a, k) => a + helperRateOf(S, k), 0);
export const helperPrice = (S, k) => Math.round(HELPERS[k].preis * Math.pow(GROWTH, S.helfer[k] || 0) * (hasSkill(S, 'rabatt') ? 0.8 : 1));
export const helperMax = (S, k) => HELPERS[k].max[S.meer];
export const upPrice = (S, k) => Math.round(UPGRADES[k].base * Math.pow(UPGRADES[k].mal, S.up[k] || 0));
export const priceNow = (S) => MEERE[S.meer].preis;
export const allDry = (S) => S.done[0] && S.done[1];
export const lasterRate = (S) => Math.max(VEHICLES.laster.rate, TOOLS[S.tool].rate) * (1 + UP_STEP * (S.up.tool || 0)) * vehMult(S);
export const ubootRate = (S) => VEHICLES.uboot.rate * (1 + UP_STEP * (S.up.tool || 0)) * vehMult(S);

// ---------------- Schöpfen und Verkaufen ----------------
// who schöpft dt Sekunden lang aus Ozean i (veh: im Tanklaster, z. B. 'laster:0'). Gibt die Liter zurück.
export function scoop(S, who, dt, i, veh, swim) { // swim: schwimmend (mit dem Skill „Delfin“ doppelt so viel)
  if (i !== S.meer) return { ok: false, why: i === 1 ? 'Erst der Pazifik! Theos Handy liegt da drin.' : 'Der Pazifik ist schon trocken.' };
  if (S.rest[i] <= 0) return { ok: false, why: `Der ${MEERE[i].name} ist leer.` };
  const rate = veh ? lasterRate(S) : toolRate(S) * (swim && hasSkill(S, 'delfin') ? 2 : 1); const cap = capOf(S, veh); const have = fillOf(S, who, veh);
  if (have >= cap - 1e-9) return { ok: false, full: true, why: veh ? 'Der Tank im Laster ist voll. Ab zum Händler!' : 'Dein Tank ist voll. Ab zum Händler am Steg!' };
  const n = Math.min(rate * Math.max(0, dt), cap - have, S.rest[i]); if (veh) S.vfill[veh] = have + n; else S.fill[who] = have + n;
  S.rest[i] -= n; S.stats.liter += n; S.today.liter += n; return { ok: true, n, full: have + n >= cap - 1e-9 };
}
// Verkauf am Händler: alles aus dem eigenen Tank (oder dem des Lasters)
export function sell(S, who, veh, atMeer = S.meer) {
  const n = fillOf(S, who, veh); if (n <= 1e-9) return { ok: false, why: veh ? 'Der Laster ist leer.' : 'Dein Tank ist leer. Erst Wasser schöpfen!' };
  const money = n * MEERE[S.meer].preis * priceMult(S); if (veh) S.vfill[veh] = 0; else S.fill[who] = 0; S.geld += money; S.stats.geld += money; S.today.geld += money; S.stats.verkauft += n; S.stats.sales++; if (S.meer === 1 && atMeer === 1) S.stats.salesA++;
  return { ok: true, n, money, text: `${liter(n)} verkauft: +${euro(money)}` };
}
// Rohrpost (Skill): den eigenen Tank von überall verkaufen
export function rohrpost(S, who) { if (!hasSkill(S, 'rohrpost')) return { ok: false, why: 'Dafür braucht ihr den Skill „Rohrpost“ (Skillbaum, Taste K).' }; const r = sell(S, who, null, S.meer); if (r.ok) r.text = `Rohrpost: ${r.text}`; return r; }
// Saug-U-Boot: saugt dt Sekunden lang, das Rohr bringt alles direkt zum Händler
export function suck(S, dt, i) {
  if (i !== S.meer || S.rest[i] <= 0) return { ok: false }; const n = Math.min(ubootRate(S) * dt, S.rest[i]); const money = n * MEERE[i].preis * priceMult(S);
  S.rest[i] -= n; S.geld += money; S.stats.liter += n; S.stats.geld += money; S.stats.verkauft += n; S.today.liter += n; S.today.geld += money; if (i === 1) S.stats.salesA = Math.max(1, S.stats.salesA); return { ok: true, n, money };
}

// ---------------- Schätze ----------------
export const SCHATZ = SCHAETZE;
export const schatzWert = (m, s) => Math.round(MEERE[m].liter * MEERE[m].preis * 0.0016 * Math.pow(clamp(-s.bed / Math.abs(TIEF[m]), 0.05, 1), 1.5) * SCHATZ_ARTEN[s.kind].faktor / 10) * 10 + 50;
export const schatzFrei = (S, m, n) => { const s = SCHATZ[m][n]; return !!s && levelOf(m, S.rest[m]) < s.bed + 0.05; };
export const tiefeUeber = (S, m, s) => levelOf(m, S.rest[m]) - s.bed; // wie viel Wasser über einem Fundstück steht
export const ertauchbar = (S, m, s) => tiefeUeber(S, m, s) <= tauchTiefe(S) + 1e-9;
export function collect(S, m, n, dive) { // dive: schwimmend runtergetaucht (Skill „Tauchen“)
  const s = SCHATZ[m] && SCHATZ[m][n]; if (!s) return { ok: false, why: '?' }; if (S.schatz[m].includes(n)) return { ok: false, why: 'Den hat schon jemand geborgen.' };
  if (!schatzFrei(S, m, n) && !(dive && tauchTiefe(S) > 0 && ertauchbar(S, m, s))) return { ok: false, why: tauchTiefe(S) ? `Zu tief zum Tauchen (${Math.round(tiefeUeber(S, m, s))} m). Erst weiter austrocknen!` : 'Da ist noch Wasser drüber. Erst weiter austrocknen (oder den Skill „Tauchen“ lernen)!' };
  const v = schatzWert(m, s); S.schatz[m].push(n); S.geld += v; S.stats.geld += v; S.stats.schaetze = (S.stats.schaetze || 0) + 1; const art = SCHATZ_ARTEN[s.kind].name; addSalz(S, SALZ.schatz);
  const post = s.kind === 'flasche' ? FLASCHENPOST[(n + m * 3) % FLASCHENPOST.length] : null; log(S, `${art} geborgen: +${euro(v)}`);
  return { ok: true, money: v, name: art, post, text: `${art} geborgen: +${euro(v)} und +${SALZ.schatz} Meersalz` };
}
// Salzkristalle: aufsammeln, wenn das Wasser weg ist (oder tauchend). Je tiefer, desto mehr Salz.
export const KRISTALL = SALZKRISTALLE;
export const kristallWert = (S, s) => Math.round(SALZ.kristallMin + (SALZ.kristallMax - SALZ.kristallMin) * s.k) * (hasSkill(S, 'sieder') ? 2 : 1);
export const kristallFrei = (S, m, n) => { const s = KRISTALL[m][n]; return !!s && levelOf(m, S.rest[m]) < s.bed + 0.05; };
export function sammeln(S, m, n, dive) {
  const s = KRISTALL[m] && KRISTALL[m][n]; if (!s) return { ok: false, why: '?' }; if (S.kristall[m].includes(n)) return { ok: false, why: 'Die hat schon jemand eingesammelt.' };
  if (!kristallFrei(S, m, n) && !(dive && tauchTiefe(S) > 0 && ertauchbar(S, m, s))) return { ok: false, why: tauchTiefe(S) ? `Zu tief zum Tauchen (${Math.round(tiefeUeber(S, m, s))} m).` : 'Die Salzkristalle liegen unter Wasser. Erst austrocknen (oder den Skill „Tauchen“ lernen)!' };
  S.kristall[m].push(n); const v = addSalz(S, kristallWert(S, s)); S.stats.kristalle = (S.stats.kristalle || 0) + 1; return { ok: true, salz: v, text: `Salzkristalle: +${v} Meersalz` };
}

// ---------------- Skillbaum ----------------
export function canLearn(S, id) {
  const k = SKILLS[id]; if (!k) return { ok: false, why: '?' }; if (hasSkill(S, id)) return { ok: false, have: true, why: 'Schon gelernt.' };
  if (k.need && !hasSkill(S, k.need)) return { ok: false, lock: true, why: `Erst „${SKILLS[k.need].name}“ lernen.` };
  if ((S.salz || 0) < k.kosten) return { ok: false, poor: true, why: `Zu wenig Meersalz: ${k.kosten} nötig, ihr habt ${S.salz || 0}.` };
  return { ok: true, kosten: k.kosten };
}
export function learn(S, id) { const c = canLearn(S, id); if (!c.ok) return c; S.salz -= c.kosten; S.skills[id] = 1; log(S, `Skill gelernt: ${SKILLS[id].name}`); return { ok: true, name: SKILLS[id].name, text: `Skill gelernt: ${SKILLS[id].icon} ${SKILLS[id].name}` }; }
export const learnable = (S) => SKILL_ORDER.filter((id) => canLearn(S, id).ok);

// ---------------- Kaufen ----------------
// item: { k: 'tool'|'tank'|'veh'|'helfer'|'up'|'turbo', id }
export function priceOf(S, item) {
  if (item.k === 'tool') return TOOLS[item.id].preis; if (item.k === 'tank') return TANKS[item.id].preis; if (item.k === 'veh') return VEHICLES[item.id].preis * (1 + 0.5 * (S.veh[item.id] || 0));
  if (item.k === 'helfer') return helperPrice(S, item.id); if (item.k === 'up') return upPrice(S, item.id); if (item.k === 'turbo') return TURBO.preis; return Infinity;
}
const gate = (S, f) => (firmaOf(S) < (f || 0) ? { ok: false, lock: true, firma: f, why: `Erst ab Firmenstufe ${f + 1}: „${FIRMA[f].name}“ (${bigLiter(FIRMA[f].ab)} verkauft).` } : null);
export function canBuy(S, item) {
  const p = priceOf(S, item); let g = null;
  if (item.k === 'tool') { const t = TOOLS[item.id]; if (!t) return { ok: false, why: '?' }; if (TOOL_ORDER.indexOf(S.tool) >= TOOL_ORDER.indexOf(item.id)) return { ok: false, have: true, why: 'Habt ihr schon (oder etwas Besseres).' }; g = gate(S, t.firma); }
  else if (item.k === 'tank') { const t = TANKS[item.id]; if (!t) return { ok: false, why: '?' }; if (TANK_ORDER.indexOf(S.tank) >= TANK_ORDER.indexOf(item.id)) return { ok: false, have: true, why: 'Habt ihr schon (oder einen größeren).' }; if (t.meer && S.meer < t.meer) return { ok: false, lock: true, why: 'Erst im Atlantik zu haben.' }; g = gate(S, t.firma); }
  else if (item.k === 'veh') { const v = VEHICLES[item.id]; if (!v) return { ok: false, why: '?' }; if ((S.veh[item.id] || 0) >= v.max) return { ok: false, have: true, why: `Mehr als ${v.max} braucht ihr nicht.` }; g = gate(S, v.firma); }
  else if (item.k === 'helfer') { const h = HELPERS[item.id]; if (!h) return { ok: false, why: '?' }; if ((S.helfer[item.id] || 0) >= helperMax(S, item.id)) return { ok: false, have: true, why: S.meer === 0 && h.max[1] > h.max[0] ? `Im Pazifik höchstens ${h.max[0]}. Im Atlantik gehen mehr.` : `Mehr als ${helperMax(S, item.id)} passen nicht an den Hafen.` }; g = gate(S, h.firma); }
  else if (item.k === 'up') { const u = UPGRADES[item.id]; if (!u) return { ok: false, why: '?' }; if ((S.up[item.id] || 0) >= UP_MAX) return { ok: false, have: true, why: 'Höchste Stufe erreicht.' }; g = gate(S, u.firma); }
  else if (item.k === 'turbo') { if (S.turbo) return { ok: false, have: true, why: 'Der Turbo läuft schon.' }; if (S.meer < TURBO.meer) return { ok: false, lock: true, why: 'Erst im Atlantik zu haben.' }; g = gate(S, TURBO.firma); }
  else return { ok: false, why: '?' };
  if (g) return g;
  if (allDry(S)) return { ok: false, why: 'Es gibt kein Wasser mehr. Ihr habt alles geschafft!' };
  if (S.geld + 1e-6 < p) return { ok: false, poor: true, price: p, why: `Zu wenig Geld: ${euro(p)} nötig.` };
  return { ok: true, price: p };
}
export function buy(S, item) {
  const c = canBuy(S, item); if (!c.ok) return c; const p = c.price; S.geld -= p; S.stats.ausgegeben += p; S.today.ausgegeben += p; let name = '';
  if (item.k === 'tool') { S.tool = item.id; name = TOOLS[item.id].name; }
  else if (item.k === 'tank') { S.tank = item.id; name = TANKS[item.id].name; }
  else if (item.k === 'veh') { const n = S.veh[item.id] || 0; S.veh[item.id] = n + 1; name = VEHICLES[item.id].name; const key = `${item.id}:${n}`; S.vpos[key] = null; if (item.id === 'laster') S.vfill[key] = 0; }
  else if (item.k === 'helfer') { S.helfer[item.id] = (S.helfer[item.id] || 0) + 1; name = HELPERS[item.id].name; }
  else if (item.k === 'up') { S.up[item.id] = (S.up[item.id] || 0) + 1; name = `${UPGRADES[item.id].name} (Stufe ${S.up[item.id]})`; }
  else if (item.k === 'turbo') { S.turbo = 1; name = TURBO.name; }
  log(S, `Gekauft: ${name} für ${euro(p)}`); return { ok: true, price: p, name, text: `Gekauft: ${name} (−${euro(p)})` };
}

// ---------------- Zeit: Helfer arbeiten, die Uhr läuft, der Ozean wird leer ----------------
// dt: echte Sekunden. Gibt Ereignisse zurück: { k: 'trocken', meer } | { k: 'tiere', meer } | { k: 'abend' } | { k: 'firma', stufe }
export function tick(S, dt) {
  const ev = []; const before = S.clock; S.clock += dt * MIN_PER_SEC; S.stats.spielzeit = (S.stats.spielzeit || 0) + dt; if (S.clock >= 1440) { S.clock -= 1440; S.day++; S.today = { liter: 0, geld: 0, ausgegeben: 0 }; }
  if (before < SLEEP_FROM && S.clock >= SLEEP_FROM) ev.push({ k: 'abend' });
  work(S, helperRate(S) * dt, ev); checkFirma(S, ev); return ev;
}
function work(S, n, ev) {
  const i = S.meer; if (allDry(S)) return 0; n = Math.min(n, S.rest[i]); if (n > 0) { const money = n * MEERE[i].preis; S.rest[i] -= n; S.geld += money; S.stats.liter += n; S.stats.geld += money; S.stats.verkauft += n; S.today.liter += n; S.today.geld += money; }
  checkDry(S, ev); return n;
}
// Neue Firmenstufe erreicht?
export function checkFirma(S, ev = []) { const f = firmaOf(S); if (f > (S.firma || 0)) { addSalz(S, SALZ.firma * (f - (S.firma || 0))); S.firma = f; log(S, `Neue Firmenstufe: ${FIRMA[f].name}`); ev.push({ k: 'firma', stufe: f }); } return ev; }
// Prüft, ob ein Ozean leer ist (auch nach dem Schöpfen von Hand aufrufen). Der Pazifik leer: weiter zum Atlantik.
export function checkDry(S, ev = []) {
  for (let m = 0; m < 2; m++) { const p = Math.floor(drained(S, m) * 100 + 1e-9); if (p > (S.salzPct[m] || 0)) { addSalz(S, (p - (S.salzPct[m] || 0)) * SALZ.prozent * (hasSkill(S, 'sieder') ? 2 : 1)); S.salzPct[m] = p; } } // Meersalz für jedes Prozent
  const i = S.meer; if (!S.flags.tiere[i] && drained(S, i) >= 0.85) { S.flags.tiere[i] = true; ev.push({ k: 'tiere', meer: i }); log(S, `Die Tiere aus dem ${MEERE[i].name} sind ins Becken am Haus umgezogen.`); }
  if (S.rest[i] <= 1e-6 && !S.done[i]) {
    S.rest[i] = 0; S.done[i] = true; S.flags.tiere[i] = true; log(S, `Der ${MEERE[i].name} ist trocken!`);
    if (i === 0) { S.meer = 1; for (const k of Object.keys(S.fill)) S.fill[k] = Math.min(S.fill[k], TANKS[S.tank].cap); }
    else S.won = { day: S.day, liter: Math.round(S.stats.liter), geld: Math.round(S.stats.geld), helfer: HELPER_ORDER.reduce((a, k) => a + (S.helfer[k] || 0), 0), zeit: Math.round(S.stats.spielzeit || 0), schaetze: S.stats.schaetze || 0 };
    ev.push({ k: 'trocken', meer: i });
  }
  return ev;
}
// Schlafen (ab 20 Uhr, im Bett): Die Nacht wird übersprungen, die Helfer arbeiten weiter (ein Viertel so schnell). Danach ist es 8 Uhr.
export function sleep(S) {
  if (S.clock < SLEEP_FROM && S.clock >= 5 * 60) return { ok: false, why: `Noch zu früh. Schlafen geht ab ${clockText(SLEEP_FROM)} Uhr.` };
  const mins = S.clock >= SLEEP_FROM ? 1440 - S.clock + DAY_START : DAY_START - S.clock; const ev = []; const geld0 = S.geld; const rest0 = S.rest[S.meer]; const meer = S.meer;
  const night = work(S, helperRate(S) * mins * 60 / MIN_PER_SEC / 60 * (hasSkill(S, 'nacht') ? 0.5 : NIGHT_SHIFT), ev); S.stats.nacht += night; checkFirma(S, ev);
  const rep = { day: S.day, today: { ...S.today }, night, nightMoney: S.geld - geld0, meer, rest: S.rest[meer], restBefore: rest0, helfer: helperRate(S) };
  S.day++; S.clock = DAY_START; S.today = { liter: 0, geld: 0, ausgegeben: 0 }; rep.next = S.day; log(S, `Geschlafen. Nachtschicht der Roboter: ${bigLiter(night)}`); return { ok: true, rep, ev };
}

// ---------------- Aufgaben (oben rechts) ----------------
const ti = (S) => TOOL_ORDER.indexOf(S.tool); const ki = (S) => TANK_ORDER.indexOf(S.tank); const firmaQ = (f) => ({ t: `Wachst zur Firmenstufe ${f + 1}: „${FIRMA[f].name}“. Dafür ${bigLiter(FIRMA[f].ab)} verkaufen.`, ok: (S) => firmaOf(S) >= f, prog: (S) => [S.stats.verkauft, FIRMA[f].ab, 'l'] });
const geld = (p) => (S) => [S.geld, p(), '€'];
export const QUESTS = [
  { t: 'Geh runter zum Pazifik (westlich vom Haus) und halte am Wasser E gedrückt: Du schöpfst mit dem Glas.', ok: (S) => S.stats.liter > 0 || S.stats.sales > 0 },
  { t: 'Bring das Wasser zum Wasserhändler am Steg und verkauf es (E am Händler).', ok: (S) => S.stats.sales > 0 },
  { t: 'Kauf beim Händler einen Kanister (10 Liter).', ok: (S) => ki(S) >= 1, prog: geld(() => TANKS.kanister.preis) },
  { t: 'Kauf einen Eimer: Damit schöpfst du viel schneller.', ok: (S) => ti(S) >= 1, prog: geld(() => TOOLS.eimer.preis) },
  { t: 'Kauf ein Fass (80 Liter).', ok: (S) => ki(S) >= 2, prog: geld(() => TANKS.fass.preis) },
  { t: 'Verbessert eure Schöpftechnik (Laden, Reiter „Verbessern“).', ok: (S) => S.up.tool > 0, prog: geld(() => UPGRADES.tool.base) },
  firmaQ(2),
  { t: 'Ihr habt Meersalz gesammelt! Drück K und lerne im Skillbaum euren ersten Skill.', ok: (S) => Object.keys(S.skills || {}).length > 0, prog: (S) => [S.salz || 0, 5, 'Salz'] },
  { t: 'Stell einen Helferroboter ein. Er schöpft weiter, auch wenn ihr woanders seid.', ok: (S) => S.helfer.helfer > 0, prog: geld(() => HELPERS.helfer.preis) },
  { t: 'Geh ins Haus und setz dich an den PC (E): Dort könnt ihr Theos Handy orten.', ok: (S) => !!S.flags.pc },
  { t: 'Kauf eine Handpumpe.', ok: (S) => ti(S) >= 2, prog: geld(() => TOOLS.handpumpe.preis) },
  { t: 'Kauf einen IBC-Container (1.000 Liter).', ok: (S) => ki(S) >= 3, prog: geld(() => TANKS.ibc.preis) },
  firmaQ(3),
  { t: 'Kauft einen Pumproboter.', ok: (S) => S.helfer.pump > 0, prog: geld(() => HELPERS.pump.preis) },
  { t: 'Kauft eine Motorpumpe.', ok: (S) => ti(S) >= 3, prog: geld(() => TOOLS.motorpumpe.preis) },
  { t: 'Am Meeresboden liegen Schätze! Sobald das Wasser weg ist, könnt ihr sie bergen (E). Der PC zeigt, wo.', ok: (S) => (S.stats.schaetze || 0) > 0 },
  firmaQ(4),
  { t: 'Das Wasser zieht sich zurück: Kauft den Tanklaster. Er fährt auch auf dem trockenen Meeresboden.', ok: (S) => S.veh.laster > 0, prog: geld(() => VEHICLES.laster.preis) },
  { t: 'Kauft einen Schwimmroboter.', ok: (S) => S.helfer.schwimm > 0, prog: geld(() => HELPERS.schwimm.preis) },
  firmaQ(5),
  { t: 'Kauft das Saug-U-Boot. Es saugt im Wasser, das Rohr bringt alles direkt zum Händler.', ok: (S) => S.veh.uboot > 0, prog: geld(() => VEHICLES.uboot.preis) },
  { t: 'Stellt eine XXXXL-Pumpe am Hafen auf.', ok: (S) => S.helfer.xxxxl > 0, prog: geld(() => HELPERS.xxxxl.preis) },
  firmaQ(6),
  { t: 'Trocknet den Pazifik aus! Theos Handy liegt ganz unten.', ok: (S) => S.done[0], prog: (S) => [MEERE[0].liter - S.rest[0], MEERE[0].liter, 'l'] },
  { atl: true, t: 'Auf zum Atlantik (östlich vom Haus)! Dort liegt Brunos Goldkette. Der Händler am Atlantik-Steg zahlt 2 € pro Liter.', ok: (S) => S.stats.salesA > 0 || drained(S, 1) > 0.01 },
  firmaQ(7),
  { t: 'Kauft den Megatank (800.000 Liter).', ok: (S) => ki(S) >= 7, prog: geld(() => TANKS.mega.preis) },
  firmaQ(8),
  { t: 'Holt den Turbo für alle Roboter und Pumpen.', ok: (S) => !!S.turbo, prog: geld(() => TURBO.preis) },
  { t: 'Trocknet den Atlantik aus! Brunos Goldkette liegt ganz unten.', ok: (S) => S.done[1], prog: (S) => [MEERE[1].liter - S.rest[1], MEERE[1].liter, 'l'] },
];
export function questNow(S) {
  // Meilensteine überspringen Aufgaben, die man ausgelassen hat (wer den Pazifik leer hat, braucht keinen Kanister mehr)
  const atl = QUESTS.findIndex((q) => q.atl); if (S.done[0] && S.quest < atl) S.quest = atl; if (S.done[1]) S.quest = QUESTS.length;
  while (S.quest < QUESTS.length && QUESTS[S.quest].ok(S)) { S.quest++; addSalz(S, SALZ.aufgabe); } // jede erledigte Aufgabe bringt Meersalz
  if (S.quest >= QUESTS.length) return { end: true, n: QUESTS.length, of: QUESTS.length, text: 'Geschafft! Pazifik und Atlantik sind staubtrocken.' };
  const q = QUESTS[S.quest]; return { n: S.quest + 1, of: QUESTS.length, text: q.t, prog: q.prog ? q.prog(S) : null };
}

// ---------------- Nachrichten auf dem PC (je nach Fortschritt) ----------------
export function news(S) {
  const p = drained(S, 0); const a = drained(S, 1); const out = []; const f = firmaOf(S);
  out.push(['Theostadt-Kurier', 'Junger Mann verliert Handy im Pazifik. Will ihn jetzt austrinken.']);
  if (p > 0.0001) out.push(['Meeresforschung', `Rätsel um den Pazifik: Pegel ${p > 0.2 ? 'stark ' : ''}gesunken. Forscher vermuten „ein Glas oder so“.`]);
  if (S.helfer.helfer > 0) out.push(['Technik-Blog', 'Roboter mit Eimer gesichtet. Er sagt nichts, er schöpft nur.']);
  if (f >= 3) out.push(['Wirtschaft', `Neue Firma „${FIRMA[f].name}“ handelt mit Meerwasser. Kunden: unbekannt.`]);
  if ((S.stats.schaetze || 0) > 0) out.push(['Schatzsuche', `Schon ${S.stats.schaetze} Schätze am trockenen Meeresboden geborgen. Piraten sind sauer.`]);
  if (S.veh.laster > 0) out.push(['Verkehr', 'Tanklaster fährt auf dem Meeresboden. Die Polizei weiß nicht, ob das erlaubt ist.']);
  if (p > 0.3) out.push(['Wetter', 'Strände werden breiter. Sehr viel breiter.']);
  if (p > 0.5) out.push(['Seefahrt', 'Schiffe liegen auf dem Trockenen. Kapitäne verlangen ihr Wasser zurück.']);
  if (S.veh.uboot > 0) out.push(['Seefahrt', 'Gelbes U-Boot saugt den Ozean leer. Kapitän: „Läuft.“']);
  if (S.flags.tiere[0]) out.push(['Tierwelt', 'Wal, Hai und Krake ziehen in einen Pool hinter einem Einfamilienhaus.']);
  if (S.done[0]) out.push(['Eilmeldung', 'Der Pazifik ist trocken! Bruno: „Den Atlantik schafft ihr nie.“']);
  if (a > 0.3) out.push(['Börse', 'Atlantikwasser so teuer wie nie. Käufer unbekannt.']);
  if (S.done[1]) out.push(['Eilmeldung', 'Auch der Atlantik ist leer. Bruno will seine Goldkette zurück.']);
  return out.reverse();
}
