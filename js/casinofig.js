// Theos Seitenscheidel - Teo's Casino: Figuren mit Haltungen. Nutzt die eigenen Low-Poly-Figuren aus racefigure.js (IK für Hände und Füße).
// Haltungen: stehen, gehen (Schrittzyklus mit Armpendel), sitzen (Stuhl, Bus, Sofa), traurig sitzen, hoffnungsvoll aufblicken, jubeln, rubbeln (rechte Hand an der Münze), winken, Theke.
import * as THREE from './vendor/three.module.min.js';
import { createFigure } from './racefigure.js';
import { outerFigureMaterial } from './parkart.js';
import { figureGeometry } from './casinolook.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z); const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const FAMILY = [
  { name: 'Rot', shirt: 0xc0332a, cap: 0x8a221c, hair: 0x3a2a1e, skin: 0xe2b08c, pants: 0x2a2f3a, col: '#e5483c', outfit: 'obdachlos', iris: 0x5a3a1e },
  { name: 'Blau', shirt: 0x2c62c8, cap: 0x1c3f86, hair: 0x1e1a18, skin: 0xd8a47e, pants: 0x2a2f3a, col: '#3f86e8', outfit: 'obdachlos', iris: 0x2a5a8a },
  { name: 'Gelb', shirt: 0xe8a21c, cap: 0xa86a10, hair: 0x5a3a1e, skin: 0xe8bc98, pants: 0x2a2f3a, col: '#f0b52a', outfit: 'obdachlos', iris: 0x3a6a3a },
];
// Vierter Spieler (nur Spielstände ab 1.14.0): ein Freund der Familie in Grün. Er gehört nicht zu FAMILY, damit Intro und Filme unverändert bleiben.
export const FRIEND = { name: 'Grün', shirt: 0x2f9a48, cap: 0x1f6a34, hair: 0x2a1c14, skin: 0xc8946a, pants: 0x2a2f3a, col: '#3fbf5a', outfit: 'obdachlos', iris: 0x2a4a2a };
export const PLAYER_LOOKS = [...FAMILY, FRIEND];
export const STAFF = { verkauf: { shirt: 0xf2efe8, cap: 0x2a1c14, brim: 0x2a1c14, hair: 0x2a1c14, skin: 0xd8a47e, pants: 0x141418 }, bar: { shirt: 0x1a1a20, cap: 0x5a3a1e, brim: 0x5a3a1e, hair: 0x5a3a1e, skin: 0xe2b08c, pants: 0x141418 }, kasse: { shirt: 0x6a1420, cap: 0x1e1a18, brim: 0x1e1a18, hair: 0x1e1a18, skin: 0xc8946a, pants: 0x141418 } };
// Reiche Gäste: Anzüge (Sakko, Hemd, Krawatte oder Fliege, Lederschuhe, Frisur statt Cap); shirt/pants bleiben für alte Stellen als Ersatz
export const GUESTS = [
  { outfit: 'anzug', jacket: 0x1e2a44, hemd: 0xf4f2ec, tie: 0x9a1a22, shoe: 0x141416, hair: 0x3a2a1e, skin: 0xe2b08c, iris: 0x5a3a1e, watch: true, pochette: true, shirt: 0x1e2a44, pants: 0x1a1e2a },
  { outfit: 'anzug', jacket: 0x5a1a2a, hemd: 0x141416, tie: 0xd9a54a, shoe: 0x3a2214, hair: 0xc89a5a, skin: 0xe8bc98, iris: 0x2a5a8a, trousers: 0x141416, shirt: 0x5a1a2a, pants: 0x1a1a1e },
  { outfit: 'anzug', jacket: 0xe8e0cc, hemd: 0xffffff, tie: 0x141416, tieStyle: 'fliege', shoe: 0x141416, hair: 0x1e1a18, skin: 0x8a5a3a, iris: 0x3a2214, trousers: 0x141416, watch: true, shirt: 0xe8e0cc, pants: 0x141416 },
  { outfit: 'anzug', jacket: 0x4a4c52, hemd: 0xbcd4ee, tie: 0x1c2a5a, shoe: 0x3a2214, hair: 0x9a9a96, skin: 0xe2b08c, iris: 0x4a6a8a, pochette: true, shirt: 0x4a4c52, pants: 0x3a3c42 },
  { outfit: 'anzug', jacket: 0x3a1a5a, hemd: 0xf4f2ec, tie: 0x141416, shoe: 0x141416, hair: 0x5a3a1e, skin: 0xd8a47e, iris: 0x3a6a3a, watch: true, shirt: 0x3a1a5a, pants: 0x1a1a1e },
  { outfit: 'anzug', jacket: 0x141416, hemd: 0xffffff, tie: 0x141416, tieStyle: 'fliege', shoe: 0x141416, hair: 0xa83a2a, skin: 0xf0c8a8, iris: 0x2a6a4a, pochette: true, shirt: 0x141416, pants: 0x141416 },
];
let MAT = null; const mat = () => (MAT = MAT || outerFigureMaterial());
let MAT2 = null; const matSmooth = () => { if (!MAT2) { MAT2 = outerFigureMaterial(); MAT2.flatShading = false; MAT2.roughness = 0.68; MAT2.needsUpdate = true; } return MAT2; };

