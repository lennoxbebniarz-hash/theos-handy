// Theos Seitenscheidel - Ludwig Zigaretti: Abstimmung Paket 5 (2026-11-23), nur die Regeln. Bild in ludwigbunker3art.js.
// Bunker Teil 3: Regale je Sorte, je eine Maschine für Stopf, Aroma, Zigarillo und Liquid (Joints bleiben Handarbeit), Aufträge auch für die neuen Sorten.
// Große Razzia: erst ab Bunker, selten, zwei Minuten zum Verstecken, sonst ist ein Drittel vom Lager weg.
// Alles liegt in S.bunker (regal, sm, razzia). Uhren tickt nur der Gastgeber (HOST_PATHS in ludwigmp.js).
import { costMul } from './ludwigmp.js';
import { gainResp, lvl } from './ludwigskills.js';
const KNOTEN = { stopf: 's_stopf', aroma: 's_aroma', zigarillo: 's_zigarillo', joint: 's_joint', vape: 's_vape' };
const frei = (S, k) => lvl(S, KNOTEN[k]) > 0;

export const REGAL_SORTEN = ['stopf', 'aroma', 'zigarillo', 'joint', 'vmango', 'vmenthol', 'vkirsche'];
export const REGALE = [
  { id: 'stopf', name: 'Stopfkippen', sorten: ['stopf'] }, { id: 'aroma', name: 'Aromakippen', sorten: ['aroma'] },
  { id: 'zigarillo', name: 'Zigarillos', sorten: ['zigarillo'] }, { id: 'joint', name: 'Joints', sorten: ['joint'] },
  { id: 'vape', name: 'Vapes', sorten: ['vmango', 'vmenthol', 'vkirsche'] },
];
export const neuesRegal = () => Object.fromEntries(REGAL_SORTEN.map((k) => [k, 0]));
export const regalVon = (B, R) => R.sorten.reduce((a, k) => a + (B.regal[k] || 0), 0);
export const regalSumme = (B) => REGAL_SORTEN.reduce((a, k) => a + (B.regal[k] || 0), 0);

// ---- vier Maschinen, je eine. Frei, sobald die Sorte im Boss-Plan frei ist (Liquid: mit der Werkbank). Kaufen im Shop am PC.
export const SORTMASCHINEN = {
  stopf: { name: 'Stopfautomat', sorte: 'stopf', preis: 120000, rate: 8, use: { huelsen: 1, tabak: 1 }, build: 30 },
  aroma: { name: 'Aromastation', sorte: 'aroma', preis: 180000, rate: 6, use: { papier: 1, tabak: 1, kapseln: 1 }, build: 35 },
  zigarillo: { name: 'Zigarillo-Wickler', sorte: 'zigarillo', preis: 300000, rate: 3, use: { deckblatt: 1, tabak: 2 }, build: 45 },
  liquid: { name: 'Liquid-Labor', sorte: null, preis: 220000, rate: 4, use: {}, build: 40 },
};
export const SM_IDS = Object.keys(SORTMASCHINEN);
export const LIQUID_MAX = 20; // so viel Liquid-Base stellt das Labor höchstens in die Teilekiste
export const neueSm = () => Object.fromEntries(SM_IDS.map((k) => [k, { have: false, build: 0, acc: 0, made: 0, starved: false }]));

// ---- Razzia
export const RAZZIA = { erste: 1500, min: 1800, max: 3000, dauer: 120, anteil: 1 / 3, lohn: 5 };
export const VERSTECKE = { lager: 'Plane über die Paletten', regale: 'Vorhang vor die Regale', maschinen: 'Maschinen ausschalten', tor: 'Rolltor runter' };
export const VERSTECK_IDS = Object.keys(VERSTECKE);
export const neueRazzia = () => ({ next: RAZZIA.erste, left: 0, hidden: {}, n: 0, geschafft: 0 });

