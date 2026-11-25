// Theos Seitenscheidel - Sachen im Zimmer aus Abstimmung Paket 3 (2026-11-22): Radio, Farbtopf, Zettel „Was ist neu?“ und was man mit Pokalen freischaltet.
// schrank.js ruft buildDeko() nach buildLeben(). Was frei ist, weiß zimmerwahl.js. Gezeichnet sind nur eigene Motive aus den eigenen Spielen.
// Alles steht so, dass es bei geschlossenem Schrank im Bild ist. Radio und Farbtopf bleiben auch neben der offenen Tür zu sehen.
import * as THREE from './vendor/three.module.min.js';
import { TAU, std, glowMat, mesh, rbox, bake, canvasTex, glowSprite } from './titelkit.js';
import { drawBolt } from './titelfigur.js';
import { fitFont, tapeTex, MARKER } from './schrankzimmer.js';
import { RADIO, DEKO, NEON } from './zimmerwahl.js';

const keep = (o) => { o.userData.keep = true; return o; };
function hitBox(parent, w, h, d, pos, id) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial());
  m.visible = false;
  m.userData.hit = id;
  m.position.set(pos[0], pos[1], pos[2]);
  parent.add(m);
  return m;
}
const ball = (r, n = 14) => new THREE.SphereGeometry(r, n, Math.ceil(n * 0.7));
const zylinder = (oben, unten, h, n = 18) => new THREE.CylinderGeometry(oben, unten, h, n);

// ---------------- Radio ----------------
function bauRadio(root) {
  const g = new THREE.Group();
  g.position.set(2.135, 0.7825, 0.53);
  g.rotation.y = -0.16;
  root.add(g);
  const fest = new THREE.Group();
  g.add(fest);
  const holz = std({ color: 0x9c3f2c, roughness: 0.45 });
  const dunkel = std({ color: 0x191b22, roughness: 0.4 });
  const chrom = std({ color: 0xd9dde2, metalness: 0.85, roughness: 0.22 });
  mesh(rbox(0.3, 0.165, 0.11, 0.022, 2), holz, fest, [0, 0.083, 0]);
  mesh(rbox(0.27, 0.135, 0.012, 0.008, 1), dunkel, fest, [0, 0.08, 0.055]);
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.037, 0.006, 6, 18), chrom, fest, [s * 0.088, 0.067, 0.064]);
  mesh(new THREE.TorusGeometry(0.062, 0.008, 6, 16, Math.PI), chrom, fest, [0, 0.165, 0]);
  mesh(zylinder(0.003, 0.003, 0.22, 6), chrom, fest, [0.12, 0.26, -0.03], [0, 0, -0.35]);
  for (const x of [-0.02, 0.02]) mesh(zylinder(0.011, 0.011, 0.014, 10).rotateX(Math.PI / 2), chrom, fest, [x, 0.03, 0.066]);
  bake(fest);

  const membran = [-1, 1].map((s) => mesh(new THREE.CircleGeometry(0.032, 16), std({ color: 0x2c303a, roughness: 0.9 }), g, [s * 0.088, 0.067, 0.065]));
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 80;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const anzeige = mesh(new THREE.PlaneGeometry(0.14, 0.044), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), g, [0, 0.124, 0.0625]);
  anzeige.castShadow = false;
  const schein = glowSprite(g, 0xffb060, 0.5, [0, 0.12, 0.09], 0);
  const schild = mesh(new THREE.PlaneGeometry(0.17, 0.046), std({ map: tapeTex('Radio', { w: 300, h: 80 }), alphaTest: 0.4, roughness: 0.85, emissive: 0x3a3020 }), g, [0, -0.026, 0.205], [0, 0, 0.02]);
  schild.castShadow = false;
  const hit = hitBox(g, 0.33, 0.27, 0.2, [0, 0.09, 0.04], 'radio');

  let sender = null;
  function set(id) {
    if (id === sender) return;
    sender = id;
    const c = cv.getContext('2d');
    const an = id !== 'aus';
    c.fillStyle = an ? '#2a1606' : '#0b0c0e';
    c.fillRect(0, 0, 256, 80);
    const name = (RADIO.find((r) => r.id === id) || RADIO[0]).name.toUpperCase();
    fitFont(c, name, 232, 46, "900 100px Bahnschrift, 'Segoe UI', sans-serif");
    c.fillStyle = an ? '#ffc46a' : '#55585e';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(name, 128, 42);
    tex.needsUpdate = true;
  }
  function update(t, hover, still) {
    const an = !!sender && sender !== 'aus';
    const schlag = an && !still ? 1 + Math.max(0, Math.sin(t * 10)) * 0.08 : 1;
    for (const m of membran) m.scale.setScalar(schlag);
    schein.material.opacity = hover === 'radio' ? 0.34 : an ? 0.07 : 0;
  }
  return { hit, set, update, g };
}

