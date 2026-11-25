// Theos Seitenscheidel - Teo's Casino, Level 2: die Spielautomaten der Automatenhalle.
// 5 Walzen, 3 Reihen, 10 Gewinnlinien. Teo ist Wild (ersetzt alles außer der Bonus-Münze), drei Bonus-Münzen irgendwo bringen Freispiele
// (Gewinne zählen dort doppelt). Am TEO MEGA gewinnen fünf Teos auf der Mittellinie den Teo-Jackpot.
// Die Glückssträhne (luckFor 'slots', Wohnungs-Upgrade „Eigener Spielautomat“ ×1,5) macht die guten Symbole häufiger.
// Der Host würfelt (Seed), alle anderen bekommen das fertige Walzenbild. Auszahlungsquoten per Simulation kalibriert (test/casino-slots.test.js).
import { rng, luckFor, netWorth, levelFor, euro } from './casinologic.js';

export const LINES = [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1], [0, 1, 1, 1, 0]];
export const WILD = 6; export const SCAT = 7;
// Auszahlung je Linie (mal Linieneinsatz) für 3, 4, 5 gleiche von links; Index 6 = nur Teos
const PAY = [[4, 10, 30], [5, 15, 40], [6, 20, 60], [10, 30, 100], [15, 50, 200], [25, 100, 500], [50, 250, 1000]];
const SCAT_PAY = { 3: 2, 4: 10, 5: 50 }; // mal Gesamteinsatz
export const FREE_SPINS = { 3: 8, 4: 12, 5: 20 };
export const THEMES = {
  frucht: { id: 'frucht', name: 'Teos Früchte', bets: [10, 20, 50, 100], bg: ['#7a0816', '#1e0206'], accent: '#ffd23a', glow: '#ff4a5a', sym: ['kirsche', 'zitrone', 'pflaume', 'glocke', 'bar', 'sieben', 'teo', 'muenze'], w: [30, 27, 23, 15, 10, 6, 3, 3], scale: 1 },
  gold: { id: 'gold', name: 'Goldrausch', bets: [20, 50, 100, 200], bg: ['#5a3a0e', '#160c02'], accent: '#ffcf4a', glow: '#ffb03a', sym: ['nugget', 'laterne', 'hacke', 'dynamit', 'barren', 'sieben', 'teo', 'muenze'], w: [32, 27, 22, 14, 9, 5, 3, 3], scale: 1 },
  diamant: { id: 'diamant', name: 'Diamant Deluxe', bets: [50, 100, 200, 500], bg: ['#0a2a6e', '#02060f'], accent: '#7ae0ff', glow: '#5ab8ff', sym: ['rubin', 'smaragd', 'saphir', 'amethyst', 'ring', 'diamant', 'teo', 'muenze'], w: [34, 28, 22, 13, 8, 4, 2.6, 2.8], scale: 1 },
  mega: { id: 'mega', name: 'TEO MEGA', bets: [100, 200, 500, 1000], bg: ['#2a1c06', '#000000'], accent: '#ffe08a', glow: '#ffcf4a', sym: ['kirsche', 'glocke', 'bar', 'barren', 'diamant', 'sieben', 'teo', 'muenze'], w: [32, 27, 22, 14, 9, 5, 2.8, 2.8], scale: 1, jackpot: true },
};
// Kalibrierte Faktoren: Auszahlungsquote bei Glück 1,0 etwa 98 Prozent (siehe test/casino-slots.test.js).
export const CAL = { frucht: 1.614, gold: 1.492, diamant: 1.443, mega: 1.552 }; export const LUCK_K = 0.45; // Glück: mit Chance |Glück-1|*LUCK_K zweimal ziehen und das bessere (Pech: das schlechtere) Bild nehmen
for (const k of Object.keys(THEMES)) THEMES[k].scale = CAL[k];
// Maschinen der Halle (Reihen Rücken an Rücken, vorne +z), dazu zwei TEO MEGA hinten
export const MACHINES = (() => { const out = []; const rows = [{ z: -35.6, ry: 0 }, { z: -36.9, ry: Math.PI }, { z: -42.6, ry: 0 }, { z: -43.9, ry: Math.PI }]; const banks = [{ xs: [-21.0, -20.15, -19.3, -18.45], th: ['frucht', 'frucht', 'diamant', 'diamant'] }, { xs: [-3.55, -2.7, -1.85, -1.0], th: ['gold', 'gold', 'frucht', 'frucht'] }];
  for (const b of banks) rows.forEach((r, ri) => { for (const x of b.xs) out.push({ id: out.length, theme: b.th[ri], x, z: r.z, ry: r.ry, big: false }); });
  for (const x of [-12.7, -9.3]) out.push({ id: out.length, theme: 'mega', x, z: -48.2, ry: 0, big: true }); return out; })();

