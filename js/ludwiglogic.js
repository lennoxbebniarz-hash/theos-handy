// Theos Seitenscheidel - Ludwig Zigaretti (intern ludwig): Regeln ohne Grafik. Ludwigs Eltern sind streng, also dreht er heimlich Kippen und verkauft sie durchs Fenster.
// Teil 1 (2026-11-19): Drehen in vier Klicks am großen Tisch, gemeinsame Box mit Stufen (voll = Schluss), Kippen selbst zum Fenster tragen, Feilschen mit den Kunden,
// Upgrades am PC (Box, Taschen, Drehtempo), Material im Hinterhof vom Kiosk. Geld in Cent (ganze Zahlen). Läuft auch in node --test.

// Teil 3 (2026-11-19): Respekt, Boss-Plan (Skilltree, ludwigskills.js) und Handy mit 1 Minute Bildschirmzeit. Maschinen drehen und Boten verkaufen von selbst.
import { custMul, costMul } from './ludwigmp.js'; // Balance nach Spielerzahl (2026-11-21)
import { neuesPaket, fixPaket, tarnung } from './ludwigextra.js'; // Abstimmung Paket 4 (2026-11-22)
import { KLINES } from './ludwigvoice.js';
import { KTEXT, LEUTE } from './ludwigtexte.js';
import { fxOf, NODE, gainResp, lvl } from './ludwigskills.js';
import { newWelt, fixWelt } from './ludwigwelt.js';
import { newBunker, fixBunker, bunkerOpen, bunkerRates } from './ludwigbunker.js';
export { gainResp };

export const ROLL_STEPS = [
  { id: 'papier', name: 'Papier', verb: 'Blättchen hinlegen' },
  { id: 'tabak', name: 'Tabak', verb: 'Tabak einstreuen' },
  { id: 'drehen', name: 'Drehen', verb: 'Drehen' },
  { id: 'klopfen', name: 'Klopfen', verb: 'Festklopfen' },
];
export const START = { geld: 500, papier: 10, tabak: 10 };
export const KIOSK = [
  { id: 'papier', name: 'Blättchen', pack: 50, preis: 100, text: 'Ein Heftchen mit 50 Stück.' },
  { id: 'tabak', name: 'Tabakbeutel', pack: 25, preis: 500, text: 'Feinschnitt, reicht für 25 Kippen.' },
  // seit 2026-11-20: Material für die neuen Sorten (erscheint bei Kalle, sobald die Sorte im Boss-Plan frei ist)
  { id: 'huelsen', name: 'Filterhülsen', pack: 100, preis: 300, sorte: 'stopf', text: 'Hundert Hülsen mit Filter, zum Stopfen.' },
  { id: 'kapseln', name: 'Aromakapseln', pack: 20, preis: 400, sorte: 'aroma', text: 'Kirsche, Menthol, Vanille. Knacken im Filter.' },
  { id: 'deckblatt', name: 'Deckblätter', pack: 10, preis: 600, sorte: 'zigarillo', text: 'Feine Tabakblätter für Zigarillos.' },
  { id: 'tips', name: 'Filtertips', pack: 50, preis: 150, sorte: 'joint', text: 'Pappe zum Falten, für Joints.' },
  { id: 'gras', name: 'Gras', pack: 10, preis: 2500, sorte: 'joint', text: 'Kalles Spezialware. Reicht für 10 Joints. Riecht.' },
];
// Upgrades am PC: jede Reihe hat Stufen, Stufe 0 hat man von Anfang an
export const UPGRADES = {
  box: { name: 'Box für die Kippen', tiers: [
    { name: 'Schuhkarton', cap: 50, preis: 0, text: 'Passt unter jedes Bett.' },
    { name: 'Holzkiste', cap: 200, preis: 2500, text: 'Stabil, mit Deckel.' },
    { name: 'Koffer', cap: 1000, preis: 12000, text: 'Opas alter Reisekoffer.' },
    { name: 'Geheimfach im Schrank', cap: 5000, preis: 60000, text: 'Drei Fächer voller Kippen.' },
  ] },
  // seit 2026-11-20 Plätze statt fester Menge (Inventar): ein Platz = ein Stapel einer Sorte, bis 10 Stück (STACK). cap = slots × 10
  pocket: { name: 'Tragen', tiers: [
    { name: 'Hände', cap: 30, slots: 3, preis: 0, text: 'Drei Plätze, je zehn Stück.', spec: '3 Plätze à 10 Stück' },
    { name: 'Hosentaschen', cap: 40, slots: 4, preis: 1500, text: 'Ausgebeult, aber praktisch.', spec: '4 Plätze à 10 Stück' },
    { name: 'Bauchtasche', cap: 50, slots: 5, preis: 6000, text: 'Sehr unauffällig. Wirklich.', spec: '5 Plätze à 10 Stück' },
    { name: 'Cargohose', cap: 60, slots: 6, preis: 25000, text: 'Sechs Taschen. Mindestens.', spec: '6 Plätze à 10 Stück' },
  ] },
  roller: { name: 'Drehen', tiers: [
    { name: 'Bloße Finger', speed: 1, preis: 0, text: 'Langsam, aber ehrlich.' },
    { name: 'Drehbrett', speed: 1.4, preis: 2000, text: 'Alles 40 % schneller.' },
    { name: 'Drehmaschine', speed: 2, preis: 9000, text: 'Doppelt so schnell.' }, // hieß bis 2026-11-20 „Stopfmaschine“ (der Name gehört jetzt dem Werkzeug für Stopfkippen)
    { name: 'Profi-Drehset', speed: 3, preis: 30000, text: 'Dreimal so schnell.' },
  ] },
  // seit 2026-11-19: mehr Upgrades für Geld
  // Rucksack für den Einkauf draußen (seit 2026-11-19 statt der Kumpel-Stühle: die Kumpels helfen nicht mehr mit). cap = Packungen pro Gang
  sack: { name: 'Rucksack', tiers: [
    { name: 'Turnbeutel', cap: 4, preis: 0, text: 'Eigentlich für Sportsachen.', spec: 'Platz für 4 Packungen' },
    { name: 'Schulrucksack', cap: 8, preis: 2000, text: 'Mit Fach für Hausaufgaben. Theoretisch.', spec: 'Platz für 8 Packungen' },
    { name: 'Wanderrucksack', cap: 16, preis: 8000, text: 'Vom Opa. Riecht nach Wald.', spec: 'Platz für 16 Packungen' },
    { name: 'Rollkoffer', cap: 40, preis: 30000, text: 'Mama denkt, du fährst ins Schullandheim.', spec: 'Platz für 40 Packungen' },
  ] },
  // seit 2026-11-20: Materialkiste neben Ludwigs Stuhl (Lennox: nicht unendlich kaufen, alles muss verstaut werden). Ein Fach = eine Packung eines Materials
  kiste: { name: 'Materialkiste', tiers: [
    { name: 'Obstkiste', slots: 6, preis: 0, text: 'Vom Gemüsehändler. Riecht nach Äpfeln.', spec: '6 Fächer für Material' },
    { name: 'Werkzeugkasten', slots: 10, preis: 3000, text: 'Mit Einsätzen, alles an seinem Platz.', spec: '10 Fächer für Material' },
    { name: 'Kistenstapel', slots: 16, preis: 12000, text: 'Zwei Kisten übereinander. Hält schon.', spec: '16 Fächer für Material' },
    { name: 'Kistenturm', slots: 24, preis: 40000, text: 'Drei Kisten hoch. Bloß nicht anstoßen.', spec: '24 Fächer für Material' },
  ] },
  pack: { name: 'Verpackung', tiers: [
    { name: 'Lose in der Hand', price: 0, preis: 0, text: 'Hauptsache Kippe.', spec: 'Normale Preise' },
    { name: 'Butterbrottüte', price: 0.1, preis: 2500, text: 'Sieht fast ordentlich aus.', spec: 'Kunden zahlen 10 % mehr' },
    { name: 'Metalldose', price: 0.2, preis: 10000, text: 'Mit Ludwig-Aufkleber.', spec: 'Kunden zahlen 20 % mehr' },
    { name: 'Edel-Etui', price: 0.35, preis: 40000, text: 'Wie aus dem Duty-free.', spec: 'Kunden zahlen 35 % mehr' },
  ] },
  duft: { name: 'Raumduft', tiers: [
    { name: 'Offenes Fenster', warn: 0, preis: 0, text: 'Zieht ein bisschen.', spec: 'Normale Warnzeit' },
    { name: 'Duftbäumchen', warn: 3, preis: 2000, text: 'Riecht nach Tanne. Ein bisschen.', spec: '+3 s zum Verstecken' },
    { name: 'Luftreiniger', warn: 6, preis: 9000, text: 'Brummt leise, filtert alles.', spec: '+6 s zum Verstecken' },
    { name: 'Profi-Ozongerät', warn: 10, preis: 35000, text: 'Mama wundert sich über die frische Luft.', spec: '+10 s zum Verstecken' },
  ] },
  akku: { name: 'Handy-Powerbank', tiers: [
    { name: 'Kein Zubehör', screen: 0, preis: 0, text: 'Das Handy, wie es ist.', spec: '1 Minute Bildschirmzeit' },
    { name: 'Kleine Powerbank', screen: 15, preis: 1500, text: 'Passt in die Hosentasche.', spec: '+15 s Bildschirmzeit' },
    { name: 'Große Powerbank', screen: 30, preis: 6000, text: 'Zwei Kabel, ein Plan.', spec: '+30 s Bildschirmzeit' },
    { name: 'Zweithandy', screen: 60, preis: 25000, text: 'Mama weiß nichts davon.', spec: '+60 s Bildschirmzeit' },
  ] },
};
export const UP_ORDER = ['box', 'pocket', 'roller', 'sack', 'kiste', 'pack', 'duft', 'akku'];
// Wirkung der Geld-Upgrades (zusätzlich zum Boss-Plan)
const upv = (S, k, f) => (UPGRADES[k].tiers[Math.min((S.up && S.up[k]) || 0, UPGRADES[k].tiers.length - 1)][f] || 0);
// Elternkontrollen (erst nach dem Vorspann): die erste nach 3 Minuten (fest, Mama, sie sucht nicht), dann alle 3 bis 7 Minuten zufällig.
// 10 Sekunden Warnung zum Verstecken. Erwischt: ein Teil der Kippen, des Tabaks und der Blättchen ist weg, alles aus den Taschen, 60 s Hausarrest (keine Kunden).
export const ELTERN = { first: 180, min: 180, max: 420, warn: 10, arrest: 60, take: 0.3, checkChance: 0.35, smell: 0.25 };
// Die zwei Kumpels drehen am Tisch mit: je eine Kippe in KUMPEL.dur Sekunden aus dem gemeinsamen Material
export const KUMPEL = { dur: 45 }; // langsamer seit 2026-11-19 (drei Kumpels, sonst viel zu viele Kippen)
export const KUNDE = { firstDelay: 1.4, gapMin: 13, gapMax: 24, queueMax: 3, patMin: 60, patMax: 90, wantMin: 1, wantMax: 4, priceBase: 100, priceVar: 20 };
export const BRUNO = { name: 'Bruno', want: 3, preis: 100, maxPreis: 150, maxMenge: 5, look: 0 };
// Kunden am Fenster. Bruno, Theo und Lennox sprechen mit ihren eigenen Stimmen (Fish Audio), die anderen mit ElevenLabs-Stimmen.
// Jeder Satz ist eine Aufnahme: media/ludwig/kunden/<stimme>_<satz>.mp3, die Texte stehen in ludwigvoice.js (KLINES).
export const CUSTOMERS = [ // fav: Lieblingssorten (seit 2026-11-20), werden dreimal so oft gewünscht
  { name: 'Bruno', voice: 'bruno', look: 0, fav: ['joint', 'kippe', 'vkirsche'] }, { name: 'Theo', voice: 'theo', look: 4, fav: ['zigarillo', 'stopf', 'vmenthol'] }, { name: 'Lennox', voice: 'lennox', look: 3, fav: ['aroma', 'joint', 'vmango'] },
  { name: 'Mia', voice: 'mia', look: 5, fav: ['aroma', 'vmango'] }, { name: 'Lea', voice: 'lea', look: 16, fav: ['aroma', 'stopf', 'vkirsche'] }, { name: 'Sophie', voice: 'sophie', look: 17, fav: ['stopf', 'aroma', 'vmenthol'] }, { name: 'Finn', voice: 'finn', look: 1, fav: ['joint', 'kippe', 'vmango'] }, { name: 'Jonas', voice: 'jonas', look: 2, fav: ['zigarillo', 'kippe', 'vmenthol'] }, // seit 2026-11-21 auch ein Lieblingsgeschmack bei den Vapes
  { name: 'Nele', voice: 'nele', look: 6, fav: ['aroma', 'vmango'] }, { name: 'Aylin', voice: 'aylin', look: 7, fav: ['stopf', 'vmenthol'] }, { name: 'Zoe', voice: 'zoe', look: 8, fav: ['kippe', 'vkirsche'] }, { name: 'Emre', voice: 'emre', look: 9, fav: ['aroma', 'stopf', 'vmango'] }, { name: 'Luca', voice: 'luca', look: 10, fav: ['kippe', 'vmenthol'] }, // Stimmen-Update 2026-11-22: zehn Kunden dazu
  { name: 'Kevin', voice: 'kevin', look: 11, fav: ['kippe', 'zigarillo', 'vkirsche'] }, { name: 'Oskar', voice: 'oskar', look: 12, fav: ['zigarillo', 'aroma'] }, { name: 'Manni', voice: 'manni', look: 13, fav: ['stopf', 'kippe'] }, { name: 'Opa Heinz', voice: 'heinz', look: 14, fav: ['zigarillo', 'kippe'] }, { name: 'Oma Hilde', voice: 'hilde', look: 15, fav: ['aroma', 'kippe', 'vkirsche'] },
];
export const NAMES = CUSTOMERS.map((c) => c.name);
export const LOOK_COUNT = 18; // Aussehen 0 ist Bruno, 6 bis 15 die zehn neuen Kunden, 16 und 17 Lea und Sophie (2026-11-22)
const SAYS = { dank: ['dank1', 'dank2', 'dank3'], weg: ['weg1', 'weg2'], teuer: ['teuer1', 'teuer2'] };
export const sayText = (id, voice) => (voice && KTEXT[voice] && KTEXT[voice][id]) || KLINES[id] || ''; // jeder Kunde hat eigene Worte

