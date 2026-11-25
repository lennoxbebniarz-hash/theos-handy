// Theos Seitenscheidel - die Figuren der Startbildschirme, spielbar (Wunsch Lennox 2026-11-22: „als character die machen die auch auf dem startbildschirm zu sehen sind“).
// Dieselben Formen wie titelfigur.js, aber als eine Haut auf dem Skelett aus racefigure.js: So passen alle Haltungen, Hände und angehängten Sachen weiter,
// und eine Figur kostet zwei bis drei Zeichenaufrufe statt über dreißig. look wie bei createBuddy, dazu:
//   frau: 'lang' | 'zopf' | 'dutt' | 'bob', rock: Farbe, hut: 'cap' | 'helm' | 'keine', brille, bart: 'schnauzer' | 'voll', face: smile | grin | flat | frown
import * as THREE from './vendor/three.module.min.js';
import { createFigure } from './racefigure.js';
import { createPerson } from './casinofig.js';
import { rbox, canvasTex, TAU } from './titelkit.js';
import { HEAD, TORSO, TORSO_Z, MOUTHS, brimGeo, patch, torsoR, drawBolt } from './titelfigur.js';

const S = 0.88; const CY = 1.728; const CZ = 0.012; // der große Kopf: Kinn über dem Hals, Cap knapp über zwei Metern
const AUGE_Y = 0.022;
const BONE_HEAD = [0, 1.585, 0.005];
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const mx = (pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) => {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return new THREE.Matrix4().compose(V3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), V3(...s));
};
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
const GEO = new Map();
const geo = (key, make) => { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); };
const ball = (n = 8) => geo(`ball${n}`, () => new THREE.SphereGeometry(1, n, Math.max(5, Math.ceil(n * 0.7))));
const seg = (r0, r1) => geo(`seg${r0}|${r1}`, () => new THREE.CylinderGeometry(r1, r0, 1, 10, 1).translate(0, 0.5, 0));
const UP = V3(0, 1, 0);
const zwischen = (a, b) => { const d = V3(...b).sub(V3(...a)); const l = d.length(); return new THREE.Matrix4().compose(V3(...a), new THREE.Quaternion().setFromUnitVectors(UP, d.divideScalar(l)), V3(1, l, 1)); };

// Sammelt Teile zu einer Geometrie. w: Knochenname oder (x, y, z) => [[Knochen, Gewicht], [Knochen, Gewicht]]. zweiSeiten: true oder { innen: Farbe der Innenseite }
function bau(idx = null) {
  const pos = []; const nor = []; const col = []; const si = []; const sw = []; const c = new THREE.Color(); const v = V3(); const n = V3(); const nm = new THREE.Matrix3();
  function add(g, color, m = new THREE.Matrix4(), w = 'head', zweiSeiten = false) {
    const P = g.attributes.position; const N = g.attributes.normal; const I = g.index; const anz = I ? I.count : P.count; c.setHex(color); nm.getNormalMatrix(m);
    for (const dreh of zweiSeiten ? [false, true] : [false]) {
      if (dreh && zweiSeiten.innen !== undefined) c.setHex(zweiSeiten.innen);
      for (let t = 0; t < anz; t += 3) {
        for (let e = 0; e < 3; e++) {
          const j = t + (dreh ? 2 - e : e); const i = I ? I.getX(j) : j;
          v.fromBufferAttribute(P, i).applyMatrix4(m); n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
          if (dreh) { n.negate(); v.addScaledVector(n, 0.004); } // Innenseite etwas dahinter, sonst leuchtet beim Anschauen die ganze Fläche statt nur der Rand
          pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z); col.push(c.r, c.g, c.b);
          if (idx) { const L = typeof w === 'string' ? [[w, 1]] : w(v.x, v.y, v.z); const a = L[0]; const b = L[1] || [a[0], 0]; si.push(idx[a[0]], idx[b[0]], 0, 0); sw.push(a[1], b[1], 0, 0); }
        }
      }
    }
  }
  function fertig() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    if (idx) { g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); }
    g.computeBoundingSphere(); return g;
  }
  return { add, fertig };
}

