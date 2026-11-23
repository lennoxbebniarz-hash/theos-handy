// Theos Seitenscheidel - Dino-Lauf (Schulmodus, Lennox 2026-11-23): ein Dino mit Schulranzen rennt über den Schulhof.
// Regeln in dinologic.js, hier nur Bild, Tasten und Ablauf. Gezeichnet auf einer eigenen 2D-Fläche, die Ebenen im Hintergrund
// werden einmal vorgemalt und dann nur verschoben (viele Bilder pro Sekunde auch auf Schul-PCs).
// Leertaste/Pfeil hoch/W springen (halten = höher), Pfeil runter/S ducken, Maus/Finger springt auch. Esc: zurück.
import { newRun, step, meter, DINO } from './dinologic.js';

const TAU = Math.PI * 2;
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (c1, c2, k) => `rgb(${c1.map((v, i) => Math.round(lerp(v, c2[i], k))).join(',')})`;
// Tageszeit nach Strecke: Mittag, Abend, Nacht, Morgen, alle 1600 m einmal rum
const HIMMEL = [
  { at: 0, top: [96, 170, 255], low: [196, 232, 255] },
  { at: 0.3, top: [86, 150, 240], low: [190, 225, 250] },
  { at: 0.45, top: [92, 76, 168], low: [255, 160, 110] },
  { at: 0.6, top: [12, 18, 52], low: [40, 46, 98] },
  { at: 0.85, top: [20, 30, 80], low: [120, 100, 160] },
  { at: 1, top: [96, 170, 255], low: [196, 232, 255] },
];
function himmel(k) {
  for (let i = 1; i < HIMMEL.length; i++) if (k <= HIMMEL[i].at) { const A = HIMMEL[i - 1]; const B = HIMMEL[i]; const q = (k - A.at) / (B.at - A.at); return { top: mix(A.top, B.top, q), low: mix(A.low, B.low, q), nacht: Math.max(0, 1 - Math.abs(k - 0.68) / 0.2) }; }
  return { top: 'rgb(96,170,255)', low: 'rgb(196,232,255)', nacht: 0 };
}

function rnd(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
// Ebene vormalen: breiter Streifen, der sich nahtlos wiederholt
function layer(w, h, draw) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); draw(c.getContext('2d'), c.width, c.height); return c; }

function malSchule(px, H) {
  return layer(px * 16, H, (c, w, h) => {
    const r = rnd(7); const g = h * 0.62;
    for (let x = 0; x < w;) {
      const bw = px * (5 + r() * 4); const bh = px * (2.6 + r() * 2.2);
      c.fillStyle = r() < 0.5 ? '#c9b59a' : '#d6c2a0'; c.fillRect(x, g - bh, bw, bh);
      c.fillStyle = '#9a4a3a'; c.fillRect(x - px * 0.15, g - bh - px * 0.25, bw + px * 0.3, px * 0.32);
      for (let wy = g - bh + px * 0.5; wy < g - px * 0.9; wy += px * 0.95) for (let wx = x + px * 0.45; wx < x + bw - px * 0.6; wx += px * 0.9) { c.fillStyle = r() < 0.2 ? '#ffe9a6' : '#6f8fb0'; c.fillRect(wx, wy, px * 0.5, px * 0.55); }
      if (r() < 0.35) { c.fillStyle = '#5a3a2a'; c.fillRect(x + bw / 2 - px * 0.4, g - px * 1.2, px * 0.8, px * 1.2); c.fillStyle = '#f4f0e6'; c.font = `700 ${px * 0.42}px Bahnschrift, sans-serif`; c.textAlign = 'center'; c.fillText('SCHULE', x + bw / 2, g - bh + px * 0.32 + px * 0.42); }
      x += bw + px * (0.6 + r() * 2.5);
    }
  });
}
function malBaeume(px, H) {
  return layer(px * 14, H, (c, w, h) => {
    const r = rnd(19); const g = h * 0.7;
    for (let x = px; x < w - px; x += px * (1.6 + r() * 2.6)) {
      const s = 0.8 + r() * 0.6; c.fillStyle = '#6a4a32'; c.fillRect(x - px * 0.12 * s, g - px * 1.3 * s, px * 0.24 * s, px * 1.3 * s);
      for (const [dx, dy, rr, col] of [[0, -1.9, 0.9, '#3f8f45'], [-0.55, -1.5, 0.65, '#4aa050'], [0.55, -1.45, 0.7, '#38803e'], [0.1, -2.4, 0.6, '#55b05a']]) { c.fillStyle = col; c.beginPath(); c.arc(x + dx * px * s, g + dy * px * s, rr * px * s, 0, TAU); c.fill(); }
    }
  });
}
function malZaun(px, H) {
  return layer(px * 8, H, (c, w, h) => {
    const g = h * 0.78; c.strokeStyle = '#7d8794'; c.lineWidth = Math.max(1, px * 0.06);
    c.beginPath(); c.moveTo(0, g - px * 1.0); c.lineTo(w, g - px * 1.0); c.moveTo(0, g - px * 0.3); c.lineTo(w, g - px * 0.3); c.stroke();
    for (let x = 0; x < w; x += px * 0.5) { c.beginPath(); c.moveTo(x, g - px * 1.15); c.lineTo(x, g); c.stroke(); }
  });
}

