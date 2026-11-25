// Theos Seitenscheidel - Strom aus wegen Brunos Geschirrspüler: Regen (Abstimmung Paket 3, 2026-11-22).
// Wann es regnet, steht in stromlogic.js (rainAt), hier nur das Bild: Tropfen rund um die Kamera und kleine Kreise, wo sie aufkommen.
// Unter Dächern regnet es nicht: Halle, Büro, Bunkerhügel, Dönerladen und Depot halten dicht.
import * as THREE from './vendor/three.module.min.js';
import { HALL, OFFICE, DOENER, DEPOT, BUNKER_DOOR } from './stromlogic.js';

export const DAECHER = [
  { x0: HALL.x0 - 0.4, x1: HALL.x1 + 0.4, z0: HALL.z0 - 0.4, z1: HALL.z1 + 0.4, h: HALL.h + 0.9 },
  { x0: OFFICE.x0 - 0.2, x1: OFFICE.x1 + 0.4, z0: OFFICE.z0 - 0.4, z1: OFFICE.z1 + 0.4, h: 3.3 },
  { x0: BUNKER_DOOR.x - 21, x1: BUNKER_DOOR.x + 0.8, z0: BUNKER_DOOR.z - 10.6, z1: BUNKER_DOOR.z + 10.6, h: 6 },
  { x0: DOENER.x0, x1: DOENER.x1, z0: DOENER.z0, z1: DOENER.z1, h: 4 },
  { x0: DEPOT.x0 - 0.2, x1: DEPOT.x1 + 0.2, z0: DEPOT.z0 - 0.2, z1: DEPOT.z1 + 0.2, h: 9 },
];
export function dachHoehe(x, z) {
  for (const d of DAECHER) if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d.h;
  return -Infinity;
}

const TROPFEN = 4000;
const KREISE = 200;
const WEITE = 17; // so weit um die Kamera
const UNTEN = -7;
const OBEN = 13;
const WIND = 1.8; // Meter je Sekunde schräg
const rund = (v, mitte, weite) => mitte + ((((v - mitte + weite) % (2 * weite)) + 2 * weite) % (2 * weite)) - weite;

// Die Nachbearbeitung liest den Alpha-Kanal (Innenraum = 0): Regen darf ihn nicht verändern
function regenStoff(color, opacity, Material) {
  const m = new Material({ color, opacity, transparent: true, depthWrite: false });
  m.blending = THREE.CustomBlending;
  m.blendSrc = THREE.SrcAlphaFactor;
  m.blendDst = THREE.OneMinusSrcAlphaFactor;
  m.blendSrcAlpha = THREE.ZeroFactor;
  m.blendDstAlpha = THREE.OneFactor;
  return m;
}

// boden(x, z): Höhe, auf der ein Tropfen aufkommt
export function createRegen(scene, boden) {
  const pos = new Float32Array(TROPFEN * 6);
  const linien = new THREE.BufferGeometry();
  linien.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const strichM = regenStoff(0xb4c6d6, 0.4, THREE.LineBasicMaterial);
  const striche = new THREE.LineSegments(linien, strichM);
  striche.frustumCulled = false;
  striche.visible = false;
  striche.renderOrder = 4;
  scene.add(striche);

  const kreisG = new THREE.RingGeometry(0.75, 1, 10).rotateX(-Math.PI / 2);
  const kreise = new THREE.InstancedMesh(kreisG, regenStoff(0xd4e2ec, 0.24, THREE.MeshBasicMaterial), KREISE);
  kreise.frustumCulled = false;
  kreise.visible = false;
  kreise.castShadow = false;
  kreise.renderOrder = 4;
  scene.add(kreise);

  const T = Array.from({ length: TROPFEN }, () => ({
    x: (Math.random() - 0.5) * WEITE * 2,
    y: Math.random() * (OBEN - UNTEN),
    z: (Math.random() - 0.5) * WEITE * 2,
    v: 14 + Math.random() * 6,
    l: 0.3 + Math.random() * 0.35,
  }));
  const K = Array.from({ length: KREISE }, () => ({ x: 0, y: 0, z: 0, t: Math.random() * 0.3, zu: true }));
  const M = new THREE.Matrix4();
  let staerke = 0;
  let zahl = 0;

  function tropfen(dt, cam, n) {
    const spanne = (OBEN - UNTEN) / 2;
    const mitteY = cam.y + (OBEN + UNTEN) / 2;
    for (let i = 0; i < n; i++) {
      const d = T[i];
      const j = i * 6;
      d.x = rund(d.x + WIND * dt, cam.x, WEITE);
      d.y = rund(d.y - d.v * dt, mitteY, spanne);
      d.z = rund(d.z, cam.z, WEITE);
      const nah = Math.abs(d.x - cam.x) < 0.5 && Math.abs(d.z - cam.z) < 0.5;
      const weg = nah || d.y < dachHoehe(d.x, d.z);
      pos[j] = d.x;
      pos[j + 1] = d.y;
      pos[j + 2] = d.z;
      pos[j + 3] = weg ? d.x : d.x - WIND / d.v * d.l;
      pos[j + 4] = weg ? d.y : d.y + d.l;
      pos[j + 5] = d.z;
    }
    linien.setDrawRange(0, n * 2);
    linien.attributes.position.needsUpdate = true;
  }

  function aufschlag(dt, cam, n) {
    for (let i = 0; i < n; i++) {
      const k = K[i];
      k.t += dt;
      if (k.t >= 0.3) {
        const r = 1.5 + Math.random() * 10;
        const a = Math.random() * Math.PI * 2;
        k.x = cam.x + Math.cos(a) * r;
        k.z = cam.z + Math.sin(a) * r;
        k.zu = dachHoehe(k.x, k.z) > -Infinity; // auf Dächern sieht man die Kreise ohnehin nicht
        if (!k.zu) k.y = boden(k.x, k.z);
        k.t = Math.random() * 0.08;
      }
      const s = k.zu ? 0 : 0.02 + k.t * 0.27;
      M.makeScale(s, s, s).setPosition(k.x, k.y, k.z);
      kreise.setMatrixAt(i, M);
    }
    kreise.count = n;
    kreise.instanceMatrix.needsUpdate = true;
  }

  return {
    // k: 0 = trocken, 1 = Gewitterguss
    set(k) { staerke = Math.max(0, Math.min(1, k || 0)); },
    get staerke() { return staerke; },
    get zahl() { return zahl; },
    update(dt, cam) {
      const an = staerke > 0.01;
      striche.visible = an;
      kreise.visible = an;
      zahl = 0;
      if (!an) return;
      zahl = Math.floor(TROPFEN * (0.25 + 0.75 * staerke));
      strichM.opacity = 0.28 + 0.2 * staerke;
      tropfen(dt, cam, zahl);
      aufschlag(dt, cam, Math.max(1, Math.floor(KREISE * staerke)));
    },
  };
}