// ---- Spielstand
const zahl = (v, a, b, d) => { const n = Number(v); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d; };
export function fixTeil3(B, raw) {
  const r = (raw && raw.regal) || {}; B.regal = neuesRegal(); for (const k of REGAL_SORTEN) B.regal[k] = Math.round(zahl(r[k], 0, 1e9, 0));
  const s = (raw && raw.sm) || {}; B.sm = neueSm();
  for (const k of SM_IDS) { const q = s[k] || {}; B.sm[k] = { have: q.have === true, build: zahl(q.build, 0, 600, 0), acc: zahl(q.acc, 0, 1, 0), made: Math.round(zahl(q.made, 0, 1e12, 0)), starved: false }; }
  const z = (raw && raw.razzia) || {}; B.razzia = neueRazzia();
  B.razzia.next = zahl(z.next, 0, 7200, RAZZIA.erste); B.razzia.left = zahl(z.left, 0, RAZZIA.dauer, 0); B.razzia.n = Math.round(zahl(z.n, 0, 1e6, 0)); B.razzia.geschafft = Math.round(zahl(z.geschafft, 0, 1e6, 0));
  if (B.razzia.left > 0) for (const k of VERSTECK_IDS) if (z.hidden && z.hidden[k] === true) B.razzia.hidden[k] = true;
}

// ---- Regale: E legt alle Stücke der Sorte(n) aus den Taschen hinein, F nimmt heraus, soweit Platz ist
// sorten: { handOf, addHand, handRoom } aus ludwiglogic.js (hier übergeben, sonst gäbe es einen Kreis-Import)
export function regalRein(S, R, L) {
  let n = 0; for (const k of R.sorten) { const h = L.handOf(S, k); if (h > 0) { L.addHand(S, k, -h); S.bunker.regal[k] += h; n += h; } }
  return n > 0 ? { ok: true, n } : { ok: false, why: 'nichts' };
}
export function regalRaus(S, R, L) {
  let n = 0; for (const k of R.sorten) { const m = Math.min(S.bunker.regal[k], L.handRoom(S, k)); if (m > 0) { S.bunker.regal[k] -= m; L.addHand(S, k, m); n += m; } }
  if (n > 0) return { ok: true, n };
  return { ok: false, why: regalVon(S.bunker, R) > 0 ? 'voll' : 'leer' };
}

// ---- Maschinen kaufen
export function smFrei(S, id) { const M = SORTMASCHINEN[id]; return id === 'liquid' ? !!(S.tools && S.tools.werkbank) : frei(S, M.sorte); }
export const smPreis = (S, id) => Math.round(SORTMASCHINEN[id].preis * costMul(S));
export function smKaufen(S, id, L) {
  const M = SORTMASCHINEN[id]; if (!M) return { ok: false, why: 'gibts' };
  if (!L.bunkerOpen(S)) return { ok: false, why: 'bunker' }; if (!smFrei(S, id)) return { ok: false, why: 'need' };
  const q = S.bunker.sm[id]; if (q.have) return { ok: false, why: 'max' };
  const p = smPreis(S, id); if (S.geld < p) return { ok: false, why: 'geld', fehlt: p - S.geld };
  S.geld -= p; q.have = true; q.build = M.build; return { ok: true, tier: { name: M.name } };
}
export function smStatus(S, id) {
  const q = S.bunker.sm[id]; if (!q.have) return 'fehlt'; if (q.build > 0) return 'bau';
  if (S.bunker.razzia.left > 0 && S.bunker.razzia.hidden.maschinen) return 'aus'; if (q.starved) return 'material'; return 'läuft';
}

