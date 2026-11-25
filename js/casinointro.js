// Theos Seitenscheidel - Teo's Casino: das Intro „Der Absturz“. Szene 1: die Wohnung, sechs Textzeilen mit eigenen Kamerafahrten. Szene 2: der Flyer unter der Tür, „TEO'S CASINO.“
// Szene 3: Busfahrt (Musik wird von traurig über geheimnisvoll zu aufregend), Ankunft, Leuchtschild „Weil er reich ist.“, die drei gehen hinein, die Kamera fliegt in die Halle, dann übernehmen die Spieler.
import * as THREE from './vendor/three.module.min.js';
import { buildHome, buildRide, buildBus } from './casinoscenes.js';
import { createPerson, walkTo, FAMILY } from './casinofig.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const ease = (t) => t * t * (3 - 2 * t); const lerp = (a, b, t) => a + (b - a) * t;
export const LINES = ['Es war einmal eine Familie, die alles hatte.', 'Doch irgendwann kam alles anders.', 'Das Geld wurde knapp.', 'Die Rechnungen stapelten sich.', 'Das Zuhause stand auf dem Spiel.', 'Es gab nur noch eine Hoffnung …'];
export const INTRO_LEN = 101;
// Höhe des Bodens draußen (Vorplatz, zwei Stufen, Gehweg, Straße)
export function groundY(x, z) { if (z < 12.1 || Math.abs(x) > 23) return 0; if (z < 12.7) return lerp(0, -0.153, clamp((z - 12.05) / 0.1, 0, 1)); if (z < 13.3) return lerp(-0.153, -0.306, clamp((z - 12.65) / 0.1, 0, 1)); if (z < 17.05) return lerp(-0.306, -0.46, clamp((z - 13.25) / 0.1, 0, 1)); return -0.6; }