const clampN = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
const int = (v, d = 0) => Math.round(clampN(v, 0, 1e15, d));
const pick = (list, rnd) => list[Math.floor(rnd() * list.length) % list.length];
const tierOf = (S, k) => UPGRADES[k].tiers[Math.min(S.up[k] || 0, UPGRADES[k].tiers.length - 1)];
export const boxCap = (S) => tierOf(S, 'box').cap;
export const handCap = (S) => tierOf(S, 'pocket').cap;
export const rollSpeed = (S) => tierOf(S, 'roller').speed * (1 + fxOf(S).roll);
export const tier = tierOf;
// Handy: Mama hat 1 Minute Bildschirmzeit eingestellt. Sie läuft nur, solange das Handy draußen ist, und ist nach SCREEN.day Sekunden wieder voll.
export const SCREEN = { base: 60, day: 300 };
export const screenLimit = (S) => SCREEN.base + fxOf(S).screen + upv(S, 'akku', 'screen');
const qMax = (S) => KUNDE.queueMax + fxOf(S).queue;

export const newErg = () => ({ next: 100, rauchT: 0, gerochen: false, andrang: 0, angebot: 0, razzia: 0, letzt: '', tuer: '' }); // Ereignisse (ludwigereignis.js)
export function newSave() {
  return { v: 4, geld: START.geld, papier: START.papier, tabak: START.tabak, kippen: 0, hand: 0, roll: 0, up: { box: 0, pocket: 0, roller: 0, sack: 0, kiste: 0, pack: 0, duft: 0, akku: 0 }, sack: { tabak: 0, papier: 0, n: 0 }, buff: { energy: 0 }, queue: [], sorten: newSorten(), step: newSteps(), mat: newMat(), tools: {}, sorte: 'kippe', made: {}, sold: {}, quests: {}, teile: newTeile(), werk: newWerk(), kundeT: 0, brunoDone: false, brunoT: -1, nextId: 1, t: 0, introSeen: false, kumpels: false, eltern: { next: ELTERN.first, n: 0, arrest: 0, erwischt: 0, geschafft: 0 },
    gespr: {}, erg: newErg(), /* Gespräche und Ereignisse (Stimmen-Update 2026-11-22) */
    ...neuesPaket(), /* Abstimmung Paket 4: rad, deko, marke, chat */
    rauch: 0, sucht: { t: 0, sorte: 'kippe', zug: { vmango: 0, vmenthol: 0, vkirsche: 0 } }, /* selber rauchen, Regeln in ludwigsucht.js */
    respekt: 0, skills: {}, skillRev: 0, boss: false, screen: { left: SCREEN.base, next: SCREEN.day }, acc: { auto: 0, plant: 0, papier: 0, courier: 0, resp: 0 }, flags: {}, eggs: {}, bunker: newBunker(), welt: newWelt(),
    stats: { gedreht: 0, verkauft: 0, umsatz: 0, kunden: 0, verpasst: 0, gefeilscht: 0, kumpel: 0, respekt: 0, auto: 0, boten: 0, spiele: 0, vapes: 0 } };
}
function fixCustomer(c, S) {
  if (!c || typeof c !== 'object') return null; const want = Math.round(clampN(c.want, 1, 99, 1)); const max = clampN(c.max, -1, 600, -1); const preis = int(c.preis, KUNDE.priceBase) || KUNDE.priceBase;
  return { id: int(c.id, 0) || S.nextId++, name: String(c.name || 'Kunde').slice(0, 20), want, preis, maxPreis: Math.max(preis, int(c.maxPreis, Math.round(preis * 1.3))), maxMenge: Math.max(want, Math.round(clampN(c.maxMenge, 1, 999, want * 2))), tries: Math.round(clampN(c.tries, 0, 9, 0)), wait: max < 0 ? -1 : clampN(c.wait, 0, max, max), max, look: Math.round(clampN(c.look, 0, LOOK_COUNT - 1, 1)), voice: CUSTOMERS.some((q) => q.voice === c.voice) ? c.voice : ((CUSTOMERS.find((q) => q.name === c.name) || {}).voice || 'finn'), say: KLINES[c.say] ? c.say : 'k1_' + Math.min(4, want), text: String(c.text || '').slice(0, 160), bruno: !!c.bruno, sorte: SORTEN[c.sorte] ? c.sorte : 'kippe' };
}
export function fixSave(raw) {
  const S = newSave(); if (!raw || typeof raw !== 'object') return S;
  S.geld = int(raw.geld, S.geld); S.papier = int(raw.papier, S.papier); S.tabak = int(raw.tabak, S.tabak); S.kippen = int(raw.kippen, 0); S.hand = int(raw.hand, 0); S.roll = Math.round(clampN(raw.roll, 0, 3, 0));
  const up = raw.up || {}; if (up.sack === undefined && up.stuhl !== undefined) up.sack = up.stuhl; for (const k of UP_ORDER) S.up[k] = Math.round(clampN(up[k], 0, UPGRADES[k].tiers.length - 1, 0)); // alte Stände: Kumpel-Stühle werden zum Rucksack
  const sa = raw.sack || {}; S.sack = { tabak: int(sa.tabak, 0), papier: int(sa.papier, 0), n: Math.round(clampN(sa.n, 0, 999, 0)) }; for (const k of Object.keys(MATS)) if (sa[k]) S.sack[k] = int(sa[k], 0);
  const so = raw.sorten || {}; for (const k of Object.keys(S.sorten)) { const q = so[k] || {}; S.sorten[k] = { box: int(q.box, 0), hand: int(q.hand, 0) }; } const sp = raw.step || {}; for (const k of Object.keys(S.step)) S.step[k] = Math.round(clampN(sp[k], 0, SORTEN[k].steps.length - 1, 0));
  const ma = raw.mat || {}; for (const k of Object.keys(S.mat)) S.mat[k] = int(ma[k], 0); const to = raw.tools || {}; for (const k of Object.keys(TOOLS)) if (to[k]) S.tools[k] = true; S.sorte = SORTEN[raw.sorte] ? raw.sorte : 'kippe'; const md = raw.made || {}; const so2 = raw.sold || {}; for (const k of Object.keys(SORTEN)) { if (md[k]) S.made[k] = int(md[k], 0); if (so2[k]) S.sold[k] = int(so2[k], 0); } const qd = raw.quests && typeof raw.quests === 'object' ? raw.quests : {}; for (const k of Object.keys(qd).slice(0, 80)) if (qd[k]) S.quests[k] = true; S.buff = { energy: clampN((raw.buff || {}).energy, 0, 600, 0) }; fitPockets(S); /* zu viel in den Taschen (alte Stände): zurück in die Box statt löschen */
  S.brunoDone = !!raw.brunoDone; S.brunoT = clampN(raw.brunoT, -1, 60, -1); S.kundeT = clampN(raw.kundeT, 0, 120, 0); S.nextId = int(raw.nextId, 1) || 1; S.t = clampN(raw.t, 0, 1e9, 0);
  S.introSeen = !!raw.introSeen; S.kumpels = !!raw.kumpels; const el = raw.eltern || {}; S.eltern = { next: clampN(el.next, 5, 3600, ELTERN.first), n: int(el.n, 0), arrest: clampN(el.arrest, 0, 600, 0), erwischt: int(el.erwischt, 0), geschafft: int(el.geschafft, 0) };
  const st = raw.stats || {}; for (const k of Object.keys(S.stats)) S.stats[k] = int(st[k], 0);
  S.respekt = int(raw.respekt, 0); S.boss = !!raw.boss; const sk = raw.skills && typeof raw.skills === 'object' ? raw.skills : {};
  for (const [id, l] of Object.entries(sk)) { const n = NODE[id]; if (n) { const v = Math.round(clampN(l, 0, n.max, 0)); if (v > 0) S.skills[id] = v; } }
  const sc = raw.screen || {}; S.screen = { left: clampN(sc.left, 0, screenLimit(S), screenLimit(S)), next: clampN(sc.next, 0, SCREEN.day, SCREEN.day) };
  const ac = raw.acc || {}; for (const k of Object.keys(S.acc)) S.acc[k] = clampN(ac[k], 0, 1, 0); const fl = raw.flags && typeof raw.flags === 'object' ? raw.flags : {}; for (const k of Object.keys(fl).slice(0, 30)) S.flags[k] = !!fl[k]; const eg = raw.eggs && typeof raw.eggs === 'object' ? raw.eggs : {}; for (const k of EGGS) if (eg[k]) S.eggs[k] = true; /* gefundene Easter Eggs */
  S.bunker = fixBunker(raw.bunker); S.welt = fixWelt(raw.welt);
  if (Array.isArray(raw.queue)) for (const c of raw.queue.slice(0, qMax(S))) { const f = fixCustomer(c, S); if (f) S.queue.push(f); }
  for (const c of S.queue) S.nextId = Math.max(S.nextId, c.id + 1);
  if (!sortReady(S, S.sorte)) S.sorte = 'kippe'; // gewählte Sorte ohne Knoten oder Werkzeug: zurück auf Kippen
  const tl = raw.teile || {}; for (const k of TEIL_ORDER) S.teile[k] = int(tl[k], 0); const wk = raw.werk || {}; S.werk.liquid = FLAVORS.includes(wk.liquid) ? wk.liquid : null; const ab = wk.ablage || {}; for (const k of VAPES) S.werk.ablage[k] = int(ab[k], 0); // Vapes (Teil 2)
  sackRecount(S); // Packungen im Rucksack aus den Mengen zählen
  { const g = raw.gespr && typeof raw.gespr === 'object' && !Array.isArray(raw.gespr) ? raw.gespr : {}; for (const k of Object.keys(g).slice(0, 60)) if (LEUTE[k]) S.gespr[k] = clampN(g[k], 0, 1e9, 0); const e = raw.erg && typeof raw.erg === 'object' ? raw.erg : {}; S.erg.next = clampN(e.next, 5, 600, S.erg.next); S.erg.rauchT = clampN(e.rauchT, 0, 60, 0); S.erg.gerochen = !!e.gerochen; for (const k of ['andrang', 'angebot', 'razzia']) S.erg[k] = clampN(e[k], 0, 120, 0); } // Gespräche und Ereignisse
  { const su = raw.sucht && typeof raw.sucht === 'object' ? raw.sucht : {}; const z = su.zug || {}; S.rauch = clampN(raw.rauch, 0, 1, 0); S.sucht.t = int(clampN(su.t, 0, 300, 0)); S.sucht.sorte = SORTEN[su.sorte] && su.sorte !== 'joint' ? su.sorte : 'kippe'; for (const k of VAPES) S.sucht.zug[k] = Math.round(clampN(z[k], 0, 10, 0)); } // selber rauchen
  fixPaket(S, raw); // Abstimmung Paket 4
  return S;
}

