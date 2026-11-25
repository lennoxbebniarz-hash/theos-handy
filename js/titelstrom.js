// Theos Seitenscheidel - Startbildschirm Strom aus wegen Brunos Geschirrspüler (Lennox, 2026-11-21): Bruno sitzt grinsend auf seinem Geschirrspüler,
// die anderen drei gehen mit Schraubenschlüsseln drauf los. Funken, Wasser, flackerndes Licht, hängende Kabel, draußen die dunkle Stadt.
// Jeder Treffer meldet sich über power/shake: die Schrift flackert mit, die Kamera wackelt kurz.
import * as THREE from './vendor/three.module.min.js';
import { V3, rng, smooth, clamp, std, glowMat, mesh, rbox, bake, tube, canvasTex, glowSprite, puffTex, dropTex, skyDome, envFrom, particles, TAU } from './titelkit.js';
import { createBuddy, drawBolt } from './titelfigur.js';
import { LOOKS } from './stromart.js';

const BRUNO = { shirt: 0xf2ede2, cap: 0x17171a, hair: 0x1a1410, skin: 0xd8a47e, pants: 0xe8e2d4, shoe: 0x2a2c30, print: 'BRUNO', chain: true };
const BACK = -1.28; const WIN = { x0: -3.55, x1: -1.6, y0: 1.28, y1: 2.72 };
const FRONT = 0.3; const TOP = 1.0; // Geschirrspüler: Vorderkante und Oberkante

