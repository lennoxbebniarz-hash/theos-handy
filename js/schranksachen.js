// Theos Seitenscheidel - Schrank-Hub: jedes Spiel als Gegenstand im Schrank. Alles im Code gebaut oder aus den eigenen Modellen der Spiele.
// buildSache(id, maß) liefert { group, update(t, aktiv), gold(an) }, unten mittig ausgerichtet und auf das Fach eingepasst.
import * as THREE from './vendor/three.module.min.js';
import { mergeVertices } from './vendor/BufferGeometryUtils.js';
import { V3, TAU, clamp, smooth, rng, fbm3, std, glowMat, mesh, rbox, tube, bake, canvasTex, glowSprite, puffTex } from './titelkit.js';
import { createBuddy, drawBolt } from './titelfigur.js';
import { buildModel as ozeanModel } from './ozeanart.js';
import { buildAstronaut, poseAstronaut } from './moonart.js';
import { buildCar } from './carmodel.js';

const cyl = (rt, rb, h, seg = 24, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
const ball = (r, seg = 18) => new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.7));
const lathe = (pts, seg = 22) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const Z = V3(0, 0, 1);

// Unsichtbares raus, Teile mit eigenem Shader einzeln lassen, den Rest zusammenfassen
function still(root) {
  const gone = [];
  root.traverse((o) => { if (o !== root && !o.visible) gone.push(o); });
  for (const o of gone) if (o.parent) o.parent.remove(o);
  root.traverse((o) => { if (o.isMesh && !Array.isArray(o.material) && o.material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) o.userData.keep = true; });
  return bake(root);
}
function die(parent, size, pos, rot) {
  const g = new THREE.Group(); g.position.set(pos[0], pos[1], pos[2]); g.rotation.set(rot[0], rot[1], rot[2]); parent.add(g);
  mesh(rbox(1, 1, 1, 0.16, 3), std({ color: 0xf8f5ec, roughness: 0.3 }), g, [0, 0, 0], null, size);
  const pip = std({ color: 0x22232a, roughness: 0.3 }); const s = size / 2; const o = size * 0.26;
  for (const [a, b] of [[-o, -o], [o, o], [0, 0], [-o, o], [o, -o]]) mesh(ball(size * 0.08, 8), pip, g, [a, b, s], null, [1, 1, 0.4]);
  for (const [a, b] of [[-o, -o], [o, o], [0, 0]]) mesh(ball(size * 0.08, 8), pip, g, [a, s, b], null, [1, 0.4, 1]);
  for (const [a, b] of [[-o, o], [o, -o]]) mesh(ball(size * 0.08, 8), pip, g, [s, a, b], null, [0.4, 1, 1]);
}
function pawn(parent, mat, x, y, z, k = 1, lying = false) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(k); if (lying) g.rotation.set(0, 0.5, Math.PI / 2 - 0.1); parent.add(g);
  mesh(lathe([[0.001, 0], [0.2, 0], [0.21, 0.05], [0.15, 0.1], [0.07, 0.36], [0.11, 0.4], [0.001, 0.42]]), mat, g);
  mesh(ball(0.14), mat, g, [0, 0.52, 0]);
}

