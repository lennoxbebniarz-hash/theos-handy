// Theos Seitenscheidel - Ludwig Zigaretti: Ereignisse, nur die Regeln (Stimmen-Update 2026-11-22, Wunsch Lennox „neue Ereignisse“).
// Alle ein bis zwei Minuten passiert etwas: draußen auf der Straße, im Haus oder vor der Tür (Gespräch mit drei Antworten). Entscheidet nur der Gastgeber.
import { addMatCapped } from './ludwiglogic.js';
import { gainResp } from './ludwigskills.js';
import { clock } from './ludwigwelt.js';

export const TAKT = { erst: 100, min: 75, max: 140, rauch: 18, warnung: 14, stumm: 25 };
const inKontrolle = (S) => !(S.eltern.next < 1e8);
const spaeter = (S, s) => { if (!inKontrolle(S)) S.eltern.next += s; };
const frueher = (S, s) => { if (!inKontrolle(S)) S.eltern.next = Math.min(S.eltern.next, s); };

// wo: 'haus' (hört man nur im Zimmer), 'strasse' (Zimmer und draußen). zeit: m t a n. sag: eine Gruppe wird gewählt und nacheinander gespielt.
export const EREIGNISSE = [
  { id: 'party', wo: 'strasse', zeit: 'an', sag: [['ev_party1'], ['ev_party2'], ['ev_party3']], text: 'Party nebenan: Eine Minute lang kommen viel mehr Kunden.', tu: (S) => { S.erg.andrang = 60; S.kundeT = Math.min(S.kundeT, 2); } },
  { id: 'schule', wo: 'strasse', zeit: 't', sag: [['ev_schule1'], ['ev_schule2', 'ev_schule3']], text: 'Schulschluss: Eine Minute lang kommen viel mehr Kunden.', tu: (S) => { S.erg.andrang = 60; S.kundeT = Math.min(S.kundeT, 2); } },
  { id: 'angebot', wo: 'strasse', zeit: 'mtan', sag: [['ev_angebot1'], ['ev_angebot2']], text: 'Sonderangebot: Zwei Minuten lang kostet bei Kalle alles die Hälfte.', tu: (S) => { S.erg.angebot = 120; } },
  { id: 'razzia', wo: 'strasse', zeit: 'mtan', sag: [['ev_razzia1'], ['ev_razzia2']], text: 'Razzia: Zwei Minuten lang fährt die Polizei doppelt so oft.', tu: (S) => { S.erg.razzia = 120; S.welt.polT = Math.min(S.welt.polT, 25); } },
  { id: 'paket', wo: 'strasse', zeit: 'mt', sag: [['ev_paket1'], ['ev_paket2']], text: 'Ein Paket für Ludwig: Blättchen und Tabak, so viel in die Kiste passt.', tu: (S) => { addMatCapped(S, 'papier', 5); addMatCapped(S, 'tabak', 5); } },
  { id: 'pizza', wo: 'strasse', zeit: 'an', sag: [['ev_pizza1'], ['ev_pizza2']], text: 'Gratis-Pizza: Anderthalb Minuten lang rennst du schneller.', tu: (S) => { S.buff.energy = Math.max(S.buff.energy || 0, 90); } },
  { id: 'oma', wo: 'haus', zeit: 'mta', sag: [['ev_oma1'], ['ev_oma2']], text: 'Oma steckt dir 3 € zu.', tu: (S) => { S.geld += 300; } },
  { id: 'opa', wo: 'haus', zeit: 'mta', sag: [['ev_opa1'], ['ev_opa2']], text: 'Opa schmuggelt Tabak in die Kiste, so viel reinpasst.', tu: (S) => { addMatCapped(S, 'tabak', 8); } },
  { id: 'tor', wo: 'haus', zeit: 'ta', daheim: true, sag: [['ev_tor1'], ['ev_tor2'], ['ev_tor3']], text: 'Unten läuft Fußball: Die nächste Kontrolle kommt eine Minute später.', tu: (S) => spaeter(S, 60) },
  { id: 'tante', wo: 'haus', zeit: 'mta', daheim: true, sag: [['ev_tante1'], ['ev_tante2']], text: 'Tante Gerda redet und redet: Die nächste Kontrolle kommt später.', tu: (S) => spaeter(S, 50) },
  { id: 'strom', wo: 'strasse', zeit: 'an', dunkel: 12, sag: [['ev_strom1'], ['ev_strom2'], ['ev_strom3']], text: 'Stromausfall: Die Eltern suchen den Sicherungskasten.', tu: (S) => spaeter(S, 45) },
  { id: 'musik', wo: 'strasse', zeit: 'ta', sag: [['ev_musik1'], ['ev_musik2'], ['ev_musik1', 'ev_musik3']], text: 'Fred singt über dich. Das gibt Respekt.', tu: (S) => gainResp(S, 1) },
  { id: 'hund', wo: 'strasse', zeit: 'mtan', sag: [['ev_hund1', 'ev_hund2']], text: 'Bello bellt vor dem Fenster: Kurz traut sich kein Kunde her.', tu: (S) => { S.kundeT += 15; } },
  { id: 'tauben', wo: 'strasse', zeit: 'mta', sag: [['ev_tauben1'], ['ev_tauben1', 'ev_tauben2']], text: 'Taubenangriff: Herr Krause putzt und passt zwei Minuten nicht auf.', nachbarWeg: true, tu: (S) => { S.welt.nbOut = false; S.welt.nbT = 120; } },
  { id: 'geruecht', wo: 'strasse', zeit: 'mta', sag: [['ev_geruecht1'], ['ev_geruecht2']], text: 'Die Straße redet über dich. Das gibt Respekt.', tu: (S) => gainResp(S, 2) },
  { id: 'nachtruhe', wo: 'strasse', zeit: 'n', sag: [['ev_nacht1'], ['ev_nacht2']], text: 'Alles schläft: Die nächste Kontrolle kommt später.', tu: (S) => spaeter(S, 30) },
  { id: 'extrablatt', wo: 'strasse', zeit: 'm', sag: [['ev_morgen1'], ['ev_morgen2']], text: 'Du stehst fast in der Zeitung. Das gibt Respekt.', tu: (S) => gainResp(S, 1) },
  { id: 'baustelle', wo: 'strasse', zeit: 't', sag: [['ev_bau1'], ['ev_bau2']], text: 'Baulärm: Die Eltern hören nichts aus deinem Zimmer.', tu: (S) => spaeter(S, 30) },
  { id: 'tisch', wo: 'haus', zeit: 'mtan', kumpels: true, sag: Array.from({ length: 12 }, (_, i) => ['gr_tisch' + (i + 1)]), text: '' },
];

