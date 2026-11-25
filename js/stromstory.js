// Theos Seitenscheidel - Strom aus wegen Brunos Geschirrspüler: die beiden Filmszenen.
// Vorspann: Big Bruno (weißes Shirt mit BRUNO drauf) stopft seinen Geschirrspüler voll, Turbo-Programm, Knall, die ganze Stadt wird dunkel.
// Abspann: Die letzten 5.000 kWh fliegen vom Bunker über den Wald in Brunos Küche, der Geschirrspüler blitzt auf und läuft wieder.
// Brunos Küche ist ein eigenes Set weit hinter dem Depot (außerhalb der Karte, man kommt zu Fuß nie hin). Die Stadt-Aufnahmen spielen in der echten Welt.
// Jeder spielt die Szenen bei sich ab. Überspringen: Esc, oder Leertaste/E gedrückt halten.
import * as THREE from './vendor/three.module.min.js';
import { personPlain } from './stromart.js';
import { walkTo, faceTo } from './casinofig.js';
import { SPOTS, kwh, euro } from './stromlogic.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const KX = 640; const KZ = 0; // Brunos Küche (Mitte des Raums am Boden)
const HOUSE = { x: 138, z: 17 }; // Brunos Haus: Nordseite der Hauptstraße
const BRUNO = { shirt: 0xf2ede2, cap: 0x17171a, hair: 0x1a1410, skin: 0xd8a47e, pants: 0xe8e2d4, shoe: 0x2a2c30, print: 'BRUNO', chain: true, face: 'grin' }; // wie auf dem Startbildschirm
const K3 = (x, y, z) => V3(KX + x, y, KZ + z);

function ctex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, ...o });
const glowTex = () => ctex(64, 64, (c, w, h) => { const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); });