const BAU = {
  // ---------------- die sechs großen ----------------
  bruno() {
    const g = new THREE.Group(); const head = new THREE.Group(); g.add(head); head.rotation.set(-0.04, 0.16, 0.07);
    let geo = new THREE.IcosahedronGeometry(1, 18); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo, 1e-5);
    const p = geo.attributes.position; const col = new Float32Array(p.count * 3); const d = V3();
    const r = rng(90); const holes = [];
    while (holes.length < 22) { const h = V3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize(); if ((h.z > 0.45 && Math.abs(h.x) < 0.64) || h.y > 0.6) continue; holes.push([h, 0.13 + r() * 0.15]); }
    for (let i = 0; i < p.count; i++) {
      d.fromBufferAttribute(p, i).normalize();
      const calm = Math.max(smooth(0.3, 0.68, d.z) * 0.8, smooth(0.35, 0.6, d.y) * 0.85);
      const n = fbm3(d.x * 2.2 + 5, d.y * 2.2, d.z * 2.2, 4) - 0.5; const fine = fbm3(d.x * 8, d.y * 8 + 3, d.z * 8, 3) - 0.5;
      let k = 1 + (n * 0.42 + fine * 0.1) * (1 - calm); let shade = 1;
      for (const [h, hr] of holes) { const q = d.angleTo(h) / hr; if (q < 1) { k -= 0.09 * (1 - q * q); shade *= 0.55 + 0.45 * q; } }
      const t = clamp(0.5 + n * 1.8 + fine, 0, 1);
      col[i * 3] = (0.11 + 0.17 * t) * shade; col[i * 3 + 1] = (0.108 + 0.163 * t) * shade; col[i * 3 + 2] = (0.115 + 0.158 * t) * shade; // grauer Fels
      p.setXYZ(i, d.x * k, d.y * k, d.z * k);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
    mesh(geo, std({ vertexColors: true, roughness: 0.92 }), head);
    const onFace = (x, y, lift) => V3(x, y, Math.sqrt(Math.max(0, 1 - x * x - y * y))).multiplyScalar(lift);
    const put = (geom, mat, x, y, lift, scale, roll = 0) => {
      const at = onFace(x, y, lift); const m = mesh(geom, mat, head, [at.x, at.y, at.z], null, scale);
      m.quaternion.setFromUnitVectors(Z, at.normalize()); m.rotateZ(roll); m.castShadow = false;
    };
    const fire = glowMat(0xff9418, 1.4); const ink = std({ color: 0x1a0905, roughness: 0.6 }); const brow = std({ color: 0x3a393d, roughness: 0.95 });
    for (const s of [-1, 1]) {
      put(ball(1, 16), fire, s * 0.36, 0.14, 1.02, [0.21, 0.13, 0.07], s * 0.2);
      put(ball(1, 12), ink, s * 0.33, 0.12, 1.07, [0.075, 0.085, 0.04]);
      put(rbox(0.46, 0.13, 0.14, 0.06, 2), brow, s * 0.36, 0.31, 1.06, 1, s * 0.38);
    }
    put(ball(1, 14), brow, 0, -0.06, 1.03, [0.13, 0.12, 0.12]);
    const mouth = new THREE.RingGeometry(0.001, 0.46, 30, 6, Math.PI, Math.PI); const mp = mouth.attributes.position;
    for (let i = 0; i < mp.count; i++) { const at = onFace(mp.getX(i), mp.getY(i) * 0.72 - 0.2, 1.055); mp.setXYZ(i, at.x, at.y, at.z); }
    mouth.computeVertexNormals(); mesh(mouth, std({ color: 0x250705, emissive: 0x2a0500, roughness: 0.7 }), head);
    const tooth = std({ color: 0xf6e6c4, roughness: 0.35 });
    for (let i = 0; i < 7; i++) { const x = (i - 3) * 0.118; put(rbox(0.1, 0.13, 0.07, 0.03, 2), tooth, x, -0.245 + x * x * 0.1, 1.075, 1); if (i % 2) put(rbox(0.09, 0.09, 0.07, 0.03, 2), tooth, x * 0.75, -0.46, 1.075, 1); }
    const cloth = std({ color: 0x18191e, roughness: 0.75 });
    mesh(new THREE.SphereGeometry(0.99, 36, 14, 0, TAU, 0, Math.PI / 2), cloth, head, [0, 0.5, 0], null, [1, 0.74, 1]);
    mesh(new THREE.CylinderGeometry(1, 1, 0.07, 28, 1, false, -Math.PI / 2, Math.PI), cloth, head, [0, 0.52, 0.66], [0.1, 0, 0], [0.86, 1, 0.7]);
    const tag = canvasTex(512, 140, (c, w, h) => { c.fillStyle = '#18191e'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0bd52'; c.textAlign = 'center'; c.font = "900 116px 'Segoe UI Black', sans-serif"; c.fillText('BRUNO', w / 2, h * 0.82); });
    mesh(new THREE.CylinderGeometry(0.875, 1.0, 0.25, 24, 1, true, -0.6, 1.2), std({ map: tag, roughness: 0.6 }), head, [0, 0.72, 0.012]);
    const gold = std({ color: 0xf0bd52, metalness: 0.9, roughness: 0.22, emissive: 0x241300 });
    for (let i = 0; i < 15; i++) {
      const x = (i - 7) * 0.108; const y = -0.62 - 0.2 * (1 - (x / 0.8) ** 2); const at = onFace(x * 0.75, clamp(y, -0.86, 0), 1.12);
      mesh(new THREE.TorusGeometry(0.07, 0.024, 7, 12), gold, head, [at.x, at.y, at.z], [i % 2 ? 1.1 : 0.2, x * 0.7, x * 0.6], [1.3, 1, 1]);
    }
    mesh(cyl(0.17, 0.17, 0.06, 20).rotateX(Math.PI / 2), gold, head, [0, -0.96, 0.67], [0.35, 0, 0]);
    still(head);
    const glow = glowSprite(g, 0xff6a2a, 2.3, [-0.7, 0.2, -0.7], 0.25);
    for (const [size, x, y, z] of [[1.5, -0.75, 0.45, -0.5], [1.15, -1.1, 0.75, -0.6], [0.8, -1.4, 1.0, -0.65], [0.5, -0.85, -0.1, 0.1]]) glowSprite(g, 0xff7a1a, size, [x, y, z], 0.5); // Feuerschweif
    return { group: g, update(t, on) { head.rotation.y = 0.16 + Math.sin(t * 0.7) * 0.13; head.rotation.z = 0.07 + Math.sin(t * 1.1) * 0.03; glow.material.opacity = on ? 0.55 : 0.25 + Math.sin(t * 2.3) * 0.05; } };
  },

  ludwig() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const glass = std({ color: 0x35707c, roughness: 0.12, metalness: 0.3 }); const ash = std({ color: 0x8c8a88, roughness: 1 });
    mesh(lathe([[0.001, 0], [0.82, 0], [0.9, 0.06], [0.92, 0.3], [0.8, 0.32], [0.74, 0.11], [0.001, 0.1]], 28), glass, fixed);
    const r = rng(4);
    for (let i = 0; i < 12; i++) mesh(ball(0.05 + r() * 0.06, 8), ash, fixed, [(r() - 0.5) * 0.9, 0.13, (r() - 0.5) * 0.8], null, [1, 0.5, 1]);
    const cig = new THREE.Group(); cig.position.set(-0.05, 0.66, 0.08); cig.rotation.set(0, -0.14, 0.25); fixed.add(cig);
    const along = (geo) => geo.rotateZ(-Math.PI / 2);
    const cork = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#d08a3c'; c.fillRect(0, 0, w, h); const q = rng(8); for (let i = 0; i < 220; i++) { c.fillStyle = q() < 0.5 ? '#e8b268' : '#a4601e'; c.fillRect(q() * w, q() * h, 3, 4); } });
    mesh(along(cyl(0.25, 0.25, 0.78)), std({ map: cork, roughness: 0.75 }), cig, [-0.86, 0, 0]);
    mesh(along(cyl(0.256, 0.256, 0.06)), std({ color: 0xe8b84e, metalness: 0.8, roughness: 0.25 }), cig, [-0.45, 0, 0]);
    const paper = canvasTex(512, 512, (c, w, h) => { // Schrift läuft die Zigarette entlang
      c.fillStyle = '#f7f3e8'; c.fillRect(0, 0, w, h); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2);
      c.fillStyle = '#b8221c'; c.textAlign = 'center'; c.font = 'italic 700 112px Georgia, serif'; c.fillText('Ludwig', 0, 12);
      c.fillStyle = '#7a1612'; c.font = '700 48px Georgia, serif'; c.fillText('Zigaretti', 0, 68);
    });
    mesh(along(new THREE.CylinderGeometry(0.248, 0.248, 1.42, 28, 1, true, Math.PI, TAU)), std({ map: paper, roughness: 0.8 }), cig, [0.28, 0, 0]);
    mesh(along(cyl(0.236, 0.244, 0.07)), glowMat(0xff5a16, 1.8), cig, [1.02, 0, 0]);
    mesh(along(cyl(0.17, 0.225, 0.2, 12)), ash, cig, [1.14, 0, 0]);
    for (let i = 0; i < 7; i++) mesh(ball(0.045, 6), i % 2 ? ash : glowMat(0xff8a2a, 1.5), cig, [1.13 + r() * 0.1, Math.cos(i) * 0.15, Math.sin(i) * 0.15]);
    const red = std({ color: 0xb8221c, roughness: 0.4 }); const pack = new THREE.Group(); pack.position.set(0.86, 0, 0.62); pack.rotation.y = -0.4; fixed.add(pack);
    mesh(rbox(0.42, 0.6, 0.2, 0.03, 2), red, pack, [0, 0.3, 0]);
    mesh(new THREE.PlaneGeometry(0.4, 0.3), std({ map: canvasTex(256, 192, (c, w, h) => { c.fillStyle = '#f7efdc'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8221c'; c.textAlign = 'center'; c.font = 'italic 700 70px Georgia, serif'; c.fillText('LZ', w / 2, 118); }) }), pack, [0, 0.27, 0.102]);
    still(fixed);
    const puffs = [];
    for (let i = 0; i < 4; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex(), color: 0xd8dce8, transparent: true, opacity: 0, depthWrite: false })); g.add(s); puffs.push(s); }
    return {
      group: g,
      update(t, on) {
        puffs.forEach((s, i) => {
          const k = (t * 0.22 + i / 4) % 1;
          s.position.set(1.05 + Math.sin(k * 5 + i) * 0.12 - k * 0.2, 1.0 + k * 0.8, 0.22); s.scale.setScalar(0.25 + k * 0.55);
          s.material.opacity = Math.min(1, k * 6) * (1 - k) * (on ? 0.85 : 0.5); s.material.rotation = i + k;
        });
      },
    };
  },

  moon() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const dust = std({ color: 0xb9bac8, roughness: 1 }); const crater = std({ color: 0x9294a6, roughness: 1 });
    mesh(new THREE.SphereGeometry(1.3, 32, 10, 0, TAU, 0, Math.PI / 2), dust, fixed, [0, 0, 0], null, [1, 0.24, 0.8]);
    for (const [x, z, r] of [[-0.75, 0.35, 0.22], [0.8, 0.25, 0.17], [0.25, 0.75, 0.13]]) {
      const y = 0.31 * Math.sqrt(Math.max(0, 1 - (x / 1.3) ** 2 - (z / 1.04) ** 2));
      mesh(new THREE.TorusGeometry(r, 0.04, 6, 18).rotateX(Math.PI / 2), crater, fixed, [x, y + 0.01, z], null, [1, 0.8, 1]);
    }
    const R = buildAstronaut({ accent: 0xee7a18, stripe: 0xee7a18 });
    R.setTool('broom', 'broom', 1.05);
    for (let i = 0; i < 40; i++) poseAstronaut(R, { speed: 0, scrub: 1, oscW: 0.25 }, 0.05);
    R.root.position.set(-0.15, 0.27, -0.1); R.root.rotation.y = 0.5; fixed.add(R.root);
    still(fixed);
    const earth = new THREE.Group(); earth.position.set(0.95, 1.5, -0.35); g.add(earth);
    const map = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#2a64c8'; c.fillRect(0, 0, w, h); const r = rng(21); c.fillStyle = '#4fa04a';
      for (let i = 0; i < 16; i++) { c.beginPath(); c.ellipse(r() * w, h * (0.2 + r() * 0.6), 8 + r() * 22, 6 + r() * 14, r() * 3, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(0, 0, w, 9); c.fillRect(0, h - 10, w, 10);
    });
    mesh(ball(0.3, 24), std({ map, emissive: 0x0a1c40, roughness: 0.6 }), earth);
    return { group: g, update(t, on) { earth.rotation.y = t * (on ? 1.4 : 0.3); } };
  },

  strom() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const steel = std({ color: 0xb9c0c6, metalness: 0.65, roughness: 0.32 }); const dark = std({ color: 0x23272d, roughness: 0.5 });
    mesh(rbox(1.5, 1.2, 0.95, 0.06, 2), steel, fixed, [0, 0.6, -0.05]);
    mesh(new THREE.PlaneGeometry(1.26, 0.78), dark, fixed, [0, 0.49, 0.432]);
    mesh(rbox(1.46, 0.2, 0.06, 0.02, 2), dark, fixed, [0, 1.04, 0.44]);
    const panel = canvasTex(512, 88, (c, w, h) => { c.fillStyle = '#15181d'; c.fillRect(0, 0, w, h); c.fillStyle = '#ff4a3a'; c.font = '700 54px Consolas, monospace'; c.fillText('AUS', 34, 64); c.fillStyle = '#8b939c'; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(300 + i * 52, 44, 15, 0, TAU); c.fill(); } });
    mesh(new THREE.PlaneGeometry(1.2, 0.16), std({ map: panel, emissive: 0xffffff, emissiveMap: panel, emissiveIntensity: 0.6 }), fixed, [0, 1.04, 0.473]);
    const door = new THREE.Group(); door.position.set(0, 0.11, 0.45); door.rotation.x = 1.22; fixed.add(door);
    mesh(rbox(1.3, 0.62, 0.06, 0.025, 2), steel, door, [0, 0.31, 0]);
    mesh(rbox(0.7, 0.05, 0.05, 0.02, 2), dark, door, [0, 0.53, 0.06]);
    const plate = std({ color: 0xf2f2ea, roughness: 0.2 });
    for (let i = 0; i < 6; i++) mesh(cyl(0.2, 0.2, 0.035, 20).rotateZ(Math.PI / 2), plate, fixed, [-0.5 + i * 0.17, 0.4, 0.46], [0, 0, i % 2 ? 0.12 : 0.18]);
    tube([[0.75, 0.2, -0.1], [1.0, 0.03, 0.1], [1.05, 0.03, 0.55], [0.8, 0.03, 0.8], [0.86, 0.06, 0.98]], 0.035, dark, fixed, 30, 6);
    mesh(rbox(0.16, 0.13, 0.17, 0.04, 2), dark, fixed, [0.87, 0.07, 1.04]);
    for (const x of [-0.035, 0.035]) mesh(cyl(0.015, 0.015, 0.12, 8).rotateX(Math.PI / 2), steel, fixed, [0.87 + x, 0.09, 1.16]);
    const F = createBuddy(fixed, { shirt: 0xf2ede2, cap: 0x17171a, hair: 0x1a1410, skin: 0xd8a47e, pants: 0x39445c, shoe: 0xe8e4dc, print: 'BRUNO', capText: 'B', chain: true });
    F.place(-0.02, 1.2, 0.08, 0.1); const P = F.rest();
    P.hip.set(0, 0.15, 0); P.lean = 0.06; P.head.set(0.02, 0.08, -0.12);
    P.foot.L.set(0.17, -0.25, 0.48); P.foot.R.set(-0.16, -0.21, 0.5);
    for (const [k, s] of [['L', 1], ['R', -1]]) { P.knee[k].set(s * 0.2, 0.7, 0.8); P.toe[k] = 0.35; }
    P.hand.L.set(0.33, 0.22, 0.3); P.hand.R.set(-0.62, 0.83, 0.24); P.pole.R.set(-0.4, -0.8, -0.3);
    F.face('grin', 0.22, 0.2, 0.9); F.look(0, 0); F.apply(0.5);
    const mug = std({ color: 0xc5281f, roughness: 0.25 });
    mesh(cyl(0.075, 0.065, 0.17, 16), mug, F.root, [-0.62, 0.93, 0.29]);
    still(fixed);
    const bolt = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, drawBolt), transparent: true, depthWrite: false })); bolt.position.set(0.83, 1.72, 0.2); bolt.scale.setScalar(0.5); g.add(bolt);
    const spark = glowSprite(g, 0xffd21a, 0.5, [0.87, 0.14, 1.2], 0.4);
    return { group: g, update(t, on) { const k = 0.5 + 0.5 * Math.sin(t * 2.1); bolt.material.opacity = on ? 1 : 0.45 + k * 0.4; bolt.material.rotation = Math.sin(t * 1.3) * 0.15; spark.material.opacity = on ? 0.85 : 0.2 + k * 0.2; } };
  },

  ozean() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const water = std({ color: 0x1c8fd8, emissive: 0x06355c, transparent: true, opacity: 0.17, depthWrite: false, roughness: 0.1 });
    const glass = std({ color: 0xcdefff, transparent: true, opacity: 0.1, depthWrite: false, roughness: 0.04, metalness: 0.2 });
    const sand = std({ color: 0xe2c48a, roughness: 1 }); const dark = std({ color: 0x15171c, roughness: 0.3 });
    mesh(cyl(1.02, 1.04, 0.09, 36), std({ color: 0x8a5a36, roughness: 0.6 }), fixed, [0, 0.045, 0]);
    mesh(cyl(0.95, 0.97, 0.16, 32), sand, fixed, [0, 0.17, 0]);
    mesh(rbox(0.2, 0.36, 0.04, 0.02, 2), dark, fixed, [0.36, 0.33, 0.6], [-0.5, 0.2, 0.35]);
    mesh(new THREE.PlaneGeometry(0.15, 0.29), glowMat(0x7fe0ff, 0.9), fixed, [0.36, 0.341, 0.623], [-0.5, 0.2, 0.35]);
    const weed = std({ color: 0x2f9a5a, roughness: 0.9 });
    for (let i = 0; i < 4; i++) tube([[-0.55 + i * 0.1, 0.2, -0.3], [-0.6 + i * 0.12, 0.45, -0.34], [-0.52 + i * 0.1, 0.7 + i * 0.07, -0.3]], 0.03, weed, fixed, 14, 5);
    mesh(new THREE.TorusGeometry(1.0, 0.04, 8, 40).rotateX(Math.PI / 2), std({ color: 0xbfe4f2, metalness: 0.4, roughness: 0.15 }), fixed, [0, 1.8, 0]);
    const swim = new THREE.Group(); swim.position.set(0, 0.98, 0); g.add(swim);
    const W = ozeanModel('Wal'); const size = W.box.getSize(V3()); const mid = W.box.getCenter(V3());
    const whale = new THREE.Group(); swim.add(whale); whale.add(W.group); W.group.position.sub(mid);
    whale.scale.setScalar(1.98 / Math.max(size.x, size.z)); whale.rotation.set(0.05, -0.62, 0.08);
    still(whale);
    const w = mesh(cyl(0.955, 0.955, 1.34, 36), water, g, [0, 0.9, 0]); w.renderOrder = 2; w.receiveShadow = false;
    const jar = mesh(cyl(1.0, 1.0, 1.72, 40, true), glass, g, [0, 0.94, 0]); jar.renderOrder = 3; jar.receiveShadow = false;
    const air = std({ color: 0xe8fbff, emissive: 0x2a5a78 }); const bubbles = [];
    for (let i = 0; i < 5; i++) bubbles.push(mesh(ball(0.03 + i * 0.006, 8), air, g));
    still(fixed);
    return {
      group: g,
      update(t, on) {
        swim.position.y = 0.98 + Math.sin(t * 1.1) * 0.05; swim.rotation.y = Math.sin(t * (on ? 1.6 : 0.5)) * 0.2;
        bubbles.forEach((b, i) => { const k = (t * 0.2 + i * 0.21) % 1; b.position.set(0.5 + Math.sin(t + i) * 0.05, 0.3 + k * 1.2, 0.3); b.scale.setScalar(Math.min(1, (1 - k) * 5)); });
      },
    };
  },

  casino() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const red = std({ color: 0xa5122e, roughness: 0.28, metalness: 0.2 }); const gold = std({ color: 0xe8b84e, metalness: 0.85, roughness: 0.25 }); const dark = std({ color: 0x17121a, roughness: 0.4 });
    mesh(rbox(1.3, 1.5, 0.8, 0.12, 3), red, fixed, [0, 0.79, 0]);
    mesh(rbox(1.46, 0.14, 0.94, 0.05, 2), gold, fixed, [0, 0.07, 0.02]);
    mesh(rbox(1.12, 0.6, 0.08, 0.03, 2), gold, fixed, [0, 0.95, 0.4]);
    const seven = canvasTex(192, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b9b4aa'); gr.addColorStop(0.5, '#fffdf4'); gr.addColorStop(1, '#b9b4aa'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#d8202c'; c.strokeStyle = '#7a0a12'; c.lineWidth = 6; c.font = 'italic 900 190px Georgia, serif'; c.textAlign = 'center'; c.fillText('7', w / 2, 178); c.strokeText('7', w / 2, 178);
    });
    const reel = std({ map: seven, emissive: 0xffffff, emissiveMap: seven, emissiveIntensity: 0.28 });
    for (let i = 0; i < 3; i++) mesh(new THREE.PlaneGeometry(0.31, 0.45), reel, fixed, [(i - 1) * 0.34, 0.95, 0.445]);
    mesh(rbox(0.8, 0.17, 0.3, 0.05, 2), dark, fixed, [0, 0.38, 0.45]);
    const head = canvasTex(512, 220, (c, w, h) => {
      c.beginPath(); c.moveTo(4, h); c.lineTo(4, 120); c.quadraticCurveTo(w / 2, -86, w - 4, 120); c.lineTo(w - 4, h); c.closePath();
      c.fillStyle = '#3a0714'; c.fill(); c.lineWidth = 14; c.strokeStyle = '#e8b84e'; c.stroke();
      c.fillStyle = '#ffe08a'; c.shadowColor = '#ffb030'; c.shadowBlur = 22; c.textAlign = 'center'; c.font = 'italic 700 118px Georgia, serif'; c.fillText("Teo's", w / 2, 170);
    });
    mesh(new THREE.PlaneGeometry(1.32, 0.57), std({ map: head, alphaTest: 0.4, emissive: 0xffffff, emissiveMap: head, emissiveIntensity: 0.8 }), fixed, [0, 1.8, 0.3]);
    mesh(cyl(0.035, 0.035, 0.62, 10), gold, fixed, [0.8, 1.1, 0.1], [0, 0, -0.16]);
    mesh(ball(0.1), red, fixed, [0.86, 1.44, 0.1]);
    [0xc21f45, 0x1c62c8, 0x17181c, 0x1f9a4c].forEach((c, i) => {
      const m = std({ color: c, roughness: 0.4 }); const white = std({ color: 0xf4efe2, roughness: 0.4 }); const x = -0.88 + i * 0.1; const z = 0.5 + (i % 2) * 0.28 + i * 0.05;
      for (let j = 0; j < 3 + i; j++) mesh(cyl(0.14, 0.14, 0.04, 16), j % 2 ? white : m, fixed, [x + (j % 2) * 0.012, 0.02 + j * 0.042, z]);
    });
    for (let i = 0; i < 9; i++) mesh(cyl(0.07, 0.07, 0.02, 12), gold, fixed, [-0.22 + (i % 5) * 0.11, 0.48, 0.48 + (i % 3) * 0.04], [0.3, 0, 0.2]);
    still(fixed);
    const lamps = [glowMat(0xffe08a, 1.4), glowMat(0xffe08a, 1.4)];
    const row = new THREE.Group(); g.add(row);
    for (let i = 0; i < 7; i++) { mesh(ball(0.05, 10), lamps[i % 2], row, [-0.61, 0.5 + i * 0.16, 0.41]); mesh(ball(0.05, 10), lamps[i % 2], row, [0.61, 0.5 + i * 0.16, 0.41]); }
    bake(row);
    return { group: g, update(t, on) { const k = 0.5 + 0.5 * Math.sin(t * (on ? 4.5 : 1.6)); lamps[0].color.setHex(0xffd880).multiplyScalar(0.6 + k); lamps[1].color.setHex(0xffd880).multiplyScalar(1.6 - k); } };
  },

  // ---------------- die zehn kleinen ----------------
  race() {
    const g = new THREE.Group();
    const road = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#34363c'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#d8342c' : '#f0eee8'; c.fillRect(i * w / 16, 0, w / 16, 12); c.fillRect(i * w / 16, h - 12, w / 16, 12); }
      c.fillStyle = '#f0eee8'; for (let i = 0; i < 5; i++) c.fillRect(i * 54 + 8, h / 2 - 3, 26, 6);
    });
    mesh(rbox(6, 0.2, 3.6, 0.1, 2), std({ color: 0x3f7a3a, roughness: 0.9 }), g, [0, -0.1, 0]);
    mesh(new THREE.PlaneGeometry(5.8, 2.9), std({ map: road, roughness: 0.8 }), g, [0, 0.005, 0], [-Math.PI / 2, 0, 0]);
    const car = buildCar({ paint: 0xe0261c, trim: 0xf4efe2, number: 7, name: 'THEO', short: true }).group;
    const plain = new Map(); // eigene Schatten-Shader der Rennstrecke braucht das Spielzeug nicht
    car.traverse((o) => {
      if (!o.isMesh || Array.isArray(o.material) || o.material.transparent) return;
      const m = o.material;
      if (m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile) return;
      if (!plain.has(m)) plain.set(m, std({ color: m.color ? m.color.clone() : 0x888888, roughness: m.roughness === undefined ? 0.5 : m.roughness, metalness: Math.min(0.6, m.metalness || 0), map: m.map || null }));
      o.material = plain.get(m);
    });
    car.position.set(-0.2, 0, 0.2); car.rotation.y = 1.15; g.add(car);
    const check = canvasTex(160, 112, (c, w, h) => { for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i + j) % 2 ? '#17181b' : '#f4f2ea'; c.fillRect(i * w / 5, j * h / 4, w / 5, h / 4); } });
    mesh(cyl(0.06, 0.06, 3.2, 8), std({ color: 0xd8d8d8, metalness: 0.7, roughness: 0.3 }), g, [1.9, 1.6, -1.4]);
    mesh(new THREE.PlaneGeometry(1.5, 1.0), std({ map: check, side: THREE.DoubleSide }), g, [2.66, 2.65, -1.4], [0, 0.16, 0]);
    still(g); return { group: g };
  },

  park() {
    const g = new THREE.Group();
    const lot = canvasTex(256, 192, (c, w, h) => {
      c.fillStyle = '#3a3d44'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0eee8';
      for (let i = 0; i < 4; i++) c.fillRect(22 + i * 69, 12, 6, 104);
      c.fillRect(22, 12, 213, 6); c.fillStyle = '#58c890'; c.fillRect(102, 26, 54, 76);
    });
    mesh(rbox(3.7, 0.16, 2.8, 0.07, 2), std({ color: 0x8c9098, roughness: 0.9 }), g, [0, -0.08, 0]);
    mesh(new THREE.PlaneGeometry(3.6, 2.7), std({ map: lot, roughness: 0.85 }), g, [0, 0.005, 0], [-Math.PI / 2, 0, 0]);
    const glass = std({ color: 0x15202c, roughness: 0.1, metalness: 0.4 }); const tire = std({ color: 0x15161a, roughness: 0.9 }); const lamp = glowMat(0xfff2c0, 1);
    const toy = (color, x, z, yaw) => {
      const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = yaw; g.add(c); const m = std({ color, roughness: 0.3, metalness: 0.25 });
      mesh(rbox(0.72, 0.34, 1.3, 0.11, 3), m, c, [0, 0.3, 0]); mesh(rbox(0.64, 0.3, 0.7, 0.11, 3), m, c, [0, 0.56, -0.06]);
      mesh(rbox(0.66, 0.18, 0.56, 0.05, 2), glass, c, [0, 0.58, -0.06]); mesh(rbox(0.5, 0.18, 0.72, 0.05, 2), glass, c, [0, 0.57, -0.06]);
      for (const s of [-1, 1]) { for (const zz of [-0.4, 0.4]) mesh(cyl(0.15, 0.15, 0.12, 16).rotateZ(Math.PI / 2), tire, c, [s * 0.34, 0.15, zz]); mesh(ball(0.07, 8), lamp, c, [s * 0.22, 0.34, 0.64], null, [1, 0.7, 0.4]); }
    };
    toy(0x2a6ad8, -1.03, -0.55, 0); toy(0xf2c230, 1.04, -0.55, 0); toy(0xe8453a, 0.2, 0.6, 0.75);
    const cone = std({ color: 0xff7a1a, roughness: 0.6 });
    for (const x of [-1.5, -1.2]) mesh(cyl(0.03, 0.12, 0.32, 12), cone, g, [x, 0.16, 1.0]);
    still(g); return { group: g };
  },

  chess() {
    const g = new THREE.Group(); const top = new THREE.Group(); top.rotation.x = 0.3; g.add(top);
    const board = canvasTex(384, 384, (c, w) => {
      const R = w / 2; const V = [...Array(6)].map((_, i) => [R + R * Math.cos(i * TAU / 6), R - R * Math.sin(i * TAU / 6)]);
      const M = V.map((v, i) => [(v[0] + V[(i + 1) % 6][0]) / 2, (v[1] + V[(i + 1) % 6][1]) / 2]);
      for (let i = 0; i < 6; i++) {
        const A = V[i]; const B = M[i]; const C = [R, R]; const D = M[(i + 5) % 6];
        const at = (u, v) => [0, 1].map((k) => (A[k] * (1 - u) + B[k] * u) * (1 - v) + (D[k] * (1 - u) + C[k] * u) * v);
        for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) {
          c.beginPath(); [[a, b], [a + 1, b], [a + 1, b + 1], [a, b + 1]].forEach(([p, q], n) => { const [x, y] = at(p / 4, q / 4); c[n ? 'lineTo' : 'moveTo'](x, y); });
          c.closePath(); c.fillStyle = (a + b + i) % 2 ? '#6b3d24' : '#eed9b0'; c.fill();
        }
      }
    });
    mesh(new THREE.CylinderGeometry(1.62, 1.68, 0.2, 6, 1, false, Math.PI / 2, TAU), std({ color: 0x2e1c14, roughness: 0.4 }), top, [0, 0.1, 0]);
    mesh(new THREE.CircleGeometry(1.5, 6), std({ map: board, roughness: 0.45 }), top, [0, 0.204, 0], [-Math.PI / 2, 0, 0]);
    [0xd83a30, 0xf2eee2, 0x202228].forEach((color, i) => {
      const m = std({ color, roughness: 0.3 }); const a = i * TAU / 3 + 0.3; const x = Math.sin(a) * 0.85; const z = Math.cos(a) * 0.75;
      mesh(lathe([[0.001, 0], [0.22, 0], [0.23, 0.07], [0.13, 0.16], [0.09, 0.6], [0.19, 0.7], [0.12, 0.8], [0.14, 0.86], [0.001, 0.92]]), m, top, [x, 0.21, z]);
      mesh(rbox(0.07, 0.3, 0.07, 0.015, 1), m, top, [x, 1.22, z]); mesh(rbox(0.22, 0.07, 0.07, 0.015, 1), m, top, [x, 1.25, z]);
      pawn(top, m, Math.sin(a + 1.0) * 0.75, 0.21, Math.cos(a + 1.0) * 0.7, 0.9);
    });
    still(g); return { group: g };
  },

  pong() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const body = std({ color: 0x3a2a6a, roughness: 0.35 }); const black = std({ color: 0x070a18, roughness: 0.15 });
    mesh(rbox(2.2, 2.2, 0.3, 0.14, 3), body, fixed, [0, 1.2, 0]);
    mesh(new THREE.PlaneGeometry(1.86, 1.86), black, fixed, [0, 1.2, 0.153]);
    mesh(rbox(1.5, 0.14, 0.9, 0.06, 2), body, fixed, [0, 0.07, 0]);
    still(fixed);
    const bars = [[0xff4d4f, 0, -1], [0x3d9bff, -1, 0], [0xffd02e, 0, 1], [0xcfd6dc, 1, 0]].map(([c, x, y]) => ({ x, y, m: mesh(new THREE.BoxGeometry(x ? 0.09 : 0.55, y ? 0.09 : 0.55, 0.04), glowMat(c, 1.3), g, [x * 0.82, 1.2 + y * 0.82, 0.18]) }));
    const b = mesh(ball(0.075, 12), glowMat(0xffffff, 1.6), g, [0, 1.2, 0.2]);
    const tri = (v) => Math.abs((((v % 2) + 2) % 2) - 1) * 2 - 1;
    return {
      group: g,
      update(t, on) {
        const k = t * (on ? 1.5 : 0.6); const x = tri(k * 0.83) * 0.7; const y = tri(k * 0.61 + 0.4) * 0.7;
        b.position.set(x, 1.2 + y, 0.2);
        for (const P of bars) { if (P.x) P.m.position.y = 1.2 + clamp(y, -0.5, 0.5); else P.m.position.x = clamp(x, -0.5, 0.5); }
      },
    };
  },

  ships() {
    const g = new THREE.Group();
    const sea = new THREE.PlaneGeometry(3.4, 1.9, 22, 10).rotateX(-Math.PI / 2); const p = sea.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, Math.sin(p.getX(i) * 5 + p.getZ(i) * 2) * 0.06);
    sea.computeVertexNormals();
    mesh(sea, std({ color: 0x1c78c8, roughness: 0.2, metalness: 0.2 }), g, [0, 0.15, 0]);
    mesh(rbox(3.44, 0.14, 1.94, 0.05, 2), std({ color: 0x0c3466, roughness: 0.5 }), g, [0, 0.02, 0]);
    const shape = new THREE.Shape([[-1.25, -0.32], [0.65, -0.35], [1.4, 0], [0.65, 0.35], [-1.25, 0.32]].map(([x, y]) => new THREE.Vector2(x, y)));
    const hull = (h) => new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false }).rotateX(-Math.PI / 2);
    const grey = std({ color: 0xaeb8c0, roughness: 0.4, metalness: 0.3 }); const dark = std({ color: 0x4a545e, roughness: 0.5 }); const red = std({ color: 0xc8342c, roughness: 0.5 });
    const boat = new THREE.Group(); boat.position.set(0, 0.16, 0.05); boat.rotation.y = -0.22; g.add(boat);
    mesh(hull(0.16), red, boat); mesh(hull(0.3), grey, boat, [0, 0.16, 0]);
    mesh(rbox(0.7, 0.36, 0.42, 0.05, 2), grey, boat, [-0.25, 0.62, 0]); mesh(rbox(0.4, 0.28, 0.3, 0.04, 2), grey, boat, [-0.3, 0.93, 0]);
    mesh(rbox(0.3, 0.07, 0.31, 0.02, 1), dark, boat, [-0.25, 0.95, 0]); mesh(cyl(0.03, 0.03, 0.55, 8), dark, boat, [-0.36, 1.3, 0]);
    for (const x of [0.48, 0.9]) {
      mesh(cyl(0.16, 0.19, 0.16, 14), dark, boat, [x, 0.53, 0]);
      for (const z of [-0.06, 0.06]) mesh(cyl(0.028, 0.028, 0.5, 8).rotateZ(Math.PI / 2 - 0.22), grey, boat, [x + 0.26, 0.64, z]);
    }
    const white = std({ color: 0xf4f4f0 });
    for (const [x, z, hit] of [[-1.4, 0.65, 1], [-1.0, 0.75, 0], [1.1, 0.72, 1], [1.4, 0.5, 0]]) mesh(cyl(0.07, 0.05, 0.22, 10), hit ? red : white, g, [x, 0.3, z]);
    still(g); return { group: g };
  },

  raus() {
    const g = new THREE.Group(); const top = new THREE.Group(); top.rotation.x = 0.32; g.add(top);
    const board = canvasTex(320, 320, (c, w) => {
      c.fillStyle = '#f0d49a'; c.fillRect(0, 0, w, w); const n = 11; const s = w / n;
      const dot = (i, j, col) => { c.fillStyle = col; c.beginPath(); c.arc((i + 0.5) * s, (j + 0.5) * s, s * 0.4, 0, TAU); c.fill(); };
      for (let i = 0; i < n; i++) for (const j of [4, 6]) { dot(i, j, '#fffaf0'); dot(j, i, '#fffaf0'); }
      dot(0, 5, '#fffaf0'); dot(10, 5, '#fffaf0'); dot(5, 0, '#fffaf0'); dot(5, 10, '#fffaf0');
      [['#d3262e', 1, 1], ['#2462d6', 8, 1], ['#f2b90f', 8, 8]].forEach(([col, x, y]) => { for (const a of [0, 1.1]) for (const b of [0, 1.1]) dot(x + a, y + b, col); });
      for (let i = 1; i < 5; i++) { dot(5, i, '#d3262e'); dot(i, 5, '#2462d6'); dot(10 - i, 5, '#f2b90f'); }
    });
    mesh(rbox(2.7, 0.14, 2.7, 0.05, 2), std({ color: 0x6b3d24, roughness: 0.6 }), top, [0, 0.07, 0]);
    mesh(new THREE.PlaneGeometry(2.55, 2.55), std({ map: board, roughness: 0.7 }), top, [0, 0.145, 0], [-Math.PI / 2, 0, 0]);
    const M = [0xd3262e, 0x2462d6, 0xf2b90f].map((c) => std({ color: c, roughness: 0.28 }));
    pawn(top, M[0], -0.55, 0.15, -0.5, 1.3); pawn(top, M[1], 0.5, 0.15, -0.2, 1.3); pawn(top, M[2], -0.2, 0.35, 0.65, 1.3, true); pawn(top, M[0], 0.15, 0.15, -0.8, 1.1);
    die(top, 0.46, [0.8, 0.39, 0.7], [0, 0.5, 0]);
    still(g); return { group: g };
  },

  baron() {
    const g = new THREE.Group(); const top = new THREE.Group(); top.rotation.x = 0.3; g.add(top);
    const board = canvasTex(320, 320, (c, w) => {
      c.fillStyle = '#183f50'; c.fillRect(0, 0, w, w); const n = 8; const s = w / n; const P = ['#ff8a5c', '#ffd25c', '#58d0b0', '#8f7aff'];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if (i && j && i < n - 1 && j < n - 1) continue;
        c.fillStyle = '#efe6cf'; c.fillRect(i * s + 1.5, j * s + 1.5, s - 3, s - 3);
        c.fillStyle = P[(i * 2 + j * 3) % 4]; c.fillRect(i * s + 1.5, j * s + 1.5, s - 3, 10);
      }
    });
    mesh(rbox(2.8, 0.12, 2.8, 0.04, 2), std({ color: 0x10242c, roughness: 0.5 }), top, [0, 0.06, 0]);
    mesh(new THREE.PlaneGeometry(2.7, 2.7), std({ map: board, roughness: 0.6 }), top, [0, 0.125, 0], [-Math.PI / 2, 0, 0]);
    const roof = std({ color: 0x3a2a30, roughness: 0.7 }); const win = glowMat(0xffd98a, 0.9);
    [[-0.95, -0.9, 0.55, 0x58d0b0], [-0.35, -0.95, 0.85, 0x8f7aff], [0.3, -0.9, 1.25, 0xff8a5c], [0.95, -0.35, 0.5, 0xffd25c]].forEach(([x, z, h, c]) => {
      mesh(rbox(0.44, h, 0.44, 0.03, 2), std({ color: c, roughness: 0.5 }), top, [x, 0.13 + h / 2, z]);
      mesh(cyl(0.001, 0.36, 0.28, 4).rotateY(Math.PI / 4), roof, top, [x, 0.27 + h, z]);
      for (let y = 0.4; y < h; y += 0.3) for (const dx of [-0.1, 0.1]) mesh(new THREE.BoxGeometry(0.1, 0.13, 0.01), win, top, [x + dx, 0.05 + y, z + 0.225]);
    });
    const coin = std({ color: 0xe8b84e, metalness: 0.85, roughness: 0.25 });
    [[-0.6, 0.5, 6], [-0.2, 0.72, 4], [-0.85, 0.85, 3]].forEach(([x, z, n]) => { for (let i = 0; i < n; i++) mesh(cyl(0.18, 0.18, 0.05, 18), coin, top, [x + (i % 2) * 0.02, 0.16 + i * 0.056, z]); });
    die(top, 0.4, [0.65, 0.35, 0.65], [0, -0.4, 0]);
    still(g); return { group: g };
  },

  kraft() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const stone = std({ color: 0x8c8378, roughness: 0.95 }); const wood = std({ color: 0xd2a86e, roughness: 0.7 }); const iron = std({ color: 0x59616a, metalness: 0.7, roughness: 0.3 });
    for (const s of [-1, 1]) {
      mesh(rbox(0.4, 0.7, 0.75, 0.05, 2), stone, fixed, [s * 0.78, 0.35, 0]);
      mesh(rbox(0.96, 0.14, 0.7, 0.03, 2), wood, fixed, [s * 0.46, 0.63, 0], [0, 0, s * 0.35]);
    }
    const r = rng(6);
    for (let i = 0; i < 10; i++) mesh(rbox(0.22, 0.04, 0.05, 0.01, 1), wood, fixed, [(r() - 0.5) * 1.1, 0.08 + r() * 0.5, 0.2 + r() * 0.4], [r() * 2, r() * 2, r() * 2]);
    still(fixed);
    const hammer = new THREE.Group(); hammer.position.set(0.1, 1.2, 0.1); g.add(hammer);
    const h = new THREE.Group(); hammer.add(h);
    mesh(rbox(0.95, 0.46, 0.48, 0.1, 2), iron, h); mesh(cyl(0.085, 0.07, 1.2, 12), wood, h, [0.1, 0.7, -0.1], [0, 0, -0.25]);
    bake(h);
    const ring = mesh(new THREE.TorusGeometry(0.62, 0.06, 8, 36).rotateX(Math.PI / 2 - 0.95), glowMat(0x3df28a, 1.3), g, [0, 0.82, 0.22]); ring.castShadow = false;
    return { group: g, update(t, on) { const k = Math.abs(Math.sin(t * (on ? 3 : 1.1))); hammer.position.y = 1.2 + k * 0.22; hammer.rotation.z = k * 0.16; ring.scale.setScalar(1.12 - k * 0.22); } };
  },

  saege() {
    const g = new THREE.Group(); const f = new THREE.Group(); f.rotation.x = -0.14; f.position.y = 0.02; g.add(f);
    const gilt = std({ color: 0xb88438, metalness: 0.7, roughness: 0.32 });
    mesh(rbox(2.1, 2.1, 0.12, 0.04, 2), gilt, f, [0, 1.05, 0]);
    for (const [w, h, x, y] of [[2.14, 0.17, 0, 2.02], [2.14, 0.17, 0, 0.09], [0.17, 2.1, -0.985, 1.05], [0.17, 2.1, 0.985, 1.05]]) mesh(rbox(w, h, 0.22, 0.07, 2), gilt, f, [x, y, 0.06]);
    const photo = new THREE.TextureLoader().load('art/hund.jpg'); photo.colorSpace = THREE.SRGBColorSpace; photo.anisotropy = 8;
    const pic = mesh(new THREE.PlaneGeometry(1.8, 1.8), std({ map: photo, roughness: 0.35, emissive: 0xffffff, emissiveMap: photo, emissiveIntensity: 0.2 }), f, [0, 1.05, 0.068]);
    pic.userData.keep = true; pic.userData.noGold = true; pic.castShadow = false;
    mesh(rbox(0.3, 1.3, 0.07, 0.02, 1), std({ color: 0x2a2018 }), g, [0, 0.62, -0.42], [0.38, 0, 0]);
    still(g); return { group: g };
  },

  rv() {
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed); fixed.rotation.y = -0.18;
    const card = std({ color: 0xc0905c, roughness: 0.85 }); const inner = std({ color: 0x3a281a, roughness: 0.9 });
    mesh(rbox(2, 1.35, 1.5, 0.04, 2), card, fixed, [0, 0.675, 0]);
    mesh(new THREE.PlaneGeometry(1.9, 1.4), inner, fixed, [0, 1.355, 0], [-Math.PI / 2, 0, 0]);
    for (const s of [-1, 1]) mesh(rbox(0.75, 0.04, 1.48, 0.015, 1), card, fixed, [s * 1.28, 1.56, 0], [0, 0, s * 0.62]);
    const q = canvasTex(256, 256, (c, w) => { c.fillStyle = '#2b1a10'; c.textAlign = 'center'; c.font = "900 220px 'Segoe UI Black', sans-serif"; c.fillText('?', w / 2, 206); });
    mesh(new THREE.PlaneGeometry(1.05, 1.05), std({ map: q, alphaTest: 0.4, roughness: 0.9 }), fixed, [0, 0.67, 0.755]);
    still(fixed);
    const out = canvasTex(256, 256, (c, w) => { c.fillStyle = '#ffd0e6'; c.shadowColor = '#ff4f9a'; c.shadowBlur = 24; c.textAlign = 'center'; c.font = "900 190px 'Segoe UI Black', sans-serif"; c.fillText('?', w / 2, 196); });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: out, transparent: true, depthWrite: false })); s.position.set(0, 1.7, 0); s.scale.setScalar(0.8); g.add(s);
    return { group: g, update(t, on) { s.position.y = 1.68 + Math.sin(t * (on ? 5 : 1.5)) * 0.1; s.material.rotation = Math.sin(t) * 0.1; } };
  },

  // ---------------- Schulmodus (2026-11-23) ----------------
  stapel() { // Turm aus bunten Platten, die oberste gleitet hin und her
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const col = (i) => new THREE.Color().setHSL((0.48 + i * 0.045) % 1, 0.62, 0.56).getHex();
    let w = 1.6; let d = 1.6; let x = 0; let z = 0;
    const off = [[0, 0], [0.12, 0], [0, -0.1], [-0.08, 0], [0, 0.07], [0.05, 0], [0, -0.04]];
    off.forEach(([dx, dz], i) => {
      w -= Math.abs(dx); d -= Math.abs(dz); x += dx / 2; z += dz / 2;
      mesh(rbox(w, 0.26, d, 0.025, 2), std({ color: col(i), roughness: 0.45 }), fixed, [x, 0.13 + i * 0.26, z]);
    });
    mesh(rbox(1.9, 0.08, 1.9, 0.03, 2), std({ color: 0x23283a, roughness: 0.6 }), fixed, [0, -0.04, 0]);
    still(fixed);
    const top = mesh(rbox(w, 0.26, d, 0.025, 2), std({ color: col(off.length), roughness: 0.4, emissive: col(off.length), emissiveIntensity: 0.15 }), g, [x, 0.13 + off.length * 0.26, z]);
    const shine = glowSprite(g, 0x9ffff2, 1.3, [x, 0.13 + off.length * 0.26, z + 0.6], 0.0);
    const x0 = x;
    return {
      group: g,
      update(t, on) {
        top.position.x = x0 + Math.sin(t * (on ? 3.2 : 1.1)) * (on ? 0.9 : 0.45);
        shine.position.x = top.position.x; shine.material.opacity = on ? 0.25 + 0.2 * Math.sin(t * 6) : 0;
      },
    };
  },
  dino() { // ein grüner Dino mit Schulranzen, mitten im Lauf
    const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
    const green = std({ color: 0x5fbf4a, roughness: 0.55 }); const belly = std({ color: 0xd8f0a0, roughness: 0.6 }); const spot = std({ color: 0x3e8f34, roughness: 0.6 });
    const red = std({ color: 0xd8342c, roughness: 0.55 }); const strap = std({ color: 0x2a2f3a, roughness: 0.7 }); const white = std({ color: 0xffffff, roughness: 0.3 }); const black = std({ color: 0x15151a, roughness: 0.2 });
    mesh(ball(1, 22), green, body, [0, 1.05, 0], [0, 0, -0.25], [0.62, 0.5, 0.42]);
    mesh(ball(1, 18), belly, body, [0.18, 0.95, 0], [0, 0, -0.25], [0.42, 0.36, 0.36]);
    mesh(ball(1, 20), green, body, [0.62, 1.62, 0], [0, 0, 0.15], [0.42, 0.3, 0.3]); // Kopf
    mesh(ball(1, 16), green, body, [0.88, 1.52, 0], null, [0.28, 0.18, 0.24]); // Schnauze
    for (const s of [-1, 1]) {
      mesh(ball(0.085, 12), white, body, [0.74, 1.74, s * 0.17]); mesh(ball(0.045, 10), black, body, [0.79, 1.75, s * 0.2]);
      mesh(ball(1, 10), green, body, [0.32, 0.86, s * 0.26], [0.2 * s, 0, -0.6], [0.09, 0.22, 0.09]); // Ärmchen
    }
    mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 16, Math.PI), black, body, [0.95, 1.44, 0], [0, 0, Math.PI + 0.25]); // Grinsen
    for (let i = 0; i < 5; i++) mesh(new THREE.ConeGeometry(0.07, 0.17, 4), spot, body, [-0.12 - i * 0.14, 1.47 - i * 0.07 + (i === 0 ? 0.05 : 0), 0], [0, 0, 0.55 + i * 0.12]); // Zacken
    tube([[-0.42, 1.0, 0], [-0.8, 0.86, 0], [-1.12, 0.62, 0], [-1.3, 0.5, 0]], 0.13, green, body, 24, 10); // Schwanz
    for (const [x, y, s] of [[-0.12, 1.2, 0.07], [0.02, 0.84, 0.06], [-0.3, 0.9, 0.05]]) mesh(ball(s, 8), spot, body, [x, y, 0.41]);
    // Schulranzen auf dem Rücken
    mesh(rbox(0.42, 0.5, 0.48, 0.07, 3), red, body, [-0.38, 1.22, 0], [0, 0, -0.3]);
    mesh(rbox(0.12, 0.3, 0.38, 0.04, 2), std({ color: 0xffd02e, roughness: 0.5 }), body, [-0.6, 1.1, 0], [0, 0, -0.3]);
    for (const s of [-1, 1]) mesh(rbox(0.06, 0.5, 0.04, 0.015, 1), strap, body, [-0.12, 1.2, s * 0.32], [0, 0, -0.3]);
    const legs = [-1, 1].map((s) => { const L = new THREE.Group(); L.position.set(0, 0.78, s * 0.2); body.add(L); mesh(rbox(0.2, 0.62, 0.2, 0.08, 2), green, L, [0, -0.3, 0]); mesh(rbox(0.32, 0.12, 0.24, 0.05, 2), green, L, [0.08, -0.6, 0]); return L; });
    const dust = mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }), g, [-0.6, 0.02, 0], [-Math.PI / 2, 0, 0], [0.35, 0.2, 1]);
    body.position.y = 0.18; body.rotation.y = -0.5;
    return {
      group: g,
      update(t, on) {
        const f = t * (on ? 13 : 4.5);
        legs[0].rotation.z = Math.sin(f) * (on ? 0.75 : 0.25); legs[1].rotation.z = -Math.sin(f) * (on ? 0.75 : 0.25);
        body.position.y = 0.18 + Math.abs(Math.sin(f)) * (on ? 0.09 : 0.02); body.rotation.z = Math.sin(f * 2) * 0.02;
        dust.material.opacity = on ? 0.18 + 0.12 * Math.sin(f) : 0;
      },
    };
  },
  rang() { // Treppchen, darauf Theo, Ludi und Bruno. ordne(reihe) stellt sie nach der Rangliste auf
    const g = new THREE.Group(); const fixed = new THREE.Group(); g.add(fixed);
    const stone = std({ color: 0xf3efe6, roughness: 0.45 }); const trim = std({ color: 0xffc34a, metalness: 0.7, roughness: 0.3 });
    const PLATZ = [{ x: 0, h: 0.62 }, { x: -1.05, h: 0.42 }, { x: 1.05, h: 0.28 }];
    PLATZ.forEach((P, i) => {
      mesh(rbox(1.0, P.h, 0.9, 0.04, 2), stone, fixed, [P.x, P.h / 2, 0]);
      mesh(rbox(1.02, 0.04, 0.92, 0.015, 1), trim, fixed, [P.x, P.h - 0.01, 0]);
      const n = canvasTex(128, 128, (c, w) => { c.fillStyle = ['#e0a92a', '#9aa4b2', '#b8743a'][i]; c.font = "900 104px 'Segoe UI Black', sans-serif"; c.textAlign = 'center'; c.fillText(String(i + 1), w / 2, 102); });
      mesh(new THREE.PlaneGeometry(0.34, 0.34), std({ map: n, alphaTest: 0.4, roughness: 0.6 }), fixed, [P.x, P.h * 0.5, 0.452]);
    });
    // Pokal hinter Platz 1
    const cup = std({ color: 0xffd060, metalness: 0.85, roughness: 0.22 });
    mesh(lathe([[0.001, 0], [0.16, 0], [0.16, 0.05], [0.05, 0.1], [0.04, 0.3], [0.2, 0.42], [0.24, 0.66], [0.001, 0.62]]), cup, fixed, [0, 0.62, -0.32]);
    still(fixed);
    const LOOK = {
      theo: { shirt: 0xf4f4f0, cap: 0x1c3f86, brim: 0x141a2a, hair: 0x6b4128, skin: 0xe8bc98, pants: 0x2a2f3a, print: 'THEO', capText: 'T' },
      ludi: { shirt: 0x3f6b4a, cap: 0x2b2b30, brim: 0x18181c, pants: 0x2c3138, skin: 0xeac3a0, hair: 0x5b3a22, capText: 'BOSS' },
      bruno: { shirt: 0xf2ede2, cap: 0x17171a, hair: 0x1a1410, skin: 0xd8a47e, pants: 0x39445c, shoe: 0xe8e4dc, print: 'BRUNO', capText: 'B', chain: true },
    };
    const figs = {}; for (const k of Object.keys(LOOK)) { figs[k] = createBuddy(g, LOOK[k]); figs[k].root.scale.setScalar(0.9); }
    let reihe = ['theo', 'ludi', 'bruno'];
    const pose = (t, on) => {
      reihe.forEach((k, i) => {
        const F = figs[k]; const P = PLATZ[i]; const p = F.rest(); F.place(P.x, P.h, 0.05, (i === 1 ? 0.25 : i === 2 ? -0.25 : 0));
        if (i === 0) { const jub = 0.5 + 0.5 * Math.sin(t * (on ? 7 : 2.5)); for (const [s, q] of [['L', 1], ['R', -1]]) p.hand[s].set(q * 0.42, 1.82 + jub * 0.1, 0.08); /* Arme hoch: Sieger */ F.face('grin', 0, 0.6); } else if (i === 1) { p.hand.R.set(-0.3, 1.05 + Math.sin(t * 3) * (on ? 0.1 : 0.03), 0.18); F.face('smile'); } else F.face(on ? 'o' : 'flat', -0.2);
        F.apply(t);
      });
    };
    pose(1.3, false);
    return {
      group: g,
      update(t, on) { pose(t, on); },
      ordne(neu) { if (Array.isArray(neu) && neu.length === 3) { reihe = neu.slice(); pose(1.3, false); } },
    };
  },
};
export const SACHEN = Object.keys(BAU);

