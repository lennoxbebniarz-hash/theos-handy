// Theos Seitenscheidel - Dreierschach: Regeln ohne Oberfläche. 96 Felder: jeder Spieler hat eine Hälfte aus 8 Linien (f) und 4 Reihen (r, 0 = Grundreihe).
// Die sechs inneren Felder (f 3/4, r 3) bilden die Rosette. Gerade Züge verlassen ein Feld immer durch die gegenüberliegende Kante, Diagonalen durch die gegenüberliegende Ecke.
export const SEATS = ['Rot', 'Weiß', 'Schwarz'];
export const END_NAMES = { 1: 'Erstes Matt gewinnt', 2: 'Figuren erben', 3: 'Bis zum Letzten' };
export const END_TEXT = { 1: 'Das erste Matt beendet die Partie. Wer es setzt, gewinnt.', 2: 'Wer mattsetzt, übernimmt alle Figuren des Besiegten. Es geht weiter, bis nur noch einer übrig ist.', 3: 'Matte Spieler scheiden aus. Ihre Figuren bleiben eingefroren stehen und müssen geschlagen werden, um auf ihr Feld zu ziehen.' };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const BACK = 'rnbqkbnr';
const ORTH = [[0, 1], [0, -1], [1, 0], [-1, 0]]; const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const leftOf = (p) => (p + 1) % 3; const rightOf = (p) => (p + 2) % 3; // aus Sicht des Spielers: links sitzt der nächste im Uhrzeigersinn
export const idx = (p, f, r) => p * 32 + r * 8 + f;
export const cellOf = (i) => ({ p: Math.floor(i / 32), r: Math.floor((i % 32) / 8), f: i % 8 });
export const isLight = (i) => { const c = cellOf(i); return (c.f + c.r) % 2 === 1; };
export const isRosette = (i) => { const c = cellOf(i); return c.r === 3 && (c.f === 3 || c.f === 4); };
const at = (p, f, r, df, dr) => ({ p, f, r, df, dr });
const start = (i, d) => { const c = cellOf(i); return at(c.p, c.f, c.r, d[0], d[1]); };

// Ein gerader Schritt. Über die Mittellinie geht es auf die Nachbarhälfte, deren Rahmen ist um 180° gedreht.
function orth(s) {
  const nf = s.f + s.df; const nr = s.r + s.dr; if (nf < 0 || nf > 7 || nr < 0) return null;
  if (nr > 3) return at(s.f <= 3 ? leftOf(s.p) : rightOf(s.p), 7 - s.f, 3, -s.df, -s.dr);
  return at(s.p, nf, nr, s.df, s.dr);
}
// Ein diagonaler Schritt. Durch den Mittelpunkt gabelt er sich auf beide Rosettenfelder gleicher Farbe und läuft durch deren gegenüberliegende Ecke weiter.
function diag(s) {
  const nf = s.f + s.df; const nr = s.r + s.dr; if (nf < 0 || nf > 7 || nr < 0) return [];
  if (nr <= 3) return [at(s.p, nf, nr, s.df, s.dr)];
  if ((s.f === 3 && s.df === 1) || (s.f === 4 && s.df === -1)) { const out = s.f === 3 ? -1 : 1; return [rightOf(s.p), leftOf(s.p)].map((q) => at(q, s.f, 3, out, -1)); }
  return [at(nf <= 3 ? leftOf(s.p) : rightOf(s.p), 7 - nf, 3, -s.df, -s.dr)];
}
const cellAt = (s) => idx(s.p, s.f, s.r);
const turn = (s, side) => at(s.p, s.f, s.r, side * s.dr, -side * s.df);