// Gespräche durch die Tür: + gut (Kontrolle später), - schlecht (Kontrolle gleich), 0 egal, € zwei Euro. wirkung gehört zu den Antworten in dieser Reihenfolge.
const TUER = (id, wer, wirkung, extra = {}) => ({ id, wer, wirkung, antworten: ['a', 'b', 'c'].map((k) => [id + k]), reaktion: ['x', 'y', 'z'].map((k) => id + k), ...extra });
const VERWANDT = (n, wer) => {
  const id = 'v' + String(n).padStart(2, '0');
  return { id, wer, wirkung: '+-€', antworten: [['a_ja1', 'a_ja2', 'a_ja3'], ['a_nein1', 'a_nein2', 'a_nein3'], ['a_deal1', 'a_deal2', 'a_deal3']], reaktion: ['x', 'y', 'z'].map((k) => id + k) };
};
export const TUERGESPRAECHE = [
  TUER('t01', 'mama', '+-0'), TUER('t02', 'papa', '0-+'), TUER('t03', 'mama', '0+-'), TUER('t04', 'papa', '+-0'), TUER('t05', 'mama', '+-+'),
  TUER('t06', 'papa', '+0-'), TUER('t07', 'mama', '+0-'), TUER('t08', 'papa', '+-0'),
  TUER('t09', 'mama', '+-0', { reaktion: ['t09x', 't01y', 't09z'] }), // „Wie bitte? Ich komm jetzt rein!“ passt auch zum Müll
  ...Array.from({ length: 16 }, (_, i) => VERWANDT(i + 1, ['oma', 'opa', 'onkel', 'tante'][Math.floor(i / 4)])),
];
export const tuer = (id) => TUERGESPRAECHE.find((t) => t.id === id) || null;