// Rock: eng an den Oberschenkeln, damit er im Sitzen auf ihnen liegt. Ringe: Höhe, halbe Breite, halbe Tiefe
const ROCK = [[0.565, 0.238, 0.117], [0.63, 0.236, 0.12], [0.71, 0.231, 0.126], [0.8, 0.227, 0.141], [0.89, 0.226, 0.176], [0.975, 0.222, 0.186], [1.035, 0.208, 0.182]];
function rockGeo() {
  const g = new THREE.LatheGeometry(ROCK.map(([y, rx]) => new THREE.Vector2(rx, y)), 20); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const [, rx, rz] = ROCK[i % ROCK.length]; p.setZ(i, p.getZ(i) * rz / rx); }
  g.computeVertexNormals(); return g;
}
function rockW(x, y) {
  if (y > 0.93) return [['hips', 1]];
  if (Math.abs(x) < 0.02) return [['upL', 0.5], ['upR', 0.5]];
  return [[x > 0 ? 'upL' : 'upR', 1]];
}
// Goldkette: vorne als V über der Brust, hinten am Kragen entlang
function kettenGeo() {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = 1 - i / 6; const x = t * 0.135; const y = 1.362 + 0.128 * t * t; const r = torsoR((y - 0.985) / 0.91);
    pts.push(V3(x, y, TORSO_Z * Math.sqrt(Math.max(0, r * r - x * x)) + 0.017));
  }
  for (let i = 1; i < 8; i++) { const a = i / 8 * Math.PI; pts.push(V3(-Math.cos(a) * 0.135, 1.497, -Math.sin(a) * 0.125)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 48, 0.017, 5, true);
}
// rosa Wangen, flach auf das Gesicht gelegt
function wangeGeo(s) {
  const g = new THREE.CircleGeometry(0.037, 12); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + s * 0.156; const y = p.getY(i) * 0.68 - 0.071; p.setXYZ(i, x, y, HEAD.z * Math.sqrt(Math.max(0, 1 - (x / HEAD.x) ** 2 - (y / HEAD.y) ** 2)) + 0.004); }
  g.computeVertexNormals(); return g;
}

// weicher Übergang die Wirbelsäule hoch
const WIRBEL = [['hips', 1.0], ['spine', 1.1], ['spine1', 1.23], ['spine2', 1.38]];
function rumpfW(x, y) {
  if (y <= WIRBEL[0][1]) return [['hips', 1]];
  for (let i = 0; i < WIRBEL.length - 1; i++) { const [a, ya] = WIRBEL[i]; const [b, yb] = WIRBEL[i + 1]; if (y <= yb) { const k = (y - ya) / (yb - ya); return [[a, 1 - k], [b, k]]; } }
  return [['spine2', 1]];
}
const rumpfY = (y) => 0.985 + y * 0.91; // Titel-Rumpf (Hüfte 0.8) auf die Höhe des Skeletts
const kopfM = mx([0, CY, CZ], [0, 0, 0], S);
const im = (...ms) => ms.reduce((a, b) => a.clone().multiply(b));

