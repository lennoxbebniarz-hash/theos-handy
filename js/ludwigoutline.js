// Theos Seitenscheidel - Ludwig Zigaretti: leuchtende Umrandung für das, was Ludwig gerade anschaut (2026-11-21, Wunsch Lennox: „mini kleine leuchtende Umrandung von dem Objekt, auf das man guckt“).
// Technik „umgedrehte Hülle“: Jedes Teil des Objekts bekommt ein Kind mit derselben Form, entlang geglätteter Normalen ein paar Millimeter nach außen geschoben,
// nur die Rückseiten, additiv in Glut-Orange und leicht pulsierend. Die echte Oberfläche verdeckt die Hülle, sichtbar bleibt der Rand um die Silhouette.
// Unsichtbare Stellvertreter (Material ohne Farbe und Tiefe, userData.proxy) bekommen auch einen Rand: so leuchten zusammengefasste Teile (Brunnen, Bett, Rauchmelder).
// Ohne festes Objekt sucht pickOutline() per Strahl aus der Bildmitte das getroffene kleine Teil in Zielnähe und nimmt die größte Gruppe darüber, die noch klein ist (bis 2,2 m Diagonale).
// Die Materialien werden nie weggeworfen (Vorrat), damit der Shader nur einmal übersetzt wird.
import * as THREE from './vendor/three.module.min.js';
import { mergeVertices } from './vendor/BufferGeometryUtils.js';

const HULL = new WeakMap(); // Quell-Geometrie → geglättete Hülle (einmal je Geometrie)
function hullGeo(src) {
  let g = HULL.get(src); if (g) return g;
  g = new THREE.BufferGeometry(); g.setAttribute('position', src.attributes.position); if (src.index) g.setIndex(src.index);
  for (const k of ['skinIndex', 'skinWeight']) if (src.attributes[k]) g.setAttribute(k, src.attributes[k]);
  try { g = mergeVertices(g, 1e-4); } catch (e) { /* bleibt kantig */ }
  g.computeVertexNormals(); HULL.set(src, g); return g;
}

export function createOutline({ color = 0xffa040 } = {}) {
  const pool = []; let used = 0; let cur = null; const parts = []; const tmp = new THREE.Vector3();
  function makeMat() {
    const uThick = { value: 0.01 }; const uPush = { value: 0 }; const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false });
    // uPush schiebt die Hülle auf dem Sehstrahl nach hinten: gleiche Stelle im Bild, aber Kanten im Inneren verschwinden hinter dem Körper (Figuren aus vielen Kugeln)
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uThick = uThick; sh.uniforms.uPush = uPush;
      sh.vertexShader = 'uniform float uThick;\nuniform float uPush;\n' + sh.vertexShader
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position ) + normal * uThick;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nmvPosition.xyz += normalize( mvPosition.xyz ) * uPush;\ngl_Position = projectionMatrix * mvPosition;');
    };
    m.customProgramCacheKey = () => 'lw-outline-2'; m.userData.uThick = uThick; m.userData.uPush = uPush; return m;
  }
  const getMat = () => { if (used < pool.length) return pool[used++]; const m = makeMat(); pool.push(m); used++; return m; };
  function clear() { for (const o of parts) if (o.parent) o.parent.remove(o); parts.length = 0; used = 0; cur = null; }
  function set(obj) {
    if (obj === cur) return; clear(); if (!obj) return; cur = obj; const list = [];
    obj.traverse((m) => { if (m.isMesh && !m.isInstancedMesh && !m.userData.outline && !m.userData.noOutline && m.geometry && m.geometry.attributes.position) list.push(m); });
    for (const m of list.slice(0, 80)) {
      const geo = hullGeo(m.geometry); const mat = getMat(); mat.userData.uPush.value = m.userData.outlinePush || 0; let o;
      if (m.isSkinnedMesh) { o = new THREE.SkinnedMesh(geo, mat); o.bindMode = m.bindMode; o.bind(m.skeleton, m.bindMatrix); } else o = new THREE.Mesh(geo, mat);
      o.userData.outline = true; o.userData.src = m; o.frustumCulled = false; o.renderOrder = 3; o.raycast = () => {}; m.add(o); parts.push(o);
    }
  }
  // jedes Bild: Dicke nach Abstand (etwa gleich viele Pixel), durch die Skalierung des Teils geteilt; sanftes Pulsieren
  function update(t, cam) {
    if (!cur) return; (cur.userData.anker || cur).getWorldPosition(tmp); /* bei Figuren liegt die Wurzel im Nullpunkt, dann zählt der Anker */ const base = Math.min(0.03, Math.max(0.005, tmp.distanceTo(cam.position) * 0.006)); const op = 0.5 + 0.32 * (0.5 + 0.5 * Math.sin(t * 5));
    for (const o of parts) { o.userData.src.getWorldScale(tmp); const s = (Math.abs(tmp.x) + Math.abs(tmp.y) + Math.abs(tmp.z)) / 3 || 1; o.material.userData.uThick.value = base / s; o.material.opacity = op; }
  }
  return { set, clear, update, current: () => cur, count: () => parts.length };
}

// Ziel ohne festes Objekt: kleine, sichtbare Teile in der Nähe sammeln, Strahl von Ludwigs Augen in Blickrichtung (nicht von der Kamera: die steht im selben Bild noch
// am alten Platz, etwa nach einem Sprung), Treffer muss nah am Zielpunkt liegen. skip: Teile darunter zählen nicht (Kamera mit den Sachen in der Hand).
const ray = new THREE.Raycaster(); const pv = new THREE.Vector3(); const sv = new THREE.Vector3(); const box = new THREE.Box3(); const size = new THREE.Vector3();
const under = (o, root) => { for (let q = o; q; q = q.parent) if (q === root) return true; return false; };
function groupOf(m) { let best = m; for (let q = m.parent; q && q.parent && !q.isScene; q = q.parent) { box.setFromObject(q); if (box.isEmpty() || box.getSize(size).length() > 2.2) break; best = q; } return best; }
export function pickOutline(scene, origin, dir, p, skip = null, near = 0.9) {
  const cand = [];
  scene.traverseVisible((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.outline || o.userData.proxy) return; const g = o.geometry; if (!g || !g.attributes.position) return;
    if (!g.boundingSphere) g.computeBoundingSphere(); o.getWorldScale(sv); const rad = g.boundingSphere.radius * Math.max(Math.abs(sv.x), Math.abs(sv.y), Math.abs(sv.z)); if (rad > 1.3) return;
    o.getWorldPosition(pv); if (pv.distanceTo(origin) > 5) return; if (skip && under(o, skip)) return; cand.push(o);
  });
  ray.set(origin, sv.copy(dir).normalize()); ray.far = 4.5; const hits = ray.intersectObjects(cand, false);
  for (const h of hits) { if (p && h.point.distanceTo(p) > near) continue; return groupOf(h.object); }
  return null;
}
