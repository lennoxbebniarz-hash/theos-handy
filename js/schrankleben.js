// Theos Seitenscheidel - das Zimmer lebt (seit 2026-11-22): Freunde mit offener Lobby sitzen auf Theos Bett, Trophäenregal,
// Fenster mit echter Tageszeit samt Wecker, im Dezember Schnee und Lichterkette. schrank.js ruft buildLeben() nach buildZimmer().
import * as THREE from './vendor/three.module.min.js';
import { V3, TAU, clamp, lerp, smooth, rng, std, glowMat, mesh, rbox, tube, bake, canvasTex, glowSprite } from './titelkit.js';
import { createBuddy } from './titelfigur.js';
import { fitFont, tapeTex, MARKER } from './schrankzimmer.js';
import { LOOKS } from './stromart.js';
import { ERFOLGE } from './erfolge.js';

const BETT = { x: -2.56, w: 2.28, z: 0.53, d: 0.94, top: 0.45 };
export const SITZE = [-1.66, -2.07, -2.48]; // zuerst der Platz neben dem Schrank, der ist immer im Bild
const SITZ_Z = 0.83;
const FIGUR = 0.48;
const FENSTER = { x: -2.6, y: 1.78, w: 0.7, h: 0.92 };
const KURZ = {
  race: 'Rennen', park: 'Parken', moon: 'Moonsweeper', chess: 'Dreierschach', pong: 'Quadrat-Pong', ships: 'Schiffe versenken', raus: 'Raus mit dir!', baron: 'Besser als Monopoly',
  kraft: 'Kraftprobe', casino: "Teo's Casino", strom: 'Strom aus', ozean: 'Ozean', bruno: 'Big Bruno', ludwig: 'Ludwig Zigaretti', saege: 'das mit dem Hund',
};
const keep = (o) => { o.userData.keep = true; return o; };
function hitBox(parent, w, h, d, pos, id) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
  m.visible = false; m.userData.hit = id; m.position.set(pos[0], pos[1], pos[2]); parent.add(m); return m;
}

