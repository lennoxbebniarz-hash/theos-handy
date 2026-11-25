// Theos Seitenscheidel - Trockne den Ozean aus: die Filmszenen.
// Vorspann: Theo macht am Pazifik-Steg ein Selfie, eine Möwe schnappt sich das Handy und lässt es über dem Meer fallen. Unter Wasser greift die Krake zu
//           und verschwindet damit in der Tiefe. Theo nimmt ein Glas: Dann wird der Pazifik eben leer getrunken.
// Zwischenszene: Der Pazifik ist staubtrocken, Steppenläufer rollen über den Meeresboden, Theo findet sein Handy. Bruno schreibt: Seine Goldkette liegt im Atlantik.
// Abspann: Auch der Atlantik ist leer. Die drei finden die Goldkette, die Tiere planschen im Becken am Haus, dazu die Bilanz.
// Jeder spielt die Szenen bei sich ab. Überspringen: Esc, oder Leertaste/E gedrückt halten.
import * as THREE from './vendor/three.module.min.js';
import { oceanPerson, LOOKS, phoneModel, buildModel, buildGull } from './ozeanart.js';
import { walkTo, faceTo } from './casinofig.js';
import { HARBOR, POOL, bedH, WEG, BASE_Y } from './ozeanworld.js';
import { BODEN, TIEF, MEERE, bigLiter, euro } from './ozeanlogic.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.7, ...o });

// Steppenläufer: ein paar verschlungene Zweigringe
function buildWeed() { const g = new THREE.Group(); const m = std({ color: 0x9a7a4a, roughness: 0.95 }); for (let i = 0; i < 6; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.45 + (i % 3) * 0.06, 0.025, 4, 18), m); r.rotation.set(i * 0.9, i * 1.7, i * 0.4); g.add(r); } g.visible = false; return g; }

