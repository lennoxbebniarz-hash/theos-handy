// Theos Seitenscheidel - Dreierschach: Brett, Oberfläche, Regel-Tour und Netz. Der Host rechnet alle Züge, Mitspieler schicken nur Wünsche; freie Plätze spielt die KI beim Host.
import { SEATS, END_NAMES, END_TEXT, idx, cellOf, isLight, isRosette, newGame, legal, play, bestMove, pseudo } from './chesslogic.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const COLOR = [{ fill: '#d3262e', line: '#fff0ec', dot: '#d3262e' }, { fill: '#fbf6e8', line: '#23211d', dot: '#fbf6e8' }, { fill: '#1c1d21', line: '#dfe1e4', dot: '#1c1d21' }];
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

// Sechseck mit Mitte: jede Hälfte besteht aus zwei Vierecken, Grundreihe außen, Reihe 3 an der Mitte
function geometry(w, h, view) {
  const R = Math.min(w / 2, h / 1.74) * 0.95; const cx = w / 2; const cy = h / 2; const apo = R * Math.sqrt(3) / 2;
  const pol = (deg, r) => [cx + Math.cos(deg * Math.PI / 180) * r, cy + Math.sin(deg * Math.PI / 180) * r];
  const corners = (p) => { const th = 90 + ((p - view + 3) % 3) * 120; return { a: pol(th + 30, R), b: pol(th, apo), z: pol(th - 30, R), jl: pol(th + 60, apo), jr: pol(th - 60, apo), c: [cx, cy] }; };
  const pt = (p, x, y) => { const q = corners(p); const v = y / 4; if (x <= 4) { const u = x / 4; return lerp(lerp(q.a, q.b, u), lerp(q.jl, q.c, u), v); } const u = (x - 4) / 4; return lerp(lerp(q.b, q.z, u), lerp(q.c, q.jr, u), v); };
  const cells = []; for (let i = 0; i < 96; i++) { const c = cellOf(i); const poly = [pt(c.p, c.f, c.r), pt(c.p, c.f + 1, c.r), pt(c.p, c.f + 1, c.r + 1), pt(c.p, c.f, c.r + 1)]; cells.push({ poly, mid: [poly.reduce((s, q) => s + q[0], 0) / 4, poly.reduce((s, q) => s + q[1], 0) / 4], size: Math.sqrt(Math.abs(poly.reduce((s, q, k) => { const n = poly[(k + 1) % 4]; return s + q[0] * n[1] - n[0] * q[1]; }, 0)) / 2) }); }
  return { R, cx, cy, cells, corners, hex: [0, 1, 2, 3, 4, 5].map((k) => pol(k * 60, R * 1.045)) };
}
function path(ctx, poly) { ctx.beginPath(); poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.closePath(); }
function drawPiece(ctx, pc, x, y, size, frozen) {
  const col = COLOR[pc.o]; ctx.save(); ctx.font = `${size * 0.96}px "Segoe UI Symbol", "Noto Sans Symbols2", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; const g = GLYPH[pc.k] + '︎'; const py = y + size * 0.04;
  ctx.fillStyle = 'rgba(0,0,0,.34)'; ctx.fillText(g, x + size * 0.03, py + size * 0.05); if (frozen) ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1.4, size * 0.075); ctx.strokeStyle = frozen ? '#666' : col.line; ctx.strokeText(g, x, py); ctx.fillStyle = frozen ? '#9a9c9f' : col.fill; ctx.fillText(g, x, py); ctx.restore();
}
// Zeichnet ein Brett; o: { sel, targets, last, alarm, glow, anim }
function draw(canvas, S, view, o = {}) {
  const dpr = window.devicePixelRatio || 1; const w = canvas.clientWidth; const h = canvas.clientHeight; if (!w || !h) return null;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); const g = geometry(w, h, view);
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = g.R * 0.08; ctx.shadowOffsetY = g.R * 0.025; path(ctx, g.hex); const wood = ctx.createLinearGradient(0, g.cy - g.R, 0, g.cy + g.R); wood.addColorStop(0, '#6c452b'); wood.addColorStop(1, '#3d2517'); ctx.fillStyle = wood; ctx.fill(); ctx.restore();
  g.cells.forEach((c, i) => {
    path(ctx, c.poly); ctx.fillStyle = isLight(i) ? '#ecdfc4' : '#a87a52'; if (isRosette(i)) ctx.fillStyle = isLight(i) ? '#f6e7a6' : '#c98f3f'; ctx.fill();
    if (o.last && (o.last.from === i || o.last.to === i)) { ctx.fillStyle = 'rgba(249,189,0,.42)'; ctx.fill(); }
    if (o.glow && o.glow.includes(i)) { ctx.fillStyle = 'rgba(10,79,156,.5)'; ctx.fill(); }
    if (o.alarm === i) { ctx.fillStyle = 'rgba(197,22,29,.68)'; ctx.fill(); } if (o.sel === i) { ctx.fillStyle = 'rgba(0,129,90,.62)'; ctx.fill(); }
    ctx.strokeStyle = 'rgba(40,24,14,.42)'; ctx.lineWidth = 1; ctx.stroke();
  });
  for (let p = 0; p < 3; p++) { const q = g.corners(p); ctx.beginPath(); ctx.moveTo(...q.a); ctx.lineTo(...q.z); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(4, g.R * 0.016); ctx.strokeStyle = S.alive[p] ? COLOR[p].dot : '#777'; ctx.stroke(); }
  ctx.beginPath(); ctx.arc(g.cx, g.cy, Math.max(2.5, g.R * 0.012), 0, 7); ctx.fillStyle = '#2b1a10'; ctx.fill();
  S.b.forEach((pc, i) => { if (!pc || (o.anim && o.anim.to === i)) return; const c = g.cells[i]; drawPiece(ctx, pc, c.mid[0], c.mid[1], c.size * 0.98 + g.R * 0.012, !S.alive[pc.o]); });
  if (o.targets) for (const m of o.targets) { const c = g.cells[m]; ctx.beginPath(); if (S.b[m]) { ctx.arc(c.mid[0], c.mid[1], c.size * 0.42, 0, 7); ctx.lineWidth = Math.max(2.5, c.size * 0.1); ctx.strokeStyle = 'rgba(197,22,29,.92)'; ctx.stroke(); } else { ctx.arc(c.mid[0], c.mid[1], c.size * 0.17, 0, 7); ctx.fillStyle = 'rgba(0,129,90,.9)'; ctx.fill(); } }
  if (o.anim) { const pc = S.b[o.anim.to]; if (pc) { const a = g.cells[o.anim.from].mid; const b = g.cells[o.anim.to].mid; const t = 1 - (1 - o.anim.t) ** 3; const q = lerp(a, b, t); drawPiece(ctx, pc, q[0], q[1], g.cells[o.anim.to].size * 0.98 + g.R * 0.012, false); } }
  return g;
}
function hit(g, x, y) { if (!g) return -1; for (let i = 0; i < 96; i++) { const q = g.cells[i].poly; let inside = false; for (let a = 0, b = 3; a < 4; b = a++) if ((q[a][1] > y) !== (q[b][1] > y) && x < (q[b][0] - q[a][0]) * (y - q[a][1]) / (q[b][1] - q[a][1]) + q[a][0]) inside = !inside; if (inside) return i; } return -1; }

// Regel-Tour: jede Station zeigt echte Züge aus der Spiellogik
function demo(list) { const S = newGame(2); S.b = S.b.map(() => null); for (const [k, o, p, f, r] of list) S.b[idx(p, f, r)] = { k, o, h: o, m: 1 }; return S; }
const roseCells = [0, 1, 2].flatMap((p) => [idx(p, 3, 3), idx(p, 4, 3)]);
const TOUR = [
  { t: 'Drei Seiten, ein Brett', x: 'Jeder startet an seiner eigenen Seite des Sechsecks mit den normalen 16 Figuren. Alle Damen stehen auf hellen Feldern. Rot beginnt, dann Weiß, dann Schwarz, also im Uhrzeigersinn.', S: () => newGame(2) },
  { t: 'Züge wie im normalen Schach', x: 'Alle Figuren ziehen wie immer. Nur die Felder sind verzogen. Denk in Nachbarfeldern: Die Linien laufen über die Brettmitte weiter auf die Seite des Nachbarn.', S: () => demo([['r', 0, 0, 2, 1]]), from: idx(0, 2, 1) },
  { t: 'Die Rosette', x: 'Die sechs blauen Felder in der Mitte sind die Rosette. Hier gelten die Sonderregeln. Gegenüberliegende Rosettenfelder haben verschiedene Farben und sind nicht miteinander verbunden.', S: () => demo([]), glow: roseCells },
  { t: 'Diagonale durch die Mitte', x: 'Läufer und Dame teilen sich am Mittelpunkt: Du darfst auf beiden Rosettenfeldern gleicher Farbe weiterziehen. Die Figur bleibt immer auf ihrer Farbe.', S: () => demo([['b', 0, 0, 1, 1]]), from: idx(0, 1, 1) },
  { t: 'Gerade an der Rosette', x: 'Türme laufen nie quer über die Mitte. Sie verlassen jedes Feld durch die gegenüberliegende Kante und werden so nach außen abgelenkt, auf die Seite des Nachbarn.', S: () => demo([['r', 0, 0, 3, 3]]), from: idx(0, 3, 3) },
  { t: 'Der König in der Mitte', x: 'Auf der Rosette darf der König auf jedes angrenzende Feld, nur nicht auf die gegenüberliegende Seite mit der anderen Farbe.', S: () => demo([['k', 0, 0, 4, 3]]), from: idx(0, 4, 3) },
  { t: 'Der Springer', x: 'Der Springer springt nie über den Mittelpunkt, sondern macht sein L außen herum über die angrenzenden Felder.', S: () => demo([['n', 0, 0, 3, 3]]), from: idx(0, 3, 3) },
  { t: 'Der Bauer', x: 'Bauern laufen zur nächsten gegnerischen Seite. Auf der Rosette schlagen sie nur auf ein Rosettenfeld gleicher Farbe. An der Grundreihe jedes Gegners wandeln sie sich um.', S: () => demo([['p', 0, 0, 3, 3], ['n', 2, 2, 3, 3], ['n', 1, 1, 3, 3], ['n', 2, 2, 4, 3]]), from: idx(0, 3, 3) },
  { t: 'Rochade', x: 'König und Turm dürfen tauschen, wenn beide noch nicht gezogen haben, die Felder dazwischen frei sind und der König nicht im Schach steht oder über ein bedrohtes Feld läuft. Tippe den König an und zieh ihn zwei Felder Richtung Turm, der Turm springt dann auf die andere Seite.', S: () => { const S = newGame(2); for (const f of [1, 2, 3, 5, 6]) S.b[idx(0, f, 0)] = null; return S; }, from: idx(0, 4, 0), real: true },
  { t: 'Wie die Partie endet', x: 'Drei Varianten:\n1. Erstes Matt gewinnt.\n2. Figuren erben: Wer mattsetzt, übernimmt die Figuren.\n3. Bis zum Letzten: Figuren des Matten bleiben eingefroren stehen. Sie geben kein Schach, blockieren aber den Weg.', S: () => newGame(2) },
];

export function createChess({ $, store, showScreen, toast, endSession }) {
  const C = { S: null, seats: [], net: null, host: true, on: false, view: 0, sel: -1, moves: [], botMs: 750, anim: null, tut: 0, tutOpen: false, who: store.get('csWho', 'bots'), end: store.get('csEnd', 2), pending: null, gm: null, raf: 0, botT: 0, shownEnd: null };
  const board = $('csBoard'); const tutBoard = $('csTutBoard');
  const mySeat = () => { if (!C.net) return C.who === 'local' ? C.S.turn : 0; const id = C.net.me && C.net.me.id; return C.seats.findIndex((s) => s.id === id); };
  const canMove = () => C.S && C.S.winner === null && C.S.alive[C.S.turn] && (C.net ? mySeat() === C.S.turn : C.seats[C.S.turn].kind !== 'bot');
  const setView = () => { if (C.S) C.view = Math.max(0, mySeat()); };

  function loop(now) {
    if (!C.on) { C.raf = 0; return; }
    if (C.S) { if (C.anim) { C.anim.t = Math.min(1, (now - C.anim.t0) / 190); if (C.anim.t >= 1) C.anim = null; } const lm = C.S.last; const kAlarm = C.S.checks.findIndex(Boolean); C.gm = draw(board, C.S, C.view, { sel: C.sel, targets: C.moves.map((m) => m.to), last: lm, alarm: kAlarm >= 0 ? C.S.b.findIndex((p) => p && p.k === 'k' && p.o === kAlarm) : -1, anim: C.anim }); }
    if (C.tutOpen) drawTut();
    C.raf = requestAnimationFrame(loop);
  }
  const startLoop = () => { C.on = true; if (!C.raf) C.raf = requestAnimationFrame(loop); };
  function panel() {
    const S = C.S; if (!S) return; const st = $('csStatus'); const me = mySeat(); const t = S.turn; const local = !C.net && C.who === 'local';
    $('csEnd').textContent = END_NAMES[S.end]; st.className = 'cs-status';
    if (S.winner !== null) st.textContent = S.winner < 0 ? 'Remis' : C.seats[S.winner].name + ' gewinnt';
    else if (canMove()) { st.textContent = S.checks[t] ? 'Schach! Rette deinen König' : local ? SEATS[t] + ' ist am Zug' : 'Du bist am Zug'; st.classList.add(S.checks[t] ? 'alarm' : 'mine'); } else st.textContent = C.seats[t].name + ' denkt nach';
    const box = $('csSeats'); box.textContent = ''; C.seats.forEach((s, i) => { const d = document.createElement('div'); d.className = 'cs-seat' + (S.winner === null && t === i ? ' on' : '') + (S.alive[i] ? '' : ' out'); const dot = document.createElement('i'); dot.style.background = COLOR[i].dot; const tx = document.createElement('div'); const b = document.createElement('b'); b.textContent = s.name; const sm = document.createElement('small'); sm.textContent = SEATS[i] + (s.kind === 'bot' ? ', KI' : '') + (i === me && !local ? ', du' : '') + (S.alive[i] ? '' : ', ausgeschieden'); tx.append(b, sm); const em = document.createElement('em'); em.textContent = S.checks[i] ? 'Schach' : ''; d.append(dot, tx, em); box.append(d); });
    $('csNote').textContent = S.note || END_TEXT[S.end]; $('csBackT').textContent = C.net && C.host ? 'Sitzung beenden' : 'Verlassen';
    if (S.winner !== null && C.shownEnd !== S.ply) { C.shownEnd = S.ply; if ((C.net || C.who !== 'local') && S.winner >= 0 && S.winner === mySeat()) window.dispatchEvent(new CustomEvent('theos:sieg', { detail: 'chess' })); /* Schul-Rangliste */ $('csResTitle').textContent = S.winner < 0 ? 'Remis' : C.seats[S.winner].name + ' gewinnt!'; $('csResText').textContent = S.note || (S.winner < 0 ? '' : SEATS[S.winner] + ' hat die Partie entschieden.'); $('csAgain').classList.toggle('hidden', !!C.net && !C.host); $('csResult').classList.remove('hidden'); }
  }
  function refresh() { C.sel = -1; C.moves = []; $('csPromo').classList.add('hidden'); C.pending = null; if (!C.net && C.who === 'local') C.view = C.S.turn; else setView(); panel(); }
  function setState(n) { const old = C.S; C.S = n; if (n.last && (!old || old.ply !== n.ply) && n.ply) C.anim = { from: n.last.from, to: n.last.to, t: 0, t0: performance.now() }; refresh(); }
  const sync = () => { if (C.net && C.host) C.net.broadcast({ t: 'cstate', g: C.S, seats: C.seats }); };
  function hostMove(from, to, kind) { const n = play(C.S, from, to, kind); if (!n) return false; setState(n); sync(); botTurn(); return true; }
  function botTurn() { clearTimeout(C.botT); if (!C.on || !C.host || !C.S || C.S.winner !== null || C.seats[C.S.turn].kind !== 'bot') return; C.botT = setTimeout(() => { if (!C.S || C.S.winner !== null || C.seats[C.S.turn].kind !== 'bot') return; const m = bestMove(C.S); if (m) hostMove(m.from, m.to, 'q'); }, C.botMs); }
  function request(from, to, kind) { if (C.host) hostMove(from, to, kind); else { C.net.send({ t: 'cmove', from, to, kind }); C.sel = -1; C.moves = []; } }
  function click(i) {
    if (!canMove() || i < 0) return; const pc = C.S.b[i]; const m = C.moves.find((q) => q.to === i);
    if (m) { if (m.promo) { C.pending = m; openPromo(); return; } request(m.from, m.to); return; }
    if (pc && pc.o === C.S.turn) { C.sel = i; C.moves = legal(C.S).filter((q) => q.from === i); return; } C.sel = -1; C.moves = [];
  }
  function openPromo() { const box = $('csPromoBtns'); box.textContent = ''; for (const k of ['q', 'r', 'b', 'n']) { const b = document.createElement('button'); b.type = 'button'; b.textContent = GLYPH[k] + '︎'; b.onclick = () => { const m = C.pending; $('csPromo').classList.add('hidden'); C.pending = null; if (m) request(m.from, m.to, k); }; box.append(b); } $('csPromo').classList.remove('hidden'); }
  board.addEventListener('click', (e) => { const r = board.getBoundingClientRect(); click(hit(C.gm, e.clientX - r.left, e.clientY - r.top)); });

  // ---- Regel-Tour
  function drawTut() { const s = TOUR[C.tut]; const S = C.tutS; draw(tutBoard, S, 0, { sel: s.from, glow: s.glow, targets: s.from === undefined ? [] : s.real ? legal(S).filter((m) => m.from === s.from).map((m) => m.to) : pseudo(S, s.from).map((m) => m.to) }); }
  function tutShow() { const s = TOUR[C.tut]; C.tutS = s.S(); $('csTutStep').textContent = 'Regeln ' + (C.tut + 1) + ' von ' + TOUR.length; $('csTutTitle').textContent = s.t; const x = $('csTutText'); x.textContent = s.x; x.style.whiteSpace = 'pre-line'; $('csTutPrev').classList.toggle('hidden', C.tut === 0); $('csTutNext').textContent = C.tut === TOUR.length - 1 ? 'Los geht\'s' : 'Weiter'; const d = $('csTutDots'); d.textContent = ''; TOUR.forEach((_, k) => { const i = document.createElement('i'); if (k === C.tut) i.className = 'on'; d.append(i); }); }
  function tutOpen() { C.tut = 0; C.tutOpen = true; $('csTut').classList.remove('hidden'); tutShow(); startLoop(); }
  function tutClose() { C.tutOpen = false; $('csTut').classList.add('hidden'); store.set('csTutSeen', true); }
  const firstTour = () => { if (!store.get('csTutSeen', false)) tutOpen(); };
  $('csTutNext').onclick = () => { if (C.tut >= TOUR.length - 1) tutClose(); else { C.tut++; tutShow(); } };
  $('csTutPrev').onclick = () => { if (C.tut > 0) { C.tut--; tutShow(); } }; $('csTutSkip').onclick = tutClose; $('csHelp').onclick = tutOpen; $('csRules').onclick = tutOpen;

  // ---- Start
  function pickers() { for (const b of $('csWho').children) b.classList.toggle('sel', b.dataset.who === C.who); for (const b of $('csEnds').children) b.classList.toggle('sel', Number(b.dataset.end) === C.end); }
  for (const e of [1, 2, 3]) { const b = document.createElement('button'); b.type = 'button'; b.className = 'card'; b.dataset.end = e; const t = document.createElement('b'); t.textContent = END_NAMES[e]; const s = document.createElement('small'); s.textContent = END_TEXT[e]; b.append(t, s); b.onclick = () => { C.end = e; store.set('csEnd', e); pickers(); }; $('csEnds').append(b); }
  for (const b of $('csWho').children) b.onclick = () => { C.who = b.dataset.who; store.set('csWho', C.who); pickers(); };
  function overlaysOff() { for (const id of ['csSetup', 'csResult', 'csPromo']) $(id).classList.add('hidden'); }
  function begin() { C.shownEnd = null; C.anim = null; C.S = newGame(C.end); overlaysOff(); refresh(); sync(); botTurn(); }
  C.open = () => { C.net = null; C.host = true; C.S = null; showScreen('chess'); startLoop(); overlaysOff(); pickers(); $('csSetup').classList.remove('hidden'); };
  $('csGo').onclick = () => { C.seats = C.who === 'local' ? SEATS.map((n) => ({ name: n, kind: 'local' })) : [{ name: 'Du', kind: 'me' }, { name: 'KI Theo', kind: 'bot' }, { name: 'KI Bruno', kind: 'bot' }]; begin(); firstTour(); };
  $('csSetupBack').onclick = () => { C.stop(); showScreen('gallery'); };
  C.startCoop = ({ net, host, end }) => { C.net = net; C.host = host; C.S = null; C.shownEnd = null; overlaysOff(); showScreen('chess'); startLoop(); $('csStatus').textContent = 'Partie wird aufgebaut'; if (host) { C.end = end || 2; const pl = net.players; C.seats = [0, 1, 2].map((i) => (pl[i] ? { name: pl[i].name, kind: 'human', id: pl[i].id } : { name: ['KI Theo', 'KI Bruno', 'KI Nele'][i], kind: 'bot' })); begin(); } firstTour(); };
  C.message = (from, m) => {
    if (m.t === 'cstate' && !C.host) { C.seats = m.seats; setState(m.g); if (m.g.winner === null) $('csResult').classList.add('hidden'); if (m.g.ply === 0) C.shownEnd = null; return; }
    if (m.t === 'cmove' && C.host && C.seats[C.S.turn].id === from) hostMove(m.from, m.to, m.kind);
  };
  C.playerLeft = (id) => { const s = C.seats.find((q) => q.id === id); if (!s) return; s.kind = 'bot'; s.was = s.name; s.name += ' (KI)'; panel(); sync(); botTurn(); };
  C.playerJoined = (id, name) => { const s = C.seats.find((q) => q.kind === 'bot' && q.id === id) || C.seats.find((q) => q.kind === 'bot'); if (s) { s.kind = 'human'; s.id = id; s.name = name; } C.net.sendTo(id, { t: 'start', mode: 'chess' }); panel(); sync(); };
  function back() { if (C.net) { C.stop(); endSession(); } else if (C.S) C.open(); else { C.stop(); showScreen('gallery'); } }
  $('csBack').onclick = back; $('csResBack').onclick = back; $('csAgain').onclick = begin;
  C.onKey = (code) => { if (code !== 'Escape') return false; if (C.tutOpen) tutClose(); else if (C.pending) { C.pending = null; $('csPromo').classList.add('hidden'); } else if (!C.net) back(); return true; };
  C.hide = () => { C.on = false; clearTimeout(C.botT); };
  C.stop = () => { C.on = false; clearTimeout(C.botT); C.S = null; C.net = null; C.host = true; C.tutOpen = false; $('csTut').classList.add('hidden'); overlaysOff(); };
  C.active = () => !!C.S || !!C.net; C.click = click; C.tourLength = TOUR.length;
  return C;
}
