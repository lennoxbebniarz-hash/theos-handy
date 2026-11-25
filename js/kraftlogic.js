// Theos Seitenscheidel - Kraftprobe (intern kraft): Regeln ohne Oberfläche. Zehn Ziele nacheinander, drei Spieler schlagen gleichzeitig. Hämmern zieht den Kraftring zusammen, er wächst von selbst zurück. Nur wenn er genau auf dem Zielkreis liegt (grün), zerbricht das Ziel beim Zuschlagen.
export const SEATS = ['Rot', 'Blau', 'Gelb'];
export const AIM_TIME = 10; // Sekunden je Ziel
export const RING0 = 1; // Startgröße des Kraftrings
export const RT = 0.36; // Zielkreis
export const R_MIN = 0.04; export const R_MAX = 1.12;
export const INTRO = 3.2; export const SHOW = 3.6; // Ablauf je Ziel: Vorstellen, Zielen, Auswerten

// rate = Hämmern je Sekunde, das den Ring genau auf dem Zielkreis hält. tol = halbe Breite des grünen Bereichs. wob = wie weit der Zielkreis atmet.
export const TARGETS = [
  { id: 'latten', name: 'Fichtenlatten', blurb: 'Drei dünne Latten aus dem Holzweg-Sägewerk. Zum Aufwärmen.', rate: 2.6, tap: 0.075, tol: 0.09, wob: 0 },
  { id: 'bohle', name: 'Eichenbohle', blurb: 'Eine Handbreit Eiche. Die hält ein Rallyeauto aus.', rate: 3.4, tap: 0.07, tol: 0.08, wob: 0 },
  { id: 'ziegel', name: 'Dachziegel-Stapel', blurb: 'Fünf Ziegel vom Dach der Werkstatt. Bruno will sie eh nicht mehr.', rate: 4.2, tap: 0.066, tol: 0.072, wob: 0 },
  { id: 'eis', name: 'Eisblock', blurb: 'Klar wie Glas, hart wie Stein. Direkt aus der Kühlbox der Boxengasse.', rate: 5.0, tap: 0.062, tol: 0.066, wob: 0 },
  { id: 'pflaster', name: 'Pflastersteine', blurb: 'Drei Granitsteine vom Marktplatz. Hier braucht es echte Finger.', rate: 5.7, tap: 0.06, tol: 0.06, wob: 0.012 },
  { id: 'kohle', name: 'Glutkohle', blurb: 'Ein Brocken Kohle, innen noch glühend. Schnell und genau!', rate: 6.3, tap: 0.058, tol: 0.056, wob: 0.018 },
  { id: 'marmor', name: 'Marmorplatte', blurb: 'Weißer Marmor mit Goldader aus Brunos Villa.', rate: 6.9, tap: 0.056, tol: 0.052, wob: 0.022 },
  { id: 'scheibe', name: 'Bremsscheiben', blurb: 'Zwei Bremsscheiben aus Stahl, gerade noch rotglühend gefahren.', rate: 7.5, tap: 0.054, tol: 0.048, wob: 0.026 },
  { id: 'pokal', name: 'Brunos Goldpokal', blurb: 'Brunos ganzer Stolz. Er schaut lieber nicht hin.', rate: 8.1, tap: 0.052, tol: 0.044, wob: 0.03 },
  { id: 'mond', name: 'Mondgestein', blurb: 'Ein Brocken vom Mond, voller leuchtender Adern. Das letzte Ziel.', rate: 8.6, tap: 0.05, tol: 0.04, wob: 0.034 },
];
export const COUNT = TARGETS.length;
export const grow = (T) => T.rate * T.tap; // Wachstum je Sekunde
export const ringTarget = (T, t) => RT + T.wob * Math.sin(t * 2.3) + T.wob * 0.5 * Math.sin(t * 5.1 + 1);

// ---- Ring eines Spielers: r = Größe, t = Zeit seit Zielbeginn
export const newRing = () => ({ r: RING0, t: 0, done: false, taps: 0 });
export function tapRing(g, T) { if (g.done) return; g.r = Math.max(R_MIN, g.r - T.tap); g.taps++; }
export function stepRing(g, T, dt) { if (g.done) return; g.t += dt; g.r = Math.min(R_MAX, g.r + grow(T) * dt); }
export const offset = (g, T) => g.r - ringTarget(T, g.t); // > 0: zu wenig Kraft, < 0: zu viel
export const inZone = (g, T) => Math.abs(offset(g, T)) <= T.tol;
export const timeLeft = (g) => Math.max(0, AIM_TIME - g.t);

