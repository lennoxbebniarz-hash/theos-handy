// Theos Seitenscheidel - Teo's Casino, Level 4 (Roulette-Galerie): Europäisches Roulette mit einer Null.
// Einsätze: einzelne Zahl (35:1), Rot/Schwarz, Gerade/Ungerade, 1–18/19–36 (1:1), Dutzende und Kolonnen (2:1).
// Teos Hausregel (La Partage): Fällt die Null, gibt es auf die einfachen Chancen die Hälfte zurück.
// Glückssträhne (luckFor 'roulette', Wohnungs-Upgrade „Mini-Roulette“): mit Wahrscheinlichkeit |Glück − 1| · LUCK_ROU werden zwei Zahlen
// gezogen und die für die Einsätze bessere (Glück > 1) bzw. schlechtere (Glück < 1) fällt. Der Host dreht, alle anderen sehen das Ergebnis.
import { rng, luckFor, netWorth, levelFor } from './casinologic.js';

export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const colorOf = (n) => (n === 0 ? 'gruen' : REDS.has(n) ? 'rot' : 'schwarz');
export const LUCK_ROU = 0.35;
export const ROU_TABLES = [
  { id: 0, name: 'Tisch Rubin', chips: [100, 500, 2500, 10000], min: 100, max: 50000 },
  { id: 1, name: 'Tisch Granat', chips: [100, 500, 2500, 10000], min: 100, max: 100000 },
  { id: 2, name: 'Teos Goldkessel', chips: [1000, 2500, 10000, 50000], min: 1000, max: 500000 },
];
export const ROU_SEATS = 3;
const EVEN = ['rot', 'schwarz', 'gerade', 'ungerade', 'tief', 'hoch'];
export const BET_LABEL = { rot: 'Rot', schwarz: 'Schwarz', gerade: 'Gerade', ungerade: 'Ungerade', tief: '1–18', hoch: '19–36', d1: '1. Dutzend', d2: '2. Dutzend', d3: '3. Dutzend', k1: '1. Kolonne', k2: '2. Kolonne', k3: '3. Kolonne' };
export const betName = (k) => (/^n\d+$/.test(k) ? 'Zahl ' + k.slice(1) : BET_LABEL[k] || k);
export function validBet(k) { if (/^n\d+$/.test(k)) { const n = Number(k.slice(1)); return n >= 0 && n <= 36; } return k in BET_LABEL; }
// Auszahlung (mit Einsatz) für einen Einsatz auf k bei Zahl n
export function payout(k, amt, n) {
  if (k[0] === 'n') return Number(k.slice(1)) === n ? amt * 36 : 0;
  if (EVEN.includes(k)) { if (n === 0) return Math.floor(amt / 2); const hit = k === 'rot' ? REDS.has(n) : k === 'schwarz' ? !REDS.has(n) : k === 'gerade' ? n % 2 === 0 : k === 'ungerade' ? n % 2 === 1 : k === 'tief' ? n <= 18 : n >= 19; return hit ? amt * 2 : 0; }
  if (n === 0) return 0; if (k[0] === 'd') return Math.ceil(n / 12) === Number(k[1]) ? amt * 3 : 0; if (k[0] === 'k') return ((n - 1) % 3) + 1 === Number(k[1]) ? amt * 3 : 0; return 0;
}
export const totalWin = (bets, n) => Object.entries(bets).reduce((a, [k, v]) => a + payout(k, v, n), 0);
export const totalBet = (bets) => Object.values(bets).reduce((a, v) => a + v, 0);
export function spinNumber(bets, seed, luck = 1) {
  const r = rng(seed >>> 0); r(); const a = Math.floor(r() * 37); const p = Math.min(0.85, Math.abs(luck - 1) * LUCK_ROU); if (p <= 0 || r() >= p) return a;
  const b = Math.floor(r() * 37); const wa = totalWin(bets, a); const wb = totalWin(bets, b); if (wa === wb) return a; return luck > 1 ? (wa > wb ? a : b) : (wa > wb ? b : a);
}
export function cleanBets(bets) { const out = {}; for (const [k, v] of Object.entries(bets || {})) { const a = Math.round(Number(v)); if (validBet(k) && a > 0) out[k] = a; } return out; }
export function playRoulette(S, who, table, betsIn, seed) {
  const T = ROU_TABLES[table | 0]; if (!T) return { ok: false, why: 'Diesen Tisch gibt es nicht.' }; const bets = cleanBets(betsIn); const tot = totalBet(bets);
  if (!tot) return { ok: false, why: 'Erst Jetons auf das Tableau legen.' }; if (Object.values(bets).some((v) => v < T.min)) return { ok: false, why: `Mindesteinsatz je Feld: ${T.min / 100} €.` };
  if (tot > T.max) return { ok: false, why: `Höchstens ${T.max / 100} € pro Runde an diesem Tisch.` }; if (S.purse < tot) return { ok: false, why: 'Die Familienkasse reicht nicht.' };
  S.purse -= tot; S.spent = (S.spent || 0) + tot; const n = spinNumber(bets, seed, luckFor(S, 'roulette')); const win = totalWin(bets, n);
  S.purse += win; S.won = (S.won || 0) + win; const st = (S.rouStats = S.rouStats || { spins: 0, won: 0, best: 0, straight: 0 }); st.spins++; st.won += win; st.best = Math.max(st.best, win);
  if (Object.keys(bets).some((k) => k === 'n' + n)) st.straight++; (S.rouLast = S.rouLast || []).unshift(n); S.rouLast.length = Math.min(S.rouLast.length, 12);
  const before = S.level; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak);
  return { ok: true, n, win, bet: tot, bets, level: S.level > before ? S.level : 0 };
}
