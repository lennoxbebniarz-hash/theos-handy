// Theos Seitenscheidel - Ludwig: der Bunker (nur Regeln, keine Grafik, läuft auch in node --test).
// Die Falltür (Boss-Plan-Knoten t_falltuer) liegt unter dem Teppich neben dem Tisch. Unten: eine riesige alte Halle, verbunden mit der Tiefgarage.
// Maschinen aus dem Boss-Plan werden Stück für Stück aufgebaut: jede gekaufte Stufe ist eine Maschine mit Bauzeit.
// Handmaschinen laufen nur, wenn jemand sie bedient (Ludwig mit E, ein Kumpel unten, ein Roboter). Automaten laufen allein, klemmen aber manchmal.
// Die Kippen landen im Lager (Paletten). Läden schicken Aufträge (annehmen oder ablehnen, Ablehnen kostet Respekt), geliefert wird per Lastwagen
// aus der Tiefgarage. KippCord ist der Chat: Aufträge, Kumpels, Beschwerden und die Warnung vor den Eltern.
import { costMul } from './ludwigmp.js'; // Balance nach Spielerzahl (2026-11-21)
import { fxOf, lvl, gainResp } from './ludwigskills.js';
import { neuesRegal, neueSm, neueRazzia, fixTeil3, auftragsSorten, auftragVorrat, auftragNimm, auftragWort, AUFTRAG_SORTEN, AUFTRAG_PREIS } from './ludwigbunker3.js'; // Paket 5

export const BUNKER_NODE = 't_falltuer';
// Maschinen je Boss-Plan-Knoten (eine Stufe = eine Maschine). kind: hand (muss bedient werden), auto, papier/tabak (Nachschub), robo (bedient), deko
export const MACHINES = {
  p_wickel: { name: 'Wickelmaschine', kind: 'hand', rate: 4, build: 25 },
  p_klopf: { name: 'Klopfautomat', kind: 'hand', rate: 6, build: 30 },
  p_band: { name: 'Fließband', kind: 'auto', rate: 10, build: 40 },
  h_druck: { name: 'Blättchen-Druckerei', kind: 'papier', rate: 8, build: 30 },
  p_plant: { name: 'Tabakplantage', kind: 'tabak', rate: 6, build: 40 },
  p_wand: { name: 'Wandfabrik', kind: 'auto', rate: 25, build: 60 },
  p_keller: { name: 'Kellerhalle', kind: 'auto', rate: 60, build: 90 },
  p_presse: { name: 'Riesenpresse', kind: 'auto', rate: 150, build: 120 },
  c_robo: { name: 'Roboter-Ludwig', kind: 'robo', build: 30 },
  c_labor: { name: 'Geheimlabor', kind: 'deko', build: 30 },
  c_rakete: { name: 'Rakete', kind: 'deko', build: 60 },
};
export const MACHINE_IDS = Object.keys(MACHINES);
// Preise in Cent (erste Maschine). Jede weitere derselben Sorte kostet 50 % mehr. Der Boss-Plan schaltet frei, gekauft wird im Shop am Gaming-PC.
export const MACHINE_PRICE = { p_wickel: 15000, p_klopf: 40000, p_band: 80000, h_druck: 60000, p_plant: 100000, p_wand: 300000, p_keller: 800000, p_presse: 2500000, c_robo: 200000, c_labor: 150000, c_rakete: 1000000 };
export const machinePrice = (id, i) => Math.round((MACHINE_PRICE[id] * (1 + 0.5 * i)) / 100) * 100;
export function machineOffer(S, id) { const have = (S.bunker.bought[id] || 0); const allowed = lvl(S, id); return { id, have, allowed, price: have < allowed ? Math.round(machinePrice(id, have) * costMul(S)) : null }; /* Mehrspieler: Maschinen teurer */ }
export function buyMachine(S, id) {
  if (!MACHINES[id]) return { ok: false, why: 'gibts' }; if (!bunkerOpen(S)) return { ok: false, why: 'bunker' }; const o = machineOffer(S, id);
  if (o.have >= o.allowed) return { ok: false, why: 'frei', o }; if (S.geld < o.price) return { ok: false, why: 'geld', fehlt: o.price - S.geld, o };
  S.geld -= o.price; S.bunker.bought[id] = o.have + 1; return { ok: true, id, price: o.price, n: o.have + 1, tier: { name: MACHINES[id].name } };
}
export const RUN = 30; // eine Ladung an einer Handmaschine läuft 30 Sekunden
export const JAM = { perMin: 0.12, fix: 8 }; // Automaten klemmen im Schnitt alle 8 Minuten, ein Kumpel unten repariert in 8 Sekunden
export const SIZES = [50, 100, 200, 400, 800, 1500, 3000, 5000];
export const FRIST = [5, 6, 7, 8, 10, 12, 15, 20]; // Minuten
export const SHOPS = [['Kiosk Eck-Ede', 'Tankstelle Turbo'], ['Kiosk Eck-Ede', 'Tankstelle Turbo', 'Späti Mitternacht'], ['Supermarkt Billig-Bude', 'Getränke Gerd'], ['Supermarkt Billig-Bude', 'Getränke Gerd', 'Bahnhofskiosk'],
  ['Großhändler Tabak-Grosso', 'Discounter Knauser'], ['Großhändler Tabak-Grosso', 'Discounter Knauser', 'Kiosk-Kette Nord'], ['Import Paris', 'Import Tokio', 'Import New York'], ['Import Paris', 'Import Tokio', 'Import New York', 'Kiosk-Kette Europa']];
