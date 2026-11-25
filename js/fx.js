// Theos Seitenscheidel - Schadens-Effekte auf dem Bildschirm des Fahrers: Rauch und Dampf aus der Motorhaube, Ölspritzer auf der Scheibe,
// rot pulsierender Alarmrand (im Takt der Sirene), Elektrik-Aussetzer. Reine 2D-Überlagerung (Canvas über der 3D-Szene), liest nur den Leistungsfaktor-Satz `perf` aus damage.js.

export function createFx(canvas) {
  const c = canvas.getContext('2d'); const puffs = []; const blots = []; let phase = 0; let W = 0; let H = 0;
  function size() { const w = Math.max(2, Math.round(window.innerWidth / 2)); const h = Math.max(2, Math.round(window.innerHeight / 2)); if (w !== W || h !== H) { W = canvas.width = w; H = canvas.height = h; } }
  const grad = (x, y, r, rgb, a) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); };

  // perf: computePerf(); dt in s; on = Effekte sichtbar (nur Fahrer/Navigator im Rennen); rate = Sirenentakt in Hz
  function update(dt, perf, on, storm = null) {
    size(); c.clearRect(0, 0, W, H);
    if (!on || !perf) { puffs.length = 0; blots.length = 0; return; }
    // Gewitter: Regenstreifen und Blitz
    if (storm) { c.strokeStyle = 'rgba(190,205,225,.3)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 150; i++) { const x = Math.random() * W; const y = Math.random() * H * 0.85; const l = 8 + Math.random() * 18; c.moveTo(x, y); c.lineTo(x - 2 - l * 0.2, y + l); } c.stroke(); if (storm.flash > 0.02) { c.fillStyle = `rgba(226,232,255,${Math.min(0.55, storm.flash)})`; c.fillRect(0, 0, W, H); } }
    // Rauch (schwarz-grau) und Dampf (weiß) steigen aus der Haubenmitte auf
    const spawn = (kind, amount) => { if (Math.random() < dt * (10 + 60 * amount)) puffs.push({ kind, x: W * (0.5 + (Math.random() - 0.5) * (kind === 'steam' ? 0.55 : 0.35)), y: H * (0.9 + Math.random() * 0.05), r: 14 + Math.random() * 20, vy: -(30 + Math.random() * 50), vx: (Math.random() - 0.5) * 40, life: 0, max: 1.4 + Math.random() * 1.4, a: 0.25 + 0.45 * amount }); };
    if (perf.smoke > 0.03) spawn('smoke', perf.smoke); if (perf.steam > 0.03) spawn('steam', perf.steam);
    for (let i = puffs.length - 1; i >= 0; i--) { const p = puffs[i]; p.life += dt; if (p.life >= p.max) { puffs.splice(i, 1); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * (50 + 60 * p.life);
      const k = p.life / p.max; const a = p.a * Math.sin(Math.min(1, k * 4) * Math.PI / 2) * (1 - k); grad(p.x, p.y, p.r, p.kind === 'steam' ? '240,246,250' : '30,26,24', a); }
    if (puffs.length > 140) puffs.splice(0, puffs.length - 140);
    // Dampf-Dunst über dem unteren Bildteil: nimmt die Sicht
    if (perf.steam > 0.35) { const g = c.createLinearGradient(0, H * 0.25, 0, H); g.addColorStop(0, 'rgba(235,242,246,0)'); g.addColorStop(1, `rgba(235,242,246,${0.55 * (perf.steam - 0.3)})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
    // Ölspritzer auf der Scheibe
    if (perf.oilFilm > 0.05 && Math.random() < dt * (1 + 5 * perf.oilFilm)) blots.push({ x: Math.random() * W, y: H * (0.08 + Math.random() * 0.6), r: 6 + Math.random() * (14 + 22 * perf.oilFilm), life: 0, max: 7 + Math.random() * 7, rot: Math.random() * 3 });
    for (let i = blots.length - 1; i >= 0; i--) { const b = blots[i]; b.life += dt; if (b.life >= b.max) { blots.splice(i, 1); continue; } const k = b.life / b.max; const a = 0.55 * Math.min(1, b.life * 6) * (1 - k * k);
      c.save(); c.translate(b.x, b.y + b.life * 4); c.rotate(b.rot); c.scale(1, 1.5); grad(0, 0, b.r, '38,24,8', a); c.restore(); }
    if (blots.length > 60) blots.splice(0, blots.length - 60);
    // Alarmrand: pulsiert im Takt der Sirene und wird mit nahendem Totalschaden stärker
    if (perf.alarm > 0) {
      const rate = 1.9 + perf.alarm * 0.5 + perf.urgency * 4.2; phase += dt * rate * Math.PI * 2; const pu = 0.5 + 0.5 * Math.sin(phase); const a = (0.1 + 0.12 * perf.alarm + 0.4 * perf.urgency) * (0.35 + 0.65 * pu);
      const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72); g.addColorStop(0, 'rgba(255,30,20,0)'); g.addColorStop(1, `rgba(255,30,20,${a})`); c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    // Elektrik: Bild fällt kurz aus
    if (perf.flicker > 0 && Math.random() < dt * perf.flicker * 2.2) { c.fillStyle = `rgba(0,0,0,${0.35 + Math.random() * 0.5})`; c.fillRect(0, 0, W, H); }
  }
  return { update, clear: () => { puffs.length = 0; blots.length = 0; if (W) c.clearRect(0, 0, W, H); } };
}