// Geld als Text: 1250 -> "12,50 €"
export function euro(cents) { const n = Math.round(Number(cents) || 0); const neg = n < 0; const a = Math.abs(n); const e = Math.floor(a / 100); const c = String(a % 100).padStart(2, '0'); const t = String(e).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); return (neg ? '-' : '') + t + ',' + c + ' €'; }

// Nächster Dreh-Schritt. Ist die Box voll, fängt keine neue Kippe an. Boss-Plan: manchmal kein Tabak verbraucht (Ruhige Hände), manchmal eine Kippe extra.
export function roll(S, rnd = Math.random) {
  const step = S.roll; const f = fxOf(S);
  if (step === 0) { if (boxTotal(S) >= boxCap(S)) return { ok: false, need: 'box', step }; if (S.papier <= 0) return { ok: false, need: 'papier', step }; S.papier--; S.roll = 1; return { ok: true, step, done: false }; }
  if (step === 1) { if (S.tabak <= 0) return { ok: false, need: 'tabak', step }; const saved = f.tabakSave > 0 && rnd() < f.tabakSave; if (!saved) S.tabak--; S.roll = 2; return { ok: true, step, done: false, saved }; }
  if (step === 2) { S.roll = 3; return { ok: true, step, done: false }; }
  S.roll = 0; S.kippen++; S.stats.gedreht++; S.made.kippe = (S.made.kippe || 0) + 1; let extra = 0; if (f.dbl > 0 && boxTotal(S) < boxCap(S) && rnd() < f.dbl) { S.kippen++; S.stats.gedreht++; extra = 1; }
  return { ok: true, step: 3, done: true, extra };
}
// Wie viele Kippen sich mit dem Material noch fertig drehen lassen (eine angefangene zählt mit)
export function materialFor(S) {
  if (S.roll === 0) return Math.min(S.papier, S.tabak);
  if (S.roll === 1) return S.tabak > 0 ? 1 + Math.min(S.papier, S.tabak - 1) : 0;
  return 1 + Math.min(S.papier, S.tabak);
}

// Kippen aus der Box nehmen (bis die Taschen voll sind) und zurücklegen
export function take(S, id = 'kippe', max = Infinity) { // seit 2026-11-20 nach Plätzen: freie Plätze plus der Rest im angefangenen Stapel dieser Sorte
  const room = handRoom(S, id); if (room <= 0) return { ok: false, why: 'voll' }; const have = boxOf(S, id); if (have <= 0) return { ok: false, why: 'leer', id };
  const n = Math.min(room, have, Math.max(1, Math.floor(max))); addBox(S, id, -n); addHand(S, id, n); return { ok: true, n };
}
export function putBack(S, only = null, max = Infinity) { // only: nur diese Sorte, max: höchstens so viele (Inventar: ein Stapel, die Hälfte)
  if (handTotal(S) <= 0) return { ok: false, why: 'nichts' }; let space = boxCap(S) - boxTotal(S); if (space <= 0) return { ok: false, why: 'voll' }; let n = 0; let left = Math.max(1, Math.floor(max));
  for (const id of only ? [only] : SORT_ORDER) { const h = Math.min(space, left, handOf(S, id)); if (h > 0) { addHand(S, id, -h); addBox(S, id, h); space -= h; left -= h; n += h; } } return n > 0 ? { ok: true, n } : { ok: false, why: 'nichts' };
}

