// Theos Seitenscheidel - Schiffe versenken zu dritt: Meere, Aufstellen, Tutorial und Netz. Der Host kennt alle Flotten, jeder Mitspieler bekommt nur seine geschwärzte Sicht (redact).
import { SEATS, FLEET, MAX_SHOTS, newGame, randomFleet, setFleet, shoot, scan, redact, botShot, shipCells, canPlace } from './shipslogic.js';
import { createTour } from './tour.js';

const COLOR = ['#ff4d4f', '#3d9bff', '#ffd02e'];
const LETTERS = 'ABCDEFGHIJ';
function layout(w, h) { const pad = 20; const size = Math.min(w, h) - pad - 2; const cell = size / 10; return { x0: (w - size - pad) / 2 + pad, y0: (h - size - pad) / 2 + pad, cell, size }; }
function sea(c, w, h, o) {
  const g = layout(w, h); const { x0, y0, cell, size } = g; const pos = (q) => [x0 + (q % 10) * cell, y0 + Math.floor(q / 10) * cell];
  const bg = c.createLinearGradient(0, y0, 0, y0 + size); bg.addColorStop(0, '#1c6ea4'); bg.addColorStop(1, '#0d3f6e'); c.fillStyle = bg; c.fillRect(x0, y0, size, size);
  c.strokeStyle = 'rgba(255,255,255,.14)'; c.lineWidth = 1; for (let i = 0; i <= 10; i++) { c.beginPath(); c.moveTo(x0 + i * cell, y0); c.lineTo(x0 + i * cell, y0 + size); c.moveTo(x0, y0 + i * cell); c.lineTo(x0 + size, y0 + i * cell); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.72)'; c.font = `600 ${Math.max(10, cell * 0.34)}px Bahnschrift, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let i = 0; i < 10; i++) { c.fillText(LETTERS[i], x0 + (i + 0.5) * cell, y0 - 10); c.fillText(String(i + 1), x0 - 11, y0 + (i + 0.5) * cell); }
  for (const s of o.ships || []) { const a = pos(Math.min(...s.cells)); const b = pos(Math.max(...s.cells)); c.beginPath(); c.roundRect(a[0] + cell * 0.11, a[1] + cell * 0.11, b[0] - a[0] + cell * 0.78, b[1] - a[1] + cell * 0.78, cell * 0.36); c.fillStyle = s.sunk ? '#5b2a2a' : s.ghost ? (s.bad ? 'rgba(197,22,29,.75)' : 'rgba(249,189,0,.75)') : '#8d99a4'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.45)'; c.lineWidth = 2; c.stroke(); }
  (o.shots || []).forEach((m, q) => { if (!m) return; const p = pos(q); const x = p[0] + cell / 2; const y = p[1] + cell / 2; if (m === 1) { c.beginPath(); c.arc(x, y, cell * 0.13, 0, 7); c.fillStyle = 'rgba(255,255,255,.85)'; c.fill(); } else { c.beginPath(); c.arc(x, y, cell * 0.3, 0, 7); c.fillStyle = '#d3262e'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = Math.max(2, cell * 0.06); c.beginPath(); c.moveTo(x - cell * 0.15, y - cell * 0.15); c.lineTo(x + cell * 0.15, y + cell * 0.15); c.moveTo(x + cell * 0.15, y - cell * 0.15); c.lineTo(x - cell * 0.15, y + cell * 0.15); c.stroke(); } });
  for (const s of o.scans || []) { const ax = Math.max(0, s.cell % 10 - 1); const ay = Math.max(0, Math.floor(s.cell / 10) - 1); const bx = Math.min(9, s.cell % 10 + 1); const by = Math.min(9, Math.floor(s.cell / 10) + 1); c.fillStyle = 'rgba(0,214,143,.18)'; c.fillRect(x0 + ax * cell, y0 + ay * cell, (bx - ax + 1) * cell, (by - ay + 1) * cell); c.strokeStyle = '#00d68f'; c.lineWidth = 2; c.strokeRect(x0 + ax * cell, y0 + ay * cell, (bx - ax + 1) * cell, (by - ay + 1) * cell); c.fillStyle = '#fff'; c.font = `700 ${cell * 0.8}px Bahnschrift, sans-serif`; c.fillText(String(s.n), x0 + (s.cell % 10 + 0.5) * cell, y0 + (Math.floor(s.cell / 10) + 0.5) * cell); }
  if (o.last !== undefined && o.last !== null) { const p = pos(o.last); c.strokeStyle = '#f9bd00'; c.lineWidth = 3; c.strokeRect(p[0] + 1.5, p[1] + 1.5, cell - 3, cell - 3); }
  if (o.hover !== undefined && o.hover >= 0) { const p = pos(o.hover); c.fillStyle = o.radar ? 'rgba(0,214,143,.3)' : 'rgba(249,189,0,.4)'; if (o.radar) c.fillRect(p[0] - cell, p[1] - cell, cell * 3, cell * 3); else c.fillRect(p[0], p[1], cell, cell); }
  if (o.dim) { c.fillStyle = 'rgba(5,10,20,.62)'; c.fillRect(x0, y0, size, size); }
  return g;
}
const miss = (l) => { const a = new Array(100).fill(0); for (const [q, m] of l) a[q] = m; return a; };
const STEPS = [
  { t: 'Flotte verstecken', x: 'Jeder stellt heimlich 5 Schiffe auf: Längen 5, 4, 3, 3 und 2. Schiffe dürfen sich nicht berühren, auch nicht über Eck.', draw: (c, w, h) => sea(c, w, h, { ships: [{ cells: [11, 12, 13, 14, 15] }, { cells: [38, 48, 58, 68] }, { cells: [51, 52, 53] }, { cells: [83, 84, 85] }, { cells: [70, 80] }] }) },
  { t: 'Du wählst das Ziel', x: 'Du spielst gegen zwei Gegner und entscheidest in jedem Zug, auf wen du schießt. Rote Punkte sind Treffer, weiße gehen ins Wasser.', draw: (c, w, h) => sea(c, w, h, { shots: miss([[33, 1], [44, 2], [45, 2], [62, 1], [17, 1], [78, 1]]), hover: 46 }) },
  { t: 'Treffer: nochmal', x: 'Nach einem Treffer darfst du gleich noch einmal schießen, höchstens ' + MAX_SHOTS + ' Schüsse pro Zug. Ein Schuss ins Wasser beendet deinen Zug.', draw: (c, w, h) => sea(c, w, h, { shots: miss([[24, 2], [25, 2], [26, 2], [50, 1]]), last: 26 }) },
  { t: 'Alle sehen alles', x: 'Jeder Schuss ist für alle sichtbar. Hat ein Gegner schon getroffen, kannst du dort weitermachen und ihm das Schiff wegschnappen.', draw: (c, w, h) => sea(c, w, h, { shots: miss([[42, 2], [43, 2]]), hover: 44 }) },
  { t: 'Versenken gibt Radar', x: 'Wer ein Schiff versenkt, bekommt ein Radar. Es zählt die intakten Schiffsfelder in 3 mal 3 Feldern, kostet keinen Schuss und nur du siehst das Ergebnis. Die letzte Flotte gewinnt.', draw: (c, w, h) => sea(c, w, h, { scans: [{ cell: 55, n: 2 }], shots: miss([[11, 2], [12, 2]]), ships: [{ cells: [11, 12], sunk: true }] }) },
];

