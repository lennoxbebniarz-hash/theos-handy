// Theos Seitenscheidel - Navigator-Tablet: kleiner Kartenausschnitt (Straße grau, Auto als Punkt) und Kurvenansagen mit Winkel und Schlamm-Warnung.
// Reine Zeichenlogik auf ein 2D-Canvas: wird sowohl auf das 3D-Tablet im Auto als auch auf das große Bild für den Navigator gemalt.

// Nächste Kurven ab Streckenposition s (mit Abstand in m), höchstens `count` innerhalb von `maxDist`
export function nextCorners(track, s, count = 4, maxDist = 600) {
  const out = [];
  for (const c of track.corners) {
    const end = c.s + c.len; if (end < s - 4) continue; const dist = Math.max(0, c.s - s); if (dist > maxDist) break;
    out.push({ ...c, dist, passing: c.s <= s });
    if (out.length >= count) break;
  }
  return out;
}

// Klartext und Farbe zur Kurve: Winkel auf 5° gerundet, Härtegrad nach Radius/Winkel
export function describeCorner(c) {
  const ang = Math.round(c.angle / 5) * 5; const hairpin = c.angle >= 140 && c.radius <= 16;
  const tag = hairpin ? 'Spitzkehre' : c.radius <= 14 || c.angle >= 105 ? 'eng' : c.radius <= 32 ? 'mittel' : 'weit';
  const color = hairpin ? '#ff4a3a' : tag === 'eng' ? '#ff9a2a' : tag === 'mittel' ? '#e6d35a' : '#7ddc7a';
  return { text: `${c.dir === 'left' ? 'LINKS' : 'RECHTS'} ${ang}°`, tag, color, hairpin };
}

const warnTriangle = (c, x, y, r) => { // gelbes Gefahrenzeichen mit Ausrufezeichen
  c.fillStyle = '#ffd21a'; c.strokeStyle = '#2a2000'; c.lineWidth = Math.max(1.5, r * 0.14); c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 1.05, y + r * 0.8); c.lineTo(x - r * 1.05, y + r * 0.8); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#2a2000'; c.font = `bold ${Math.round(r * 1.25)}px Segoe UI, Arial`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', x, y + r * 0.22);
};
const arrow = (c, x, y, size, dir, color) => { // Pfeil, der in die Kurvenrichtung abknickt
  c.save(); c.translate(x, y); c.strokeStyle = color; c.fillStyle = color; c.lineWidth = size * 0.22; c.lineCap = 'round'; c.lineJoin = 'round';
  const s = dir === 'left' ? -1 : 1; c.beginPath(); c.moveTo(-s * size * 0.1, size * 0.5); c.lineTo(-s * size * 0.1, -size * 0.05); c.quadraticCurveTo(-s * size * 0.1, -size * 0.45, s * size * 0.32, -size * 0.45); c.stroke();
  c.beginPath(); c.moveTo(s * size * 0.55, -size * 0.45); c.lineTo(s * size * 0.2, -size * 0.7); c.lineTo(s * size * 0.2, -size * 0.2); c.closePath(); c.fill(); c.restore();
};