// ---------------- Figuren ----------------
function malDino(c, px, x, gy, S, t) {
  const y = gy - S.y * px; const duck = S.duck; const run = S.ground ? t * (8 + S.speed * 0.6) : 0;
  c.save(); c.translate(x, y);
  // Schatten
  c.globalAlpha = 0.22 * Math.max(0.3, 1 - S.y / 2); c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, S.y * px, px * 0.55, px * 0.1, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
  const green = '#5fbf4a'; const dark = '#3e8f34'; const belly = '#d8f0a0';
  const k = duck ? 0.62 : 1; const lean = duck ? 0.25 : Math.min(0.2, S.speed / 120);
  c.rotate(lean * 0.4);
  // Beine
  for (const [ph, col] of [[0, dark], [Math.PI, green]]) {
    const a = S.ground ? Math.sin(run + ph) * 0.7 : (ph ? 0.5 : -0.4);
    c.save(); c.translate(-px * 0.05, -px * 0.55 * k); c.rotate(a); c.fillStyle = col; c.beginPath(); c.roundRect(-px * 0.1, 0, px * 0.2, px * 0.5 * k, px * 0.08); c.fill();
    c.beginPath(); c.roundRect(-px * 0.08, px * 0.43 * k, px * 0.3, px * 0.12, px * 0.05); c.fill(); c.restore();
  }
  // Schwanz
  c.fillStyle = green; c.beginPath(); c.moveTo(-px * 0.35, -px * 0.95 * k); c.quadraticCurveTo(-px * 1.0, -px * (0.9 + Math.sin(run) * 0.08) * k, -px * 1.25, -px * 0.62 * k); c.quadraticCurveTo(-px * 0.8, -px * 0.62 * k, -px * 0.3, -px * 0.62 * k); c.fill();
  // Körper
  c.beginPath(); c.ellipse(0, -px * 0.95 * k, px * 0.55, px * 0.42 * k, -0.15, 0, TAU); c.fill();
  c.fillStyle = belly; c.beginPath(); c.ellipse(px * 0.15, -px * 0.84 * k, px * 0.33, px * 0.27 * k, -0.2, 0, TAU); c.fill();
  // Zacken
  c.fillStyle = dark; for (let i = 0; i < 4; i++) { const bx = -px * (0.05 + i * 0.17); const by = -px * (1.33 - i * 0.05) * k; c.beginPath(); c.moveTo(bx - px * 0.08, by + px * 0.06); c.lineTo(bx, by - px * 0.12); c.lineTo(bx + px * 0.08, by + px * 0.06); c.fill(); }
  // Ranzen
  c.fillStyle = '#d8342c'; c.beginPath(); c.roundRect(-px * 0.62, -px * 1.28 * k, px * 0.42, px * 0.52 * k, px * 0.08); c.fill();
  c.fillStyle = '#ffd02e'; c.beginPath(); c.roundRect(-px * 0.7, -px * 1.1 * k, px * 0.14, px * 0.3 * k, px * 0.04); c.fill();
  c.strokeStyle = '#2a2f3a'; c.lineWidth = px * 0.06; c.beginPath(); c.moveTo(-px * 0.22, -px * 1.22 * k); c.lineTo(px * 0.08, -px * 0.8 * k); c.stroke();
  // Kopf
  const hx = duck ? px * 0.62 : px * 0.45; const hy = duck ? -px * 0.9 : -px * 1.55;
  c.fillStyle = green; c.beginPath(); c.ellipse(hx, hy, px * 0.36, px * 0.27, 0.1, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(hx + px * 0.25, hy + px * 0.07, px * 0.24, px * 0.16, 0, 0, TAU); c.fill();
  c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + px * 0.1, hy - px * 0.08, px * 0.1, 0, TAU); c.fill();
  c.fillStyle = '#15151a'; c.beginPath(); c.arc(hx + px * 0.14, hy - px * 0.07, px * 0.05, 0, TAU); c.fill();
  c.strokeStyle = '#15151a'; c.lineWidth = px * 0.035; c.beginPath(); c.arc(hx + px * 0.3, hy + px * 0.08, px * 0.11, 0.2, Math.PI - 0.6); c.stroke();
  // Ärmchen
  c.strokeStyle = green; c.lineWidth = px * 0.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(px * 0.3, -px * 0.85 * k); c.lineTo(px * 0.48, -px * (0.7 + Math.sin(run * 1.3) * 0.05) * k); c.stroke();
  c.restore();
}
function malHindernis(c, px, o, x, gy, t) {
  const w = o.w * px; const h = o.h * px; const y = gy - o.y * px - h;
  c.save();
  if (!o.y) { c.globalAlpha = 0.2; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x + w / 2, gy, w * 0.55, px * 0.08, 0, 0, TAU); c.fill(); c.globalAlpha = 1; }
  if (o.kind === 'ranzen') {
    c.fillStyle = '#5a5ad8'; c.beginPath(); c.roundRect(x, y, w, h, w * 0.22); c.fill();
    c.fillStyle = '#7a7af0'; c.beginPath(); c.roundRect(x + w * 0.15, y + h * 0.45, w * 0.7, h * 0.4, w * 0.12); c.fill();
    c.strokeStyle = '#ffd02e'; c.lineWidth = px * 0.05; c.beginPath(); c.moveTo(x + w * 0.2, y + h * 0.65); c.lineTo(x + w * 0.8, y + h * 0.65); c.stroke();
    c.strokeStyle = '#2a2f3a'; c.lineWidth = px * 0.06; c.beginPath(); c.arc(x + w / 2, y + h * 0.05, w * 0.22, Math.PI, 0); c.stroke();
  } else if (o.kind === 'muell') {
    c.fillStyle = '#2f8a4a'; c.beginPath(); c.moveTo(x + w * 0.08, y + h * 0.15); c.lineTo(x + w * 0.92, y + h * 0.15); c.lineTo(x + w * 0.82, y + h); c.lineTo(x + w * 0.18, y + h); c.fill();
    c.fillStyle = '#246e3a'; for (let i = 1; i < 4; i++) c.fillRect(x + w * (0.12 + i * 0.19), y + h * 0.25, w * 0.06, h * 0.65);
    c.fillStyle = '#3aa65a'; c.beginPath(); c.roundRect(x, y, w, h * 0.17, h * 0.05); c.fill();
    c.fillStyle = '#f4f0e6'; c.beginPath(); c.arc(x + w * 0.62, y - h * 0.02, w * 0.12, 0, TAU); c.fill();
  } else if (o.kind === 'buecher') {
    const cols = ['#d8342c', '#2f7ad8', '#f0b52a', '#7ed957'];
    for (let i = 0; i < 3; i++) { const bh = h / 3; const off = [0, 0.06, -0.04][i] * w; c.fillStyle = cols[i]; c.beginPath(); c.roundRect(x + off, y + h - bh * (i + 1), w * (1 - i * 0.08), bh * 0.94, px * 0.04); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.fillRect(x + off + w * 0.08, y + h - bh * (i + 1) + bh * 0.3, w * 0.7, bh * 0.12); }
  } else if (o.kind === 'pylone') {
    c.fillStyle = '#ff7a1a'; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w * 0.85, y + h * 0.9); c.lineTo(x + w * 0.15, y + h * 0.9); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x + w * 0.35, y + h * 0.4); c.lineTo(x + w * 0.65, y + h * 0.4); c.lineTo(x + w * 0.72, y + h * 0.58); c.lineTo(x + w * 0.28, y + h * 0.58); c.fill();
    c.fillStyle = '#e06010'; c.fillRect(x, y + h * 0.88, w, h * 0.12);
  } else if (o.kind === 'flieger') {
    const bob = Math.sin(t * 6 + o.spin) * px * 0.05; c.translate(0, bob);
    c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x, y + h * 0.5); c.lineTo(x + w, y); c.lineTo(x + w * 0.62, y + h); c.closePath(); c.fill();
    c.fillStyle = '#d6dce6'; c.beginPath(); c.moveTo(x, y + h * 0.5); c.lineTo(x + w * 0.62, y + h); c.lineTo(x + w * 0.55, y + h * 0.55); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = px * 0.03; for (let i = 1; i <= 3; i++) { c.beginPath(); c.moveTo(x + w + i * px * 0.18, y + h * (0.2 + i * 0.12)); c.lineTo(x + w + i * px * 0.18 + px * 0.25, y + h * (0.2 + i * 0.12)); c.stroke(); }
  } else if (o.kind === 'ball') {
    const r = w / 2; const cx = x + r; const cy = y + r; c.translate(cx, cy); c.rotate(-o.spin);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.fillStyle = '#1a1a1e';
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; c.beginPath(); c.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.22, 0, TAU); c.fill(); }
    c.beginPath(); c.arc(0, 0, r * 0.28, 0, TAU); c.fill(); c.strokeStyle = '#1a1a1e'; c.lineWidth = px * 0.02; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  }
  c.restore();
}