function newCustomer(S, rnd, opts = {}) {
  const f = fxOf(S); const max = opts.max !== undefined ? opts.max : Math.round((KUNDE.patMin + rnd() * (KUNDE.patMax - KUNDE.patMin)) * (1 + f.pat));
  const who0 = opts.name ? (CUSTOMERS.find((q) => q.name === opts.name) || CUSTOMERS[0]) : pick(CUSTOMERS, rnd); const sorte = opts.sorte || (opts.bruno ? 'kippe' : pickSorte(S, who0, rnd)); const D = SORTEN[sorte];
  const wr = wantRange(S); const want = opts.want || Math.min(D.maxWant || 999, Math.max(1, Math.round((wr.min + Math.floor(rnd() * (wr.max - wr.min + 1))) * D.mengen))); // Vapes: höchstens 3 auf einmal
  const preis = opts.preis || Math.round((D.preis + (rnd() * 2 - 1) * D.preis * KUNDE.priceVar / 100) * (1 + f.price + upv(S, 'pack', 'price')) / 5) * 5;
  const maxPreis = opts.maxPreis || Math.round(preis * (1.1 + rnd() * 0.5) / 5) * 5; const maxMenge = opts.maxMenge || want + Math.floor(rnd() * (want * 1.5 + 1));
  const who = who0; const look = opts.look !== undefined ? opts.look : who.look;
  const say = opts.say || sayFor(sorte, want, rnd);
  return { id: S.nextId++, name: who.name, voice: who.voice, want, preis, maxPreis, maxMenge, tries: 0, wait: max, max, look, say, text: sayText(say, who.voice), bruno: !!opts.bruno, sorte };
}
const gap = (rnd, S) => (KUNDE.gapMin + rnd() * (KUNDE.gapMax - KUNDE.gapMin)) * (1 - fxOf(S).gap);

// Zeit läuft: Geduld der Kunden, neue Kunden. Gibt Ereignisse zurück ({ k: 'kunde' | 'weg', c }).
export function tick(S, dt, rnd = Math.random) {
  const ev = []; if (!(dt > 0)) return ev; S.t += dt; if (S.buff && S.buff.energy > 0) S.buff.energy = Math.max(0, S.buff.energy - dt); // Energy-Drink wirkt zwei Minuten
  for (let i = S.queue.length - 1; i >= 0; i--) { const c = S.queue[i]; if (c.max < 0) continue; c.wait -= dt; if (c.wait <= 0) { S.queue.splice(i, 1); S.stats.verpasst++; const say = pick(SAYS.weg, rnd); ev.push({ k: 'weg', c, say, text: sayText(say, c.voice) }); } }
  if (!S.brunoDone) { // Bruno kommt, sobald die erste Kippe fertig ist, und wartet, bis er seine drei hat
    if (S.stats.gedreht >= 1 && !S.queue.some((c) => c.bruno)) { if (S.brunoT < 0) S.brunoT = KUNDE.firstDelay; S.brunoT -= dt; if (S.brunoT <= 0) { S.brunoT = -1; const c = newCustomer(S, rnd, { name: BRUNO.name, want: BRUNO.want, preis: BRUNO.preis, maxPreis: BRUNO.maxPreis, maxMenge: BRUNO.maxMenge, look: BRUNO.look, max: -1, say: 'bruno_first', bruno: true }); S.queue.unshift(c); ev.push({ k: 'kunde', c }); } }
    return ev;
  }
  if (S.eltern && S.eltern.arrest > 0) { S.eltern.arrest = Math.max(0, S.eltern.arrest - dt); return ev; } // Hausarrest: niemand klopft
  S.kundeT -= dt * custMul(S) * (S.erg && S.erg.andrang > 0 ? 2.5 : 1); // andrang: Ereignis Party oder Schulschluss. Mehrspieler: Kunden kommen öfter (zu viert doppelt so oft), zahlen aber nicht mehr
  if (S.kundeT <= 0) { if (S.queue.length < qMax(S)) { const c = newCustomer(S, rnd); S.queue.push(c); ev.push({ k: 'kunde', c }); } S.kundeT = gap(rnd, S); }
  return ev;
}

// ---- Von selbst (Boss-Plan): Nachschub von den Händlern und Boten, die aus der Box verkaufen. Maschinen, Plantage und Druckerei stehen im Bunker (ludwigbunker.js).
// Raten pro Minute; auto/tabak/papier zeigen die fertigen Bunker-Maschinen mit an.
export function autoRates(S) { const f = fxOf(S); const b = bunkerRates(S); return { auto: b.kippen, courier: f.courier * (1 + f.courierMult), tabak: f.supply + b.tabak, papier: f.supply + b.papier, supply: f.supply, courierPreis: Math.round(KUNDE.priceBase * (1 + f.price + f.courierPrice)) }; }
export function tickAuto(S, dt) {
  const out = { made: 0, sold: 0, cash: 0, resp: 0, tabak: 0, papier: 0 }; if (!(dt > 0)) return out; const r = autoRates(S); const A = S.acc; const m = dt / 60;
  const take = (k, rate) => { if (!(rate > 0)) return 0; A[k] += rate * m; const n = Math.floor(A[k]); if (n > 0) A[k] -= n; return n; };
  const t = take('plant', r.supply); if (t) { out.tabak = addMatCapped(S, 'tabak', t); out.papier = addMatCapped(S, 'papier', t); } // Nachschub nur, solange die Materialkiste Platz hat
  const c = take('courier', r.courier); if (c) { const n = Math.min(c, S.kippen); if (n > 0) { const cash = n * r.courierPreis; S.kippen -= n; S.geld += cash; S.stats.verkauft += n; S.stats.umsatz += cash; S.stats.boten += n; out.sold = n; out.cash = cash; out.resp = gainResp(S, n * 0.04); } }
  return out;
}
// ---- Bildschirmzeit: läuft nur bei offenem Handy. Gibt 'leer' (gerade aufgebraucht) oder 'voll' (wieder aufgeladen) zurück.
export function tickScreen(S, dt, open) {
  if (!(dt > 0)) return null; const sc = S.screen; const lim = screenLimit(S); let ev = null;
  if (open && sc.left > 0) { sc.left = Math.max(0, sc.left - dt); if (sc.left <= 0) ev = 'leer'; }
  if (sc.left < lim) { sc.next -= dt * (1 + fxOf(S).screenRegen); if (sc.next <= 0) { sc.left = lim; sc.next = SCREEN.day; if (!ev) ev = 'voll'; } } else { sc.left = Math.min(sc.left, lim + 600); sc.next = SCREEN.day; }
  return ev;
}
// ---- Minispiele auf dem Handy: Belohnung gutschreiben (mit Obergrenzen). Gibt zurück, was wirklich dazukam.
export const GAME_CAP = { tabak: 60, papier: 60, geld: 2000, resp: 25 };
export function rewardGame(S, r) {
  const g = { tabak: Math.min(GAME_CAP.tabak, int(r.tabak, 0)), papier: Math.min(GAME_CAP.papier, int(r.papier, 0)), geld: Math.min(GAME_CAP.geld, int(r.geld, 0)), resp: 0 };
  g.tabak = addMatCapped(S, 'tabak', g.tabak); g.papier = addMatCapped(S, 'papier', g.papier); S.geld += g.geld; if (r.resp > 0) g.resp = gainResp(S, Math.min(GAME_CAP.resp, r.resp)); S.stats.spiele++; return g;
}

// Feilschen am Fenster: Ludwig bietet n Kippen für preis (Cent pro Stück). Der Kunde nimmt an, macht ein Gegenangebot oder geht genervt.
export function offer(S, n, preis, rnd = Math.random) {
  const c = S.queue[0]; if (!c) return { ok: false, why: 'niemand' };
  n = Math.round(n); preis = Math.round(preis); if (!(n >= 1) || !(preis >= 5)) return { ok: false, why: 'ungueltig' };
  const sid = c.sorte || 'kippe'; const have = handOf(S, sid); if (have < n) return { ok: false, why: 'hand', fehlt: n - have, c, say: 'hand1', text: sayText('hand1', c.voice) };
  if (n > c.maxMenge) return { ok: false, why: 'zuviel', c, n: c.maxMenge, say: 'zuviel1', text: sayText('zuviel1', c.voice) };
  if (preis > c.maxPreis) {
    c.tries++; S.stats.gefeilscht++;
    if (c.tries >= 3) { S.queue.shift(); S.stats.verpasst++; return { ok: false, why: 'weg', c, say: 'genervt1', text: sayText('genervt1', c.voice) }; }
    if (c.max > 0) c.wait = Math.max(5, c.wait - 10); const p = Math.floor(c.maxPreis / 10) * 10 || c.maxPreis;
    const say = pick(SAYS.teuer, rnd); return { ok: false, why: 'teuer', c, preis: p, say, text: sayText(say, c.voice) };
  }
  if (preis > c.preis || n > c.want) S.stats.gefeilscht++;
  addHand(S, sid, -n); const cash = n * preis; S.geld += cash; S.stats.verkauft += n; S.stats.umsatz += cash; S.stats.kunden++; S.queue.shift(); S.sold = S.sold || {}; S.sold[sid] = (S.sold[sid] || 0) + n;
  let say = n < c.want ? 'wenig1' : pick(SAYS.dank, rnd); if (c.bruno) { S.brunoDone = true; S.kundeT = 6; say = 'bruno_dank'; }
  // Respekt (seit 2026-11-19 knapper): halber Punkt pro Kunde, +0,5 bei fairem Preis (nicht über seinem Angebot), +0,5 ab 5 Kippen, Bruno gibt extra
  const resp = gainResp(S, 0.5 + (n >= 5 ? 0.5 : 0) + (preis <= c.preis ? 0.5 : 0) + (c.bruno ? 2 : 0) + (sid === 'zigarillo' || sid === 'joint' || (SORTEN[sid] && SORTEN[sid].werkbank) ? 0.5 : 0)); // teure Sorten bringen etwas mehr Respekt
  return { ok: true, c, n, cash, say, text: sayText(say, c.voice), resp };
}

