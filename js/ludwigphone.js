// Theos Seitenscheidel - Ludwig: Ludwigs Handy. T holt es aus der Hosentasche (die Tasche fährt ins Bild, die Hand zieht das Handy heraus).
// Mama hat 1 Minute Bildschirmzeit eingestellt: Sie läuft nur, solange das Handy draußen ist. Ist sie weg, kommt die Sperre und das Handy wandert zurück.
// Apps: Boss-Plan (Skilltree, das Handy dreht sich dafür quer), drei Minispiele (Tabak-Regen, Kippen-Turm, Glut-Reflex) und die Bildschirmzeit.
// Alles HTML, SVG und Canvas, keine fremden Dateien. Die Uhr des Spiels treibt alles an (tick), damit Pause und Tests sauber laufen.
import { BRANCHES, NODES, NODE, START_ID, START_NODE, nodePos, lvl, unlocked, canSkill, buySkill, fxLine, treeStats } from './ludwigskills.js';
import { screenLimit, autoRates, SORTEN, SORT_ORDER, MATS, TOOLS, boxOf, handOf, matOf, sortUnlocked, sortReady, boxCap, handCap, boxTotal, handTotal, slotsUsed, pocketSlots, kisteUsed, kisteSlots, TEILE, TEIL_ORDER, teilOf, teileUsed, TEILE_SLOTS, ablageTotal, EGGS, eggCount } from './ludwiglogic.js';
import { MACHINE_IDS } from './ludwigbunker.js';
import { createChatView } from './ludwigextraui.js'; // Kumpel-Chat (Abstimmung Paket 4)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const num = (v) => (Math.round(v * 10) / 10).toLocaleString('de-DE');
const O = 1600; // Mitte der Boss-Plan-Karte in Ebenen-Pixeln
const CW = 280; const CH = 480; // Spielfläche der Minispiele

const POCKET = '<svg viewBox="0 0 380 300" preserveAspectRatio="none"><defs><linearGradient id="phJ" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b5f92"/><stop offset="1" stop-color="#1f3a63"/></linearGradient><pattern id="phT" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="none"/><path d="M0 0v6" stroke="#ffffff" stroke-opacity=".06" stroke-width="2"/></pattern></defs>'
  + '<path d="M0 46 Q190 6 380 40 V300 H0 Z" fill="url(#phJ)"/><path d="M0 46 Q190 6 380 40 V300 H0 Z" fill="url(#phT)"/><path d="M0 46 Q190 6 380 40" fill="none" stroke="#0e1d33" stroke-width="10" stroke-opacity=".7"/>'
  + '<path d="M0 64 Q190 24 380 58" fill="none" stroke="#e8a23a" stroke-width="2.5" stroke-dasharray="9 6"/><path d="M0 74 Q190 34 380 68" fill="none" stroke="#e8a23a" stroke-width="2.5" stroke-dasharray="9 6"/>'
  + '<circle cx="352" cy="72" r="9" fill="#c98a3a" stroke="#7a4a12" stroke-width="2"/><circle cx="352" cy="72" r="3.5" fill="#f0c070"/><path d="M40 300 V200 M340 300 V190" stroke="#e8a23a" stroke-width="2" stroke-dasharray="8 6" opacity=".5"/></svg>';
const HAND = '<svg viewBox="0 0 400 360"><path d="M70 360 C70 300 80 250 120 220 L280 220 C320 250 330 300 330 360 Z" fill="#2c4a7a"/><path d="M76 360 C80 318 88 284 110 262 L290 262 C312 284 320 318 324 360" fill="none" stroke="#1d3355" stroke-width="6"/>'
  + '<path d="M118 228 C96 170 90 110 104 60 C112 34 140 30 150 50 L160 120 L246 120 L262 40 C270 18 300 22 304 48 C312 110 304 170 282 228 Z" fill="#e2b08c"/><path d="M128 210 C150 196 250 196 272 210" fill="none" stroke="#c48a64" stroke-width="5" stroke-linecap="round"/></svg>';
const FING = '<svg viewBox="0 0 340 260"><g fill="#d9a07c" stroke="#b9805c" stroke-width="2"><path d="M2 40 C-2 120 0 200 6 262 L24 262 L24 40 Z"/><path d="M336 120 C342 170 342 220 338 262 L320 262 L320 130 Z"/></g><g fill="#e2b08c" stroke="#b9805c" stroke-width="2"><rect x="0" y="20" width="44" height="30" rx="15"/><rect x="0" y="62" width="46" height="30" rx="15"/><rect x="2" y="104" width="42" height="28" rx="14"/></g><path d="M300 40 C330 60 338 120 318 170 C306 196 282 190 284 160 C288 120 286 90 276 70 Z" fill="#e2b08c" stroke="#b9805c" stroke-width="2"/><path d="M296 70 C310 90 312 120 304 150" fill="none" stroke="#c48a64" stroke-width="3" stroke-linecap="round"/></svg>';
const APPS = [
  { id: 'tree', name: 'Boss-Plan', icon: '👑', bg: 'linear-gradient(145deg,#3a2408,#ff9a2a)' },
  { id: 'chat', name: 'Kumpels', icon: '💬', bg: 'linear-gradient(145deg,#0c2e22,#2fb873)' },
  { id: 'lager', name: 'Lager', icon: '🗃️', bg: 'linear-gradient(145deg,#3a2a10,#c98f56)' }, // seit 2026-11-20: was in Box und Taschen liegt, je Sorte
  { id: 'regen', name: 'Tabak-Regen', icon: '🍂', bg: 'linear-gradient(145deg,#1e3a20,#6ab04c)' },
  { id: 'turm', name: 'Kippen-Turm', icon: '📦', bg: 'linear-gradient(145deg,#4a0f12,#e0444a)' },
  { id: 'reflex', name: 'Glut-Reflex', icon: '🔥', bg: 'linear-gradient(145deg,#2a0e04,#ff6a1a)' },
  { id: 'time', name: 'Bildschirmzeit', icon: '⏳', bg: 'linear-gradient(145deg,#1d1640,#7a5cff)' },
];
const MAMA = ['„Nein.“', '„Frag Papa.“', '„Hast du deine Hausaufgaben gemacht?“', '„Nein. Und räum dein Zimmer auf.“', '„Eine Minute reicht. Ich hatte früher gar kein Handy.“'];

