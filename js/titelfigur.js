// Theos Seitenscheidel - Startbildschirme: die Freunde als Titel-Figuren. Gleiche Farben und Caps wie im Spiel, aber mit großem Kopf und echtem Gesicht,
// damit man aus der Ferne sieht, wer grinst, wer schwitzt und wer sauer ist. Arme und Beine per Zwei-Gelenk-IK.
// Maße in Metern: Blick nach +z, links = +x. Figur steht auf y 0, Hüfte bei 0.8.
import * as THREE from './vendor/three.module.min.js';
import { V3, clamp, std, mesh, rbox, between, bake, canvasTex, lerp, TAU } from './titelkit.js';

const THIGH = 0.365; const SHIN = 0.345; const UPPER = 0.32; const FORE = 0.3;
export const HEAD = { x: 0.27, y: 0.259, z: 0.254 }; // die Formen nutzt auch spielfigur.js (dieselben Figuren im Spiel)
export const TORSO = [[0.16, -0.09], [0.2, -0.03], [0.222, 0.06], [0.23, 0.16], [0.232, 0.27], [0.236, 0.37], [0.225, 0.45], [0.18, 0.52], [0.1, 0.565], [0.001, 0.575]];
export const TORSO_Z = 0.8;

const GEO = new Map();
const geo = (key, make) => { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); };
const seg = (r0, r1) => geo(`seg${r0}|${r1}`, () => new THREE.CylinderGeometry(r1, r0, 1, 16, 1).translate(0, 0.5, 0));
const ball = (r, w = 18) => geo(`ball${r}|${w}`, () => new THREE.SphereGeometry(r, w, Math.ceil(w * 0.7)));
const MAT = new Map();
const mat = (color, o = {}) => {
  const key = `${color}|${JSON.stringify(o)}`;
  if (!MAT.has(key)) MAT.set(key, std({ color, roughness: 0.72, envMapIntensity: 0.6, ...o }));
  return MAT.get(key);
};
const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();

// flache Form (x, y) auf die Vorderseite des Kopfes legen
function onFace(g, lift, dx = 0, dy = 0) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + dx; const y = p.getY(i) + dy; p.setXYZ(i, x, y, HEAD.z * Math.sqrt(Math.max(0, 1 - (x / HEAD.x) ** 2 - (y / HEAD.y) ** 2)) + lift); }
  g.computeVertexNormals(); return g;
}
export const MOUTHS = {
  grin: () => [
    [onFace(new THREE.RingGeometry(0.001, 0.112, 22, 5, Math.PI, Math.PI), 0.009, 0, -0.092), 0x4a1512],
    [onFace(new THREE.PlaneGeometry(0.186, 0.03, 12, 1), 0.014, 0, -0.109), 0xfffdf4],
    [onFace(new THREE.RingGeometry(0.001, 0.045, 14, 3, Math.PI, Math.PI), 0.014, 0, -0.148), 0xe5645a],
  ],
  smile: () => [[onFace(new THREE.RingGeometry(0.07, 0.089, 20, 1, Math.PI + 0.45, Math.PI - 0.9), 0.009, 0, -0.06), 0x5a2018]],
  frown: () => [[onFace(new THREE.RingGeometry(0.06, 0.078, 18, 1, 0.45, Math.PI - 0.9), 0.009, 0, -0.205), 0x5a2018]],
  o: () => [[onFace(new THREE.RingGeometry(0.001, 0.04, 18, 3), 0.009, 0, -0.14), 0x4a1512]],
  flat: () => [[onFace(new THREE.PlaneGeometry(0.115, 0.017, 10, 1), 0.009, 0, -0.14), 0x5a2018]],
  grit: () => [ // zusammengebissene Zähne
    [onFace(new THREE.PlaneGeometry(0.17, 0.072, 10, 3), 0.009, 0, -0.137), 0x4a1512],
    [onFace(new THREE.PlaneGeometry(0.154, 0.056, 10, 3), 0.012, 0, -0.137), 0xfffdf4],
    [onFace(new THREE.PlaneGeometry(0.156, 0.007, 10, 1), 0.015, 0, -0.137), 0xa0705a],
    ...[-0.039, 0, 0.039].map((x) => [onFace(new THREE.PlaneGeometry(0.006, 0.056, 1, 3), 0.015, x, -0.137), 0xa0705a]),
  ],
};

