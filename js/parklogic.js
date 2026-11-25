// Theos Seitenscheidel - Parkmodus: reine Logik ohne Darstellung. Fahrzeuge, langsame Fahrphysik mit Gängen 1, 2, 3, R, Kollision (jede Berührung heißt Neustart), Parklücke, Musterfahrer.
// Koordinaten: vorn = (sin h, cos h), links = (cos h, -sin h). Bezugspunkt ist die Hinterachse (beim Stapler die Vorderachse, beim Panzer die Mitte, beim Flugzeug das Hauptfahrwerk).
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const PARK_DT = 1 / 60; // feste Schrittweite: Aufzeichnung und Spiel rechnen exakt gleich

// len, w, h: Maße; wb: Radstand; rear: Abstand Bezugspunkt bis Heck; steer: größter Einschlag (rad); gears: km/h in 1, 2, 3, R
export const VEH = {
  small: { name: 'Kleinwagen', len: 3.7, w: 1.72, h: 1.5, wb: 2.4, rear: 0.62, steer: 0.62, gears: [6, 11, 17, 5], acc: 2.4 },
  sedan: { name: 'Limousine', len: 4.7, w: 1.84, h: 1.45, wb: 2.8, rear: 0.95, steer: 0.58, gears: [6, 11, 17, 5], acc: 2.2 },
  sport: { name: 'Sportwagen', len: 4.5, w: 1.95, h: 1.2, wb: 2.65, rear: 0.9, steer: 0.55, gears: [8, 15, 24, 6], acc: 3.4 },
  suv: { name: 'Geländewagen', len: 4.9, w: 2.0, h: 1.85, wb: 2.9, rear: 0.95, steer: 0.56, gears: [6, 11, 16, 5], acc: 2.2 },
  van: { name: 'Lieferwagen', len: 5.9, w: 2.1, h: 2.5, wb: 3.6, rear: 1.15, steer: 0.55, gears: [5, 10, 15, 4], acc: 1.8 },
  limo: { name: 'Stretch-Limousine', len: 9.2, w: 1.95, h: 1.5, wb: 6.6, rear: 1.2, steer: 0.5, gears: [5, 9, 14, 4], acc: 1.6 },
  bus: { name: 'Linienbus', len: 12, w: 2.55, h: 3.1, wb: 6.4, rear: 3.1, steer: 0.62, gears: [5, 9, 14, 4], acc: 1.4 },
  truck: { name: 'LKW', len: 9.5, w: 2.5, h: 3.4, wb: 5.2, rear: 2.0, steer: 0.58, gears: [5, 9, 14, 4], acc: 1.3 },
  semi: { name: 'Sattelzug', len: 6.2, w: 2.5, h: 3.5, wb: 3.8, rear: 1.2, steer: 0.6, gears: [4, 8, 12, 3.5], acc: 1.1, trailer: { len: 9.2, l: 6.8, w: 1.27, c: 4.6, h: 3.9 } },
  moto: { name: 'Motorrad', len: 2.2, w: 0.82, h: 1.25, wb: 1.5, rear: 0.35, steer: 0.72, gears: [7, 13, 20, 4], acc: 3 },
  forklift: { name: 'Gabelstapler', len: 3.4, w: 1.3, h: 2.2, wb: 1.7, rear: 2.0, steer: 0.95, gears: [4, 7, 10, 4], acc: 1.8 },
  jeep: { name: 'Militär-Jeep', len: 4.3, w: 1.95, h: 1.9, wb: 2.7, rear: 0.8, steer: 0.6, gears: [6, 12, 18, 5], acc: 2.4 },
  tank: { name: 'Panzer', len: 8.2, w: 3.6, h: 2.9, wb: 0, rear: 4.1, steer: 0, gears: [4, 8, 12, 4], acc: 1.2, skid: 0.52, boxes: [{ c: 0, l: 4.1, w: 1.8 }, { c: 4.45, l: 1.15, w: 0.22 }] },
  rocket: { name: 'Raketen-Transporter', len: 15, w: 3.0, h: 3.8, wb: 8.4, rear: 3.2, steer: 0.5, gears: [4, 7, 11, 3], acc: 1 },
  tug: { name: 'Flugzeugschlepper', len: 5.2, w: 2.6, h: 1.8, wb: 2.9, rear: 1.1, steer: 0.7, gears: [5, 10, 14, 4], acc: 1.8 },
  cessna: { name: 'Sportflugzeug', len: 8.3, w: 1.3, h: 2.7, wb: 1.5, rear: 6.4, steer: 0.8, gears: [7, 13, 20, 5], acc: 1.9, boxes: [{ c: -2.2, l: 4.2, w: 0.65 }, { c: -0.7, l: 0.85, w: 5.6 }, { c: -5.6, l: 0.55, w: 1.75 }] },
  jumbo: { name: 'Jumbo-Jet', len: 70.6, w: 6.5, h: 19.4, wb: 25.6, rear: 44, steer: 0.62, gears: [10, 19, 30, 7], acc: 1.3, boxes: [{ c: -8.7, l: 35.3, w: 3.3 }, { c: -5.5, l: 7.5, w: 12 }, { c: -10.5, l: 4, w: 22 }, { c: -14.5, l: 2.5, w: 32.4 }, { c: -40, l: 4.2, w: 11 }] },
};
for (const d of Object.values(VEH)) { d.boxes = d.boxes || [{ c: d.len / 2 - d.rear, l: d.len / 2, w: d.w / 2 }]; d.radius = Math.max(d.len - d.rear, d.rear) + d.w * 0.6 + (d.trailer ? d.trailer.len + d.trailer.l : 0); for (const b of d.boxes) d.radius = Math.max(d.radius, Math.hypot(Math.abs(b.c) + b.l, b.w)); d.minR = d.skid ? 0 : d.wb / Math.tan(d.steer); }