// Hinterhof vom Kiosk: Pakete kaufen
export const kioskItem = (id) => KIOSK.find((k) => k.id === id) || ERWIN.find((k) => k.id === id) || null; // seit 2026-11-21 auch Elektro-Erwins Teile
export const kioskPrice = (S, it) => (it.erwin ? it.preis : Math.max(5, Math.round(it.preis * (1 - fxOf(S).kioskDisc) * (S.erg && S.erg.angebot > 0 ? 0.5 : 1) / 5) * 5)); // Boss-Plan: Kalle wird billiger (Erwin nicht)
export const kioskPack = (S, it) => (it.erwin ? it.pack : Math.round(it.pack * (1 + fxOf(S).pack))); // und packt mehr ein
export function canBuy(S, id, n = 1) { const it = kioskItem(id); return !!it && n > 0 && S.geld >= kioskPrice(S, it) * n; }
export function buy(S, id, n = 1) { const it = kioskItem(id); n = Math.max(1, Math.round(n)); if (!it || !kioskShown(S, it) || S.geld < kioskPrice(S, it) * n || kisteRoom(S, id) < kioskPack(S, it) * n) return false; S.geld -= kioskPrice(S, it) * n; addMat(S, id, kioskPack(S, it) * n); S.flags.kalle = true; return true; }
export const kioskShown = (S, it) => !it.sorte || sortUnlocked(S, it.sorte); // neue Waren erst, wenn die Sorte frei ist

// PC: nächste Stufe einer Upgrade-Reihe kaufen
export function nextTier(S, k) { const U = UPGRADES[k]; if (!U) return null; const i = (S.up[k] || 0) + 1; return i < U.tiers.length ? { i, ...U.tiers[i], preis: Math.round(U.tiers[i].preis * costMul(S)) } : null; } // Mehrspieler: PC-Shop teurer
export function buyUpgrade(S, k) { const nx = nextTier(S, k); if (!nx) return { ok: false, why: 'max' }; if (S.geld < nx.preis) return { ok: false, why: 'geld', fehlt: nx.preis - S.geld }; S.geld -= nx.preis; S.up[k] = nx.i; return { ok: true, k, tier: nx }; }

// ---- Kumpels: Kippe anfangen (braucht ein Blättchen, Tabak und Platz in der Box) und fertig machen
export const kumpelDur = (S) => KUMPEL.dur / (1 + fxOf(S).kumpel);
// ---- Einkauf draußen: bei Kalle kommt alles in den Rucksack (Packungen), zu Hause wird ausgepackt. Mit dem Lieferdienst (Boss-Plan) geht K wieder.
export const sackCap = (S) => upv(S, 'sack', 'cap') || 4;
export const sackUsed = (S) => (S.sack ? sackList(S).length : 0); /* seit 2026-11-20 aus den Mengen gezählt: eine Packung = ein Platz */
export function buyToSack(S, id, n = 1) { const it = kioskItem(id); n = Math.max(1, Math.round(n)); if (!it) return { ok: false, why: 'gibts' }; if (!kioskShown(S, it)) return { ok: false, why: 'gibts' }; if (sackUsed(S) + n > sackCap(S)) return { ok: false, why: 'voll' }; const cost = kioskPrice(S, it) * n; if (S.geld < cost) return { ok: false, why: 'geld' }; S.geld -= cost; S.sack[id] = (S.sack[id] || 0) + kioskPack(S, it) * n; S.sack.n += n; sackRecount(S); if (it.erwin) S.flags.erwin = true; else S.flags.kalle = true; return { ok: true, n, units: kioskPack(S, it) * n }; }
// Rucksack ausräumen: alles, was in die Materialkiste passt (seit 2026-11-20 nicht mehr von selbst beim Heimkommen). Der Rest bleibt im Rucksack.
export function unpackSack(S) { const s = S.sack; if (!s || !(s.n > 0)) return null; const n0 = s.n; const got = { tabak: 0, papier: 0, n: 0 }; for (const k of MAT_ORDER) { const m = sackToKiste(S, k); if (m > 0) got[k] = m; } got.n = n0 - S.sack.n; if (S.sack.n > 0) got.rest = S.sack.n; return got; }
export const lieferOn = (S) => fxOf(S).liefer > 0;
// Kiosk vorne bei Ede (im Laden hinter der Theke): Kleinkram mit Wirkung
export const KIOSK_VORNE = [
  { id: 'energy', name: 'Energy-Drink', preis: 150, text: 'Zwei Minuten lang schneller laufen.' },
  { id: 'kaugummi', name: 'Kaugummi', preis: 100, text: 'Mama riecht nichts: bei der nächsten Kontrolle 5 Sekunden mehr Zeit.' },
];
export function buyVorne(S, id) { const it = KIOSK_VORNE.find((k) => k.id === id); if (!it) return { ok: false, why: 'gibts' }; if (S.geld < it.preis) return { ok: false, why: 'geld' }; if (id === 'kaugummi' && S.flags.gum) return { ok: false, why: 'hast' };
  S.geld -= it.preis; if (id === 'energy') S.buff.energy = Math.min(600, (S.buff.energy || 0) + 120); else S.flags.gum = true; return { ok: true, it }; }
export function kumpelStart(S, busy = 0) { if (S.papier <= 0 || S.tabak <= 0 || boxTotal(S) + busy >= boxCap(S)) return false; S.papier--; S.tabak--; return true; }
export function kumpelDone(S) { if (boxTotal(S) >= boxCap(S)) return false; S.kippen++; S.stats.gedreht++; S.stats.kumpel++; return true; }

// ---- Elternkontrolle: Zeit läuft nur im Spiel. Gibt { who, first } zurück, wenn eine Kontrolle anfängt.
// Boss-Plan: manche Kontrollen fallen aus (Oma, Doppelgänger), dann kommt { skip: true } und die nächste wird geplant.
const nextGap = (S, rnd) => (ELTERN.min + rnd() * (ELTERN.max - ELTERN.min)) * (1 + fxOf(S).ctrlGap);
export const warnTime = (S) => ELTERN.warn + fxOf(S).warn + upv(S, 'duft', 'warn') + (S.flags && S.flags.gum ? 5 : 0);
export function tickEltern(S, dt, rnd = Math.random) {
  if (!S.kumpels || !(dt > 0)) return null; S.eltern.next -= dt; if (S.eltern.next > 0) return null;
  const first = S.eltern.n === 0; const f = fxOf(S); if (!first && f.skip > 0 && rnd() < f.skip) { S.eltern.next = nextGap(S, rnd); return { skip: true, who: rnd() < 0.55 ? 'mama' : 'papa' }; }
  S.eltern.next = 1e9; return { who: first ? 'mama' : (rnd() < 0.55 ? 'mama' : 'papa'), first };
}
// Was die Eltern sehen: offen auf dem Tisch oder in den Taschen = erwischt. Mama schaut manchmal in ein Versteck (nicht bei der ersten Kontrolle).
// Kommt Mama oder Papa rein, wandern die Kippen aus den Taschen von selbst in die Box (Lennox 2026-11-23), soweit Platz ist. Dann muss man nur noch die Box verstecken.
export function taschenInBox(S) {
  let platz = Math.max(0, boxCap(S) - boxTotal(S)); let n = 0;
  const m = Math.max(0, Math.min(S.hand, platz)); S.hand -= m; S.kippen += m; platz -= m; n += m;
  for (const q of Object.values(S.sorten || {})) { const k = Math.max(0, Math.min(q.hand, platz)); q.hand -= k; q.box += k; platz -= k; n += k; }
  return n;
}
export function elternCheck(S, { who, first, hidden, kumpelIn, absent = false, draussen = false }, rnd = Math.random) {
  const inBox = !absent && !draussen ? taschenInBox(S) : 0;
  const boxSafe = S.up.box >= 3; const seen = []; // absent: Ludwig ist unten im Bunker, seine Taschen sieht Mama nicht
  if (!boxSafe && !hidden.box && boxTotal(S) > 0) seen.push('box'); if (!hidden.mat) seen.push('mat'); if (handTotal(S) > 0 && !absent) seen.push('hand');
  if (S.bunker && bunkerOpen(S) && S.bunker.hatch === 'offen') seen.push('luke'); // offene Falltür: Mama findet den Bunker
  if (S.kumpels && hidden.stuehle === false) seen.push('stuehle'); // vier Stühle am Tisch: Mama merkt, dass hier mehr Leute sind
  if (draussen) seen.push('draussen'); // Ludwig ist nicht im Zimmer, das Fenster steht offen
  if (seen.length) return { caught: true, seen, spot: null, inBox };
  const smell = boxOf(S, 'joint') + handOf(S, 'joint') > 0 ? ELTERN.smell : 0; // Joints riechen: Mama sucht öfter
  if (who === 'mama' && !first && rnd() < (ELTERN.checkChance + smell) * (1 - fxOf(S).search) * (1 - tarnung(S))) { const spot = rnd() < 0.5 ? 'bett' : 'schrank'; const inside = spot === 'bett' ? (hidden.box && !boxSafe && boxTotal(S) > 0) : hidden.mat; const kumpel = (kumpelIn || {})[spot] || false; return { caught: inside || kumpel, seen: [], spot, kumpel: kumpel && !inside, inBox }; }
  return { caught: false, seen: [], spot: null, inBox };
}
// Ergebnis anwenden: erwischt = Teil weg, Taschen leer, Hausarrest, Warteschlange leer. Danach die nächste Kontrolle planen.
export function elternDone(S, caught, rnd = Math.random) {
  const E = S.eltern; E.n++; let taken = { kippen: 0, tabak: 0, papier: 0, hand: 0 }; const f = fxOf(S); const tk = ELTERN.take * (1 - f.take);
  if (S.flags) S.flags.gum = false; // Kaugummi wirkt nur bei einer Kontrolle
  if (caught) { taken = { kippen: Math.floor(S.kippen * tk), tabak: Math.floor(S.tabak * tk), papier: Math.floor(S.papier * tk), hand: handTotal(S), sack: S.sack ? S.sack.n : 0 }; S.kippen -= taken.kippen; S.tabak -= taken.tabak; S.papier -= taken.papier; S.hand = 0;
    for (const k of Object.keys(S.sorten)) { const q = S.sorten[k]; const tb = Math.floor(q.box * tk); q.box -= tb; taken.kippen += tb; q.hand = 0; } for (const k of Object.keys(S.mat)) S.mat[k] -= Math.floor(S.mat[k] * tk); S.sack = { tabak: 0, papier: 0, n: 0 }; E.arrest = Math.round(ELTERN.arrest * (1 - f.arrest)); E.erwischt++; S.stats.verpasst += S.queue.length; S.queue = []; }
  else { E.geschafft++; taken.resp = gainResp(S, 2); } // nicht erwischt: Respekt
  E.next = nextGap(S, rnd); return taken;
}