function pick(r, w, tot) { let x = r() * tot; for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; } return w.length - 1; }
export function spinGrid(theme, seed, luck = 1) {
  const T = THEMES[theme]; const r = rng(seed >>> 0); const tot = T.w.reduce((a, b) => a + b, 0); const make = () => { const g = [[], [], []]; for (let c = 0; c < 5; c++) for (let row = 0; row < 3; row++) g[row][c] = pick(r, T.w, tot); return g; };
  const a = make(); const l = Math.max(0.3, Math.min(3, luck || 1)); const q = Math.min(1, Math.abs(l - 1) * LUCK_K); if (q <= 0 || r() >= q) return a;
  const b = make(); const va = gridValue(theme, a); const vb = gridValue(theme, b); return (l > 1 ? vb > va : vb < va) ? b : a;
}
const gridValue = (theme, g) => { const e = evaluate(theme, g, 100); return e.win + e.free * 150; };
// Gewinn eines Walzenbilds in Cent (ohne Freispiel-Verdopplung und ohne Jackpot)
export function evaluate(theme, grid, bet) {
  const T = THEMES[theme]; const lineBet = bet / LINES.length; let win = 0; const lines = [];
  LINES.forEach((L, li) => {
    const s = L.map((row, c) => grid[row][c]); if (s[0] === SCAT) return;
    let wn = 0; while (wn < 5 && s[wn] === WILD) wn++;
    const base = s.find((x) => x !== WILD); let n = 0; if (base !== undefined && base !== SCAT) { while (n < 5 && (s[n] === base || s[n] === WILD)) n++; }
    const pBase = n >= 3 ? PAY[base][n - 3] : 0; const pWild = wn >= 3 ? PAY[WILD][wn - 3] : 0;
    const p = Math.max(pBase, pWild); if (p > 0) { win += p * lineBet * T.scale; lines.push({ li, n: pWild > pBase ? wn : n, sym: pWild > pBase ? WILD : base }); }
  });
  let sc = 0; for (const row of grid) for (const x of row) if (x === SCAT) sc++;
  const scat = Math.min(5, sc); if (scat >= 3) win += SCAT_PAY[scat] * bet;
  const jackpot = !!T.jackpot && LINES[0].every((row, c) => grid[row][c] === WILD);
  return { win: Math.round(win), lines, scat, free: scat >= 3 ? FREE_SPINS[scat] : 0, jackpot };
}
// Ein Dreh beim Host: Einsatz abziehen (außer im Freispiel), Gewinn gutschreiben, Freispiele und Jackpot verwalten, Statistik
export function playSpin(S, who, mid, bet, seed) {
  const M = MACHINES[mid]; if (!M) return { ok: false, why: 'Diesen Automaten gibt es nicht.' }; const T = THEMES[M.theme];
  S.free = S.free || {}; const fs = S.free[who]; const freeSpin = !!(fs && fs.left > 0 && fs.m === mid); if (fs && fs.left > 0 && fs.m !== mid) return { ok: false, why: 'Erst die Freispiele am anderen Automaten zu Ende spielen.' };
  if (!freeSpin) { if (!T.bets.includes(bet)) return { ok: false, why: 'Dieser Einsatz geht hier nicht.' }; if (S.purse < bet) return { ok: false, why: 'Die Familienkasse reicht nicht.' }; S.purse -= bet; S.spent += bet; S.jackpot = (S.jackpot || 50000) + Math.round(bet * 0.03); }
  const b = freeSpin ? fs.bet : bet; const luck = luckFor(S, 'slots'); const grid = spinGrid(M.theme, seed, luck); const ev = evaluate(M.theme, grid, b);
  let win = ev.win * (freeSpin ? 2 : 1); let jack = 0; if (ev.jackpot) { jack = S.jackpot || 50000; win += jack; S.jackpot = 50000; }
  S.purse += win; S.won += win; const st = (S.slotStats = S.slotStats || { spins: 0, won: 0, best: 0, free: 0 }); st.spins++; st.won += win; st.best = Math.max(st.best, win);
  if (freeSpin) { fs.left--; if (fs.left <= 0) delete S.free[who]; }
  if (ev.free) { const cur = S.free[who]; S.free[who] = { left: (cur && cur.left > 0 ? cur.left : 0) + ev.free, bet: b, m: mid }; st.free++; }
  const before = S.level; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak);
  return { ok: true, grid, win, lines: ev.lines, scat: ev.scat, freeWon: ev.free, freeSpin, freeLeft: S.free[who] ? S.free[who].left : 0, jackpot: jack, bet: b, level: S.level > before ? S.level : 0 };
}
export const freeLeft = (S, who) => { const f = S && S.free && S.free[who]; return f && f.left > 0 ? f : null; };