function koerper(L, idx) {
  const B = bau(idx); const frau = L.frau; const schmal = frau ? 0.91 : 1; const dunkel = shade(L.shirt, 0.72);
  B.add(geo('torso', () => new THREE.LatheGeometry(TORSO.map(([r, y]) => new THREE.Vector2(r, rumpfY(y))), 16)), L.shirt, mx([0, 0, 0], [0, 0, 0], [schmal, 1, TORSO_Z]), rumpfW);
  B.add(geo('becken', () => new THREE.LatheGeometry([[0.001, -0.16], [0.12, -0.15], [0.192, -0.09], [0.206, -0.02]].map(([r, y]) => new THREE.Vector2(r, rumpfY(y))), 16)), L.pants, mx([0, 0, 0], [0, 0, 0], [1, 1, 0.85]), 'hips');
  B.add(seg(0.085, 0.08), L.skin, mx([0, 1.45, 0], [0, 0, 0], [1, 0.12, 1]), (x, y) => (y > 1.52 ? [['neck', 1]] : [['spine2', 1]]));
  B.add(geo('kragen', () => new THREE.TorusGeometry(0.1, 0.022, 5, 16).rotateX(Math.PI / 2)), dunkel, mx([0, 1.49, 0.005], [0, 0, 0], [1, 1, 0.9]), 'spine2');
  if (L.chain) B.add(geo('kette', kettenGeo), 0xe0b050, undefined, 'spine2');
  if (L.rock !== undefined) {
    const innen = shade(L.rock, 0.4);
    B.add(geo('rock', rockGeo), L.rock, undefined, rockW, { innen });
    // dunkler Schatten im Saum, sonst schaut man im Sitzen von vorne in den leeren Rock
    B.add(geo('rockboden', () => new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2)), innen, mx([0, 0.6, 0], [0, 0, 0], [0.226, 1, 0.109]), rockW, true);
  }
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const arm = `arm${k}`; const fore = `fore${k}`; const hand = `hand${k}`; const d = frau ? 0.92 : 1;
    const dick = (a, b) => im(zwischen(a, b), mx([0, 0, 0], [0, 0, 0], [d, 1, d]));
    // Gelenkkugeln sitzen genau im Gelenk und hängen an einem Knochen: rund in jeder Haltung, die Schnittkanten der Glieder liegen darin
    B.add(ball(16), L.shirt, mx([s * 0.215, 1.45, 0], [0, 0, 0], 0.0975 * d), arm);
    B.add(seg(0.094, 0.086), L.shirt, dick([s * 0.215, 1.45, 0], [s * 0.4, 1.45, 0]), arm);
    B.add(seg(0.064, 0.056), L.skin, dick([s * 0.38, 1.45, 0], [s * 0.545, 1.45, 0]), arm);
    B.add(ball(12), L.skin, mx([s * 0.545, 1.45, 0], [0, 0, 0], 0.059 * d), arm);
    B.add(seg(0.056, 0.045), L.skin, dick([s * 0.545, 1.45, 0], [s * 0.835, 1.45, 0]), fore);
    B.add(ball(12), L.skin, mx([s * 0.835, 1.45, 0], [0, 0, 0], 0.0475 * d), hand);
    // runde Hand mit dicken Fingern wie auf dem Startbildschirm, sie beugen sich mit dem Skelett
    B.add(ball(10), L.skin, mx([s * 0.88, 1.45, 0.004], [0, 0, 0], [0.066, 0.04, 0.062]), hand);
    [0.039, 0.013, -0.013, -0.039].forEach((z, i) => B.add(ball(8), L.skin, mx([s * 0.952, 1.448, z], [0, 0, 0], [0.043, 0.022, 0.019]), `f${k}${i}0`));
    B.add(ball(6), L.skin, mx([s * 0.886, 1.435, 0.07], [0, 0, 0], [0.03, 0.022, 0.034]), `t${k}0`);

    const up = `up${k}`; const leg = `leg${k}`; const foot = `foot${k}`; const bx = s * 0.105;
    B.add(ball(10), L.pants, mx([bx, 0.95, 0], [0, 0, 0], 0.11), () => [['hips', 0.4], [up, 0.6]]);
    B.add(seg(0.112, 0.087), L.pants, zwischen([bx, 0.96, 0], [bx, 0.53, 0.005]), up);
    B.add(ball(12), L.pants, mx([s * 0.1, 0.53, 0.005], [0, 0, 0], 0.0915), up);
    B.add(seg(0.086, 0.076), L.pants, zwischen([bx, 0.53, 0.005], [bx, 0.1, -0.005]), leg);
    B.add(rbox(0.17, 0.12, 0.3, 0.055, 2), L.shoe, mx([bx, 0.07, 0.05]), foot);
    B.add(rbox(0.176, 0.04, 0.305, 0.018, 1), 0x30343b, mx([bx, 0.023, 0.05]), foot);
    B.add(rbox(0.178, 0.03, 0.09, 0.012, 1), L.shirt, mx([bx, 0.075, 0.03]), foot);
  }
  kopf(B, L);
  return B.fertig();
}