// ---------------- Einpassen und vergolden ----------------
function measure(root) {
  root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(); const box = new THREE.Box3(); const b = new THREE.Box3();
  root.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    b.copy(o.geometry.boundingBox).applyMatrix4(inv.clone().multiply(o.matrixWorld)); box.union(b);
  });
  return box;
}
const GOLD = new Map();
function goldOf(m) { // dieselbe Form in Gold: hell bleibt hell, dunkel wird tiefes Gold, damit man das Gesicht noch erkennt
  if (m.transparent || m.isMeshBasicMaterial) return m;
  if (GOLD.has(m)) return GOLD.get(m);
  const c = m.color || new THREE.Color(0xffffff); const lum = m.vertexColors ? 0.2 : 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
  const color = m.map ? 0xffd470 : lum < 0.06 ? 0x6e4610 : lum < 0.32 ? 0xd29a30 : 0xffd874;
  const g = std({ color, map: m.map || null, alphaTest: m.alphaTest, side: m.side, metalness: m.map ? 0.5 : 0.8, roughness: 0.24, emissive: lum < 0.06 ? 0x100800 : 0x3a2204 });
  GOLD.set(m, g); return g;
}
export function buildSache(id, [w, h, d]) {
  const made = BAU[id](); const box = measure(made.group); const size = box.getSize(V3()); const mid = box.getCenter(V3());
  const s = Math.min(w / size.x, h / size.y, d / size.z);
  const inner = new THREE.Group(); inner.scale.setScalar(s); inner.position.set(-mid.x * s, -box.min.y * s, -mid.z * s); inner.add(made.group);
  const group = new THREE.Group(); group.add(inner);
  const stars = [];
  let isGold = false;
  function gold(on) {
    if (on === isGold) return;
    isGold = on;
    inner.traverse((o) => {
      if (!o.isMesh || o.userData.noGold || Array.isArray(o.material)) return;
      if (on) { o.userData.plain = o.material; o.material = goldOf(o.material); } else if (o.userData.plain) { o.material = o.userData.plain; delete o.userData.plain; }
    });
    if (on && !stars.length) for (const [x, y] of [[-0.46, 0.85], [0.44, 0.6], [0.22, 0.98]]) stars.push(glowSprite(group, 0xffe08a, h * 0.22, [x * size.x * s, y * size.y * s, size.z * s * 0.4], 0.8));
    for (const q of stars) q.visible = on;
  }
  function update(t, active, calm) {
    if (made.update) made.update(calm ? 1.3 : t, active);
    if (isGold) stars.forEach((q, i) => { q.material.opacity = calm ? 0.5 : 0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 2.1)); });
  }
  return { group, update, gold, height: size.y * s, ordne: made.ordne || null };
}