export function createVehState(pose, def) { return { x: pose.x, z: pose.z, h: pose.h, v: 0, steer: 0, gear: 1, hand: 0, th2: def.trailer ? pose.h : 0, rpm: 900 }; }

// inp: { th 0..1 (Gas im eingelegten Gang), br 0..1, steer -1..1 (links +), hand 0|1 }
export function stepVeh(st, def, inp, dt) {
  const g = st.gear; const dir = g < 0 ? -1 : 1; const vmax = (g < 0 ? def.gears[3] : def.gears[g - 1]) / 3.6; const want = (inp.th || 0) * vmax * dir; const brk = (inp.br ? 6.5 * inp.br : 0) + (st.hand ? 7 : 0);
  if (brk > 0) { st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), brk * dt); }
  else if (inp.th > 0.02) { const a = (st.v * dir < -0.02 ? 4 : def.acc); st.v += clamp(want - st.v, -a * dt, a * dt); }
  else st.v -= Math.sign(st.v) * Math.min(Math.abs(st.v), 0.5 * dt);
  // Lenkung: Rad folgt der Taste mit begrenzter Geschwindigkeit
  const rate = def.skid ? 5 : 2.2; st.steer += clamp((inp.steer || 0) - st.steer, -rate * dt, rate * dt);
  const v = st.v; let dh;
  if (def.skid) dh = st.steer * def.skid * (1 - 0.35 * Math.min(1, Math.abs(v) / 2)); // Panzer dreht auf der Stelle
  else { dh = v * Math.tan(st.steer * def.steer) / def.wb; } // beim Stapler liegt der Bezugspunkt vorn: das Heck schwenkt aus
  st.h += dh * dt; const sn = Math.sin(st.h); const cs = Math.cos(st.h); st.x += sn * v * dt; st.z += cs * v * dt;
  if (def.trailer) st.th2 += (v / def.trailer.len) * Math.sin(st.h - st.th2) * dt;
  st.rpm += ((900 + Math.abs(v) / Math.max(vmax, 0.1) * 2600 + (inp.th || 0) * 900) - st.rpm) * Math.min(1, dt * 6);
}

