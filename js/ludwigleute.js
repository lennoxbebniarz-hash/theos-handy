// Theos Seitenscheidel - Ludwig Zigaretti: alle Leute draußen, mit denen man reden kann (Stimmen-Update 2026-11-22).
// Die vorhandenen Figuren bekommen eine Kennung, dazu kommen sechs neue, die nur zu ihrer Uhrzeit da sind.
import * as THREE from './vendor/three.module.min.js';
import { walkTo, faceTo } from './casinofig.js';
import { createSpielPerson as createPerson } from './spielfigur.js'; // Figuren vom Startbildschirm (2026-11-22)
import { FZ, groundY } from './ludwigaussen.js';
import { SHOP, YARD } from './ludwigkiosk.js';
import { inErwin } from './ludwigerwin.js';
import { istDa } from './ludwiggespraech.js';

const L = (shirt, cap, pants, skin, hair) => ({ outfit: 'schlicht', shirt, cap, brim: cap, pants, skin, hair, iris: 0x3a3a2a });
export const NEUE = [
  { id: 'nowak', x: -9.0, z: FZ - 2.2, yaw: Math.PI, act: 'arms', look: { ...L(0xd8b02a, 0x3a3a44, 0x2a2c32, 0xe0b498, 0x8a5a3a), frau: 'zopf', hut: 'cap' } },
  { id: 'sami', x: 6.6, z: FZ - 2.1, yaw: -Math.PI / 2, act: 'phone', look: L(0x7a4a22, 0xe8a21c, 0x2a2420, 0xb07a52, 0x141010) },
  { id: 'jessy', x: 4.0, z: FZ - 14.6, yaw: Math.PI / 2, lauf: [-14, 17], tempo: 2.3, look: { ...L(0xe83a8a, 0xf2f2f2, 0x1a1a2a, 0xe8bc98, 0xc89a5a), frau: 'zopf', face: 'grin' } },
  { id: 'fred', x: 24.8, z: FZ - 13.0, yaw: 0, act: 'arms', gitarre: true, look: L(0x8a5ac8, 0x2a8a7a, 0x3a4a6a, 0xd8a888, 0x6a4a2a) },
  { id: 'horst', x: -16.0, z: FZ - 2.2, yaw: Math.PI / 2, act: 'look', look: { ...L(0x1a2438, 0x10141c, 0x14161c, 0xd0a080, 0x707070), bart: 'schnauzer', face: 'flat' } },
  { id: 'yildiz', x: -5.0, z: FZ - 11.5, yaw: 0, act: 'arms', look: { ...L(0x3a7a6a, 0x8a2a4a, 0x30343a, 0xc8946a, 0x2a2020), frau: 'dutt', rock: 0x8a2a4a } },
];
export const REICHWEITE = 2.7;

