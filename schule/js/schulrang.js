// Theos Seitenscheidel - Schulmodus (Lennox, 2026-11-23): Rekordbuch und Rangliste für die Schul-Spiele.
// Jeder PC führt ein Buch: Name -> beste Werte. Eingetragen wird nur, was man selbst schafft. Trifft man sich in einer Lobby,
// tauschen alle ihre Bücher; so stehen Theo, Ludi und Bruno nach dem ersten gemeinsamen Spiel auch auf deinem PC.
// Gemischt wird immer mit dem größeren Wert: Rekorde und Siege wachsen nur, darum kann Tauschen nichts kaputt machen.
// Hier stehen nur Regeln, nichts zeichnet und nichts speichert.

export const SCHUL_SPIELE = [
  { id: 'stapel', name: 'Stapelturm', einheit: (n) => `${n} ${n === 1 ? 'Etage' : 'Etagen'}` },
  { id: 'dino', name: 'Dino-Lauf', einheit: (n) => `${n} m` },
  { id: 'pong', name: 'Quadrat-Pong', einheit: (n) => `${n} ${n === 1 ? 'Sieg' : 'Siege'}` },
  { id: 'chess', name: 'Dreierschach', einheit: (n) => `${n} ${n === 1 ? 'Sieg' : 'Siege'}` },
  { id: 'ships', name: 'Schiffe versenken', einheit: (n) => `${n} ${n === 1 ? 'Sieg' : 'Siege'}` },
];
const IDS = SCHUL_SPIELE.map((s) => s.id);
export const FREUNDE = [{ key: 'theo', name: 'Theo' }, { key: 'ludi', name: 'Ludi' }, { key: 'bruno', name: 'Bruno' }]; // stehen immer in der Liste, auch ohne Rekord
const MAX_NAMEN = 40;
const MAX_WERT = 1e7;

const ganz = (v) => Math.max(0, Math.min(MAX_WERT, Math.floor(Number(v) || 0)));
const nurBuchstaben = (name) => String(name || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

// Wer wer ist: Spitznamen zählen wie beim Ludwig-Modus (Ludwig, Ludi, Ludsen), Theo auch als Teo
export function nameKey(name) {
  const k = nurBuchstaben(name);
  if (!k) return '';
  if (/^(ludwig|ludsen|ludi)+\d*$/.test(k)) return 'ludi';
  if (/^th?eo\d*$/.test(k)) return 'theo';
  if (/^bruno\d*$/.test(k)) return 'bruno';
  if (/^lennox\d*$/.test(k)) return 'lennox';
  return k.slice(0, 24);
}
export function anzeigeName(key, roh) {
  const f = FREUNDE.find((q) => q.key === key);
  if (f) return f.name;
  if (key === 'lennox') return 'Lennox';
  return String(roh || key).trim().slice(0, 16) || key;
}

// Was im Speicher oder aus dem Netz kommt, kann alt, kaputt oder gemogelt groß sein
export function sauberesBuch(v) {
  const roh = v && typeof v === 'object' && v.n && typeof v.n === 'object' ? v.n : {};
  const n = {};
  for (const [k0, e] of Object.entries(roh).slice(0, MAX_NAMEN * 10)) {
    const key = nameKey(k0);
    if (!key || !e || typeof e !== 'object') continue;
    const z = n[key] || { name: anzeigeName(key, e.name) };
    for (const id of IDS) { const w = ganz(e[id]); if (w > (z[id] || 0)) z[id] = w; }
    n[key] = z;
  }
  return kuerzen({ v: 1, n });
}
// Zu viele Namen: wer am wenigsten geschafft hat, fliegt raus (Freunde nie)
function kuerzen(buch) {
  const keys = Object.keys(buch.n);
  if (keys.length <= MAX_NAMEN) return buch;
  const summe = (k) => IDS.reduce((s, id) => s + (buch.n[k][id] ? 1 : 0), 0);
  const fest = new Set(FREUNDE.map((f) => f.key));
  keys.sort((a, b) => (fest.has(b) - fest.has(a)) || summe(b) - summe(a) || a.localeCompare(b));
  const n = {};
  for (const k of keys.slice(0, MAX_NAMEN)) n[k] = buch.n[k];
  return { v: 1, n };
}

// Rekord eintragen: wert = beste Weite/Höhe, bei Siegen 1 dazu (art 'sieg')
export function trageEin(buch, name, spiel, wert, art = 'rekord') {
  const b = sauberesBuch(buch);
  const key = nameKey(name);
  if (!key || !IDS.includes(spiel)) return { buch: b, neu: false };
  const e = b.n[key] || { name: anzeigeName(key, name) };
  const alt = e[spiel] || 0;
  const neuWert = art === 'sieg' ? ganz(alt + 1) : Math.max(alt, ganz(wert));
  e[spiel] = neuWert;
  if (key !== 'theo' && key !== 'ludi' && key !== 'bruno' && key !== 'lennox') e.name = anzeigeName(key, name); // eigener Name darf sich ändern
  b.n[key] = e;
  return { buch: kuerzen(b), neu: neuWert > alt && art !== 'sieg' };
}
export function mische(a, b) {
  const x = sauberesBuch(a);
  const y = sauberesBuch(b);
  for (const [k, e] of Object.entries(y.n)) {
    const z = x.n[k] || { name: e.name };
    for (const id of IDS) if ((e[id] || 0) > (z[id] || 0)) z[id] = e[id];
    x.n[k] = z;
  }
  return kuerzen(x);
}
export const gleich = (a, b) => JSON.stringify(sauberesBuch(a)) === JSON.stringify(sauberesBuch(b));

// Liste für ein Spiel: alle mit Wert, dazu Theo, Ludi, Bruno und du (ohne Wert unten). Gleichstand = gleicher Platz.
export function rangliste(buch, spiel, ich = '') {
  const b = sauberesBuch(buch);
  const meinKey = nameKey(ich);
  const reihe = Object.entries(b.n).filter(([, e]) => (e[spiel] || 0) > 0).map(([key, e]) => ({ key, name: e.name, wert: e[spiel] }));
  for (const key of [...FREUNDE.map((f) => f.key), meinKey]) if (key && !reihe.some((r) => r.key === key)) reihe.push({ key, name: anzeigeName(key, key === meinKey ? ich : ''), wert: 0 });
  reihe.sort((p, q) => q.wert - p.wert || String(p.name).localeCompare(String(q.name), 'de'));
  let platz = 0;
  reihe.forEach((r, i) => {
    if (!r.wert) { r.platz = null; } else { if (!i || reihe[i - 1].wert !== r.wert) platz = i + 1; r.platz = platz; }
    r.ich = !!meinKey && r.key === meinKey;
  });
  return reihe;
}
// Die drei Freunde auf dem Treppchen im Schrank: wer hat die meisten ersten Plätze über alle Spiele?
export function treppchen(buch) {
  const punkte = Object.fromEntries(FREUNDE.map((f) => [f.key, 0]));
  for (const s of SCHUL_SPIELE) {
    const r = rangliste(buch, s.id).filter((q) => punkte[q.key] !== undefined && q.wert > 0);
    r.forEach((q, i) => { punkte[q.key] += [3, 2, 1][i] || 0; });
  }
  return FREUNDE.map((f) => ({ ...f, punkte: punkte[f.key] })).sort((p, q) => q.punkte - p.punkte || FREUNDE.indexOf(FREUNDE.find((f) => f.key === p.key)) - FREUNDE.indexOf(FREUNDE.find((f) => f.key === q.key)));
}
