// Theos Seitenscheidel - Teo's Casino, Level 3 (Kartensalon): Blackjack.
// Regeln: Blackjack zahlt 3:2, der Dealer steht auf allen 17, Verdoppeln auf den ersten zwei Karten (auch nach dem Teilen), einmal Teilen,
// geteilte Asse bekommen je eine Karte, der Dealer schaut bei Ass/Zehn nach Blackjack (dann verliert man nur den Einsatz), keine Versicherung.
// Karten aus einem endlosen Schlitten (jede Karte gleich wahrscheinlich). Die Glückssträhne (luckFor 'karten', Wohnungs-Upgrade „Pokertisch“)
// wirkt nur auf die Karten des Dealers: mit Wahrscheinlichkeit |Glück − 1| · LUCK_BJ werden zwei Karten gezogen und der Dealer bekommt
// bei Glück > 1 die schlechtere, bei Glück < 1 die bessere. Die eigenen Karten bleiben fair, damit die Entscheidungen zählen.
// Der Host rechnet (bjDeal/bjAct), Mitspieler schicken nur die Aktion. Die Runde liegt im Spielstand (S.bj[wer]).
import { rng, luckFor, netWorth, levelFor } from './casinologic.js';

export const BJ_TABLES = [
  { id: 0, name: 'Tisch Smaragd', bets: [100, 200, 500, 1000, 2500] },
  { id: 1, name: 'Tisch Jade', bets: [100, 200, 500, 1000, 2500] },
  { id: 2, name: 'Tisch Onyx', bets: [500, 1000, 2500, 5000, 10000] },
  { id: 3, name: 'Teos Privattisch', bets: [2500, 5000, 10000, 25000, 50000] },
];
export const BJ_SEATS = 3; // Plätze je Tisch
export const LUCK_BJ = 0.55;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K']; const SUITS = ['♠', '♥', '♦', '♣'];
export const cardRank = (c) => c % 13; export const cardSuit = (c) => Math.floor(c / 13);
export const cardName = (c) => SUITS[cardSuit(c)] + RANKS[cardRank(c)];
export const cardValue = (c) => { const r = c % 13; return r === 0 ? 11 : r >= 9 ? 10 : r + 1; };
export const RANK_LABEL = RANKS; export const SUIT_LABEL = SUITS;
export function handValue(cards) { let t = 0; let aces = 0; for (const c of cards) { t += cardValue(c); if (c % 13 === 0) aces++; } while (t > 21 && aces) { t -= 10; aces--; } return { total: t, soft: aces > 0 && t <= 21 }; }
export const isBJ = (h) => h.cards.length === 2 && !h.split && handValue(h.cards).total === 21;
const draw = (R) => { const r = rng((R.seed ^ Math.imul(R.n + 1, 0x9E3779B1)) >>> 0); R.n++; r(); return Math.floor(r() * 52); };
// Karte für den Dealer, mit Glückssträhne (zweite Karte und alle Nachzieher)
function dealerScore(cards) { const v = handValue(cards); if (v.total > 21) return -10; if (v.total >= 17) return v.total + (cards.length === 2 && v.total === 21 ? 5 : 0); return v.soft ? 16.5 : 16; }
function dealerCard(R) {
  const a = draw(R); const p = Math.min(0.85, Math.abs((R.luck || 1) - 1) * LUCK_BJ); if (p <= 0) return a; const r = rng((R.seed ^ Math.imul(R.n + 7, 0x85EBCA6B)) >>> 0); r(); if (r() >= p) return a;
  const b = draw(R); const sa = dealerScore([...R.dealer, a]); const sb = dealerScore([...R.dealer, b]); if (sa === sb) return a; const better = sa > sb ? a : b; const worse = sa > sb ? b : a; return R.luck > 1 ? worse : better;
}
const tableOf = (id) => BJ_TABLES[id | 0] || null;
export const bjRound = (S, who) => (S && S.bj && S.bj[who]) || null;
const stats = (S) => (S.bjStats = S.bjStats || { hands: 0, won: 0, bj: 0, best: 0, doubleWins: 0 });

