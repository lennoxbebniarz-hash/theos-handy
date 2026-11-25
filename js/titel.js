// Theos Seitenscheidel - große Startbildschirme (seit 2026-11-22) für Ludwig Zigaretti, Strom, Ozean und Big Bruno: lebende 3D-Szene, Schriftzug,
// links Weiterspielen, Neuer Spielstand, Spielstände, Mehrspieler, Einstellungen, Zurück.
// Aufbau: titelkit.js (Bausteine), titelfigur.js (Freunde), je Spiel titel<spiel>.js (Szene), titelmusik.js, titel.css.
// Wichtig: stop() stellt den Renderer zurück und muss laufen, BEVOR ein Spiel seine eigene Tonwertkurve setzt (Einzelspieler: play, Lobby: onLaunch in mp.js).
import * as THREE from './vendor/three.module.min.js';
import { V3, VIEW_H, clamp } from './titelkit.js';
import { createTitelMusik } from './titelmusik.js';
import { createBirthdayCard } from './ludwigcard.js';
import { buildTitel as buildLudwig } from './titelludwig.js';
import { buildTitel as buildStrom } from './titelstrom.js';
import { buildTitel as buildOzean } from './titelozean.js';
import { buildTitel as buildBruno } from './titelbruno.js';
import { euro as euroLudwig } from './ludwiglogic.js';
import { euro as euroStrom } from './stromlogic.js';
import { euro as euroOzean } from './ozeanlogic.js';
import { cr } from './brunologic.js';

export const TITEL = {
  ludwig: {
    build: buildLudwig, logo: ['Ludwig', 'Zigaretti'], name: 'Ludwig Zigaretti',
    slogan: 'Zockverbot? Dann wird Ludwig eben Zigarettenboss.',
    fresh: (n) => (n ? `Ludwigs Zimmer ${n + 1}` : 'Ludwigs Zimmer'),
    info: (m, saves) => { const S = saves.load(m.id); return `${euroLudwig(S.geld)}, ${S.stats.gedreht.toLocaleString('de-DE')} Kippen`; },
  },
  strom: {
    build: buildStrom, logo: ['Strom aus', 'wegen Brunos Geschirrspüler'], name: 'Strom aus wegen Brunos Geschirrspüler',
    slogan: 'Die ganze Stadt ist dunkel. Nur einer grinst.',
    fresh: (n) => `Halle ${n + 7}`,
    info: (m) => `Tag ${m.day || 1}, Level ${m.level || 1}, ${euroStrom(m.purse || 0)}`,
  },
  ozean: {
    build: buildOzean, logo: ['Trockne', 'den Ozean', 'aus'], name: 'Trockne den Ozean aus',
    slogan: 'Theos Handy liegt im Pazifik. Also muss der Pazifik weg.',
    fresh: (n) => (n ? `Ozean ${n + 1}` : 'Mein Ozean'),
    info: (m) => `Tag ${m.day || 1}, Stufe ${m.level || 1}, ${euroOzean((m.purse || 0) / 100)}`,
  },
  bruno: {
    build: buildBruno, logo: ['Big Bruno', 'kommt auf die Erde'], name: 'Big Bruno kommt auf die Erde',
    slogan: 'Noch 90 Tage bis zum Einschlag. Ran an die Spitzhacken.',
    fresh: (n) => `Einsatz ${n + 1}`,
    info: (m) => `Tag ${Math.min(m.day || 1, 90)}, ${cr(m.purse || 0)}${m.over ? ', vorbei' : ''}`,
  },
};
export const hasTitel = (mode) => !!mode && Object.prototype.hasOwnProperty.call(TITEL, mode);

const SHIFT = 0.2; // Bildmitte der Szene liegt rechts bei 70 % der Breite, links stehen Schrift und Knöpfe
const FILL = { x: 0.56, y: 0.86 };