// state: { s (Streckenposition), kmh, time, length }; sim: Fahrzeugzustand (x, z, psi)
export function drawTablet(c, W, H, track, sim, state) {
  const s0 = state.s; const mapTop = 46; const listH = Math.round(H * 0.34); const mapH = H - mapTop - listH;
  c.fillStyle = '#0c1210'; c.fillRect(0, 0, W, H);
  // Kopfzeile
  c.fillStyle = '#e8821e'; c.fillRect(0, 0, W, 40); c.fillStyle = '#1a1208'; c.font = 'bold 22px Segoe UI, Arial'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('NAVIGATOR', 12, 21);
  c.textAlign = 'right'; c.font = 'bold 20px Consolas, monospace'; c.fillText(`${Math.round(state.kmh)} km/h`, W - 12, 21);
  // Kartenausschnitt: Blick in Streckenrichtung (Straße bleibt „oben“), Punkt = Auto
  const q = track.nearest(sim.x, sim.z); const p0 = track.poseAt(s0); const sn = Math.sin(p0.psi); const cs = Math.cos(p0.psi);
  const cx = W / 2; const cy = mapTop + mapH * 0.8; const sc = Math.min(1.7, W / 300);
  const X = (wx, wz) => { const dx = wx - sim.x; const dz = wz - sim.z; return cx - (dx * cs - dz * sn) * sc; };
  const Y = (wx, wz) => { const dx = wx - sim.x; const dz = wz - sim.z; return cy - (dx * sn + dz * cs) * sc; };
  c.save(); c.beginPath(); c.rect(0, mapTop, W, mapH); c.clip();
  c.fillStyle = '#16201a'; c.fillRect(0, mapTop, W, mapH);
  const a = Math.max(0, s0 - 40); const b = Math.min((track.n - 1) * 2, s0 + (cy - mapTop) / sc + 60);
  const pathSeg = (from, to) => { c.beginPath(); let first = true; for (let s = from; s <= to; s += 2) { const p = track.poseAt(s); const x = X(p.x, p.z); const y = Y(p.x, p.z); if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y); } };
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = '#05080a'; c.lineWidth = 17 * sc * 0.75 + 4; pathSeg(a, b); c.stroke(); // Rand
  c.strokeStyle = '#8f8f8c'; c.lineWidth = 17 * sc * 0.75; pathSeg(a, b); c.stroke(); // Straße in Grau
  c.strokeStyle = '#575754'; c.lineWidth = 17 * sc * 0.75; pathSeg(a, s0); c.stroke(); // schon gefahrene Strecke dunkler
  for (const [m0, m1] of track.mudZones) { // Schlammabschnitte
    if (m1 < a || m0 > b) continue; c.strokeStyle = '#8a5a2a'; c.lineWidth = 17 * sc * 0.75; pathSeg(Math.max(m0, a), Math.min(m1, b)); c.stroke();
    c.strokeStyle = '#4b2f14'; c.lineWidth = 3; c.setLineDash([5, 6]); pathSeg(Math.max(m0, a), Math.min(m1, b)); c.stroke(); c.setLineDash([]);
  }
  // Meter-Marken alle 100 m
  c.font = 'bold 13px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
  for (let d = 100; d <= 500; d += 100) { const s = s0 + d; if (s > (track.n - 1) * 2) break; const p = track.poseAt(s); const x = X(p.x, p.z); const y = Y(p.x, p.z); if (y < mapTop + 8) continue; c.fillStyle = '#0c1210'; c.fillRect(x - 17, y - 9, 34, 18); c.fillStyle = '#dfe6d8'; c.fillText(`${d}`, x, y); }
  // Kurven auf der Karte: Winkel am Scheitelpunkt, Schlamm mit Warnzeichen
  const list = nextCorners(track, s0, 5, 330);
  for (const cn of list) {
    const mid = track.poseAt(cn.s + cn.len / 2); const d = describeCorner(cn); const x = X(mid.x, mid.z); const y = Y(mid.x, mid.z); if (y < mapTop + 12) continue;
    const side = cn.dir === 'left' ? -1 : 1; const bx = Math.min(W - 40, Math.max(40, x + side * 26)); const by = Math.max(mapTop + 18, y);
    c.fillStyle = 'rgba(10,14,12,0.88)'; c.strokeStyle = d.color; c.lineWidth = 2.5; c.beginPath(); c.roundRect(bx - 28, by - 12, 56, 24, 7); c.fill(); c.stroke();
    c.fillStyle = d.color; c.font = 'bold 15px Segoe UI, Arial'; c.fillText(`${Math.round(cn.angle / 5) * 5}°`, bx, by);
    if (cn.mud) warnTriangle(c, bx + (side > 0 ? 40 : -40), by, 11);
  }
  // Rivale als blauer Punkt
  if (state.rival) { const rx = X(state.rival.x, state.rival.z); const ry = Y(state.rival.x, state.rival.z); c.fillStyle = '#2c62c8'; c.strokeStyle = '#ffc53a'; c.lineWidth = 2.5; c.beginPath(); c.arc(rx, ry, 7, 0, 7); c.fill(); c.stroke(); }
  // Auto: Punkt mit kurzer Richtungsmarke
  const carX = X(sim.x, sim.z); const carY = Y(sim.x, sim.z);
  c.fillStyle = '#ffffff'; c.strokeStyle = '#e8821e'; c.lineWidth = 3.5; c.beginPath(); c.arc(carX, carY, 8, 0, 7); c.fill(); c.stroke();
  const hx = Math.sin(sim.psi - p0.psi) * 15; const hy = Math.cos(sim.psi - p0.psi) * 15; c.strokeStyle = '#e8821e'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(carX, carY); c.lineTo(carX - hx, carY - hy); c.stroke();
  c.restore();
  // Fortschritt
  c.fillStyle = '#9fb39a'; c.font = '14px Segoe UI, Arial'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(`${Math.round(s0)} / ${Math.round(state.length || track.length)} m`, 10, mapTop + mapH - 8);
  c.textAlign = 'right'; c.fillText(state.time !== undefined ? `${Math.floor(state.time / 60)}:${(state.time % 60).toFixed(1).padStart(4, '0')}` : '', W - 10, mapTop + mapH - 8);
  // Kurvenliste
  const ly = mapTop + mapH; c.fillStyle = '#0a0f0d'; c.fillRect(0, ly, W, listH); c.fillStyle = '#e8821e'; c.fillRect(0, ly, W, 3);
  const rows = nextCorners(track, s0, 3, 900); const rowH = (listH - 3) / 3;
  rows.forEach((cn, i) => {
    const d = describeCorner(cn); const y = ly + 3 + i * rowH; const big = i === 0; const mid = y + rowH / 2;
    if (big) { c.fillStyle = 'rgba(232,130,30,0.14)'; c.fillRect(0, y, W, rowH); }
    arrow(c, 34, mid + 2, big ? 40 : 30, cn.dir, d.color);
    c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#f2f0e4'; c.font = `bold ${big ? 26 : 20}px Segoe UI, Arial`; c.fillText(d.text, 72, mid - (big ? 9 : 7));
    c.font = `${big ? 17 : 14}px Segoe UI, Arial`; c.fillStyle = d.color; c.fillText(`${d.tag}${cn.mud ? ' · SCHLAMM' : ''}`, 72, mid + (big ? 17 : 13));
    c.textAlign = 'right'; c.fillStyle = '#fff3d1'; c.font = `bold ${big ? 30 : 22}px Consolas, monospace`; c.fillText(cn.passing ? 'jetzt' : `${Math.round(cn.dist / 5) * 5} m`, W - (cn.mud ? 46 : 12), mid);
    if (cn.mud) warnTriangle(c, W - 24, mid, big ? 15 : 12);
  });
  if (!rows.length) { c.fillStyle = '#7ddc7a'; c.font = 'bold 26px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Gerade bis ins Ziel', W / 2, ly + listH / 2); }
}

