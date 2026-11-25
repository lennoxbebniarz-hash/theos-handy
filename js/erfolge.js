// Theos Seitenscheidel - große Erfolge für das Trophäenregal im Zimmer (seit 2026-11-22): Stufe 1 = Silber, Stufe 2 = Gold.
// Jeder PC merkt sie sich selbst (Speicher 'erfolge'). watch() schaut beim Spielen zu, darum zählen sie auch für Mitspieler,
// die den Spielstand des Gastgebers nicht haben. collect() holt nach, was in den eigenen Spielständen schon steht.
// Einmal verdient bleibt verdient, auch wenn der Spielstand gelöscht wird.
import { DIFFICULTY_ORDER } from './track.js';
import { PARK_COUNT } from './parklevels.js';
import { MILESTONES } from './moonlogic.js';
import { LEVELS as SAELE, PLAYABLE } from './casinologic.js';
import { MAX_LVL } from './stromlogic.js';
import { goalVol } from './brunologic.js';
import { EGGS } from './ludwiglogic.js';

const STROM_HALB = Math.ceil(MAX_LVL / 2);
const MOND_ZEHN = MILESTONES.indexOf(10) + 1; // E.milestones zählt die erreichten Marken

// spiel = welcher Gegenstand im Schrank dazu golden wird
export const ERFOLGE = [
  { id: 'race', spiel: 'race', name: 'Rallye-Pokal', silber: '5 Strecken schaffen', gold: 'alle 10 Strecken schaffen' },
  { id: 'park', spiel: 'park', name: 'Einpark-Pokal', silber: '25 Level schaffen', gold: 'alle 50 Level schaffen' },
  { id: 'moon', spiel: 'moon', name: 'Mond mit Besen', silber: '10 Prozent vom Mond putzen', gold: 'den ganzen Mond putzen' },
  { id: 'casino', spiel: 'casino', name: "Teo's Geldsack", silber: `Level ${PLAYABLE} erreichen`, gold: `Level ${SAELE.length} erreichen` },
  { id: 'saege', name: 'Knet-Hamster', silber: '5 Wellen überstehen', gold: '10 Wellen überstehen' },
  { id: 'strom', spiel: 'strom', name: 'Goldene Glühbirne', silber: `Level ${STROM_HALB} erreichen`, gold: 'Brunos Geschirrspüler zum Laufen bringen' },
  { id: 'ozean', spiel: 'ozean', name: 'Theos Handy', silber: 'den Pazifik trockenlegen', gold: 'beide Ozeane trockenlegen' },
  { id: 'bruno', spiel: 'bruno', name: 'Stück von Big Bruno', silber: 'die Hälfte bis zur Rettung abbauen', gold: 'die Erde retten' },
  { id: 'ludwig', spiel: 'ludwig', name: 'Krone vom Zigarettenboss', silber: 'die Falltür zum Bunker freischalten', gold: 'Zigarettenboss werden' },
  { id: 'eier', name: 'Goldenes Ei', silber: '', gold: 'bei Ludwig alle 10 Easter Eggs finden' },
];

// ---------------- Regeln ----------------
const zwei = (halb, ganz) => (ganz ? 2 : halb ? 1 : 0);
export const REGEL = {
  race: (p) => { const n = p && p.done ? DIFFICULTY_ORDER.filter((id) => p.done[id]).length : 0; return zwei(n >= 5, n >= DIFFICULTY_ORDER.length); },
  park: (n) => zwei(n >= 25, n >= PARK_COUNT),
  moon: (E, won) => zwei(!!E && E.milestones >= MOND_ZEHN, !!won),
  casino: (level) => zwei(level >= PLAYABLE, level >= SAELE.length),
  saege: (best) => zwei(best >= 5, best >= 10),
  strom: (S) => zwei((S.level || 1) >= STROM_HALB, !!S.won),
  ozean: (S) => zwei(!!(S.done && S.done[0]), !!S.won),
  bruno: (S, vol = S.vol) => zwei(S.vol0 > 0 && vol > 0 && S.vol0 - vol >= (S.vol0 - goalVol(S.vol0)) / 2, S.over === 'won'),
  ludwig: (S) => zwei(!!(S.skills && S.skills.t_falltuer), !!S.boss),
  eier: (S) => zwei(false, !!S.eggs && EGGS.every((id) => S.eggs[id])),
};

