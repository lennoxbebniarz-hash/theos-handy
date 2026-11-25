// Theos Seitenscheidel - Teo's Casino: der Tagesablauf.
// Uhr von 10 bis 24 Uhr (eine Spielminute pro echter Sekunde), Wochen und Tage, Glückssträhne, Durchsagen und kleine Ereignisse,
// Sperrstunde mit Security-Cutscene, Big Bruno Gamblemeister (Cutscene und Rubbel-Duell), Teo persönlich, die verlorene Geldbörse,
// die Wohnung aus dem Intro in Ego-Perspektive mit dem Familien-PC (TeoOS: Glücks-Upgrades, Deko, Verträge, Kalender) und der Schlaf in den nächsten Tag.
// Mehrspieler: Der Host führt Uhr und Spielstand, die anderen schicken Wünsche. Cutscenes spielt jeder bei sich ab.
import * as THREE from './vendor/three.module.min.js';
import { OPEN, LEAVE, CLOSE, WARN, MIN_PER_SEC, clockText, dayInfo, luckFor, luckWord, eventsFor, EVENT, activeEvents, bigEventFor, nextDay, CONTRACT, rateOf, weeklyDue, debtTotal, payDebt, HOME_ITEMS, HOME, buyHome, brunoCards, makeCard, cardWin, euro, levelFor, WEEKDAYS, netWorth, LOANS, LOAN_FEE, LOAN_WEEKS, takeLoan, payLoan, loanRest, isBroke, minStake, giftReady, gift } from './casinologic.js';
import { createPerson, walkTo, faceTo, PLAYER_LOOKS } from './casinofig.js';
import { cardThumb } from './casinocards.js';
import { ctex } from './casinoart.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const sum = (a) => a.reduce((s, v) => s + v, 0);
const EYE = 1.62;
const LOOK = {
  guard1: { shirt: 0x101014, cap: 0x101014, brim: 0x101014, hair: 0x101014, skin: 0xc8946a, pants: 0x101014 },
  guard2: { shirt: 0x101014, cap: 0x1c1c20, brim: 0x1c1c20, hair: 0x1c1c20, skin: 0x7a4a2e, pants: 0x101014 },
  bruno: { shirt: 0xf2ede2, cap: 0x141414, brim: 0x141414, hair: 0x1a1410, skin: 0xd8a47e, pants: 0xf2ede2 },
  teo: { shirt: 0xd9a54a, cap: 0x101010, brim: 0x101010, hair: 0xdedede, skin: 0xe8bc98, pants: 0x2a1c14 },
};
const WALLET_SPOTS = [[-12.5, -3.1], [12.8, -24.2], [-2.6, -20.5], [3.4, 4.4], [-15.9, -8.4], [9.4, -9.8]];
const FAM_LINES = ['„Heute Abend gewinnen wir. Ich spür das.“', '„Ich hab im Traum ein Dreierglück gesehen. Dreimal Teo!“', '„Vergiss die Wochenrate nicht. Sonntagnacht wird abgebucht.“', '„So ein Fernseher wäre schon schön …“', '„Morgens ist im Casino alles verhext. Abends läuft es besser.“', '„Ein Hufeisen über der Tür. Schaden kann es nicht.“', '„Wenn wir den eigenen Rubbeltisch hätten … mal anderthalb Glück!“'];
const TEO_LINES = ['Teo: „Gefällt sie euch? Ich finde, sie trifft mich ganz gut.“', 'Teo: „Ich war auch mal pleite. Dann hab ich ein Casino gekauft.“', 'Teo: „Weil ich reich bin. Steht doch da.“'];
const BRUNO_TAUNTS = ['Bruno: „Na, Kleiner? Traust du dich an meinen Tisch?“', 'Bruno: „Ich rubbel schneller, als du Jackpot sagen kannst.“', 'Bruno: „Zehn Euro Einsatz. Oder ist euch das zu teuer?“'];

