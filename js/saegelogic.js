// Theos Seitenscheidel - Hund-Modus (intern saege, ohne Namen): Regeln ohne Grafik. Wellen, Waffen, Treffer, Hindernisse.
// Welle 1 hat 100 Hamster, Welle 2 200, Welle 3 300 ... bis man es nicht mehr schafft. Alle Spieler haben in einer Welle dieselbe Waffe.
export const WEAPONS = [
  { id: 'saege', name: 'Kettensäge', melee: true, reach: 2.25, cone: 0.55, dps: 8, maxCut: 6 },
  { id: 'blatt', name: 'Sägeblatt-Werfer', rate: 0.2, speed: 26, life: 1.5, radius: 0.55, bounces: 2 }, // Sägeblätter fliegen durch alles durch und prallen zweimal ab
  { id: 'minigun', name: 'Minigun', rate: 1 / 24, spin: 0.4, spread: 0.032, pellets: 1, range: 60, gore: 'fetzen', push: 2.5 },
  { id: 'schrot', name: 'Schrotflinte', rate: 0.62, spread: 0.09, pellets: 11, range: 30, gore: 'fetzen', push: 7 },
  { id: 'haecksler', name: 'Häcksler', melee: true, width: 2.6, depth: 1.9, maxCut: 14 }, // breite Walze vorne: alles, was reinläuft, wird gehäckselt
  { id: 'granate', name: 'Granatwerfer', rate: 0.55, speed: 17, radius: 3.4, push: 9 },
];
export const weaponOf = (id) => WEAPONS.find((w) => w.id === id) || WEAPONS[0];
export const FIELD_MAX = 240; // so viele Hamster gleichzeitig in der Halle, der Rest wartet im LKW
export function wave(w) {
  return { n: w, weapon: WEAPONS[w % WEAPONS.length].id, count: 100 * (w + 1), speed: 1 + Math.min(0.8, w * 0.06), next: WEAPONS[(w + 1) % WEAPONS.length].id };
}
export const HALL = { x0: -11.4, x1: 11.4, z0: -15.4, z1: 17.4 }; // begehbarer Hallenboden
export const TRUCK = { len: 9.6, half: 1.35, rearIn: -8.6, rearOut: -36 }; // Heck in der Halle bei z = rearIn
export const PLAYER = { eye: 1.62, speed: 5.4, sprint: 8.2, hp: 100, regen: 2.5, bite: 1.6, biteEvery: 0.9, biteGap: 0.12 }; // biteGap: höchstens ein Biss pro 0,12 s, sonst ist man in der Menge sofort tot
export const HAM = { r: 0.36, cy: 0.34 }; // Körperkugel bei Maßstab 1
export const SEAT_COL = ['#e5483c', '#3f7fe6', '#f2c31b', '#3fbf6a'];
export const spawnPoint = (seat) => ({ x: (seat - 1.5) * 1.6, z: 9 });

// Strahl gegen Kugel: Abstand bis zum Eintritt oder -1
export function raySphere(o, d, c, r) {
  const ox = o.x - c.x; const oy = o.y - c.y; const oz = o.z - c.z; const b = ox * d.x + oy * d.y + oz * d.z; const q = ox * ox + oy * oy + oz * oz - r * r; const h = b * b - q;
  if (h < 0) return -1; const s = Math.sqrt(h); const t = -b - s; if (t > 0) return t; const t2 = -b + s; return t2 > 0 ? 0 : -1;
}
// Liegt ein Punkt im Sägebereich vor dem Spieler? (fx, fz = Blickrichtung waagrecht, normiert)
export function inSawCone(px, pz, fx, fz, hx, hz, reach, cone) {
  const dx = hx - px; const dz = hz - pz; const d = Math.hypot(dx, dz); if (d > reach) return false; if (d < 0.45) return true; return (dx * fx + dz * fz) / d >= cone;
}
// Liegt ein Punkt im Rechteck vor dem Spieler (Häcksler)? r = Radius des Hamsters
export function inFront(px, pz, fx, fz, hx, hz, width, depth, r = 0) {
  const dx = hx - px; const dz = hz - pz; const fwd = dx * fx + dz * fz; const side = dx * -fz + dz * fx; return fwd > -0.3 && fwd < depth + r && Math.abs(side) < width / 2 + r;
}
export function clampHall(p, pad = 0.3) { p.x = Math.max(HALL.x0 + pad, Math.min(HALL.x1 - pad, p.x)); p.z = Math.max(HALL.z0 + pad, Math.min(HALL.z1 - pad, p.z)); return p; }
// Spieler aus dem LKW schieben (Rechteck x ±half, z rear-len .. rear)
export function pushOutOfTruck(p, rear, pad = 0.35) {
  const x0 = -TRUCK.half - pad; const x1 = TRUCK.half + pad; const z0 = rear - TRUCK.len - pad; const z1 = rear + pad;
  if (p.x <= x0 || p.x >= x1 || p.z <= z0 || p.z >= z1) return false;
  const opts = [[p.x - x0, () => { p.x = x0; }], [x1 - p.x, () => { p.x = x1; }], [z1 - p.z, () => { p.z = z1; }], [p.z - z0, () => { p.z = z0; }]]; opts.sort((a, b) => a[0] - b[0]); opts[0][1](); return true;
}
// Raster für die Nachbarsuche der Hamster (sonst 400 x 400 Paare pro Bild)
export function createGrid(cell = 1) {
  const W = Math.ceil((HALL.x1 - HALL.x0 + 4) / cell); const H = Math.ceil((HALL.z1 - HALL.z0 + 4) / cell); const head = new Int32Array(W * H); let next = new Int32Array(512);
  const key = (x, z) => { const i = Math.max(0, Math.min(W - 1, ((x - HALL.x0 + 2) / cell) | 0)); const j = Math.max(0, Math.min(H - 1, ((z - HALL.z0 + 2) / cell) | 0)); return j * W + i; };
  return {
    build(list, ok) { head.fill(-1); if (next.length < list.length) next = new Int32Array(list.length * 2); for (let i = 0; i < list.length; i++) { const h = list[i]; if (!ok(h)) continue; const k = key(h.pos.x, h.pos.z); next[i] = head[k]; head[k] = i; } },
    each(x, z, fn) { const i0 = Math.max(0, Math.min(W - 1, ((x - HALL.x0 + 2) / cell) | 0)); const j0 = Math.max(0, Math.min(H - 1, ((z - HALL.z0 + 2) / cell) | 0)); for (let j = Math.max(0, j0 - 1); j <= Math.min(H - 1, j0 + 1); j++) for (let i = Math.max(0, i0 - 1); i <= Math.min(W - 1, i0 + 1); i++) for (let n = head[j * W + i]; n >= 0; n = next[n]) fn(n); },
  };
}
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
