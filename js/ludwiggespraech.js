// Theos Seitenscheidel - Ludwig Zigaretti: Gespräche draußen, nur die Regeln (Stimmen-Update 2026-11-22, Wunsch Lennox).
// Wer wann da ist, was man fragen kann und welcher Satz je nach Uhrzeit und Lage kommt. Läuft auch in node --test.
import { LEUTE } from './ludwigtexte.js';
import { clock } from './ludwigwelt.js';
import { gainResp } from './ludwigskills.js';

export const ZEIT = { morgen: 'm', tag: 't', abend: 'a', nacht: 'n' };
export const PAUSE = 600; // so viele Sekunden, bis jemand wieder ein Anliegen hat
export const NOCHMAL = 25; // wer so schnell wiederkommt, hört „schon wieder du“
export const THEMEN = [
  { id: 'geht', text: () => 'Wie geht’s?', q: () => 'q_geht' },
  { id: 'neues', text: () => 'Was gibt’s Neues?', q: () => 'q_neues' },
  { id: 'eltern', text: (du) => (du ? 'Hast du meine Eltern gesehen?' : 'Haben Sie meine Eltern gesehen?'), q: (du) => (du ? 'q_eltern_du' : 'q_eltern') },
  { id: 'tipp', text: (du) => (du ? 'Hast du einen Tipp?' : 'Haben Sie einen Tipp?'), q: (du) => (du ? 'q_tipp_du' : 'q_tipp') },
  { id: 'witz', text: () => 'Erzähl mal was Lustiges!', q: () => 'q_witz' },
  { id: 'wer', text: (du) => (du ? 'Wer bist du eigentlich?' : 'Wer sind Sie eigentlich?'), q: (du) => (du ? 'q_wer_du' : 'q_wer') },
  { id: 'frage', text: (du) => (du ? 'Brauchst du was?' : 'Brauchen Sie was?'), q: () => null },
];
export const ANTWORT = [ // Antworten auf ein Anliegen: je drei Aufnahmen
  { id: 'ja', text: 'Ja, mach ich.', sag: ['a_ja1', 'a_ja2', 'a_ja3'] },
  { id: 'nein', text: 'Nein.', sag: ['a_nein1', 'a_nein2', 'a_nein3'] },
  { id: 'deal', text: 'Was krieg ich dafür?', sag: ['a_deal1', 'a_deal2', 'a_deal3'] },
];

const phase = (S) => ZEIT[clock(S).phase];
export const istDa = (S, id) => !!LEUTE[id] && LEUTE[id].zeit.includes(phase(S));
export function hatAnliegen(S, id) {
  const wann = S.gespr ? S.gespr[id] : undefined;
  return wann === undefined || S.t - wann >= PAUSE || S.t < wann;
}
export function themen(S, id) {
  const L = LEUTE[id]; if (!L) return [];
  return THEMEN.filter((t) => {
    if (t.id === 'frage') return !!L.t.frage && hatAnliegen(S, id);
    if (t.id === 'neues') return !!L.t['n' + phase(S)];
    if (t.id === 'eltern') return !!(L.t.daheim || L.t.weg);
    if (t.id === 'wer') return !!L.t.wer;
    return Object.keys(L.t).some((k) => k.startsWith(t.id));
  });
}
// seit: Sekunden seit dem letzten Gespräch mit dieser Person
export function gruss(S, id, { grau = false, seit = Infinity } = {}) {
  const T = LEUTE[id].t;
  if (grau && T.grau) return 'grau';
  if (seit < NOCHMAL && T.nochmal) return 'nochmal';
  return T['g' + phase(S)] ? 'g' + phase(S) : ['gm', 'gt', 'ga', 'gn'].find((k) => T[k]) || null;
}
// n: wie oft man das schon gefragt hat (dann kommt der nächste Satz)
export function antwort(S, id, thema, n = 0) {
  const T = LEUTE[id].t;
  if (thema === 'neues') return T['n' + phase(S)] ? 'n' + phase(S) : null;
  if (thema === 'eltern') { const k = S.welt && S.welt.weg > 0 ? 'weg' : 'daheim'; return T[k] ? k : null; }
  if (thema === 'wer' || thema === 'frage') return T[thema] ? thema : null;
  const liste = [1, 2, 3].map((i) => thema + i).filter((k) => T[k]);
  return liste.length ? liste[n % liste.length] : null;
}
// Anliegen erledigt: Ja bringt Respekt, Handeln 50 Cent, Nein nichts
export function anliegen(S, id, wahl) {
  if (!LEUTE[id] || !hatAnliegen(S, id)) return { ok: false };
  if (!S.gespr) S.gespr = {};
  S.gespr[id] = Math.round(S.t);
  const out = { ok: true, key: wahl, geld: 0, resp: 0 };
  if (wahl === 'ja') out.resp = gainResp(S, 1);
  else if (wahl === 'deal') { out.geld = 50; S.geld += out.geld; }
  return out;
}