function blankPose() { const hand = () => ({ wrist: V3(), F: V3(0, -1, 0), P: V3(1, 0, 0), grip: 0.4 }); const foot = () => ({ ankle: V3(), toe: V3() }); return { x: 0, y: 0.95, z: 0, yaw: 0, lean: 0, slump: 0, twist: 0, headYaw: 0, headPitch: 0, hands: { L: hand(), R: hand() }, feet: { L: foot(), R: foot() }, armPole: { L: V3(0.4, -0.2, -1), R: V3(-0.4, -0.2, -1) }, legPole: { L: V3(0.15, 0.2, 1), R: V3(-0.15, 0.2, 1) } }; }

// Eine Person: Figur + Ort + Haltung. Ort (x, y, z) und Blickrichtung yaw (0 = +z) in der Welt.
export function createPerson(scene, look, o = {}) {
  // neue Figur aus Blender (Gesicht mit Nase und Mund, glatte Formen); o.classic: alte kantige Figur
  const fig = o.figur ? o.figur : o.classic ? createFigure({ material: o.material || mat(), ...look }) : createFigure({ material: o.material || matSmooth(), ...look, geometry: figureGeometry(look) }); const space = new THREE.Object3D(); scene.add(space, fig.root);
  const P = { fig, space, look, x: 0, y: 0, z: 0, yaw: 0, mode: 'stand', phase: 0, speed: 0, t: 0, headYaw: 0, headPitch: 0, coin: null, seat: 0.47, sad: 0, hope: 0, act: 0, visible: true, pose: blankPose(), lookAt: null };
  P.place = (x, y, z, yaw) => { P.x = x; P.y = y; P.z = z; if (yaw !== undefined) P.yaw = yaw; };
  P.setVisible = (v) => { P.visible = v; fig.root.visible = v; };
  P.remove = () => { scene.remove(space, fig.root); };
  // Kopf zu einem Weltpunkt drehen
  const toLocal = (wx, wy, wz) => { const dx = wx - P.x; const dz = wz - P.z; const c = Math.cos(-P.yaw); const s = Math.sin(-P.yaw); return { x: dx * c + dz * s, z: -dx * s + dz * c, y: wy - P.y }; };
  P.update = (dt, t) => {
    if (!P.visible) return; P.t += dt; const p = P.pose; const L = p.hands.L; const R = p.hands.R; const FL = p.feet.L; const FR = p.feet.R;
    space.position.set(P.x, P.y, P.z); space.rotation.set(0, P.yaw, 0); p.yaw = P.yaw; p.x = 0; p.z = 0; p.lean = 0.04; p.slump = 0; p.twist = 0; p.armPole.L.set(0.4, -0.2, -1); p.armPole.R.set(-0.4, -0.2, -1); p.legPole.L.set(0.15, 0.2, 1); p.legPole.R.set(-0.15, 0.2, 1);
    let hy = 0; let hp = 0; const breath = Math.sin(P.t * 1.6 + P.x) * 0.006;
    const stand = () => { p.y = 0.95 + breath; FL.ankle.set(0.13, 0.09, -0.02); FL.toe.set(0.15, 0.03, 0.12); FR.ankle.set(-0.13, 0.09, 0.0); FR.toe.set(-0.15, 0.03, 0.14); for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * 0.25, 0.87 + breath, 0.03); h.F.set(sg * 0.05, -1, 0.08).normalize(); h.P.set(-sg, 0, 0); h.grip = 0.35; } p.armPole.L.set(0.3, 0, -1); p.armPole.R.set(-0.3, 0, -1); };
    if (P.mode === 'walk' || P.mode === 'stand') {
      const k = P.mode === 'walk' ? clamp(P.speed / 1.4, 0.25, 1.6) : 0; const A = 0.2 * Math.min(1.2, 0.55 + k * 0.45);
      if (k > 0) P.phase += dt * P.speed / (4 * A) * Math.PI * 2;
      stand(); if (k > 0) { const f = P.phase; for (const [F, sg, ph] of [[FL, 1, f], [FR, -1, f + Math.PI]]) { const c = Math.cos(ph); const s = Math.sin(ph); const swing = s < 0; const z = A * c; const lift = swing ? -s * 0.11 * Math.min(1, k) : 0; F.ankle.set(sg * 0.12, 0.09 + lift, z); F.toe.set(sg * 0.14, 0.03 + lift * (swing ? 0.6 : 0) + (swing ? 0.02 : 0), z + 0.13); }
        p.y = 0.93 + Math.abs(Math.cos(f)) * 0.035; p.twist = Math.cos(f) * 0.12 * k; p.lean = 0.07 + k * 0.04;
        for (const [h, sg, ph] of [[L, 1, f], [R, -1, f + Math.PI]]) { const c = Math.cos(ph); h.wrist.set(sg * 0.25, 0.89 + Math.abs(c) * 0.02, -c * 0.22 * Math.min(1.2, k + 0.2) + 0.04); h.F.set(sg * 0.05, -1, -c * 0.35).normalize(); h.P.set(-sg, 0, 0); } }
      if (P.mode === 'stand' && P.act === 'wave') { const w = Math.sin(P.t * 9) * 0.12; R.wrist.set(-0.34 + w * 0.3, 1.78, 0.2); R.F.set(-0.1, 1, 0.2).normalize(); R.P.set(0, 0, 1); R.grip = 0.05; p.armPole.R.set(-1, -0.4, 0); }
      if (P.mode === 'stand' && P.act === 'counter') { for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * 0.24, 1.0, 0.36); h.F.set(sg * 0.1, -0.35, 1).normalize(); h.P.set(0, -1, 0); h.grip = 0.2; } p.lean = 0.12; }
      if (P.mode === 'stand' && P.act === 'wipe') { const a = P.t * 3; R.wrist.set(-0.16 + Math.cos(a) * 0.1, 1.06, 0.38 + Math.sin(a) * 0.06); R.F.set(0, -0.6, 1).normalize(); R.P.set(0, -1, 0); R.grip = 0.6; L.wrist.set(0.2, 1.04, 0.32); L.F.set(0, -0.4, 1).normalize(); L.P.set(0, -1, 0); p.lean = 0.15; }
      if (P.mode === 'stand' && P.act === 'cheer') { const k2 = smooth(0, 0.3, P.actT || 1); for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * (0.25 + k2 * 0.18), 0.87 + k2 * 1.0 + Math.sin(P.t * 10 + sg) * 0.04 * k2, 0.03); h.F.set(sg * 0.2, 1, 0).normalize(); h.P.set(0, 0, 1); h.grip = 0.9; } p.armPole.L.set(1, -0.3, 0); p.armPole.R.set(-1, -0.3, 0); hp = -0.3 * k2; }
      if (P.mode === 'stand' && P.act === 'point') { R.wrist.set(-0.3, 1.55, 0.5); R.F.set(-0.1, 0.5, 1).normalize(); R.P.set(1, 0, 0); R.grip = 0.75; p.armPole.R.set(-1, -0.5, 0); }
      if (P.mode === 'stand' && P.act === 'look') { hp = -0.42; }
      if (P.mode === 'stand' && P.act === 'lenker') { for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * 0.22, 1.1, 0.36); h.F.set(0, 0, 1); h.P.set(0, -1, 0); h.grip = 0.9; } p.lean = 0.07; FL.ankle.set(0.08, 0.17, 0.12); FL.toe.set(0.09, 0.13, 0.25); FR.ankle.set(-0.08, 0.17, -0.14); FR.toe.set(-0.09, 0.13, -0.01); } /* Ludwig: auf dem E-Roller */
      if (P.mode === 'stand' && P.act === 'arms') { for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * 0.12, 1.12, 0.22); h.F.set(-sg, 0.1, 0.1).normalize(); h.P.set(0, 0, -1); h.grip = 0.3; } p.armPole.L.set(1, -0.5, 0); p.armPole.R.set(-1, -0.5, 0); }
      // Ludwig-Kiosk (2026-11-20): aufs Handy schauen, Hände am Feuer wärmen, aus der Flasche trinken, im Regal einräumen
      if (P.mode === 'stand' && P.act === 'phone') { R.wrist.set(-0.07, 1.2, 0.3); R.F.set(0.15, 0.85, 0.35).normalize(); R.P.set(0.2, 0.35, -1).normalize(); R.grip = 0.75; p.armPole.R.set(-1, -0.6, 0); L.wrist.set(0.05, 1.16, 0.27); L.F.set(-0.6, 0.5, 0.4).normalize(); L.P.set(-0.4, 0.2, -1).normalize(); L.grip = 0.4; p.armPole.L.set(1, -0.6, 0); hp = 0.5; }
      if (P.mode === 'stand' && P.act === 'warm') { const rub = Math.sin(P.t * 5) * 0.03; for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * (0.1 + rub * sg), 1.08, 0.42); h.F.set(-sg * 0.2, 0.1, 1).normalize(); h.P.set(0, -1, 0.2).normalize(); h.grip = 0.15; } p.armPole.L.set(1, -0.6, -0.2); p.armPole.R.set(-1, -0.6, -0.2); p.lean = 0.1; hp = 0.25; }
      if (P.mode === 'stand' && P.act === 'drink') { const c = (P.t % 7) / 7; const up = c > 0.72 ? Math.sin(((c - 0.72) / 0.28) * Math.PI) : 0; R.wrist.set(-0.2 + up * 0.17, 0.98 + up * 0.56, 0.18 + up * 0.02); R.F.set(-0.1 + up * 0.3, -0.2 + up * 0.9, 1).normalize(); R.P.set(1, 0, 0); R.grip = 0.85; p.armPole.R.set(-1, -0.6, 0); hp = -0.35 * up; }
      if (P.mode === 'stand' && P.act === 'shelf') { const a = P.t * 2.2; for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * 0.16 + Math.sin(a + sg) * 0.05, 1.5 + Math.sin(a * 1.3 + sg) * 0.06, 0.42); h.F.set(0, 0.2, 1).normalize(); h.P.set(0, -0.5, 1).normalize(); h.grip = 0.5; } p.armPole.L.set(1, -0.4, 0); p.armPole.R.set(-1, -0.4, 0); hp = -0.2; }
      // von der Security getragen: Arme seitlich gepackt, Beine strampeln (die Höhe setzt die Szene über P.y)
      if (P.mode === 'stand' && P.act === 'carried') { const kk = Math.sin(P.t * 11); for (const [h, sg] of [[L, 1], [R, -1]]) { h.wrist.set(sg * 0.42, 1.1 + Math.sin(P.t * 7 + sg) * 0.03, 0.06); h.F.set(sg * 0.8, -0.3, 0.2).normalize(); h.P.set(0, -1, 0); h.grip = 0.6; } p.armPole.L.set(1, -0.6, -0.4); p.armPole.R.set(-1, -0.6, -0.4); FL.ankle.set(0.12, 0.1 + Math.max(0, kk) * 0.12, 0.08 * kk); FL.toe.set(0.14, 0.06 + Math.max(0, kk) * 0.12, 0.08 * kk + 0.12); FR.ankle.set(-0.12, 0.1 + Math.max(0, -kk) * 0.12, -0.08 * kk); FR.toe.set(-0.14, 0.06 + Math.max(0, -kk) * 0.12, -0.08 * kk + 0.12); hy = Math.sin(P.t * 2.3) * 0.5; p.lean = -0.04; }
      // Security packt zu: beide Hände an Weltpunkte (Oberarm und Unterarm des Getragenen)
      if (P.mode === 'stand' && P.act === 'grab' && P.grabAt) { const a = toLocal(P.grabAt.x, P.grabAt.y, P.grabAt.z); const b = P.grabAt2 ? toLocal(P.grabAt2.x, P.grabAt2.y, P.grabAt2.z) : a; const near = a.x >= 0 ? L : R; const far = near === L ? R : L; const sg = a.x >= 0 ? 1 : -1; near.wrist.set(a.x - sg * 0.04, a.y, a.z); near.F.set(-sg * 0.3, 0, 1).normalize(); near.P.set(-sg, 0, 0); near.grip = 0.95; far.wrist.set(b.x - sg * 0.02, b.y, b.z + 0.04); far.F.set(-sg * 0.5, -0.3, 1).normalize(); far.P.set(-sg, 0, 0); far.grip = 0.9; p.lean = -0.06; }
    } else if (P.mode === 'sit' || P.mode === 'scratch') {
      const h = P.seat; const sad = P.sad; const hope = P.hope; p.y = h + 0.09; p.z = -0.06; p.lean = 0.06 + sad * 0.42 - hope * 0.1; p.slump = sad * 0.22; hp = sad * 0.62 - hope * 0.5;
      FL.ankle.set(0.13, 0.09, 0.42 - sad * 0.05); FL.toe.set(0.15, 0.03, 0.55 - sad * 0.05); FR.ankle.set(-0.13, 0.09, 0.44); FR.toe.set(-0.15, 0.03, 0.57); p.legPole.L.set(0.25, 0.5, 1); p.legPole.R.set(-0.25, 0.5, 1);
      for (const [hh, sg] of [[L, 1], [R, -1]]) { if (sad > 0.5) { hh.wrist.set(sg * 0.05, h + 0.06, 0.38); hh.F.set(-sg * 0.6, -0.6, 0.4).normalize(); hh.P.set(0, 0, -1); hh.grip = 0.6; } else { hh.wrist.set(sg * 0.17, h + 0.17 + breath, 0.3); hh.F.set(sg * 0.05, -0.35, 1).normalize(); hh.P.set(0, -1, 0); hh.grip = 0.35; } }
      p.armPole.L.set(0.6, -0.5, -0.6); p.armPole.R.set(-0.6, -0.5, -0.6);
      if (P.mode === 'scratch' && P.coin) { const c = toLocal(P.coin.x, P.coin.y, P.coin.z); R.wrist.set(c.x + 0.02, c.y + 0.07, c.z - 0.07); R.F.set(0.1, -0.85, 0.5).normalize(); R.P.set(0.3, -0.2, 0.9).normalize(); R.grip = 0.95; L.wrist.set(0.22, h + 0.36, 0.5); L.F.set(-0.3, -0.5, 1).normalize(); L.P.set(0, -1, 0); L.grip = 0.3; p.lean = 0.3; hp = 0.55; p.armPole.R.set(-0.7, -0.6, -0.3); }
      if (P.act === 'drive') { for (const [hh, sg] of [[L, 1], [R, -1]]) { hh.wrist.set(sg * 0.17, 1.0, 0.6); hh.F.set(0, 0.6, 0.8).normalize(); hh.P.set(-sg, 0, 0); hh.grip = 0.9; } p.lean = 0.12; p.armPole.L.set(0.8, -0.6, -0.2); p.armPole.R.set(-0.8, -0.6, -0.2); }
      if (P.act === 'cheer') { const k2 = smooth(0, 0.3, P.actT || 1); for (const [hh, sg] of [[L, 1], [R, -1]]) { hh.wrist.set(sg * 0.38, h + 0.4 + k2 * 1.0, 0.1); hh.F.set(sg * 0.2, 1, 0).normalize(); hh.P.set(0, 0, 1); hh.grip = 0.9; } p.armPole.L.set(1, -0.3, 0); p.armPole.R.set(-1, -0.3, 0); hp = -0.25; p.lean = -0.05; }
      // Ludwig: auf dem Fahrrad (Füße kreisen mit P.tritt auf den Pedalen)
      if (P.act === 'rad') { const a = P.tritt || 0; for (const [F, sg, o] of [[FL, 1, 0], [FR, -1, Math.PI]]) { const y = 0.36 + Math.sin(a + o) * 0.14; const z = 0.12 + Math.cos(a + o) * 0.14; F.ankle.set(sg * 0.13, y, z); F.toe.set(sg * 0.14, y - 0.05, z + 0.12); } for (const [hh, sg] of [[L, 1], [R, -1]]) { hh.wrist.set(sg * 0.22, 1.06, 0.5); hh.F.set(0, 0, 1); hh.P.set(0, -1, 0); hh.grip = 0.9; } p.lean = 0.26; p.armPole.L.set(0.8, -0.6, -0.2); p.armPole.R.set(-0.8, -0.6, -0.2); }
      // Klavier spielen: Hände auf den Tasten, wandern und tippen
      if (P.act === 'piano') { const a = P.t * 4.2; for (const [hh, sg] of [[L, 1], [R, -1]]) { hh.wrist.set(sg * (0.2 + Math.sin(a * (sg > 0 ? 0.7 : 0.9) + sg) * 0.13), h + 0.27 + Math.abs(Math.sin(a * 3 + sg * 2)) * 0.025, 0.4); hh.F.set(0, -0.55, 1).normalize(); hh.P.set(0, -1, 0); hh.grip = 0.25; } p.armPole.L.set(0.8, -0.6, -0.2); p.armPole.R.set(-0.8, -0.6, -0.2); p.lean = 0.14; hp = 0.32; hy = Math.sin(P.t * 0.6) * 0.25; }
      // auf der Parkbank essen (Ludwig, Brunnenplatz): rechte Hand führt die Stulle aus der Brotdose zum Mund und kaut, linke Hand hält die Dose auf dem Schoß
      if (P.act === 'eat') { const c = (P.t % 6) / 6; const up = c < 0.12 ? 0 : c < 0.3 ? smooth(0.12, 0.3, c) : c < 0.62 ? 1 : c < 0.8 ? 1 - smooth(0.62, 0.8, c) : 0; const chew = up > 0.98 ? Math.sin(P.t * 9) * 0.006 : 0;
        R.wrist.set(-0.05 + up * 0.02, h + 0.24 + up * 0.31 + chew, 0.27 - up * 0.07); R.F.set(0.1, -0.4 + up * 1.4, 1 - up * 0.85).normalize(); R.P.set(up * 0.15, -1 + up, -up).normalize(); R.grip = 0.8; p.armPole.R.set(-0.8, -0.6, -0.2);
        L.wrist.set(0.12, h + 0.21, 0.24); L.F.set(-0.35, -0.3, 1).normalize(); L.P.set(0, -1, 0); L.grip = 0.3; p.lean = 0.08 + up * 0.14; hp = 0.28 - up * 0.18; }
      // auf einer Mauer oder dem Brunnenrand sitzen und aufs Handy schauen
      if (P.act === 'sitphone') { R.wrist.set(-0.07, h + 0.34, 0.3); R.F.set(0.15, 0.85, 0.35).normalize(); R.P.set(0.2, 0.35, -1).normalize(); R.grip = 0.75; p.armPole.R.set(-1, -0.6, 0); L.wrist.set(0.05, h + 0.3, 0.27); L.F.set(-0.6, 0.5, 0.4).normalize(); L.P.set(-0.4, 0.2, -1).normalize(); L.grip = 0.4; p.armPole.L.set(1, -0.6, 0); hp = 0.5; p.lean = 0.12; }
      // mit beiden Fäusten auf den Tisch hauen (Big Bruno)
      if (P.act === 'slam') { const u = Math.abs(Math.sin(P.t * 6)); for (const [hh, sg] of [[L, 1], [R, -1]]) { hh.wrist.set(sg * 0.2, h + 0.32 + u * 0.3, 0.45); hh.F.set(0, -0.2, 1).normalize(); hh.P.set(0, -1, 0); hh.grip = 1; } p.armPole.L.set(0.8, -0.6, -0.2); p.armPole.R.set(-0.8, -0.6, -0.2); p.lean = 0.18; hp = 0.3; }
    }
    if (P.lookAt) { const c = toLocal(P.lookAt.x, P.lookAt.y, P.lookAt.z); const want = Math.atan2(c.x, c.z); const pitch = -Math.atan2(c.y - 1.6, Math.hypot(c.x, c.z)); hy = clamp(want, -1.1, 1.1); hp = clamp(pitch, -0.7, 0.8); }
    P.headYaw += (hy + P.headYaw * 0 - P.headYaw) * Math.min(1, dt * 6); P.headPitch += (hp - P.headPitch) * Math.min(1, dt * 6); p.headYaw = P.headYaw; p.headPitch = P.headPitch; if (P.actT !== undefined) P.actT += dt;
    const sl = p.lean; const sh = p.headPitch; p.lean = -sl; p.headPitch = -sh; fig.pose(space, p); p.lean = sl; p.headPitch = sh;
  };
  return P;
}

