// Theos Seitenscheidel - Teo's Casino, Level 3 und 4: Spielen am Blackjack-Tisch (Kartensalon) und am Roulette-Tisch (Roulette-Galerie).
// Hinsetzen (E) auf einen freien Platz, die Kamera schaut auf den Tisch. Blackjack: Einsatz (Pfeile), Austeilen (Leertaste), Karte (H), Stehen (S),
// Verdoppeln (D), Teilen (T), Teos Tipp (Q). Roulette: Jeton wählen (Pfeile, 1–4), aufs Tableau klicken (Rechtsklick nimmt zurück), Drehen (Leertaste),
// Löschen (Rücktaste), Nochmal (R). Der Host rechnet (bjDeal/bjAct, playRoulette), Mitspieler schicken nur ihren Wunsch.
import * as THREE from './vendor/three.module.min.js';
import { BJ_TABLES, bjDeal, bjAct, bjCan, bjHint, bjRound, handValue, HINT_TEXT, isBJ } from './casinobj.js';
import { ROU_TABLES, playRoulette, totalBet, colorOf, WHEEL, BET_LABEL } from './casinoroulette.js';
import { cardUV, drawRouLayout, ROU_CELLS, cellCenter, chipColor, POCKET } from './casinoworld3.js';
import { euro, luckFor, luckWord } from './casinologic.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const CW = 0.12; const CH = 0.168; const CHIP_VALUES = [50000, 10000, 2500, 1000, 500, 100];
const RES_TEXT = { bj: 'Blackjack!', win: 'Gewonnen', push: 'Unentschieden', lose: 'Verloren', bust: 'Überkauft' };

