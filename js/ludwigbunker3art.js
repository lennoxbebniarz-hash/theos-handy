// Theos Seitenscheidel - Ludwig Zigaretti: Abstimmung Paket 5 (2026-11-23), das Sichtbare im Bunker. Regeln in ludwigbunker3.js.
// Regale je Sorte an der Vorderwand, vier Sortenmaschinen in einer Reihe, Plane, Vorhang, Not-Aus und Rolltor für die Razzia, Blaulicht in der Garage,
// und die Tiefgarage schöner: Ölflecken, Risse, Lichtkegel unter dem Natriumlicht, eine flackernde Lampe, Rohre, Feuerlöscher, Radstopper, ein Auto unter der Plane.
// Alles hängt an BK.root (lokale Bunker-Maße). Keine neuen Lichter: Lichtkegel und Blaulicht sind nur leuchtende Flächen.
import * as THREE from './vendor/three.module.min.js';
import { std, mesh, canvasTex, label, glow, makeBatch } from './ludwiggfx.js';
import { GARAGE, LAGER } from './ludwigbunkerart.js';
import { REGALE, regalVon, SORTMASCHINEN, SM_IDS, smStatus, VERSTECK_IDS } from './ludwigbunker3.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const REGAL_POS = REGALE.map((R, i) => ({ id: R.id, x: 7.9 + i * 1.35, z: 10.62 }));
export const SM_POS = { stopf: { x: -3.4, z: 4.4 }, aroma: { x: -1.0, z: 4.4 }, zigarillo: { x: 4.0, z: 4.4 }, liquid: { x: 6.4, z: 4.4 } };
export const VERSTECK_POS = { lager: { x: LAGER.x, y: 1.0, z: LAGER.z }, regale: { x: 10.6, y: 1.1, z: 10.0 }, maschinen: { x: 2.0, y: 1.3, z: 2.95 }, tor: { x: 15.55, y: 1.3, z: 1.95 } };
const FARBE = { stopf: 0xd8b26a, aroma: 0xe0405a, zigarillo: 0x7a4a22, joint: 0x5aa83a, vape: 0x3ab8e8 };
const KASTEN = 40; // so viele Kartons passen in ein Regal

