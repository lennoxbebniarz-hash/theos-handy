// Theos Seitenscheidel - Ludwig: LudwigOS, der Gaming-PC als eigenes kleines Windows. Hochfahren, Desktop mit Symbolen, eigene Maus im Bildschirm,
// Fenster zum Verschieben, Startmenü, Taskleiste mit Uhr. Browser mit Ladebalken und dem Shop „kippen-tuning.shop“ (Upgrades mit Zahlungs-Ladebalken),
// die Zocken-App ist von Mama gesperrt, dazu Ludwigs Plan.txt und der Papierkorb. Alles HTML und SVG, keine fremden Dateien.
import { UPGRADES, UP_ORDER, tier, nextTier, buyUpgrade, euro, TOOLS, SORTEN, SORT_ORDER, sortUnlocked, buyTool, toolPrice } from './ludwiglogic.js';
import { MACHINES, MACHINE_IDS, machineOffer, buyMachine, bunkerOpen } from './ludwigbunker.js';
import { NODE } from './ludwigskills.js';
import { RAEDER, RAD_IDS, hatRad, kaufeRad, ZIMMER, ZIMMER_IDS, zimmerPreis, zimmerZahl, kaufeZimmer, TARN_JE } from './ludwigextra.js'; // Abstimmung Paket 4
import { markeApp } from './ludwigextraui.js';
import { SORTMASCHINEN, SM_IDS, smFrei, smPreis, smKaufen } from './ludwigbunker3.js'; // Abstimmung Paket 5
const EMO = (e) => `<span class="os-emoji">${e}</span>`;