export function createShips({ $, store, showScreen, endSession }) {
  const C = { S: null, v: null, net: null, host: true, seats: [], on: false, who: store.get('shWho', 'bots'), botMs: 900, botT: 0, raf: 0, draft: [], down: false, hover: -1, hoverBoard: -1, radar: false, seat: 0, cover: false, shownEnd: false, ready: false };
  const tour = createTour({ root: $('ships'), store, key: 'shTutSeen', steps: STEPS });
  const boards = { own: $('shOwn'), a: $('shA'), b: $('shB'), place: $('shPlace') }; const geo = {};
  const netSeat = () => (C.net ? C.seats.findIndex((s) => s.id === (C.net.me && C.net.me.id)) : null);
  const me = () => { const n = netSeat(); if (n !== null) return n; if (C.who === 'local') return C.seat; return 0; };
  const foes = () => [0, 1, 2].filter((q) => q !== me());
  const placing = () => C.v && C.v.phase === 'place' && !C.ready;
  const myTurn = () => C.v && C.v.phase === 'play' && C.v.turn === me() && C.v.alive[me()] && !C.cover;
  function paint(cv, fn) { const dpr = window.devicePixelRatio || 1; const w = cv.clientWidth; const h = cv.clientHeight; if (!w || !h) return null; if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); } const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h); return fn(c, w, h); }
  function loop() {
    if (!C.on) { C.raf = 0; return; } const v = C.v;
    if (v) {
      if (placing()) { const ships = C.draft.map((cells) => ({ cells })); const len = FLEET[C.draft.length]; if (len && C.hover >= 0) { const cells = shipCells(C.hover % 10, Math.floor(C.hover / 10), len, C.down); const ok = canPlace(ships, cells); if (cells) ships.push({ cells, ghost: true, bad: !ok }); } geo.place = paint(boards.place, (c, w, h) => sea(c, w, h, { ships })); } else {
        const m = me(); const own = v.fleets[m] || []; geo.own = paint(boards.own, (c, w, h) => sea(c, w, h, { ships: own, shots: v.shots[m], last: v.last && v.last.target === m ? v.last.cell : null, dim: C.cover }));
        ['a', 'b'].forEach((k, i) => { const t = foes()[i]; const hov = C.hoverBoard === i && myTurn() && v.alive[t] ? C.hover : -1; geo[k] = paint(boards[k], (c, w, h) => sea(c, w, h, { ships: C.cover ? [] : v.fleets[t] || [], shots: v.shots[t], scans: C.cover ? [] : v.scans[m].filter((s) => s.target === t), last: v.last && v.last.target === t ? v.last.cell : null, hover: hov, radar: C.radar, dim: !v.alive[t] || C.cover })); });
      }
    }
    C.raf = requestAnimationFrame(loop);
  }
  function panel() {
    const v = C.v; if (!v) return; const st = $('shStatus'); const m = me(); st.className = 'cs-status'; const local = !C.net && C.who === 'local';
    $('shPlaceWrap').classList.toggle('hidden', !placing()); $('shBattle').classList.toggle('hidden', placing()); $('shPlaceBar').classList.toggle('hidden', !placing()); $('shOwnWrap').classList.toggle('hidden', placing()); $('shRadar').classList.toggle('hidden', placing());
    ['A', 'B'].forEach((k, i) => { const t = foes()[i]; const el = $('shName' + k); el.textContent = C.seats[t] ? C.seats[t].name + ' (' + SEATS[t] + ')' + (v.alive[t] ? '' : ', untergegangen') : ''; el.style.color = COLOR[t]; });
    if (placing()) { st.textContent = (local ? SEATS[m] + ': ' : '') + (C.draft.length < FLEET.length ? 'Stelle dein Schiff der Länge ' + FLEET[C.draft.length] + ' auf' : 'Flotte steht, klicke Bereit'); st.classList.add('mine'); } else if (v.phase === 'place') st.textContent = 'Warte auf die anderen Flotten'; else if (v.winner !== null) st.textContent = C.seats[v.winner].name + ' gewinnt'; else if (myTurn()) { st.textContent = C.radar ? 'Radar: Wähle ein Feld' : (local ? SEATS[m] + ': ' : '') + (v.used ? 'Treffer! Schieß noch einmal' : 'Du bist am Zug'); st.classList.add('mine'); } else if (!v.alive[m] && !local) st.textContent = 'Deine Flotte ist untergegangen'; else st.textContent = C.seats[v.turn].name + ' zielt';
    const box = $('shSeats'); box.textContent = ''; C.seats.forEach((s, i) => { const d = document.createElement('div'); d.className = 'cs-seat' + (v.phase === 'play' && v.turn === i ? ' on' : '') + (v.alive[i] ? '' : ' out'); const dot = document.createElement('i'); dot.style.background = COLOR[i]; const tx = document.createElement('div'); const b = document.createElement('b'); b.textContent = s.name; const sm = document.createElement('small'); sm.textContent = SEATS[i] + (s.kind === 'bot' ? ', KI' : '') + (i === m && !local ? ', du' : ''); tx.append(b, sm); const em = document.createElement('em'); em.textContent = v.radar[i] ? 'Radar ' + v.radar[i] : ''; d.append(dot, tx, em); box.append(d); });
    $('shNote').textContent = v.note; const r = $('shRadar'); r.textContent = C.radar ? 'Radar abbrechen' : 'Radar nutzen (' + v.radar[m] + ')'; r.disabled = !myTurn() || !v.radar[m]; r.classList.toggle('primary', C.radar); $('shBackT').textContent = C.net && C.host ? 'Sitzung beenden' : 'Verlassen';
    if (v.phase === 'over' && !C.shownEnd) { C.shownEnd = true; if ((C.net || C.who !== 'local') && v.winner === me()) window.dispatchEvent(new CustomEvent('theos:sieg', { detail: 'ships' })); /* Schul-Rangliste */ $('shCover').classList.add('hidden'); $('shResTitle').textContent = C.seats[v.winner].name + ' gewinnt!'; $('shResText').textContent = 'Die letzte Flotte schwimmt noch. ' + v.note; $('shAgain').classList.toggle('hidden', !!C.net && !C.host); $('shResult').classList.remove('hidden'); }
  }
  // Am selben PC: Bildschirm verdecken, bis der nächste Spieler bereit ist
  function coverFor(seat) { C.cover = true; C.seat = seat; C.ready = false; $('shCoverT').textContent = 'Gib an ' + C.seats[seat].name + ' weiter'; $('shCover').classList.remove('hidden'); }
  function push() {
    const S = C.S; if (C.net) C.seats.forEach((s, i) => { if (s.kind === 'human' && s.id !== 'host') C.net.sendTo(s.id, { t: 'sstate', v: redact(S, i), seats: C.seats }); });
    C.v = redact(S, me()); panel(); bots();
  }
  function afterShot(prevTurn) { const S = C.S; if (!C.net && C.who === 'local' && S.phase === 'play' && S.turn !== prevTurn) { panel(); clearTimeout(C.botT); C.botT = setTimeout(() => { if (C.S === S) { coverFor(S.turn); C.v = redact(S, S.turn); panel(); } }, 1100); } }
  function bots() { clearTimeout(C.botT); const S = C.S; if (!C.on || !C.host || !S || S.phase !== 'play' || C.seats[S.turn].kind !== 'bot') return; C.botT = setTimeout(() => { if (C.S !== S) return; const t = S.turn; const m = botShot(redact(S, t), t); const n = shoot(S, t, m.target, m.cell); if (n) { C.S = n; push(); } }, C.botMs); }
  function act(seat, a) {
    const S = C.S; let n = null;
    if (a.k === 'place') { n = setFleet(S, seat, a.cells); if (n) { C.S = n; if (!C.net && C.who === 'local') { const nx = n.fleets.findIndex((f) => !f); C.draft = []; if (nx >= 0) { coverFor(nx); C.v = redact(n, nx); panel(); return; } coverFor(n.turn); } push(); } return; }
    if (a.k === 'shot') n = shoot(S, seat, a.target, a.cell); if (a.k === 'scan') n = scan(S, seat, a.target, a.cell);
    if (n) { const t = S.turn; C.S = n; if (!C.net && C.who === 'local') { C.v = redact(n, me()); panel(); afterShot(t); return; } push(); }
  }
  function send(a) { if (C.host) act(me(), a); else C.net.send({ t: 'saction', a }); }
  const cellAt = (e, cv, g) => { if (!g) return -1; const r = cv.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left - g.x0) / g.cell); const y = Math.floor((e.clientY - r.top - g.y0) / g.cell); return x >= 0 && x < 10 && y >= 0 && y < 10 ? y * 10 + x : -1; };
  function placeClick(c) { if (c < 0 || !placing()) return; const had = C.draft.findIndex((q) => q.includes(c)); if (had >= 0) { C.draft = C.draft.slice(0, had); panel(); return; } const len = FLEET[C.draft.length]; if (!len) return; const cells = shipCells(c % 10, Math.floor(c / 10), len, C.down); if (canPlace(C.draft.map((q) => ({ cells: q })), cells)) { C.draft = [...C.draft, cells]; panel(); } }
  function boardClick(i, c) { if (c < 0 || !myTurn()) return; const t = foes()[i]; if (C.radar) { C.radar = false; send({ k: 'scan', target: t, cell: c }); panel(); return; } send({ k: 'shot', target: t, cell: c }); }
  boards.place.addEventListener('mousemove', (e) => { C.hover = cellAt(e, boards.place, geo.place); }); boards.place.addEventListener('mouseleave', () => { C.hover = -1; }); boards.place.addEventListener('click', (e) => placeClick(cellAt(e, boards.place, geo.place))); boards.place.addEventListener('contextmenu', (e) => { e.preventDefault(); C.down = !C.down; });
  ['a', 'b'].forEach((k, i) => { const cv = boards[k]; cv.addEventListener('mousemove', (e) => { C.hover = cellAt(e, cv, geo[k]); C.hoverBoard = i; }); cv.addEventListener('mouseleave', () => { C.hoverBoard = -1; }); cv.addEventListener('click', (e) => boardClick(i, cellAt(e, cv, geo[k]))); });
  $('shTurn').onclick = () => { C.down = !C.down; }; $('shClear').onclick = () => { C.draft = []; panel(); }; $('shRandom').onclick = () => { C.draft = randomFleet(); panel(); };
  $('shReady').onclick = () => { if (C.draft.length !== FLEET.length) return; const cells = C.draft; C.draft = []; if (C.net || C.who !== 'local') C.ready = true; send({ k: 'place', cells }); panel(); };
  $('shRadar').onclick = () => { C.radar = !C.radar; panel(); }; $('shCoverGo').onclick = () => { C.cover = false; $('shCover').classList.add('hidden'); C.v = redact(C.S, C.seat); panel(); };
  function run() { C.on = true; if (!C.raf) C.raf = requestAnimationFrame(loop); }
  function overlaysOff() { for (const id of ['shSetup', 'shResult', 'shCover']) $(id).classList.add('hidden'); }
  function begin() { C.shownEnd = false; C.draft = []; C.ready = false; C.radar = false; C.cover = false; C.seat = 0; overlaysOff(); C.S = newGame(); C.seats.forEach((s, i) => { if (s.kind === 'bot') C.S = setFleet(C.S, i, randomFleet()); }); if (C.net) C.net.broadcast({ t: 'sreset' }); push(); }
  function pickers() { for (const b of $('shWho').children) b.classList.toggle('sel', b.dataset.who === C.who); }
  for (const b of $('shWho').children) b.onclick = () => { C.who = b.dataset.who; store.set('shWho', C.who); pickers(); };
  C.open = () => { C.net = null; C.host = true; C.S = null; C.v = null; showScreen('ships'); overlaysOff(); pickers(); $('shSetup').classList.remove('hidden'); run(); };
  $('shGo').onclick = () => { C.seats = C.who === 'local' ? SEATS.map((n) => ({ name: n, kind: 'local' })) : [{ name: 'Du', kind: 'me' }, { name: 'KI Theo', kind: 'bot' }, { name: 'KI Bruno', kind: 'bot' }]; begin(); tour.first(); };
  C.startCoop = ({ net, host }) => { C.net = net; C.host = host; C.S = null; C.v = null; C.shownEnd = false; C.draft = []; C.ready = false; overlaysOff(); showScreen('ships'); run(); if (host) { const pl = net.players; C.seats = [0, 1, 2].map((i) => (pl[i] ? { name: pl[i].name, kind: 'human', id: pl[i].id } : { name: ['KI Theo', 'KI Bruno', 'KI Nele'][i], kind: 'bot' })); begin(); } tour.first(); };
  C.message = (from, m) => {
    if (m.t === 'sreset' && !C.host) { C.shownEnd = false; C.draft = []; C.ready = false; C.radar = false; overlaysOff(); return; }
    if (m.t === 'sstate' && !C.host) { C.seats = m.seats; C.v = m.v; if (C.v.phase === 'place' && C.v.placed && C.v.placed[me()]) C.ready = true; panel(); return; }
    if (m.t === 'saction' && C.host && C.S) { const i = C.seats.findIndex((s) => s.id === from); if (i >= 0) act(i, m.a); }
  };
  C.playerLeft = (id) => { const q = C.seats.find((s) => s.id === id); if (!q) return; q.kind = 'bot'; q.name += ' (KI)'; const i = C.seats.indexOf(q); if (C.S.phase === 'place' && !C.S.fleets[i]) C.S = setFleet(C.S, i, randomFleet()); push(); };
  C.playerJoined = (id, name) => { const q = C.seats.find((s) => s.kind === 'bot' && s.id === id) || C.seats.find((s) => s.kind === 'bot'); if (q) { q.kind = 'human'; q.id = id; q.name = name; } C.net.sendTo(id, { t: 'start', mode: 'ships' }); push(); };
  function back() { if (C.net) { C.stop(); endSession(); } else if (C.S) C.open(); else { C.stop(); showScreen('gallery'); } }
  $('shBack').onclick = back; $('shResBack').onclick = back; $('shAgain').onclick = begin; $('shHelp').onclick = tour.show; $('shRules').onclick = tour.show; $('shSetupBack').onclick = back;
  window.addEventListener('keydown', (e) => { if (!C.on) return; if (e.code === 'KeyR' && placing()) { C.down = !C.down; e.stopImmediatePropagation(); } if (e.code === 'Escape') { e.stopImmediatePropagation(); if (tour.open) tour.close(); else if (C.radar) { C.radar = false; panel(); } else if (!C.net) back(); } }, true);
  C.hide = () => { C.on = false; clearTimeout(C.botT); };
  C.stop = () => { C.hide(); C.S = null; C.v = null; C.net = null; C.host = true; tour.open = false; tour.el.classList.add('hidden'); overlaysOff(); };
  C.active = () => !!C.S || !!C.net || !!C.v; C.tour = tour; C.place = placeClick; C.board = boardClick; C.fireRandom = () => { C.draft = randomFleet(); $('shReady').onclick(); };
  return C;
}
