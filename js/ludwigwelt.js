// Theos Seitenscheidel - Ludwig Zigaretti: die Außenwelt, Teil 2 (nur Regeln, läuft auch in node --test).
// Tag und Nacht (ein Tag dauert 20 Minuten), Polizeistreife (nachts oft), die Eltern fahren tagsüber einkaufen (dann keine Kontrollen,
// bei der Rückkehr können sie Ludwig vom Auto aus sehen), Kunden im Park (zahlen mehr, aber da fährt auch die Polizei vorbei).
import { gainResp } from './ludwigskills.js';

export const DAY = 1200; export const HOUR = DAY / 24; // 50 Sekunden pro Stunde
export const START_HOUR = 20; // ein neues Spiel beginnt am Abend in der Dämmerung (der Vorspann spielt nachts, um 18 Uhr wäre es noch taghell)
export const POLIZEI = { nacht: [55, 95], abend: [90, 150], tag: [150, 240], morgen: [180, 280] }; // Abstand zwischen zwei Streifen (s)
export const EINKAUF = { gap: [150, 300], dur: [150, 230] }; // wie oft und wie lange die Eltern einkaufen sind (nur tagsüber)
export const PARK = { max: 2, wait: 180, preis: 150, // 1,50 € pro Kippe (am Fenster etwa 1 €)
  gap: { abend: 50, nacht: 90, tag: 80, morgen: 110 } };
export const NACHBAR = { draussen: 50, drinnen: 70 }; // Herr Krause steht abwechselnd vor der Tür und ist drinnen (nachts immer drinnen)

export function newWelt() { return { t: START_HOUR * HOUR, polT: 90, einT: 120, weg: 0, wer: 'mama', park: [], parkT: 45, nextP: 1, nbT: 30, nbOut: false }; }
const num = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
export function fixWelt(raw) {
  const W = newWelt(); if (!raw || typeof raw !== 'object') return W;
  W.t = num(raw.t, 0, DAY, W.t); W.polT = num(raw.polT, 1, 600, W.polT); W.einT = num(raw.einT, 1, 900, W.einT); W.weg = num(raw.weg, 0, 900, 0); W.wer = raw.wer === 'papa' ? 'papa' : 'mama';
  W.parkT = num(raw.parkT, 1, 600, W.parkT); W.nextP = Math.round(num(raw.nextP, 1, 1e9, 1)); W.nbT = num(raw.nbT, 0, 600, W.nbT); W.nbOut = !!raw.nbOut;
  if (Array.isArray(raw.park)) for (const p of raw.park.slice(0, PARK.max)) { if (!p || typeof p !== 'object') continue; W.park.push({ id: Math.round(num(p.id, 1, 1e9, W.nextP++)), bank: p.bank === 1 ? 1 : 0, want: Math.round(num(p.want, 1, 20, 4)), preis: Math.round(num(p.preis, 5, 9999, 150)), wait: num(p.wait, 1, PARK.wait, PARK.wait), look: Math.round(num(p.look, 0, 9, 0)) }); }
  return W;
}
// Uhrzeit und Licht: light 1 = voller Tag, 0 = Nacht (Dämmerung morgens 5 bis 7 Uhr, abends 18 bis 21 Uhr)
export function dayLight(h) { if (h >= 7 && h < 18) return 1; if (h >= 5 && h < 7) return (h - 5) / 2; if (h >= 18 && h < 21) return 1 - (h - 18) / 3; return 0; }
export function clock(S) {
  const t = (((S.welt ? S.welt.t : 0) % DAY) + DAY) % DAY; const h = t / HOUR;
  const phase = h >= 6 && h < 10 ? 'morgen' : h >= 10 && h < 17 ? 'tag' : h >= 17 && h < 21 ? 'abend' : 'nacht';
  return { h, hh: Math.floor(h), mm: Math.floor((h % 1) * 60), phase, light: dayLight(h), text: `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}` };
}
export const setHour = (S, h) => { S.welt.t = (((h % 24) + 24) % 24) * HOUR; };
// Elternkontrollen: nachts schlafen die Eltern meist (Kontrollen kommen seltener), beim Einkaufen gibt es gar keine.
// Die allererste Kontrolle (gehört zum Lernen) kommt immer pünktlich.
export const elternFaktor = (S) => (S.welt && S.welt.weg > 0 ? 0 : clock(S).phase === 'nacht' && S.eltern && S.eltern.n > 0 ? 0.4 : 1);
const span = (r, [a, b]) => a + r * (b - a);

