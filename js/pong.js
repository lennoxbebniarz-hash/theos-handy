// Theos Seitenscheidel - Quadrat-Pong: Arena, Steuerung, Tutorial und Netz. Der Host rechnet den Ball, jeder Mitspieler steuert seinen Schläger selbst und meldet die Position.
import { newMatch, step, movePad, botDir, clampPad, sidePoint, PAD, DEPTH, BALL, CORNER, AI, LIVES, PAD_SPEED } from './ponglogic.js';
import { createTour } from './tour.js';

export const SEATS = ['Rot', 'Blau', 'Gelb'];
const COLOR = ['#ff4d4f', '#3d9bff', '#ffd02e', '#cfd6dc'];
const TICK = 1 / 120;

function arena(ctx, w, h, S, view, names) {
  const size = Math.min(w, h) * 0.94; ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-view * Math.PI / 2); ctx.translate(-size / 2, -size / 2); ctx.scale(size, size);
  const bg = ctx.createRadialGradient(0.5, 0.5, 0.05, 0.5, 0.5, 0.75); bg.addColorStop(0, '#1b2a44'); bg.addColorStop(1, '#0b1120'); ctx.fillStyle = bg; ctx.fillRect(0, 0, 1, 1);
  ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 0.003; ctx.strokeRect(0.25, 0.25, 0.5, 0.5); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, 1); ctx.moveTo(1, 0); ctx.lineTo(0, 1); ctx.stroke();
  for (let s = 0; s < 4; s++) {
    const wall = !S.alive[s]; const a0 = sidePoint(s, 0); const a1 = sidePoint(s, CORNER); const b0 = sidePoint(s, 1 - CORNER); const b1 = sidePoint(s, 1); ctx.lineCap = 'butt'; ctx.lineWidth = 0.014;
    ctx.strokeStyle = '#59636e'; ctx.beginPath(); ctx.moveTo(...a0); ctx.lineTo(...(wall ? b1 : a1)); if (!wall) { ctx.moveTo(...b0); ctx.lineTo(...b1); } ctx.stroke();
    if (wall) continue;
    ctx.strokeStyle = COLOR[s] + (S.flash > 0 && S.lost === s ? '' : '55'); ctx.lineWidth = S.flash > 0 && S.lost === s ? 0.012 : 0.004; ctx.beginPath(); ctx.moveTo(...a1); ctx.lineTo(...b0); ctx.stroke();
    const p0 = sidePoint(s, S.p[s] - PAD / 2, DEPTH - 0.007); const p1 = sidePoint(s, S.p[s] + PAD / 2, DEPTH - 0.007); ctx.save(); ctx.shadowColor = COLOR[s]; ctx.shadowBlur = size * 0.02; ctx.strokeStyle = COLOR[s]; ctx.lineWidth = 0.02; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1); ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = size * 0.025; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(S.x, S.y, BALL, 0, 7); ctx.fill(); ctx.restore(); ctx.restore();
  if (S.hold > 0 && S.winner === null) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `700 ${size * 0.05}px Bahnschrift, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(names || 'Achtung', w / 2, h / 2 - size * 0.09); }
}
const demo = (patch) => ({ p: [0.5, 0.5, 0.5, 0.5], lives: [5, 5, 5, null], alive: [true, true, true, true], x: 0.5, y: 0.5, hold: 0, winner: null, lost: -1, flash: 0, ...patch });
const STEPS = [
  { t: 'Vier Seiten, ein Ball', x: 'Jeder verteidigt eine Seite des Quadrats. Rot, Blau und Gelb sind Spieler, die vierte Seite spielt immer die KI.', draw: (c, w, h, t) => { const u = (Math.sin(t * 1.4) + 1) / 2; arena(c, w, h, demo({ x: 0.2 + u * 0.6, y: 0.75 - u * 0.5, p: [0.2 + u * 0.6, 0.5, 0.5, 0.5] }), 0); } },
  { t: 'Schläger bewegen', x: 'Mit A und D, oder den Pfeiltasten, fährst du nach links und rechts. Deine Seite ist immer unten. Triffst du den Ball am Rand, fliegt er schräger.', draw: (c, w, h, t) => arena(c, w, h, demo({ p: [0.5 + Math.sin(t * 2) * 0.3, 0.5, 0.5, 0.5], x: 0.5, y: 0.8 }), 0) },
  { t: 'Fünf Leben', x: 'Geht der Ball in dein Tor, verlierst du ein Leben. Bei null wird deine Seite zur Wand. Wer als letzter Spieler übrig bleibt, gewinnt.', draw: (c, w, h, t) => arena(c, w, h, demo({ alive: [true, Math.sin(t * 1.2) > 0, true, true], flash: 1, lost: 0, x: 0.75, y: 0.94 }), 0) },
  { t: 'Die KI verliert nie', x: 'Die vierte Seite hält jeden Ball und spielt ihn der Reihe nach zu jedem Spieler. So bleibt es fair, und der Ball wird mit jedem Schlag schneller.', draw: (c, w, h, t) => { const y = 0.3 + Math.sin(t * 2) * 0.2; arena(c, w, h, demo({ x: 0.9, y, p: [0.5, 0.5, 0.5, 1 - y] }), 0); } },
];

export function createPong({ $, store, showScreen, endSession }) {
  const C = { S: null, net: null, host: true, seats: [], on: false, who: store.get('pgWho', 'bots'), keys: {}, last: 0, acc: 0, send: 0, timer: 0, raf: 0, shownEnd: false };
  const board = $('pgBoard'); const tour = createTour({ root: $('pong'), store, key: 'pgTutSeen', steps: STEPS });
  const mine = () => (C.net ? C.seats.findIndex((s) => s.id === (C.net.me && C.net.me.id)) : 0);
  const local = () => !C.net && C.who === 'local';
  const pair = (a, b) => (C.keys[b] ? 1 : 0) - (C.keys[a] ? 1 : 0);
  function dirOf(i) { if (local()) return i === 0 ? pair('KeyA', 'KeyD') : i === 1 ? pair('KeyJ', 'KeyL') : pair('ArrowRight', 'ArrowLeft'); return pair('KeyA', 'KeyD') + pair('ArrowLeft', 'ArrowRight'); }
  function panel() {
    const S = C.S; if (!S) return; const me = mine(); const st = $('pgStatus'); const box = $('pgSeats'); st.className = 'cs-status'; const dead = !local() && me >= 0 && !S.alive[me];
    if (S.winner !== null) st.textContent = C.seats[S.winner].name + ' gewinnt'; else if (dead) st.textContent = 'Du bist raus und schaust zu'; else { st.textContent = local() ? 'Haltet den Ball im Spiel' : 'A und D bewegen deinen Schläger'; st.classList.add('mine'); }
    box.textContent = ''; [...C.seats, { name: 'Die KI', kind: 'ai' }].forEach((q, i) => { const d = document.createElement('div'); d.className = 'cs-seat' + (S.alive[i] ? '' : ' out') + (i === me && !local() ? ' on' : ''); const dot = document.createElement('i'); dot.style.background = COLOR[i]; const tx = document.createElement('div'); const b = document.createElement('b'); b.textContent = q.name; const sm = document.createElement('small'); sm.textContent = i === AI ? 'unbesiegbar' : SEATS[i] + (q.kind === 'bot' ? ', KI' : ''); tx.append(b, sm); const em = document.createElement('em'); em.textContent = i === AI ? '∞' : '●'.repeat(Math.max(0, S.lives[i])); d.append(dot, tx, em); box.append(d); });
    $('pgBackT').textContent = C.net && C.host ? 'Sitzung beenden' : 'Verlassen';
    if (S.winner !== null && !C.shownEnd) { C.shownEnd = true; if (!local() && S.winner === mine()) window.dispatchEvent(new CustomEvent('theos:sieg', { detail: 'pong' })); /* Schul-Rangliste */ $('pgResTitle').textContent = C.seats[S.winner].name + ' gewinnt!'; $('pgResText').textContent = 'Die KI hat wie immer nichts durchgelassen.'; $('pgAgain').classList.toggle('hidden', !!C.net && !C.host); $('pgResult').classList.remove('hidden'); }
  }
  const lifeKey = (S) => S.lives.join() + S.alive.join() + S.winner;
  function tick() {
    if (!C.on || !C.S) return; const now = performance.now(); const dt = Math.min(0.25, (now - C.last) / 1000); C.last = now; const S = C.S; const me = mine();
    if (C.host) {
      C.acc += dt; const k0 = lifeKey(S); while (C.acc >= TICK) { C.acc -= TICK; if (!tour.open || C.net) { for (let i = 0; i < 3; i++) { if (!S.alive[i]) continue; const q = C.seats[i]; if (q.kind === 'bot') movePad(S, i, botDir(S, i), TICK); else if (q.kind !== 'human' || i === me) movePad(S, i, dirOf(i), TICK); } step(S, TICK); } } if (k0 !== lifeKey(S)) panel();
      C.send += dt; if (C.net && C.send > 0.033) { C.send = 0; const { p, lives, alive, x, y, vx, vy, hold, winner, lost, flash } = S; C.net.broadcast({ t: 'pstate', s: { p, lives, alive, x, y, vx, vy, hold, winner, lost, flash } }); }
    } else {
      if (S.hold <= 0 && S.winner === null) { S.x += S.vx * dt; S.y += S.vy * dt; } else S.hold -= dt; if (me >= 0 && S.alive[me]) { S.p[me] = clampPad(S.p[me] + dirOf(me) * PAD_SPEED * dt); C.send += dt; if (C.send > 0.033) { C.send = 0; C.net.send({ t: 'ppos', x: S.p[me] }); } }
    }
  }
  function loop() { if (!C.on) { C.raf = 0; return; } if (C.S) { const dpr = window.devicePixelRatio || 1; const w = board.clientWidth; const h = board.clientHeight; if (w && h) { if (board.width !== Math.round(w * dpr) || board.height !== Math.round(h * dpr)) { board.width = Math.round(w * dpr); board.height = Math.round(h * dpr); } const c = board.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); const me = mine(); arena(c, w, h, C.S, local() || me < 0 ? 0 : me, 'Achtung'); } } C.raf = requestAnimationFrame(loop); }
  function run() { C.on = true; C.last = performance.now(); clearInterval(C.timer); C.timer = setInterval(tick, 8); if (!C.raf) C.raf = requestAnimationFrame(loop); }
  function overlaysOff() { $('pgSetup').classList.add('hidden'); $('pgResult').classList.add('hidden'); }
  function begin() { C.shownEnd = false; C.acc = 0; overlaysOff(); C.S = newMatch(C.seats.map((q) => q.kind !== 'bot')); panel(); if (C.net) C.net.broadcast({ t: 'pseats', seats: C.seats, reset: true }); }
  function pickers() { for (const b of $('pgWho').children) b.classList.toggle('sel', b.dataset.who === C.who); }
  for (const b of $('pgWho').children) b.onclick = () => { C.who = b.dataset.who; store.set('pgWho', C.who); pickers(); };
  C.open = () => { C.net = null; C.host = true; C.S = null; showScreen('pong'); overlaysOff(); pickers(); $('pgSetup').classList.remove('hidden'); run(); };
  $('pgGo').onclick = () => { C.seats = C.who === 'local' ? [{ name: 'Rot (A D)', kind: 'local' }, { name: 'Blau (J L)', kind: 'local' }, { name: 'Gelb (Pfeile)', kind: 'local' }] : [{ name: 'Du', kind: 'me' }, { name: 'KI Theo', kind: 'bot' }, { name: 'KI Bruno', kind: 'bot' }]; begin(); tour.first(); };
  C.startCoop = ({ net, host }) => { C.net = net; C.host = host; C.S = null; C.shownEnd = false; overlaysOff(); showScreen('pong'); run(); if (host) { const pl = net.players; C.seats = [0, 1, 2].map((i) => (pl[i] ? { name: pl[i].name, kind: 'human', id: pl[i].id } : { name: ['KI Theo', 'KI Bruno', 'KI Nele'][i], kind: 'bot' })); begin(); } tour.first(); };
  C.message = (from, m) => {
    if (m.t === 'pseats' && !C.host) { C.seats = m.seats; if (m.reset) { C.shownEnd = false; overlaysOff(); } panel(); return; }
    if (m.t === 'pstate' && !C.host) { const old = C.S; const me = mine(); const keep = old && me >= 0 ? old.p[me] : null; const k = old ? lifeKey(old) : ''; if (m.s.winner === null && C.shownEnd) { C.shownEnd = false; overlaysOff(); } C.S = m.s; if (keep !== null && m.s.alive[me]) C.S.p[me] = keep; if (k !== lifeKey(C.S) && C.seats.length) panel(); return; }
    if (m.t === 'ppos' && C.host && C.S) { const i = C.seats.findIndex((q) => q.id === from); if (i >= 0 && C.seats[i].kind === 'human' && Number.isFinite(m.x)) C.S.p[i] = clampPad(m.x); }
  };
  C.playerLeft = (id) => { const q = C.seats.find((s) => s.id === id); if (!q) return; q.kind = 'bot'; q.name += ' (KI)'; panel(); if (C.net) C.net.broadcast({ t: 'pseats', seats: C.seats }); };
  C.playerJoined = (id, name) => { const q = C.seats.find((s) => s.kind === 'bot' && s.id === id) || C.seats.find((s) => s.kind === 'bot'); if (q) { q.kind = 'human'; q.id = id; q.name = name; } C.net.sendTo(id, { t: 'start', mode: 'pong' }); C.net.broadcast({ t: 'pseats', seats: C.seats }); panel(); };
  function back() { if (C.net) { C.stop(); endSession(); } else if (C.S) C.open(); else { C.stop(); showScreen('gallery'); } }
  $('pgBack').onclick = back; $('pgResBack').onclick = back; $('pgAgain').onclick = begin; $('pgHelp').onclick = tour.show; $('pgRules').onclick = tour.show; $('pgSetupBack').onclick = back;
  const TRACK = new Set(['KeyA', 'KeyD', 'KeyJ', 'KeyL', 'ArrowLeft', 'ArrowRight']);
  window.addEventListener('keydown', (e) => { if (!C.on) return; if (TRACK.has(e.code)) { C.keys[e.code] = true; e.stopImmediatePropagation(); e.preventDefault(); return; } if (e.code === 'Escape') { e.stopImmediatePropagation(); if (tour.open) tour.close(); else if (!C.net) back(); } }, true);
  window.addEventListener('keyup', (e) => { if (TRACK.has(e.code)) C.keys[e.code] = false; }, true);
  C.hide = () => { C.on = false; clearInterval(C.timer); C.keys = {}; };
  C.stop = () => { C.hide(); C.S = null; C.net = null; C.host = true; tour.close2 = 0; tour.open = false; tour.el.classList.add('hidden'); overlaysOff(); };
  C.active = () => !!C.S || !!C.net; C.tour = tour; C.LIVES = LIVES;
  return C;
}
