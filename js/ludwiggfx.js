// Theos Seitenscheidel - Ludwig Zigaretti: kleine Grafik-Helfer für Kiosk und Zimmer-Deko (2026-11-20).
// Canvas-Texturen, Schilder, Glühen, viele feste Teile zu einem Körper zusammenfassen, Wandflächen mit Welt-Maßstab, Bildzellen einer Sammeltextur.
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

export const std = (o) => new THREE.MeshStandardMaterial(o);
export function mesh(geo, mat, x, y, z, parent, { ry = 0, rx = 0, rz = 0, cast = false, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = cast; m.receiveShadow = receive; if (parent) parent.add(m); return m;
}
export function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.userData.canvas = c; return t;
}
// Schrift auf einer Fläche, wird kleiner, bis sie passt; glowC: leuchtender Rand (Neon)
export function label(text, { w = 512, h = 128, bg = '#1c1f24', fg = '#ffcf5a', size = 64, glowC = null, font = 'Bahnschrift, sans-serif', weight = 900 } = {}) {
  return canvasTex(w, h, (x) => {
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, w, h); } else x.clearRect(0, 0, w, h);
    x.fillStyle = fg; let fs = size; x.font = `${weight} ${fs}px ${font}`; while (x.measureText(text).width > w - 24 && fs > 10) { fs -= 2; x.font = `${weight} ${fs}px ${font}`; }
    x.textAlign = 'center'; x.textBaseline = 'middle'; if (glowC) { x.shadowColor = glowC; x.shadowBlur = h * 0.2; } x.fillText(text, w / 2, h / 2 + 3);
    if (glowC) { x.shadowBlur = 0; x.globalAlpha = 0.7; x.fillStyle = '#fff'; x.fillText(text, w / 2, h / 2 + 3); x.globalAlpha = 1; }
  });
}
let GLOWTEX = null;
export function glow(parent, x, y, z, color, size = 0.6, opacity = 0.8) {
  if (!GLOWTEX) GLOWTEX = canvasTex(128, 128, (c, w) => { const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.45)'); g.addColorStop(0.6, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOWTEX, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending })); s.position.set(x, y, z); s.scale.set(size, size, 1); parent.add(s); return s;
}
// Viele feste Teile je Material zu einem Körper zusammenfassen (wenige Zeichenaufrufe)
export function makeBatch() {
  const map = new Map(); const mt = new THREE.Matrix4(); const q = new THREE.Quaternion(); const e = new THREE.Euler(); const sv = new THREE.Vector3(); const pv = new THREE.Vector3();
  function add(mat, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone(); e.set(rx, ry, rz); q.setFromEuler(e); mt.compose(pv.set(x, y, z), q, sv.set(1, 1, 1)); g.applyMatrix4(mt);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!map.has(mat)) map.set(mat, []); map.get(mat).push(g);
  }
  const box = (mat, x0, y0, z0, x1, y1, z1) => add(mat, new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  function flush(parent) { const out = []; for (const [mat, list] of map) { const g = mergeGeometries(list, false); if (g) { const m = new THREE.Mesh(g, mat); m.receiveShadow = true; parent.add(m); out.push(m); } } map.clear(); return out; }
  return { add, box, flush };
}
// Wandfläche mit Welt-Maßstab: die Textur wiederholt sich je sc Meter, egal wie groß der Kasten ist
export function wallBox(B, mat, x0, y0, z0, x1, y1, z1, sc = 2.5) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)); const uv = g.attributes.uv; const p = g.attributes.position; const n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)); const ny = Math.abs(n.getY(i)); const px = p.getX(i) + (x0 + x1) / 2; const py = p.getY(i) + (y0 + y1) / 2 - y0; const pz = p.getZ(i) + (z0 + z1) / 2; if (ny > 0.5) uv.setXY(i, px / sc, pz / sc); else if (nx > 0.5) uv.setXY(i, pz / sc, py / sc); else uv.setXY(i, px / sc, py / sc); }
  B.add(mat, g, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
}
// Bildzelle (c, r) einer Sammeltextur mit cols × rows Zellen auf alle UVs legen (r = Zeile von oben)
export function uvCell(geo, c, r, cols, rows, inset = 0.04) {
  const g = geo.index ? geo.toNonIndexed() : geo; const uv = g.attributes.uv; const cw = 1 / cols; const ch = 1 / rows;
  for (let i = 0; i < uv.count; i++) { const u = inset + uv.getX(i) * (1 - 2 * inset); const v = inset + uv.getY(i) * (1 - 2 * inset); uv.setXY(i, (c + u) * cw, 1 - (r + 1) * ch + v * ch); }
  return g;
}
// Durchhängende Leine zwischen zwei Punkten (für Lichterketten und Wäscheleinen): n+1 Punkte
export function sagLine(a, b, sag, n) { const out = []; for (let i = 0; i <= n; i++) { const k = i / n; out.push(new THREE.Vector3(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k - Math.sin(k * Math.PI) * sag, a.z + (b.z - a.z) * k)); } return out; }
