// Theos Seitenscheidel - Ludwig Zigaretti: die Vape-Werkbank im Bunker (Spielprinzip Teil 2, 2026-11-21).
// Steht an der Rückwand unter dem großen KippCord-Bildschirm, zwischen Bunker-PC und Spinden. Holzplatte auf Stahlbeinen, Schubladenblock, Schraubstock,
// Lötstation mit Lötkolben und Schwamm, Lupenlampe (leuchtet, ohne echtes Licht), Lochwand mit Werkzeug, Teileschalen, Liquid-Flaschen, eine halb gebaute Vape.
// Links die Teilekiste (blaue Metallkiste mit Schild TEILE), rechts die Ablage mit den fertigen Vapes. Alles in Bunker-Koordinaten, Kind von BK.root (wird mit dem Bunker ein- und ausgeblendet).
import * as THREE from './vendor/three.module.min.js';
import { std, mesh, label, glow } from './ludwiggfx.js';

export const WERK = { x: -8.3, z: -10.55 }; // Mitte der Werkbank (lokal im Bunker)
export const WERK_KISTE = { x: -9.78, z: -10.62 }; // Teilekiste
export const WERK_ABLAGE = { x: -6.72, z: -10.7 }; // Ablage für fertige Vapes
export const WERK_BOXES = [{ x0: -10.1, x1: -6.3, z0: -11, z1: -10.1 }];
const VCOL = { vmango: 0xffa030, vmenthol: 0x5ad0ff, vkirsche: 0xe02a40 };

