// Theos Seitenscheidel - Teo's Casino, Level 5 (Spielhalle im Keller): Plinko, Teos Glücksrad und Turbo-Bingo.
// Plinko: 12 Stiftreihen, die Kugel fällt in eines von 13 Fächern (Binomialverteilung), drei Risikostufen.
// Glücksrad: 60 Felder (×2, ×3, ×7, ×19 und einmal TEO ×58), man setzt Jetons auf eine oder mehrere Sorten.
// Turbo-Bingo: 1 bis 4 Karten (75er-Bingo, freie Mitte), 40 Kugeln. Je früher eine Karte die erste Reihe (waagerecht, senkrecht, diagonal) hat, desto mehr zahlt sie.
// Glückssträhne (luckFor 'spielhalle'): mit Wahrscheinlichkeit |Glück − 1| · LUCK_ARC zwei Ausgänge, der bessere (Glück > 1) bzw. schlechtere (Glück < 1) zählt.
// Der Host rechnet, Mitspieler schicken den Wunsch. Auszahlungsquoten in test/casino-l5.test.js gemessen (um 96–98 % bei Glück 1).
import { rng, luckFor, netWorth, levelFor } from './casinologic.js';

export const LUCK_ARC = 0.4;
const luckP = (luck) => Math.min(0.85, Math.abs((luck || 1) - 1) * LUCK_ARC);
const lvl = (S) => { const before = S.level; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak); return S.level > before ? S.level : 0; };
const pay = (S, bet) => { S.purse -= bet; S.spent = (S.spent || 0) + bet; };
const stats = (S) => (S.arcStats = S.arcStats || { plinko: 0, wheel: 0, bingo: 0, best: 0, won: 0, bingos: 0, teo: 0, edge: 0 });

// ---------------- Plinko ----------------
export const PLINKO_ROWS = 12;
export const PLINKO = {
  ruhig: { name: 'Ruhig', mult: [8, 3, 1.6, 1.3, 1.1, 1, 0.5, 1, 1.1, 1.3, 1.6, 3, 8] },
  mittel: { name: 'Mittel', mult: [26, 9, 4, 1.9, 1.1, 0.6, 0.4, 0.6, 1.1, 1.9, 4, 9, 26] },
  wild: { name: 'Wild', mult: [170, 24, 8, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8, 24, 170] },
};
export const PLINKO_BETS = [100, 500, 1000, 2500, 5000, 10000, 50000];
function plinkoPath(r) { const p = []; for (let i = 0; i < PLINKO_ROWS; i++) p.push(r() < 0.5 ? 0 : 1); return p; }
export const plinkoSlot = (path) => path.reduce((a, b) => a + b, 0);
export function playPlinko(S, who, risk, bet, seed) {
  const R = PLINKO[risk]; if (!R) return { ok: false, why: 'Diese Risikostufe gibt es nicht.' }; if (!PLINKO_BETS.includes(bet)) return { ok: false, why: 'Dieser Einsatz geht hier nicht.' }; if (S.purse < bet) return { ok: false, why: 'Die Familienkasse reicht nicht.' };
  pay(S, bet); const luck = luckFor(S, 'spielhalle'); const r = rng(seed >>> 0); r(); let path = plinkoPath(r);
  if (r() < luckP(luck)) { const b = plinkoPath(r); const ma = R.mult[plinkoSlot(path)]; const mb = R.mult[plinkoSlot(b)]; if (ma !== mb && ((luck > 1) === (mb > ma))) path = b; }
  const slot = plinkoSlot(path); const mult = R.mult[slot]; const win = Math.round(bet * mult); S.purse += win; S.won = (S.won || 0) + win; const st = stats(S); st.plinko++; st.won += win; st.best = Math.max(st.best, win); if (slot === 0 || slot === PLINKO_ROWS) st.edge++;
  return { ok: true, game: 'plinko', risk, bet, path, slot, mult, win, level: lvl(S) };
}

// ---------------- Teos Glücksrad ----------------
export const WHEEL_TYPES = {
  x2: { label: '×2', mult: 2, count: 29, color: '#2a8ad8' }, x3: { label: '×3', mult: 3, count: 19, color: '#18a85a' }, x7: { label: '×7', mult: 7, count: 8, color: '#e8a018' },
  x19: { label: '×19', mult: 19, count: 3, color: '#c8142a' }, teo: { label: 'TEO ×58', mult: 58, count: 1, color: '#8a2ad8' },
};
export const WHEEL_SEGS = (() => { const n = 60; const out = new Array(n).fill(null); const order = ['teo', 'x19', 'x7', 'x3', 'x2']; let off = 0;
  for (const k of order) { const c = WHEEL_TYPES[k].count; for (let i = 0; i < c; i++) { let t = Math.round(off + (i * n) / c) % n; let d = 0; while (out[(t + d) % n] && d < n) d = d > 0 ? -d : -d + 1; out[((t + d) % n + n) % n] = k; } off += 2.3; }
  for (let i = 0; i < n; i++) if (!out[i]) out[i] = 'x2'; return out; })();
