// Theos Seitenscheidel - Karte des Parkmodus: fünf Bezirke, 50 Level als gestrichelter Weg in Schlangenlinien, alle zehn Level ein Endgegner. Gleicher Zeichentrick-Stil wie die große Rallye. Alles per Canvas.
// progress: { done: { <n>: { t, stars } }, fails: { <n>: x } }. Ein Level ist offen, wenn alle davor geschafft sind.
const W = 1600; const H = 900; const INK = '#2a1a10';
export const parkUnlocked = (p, count = 50) => { let n = 1; for (let i = 1; i <= count; i++) { if (p.done && p.done[i]) n = Math.min(count, i + 1); else break; } return n; };
const DIST = [{ name: 'Supermarkt & Altstadt', col: '#a9c060', dark: '#7f9a44' }, { name: 'Tiefgarage & Hafen', col: '#6fa8c0', dark: '#4a7f9a' }, { name: 'Baustelle & Schrottplatz', col: '#d8b060', dark: '#ae8638' }, { name: 'Militärbasis', col: '#8a9a60', dark: '#5f6f3c' }, { name: 'Flughafen', col: '#b8c8dc', dark: '#8498b4' }];
const X0 = 74; const DX = 104; const Y0 = 812; const DY = 154;
const POS = []; for (let i = 0; i < 50; i++) { const row = Math.floor(i / 10); const c = i % 10; const x = X0 + (row % 2 ? 9 - c : c) * DX; POS.push([x, Y0 - row * DY + Math.sin(c * 1.3 + row) * 16]); }
const rng = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

