// Theos Seitenscheidel - der Schrank-Hub (Lennox, 2026-11-22): Spiel starten, Zimmer, Schrank, beide Türen an der Klinke aufziehen, drin sind die Spiele.
// schrankzimmer.js = Raum und Möbel, schranksachen.js = Gegenstände, schrankleben.js = Besuch, Trophäen, Fenster, schrankstand.js + erfolge.js = Spielstände und Gold, schrankton.js = Geräusche.
// Bildschirme: 'menu' = ganzes Zimmer, 'gallery' = in den Schrank hineingezoomt, start/lobby/join/settings = Kamera am Gegenstand oder an der Schublade.
// Die alten Knöpfe und Kacheln bleiben unsichtbar im DOM: Sie lösen die Spiele aus und sind die Notliste, falls das Zimmer nicht gebaut werden kann.
// Wichtig: ACES gilt nur für das eigene Bild und wird gleich danach zurückgestellt (das Rennen braucht seine Tonwertkurve).
import * as THREE from './vendor/three.module.min.js';
import { V3, clamp, lerp } from './titelkit.js';
import { buildZimmer, SLOTS, FRONT, SCHULE_X, BEENDEN_X, slotsOf, ROWS_SCHULE } from './schrankzimmer.js';
import { buildSache } from './schranksachen.js';
import { createStand } from './schrankstand.js';
import { buildLeben, SITZE } from './schrankleben.js';
import { ERFOLGE } from './erfolge.js';
import { buildDeko } from './schrankdeko.js';
import { createTafeln } from './schranktafeln.js';
import { RADIO, MAX_POKALE, pokale, saubereWahl, sichtbareWahl, naechsterSender } from './zimmerwahl.js';
import { NEUIGKEITEN, ungelesen } from './neuigkeiten.js';
import { MP_VERSION } from './net.js';
import { createSchrankTon } from './schrankton.js';
import { createTitelMusik } from './titelmusik.js';