function kopf(B, L) {
  const K = (g, color, pos, rot, scale, beidseitig = false) => B.add(g, color, im(kopfM, mx(pos, rot, scale)), 'head', beidseitig);
  K(ball(18), L.skin, [0, 0, 0], undefined, [HEAD.x, HEAD.y, HEAD.z]);
  for (const s of [1, -1]) K(ball(), L.skin, [s * 0.265, -0.015, 0], undefined, [0.034, 0.062, 0.05]);
  K(ball(), shade(L.skin, 0.88), [0, -0.04, 0.262], undefined, [0.043, 0.0365, 0.0387]);

  const hut = L.hut || (L.frau ? 'keine' : 'cap'); const ohneHut = hut === 'keine';
  K(geo('haare', () => new THREE.SphereGeometry(0.279, 20, 10, 0, TAU, 0, Math.PI * 0.56)), L.hair, [0, 0.005, -0.012], [ohneHut ? -0.72 : -0.62, 0, 0], ohneHut ? [1.01, 1.05, 0.98] : [1, 0.98, 0.97]);
  for (let i = 0; i < 5; i++) {
    const a = (i - 2) * 0.36; const y = 0.163 - Math.abs(i - 2) * 0.006;
    if (ohneHut) K(ball(), L.hair, [Math.sin(a) * 0.2, y + 0.018, Math.cos(a) * 0.19], [0, a, (i - 2) * 0.14], [0.1, 0.038, 0.035]);
    else K(ball(), L.hair, [Math.sin(a) * 0.205, y, Math.cos(a) * 0.178], [0, a, (i - 2) * 0.25], [0.072, 0.033, 0.036]);
  }
  if (L.frau) {
    if (L.frau === 'lang') {
      K(ball(14), L.hair, [0, -0.17, -0.15], undefined, [0.27, 0.3, 0.13]);
      for (const s of [1, -1]) { K(ball(10), L.hair, [s * 0.25, -0.11, -0.025], [0, 0, s * 0.15], [0.07, 0.23, 0.12]); K(ball(), L.hair, [s * 0.255, 0.07, 0.03], undefined, [0.05, 0.1, 0.1]); }
    } else if (L.frau === 'bob') {
      K(ball(14), L.hair, [0, -0.04, -0.1], undefined, [0.286, 0.21, 0.2]);
      for (const s of [1, -1]) K(ball(10), L.hair, [s * 0.245, -0.07, 0.04], [0, 0, s * -0.12], [0.07, 0.16, 0.12]);
    } else {
      for (const s of [1, -1]) K(ball(), L.hair, [s * 0.25, 0.05, 0.03], undefined, [0.045, 0.12, 0.09]);
      if (L.frau === 'dutt') {
        K(ball(12), L.hair, [0, 0.22, -0.2], undefined, 0.115);
        K(geo('band', () => new THREE.TorusGeometry(0.075, 0.022, 5, 12)), L.cap, [0, 0.175, -0.15], [0.75, 0, 0]);
      } else {
        // Zopf seitlich über die linke Schulter nach vorne, damit man ihn auch von vorne sieht
        const zopf = [[0.255, -0.1, -0.07, 0.077], [0.268, -0.19, 0.015, 0.072], [0.262, -0.28, 0.085, 0.064], [0.25, -0.36, 0.13, 0.052], [0.236, -0.44, 0.14, 0.038]];
        for (const [x, y, z, r] of zopf) K(ball(10), L.hair, [x, y, z], undefined, [r, r * 1.22, r]);
        K(ball(8), L.cap, [0.243, -0.405, 0.14], undefined, [0.05, 0.026, 0.05]);
      }
    }
  }
  const capM = [[0, 0.112, -0.005], [-0.2, 0, 0]];
  if (hut !== 'keine') {
    const H = im(kopfM, mx(...capM));
    const C = (g, color, pos, scale, beidseitig) => B.add(g, color, im(H, mx(pos, [0, 0, 0], scale)), 'head', beidseitig);
    const helm = hut === 'helm';
    C(geo('cap', () => new THREE.SphereGeometry(0.287, 20, 8, 0, TAU, 0, Math.PI / 2)), L.cap, [0, 0, 0], helm ? [1.05, 0.9, 1.03] : [1, 0.8, 0.98]);
    if (helm) {
      C(geo('helmrand', () => new THREE.CylinderGeometry(0.33, 0.342, 0.025, 20)), L.cap, [0, 0.005, 0]);
      C(rbox(0.06, 0.05, 0.4, 0.02, 1), shade(L.cap, 0.85), [0, 0.23, 0]);
    } else {
      C(geo('capband', () => new THREE.CylinderGeometry(0.288, 0.288, 0.035, 20, 1, true)), L.cap, [0, 0.004, 0], [1, 1, 0.98]);
      C(ball(6), L.cap, [0, 0.228, 0], [0.028, 0.017, 0.028]);
      C(geo('schirm', brimGeo), L.brim === undefined ? shade(L.cap, 0.7) : L.brim, [0, 0, 0], [1, 1, 1], true);
    }
  }

  for (const s of [1, -1]) {
    const brow = L.face === 'frown' ? s * 0.3 : 0;
    K(rbox(0.115, L.frau ? 0.018 : 0.03, 0.035, L.frau ? 0.008 : 0.013, 1), L.hair, [s * 0.105, L.frau ? 0.126 : 0.118, 0.232], [0, s * 0.38, brow]);
    if (L.frau) {
      K(geo(`wange${s}`, () => wangeGeo(s)), new THREE.Color(L.skin).lerp(new THREE.Color(0xe0605a), 0.3).getHex(), [0, 0, 0]);
      K(ball(6), 0xe0b050, [s * 0.288, -0.075, 0.01], undefined, 0.022);
    }
  }
  const mund = L.face && MOUTHS[L.face] ? L.face : 'smile';
  geo(`mund${mund}`, MOUTHS[mund]).forEach(([g, color], i) => K(g, L.frau && i === 0 ? 0xb8324a : color, [0, 0, 0], undefined, [1, 1, 1], true));
  if (L.brille) {
    const ring = geo('glas', () => new THREE.TorusGeometry(0.074, 0.009, 4, 16));
    for (const s of [1, -1]) { K(ring, 0x24262c, [s * 0.1, AUGE_Y, 0.272], [0, s * 0.3, 0]); K(rbox(0.012, 0.014, 0.22, 0.004, 1), 0x24262c, [s * 0.215, AUGE_Y + 0.01, 0.15], [0, s * 0.3, 0]); }
    K(rbox(0.07, 0.013, 0.014, 0.004, 1), 0x24262c, [0, AUGE_Y + 0.01, 0.284]);
  }
  if (L.bart) {
    for (const s of [1, -1]) K(ball(), L.hair, [s * 0.05, -0.086, 0.246], [0, s * 0.3, s * -0.3], [0.065, 0.026, 0.028]);
    if (L.bart === 'voll') { K(ball(10), L.hair, [0, -0.215, 0.12], undefined, [0.17, 0.085, 0.12]); for (const s of [1, -1]) K(ball(), L.hair, [s * 0.2, -0.14, 0.09], undefined, [0.06, 0.1, 0.08]); }
  }
}