// Gestörtes Signal (WLAN-Router defekt): Rauschen, Bildsprünge und immer wieder "KEIN SIGNAL". jam 0..1. -> true, wenn gerade ein Totalausfall angezeigt wird
export function jamTablet(c, W, H, jam, t) {
  if (jam <= 0) return false;
  const period = 6.5 - 3 * jam; const out = (((t % period) + period) % period) < period * (0.18 + 0.22 * jam);
  if (out) {
    c.fillStyle = '#05080a'; c.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(200,220,230,${Math.random() * 0.35})`; c.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 40, 1 + Math.random() * 3); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff5a4a'; c.font = 'bold 40px Segoe UI, Arial'; c.fillText('KEIN SIGNAL', W / 2, H * 0.42);
    c.fillStyle = '#c9d3d8'; c.font = '20px Segoe UI, Arial'; c.fillText('WLAN-Router gestört', W / 2, H * 0.52); c.fillText('Ingenieur: Router oben reparieren', W / 2, H * 0.58);
    return true;
  }
  const n = Math.floor(140 * jam); for (let i = 0; i < n; i++) { c.fillStyle = `rgba(210,225,235,${Math.random() * 0.28})`; c.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 60, 1 + Math.random() * 2); }
  const bars = 1 + Math.floor(jam * 3); for (let i = 0; i < bars; i++) { const y = Math.random() * H; const hh = 4 + Math.random() * 14; try { c.drawImage(c.canvas, 0, y, W, hh, (Math.random() - 0.5) * 50 * jam, y, W, hh); } catch { /* egal */ } }
  c.fillStyle = 'rgba(255,90,74,0.9)'; c.font = 'bold 18px Segoe UI, Arial'; c.textAlign = 'right'; c.textBaseline = 'top'; c.fillText('SIGNAL SCHWACH', W - 12, 10);
  return false;
}
