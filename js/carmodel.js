// Theos Seitenscheidel - Außenmodell: langer Rallye-Kombi (gleiche Maße wie Cockpit und Werkstatt, zeigt sich in den Spiegeln) oder kurzer Rallye-Wagen (short, Rivale Bruno, passt zu seiner Hitbox). x links, z vorn, Boden y = 0.05.
import * as THREE from './vendor/three.module.min.js';
import { profileGeo, makeWheel } from './gfx.js';
import { patchShadow } from './racemat.js';

const phys = (o) => { const m = new THREE.MeshPhysicalMaterial(o); m.onBeforeCompile = (s) => patchShadow(s); m.customProgramCacheKey = () => 'carPhys'; return m; };
function decal(num, name, col) { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const c = cv.getContext('2d'); c.clearRect(0, 0, 512, 256); c.fillStyle = '#f2efe6'; c.beginPath(); c.arc(128, 128, 104, 0, 7); c.fill(); c.fillStyle = '#121216'; c.font = 'bold 136px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(num), 128, 138); c.fillStyle = col; c.font = 'bold 64px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText(name, 250, 130); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function buildCar({ paint = 0xa81a12, trim = 0xf0ece0, number = 7, name = 'THEO', short = false } = {}) {
  const k = short ? 0.66 : 1; const Z = (z) => z * k; const P = (list) => list.map(([z, y]) => [Z(z), y]); const g = new THREE.Group(); g.name = 'carBody'; const body = phys({ color: paint, roughness: 0.32, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }); const stripe = phys({ color: trim, roughness: 0.4, clearcoat: 0.6 }); const dark = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.6 }); const glass = phys({ color: 0x0b1218, roughness: 0.06, metalness: 0.6, clearcoat: 1 });
  const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  // Seitenriss: Bug rechts (+z), Heck links; Schweller liegt 0,28 über dem Boden
  add(profileGeo(P([[3.55, 0.3], [3.62, 0.62], [3.3, 0.86], [1.25, 1.0], [0.25, 1.8], [-3.3, 1.84], [-3.72, 1.42], [-3.78, 0.34]]), 1.9, 0.1, 0.05), body); add(profileGeo(P([[3.4, 0.26], [3.4, 0.36], [-3.6, 0.36], [-3.6, 0.26]]), 1.96, 0.02, 0.01), dark); // Schweller
  add(profileGeo(P([[3.58, 0.64], [3.3, 0.88], [1.25, 1.02], [1.05, 1.02], [3.1, 0.84], [3.42, 0.62]]), 0.52, 0.02, 0.005), stripe, 0, 0.012, 0); // Rennstreifen
  // Fenster und Startnummer
  for (const s of [1, -1]) { add(profileGeo(P([[1.12, 1.03], [0.28, 1.72], [-0.52, 1.72], [-0.52, 1.03]]), 0.02, 0.05, 0), glass, s * 0.955, 0, 0); add(profileGeo(P([[-0.66, 1.03], [-0.66, 1.72], [-3.15, 1.74], [-3.5, 1.42], [-3.5, 1.03]]), 0.02, 0.05, 0), glass, s * 0.955, 0, 0); const dc = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshStandardMaterial({ map: decal(number, name, '#f2efe6'), transparent: true, roughness: 0.4 })); dc.position.set(s * 0.962, 0.66, Z(-0.2)); dc.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(dc); }
  { const dz = Z(1.25) - Z(0.25); const dy = 0.8; const len = Math.hypot(dz, dy); const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.76, len * 0.97), glass); ws.position.set(0, 1.405, Z(0.75) + 0.012); ws.rotation.x = -Math.atan2(dz, dy); g.add(ws); const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), glass); rear.position.set(0, 1.62, Z(-3.54) - 0.012); rear.rotation.set(0.6, Math.PI, 0); g.add(rear); }
  // Lampen
  const lamp = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffeab0, emissiveIntensity: 1.4, roughness: 0.2 }); const tail = new THREE.MeshStandardMaterial({ color: 0xff2410, emissive: 0xc01408, emissiveIntensity: 1.3, roughness: 0.3 });
  for (const s of [1, -1]) { add(new THREE.BoxGeometry(0.42, 0.14, 0.04), lamp, s * 0.6, 0.72, Z(3.62) - 0.008); add(new THREE.BoxGeometry(0.34, 0.16, 0.04), tail, s * 0.68, 1.02, Z(-3.76) - 0.03); add(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 20).rotateX(Math.PI / 2), lamp, s * 0.28, 0.98, Z(3.3) + 0.02); }
  add(new THREE.BoxGeometry(1.5, 0.2, 0.05), dark, 0, 0.5, Z(3.6) + 0.02); // Kühlergrill
  add(profileGeo(P([[-3.28, 1.92], [-3.28, 1.98], [-3.78, 2.0], [-3.8, 1.94]]), 1.8, 0.015, 0), dark); for (const s of [1, -1]) add(new THREE.BoxGeometry(0.04, 0.2, 0.3), dark, s * 0.7, 1.9, Z(-3.5)); // Heckspoiler
  // Räder (0, 1 vorn lenkbar)
  const wheels = []; for (const [x, z] of [[0.92, 2.5], [-0.92, 2.5], [0.92, -2.5], [-0.92, -2.5]]) { const pivot = new THREE.Group(); pivot.position.set(x, 0.42, Z(z)); const w = makeWheel(0.4, 0.3, { rim: 0xdcdcd8 }); pivot.add(w); g.add(pivot); wheels.push({ pivot, w }); add(new THREE.BoxGeometry(0.34, 0.5, 1.06), dark, x > 0 ? 0.82 : -0.82, 0.62, Z(z)); }
  let spin = 0; return { group: g, update(dt, speed, steer) { spin += speed / 0.4 * dt; for (let i = 0; i < 4; i++) { wheels[i].w.rotation.x = spin; if (i < 2) wheels[i].pivot.rotation.y = steer * 0.4; } } };
}