// ---------------- Farbtopf ----------------
function bauTopf(root) {
  const g = new THREE.Group();
  g.position.set(2.12, 0, 0.88);
  root.add(g);
  const fest = new THREE.Group();
  g.add(fest);
  const blech = std({ color: 0xc4c9cf, metalness: 0.7, roughness: 0.3 });
  mesh(zylinder(0.105, 0.09, 0.19, 22), blech, fest, [0, 0.095, 0]);
  mesh(zylinder(0.099, 0.099, 0.012, 22), std({ color: 0xff4f9a, roughness: 0.25 }), fest, [0, 0.189, 0]);
  for (const [x, hoch] of [[-0.04, 0.11], [0.02, 0.07], [0.06, 0.14]]) mesh(rbox(0.022, hoch, 0.012, 0.006, 1), std({ color: 0xff4f9a, roughness: 0.3 }), fest, [x, 0.19 - hoch / 2, 0.1 - Math.abs(x) * 0.3]);
  mesh(new THREE.TorusGeometry(0.1, 0.005, 5, 18, Math.PI), blech, fest, [0, 0.17, 0], [0.5, 0, 0]);
  mesh(zylinder(0.01, 0.012, 0.22, 8), std({ color: 0x9a6434, roughness: 0.7 }), fest, [0.05, 0.255, -0.02], [0, 0, -0.45]);
  mesh(rbox(0.05, 0.06, 0.025, 0.006, 1), std({ color: 0x46e0d0, roughness: 0.6 }), fest, [0.11, 0.365, -0.02], [0, 0, -0.45]);
  bake(fest);
  const schild = mesh(new THREE.PlaneGeometry(0.22, 0.054), std({ map: tapeTex('Gestalten', { w: 380, h: 92 }), alphaTest: 0.4, roughness: 0.85, emissive: 0x3a3020 }), g, [0, 0.075, 0.112], [0, 0, -0.04]);
  schild.castShadow = false;
  const schein = glowSprite(g, 0xff5c9e, 0.6, [0, 0.2, 0.15], 0.08);
  const hit = hitBox(g, 0.3, 0.42, 0.26, [0.02, 0.2, 0], 'topf');
  return { hit, g, update(hover) { schein.material.opacity = hover === 'topf' ? 0.36 : 0.08; } };
}