export function buildTeil3(root) {
  const M = {
    holz: std({ color: 0x6a4a2a, roughness: 0.8 }), stahl: std({ color: 0x8a9098, roughness: 0.35, metalness: 0.6 }), dunkel: std({ color: 0x24272c, roughness: 0.6 }),
    plane: std({ color: 0x3e4a2a, roughness: 0.95, side: THREE.DoubleSide }), vorhang: std({ color: 0x2a2228, roughness: 1, side: THREE.DoubleSide }), rot: std({ color: 0xb8231c, roughness: 0.5 }),
    gelb: std({ color: 0xe8b81c, roughness: 0.6 }), weiss: std({ color: 0xe8e4dc, roughness: 0.6 }), gummi: std({ color: 0x141416, roughness: 0.9 }),
  };
  const g = new THREE.Group(); g.name = 'bunker-teil3'; root.add(g);

  // ---- Regale je Sorte
  const regale = REGAL_POS.map((p, i) => {
    const R = REGALE[i]; const r = new THREE.Group(); r.position.set(p.x, 0, p.z); g.add(r); const B = makeBatch();
    for (const sx of [-0.6, 0.6]) B.box(M.stahl, sx - 0.03, 0, -0.3, sx + 0.03, 2.0, 0.3);
    for (const y of [0.12, 0.6, 1.08, 1.56]) B.box(M.holz, -0.62, y - 0.025, -0.3, 0.62, y + 0.025, 0.3);
    B.flush(r);
    mesh(new THREE.PlaneGeometry(1.1, 0.24), std({ map: label(R.name.toUpperCase(), { w: 512, h: 112, bg: '#1c1f24', fg: '#ffcf5a', size: 54 }) }), 0, 2.15, -0.29, r, { ry: Math.PI });
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.16, 0.2), std({ color: FARBE[R.id], roughness: 0.7 }), KASTEN); inst.count = 0; inst.frustumCulled = false; r.add(inst); // Zahl wechselt, sonst bleibt die leere Hülle vom Start und die Kartons verschwinden
    const d = new THREE.Object3D();
    for (let k = 0; k < KASTEN; k++) { const ebene = Math.floor(k / 10); const pl = k % 10; d.position.set(-0.45 + (pl % 4) * 0.3, 0.225 + ebene * 0.48 + (pl >= 8 ? 0.17 : 0), pl >= 4 && pl < 8 ? -0.12 : 0.1); d.rotation.y = ((k * 37) % 7 - 3) * 0.04; d.updateMatrix(); inst.setMatrixAt(k, d.matrix); }
    inst.instanceMatrix.needsUpdate = true;
    return { R, inst };
  });

  // ---- Sortenmaschinen
  const masch = {};
  for (const id of SM_IDS) {
    const p = SM_POS[id]; const M0 = SORTMASCHINEN[id]; const m = new THREE.Group(); m.position.set(p.x, 0, p.z); m.visible = false; g.add(m);
    const farbe = std({ color: id === 'liquid' ? 0x2a6a8a : id === 'zigarillo' ? 0x6a4428 : id === 'aroma' ? 0x8a2438 : 0x8a7a3a, roughness: 0.45, metalness: 0.3 });
    const koerper = new THREE.Group(); m.add(koerper);
    mesh(new THREE.BoxGeometry(1.5, 0.12, 1.1), M.dunkel, 0, 0.06, 0, koerper);
    mesh(new THREE.BoxGeometry(1.3, 0.9, 0.9), farbe, 0, 0.57, 0, koerper, { cast: true });
    mesh(new THREE.ConeGeometry(0.32, 0.45, 16, 1, true), M.stahl, -0.3, 1.25, 0, koerper, { rx: Math.PI });
    const rad = new THREE.Group(); rad.position.set(0.42, 1.1, 0); koerper.add(rad);
    mesh(new THREE.TorusGeometry(0.17, 0.03, 6, 18), M.stahl, 0, 0, 0, rad, { ry: Math.PI / 2 });
    for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.02, 0.32, 0.03), M.stahl, 0, 0, 0, rad, { rx: (i * Math.PI) / 3 });
    if (id === 'liquid') for (const [x, c] of [[0.1, 0xffa030], [0.32, 0x5ad0ff], [0.54, 0xe02a40]]) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.32, 12), std({ color: c, roughness: 0.1, transparent: true, opacity: 0.75 }), x - 0.5, 1.18, 0.25, koerper);
    mesh(new THREE.BoxGeometry(0.42, 0.26, 0.3), std({ color: 0xb98c56, roughness: 0.9 }), 0, 0.13, -0.72, m);
    mesh(new THREE.PlaneGeometry(1.2, 0.26), std({ map: label(M0.name.toUpperCase(), { w: 512, h: 112, bg: '#1c1f24', fg: '#e8e2d0', size: 50 }) }), 0, 0.85, -0.452, m, { ry: Math.PI });
    const lampe = std({ color: 0x000000, emissive: 0x30ff60, emissiveIntensity: 2.4 }); mesh(new THREE.SphereGeometry(0.06, 10, 8), lampe, 0.55, 1.08, -0.4, m);
    masch[id] = { m, koerper, rad, lampe };
  }

  // ---- Razzia: Plane über dem Lager, Vorhang vor den Regalen, Not-Aus am Pfeiler, Rolltor zur Garage
  const plane = new THREE.Group(); plane.visible = false; g.add(plane);
  { const geo = new THREE.BoxGeometry(5.4, 1.5, 6.4, 18, 1, 20); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 2.1) * Math.cos(p.getZ(i) * 1.7) * 0.12); geo.computeVertexNormals(); mesh(geo, M.plane, LAGER.x - 0.4, 0.75, LAGER.z, plane); }
  const vorhang = new THREE.Group(); vorhang.visible = false; g.add(vorhang);
  { const geo = new THREE.PlaneGeometry(7.1, 2.2, 60, 1); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.05); geo.computeVertexNormals(); mesh(geo, M.vorhang, 10.6, 1.1, 10.14, vorhang); mesh(new THREE.CylinderGeometry(0.02, 0.02, 7.3, 6), M.stahl, 10.6, 2.22, 10.14, vorhang, { rz: Math.PI / 2 }); }
  const notaus = new THREE.Group(); notaus.position.set(VERSTECK_POS.maschinen.x, VERSTECK_POS.maschinen.y, 2.93); g.add(notaus);
  mesh(new THREE.BoxGeometry(0.26, 0.34, 0.06), M.gelb, 0, 0, 0, notaus); const knopf = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), M.rot, 0, 0, 0.06, notaus, { rx: Math.PI / 2 });
  mesh(new THREE.PlaneGeometry(0.3, 0.09), std({ map: label('NOT-AUS', { w: 256, h: 80, bg: '#e8b81c', fg: '#1a1a1a', size: 52 }) }), 0, 0.24, 0.032, notaus);
  const torKasten = mesh(new THREE.BoxGeometry(0.06, 0.3, 0.22), M.dunkel, VERSTECK_POS.tor.x + 0.4, VERSTECK_POS.tor.y, VERSTECK_POS.tor.z, g);
  mesh(new THREE.BoxGeometry(0.02, 0.08, 0.08), M.gelb, -0.04, 0.05, 0, torKasten);
  const tor = new THREE.Group(); tor.position.set(16.02, 0, (GARAGE.open0 + GARAGE.open1) / 2); g.add(tor);
  const torTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#6a7078'; x.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, y, w, 3); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, y + 3, w, 2); } }, [3, 2]);
  const torBlatt = mesh(new THREE.BoxGeometry(0.08, 3.4, GARAGE.open1 - GARAGE.open0), std({ map: torTex, roughness: 0.55, metalness: 0.4 }), 0, 1.7, 0, tor);
  let torAuf = 1; torBlatt.position.y = 1.7 + 3.4 * torAuf; torBlatt.visible = false;
  const blau = std({ color: 0x000000, emissive: 0x2a6aff, emissiveIntensity: 0 }); const blaulicht = [];
  for (const [x, z] of [[GARAGE.x1 - 1.0, 3.2], [GARAGE.x1 - 1.0, 9.8], [GARAGE.x0 + 0.4, 2.3]]) { const b = mesh(new THREE.BoxGeometry(0.18, 0.12, 0.3), blau, x, GARAGE.h - 0.12, z, g); blaulicht.push({ b, s: glow(g, x, GARAGE.h - 0.25, z, 0x3a7aff, 2.6, 0) }); }

  // ---- Tiefgarage schöner
  const G = GARAGE; const BT = makeBatch();
  const fleck = (seed, art) => canvasTex(256, 256, (x, w) => {
    let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    if (art === 'riss') { x.strokeStyle = 'rgba(10,10,12,.7)'; x.lineWidth = 2; x.beginPath(); let px = w * 0.1; let py = w * (0.3 + r() * 0.4); x.moveTo(px, py); for (let i = 0; i < 14; i++) { px += w * 0.06; py += (r() - 0.5) * 28; x.lineTo(px, py); } x.stroke(); return; }
    for (let i = 0; i < 6; i++) { const cx = w * (0.3 + r() * 0.4); const cy = w * (0.3 + r() * 0.4); const rr = w * (0.12 + r() * 0.22); const gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(6,6,8,.75)'); gr.addColorStop(0.6, 'rgba(14,12,16,.35)'); gr.addColorStop(1, 'rgba(14,12,16,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, w); }
    const gl = x.createRadialGradient(w * 0.45, w * 0.45, 0, w * 0.45, w * 0.45, w * 0.18); gl.addColorStop(0, 'rgba(120,80,160,.18)'); gl.addColorStop(0.5, 'rgba(60,140,120,.12)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gl; x.fillRect(0, 0, w, w);
  });
  const oel = [fleck(11), fleck(29), fleck(53)].map((t) => std({ map: t, transparent: true, depthWrite: false, roughness: 0.15, metalness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 }));
  const riss = std({ map: fleck(7, 'riss'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  [[18.8, -7.6, 1.6, 0], [24, -9.0, 1.3, 1], [27.5, -8.2, 1.9, 2], [21, 5.6, 2.2, 0], [29, 7.2, 1.5, 1], [25.5, 0.2, 1.1, 2], [31.5, -2.5, 1.7, 0]].forEach(([x, z, s, k], i) => mesh(new THREE.PlaneGeometry(s, s), oel[k], x, 0.003 + i * 0.0004, z, g, { rx: -Math.PI / 2, rz: i }));
  [[20, -2, 2.6], [28, 4, 3], [32, -6, 2.4]].forEach(([x, z, s], i) => mesh(new THREE.PlaneGeometry(s, s), riss, x, 0.006, z, g, { rx: -Math.PI / 2, rz: i * 1.3 }));
  const kegel = new THREE.MeshBasicMaterial({ map: canvasTex(64, 256, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,190,110,.32)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const kegelListe = [];
  for (let x = G.x0 + 3; x < G.x1; x += 6) { const c = mesh(new THREE.CylinderGeometry(0.45, 1.9, G.h - 0.2, 20, 1, true), kegel, x, (G.h - 0.2) / 2, 6.5, g); kegelListe.push(c); }
  const flacker = kegelListe[2] || null;
  for (const z of [G.z0 + 0.25, G.z1 - 0.25]) { BT.add(M.stahl, new THREE.CylinderGeometry(0.07, 0.07, G.x1 - G.x0, 10), (G.x0 + G.x1) / 2, G.h - 0.35, z, 0, 0, Math.PI / 2); BT.add(M.rot, new THREE.CylinderGeometry(0.045, 0.045, G.x1 - G.x0, 8), (G.x0 + G.x1) / 2, G.h - 0.55, z, 0, 0, Math.PI / 2); }
  for (let x = G.x0 + 2; x < G.x1; x += 4) for (const z of [G.z0 + 0.25, G.z1 - 0.25]) BT.box(M.dunkel, x - 0.04, G.h - 0.6, z - 0.04, x + 0.04, G.h, z + 0.04);
  for (const [x, z] of [[G.x0 + 0.35, -3], [G.x1 - 0.35, -8]]) { BT.box(M.rot, x - 0.12, 0.9, z - 0.18, x + 0.12, 1.5, z + 0.18); BT.add(M.rot, new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), x, 1.2, z); }
  for (let x = G.x0 + 1.5 + 1.3; x < G.x1 - 1; x += 2.6) BT.add(M.gelb, new THREE.BoxGeometry(0.9, 0.1, 0.16), x, 0.05, -10.25);
  for (let x = G.x0 + 3; x < G.x1; x += 6) for (const z of [-4, 1]) for (const dz of [-0.36, 0.36]) BT.add(M.gelb, new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10), x + 0.36, 0.45, z + dz);
  for (const [x, z] of [[22, 3.2], [28, 9.7]]) BT.box(M.dunkel, x - 0.3, 0.002, z - 0.15, x + 0.3, 0.009, z + 0.15);
  { const c = new THREE.Group(); c.position.set(G.x0 + 13.2, 0, -8.4); g.add(c); const geo = new THREE.BoxGeometry(2.1, 1.35, 4.5, 8, 4, 12); const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); const z = p.getZ(i); if (y > 0.2) p.setX(i, p.getX(i) * 0.86); if (y > 0.4 && Math.abs(z) > 1.2) p.setY(i, y - (Math.abs(z) - 1.2) * 0.55); p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 6 + z * 3) * 0.02); } geo.computeVertexNormals(); mesh(geo, std({ color: 0x5a6a7a, roughness: 0.9 }), 0, 0.7, 0, c, { cast: true }); for (const [wx, wz] of [[-0.95, -1.4], [0.95, -1.4], [-0.95, 1.4], [0.95, 1.4]]) mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16), M.gummi, wx, 0.33, wz, c, { rz: Math.PI / 2 }); }
  mesh(new THREE.PlaneGeometry(1.6, 0.4), std({ map: label('DURCHFAHRT 2,10 m', { w: 512, h: 128, bg: '#f2b81c', fg: '#141414', size: 60 }) }), G.x1 - 0.12, G.h - 0.3, 6.5, g, { ry: -Math.PI / 2 });
  BT.flush(g);

  let zeit = 0;
  function update(S, dt, sichtbar) {
    if (!sichtbar) return; zeit += dt; const B = S.bunker;
    for (const { R, inst } of regale) { const n = regalVon(B, R); const c = n <= 0 ? 0 : Math.min(KASTEN, Math.max(1, Math.ceil(n / 5))); if (inst.count !== c) inst.count = c; }
    for (const id of SM_IDS) {
      const q = B.sm[id]; const V = masch[id]; V.m.visible = !!q.have; if (!q.have) continue;
      const st = smStatus(S, id); const bau = st === 'bau' ? 1 - q.build / SORTMASCHINEN[id].build : 1;
      V.koerper.scale.y = 0.25 + 0.75 * bau; V.koerper.position.y = 0;
      if (st === 'läuft') V.rad.rotation.x += dt * 4;
      V.lampe.emissive.setHex(st === 'läuft' ? 0x30ff60 : st === 'aus' ? 0xff2a1a : 0xffc030);
    }
    const Rz = B.razzia; const an = Rz.left > 0;
    plane.visible = an && !!Rz.hidden.lager; vorhang.visible = an && !!Rz.hidden.regale;
    knopf.position.z = an && Rz.hidden.maschinen ? 0.035 : 0.06;
    torAuf += ((an && Rz.hidden.tor ? 0 : 1) - torAuf) * Math.min(1, dt * 2.5); torBlatt.visible = torAuf < 0.98; torBlatt.position.y = 1.7 + 3.4 * torAuf;
    const blink = an && Math.sin(zeit * 14) > 0; for (const { b, s } of blaulicht) { b.material.emissiveIntensity = blink ? 4 : 0; s.material.opacity = blink ? 0.55 : 0; }
    if (flacker) flacker.visible = Math.sin(zeit * 23) + Math.sin(zeit * 3.1) > -1.6;
  }
  const torBox = () => (torAuf < 0.5 ? [{ x0: 15.85, x1: 16.2, z0: GARAGE.open0, z1: GARAGE.open1 }] : []);
  function boxen(S) {
    const out = REGAL_POS.map((p) => ({ x0: p.x - 0.65, x1: p.x + 0.65, z0: p.z - 0.32, z1: 11 }));
    for (const id of SM_IDS) if (S.bunker.sm[id].have) { const p = SM_POS[id]; out.push({ x0: p.x - 0.75, x1: p.x + 0.75, z0: p.z - 0.9, z1: p.z + 0.55 }); }
    return out.concat(torBox());
  }
  return { update, boxen, regale, masch, teile: { plane, vorhang, notaus, tor: torBlatt, blaulicht, kegel: kegelListe } };
}
export { VERSTECK_IDS };