function icon(c, kind, x, y, s) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineWidth = 3; c.strokeStyle = INK; const rect = (a, b, w, h, f) => { c.fillStyle = f; c.fillRect(a, b, w, h); c.strokeRect(a, b, w, h); };
  if (kind === 0) { rect(-34, -26, 68, 26, '#e4dcc8'); rect(-38, -34, 76, 9, '#c8281c'); rect(-14, -18, 28, 18, '#6fa8c0'); c.beginPath(); c.moveTo(-60, -6); c.lineTo(-46, -6); c.stroke(); }
  if (kind === 1) { rect(-40, -14, 80, 14, '#7a2c20'); rect(-30, -28, 20, 14, '#2a5a8a'); rect(-8, -28, 20, 14, '#a83c24'); rect(14, -28, 20, 14, '#3a7a4a'); c.beginPath(); c.moveTo(-54, 4); c.quadraticCurveTo(-30, 12, -8, 4); c.quadraticCurveTo(14, -4, 38, 4); c.stroke(); }
  if (kind === 2) { rect(-4, -60, 8, 60, '#e8b020'); rect(-34, -64, 76, 7, '#e8b020'); c.beginPath(); c.moveTo(30, -58); c.lineTo(30, -32); c.stroke(); rect(22, -32, 16, 8, '#555a60'); }
  if (kind === 3) { rect(-36, -12, 72, 12, '#4d5a3a'); rect(-16, -24, 34, 12, '#5a6640'); c.beginPath(); c.moveTo(18, -18); c.lineTo(46, -22); c.stroke(); c.fillStyle = '#26282a'; c.fillRect(-40, 0, 80, 7); c.strokeRect(-40, 0, 80, 7); }
  if (kind === 4) { c.fillStyle = '#f2efe6'; c.beginPath(); c.moveTo(-54, -2); c.quadraticCurveTo(-40, -14, 40, -14); c.quadraticCurveTo(56, -10, 58, -4); c.quadraticCurveTo(44, 6, -40, 6); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#c8281c'; c.beginPath(); c.moveTo(-50, -6); c.lineTo(-62, -30); c.lineTo(-44, -30); c.lineTo(-30, -10); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#d8dadc'; c.beginPath(); c.moveTo(-6, -2); c.lineTo(-30, 26); c.lineTo(-14, 26); c.lineTo(22, -2); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
}
function paint(c) {
  const r = rng(90210); c.fillStyle = '#2a7f9a'; c.fillRect(0, 0, W, H);
  for (let d = 0; d < 5; d++) { const y1 = Y0 - d * DY + DY / 2 + 12; const y0 = y1 - DY; c.fillStyle = DIST[d].col; c.fillRect(0, y0, W, DY + 1); c.fillStyle = DIST[d].dark; for (let i = 0; i < 46; i++) { c.globalAlpha = 0.16 + r() * 0.2; c.beginPath(); c.ellipse(r() * W, y0 + r() * DY, 24 + r() * 74, 8 + r() * 26, r() * 3, 0, 7); c.fill(); } c.globalAlpha = 1; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(0, y1); c.lineTo(W, y1); c.stroke(); }
  // Bezirksnamen und kleine Bilder, rechts neben dem Weg
  for (let d = 0; d < 5; d++) { const y = Y0 - d * DY; c.font = '900 22px Bahnschrift, Segoe UI, sans-serif'; c.textAlign = 'left'; c.lineWidth = 5; c.strokeStyle = 'rgba(30,18,8,.9)'; c.fillStyle = '#fff3c4'; const lx = 34; const ly = y - 52; c.strokeText(DIST[d].name, lx, ly); c.fillText(DIST[d].name, lx, ly); icon(c, d, 1098, y + 16, 1); }
  const v = c.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, 980); v.addColorStop(0, 'rgba(40,20,0,0)'); v.addColorStop(1, 'rgba(40,20,0,.5)'); c.fillStyle = v; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '60,30,0' : '255,240,200'},${r() * 0.06})`; c.fillRect(r() * W, r() * H, 1.6, 1.6); }
}

export function createParkMap({ $, count, catalog, vehName, fmt, onStart, onBack }) {
  const cv = $('pmCv'); const c = cv.getContext('2d'); const bg = document.createElement('canvas'); bg.width = W; bg.height = H; let painted = false;
  const R = { open: false, sel: 0, progress: { done: {} }, readonly: false, t: 0, raf: 0 };
  const unlocked = () => parkUnlocked(R.progress, count); const starsTxt = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
  function showCard() {
    const i = R.sel; const n = i + 1; const q = catalog[i]; const d = R.progress.done && R.progress.done[n]; const f = (R.progress.fails && R.progress.fails[n]) || 0; const open = n <= unlocked();
    $('pmNum').textContent = `Level ${n} von ${count}, ${q.final ? 'der letzte Gegner' : q.boss ? 'Endgegner' : DIST[q.district].name}`; $('pmName').textContent = q.name; $('pmBlurb').textContent = q.blurb; $('pmVeh').textContent = q.stages ? 'Fahrzeuge: ' + q.stages.map((s) => vehName(s.veh)).join(', dann ') : 'Fahrzeug: ' + vehName(q.veh);
    $('pmStat').textContent = !open ? 'Noch gesperrt: Erst das Level davor schaffen.' : d ? `Geschafft in ${fmt(d.t)}, ${starsTxt(d.stars)}${f ? `, ${f}× verkackt` : ''}` : f ? `Noch nicht geschafft, ${f}× verkackt` : 'Eine Berührung, und alles beginnt von vorn.';
    const go = $('pmGo'); go.textContent = R.readonly ? 'Der Host wählt' : d ? 'Nochmal parken' : 'Level starten'; go.disabled = !open || R.readonly; go.classList.toggle('hidden', R.readonly);
    const dist = Math.floor(i / 10); const rows = []; for (let k = dist * 10; k < dist * 10 + 10; k++) { const m = k + 1; const e = R.progress.done && R.progress.done[m]; const fx = (R.progress.fails && R.progress.fails[m]) || 0; rows.push(`<tr class="${m <= unlocked() ? '' : 'locked'}${k === i ? ' sel' : ''}"><td>${m}. ${catalog[k].name}</td><td>${e ? fmt(e.t) : '–'}</td><td class="m3">${e ? starsTxt(e.stars) : '–'}</td><td>${fx}</td></tr>`); } $('pmBoard').innerHTML = `<h4>${DIST[dist].name}</h4><table><tr><th>Level</th><th>Zeit</th><th>Sterne</th><th>verkackt</th></tr>${rows.join('')}</table>`;
  }
  function draw() {
    if (!R.open) return; R.raf = requestAnimationFrame(draw); R.t += 1 / 60; const t = R.t; if (!painted) { paint(bg.getContext('2d')); painted = true; }
    const ww = window.innerWidth; const wh = window.innerHeight; const dpr = Math.min(window.devicePixelRatio || 1, 1.5); if (cv.width !== Math.round(ww * dpr) || cv.height !== Math.round(wh * dpr)) { cv.width = Math.round(ww * dpr); cv.height = Math.round(wh * dpr); }
    const k = Math.min((cv.width - 386 * dpr) / 1180, cv.height / H); const ox = 0; const oy = (cv.height - H * k) / 2; R.view = { k: k / dpr, ox: ox / dpr, oy: oy / dpr }; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#1c2a30'; c.fillRect(0, 0, cv.width, cv.height); c.setTransform(k, 0, 0, k, ox, oy); c.drawImage(bg, 0, 0);
    const un = unlocked(); c.lineCap = 'round'; c.setLineDash([16, 15]); c.lineDashOffset = -t * 18; const line = (a, b, col, w) => { c.beginPath(); for (let i = a; i <= b; i++) { if (i === a) c.moveTo(POS[i][0], POS[i][1]); else { const p = POS[i - 1]; const q = POS[i]; if (i % 10 === 0) c.bezierCurveTo(p[0] + (p[0] > 600 ? 62 : -62), p[1], q[0] + (q[0] > 600 ? 62 : -62), q[1], q[0], q[1]); else c.lineTo(q[0], q[1]); } } c.strokeStyle = col; c.lineWidth = w; c.stroke(); }; line(0, 49, 'rgba(42,26,16,.55)', 8); line(0, Math.max(0, un - 1), '#fff3c4', 10); c.setLineDash([]);
    POS.forEach((p, i) => { const n = i + 1; const q = catalog[i]; const d = R.progress.done && R.progress.done[n]; const open = n <= un; const sel = i === R.sel; const boss = q.boss; const rad = q.final ? 36 : boss ? 30 : 21; const bob = sel ? Math.sin(t * 5) * 3 : 0;
      c.save(); c.translate(p[0], p[1] + bob); if (sel) { c.strokeStyle = '#fff3c4'; c.lineWidth = 5; c.setLineDash([10, 8]); c.lineDashOffset = t * 26; c.beginPath(); c.arc(0, 0, rad + 10, 0, 7); c.stroke(); c.setLineDash([]); }
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(3, rad - 1, rad * 0.95, rad * 0.32, 0, 0, 7); c.fill(); c.fillStyle = !open ? '#8c8678' : d ? '#ffc53a' : boss ? '#b5201c' : '#e8521f'; c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); if (boss) { for (let a = 0; a < 16; a++) { const r2 = a % 2 ? rad * 0.82 : rad * 1.08; const an = a * Math.PI / 8; c.lineTo(Math.cos(an) * r2, Math.sin(an) * r2); } c.closePath(); } else c.arc(0, 0, rad, 0, 7); c.fill(); c.stroke();
      c.fillStyle = open ? '#fff8e4' : '#4a4640'; c.lineWidth = 5; c.strokeStyle = INK; c.font = `900 ${q.final ? 30 : boss ? 24 : 20}px Bahnschrift, Segoe UI, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; const lab = q.final ? 'P' : String(n); if (open) { c.strokeText(lab, 0, 2); c.fillText(lab, 0, 2); } else { c.lineWidth = 3; c.strokeStyle = '#4a4640'; c.beginPath(); c.arc(0, -4, 6, Math.PI, 0); c.stroke(); c.fillRect(-8, -4, 16, 12); }
      if (d) for (let m = 0; m < 3; m++) { c.fillStyle = m < d.stars ? '#fff08a' : 'rgba(60,40,20,.5)'; c.strokeStyle = INK; c.lineWidth = 1.2; const sx = (m - 1) * 14; const sy = -rad - 7; c.beginPath(); for (let a = 0; a < 10; a++) { const r2 = a % 2 ? 2.8 : 6.4; const an = -Math.PI / 2 + a * Math.PI / 5; c.lineTo(sx + Math.cos(an) * r2, sy + Math.sin(an) * r2); } c.closePath(); c.fill(); c.stroke(); }
      c.restore(); });
  }
  const pick = (mx, my) => { const v = R.view; if (!v) return -1; const x = (mx - v.ox) / v.k; const y = (my - v.oy) / v.k; let best = -1; let bd = 44 * 44; POS.forEach((p, i) => { const d = (p[0] - x) ** 2 + (p[1] - y) ** 2; if (d < bd) { bd = d; best = i; } }); return best; };
  cv.addEventListener('mousemove', (e) => { const i = pick(e.clientX, e.clientY); cv.style.cursor = i >= 0 ? 'pointer' : 'default'; });
  cv.addEventListener('click', (e) => { const i = pick(e.clientX, e.clientY); if (i >= 0 && !R.readonly) { R.sel = i; showCard(); } });
  $('pmGo').onclick = () => { if (R.readonly || R.sel + 1 > unlocked()) return; onStart(R.sel + 1); }; $('pmBack').onclick = () => onBack();
  R.show = ({ progress, readonly = false, sel = null }) => { R.progress = progress; R.readonly = readonly; const un = unlocked(); R.sel = sel !== null ? sel - 1 : un - 1; R.open = true; const done = Object.keys(progress.done || {}).length; $('pmSub').textContent = readonly ? 'Der Host wählt das nächste Level.' : `${done} von ${count} Leveln geschafft`; showCard(); cancelAnimationFrame(R.raf); draw(); };
  R.hide = () => { R.open = false; cancelAnimationFrame(R.raf); };
  R.key = (code) => { if (!R.open) return false; if (code === 'Escape') { onBack(); return true; } if (R.readonly) return true; const go = (d) => { R.sel = Math.max(0, Math.min(unlocked() - 1, R.sel + d)); showCard(); return true; }; if (code === 'ArrowRight') return go(1); if (code === 'ArrowLeft') return go(-1); if (code === 'ArrowUp') return go(10); if (code === 'ArrowDown') return go(-10); if (code === 'Enter') { $('pmGo').onclick(); return true; } return false; };
  return R;
}
