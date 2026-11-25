// Theos Seitenscheidel - Schrank-Hub: was auf dem Kärtchen steht (Spielstand) und was durchgespielt ist (golden).
// Liest nur die vorhandenen Spielstände. Spiele ohne Ende (Schach, Pong, Schiffe, Brettspiele, Kraftprobe, Hund) werden nie golden.
import { TITEL } from './titel.js';
import { LEVELS, euro } from './casinologic.js';
import { companyOf, fmtCr } from './moonlogic.js';
import { DIFFICULTY_ORDER } from './track.js';
import { campaignWon } from './roadmap.js';
import { PARK_COUNT } from './parklevels.js';

const WON = { ludwig: (S) => !!S.boss, strom: (S) => !!S.won, ozean: (S) => !!S.won, bruno: (S) => S.over === 'won' };
const none = (line = '') => ({ line, gold: false });
const doneCount = (p) => (p && p.done ? Object.values(p.done).filter(Boolean).length : 0);

export function createStand({ store, games }) {
  const known = new Map(); // gewonnen je Stand, damit große Stände nicht jedes Mal neu geladen werden

  function withSaves(id) {
    const saves = games[id].saves; const list = saves.list();
    if (!list.length) return none('Noch kein Spielstand');
    const gold = list.some((m) => {
      if (id === 'bruno' && !m.over) return false;
      const key = `${id}|${m.id}|${m.updated}`;
      if (!known.has(key)) known.set(key, WON[id](saves.load(m.id)));
      return known.get(key);
    });
    const last = saves.get(saves.last()) || list[0];
    return { line: `${last.name}: ${TITEL[id].info(last, saves)}`, gold };
  }
  const READ = {
    ludwig: () => withSaves('ludwig'),
    strom: () => withSaves('strom'),
    ozean: () => withSaves('ozean'),
    bruno: () => withSaves('bruno'),
    casino() {
      const saves = games.casino.saves; const list = saves.list();
      if (!list.length) return none('Noch kein Spielstand');
      const last = saves.get(saves.last()) || list[0];
      return { line: `${last.name}: Level ${last.level || 1}, ${euro(last.purse || 0, true)}`, gold: list.some((m) => (m.level || 1) >= LEVELS.length) };
    },
    moon() {
      const sv = store.get('moon.save', null);
      if (!sv || !sv.E) return none('Noch keine Firma');
      return { line: `${companyOf(sv.E).name}, ${fmtCr(sv.E.credits || 0)} Cr`, gold: !!sv.won };
    },
    race() {
      const p = store.get('campaign', null);
      const n = p && p.done ? DIFFICULTY_ORDER.filter((id) => p.done[id]).length : 0;
      return { line: `${n} von ${DIFFICULTY_ORDER.length} Strecken geschafft`, gold: !!p && !!campaignWon(DIFFICULTY_ORDER, p) };
    },
    park() {
      const n = Math.min(PARK_COUNT, doneCount(store.get('parkProgress', null)));
      return { line: `${n} von ${PARK_COUNT} Leveln geschafft`, gold: n >= PARK_COUNT };
    },
    raus() {
      const S = store.get('rausGame', null);
      return none(S && S.winner === null ? 'Eine Partie läuft noch' : 'Keine offene Partie');
    },
    baron() {
      const S = store.get('baronSolo', null);
      return none(S && S.winner === null ? 'Deine Partie gegen die KI läuft noch' : 'Keine offene Partie');
    },
    saege() {
      const n = store.get('sgBest', 0);
      return none(n ? `Beste Welle: ${n}` : 'Noch nicht gespielt');
    },
    kraft() {
      const n = store.get('kraftBest', 0);
      return none(n ? `Rekord: ${n} Punkte` : 'Noch kein Rekord');
    },
  };

  return function read() {
    const out = {};
    for (const [id, fn] of Object.entries(READ)) {
      try { out[id] = fn(); } catch (e) { console.warn('[schrank] Spielstand ' + id + ' nicht lesbar', e); out[id] = none(); }
    }
    return out;
  };
}