export function brimGeo() {
  const nu = 18; const nv = 4; const pos = []; const uv = []; const idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu * 2 - 1; const v = j / nv; const a = u * 1.12; const r = 0.272 + v * 0.19 * Math.pow(Math.max(0, Math.cos(u * 1.35)), 0.55);
    pos.push(Math.sin(a) * r, 0.012 + v * 0.004 - u * u * 0.05 * v, Math.cos(a) * r); uv.push(i / nu, v);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i; idx.push(a, a + nu + 1, a + 1, a + 1, a + nu + 1, a + nu + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
// Schrift oder Zeichen auf gewölbter Fläche: at(u, v) liefert den Punkt
export function patch(at, nu = 14, nv = 6) {
  const g = new THREE.PlaneGeometry(1, 1, nu, nv); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const q = at(p.getX(i) * 2, p.getY(i) * 2); p.setXYZ(i, q[0], q[1], q[2]); }
  g.computeVertexNormals(); return g;
}
export const torsoR = (y) => { for (let i = 0; i < TORSO.length - 1; i++) { const [r0, y0] = TORSO[i]; const [r1, y1] = TORSO[i + 1]; if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0)); } return 0.1; };

export function drawBolt(c, w, h) {
  c.beginPath();
  [[0.58, 0.02], [0.26, 0.56], [0.47, 0.56], [0.38, 0.98], [0.76, 0.4], [0.53, 0.4], [0.66, 0.02]].forEach(([x, y], i) => (i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h)));
  c.closePath(); c.fillStyle = '#ffd21a'; c.fill(); c.lineWidth = w * 0.035; c.lineJoin = 'round'; c.strokeStyle = '#1b2430'; c.stroke();
}

const _a = V3(); const _b = V3(); const _mid = V3(); const _x = V3(); const _y = V3(); const _z = V3(); const _m = new THREE.Matrix4();
// Gelenk zwischen a und t in Richtung pole; gibt das erreichbare Ende zurück
function solve(a, t, pole, l1, l2, joint, end) {
  _a.subVectors(t, a); let d = _a.length(); _a.divideScalar(d || 1); d = clamp(d, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.0005);
  const k = (d * d + l1 * l1 - l2 * l2) / (2 * d); const h = Math.sqrt(Math.max(0, l1 * l1 - k * k));
  _b.copy(pole).addScaledVector(_a, -pole.dot(_a)); if (_b.lengthSq() < 1e-6) _b.set(0, -1, 0); _b.normalize();
  joint.copy(a).addScaledVector(_a, k).addScaledVector(_b, h); end.copy(a).addScaledVector(_a, d);
}