export function createDay(X) {
  const { C, $, snd, hud, fn } = X;
  const D = { last: null, syncT: 0, hudT: 0, banT: 0, lineT: 0, cut: null, where: 'casino', home: null, ownedKey: '', power: 1, doorK: 0, doorWant: 0, doorFast: false, atHome: new Map(), pcTab: 'glueck', hold: 0, shake: 0, evKey: '', camLook: V3(), shown: 0, revealT: 0, result: null, taunt: -1, famI: 0, teoI: 0, duelShow: false };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const toast = (t, k) => fn.toast(t, k);
  const host = () => fn.isHost();
  const today = () => eventsFor(C.S.day).map((id) => EVENT[id]);
  const active = (id) => activeEvents(C.S).some((e) => e.id === id);
  const inCasino = () => D.where === 'casino';
  const num = (v) => v.toFixed(2).replace('.', ',');

  // ======================= Uhr =======================
  function running() { const ph = C.phase; if (ph !== 'play' && ph !== 'table' && ph !== 'home' && ph !== 'slot' && ph !== 'game' && ph !== 'arc') return false; if (!C.net && (C.ui || fn.tourOpen())) return false; return true; }
  function tick(dt, t) {
    const S = C.S; if (!S || !C.W) return;
    if (host() && running() && S.clock < CLOSE) S.clock = Math.min(CLOSE, S.clock + dt * MIN_PER_SEC); // Mitspieler bekommen die Uhr vom Host
    if (host() && C.net && (D.syncT += dt) > 1) { D.syncT = 0; C.net.broadcast({ t: 'caclk', c: Math.round(S.clock * 10) / 10, d: S.day }); }
    if (C.phase !== 'intro' && C.phase !== 'off') { boundaries(); if (host()) hostTick(); }
    if (D.where === 'casino' && C.phase !== 'intro') worldTick(dt, t);
    if (D.cut) { D.cut.pt = D.cut.t; D.cut.t += dt; cutStep(D.cut, dt); }
    D.shake = Math.max(0, D.shake - dt * 1.3);
    hudTick(dt); duelTick(dt);
    if (D.banT > 0 && (D.banT -= dt) <= 0) $('caBanner').classList.remove('on');
    if (D.lineT > 0 && (D.lineT -= dt) <= 0) $('caCutLine').classList.remove('on');
  }
  // Grenzen überschreiten: Ereignisse beginnen und enden, 20 Uhr, 23:30 Uhr, Mitternacht
  function boundaries() {
    const S = C.S; const now = S.clock; const day = S.day;
    if (!D.last || D.last.day !== day || now < D.last.c) { D.last = { day, c: now }; if (now >= CLOSE && inCasino() && (C.phase === 'play' || C.phase === 'table' || C.phase === 'slot' || C.phase === 'game' || C.phase === 'arc')) midnight(); return; }
    const a = D.last.c; D.last.c = now; if (now === a) return; const cross = (m) => a < m && now >= m;
    for (const e of today()) { if (cross(e.from)) eventStart(e); if (e.to < CLOSE && cross(e.to)) eventEnd(e); }
    const big = bigEventFor(day); if (big && cross(big.at)) brunoArrive(big);
    if (cross(LEAVE) && inCasino()) { snd.chime(); banner('Es ist 20 Uhr', 'Feierabend erlaubt', 'Ab jetzt dürft ihr nach Hause gehen: Der Ausgang ist im Foyer. Wer bleibt, hat die beste Glückssträhne vor sich.', 'info'); }
    if (cross(WARN) && inCasino()) { snd.chime(); banner('Durchsage', 'Noch 30 Minuten', 'Teo\'s Casino schließt um Mitternacht. Bitte macht eure letzten Spiele. Wer um 24 Uhr noch drin ist, wird hinausgetragen.', 'warn'); }
    if (cross(CLOSE - 5) && inCasino()) { snd.chime(); banner('Letzte Durchsage', 'Fünf Minuten', 'Die Security macht sich bereit. Ab zum Ausgang!', 'warn'); }
    if (cross(CLOSE)) { if (inCasino() && (C.phase === 'play' || C.phase === 'table' || C.phase === 'slot' || C.phase === 'game' || C.phase === 'arc')) midnight(); else if (!inCasino()) toast('Mitternacht. Zeit fürs Bett.'); }
  }
  const outdoors = () => C.me.z > 8.7 || C.me.x < -22.4;
  function midnight() { if (outdoors() && C.phase === 'play') { toast('Mitternacht: der letzte Nachtbus kommt.'); busHome(true); } else securityOut(); }
  function hostTick() {
    const S = C.S; const day = S.day; if (!Array.isArray(S.done2)) S.done2 = [];
    if (active('gratis') && !S.done2.includes('gr' + day)) { S.done2.push('gr' + day); const who = ['me', ...(C.net ? C.net.players.filter((p) => p.id !== fn.myId()).map((p) => p.name) : [])]; const luck = luckFor(S, 'lose'); for (const w of who) (S.inv[w] = S.inv[w] || []).push({ uid: S.uid++, cid: 'rad', seed: (Math.random() * 4294967296) >>> 0, st: 'neu', gift: true, luck }); fn.changed(); }
    if (!S.over && !D.cut && C.phase !== 'intro' && S.purse < minStake(S) && giftReady(S)) { const g = gift(S, 'me', Date.now(), (Math.random() * 4294967296) >>> 0); if (g) { g.luck = luckFor(S, 'lose'); fn.changed(); toast('Teo schenkt euch ein letztes Glücksrad-Los. Es liegt im Inventar (Tab).', 'gold'); snd.sparkle(); } }
    if (!D.cut && C.phase !== 'intro' && C.phase !== 'off' && isBroke(S)) { S.over = { day: S.day, clock: S.clock, peak: S.peak }; fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'over' }); gameOver(); return; }
    const big = bigEventFor(day); const b = S.bruno && S.bruno.day === day ? S.bruno : null;
    if (big && S.clock >= big.until && !(b && (b.done || b.st === 'duel'))) { S.bruno = { day, done: true, st: 'weg' }; fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'brunogone' }); brunoGone(); }
  }

  // ======================= Anzeige =======================
  function hudTick(dt) {
    const S = C.S; if (!S) return; D.hudT -= dt; if (D.hudT > 0) return; D.hudT = 0.25;
    const di = dayInfo(S.day); $('caDayT').textContent = di.name; $('caDayN').textContent = `Woche ${di.week} · Tag ${S.day}`;
    const tEl = $('caTime'); tEl.textContent = clockText(S.clock); tEl.classList.toggle('late', S.clock >= WARN && inCasino()); tEl.classList.toggle('free', S.clock >= LEAVE && S.clock < WARN && inCasino());
    const l = luckFor(S, 'lose'); const w = luckWord(l); $('caLuckT').textContent = `${w} · ×${num(l)}`; $('caLuckBar').style.transform = `scaleX(${clamp((l - 0.9) / 0.9, 0.04, 1)})`; $('caClock').dataset.luck = w; snd.mood(clamp((l - 1) / 0.8, 0, 1));
    const key = S.day + ':' + Math.floor(S.clock / 5) + ':' + (S.bruno ? S.bruno.st : '') + D.where; if (key !== D.evKey) { D.evKey = key; renderEvents(); }
    if (C.ui === 'pc' && (D.pcT = (D.pcT || 0) + 1) % 8 === 0) $('caPCClock').textContent = clockText(S.clock);
  }
  function renderEvents() {
    const S = C.S; const box = $('caEvs'); box.textContent = ''; const big = bigEventFor(S.day);
    const add = (name, from, to, cls) => { const st = S.clock >= to ? 'done' : S.clock >= from ? 'live' : 'soon'; const d = el('div', 'ca-ev ' + st + (cls ? ' ' + cls : '')); d.append(el('b', '', name), el('span', '', st === 'live' ? 'läuft' : st === 'done' ? 'vorbei' : 'ab ' + clockText(from))); box.append(d); };
    for (const e of today().slice().sort((a, b) => a.from - b.from)) add(e.name, e.from, e.to);
    if (big) { const gone = S.bruno && S.bruno.day === S.day && S.bruno.done; add('Big Bruno', big.at, gone ? -1 : big.until, 'bigev'); }
  }
  function banner(k, h, t, kind = '') { const b = $('caBanner'); $('caBanK').textContent = k; $('caBanH').textContent = h; $('caBanT').textContent = t || ''; b.className = 'ca-banner ' + kind; void b.offsetWidth; b.classList.add('on'); D.banT = 7; }
  function dayBanner() { const S = C.S; const di = dayInfo(S.day); const l = luckFor(S, 'lose'); const big = bigEventFor(S.day); banner(`Woche ${di.week} · Tag ${S.day}`, `${di.name}, ${clockText(S.clock)} Uhr`, `Glückssträhne gerade: ${luckWord(l)} (×${num(l)}). Sie wird bis Mitternacht immer besser.${big && S.clock < big.at ? ` Heute ab ${clockText(big.at)} Uhr: ${big.name}!` : ''}`, 'day'); }
  function eventStart(e) {
    if (!inCasino() || C.phase === 'intro') return; snd.chime(); banner('Durchsage', e.name, e.text, 'event');
    if (e.dark) { snd.zap(); setTimeout(() => snd.gasp(), 260); }
    if (e.id === 'teo') setTimeout(() => snd.brass(), 900);
    if (e.id === 'doppel' || e.id === 'happy' || e.id === 'gratis') setTimeout(() => snd.sparkle(), 900);
  }
  function eventEnd(e) { if (!inCasino()) return; if (e.dark) { snd.zap(); banner('Durchsage', 'Der Strom ist wieder da', 'Danke für eure Geduld. Die Glückssträhne bleibt euch trotzdem gewogen.', 'info'); } else if (e.id === 'happy' || e.id === 'doppel' || e.id === 'rabatt') toast(`${e.name} ist vorbei.`); }

  // ======================= Figuren in der Halle =======================
  function actor(key, look) { if (!D[key]) { D[key] = createPerson(C.W.scene, look); D[key].setVisible(false); } return D[key]; }
  function brunoFig() {
    const b = actor('bruno', LOOK.bruno); if (b.decor) return b; b.decor = true;
    const gold = new THREE.MeshStandardMaterial({ color: 0xd9a54a, metalness: 1, roughness: 0.22, envMap: C.W.room.env, envMapIntensity: 1.4 }); const bone = b.fig.bones.spine2 || b.fig.bones.neck;
    if (bone) { const ch = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.011, 6, 26), gold); ch.rotation.x = Math.PI / 2 - 0.5; ch.position.set(0, 0.16, 0.05); ch.castShadow = true; bone.add(ch); }
    b.card = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3 * 640 / 1024).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ roughness: 0.55, envMap: C.W.room.env, envMapIntensity: 0.5 })); const tex = new THREE.CanvasTexture(cardThumb('drei', 320).canvas); tex.colorSpace = THREE.SRGBColorSpace; b.card.material.map = tex; b.card.visible = false; b.card.receiveShadow = true; C.W.scene.add(b.card);
    return b;
  }
  function brunoState() { const S = C.S; const big = bigEventFor(S.day); if (!big) return null; const b = S.bruno && S.bruno.day === S.day ? S.bruno : null; const duel = !!(b && b.st === 'duel'); const done = !!(b && b.done); return { big, b, duel, done, here: S.clock >= big.at && (S.clock < big.until || duel) && !done }; }
  function worldTick(dt, t) {
    const S = C.S; const W = C.W;
    const dark = activeEvents(S).some((e) => e.dark); D.power += ((dark ? 0.14 : 1) - D.power) * Math.min(1, dt * (dark ? 7 : 1.4)); if (W.setPower) W.setPower(D.power);
    if (!D.cut && (C.phase === 'play' || C.phase === 'home')) { const m = C.me; let near = D.where === 'casino' && Math.abs(m.x) < 3.4 && m.z > 5.0 && m.z < 12.4; if (!near) for (const [, r] of C.remotes) if (r.last && !r.home && Math.abs(r.last.x) < 3.4 && r.last.z > 5.0 && r.last.z < 12.4) near = true; D.doorWant = near ? 1 : 0; }
    D.doorK += clamp(D.doorWant - D.doorK, -dt * (D.doorFast ? 9 : 2.4), dt * (D.doorFast ? 9 : 2.4)); if (Math.abs(D.doorK - D.doorWant) < 0.01) D.doorFast = false; if (C.phase !== 'intro') W.setDoors(D.doorK);
    walletTick(t); teoTick(dt, t); brunoTick(dt, t);
    if (C.phase === 'play') snd.listen(C.me.x, C.me.z);
  }
  // Verlorene Geldbörse
  const walletSpot = () => WALLET_SPOTS[((C.S.day * 2654435761) >>> 0) % WALLET_SPOTS.length];
  function walletTick(t) {
    const S = C.S; const on = active('boerse') && !S.done2.includes('w' + S.day); if (!on && !D.wallet) return;
    if (!D.wallet) { const g = new THREE.Group(); const leather = new THREE.MeshStandardMaterial({ color: 0x4a2814, roughness: 0.5, metalness: 0.05 }); const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.024, 0.095), leather); m.position.y = 0.012; m.castShadow = true; g.add(m); const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.006, 0.1), new THREE.MeshStandardMaterial({ color: 0x8a5a2a, roughness: 0.6 })); stitch.position.y = 0.012; g.add(stitch); const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.028, 0.012), new THREE.MeshStandardMaterial({ color: 0xd9a54a, metalness: 1, roughness: 0.3 })); clasp.position.set(0, 0.014, 0.048); g.add(clasp); const note = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.004, 0.05), new THREE.MeshStandardMaterial({ color: 0x8ab08a, roughness: 0.8 })); note.position.set(0.02, 0.026, -0.01); note.rotation.y = 0.3; g.add(note);
      const glint = ctex(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.25, 'rgba(255,220,120,.55)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); c.fillStyle = 'rgba(255,255,240,.9)'; c.fillRect(30, 0, 4, 64); c.fillRect(0, 30, 64, 4); }, { clamp: true });
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glint, color: new THREE.Color(2.2, 1.9, 1.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(0.42); s.position.y = 0.06; g.add(s); C.W.scene.add(g); D.wallet = { g, s }; }
    const w = D.wallet; w.g.visible = on; if (on) { const sp = walletSpot(); w.g.position.set(sp[0], 0.004, sp[1]); w.g.rotation.y = sp[0]; w.s.material.opacity = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2.6)) ** 6; }
  }
  // Teo besucht seine Statue
  function teoTick(dt, t) {
    const on = active('teo'); if (!on && !D.teo) return; const p = actor('teo', LOOK.teo); if (D.cut && D.cut.owns.includes(p)) return;
    if (on && !p.visible && p.st !== 'out') { p.setVisible(true); p.place(0, 0, 7.4, Math.PI); p.st = 'in'; }
    if (!on && p.visible && p.st !== 'out') p.st = 'out'; if (!p.visible) { if (!on) p.st = null; return; }
    const m = C.me;
    if (p.st === 'in') { p.lookAt = null; p.act = 0; if (walkTo(p, 0, -7.9, dt, 1.05)) p.st = 'stay'; }
    else if (p.st === 'stay') { p.mode = 'stand'; p.speed = 0; faceTo(p, 0, -12, dt); const near = inCasino() && Math.hypot(m.x - p.x, m.z - p.z) < 3.4; p.lookAt = near ? V3(m.x, EYE, m.z) : V3(0, 3.3, -12); if (near) { D.teoWave = (D.teoWave || 0) + dt; p.act = D.teoWave < 1.8 ? 'wave' : 0; if (p.act === 'wave' && p.actT === undefined) p.actT = 0; } else { D.teoWave = 0; p.act = Math.sin(t * 0.4) > 0.3 ? 'point' : 0; } }
    else if (p.st === 'out') { p.lookAt = null; p.act = 0; if (walkTo(p, 0, 8.4, dt, 1.2)) { p.setVisible(false); } }
    p.update(dt, t);
  }
  // Big Bruno am Tisch 3
  function brunoTick(dt, t) {
    const st = brunoState(); if (!st && !D.bruno) return; const p = brunoFig(); if (D.cut && D.cut.owns.includes(p)) return;
    const tb = C.W.tables[st ? st.big.table : 2]; const seat = { x: tb.x - 0.82, z: tb.z };
    if (st && st.here) { if (!p.visible || p.st === 'leave') { p.setVisible(true); p.place(seat.x, 0, seat.z, Math.PI / 2); p.st = 'sit'; } }
    else if (p.visible && p.st !== 'leave') { const res = st && st.b && st.b.res; p.st = 'leave'; p.leaveT = 0; p.delay = res ? 4.6 : 0.6; p.mood = st && st.b ? st.b.st : 'weg'; p.route = [[seat.x - 0.4, tb.z], [4.4, tb.z > -12 ? -1.5 : -12.5], [4.0, -6.0], [0, 0.6], [0, 8.6]]; p.wp = 0; }
    if (!p.visible) { if (p.card) p.card.visible = false; return; }
    const m = C.me;
    if (p.st === 'sit') {
      p.place(seat.x, 0, seat.z, Math.PI / 2); p.seat = 0.5; const duel = st && st.duel; p.mode = duel ? 'scratch' : 'sit';
      const near = inCasino() && Math.hypot(m.x - p.x, m.z - p.z) < 3.4; p.lookAt = near ? V3(m.x, EYE, m.z) : null;
      if (near && !duel && D.taunt !== C.S.day) { D.taunt = C.S.day; toast(BRUNO_TAUNTS[Math.floor(Math.random() * BRUNO_TAUNTS.length)]); }
      if (D.brunoAct && D.brunoAct.t > 0) { D.brunoAct.t -= dt; p.act = D.brunoAct.a; if (p.actT === undefined) p.actT = 0; p.sad = D.brunoAct.a === 'sad' ? 1 : 0; if (p.act === 'sad') p.act = 0; } else { p.act = 0; p.actT = undefined; p.sad = 0; }
      p.card.visible = !!duel; if (duel) { p.card.position.set(tb.x - 0.1, 0.804, tb.z); p.card.rotation.set(0, -Math.PI / 2, 0); const a = t * 2.2; p.coin = V3(tb.x - 0.1 + Math.sin(a * 1.3) * 0.06, 0.82, tb.z + Math.cos(a) * 0.1); }
    } else if (p.st === 'leave') {
      p.leaveT += dt; p.card.visible = false; p.coin = null;
      if (p.leaveT < p.delay) { p.place(seat.x, 0, seat.z, Math.PI / 2); p.mode = 'sit'; p.act = p.mood === 'won' ? 'slam' : p.mood === 'lost' ? 'cheer' : 0; if (p.actT === undefined) p.actT = 0; p.sad = p.mood === 'won' ? 0.6 : 0; }
      else { p.sad = 0; p.act = 0; p.actT = undefined; const pt = p.route[p.wp]; if (!pt) { p.setVisible(false); p.st = null; } else if (walkTo(p, pt[0], pt[1], dt, p.mood === 'won' ? 1.9 : 1.4)) p.wp++; }
    }
    p.update(dt, t);
  }
  function brunoGone() { if (inCasino()) banner('Durchsage', 'Big Bruno geht', 'Big Bruno Gamblemeister verlässt das Casino: „Keiner traut sich? Feiglinge!“', 'info'); }

  // ======================= Cutscenes =======================
  function startCut(kind, o = {}) {
    if (C.phase === 'intro') return false; fn.unlock(); fn.closeUI(); D.cut = { kind, t: 0, pt: -1, ret: C.phase === 'cut' ? 'play' : C.phase, owns: [], ...o }; C.phase = 'cut'; D.hold = 0;
    hud.classList.add('ca-cutting'); $('caCut').classList.remove('hidden'); $('caCutTitle').classList.remove('on'); $('caCutLine').classList.remove('on'); $('caPrompt').classList.add('hidden'); $('caCutBar').style.transform = 'scaleX(0)'; return true;
  }
  function endCut(next) {
    const c = D.cut; if (!c) return; D.cut = null; hud.classList.remove('ca-cutting'); $('caCut').classList.add('hidden'); $('caCutTitle').classList.remove('on'); $('caCutLine').classList.remove('on'); D.hold = 0;
    const ph = next || c.ret;
    if (ph === 'table' && C.card) { C.phase = 'table'; C.camFrom = { p: C.cam.position.clone(), q: C.cam.quaternion.clone(), t: 0 }; }
    else if (ph === 'home') { C.phase = 'home'; fn.eyeCam(); }
    else { C.phase = 'play'; if (C.table >= 0) fn.standUp(); fn.eyeCam(); }
    fn.hudMode(); fn.hint('Klick ins Bild, damit die Maus wieder einrastet.');
  }
  const cue = (c, at) => c.pt < at && c.t >= at;
  function say(text, dur = 3.8) { const l = $('caCutLine'); l.textContent = text; l.classList.remove('on'); void l.offsetWidth; l.classList.add('on'); D.lineT = dur; }
  function title(k, h, s) { $('caCutK').textContent = k; $('caCutH').textContent = h; $('caCutS').textContent = s || ''; const t = $('caCutTitle'); t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); }
  function fade(v, dur = 0.6) { const f = $('caDayFade'); f.style.transition = `opacity ${dur}s ease`; f.style.opacity = String(v); }
  function camTo(p, look, fov) { const cam = C.cam; cam.position.copy(p); if (D.shake > 0) { cam.position.x += (Math.random() - 0.5) * D.shake * 0.14; cam.position.y += (Math.random() - 0.5) * D.shake * 0.1; } cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = fov; }
  function cutStep(c, dt) { if (c.kind === 'sec') secStep(c, dt); else if (c.kind === 'bruno') brunoStep(c, dt); else if (c.kind === 'bend') bendStep(c, dt); else if (c.kind === 'travel') travelStep(c, dt); else if (c.kind === 'sleep') sleepStep(c, dt); else if (c.kind === 'bus') busStep(c, dt); else if (c.kind === 'over') overStep(c, dt); }
  function hold(dt) { if (!D.cut || D.cut.kind === 'travel' || D.cut.kind === 'sleep' || D.cut.kind === 'bus' || D.cut.kind === 'overwait' || (D.cut.kind === 'over' && D.cut.wait)) return; D.hold += dt; $('caCutBar').style.transform = `scaleX(${clamp(D.hold / 0.9, 0, 1)})`; if (D.hold >= 0.9) skip(); }
  function release() { if (D.hold > 0) { D.hold = 0; $('caCutBar').style.transform = 'scaleX(0)'; } }
  function skip() {
    const c = D.cut; if (!c) return;
    if (c.kind === 'bruno') { const p = D.bruno; if (p) { p.st = null; p.setVisible(false); } D.doorWant = 0; D.doorFast = false; endCut(); banner('Großes Ereignis', c.big.name, c.big.text, 'bruno'); snd.music('lounge', 2); }
    else if (c.kind === 'sec') { if (!c.fee) { c.fee = true; payFee(); } finishSec(); }
    else if (c.kind === 'bend') endCut('play');
    else if (c.kind === 'over' && !c.wait) { c.t = 33; c.pt = 32.9; $('caFade').style.transition = 'none'; $('caFade').style.opacity = '1'; story('PLEITE', true); showOver(false); }
  }
  function key(code) {
    const c = D.cut; if (!c) return;
    if (c.kind === 'sleep' && c.wait && (code === 'KeyE' || code === 'Enter' || code === 'Space')) { cardGo(); return; }
    if (code === 'Escape') skip();
  }

  // ---------- Sperrstunde: die Security trägt hinaus ----------
  const stepY = (z) => (z < 12.1 ? 0 : z < 12.7 ? -0.153 : z < 13.3 ? -0.306 : -0.46);
  function free(x, z) { const W = C.W; for (const c of W.circles) if (Math.hypot(x - c.x, z - c.z) < c.r + 0.32) return false; for (const b of W.boxes) if (x > b.x0 - 0.32 && x < b.x1 + 0.32 && z > b.z0 - 0.32 && z < b.z1 + 0.32) return false; return true; }
  function securityOut() {
    if (D.cut || !inCasino()) return; if (C.phase === 'table') fn.standUp(); if (C.phase === 'slot' || C.phase === 'game' || C.phase === 'arc') fn.slotStand(); if (C.phase !== 'play') return;
    const m = C.me; const me = C.myFig(); const g1 = actor('g1', LOOK.guard1); const g2 = actor('g2', LOOK.guard2);
    let best = 0; let bestN = -1; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; let n = 0; for (let d = 0.7; d <= 3.7; d += 0.5) { if (free(m.x + Math.sin(a) * d, m.z + Math.cos(a) * d)) n++; else break; } if (n > bestN) { bestN = n; best = a; } }
    const ax = Math.sin(best); const az = Math.cos(best);
    if (!startCut('sec', { owns: [me, g1, g2], a: { x: m.x, z: m.z, ax, az, px: az, pz: -ax, yaw: best } })) return;
    me.setVisible(true); me.fig.setOwn(false); me.place(m.x, 0, m.z, best); me.mode = 'stand'; me.act = 0; me.lookAt = null; me.actT = undefined;
    for (const [g, s] of [[g1, 1], [g2, -1]]) { g.setVisible(true); g.place(m.x + ax * 3.3 + az * 0.45 * s, 0, m.z + az * 3.3 - ax * 0.45 * s, best + Math.PI); g.mode = 'stand'; g.act = 0; g.lookAt = null; g.grabAt = null; }
    snd.music(null, 1.5); snd.chime(); snd.amb(0.45);
  }
  function grabPose(me, g1, g2, on) {
    const rx = -Math.cos(me.yaw); const rz = Math.sin(me.yaw);
    for (const [g, s] of [[g1, 1], [g2, -1]]) { if (!on) { g.act = 0; g.grabAt = null; continue; } const side = Math.sign((g.x - me.x) * rx + (g.z - me.z) * rz) || s; g.act = 'grab'; g.grabAt = V3(me.x + rx * side * 0.25, me.y + 1.3, me.z + rz * side * 0.25); g.grabAt2 = V3(me.x + rx * side * 0.3, me.y + 1.08, me.z + rz * side * 0.3); g.lookAt = V3(me.x, me.y + 1.6, me.z); }
  }
  function secStep(c, dt) {
    const T = c.t; const a = c.a; const me = C.myFig(); const g1 = D.g1; const g2 = D.g2; const tm = C.t;
    if (T < 3.4) {
      const lift = smooth(2.5, 3.0, T) * 0.2; const s1 = { x: a.x + a.px * 0.52, z: a.z + a.pz * 0.52 }; const s2 = { x: a.x - a.px * 0.52, z: a.z - a.pz * 0.52 };
      if (T < 2.3) { walkTo(g1, s1.x, s1.z, dt, 1.6); walkTo(g2, s2.x, s2.z, dt, 1.6); me.lookAt = V3((g1.x + g2.x) / 2, 1.7, (g1.z + g2.z) / 2); me.act = T > 1.2 ? 'arms' : 0; grabPose(me, g1, g2, false); }
      else { for (const g of [g1, g2]) { g.mode = 'stand'; g.speed = 0; faceTo(g, a.x + a.ax * 2, a.z + a.az * 2, dt, 10); } me.act = 'carried'; me.lookAt = null; grabPose(me, g1, g2, true); }
      me.place(a.x, lift, a.z, a.yaw);
      camTo(V3(a.x - a.ax * 2.3 + a.px * 1.15, 1.85, a.z - a.az * 2.3 + a.pz * 1.15), V3(a.x + a.ax * 1.0, 1.3, a.z + a.az * 1.0), 52);
      if (cue(c, 0.2)) { title('00:00 Uhr', 'Sperrstunde', 'Teo\'s Casino schließt'); }
      if (cue(c, 1.2)) say('Security: „Sperrstunde. Alle raus, auch ihr.“');
      if (cue(c, 2.6)) say('Du: „Moment! Ich hab gerade eine Glückssträhne!“');
    } else if (T < 7.6) {
      if (cue(c, 3.4)) { $('caCutTitle').classList.remove('on'); D.doorWant = 1; D.doorFast = true; say('Security: „Nicht zappeln. Das machen wir jeden Abend.“'); }
      const z = Math.min(13.1, 5.0 + (T - 3.4) * 1.95); const y = stepY(z);
      for (const [g, x] of [[g1, 0.52], [g2, -0.52]]) { g.place(x, y, z, 0); g.mode = 'walk'; g.speed = 1.9; }
      me.place(0, y + 0.2, z, 0); me.mode = 'stand'; me.act = 'carried'; grabPose(me, g1, g2, true);
      camTo(V3(3.4, 0.95, 14.6), V3(0, 1.25 + y * 0.5, z), 44);
    } else {
      if (cue(c, 7.6)) { say('Security: „Morgen ab 10 Uhr wieder. Fürs Tragen berechnet Teo 5 €.“', 4.2); if (!c.fee) { c.fee = true; payFee(); } }
      const u = smooth(7.6, 8.25, T); const z = 13.1 + u * 1.25; const hop = Math.sin(u * Math.PI) * 0.32;
      me.place(0, lerp(stepY(13.1) + 0.2, -0.46, u) + hop, z, 0); me.mode = 'stand'; me.act = T < 8.25 ? 'carried' : 'arms'; if (T > 8.4) me.lookAt = V3(0, 1.6, 9);
      for (const [g, x] of [[g1, 0.52], [g2, -0.52]]) { if (T < 8.35) { g.place(x, stepY(13.1), 13.1, 0); g.mode = 'stand'; g.act = 'grab'; } else { g.act = 0; g.grabAt = null; g.lookAt = null; if (g.visible && walkTo(g, x * 1.3, 8.9, dt, 1.3, (px, pz) => stepY(pz))) g.setVisible(false); } }
      if (T < 8.35) grabPose(me, g1, g2, true);
      if (cue(c, 9.5)) { D.doorWant = 0; say('Du: „Teo\'s Casino. Weil er reich ist. Pff.“', 3); }
      camTo(V3(-2.5, 0.2, 16.6), V3(0, 0.15, 13.6), 46);
      if (cue(c, 10.7)) fade(1, 0.6);
      if (T > 11.4) { finishSec(); return; }
    }
    for (const p of [me, g1, g2]) if (p.visible) p.update(dt, tm);
  }
  function finishSec() { for (const g of [D.g1, D.g2]) if (g) { g.setVisible(false); g.act = 0; g.grabAt = null; } const me = C.myFig(); if (me) { me.setVisible(false); me.act = 0; me.y = 0; } D.doorWant = 0; D.doorFast = false; D.cut = null; travel('home', '00:20 Uhr · Zu Hause. Teos Security hat euch vor die Tür gesetzt.', true); }
  function payFee() { if (host()) hostOut(fn.myName()); else C.net.send({ t: 'caout' }); }
  function hostOut(name) { const S = C.S; const f = Math.min(500, S.purse); S.purse -= f; const b = S.bruno; if (b && b.day === S.day && b.st === 'duel' && b.who === name) { S.purse += b.stake; b.st = 'abgebrochen'; b.done = true; } fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'out', name }); }

  // ---------- Big Bruno kommt ----------
  function brunoArrive(big) {
    if (!inCasino() || C.phase === 'intro' || C.phase === 'home') { toast(`${big.name} ist im Casino! Rubbel-Duell an Tisch ${big.table + 1}.`, 'gold'); return; }
    if (D.cut) { banner('Großes Ereignis', big.name, big.text, 'bruno'); return; }
    const p = brunoFig(); if (!startCut('bruno', { big, owns: [p] })) return;
    p.setVisible(true); p.place(0, 0, 11.6, Math.PI); p.mode = 'stand'; p.act = 0; p.lookAt = null; p.sad = 0; p.st = 'cut'; p.wp = 0;
    p.route = [[0, 7.4], [0, 0.4], [3.7, -6.4], [4.5, -12.8], [C.W.tables[big.table].x - 0.82, C.W.tables[big.table].z + 1.2], [C.W.tables[big.table].x - 0.82, C.W.tables[big.table].z]];
    D.doorWant = 0; D.doorK = 0; C.W.setDoors(0); snd.music(null, 0.8); snd.stinger(); snd.amb(0.6);
  }
  function brunoStep(c, dt) {
    const T = c.t; const p = D.bruno; const big = c.big; const tb = C.W.tables[big.table]; const seat = V3(tb.x - 0.82, 0, tb.z);
    if (cue(c, 0.55) || cue(c, 0.95)) snd.doorThunk();
    if (cue(c, 1.35)) { D.doorWant = 1; D.doorFast = true; D.shake = 0.7; snd.boom(); setTimeout(() => snd.gasp(), 160); snd.music('duel', 0.3); }
    if (T > 1.35 && p.st === 'cut') { const pt = p.route[p.wp]; if (pt) { if (walkTo(p, pt[0], pt[1], dt, 5.4)) p.wp++; } else { p.st = 'seated'; c.sitT = T; } }
    if (p.st === 'seated') { p.place(seat.x, 0, seat.z, Math.PI / 2); p.mode = 'sit'; p.seat = 0.5; const u = T - c.sitT; p.act = u < 1.5 ? 'slam' : 0; if (p.act && p.actT === undefined) p.actT = 0; if (u > 0.15 && !c.th1) { c.th1 = true; snd.doorThunk(); } if (u > 0.5 && !c.th2) { c.th2 = true; snd.doorThunk(); } if (u > 0.85 && !c.th3) { c.th3 = true; snd.doorThunk(); D.shake = 0.25; } p.lookAt = u > 1.6 ? C.cam.position.clone() : null; }
    if (T < 3.3) { const door = V3(0, 1.8, 8.55); const head = V3(p.x, 1.6, p.z); if (T < 0.05) D.camLook.copy(door); D.camLook.lerp(T > 1.4 ? head : door, Math.min(1, dt * 5)); camTo(V3(2.5, 1.5, 3.1), D.camLook, 50); }
    else if (T < 6.2) { const head = V3(p.x, 1.5, p.z); if (cue(c, 3.3)) D.camLook.copy(head); D.camLook.lerp(head, Math.min(1, dt * 4)); camTo(V3(-3.0, 1.7, -5.6), D.camLook, 48); }
    else { const look = V3(seat.x + 0.1, 1.05, seat.z); if (cue(c, 6.2)) D.camLook.copy(V3(p.x, 1.2, p.z)); D.camLook.lerp(p.st === 'seated' ? look : V3(p.x, 1.3, p.z), Math.min(1, dt * 3)); camTo(V3(tb.x + 1.75, 1.42, tb.z + 0.95), D.camLook, 46); }
    if (cue(c, 7.1)) { title('Großes Ereignis', big.name.toUpperCase(), `Rubbel-Duell an Tisch ${big.table + 1} · Einsatz ${euro(big.stake, true)} · Sieger bekommt ${euro(big.pot, true)} · bis ${clockText(big.until)} Uhr`); snd.brass(true); }
    if (cue(c, 8.0)) say('Bruno: „Wer traut sich? Ich rubbel euch alle unter den Tisch!“', 3.2);
    p.update(dt, C.t);
    if (T > 11.2) { p.st = 'sit'; D.doorWant = 0; endCut(); snd.music('lounge', 2.5); snd.amb(0.95); }
  }
  // ---------- Big Bruno geht nach dem Duell (nur der Herausforderer sieht es als Szene) ----------
  function brunoEnd(res) { if (D.cut || !inCasino()) return; if (C.phase === 'table') fn.standUp(); if (!startCut('bend', { res })) return; D.duelShow = false; $('caDuel').classList.add('hidden'); }
  function bendStep(c, dt) {
    const T = c.t; const p = D.bruno; if (!p || !p.visible) { if (T > 0.5) endCut('play'); return; }
    const tb = C.W.tables[2]; const head = V3(p.x, 1.3, p.z); if (T < 0.05) D.camLook.copy(head); D.camLook.lerp(head, Math.min(1, dt * 3)); camTo(V3(tb.x + 1.6, 1.5, tb.z + 1.4), D.camLook, 46);
    if (cue(c, 0.3)) say(c.res === 'won' ? 'Bruno: „Das war reines Glück! Ich komme wieder, merk dir das!“' : c.res === 'lost' ? 'Bruno: „Haha! Danke für die zehn Euro, Kleiner!“' : 'Bruno: „Unentschieden? Langweilig. Nimm deinen Einsatz.“', 4.2);
    if (T > 6.2) endCut('play');
  }
  // ---------- Fahrt nach Hause oder zurück ins Casino ----------
  function travel(to, text, black) { if (!startCut('travel', { to, text })) return; if (black) { const f = $('caDayFade'); f.style.transition = 'none'; f.style.opacity = '1'; D.cut.t = 0.6; D.cut.pt = 0.6; D.cut.go = true; } else fade(1, 0.6); }
  function travelStep(c) {
    const T = c.t;
    if (!c.done0 && (c.t >= 0.62 || c.go)) { c.done0 = true; if (c.to === 'home') setupHome(); else setupCasino(false); say(c.text, 2.6); }
    if (T >= 0.62) fn.eyeCam();
    if (cue(c, 1.9)) fade(0, 0.8);
    if (T > 2.6) { endCut(c.to === 'home' ? 'home' : 'play'); if (c.to !== 'home') dayBanner(); }
  }
  // ---------- Schlafen: Kamera ins Bett, Tageskarte, neuer Tag ----------
  function sleepSeq(rep) { fn.closeUI(); if (!startCut('sleep', { rep, from: { p: C.cam.position.clone(), q: C.cam.quaternion.clone() } })) return; fade(1, 1.6); snd.music(null, 2); snd.home(0.4); snd.rain(0.25); }
  function sleepStep(c) {
    const T = c.t; const H = D.home;
    if (H && D.where === 'home') { const bed = H.spots.bed; const k = smooth(0, 1.6, T); const p = c.from.p.clone().lerp(V3(bed.x + 0.2, 0.72, bed.z - 0.05), k); C.cam.position.copy(p); const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p, V3(bed.x + 0.9, 2.4, bed.z - 0.8), V3(0, 1, 0))); C.cam.quaternion.copy(c.from.q).slerp(q, k); C.cam.fov = 60; }
    if (cue(c, 1.8)) { showDayCard(c.rep); c.wait = true; }
    if (c.go) { if (c.goT === undefined) { c.goT = T; $('caDayCard').classList.add('hidden'); setupCasino(true); fn.eyeCam(); fade(0, 1.0); } else fn.eyeCam(); if (T - c.goT > 1.0) { endCut('play'); dayBanner(); } }
  }
  function cardGo() { const c = D.cut; if (!c || c.kind !== 'sleep' || !c.wait || c.go) return; c.go = true; snd.click(); }
  function showDayCard(rep) {
    const S = C.S; const di = dayInfo(S.day); const big = bigEventFor(S.day);
    $('caDcK').textContent = rep ? 'Wochenabrechnung · ein neuer Tag' : 'Ein neuer Tag'; $('caDcH').textContent = `Woche ${di.week} · ${di.name}`; $('caDcS').textContent = `Tag ${S.day} · 10:00 Uhr · Teo's Casino öffnet. Die Glückssträhne startet morgens bei ×1 und wird den ganzen Abend über immer besser, kurz vor Mitternacht glüht sie.`;
    const ev = $('caDcEv'); ev.textContent = '';
    if (big) { const d = el('div', 'ca-dc-big'); d.append(el('small', '', 'Großes Ereignis · ab ' + clockText(big.at) + ' Uhr'), el('b', '', big.name), el('span', '', big.text)); ev.append(d); }
    for (const e of today().slice().sort((a, b) => a.from - b.from)) { const d = el('div', 'ca-dc-e'); d.append(el('b', '', e.name), el('small', '', `${clockText(e.from)} bis ${e.to >= CLOSE ? 'Mitternacht' : clockText(e.to)}`), el('span', '', e.text)); ev.append(d); }
    const rp = $('caDcRep'); rp.textContent = ''; rp.classList.toggle('hidden', !rep);
    if (rep) {
      rp.append(el('h3', '', `Abrechnung Woche ${rep.week}`)); const tbl = el('div', 'ca-rep-t');
      for (const L of rep.lines) { const r = el('div', L.paid < L.want ? 'miss' : 'ok'); r.append(el('span', '', (CONTRACT[L.id] || { name: 'Sofortkredit Teo Bank' }).name), el('b', '', `${euro(L.paid)} von ${euro(L.want)}`)); tbl.append(r); } rp.append(tbl);
      rp.append(el('p', rep.missing > 0 ? 'ca-rep-bad' : 'ca-rep-good', rep.missing > 0 ? `Es fehlten ${euro(rep.missing)}. Mahnung mit 15 % Aufschlag: ${euro(rep.fee)} kommen bei Inkasso Schmidt dazu. Mahnungen: ${rep.strikes} von 3.` : `Alle Raten bezahlt: ${euro(rep.paid)}. Keine Mahnung.`));
      if (rep.seized) rp.append(el('p', 'ca-rep-bad', `Der Gerichtsvollzieher war da und hat „${HOME[rep.seized].name}“ gepfändet. Die Mahnungen beginnen wieder bei null.`));
      if (rep.free) rp.append(el('p', 'ca-rep-good', 'Alle Schulden sind abbezahlt! Die Familie ist schuldenfrei.'));
      if (rep.missing > 0) snd.lose(); else snd.sparkle();
    } else snd.chime();
    $('caDayCard').classList.remove('hidden');
  }
  $('caDcGo').onclick = () => cardGo();

  // ======================= Orte wechseln =======================
  function notifyHome(on) { if (C.net && !host()) C.net.send({ t: 'cahome', on }); }
  function setupHome() {
    C.intro.build(); const I = C.intro.I; const H = I.home; D.home = H; D.where = 'home'; if (host()) C.S.where = 'home';
    H.setOwned(C.S.owned); D.ownedKey = (C.S.owned || []).join(',');
    I.fam.home.forEach((p, i) => { p.setVisible(i !== C.seat); p.place(-0.68 + i * 0.68, 0, -1.95, 0); p.mode = 'sit'; p.seat = 0.5; p.sad = 0.1; p.hope = 0.6; p.lookAt = null; p.act = 0; });
    const sp = H.spots.spawn; const m = C.me; m.x = sp.x; m.z = sp.z; m.yaw = sp.yaw; m.pitch = -0.05; m.vx = 0; m.vz = 0;
    hud.classList.add('ca-home'); for (const g of [D.g1, D.g2]) if (g) g.setVisible(false); const me = C.myFig(); if (me) me.setVisible(false);
    snd.amb(0); snd.music('home', 1.5); snd.home(1); snd.rain(0.45); notifyHome(true);
    fn.hint('Klick ins Bild, damit die Maus einrastet · E benutzen · PC: Upgrades, Deko, Verträge · Bett: nächster Tag');
  }
  function setupCasino(newDay) {
    D.where = 'casino'; if (host()) C.S.where = 'casino'; hud.classList.remove('ca-home'); const O = C.W.outside; if (O) fn.spawnAt(O.bus.x, O.bus.z + 0.5, 0); else fn.spawn(); D.last = null; D.doorWant = 0;
    snd.home(0); snd.rain(0); snd.music('lounge', 2); snd.amb(0.95); C.W.setSign(1, 1); notifyHome(false); if (newDay) { D.shown = 0; D.result = null; D.duelShow = false; }
  }
  function resume() {
    const S = C.S; D.last = null; D.power = 1; D.cut = null;
    if (S.where === 'home' && !C.net) { setupHome(); C.phase = 'home'; fn.hudMode(); return 'home'; }
    D.where = 'casino'; if (host()) S.where = 'casino'; hud.classList.remove('ca-home'); setTimeout(() => { if (C.phase === 'play') dayBanner(); }, 1200); return 'casino';
  }
  function afterIntro() { D.where = 'casino'; D.last = null; setTimeout(() => { if (C.phase === 'play') dayBanner(); }, 1600); }

  // ======================= Wohnung =======================
  function homeCollide(x, z) {
    const cl = D.home.colliders; const R = 0.26;
    for (let it = 0; it < 2; it++) {
      for (const c of cl.circles) { const dx = x - c.x; const dz = z - c.z; const d = Math.hypot(dx, dz); const m = c.r + R; if (d < m && d > 1e-6) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
      for (const b of cl.boxes) { const cx = clamp(x, b.x0, b.x1); const cz = clamp(z, b.z0, b.z1); const dx = x - cx; const dz = z - cz; const d = Math.hypot(dx, dz); if (d < R) { if (d > 1e-6) { x = cx + dx / d * R; z = cz + dz / d * R; } else { const pen = [x - b.x0, b.x1 - x, z - b.z0, b.z1 - z]; const k = pen.indexOf(Math.min(...pen)); if (k === 0) x = b.x0 - R; else if (k === 1) x = b.x1 + R; else if (k === 2) z = b.z0 - R; else z = b.z1 + R; } } }
    }
    const B = cl.bounds; return [clamp(x, B.x0, B.x1), clamp(z, B.z0, B.z1)];
  }
  function homeTarget() {
    const H = D.home; const m = C.me; const fwd = V3(-Math.sin(m.yaw) * Math.cos(m.pitch), Math.sin(m.pitch), -Math.cos(m.yaw) * Math.cos(m.pitch)); const eye = V3(m.x, EYE, m.z); const out = [];
    const look = (p) => { const d = p.clone().sub(eye); const L = d.length(); return { dot: d.dot(fwd) / L, flat: Math.hypot(p.x - m.x, p.z - m.z) }; }; const sp = H.spots; const S = C.S;
    { const q = look(sp.pc); if (q.flat < 1.7 && q.dot > 0.55) out.push({ k: 'pc', text: 'Familien-PC: Upgrades, Deko, Verträge, Kalender', d: q.flat }); }
    { const q = look(sp.bed); if (q.flat < 1.8 && q.dot > 0.4) out.push({ k: 'bed', text: 'Schlafen gehen (nächster Tag)', d: q.flat }); }
    { const q = look(sp.door); if (q.flat < 1.6 && q.dot > 0.45) out.push({ k: 'door', text: S.clock < WARN ? 'Zurück ins Casino' : 'Das Casino schließt gleich', d: q.flat }); }
    { const q = look(H.P.calendar); if (q.flat < 1.7 && q.dot > 0.8) out.push({ k: 'cal', text: 'Kalender ansehen', d: q.flat - 0.1 }); }
    { const q = look(sp.sofa); if (q.flat < 1.9 && q.dot > 0.55) out.push({ k: 'fam', text: 'Mit der Familie reden', d: q.flat + 0.3 }); }
    out.sort((a, b) => a.d - b.d); return out[0] || null;
  }
  function homeInteract() {
    const t = C.target; if (!t) return; snd.click();
    if (t.k === 'pc') openPC(); else if (t.k === 'cal') openPC('kalender'); else if (t.k === 'bed') trySleep(); else if (t.k === 'fam') { D.famI = (D.famI + 1) % FAM_LINES.length; toast(FAM_LINES[D.famI]); }
    else if (t.k === 'door') { if (C.S.clock >= WARN) { toast('Zu spät: Um Mitternacht schließt Teo\'s Casino. Morgen ab 10 Uhr geht es weiter.'); return; } travel('casino', 'Mit dem Nachtbus zurück ins Casino …'); }
  }
  const remoteAt = (seat) => { for (const [, r] of C.remotes) if (fn.seatOf(r.id) === seat) return r; return null; };
  function homeFrame(dt, t) {
    const H = D.home; if (!H) return null; const m = C.me; const S = C.S;
    if (C.phase === 'home') { if (!C.ui && !fn.tourOpen()) fn.walk(dt, { coll: homeCollide, speed: 0.62, marble: false }); fn.eyeCam(); C.target = C.ui || fn.tourOpen() ? null : homeTarget(); const pr = $('caPrompt'); if (C.target) { $('caPromptT').textContent = C.target.text; pr.classList.remove('hidden'); } else pr.classList.add('hidden'); }
    const key = (S.owned || []).join(','); if (key !== D.ownedKey) { D.ownedKey = key; H.setOwned(S.owned); }
    const tv = (S.owned || []).includes('tv');
    C.intro.I.fam.home.forEach((p, i) => {
      if (i === C.seat) { p.setVisible(false); return; } const r = C.net ? remoteAt(i) : null;
      if (r && r.home && r.last) { p.setVisible(true); const k = 1 - Math.exp(-dt * 10); const ox = p.x; const oz = p.z; p.x = lerp(p.x, r.last.x, k); p.z = lerp(p.z, r.last.z, k); p.y = 0; let d = (r.last.yaw + Math.PI) - p.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; p.yaw += d * k; const sp = Math.hypot(p.x - ox, p.z - oz) / Math.max(dt, 1e-3); p.mode = sp > 0.2 ? 'walk' : 'stand'; p.speed = sp; p.sad = 0; p.hope = 0; }
      else if (r && !r.home) { p.setVisible(false); return; }
      else { p.setVisible(true); p.place(-0.68 + i * 0.68, 0, -1.95, 0); p.mode = 'sit'; p.seat = 0.5; const near = Math.hypot(m.x - p.x, m.z - p.z) < 2.6; p.lookAt = near ? V3(m.x, EYE, m.z) : tv ? V3(0.75, 1.32, 2.45) : null; }
      p.update(dt, t + i);
    });
    { const r = C.net && C.seat !== 3 ? remoteAt(3) : null; let f = D.home4; // vierter Spieler (Grün, nur Stände für vier) zu Hause: eigene Figur, die Familie auf dem Sofa bleibt wie sie ist
      if (r && r.home && r.last) { if (!f) { f = D.home4 = createPerson(H.scene, PLAYER_LOOKS[3]); f.place(r.last.x, 0, r.last.z, 0); } f.setVisible(true); const k = 1 - Math.exp(-dt * 10); const ox = f.x; const oz = f.z; f.x = lerp(f.x, r.last.x, k); f.z = lerp(f.z, r.last.z, k); f.y = 0; let d = (r.last.yaw + Math.PI) - f.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; f.yaw += d * k; const sp = Math.hypot(f.x - ox, f.z - oz) / Math.max(dt, 1e-3); f.mode = sp > 0.2 ? 'walk' : 'stand'; f.speed = sp; f.update(dt, t + 3); }
      else if (f) f.setVisible(false); }
    H.update(t, dt, { bulb: (S.owned || []).includes('lampe') ? 0.5 : 1 });
    return { scene: H.scene, sky: H.sky, sun: H.sun, sunDir: H.sunDir, mood: H.mood };
  }
  function frame(dt, t) { if (D.where === 'home' && D.home) return homeFrame(dt, t); return { world: true }; }

  // ---------- Schlafen und neuer Tag ----------
  function trySleep() { if (!host()) { C.net.send({ t: 'casleep' }); toast('Gute Nacht … sobald alle zu Hause sind, beginnt der nächste Tag.'); return; } hostSleep(fn.myName(), null); }
  function hostSleep(name, fromId) {
    if (C.net) { const away = C.net.players.filter((p) => p.id !== fn.myId() && !D.atHome.get(p.id)).map((p) => p.name); if (D.where !== 'home') away.unshift(fn.myName()); if (away.length) { const msg = `Erst schlafen, wenn alle zu Hause sind: ${away.join(', ')} ${away.length > 1 ? 'sind' : 'ist'} noch im Casino.`; if (!fromId) toast(msg); else C.net.sendTo(fromId, { t: 'caev', k: 'no', to: name, why: msg }); return; } }
    const S = C.S; const rep = nextDay(S); S.done2 = (S.done2 || []).filter((x) => !/^(gr|w|teo)\d+$/.test(x)); S.where = 'casino'; fn.changed(); if (C.net) C.net.broadcast({ t: 'caday', rep }); sleepSeq(rep);
  }

  // ======================= Familien-PC (TeoOS) =======================
  function openPC(tab) { fn.unlock(); C.ui = 'pc'; if (tab) D.pcTab = tab; $('caPC').classList.remove('hidden'); snd.keyboard(); renderPC(); }
  for (const b of $('caPCNav').children) b.onclick = () => { D.pcTab = b.dataset.tab; snd.keyboard(); renderPC(); };
  $('caPCClose').onclick = () => fn.closeUI();
  function renderPC() {
    if (C.ui !== 'pc') return; const S = C.S; $('caPCClock').textContent = clockText(S.clock); $('caPCPurse').textContent = euro(S.purse);
    for (const b of $('caPCNav').children) b.classList.toggle('sel', b.dataset.tab === D.pcTab);
    const body = $('caPCBody'); body.textContent = ''; const tab = D.pcTab;
    if (tab === 'glueck' || tab === 'deko') {
      if (tab === 'glueck') { const hd = el('div', 'ca-pc-luck'); const cv = document.createElement('canvas'); cv.width = 900; cv.height = 230; drawLuck(cv); const tx = el('div', 'ca-pc-luckt'); const l = luckFor(S, 'lose'); tx.append(el('b', '', `Glückssträhne jetzt: ${luckWord(l)} · ×${num(l)}`), el('p', '', 'Startet morgens bei ×1, mit jeder Stunde besser, kurz vor Mitternacht am besten. Upgrades heben die ganze Kurve an. Ein Los bekommt das Glück von dem Moment, in dem ihr es kauft.')); hd.append(cv, tx); body.append(hd); }
      else body.append(el('p', 'ca-pc-lead', 'Die Wohnung soll wieder schön werden. Alles, was ihr kauft, steht sofort im Zimmer.'));
      const grid = el('div', 'ca-pc-grid');
      for (const it of HOME_ITEMS.filter((x) => (tab === 'glueck' ? x.kind === 'glueck' : x.kind === 'deko'))) {
        const own = (S.owned || []).includes(it.id); const lock = S.level < (it.lv || 1); const card = el('div', 'ca-pc-item' + (own ? ' own' : '') + (lock ? ' lock' : ''));
        const ic = document.createElement('canvas'); ic.width = ic.height = 160; drawIcon(ic, it.id); const btn = el('button', own ? '' : 'primary', own ? 'Gekauft ✓' : lock ? `Ab Level ${it.lv}` : `Kaufen · ${euro(it.price, true)}`); btn.type = 'button'; btn.disabled = own || lock || S.purse < it.price; btn.onclick = () => buyItem(it.id);
        card.append(ic, el('b', '', it.name), el('p', '', it.text), btn); grid.append(card);
      }
      body.append(grid);
    }
    if (tab === 'vertraege') {
      const di = dayInfo(S.day); const left = 7 - di.wd; const due = weeklyDue(S); const head = el('div', 'ca-pc-sum');
      for (const [a, b, cls] of [['Nächste Abbuchung', left === 0 ? 'heute Nacht' : `in ${left} ${left === 1 ? 'Tag' : 'Tagen'} (Sonntagnacht)`], ['Wochenrate fällig', euro(due), S.purse < due ? 'bad' : 'ok'], ['Familienkasse', euro(S.purse)], ['Schulden gesamt', euro(debtTotal(S))], ['Mahnungen', `${S.strikes || 0} von 3`, (S.strikes || 0) > 0 ? 'bad' : '']]) { const d = el('div', cls || ''); d.append(el('span', '', a), el('b', '', b)); head.append(d); }
      body.append(head);
      body.append(el('p', 'ca-pc-lead', S.purse < due ? 'Achtung: Die Kasse reicht noch nicht für die Wochenrate. Fehlt Sonntagnacht Geld, gibt es eine Mahnung mit 15 % Aufschlag. Nach drei Mahnungen pfändet der Gerichtsvollzieher das wertvollste Stück der Wohnung.' : 'Die Raten steigen mit jedem Level. Wer früher tilgt, hat später weniger Rate zu zahlen.'));
      const list = el('div', 'ca-pc-debts');
      for (const c of S.debts) { const k = CONTRACT[c.id]; const row = el('div', 'ca-pc-debt' + (c.rest <= 0 ? ' paid' : '')); const info = el('div', ''); info.append(el('b', '', k.name), el('small', '', c.rest <= 0 ? 'abbezahlt' : `Rest ${euro(c.rest)} · Rate diese Woche ${euro(rateOf(S, c))}`)); const bar = el('div', 'ca-pc-bar'); const i = el('i'); i.style.transform = `scaleX(${clamp(1 - c.rest / k.rest, 0, 1)})`; bar.append(i); info.append(bar);
        const btns = el('div', 'ca-pc-btns'); if (c.rest > 0) { const add = (t, a) => { const b = el('button', '', t); b.type = 'button'; b.disabled = S.purse < Math.min(a, c.rest) || a <= 0; b.onclick = () => pay(c.id, a); btns.append(b); }; add(`Rate zahlen · ${euro(rateOf(S, c), true)}`, rateOf(S, c)); add('10 € tilgen', 1000); add(`Alles · ${euro(c.rest, true)}`, c.rest); }
        row.append(info, btns); list.append(row); }
      if (loanRest(S) > 0) { const L = S.loan; const row = el('div', 'ca-pc-debt loan'); const info = el('div', ''); info.append(el('b', '', `Sofortkredit Teo Bank (${euro(L.amount, true)})`), el('small', '', `Rest ${euro(L.rest)} · Rate diese Woche ${euro(Math.min(L.rest, L.rate))}`)); const bar = el('div', 'ca-pc-bar'); const i2 = el('i'); i2.style.transform = `scaleX(${clamp(1 - L.rest / L.debt, 0, 1)})`; bar.append(i2); info.append(bar); const btns = el('div', 'ca-pc-btns'); for (const [t2, a] of [[`Rate zahlen · ${euro(Math.min(L.rest, L.rate), true)}`, Math.min(L.rest, L.rate)], ['10 € tilgen', 1000], [`Alles · ${euro(L.rest, true)}`, L.rest]]) { const b = el('button', '', t2); b.type = 'button'; b.disabled = S.purse < Math.min(a, L.rest); b.onclick = () => loanPay(a); btns.append(b); } row.append(info, btns); list.append(row); }
      body.append(list);
    }
    if (tab === 'kalender') {
      const di = dayInfo(S.day);
      for (const wk of [di.week, di.week + 1]) {
        body.append(el('h3', 'ca-pc-wk', `Woche ${wk}${wk === di.week ? ' (diese Woche)' : ''}`)); const grid = el('div', 'ca-pc-cal');
        for (let i = 0; i < 7; i++) { const day = (wk - 1) * 7 + i + 1; const cell = el('div', 'ca-pc-day' + (day === S.day ? ' today' : day < S.day ? ' past' : '')); cell.append(el('small', '', `${WEEKDAYS[i]} · Tag ${day}`)); const big = bigEventFor(day); if (big) cell.append(el('b', 'bigev', `${clockText(big.at)} ${big.name}`));
          for (const id of eventsFor(day)) { const e = EVENT[id]; cell.append(el('span', '', `${clockText(e.from)} ${e.name}`)); } if (i === 6) cell.append(el('em', '', `Abbuchung ${euro(weeklyDue(S), true)}`)); grid.append(cell); }
        body.append(grid);
      }
    }
  }
  function buyItem(id) { if (host()) hostBuyItem(fn.myName(), null, id); else C.net.send({ t: 'cahbuy', id }); }
  function hostBuyItem(name, fromId, id) { const r = buyHome(C.S, id); if (!r.ok) { if (!fromId) { toast(r.why); snd.lose(); } else C.net.sendTo(fromId, { t: 'caev', k: 'no', to: name, why: r.why }); return; } fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'hbuy', name, id }); homeBought(name, id); }
  function homeBought(name, id) { const it = HOME[id]; if (name === fn.myName()) { snd.buy(); setTimeout(() => snd.sparkle(), 250); toast(`Gekauft: ${it.name}. ${it.kind === 'glueck' ? 'Die Glückssträhne steigt!' : 'Steht schon im Zimmer.'}`, 'gold'); } else toast(`${name} hat für die Wohnung gekauft: ${it.name}`, 'gold'); if (D.home) { D.home.setOwned(C.S.owned); D.ownedKey = (C.S.owned || []).join(','); } renderPC(); }
  function pay(id, a) { if (host()) hostPay(fn.myName(), id, a); else C.net.send({ t: 'capay', id, a }); }
  function hostPay(name, id, a) { const v = payDebt(C.S, id, a); if (v > 0) { fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'pay', name, id, v }); paid(name, id, v); } }
  function paid(name, id, v) { if (name === fn.myName()) { snd.coin(); toast(`${euro(v)} an ${CONTRACT[id].name} überwiesen.`, 'gold'); } else toast(`${name} hat ${euro(v)} an ${CONTRACT[id].name} überwiesen.`); renderPC(); }

  // Glückskurve des Tages (grau ohne Upgrades, Gold mit allem, Ereignisfenster farbig)
  function drawLuck(cv) {
    const S = C.S; const c = cv.getContext('2d'); const W = cv.width; const H = cv.height; c.clearRect(0, 0, W, H); const base = { ...S, owned: [] };
    const pts = []; for (let m = OPEN; m <= CLOSE; m += 5) pts.push([m, luckFor(S, 'lose', m), luckFor(base, 'lose', m)]);
    const hi = Math.max(1.7, ...pts.map((p) => p[1])) + 0.1; const lo = 0.85; const x0 = 70; const x1 = W - 18; const y0 = 26; const y1 = H - 34; const X = (m) => x0 + (m - OPEN) / (CLOSE - OPEN) * (x1 - x0); const Y = (l) => y1 - (l - lo) / (hi - lo) * (y1 - y0);
    c.font = '600 14px Bahnschrift, sans-serif';
    for (const e of today()) { if (!e.luck && !e.double && !e.discount) continue; const a = X(e.from); const b = X(Math.min(CLOSE, e.to)); c.fillStyle = e.double ? 'rgba(255,90,200,.16)' : e.discount ? 'rgba(80,200,255,.14)' : 'rgba(255,210,90,.16)'; c.fillRect(a, y0, b - a, y1 - y0); c.fillStyle = '#e8d8b8'; c.textAlign = 'center'; c.fillText(e.name, (a + b) / 2, y0 - 8); }
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 1; c.fillStyle = '#b8a890'; c.textAlign = 'center'; for (let h = 10; h <= 24; h += 2) { const x = X(h * 60); c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); c.fillText(String(h % 24).padStart(2, '0') + ':00', x, H - 10); }
    c.textAlign = 'right'; for (const [l, w] of [[1.0, 'normal'], [1.3, 'heiß'], [1.6, 'glühend']]) { if (l > hi) continue; c.fillText(w, x0 - 10, Y(l) + 5); c.beginPath(); c.moveTo(x0, Y(l)); c.lineTo(x1, Y(l)); c.stroke(); }
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.3)'; c.setLineDash([6, 5]); c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(X(p[0]), Y(p[2])) : c.moveTo(X(p[0]), Y(p[2])))); c.stroke(); c.setLineDash([]);
    const gr = c.createLinearGradient(x0, 0, x1, 0); gr.addColorStop(0, '#d0453a'); gr.addColorStop(0.45, '#f2c14e'); gr.addColorStop(1, '#7affb8'); c.strokeStyle = gr; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])))); c.stroke();
    const nx = X(clamp(S.clock, OPEN, CLOSE)); const nl = luckFor(S, 'lose'); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 1.5; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(nx, y0); c.lineTo(nx, y1); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(nx, Y(nl), 7, 0, 7); c.fill(); const right = nx > W - 170; c.textAlign = right ? 'right' : 'left'; c.font = '700 16px Bahnschrift, sans-serif'; c.fillText(`jetzt ×${num(nl)}`, nx + (right ? -12 : 12), Y(nl) - 12);
  }
  // Symbole für die Einkaufsliste
  function drawIcon(cv, id) {
    const c = cv.getContext('2d'); const W = cv.width; const g = c.createRadialGradient(W / 2, W * 0.38, 6, W / 2, W / 2, W * 0.72); g.addColorStop(0, '#4a2c16'); g.addColorStop(1, '#140a06'); c.fillStyle = g; c.fillRect(0, 0, W, W); c.strokeStyle = 'rgba(242,193,78,.5)'; c.lineWidth = 3; c.strokeRect(5, 5, W - 10, W - 10);
    c.save(); c.translate(W / 2, W / 2); const r = W * 0.36; c.lineCap = 'round'; c.lineJoin = 'round'; const f = ICONS[id]; if (f) f(c, r); c.restore();
  }
  const GOLD = '#f2c14e';
  const rr = (c, x, y, w, h, q) => { c.beginPath(); c.moveTo(x + q, y); c.arcTo(x + w, y, x + w, y + h, q); c.arcTo(x + w, y + h, x, y + h, q); c.arcTo(x, y + h, x, y, q); c.arcTo(x, y, x + w, y, q); c.closePath(); };
  const ICONS = {
    hufeisen: (c, r) => { c.strokeStyle = GOLD; c.lineWidth = r * 0.3; c.beginPath(); c.arc(0, -r * 0.1, r * 0.6, Math.PI + 0.45, -0.45, true); c.stroke(); c.fillStyle = '#3a2410'; for (let i = 0; i < 6; i++) { const a = Math.PI + 0.3 - i * (Math.PI + 0.6) / 5; c.beginPath(); c.arc(Math.cos(a) * r * 0.6, -r * 0.1 + Math.sin(a) * r * 0.6, r * 0.05, 0, 7); c.fill(); } },
    kaffee: (c, r) => { c.fillStyle = '#1e1e24'; rr(c, -r * 0.55, -r * 0.8, r * 1.1, r * 1.5, r * 0.12); c.fill(); c.fillStyle = GOLD; c.fillRect(-r * 0.45, -r * 0.7, r * 0.9, r * 0.12); c.fillStyle = '#f0ece0'; rr(c, -r * 0.28, r * 0.15, r * 0.56, r * 0.5, r * 0.08); c.fill(); c.strokeStyle = '#f0ece0'; c.lineWidth = r * 0.08; c.beginPath(); c.arc(r * 0.32, r * 0.4, r * 0.12, -1.2, 1.2); c.stroke(); c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = r * 0.05; for (const x of [-0.1, 0.1]) { c.beginPath(); c.moveTo(x * r, r * 0.05); c.bezierCurveTo(x * r - r * 0.12, -r * 0.1, x * r + r * 0.12, -r * 0.2, x * r, -r * 0.35); c.stroke(); } c.fillStyle = '#3aff6a'; c.beginPath(); c.arc(r * 0.38, -r * 0.45, r * 0.05, 0, 7); c.fill(); },
    kleeblatt: (c, r) => { c.fillStyle = '#2fa64a'; for (let i = 0; i < 4; i++) { c.save(); c.rotate(i * Math.PI / 2 + Math.PI / 4); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-r * 0.55, -r * 0.2, -r * 0.6, -r * 0.85, 0, -r * 0.55); c.bezierCurveTo(r * 0.6, -r * 0.85, r * 0.55, -r * 0.2, 0, 0); c.fill(); c.restore(); } c.strokeStyle = '#1e7a32'; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.2, r * 0.6, r * 0.5, r * 0.85); c.stroke(); },
    rubbeltisch: (c, r) => { c.fillStyle = '#3a1a0e'; c.fillRect(-r, -r * 0.15, r * 2, r * 0.25); c.fillRect(-r * 0.9, r * 0.1, r * 0.12, r * 0.8); c.fillRect(r * 0.78, r * 0.1, r * 0.12, r * 0.8); c.fillStyle = '#0f6a3a'; c.fillRect(-r * 0.92, -r * 0.3, r * 1.84, r * 0.18); c.fillStyle = '#c8ccd2'; c.save(); c.translate(0, -r * 0.55); c.rotate(-0.15); rr(c, -r * 0.45, -r * 0.3, r * 0.9, r * 0.5, r * 0.06); c.fill(); c.fillStyle = '#d63a3a'; c.fillRect(-r * 0.35, -r * 0.2, r * 0.3, r * 0.3); c.restore(); c.fillStyle = GOLD; c.beginPath(); c.arc(r * 0.55, -r * 0.6, r * 0.16, 0, 7); c.fill(); },
    automat: (c, r) => { c.fillStyle = '#8a0a14'; rr(c, -r * 0.6, -r * 0.9, r * 1.2, r * 1.8, r * 0.14); c.fill(); c.fillStyle = '#0a0a14'; c.fillRect(-r * 0.48, -r * 0.4, r * 0.96, r * 0.5); c.font = `900 ${r * 0.42}px Impact, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; ['7', '7', '7'].forEach((t, i) => { c.fillStyle = i === 1 ? '#ffd23a' : '#ff3a3a'; c.fillText(t, (i - 1) * r * 0.32, -r * 0.15); }); c.fillStyle = GOLD; c.fillRect(-r * 0.5, -r * 0.82, r, r * 0.22); c.strokeStyle = '#c8ccd2'; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(r * 0.62, -r * 0.1); c.lineTo(r * 0.85, -r * 0.1); c.lineTo(r * 0.85, -r * 0.6); c.stroke(); c.fillStyle = '#ff3a3a'; c.beginPath(); c.arc(r * 0.85, -r * 0.66, r * 0.1, 0, 7); c.fill(); },
    kartentisch: (c, r) => { for (const [a, col, s] of [[-0.35, '#fff', '♠'], [0, '#fff', '♥'], [0.35, '#fff', '♦']]) { c.save(); c.rotate(a); c.translate(0, -r * 0.1); c.fillStyle = col; rr(c, -r * 0.32, -r * 0.6, r * 0.64, r * 0.9, r * 0.07); c.fill(); c.strokeStyle = '#999'; c.lineWidth = 1; c.stroke(); c.fillStyle = s === '♠' ? '#111' : '#c8161c'; c.font = `700 ${r * 0.45}px Georgia, serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 0, -r * 0.12); c.restore(); } },
    miniroulette: (c, r) => { for (let i = 0; i < 18; i++) { c.fillStyle = i === 0 ? '#1a8a3a' : i % 2 ? '#c8161c' : '#141414'; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, r * 0.85, i / 18 * Math.PI * 2, (i + 1) / 18 * Math.PI * 2); c.fill(); } c.strokeStyle = GOLD; c.lineWidth = r * 0.1; c.beginPath(); c.arc(0, 0, r * 0.88, 0, 7); c.stroke(); c.fillStyle = '#5a3a1e'; c.beginPath(); c.arc(0, 0, r * 0.4, 0, 7); c.fill(); c.fillStyle = GOLD; c.beginPath(); c.arc(0, 0, r * 0.14, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(r * 0.62, -r * 0.2, r * 0.07, 0, 7); c.fill(); },
    teppich: (c, r) => { c.fillStyle = '#7a0a18'; c.fillRect(-r, -r * 0.6, r * 2, r * 1.2); c.strokeStyle = GOLD; c.lineWidth = r * 0.06; c.strokeRect(-r * 0.88, -r * 0.5, r * 1.76, r); for (let i = -2; i <= 2; i++) { c.save(); c.translate(i * r * 0.36, 0); c.rotate(Math.PI / 4); c.strokeRect(-r * 0.12, -r * 0.12, r * 0.24, r * 0.24); c.restore(); } c.strokeStyle = '#e8d8b0'; c.lineWidth = 2; for (let x = -r; x <= r; x += r * 0.12) { c.beginPath(); c.moveTo(x, -r * 0.6); c.lineTo(x, -r * 0.72); c.moveTo(x, r * 0.6); c.lineTo(x, r * 0.72); c.stroke(); } },
    pflanze: (c, r) => { c.fillStyle = '#8a4a2a'; c.beginPath(); c.moveTo(-r * 0.4, r * 0.35); c.lineTo(r * 0.4, r * 0.35); c.lineTo(r * 0.3, r * 0.95); c.lineTo(-r * 0.3, r * 0.95); c.fill(); c.fillStyle = '#2e8a3a'; for (let i = 0; i < 7; i++) { c.save(); c.translate(0, r * 0.35); c.rotate(-1.2 + i * 0.4); c.beginPath(); c.ellipse(0, -r * 0.55, r * 0.16, r * 0.55, 0, 0, 7); c.fill(); c.restore(); } },
    lampe: (c, r) => { const g = c.createRadialGradient(0, -r * 0.3, 2, 0, -r * 0.3, r); g.addColorStop(0, 'rgba(255,220,140,.6)'); g.addColorStop(1, 'rgba(255,200,100,0)'); c.fillStyle = g; c.fillRect(-r, -r, r * 2, r * 2); c.fillStyle = '#e8d8b0'; c.beginPath(); c.moveTo(-r * 0.25, -r * 0.8); c.lineTo(r * 0.25, -r * 0.8); c.lineTo(r * 0.45, -r * 0.3); c.lineTo(-r * 0.45, -r * 0.3); c.fill(); c.strokeStyle = GOLD; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(0, -r * 0.3); c.lineTo(0, r * 0.85); c.moveTo(-r * 0.3, r * 0.88); c.lineTo(r * 0.3, r * 0.88); c.stroke(); },
    vorhang: (c, r) => { c.strokeStyle = GOLD; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(-r, -r * 0.85); c.lineTo(r, -r * 0.85); c.stroke(); c.fillStyle = '#9a0e1e'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * 0.92, -r * 0.82); c.lineTo(s * r * 0.15, -r * 0.82); c.quadraticCurveTo(s * r * 0.5, r * 0.1, s * r * 0.7, r * 0.9); c.lineTo(s * r * 0.92, r * 0.9); c.fill(); } c.fillStyle = 'rgba(120,160,220,.35)'; c.fillRect(-r * 0.15, -r * 0.8, r * 0.3, r * 1.7); },
    bild: (c, r) => { c.fillStyle = GOLD; c.fillRect(-r * 0.7, -r * 0.9, r * 1.4, r * 1.8); c.fillStyle = '#2a1a0e'; c.fillRect(-r * 0.56, -r * 0.76, r * 1.12, r * 1.52); c.fillStyle = '#d8a87a'; c.beginPath(); c.ellipse(0, -r * 0.15, r * 0.28, r * 0.34, 0, 0, 7); c.fill(); c.fillStyle = '#b8261c'; c.beginPath(); c.ellipse(0, -r * 0.38, r * 0.32, r * 0.16, 0, Math.PI, 0); c.fill(); c.fillStyle = '#2a1a4a'; c.fillRect(-r * 0.45, r * 0.25, r * 0.9, r * 0.45); },
    tapete: (c, r) => { c.fillStyle = '#6a1018'; c.fillRect(-r, -r, r * 2, r * 2); c.strokeStyle = 'rgba(242,193,78,.75)'; c.lineWidth = r * 0.05; for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) { c.save(); c.translate(x * r * 0.7, y * r * 0.7); c.beginPath(); c.moveTo(0, -r * 0.3); c.bezierCurveTo(r * 0.25, -r * 0.1, r * 0.25, r * 0.1, 0, r * 0.3); c.bezierCurveTo(-r * 0.25, r * 0.1, -r * 0.25, -r * 0.1, 0, -r * 0.3); c.stroke(); c.restore(); } },
    sofa: (c, r) => { c.fillStyle = '#5a140e'; rr(c, -r * 0.95, -r * 0.35, r * 1.9, r * 0.55, r * 0.15); c.fill(); rr(c, -r, -r * 0.05, r * 2, r * 0.55, r * 0.12); c.fill(); c.fillStyle = '#7a2216'; rr(c, -r * 0.8, -r * 0.05, r * 0.78, r * 0.3, r * 0.08); c.fill(); rr(c, r * 0.02, -r * 0.05, r * 0.78, r * 0.3, r * 0.08); c.fill(); c.fillStyle = GOLD; c.fillRect(-r * 0.85, r * 0.5, r * 0.1, r * 0.2); c.fillRect(r * 0.75, r * 0.5, r * 0.1, r * 0.2); },
    tv: (c, r) => { c.fillStyle = '#111'; rr(c, -r * 0.95, -r * 0.65, r * 1.9, r * 1.15, r * 0.06); c.fill(); const g = c.createLinearGradient(0, -r * 0.55, 0, r * 0.4); g.addColorStop(0, '#5a0a3a'); g.addColorStop(1, '#14061a'); c.fillStyle = g; c.fillRect(-r * 0.85, -r * 0.55, r * 1.7, r * 0.95); c.fillStyle = '#ffd76a'; c.font = `900 ${r * 0.36}px Bahnschrift, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TEO', 0, -r * 0.08); c.fillStyle = '#333'; c.fillRect(-r * 0.3, r * 0.5, r * 0.6, r * 0.12); },
    aquarium: (c, r) => { c.fillStyle = 'rgba(60,150,220,.55)'; c.fillRect(-r * 0.9, -r * 0.6, r * 1.8, r * 1.1); c.strokeStyle = '#c8ccd2'; c.lineWidth = r * 0.06; c.strokeRect(-r * 0.9, -r * 0.6, r * 1.8, r * 1.1); c.fillStyle = '#d8b878'; c.fillRect(-r * 0.88, r * 0.32, r * 1.76, r * 0.16); for (const [x, y, s] of [[-0.3, -0.15, 1], [0.35, 0.1, -1]]) { c.fillStyle = '#ff8a1a'; c.beginPath(); c.ellipse(x * r, y * r, r * 0.2, r * 0.11, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x * r - s * r * 0.18, y * r); c.lineTo(x * r - s * r * 0.34, y * r - r * 0.1); c.lineTo(x * r - s * r * 0.34, y * r + r * 0.1); c.fill(); } c.fillStyle = '#2e8a3a'; c.fillRect(r * 0.6, -r * 0.1, r * 0.06, r * 0.45); },
    goldteo: (c, r) => { const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fff2b0'); g.addColorStop(0.5, '#f2c14e'); g.addColorStop(1, '#8a5a12'); c.fillStyle = '#1c2a26'; c.fillRect(-r * 0.45, r * 0.6, r * 0.9, r * 0.3); c.fillStyle = g; c.beginPath(); c.arc(0, -r * 0.55, r * 0.2, 0, 7); c.fill(); c.fillRect(-r * 0.22, -r * 0.35, r * 0.44, r * 0.6); c.fillRect(-r * 0.2, r * 0.25, r * 0.15, r * 0.35); c.fillRect(r * 0.05, r * 0.25, r * 0.15, r * 0.35); c.save(); c.translate(r * 0.2, -r * 0.3); c.rotate(-0.6); c.fillRect(0, -r * 0.06, r * 0.5, r * 0.12); c.restore(); c.beginPath(); c.arc(r * 0.55, -r * 0.72, r * 0.1, 0, 7); c.fill(); },
  };

  // ======================= Rubbel-Duell gegen Big Bruno =======================
  function tableTarget(i) {
    const st = brunoState(); if (!st || !st.here || i !== st.big.table) return null; const big = st.big;
    if (st.duel) return st.b.who === fn.myName() ? { k: 'duel', text: 'Duell gegen Big Bruno fortsetzen' } : { k: 'duel', text: `Bruno duelliert sich gerade mit ${st.b.who}`, busy: true };
    return { k: 'duel', text: `Big Bruno herausfordern · Einsatz ${euro(big.stake, true)} · Sieger bekommt ${euro(big.pot, true)}` };
  }
  function challenge() {
    const st = brunoState(); if (!st || !st.here) return; const big = st.big;
    if (st.duel) { if (st.b.who === fn.myName()) startDuel(); else toast(`Bruno duelliert sich gerade mit ${st.b.who}.`); return; }
    if (C.S.purse < big.stake) { toast(`Für das Duell braucht die Familienkasse ${euro(big.stake, true)}.`); snd.lose(); return; }
    if (host()) hostDuel(fn.myName(), null); else C.net.send({ t: 'caduel' });
  }
  function hostDuel(name, fromId) {
    const S = C.S; const st = brunoState(); if (!st || !st.here || st.duel) return; const big = st.big; if (S.purse < big.stake) { if (fromId) C.net.sendTo(fromId, { t: 'caev', k: 'no', to: name, why: `Für das Duell braucht die Familienkasse ${euro(big.stake, true)}.` }); return; }
    S.purse -= big.stake; S.spent += big.stake; const luck = luckFor(S, 'lose'); const seed = (Math.random() * 4294967296) >>> 0;
    S.bruno = { day: S.day, st: 'duel', who: name, stake: big.stake, pot: big.pot, his: brunoCards(S.day, 1.15).map((c) => c.win), mine: [0, 1, 2].map((i) => ({ uid: `b${S.day}_${i}`, cid: 'drei', seed: (seed + i * 7919) >>> 0, luck, st: 'neu', won: 0, duel: true })) };
    fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'duel', name }); duelStarted(name);
  }
  function duelStarted(name) { if (name === fn.myName()) startDuel(); else toast(`${name} fordert Big Bruno heraus!`, 'gold'); }
  function startDuel() { D.shown = (C.S.bruno && C.S.bruno.mine ? C.S.bruno.mine.filter((c) => c.st === 'fertig').length : 0); D.revealT = 0; D.result = null; D.duelShow = true; snd.music('duel', 1); snd.brass(true); fn.sit(bigEventFor(C.S.day).table, true); renderDuel(); }
  function duelCards() { const b = C.S && C.S.bruno; return b && b.day === C.S.day && b.who === fn.myName() && b.mine ? b.mine : []; }
  function duelCardDone(card, res) { card.st = 'fertig'; card.won = res.win; if (host()) hostDuelCard(fn.myName(), card.uid, res.k); else C.net.send({ t: 'caduelk', uid: card.uid, k: res.k }); renderDuel(); }
  function hostDuelCard(name, uid, k) {
    const S = C.S; const b = S.bruno; if (!b || b.st !== 'duel' || b.who !== name) return; const c = b.mine.find((x) => x.uid === uid); if (!c || c.done) return;
    c.done = true; c.st = 'fertig'; c.won = cardWin(makeCard('drei', c.seed, c.luck), k);
    if (b.mine.every((x) => x.done)) {
      const me = sum(b.mine.map((x) => x.won)); const him = sum(b.his); b.st = me > him ? 'won' : me < him ? 'lost' : 'tie'; b.done = true; b.res = { me, him };
      if (b.st === 'won') { S.purse += b.pot; S.won += b.pot; S.brunoWins = (S.brunoWins || 0) + 1; const before = S.level; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak); if (S.level > before) setTimeout(() => fn.levelUp(S.level), 5200); } else if (b.st === 'tie') S.purse += b.stake;
      if (C.net) C.net.broadcast({ t: 'caev', k: 'bruno', name, st: b.st, me, him, pot: b.pot }); brunoResult({ name, st: b.st, me, him, pot: b.pot });
    }
    fn.changed();
  }
  function brunoResult(m) { if (m.name === fn.myName()) { D.result = { ...m, t: 0 }; return; } toast(m.st === 'won' ? `${m.name} hat Big Bruno besiegt: +${euro(m.pot, true)}!` : m.st === 'lost' ? `Big Bruno gewinnt gegen ${m.name}.` : `${m.name} und Bruno: unentschieden.`, m.st === 'won' ? 'gold' : ''); }
  function duelTick(dt) {
    const b = C.S && C.S.bruno; if (!b || b.day !== C.S.day || b.who !== fn.myName() || !b.mine) return;
    const done = b.mine.filter((c) => c.st === 'fertig').length;
    if (done > D.shown) { D.revealT += dt; if (D.revealT > 1.3) { D.revealT = 0; const v = b.his[D.shown] || 0; D.shown++; if (v > 0) { snd.win(1); D.brunoAct = { a: 'cheer', t: 1.6 }; } else { snd.lose(); D.brunoAct = { a: 'sad', t: 1.6 }; } renderDuel(); } }
    const R = D.result; if (R && D.shown >= 3) { R.t += dt; if (R.t > 0.9 && !R.shown) { R.shown = true; renderDuel(); if (R.st === 'won') { snd.win(3); fn.bigWin('Big Bruno besiegt!', '+' + euro(R.pot, true), 'jackpot'); } else if (R.st === 'lost') { snd.lose(); fn.bigWin('Bruno gewinnt', `${euro(R.him, true)} zu ${euro(R.me, true)}`, 'none'); } else { snd.click(); fn.bigWin('Unentschieden', 'Einsatz zurück', 'small'); } }
      if (R.t > 3.6 && !R.cut) { R.cut = true; brunoEnd(R.st); snd.music('lounge', 3); } }
  }
  function renderDuel() {
    const box = $('caDuel'); const b = C.S && C.S.bruno; const show = D.duelShow && b && b.who === fn.myName() && b.mine; box.classList.toggle('hidden', !show); if (!show) return;
    const mine = b.mine; const me = $('caDuelMe'); const him = $('caDuelHim'); me.textContent = ''; him.textContent = ''; let sm = 0; let sh = 0;
    mine.forEach((c, i) => { const d = el('i', c.st === 'fertig' ? (c.won > 0 ? 'win' : 'zero') : C.card && C.card.inv && C.card.inv.uid === c.uid ? 'now' : '', c.st === 'fertig' ? euro(c.won, true) : '?'); me.append(d); if (c.st === 'fertig') sm += c.won; void i; });
    b.his.forEach((v, i) => { const open = i < D.shown; const d = el('i', open ? (v > 0 ? 'win' : 'zero') : '', open ? euro(v, true) : '?'); him.append(d); if (open) sh += v; });
    $('caDuelMeT').textContent = euro(sm, true); $('caDuelHimT').textContent = euro(sh, true);
    const R = D.result; $('caDuelInfo').textContent = R && R.shown ? (R.st === 'won' ? `Gewonnen! Die Familienkasse bekommt ${euro(R.pot, true)}.` : R.st === 'lost' ? 'Verloren. Bruno behält den Einsatz.' : 'Unentschieden. Der Einsatz kommt zurück.') : `Je drei Dreierglück-Lose · Einsatz ${euro(b.stake, true)} · Sieger bekommt ${euro(b.pot, true)}`;
  }

  // ======================= Teo und die Geldbörse =======================
  function targets(look, m, out) {
    const S = C.S; if (!S) return; const O = C.W.outside;
    if (O) { { const flat = Math.hypot(m.x - O.bus.x, m.z - O.bus.z); const q = look(O.bus.look.x, O.bus.look.y, O.bus.look.z); if (flat < 2.6 && q.dot > 0.2) out.push({ k: 'bus', text: S.clock >= LEAVE ? 'Mit dem Nachtbus nach Hause' : `Der Nachtbus fährt erst ab 20:00 Uhr (jetzt ${clockText(S.clock)})`, d: flat }); }
      { const flat = Math.hypot(m.x - O.atm.x, m.z - O.atm.z); const q = look(O.atm.look.x, O.atm.look.y, O.atm.look.z); if (flat < 1.9 && q.dot > 0.55) out.push({ k: 'atm', text: 'Bankautomat: Teo Bank Sofortkredit', d: flat - 0.4 }); }
      for (const [p, k, text] of [[C.dealer, 'dealer', 'Mit dem Typen in der Gasse reden'], [C.homeless, 'homeless', S.karmaDay === S.day ? 'Mit dem Obdachlosen reden' : 'Mit dem Obdachlosen reden (1 € geben?)']]) { if (!p || !p.visible) continue; const flat = Math.hypot(m.x - p.x, m.z - p.z); const q = look(p.x, p.y + 1.2, p.z); if (flat < 2.6 && q.dot > 0.6) out.push({ k, text, d: flat - 0.3 }); } }
    if (D.wallet && D.wallet.g.visible) { const p = D.wallet.g.position; const q = look(p.x, p.y + 0.02, p.z); if (q.d < 3.2 && q.dot > 0.93) out.push({ k: 'wallet', text: 'Geldbörse aufheben (15 € Finderlohn)', d: q.d - 1 }); }
    const t = D.teo; if (t && t.visible && t.st === 'stay') { const flat = Math.hypot(m.x - t.x, m.z - t.z); const q = look(t.x, 1.5, t.z); if (flat < 2.8 && q.dot > 0.75) out.push({ k: 'teo', text: S.done2.includes('teo' + S.day) ? 'Mit Teo reden' : 'Teo begrüßen (er spendiert 5 €)', d: flat - 0.5 }); }
  }
  function interact(t) {
    if (t.k === 'bus') { if (C.S.clock < LEAVE) { const left = LEAVE - C.S.clock; toast(`Teos Hausregel: Der Nachtbus fährt erst ab 20 Uhr. Noch ${Math.floor(left / 60)} Std. ${Math.round(left % 60)} Min.`); return true; } busHome(false); return true; }
    if (t.k === 'atm') { openATM(); return true; }
    if (t.k === 'dealer') { D.dealI = ((D.dealI === undefined ? -1 : D.dealI) + 1) % DEALER.length; toast(DEALER[D.dealI]); return true; }
    if (t.k === 'homeless') { homelessTalk(); return true; }
    if (t.k === 'wallet') { if (host()) hostWallet(fn.myName()); else C.net.send({ t: 'cawal' }); return true; }
    if (t.k === 'teo') { if (C.S.done2.includes('teo' + C.S.day)) { D.teoI = (D.teoI + 1) % TEO_LINES.length; toast(TEO_LINES[D.teoI]); } else if (host()) hostTeo(fn.myName()); else C.net.send({ t: 'cateo' }); return true; }
    if (t.k === 'duel') { if (t.busy) toast(t.text); else challenge(); return true; }
    if (t.k === 'exit') { if (C.S.clock < LEAVE) { const left = LEAVE - C.S.clock; toast(`Teos Hausregel: Wer kommt, bleibt bis mindestens 20 Uhr. Noch ${Math.floor(left / 60)} Std. ${Math.round(left % 60)} Min.`); return true; } travel('home', 'Mit dem Nachtbus nach Hause …'); return true; }
    return false;
  }
  const exitText = () => (C.S.clock >= LEAVE ? 'Nach Hause gehen' : `Nach Hause erst ab 20:00 Uhr (jetzt ${clockText(C.S.clock)})`);
  function hostWallet(name) { const S = C.S; const e = EVENT.boerse; if (!active('boerse') || S.done2.includes('w' + S.day)) return; S.done2.push('w' + S.day); S.purse += e.wallet; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak); fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'wal', name }); walletFound(name); }
  function walletFound(name) { snd.coin(); toast(`${name === fn.myName() ? 'Ihr habt' : name + ' hat'} die verlorene Geldbörse gefunden und an der Kasse abgegeben: ${euro(EVENT.boerse.wallet, true)} Finderlohn!`, 'gold'); }
  function hostTeo(name) { const S = C.S; if (!active('teo') || S.done2.includes('teo' + S.day)) return; S.done2.push('teo' + S.day); S.purse += EVENT.teo.gift; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak); fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'teo', name }); teoGift(name); }
  function teoGift(name) { snd.sparkle(); snd.coin(); toast(`Teo: „Ah, die Familie mit den 25 Euro! Hier, ${euro(EVENT.teo.gift, true)} für euch. Nicht alles auf einmal verrubbeln.“${name !== fn.myName() ? ' (' + name + ' hat ihn begrüßt)' : ''}`, 'gold'); }

  // ======================= Draußen: Nachtbus, Bankautomat, Gasse =======================
  const DEALER = ['Typ: „Pssst. Brauchst du was für die Nerven? Macht Glück, sagen sie.“ Du schüttelst den Kopf.', 'Typ: „Glückspillen, nur 20 €.“ „Nein danke. Wir haben schon genug Probleme.“', 'Typ: „Teo kauft auch bei mir. Sagt er nur nicht laut.“', 'Typ: „Wenn ihr pleite seid, wisst ihr, wo ihr mich findet.“ Ihr geht lieber weiter.'];
  const HOMELESS = ['Obdachloser: „Ich hatte auch mal ein Haus. Dann kam Teo’s Casino.“', 'Obdachloser: „Morgens verliert man, abends verliert man langsamer.“', 'Obdachloser: „Der Typ da vorne? Lass die Finger davon.“'];
  function homelessTalk() {
    const S = C.S; if (S.karmaDay === S.day) { D.homI = ((D.homI === undefined ? -1 : D.homI) + 1) % HOMELESS.length; toast(HOMELESS[D.homI]); return; }
    if (D.askT && performance.now() - D.askT < 8000) { D.askT = 0; if (S.purse < 100) { toast('Ihr habt selbst keinen Euro mehr.'); return; } if (host()) hostDonate(fn.myName()); else C.net.send({ t: 'cadonate' }); return; }
    D.askT = performance.now(); toast('Obdachloser: „Hast du einen Euro für mich?“ (E noch einmal: 1 € geben)');
  }
  function hostDonate(name) { const S = C.S; if (S.karmaDay === S.day || S.purse < 100) return; S.purse -= 100; S.karmaDay = S.day; fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'karma', name }); donated(name); }
  function donated(name) { snd.coin(); toast(`${name === fn.myName() ? 'Du gibst' : name + ' gibt'} ihm 1 €. „Danke. Möge Teo heute gnädig sein.“ Gutes Karma: Glück +0,05 bis Mitternacht.`, 'gold'); }
  // Nachtbus: kommt an die Haltestelle, Türen auf, dann nach Hause
  function busHome(last) {
    if (D.cut) return; const I = C.intro && C.intro.I; if (!I || !I.bus) { travel('home', 'Mit dem Nachtbus nach Hause …'); return; } if (!startCut('bus', { last })) return;
    const b = I.bus; b.group.position.x = 46; b.setDoor(0); for (const s2 of b.head) s2.intensity = 30; snd.bus(0.6);
  }
  function busStep(c, dt) {
    const T = c.t; const b = C.intro.I.bus; const u = Math.min(1, T / 2.6); b.group.position.x = 46 - (46 - 13) * (1 - Math.pow(1 - u, 2.2)); if (cue(c, 1.3)) snd.brakes(); if (cue(c, 2.7)) { snd.hiss(); b.setDoor(1); snd.bus(0.25); }
    camTo(V3(3.6, 0.95, 14.2), V3(Math.max(12, b.group.position.x - 2), 1.6, 18.2), 48);
    if (cue(c, 0.2)) say(c.last ? 'Mitternacht. Der letzte Nachtbus.' : 'Der Nachtbus kommt.', 2.6);
    if (cue(c, 3.3)) fade(1, 0.6);
    if (T > 3.95) { b.setDoor(0); b.group.position.x = 60; for (const s2 of b.head) s2.intensity = 0; snd.bus(0); D.cut = null; travel('home', `${clockText(Math.min(CLOSE, C.S.clock + 20))} Uhr · Zu Hause.`, true); }
  }
  // Bankautomat der Teo Bank: ein Kredit gleichzeitig, 10 % Gebühr, vier Wochenraten
  function openATM() { fn.unlock(); C.ui = 'atm'; $('caATM').classList.remove('hidden'); snd.beep(); renderATM(); }
  function renderATM() {
    if (C.ui !== 'atm') return; const S = C.S; const body = $('caATMBody'); body.textContent = ''; $('caATMPurse').textContent = euro(S.purse);
    if (loanRest(S) > 0) { const L = S.loan; body.append(el('p', 'ca-atm-big', 'Offener Kredit'), el('p', '', `${euro(L.amount)} ausgezahlt, zurückzuzahlen ${euro(L.debt)}. Rest ${euro(L.rest)}. Wochenrate ${euro(Math.min(L.rest, L.rate))} wird Sonntagnacht abgebucht.`), el('p', 'ca-atm-warn', 'Ein neuer Kredit geht erst, wenn dieser zurückgezahlt ist.'));
      const row = el('div', 'ca-atm-keys'); for (const [t2, a] of [['10 € zurückzahlen', 1000], [`Wochenrate jetzt · ${euro(Math.min(L.rest, L.rate), true)}`, Math.min(L.rest, L.rate)], [`Alles zurückzahlen · ${euro(L.rest, true)}`, L.rest]]) { const b = el('button', '', t2); b.type = 'button'; b.disabled = S.purse < Math.min(a, L.rest); b.onclick = () => { snd.beep(); loanPay(a); }; row.append(b); } body.append(row); return; }
    body.append(el('p', 'ca-atm-big', 'Sofortkredit · Betrag wählen'), el('p', '', `${Math.round(LOAN_FEE * 100)} % Gebühr, Rückzahlung in ${LOAN_WEEKS} Wochenraten (Sonntagnacht, mit den Verträgen). Geliehenes Geld zählt nicht für die Level.`));
    const row = el('div', 'ca-atm-keys'); for (const a of LOANS) { const b = el('button', 'primary', euro(a, true)); b.type = 'button'; const debt = Math.round(a * (1 + LOAN_FEE)); b.title = `Zurück: ${euro(debt)} in ${LOAN_WEEKS} Raten zu ${euro(Math.ceil(debt / LOAN_WEEKS))}`; b.onclick = () => { snd.beep(); loanTake(a); }; const sm = el('small', '', `4 × ${euro(Math.ceil(debt / LOAN_WEEKS), true)}`); b.append(sm); row.append(b); } body.append(row);
    if (S.over) body.append(el('p', 'ca-atm-warn', 'Karte eingezogen.'));
  }
  $('caATMClose').onclick = () => fn.closeUI();
  function loanTake(a) { if (host()) hostLoan(fn.myName(), null, a); else C.net.send({ t: 'caloan', a }); }
  function hostLoan(name, fromId, a) { const r = takeLoan(C.S, a); if (!r.ok) { if (fromId) C.net.sendTo(fromId, { t: 'caev', k: 'no', to: name, why: r.why }); else { toast(r.why); snd.lose(); } return; } fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'loan', name, a }); loaned(name, a); }
  function loaned(name, a) { snd.cash(); toast(`${name === fn.myName() ? 'Der Automat zahlt' : name + ' holt'} ${euro(a)} Kredit aus. Rückzahlung: ${LOAN_WEEKS} Wochenraten.`, 'gold'); renderATM(); }
  function loanPay(a) { if (host()) hostLoanPay(fn.myName(), a); else C.net.send({ t: 'caloanpay', a }); }
  function hostLoanPay(name, a) { const v = payLoan(C.S, a); if (v > 0) { fn.changed(); if (C.net) C.net.broadcast({ t: 'caev', k: 'loanpay', name, v }); loanPaid(name, v); } }
  function loanPaid(name, v) { snd.coin(); toast(`${name === fn.myName() ? '' : name + ': '}${euro(v)} an die Teo Bank zurückgezahlt.${loanRest(C.S) > 0 ? '' : ' Kredit erledigt!'}`, 'gold'); renderATM(); renderPC(); }

  // ======================= Pleite: die Familie landet in der Gasse =======================
  const story = (t2, title) => { const T = $('caStoryT'); const H = $('caStoryH'); if (title) { H.textContent = t2; H.classList.remove('on'); void H.offsetWidth; H.classList.add('on'); return; } T.textContent = t2; T.classList.remove('on'); void T.offsetWidth; T.classList.add('on'); };
  function gameOver() {
    if (D.cut && D.cut.kind === 'over') return; fn.standAll(); fn.closeUI(); D.cut = null; if (D.where === 'home') setupCasino(false);
    if (!startCut('over', { owns: [...C.fam] })) return; C.famLock = true; hud.classList.add('ca-overcut');
    const st = $('caStory'); st.classList.remove('hidden'); st.classList.add('ca-overmode'); $('caStoryT').classList.remove('on'); $('caStoryH').classList.remove('on'); $('caStoryCap').textContent = ''; const fd = $('caFade'); fd.style.transition = 'none'; fd.style.opacity = '1'; requestAnimationFrame(() => { fd.style.transition = 'opacity 1.6s ease'; fd.style.opacity = '0'; });
    snd.music(null, 1); snd.amb(0.25); snd.story(true); for (const k of ['g1', 'g2']) if (D[k]) D[k].setVisible(false);
    C.fam.forEach((p, i) => { p.setVisible(true); p.fig.setOwn(false); p.place(-0.85 + i * 0.85, 0, -7.2 - (i % 2) * 0.45, 0); p.mode = 'walk'; p.speed = 0.6; p.act = 0; p.actT = undefined; p.sad = 1; p.hope = 0; p.y = 0; });
  }
  function overStep(c, dt) {
    const T = c.t; const fam = C.fam; const O = C.W.outside; const fd = $('caFade'); const ofs = [-0.85, 0, 0.85];
    if (T < 7.5) { fam.forEach((p, i) => { walkTo(p, ofs[i], -1.6, dt, 0.62); p.lookAt = V3(p.x, 0.3, p.z + 3); }); camTo(V3(0.35, 1.1, 0.4), V3(0, 1.15, -6), 46); if (cue(c, 0.9)) story('Am Ende hatten wir nichts mehr.'); }
    else if (T < 14.5) { if (cue(c, 7.5)) { fam.forEach((p, i) => p.place(ofs[i] * 0.7, 0, 6.0 - (i % 2) * 0.4, 0)); D.doorWant = 1; D.doorFast = true; $('caStoryT').classList.remove('on'); } fam.forEach((p, i) => { walkTo(p, ofs[i] * 0.7, 11.8, dt, 0.8); p.lookAt = V3(p.x, 0.4, p.z + 3); }); camTo(V3(-5.6, 0.9, 15.6), V3(0, 1.8, 9.8), 50); if (cue(c, 8.6)) story('Kein Geld. Kein Kredit. Kein Zuhause.'); }
    else if (T < 23.5) { const seats = O ? O.seats : []; if (cue(c, 14.5)) { D.doorWant = 0; fam.forEach((p, i) => { p.place(-25.0 + ofs[i] * 0.5, -0.46, 5.4 + i * 0.5, Math.PI); p.mode = 'walk'; }); $('caStoryT').classList.remove('on'); }
      fam.forEach((p, i) => { const sp = seats[i]; if (!sp) return; if (p.mode !== 'sit') { const done = walkTo(p, sp.x, sp.z, dt, 1.05, () => -0.46); p.lookAt = V3(p.x, -0.2, p.z - 2); if (done) { p.place(sp.x, -0.46, sp.z, sp.yaw); p.mode = 'sit'; p.seat = 0.42; } } else { p.yaw = sp.yaw; p.lookAt = O ? O.fire : null; } });
      camTo(V3(-24.2, 1.25, -5.8), V3(-25.0, 0.55, 2.2), 52); if (cue(c, 15.6)) story('Teo’s Casino hatte gewonnen.'); }
    else { fam.forEach((p, i) => { const sp = O && O.seats[i]; if (sp) { p.place(sp.x, -0.46, sp.z, sp.yaw); p.mode = 'sit'; p.seat = 0.42; p.lookAt = O.fire; } }); if (c.wait) { const k = clamp((T - 33) / 30, 0, 1); camTo(V3(-24.0, 2.2 - k * 0.3, 3.9 - k * 0.8), V3(-24.3, -0.5, -1.0), 50); } else { const u = smooth(23.5, 29, T); camTo(V3(-24.6, 1.4 + u * 6.5, -6.4 - u * 3), V3(-24.8, 0.4 + u * 0.5, 0.4), 52); } if (cue(c, 24.4)) story('Und wir saßen in der Gasse. Gleich neben dem Glück.'); if (cue(c, 28.6)) { fd.style.transition = 'opacity 1.4s ease'; fd.style.opacity = '1'; $('caStoryT').classList.remove('on'); } if (cue(c, 30.2)) story('PLEITE', true); if (cue(c, 33)) showOver(false); }
    for (const p of fam) if (p.visible) p.update(dt, C.t);
  }
  function showOver(direct) {
    const S = C.S; const o = S.over || { day: S.day, peak: S.peak }; const di = dayInfo(o.day || S.day); const fd = $('caFade');
    if (direct) { if (!D.cut || D.cut.kind !== 'over') gameOver(); if (D.cut && D.cut.kind === 'over') { D.cut.t = 33; D.cut.pt = 33; } $('caStory').classList.remove('hidden'); $('caStory').classList.add('ca-overmode'); fd.style.transition = 'none'; fd.style.opacity = '1'; story('PLEITE', true); hud.classList.add('ca-overcut'); snd.story(true); C.phase = 'cut'; if (!D.cut) D.cut = { kind: 'overwait', t: 0, pt: 0, owns: [] }; }
    // die Familie am Feuer bleibt gedimmt sichtbar
    requestAnimationFrame(() => requestAnimationFrame(() => { if ($('caOver').classList.contains('hidden')) return; fd.style.transition = 'opacity 2.6s ease'; fd.style.opacity = '0.12'; }));
    $('caOvText').textContent = `Die Familie hat es nicht geschafft. In Woche ${di.week} am ${di.name} (Tag ${o.day || S.day}) war alles verspielt: kein Geld, kein Kredit, kein Zuhause.`;
    const box = $('caOvStats'); box.textContent = ''; for (const [a, b] of [['Höchster Kassenstand', euro(o.peak || S.peak)], ['Gerubbelte Lose', String(S.scratched)], ['Automaten-Drehs', String((S.slotStats || {}).spins || 0)], ['Kredite aufgenommen', String(S.loanCount || 0)], ['Größter Einzelgewinn', euro(Math.max(S.best || 0, (S.slotStats || {}).best || 0))]]) { const d = el('div', ''); d.append(el('span', '', a), el('b', '', b)); box.append(d); }
    $('caOvNew').disabled = !host(); $('caOvNew').textContent = host() ? 'Neu anfangen (gleicher Spielstand)' : 'Der Host entscheidet'; $('caOver').classList.remove('hidden'); if (D.cut) D.cut.wait = true;
  }
  function overEnd() { $('caOver').classList.add('hidden'); { const fd = $('caFade'); fd.style.transition = 'none'; fd.style.opacity = '0'; } const st = $('caStory'); st.classList.add('hidden'); st.classList.remove('ca-overmode'); $('caStoryT').classList.remove('on'); $('caStoryH').classList.remove('on'); hud.classList.remove('ca-overcut'); snd.story(false); C.famLock = false; for (const p of C.fam) { p.mode = 'stand'; p.seat = 0.47; p.sad = 0; p.y = 0; } }
  $('caOvNew').onclick = () => { if (!host()) return; overEnd(); D.cut = null; hud.classList.remove('ca-cutting'); $('caCut').classList.add('hidden'); if (C.net) C.net.broadcast({ t: 'caev', k: 'newgame' }); fn.newGame(); };
  $('caOvGal').onclick = () => { overEnd(); D.cut = null; fn.back(); };

  // ======================= Mehrspieler =======================
  function message(from, m) {
    if (!C.net) return false; const name = (C.net.players.find((p) => p.id === from) || {}).name || from;
    if (m.t === 'caclk') { if (!host() && m.d === C.S.day) C.S.clock = m.c; return true; }
    if (m.t === 'caday') { if (!host()) sleepSeq(m.rep); return true; }
    if (m.t === 'caev') {
      if (m.k === 'hbuy') { homeBought(m.name, m.id); return true; } if (m.k === 'pay') { if (!host()) paid(m.name, m.id, m.v); return true; }
      if (m.k === 'duel') { if (!host()) duelStarted(m.name); return true; } if (m.k === 'bruno') { if (!host()) brunoResult(m); return true; } if (m.k === 'brunogone') { if (!host()) brunoGone(); return true; }
      if (m.k === 'teo') { if (!host()) teoGift(m.name); return true; } if (m.k === 'over') { if (!host()) gameOver(); return true; } if (m.k === 'newgame') { if (!host()) { overEnd(); D.cut = null; hud.classList.remove('ca-cutting'); $('caCut').classList.add('hidden'); fn.restart(); } return true; }
      if (m.k === 'loan') { if (!host()) loaned(m.name, m.a); return true; } if (m.k === 'loanpay') { if (!host()) loanPaid(m.name, m.v); return true; } if (m.k === 'karma') { if (!host()) donated(m.name); return true; } if (m.k === 'wal') { if (!host()) walletFound(m.name); return true; } if (m.k === 'out') { if (m.name !== fn.myName()) toast(`${m.name} wurde von der Security hinausgetragen.`); return true; }
      return false;
    }
    if (!host()) return false;
    if (m.t === 'cahome') { D.atHome.set(from, !!m.on); return true; }
    if (m.t === 'casleep') { hostSleep(name, from); return true; }
    if (m.t === 'cahbuy') { hostBuyItem(name, from, m.id); return true; }
    if (m.t === 'capay') { hostPay(name, m.id, m.a | 0); return true; }
    if (m.t === 'caduel') { hostDuel(name, from); return true; }
    if (m.t === 'caduelk') { hostDuelCard(name, m.uid, m.k | 0); return true; }
    if (m.t === 'cawal') { hostWallet(name); return true; }
    if (m.t === 'cateo') { hostTeo(name); return true; }
    if (m.t === 'caout') { hostOut(name); return true; }
    if (m.t === 'caloan') { hostLoan(name, from, m.a | 0); return true; } if (m.t === 'caloanpay') { hostLoanPay(name, m.a | 0); return true; } if (m.t === 'cadonate') { hostDonate(name); return true; }
    return false;
  }
  function playerLeft(id, name) { D.atHome.delete(id); const S = C.S; if (!host() || !S) return; const b = S.bruno; if (b && b.day === S.day && b.st === 'duel' && b.who === name) { S.purse += b.stake; b.st = 'abgebrochen'; b.done = true; fn.changed(); } }
  function refresh() { if (C.ui === 'pc') renderPC(); if (C.ui === 'atm') renderATM(); renderDuel(); }
  function stop() { if (D.cut) { D.cut = null; } if ($('caOver')) overEnd(); $('caATM').classList.add('hidden'); hud.classList.remove('ca-cutting', 'ca-home'); $('caCut').classList.add('hidden'); $('caDayCard').classList.add('hidden'); $('caDuel').classList.add('hidden'); $('caPC').classList.add('hidden'); fade(0, 0.01); D.where = 'casino'; D.duelShow = false; D.power = 1; if (C.W && C.W.setPower) C.W.setPower(1); for (const k of ['g1', 'g2', 'bruno', 'teo']) if (D[k]) { D[k].setVisible(false); D[k].st = null; } if (D.bruno && D.bruno.card) D.bruno.card.visible = false; }

  // Für Tests
  const debug = { setClock: (m) => { C.S.clock = m; D.last = { day: C.S.day, c: m }; D.evKey = ''; }, runTo: (m) => { C.S.clock = m; }, goHome: () => { if (C.phase === 'table') fn.standUp(); D.cut = null; travel('home', 'Test: nach Hause'); }, sleep: () => trySleep(), cardGo, security: () => securityOut(), skip, state: () => ({ where: D.where, cut: D.cut ? D.cut.kind : null, clock: C.S.clock, day: C.S.day, power: D.power, wallet: !!(D.wallet && D.wallet.g.visible), teo: !!(D.teo && D.teo.visible), bruno: !!(D.bruno && D.bruno.visible), shown: D.shown, result: D.result ? D.result.st : null }), openPC, challenge, D, gameOver, busHome: () => busHome(false), openATM, loanTake, homelessTalk };
  return { tick, frame, key, hold, release, skip, targets, interact, exitText, tableTarget, homeInteract, resume, afterIntro, refresh, message, playerLeft, showOver, duelCards, duelCardDone, where: () => D.where, inCut: () => !!D.cut, stop, debug };
}
