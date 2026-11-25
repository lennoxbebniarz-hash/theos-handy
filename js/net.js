// Theos Seitenscheidel - Mehrspieler: Netzwerkschicht (max. 3 Spieler, bei neuen Spielständen einiger Modi 4; Host-Prinzip). Der Host besitzt die Welt, Mitspieler treten per privatem Code bei (z. B. BRUNO-4821).
// Transport: PeerJS (WebRTC, direkte Verbindung; die kostenlose PeerJS-Cloud 0.peerjs.com vermittelt nur den Verbindungsaufbau, Google-STUN/PeerJS-TURN helfen bei NAT).
// Für Tests gibt es einen In-Prozess-Transport ('loop'). Keine Zugangsdaten, keine Kosten.
export const MP_VERSION = '1.24.0'; export const MAX_PLAYERS = 4; export const BASE_PLAYERS = 3; // vier Plätze nur für neue Spielstände von Strom, Ozean, Big Bruno, Casino und Moonsweeper; alles andere bleibt bei drei
export const CODE_WORDS = ['THEO', 'BRUNO', 'BASTARD', 'GEIL']; const WORDS = CODE_WORDS; // nur diese vier Wörter gibt es als Lobby-Code
export const makeCode = (r = Math.random) => WORDS[Math.floor(r() * WORDS.length)] + '-' + String(1000 + Math.floor(r() * 9000));
export const normCode = (c) => String(c || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').replace(/^([A-Z]+)-?(\d{4})$/, '$1-$2');
const peerId = (code) => 'bab1-' + normCode(code).toLowerCase();
// Öffentliche Lobbys (seit 2026-11-21, Lennox: „wir sind eh nur zu viert, da brauchen wir keinen Code“): Wer eine Lobby erstellt, belegt einen von PUB_SLOTS festen Plätzen
// (Name enthält die Spielversion, so finden sich nur gleiche Versionen). Die anderen klopfen alle Plätze kurz an ('peek'), bekommen Name, Modus und Spielerzahl ('info')
// und treten per Klick bei (Code OFFEN-<Platz>). Sind alle Plätze belegt, gibt es wie früher einen Code.
export const PUB_SLOTS = 6; const verId = (v) => String(v).replace(/[^0-9a-z]/gi, '-');
export const pubId = (n, v = MP_VERSION) => `bab1-pub-${verId(v)}-${n}`;
export const pubSlot = (code) => { const m = /^OFFEN-?(\d{1,2})$/.exec(String(code || '').trim().toUpperCase()); return m && +m[1] >= 1 && +m[1] <= PUB_SLOTS ? +m[1] : 0; };
export async function scanLobbies({ transport, version = MP_VERSION, timeout = 5000 } = {}) {
  const probe = (n) => new Promise((res) => {
    let done = false; let c = null; const fin = (v) => { if (done) return; done = true; clearTimeout(to); try { c && c.close(); } catch (e) { /* weg */ } res(v); }; const to = setTimeout(() => fin(null), timeout);
    transport.connect(pubId(n, version)).then((conn) => { c = conn; if (done) { try { conn.close(); } catch (e) { /* weg */ } return; } const j = createJoiner(); conn.on('data', (raw) => { const m = j.feed(raw); if (m && m.t === 'info') fin({ slot: n, code: 'OFFEN-' + n, hostName: String(m.hostName || 'Host').slice(0, 16), mode: m.info && m.info.mode || 'lobby', label: m.info && m.info.label || 'Lobby', count: m.count | 0, limit: m.limit | 0, inGame: !!(m.info && m.info.inGame) }); }); conn.on('close', () => fin(null)); conn.send({ t: 'peek', ver: version }); }, () => fin(null));
  });
  const all = await Promise.all(Array.from({ length: PUB_SLOTS }, (_, i) => probe(i + 1))); return all.filter(Boolean);
}

// ---------------------------------------------------------------- Große Nachrichten
// PeerJS (JSON-Kanal) nimmt höchstens 16300 Zeichen je Nachricht an: Größeres meldet PeerJS nur als 'error'-Ereignis und verwirft es, die Verbindung bleibt offen.
// So blieb beim Mitspieler alles stehen (Kasse, Level, Aufgaben, Lose), sobald der gemeinsame Casino-Stand größer wurde. Deshalb teilt jede Verbindung große Nachrichten
// in Stücke (~c) und setzt sie beim Empfänger wieder zusammen. Alle Spiele profitieren davon, kein Spielmodul muss etwas wissen.
export const WIRE_MAX = 16300; const SPLIT_AT = 15000; const PIECE = 7000; // ein Stück verdoppelt im Rahmen höchstens die Anführungszeichen: 7000 Zeichen bleiben sicher unter der Grenze
const MAX_PIECES = 600; const MAX_OPEN = 8;
export function splitMessage(m, id) {
  const s = JSON.stringify(m); if (s === undefined || s.length <= SPLIT_AT) return [m];
  const n = Math.ceil(s.length / PIECE); const out = []; for (let i = 0; i < n; i++) out.push({ t: '~c', id, i, n, d: s.slice(i * PIECE, (i + 1) * PIECE) }); return out;
}
export function createJoiner() {
  const open = new Map(); // id -> { n, got, a }
  return { feed(m) {
    if (!m || m.t !== '~c') return m;
    if (typeof m.id !== 'string' || m.id.length > 40 || !Number.isInteger(m.n) || m.n < 2 || m.n > MAX_PIECES || !Number.isInteger(m.i) || m.i < 0 || m.i >= m.n || typeof m.d !== 'string' || m.d.length > WIRE_MAX) return null;
    let p = open.get(m.id); if (!p) { if (open.size >= MAX_OPEN) open.delete(open.keys().next().value); p = { n: m.n, got: 0, a: new Array(m.n) }; open.set(m.id, p); }
    if (p.n !== m.n || p.a[m.i] !== undefined) return null; p.a[m.i] = m.d; p.got++; if (p.got < p.n) return null; open.delete(m.id);
    try { const o = JSON.parse(p.a.join('')); return o && typeof o === 'object' ? o : null; } catch (e) { return null; }
  }, get pending() { return open.size; } };
}

// ---------------------------------------------------------------- Transporte
// Verbindung: { send(obj), close(), on(evt, fn) }  evt: 'open' | 'data' | 'close' | 'error'
function emitter() { const m = {}; return { on(e, f) { (m[e] = m[e] || []).push(f); return this; }, emit(e, ...a) { for (const f of m[e] || []) f(...a); } }; }

export function createLoopBus() { return { servers: new Map(), delay: 0, limit: 0 }; } // limit > 0: wie PeerJS (JSON-Kanal) größere Nachrichten verwerfen und nur 'error' melden
export function loopTransport(bus) {
  const defer = (f) => (bus.delay ? setTimeout(f, bus.delay) : queueMicrotask(f));
  const mkPair = () => { const a = emitter(); const b = emitter(); let closed = false; const mk = (me, other) => ({ buffered: () => 0, send(o) { if (closed) return; const txt = JSON.stringify(o); if (bus.limit && txt.length > bus.limit) { me.emit('error', new Error('Message too big for JSON channel')); return; } const s = JSON.parse(txt); defer(() => { if (!closed) other.emit('data', s); }); }, close() { if (closed) return; closed = true; defer(() => { me.emit('close'); other.emit('close'); }); }, drop() { if (closed) return; closed = true; defer(() => { me.emit('close'); other.emit('close'); }); }, on: (e, f) => { me.on(e, f); return this; } });
    const A = mk(a, b); const B = mk(b, a); A.on = (e, f) => { a.on(e, f); return A; }; B.on = (e, f) => { b.on(e, f); return B; }; return [A, B]; };
  return {
    listen(id) { return new Promise((res, rej) => { if (bus.servers.has(id)) { rej(new Error('id-taken')); return; } const em = emitter(); bus.servers.set(id, em); res({ onConnection: (f) => em.on('conn', f), close: () => bus.servers.delete(id) }); }); },
    connect(id) { return new Promise((res, rej) => { const srv = bus.servers.get(id); if (!srv) { rej(new Error('peer-unavailable')); return; } const [cl, sv] = mkPair(); srv.emit('conn', sv); defer(() => { sv.__open && sv.__open(); }); res(cl); }); },
  };
}

function loadPeerLib() {
  if (typeof window !== 'undefined' && window.peerjs) return Promise.resolve(window.peerjs);
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'js/vendor/peerjs.min.js'; s.onload = () => (window.peerjs ? res(window.peerjs) : rej(new Error('peerjs fehlt'))); s.onerror = () => rej(new Error('peerjs konnte nicht geladen werden')); document.head.appendChild(s); });
}
export function peerTransport() {
  // buffered(): Bytes, die noch im Sendepuffer des Kanals warten (Rückstau auf langsamer Leitung). 'error' (z. B. „Message too big for JSON channel“) wird nicht mehr verschluckt.
  const wrap = (dc) => { const em = emitter(); let warned = 0; dc.on('data', (d) => em.emit('data', d)); dc.on('close', () => em.emit('close')); dc.on('error', (e) => { if (warned++ < 5) console.warn('[net] Kanalfehler:', e && (e.message || e.type || e)); em.emit('error', e); }); const c = { send: (o) => { try { dc.send(o); } catch (e) { /* Verbindung weg */ } }, buffered: () => { try { return (dc.dataChannel ? dc.dataChannel.bufferedAmount : 0) + (dc.bufferSize || 0) * 8000; } catch (e) { return 0; } }, close: () => dc.close(), on: (e, f) => { em.on(e, f); return c; }, raw: dc, __em: em }; return c; };
  return {
    async listen(id) { const lib = await loadPeerLib(); return new Promise((res, rej) => { const p = new lib.Peer(id, { debug: 0 }); const em = emitter(); p.on('open', () => res({ onConnection: (f) => em.on('conn', f), close: () => p.destroy(), peer: p })); p.on('error', (e) => rej(e)); p.on('connection', (dc) => { const c = wrap(dc); dc.on('open', () => em.emit('conn', c)); }); p.on('disconnected', () => { try { p.reconnect(); } catch (e) { /* weg */ } }); }); },
    async connect(id) { const lib = await loadPeerLib(); return new Promise((res, rej) => { const p = new lib.Peer(undefined, { debug: 0 }); let done = false; const to = setTimeout(() => { if (!done) { done = true; try { p.destroy(); } catch (e) { /* x */ } rej(new Error('timeout')); } }, 15000); p.on('error', (e) => { if (!done) { done = true; clearTimeout(to); try { p.destroy(); } catch (x) { /* schon zu */ } /* sonst bleibt bei jeder leeren Lobby-Anfrage eine Verbindung zum Server offen, der Schrank fragt jede Minute */ rej(e); } }); p.on('open', () => { const dc = p.connect(id, { reliable: true, serialization: 'json' }); dc.on('open', () => { if (!done) { done = true; clearTimeout(to); const c = wrap(dc); c.close = () => { try { dc.close(); p.destroy(); } catch (e) { /* x */ } }; res(c); } }); dc.on('error', (e) => { if (!done) { done = true; clearTimeout(to); try { p.destroy(); } catch (x) { /* schon zu */ } rej(e); } }); }); }); },
  };
}