// Rechteck: Mitte (x, z), Vorwärtsachse (ux, uz), Halbmaße hl (längs), hw (quer)
export const rect = (x, z, h, hl, hw, extra) => ({ x, z, ux: Math.sin(h), uz: Math.cos(h), hl, hw, ...extra });
export function rectHit(a, b, pad = 0) {
  const dx = b.x - a.x; const dz = b.z - a.z; const axes = [[a.ux, a.uz], [a.uz, -a.ux], [b.ux, b.uz], [b.uz, -b.ux]];
  for (const [ax, az] of axes) { const d = Math.abs(dx * ax + dz * az); const ra = Math.abs(a.ux * ax + a.uz * az) * a.hl + Math.abs(a.uz * ax - a.ux * az) * a.hw; const rb = Math.abs(b.ux * ax + b.uz * az) * b.hl + Math.abs(b.uz * ax - b.ux * az) * b.hw; if (d > ra + rb + pad) return false; }
  return true;
}
// alle Trefferflächen des Fahrzeugs in Weltkoordinaten
export function vehRects(st, def) {
  const out = []; const s = Math.sin(st.h); const c = Math.cos(st.h); for (const b of def.boxes) out.push(rect(st.x + s * b.c, st.z + c * b.c, st.h, b.l, b.w));
  if (def.trailer) { const t = def.trailer; const s2 = Math.sin(st.th2); const c2 = Math.cos(st.th2); const ax = st.x - s2 * t.len; const az = st.z - c2 * t.len; const oc = t.len - t.c; out.push(rect(ax + s2 * oc, az + c2 * oc, st.th2, t.l, t.w)); }
  return out;
}
// Raster für viele feste Hindernisse
export function buildGrid(list, cell = 10) { const g = new Map(); const key = (a, b) => (a + 4096) * 8192 + (b + 4096); for (const o of list) { const r = Math.hypot(o.hl, o.hw); const x0 = Math.floor((o.x - r) / cell); const x1 = Math.floor((o.x + r) / cell); const z0 = Math.floor((o.z - r) / cell); const z1 = Math.floor((o.z + r) / cell); for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const k = key(a, b); let l = g.get(k); if (!l) { l = []; g.set(k, l); } l.push(o); } } return { near(x, z, rad, out) { out.length = 0; const seen = new Set(); const x0 = Math.floor((x - rad) / cell); const x1 = Math.floor((x + rad) / cell); const z0 = Math.floor((z - rad) / cell); const z1 = Math.floor((z + rad) / cell); for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) { const l = g.get(key(a, b)); if (l) for (const o of l) if (!seen.has(o)) { seen.add(o); out.push(o); } } return out; } }; }

// bewegliche Hindernisse: Querverkehr und Schiebetore. Position nur aus der Levelzeit, darum überall gleich
export function moverRect(m, t) { const u = (((t / m.per + (m.phase || 0)) % 1) + 1) % 1; let off; if (m.type === 'gate') off = (u < 0.5 ? clamp(u * 10 - 1, 0, 1) : 1 - clamp((u - 0.8) * 10, 0, 1)) * m.len; else off = m.len * (u - 0.5); const sn = Math.sin(m.h); const cs = Math.cos(m.h); return rect(m.x + sn * off, m.z + cs * off, m.h, m.hl, m.hw, { kind: m.kind }); }

// Berührung: true, sobald eine Trefferfläche ein Hindernis schneidet. extra = weitere Rechtecke (Mitspieler zu Fuß, geparkte Fahrzeuge)
const tmpNear = [];
export function hitAny(st, def, level, t, extra = null) {
  const rs = vehRects(st, def); const near = level.grid.near(st.x, st.z, def.radius + 2, tmpNear); for (const r of rs) { for (const o of near) if (rectHit(r, o)) return o; if (extra) for (const o of extra) if (rectHit(r, o)) return o; for (const m of level.movers) { const q = moverRect(m, t); if (rectHit(r, q)) return q; } } return null;
}

// Parklücke: alle Ecken der Hauptfläche liegen in der Lücke, Winkel passt
export function inSpot(st, def, spot) {
  const s = Math.sin(st.h); const c = Math.cos(st.h); const corners = []; for (const b of def.boxes) for (const [p, q] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) corners.push([st.x + s * (b.c + p * b.l) + c * q * b.w, st.z + c * (b.c + p * b.l) - s * q * b.w]);
  if (def.trailer) { const r = vehRects(st, def)[def.boxes.length]; for (const [p, q] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) corners.push([r.x + r.ux * p * r.hl + r.uz * q * r.hw, r.z + r.uz * p * r.hl - r.ux * q * r.hw]); }
  for (const [x, z] of corners) { const dx = x - spot.x; const dz = z - spot.z; if (Math.abs(dx * spot.ux + dz * spot.uz) > spot.hl || Math.abs(dx * spot.uz - dz * spot.ux) > spot.hw) return false; }
  const ang = Math.abs(wrapA((def.trailer ? st.th2 : st.h) - spot.h)); const a = spot.any ? Math.min(ang, Math.PI - ang) : ang; return a <= spot.tol;
}
// Sterne: nach Zeit im Verhältnis zur Musterfahrt
export const starsOf = (t, par) => (t <= par * 1.1 ? 3 : t <= par * 1.7 ? 2 : 1);
