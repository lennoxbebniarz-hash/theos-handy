// Theos Seitenscheidel - Besser als Monopoly (intern baron): Regeln ohne Oberfläche. 40 Felder im Uhrzeigersinn, Feld 0 ist Start, Feld 10 die Wache. Der Host rechnet alles; jede Aktion legt Schritte in S.ev.steps ab, die alle Fenster gleich abspielen.
export const SEATS = ['Rot', 'Blau', 'Gelb'];
export const START_CASH = 1500; export const GO_MONEY = 200; export const JAIL = 10; export const BAIL = 50; export const HOUSES = 32; export const HOTELS = 12; export const TAX_FIX = 200;
export const TOKENS = [{ id: 'auto', name: 'Rallyeauto' }, { id: 'rakete', name: 'Rakete' }, { id: 'ente', name: 'Gummiente' }, { id: 'krone', name: 'Krone' }, { id: 'kaktus', name: 'Kaktus' }, { id: 'pokal', name: 'Pokal' }];
export const AI_NAMES = ['Kalle (KI)', 'Mona (KI)', 'Otto (KI)'];
export const GROUPS = { braun: { name: 'Braun', col: '#8b5a2b', house: 50 }, hell: { name: 'Hellblau', col: '#9fd3ee', house: 50 }, pink: { name: 'Pink', col: '#d63c8f', house: 100 }, orange: { name: 'Orange', col: '#f08a1c', house: 100 }, rot: { name: 'Rot', col: '#d92b2b', house: 150 }, gelb: { name: 'Gelb', col: '#f4d21f', house: 150 }, gruen: { name: 'Grün', col: '#1f9a4c', house: 200 }, blau: { name: 'Dunkelblau', col: '#1f4f9e', house: 200 } };
const st = (name, g, price, rent) => ({ t: 'street', name, g, price, rent }); const ts = (name) => ({ t: 'station', name, price: 200 }); const ut = (name, kind) => ({ t: 'util', name, kind, price: 150 }); const cd = (deck) => ({ t: 'card', deck, name: deck === 'z' ? 'Zufall' : 'Stadtkasse' });
export const FIELDS = [
  { t: 'start', name: 'Start' }, st('Holzweg', 'braun', 60, [2, 10, 30, 90, 160, 250]), cd('k'), st('Kiesgrube', 'braun', 60, [4, 20, 60, 180, 320, 450]), { t: 'tax', kind: 'income', name: 'Einkommensteuer' }, ts('Tankstelle Süd'), st('Parkhausgasse', 'hell', 100, [6, 30, 90, 270, 400, 550]), cd('z'), st('Garagenhof', 'hell', 100, [6, 30, 90, 270, 400, 550]), st('Schrankenweg', 'hell', 120, [8, 40, 100, 300, 450, 600]),
  { t: 'jail', name: 'Wache' }, st('Werkstattstraße', 'pink', 140, [10, 50, 150, 450, 625, 750]), ut('Kraftwerk', 'strom'), st('Ölwechselweg', 'pink', 140, [10, 50, 150, 450, 625, 750]), st('Reifenallee', 'pink', 160, [12, 60, 180, 500, 700, 900]), ts('Tankstelle West'), st('Boxengasse', 'orange', 180, [14, 70, 200, 550, 750, 950]), cd('k'), st('Startampel', 'orange', 180, [14, 70, 200, 550, 750, 950]), st('Zielgerade', 'orange', 200, [16, 80, 220, 600, 800, 1000]),
  { t: 'park', name: 'Parkplatz' }, st('Schotterpiste', 'rot', 220, [18, 90, 250, 700, 875, 1050]), cd('z'), st('Haarnadelkurve', 'rot', 220, [18, 90, 250, 700, 875, 1050]), st('Rallyering', 'rot', 240, [20, 100, 300, 750, 925, 1100]), ts('Tankstelle Nord'), st('Mondstraße', 'gelb', 260, [22, 110, 330, 800, 975, 1150]), st('Kraterweg', 'gelb', 260, [22, 110, 330, 800, 975, 1150]), ut('Wasserturm', 'wasser'), st('Staubfeld', 'gelb', 280, [24, 120, 360, 850, 1025, 1200]),
  { t: 'gojail', name: 'Ab zur Wache!' }, st('Würfelgasse', 'gruen', 300, [26, 130, 390, 900, 1100, 1275]), st('Schachallee', 'gruen', 300, [26, 130, 390, 900, 1100, 1275]), cd('k'), st('Dreierplatz', 'gruen', 320, [28, 150, 450, 1000, 1200, 1400]), ts('Tankstelle Ost'), cd('z'), st('Brunos Villa', 'blau', 350, [35, 175, 500, 1100, 1300, 1500]), { t: 'tax', kind: 'lux', name: 'Protzsteuer', v: 100 }, st('Theo-Ring', 'blau', 400, [50, 200, 600, 1400, 1700, 2000]),
];
export const OWNABLE = FIELDS.map((F, i) => (F.price ? i : -1)).filter((i) => i >= 0);
export const groupOf = (g) => FIELDS.map((F, i) => (F.g === g ? i : -1)).filter((i) => i >= 0);
const KIND = (t) => FIELDS.map((F, i) => (F.t === t ? i : -1)).filter((i) => i >= 0);
export const STATIONS = KIND('station'); export const UTILS = KIND('util');
export const mortValue = (f) => FIELDS[f].price / 2; export const unmortCost = (f) => Math.ceil(FIELDS[f].price / 2 * 1.1);
export const houseCost = (f) => GROUPS[FIELDS[f].g].house;
export const money = (v) => v.toLocaleString('de-DE') + ' T';
// Karten: eigene Texte, Wirkung als kleines Objekt
export const CARDS = {
  z: [
    { x: 'Rücke vor bis Start. Ziehe 200 T ein.', e: { t: 'goto', f: 0 } }, { x: 'Ausflug zum Theo-Ring. Rücke dorthin vor.', e: { t: 'goto', f: 39 } }, { x: 'Rennbesprechung am Rallyering. Rücke vor. Kommst du über Start, ziehe 200 T ein.', e: { t: 'goto', f: 24 } }, { x: 'Inspektion in der Werkstattstraße. Rücke vor. Kommst du über Start, ziehe 200 T ein.', e: { t: 'goto', f: 11 } },
    { x: 'Tank leer! Rücke vor bis zur nächsten Tankstelle. Gehört sie jemandem, zahlst du die doppelte Miete. Sonst darfst du sie kaufen.', e: { t: 'near', kind: 'station' } }, { x: 'Reserve-Lampe! Rücke vor bis zur nächsten Tankstelle. Gehört sie jemandem, zahlst du die doppelte Miete. Sonst darfst du sie kaufen.', e: { t: 'near', kind: 'station' } },
    { x: 'Stromausfall! Rücke vor bis zum nächsten Versorger. Gehört er jemandem, zahlst du das Zehnfache deines Wurfs.', e: { t: 'near', kind: 'util' } }, { x: 'Dein Rallye-Video geht durch die Decke. Die Bank zahlt dir 50 T.', e: { t: 'cash', v: 50 } },
    { x: 'Raus aus der Wache! Behalte diese Karte, bis du sie brauchst oder eintauschst.', e: { t: 'free' } }, { x: 'Falsch abgebogen. Gehe drei Felder zurück.', e: { t: 'back' } }, { x: 'Geblitzt mit 180! Ab zur Wache. Gehe nicht über Start, ziehe keine 200 T ein.', e: { t: 'jail' } },
    { x: 'Deine Häuser brauchen neue Dächer. Zahle 25 T je Haus und 100 T je Hotel.', e: { t: 'repair', h: 25, H: 100 } }, { x: 'Knöllchen fürs Falschparken. Zahle 15 T.', e: { t: 'cash', v: -15 } }, { x: 'Ausfahrt zur Tankstelle Süd. Rücke vor. Kommst du über Start, ziehe 200 T ein.', e: { t: 'goto', f: 5 } },
    { x: 'Du wirst zum Rennleiter gewählt. Zahle jedem Mitspieler 50 T.', e: { t: 'each', v: -50 } }, { x: 'Dein Sparvertrag läuft aus. Ziehe 150 T ein.', e: { t: 'cash', v: 150 } },
  ],
  k: [
    { x: 'Rücke vor bis Start. Ziehe 200 T ein.', e: { t: 'goto', f: 0 } }, { x: 'Die Stadtkasse hat sich verzählt, zu deinen Gunsten. Ziehe 200 T ein.', e: { t: 'cash', v: 200 } }, { x: 'Tierarzt für deine Gummiente. Zahle 50 T.', e: { t: 'cash', v: -50 } }, { x: 'Flohmarkt-Erlös. Ziehe 50 T ein.', e: { t: 'cash', v: 50 } },
    { x: 'Raus aus der Wache! Behalte diese Karte, bis du sie brauchst oder eintauschst.', e: { t: 'free' } }, { x: 'Beim Falschparken erwischt. Ab zur Wache. Gehe nicht über Start, ziehe keine 200 T ein.', e: { t: 'jail' } }, { x: 'Parkwettbewerb gewonnen. Ziehe 100 T ein.', e: { t: 'cash', v: 100 } }, { x: 'Steuerrückzahlung. Ziehe 20 T ein.', e: { t: 'cash', v: 20 } },
    { x: 'Du hast Geburtstag! Jeder Mitspieler schenkt dir 10 T.', e: { t: 'each', v: 10 } }, { x: 'Deine Unfallversicherung zahlt aus. Ziehe 100 T ein.', e: { t: 'cash', v: 100 } }, { x: 'Abschleppdienst. Zahle 100 T.', e: { t: 'cash', v: -100 } }, { x: 'Fahrstunden. Zahle 50 T.', e: { t: 'cash', v: -50 } },
    { x: 'Du hilfst beim Reifenwechsel aus. Ziehe 25 T ein.', e: { t: 'cash', v: 25 } }, { x: 'Straßenschäden vor deinen Häusern. Zahle 40 T je Haus und 115 T je Hotel.', e: { t: 'repair', h: 40, H: 115 } }, { x: 'Zweiter Platz beim Seifenkistenrennen. Ziehe 10 T ein.', e: { t: 'cash', v: 10 } }, { x: 'Erbschaft von Tante Gisela. Ziehe 100 T ein.', e: { t: 'cash', v: 100 } },
  ],
};
const shuffle = (n, rnd) => { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export function newGame(names, ai = [false, false, false], rnd = Math.random) { return { names: names.slice(0, 3), ai: ai.slice(0, 3), tokens: [null, null, null], cash: [START_CASH, START_CASH, START_CASH], pos: [0, 0, 0], jail: [0, 0, 0], free: [[], [], []], out: [false, false, false], own: Array(40).fill(-1), h: Array(40).fill(0), m: Array(40).fill(false), bank: { houses: HOUSES, hotels: HOTELS }, decks: { z: shuffle(16, rnd), k: shuffle(16, rnd) }, phase: 'pick', turn: 0, open: [null, null, null], openWho: [0, 1, 2], dice: null, dbl: 0, offer: -1, auction: null, debts: [], trade: null, winner: null, round: 0, offered: [-1, -1, -1], noTrade: [], rev: 0, evId: 0, ev: null, log: [] }; }
// ---- Abfragen
export const groupFull = (S, f) => { const o = S.own[f]; return o >= 0 && groupOf(FIELDS[f].g).every((q) => S.own[q] === o); };
const groupHouses = (S, f) => (FIELDS[f].g ? groupOf(FIELDS[f].g).reduce((a, q) => a + S.h[q], 0) : 0);
export function rent(S, f, sum = 7, mult = 1) {
  const F = FIELDS[f]; const o = S.own[f]; if (o < 0 || S.m[f] || S.out[o]) return 0;
  if (F.t === 'street') return S.h[f] ? F.rent[S.h[f]] : F.rent[0] * (groupFull(S, f) ? 2 : 1);
  if (F.t === 'station') return 25 * 2 ** (STATIONS.filter((q) => S.own[q] === o).length - 1) * mult;
  if (F.t === 'util') return sum * (mult > 1 ? 10 : UTILS.every((q) => S.own[q] === o) ? 10 : 4);
  return 0;
}
export function canBuild(S, seat, f) {
  const F = FIELDS[f]; if (F.t !== 'street' || S.own[f] !== seat || !groupFull(S, f) || S.h[f] >= 5) return false; const G = groupOf(F.g); if (G.some((q) => S.m[q])) return false;
  if (S.h[f] !== Math.min(...G.map((q) => S.h[q]))) return false; if (S.cash[seat] < houseCost(f)) return false; return S.h[f] === 4 ? S.bank.hotels > 0 : S.bank.houses > 0;
}
export const canSell = (S, seat, f) => S.own[f] === seat && S.h[f] > 0 && S.h[f] === Math.max(...groupOf(FIELDS[f].g).map((q) => S.h[q]));
export const canMort = (S, seat, f) => S.own[f] === seat && !S.m[f] && groupHouses(S, f) === 0;
export const canUnmort = (S, seat, f) => S.own[f] === seat && S.m[f] && S.cash[seat] >= unmortCost(f);
// Was ein Spieler höchstens flüssig machen kann (Häuser zum halben Preis, Hypotheken)
export function liquid(S, seat) { let v = S.cash[seat]; for (const f of OWNABLE) if (S.own[f] === seat) { if (S.h[f]) v += S.h[f] * houseCost(f) / 2; if (!S.m[f]) v += mortValue(f); } return v; }
export function worth(S, seat) { let v = S.cash[seat]; for (const f of OWNABLE) if (S.own[f] === seat) { v += S.m[f] ? mortValue(f) : FIELDS[f].price; if (S.h[f]) v += S.h[f] * houseCost(f); } return v; }
export const alive = (S) => [0, 1, 2].filter((q) => !S.out[q]);
// Wer muss gerade etwas entscheiden? (für KI, Anzeige und Rechteprüfung)
export function actor(S) {
  if (S.phase === 'over') return -1; if (S.phase === 'pick') return S.tokens.findIndex((t) => t === null);
  if (S.trade) return S.trade.to; if (S.phase === 'auction') return S.auction.who[S.auction.i]; if (S.phase === 'debt') return S.debts[0].seat; return S.turn;
}
// ---- Ablauf intern
const begin = (S) => { S.rev++; S.ev = { id: ++S.evId, steps: [] }; };
const step = (S, x) => S.ev.steps.push(x);
const note = (S, t, loud) => { step(S, { k: 'note', t, loud: !!loud }); S.log.push(t); if (S.log.length > 60) S.log.shift(); };
const nm = (S, q) => S.names[q];
const flow = (S, q, v) => { S.cash[q] += v; step(S, { k: 'cash', seat: q, v }); };
function charge(S, s, amount, to, why) {
  if (amount <= 0) return; if (S.cash[s] >= amount) { flow(S, s, -amount); if (to >= 0) flow(S, to, amount); note(S, `${nm(S, s)} zahlt ${money(amount)}${to >= 0 ? ' an ' + nm(S, to) : ''}${why ? ' (' + why + ')' : ''}.`); return; }
  S.debts.push({ seat: s, to, amount, why: why || '' }); note(S, `${nm(S, s)} muss ${money(amount)}${to >= 0 ? ' an ' + nm(S, to) : ' an die Bank'} zahlen, hat aber nur ${money(S.cash[s])}.`, true);
}
function nextTurn(S) { if (S.phase === 'over') return; let t = S.turn; for (let k = 0; k < 3; k++) { t = (t + 1) % 3; if (!S.out[t]) break; } S.turn = t; S.round = (S.round || 0) + 1; S.dbl = 0; S.dice = null; S.offer = -1; S.phase = 'roll'; note(S, `${nm(S, t)} ist dran.`); }
function finish(S) { if (S.phase === 'over') return; const s = S.turn; if (S.out[s]) { nextTurn(S); return; } S.offer = -1; S.phase = S.dbl > 0 && !S.jail[s] ? 'roll' : 'end'; if (S.phase === 'roll') note(S, `Pasch! ${nm(S, s)} würfelt noch einmal.`); }
function settle(S) { if (S.phase === 'over') return; if (S.debts.length) { S.phase = 'debt'; return; } finish(S); }
function toJail(S, s, why) { step(S, { k: 'jump', seat: s, to: JAIL, jail: true }); S.pos[s] = JAIL; S.jail[s] = 1; S.dbl = 0; note(S, `${why} ${nm(S, s)} muss in die Wache.`, true); }
function walk(S, s, n) { const from = S.pos[s]; const to = (from + n) % 40; step(S, { k: 'walk', seat: s, from, to }); S.pos[s] = to; if (from + n >= 40) { flow(S, s, GO_MONEY); note(S, `${nm(S, s)} ${to === 0 ? 'landet auf' : 'kommt über'} Start und bekommt ${money(GO_MONEY)}.`); } }
function walkTo(S, s, f) { walk(S, s, (f - S.pos[s] + 40) % 40); }
function land(S, s, sum, mult = 1) {
  const f = S.pos[s]; const F = FIELDS[f];
  if (F.price) { const o = S.own[f]; if (o < 0) { S.offer = f; S.phase = 'buy'; note(S, `${F.name} ist frei: ${money(F.price)}. Kaufen oder versteigern?`); return; } if (o === s) { note(S, `${F.name} gehört dir selbst.`); return settle(S); } if (S.m[f]) { note(S, `${F.name} ist mit einer Hypothek belastet: keine Miete.`); return settle(S); } charge(S, s, rent(S, f, sum, mult), o, 'Miete ' + F.name); return settle(S); }
  if (F.t === 'tax') { if (F.kind === 'lux') { charge(S, s, F.v, -1, F.name); return settle(S); } S.phase = 'tax'; note(S, `${F.name}: ${money(TAX_FIX)} oder 10 % des Vermögens? Erst wählen, dann wird gerechnet.`); return; }
  if (F.t === 'gojail') { toJail(S, s, 'Ab zur Wache!'); return settle(S); }
  if (F.t === 'card') return drawCard(S, s, F.deck, sum);
  if (F.t === 'jail') note(S, `${nm(S, s)} ist nur zu Besuch in der Wache.`); if (F.t === 'park') note(S, `${nm(S, s)} macht Pause auf dem Parkplatz.`);
  return settle(S);
}
function drawCard(S, s, deck, sum) {
  const id = S.decks[deck].shift(); const C = CARDS[deck][id]; const e = C.e; step(S, { k: 'card', deck, id, seat: s }); S.log.push(`${nm(S, s)} zieht ${deck === 'z' ? 'Zufall' : 'Stadtkasse'}: ${C.x}`);
  if (e.t === 'free') { S.free[s].push(deck); return settle(S); } S.decks[deck].push(id);
  if (e.t === 'cash') { if (e.v > 0) flow(S, s, e.v); else charge(S, s, -e.v, -1, 'Karte'); return settle(S); }
  if (e.t === 'goto') { walkTo(S, s, e.f); return land(S, s, sum); }
  if (e.t === 'back') { const from = S.pos[s]; const to = (from + 37) % 40; step(S, { k: 'walk', seat: s, from, to, back: true }); S.pos[s] = to; return land(S, s, sum); }
  if (e.t === 'jail') { toJail(S, s, 'Karte:'); return settle(S); }
  if (e.t === 'near') { const L = e.kind === 'station' ? STATIONS : UTILS; const p = S.pos[s]; const f = L.find((q) => q > p) ?? L[0]; walkTo(S, s, f); return land(S, s, sum, 2); }
  if (e.t === 'repair') { let v = 0; for (const f of OWNABLE) if (S.own[f] === s && S.h[f]) v += S.h[f] === 5 ? e.H : S.h[f] * e.h; if (v) charge(S, s, v, -1, 'Reparaturen'); else note(S, `${nm(S, s)} hat keine Häuser: nichts zu zahlen.`); return settle(S); }
  if (e.t === 'each') { for (const q of alive(S)) if (q !== s) { if (e.v < 0) charge(S, s, -e.v, q, 'Karte'); else charge(S, q, e.v, s, 'Geburtstag'); } return settle(S); }
  return settle(S);
}
function bankrupt(S, s) {
  const d = S.debts.find((q) => q.seat === s); const to = d && d.to >= 0 && !S.out[d.to] ? d.to : -1; S.debts = S.debts.filter((q) => q.seat !== s && q.to !== s);
  let cash = S.cash[s]; for (const f of OWNABLE) if (S.own[f] === s && S.h[f]) { cash += S.h[f] * houseCost(f) / 2; if (S.h[f] === 5) S.bank.hotels++; else S.bank.houses += S.h[f]; S.h[f] = 0; }
  S.cash[s] = 0; S.out[s] = true; step(S, { k: 'out', seat: s });
  if (to >= 0) { S.cash[to] += Math.max(0, cash); for (const f of OWNABLE) if (S.own[f] === s) S.own[f] = to; S.free[to].push(...S.free[s]); note(S, `${nm(S, s)} ist pleite! Alles geht an ${nm(S, to)}.`, true); }
  else { for (const f of OWNABLE) if (S.own[f] === s) { S.own[f] = -1; S.m[f] = false; } for (const k of S.free[s]) S.decks[k].push(CARDS[k].findIndex((c) => c.e.t === 'free')); note(S, `${nm(S, s)} ist pleite! Die Grundstücke gehen an die Bank zurück.`, true); }
  S.free[s] = []; if (S.trade && (S.trade.from === s || S.trade.to === s)) S.trade = null;
  if (S.auction) { S.auction.who = S.auction.who.filter((q) => q !== s); if (S.auction.high === s) { S.auction.high = -1; S.auction.bid = 0; } }
  const left = alive(S); if (left.length === 1) { S.winner = left[0]; S.phase = 'over'; S.debts = []; note(S, `${nm(S, left[0])} gewinnt die Partie!`, true); return; }
  if (S.turn === s) { S.debts = S.debts.filter((q) => q.seat !== s); if (S.debts.length) { S.phase = 'debt'; return; } nextTurn(S); } else settle(S);
}
function rollOpen(S, s, d) {
  const v = d[0] + d[1]; S.open[s] = v; note(S, `${nm(S, s)} würfelt ${v}.`); const left = S.openWho.filter((q) => S.open[q] === null); if (left.length) { S.turn = left.find((q) => q > s) ?? left[0]; return; }
  const best = Math.max(...S.openWho.map((q) => S.open[q])); const tied = S.openWho.filter((q) => S.open[q] === best);
  if (tied.length === 1) { S.turn = tied[0]; S.phase = 'roll'; S.dice = null; note(S, `${nm(S, tied[0])} beginnt!`, true); return; }
  S.openWho = tied; for (const q of tied) S.open[q] = null; S.turn = tied[0]; note(S, 'Gleichstand: nochmal würfeln!');
}
function doRoll(S, s, rnd) {
  const d = [1 + Math.floor(rnd() * 6), 1 + Math.floor(rnd() * 6)]; const sum = d[0] + d[1]; const dbl = d[0] === d[1]; S.dice = d; step(S, { k: 'dice', d, seat: s });
  if (S.phase === 'open') { rollOpen(S, s, d); return; }
  if (S.jail[s]) {
    if (dbl) { S.jail[s] = 0; S.dbl = 0; note(S, `Pasch! ${nm(S, s)} kommt aus der Wache und zieht ${sum} Felder.`, true); walk(S, s, sum); land(S, s, sum); return; }
    if (S.jail[s] >= 3) { S.jail[s] = 0; S.dbl = 0; note(S, `Drei Versuche ohne Pasch: ${nm(S, s)} zahlt ${money(BAIL)} und zieht ${sum} Felder.`); charge(S, s, BAIL, -1, 'Wache'); walk(S, s, sum); land(S, s, sum); return; }
    S.jail[s]++; S.dbl = 0; note(S, `Kein Pasch, ${nm(S, s)} bleibt in der Wache (Versuch ${S.jail[s] - 1} von 3).`); S.phase = 'end'; return;
  }
  if (dbl) { S.dbl++; if (S.dbl >= 3) { toJail(S, s, 'Dritter Pasch hintereinander!'); S.phase = 'end'; return; } } else S.dbl = 0;
  note(S, `${nm(S, s)} würfelt ${d[0]} und ${d[1]}.`); walk(S, s, sum); land(S, s, sum);
}
function startAuction(S) { const f = S.offer; const who = []; for (let k = 1; k <= 3; k++) { const q = (S.turn + k) % 3; if (!S.out[q]) who.push(q); } S.auction = { f, bid: 0, high: -1, who, i: 0 }; S.phase = 'auction'; note(S, `Versteigerung: ${FIELDS[f].name}. Mindestgebot 10 T.`, true); }
function auctionNext(S) {
  const A = S.auction; if (!A.who.length || (A.who.length === 1 && A.high === A.who[0])) {
    if (A.high >= 0) { S.own[A.f] = A.high; flow(S, A.high, -A.bid); note(S, `${nm(S, A.high)} ersteigert ${FIELDS[A.f].name} für ${money(A.bid)}.`, true); } else note(S, `Niemand bietet: ${FIELDS[A.f].name} bleibt bei der Bank.`);
    S.auction = null; S.offer = -1; settle(S); return;
  }
  if (A.who[A.i] === A.high) A.i = (A.i + 1) % A.who.length;
}
const tradeOk = (S, T) => { const side = (q, x) => x.cash >= 0 && x.cash <= S.cash[q] && x.cards <= S.free[q].length && x.f.every((f) => S.own[f] === q && groupHouses(S, f) === 0); return T.from !== T.to && !S.out[T.to] && side(T.from, T.give) && side(T.to, T.get) && (T.give.f.length + T.get.f.length + T.give.cash + T.get.cash + T.give.cards + T.get.cards) > 0; };
function doTrade(S) {
  const T = S.trade; const move = (a, b, x) => { for (const f of x.f) S.own[f] = b; if (x.cash) { flow(S, a, -x.cash); flow(S, b, x.cash); } for (let k = 0; k < x.cards; k++) S.free[b].push(S.free[a].pop()); };
  move(T.from, T.to, T.give); move(T.to, T.from, T.get); note(S, `Handel zwischen ${nm(S, T.from)} und ${nm(S, T.to)} ist abgeschlossen.`, true); S.trade = null;
}
const cleanSide = (x) => ({ f: [...new Set((x && x.f) || [])].filter((f) => OWNABLE.includes(f)), cash: Math.max(0, Math.floor(Number((x && x.cash) || 0))), cards: Math.max(0, Math.floor(Number((x && x.cards) || 0))) });
const MANAGE = ['roll', 'end', 'buy', 'tax', 'debt'];
// Eine Aktion eines Spielers. Rückgabe true, wenn sie gültig war und S verändert hat
export function act(S, seat, m, rnd = Math.random) {
  if (!m || seat < 0 || seat > 2 || S.out[seat] && m.c !== 'again') return false; const c = m.c; const mine = actor(S) === seat;
  if (c === 'pick') { if (S.phase !== 'pick' || S.tokens[seat] !== null || !TOKENS.some((t) => t.id === m.token) || S.tokens.includes(m.token)) return false; begin(S); S.tokens[seat] = m.token; note(S, `${nm(S, seat)} spielt mit ${TOKENS.find((t) => t.id === m.token).name}.`); if (S.tokens.every(Boolean)) { S.phase = 'open'; S.turn = 0; note(S, 'Jeder würfelt einmal, die höchste Augenzahl beginnt.', true); } return true; }
  if (c === 'roll') { if (!mine || S.trade || (S.phase !== 'open' && S.phase !== 'roll')) return false; begin(S); doRoll(S, seat, rnd); return true; }
  if (c === 'jailPay') { if (!mine || S.phase !== 'roll' || !S.jail[seat] || S.cash[seat] < BAIL || S.trade) return false; begin(S); S.jail[seat] = 0; flow(S, seat, -BAIL); note(S, `${nm(S, seat)} zahlt ${money(BAIL)} und ist frei.`); return true; }
  if (c === 'jailCard') { if (!mine || S.phase !== 'roll' || !S.jail[seat] || !S.free[seat].length || S.trade) return false; begin(S); const k = S.free[seat].pop(); S.decks[k].push(CARDS[k].findIndex((q) => q.e.t === 'free')); S.jail[seat] = 0; note(S, `${nm(S, seat)} nutzt die Karte „Raus aus der Wache!“.`); return true; }
  if (c === 'buy') { const f = S.offer; if (!mine || S.phase !== 'buy' || S.cash[seat] < FIELDS[f].price) return false; begin(S); S.own[f] = seat; flow(S, seat, -FIELDS[f].price); note(S, `${nm(S, seat)} kauft ${FIELDS[f].name} für ${money(FIELDS[f].price)}.`); S.offer = -1; settle(S); return true; }
  if (c === 'decline') { if (!mine || S.phase !== 'buy') return false; begin(S); startAuction(S); auctionNext(S); return true; }
  if (c === 'bid') { const A = S.auction; const v = Math.floor(Number(m.v)); if (!mine || S.phase !== 'auction' || !(v > A.bid) || v < 10 || v > S.cash[seat]) return false; begin(S); A.bid = v; A.high = seat; note(S, `${nm(S, seat)} bietet ${money(v)}.`); A.i = (A.i + 1) % A.who.length; auctionNext(S); return true; }
  if (c === 'pass') { const A = S.auction; if (!mine || S.phase !== 'auction') return false; begin(S); note(S, `${nm(S, seat)} steigt aus.`); A.who.splice(A.i, 1); if (A.i >= A.who.length) A.i = 0; auctionNext(S); return true; }
  if (c === 'tax') { if (!mine || S.phase !== 'tax') return false; begin(S); const v = m.pct ? Math.floor(worth(S, seat) / 10) : TAX_FIX; note(S, `${nm(S, seat)} wählt ${m.pct ? '10 % des Vermögens' : 'den festen Betrag'}.`); charge(S, seat, v, -1, 'Einkommensteuer'); settle(S); return true; }
  if (c === 'end') { if (!mine || S.phase !== 'end' || S.trade) return false; begin(S); nextTurn(S); return true; }
  if (c === 'pay') { const d = S.debts[0]; if (!mine || S.phase !== 'debt' || S.cash[seat] < d.amount) return false; begin(S); S.debts.shift(); charge(S, seat, d.amount, d.to, d.why); settle(S); return true; }
  if (c === 'bankrupt') { if (!mine || S.phase !== 'debt') return false; begin(S); bankrupt(S, seat); return true; }
  if (c === 'again') { if (S.phase !== 'over') return false; const rev = S.rev; const id = S.evId; const n = newGame(S.names, S.ai, rnd); Object.assign(S, n, { tokens: S.tokens, phase: 'open', rev, evId: id }); begin(S); step(S, { k: 'new' }); note(S, 'Neue Partie! Jeder würfelt einmal.', true); return true; }
  // Handel: nur wer dran ist schlägt vor, der andere sagt ja oder nein
  if (c === 'trade') { if (S.turn !== seat || !['roll', 'end'].includes(S.phase) || S.trade) return false; const T = { from: seat, to: Number(m.to), give: cleanSide(m.give), get: cleanSide(m.get) }; if (!(T.to >= 0 && T.to <= 2) || !tradeOk(S, T)) return false; begin(S); S.trade = T; if (S.offered) S.offered[seat] = S.round; note(S, `${nm(S, seat)} bietet ${nm(S, T.to)} einen Handel an.`, true); return true; }
  if (c === 'answer') { const T = S.trade; if (!T || T.to !== seat) return false; begin(S); if (m.yes && tradeOk(S, T)) doTrade(S); else { note(S, `${nm(S, seat)} lehnt den Handel ab.`); if (S.noTrade) S.noTrade.push(T.from + ':' + T.get.f.join(',')); S.trade = null; } return true; }
  if (c === 'cancel') { const T = S.trade; if (!T || T.from !== seat) return false; begin(S); S.trade = null; note(S, `${nm(S, seat)} zieht das Angebot zurück.`); return true; }
  // Verwalten: bauen, abreißen, Hypotheken. Jeder darf, solange gerade nicht versteigert oder gehandelt wird; wer Schulden hat, sowieso
  const f = Number(m.f); if (!OWNABLE.includes(f) || !MANAGE.includes(S.phase) || S.trade) return false; const F = FIELDS[f];
  if (c === 'build') { if (!canBuild(S, seat, f)) return false; begin(S); const cost = houseCost(f); flow(S, seat, -cost); if (S.h[f] === 4) { S.bank.hotels--; S.bank.houses += 4; } else S.bank.houses--; S.h[f]++; step(S, { k: 'build', f }); note(S, `${nm(S, seat)} baut ${S.h[f] === 5 ? 'ein Hotel' : 'ein Haus'} auf ${F.name}.`); return true; }
  if (c === 'sell') { if (!canSell(S, seat, f)) return false; begin(S); const half = houseCost(f) / 2; if (S.h[f] === 5) { S.bank.hotels++; if (S.bank.houses >= 4) { S.bank.houses -= 4; S.h[f] = 4; flow(S, seat, half); } else { S.h[f] = 0; flow(S, seat, half * 5); } } else { S.h[f]--; S.bank.houses++; flow(S, seat, half); } step(S, { k: 'build', f }); note(S, `${nm(S, seat)} verkauft Gebäude auf ${F.name}.`); return true; }
  if (c === 'mort') { if (!canMort(S, seat, f)) return false; begin(S); S.m[f] = true; flow(S, seat, mortValue(f)); step(S, { k: 'build', f }); note(S, `${nm(S, seat)} nimmt eine Hypothek auf ${F.name} auf (${money(mortValue(f))}).`); return true; }
  if (c === 'unmort') { if (!canUnmort(S, seat, f)) return false; begin(S); S.m[f] = false; flow(S, seat, -unmortCost(f)); step(S, { k: 'build', f }); note(S, `${nm(S, seat)} löst die Hypothek auf ${F.name} ab (${money(unmortCost(f))}).`); return true; }
  return false;
}
// ---- KI: liefert die nächste Aktion für einen KI-Platz oder null
const value = (S, seat, f) => { const F = FIELDS[f]; let v = S.m[f] ? F.price / 2 : F.price; if (F.g) { const G = groupOf(F.g); const mineN = G.filter((q) => S.own[q] === seat).length; if (mineN === G.length - 1 && S.own[f] !== seat) v *= 1.8; } return v; };
// Einmal pro Runde: fehlendes Stück einer Farbe holen, am liebsten im Tausch gegen das, was dem anderen fehlt, sonst mit Aufpreis
function aiOffer(S, s) {
  if (!S.offered || S.offered[s] === S.round) return null; const missing = (q, f) => FIELDS[f].t === 'street' && S.own[f] >= 0 && S.own[f] !== q && groupHouses(S, f) === 0 && groupOf(FIELDS[f].g).every((x) => x === f || S.own[x] === q);
  for (const f of OWNABLE) {
    if (!missing(s, f) || S.noTrade.includes(s + ':' + f)) continue; const q = S.own[f]; const g = OWNABLE.find((x) => S.own[x] === s && missing(q, x)); const back = g === undefined ? 0 : value(S, q, g);
    const cash = Math.max(0, Math.ceil((value(S, s, f) * 1.2 - back) / 10) * 10); if (cash > S.cash[s] - 100) continue;
    return { c: 'trade', to: q, give: { f: g === undefined ? [] : [g], cash }, get: { f: [f] } };
  }
  return null;
}
export function aiMove(S) {
  if (S.phase === 'pick') { if (S.tokens.some((t, i) => t === null && !S.ai[i])) return null; /* Menschen wählen zuerst */ const q = [0, 1, 2].find((i) => S.ai[i] && S.tokens[i] === null); return q === undefined ? null : { seat: q, m: { c: 'pick', token: TOKENS.find((t) => !S.tokens.includes(t.id)).id } }; }
  const s = actor(S); if (s < 0 || !S.ai[s]) return null; const cash = S.cash[s];
  if (S.trade) { const T = S.trade; const gain = T.give.f.reduce((a, f) => a + value(S, s, f), 0) + T.give.cash + T.give.cards * 50; const loss = T.get.f.reduce((a, f) => a + value(S, T.from, f), 0) + T.get.cash + T.get.cards * 50; return { seat: s, m: { c: 'answer', yes: gain >= loss * 1.15 && cash - T.get.cash >= 0 } }; }
  if (S.phase === 'open') return { seat: s, m: { c: 'roll', rev: S.rev } };
  if (S.phase === 'auction') { const A = S.auction; const max = Math.min(cash - 60, Math.floor(value(S, s, A.f) * 1.05)); const v = A.bid + (A.bid < 100 ? 10 : 20); return { seat: s, m: v <= max ? { c: 'bid', v, rev: S.rev } : { c: 'pass', rev: S.rev } }; }
  if (S.phase === 'debt') {
    const d = S.debts[0]; if (cash >= d.amount) return { seat: s, m: { c: 'pay', rev: S.rev } }; if (liquid(S, s) < d.amount) return { seat: s, m: { c: 'bankrupt', rev: S.rev } };
    const sell = OWNABLE.find((f) => canSell(S, s, f)); if (sell !== undefined) return { seat: s, m: { c: 'sell', f: sell } };
    const morts = OWNABLE.filter((f) => canMort(S, s, f)).sort((a, b) => (groupFull(S, a) - groupFull(S, b)) || FIELDS[a].price - FIELDS[b].price); if (morts.length) return { seat: s, m: { c: 'mort', f: morts[0] } }; return { seat: s, m: { c: 'bankrupt', rev: S.rev } };
  }
  if (S.phase === 'buy') { const f = S.offer; const p = FIELDS[f].price; const want = cash - p >= 100 || (value(S, s, f) > p && cash >= p); return { seat: s, m: { c: want && cash >= p ? 'buy' : 'decline', rev: S.rev } }; }
  if (S.phase === 'tax') return { seat: s, m: { c: 'tax', pct: Math.floor(worth(S, s) / 10) < TAX_FIX, rev: S.rev } };
  if (S.phase === 'roll') { if (S.jail[s]) { if (S.free[s].length) return { seat: s, m: { c: 'jailCard', rev: S.rev } }; const free = OWNABLE.filter((f) => S.own[f] < 0).length; if (free > 8 && cash >= 300) return { seat: s, m: { c: 'jailPay', rev: S.rev } }; } return { seat: s, m: { c: 'roll', rev: S.rev } }; }
  if (S.phase === 'end') {
    const un = OWNABLE.filter((f) => S.own[f] === s && S.m[f] && cash - unmortCost(f) >= 500); if (un.length) return { seat: s, m: { c: 'unmort', f: un[0] } };
    const b = OWNABLE.filter((f) => canBuild(S, s, f) && cash - houseCost(f) >= 200).sort((a, c) => FIELDS[c].price - FIELDS[a].price); if (b.length) return { seat: s, m: { c: 'build', f: b[0] } };
    const o = aiOffer(S, s); if (o) return { seat: s, m: o };
    return { seat: s, m: { c: 'end', rev: S.rev } };
  }
  return null;
}
