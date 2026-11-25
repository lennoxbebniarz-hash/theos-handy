// Theos Seitenscheidel - Dino-Lauf (Schulmodus, 2026-11-23): Regeln ohne Zeichnen. Ein Dino mit Schulranzen rennt über den Schulhof.
// Springen über Ranzen, Mülleimer und Bücherstapel, ducken unter Papierfliegern und Fußbällen. Je weiter, desto schneller.
// Maße in Metern, Zeit in Sekunden. Der Dino steht bei x = 0, die Welt läuft nach links an ihm vorbei.

export const GRAV = 34;
export const JUMP = 11.2; // Absprung: gut 1,8 m hoch, wer früh loslässt, springt flacher
export const SPEED0 = 9;
export const SPEED_MAX = 23;
export const DINO = { w: 0.9, h: 1.55, duckH: 0.82 };
// h: Höhe, w: Breite, y: Unterkante (fliegende Dinge schweben)
export const HINDERNIS = {
  ranzen: { w: 0.62, h: 0.72, y: 0 },
  muell: { w: 0.6, h: 1.05, y: 0 },
  buecher: { w: 1.15, h: 0.56, y: 0 },
  pylone: { w: 0.5, h: 0.8, y: 0 },
  flieger: { w: 0.95, h: 0.34, y: 1.0, flieg: true }, // ducken oder hoch drüber
  ball: { w: 0.5, h: 0.5, y: 1.08, flieg: true },
};
const BODEN = ['ranzen', 'muell', 'buecher', 'pylone'];

export function rng(seed = 1) { let s = (seed >>> 0) % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

export function newRun(seed = Date.now()) {
  return { t: 0, dist: 0, speed: SPEED0, y: 0, vy: 0, duck: false, ground: true, over: false, obs: [], next: 14, rnd: rng(seed), held: false, jumps: 0, near: 0 };
}
export const meter = (S) => Math.floor(S.dist);

// Abstand bis zum nächsten Hindernis: schneller = mehr Platz, damit es fair bleibt
function gap(S) { return S.speed * (0.62 + S.rnd() * 0.7) + 3.2; }
function spawn(S) {
  const r = S.rnd();
  const flying = S.dist > 220 && r < Math.min(0.34, 0.12 + S.dist / 4000);
  const kind = flying ? (S.rnd() < 0.55 ? 'flieger' : 'ball') : BODEN[Math.floor(S.rnd() * BODEN.length)];
  const H = HINDERNIS[kind];
  const lift = flying ? (S.rnd() < 0.3 ? 0.35 : 0) : 0; // manche fliegen tief: dann springen statt ducken
  S.obs.push({ kind, x: 26, w: H.w, h: H.h, y: H.y - lift, spin: S.rnd() * 6 });
  if (!flying && S.dist > 400 && S.rnd() < 0.22) { // ab und zu zwei hintereinander
    const k2 = BODEN[Math.floor(S.rnd() * BODEN.length)]; const H2 = HINDERNIS[k2];
    S.obs.push({ kind: k2, x: 26 + H.w + 0.25, w: H2.w, h: H2.h, y: 0, spin: 0 });
  }
  S.next = gap(S) + (S.obs.length ? S.obs[S.obs.length - 1].w : 0);
}

// input: { jump: gedrückt, duck: gedrückt }
export function step(S, dt, input = {}) {
  if (S.over) return S;
  S.t += dt;
  S.speed = Math.min(SPEED_MAX, SPEED0 + S.t * 0.16);
  const dx = S.speed * dt; S.dist += dx;
  // Springen: halten = höher, früh loslassen = flacher
  if (input.jump && S.ground && !input.duck) { S.vy = JUMP; S.ground = false; S.jumps++; }
  if (!input.jump && S.vy > 4) S.vy = 4 + (S.vy - 4) * 0.4;
  S.duck = !!input.duck && S.ground;
  if (input.duck && !S.ground) S.vy -= GRAV * 1.6 * dt; // in der Luft ducken: schneller runter
  if (!S.ground) { S.vy -= GRAV * dt; S.y += S.vy * dt; if (S.y <= 0) { S.y = 0; S.vy = 0; S.ground = true; } }
  for (const o of S.obs) { o.x -= dx * (HINDERNIS[o.kind].flieg ? 1.12 : 1); o.spin += dt * 8; }
  while (S.obs.length && S.obs[0].x + S.obs[0].w < -4) S.obs.shift();
  S.next -= dx;
  if (S.next <= 0) spawn(S);
  if (hit(S)) S.over = true;
  return S;
}
// Kasten des Dinos etwas kleiner als das Bild, damit knapp auch wirklich knapp ist
export function dinoBox(S) {
  const h = S.duck ? DINO.duckH : DINO.h; const w = S.duck ? DINO.w * 1.25 : DINO.w;
  return { x0: -w * 0.36, x1: w * 0.36, y0: S.y + 0.06, y1: S.y + h * 0.9 };
}
export function hit(S) {
  const d = dinoBox(S);
  for (const o of S.obs) {
    const x0 = o.x + o.w * 0.12; const x1 = o.x + o.w * 0.88; const y0 = o.y + o.h * 0.08; const y1 = o.y + o.h * 0.9;
    if (x1 > d.x0 && x0 < d.x1 && y1 > d.y0 && y0 < d.y1) return true;
  }
  return false;
}