// ---------------- Bett und Besuch ----------------
function buildBett(root) {
  const fest = new THREE.Group(); root.add(fest);
  const wood = std({ color: 0x4a2c1e, roughness: 0.7 });
  const karo = canvasTex(256, 256, (c, w) => { for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { c.fillStyle = (i + j) % 2 ? '#2c3f78' : '#35498a'; c.fillRect(i * w / 6, j * w / 6, w / 6, w / 6); } }, { repeat: [2, 1] });
  mesh(rbox(BETT.w, 0.24, BETT.d, 0.03, 2), wood, fest, [BETT.x, 0.14, BETT.z]);
  mesh(rbox(BETT.w - 0.06, 0.22, BETT.d - 0.05, 0.08, 3), std({ map: karo, roughness: 1 }), fest, [BETT.x, BETT.top - 0.11, BETT.z]);
  mesh(rbox(0.46, 0.15, 0.6, 0.07, 3), std({ color: 0xd9d4cc, roughness: 1 }), fest, [BETT.x - 0.82, BETT.top + 0.05, BETT.z - 0.02], [0, 0.12, 0.1]);
  bake(fest);

  const seats = SITZE.map((x, i) => {
    const g = new THREE.Group(); g.visible = false; root.add(g);
    const body = new THREE.Group(); body.position.set(x, BETT.top, SITZ_Z); body.scale.setScalar(FIGUR); g.add(body);
    const tagM = std({ alphaTest: 0.4, roughness: 0.85, emissive: 0x4a3a20, map: tapeTex(' ', { w: 400, h: 170 }) });
    const tag = mesh(new THREE.PlaneGeometry(0.37, 0.15), tagM, g, [x, 0.113, 1.012], [0, 0, (i % 2 ? 1 : -1) * 0.015]); tag.castShadow = false;
    const glow = glowSprite(g, 0xff5c9e, 0.75, [x, 0.78, 0.6], 0.16);
    const hit = hitBox(g, 0.39, 0.98, 0.5, [x, 0.6, 0.82], `gast:${i}`);
    return { x, g, body, tagM, glow, hit, figuren: new Map(), F: null, info: null, text: '' };
  });

  function lookOf(name, belegt) {
    if (/^bruno$/i.test(name.trim())) return { key: 'bruno', look: { shirt: 0xf2ede2, cap: 0x17171a, hair: 0x1a1410, skin: 0xd8a47e, pants: 0x39445c, print: 'BRUNO', chain: true } };
    let n = 0; for (const ch of name.toLowerCase()) n = (n * 31 + ch.codePointAt(0)) >>> 0;
    let k = n % LOOKS.length; // gleicher Name, gleiche Farbe, aber nie zwei gleiche nebeneinander
    while (belegt.has(LOOKS[k].name) && belegt.size < LOOKS.length) k = (k + 1) % LOOKS.length;
    const L = LOOKS[k]; belegt.add(L.name);
    return { key: L.name, look: { ...L, shirt: new THREE.Color(L.col).getHex() } };
  }
  function schild(name, spiel) {
    return canvasTex(400, 170, (c, w, h) => {
      c.fillStyle = '#ead9a8'; c.fillRect(4, 4, w - 8, h - 8);
      c.fillStyle = '#2b2230'; c.textAlign = 'center';
      fitFont(c, name, w - 36, 70, MARKER); c.fillText(name, w / 2, 78);
      fitFont(c, spiel, w - 36, 44, MARKER); c.fillStyle = '#9a2458'; c.fillText(spiel, w / 2, 138);
    });
  }
  // list: offene Lobbys { mode, hostName, count, limit, inGame }
  function set(list) {
    const belegt = new Set();
    seats.forEach((S, i) => {
      const l = list[i] || null; S.info = l; S.g.visible = !!l;
      if (!l) { S.F = null; return; }
      const name = String(l.hostName || 'Host').slice(0, 16); const { key, look } = lookOf(name, belegt);
      if (!S.figuren.has(key)) { const F = createBuddy(S.body, look); F.root.rotation.y = 0.12; S.figuren.set(key, F); }
      for (const [k, F] of S.figuren) F.root.visible = k === key;
      S.F = S.figuren.get(key);
      const text = `${name}|${l.mode}`;
      if (text !== S.text) { S.text = text; if (S.tagM.map) S.tagM.map.dispose(); S.tagM.map = schild(name, KURZ[l.mode] || String(l.label || 'Lobby')); }
    });
  }
  function update(t, hover, calm) {
    const now = calm ? 1 : t;
    seats.forEach((S, i) => {
      if (!S.F) return;
      const F = S.F; const on = hover === `gast:${i}`; const p = F.rest();
      p.hip.set(0, 0.15, 0); p.lean = 0.05; p.head.set(0.02, 0.22 + Math.sin(now * 0.6 + i) * 0.1, on ? -0.14 : 0);
      for (const [k, s] of [['L', 1], ['R', -1]]) {
        const swing = Math.sin(now * 1.7 + i * 1.8 + (s > 0 ? 0 : Math.PI)) * 0.07;
        p.foot[k].set(s * 0.16, -0.24, 0.5 + swing); p.knee[k].set(s * 0.15, 0.8, 0.8); p.toe[k] = 0.3;
        p.hand[k].set(s * 0.3, 0.2, 0.3);
      }
      const wave = on || (!calm && (t + i * 2.7) % 9 < 1.3); // winkt ab und zu herüber
      if (wave) { p.hand.R.set(-0.55 + Math.sin(now * 10) * 0.1, 0.98, 0.16); p.pole.R.set(-0.6, -0.7, -0.2); }
      F.face(wave ? 'grin' : 'smile'); F.look(on ? 0 : 0.4, 0); F.apply(now);
      S.glow.material.opacity = on ? 0.38 : 0.16;
    });
  }
  return { seats, set, update };
}

