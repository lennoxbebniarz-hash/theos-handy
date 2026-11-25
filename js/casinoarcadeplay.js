// Theos Seitenscheidel - Teo's Casino, Level 5: Spielen in der Spielhalle (Plinko, Teos Glücksrad, Turbo-Bingo).
// Hinsetzen (E), Kamera auf Bildschirm bzw. Rad. Plinko: Risiko wählen, Einsatz (Pfeile), Leertaste lässt eine Kugel fallen (mehrere gleichzeitig möglich), R Automatik.
// Glücksrad: Jeton wählen (Pfeile), Felder anklicken (Rechtsklick nimmt zurück), Leertaste dreht. Bingo: 1–4 Karten, Kartenpreis (Pfeile), Leertaste startet die Ziehung.
// Der Host rechnet (playPlinko/playWheel/playBingo), Mitspieler schicken nur den Wunsch (caarc → caarcr).
import * as THREE from './vendor/three.module.min.js';
import { PLINKO, PLINKO_BETS, playPlinko, WHEEL_TYPES, WHEEL_SEGS, WHEEL_CHIPS, WHEEL_MAX, playWheel, BINGO_PRICES, BINGO_BALLS, playBingo } from './casinoarcade.js';
import { drawPlinko, drawBingo, drawBoard75, PLINKO_GEO } from './casinoworld4.js';
import { euro, luckFor, luckWord } from './casinologic.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const RULES = { plinko: '12 Stiftreihen · 13 Fächer · außen die großen Faktoren, in der Mitte die kleinen', wheel: '60 Felder · ×2, ×3, ×7, ×19 und einmal TEO ×58 · Jetons auf ein oder mehrere Felder', bingo: '40 Kugeln · je früher die erste Reihe (waagerecht, senkrecht, diagonal), desto mehr' };

