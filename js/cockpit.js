// Theos Seitenscheidel - Fahrerkabine: Armaturenbrett, Lenkrad mit Händen, Tacho, Radio, Spiegel, Scheibenwischer mit Schlamm.
// Koordinaten im Auto: x nach links, y nach oben, z nach vorn. Fahrer sitzt links (x = +0.36).
import * as THREE from './vendor/three.module.min.js';
import { buildWorkshop } from './workshop.js';
import { spriteBlend } from './raceinterior.js';

export const EYE_N = new THREE.Vector3(-0.36, 1.25, -0.45); // Augenhöhe des Navigators (Beifahrersitz)
export const EYE = new THREE.Vector3(0.36, 1.25, -0.45); // Augenhöhe: über dem Instrumententräger, freier Blick auf die Straße
export const LAYER_COCKPIT = 1; // Spiegelkameras sehen den Innenraum nicht

export const lam = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, emissive: new THREE.Color(color).multiplyScalar(0.42), ...extra }); // Innenraum bekommt Streulicht
export function box(w, h, d, color, x, y, z, parent, extra) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lam(color, extra)); m.position.set(x, y, z); m.layers.set(LAYER_COCKPIT); parent.add(m); return m; }
// Quader zwischen zwei Punkten (für Streben, Arme)
const _q = new THREE.Quaternion(); const _d = new THREE.Vector3(); const _m = new THREE.Matrix4(); const _up = new THREE.Vector3(0, 1, 0);
function stretch(mesh, a, b, t, t2 = t) {
  _d.subVectors(b, a); const len = _d.length() || 1e-4; mesh.position.copy(a).addScaledVector(_d, 0.5);
  _m.lookAt(b, a, _up); mesh.quaternion.setFromRotationMatrix(_m); mesh.scale.set(t, t2, len);
}
const unitBox = new THREE.BoxGeometry(1, 1, 1);
function strut(color, parent) { const m = new THREE.Mesh(unitBox, lam(color)); m.layers.set(LAYER_COCKPIT); parent.add(m); return m; }

export function canvasTex(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  return { cv, ctx: cv.getContext('2d'), tex };
}

// Geometrie der Frontscheibe: Basislinie und Neigung (Ebene liegt in x-Richtung und Richtung `UPD`)
const WS = { baseZ: 1.14, baseY: 0.86, halfW: 0.76, height: 0.74, top: new THREE.Vector3(0, 1.72, 0.2) };
const UPD = new THREE.Vector3(0, WS.top.y - WS.baseY, WS.top.z - WS.baseZ).normalize(); // "aufwärts" in der Scheibe
WS.height = Math.hypot(WS.top.y - WS.baseY, WS.top.z - WS.baseZ);