// ---------------- Küche ----------------
function buildRoom(scene) {
  const g = new THREE.Group(); scene.add(g); const r = rng(31);
  const floorT = canvasTex(512, 512, (c, w) => {
    const n = 4; const s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.fillStyle = (i + j) % 2 ? '#968f82' : '#4f2522'; c.fillRect(i * s, j * s, s, s); }
    for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(30,20,10,${r() * 0.12})`; c.fillRect(r() * w, r() * w, 2 + r() * 4, 2 + r() * 4); }
    c.strokeStyle = 'rgba(20,14,10,.45)'; c.lineWidth = 4;
    for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, w); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); }
  }, { repeat: [7, 5] });
  mesh(new THREE.PlaneGeometry(14, 10), std({ map: floorT, roughness: 0.3 }), g, [-0.5, 0, 3.7], [-Math.PI / 2, 0, 0]);

  const paint = std({ color: 0x2b5560, roughness: 0.9 }); const W = (x0, x1, y0, y1) => mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, 0.14), paint, g, [(x0 + x1) / 2, (y0 + y1) / 2, BACK - 0.07]);
  W(-8, WIN.x0, 0, 4.6); W(WIN.x1, 6, 0, 4.6); W(WIN.x0, WIN.x1, 0, WIN.y0); W(WIN.x0, WIN.x1, WIN.y1, 4.6);
  mesh(new THREE.BoxGeometry(0.14, 4.6, 9), paint, g, [4.1, 2.3, 3]);
  const tileT = canvasTex(256, 256, (c, w) => {
    c.fillStyle = '#6d7770'; c.fillRect(0, 0, w, w);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { c.fillStyle = (i * 3 + j) % 5 === 0 ? '#e0b64a' : (i + j) % 3 ? '#d5dcd3' : '#b9cbc6'; c.fillRect(i * 64 + 3, j * 64 + 3, 58, 58); }
  }, { repeat: [10, 1] });
  mesh(new THREE.PlaneGeometry(6, 0.6), std({ map: tileT, roughness: 0.18 }), g, [1.1, 1.3, BACK + 0.006]);

  const wood = std({ color: 0xf1ede4, roughness: 0.55 });
  const { x0, x1, y0, y1 } = WIN; const wm = (x0 + x1) / 2; const hm = (y0 + y1) / 2;
  mesh(rbox(x1 - x0 + 0.16, 0.08, 0.12), wood, g, [wm, y1 + 0.02, BACK + 0.02]);
  mesh(rbox(x1 - x0 + 0.3, 0.06, 0.26), wood, g, [wm, y0 - 0.01, BACK + 0.07]);
  for (const x of [x0 - 0.02, x1 + 0.02]) mesh(rbox(0.08, y1 - y0, 0.12), wood, g, [x, hm, BACK + 0.02]);
  mesh(rbox(0.05, y1 - y0, 0.06), wood, g, [wm, hm, BACK - 0.03]); mesh(rbox(x1 - x0, 0.05, 0.06), wood, g, [wm, hm + 0.2, BACK - 0.03]);

  // Zeilen links und rechts, in der Mitte die Lücke, aus der der Geschirrspüler gezogen wurde
  const carcass = std({ color: 0xd8d2c4, roughness: 0.7 }); const front = std({ color: 0x9c6040, roughness: 0.45 });
  const steel = std({ color: 0xc4c8cc, metalness: 0.9, roughness: 0.28 }); const dark = std({ color: 0x1c1d20, roughness: 0.5 });
  for (const [a, b] of [[-5.6, -0.78], [0.78, 2.45]]) {
    const w = b - a; const cx = (a + b) / 2; const n = Math.max(1, Math.round(w / 0.62));
    mesh(rbox(w, 0.86, 0.56), carcass, g, [cx, 0.47, BACK + 0.29]); mesh(rbox(w + 0.04, 0.05, 0.64), dark, g, [cx, 0.93, BACK + 0.32]);
    for (let i = 0; i < n; i++) { const x = a + w / n * (i + 0.5); mesh(rbox(w / n - 0.03, 0.74, 0.03, 0.012), front, g, [x, 0.48, BACK + 0.585]); mesh(rbox(0.18, 0.025, 0.035, 0.01), steel, g, [x, 0.76, BACK + 0.615]); }
  }
  // Spüle mit Geschirrberg
  mesh(rbox(0.8, 0.025, 0.46, 0.01), steel, g, [-2.55, 0.965, BACK + 0.32]);
  mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 20, Math.PI), steel, g, [-2.55, 1.2, BACK + 0.2], [0, Math.PI / 2, 0]);
  mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.24, 10), steel, g, [-2.55, 1.08, BACK + 0.09]);
  const china = std({ color: 0xe8e4d8, roughness: 0.25 }); const plate = new THREE.CylinderGeometry(0.17, 0.13, 0.025, 24);
  for (let i = 0; i < 9; i++) mesh(plate, china, g, [-1.15 + Math.sin(i * 2.1) * 0.025, 0.975 + i * 0.03, BACK + 0.3], [0, 0, Math.sin(i * 1.3) * 0.08]);
  for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.13, 14), i % 2 ? china : front, g, [1.05 + i * 0.16, 1.02, BACK + 0.28 + (i % 2) * 0.1]);
  // Kühlschrank mit Zettel
  mesh(rbox(0.9, 2.05, 0.72, 0.07), std({ color: 0xefe8d6, roughness: 0.3 }), g, [2.98, 1.025, BACK + 0.38]);
  mesh(rbox(0.04, 0.5, 0.06, 0.015), steel, g, [2.64, 1.6, BACK + 0.77]); mesh(rbox(0.86, 0.015, 0.02, 0.005), dark, g, [2.98, 1.3, BACK + 0.742]);
  const note = canvasTex(256, 320, (c, w, h) => {
    c.fillStyle = '#fff3a8'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8261e'; c.font = '700 40px "Segoe Print", sans-serif'; c.textAlign = 'center'; c.fillText('BRUNO!', w / 2, 62);
    c.fillStyle = '#26221c'; c.font = '600 29px "Segoe Print", sans-serif'; ['Nie wieder', 'Turbo-', 'programm!!', '- die Stadt'].forEach((s, i) => c.fillText(s, w / 2, 124 + i * 52));
  });
  mesh(new THREE.PlaneGeometry(0.32, 0.4), std({ map: note }), g, [3.05, 1.68, BACK + 0.748], [0, 0, 0.06]);
  bake(g);
}

function buildCity(scene) {
  const r = rng(5);
  const moon = mesh(new THREE.SphereGeometry(0.55, 24, 16), glowMat(0xd8e4ff, 1.5), scene, [-8.4, 4.2, -17]); moon.castShadow = false;
  glowSprite(scene, 0x7fa8ff, 4.4, [-8.4, 4.2, -16.9], 0.4);
  const tex = (lit) => {
    const q = rng(8);
    return canvasTex(128, 256, (c, w, h) => {
      c.fillStyle = lit ? '#000' : '#172338'; c.fillRect(0, 0, w, h);
      for (let y = 10; y < h - 10; y += 22) for (let x = 8; x < w - 10; x += 20) { const on = q() < 0.6; c.fillStyle = lit ? (on ? '#ffd890' : '#000') : on ? '#2b3a55' : '#1d2a42'; c.fillRect(x, y, 12, 14); }
    });
  };
  const m = std({ map: tex(false), emissive: 0xffffff, emissiveMap: tex(true), emissiveIntensity: 0, roughness: 0.9 });
  const g = new THREE.Group(); scene.add(g);
  for (let i = 0; i < 34; i++) {
    const z = -5.5 - r() * 9; const h = 0.9 + r() * 1.9 + (-z - 5) * 0.07; const b = mesh(new THREE.BoxGeometry(0.9 + r() * 0.9, h, 0.9), m, g, [-10 + r() * 12, h / 2 - 0.3, z]);
    b.castShadow = false; b.receiveShadow = false;
  }
  bake(g);
  for (let i = 0; i < 7; i++) glowSprite(scene, 0xffa040, 0.14, [-7 + r() * 5, 0.9 + r() * 1.5, -4.6], 0.9); // Kerzen in den Fenstern
  return m;
}

// ---------------- Geschirrspüler ----------------
function buildWasher(scene) {
  const root = new THREE.Group(); scene.add(root); const r = rng(9);
  const brushed = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#c3cad1'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { c.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,52,64'},${r() * 0.14})`; c.fillRect(0, y, w, 1); }
    for (let i = 0; i < 9; i++) { const x = r() * w; const y = r() * h; const s = 8 + r() * 20; const g = c.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, 'rgba(30,40,50,.4)'); g.addColorStop(1, 'rgba(30,40,50,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); }
  });
  const steel = std({ map: brushed, metalness: 0.65, roughness: 0.3 }); const dark = std({ color: 0x16181c, roughness: 0.35 }); const chrome = std({ color: 0xe0e4e8, metalness: 0.95, roughness: 0.15 });
  const fixed = new THREE.Group(); root.add(fixed);
  mesh(rbox(1.2, TOP, 0.85, 0.05), steel, fixed, [0, TOP / 2, FRONT - 0.43]);
  mesh(rbox(1.14, 0.17, 0.07, 0.02), dark, fixed, [0, 0.875, FRONT]);
  mesh(rbox(1.1, 0.07, 0.06, 0.02), dark, fixed, [0, 0.05, FRONT - 0.01]);
  const name = canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#16181c'; c.fillRect(0, 0, w, h); c.fillStyle = '#eceff2'; c.font = 'italic 800 64px Bahnschrift, sans-serif'; c.fillText('TURBOWASH 3000', 14, 70, w - 28); });
  mesh(new THREE.PlaneGeometry(0.5, 0.094), std({ map: name, roughness: 0.3 }), fixed, [-0.27, 0.88, FRONT + 0.037]);
  for (const x of [0.42, 0.51]) mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.04, 16), chrome, fixed, [x, 0.875, FRONT + 0.045], [Math.PI / 2, 0, 0]);
  bake(fixed);

  const disp = document.createElement('canvas'); disp.width = 256; disp.height = 96;
  const dispT = new THREE.CanvasTexture(disp); dispT.colorSpace = THREE.SRGBColorSpace;
  mesh(new THREE.PlaneGeometry(0.24, 0.1), std({ color: 0x000000, emissive: 0xffffff, emissiveMap: dispT, emissiveIntensity: 1.7 }), root, [0.2, 0.878, FRONT + 0.038]);
  let shown = '';
  const display = (text) => {
    if (text === shown) return; shown = text; const c = disp.getContext('2d');
    c.fillStyle = '#080404'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#ff3b22'; c.font = '800 68px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.fillText(text, 128, 74); dispT.needsUpdate = true;
  };
  display('E-13');

  // aufgesprungene Klappe: oben leuchtet es blau heraus, Teller stecken drin
  const inside = std({ color: 0x0a2436, emissive: 0x38b8ff, emissiveIntensity: 1.8 });
  mesh(new THREE.PlaneGeometry(1.06, 0.68), inside, root, [0, 0.45, FRONT + 0.004]);
  const door = new THREE.Group(); door.position.set(0, 0.11, FRONT + 0.035); door.rotation.x = 0.15; root.add(door);
  mesh(rbox(1.1, 0.64, 0.05, 0.022), steel, door, [0, 0.32, 0]); mesh(rbox(0.62, 0.05, 0.07, 0.022), chrome, door, [0, 0.53, 0.05]);
  for (const [x, rz] of [[-0.33, 0.35], [0.05, -0.2], [0.38, -0.4]]) mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.016, 22).rotateX(Math.PI / 2), std({ color: 0xf2f0e8, roughness: 0.2 }), root, [x, 0.71, FRONT + 0.06], [0.2, 0, rz]);
  const bolts = new THREE.Group(); door.add(bolts);
  for (const [x, y] of [[-0.25, 0.28], [0.25, 0.28], [-0.45, 0.1], [0.45, 0.1]]) mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.035, 6).rotateX(Math.PI / 2), chrome, bolts, [x, y, 0.035]);
  const sticker = canvasTex(256, 256, drawBolt);
  mesh(new THREE.PlaneGeometry(0.17, 0.18), std({ map: sticker, transparent: true, alphaTest: 0.3 }), door, [0.36, 0.36, 0.027], [0, 0, -0.2]).castShadow = false;
  return { inside, door, display };
}

