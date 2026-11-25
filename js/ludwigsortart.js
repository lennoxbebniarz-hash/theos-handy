// Theos Seitenscheidel - Ludwig Zigaretti: die neuen Sorten am Tisch und in der Box (Spielprinzip Teil 1, 2026-11-20).
// Eigene Formen: Stopfkippe (weiß mit orangem Filter), Aromakippe (mit farbigem Ring), Zigarillo (braun, dicker, Bauchbinde), Joint (Tüte mit Tip).
// Je Platz: Stopfmaschine mit Hebel und Hülse, Aromakapsel, Tip, Packungen der Sorte auf dem Tisch. Die klassische Kippe zeichnet weiter ludwigart.js.
// Rollen der Schritte (ludwiglogic.js SORTEN): paper (Papier/Deckblatt legen), fill (Tabak), extra (Kapsel/Tip), roll (drehen), tube/press (Stopfmaschine), finish (fertig, fliegt in die Box).
import * as THREE from './vendor/three.module.min.js';
import { CIG } from './ludwigart.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t; const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const THETA_FLAT = 0.12; const THETA_ROLL = Math.PI * 2 * 1.04;
// Stab entlang x mit Farben je Abschnitt: parts = [[bis-Anteil 0..1 von -x nach +x, Farbe], …]; r0/r1 = Radius bei -x/+x (Tüte)
function rodGeo(len, r0, r1, parts, seg = 12) {
  const g = new THREE.CylinderGeometry(r0, r1, len, seg, 24, false); g.rotateZ(Math.PI / 2); // jetzt: +y (Radius r0) liegt bei -x
  const p = g.attributes.position; const col = new Float32Array(p.count * 3); const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + len / 2) / len; let hex = parts[parts.length - 1][1]; for (const [to, h] of parts) if (u <= to + 1e-4) { hex = h; break; } c.setHex(hex).convertSRGBToLinear(); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
export const PRODUCT = {
  stopf: { geo: () => rodGeo(CIG.len, CIG.r, CIG.r, [[0.26, 0xe0883a], [0.985, 0xf7f5f0], [1, 0x8a5a2a]]) },
  aroma: { geo: () => rodGeo(CIG.len, CIG.r, CIG.r, [[0.24, 0xe8d8b0], [0.3, 0xa04ad8], [0.985, 0xf7f5f0], [1, 0x8a5a2a]]) },
  zigarillo: { geo: () => rodGeo(0.135, 0.0102, 0.0102, [[0.02, 0x3a2414], [0.22, 0x6a4428], [0.3, 0xc8231c], [0.32, 0xe8c050], [0.985, 0x6a4428], [1, 0x2a1a10]]) },
  joint: { geo: () => rodGeo(0.13, 0.0056, 0.0118, [[0.16, 0xd8c8a0], [0.94, 0xf4f1ea], [1, 0xe8e2d4]]) },
  // seit 2026-11-21: Vapes (Mundstück, Metallring, farbiger Körper je Geschmack), gebaut an der Werkbank im Bunker
  vmango: { geo: () => rodGeo(0.1, 0.0092, 0.0092, [[0.14, 0x1c1c20], [0.2, 0xc8ccd0], [1, 0xffa030]]) },
  vmenthol: { geo: () => rodGeo(0.1, 0.0092, 0.0092, [[0.14, 0x1c1c20], [0.2, 0xc8ccd0], [1, 0x5ad0ff]]) },
  vkirsche: { geo: () => rodGeo(0.1, 0.0092, 0.0092, [[0.14, 0x1c1c20], [0.2, 0xc8ccd0], [1, 0xe02a40]]) },
};

