// Theos Seitenscheidel - Teo's Casino: neue Figur aus Blender (casinofigur.js) einfärben.
// Outfits: 'obdachlos' (zerrissenes Hemd und Hose, Familie), 'anzug' (reiche Gäste: Sakko mit langen Ärmeln, Hemd, Krawatte oder Fliege,
// Lederschuhe, Frisur statt Cap, manchmal goldene Uhr), sonst 'schlicht' (Personal: Hemd, Hose, Cap in den Farben des Looks).
// Die Hülle teilt Positionen, Normalen, Knochen und Indizes; nur die Farben (und bei Gästen ohne Cap die Positionen) sind je Figur eigen.
import * as THREE from './vendor/three.module.min.js';
import FIG from './casinofigur.js';

const b64 = (s, Ctor) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Ctor(u.buffer); };
let D = null;
function data() {
  if (D) return D;
  const pos = b64(FIG.p, Float32Array); const n = pos.length / 3;
  D = { n, pos, nrm: b64(FIG.n, Float32Array), col: b64(FIG.c, Float32Array), reg: b64(FIG.r, Uint8Array), idx: b64(FIG.i, FIG.w === 2 ? Uint16Array : Uint32Array), si: b64(FIG.si, Uint16Array), sw: b64(FIG.sw, Float32Array) };
  D.aPos = new THREE.BufferAttribute(D.pos, 3); D.aNrm = new THREE.BufferAttribute(D.nrm, 3); D.aIdx = new THREE.BufferAttribute(D.idx, 1); D.aSi = new THREE.Uint16BufferAttribute(D.si, 4); D.aSw = new THREE.BufferAttribute(D.sw, 4); D.aUv = new THREE.BufferAttribute(new Float32Array(n * 2), 2);
  // ohne Cap: Schirm verschwindet (Punkte in den Kopf), die Kappe wird zur Frisur
  const p2 = D.pos.slice(); for (let i = 0; i < n; i++) if (D.reg[i] === 4) { p2[i * 3] = 0; p2[i * 3 + 1] = 1.74; p2[i * 3 + 2] = 0.0; } D.aPosNoCap = new THREE.BufferAttribute(p2, 3);
  return D;
}
const C = (hex) => new THREE.Color(hex);
const ROT = { skin: C(0xe2b08c), hair: C(0x3a2a1e), cap: C(0x8a221c), iris: C(0x5a3a1e) }; ROT.ear = ROT.skin.clone().multiplyScalar(0.9);
const near = (a, r, g, b) => Math.abs(a.r - r) < 0.006 && Math.abs(a.g - g) < 0.006 && Math.abs(a.b - b) < 0.006;

export function figureGeometry(look = {}) {
  const d = data(); const n = d.n; const out = new Float32Array(n * 3); const outfit = look.outfit || 'schlicht';
  const skin = C(look.skin ?? 0xe2b08c); const skinD = skin.clone().multiplyScalar(0.9); const hair = C(look.hair ?? 0x3a2a1e); const iris = C(look.iris ?? 0x5a3a1e);
  const cap = C(look.cap ?? 0x7a241e); const brim = C(look.brim ?? 0x241c1a); const shirt = C(look.shirt ?? 0xb8342c); const pants = C(look.pants ?? 0x2a2f3a);
  const jacket = C(look.jacket ?? 0x1e2a44); const lapel = jacket.clone().multiplyScalar(0.7); const hemd = C(look.hemd ?? 0xf2efe8); const tie = C(look.tie ?? 0x8a1a22); const gold = C(0xe0b050);
  const shoe = C(look.shoe ?? 0x24262c); const sole = C(look.sole ?? (outfit === 'anzug' ? 0x2a1a12 : 0xe8e4d8)); const tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const r = d.reg[i]; const x = d.pos[i * 3]; const y = d.pos[i * 3 + 1]; const z = d.pos[i * 3 + 2]; const ax = Math.abs(x);
    let c = tmp.setRGB(d.col[i * 3], d.col[i * 3 + 1], d.col[i * 3 + 2]);
    if (outfit === 'obdachlos' || outfit === 'strom') { // strom: weißes Shirt (Blitz kommt als Aufkleber dazu, stromart.js), Rest wie die Familie
      if (outfit === 'strom' && r === 6) c = shirt; else if (outfit === 'strom' && r !== 2 && r !== 3 && r !== 4 && r !== 5 && y > 1.4 && y < 1.56 && ax < 0.11 && z > -0.02) c = skin; else if (near(c, ROT.skin.r, ROT.skin.g, ROT.skin.b)) c = skin; else if (near(c, ROT.ear.r, ROT.ear.g, ROT.ear.b)) c = skinD; else if (r === 2) c = hair; else if (r === 3) c = cap; else if (r === 5) c = iris;
    } else if (outfit === 'anzug') {
      const front = z > 0.02; const vW = 0.012 + Math.max(0, y - 1.12) * 0.22;
      if (r === 6) {
        if (y > 1.43 && ax < 0.1) c = hemd;
        else if (front && ax < vW) { c = hemd; if (look.tieStyle === 'fliege' ? (y > 1.395 && y < 1.445 && ax < 0.042) : (y > 1.14 && y < 1.43 && ax < 0.017 + (1.43 - y) * 0.02)) c = tie; }
        else if (front && ax < vW + 0.018) c = lapel;
        else if (front && x > 0.085 && x < 0.135 && y > 1.29 && y < 1.33 && look.pochette) c = hemd;
        else c = jacket;
      } else if (r === 1) { c = skin; if (y < 1.51 && y > 1.38 && ax < 0.1) c = hemd; if (ax > 0.387 && ax < 0.79 && y > 1.36) c = jacket; else if (ax >= 0.79 && ax < 0.815 && y > 1.36) c = hemd; if (look.watch && x > 0.755 && x < 0.785 && y > 1.36) c = gold; }
      else if (r === 7) { c = look.trousers !== undefined ? C(look.trousers) : jacket; if (y > 1.035) c = (front && ax < 0.022) ? gold : C(0x141210); }
      else if (r === 8) c = skinD; else if (r === 2 || r === 3) c = hair; else if (r === 5) c = iris; else if (r === 9) c = shoe; else if (r === 10) c = sole;
    } else {
      if (r === 1) c = skin; else if (r === 8) c = skinD; else if (r === 2) c = hair; else if (r === 3) c = cap; else if (r === 4) c = brim; else if (r === 5) c = iris; else if (r === 6) c = shirt; else if (r === 7) c = pants; else if (r === 9) c = shoe; else if (r === 10) c = sole;
    }
    out[i * 3] = c.r; out[i * 3 + 1] = c.g; out[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', outfit === 'anzug' && !look.keepCap ? d.aPosNoCap : d.aPos); g.setAttribute('normal', d.aNrm); g.setAttribute('color', new THREE.BufferAttribute(out, 3)); g.setAttribute('skinIndex', d.aSi); g.setAttribute('skinWeight', d.aSw); g.setAttribute('uv', d.aUv); g.setIndex(d.aIdx);
  g.computeBoundingSphere(); return g;
}