// ---------------- Sorten (Spielprinzip Teil 1, 2026-11-20) ----------------
// Die klassische Kippe bleibt in S.kippen (Box), S.hand (Taschen), S.roll (Schritt). Alle anderen Sorten liegen in S.sorten[id] = { box, hand }, ihr Schritt in S.step[id].
// Jede Sorte: Grundpreis (Cent), Boss-Plan-Knoten, Werkzeug (Geld, PC-Shop), Schritte mit Rolle (fürs Bild am Tisch), Verbrauch und Dauer (s), Mengenfaktor für Kundenwünsche.
export const SORTEN = {
  kippe: { name: 'Kippe', plural: 'Kippen', icon: '🚬', preis: 100, node: null, tool: null, mengen: 1, steps: [
    { id: 'papier', name: 'Papier', verb: 'Blättchen hinlegen', role: 'paper', use: { papier: 1 }, dur: 1.1, ico: '📄' }, { id: 'tabak', name: 'Tabak', verb: 'Tabak einstreuen', role: 'fill', use: { tabak: 1 }, dur: 1.4, ico: '🍂' },
    { id: 'drehen', name: 'Drehen', verb: 'Drehen', role: 'roll', dur: 1.6, ico: '🌀' }, { id: 'klopfen', name: 'Klopfen', verb: 'Festklopfen', role: 'finish', dur: 2.2, ico: '👇' }] },
  stopf: { name: 'Stopfkippe', plural: 'Stopfkippen', icon: '🎯', preis: 150, node: 's_stopf', tool: 'stopfer', mengen: 0.9, steps: [
    { id: 'huelse', name: 'Hülse', verb: 'Hülse aufstecken', role: 'tube', use: { huelsen: 1 }, dur: 0.9, ico: '🧻' }, { id: 'tabak', name: 'Tabak', verb: 'Tabak in die Maschine', role: 'fill', use: { tabak: 1 }, dur: 1.1, ico: '🍂' },
    { id: 'stopfen', name: 'Stopfen', verb: 'Hebel drücken', role: 'press', dur: 1.2, ico: '⬇️' }, { id: 'ziehen', name: 'Abziehen', verb: 'Kippe abziehen', role: 'finish', dur: 0.9, ico: '✨' }] },
  aroma: { name: 'Aromakippe', plural: 'Aromakippen', icon: '🍒', preis: 200, node: 's_aroma', tool: 'kapsel', mengen: 0.8, steps: [
    { id: 'papier', name: 'Papier', verb: 'Blättchen hinlegen', role: 'paper', use: { papier: 1 }, dur: 1.1, ico: '📄' }, { id: 'tabak', name: 'Tabak', verb: 'Tabak einstreuen', role: 'fill', use: { tabak: 1 }, dur: 1.4, ico: '🍂' },
    { id: 'kapsel', name: 'Kapsel', verb: 'Aromakapsel einsetzen', role: 'extra', use: { kapseln: 1 }, dur: 1.0, ico: '🍒' }, { id: 'drehen', name: 'Drehen', verb: 'Drehen', role: 'roll', dur: 1.6, ico: '🌀' }, { id: 'klopfen', name: 'Klopfen', verb: 'Festklopfen', role: 'finish', dur: 2.0, ico: '👇' }] },
  zigarillo: { name: 'Zigarillo', plural: 'Zigarillos', icon: '🟤', preis: 500, node: 's_zigarillo', tool: 'wickel', mengen: 0.5, steps: [
    { id: 'deckblatt', name: 'Deckblatt', verb: 'Deckblatt auslegen', role: 'paper', use: { deckblatt: 1 }, dur: 1.6, ico: '🍃' }, { id: 'einlage', name: 'Einlage', verb: 'Tabak einlegen', role: 'fill', use: { tabak: 2 }, dur: 1.8, ico: '🍂' },
    { id: 'rollen', name: 'Rollen', verb: 'Fest rollen', role: 'roll', dur: 2.6, ico: '🌀' }, { id: 'binde', name: 'Bauchbinde', verb: 'Bauchbinde drum', role: 'finish', dur: 1.6, ico: '🎗️' }] },
  joint: { name: 'Joint', plural: 'Joints', icon: '🌿', preis: 800, node: 's_joint', tool: 'grinder', mengen: 0.45, steps: [
    { id: 'papier', name: 'Papier', verb: 'Long Paper hinlegen', role: 'paper', use: { papier: 1 }, dur: 1.1, ico: '📄' }, { id: 'tip', name: 'Tip', verb: 'Tip falten', role: 'extra', use: { tips: 1 }, dur: 1.0, ico: '🧾' },
    { id: 'mischen', name: 'Mischen', verb: 'Gras und Tabak mischen', role: 'fill', use: { gras: 1, tabak: 1 }, dur: 2.0, ico: '🌿' }, { id: 'drehen', name: 'Drehen', verb: 'Drehen', role: 'roll', dur: 2.0, ico: '🌀' }, { id: 'kleben', name: 'Kleben', verb: 'Zukleben', role: 'finish', dur: 1.4, ico: '👅' }] },
  // seit 2026-11-21: Vapes in drei Geschmäckern, gebaut an der Werkbank im Bunker (keine Schritte am Tisch), Kunden nehmen höchstens 3
  vmango: { name: 'Mango-Vape', plural: 'Mango-Vapes', icon: '🥭', preis: 2000, node: 's_vape', tool: 'werkbank', mengen: 0.25, maxWant: 3, werkbank: true, flavor: 'mango', steps: [] },
  vmenthol: { name: 'Menthol-Vape', plural: 'Menthol-Vapes', icon: '🧊', preis: 1800, node: 's_vape', tool: 'werkbank', mengen: 0.25, maxWant: 3, werkbank: true, flavor: 'menthol', steps: [] },
  vkirsche: { name: 'Kirsch-Vape', plural: 'Kirsch-Vapes', icon: '🍒', preis: 2200, node: 's_vape', tool: 'werkbank', mengen: 0.25, maxWant: 3, werkbank: true, flavor: 'kirsche', steps: [] },
};
export const SORT_ORDER = ['kippe', 'stopf', 'aroma', 'zigarillo', 'joint', 'vmango', 'vmenthol', 'vkirsche']; // die ersten fünf entstehen am Tisch (Tasten 1 bis 5), die Vapes an der Werkbank im Bunker
export const MATS = { huelsen: { name: 'Hülsen', ico: '🧻' }, kapseln: { name: 'Aromakapseln', ico: '🍒' }, deckblatt: { name: 'Deckblätter', ico: '🍃' }, tips: { name: 'Filtertips', ico: '🧾' }, gras: { name: 'Gras', ico: '🌿' } };
export const MAT_NAMES = { papier: 'Blättchen', tabak: 'Tabak', ...Object.fromEntries(Object.entries(MATS).map(([k, v]) => [k, v.name])) };
// Werkzeug je neuer Sorte: nach dem Boss-Plan-Knoten im Shop am PC kaufen
export const TOOLS = {
  stopfer: { name: 'Stopfmaschine', sorte: 'stopf', preis: 4000, ico: '🎯', text: 'Hülse drauf, Tabak rein, Hebel runter. Schneller als drehen.' },
  kapsel: { name: 'Kapselzange', sorte: 'aroma', preis: 2500, ico: '🍒', text: 'Setzt die Aromakapsel genau in den Filter.' },
  wickel: { name: 'Wickelbrett', sorte: 'zigarillo', preis: 8000, ico: '🟤', text: 'Holzbrett und Messer für Zigarillos.' },
  grinder: { name: 'Grinder und Mischschale', sorte: 'joint', preis: 6000, ico: '🌿', text: 'Zerkleinert und mischt. Fragt nicht, wofür.' },
  werkbank: { name: 'Werkbank', sorte: 'vmango', cat: 'Vapes', bunker: true, preis: 12000, ico: '🛠️', text: 'Lötkolben, Schraubstock, Lupe und eine Teilekiste. Wird im Bunker aufgebaut.' }, // seit 2026-11-21
};
function newSorten() { return { stopf: { box: 0, hand: 0 }, aroma: { box: 0, hand: 0 }, zigarillo: { box: 0, hand: 0 }, joint: { box: 0, hand: 0 }, vmango: { box: 0, hand: 0 }, vmenthol: { box: 0, hand: 0 }, vkirsche: { box: 0, hand: 0 } }; }
function newSteps() { return { stopf: 0, aroma: 0, zigarillo: 0, joint: 0 }; }
function newMat() { return { huelsen: 0, kapseln: 0, deckblatt: 0, tips: 0, gras: 0 }; }
export const boxOf = (S, id) => (id === 'kippe' ? S.kippen : (S.sorten && S.sorten[id] ? S.sorten[id].box : 0));
export const handOf = (S, id) => (id === 'kippe' ? S.hand : (S.sorten && S.sorten[id] ? S.sorten[id].hand : 0));
export function addBox(S, id, n) { if (id === 'kippe') S.kippen += n; else S.sorten[id].box += n; }
export function addHand(S, id, n) { if (id === 'kippe') S.hand += n; else S.sorten[id].hand += n; }
export const boxTotal = (S) => S.kippen + (S.sorten ? Object.values(S.sorten).reduce((a, q) => a + q.box, 0) : 0);
export const handTotal = (S) => S.hand + (S.sorten ? Object.values(S.sorten).reduce((a, q) => a + q.hand, 0) : 0);
export const matOf = (S, k) => (k === 'papier' || k === 'tabak' ? S[k] : (S.mat && S.mat[k]) || 0);
export function addMat(S, k, n) { if (k === 'papier' || k === 'tabak') S[k] += n; else S.mat[k] = (S.mat[k] || 0) + n; }
export const sortWord = (id, n) => { const D = SORTEN[id] || SORTEN.kippe; return n === 1 ? D.name : D.plural; };
// Frei = Boss-Plan-Knoten gekauft. Bereit = frei und Werkzeug gekauft (erst dann wünschen Kunden die Sorte).
export const sortUnlocked = (S, id) => id === 'kippe' || (!!SORTEN[id] && lvl(S, SORTEN[id].node) > 0);
export const sortReady = (S, id) => sortUnlocked(S, id) && (!SORTEN[id].tool || !!(S.tools && S.tools[SORTEN[id].tool]));
export const toolPrice = (S, k) => Math.round(TOOLS[k].preis * costMul(S)); // Werkzeug im PC-Shop (Mehrspieler teurer)
export function buyTool(S, k) { const T = TOOLS[k]; if (!T) return { ok: false, why: 'gibts' }; if (S.tools[k]) return { ok: false, why: 'max' }; if (!sortUnlocked(S, T.sorte)) return { ok: false, why: 'need' }; if (T.bunker && !bunkerOpen(S)) return { ok: false, why: 'bunker' }; if (S.geld < toolPrice(S, k)) return { ok: false, why: 'geld', fehlt: toolPrice(S, k) - S.geld };
  S.geld -= toolPrice(S, k); S.tools[k] = true; return { ok: true, k, tier: { name: T.name } }; }