export function createLudwigPhone({ root, snd, getS, onBuy, onReward, onClose }) {
  root.innerHTML = `<div class="ph-dev"><div class="ph-hand">${HAND}</div><div class="ph-frame"><div class="ph-screen">
      <div class="ph-status"><b class="ph-clock">21:47</b><i class="ph-isl"></i><span class="ph-left">⏳ <b>1:00</b></span><span class="ph-bat"><i></i></span></div>
      <section class="ph-v ph-home on" data-v="home"><div class="ph-widget"><small>Respekt</small><b class="ph-wresp">⭐ 0</b><span class="ph-wready"></span><div class="ph-wtime"><i></i></div><span class="ph-wtt"></span></div>
        <div class="ph-apps">${APPS.map((a) => `<button type="button" class="ph-app" data-app="${a.id}"><i data-bg="${a.bg}">${a.icon}</i><span>${a.name}</span>${a.id === 'tree' ? '<em class="ph-badge hidden">0</em>' : ''}</button>`).join('')}</div>
        <p class="ph-tip">Esc zurück · T Handy weg</p></section>
      <section class="ph-v ph-tree" data-v="tree"><header class="pt-head"><button type="button" class="pt-back">‹ Home</button><b class="pt-title">BOSS-PLAN</b><span class="pt-resp">⭐ <b class="pt-respv">0</b> Respekt</span><span class="pt-rates"></span><span class="pt-left">⏳ <b>1:00</b></span></header>
        <div class="pt-body"><div class="pt-map"><div class="pt-layer"><svg class="pt-edges" width="${O * 2}" height="${O * 2}" viewBox="0 0 ${O * 2} ${O * 2}"></svg><div class="pt-nodes"></div></div>
          <div class="pt-zoom"><button type="button" data-z="in" title="Näher">+</button><button type="button" data-z="out" title="Weiter weg">−</button><button type="button" data-z="home" title="Zur Mitte">⌖</button></div>
          <div class="pt-legend">${Object.values(BRANCHES).map((b) => `<span data-c="${b.col}"><i></i>${b.name}</span>`).join('')}</div></div>
        <aside class="pt-card"></aside></div></section>
      <section class="ph-v ph-game" data-v="game"><header class="pg-head"><button type="button" class="pg-back">‹</button><b class="pg-title"></b><span class="pg-score"></span></header><canvas class="pg-cv" width="${CW * 2}" height="${CH * 2}"></canvas>
        <div class="pg-over"><div class="pg-big"></div><h3></h3><p></p><div class="pg-btns"><button type="button" class="pg-home">Home</button><button type="button" class="pg-go">Start</button></div></div></section>
      <section class="ph-v ph-time" data-v="time"><header class="pg-head"><button type="button" class="pg-back">‹</button><b class="pg-title">Bildschirmzeit</b></header>
        <div class="ptm-ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="50"/><circle class="p" cx="60" cy="60" r="50"/></svg><b class="ptm-left">1:00</b><small>übrig</small></div>
        <ul class="ptm-list"><li><span>Tageslimit</span><b class="ptm-lim">1:00</b></li><li><span>Festgelegt von</span><b>MAMA 👩</b></li><li><span>Wieder voll in</span><b class="ptm-next">5:00</b></li><li><span>Bonus aus dem Boss-Plan</span><b class="ptm-bonus">keiner</b></li></ul>
        <button type="button" class="ptm-ask">Mehr Zeit anfragen</button><p class="ptm-ans"></p></section>
      <section class="ph-v ph-lager" data-v="lager"><header class="pg-head"><button type="button" class="pg-back">‹</button><b class="pg-title">Lager</b></header><div class="pl-body"></div></section>
      <div class="ph-limit hidden"><div class="ph-hour">⌛</div><b>Zeitlimit erreicht</b><p>Du hast dein Limit für das Handy erreicht.</p><small>Festgelegt von MAMA</small><span class="ph-lnext"></span></div>
      <div class="ph-off on"></div><button type="button" class="ph-homebar" title="Home"></button>
    </div></div><div class="ph-fing">${FING}</div></div><div class="ph-pocket">${POCKET}</div>`;
  const q = (s) => root.querySelector(s); const dev = q('.ph-dev'); const pocket = q('.ph-pocket'); const off = q('.ph-off'); const limitEl = q('.ph-limit');
  // Das Spiel erlaubt keine style="…"-Attribute im HTML (Content-Security-Policy). Farben stehen deshalb in data-Attributen und werden hier gesetzt.
  function paint(box) { for (const e of box.querySelectorAll('[data-bg]')) e.style.background = e.dataset.bg; for (const e of box.querySelectorAll('[data-c]')) e.style.setProperty('--c', e.dataset.c); for (const e of box.querySelectorAll('[data-col]')) e.style.color = e.dataset.col; }
  paint(root);
  // App „Kumpels“: eigenes Feld und rote Zahl am Symbol
  const chatSec = document.createElement('section'); chatSec.className = 'ph-v ph-chat'; chatSec.dataset.v = 'chat';
  chatSec.innerHTML = '<header class="pg-head"><button type="button" class="pg-back">‹</button><b class="pg-title">Kumpels</b></header><div class="pk-body"></div>';
  q('.ph-home').after(chatSec);
  const chatView = createChatView(chatSec.querySelector('.pk-body'));
  const chatBadge = document.createElement('em'); chatBadge.className = 'ph-cbadge hidden'; q('.ph-app[data-app="chat"]').append(chatBadge);
  let chatS = null; let gelesen = 0;
  function renderChat() { const S = getS(); if (!S || !S.chat) return; chatView(S); gelesen = S.chat.id; }
  const P = { open: false, land: false, view: 'home', g: null, timers: [], sel: START_ID, z: 0.62, px: 0, py: 0, viewSet: false, nodeEls: {}, game: null, keys: {}, mx: CW / 2, mouse: false, uiT: 0, treeT: 0, limitOn: false, limitT: 0, built: false };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); P.timers.push(t); return t; };
  const clearLater = () => { for (const t of P.timers) clearTimeout(t); P.timers = []; };

  // ---------------- Lage auf dem Bildschirm: hochkant unten rechts in der Hand, quer groß in der Mitte ----------------
  function geo(land) {
    const W = window.innerWidth; const H = window.innerHeight;
    if (!land) { const w = 300; const h = 610; const k = Math.max(0.45, Math.min(1, (H - 60) / 640, (W * 0.42) / w)); return { w, h, k, cx: W - Math.max(60, W * 0.1) - (w * k) / 2, cy: H - 14 - (h * k) / 2 }; }
    const w = 1040; const h = 512; const k = Math.max(0.4, Math.min(1, (W - 50) / w, (H - 50) / h)); return { w, h, k, cx: W / 2, cy: H / 2 + 4 };
  }
  function place(g, { dy = 0, rot = 0, k = g.k } = {}) { dev.style.width = g.w + 'px'; dev.style.height = g.h + 'px'; dev.style.left = (g.cx - g.w / 2) + 'px'; dev.style.top = (g.cy - g.h / 2) + 'px'; dev.style.transform = `translateY(${dy}px) rotate(${rot}deg) scale(${k})`; }
  function jump(fn) { dev.classList.add('ph-notr'); fn(); void dev.offsetWidth; dev.classList.remove('ph-notr'); }
  function setPocket(g) { const w = 380 * g.k; pocket.style.width = w + 'px'; pocket.style.height = 300 * g.k + 'px'; pocket.style.left = (g.cx - w / 2) + 'px'; }
  window.addEventListener('resize', () => { if (!P.open) return; P.g = geo(P.land); jump(() => place(P.g)); setPocket(geo(false)); if (P.land) centerOn(0, 0, P.z, true); });

  // ---------------- Aus der Tasche holen und zurückstecken ----------------
  function open() {
    if (P.open) return; clearLater(); P.open = true; P.limitOn = false; P.turning = false; limitEl.classList.add('hidden'); root.classList.remove('hidden', 'land', 'turning'); P.land = false; show('home');
    const g = geo(false); P.g = g; setPocket(g); off.classList.add('on'); root.classList.add('pull');
    jump(() => place(g, { dy: g.h * g.k * 0.95 + 70, rot: 13 })); pocket.classList.add('up'); snd.pocket(true);
    later(() => place(g, { dy: -6, rot: -3 }), 190); // raus aus der Tasche
    later(() => { place(g); pocket.classList.remove('up'); }, 640);
    later(() => { off.classList.remove('on'); root.classList.remove('pull'); snd.phoneOn(); status(); const S = getS(); if (S && S.screen.left <= 0) limit(); }, 700);
  }
  function close() {
    if (!P.open) return; P.open = false; clearLater(); if (P.game) stopGame(); P.limitOn = false; off.classList.add('on'); snd.phoneOff();
    if (P.land || P.turning) { P.land = false; P.turning = false; root.classList.remove('land', 'turning'); P.g = geo(false); jump(() => { show('home'); place(P.g); }); }
    const g = P.g || geo(false); setPocket(g); pocket.classList.add('up');
    later(() => place(g, { dy: g.h * g.k * 0.95 + 70, rot: 9 }), 120); later(() => snd.pocket(false), 240);
    later(() => pocket.classList.remove('up'), 560); later(() => { root.classList.add('hidden'); limitEl.classList.add('hidden'); }, 860);
  }
  function show(v) { P.view = v; for (const s of root.querySelectorAll('.ph-v')) s.classList.toggle('on', s.dataset.v === v); if (v === 'home') renderHome(); if (v === 'time') renderTime(); if (v === 'lager') renderLager(); if (v === 'chat') renderChat(); }
  // Quer drehen (Boss-Plan) und zurück. Phase 1: das hochkante Handy dreht sich um 90° und wandert in die Mitte. Phase 2: es wird groß.
  function toLand() {
    if (P.land || P.turning) return; P.turning = true; const g = P.g; const L = geo(true); root.classList.add('turning'); snd.turn();
    dev.style.left = (L.cx - g.w / 2) + 'px'; dev.style.top = (L.cy - g.h / 2) + 'px'; dev.style.transform = `rotate(-90deg) scale(${g.k})`;
    later(() => { jump(() => { root.classList.add('land'); show('tree'); place(L, { k: (g.h * g.k) / L.w }); }); place(L); P.g = L; P.land = true; root.classList.remove('turning'); P.turning = false; buildTree(); if (!P.viewSet) { P.viewSet = true; centerOn(0, 0, fitZoom(), true); } treeRender(); }, 400);
  }
  function toPort(then = 'home') {
    if (!P.land || P.turning) return; P.turning = true; const L = P.g; const g = geo(false); snd.turn(); place(L, { k: (g.h * g.k) / L.w }); root.classList.add('turning');
    later(() => { jump(() => { root.classList.remove('land'); show(then); dev.style.width = g.w + 'px'; dev.style.height = g.h + 'px'; dev.style.left = (L.cx - g.w / 2) + 'px'; dev.style.top = (L.cy - g.h / 2) + 'px'; dev.style.transform = `rotate(-90deg) scale(${g.k})`; }); place(g); P.g = g; P.land = false; root.classList.remove('turning'); P.turning = false; }, 320);
  }
  function back() {
    if (!P.open || P.limitOn || P.turning) return; snd.tapPh();
    if (P.view === 'tree') { toPort('home'); return; } if (P.view === 'game') { stopGame(); show('home'); return; } if (P.view !== 'home') { show('home'); return; } onClose();
  }
  // Bildschirmzeit aufgebraucht: Sperre, ein laufendes Spiel wird noch gewertet, dann zurück in die Tasche
  function limit() {
    if (!P.open || P.limitOn) return; const S = getS(); if (P.game && P.game.state === 'play') finishGame(true); P.limitOn = true; P.limitT = 2.6;
    limitEl.querySelector('.ph-lnext').textContent = S ? 'Wieder voll in ' + mmss(S.screen.next) : ''; limitEl.classList.remove('hidden'); snd.limit();
  }

  // ---------------- Statusleiste, Home, Bildschirmzeit ----------------
  function status() {
    const S = getS(); if (!S) return; const d = new Date(); q('.ph-clock').textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const left = mmss(S.screen.left); for (const e of root.querySelectorAll('.ph-left b, .pt-left b')) e.textContent = left; root.classList.toggle('low', S.screen.left < 10);
  }
  function renderHome() {
    const S = getS(); if (!S) return; const st = treeStats(S); q('.ph-wresp').textContent = `⭐ ${S.respekt.toLocaleString('de-DE')}`;
    q('.ph-wready').textContent = st.ready ? `${st.ready} ${st.ready === 1 ? 'Knoten' : 'Knoten'} im Boss-Plan bereit` : st.own ? `${st.own} von ${st.total} Knoten geschafft` : 'Respekt gibt es von zufriedenen Kunden';
    if (S.chat) { if (chatS !== S) { chatS = S; gelesen = Math.max(0, S.chat.id - 24); } const un = Math.min(24, S.chat.id - gelesen); chatBadge.textContent = String(un); chatBadge.classList.toggle('hidden', !(un > 0)); }
    const bd = q('.ph-badge'); bd.textContent = String(st.ready); bd.classList.toggle('hidden', !st.ready);
    const lim = screenLimit(S); q('.ph-wtime i').style.width = `${clamp(S.screen.left / lim, 0, 1) * 100}%`; q('.ph-wtt').textContent = `Bildschirmzeit: ${mmss(S.screen.left)} von ${mmss(lim)}`;
  }
  function renderTime() {
    const S = getS(); if (!S) return; const lim = screenLimit(S); q('.ptm-left').textContent = mmss(S.screen.left); q('.ptm-lim').textContent = mmss(lim);
    q('.ptm-next').textContent = S.screen.left >= lim ? 'ist voll' : mmss(S.screen.next); q('.ptm-bonus').textContent = lim > 60 ? `+${lim - 60} s` : 'keiner';
    q('.ptm-ring .p').style.strokeDashoffset = String(314.2 * (1 - clamp(S.screen.left / lim, 0, 1)));
  }
  // App Lager: alle Sorten mit Box und Taschen, Material, Werkzeug (die Leiste oben zeigt nur die gewählte Sorte)
  let lagerH = '';
  function renderLager() {
    const S = getS(); if (!S) return; const sel = S.sorte || 'kippe'; const rows = SORT_ORDER.filter((id) => sortUnlocked(S, id) || boxOf(S, id) + handOf(S, id) > 0);
    let h = `<div class="pl-sum"><span>Box<b>${boxTotal(S)}/${boxCap(S)}</b></span><span>Taschen<b>${slotsUsed(S)}/${pocketSlots(S)}</b></span><span>Kiste<b>${kisteUsed(S)}/${kisteSlots(S)}</b></span></div><ul class="ptm-list pl-list"><li class="pl-th"><span>Sorte</span><span>Box · Taschen</span></li>`;
    for (const id of rows) { const D = SORTEN[id]; h += `<li class="${id === sel ? 'sel' : ''}"><span>${D.icon} ${D.plural}${sortReady(S, id) ? '' : '<em>Werkzeug fehlt</em>'}</span><b>${boxOf(S, id)} · ${handOf(S, id)}</b></li>`; }
    const mats = ['papier', 'tabak', ...Object.keys(MATS).filter((k) => matOf(S, k) > 0 || SORT_ORDER.some((id) => sortUnlocked(S, id) && SORTEN[id].steps.some((sp) => sp.use && sp.use[k])))];
    h += `</ul><h4 class="pl-h">Material</h4><ul class="ptm-list pl-list">${mats.map((k) => `<li><span>${k === 'papier' ? '📄 Blättchen' : k === 'tabak' ? '🍂 Tabak' : `${MATS[k].ico} ${MATS[k].name}`}</span><b>${matOf(S, k)}</b></li>`).join('')}</ul>`;
    const tools = Object.entries(TOOLS).filter(([k]) => S.tools && S.tools[k]); if (tools.length) h += `<h4 class="pl-h">Werkzeug</h4><ul class="ptm-list pl-list">${tools.map(([, T]) => `<li><span>${T.ico} ${T.name}</span><b>✓</b></li>`).join('')}</ul>`;
    if (sortUnlocked(S, 'vmango') || TEIL_ORDER.some((k) => teilOf(S, k) > 0)) h += `<h4 class="pl-h">Teilekiste im Bunker (${teileUsed(S)}/${TEILE_SLOTS} Fächer)</h4><ul class="ptm-list pl-list">${TEIL_ORDER.map((k) => `<li><span>${TEILE[k].ico} ${TEILE[k].name}</span><b>${teilOf(S, k)}</b></li>`).join('')}${ablageTotal(S) ? `<li class="sel"><span>✅ Fertig in der Ablage</span><b>${ablageTotal(S)}</b></li>` : ''}</ul>`; // Vapes (Teil 2)
    h += `<h4 class="pl-h">Easter Eggs</h4><ul class="ptm-list pl-list"><li><span>🥚 Gefunden</span><b>${eggCount(S)}/${EGGS.length}</b></li></ul>`; // seit 2026-11-21: zehn versteckte Kleinigkeiten
    h += '<p class="pl-tip">Taschen: Plätze à 10 Stück. Kiste: Fächer für Material, eine Packung pro Fach.</p>';
    if (rows.length < SORT_ORDER.length) h += '<p class="pl-tip">Neue Sorten gibt es im Boss-Plan (Ast Produktion). Gewählt wird am Tisch mit den Tasten 1 bis 5.</p>';
    if (h !== lagerH) { lagerH = h; q('.pl-body').innerHTML = h; }
  }
  q('.ptm-ask').onclick = () => { const a = q('.ptm-ans'); a.textContent = 'Anfrage wird an MAMA gesendet …'; snd.tapPh(); later(() => { a.textContent = 'Mama: ' + MAMA[(Math.random() * MAMA.length) | 0]; snd.nope(); }, 1100); };
  root.addEventListener('click', (e) => {
    if (!P.open) return; const app = e.target.closest('.ph-app'); if (app) { openApp(app.dataset.app); return; }
    if (e.target.closest('.ph-homebar')) { if (P.view === 'tree') toPort('home'); else if (P.view !== 'home') { if (P.game) stopGame(); show('home'); } snd.tapPh(); return; }
    if (e.target.closest('.pg-back, .pt-back')) { back(); return; }
    if (e.target.closest('.pg-home')) { stopGame(); show('home'); snd.tapPh(); return; } if (e.target.closest('.pg-go')) { startPlay(); return; }
    const z = e.target.closest('[data-z]'); if (z) { const mw = q('.pt-map').clientWidth / 2; const mh = q('.pt-map').clientHeight / 2; if (z.dataset.z === 'home') centerOn(0, 0, fitZoom()); else zoomAt(mw, mh, P.z * (z.dataset.z === 'in' ? 1.25 : 0.8)); snd.tapPh(); }
  });
  function openApp(a) { if (P.limitOn || P.turning) return; snd.tapPh(); if (a === 'tree') { toLand(); return; } if (a === 'time') { show('time'); return; } if (a === 'lager') { show('lager'); return; } if (a === 'chat') { show('chat'); return; } openGame(a); }

  // ---------------- Boss-Plan: Karte mit Knoten, Linien, Verschieben und Zoomen ----------------
  const map = q('.pt-map'); const layer = q('.pt-layer');
  function buildTree() {
    if (P.built) return; P.built = true; const box = q('.pt-nodes'); let lines = ''; let labs = '';
    for (const n of NODES) { const p = nodePos(n); for (const pid of [...n.need, ...n.any]) { const pp = pid === START_ID ? { x: 0, y: 0 } : nodePos(NODE[pid]); lines += `<line data-a="${pid}" data-b="${n.id}"${n.any.includes(pid) ? ' data-any="1"' : ''}${n.id === 'c_finale' ? ' data-fin="1"' : ''} x1="${O + pp.x}" y1="${O + pp.y}" x2="${O + p.x}" y2="${O + p.y}"/>`; } }
    for (const b of Object.values(BRANCHES)) { const a = b.ang * Math.PI / 180; const r = 0.52 * 150; labs += `<text x="${O + Math.cos(a) * r}" y="${O + Math.sin(a) * r + 4}" fill="${b.col}" text-anchor="middle" transform="rotate(${b.ang > 90 || b.ang < -90 ? b.ang + 180 : b.ang} ${O + Math.cos(a) * r} ${O + Math.sin(a) * r})">${b.name.toUpperCase()}</text>`; }
    q('.pt-edges').innerHTML = `<g class="pt-rings">${[1, 3, 5, 7].map((d) => `<circle cx="${O}" cy="${O}" r="${d * 150}"/>`).join('')}</g><g class="pt-lines">${lines}</g><g class="pt-blabs">${labs}</g>`;
    const mk = (n, p, b) => { const e = document.createElement('button'); e.type = 'button'; e.className = 'pt-node'; e.dataset.id = n.id; e.style.left = `${O + p.x}px`; e.style.top = `${O + p.y}px`; e.style.setProperty('--c', b); e.innerHTML = `<i>${n.icon}</i><span class="pt-pips"></span><em>${n.name}</em>`; box.append(e); P.nodeEls[n.id] = e; };
    mk(START_NODE, { x: 0, y: 0 }, '#ffcf5a'); for (const n of NODES) mk(n, nodePos(n), BRANCHES[n.b].col);
  }
  function treeRender() {
    const S = getS(); if (!S || !P.built) return;
    // Nebel: zu sehen sind nur freigeschaltete Knoten und die, die man als Nächstes kaufen könnte. Der Rest taucht erst auf, wenn der Knoten davor gelevelt ist.
    const vis = { [START_ID]: true }; for (const n of NODES) vis[n.id] = lvl(S, n.id) > 0 || unlocked(S, n); const now = performance.now(); P.vis = P.vis || {}; P.fresh = P.fresh || {};
    if (P.sel !== START_ID && !vis[P.sel]) P.sel = START_ID;
    for (const n of NODES) { const e = P.nodeEls[n.id]; const l = lvl(S, n.id); const c = canSkill(S, n.id); if (vis[n.id] && P.vis[n.id] === false) P.fresh[n.id] = now + 900; P.vis[n.id] = vis[n.id];
      e.className = 'pt-node' + (l >= n.max ? ' max own' : l > 0 ? ' own' : unlocked(S, n) ? ' avail' : ' lock') + (vis[n.id] ? '' : ' hid') + ((P.fresh[n.id] || 0) > now ? ' new' : '') + (c.ok ? ' can' : '') + (P.sel === n.id ? ' sel' : '') + (n.fx.final ? ' fin' : ''); e.querySelector('.pt-pips').textContent = n.max > 1 ? '●'.repeat(l) + '○'.repeat(n.max - l) : (l ? '●' : '○'); }
    P.nodeEls[START_ID].className = 'pt-node own start' + (P.sel === START_ID ? ' sel' : '');
    for (const ln of q('.pt-lines').children) { const a = lvl(S, ln.dataset.a) > 0; const b = lvl(S, ln.dataset.b) > 0; ln.setAttribute('class', (b && a ? 'own' : a ? 'open' : 'off') + (ln.dataset.any ? ' any' : '') + (ln.dataset.fin ? ' fin' : '') + (vis[ln.dataset.a] && vis[ln.dataset.b] ? '' : ' hid')); ln.style.stroke = a && !ln.dataset.fin ? BRANCHES[NODE[ln.dataset.b].b].col : ''; }
    card(); treeHead();
  }
  function treeHead() {
    const S = getS(); if (!S) return; q('.pt-respv').textContent = S.respekt.toLocaleString('de-DE'); const r = autoRates(S); const parts = [];
    if (r.auto > 0) parts.push(`Maschinen ${num(r.auto)}/min`); if (r.courier > 0) parts.push(`Boten ${num(r.courier)}/min`); if (r.tabak > 0 || r.papier > 0) parts.push(`Nachschub ${num(Math.max(r.tabak, r.papier))}/min`); q('.pt-rates').textContent = parts.join(' · ');
  }
  function card() {
    const S = getS(); const id = P.sel; const el = q('.pt-card');
    if (id === START_ID || !NODE[id]) { const st = treeStats(S); el.innerHTML = `<div class="pt-cicon" data-c="#ffcf5a">${START_NODE.icon}</div><small data-col="#ffcf5a">DER BOSS-PLAN</small><h4>Ludwigs Weg nach oben</h4><p>${START_NODE.text}</p><div class="pt-cstat"><span><b>${st.own}</b> von ${st.total} Knoten</span><span><b>${st.ready}</b> jetzt kaufbar</span></div><p class="pt-chelp">Ziehen verschiebt die Karte, das Mausrad zoomt. Knoten anklicken, dann freischalten. Neue Knoten tauchen erst auf, wenn du den Knoten davor freigeschaltet hast. Ganz außen wartet das Finale.</p>`; paint(el); return; }
    const n = NODE[id]; const l = lvl(S, id); const c = canSkill(S, id); const b = BRANCHES[n.b];
    const btn = c.why === 'max' ? '<div class="pt-cmax">AUSGEBAUT</div>' : `<button type="button" class="pt-buy"${c.ok ? '' : ' disabled'}>${l > 0 ? 'Ausbauen' : 'Freischalten'} · ⭐ ${c.cost}</button>`;
    const miss = c.why === 'need' ? `<p class="pt-cmiss">Erst nötig: ${c.missing.join(', ')}</p>` : c.why === 'respekt' ? `<p class="pt-cmiss">Dir fehlen noch ${c.fehlt} Respekt.</p>` : '';
    el.innerHTML = `<div class="pt-cicon" data-c="${b.col}">${n.icon}</div><small data-col="${b.col}">${b.name.toUpperCase()}</small><h4>${n.name}</h4><p>${n.text}</p><div class="pt-clvl">Stufe ${l} von ${n.max}</div>${l < n.max ? `<div class="pt-cfx"><b>${l > 0 ? 'Nächste Stufe' : 'Bringt'}:</b> ${fxLine(n, 1)}</div>` : ''}${l > 0 ? `<div class="pt-cnow"><b>Jetzt:</b> ${fxLine(n, l)}</div>` : ''}${MACHINE_IDS.includes(id) ? '<p class="pt-cbuy">Jede Stufe erlaubt eine Maschine. Kaufen musst du sie mit Geld im Shop am PC.</p>' : ''}${btn}${miss}`;
    paint(el); const bb = el.querySelector('.pt-buy'); if (bb) bb.onclick = () => buy(id);
  }
  function buy(id) {
    const S = getS(); const r = buySkill(S, id); if (!r.ok) { snd.nope(); card(); return; } snd.skill(r.final); const e = P.nodeEls[id]; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop');
    for (let i = 0; i < 14; i++) { const s = document.createElement('i'); s.className = 'pt-spark'; const a = (i / 14) * Math.PI * 2; s.style.left = e.style.left; s.style.top = e.style.top; s.style.setProperty('--dx', `${Math.cos(a) * 70}px`); s.style.setProperty('--dy', `${Math.sin(a) * 70}px`); s.style.setProperty('--c', BRANCHES[r.node.b].col); q('.pt-nodes').append(s); setTimeout(() => s.remove(), 800); }
    treeRender(); later(() => e.classList.remove('pop'), 600); onBuy(r);
  }
  function applyView() { layer.style.transform = `translate(${P.px}px, ${P.py}px) scale(${P.z})`; }
  function fitZoom() { const S = getS(); let r = 150; if (S) for (const n of NODES) if (lvl(S, n.id) > 0 || unlocked(S, n)) { const p = nodePos(n); r = Math.max(r, Math.hypot(p.x, p.y)); } return clamp(Math.min(map.clientWidth, map.clientHeight) / (2 * (r + 120)), 0.28, 1.0); }
  function centerOn(x, y, z = P.z, now = false) { P.z = clamp(z, 0.28, 1.6); P.px = map.clientWidth / 2 - (O + x) * P.z; P.py = map.clientHeight / 2 - (O + y) * P.z; layer.classList.toggle('smooth', !now); applyView(); }
  function zoomAt(mx, my, nz) { nz = clamp(nz, 0.28, 1.6); const wx = (mx - P.px) / P.z; const wy = (my - P.py) / P.z; P.z = nz; P.px = mx - wx * nz; P.py = my - wy * nz; layer.classList.add('smooth'); applyView(); }
  const scale = () => (P.g ? P.g.k : 1);
  map.addEventListener('wheel', (e) => { e.preventDefault(); const r = map.getBoundingClientRect(); zoomAt((e.clientX - r.left) / scale(), (e.clientY - r.top) / scale(), P.z * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });
  map.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('.pt-zoom')) return; const sx = e.clientX; const sy = e.clientY; const px0 = P.px; const py0 = P.py; const k = scale(); P.dragged = false; layer.classList.remove('smooth');
    const mv = (ev) => { const dx = (ev.clientX - sx) / k; const dy = (ev.clientY - sy) / k; if (Math.abs(dx) + Math.abs(dy) > 5) P.dragged = true; if (P.dragged) { P.px = px0 + dx; P.py = py0 + dy; applyView(); map.classList.add('drag'); } };
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); map.classList.remove('drag'); }; window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
  });
  map.addEventListener('click', (e) => { const b = e.target.closest('.pt-node'); if (!b || P.dragged) return; P.sel = b.dataset.id; snd.tapPh(); treeRender(); });

  // ---------------- Minispiele ----------------
  const cv = q('.pg-cv'); const g2 = cv.getContext('2d'); const over = q('.pg-over');
  cv.addEventListener('mousemove', (e) => { const r = cv.getBoundingClientRect(); P.mx = ((e.clientX - r.left) / Math.max(1, r.width)) * CW; P.mouse = true; });
  cv.addEventListener('mousedown', (e) => { if (e.button === 0) press(); });
  const flash = (G, t) => { G.flash = t; G.flashT = 0.9; };
  function rr(x, y, w, h, r) { g2.beginPath(); g2.moveTo(x + r, y); g2.arcTo(x + w, y, x + w, y + h, r); g2.arcTo(x + w, y + h, x, y + h, r); g2.arcTo(x, y + h, x, y, r); g2.arcTo(x, y, x + w, y, r); g2.closePath(); }
  function bg(top, bot) { g2.setTransform(2, 0, 0, 2, 0, 0); /* Leinwand ist doppelt so groß (scharf), gezeichnet wird in 280 × 480 */ const gr = g2.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, top); gr.addColorStop(1, bot); g2.fillStyle = gr; g2.fillRect(0, 0, CW, CH); }
  function flashText(G, y = 150) { if (G.flashT > 0) { g2.globalAlpha = clamp(G.flashT / 0.4, 0, 1); g2.fillStyle = '#ffcf5a'; g2.font = '900 26px Bahnschrift, sans-serif'; g2.textAlign = 'center'; g2.fillText(G.flash, CW / 2, y - (0.9 - G.flashT) * 30); g2.globalAlpha = 1; } }
  const GAMES = {
    regen: {
      title: 'Tabak-Regen', icon: '🍂', rules: 'Fang Tabak, Blättchen und Münzen mit dem Beutel. Maus bewegen oder A und D. Vorsicht, Mamas Hausschuh kostet 3 Sekunden!',
      init: () => ({ t: 20, x: CW / 2, items: [], spawn: 0.4, age: 0, got: { tabak: 0, papier: 0, geld: 0 }, shake: 0, flash: '', flashT: 0 }),
      update(G, dt) {
        G.age += dt; G.t -= dt; const k = P.keys; const dir = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
        if (dir) { G.x += dir * 340 * dt; P.mouse = false; } else if (P.mouse) G.x += (P.mx - G.x) * Math.min(1, dt * 14); G.x = clamp(G.x, 30, CW - 30);
        G.spawn -= dt; if (G.spawn <= 0) { G.spawn = Math.max(0.18, 0.46 - G.age * 0.012) * (0.7 + Math.random() * 0.6); const r = Math.random(); const type = r < 0.48 ? 'tabak' : r < 0.74 ? 'papier' : r < 0.86 ? 'geld' : 'schuh'; G.items.push({ type, x: 18 + Math.random() * (CW - 36), y: -20, vy: 115 + Math.random() * 70 + G.age * 6, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 4 }); }
        for (let i = G.items.length - 1; i >= 0; i--) { const it = G.items[i]; it.y += it.vy * dt; it.rot += it.vr * dt;
          if (it.y > 414 && it.y < 452 && Math.abs(it.x - G.x) < 36) { G.items.splice(i, 1); if (it.type === 'schuh') { G.t -= 3; G.shake = 0.35; flash(G, 'Autsch! −3 s'); snd.nope(); } else { G.got[it.type]++; snd.catchPh(it.type === 'geld'); } continue; }
          if (it.y > CH + 30) G.items.splice(i, 1); }
        if (G.shake > 0) G.shake -= dt; if (G.flashT > 0) G.flashT -= dt; return G.t <= 0;
      },
      draw(G) {
        bg('#0f1a2e', '#2a1a10'); g2.save(); if (G.shake > 0) g2.translate((Math.random() - 0.5) * 8, 0);
        g2.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 6; i++) g2.fillRect(20 + i * 46, 0, 2, CH);
        for (const it of G.items) { g2.save(); g2.translate(it.x, it.y); g2.rotate(it.rot);
          if (it.type === 'tabak') { g2.fillStyle = '#7a4a22'; g2.beginPath(); g2.ellipse(0, 0, 13, 7, 0, 0, 7); g2.fill(); g2.strokeStyle = '#3a2210'; g2.lineWidth = 1.5; g2.beginPath(); g2.moveTo(-11, 0); g2.lineTo(11, 0); g2.stroke(); }
          else if (it.type === 'papier') { g2.fillStyle = '#f7f3ea'; g2.fillRect(-12, -7, 24, 14); g2.fillStyle = '#1c3f86'; g2.fillRect(-12, -7, 24, 3); }
          else if (it.type === 'geld') { g2.fillStyle = '#ffcf5a'; g2.beginPath(); g2.arc(0, 0, 10, 0, 7); g2.fill(); g2.fillStyle = '#7a4a0a'; g2.font = '900 12px Bahnschrift, sans-serif'; g2.textAlign = 'center'; g2.fillText('€', 0, 4); }
          else { g2.fillStyle = '#ff8ab8'; g2.beginPath(); g2.ellipse(0, 0, 16, 8, 0, 0, 7); g2.fill(); g2.fillStyle = '#ffffff'; g2.beginPath(); g2.arc(9, -5, 5, 0, 7); g2.fill(); }
          g2.restore(); }
        const x = G.x; g2.fillStyle = '#5a3a1e'; g2.beginPath(); g2.moveTo(x - 34, 420); g2.quadraticCurveTo(x - 38, 462, x, 464); g2.quadraticCurveTo(x + 38, 462, x + 34, 420); g2.closePath(); g2.fill();
        g2.fillStyle = '#1e1208'; g2.beginPath(); g2.ellipse(x, 421, 34, 8, 0, 0, 7); g2.fill(); g2.strokeStyle = '#c98a3a'; g2.lineWidth = 2; g2.beginPath(); g2.ellipse(x, 421, 34, 8, 0, 0, 7); g2.stroke();
        g2.restore(); flashText(G, 170);
      },
      score: (G) => `⏱ ${Math.max(0, Math.ceil(G.t))} s · 🍂 ${G.got.tabak} · 📄 ${G.got.papier} · € ${G.got.geld}`,
      result: (G) => ({ reward: { tabak: G.got.tabak, papier: G.got.papier, geld: G.got.geld * 20 }, line: `${G.got.tabak} Tabak, ${G.got.papier} Blättchen und ${G.got.geld} Münzen gefangen.` }),
    },
    turm: {
      title: 'Kippen-Turm', icon: '📦', rules: 'Stapel die Packungen. Klick oder Leertaste lässt die Packung fallen. Was übersteht, fällt ab. Genau drauf ist perfekt. Bringt Respekt.',
      init: () => ({ stack: [{ x: 80, w: 120 }], cur: { x: 0, w: 120, dir: 1 }, speed: 120, falling: [], perfect: 0, cam: 0, over: false, overT: 0, flash: '', flashT: 0 }),
      press(G) {
        if (G.over) return; const top = G.stack[G.stack.length - 1]; const c = G.cur; const y = 452 - (G.stack.length + 1) * 22; let a = Math.max(c.x, top.x); let b = Math.min(c.x + c.w, top.x + top.w);
        if (Math.abs(c.x - top.x) < 5 && c.w >= top.w - 0.5) { a = top.x; b = top.x + top.w; G.perfect++; flash(G, 'Perfekt!'); snd.perfectPh(); }
        else if (b - a > 0) { snd.dropPh(); if (c.x < a) G.falling.push({ x: c.x, w: a - c.x, y, vy: 0, rot: 0, s: -1 }); if (c.x + c.w > b) G.falling.push({ x: b, w: c.x + c.w - b, y, vy: 0, rot: 0, s: 1 }); }
        if (b - a <= 0) { G.over = true; G.falling.push({ x: c.x, w: c.w, y, vy: 0, rot: 0, s: c.dir }); snd.nope(); return; }
        G.stack.push({ x: a, w: b - a }); G.speed = Math.min(380, G.speed + 11); const dir = G.stack.length % 2 ? 1 : -1; G.cur = { x: dir > 0 ? 0 : CW - (b - a), w: b - a, dir };
      },
      update(G, dt) {
        const c = G.cur; if (!G.over) { c.x += c.dir * G.speed * dt; if (c.x < 0) { c.x = 0; c.dir = 1; } if (c.x + c.w > CW) { c.x = CW - c.w; c.dir = -1; } }
        for (let i = G.falling.length - 1; i >= 0; i--) { const f = G.falling[i]; f.vy += 900 * dt; f.y += f.vy * dt; f.rot += dt * 3 * f.s; if (f.y > CH + 80) G.falling.splice(i, 1); }
        G.cam += (Math.max(0, (G.stack.length - 12) * 22) - G.cam) * Math.min(1, dt * 6); if (G.flashT > 0) G.flashT -= dt; if (G.over) G.overT += dt; return G.over && G.overT > 1.1;
      },
      draw(G) {
        bg('#1a0e24', '#3a1a12'); const pack = (x, y, w, alpha = 1) => { g2.globalAlpha = alpha; g2.fillStyle = '#f3ead8'; g2.fillRect(x, y, w, 21); g2.fillStyle = '#c5161d'; g2.fillRect(x, y, w, 9); g2.fillStyle = '#ffcf5a'; g2.fillRect(x, y + 9, w, 1.5); if (w > 46) { g2.fillStyle = '#7a0e12'; g2.font = '900 8px Bahnschrift, sans-serif'; g2.textAlign = 'center'; g2.fillText('LUDWIG', x + w / 2, y + 18); } g2.globalAlpha = 1; };
        g2.save(); g2.translate(0, G.cam); g2.fillStyle = '#5a3a1e'; g2.fillRect(40, 452, 200, 30);
        G.stack.forEach((s, i) => pack(s.x, 452 - (i + 1) * 22, s.w)); /* Packung i liegt auf Höhe 452 - (i+1)*22, die unterste ist der Sockel */
        if (!G.over) pack(G.cur.x, 452 - (G.stack.length + 1) * 22, G.cur.w);
        for (const f of G.falling) { g2.save(); g2.translate(f.x + f.w / 2, f.y + 10); g2.rotate(f.rot); pack(-f.w / 2, -10, f.w, 0.85); g2.restore(); }
        g2.restore(); flashText(G, 120);
      },
      score: (G) => `📦 ${G.stack.length - 1} hoch · ✨ ${G.perfect} perfekt`,
      result: (G) => { const h = G.stack.length - 1; return { reward: { resp: Math.floor(h / 2) + G.perfect }, line: `${h} Packungen hoch, ${G.perfect}× perfekt.` }; },
    },
    reflex: {
      title: 'Glut-Reflex', icon: '🔥', rules: 'Die Glut wandert über die Kippe. Klick oder Leertaste, wenn sie im grünen Feld ist. Zehn Versuche, Treffer hintereinander geben Combo-Geld.',
      init: () => ({ round: 0, rounds: 10, pos: 0, dir: 1, speed: 0.55, zone: { c: 0.5, w: 0.22 }, combo: 0, hits: 0, money: 0, flash: '', flashT: 0, marks: [], wait: 0 }),
      press(G) {
        if (G.wait > 0 || G.round >= G.rounds) return; const hit = Math.abs(G.pos - G.zone.c) <= G.zone.w / 2; G.marks.push(hit);
        if (hit) { G.combo++; G.hits++; G.money += 10 * G.combo; flash(G, G.combo > 2 ? `Combo ×${G.combo}!` : 'Treffer!'); snd.hitPh(G.combo); G.speed *= 1.1; G.zone.w = Math.max(0.07, G.zone.w * 0.9); } else { G.combo = 0; flash(G, 'Daneben!'); snd.nope(); }
        G.round++; G.wait = 0.4; G.zone = { c: 0.12 + Math.random() * 0.76, w: G.zone.w };
      },
      update(G, dt) { if (G.wait > 0) G.wait -= dt; if (G.round < G.rounds && G.wait <= 0) { G.pos += G.dir * G.speed * dt; if (G.pos > 1) { G.pos = 1; G.dir = -1; } if (G.pos < 0) { G.pos = 0; G.dir = 1; } } if (G.flashT > 0) G.flashT -= dt; return G.round >= G.rounds && G.wait <= 0; },
      draw(G) {
        bg('#120a06', '#2c1206'); const x0 = 40; const x1 = 248; const y = 250; const L = x1 - x0;
        g2.fillStyle = '#d9822b'; g2.fillRect(x0 - 34, y - 11, 34, 22); g2.fillStyle = '#f7f3ea'; g2.fillRect(x0, y - 11, L, 22);
        g2.fillStyle = 'rgba(90,255,140,.55)'; g2.fillRect(x0 + (G.zone.c - G.zone.w / 2) * L, y - 15, G.zone.w * L, 30);
        const ex = x0 + G.pos * L; const gl = g2.createRadialGradient(ex, y, 2, ex, y, 26); gl.addColorStop(0, '#fff2a0'); gl.addColorStop(0.3, '#ff7a1a'); gl.addColorStop(1, 'rgba(255,60,0,0)'); g2.fillStyle = gl; g2.beginPath(); g2.arc(ex, y, 26, 0, 7); g2.fill();
        for (let i = 0; i < G.rounds; i++) { g2.fillStyle = i < G.marks.length ? (G.marks[i] ? '#5aff8c' : '#ff4a2a') : 'rgba(255,255,255,.18)'; g2.beginPath(); g2.arc(41 + i * 22, 120, 7, 0, 7); g2.fill(); }
        g2.fillStyle = '#ffcf5a'; g2.font = '800 15px Bahnschrift, sans-serif'; g2.textAlign = 'center'; g2.fillText(`Combo ×${G.combo}`, CW / 2, 340); flashText(G, 200);
      },
      score: (G) => `🎯 ${G.hits}/${G.round} · ${(G.money / 100).toFixed(2).replace('.', ',')} €`,
      result: (G) => ({ reward: { geld: G.money, resp: Math.floor(G.hits / 4) }, line: `${G.hits} von ${G.rounds} Treffern.` }),
    },
  };
  function openGame(kind) {
    const D = GAMES[kind]; if (!D) return; show('game'); P.game = { kind, state: 'intro', G: D.init() }; q('.pg-title').textContent = D.title; q('.pg-score').textContent = '';
    over.classList.remove('hidden'); q('.pg-big').textContent = D.icon; over.querySelector('h3').textContent = D.title; over.querySelector('p').textContent = D.rules; q('.pg-go').textContent = 'Start'; D.draw(P.game.G);
  }
  function startPlay() { const g = P.game; if (!g || P.limitOn) return; g.G = GAMES[g.kind].init(); g.state = 'play'; over.classList.add('hidden'); P.keys = {}; snd.tapPh(); }
  function finishGame(forced = false) {
    const g = P.game; if (!g || g.state !== 'play') return; g.state = 'end'; const D = GAMES[g.kind]; const res = D.result(g.G); const got = onReward(g.kind, res.reward) || res.reward;
    const parts = []; if (got.tabak) parts.push(`+${got.tabak} Tabak`); if (got.papier) parts.push(`+${got.papier} Blättchen`); if (got.geld) parts.push(`+${(got.geld / 100).toFixed(2).replace('.', ',')} €`); if (got.resp) parts.push(`+${got.resp} Respekt`);
    over.classList.remove('hidden'); q('.pg-big').textContent = parts.length ? '🏆' : '😬'; over.querySelector('h3').textContent = forced ? 'Zeit ist um!' : parts.length ? 'Geschafft!' : 'Nichts gewonnen'; over.querySelector('p').textContent = `${res.line} ${parts.length ? parts.join(', ') + '.' : ''}`; q('.pg-go').textContent = 'Nochmal';
    if (parts.length) snd.buy();
  }
  function stopGame() { P.game = null; over.classList.add('hidden'); }
  function press() { const g = P.game; if (!g || g.state !== 'play' || P.limitOn) return; const D = GAMES[g.kind]; if (D.press) D.press(g.G); }

  // ---------------- Takt (aus ludwig.js, jedes Bild) und Tasten ----------------
  function tick(dt) {
    if (!P.open) return; P.uiT += dt; if (P.uiT > 0.2) { P.uiT = 0; status(); if (P.view === 'home') renderHome(); if (P.view === 'time') renderTime(); if (P.view === 'lager') renderLager(); if (P.view === 'chat') renderChat(); if (P.view === 'tree') treeHead(); }
    if (P.view === 'tree' && (P.treeT += dt) > 0.6) { P.treeT = 0; treeRender(); }
    const g = P.game; if (g && P.view === 'game') { const D = GAMES[g.kind]; if (g.state === 'play') { if (D.update(g.G, Math.min(dt, 0.05))) finishGame(); q('.pg-score').textContent = D.score(g.G); } D.draw(g.G); }
    if (P.limitOn) { P.limitT -= dt; if (P.limitT <= 0) { P.limitOn = false; onClose(); } }
  }
  function key(code) {
    if (!P.open) return false; if (P.game && P.view === 'game') { P.keys[code] = true; if (code === 'Space' || code === 'Enter') { if (P.game.state === 'play') press(); else if (!P.limitOn) startPlay(); } return true; }
    if (P.view === 'tree' && (code === 'Equal' || code === 'NumpadAdd')) { zoomAt(map.clientWidth / 2, map.clientHeight / 2, P.z * 1.25); return true; } if (P.view === 'tree' && (code === 'Minus' || code === 'NumpadSubtract')) { zoomAt(map.clientWidth / 2, map.clientHeight / 2, P.z * 0.8); return true; }
    return false;
  }
  function keyUp(code) { P.keys[code] = false; }
  return { open, close, tick, key, keyUp, back, limit, openApp, get isOpen() { return P.open; }, get view() { return P.view; }, get land() { return P.land; }, get game() { return P.game; }, select: (id) => { P.sel = id; treeRender(); }, buy, root, press, finishGame, treeRender };
}
