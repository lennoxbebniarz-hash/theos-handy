// Theos Seitenscheidel - Schiffe versenken zu dritt: Regeln ohne Oberfläche. Jeder hat ein Meer aus 10x10 Feldern (Zelle = y*10+x).
// Pro Zug ein Schuss auf einen der beiden Gegner, Treffer geben Nachschuss (höchstens 3 Schüsse). Alle sehen alle Schüsse, wer ein Schiff versenkt, bekommt ein Radar, dessen Ergebnis nur er sieht.
export const SIZE = 10; export const FLEET = [5, 4, 3, 3, 2]; export const MAX_SHOTS = 3;
export const SEATS = ['Rot', 'Blau', 'Gelb'];
const clone = (x) => JSON.parse(JSON.stringify(x));
const near = (c) => { const x = c % 10; const y = Math.floor(c / 10); const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const a = x + dx; const b = y + dy; if (a >= 0 && a < 10 && b >= 0 && b < 10) out.push(b * 10 + a); } return out; };
export const shipCells = (x, y, len, down) => { const out = []; for (let i = 0; i < len; i++) { const a = down ? x : x + i; const b = down ? y + i : y; if (a < 0 || a > 9 || b < 0 || b > 9) return null; out.push(b * 10 + a); } return out; };
// Schiffe dürfen sich auch über Eck nicht berühren
export function canPlace(ships, cells) { if (!cells) return false; const taken = new Set(ships.flatMap((s) => s.cells)); return !cells.some((c) => near(c).some((n) => taken.has(n))); }
export function validFleet(cells) {
  if (!Array.isArray(cells) || cells.length !== FLEET.length) return false; const lens = cells.map((c) => (Array.isArray(c) ? c.length : 0)).sort((a, b) => b - a); if (lens.some((l, i) => l !== FLEET[i])) return false;
  const placed = [];
  for (const c of cells) { if (c.some((q) => !Number.isInteger(q) || q < 0 || q > 99)) return false; const s = [...c].sort((a, b) => a - b); const stepSize = s[1] - s[0]; if (stepSize !== 1 && stepSize !== 10) return false; if (s.some((q, i) => i && (q - s[i - 1] !== stepSize || (stepSize === 1 && Math.floor(q / 10) !== Math.floor(s[0] / 10))))) return false; if (!canPlace(placed, s)) return false; placed.push({ cells: s }); }
  return true;
}
export function randomFleet(rnd = Math.random) {
  for (;;) { const ships = []; let ok = true; for (const len of FLEET) { let done = false; for (let t = 0; t < 200 && !done; t++) { const c = shipCells(Math.floor(rnd() * 10), Math.floor(rnd() * 10), len, rnd() < 0.5); if (canPlace(ships, c)) { ships.push({ cells: c }); done = true; } } if (!done) { ok = false; break; } } if (ok) return ships.map((s) => s.cells); }
}
export const newGame = () => ({ phase: 'place', fleets: [null, null, null], shots: [[], [], []].map(() => new Array(100).fill(0)), turn: 0, used: 0, radar: [0, 0, 0], alive: [true, true, true], winner: null, last: null, note: '', scans: [[], [], []], ply: 0 });
export function setFleet(S0, seat, cells) {
  if (S0.phase !== 'place' || S0.fleets[seat] || !validFleet(cells)) return null; const S = clone(S0); S.fleets[seat] = cells.map((c) => ({ cells: [...c], sunk: false }));
  if (S.fleets.every(Boolean)) { S.phase = 'play'; S.note = SEATS[0] + ' beginnt.'; } return S;
}
function next(S) { let t = S.turn; do t = (t + 1) % 3; while (!S.alive[t]); S.turn = t; S.used = 0; }
export function shoot(S0, by, target, cell) {
  if (S0.phase !== 'play' || by !== S0.turn || target === by || !S0.alive[target] || !Number.isInteger(cell) || cell < 0 || cell > 99 || S0.shots[target][cell]) return null;
  const S = clone(S0); S.ply++; S.used++; const ship = S.fleets[target].find((q) => q.cells.includes(cell)); S.shots[target][cell] = ship ? 2 : 1; let res = 'miss';
  if (ship) { res = 'hit'; if (ship.cells.every((c) => S.shots[target][c] === 2)) { ship.sunk = true; res = 'sunk'; S.radar[by]++; } }
  S.note = SEATS[by] + (res === 'miss' ? ' schießt daneben.' : res === 'hit' ? ' trifft ' + SEATS[target] + '!' : ' versenkt ein Schiff von ' + SEATS[target] + ' und bekommt ein Radar!');
  if (S.fleets[target].every((q) => q.sunk)) { S.alive[target] = false; S.note = SEATS[target] + ' ist untergegangen, ' + SEATS[by] + ' setzt den letzten Treffer.'; }
  S.last = { target, cell, res, by };
  const left = [0, 1, 2].filter((q) => S.alive[q]); if (left.length === 1) { S.winner = left[0]; S.phase = 'over'; return S; }
  if (res === 'miss' || S.used >= MAX_SHOTS) next(S); return S;
}
// Radar: zählt unversehrte Schiffsfelder in 3x3 Feldern. Kostet keinen Schuss, das Ergebnis sieht nur der Schütze.
export function scan(S0, by, target, cell) {
  if (S0.phase !== 'play' || by !== S0.turn || target === by || !S0.alive[target] || S0.radar[by] < 1 || !Number.isInteger(cell) || cell < 0 || cell > 99) return null;
  const S = clone(S0); const area = near(cell); const live = new Set(S.fleets[target].flatMap((q) => q.cells)); S.radar[by]--; S.scans[by].push({ target, cell, n: area.filter((c) => live.has(c) && S.shots[target][c] !== 2).length }); return S;
}
// Was ein Spieler wissen darf: eigene Flotte, versenkte Schiffe, alle Schüsse, eigene Radarbilder
export function redact(S, seat) {
  const v = clone(S); if (S.phase === 'over') return v;
  v.placed = S.fleets.map(Boolean); v.fleets = S.fleets.map((f, i) => (i === seat ? f : f ? f.filter((q) => q.sunk) : null)); v.scans = S.scans.map((l, i) => (i === seat ? l : [])); return v;
}
// KI: spielt nur mit dem, was sie laut redact wissen darf
export function botShot(v, seat, rnd = Math.random) {
  const foes = [0, 1, 2].filter((q) => q !== seat && v.alive[q]); const free = (t, c) => { if (v.shots[t][c]) return false; return !(v.fleets[t] || []).some((q) => q.cells.some((s) => near(s).includes(c))); };
  const line = []; for (const t of foes) { const sunk = new Set((v.fleets[t] || []).flatMap((q) => q.cells)); const hits = v.shots[t].flatMap((m, c) => (m === 2 && !sunk.has(c) ? [c] : [])); for (const c of hits) { const x = c % 10; const y = Math.floor(c / 10); const opts = []; if (x > 0) opts.push(c - 1); if (x < 9) opts.push(c + 1); if (y > 0) opts.push(c - 10); if (y < 9) opts.push(c + 10); for (const n of opts) if (free(t, n)) { const pair = hits.includes(c + (c - n)) ? 3 : 1; line.push({ t, c: n, w: pair + rnd() }); } } }
  if (line.length) { const b = line.reduce((a, q) => (q.w > a.w ? q : a)); return { target: b.t, cell: b.c }; }
  const all = foes.flatMap((t) => v.shots[t].flatMap((_, c) => (free(t, c) && (c % 10 + Math.floor(c / 10)) % 2 === 0 ? [{ t, c }] : []))); const pool = all.length ? all : foes.flatMap((t) => v.shots[t].flatMap((_, c) => (free(t, c) || !v.shots[t][c] ? [{ t, c }] : []))); const q = pool[Math.floor(rnd() * pool.length)]; return { target: q.t, cell: q.c };
}