export function createArcadePlay(X) {
  const { C, $, snd, hud, fn } = X;
  const P = { s: null, kind: null, camFrom: null, wait: 0, wantUp: false, auto: false, autoT: 0,
    pl: { risk: 'mittel', bi: 0, balls: [], last: [], hit: null, msg: '' }, wh: { chip: 0, bets: {}, last: {}, spin: null, result: null, msg: '' }, bg: { n: 1, pi: 0, round: null, count: 0, t: 0, msg: '' }, scr: {}, live: null };
  const host = () => fn.isHost(); const me = () => fn.myKey(); const W = () => C.W; const H5 = () => W().hall5;
  const keyOf = (s) => (s ? 'arc:' + s.id : null); function seatOf(key) { if (!key || !W() || !H5()) return null; const i = String(key).split(':')[1] | 0; return H5().stations[i] || null; }
  const busy = () => P.pl.balls.length > 0 || !!P.wh.spin || !!P.bg.round || P.wait > 0;

  // ---------- Hinsetzen ----------
  function target(look, m, out) {
    if (!W() || !H5() || !W().zoneOf || (C.S.level || 1) < 5) return; if (W().zoneOf({ x: m.x, y: (m.y || 0) + 1.6, z: m.z }) !== 3) return;
    let best = null; for (const s of H5().stations) { const d = Math.hypot(m.x - s.seat.x, m.z - s.seat.z); if (d > 1.2) continue; const q = look(s.look.x, s.look.y, s.look.z); if (q.dot < 0.4) continue; if (!best || d < best.d) best = { s, d }; }
    if (!best) return; const s = best.s; const k = keyOf(s); const taken = s.npc || [...C.remotes.values()].some((r) => r.mode === 'arc' && r.table === k);
    out.push({ k: 'arc', i: s.id, busy: taken, text: taken ? 'Hier spielt schon jemand' : s.kind === 'plinko' ? 'Plinko spielen · Einsatz 1 € bis 500 €' : s.kind === 'wheel' ? 'Teos Glücksrad · setzen und drehen' : 'Turbo-Bingo spielen · 1 bis 4 Karten', d: best.d - 0.3 });
  }
  function screen(kind) { const key = kind === 'plinko' ? 'p' : 'b'; if (P.scr[key]) return P.scr[key]; const cv = document.createElement('canvas'); cv.width = kind === 'plinko' ? 600 : 1024; cv.height = kind === 'plinko' ? 975 : 625; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.1, 1.1, 1.1), toneMapped: false })); mesh.visible = false; mesh.userData.live = true; W().scene.add(mesh); return (P.scr[key] = { cv, tex, mesh }); }
  function placeScreen() { for (const k of Object.keys(P.scr)) P.scr[k].mesh.visible = false; P.live = null; const s = P.s; if (!s.screen) return; const sc = screen(s.kind); sc.mesh.scale.set(s.screen.w, s.screen.h, 1); sc.mesh.quaternion.copy(s.screen.quat); sc.mesh.position.copy(s.screen.pos).add(V3(0, 0, 0.003).applyQuaternion(s.screen.quat)); sc.mesh.visible = true; P.live = sc; }
  function sit(id) {
    const s = H5().stations[id]; if (!s) return; fn.unlock(); P.s = s; P.kind = s.kind; C.phase = 'arc'; P.camFrom = { p: C.cam.position.clone(), q: C.cam.quaternion.clone(), t: 0 }; P.wantUp = false; P.auto = false; P.wait = 0;
    hud.classList.add('ca-at-table'); $('caCross').classList.add('hidden'); fn.hint(''); $('caArc').classList.remove('hidden'); placeScreen(); buildOpts(); refresh(); render(); snd.click();
  }
  function standUp(force) {
    if (!force && busy()) { P.wantUp = true; P.auto = false; fn.toast('Du stehst auf, sobald die Runde vorbei ist.'); refresh(); return false; }
    if (P.wh.spin) finishWheel(true); P.pl.balls = []; P.bg.round = null; C.phase = 'play'; P.s = null; P.kind = null; P.auto = false; P.wantUp = false; P.wait = 0; for (const k of Object.keys(P.scr)) P.scr[k].mesh.visible = false;
    $('caArc').classList.add('hidden'); $('caCross').classList.remove('hidden'); hud.classList.remove('ca-at-table'); fn.hint('Klick ins Bild, damit die Maus wieder einrastet.'); return true;
  }

  // ---------- Bedienleiste ----------
  function buildOpts() {
    const box = $('caArcOpts'); box.textContent = ''; const btn = (txt, on, f, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls + (on ? ' on' : ''); b.textContent = txt; b.onclick = f; box.append(b); return b; };
    if (P.kind === 'plinko') for (const [k, R] of Object.entries(PLINKO)) btn(R.name, P.pl.risk === k, () => { if (P.pl.balls.length) return; P.pl.risk = k; snd.click(); buildOpts(); refresh(); render(); });
    else if (P.kind === 'wheel') { for (const [k, T] of Object.entries(WHEEL_TYPES)) { const b = btn(T.label, false, () => placeWheel(k, 1), 'ca-wf'); b.style.setProperty('--c', T.color); b.oncontextmenu = (e) => { e.preventDefault(); placeWheel(k, -1); }; const i = document.createElement('i'); b.append(i); b.dataset.k = k; } btn('Löschen', false, () => { if (!P.wh.spin) { P.wh.bets = {}; refresh(); } }, 'ca-wclr'); }
    else for (let n = 1; n <= 4; n++) btn(`${n} ${n === 1 ? 'Karte' : 'Karten'}`, P.bg.n === n, () => { if (P.bg.round) return; P.bg.n = n; snd.click(); buildOpts(); refresh(); });
  }
  const betList = () => (P.kind === 'plinko' ? PLINKO_BETS : P.kind === 'wheel' ? WHEEL_CHIPS : BINGO_PRICES);
  const betIdx = () => (P.kind === 'plinko' ? P.pl.bi : P.kind === 'wheel' ? P.wh.chip : P.bg.pi);
  function setBet(d) { if (!P.s) return; if ((P.kind === 'bingo' && P.bg.round) || (P.kind === 'wheel' && P.wh.spin)) return; const i = clamp(betIdx() + d, 0, betList().length - 1); if (P.kind === 'plinko') P.pl.bi = i; else if (P.kind === 'wheel') P.wh.chip = i; else P.bg.pi = i; snd.click(); refresh(); render(); }
  function refresh() {
    if (!P.s) return; const l = luckFor(C.S, 'spielhalle'); const k = P.kind; $('caArcName').textContent = k === 'plinko' ? `Teo-Plinko · Risiko ${PLINKO[P.pl.risk].name}` : k === 'wheel' ? 'Teos Glücksrad' : 'Turbo-Bingo'; $('caArcRule').textContent = RULES[k]; $('caArcLuck').textContent = `Glückssträhne in der Spielhalle: ${luckWord(l)} · ×${l.toFixed(2).replace('.', ',')}`;
    $('caArcBetL').textContent = k === 'wheel' ? 'Jeton' : k === 'bingo' ? 'Preis je Karte' : 'Einsatz'; $('caArcBet').textContent = euro(betList()[betIdx()], true);
    const run = (k === 'wheel' && !!P.wh.spin) || (k === 'bingo' && !!P.bg.round) || P.wait > 0; $('caArcMinus').disabled = run; $('caArcPlus').disabled = run; $('caArcGo').disabled = run || (k === 'wheel' && !Object.keys(P.wh.bets).length);
    $('caArcGo').textContent = k === 'plinko' ? 'Kugel fallen lassen (Leertaste)' : k === 'wheel' ? 'Rad drehen (Leertaste)' : 'Ziehung starten (Leertaste)'; $('caArcAuto').classList.toggle('hidden', k !== 'plinko'); $('caArcAuto').classList.toggle('on', P.auto); $('caArcAuto').textContent = P.auto ? 'Auto an (R)' : 'Auto (R)';
    if (k === 'wheel') { let tot = 0; for (const b of $('caArcOpts').querySelectorAll('.ca-wf')) { const v = P.wh.bets[b.dataset.k] || 0; tot += v; b.querySelector('i').textContent = v ? euro(v, false).replace(' €', '') : ''; b.classList.toggle('hit', P.wh.result === b.dataset.k); } $('caArcMsg').textContent = P.wh.msg || (tot ? `Gesetzt: ${euro(tot, true)} · Leertaste dreht` : 'Jeton wählen, Felder anklicken (Rechtsklick nimmt zurück).'); }
    else if (k === 'bingo') $('caArcMsg').textContent = P.bg.msg || `${P.bg.n} ${P.bg.n === 1 ? 'Karte' : 'Karten'} · zusammen ${euro(P.bg.n * BINGO_PRICES[P.bg.pi], true)}`;
    else $('caArcMsg').textContent = P.pl.msg || 'Leertaste: Kugel fallen lassen · mehrere Kugeln gleichzeitig gehen';
  }
  function render() {
    if (!P.live || !P.s) return; const c = P.live.cv.getContext('2d');
    if (P.kind === 'plinko') drawPlinko(c, P.live.cv.width, P.live.cv.height, { risk: P.pl.risk, bet: PLINKO_BETS[P.pl.bi], balls: P.pl.balls, hit: P.pl.hit, last: P.pl.last, msg: P.pl.msg });
    else { const R = P.bg.round; drawBingo(c, P.live.cv.width, P.live.cv.height, R ? { cards: R.cards, balls: R.balls, count: P.bg.count, cur: P.bg.count ? R.balls[P.bg.count - 1] : null, res: R.res, msg: P.bg.msg } : (P.bg.lastRound ? { cards: P.bg.lastRound.cards, balls: P.bg.lastRound.balls, count: P.bg.lastCount, cur: P.bg.lastRound.balls[P.bg.lastCount - 1], res: P.bg.lastRound.res, msg: P.bg.msg } : {})); }
    P.live.tex.needsUpdate = true;
  }

  // ---------- Los ----------
  function go() {
    if (!P.s || P.wait > 0) return; const seed = (Math.random() * 4294967296) >>> 0;
    if (P.kind === 'plinko') { if (P.pl.balls.length >= 6) return; const bet = PLINKO_BETS[P.pl.bi]; if (C.S.purse < bet) { fn.toast('Die Familienkasse reicht für diesen Einsatz nicht.'); P.auto = false; snd.lose(); refresh(); return; }
      if (host()) { const res = playPlinko(C.S, me(), P.pl.risk, bet, seed); if (!res.ok) { fn.toast(res.why); P.auto = false; return; } fn.changed(); dropBall(res); } else { P.wait++; C.net.send({ t: 'caarc', g: 'plinko', risk: P.pl.risk, bet }); } }
    else if (P.kind === 'wheel') { if (P.wh.spin) return; const bets = { ...P.wh.bets }; if (!Object.keys(bets).length) { fn.toast('Erst Jetons auf ein Feld legen.'); return; }
      if (host()) { const res = playWheel(C.S, me(), bets, seed); if (!res.ok) { fn.toast(res.why); return; } fn.changed(); spinWheel(res); } else { P.wait++; C.net.send({ t: 'caarc', g: 'wheel', bets }); } }
    else { if (P.bg.round) return; const price = BINGO_PRICES[P.bg.pi]; if (C.S.purse < price * P.bg.n) { fn.toast('Die Familienkasse reicht nicht für so viele Karten.'); snd.lose(); return; }
      if (host()) { const res = playBingo(C.S, me(), P.bg.n, price, seed); if (!res.ok) { fn.toast(res.why); return; } fn.changed(); startBingo(res); } else { P.wait++; C.net.send({ t: 'caarc', g: 'bingo', n: P.bg.n, price }); } }
    refresh();
  }
  function after(res, delay) { if (res.level) setTimeout(() => fn.levelUp(res.level), delay); }
  // Plinko
  function dropBall(res) { P.pl.balls.push({ path: res.path, t: 0, res, row: -1 }); snd.chips(1); after(res, 3000); }
  function stepPlinko(dt) {
    const done = []; for (const b of P.pl.balls) { b.t += dt / 2.3; const row = Math.floor(Math.min(1, b.t) * 12); if (row !== b.row) { b.row = row; if (row < 12) snd.peg(row); } if (b.t >= 1.08) done.push(b); }
    for (const b of done) { P.pl.balls.splice(P.pl.balls.indexOf(b), 1); const r = b.res; P.pl.hit = r.slot; P.pl.last.unshift(r.mult); P.pl.last.length = Math.min(8, P.pl.last.length); P.pl.msg = `×${String(r.mult).replace('.', ',')} · ${r.win ? 'Gewinn ' + euro(r.win, true) : 'nichts'}`;
      if (r.mult >= 20) { snd.slotWin(3); fn.bigWin('PLINKO!', `×${r.mult} · ${euro(r.win, true)}`, 'jackpot'); } else if (r.mult >= 3) snd.slotWin(2); else if (r.mult >= 1) snd.slotWin(1); else snd.lose(); if (C.net && r.win >= 20000 && r.mult >= 20) C.net.broadcast({ t: 'caev', k: 'arcwin', name: fn.myName(), v: r.win, what: 'Plinko' }); refresh(); }
    if (P.auto && P.kind === 'plinko') { P.autoT -= dt; if (P.autoT <= 0 && !P.wait) { P.autoT = 0.75; go(); } }
    if (P.wantUp && !busy()) standUp(false);
  }
  // Glücksrad
  function placeWheel(k, dir) { if (P.kind !== 'wheel' || P.wh.spin || P.wait) return; const v = WHEEL_CHIPS[P.wh.chip]; const bets = P.wh.bets; P.wh.result = null; P.wh.msg = '';
    if (dir > 0) { const tot = Object.values(bets).reduce((a, x) => a + x, 0) + v; if (tot > WHEEL_MAX) { fn.toast('Höchstens 5.000 € pro Dreh.'); return; } if (tot > C.S.purse) { fn.toast('Die Familienkasse reicht nicht für noch einen Jeton.'); snd.lose(); return; } bets[k] = (bets[k] || 0) + v; snd.chips(1); }
    else { if (!bets[k]) return; bets[k] = Math.max(0, bets[k] - v); if (!bets[k]) delete bets[k]; snd.click(); } refresh(); }
  function spinWheel(res) {
    const wh = H5().wheel; const da = (Math.PI * 2) / WHEEL_SEGS.length; const phi0 = wh.disc.rotation.z; const base = res.idx * da; const turns = Math.ceil((phi0 + Math.PI * 2 * 5 - base) / (Math.PI * 2)); const phiT = base + turns * Math.PI * 2 + (Math.random() - 0.5) * da * 0.6;
    P.wh.last = { ...res.bets }; P.wh.result = null; P.wh.msg = 'Das Rad dreht …'; P.wh.spin = { t: 0, T: 6.8, phi0, phiT, res, lastPeg: Math.floor(phi0 / da) }; snd.chips(2); after(res, 7400); refresh();
  }
  function stepWheel(dt) {
    const sp = P.wh.spin; if (!sp) return; const wh = H5().wheel; const da = (Math.PI * 2) / WHEEL_SEGS.length; sp.t += dt; const u = Math.min(1, sp.t / sp.T); const e = 1 - Math.pow(1 - u, 3); const phi = sp.phi0 + (sp.phiT - sp.phi0) * e; wh.disc.rotation.z = phi;
    const peg = Math.floor(phi / da); if (peg !== sp.lastPeg) { sp.lastPeg = peg; wh.pointer.rotation.z = 0.45; snd.wheelTick(); } wh.pointer.rotation.z *= Math.exp(-dt * 14); if (u >= 1) finishWheel(false);
  }
  function finishWheel(quick) { const sp = P.wh.spin; if (!sp) return; P.wh.spin = null; const r = sp.res; if (quick) H5().wheel.disc.rotation.z = sp.phiT; P.wh.result = r.type; const T = WHEEL_TYPES[r.type];
    P.wh.msg = `${T.label}${r.win ? ' · Gewinn ' + euro(r.win, true) : ' · kein Gewinn'}`; if (!quick) { if (r.type === 'teo' && r.win) { snd.jackpot(); fn.bigWin('TEO!', euro(r.win, true), 'jackpot'); } else if (r.win > r.bet) snd.slotWin(r.win >= r.bet * 5 ? 2 : 1); else if (r.win) snd.click(); else snd.lose(); if (C.net && r.win >= 20000 && r.win >= r.bet * 10) C.net.broadcast({ t: 'caev', k: 'arcwin', name: fn.myName(), v: r.win, what: 'Glücksrad' }); }
    P.wh.bets = {}; refresh(); if (P.wantUp) setTimeout(() => standUp(false), 900); }
  // Bingo
  function startBingo(res) { P.bg.round = res; P.bg.count = 0; P.bg.t = 0.4; P.bg.msg = 'Die Ziehung läuft …'; drawBoard([]); after(res, 13000); render(); refresh(); }
  function drawBoard(balls) { const t = H5().board.tex; const c = t.userData.canvas; drawBoard75(c.getContext('2d'), c.width, c.height, balls); t.needsUpdate = true; }
  function stepBingo(dt) {
    const R = P.bg.round; const drum = H5().drum.balls; if (R) { for (const b of drum.children) { b.position.x += (Math.random() - 0.5) * dt * 3; b.position.y += (Math.random() - 0.5) * dt * 3; b.position.z += (Math.random() - 0.5) * dt * 3; b.position.clampLength(0, 0.52); } }
    if (!R) return; P.bg.t -= dt; if (P.bg.t > 0) return; P.bg.t = 0.3; P.bg.count++; snd.ballPop(); drawBoard(R.balls.slice(0, P.bg.count));
    const allDone = R.res.every((x) => x.at && x.at <= P.bg.count); const fresh = R.res.filter((x) => x.at === P.bg.count); if (fresh.length) { snd.slotWin(fresh.some((x) => x.mult >= 4) ? 3 : 2); fn.toast(`BINGO! ${fresh.map((x) => x.tier + ' · +' + euro(x.win, true)).join(' · ')}`, 'gold'); }
    if (allDone || P.bg.count >= BINGO_BALLS) { const net = R.win - R.bet; P.bg.msg = R.win ? `Gewinn ${euro(R.win, true)}${net < 0 ? ' (Trostpreis)' : ''}` : 'Keine Reihe – nächstes Mal!'; if (R.win >= R.bet * 10) fn.bigWin('TURBO-BINGO!', euro(R.win, true), 'jackpot'); else if (!R.win) snd.lose();
      if (C.net && R.win >= 20000 && R.win >= R.bet * 10) C.net.broadcast({ t: 'caev', k: 'arcwin', name: fn.myName(), v: R.win, what: 'Turbo-Bingo' }); P.bg.lastRound = R; P.bg.lastCount = P.bg.count; P.bg.round = null; refresh(); if (P.wantUp) setTimeout(() => standUp(false), 1200); }
    render();
  }

  // ---------- Kamera, Tasten, Takt ----------
  function camFrame(dt) { const s = P.s; const cam = C.cam; const q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(s.cam.pos, s.cam.look, V3(0, 1, 0))); const fr = P.camFrom;
    if (fr && fr.t < 1) { fr.t = Math.min(1, fr.t + dt / 0.6); const k = fr.t * fr.t * (3 - 2 * fr.t); cam.position.lerpVectors(fr.p, s.cam.pos, k); cam.quaternion.slerpQuaternions(fr.q, q0, k); } else { cam.position.copy(s.cam.pos); cam.quaternion.copy(q0); } cam.fov = P.kind === 'wheel' ? 52 : P.kind === 'bingo' ? 50 : 54; }
  function frame(dt) { if (!P.s) return; camFrame(dt); if (P.kind === 'plinko') { stepPlinko(dt); render(); } else if (P.kind === 'wheel') stepWheel(dt); else stepBingo(dt); }
  function key(code) {
    if (code === 'Escape' || code === 'KeyE') { standUp(false); return; } if (code === 'Space' || code === 'Enter') go(); else if (code === 'ArrowLeft' || code === 'ArrowDown') setBet(-1); else if (code === 'ArrowRight' || code === 'ArrowUp') setBet(1);
    else if (code === 'KeyR' && P.kind === 'plinko') { P.auto = !P.auto; P.autoT = 0; snd.click(); refresh(); } else if (code === 'Backspace' && P.kind === 'wheel' && !P.wh.spin) { P.wh.bets = {}; refresh(); }
    else if (/^Digit[1-4]$/.test(code) && P.kind === 'bingo' && !P.bg.round) { P.bg.n = Number(code.slice(5)); buildOpts(); refresh(); }
  }
  $('caArcGo').onclick = go; $('caArcAuto').onclick = () => key('KeyR'); $('caArcMinus').onclick = () => setBet(-1); $('caArcPlus').onclick = () => setBet(1); $('caArcUp').onclick = () => standUp(false);

  // ---------- Mehrspieler ----------
  function message(from, m) {
    if (!C.net) return false; const name = (C.net.players.find((p) => p.id === from) || {}).name || from; const seed = (Math.random() * 4294967296) >>> 0;
    if (m.t === 'caarc' && host()) { const res = m.g === 'plinko' ? playPlinko(C.S, name, String(m.risk), m.bet | 0, seed) : m.g === 'wheel' ? playWheel(C.S, name, m.bets || {}, seed) : playBingo(C.S, name, m.n | 0, m.price | 0, seed); if (res.ok) fn.changed(); C.net.sendTo(from, { t: 'caarcr', ...res, ok: res.ok, why: res.why }); return true; }
    if (m.t === 'caarcr') { P.wait = Math.max(0, P.wait - 1); if (!m.ok) { fn.toast(m.why); P.auto = false; refresh(); return true; } if (!P.s) return true; if (m.game === 'plinko' && P.kind === 'plinko') dropBall(m); else if (m.game === 'wheel' && P.kind === 'wheel') spinWheel(m); else if (m.game === 'bingo' && P.kind === 'bingo') startBingo(m); refresh(); return true; }
    if (m.t === 'caev' && m.k === 'arcwin') { if (m.name !== fn.myName()) fn.toast(`${m.name} gewinnt ${euro(m.v, true)} beim ${m.what}!`, 'gold'); return true; }
    return false;
  }
  function stop() { if (P.wh.spin) finishWheel(true); P.pl.balls = []; P.bg.round = null; P.s = null; P.kind = null; P.auto = false; P.wait = 0; for (const k of Object.keys(P.scr)) P.scr[k].mesh.visible = false; $('caArc').classList.add('hidden'); }
  return { target, sit, standUp, frame, key, message, stop, seatOf, get seatKey() { return keyOf(P.s); }, P, go, placeWheel, PLINKO_GEO };
}