export function createIntro(ctx) {
  const { renderer, world, sound, cam, $, onDone, seats } = ctx; // seats: Blicke/Farben der drei (Rot, Blau, Gelb), myIndex
  const I = { on: false, t: 0, home: null, ride: null, bus: null, fam: { home: [], ride: [], world: [] }, driver: null, scene: null, hold: 0, shot: -1, ev: 0, lastText: -1 };
  function build() {
    if (I.home) return; I.home = buildHome(renderer, world.sky); I.ride = buildRide(renderer, world.sky);
    I.bus = buildBus(world.room.env); I.bus.group.position.set(40, -0.6, 18.45); I.bus.group.rotation.y = Math.PI; I.bus.group.userData.live = true; world.scene.add(I.bus.group); I.bus.group.userData.freeze();
    FAMILY.forEach((look, i) => { const h = createPerson(I.home.scene, look); h.place(-0.68 + i * 0.68, 0, -1.95, 0); h.mode = 'sit'; h.seat = 0.5; h.sad = 1; I.fam.home.push(h);
      const r = createPerson(I.ride.scene, look); r.mode = 'sit'; r.seat = 0.52; I.fam.ride.push(r);
      const w = createPerson(world.scene, look); w.setVisible(false); I.fam.world.push(w); });
    I.driver = createPerson(I.ride.scene, { shirt: 0x5a6a7a, cap: 0x2a3a5a, brim: 0x1a2a4a, hair: 0x3a2a1e, skin: 0xd8a47e, pants: 0x2a2f3a }); I.driver.mode = 'sit'; I.driver.seat = 0.54; I.driver.act = 'drive';
  }
  // ---------- Text und Blenden ----------
  const el = { root: $('caStory'), t: $('caStoryT'), h: $('caStoryH'), fade: $('caFade'), skip: $('caSkipBar'), cap: $('caStoryCap') };
  let textShown = ''; let fadeV = 1;
  function text(s, kind = 'line') { if (s === textShown) return; textShown = s; el.t.classList.remove('on'); el.h.classList.remove('on'); if (!s) return; const tgt = kind === 'title' ? el.h : el.t; tgt.textContent = s; void tgt.offsetWidth; tgt.classList.add('on'); }
  function fade(v) { if (Math.abs(v - fadeV) < 0.004) return; fadeV = v; el.fade.style.opacity = String(clamp(v, 0, 1)); }
  // ---------- Kamera ----------
  const look = V3(); const P = V3();
  function camAt(p, l, fov = 50) { cam.position.copy(p); look.copy(l); cam.lookAt(look); cam.fov = fov; cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); if (cam.aspect < 1.3) cam.fov = fov * 1.3 / cam.aspect; cam.updateProjectionMatrix(); cam.updateMatrixWorld(); }
  const path = (pts) => new THREE.CatmullRomCurve3(pts.map((p) => V3(...p)), false, 'centripetal');
  // ---------- Ablauf (Sekunden) ----------
  // [start, ende, Szene, Kamera(u, t)]
  const H = () => I.home.P;
  const SHOTS = [
    [0, 6.5, 'home', (u) => { const p = H().photo; camAt(V3(p.x - 0.05 + u * 0.02, p.y + 0.02, p.z + 0.36 + u * 0.45), V3(p.x, p.y, p.z), 34); }],
    [6.5, 12.5, 'home', (u) => { const a = lerp(-0.25, 0.55, ease(u)); camAt(V3(2.35, 1.55, 1.9), V3(-3 + Math.sin(a) * 0.5, 1.35 - u * 0.2, -0.1 + a * 1.4), 50); }],
    [12.5, 18, 'home', (u) => { camAt(V3(1.05 - u * 0.12, 0.72 - u * 0.05, -0.42 - u * 0.12), V3(0.3, 0.47, -0.78), 40); }],
    [18, 23.5, 'home', (u) => { camAt(V3(-0.35 + u * 0.4, 1.15 - u * 0.05, -0.38), V3(-0.12 + u * 0.4, 0.46, -0.84), 42); }],
    [23.5, 29, 'home', (u) => { const n = I.home.P.door; camAt(V3(1.15 + u * 0.75, 1.42, 0.85 + u * 0.05), V3(n.x, n.y + 0.02, n.z), 42 - u * 8); }],
    [29, 35, 'home', (u) => { camAt(V3(0.25 - u * 0.2, 1.25 - u * 0.15, 1.6 - u * 0.75), V3(0, 0.75, -2.0), 46); }],
    [35, 38.6, 'home', (u) => { camAt(V3(1.45 - u * 0.1, 0.32, -0.15 + u * 0.1), V3(2.6, 0.12, 0.72), 52); }],
    [38.6, 41, 'home', (u) => { camAt(V3(1.75 - u * 0.15, 1.02, -0.35 - u * 0.1), V3(-0.1, 0.92, -1.95), 44); }],
    [41, 42.6, 'home', (u) => { const f = I.home.flyer.position; camAt(V3(f.x - 0.42 + u * 0.08, 0.45, f.z - 0.05), V3(f.x, 0.02, f.z), 40); }],
    [42.6, 48, 'home', (u) => { const f = I.home.flyer.position; camAt(V3(f.x - 0.95 + u * 0.25, 0.5 - u * 0.08, f.z - 0.15), V3(f.x, 0.05, f.z), 44 - u * 6); }],
    [48, 55.5, 'ride', (u) => { camAt(V3(-1.6 + u * 0.3, 1.62, 0.2), V3(-5.45, 1.05, 0), 52); }],
    [55.5, 60.5, 'ride', (u) => { camAt(V3(-4.6, 1.3, -0.95 + u * 0.08), V3(-5.6, 1.28, 0.9), 44); }],
    [60.5, 67.5, 'ride', (u) => { camAt(V3(3.5 + u * 0.3, 1.95, -0.25), V3(20, 3.2 + u * 3, 1.0), 58); }],
    [67.5, 73.5, 'world', (u) => { camAt(V3(-7.5 + u * 1.5, 0.55, 15.6), V3(lerp(14, 2, ease(u)), 1.2, 18.4), 50); }],
    [73.5, 78, 'world', (u) => { camAt(V3(3.6 - u * 0.4, 1.25, 14.6), V3(0, 0.6, 17.8), 48); }],
    [78, 86, 'world', (u) => { const k = ease(clamp((u - 0.3) * 1.7, 0, 1)); camAt(V3(lerp(1.6, 1.2, k), lerp(1.25, 0.95, k), lerp(16.6, 21.2, k)), V3(0, lerp(1.6, 9.8, k), lerp(14, 9, k)), lerp(50, 60, k)); }],
    [86, 91, 'world', (u) => { camAt(V3(-3.2 + u * 0.8, 1.55, 15.2 - u * 1.2), V3(0, 1.8, 9), 52); }],
  ];
  const fly = path([[0, 1.7, 14.2], [0, 1.75, 10.6], [0, 1.85, 7.6], [0, 2.1, 3.6], [0, 3.6, -1.5], [3.2, 5.8, -4.6], [2.4, 4.2, -2.6], [0.6, 2.4, 0.4], [0, 1.62, 1.6]]);
  const flyLook = path([[0, 1.6, 8], [0, 1.7, 4], [0, 1.9, -2], [0, 2.4, -9], [0, 2.8, -12], [0, 2.6, -12], [0, 2.2, -10], [0, 1.8, -6], [0, 1.6, -6]]);
  SHOTS.push([91, INTRO_LEN, 'world', (u) => { const k = ease(u); fly.getPoint(k, P); flyLook.getPoint(Math.min(1, k * 1.04), look); camAt(P, look, lerp(52, 62, k)); }]);
  const TEXTS = [[1.2, 6.0, LINES[0]], [7.2, 12.0, LINES[1]], [13.0, 17.6, LINES[2]], [18.5, 23.0, LINES[3]], [24.0, 28.6, LINES[4]], [29.6, 34.6, LINES[5]], [35.4, 40.6, 'Doch vielleicht gibt es noch einen Ausweg.'], [42.7, 47.2, "TEO'S CASINO.", 'title']];
  // Ereignisse
  const EV = [
    [0.1, () => { sound.story(true); sound.rain(0.9); }], [35.5, () => { I.carLight = true; }], [42.62, () => { sound.stinger(); }], [44.5, () => { sound.story(false); }], [47.6, () => { sound.rain(0); }],
    [48.2, () => { sound.bus(0.8); sound.music('mystery', 3); }], [59.5, () => { sound.music('rise', 2); }], [67.5, () => { sound.bus(0.55); }], [70.6, () => { sound.brakes(); }], [72.4, () => { sound.bus(0.25); }],
    [73.8, () => { sound.hiss(); }], [78.2, () => { sound.hiss(); }], [79.3, () => { sound.bus(0.7); }], [82, () => { sound.bus(0.15); }], [79.6, () => { sound.neon(true); }], [81.2, () => { sound.zap(); }], [81.9, () => { sound.zap(); }], [82.3, () => { sound.sparkle(); }], [85, () => { sound.music('lounge', 4); sound.bus(0); }], [86.6, () => { sound.doorThunk(); sound.amb(0.45); sound.neon(false); }], [92, () => { sound.amb(0.95); }],
  ];
  function setScene(name) { if (I.scene === name) return; I.scene = name; }
  // Familie draußen: aussteigen, zum Eingang, hinein
  const exitPts = [[0, 18.4], [0.5, 16.3], [-0.4, 16.0], [0.35, 15.7]];
  function worldFamily(t, dt) {
    const F = I.fam.world; const bus = I.bus; const tb = t - 67.5;
    // Bus fährt heran und hält (bremst weich), Türen auf ab 73,8
    const u = clamp(tb / 5, 0, 1); const away = Math.max(0, t - 79.2); bus.group.position.x = lerp(46, 0, 1 - Math.pow(1 - u, 2.4)) - away * away * 3.2; bus.setDoor(clamp((t - 73.8) / 0.9, 0, 1) * (1 - clamp((t - 78.2) / 0.8, 0, 1))); bus.group.visible = bus.group.position.x > -70; for (const s of bus.head) s.intensity = 14;
    F.forEach((p, i) => { const go = 74.6 + i * 0.75; if (t < go) { p.setVisible(false); return; } if (!p.visible) { p.setVisible(true); p.place(-0.0 + (i - 1) * 0.15, -0.26, 18.7, Math.PI); p.wp = 0; } const target = [[(i - 1) * 0.6, 16.2 - i * 0.2], [(i - 1) * 0.55, 15.4 - i * 0.15]];
      if (t < 85.6) { const tg = target[t < go + 1.6 ? 0 : 1]; if (walkTo(p, tg[0], tg[1], dt, 1.2, groundY)) { p.mode = 'stand'; p.act = t > 79 ? 'look' : 0; p.yaw += (Math.PI - p.yaw) * Math.min(1, dt * 3); } else p.act = 0; }
      else { p.act = 0; const way = [[(i - 1) * 0.55, 12.6], [(i - 1) * 0.5, 9.6], [(i - 1) * 0.7, 6.4], [(i - 1) * 1.1 + 0, 3.2 - (i === 1 ? 0.6 : 0)]]; p.wp = p.wp || 0; if (p.wp < way.length && walkTo(p, way[p.wp][0], way[p.wp][1], dt, 1.25, groundY)) p.wp++; if (p.wp >= way.length) { p.mode = 'stand'; p.lookAt = V3(0, 3, -12); } } p.update(dt, t); });
    world.setDoors(ease(clamp((t - 86.4) / 1.4, 0, 1))); world.setSign(1, t < 80.8 ? 0 : t < 81.3 ? (Math.random() < 0.5 ? 0.8 : 0) : t < 82 ? (Math.random() < 0.6 ? 1 : 0.1) : 1);
  }
  function start() { build(); sound.music(null, 0.4); sound.amb(0); sound.home(0); sound.rain(0); sound.bus(0); sound.neon(false); /* beim Wiederholen: Casino-Klang aus, nur der Ton des Intros */ I.on = true; I.t = 0; I.ev = 0; I.hold = 0; I.carLight = false; el.root.classList.remove('hidden'); fade(1); text(''); world.setSign(1, 1); world.setDoors(0); I.fam.world.forEach((p) => p.setVisible(false)); I.bus.group.position.x = 46; }
  function finish(skipped) { if (!I.on) return; I.on = false; text(''); el.root.classList.add('hidden'); sound.story(false); sound.rain(0); sound.bus(0); sound.neon(false); sound.music('lounge', skipped ? 1 : 3); sound.amb(0.95); world.setSign(1, 1); world.setDoors(0); I.bus.group.position.x = 60; I.bus.setDoor(0); for (const s of I.bus.head) s.intensity = 0; onDone({ fam: I.fam.world, skipped }); }
  function update(dt) {
    if (!I.on) return null; I.t += dt; const t = I.t;
    while (I.ev < EV.length && EV[I.ev][0] <= t) { try { EV[I.ev][1](); } catch (e) { /* weiter */ } I.ev++; }
    if (t >= INTRO_LEN) { finish(false); return null; }
    const shot = SHOTS.find((s) => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1]; setScene(shot[2]); shot[3](clamp((t - shot[0]) / (shot[1] - shot[0]), 0, 1), t);
    // Text
    const tx = TEXTS.find((q) => t >= q[0] && t < q[1]); text(tx ? tx[2] : '', tx && tx[3]);
    // Blenden: Anfang, Ende Szene 2, Wechsel in den Bus, Wechsel nach draußen, Ende
    let f = 0; if (t < 1.6) f = 1 - t / 1.6; else if (t > 46.4 && t < 48.6) f = t < 47.8 ? (t - 46.4) / 1.4 : 1 - (t - 47.8) / 0.8; else if (t > 66.9 && t < 68.2) f = t < 67.5 ? (t - 66.9) / 0.6 : 1 - (t - 67.5) / 0.7; else for (const c of [6.5, 12.5, 18, 23.5, 29, 35, 38.6, 55.5, 60.5, 73.5, 78, 86, 91]) { const d = Math.abs(t - c); if (d < 0.35) f = Math.max(f, (0.35 - d) / 0.35 * 0.9); }
    fade(f);
    // Szenen bewegen
    if (I.scene === 'home') { const hope = clamp((t - 38.3) / 1.6, 0, 1); I.fam.home.forEach((p, i) => { p.sad = 1 - hope * 0.85; p.hope = hope; p.lookAt = hope > 0.2 ? V3(2.6, 0.1, 0.75) : null; p.update(dt, t + i); }); I.home.update(t, dt, { flyer: clamp((t - 36.6) / 2.2, 0, 1), car: I.carLight && t < 36 }); }
    if (I.scene === 'ride') { const approach = clamp((t - 60.5) / 7, 0, 1); I.ride.update(t, dt, { speed: t > 65 ? lerp(12, 4, (t - 65) / 2.5) : 12, approach }); const g = I.ride.bus.group; I.fam.ride.forEach((p, i) => { const s = I.ride.bus.seatsBack[i]; p.place(s.x, I.ride.bus.F + g.position.y, s.z, Math.PI / 2); p.sad = 0.35 - i * 0.1; p.hope = t > 57 ? 0.6 : 0.2; p.lookAt = i === 1 && t > 55 ? V3(-5.6, 1.5, 3) : i === 0 ? V3(-5.2, 0.8, 0.2) : null; p.update(dt, t + i); }); I.driver.place(I.ride.bus.driver.x, I.ride.bus.F + g.position.y, I.ride.bus.driver.z, Math.PI / 2); I.driver.update(dt, t); }
    if (I.scene === 'world') worldFamily(t, dt);
    // Überspringen: Leertaste halten
    el.skip.style.transform = `scaleX(${clamp(I.hold / 0.9, 0, 1)})`; if (I.hold >= 0.9) finish(true);
    const S = I.scene === 'home' ? I.home : I.scene === 'ride' ? I.ride : null; return S ? { scene: S.scene, sky: S.sky, sun: S.sun, sunDir: S.sunDir, mood: S.mood } : { world: true };
  }
  return { I, start, update, finish, build, set holding(v) { I.hold = v ? I.hold : 0; }, hold(dt) { I.hold += dt; }, release() { I.hold = 0; } };
}