// ---------------- Brunos Küche ----------------
function buildKitchen(scene) {
  const g = new THREE.Group(); g.position.set(KX, 0, KZ); scene.add(g);
  const add = (geo, mat, x, y, z, o = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = false; m.receiveShadow = false; (o.parent || g).add(m); return m; };
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d); const P = (w, h) => new THREE.PlaneGeometry(w, h);
  const W0 = -2.6; const W1 = 2.6; const Z0 = -2.0; const Z1 = 2.4; const H = 2.6;
  // Boden, Wände, Decke
  const floorT = ctex(512, 512, (c, w, h) => { const n = 8; const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { c.fillStyle = (i + j) % 2 ? '#d9d2c2' : '#8c3a34'; c.fillRect(i * s, j * s, s, s); } c.strokeStyle = 'rgba(40,30,20,.35)'; c.lineWidth = 3; for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, h); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(w, i * s); c.stroke(); } for (let k = 0; k < 900; k++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); } }, [(W1 - W0) / 2.4, (Z1 - Z0) / 2.4]);
  add(P(W1 - W0, Z1 - Z0), std({ map: floorT, roughness: 0.45 }), 0, 0, (Z0 + Z1) / 2, { rx: -Math.PI / 2 });
  const paper = ctex(256, 256, (c, w, h) => { c.fillStyle = '#e9dcbc'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(190,150,90,.22)'; for (let x = 0; x < w; x += 32) c.fillRect(x, 0, 10, h); for (let y = 0; y < h; y += 32) for (let x = 0; x < w; x += 32) { c.fillStyle = 'rgba(160,110,60,.25)'; c.beginPath(); c.arc(x + 21, y + 16, 3, 0, 7); c.fill(); } }, [5, 2.6]);
  const wallM = std({ map: paper, roughness: 0.92 });
  add(P(W1 - W0, H), wallM, 0, H / 2, Z0); add(P(W1 - W0, H), wallM, 0, H / 2, Z1, { ry: Math.PI }); add(P(Z1 - Z0, H), wallM, W0, H / 2, (Z0 + Z1) / 2, { ry: Math.PI / 2 }); add(P(Z1 - Z0, H), wallM, W1, H / 2, (Z0 + Z1) / 2, { ry: -Math.PI / 2 });
  add(P(W1 - W0, Z1 - Z0), std({ color: 0xf2efe8, roughness: 0.95 }), 0, H, (Z0 + Z1) / 2, { rx: Math.PI / 2 });
  const skirt = std({ color: 0x6a4a32, roughness: 0.7 }); add(B(W1 - W0, 0.08, 0.02), skirt, 0, 0.04, Z1 - 0.01); add(B(0.02, 0.08, Z1 - Z0), skirt, W0 + 0.01, 0.04, (Z0 + Z1) / 2); add(B(0.02, 0.08, Z1 - Z0), skirt, W1 - 0.01, 0.04, (Z0 + Z1) / 2);
  // Fliesenspiegel hinter der Arbeitsplatte
  const tileT = ctex(256, 256, (c, w, h) => { c.fillStyle = '#9a9890'; c.fillRect(0, 0, w, h); const s = w / 4; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const gr = c.createLinearGradient(i * s, j * s, i * s + s, j * s + s); gr.addColorStop(0, '#f6f4ee'); gr.addColorStop(1, (i + j) % 3 ? '#e2ddd2' : '#cfe0e4'); c.fillStyle = gr; c.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); } }, [4.4 / 0.6, 0.6 / 0.6]);
  add(P(4.4, 0.6), std({ map: tileT, roughness: 0.25 }), 0.35, 1.25, Z0 + 0.005);
  // Unterschränke, Platte, Spüle
  const carcass = std({ color: 0xece6da, roughness: 0.8 }); const front = std({ color: 0x3f6f78, roughness: 0.55 }); const steel = std({ color: 0xc4c8cc, metalness: 0.85, roughness: 0.32 }); const dark = std({ color: 0x1c1d20, roughness: 0.7 });
  const handle = (x, y, z, w = 0.14) => add(B(w, 0.016, 0.022), steel, x, y, z);
  for (const [a, b] of [[-1.85, -0.005], [0.605, 2.55]]) { const w = b - a; const cx = (a + b) / 2; add(B(w, 0.82, 0.58), carcass, cx, 0.51, Z0 + 0.31); add(B(w, 0.1, 0.5), dark, cx, 0.05, Z0 + 0.27);
    const n = Math.max(1, Math.round(w / 0.6)); const dw = w / n; for (let i = 0; i < n; i++) { const fx = a + dw * (i + 0.5); add(B(dw - 0.008, 0.6, 0.02), front, fx, 0.41, Z0 + 0.61); add(B(dw - 0.008, 0.19, 0.02), front, fx, 0.815, Z0 + 0.61); handle(fx, 0.84, Z0 + 0.635); handle(fx, 0.66, Z0 + 0.635); } }
  const topT = ctex(256, 64, (c, w, h) => { c.fillStyle = '#38332e'; c.fillRect(0, 0, w, h); for (let k = 0; k < 600; k++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.2)'; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } }, [3, 1]);
  add(B(4.42, 0.04, 0.64), std({ map: topT, roughness: 0.35 }), 0.35, 0.94, Z0 + 0.32);
  add(B(0.58, 0.012, 0.44), steel, -1.0, 0.962, Z0 + 0.3); add(B(0.5, 0.01, 0.36), std({ color: 0x5a5e62, metalness: 0.7, roughness: 0.45 }), -1.0, 0.967, Z0 + 0.3);
  add(new THREE.CylinderGeometry(0.018, 0.022, 0.3, 12), steel, -1.0, 1.1, Z0 + 0.08); add(B(0.03, 0.03, 0.2), steel, -1.0, 1.24, Z0 + 0.17); add(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 10), steel, -1.0, 1.21, Z0 + 0.26);
  // Hängeschränke mit Licht darunter
  for (let i = 0; i < 4; i++) { const fx = 0.05 + 0.6 * i + 0.3; add(B(0.6, 0.7, 0.34), carcass, fx, 1.85, Z0 + 0.17); add(B(0.592, 0.69, 0.02), front, fx, 1.85, Z0 + 0.35); handle(fx, 1.56, Z0 + 0.375, 0.1); }
  const underM = std({ color: 0x222222, emissive: 0xfff0d0, emissiveIntensity: 2.2 }); add(B(2.3, 0.02, 0.05), underM, 1.25, 1.49, Z0 + 0.28);
  // Fenster über der Spüle: draußen die Stadt bei Nacht (Lichter gehen aus und wieder an)
  const sky = (lit) => ctex(512, 384, (c, w, h) => { const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, lit ? '#000' : '#0a1430'); gr.addColorStop(1, lit ? '#000' : '#26324a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); if (!lit) { c.fillStyle = '#f0f0e0'; c.beginPath(); c.arc(410, 70, 22, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; for (let k = 0; k < 40; k++) c.fillRect(Math.random() * w, Math.random() * h * 0.45, 1.5, 1.5); }
    let x = -10; let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; while (x < w) { const bw = 50 + r() * 70; const bh = 120 + r() * 200; c.fillStyle = lit ? '#000' : '#141a26'; c.fillRect(x, h - bh, bw, bh); for (let yy = h - bh + 12; yy < h - 10; yy += 22) for (let xx = x + 8; xx < x + bw - 12; xx += 16) { const on = r() < 0.55; if (lit && on) { c.fillStyle = r() < 0.5 ? '#ffd890' : '#ffe8c0'; c.fillRect(xx, yy, 9, 12); } else if (!lit) { c.fillStyle = on ? '#3a3a40' : '#1c2230'; c.fillRect(xx, yy, 9, 12); } } x += bw + 4; } });
  const winM = std({ map: sky(false), emissive: 0xffffff, emissiveMap: sky(true), emissiveIntensity: 1.2, roughness: 0.55 });
  add(P(1.1, 0.88), winM, -1.0, 1.6, Z0 + 0.01); const frameM = std({ color: 0xf4f2ec, roughness: 0.6 });
  for (const [w, h2, x, y] of [[1.22, 0.06, -1.0, 2.07], [1.22, 0.06, -1.0, 1.13], [0.06, 1.0, -1.58, 1.6], [0.06, 1.0, -0.42, 1.6], [0.04, 0.9, -1.0, 1.6], [1.1, 0.04, -1.0, 1.75]]) add(B(w, h2, 0.06), frameM, x, y, Z0 + 0.03);
  add(B(1.3, 0.03, 0.14), frameM, -1.0, 1.1, Z0 + 0.07); const curtain = std({ color: 0xc8463a, roughness: 0.9, side: THREE.DoubleSide }); for (const s of [-1, 1]) add(B(0.22, 1.05, 0.02), curtain, -1.0 + s * 0.68, 1.62, Z0 + 0.09);
  // Kühlschrank mit Magneten
  add(B(0.7, 1.86, 0.64), std({ color: 0xf0ece2, roughness: 0.4 }), -2.22, 0.93, Z0 + 0.33); add(B(0.7, 0.012, 0.01), dark, -2.22, 1.25, Z0 + 0.655); add(B(0.03, 0.4, 0.04), steel, -1.93, 1.5, Z0 + 0.67); add(B(0.03, 0.3, 0.04), steel, -1.93, 1.02, Z0 + 0.67);
  for (const [x, y, col] of [[-2.38, 1.6, 0xe03a2a], [-2.12, 1.72, 0x2a6ae0], [-2.3, 1.38, 0xf0c21a], [-2.05, 1.45, 0x3ab04a]]) add(B(0.05, 0.05, 0.015), std({ color: col, roughness: 0.4 }), x, y, Z0 + 0.66);
  add(P(0.22, 0.28), std({ map: ctex(128, 160, (c, w, h) => { c.fillStyle = '#fffdf2'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0332a'; c.font = '800 20px Bahnschrift'; c.textAlign = 'center'; c.fillText('EINKAUF', w / 2, 28); c.fillStyle = '#1a1a1a'; c.font = '500 17px Bahnschrift'; ['Spüli', 'Tabs (100)', 'Döner', 'neue Pfanne?'].forEach((t, i) => c.fillText(t, w / 2, 62 + i * 24)); }) }), -2.22, 1.6, Z0 + 0.652);
  // Der Geschirrspüler: offener Kasten, Klappe unten angeschlagen, Körbe mit Geschirr
  const dw = new THREE.Group(); dw.position.set(0.3, 0, 0); g.add(dw); const inner = std({ color: 0xcfd4d8, metalness: 0.5, roughness: 0.35 });
  add(B(0.02, 0.82, 0.58), inner, -0.29, 0.51, Z0 + 0.31, { parent: dw }); add(B(0.02, 0.82, 0.58), inner, 0.29, 0.51, Z0 + 0.31, { parent: dw }); add(B(0.6, 0.02, 0.58), inner, 0, 0.91, Z0 + 0.31, { parent: dw }); add(B(0.6, 0.02, 0.58), inner, 0, 0.11, Z0 + 0.31, { parent: dw }); add(B(0.6, 0.82, 0.02), inner, 0, 0.51, Z0 + 0.03, { parent: dw }); add(B(0.6, 0.1, 0.5), dark, 0, 0.05, Z0 + 0.27, { parent: dw });
  const rackM = std({ color: 0x8a9096, metalness: 0.6, roughness: 0.4 }); for (const y of [0.18, 0.55]) { add(B(0.54, 0.012, 0.012), rackM, 0, y, Z0 + 0.07, { parent: dw }); add(B(0.54, 0.012, 0.012), rackM, 0, y, Z0 + 0.57, { parent: dw }); add(B(0.012, 0.012, 0.5), rackM, -0.27, y, Z0 + 0.32, { parent: dw }); add(B(0.012, 0.012, 0.5), rackM, 0.27, y, Z0 + 0.32, { parent: dw }); for (let k = -2; k <= 2; k++) add(B(0.008, 0.008, 0.5), rackM, k * 0.1, y, Z0 + 0.32, { parent: dw }); }
  const dirtyT = ctex(128, 128, (c, w, h) => { c.fillStyle = '#f4f2ec'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(0,0,0,.12)'; c.lineWidth = 4; c.beginPath(); c.arc(64, 64, 44, 0, 7); c.stroke(); for (const [col, n] of [['rgba(170,40,20,.75)', 5], ['rgba(110,70,30,.7)', 7], ['rgba(220,170,40,.6)', 3]]) for (let k = 0; k < n; k++) { c.fillStyle = col; c.beginPath(); c.ellipse(20 + Math.random() * 88, 20 + Math.random() * 88, 4 + Math.random() * 12, 3 + Math.random() * 8, Math.random() * 3, 0, 7); c.fill(); } });
  const plateDirty = std({ map: dirtyT, roughness: 0.6 }); const plateClean = std({ color: 0xffffff, roughness: 0.12, metalness: 0.05, emissive: 0xffffff, emissiveIntensity: 0.05 });
  const plates = []; const plateG = new THREE.CylinderGeometry(0.1, 0.1, 0.012, 22).rotateZ(Math.PI / 2); for (let i = 0; i < 7; i++) plates.push(add(plateG, plateDirty, -0.21 + i * 0.07, 0.29, Z0 + 0.36 + (i % 2) * 0.03, { parent: dw, rz: (i - 3) * 0.04 }));
  const cupG = new THREE.CylinderGeometry(0.035, 0.03, 0.08, 14); const cups = []; for (let i = 0; i < 5; i++) cups.push(add(cupG, plateDirty, -0.2 + i * 0.1, 0.61, Z0 + 0.22 + (i % 2) * 0.16, { parent: dw, rx: Math.PI }));
  const panM = std({ color: 0x222224, metalness: 0.5, roughness: 0.45 }); const pan = new THREE.Group(); pan.position.set(0.12, 0.66, Z0 + 0.42); pan.rotation.set(-0.5, 0.2, 0.15); dw.add(pan); add(new THREE.CylinderGeometry(0.13, 0.11, 0.045, 22), panM, 0, 0, 0, { parent: pan }); add(B(0.03, 0.025, 0.24), std({ color: 0x3a2a1c, roughness: 0.6 }), 0, 0.01, -0.24, { parent: pan });
  const grill = new THREE.Group(); grill.position.set(-0.12, 0.74, Z0 + 0.34); grill.rotation.set(0.35, 0.1, 0.5); dw.add(grill); const rust = std({ color: 0x5a3a24, metalness: 0.4, roughness: 0.75 }); for (const s of [-1, 1]) { add(B(0.4, 0.012, 0.012), rust, 0, 0, s * 0.15, { parent: grill }); add(B(0.012, 0.012, 0.3), rust, s * 0.2, 0, 0, { parent: grill }); } for (let k = -4; k <= 4; k++) add(B(0.006, 0.006, 0.3), rust, k * 0.042, 0, 0, { parent: grill });
  // Klappe: Drehpunkt unten vorn, außen Edelstahl, innen hell, oben die Bedienleiste mit Anzeige
  const brushed = ctex(128, 128, (c, w, h) => { c.fillStyle = '#cdd2d8'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '40,50,60'},${Math.random() * 0.1})`; c.fillRect(0, y, w, 1); } });
  const doorOut = std({ map: brushed, metalness: 0.55, roughness: 0.38, emissive: 0xcfeaff, emissiveIntensity: 0 });
  const pivot = new THREE.Group(); pivot.position.set(0, 0.1, Z0 + 0.61); dw.add(pivot); const doorMats = [inner, inner, inner, inner, doorOut, inner]; add(B(0.598, 0.8, 0.04), doorMats, 0, 0.4, 0.02, { parent: pivot });
  add(B(0.598, 0.09, 0.046), dark, 0, 0.755, 0.023, { parent: pivot }); add(B(0.3, 0.02, 0.03), steel, 0, 0.67, 0.055, { parent: pivot });
  const disp = document.createElement('canvas'); disp.width = 256; disp.height = 72; const dispT = new THREE.CanvasTexture(disp); dispT.colorSpace = THREE.SRGBColorSpace; const dispM = std({ color: 0x000000, emissive: 0xffffff, emissiveMap: dispT, emissiveIntensity: 1.6 }); add(P(0.17, 0.048), dispM, 0.13, 0.755, 0.047, { parent: pivot });
  add(P(0.2, 0.035), std({ map: ctex(256, 44, (c, w, h) => { c.fillStyle = '#1c1d20'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8e8e8'; c.font = 'italic 800 30px Bahnschrift'; c.textAlign = 'left'; c.fillText('TURBOWASH 3000', 4, 32); }) }), -0.12, 0.755, 0.047, { parent: pivot });
  const ledM = std({ color: 0x220000, emissive: 0xff2a1a, emissiveIntensity: 0 }); add(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 10), ledM, 0.03, 0.755, 0.047, { parent: pivot, rx: Math.PI / 2 }); add(new THREE.CylinderGeometry(0.016, 0.016, 0.01, 14), steel, 0.255, 0.755, 0.048, { parent: pivot, rx: Math.PI / 2 });
  // Sicherungskasten an der rechten Wand
  add(B(0.1, 0.5, 0.4), std({ color: 0xcfd2d4, roughness: 0.5, metalness: 0.2 }), W1 - 0.05, 1.65, -0.9); add(P(0.36, 0.44), std({ map: ctex(144, 176, (c, w, h) => { c.fillStyle = '#e8eaec'; c.fillRect(0, 0, w, h); for (let r = 0; r < 3; r++) for (let k = 0; k < 6; k++) { c.fillStyle = '#2a2a2e'; c.fillRect(12 + k * 21, 22 + r * 52, 16, 34); c.fillStyle = r === 1 && k === 3 ? '#e03a2a' : '#f4f4f4'; c.fillRect(15 + k * 21, 30 + r * 52, 10, 12); } c.fillStyle = '#f2c21a'; c.beginPath(); c.moveTo(w - 30, 8); c.lineTo(w - 10, 8); c.lineTo(w - 20, 2); c.fill(); }) }), W1 - 0.101, 1.65, -0.9, { ry: -Math.PI / 2 });
  add(P(0.14, 0.12), std({ map: ctex(64, 56, (c, w, h) => { c.fillStyle = '#f2c21a'; c.beginPath(); c.moveTo(w / 2, 2); c.lineTo(w - 2, h - 2); c.lineTo(2, h - 2); c.fill(); c.fillStyle = '#16171a'; c.font = '900 34px Bahnschrift'; c.textAlign = 'center'; c.fillText('⚡', w / 2, h - 10); }), transparent: true }), W1 - 0.102, 1.98, -0.9, { ry: -Math.PI / 2 });
  // Tisch, Stühle, Pizzakarton, Uhr, Kalender, Tür
  const wood = std({ color: 0x9a6a42, roughness: 0.6 }); add(B(1.2, 0.04, 0.75), wood, -0.9, 0.74, 0.95); for (const [dx, dz] of [[-0.55, -0.32], [0.55, -0.32], [-0.55, 0.32], [0.55, 0.32]]) add(B(0.05, 0.72, 0.05), wood, -0.9 + dx, 0.36, 0.95 + dz);
  add(B(0.36, 0.045, 0.36), std({ map: ctex(128, 128, (c, w, h) => { c.fillStyle = '#d8b482'; c.fillRect(0, 0, w, h); c.fillStyle = '#b8201a'; c.font = '900 30px Bahnschrift'; c.textAlign = 'center'; c.fillText('PIZZA', w / 2, 74); }) }), -0.75, 0.784, 0.9, { ry: 0.3 });
  const chairM = std({ color: 0x6a4630, roughness: 0.65 }); const chair = (x, z, ry) => { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; g.add(c); add(B(0.42, 0.04, 0.42), chairM, 0, 0.45, 0, { parent: c }); add(B(0.42, 0.46, 0.035), chairM, 0, 0.7, 0.2, { parent: c }); for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add(B(0.035, 0.45, 0.035), chairM, dx, 0.225, dz, { parent: c }); return c; };
  chair(-0.9, 1.5, 0); chair(-1.65, 0.95, -Math.PI / 2); const chairDW = chair(0.3, -0.25, 0); chairDW.visible = false;
  add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 32), std({ map: ctex(128, 128, (c, w, h) => { c.fillStyle = '#fafaf4'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill(); c.strokeStyle = '#1a1a1a'; c.lineWidth = 5; c.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c.fillStyle = '#1a1a1a'; c.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 2, 4, 4); } c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(Math.PI * 2 * 8.67 / 12) * 30, 64 - Math.cos(Math.PI * 2 * 8.67 / 12) * 30); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(Math.PI * 2 * 40 / 60) * 46, 64 - Math.cos(Math.PI * 2 * 40 / 60) * 46); c.stroke(); }) }), W0 + 0.02, 1.95, 0.6, { rz: -Math.PI / 2, ry: Math.PI / 2 });
  add(P(0.34, 0.46), std({ map: ctex(170, 230, (c, w, h) => { c.fillStyle = '#fffdf4'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0332a'; c.fillRect(0, 0, w, 60); c.fillStyle = '#fff'; c.font = '800 34px Bahnschrift'; c.textAlign = 'center'; c.fillText('FREITAG', w / 2, 44); c.fillStyle = '#1a1a1a'; c.font = '900 110px Bahnschrift'; c.fillText('13', w / 2, 170); c.font = '600 18px Bahnschrift'; c.fillText('Spülmaschine!!', w / 2, 214); }) }), W0 + 0.01, 1.55, -1.2, { ry: Math.PI / 2 });
  const door = new THREE.Group(); door.position.set(W1 - 0.03, 0, 1.0); g.add(door); add(B(0.04, 2.05, 0.9), std({ color: 0xe8e0cc, roughness: 0.6 }), 0, 1.025, 0.45, { parent: door }); add(B(0.05, 0.03, 0.14), steel, -0.04, 1.02, 0.8, { parent: door }); add(B(0.06, 2.12, 0.06), frameM, W1 - 0.03, 1.06, 0.97); add(B(0.06, 2.12, 0.06), frameM, W1 - 0.03, 1.06, 1.93); add(B(0.06, 0.06, 1.0), frameM, W1 - 0.03, 2.1, 1.45);
  add(P(0.9, 2.05), std({ color: 0x0c0c10 }), W1 + 0.02, 1.025, 1.45, { ry: -Math.PI / 2 });
  // Deckenlampe und Lichter
  add(new THREE.CylinderGeometry(0.006, 0.006, 0.45, 6), dark, 0, H - 0.22, 0.1); const shadeM = std({ color: 0xc8463a, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffd8a0, emissiveIntensity: 0.25 }); add(new THREE.CylinderGeometry(0.09, 0.27, 0.2, 24, 1, true), shadeM, 0, H - 0.52, 0.1); const bulbM = std({ color: 0xffffff, emissive: 0xfff0d0, emissiveIntensity: 4 }); add(new THREE.SphereGeometry(0.05, 14, 10), bulbM, 0, H - 0.56, 0.1);
  const light = (col, i, d, x, y, z) => { const l = new THREE.PointLight(col, i, d, 1.4); l.position.set(x, y, z); l.castShadow = false; g.add(l); return l; };
  const L = { lamp: light(0xffe2b8, 16, 9, 0, H - 0.65, 0.1), fill: light(0xffe2b8, 4, 8, 0.2, 1.4, 1.9), under: light(0xfff0d0, 2.5, 2.6, 1.2, 1.35, Z0 + 0.45), moon: light(0x7090d8, 0, 6, -1.0, 1.6, Z0 + 0.5), spark: light(0xffb050, 0, 5, 0.3, 1.0, Z0 + 0.75), flash: light(0xd8f0ff, 0, 12, 0.3, 0.7, Z0 + 1.0), blue: light(0x6ab8ff, 0, 4, 0.3, 0.6, Z0 + 0.8) };
  const K = { g, dw, pivot, plates, cups, plateDirty, plateClean, doorOut, ledM, door, chairDW, L, winM, shadeM, bulbM, underM, dispT, disp, power: 1, door0: 0, doorK: 0 };
  K.setPower = (k) => { K.power = k; L.lamp.intensity = 16 * k; L.fill.intensity = 4 * k; L.under.intensity = 2.5 * k; L.moon.intensity = 2.2 * (1 - k); shadeM.emissiveIntensity = 0.25 * k; bulbM.emissiveIntensity = 4 * k; underM.emissiveIntensity = 2.2 * k; };
  K.setCity = (k) => { winM.emissiveIntensity = 1.2 * k; };
  K.display = (text, col = '#ff5a3a') => { const c = disp.getContext('2d'); c.fillStyle = '#050505'; c.fillRect(0, 0, 256, 72); if (text) { c.fillStyle = col; c.font = '800 46px Bahnschrift'; c.textAlign = 'center'; c.fillText(text, 128, 52); } dispT.needsUpdate = true; };
  K.clean = (on) => { for (const p of [...plates, ...cups]) p.material = on ? plateClean : plateDirty; pan.children[0].material = on ? std({ color: 0x3a3a40, metalness: 0.8, roughness: 0.2 }) : panM; };
  K.reset = () => { K.setPower(1); K.setCity(1); K.display(''); K.clean(false); pivot.rotation.x = 0; door.rotation.y = 0; dw.position.set(0.3, 0, 0); doorOut.emissiveIntensity = 0; ledM.emissiveIntensity = 0; chairDW.visible = false; for (const k of ['spark', 'flash', 'blue']) L[k].intensity = 0; };
  K.reset(); return K;
}

// ---------------- Funken (Punkte, additiv) ----------------
function createSparks(scene, n = 320) {
  const pos = new Float32Array(n * 3); const col = new Float32Array(n * 3); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.065, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, map: glowTex() })); pts.frustumCulled = false; scene.add(pts);
  const P = []; for (let i = 0; i < n; i++) P.push({ life: 0, v: V3(), c: new THREE.Color() }); let next = 0;
  return {
    emit(at, k, speed = 3, color = 0xffc860, up = 1) { for (let i = 0; i < k; i++) { const j = next; next = (next + 1) % n; const p = P[j]; p.life = 0.5 + Math.random() * 0.6; pos[j * 3] = at.x; pos[j * 3 + 1] = at.y; pos[j * 3 + 2] = at.z; p.v.set((Math.random() - 0.5) * speed, Math.random() * speed * up, (Math.random() - 0.5) * speed + speed * 0.25); p.c.setHex(color); } },
    step(dt) { for (let i = 0; i < n; i++) { const p = P[i]; if (p.life <= 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; } p.life -= dt * 1.4; p.v.y -= 9.8 * dt; pos[i * 3] += p.v.x * dt; pos[i * 3 + 1] = Math.max(0.01, pos[i * 3 + 1] + p.v.y * dt); pos[i * 3 + 2] += p.v.z * dt; if (pos[i * 3 + 1] <= 0.011) { p.v.y *= -0.3; p.v.x *= 0.5; p.v.z *= 0.5; } const f = Math.max(0, p.life) * 1.6; col[i * 3] = p.c.r * f; col[i * 3 + 1] = p.c.g * f; col[i * 3 + 2] = p.c.b * f; } geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; },
    clear() { for (const p of P) p.life = 0; col.fill(0); geo.attributes.color.needsUpdate = true; },
  };
}

// ---------------- Big Bruno: Figur vom Startbildschirm, Shirt mit BRUNO, Goldkette ----------------
function createBruno(scene) {
  const p = personPlain(scene, BRUNO); p.setVisible(false);
  return p;
}

// ---------------- Die Szenen ----------------
export function createStory(X) {
  const { C, $, snd, hud, onEnd } = X;
  const ST = { on: false, kind: null, t: 0, pt: 0, hold: 0, shake: 0, K: null, sp: null, bruno: null, inside: false, min: 1240, look: V3(), loop: null };
  const cue = (at) => ST.pt < at && ST.t >= at;
  function ensure() {
    if (ST.K) return; const scene = C.W.scene; ST.K = buildKitchen(scene); ST.sp = createSparks(scene); ST.bruno = createBruno(scene);
    const gt = glowTex(); const sm = (col, o) => new THREE.SpriteMaterial({ map: gt, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: o });
    const comet = new THREE.Group(); const a = new THREE.Sprite(sm(0x8fd0ff, 1)); a.scale.setScalar(4); const b = new THREE.Sprite(sm(0xffffff, 1)); b.scale.setScalar(1.4); comet.add(a, b); const l = new THREE.PointLight(0x9fd8ff, 0, 90, 1.3); comet.add(l); comet.visible = false; scene.add(comet);
    const trail = []; for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(sm(0x6ab8ff, 0.6)); s.visible = false; scene.add(s); trail.push(s); } ST.comet = { g: comet, l, trail, hist: [] };
    ST.glints = []; for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(sm(0xffffff, 0)); s.scale.setScalar(0.07); s.visible = false; scene.add(s); ST.glints.push(s); }
  }
  // Anzeige
  function title(k, h, s) { $('stCutK').textContent = k || ''; $('stCutH').textContent = h || ''; $('stCutS').textContent = s || ''; const t = $('stCutTitle'); t.classList.remove('on'); void t.offsetWidth; t.classList.add('on'); }
  function untitle() { $('stCutTitle').classList.remove('on'); }
  function say(text, dur = 3.4) { const l = $('stCutLine'); l.textContent = text; l.classList.remove('on'); void l.offsetWidth; l.classList.add('on'); ST.lineT = dur; }
  function card(text) { const c = $('stCutCard'); if (!text) { c.classList.remove('on'); return; } c.textContent = text; c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); }
  function black(on, dur = 0.7) { const f = $('stFade'); f.style.transition = `opacity ${dur}s`; f.classList.toggle('on', !!on); }
  function camTo(p, look, fov) { const cam = C.cam; cam.position.copy(p); if (ST.shake > 0) { cam.position.x += (Math.random() - 0.5) * ST.shake * 0.12; cam.position.y += (Math.random() - 0.5) * ST.shake * 0.09; } cam.up.set(0, 1, 0); cam.lookAt(look); cam.fov = fov; }
  const kcam = (x, y, z, lx, ly, lz, fov) => { ST.inside = true; camTo(K3(x, y, z), K3(lx, ly, lz), fov); };
  const wcam = (p, l, fov) => { ST.inside = false; camTo(p, l, fov); };

  function play(kind, info = {}) {
    if (!C.W) return false; ensure(); if (ST.on) finish(false);
    ST.on = true; ST.kind = kind; ST.info = info; ST.t = 0; ST.pt = -1; ST.hold = 0; ST.shake = 0; ST.lineT = 0; ST.K.reset(); ST.sp.clear(); ST.comet.g.visible = false; for (const s of ST.comet.trail) s.visible = false; ST.comet.hist = []; for (const s of ST.glints) s.visible = false;
    const p = ST.bruno; p.setVisible(false); p.act = 0; p.actT = undefined; p.sad = 0; p.lookAt = null; p.mode = 'stand'; p.speed = 0;
    hud.classList.add('st-cutting'); $('stCut').classList.remove('hidden'); untitle(); card(''); $('stCutLine').classList.remove('on'); $('stCutBar').style.transform = 'scaleX(0)';
    const f = $('stFade'); f.style.transition = 'none'; f.classList.add('on'); void f.offsetWidth;
    if (kind === 'intro') { ST.min = 20 * 60 + 40; C.W.cityPower = 1; } else { ST.min = 21 * 60 + 10; C.W.cityPower = 0; }
    return true;
  }
  function finish(call = true) {
    if (!ST.on) return; const kind = ST.kind; ST.on = false; if (ST.loop) { ST.loop.stop(0.2); ST.loop = null; } ST.sp.clear(); ST.bruno.setVisible(false); ST.comet.g.visible = false; for (const s of ST.comet.trail) s.visible = false; for (const s of ST.glints) s.visible = false; ST.K.reset();
    hud.classList.remove('st-cutting'); $('stCut').classList.add('hidden'); untitle(); card(''); $('stCutLine').classList.remove('on'); const f = $('stFade'); f.style.transition = 'opacity .9s'; f.classList.remove('on'); C.cam.fov = 65;
    if (call && onEnd) onEnd(kind, ST.info);
  }
  function key(code) { if (code === 'Escape') finish(); }
  function step(dt) {
    if (!ST.on) return; ST.pt = ST.t; ST.t += dt; ST.shake = Math.max(0, ST.shake - dt * 1.4);
    const holding = C.keys.Space || C.keys.KeyE || C.keys.Enter; if (holding) { ST.hold += dt; if (ST.hold >= 0.9) { finish(); return; } } else ST.hold = 0; $('stCutBar').style.transform = `scaleX(${clamp(ST.hold / 0.9, 0, 1)})`;
    if (ST.lineT > 0 && (ST.lineT -= dt) <= 0) $('stCutLine').classList.remove('on');
    if (ST.kind === 'intro') intro(dt); else finale(dt); if (!ST.on) return;
    C.W.setTime(C.S ? C.S.day : 1, ST.min, false); ST.sp.step(dt); if (ST.bruno.visible) ST.bruno.update(dt, ST.t);
  }
  const mood = () => (ST.inside ? { ...C.W.mood, fogD: 0.0004, vol: 0 } : C.W.mood);

  // Klappe auf/zu und Rütteln
  const doorTo = (v, dt, rate = 2.5) => { const P = ST.K.pivot; P.rotation.x += clamp(v - P.rotation.x, -dt * rate, dt * rate); };
  const shakeDW = (amp) => { ST.K.dw.position.set(0.3 + Math.sin(ST.t * 47) * amp, Math.abs(Math.sin(ST.t * 31)) * amp * 0.6, Math.sin(ST.t * 39) * amp * 0.5); };
  const dwTop = () => K3(0.3 + (Math.random() - 0.5) * 0.5, 0.93, -2.0 + 0.62);
  const fuse = () => K3(2.48, 1.65 + (Math.random() - 0.5) * 0.3, -0.9 + (Math.random() - 0.5) * 0.3);
  function cityBlink(T, t0) { const u = T - t0; if (u < 0) return 1; const seq = [[0, 1], [0.15, 0.3], [0.3, 0.9], [0.45, 0.15], [0.62, 0.7], [0.8, 0]]; let v = 1; for (const [a, k] of seq) if (u >= a) v = k; return v; }

  // ======================= Vorspann =======================
  function intro(dt) {
    const T = ST.t; const K = ST.K; const p = ST.bruno; const W = C.W;
    if (cue(0.05)) black(false, 1.2);
    if (T < 5.0) { // Shot A: die Stadt am Abend, alle Fenster hell
      const u = smooth(0, 5, T); W.cityPower = 1; wcam(V3(lerp(94, 110, u), lerp(9, 6.5, u), lerp(31, 29.5, u)), V3(lerp(150, 156, u), lerp(7, 5, u), lerp(22, 23, u)), 52);
      if (cue(0.5)) title('Theostadt', 'Freitag, 20:40 Uhr', 'Eine ganz normale Stadt. Noch.');
      if (cue(4.2)) untitle();
    } else if (T < 9.6) { // Shot B: Bruno kommt in die Küche, die Maschine steht offen und ist voll
      if (cue(5.0)) { p.setVisible(true); p.place(KX + 2.45, 0, KZ + 1.45, -Math.PI / 2); p.route = [[KX + 1.5, KZ + 0.9], [KX + 1.0, KZ - 0.9]]; p.wp = 0; K.pivot.rotation.x = 1.45; snd.play('door', 0.8); }
      K.door.rotation.y = -1.35 * smooth(5.0, 5.6, T) * (1 - smooth(8.4, 9.2, T));
      const pt = p.route[p.wp]; if (pt) { if (walkTo(p, pt[0], pt[1], dt, 1.3)) p.wp++; } else { p.mode = 'stand'; faceTo(p, KX + 0.3, KZ - 1.6, dt, 6); p.act = 'counter'; }
      p.lookAt = K3(0.3, 0.5, -1.6);
      kcam(-1.7, 1.7, 2.15, 0.6, 0.85, -1.2, 56);
      if (cue(5.8)) say('Bruno: „So. Alles rein. Teller, Tassen, die Pfanne …“', 2.6);
      if (cue(8.0)) say('Bruno: „… und der Grill vom Sommer. Passt schon.“', 2.2);
    } else if (T < 13.0) { // Shot C: Klappe zu, Turbo-Programm
      p.place(KX + 1.0, 0, KZ - 0.9); faceTo(p, KX + 0.3, KZ - 1.6, dt, 6); p.mode = 'stand'; p.act = T < 12.2 ? 'counter' : 0; p.lookAt = K3(0.3, 0.8, -1.4);
      doorTo(T > 9.8 ? 0 : 1.45, dt, 4); if (cue(10.25)) { snd.play('clank', 1, 0.9); snd.play('thud', 0.8, 1.2); ST.shake = 0.25; }
      if (cue(10.6)) say('Bruno: „Turbo-Programm. Neunzig Grad. Extra trocken.“', 2.4);
      if (cue(11.3)) { K.display('90° TURBO'); K.ledM.emissiveIntensity = 3; snd.play('ui', 1, 0.8); }
      if (cue(11.7)) snd.play('ui', 1, 1.1);
      kcam(-0.7, 1.4, -0.3, 0.6, 0.95, -1.15, 50);
    } else if (T < 15.6) { // Shot D: Die Maschine rüttelt immer stärker, es funkt
      if (cue(13.0)) ST.loop = snd.loop('machine', 0.9, 0.85);
      const k = smooth(13.0, 15.5, T); shakeDW(0.002 + k * 0.012); if (ST.loop) ST.loop.rate(0.85 + k * 0.7);
      if (T > 14.0) K.display(Math.random() < 0.5 ? '90° TURBO' : Math.random() < 0.5 ? 'E-99' : '', '#ff3a2a');
      if (T > 14.2) { const fl = Math.random() < 0.25 ? 0.35 : 1; K.setPower(fl); }
      if (T > 14.6) { if (Math.random() < dt * 22) ST.sp.emit(dwTop(), 3, 1.6); K.L.spark.intensity = Math.random() * 3; if (cue(14.6)) snd.play('buzz', 0.9); if (Math.random() < dt * 3) snd.play('zap', 0.6, 1.3); }
      if (cue(13.9)) say('Bruno: „Hm? Der war noch nie so laut …“', 1.7);
      p.place(KX + 1.0, 0, KZ - 0.9); p.act = 0; p.lookAt = K3(0.3, 0.6, -1.4);
      kcam(-0.4, 0.88, -0.2, 0.3, 0.66, -1.4, 48);
    } else if (T < 17.4) { // Shot E: der Knall
      if (cue(15.6)) { snd.play('bang', 1.2); snd.play('zap', 1); snd.play('buzz', 1, 0.7); ST.shake = 1.1; K.L.flash.intensity = 90; ST.sp.emit(dwTop(), 90, 4.5); ST.sp.emit(fuse(), 70, 3.5, 0xfff0a0); for (let i = 0; i < 5; i++) C.W.puff(K3(0.3 + (Math.random() - 0.5) * 0.4, 0.95, -1.35), 0x3a3a3a, 0.35); C.W.puff(K3(2.4, 1.8, -0.9), 0x5a5a5a, 0.4); if (ST.loop) { ST.loop.stop(0.15); ST.loop = null; } K.display(''); K.ledM.emissiveIntensity = 0; }
      K.L.flash.intensity = Math.max(0, K.L.flash.intensity - dt * 220); K.L.spark.intensity = T < 16.4 ? Math.random() * 5 : 0; shakeDW(T < 16 ? 0.01 : 0);
      K.setPower(T < 16.3 ? (Math.random() < 0.5 ? 0 : 0.6) : 0); if (T > 16.3 && T < 16.35) snd.sweep(false);
      p.place(KX + 1.0, 0, KZ - 0.9); p.act = T < 17 ? 'cheer' : 0; if (cue(15.65)) p.actT = 0; p.lookAt = K3(0.3, 0.8, -1.4);
      if (Math.random() < dt * 4) C.W.puff(K3(0.3, 0.95, -1.35), 0x2a2a2a, 0.3);
      kcam(-1.9, 1.85, 2.0, 0.5, 1.0, -1.2, 56);
    } else if (T < 22.0) { // Shot F: die Stadt geht aus
      K.setPower(0); const u = smooth(17.4, 22, T); W.cityPower = cityBlink(T, 17.9); K.setCity(W.cityPower);
      wcam(V3(lerp(110, 120, u), lerp(64, 55, u), lerp(126, 112, u)), V3(168, 0, 20), 50);
      if (cue(17.9)) snd.sweep(false, 1.8); if (cue(18.7)) snd.play('thud', 0.9, 0.6);
      if (cue(19.2)) title('Theos Seitenscheidel präsentiert', 'STROM AUS', 'wegen Brunos Geschirrspüler');
      if (cue(21.6)) untitle();
    } else if (T < 25.5) { // Shot G: Bruno im Dunkeln
      W.cityPower = 0; K.setCity(0); K.setPower(0); if (Math.random() < dt * 2.5) C.W.puff(K3(0.3, 0.95, -1.35), 0x2a2a2a, 0.28); if (Math.random() < dt * 1.5) { ST.sp.emit(dwTop(), 4, 1.2); snd.play('zap', 0.35, 1.5); }
      p.place(KX + 1.0, 0, KZ - 0.9); if (T < 23.2) faceTo(p, KX + 0.3, KZ - 1.6, dt, 6); else faceTo(p, KX + 0.6, KZ + 0.9, dt, 3); p.act = 0; p.lookAt = T < 23.2 ? K3(0.3, 0.7, -1.4) : K3(0.75, 1.62, 0.55);
      kcam(0.75, 1.62, 0.55, 1.0, 1.45, -0.9, 44);
      if (cue(22.5)) say('Bruno: „… Ups.“', 1.6);
      if (cue(24.1)) say('Bruno: „Das bleibt unter uns, ja?“', 1.8);
    } else { // Tafel: wie es weitergeht
      if (cue(25.5)) black(true, 0.6); kcam(0.75, 1.62, 0.55, 1.0, 1.45, -0.9, 44);
      if (cue(26.0)) card('Seit diesem Abend ist ganz Theostadt dunkel. Die Stadtwerke sagen: Das dauert Monate.');
      if (cue(29.0)) card('Ihr wartet nicht. Ihr macht den Strom jetzt selbst: illegal, in einer alten Halle am Waldrand. Drei Handkurbeln, 20 €.');
      if (T > 32.6) finish();
    }
  }

  // ======================= Abspann =======================
  const P0 = V3(SPOTS.bunker.x, 3, SPOTS.bunker.z); const P1 = V3(30, 75, 0); const P2 = V3(HOUSE.x, 13, HOUSE.z);
  const bez = (u) => { const a = 1 - u; return V3(a * a * P0.x + 2 * a * u * P1.x + u * u * P2.x, a * a * P0.y + 2 * a * u * P1.y + u * u * P2.y, a * a * P0.z + 2 * a * u * P1.z + u * u * P2.z); };
  function cometAt(pos) { const c = ST.comet; c.g.visible = true; c.g.position.copy(pos); c.l.intensity = 500; c.hist.unshift(pos.clone()); if (c.hist.length > 60) c.hist.pop(); c.trail.forEach((s, i) => { const h = c.hist[Math.min(c.hist.length - 1, i * 2 + 1)]; s.visible = !!h; if (h) { s.position.copy(h); s.scale.setScalar(2.4 * (1 - i / c.trail.length)); s.material.opacity = 0.55 * (1 - i / c.trail.length); } }); c.g.children[0].scale.setScalar(4 + Math.sin(ST.t * 40) * 0.8); }
  function finale(dt) {
    const T = ST.t; const K = ST.K; const p = ST.bruno; const W = C.W; const won = ST.info.won || {};
    if (cue(0.05)) black(false, 1.0);
    if (T < 6.6) { // Shot A: Der Strom fliegt vom Bunker über den Wald
      W.cityPower = 0; K.setCity(0); const u = smooth(0.8, 6.5, T); const pos = bez(u); cometAt(pos); const dir = bez(Math.min(1, u + 0.02)).sub(pos); if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0); dir.normalize(); const side = V3(-dir.z, 0, dir.x).normalize();
      const cp = pos.clone().addScaledVector(dir, -22).addScaledVector(side, 9); cp.y = Math.max(cp.y + 6, 8); ST.look.copy(pos).addScaledVector(dir, 8); wcam(cp, ST.look, 58);
      if (cue(0.4)) title('Letzter Auftrag erledigt', '5.000 kWh', 'Alles geht direkt in Brunos Geschirrspüler'); if (cue(3.6)) untitle();
      if (cue(0.9)) { snd.play('buzz', 1, 0.6); snd.sweep(true, 2.4); } if (Math.random() < dt * 4) snd.play('zap', 0.4, 0.7 + Math.random() * 0.4);
    } else if (T < 10.0) { // Shot B: Einschlag bei Bruno, die Stadt geht wieder an
      if (cue(6.6)) { W.flash = 1; snd.play('bang', 0.9, 1.2); snd.sweep(true, 2.2); ST.comet.g.visible = false; for (const s of ST.comet.trail) s.visible = false; }
      const k = smooth(6.9, 9.6, T); W.cityPower = k < 0.98 ? (Math.random() < 0.3 ? k * 0.4 : k) : 1; K.setCity(W.cityPower);
      wcam(V3(116, 58, 118), V3(166, 0, 20), 50);
    } else if (T < 13.0) { // Shot C: Bruno sitzt im Dunkeln vor seiner Maschine
      W.cityPower = 1; K.setPower(0); K.setCity(1); if (cue(10.0)) { K.chairDW.visible = true; p.setVisible(true); }
      p.place(KX + 0.3, 0, KZ - 0.3, Math.PI); p.mode = 'sit'; p.seat = 0.47; p.sad = 1; p.act = 0; p.lookAt = null;
      if (cue(10.3)) say('Bruno: „Bitte. Nur noch ein einziges Mal …“', 2.4);
      if (T > 11.4) { if (Math.random() < dt * 30) ST.sp.emit(K3(0.3 + (Math.random() - 0.5) * 0.55, 0.15 + Math.random() * 0.8, -1.37), 3, 1.0, 0x8fd0ff, 0.6); K.L.blue.intensity = 1 + Math.random() * 3; if (cue(11.4)) snd.play('buzz', 0.8, 1.2); }
      kcam(1.25, 1.3, 0.75, 0.3, 0.7, -1.2, 46);
    } else if (T < 15.6) { // Shot D: Der Geschirrspüler blitzt auf
      if (cue(13.0)) { snd.play('bang', 0.8, 1.5); snd.play('zap', 1, 0.8); K.L.flash.intensity = 140; ST.shake = 0.6; ST.sp.emit(K3(0.3, 0.6, -1.3), 120, 4, 0xcfe8ff); K.L.blue.intensity = 0; }
      K.doorOut.emissiveIntensity = Math.max(0, 2.5 * (1 - smooth(13.0, 14.2, T))); K.L.flash.intensity = Math.max(0, K.L.flash.intensity - dt * 160);
      K.setPower(T < 13.4 ? 0 : T < 14.2 ? (Math.random() < 0.5 ? 0.2 : 1) : 1); if (cue(13.6)) ST.loop = snd.loop('machine', 0.7, 1.0); shakeDW(T < 14.6 ? 0.003 : 0.0015);
      if (cue(14.2)) { K.display('läuft …', '#7affb8'); K.ledM.emissiveIntensity = 3; } if (cue(15.0)) { K.display('FERTIG ✓', '#7affb8'); snd.play('ui', 1, 1.3); }
      p.place(KX + 0.3, 0, KZ - 0.3, Math.PI); p.mode = 'sit'; p.sad = T < 13.3 ? 1 : 0; p.hope = T < 13.3 ? 0 : 1;
      kcam(-0.6, 1.0, 0.15, 0.3, 0.6, -1.4, 50);
    } else if (T < 20.5) { // Shot E: Klappe auf, Dampf, alles blitzsauber, Bruno jubelt
      if (cue(15.6)) { if (ST.loop) { ST.loop.stop(0.4); ST.loop = null; } K.clean(true); p.mode = 'stand'; p.hope = 0; p.sad = 0; p.place(KX + 0.3, 0, KZ - 0.3, Math.PI); p.route = [[KX + 1.0, KZ - 0.5]]; p.wp = 0; }
      shakeDW(0); const pt = p.route && p.route[p.wp]; if (pt) { if (walkTo(p, pt[0], pt[1], dt, 1.2)) p.wp++; } else { faceTo(p, KX - 0.1, KZ + 1.0, dt, 4); p.mode = 'stand'; if (T > 16.6) { p.act = 'cheer'; if (p.actT === undefined) p.actT = 0; } }
      if (T > 16.0) doorTo(1.0, dt, 0.9); if (T > 16.2 && Math.random() < dt * 9) C.W.puff(K3(0.3 + (Math.random() - 0.5) * 0.4, 0.95, -1.25), 0xffffff, 0.22);
      ST.glints.forEach((s, i) => { const pl = K.plates[i % K.plates.length]; s.visible = T > 16.4; if (!s.visible) return; const wp = pl.getWorldPosition(V3()); s.position.set(wp.x, wp.y + 0.08, wp.z + 0.02); const tw = Math.max(0, Math.sin(T * 5 + i * 1.7)); s.material.opacity = tw; s.scale.setScalar(0.05 + tw * 0.08); });
      if (cue(16.7)) { say('Bruno: „Er läuft! Er läuft wieder! EINWANDFREI!“', 3.4); snd.play('fanfare', 1); }
      if (cue(18.6)) say('Bruno: „Und guckt euch die Pfanne an. Wie neu!“', 1.9);
      p.lookAt = T > 16.6 ? K3(-0.4, 1.5, 1.2) : K3(0.3, 0.6, -1.4);
      kcam(-0.45, 1.5, 1.25, 0.45, 0.9, -1.1, 50);
    } else if (T < 26.0) { // Shot F: Theostadt leuchtet wieder
      for (const s of ST.glints) s.visible = false; const a = (T - 20.5) * 0.12 + 0.6; wcam(V3(HOUSE.x + Math.sin(a) * 62, 26, HOUSE.z + Math.cos(a) * 62), V3(HOUSE.x + 10, 4, HOUSE.z), 52);
      if (cue(20.8)) { title('Geschafft', 'STROM IST WIEDER DA', `Tag ${won.day || '?'} · ${kwh(won.kwh || 0)} erzeugt · ${euro(won.money || 0)} verdient · ${won.jobs || 0} Aufträge`); snd.play('fanfare', 0.9, 0.9); }
      if (cue(25.3)) untitle();
    } else {
      if (cue(26.0)) black(true, 0.7); if (cue(26.5)) card('Brunos Geschirrspüler läuft wieder. Theostadt hat Strom. Und die Halle am Waldrand? Die gehört jetzt euch.');
      if (T > 30.5) finish();
    }
  }
  return { play, step, key, finish, mood, get on() { return ST.on; }, get kind() { return ST.kind; }, state: ST };
}