// Takt: Uhr, Streife, Einkauf, Nachbar, Parkkunden. Gibt Ereignisse für Grafik und Spiel zurück.
export function tickWelt(S, dt, rnd = Math.random) {
  const W = S.welt; const ev = []; if (!W || !(dt > 0)) return ev; W.t = (W.t + dt) % DAY; const c = clock(S);
  W.polT -= dt * (S.erg && S.erg.razzia > 0 ? 2 : 1); if (W.polT <= 0) { W.polT = span(rnd(), POLIZEI[c.phase]); ev.push({ k: 'polizei', dir: rnd() < 0.5 ? 1 : -1 }); }
  if (W.weg > 0) { W.weg -= dt; if (W.weg <= 0) { W.weg = 0; ev.push({ k: 'zurueck', who: W.wer }); } }
  else { W.einT -= dt; if (W.einT <= 0) { W.einT = span(rnd(), EINKAUF.gap); if (c.phase === 'tag' && S.kumpels) { W.weg = span(rnd(), EINKAUF.dur); W.wer = rnd() < 0.6 ? 'mama' : 'papa'; ev.push({ k: 'einkauf', who: W.wer, dur: W.weg }); } } }
  W.nbT -= dt; if (W.nbT <= 0) { W.nbOut = c.phase !== 'nacht' && !W.nbOut; W.nbT = W.nbOut ? NACHBAR.draussen : NACHBAR.drinnen; ev.push({ k: 'nachbar', out: W.nbOut }); }
  for (const p of W.park) p.wait -= dt; const gone = W.park.filter((p) => p.wait <= 0); if (gone.length) { W.park = W.park.filter((p) => p.wait > 0); for (const p of gone) ev.push({ k: 'parkWeg', p }); }
  W.parkT -= dt; if (W.parkT <= 0) { W.parkT = PARK.gap[c.phase] + rnd() * 60; if (W.park.length < PARK.max) { const bank = W.park.some((q) => q.bank === 0) ? 1 : 0; const p = { id: W.nextP++, bank, want: 3 + Math.floor(rnd() * 6), preis: PARK.preis, wait: PARK.wait, look: Math.floor(rnd() * 6) }; W.park.push(p); ev.push({ k: 'parkKunde', p }); } }
  return ev;
}
// Im Park verkaufen: so viele Kippen aus den Taschen, wie der Kunde will (oder wie man hat), zum Parkpreis
export function parkSell(S, id) {
  const p = S.welt.park.find((q) => q.id === id); if (!p) return { ok: false, why: 'weg' }; if (S.hand <= 0) return { ok: false, why: 'leer' };
  const n = Math.min(p.want, S.hand); const cash = n * p.preis; S.hand -= n; S.geld += cash; S.stats.verkauft += n; S.stats.umsatz += cash; S.stats.kunden++; S.welt.park = S.welt.park.filter((q) => q !== p);
  const resp = gainResp(S, 1 + n / 5); return { ok: true, n, cash, resp, p };
}
// Polizeikontrolle: Kippen aus den Taschen und der Rucksack sind weg, wer etwas dabei hatte, zahlt (5 %, mindestens 5 €), Hausarrest
export function polizeiKontrolle(S) {
  const sh = S.sorten ? Object.values(S.sorten).reduce((a, q) => a + q.hand, 0) : 0; const joints = S.sorten && S.sorten.joint ? S.sorten.joint.hand : 0; // Joints dabei: dreifache Strafe (seit 2026-11-20)
  const t = { hand: S.hand + sh, sack: S.sack ? S.sack.n : 0, fine: 0 }; if (joints > 0) t.joints = joints; if (t.hand > 0 || t.sack > 0) { t.fine = Math.min(S.geld, Math.max(500, Math.round((S.geld * 0.05) / 100) * 100) * (joints > 0 ? 3 : 1)); S.geld -= t.fine; }
  S.hand = 0; if (S.sorten) for (const q of Object.values(S.sorten)) q.hand = 0; S.sack = { tabak: 0, papier: 0, n: 0 }; S.eltern.arrest = Math.max(S.eltern.arrest, 60); S.eltern.erwischt++; S.stats.verpasst += S.queue.length; S.queue = []; return t;
}
