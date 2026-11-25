// Theos Seitenscheidel - Race-Mehrspieler: Rollen (Fahrer / Navigator / Ingenieur), Eingaben der Mitspieler, Abgleich des Rennzustands.
// Der Host besitzt die Simulation (Auto, Schäden, Werkstatt, Zeit). Mitspieler schicken nur Eingaben (~30 Hz) und bekommen Schnappschüsse (~20 Hz, Werkstatt/Schäden ~8 Hz).
// Fehlt ein Mensch für eine Rolle, übernimmt die KI: Ingenieur-KI (stepEngineerAI) und Fahrer-KI (aiInput) laufen dann auf dem Host.
export const ROLES = ['driver', 'navigator', 'engineer'];
export const ROLE_NAME = { driver: 'Fahrer', navigator: 'Navigator', engineer: 'Ingenieur' };

// Rollen verteilen: ids in Beitrittsreihenfolge (Host zuerst), want = Wunschrollen (id -> Rolle). Jede Rolle nur einmal, der Rest bekommt die nächste freie.
export function resolveRoles(ids, want = {}) {
  const out = {}; const taken = new Set();
  for (const id of ids) { const w = want[id]; if (ROLES.includes(w) && !taken.has(w)) { out[id] = w; taken.add(w); } }
  for (const id of ids) { if (out[id]) continue; const r = ROLES.find((x) => !taken.has(x)); if (r) { out[id] = r; taken.add(r); } }
  return out;
}
// id will die Rolle `role`: wer sie hatte, bekommt dafür die bisherige Rolle von id (Tausch)
export function chooseRole(ids, want, id, role) {
  const cur = resolveRoles(ids, want); const prev = cur[id]; const next = { ...cur };
  if (!ROLES.includes(role) || role === prev) return next;
  const other = ids.find((x) => x !== id && cur[x] === role); if (other) next[other] = prev; next[id] = role; return next;
}

const r3 = (v) => Math.round(v * 1000) / 1000;
const STALE_MS = 1500;