export const ORDER = { first: 20, gapMin: 90, gapMax: 150, decide: 90, maxOpen: 3, preis: 80, pause: 300 };
export const MEGA = { n: 20000, frist: 30, shop: 'Die ganze Welt', preis: 100, again: 300 };
export const LOCK = 120; // so lange nagelt Mama die Falltür zu
export const CHANNELS = { auftraege: '#aufträge', kumpels: '#kumpels', beschwerden: '#beschwerden' };
const GAGS = {
  kumpels: [['Rot', 'Wer hat meinen Energydrink getrunken?'], ['Gelb', 'Zehn Kippen in drei Minuten. Neuer Rekord.'], ['Grün', 'Leute, die Wickelmaschine macht komische Geräusche.'], ['Bruno', 'Krieg ich Rabatt? Ich bin Stammkunde.'],
    ['Kalle', 'Neuer Tabak ist da. Hinten raus, nicht durch den Laden.'], ['Rot', 'Meine Mutter hat angerufen. Ich hab gesagt, wir lernen Mathe.'], ['Grün', 'Wieso ist der Bunker eigentlich so riesig?'], ['Gelb', 'Ich glaub, der Lastwagenfahrer heißt Detlef.'],
    ['Bruno', 'Ich hab allen erzählt, dass Ludwig der Boss ist.'], ['Kalle', 'Wenn einer fragt: Ihr kennt mich nicht.'], ['Rot', 'Ludwig, dein Roboter guckt mich komisch an.'], ['Grün', 'Kann man im Bunker eigentlich Pizza bestellen?']],
  beschwerden: [['Kiosk Eck-Ede', 'Die letzte Lieferung war ein bisschen krumm.'], ['Tankstelle Turbo', 'Warum riecht die Packung nach Opa?'], ['Supermarkt Billig-Bude', 'Ein Kunde fragt, ob es die auch mit Menthol gibt.'],
    ['Getränke Gerd', 'Top Ware. Weiter so.'], ['Kunde', 'Mein Vater hat gefragt, wo ich die herhab. Ich hab Bäckerei gesagt.'], ['Bahnhofskiosk', 'Die Packungen sehen aus wie selbst gemalt. Verkaufen sich trotzdem.']],
};
const KUMPEL_NAMES = ['Rot', 'Gelb', 'Grün'];

