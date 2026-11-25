// Theos Seitenscheidel - Formen für das Außenmodell des Autos: Umriss mit gerundeten Ecken (extrudiert), Reifen mit Felge.
import * as THREE from './vendor/three.module.min.js';

// ------------------------------------------------------------ Geometrie-Hilfen: Umriss mit gerundeten Ecken, extrudiert (für Karosserien)
// pts = [[z, y], ...] (Seitenansicht, vorn = +z); r = Eckenradius (Zahl oder Liste); width = Breite in x; bevel = Kantenrundung
export function profileGeo(pts, width, r = 0.06, bevel = 0.03) {
  const n = pts.length; const rr = (i) => (Array.isArray(r) ? r[i] : r); const pre = []; const post = [];
  for (let i = 0; i < n; i++) { const p = pts[i]; const a = pts[(i + n - 1) % n]; const b = pts[(i + 1) % n]; const la = Math.hypot(p[0] - a[0], p[1] - a[1]); const lb = Math.hypot(b[0] - p[0], b[1] - p[1]); const ka = Math.min(rr(i), la / 2) / la; const kb = Math.min(rr(i), lb / 2) / lb; pre.push([p[0] + (a[0] - p[0]) * ka, p[1] + (a[1] - p[1]) * ka]); post.push([p[0] + (b[0] - p[0]) * kb, p[1] + (b[1] - p[1]) * kb]); }
  const sh = new THREE.Shape(); sh.moveTo(pre[0][0], pre[0][1]);
  for (let i = 0; i < n; i++) { if (i > 0) sh.lineTo(pre[i][0], pre[i][1]); sh.quadraticCurveTo(pts[i][0], pts[i][1], post[i][0], post[i][1]); }
  sh.lineTo(pre[0][0], pre[0][1]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, width - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateY(-Math.PI / 2); g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()); g.translate(-c.x, 0, 0); g.computeVertexNormals(); return g;
}
// Reifen mit Profilrillen und Felge: Drehachse = x. Rückgabe Gruppe
export function makeWheel(r, w, { rim = 0xc9ccd0, rimMetal = 0.8, lugs = 5 } = {}) {
  const g = new THREE.Group(); const hw = w / 2; const prof = []; const k = r * 0.08; const rim0 = r * 0.62;
  prof.push(new THREE.Vector2(rim0, -hw * 0.9), new THREE.Vector2(r - k * 2.2, -hw), new THREE.Vector2(r - k, -hw * 0.95));
  const grooves = 4; for (let i = 0; i <= grooves * 2; i++) { const a = -hw * 0.78 + (i / (grooves * 2)) * hw * 1.56; prof.push(new THREE.Vector2(r - (i % 2 ? k * 1.5 : 0), a)); }
  prof.push(new THREE.Vector2(r - k, hw * 0.95), new THREE.Vector2(r - k * 2.2, hw), new THREE.Vector2(rim0, hw * 0.9));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), new THREE.MeshStandardMaterial({ color: 0x141517, roughness: 0.95 })); tire.rotation.z = Math.PI / 2; g.add(tire);
  const rm = new THREE.MeshStandardMaterial({ color: rim, roughness: 0.35, metalness: rimMetal });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(rim0, rim0, w * 0.82, 28), rm); disc.rotation.z = Math.PI / 2; g.add(disc);
  for (const sx of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(rim0 * 0.42, rim0 * 0.5, w * 0.1, 20), new THREE.MeshStandardMaterial({ color: 0x8c9096, roughness: 0.3, metalness: 0.9 })); cap.rotation.z = Math.PI / 2; cap.position.x = sx * w * 0.44; g.add(cap);
    for (let i = 0; i < lugs; i++) { const a = (i / lugs) * Math.PI * 2; const lug = new THREE.Mesh(new THREE.CylinderGeometry(rim0 * 0.07, rim0 * 0.07, w * 0.08, 6), new THREE.MeshStandardMaterial({ color: 0x45484d, roughness: 0.4, metalness: 0.9 })); lug.rotation.z = Math.PI / 2; lug.position.set(sx * w * 0.44, Math.cos(a) * rim0 * 0.7, Math.sin(a) * rim0 * 0.7); g.add(lug); } }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g;
}