// Augen als eigenes Netz, damit sie blinzeln können
function augen(L) {
  const B = bau();
  for (const s of [1, -1]) {
    const e = im(mx([0, 0, 0], [0, 0, 0], S), mx([s * 0.1, 0, 0.212]));
    B.add(ball(12), 0xffffff, im(e, mx([0, 0, 0], [0, s * 0.3, 0], [0.056, 0.069, 0.04])));
    B.add(ball(8), 0x191512, im(e, mx([0, 0, 0.037], [0, 0, 0], [0.0313, 0.0367, 0.017])));
    B.add(ball(6), 0xffffff, im(e, mx([0.013, 0.015, 0.053], [0, 0, 0], 0.0115)));
    if (L.frau) for (let i = 0; i < 3; i++) B.add(rbox(0.012, 0.04, 0.012, 0.004, 1), 0x191512, im(e, mx([s * (0.018 + i * 0.022), 0.068 - i * 0.011, 0.036 - i * 0.01], [0, 0, s * -(0.2 + i * 0.35)])));
  }
  return B.fertig();
}

let MAT = null;
const material = () => MAT || (MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0, envMapIntensity: 0.6 }));
const KOERPER = new Map();
const bild = (key, w, h, draw) => geo(`bild${key}`, () => new THREE.MeshStandardMaterial({ map: canvasTex(w, h, draw), transparent: true, alphaTest: 0.3, roughness: 0.85 }));
const SCHLUESSEL = ['shirt', 'cap', 'brim', 'hair', 'skin', 'pants', 'shoe', 'chain', 'frau', 'rock', 'hut', 'brille', 'bart', 'face'];