// ---------------- Zettel an der rechten Tür ----------------
const ZETTEL = { x: -0.94, y: 1.505, w: 0.36, h: 0.285 };
function zettelBild(neu) {
  return canvasTex(420, 332, (c, w, h) => {
    c.fillStyle = '#fff3b8';
    c.beginPath();
    c.moveTo(6, 10); c.lineTo(w - 8, 4); c.lineTo(w - 4, h - 26); c.lineTo(w - 34, h - 5); c.lineTo(10, h - 8);
    c.closePath();
    c.fill();
    c.fillStyle = '#e2c870';
    c.beginPath();
    c.moveTo(w - 4, h - 26); c.lineTo(w - 36, h - 30); c.lineTo(w - 34, h - 5);
    c.closePath();
    c.fill();
    c.textAlign = 'center';
    c.fillStyle = '#2b2230';
    c.font = MARKER.replace('100px', '78px');
    c.fillText('Was ist', w / 2, 152);
    c.fillText('neu?', w / 2, 238);
    if (neu) {
      c.save();
      c.translate(w - 66, 44);
      c.rotate(0.22);
      c.fillStyle = '#d8262e';
      c.beginPath();
      c.roundRect(-56, -23, 112, 46, 12);
      c.fill();
      c.fillStyle = '#fff';
      c.font = "900 31px 'Segoe UI Black', 'Segoe UI', sans-serif";
      c.fillText('NEU!', 0, 11);
      c.restore();
    } else {
      c.strokeStyle = 'rgba(43,34,48,.25)';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(60, 284); c.lineTo(w - 70, 278);
      c.stroke();
    }
    c.fillStyle = '#c23a3a';
    c.beginPath();
    c.arc(w / 2, 28, 16, 0, TAU);
    c.fill();
  });
}
function bauZettel(pivot) {
  const g = keep(new THREE.Group()); // dreht sich um die Reißzwecke
  g.position.set(ZETTEL.x, ZETTEL.y + ZETTEL.h / 2 - 0.024, 0.047);
  pivot.add(g);
  const bilder = [zettelBild(false), zettelBild(true)];
  const M = std({ map: bilder[0], alphaTest: 0.4, roughness: 0.85, emissive: 0x2c2814 });
  const blatt = mesh(new THREE.PlaneGeometry(ZETTEL.w, ZETTEL.h), M, g, [0, 0.024 - ZETTEL.h / 2, 0]);
  blatt.castShadow = false;
  const schein = glowSprite(g, 0xffe08a, 0.6, [0, -0.12, 0.03], 0);
  // zwei Kästen, damit die Klinke darunter frei greifbar bleibt
  const hits = [
    hitBox(pivot, ZETTEL.w, 0.18, 0.1, [ZETTEL.x, 1.559, 0.07], 'zettel'),
    hitBox(pivot, 0.205, 0.107, 0.1, [-0.8625, 1.416, 0.07], 'zettel'),
  ];
  let neu = false;
  return {
    hits,
    g,
    set(v) { neu = !!v; M.map = bilder[neu ? 1 : 0]; },
    update(t, hover, still) {
      const an = hover === 'zettel';
      const takt = t % 3.2;
      const wackel = neu && !still && takt < 0.9 ? Math.sin(takt * 26) * 0.07 * (1 - takt / 0.9) : 0;
      g.rotation.z = (an ? 0 : -0.035) + wackel;
      schein.material.opacity = an ? 0.3 : neu ? (still ? 0.14 : 0.1 + 0.08 * Math.sin(t * 3)) : 0;
    },
  };
}

