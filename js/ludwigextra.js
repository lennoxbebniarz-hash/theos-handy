// Theos Seitenscheidel - Ludwig Zigaretti: Abstimmung Paket 4 (2026-11-22), nur die Regeln.
// Puppe, Kumpel-Chat, Wasserpfeife bei Rudi, Fahrrad und E-Roller, eigene Marke, Zimmer ausbauen.
// Gemeinsam für alle: S.rad, S.deko, S.marke, S.chat (den Chat schreibt nur der Gastgeber, siehe HOST_PATHS in ludwigmp.js).
import { costMul } from './ludwigmp.js';

// ---- Doppelgänger-Puppe: den Trick gibt es im Boss-Plan (c_double), mit ihm sitzt sie am Schreibtisch
export const puppeDa = (S) => !!S && !!S.skills && (S.skills.c_double || 0) > 0;

// ---- Fahrrad und E-Roller: feste Preise (von Lennox bestätigt), nur draußen. Einmal gekauft, hat jeder im Zimmer eins.
export const RAEDER = {
  rad: { name: 'Fahrrad', preis: 30000, tempo: 6.2, ico: '🚲', text: 'Schneller zum Kiosk. Nur draußen, mit B auf- und absteigen.' },
  roller: { name: 'E-Roller', preis: 90000, tempo: 8.2, ico: '🛴', text: 'Noch schneller, ganz ohne Treten. Nur draußen, mit B.' },
};
export const RAD_IDS = Object.keys(RAEDER);
export const hatRad = (S, id) => !!S && !!S.rad && Object.prototype.hasOwnProperty.call(RAEDER, id) && !!S.rad[id];
export function kaufeRad(S, id) {
  if (!RAD_IDS.includes(id)) return { ok: false, why: 'gibts' };
  if (hatRad(S, id)) return { ok: false, why: 'max' };
  const R = RAEDER[id];
  if (S.geld < R.preis) return { ok: false, why: 'geld', fehlt: R.preis - S.geld };
  S.geld -= R.preis; S.rad[id] = true;
  return { ok: true, tier: R };
}
// B schaltet durch: zu Fuß, Fahrrad, E-Roller, wieder zu Fuß (nur was gekauft ist)
export function naechstesRad(S, jetzt) {
  const liste = [null, ...RAD_IDS.filter((id) => hatRad(S, id))];
  return liste[(Math.max(0, liste.indexOf(jetzt || null)) + 1) % liste.length];
}

// ---- Zimmer ausbauen: acht Sachen, jede tarnt ein bisschen (Mama sucht seltener). Im Mehrspieler teurer wie der übrige Shop.
export const TARN_JE = 0.05;
export const ZIMMER = {
  duftbaum: { name: 'Duftbaum', preis: 2500, ico: '🌲', text: 'Hängt am Fenster. Wald statt Qualm.' },
  oma: { name: 'Bild von Oma', preis: 3500, ico: '🖼️', text: 'Wer Oma so aufhängt, macht nichts Verbotenes.' },
  mathe: { name: 'Mathebücher', preis: 4500, ico: '📚', text: 'Liegen gut sichtbar auf dem Tisch.' },
  pflanze: { name: 'Große Pflanze', preis: 6000, ico: '🪴', text: 'Steht genau richtig im Blick.' },
  vorhang: { name: 'Dicker Vorhang', preis: 9000, ico: '🪟', text: 'Von draußen sieht keiner was.' },
  urkunde: { name: 'Urkunde', preis: 12000, ico: '📜', text: '„Bester Schüler“. Selbst ausgedruckt.' },
  filter: { name: 'Luftreiniger', preis: 18000, ico: '💨', text: 'Brummt leise und riecht nach nichts.' },
  hund: { name: 'Hund vor der Tür', preis: 30000, ico: '🐕', text: 'Liegt vor der Tür. Da kommt keiner leise rein.' },
};
export const ZIMMER_IDS = Object.keys(ZIMMER);
export const zimmerPreis = (S, id) => Math.round(ZIMMER[id].preis * costMul(S));
export const zimmerZahl = (S) => (S && S.deko ? ZIMMER_IDS.filter((id) => S.deko[id]).length : 0);
export const tarnung = (S) => zimmerZahl(S) * TARN_JE;
export function kaufeZimmer(S, id) {
  if (!ZIMMER_IDS.includes(id)) return { ok: false, why: 'gibts' };
  if (S.deko[id]) return { ok: false, why: 'max' };
  const preis = zimmerPreis(S, id);
  if (S.geld < preis) return { ok: false, why: 'geld', fehlt: preis - S.geld };
  S.geld -= preis; S.deko[id] = true;
  return { ok: true, tier: ZIMMER[id] };
}