const clampN = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
const pick = (list, rnd) => list[Math.floor(rnd() * list.length) % list.length];
const euroT = (c) => (Math.round(c) / 100).toFixed(2).replace('.', ',') + ' €';
const minT = (s) => `${Math.max(0, Math.round(s / 60))} Minuten`;

export function newBunker() {
  return { hatch: 'zu', lock: 0, units: [], lager: 0, orders: [], nextOrder: ORDER.first, nextId: 1, pause: {}, chat: [], chatId: 1, gagT: 50, mega: false, megaT: 0, kumpel: null, seen: 0, started: false, bought: {}, stats: { liefer: 0, verpasst: 0, abgelehnt: 0, gebaut: 0, made: 0 }, regal: neuesRegal(), sm: neueSm(), razzia: neueRazzia() };
}
export const bunkerOpen = (S) => lvl(S, BUNKER_NODE) > 0;
export function fixBunker(raw) {
  const B = newBunker(); if (!raw || typeof raw !== 'object') return B;
  B.hatch = raw.hatch === 'offen' ? 'offen' : 'zu'; B.lock = clampN(raw.lock, 0, LOCK, 0); B.lager = Math.round(clampN(raw.lager, 0, 1e9, 0)); B.nextOrder = clampN(raw.nextOrder, 0, 600, ORDER.first); B.nextId = Math.round(clampN(raw.nextId, 1, 1e9, 1));
  B.gagT = clampN(raw.gagT, 0, 600, 50); B.mega = !!raw.mega; B.megaT = clampN(raw.megaT, 0, 3600, 0); B.kumpel = KUMPEL_KEYS.includes(raw.kumpel) ? raw.kumpel : null; B.seen = Math.round(clampN(raw.seen, 0, 1e9, 0)); B.started = !!raw.started; B.chatId = Math.round(clampN(raw.chatId, 1, 1e9, 1));
  if (Array.isArray(raw.units)) for (const u of raw.units.slice(0, 40)) { if (!u || !MACHINES[u.id]) continue; B.units.push({ id: u.id, i: Math.round(clampN(u.i, 0, 9, 0)), build: clampN(u.build, 0, 600, 0), run: clampN(u.run, 0, RUN, 0), jam: !!u.jam, fix: 0, acc: clampN(u.acc, 0, 1, 0), op: null, starved: false, made: Math.round(clampN(u.made, 0, 1e12, 0)) }); }
  if (Array.isArray(raw.orders)) for (const o of raw.orders.slice(0, 6)) { if (!o || typeof o !== 'object') continue; const n = Math.round(clampN(o.n, 1, 1e6, 50)); B.orders.push({ id: Math.round(clampN(o.id, 1, 1e9, 1)), shop: String(o.shop || 'Kiosk').slice(0, 40), n, preis: Math.round(clampN(o.preis, 1, 10000, ORDER.preis)), resp: clampN(o.resp, 0, 1e5, n / 10), frist: clampN(o.frist, 60, 7200, 300), left: clampN(o.left, 0, 7200, 300), decide: clampN(o.decide, 0, 600, ORDER.decide), state: o.state === 'aktiv' ? 'aktiv' : 'neu', mega: !!o.mega }); }
  if (raw.pause && typeof raw.pause === 'object') for (const [k, v] of Object.entries(raw.pause).slice(0, 20)) B.pause[String(k).slice(0, 40)] = clampN(v, 0, 3600, 0);
  if (Array.isArray(raw.chat)) for (const m of raw.chat.slice(-80)) { if (!m || !CHANNELS[m.ch]) continue; B.chat.push({ id: Math.round(clampN(m.id, 1, 1e9, 1)), ch: m.ch, who: String(m.who || '').slice(0, 40), text: String(m.text || '').slice(0, 200), t: Math.round(clampN(m.t, 0, 1e9, 0)), alarm: !!m.alarm }); }
  const st = raw.stats || {}; for (const k of Object.keys(B.stats)) B.stats[k] = Math.round(clampN(st[k], 0, 1e12, 0));
  if (Array.isArray(raw.orders)) { const so = new Map(raw.orders.filter((o) => o && typeof o === 'object').map((o) => [o.id, o.sorte])); for (const o of B.orders) { const s = so.get(o.id); if (Object.prototype.hasOwnProperty.call(AUFTRAG_SORTEN, s)) o.sorte = s; } } // Aufträge für neue Sorten (Paket 5)
  fixTeil3(B, raw); // Regale, Sortenmaschinen, Razzia (Paket 5)
  // gekaufte Maschinen; ältere Stände ohne Angabe behalten ihre schon aufgebauten
  if (raw.bought && typeof raw.bought === 'object') { for (const id of MACHINE_IDS) { const v = Math.round(clampN(raw.bought[id], 0, 9, 0)); if (v) B.bought[id] = v; } } else for (const u of B.units) B.bought[u.id] = Math.max(B.bought[u.id] || 0, u.i + 1);
  return B;
}
export const KUMPEL_KEYS = ['rot', 'gelb', 'gruen'];