export function createErfolge({ store, games }) {
  const read = () => {
    const e = store.get('erfolge', null);
    return { stufe: e && e.stufe ? { ...e.stufe } : {}, park: e && Array.isArray(e.park) ? e.park.slice() : [] };
  };
  // found: { id: Stufe }, level: gerade geschafftes Parklevel
  function keep(found, level = 0) {
    const e = read(); let changed = false;
    if (level && !e.park.includes(level)) { e.park.push(level); changed = true; }
    const p = store.get('parkProgress', null);
    const done = new Set(e.park.map(String));
    if (p && p.done) for (const [k, v] of Object.entries(p.done)) if (v) done.add(k);
    const all = { ...found, park: REGEL.park(done.size) };
    for (const [id, n] of Object.entries(all)) if (n > (e.stufe[id] || 0)) { e.stufe[id] = n; changed = true; }
    if (changed) store.set('erfolge', e);
    return e.stufe;
  }

  const known = new Map(); // je Spielstand nur neu laden, wenn er sich geändert hat
  function ausStaenden(mode, rule) {
    let best = 0;
    for (const m of games[mode].saves.list()) {
      const key = `${mode}|${rule}|${m.id}|${m.updated}`;
      if (!known.has(key)) known.set(key, REGEL[rule](games[mode].saves.load(m.id)));
      best = Math.max(best, known.get(key));
    }
    return best;
  }
  function collect() {
    const found = {};
    const put = (id, fn) => { try { found[id] = fn(); } catch (e) { console.warn('[erfolge] ' + id + ' nicht lesbar', e); } };
    put('race', () => REGEL.race(store.get('campaign', null)));
    put('saege', () => REGEL.saege(store.get('sgBest', 0)));
    put('moon', () => { const sv = store.get('moon.save', null); return sv ? REGEL.moon(sv.E, sv.won) : 0; });
    put('casino', () => games.casino.saves.list().reduce((n, m) => Math.max(n, REGEL.casino(m.level || 1)), 0));
    for (const id of ['strom', 'ozean', 'bruno', 'ludwig']) put(id, () => ausStaenden(id, id));
    put('eier', () => ausStaenden('ludwig', 'eier'));
    return keep(found);
  }

  // beim Spielen zuschauen: auch Gäste haben den Stand des Gastgebers im Speicher (C.S), speichern ihn aber nicht
  function watch(mode) {
    try {
      if (mode === 'moon') {
        const M = games.moon;
        if (M.phase === 'play') keep({ moon: REGEL.moon(M.E, M.won) });
        return;
      }
      if (mode === 'park') {
        const P = games.park.state;
        if (P.phase === 'won' && P.n) keep({}, P.n);
        return;
      }
      if (!['strom', 'ozean', 'bruno', 'casino', 'ludwig'].includes(mode)) return;
      const C = games[mode].state;
      if (!C.on || C.loading || !C.S) return;
      if (mode === 'ludwig') { keep({ ludwig: REGEL.ludwig(C.S), eier: REGEL.eier(C.S) }); return; }
      if (mode === 'bruno') { keep({ bruno: REGEL.bruno(C.S, C.A ? C.A.vol : C.S.vol) }); return; }
      keep({ [mode]: mode === 'casino' ? REGEL.casino(C.S.level || 1) : REGEL[mode](C.S) });
    } catch (e) {
      console.warn('[erfolge] zuschauen: ' + mode, e);
    }
  }

  return { collect, watch, stufen: () => read().stufe };
}