export function buildLeute(C) {
  const AU = C.AU; const BR = AU.brunnen; const KI = AU.KI; const walkers = AU.strasse.walkers;
  const neu = NEUE.map((def) => {
    const P = createPerson(AU.content, def.look);
    P.place(def.x, groundY(def.x, def.z), def.z, def.yaw); P.mode = 'stand'; P.act = def.act || 0; P.update(0.016, 0); P.setVisible(false); P.space.visible = false;
    if (def.gitarre) {
      const holz = new THREE.MeshStandardMaterial({ color: 0x9a5a22, roughness: 0.5 }); const hals = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.6 });
      for (const [r, y] of [[0.17, 0.98], [0.13, 1.17]]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, 18), holz); m.rotation.x = Math.PI / 2; m.position.set(0, y, 0.3); P.space.add(m); }
      const n = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.03), hals); n.position.set(0.14, 1.36, 0.32); n.rotation.z = -0.6; P.space.add(n);
    }
    return { def, P, dir: 1 };
  });
  const imLaden = (x, z) => x > SHOP.x0 && x < SHOP.x1 && z > SHOP.z0 - 0.2 && z < SHOP.z1;
  const imHof = (x, z) => x > YARD.x0 - 0.2 && x < YARD.x1 && z > YARD.z0 && z < YARD.z1;
  const king = BR.pigeons.find((q) => q.king);
  const bank = (i) => ({ P: BR.people[i], ok: () => BR.isDay() });
  const alle = [
    { id: 'ede', P: KI.ede, ok: (x, z) => imLaden(x, z), weit: 3.2 },
    { id: 'kalle', P: KI.kalle, ok: (x, z) => imHof(x, z) },
    { id: 'erwin', P: AU.erwin.erwin, ok: (x, z) => AU.erwin.erwin.visible && inErwin(x, z), weit: 3.2 },
    { id: 'krause', P: AU.figures.nb, ok: () => AU.nachbarOut() },
    { id: 'rudi', P: KI.gast, ok: (x, z) => !imLaden(x, z) },
    { id: 'wuttke', P: walkers[0].P, gang: walkers[0], ok: () => true },
    { id: 'sommer', P: walkers[1].P, gang: walkers[1], ok: () => true },
    { id: 'lehrer', ...bank(0) }, { id: 'manni', ...bank(1) }, { id: 'blum', ...bank(2) }, { id: 'heinz', ...bank(3) },
    ...neu.map((n) => ({ id: n.def.id, P: n.P, ok: () => n.P.visible })),
    ...AU.figures.park.map((P, i) => ({ id: 'park' + i, P, ok: () => P.visible, park: i })),
  ];
  if (king) alle.push({ id: 'guenther', tier: king, ok: () => BR.isDay() && king.state !== 'fly' });

  const ort = (e) => (e.tier ? { x: e.tier.x, z: e.tier.z } : { x: e.P.x, z: e.P.z });
  function finde(S, me) {
    let best = null; const fx = -Math.sin(me.yaw); const fz = -Math.cos(me.yaw);
    for (const e of alle) {
      if (e.park === undefined && e.id !== 'guenther' && !istDa(S, e.id)) continue;
      if (e.id === 'guenther' && !istDa(S, e.id)) continue;
      if (!e.ok(me.x, me.z)) continue;
      const p = ort(e); const dx = p.x - me.x; const dz = p.z - me.z; const d = Math.hypot(dx, dz);
      if (d > (e.weit || REICHWEITE) || d < 0.05) continue;
      const dot = (dx * fx + dz * fz) / d; if (dot < 0.72) continue;
      const wert = dot - d * 0.1; if (!best || wert > best.wert) best = { e, wert };
    }
    return best ? best.e : null;
  }
  // wer da ist, bleibt stehen und schaut, sobald Ludwig ihn anschaut oder mit ihm redet
  function update(S, me, t, dt, draussen, partner) {
    for (const n of neu) {
      const on = istDa(S, n.def.id); const { P, def } = n;
      if (P.visible !== on) { P.setVisible(on); P.space.visible = on; }
      if (!on || !draussen) continue;
      const d = Math.hypot(P.x - me.x, P.z - me.z); const halt = !!partner && partner.P === P;
      if (def.lauf && !halt && d > 2.2) { if (walkTo(P, n.dir > 0 ? def.lauf[1] : def.lauf[0], def.z, dt, def.tempo)) n.dir = -n.dir; P.lookAt = null; }
      else {
        P.mode = 'stand'; P.speed = 0;
        if (halt || d < 2.6) { faceTo(P, me.x, me.z, dt, 4); P.act = def.gitarre ? 'arms' : 0; } else { P.act = def.act || 0; if (!def.lauf) { let dy = def.yaw - P.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; P.yaw += dy * Math.min(1, dt * 2); } }
      }
      if (d < 45) P.update(dt, t);
    }
    if (!draussen || !partner) return;
    if (partner.gang) { partner.gang.pause = Math.max(partner.gang.pause, 0.3); faceTo(partner.P, me.x, me.z, dt, 5); }
  }
  return { alle, neu, finde, update, ort };
}
