// Theos Seitenscheidel - Stapelturm (Schulmodus, 2026-11-23): Regeln ohne Zeichnen.
// Eine Platte gleitet abwechselnd von links und von hinten über den Turm. Klick lässt sie fallen: Was übersteht, wird abgeschnitten.
// Genau getroffen: nichts geht verloren, nach drei genauen Treffern in Folge wächst die Platte ein Stück zurück. Daneben: vorbei.

export const BASE = 3; // Breite und Tiefe der ersten Platte in Metern
export const H = 0.42; // Höhe einer Platte
export const RANGE = 4.2; // so weit gleitet die Platte aus der Mitte
export const TOL = 0.07; // so knapp zählt als genau
export const GROW = 0.18; // so viel wächst sie nach drei genauen Treffern

export function newTower() {
  const top = { x: 0, z: 0, w: BASE, d: BASE, y: 0 };
  const T = { blocks: [top], cut: [], moving: null, combo: 0, best: 0, over: false, perfect: 0, t: 0 };
  spawnMoving(T);
  return T;
}
export const hoehe = (T) => T.blocks.length - 1;
export const speedOf = (n) => Math.min(9, 3.6 + n * 0.11); // m/s, wird mit jeder Etage schneller

function spawnMoving(T) {
  const top = T.blocks[T.blocks.length - 1]; const n = T.blocks.length;
  const axis = n % 2 ? 'x' : 'z';
  T.moving = { x: axis === 'x' ? -RANGE : top.x, z: axis === 'z' ? -RANGE : top.z, w: top.w, d: top.d, y: top.y + H, axis, dir: 1, speed: speedOf(n) };
}
// hin und her gleiten
export function step(T, dt) {
  if (T.over || !T.moving) return T;
  T.t += dt;
  const M = T.moving; const k = M.axis; const top = T.blocks[T.blocks.length - 1];
  const mid = k === 'x' ? top.x : top.z;
  M[k] += M.dir * M.speed * dt;
  if (M[k] > mid + RANGE) { M[k] = mid + RANGE; M.dir = -1; }
  if (M[k] < mid - RANGE) { M[k] = mid - RANGE; M.dir = 1; }
  return T;
}
// Platte fallen lassen. Rückgabe: { art: 'genau' | 'ab' | 'vorbei', stueck } (stueck = abgeschnittenes Teil, fällt runter)
export function drop(T) {
  if (T.over || !T.moving) return { art: 'vorbei', stueck: null };
  const M = T.moving; const top = T.blocks[T.blocks.length - 1];
  const k = M.axis; const size = k === 'x' ? 'w' : 'd';
  const delta = M[k] - top[k]; const ad = Math.abs(delta);
  let res;
  if (ad <= TOL) {
    T.combo++; T.perfect++;
    const b = { x: top.x, z: top.z, w: top.w, d: top.d, y: M.y };
    if (T.combo >= 3) { b[size] = Math.min(BASE, b[size] + GROW); } // wächst zurück
    T.blocks.push(b); res = { art: 'genau', stueck: null, wuchs: T.combo >= 3 && b[size] > top[size] };
  } else {
    const rest = top[size] - ad;
    if (rest <= 0) {
      T.over = true; T.cut.push({ ...M }); T.moving = null;
      return { art: 'vorbei', stueck: { ...M } };
    }
    T.combo = 0;
    const b = { x: top.x, z: top.z, w: top.w, d: top.d, y: M.y };
    b[size] = rest; b[k] = top[k] + delta / 2;
    const s = { x: M.x, z: M.z, w: M.w, d: M.d, y: M.y };
    s[size] = ad; s[k] = b[k] + Math.sign(delta) * (rest / 2 + ad / 2);
    T.blocks.push(b); T.cut.push(s); res = { art: 'ab', stueck: s };
  }
  T.best = Math.max(T.best, hoehe(T));
  spawnMoving(T);
  return res;
}