// ---------------------------------------------------------------- Net
const HB_MS = 2000; const TIMEOUT_MS = 20000; const REJOIN_MS = 120000;
export function createNet({ transport, version = MP_VERSION, now = () => Date.now(), heartbeat = true } = {}) {
  const ev = emitter(); const N = { role: null, me: null, code: null, players: [], status: 'getrennt', transport, limit: BASE_PLAYERS }; // limit: wie viele gerade in die Lobby dürfen (der Host stellt es je nach Modus und Spielstand ein)
  const conns = new Map(); // Host: id -> { conn, name, last, ping, joinedAt }
  const slots = new Map(); // Host: name -> { id, lastSeen } (Wiedereintritt)
  let server = null; let hostConn = null; let hb = null; let lastFromHost = 0; let nextId = 1; let closedByUs = false;
  // Verbindung mit Teilen und Zusammensetzen großer Nachrichten (siehe oben). Der Rest des Netzes sieht nur ganze Nachrichten.
  let frameSeq = 0; const frameId = () => (++frameSeq).toString(36) + Math.random().toString(36).slice(2, 6);
  function wrapConn(c) {
    const j = createJoiner(); const w = Object.create(c);
    w.sendRaw = (m) => c.send(m); w.send = (m) => { for (const f of splitMessage(m, frameId())) c.send(f); };
    w.on = (e, f) => { if (e === 'data') c.on('data', (m) => { const r = j.feed(m); if (r) f(r); }); else c.on(e, f); return w; };
    w.buffered = () => (c.buffered ? c.buffered() : 0); return w;
  }
  const status = (text, kind = 'info') => { N.status = text; ev.emit('status', text, kind); };
  const listOut = () => [{ id: 'host', name: N.hostName, host: true, ping: 0, online: true }, ...[...conns.entries()].map(([id, c]) => ({ id, name: c.name, host: false, ping: c.ping || 0, online: true }))];
  const pushPlayers = () => { N.players = listOut(); ev.emit('players', N.players); for (const [, c] of conns) c.conn.send({ t: 'players', list: N.players }); };
  N.on = (e, f) => { ev.on(e, f); return N; };

  // ---- Host
  N.info = { mode: 'lobby', label: 'Lobby' }; N.setInfo = (o) => { N.info = { ...N.info, ...o }; return N.info; }; // was beim Anklopfen gezeigt wird (Modus, Name des Spiels)
  N.host = async (name, tries = 8, { pub = true } = {}) => {
    if (N.role) throw new Error('Schon in einer Lobby'); N.pub = 0; N.code = null;
    if (pub) for (let n = 1; n <= PUB_SLOTS && !N.code; n++) { try { server = await transport.listen(pubId(n, version)); N.code = 'OFFEN-' + n; N.pub = n; } catch (e) { if (!/taken|unavailable/i.test(String(e && (e.type || e.message || e)))) break; } } // öffentlicher Platz; sonst Code wie früher
    let lastErr = null; for (let i = 0; i < tries && !N.code; i++) { const code = makeCode(); try { server = await transport.listen(peerId(code)); N.code = code; break; } catch (e) { lastErr = e; if (!/taken|unavailable/i.test(String(e && (e.type || e.message || e)))) { status('Lobby konnte nicht erstellt werden: ' + (e.message || e.type || e), 'error'); throw e; } } }
    if (!N.code) { status('Kein freier Lobby-Code gefunden', 'error'); throw lastErr || new Error('kein Code'); }
    N.role = 'host'; N.hostName = name || 'Host'; N.me = { id: 'host', name: N.hostName }; closedByUs = false;
    server.onConnection((conn) => onClient(conn)); status((N.pub ? 'Öffentliche Lobby ist offen (die anderen sehen dich unter „Offene Lobbys“)' : 'Lobby ' + N.code + ' ist offen') + ' – ' + (N.limit - 1) + ' Plätze frei', 'ok'); pushPlayers();
    if (heartbeat) hb = setInterval(hostBeat, HB_MS); return N.code;
  };
  function onClient(raw) {
    const conn = wrapConn(raw); let id = null; let name = '';
    const timer = setTimeout(() => { if (!id) conn.close(); }, 8000);
    conn.on('data', (m) => {
      if (!m || typeof m !== 'object') return;
      if (!id) {
        if (m.t === 'peek') { clearTimeout(timer); conn.send({ t: 'info', hostName: N.hostName, info: N.info, count: 1 + conns.size, limit: N.limit, ver: version }); setTimeout(() => { try { conn.close(); } catch (e) { /* weg */ } }, 150); return; } // nur anklopfen: wer ist da, was wird gespielt
        if (m.t !== 'hello') return; clearTimeout(timer);
        if (m.ver !== version) { conn.send({ t: 'reject', reason: 'version', text: 'Andere Spielversion (Host ' + version + ', du ' + m.ver + ')' }); setTimeout(() => conn.close(), 100); return; }
        name = String(m.name || 'Spieler').slice(0, 16); const names = new Set([N.hostName, ...[...conns.values()].map((c) => c.name)]); if (names.has(name)) { let k = 2; while (names.has(name + k)) k++; name = name + k; } // gleicher Name wie ein Verbundener: eigener Platz, kein Wiedereintritt
        const old = slots.get(name);
        if (conns.size >= N.limit - 1) { conn.send({ t: 'reject', reason: 'full', text: 'Die Lobby ist voll (max. ' + N.limit + ' Spieler)' }); setTimeout(() => conn.close(), 100); return; }
        const rejoin = !!(old && !conns.has(old.id) && now() - old.lastSeen < REJOIN_MS); id = rejoin ? old.id : 'p' + (nextId++); conns.set(id, { conn, name, last: now(), ping: 0 }); slots.set(name, { id, lastSeen: now() });
        conn.send({ t: 'welcome', id, name, code: N.code, hostName: N.hostName, ver: version, rejoin }); pushPlayers(); status(name + (rejoin ? ' ist zurück' : ' ist beigetreten'), 'ok'); ev.emit('joined', { id, name, rejoin }); return;
      }
      const c = conns.get(id); if (!c) return; c.last = now();
      if (m.t === 'pong') { c.ping = Math.max(0, now() - m.ts); return; } if (m.t === 'bye') { dropClient(id, 'verlassen'); return; }
      ev.emit('msg', id, m);
    });
    conn.on('close', () => { clearTimeout(timer); if (id && conns.has(id) && conns.get(id).conn === conn) dropClient(id, 'getrennt'); });
  }
  function dropClient(id, why) { const c = conns.get(id); if (!c) return; conns.delete(id); slots.set(c.name, { id, lastSeen: now() }); try { c.conn.close(); } catch (e) { /* weg */ } pushPlayers(); status(c.name + (why === 'verlassen' ? ' hat die Lobby verlassen' : ' hat die Verbindung verloren'), why === 'verlassen' ? 'info' : 'warn'); ev.emit('left', { id, name: c.name, why }); }
  function hostBeat() { const t = now(); for (const [id, c] of [...conns]) { if (t - c.last > TIMEOUT_MS) { dropClient(id, 'timeout'); continue; } c.conn.send({ t: 'ping', ts: t }); } }

  // ---- Client
  N.join = async (code, name) => {
    if (N.role) throw new Error('Schon in einer Lobby'); const slot = pubSlot(code); code = slot ? 'OFFEN-' + slot : normCode(code); if (!slot && !/^(THEO|BRUNO|BASTARD|GEIL)-\d{4}$/.test(code)) { status('Ungültiger Code: Es gibt nur THEO, BRUNO, BASTARD oder GEIL mit vier Ziffern (Beispiel: BRUNO-4821)', 'error'); throw new Error('Ungültiger Code'); }
    status('Verbinde mit ' + code + ' …');
    let conn; try { conn = await transport.connect(slot ? pubId(slot, version) : peerId(code)); } catch (e) { const t = String(e && (e.type || e.message || e)); status(/unavailable/.test(t) ? 'Diese Lobby gibt es nicht (Code prüfen, Host muss online sein)' : /timeout/.test(t) ? 'Zeitüberschreitung – Verbindung nicht möglich (Firewall/Netzwerk?)' : 'Verbindung fehlgeschlagen: ' + t, 'error'); throw e; }
    conn = wrapConn(conn);
    return new Promise((res, rej) => {
      let welcomed = false; closedByUs = false; hostConn = conn; lastFromHost = now();
      const to = setTimeout(() => { if (!welcomed) { status('Der Host antwortet nicht', 'error'); try { conn.close(); } catch (e) { /* x */ } rej(new Error('Keine Antwort')); } }, 10000);
      conn.on('data', (m) => {
        lastFromHost = now(); if (!m || typeof m !== 'object') return;
        if (m.t === 'welcome') { welcomed = true; clearTimeout(to); N.role = 'client'; N.code = code; N.me = { id: m.id, name: m.name }; N.hostName = m.hostName; status('Verbunden mit ' + m.hostName + (m.rejoin ? ' (wieder beigetreten)' : ''), 'ok'); if (heartbeat) hb = setInterval(clientBeat, 1000); res(m); return; }
        if (m.t === 'reject') { clearTimeout(to); status(m.text || 'Beitritt abgelehnt', 'error'); rej(new Error(m.reason || 'reject')); return; }
        if (m.t === 'players') { N.players = m.list; ev.emit('players', N.players); return; } if (m.t === 'ping') { conn.send({ t: 'pong', ts: m.ts }); return; }
        if (m.t === 'closed') { closedByUs = true; endClient(m.reason || 'Der Host hat die Lobby geschlossen.'); return; }
        ev.emit('msg', 'host', m);
      });
      conn.on('close', () => { if (!welcomed) { clearTimeout(to); rej(new Error('Verbindung geschlossen')); return; } if (!closedByUs) endClient('Verbindung zum Host verloren.'); });
      conn.send({ t: 'hello', name: String(name || 'Spieler').slice(0, 16), ver: version });
    });
  };
  function clientBeat() { if (now() - lastFromHost > TIMEOUT_MS && !closedByUs) { closedByUs = true; endClient('Verbindung zum Host verloren (keine Antwort).'); } }
  function endClient(text) { const was = N.role; if (hb) clearInterval(hb); hb = null; try { hostConn && hostConn.close(); } catch (e) { /* x */ } hostConn = null; N.role = null; N.players = []; status(text, 'error'); if (was) ev.emit('closed', text); }

  // ---- gemeinsam
  N.send = (m) => { if (N.role === 'client' && hostConn) hostConn.send(m); };
  N.sendTo = (id, m) => { const c = conns.get(id); if (c) c.conn.send(m); };
  N.broadcast = (m, except) => { let fr = null; for (const [id, c] of conns) if (id !== except) { fr = fr || splitMessage(m, frameId()); for (const f of fr) c.conn.sendRaw(f); } }; // große Nachricht nur einmal zerlegen
  N.pressure = () => { let b = 0; if (N.role === 'client') return hostConn ? hostConn.buffered() : 0; for (const [, c] of conns) b = Math.max(b, c.conn.buffered()); return b; }; // Bytes im Sendepuffer (größter Wert): wer viel Zeug schickt, wartet, bis es unter einer Schwelle liegt
  N.leave = () => { if (N.role === 'client') { try { hostConn.send({ t: 'bye' }); } catch (e) { /* x */ } closedByUs = true; if (hb) clearInterval(hb); hb = null; setTimeout(() => { try { hostConn && hostConn.close(); } catch (e) { /* x */ } hostConn = null; }, 50); N.role = null; N.players = []; status('Lobby verlassen'); ev.emit('closed', 'Du hast die Lobby verlassen.'); } else if (N.role === 'host') N.close('Der Host hat die Lobby geschlossen.'); };
  N.close = (reason = 'Der Host hat die Lobby geschlossen.') => { if (N.role !== 'host') return; for (const [, c] of conns) { c.conn.send({ t: 'closed', reason }); } if (hb) clearInterval(hb); hb = null; const cs = [...conns.values()]; conns.clear(); setTimeout(() => { for (const c of cs) { try { c.conn.close(); } catch (e) { /* x */ } } try { server && server.close(); } catch (e) { /* x */ } }, 80); N.role = null; N.players = []; status('Lobby geschlossen'); ev.emit('closed', 'Lobby geschlossen.'); };
  N.setLimit = (n) => { N.limit = Math.max(1, Math.min(MAX_PLAYERS, n | 0)); return N.limit; }; // Spieler, die schon drin sind, bleiben; nur neue werden abgewiesen
  N.isHost = () => N.role === 'host'; N.count = () => (N.role === 'host' ? 1 + conns.size : N.players.length);
  N._beat = hostBeat; // für Tests
  return N;
}