export function setSorte(S, id) { if (!sortReady(S, id)) return false; S.sorte = id; return true; }
// Nächster Schritt der gewählten Sorte (die klassische Kippe läuft weiter über roll)
export function rollSort(S, id = S.sorte || 'kippe', rnd = Math.random) {
  if (id === 'kippe' || !SORTEN[id]) return roll(S, rnd); if (SORTEN[id].werkbank) return { ok: false, need: 'werkbank', step: 0 }; if (!sortReady(S, id)) return { ok: false, need: 'tool', step: 0 };
  const D = SORTEN[id]; const st = S.step[id] || 0; const sp = D.steps[st]; const f = fxOf(S);
  if (st === 0 && boxTotal(S) >= boxCap(S)) return { ok: false, need: 'box', step: st };
  for (const [k, n] of Object.entries(sp.use || {})) if (matOf(S, k) < n) return { ok: false, need: k, step: st };
  for (const [k, n] of Object.entries(sp.use || {})) { const saved = k === 'tabak' && f.tabakSave > 0 && rnd() < f.tabakSave; if (!saved) addMat(S, k, -n); }
  if (st < D.steps.length - 1) { S.step[id] = st + 1; return { ok: true, step: st, done: false }; }
  S.step[id] = 0; S.sorten[id].box++; S.stats.gedreht++; S.made[id] = (S.made[id] || 0) + 1; return { ok: true, step: st, done: true, extra: 0 };
}
export const stepOf = (S, id = S.sorte || 'kippe') => (id === 'kippe' ? S.roll : (S.step[id] || 0));
// Wie viele Stück sich mit dem Material noch machen lassen (grob, für Hinweise)
export function materialForSort(S, id = S.sorte || 'kippe') { if (id === 'kippe') return materialFor(S); if (SORTEN[id].werkbank) return 0; const need = {}; for (const sp of SORTEN[id].steps) for (const [k, n] of Object.entries(sp.use || {})) need[k] = (need[k] || 0) + n; return Math.min(...Object.entries(need).map(([k, n]) => Math.floor(matOf(S, k) / n))); }
// Kunden wollen mit der Zeit mehr (Lennox 2026-11-20): je mehr schon verkauft wurde, desto größer die Wünsche
const WANT = [[0, 1, 4], [40, 2, 5], [150, 2, 7], [400, 3, 9], [1000, 4, 12], [2500, 6, 16], [6000, 8, 22]];
export function wantRange(S) { const v = (S.stats && S.stats.verkauft) || 0; let r = WANT[0]; for (const t of WANT) if (v >= t[0]) r = t; return { min: r[1], max: r[2] + fxOf(S).want }; }
export function pickSorte(S, who, rnd = Math.random) {
  const ready = SORT_ORDER.filter((id) => sortReady(S, id)); if (ready.length <= 1) return 'kippe'; const fav = (who && who.fav) || [];
  const w = ready.map((id) => (fav.includes(id) ? 3 : 1)); let x = rnd() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < ready.length; i++) { x -= w[i]; if (x < 0) return ready[i]; } return ready[ready.length - 1];
}
// Was der Kunde sagt: Kippen mit Zahl (1 bis 4), mehr Kippen oder eine andere Sorte mit eigenem Satz (nur, wenn es die Aufnahme gibt)
export function sayFor(sorte, want, rnd = Math.random) {
  if (sorte !== 'kippe' && KLINES['ks_' + sorte]) return 'ks_' + sorte; if (sorte === 'kippe' && want > 4 && KLINES.k_viel) return 'k_viel';
  return `k${1 + Math.floor(rnd() * 3)}_${Math.min(4, want)}`;
}

// ---------------- Inventar (Spielprinzip Teil 1b, 2026-11-20): Taschen mit Plätzen, Materialkiste mit Fächern, Rucksack mit Packungen ----------------
// Gezählt wird weiter in den alten Feldern (S.hand und S.sorten[].hand, S.papier/S.tabak/S.mat, S.sack). Plätze und Fächer werden daraus abgeleitet:
// ein Platz in den Taschen = ein Stapel einer Sorte (bis STACK), ein Fach der Kiste und ein Platz im Rucksack = eine Packung eines Materials (so groß wie Kalles Packung).
// Alte Stände über der Grenze behalten ihr Zeug, es passt nur nichts Neues dazu (Lennox, Frage 17).
export const STACK = 10;
export const pocketSlots = (S) => tierOf(S, 'pocket').slots || 3;
export const slotsUsed = (S) => SORT_ORDER.reduce((a, k) => a + Math.ceil(Math.max(0, handOf(S, k)) / STACK), 0);
export function handRoom(S, id) { const h = Math.max(0, handOf(S, id)); const part = h % STACK ? STACK - (h % STACK) : 0; return Math.max(0, (pocketSlots(S) - slotsUsed(S)) * STACK + part); }
const stacks = (n, size) => { const out = []; n = Math.max(0, Math.floor(n)); while (n > 0) { const m = Math.min(size, n); out.push(m); n -= m; } return out; };
export const handSlots = (S) => SORT_ORDER.flatMap((id) => stacks(handOf(S, id), STACK).map((n) => ({ id, n })));
function fitPockets(S) { for (const k of [...SORT_ORDER].reverse()) while (slotsUsed(S) > pocketSlots(S) && handOf(S, k) > 0) { const h = handOf(S, k); const n = h % STACK || Math.min(STACK, h); addHand(S, k, -n); addBox(S, k, n); } }
export const MAT_ORDER = ['papier', 'tabak', 'huelsen', 'kapseln', 'deckblatt', 'tips', 'gras'];
export const MAT_ICO = { papier: '📄', tabak: '🍂', ...Object.fromEntries(Object.entries(MATS).map(([k, v]) => [k, v.ico])) };
export const matSlotMax = (S, k) => { const it = kioskItem(k); return Math.max(1, it ? kioskPack(S, it) : 50); };
export const kisteSlots = (S) => upv(S, 'kiste', 'slots') || 6;
export const kisteUsed = (S) => MAT_ORDER.reduce((a, k) => a + Math.ceil(Math.max(0, matOf(S, k)) / matSlotMax(S, k)), 0);
export function kisteRoom(S, k) { const have = Math.max(0, matOf(S, k)); const mx = matSlotMax(S, k); const part = have % mx ? mx - (have % mx) : 0; return Math.max(0, (kisteSlots(S) - kisteUsed(S)) * mx + part); }
export const kisteList = (S) => MAT_ORDER.flatMap((k) => stacks(matOf(S, k), matSlotMax(S, k)).map((n) => ({ id: k, n })));
export function addMatCapped(S, k, n) { const add = Math.max(0, Math.min(Math.floor(Number(n) || 0), kisteRoom(S, k))); if (add > 0) addMat(S, k, add); return add; }
export const sackList = (S) => SACK_ORDER.flatMap((k) => stacks((S.sack && S.sack[k]) || 0, matSlotMax(S, k)).map((n) => ({ id: k, n })));
function sackRecount(S) { if (S.sack) S.sack.n = sackList(S).length; }
// Aus dem Rucksack in die Kiste (höchstens units Stück, so viel Platz ist). Gibt zurück, wie viel wirklich umgezogen ist.
export function sackToKiste(S, k, units = Infinity) { if (!MAT_ORDER.includes(k)) return 0; /* Vape-Teile gehören in die Teilekiste im Bunker */ const have = Math.max(0, (S.sack && S.sack[k]) || 0); const n = addMatCapped(S, k, Math.min(have, units)); if (n > 0) { S.sack[k] = have - n; sackRecount(S); S.flags.eingeraeumt = true; } return n; }