// Radio-Tasten (zum Anklicken): siehe pick()
export function buildCockpit(opts = {}) {
  const root = new THREE.Group(); root.name = 'cockpit';
  const RED = 0xbf2e1f; const DASH = 0x8c8a84; const DARK = 0x2b2a2c; const SKIN = 0xe3ae85;

  // --- Hilfen für runde Körperteile (Gliedmaßen laufen von a nach b, am Ende b dünner) ---
  const limbGeo = new THREE.CylinderGeometry(0.38, 0.5, 1, 18).rotateX(Math.PI / 2);
  const cylGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 14).rotateX(Math.PI / 2);
  const ballGeo = new THREE.SphereGeometry(0.5, 20, 14);
  const limb = (color, parent) => { const m = new THREE.Mesh(limbGeo, lam(color)); m.layers.set(LAYER_COCKPIT); parent.add(m); return m; };
  const ball = (d, color, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(ballGeo, lam(color)); m.scale.setScalar(d); m.position.set(x, y, z); m.layers.set(LAYER_COCKPIT); parent.add(m); return m; };
  const seg = (parent, a, b, t, color, geo = cylGeo) => { const m = new THREE.Mesh(geo, lam(color)); m.layers.set(LAYER_COCKPIT); parent.add(m); stretch(m, a, b, t, t); return m; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // --- Karosserie ---
  box(1.8, 0.1, 2.4, 0x1f1e20, 0, 0.35, 0.0, root); // Boden
  for (const x of [0.36, -0.36]) box(0.42, 0.012, 0.62, 0x2a2a2e, x, 0.406, 0.14, root); // Fußmatten
  const hoodBox = box(1.7, 0.1, 2.3, RED, 0, 0.77, 2.3, root); hoodBox.rotation.x = 0.08; // Motorhaube (fällt nach vorn ab -> mehr Straße im Bild)
  box(1.75, 0.07, 0.1, 0xa82719, 0, 0.665, 3.45, root); // Haubenkante
  box(1.75, 0.26, 0.58, DASH, 0, 0.7, 0.66, root); // Armaturenbrett
  box(1.75, 0.04, 0.5, 0x6d6b66, 0, 0.84, 0.7, root); // Oberseite
  box(1.8, 0.14, 0.2, RED, 0, 0.82, 1.04, root); // Windlauf
  box(1.8, 0.07, 1.95, 0x4a4a52, 0, 1.78, -0.7, root); // Dachhimmel
  box(1.8, 0.07, 0.1, RED, 0, 1.745, 0.24, root); // Dachkante vorn
  for (const s of [1, -1]) box(0.08, 0.07, 1.95, RED, 0.86 * s, 1.745, -0.7, root); // Dachrahmen seitlich
  const frameL = strut(RED, root); const frameR = strut(RED, root);
  stretch(frameL, new THREE.Vector3(0.82, 0.84, 1.16), new THREE.Vector3(0.78, 1.74, 0.22), 0.075, 0.06); // A-Säulen
  stretch(frameR, new THREE.Vector3(-0.82, 0.84, 1.16), new THREE.Vector3(-0.78, 1.74, 0.22), 0.075, 0.06);
  box(0.09, 0.95, 0.1, RED, 0.86, 1.28, -0.55, root); box(0.09, 0.95, 0.1, RED, -0.86, 1.28, -0.55, root); // B-Säulen
  // Heck: Rückfenster offen (man sieht beim Umdrehen die Straße), Rückbank, Überrollbügel
  box(1.8, 0.09, 0.1, RED, 0, 1.72, -1.18, root);
  for (const s of [1, -1]) box(0.1, 0.8, 0.1, RED, 0.85 * s, 1.3, -1.18, root);
  for (const s of [1, -1]) { // Überrollbügel hinter den Sitzen
    seg(root, V(0.74 * s, 0.42, -0.8), V(0.72 * s, 1.7, -0.78), 0.05, 0x1b1b1d);
    seg(root, V(0.72 * s, 1.7, -0.78), V(0.0, 1.72, -0.78), 0.045, 0x1b1b1d);
  }
  // Türen mit Türverkleidung
  for (const s of [1, -1]) {
    box(0.07, 0.38, 1.7, RED, 0.91 * s, 0.68, 0.1, root);
    box(0.06, 0.34, 1.62, 0x77746d, 0.84 * s, 0.7, 0.1, root);
    box(0.05, 0.14, 0.5, 0x2b2a2d, 0.8 * s, 0.6, 0.32, root); // Türtasche
    box(0.045, 0.1, 0.22, 0x1d1d1f, 0.8 * s, 0.64, -0.3, root); // Lautsprecher
    box(0.07, 0.04, 0.36, 0x3a3a3c, 0.8 * s, 0.84, -0.1, root); // Armlehne
    box(0.05, 0.05, 0.22, 0xd2412a, 0.78 * s, 0.77, 0.32, root); // Türgriff
    box(0.04, 0.03, 0.05, 0xd2412a, 0.8 * s, 0.82, 0.55, root); // Verriegelungsknopf
  }
  // Sitze mit Kopfstützen
  for (const x of [0.36, -0.36]) {
    box(0.5, 0.65, 0.12, 0x2c2e38, x, 0.78, -0.62, root); box(0.5, 0.12, 0.55, 0x2c2e38, x, 0.5, -0.35, root);
    box(0.17, 0.16, 0.07, 0x353744, x, 1.17, -0.72, root); // Kopfstütze
    box(0.06, 0.5, 0.14, 0x3a3d4c, x + 0.27, 0.78, -0.58, root); box(0.06, 0.5, 0.14, 0x3a3d4c, x - 0.27, 0.78, -0.58, root); // Seitenwangen
  }
  // Armaturenbrett-Details: Lüftungsgitter, Handschuhfach, Nähte
  for (let i = 0; i < 4; i++) box(0.2, 0.012, 0.012, 0x1e1e20, -0.18, 0.775 + i * 0.022, 0.372, root);
  for (let i = 0; i < 3; i++) box(0.16, 0.012, 0.012, 0x1e1e20, -0.62, 0.8 + i * 0.022, 0.372, root);
  box(0.42, 0.17, 0.012, 0x6f6d68, -0.52, 0.66, 0.373, root); box(0.1, 0.02, 0.016, 0x2a2a2c, -0.52, 0.74, 0.368, root);
  box(0.4, 0.015, 0.014, 0x555450, 0.0, 0.84, 0.372, root);
  // Mitteltunnel mit Schalthebel (rechts neben dem Fahrer, unten) und Becherhalter
  box(0.3, 0.2, 1.4, 0x38373a, 0, 0.5, 0.15, root);
  box(0.12, 0.015, 0.12, 0x1d1d1f, 0.0, 0.605, 0.12, root); // Schaltsack
  const shiftPivot = new THREE.Group(); shiftPivot.position.set(0.0, 0.61, 0.12); root.add(shiftPivot);
  seg(shiftPivot, V(0, 0, 0), V(0, 0.2, 0), 0.022, 0x9a9a9e);
  const shiftKnob = ball(0.064, 0x151515, shiftPivot, 0, 0.23, 0); shiftKnob.scale.set(0.062, 0.075, 0.062);
  box(0.05, 0.006, 0.05, 0xd2412a, 0, 0.268, 0, shiftPivot); // roter Deckel
  const SHIFT_GRIP = V(0, 0.22, 0);
  box(0.08, 0.02, 0.08, 0x252527, 0.0, 0.605, -0.12, root);
  // Handbremse: Rallye-Hebel auf dem Armaturenbrett neben dem Kombiinstrument, mitten im Sichtfeld. Die rechte Hand greift ihn und zieht (siehe update()).
  const hbPivot = new THREE.Group(); hbPivot.position.set(0.045, 0.84, 0.43); root.add(hbPivot);
  box(0.09, 0.03, 0.12, 0x1a1a1c, 0.045, 0.85, 0.43, root); // Sockel
  box(0.026, 0.2, 0.026, 0x8d8b86, 0, 0.1, 0, hbPivot);
  box(0.04, 0.085, 0.05, 0x1a1a1c, 0, 0.2, 0, hbPivot);
  box(0.044, 0.014, 0.054, 0xd2412a, 0, 0.255, 0, hbPivot); // roter Knopf oben
  const HB_GRIP = new THREE.Vector3(0, 0.2, 0); // Griffpunkt im Hebelsystem

  // --- Instrumententräger: flaches Kombiinstrument hinter dem Lenkrad (rpm links, Tacho rechts), orangene Leuchtleiste darüber ---
  const PODZ = 0.57;
  box(0.6, 0.21, 0.2, 0x2a2a2c, 0.39, 0.965, PODZ, root);
  box(0.62, 0.02, 0.2, 0x34322f, 0.39, 1.075, PODZ, root); // schmale Oberkante bündig mit den Anzeigen
  box(0.17, 0.016, 0.01, 0xe8821e, 0.4, 1.052, PODZ - 0.103, root, { emissiveIntensity: 1 }).material.emissive.set(0xe8821e); // orangene Warnleiste
  box(0.012, 0.11, 0.01, 0x14171a, 0.655 - 0.0, 0.975, PODZ - 0.103, root); // Balkenanzeige rechts
  const speedo = canvasTex(512, 512); const aux = canvasTex(512, 512);
  const gauge = (tex, size, x) => {
    const g = new THREE.Group(); g.position.set(x, 0.965, PODZ - 0.1 - 0.024); g.rotation.set(0.1, Math.PI, 0); root.add(g); // Normale zeigt zum Fahrer (nach hinten und leicht nach oben)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex.tex })); g.add(face);
    const rim = new THREE.Mesh(new THREE.RingGeometry(size * 0.485, size * 0.53, 32), new THREE.MeshBasicMaterial({ color: 0x8a8a90 })); rim.position.z = 0.002; g.add(rim);
    return g;
  };
  gauge(aux, 0.16, 0.51); gauge(speedo, 0.2, 0.29);

  // --- Lenkrad: dicker Kranz mit Griffwulst, kräftiger Nabe mit drei Speichen, oben orange Markierung ---
  const wheelPivot = new THREE.Group(); wheelPivot.position.set(0.36, 0.8, 0.12); wheelPivot.rotation.order = 'YXZ'; wheelPivot.rotation.set(-0.42, Math.PI, 0); root.add(wheelPivot);
  const spin = new THREE.Group(); wheelPivot.add(spin);
  const rimMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1c, emissive: 0x0e0e10 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.0285, 18, 96), rimMat); ring.layers.set(LAYER_COCKPIT); spin.add(ring);
  const hubM = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.078, 0.07, 40), lam(0x242427)); hubM.rotation.x = Math.PI / 2; hubM.position.z = 0.0; hubM.layers.set(LAYER_COCKPIT); spin.add(hubM);
  const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.05, 0.02, 40), lam(0x3b3b40)); hubCap.rotation.x = Math.PI / 2; hubCap.position.z = 0.04; hubCap.layers.set(LAYER_COCKPIT); spin.add(hubCap);
  for (const a of [Math.PI, 0, -Math.PI / 2]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.046, 0.026), lam(0x1d1d1f)); sp.position.set(Math.cos(a) * 0.125, Math.sin(a) * 0.125, 0); sp.rotation.z = a; sp.layers.set(LAYER_COCKPIT); spin.add(sp); }
  { const mk = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.03, 0.01), lam(0xe8821e)); mk.position.set(0, 0.19, 0.028); mk.layers.set(LAYER_COCKPIT); mk.material.emissive.set(0xe8821e); spin.add(mk); }
  // Griffpunkte am Kranz: Die Hände der Figur liegen hier und drehen mit
  const handAnchors = [0.9, 0.1].map((f) => { const a = Math.PI * f; const o = new THREE.Object3D(); o.position.set(Math.cos(a) * 0.19, Math.sin(a) * 0.19, 0); o.rotation.z = a; spin.add(o); return o; });
  const WRIST = new THREE.Vector3(0.05, 0, 0.085); // Handgelenk im Griffsystem (x radial nach außen, y Tangente, z zum Fahrer)
  // Pedale (Kupplung links, Bremse Mitte, Gas rechts); Drehpunkt unter dem Armaturenbrett
  const PED = { y: 0.6, z: 0.36 }; const pedalX = { clutch: 0.5, brake: 0.38, gas: 0.26 };
  const mkPedal = (x, w, color) => { const p = new THREE.Group(); p.position.set(x, PED.y, PED.z); root.add(p); box(0.024, 0.14, 0.016, 0x58585c, 0, -0.07, 0, p); const pad = box(w, 0.11, 0.014, color, 0, -0.135, -0.004, p); for (let i = 0; i < 3; i++) box(w * 0.9, 0.008, 0.008, 0x0c0c0d, 0, -0.105 - i * 0.03, -0.012, p); return p; };
  const pedals = { clutch: mkPedal(pedalX.clutch, 0.075, 0x1c1c1e), brake: mkPedal(pedalX.brake, 0.075, 0x1c1c1e), gas: mkPedal(pedalX.gas, 0.052, 0x1c1c1e) };

  // --- Radio ---
  const radioFace = canvasTex(512, 168);
  const radio = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.131), new THREE.MeshBasicMaterial({ map: radioFace.tex }));
  radio.position.set(-0.17, 0.775, 0.348); radio.rotation.y = Math.PI; radio.layers.set(LAYER_COCKPIT); root.add(radio);
  box(0.44, 0.17, 0.02, 0x232325, -0.17, 0.775, 0.362, root);
  const mkKnob = (x, name) => { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 28), lam(0xb8b6ae)); k.rotation.x = Math.PI / 2; k.position.set(x, 0.775, 0.322); k.name = name; k.layers.set(LAYER_COCKPIT); const mark = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.026, 0.006), lam(0x111111)); mark.position.set(0, 0.0, -0.016); k.add(mark); root.add(k); return k; };
  const knobPower = mkKnob(-0.34, 'radio_power'); const knobVol = mkKnob(0.0, 'radio_vol');
  const mkBtn = (x, name, color) => { const b = box(0.05, 0.026, 0.02, color, x, 0.713, 0.328, root); b.name = name; return b; };
  const btnPrev = mkBtn(-0.23, 'radio_prev', 0x6d6c66); const btnNext = mkBtn(-0.11, 'radio_next', 0x6d6c66);
  const pickables = [knobPower, knobVol, btnPrev, btnNext];

  // --- Routen-Tablet (Vorbereitung Navigator): Karte mit Strecke und eigener Position ---
  const tab = new THREE.Group(); tab.position.set(-0.47, 0.66, 0.1); tab.rotation.set(-0.3, Math.PI + 0.45, 0); root.add(tab);
  const tabFrame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.025), lam(0xe8821e)); tabFrame.layers.set(LAYER_COCKPIT); tab.add(tabFrame);
  const map = canvasTex(420, 620);
  const tabScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.172, 0.254), new THREE.MeshBasicMaterial({ map: map.tex })); tabScreen.position.z = 0.0135; tabScreen.layers.set(LAYER_COCKPIT); tab.add(tabScreen);
  tabScreen.rotation.y = 0; // Normale zeigt nach +z des Tablets = zum Fahrer (Gruppe ist um PI gedreht)

  // ================= Navigator (Beifahrer rechts): hält das Tablet, kurbelt die Scheibe frei =================
  const NAV_X = -0.36; const NAV_EYE = new THREE.Vector3(NAV_X, 1.25, -0.45);
  // Kurbel an der Tür: Achse zeigt in den Innenraum, Arm mit Griff dreht sich
  const CRANK_AX = V(NAV_X - 0.42, 0.9, 0.18); box(0.03, 0.09, 0.09, 0x1a1a1c, CRANK_AX.x - 0.015, CRANK_AX.y, CRANK_AX.z, root);
  const crankPivot = new THREE.Group(); crankPivot.position.copy(CRANK_AX); root.add(crankPivot);
  box(0.03, 0.12, 0.022, 0x8d8b86, 0.015, 0.06, 0, crankPivot); const crankKnob = box(0.075, 0.03, 0.03, 0xd2412a, 0.04, 0.12, 0, crankPivot);
  let crankAng = 0;

  // ================= Werkstatt hinten + Ingenieur (sitzt auf einem Rollhocker, schaut nach hinten) =================
  const ws = buildWorkshop({ THREE, box, lam, canvasTex, LAYER: LAYER_COCKPIT, spriteBlend }); root.add(ws.root); root.add(ws.heldRoot);
  const eg = new THREE.Group(); eg.rotation.y = Math.PI; root.add(eg); // lokales +z = Blick nach hinten
  { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 18), lam(0x2d3036)); st.position.set(0, 0.56, -0.08); st.layers.set(LAYER_COCKPIT); eg.add(st); const ba = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), lam(0x15161a)); ba.position.set(0, 0.48, -0.08); ba.layers.set(LAYER_COCKPIT); eg.add(ba); for (let i = 0; i < 5; i++) { const a = i * 1.2566; const le = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.2), lam(0x15161a)); le.position.set(Math.sin(a) * 0.1, 0.42, -0.08 + Math.cos(a) * 0.1); le.rotation.y = a; le.layers.set(LAYER_COCKPIT); eg.add(le); } }
  let eT0 = 0; const eLast = { x: 0, z: 0 }; let eWalk = 0;
  // --- Spiegel: fest an Tür und Dach, das Glas zeigt ein eigenes Bild (renderMirrors in main.js) ---
  const mirrorTargets = [];
  const mirrorGlass = (w, h, x, y, z, ry, rx, kind) => { const uv = new THREE.PlaneGeometry(w, h); const ua = uv.attributes.uv; for (let i = 0; i < ua.count; i++) ua.setX(i, 1 - ua.getX(i)); const gl = new THREE.Mesh(uv, new THREE.MeshBasicMaterial({ color: 0xd8dde2 })); gl.position.set(x, y, z); gl.rotation.order = 'YXZ'; gl.rotation.set(rx, ry, 0); gl.layers.set(LAYER_COCKPIT); root.add(gl); mirrorTargets.push({ mesh: gl, w, h, kind }); return gl; };
  for (const s of [1, -1]) { // Außenspiegel: Dreiecksfuß auf der Türkante, kräftiger Arm, Gehäuse
    const mx = 1.13 * s; const mz = 0.94; const yawM = s > 0 ? 0.2 : 0.35; box(0.2, 0.05, 0.3, RED, 0.93 * s, 0.86, mz, root); box(0.06, 0.1, 0.22, 0x8f2218, 0.95 * s, 0.91, mz, root); const armA = strut(RED, root); stretch(armA, V(0.95 * s, 0.9, mz), V(1.06 * s, 0.98, mz - 0.02), 0.07, 0.05);
    const hs = new THREE.Group(); hs.position.set(mx, 1.0, mz); hs.rotation.y = s * yawM; root.add(hs); box(0.26, 0.19, 0.1, RED, 0, 0, 0.03, hs); box(0.27, 0.03, 0.11, 0xa82719, 0, 0.1, 0.03, hs); box(0.26, 0.022, 0.03, 0x1a1a1c, 0, 0.083, -0.03, hs); box(0.26, 0.022, 0.03, 0x1a1a1c, 0, -0.083, -0.03, hs); box(0.022, 0.15, 0.03, 0x1a1a1c, 0.125, 0, -0.03, hs); box(0.022, 0.15, 0.03, 0x1a1a1c, -0.125, 0, -0.03, hs);
    mirrorGlass(0.23, 0.145, mx - Math.sin(s * yawM) * 0.022, 1.0, mz - Math.cos(s * yawM) * 0.022, Math.PI + s * yawM, -0.085, 'side');
  }
  { // Innenspiegel: Halter vom Dach
    box(0.03, 0.1, 0.03, 0x1a1a1c, 0.12, 1.69, 0.3, root); const fr = box(0.34, 0.1, 0.035, 0x1d1d1f, 0.12, 1.62, 0.3, root); fr.rotation.order = 'YXZ'; fr.rotation.set(0.23, -0.147, 0); mirrorGlass(0.315, 0.08, 0.1173, 1.616, 0.3 - 0.0185, Math.PI - 0.147, 0.23, 'inner');
  }

  // --- Frontscheibe: Glasebene trägt die Schlammtextur ---
  const mudTex = canvasTex(1024, 512); mudTex.cv.getContext('2d').clearRect(0, 0, 1024, 512);
  const glassBasis = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), UPD, new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), UPD));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WS.halfW * 2, WS.height), new THREE.MeshBasicMaterial({ map: mudTex.tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  glass.position.set(0, WS.baseY, WS.baseZ).addScaledVector(UPD, WS.height / 2); glass.quaternion.setFromRotationMatrix(glassBasis);
  glass.layers.set(LAYER_COCKPIT); glass.renderOrder = 5; root.add(glass);
  // Scheibenwischer: Gruppen in der Glasebene, Klinge zeigt bei Winkel 0 nach rechts (-x), Ruhelage unten
  const wipers = [{ x: 0.6 }, { x: -0.12 }].map((w) => {
    const g = new THREE.Group(); const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), UPD, new THREE.Vector3().crossVectors(new THREE.Vector3(-1, 0, 0), UPD));
    g.quaternion.setFromRotationMatrix(basis);
    g.position.set(w.x, WS.baseY + 0.02, WS.baseZ - 0.01).addScaledVector(UPD, 0.03); root.add(g);
    const arm = new THREE.Group(); g.add(arm);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.016, 0.012), lam(0x0e0e0f)); bl.position.set(0.42, 0, 0); bl.layers.set(LAYER_COCKPIT); arm.add(bl);
    const ar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.008, 0.008), lam(0x2b2b2d)); ar.position.set(0.24, 0.012, 0.004); ar.layers.set(LAYER_COCKPIT); arm.add(ar);
    return { ...w, arm, len: 0.82 };
  });

  const wsToCanvas = (x, vm) => [((x + WS.halfW) / (WS.halfW * 2)) * 1024, (1 - vm / WS.height) * 512];
  root.traverse((o) => o.layers.set(LAYER_COCKPIT));

  // ================= Zeichnen =================