// ---------------- Andenken (je aus einem Material, das die Stufe zeigt) ----------------
const cyl = (rt, rb, h, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);
const ball = (r, seg = 16) => new THREE.SphereGeometry(r, seg, Math.ceil(seg * 0.7));
const lathe = (pts) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 22);
const pokal = [[0.001, 0], [0.4, 0], [0.4, 0.08], [0.12, 0.17], [0.1, 0.45], [0.3, 0.55], [0.48, 0.8], [0.53, 1.2], [0.47, 1.2], [0.4, 0.85], [0.001, 0.62]];
const ANDENKEN = {
  race(g, m) {
    mesh(lathe(pokal), m, g);
    for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.22, 0.05, 7, 18), m, g, [s * 0.55, 0.96, 0], null, [0.8, 1.1, 1]);
  },
  park(g, m) {
    mesh(rbox(0.95, 0.3, 0.5, 0.09, 2), m, g, [0, 0.82, 0]); mesh(rbox(0.52, 0.28, 0.44, 0.09, 2), m, g, [-0.04, 1.07, 0]);
    for (const x of [-0.3, 0.3]) for (const z of [-0.25, 0.25]) mesh(cyl(0.13, 0.13, 0.08).rotateX(Math.PI / 2), m, g, [x, 0.68, z]);
    mesh(cyl(0.14, 0.3, 0.58), m, g, [0, 0.29, 0]); mesh(rbox(0.78, 0.1, 0.5, 0.04, 2), m, g, [0, 0.05, 0]);
  },
  moon(g, m) {
    mesh(ball(0.5, 22), m, g, [0, 0.56, 0]);
    for (const [x, y, r] of [[-0.18, 0.72, 0.11], [0.2, 0.5, 0.13], [-0.1, 0.36, 0.07]]) mesh(new THREE.TorusGeometry(r, 0.03, 6, 14), m, g, [x, y, 0.46], [0, x, 0]);
    mesh(cyl(0.04, 0.04, 1.3), m, g, [0.42, 0.75, 0.18], [0, 0, -0.35]); mesh(rbox(0.34, 0.2, 0.16, 0.04, 2), m, g, [0.22, 0.14, 0.2], [0, 0, -0.35]);
  },
  casino(g, m) {
    mesh(lathe([[0.001, 0], [0.42, 0], [0.56, 0.2], [0.52, 0.55], [0.3, 0.82], [0.2, 0.92], [0.36, 1.12], [0.001, 1.05]]), m, g);
    mesh(new THREE.TorusGeometry(0.22, 0.05, 7, 18).rotateX(Math.PI / 2), m, g, [0, 0.9, 0]);
    mesh(rbox(0.34, 0.08, 0.06, 0.02, 1), m, g, [0, 0.6, 0.48]); mesh(rbox(0.08, 0.36, 0.06, 0.02, 1), m, g, [0.06, 0.4, 0.51], [0, 0, -0.3]);
  },
  saege(g, m) {
    mesh(ball(0.45), m, g, [0, 0.44, 0], null, [1, 1, 0.9]); mesh(ball(0.34), m, g, [0, 0.92, 0.06]);
    for (const s of [-1, 1]) {
      mesh(ball(0.13), m, g, [s * 0.27, 1.18, 0], null, [1, 1, 0.5]); mesh(ball(0.14), m, g, [s * 0.15, 0.8, 0.28]);
      mesh(ball(0.1), m, g, [s * 0.3, 0.52, 0.36]); mesh(ball(0.14), m, g, [s * 0.25, 0.07, 0.3], null, [1, 0.5, 1.4]);
    }
  },
  strom(g, m) {
    mesh(ball(0.44, 22), m, g, [0, 0.9, 0]); mesh(cyl(0.3, 0.22, 0.32), m, g, [0, 0.48, 0]);
    for (let i = 0; i < 3; i++) mesh(new THREE.TorusGeometry(0.23, 0.04, 6, 18).rotateX(Math.PI / 2), m, g, [0, 0.14 + i * 0.1, 0]);
    mesh(cyl(0.14, 0.2, 0.36), m, g, [0, 0.18, 0]);
  },
  ozean(g, m) {
    mesh(rbox(0.56, 1.05, 0.1, 0.07, 2), m, g, [0, 0.72, 0], [-0.16, 0, 0.14]);
    mesh(rbox(0.44, 0.75, 0.05, 0.03, 1), m, g, [-0.01, 0.74, 0.07], [-0.16, 0, 0.14]);
    for (let i = 0; i < 4; i++) mesh(new THREE.TorusGeometry(0.17, 0.06, 6, 14, Math.PI), m, g, [-0.48 + i * 0.32, 0.06, 0.14]);
  },
  bruno(g, m) {
    mesh(new THREE.IcosahedronGeometry(0.52, 1), m, g, [0, 0.5, 0], [0.4, 0.3, 0.2], [1.1, 0.92, 0.9]);
    mesh(new THREE.SphereGeometry(0.47, 18, 8, 0, TAU, 0, Math.PI / 2), m, g, [0, 0.74, 0], null, [1, 0.7, 1]);
    mesh(cyl(0.36, 0.36, 0.05), m, g, [0, 0.76, 0.36], [0.12, 0, 0], [1, 1, 0.7]);
    mesh(new THREE.TorusGeometry(0.4, 0.05, 6, 22).rotateX(Math.PI / 2 - 0.3), m, g, [0, 0.2, 0.08]);
  },
  ludwig(g, m) {
    mesh(cyl(0.5, 0.44, 0.34, 24), m, g, [0, 0.42, 0]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; mesh(cyl(0.01, 0.16, 0.46, 8), m, g, [Math.sin(a) * 0.41, 0.78, Math.cos(a) * 0.41]); mesh(ball(0.07, 8), m, g, [Math.sin(a) * 0.41, 1.03, Math.cos(a) * 0.41]); }
    mesh(cyl(0.11, 0.11, 1.25).rotateZ(Math.PI / 2), m, g, [0, 0.14, 0.3], [0, 0, 0.06]);
  },
  eier(g, m) {
    mesh(lathe([[0.001, 0.12], [0.26, 0.17], [0.43, 0.38], [0.45, 0.6], [0.35, 0.9], [0.2, 1.1], [0.001, 1.16]]), m, g);
    mesh(cyl(0.3, 0.38, 0.2), m, g, [0, 0.1, 0]);
  },
};
function buildRegal(root) {
  const fest = new THREE.Group(); root.add(fest);
  const wood = std({ color: 0x754529, roughness: 0.6 }); const iron = std({ color: 0x1a1c24, metalness: 0.4, roughness: 0.4 }); const sockel = std({ color: 0x17131a, roughness: 0.35 });
  const MAT = [
    std({ color: 0x454f78, emissive: 0x1a2140, roughness: 0.9, envMapIntensity: 0.3 }), // noch leer: graublaue Form
    std({ color: 0xd4dce6, metalness: 0.8, roughness: 0.24, emissive: 0x242a32 }),
    std({ color: 0xffd060, metalness: 0.82, roughness: 0.2, emissive: 0x4a2c04 }),
  ];
  for (const s of [-1, 1]) {
    mesh(rbox(1.04, 0.035, 0.24, 0.01, 2), wood, fest, [s * 1.87, 2.35, 0.125]);
    for (const x of [1.44, 2.04]) { mesh(rbox(0.025, 0.13, 0.025, 0.006, 1), iron, fest, [s * x, 2.27, 0.02]); mesh(rbox(0.02, 0.02, 0.17, 0.006, 1), iron, fest, [s * x, 2.32, 0.1]); }
  }
  const label = mesh(new THREE.PlaneGeometry(0.34, 0.078), std({ map: tapeTex('Trophäen', { w: 460, h: 106 }), alphaTest: 0.4, roughness: 0.85, emissive: 0x3a3020 }), root, [1.6, 2.352, 0.249], [0, 0, 0.02]);
  label.castShadow = false;

  const items = ERFOLGE.map((E, i) => {
    const s = i < 5 ? -1 : 1; const x = s * (1.46 + (i % 5) * 0.2);
    mesh(rbox(0.14, 0.035, 0.14, 0.008, 1), sockel, fest, [x, 2.385, 0.125]);
    const form = new THREE.Group(); ANDENKEN[E.id](form, MAT[0]); bake(form);
    const M = form.children.filter((o) => o.isMesh);
    const box = new THREE.Box3().setFromObject(form); const size = box.getSize(V3()); const mid = box.getCenter(V3());
    const k = Math.min(0.175 / size.x, 0.25 / size.y, 0.16 / size.z);
    form.scale.setScalar(k); form.position.set(-mid.x * k, -box.min.y * k, -mid.z * k);
    const g = new THREE.Group(); g.add(form); g.position.set(x, 2.4025, 0.125); root.add(g);
    const star = glowSprite(root, 0xffd060, 0.36, [x, 2.52, 0.2], 0); star.visible = false;
    const hit = hitBox(root, 0.195, 0.31, 0.22, [x, 2.52, 0.14], `erfolg:${i}`);
    return { E, x, g, meshes: M, star, hit, stufe: 0 };
  });
  bake(fest);

  function set(stufen) {
    for (const it of items) {
      const n = clamp(stufen[it.E.id] || 0, 0, 2); it.stufe = n; it.star.visible = n === 2;
      for (const m of it.meshes) m.material = MAT[n];
    }
  }
  function update(t, hover, calm) {
    items.forEach((it, i) => {
      const on = hover === `erfolg:${i}`;
      it.g.scale.setScalar((it.stufe === 2 ? 1 : 0.86) * (on ? 1.15 : 1));
      it.g.rotation.y = on && !calm ? Math.sin(t * 2.4) * 0.6 : 0;
      if (it.stufe === 2) it.star.material.opacity = calm ? 0.3 : 0.24 + 0.14 * Math.sin(t * 1.8 + i * 1.7);
    });
  }
  return { items, set, update };
}