export function buildSortArt(W) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }); const S0 = W.seats;
  const leaf = new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.85, side: THREE.DoubleSide }); const mixM = new THREE.MeshStandardMaterial({ map: W.M.tobacco.map, color: 0x8aa060, roughness: 1 });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.45, metalness: 0.3 }); const steel = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.3, metalness: 0.8 }); const red = new THREE.MeshStandardMaterial({ color: 0xc0261e, roughness: 0.5 });
  const capM = new THREE.MeshStandardMaterial({ color: 0xa04ad8, roughness: 0.25, emissive: 0x200830 }); const tipM = new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.9 }); const bandM = new THREE.MeshStandardMaterial({ color: 0xc8231c, roughness: 0.4, metalness: 0.3 });
  const geos = Object.fromEntries(Object.entries(PRODUCT).map(([k, v]) => [k, v.geo()]));
  const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const seats = S0.map((pr) => {
    const g = pr.g; const y = pr.lspot.y; const X = { machine: new THREE.Group(), packs: {} };
    // Stopfmaschine: Sockel, Düse, Hebel (dreht sich beim Stopfen), Trichter
    X.machine.position.set(0, y, -0.035); g.add(X.machine); box(0.11, 0.04, 0.07, plastic, -0.03, 0.02, 0, X.machine); box(0.05, 0.03, 0.05, plastic, -0.05, 0.055, 0, X.machine);
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.045, 10), steel); noz.rotation.z = Math.PI / 2; noz.position.set(0.045, 0.026, 0); X.machine.add(noz);
    X.lever = new THREE.Group(); X.lever.position.set(-0.075, 0.045, 0.04); X.machine.add(X.lever); const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 8), steel); rod.rotation.z = Math.PI / 2; rod.position.x = 0.045; X.lever.add(rod); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), red); knob.position.x = 0.09; X.lever.add(knob);
    X.hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.01, 0.02, 12, 1, true), steel); X.hopper.position.set(-0.05, 0.08, 0); X.machine.add(X.hopper); X.hopFill = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.009, 0.012, 12), W.M.tobacco); X.hopFill.position.set(-0.05, 0.078, 0); X.machine.add(X.hopFill);
    X.tube = new THREE.Mesh(geos.stopf, mat); X.tube.rotation.y = Math.PI; X.machine.add(X.tube); X.fill = new THREE.Mesh(new THREE.CylinderGeometry(CIG.r * 0.8, CIG.r * 0.8, 1, 8), W.M.tobacco); X.fill.rotation.z = Math.PI / 2; X.machine.add(X.fill);
    X.machine.visible = false;
    // Kapsel (Aroma), Tip (Joint), Bauchbinde (Zigarillo)
    X.cap = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), capM); g.add(X.cap); X.tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0052, 0.02, 10), tipM); X.tip.rotation.z = Math.PI / 2; g.add(X.tip);
    X.band = new THREE.Mesh(new THREE.TorusGeometry(0.0106, 0.0022, 6, 18), bandM); X.band.rotation.y = Math.PI / 2; g.add(X.band);
    // Packungen der Sorte auf dem Tisch (neben Heftchen und Tabakbeutel)
    const pk = (key, build) => { const o = new THREE.Group(); o.position.set(-0.14, y, -0.16); o.visible = false; g.add(o); build(o); X.packs[key] = o; };
    pk('stopf', (o) => { box(0.075, 0.035, 0.05, new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.6 }), 0, 0.0175, 0, o); box(0.075, 0.006, 0.05, new THREE.MeshStandardMaterial({ color: 0xe0883a }), 0, 0.037, 0, o); });
    pk('aroma', (o) => { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 14), new THREE.MeshStandardMaterial({ color: 0xd8e8f0, roughness: 0.1, transparent: true, opacity: 0.6 })); j.position.y = 0.02; o.add(j); for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), capM); c.position.set(Math.sin(i * 2.1) * 0.01, 0.006 + (i % 3) * 0.006, Math.cos(i * 2.1) * 0.01); o.add(c); } });
    pk('zigarillo', (o) => { for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), leaf); l.rotation.set(-Math.PI / 2, 0, i * 0.15); l.position.y = 0.002 + i * 0.002; o.add(l); } });
    pk('joint', (o) => { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.05), new THREE.MeshStandardMaterial({ color: 0xd8e8d8, roughness: 0.2, transparent: true, opacity: 0.7 })); bag.position.y = 0.004; o.add(bag); const herb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), mixM); herb.scale.set(1, 0.3, 0.8); herb.position.y = 0.006; o.add(herb); const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 16), steel); gr.position.set(0.06, 0.0125, 0.0); o.add(gr); });
    X.prod = Object.fromEntries(Object.keys(PRODUCT).map((k) => { const m = new THREE.Mesh(geos[k], mat); m.visible = false; m.castShadow = true; W.scene.add(m); return [k, m]; }));
    return X;
  });
  // Box: je Sorte ein InstancedMesh, die Plätze laufen hinter den klassischen Kippen weiter
  const MAX = 5200; const ORDER = ['stopf', 'aroma', 'zigarillo', 'joint', 'vmango', 'vmenthol', 'vkirsche']; const dummy = new THREE.Object3D(); const pv = new THREE.Vector3();
  const insts = Object.fromEntries(ORDER.map((k) => { const lowGeo = PRODUCT[k].geo(); const im = new THREE.InstancedMesh(lowGeo, mat, MAX); im.count = 0; im.frustumCulled = false; im.receiveShadow = true; W.stash.g.add(im); return [k, { im, shown: -1, off: -1, tier: -1 }]; }));
  function offsetOf(S, id) { let o = S.kippen; for (const k of ORDER) { if (k === id) return o; o += (S.sorten[k] || { box: 0 }).box; } return o; }
  function stashSet(tierI, S, hide) {
    for (const k of ORDER) { const I = insts[k]; const n = Math.max(0, Math.min(MAX, (S.sorten[k] || { box: 0 }).box - (hide === k ? 1 : 0))); const off = offsetOf(S, k);
      if (n !== I.shown || off !== I.off || tierI !== I.tier) { for (let i = 0; i < n; i++) { W.stash.slot(tierI, off + i, pv); dummy.position.copy(pv); dummy.rotation.set(0, ((i * 7) % 5 - 2) * 0.015, 0); dummy.updateMatrix(); I.im.setMatrixAt(i, dummy.matrix); } I.im.count = n; I.im.instanceMatrix.needsUpdate = true; I.shown = n; I.off = off; I.tier = tierI; } }
  }
  const slotOf = (tierI, S, id, out) => W.stash.slot(tierI, Math.max(0, offsetOf(S, id) + (S.sorten[id] ? S.sorten[id].box : 1) - 1), out);
  function hide(i) { const X = seats[i]; X.machine.visible = false; X.cap.visible = false; X.tip.visible = false; X.band.visible = false; for (const p of Object.values(X.packs)) p.visible = false; for (const m of Object.values(X.prod)) m.visible = false; const pr = W.seats[i]; pr.curl.mesh.material = W.M.paper; pr.curl.mesh.scale.set(1, 1, 1); pr.log.material = W.M.tobacco; } // klassische Kippe: Papier, Größe und Tabak wieder normal
  // Ein Platz mit einer neuen Sorte: a = laufender Schritt { step, t, dur } oder null, idle = Schritt der Sorte (wie weit sie liegen geblieben ist)
  function render(i, id, D, a, idle, S, seat, tierI) {
    const X = seats[i]; const pr = W.seats[i]; const P0 = pr.lspot; const roles = D.steps.map((s) => s.role); const st = a ? a.step : idle; const k = a ? clamp(a.t / a.dur, 0, 1) : 1; const act = a ? roles[a.step] : null;
    const done = new Set(roles.slice(0, st)); const fin = act === 'finish'; for (const [key, p] of Object.entries(X.packs)) p.visible = key === id; for (const [key, m] of Object.entries(X.prod)) m.visible = key === id && fin;
    const curl = pr.curl; const tob = pr.tob; const zig = id === 'zigarillo'; const joint = id === 'joint';
    X.machine.visible = id === 'stopf'; X.cap.visible = false; X.tip.visible = false; X.band.visible = false; curl.mesh.visible = false; tob.visible = false; pr.cig.visible = false;
    if (id === 'stopf') {
      const tubeOn = (done.has('tube') || act === 'tube') && !fin; X.tube.visible = tubeOn; X.fill.visible = tubeOn && (done.has('press') || act === 'press');
      if (tubeOn) { const u = act === 'tube' ? ease(k) : 1; X.tube.position.set(lerp(0.2, 0.12, u), 0.026 + Math.sin(u * Math.PI) * 0.03, 0); }
      const hopper = done.has('fill') || act === 'fill'; X.hopFill.visible = hopper && !(done.has('press')); X.hopFill.scale.setScalar(act === 'fill' ? Math.max(0.2, ease(k)) : act === 'press' ? Math.max(0.05, 1 - ease(k)) : 1);
      X.lever.rotation.z = act === 'press' ? -Math.sin(ease(k) * Math.PI) * 0.9 : 0; if (X.fill.visible) { const f = act === 'press' ? ease(k) : 1; X.fill.scale.set(1, Math.max(0.01, f * CIG.len * 0.74), 1); X.fill.position.set(0.12 + CIG.len * 0.13 - (1 - f) * CIG.len * 0.37, 0.026, 0); }
    } else {
      const paperOn = (done.has('paper') || act === 'paper') && !fin; curl.mesh.visible = paperOn; curl.mesh.material = zig ? leaf : W.M.paper; curl.mesh.scale.set(zig ? 1.28 : joint ? 1.22 : 1, zig ? 1.45 : joint ? 1.25 : 1, zig ? 1.45 : joint ? 1.25 : 1);
      const rolled = done.has('roll') ? 1 : act === 'roll' ? ease(k) : 0;
      if (paperOn) { if (act === 'paper') { const e = ease(k); const B = pr.lbook; curl.mesh.position.set(lerp(B.x, P0.x, e), lerp(B.y + 0.012, P0.y, e) + Math.sin(e * Math.PI) * 0.07, lerp(B.z, P0.z, e)); curl.mesh.rotation.set(0, lerp(0.18, 0, e), Math.sin(e * Math.PI) * 0.25); curl.set(THETA_FLAT); } else { curl.mesh.position.copy(P0); curl.mesh.rotation.set(0, 0, 0); curl.set(lerp(THETA_FLAT, THETA_ROLL, rolled)); } }
      const fillOn = (done.has('fill') || act === 'fill') && !fin; tob.visible = fillOn; pr.log.material = joint ? mixM : W.M.tobacco;
      if (fillOn) { const sc = zig ? 1.4 : joint ? 1.25 : 1; const r = curl.radius() * (zig ? 1.45 : joint ? 1.25 : 1); const grow = act === 'fill' ? Math.max(0.05, ease(k)) : 1; const inner = Math.min(CIG.r * 0.86 * sc, r * 0.9); const sy = lerp(0.0042 * sc, inner, rolled) * grow; const sz = lerp(0.016 * sc, inner, rolled) * Math.max(0.2, grow);
        pr.log.scale.set(0.031 * sc * Math.max(0.3, grow), sy, sz); tob.position.set(P0.x, P0.y + lerp(sy * 0.65, r, rolled), P0.z); pr.setCrumbs(act === 'fill' ? k : 1, lerp(1, 0.25, rolled)); tob.children[1].visible = rolled < 0.9; }
      if (id === 'aroma' && (done.has('extra') || act === 'extra') && !fin) { X.cap.visible = rolled < 0.6; const u = act === 'extra' ? ease(k) : 1; X.cap.position.set(P0.x + 0.01, P0.y + lerp(0.09, 0.008, u), P0.z); }
      if (joint && (done.has('extra') || act === 'extra') && !fin) { X.tip.visible = true; const u = act === 'extra' ? ease(k) : 1; X.tip.position.set(lerp(-0.12, -CIG.len * 0.62, u), P0.y + 0.006 + rolled * curl.radius() * 0.6 + Math.sin(u * Math.PI) * 0.04, P0.z); }
    }
    if (fin) { // fertig: kurz antippen, dann fliegt sie genau an ihren Platz in der Box
      const m = X.prod[id]; const Q = seat.spot; const qx = Math.cos(seat.rot) * 0.02; const qz = -Math.sin(seat.rot) * 0.02;
      if (zig && k < 0.5) { X.band.visible = true; X.band.position.set(P0.x - 0.03, P0.y + 0.012, P0.z); X.band.scale.setScalar(lerp(2.2, 1, ease(k * 2))); }
      if (k < 0.5) { const u = k / 0.5; const up = ease(Math.min(1, u * 2.2)); const tap = u > 0.45 ? Math.abs(Math.sin((u - 0.45) / 0.55 * Math.PI * 2)) * 0.03 : 0; m.position.set(Q.x + up * qx, Q.y + CIG.r * 1.6 + up * 0.03 + tap + 0.002, Q.z + up * qz); m.rotation.set(0, seat.rot, up * Math.PI / 2); }
      else { const u = ease((k - 0.5) / 0.5); const Bv = slotOf(tierI, S, id, new THREE.Vector3()); m.position.set(lerp(Q.x + qx, Bv.x, u), lerp(Q.y + 0.05, Bv.y, u) + Math.sin(u * Math.PI) * 0.22, lerp(Q.z + qz, Bv.z, u)); m.rotation.set(0, seat.rot + u * Math.PI * 2, lerp(Math.PI / 2, 0, u)); }
    }
  }
  return { seats, render, hide, stashSet, PRODUCT, geos, mat, counts: () => Object.fromEntries(ORDER.map((k) => [k, insts[k].im.count])) };
}