export function createSpielfigur(look = {}) {
  const L = { shirt: 0xc0332a, cap: 0x8a221c, hair: 0x3a2a1e, skin: 0xe2b08c, pants: 0x2a2f3a, shoe: 0xf2efe6, ...look };
  const key = JSON.stringify(SCHLUESSEL.map((k) => L[k]));
  const fig = createFigure({ material: material(), geometry: (idx) => { if (!KOERPER.has(key)) KOERPER.set(key, koerper(L, idx)); return KOERPER.get(key); } });
  const { head, spine1 } = fig.bones; const seed = Math.random() * 10;
  fig.comic = true;
  // Leuchtrand beim Anschauen (ludwigoutline.js): Abstand vom Körper statt vom Nullpunkt, und nur die Silhouette statt jeder Kugel
  fig.root.userData.anker = spine1; fig.mesh.userData.outlinePush = 0.08;

  const blick = new THREE.Mesh(geo(`augen${!!L.frau}`, () => augen(L)), material());
  blick.name = 'augen'; blick.userData.noOutline = true; blick.position.set(0, CY + AUGE_Y * S - BONE_HEAD[1], CZ - BONE_HEAD[2]);
  blick.onBeforeRender = () => { blick.scale.y = (performance.now() / 1000 + seed) % 3.7 < 0.12 ? 0.1 : 1; };
  head.add(blick);

  if (L.capText && (L.hut || 'cap') === 'cap' && !L.frau) {
    const text = String(L.capText);
    const g = geo('capschild', () => patch((u, v) => { const a = u * 0.58; const yy = 0.1 + v * 0.055; const r = 0.293 * Math.sqrt(Math.max(0, 1 - (yy / 0.232) ** 2)); return [Math.sin(a) * r, yy, Math.cos(a) * r * 0.98]; }));
    const m = new THREE.Mesh(g, bild(`cap${text}`, 512, 160, (c, w, h) => { c.font = '900 128px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#e8b84e'; c.fillText(text, w / 2, h * 0.8); }));
    m.userData.noOutline = true; m.position.set(0, CY + 0.112 * S - BONE_HEAD[1], CZ - 0.005 * S - BONE_HEAD[2]); m.rotation.x = -0.2; m.scale.setScalar(S); head.add(m);
  }
  if (L.print || L.bolt) {
    const [w, h] = L.print ? [0.34, 0.11] : [0.22, 0.23];
    const g = geo(`brust${L.print ? 'schrift' : 'blitz'}`, () => patch((u, v) => { const y = 0.27 + v * h / 2 / 0.91; const r = torsoR(y) + 0.008; const a = u * (w / 2) / 0.23; return [Math.sin(a) * r, rumpfY(y) - 1.2, Math.cos(a) * r * TORSO_Z]; }));
    const mat = L.print
      ? bild(`print${L.print}`, 512, 170, (c, cw, ch) => { c.font = '900 136px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 16; c.strokeStyle = '#d9a54a'; c.strokeText(L.print, cw / 2, ch * 0.8); c.fillStyle = '#141414'; c.fillText(L.print, cw / 2, ch * 0.8); })
      : bild('blitz', 256, 256, drawBolt);
    const schild = new THREE.Mesh(g, mat); schild.userData.noOutline = true; spine1.add(schild);
  }

  // Der große Kopf nickt sanfter (sonst liegt das Gesicht unterm Schirm). Hände, die nach altem Maß in ihm landen würden (trinken, ans Glas klopfen), rutschen davor
  const pose = fig.pose; const mitte = V3(); const hand = { L: V3(), R: V3() }; const schoss = { L: V3(), R: V3() };
  fig.pose = (space, p) => {
    const nick = p.headPitch || 0; const headPitch = nick * (nick < 0 ? 0.4 : 0.65); // minus ist nach unten
    if (!p.hands) { pose(space, { ...p, headPitch }); return; }
    mitte.set(p.x || 0, p.y + CY - 1.0, p.z || 0);
    const hands = {};
    for (const k of ['L', 'R']) {
      const h = p.hands[k]; hands[k] = h; if (!h) continue;
      let ort = h.wrist;
      if (L.rock !== undefined && p.y < 0.75 && ort.y < p.y + 0.14) ort = schoss[k].set(ort.x, p.y + 0.14, ort.z); // im Sitzen liegen die Hände auf dem Rock, nicht darin
      const d = hand[k].subVectors(ort, mitte); const n = Math.sqrt((d.x / 0.28) ** 2 + (d.y / 0.27) ** 2 + (d.z / 0.28) ** 2);
      if (n < 1 && n > 1e-3) hands[k] = { ...h, wrist: d.divideScalar(n).add(mitte) };
      else if (ort !== h.wrist) hands[k] = { ...h, wrist: ort };
    }
    pose(space, { ...p, headPitch, hands });
  };
  return fig;
}

// wie createPerson, nur mit der Figur vom Startbildschirm
export const createSpielPerson = (scene, look, o = {}) => createPerson(scene, look, { ...o, figur: createSpielfigur(look) });