// ======================= Symbole (Canvas, einmal vorgezeichnet) =======================
const SERIF = 'Georgia, "Palatino Linotype", serif'; const FONT = 'Bahnschrift, "Segoe UI", sans-serif';
const grad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
const gem = (c, r, cols) => { c.beginPath(); c.moveTo(0, -r); c.lineTo(r * 0.85, -r * 0.3); c.lineTo(r * 0.55, r * 0.8); c.lineTo(-r * 0.55, r * 0.8); c.lineTo(-r * 0.85, -r * 0.3); c.closePath(); c.fillStyle = grad(c, -r, -r, r, r, cols); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = r * 0.05; c.stroke(); c.beginPath(); c.moveTo(-r * 0.85, -r * 0.3); c.lineTo(r * 0.85, -r * 0.3); c.moveTo(0, -r); c.lineTo(-r * 0.3, -r * 0.3); c.lineTo(0, r * 0.8); c.lineTo(r * 0.3, -r * 0.3); c.closePath(); c.strokeStyle = 'rgba(255,255,255,.45)'; c.stroke(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.45, r * 0.18, r * 0.08, -0.4, 0, 7); c.fill(); };
const SYM = {
  kirsche: (c, r) => { c.strokeStyle = '#2f7a1e'; c.lineWidth = r * 0.09; c.beginPath(); c.moveTo(-r * 0.35, r * 0.15); c.quadraticCurveTo(-r * 0.1, -r * 0.7, r * 0.3, -r * 0.8); c.moveTo(r * 0.35, r * 0.2); c.quadraticCurveTo(r * 0.3, -r * 0.4, r * 0.3, -r * 0.8); c.stroke(); c.fillStyle = '#3fa02a'; c.beginPath(); c.ellipse(r * 0.45, -r * 0.78, r * 0.28, r * 0.12, -0.5, 0, 7); c.fill(); for (const [x, y] of [[-r * 0.38, r * 0.38], [r * 0.38, r * 0.42]]) { c.fillStyle = grad(c, x - r * 0.3, y - r * 0.3, x + r * 0.3, y + r * 0.3, ['#ff5a6a', '#c8101e', '#6a0010']); c.beginPath(); c.arc(x, y, r * 0.36, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.arc(x - r * 0.12, y - r * 0.13, r * 0.08, 0, 7); c.fill(); } },
  zitrone: (c, r) => { c.fillStyle = grad(c, -r, -r, r, r, ['#fff27a', '#ffd21a', '#c89a00']); c.beginPath(); c.ellipse(0, 0, r * 0.82, r * 0.6, -0.3, 0, 7); c.fill(); c.beginPath(); c.ellipse(-r * 0.78, r * 0.25, r * 0.12, r * 0.08, -0.3, 0, 7); c.ellipse(r * 0.78, -r * 0.25, r * 0.12, r * 0.08, -0.3, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(-r * 0.25, -r * 0.25, r * 0.25, r * 0.1, -0.3, 0, 7); c.fill(); },
  pflaume: (c, r) => { c.fillStyle = grad(c, -r, -r, r, r, ['#c87aff', '#7a2ac8', '#2a0a5a']); c.beginPath(); c.ellipse(0, r * 0.05, r * 0.68, r * 0.78, 0.2, 0, 7); c.fill(); c.strokeStyle = 'rgba(40,0,80,.6)'; c.lineWidth = r * 0.05; c.beginPath(); c.moveTo(0, -r * 0.7); c.quadraticCurveTo(r * 0.25, 0, 0, r * 0.8); c.stroke(); c.fillStyle = '#3fa02a'; c.beginPath(); c.ellipse(r * 0.18, -r * 0.82, r * 0.25, r * 0.1, 0.4, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.3, r * 0.12, r * 0.22, 0.3, 0, 7); c.fill(); },
  glocke: (c, r) => { c.fillStyle = grad(c, -r, -r, r, r, ['#fff2a8', '#f2c14e', '#a8701a']); c.beginPath(); c.moveTo(0, -r * 0.85); c.bezierCurveTo(r * 0.55, -r * 0.85, r * 0.5, r * 0.2, r * 0.85, r * 0.55); c.lineTo(-r * 0.85, r * 0.55); c.bezierCurveTo(-r * 0.5, r * 0.2, -r * 0.55, -r * 0.85, 0, -r * 0.85); c.fill(); c.fillStyle = '#a8701a'; c.fillRect(-r * 0.9, r * 0.5, r * 1.8, r * 0.14); c.beginPath(); c.arc(0, r * 0.75, r * 0.15, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-r * 0.25, -r * 0.3, r * 0.1, r * 0.3, 0.2, 0, 7); c.fill(); },
  bar: (c, r) => { for (let i = 0; i < 2; i++) { const y = -r * 0.42 + i * r * 0.7; c.fillStyle = '#111'; c.fillRect(-r * 0.9, y - r * 0.26, r * 1.8, r * 0.52); c.strokeStyle = '#ffd23a'; c.lineWidth = r * 0.06; c.strokeRect(-r * 0.9, y - r * 0.26, r * 1.8, r * 0.52); c.fillStyle = '#ffd23a'; c.font = `900 ${r * 0.42}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BAR', 0, y + r * 0.02); } },
  sieben: (c, r) => { c.font = `900 ${r * 1.9}px Impact, ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = r * 0.22; c.strokeStyle = '#ffd23a'; c.strokeText('7', 0, r * 0.08); c.fillStyle = grad(c, 0, -r, 0, r, ['#ff6a5a', '#e0101e', '#7a0010']); c.fillText('7', 0, r * 0.08); },
  teo: (c, r) => { c.fillStyle = grad(c, -r, -r, r, r, ['#fff6c8', '#f2c14e', '#8a5a12']); c.beginPath(); c.arc(0, r * 0.12, r * 0.72, 0, 7); c.fill(); c.fillStyle = '#141414'; c.fillRect(-r * 0.5, -r * 0.62, r, r * 0.12); c.fillRect(-r * 0.32, -r * 1.02, r * 0.64, r * 0.44); c.fillStyle = '#c8161c'; c.fillRect(-r * 0.32, -r * 0.7, r * 0.64, r * 0.1); c.fillStyle = '#3a2410'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * r * 0.24, r * 0.02, r * 0.07, 0, 7); c.fill(); } c.strokeStyle = '#eee'; c.lineWidth = r * 0.12; c.lineCap = 'round'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, r * 0.28); c.quadraticCurveTo(s * r * 0.25, r * 0.22, s * r * 0.42, r * 0.12); c.stroke(); } c.fillStyle = '#c8161c'; c.font = `900 ${r * 0.34}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = r * 0.08; c.strokeStyle = '#fff'; c.strokeText('WILD', 0, r * 0.68); c.fillText('WILD', 0, r * 0.68); },
  muenze: (c, r) => { c.fillStyle = grad(c, -r, -r, r, r, ['#fff6c8', '#f2c14e', '#8a5a12']); c.beginPath(); c.arc(0, 0, r * 0.82, 0, 7); c.fill(); c.strokeStyle = '#8a5a12'; c.lineWidth = r * 0.07; c.beginPath(); c.arc(0, 0, r * 0.66, 0, 7); c.stroke(); c.fillStyle = '#7a4a10'; c.font = `900 ${r * 0.62}px ${SERIF}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('T', 0, -r * 0.05); c.fillStyle = '#fff'; c.font = `900 ${r * 0.24}px ${FONT}`; c.lineWidth = r * 0.07; c.strokeStyle = '#c8161c'; c.strokeText('BONUS', 0, r * 0.5); c.fillText('BONUS', 0, r * 0.5); },
  nugget: (c, r) => { c.fillStyle = grad(c, -r, -r, r, r, ['#fff2a8', '#d9a54a', '#7a4a10']); c.beginPath(); c.moveTo(-r * 0.7, r * 0.2); c.lineTo(-r * 0.4, -r * 0.5); c.lineTo(r * 0.2, -r * 0.6); c.lineTo(r * 0.75, -r * 0.1); c.lineTo(r * 0.5, r * 0.55); c.lineTo(-r * 0.3, r * 0.6); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.arc(-r * 0.2, -r * 0.25, r * 0.12, 0, 7); c.fill(); },
  laterne: (c, r) => { c.fillStyle = '#3a2a1a'; c.fillRect(-r * 0.42, -r * 0.6, r * 0.84, r * 0.12); c.fillRect(-r * 0.42, r * 0.55, r * 0.84, r * 0.12); const g = c.createRadialGradient(0, 0, 2, 0, 0, r * 0.6); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.5, '#ffb03a'); g.addColorStop(1, '#a85a10'); c.fillStyle = g; c.fillRect(-r * 0.34, -r * 0.48, r * 0.68, r * 1.03); c.strokeStyle = '#3a2a1a'; c.lineWidth = r * 0.08; c.strokeRect(-r * 0.34, -r * 0.48, r * 0.68, r * 1.03); c.beginPath(); c.arc(0, -r * 0.75, r * 0.2, Math.PI, 0); c.stroke(); },
  hacke: (c, r) => { c.strokeStyle = '#8a5a2a'; c.lineWidth = r * 0.16; c.lineCap = 'round'; c.beginPath(); c.moveTo(-r * 0.6, r * 0.75); c.lineTo(r * 0.45, -r * 0.4); c.stroke(); c.strokeStyle = '#b8c0c8'; c.lineWidth = r * 0.18; c.beginPath(); c.moveTo(-r * 0.15, -r * 0.85); c.quadraticCurveTo(r * 0.5, -r * 0.6, r * 0.85, r * 0.05); c.stroke(); },
  dynamit: (c, r) => { for (let i = -1; i <= 1; i++) { c.fillStyle = grad(c, i * r * 0.3 - r * 0.15, 0, i * r * 0.3 + r * 0.15, 0, ['#ff5a4a', '#c8101e', '#7a0010']); c.fillRect(i * r * 0.32 - r * 0.15, -r * 0.45, r * 0.3, r * 1.1); } c.fillStyle = '#2a1a0a'; c.fillRect(-r * 0.5, -r * 0.15, r, r * 0.12); c.strokeStyle = '#d8c8a8'; c.lineWidth = r * 0.06; c.beginPath(); c.moveTo(0, -r * 0.45); c.quadraticCurveTo(r * 0.3, -r * 0.75, r * 0.45, -r * 0.65); c.stroke(); c.fillStyle = '#ffd23a'; c.beginPath(); c.arc(r * 0.5, -r * 0.68, r * 0.1, 0, 7); c.fill(); },
  barren: (c, r) => { c.fillStyle = grad(c, 0, -r, 0, r, ['#fff2a8', '#f2c14e', '#8a5a12']); c.beginPath(); c.moveTo(-r * 0.55, -r * 0.35); c.lineTo(r * 0.55, -r * 0.35); c.lineTo(r * 0.85, r * 0.4); c.lineTo(-r * 0.85, r * 0.4); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,.45)'; c.fillRect(-r * 0.5, -r * 0.3, r, r * 0.14); c.fillStyle = '#7a4a10'; c.font = `900 ${r * 0.3}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('999,9', 0, r * 0.12); },
  rubin: (c, r) => gem(c, r * 0.85, ['#ff8a9a', '#e0102e', '#5a0010']), smaragd: (c, r) => gem(c, r * 0.85, ['#8affb8', '#18a85a', '#03401e']), saphir: (c, r) => gem(c, r * 0.85, ['#8ac8ff', '#1a5ae0', '#061a5a']), amethyst: (c, r) => gem(c, r * 0.85, ['#e0a8ff', '#8a2ae0', '#2a0a5a']),
  ring: (c, r) => { c.strokeStyle = grad(c, -r, -r, r, r, ['#fff2a8', '#f2c14e', '#8a5a12']); c.lineWidth = r * 0.16; c.beginPath(); c.ellipse(0, r * 0.25, r * 0.55, r * 0.5, 0, 0, 7); c.stroke(); c.save(); c.translate(0, -r * 0.42); gem(c, r * 0.36, ['#ffffff', '#bfe8ff', '#5aa8e0']); c.restore(); },
  diamant: (c, r) => gem(c, r * 0.95, ['#ffffff', '#c8f0ff', '#4aa8e0']),
};
const cache = new Map();
export function symImage(name, size = 128) { const key = name + size; let cv = cache.get(key); if (!cv) { cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); c.translate(size / 2, size / 2); (SYM[name] || SYM.muenze)(c, size * 0.42); cache.set(key, cv); } return cv; }
// Zufällige Symbolfolge je Walze für die Drehung (rein optisch)
const STRIP = Array.from({ length: 5 }, (_, c) => { const r = rng(4242 + c * 77); return Array.from({ length: 24 }, () => Math.floor(r() * 8)); });
export const LINE_COLS = ['#ffe08a', '#7affb8', '#ff7a9a', '#7ae0ff', '#ffa84a', '#c87aff', '#ff5a5a', '#5aff5a', '#5ab8ff', '#ffd0f0'];