// ---- Chat (KippCord)
export function chat(S, ch, who, text, extra = {}) { const B = S.bunker; const m = { id: B.chatId++, ch, who, text: String(text).slice(0, 200), t: Math.round(S.t || 0), alarm: !!extra.alarm }; B.chat.push(m); if (B.chat.length > 80) B.chat.splice(0, B.chat.length - 80); return m; }
export function warnChat(S, who, rnd = Math.random) { return chat(S, 'kumpels', pick(KUMPEL_NAMES, rnd), who === 'papa' ? 'PAPA IST ZU HAUSE!!! Schnell hoch, alles verstecken!!!' : 'MAMA KOMMT!!! Alle verstecken!!! Falltür zu!!!', { alarm: true }); }
const loseResp = (S, n) => { const k = Math.min(S.respekt, Math.max(0, Math.round(n))); S.respekt -= k; return k; };

// ---- Maschinen: jede Stufe eines Maschinen-Knotens ist eine Maschine. Neue Stufen werden aufgebaut (Bauzeit).
export function syncUnits(S, ev = []) {
  const B = S.bunker;
  for (const id of MACHINE_IDS) { const want = Math.min(lvl(S, id), B.bought[id] || 0); const have = B.units.filter((u) => u.id === id); for (let i = have.length; i < want; i++) { const u = { id, i, build: MACHINES[id].build, run: 0, jam: false, fix: 0, acc: 0, op: null, starved: false, made: 0 }; B.units.push(u); ev.push({ k: 'bau', u }); } }
  return ev;
}
// Bediener für Handmaschinen: der Kumpel unten und jeder fertige Roboter übernehmen je eine Maschine
export function assignOps(S) {
  const B = S.bunker; const ops = []; if (B.kumpel) ops.push('kumpel'); for (const u of B.units) if (u.id === 'c_robo' && u.build <= 0) ops.push('robo' + u.i);
  let k = 0; for (const u of B.units) { if (MACHINES[u.id].kind !== 'hand') continue; u.op = u.build <= 0 && k < ops.length ? ops[k++] : null; }
  return ops.length;
}
export function unitStatus(u) {
  const M = MACHINES[u.id]; if (u.build > 0) return 'bau'; if (M.kind === 'deko' || M.kind === 'robo') return 'fertig'; if (u.jam) return 'klemmt'; if (u.starved) return 'material';
  if (M.kind === 'hand' && u.run <= 0 && !u.op) return 'wartet'; return 'läuft';
}
export const buildProgress = (u) => 1 - u.build / MACHINES[u.id].build;
// Was eine Maschine macht (Anzeige an der Maschine und Hinweis beim Anschauen): Menge pro Minute, was, bisher gemacht; bei Robotern und Extras ein Satz
export function unitInfo(S, u) {
  const M = MACHINES[u.id];
  if (M.kind === 'robo') { const job = S.bunker.units.find((q) => q.op === 'robo' + u.i); return { line: job ? `bedient ${MACHINES[job.id].name} ${job.i + 1}` : 'wartet auf Arbeit' }; }
  if (u.id === 'c_labor') return { line: 'alle Maschinen +25 % schneller' };
  if (u.id === 'c_rakete') return { line: 'Respekt +50 %, alle reden darüber' };
  const what = M.kind === 'papier' ? 'Blättchen' : M.kind === 'tabak' ? 'Tabak' : 'Kippen';
  return { rate: Math.round(M.rate * (1 + fxOf(S).autoMult) * 10) / 10, what, made: u.made || 0 };
}
// Ludwig bedient eine Handmaschine (E): eine Ladung läuft RUN Sekunden. Klemmt ein Automat, macht E ihn wieder frei.
export function operate(S, idx) {
  const u = S.bunker.units[idx]; if (!u) return { ok: false, why: 'gibts' }; const M = MACHINES[u.id];
  if (u.build > 0) return { ok: false, why: 'bau' }; if (u.jam) { u.jam = false; u.fix = 0; return { ok: true, fixed: true, u }; }
  if (M.kind !== 'hand') return { ok: false, why: 'auto' }; u.run = RUN; u.starved = false; return { ok: true, started: true, u };
}
export function bunkerRates(S) {
  const f = fxOf(S); const mult = 1 + f.autoMult; const r = { kippen: 0, papier: 0, tabak: 0 }; if (!S.bunker) return r;
  for (const u of S.bunker.units) { if (u.build > 0) continue; const M = MACHINES[u.id]; if (M.kind === 'hand' || M.kind === 'auto') r.kippen += M.rate * mult; else if (M.kind === 'papier') r.papier += M.rate * mult; else if (M.kind === 'tabak') r.tabak += M.rate * mult; }
  return r;
}

