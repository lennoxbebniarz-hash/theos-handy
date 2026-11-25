// Theos Seitenscheidel - Handy-Version als Webseite (Lennox, 2026-11-24): die Schul-Spiele für unterwegs.
// Dieselben Spiel-Module wie am PC (Stapelturm, Dino-Lauf, Dreierschach, Quadrat-Pong, Schiffe versenken), dazu Touch-Knöpfe und eine Startseite.
// Seit 2026-11-25 mit Lobby: Schach, Pong und Schiffe online mit mehreren Handys (und mit dem PC, wenn die Version gleich ist). Dieselbe Lobby wie am PC (mp.js).
import * as THREE from './js/vendor/three.module.min.js';
import { createDino } from './js/dino.js';
import { createStapel } from './js/stapel.js';
import { createChess } from './js/chess.js';
import { createPong } from './js/pong.js';
import { createShips } from './js/ships.js';
import { SCHUL_SPIELE, trageEin, rangliste, sauberesBuch, mische } from './js/schulrang.js';
import { createMp } from './js/mp.js';

const VERSION = '1.24.0';
const $ = (id) => document.getElementById(id);
const store = { get(k, d) { try { const v = localStorage.getItem('www.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('www.' + k, JSON.stringify(v)); } catch { /* voll */ } } };
const G = { mode: 'menu', screen: 'home' };
$('hdVersion').textContent = VERSION;

// ---------------- Bildschirme ----------------
const SCREENS = ['home', 'rang', 'chess', 'pong', 'ships', 'dino', 'stapel', 'join'];
let chess = null; let pong = null; let ships = null;
function showScreen(name) {
  if (name === 'gallery' || name === 'start' || name === 'menu' || !name) name = 'home';
  for (const s of SCREENS) { const el = $(s); if (el) el.classList.toggle('hidden', s !== name); }
  G.screen = name; document.body.dataset.screen = name;
  if (name !== 'chess' && chess) chess.hide();
  if (name !== 'pong' && pong) pong.hide();
  if (name !== 'ships' && ships) ships.hide();
  $('pgPad').classList.toggle('hidden', name !== 'pong');
  $('dnDuck').classList.toggle('hidden', name !== 'dino');
  if (name === 'home') { G.mode = 'menu'; zeigeRekorde(); if (history.state && history.state.s === 'spiel') history.back(); } else merke(); // jedes geöffnete Spiel bekommt einen Eintrag im Verlauf; über den Zurück-Knopf im Spiel verlassen: den Eintrag wieder abbauen (sonst brauchte die Handy-Zurück-Taste danach zwei Drücke)
}
let toastT = 0;
function toast(msg, ms = 2200) { const el = $('hdToast'); el.textContent = msg; el.classList.toggle('hidden', !msg); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add('hidden'), ms); }

// ---------------- Name und Rangliste ----------------
const name = () => store.get('mpName', 'Spieler');
$('hdName').value = name() === 'Spieler' ? '' : name();
$('hdName').addEventListener('change', () => { const n = $('hdName').value.trim().slice(0, 16); store.set('mpName', n || 'Spieler'); zeigeRekorde(); });
const buch = () => sauberesBuch(store.get('schulBuch', null));
function melde(spiel, wert, art = 'rekord') {
  if (name() === 'Spieler' && !store.get('nameGefragt', false)) { store.set('nameGefragt', true); toast('Trag oben auf der Startseite deinen Namen ein, dann steht er in der Rangliste.', 4200); }
  const r = trageEin(buch(), name(), spiel, wert, art); store.set('schulBuch', r.buch); return r;
}
function rangText(spiel) { const S = SCHUL_SPIELE.find((x) => x.id === spiel); return rangliste(buch(), spiel, name()).filter((q) => q.wert > 0).slice(0, 5).map((q) => `${q.platz}. ${q.name}${q.ich ? ' (du)' : ''}  ${S.einheit(q.wert)}`).join('\n'); }
window.addEventListener('theos:sieg', (e) => { if (SCHUL_SPIELE.some((x) => x.id === e.detail)) melde(e.detail, 0, 'sieg'); });
function zeigeRekorde() {
  const b = store.get('stapelBest', 0); const d = store.get('dinoBest', 0);
  $('hdRekStapel').textContent = b ? `Rekord: ${b} ${b === 1 ? 'Etage' : 'Etagen'}` : '';
  $('hdRekDino').textContent = d ? `Rekord: ${d} m` : '';
}
function zeigeRang(spiel = 'stapel') {
  const box = $('hdRangInhalt'); box.textContent = '';
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const reiter = el('div', 'srrang-reiter');
  for (const x of SCHUL_SPIELE) { const b = el('button', x.id === spiel ? 'an' : '', x.name); b.type = 'button'; b.onclick = () => zeigeRang(x.id); reiter.append(b); }
  const ol = el('ol', 'srrang-liste'); const S = SCHUL_SPIELE.find((x) => x.id === spiel);
  for (const q of rangliste(buch(), spiel, name())) {
    const li = el('li', `${q.platz ? 'p' + q.platz : 'leer'}${q.ich ? ' ich' : ''}`);
    li.append(el('b', '', q.platz ? `${q.platz}.` : '–'), el('span', '', q.name + (q.ich ? ' (du)' : '')), el('em', '', q.wert ? S.einheit(q.wert) : 'noch nichts'));
    ol.append(li);
  }
  box.append(reiter, ol, el('p', 'srrang-info', 'Hier steht, was dieses Handy kennt. Spielt ihr zusammen in einer Lobby, tauschen alle ihre Rekorde aus. Siege zählen bei Pong, Schach und Schiffen gegen die KI oder online.'));
}
$('hdRangZu').onclick = () => showScreen('home');

// ---------------- Spiele ----------------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, powerPreference: 'high-performance' });
function resize() { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(window.innerWidth, window.innerHeight, false); }
window.addEventListener('resize', resize); resize();
const zurueck = () => { G.mode = 'menu'; showScreen('home'); };
const dino = createDino({ $, store, showScreen, G, zurueck, melde, rangText });
const stapel = createStapel({ renderer, $, store, G, showScreen, resize, zurueck, melde, rangText });
chess = createChess({ $, store, showScreen, toast, endSession: () => {} });
pong = createPong({ $, store, showScreen, endSession: () => {} });
ships = createShips({ $, store, showScreen, endSession: () => {} });
for (const k of document.querySelectorAll('.hd-karte')) {
  k.onclick = () => {
    const s = k.dataset.spiel;
    if (s === 'stapel') stapel.open(); else if (s === 'dino') { dino.open(); if (innerHeight > innerWidth) toast('Tipp: Handy quer halten, dann siehst du mehr vom Schulhof.', 3500); } else if (s === 'chess') chess.open(); else if (s === 'pong') pong.open(); else if (s === 'ships') ships.open();
    else if (s === 'rang') { zeigeRang(); showScreen('rang'); }
  };
}
// „Zu dritt am PC“ heißt hier „zu dritt am Handy“
for (const sm of document.querySelectorAll('.cards [data-who="local"] small')) sm.textContent = 'Reihum auf diesem Handy';
for (const b of document.querySelectorAll('[data-who="local"] b')) b.textContent = 'Zu dritt am Handy';
for (const p of document.querySelectorAll('.cs-mphint')) p.remove();

// ---------------- Lobby: mit mehreren Handys spielen ----------------
// Dieselbe Lobby wie am PC. Die PC-Spiele, die es hier nicht gibt, sind leere Platzhalter, damit mp.js nichts vermisst.
const leer = () => ({ active: () => false, stop() {}, startCoop() {}, playerJoined() {}, playerLeft() {}, message() {} });
const SPIELE = { chess, pong, ships };
function openMenu() { for (const g of Object.values(SPIELE)) if (g.active()) g.stop(); if (dino.active()) dino.stop(); if (stapel.active()) stapel.stop(); zurueck(); }
const mp = createMp({
  schulbuch: { holen: () => buch(), mischen: (b) => { store.set('schulBuch', mische(buch(), b)); zeigeRekorde(); } },
  $, toast, store, chess, pong, ships, moon: leer(), park: leer(), raus: leer(), baron: leer(), kraft: leer(), casino: leer(), strom: leer(), bruno: leer(), ozean: leer(), saege: leer(),
  race: { active: false, end() {} }, showScreen, openMenu, openRoadmap() {}, startRace() {},
  transport: window.__theosTransport, // nur für Tests (Ersatz-Netz zwischen zwei Browser-Tabs), sonst PeerJS wie am PC
});
$('mpName').addEventListener('change', () => { $('hdName').value = store.get('mpName', 'Spieler') === 'Spieler' ? '' : store.get('mpName', 'Spieler'); });
$('jBack').onclick = () => mp.back();
$('mpStart').onclick = () => mp.startSession();
// In jedem Online-fähigen Spiel ein dritter Weg unter „Wer spielt?“: Online mit Freunden
for (const [mode, wer] of [['chess', 'csWho'], ['pong', 'pgWho'], ['ships', 'shWho']]) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'hd-online'; b.dataset.hdOnline = mode;
  b.innerHTML = '<b>Online mit Freunden</b><small>Lobby erstellen oder beitreten, jeder auf seinem Handy</small>';
  b.onclick = () => { SPIELE[mode].stop(); $('mpName').value = name(); mp.openFor(mode, { onBack: () => SPIELE[mode].open() }); };
  $(wer).after(b);
}

// Pong: zwei große Pfeile unten (dieselben Tasten wie am PC)
for (const b of $('pgPad').querySelectorAll('button')) {
  const send = (type) => window.dispatchEvent(new KeyboardEvent(type, { code: b.dataset.key, key: b.dataset.key, bubbles: true }));
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* kein echter Finger */ } b.classList.add('an'); send('keydown'); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, () => { if (!b.classList.contains('an')) return; b.classList.remove('an'); send('keyup'); });
}
// Dino: Ducken-Knopf gedrückt halten
{
  const b = $('dnDuck'); const set = (on) => { dino.state.keys.ArrowDown = on; b.classList.toggle('an', on); };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* kein echter Finger */ } set(true); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(t, () => set(false));
}
// Handy-Zurück-Taste (Android) oder Wischgeste: zurück zur Startseite statt die Seite zu verlassen
history.replaceState({ s: 'home' }, '');
function merke() { if (G.screen !== 'home' && (!history.state || history.state.s !== 'spiel')) history.pushState({ s: 'spiel' }, ''); }
window.addEventListener('popstate', () => {
  if (G.screen === 'home') return; // auf der Startseite verlässt Zurück die Seite wie gewohnt
  if (G.screen === 'join') { mp.back(); return; } // aus der Lobby: zurück ins Spielmenü
  if (mp.inSession) { for (const g of Object.values(SPIELE)) if (g.active()) g.stop(); mp.hostEnds(); return; } // Online-Partie: Host holt alle in die Lobby, Gast verlässt sie
  if (dino.active()) dino.stop(); if (stapel.active()) stapel.stop(); if (chess.active()) chess.stop(); if (pong.active()) pong.stop(); if (ships.active()) ships.stop();
  zurueck();
});


// ---------------- Hauptschleife ----------------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  document.body.classList.toggle('hd-3d', G.mode === 'stapel');
  if (G.mode === 'dino') dino.frame(dt);
  else if (G.mode === 'stapel') stapel.frame(dt);
}
requestAnimationFrame(frame);
showScreen('home');

// Offline: nur auf einer echten Webseite, nicht beim Testen von der Festplatte
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
window.__theosHandy = { G, dino, stapel, chess, pong, ships, mp, showScreen, store, renderer };