export function createTablePlay(X) {
  const { C, $, snd, hud, fn } = X;
  const P = { kind: null, s: null, camFrom: null, bet: {}, wait: false, wantUp: false, steps: [], stepT: 0, cards: { d: [], h: [[], []] }, chips: [], shown: null, msg: '', rou: { chip: 0, bets: {}, last: {}, spinning: false, result: null } };
  const host = () => fn.isHost(); const me = () => fn.myKey(); const W = () => C.W; const H3 = () => W().hall3; const H4 = () => W().hall4;
  const keyOf = (s) => (s ? s.kind + ':' + s.id : null);
  function seatOf(key) { if (!key || !W() || !H3()) return null; const [k, i] = String(key).split(':'); const list = k === 'bj' ? H3().seats : k === 'rou' ? H4().seats : null; return list ? list[i | 0] || null : null; }
  const busy = () => P.steps.length > 0 || P.rou.spinning;

  // ---------- Hinsetzen und Aufstehen ----------
  function target(look, m, out) {
    if (!W() || !H3() || !W().zoneOf) return; const zn = W().zoneOf(m); if (!zn) return; const need = zn === 1 ? 3 : 4; if ((C.S.level || 1) < need) return;
    let best = null; for (const s of zn === 1 ? H3().seats : H4().seats) { const d = Math.hypot(m.x - s.seat.x, m.z - s.seat.z); if (d > 1.15) continue; const q = look(s.look.x, s.look.y, s.look.z); if (q.dot < 0.45) continue; if (!best || d < best.d) best = { s, d }; }
    if (!best) return; const s = best.s; const k = keyOf(s); const taken = s.npc || [...C.remotes.values()].some((r) => r.mode === 'game' && r.table === k);
    const T = s.kind === 'bj' ? BJ_TABLES[s.table] : ROU_TABLES[s.table];
    out.push({ k: s.kind, i: s.id, busy: taken, text: taken ? 'Hier sitzt schon jemand' : s.kind === 'bj' ? `Blackjack spielen · ${T.name} · ${euro(T.bets[0], true)} bis ${euro(T.bets[T.bets.length - 1], true)}` : `Roulette spielen · ${T.name} · Jetons ab ${euro(T.min, true)}`, d: best.d - 0.3 });
  }
  function sit(kind, id) {
    const s = (kind === 'bj' ? H3().seats : H4().seats)[id]; if (!s) return; fn.unlock(); P.kind = kind; P.s = s; C.phase = 'game'; P.camFrom = { p: C.cam.position.clone(), q: C.cam.quaternion.clone(), t: 0 }; P.wantUp = false; P.wait = false; P.steps = []; P.msg = '';
    hud.classList.add('ca-at-table'); $('caCross').classList.add('hidden'); fn.hint('');
    if (kind === 'bj') { $('caBJ').classList.remove('hidden'); clearCards(); const R = bjRound(C.S, me()); if (R && R.phase === 'player') { showInstant(R); P.msg = 'Deine Hand von vorhin geht weiter.'; } bjRefresh(); }
    else { $('caRou').classList.remove('hidden'); P.rou.bets = {}; P.rou.result = null; const T = ROU_TABLES[s.table]; P.rou.chip = clamp(P.rou.chip, 0, T.chips.length - 1); buildBoard(); rouRefresh(); drawLayout(); }
    snd.click();
  }
  function standUp(force) {
    if (!force && (busy() || P.wait)) { P.wantUp = true; fn.toast('Du stehst auf, sobald die Runde vorbei ist.'); return false; }
    if (!force && P.kind === 'bj') { const R = bjRound(C.S, me()); if (R && R.phase === 'player') { fn.toast('Erst die Hand zu Ende spielen (S = stehen bleiben).'); return false; } }
    if (P.kind === 'rou' && P.s) { const tb = H4().tables[P.s.table]; if (tb.st.spin) { tb.st.spin.finishNow(); } P.rou.bets = {}; drawLayout(); }
    C.phase = 'play'; P.kind = null; P.s = null; P.steps = []; P.wantUp = false; P.wait = false; P.rou.spinning = false; clearCards(); clearChips();
    $('caBJ').classList.add('hidden'); $('caRou').classList.add('hidden'); $('caCross').classList.remove('hidden'); hud.classList.remove('ca-at-table'); fn.hint('Klick ins Bild, damit die Maus wieder einrastet.'); return true;
  }

  // ---------- Karten und Jetons (3D) ----------
  function setUV(geo, c) { const q = cardUV(c); const uv = geo.attributes.uv; uv.setXY(0, q.u0, q.v1); uv.setXY(1, q.u1, q.v1); uv.setXY(2, q.u0, q.v0); uv.setXY(3, q.u1, q.v0); uv.needsUpdate = true; }
  function makeCard(c) { const g = new THREE.Group(); g.userData.live = true; const f = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), H3().cardMat); f.rotation.x = -Math.PI / 2; setUV(f.geometry, c); const b = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), H3().cardMat); b.rotation.x = Math.PI / 2; setUV(b.geometry, -1); g.add(f, b); W().scene.add(g); return { g, c, f }; }
  function clearCards() { for (const k of ['d', 'h0', 'h1']) { const arr = k === 'd' ? P.cards.d : P.cards.h[k === 'h0' ? 0 : 1]; for (const o of arr) { W().scene.remove(o.g); o.f.geometry.dispose(); } } P.cards = { d: [], h: [[], []] }; P.shown = null; }
  function cardPos(owner, hand, k, n, hands) {
    const s = P.s; if (owner === 'd') { const tb = H3().tables[s.table]; return { p: tb.dealerSpot.clone().add(V3(k * 0.078 - 0.04, k * 0.0009, 0)), yaw: 0 }; }
    const off = hands > 1 ? (hand === 0 ? -0.16 : 0.16) : 0; void n; const p = s.spot.clone().addScaledVector(s.tan, off + k * 0.046 - 0.023); p.y += k * 0.0009; const toO = V3(-Math.sin(s.a), 0, -Math.cos(s.a)); p.addScaledVector(toO, k * 0.012); return { p, yaw: s.cardYaw };
  }
  function chipStack(amount, pos) { const g = new THREE.Group(); g.userData.live = true; let left = amount; let n = 0; const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.0045, 18); for (const v of CHIP_VALUES) while (left >= v && n < 14) { left -= v; const m = new THREE.Mesh(geo, H3().chipMat[v]); m.position.y = 0.0025 + n * 0.0047; m.rotation.y = n * 0.7; g.add(m); n++; } g.position.copy(pos); W().scene.add(g); P.chips.push(g); return g; }
  function clearChips() { for (const g of P.chips) W().scene.remove(g); P.chips = []; }
  const queue = (dur, run, done) => P.steps.push({ dur, run, done, t: 0 });
  function tickSteps(dt) { const st = P.steps[0]; if (!st) return; st.t += dt; const u = st.dur > 0 ? Math.min(1, st.t / st.dur) : 1; if (st.run) st.run(u); if (u >= 1) { P.steps.shift(); if (st.done) st.done(); if (!P.steps.length) { bjRefresh(); if (P.wantUp) setTimeout(() => standUp(false), 400); } } }

  // Runde anzeigen: neue Karten aus dem Schlitten, Teilen verschiebt die zweite Karte, das Loch dreht der Dealer erst am Ende um
  function showInstant(R) { clearCards(); clearChips(); P.shown = snap(R); R.dealer.forEach((c, k) => { const o = makeCard(c); const t = cardPos('d', 0, k, R.dealer.length, 1); o.g.position.copy(t.p); o.g.rotation.set(0, t.yaw, k === 1 && R.hole ? Math.PI : 0); P.cards.d.push(o); });
    R.hands.forEach((h, hi) => h.cards.forEach((c, k) => { const o = makeCard(c); const t = cardPos('h', hi, k, h.cards.length, R.hands.length); o.g.position.copy(t.p); o.g.rotation.set(0, t.yaw, 0); P.cards.h[hi].push(o); })); R.hands.forEach((h, hi) => chipStack(h.bet, P.s.bet.clone().addScaledVector(P.s.tan, R.hands.length > 1 ? (hi ? 0.16 : -0.16) : 0))); }
  const snap = (R) => ({ seed: R.seed, d: R.dealer.length, h: R.hands.map((h) => h.cards.length), hole: R.hole, hands: R.hands.length });
  function applyRound(R) {
    const tb = H3().tables[P.s.table]; const shoe = tb.shoe; const old = P.shown; const fresh = !old || old.seed !== R.seed;
    if (fresh) { clearCards(); clearChips(); P.shown = { seed: R.seed, d: 0, h: [0], hole: true, hands: 1 }; chipStack(R.hands[0].bet, P.s.bet.clone()); snd.chips(3); }
    const sh = P.shown; const deal = (owner, hi, k, c, faceUp) => { const o = makeCard(c); o.g.position.copy(shoe); o.g.rotation.set(0, 0, Math.PI); o.g.visible = false; (owner === 'd' ? P.cards.d : P.cards.h[hi]).push(o);
      queue(0.34, (u) => { if (!o._s) { o._s = 1; o.g.visible = true; snd.cardDeal(); } const t = cardPos(owner, hi, k, 1, R.hands.length); const e = smooth(0, 1, u); o.g.position.lerpVectors(shoe, t.p, e); o.g.position.y += Math.sin(Math.PI * e) * 0.07; o.g.rotation.set(0, t.yaw * e, faceUp ? Math.PI * (1 - e) : Math.PI); }); };
    const relayout = () => queue(0.22, (u) => { R.hands.forEach((h, hi) => P.cards.h[hi].forEach((o, k) => { const t = cardPos('h', hi, k, h.cards.length, R.hands.length); o.g.position.lerp(t.p, smooth(0, 1, u)); o.g.rotation.set(0, t.yaw, 0); })); });
    if (fresh) { deal('h', 0, 0, R.hands[0].cards[0], true); deal('d', 0, 0, R.dealer[0], true); deal('h', 0, 1, R.hands[0].cards[1], true); deal('d', 0, 1, R.dealer[1], !R.hole); sh.d = 2; sh.h = [2]; }
    if (R.hands.length > 1 && sh.hands === 1) { // geteilt: zweite Karte wandert auf die zweite Hand
      const moved = P.cards.h[0].splice(1); P.cards.h[1] = moved; sh.h = [1, 1]; sh.hands = 2; relayout(); queue(0.01, null, () => chipStack(R.hands[1].bet, P.s.bet.clone().addScaledVector(P.s.tan, 0.16))); snd.chips(2); }
    R.hands.forEach((h, hi) => { for (let k = sh.h[hi] || 0; k < h.cards.length; k++) deal('h', hi, k, h.cards[k], true); sh.h[hi] = h.cards.length; if (h.doubled && !h._chipped) { h._chipped = true; queue(0.01, null, () => { chipStack(h.bet / 2, P.s.bet.clone().addScaledVector(P.s.tan, (R.hands.length > 1 ? (hi ? 0.16 : -0.16) : 0) + 0.05)); snd.chips(2); }); } });
    if (!R.hole && sh.hole) { sh.hole = false; const o = P.cards.d[1]; if (o) queue(0.45, (u) => { o.g.rotation.set(0, 0, Math.PI * (1 - smooth(0, 1, u))); o.g.position.y = H3().tables[P.s.table].dealerSpot.y + 0.0009 + Math.sin(Math.PI * u) * 0.05; if (u > 0.4 && !o._f) { o._f = 1; snd.cardFlip(); } }); }
    for (let k = sh.d; k < R.dealer.length; k++) { queue(0.35, null); deal('d', 0, k, R.dealer[k], true); } sh.d = R.dealer.length;
    if (R.phase === 'done') queue(0.3, null, () => showResult(R)); bjRefresh();
  }
  function showResult(R) {
    const lines = R.hands.map((h) => RES_TEXT[h.res] + (h.win > h.bet ? ` +${euro(h.win - h.bet, true)}` : '')); P.msg = lines.join(' · ');
    const net = R.win - R.hands.reduce((a, h) => a + h.bet, 0); const anyBJ = R.hands.some((h) => h.res === 'bj');
    if (anyBJ) { snd.slotWin(3); fn.bigWin('BLACKJACK!', euro(R.win, true), 'jackpot'); } else if (net > 0) { snd.slotWin(net >= R.hands[0].bet * 2 ? 2 : 1); if (net >= 5000) fn.bigWin('Gewonnen!', euro(R.win, true), 'big'); } else if (net < 0) snd.lose(); else snd.click();
    // Jetons: Gewinn kommt dazu, Verlust geht zum Dealer
    const tb = H3().tables[P.s.table]; const stacks = P.chips.slice(); R.hands.forEach((h, hi) => { if (h.win > h.bet) chipStack(h.win - h.bet, P.s.bet.clone().addScaledVector(P.s.tan, (R.hands.length > 1 ? (hi ? 0.16 : -0.16) : 0) - 0.05)); });
    if (net < 0) queue(0.6, (u) => { for (const g of stacks) g.position.lerp(tb.dealerSpot, smooth(0, 1, u) * 0.3); }, () => { for (const g of stacks) g.visible = false; });
    bjRefresh();
  }

  // ---------- Blackjack: Aktionen ----------
  const curBet = () => { const T = BJ_TABLES[P.s.table]; const b = P.bet[T.id]; return T.bets.includes(b) ? b : T.bets[0]; };
  function setBet(d) { if (!P.s || P.kind !== 'bj') return; const R = bjRound(C.S, me()); if (R && R.phase === 'player') return; const T = BJ_TABLES[P.s.table]; const i = clamp(T.bets.indexOf(curBet()) + d, 0, T.bets.length - 1); P.bet[T.id] = T.bets[i]; snd.click(); bjRefresh(); }
  function bjDo(a) {
    if (P.kind !== 'bj' || P.wait || busy()) return; const R = bjRound(C.S, me());
    if (a === 'deal') { if (R && R.phase === 'player') return; if (C.S.purse < curBet()) { fn.toast('Die Familienkasse reicht für diesen Einsatz nicht.'); snd.lose(); return; } }
    else if (!R || R.phase !== 'player' || !bjCan(R)[a]) return;
    if (a === 'deal') P.msg = '';
    if (host()) { const res = a === 'deal' ? bjDeal(C.S, me(), P.s.table, curBet(), (Math.random() * 4294967296) >>> 0) : bjAct(C.S, me(), a); if (!res.ok) { fn.toast(res.why); return; } fn.changed(); applyRound(res.R); if (res.level) setTimeout(() => fn.levelUp(res.level), 2600); if (C.net && res.R.phase === 'done' && res.R.win >= 10000) C.net.broadcast({ t: 'caev', k: 'tablewin', name: fn.myName(), v: res.R.win, what: 'Blackjack' }); }
    else { P.wait = true; C.net.send({ t: 'cabj', a, table: P.s.table, bet: curBet() }); }
    bjRefresh();
  }
  function bjRefresh() {
    if (P.kind !== 'bj' || !P.s) return; const T = BJ_TABLES[P.s.table]; const R = bjRound(C.S, me()); const can = bjCan(R); const running = !!(R && R.phase === 'player'); const b = busy() || P.wait; const l = luckFor(C.S, 'karten');
    $('caBJName').textContent = `${T.name} · Einsatz ${euro(T.bets[0], true)} bis ${euro(T.bets[T.bets.length - 1], true)}`; $('caBJLuck').textContent = `Glückssträhne am Tisch: ${luckWord(l)} · ×${l.toFixed(2).replace('.', ',')}`;
    $('caBJBet').textContent = euro(running && R ? R.hands[0].bet : curBet(), true); $('caBJMinus').disabled = running || b; $('caBJPlus').disabled = running || b;
    const showD = P.shown && R ? R.dealer.slice(0, P.shown.d).filter((_, i) => !(i === 1 && P.shown.hole)) : []; $('caBJDealer').textContent = showD.length ? String(handValue(showD).total) + (P.shown.hole ? ' + ?' : '') : '–';
    $('caBJMe').textContent = R && P.shown ? R.hands.map((h, hi) => { const v = handValue(h.cards.slice(0, (P.shown.h[hi] || 0))); return (R.hands.length > 1 && hi === R.cur && running ? '▸ ' : '') + (isBJ(h) && !b ? 'BJ' : v.total + (v.soft && v.total < 21 ? ' (weich)' : '')); }).join(' | ') : '–';
    $('caBJDeal').disabled = running || b; $('caBJHit').disabled = !can.hit || b; $('caBJStand').disabled = !can.stand || b; $('caBJDouble').disabled = !can.double || b || C.S.purse < (R ? R.hands[R.cur].bet : 0); $('caBJSplit').disabled = !can.split || b || C.S.purse < (R ? R.hands[R.cur].bet : 0); $('caBJTip').disabled = !running || b;
    $('caBJMsg').textContent = P.msg || (running ? 'Karte (H), Stehen (S), Verdoppeln (D)' + (can.split ? ', Teilen (T)' : '') : 'Einsatz wählen (Pfeile) und austeilen (Leertaste).');
  }
  function tip() { const R = bjRound(C.S, me()); const h = bjHint(R); if (!h) return; P.msg = `Teos Tipp: ${HINT_TEXT[h]}.`; snd.click(); bjRefresh(); }

  // ---------- Roulette ----------
  function buildBoard() {
    const T = ROU_TABLES[P.s.table]; const box = $('caRouBoard'); box.textContent = '';
    for (const cl of ROU_CELLS) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ca-rc ' + cl.col; b.dataset.k = cl.k; b.style.left = (cl.x / 20.48) + '%'; b.style.top = (cl.y / 10) + '%'; b.style.width = (cl.w / 20.48) + '%'; b.style.height = (cl.h / 10) + '%'; const sp = document.createElement('span'); sp.textContent = cl.label; b.append(sp); const ch = document.createElement('i'); b.append(ch);
      b.onclick = () => place(cl.k, 1); b.oncontextmenu = (e) => { e.preventDefault(); place(cl.k, -1); }; box.append(b); }
    const cs = $('caRouChips'); cs.textContent = ''; T.chips.forEach((v, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'ca-chip' + (i === P.rou.chip ? ' on' : ''); b.style.setProperty('--c', chipColor(v)); b.textContent = euro(v, false).replace(' €', ''); b.title = euro(v, true); b.onclick = () => { P.rou.chip = i; snd.click(); rouRefresh(); }; cs.append(b); });
  }
  function place(k, dir) {
    if (P.kind !== 'rou' || P.rou.spinning || P.wait) return; const T = ROU_TABLES[P.s.table]; const v = T.chips[P.rou.chip]; const bets = P.rou.bets; if (P.rou.result !== null) { P.rou.result = null; }
    if (dir > 0) { const tot = totalBet(bets) + v; if (tot > T.max) { fn.toast(`Höchstens ${euro(T.max, true)} pro Runde an diesem Tisch.`); return; } if (tot > C.S.purse) { fn.toast('Die Familienkasse reicht nicht für noch einen Jeton.'); snd.lose(); return; } bets[k] = (bets[k] || 0) + v; snd.chips(1); }
    else { if (!bets[k]) return; bets[k] = Math.max(0, bets[k] - v); if (!bets[k]) delete bets[k]; snd.click(); }
    rouRefresh(); drawLayout();
  }
  function drawLayout() { if (!P.s || P.kind !== 'rou') return; const tb = H4().tables[P.s.table]; const c = tb.layTex.userData.canvas; drawRouLayout(c.getContext('2d'), c.width, c.height, { bets: P.rou.bets, win: P.rou.result }); tb.layTex.needsUpdate = true; }
  function rouRefresh() {
    if (P.kind !== 'rou' || !P.s) return; const T = ROU_TABLES[P.s.table]; const l = luckFor(C.S, 'roulette'); const tot = totalBet(P.rou.bets);
    $('caRouName').textContent = `${T.name} · Jetons ab ${euro(T.min, true)} · bis ${euro(T.max, true)} je Runde`; $('caRouLuck').textContent = `Glückssträhne am Kessel: ${luckWord(l)} · ×${l.toFixed(2).replace('.', ',')}`;
    $('caRouSum').textContent = euro(tot, true); for (const b of $('caRouChips').children) b.classList.toggle('on', [...$('caRouChips').children].indexOf(b) === P.rou.chip);
    for (const b of $('caRouBoard').children) { const v = P.rou.bets[b.dataset.k]; const i = b.querySelector('i'); i.textContent = v ? euro(v, false).replace(' €', '') : ''; i.style.setProperty('--c', v ? chipColor(v) : 'transparent'); b.classList.toggle('hit', P.rou.result !== null && b.dataset.k === 'n' + P.rou.result); }
    const sp = P.rou.spinning || P.wait; $('caRouSpin').disabled = sp || !tot; $('caRouClear').disabled = sp || !tot; $('caRouAgain').disabled = sp || !Object.keys(P.rou.last).length;
    const last = C.S.rouLast || []; const box = $('caRouLast'); box.textContent = ''; for (const n of last.slice(0, 10)) { const e = document.createElement('b'); e.className = colorOf(n); e.textContent = String(n); box.append(e); }
    $('caRouMsg').textContent = P.msg || (sp ? 'Rien ne va plus …' : tot ? 'Leertaste: Kessel drehen' : 'Jeton wählen und aufs Tableau legen (Rechtsklick nimmt zurück).');
  }
  function rouSpin() {
    if (P.kind !== 'rou' || P.rou.spinning || P.wait) return; const bets = { ...P.rou.bets }; const tot = totalBet(bets); if (!tot) { fn.toast('Erst Jetons aufs Tableau legen.'); return; } if (C.S.purse < tot) { fn.toast('Die Familienkasse reicht nicht.'); return; }
    P.msg = ''; if (host()) { const res = playRoulette(C.S, me(), P.s.table, bets, (Math.random() * 4294967296) >>> 0); if (!res.ok) { fn.toast(res.why); return; } fn.changed(); startSpin(res); if (C.net && res.win >= res.bet * 10 && res.win >= 10000) C.net.broadcast({ t: 'caev', k: 'tablewin', name: fn.myName(), v: res.win, what: 'Roulette' }); }
    else { P.wait = true; C.net.send({ t: 'carou', table: P.s.table, bets }); } rouRefresh();
  }
  function startSpin(res) {
    const tb = H4().tables[P.s.table]; const st = tb.st; P.rou.last = { ...res.bets }; P.rou.spinning = true; P.rou.result = null; const idx = WHEEL.indexOf(res.n); const T = 6.4; let nextClick = 0.62; snd.rouRoll(T * 0.64); snd.chips(2);
    st.spin = { t: 0, step(dt) { this.t += dt; const u = Math.min(1, this.t / T); st.omega = 0.45 + 2.3 * Math.exp(-this.t / 2.4); st.phi += st.omega * dt; tb.rotor.rotation.y = st.phi;
        const rel = 2 * Math.PI * 9 * (1 - u) * (1 - u); const th = st.phi + idx * POCKET + rel; const drop = smooth(0.6, 0.8, u); let r = 0.4 + (0.232 - 0.4) * drop; let y = tb.wheel.y + 0.052 + (0.012 - 0.052) * drop;
        if (u > 0.64 && u < 0.93) { const k = (u - 0.64) / 0.29; const b = Math.abs(Math.sin(k * Math.PI * 5)) * (1 - k) * 0.03; y += b; r += b * 0.4; if (u >= nextClick) { nextClick = u + 0.035 + k * 0.05; snd.rouClick(1 - k * 0.6); } }
        tb.ball.position.set(tb.wheel.x + Math.cos(th) * r, y, -Math.sin(th) * r); if (u >= 1) this.finishNow(); },
      finishNow() { if (st.spin !== this) return; st.rest = idx; st.spin = null; st.omega = 0.45; rouDone(res); } };
  }
  function rouDone(res) {
    P.rou.spinning = false; if (P.kind !== 'rou' || !P.s) return; P.rou.result = res.n; const tb = H4().tables[P.s.table]; const c = cellCenter('n' + res.n); if (c) { tb.dolly.position.set(tb.layOut.x - tb.layOut.w / 2 + c.x * tb.layOut.w, 0.805, -tb.layOut.d / 2 + c.y * tb.layOut.d); tb.dolly.visible = true; setTimeout(() => { tb.dolly.visible = false; }, 6000); }
    const col = colorOf(res.n); const net = res.win - res.bet; P.msg = `${res.n} · ${col === 'gruen' ? 'Null' : col === 'rot' ? 'Rot' : 'Schwarz'}${res.n ? (res.n % 2 ? ' · Ungerade' : ' · Gerade') : ''} — ${res.win ? 'Gewinn ' + euro(res.win, true) : 'kein Gewinn'}`;
    if (res.bets['n' + res.n]) { snd.slotWin(3); fn.bigWin(`Volltreffer: ${res.n}!`, euro(res.win, true), 'jackpot'); } else if (net > 0) snd.slotWin(net >= res.bet ? 2 : 1); else if (res.win > 0) snd.click(); else snd.lose();
    if (res.level) setTimeout(() => fn.levelUp(res.level), 1800); P.rou.bets = {}; drawLayout(); rouRefresh(); if (P.wantUp) setTimeout(() => standUp(false), 1200);
  }

  // ---------- Kamera, Tasten, Takt ----------
  function camFrame(dt) {
    const s = P.s; const cam = C.cam; const q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(s.cam.pos, s.cam.look, V3(0, 1, 0)));
    const fr = P.camFrom; if (fr && fr.t < 1) { fr.t = Math.min(1, fr.t + dt / 0.6); const k = fr.t * fr.t * (3 - 2 * fr.t); cam.position.lerpVectors(fr.p, s.cam.pos, k); cam.quaternion.slerpQuaternions(fr.q, q0, k); } else { cam.position.copy(s.cam.pos); cam.quaternion.copy(q0); } cam.fov = P.kind === 'rou' ? 56 : 50;
  }
  function frame(dt) { if (!P.s) return; camFrame(dt); tickSteps(dt); }
  function key(code) {
    if (code === 'Escape' || code === 'KeyE') { standUp(false); return; }
    if (P.kind === 'bj') { if (code === 'Space' || code === 'Enter') bjDo('deal'); else if (code === 'KeyH') bjDo('hit'); else if (code === 'KeyS') bjDo('stand'); else if (code === 'KeyD') bjDo('double'); else if (code === 'KeyT') bjDo('split'); else if (code === 'KeyQ') tip(); else if (code === 'ArrowLeft' || code === 'ArrowDown') setBet(-1); else if (code === 'ArrowRight' || code === 'ArrowUp') setBet(1); }
    else if (P.kind === 'rou') { const T = ROU_TABLES[P.s.table]; if (code === 'Space' || code === 'Enter') rouSpin(); else if (code === 'Backspace' || code === 'Delete') { if (!P.rou.spinning) { P.rou.bets = {}; drawLayout(); rouRefresh(); } } else if (code === 'KeyR') again(); else if (code === 'ArrowLeft' || code === 'ArrowDown') { P.rou.chip = clamp(P.rou.chip - 1, 0, T.chips.length - 1); rouRefresh(); } else if (code === 'ArrowRight' || code === 'ArrowUp') { P.rou.chip = clamp(P.rou.chip + 1, 0, T.chips.length - 1); rouRefresh(); } else if (/^Digit[1-4]$/.test(code)) { P.rou.chip = clamp(Number(code.slice(5)) - 1, 0, T.chips.length - 1); rouRefresh(); } }
  }
  function again() { if (P.rou.spinning || P.wait) return; const T = ROU_TABLES[P.s.table]; const tot = totalBet(P.rou.last); if (!tot) return; if (tot > C.S.purse) { fn.toast('Die Familienkasse reicht nicht für dieselben Einsätze.'); return; } if (tot > T.max) return; P.rou.bets = { ...P.rou.last }; P.rou.result = null; snd.chips(3); drawLayout(); rouRefresh(); }
  $('caBJDeal').onclick = () => bjDo('deal'); $('caBJHit').onclick = () => bjDo('hit'); $('caBJStand').onclick = () => bjDo('stand'); $('caBJDouble').onclick = () => bjDo('double'); $('caBJSplit').onclick = () => bjDo('split'); $('caBJTip').onclick = tip; $('caBJMinus').onclick = () => setBet(-1); $('caBJPlus').onclick = () => setBet(1); $('caBJUp').onclick = () => standUp(false);
  $('caRouSpin').onclick = rouSpin; $('caRouClear').onclick = () => key('Backspace'); $('caRouAgain').onclick = again; $('caRouUp').onclick = () => standUp(false);

  // ---------- Mehrspieler ----------
  function message(from, m) {
    if (!C.net) return false; const name = (C.net.players.find((p) => p.id === from) || {}).name || from;
    if (m.t === 'cabj' && host()) { const res = m.a === 'deal' ? bjDeal(C.S, name, m.table | 0, m.bet | 0, (Math.random() * 4294967296) >>> 0) : bjAct(C.S, name, String(m.a)); if (res.ok) fn.changed(); C.net.sendTo(from, { t: 'cabjr', ok: res.ok, why: res.why, R: res.R, level: res.level }); if (res.ok && res.R.phase === 'done' && res.R.win >= 10000) C.net.broadcast({ t: 'caev', k: 'tablewin', name, v: res.R.win, what: 'Blackjack' }); return true; }
    if (m.t === 'cabjr') { P.wait = false; if (!m.ok) { fn.toast(m.why); bjRefresh(); return true; } if (P.kind === 'bj' && P.s) applyRound(m.R); if (m.level) setTimeout(() => fn.levelUp(m.level), 2600); return true; }
    if (m.t === 'carou' && host()) { const res = playRoulette(C.S, name, m.table | 0, m.bets || {}, (Math.random() * 4294967296) >>> 0); if (res.ok) fn.changed(); C.net.sendTo(from, { t: 'caroulr', ...res }); if (res.ok && res.win >= res.bet * 10 && res.win >= 10000) C.net.broadcast({ t: 'caev', k: 'tablewin', name, v: res.win, what: 'Roulette' }); return true; }
    if (m.t === 'caroulr') { P.wait = false; if (!m.ok) { fn.toast(m.why); rouRefresh(); return true; } if (P.kind === 'rou' && P.s) startSpin(m); rouRefresh(); return true; }
    if (m.t === 'caev' && m.k === 'tablewin') { if (m.name !== fn.myName()) fn.toast(`${m.name} gewinnt ${euro(m.v, true)} beim ${m.what}!`, 'gold'); return true; }
    return false;
  }
  function stop() { if (P.kind === 'rou' && P.s) { const tb = H4().tables[P.s.table]; if (tb.st.spin) { tb.st.spin = null; } } P.kind = null; P.s = null; P.steps = []; P.wait = false; P.rou.spinning = false; clearCards(); clearChips(); $('caBJ').classList.add('hidden'); $('caRou').classList.add('hidden'); }
  return { target, sit, standUp, frame, key, message, stop, seatOf, get seatKey() { return keyOf(P.s); }, get kind() { return P.kind; }, P, bjDo, rouSpin, place };
}
