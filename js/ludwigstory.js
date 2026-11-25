// Theos Seitenscheidel - Ludwig: Vorspann (nicht überspringbar, etwa 50 Sekunden, mit Stimmen und Untertiteln).
// Wohnzimmer: Ludwig zockt am Familien-PC, Mama schimpft, Papa zieht den Stecker, Ludwig stampft raus. Ludwigs Zimmer: Er will unabhängig werden,
// findet Opas alten Tabak, dann klopfen zwei Kumpels ans Fenster: „Sollen wir dir helfen?“. Zum Schluss sitzen alle drei am Tisch.
import * as THREE from './vendor/three.module.min.js';
import { walkTo, faceTo } from './casinofig.js';
import { LIVING, SEATS, CUST_Z, OUT_Y, VIEWS, seatAt } from './ludwigart.js';
import { WHO, VOICE } from './ludwigvoice.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
export const INTRO_IDS = ['i01', 'i02', 'i03', 'i04', 'i05', 'i06', 'i07', 'i08', 'i09', 'i10', 'i11', 'i12', 'i13'];

export function createLudwigStory({ W, snd, $, hud, setCam, frontWall }) {
  const cast = W.cast; const X = LIVING.x; const LV = W.living;
  const ST = { on: false, t: 0, timers: [], walkers: [], cam: null, token: 0, onEnd: null };
  const wait = (s) => new Promise((res) => ST.timers.push({ t: s, res, tok: ST.token }));
  // Kamera: von A nach B in dur Sekunden
  function shot(p0, l0, p1, l1, dur = 6, fov = 50) { ST.cam = { p0: V3(...p0), l0: V3(...l0), p1: V3(...(p1 || p0)), l1: V3(...(l1 || l0)), t: 0, dur, fov }; }
  function sub(who, text) { const s = $('lwSub'); if (!who) { s.classList.add('hidden'); return; } const w = WHO[who] || { name: '', col: '#fff' }; $('lwSubN').textContent = w.name; $('lwSubN').style.color = w.col; $('lwSubT').textContent = text; s.classList.remove('hidden'); s.classList.remove('lw-subin'); void s.offsetWidth; s.classList.add('lw-subin'); }
  async function say(id, after = 0.25) { const v = VOICE[id]; sub(v.who, v.text); let d = snd.playVoice(id); if (!d) d = 0.6 + v.text.length * 0.065; await wait(d + after); sub(null); }
  function walk(P, path, speed = 1.3) { return new Promise((res) => ST.walkers.push({ P, path: path.map((q) => ({ x: q[0], z: q[1] })), speed, res, tok: ST.token })); }
  async function fade(on, dur = 0.5) { const f = $('lwFade'); f.style.transition = `opacity ${dur}s ease`; f.classList.toggle('on', on); await wait(dur); }
  function title(on) { $('lwTitle').classList.toggle('on', on); }
  const show = (P, on) => P.setVisible(on);
  const seatProps = (i, on) => { const s = W.seats[i]; s.booklet.visible = on; s.pouch.visible = on; };

  async function run(tok) {
    const ok = () => tok === ST.token;
    // ---- Wohnzimmer
    LV.scr.material.map = LV.screens.on; LV.scr.material.needsUpdate = true; LV.glow.intensity = 1.6; LV.cable.visible = true;
    const lud = cast.ludwig; show(lud, true); lud.place(X + LIVING.chair.x, 0, LIVING.chair.z, Math.PI); lud.mode = 'sit'; lud.seat = 0.47; lud.act = 'piano'; lud.lookAt = V3(X, 1.12, LIVING.z0 + 0.22);
    const mama = cast.mama; const papa = cast.papa; show(mama, false); show(papa, false);
    shot([X - 1.5, 1.55, -0.1], [X, 1.05, -2.3], [X - 0.9, 1.45, -0.55], [X, 1.0, -2.3], 9, 50); await fade(false, 0.9); if (!ok()) return;
    await say('i01', 0.35); if (!ok()) return;
    await say('i02', 0.3); if (!ok()) return;
    // Mama kommt rein
    show(mama, true); mama.place(X - 2.2, 0, 3.2, Math.PI); mama.mode = 'stand'; mama.act = 0; mama.lookAt = null;
    shot([X + 2.5, 1.85, 2.0], [X - 0.6, 1.05, -0.6], [X + 2.2, 1.8, 1.7], [X - 0.6, 1.05, -0.8], 8, 52);
    walk(mama, [[X - 2.2, 2.0], [X - 1.0, 0.15]], 1.4); await wait(0.7); if (!ok()) return;
    await say('i03', 0.2); if (!ok()) return;
    lud.act = 0; lud.lookAt = V3(X - 1.0, 1.55, 0.15); shot([X + 1.25, 1.55, -0.45], [X - 0.1, 1.27, -1.55], [X + 1.3, 1.58, -0.38], [X - 0.1, 1.27, -1.55], 4, 46);
    await say('i04', 0.25); if (!ok()) return;
    // Papa zieht den Stecker
    show(papa, true); papa.place(X - 2.2, 0, 3.2, Math.PI); papa.mode = 'stand'; papa.act = 0; mama.lookAt = V3(X, 1.2, -1.4); mama.act = 'arms';
    shot([X + 2.5, 1.85, 2.0], [X - 0.2, 1.0, -1.0], [X + 2.6, 1.7, 1.2], [X + 0.4, 0.9, -1.6], 6, 52);
    const pw = walk(papa, [[X - 2.0, 1.6], [X + 1.2, 0.35], [X + 0.95, -1.8]], 1.7); /* um Ludwigs Stuhl herum */ await say('i05', 0.1); if (!ok()) return; await pw; if (!ok()) return;
    papa.lookAt = V3(X + LIVING.socket.x, 0.35, LIVING.z0); papa.act = 'point'; await wait(0.45); if (!ok()) return;
    snd.plug(); LV.cable.visible = false; LV.scr.material.map = LV.screens.off; LV.scr.material.needsUpdate = true; LV.glow.intensity = 0; lud.lookAt = V3(X, 1.12, LIVING.z0 + 0.22); await wait(0.6); if (!ok()) return;
    papa.act = 'arms'; papa.lookAt = V3(X, 1.3, -1.42);
    shot([X + 0.6, 1.64, -0.36], [X - 1.0, 1.52, 0.15], [X + 0.48, 1.65, -0.32], [X - 1.0, 1.52, 0.15], 5, 44); await say('i06', 0.2); if (!ok()) return;
    // Ludwig stampft raus
    lud.mode = 'stand'; lud.act = 0; lud.lookAt = null; shot([X + 2.5, 1.85, 2.0], [X - 0.8, 1.0, 0.0], [X + 2.3, 1.8, 2.2], [X - 1.6, 1.0, 1.4], 5, 54);
    const lw = walk(lud, [[X - 0.25, -0.9], [X - 1.4, 0.9], [X - 2.2, 2.2], [X - 2.2, 3.4]], 1.7); await say('i07', 0.1); if (!ok()) return; await Promise.race([lw, wait(2.2)]); if (!ok()) return; mama.lookAt = null;
    await fade(true, 0.45); snd.slam(); show(mama, false); show(papa, false); await wait(0.5); if (!ok()) return;
    // ---- Ludwigs Zimmer
    for (let i = 0; i < SEATS.length; i++) seatProps(i, false); show(cast.rot, false); show(cast.gelb, false); if (cast.gruen) show(cast.gruen, false);
    const s1 = SEATS[1]; lud.place(s1.x, 0, s1.z + 0.06, Math.PI); lud.mode = 'sit'; lud.seat = 0.47; lud.act = 0; lud.sad = 0.6; lud.lookAt = null;
    shot([0.75, 1.35, -0.65], [0, 1.0, 1.45], [0.55, 1.3, -0.4], [0, 1.0, 1.45], 7, 46); await fade(false, 0.6); if (!ok()) return;
    await say('i08', 0.3); if (!ok()) return;
    // Opas Tabak taucht auf dem Tisch auf
    lud.sad = 0; lud.hope = 0.8; shot([0.5, 1.3, 0.0], [0, 0.8, 0.75], [0.4, 1.22, 0.2], [0, 0.8, 0.75], 5, 44); const pop = W.seats[1]; pop.booklet.scale.setScalar(0.01); pop.pouch.scale.setScalar(0.01); seatProps(1, true); ST.pop = { t: 0, items: [pop.booklet, pop.pouch] }; snd.hide();
    await say('i09', 0.3); if (!ok()) return;
    // Es klopft: die Kumpels am Fenster
    const rot = cast.rot; const gelb = cast.gelb; show(rot, true); show(gelb, true); rot.place(0.42, OUT_Y, CUST_Z, 0); gelb.place(-0.45, OUT_Y, CUST_Z, 0); for (const P of [rot, gelb]) { P.mode = 'stand'; P.act = 0; P.lookAt = V3(0, 1.2, 1.1); }
    lud.hope = 0; lud.lookAt = V3(0, 1.5, -3.2); shot([0.64, 1.5, 1.5], [0, 1.45, -3.6], [0.58, 1.48, 1.0], [0, 1.45, -3.6], 7, 46); /* neben Ludwigs Kopf vorbei: mitten drin sieht man nur noch seinen Schirm */ snd.knock(); await wait(0.8); if (!ok()) return;
    rot.act = 'wave'; await say('i10', 0.15); if (!ok()) return; rot.act = 0; await say('i11', 0.2); if (!ok()) return;
    shot([0.45, 1.55, -2.45], [0, 1.15, 1.1], [0.35, 1.5, -2.3], [0, 1.15, 1.1], 4, 46); await say('i12', 0.3); if (!ok()) return;
    // Sie klettern rein und setzen sich, der Erzähler schließt
    W.win.hinge.rotation.y = 1.2; await fade(true, 0.4); rot.place(-0.6, 0, -2.35, Math.PI); gelb.place(0.6, 0, -2.35, Math.PI); W.win.hinge.rotation.y = 0; frontWall(false);
    shot(VIEWS.zimmer.pos, VIEWS.zimmer.look, [1.5, 2.15, 5.0], [-0.2, 0.85, -0.6], 7, 56); await fade(false, 0.5); if (!ok()) return;
    const w1 = walk(rot, [[-1.95, -1.2], seatAt(SEATS[0], 0.55)], 1.5); const w2 = walk(gelb, [[1.95, -1.2], seatAt(SEATS[2], 0.55)], 1.5);
    await say('i13', 0.2); if (!ok()) return; await Promise.race([Promise.all([w1, w2]), wait(3)]); if (!ok()) return;
    for (const [P, s] of [[rot, SEATS[0]], [gelb, SEATS[2]]]) { const [px, pz] = seatAt(s, -0.08); P.place(px, 0, pz, s.face); P.mode = 'sit'; P.seat = 0.47; P.lookAt = null; } seatProps(0, true); seatProps(2, true);
    title(true); await wait(3.2); if (!ok()) return; title(false); await fade(true, 0.6); if (!ok()) return;
    end(true);
  }
  function play(onEnd) {
    ST.token++; ST.on = true; ST.t = 0; ST.timers = []; ST.walkers = []; ST.onEnd = onEnd; ST.pop = null; hud.classList.add('lw-cine'); $('lwFade').classList.add('on'); sub(null); title(false); frontWall(true);
    const tok = ST.token; snd.preload(INTRO_IDS).then(() => { if (tok === ST.token) run(tok); });
  }
  function end(natural) {
    if (!ST.on) return; ST.on = false; ST.token++; snd.stopVoice(); sub(null); title(false); hud.classList.remove('lw-cine'); frontWall(true); W.win.hinge.rotation.y = 0;
    cast.ludwig.setVisible(false); cast.mama.setVisible(false); cast.papa.setVisible(false); for (let i = 0; i < SEATS.length; i++) { W.seats[i].booklet.visible = true; W.seats[i].pouch.visible = true; W.seats[i].booklet.scale.setScalar(1); W.seats[i].pouch.scale.setScalar(1); }
    const f = $('lwFade'); f.style.transition = 'opacity .6s ease'; f.classList.remove('on'); const cb = ST.onEnd; ST.onEnd = null; if (cb) cb(natural);
  }
  function step(dt) {
    if (!ST.on) return; ST.t += dt;
    for (let i = ST.timers.length - 1; i >= 0; i--) { const q = ST.timers[i]; if (q.tok !== ST.token) { ST.timers.splice(i, 1); continue; } q.t -= dt; if (q.t <= 0) { ST.timers.splice(i, 1); q.res(); } }
    for (let i = ST.walkers.length - 1; i >= 0; i--) { const w = ST.walkers[i]; if (w.tok !== ST.token) { ST.walkers.splice(i, 1); continue; } const tgt = w.path[0]; if (walkTo(w.P, tgt.x, tgt.z, dt, w.speed)) { w.path.shift(); if (!w.path.length) { w.P.mode = 'stand'; ST.walkers.splice(i, 1); w.res(); } } }
    if (ST.pop) { ST.pop.t += dt; const k = ease(ST.pop.t / 0.45); for (const o of ST.pop.items) o.scale.setScalar(Math.max(0.01, k * (1 + Math.sin(k * Math.PI) * 0.25))); if (ST.pop.t > 0.5) ST.pop = null; }
    for (const P of Object.values(cast)) if (P.visible) P.update(dt, ST.t);
    if (ST.cam) { const c = ST.cam; c.t += dt; const e = ease(c.t / c.dur); setCam(V3().lerpVectors(c.p0, c.p1, e), V3().lerpVectors(c.l0, c.l1, e), c.fov); }
  }
  return { play, step, end, get on() { return ST.on; }, state: ST };
}