function slide(S, s, step, out) { for (const n of step(s)) { const c = cellAt(n); out.push(c); if (!S.b[c]) slide(S, n, step, out); } }
const orthList = (s) => { const n = orth(s); return n ? [n] : []; };
function knight(i) {
  const out = new Set();
  for (const d of ORTH) {
    const a = orth(start(i, d)); if (!a) continue; const b = orth(a);
    for (const side of [1, -1]) {
      if (b) { const t = orth(turn(b, side)); if (t) out.add(cellAt(t)); }
      const c = orth(turn(a, side)); const e = c && orth(c); if (e) out.add(cellAt(e));
    }
  }
  return [...out];
}
const pawnDir = (pc, p) => (p === pc.h ? 1 : -1);
function pawnHits(i, pc) { const c = cellOf(i); const dr = pawnDir(pc, c.p); return [-1, 1].flatMap((df) => diag(at(c.p, c.f, c.r, df, dr)).map(cellAt)); }
// Alle Felder, die eine Figur bedroht
export function attacks(S, i) {
  const pc = S.b[i]; if (!pc) return []; const out = [];
  if (pc.k === 'p') return pawnHits(i, pc);
  if (pc.k === 'n') return knight(i);
  if (pc.k === 'k') { for (const d of ORTH) { const n = orth(start(i, d)); if (n) out.push(cellAt(n)); } for (const d of DIAG) for (const n of diag(start(i, d))) out.push(cellAt(n)); return out; }
  if (pc.k !== 'b') for (const d of ORTH) slide(S, start(i, d), orthList, out);
  if (pc.k !== 'r') for (const d of DIAG) slide(S, start(i, d), diag, out);
  return out;
}
const kingCell = (S, x) => S.b.findIndex((pc) => pc && pc.k === 'k' && pc.o === x);
const attackers = (S, cell, x) => { const r = new Set(); S.b.forEach((pc, i) => { if (pc && pc.o !== x && S.alive[pc.o] && attacks(S, i).includes(cell)) r.add(pc.o); }); return [...r]; };
export const inCheck = (S, x) => { const k = kingCell(S, x); return k >= 0 && attackers(S, k, x).length > 0; };

