// Theos Seitenscheidel - Moonsweeper 2: Mondkugel für den Vorspann (Blick aus dem Weltall). Unebene Kugel mit Kratern und dunklen Meeren, im Spiel erzeugt; nach dem Vorspann wird sie freigegeben.
import * as THREE from './vendor/three.module.min.js';

function rng(seed) { let a = seed; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
// Glatte Beulen aus Sinus-Produkten: nahtlos, weil sie von der Lage auf der Kugel abhängen
const lumps = (x, y, z) => 0.022 * Math.sin(2.9 * x + 1.1) * Math.sin(3.3 * y + 2.2) * Math.sin(2.7 * z + 0.4) + 0.011 * Math.sin(6.1 * x + y * 3 + 0.8) * Math.sin(5.7 * z - 1.2) + 0.006 * Math.sin(11 * y + 2 * z) * Math.sin(12 * x + 1);
function ballTextures() {
  const W = 2048; const H = 1024; const col = document.createElement('canvas'); col.width = W; col.height = H; const bump = document.createElement('canvas'); bump.width = W; bump.height = H; const c = col.getContext('2d'); const b = bump.getContext('2d'); const r = rng(1969);
  c.fillStyle = '#a9a9b6'; c.fillRect(0, 0, W, H); b.fillStyle = '#808080'; b.fillRect(0, 0, W, H);
  // Wolkige Helligkeit und dunkle, bläuliche Meere (große weiche Flecken, an der Naht fortgesetzt)
  const blob = (ctx, x, y, rx, ry, color, alpha) => { for (const dx of [-W, 0, W]) { ctx.save(); ctx.translate(x + dx, y); ctx.scale(rx, ry); const g = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1); g.addColorStop(0, color); g.addColorStop(0.72, color); g.addColorStop(1, color.replace(/[\d.]+\)$/, '0)')); ctx.globalAlpha = alpha; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.fill(); ctx.restore(); } };
  for (let i = 0; i < 160; i++) blob(c, r() * W, r() * H, 60 + r() * 200, 40 + r() * 130, r() < 0.5 ? 'rgba(198,198,208,1)' : 'rgba(136,136,150,1)', 0.14);
  for (let i = 0; i < 16; i++) { const x = r() * W; const y = H * (0.22 + r() * 0.56); for (let k = 0; k < 9; k++) blob(c, x + (r() - 0.5) * 260, y + (r() - 0.5) * 150, 70 + r() * 110, 50 + r() * 80, 'rgba(92,100,136,1)', 0.2); }
  // Krater: Vertiefung, Lichtkante und Rand
  const crater = (x, y, R, deep) => {
    const lat = (0.5 - y / H) * Math.PI; const sx = 1 / Math.max(0.2, Math.cos(lat)); for (const dx of [-W, 0, W]) { const px = x + dx; if (px < -R * sx * 2 || px > W + R * sx * 2) continue;
      b.save(); b.translate(px, y); b.scale(sx, 1); const g = b.createRadialGradient(0, 0, 0, 0, 0, R * 1.35); const s = deep; g.addColorStop(0, `rgba(30,30,30,${0.75 * s})`); g.addColorStop(0.62, `rgba(50,50,50,${0.6 * s})`); g.addColorStop(0.74, `rgba(226,226,226,${0.45 * s})`); g.addColorStop(1, 'rgba(128,128,128,0)'); b.fillStyle = g; b.beginPath(); b.arc(0, 0, R * 1.35, 0, 7); b.fill(); b.restore();
      c.save(); c.translate(px, y); c.scale(sx, 1); const h = c.createRadialGradient(0, 0, 0, 0, 0, R * 1.25); h.addColorStop(0, `rgba(84,84,102,${0.34 * s})`); h.addColorStop(0.7, `rgba(100,100,118,${0.24 * s})`); h.addColorStop(0.8, `rgba(200,200,212,${0.1 * s})`); h.addColorStop(1, 'rgba(180,180,190,0)'); c.fillStyle = h; c.beginPath(); c.arc(0, 0, R * 1.25, 0, 7); c.fill(); c.restore(); }
  };
  for (let i = 0; i < 7000; i++) { const q = r(); crater(r() * W, Math.acos(1 - 2 * r()) / Math.PI * H, 1.6 + q * q * 6, 0.45 + r() * 0.5); }
  for (let i = 0; i < 120; i++) crater(r() * W, Math.acos(1 - 2 * r()) / Math.PI * H, 8 + r() * 16, 0.6 + r() * 0.3);
  for (let i = 0; i < 9; i++) crater(r() * W, H * (0.12 + r() * 0.76), 24 + r() * 30, 0.8);
  crater(W * 0.5, H * 0.17, 96, 1); // großer Krater oben, wie im Vorbild
  const cm = new THREE.CanvasTexture(col); cm.colorSpace = THREE.SRGBColorSpace; cm.anisotropy = 8; const bm = new THREE.CanvasTexture(bump); bm.anisotropy = 8; return { cm, bm };
}
export function buildMoonBall() {
  const geo = new THREE.SphereGeometry(100, 256, 180); const p = geo.attributes.position; const v = new THREE.Vector3(); const top = new THREE.Vector3().setFromSphericalCoords(1, 0.17 * Math.PI, 0); const tx = new THREE.Vector3(Math.sin(0.17 * Math.PI) * -Math.cos(Math.PI), Math.cos(0.17 * Math.PI), Math.sin(0.17 * Math.PI) * Math.sin(Math.PI)); void top;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).normalize(); const a = v.angleTo(tx); const rim = a < 0.5 ? (a < 0.3 ? -0.045 * (1 - (a / 0.3) * (a / 0.3)) + 0.012 : 0.012 * (1 - (a - 0.3) / 0.2)) : 0; const s = 1 + lumps(v.x, v.y, v.z) + rim; p.setXYZ(i, v.x * 100 * s, v.y * 100 * s, v.z * 100 * s); }
  geo.computeVertexNormals(); const { cm, bm } = ballTextures(); const mat = new THREE.MeshStandardMaterial({ map: cm, bumpMap: bm, bumpScale: 3.2, roughness: 0.96, metalness: 0, envMapIntensity: 0 }); const ball = new THREE.Mesh(geo, mat);
  return { ball, dispose: () => { geo.dispose(); mat.dispose(); cm.dispose(); bm.dispose(); } };
}