// ---- Lager: Kippen aus den Taschen hineinlegen (E) oder herausnehmen (F)
export function lagerPut(S) { const n = S.hand; if (n <= 0) return { ok: false, why: 'nichts' }; S.bunker.lager += n; S.hand = 0; return { ok: true, n }; }
export function lagerTake(S, cap) { const space = cap - S.hand - (S.sorten ? Object.values(S.sorten).reduce((a, q) => a + q.hand, 0) : 0); /* Taschen zählen alle Sorten */ if (space <= 0) return { ok: false, why: 'voll' }; const n = Math.min(space, S.bunker.lager); if (n <= 0) return { ok: false, why: 'leer' }; S.bunker.lager -= n; S.hand += n; return { ok: true, n }; }

// ---- Aufträge
export function capacity(S) { return bunkerRates(S).kippen + 8; } // Kippen pro Minute, die man schaffen kann (Maschinen plus Hand)
export function newOrder(S, rnd = Math.random, ev = []) {
  const B = S.bunker; const cap = capacity(S); let k = 0; for (let i = 0; i < SIZES.length; i++) if (SIZES[i] <= cap * FRIST[i] * 0.75) k = i;
  if (k > 0 && rnd() < 0.35) k--; const shops = SHOPS[k].filter((s) => !(B.pause[s] > 0) && !B.orders.some((o) => o.shop === s)); if (!shops.length) return null;
  const shop = pick(shops, rnd); const arten = auftragsSorten(S); const sorte = arten.length && rnd() < 0.4 ? pick(arten, rnd) : null; // Paket 5: auch Aufträge für die neuen Sorten
  const n = sorte ? Math.max(5, Math.round((SIZES[k] * AUFTRAG_SORTEN[sorte]) / 5) * 5) : SIZES[k]; const preis = Math.round((sorte ? AUFTRAG_PREIS[sorte] : ORDER.preis) * (1 + fxOf(S).price));
  const o = { id: B.nextId++, shop, n, preis, resp: sorte ? (n * preis) / 800 : n / 10, frist: FRIST[k] * 60, left: FRIST[k] * 60, decide: ORDER.decide, state: 'neu', mega: false }; if (sorte) o.sorte = sorte; B.orders.push(o);
  chat(S, 'auftraege', shop, `Neue Anfrage: ${n.toLocaleString('de-DE')} ${auftragWort(sorte)} in ${FRIST[k]} Minuten, ${euroT(preis)} pro Stück. Annehmen?`); ev.push({ k: 'auftrag', o }); return o;
}
function offerMega(S, ev) {
  const B = S.bunker; const o = { id: B.nextId++, shop: MEGA.shop, n: MEGA.n, preis: MEGA.preis, resp: MEGA.n / 10, frist: MEGA.frist * 60, left: MEGA.frist * 60, decide: ORDER.decide * 2, state: 'neu', mega: true }; B.orders.push(o);
  chat(S, 'auftraege', MEGA.shop, `MEGA-AUFTRAG: Beliefere die ganze Welt! ${MEGA.n.toLocaleString('de-DE')} Kippen in ${MEGA.frist} Minuten.`); ev.push({ k: 'auftrag', o }); return o;
}
export function accept(S, id) { const o = S.bunker.orders.find((q) => q.id === id); if (!o || o.state !== 'neu') return { ok: false }; o.state = 'aktiv'; o.left = o.frist; chat(S, 'auftraege', 'Ludwig', `Auftrag von ${o.shop} angenommen: ${o.n.toLocaleString('de-DE')} ${auftragWort(o.sorte)} in ${minT(o.frist)}.`); return { ok: true, o }; }
export function decline(S, id, auto = false) {
  const B = S.bunker; const i = B.orders.findIndex((q) => q.id === id); if (i < 0 || B.orders[i].state !== 'neu') return { ok: false }; const o = B.orders[i]; B.orders.splice(i, 1);
  if (o.mega) { B.megaT = MEGA.again; chat(S, 'auftraege', o.shop, 'Die Welt wartet. Wir fragen später noch mal.'); return { ok: true, o, pen: 0 }; }
  const pen = loseResp(S, Math.max(2, o.n / 100)); B.stats.abgelehnt++; chat(S, 'auftraege', o.shop, auto ? `Keine Antwort? Dann eben nicht. (−${pen} Respekt)` : `Schade. Dann frag ich woanders. (−${pen} Respekt)`); return { ok: true, o, pen, auto };
}
export function deliver(S, id) {
  const B = S.bunker; const i = B.orders.findIndex((q) => q.id === id); if (i < 0) return { ok: false, why: 'gibts' }; const o = B.orders[i]; if (o.state !== 'aktiv') return { ok: false, why: 'neu' };
  const vorrat = auftragVorrat(B, o.sorte); if (vorrat < o.n) return { ok: false, why: 'lager', fehlt: o.n - vorrat }; B.orders.splice(i, 1); auftragNimm(B, o.sorte, o.n); const cash = o.n * o.preis; S.geld += cash; S.stats.umsatz += cash; S.stats.verkauft += o.n; B.stats.liefer++;
  const resp = gainResp(S, o.resp); if (o.mega) B.mega = true;
  chat(S, 'auftraege', o.shop, o.mega ? 'Die ganze Welt raucht jetzt Ludwigs Kippen. Unglaublich.' : `Lieferung angekommen, ${o.n.toLocaleString('de-DE')} ${auftragWort(o.sorte)}. Danke! (+${euroT(cash)}, +${resp} Respekt)`); return { ok: true, o, cash, resp, mega: o.mega };
}
function miss(S, o) {
  const B = S.bunker; B.orders = B.orders.filter((q) => q !== o); if (o.mega) { B.megaT = MEGA.again; chat(S, 'beschwerden', o.shop, 'Die Welt ist enttäuscht. Nächstes Mal schneller.'); return 0; }
  const pen = loseResp(S, Math.max(3, o.n / 50)); B.pause[o.shop] = ORDER.pause; B.stats.verpasst++; chat(S, 'beschwerden', o.shop, `Wo bleibt meine Lieferung?! Ich bestell erst mal nichts mehr. (−${pen} Respekt)`); return pen;
}

