// Theos Seitenscheidel - Teo's Casino, Level 2: Spielen an einem Automaten.
// Hinsetzen (E), Kamera vor den Bildschirm, Einsatz wählen, Drehen (Leertaste), Walzen laufen nacheinander aus, Gewinnlinien leuchten,
// Freispiele laufen von selbst, Auto-Drehen (R). Der Host würfelt und rechnet (playSpin), Mitspieler schicken nur den Wunsch.
import * as THREE from './vendor/three.module.min.js';
import { THEMES, MACHINES, LINES, SCAT, playSpin, freeLeft, drawScreen } from './casinoreels.js';
import { euro, luckFor, luckWord } from './casinologic.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createSlotPlay(X) {
  const { C, $, snd, hud, fn } = X;
  const P = { m: -1, bet: {}, A: null, auto: false, wait: false, cv: null, tex: null, live: null, camFrom: null, showT: 0, idleT: 0, grid: null, msg: '' };
  const host = () => fn.isHost(); const me = () => fn.myKey();
  const W = () => C.W;

  // ---------- Live-Bildschirm ----------
  function ensureLive() {
    if (P.live) return; P.cv = document.createElement('canvas'); P.cv.width = 1024; P.cv.height = 742; P.tex = new THREE.CanvasTexture(P.cv); P.tex.colorSpace = THREE.SRGBColorSpace; P.tex.anisotropy = 8;
    P.live = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: P.tex, color: new THREE.Color(1.12, 1.12, 1.12), toneMapped: false })); P.live.visible = false; P.live.userData.live = true; W().scene.add(P.live);
  }
  function place(i) { const s = W().slots[i]; P.live.scale.set(s.screen.w, s.screen.h, 1); P.live.quaternion.copy(s.screen.quat); P.live.position.copy(s.screen.pos).add(V3(0, 0, 0.002).applyQuaternion(s.screen.quat)); P.live.visible = true; }
  function render() { if (!P.cv || P.m < 0) return; const th = W().slots[P.m].theme; const A = P.A; const f = freeLeft(C.S, me()); const st = { theme: th, grid: A ? A.grid : P.grid, pos: A ? A.pos : null, spin: A ? A.spin : null, bet: curBet(), win: A && A.phase === 'show' ? A.winShown : 0, show: A && A.phase === 'show' ? A.show : null, free: f && f.m === P.m ? f.left : 0, msg: P.msg, jackpot: C.S.jackpot, t: C.t }; drawScreen(P.cv.getContext('2d'), P.cv.width, P.cv.height, st); P.tex.needsUpdate = true; }

  // ---------- Einsatz ----------
  const themeOf = () => THEMES[W().slots[P.m].theme];
  function curBet() { const T = themeOf(); const b = P.bet[T.id]; return T.bets.includes(b) ? b : T.bets[0]; }
  function setBet(d) { if (P.A && P.A.phase === 'spin') return; const T = themeOf(); const i = clamp(T.bets.indexOf(curBet()) + d, 0, T.bets.length - 1); P.bet[T.id] = T.bets[i]; snd.click(); hudRefresh(); render(); }

  // ---------- Hinsetzen und Aufstehen ----------
  function target(look, m, out) {
    if (!W().slots || C.S.level < 2 || m.z > -30) return; let best = null;
    for (const s of W().slots) { const flat = Math.hypot(m.x - s.seat.x, m.z - s.seat.z); if (flat > 1.25) continue; const q = look(s.screen.pos.x, s.screen.pos.y, s.screen.pos.z); if (q.dot < 0.55) continue; if (!best || flat < best.d) best = { s, d: flat }; }
    if (!best) return; const s = best.s; const T = THEMES[s.theme]; const busy = s.npc || [...C.remotes.values()].some((r) => r.mode === 'slot' && r.table === s.id);
    out.push({ k: 'slot', i: s.id, busy, text: busy ? 'Hier spielt schon jemand' : `${T.name} spielen · Einsatz ${euro(T.bets[0], true)} bis ${euro(T.bets[T.bets.length - 1], true)}`, d: best.d - 0.3 });
  }
  function sit(i) {
    const f = freeLeft(C.S, me()); if (f && f.m !== i) { fn.toast('Erst die Freispiele am anderen Automaten zu Ende spielen.'); return; }
    ensureLive(); fn.unlock(); P.m = i; C.phase = 'slot'; P.camFrom = { p: C.cam.position.clone(), q: C.cam.quaternion.clone(), t: 0 }; P.A = null; P.auto = false; P.wait = false; P.wantUp = false; P.msg = '';
    const s = W().slots[i]; P.grid = [[0, 1, 2, 3, 4], [5, 6, 7, 0, 1], [2, 3, 4, 5, 6]].map((r, ri) => r.map((v, ci) => (v + i * 3 + ri + ci) % 6));
    place(i); render(); $('caSlot').classList.remove('hidden'); $('caCross').classList.add('hidden'); hud.classList.add('ca-at-table'); fn.hint(''); hudRefresh(); snd.click();
    if (f && f.m === i) { P.msg = `${f.left} FREISPIELE`; setTimeout(() => { if (C.phase === 'slot' && P.m === i) spin(); }, 700); }
    void s;
  }
  function standUp() { if (P.A && P.A.phase === 'spin') return false; C.phase = 'play'; P.m = -1; P.auto = false; P.wantUp = false; if (P.live) P.live.visible = false; $('caSlot').classList.add('hidden'); $('caCross').classList.remove('hidden'); hud.classList.remove('ca-at-table'); fn.hint('Klick ins Bild, damit die Maus wieder einrastet.'); return true; }

  // ---------- Drehen ----------
  function spin() {
    if (P.m < 0 || P.wait || (P.A && P.A.phase === 'spin')) return; const f = freeLeft(C.S, me()); const free = f && f.m === P.m; const bet = curBet();
    if (!free && C.S.purse < bet) { fn.toast('Die Familienkasse reicht für diesen Einsatz nicht.'); snd.lose(); P.auto = false; hudRefresh(); return; }
    P.wait = true; P.msg = '';
    if (host()) { const res = playSpin(C.S, me(), P.m, bet, (Math.random() * 4294967296) >>> 0); P.wait = false; if (!res.ok) { fn.toast(res.why); P.auto = false; hudRefresh(); return; } fn.changed(); start(res); if (C.net && res.win >= res.bet * 20) C.net.broadcast({ t: 'caev', k: 'slotwin', name: fn.myName(), v: res.win, theme: W().slots[P.m].theme }); }
    else C.net.send({ t: 'caspin', m: P.m, bet });
  }
  function start(res) {
    const A = { phase: 'spin', t: 0, res, grid: res.grid, pos: [0, 0, 0, 0, 0], spin: [true, true, true, true, true], stops: [], winShown: 0, show: null, sound: [false, false, false, false, false] };
    let sc = 0; for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) if (res.grid[r][c] === SCAT) sc++; const tease = sc >= 2;
    for (let i = 0; i < 5; i++) A.stops.push(0.7 + i * 0.22 + (tease && i >= 3 ? 0.55 * (i - 2) : 0)); A.pos = A.pos.map((_, i) => i * 3.3);
    P.A = A; snd.reels(A.stops[4] + 0.1); hudRefresh();
  }
  function finish(A) {
    const res = A.res; A.phase = 'show'; P.showT = 0; const cells = new Set(); for (const L of res.lines) for (let c = 0; c < L.n; c++) cells.add(LINES[L.li][c] * 5 + c); if (res.scat >= 3) for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) if (res.grid[r][c] === SCAT) cells.add(r * 5 + c);
    A.show = { lines: res.lines, cells }; A.cycle = 0;
    const bet = res.bet || curBet(); const tier = res.jackpot ? 4 : res.win >= bet * 20 ? 3 : res.win >= bet * 5 ? 2 : res.win > 0 ? 1 : 0;
    if (res.jackpot) { snd.jackpot(); fn.bigWin('TEO-JACKPOT!', euro(res.win, true), 'jackpot'); fn.burst(W().slots[P.m].screen.pos, 60); }
    else if (tier >= 2) { snd.slotWin(tier); fn.bigWin(tier >= 3 ? 'MEGA GEWINN!' : 'Großer Gewinn!', euro(res.win, true), tier >= 3 ? 'jackpot' : 'big'); fn.burst(W().slots[P.m].screen.pos, tier * 14); }
    else if (tier === 1) snd.slotWin(1);
    if (res.freeWon) { setTimeout(() => { snd.freeSpins(); fn.bigWin('FREISPIELE!', `${res.freeWon} Freispiele · Gewinne doppelt`, 'big'); }, tier >= 2 ? 1400 : 300); P.msg = `${res.freeWon} FREISPIELE GEWONNEN`; }
    else if (res.freeSpin) P.msg = res.freeLeft > 0 ? `FREISPIEL · NOCH ${res.freeLeft}` : 'FREISPIELE VORBEI';
    if (res.level) setTimeout(() => fn.levelUp(res.level), 1800);
    hudRefresh();
  }
  function step(dt) {
    const A = P.A; if (!A) return;
    if (A.phase === 'spin') { A.t += dt; for (let i = 0; i < 5; i++) { if (A.spin[i]) { A.pos[i] += dt * 16; if (A.t >= A.stops[i]) { A.spin[i] = false; A.pos[i] = -0.2; snd.reelStop(i); } } else A.pos[i] *= Math.exp(-dt * 14); } if (A.spin.every((x) => !x) && A.t > A.stops[4] + 0.12) { A.pos = [0, 0, 0, 0, 0]; finish(A); } }
    else if (A.phase === 'show') { P.showT += dt; const r = A.res; A.winShown = Math.min(r.win, A.winShown + Math.max(1, r.win) * dt * 1.4); if (P.showT > 1.3 && r.lines.length > 1) { const k = Math.floor((P.showT - 1.3) / 0.9) % r.lines.length; const L = r.lines[k]; const cells = new Set(); for (let c = 0; c < L.n; c++) cells.add(LINES[L.li][c] * 5 + c); A.show = { lines: [L], cells }; }
      if (P.wantUp) { if (P.showT > 0.9) standUp(); return; }
      const f = freeLeft(C.S, me()); const freeHere = f && f.m === P.m; const wait = r.win >= (r.bet || 1) * 5 || r.freeWon ? 2.6 : r.win > 0 ? 1.4 : 0.7; if ((freeHere || P.auto) && P.showT > wait && !P.wait) spin(); }
  }

  // ---------- Anzeige ----------
  function hudRefresh() {
    if (P.m < 0) return; const T = themeOf(); const f = freeLeft(C.S, me()); const free = f && f.m === P.m; const l = luckFor(C.S, 'slots');
    $('caSlName').textContent = T.name + (T.jackpot ? ` · Jackpot ${euro(C.S.jackpot || 0, true)}` : ''); $('caSlLuck').textContent = `Glückssträhne am Automaten: ${luckWord(l)} · ×${l.toFixed(2).replace('.', ',')}`;
    $('caSlBet').textContent = free ? `Freispiel (${f.left})` : euro(curBet(), true); $('caSlMinus').disabled = !!free; $('caSlPlus').disabled = !!free;
    const spinning = P.A && P.A.phase === 'spin'; $('caSlSpin').disabled = spinning || P.wait; $('caSlAuto').classList.toggle('on', P.auto); $('caSlAuto').textContent = P.auto ? 'Auto an (R)' : 'Auto (R)';
  }
  function camFrame(dt) {
    const s = W().slots[P.m]; const cam = C.cam; const pos = s.cam.pos; const q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(pos, s.cam.look, V3(0, 1, 0)));
    const fr = P.camFrom; if (fr && fr.t < 1) { fr.t = Math.min(1, fr.t + dt / 0.6); const k = fr.t * fr.t * (3 - 2 * fr.t); cam.position.lerpVectors(fr.p, pos, k); cam.quaternion.slerpQuaternions(fr.q, q0, k); } else { cam.position.copy(pos); cam.quaternion.copy(q0); } cam.fov = s.big ? 40 : 36;
  }
  function frame(dt) { if (P.m < 0) return; camFrame(dt); step(dt); P.idleT += dt; if (P.A && (P.A.phase === 'spin' || P.showT < 8) || P.idleT > 0.25) { P.idleT = 0; render(); } const me2 = C.myFig(); if (me2) { /* eigene Figur bleibt unsichtbar, die Kamera sitzt auf dem Hocker */ } }
  function key(code) {
    if (code === 'Space' || code === 'Enter') spin(); else if (code === 'KeyR') { P.auto = !P.auto; snd.click(); hudRefresh(); if (P.auto && (!P.A || P.A.phase === 'show')) spin(); }
    else if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowDown' || code === 'KeyS') setBet(-1); else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowUp' || code === 'KeyW') setBet(1);
    else if (code === 'Escape' || code === 'KeyE') { if (!standUp()) { P.wantUp = true; P.auto = false; fn.toast('Du stehst auf, sobald die Walzen stehen.'); hudRefresh(); } }
  }
  $('caSlSpin').onclick = () => spin(); $('caSlAuto').onclick = () => key('KeyR'); $('caSlMinus').onclick = () => setBet(-1); $('caSlPlus').onclick = () => setBet(1); $('caSlUp').onclick = () => key('Escape');

  // ---------- Mehrspieler ----------
  function message(from, m) {
    if (!C.net) return false; const name = (C.net.players.find((p) => p.id === from) || {}).name || from;
    if (m.t === 'caspinr') { P.wait = false; if (!m.ok) { fn.toast(m.why); P.auto = false; hudRefresh(); return true; } if (P.m === m.m) start(m); return true; }
    if (m.t === 'caev' && m.k === 'slotwin') { if (m.name !== fn.myName()) fn.toast(`${m.name} gewinnt ${euro(m.v, true)} am Automaten ${THEMES[m.theme] ? THEMES[m.theme].name : ''}!`, 'gold'); return true; }
    if (m.t === 'caspin' && host()) { const res = playSpin(C.S, name, m.m | 0, m.bet | 0, (Math.random() * 4294967296) >>> 0); if (res.ok) fn.changed(); C.net.sendTo(from, { t: 'caspinr', m: m.m | 0, ...res, ok: res.ok, why: res.why }); if (res.ok && res.win >= res.bet * 20) { C.net.broadcast({ t: 'caev', k: 'slotwin', name, v: res.win, theme: MACHINES[m.m | 0].theme }); } return true; }
    return false;
  }
  function stop() { P.m = -1; P.A = null; P.auto = false; P.wait = false; if (P.live) P.live.visible = false; $('caSlot').classList.add('hidden'); }
  return { target, sit, standUp, frame, key, message, stop, get m() { return P.m; }, P, spin, setBet };
}