// Züge ohne Rücksicht auf den eigenen König
export function pseudo(S, i) {
  const pc = S.b[i]; if (!pc) return []; const c = cellOf(i); const moves = [];
  const add = (to, extra) => { const t = cellOf(to); moves.push({ from: i, to, ...(pc.k === 'p' && t.r === 0 && t.p !== pc.h ? { promo: true } : {}), ...extra }); };
  if (pc.k === 'p') {
    const dr = pawnDir(pc, c.p); const one = orth(at(c.p, c.f, c.r, 0, dr));
    if (one && !S.b[cellAt(one)]) { add(cellAt(one)); if (c.p === pc.h && c.r === 1) { const two = orth(one); if (two && !S.b[cellAt(two)]) add(cellAt(two), { pass: cellAt(one) }); } }
    for (const to of pawnHits(i, pc)) { const v = S.b[to]; if (v) { if (v.o !== pc.o) add(to); continue; } for (let q = 0; q < 3; q++) { const e = S.ep[q]; if (q !== pc.o && e && e.cell === to && S.b[e.pawn] && S.b[e.pawn].o !== pc.o) add(to, { ep: e.pawn }); } }
    return moves;
  }
  for (const to of new Set(attacks(S, i))) { const v = S.b[to]; if (!v || v.o !== pc.o) add(to); }
  return moves;
}
function castles(S, x) {
  const k = idx(x, 4, 0); const pc = S.b[k]; if (!pc || pc.k !== 'k' || pc.o !== x || pc.h !== x || pc.m || inCheck(S, x)) return [];
  const out = [];
  for (const [rookF, kingTo, walk, empty] of [[7, 6, [5, 6], [5, 6]], [0, 2, [3, 2], [1, 2, 3]]]) {
    const rf = idx(x, rookF, 0); const r = S.b[rf]; if (!r || r.k !== 'r' || r.o !== x || r.m) continue;
    if (empty.some((f) => S.b[idx(x, f, 0)]) || walk.some((f) => attackers(S, idx(x, f, 0), x).length)) continue;
    out.push({ from: k, to: idx(x, kingTo, 0), rook: [rf, idx(x, kingTo === 6 ? 5 : 3, 0)] });
  }
  return out;
}
function place(S, m) {
  const pc = S.b[m.from]; const taken = S.b[m.to]; const b = S.b.slice(); b[m.from] = null; b[m.to] = { ...pc, m: 1, ...(m.promo ? { k: m.kind || 'q' } : {}) };
  if (m.ep !== undefined) b[m.ep] = null;
  if (m.rook) { b[m.rook[1]] = { ...b[m.rook[0]], m: 1 }; b[m.rook[0]] = null; }
  const ep = S.ep.slice(); ep[pc.o] = m.pass !== undefined ? { cell: m.pass, pawn: m.to } : null;
  return { ...S, b, ep, _taken: taken || (m.ep !== undefined ? S.b[m.ep] : null), _moved: pc };
}
export function legal(S, x = S.turn) {
  const out = [];
  S.b.forEach((pc, i) => { if (pc && pc.o === x) for (const m of pseudo(S, i)) if (!inCheck(place(S, m), x)) out.push(m); });
  return out.concat(castles(S, x).filter((m) => !inCheck(place(S, m), x)));
}
export function newGame(end = 2) {
  const b = new Array(96).fill(null);
  for (let p = 0; p < 3; p++) for (let f = 0; f < 8; f++) { b[idx(p, f, 0)] = { k: BACK[f], o: p, h: p }; b[idx(p, f, 1)] = { k: 'p', o: p, h: p }; }
  return { b, turn: 0, alive: [true, true, true], end, ep: [null, null, null], winner: null, idle: 0, last: null, checks: [false, false, false], note: '', ply: 0 };
}
function eliminate(S, x, by) {
  S.alive[x] = false;
  if (S.end === 2) S.b = S.b.map((pc) => (!pc || pc.o !== x ? pc : pc.k === 'k' ? null : { ...pc, o: by }));
  S.note = SEATS[x] + ' ist matt. ' + (S.end === 1 ? '' : S.end === 2 ? SEATS[by] + ' übernimmt die Figuren.' : 'Die Figuren bleiben eingefroren stehen.');
}
function advance(S, mover) {
  S.note = ''; let passes = 0; let t = mover;
  for (;;) {
    const living = S.alive.filter(Boolean).length;
    if (living === 1) { S.winner = S.alive.indexOf(true); S.turn = S.winner; break; }
    if (S.idle >= 150 || !S.b.some((pc) => pc && pc.k !== 'k' && S.alive[pc.o])) { S.winner = -1; S.note = 'Remis: Niemand kann die Partie mehr entscheiden.'; S.turn = t; break; }
    t = (t + 1) % 3; if (!S.alive[t]) continue;
    S.turn = t; if (legal(S, t).length) break;
    if (inCheck(S, t)) {
      const hit = attackers(S, kingCell(S, t), t); const by = hit.includes(mover) ? mover : hit[0];
      eliminate(S, t, by); if (S.end === 1) { S.winner = by; break; } passes = 0; continue;
    }
    S.note = SEATS[t] + ' kann nicht ziehen und setzt aus.';
    if (++passes >= living) { S.winner = -1; S.note = 'Remis: Niemand kann mehr ziehen.'; break; }
  }
  S.checks = [0, 1, 2].map((x) => S.alive[x] && inCheck(S, x));
}
// Spielt einen geprüften Zug und gibt den neuen Stand zurück; null bei ungültigem Zug
export function play(S, from, to, kind) {
  if (S.winner !== null) return null; const m = legal(S).find((q) => q.from === from && q.to === to); if (!m) return null;
  const n = place(S, { ...m, kind: 'qrbn'.includes(kind || '-') ? kind : 'q' }); const taken = n._taken; const moved = n._moved; delete n._taken; delete n._moved;
  n.alive = S.alive.slice(); n.idle = taken || moved.k === 'p' ? 0 : S.idle + 1; n.ply = S.ply + 1; n.last = { from, to, by: moved.o, taken: !!taken }; n.winner = null;
  advance(n, moved.o); return n;
}
// Einfache KI: schlägt gern, gibt ungern Figuren her, setzt Schach
export function bestMove(S, rnd = Math.random) {
  let best = null; let score = -Infinity; const x = S.turn;
  for (const m of legal(S, x)) {
    const n = place(S, { ...m, kind: 'q' }); let v = rnd() * 0.6; const pc = S.b[m.from];
    if (n._taken) v += VALUE[n._taken.k] * (S.alive[n._taken.o] ? 1 : 0.25); if (m.promo) v += 8;
    if (attackers(n, m.to, x).length) v -= VALUE[pc.k] * 0.85 || 2;
    for (let q = 0; q < 3; q++) if (q !== x && S.alive[q] && inCheck(n, q)) v += 0.7;
    if (pc.k === 'p') v += 0.15; if (v > score) { score = v; best = m; }
  }
  return best;
}
