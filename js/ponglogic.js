// Theos Seitenscheidel - Quadrat-Pong: Regeln ohne Oberfläche. Vier Seiten, drei Spieler (0-2) und die unbesiegbare KI (3). Alles liegt im Einheitsquadrat, y wächst nach unten.
// Jede Seite hat eine eigene Koordinate a (0-1), die aus Sicht des Spielers nach rechts wächst. Wer keine Leben mehr hat, wird zur Wand.
export const PAD = 0.2; export const DEPTH = 0.035; export const BALL = 0.016; export const CORNER = 0.07; export const AI = 3; export const LIVES = 5;
export const PAD_SPEED = 1.15; const AI_SPEED = 1.9; const START_SPEED = 0.52; const MAX_SPEED = 1.3;
const N = [[0, -1], [1, 0], [0, 1], [-1, 0]]; const T = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export const along = (s, x, y) => [x, y, 1 - x, 1 - y][s];
export const depth = (s, x, y) => [1 - y, x, y, 1 - x][s];
export const sidePoint = (s, a, d = 0) => [[a, 1 - d], [d, a], [1 - a, d], [1 - d, 1 - a]][s];
export const clampPad = (p) => Math.min(1 - CORNER - PAD / 2, Math.max(CORNER + PAD / 2, p));
const fold = (v) => { const m = ((v % 2) + 2) % 2; return m > 1 ? 2 - m : m; };
const headingTo = (S, s) => S.vx * N[s][0] + S.vy * N[s][1] < 0;
const living = (S) => [0, 1, 2].filter((s) => S.alive[s]);

function serve(S, rnd) {
  const list = living(S); const t = list[Math.floor(rnd() * list.length)]; const a = (15 + rnd() * 25) * (rnd() < 0.5 ? -1 : 1) * Math.PI / 180;
  const dx = -N[t][0]; const dy = -N[t][1]; S.x = 0.5; S.y = 0.5; S.speed = START_SPEED; S.vx = (dx * Math.cos(a) - dy * Math.sin(a)) * S.speed; S.vy = (dx * Math.sin(a) + dy * Math.cos(a)) * S.speed; S.hold = 1.2;
}
export function newMatch(human = [true, true, true], rnd = Math.random) {
  const S = { p: [0.5, 0.5, 0.5, 0.5], lives: [LIVES, LIVES, LIVES, null], alive: [true, true, true, true], human, x: 0.5, y: 0.5, vx: 0, vy: 0, speed: START_SPEED, hold: 1.2, winner: null, lost: -1, flash: 0, err: [0, 0, 0], aiNext: 0, hits: 0, aiOff: 0 };
  serve(S, rnd); return S;
}
// Wo der Ball die Seite trifft (ohne Rücksicht auf andere Schläger, Wände spiegeln)
export function predict(S, s) {
  if (!headingTo(S, s)) return 0.5; const speed = Math.abs(S.vx * N[s][0] + S.vy * N[s][1]); const t = (depth(s, S.x, S.y) - DEPTH) / Math.max(speed, 0.01);
  return along(s, fold(S.x + S.vx * t), fold(S.y + S.vy * t));
}
export function movePad(S, s, dir, dt, speed = PAD_SPEED) { S.p[s] = clampPad(S.p[s] + Math.max(-1, Math.min(1, dir)) * speed * dt); }
// Einfacher Mitspieler-Ersatz: reagiert spät und zielt ungenau, kann also verlieren
export function botDir(S, s) {
  if (!headingTo(S, s) || depth(s, S.x, S.y) > 0.72) return Math.abs(S.p[s] - 0.5) < 0.03 ? 0 : Math.sign(0.5 - S.p[s]) * 0.6;
  const d = predict(S, s) + S.err[s] - S.p[s]; return Math.abs(d) < 0.015 ? 0 : Math.sign(d) * 0.8;
}
function setDir(S, nx, ny) { const l = Math.hypot(nx, ny) || 1; S.vx = nx / l * S.speed; S.vy = ny / l * S.speed; }
function keepMoving(S) { const min = S.speed * 0.28; for (const k of ['vx', 'vy']) if (Math.abs(S[k]) < min) S[k] = (S[k] < 0 ? -1 : 1) * min; setDir(S, S.vx, S.vy); } // nie endlos parallel zu einer Wand
function padHit(S, s, a, rnd) {
  S.hits++; S.speed = Math.min(MAX_SPEED, S.speed * 1.045); for (let q = 0; q < 3; q++) S.err[q] = (rnd() - 0.5) * (0.1 + 0.34 * S.speed / MAX_SPEED); const d = depth(s, S.x, S.y); const shift = DEPTH + BALL - d; S.x += N[s][0] * shift; S.y += N[s][1] * shift;
  if (s === AI) { S.aiOff = Math.max(S.aiOff, Math.abs(a - S.p[AI])); const list = living(S); const t = list[S.aiNext++ % list.length]; const q = sidePoint(t, 0.22 + rnd() * 0.56); setDir(S, q[0] - S.x, q[1] - S.y); return; } // zielt der Reihe nach auf jeden, damit es fair bleibt
  const off = Math.max(-1, Math.min(1, (a - S.p[s]) / (PAD / 2 + BALL))); const ang = off * 62 * Math.PI / 180; setDir(S, N[s][0] * Math.cos(ang) + T[s][0] * Math.sin(ang), N[s][1] * Math.cos(ang) + T[s][1] * Math.sin(ang)); keepMoving(S);
}
function goal(S, s, rnd) {
  S.lives[s]--; S.lost = s; S.flash = 0.7; if (S.lives[s] <= 0) S.alive[s] = false; const list = living(S);
  if (list.length === 1) { S.winner = list[0]; return; }
  if (!list.some((q) => S.human[q])) { S.winner = list.reduce((b, q) => (S.lives[q] > S.lives[b] ? q : b), list[0]); return; } // kein Mensch mehr dabei: die Partie endet hier
  serve(S, rnd);
}
export function step(S, dt, rnd = Math.random) {
  if (S.winner !== null) return; S.flash = Math.max(0, S.flash - dt);
  const aim = headingTo(S, AI) ? predict(S, AI) : 0.5; const d = aim - S.p[AI]; S.p[AI] = clampPad(S.p[AI] + Math.sign(d) * Math.min(Math.abs(d), AI_SPEED * dt));
  if (S.hold > 0) { S.hold -= dt; return; }
  const was = [0, 1, 2, 3].map((s) => depth(s, S.x, S.y)); S.x += S.vx * dt; S.y += S.vy * dt;
  for (let s = 0; s < 4; s++) {
    const dn = depth(s, S.x, S.y); const a = along(s, S.x, S.y); const wall = !S.alive[s] || a < CORNER || a > 1 - CORNER; const plane = DEPTH + BALL;
    if (!headingTo(S, s)) continue;
    if (!wall && dn < plane && (s === AI || (was[s] >= plane && Math.abs(a - S.p[s]) <= PAD / 2 + BALL))) { padHit(S, s, a, rnd); continue; }
    if (wall && dn < BALL) { const dot = S.vx * N[s][0] + S.vy * N[s][1]; S.vx -= 2 * dot * N[s][0]; S.vy -= 2 * dot * N[s][1]; S.x += N[s][0] * (BALL - dn); S.y += N[s][1] * (BALL - dn); keepMoving(S); continue; }
    if (dn < -BALL) { goal(S, s, rnd); return; }
  }
}
