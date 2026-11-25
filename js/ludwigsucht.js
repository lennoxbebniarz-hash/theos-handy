// Theos Seitenscheidel - Ludwig Zigaretti: selber rauchen, nur die Regeln (2026-11-22, Wunsch Lennox).
// Alle fünf gespielten Minuten wird alles schwarz-weiß: „Du brauchst eine Zigarette.“ Rauchen oder Wasser am Brunnen bringt die Farben zurück.
// Vorteile gibt es keine. Der Joint bleibt Ware: Ludwig geht noch zur Schule.
// S.sucht gehört jedem Spieler selbst (LOCAL in ludwigmp.js), S.rauch (Qualm im Zimmer, 0 bis 1) gehört allen.
import { SORTEN, SORT_ORDER, VAPES, handOf, addHand } from './ludwiglogic.js';

export const SUCHT_S = 300;
export const RAUCHBAR = SORT_ORDER.filter((id) => id !== 'joint');
export const VAPE_ZUEGE = 10; // so oft zieht man an einer Vape
export const SCHUETTELN = 10; // so oft schüttelt man das Handtuch, bis das Zimmer frei ist
export const DAUER = { kippe: 3, stopf: 3, aroma: 3, zigarillo: 4.4, vmango: 1.3, vmenthol: 1.3, vkirsche: 1.3 }; // Sekunden R halten
export const istVape = (id) => VAPES.includes(id);

export function suchtTick(S, sekunden) { S.sucht.t = Math.min(SUCHT_S, S.sucht.t + sekunden); }
export const brauchtEine = (S) => !!S && !!S.sucht && S.sucht.t >= SUCHT_S;

export const offeneZuege = (S, id) => (istVape(id) ? S.sucht.zug[id] || 0 : 0);
// was sich gerade rauchen lässt: aus den eigenen Taschen, dazu angefangene Vapes
export const vorrat = (S) => RAUCHBAR.filter((id) => handOf(S, id) > 0 || offeneZuege(S, id) > 0);
export function gewaehlt(S) { const list = vorrat(S); return list.includes(S.sucht.sorte) ? S.sucht.sorte : list[0] || null; }
export function naechste(S) {
  const list = vorrat(S); if (!list.length) return null;
  S.sucht.sorte = list[(list.indexOf(gewaehlt(S)) + 1) % list.length];
  return S.sucht.sorte;
}

// ort: 'zimmer' (geht, macht alles voll Rauch), 'draussen', sonst drinnen (geht nicht)
export function pruefe(S, id, ort) {
  if (id === 'joint') return { ok: false, why: 'joint' };
  if (ort !== 'zimmer' && ort !== 'draussen') return { ok: false, why: 'drinnen' };
  if (!id || !SORTEN[id]) return { ok: false, why: handOf(S, 'joint') > 0 ? 'joint' : 'leer' };
  if (handOf(S, id) <= 0 && offeneZuege(S, id) <= 0) return { ok: false, why: 'leer' };
  return { ok: true };
}
export function rauche(S, id, ort) {
  const p = pruefe(S, id, ort); if (!p.ok) return p;
  if (istVape(id)) {
    if (offeneZuege(S, id) <= 0) { addHand(S, id, -1); S.sucht.zug[id] = VAPE_ZUEGE; }
    S.sucht.zug[id]--;
  } else addHand(S, id, -1);
  S.sucht.t = 0; S.sucht.sorte = id;
  const qualm = ort === 'zimmer';
  if (qualm) S.rauch = 1;
  return { ok: true, id, qualm };
}
export function wasser(S) { const brauchte = brauchtEine(S); S.sucht.t = 0; return { brauchte }; }

export const schuettelnNoch = (S) => Math.ceil(Math.min(1, Math.max(0, S.rauch || 0)) * SCHUETTELN - 0.01);
export function schuettle(S) {
  const noch = schuettelnNoch(S); if (noch <= 0) return 0;
  S.rauch = (noch - 1) / SCHUETTELN;
  return noch - 1;
}
