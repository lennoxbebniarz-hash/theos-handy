// Theos Seitenscheidel - KI-Fahrer (reine Logik): folgt der Mittellinie und bremst vor Kurven nach der Krümmung.
// Übernimmt das Steuer, wenn der Spieler als Navigator mitfährt (Solo-Test) - und dient den Tests als Beweis, dass jede Strecke fahrbar ist.
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// level: Vorsicht (1 = flott, 0.8 = vorsichtiger). Liefert Eingaben { throttle, brake, steer, hand } für sim.step.
export function aiInput(st, track, level = 1, lane = 0, o = null) {
  const q = st.lane || track.nearest(st.x, st.z);
  const u = Math.abs(st.u); const kap = track.pts.kappa; const n = track.n;
  const look = clamp(3 + 0.3 * u, 5, 13);
  const p = track.poseAt(q.s + look); const li = Math.min(n - 1, Math.round((q.s + look) / 2)); const off = lane + (track.aiLane ? track.aiLane[li] : 0); const dx = p.x + Math.cos(p.psi) * off - st.x; const dz = p.z - Math.sin(p.psi) * off - st.z;
  let err = Math.atan2(dx, dz) - st.psi; err = Math.atan2(Math.sin(err), Math.cos(err));
  // Zielgeschwindigkeit: für jeden Punkt voraus die Kurvengeschwindigkeit, rückwärts gerechnet mit der Bremsverzögerung
  let vt = o && o.vmax ? o.vmax : 70; const aBrake = o && o.aBrake ? o.aBrake : 10.5 * level; const aLat = o && o.aLat ? o.aLat : 10.5 * level;
  for (let d = 0; d <= 130; d += 4) {
    const i = Math.min(n - 1, Math.round((q.s + d) / 2)); const k = Math.max(Math.abs(kap[i]), Math.abs(kap[Math.min(n - 1, i + 3)]), 1e-4);
    const mud = track.inMud(q.s + d); const vc = Math.sqrt((mud ? 0.5 : 1) * aLat / k);
    vt = Math.min(vt, Math.sqrt(vc * vc + 2 * aBrake * d));
  }
  if (track.inMud(q.s)) vt = Math.min(vt, 21);
  vt = Math.min(vt, o && o.vmax ? o.vmax : 66 * level);
  const over = u - vt;
  return { throttle: over < -0.5 ? 1 : over < 1 ? 0.35 : 0, brake: over > 1.2 ? clamp(over / 5, 0.25, 1) : 0, steer: clamp(err * 2.3 + clamp(-q.lat * 0.04, -0.15, 0.15) * 0, -1, 1), hand: 0, direct: true };
}

// Rivale Bruno: eigene Physik auf der Ideallinie. Gleiche Beschleunigung wie der eigene Wagen (CAR), Spitze 75 m/s (270 km/h), in Kurven K-mal so schnell wie die normale KI, fliegt nie ab.
// r: { s, u, lane, laneV, x, z, psi, steer, lane0 }. K steuert das Gummiband in main.js, laneT die Spur (links +).
const CORNER_BASE = 12; const RIVAL_VMAX = 75;
export function rivalPos(r, track) { const n = track.n; const f = r.s / 2; const i = Math.min(n - 2, Math.floor(f)); const t = f - i; const p = track.pts; const psi = p.psi[i] + (p.psi[i + 1] - p.psi[i]) * t; r.x = p.x[i] + (p.x[i + 1] - p.x[i]) * t + Math.cos(psi) * r.laneV; r.z = p.z[i] + (p.z[i + 1] - p.z[i]) * t - Math.sin(psi) * r.laneV; r.psi = psi; r.steer = clamp(p.kappa[i] * 8, -1, 1); }
export function stepRival(r, track, dt, K, C, laneT = r.laneV) {
  const kap = track.pts.kappa; const n = track.n; let vt = RIVAL_VMAX; for (let d = 0; d <= 170; d += 5) { const i = Math.min(n - 1, Math.round((r.s + d) / 2)); const k = Math.max(Math.abs(kap[i]), Math.abs(kap[Math.min(n - 1, i + 3)]), 1e-4); const vc = K * Math.sqrt(CORNER_BASE / k); vt = Math.min(vt, Math.sqrt(vc * vc + 2 * 13 * d)); }
  const u = r.u; if (u < vt) { const punch = 1 + 0.55 * clamp(1 - u / 20, 0, 1); const f = Math.min(C.maxDrive * punch, C.power / Math.max(u, 2)) * clamp((RIVAL_VMAX - u) / 3, 0, 1); r.u += Math.max(0, f - 240 - C.drag * u * u) / C.m * dt; } else r.u = Math.max(vt, u - 13 * dt);
  r.laneV += clamp(laneT - r.laneV, -2.4 * dt, 2.4 * dt); r.s += r.u * dt; const L = track.length; let crossed = false; if (r.s >= L) { r.s -= L; crossed = true; } rivalPos(r, track); return crossed;
}