// ---- Takt (nur Gastgeber oder allein). L: { matOf, addMat, teilOf, teileRoom }. Gibt Ereignisse zurück.
export function tickTeil3(S, dt, L, rnd = Math.random) {
  const B = S.bunker; const ev = []; if (!(dt > 0) || !L.bunkerOpen(S)) return ev;
  const aus = B.razzia.left > 0 && B.razzia.hidden.maschinen;
  for (const id of SM_IDS) {
    const q = B.sm[id]; const M = SORTMASCHINEN[id]; if (!q.have) continue;
    if (q.build > 0) { q.build = Math.max(0, q.build - dt); if (q.build <= 0) ev.push({ k: 'smFertig', id }); continue; }
    if (aus) continue;
    q.acc += (M.rate * dt) / 60; const n = Math.floor(q.acc); if (n <= 0) continue; q.acc -= n;
    let k = n; for (const [m, u] of Object.entries(M.use)) k = Math.min(k, Math.floor(L.matOf(S, m) / u));
    if (id === 'liquid') k = Math.min(k, Math.max(0, LIQUID_MAX - L.teilOf(S, 'base')), L.teileRoom(S, 'base'));
    q.starved = k < n; if (k <= 0) continue;
    for (const [m, u] of Object.entries(M.use)) L.addMat(S, m, -u * k);
    if (id === 'liquid') S.teile.base += k; else { B.regal[M.sorte] += k; S.made[M.sorte] = (S.made[M.sorte] || 0) + k; }
    q.made += k;
  }
  // Razzia: erst wenn Ludwig schon unten war und im Lager oder in den Regalen etwas liegt
  const R = B.razzia;
  if (R.left > 0) {
    R.left = Math.max(0, R.left - dt);
    if (VERSTECK_IDS.every((k) => R.hidden[k])) { R.left = 0; ev.push(razziaEnde(S, true, rnd)); }
    else if (R.left <= 0) ev.push(razziaEnde(S, false, rnd));
  } else if (B.started && (B.lager > 0 || regalSumme(B) > 0)) {
    R.next -= dt;
    if (R.next <= 0) { R.left = RAZZIA.dauer; R.hidden = {}; R.n++; ev.push({ k: 'razzia' }); }
  }
  return ev;
}
function razziaEnde(S, gut, rnd) {
  const B = S.bunker; const R = B.razzia; R.next = RAZZIA.min + rnd() * (RAZZIA.max - RAZZIA.min); R.hidden = {};
  if (gut) { R.geschafft++; return { k: 'razziaGut', resp: gainResp(S, RAZZIA.lohn) }; }
  const weg = { lager: Math.floor(B.lager * RAZZIA.anteil), regal: 0 }; B.lager -= weg.lager;
  for (const k of REGAL_SORTEN) { const m = Math.floor(B.regal[k] * RAZZIA.anteil); B.regal[k] -= m; weg.regal += m; }
  return { k: 'razziaWeg', weg };
}
// Ein Versteck erledigen (E). Nur während der Razzia.
export function verstecke(S, id) {
  const R = S.bunker.razzia; if (!(R.left > 0) || !VERSTECKE[id]) return { ok: false };
  if (R.hidden[id]) return { ok: false, why: 'schon' };
  R.hidden[id] = true; return { ok: true, rest: VERSTECK_IDS.filter((k) => !R.hidden[k]).length };
}

// ---- Aufträge für die neuen Sorten (Faktor auf die Kippen-Menge)
export const AUFTRAG_SORTEN = { stopf: 0.3, aroma: 0.25, zigarillo: 0.1, joint: 0.1, vape: 0.03 };
const VAPE_IDS = ['vmango', 'vmenthol', 'vkirsche'];
export const auftragVorrat = (B, sorte) => (!sorte ? B.lager : sorte === 'vape' ? VAPE_IDS.reduce((a, k) => a + B.regal[k], 0) : B.regal[sorte]);
export function auftragNimm(B, sorte, n) {
  if (!sorte) { B.lager -= n; return; }
  if (sorte !== 'vape') { B.regal[sorte] -= n; return; }
  let rest = n; for (const k of VAPE_IDS) { const m = Math.min(rest, B.regal[k]); B.regal[k] -= m; rest -= m; }
}
// welche Sorten Aufträge bekommen: was frei ist (Vapes mit Werkbank)
export const AUFTRAG_PREIS = { stopf: 120, aroma: 160, zigarillo: 400, joint: 640, vape: 1600 };
export const AUFTRAG_WORT = { stopf: 'Stopfkippen', aroma: 'Aromakippen', zigarillo: 'Zigarillos', joint: 'Joints', vape: 'Vapes' };
export const auftragWort = (sorte) => AUFTRAG_WORT[sorte] || 'Kippen';
export function auftragsSorten(S) {
  const out = []; for (const k of ['stopf', 'aroma', 'zigarillo', 'joint']) if (frei(S, k)) out.push(k);
  if (frei(S, 'vape') && S.tools && S.tools.werkbank) out.push('vape');
  return out;
}
