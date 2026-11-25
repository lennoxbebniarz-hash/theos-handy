// Theos Seitenscheidel - Ludwig Zigaretti: Materialkiste neben Ludwigs Stuhl (Inventar, Spielprinzip Teil 1b, 2026-11-20, Wunsch Lennox).
// Obstkiste aus Latten mit Aufkleber, darin Packungen je Material (sichtbar, sobald etwas davon da ist).
// Stufen im PC-Shop: 1 Werkzeugkasten obendrauf, 2 zweite Kiste darauf, 3 dritte Kiste. Keine Lichter in der Gruppe (sie fliegt bei Kontrollen in den Schrank).
import * as THREE from './vendor/three.module.min.js';

export const KISTE = { x: -0.74, z: 1.43, w: 0.46, d: 0.34, h: 0.3, rot: 0.12 };
export const KISTE_BOX = { x0: KISTE.x - 0.27, x1: KISTE.x + 0.27, z0: KISTE.z - 0.21, z1: KISTE.z + 0.21 }; // Hindernis beim Laufen

function labelTex(text, sub) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#efe4c8'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#7a5530'; x.lineWidth = 6; x.strokeRect(5, 5, 246, 86);
  x.fillStyle = '#3a2410'; x.font = '900 40px Segoe Print, Bahnschrift, sans-serif'; x.textAlign = 'center'; x.fillText(text, 128, 52); x.font = '700 18px Bahnschrift, sans-serif'; x.fillStyle = '#8a3a1a'; x.fillText(sub, 128, 80);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function buildKiste(W) {
  const g = new THREE.Group(); g.position.set(KISTE.x, 0, KISTE.z); g.rotation.y = KISTE.rot; W.scene.add(g);
  const wood = new THREE.MeshStandardMaterial({ color: 0xc09058, roughness: 0.85 }); const dark = new THREE.MeshStandardMaterial({ color: 0x7a5530, roughness: 0.9 });
  const box = (w, h, d, m, x, y, z, p) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; };
  const { w, d, h } = KISTE;
  function crate(parent, y) { // Latten mit Lücken, Eckpfosten, Boden
    const c = new THREE.Group(); c.position.y = y; parent.add(c); box(w - 0.02, 0.012, d - 0.02, dark, 0, 0.008, 0, c);
    for (let i = 0; i < 3; i++) { const yy = 0.045 + i * 0.1; for (const s of [-1, 1]) { box(w, 0.062, 0.012, wood, 0, yy, s * (d / 2 - 0.006), c); box(0.012, 0.062, d, wood, s * (w / 2 - 0.006), yy, 0, c); } }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.028, h, 0.028, dark, sx * (w / 2 - 0.014), h / 2, sz * (d / 2 - 0.014), c);
    return c;
  }
  const c0 = crate(g, 0);
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.075), new THREE.MeshStandardMaterial({ map: labelTex('MATERIAL', 'nicht anfassen!'), roughness: 0.8 })); lab.position.set(0, 0.155, d / 2 + 0.0075); c0.add(lab);
  // Packungen in der Kiste (je Material eine kleine Gruppe, sichtbar wenn vorhanden)
  const M = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  const packs = {}; const P = (k, build) => { const o = new THREE.Group(); o.visible = false; c0.add(o); build(o); packs[k] = o; };
  P('papier', (o) => { for (let i = 0; i < 3; i++) { box(0.07, 0.012, 0.045, M(0xf4efe2), -0.14 + i * 0.012, 0.022 + i * 0.013, -0.08, o); box(0.07, 0.004, 0.045, M(0x1c3f86), -0.14 + i * 0.012, 0.03 + i * 0.013, -0.08, o); } });
  P('tabak', (o) => { for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M(0x1f5a3a)); m.scale.set(1.15, 0.5, 0.8); m.position.set(-0.03 + i * 0.07, 0.04 + i * 0.02, -0.06); m.castShadow = true; o.add(m); } });
  P('huelsen', (o) => { box(0.085, 0.045, 0.06, M(0xf4f0e6), 0.13, 0.034, -0.07, o); box(0.085, 0.008, 0.06, M(0xe0883a), 0.13, 0.06, -0.07, o); });
  P('kapseln', (o) => { const j = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 14), M(0xd8e8f0, { roughness: 0.1, transparent: true, opacity: 0.6 })); j.position.set(-0.13, 0.036, 0.07); o.add(j); for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), M(0xa04ad8, { emissive: 0x200830 })); s.position.set(-0.13 + Math.sin(i * 2.3) * 0.012, 0.018 + (i % 3) * 0.008, 0.07 + Math.cos(i * 2.3) * 0.012); o.add(s); } });
  P('deckblatt', (o) => { for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.07), M(0x7a5232, { side: THREE.DoubleSide })); l.rotation.set(-Math.PI / 2, 0, 0.2 * i); l.position.set(0.0, 0.07 + i * 0.003, 0.06); o.add(l); } });
  P('tips', (o) => { box(0.06, 0.02, 0.04, M(0xd8c8a0), 0.14, 0.022, 0.07, o); box(0.06, 0.004, 0.04, M(0x2a6a3a), 0.14, 0.034, 0.07, o); });
  P('gras', (o) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.055), M(0xd8e8d8, { roughness: 0.2, transparent: true, opacity: 0.7 })); b.position.set(0.07, 0.09, 0.02); o.add(b); const herb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M(0x6a8a40, { roughness: 1 })); herb.scale.set(1, 0.3, 0.8); herb.position.set(0.07, 0.092, 0.02); o.add(herb); });
  // Ausbaustufen: Werkzeugkasten, zweite und dritte Kiste
  const tool = new THREE.Group(); tool.position.set(0.02, h + 0.002, 0); g.add(tool); const red = M(0xc0261e, { roughness: 0.35, metalness: 0.4 });
  box(0.34, 0.11, 0.17, red, 0, 0.055, 0, tool); box(0.36, 0.012, 0.18, M(0x8a1a14, { roughness: 0.4, metalness: 0.5 }), 0, 0.114, 0, tool); const hd = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.007, 6, 14, Math.PI), M(0x222222, { metalness: 0.6, roughness: 0.4 })); hd.position.set(0, 0.12, 0); tool.add(hd);
  const c1 = crate(g, h + 0.004); const c2 = crate(g, 2 * h + 0.008); c1.rotation.y = -0.08; c2.rotation.y = 0.06;
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.002; sh.scale.set(1, 0.75, 1); g.add(sh);
  let sig = '';
  function set(tier, has) { const s = tier + '|' + Object.keys(packs).map((k) => (has[k] ? 1 : 0)).join(''); if (s === sig) return; sig = s; for (const [k, o] of Object.entries(packs)) o.visible = !!has[k]; tool.visible = tier === 1; c1.visible = tier >= 2; c2.visible = tier >= 3; tool.position.y = h + 0.002; }
  set(0, {});
  return { g, set, anchor: new THREE.Vector3(KISTE.x, 0.32, KISTE.z), packs };
}