export function createOzeanStory(X) {
  const { C, $, snd, hud, onEnd } = X;
  const ST = { on: false, kind: null, t: 0, pt: 0, hold: 0, shake: 0, inside: false, under: false, lv: null, dry: null, min: 11 * 60, fam: [], look: V3() };
  const cue = (at) => ST.pt < at && ST.t >= at;
  function ensure() {
    if (ST.ready) return; ST.ready = true; const scene = C.W.scene;
    ST.fam = LOOKS.map((look) => { const p = oceanPerson(scene, look); p.setVisible(false); p.tank.visible = false; return p; });
    ST.gull = buildGull(); scene.add(ST.gull); ST.weeds = [0, 1, 2, 3].map(() => { const w = buildWeed(); scene.add(w); return w; });
    ST.phone = phoneModel(); ST.phone.visible = false; scene.add(ST.phone); ST.glass = buildModel('Glas', { shadow: false }); ST.glass.group.visible = false; scene.add(ST.glass.group);
    ST.crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.55), std({ color: 0x8a6440, roughness: 0.85 })); ST.crate.castShadow = true; ST.crate.visible = false; scene.add(ST.crate);
    ST.krake = C.W.animals.find((a) => a.krake) || null; ST.wal = C.W.animals.find((a) => a.kind === 'Wal' && a.m === 0) || null;
  }
  // Anzeige
  function title(k, h, s) { $('ozCutK').textContent = k || ''; $('ozCutH').textContent = h || ''; $('ozCutS').textContent = s || ''; const t = $('ozCutTitle'); t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); }
  function untitle() { $('ozCutTitle').classList.remove('on'); }
  function say(text, dur = 3.4) { const l = $('ozCutLine'); l.textContent = text; l.classList.remove('on'); void l.offsetWidth; l.classList.add('on'); ST.lineT = dur; }
  function card(text) { const c = $('ozCutCard'); if (!text) { c.classList.remove('on'); return; } c.textContent = text; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); }
  // Handy groß im Bild: rows = [[Klasse, Text], ...]
  function phoneUI(rows) { const box = $('ozPhone'); const inn = $('ozPhoneIn'); if (!rows) { box.classList.remove('on'); return; } inn.textContent = ''; for (const [cls, text] of rows) { const d = document.createElement('div'); d.className = 'ph-' + cls; if (cls === 'bar') { const a = document.createElement('span'); a.textContent = '12:00'; const b = document.createElement('span'); b.textContent = text; if (/3 %/.test(text)) b.className = 'low'; d.append(a, b); } else d.textContent = text; inn.append(d); } box.classList.add('on'); }
  function black(on, dur = 0.7) { const f = $('ozFade'); f.style.transition = `opacity ${dur}s`; f.classList.toggle('on', !!on); }
  function cam(p, look, fov = 55) { const c = C.cam; c.position.copy(p); if (ST.shake > 0) { c.position.x += (Math.random() - 0.5) * ST.shake * 0.1; c.position.y += (Math.random() - 0.5) * ST.shake * 0.08; } c.up.set(0, 1, 0); c.lookAt(look); c.fov = fov; }
  const H0 = () => HARBOR[0]; const pierPt = (hb, a, side = 0) => { const ux = Math.sin(hb.pierYaw); const uz = Math.cos(hb.pierYaw); return V3(hb.pier.x0 + ux * a + uz * side, hb.pier.y, hb.pier.z0 + uz * a - ux * side); };
  const ground = (x, z) => { const p = C.W.pierAt(x, z); return p !== null ? p : bedH(x, z); };
  function dropSpot() { const p = WEG[0]; let d = 0; for (let k = 1; k < p.length; k++) { d += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); if (d > 45 && -bedH(p[k][0], p[k][1]) > 4.5) return { x: p[k][0], z: p[k][1] }; } return { x: p[8][0], z: p[8][1] }; }
  function holdPhone(p, on) { const hand = p.fig.bones.handR || p.fig.root.getObjectByName('handR'); if (on && hand) { if (ST.phone.parent !== hand) { hand.add(ST.phone); ST.phone.position.set(0, -0.07, 0.04); ST.phone.rotation.set(0, 0, 0); ST.phone.scale.setScalar(1); } ST.phone.visible = true; } else if (!on && ST.phone.parent !== C.W.scene) { const wp = ST.phone.getWorldPosition(V3()); C.W.scene.add(ST.phone); ST.phone.position.copy(wp); } }
  const screenText = (lines, bg = '#101820') => ST.phone.draw((x, w, h) => { x.fillStyle = bg; x.fillRect(0, 0, w, h); x.textAlign = 'center'; lines.forEach(([t, y, size, col]) => { x.fillStyle = col || '#fff'; x.font = `700 ${size || 18}px Bahnschrift`; x.fillText(t, w / 2, y); }); });

  function play(kind, info = {}) {
    if (!C.W) return false; ensure(); if (ST.on) finish(false);
    Object.assign(ST, { on: true, kind, info, t: 0, pt: -1, hold: 0, shake: 0, lineT: 0, under: false });
    for (const p of ST.fam) { p.setVisible(false); p.act = 0; p.actT = undefined; p.lookAt = null; p.mode = 'stand'; p.speed = 0; p.setTool(null); }
    ST.gull.visible = false; for (const w of ST.weeds) w.visible = false; ST.phone.visible = false; ST.glass.group.visible = false; if (ST.krake) ST.krake.cut = false;
    hud.classList.add('oz-cutting'); $('ozCut').classList.remove('hidden'); untitle(); card(''); phoneUI(null); $('ozUnder').classList.remove('on'); ST.crate.visible = false; $('ozCutLine').classList.remove('on'); $('ozCutBar').style.transform = 'scaleX(0)';
    const f = $('ozFade'); f.style.transition = 'none'; f.classList.add('on'); void f.offsetWidth;
    if (kind === 'intro') { ST.min = 11 * 60; ST.lv = [0, 0]; ST.dry = [false, false]; } else if (kind === 'mitte') { ST.min = 16 * 60; ST.lv = [TIEF[0] - 0.5, 0]; ST.dry = [true, false]; } else { ST.min = 18 * 60 + 30; ST.lv = [TIEF[0] - 0.5, TIEF[1] - 0.5]; ST.dry = [true, true]; }
    return true;
  }
  function finish(call = true) {
    if (!ST.on) return; const kind = ST.kind; ST.on = false; ST.under = false; for (const p of ST.fam) { p.setVisible(false); } ST.gull.visible = false; for (const w of ST.weeds) w.visible = false; ST.glass.group.visible = false;
    if (ST.phone.parent !== C.W.scene) C.W.scene.add(ST.phone); ST.phone.visible = false; if (ST.krake) { ST.krake.cut = false; ST.krake.md.group.scale.setScalar(1); }
    hud.classList.remove('oz-cutting'); $('ozCut').classList.add('hidden'); untitle(); card(''); phoneUI(null); $('ozUnder').classList.remove('on'); ST.crate.visible = false; $('ozCutLine').classList.remove('on'); const f = $('ozFade'); f.style.transition = 'opacity .9s'; f.classList.remove('on'); C.cam.fov = 66;
    if (call && onEnd) onEnd(kind, ST.info);
  }
  function key(code) { if (code === 'Escape') finish(); }
  function step(dt) {
    if (!ST.on) return; ST.pt = ST.t; ST.t += dt; ST.shake = Math.max(0, ST.shake - dt * 1.5);
    const holding = C.keys.Space || C.keys.KeyE || C.keys.Enter; if (holding) { ST.hold += dt; if (ST.hold >= 0.9) { finish(); return; } } else ST.hold = 0; $('ozCutBar').style.transform = `scaleX(${clamp(ST.hold / 0.9, 0, 1)})`;
    if (ST.lineT > 0 && (ST.lineT -= dt) <= 0) $('ozCutLine').classList.remove('on');
    if (ST.kind === 'intro') intro(dt); else if (ST.kind === 'mitte') mitte(dt); else ende(dt); if (!ST.on) return; $('ozUnder').classList.toggle('on', ST.under);
    C.W.setTime(ST.min); for (const p of ST.fam) if (p.visible) p.update(dt, ST.t);
  }
  // Unter Wasser: dichter blauer Dunst
  const mood = (m) => (ST.under ? { ...m, fogD: 0.06, fogH: 400, vol: 0, exposure: (m.exposure || 1) * 1.15, sat: 0.8, tint: [0.55, 0.85, 1.08] } : m);

  // ======================= Vorspann =======================
  function intro(dt) {
    const T = ST.t; const hb = H0(); const theo = ST.fam[0]; const tip = pierPt(hb, hb.pierLen - 1.2); const drop = ST.drop || (ST.drop = dropSpot()); const g = ST.gull; const W = C.W;
    if (cue(0.05)) black(false, 1.2);
    if (T < 5.5) { // Shot A: Flug über den Pazifik auf den Steg zu
      const u = smooth(0, 5.5, T); const from = V3(drop.x - 60, 22, drop.z + 40); const to = V3(tip.x - hb.dir.x * 26 + 8, 7, tip.z - hb.dir.z * 26); cam(from.clone().lerp(to, u), V3(lerp(drop.x, tip.x, u), 1, lerp(drop.z, tip.z, u)), 55);
      if (cue(0.6)) title('Theos Seitenscheidel präsentiert', 'Ein sonniger Tag am Pazifik', 'Nichts kann schiefgehen.'); if (cue(4.6)) untitle();
      if (cue(0.1)) { const cp = pierPt(hb, hb.pierLen - 1.0, 0.75); ST.crate.position.set(cp.x, cp.y + 0.25, cp.z); ST.crate.rotation.y = hb.pierYaw + 0.2; ST.crate.visible = true; ST.glass.group.visible = true; ST.glass.group.position.set(cp.x, cp.y + 0.5, cp.z); ST.glass.group.scale.setScalar(1.6); }
      if (cue(1.0)) { theo.setVisible(true); const s = pierPt(hb, 4); theo.place(s.x, s.y, s.z, hb.pierYaw); theo.route = [pierPt(hb, hb.pierLen - 2.0)]; holdPhone(theo, true); screenText([['12:00', 60, 34], ['Kamera', 230, 16, '#9fd0ff']], '#2a4a6a'); }
    } else if (T < 10.5) { // Shot B: Theo läuft den Steg entlang
      const r = theo.route[0]; if (r && walkTo(theo, r.x, r.z, dt, 1.4, ground)) theo.route.shift(); if (!theo.route.length) { theo.mode = 'stand'; faceTo(theo, theo.x + hb.dir.x, theo.z + hb.dir.z, dt, 4); }
      const side = pierPt(hb, Math.min(hb.pierLen - 6, 3 + (T - 5.5) * 1.3), 4.5); cam(V3(side.x, side.y + 1.6, side.z), V3(theo.x, theo.y + 1.3, theo.z), 48);
      if (cue(6.2)) say('Theo: „Was für ein Ausblick. Schnell ein Selfie für die Gruppe …“', 3.2);
    } else if (T < 13.2) { // Shot C: Selfie, die Möwe kommt von hinten
      theo.mode = 'stand'; theo.act = 'wave'; theo.lookAt = V3(theo.x - hb.dir.x * 0.4, theo.y + 2.0, theo.z - hb.dir.z * 0.4); screenText([['Lächeln!', 120, 30], ['📷', 190, 40]], '#3a6a8a');
      const pv = V3(theo.x + hb.dir.x * 2.2 + 0.6, theo.y + 1.9, theo.z + hb.dir.z * 2.2); cam(pv, V3(theo.x, theo.y + 1.75, theo.z), 42);
      if (cue(10.8)) say('Theo: „Und … Lächeln!“', 1.6);
      if (T > 11.6) { g.visible = true; const u = smooth(11.6, 13.2, T); const hand = ST.phone.getWorldPosition(V3()); const from = V3(theo.x - hb.dir.x * 18, theo.y + 9, theo.z - hb.dir.z * 18 + 5); const p = from.clone().lerp(hand.clone().add(V3(0, 0.15, 0)), u); g.position.copy(p); g.lookAt(hand); g.flap(T, 1); if (cue(12.4)) snd.play('gull', 1.4); }
    } else if (T < 17.8) { // Shot D: Die Möwe schnappt zu und fliegt aufs Meer
      if (cue(13.2)) { holdPhone(theo, false); snd.play('gull', 1.5); ST.shake = 0.4; theo.act = 0; ST.gp = ST.phone.position.clone(); }
      const u = smooth(13.2, 17.4, T); const start = ST.gp || V3(theo.x, theo.y + 1.8, theo.z); const p = V3(lerp(start.x, drop.x, u), lerp(start.y, 12, Math.sqrt(u)), lerp(start.z, drop.z, u)); g.visible = true; g.position.copy(p); g.lookAt(V3(drop.x, 12, drop.z)); g.flap(T, 1.2);
      ST.phone.visible = true; ST.phone.position.copy(p).add(V3(0, -0.08, 0)); ST.phone.rotation.set(Math.PI / 2, 0, T * 2);
      theo.mode = 'stand'; theo.act = T < 15.5 ? 'point' : 'arms'; faceTo(theo, drop.x, drop.z, dt, 3); theo.lookAt = p;
      cam(V3(theo.x - hb.dir.x * 3.2 + 1.2, theo.y + 2.2, theo.z - hb.dir.z * 3.2), p, 50);
      if (cue(13.6)) say('Theo: „HEY! Das ist MEIN Handy! Gib das zurück!“', 2.6);
    } else if (T < 20.0) { // Shot E: Die Möwe lässt es fallen
      const fall = T - 17.8; const y = Math.max(-0.2, 12 - 0.5 * 9.8 * fall * fall); ST.phone.position.set(drop.x, y, drop.z); ST.phone.rotation.set(T * 7, T * 3, 0); ST.phone.visible = y > -0.15;
      const gx = drop.x + (T - 17.8) * 5; g.position.set(gx, 12 + (T - 17.8) * 3, drop.z - (T - 17.8) * 4); g.flap(T, 1); g.lookAt(V3(gx + 5, g.position.y + 2, drop.z - 4));
      if (y <= -0.15 && !ST.splashed) { ST.splashed = true; W.splash(V3(drop.x, 0.05, drop.z), 18, 0.5); snd.play('splash', 1.4, 0.8); } cam(V3(drop.x + 9, 3.2, drop.z + 10), V3(drop.x, Math.max(0.5, y * 0.6), drop.z), 46);
      if (cue(18.2)) say('Theo: „Nein, nein, nein, nein …“', 1.7);
    } else if (T < 26.0) { // Shot F: Unter Wasser: das Handy sinkt, die Krake greift zu
      if (cue(20.0)) { g.visible = false; ST.splashed = false; if (ST.krake) { ST.krake.cut = true; ST.krake.md.group.visible = true; ST.krake.md.group.position.set(drop.x + 6, bedH(drop.x + 6, drop.z) + 0.05, drop.z - 4); } }
      ST.under = true; const bed = bedH(drop.x, drop.z); const fall = smooth(20.0, 23.0, T); const py = lerp(-0.4, bed + 0.12, fall); const kg = ST.krake ? ST.krake.md.group : null;
      if (T < 23.4) { ST.phone.visible = true; ST.phone.position.set(drop.x + Math.sin(T * 2) * 0.2, py, drop.z); ST.phone.rotation.set(T * 1.5, 0.4, Math.sin(T) * 0.5); screenText([['12:00', 60, 34], ['Kein Netz', 230, 16, '#ff9a8a']], '#2a4a6a'); if (kg) kg.position.lerp(V3(drop.x + 0.6, bed + 0.03, drop.z - 0.3), dt * 0.9); }
      else if (kg) { const u = smooth(23.4, 26, T); kg.position.set(lerp(drop.x + 0.6, BODEN[0][0], u * 0.08), lerp(bed + 0.03, bed - 0.6, u), lerp(drop.z - 0.3, BODEN[0][1], u * 0.08)); kg.rotation.y += dt * 0.6; ST.phone.position.copy(kg.position).add(V3(0, 0.9, 0)); }
      if (kg) { const k = 1 + Math.sin(T * 3) * 0.08; kg.scale.set(k * 1.4, 1.4, k * 1.4); }
      cam(V3(drop.x - 3.4, Math.min(-1.2, bed + 2.4), drop.z + 3.0), V3(drop.x + 0.3, Math.max(bed + 0.4, py - 0.3), drop.z), 58);
      if (cue(23.4)) say('Die Krake: „Danke!“', 1.8);
    } else if (T < 31.0) { // Shot G: Theo und das Glas
      ST.under = false; if (cue(26.0)) { ST.phone.visible = false; if (ST.krake) { ST.krake.cut = false; ST.krake.md.group.scale.setScalar(1); } }
      const gp = ST.glass.group.position; theo.mode = 'stand'; if (T < 28.6) { theo.act = 0; theo.lookAt = V3(drop.x, 0, drop.z); faceTo(theo, drop.x, drop.z, dt, 3); } else { faceTo(theo, gp.x, gp.z, dt, 4); theo.act = T > 29.4 ? 'point' : 0; theo.lookAt = gp; }
      const k = smooth(27.6, 29.6, T); const side = V3(-hb.dir.z, 0, hb.dir.x); const camA = V3(theo.x - hb.dir.x * 2.6 + side.x * 1.6, theo.y + 1.75, theo.z - hb.dir.z * 2.6 + side.z * 1.6); const camB = V3(gp.x - hb.dir.x * 1.5 - side.x * 1.3, gp.y + 0.7, gp.z - hb.dir.z * 1.5 - side.z * 1.3); cam(camA.lerp(camB, k), V3(lerp(theo.x, gp.x, k), lerp(theo.y + 1.4, gp.y + 0.1, k), lerp(theo.z, gp.z, k)), lerp(46, 40, k));
      if (cue(26.4)) say('Theo: „… Okay. Wenn das so ist …“', 2.4); if (cue(28.8)) say('Theo: „… dann trink ich eben den Pazifik leer.“', 2.4);
    } else {
      if (cue(31.0)) black(true, 0.6); if (cue(31.5)) card(`Der Pazifik: ${bigLiter(MEERE[0].liter)} Wasser (mindestens). Theo: ein Glas.`); if (cue(34.6)) { card(''); title('Theos Seitenscheidel', 'TROCKNE DEN OZEAN AUS', 'Schöpfen, verkaufen, Besseres kaufen. Allein oder zu dritt.'); snd.play('fanfare', 0.8); }
      if (T > 38.4) finish();
    }
    if (ST.under) { ST.min = 11 * 60; }
  }

  // ======================= Zwischenszene: der Pazifik ist leer =======================
  function mitte(dt) {
    const T = ST.t; const W = C.W; const b = BODEN[0]; const theo = ST.fam[0]; const by = bedH(b[0], b[1]);
    if (cue(0.05)) { black(false, 1.0); ST.weeds.forEach((w, i) => { w.visible = true; w.userData = { x: b[0] - 40 + i * 7, z: b[1] - 20 + i * 11, v: 3 + i * 0.6 }; }); W.phone.visible = true; }
    for (const w of ST.weeds) if (w.visible) { const d = w.userData; d.x += d.v * dt; d.z += Math.sin(T + d.v) * dt; w.position.set(d.x, bedH(d.x, d.z) + 0.5 + Math.abs(Math.sin(T * 2.4 + d.v)) * 0.35, d.z); w.rotation.z -= d.v * dt / 0.5; w.rotation.y = 0.3; }
    if (T < 6.5) { // Shot A: über den leeren Pazifik
      const u = smooth(0, 6.5, T); cam(V3(b[0] - 120 + u * 70, 55 - u * 30, b[1] + 90 - u * 50), V3(b[0], by, b[1]), 55); if (Math.random() < dt * 6) W.puff(V3(b[0] + (Math.random() - 0.5) * 60, by + 0.3, b[1] + (Math.random() - 0.5) * 60), 0xd8c8a0, 2.2);
      if (cue(0.6)) title('Geschafft', 'DER PAZIFIK IST LEER', 'Staubtrocken. Kein Tropfen mehr.'); if (cue(5.6)) untitle();
    } else if (T < 12.5) { // Shot B: Theo findet das Handy
      if (cue(6.5)) { theo.setVisible(true); theo.place(b[0] - 7, by, b[1] + 5, 0); theo.route = [V3(b[0] - 0.6, by, b[1] + 0.5)]; }
      const r = theo.route[0]; if (r && walkTo(theo, r.x, r.z, dt, 1.6, (x, z) => bedH(x, z))) theo.route.shift(); if (!theo.route.length) { theo.mode = 'stand'; faceTo(theo, b[0], b[1], dt, 4); theo.act = T > 10.6 ? 'counter' : 0; theo.lookAt = V3(b[0], by, b[1]); }
      cam(V3(b[0] + 4.5, by + 2.2, b[1] + 4.2), V3(theo.x * 0.5 + b[0] * 0.5, by + 0.9, theo.z * 0.5 + b[1] * 0.5), 48);
      if (cue(7.2)) say('Theo: „Da! Da liegt es!“', 2.0);
    } else if (T < 21.0) { // Shot C: Das Handy lebt noch. Und Bruno schreibt.
      if (cue(12.5)) { W.phone.visible = false; holdPhone(theo, true); theo.act = 'wave'; snd.play('levelup', 0.8); }
      theo.mode = 'stand'; theo.lookAt = ST.phone.getWorldPosition(V3());
      if (cue(13.0)) phoneUI([['bar', 'Akku 3 %'], ['big', '12:00'], ['sub', 'wasserdicht ✓  ·  Pazifik-Modus']]);
      if (cue(15.6)) phoneUI([['bar', 'Akku 3 %'], ['from', '1 neue Nachricht · Bruno'], ['msg', 'Pazifik leer?? Krass.'], ['msg', 'Wetten, den Atlantik schafft ihr nie? 😎'], ['msg', 'Meine Goldkette liegt da drin. Wer sie findet, darf sie behalten.']]);
      screenText([['Bruno', 120, 26, '#f9bd00']], '#141c26'); const ph = ST.phone.getWorldPosition(V3()); const back = V3(-Math.sin(theo.yaw), 0, -Math.cos(theo.yaw)); const rt = V3(Math.cos(theo.yaw), 0, -Math.sin(theo.yaw)); cam(V3(theo.x + back.x * 1.5 + rt.x * 0.9, theo.y + 1.95, theo.z + back.z * 1.5 + rt.z * 0.9), V3(ph.x * 0.5 + theo.x * 0.5, ph.y, ph.z * 0.5 + theo.z * 0.5), 44);
      if (cue(12.8)) say('Theo: „Mein Handy! Es geht noch!“', 2.2); if (cue(15.8)) say('Theo: „… Moment. Was will Bruno?“', 2.4); if (cue(18.6)) say('Theo: „Na warte. Dann eben den Atlantik.“', 2.2);
    } else {
      if (cue(21.0)) { black(true, 0.6); phoneUI(null); } if (cue(21.5)) card('Stufe 2: Trockne den Atlantik aus. Brunos Goldkette liegt ganz unten. Der Händler am Atlantik zahlt 2 € pro Liter.');
      if (T > 26.0) finish();
    }
  }

  // ======================= Abspann =======================
  function ende(dt) {
    const T = ST.t; const W = C.W; const b = BODEN[1]; const by = bedH(b[0], b[1]); const S = ST.info.S || C.S || {}; const st = S.stats || {};
    if (cue(0.05)) { black(false, 1.0); ST.weeds.forEach((w, i) => { w.visible = true; w.userData = { x: b[0] - 50 + i * 9, z: b[1] - 25 + i * 13, v: 3.5 + i * 0.5 }; }); W.chain.visible = true; }
    for (const w of ST.weeds) if (w.visible) { const d = w.userData; d.x += d.v * dt; w.position.set(d.x, bedH(d.x, d.z) + 0.5 + Math.abs(Math.sin(T * 2.4 + d.v)) * 0.35, d.z); w.rotation.z -= d.v * dt / 0.5; }
    if (T < 7.0) { // Shot A: Flug über beide trockenen Ozeane im Abendlicht
      const u = smooth(0, 7, T); cam(V3(lerp(-260, 200, u), 120 - u * 50, lerp(260, 220, u)), V3(lerp(-180, b[0], u), -6, lerp(150, b[1], u)), 58);
      if (cue(0.6)) title('Geschafft', 'BEIDE OZEANE SIND TROCKEN', 'Pazifik und Atlantik: kein einziger Tropfen mehr.'); if (cue(6.2)) untitle();
    } else if (T < 15.0) { // Shot B: Die drei finden die Goldkette
      if (cue(7.0)) ST.fam.forEach((p, i) => { p.setVisible(true); p.place(b[0] - 6 + i * 2.2, by, b[1] + 6 - i, 0); p.route = [V3(b[0] - 1.2 + i * 1.2, by, b[1] + 1.4 - Math.abs(i - 1) * 0.5)]; });
      ST.fam.forEach((p, i) => { const r = p.route && p.route[0]; if (r && walkTo(p, r.x, r.z, dt, 1.5 + i * 0.1, (x, z) => bedH(x, z))) p.route.shift(); if (p.route && !p.route.length) { p.mode = 'stand'; faceTo(p, b[0], b[1], dt, 4); p.lookAt = T < 11.5 ? V3(b[0], by, b[1]) : null; p.act = T > 11.5 ? 'cheer' : 0; if (T > 11.5 && p.actT === undefined) p.actT = 0; } });
      if (T > 11.5) { W.chain.position.y = lerp(W.chain.position.y, by + 1.6, dt * 2); W.chain.rotation.y += dt * 1.5; }
      cam(V3(b[0] + 6, by + 2.6, b[1] + 6.5), V3(b[0], by + 1.0, b[1] + 0.5), 46);
      if (cue(8.0)) say('Blau: „Da! Was glitzert da?“', 2.0); if (cue(11.6)) { say('Theo: „Brunos Goldkette! Gehört jetzt uns!“', 2.8); snd.play('fanfare', 0.9); }
    } else if (T < 21.5) { // Shot C: Die Tiere im Becken am Haus
      ST.fam.forEach((p) => p.setVisible(false)); const a = (T - 15) * 0.15; cam(V3(POOL.x + Math.sin(a) * 18, BASE_Y + 7.5, POOL.z + Math.cos(a) * 18), V3(POOL.x, BASE_Y - 0.5, POOL.z), 50);
      if (ST.wal && Math.random() < dt * 8) { const g = ST.wal.md.group.position; W.puff(V3(g.x, g.y + 1.2, g.z), 0xffffff, 0.6, V3((Math.random() - 0.5) * 0.6, 4 + Math.random() * 2, (Math.random() - 0.5) * 0.6), 6); }
      if (cue(15.4)) say('Die Tiere wohnen jetzt im Pool hinter dem Haus. Der Wal findet es okay.', 4.2);
    } else {
      if (cue(21.5)) black(true, 0.7);
      if (cue(22.0)) card(`Ausgetrocknet: Pazifik und Atlantik. ${bigLiter(st.liter || 0)} Wasser, ${euro(st.geld || 0)} verdient, in ${S.day || 1} Tagen.`);
      if (cue(26.5)) card('Und wo ist das ganze Wasser hin? Das habt ihr verkauft. An wen? Fragt lieber nicht.');
      if (cue(31.0)) { card(''); title('Theos Seitenscheidel', 'TROCKNE DEN OZEAN AUS', 'Danke fürs Spielen.'); snd.play('fanfare', 0.8); }
      if (T > 35.0) finish();
    }
  }
  return { play, step, key, finish, mood, levels: () => (ST.on ? ST.lv : null), dry: () => (ST.on ? ST.dry : null), under: () => ST.under, get on() { return ST.on; }, get kind() { return ST.kind; }, state: ST };
}