// ---------------- Vapes (Spielprinzip Teil 2, 2026-11-21) ----------------
// Teile kauft man bei Elektro-Erwin (Laden gegenüber, nur 8 bis 20 Uhr). Sie kommen in den Rucksack und von dort in die Teilekiste an der Werkbank im Bunker.
// Die Teilekiste hat 10 Fächer (eine Vape braucht 7 verschiedene Teile, mit 6 Fächern ginge keine einzige). Bauen: Liquid mischen (Base + Aroma), drei Lötpunkte
// (daneben = Platine kaputt), dann Akku, Platine, Verdampferkopf, Tank und Gehäuse in dieser Reihenfolge einsetzen. Fertige Vapes gehen in die Taschen, sonst in die Ablage.
export const FLAVORS = ['mango', 'menthol', 'kirsche'];
export const VAPES = ['vmango', 'vmenthol', 'vkirsche'];
export const vapeOf = (flavor) => 'v' + flavor;
export const ERWIN = [
  { id: 'akku', name: 'Akkus', pack: 5, preis: 1000, sorte: 'vmango', erwin: true, text: 'Fünf Akkus, voll geladen.' },
  { id: 'platine', name: 'Platinen', pack: 5, preis: 1000, sorte: 'vmango', erwin: true, text: 'Fünf Steuerplatinen. Sauber löten!' },
  { id: 'kopf', name: 'Verdampferköpfe', pack: 10, preis: 1200, sorte: 'vmango', erwin: true, text: 'Zehn Köpfe mit Watte drin.' },
  { id: 'tank', name: 'Tanks', pack: 10, preis: 1000, sorte: 'vmango', erwin: true, text: 'Zehn kleine Glastanks.' },
  { id: 'gehaeuse', name: 'Gehäuse', pack: 5, preis: 800, sorte: 'vmango', erwin: true, text: 'Fünf Gehäuse mit Deckel.' },
  { id: 'base', name: 'Liquid-Base', pack: 20, preis: 600, sorte: 'vmango', erwin: true, text: 'Reicht für 20 Füllungen.' },
  { id: 'a_mango', name: 'Aroma Mango', pack: 20, preis: 400, sorte: 'vmango', erwin: true, text: 'Für 20 Füllungen. Riecht nach Urlaub.' },
  { id: 'a_menthol', name: 'Aroma Menthol', pack: 20, preis: 400, sorte: 'vmango', erwin: true, text: 'Für 20 Füllungen. Eiskalt.' },
  { id: 'a_kirsche', name: 'Aroma Kirsche', pack: 20, preis: 400, sorte: 'vmango', erwin: true, text: 'Für 20 Füllungen. Wie Hustensaft, nur besser.' },
];
export const TEILE = { akku: { name: 'Akkus', ico: '🔋' }, platine: { name: 'Platinen', ico: '🟩' }, kopf: { name: 'Verdampferköpfe', ico: '🌀' }, tank: { name: 'Tanks', ico: '🧪' }, gehaeuse: { name: 'Gehäuse', ico: '🔲' },
  base: { name: 'Liquid-Base', ico: '💧' }, a_mango: { name: 'Aroma Mango', ico: '🥭' }, a_menthol: { name: 'Aroma Menthol', ico: '🧊' }, a_kirsche: { name: 'Aroma Kirsche', ico: '🍒' } };
export const TEIL_ORDER = Object.keys(TEILE);
export const PARTS = ['akku', 'platine', 'kopf', 'tank', 'gehaeuse']; // Reihenfolge beim Zusammenbauen
export const TEILE_SLOTS = 10;
const SACK_ORDER = [...MAT_ORDER, ...TEIL_ORDER]; // der Rucksack trägt Material und Teile
Object.assign(MAT_ICO, Object.fromEntries(TEIL_ORDER.map((k) => [k, TEILE[k].ico]))); Object.assign(MAT_NAMES, Object.fromEntries(TEIL_ORDER.map((k) => [k, TEILE[k].name])));
function newTeile() { return { akku: 0, platine: 0, kopf: 0, tank: 0, gehaeuse: 0, base: 0, a_mango: 0, a_menthol: 0, a_kirsche: 0 }; }
function newWerk() { return { liquid: null, ablage: { vmango: 0, vmenthol: 0, vkirsche: 0 } }; }
export const teilOf = (S, k) => (S.teile && S.teile[k]) || 0;
export const teileUsed = (S) => TEIL_ORDER.reduce((a, k) => a + Math.ceil(teilOf(S, k) / matSlotMax(S, k)), 0);
export function teileRoom(S, k) { const have = teilOf(S, k); const mx = matSlotMax(S, k); const part = have % mx ? mx - (have % mx) : 0; return Math.max(0, (TEILE_SLOTS - teileUsed(S)) * mx + part); }
export const teileList = (S) => TEIL_ORDER.flatMap((k) => stacks(teilOf(S, k), matSlotMax(S, k)).map((n) => ({ id: k, n })));
export function sackToTeile(S, k, units = Infinity) { if (!TEILE[k]) return 0; const have = Math.max(0, (S.sack && S.sack[k]) || 0); const n = Math.max(0, Math.min(have, units, teileRoom(S, k))); if (n > 0) { S.teile[k] += n; S.sack[k] = have - n; sackRecount(S); S.flags.teileEin = true; } return n; }
export function unpackTeile(S) { const n0 = sackUsed(S); const got = { n: 0 }; for (const k of TEIL_ORDER) { const m = sackToTeile(S, k); if (m > 0) got[k] = m; } got.n = n0 - sackUsed(S); const rest = sackList(S).filter((s) => TEILE[s.id]).length; if (rest) got.rest = rest; return got; }
export const werkReady = (S) => sortUnlocked(S, 'vmango') && !!(S.tools && S.tools.werkbank) && bunkerOpen(S);
// Liquid mischen: eine Portion Base und ein Aroma. Ein fertiges Liquid wartet, bis die Vape gebaut ist.
export function mixLiquid(S, flavor) {
  if (!werkReady(S)) return { ok: false, why: 'werkbank' }; if (!FLAVORS.includes(flavor)) return { ok: false, why: 'gibts' }; if (S.werk.liquid) return { ok: false, why: 'schon' };
  const ak = 'a_' + flavor; if (teilOf(S, 'base') < 1) return { ok: false, why: 'base' }; if (teilOf(S, ak) < 1) return { ok: false, why: ak }; S.teile.base--; S.teile[ak]--; S.werk.liquid = flavor; return { ok: true, flavor };
}
export const vapeMissing = (S) => PARTS.filter((k) => teilOf(S, k) < 1);
export function solderFail(S) { if (teilOf(S, 'platine') > 0) S.teile.platine--; return teilOf(S, 'platine'); } // daneben gelötet: Platine kaputt
export function finishVape(S) {
  if (!S.werk.liquid) return { ok: false, why: 'liquid' }; const miss = vapeMissing(S); if (miss.length) return { ok: false, why: miss[0] };
  for (const k of PARTS) S.teile[k]--; const id = vapeOf(S.werk.liquid); S.werk.liquid = null; S.made[id] = (S.made[id] || 0) + 1; S.stats.vapes = (S.stats.vapes || 0) + 1;
  if (handRoom(S, id) > 0) { addHand(S, id, 1); return { ok: true, id, where: 'hand' }; } S.werk.ablage[id]++; return { ok: true, id, where: 'ablage' };
}
export const ablageTotal = (S) => VAPES.reduce((a, id) => a + ((S.werk && S.werk.ablage[id]) || 0), 0);
export function takeAblage(S) { let n = 0; for (const id of VAPES) { const k = Math.min(S.werk.ablage[id], handRoom(S, id)); if (k > 0) { S.werk.ablage[id] -= k; addHand(S, id, k); n += k; } } return n > 0 ? { ok: true, n, left: ablageTotal(S) } : { ok: false, why: ablageTotal(S) ? 'voll' : 'leer' }; }
export const erwinOpen = (h) => h >= 8 && h < 20; // Elektro-Erwin hat tagsüber offen
// ---- Easter Eggs (seit 2026-11-21, Wunsch Lennox: „so 10 kleine Easter Eggs irgendwo auf der Welt“): jedes bringt einmal 3 Respekt, alle zehn die goldene Kippe im Regal
export const EGGS = ['rauchmelder', 'gitarre', 'disco', 'aquarium', 'bett', 'brunnen', 'guenther', 'zwerg', 'gully', 'ente'];
export const EGG_RESP = 3;
export const eggCount = (S) => (S && S.eggs ? EGGS.filter((id) => S.eggs[id]).length : 0);
export function findEgg(S, id) {
  if (!S || !EGGS.includes(id)) return { ok: false, neu: false, n: eggCount(S), alle: false }; if (!S.eggs || typeof S.eggs !== 'object') S.eggs = {};
  if (S.eggs[id]) { const n = eggCount(S); return { ok: true, neu: false, n, alle: n === EGGS.length }; }
  S.eggs[id] = true; S.respekt += EGG_RESP; const n = eggCount(S); return { ok: true, neu: true, n, alle: n === EGGS.length };
}
// Münze in den Brunnen (1 €). Einmal pro Spielstand kann der Wunsch in Erfüllung gehen (50 €, Lennox: „nur einmal“), danach bleibt es beim Wünschen.
export const WISH_LUCK = 0.1;
export function wishCoin(S, rnd = Math.random) {
  if (!S || S.geld < 100) return { ok: false, why: 'geld' }; S.geld -= 100; if (!S.flags) S.flags = {};
  const lucky = !S.flags.brunnen50 && rnd() < WISH_LUCK; if (lucky) { S.flags.brunnen50 = true; S.geld += 5000; } return { ok: true, lucky };
}
