// Theos Seitenscheidel - Mehrspieler: Menü (Lobby erstellen / beitreten / Spielerübersicht / Status) und Sitzungsablauf: Race (Rollen, gemeinsame Roadmap) oder Moonsweeper 2.
import { createNet, peerTransport, scanLobbies, MP_VERSION, MAX_PLAYERS, BASE_PLAYERS } from './net.js';
const moonCap = (sv) => (!sv || sv.p4 ? 4 : 3); // wie moonCap in moon.js: neue Firmen bis vier, alte Stände drei
import { ROLES, ROLE_NAME, resolveRoles, chooseRole } from './racemp.js';
import { SEATS, END_NAMES, END_TEXT } from './chesslogic.js';
import { SEATS as ARC_SEATS } from './shipslogic.js';
import { saubereZahl, rangliste } from './zimmerwahl.js';

export function createMp({ schulbuch = null, $, toast, store, moon, park, chess, pong, ships, raus, baron, kraft, casino, strom, bruno, ozean, saege, ludwig, showScreen, openMenu, startRace, openRoadmap, race, transport, trophaeen = null, onLaunch = () => {} }) { // onLaunch: kurz bevor ein Spiel aus der Lobby den Bildschirm übernimmt
  const GAMES = { chess, pong, ships, raus, baron, kraft, casino, strom, bruno, ozean, saege, ...(ludwig ? { ludwig } : {}) }; // Brett- und Arcade-Spiele teilen dieselbe Schnittstelle (seit 2026-11-21 auch Ludwig Zigaretti)
  const savedMode = store.get('mpMode', 'race');
  const M = { net: null, name: store.get('mpName', 'Spieler'), inGame: false, kind: 'race', lobby: { mode: ['moon', 'park', 'chess', 'pong', 'ships', 'raus', 'baron', 'kraft', 'casino', 'strom', 'bruno', 'ozean', 'saege'].includes(savedMode) ? savedMode : 'race', roles: {}, end: store.get('mpChessEnd', 2) } };
  const el = { name: $('mpName'), code: $('mpCode'), host: $('mpHost'), join: $('mpJoin'), entry: $('mpEntry'), room: $('mpRoom'), codeShow: $('mpCodeShow'), copy: $('mpCopy'), slots: $('mpSlots'), count: $('mpCount'), start: $('mpStart'), leave: $('mpLeave'), status: $('mpStatus'), modeRow: $('mpModeRow'), modePark: $('mpModePark'), modeRace: $('mpModeRace'), modeMoon: $('mpModeMoon'), modeChess: $('mpModeChess'), modePong: $('mpModePong'), modeShips: $('mpModeShips'), modeRaus: $('mpModeRaus'), modeBaron: $('mpModeBaron'), modeKraft: $('mpModeKraft'), modeSaege: $('mpModeSaege'), modeCasino: $('mpModeCasino'), modeStrom: $('mpModeStrom'), modeBruno: $('mpModeBruno'), modeOzean: $('mpModeOzean'), chessRow: $('mpChessRow'), info: $('mpLobbyInfo') };
  el.name.value = M.name;
  // Spielerzahl: vier Plätze gibt es nur bei neuen Spielständen (ab 1.14.0) von Strom, Ozean, Big Bruno, Casino und Moonsweeper. Alte Stände und alle anderen Modi bleiben bei drei.
  const SLOT_GAMES = { ludwig: { saves: () => ludwig && ludwig.saves, fresh: 'Ludwigs Zimmer' }, casino: { saves: () => casino && casino.saves, fresh: 'Online-Familie' }, strom: { saves: () => strom && strom.saves, fresh: 'Online-Halle' }, bruno: { saves: () => bruno && bruno.saves, fresh: 'Online-Einsatz' }, ozean: { saves: () => ozean && ozean.saves, fresh: 'Online-Ozean' } };
  const SEAT_NAMES = [...ARC_SEATS, 'Grün'];
  const slotSaves = () => { const g = SLOT_GAMES[M.lobby.mode]; return g ? g.saves() : null; };
  function lobbyCap() { // nur beim Host: wie viele dürfen in die Lobby
    const mode = M.lobby.mode; if (mode === 'saege' || mode === 'ludwig') return MAX_PLAYERS; if (mode === 'moon') { let sv = null; try { sv = store.get('moon.save', null); } catch (e) { /* kein Stand */ } return moonCap(sv); }
    const sv = slotSaves(); if (!sv) return BASE_PLAYERS; return sv.cap(M.lobby.slot && sv.get(M.lobby.slot) ? M.lobby.slot : null);
  }
  const capOf = () => Math.min(MAX_PLAYERS, M.lobby.cap || BASE_PLAYERS);
  // Rangliste (Abstimmung Paket 3): nur Pokale, nur in der Lobby. Jeder meldet seine Zahl dem Gastgeber, der verteilt die Liste. Gespeichert wird nichts.
  const R = { zahlen: new Map(), gesagt: null };
  const rangNeu = () => { R.zahlen.clear(); R.gesagt = null; };
  function meldePokale(frisch = false) {
    const n = M.net; if (!trophaeen || !n || !n.role || !n.me || M.inGame) return;
    let z; try { z = saubereZahl(trophaeen(frisch)); } catch (e) { console.warn('[mp] Pokale nicht lesbar', e); return; }
    const was = `${z.n}|${z.gold}`; if (!frisch && was === R.gesagt) return;
    R.gesagt = was;
    if (n.isHost()) { R.zahlen.set(n.me.id, z); verteilePokale(); } else n.send({ t: 'pokale', n: z.n, gold: z.gold });
  }
  function verteilePokale() {
    const n = M.net; if (!n || !n.isHost()) return;
    n.broadcast({ t: 'pokalliste', liste: n.players.filter((p) => R.zahlen.has(p.id)).map((p) => { const z = R.zahlen.get(p.id); return [p.id, z.n, z.gold]; }) });
    renderRang();
  }
  function pokalNachricht(net, from, m) {
    if (m.t === 'pokale') {
      if (!net.isHost() || !net.players.some((p) => p.id === from)) return;
      R.zahlen.set(from, saubereZahl(m));
      verteilePokale(); // auch bei gleicher Zahl: wer neu kommt, braucht die Liste
      return;
    }
    if (net.isHost() || !Array.isArray(m.liste)) return;
    R.zahlen.clear();
    for (const e of m.liste.slice(0, MAX_PLAYERS)) if (Array.isArray(e) && typeof e[0] === 'string') R.zahlen.set(e[0], saubereZahl({ n: e[1], gold: e[2] }));
    renderRang();
  }
  function renderRang() {
    const box = $('mpRang'); if (!box) return;
    const n = M.net; const reihe = n && n.role ? rangliste(n.players, R.zahlen) : [];
    box.classList.toggle('hidden', !reihe.length);
    const ol = $('mpRangListe'); ol.textContent = '';
    for (const p of reihe) {
      const li = document.createElement('li'); const platz = document.createElement('b'); const name = document.createElement('span'); const zahl = document.createElement('em');
      li.classList.toggle('erster', p.platz === 1 && p.n > 0 && reihe.length > 1);
      platz.textContent = `${p.platz}.`; name.textContent = p.name;
      zahl.textContent = `${p.n} ${p.n === 1 ? 'Pokal' : 'Pokale'}${p.gold ? `, ${p.gold} Gold` : ''}`;
      li.append(platz, name, zahl); ol.append(li);
    }
  }
  setInterval(() => meldePokale(), 3000);
  // Schul-Rangliste (2026-11-23): jeder schickt sein Rekordbuch an den Gastgeber, der mischt und verteilt es an alle. Werte wachsen nur, darum ist Mischen immer sicher.
  function meldeBuch() { const n = M.net; if (!schulbuch || !n || !n.role || n.isHost()) return; try { n.send({ t: 'schulbuch', b: schulbuch.holen() }); } catch (e) { console.warn('[mp] Rekordbuch', e); } }
  function buchNachricht(net, from, m) {
    if (!schulbuch || !m.b) return;
    if (net.isHost()) { if (!net.players.some((p) => p.id === from)) return; schulbuch.mischen(m.b); net.broadcast({ t: 'schulbuch', b: schulbuch.holen() }); } else schulbuch.mischen(m.b);
  }

  const setStatus = (text, kind = 'info') => { el.status.textContent = text; el.status.className = 'mpstatus ' + kind; };
  const myName = () => { const n = (el.name.value || '').trim().slice(0, 16) || 'Spieler'; M.name = n; store.set('mpName', n); return n; };
  const modeBtn = (mode) => ({ race: el.modeRace, park: el.modePark, moon: el.modeMoon, chess: el.modeChess, pong: el.modePong, ships: el.modeShips, raus: el.modeRaus, baron: el.modeBaron, kraft: el.modeKraft, saege: el.modeSaege, casino: el.modeCasino, strom: el.modeStrom, bruno: el.modeBruno, ozean: el.modeOzean })[mode];
  const EXTRA_LABEL = { ludwig: 'Ludwig Zigaretti' };
  const modeLabel = (mode) => { if (EXTRA_LABEL[mode]) return EXTRA_LABEL[mode]; const b = modeBtn(mode); return b ? b.textContent.trim() : mode; };
  // Offene Lobbys anklopfen und als Liste zeigen (Ludwig-Lobbys stehen im Ludwig-Startbildschirm)
  let scanning = false;
  async function scan() {
    if (M.net || scanning) return; scanning = true; const box = $('mpOpen'); box.textContent = ''; const wait = document.createElement('p'); wait.className = 'note'; wait.textContent = 'Suche offene Lobbys …'; box.append(wait);
    let list = []; try { list = (await scanLobbies({ transport: transport || peerTransport(), timeout: 9000 })).filter((l) => (M.fixed ? l.mode === M.fixed : l.mode !== 'ludwig')); } catch (e) { list = []; } scanning = false; if (M.net) return; box.textContent = ''; // aus einem Startbildschirm: nur Lobbys dieses Spiels
    if (!list.length) { const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Gerade ist keine Lobby offen. Es wird von selbst weitergesucht. Oder gib den Code vom Host unten ein (alle brauchen dieselbe Spielversion).'; box.append(p); clearTimeout(M.rescan); M.rescan = setTimeout(() => { if (!M.net && $('join') && !$('join').classList.contains('hidden')) scan(); }, 4000); return; }
    for (const l of list) { const d = document.createElement('div'); d.className = 'mpitem'; const b = document.createElement('b'); b.textContent = l.hostName; const s = document.createElement('span'); s.textContent = `${l.label} · ${l.count} von ${l.limit || BASE_PLAYERS} Spielern${l.inGame ? ' · läuft schon' : ''}`; const j = document.createElement('button'); j.type = 'button'; j.className = 'primary'; j.textContent = 'Beitreten'; j.disabled = l.limit && l.count >= l.limit; j.onclick = () => joinLobby(l.code); d.append(b, s, j); box.append(d); }
  }
  function render() {
    const n = M.net; const list = n && n.role ? n.players : []; const host = !!(n && n.isHost()); if (host) { n.setInfo({ mode: M.lobby.mode, label: modeLabel(M.lobby.mode), inGame: M.inGame }); renderCaSlot(true); const c = lobbyCap(); if (c !== M.lobby.cap) { M.lobby.cap = c; pushLobby(); } n.setLimit(c); } const cap = capOf(); el.count.textContent = String(list.length); if ($('mpMax')) $('mpMax').textContent = String(cap); el.slots.textContent = '';
    for (let i = 0; i < Math.max(cap, list.length); i++) { const p = list[i]; const d = document.createElement('div'); d.className = 'mpslot' + (p ? '' : ' empty'); const dot = document.createElement('i'); dot.className = 'mpdot' + (p ? ' on' : ''); const nm = document.createElement('span'); nm.className = 'mpn'; nm.textContent = p ? p.name : M.lobby.mode === 'raus' ? 'fehlt noch' : M.lobby.mode === 'casino' || M.lobby.mode === 'strom' || M.lobby.mode === 'bruno' || M.lobby.mode === 'ozean' ? 'frei' : GAMES[M.lobby.mode] ? 'KI spielt' : 'frei'; d.append(dot, nm); if (GAMES[M.lobby.mode]) { const seat = document.createElement('span'); seat.className = 'mprolet'; seat.textContent = (M.lobby.mode === 'chess' ? SEATS : SEAT_NAMES)[i] || ''; d.append(seat); }
      if (p && M.lobby.mode === 'race') { const role = M.lobby.roles[p.id]; const mine = n.me && p.id === n.me.id; if (n.isHost() || mine) { const sel = document.createElement('select'); sel.className = 'mprole'; for (const r of ROLES) { const o = document.createElement('option'); o.value = r; o.textContent = ROLE_NAME[r]; if (r === role) o.selected = true; sel.append(o); } sel.onchange = () => pickRole(p.id, sel.value); sel.addEventListener('keydown', (e) => e.stopPropagation()); d.append(sel); } else { const rl = document.createElement('span'); rl.className = 'mprolet'; rl.textContent = role ? ROLE_NAME[role] : ''; d.append(rl); } }
      if (p) { if (p.host) { const b = document.createElement('b'); b.textContent = 'Host'; d.append(b); } if (n.me && p.id === n.me.id) { const b = document.createElement('b'); b.className = 'me'; b.textContent = 'Du'; d.append(b); } const ping = document.createElement('em'); ping.textContent = p.host ? '' : (p.ping ? p.ping + ' ms' : 'verbunden'); d.append(ping); }
      el.slots.append(d); }
    const raceMode = M.lobby.mode === 'race'; el.modeRow.classList.toggle('hidden', !host || !!M.fixed); el.modeRace.classList.toggle('sel', raceMode); el.modeMoon.classList.toggle('sel', M.lobby.mode === 'moon'); el.modePark.classList.toggle('sel', M.lobby.mode === 'park'); el.modeChess.classList.toggle('sel', M.lobby.mode === 'chess'); el.modePong.classList.toggle('sel', M.lobby.mode === 'pong'); el.modeShips.classList.toggle('sel', M.lobby.mode === 'ships'); el.modeRaus.classList.toggle('sel', M.lobby.mode === 'raus'); el.modeBaron.classList.toggle('sel', M.lobby.mode === 'baron'); el.modeKraft.classList.toggle('sel', M.lobby.mode === 'kraft'); el.modeSaege.classList.toggle('sel', M.lobby.mode === 'saege'); el.modeCasino.classList.toggle('sel', M.lobby.mode === 'casino'); el.modeStrom.classList.toggle('sel', M.lobby.mode === 'strom'); el.modeBruno.classList.toggle('sel', M.lobby.mode === 'bruno'); el.modeOzean.classList.toggle('sel', M.lobby.mode === 'ozean'); el.chessRow.classList.toggle('hidden', !host || M.lobby.mode !== 'chess'); for (const b of el.chessRow.querySelectorAll('button')) b.classList.toggle('sel', Number(b.dataset.end) === M.lobby.end);
    if (!host) renderCaSlot(false); const bis = cap === 4 ? 'zu viert' : 'zu dritt'; el.info.textContent = M.lobby.mode === 'ludwig' ? 'Ludwig Zigaretti zu viert: Der Gastgeber spielt Ludwig, die anderen Rot, Gelb und Grün. Kasse, Box, Materialkiste und Boss-Plan gehören allen, Taschen und Rucksack jedem selbst. Wer später kommt, steigt direkt ein.' : M.lobby.mode === 'saege' ? 'Das Spiel mit dem Hund: Ihr metzelt euch bis zu viert durch die Hamster. Welle 1: 100, Welle 2: 200 und immer so weiter. Alle haben dieselbe Waffe. Wer gebissen wird, ist bis zur nächsten Welle raus.' : M.lobby.mode === 'ozean' ? 'Trockne den Ozean aus: Ihr schöpft zu zweit bis ' + bis + ' den Pazifik leer, danach den Atlantik. Jeder hat seinen eigenen Tank, Kasse und Einkäufe gehören allen.' : M.lobby.mode === 'bruno' ? 'Big Bruno kommt auf die Erde: Ihr baut ' + bis + ' den Asteroiden ab. Jeder gräbt frei, Kasse und Werkzeuge sind gemeinsam.' : M.lobby.mode === 'strom' ? 'Strom aus wegen Brunos Geschirrspüler: Ihr macht ' + bis + ' illegal Strom. Jeder läuft und fährt frei, Kasse und Halle sind gemeinsam.' : M.lobby.mode === 'casino' ? `Teo’s Casino: Jeder läuft frei herum, die Familienkasse ist gemeinsam. Spielstand: ${M.lobby.slotName || 'wird beim Start angelegt'}. Wer zum ersten Mal kommt, sieht das Intro.${cap === 4 ? ' Der vierte Spieler kommt als Freund der Familie (Grün).' : ''}` : M.lobby.mode === 'kraft' ? 'Alle drei hämmern gleichzeitig auf ihr eigenes Ziel, zehn Ziele lang. Freie Plätze übernimmt die KI.' : M.lobby.mode === 'baron' ? 'Grundstücke kaufen, Häuser bauen, Miete kassieren. Freie Plätze übernimmt die KI, wer geht, wird bis zur Rückkehr von der KI vertreten.' : M.lobby.mode === 'raus' ? 'Das klassische Rauswerf-Brettspiel für genau drei Spieler. Es spielt keine KI mit, eine unterbrochene Partie geht beim nächsten Start weiter.' : M.lobby.mode === 'pong' ? 'Jeder verteidigt eine Seite, die vierte hält die unbesiegbare KI. Freie Plätze übernimmt eine einfache KI.' : M.lobby.mode === 'ships' ? 'Jeder versteckt eine Flotte und wählt in jedem Zug sein Ziel. Freie Plätze übernimmt die KI.' : M.lobby.mode === 'chess' ? 'Schach zu dritt, Spielende: ' + END_NAMES[M.lobby.end] + '. ' + END_TEXT[M.lobby.end] + ' Freie Plätze übernimmt die KI.' : raceMode ? 'Ihr fahrt die zehn Strecken gemeinsam, der Host wählt die Station. Fehlende Rollen übernimmt die KI.' : M.lobby.mode === 'park' ? 'Der Host wählt das Level. Jeder kann fahren, einweisen oder die Drohne fliegen und jederzeit wechseln.' : 'Ihr putzt ' + bis + '. Die Kasse gehört dem Team, der Spielstand dem Host.' + (cap === 3 ? ' Dieser Mond ist ein älterer Spielstand für höchstens drei. Für vier Spieler im Moonsweeper-Menü eine neue Firma gründen.' : '');
    if (cap === 3 && SLOT_GAMES[M.lobby.mode] && M.lobby.slotName) el.info.textContent += ' „' + M.lobby.slotName + '“ ist ein älterer Spielstand: höchstens drei Spieler. Für vier einen neuen Spielstand anlegen.';
    if (list.length > cap) el.info.textContent = 'Zu viele Spieler für diesen Modus: höchstens ' + cap + '. ' + el.info.textContent;
    renderRang();
    el.start.classList.toggle('hidden', !host); el.start.disabled = (M.lobby.mode === 'raus' && list.length !== BASE_PLAYERS) || list.length > cap; el.leave.textContent = host ? 'Lobby schließen' : 'Lobby verlassen';
  }
  // Rollen und Modus: Host entscheidet, alle sehen das gleiche
  const ids = () => (M.net ? M.net.players.map((p) => p.id) : []);
  function pushLobby() { const n = M.net; if (n && n.isHost()) n.broadcast({ t: 'lobby', ...M.lobby }); }
  function syncRoles() { const n = M.net; if (!n || !n.isHost() || M.inGame) return; M.lobby.roles = resolveRoles(ids(), M.lobby.roles); pushLobby(); }
  function pickRole(id, role) { const n = M.net; if (!n) return; if (n.isHost()) { M.lobby.roles = chooseRole(ids(), M.lobby.roles, id, role); pushLobby(); render(); } else n.send({ t: 'lrole', role }); }
  function setMode(mode) { const n = M.net; if (!n || !n.isHost() || M.inGame || (M.fixed && mode !== M.fixed)) return; if (M.lobby.mode !== mode) { M.lobby.slot = null; M.lobby.slotName = null; } M.lobby.mode = mode; store.set('mpMode', mode); syncRoles(); pushLobby(); render(); }
  function showRoom(on) { el.entry.classList.toggle('hidden', on); el.room.classList.toggle('hidden', !on); const pub = !!(M.net && M.net.pub); el.codeShow.textContent = M.net && M.net.code ? M.net.code : '–'; $('mpCodeLabel').textContent = !(M.net && M.net.isHost()) ? 'Verbunden mit' : pub ? 'Öffentlich, und falls sie in der Liste fehlt: dieser Code' : 'Code für deine Freunde'; el.copy.classList.toggle('hidden', !(M.net && M.net.isHost())); render(); }
  function wire(net) {
    net.on('players', () => { syncRoles(); render(); }); net.on('status', (t, k) => setStatus(t, k === 'ok' ? 'ok' : k === 'error' ? 'error' : k === 'warn' ? 'warn' : 'info'));
    net.on('joined', (j) => { toast(j.name + (j.rejoin ? ' ist zurück in der Lobby' : ' ist beigetreten'), 2600); if (M.inGame && net.isHost()) { if (GAMES[M.kind]) GAMES[M.kind].playerJoined(j.id, j.name); else if (M.kind === 'moon') moon.playerJoined(j.id, j.name); else if (M.kind === 'park') park.playerJoined(j.id, j.name); else if (M.mapId) race.playerJoined(j.id, j.name, j.rejoin); else net.sendTo(j.id, { t: 'roadmap', progress: M.progress }); } else if (net.isHost()) { syncRoles(); net.sendTo(j.id, { t: 'lobby', ...M.lobby }); } });
    net.on('left', (l) => { toast(l.name + (l.why === 'verlassen' ? ' hat die Lobby verlassen' : ' hat die Verbindung verloren – die Welt läuft weiter'), 3600); if (M.inGame) { if (GAMES[M.kind]) GAMES[M.kind].playerLeft(l.id); else if (M.kind === 'park') park.playerLeft(l.id); else if (M.kind === 'moon') moon.playerLeft(l.id); else if (M.mapId) race.playerLeft(l.id); } });
    net.on('closed', (text) => { rangNeu(); setTimeout(scan, 400); const wasGame = M.inGame; M.net = null; M.inGame = false; M.mapId = null; for (const g of Object.values(GAMES)) if (wasGame && g.active()) { if (g.stop(text) !== 'stay') openMenu(); } if (wasGame && moon.active()) { moon.stop(); openMenu(); } if (wasGame && park.active()) { park.stop(); openMenu(); } if (wasGame && race.active) { race.end(); openMenu(); } showScreen('join'); showRoom(false); setStatus(text, 'warn'); toast(text, 4200); });
    net.on('msg', (from, m) => {
      if (m.t === 'pokale' || m.t === 'pokalliste') { pokalNachricht(net, from, m); return; }
      if (m.t === 'schulbuch') { buchNachricht(net, from, m); return; }
      if (m.t === 'lobby') { M.lobby = { mode: m.mode, roles: m.roles || {}, end: m.end || 2, slotName: m.slotName || null, cap: m.cap || BASE_PLAYERS }; render(); return; }
      if (m.t === 'lrole') { if (net.isHost() && !M.inGame) pickRole(from, m.role); return; }
      if (m.t === 'start' || m.t === 'roadmap') onLaunch();
      if (m.t === 'start' && m.mode === 'moon') { M.inGame = true; M.kind = 'moon'; moon.startCoop({ net, host: false }); return; }
      if (m.t === 'start' && m.mode === 'park') { M.inGame = true; M.kind = 'park'; park.startCoop({ net, host: false }); return; }
      if (m.t === 'start' && GAMES[m.mode]) { M.inGame = true; M.kind = m.mode; GAMES[m.mode].startCoop({ net, host: false, intro: !!m.intro }); return; }
      if (m.t === 'roadmap') { M.inGame = true; M.kind = 'race'; M.mapId = null; M.progress = m.progress; if (race.active) race.end(); openRoadmap({ net, host: false, progress: m.progress }); return; }
      if (m.t === 'start' && m.mode === 'race') { M.inGame = true; M.kind = 'race'; M.mapId = m.diff; startRace({ host: false, net, diff: m.diff, roles: m.roles, late: !!m.late }); return; }
      if (m.t === 'stopped') { M.inGame = false; M.mapId = null; race.end(); moon.stop(); park.stop(); for (const g of Object.values(GAMES)) g.stop(); openMenu(); showScreen('join'); setStatus('Der Host hat die Sitzung beendet – du bist wieder in der Lobby.', 'warn'); toast('Der Host hat die Sitzung beendet.', 4200); return; }
      if (GAMES[M.kind]) GAMES[M.kind].message(from, m); else if (M.kind === 'moon') moon.message(from, m); else if (M.kind === 'park') park.message(from, m); else if (M.kind === 'race') race.message(from, m);
    });
  }
  async function hostLobby() {
    if (M.net) return; rangNeu(); const net = createNet({ transport: transport || peerTransport() }); M.net = net; wire(net); el.host.disabled = true; setStatus('Lobby wird erstellt …');
    try { await net.host(myName()); if (M.fixed) { M.lobby.mode = M.fixed; pushLobby(); } showRoom(true); meldePokale(true); } catch (e) { M.net = null; setStatus('Lobby konnte nicht erstellt werden: ' + (e.message || e.type || e) + ' – Internetverbindung prüfen.', 'error'); } el.host.disabled = false;
  }
  async function joinLobby(open) {
    if (M.net) return; const code = typeof open === 'string' ? open : (el.code.value || '').trim(); if (!code) { setStatus('Bitte den Beitrittscode eingeben (z. B. BRUNO-4821)', 'error'); return; }
    rangNeu(); const net = createNet({ transport: transport || peerTransport() }); M.net = net; wire(net); el.join.disabled = true;
    try { await net.join(code, myName()); showRoom(true); meldePokale(true); meldeBuch(); setStatus('Verbunden – warte, bis der Host das Spiel startet.', 'ok'); } catch (e) { M.net = null; /* Status hat die Netzschicht gesetzt */ } el.join.disabled = false;
  }
  function leave() { const n = M.net; if (n) n.leave(); }
  // Host: alle auf die Roadmap holen
  function toRoadmap(progress) { const n = M.net; if (!n || !n.isHost()) return; M.inGame = true; M.kind = 'race'; M.mapId = null; M.progress = progress; if (race.active) race.end(); n.broadcast({ t: 'roadmap', progress }); openRoadmap({ net: n, host: true, progress }); }
  function startSession(progress) {
    const n = M.net; if (!n || !n.isHost()) return;
    if (M.lobby.mode === 'moon') { onLaunch(); M.inGame = true; M.kind = 'moon'; n.broadcast({ t: 'start', mode: 'moon', ver: MP_VERSION }); moon.startCoop({ net: n, host: true }); return; }
    if (M.lobby.mode === 'park') { onLaunch(); M.inGame = true; M.kind = 'park'; n.broadcast({ t: 'start', mode: 'park', ver: MP_VERSION }); park.startCoop({ net: n, host: true }); return; }
    if (M.lobby.mode === 'raus' && n.players.length !== BASE_PLAYERS) { setStatus('Raus mit dir! braucht genau drei Spieler.', 'warn'); return; }
    { const cap = lobbyCap(); if (n.players.length > cap) { setStatus('Zu viele Spieler: hier passen höchstens ' + cap + '.' + (cap === 3 && (SLOT_GAMES[M.lobby.mode] || M.lobby.mode === 'moon') ? ' Ein neuer Spielstand hat Platz für vier.' : ''), 'warn'); return; } }
    if (SLOT_GAMES[M.lobby.mode] && M.lobby.mode !== 'casino') { const sv = slotSaves(); if (sv && !(M.lobby.slot && sv.get(M.lobby.slot))) setCaSlot(sv.create(SLOT_GAMES[M.lobby.mode].fresh)); } // noch kein Stand: jetzt anlegen (für vier)
    onLaunch();
    if (GAMES[M.lobby.mode]) { const mode = M.lobby.mode; M.inGame = true; M.kind = mode; const extra = mode === 'casino' && casino && casino.needsIntro ? { intro: casino.needsIntro(M.lobby.slot) } : mode === 'ludwig' && ludwig ? { intro: ludwig.needsIntro(M.lobby.slot) } : {}; n.broadcast({ t: 'start', mode, ver: MP_VERSION, ...extra }); GAMES[mode].startCoop({ net: n, host: true, end: M.lobby.end, slot: M.lobby.slot }); return; }
    M.lobby.roles = resolveRoles(ids(), M.lobby.roles); toRoadmap(progress);
  }
  // Host hat auf der Roadmap eine Station gewählt
  function startMap(diff) { const n = M.net; if (!n || !n.isHost()) return; const roles = resolveRoles(ids(), race.S ? race.S.roles : M.lobby.roles); M.lobby.roles = roles; M.inGame = true; M.kind = 'race'; M.mapId = diff; n.broadcast({ t: 'start', mode: 'race', diff, roles, ver: MP_VERSION }); startRace({ host: true, net: n, diff, roles }); }
  // Host: Rennen mit denselben Rollen noch einmal starten
  function restartRace() { if (M.mapId) startMap(M.mapId); }
  function hostEnds() { const n = M.net; if (n && n.isHost() && M.inGame) { M.inGame = false; M.mapId = null; n.broadcast({ t: 'stopped' }); showScreen('join'); render(); setStatus('Sitzung beendet – ihr seid weiter in der Lobby.', 'info'); } else if (n && !n.isHost() && M.inGame) { M.inGame = false; M.mapId = null; n.leave(); } }
  el.host.onclick = hostLobby; el.join.onclick = () => joinLobby(); el.leave.onclick = leave; $('mpScan').onclick = () => scan(); el.copy.onclick = () => { const c = M.net && M.net.code; if (!c) return; try { navigator.clipboard.writeText(c); setStatus('Code kopiert: ' + c, 'ok'); } catch (e) { setStatus('Code: ' + c, 'info'); } };
  el.code.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') joinLobby(); }); el.name.addEventListener('keydown', (e) => e.stopPropagation()); el.code.addEventListener('keyup', (e) => e.stopPropagation()); el.name.addEventListener('keyup', (e) => e.stopPropagation());
  showRoom(false); setStatus('');
  // Teo's Casino: der Host wählt, legt an, benennt um oder löscht Spielstände; alle sehen den gewählten Namen
  const euroS = (c) => ((c || 0) / 100).toFixed(2).replace('.', ',') + ' €';
  function setCaSlot(id) { const sv = slotSaves(); const m = id && sv ? sv.get(id) : null; M.lobby.slot = m ? id : null; M.lobby.slotName = m ? m.name : null; pushLobby(); }
  function renderCaSlot(host) {
    const box = $('mpCaSlot'); if (!box) return; const sv = slotSaves(); const show = host && !!sv; box.classList.toggle('hidden', !show); if (!show || box.dataset.edit) return; const list = sv.list(); if (!M.lobby.slot || !list.some((m) => m.id === M.lobby.slot)) { const last = sv.last(); setCaSlot(last && list.some((m) => m.id === last) ? last : list[0] ? list[0].id : null); }
    const sel = $('mpCaSel'); sel.textContent = ''; for (const m of list) { const o = document.createElement('option'); o.value = m.id; o.textContent = `${m.name} · Tag ${m.day || 1}${M.lobby.mode === 'casino' ? ' · ' + euroS(m.purse) : ''}${m.over ? ' · Pleite' : ''} · ${m.max === 4 || M.lobby.mode === 'ludwig' ? 'bis 4 Spieler' : 'max. 3 Spieler'}`; if (m.id === M.lobby.slot) o.selected = true; sel.append(o); }
    if (!list.length) { const o = document.createElement('option'); o.value = ''; o.textContent = 'Noch kein Spielstand (wird beim Start für vier angelegt)'; sel.append(o); }
  }
  $('mpCaSel').onchange = (e) => { setCaSlot(e.target.value); render(); }; $('mpCaSel').addEventListener('keydown', (e) => e.stopPropagation());
  const caEdit = (mode) => { $('mpCaSlot').dataset.edit = mode; for (const id of ['mpCaName', 'mpCaOk', 'mpCaCancel']) $(id).classList.remove('hidden'); $('mpCaName').value = mode === 'ren' ? (M.lobby.slotName || '') : (SLOT_GAMES[M.lobby.mode] || SLOT_GAMES.casino).fresh; $('mpCaName').focus(); $('mpCaName').select(); };
  const caDone = () => { delete $('mpCaSlot').dataset.edit; for (const id of ['mpCaName', 'mpCaOk', 'mpCaCancel']) $(id).classList.add('hidden'); render(); };
  $('mpCaNew').onclick = () => caEdit('new'); $('mpCaRen').onclick = () => { if (M.lobby.slot) caEdit('ren'); };
  $('mpCaOk').onclick = () => { const mode = $('mpCaSlot').dataset.edit; const name = $('mpCaName').value; if (mode === 'new') setCaSlot(slotSaves().create(name)); else if (M.lobby.slot) { slotSaves().rename(M.lobby.slot, name); setCaSlot(M.lobby.slot); } caDone(); };
  $('mpCaCancel').onclick = caDone; $('mpCaName').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('mpCaOk').click(); if (e.key === 'Escape') caDone(); });
  $('mpCaDel').onclick = () => { const b = $('mpCaDel'); if (!M.lobby.slot) return; if (b.dataset.sure) { delete b.dataset.sure; b.textContent = 'Löschen'; slotSaves().remove(M.lobby.slot); M.lobby.slot = null; M.lobby.slotName = null; render(); return; } b.dataset.sure = '1'; b.textContent = 'Wirklich löschen?'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Löschen'; }, 3000); };
  el.modeRace.onclick = () => setMode('race'); el.modeMoon.onclick = () => setMode('moon'); el.modePark.onclick = () => setMode('park'); el.modeChess.onclick = () => setMode('chess'); el.modePong.onclick = () => setMode('pong'); el.modeShips.onclick = () => setMode('ships'); el.modeRaus.onclick = () => setMode('raus'); el.modeBaron.onclick = () => setMode('baron'); el.modeKraft.onclick = () => setMode('kraft'); el.modeSaege.onclick = () => setMode('saege'); el.modeCasino.onclick = () => setMode('casino'); el.modeStrom.onclick = () => setMode('strom'); el.modeBruno.onclick = () => setMode('bruno'); el.modeOzean.onclick = () => setMode('ozean'); for (const b of el.chessRow.querySelectorAll('button')) b.onclick = () => { M.lobby.end = Number(b.dataset.end); store.set('mpChessEnd', M.lobby.end); pushLobby(); render(); };
  // Lobby aus dem Startbildschirm eines Spiels (seit 2026-11-21): fester Modus, die Liste zeigt nur Lobbys dieses Spiels, Zurück führt zum Startbildschirm
  M.fixed = null; M.onBack = null;
  function openFor(mode, { onBack = null, label = null } = {}) { M.fixed = mode; M.onBack = onBack; if (!M.net) { M.lobby.mode = mode; M.lobby.slot = null; M.lobby.slotName = null; } $('mpTitle').textContent = `Mehrspieler – ${label || modeLabel(mode)}`; showScreen('join'); showRoom(!!(M.net && M.net.role)); scan(); }
  function back() { const f = M.onBack; const fixed = M.fixed; if (M.net && !M.inGame) M.net.leave(); M.fixed = null; M.onBack = null; $('mpTitle').textContent = 'Mehrspieler'; if (fixed) { showScreen(null); if (f) f(); } else showScreen('menu'); }
  Object.assign(M, { render, hostEnds, restartRace, startSession, startMap, toRoadmap, showRoom, setStatus, scan, openFor, back }); Object.defineProperty(M, 'active', { get: () => !!(M.net && M.net.role) }); Object.defineProperty(M, 'inSession', { get: () => M.inGame });
  return M;
}