// ---- Eigene Marke: Name, acht Farben, zwölf Zeichen
export const MARKE_MAX = 16;
export const FARBEN = [
  { name: 'Rot', bg: '#c5161d', fg: '#fff6e6' }, { name: 'Orange', bg: '#f07a1a', fg: '#1c1208' },
  { name: 'Gelb', bg: '#f2c81c', fg: '#1c1c20' }, { name: 'Grün', bg: '#1f8a46', fg: '#f4fff0' },
  { name: 'Blau', bg: '#1f58b8', fg: '#eef6ff' }, { name: 'Lila', bg: '#6a2cb8', fg: '#fbefff' },
  { name: 'Pink', bg: '#e8408f', fg: '#2a0716' }, { name: 'Schwarz', bg: '#17181c', fg: '#f0bd52' },
];
export const ZEICHEN = ['★', '♛', '⚡', '◆', '♠', '♣', '☀', '☾', '▲', '✦', '♪', '♞'];
export const neueMarke = () => ({ name: 'LZ', farbe: 0, zeichen: 0 });
export function saubereMarke(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const name = Array.from(String(typeof r.name === 'string' ? r.name : '').replace(/[\p{Cc}\p{Cf}]/gu, '').replace(/\s+/g, ' ').trim()).slice(0, MARKE_MAX).join('').trim();
  const wahl = (v, n) => (Number.isInteger(v) && v >= 0 && v < n ? v : 0);
  return { name: name || 'LZ', farbe: wahl(r.farbe, FARBEN.length), zeichen: wahl(r.zeichen, ZEICHEN.length) };
}