const ICONS = {
  shop: '<svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="5" fill="#1d2433"/><rect x="4" y="8" width="40" height="8" rx="4" fill="#ff7a1a"/><circle cx="10" cy="12" r="1.6" fill="#fff"/><circle cx="15" cy="12" r="1.6" fill="#fff"/><rect x="17" y="21" width="5" height="15" fill="#f7f3ea"/><rect x="23" y="19" width="5" height="17" fill="#f7f3ea"/><rect x="29" y="22" width="5" height="14" fill="#f7f3ea"/><rect x="17" y="21" width="5" height="3" fill="#d88a3a"/><rect x="23" y="19" width="5" height="3" fill="#d88a3a"/><rect x="29" y="22" width="5" height="3" fill="#d88a3a"/></svg>',
  zocken: '<svg viewBox="0 0 48 48"><path d="M10 18c2-5 26-5 28 0l4 14c1 5-5 7-8 3l-4-5H18l-4 5c-3 4-9 2-8-3Z" fill="#3a3f52"/><circle cx="33" cy="22" r="2" fill="#ff5a5a"/><circle cx="37" cy="26" r="2" fill="#5ad0ff"/><path d="M14 24h7M17.5 20.5v7" stroke="#cfd6dc" stroke-width="2.5" stroke-linecap="round"/><circle cx="36" cy="36" r="9" fill="#c5161d" stroke="#fff" stroke-width="2"/><path d="M31 31l10 10" stroke="#fff" stroke-width="3"/></svg>',
  notes: '<svg viewBox="0 0 48 48"><rect x="9" y="5" width="30" height="38" rx="3" fill="#f7f3ea"/><rect x="9" y="5" width="30" height="7" rx="3" fill="#2a8aff"/><path d="M14 19h20M14 25h20M14 31h14" stroke="#9aa3ad" stroke-width="2"/></svg>',
  trash: '<svg viewBox="0 0 48 48"><path d="M13 14h22l-2 28H15Z" fill="#b8c4d0" stroke="#6a7682" stroke-width="1.5"/><rect x="10" y="10" width="28" height="5" rx="2" fill="#8a96a2"/><path d="M20 19v18M24 19v18M28 19v18" stroke="#6a7682" stroke-width="1.5"/></svg>',
  marke: '<svg viewBox="0 0 48 48"><path d="M6 8h20l17 17-18 18L6 24Z" fill="#c5161d" stroke="#ffcf5a" stroke-width="2"/><circle cx="15" cy="17" r="3.5" fill="#1d2433"/><path d="M26 20l2.2 5 5.3.5-4 3.6 1.2 5.2-4.7-2.8-4.6 2.8 1.2-5.2-4-3.6 5.3-.5Z" fill="#fff6e6"/></svg>',
  logo: '<svg viewBox="0 0 48 48"><rect x="4" y="4" width="18" height="18" rx="2" fill="#ff7a1a"/><rect x="26" y="4" width="18" height="18" rx="2" fill="#ffb347"/><rect x="4" y="26" width="18" height="18" rx="2" fill="#ffb347"/><rect x="26" y="26" width="18" height="18" rx="2" fill="#ff7a1a"/></svg>',
  box: ['<svg viewBox="0 0 64 48"><rect x="8" y="16" width="48" height="24" fill="#c98f56" stroke="#5a3a1a" stroke-width="2"/><rect x="6" y="10" width="52" height="8" fill="#b07a44" stroke="#5a3a1a" stroke-width="2" transform="rotate(-6 32 14)"/><text x="32" y="33" text-anchor="middle" font-size="8" font-weight="900" fill="#3a1e0a" font-family="Segoe Print, sans-serif">NICHT ÖFFNEN</text></svg>',
    '<svg viewBox="0 0 64 48"><rect x="6" y="12" width="52" height="30" fill="#b08a5a" stroke="#4a3218" stroke-width="2"/><path d="M6 22h52M6 32h52" stroke="#4a3218" stroke-width="2"/><path d="M10 12v30M54 12v30" stroke="#6a4a28" stroke-width="3"/></svg>',
    '<svg viewBox="0 0 64 48"><rect x="6" y="14" width="52" height="28" rx="4" fill="#6a3a1e" stroke="#2a1a10" stroke-width="2"/><rect x="24" y="8" width="16" height="7" rx="3" fill="none" stroke="#2a1a10" stroke-width="3"/><path d="M18 14v28M46 14v28" stroke="#2a1a10" stroke-width="3"/><rect x="28" y="24" width="8" height="6" rx="1" fill="#d0b070"/></svg>',
    '<svg viewBox="0 0 64 48"><rect x="12" y="2" width="40" height="44" fill="#d8c8a8" stroke="#5a4a2a" stroke-width="2"/><path d="M12 16h40M12 30h40" stroke="#5a4a2a" stroke-width="2"/><g fill="#f7f3ea"><rect x="16" y="9" width="32" height="5"/><rect x="16" y="23" width="32" height="5"/><rect x="16" y="37" width="32" height="5"/></g></svg>'],
  pocket: ['<svg viewBox="0 0 64 48"><path d="M20 30c0-6 6-10 12-10s12 4 12 10v8H20Z" fill="#e2b08c" stroke="#8a5a3a" stroke-width="2"/></svg>',
    '<svg viewBox="0 0 64 48"><path d="M16 8h32v20c0 10-8 14-16 16-8-2-16-6-16-16Z" fill="#2c4a7a" stroke="#14243e" stroke-width="2"/><path d="M16 14h32" stroke="#f0c060" stroke-width="2" stroke-dasharray="3 3"/></svg>',
    '<svg viewBox="0 0 64 48"><path d="M4 22c10-4 46-4 56 0" stroke="#2a2a2a" stroke-width="4" fill="none"/><rect x="18" y="18" width="28" height="18" rx="7" fill="#2f8a6a" stroke="#14402e" stroke-width="2"/><path d="M22 24h20" stroke="#cfd6dc" stroke-width="2"/></svg>',
    '<svg viewBox="0 0 64 48"><rect x="16" y="8" width="32" height="36" rx="8" fill="#c0332a" stroke="#5a1410" stroke-width="2"/><rect x="21" y="22" width="22" height="14" rx="3" fill="#8a221c"/><path d="M24 8c0-6 16-6 16 0" stroke="#5a1410" stroke-width="3" fill="none"/></svg>'],
  roller: ['<svg viewBox="0 0 64 48"><path d="M14 30c6-6 12-6 18 0s12 6 18 0" stroke="#e2b08c" stroke-width="8" stroke-linecap="round" fill="none"/></svg>',
    '<svg viewBox="0 0 64 48"><rect x="8" y="22" width="48" height="14" rx="3" fill="#8a6a3a" stroke="#4a3218" stroke-width="2"/><rect x="14" y="18" width="36" height="6" rx="3" fill="#f7f3ea"/></svg>',
    '<svg viewBox="0 0 64 48"><rect x="10" y="14" width="44" height="22" rx="4" fill="#3a3f52" stroke="#14161c" stroke-width="2"/><rect x="16" y="20" width="22" height="8" rx="4" fill="#f7f3ea"/><circle cx="46" cy="25" r="5" fill="#ff7a1a"/></svg>',
    '<svg viewBox="0 0 64 48"><rect x="6" y="10" width="52" height="30" rx="6" fill="#141418" stroke="#ffcf5a" stroke-width="2"/><rect x="12" y="18" width="26" height="8" rx="4" fill="#f7f3ea"/><path d="M44 16l6 6-6 6" stroke="#ffcf5a" stroke-width="3" fill="none"/><text x="32" y="37" text-anchor="middle" font-size="7" font-weight="900" fill="#ffcf5a" font-family="Bahnschrift, sans-serif">PRO</text></svg>'],
};
const SHOP_NAMES = { box: 'Aufbewahrung', pocket: 'Tragen', roller: 'Drehen', sack: 'Einkaufen', kiste: 'Material lagern', pack: 'Verpackung', duft: 'Tarnung', akku: 'Handy' };
ICONS.sack = ['🎽', '🎒', '🏕️', '🧳'].map(EMO); ICONS.pack = ['✋', '🥪', '🥫', '💎'].map(EMO); ICONS.duft = ['🌬️', '🌲', '🌀', '⚗️'].map(EMO); ICONS.akku = ['📱', '🔋', '🔌', '📲'].map(EMO); ICONS.kiste = ['🧺', '🧰', '📦', '🗃️'].map(EMO); // Materialkiste (seit 2026-11-20)
const REVIEWS = ['★★★★★ „Mama hat nix gemerkt.“ – B., 15', '★★★★☆ „Kam schnell, Koffer riecht nach Opa.“ – T., 16', '★★★★★ „Bester Shop. Diskret.“ – anonym'];