// ======================= Bildschirm im Deluxe-Design (schwarz, Neon-Rahmen, glänzende Symbole, LED-Anzeigen) =======================
// Entwurf in 1024 x 736, wird auf die Zeichenfläche skaliert. Der feste Untergrund wird je Thema und Größe einmal vorgezeichnet.
const HEAVY = 'Impact, "Arial Black", "Segoe UI Black", sans-serif'; const UIF = '"Segoe UI", system-ui, sans-serif';
const rr2 = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
const neon2 = (c, x, y, w, h, r, col, lw = 4, glow = 22) => { c.save(); c.shadowColor = col; c.shadowBlur = glow; c.strokeStyle = col; c.lineWidth = lw; rr2(c, x, y, w, h, r); c.stroke(); c.shadowBlur = glow * 0.4; c.strokeStyle = '#fff'; c.globalAlpha = 0.75; c.lineWidth = lw * 0.35; rr2(c, x, y, w, h, r); c.stroke(); c.restore(); };
const rg2 = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const lg2 = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const outline2 = (c, lw = 5) => { c.lineJoin = 'round'; c.strokeStyle = 'rgba(20,0,0,.85)'; c.lineWidth = lw; c.stroke(); };
const gloss2 = (c, x, y, rx, ry, rot = -0.5, a = 0.75) => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = 'rgba(255,255,255,' + a + ')'; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill(); c.restore(); };
const leaf2 = (c, x, y, s, rot) => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = lg2(c, 0, -s * 0.2, 0, s * 0.2, [[0, '#7dff6a'], [1, '#12801f']]); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(s * 0.5, -s * 0.35, s, 0); c.quadraticCurveTo(s * 0.5, s * 0.3, 0, 0); c.fill(); outline2(c, 3); c.restore(); };
// Neue Früchte-Symbole, gezeichnet für Größe s = 200 (Mitte 0/0)
const SYM2 = {
  kirsche: (c, s) => { c.strokeStyle = '#1f8a2a'; c.lineWidth = s * 0.05; c.lineCap = 'round'; c.beginPath(); c.moveTo(-s * 0.22, s * 0.1); c.quadraticCurveTo(-s * 0.1, -s * 0.3, s * 0.05, -s * 0.42); c.moveTo(s * 0.2, s * 0.15); c.quadraticCurveTo(s * 0.18, -s * 0.2, s * 0.05, -s * 0.42); c.stroke(); leaf2(c, s * 0.05, -s * 0.42, s * 0.32, -0.5);
    for (const [x, y] of [[-s * 0.22, s * 0.2], [s * 0.2, s * 0.26]]) { c.fillStyle = rg2(c, x - s * 0.08, y - s * 0.1, s * 0.02, s * 0.26, [[0, '#ff9a9a'], [0.35, '#e00020'], [1, '#5a0010']]); c.beginPath(); c.arc(x, y, s * 0.22, 0, 7); c.fill(); outline2(c, 4); gloss2(c, x - s * 0.08, y - s * 0.1, s * 0.07, s * 0.04); } },
  zitrone: (c, s) => { c.save(); c.rotate(-0.35); c.fillStyle = rg2(c, -s * 0.1, -s * 0.1, s * 0.03, s * 0.5, [[0, '#fffbb0'], [0.45, '#ffd500'], [1, '#a87800']]); c.beginPath(); c.moveTo(-s * 0.46, 0); c.quadraticCurveTo(-s * 0.3, -s * 0.34, 0, -s * 0.32); c.quadraticCurveTo(s * 0.3, -s * 0.34, s * 0.46, 0); c.quadraticCurveTo(s * 0.3, s * 0.34, 0, s * 0.32); c.quadraticCurveTo(-s * 0.3, s * 0.34, -s * 0.46, 0); c.fill(); outline2(c, 4); gloss2(c, -s * 0.1, -s * 0.14, s * 0.16, s * 0.05, 0.1); c.restore(); leaf2(c, s * 0.28, -s * 0.28, s * 0.3, -0.9); },
  pflaume: (c, s) => { c.fillStyle = rg2(c, -s * 0.1, -s * 0.1, s * 0.03, s * 0.46, [[0, '#e0a8ff'], [0.4, '#8a2ad8'], [1, '#2a0860']]); c.beginPath(); c.ellipse(0, s * 0.06, s * 0.34, s * 0.36, 0, 0, 7); c.fill(); outline2(c, 4); c.strokeStyle = 'rgba(30,0,70,.5)'; c.lineWidth = 4; c.beginPath(); c.moveTo(0, -s * 0.26); c.quadraticCurveTo(s * 0.1, s * 0.05, 0, s * 0.4); c.stroke(); gloss2(c, -s * 0.13, -s * 0.08, s * 0.1, s * 0.05, -0.8); c.strokeStyle = '#6a3a10'; c.lineWidth = s * 0.04; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -s * 0.28); c.lineTo(s * 0.03, -s * 0.42); c.stroke(); leaf2(c, s * 0.03, -s * 0.4, s * 0.3, -0.4); },
  glocke: (c, s) => { c.fillStyle = lg2(c, -s * 0.4, 0, s * 0.4, 0, [[0, '#a8700a'], [0.35, '#ffe27a'], [0.6, '#ffc21a'], [1, '#8a5a06']]); c.beginPath(); c.arc(0, -s * 0.38, s * 0.07, 0, 7); c.moveTo(-s * 0.3, s * 0.2); c.quadraticCurveTo(-s * 0.3, -s * 0.34, 0, -s * 0.34); c.quadraticCurveTo(s * 0.3, -s * 0.34, s * 0.3, s * 0.2); c.quadraticCurveTo(s * 0.34, s * 0.3, s * 0.44, s * 0.34); c.lineTo(-s * 0.44, s * 0.34); c.quadraticCurveTo(-s * 0.34, s * 0.3, -s * 0.3, s * 0.2); c.fill(); outline2(c, 4);
    c.fillStyle = rg2(c, -s * 0.04, s * 0.38, s * 0.01, s * 0.12, [[0, '#fff2a0'], [1, '#b07a10']]); c.beginPath(); c.arc(0, s * 0.42, s * 0.1, 0, 7); c.fill(); outline2(c, 3); gloss2(c, -s * 0.13, -s * 0.12, s * 0.07, s * 0.18, 0.2, 0.6); },
  bar: (c, s) => { for (const dy of [-0.2, 0.2]) { c.save(); c.translate(0, s * dy); c.fillStyle = '#050505'; rr2(c, -s * 0.44, -s * 0.17, s * 0.88, s * 0.34, s * 0.06); c.fill(); c.strokeStyle = lg2(c, 0, -s * 0.17, 0, s * 0.17, [[0, '#fff0a0'], [0.5, '#e8a800'], [1, '#8a5a00']]); c.lineWidth = s * 0.04; c.stroke(); c.font = '900 ' + s * 0.3 + 'px ' + HEAVY; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = lg2(c, 0, -s * 0.12, 0, s * 0.12, [[0, '#fff'], [1, '#ffd23a']]); c.fillText('BAR', 0, s * 0.01); c.restore(); } },
  sieben: (c, s) => { c.save(); c.font = '900 ' + s * 1.15 + 'px ' + HEAVY; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ff2030'; c.shadowBlur = s * 0.2; c.lineJoin = 'round'; c.strokeStyle = '#2a0000'; c.lineWidth = s * 0.16; c.strokeText('7', 0, s * 0.04); c.shadowBlur = 0; c.strokeStyle = lg2(c, 0, -s * 0.5, 0, s * 0.5, [[0, '#fff3a0'], [1, '#e09a00']]); c.lineWidth = s * 0.08; c.strokeText('7', 0, s * 0.04); c.fillStyle = lg2(c, 0, -s * 0.5, 0, s * 0.5, [[0, '#ff5a5a'], [0.5, '#e00010'], [1, '#7a0008']]); c.fillText('7', 0, s * 0.04); c.globalAlpha = 0.5; c.fillStyle = lg2(c, 0, -s * 0.5, 0, 0, [[0, '#fff'], [1, 'rgba(255,255,255,0)']]); c.fillText('7', 0, s * 0.04); c.restore(); },
};
const spriteCache = new Map();
// Symbol als fertiges Bild (256 x 256, Schatten eingebacken). Neue Früchte, die Spielfiguren (Teo, Münze) und die übrigen Themen mit dem alten Zeichner.
function sprite(name) {
  let cv = spriteCache.get(name); if (cv) return cv; cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.translate(128, 128); c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 14; c.shadowOffsetY = 7;
  if (SYM2[name]) SYM2[name](c, 200);
  else if (name === 'teo') { c.save(); c.shadowBlur = 0; c.fillStyle = 'rgba(255,215,90,.5)'; for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.beginPath(); c.moveTo(-8, -88); c.lineTo(0, -122); c.lineTo(8, -88); c.fill(); } c.restore(); SYM.teo(c, 100); c.strokeStyle = 'rgba(255,230,140,.9)'; c.lineWidth = 5; c.beginPath(); c.arc(0, 11, 74, 0, 7); c.stroke(); }
  else (SYM[name] || SYM.muenze)(c, 107);
  spriteCache.set(name, cv); return cv;
}
const baseCache = new Map();
const SCR_W = 1024, SCR_H = 736, GX = 36, GY = 128, GW = 952, GH = 408, GAP = 14, CW = (GW - GAP * 4) / 5, CH = GH / 3;
const colX = (col) => GX + col * (CW + GAP);
function scrBase(T, W, H) {
  const key = T.id + '|' + W + 'x' + H; let cv = baseCache.get(key); if (cv) return cv; cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'); c.scale(W / SCR_W, H / SCR_H);
  c.fillStyle = '#030305'; c.fillRect(0, 0, SCR_W, SCR_H); c.save(); c.globalAlpha = 0.5; c.fillStyle = rg2(c, SCR_W / 2, SCR_H * 0.45, 40, SCR_W * 0.7, [[0, T.bg[0]], [1, '#020204']]); c.fillRect(0, 0, SCR_W, SCR_H); c.restore();
  neon2(c, 8, 8, SCR_W - 16, SCR_H - 16, 26, T.glow, 6, 26);
  if (!T.jackpot) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 88px ' + HEAVY; c.shadowColor = T.glow; c.shadowBlur = 40; c.fillStyle = lg2(c, 0, 24, 0, 110, [[0, '#fff6c0'], [0.5, T.accent], [1, '#d08a00']]); c.fillText(T.name.toUpperCase(), SCR_W / 2, 66); c.shadowBlur = 0; }
  c.strokeStyle = T.accent; c.lineWidth = 4; c.fillStyle = T.accent; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(SCR_W / 2 + sx * 400, 66); c.lineTo(SCR_W / 2 + sx * 470, 66); c.stroke(); c.beginPath(); c.moveTo(SCR_W / 2 + sx * 480, 66); c.lineTo(SCR_W / 2 + sx * 494, 58); c.lineTo(SCR_W / 2 + sx * 494, 74); c.fill(); }
  for (let col = 0; col < 5; col++) { const x0 = colX(col); c.fillStyle = lg2(c, 0, GY, 0, GY + GH, [[0, '#101424'], [0.5, '#1a2038'], [1, '#0a0c18']]); rr2(c, x0, GY, CW, GH, 14); c.fill(); for (const r of [1, 2]) { c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(x0 + 10, GY + r * CH - 1, CW - 20, 2); } neon2(c, x0, GY, CW, GH, 14, '#4a8aff', 4, 16); }
  const fy = GY + GH + 22, fh = SCR_H - fy - 74;
  for (const [x, w, label, col] of [[36, 300, 'EINSATZ', '#4aa8ff'], [356, 330, 'GEWINN', T.accent], [706, 282, 'LINIEN', '#6aff9a']]) { c.fillStyle = lg2(c, 0, fy, 0, fy + fh, [[0, '#0a0a12'], [1, '#000']]); rr2(c, x, fy, w, fh, 14); c.fill(); neon2(c, x, fy, w, fh, 14, col, 4, 18); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 10; c.font = '700 26px ' + UIF; c.fillText(label, x + w / 2, fy + 28); c.shadowBlur = 0; }
  const my = SCR_H - 62; rr2(c, 36, my, SCR_W - 72, 46, 12); c.fillStyle = '#05050a'; c.fill(); neon2(c, 36, my, SCR_W - 72, 46, 12, T.glow, 3, 14);
  baseCache.set(key, cv); return cv;
}
// Bildschirm des Automaten. st: { theme, grid, pos[5] (Walzenversatz in Feldern), spin[5], bet, win, show (Linien), free, msg, jackpot, t, attract }
export function drawScreen(c, W, H, st) {
  const T = THEMES[st.theme]; const t = st.t || 0; c.save(); c.drawImage(scrBase(T, W, H), 0, 0); c.scale(W / SCR_W, H / SCR_H);
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (T.jackpot) { c.font = '900 70px ' + HEAVY; c.shadowColor = T.glow; c.shadowBlur = 30; c.fillStyle = lg2(c, 0, 24, 0, 100, [[0, '#fff6c0'], [0.5, T.accent], [1, '#d08a00']]); c.fillText('TEO-JACKPOT ' + euro(st.jackpot || 0), SCR_W / 2, 66); c.shadowBlur = 0; }
  const won = st.win > 0; const hit = (r, col) => st.show && st.show.cells && st.show.cells.has(r * 5 + col);
  for (let col = 0; col < 5; col++) {
    const x0 = colX(col); c.save(); rr2(c, x0 + 2, GY + 2, CW - 4, GH - 4, 12); c.clip();
    const spin = st.spin && st.spin[col]; const pos = st.pos ? st.pos[col] : 0; const ds = CH * 1.0;
    if (spin) { const s = STRIP[col]; const off = pos % 1; const base = Math.floor(pos); c.globalAlpha = 0.85; for (let k = -1; k < 4; k++) { const sym = s[((base + k) % s.length + s.length) % s.length]; c.drawImage(sprite(T.sym[sym]), x0 + CW / 2 - ds / 2, GY + (k - off) * CH + CH / 2 - ds / 2, ds, ds); } c.globalAlpha = 1; c.fillStyle = lg2(c, 0, GY, 0, GY + GH, [[0, 'rgba(0,0,0,.65)'], [0.3, 'rgba(0,0,0,0)'], [0.7, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.65)']]); c.fillRect(x0, GY, CW, GH); c.fillStyle = 'rgba(160,200,255,.07)'; c.fillRect(x0, GY, CW, GH); }
    else { const bounce = st.pos ? Math.max(-0.2, Math.min(0.2, pos)) : 0; for (let row = 0; row < 3; row++) { const h = hit(row, col); const cy = GY + (row + bounce) * CH + CH / 2; if (h) { c.fillStyle = rg2(c, x0 + CW / 2, cy, 5, CW * 0.7, [[0, 'rgba(255,230,120,.75)'], [1, 'rgba(255,200,60,0)']]); c.fillRect(x0, cy - CH / 2, CW, CH); } const sc = (h ? 1.0 + 0.08 * Math.sin(t * 12) : 0.94) * ds; const sym = st.grid ? st.grid[row][col] : (row + col * 2) % 8; c.drawImage(sprite(T.sym[sym]), x0 + CW / 2 - sc / 2, cy - sc / 2, sc, sc); } }
    c.restore(); if ([0, 1, 2].some((r) => hit(r, col))) neon2(c, x0, GY, CW, GH, 14, T.accent, 4, 14);
  }
  if (st.show && st.show.lines) for (const L of st.show.lines) { const col = LINE_COLS[L.li % LINE_COLS.length]; c.save(); c.shadowColor = col; c.shadowBlur = 20; c.strokeStyle = col; c.lineWidth = 12; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); LINES[L.li].forEach((row, cc) => { const x = colX(cc) + CW / 2; const y = GY + row * CH + CH / 2; if (cc) c.lineTo(x, y); else c.moveTo(x, y); }); c.stroke(); c.shadowBlur = 0; c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke(); c.restore(); }
  const fy = GY + GH + 22; const fh = SCR_H - fy - 74;
  c.font = '900 62px ' + HEAVY; c.fillStyle = '#fff'; c.shadowColor = '#7ac0ff'; c.shadowBlur = 16; c.fillText(st.free ? 'FREISPIEL' : euro(st.bet || 0, true), 36 + 150, fy + fh * 0.7);
  c.shadowColor = won ? T.accent : '#ff6a6a'; c.fillStyle = won ? T.accent : '#fff'; c.fillText(euro(st.win || 0, true), 356 + 165, fy + fh * 0.7); c.shadowColor = '#6aff9a'; c.fillStyle = '#fff'; c.fillText('10', 706 + 141, fy + fh * 0.7); c.shadowBlur = 0;
  const my = SCR_H - 62; if (won) neon2(c, 36, my, SCR_W - 72, 46, 12, T.accent, 3, 14);
  c.font = '800 28px ' + UIF; c.fillStyle = won ? T.accent : st.free ? '#7affb8' : '#fff'; c.shadowColor = won ? T.accent : T.glow; c.shadowBlur = 12; c.fillText('◆  ' + (st.msg || (st.free ? 'FREISPIELE: ' + st.free : st.attract ? 'DRÜCK START' : '10 LINIEN · TEO = WILD')) + '  ◆', SCR_W / 2, my + 24); c.shadowBlur = 0;
  if (won) for (let i = 0; i < 24; i++) { const a = i * 2.399; const r = ((i * 37) % 100) / 100; const x = (SCR_W / 2 + Math.cos(a) * (200 + r * 300) + SCR_W) % SCR_W; const y = GY + ((i * 61 + t * 140) % GH); const tw = 0.5 + 0.5 * Math.sin(t * 10 + i); c.fillStyle = 'rgba(255,240,170,' + tw + ')'; c.beginPath(); c.arc(x, y, 3 + r * 3, 0, 7); c.fill(); }
  c.restore();
}
// Schild auf dem Aufsatz (1024 x 544): Krone, Name des Automaten in Chrom, roter Balken
export function drawMarquee(c, w, h, T) {
  const words = T.name.toUpperCase().split(' '); const big = words[0]; const sub = words.length > 1 ? words.slice(1).join(' ') : '10 LINIEN'; const bar = T.jackpot ? 'J A C K P O T' : sub === 'DELUXE' ? 'T E O S   C A S I N O' : 'D E   L U X E';
  c.fillStyle = '#030305'; c.fillRect(0, 0, w, h); c.fillStyle = rg2(c, w / 2, h / 2, 20, w * 0.6, [[0, '#2a2a34'], [1, '#050507']]); c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 2; for (let i = -h; i < w; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); }
  neon2(c, 10, 10, w - 20, h - 20, 30, T.glow, 8, 30);
  c.save(); c.translate(w / 2, 130); c.fillStyle = lg2(c, 0, -60, 0, 50, [[0, '#fff4b0'], [1, '#d08a00']]); c.shadowColor = '#ffb030'; c.shadowBlur = 30; c.beginPath(); c.moveTo(-90, 50); c.lineTo(-100, -40); c.lineTo(-50, 0); c.lineTo(0, -62); c.lineTo(50, 0); c.lineTo(100, -40); c.lineTo(90, 50); c.closePath(); c.fill(); c.shadowBlur = 0; for (const [x, y] of [[-100, -46], [0, -70], [100, -46]]) { c.fillStyle = T.glow; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); } c.restore();
  const fs = big.length > 7 ? 150 : 190; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 ' + fs + 'px ' + HEAVY; c.shadowColor = '#7ad0ff'; c.shadowBlur = 36; c.strokeStyle = '#18304a'; c.lineWidth = 14; c.lineJoin = 'round'; c.strokeText(big, w / 2, 272); c.shadowBlur = 0; c.fillStyle = lg2(c, 0, 200, 0, 350, [[0, '#ffffff'], [0.45, '#cfd6e0'], [0.5, '#8a93a4'], [1, '#e8ecf2']]); c.fillText(big, w / 2, 272);
  c.font = '900 56px ' + UIF; c.fillStyle = T.accent; c.shadowColor = T.glow; c.shadowBlur = 18; c.fillText(sub, w / 2, 404); c.shadowBlur = 0;
  c.fillStyle = lg2(c, 0, 440, 0, 520, [[0, '#ff2a3a'], [1, '#8a0010']]); rr2(c, 60, 440, w - 120, 64, 12); c.fill(); c.font = '900 40px ' + UIF; c.fillStyle = '#aee4ff'; c.shadowColor = '#3ab0ff'; c.shadowBlur = 24; c.fillText(bar, w / 2, 474); c.shadowBlur = 0;
}