// ---- Kumpel-Chat: Warnungen und Quatsch. Wer schreibt, ist einer der Plätze ohne echten Spieler, sonst Bruno.
export const CHAT_MAX = 24;
export const VORWARNUNG = 20; // so viele Sekunden vor einer Kontrolle kommt die Warnung
export const VON = { rot: 'Rot', gelb: 'Gelb', gruen: 'Grün', bruno: 'Bruno' };
export const WARNUNG = {
  eltern: ['Im Flur knarzt was. Versteck schon mal alles.', 'Ich hab Hausschuhe gehört. Ernsthaft.', 'Achtung, bei euch geht gleich die Tür auf.', 'Räum weg. Jetzt. Frag nicht.'],
  polizei: ['Blaulicht! Die Streife fährt in eure Straße.', 'Streife unterwegs. Taschen leer machen!'],
  nachbar: ['Krause steht wieder draußen und guckt.', 'Achtung, Krause ist vor der Tür. Der petzt.'],
  einkauf: ['Euer Auto ist weg. Freie Bahn!', 'Deine Eltern fahren gerade einkaufen.'],
  zurueck: ['Das Auto kommt zurück. Rein mit dir!', 'Eure Eltern parken gerade. Lauf!'],
  razzia: ['POLIZEI IN DER TIEFGARAGE! Alles verstecken, schnell!', 'Razzia! Plane drüber, Tor runter, Maschinen aus!'],
};
export const QUATSCH = [
  'Hab meinen Schlüssel gesucht. War in meiner Hand.', 'Günther hat mir die Stulle geklaut.', 'Zählt Pizza als Gemüse? Frage für Mathe.',
  'Wer hat meinen linken Schuh?', 'Meine Oma schreibt jetzt schneller als ich.', 'Ich hab drei Prozent Akku und keine Angst.',
  'Ede hat mich „junger Mann“ genannt. Ich bin jetzt erwachsen.', 'Die Katze auf der Eistruhe hat mich ignoriert.', 'Bin im Bus eingeschlafen. Bin jetzt im Depot.',
  'Morgen schreiben wir Bio. Was ist Bio?', 'Rudi erzählt wieder von 1987.', 'Hab den Gartenzwerg gegrüßt. Aus Versehen.',
  'Wenn ich reich bin, kauf ich mir einen zweiten Toaster.', 'Mein WLAN heißt jetzt „Nicht Ludwigs Bude“.', 'Kalle hat gelacht. Es war unheimlich.',
  'Ich lern jetzt. Ab nächster Woche.', 'Erwin wollte meinen Föhn reparieren. Der kann jetzt Radio.', 'Hast du Hausaufgaben? Ich auch nicht.',
];
export const neuerChat = () => ({ list: [], id: 0, next: 50, warn: false });
const einer = (a, rnd) => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
// frei: welche Kumpels gerade keine echten Spieler sind
export function chatSchreib(S, art, frei = ['rot', 'gelb', 'gruen'], rnd = Math.random) {
  const K = S.chat; const warn = art !== 'quatsch';
  const texte = warn ? WARNUNG[art] : QUATSCH;
  if (!texte) return null;
  const zuletzt = K.list.length ? K.list[K.list.length - 1].text : '';
  const text = einer(texte.filter((t) => t !== zuletzt), rnd);
  const von = frei.length ? einer(frei, rnd) : 'bruno';
  const m = { id: ++K.id, von, text, warn };
  K.list = [...K.list, m].slice(-CHAT_MAX);
  return m;
}
// dt in ganzen Sekunden. faktor: so schnell läuft die Uhr der Eltern gerade.
export function chatTick(S, dt, { frei, faktor = 1, rnd = Math.random } = {}) {
  if (!S.kumpels || !(dt > 0)) return null;
  const K = S.chat; const rest = S.eltern.next / Math.max(faktor, 1e-6);
  if (rest > VORWARNUNG + 5) K.warn = false;
  else if (!K.warn && rest <= VORWARNUNG && faktor > 0 && S.eltern.n > 0) { K.warn = true; return chatSchreib(S, 'eltern', frei, rnd); } // die erste Kontrolle erklärt sich selbst
  K.next -= dt;
  if (K.next > 0) return null;
  K.next = 80 + rnd() * 80;
  return chatSchreib(S, 'quatsch', frei, rnd);
}

// ---- Wasserpfeife bei Rudi: nur die Farben zurück, dazu Husten. Keine Ware, nichts zu kaufen, nichts zu verkaufen.
export function pfeife(S) {
  const brauchte = S.sucht.t >= 300;
  S.sucht.t = 0;
  return { brauchte };
}

// ---- Spielstand
export const neuesPaket = () => ({ rad: {}, deko: {}, marke: neueMarke(), chat: neuerChat() });
export function fixPaket(S, raw) {
  const r = raw.rad || {}; for (const id of RAD_IDS) if (r[id] === true) S.rad[id] = true;
  const d = raw.deko || {}; for (const id of ZIMMER_IDS) if (d[id] === true) S.deko[id] = true;
  S.marke = saubereMarke(raw.marke);
  const c = raw.chat && typeof raw.chat === 'object' ? raw.chat : {};
  const list = (Array.isArray(c.list) ? c.list : [])
    .filter((m) => m && Number.isInteger(m.id) && m.id > 0 && typeof m.text === 'string' && Object.prototype.hasOwnProperty.call(VON, m.von))
    .slice(-CHAT_MAX)
    .map((m) => ({ id: m.id, von: m.von, text: m.text.slice(0, 140), warn: !!m.warn }));
  const zahl = Number(c.next);
  S.chat = {
    list,
    id: Math.max(0, Number.isInteger(c.id) ? c.id : 0, ...list.map((m) => m.id)),
    next: Number.isFinite(zahl) ? Math.max(5, Math.min(300, zahl)) : 50,
    warn: !!c.warn,
  };
}