// ---------------- Poster ----------------
function schrift(c, text, y, size, farbe, font = "900 100px 'Segoe UI Black', 'Segoe UI', sans-serif") {
  fitFont(c, text, 376, size, font);
  c.fillStyle = farbe;
  c.textAlign = 'center';
  c.fillText(text, 208, y);
}
const KLEIN = "700 100px 'Segoe UI', sans-serif";
const MOTIV = {
  boss(c, w, h) {
    c.fillStyle = '#8c1c20'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.06)';
    for (let i = 0; i < 12; i++) { c.beginPath(); c.moveTo(w / 2, 220); c.arc(w / 2, 220, 520, i / 12 * TAU, (i + 0.5) / 12 * TAU); c.fill(); }
    c.fillStyle = '#17171a';
    c.beginPath(); c.arc(w / 2, 250, 128, Math.PI, TAU); c.fill();
    c.beginPath(); c.roundRect(w / 2 - 160, 234, 320, 42, 21); c.fill();
    schrift(c, 'BOSS', 220, 70, '#f0bd52');
    schrift(c, 'Ludwig', 402, 88, '#f7efdc', 'italic 700 100px Georgia, serif');
    schrift(c, 'Zigarettenboss', 468, 38, '#f0bd52', KLEIN);
  },
  blitz(c, w, h) {
    c.fillStyle = '#14203a'; c.fillRect(0, 0, w, h);
    c.save(); c.translate(w / 2 - 120, 22); drawBolt(c, 240, 290); c.restore();
    schrift(c, 'STROM AUS', 402, 76, '#ffd21a');
    schrift(c, 'wegen Brunos', 458, 36, '#e8eefc', KLEIN);
    schrift(c, 'Geschirrspüler', 506, 36, '#e8eefc', KLEIN);
  },
  wal(c, w, h) {
    c.fillStyle = '#bfe6f6'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1672c8'; c.fillRect(0, 300, w, h - 300);
    c.beginPath();
    for (let i = 0; i < 6; i++) c.ellipse(i * 84, 302, 48, 14, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#3a5a78';
    c.beginPath(); c.ellipse(188, 238, 130, 70, -0.1, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(292, 226); c.lineTo(372, 168); c.lineTo(352, 240); c.lineTo(378, 290); c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(122, 222, 15, 0, TAU); c.fill();
    c.fillStyle = '#12202c'; c.beginPath(); c.arc(119, 225, 7, 0, TAU); c.fill();
    c.strokeStyle = '#2f8fd0'; c.lineWidth = 12; c.lineCap = 'round';
    for (const s of [-1, 0, 1]) { c.beginPath(); c.moveTo(170, 160); c.quadraticCurveTo(170 + s * 20, 100, 170 + s * 56, 106 + Math.abs(s) * 14); c.stroke(); }
    schrift(c, 'OZEAN', 408, 92, '#fff');
    schrift(c, 'bald leer.', 466, 40, '#d8f2ff', KLEIN);
  },
  mond(c, w, h) {
    c.fillStyle = '#10142c'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) c.fillRect((i * 97) % w, (i * 191) % h, 3, 3);
    c.fillStyle = '#dcdcea'; c.beginPath(); c.arc(190, 190, 125, 0, TAU); c.fill();
    c.fillStyle = '#b0b2c8';
    for (const [x, y, r] of [[150, 150, 26], [235, 210, 34], [160, 250, 16], [240, 130, 12]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
    c.save(); c.translate(292, 214); c.rotate(0.45);
    c.fillStyle = '#a8713c'; c.fillRect(-8, -150, 16, 210);
    c.fillStyle = '#f0bd52'; c.beginPath(); c.moveTo(-28, 52); c.lineTo(28, 52); c.lineTo(52, 128); c.lineTo(-52, 128); c.closePath(); c.fill();
    c.restore();
    schrift(c, 'MOND PUTZEN', 414, 66, '#fff');
    schrift(c, 'Einer muss es ja tun.', 472, 34, '#9fb0e8', KLEIN);
  },
  kette(c, w, h) {
    c.fillStyle = '#1b1b20'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#e0b050'; c.lineWidth = 15;
    for (let i = 0; i <= 14; i++) {
      const u = i / 7 - 1;
      c.beginPath(); c.ellipse(w / 2 + u * 148, 268 - 210 * u * u, 15, 22, u * 0.9, 0, TAU); c.stroke();
    }
    c.fillStyle = '#e0b050'; c.beginPath(); c.arc(w / 2, 312, 42, 0, TAU); c.fill();
    c.fillStyle = '#1b1b20'; c.font = "900 52px 'Segoe UI Black', sans-serif"; c.textAlign = 'center'; c.fillText('B', w / 2, 330);
    schrift(c, 'BRUNO', 434, 86, '#f0bd52');
    schrift(c, 'Goldkette inklusive', 492, 34, '#f4efe2', KLEIN);
  },
};
function bauPoster(root) {
  const g = new THREE.Group();
  g.position.set(1.63, 1.62, 0.014);
  g.rotation.z = -0.025;
  g.visible = false;
  root.add(g);
  const M = std({ color: 0xffffff, roughness: 0.8 });
  mesh(new THREE.PlaneGeometry(0.52, 0.7), M, g).castShadow = false;
  for (const x of [-0.22, 0.22]) mesh(ball(0.012, 8), std({ color: 0xd2a354, metalness: 0.7, roughness: 0.3 }), g, [x, 0.315, 0.01]);
  const fertig = new Map();
  return {
    set(id) {
      g.visible = !!MOTIV[id];
      if (!g.visible) return;
      if (!fertig.has(id)) fertig.set(id, canvasTex(416, 560, MOTIV[id]));
      if (M.map !== fertig.get(id)) { M.map = fertig.get(id); M.needsUpdate = true; }
    },
  };
}

// ---------------- Deko ----------------
const BAU = {
  ball(g) {
    g.position.set(1.52, 0.115, 0.74);
    mesh(ball(0.115, 22), std({ color: 0xf4f2ea, roughness: 0.5 }), g);
    const schwarz = std({ color: 0x17181c, roughness: 0.5 });
    const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position;
    const fertig = [];
    for (let i = 0; i < ico.count; i++) {
      const n = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
      if (fertig.some((q) => q.distanceTo(n) < 0.1)) continue;
      fertig.push(n);
      const fleck = mesh(new THREE.CircleGeometry(0.032, 5), schwarz, g, [n.x * 0.117, n.y * 0.117, n.z * 0.117]);
      fleck.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    }
  },
  pflanze(g) {
    g.position.set(1.36, 0, 0.3);
    mesh(zylinder(0.15, 0.11, 0.26, 20), std({ color: 0xb4583a, roughness: 0.8 }), g, [0, 0.13, 0]);
    mesh(zylinder(0.138, 0.138, 0.01, 20), std({ color: 0x3a2a1c, roughness: 1 }), g, [0, 0.258, 0]);
    const blatt = std({ color: 0x3f9a4a, roughness: 0.65 });
    const stiel = std({ color: 0x2f6a2e, roughness: 0.8 });
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const hoch = 0.28 + (i % 3) * 0.13;
      const aus = 0.1 + (i % 2) * 0.06;
      const x = Math.sin(a) * aus;
      const z = Math.cos(a) * aus * 0.8;
      mesh(zylinder(0.006, 0.009, hoch, 6), stiel, g, [x * 0.5, 0.26 + hoch / 2, z * 0.5], [z / hoch * 0.9, 0, -x / hoch * 0.9]);
      mesh(ball(1, 10), blatt, g, [x, 0.26 + hoch, z], [0.5, a, 0.35], [0.075, 0.022, 0.13]);
    }
  },
  lava(g) {
    g.position.set(-1.5, 1.56, 0.12);
    mesh(rbox(0.28, 0.026, 0.2, 0.008, 1), std({ color: 0x754529, roughness: 0.6 }), g, [0, 0, -0.01]);
    const metall = std({ color: 0xc9ccd4, metalness: 0.8, roughness: 0.25 });
    mesh(zylinder(0.04, 0.062, 0.09), metall, g, [0, 0.058, 0]);
    mesh(zylinder(0.022, 0.034, 0.04), metall, g, [0, 0.322, 0]);
    mesh(zylinder(0.034, 0.056, 0.2), std({ color: 0x8a3cff, emissive: 0x4a1c90, emissiveIntensity: 0.9, roughness: 0.15, transparent: true, opacity: 0.55, depthWrite: false }), g, [0, 0.203, 0]);
    const wachs = glowMat(0xff6a2a, 1.4);
    const klumpen = [0.021, 0.016, 0.013].map((r) => keep(mesh(ball(r, 10), wachs, g, [0, 0.15, 0])));
    const schein = glowSprite(g, 0xc070ff, 0.5, [0, 0.2, 0.06], 0.22);
    return (t, still) => {
      klumpen.forEach((m, i) => { m.position.y = 0.2 + Math.sin((still ? 1 : t) * (0.45 + i * 0.17) + i * 2) * 0.068; m.position.x = (i - 1) * 0.011; });
      schein.material.opacity = still ? 0.22 : 0.2 + Math.sin(t * 0.7) * 0.04;
    };
  },
  hamster(g) {
    g.position.set(-1.78, 0.45, 0.31);
    g.rotation.y = 0.35;
    // rund wie eine Birne, dicke Backen, winzige Ohren, zwei Nagezähne: sonst hält man ihn für einen Bären
    const fell = std({ color: 0xe0a45c, roughness: 1 });
    const hell = std({ color: 0xfff0da, roughness: 1 });
    const rosa = std({ color: 0xef9aa6, roughness: 0.9 });
    const dunkel = std({ color: 0x241a14, roughness: 0.4 });
    mesh(ball(1, 18), fell, g, [0, 0.13, 0], null, [0.15, 0.15, 0.13]);
    mesh(ball(1, 14), hell, g, [0, 0.11, 0.07], null, [0.105, 0.11, 0.08]);
    mesh(ball(1, 18), fell, g, [0, 0.262, 0.02], null, [0.125, 0.1, 0.105]);
    mesh(ball(0.015, 8), rosa, g, [0, 0.266, 0.133]);
    for (const s of [-1, 1]) {
      mesh(ball(1, 12), hell, g, [s * 0.062, 0.226, 0.082], null, [0.062, 0.054, 0.052]);
      mesh(rbox(0.017, 0.027, 0.01, 0.003, 1), hell, g, [s * 0.01, 0.218, 0.133]);
      mesh(ball(1, 10), fell, g, [s * 0.082, 0.345, 0.0], null, [0.028, 0.025, 0.014]);
      mesh(ball(1, 8), rosa, g, [s * 0.082, 0.343, 0.01], null, [0.017, 0.015, 0.008]);
      mesh(ball(0.019, 8), dunkel, g, [s * 0.047, 0.294, 0.107]);
      mesh(ball(1, 10), rosa, g, [s * 0.04, 0.16, 0.15], null, [0.02, 0.024, 0.02]);
      mesh(ball(1, 10), rosa, g, [s * 0.075, 0.018, 0.105], null, [0.032, 0.016, 0.04]);
    }
  },
  disko(g) {
    g.position.set(-1.72, 2.1, 0.17);
    mesh(zylinder(0.004, 0.004, 0.14, 6), std({ color: 0x3a3d45, roughness: 0.5 }), g, [0, 0.175, 0]);
    const kacheln = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#20242e';
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 24; i++) for (let j = 0; j < 12; j++) {
        c.fillStyle = ['#8d99b0', '#c9d6ea', '#ffffff', '#66728a', '#aab6cc', '#ffd6ee', '#c4fff6'][(i * 7 + j * 11 + i * j) % 7];
        c.fillRect(i * w / 24 + 1, j * h / 12 + 1, w / 24 - 2, h / 12 - 2);
      }
    });
    const spiegel = std({ map: kacheln, emissive: 0x6c7486, emissiveMap: kacheln, metalness: 0.6, roughness: 0.2, flatShading: true });
    const kugel = keep(mesh(ball(0.105, 16), spiegel, g));
    const punkte = [0xff4f9a, 0x46e0d0, 0xffd21a, 0x7f9cff].map((farbe) => glowSprite(g, farbe, 0.12, [0, 0, 0.1], 0.5));
    return (t, still) => {
      const u = still ? 1 : t;
      kugel.rotation.y = u * 0.5;
      punkte.forEach((p, i) => {
        const a = u * 0.8 + i * TAU / 4;
        p.position.set(Math.sin(a) * 0.17, Math.sin(a * 1.7 + i) * 0.1, 0.1 + Math.cos(a) * 0.05);
      });
    };
  },
};
function bauDekos(root) {
  return DEKO.map((D) => {
    const g = new THREE.Group();
    g.visible = false;
    root.add(g);
    return { id: D.id, g, tick: BAU[D.id](g) || null };
  });
}

export function buildDeko(room) {
  const root = keep(new THREE.Group());
  room.root.add(root);
  const radio = bauRadio(root);
  const topf = bauTopf(root);
  const zettel = bauZettel(room.doors.find((d) => d.side > 0).pivot);
  const poster = bauPoster(root);
  const dekos = bauDekos(root);

  // wahl: schon auf das gekürzt, was frei ist (sichtbareWahl)
  function setWahl(wahl) {
    radio.set(wahl.radio);
    poster.set(wahl.poster);
    const N = NEON.find((e) => e.id === wahl.neon);
    room.setNeon(N ? N.farbe : null);
    for (const D of dekos) D.g.visible = wahl.deko.includes(D.id);
  }
  function update(t, hover, still) {
    radio.update(t, hover, still);
    topf.update(hover);
    zettel.update(t, hover, still);
    for (const D of dekos) if (D.tick && D.g.visible) D.tick(t, still);
  }
  return { radio, topf, zettel, dekos, setWahl, update, hits: [radio.hit, topf.hit, ...zettel.hits] };
}