function wrenchGeo() {
  const s = new THREE.Shape(); const C = 0.66; const R = 0.125; const n = 0.036; const j = 0.06;
  s.moveTo(-n, 0.02); s.quadraticCurveTo(-n, 0, 0, 0); s.quadraticCurveTo(n, 0, n, 0.02);
  const a0 = Math.asin(n / R) - Math.PI / 2; const a1 = Math.acos(j / R);
  s.lineTo(n, C + Math.sin(a0) * R); s.absarc(0, C, R, a0, a1, false);
  s.lineTo(j, C + 0.005); s.lineTo(0, C - 0.035); s.lineTo(-j, C + 0.005); s.lineTo(-j, C + Math.sin(a1) * R);
  s.absarc(0, C, R, Math.PI - a1, Math.PI - a0, false); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2, curveSegments: 10 }).translate(0, 0, -0.014);
}

// Lichtkegel der Küchenlampe: vorn die Bande hell, links bleibt es dunkel für die Schrift
function spotLamp(scene, shadows) {
  const l = new THREE.SpotLight(0xffd2a0, 4.2, 0, 0.5, 0.85, 0); l.position.set(1.3, 5.0, 4.0); l.target.position.set(0.15, 0.85, 0.2);
  l.castShadow = !!shadows; l.shadow.mapSize.set(2048, 2048); l.shadow.camera.near = 1; l.shadow.camera.far = 14; l.shadow.bias = -0.0003; l.shadow.normalBias = 0.02;
  scene.add(l, l.target); return l;
}