// games: je Spiel { saves, play(id), remove(id)?, active(), stop() }
export function createTitel({ renderer, audio, $, store, settings, G, showScreen, games, getQuality, onPlay, onMulti, onSettings, onBack }) {
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 900); const size = new THREE.Vector2(); const offs = V3(); const UP = V3(0, 1, 0); const side = V3();
  const music = createTitelMusik(audio);
  const bday = createBirthdayCard({ root: $('ttGeburtstag'), store, snd: null });
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const T = { on: false, mode: null, S: null, entry: null, ready: false, token: 0, view: 'main', scenes: new Map(), key: '', px: 0, py: 0, mx: 0, my: 0, tone: null, scale: 1, slow: 0, age: 0, power: 1 };
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  const sceneKey = () => `${settings.shadows ? 1 : 0}${getQuality() === 'low' ? 'L' : 'H'}`;

  function takeRenderer() {
    if (!T.tone) T.tone = { mapping: renderer.toneMapping, exposure: renderer.toneMappingExposure };
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
  }
  function giveRenderer() {
    if (!T.tone) return;
    renderer.toneMapping = T.tone.mapping; renderer.toneMappingExposure = T.tone.exposure; T.tone = null;
  }
  function freeShadows(S) { S.scene.traverse((o) => { if (o.isLight && o.shadow && o.shadow.map) { o.shadow.map.dispose(); o.shadow.map = null; } }); }
  function aim(S, t, w, h) {
    const V = S.view; const asp = w / Math.max(1, h); const d = V.pos.distanceTo(V.at);
    const tan = Math.max(V.h / 2 / d / FILL.y, V.w / 2 / d / (asp * FILL.x));
    cam.fov = 2 * Math.atan(tan) * 180 / Math.PI; cam.aspect = asp;
    const k = calm.matches ? 0 : 1;
    offs.subVectors(V.pos, V.at).applyAxisAngle(UP, (Math.sin(t * 0.16) * 0.022 + T.mx * 0.03) * k);
    offs.y += (Math.sin(t * 0.21) * 0.01 - T.my * 0.022) * d * k;
    if (S.shake && k) { side.set(Math.sin(t * 71), Math.sin(t * 93), 0); offs.addScaledVector(side, S.shake * 0.018); }
    cam.position.copy(V.at).add(offs); cam.lookAt(V.at);
    cam.setViewOffset(w, h, -SHIFT * w, 0, w, h); cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }

  async function load(mode) {
    const token = ++T.token; const key = sceneKey(); T.key = key; T.ready = false; T.S = null;
    $('ttCover').classList.remove('off');
    try {
      await nextPaint(); if (token !== T.token || !T.on) return;
      let e = T.scenes.get(mode);
      if (!e || e.key !== key) {
        if (e) freeShadows(e.S);
        const S = TITEL[mode].build({ renderer, shadows: !!settings.shadows, low: getQuality() === 'low' });
        e = { key, S, t: 0 };
        for (let i = 0; i < 50; i++) { e.t += 0.05; S.update(e.t, 0.05, calm.matches); } // Rauch und Tropfen sind schon unterwegs, wenn das Bild einblendet
        T.scenes.set(mode, e);
        renderer.toneMappingExposure = S.exposure; renderer.getSize(size); aim(S, e.t, size.x, size.y);
        try { await renderer.compileAsync(S.scene, cam); } catch (err) { /* ohne Vorab-Übersetzung geht es auch */ }
      }
      if (token !== T.token || !T.on) return;
      T.entry = e; T.S = e.S; T.ready = true; T.age = 0; T.slow = 0; T.scale = 1;
      requestAnimationFrame(() => requestAnimationFrame(() => { if (token === T.token && T.on) $('ttCover').classList.add('off'); }));
    } catch (err) {
      console.error('[titel] Szene ' + mode + ' fehlgeschlagen', err); // die Knöpfe gehen trotzdem, nur ohne Bild
    }
  }

  // ---------------- Schriftzug und Knöpfe ----------------
  function fill(mode) {
    const C = TITEL[mode]; $('titel').dataset.mode = mode; $('ttCover').dataset.mode = mode;
    const h = $('ttLogo'); h.textContent = ''; h.setAttribute('aria-label', C.name);
    C.logo.forEach((line) => { const s = el('span', '', line); s.setAttribute('aria-hidden', 'true'); h.append(s); });
    $('ttSlogan').textContent = C.slogan;
  }
  function lastSave() { const saves = games[T.mode].saves; const id = saves.last(); return (id && saves.get(id)) || saves.list()[0] || null; }
  function renderMain() {
    const saves = games[T.mode].saves; const m = lastSave();
    $('ttPlay').classList.toggle('hidden', !m); $('ttSaves').classList.toggle('hidden', !m);
    $('ttNew').classList.toggle('primary', !m);
    if (m) $('ttPlayInfo').textContent = `${m.name}: ${TITEL[T.mode].info(m, saves)}`;
  }
  function renderSaves() {
    const saves = games[T.mode].saves; const list = saves.list(); const box = $('ttSaveList'); box.textContent = '';
    for (const m of list) {
      const row = el('div', 'tt-save'); const text = el('div', 'tt-savetext');
      text.append(el('b', '', m.name), el('small', '', TITEL[T.mode].info(m, saves) + (m.players && m.players.length ? `, online mit ${m.players.join(', ')}` : '')));
      const go = el('button', 'tt-mini primary', 'Spielen'); go.type = 'button'; go.onclick = () => play(m.id);
      const del = el('button', 'tt-mini', 'Löschen'); del.type = 'button';
      del.onclick = () => {
        if (!del.dataset.sure) { del.dataset.sure = '1'; del.textContent = 'Wirklich?'; setTimeout(() => { delete del.dataset.sure; del.textContent = 'Löschen'; }, 3000); return; }
        if (games[T.mode].remove) games[T.mode].remove(m.id); else saves.remove(m.id);
        if (saves.list().length) renderSaves(); else show('main');
      };
      row.append(text, go, del); box.append(row);
    }
  }
  function show(view) {
    T.view = view;
    $('ttMain').classList.toggle('hidden', view !== 'main'); $('ttNewBox').classList.toggle('hidden', view !== 'new'); $('ttSavesBox').classList.toggle('hidden', view !== 'saves');
    if (view === 'main') renderMain();
    if (view === 'saves') renderSaves();
    if (view === 'new') { const i = $('ttName'); i.value = TITEL[T.mode].fresh(games[T.mode].saves.list().length); i.focus(); i.select(); } else if (document.activeElement === $('ttName')) $('ttName').blur();
  }
  function play(id) {
    const mode = T.mode; stop(); onPlay(mode); games[mode].play(id);
  }

  // ---------------- Öffnen und Schließen ----------------
  // nur Hintergrund (hinter Lobby oder Einstellungen)
  function background(mode) {
    if (!hasTitel(mode)) return false;
    for (const g of Object.values(games)) if (g.active()) g.stop();
    G.mode = 'titel'; $('hud').classList.add('hidden'); takeRenderer();
    if (T.on && T.mode === mode && T.ready && T.key === sceneKey()) return true;
    T.on = true; T.mode = mode; fill(mode); $('ttCover').classList.remove('hidden');
    music.play(mode); load(mode); return true;
  }
  function open(mode) {
    if (!hasTitel(mode)) return;
    audio.init();
    if (!background(mode)) return;
    music.play(mode); show('main'); showScreen('titel');
    if (mode === 'ludwig') bday.first();
  }
  function stop() {
    if (!T.on) return;
    T.on = false; T.token++; T.ready = false; T.S = null;
    music.stop(); giveRenderer(); cam.clearViewOffset();
    $('ttCover').classList.add('hidden'); $('titel').classList.add('hidden');
    if (bday.open) bday.hide(); // hält auch das Konfetti an
    if (T.entry) freeShadows(T.entry.S); // beim Spielen braucht die Grafikkarte den Platz
    if (G.mode === 'titel') G.mode = 'menu';
  }
  function back() {
    if (bday.open) { bday.hide(); return; }
    if (T.view !== 'main') { show('main'); return; }
    stop(); onBack();
  }

  $('ttPlay').onclick = () => { const m = lastSave(); if (m) play(m.id); };
  $('ttNew').onclick = () => show('new');
  $('ttNewBack').onclick = () => show('main');
  $('ttNewGo').onclick = () => play(games[T.mode].saves.create($('ttName').value.trim() || TITEL[T.mode].fresh(games[T.mode].saves.list().length)));
  $('ttName').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); $('ttNewGo').click(); } else if (e.key === 'Escape') { e.preventDefault(); show('main'); } });
  $('ttName').addEventListener('keyup', (e) => e.stopPropagation());
  $('ttSaves').onclick = () => show('saves');
  $('ttSavesBack').onclick = () => show('main');
  $('ttMulti').onclick = () => onMulti(T.mode);
  $('ttSettings').onclick = () => onSettings();
  $('ttBack').onclick = () => back();
  window.addEventListener('pointermove', (e) => { if (!T.on) return; T.px = e.clientX / Math.max(1, window.innerWidth) * 2 - 1; T.py = e.clientY / Math.max(1, window.innerHeight) * 2 - 1; });

  // ---------------- Bild ----------------
  function frame(dt) {
    if (!T.on || !T.ready || !T.S) return;
    if (sceneKey() !== T.key) { load(T.mode); return; } // Schatten oder Qualität in den Einstellungen geändert
    const real = clamp(dt, 0, 0.05); const S = T.S;
    // schwache Grafikkarte: nach drei Sekunden unter 38 Bildern pro Sekunde einmal die Auflösung senken. Im Hintergrund drosselt Windows die Bildrate, das zählt nicht
    T.age += real;
    if (T.age > 1.5 && document.hasFocus()) {
      T.slow = dt > 1 / 38 ? T.slow + real : Math.max(0, T.slow - real * 2);
      if (T.slow > 3 && T.scale > 0.6) { T.scale = Math.max(0.6, T.scale - 0.2); T.slow = 0; }
    }
    const dpr = (getQuality() === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)) * T.scale;
    if (renderer.getPixelRatio() !== dpr) { renderer.setPixelRatio(dpr); renderer.setSize(window.innerWidth, window.innerHeight, false); }
    renderer.getDrawingBufferSize(size); VIEW_H.value = size.y;
    const e = T.entry; e.t += real; S.update(e.t, real, calm.matches);
    const k = 1 - Math.exp(-real * 2.5); T.mx += (T.px - T.mx) * k; T.my += (T.py - T.my) * k;
    aim(S, e.t, window.innerWidth, Math.max(1, window.innerHeight));
    const power = S.power === undefined ? 1 : Math.round(S.power * 20) / 20; // die Schrift flackert mit dem Licht
    if (power !== T.power) { T.power = power; $('ttLogo').style.setProperty('--tt-power', String(power)); }
    renderer.toneMappingExposure = S.exposure;
    renderer.shadowMap.needsUpdate = !!settings.shadows;
    renderer.setRenderTarget(null); renderer.render(S.scene, cam);
  }

  return { open, background, stop, back, frame, show, bday, music, state: T, get on() { return T.on; }, get mode() { return T.mode; } };
}