export function createRaceMp(ctx) {
  const { G, THREE } = ctx; const now = () => performance.now(); const look = () => G.look || { yaw: 0, pitch: 0 }; const nav = () => G.nav || { tablet: 1, crank: 0 };
  const R = { S: null };
  const live = () => R.S;
  const connected = (id) => !!R.S && R.S.net.players.some((p) => p.id === id);
  function humanIds(role) { const S = R.S; if (!S) return []; return Object.keys(S.roles).filter((id) => S.roles[id] === role && connected(id)); }
  const hasHuman = (role) => humanIds(role).length > 0;
  const nameOf = (id) => { const p = R.S && R.S.net.players.find((x) => x.id === id); return p ? p.name : '?'; };
  const fresh = (id) => { const i = R.S.inp.get(id); return i && now() - i.at < STALE_MS ? i : null; };

  function begin({ net, host, roles, diff }) {
    R.S = { net, host: !!host, roles: { ...roles }, diff, seq: 0, inp: new Map(), tgt: null, ready: new Set(), started: false, waiting: false, waitT: 0, tSim: 0, tSlow: 0, tIn: 0, hr: null, eo: null, handKey: '', lastGear: 1, snap: { th: 0, br: 0, rpm: 900, gear: 1 }, sentSnaps: 0, gotSnaps: 0 };
    G.mp = R.S; G.wipeNet = false; G.wipeLocal = false; G.holdId = null; return R.S;
  }
  function end() { R.S = null; G.mp = null; G.wipeNet = false; G.wipeLocal = false; G.holdId = null; }
  R.begin = begin; R.end = end;
  Object.defineProperty(R, 'active', { get: () => !!R.S });
  Object.defineProperty(R, 'isHost', { get: () => !!(R.S && R.S.host) });
  Object.defineProperty(R, 'isClient', { get: () => !!(R.S && !R.S.host) });
  R.humanIds = humanIds; R.hasHuman = hasHuman; R.roleOf = (id) => (R.S ? R.S.roles[id] : null);

  // ---- Host: wer fährt?
  R.driverSource = () => {
    const S = R.S; if (!S) return G.role === 'driver' ? 'local' : 'ai';
    if (G.role === 'driver') return 'local';
    if (S.host) return humanIds('driver').some((id) => id !== 'host') ? 'remote' : 'ai';
    return 'snap';
  };
  R.remoteDriverInput = () => {
    const S = R.S; const id = humanIds('driver').find((x) => x !== 'host'); const i = id && fresh(id);
    return i ? { throttle: i.th || 0, brake: i.br || 0, steer: i.st || 0, hand: i.hd || 0, kick: i.kick || 0, launch: i.launch || 0, rpm: i.rpm, gear: i.gear, neutral: !!i.neu } : { throttle: 0, brake: id ? 0.25 : 0, steer: 0, hand: 0, kick: 0, launch: 0, rpm: 900, gear: 1, neutral: true };
  };
  R.snapInput = () => ({ throttle: R.S.snap.th, brake: R.S.snap.br, steer: 0, hand: 0, kick: 0, launch: 0 });
  // Ingenieur-KI springt ein, solange kein Mensch die Rolle hat; ohne Mensch am Steuer fährt die KI
  R.engineerAiActive = () => !R.S || !hasHuman('engineer');

  // Mitspieler-Ingenieur: Hand/Position für alle sichtbar
  R.engOther = () => { const S = R.S; if (!S || !S.eo || G.role === 'engineer') return null; const e = S.eo; return { x: e.x, z: e.z, work: e.work || 0, reach: e.reach ? new THREE.Vector3(e.reach.x, e.reach.y, e.reach.z) : null }; };

  R.heads = () => (R.S ? R.S.hd : null);
  R.navOther = () => { const S = R.S; return S && S.nv ? { tablet: S.nv[0], crank: S.nv[1] } : null; };

  R.crewText = () => {
    const S = R.S; if (!S) return '';
    return ROLES.map((r) => { const ids = humanIds(r); const who = ids.length ? ids.map((id) => (id === S.net.me.id ? 'du' : nameOf(id))).join('+') : 'KI'; return `${ROLE_NAME[r]}: ${who}`; }).join(', ');
  };

  // ---- Host: pro Frame (nach der Physik)
  R.holdCountdown = (dt) => { // Host wartet kurz, bis alle Mitspieler geladen haben
    const S = R.S; if (!S || !S.host || !S.waiting) return false;
    S.waitT += dt; const need = S.net.players.filter((p) => p.id !== 'host');
    if (need.every((p) => S.ready.has(p.id)) || S.waitT > 20) { S.waiting = false; return false; } return true;
  };
  R.hostTick = (dt) => {
    const S = R.S; if (!S || !S.host) return; const racing = G.mode === 'racing' || G.mode === 'countdown';
    const eid = humanIds('engineer').find((x) => x !== 'host'); const ei = eid ? fresh(eid) : null;
    if (eid) {
      const hold = ei && ei.hold && racing && (String(ei.hold).startsWith('c:') || ei.hold === 'nitroport') ? ei.hold : null;
      if (hold) { const res = ctx.hostHold(hold, dt); S.hr = { id: hold, p: r3(res.progress || 0), a: res.active ? 1 : 0 }; } else { if (S.hr) ctx.hostRelease(); S.hr = null; }
      S.eo = ei ? { x: r3(ei.ex || 0), z: r3(ei.ez || 0), reach: ei.reach || null, work: ei.work || 0 } : null;
    } else {
      S.hr = null; S.eo = G.role === 'engineer' ? { x: r3(G.eng.x), z: r3(G.eng.z), reach: G.reach ? { x: r3(G.reach.x), y: r3(G.reach.y), z: r3(G.reach.z) } : null, work: G.E ? G.E.work : 0 } : null;
    }
    // Blick und Tablet aller Spieler: wer welche Rolle hat, sendet seine Kopfhaltung; der Host verteilt sie an alle
    const hd = {}; hd[G.role] = [r3(look().yaw), r3(look().pitch)]; for (const [id] of S.inp) { const i = fresh(id); const ro = S.roles[id]; if (i && ro && i.ly !== undefined) hd[ro] = [i.ly, i.lp]; } S.hd = hd; let nv = G.role === 'navigator' ? [r3(nav().tablet), r3(nav().crank)] : null; { const nid = humanIds('navigator').find((x) => x !== 'host'); const ni = nid ? fresh(nid) : null; if (ni && ni.tb !== undefined) nv = [ni.tb, ni.cr]; } S.nv = nv;
    let wipe = G.wipeLocal; for (const [id] of S.inp) { const i = fresh(id); if (i && i.w) wipe = true; } G.wipeNet = wipe;
    const t = now(); if (t - S.tSim < 50) return; S.tSim = t;
    const s = G.sim; const slow = t - S.tSlow >= 120; if (slow) S.tSlow = t;
    const m = { t: 'rs', n: ++S.seq, mode: G.mode, wr: G.wrecked ? 1 : 0, time: r3(G.time), pen: G.penalty, rs: G.resets, cp: G.cpIndex, cd: r3(G.countdown), wait: S.waiting ? 1 : 0,
      s: [s.x, s.z, s.psi, s.u, s.v, s.r, s.steer, s.ax, s.ay, s.hand, s.slip, s.stuck].map(r3), su: s.surface, rev: s.reverse ? 1 : 0, rpm: Math.round(G.rpm), gear: G.gear, neu: G.neutral && G.manual ? 1 : 0, th: r3(G.lastInp ? G.lastInp.throttle : 0), br: r3(G.lastInp ? G.lastInp.brake : 0),
      wipe: G.wipeNet ? 1 : 0, hp: r3(G.hopVis), hr: S.hr, eo: S.eo, lap: G.lap || 1, hd: S.hd, nv: S.nv }; if (ctx.rival && ctx.rival.st) { const q = ctx.rival.st; m.ri = [r3(q.x), r3(q.z), r3(q.psi), r3(q.u), r3(q.steer), ctx.rival.lap]; }
    if (slow && G.V) { m.V = JSON.parse(JSON.stringify(G.V, (k, v) => (k === 'warnQueue' ? [] : v))); m.E = JSON.parse(JSON.stringify(G.E)); m.P = JSON.parse(JSON.stringify(G.P)); }
    S.net.broadcast(m); S.sentSnaps++;
  };
  R.bcast = (m) => { if (R.S && R.S.host) R.S.net.broadcast(m); };
  R.toastAll = (text, ms) => { ctx.toast(text, ms); R.bcast({ t: 'rtoast', text, ms }); };

  // ---- Client: Eingaben senden und Zustand des Hosts nachführen
  R.localReady = () => { const S = R.S; if (!S) return; S.started = true; if (S.host) { S.waiting = S.net.players.some((p) => p.id !== 'host'); S.waitT = 0; } else S.net.send({ t: 'rready' }); };
  R.clientTick = (dt, inp) => {
    const S = R.S; if (!S || S.host || !S.started) return; const t = now(); if (t - S.tIn < 33) return; S.tIn = t;
    const m = { t: 'rin', w: G.wipeLocal ? 1 : 0, ly: r3(look().yaw), lp: r3(look().pitch) }; if (G.role === 'navigator') { m.tb = r3(nav().tablet); m.cr = r3(nav().crank); }
    if (G.role === 'driver') Object.assign(m, { th: r3(inp.throttle), br: r3(inp.brake), st: r3(inp.steer), hd: inp.hand ? 1 : 0, kick: r3(G.kick), launch: r3(G.launch), rpm: Math.round(G.rpm), gear: G.gear, neu: G.neutral && G.manual ? 1 : 0 });
    else if (G.role === 'engineer') Object.assign(m, { ex: r3(G.eng.x), ez: r3(G.eng.z), hold: G.holdId || null, reach: G.reach ? { x: r3(G.reach.x), y: r3(G.reach.y), z: r3(G.reach.z) } : null, work: G.holdId ? 1 : 0 });
    S.net.send(m);
  };
  R.sendCmd = (op, extra = {}) => { const S = R.S; if (S && !S.host) S.net.send({ t: 'rcmd', op, ...extra }); };
  // Auto vom Host nachführen: Zielzustand läuft mit Geschwindigkeit weiter, das lokale Auto gleitet hin (kein Springen)
  R.clientStep = (dt) => {
    const S = R.S; const T = S.tgt; if (!T) return; const s = G.sim;
    const sn = Math.sin(T.psi); const cs = Math.cos(T.psi); T.x += (T.u * sn + T.v * cs) * dt; T.z += (T.u * cs - T.v * sn) * dt; T.psi += T.r * dt;
    const k = 1 - Math.exp(-dt * 12); const k2 = 1 - Math.exp(-dt * 20);
    if (Math.hypot(T.x - s.x, T.z - s.z) > 12) { s.x = T.x; s.z = T.z; s.psi = T.psi; } else { s.x += (T.x - s.x) * k; s.z += (T.z - s.z) * k; const dp = Math.atan2(Math.sin(T.psi - s.psi), Math.cos(T.psi - s.psi)); s.psi += dp * k; }
    for (const f of ['u', 'v', 'r', 'steer', 'ax', 'ay', 'slip']) s[f] += (T[f] - s[f]) * k2;
    s.hand = T.hand; s.stuck = T.stuck; s.surface = T.surface; s.reverse = T.reverse;
    s.lane = ctx.track().nearest(s.x, s.z);
    if (G.mode === 'racing') G.time += dt; if (G.mode === 'countdown' && !S.snapWait) G.countdown = Math.max(0.01, G.countdown - dt);
    const sp = S.snap; if (G.role !== 'driver') { G.rpm += (sp.rpm - G.rpm) * Math.min(1, dt * 10); if (sp.gear !== S.lastGear) { ctx.onGearChange(sp.gear, S.lastGear); S.lastGear = sp.gear; } G.gear = sp.gear; G.neutral = false; }
    G.hopVis = Math.max(0, G.hopVis - dt * 3);
  };
  function applySnapshot(m) {
    const S = R.S; if (!S || !S.started) return; S.gotSnaps++;
    const prevMode = G.mode; const a = m.s; const first = !S.tgt;
    S.tgt = { x: a[0], z: a[1], psi: a[2], u: a[3], v: a[4], r: a[5], steer: a[6], ax: a[7], ay: a[8], hand: a[9], slip: a[10], stuck: a[11], surface: m.su, reverse: !!m.rev };
    if (first) { Object.assign(G.sim, S.tgt); G.sim.lane = ctx.track().nearest(G.sim.x, G.sim.z); }
    G.time = m.time; G.penalty = m.pen; G.resets = m.rs; G.cpIndex = m.cp; G.wrecked = !!m.wr; S.snapWait = !!m.wait; G.countdown = m.cd;
    G.lap = m.lap || 1; S.hd = m.hd || null; S.nv = m.nv || null; if (m.ri && ctx.rival && ctx.rival.st) { const a = m.ri; ctx.rival.tgt = { x: a[0], z: a[1], psi: a[2], u: a[3], steer: a[4] }; ctx.rival.lap = a[5]; }
    S.snap = { th: m.th, br: m.br, rpm: m.rpm, gear: m.gear }; G.wipeNet = !!m.wipe; G.hopVis = Math.max(G.hopVis, m.hp || 0); S.hr = m.hr || null; S.eo = m.eo || null;
    if (m.V) { G.V = m.V; G.V.warnQueue = []; G.E = m.E; G.P = m.P; const hk = JSON.stringify(G.E.hand || null); if (hk !== S.handKey) { S.handKey = hk; ctx.setHeld(G.E.hand); } }
    if (m.mode !== prevMode) { G.mode = m.mode; ctx.onModeChange(prevMode, m.mode); }
  }

  // ---- Nachrichten
  R.message = (from, m) => {
    const S = R.S; if (!S) return;
    if (S.host) {
      if (m.t === 'rin') { S.inp.set(from, { ...m, at: now() }); return; }
      if (m.t === 'rready') { S.ready.add(from); return; }
      if (m.t === 'rcmd') {
        const role = S.roles[from];
        if (m.op === 'click' && role === 'engineer' && typeof m.id === 'string' && m.id.length < 48 && (G.mode === 'racing' || G.mode === 'countdown')) ctx.hostClick(m.id);
        else if (m.op === 'nitro' && G.mode === 'racing') { const r = ctx.hostNitro(); S.net.sendTo(from, { t: 'rtoast', text: r.text, ms: 2200 }); }
        else if (m.op === 'reset' && role === 'driver' && G.mode === 'racing') ctx.hostReset();
        return;
      }
      return;
    }
    if (m.t === 'rs') applySnapshot(m);
    else if (m.t === 'rtoast') ctx.toast(m.text, m.ms || 2200);
    else if (m.t === 'rw') ctx.onWarn(m.w);
    else if (m.t === 'rres') ctx.onResult(m);
    else if (m.t === 'rimp') ctx.onImpact(m.sp);
    else if (m.t === 'rroles') { S.roles = { ...m.roles }; ctx.onRoles(); }
  };
  // Host: Mitspieler tritt (wieder) bei oder geht
  R.playerJoined = (id, name, rejoin) => {
    const S = R.S; if (!S || !S.host) return;
    const ids = S.net.players.map((p) => p.id); S.roles = resolveRoles(ids, S.roles);
    S.net.sendTo(id, { t: 'start', mode: 'race', diff: S.diff, roles: S.roles, late: 1, ver: ctx.version });
    S.net.broadcast({ t: 'rroles', roles: S.roles }); ctx.onRoles();
  };
  R.playerLeft = (id) => {
    const S = R.S; if (!S || !S.host) return; S.inp.delete(id); S.ready.delete(id);
    if (S.roles[id] === 'engineer') { ctx.hostRelease(); S.hr = null; S.eo = null; }
    S.net.broadcast({ t: 'rroles', roles: S.roles }); ctx.onRoles();
  };
  return R;
}