export function createDino({ $, store, showScreen, G, zurueck, melde, rangText }) {
  const cv = $('dnCanvas'); const ctx = cv.getContext('2d');
  const D = { S: null, on: false, keys: {}, ptr: false, t: 0, lay: null, layKey: '', dust: [], phase: 'start', dpr: 1, rekord: 0, landed: true };
  const best = () => store.get('dinoBest', 0);
  function setPhase(p) {
    D.phase = p;
    $('dnStart').classList.toggle('hidden', p !== 'start');
    $('dnOver').classList.toggle('hidden', p !== 'over');
    $('dnHud').classList.toggle('hidden', p === 'start');
  }
  function begin() { D.S = newRun(Math.floor(Math.random() * 1e9)); D.dust = []; D.t = 0; D.keys = {}; D.ptr = false; setPhase('play'); }
  function ende() {
    const m = meter(D.S); const alt = best(); if (m > alt) store.set('dinoBest', m);
    const r = melde('dino', m);
    $('dnOverM').textContent = `${m} m`;
    $('dnOverRek').textContent = m > alt ? 'Neuer Rekord!' : `Dein Rekord: ${Math.max(alt, m)} m`;
    $('dnOverRang').textContent = rangText('dino');
    $('dnOver').classList.toggle('rekord', m > alt);
    setPhase('over'); D.wait = 0.45; // kurz warten, damit ein gehaltener Sprung nicht gleich neu startet
    void r;
  }
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); const w = window.innerWidth; const h = window.innerHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    D.dpr = dpr; D.w = w; D.h = h; D.px = Math.max(26, Math.min(h / 7.2, w / 11)); D.gy = h * (h > w * 1.2 ? 0.66 : 0.78); // hochkant (Handy) steht der Boden höher
    const key = `${Math.round(D.px)}x${h}`;
    if (key !== D.layKey) { D.layKey = key; D.lay = { schule: malSchule(D.px * 0.7, h), baeume: malBaeume(D.px * 0.85, h), zaun: malZaun(D.px, h) }; }
  }
  function strip(img, speed, y = 0) {
    const off = -((D.dist * D.px * speed) % img.width);
    for (let x = off; x < D.w; x += img.width) ctx.drawImage(img, x, y);
  }
  function draw(dt) {
    resize();
    const S = D.S || { dist: 0, speed: 0, y: 0, duck: false, ground: true, obs: [], t: 0 };
    D.dist = S.dist; const px = D.px; const w = D.w; const h = D.h; const gy = D.gy; const dx = w * 0.22;
    ctx.setTransform(D.dpr, 0, 0, D.dpr, 0, 0);
    const H = himmel((S.dist % 1600) / 1600);
    const sky = ctx.createLinearGradient(0, 0, 0, gy); sky.addColorStop(0, H.top); sky.addColorStop(1, H.low); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, gy + 2);
    if (H.nacht > 0.05) { ctx.fillStyle = `rgba(255,255,255,${H.nacht * 0.8})`; const r = rnd(3); for (let i = 0; i < 70; i++) ctx.fillRect(r() * w, r() * gy * 0.7, 2, 2); ctx.fillStyle = `rgba(245,240,220,${H.nacht})`; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.16, px * 0.45, 0, TAU); ctx.fill(); } else { ctx.fillStyle = 'rgba(255,236,160,.95)'; ctx.beginPath(); ctx.arc(w * 0.8, h * (0.14 + ((S.dist % 1600) / 1600) * 0.4), px * 0.55, 0, TAU); ctx.fill(); }
    // Wolken
    ctx.fillStyle = `rgba(255,255,255,${0.75 - H.nacht * 0.55})`;
    for (let i = 0; i < 5; i++) { const cx = ((i * 0.27 * w - S.dist * px * 0.04) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * 0.2; const cy = h * (0.12 + (i % 3) * 0.07); for (const [ox, oy, rr] of [[0, 0, 0.5], [0.45, 0.08, 0.38], [-0.45, 0.1, 0.34], [0.15, -0.2, 0.36]]) { ctx.beginPath(); ctx.arc(cx + ox * px, cy + oy * px, rr * px, 0, TAU); ctx.fill(); } }
    const L = D.lay;
    strip(L.schule, 0.12, gy - h * 0.62 + px * 0.05);
    strip(L.baeume, 0.3, gy - h * 0.7 + px * 0.05);
    strip(L.zaun, 0.6, gy - h * 0.78);
    if (H.nacht > 0.02) { ctx.fillStyle = `rgba(8,12,40,${H.nacht * 0.45})`; ctx.fillRect(0, 0, w, gy); }
    // Schulhof
    const ground = ctx.createLinearGradient(0, gy, 0, h); ground.addColorStop(0, '#8a8f99'); ground.addColorStop(1, '#5d626c'); ctx.fillStyle = ground; ctx.fillRect(0, gy, w, h - gy);
    ctx.fillStyle = '#a6abb4'; ctx.fillRect(0, gy, w, px * 0.06);
    const step2 = px * 2.4; const off = -((S.dist * px) % step2);
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = px * 0.05;
    for (let x = off; x < w + step2; x += step2) { ctx.beginPath(); ctx.moveTo(x, gy + px * 0.55); ctx.lineTo(x + px * 1.1, gy + px * 0.55); ctx.stroke(); }
    const hop = px * 13; const hoff = -((S.dist * px) % hop); // Himmel-und-Hölle-Felder auf dem Boden
    ctx.strokeStyle = 'rgba(255,214,90,.55)'; ctx.lineWidth = px * 0.04;
    for (let x = hoff + hop * 0.6; x < w + hop; x += hop) for (let i = 0; i < 4; i++) ctx.strokeRect(x + i * px * 0.6, gy + px * 0.8, px * 0.55, px * 0.45);
    if (H.nacht > 0.02) { ctx.fillStyle = `rgba(8,12,40,${H.nacht * 0.4})`; ctx.fillRect(0, gy, w, h - gy); }
    // Hindernisse, Staub, Dino
    for (const o of S.obs) malHindernis(ctx, px, o, dx + o.x * px, gy, D.t);
    for (const q of D.dust) { ctx.globalAlpha = Math.max(0, q.life) * 0.5; ctx.fillStyle = '#d8d4cc'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    malDino(ctx, px, dx, gy, S, D.t);
    if (S.speed > 15) { ctx.strokeStyle = `rgba(255,255,255,${(S.speed - 15) / 30})`; ctx.lineWidth = 2; const r = rnd(Math.floor(D.t * 20) + 1); for (let i = 0; i < 8; i++) { const yy = r() * gy; const xx = r() * w; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + px * 1.2, yy); ctx.stroke(); } }
    if (D.S) { $('dnM').textContent = `${meter(D.S)} m`; $('dnBest').textContent = `Rekord ${Math.max(best(), meter(D.S))} m`; }
  }
  function frame(dt) {
    if (!D.on) return;
    D.t += dt;
    if (D.phase === 'play' && D.S) {
      const input = { jump: !!(D.keys.Space || D.keys.ArrowUp || D.keys.KeyW || D.ptr), duck: !!(D.keys.ArrowDown || D.keys.KeyS) };
      const was = D.S.ground; let left = Math.min(dt, 0.1);
      while (left > 0 && !D.S.over) { const h = Math.min(left, 1 / 120); step(D.S, h, input); left -= h; }
      if (!was && D.S.ground) for (let i = 0; i < 6; i++) D.dust.push({ x: D.w * 0.22 + (Math.random() - 0.5) * D.px * 0.6, y: D.gy, r: D.px * (0.06 + Math.random() * 0.08), vx: -D.px * (1 + Math.random() * 2), vy: -D.px * Math.random(), life: 0.6 });
      if (D.S.ground && Math.random() < dt * D.S.speed * 0.6) D.dust.push({ x: D.w * 0.22 - D.px * 0.2, y: D.gy, r: D.px * 0.05, vx: -D.px * 3, vy: -D.px * 0.3, life: 0.4 });
      if (D.S.over) ende();
    } else if (D.phase === 'over') D.wait = Math.max(0, (D.wait || 0) - dt);
    for (const q of D.dust) { q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
    D.dust = D.dust.filter((q) => q.life > 0);
    draw(dt);
  }
  const SPRUNG = new Set(['Space', 'ArrowUp', 'KeyW']); const DUCK = new Set(['ArrowDown', 'KeyS']);
  function los() { if (D.phase === 'start') begin(); else if (D.phase === 'over' && !D.wait) begin(); }
  window.addEventListener('keydown', (e) => {
    if (!D.on) return;
    if (SPRUNG.has(e.code) || DUCK.has(e.code) || e.code === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat && (SPRUNG.has(e.code) || e.code === 'Enter') && D.phase !== 'play') { los(); return; } D.keys[e.code] = true; return; }
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (D.phase === 'play') { D.S.over = true; ende(); } else back(); }
  }, true);
  window.addEventListener('keyup', (e) => { if (D.on && (SPRUNG.has(e.code) || DUCK.has(e.code))) D.keys[e.code] = false; }, true);
  cv.addEventListener('pointerdown', (e) => { if (!D.on) return; e.preventDefault(); if (D.phase !== 'play') { los(); return; } D.ptr = true; });
  window.addEventListener('pointerup', () => { D.ptr = false; });
  window.addEventListener('blur', () => { D.keys = {}; D.ptr = false; });
  function open() { D.on = true; G.mode = 'dino'; D.S = null; showScreen('dino'); $('dnStartRek').textContent = best() ? `Dein Rekord: ${best()} m` : 'Noch kein Rekord.'; setPhase('start'); }
  function stop() { D.on = false; D.S = null; D.keys = {}; D.ptr = false; }
  function back() { stop(); zurueck(); }
  $('dnGo').onclick = () => begin(); $('dnAgain').onclick = () => begin(); $('dnBack').onclick = back; $('dnBack2').onclick = back;
  return { open, stop, frame, active: () => D.on, state: D, back };
}
