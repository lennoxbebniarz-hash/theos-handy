// Theos Seitenscheidel - lose Gegenstände in der Werkstatt (Werkzeuge, Flaschen): rutschen in Kurven, springen bei Bodenwellen.
// Reine Logik im Fahrzeugsystem (x nach links, z nach vorn). Gesichert verstaute Gegenstände (secured) bewegen sich nicht.
const G = 9.81; const MU_STATIC = 0.42; const MU_KINETIC = 0.3;

// Flächen, auf denen Dinge liegen: Rechteck, Höhe, Randhöhe als Beschleunigung, ab der Dinge über den Rand fallen
export const SURFACES = {
  bench: { x0: -0.8, x1: -0.52, z0: -2.72, z1: -1.64, y: 0.86, edge: 16 },
  floor: { x0: -0.78, x1: 0.78, z0: -3.0, z1: -1.3, y: 0.42, edge: 1e9 },
};

export function createProps(list = []) {
  return { items: list.map((o, i) => ({ vx: 0, vz: 0, vy: 0, dy: 0, secured: false, surface: 'bench', idx: i, ...o, y: o.y !== undefined ? o.y : SURFACES[o.surface || 'bench'].y })) };
}
export const findProp = (P, id) => P.items.find((i) => i.id === id) || null;
export function takeProp(P, id) { const i = P.items.findIndex((x) => x.id === id); if (i < 0) return null; return P.items.splice(i, 1)[0]; }
// ablegen: auf Bank (lose, rutscht) oder zurück an den gesicherten Platz
export function putProp(P, item, where, pos = {}) {
  item.vx = item.vz = item.vy = 0;
  if (where === 'home') { item.secured = true; item.surface = item.home.surface; item.x = item.home.x; item.z = item.home.z; item.y = item.home.y !== undefined ? item.home.y : SURFACES[item.surface].y; }
  else { item.secured = false; item.surface = where; const s = SURFACES[where]; item.x = Math.min(s.x1 - 0.04, Math.max(s.x0 + 0.04, pos.x !== undefined ? pos.x : (s.x0 + s.x1) / 2)); item.z = Math.min(s.z1 - 0.04, Math.max(s.z0 + 0.04, pos.z !== undefined ? pos.z : (s.z0 + s.z1) / 2)); item.y = s.y + (pos.drop || 0); }
  P.items.push(item); return item;
}

// m: { ay (Querbeschleunigung des Autos, + = Linkskurve), ax (Längsbeschleunigung, + = Gas), hop (Stoß nach oben in m/s, 0 = keiner) }
export function stepProps(P, m, dt) {
  // Trägheit: in einer Linkskurve (ay > 0) rutscht alles nach rechts (-x), beim Beschleunigen nach hinten (-z)
  const ax = -(m.ay || 0); const az = -(m.ax || 0); const a = Math.hypot(ax, az); const hop = m.hop || 0;
  for (const it of P.items) {
    const s = SURFACES[it.surface];
    if (it.secured) { it.dy = Math.min(0.012, hop * 0.004); continue; }
    // Sprung bei Stoß
    if (hop > 0 && it.y <= s.y + 1e-3) it.vy = hop * (0.55 + 0.45 * (((it.idx * 37) % 7) / 6));
    if (it.vy !== 0 || it.y > s.y) { it.y += it.vy * dt; it.vy -= G * dt; if (it.y <= s.y) { it.y = s.y; it.vy = Math.abs(it.vy) > 0.6 ? -it.vy * 0.25 : 0; } }
    const airborne = it.y > s.y + 0.01;
    const moving = Math.hypot(it.vx, it.vz) > 0.015;
    if (!moving && a < MU_STATIC * G) continue; // haftet
    if (!airborne) { // gleitet: Trägheitskraft minus Gleitreibung
      const sp = Math.hypot(it.vx, it.vz); const fx = ax - (sp > 1e-3 ? MU_KINETIC * G * it.vx / sp : 0); const fz = az - (sp > 1e-3 ? MU_KINETIC * G * it.vz / sp : 0);
      if (a < MU_STATIC * G && sp < 0.05) { it.vx = it.vz = 0; continue; }
      it.vx += fx * dt; it.vz += fz * dt;
      if (a < MU_KINETIC * G && sp > 0 && Math.hypot(it.vx, it.vz) < 0.03) { it.vx = it.vz = 0; }
    }
    it.x += it.vx * dt; it.z += it.vz * dt;
    // Rand der Fläche: über den Rand fallen (starke Kurve) oder abprallen
    const out = it.x < s.x0 || it.x > s.x1 || it.z < s.z0 || it.z > s.z1;
    if (out) {
      if (it.surface !== 'floor' && a > s.edge * 0.55) { const f = SURFACES.floor; it.surface = 'floor'; it.x = Math.min(f.x1, Math.max(f.x0, it.x)); it.z = Math.min(f.z1, Math.max(f.z0, it.z)); it.vy = 0; }
      else {
        if (it.x < s.x0) { it.x = s.x0; it.vx = Math.abs(it.vx) * 0.3; } if (it.x > s.x1) { it.x = s.x1; it.vx = -Math.abs(it.vx) * 0.3; }
        if (it.z < s.z0) { it.z = s.z0; it.vz = Math.abs(it.vz) * 0.3; } if (it.z > s.z1) { it.z = s.z1; it.vz = -Math.abs(it.vz) * 0.3; }
      }
    }
  }
}