export const WHEEL_CHIPS = [100, 500, 2500, 10000, 50000]; export const WHEEL_MAX = 500000;
export const wheelWin = (bets, type) => Math.round((bets[type] || 0) * WHEEL_TYPES[type].mult);
export function playWheel(S, who, betsIn, seed) {
  const bets = {}; let tot = 0; for (const [k, v] of Object.entries(betsIn || {})) { const a = Math.round(Number(v)); if (WHEEL_TYPES[k] && a > 0) { bets[k] = a; tot += a; } }
  if (!tot) return { ok: false, why: 'Erst Jetons auf ein Feld legen.' }; if (tot > WHEEL_MAX) return { ok: false, why: 'Höchstens 5.000 € pro Dreh.' }; if (S.purse < tot) return { ok: false, why: 'Die Familienkasse reicht nicht.' };
  pay(S, tot); const luck = luckFor(S, 'spielhalle'); const r = rng(seed >>> 0); r(); let idx = Math.floor(r() * WHEEL_SEGS.length);
  if (r() < luckP(luck)) { const b = Math.floor(r() * WHEEL_SEGS.length); const wa = wheelWin(bets, WHEEL_SEGS[idx]); const wb = wheelWin(bets, WHEEL_SEGS[b]); if (wa !== wb && ((luck > 1) === (wb > wa))) idx = b; }
  const type = WHEEL_SEGS[idx]; const win = wheelWin(bets, type); S.purse += win; S.won = (S.won || 0) + win; const st = stats(S); st.wheel++; st.won += win; st.best = Math.max(st.best, win); if (type === 'teo' && bets.teo) st.teo++;
  return { ok: true, game: 'wheel', bets, bet: tot, idx, type, win, level: lvl(S) };
}

// ---------------- Turbo-Bingo ----------------
export const BINGO_BALLS = 40; export const BINGO_PRICES = [100, 500, 1000, 2500, 5000, 10000];
export const BINGO_PAY = [{ max: 15, mult: 33, name: 'Blitz-Bingo' }, { max: 20, mult: 10, name: 'Turbo-Bingo' }, { max: 25, mult: 4, name: 'Schnelles Bingo' }, { max: 30, mult: 2, name: 'Bingo' }, { max: 35, mult: 1.2, name: 'Spätes Bingo' }, { max: 40, mult: 0.6, name: 'Trostpreis' }];
export const BINGO_LINES = (() => { const L = []; for (let r = 0; r < 5; r++) L.push([0, 1, 2, 3, 4].map((c) => c * 5 + r)); for (let c = 0; c < 5; c++) L.push([0, 1, 2, 3, 4].map((r) => c * 5 + r)); L.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]); return L; })();
export function bingoCard(r) { const card = []; for (let c = 0; c < 5; c++) { const pool = Array.from({ length: 15 }, (_, i) => c * 15 + i + 1); for (let k = 0; k < 5; k++) card.push(pool.splice(Math.floor(r() * pool.length), 1)[0]); } card[12] = 0; return card; } // spaltenweise: Index = Spalte · 5 + Reihe, 0 = frei
function bingoSeq(r) { const s = Array.from({ length: 75 }, (_, i) => i + 1); for (let i = 74; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [s[i], s[j]] = [s[j], s[i]]; } return s.slice(0, BINGO_BALLS); }
export function bingoEval(card, balls) { const at = new Map(balls.map((n, i) => [n, i + 1])); let best = 99; let line = null; for (const L of BINGO_LINES) { let m = 0; for (const p of L) { const n = card[p]; if (n) { const a = at.get(n); m = Math.max(m, a === undefined ? 99 : a); } } if (m < best) { best = m; line = L; } } const tier = BINGO_PAY.find((t) => best <= t.max) || null; return { at: best <= BINGO_BALLS ? best : 0, line: best <= BINGO_BALLS ? line : null, tier }; }
export function playBingo(S, who, n, price, seed) {
  n = Math.max(1, Math.min(4, n | 0)); if (!BINGO_PRICES.includes(price)) return { ok: false, why: 'Diesen Kartenpreis gibt es nicht.' }; const tot = n * price; if (S.purse < tot) return { ok: false, why: 'Die Familienkasse reicht nicht.' };
  pay(S, tot); const luck = luckFor(S, 'spielhalle'); const r = rng(seed >>> 0); r(); const cards = []; for (let i = 0; i < n; i++) cards.push(bingoCard(r));
  const score = (balls) => cards.reduce((a, c) => { const e = bingoEval(c, balls); return a + (e.tier ? Math.round(price * e.tier.mult) : 0); }, 0);
  let balls = bingoSeq(r); if (r() < luckP(luck)) { const b = bingoSeq(r); const wa = score(balls); const wb = score(b); if (wa !== wb && ((luck > 1) === (wb > wa))) balls = b; }
  const res = cards.map((c) => { const e = bingoEval(c, balls); const win = e.tier ? Math.round(price * e.tier.mult) : 0; return { at: e.at, line: e.line, tier: e.tier ? e.tier.name : null, mult: e.tier ? e.tier.mult : 0, win }; });
  const win = res.reduce((a, x) => a + x.win, 0); S.purse += win; S.won = (S.won || 0) + win; const st = stats(S); st.bingo++; st.won += win; st.best = Math.max(st.best, win); st.bingos += res.filter((x) => x.at && x.at <= 30).length;
  return { ok: true, game: 'bingo', n, price, bet: tot, cards, balls, res, win, level: lvl(S) };
}