const waehle = (list, rnd) => list[Math.min(list.length - 1, Math.floor(rnd() * list.length))];
const Z = { morgen: 'm', tag: 't', abend: 'a', nacht: 'n' };
export function moegliche(S, ort, mehrspieler = false) {
  const z = Z[clock(S).phase];
  return EREIGNISSE.filter((e) => e.zeit.includes(z) && (e.wo === 'strasse' || ort === 'zimmer') && (!e.daheim || !(S.welt.weg > 0)) && (!e.kumpels || (S.kumpels && !mehrspieler)));
}
export function moeglicheTuer(S, ort) {
  if (ort !== 'zimmer' || !S.kumpels || inKontrolle(S) || S.eltern.next < 35 || S.eltern.n < 1) return [];
  const nacht = clock(S).phase === 'nacht';
  return TUERGESPRAECHE.filter((t) => {
    if (t.wer === 'mama' || t.wer === 'papa') return !(S.welt.weg > 0 && S.welt.wer === t.wer);
    return !nacht; // die Verwandten kommen nicht nachts
  });
}
export function ausloesen(S, id, rnd = Math.random) {
  const e = EREIGNISSE.find((q) => q.id === id); if (!e) return null;
  if (e.tu) e.tu(S);
  return { k: 'ereignis', id, sag: waehle(e.sag, rnd), text: e.text, wo: e.wo, dunkel: e.dunkel || 0, nachbarWeg: !!e.nachbarWeg };
}
// Takt. lage: { ort: 'zimmer' | 'draussen' | 'bunker', frei (darf gerade reden), mp }
export function tickEreignis(S, dt, lage, rnd = Math.random) {
  const E = S.erg; if (!E || !(dt > 0)) return null;
  for (const k of ['andrang', 'angebot', 'razzia']) if (E[k] > 0) E[k] = Math.max(0, E[k] - dt);
  // Qualm im Zimmer: nach 18 Sekunden riechen es die Eltern und kommen. Zeit genug fürs Handtuch.
  if ((S.rauch || 0) <= 0.4) { E.rauchT = 0; E.gerochen = false; } else if (S.kumpels && !E.gerochen && !inKontrolle(S) && !(S.welt.weg > 0)) {
    E.rauchT += dt;
    if (E.rauchT >= TAKT.rauch) { E.gerochen = true; frueher(S, TAKT.warnung); return { k: 'geruch', sag: [rnd() < 0.5 ? 'm_flur1' : 'p_flur1'], text: 'Der Rauch zieht in den Flur. Schnell ausschütteln, gleich kommt jemand!' }; }
  }
  if (!S.introSeen) return null;
  E.next -= dt; if (E.next > 0) return null;
  if (!lage.frei || lage.ort === 'bunker') { E.next = 8; return null; }
  E.next = TAKT.min + rnd() * (TAKT.max - TAKT.min);
  const t = moeglicheTuer(S, lage.ort).filter((q) => q.id !== E.tuer);
  if (t.length && rnd() < 0.4) { const g = waehle(t, rnd); E.tuer = g.id; return { k: 'tuer', id: g.id }; }
  const list = moegliche(S, lage.ort, lage.mp).filter((q) => q.id !== E.letzt); if (!list.length) return null;
  const e = waehle(list, rnd); E.letzt = e.id;
  return ausloesen(S, e.id, rnd);
}
// Antwort an der Tür (i = 0, 1, 2; -1 = keine Antwort)
export function tuerWahl(S, id, i) {
  const g = tuer(id); if (!g) return null;
  if (i < 0 || i > 2) { frueher(S, TAKT.stumm); return { zeichen: '-', text: 'Keine Antwort. Das macht misstrauisch: Gleich kommt eine Kontrolle.' }; }
  const zeichen = g.wirkung[i];
  if (zeichen === '+') { spaeter(S, 75); return { zeichen, text: 'Gut geantwortet: Die nächste Kontrolle kommt später.' }; }
  if (zeichen === '-') { frueher(S, TAKT.warnung); return { zeichen, text: 'Das ging schief: Gleich kommt eine Kontrolle!' }; }
  if (zeichen === '€') { S.geld += 200; return { zeichen, text: '2 € bekommen.' }; }
  return { zeichen, text: '' };
}
