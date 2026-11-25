// Theos Seitenscheidel - Strom aus wegen Brunos Geschirrspüler: Mitspieler sichtbar beim Treten, Rennen und Kurbeln (Abstimmung Paket 3, 2026-11-22).
// Wer an welchem Erzeuger hängt, steht schon im Netz (mus). Pedale, Kurbel und Rad drehen sich je nach Leistung,
// hier kommt die Figur dazu: Füße auf die echten Pedale, Hände an Lenker und Kurbelgriff, im Laufrad rennt sie.
import * as THREE from './vendor/three.module.min.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Maße aus den Blender-Modellen (strommodels.js), in Koordinaten des Erzeugers
const FAHRRAD = {
  huefte: { x: -0.17, y: 1.13 }, // knapp über dem Ledersattel
  lenker: { x: 0.3, y: 1.1, breit: 0.23 },
  pedal: { arm: 0.165, breit: 0.16 },
  fuss: 0.14, // so weit außen steht der Fuß, sonst steckt er im Rahmen
};
const LAUFRAD_BODEN = 0.19; // Innenseite vom Rad unter der Achse
const KURBEL = { stand: { x: 0.03, z: 0.66 }, griff: V3(0.115, 0.148, 0) };

const haende = () => ({ wrist: V3(), F: V3(0, 0, 1), P: V3(0, -1, 0), grip: 0.85 });
const fuesse = () => ({ ankle: V3(), toe: V3() });
const neuePose = () => ({
  x: 0, y: 0.95, z: 0, yaw: 0, lean: 0, slump: 0, twist: 0, headYaw: 0, headPitch: 0,
  hands: { L: haende(), R: haende() },
  feet: { L: fuesse(), R: fuesse() },
  armPole: { L: V3(), R: V3() },
  legPole: { L: V3(), R: V3() },
});
const posen = new WeakMap();
const t = V3();

function aufstellen(P, x, y, z, yaw) {
  P.place(x, y, z, yaw);
  P.space.position.set(x, y, z);
  P.space.rotation.set(0, yaw, 0);
  P.space.updateMatrixWorld(true);
  let p = posen.get(P);
  if (!p) { p = neuePose(); posen.set(P, p); }
  p.yaw = yaw;
  return p;
}
// Punkt auf einem Teil des Modells, gesehen von der Figur
function vomTeil(P, teil, x, y, z) {
  teil.updateWorldMatrix(true, false);
  return P.space.worldToLocal(teil.localToWorld(t.set(x, y, z)));
}

function treten(P, m) {
  const g = m.group;
  const p = aufstellen(P, g.position.x, g.position.y, g.position.z, g.rotation.y + Math.PI / 2);
  p.x = 0; p.y = FAHRRAD.huefte.y; p.z = FAHRRAD.huefte.x;
  p.lean = -0.3; p.slump = 0.13; p.headPitch = 0.1; // Rücken nach vorn, Kopf schaut über den Lenker
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const h = p.hands[k];
    h.wrist.set(s * FAHRRAD.lenker.breit, FAHRRAD.lenker.y, FAHRRAD.lenker.x);
    h.F.set(0, -0.25, 1).normalize();
    h.P.set(0, -1, 0);
    p.armPole[k].set(s * 0.7, -0.6, -0.3);
    const pedal = vomTeil(P, m.parts.FG_Tretkurbel_Dreh, 0, s * FAHRRAD.pedal.arm, -s * FAHRRAD.pedal.breit); // rechts: das Pedal auf der +z-Seite
    const f = p.feet[k];
    f.ankle.set(s * FAHRRAD.fuss, pedal.y + 0.08, pedal.z - 0.07);
    f.toe.set(f.ankle.x, f.ankle.y - 0.06, f.ankle.z + 0.135);
    p.legPole[k].set(s * 0.1, 0.3, 1);
  }
  P.fig.pose(P.space, p);
  return 2.3;
}

function kurbeln(P, m) {
  const g = m.group;
  t.set(KURBEL.stand.x, 0, KURBEL.stand.z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, g.rotation.y);
  const p = aufstellen(P, g.position.x + t.x, 0, g.position.z + t.z, g.rotation.y + Math.PI);
  p.x = 0; p.y = 0.93; p.z = 0;
  p.lean = -0.3; p.slump = 0.05; p.headPitch = -0.45; // schaut auf die Kurbel
  const griff = vomTeil(P, m.parts.HK_Kurbel_Dreh, KURBEL.griff.x, KURBEL.griff.y, KURBEL.griff.z);
  const R = p.hands.R;
  R.wrist.set(griff.x, griff.y + 0.04, griff.z - 0.07);
  R.F.set(0, -0.3, 1).normalize();
  R.P.set(0, -1, 0);
  p.twist = (griff.z - 0.66) * 0.4; // die Schulter geht mit
  const L = p.hands.L;
  L.wrist.set(0.3, 0.97, 0.3);
  L.F.set(0, -0.2, 1).normalize();
  L.P.set(0, -1, 0);
  L.grip = 0.2;
  p.armPole.L.set(0.7, -0.6, -0.3);
  p.armPole.R.set(-0.8, -0.5, -0.3);
  for (const [k, s, z] of [['L', 1, 0.07], ['R', -1, -0.12]]) {
    p.feet[k].ankle.set(s * 0.14, 0.09, z);
    p.feet[k].toe.set(s * 0.15, 0.03, z + 0.135);
    p.legPole[k].set(s * 0.15, 0.2, 1);
  }
  P.fig.pose(P.space, p);
  return 2.15;
}

function rennen(P, m, dt, zeit, kraft) {
  const g = m.group;
  P.place(g.position.x, g.position.y + LAUFRAD_BODEN, g.position.z, g.rotation.y - Math.PI / 2); // gegen die Drehrichtung
  P.mode = kraft > 0.02 ? 'walk' : 'stand';
  P.speed = kraft > 0.02 ? Math.min(3.2, 1.2 + kraft * 1.8) : 0;
  P.act = 0;
  P.lookAt = null;
  P.update(dt, zeit);
  return LAUFRAD_BODEN + 2.3;
}

const ART = { fahrrad: treten, laufrad: rennen, kurbel: kurbeln };
export const kannMuskel = (m) => !!m && !!ART[m.id];
// P: Figur, m: Modell des Erzeugers aus W.gens, kraft: 0 bis 1,5. Gibt die Höhe für das Namensschild zurück.
export function poseMuskel(P, m, dt, zeit, kraft = 0) {
  return ART[m.id](P, m, dt, zeit, kraft);
}