// desk (optional): { brand, title, icons: [[key, Name, svg]], open(key, api), tick(dt, api) } für einen PC mit eigenen Apps (Bunker-PC)
export function createLudwigPC({ root, snd, getS, onChange, onClose, desk = null }) {
  const DESK = desk ? desk.icons : [['shop', 'Kippen-Tuning', ICONS.shop], ['marke', 'Meine Marke', ICONS.marke], ['zocken', 'Zocken', ICONS.zocken], ['notes', 'Plan.txt', ICONS.notes], ['trash', 'Papierkorb', ICONS.trash]];
  root.innerHTML = `<div class="lw-os"><div class="os-bezel"><div class="os-screen">
    <div class="os-wall"><div class="os-wallogo">${ICONS.logo}<b>${desk ? desk.title : 'LudwigOS'}</b></div></div>
    <div class="os-desk">${DESK.map(([k, n, ic]) => `<button type="button" class="os-icon" data-app="${k}">${ic}<span>${n}</span></button>`).join('')}</div>
    <div class="os-wins"></div>
    <div class="os-start hidden"><div class="os-user"><i>L</i><b>Ludwig</b></div>${(desk ? DESK : DESK.filter((d) => d[0] !== 'trash')).map(([k, n, ic]) => `<button type="button" data-app="${k}">${ic}${n}</button>`).join('')}<button type="button" class="os-off" data-act="off">⏻ Herunterfahren</button></div>
    <div class="os-task"><div class="os-tmid"><button type="button" class="os-tstart" data-act="start">${ICONS.logo}</button><div class="os-tapps"></div></div><div class="os-tray"><span class="os-wifi">📶</span><span class="os-clock"></span></div></div>
    <div class="os-cursor"></div><div class="os-boot"><div>${ICONS.logo}</div><b>LudwigOS</b><i></i></div>
  </div><div class="os-brand">${desk ? desk.brand : 'LUDWIG-GAMING'} <i></i></div></div></div>`;
  const os = root.querySelector('.lw-os'); const scr = root.querySelector('.os-screen'); const wins = root.querySelector('.os-wins'); const tapps = root.querySelector('.os-tapps'); const startM = root.querySelector('.os-start'); const cursor = root.querySelector('.os-cursor'); const boot = root.querySelector('.os-boot'); const clock = root.querySelector('.os-clock');
  const P = { open: false, z: 10, apps: new Map(), timers: [] };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); P.timers.push(t); return t; };
  const tick = () => { const d = new Date(); clock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
  // Eigene Maus: der echte Zeiger ist über dem Bildschirm unsichtbar, dafür läuft ein Windows-Pfeil mit
  scr.addEventListener('mousemove', (e) => { const r = scr.getBoundingClientRect(); cursor.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px)`; const hand = e.target.closest('button, .os-tbar, a, .os-card'); cursor.classList.toggle('hand', !!hand && !e.target.closest('.os-tbar')); cursor.classList.toggle('move', !!e.target.closest('.os-tbar') && !e.target.closest('button')); });
  scr.addEventListener('mousedown', () => { cursor.classList.add('down'); snd.ui(); }); window.addEventListener('mouseup', () => cursor.classList.remove('down'));

  // ---- Fenster
  function win(key, title, icon, body, { w = 640, h = 440 } = {}) {
    if (P.apps.has(key)) { const a = P.apps.get(key); focus(a); a.el.classList.remove('min'); return a; }
    const el = document.createElement('div'); el.className = 'os-win'; el.style.width = w + 'px'; el.style.height = h + 'px'; const n = P.apps.size; el.style.left = `calc(50% - ${w / 2}px + ${n * 26}px)`; el.style.top = `calc(46% - ${h / 2}px + ${n * 22}px)`;
    el.innerHTML = `<div class="os-tbar">${icon}<b>${title}</b><span class="os-tbtn"><button type="button" data-w="min">—</button><button type="button" data-w="max">▢</button><button type="button" data-w="close" class="x">✕</button></span></div><div class="os-body"></div>`;
    el.querySelector('.os-body').append(body); wins.append(el); const tb = document.createElement('button'); tb.type = 'button'; tb.className = 'os-tapp on'; tb.innerHTML = icon; tapps.append(tb);
    const a = { key, el, tb }; P.apps.set(key, a); focus(a);
    el.addEventListener('mousedown', () => focus(a)); tb.onclick = () => { if (el.classList.contains('min')) { el.classList.remove('min'); focus(a); } else el.classList.add('min'); };
    el.querySelector('[data-w=close]').onclick = () => closeWin(key); el.querySelector('[data-w=min]').onclick = () => el.classList.add('min'); el.querySelector('[data-w=max]').onclick = () => el.classList.toggle('max');
    const bar = el.querySelector('.os-tbar'); bar.addEventListener('mousedown', (e) => { if (e.target.closest('button') || el.classList.contains('max')) return; const r = el.getBoundingClientRect(); const sr = scr.getBoundingClientRect(); const ox = e.clientX - r.left; const oy = e.clientY - r.top; const mv = (ev) => { el.style.left = `${Math.max(-r.width + 80, Math.min(sr.width - 80, ev.clientX - sr.left - ox))}px`; el.style.top = `${Math.max(0, Math.min(sr.height - 90, ev.clientY - sr.top - oy))}px`; }; const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); }; window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up); });
    return a;
  }
  function focus(a) { P.z++; a.el.style.zIndex = P.z; for (const b of P.apps.values()) { b.el.classList.toggle('focus', b === a); b.tb.classList.toggle('on', b === a); } }
  function closeWin(key) { const a = P.apps.get(key); if (!a) return; a.el.classList.add('closing'); a.tb.remove(); P.apps.delete(key); later(() => a.el.remove(), 180); }
  const div = (cls, html) => { const d = document.createElement('div'); if (cls) d.className = cls; if (html !== undefined) d.innerHTML = html; return d; };

  // ---- Apps
  function openApp(k) {
    startM.classList.add('hidden'); if (desk) { desk.open(k, API); return; }
    if (k === 'shop') return openShop();
    if (k === 'marke') { win('marke', 'Meine Marke', ICONS.marke, markeApp({ getS, snd, gespeichert: () => onChange({ ok: true, marke: true }) }), { w: 470, h: 530 }); return; }
    if (k === 'zocken') { snd.nope(); const b = div('os-err', `<div class="os-errx">✕</div><div><b>Zugriff verweigert</b><p>Diese App wurde von <u>MAMA</u> gesperrt.<br>Grund: Zockverbot (bis auf Weiteres).</p><p class="os-small">Fehlercode 0xMAMA</p></div><div class="os-errbtns"><button type="button" class="os-ok">OK</button></div>`); const a = win('zocken', 'Zocken – Fehler', ICONS.zocken, b, { w: 440, h: 230 }); b.querySelector('.os-ok').onclick = () => closeWin('zocken'); a.el.classList.add('shake'); return; }
    if (k === 'notes') { const S = getS(); const b = div('os-notes', ''); const ta = document.createElement('pre'); ta.textContent = `PLAN (STRENG GEHEIM!!!)\n\n1. Kippen drehen\n2. Durchs Fenster verkaufen\n3. Größere Box kaufen\n4. Zigarettenboss werden\n5. Mama und Papa dürfen NICHTS merken\n\nBisher: ${S.stats.gedreht} Kippen gedreht, ${S.stats.kunden} Kunden, ${euro(S.stats.umsatz)} Umsatz.\n\nPS: Bruno kriegt Rabatt. Vielleicht.`; b.append(ta); win('notes', 'Plan.txt – Editor', ICONS.notes, b, { w: 460, h: 380 }); return; }
    if (k === 'trash') { win('trash', 'Papierkorb', ICONS.trash, div('os-empty', '<p>Der Papierkorb ist leer.</p><p class="os-small">Die Hausaufgaben sind auch weg.</p>'), { w: 420, h: 220 }); }
  }
  // Browser mit dem Shop: erst Ladebalken, dann die Seite
  function openShop() {
    const b = div('os-browser', `<div class="os-btool"><span class="os-nav">←</span><span class="os-nav">→</span><span class="os-nav os-reload">⟳</span><div class="os-url"><i>🔒</i>https://kippen-tuning.shop</div></div><div class="os-load"><i></i></div><div class="os-page"></div>`);
    const a = win('shop', 'Kippen-Tuning – Zubehör für Profis', ICONS.shop, b, { w: 820, h: 560 }); load(b); b.querySelector('.os-reload').onclick = () => load(b);
    return a;
  }
  function load(b) {
    const bar = b.querySelector('.os-load i'); const page = b.querySelector('.os-page'); page.innerHTML = '<div class="os-spin"><i></i><p>Verbindung wird hergestellt …</p></div>'; bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth; bar.style.transition = 'width 1.1s cubic-bezier(.3,.7,.2,1)'; bar.style.width = '100%'; b.querySelector('.os-load').classList.remove('done');
    later(() => { page.querySelector('p') && (page.querySelector('p').textContent = 'Seite wird geladen …'); }, 500);
    later(() => { b.querySelector('.os-load').classList.add('done'); renderShop(page); }, 1150);
  }
  function renderShop(page) {
    const S = getS(); page.innerHTML = `<header class="os-shead"><div class="os-slogo"><b>KIPPEN-TUNING</b><span>.shop</span></div><p>Zubehör für Profis. Diskret. Schnell. Ohne Fragen.</p><div class="os-acc">Guthaben: <b>${euro(S.geld)}</b></div></header><div class="os-grid"></div><footer class="os-sfoot">${REVIEWS.map((r) => `<span>${r}</span>`).join('')}</footer>`;
    const grid = page.querySelector('.os-grid');
    for (const k of UP_ORDER) {
      const cur = tier(S, k); const nx = nextTier(S, k); const ti = nx ? nx.i : S.up[k]; const c = div('os-card');
      const spec = (t) => t.spec || (t.cap ? `${t.cap.toLocaleString('de-DE')} ${k === 'box' ? 'Kippen Platz' : 'Kippen tragen'}` : `${t.speed}× so schnell`);
      c.innerHTML = `<div class="os-cat">${SHOP_NAMES[k]}</div><div class="os-img">${ICONS[k][ti]}</div><b>${nx ? nx.name : cur.name}</b><small>${nx ? nx.text : 'Du hast schon das Beste.'}</small><div class="os-spec">${nx ? `Jetzt: ${cur.name} → <em>${spec(nx)}</em>` : spec(cur)}</div>${nx ? `<div class="os-price">${euro(nx.preis)}</div><button type="button" class="os-buy" data-k="${k}">Jetzt kaufen</button>` : '<div class="os-sold">AUSVERKAUFT</div>'}`;
      if (nx && S.geld < nx.preis) c.classList.add('poor'); grid.append(c);
    }
    grid.onclick = (e) => { const bt = e.target.closest('.os-buy'); if (bt) checkout(page, bt.dataset.k); };
    // Bunker-Maschinen: im Boss-Plan freischalten, hier mit Geld kaufen, unten werden sie aufgebaut
    if (bunkerOpen(S)) {
      const sec = div('os-msec', '<h3>Bunker-Maschinen</h3><p>Im Boss-Plan freischalten, hier kaufen. Kalle liefert in den Bunker, dort wird aufgebaut.</p>'); const mg = div('os-grid os-mgrid');
      for (const id of MACHINE_IDS) { const o = machineOffer(S, id); const M = MACHINES[id]; const c = div('os-card' + (o.price !== null && S.geld < o.price ? ' poor' : '') + (o.allowed ? '' : ' locked'));
        c.innerHTML = `<div class="os-cat">${M.kind === 'hand' ? 'Handmaschine' : M.kind === 'auto' ? 'Automat' : M.kind === 'robo' ? 'Helfer' : M.kind === 'deko' ? 'Extra' : 'Nachschub'}</div><div class="os-img">${EMO(NODE[id].icon)}</div><b>${M.name}</b><small>${o.allowed ? `${o.have} von ${o.allowed} freigeschalteten gekauft` : 'Erst im Boss-Plan freischalten'}</small>`
          + (o.price !== null ? `<div class="os-price">${euro(o.price)}</div><button type="button" class="os-buy" data-k="m:${id}">Jetzt kaufen</button>` : `<div class="os-sold">${o.allowed ? 'ALLE GEKAUFT' : 'GESPERRT'}</div>`); mg.append(c); }
      sec.append(mg); grid.after(sec); mg.onclick = (e) => { const bt = e.target.closest('.os-buy'); if (bt) checkout(page, bt.dataset.k); };
    }
    // Werkzeug für die neuen Sorten (seit 2026-11-20): im Boss-Plan freischalten (Produktion), hier mit Geld kaufen, das Material hat Kalle
    if (Object.values(TOOLS).some((T) => sortUnlocked(S, T.sorte))) {
      const sec = div('os-msec', '<h3>Werkzeug für neue Sorten</h3><p>Im Boss-Plan (Produktion) freischalten, hier kaufen. Das Material dazu hat Kalle im Hinterhof.</p>'); const tg = div('os-grid os-mgrid');
      for (const [k, T] of Object.entries(TOOLS)) { const free = sortUnlocked(S, T.sorte); const noB = !!T.bunker && !bunkerOpen(S); const have = !!(S.tools && S.tools[k]); const c = div('os-card' + (free && !have && S.geld < toolPrice(S, k) ? ' poor' : '') + (free && !noB ? '' : ' locked'));
        c.innerHTML = `<div class="os-cat">${T.cat || SORTEN[T.sorte].plural}</div><div class="os-img">${EMO(T.ico)}</div><b>${T.name}</b><small>${!free ? 'Erst im Boss-Plan freischalten' : noB ? 'Braucht den Bunker: erst die Falltür im Boss-Plan (Tarnung).' : T.text}</small>` + (have ? '<div class="os-sold">GEKAUFT</div>' : free && !noB ? `<div class="os-price">${euro(toolPrice(S, k))}</div><button type="button" class="os-buy" data-k="t:${k}">Jetzt kaufen</button>` : '<div class="os-sold">GESPERRT</div>'); tg.append(c); }
      sec.append(tg); grid.after(sec); tg.onclick = (e) => { const bt = e.target.closest('.os-buy'); if (bt) checkout(page, bt.dataset.k); };
    }
    paketShop(page, S);
  }
  // Fahren und Zimmer ausbauen (Abstimmung Paket 4)
  function paketShop(page, S) {
    const bereich = (titel, text, ids, karte) => {
      const sec = div('os-msec', `<h3>${titel}</h3><p>${text}</p>`); const g = div('os-grid os-mgrid');
      for (const id of ids) {
        const { k, T, preis, hat, cat } = karte(id);
        const c = div('os-card' + (!hat && S.geld < preis ? ' poor' : ''));
        c.innerHTML = `<div class="os-cat">${cat}</div><div class="os-img">${EMO(T.ico)}</div><b>${T.name}</b><small>${T.text}</small>${hat ? '<div class="os-sold">GEKAUFT</div>' : `<div class="os-price">${euro(preis)}</div><button type="button" class="os-buy" data-k="${k}">Jetzt kaufen</button>`}`;
        g.append(c);
      }
      g.onclick = (e) => { const bt = e.target.closest('.os-buy'); if (bt) checkout(page, bt.dataset.k); };
      sec.append(g); page.querySelector('.os-sfoot').before(sec);
    };
    if (bunkerOpen(S) && S.bunker.sm && SM_IDS.some((id) => smFrei(S, id))) bereich('Sorten-Maschinen', 'Je eine für Stopfkippen, Aromakippen, Zigarillos und Liquid. Frei, sobald die Sorte im Boss-Plan frei ist (Liquid: mit der Werkbank). Sie füllen die Regale im Bunker. Joints bleiben Handarbeit.', SM_IDS.filter((id) => smFrei(S, id)), (id) => ({ k: `m3:${id}`, T: { name: SORTMASCHINEN[id].name, ico: { stopf: '🎯', aroma: '🍒', zigarillo: '🟤', liquid: '💧' }[id], text: id === 'liquid' ? `Macht ${SORTMASCHINEN[id].rate} Liquid-Base pro Minute für die Werkbank.` : `Macht ${SORTMASCHINEN[id].rate} pro Minute, nimmt Material aus der Kiste.` }, preis: smPreis(S, id), hat: S.bunker.sm[id].have, cat: 'Bunker' }));
    bereich('Fahren', 'Nur draußen: mit B auf- und absteigen. Einmal gekauft, hat jeder aus dem Zimmer eins.', RAD_IDS, (id) => ({ k: `r:${id}`, T: RAEDER[id], preis: RAEDER[id].preis, hat: hatRad(S, id), cat: 'Fahren' }));
    bereich('Zimmer ausbauen', `Jede Sache tarnt ein bisschen: Mama sucht ${Math.round(TARN_JE * 100)} % seltener. Du hast ${zimmerZahl(S)} von ${ZIMMER_IDS.length}.`, ZIMMER_IDS, (id) => ({ k: `z:${id}`, T: ZIMMER[id], preis: zimmerPreis(S, id), hat: !!S.deko[id], cat: 'Zimmer' }));
  }
  // Kasse: Zahlungs-Ladebalken, dann Erfolg oder Ablehnung
  function checkout(page, k) {
    const S = getS(); const tool = k.startsWith('t:') ? k.slice(2) : null; const mach = k.startsWith('m:') ? k.slice(2) : null; const mo = mach ? machineOffer(S, mach) : null; const rad = k.startsWith('r:') ? k.slice(2) : null; const zim = k.startsWith('z:') ? k.slice(2) : null; const sm = k.startsWith('m3:') ? k.slice(3) : null;
    const nx = sm ? (S.bunker.sm[sm].have ? null : { name: SORTMASCHINEN[sm].name, preis: smPreis(S, sm) }) : rad ? (hatRad(S, rad) ? null : RAEDER[rad]) : zim ? (S.deko[zim] ? null : { name: ZIMMER[zim].name, preis: zimmerPreis(S, zim) }) : tool ? (S.tools[tool] ? null : { name: TOOLS[tool].name, preis: toolPrice(S, tool) }) : mach ? (mo.price === null ? null : { name: MACHINES[mach].name, preis: mo.price }) : nextTier(S, k); if (!nx) return; const m = div('os-modal', `<div class="os-mcard"><b>Zahlung wird verarbeitet …</b><p>${nx.name} · ${euro(nx.preis)}</p><div class="os-pbar"><i></i></div><small>Bitte das Fenster nicht schließen.</small></div>`); page.append(m);
    const bar = m.querySelector('.os-pbar i'); requestAnimationFrame(() => { bar.style.width = '100%'; });
    later(() => {
      const r = sm ? smKaufen(getS(), sm, { bunkerOpen }) : rad ? kaufeRad(getS(), rad) : zim ? kaufeZimmer(getS(), zim) : tool ? buyTool(getS(), tool) : mach ? buyMachine(getS(), mach) : buyUpgrade(getS(), k); const card = m.querySelector('.os-mcard');
      if (r.ok) { card.classList.add('ok'); card.innerHTML = `<div class="os-check">✓</div><b>Bestellung erfolgreich!</b><p>${sm ? `${r.tier.name} wird im Bunker aufgebaut, in der Reihe vor dem Lager.` : rad ? `${r.tier.name} steht draußen rechts vom Fenster, außerhalb der Kamera. Rausklettern, dann B.` : zim ? `${r.tier.name}: steht jetzt in Ludwigs Zimmer.` : tool === 'werkbank' ? 'Die Werkbank wird im Bunker aufgebaut: an der Rückwand unter dem großen Bildschirm. Teile gibt es bei Elektro-Erwin gegenüber.' : tool ? `${r.tier.name} liegt jetzt auf Ludwigs Tisch. Hinsetzen und Taste ${SORT_ORDER.indexOf(TOOLS[tool].sorte) + 1} drücken.` : mach ? `${r.tier.name} kommt in den Bunker und wird dort aufgebaut.` : `${r.tier.name} ist da. Kalle hat es heimlich vors Fenster gelegt.`}</p><button type="button" class="os-ok">Weiter einkaufen</button>`; snd.buy(); onChange(r); }
      else { card.classList.add('bad'); card.innerHTML = `<div class="os-check">✕</div><b>Zahlung abgelehnt</b><p>${r.why === 'geld' ? `Zu wenig Guthaben. Dir fehlen ${euro(r.fehlt)}.` : r.why === 'need' ? 'Erst im Boss-Plan freischalten.' : r.why === 'bunker' ? 'Erst den Bunker freischalten (Falltür).' : 'Das gibt es nicht mehr.'}</p><button type="button" class="os-ok">Schade</button>`; snd.nope(); }
      card.querySelector('.os-ok').onclick = () => { m.remove(); renderShop(page); };
    }, 1500);
  }

  // ---- Start, Taskleiste
  root.addEventListener('click', (e) => {
    const ic = e.target.closest('[data-app]'); if (ic && ic.classList.contains('os-icon')) { if (ic.dataset.t && performance.now() - Number(ic.dataset.t) < 450) { delete ic.dataset.t; openApp(ic.dataset.app); } else { root.querySelectorAll('.os-icon.sel').forEach((x) => x.classList.remove('sel')); ic.classList.add('sel'); ic.dataset.t = String(performance.now()); } return; }
    if (ic) { openApp(ic.dataset.app); return; }
    const act = e.target.closest('[data-act]'); if (act && act.dataset.act === 'start') { startM.classList.toggle('hidden'); return; } if (act && act.dataset.act === 'off') { shutdown(); return; }
    if (!e.target.closest('.os-start')) startM.classList.add('hidden');
  });
  root.addEventListener('dblclick', (e) => { const ic = e.target.closest('.os-icon'); if (ic) openApp(ic.dataset.app); });
  const API = { win, closeWin, div, later, getS, snd, icons: ICONS };
  function open() { P.open = true; root.classList.remove('hidden'); os.classList.remove('off'); boot.classList.remove('hidden', 'gone'); tick(); P.clock = setInterval(tick, 5000); later(() => boot.classList.add('gone'), 900); later(() => boot.classList.add('hidden'), 1300); }
  function shutdown() { if (!P.open) return; P.open = false; startM.classList.add('hidden'); os.classList.add('off'); later(() => { reset(); root.classList.add('hidden'); onClose(); }, 380); }
  function reset() { for (const k of [...P.apps.keys()]) { const a = P.apps.get(k); a.el.remove(); a.tb.remove(); } P.apps.clear(); clearInterval(P.clock); for (const t of P.timers) clearTimeout(t); P.timers = []; }
  return { open, shutdown, get isOpen() { return P.open; }, openApp, apps: P.apps, root, tick: (dt) => { if (desk && desk.tick && P.open) desk.tick(dt, API); } };
}
