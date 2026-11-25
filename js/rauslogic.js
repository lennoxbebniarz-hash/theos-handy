// Theos Seitenscheidel - Raus mit dir!: Regeln ohne Oberfläche. Laufweg aus 30 Feldern, je 10 pro Spieler, drei gleiche Arme. Figur-Position relativ zum Spieler: -1 Haus, 0 Startfeld, 29 letztes Feld vor dem Ziel, 30-33 Zielfelder.
export const SEATS = ['Rot', 'Blau', 'Gelb'];
export const TRACK = 30; export const LAST = 29; export const GOAL0 = 30; export const GOAL_END = 33; export const OUT = 6;
const START = [0, 10, 20]; const TIP = 4.577; const CORNER = 0.577;
export const absolute = (seat, pos) => (START[seat] + pos) % TRACK;
// Geometrie: Arm 0 zeigt nach oben, jeder weitere ist um 120 Grad im Uhrzeigersinn gedreht
const onArm = (k, x, y) => { const a = k * 2 * Math.PI / 3; const c = Math.cos(a); const s = Math.sin(a); return { x: x * c + y * s, y: -x * s + y * c }; };
export function trackXY(i) { const k = Math.floor(i / 10); const r = i % 10; const n = (k + 1) % 3; if (r <= 3) return onArm(k, 1, TIP - r); if (r === 4) return onArm(k, 1, CORNER); if (r <= 8) return onArm(n, -1, CORNER + r - 4); return onArm(n, 0, TIP); }
export const goalXY = (seat, g) => onArm(seat, 0, TIP - 1 - g);
export function houseXY(seat, n) { const c = onArm(seat, 4.07, 2.35); return { x: c.x + (n % 2 ? 0.62 : -0.62), y: c.y + (n < 2 ? 0.62 : -0.62) }; }
export const posXY = (seat, pos, n) => (pos < 0 ? houseXY(seat, n) : pos <= LAST ? trackXY(absolute(seat, pos)) : goalXY(seat, pos - GOAL0));
// Felder, die eine Figur beim Zug nacheinander betritt
export function pathOf(seat, from, to, n) { if (from < 0) return [posXY(seat, 0, n)]; const out = []; for (let p = from + 1; p <= to; p++) out.push(posXY(seat, p, n)); return out; }

export function newGame(names) { return { names: names.slice(0, 3), phase: 'open', turn: 0, pieces: [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]], open: [null, null, null], openWho: [0, 1, 2], die: null, tries: 0, winner: null, rev: 0, evId: 0, ev: null }; }
const goalTight = (P) => { const g = P.filter((q) => q >= GOAL0).sort((a, b) => b - a); return g.every((q, i) => q === GOAL_END - i); };
// Drei Versuche, wenn keine Figur mehr ziehen kann, egal welche Zahl kommt: alle im Haus oder schon ganz hinten im Ziel
export const triesAllowed = (S, seat) => { const P = S.pieces[seat]; return !P.some((q) => q >= 0 && q <= LAST) && goalTight(P) ? 3 : 1; };
function captureAt(S, seat, to) { if (to > LAST) return null; const a = absolute(seat, to); for (let q = 0; q < 3; q++) { if (q === seat) continue; const i = S.pieces[q].findIndex((p) => p >= 0 && p <= LAST && absolute(q, p) === a); if (i >= 0) return { seat: q, piece: i }; } return null; }
export function moves(S, seat, v = S.die) {
  const P = S.pieces[seat]; const out = []; let house = false;
  P.forEach((pos, piece) => {
    if (pos < 0) { if (v === OUT && !house && !P.includes(0)) { house = true; out.push({ piece, from: -1, to: 0, cap: captureAt(S, seat, 0) }); } return; }
    const to = pos + v; if (to > GOAL_END || P.includes(to)) return; if (to >= GOAL0) for (let g = Math.max(pos + 1, GOAL0); g < to; g++) if (P.includes(g)) return; // im Ziel wird nicht übersprungen
    out.push({ piece, from: pos, to, cap: captureAt(S, seat, to) });
  });
  return out;
}
const next = (S) => { S.turn = (S.turn + 1) % 3; S.tries = 0; S.phase = 'roll'; };
function rollOpen(S, seat, v) {
  S.open[seat] = v; S.ev = { k: 'open', seat, v, id: ++S.evId }; const left = S.openWho.filter((q) => S.open[q] === null); if (left.length) { S.turn = left.find((q) => q > seat) ?? left[0]; return; }
  const best = Math.max(...S.openWho.map((q) => S.open[q])); const tied = S.openWho.filter((q) => S.open[q] === best);
  if (tied.length === 1) { S.turn = tied[0]; S.phase = 'roll'; S.tries = 0; S.die = null; S.ev.starter = tied[0]; return; }
  S.openWho = tied; for (const q of tied) S.open[q] = null; S.turn = tied[0]; S.ev.tie = tied;
}
// Würfeln: nur wer dran ist und gerade würfeln darf. Rückgabe true, wenn der Zug gültig war
export function roll(S, seat, rnd = Math.random) {
  if (S.turn !== seat || (S.phase !== 'open' && S.phase !== 'roll')) return false; const v = 1 + Math.floor(rnd() * 6); S.die = v; S.rev++;
  if (S.phase === 'open') { rollOpen(S, seat, v); return true; }
  const list = moves(S, seat, v); S.ev = { k: 'roll', seat, v, id: ++S.evId, options: list.length };
  if (list.length) { S.phase = 'move'; return true; }
  if (v === OUT) { S.tries = 0; S.ev.again = true; return true; } const allowed = triesAllowed(S, seat); S.tries++; if (S.tries < allowed) { S.ev.retry = allowed - S.tries; return true; } next(S); S.ev.pass = true; return true;
}
export function move(S, seat, piece) {
  if (S.turn !== seat || S.phase !== 'move') return false; const m = moves(S, seat).find((q) => q.piece === piece); if (!m) return false; S.rev++; S.pieces[seat][piece] = m.to; if (m.cap) S.pieces[m.cap.seat][m.cap.piece] = -1; S.ev = { k: 'move', seat, piece, from: m.from, to: m.to, cap: m.cap, id: ++S.evId };
  if (S.pieces[seat].every((q) => q >= GOAL0)) { S.winner = seat; S.phase = 'over'; S.ev.win = true; return true; } if (S.die === OUT) { S.phase = 'roll'; S.tries = 0; S.ev.again = true; return true; } next(S); return true;
}
export function again(S) { if (S.phase !== 'over') return false; const rev = S.rev; const id = S.evId; const n = newGame(S.names); Object.assign(S, n, { rev: rev + 1, evId: id + 1, ev: { k: 'new', id: id + 1 } }); return true; }