const TILE = {
  race: 'bPlay', park: 'bPark', moon: 'bMoon', chess: 'bChess', pong: 'bPong', ships: 'bShips', raus: 'bRaus', baron: 'bBaron',
  kraft: 'bKraft', casino: 'bCasino', strom: 'bStrom', bruno: 'bBruno', saege: 'bSaege', ozean: 'bOzean', ludwig: 'bLudwig', rv: 'bRV',
  stapel: 'bStapel', dino: 'bDino', rang: 'bRang', // Schulmodus
};
const SLOTS_SCHULE = slotsOf(ROWS_SCHULE);
let SLOTS_AKT = SLOTS; // welche Fächer gerade im Schrank sind: normal oder Schule
let SLOT = Object.fromEntries(SLOTS.map((s) => [s.id, s]));
const setzeFaecher = (schule) => { SLOTS_AKT = schule ? SLOTS_SCHULE : SLOTS; SLOT = Object.fromEntries(SLOTS_AKT.map((s) => [s.id, s])); };
const SIZE = { big: [0.53, 0.43, 0.38], small: [0.32, 0.2, 0.28] }; // so groß darf ein Gegenstand sein
const groesse = (S) => (S.wide ? [S.w * 0.8, S.h * 0.86, 0.4] : S.big ? [Math.min(S.w * 0.87, 0.62), 0.43, 0.38] : SIZE.small);
const LIVE = new Set(['menu', 'gallery', 'start', 'lobby', 'join', 'settings', 'loading']); // hier ist das Zimmer zu sehen
const HANDS_ON = new Set(['menu', 'gallery']); // hier kann man es anfassen
const EXPOSURE = 1.05;
const SCAN_EVERY = 60000;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createSchrank({ renderer, audio, $, store, settings, G, games, getQuality, resize, scan, canScan, netBusy, focusMode, openSettings, showScreen, quit, erfolge, joinLobby, schule = null }) { // schule: { umschalten(an), stand(), treppchen(), tafel } (Schulmodus, 2026-11-23)
  const body = document.body;
  const gl = $('gl');
  const cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.05, 40);
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const size = new THREE.Vector2();
  const v = V3();
  const calmQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const music = createTitelMusik(audio);
  const ton = createSchrankTon(audio);
  const readStand = createStand({ store, games });
  const actions = { quit, openSettings, joinLobby, now: () => new Date(), schule: (an) => { if (schule) schule.umschalten(an); } }; // der Prüfzugang tauscht sie aus

  const H = {
    stage: 'build', steps: null, room: null, items: {}, awake: false, screen: G.screen || 'menu', t: 0, age: 0, power: 0.1,
    doors: [], open: false, entered: false, hintT: 0, wrong: 0, drag: null,
    hover: null, sel: null, over: false, px: 0, py: 0, moved: false, mx: 0, my: 0,
    cam: null, from: null, tween: 1, tweenLen: 0.8, key: '', focus: null, fromFocus: false,
    busy: null, quitting: null, said: 0, update: false, wiggle: 0, drawer: 0, stand: {}, standDue: true,
    lobbies: {}, gaeste: [], stufen: {}, schule: false, wechsel: null, tueren: null, leben: null, deko: null, wahl: saubereWahl(store.get('zimmer', null)), zu: 0, scanAt: -1e12, scanning: false, shadowT: 0, dpr: null, scale: 1, slow: 0, cursor: null, compileT: 0,
  };
  body.classList.add('hub');
  const calm = () => calmQ.matches;

  const el = (tag, id, cls) => { const e = document.createElement(tag); if (id) e.id = id; if (cls) e.className = cls; return e; };
  const card = el('div', 'srCard', 'srcard hidden'); const cardName = el('b'); const cardLine = el('em'); const cardText = el('span'); const cardLive = el('i'); const cardGold = el('u');
  card.append(cardName, cardLine, cardText, cardGold, cardLive);
  const hint = el('p', 'srHint', 'srhint hidden'); hint.setAttribute('role', 'status');
  body.append(card, hint);

  // ---------------- Radio, Gestalten, Zettel (Abstimmung Paket 3) ----------------
  const zeigeWahl = () => { if (H.deko) H.deko.setWahl(sichtbareWahl(H.wahl, pokale(H.stufen).n)); };
  function setWahl(neu) { H.wahl = saubereWahl(neu); store.set('zimmer', H.wahl); zeigeWahl(); }
  const tafeln = createTafeln({
    version: MP_VERSION,
    holen: () => ({ wahl: H.wahl, n: pokale(H.stufen).n }),
    setzen: setWahl,
    beimSchliessen: () => { H.sel = null; },
    mehr: schule && schule.tafel ? { rang: schule.tafel } : {},
  });
  function oeffneTafel(art) {
    H.sel = null; H.hover = null;
    if (art === 'neues') { store.set('neuGelesen', NEUIGKEITEN[0].v); if (H.deko) H.deko.zettel.set(false); }
    tafeln.oeffnen(art);
  }

  function fail(e) {
    console.error('[schrank] Zimmer fehlgeschlagen, es gilt die einfache Liste', e);
    tafeln.schliessen();
    H.stage = 'failed'; body.classList.remove('hub', 'upopen'); card.classList.add('hidden'); hint.classList.add('hidden');
    music.stop();
  }

  // ---------------- Aufbau Stück für Stück, damit das Fenster sofort reagiert ----------------
  function* build() {
    setzeFaecher(H.schule);
    H.room = buildZimmer({ renderer, shadows: !!settings.shadows && !H.schule, low: getQuality() === 'low', schule: H.schule });
    const T = H.tueren; H.tueren = null; // beim Umbau bleiben offene Türen offen
    H.doors = H.room.doors.map((d, i) => ({ ...d, a: T ? T[i] : 0, v: 0, target: T ? T[i] : 0, last: 0, bumped: false }));
    yield;
    try {
      const L = buildLeben(H.room); L.update(0, actions.now(), null, true); L.bett.set(H.gaeste); H.leben = L;
    } catch (e) { console.error('[schrank] Besuch, Regal und Fenster fehlen', e); } // der Schrank geht auch ohne
    yield;
    try {
      const D = buildDeko(H.room); D.zettel.set(ungelesen(store.get('neuGelesen', null))); H.deko = D; zeigeWahl();
    } catch (e) { console.error('[schrank] Radio, Zettel und Deko fehlen', e); }
    yield;
    for (const S of SLOTS_AKT) {
      const it = buildSache(S.id, groesse(S));
      it.k = 0; it.group.position.set(S.x, S.y, 0.31); it.update(1.3, false, true);
      H.room.scene.add(it.group); H.items[S.id] = it;
      yield;
    }
  }
  function buildStep() {
    try {
      if (H.stage === 'build') {
        if (!H.steps) H.steps = build();
        const t0 = performance.now();
        do { if (H.steps.next().done) { H.stage = 'compile'; break; } } while (performance.now() - t0 < 14);
        if (H.stage !== 'compile') return;
        refresh(); moveCamera(0); applyDoors(); H.room.light(0, { power: 1, open: 0, both: 0 }, true);
        H.compileT = performance.now();
        const ready = () => { if (H.stage === 'compile') H.stage = 'ready'; };
        const tone = renderer.toneMapping; renderer.toneMapping = THREE.ACESFilmicToneMapping; // compileAsync liest die Kurve sofort beim Aufruf
        try { renderer.compileAsync(H.room.scene, cam).then(ready, ready); } finally { renderer.toneMapping = tone; }
      } else if (performance.now() - H.compileT > 8000) H.stage = 'ready'; // zur Not ohne Vorab-Übersetzung
    } catch (e) { fail(e); }
  }

  // ---------------- Spielstände, Gold, offene Lobbys ----------------
  function refresh() {
    H.standDue = false; H.stand = readStand();
    try { H.stufen = erfolge.collect(); } catch (e) { console.warn('[schrank] Erfolge nicht lesbar', e); }
    for (const E of ERFOLGE) if (E.spiel && H.stufen[E.id] === 2 && H.stand[E.spiel]) H.stand[E.spiel].gold = true; // auch wer nur mitgespielt hat
    if (H.schule && schule) { try { Object.assign(H.stand, schule.stand()); if (H.items.rang && H.items.rang.ordne) H.items.rang.ordne(schule.treppchen()); } catch (e) { console.warn('[schrank] Rangliste nicht lesbar', e); } }
    if (H.leben) H.leben.regal.set(H.stufen);
    zeigeWahl();
    for (const [id, it] of Object.entries(H.items)) {
      const gold = !!(H.stand[id] && H.stand[id].gold); it.gold(gold);
      const tag = H.room.cubbies[id].tagM; if (tag) tag.color.setHex(gold ? 0xffc34a : 0xffffff);
    }
  }
  function setLobbies(list) {
    H.lobbies = {};
    for (const l of list) if (l && SLOT[l.mode]) (H.lobbies[l.mode] = H.lobbies[l.mode] || []).push(l);
    H.gaeste = list.filter((l) => l && SLOT[l.mode]).slice(0, SITZE.length); // der Gastgeber jeder Lobby sitzt auf dem Bett
    if (H.hover && H.hover.startsWith('gast:')) H.hover = null;
    if (H.sel && H.sel.startsWith('gast:')) H.sel = null;
    if (H.leben) H.leben.bett.set(H.gaeste);
  }
  function maybeScan() {
    if (H.scanning || !HANDS_ON.has(H.screen) || !canScan() || netBusy() || document.hidden || !document.hasFocus()) return;
    const now = performance.now(); if (now - H.scanAt < SCAN_EVERY) return;
    H.scanAt = now; H.scanning = true;
    Promise.resolve().then(scan).then((list) => setLobbies(list), () => setLobbies([])).finally(() => { H.scanning = false; });
  }

  // ---------------- Kamera ----------------
  function closeUp(id, w, h, back, shift) {
    const S = SLOT[id]; const y = S.y + S.h / 2;
    return { pos: V3(S.x, y + 0.14, FRONT + back), at: V3(S.x, y, 0.33), w: S.w * w, h: S.h * h, shift, look: 0.02 };
  }
  function viewKey() {
    if (H.busy && H.busy.id) return 'fly:' + H.busy.id;
    if (H.busy && H.busy.drawer) return 'drawer';
    const s = H.screen;
    if ((s === 'start' || s === 'lobby' || s === 'join' || s === 'loading') && H.focus) return `side:${H.focus}:${s}`;
    if (s === 'settings') return H.fromFocus && H.focus ? `side:${H.focus}:settings` : 'drawer';
    if (s === 'gallery') return 'gallery';
    return H.gaeste.length ? 'besuch' : 'menu';
  }
  function viewOf(key) {
    const [kind, id, s] = key.split(':');
    if (kind === 'fly') return closeUp(id, 1.12, 1.12, 1.25, 0);
    if (kind === 'side') return s === 'start' ? closeUp(id, 2.8, 1.5, 1.7, 0.24) : closeUp(id, 3.6, 1.5, 1.7, 0.3);
    if (kind === 'drawer') return { pos: V3(0, 1.55, 3.5), at: V3(0, 0.45, 0.68), w: 2.5, h: 1.45, shift: 0, look: 0.03 };
    if (kind === 'gallery') return { pos: V3(0, 1.44, 3.85), at: V3(0, 1.12, 0.5), w: 2.15, h: 2.1, shift: 0, look: 0.07 };
    if (kind === 'besuch') return { pos: V3(-0.03, 1.56, 5.55), at: V3(-0.17, 1.35, 0.55), w: 5.3, h: 3.06, shift: 0, look: 0.17 }; // etwas nach links, damit das Bett im Bild ist
    return { pos: V3(0.18, 1.56, 5.5), at: V3(0.03, 1.35, 0.55), w: 4.85, h: 3.0, shift: 0, look: 0.22 };
  }
  function moveCamera(dt) {
    const key = viewKey();
    if (key !== H.key || !H.cam) {
      const to = viewOf(key);
      if (!H.cam || calm()) { H.cam = { ...to, pos: to.pos.clone(), at: to.at.clone() }; H.from = null; H.tween = 1; } else {
        H.from = { ...H.cam, pos: H.cam.pos.clone(), at: H.cam.at.clone() }; H.tween = 0; H.tweenLen = key.startsWith('fly') ? 0.62 : 0.8;
      }
      H.key = key; H.to = to;
    }
    if (H.tween < 1) {
      H.tween = Math.min(1, H.tween + dt / H.tweenLen); const k = ease(H.tween); const A = H.from; const B = H.to; const C = H.cam;
      C.pos.lerpVectors(A.pos, B.pos, k); C.at.lerpVectors(A.at, B.at, k);
      for (const p of ['w', 'h', 'shift', 'look']) C[p] = lerp(A[p], B[p], k);
    }
    const w = window.innerWidth; const h = Math.max(1, window.innerHeight); const asp = w / h; const C = H.cam;
    const steady = calm() || !!H.drag || !H.moved;
    if (!H.drag) { const k = 1 - Math.exp(-dt * 3); H.mx += ((steady ? 0 : H.px / w * 2 - 1) - H.mx) * k; H.my += ((steady ? 0 : H.py / h * 2 - 1) - H.my) * k; }
    const lx = H.mx * C.look; const ly = H.my * C.look * 0.55; // leicht umschauen
    cam.position.set(C.pos.x + lx * 0.35, C.pos.y - ly * 0.25, C.pos.z);
    v.set(C.at.x + lx, C.at.y - ly, C.at.z);
    cam.lookAt(v);
    const d = C.pos.distanceTo(C.at);
    cam.fov = 2 * Math.atan(Math.max(C.h / 2 / d, C.w / 2 / d / asp)) * 180 / Math.PI; cam.aspect = asp;
    if (C.shift > 0.0005) cam.setViewOffset(w, h, C.shift * w, 0, w, h); else cam.clearViewOffset();
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  function toScreen(x, y, z) {
    v.set(x, y, z).project(cam);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  }

  // ---------------- Was liegt unter der Maus ----------------
  function pick(x, y) {
    if (H.stage !== 'ready' || !H.cam) return null;
    ndc.set(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    const R = H.room; const list = [R.drawer.hit, R.rocker.hit];
    if (H.update) list.push(R.parcel.hit);
    for (const d of H.doors) { if (d.target < 1) list.push(d.handle); list.push(d.panel); }
    if (H.open) for (const S of SLOTS_AKT) list.push(R.cubbies[S.id].hit);
    if (R.rocker2 && schule) list.push(R.rocker2.hit);
    if (H.leben) {
      for (const S of H.leben.bett.seats) if (S.info) list.push(S.hit);
      for (const it of H.leben.regal.items) list.push(it.hit);
    }
    if (H.deko) list.push(...H.deko.hits);
    for (const m of list) m.updateWorldMatrix(true, false);
    const hits = ray.intersectObjects(list, false);
    return hits.length ? hits[0].object.userData.hit : null;
  }
  const touchable = (id) => !!id && (/^(spiel:|klinke:|gast:|erfolg:|schublade$|schalter$|schule$|paket$|schrank$|radio$|topf$|zettel$)/.test(id) || (id.startsWith('tuer:') && (!H.open || H.screen === 'menu')));

  // ---------------- Türen ----------------
  function checkOpen() {
    if (H.open || !H.doors.length || !H.doors.every((d) => d.target === 1)) return;
    H.open = true;
  }
  function openAll() {
    if (!H.doors.length) { H.entered = true; H.wantOpen = true; return; }
    H.wantOpen = false; if (H.open) return;
    for (const d of H.doors) d.target = 1;
    checkOpen(); ton.knarz(1);
  }
  function doorSpan(d) {
    const a = toScreen(d.side * 1.0, 1.21, 0.62); const ax = a.x;
    const b = toScreen(d.side * 1.0 - d.side * d.w, 1.21, 0.62);
    return Math.max(120, Math.abs(ax - b.x) * 0.95);
  }
  function grab(d, e) {
    H.drag = { d, x: e.clientX, y: e.clientY, from: d.a, span: doorSpan(d), far: 0, back: 0, id: e.pointerId };
    d.v = 0; H.wrong = 0;
    try { gl.setPointerCapture(e.pointerId); } catch (err) { /* Zeiger schon weg */ }
    ton.klinke();
  }
  function pull(e) {
    const D = H.drag; const out = (e.clientX - D.x) * D.d.side; const down = Math.max(0, e.clientY - D.y);
    D.far = Math.max(D.far, Math.hypot(e.clientX - D.x, e.clientY - D.y)); D.back = Math.max(D.back, -out);
    const a = clamp(D.from + (out + down * 0.4) / D.span, 0, 1);
    if (Math.abs(a - D.d.last) > 0.075) { ton.knarz(Math.abs(a - D.d.last) * 6); D.d.last = a; }
    D.d.a = a;
  }
  function release() {
    const D = H.drag; if (!D) return;
    H.drag = null; const d = D.d;
    try { gl.releasePointerCapture(D.id); } catch (err) { /* schon frei */ }
    d.target = d.a >= 0.5 ? 1 : 0;
    if (d.target) { d.v = Math.max(d.v, 0.8); ton.knarz(0.8); } else {
      if (D.far < 8) { d.v = 0.55; H.wrong = 1; } else if (D.back > 24 && d.a < 0.1) H.wrong = d.side < 0 ? 2 : 3;
      H.hintT = 99;
    }
    checkOpen();
  }
  function applyDoors() { for (const d of H.doors) d.pivot.rotation.y = d.side * d.max * d.a * (1 - H.zu); } // zu: beim Gestalten klappen die Türen weg
  function stepDoors(dt) {
    let moving = false;
    for (const d of H.doors) {
      if (H.drag && H.drag.d === d) { moving = true; continue; }
      if (d.a === d.target && d.v === 0) continue;
      moving = true;
      if (calm()) { d.a = d.target; d.v = 0; continue; }
      let left = Math.min(dt, 0.1);
      while (left > 0) {
        const h = Math.min(left, 1 / 120); left -= h;
        d.v += ((d.target - d.a) * 30 - d.v * 6.5) * h; d.a += d.v * h;
        if (d.a > 1) { d.a = 1; if (d.v > 0.2) { if (!d.bumped) ton.anschlag(Math.min(1, d.v)); d.bumped = true; d.v *= -0.22; } else d.v = 0; }
        if (d.a < 0) { d.a = 0; if (d.v < -0.2) { if (!d.bumped) ton.anschlag(0.7); d.bumped = true; d.v *= -0.22; } else d.v = 0; }
      }
      if (Math.abs(d.target - d.a) < 0.002 && Math.abs(d.v) < 0.03) { d.a = d.target; d.v = 0; d.bumped = false; }
    }
    applyDoors();
    return moving;
  }

  // ---------------- Anfassen ----------------
  function choose(id) {
    if (H.busy || !TILE[id]) return;
    audio.init();
    if (id === 'rv') { ton.paket(); H.said = H.t; H.sel = 'spiel:rv'; $(TILE.rv).click(); return; } // startet nur Steam, die Kamera bleibt
    ton.nimm();
    H.busy = { id, t: 0 }; H.focus = id;
  }
  function act(id) {
    if (!id || H.busy || H.quitting) return;
    audio.init();
    if (id.startsWith('spiel:')) { choose(id.slice(6)); return; }
    if (id.startsWith('gast:')) { const l = H.gaeste[Number(id.slice(5))]; if (l) { ton.nimm(); actions.joinLobby(l.mode); } return; }
    if (id.startsWith('erfolg:')) { ton.klinke(); H.sel = id; return; } // zeigt nur, wofür es das gibt
    if (id === 'radio') { ton.schalter(); setWahl({ ...H.wahl, radio: naechsterSender(H.wahl.radio) }); H.sel = id; return; }
    if (id === 'topf') { ton.nimm(); if (H.screen !== 'menu') showScreen('menu'); oeffneTafel('gestalten'); return; }
    if (id === 'zettel') { ton.paket(); oeffneTafel('neues'); return; }
    if (id === 'schublade') { ton.schublade(); H.busy = { drawer: true, t: 0, back: H.screen }; return; }
    if (id === 'schalter') { ton.schalter(); H.quitting = { t: 0, sent: false }; return; }
    if (id === 'schule') { if (!schule || H.wechsel) return; ton.schalter(); H.wechsel = { t: 0, done: false }; return; } // Licht aus, Schrank umräumen, Licht an
    if (id === 'paket') {
      ton.paket();
      if (H.screen !== 'menu') showScreen('menu');
      body.classList.add('upopen');
      const go = $('upGo'); if (go && !go.classList.contains('hidden')) go.focus();
      return;
    }
    if (id === 'schrank' || id.startsWith('tuer:') || id.startsWith('klinke:')) {
      if (!H.open) openAll(); else if (H.screen === 'menu') showScreen('gallery');
    }
  }
  function live() { return H.stage === 'ready' && G.mode === 'menu' && HANDS_ON.has(G.screen) && !H.quitting && !H.wechsel && !tafeln.art; }
  gl.addEventListener('pointerdown', (e) => {
    if (!live() || e.button !== 0) return;
    audio.init();
    H.px = e.clientX; H.py = e.clientY; H.over = true; H.sel = null;
    if (H.busy) return;
    const id = pick(e.clientX, e.clientY);
    if (!id) { body.classList.remove('upopen'); return; }
    if (id.startsWith('klinke:')) { grab(H.doors[id.endsWith('L') ? 0 : 1], e); return; }
    if (id.startsWith('tuer:') && !H.open) { H.wrong = 1; H.hintT = 99; ton.klinke(); return; } // nicht am Holz, an der Klinke
    act(id);
  });
  window.addEventListener('pointermove', (e) => {
    if (e.clientX !== H.px || e.clientY !== H.py) H.sel = null;
    H.px = e.clientX; H.py = e.clientY; H.moved = true; H.over = e.target === gl;
    if (H.drag) pull(e);
  });
  window.addEventListener('pointerup', (e) => { if (H.drag) { pull(e); release(); } });
  window.addEventListener('pointercancel', release);
  window.addEventListener('blur', release);
  document.documentElement.addEventListener('mouseleave', () => { H.over = false; });

  function keyList() {
    if (H.screen === 'gallery') return [...SLOTS_AKT.map((s) => ({ id: 'spiel:' + s.id, row: s.row, x: s.x })), { id: 'schublade', row: 4, x: 0 }];
    const list = [{ id: 'schalter', row: 0, x: -2 }, { id: 'schrank', row: 0, x: 0 }, { id: 'schublade', row: 1, x: 0 }];
    if (schule) list.push({ id: 'schule', row: 0, x: SCHULE_X });
    if (H.update) list.push({ id: 'paket', row: 1, x: 1.2 });
    if (H.deko) list.push({ id: 'zettel', row: 0, x: 0.36 }, { id: 'radio', row: 0, x: 2.13 }, { id: 'topf', row: 1, x: 2.12 });
    if (H.leben) {
      H.leben.regal.items.forEach((it, i) => list.push({ id: 'erfolg:' + i, row: -1, x: it.x }));
      H.leben.bett.seats.forEach((S, i) => { if (S.info) list.push({ id: 'gast:' + i, row: 1, x: S.x }); });
    }
    return list;
  }
  function key(code, repeat) {
    if (!live()) return false;
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'SELECT')) return false;
    const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[code];
    if (!arrow && code !== 'Enter') return false;
    if (code === 'Enter' && a && a.tagName === 'BUTTON' && a.offsetParent !== null) return false; // ein sichtbarer Knopf löst selbst aus
    if (H.busy || H.drag) return true;
    const list = keyList(); const home = H.screen === 'gallery' ? (H.schule ? 'spiel:stapel' : 'spiel:ludwig') : 'schrank';
    let cur = list.find((q) => q.id === (H.sel || H.hover));
    if (code === 'Enter') { if (repeat) return true; if (cur) act(cur.id); else if (H.screen === 'menu') act('schrank'); else H.sel = home; return true; }
    if (a && a.tagName === 'BUTTON') a.blur();
    if (!cur) { H.sel = home; return true; }
    const [dx, dy] = arrow; let next = null;
    if (dx) {
      const row = list.filter((q) => q.row === cur.row).sort((p, q) => p.x - q.x);
      next = row[clamp(row.indexOf(cur) + dx, 0, row.length - 1)];
    } else {
      const row = list.filter((q) => q.row === cur.row + dy);
      next = row.sort((p, q) => Math.abs(p.x - cur.x) - Math.abs(q.x - cur.x))[0];
    }
    if (next) cur = next;
    H.sel = cur.id; return true;
  }

  // ---------------- Bildschirmwechsel ----------------
  function onScreen(name) {
    if (H.stage === 'failed') return;
    const prev = H.screen; H.screen = name;
    if (name === 'settings') { if (prev !== 'settings') H.fromFocus = prev === 'start' || prev === 'lobby'; } else if (name === 'start' || name === 'lobby' || name === 'join') {
      const id = focusMode(name); H.focus = id && SLOT[id] ? id : null;
    }
    if (name !== prev) {
      tafeln.schliessen();
      release(); H.hover = null; H.sel = null; H.wrong = 0;
      if (H.busy) H.busy = null; // Esc mitten in der Kamerafahrt
      if (name !== 'menu') body.classList.remove('upopen');
      const a = document.activeElement; if (HANDS_ON.has(name) && a && a.tagName === 'BUTTON') a.blur();
    }
    if (name === 'gallery') { H.entered = true; openAll(); }
    if (name === 'start' || name === 'lobby' || (name === 'join' && H.focus)) { H.entered = true; openAll(); }
    if (HANDS_ON.has(name)) H.standDue = true;
  }

  // ---------------- Update-Paket ----------------
  {
    const banner = $('upBanner');
    const sync = () => { H.update = !banner.classList.contains('hidden'); if (!H.update) body.classList.remove('upopen'); };
    new MutationObserver(sync).observe(banner, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  // ---------------- Kärtchen und Hinweis ----------------
  const put = (node, text) => { if (node.textContent !== text) node.textContent = text; node.classList.toggle('hidden', !text); };
  function drawCard() {
    if (H.busy || H.drag) { card.classList.add('hidden'); return; }
    if (H.hover && /^(gast:|erfolg:|radio$|topf$|zettel$|schule$)/.test(H.hover)) { drawExtra(H.hover); return; }
    const said = H.t - H.said < 4 && H.said > 0 && HANDS_ON.has(G.screen);
    const shown = H.hover && H.hover.startsWith('spiel:') ? H.hover.slice(6) : said ? 'rv' : null;
    if (!shown) { card.classList.add('hidden'); return; }
    const S = SLOT[shown]; const plate = $(TILE[shown]).querySelector('.gplate');
    const b = plate && plate.querySelector('b'); const small = plate && plate.querySelector('small'); const st = H.stand[shown];
    put(cardName, b ? b.textContent.replace(/­/g, '') : '');
    put(cardLine, st && st.line ? st.line : '');
    put(cardText, small ? small.textContent : shown === 'rv' ? 'Startet über Steam.' : '');
    put(cardGold, st && st.gold ? 'Durchgespielt!' : '');
    const L = H.lobbies[shown];
    put(cardLive, L && L.length ? L.slice(0, 2).map((l) => `Lobby offen: ${l.hostName}, ${l.count} von ${l.limit || 3}`).join('. ') : '');
    card.classList.remove('hidden');
    const left = S.x > 0.05; const y = S.y + S.h * 0.5;
    const p = toScreen(S.x + (left ? -1 : 1) * (S.w / 2 + 0.015), y, FRONT);
    placeCard(p, left);
  }
  function placeCard(p, left) {
    const w = card.offsetWidth; const h = card.offsetHeight;
    card.style.left = `${clamp(left ? p.x - w : p.x, 10, Math.max(10, window.innerWidth - w - 10))}px`;
    card.style.top = `${clamp(p.y - h / 2, 10, Math.max(10, window.innerHeight - h - 10))}px`;
  }
  function drawExtra(id) { // Besuch auf dem Bett, Andenken im Regal
    const [kind, n] = id.split(':'); const i = Number(n);
    let p; let left = false;
    if (id === 'schule') {
      put(cardGold, ''); put(cardLive, '');
      put(cardName, H.schule ? 'Zurück' : 'Schulmodus');
      put(cardLine, H.schule ? 'Wieder alle Spiele' : 'Stumm, leichte Grafik, Schul-Spiele');
      put(cardText, H.schule ? 'Klick: Der normale Schrank kommt zurück.' : 'Klick: Der Schrank wird umgeräumt. Taste N schließt Theos sofort.');
      card.classList.remove('hidden'); placeCard(toScreen(SCHULE_X + 0.12, 1.4, 0.12), false);
      return;
    }
    if (id === 'radio' || id === 'topf' || id === 'zettel') {
      if (!H.deko) { card.classList.add('hidden'); return; }
      put(cardGold, ''); put(cardLive, '');
      if (id === 'radio') {
        put(cardName, 'Radio');
        put(cardLine, H.wahl.radio === 'aus' ? 'Musik ist aus' : `Läuft: ${RADIO.find((r) => r.id === H.wahl.radio).name}`);
        put(cardText, 'Klick: nächster Sender.');
        p = toScreen(1.94, 0.92, 0.6); left = true;
      } else if (id === 'topf') {
        put(cardName, 'Zimmer gestalten');
        put(cardLine, `${pokale(H.stufen).n} von ${MAX_POKALE} Pokalen`);
        put(cardText, 'Poster, Neonfarben und Deko gibt es für Pokale.');
        p = toScreen(1.96, 0.25, 0.95); left = true;
      } else {
        put(cardName, 'Was ist neu?');
        put(cardLine, NEUIGKEITEN[0].titel);
        put(cardText, 'Klick, dann liest du es.');
        const z = H.deko.zettel.g; z.updateWorldMatrix(true, false); const w = z.localToWorld(V3(0.2, -0.12, 0)); p = toScreen(w.x, w.y, w.z);
      }
      card.classList.remove('hidden');
      placeCard(p, left);
      return;
    }
    if (!H.leben) { card.classList.add('hidden'); return; }
    if (kind === 'gast') {
      const l = H.gaeste[i]; if (!l) { card.classList.add('hidden'); return; }
      const b = $(TILE[l.mode]).querySelector('.gplate b'); const full = !!l.limit && l.count >= l.limit;
      put(cardName, String(l.hostName || 'Host'));
      put(cardLine, b ? b.textContent.replace(/­/g, '') : 'Das Spiel mit dem Hund');
      put(cardText, `${l.count} von ${l.limit || 3} Spielern. ${full ? 'Die Lobby ist voll.' : 'Klick, dann Beitreten.'}`);
      put(cardGold, '');
      put(cardLive, l.inGame ? 'Spielt schon' : 'Lobby offen');
      p = toScreen(SITZE[i] + 0.2, 0.72, 0.9);
    } else {
      const it = H.leben.regal.items[i]; const E = it.E; left = it.x > 0;
      put(cardName, E.name);
      put(cardLine, ['Noch leer', 'Silber', ''][it.stufe]);
      put(cardText, it.stufe === 2 ? `Geschafft: ${E.gold}.` : it.stufe === 1 ? `Für Gold: ${E.gold}.` : `${E.silber ? `Silber: ${E.silber}. ` : ''}Gold: ${E.gold}.`);
      put(cardGold, it.stufe === 2 ? 'Gold!' : '');
      put(cardLive, '');
      p = toScreen(it.x + (left ? -0.14 : 0.14), 2.52, 0.2);
    }
    card.classList.remove('hidden');
    placeCard(p, left);
  }
  function drawHint(dt) {
    H.hintT += dt;
    const on = H.screen === 'menu' && !H.open && !H.drag && !H.quitting && !tafeln.art && H.hintT > 0.8 && !body.classList.contains('upopen');
    hint.classList.toggle('hidden', !on);
    if (!on) return;
    const one = H.doors.some((d) => d.target === 1);
    let text = one ? 'Jetzt die andere Tür.' : 'Klinke gedrückt halten und zur Seite aufziehen.';
    if (H.wrong === 1) text = 'An der Klinke gedrückt halten und ziehen.';
    if (H.wrong === 2) text = 'Die linke Tür geht nach links auf.';
    if (H.wrong === 3) text = 'Die rechte Tür geht nach rechts auf.';
    put(hint, text);
    const p = toScreen(-0.05, 0.78, 0.64);
    hint.style.left = `${p.x}px`; hint.style.top = `${p.y}px`;
  }
  function setCursor(c) { if (c === H.cursor) return; H.cursor = c; gl.style.cursor = c; }

  // ---------------- Bild ----------------
  function leave() {
    if (!H.awake) return;
    H.awake = false; release(); music.stop();
    card.classList.add('hidden'); hint.classList.add('hidden');
    if (H.cursor !== null) { if (gl.style.cursor === H.cursor) gl.style.cursor = 'default'; H.cursor = null; }
    if (H.dpr !== null && renderer.getPixelRatio() === H.dpr) resize(); // nur, wenn das Spiel die Auflösung nicht schon selbst gesetzt hat
    H.dpr = null;
    const l = H.room && H.room.shadowLight; if (l && l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } // beim Spielen braucht die Grafikkarte den Platz
  }
  function afterBusy(dt) {
    const B = H.busy; if (!B) return;
    B.t += dt;
    if (B.id && B.t >= (calm() ? 0.05 : 0.64)) { H.busy = null; $(TILE[B.id]).click(); }
    else if (B.drawer && B.t >= (calm() ? 0.02 : 0.32)) { H.busy = null; actions.openSettings(B.back); }
  }
  function animate(dt) {
    const R = H.room; const still = calm(); const k = still ? 1 : 1 - Math.exp(-dt * 12);
    let moving = stepDoors(dt);
    const zuSoll = tafeln.art === 'gestalten' ? 1 : 0;
    if (H.zu !== zuSoll) { H.zu = Math.abs(zuSoll - H.zu) < 0.003 ? zuSoll : H.zu + (zuSoll - H.zu) * k; applyDoors(); moving = true; }

    for (const S of SLOTS_AKT) {
      const it = H.items[S.id]; const C = R.cubbies[S.id];
      const on = H.hover === 'spiel:' + S.id || (!!H.busy && H.busy.id === S.id);
      const to = on ? 1 : 0; if (Math.abs(to - it.k) > 0.002) { it.k += (to - it.k) * k; moving = true; } else it.k = to;
      const open = !!(H.lobbies[S.id] && H.lobbies[S.id].length);
      const blink = open ? (still ? 0.8 : 0.5 + 0.5 * Math.sin(H.t * 5.5)) : 0;
      it.group.position.set(S.x, S.y + 0.012 * it.k + (open && !still ? blink * 0.012 : 0), 0.31 + 0.12 * it.k); it.group.scale.setScalar(1 + 0.08 * it.k);
      C.backM.color.copy(C.col3).multiplyScalar(0.34 + it.k * 0.45 + blink * 1.1);
      C.stripM.color.copy(C.col3).multiplyScalar(1.2 + it.k * 1.2 + blink * 2);
      C.ring.visible = open; C.ring.material.opacity = blink * 0.5;
      if (C.tagM) C.tagM.emissive.setHex(on || open ? 0x8a6228 : 0x3a3020);
      if (H.open || H.doors.some((d) => d.a > 0.01)) it.update(H.t, on, still);
    }

    const pulled = H.screen === 'settings' && !H.fromFocus;
    const dz = pulled || (H.busy && H.busy.drawer) ? 0.3 : H.hover === 'schublade' ? 0.05 : 0;
    if (Math.abs(dz - H.drawer) > 0.0005) { H.drawer += (dz - H.drawer) * k; moving = true; } else H.drawer = dz;
    R.drawer.group.position.z = H.drawer;

    if (H.leben) H.leben.update(H.t, actions.now(), H.hover, still);
    if (H.deko) H.deko.update(H.t, H.hover, still);
    R.rocker.group.rotation.x = H.quitting ? 0.22 : H.hover === 'schalter' ? -0.06 : -0.2;
    if (R.rocker2) R.rocker2.group.rotation.x = (H.schule !== !!H.wechsel ? 1 : -1) * (H.hover === 'schule' ? 0.06 : 0.2);

    const P = R.parcel; if (P.group.visible !== H.update) { P.group.visible = H.update; moving = true; }
    if (H.update) {
      const phase = H.t % 2.4; const strong = H.hover === 'paket';
      const burst = still ? 0 : strong ? 1 : phase < 0.8 ? Math.sin(phase / 0.8 * Math.PI) : 0;
      P.box.rotation.z = Math.sin(H.t * 24) * 0.075 * burst; P.box.position.y = Math.abs(Math.sin(H.t * 12)) * 0.035 * burst;
      P.glow.material.opacity = 0.22 + burst * 0.3; if (burst) moving = true;
    }

    for (const d of H.doors) {
      const hot = H.hover === (d.side < 0 ? 'klinke:L' : 'klinke:R') || (H.hover === 'schrank' && !H.open) || (!!H.drag && H.drag.d === d);
      const pulse = still ? 0.45 : 0.35 + 0.2 * Math.sin(H.t * 2.6);
      d.glow.visible = d.target < 1; d.glow.material.opacity = clamp(1 - d.a * 4, 0, 1) * (hot ? 0.9 : pulse);
    }

    if (H.wechsel) H.power = Math.max(0, 1 - H.wechsel.t / 0.3); // Schulmodus: kurz Licht aus, dann wird umgeräumt
    else if (H.quitting) {
      const Q = H.quitting; Q.t += dt; H.power = Math.max(0, 1 - Q.t / 0.6);
      if (!Q.sent && Q.t > 0.9) { Q.sent = true; actions.quit(); }
      if (Q.t > 4) H.quitting = null; // Fenster blieb offen: Licht wieder an
    } else if (H.power < 1) H.power = Math.min(1, H.power + dt / (still ? 0.01 : 0.8)); // beim Start geht das Licht an
    const open = H.doors.map((d) => d.a * (1 - H.zu));
    R.light(H.t, { power: H.power, open: Math.max(...open), both: Math.min(...open) }, still);
    return moving;
  }
  function render(real, dt, moving) {
    // schwache Grafikkarte: nach drei zähen Sekunden die Auflösung senken
    if (H.age > 2 && document.hasFocus()) {
      H.slow = dt > 1 / 38 ? H.slow + real : Math.max(0, H.slow - real * 2);
      if (H.slow > 3 && H.scale > 0.6) { H.scale = Math.max(0.6, H.scale - 0.2); H.slow = 0; }
    }
    const dpr = (getQuality() === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)) * H.scale;
    renderer.getSize(size);
    if (renderer.getPixelRatio() !== dpr || size.x !== window.innerWidth || size.y !== window.innerHeight) { renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false); }
    H.dpr = dpr;
    const L = H.room.shadowLight; const shadows = !!settings.shadows && !H.schule;
    if (L.castShadow !== shadows) { L.castShadow = shadows; moving = true; }
    H.shadowT += real;
    if (shadows && (moving || !L.shadow.map || H.shadowT > 0.066)) { renderer.shadowMap.needsUpdate = true; H.shadowT = 0; }
    const tone = renderer.toneMapping; const exposure = renderer.toneMappingExposure;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = EXPOSURE * Math.max(0.03, H.power); // Licht aus: auch Fächer und Bildschirm gehen aus
    try { renderer.setRenderTarget(null); renderer.render(H.room.scene, cam); } finally { renderer.toneMapping = tone; renderer.toneMappingExposure = exposure; }
  }
  // Rückgabe false: das Zimmer geht nicht, main.js zeigt die alte Rennwelt hinter der Liste
  function frame(dt) {
    if (H.stage === 'failed') return false;
    if (H.stage !== 'ready') { if (LIVE.has(G.screen)) buildStep(); return H.stage !== 'failed'; }
    if (!LIVE.has(G.screen)) { leave(); return true; }
    try {
      const real = clamp(dt, 0, 0.05);
      if (!H.awake) { H.awake = true; H.slow = 0; H.age = 0; renderer.shadowMap.needsUpdate = true; }
      H.t += real; H.age += real;
      if (H.wantOpen) openAll();
      if (H.standDue) refresh();
      afterBusy(dt);
      if (G.mode !== 'menu' || !LIVE.has(G.screen)) return true; // der Klick hat ein Spiel gestartet
      if (H.wechsel) { H.wechsel.t += real; if (!H.wechsel.done && H.wechsel.t > 0.38) { H.wechsel.done = true; actions.schule(!H.schule); if (H.stage !== 'ready') return true; } }
      moveCamera(real);

      const hands = HANDS_ON.has(H.screen) && !H.busy && !H.quitting && !tafeln.art;
      let hover = null;
      if (hands && !H.drag) {
        if (H.sel) hover = H.sel;
        else if (H.over && H.moved && (H.tween >= 0.75 || calm())) { const id = pick(H.px, H.py); if (touchable(id)) hover = id; }
      }
      H.hover = hover;
      setCursor(H.drag ? 'grabbing' : hover && hover.startsWith('klinke:') ? 'grab' : hover && !hover.startsWith('erfolg:') && !(hover.startsWith('tuer:') && !H.open) ? 'pointer' : 'default');

      const moving = animate(real);
      if (H.open && !H.entered && H.screen === 'menu' && H.doors.every((d) => d.a > 0.8)) { H.entered = true; showScreen('gallery'); } // beide Türen offen: rein in den Schrank
      drawCard(); drawHint(real);
      if (audio.ctx) music.play(H.schule ? 'aus' : H.wahl.radio); // Radio: 'aus' ist keine Musik, dann schweigt es. Im Schulmodus läuft nie Musik
      maybeScan();
      render(real, dt, moving);
    } catch (e) { fail(e); return false; }
    return true;
  }

  // ---------------- Schulmodus: Schrank umräumen ----------------
  function wegraeumen(root) { // Grafikspeicher des alten Zimmers freigeben (geteilte Formen lädt three.js bei Bedarf neu)
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { for (const k of ['map', 'emissiveMap', 'alphaMap', 'roughnessMap', 'normalMap']) if (m[k]) m[k].dispose(); m.dispose(); }
    });
  }
  function umbauen(an) {
    an = !!an; H.wechsel = null;
    if (an === H.schule) { H.standDue = true; return; }
    H.schule = an;
    if (H.stage === 'failed') { setzeFaecher(an); return; }
    tafeln.schliessen(); release();
    if (H.room) { H.tueren = H.doors.map((d) => d.target); try { wegraeumen(H.room.scene); } catch (e) { console.warn('[schrank] Aufräumen', e); } }
    const l = H.room && H.room.shadowLight; if (l && l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; }
    H.room = null; H.items = {}; H.leben = null; H.deko = null; H.doors = []; H.steps = null; H.stage = 'build';
    H.hover = null; H.sel = null; H.busy = null; H.key = ''; H.cam = null; H.power = 0; H.standDue = true; H.slow = 0;
    card.classList.add('hidden'); hint.classList.add('hidden');
  }

  // Bildschirmpunkte für die automatische Prüfung
  function point(id) {
    if (!H.room || !H.cam) return null;
    const [kind, rest] = id.split(':');
    if (kind === 'klinke') { const d = H.doors[rest === 'L' ? 0 : 1]; const p = d.grip.clone(); d.pivot.updateWorldMatrix(true, false); d.pivot.localToWorld(p); return toScreen(p.x, p.y, p.z); }
    if (kind === 'spiel') { const S = SLOT[rest]; return toScreen(S.x, S.y + S.h * 0.5, 0.57); }
    if (kind === 'schublade') return toScreen(0.2, 0.2, 0.66 + H.drawer);
    if (kind === 'schalter') return toScreen(BEENDEN_X, 1.3, 0.12);
    if (kind === 'schule') return toScreen(SCHULE_X, 1.3, 0.12);
    if (kind === 'paket') return toScreen(1.2, 0.2, 1.24);
    if (kind === 'gast') return toScreen(SITZE[Number(rest)], 0.75, 0.9);
    if (kind === 'erfolg' && H.leben) return toScreen(H.leben.regal.items[Number(rest)].x, 2.52, 0.22);
    if (kind === 'radio') return toScreen(2.135, 0.86, 0.58);
    if (kind === 'topf') return toScreen(2.12, 0.14, 0.98);
    if (kind === 'zettel' && H.deko) { const z = H.deko.zettel.g; z.updateWorldMatrix(true, false); const w = z.localToWorld(V3(0.02, -0.08, 0.02)); return toScreen(w.x, w.y, w.z); }
    return null;
  }

  return {
    frame, leave, onScreen, key, act, openAll, refresh, point, setLobbies, actions, music, state: H, setWahl, oeffneTafel, tafeln, umbauen,
    get schule() { return H.schule; }, get slots() { return SLOTS_AKT; },
    get failed() { return H.stage === 'failed'; },
    get ready() { return H.stage === 'ready'; },
  };
}