// ---------------- Fenster mit echter Uhrzeit, Dezember ----------------
// Sonnenauf- und -untergang je Monat (Mitte Deutschlands, Uhr wie an der Wand)
const SONNE = [[8.3, 16.8], [7.5, 17.7], [6.6, 18.6], [6.4, 20.4], [5.5, 21.1], [5.1, 21.6], [5.4, 21.5], [6.1, 20.7], [6.9, 19.5], [7.7, 18.4], [7.7, 16.7], [8.3, 16.4]];
export function himmel(date) {
  const h = date.getHours() + date.getMinutes() / 60; const [auf, unter] = SONNE[date.getMonth()];
  const tag = smooth(auf - 0.6, auf + 0.7, h) * (1 - smooth(unter - 0.7, unter + 0.6, h));
  const rot = Math.max(1 - Math.abs(h - auf) / 1.1, 1 - Math.abs(h - unter) / 1.1, 0);
  return { h, auf, unter, tag, rot, winter: date.getMonth() === 11 };
}
function buildFenster(root, pane, aussen) {
  const { x: X, y: Y, w: WW, h: HH } = FENSTER;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 640;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (pane.material.map) pane.material.map.dispose();
  pane.material.map = tex; pane.material.needsUpdate = true;

  // Wecker auf dem Fensterbrett
  const uhrCv = document.createElement('canvas'); uhrCv.width = 256; uhrCv.height = 96;
  const uhrTex = new THREE.CanvasTexture(uhrCv); uhrTex.colorSpace = THREE.SRGBColorSpace;
  mesh(rbox(0.31, 0.125, 0.075, 0.02, 2), std({ color: 0x15171f, roughness: 0.4 }), root, [X + 0.16, 1.36, 0.115]);
  mesh(new THREE.PlaneGeometry(0.28, 0.105), new THREE.MeshBasicMaterial({ map: uhrTex }), root, [X + 0.16, 1.36, 0.154]).castShadow = false;

  const mix = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k).getStyle();
  function malen(S) {
    const c = cv.getContext('2d'); const w = cv.width; const h = cv.height; c.globalAlpha = 1; c.shadowBlur = 0;
    const glut = S.rot * 0.85;
    const oben = new THREE.Color(0x05081a).lerp(new THREE.Color(S.winter ? 0x8ea4bc : 0x4f9be0), S.tag).lerp(new THREE.Color(0x4a4a90), glut * 0.6);
    const unten = new THREE.Color(0x1d2a55).lerp(new THREE.Color(S.winter ? 0xd5dee8 : 0xbfe2f6), S.tag).lerp(new THREE.Color(0xff9460), glut);
    const g = c.createLinearGradient(0, 0, 0, h * 0.85); g.addColorStop(0, oben.getStyle()); g.addColorStop(1, unten.getStyle()); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = rng(77);
    c.fillStyle = '#dfe6ff';
    for (let i = 0; i < 110; i++) { c.globalAlpha = (0.3 + r() * 0.7) * Math.max(0, 1 - S.tag * 1.6 - S.rot); c.fillRect(r() * w, r() * h * 0.6, 2, 2); }
    c.globalAlpha = 1;
    const sonne = S.h >= S.auf && S.h <= S.unter;
    const k = sonne ? (S.h - S.auf) / (S.unter - S.auf) : ((S.h - S.unter + 24) % 24) / (24 - S.unter + S.auf); // Anteil des Weges
    const px = w * (0.16 + 0.68 * k); const py = h * (0.5 - 0.35 * Math.sin(Math.PI * k));
    c.shadowColor = sonne ? '#ffe6a0' : '#cfe0ff'; c.shadowBlur = sonne ? 60 : 34; c.fillStyle = sonne ? mix(0xfff6d0, 0xffa050, glut) : '#f0f3ff';
    c.beginPath(); c.arc(px, py, sonne ? 38 : 34, 0, TAU); c.fill(); c.shadowBlur = 0;
    const haus = mix(0x070a14, S.winter ? 0x56637a : 0x405068, S.tag); const dunkel = S.h >= 1 && S.h < 6;
    let x = -10;
    while (x < w) {
      const bw = 45 + r() * 70; const bh = 90 + r() * 200;
      c.fillStyle = haus; c.fillRect(x, h - bh, bw, bh);
      if (S.winter) { c.fillStyle = '#eef4fb'; c.beginPath(); c.roundRect(x - 3, h - bh - 9, bw + 6, 14, 7); c.fill(); }
      for (let y = h - bh + 14; y < h - 16; y += 26) for (let xx = x + 9; xx < x + bw - 12; xx += 22) {
        const z = r();
        if (S.tag > 0.55) { c.fillStyle = 'rgba(200,225,245,.22)'; c.fillRect(xx, y, 10, 13); } else if (z < (dunkel ? 0.06 : 0.2)) { c.fillStyle = '#ffcf7a'; c.fillRect(xx, y, 10, 13); }
      }
      x += bw + 4;
    }
    if (S.winter) { c.fillStyle = '#e6eef8'; c.beginPath(); c.roundRect(-8, h - 22, w + 16, 34, 14); c.fill(); }
    tex.needsUpdate = true;
  }
  function uhr(text) {
    const c = uhrCv.getContext('2d'); c.fillStyle = '#04100e'; c.fillRect(0, 0, 256, 96);
    c.shadowColor = '#46e0d0'; c.shadowBlur = 12; c.fillStyle = '#7ff3e4'; c.textAlign = 'center'; c.font = '700 72px Consolas, monospace'; c.fillText(text, 128, 73); c.shadowBlur = 0;
    uhrTex.needsUpdate = true;
  }

  // Schnee fällt hinter den Sprossen, liegt auf dem Fensterbrett draußen
  const winter = new THREE.Group(); winter.visible = false; root.add(winter);
  const FLOCKEN = 90; const fl = new THREE.InstancedMesh(new THREE.CircleGeometry(0.0085, 6), new THREE.MeshBasicMaterial({ color: 0xf4f8ff }), FLOCKEN);
  fl.frustumCulled = false; fl.castShadow = false; winter.add(fl);
  const r = rng(24); const flocken = Array.from({ length: FLOCKEN }, () => ({ x: r(), y: r(), v: 0.07 + r() * 0.08, s: 0.55 + r() * 0.8, p: r() * TAU }));
  mesh(rbox(WW - 0.05, 0.04, 0.012, 0.005, 1), glowMat(0xdde8f5, 0.9), winter, [X, Y - HH / 2 + 0.04, 0.026]).castShadow = false;

  // Lichterkette: ums Fenster, an beiden Regalen, über dem Schrank
  const ketten = [
    [[X - 0.41, 1.31], [X - 0.415, 1.8], [X - 0.41, 2.27], [X, 2.3], [X + 0.41, 2.27], [X + 0.415, 1.8], [X + 0.41, 1.31]].map(([a, b]) => [a, b, 0.078]),
    [[-2.38, 2.33], [-2.12, 2.265], [-1.87, 2.31], [-1.61, 2.265], [-1.36, 2.33]].map(([a, b]) => [a, b, 0.262]),
    [[1.36, 2.33], [1.61, 2.265], [1.87, 2.31], [2.12, 2.265], [2.38, 2.33]].map(([a, b]) => [a, b, 0.262]),
    [[-1.02, 2.072], [-0.5, 2.065], [0, 2.07], [0.5, 2.065], [1.02, 2.072]].map(([a, b]) => [a, b, 0.655]),
  ];
  const kabel = new THREE.Group(); const draht = std({ color: 0x14301f, roughness: 0.8 }); const punkte = [];
  for (const kette of ketten) {
    tube(kette, 0.005, draht, kabel, 40, 4);
    const curve = new THREE.CatmullRomCurve3(kette.map((p) => V3(p[0], p[1], p[2])));
    const n = Math.max(4, Math.round(curve.getLength() / 0.13));
    for (let i = 0; i <= n; i++) punkte.push(curve.getPointAt(i / n));
  }
  winter.add(bake(kabel));
  const birnen = new THREE.InstancedMesh(new THREE.SphereGeometry(0.019, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), punkte.length);
  birnen.castShadow = false; birnen.frustumCulled = false;
  const FARBE = [0xff4a4a, 0xffd24a, 0x4ade80, 0x4aa8ff, 0xff5cc8].map((f) => new THREE.Color(f));
  const M = new THREE.Matrix4(); const Q = new THREE.Quaternion(); const P = V3(); const S3 = V3(); const C = new THREE.Color();
  punkte.forEach((p, i) => { birnen.setMatrixAt(i, M.makeTranslation(p.x, p.y, p.z + 0.012)); birnen.setColorAt(i, FARBE[i % FARBE.length]); });
  winter.add(birnen);

  let key = ''; let zustand = null;
  const nachtLicht = new THREE.Color(0x8fb4ff); const tagLicht = new THREE.Color(0xe6eefc); const abendLicht = new THREE.Color(0xff9a62);
  function update(t, date, calm) {
    const k = `${date.getFullYear()}|${date.getMonth()}|${date.getHours()}|${date.getMinutes()}`;
    if (k !== key) {
      key = k; zustand = himmel(date); malen(zustand);
      uhr(`${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`);
      winter.visible = zustand.winter;
      aussen.color.copy(nachtLicht).lerp(tagLicht, zustand.tag).lerp(abendLicht, zustand.rot * 0.7);
      aussen.intensity = lerp(0.4, 0.72, zustand.tag); // das Zimmer bleibt ein dunkles Gamerzimmer
    }
    if (!winter.visible) return;
    const now = calm ? 3 : t;
    flocken.forEach((f, i) => {
      const y = (((f.y - now * f.v) % 1) + 1) % 1; const x = (((f.x + Math.sin(now * 0.7 + f.p) * 0.05) % 1) + 1) % 1;
      P.set(X - WW / 2 + 0.02 + x * (WW - 0.04), Y - HH / 2 + 0.05 + y * (HH - 0.07), 0.024); S3.setScalar(f.s);
      fl.setMatrixAt(i, M.compose(P, Q, S3));
    });
    fl.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < punkte.length; i++) {
      const hell = calm ? 1.2 : 0.95 + 0.4 * Math.sin(now * 1.6 + i * 1.3); // sanft, kein Blitzen
      birnen.setColorAt(i, C.copy(FARBE[i % FARBE.length]).multiplyScalar(hell));
    }
    birnen.instanceColor.needsUpdate = true;
  }
  return { update, get zustand() { return zustand; }, winter };
}

// room = Rückgabe von buildZimmer()
export function buildLeben(room) {
  const root = keep(new THREE.Group()); room.root.add(root);
  const bett = buildBett(root);
  const regal = buildRegal(root);
  const fenster = buildFenster(root, room.pane, room.aussen);
  return {
    bett, regal, fenster,
    update(t, date, hover, calm) { bett.update(t, hover, calm); regal.update(t, hover, calm); fenster.update(t, date, calm); },
  };
}