function buildDuck(parent) {
  const g = new THREE.Group(); parent.add(g); const ball = new THREE.SphereGeometry(1, 18, 12); const y = std({ color: 0xffd024, roughness: 0.3 });
  mesh(ball, y, g, [0, 0.07, 0], null, [0.12, 0.085, 0.15]); mesh(ball, y, g, [0, 0.18, 0.08], null, 0.075);
  mesh(ball, std({ color: 0xff7a1a }), g, [0, 0.17, 0.16], null, [0.04, 0.017, 0.04]);
  for (const s of [-1, 1]) mesh(ball, std({ color: 0x111111 }), g, [s * 0.035, 0.205, 0.138], null, 0.014);
  bake(g); return g;
}

export function buildTitel({ renderer, shadows, low }) {
  const scene = new THREE.Scene();
  scene.add(skyDome({ top: 0x02050d, mid: 0x08142b, low: 0x14284a }));
  scene.environment = envFrom(renderer, { top: 0x2c3e58, low: 0x3a4050, bottom: 0x2a1c18, lamps: [{ dir: V3(0.2, 1, 0.5), color: 0xffd9a0, k: 5 }, { dir: V3(-1, 0.4, -0.3), color: 0x6a9cff, k: 3 }] });
  scene.environmentIntensity = 0.5;

  buildRoom(scene); const cityM = buildCity(scene); const washer = buildWasher(scene);

  // Licht: warme Lampe (flackert), Mond durchs Fenster, Blau aus der Maschine, Blitz bei Treffern
  const hemi = new THREE.HemisphereLight(0x5f86c0, 0x3a2418, 0.5); scene.add(hemi);
  const key = spotLamp(scene, shadows);
  const moonL = new THREE.DirectionalLight(0x6f9cff, 1.7); moonL.position.set(-5, 3.2, -2.5); moonL.target.position.set(0, 1, 0); scene.add(moonL, moonL.target);
  const blue = new THREE.PointLight(0x38b8ff, 2.2, 2.6, 1.6); blue.position.set(0, 0.72, FRONT + 0.32); scene.add(blue);
  const flash = new THREE.PointLight(0xffc070, 0, 4, 1.5); flash.position.set(0, 1, 0.9); scene.add(flash);

  const lamp = new THREE.Group(); lamp.position.set(0.15, 3.7, 0); scene.add(lamp);
  mesh(new THREE.CylinderGeometry(0.008, 0.008, 1, 6), std({ color: 0x141414 }), lamp, [0, -0.45, 0]);
  mesh(new THREE.CylinderGeometry(0.07, 0.3, 0.22, 28, 1, true), std({ color: 0xd8b23a, side: THREE.DoubleSide, metalness: 0.3, roughness: 0.35 }), lamp, [0, -0.98, 0]).castShadow = false;
  const bulbM = std({ color: 0xffffff, emissive: 0xffd9a0, emissiveIntensity: 3 });
  mesh(new THREE.SphereGeometry(0.075, 16, 12), bulbM, lamp, [0, -1.07, 0]).castShadow = false;
  const lampGlow = glowSprite(lamp, 0xffc878, 0.9, [0, -1.07, 0.1], 0.7);

  // Sicherungskasten und Kabelsalat
  const deco = new THREE.Group(); scene.add(deco);
  mesh(rbox(0.6, 0.72, 0.16, 0.03), std({ color: 0x9aa3ab, metalness: 0.5, roughness: 0.4 }), deco, [1.72, 2.15, BACK + 0.09]);
  const fuses = canvasTex(256, 300, (c, w, h) => {
    c.fillStyle = '#31363d'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) { c.fillStyle = '#e4e6e8'; c.fillRect(14 + i * 39, 20 + row * 94, 32, 66); c.fillStyle = (row * 6 + i) % 4 ? '#c5161d' : '#23262a'; c.fillRect(21 + i * 39, (row * 6 + i) % 4 ? 54 + row * 94 : 30 + row * 94, 18, 24); }
  });
  mesh(new THREE.PlaneGeometry(0.5, 0.6), std({ map: fuses }), deco, [1.72, 2.15, BACK + 0.172]);
  mesh(rbox(0.56, 0.68, 0.025, 0.01), std({ color: 0xf2c21a, roughness: 0.4 }), deco, [2.2, 2.15, BACK + 0.36], [0, -1.15, 0]);
  const cable = (color) => std({ color, roughness: 0.55 });
  const wires = [
    [0xd23a2a, [[1.55, 1.8, BACK + 0.2], [1.2, 1.3, -0.85], [0.7, 1.55, -0.8], [0.35, 1.0, -0.6]]],
    [0x2a62d8, [[1.6, 2.5, BACK + 0.15], [0.9, 2.05, -1.0], [0.1, 2.45, -1.05], [-0.7, 1.95, -1.0], [-1.5, 3.6, -1.1]]],
    [0x18191c, [[1.85, 2.5, BACK + 0.15], [1.3, 3.3, -0.9], [0.5, 2.7, -0.9], [-0.4, 2.95, -0.8], [-1.0, 3.9, -0.9]]],
    [0xf0c020, [[1.8, 1.8, BACK + 0.2], [1.95, 1.05, -0.55], [1.5, 0.03, 0.0], [1.9, 0.03, 0.9], [1.1, 0.03, 1.25], [0.75, 0.03, 0.6], [0.58, 0.12, 0.1]]],
    [0x18191c, [[-0.55, 0.3, -0.5], [-1.0, 0.03, -0.35], [-2.2, 0.03, 0.2], [-1.6, 0.03, 1.5], [-2.8, 0.03, 1.7]]],
    [0x3aa04a, [[-0.5, 3.9, -0.7], [-0.2, 2.6, -0.8], [0.45, 2.15, -0.75], [0.62, 2.28, -0.7]]],
  ];
  for (const [col, pts] of wires) tube(pts, 0.022, cable(col), deco, 48, 7);
  const ends = [V3(0.62, 2.28, -0.68), V3(1.55, 1.85, BACK + 0.3)];
  // Werkzeugkiste, Steckerleiste
  const red = std({ color: 0xc5281f, metalness: 0.3, roughness: 0.4 }); const black = cable(0x18191c);
  mesh(rbox(0.5, 0.22, 0.28, 0.03), red, deco, [1.62, 0.11, 1.2], [0, -0.4, 0]); mesh(rbox(0.3, 0.04, 0.05, 0.015), black, deco, [1.62, 0.26, 1.2], [0, -0.4, 0]);
  mesh(rbox(0.5, 0.06, 0.13, 0.02), std({ color: 0xe8e8e2 }), deco, [-2.05, 0.03, 1.05], [0, 0.5, 0]);
  bake(deco);

  // Pfütze mit Ente
  const rp = rng(14); const shape = new THREE.Shape();
  for (let i = 0; i <= 28; i++) { const a = i / 28 * TAU; const d = i === 28 ? 1 : 0.82 + rp() * 0.3; const x = Math.cos(a) * 1.25 * d; const y = Math.sin(a) * 0.62 * d; if (i === 0) shape.moveTo(1.25, 0); else shape.lineTo(x, y); }
  const water = std({ color: 0x12354a, roughness: 0.04, metalness: 0.45, transparent: true, opacity: 0.72, envMapIntensity: 2, depthWrite: false });
  mesh(new THREE.ShapeGeometry(shape, 8), water, scene, [0.35, 0.008, 0.95], [-Math.PI / 2, 0, 0]);
  const duck = buildDuck(scene); duck.position.set(0.95, 0, 1.2);

  const sparks = particles(scene, low ? 260 : 560, { additive: true, floor: 0.02 });
  const drops = particles(scene, low ? 160 : 340, { map: dropTex(), floor: 0.02 });
  const steam = particles(scene, 90, { map: puffTex() });
  const hitGlow = glowSprite(scene, 0xffd080, 0.01, [0, 0, 0], 0);

  const wG = wrenchGeo(); const chrome = std({ color: 0xe4eaf0, metalness: 0.45, roughness: 0.22, emissive: 0x2a3138 });
  const wrench = (F) => mesh(wG, chrome, F.root);
  const lookOf = (name) => ({ ...LOOKS.find((l) => l.name === name), bolt: true });
  const red1 = { F: createBuddy(scene, lookOf('Rot')).place(-1.42, 0, 0.42, 1.45), m: 1, period: 1.55, off: 0, hit: V3(-0.63, 0.84, 0.3), n: 0 };
  const yel = { F: createBuddy(scene, lookOf('Gelb')).place(1.42, 0, 0.42, -1.45), m: -1, period: 1.9, off: 0.7, hit: V3(0.63, 0.84, 0.3), n: 0 };
  for (const s of [red1, yel]) { s.tool = wrench(s.F); s.local = V3(); }
  const kneel = { F: createBuddy(scene, lookOf('Blau')).place(-0.78, 0, 0.9, 1.98), local: V3() };
  kneel.tool = wrench(kneel.F);
  const bruno = createBuddy(scene, BRUNO); bruno.place(0, TOP, -0.03, 0);
  const mug = new THREE.Group(); bruno.root.add(mug);
  mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.17, 18), std({ color: 0xc5281f, roughness: 0.25 }), mug);
  mesh(new THREE.TorusGeometry(0.048, 0.015, 8, 16), std({ color: 0xc5281f, roughness: 0.25 }), mug, [-0.085, 0, 0]);
  mesh(new THREE.CircleGeometry(0.066, 18), std({ color: 0x4a2814, roughness: 0.2 }), mug, [0, 0.086, 0], [-Math.PI / 2, 0, 0]);

  const a = V3(); const b = V3(); const dir = V3(); const dir0 = V3(); const grip = V3(); const tmp = V3(); const Y = V3(0, 1, 0);
  let flashK = 0; let laugh = 0; let shake = 0; let dropAcc = 0; let arcT = 1.2; let flick = 3; let flickT = 0;

  function impact(p) {
    flashK = 1; shake = 1; laugh = 1; flash.position.set(p.x, p.y + 0.1, p.z + 0.4); hitGlow.position.copy(p); hitGlow.position.z += 0.1;
    for (let i = 0; i < (low ? 26 : 60); i++) { const an = Math.random() * TAU; const s = 1 + Math.random() * 2.6; sparks.emit(p.x, p.y, p.z, Math.cos(an) * s, 0.6 + Math.random() * 2.6, Math.abs(Math.sin(an)) * s, { life: 0.4 + Math.random() * 0.7, size: 0.11, end: 0.025, gravity: 8, color: Math.random() < 0.3 ? 0xfff2c0 : 0xff9a30, bright: 3, fadeIn: 0.01 }); }
  }

  function swing(S, t) {
    const F = S.F; const m = S.m; const p = F.rest(); const raw = (t + S.off) / S.period; const n = Math.floor(raw); const k = raw - n;
    const up = k < 0.62 ? smooth(0.12, 0.56, k) : k < 0.72 ? 1 - smooth(0.62, 0.72, k) : 0;
    const bounce = k >= 0.72 && k < 0.84 ? Math.sin((k - 0.72) / 0.12 * Math.PI) * 0.12 : 0;
    const u = Math.max(up, bounce);
    p.hip.set(0, 0.77 + u * 0.03, u * -0.03); p.lean = 0.3 - u * 0.38; p.twist = m * u * -0.2; p.head.set(0.08 - u * 0.1, m * -0.75, 0);
    p.foot.L.set(0.19, 0.092, 0.12); p.foot.R.set(-0.17, 0.092, -0.17);
    F.root.updateMatrixWorld(true); S.local.copy(S.hit); F.root.worldToLocal(S.local);
    grip.set(0, 0.93, 0.2).lerp(a.set(m * -0.27, 1.43, 0.3), u);
    dir0.copy(S.local).sub(b.set(0, 0.93, 0.2)).normalize();
    dir.copy(dir0).lerp(tmp.set(m * -0.3, 0.95, -0.3).normalize(), u).normalize();
    const lowH = m > 0 ? 'L' : 'R'; const topH = m > 0 ? 'R' : 'L';
    p.hand[lowH].copy(grip).addScaledVector(dir, 0.06); p.hand[topH].copy(grip).addScaledVector(dir, 0.22);
    p.axis.L.copy(dir); p.axis.R.copy(dir); p.pole.L.set(0.9, -0.6, -0.2); p.pole.R.set(-0.9, -0.6, -0.2);
    F.face(up > 0.5 ? 'o' : 'grit', 0.4, 0, 0.85); F.apply(t);
    S.tool.position.copy(grip); S.tool.quaternion.setFromUnitVectors(Y, dir);
    if (k >= 0.72 && S.n !== n + 1) { S.n = n + 1; impact(S.hit); }
  }

  function kneelPose(t) {
    const F = kneel.F; const p = F.rest(); const w = Math.sin(t * 4.2);
    p.hip.set(0, 0.43, -0.05); p.lean = 0.34; p.twist = w * 0.06; p.head.set(-0.12, -1.0, 0);
    p.foot.R.set(-0.15, 0.1, -0.43); p.knee.R.set(0, -1, 0.8); p.toe.R = 1.1; p.foot.L.set(0.18, 0.092, 0.34); p.knee.L.set(0.2, 1, 0.6);
    F.root.updateMatrixWorld(true); kneel.local.set(-0.36, 0.36, FRONT + 0.12); F.root.worldToLocal(kneel.local);
    dir.set(0.62, -0.18 + w * 0.36, 0.6).normalize(); grip.copy(kneel.local).addScaledVector(dir, -0.62);
    p.hand.L.copy(grip).addScaledVector(dir, 0.07); p.hand.R.copy(grip).addScaledVector(dir, 0.22);
    p.axis.L.copy(dir); p.axis.R.copy(dir); p.pole.L.set(0.8, -0.3, -0.4); p.pole.R.set(-0.8, -0.5, -0.3);
    F.face('frown', -0.42, 0.5); F.look(-0.8, 0.2); F.apply(t);
    kneel.tool.position.copy(grip); kneel.tool.quaternion.setFromUnitVectors(Y, dir);
  }

  function brunoPose(t) {
    const F = bruno; const p = F.rest(); const ha = laugh * Math.sin(t * 21);
    p.hip.set(0, 0.115, 0.03); p.lean = -0.14 - laugh * 0.1 + ha * 0.03; p.roll = Math.sin(t * 1.2) * 0.03;
    p.head.set(-0.08 - laugh * 0.14 + ha * 0.04, Math.sin(t * 0.55) * 0.28, 0);
    for (const [key, s] of [['L', 1], ['R', -1]]) { const sw = Math.sin(t * 3 + (s > 0 ? 0 : Math.PI)); p.foot[key].set(s * 0.17, -0.25 + Math.max(0, sw) * 0.07, 0.5 + Math.max(0, sw) * 0.1); p.knee[key].set(0, 1, 0.3); p.toe[key] = -0.15; }
    p.hand.L.set(0.45, 0.05, -0.1); p.pole.L.set(0.7, 0, -0.7);
    const cheer = smooth(0.3, 0.7, Math.sin(t * 0.7) * 0.5 + 0.5);
    p.hand.R.set(-0.48 - cheer * 0.05, 0.62 + cheer * 0.38, 0.3 - cheer * 0.06); p.pole.R.set(-1, -0.7, -0.1); p.axis.R.set(0, 1, 0);
    F.face('grin', 0.2, 0, laugh > 0.45 ? 0.5 : 1); F.look(Math.sin(t * 0.8), -0.2); F.apply(t);
    tmp.set(0, 0.03, 0.12); F.hands.R.localToWorld(tmp); F.root.worldToLocal(tmp);
    mug.position.copy(tmp); mug.position.y += 0.06; mug.rotation.z = -cheer * 0.12;
  }

  const S = { scene, exposure: 1.15, power: 1, shake: 0, view: { pos: V3(1.35, 1.7, 6.3), at: V3(0.02, 1.15, 0.1), w: 3.9, h: 2.72 } };
  S.update = (t, dt, calm = false) => {
    scene.updateMatrixWorld();
    swing(red1, t); swing(yel, t); kneelPose(t); brunoPose(t);
    flashK = Math.max(0, flashK - dt * 5.5); laugh = Math.max(0, laugh - dt * 1.3); shake = Math.max(0, shake - dt * 5);
    // Aussetzer: höchstens zweimal kurz hintereinander dunkler, alle paar Sekunden (kein Stroboskop); bei „weniger Bewegung“ gar nicht
    flick -= dt; if (flick <= 0) { flick = 3.5 + Math.random() * 4; flickT = 0.9; }
    flickT = Math.max(0, flickT - dt);
    let power = !calm && ((flickT > 0.7 && flickT < 0.84) || (flickT > 0.05 && flickT < 0.32)) ? 0.3 : 1;
    if (!calm) power = Math.min(power, 1 - flashK * 0.15);
    key.intensity = 4.2 * power; hemi.intensity = 0.4 + 0.1 * power; bulbM.emissiveIntensity = 3.2 * power; lampGlow.material.opacity = 0.7 * power;
    lamp.rotation.z = Math.sin(t * 1.5) * 0.05;
    flash.intensity = flashK * 9; hitGlow.material.opacity = flashK; hitGlow.scale.setScalar(0.3 + flashK * 1.3);
    blue.intensity = 1.8 + Math.sin(t * 17) * 0.4 + flashK * 2; washer.inside.emissiveIntensity = 1.6 + Math.sin(t * 17) * 0.4;
    cityM.emissiveIntensity = power < 0.5 ? 0.55 : 0.02; // beim Aussetzer zuckt kurz die Stadt auf
    washer.display(flashK > 0.2 ? 'AUA' : (t % 1) < 0.65 ? 'E-13' : ''); washer.door.rotation.x = 0.15 + flashK * 0.06;

    dropAcc += dt * (low ? 50 : 95);
    while (dropAcc >= 1) {
      dropAcc -= 1; const x = Math.random() < 0.75 ? 0.22 + Math.random() * 0.3 : -0.5 + Math.random();
      drops.emit(x, 0.72, FRONT + 0.14, (Math.random() - 0.3) * 0.5, 0.3 + Math.random() * 0.6, 0.5 + Math.random() * 0.8, { life: 0.8 + Math.random() * 0.4, size: 0.06, end: 0.035, gravity: 6, color: 0x9fe2ff, alpha: 0.85, fadeIn: 0.02 });
      if (Math.random() < 0.09) steam.emit(x, 0.8, FRONT + 0.1, (Math.random() - 0.5) * 0.2, 0.35, 0.2, { life: 1.8, size: 0.16, end: 0.75, alpha: 0.2, color: 0xcfeaff, spin: 0.5 });
    }
    arcT -= dt;
    if (arcT <= 0) { arcT = 0.5 + Math.random() * 1.4; const e = ends[Math.floor(Math.random() * ends.length)]; for (let i = 0; i < 18; i++) sparks.emit(e.x, e.y, e.z, (Math.random() - 0.5) * 1.6, Math.random() * 1.1, 0.4 + Math.random(), { life: 0.4 + Math.random() * 0.5, size: 0.06, end: 0.02, gravity: 6, color: 0x8fd0ff, bright: 3, fadeIn: 0.01 }); }
    duck.position.y = 0.004 + Math.max(0, Math.sin(t * 5)) * 0.01; duck.rotation.y = -0.6 + Math.sin(t * 0.7) * 0.5;
    sparks.step(dt); drops.step(dt); steam.step(dt);
    S.power = clamp(power, 0, 1); S.shake = shake;
  };
  return S;
}