// Tacho nach dem Vorbild europäischer Rundinstrumente: 270°-Skala 0-320 km/h, Zahlen alle 20, Striche alle 10, rote Spitze, Nadel mit Gegengewicht, digitale Anzeige
  const SPEEDO_MAX = 320; const A0 = Math.PI * 0.75; const SWEEP = Math.PI * 1.5;
  let speedoStatic = null; let auxStatic = null;
  const bezel = (c) => {
    c.clearRect(0, 0, 256, 256); const bg = c.createRadialGradient(128, 118, 20, 128, 128, 126); bg.addColorStop(0, '#202127'); bg.addColorStop(1, '#0b0b0e');
    c.fillStyle = '#05050a'; c.beginPath(); c.arc(128, 128, 127, 0, 7); c.fill(); c.fillStyle = bg; c.beginPath(); c.arc(128, 128, 121, 0, 7); c.fill();
    c.strokeStyle = '#3d3e44'; c.lineWidth = 3; c.beginPath(); c.arc(128, 128, 121, 0, 7); c.stroke();
  };
  const drawSpeedo = (kmh) => {
    const { ctx: c, tex, cv } = speedo; const cx = 128; const cy = 128;
    if (!speedoStatic) { // Zifferblatt ohne Nadel einmal zeichnen
      c.setTransform(2, 0, 0, 2, 0, 0); bezel(c);
      c.font = 'bold 15px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let v = 0; v <= SPEEDO_MAX; v += 10) {
        const a = A0 + (v / SPEEDO_MAX) * SWEEP; const major = v % 20 === 0 || v === SPEEDO_MAX; const red = v >= 280;
        c.strokeStyle = red ? '#ff4a2a' : '#f1efe6'; c.lineWidth = major ? 3 : 1.6; const r1 = 115; const r2 = major ? 99 : 106;
        c.beginPath(); c.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); c.stroke();
        if (v % 20 === 0 && v > 0 && v <= 300) { c.fillStyle = red ? '#ff6a4a' : '#f1efe6'; c.fillText(String(v), cx + Math.cos(a) * 80, cy + Math.sin(a) * 80); }
      }
      { const a = A0 + SWEEP; c.fillStyle = '#ff6a4a'; c.font = 'bold 11px Segoe UI, Arial'; c.fillText('320', cx + Math.cos(a) * 66, cy + Math.sin(a) * 66 - 3); }
      c.strokeStyle = '#ff4a2a'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 117.5, A0 + (280 / SPEEDO_MAX) * SWEEP, A0 + SWEEP); c.stroke(); // Randlinie im roten Bereich
      c.fillStyle = '#8f8d83'; c.font = '13px Segoe UI, Arial'; c.fillText('km/h', cx, cy + 36);
      c.setTransform(1, 0, 0, 1, 0, 0); speedoStatic = document.createElement('canvas'); speedoStatic.width = speedoStatic.height = 512; speedoStatic.getContext('2d').drawImage(cv, 0, 0);
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 512, 512); c.drawImage(speedoStatic, 0, 0); c.setTransform(2, 0, 0, 2, 0, 0);
    // digitale Anzeige: Tempo
    c.fillStyle = '#0a1210'; c.fillRect(cx - 30, cy + 46, 60, 26); c.strokeStyle = '#3d3e44'; c.lineWidth = 1.5; c.strokeRect(cx - 30, cy + 46, 60, 26);
    c.fillStyle = '#ffb25a'; c.font = 'bold 22px Consolas, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(Math.round(kmh)), cx, cy + 60);
    // Nadel
    const a = A0 + Math.min(1.02, kmh / SPEEDO_MAX) * SWEEP; const ca = Math.cos(a); const sa = Math.sin(a);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 5; c.shadowOffsetY = 2;
    c.strokeStyle = '#ff3b1c'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - ca * 22, cy - sa * 22); c.lineTo(cx + ca * 104, cy + sa * 104); c.stroke();
    c.lineWidth = 8; c.beginPath(); c.moveTo(cx - ca * 22, cy - sa * 22); c.lineTo(cx - ca * 10, cy - sa * 10); c.stroke(); c.restore();
    c.fillStyle = '#26272c'; c.beginPath(); c.arc(cx, cy, 11, 0, 7); c.fill(); c.strokeStyle = '#6b6c72'; c.lineWidth = 2; c.stroke();
    c.setTransform(1, 0, 0, 1, 0, 0); tex.needsUpdate = true;
  };
  const drawAux = (rpm, mud, wiperOn, gear) => {
    const { ctx: c, tex, cv } = aux; const cx = 128; const cy = 128;
    if (!auxStatic) {
      c.setTransform(2, 0, 0, 2, 0, 0); bezel(c); c.font = 'bold 15px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let v = 0; v <= 16; v++) { // Striche alle 500/min, Zahlen alle 1000/min
        const a = A0 + (v / 16) * SWEEP; const major = v % 2 === 0; const red = v >= 14;
        c.strokeStyle = red ? '#ff4a2a' : '#f1efe6'; c.lineWidth = major ? 3 : 1.6; const r2 = major ? 99 : 106;
        c.beginPath(); c.moveTo(cx + Math.cos(a) * 115, cy + Math.sin(a) * 115); c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); c.stroke();
        if (major) { c.fillStyle = red ? '#ff6a4a' : '#f1efe6'; c.fillText(String(v / 2), cx + Math.cos(a) * 82, cy + Math.sin(a) * 82); }
      }
      c.strokeStyle = '#ff4a2a'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, 117.5, A0 + (7 / 8) * SWEEP, A0 + SWEEP); c.stroke();
      c.fillStyle = '#8f8d83'; c.font = '12px Segoe UI, Arial'; c.fillText('x1000/min', cx, cy + 34);
      c.setTransform(1, 0, 0, 1, 0, 0); auxStatic = document.createElement('canvas'); auxStatic.width = auxStatic.height = 512; auxStatic.getContext('2d').drawImage(cv, 0, 0);
    }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 512, 512); c.drawImage(auxStatic, 0, 0); c.setTransform(2, 0, 0, 2, 0, 0);
    c.fillStyle = '#0a1210'; c.fillRect(cx - 18, cy + 46, 36, 26); c.strokeStyle = '#3d3e44'; c.lineWidth = 1.5; c.strokeRect(cx - 18, cy + 46, 36, 26);
    c.fillStyle = '#ffb25a'; c.font = 'bold 22px Consolas, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(gear === 0 ? 'R' : gear < 0 ? 'N' : String(gear), cx, cy + 60);
    c.fillStyle = wiperOn ? '#6fdc7a' : '#34353a'; c.beginPath(); c.arc(cx - 30, cy + 88, 5, 0, 7); c.fill(); c.fillStyle = mud > 0.35 ? '#e0a02a' : '#34353a'; c.beginPath(); c.arc(cx + 30, cy + 88, 5, 0, 7); c.fill();
    const a = A0 + Math.min(1.02, rpm / 8000) * SWEEP; const ca = Math.cos(a); const sa = Math.sin(a);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 5; c.shadowOffsetY = 2; c.strokeStyle = '#ff3b1c'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - ca * 18, cy - sa * 18); c.lineTo(cx + ca * 104, cy + sa * 104); c.stroke(); c.restore();
    c.fillStyle = '#26272c'; c.beginPath(); c.arc(cx, cy, 10, 0, 7); c.fill(); c.strokeStyle = '#6b6c72'; c.lineWidth = 2; c.stroke();
    c.setTransform(1, 0, 0, 1, 0, 0); tex.needsUpdate = true;
  };
    const drawRadio = (r) => {
    const { ctx: c, tex } = radioFace; c.fillStyle = '#0d1410'; c.fillRect(0, 0, 512, 168);
    const on = r.on; c.textBaseline = 'middle';
    if (!on) { c.fillStyle = '#2b3a2e'; c.font = 'bold 40px Consolas, monospace'; c.textAlign = 'center'; c.fillText('RADIO AUS', 256, 74); c.font = '20px Consolas, monospace'; c.fillText('T = einschalten', 256, 124); }
    else {
      c.textAlign = 'left'; c.fillStyle = '#7dffa0'; c.font = 'bold 42px Consolas, monospace'; c.fillText(r.name, 24, 38);
      c.font = '30px Consolas, monospace'; c.fillStyle = '#4fe07f'; c.fillText(`${r.freq} MHz`, 24, 86);
      c.font = '19px Consolas, monospace'; c.fillStyle = '#3aa65d'; c.fillText(r.sub, 24, 126);
      // Lautstärke
      c.fillStyle = '#3aa65d'; c.font = '18px Consolas, monospace'; c.textAlign = 'right'; c.fillText('VOL', 486, 22);
      for (let i = 0; i < 10; i++) { c.fillStyle = i < Math.round(r.volume * 10) ? '#7dffa0' : '#173020'; c.fillRect(330 + i * 17, 34, 12, 26); }
      // Pegel (echtes Ausgangssignal des Radios)
      for (let i = 0; i < 16; i++) { const lit = i < Math.round(Math.min(1, r.level * 5) * 16); c.fillStyle = lit ? (i > 12 ? '#ff6a4a' : '#7dffa0') : '#173020'; c.fillRect(330 + i * 10.5, 72, 8, 36); }
      c.fillStyle = '#3aa65d'; c.font = '16px Consolas, monospace'; c.textAlign = 'right'; c.fillText(r.muted ? 'STUMM (M)' : 'G/H Sender  V/B Laut', 486, 136);
    }
    c.fillStyle = on ? '#ff3b30' : '#401512'; c.beginPath(); c.arc(492, 148, 6, 0, 7); c.fill();
    tex.needsUpdate = true;
  };
  // ================= Schlamm =================
  const mud = { cv: mudTex.cv, ctx: mudTex.cv.getContext('2d'), tex: mudTex.tex, sample: document.createElement('canvas'), coverage: 0, dirty: false };
  mud.sample.width = 64; mud.sample.height = 32;
  const rnd = Math.random;
  function addMud(count, size = 1) {
    const c = mud.ctx;
    for (let n = 0; n < count; n++) {
      const x = 30 + rnd() * 964; const vm = 0.05 + Math.pow(rnd(), 1.1) * 0.62; const y = (1 - vm / WS.height) * 512; // in Metern auf der Scheibe (Wischerbereich), eher unten
      const r = (30 + rnd() * 70) * size;
      for (let k = 0; k < 4 + (rnd() * 5 | 0); k++) { // Fleck + Spritzer
        const a = rnd() * 6.283; const d = rnd() * r * 0.8; const rr = r * (0.25 + rnd() * 0.55);
        const gr = c.createRadialGradient(x + Math.cos(a) * d, y + Math.sin(a) * d, rr * 0.1, x + Math.cos(a) * d, y + Math.sin(a) * d, rr);
        gr.addColorStop(0, 'rgba(58,40,22,0.96)'); gr.addColorStop(0.7, 'rgba(78,54,30,0.9)'); gr.addColorStop(1, 'rgba(90,64,38,0)');
        c.fillStyle = gr; c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 7); c.fill();
      }
    }
    mud.dirty = true;
  }
  let prevAngle = null;
  // Wischer-Winkel 0..1,85 rad: löscht den überstrichenen Sektor teilweise (Reststreifen bleiben -> schrittweise sauber)
  function wipe(angle) {
    if (prevAngle === null) { prevAngle = angle; return; }
    const c = mud.ctx; c.globalCompositeOperation = 'destination-out';
    const lo = Math.min(prevAngle, angle); const hi = Math.max(prevAngle, angle); const steps = Math.max(1, Math.ceil((hi - lo) / 0.18)); // auch bei niedriger Bildrate lückenlos wischen
    for (let k = 0; k < steps; k++) {
      const a1 = lo + (hi - lo) * k / steps - 0.012; const a2 = lo + (hi - lo) * (k + 1) / steps + 0.012;
      for (const w of wipers) {
        const p = [w.x, 0.03]; const pt = (a) => [p[0] - Math.cos(a) * w.len, p[1] + Math.sin(a) * w.len];
        const A = pt(a1); const B = pt(a2); const P = wsToCanvas(p[0], p[1]); const Aa = wsToCanvas(A[0], A[1]); const Bb = wsToCanvas(B[0], B[1]);
        c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.moveTo(P[0], P[1]); c.lineTo(Aa[0], Aa[1]); c.lineTo(Bb[0], Bb[1]); c.closePath(); c.fill();
      }
    }
    c.globalCompositeOperation = 'source-over'; mud.dirty = true; prevAngle = angle;
  }
  function wiperRest() { prevAngle = null; }
  function fade(a) { const c = mud.ctx; c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,' + Math.min(1, a) + ')'; c.fillRect(0, 0, 1024, 512); c.globalCompositeOperation = 'source-over'; mud.dirty = true; } // Kurbel: der Rest verschwindet gleichmäßig, damit nach ~2 s alles sauber ist
  function measure() { // Anteil der verdeckten Scheibe (0..1), aus den echten Pixeln
    const sc = mud.sample.getContext('2d', { willReadFrequently: true }); sc.clearRect(0, 0, 64, 32); sc.drawImage(mud.cv, 0, 0, 64, 32);
    const d = sc.getImageData(0, 0, 64, 32).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i];
    mud.coverage = s / 255 / (64 * 32); return mud.coverage;
  }
  function clearMud() { mud.ctx.clearRect(0, 0, 1024, 512); mud.dirty = true; mud.coverage = 0; }

  // ================= Frame-Update =================
  const bendV = new THREE.Vector3(); const tmpA = new THREE.Vector3(); const tmpB = new THREE.Vector3(); const tmpC = new THREE.Vector3();
  const elbow = new THREE.Vector3(); const wristW = new THREE.Vector3(); const midS = new THREE.Vector3(); const ankW = new THREE.Vector3(); const kneeW = new THREE.Vector3();
  const invRoot = new THREE.Matrix4(); const relM = new THREE.Matrix4(); const hp = new THREE.Vector3(); const hs = new THREE.Vector3(); const hq = new THREE.Quaternion();
  const lvQ = new THREE.Quaternion(); const lvP = new THREE.Vector3(); const bx = new THREE.Vector3(); const by = new THREE.Vector3(); const bz = new THREE.Vector3(); const bm = new THREE.Matrix4();
  const shQ = new THREE.Quaternion(); const shP = new THREE.Vector3(); const hp0 = new THREE.Vector3(); const padA = new THREE.Vector3(); const padB = new THREE.Vector3(); const footP = new THREE.Vector3();
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let handVis = 0; let lastT = performance.now();
  let footB = 0; let thrVis = 0; let brkVis = 0; let cluVis = 0; let leverGear = 1; let lvRx = 0; let lvRz = 0; let steerVis = 0;
  // Schaltkulisse: [Spalte, Zeile] je Gang (0 = Rückwärts); Spalte -1 = links (zum Fahrer links), Zeile +1 = vorn
  const GATE = { 0: [1.6, 1], 1: [-1, 1], 2: [-1, -1], 3: [0, 1], 4: [0, -1], 5: [1, 1], 6: [1, -1], 7: [2, 1], 8: [2, -1] };
  // ================= Figuren: Ziele für die drei Skelette (racefigure.js) =================
  const figs = { driver: null, navigator: null, engineer: null }; let ownRole = 'driver';
  const v3 = () => new THREE.Vector3(); const handT = () => ({ wrist: v3(), F: v3(), P: v3(), grip: 0.85 }); const footT = () => ({ ankle: v3(), toe: v3() });
  const dP = { x: 0.36, y: 0.6, z: -0.4, yaw: 0, lean: 0.08, slump: 0.09, hands: { L: handT(), R: handT() }, feet: { L: footT(), R: footT() } };
  const nP = { x: NAV_X, y: 0.6, z: -0.42, yaw: 0, lean: 0.1, slump: 0.13, hands: { L: handT(), R: handT() }, feet: { L: footT(), R: footT() } };
  const eP = { x: 0, y: 0.66, z: -2, yaw: Math.PI, lean: 0.1, slump: 0.1, hands: { L: handT(), R: handT() }, feet: { L: footT(), R: footT() } };
  function attachFigures(list) { for (const k of Object.keys(figs)) { figs[k] = list[k]; root.add(list[k].root); list[k].root.traverse((o) => o.layers.set(LAYER_COCKPIT)); } setRole(ownRole); }
  // Pedalfläche (Fußkontakt) für Pedal `p` bei Drückgrad `press` (0..1); schreibt die Kontaktstelle nach `out`
  function padPoint(p, press, out) {
    const a = 0.12 - 0.4 * press; p.rotation.x = a;
    out.set(p.position.x, p.position.y - 0.135 * Math.cos(a) + 0.014 * Math.sin(a), p.position.z - 0.135 * Math.sin(a) - 0.014 * Math.cos(a) - 0.012);
    return out;
  }
  // Fußziel: Ballen an `ball`, Zehen nach unten um `phi`
  function setFoot(f, ball, phi) { f.ankle.set(ball.x, ball.y + 0.09 * Math.cos(phi) + 0.12 * Math.sin(phi), ball.z + 0.09 * Math.sin(phi) - 0.12 * Math.cos(phi)); f.toe.set(ball.x, ball.y - 0.02 * Math.cos(phi) - 0.06 * Math.sin(phi), ball.z + 0.06 * Math.cos(phi)); }
  // --- Navigator pro Frame: Tablet hoch/weg, Kurbeldrehung, Arme/Beine ---
  const nUp = new THREE.Vector3(NAV_X - 0.14, 0.8, -0.1); const nLie = new THREE.Vector3(NAV_X - 0.2, 0.62, -0.18); // gehalten: tief und seitlich auf Oberschenkel-Höhe, der Bildschirm bleibt frei
  const nQUp = new THREE.Quaternion(); { const m = new THREE.Matrix4().lookAt(NAV_EYE, nUp, new THREE.Vector3(0, 1, 0)); nQUp.setFromRotationMatrix(m); }
  const nQLie = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const gp = [new THREE.Vector3(), new THREE.Vector3()]; const nElb = new THREE.Vector3(); const nWr = new THREE.Vector3(); const nKn = new THREE.Vector3(); const nAnk = new THREE.Vector3(); const nBend = new THREE.Vector3();
  const nbx = new THREE.Vector3(); const nby = new THREE.Vector3(); const nbz = new THREE.Vector3(); const nbm = new THREE.Matrix4(); const nq = new THREE.Quaternion(); const nTmp = new THREE.Vector3();
  const nHandBasis = (axis, toward, out) => { nby.copy(axis).normalize(); nbz.copy(toward); nbz.addScaledVector(nby, -nbz.dot(nby)).normalize(); nbx.crossVectors(nby, nbz); nbm.makeBasis(nbx, nby, nbz); out.setFromRotationMatrix(nbm); return out; };
  function updateNav(n, dt) {
    const ta = Math.min(1, Math.max(0, n.tablet)); const ca = Math.min(1, Math.max(0, n.crank));
    tab.position.lerpVectors(nLie, nUp, ta); tab.quaternion.slerpQuaternions(nQLie, nQUp, ta); tab.updateMatrix();
    if (ca > 0.5) crankAng += dt * 15; crankPivot.rotation.x = crankAng;
    // Griff: nur an den Außenkanten unten, Finger hinter dem Gehäuse, der Bildschirm bleibt frei
    const tabUp = tmpA.set(0, 1, 0).applyQuaternion(tab.quaternion).clone(); const tabNormal = tmpB.set(0, 0, 1).applyQuaternion(tab.quaternion).clone(); const tabSide = tmpC.set(1, 0, 0).applyQuaternion(tab.quaternion).clone();
    const knobW = new THREE.Vector3(0.04, 0.12, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), crankAng).add(CRANK_AX); const lap = [new THREE.Vector3(NAV_X + 0.14, 0.72, -0.12), new THREE.Vector3(NAV_X - 0.14, 0.72, -0.12)];
    for (const [i, kS] of [[0, 'L'], [1, 'R']]) {
      const sg = (tabSide.x > 0 ? 1 : -1) * (i ? -1 : 1); const grip = nTmp.copy(tab.position).addScaledVector(tabSide, sg * 0.104).addScaledVector(tabUp, -0.08).clone(); const wrist = grip.clone().addScaledVector(tabSide, sg * 0.07).addScaledVector(tabUp, -0.05).addScaledVector(tabNormal, -0.05); const h = nP.hands[kS];
      h.wrist.lerpVectors(lap[i], wrist, ta); h.F.copy(grip).sub(wrist).normalize(); h.P.copy(tabSide).multiplyScalar(-sg); h.grip = 0.62;
      if (i === 1 && ca > 0) { h.wrist.lerp(tmpA.copy(knobW).add(nTmp.set(0.05, 0.02, -0.08)), ca); h.F.lerp(nTmp.set(-0.6, -0.1, 0.8), ca).normalize(); h.P.lerp(nTmp.set(-0.2, -1, 0), ca); h.grip = 0.95; }
      setFoot(nP.feet[kS], nTmp.set(NAV_X + (i ? -0.12 : 0.12), 0.44, 0.12 + (i ? -0.04 : 0.02)), 0.14);
    }
  }
  // e: { x, z (Position im Auto), reach (Zielpunkt Fahrzeugsystem | null), work (0..1), heldHand: bool }
  function updateEng(e, dt) {
    eg.position.set(e.x, 0, e.z); eT0 += dt; eP.x = e.x; eP.z = e.z + 0.08; const dx = e.x - eLast.x; const dz = e.z - eLast.z; eLast.x = e.x; eLast.z = e.z; const mv = Math.min(1, Math.hypot(dx, dz) / Math.max(dt, 1e-3) / 1.3); eWalk += mv * dt * 8;
    // rechte Hand arbeitet am Ziel (zuckt beim Arbeiten), linke hilft oder ruht; Füße trippeln den Hocker durch die Werkstatt
    const R = eP.hands.R; const Lh = eP.hands.L; if (e.reach) { const w = (e.work || 0) * 0.012; R.wrist.copy(e.reach); R.wrist.x += Math.sin(eT0 * 38) * w; R.wrist.y += Math.cos(eT0 * 31) * w + 0.06; R.wrist.z += 0.08; R.F.set(0, -0.5, -0.86); R.P.set(0, -1, 0.3); R.grip = 0.75; Lh.wrist.set(e.x - 0.26, 0.86, e.z - 0.3); Lh.F.set(0, -0.3, -1); Lh.P.set(0.3, -1, 0); Lh.grip = 0.4; } else { R.wrist.set(e.x - 0.2, 0.8, e.z - 0.34); R.F.set(0.2, -0.5, -0.84); R.P.set(0.3, -1, 0.3); R.grip = 0.5; Lh.wrist.set(e.x + 0.2, 0.8, e.z - 0.34); Lh.F.set(-0.2, -0.5, -0.84); Lh.P.set(-0.3, -1, 0.3); Lh.grip = 0.5; }
    for (const [i, kS] of [[0, 'L'], [1, 'R']]) { const sg = i ? -1 : 1; const st = Math.sin(eWalk + i * Math.PI); nAnk.set(e.x - sg * 0.13, 0.43 + Math.max(0, st) * 0.05 * mv, e.z - 0.34 + st * 0.12 * mv); const f = eP.feet[kS]; f.ankle.set(nAnk.x, nAnk.y + 0.09, nAnk.z + 0.1); f.toe.set(nAnk.x, nAnk.y + 0.03, nAnk.z - 0.05); }
    // Gegenstand in der rechten Hand
    const wig = Math.sin(eT0 * 3) * 0.05 + (e.work ? Math.sin(eT0 * 30) * 0.15 * e.work : 0); if (e.fp) { ws.heldRoot.position.set(0.2 + (e.work ? Math.sin(eT0 * 26) * 0.012 * e.work : 0), -0.24, -0.5); ws.heldRoot.rotation.set(0.5, 0.6 + wig, 0.1); } else { ws.heldRoot.position.copy(R.wrist); ws.heldRoot.position.z -= 0.1; ws.heldRoot.rotation.set(0.3, wig, 0); }
    ws.heldRoot.visible = !!e.holding;
  }
  function setRole(role) { ownRole = role; for (const k of Object.keys(figs)) if (figs[k]) figs[k].setOwn(k === role); eg.visible = role !== 'engineer'; if (figs.engineer) figs.engineer.root.visible = role !== 'engineer'; /* der Ingenieur sieht in der Ich-Sicht nur Werkzeug und Teile */ }
  setRole('driver');

  function update(d) {
    // d: { steer (-1..1, links +), kmh, rpm, gear, wiperAngle, hand (0..1), throttle, brake, clutch (0..1), shiftP (0..1 Schaltvorgang, <0 = keiner), mud, radio:{...} }
    const now = performance.now(); const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
    steerVis += (d.steer - steerVis) * Math.min(1, dt * 16); // weiche Lenkbewegung
    spin.rotation.z = steerVis * 1.9; // positiv = links: gegen den Uhrzeigersinn aus Fahrersicht
    wheelPivot.updateMatrixWorld(true); root.updateMatrixWorld(true); invRoot.copy(root.matrixWorld).invert();
    handVis += Math.min(Math.abs(d.hand - handVis), 5.5 * dt) * Math.sign(d.hand - handVis); // sichtbare Bewegung etwas gemächlicher als die Physik
    const reach = sstep(0.0, 0.55, handVis); const pull = sstep(0.45, 1.0, handVis);
    // Hebel: Ruhelage leicht nach vorn, gezogen weit zum Fahrer
    hbPivot.rotation.x = 0.2 - 0.72 * pull;
    by.set(0, Math.cos(hbPivot.rotation.x), Math.sin(hbPivot.rotation.x)); lvP.copy(HB_GRIP).applyAxisAngle(tmpC.set(1, 0, 0), hbPivot.rotation.x).add(hbPivot.position);
    bz.set(0, 0, -1); bz.addScaledVector(by, -bz.dot(by)).normalize(); bx.crossVectors(by, bz); bm.makeBasis(bx, by, bz); lvQ.setFromRotationMatrix(bm);
    // Schalthebel: Hand fährt zum Knauf, Hebel springt in die Gasse des neuen Gangs, Hand kehrt zurück
    const sp = d.shiftP === undefined ? -1 : d.shiftP; const reachS = sp < 0 ? 0 : sstep(0, 0.22, sp) * (1 - sstep(0.7, 1, sp));
    if (reachS > 0.75) leverGear = d.gear;
    const gt = GATE[leverGear] || GATE[1]; const k = 1 - Math.exp(-dt * 16);
    lvRz += (gt[0] * 0.11 - lvRz) * k; lvRx += (gt[1] * 0.14 - lvRx) * k; shiftPivot.rotation.set(lvRx, 0, lvRz);
    shP.copy(SHIFT_GRIP).applyEuler(shiftPivot.rotation).add(shiftPivot.position);
    by.set(0, 1, 0).applyEuler(shiftPivot.rotation); bz.set(0, 0, -1); bz.addScaledVector(by, -bz.dot(by)).normalize(); bx.crossVectors(by, bz); bm.makeBasis(bx, by, bz); shQ.setFromRotationMatrix(bm);
    for (let i = 0; i < 2; i++) { // i = 0: linke Hand (9 Uhr), i = 1: rechte Hand (3 Uhr), die rechte geht auch an Schalthebel und Handbremse
      relM.multiplyMatrices(invRoot, handAnchors[i].matrixWorld); relM.decompose(hp, hq, hs); const h = dP.hands[i ? 'R' : 'L']; const rad = tmpA.set(1, 0, 0).applyQuaternion(hq).clone(); const nor = tmpB.set(0, 0, 1).applyQuaternion(hq).clone();
      h.wrist.copy(hp).addScaledVector(rad, WRIST.x).addScaledVector(nor, WRIST.z); h.F.copy(hp).addScaledVector(rad, -0.02).sub(h.wrist).normalize(); h.P.copy(rad).multiplyScalar(-1); h.grip = 0.86;
      if (i === 1 && reachS > 0) { tmpC.copy(shP).add(tmpA.set(0, 0.075, -0.075)); h.wrist.lerp(tmpC, reachS); h.wrist.y += Math.sin(Math.PI * reachS) * 0.05; h.F.lerp(tmpA.set(0, -0.62, 0.78), reachS).normalize(); h.P.lerp(tmpA.set(0, -0.78, -0.62), reachS); }
      if (i === 1 && reach > 0) { tmpC.copy(lvP).add(tmpA.set(0, 0.03, -0.1)); h.wrist.lerp(tmpC, reach); h.wrist.y += Math.sin(Math.PI * reach) * 0.05 * (1 - pull * 0.5); h.F.lerp(tmpA.set(0, 0.2, 0.98), reach).normalize(); h.P.lerp(tmpA.set(0.9, -0.4, 0), reach); }
    }
    // Pedale und Füße: rechter Fuß Gas/Bremse, linker Fuß Kupplung (beim Schalten) oder Ruheplatz
    thrVis += ((d.throttle || 0) - thrVis) * Math.min(1, dt * 10); brkVis += ((d.brake || 0) - brkVis) * Math.min(1, dt * 12); cluVis += ((d.clutch || 0) - cluVis) * Math.min(1, dt * 18);
    footB += (((d.brake || 0) > 0.05 ? 1 : 0) - footB) * Math.min(1, dt * 9);
    padPoint(pedals.gas, thrVis, padA); padPoint(pedals.brake, brkVis, padB); padPoint(pedals.clutch, cluVis, tmpC);
    footP.lerpVectors(padA, padB, footB); footP.y += Math.sin(Math.PI * footB) * 0.05; footP.z -= 0.14; footP.y += 0.02;
    setFoot(dP.feet.R, footP, 0.42 + 0.3 * (thrVis * (1 - footB) + brkVis * footB));
    padPoint(pedals.clutch, cluVis, tmpC); tmpC.z -= 0.14; tmpC.y += 0.02; footP.set(0.62, 0.46, 0.2).lerp(tmpC, cluVis); footP.y += Math.sin(Math.PI * cluVis) * 0.03;
    setFoot(dP.feet.L, footP, 0.3 + 0.4 * cluVis);
    if (d.nav) updateNav(d.nav, dt);
    if (d.eng) updateEng(d.eng, dt);
    if (d.ws) ws.update(dt, d.ws);
    // Figuren stellen; der Kopf folgt dem Blick des jeweiligen Spielers (im Mehrspieler kommt er vom Mitspieler)
    if (figs.driver) { const l = d.looks || {}; const lk = (r) => l[r] || { yaw: 0, pitch: 0 }; const apply = (P, r) => { const o = lk(r); const y = Math.max(-1.75, Math.min(1.75, o.yaw)); P.headYaw = Math.max(-1.05, Math.min(1.05, y * 0.7)); P.twist = y - P.headYaw; P.headPitch = Math.max(-0.7, Math.min(0.6, o.pitch)); }; apply(dP, 'driver'); apply(nP, 'navigator'); apply(eP, 'engineer'); figs.driver.pose(root, dP); figs.navigator.pose(root, nP); if (figs.engineer.root.visible) figs.engineer.pose(root, eP); }
    knobVol.rotation.y = 0; knobPower.rotation.z = 0;
    knobVol.children[0].position.set(Math.sin(-2.2 + d.radio.volume * 4.4) * 0.016, Math.cos(-2.2 + d.radio.volume * 4.4) * 0.016, -0.016);
    knobPower.children[0].position.set(0, d.radio.on ? 0.016 : -0.016, -0.016);
    if (d.wiperAngle !== undefined) { for (const w of wipers) w.arm.rotation.z = d.wiperAngle; }
  }

    function flushMud() { if (mud.dirty) { mud.tex.needsUpdate = true; mud.dirty = false; } }

  // Klick auf Radio-Bedienelemente
  const ray = new THREE.Raycaster();
  function pick(ndc, camera) { ray.setFromCamera(ndc, camera); ray.layers.enable(LAYER_COCKPIT); const hit = ray.intersectObjects(pickables, false)[0]; return hit ? hit.object.name : null; }

  return { root, update, attachFigures, figs, tab, hoodBox, glass, spin, ring, speedoCanvas: speedo.cv, drawSpeedo, drawAux, drawRadio, tablet: map, workshop: ws, setRole, addMud, wipe, wiperRest, fade, measure, clearMud, flushMud, mud, mirrors: mirrorTargets, pick, WS, LAYER_COCKPIT };
}

export { THREE };