// Zuschlagen: ok, Genauigkeit 0..1, Grund
export function judge(g, T) {
  const o = offset(g, T); const ok = Math.abs(o) <= T.tol; const p = ok ? 1 - Math.abs(o) / T.tol : 0;
  return { ok, p: Math.round(p * 100) / 100, why: ok ? (p >= 0.75 ? 'perfekt' : 'treffer') : o > 0 ? 'schwach' : 'stark', left: Math.round(timeLeft(g) * 10) / 10 };
}
export const TIMEOUT = { ok: false, p: 0, why: 'zeit', left: 0 };
export function points(res, round) { if (!res || !res.ok) return 0; return Math.round((100 + 60 * res.p + 4 * res.left) * (1 + round * 0.1)); }
export const WHY = { perfekt: 'PERFEKT!', treffer: 'ZERSCHLAGEN!', schwach: 'Zu wenig Kraft', stark: 'Zu viel Kraft', zeit: 'Zu langsam' };

// ---- Partie: Host rechnet. names = drei Namen, ai = welche Plätze die KI spielt
export function newMatch(names, ai) { return { names: names.slice(0, 3), ai: ai.slice(0, 3), round: 0, phase: 'intro', score: [0, 0, 0], res: [], winner: null, rev: 0 }; }
export function record(M, seat, res) { const R = M.res[M.round] || (M.res[M.round] = [null, null, null]); if (R[seat]) return false; R[seat] = res; M.score[seat] += points(res, M.round); M.rev++; return true; }
export const roundDone = (M) => { const R = M.res[M.round]; return !!R && R.every(Boolean); };
export function nextRound(M) { if (M.round >= COUNT - 1) { M.phase = 'end'; const best = Math.max(...M.score); M.winner = M.score.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0); } else { M.round++; M.phase = 'intro'; } M.rev++; }
export const hits = (M, seat) => M.res.reduce((n, R) => n + (R && R[seat] && R[seat].ok ? 1 : 0), 0);

// ---- KI: hämmert etwas schneller als nötig, hält den Ring mit kleinen Pausen und schlägt nach einer Reaktionszeit zu. Spätere Ziele gehen öfter schief.
export function newBot(rng, round, skill = 1) {
  const hard = round / (COUNT - 1); const miss = rng() < 0.08 + hard * 0.38 / skill;
  return { rng, rate: 0, acc: 0, wait: 0.25 + rng() * 0.35 + hard * 0.5, react: 0, aim: miss ? 1.25 + rng() * 0.5 : 0.25 + rng() * 0.55 * (1 + hard), hold: 0, struck: false, late: miss && rng() < 0.4, jitter: 0.75 + rng() * 0.5 };
}
// liefert true, wenn die KI in diesem Schritt zuschlägt
export function botStep(b, g, T, dt) {
  if (b.struck || g.done) return false; b.wait -= dt; if (b.wait > 0) return false;
  const o = offset(g, T); const need = T.rate * b.jitter; b.rate = Math.min(12, o > T.tol * 0.3 ? Math.max(need * 1.6, 7 * b.jitter) : o < -T.tol * 0.3 ? need * 0.35 : need * 1.05);
  b.acc += b.rate * dt; while (b.acc >= 1) { b.acc -= 1; tapRing(g, T); }
  if (b.late) return false; // diese Runde verpennt die KI
  // Sobald der Ring grün wird, reagiert die KI nach kurzer Zeit. Danach schlägt sie im nächsten guten Moment zu, eine Fehl-KI schlägt einfach blind.
  const a = Math.abs(offset(g, T)); if (!b.hold && a <= T.tol) b.hold = 0.14 + b.rng() * 0.22; if (!b.hold) return false;
  b.react += dt; if (b.react < b.hold) return false;
  if (b.aim > 1 ? a > T.tol : a <= T.tol * Math.min(0.95, b.aim + 0.35)) { b.struck = true; return true; }
  return false;
}
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