// look: { shirt, cap, brim, hair, skin, pants, shoe, bolt, print, capText, chain }
export function createBuddy(parent, look = {}) {
  const L = { shirt: 0xc0332a, cap: 0x8a221c, hair: 0x3a2a1e, skin: 0xe2b08c, pants: 0x2a2f3a, shoe: 0xf2efe6, ...look };
  const root = new THREE.Group(); parent.add(root);
  const body = new THREE.Group(); root.add(body);
  const skin = mat(L.skin, { roughness: 0.62 }); const shirt = mat(L.shirt, { roughness: 0.85 }); const pants = mat(L.pants, { roughness: 0.85 }); const hairM = mat(L.hair, { roughness: 0.95 });

  // Rumpf
  const trunk = new THREE.Group(); body.add(trunk);
  mesh(geo('torso', () => new THREE.LatheGeometry(TORSO.map(([r, y]) => new THREE.Vector2(r, y)), 28)), shirt, trunk, [0, 0, 0], null, [1, 1, TORSO_Z]);
  mesh(geo('becken', () => new THREE.LatheGeometry([[0.001, -0.16], [0.12, -0.15], [0.192, -0.09], [0.206, -0.02]].map(([r, y]) => new THREE.Vector2(r, y)), 24)), pants, trunk, [0, 0, 0], null, [1, 1, 0.85]);
  mesh(seg(0.085, 0.08), skin, trunk, [0, 0.53, 0], null, [1, 0.17, 1]);
  mesh(geo('kragen', () => new THREE.TorusGeometry(0.1, 0.022, 8, 24).rotateX(Math.PI / 2)), mat(shade(L.shirt, 0.72)), trunk, [0, 0.545, 0.005], null, [1, 1, 0.9]);
  bake(trunk);
  if (L.print || L.bolt) {
    const t = L.print
      ? canvasTex(512, 170, (c, w, h) => { c.font = '900 136px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.lineJoin = 'round'; c.lineWidth = 16; c.strokeStyle = '#d9a54a'; c.strokeText(L.print, w / 2, h * 0.8); c.fillStyle = '#141414'; c.fillText(L.print, w / 2, h * 0.8); })
      : canvasTex(256, 256, drawBolt);
    const [w, h, y] = L.print ? [0.34, 0.12, 0.27] : [0.22, 0.25, 0.27];
    const g = patch((u, v) => { const yy = y + v * h / 2; const r = torsoR(yy) + 0.006; const a = u * (w / 2) / 0.23; return [Math.sin(a) * r, yy, Math.cos(a) * r * TORSO_Z]; });
    mesh(g, std({ map: t, transparent: true, alphaTest: 0.3, roughness: 0.85 }), body).castShadow = false;
  }
  if (L.chain) {
    const pts = []; for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU; const f = Math.max(0, Math.cos(a)); pts.push(V3(Math.sin(a) * 0.15, 0.53 - f * 0.12, Math.cos(a) * (0.12 + f * 0.07))); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 50, 0.017, 6, true), mat(0xe0b050, { metalness: 0.9, roughness: 0.22 }), body);
  }

  // Kopf
  const neck = new THREE.Group(); neck.position.set(0, 0.6, 0); body.add(neck);
  const head = new THREE.Group(); head.position.set(0, 0.27, 0.01); neck.add(head);
  const skull = new THREE.Group(); head.add(skull);
  mesh(ball(1, 32), skin, skull, [0, 0, 0], null, [HEAD.x, HEAD.y, HEAD.z]);
  for (const s of [1, -1]) mesh(ball(0.062), skin, skull, [s * 0.265, -0.015, 0], null, [0.55, 1, 0.8]);
  mesh(ball(0.043), mat(shade(L.skin, 0.88), { roughness: 0.62 }), skull, [0, -0.04, 0.262], null, [1, 0.85, 0.9]);
  mesh(geo('haare', () => new THREE.SphereGeometry(0.279, 28, 14, 0, TAU, 0, Math.PI * 0.56)), hairM, skull, [0, 0.005, -0.012], [-0.62, 0, 0], [1, 0.98, 0.97]);
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.36; mesh(ball(0.06), hairM, skull, [Math.sin(a) * 0.205, 0.163 - Math.abs(i - 2) * 0.006, Math.cos(a) * 0.178], [0, a, (i - 2) * 0.25], [1.2, 0.55, 0.6]); }
  const capG = new THREE.Group(); capG.position.set(0, 0.112, -0.005); capG.rotation.x = -0.2; if (L.capBack) capG.rotation.y = Math.PI; skull.add(capG);
  const capM = mat(L.cap, { roughness: 0.88 });
  mesh(geo('cap', () => new THREE.SphereGeometry(0.287, 30, 12, 0, TAU, 0, Math.PI / 2)), capM, capG, [0, 0, 0], null, [1, 0.8, 0.98]);
  mesh(geo('capband', () => new THREE.CylinderGeometry(0.288, 0.288, 0.035, 30, 1, true)), capM, capG, [0, 0.004, 0], null, [1, 1, 0.98]);
  mesh(ball(0.028), capM, capG, [0, 0.228, 0], null, [1, 0.6, 1]);
  mesh(geo('schirm', brimGeo), mat(L.brim === undefined ? shade(L.cap, 0.7) : L.brim, { side: THREE.DoubleSide, roughness: 0.88 }), capG);
  bake(skull);
  if (L.capText) {
    const t = canvasTex(512, 160, (c, w, h) => { c.font = '900 128px Bahnschrift, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#e8b84e'; c.fillText(L.capText, w / 2, h * 0.8); });
    const g = patch((u, v) => { const a = u * 0.58; const yy = 0.1 + v * 0.055; const r = 0.293 * Math.sqrt(Math.max(0, 1 - (yy / 0.232) ** 2)); return [Math.sin(a) * r, yy, Math.cos(a) * r * 0.98]; });
    const tag = mesh(g, std({ map: t, transparent: true, alphaTest: 0.3 }), head, [0, 0.112, -0.005], [-0.2, 0, 0]); tag.castShadow = false;
  }

  // Gesicht
  const eyeW = mat(0xffffff, { roughness: 0.25 }); const pupilM = mat(0x191512, { roughness: 0.2 }); const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyes = []; const pupils = []; const brows = [];
  for (const s of [1, -1]) {
    const e = new THREE.Group(); e.position.set(s * 0.1, 0.022, 0.212); head.add(e); eyes.push(e);
    mesh(ball(0.064), eyeW, e, [0, 0, 0], [0, s * 0.3, 0], [0.88, 1.08, 0.62]).castShadow = false;
    const p = new THREE.Group(); p.position.set(0, 0, 0.037); e.add(p); pupils.push(p);
    mesh(ball(0.034), pupilM, p, [0, 0, 0], null, [0.92, 1.08, 0.5]).castShadow = false;
    mesh(ball(0.0115), shine, p, [0.013, 0.015, 0.016]).castShadow = false;
    const b = mesh(rbox(0.115, 0.03, 0.035, 0.013, 2), hairM, head, [s * 0.105, 0.118, 0.232], [0, s * 0.38, 0]); b.castShadow = false; brows.push(b);
  }
  const mouths = {};
  for (const name of Object.keys(MOUTHS)) {
    const g = new THREE.Group(); g.visible = name === 'smile'; head.add(g); mouths[name] = g;
    for (const [mg, col] of geo(`mund${name}`, MOUTHS[name])) mesh(mg, mat(col, { roughness: 0.6, side: THREE.DoubleSide }), g).castShadow = false;
  }

  // Arme und Beine
  const hands = {}; const limbs = {};
  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const A = { s, sh: V3(), el: V3(), wr: V3(), hip: V3(), kn: V3(), an: V3() }; limbs[k] = A;
    A.shBall = mesh(ball(0.096), shirt, root); A.sleeve = mesh(seg(0.094, 0.086), shirt, root); A.upper = mesh(seg(0.064, 0.056), skin, root);
    A.elBall = mesh(ball(0.056), skin, root); A.fore = mesh(seg(0.058, 0.047), skin, root);
    A.thigh = mesh(seg(0.112, 0.087), pants, root); A.knBall = mesh(ball(0.087), pants, root); A.shin = mesh(seg(0.086, 0.076), pants, root); A.hipBall = mesh(ball(0.11), pants, root);

    const h = new THREE.Group(); root.add(h); hands[k] = h;
    const hg = new THREE.Group(); h.add(hg);
    mesh(ball(0.07), skin, hg, [0, 0, 0.035], null, [0.88, 0.62, 1.05]);
    for (let i = 0; i < 4; i++) mesh(ball(0.027, 12), skin, hg, [(i - 1.5) * 0.031, -0.028, 0.092], [0.7, 0, 0], [0.75, 1.5, 0.9]);
    mesh(ball(0.027, 12), skin, hg, [-s * 0.052, -0.03, 0.04], [0, 0, s * 0.5], [0.8, 1.2, 1.3]);
    bake(hg);

    const f = new THREE.Group(); root.add(f); A.foot = f;
    mesh(rbox(0.17, 0.12, 0.3, 0.055, 3), mat(L.shoe, { roughness: 0.6 }), f, [0, -0.025, 0.06]);
    mesh(rbox(0.176, 0.04, 0.305, 0.018, 2), mat(0x30343b), f, [0, -0.072, 0.06]);
    mesh(rbox(0.178, 0.03, 0.09, 0.012, 2), mat(L.shirt), f, [0, -0.02, 0.04]);
    bake(f);
  }

  const blank = () => ({
    hip: V3(), lean: 0, twist: 0, roll: 0, head: V3(), // head: Pitch (+ runter), Yaw, Roll
    hand: { L: V3(), R: V3() }, pole: { L: V3(), R: V3() }, axis: { L: V3(), R: V3() },
    foot: { L: V3(), R: V3() }, knee: { L: V3(), R: V3() }, toe: { L: 0, R: 0 },
  });
  const p = blank();
  const F = { root, body, head, hands, p, seed: Math.random() * 10, mood: { mouth: 'smile', brow: 0, up: 0, squint: 1 } };

  F.place = (x, y, z, yaw = 0) => { root.position.set(x, y, z); root.rotation.y = yaw; return F; };
  // Grundhaltung: stehen, Arme hängen
  F.rest = () => {
    p.hip.set(0, 0.8, 0); p.lean = 0; p.twist = 0; p.roll = 0; p.head.set(0, 0, 0);
    for (const [k, s] of [['L', 1], ['R', -1]]) {
      p.hand[k].set(s * 0.36, 0.74, 0.08); p.pole[k].set(s * 0.8, -0.2, -0.5); p.axis[k].set(1, 0, 0);
      p.foot[k].set(s * 0.14, 0.092, 0); p.knee[k].set(s * 0.15, 0.1, 1); p.toe[k] = 0;
    }
    return p;
  };
  // mouth: grin, smile, frown, o, flat, grit; brow > 0 wütend, < 0 besorgt; up > 0 Brauen hoch
  F.face = (mouth, brow = 0, up = 0, squint = 1) => {
    if (F.mood.mouth !== mouth) { mouths[F.mood.mouth].visible = false; mouths[mouth].visible = true; }
    F.mood = { mouth, brow, up, squint };
  };
  F.look = (x, y) => { for (const q of pupils) { q.position.x = clamp(x, -1, 1) * 0.02; q.position.y = clamp(y, -1, 1) * 0.02; } };

  F.apply = (t = 0) => {
    const breath = Math.sin(t * 1.9 + F.seed) * 0.006;
    body.position.copy(p.hip); body.position.y += breath; body.rotation.set(p.lean, p.twist, p.roll, 'YXZ');
    neck.rotation.set(p.head.x, p.head.y, p.head.z, 'YXZ'); body.updateMatrix();
    for (const k of ['L', 'R']) {
      const A = limbs[k]; const s = A.s;
      A.sh.set(s * 0.232, 0.455, 0).applyMatrix4(body.matrix);
      solve(A.sh, p.hand[k], p.pole[k], UPPER, FORE, A.el, A.wr);
      A.shBall.position.copy(A.sh); between(A.sleeve, A.sh, _mid.copy(A.sh).lerp(A.el, 0.56)); between(A.upper, A.sh, A.el); A.elBall.position.copy(A.el); between(A.fore, A.el, A.wr);
      _z.subVectors(A.wr, A.el).normalize(); _x.copy(p.axis[k]).addScaledVector(_z, -p.axis[k].dot(_z));
      if (_x.lengthSq() < 1e-4) _x.set(0, 0, 1).addScaledVector(_z, -_z.z);
      _x.normalize(); _y.crossVectors(_z, _x);
      hands[k].position.copy(A.wr); hands[k].quaternion.setFromRotationMatrix(_m.makeBasis(_x, _y, _z));

      A.hip.set(s * 0.11, -0.05, 0).applyMatrix4(body.matrix);
      solve(A.hip, p.foot[k], p.knee[k], THIGH, SHIN, A.kn, A.an);
      A.hipBall.position.copy(A.hip); between(A.thigh, A.hip, A.kn); A.knBall.position.copy(A.kn); between(A.shin, A.kn, A.an);
      A.foot.position.copy(A.an); A.foot.rotation.set(p.toe[k], s * 0.12, 0);
    }
    const M = F.mood; const blink = (t + F.seed) % 3.7 < 0.12 ? 0.1 : 1;
    eyes.forEach((e, i) => {
      const s = i ? -1 : 1; e.scale.y = blink * M.squint;
      brows[i].rotation.z = s * M.brow; brows[i].position.y = 0.118 + M.up * 0.035 - Math.abs(M.brow) * 0.012;
    });
  };
  // Punkt am Kopf in Weltkoordinaten (Mund)
  F.mouthWorld = (out) => head.localToWorld(out.set(0, -0.135, 0.3));

  F.rest(); F.apply(0);
  return F;
}