export function bjDeal(S, who, table, bet, seed) {
  const T = tableOf(table); if (!T) return { ok: false, why: 'Diesen Tisch gibt es nicht.' }; S.bj = S.bj || {};
  const cur = S.bj[who]; if (cur && cur.phase === 'player') return { ok: false, why: 'Die Runde läuft noch.' };
  if (!T.bets.includes(bet)) return { ok: false, why: 'Dieser Einsatz geht an diesem Tisch nicht.' }; if (S.purse < bet) return { ok: false, why: 'Die Familienkasse reicht nicht.' };
  S.purse -= bet; S.spent = (S.spent || 0) + bet;
  const R = { table: T.id, seed: seed >>> 0, n: 0, luck: luckFor(S, 'karten'), hands: [{ cards: [], bet, done: false, doubled: false, split: false }], cur: 0, dealer: [], phase: 'player', hole: true, win: 0, res: null };
  R.hands[0].cards.push(draw(R)); R.dealer.push(draw(R)); R.hands[0].cards.push(draw(R)); R.dealer.push(dealerCard(R));
  const dBJ = handValue(R.dealer).total === 21; const pBJ = isBJ(R.hands[0]);
  if (dBJ || pBJ) { R.hands[0].done = true; R.hole = false; finish(S, R); } S.bj[who] = R; return { ok: true, R, level: lvl(S) };
}
export function bjCan(R) {
  if (!R || R.phase !== 'player') return {}; const h = R.hands[R.cur]; if (!h || h.done) return {}; const two = h.cards.length === 2;
  return { hit: true, stand: true, double: two, split: two && R.hands.length === 1 && cardValue(h.cards[0]) === cardValue(h.cards[1]) };
}
export function bjAct(S, who, act) {
  const R = bjRound(S, who); if (!R || R.phase !== 'player') return { ok: false, why: 'Gerade läuft keine Runde.' }; const h = R.hands[R.cur]; const can = bjCan(R);
  if (!can[act]) return { ok: false, why: act === 'split' ? 'Teilen geht nur mit zwei gleichen Karten (einmal pro Runde).' : act === 'double' ? 'Verdoppeln geht nur auf den ersten zwei Karten.' : 'Das geht gerade nicht.' };
  if (act === 'hit') { h.cards.push(draw(R)); if (handValue(h.cards).total >= 21) h.done = true; }
  else if (act === 'stand') h.done = true;
  else if (act === 'double') { if (S.purse < h.bet) return { ok: false, why: 'Für das Verdoppeln reicht die Familienkasse nicht.' }; S.purse -= h.bet; S.spent = (S.spent || 0) + h.bet; h.bet *= 2; h.doubled = true; h.cards.push(draw(R)); h.done = true; }
  else if (act === 'split') { if (S.purse < h.bet) return { ok: false, why: 'Für das Teilen reicht die Familienkasse nicht.' }; S.purse -= h.bet; S.spent = (S.spent || 0) + h.bet; const c2 = h.cards.pop(); const h2 = { cards: [c2], bet: h.bet, done: false, doubled: false, split: true }; h.split = true; R.hands.push(h2);
    const aces = h.cards[0] % 13 === 0; h.cards.push(draw(R)); h2.cards.push(draw(R)); if (aces) { h.done = true; h2.done = true; } else { if (handValue(h.cards).total === 21) h.done = true; if (handValue(h2.cards).total === 21) h2.done = true; } }
  while (R.cur < R.hands.length && R.hands[R.cur].done) R.cur++;
  if (R.cur >= R.hands.length) { R.cur = R.hands.length - 1; R.hole = false; if (R.hands.some((x) => handValue(x.cards).total <= 21)) while (handValue(R.dealer).total < 17) R.dealer.push(dealerCard(R)); finish(S, R); }
  return { ok: true, R, level: lvl(S) };
}
function finish(S, R) {
  const d = handValue(R.dealer).total; const dBJ = R.dealer.length === 2 && d === 21; let win = 0; const st = stats(S);
  for (const h of R.hands) {
    const p = handValue(h.cards).total; let res; let pay = 0;
    if (isBJ(h)) { res = dBJ ? 'push' : 'bj'; pay = dBJ ? h.bet : Math.round(h.bet * 2.5); }
    else if (p > 21) { res = 'bust'; } else if (dBJ) { res = 'lose'; } else if (d > 21 || p > d) { res = 'win'; pay = h.bet * 2; } else if (p === d) { res = 'push'; pay = h.bet; } else res = 'lose';
    h.res = res; h.win = pay; win += pay; st.hands++; if (res === 'bj') st.bj++; if (h.doubled && res === 'win') st.doubleWins++;
  }
  R.win = win; R.phase = 'done'; S.purse += win; S.won = (S.won || 0) + win; st.won += win; st.best = Math.max(st.best, win); R.lv0 = S.level;
}
function lvl(S) { const before = S.level; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak); return S.level > before ? S.level : 0; }

// Teos Tipp: Grundstrategie (Dealer steht auf 17, Verdoppeln nach Teilen erlaubt)
export function bjHint(R) {
  const can = bjCan(R); if (!can.hit) return null; const h = R.hands[R.cur]; const up = cardValue(R.dealer[0]); const v = handValue(h.cards); const t = v.total;
  const dbl = (cond, alt) => (cond ? (can.double ? 'double' : alt) : null);
  if (can.split) { const a = cardValue(h.cards[0]);
    if (a === 11 || a === 8) return 'split'; if (a === 9 && ![7, 10, 11].includes(up)) return 'split'; if (a === 7 && up <= 7) return 'split'; if (a === 6 && up <= 6) return 'split'; if (a === 4 && (up === 5 || up === 6)) return 'split'; if ((a === 2 || a === 3) && up <= 7) return 'split'; }
  if (v.soft) {
    if (t >= 20) return 'stand'; if (t === 19) return dbl(up === 6, 'stand') || 'stand';
    if (t === 18) return dbl(up >= 3 && up <= 6, 'stand') || (up >= 9 ? 'hit' : 'stand');
    if (t === 17) return dbl(up >= 3 && up <= 6, 'hit') || 'hit'; if (t >= 15) return dbl(up >= 4 && up <= 6, 'hit') || 'hit'; return dbl(up === 5 || up === 6, 'hit') || 'hit';
  }
  if (t >= 17) return 'stand'; if (t >= 13) return up <= 6 ? 'stand' : 'hit'; if (t === 12) return up >= 4 && up <= 6 ? 'stand' : 'hit';
  if (t === 11) return dbl(up <= 10, 'hit') || 'hit'; if (t === 10) return dbl(up <= 9, 'hit') || 'hit'; if (t === 9) return dbl(up >= 3 && up <= 6, 'hit') || 'hit'; return 'hit';
}
export const HINT_TEXT = { hit: 'Karte ziehen', stand: 'Stehen bleiben', double: 'Verdoppeln', split: 'Teilen' };
