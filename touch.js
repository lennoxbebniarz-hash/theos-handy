// Theos Seitenscheidel - Touch-Steuerung für die Webseite (2026-11-25): das ganze PC-Spiel auf dem Handy.
// Läuft VOR dem Spiel (normales Skript, kein Modul) und baut nach, was das Handy nicht hat:
// - „Maus fangen“ (Pointer Lock): Die Spiele fragen document.pointerLockElement ab. Hier wird das gespielt, Wischen auf dem Bild ist dann die Maus.
// - Tastatur: Joystick links = W A S D, Knöpfe rechts = E, F, Leertaste, Shift, Klick, Esc; „⌨“ klappt alle übrigen Tasten auf.
// Die Spiele selbst wissen davon nichts, sie bekommen ganz normale Tasten- und Maus-Ereignisse.
(() => {
  const q = new URLSearchParams(location.search);
  const touch = q.has('touch') || (!q.has('maus') && (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0));
  // Offline: jede geladene Datei wird gemerkt (nur auf der echten Webseite)
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (!touch) return; // Browser am PC: normale Maus und Tastatur
  document.documentElement.classList.add('tt-touch');

  // ---------------- Maus fangen nachbauen ----------------
  let locked = null; let manual = false;
  const lockChanged = () => { document.dispatchEvent(new Event('pointerlockchange')); show(); };
  Object.defineProperty(Document.prototype, 'pointerLockElement', { configurable: true, get() { return locked; } });
  Element.prototype.requestPointerLock = function () { if (locked !== this) { locked = this; setTimeout(lockChanged); } return Promise.resolve(); };
  Document.prototype.exitPointerLock = function () { if (locked) { locked = null; setTimeout(lockChanged); } };

  // ---------------- Tasten ----------------
  const KEY = (code) => (/^Key/.test(code) ? code.slice(3).toLowerCase() : /^Digit/.test(code) ? code.slice(5) : code === 'Space' ? ' ' : /^Shift/.test(code) ? 'Shift' : /^Control/.test(code) ? 'Control' : code);
  const ziel = () => { const a = document.activeElement; return a && a !== document.body && !/INPUT|TEXTAREA|SELECT/.test(a.tagName) ? a : document.body; };
  const held = new Set();
  function key(type, code) {
    if (type === 'keydown') { if (held.has(code)) return; held.add(code); } else { if (!held.has(code)) return; held.delete(code); }
    ziel().dispatchEvent(new KeyboardEvent(type, { code, key: KEY(code), bubbles: true, cancelable: true }));
  }
  const tap = (code) => { key('keydown', code); setTimeout(() => key('keyup', code), 90); };
  function maus(type, button = 0) {
    const el = locked || document.getElementById('gl') || document.body; const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2; const y = r.top + r.height / 2; const buttons = type === 'mouseup' ? 0 : button === 2 ? 2 : 1;
    const P = { bubbles: true, cancelable: true, clientX: x, clientY: y, button, buttons, pointerType: 'mouse', isPrimary: true, pointerId: 1 };
    if (type === 'mousedown') el.dispatchEvent(new PointerEvent('pointerdown', P)); if (type === 'mouseup') el.dispatchEvent(new PointerEvent('pointerup', P));
    el.dispatchEvent(new MouseEvent(type, P)); if (type === 'mouseup' && button === 0) el.dispatchEvent(new MouseEvent('click', P));
  }
  // Esc: am PC löst Esc zuerst die gefangene Maus (das Spiel macht dann Pause), sonst geht die Taste ans Spiel
  const esc = () => { if (locked) document.exitPointerLock(); else tap('Escape'); };

  // ---------------- Oberfläche ----------------
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const root = el('div', 'tt-root'); const pad = el('div', 'tt-pad'); const knob = el('div', 'tt-knob'); pad.append(knob);
  const knoepfe = el('div', 'tt-btns'); const oben = el('div', 'tt-top');
  const toggle = el('button', 'tt-toggle', '🎮'); toggle.title = 'Steuerung ein/aus';
  const tasten = el('button', 'tt-small', '⌨'); const escB = el('button', 'tt-small', 'Esc');
  oben.append(escB, tasten, toggle);
  const panel = el('div', 'tt-panel hidden');
  const halten = (b, an, aus) => { b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } b.classList.add('an'); an(); }); for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, () => { if (!b.classList.contains('an')) return; b.classList.remove('an'); aus(); }); };
  const BTN = [['Klick', 'maus'], ['E', 'KeyE'], ['F', 'KeyF'], ['Sprung', 'Space'], ['Rennen', 'ShiftLeft', 'fest']];
  for (const [txt, code, art] of BTN) {
    const b = el('button', 'tt-btn tt-' + code, txt); knoepfe.append(b);
    if (code === 'maus') halten(b, () => maus('mousedown'), () => maus('mouseup'));
    else if (art === 'fest') b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); const an = !b.classList.contains('an'); b.classList.toggle('an', an); key(an ? 'keydown' : 'keyup', code); });
    else halten(b, () => key('keydown', code), () => key('keyup', code));
  }
  // Alle übrigen Tasten (kurz antippen; „halten“-Tasten bleiben gedrückt, solange der Finger drauf ist)
  const ALLE = ['Escape', 'Tab', 'Enter', 'Backspace', 'KeyQ', 'KeyR', 'KeyT', 'KeyG', 'KeyH', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyM', 'KeyN', 'KeyB', 'KeyC', 'KeyV', 'KeyX', 'KeyY', 'KeyZ', 'KeyU', 'KeyO', 'KeyP',
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'Space', 'ShiftLeft', 'ControlLeft'];
  const NAME = { Escape: 'Esc', Backspace: '⌫', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Leer', ShiftLeft: 'Shift', ControlLeft: 'Strg' };
  const grid = el('div', 'tt-grid');
  for (const c of ALLE) { const b = el('button', 'tt-key', NAME[c] || KEY(c).toUpperCase()); halten(b, () => (c === 'Escape' ? esc() : key('keydown', c)), () => { if (c !== 'Escape') key('keyup', c); }); grid.append(b); }
  for (const [txt, f] of [['Rechtsklick', () => { maus('mousedown', 2); setTimeout(() => maus('mouseup', 2), 90); }], ['Rad ↑', () => rad(-120)], ['Rad ↓', () => rad(120)]]) { const b = el('button', 'tt-key breit', txt); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); f(); }); grid.append(b); }
  const zu = el('button', 'tt-key breit tt-zu', 'Fertig'); zu.onclick = () => panel.classList.add('hidden'); panel.append(grid, zu);
  function rad(dy) { const e = locked || document.getElementById('gl'); const r = e.getBoundingClientRect(); e.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, clientX: r.width / 2, clientY: r.height / 2 })); }
  tasten.addEventListener('click', (e) => { e.stopPropagation(); panel.classList.toggle('hidden'); });
  escB.addEventListener('click', (e) => { e.stopPropagation(); esc(); });
  toggle.addEventListener('click', (e) => { e.stopPropagation(); manual = !root.classList.contains('auf'); show(); });
  const hinweis = el('div', 'tt-quer hidden', 'Handy quer halten, dann siehst du mehr.');
  root.append(pad, knoepfe, oben, panel, hinweis);
  function show() {
    const auf = !!locked || manual; root.classList.toggle('auf', auf); toggle.classList.toggle('an', auf);
    if (!auf) { for (const c of [...held]) key('keyup', c); for (const b of knoepfe.querySelectorAll('.an')) b.classList.remove('an'); stick(0, 0); }
    hinweis.classList.toggle('hidden', !(locked && innerHeight > innerWidth));
  }
  addEventListener('resize', show);

  // Joystick: W A S D (acht Richtungen)
  let stickId = null; let cx = 0; let cy = 0;
  function stick(dx, dy) {
    const R = 46; const d = Math.hypot(dx, dy); const k = d > R ? R / d : 1; knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const nx = dx / R; const ny = dy / R; const T = 0.35;
    key(ny < -T ? 'keydown' : 'keyup', 'KeyW'); key(ny > T ? 'keydown' : 'keyup', 'KeyS'); key(nx < -T ? 'keydown' : 'keyup', 'KeyA'); key(nx > T ? 'keydown' : 'keyup', 'KeyD');
  }
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); stickId = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch (x) { /* egal */ } const r = pad.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; stick(e.clientX - cx, e.clientY - cy); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) stick(e.clientX - cx, e.clientY - cy); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(t, (e) => { if (e.pointerId !== stickId) return; stickId = null; stick(0, 0); });

  // Umsehen: Wischen auf dem Bild wird zur Mausbewegung, solange die Maus „gefangen“ ist
  const blicke = new Map(); const EMPF = 1.6;
  // Das Spiel sieht den Finger nicht selbst (sonst wäre jedes Wischen ein Klick). Kurz tippen ohne Wischen = ein Klick in die Bildmitte.
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch' || !locked || root.contains(e.target) || e.target.tagName !== 'CANVAS') return; /* nur Finger auf dem 3D-Bild, Knöpfe im Spiel bleiben normal */ e.preventDefault(); e.stopImmediatePropagation(); blicke.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }); }, true);
  addEventListener('pointermove', (e) => {
    const p = blicke.get(e.pointerId); if (!p || !locked) return; e.stopImmediatePropagation(); const dx = (e.clientX - p.x) * EMPF; const dy = (e.clientY - p.y) * EMPF; p.x = e.clientX; p.y = e.clientY; if (!dx && !dy) return;
    const m = new MouseEvent('mousemove', { bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY, movementX: dx, movementY: dy });
    if (m.movementX !== dx) { Object.defineProperty(m, 'movementX', { value: dx }); Object.defineProperty(m, 'movementY', { value: dy }); }
    locked.dispatchEvent(m);
  }, true);
  for (const t of ['pointerup', 'pointercancel']) addEventListener(t, (e) => {
    const p = blicke.get(e.pointerId); if (!p) return; blicke.delete(e.pointerId); e.stopImmediatePropagation();
    if (t === 'pointerup' && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 12 && performance.now() - p.t < 350) { maus('mousedown'); setTimeout(() => maus('mouseup'), 40); }
  }, true);

  // Bildschirm anlassen (sonst schläft das Handy ein und die Lobby bricht ab)
  let wake = null; const wach = async () => { try { if (navigator.wakeLock && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (x) { /* nicht erlaubt */ } };
  addEventListener('pointerdown', wach, { once: false, passive: true }); document.addEventListener('visibilitychange', wach);

  const los = () => { document.body.append(root); show(); };
  if (document.body) los(); else addEventListener('DOMContentLoaded', los);
  window.__theosTouch = { get locked() { return locked; }, key, tap, maus, esc, show };
})();