// ---- Takt: Bauen, Produzieren, Klemmen, Aufträge, KippCord. Gibt Ereignisse für Grafik und Chat zurück.
export function tickBunker(S, dt, rnd = Math.random) {
  const B = S.bunker; const ev = []; if (!B || !bunkerOpen(S) || !(dt > 0)) return ev;
  if (B.lock > 0) B.lock = Math.max(0, B.lock - dt); if (B.megaT > 0) B.megaT = Math.max(0, B.megaT - dt);
  syncUnits(S, ev); assignOps(S); const mult = 1 + fxOf(S).autoMult;
  for (const u of B.units) {
    const M = MACHINES[u.id];
    if (u.build > 0) { u.build = Math.max(0, u.build - dt); if (u.build <= 0) { B.stats.gebaut++; ev.push({ k: 'fertig', u }); chat(S, 'kumpels', 'Grün', `${M.name}${u.i ? ' ' + (u.i + 1) : ''} ist fertig aufgebaut!`); } continue; }
    if (M.kind === 'deko' || M.kind === 'robo') continue;
    if (M.kind === 'hand') { if (u.run <= 0 && u.op) u.run = RUN; if (u.run <= 0) continue; u.run = Math.max(0, u.run - dt); }
    else { if (u.jam) { if (B.kumpel) { u.fix += dt; if (u.fix >= JAM.fix) { u.jam = false; u.fix = 0; ev.push({ k: 'repariert', u }); } } continue; } if (rnd() < (JAM.perMin * dt) / 60) { u.jam = true; u.fix = 0; ev.push({ k: 'klemmt', u }); continue; } }
    u.acc += (M.rate * mult * dt) / 60; const n = Math.floor(u.acc); if (n <= 0) continue; u.acc -= n;
    if (M.kind === 'papier') { S.papier += n; u.made = (u.made || 0) + n; continue; } if (M.kind === 'tabak') { S.tabak += n; u.made = (u.made || 0) + n; continue; }
    const k = Math.min(n, S.papier, S.tabak); u.starved = k < n; if (k <= 0) continue; u.made = (u.made || 0) + k; S.papier -= k; S.tabak -= k; B.lager += k; S.stats.gedreht += k; S.stats.auto += k; B.stats.made += k;
  }
  if (!B.started) return ev; // Aufträge und Chat erst, wenn Ludwig einmal unten war
  for (const k of Object.keys(B.pause)) { B.pause[k] -= dt; if (B.pause[k] <= 0) delete B.pause[k]; }
  for (const o of [...B.orders]) { if (o.state === 'neu') { o.decide -= dt; if (o.decide <= 0) ev.push({ k: 'abgelehnt', ...decline(S, o.id, true) }); } else { o.left -= dt; if (o.left <= 0) ev.push({ k: 'verpasst', o, pen: miss(S, o) }); } }
  if (!B.mega && B.megaT <= 0 && lvl(S, 'p_presse') > 0 && !B.orders.some((o) => o.mega)) offerMega(S, ev);
  B.nextOrder -= dt; if (B.nextOrder <= 0) { B.nextOrder = ORDER.gapMin + rnd() * (ORDER.gapMax - ORDER.gapMin); if (B.orders.filter((o) => !o.mega).length < ORDER.maxOpen) newOrder(S, rnd, ev); }
  B.gagT -= dt; if (B.gagT <= 0) { B.gagT = 60 + rnd() * 90; const ch = rnd() < 0.7 ? 'kumpels' : 'beschwerden'; const [who, text] = pick(GAGS[ch], rnd); chat(S, ch, who, text); ev.push({ k: 'gag' }); }
  return ev;
}