// Laufen entlang einer Punktliste (für Gäste und Filmszenen). Gibt true zurück, wenn das Ziel erreicht ist.
export function walkTo(P, tx, tz, dt, speed = 1.3, ground = null) {
  const dx = tx - P.x; const dz = tz - P.z; const d = Math.hypot(dx, dz); if (d < 0.06) { P.mode = 'stand'; P.speed = 0; return true; }
  const want = Math.atan2(dx, dz); let dy = want - P.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; P.yaw += dy * Math.min(1, dt * 7);
  const step = Math.min(d, speed * dt); P.x += dx / d * step; P.z += dz / d * step; P.mode = 'walk'; P.speed = speed; if (ground) P.y = ground(P.x, P.z); return false;
}
export function faceTo(P, tx, tz, dt, rate = 5) { const want = Math.atan2(tx - P.x, tz - P.z); let dy = want - P.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; P.yaw += dy * Math.min(1, dt * rate); }

// Goldene Statue: Figur aus Gold, Arm mit Münze in die Höhe
export function createStatue(scene, envMap, base) {
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b050, metalness: 1, roughness: 0.2, envMap, envMapIntensity: 1.5 }); const fig = createFigure({ material: gold }); const sp = new THREE.Object3D(); sp.position.copy(base); scene.add(sp, fig.root);
  const p = blankPose(); p.y = 0.97; p.feet.L.ankle.set(0.15, 0.09, 0.02); p.feet.L.toe.set(0.2, 0.03, 0.15); p.feet.R.ankle.set(-0.12, 0.09, -0.06); p.feet.R.toe.set(-0.14, 0.03, 0.08); p.lean = 0.06; p.twist = 0.12; p.headPitch = 0.32; p.headYaw = 0.15;
  p.hands.L.wrist.set(0.3, 2.06, 0.1); p.hands.L.F.set(0.05, 1, 0.05).normalize(); p.hands.L.P.set(0, 0, 1); p.hands.L.grip = 0.85; p.armPole.L.set(1, -0.3, 0);
  p.hands.R.wrist.set(-0.2, 1.02, 0.12); p.hands.R.F.set(0.6, -0.5, 0.2).normalize(); p.hands.R.P.set(0, 0, -1); p.hands.R.grip = 0.8; p.armPole.R.set(-1, -0.2, -0.4);
  fig.pose(sp, p); fig.root.updateMatrixWorld(true); const hand = new THREE.Vector3(); fig.bones.handL.getWorldPosition(hand);
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 32), gold); coin.position.copy(hand).add(V3(0.02, 0.17, 0)); coin.rotation.x = Math.PI / 2; coin.castShadow = true; scene.add(coin);
  fig.mesh.castShadow = true; return { fig, coin };
}