export function buildWerkbank(root) {
  const g = new THREE.Group(); g.name = 'werkbank'; g.visible = false; root.add(g);
  const wood = std({ color: 0x8a6a42, roughness: 0.7 }); const steel = std({ color: 0x6a7078, roughness: 0.4, metalness: 0.75 }); const dark = std({ color: 0x1c1e22, roughness: 0.5, metalness: 0.3 });
  const red = std({ color: 0xc0261e, roughness: 0.45 }); const blue = std({ color: 0x2a4a8a, roughness: 0.45, metalness: 0.4 }); const peg = std({ color: 0xb89a6a, roughness: 0.85 }); const glass = std({ color: 0xcfe8f0, roughness: 0.1, transparent: true, opacity: 0.55 });
  const box = (w, h, d, m, x, y, z, p = g, cast = true) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; p.add(o); return o; };
  const X = WERK.x; const Z = WERK.z;
  // Werkbank: Platte, Beine, Schubladenblock, Querstrebe
  box(2.2, 0.06, 0.8, wood, X, 0.9, Z); for (const sx of [-1.02, 1.02]) for (const sz of [-0.33, 0.33]) box(0.06, 0.87, 0.06, steel, X + sx, 0.435, Z + sz);
  box(2.1, 0.04, 0.04, steel, X, 0.2, Z + 0.33); box(0.55, 0.62, 0.7, dark, X + 0.7, 0.55, Z); for (let i = 0; i < 3; i++) { box(0.5, 0.17, 0.02, steel, X + 0.7, 0.36 + i * 0.2, Z + 0.36); box(0.16, 0.025, 0.03, dark, X + 0.7, 0.4 + i * 0.2, Z + 0.38); }
  // Lochwand mit Werkzeug an der Rückwand
  box(2.0, 0.9, 0.02, peg, X, 1.45, -10.97, g, false); for (let i = 0; i < 7; i++) { const tx = X - 0.8 + i * 0.27; box(0.03, 0.22 + (i % 3) * 0.05, 0.02, i % 2 ? red : steel, tx, 1.5, -10.94); box(0.08, 0.03, 0.03, dark, tx, 1.38 - (i % 3) * 0.025, -10.94); }
  // Schraubstock links, Lötstation mit Kolben und Schwamm, Lupenlampe mit leuchtendem Ring
  box(0.18, 0.1, 0.16, blue, X - 0.85, 0.98, Z + 0.25); box(0.04, 0.14, 0.16, blue, X - 0.94, 1.05, Z + 0.25); box(0.04, 0.14, 0.16, blue, X - 0.76, 1.05, Z + 0.25);
  box(0.24, 0.1, 0.18, dark, X - 0.35, 0.98, Z - 0.15); const disp = std({ color: 0x000000, emissive: 0xff6a2a, emissiveIntensity: 1.6 }); box(0.1, 0.035, 0.005, disp, X - 0.35, 1.0, Z - 0.058);
  mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 12), steel, X - 0.12, 1.0, Z - 0.15, g, { rx: Math.PI / 2 }); mesh(new THREE.CylinderGeometry(0.008, 0.013, 0.22, 8), dark, X - 0.1, 1.04, Z - 0.1, g, { rz: 1.1 });
  box(0.07, 0.025, 0.05, std({ color: 0xf2d23a, roughness: 0.9 }), X - 0.2, 0.945, Z + 0.08);
  const lamp = new THREE.Group(); lamp.position.set(X + 0.25, 0.93, Z - 0.25); g.add(lamp); mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.03, 14), dark, 0, 0.015, 0, lamp); mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.42, 8), steel, 0, 0.22, 0, lamp, { rz: 0.25 });
  const ringM = std({ color: 0x000000, emissive: 0xf4f8ff, emissiveIntensity: 2.4 }); mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 22), ringM, -0.1, 0.44, 0.05, lamp, { rx: -1.2 }); mesh(new THREE.CircleGeometry(0.08, 20), glass, -0.1, 0.44, 0.05, lamp, { rx: -1.2 }); glow(lamp, -0.1, 0.36, 0.12, 0xf4f8ff, 0.9, 0.35);
  // Teileschalen, Liquid-Flaschen, halb gebaute Vape
  const trayC = [0x2a8a3a, 0x3a3a3a, 0xd8d8d0, 0x5a8ac8, 0x8a8a8a]; trayC.forEach((c, i) => { box(0.14, 0.03, 0.1, steel, X - 0.15 + i * 0.16, 0.945, Z + 0.25); box(0.1, 0.02, 0.06, std({ color: c, roughness: 0.5 }), X - 0.15 + i * 0.16, 0.965, Z + 0.25); });
  const bottles = [0xffa030, 0x5ad0ff, 0xe02a40, 0xf0f0f0].map((c, i) => { const b = new THREE.Group(); b.position.set(X + 0.95 - i * 0.09, 0.93, Z - 0.28); g.add(b); mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.11, 10), std({ color: c, roughness: 0.15, transparent: true, opacity: 0.8 }), 0, 0.055, 0, b); mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.04, 8), dark, 0, 0.13, 0, b); return b; });
  const vapeM = std({ color: 0x3a3e46, roughness: 0.35, metalness: 0.6 }); mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 12), vapeM, X + 0.12, 0.945, Z + 0.05, g, { rz: Math.PI / 2 }); mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.03, 10), glass, X + 0.19, 0.945, Z + 0.05, g, { rz: Math.PI / 2 });
  // Teilekiste: blaue Metallkiste mit Schild TEILE und Inhalt (je Teil eine kleine Schachtel, sichtbar wenn vorhanden)
  const K = new THREE.Group(); K.position.set(WERK_KISTE.x, 0, WERK_KISTE.z); g.add(K); box(0.5, 0.36, 0.42, blue, 0, 0.18, 0, K); box(0.46, 0.02, 0.38, std({ color: 0x14243e, roughness: 0.7 }), 0, 0.355, 0, K, false);
  const tl = std({ map: label('TEILE', { w: 256, h: 96, bg: '#f2f0ea', fg: '#14243e', size: 64 }), roughness: 0.7 }); mesh(new THREE.PlaneGeometry(0.26, 0.1), tl, 0, 0.22, 0.211, K);
  const partBoxes = ['akku', 'platine', 'kopf', 'tank', 'gehaeuse', 'base', 'a_mango', 'a_menthol', 'a_kirsche'].map((k, i) => { const c = [0x2a5a9a, 0x2a8a3a, 0x9a9a9a, 0xcfe8f0, 0x3a3e46, 0xf0f0f0, 0xffa030, 0x5ad0ff, 0xe02a40][i]; const o = box(0.12, 0.06, 0.1, std({ color: c, roughness: 0.5 }), -0.16 + (i % 3) * 0.16, 0.39, -0.12 + Math.floor(i / 3) * 0.12, K); o.visible = false; return [k, o]; });
  // Ablage: kleines Regal mit Schale, fertige Vapes liegen nebeneinander
  const A = new THREE.Group(); A.position.set(WERK_ABLAGE.x, 0, WERK_ABLAGE.z); g.add(A); for (const sx of [-0.3, 0.3]) box(0.03, 1.0, 0.36, steel, sx, 0.5, 0, A); for (const y of [0.3, 0.9]) box(0.63, 0.03, 0.36, steel, 0, y, 0, A);
  box(0.5, 0.03, 0.26, dark, 0, 0.93, 0, A); const ab = std({ map: label('FERTIG', { w: 256, h: 64, bg: '#0a2a14', fg: '#5aff8a', size: 40 }), roughness: 0.6 }); mesh(new THREE.PlaneGeometry(0.3, 0.075), ab, 0, 0.84, 0.185, A);
  const done = []; for (let i = 0; i < 12; i++) { const m = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 10), std({ color: 0xffffff, roughness: 0.35, metalness: 0.4 }), -0.2 + (i % 6) * 0.08, 0.958 + Math.floor(i / 6) * 0.026, -0.04 + Math.floor(i / 6) * 0.06, A, { rx: Math.PI / 2 }); m.visible = false; done.push(m); }
  let sig = '';
  // Zustand anzeigen: Werkbank da (Werkzeug gekauft), Teile in der Kiste, Vapes in der Ablage
  function set(S) {
    const on = !!(S.tools && S.tools.werkbank); const ab2 = S.werk ? S.werk.ablage : {}; const s = `${on}|${partBoxes.map(([k]) => ((S.teile && S.teile[k]) > 0 ? 1 : 0)).join('')}|${JSON.stringify(ab2)}`; if (s === sig) return; sig = s;
    g.visible = on; for (const [k, o] of partBoxes) o.visible = (S.teile && S.teile[k]) > 0; bottles.forEach((b, i) => { b.visible = i < 3 ? (S.teile && S.teile[['a_mango', 'a_menthol', 'a_kirsche'][i]]) > 0 : (S.teile && S.teile.base) > 0; });
    const list = []; for (const id of ['vmango', 'vmenthol', 'vkirsche']) for (let i = 0; i < ((ab2 && ab2[id]) || 0); i++) list.push(id); done.forEach((m, i) => { m.visible = i < list.length; if (m.visible) m.material.color.setHex(VCOL[list[i]]); });
  }
  return { g, set, anchors: { werk: new THREE.Vector3(X, 1.0, Z), kiste: new THREE.Vector3(WERK_KISTE.x, 0.45, WERK_KISTE.z), ablage: new THREE.Vector3(WERK_ABLAGE.x, 0.95, WERK_ABLAGE.z) } };
}
