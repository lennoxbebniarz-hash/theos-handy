// Theos Seitenscheidel - Werkstatt im Heck: Motor, Wartungsklappen, Werkzeugkiste, Teile- und Flüssigkeitsschrank (links), Nitro-Steuerung und Diagnosedisplay (rechts),
// Warnbildschirm an der Decke. Alles anklickbar über `userData.id` (siehe engineer.js). Koordinaten im Fahrzeugsystem (x links, z vorn); der Ingenieur schaut nach hinten (-z):
// seine linke Seite ist -x (Arbeitsplatte, Tafel), seine rechte +x (Display, Nitro). Reine Darstellung - der Zustand kommt von außen (update).
import { PART_NAMES, TOOLS, DEFS, SEV_NAMES, diagnostics, sortedDamages, damageLeft, urgentDamage, nitroStatus, repairProgress, NITRO_MAX, WHEEL_NAMES } from './damage.js';
import { currentStep, hintText, COMP_NAMES, targetLabel } from './engineer.js';
import { ART, FIT } from './workshopart.js';

export const ENG_BOUNDS = { x0: -0.42, x1: 0.56, z0: -2.62, z1: -1.38 }; // wo der Ingenieur laufen darf
export const ENG_START = { x: 0.05, z: -1.8 };
const TOOL_HOME = { wrench: -2.16, screwdriver: -2.1, tireiron: -2.04, jack: -1.98, pliers: -1.92, multimeter: -1.86, brush: -1.8 };

export function buildWorkshop(H) {
  const { THREE, box, lam, canvasTex, LAYER } = H;
  const root = new THREE.Group(); root.name = 'workshop';
  const pickables = []; const byId = {};
  const mesh = (geo, color, parent, x = 0, y = 0, z = 0, extra) => { const m = new THREE.Mesh(geo, lam(color, extra)); m.position.set(x, y, z); m.layers.set(LAYER); parent.add(m); return m; };
  const reg = (m, id) => { m.userData.id = id; m.userData.base = m.material.emissive ? m.material.emissive.getHex() : 0; m.userData.base0 = m.userData.base; pickables.push(m); (byId[id] = byId[id] || []).push(m); return m; };
  const cyl = (r, h, color, parent, x, y, z, seg = 10) => mesh(new THREE.CylinderGeometry(r, r, h, seg), color, parent, x, y, z);
  const STEEL = 0x8f959c; const DARKM = 0x2d3036; const PANEL = 0x4a4d52; const ORANGE = 0xe8821e;

  // ---------------- Hilfen: eingebaute Teile sind Modelle (workshopart.js) mit eigener, unsichtbarer Hitbox ----------------
  const artMeshes = {}; const fit = (parent, build, id, x, y, z, sc = 1, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(sc); g.rotation.y = ry; parent.add(g); build((geo, color, px = 0, py = 0, pz = 0, rx = 0, rys = 0, rz = 0) => { const m = mesh(geo, color, g, px, py, pz); m.rotation.set(rx, rys, rz); if (id) { m.userData.id = 'art'; (artMeshes[id] = artMeshes[id] || []).push(m); } return m; }); return g; };
  const comp = (id, m) => reg(m, `c:${id}`); const proxy = (id, w, h, d, parent, x, y, z) => { const m = box(w, h, d, 0x333333, x, y, z, parent); m.material.visible = false; return comp(id, m); };

  // ---------------- Hülle: Boden (mit Gruben unter den Bodenklappen), Wände, Decke, Heckwand mit offenem Fenster ----------------
  const FZ = -2.42; const floorP = (x0, x1, z0, z1) => box(x1 - x0, 0.1, z1 - z0, 0x222326, (x0 + x1) / 2, 0.35, (z0 + z1) / 2, root);
  floorP(-0.9, 0.12, -3.645, -1.195); floorP(0.62, 0.9, -3.645, -1.195); floorP(0.12, 0.62, -1.5, -1.195); floorP(0.12, 0.62, -2.05, -2.0); floorP(0.12, 0.62, -3.645, -2.55);
  for (let i = 0; i < 12; i++) box(1.0, 0.012, 0.03, 0x2f3136, -0.38, 0.405, -1.3 - i * 0.19, root); // Riffelblech
  for (const s of [1, -1]) { box(0.06, 1.4, 2.45, PANEL, 0.9 * s, 1.07, FZ, root); box(0.062, 0.05, 2.4, ORANGE, 0.9 * s, 1.0, FZ, root); box(0.07, 0.06, 2.45, 0x1c1d20, 0.9 * s, 1.745, FZ, root); }
  box(1.8, 0.07, 2.45, 0x3d4046, 0, 1.78, FZ, root);
  box(1.8, 0.7, 0.08, PANEL, 0, 0.75, -3.62, root); box(1.8, 0.1, 0.08, 0x1c1d20, 0, 1.74, -3.62, root); box(0.1, 0.6, 0.08, 0x1c1d20, 0.85, 1.4, -3.62, root); box(0.1, 0.6, 0.08, 0x1c1d20, -0.85, 1.4, -3.62, root); // Rückfenster bleibt offen
  for (const x of [-0.35, 0.35]) { const l = box(0.05, 0.02, 1.7, 0xfff4d6, x, 1.735, -2.4, root); l.material.emissive.set(0xfff4d6); } // Deckenleuchten

  // ---------------- Motorraum: der Motor selbst kommt aus raceinterior.js; hier die Wartungsteile rund um ihn ----------------
  const eng = new THREE.Group(); eng.position.set(0, 0, -3.1); root.add(eng);
  const bay = new THREE.Group(); bay.position.set(0, 1.0, 0.0); eng.add(bay);
  fit(bay, FIT.oilcap, 'oilcap', -0.31, 0.0, 0.2); proxy('oilcap', 0.2, 0.14, 0.12, bay, -0.27, 0.02, 0.2);
  fit(bay, FIT.coolcap, 'coolcap', 0.34, 0.02, 0.2); proxy('coolcap', 0.26, 0.18, 0.16, bay, 0.34, 0.02, 0.2);
  fit(bay, ART.fuelpump, 'fuelpump', 0.02, -0.04, 0.22); proxy('fuelpump', 0.32, 0.14, 0.13, bay, 0.02, 0.02, 0.22);
  fit(bay, ART.filter, 'airfilter', -0.28, -0.05, -0.12, 1.2); proxy('airfilter', 0.36, 0.2, 0.2, bay, -0.28, 0.04, -0.12);
  fit(bay, ART.turbo, 'turbo', 0.27, -0.09, -0.12, 1.15); proxy('turbo', 0.3, 0.26, 0.3, bay, 0.27, 0.04, -0.12);
  for (const [x, z] of [[-0.44, -0.3], [0.44, -0.3], [-0.45, 0.33], [0.45, 0.33]]) { fit(bay, FIT.mounts, 'mounts', x, 0.0, z); proxy('mounts', 0.11, 0.09, 0.09, bay, x, 0.0, z); }
  fit(bay, (mk) => { mk(new THREE.BoxGeometry(0.72, 0.06, 0.07), 0x6f7277, 0, 0, 0); mk(new THREE.CylinderGeometry(0.03, 0.035, 0.03, 20), 0xb8bcc2, 0.2, 0.045, 0); mk(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 14), 0x121214, -0.22, -0.02, 0.04, 1.2, 0, 0); }, 'radiator', 0, -0.02, -0.385); proxy('radiator', 0.74, 0.14, 0.12, bay, 0, -0.04, -0.385);
  const leak = comp('leak', mesh(new THREE.SphereGeometry(0.06, 12, 8), 0x0c0a08, bay, -0.13, -0.05, 0.37)); leak.scale.set(1.8, 0.25, 1.2); leak.visible = false;
  // Klappe oben (öffnet nach oben), Rand trägt sie über den Bauteilen
  const hatches = {}; const defHatch = (id, group, openRot, axis) => { hatches[id] = { group, openRot, axis, t: 0, target: 0 }; };
  for (const s of [1, -1]) box(0.04, 0.2, 0.72, 0x1c1d20, 0.48 * s, 1.1, -3.1, root); box(0.96, 0.03, 0.04, 0x1c1d20, 0, 1.19, -2.74, root);
  { const g = new THREE.Group(); g.position.set(0, 1.21, -3.46); root.add(g); const lid = box(0.96, 0.05, 0.72, 0x7a2a1c, 0, 0, 0.36, g); reg(lid, 'h:engine'); box(0.2, 0.02, 0.02, STEEL, 0, 0.03, 0.7, g);
    { const dc = canvasTex(256, 64); dc.ctx.fillStyle = '#7a2a1c'; dc.ctx.fillRect(0, 0, 256, 64); dc.ctx.fillStyle = '#fff3d1'; dc.ctx.font = 'bold 30px Segoe UI, Arial'; dc.ctx.textAlign = 'center'; dc.ctx.textBaseline = 'middle'; dc.ctx.fillText('BRUNO V6 TURBO', 128, 34); dc.ctx.strokeStyle = '#e8821e'; dc.ctx.lineWidth = 4; dc.ctx.strokeRect(4, 4, 248, 56); dc.tex.needsUpdate = true; const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshBasicMaterial({ map: dc.tex })); dm.rotation.x = -Math.PI / 2; dm.position.set(0, 0.028, 0.36); dm.layers.set(LAYER); g.add(dm); }
    defHatch('engine', g, -1.45, 'x'); }

  // ---------------- Bodenklappen: Bremsen, Fahrwerk, darunter eine echte Grube ----------------
  const floorHatch = (id, z, comps) => {
    const g = new THREE.Group(); g.position.set(0.12, 0.43, z); root.add(g); const p = box(0.5, 0.03, 0.5, 0x3a3e45, 0.25, 0.02, 0, g); reg(p, `h:${id}`); box(0.08, 0.02, 0.02, STEEL, 0.25, 0.045, 0.2, g); defHatch(id, g, 3.05, 'z'); // klappt ganz um und liegt offen flach auf dem Boden
    box(0.5, 0.01, 0.5, 0x0b0b0d, 0.37, 0.14, z, root); for (const s of [1, -1]) { box(0.012, 0.26, 0.5, 0x15161a, 0.37 + 0.25 * s, 0.27, z, root); box(0.5, 0.26, 0.012, 0x15161a, 0.37, 0.27, z + 0.25 * s, root); } for (const c of comps) c();
  };
  floorHatch('brakes', -2.3, [() => { fit(root, FIT.brakedisc, 'brakedisc', 0.35, 0.3, -2.3); proxy('brakedisc', 0.44, 0.14, 0.34, root, 0.38, 0.3, -2.3); }]);
  floorHatch('chassis', -1.75, [() => { fit(root, ART.steerkit, 'steerrack', 0.37, 0.28, -1.9, 0.9); proxy('steerrack', 0.44, 0.1, 0.1, root, 0.37, 0.32, -1.9); fit(root, FIT.strut, 'strut', 0.22, 0.28, -1.64, 1.1); proxy('strut', 0.1, 0.14, 0.1, root, 0.22, 0.3, -1.64); fit(root, FIT.gearbox, 'gearbox', 0.45, 0.3, -1.64, 0.8); proxy('gearbox', 0.22, 0.09, 0.14, root, 0.45, 0.3, -1.64); }]);
  // Wandklappen: Radkästen links/rechts stehen als Kasten in den Raum, der Sicherungskasten sitzt flach an der Wand. Die Klappe hängt oben und schwenkt hoch, dahinter liegt alles frei
  const wallHatch = (id, side, y, z, w, h, xh, comps) => {
    const g = new THREE.Group(); g.position.set(xh * side, y + h / 2, z); root.add(g); const p = box(0.025, h, w, 0x40454c, 0, -h / 2, 0, g); reg(p, `h:${id}`); box(0.03, 0.03, 0.1, STEEL, side * -0.02, -h + 0.06, 0, g); defHatch(id, g, side > 0 ? -1.25 : 1.25, 'zw');
    const dep = 0.87 - xh; const cx = (xh + dep / 2) * side; const fr = 0x34373c; for (const sy of [1, -1]) box(dep, 0.02, w + 0.04, fr, cx, y + sy * (h / 2 + 0.01), z, root); for (const sz of [1, -1]) box(dep, h + 0.04, 0.02, fr, cx, y, z + sz * (w / 2 + 0.01), root); box(0.01, h, w, 0x0e0f11, 0.868 * side, y, z, root); for (const c of comps) c();
  };
  const wheelBay = (id, side) => { const z = -3.12; const y = 0.74; const x = 0.745 * side; wallHatch('wheel' + id, side, y, z, 0.5, 0.46, 0.64, [() => { fit(root, (mk) => { mk(new THREE.TorusGeometry(0.15, 0.056, 12, 36), 0x121214, 0, 0, 0, 0, 1.5708, 0); mk(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 30), 0x8a8e94, 0, 0, 0, 0, 0, 1.5708); mk(new THREE.CylinderGeometry(0.038, 0.038, 0.08, 16), 0x26282c, 0, 0, 0, 0, 0, 1.5708); for (let i = 0; i < 5; i++) { const a = i * 1.2566; mk(new THREE.CylinderGeometry(0.014, 0.014, 0.09, 6), 0xc8ccd2, 0, Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0, 0, 1.5708); } }, 'wheelnuts' + id, x, y, z); proxy('wheelnuts' + id, 0.14, 0.38, 0.38, root, x, y, z); }]); };
  wheelBay('L', 1); wheelBay('R', -1);
  wallHatch('fuse', 1, 1.3, -1.52, 0.46, 0.36, 0.79, [() => { fit(root, (mk) => { const G = (w, h, d) => new THREE.BoxGeometry(w, h, d); mk(G(0.02, 0.32, 0.42), 0x22242a, 0.03, 0, 0); const cols = [0xe34b3a, 0xf2c14e, 0x4aa3df, 0x66bb6a, 0xf2c14e, 0xe34b3a]; for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) { mk(G(0.024, 0.05, 0.034), cols[(i + r * 2) % 6], 0.012, 0.09 - r * 0.075, -0.15 + i * 0.06); mk(G(0.026, 0.012, 0.02), 0xf4f1e6, 0.002, 0.103 - r * 0.075, -0.15 + i * 0.06); } for (let i = 0; i < 4; i++) mk(G(0.03, 0.06, 0.05), 0x141517, 0.008, -0.1, -0.135 + i * 0.09); }, 'fuses', 0.835, 1.3, -1.52); proxy('fuses', 0.05, 0.3, 0.4, root, 0.83, 1.3, -1.52); }]);
  { const sg = canvasTex(256, 40); const x = sg.ctx; x.fillStyle = '#10161a'; x.fillRect(0, 0, 256, 40); x.fillStyle = '#ffcf7a'; x.font = 'bold 24px Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SICHERUNGEN', 128, 21); sg.tex.needsUpdate = true; const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.047), new THREE.MeshBasicMaterial({ map: sg.tex })); sp.position.set(-0.016, -0.12, 0); sp.rotation.y = -Math.PI / 2; sp.layers.set(LAYER); hatches.fuse.group.add(sp); }

  // ---------------- WLAN-Router an der Decke (stört nur das Tablet des Navigators) ----------------
  const routerG = new THREE.Group(); routerG.position.set(-0.6, 1.7, -1.9); root.add(routerG);
  box(0.06, 0.04, 0.06, 0x2d3036, 0, 0.04, 0, routerG);
  comp('router', box(0.3, 0.05, 0.2, 0xe8e8e2, 0, 0, 0, routerG)); box(0.31, 0.012, 0.21, 0x2d3036, 0, -0.03, 0, routerG);
  for (const sx of [-1, 1]) { const ant = comp('routerant', cyl(0.011, 0.2, 0x15161a, routerG, sx * 0.12, -0.12, 0.05)); ant.rotation.z = sx * 0.28; comp('routerant', cyl(0.018, 0.02, 0x666b72, routerG, sx * 0.105, -0.03, 0.05)); }
  const routerLeds = [0, 1, 2].map((i) => { const l = box(0.018, 0.008, 0.012, 0x1aff5a, -0.06 + i * 0.04, -0.028, -0.1, routerG); l.material.emissive.set(0x1aff5a); return l; });
  const routerSign = canvasTex(128, 32); { const x = routerSign.ctx; x.fillStyle = '#1b1d20'; x.fillRect(0, 0, 128, 32); x.fillStyle = '#7fd4ff'; x.font = 'bold 22px Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('WLAN', 64, 17); routerSign.tex.needsUpdate = true; const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.035), new THREE.MeshBasicMaterial({ map: routerSign.tex })); sp.rotation.x = Math.PI / 2; sp.position.set(0, -0.037, 0.0); sp.layers.set(LAYER); routerG.add(sp); }

  // ---------------- Linke Wand: Arbeitsbank über die ganze Länge, darauf Flüssigkeitskiste, Teile-Ablage, Werkzeugkiste, Werkzeug-Ablage ----------------
  const BX = -0.66; const BZ = -2.18; box(0.34, 0.04, 1.14, 0x5b4a36, BX, 0.84, BZ, root); for (const [x, z] of [[BX - 0.14, -2.72], [BX + 0.14, -2.72], [BX - 0.14, -1.64], [BX + 0.14, -1.64]]) box(0.04, 0.44, 0.04, 0x2f2f33, x, 0.62, z, root);
  const benchHit = box(0.36, 0.06, 1.16, 0x5b4a36, BX, 0.845, BZ, root); reg(benchHit, 'bench'); benchHit.visible = false; benchHit.material.visible = false; benchHit.userData.invisiblePick = true;
  const TBZ = -2.0; const tb = box(0.3, 0.1, 0.4, 0xc43b2b, BX, 0.91, TBZ, root); box(0.3, 0.02, 0.4, 0x8f2a1e, BX, 0.97, TBZ, root); reg(tb, 'toolbox'); box(0.04, 0.02, 0.1, STEEL, BX + 0.15, 0.98, TBZ, root);
  const lip = box(0.02, 0.05, 0.4, 0xc43b2b, BX + 0.15, 0.95, TBZ, root); reg(lip, 'toolbox');

  // Werkzeuge: jedes Werkzeug ist eine kleine Gruppe, deren Teile klickbar sind
  const toolShape = (id, parent, regIt) => {
    const R = (m) => (regIt ? reg(m, `t:${id}`) : m); const g = new THREE.Group(); parent.add(g); const G = (geo, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = R(mesh(geo, c, g, x, y, z)); m.rotation.set(rx, ry, rz); return m; }; const B = (w, h, d) => new THREE.BoxGeometry(w, h, d); const C = (r0, r1, h, s = 14) => new THREE.CylinderGeometry(r0, r1, h, s); const T = (r, t) => new THREE.TorusGeometry(r, t, 8, 20);
    if (id === 'wrench') { G(B(0.17, 0.016, 0.009), 0x83878c); G(T(0.022, 0.008), 0x83878c, -0.098); G(B(0.03, 0.012, 0.009), 0x83878c, 0.09, 0.016, 0, 0, 0, 0.3); G(B(0.03, 0.012, 0.009), 0x83878c, 0.09, -0.016, 0, 0, 0, -0.3); }
    else if (id === 'screwdriver') { G(C(0.014, 0.018, 0.08), 0xe8821e, -0.06, 0, 0, 0, 0, 1.5708); G(C(0.004, 0.004, 0.12), 0xb8bcc2, 0.04, 0, 0, 0, 0, 1.5708); G(B(0.012, 0.002, 0.008), 0xb8bcc2, 0.104); }
    else if (id === 'tireiron') { G(C(0.009, 0.009, 0.3), 0x2b2d33, 0, 0, 0, 0, 0, 1.5708); G(C(0.009, 0.009, 0.3), 0x2b2d33, 0, 0, 0, 1.5708); G(C(0.018, 0.016, 0.03), 0x83878c, 0.15, 0, 0, 0, 0, 1.5708); G(C(0.016, 0.014, 0.03), 0x83878c, 0, 0, 0.15, 1.5708); }
    else if (id === 'jack') { G(B(0.2, 0.014, 0.07), 0xc0301f, 0, -0.03); for (const s of [1, -1]) { G(B(0.1, 0.012, 0.03), 0xc0301f, s * 0.045, 0.0, 0, 0, 0, s * 0.6); G(B(0.1, 0.012, 0.03), 0xc0301f, s * 0.045, 0.058, 0, 0, 0, -s * 0.6); } G(C(0.006, 0.006, 0.2), 0x83878c, 0, 0.03, 0, 0, 0, 1.5708); G(B(0.06, 0.01, 0.04), 0x83878c, 0, 0.09); }
    else if (id === 'pliers') { G(B(0.09, 0.012, 0.01), 0x2a5ea8, -0.05, 0.012, 0, 0, 0, 0.16); G(B(0.09, 0.012, 0.01), 0x2a5ea8, -0.05, -0.012, 0, 0, 0, -0.16); G(C(0.012, 0.012, 0.012), 0x83878c, 0, 0, 0, 1.5708); G(B(0.06, 0.009, 0.009), 0x83878c, 0.04, 0.004, 0); G(B(0.06, 0.009, 0.009), 0x83878c, 0.04, -0.004, 0); }
    else if (id === 'multimeter') { G(B(0.08, 0.15, 0.03), 0xf2c14e, 0, 0.03); G(B(0.055, 0.04, 0.006), 0x13202a, 0, 0.07, 0.016); G(C(0.018, 0.018, 0.012, 16), 0x202226, 0, 0.015, 0.017, 1.5708); for (const s of [1, -1]) G(C(0.004, 0.004, 0.012), s > 0 ? 0xc23a22 : 0x101012, s * 0.02, -0.03, 0.017, 1.5708); }
    else if (id === 'brush') { G(C(0.012, 0.012, 0.13), 0x8a5a2b, -0.03, 0, 0, 0, 0, 1.5708); G(B(0.06, 0.034, 0.034), 0x4a3a2a, 0.06); G(B(0.05, 0.05, 0.05), 0xe4d9b8, 0.11); }
    return g;
  };
  const tools = {}; for (const id of Object.keys(TOOLS)) { const g = toolShape(id, root, true); tools[id] = g; }
  // Ersatzteile und Flüssigkeiten: dieselben Modelle wie im Motorraum
  const partShape = (id, parent, regIt) => { const g = new THREE.Group(); parent.add(g); ART[id]((geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const m = mesh(geo, color, g, x, y, z); m.rotation.set(rx, ry, rz); if (regIt) reg(m, `p:${id}`); return m; }); return g; };
  // Flüssigkeiten stehen fest verankert in einer Kiste (rutschen nie); Ersatzteile erscheinen nur bei Bedarf auf der Teile-Ablage
  const crate = new THREE.Group(); crate.position.set(BX, 0.86, -2.6); root.add(crate);
  box(0.3, 0.02, 0.26, 0x6b4a2a, 0, 0.01, 0, crate); for (const sz of [1, -1]) box(0.3, 0.11, 0.015, 0x7a5632, 0, 0.065, 0.1225 * sz, crate); for (const sx of [1, -1]) box(0.015, 0.11, 0.26, 0x7a5632, 0.1425 * sx, 0.065, 0, crate);
  for (const sx of [-0.0475, 0.0475]) box(0.012, 0.08, 0.23, 0x5e4026, sx, 0.06, 0, crate);
  { const sg = canvasTex(256, 40); const x = sg.ctx; x.fillStyle = '#2d1f12'; x.fillRect(0, 0, 256, 40); x.fillStyle = '#ffcf7a'; x.font = 'bold 26px Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('FLÜSSIGKEITEN', 128, 21); sg.tex.needsUpdate = true; const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.031), new THREE.MeshBasicMaterial({ map: sg.tex })); sp.position.set(0.1505, 0.07, 0); sp.rotation.y = Math.PI / 2; sp.layers.set(LAYER); crate.add(sp); }
  const parts = {}; ['oil', 'coolant', 'sealant'].forEach((id, i) => { const g = partShape(id, crate, true); g.position.set(0, 0.02, -0.08 + i * 0.08); g.rotation.y = Math.PI / 2; g.scale.setScalar(0.72); parts[id] = g; });
  // Teile-Ablage (Kante aus Warnstreifen): hier erscheint das gerade benötigte Ersatzteil
  const pad = new THREE.Group(); pad.position.set(BX, 0.86, -2.32); root.add(pad);
  box(0.3, 0.01, 0.22, 0x2d3036, 0, 0.005, 0, pad); for (const sz of [1, -1]) box(0.3, 0.02, 0.012, ORANGE, 0, 0.012, 0.11 * sz, pad); for (const sx of [1, -1]) box(0.012, 0.02, 0.22, ORANGE, 0.144 * sx, 0.012, 0, pad);
  const benchPad = box(0.26, 0.004, 0.18, 0x4a3414, 0, 0.0115, 0, pad); benchPad.material.emissive.set(0x4a3414);
  // Nitro-Regal unten an der rechten Wand, Bestandstafel über der Bank
  const nitroBottles = []; for (let i = 0; i < 3; i++) { const g = partShape('nitro', root, true); g.position.set(0.78, 0.44, -1.44 - i * 0.14); nitroBottles.push(g); }
  box(0.2, 0.04, 0.5, 0x30343a, 0.78, 0.42, -1.58, root); box(0.04, 0.5, 0.5, 0x30343a, 0.86, 0.66, -1.58, root);
  const board = canvasTex(256, 384); { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.63), new THREE.MeshBasicMaterial({ map: board.tex })); p.position.set(-0.866, 1.38, -2.3); p.rotation.y = Math.PI / 2; p.layers.set(LAYER); root.add(p); }

  // ---------------- Rechte Seite: Diagnosedisplay, darunter das Nitro-Pult ----------------
  const diag = canvasTex(640, 480);
  box(0.06, 0.66, 0.9, 0x15171a, 0.86, 1.38, -2.38, root);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.63), new THREE.MeshBasicMaterial({ map: diag.tex })); screen.position.set(0.828, 1.38, -2.38); screen.rotation.y = -Math.PI / 2; screen.layers.set(LAYER); root.add(screen); reg(screen, 'display');
  box(0.12, 0.34, 1.0, 0x24272c, 0.84, 0.78, -2.38, root); // Nitro-Pult
  const armG = new THREE.Group(); armG.position.set(0.77, 0.74, -2.72); root.add(armG); const armLever = box(0.03, 0.15, 0.03, 0xcfd3d8, 0, 0.075, 0, armG); reg(armLever, 'b:arm'); const armKnob = mesh(new THREE.SphereGeometry(0.03, 12, 10), 0xd03a2a, armG, 0, 0.16, 0); reg(armKnob, 'b:arm'); box(0.05, 0.02, 0.1, 0x111114, 0, -0.01, 0, armG);
  const fire = reg(cyl(0.045, 0.04, 0xd03a2a, root, 0.77, 0.86, -2.28, 20), 'b:fire'); fire.rotation.z = Math.PI / 2;
  const confirmBtn = reg(cyl(0.04, 0.04, 0x2fa84f, root, 0.77, 0.86, -2.04, 20), 'b:confirm'); confirmBtn.rotation.z = Math.PI / 2;
  const gauge = canvasTex(128, 128); { const g = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), new THREE.MeshBasicMaterial({ map: gauge.tex })); g.position.set(0.776, 0.86, -2.5); g.rotation.y = -Math.PI / 2; g.layers.set(LAYER); root.add(g); }
  const port = reg(cyl(0.03, 0.12, 0x4aa3df, root, 0.74, 0.72, -1.84, 14), 'nitroport'); port.rotation.z = Math.PI / 2; box(0.1, 0.05, 0.05, 0x111114, 0.81, 0.72, -1.84, root);
  const confirmLabel = canvasTex(128, 32); { confirmLabel.ctx.fillStyle = '#10161a'; confirmLabel.ctx.fillRect(0, 0, 128, 32); confirmLabel.ctx.fillStyle = '#7dffa0'; confirmLabel.ctx.font = 'bold 20px Segoe UI, Arial'; confirmLabel.ctx.textAlign = 'center'; confirmLabel.ctx.fillText('BESTÄTIGEN', 64, 23); confirmLabel.tex.needsUpdate = true; const l = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.035), new THREE.MeshBasicMaterial({ map: confirmLabel.tex })); l.position.set(0.776, 0.79, -2.04); l.rotation.y = -Math.PI / 2; l.layers.set(LAYER); root.add(l); }
  const fireLabel = canvasTex(128, 32); { fireLabel.ctx.fillStyle = '#10161a'; fireLabel.ctx.fillRect(0, 0, 128, 32); fireLabel.ctx.fillStyle = '#ff9a2a'; fireLabel.ctx.font = 'bold 20px Segoe UI, Arial'; fireLabel.ctx.textAlign = 'center'; fireLabel.ctx.fillText('NITRO ZÜNDEN', 64, 23); fireLabel.tex.needsUpdate = true; const l = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.035), new THREE.MeshBasicMaterial({ map: fireLabel.tex })); l.position.set(0.776, 0.79, -2.28); l.rotation.y = -Math.PI / 2; l.layers.set(LAYER); root.add(l); }

  // ---------------- Warnbildschirm an der Decke (fährt an einem Arm herunter) ----------------
  const warn = canvasTex(512, 300); const warnG = new THREE.Group(); warnG.position.set(0, 2.3, -2.55); warnG.scale.setScalar(0.62); root.add(warnG);
  box(0.08, 0.7, 0.08, 0x2d3036, 0, 0.6, 0, warnG); box(0.98, 0.58, 0.07, 0x15171a, 0, 0, 0, warnG);
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.52), new THREE.MeshBasicMaterial({ map: warn.tex })); p.position.set(0, 0, 0.037 * s); p.rotation.y = s > 0 ? 0 : Math.PI; p.layers.set(LAYER); warnG.add(p); }
  let warnAmt = 0; let warnTarget = 0; let warnHold = 0;

  // ---------------- lose Gegenstände (sichtbar rutschend) ----------------
  const looseMeshes = {}; const mkLoose = (id, color, w, h, d) => { const m = box(w, h, d, color, 0, 0, 0, root); looseMeshes[id] = m; return m; };
  mkLoose('can1', 0xd0431f, 0.07, 0.1, 0.07); mkLoose('can2', 0x3a67a8, 0.07, 0.12, 0.07); mkLoose('bottle1', 0xe9c43a, 0.08, 0.2, 0.08); mkLoose('bottle2', 0x2aa6a6, 0.08, 0.2, 0.08); mkLoose('bottle3', 0xcfd3d8, 0.07, 0.18, 0.07);

  // Startzustand der Gegenstände für props.js
  const propList = [];
  for (const id of Object.keys(TOOLS)) propList.push({ id: `t:${id}`, x: -0.66, z: TOOL_HOME[id], surface: 'bench', y: 0.99, secured: true, home: { surface: 'bench', x: -0.66, z: TOOL_HOME[id], y: 0.99 } });
  propList.push({ id: 'can1', x: -0.3, z: -1.45, surface: 'floor', secured: false, home: { surface: 'floor', x: -0.3, z: -1.45 } }, { id: 'can2', x: -0.2, z: -1.65, surface: 'floor', secured: false, home: { surface: 'floor', x: -0.2, z: -1.65 } });
  propList.push({ id: 'bottle1', x: -0.1, z: -1.5, surface: 'floor', secured: false, home: { surface: 'floor', x: -0.1, z: -1.5 } }, { id: 'bottle2', x: 0.0, z: -1.42, surface: 'floor', secured: false, home: { surface: 'floor', x: 0.0, z: -1.42 } }, { id: 'bottle3', x: -0.25, z: -1.55, surface: 'floor', secured: false, home: { surface: 'floor', x: -0.25, z: -1.55 } });

  // ---------------- Hand-Gegenstand (wird neben der Kamera gezeigt) ----------------
  const heldRoot = new THREE.Group(); heldRoot.name = 'held'; heldRoot.layers.set(LAYER); let heldKey = '';
  function setHeld(hand) {
    const key = hand ? `${hand.kind}:${hand.id}` : ''; if (key === heldKey) return; heldKey = key; while (heldRoot.children.length) heldRoot.remove(heldRoot.children[0]);
    if (!hand) return; const g = hand.kind === 'tool' ? toolShape(hand.id, heldRoot, false) : partShape(hand.id, heldRoot, false);
    g.traverse((o) => o.layers.set(LAYER)); if (hand.kind === 'part') g.scale.setScalar(0.9);
  }

  // ---------------- Schilder (Beschriftung des anvisierten/leuchtenden Ziels, Bauteile bei offener Klappe) ----------------
  const labels = {}; const lblPos = new THREE.Vector3();
  function makeLabel(text) {
    const c = canvasTex(384, 72); const x = c.ctx; let fs = 34; x.font = `bold ${fs}px Segoe UI, Arial`; while (x.measureText(text).width > 350 && fs > 14) { fs -= 2; x.font = `bold ${fs}px Segoe UI, Arial`; }
    x.fillStyle = 'rgba(10,16,12,0.92)'; x.beginPath(); x.roundRect(3, 3, 378, 66, 14); x.fill(); x.strokeStyle = '#e8821e'; x.lineWidth = 4; x.stroke(); x.fillStyle = '#fff3d1'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 192, 38); c.tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: c.tex, depthTest: false, transparent: true }); if (H.spriteBlend) H.spriteBlend(mat); const sp = new THREE.Sprite(mat); sp.scale.set(0.4, 0.075, 1); sp.renderOrder = 30; sp.layers.set(LAYER); root.add(sp); return sp;
  }
  // Tafel an der linken Wand: oben ploppt das gerade benötigte Werkzeug/Teil auf (z. B. Benzinpumpe), darunter die Werkzeugliste mit Symbolen
  const need = canvasTex(256, 672); let needKey = ''; let needT = 99; let needBlink = -1; let needHeld = 0; const needPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.1), new THREE.MeshBasicMaterial({ map: need.tex })); needPanel.position.set(-0.866, 1.15, -1.5); needPanel.rotation.y = Math.PI / 2; needPanel.layers.set(LAYER); root.add(needPanel);
  const easeOutBack = (t) => { const c1 = 1.9; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function drawNeedBoard(info, t, blink) {
    const x = need.ctx; x.clearRect(0, 0, 256, 672); x.fillStyle = '#10161a'; x.fillRect(0, 0, 256, 672);
    // oberer Teil: BENÖTIGT
    x.fillStyle = '#e8821e'; x.font = 'bold 20px Segoe UI, Arial'; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('BENÖTIGT', 14, 28);
    if (!info) { x.fillStyle = '#4b5a50'; x.font = '18px Segoe UI, Arial'; x.textAlign = 'center'; x.fillText('gerade nichts', 128, 100); x.textAlign = 'left'; }
    else {
      const k = Math.min(1, t / 0.5); const sc = k >= 1 ? 1 : Math.max(0.01, easeOutBack(k)); x.save(); x.translate(128, 98); x.scale(sc, sc);
      x.fillStyle = info.held ? 'rgba(47,168,79,0.28)' : blink ? 'rgba(232,130,30,0.34)' : 'rgba(232,130,30,0.18)'; x.beginPath(); x.roundRect(-116, -62, 232, 124, 14); x.fill(); x.strokeStyle = info.held ? '#4fd070' : '#ffb24a'; x.lineWidth = blink ? 5 : 3; x.stroke();
      if (info.kind === 'tool' || info.kind === 'part') drawIcon(x, info.kind, info.id, -62, -2, 84); else { x.fillStyle = '#ffb24a'; x.font = 'bold 54px Segoe UI, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(info.id === 'confirm' ? '✔' : '▣', -62, -2); }
      x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillStyle = '#fff3d1'; let fs = 24; x.font = `bold ${fs}px Segoe UI, Arial`; while (x.measureText(info.name).width > 118 && fs > 13) { fs -= 1; x.font = `bold ${fs}px Segoe UI, Arial`; } x.fillText(info.name, -6, -14);
      x.fillStyle = info.held ? '#9bf0b0' : '#ffd9a8'; x.font = '13px Segoe UI, Arial'; const lines = []; let ln = ''; for (const wd of String(info.held ? 'in der Hand – jetzt am Bauteil halten' : info.why || '').split(' ')) { const tt2 = ln ? ln + ' ' + wd : wd; if (x.measureText(tt2).width > 118 && ln) { lines.push(ln); ln = wd; } else ln = tt2; } lines.push(ln); lines.slice(0, 4).forEach((l, i) => x.fillText(l, -6, 6 + i * 15));
      x.restore();
    }
    if (info && (info.kind === 'tool' || info.kind === 'part') && (!info.held || info.stock <= 0)) { x.fillStyle = blink ? '#ffd9a8' : '#e8821e'; x.font = 'bold 15px Segoe UI, Arial'; x.textAlign = 'center'; x.fillText(info.kind === 'tool' ? '◀ AUF DER BANK' : info.stock <= 0 ? '✖ NICHT MEHR DA' : ['oil', 'coolant', 'sealant'].includes(info.id) ? '→ in der FLÜSSIGKEITSKISTE' : info.id === 'nitro' ? '→ Nitro-Regal rechts' : '→ auf der ARBEITSPLATTE', 128, 304); x.textAlign = 'left'; }
    // unterer Teil: Werkzeugliste, das benötigte Werkzeug leuchtet
    x.fillStyle = '#e8821e'; x.font = 'bold 20px Segoe UI, Arial'; x.textAlign = 'left'; x.fillText('WERKZEUG', 14, 332);
    Object.keys(TOOLS).forEach((id, i) => { const y = 368 + i * 45; const isNeed = info && info.kind === 'tool' && info.id === id; if (isNeed) { x.fillStyle = blink ? 'rgba(232,130,30,0.5)' : 'rgba(232,130,30,0.3)'; x.fillRect(4, y - 21, 248, 42); } drawIcon(x, 'tool', id, 34, y, 30); x.fillStyle = isNeed ? '#fff3d1' : '#dfe6d8'; x.font = `${isNeed ? 'bold ' : ''}19px Segoe UI, Arial`; x.textAlign = 'left'; x.fillText(TOOLS[id], 70, y + 6); });
    need.tex.needsUpdate = true;
  }
  drawNeedBoard(null, 99, false);

  // ---------------- Entnahme-Ablage an der linken Tafel: das gerade benötigte Teil steht echt zum Greifen bereit ----------------
  const disp = new THREE.Group(); disp.position.set(BX, 0.875, -1.72); root.add(disp);
  box(0.22, 0.025, 0.14, 0x2d3036, 0, 0, 0, disp); box(0.232, 0.012, 0.15, ORANGE, 0, -0.016, 0, disp);
  const dispPad = box(0.18, 0.006, 0.11, 0x4a3414, 0, 0.0155, 0, disp); dispPad.material.emissive.set(0x4a3414);
  const dispItems = {}; let dispKey = ''; let dispT = 99;
  const SPARE = Object.keys(PART_NAMES).filter((id) => !['oil', 'coolant', 'sealant', 'nitro'].includes(id));
  const addDisp = (key, make, parent = disp, y0 = 0.0185) => {
    const tmp = new THREE.Group(); const g = make(tmp); tmp.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g); const c = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3());
    g.position.set(-c.x, -bb.min.y, -c.z); const k = Math.min(2.4, Math.max(0.3, 0.17 / Math.max(sz.x, sz.y, sz.z, 0.01))); tmp.position.set(0, y0, 0); tmp.userData.y0 = y0; tmp.userData.k = k; tmp.userData.base = key.startsWith('t:') ? Math.PI / 2 : 0.5;
    tmp.visible = false; tmp.traverse((o) => { if (o.isMesh) o.visible = false; }); parent.add(tmp); dispItems[key] = tmp;
  };
  for (const id of Object.keys(TOOLS)) addDisp('t:' + id, (p) => toolShape(id, p, true)); for (const id of SPARE) addDisp('p:' + id, (p) => partShape(id, p, true), pad, 0.0135);
  const showDisp = (tmp, on) => { tmp.visible = on; tmp.traverse((o) => { if (o.isMesh) o.visible = on; }); };

  // ---------------- pro Frame ----------------
  const id0 = (it) => it.id.startsWith('t:');
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const compMap = { leak: ['oil_leak', 'coolant_leak'], turbo: ['turbo'], airfilter: ['air_filter'], fuelpump: ['fuel_pump'], mounts: ['engine_mount', 'engine_damage'], radiator: ['radiator', 'overheat'], brakedisc: ['brake_fail', 'brake_fade'], steerrack: ['steering'], gearbox: ['gearbox'], fuses: ['electrics', 'battery'], oilcap: ['oil_leak'], coolcap: ['coolant_leak', 'overheat'], router: ['router'], routerant: ['router'] };
  let tt = 0; let lastStock = '';
  function update(dt, st) {
    // st: { hatches, props (items), stock, v (Fahrzeug), E (Ingenieur), highlight (Set), warn (Anzeigeobjekt|null), nitroBottles }
    tt += dt;
    for (const [id, h] of Object.entries(hatches)) { h.target = st.hatches[id] ? 1 : 0; h.t += clamp(h.target - h.t, -dt * 2.6, dt * 2.6); const a = h.openRot * (h.t * h.t * (3 - 2 * h.t)); if (h.axis === 'x') h.group.rotation.x = a; else if (h.axis === 'z') h.group.rotation.z = a; else h.group.rotation.z = a; }
    // Gegenstände: Position aus der Physik, Werkzeuge in der Hand ausblenden
    const seen = new Set();
    for (const it of st.props) {
      seen.add(it.id); let g = it.id.startsWith('t:') ? tools[it.id.slice(2)] : looseMeshes[it.id]; if (!g) continue; g.visible = true;
      g.position.set(it.x, it.y + (it.dy || 0) + (it.id.startsWith('t:') ? 0.012 : (looseMeshes[it.id] ? looseMeshes[it.id].geometry.parameters.height / 2 : 0)), it.z); if (id0(it)) g.rotation.set(Math.PI / 2, 0, it.secured ? Math.PI / 2 : 0.3 + (it.idx || 0) * 0.5);
    }
    for (const id of Object.keys(tools)) if (!seen.has(`t:${id}`)) tools[id].visible = false; // gerade in der Hand
    // Bestand: nur vorhandene Teile zeigen, Tafel neu zeichnen wenn sich etwas ändert
    for (const [id, g] of Object.entries(parts)) { const on = (st.stock[id] || 0) > 0; if (g.userData.on !== on) { g.userData.on = on; showDisp(g, on); } }
    nitroBottles.forEach((g, i) => { g.visible = i < (st.stock.nitro || 0); });
    const sk = JSON.stringify(st.stock); if (sk !== lastStock) { lastStock = sk; const c = board.ctx; c.fillStyle = '#10161a'; c.fillRect(0, 0, 256, 384); c.fillStyle = '#e8821e'; c.font = 'bold 22px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText('BESTAND', 14, 30); c.font = '19px Consolas, monospace';
      Object.keys(PART_NAMES).forEach((id, i) => { const n = st.stock[id] || 0; c.fillStyle = n > 0 ? '#dfe6d8' : '#ff6a4a'; c.fillText(`${PART_NAMES[id].slice(0, 14).padEnd(14)} ${String(n).padStart(2)}`, 14, 60 + i * 23.5); }); board.tex.needsUpdate = true; }
    // Schadensanzeige an den Bauteilen (rot) + Leckstelle
    const act = {}; for (const d of st.v.damages) act[d.id] = true;
    leak.visible = !!(act.oil_leak || act.coolant_leak);
    for (const [cid, ids] of Object.entries(compMap)) { const bad = ids.some((i) => act[i]); for (const m of byId[`c:${cid}`] || []) { if (m.userData.bad !== bad) { m.userData.bad = bad; m.userData.base = bad ? 0x5a1408 : m.userData.base0; } } }
    for (const id of ['wheelnutsL', 'wheelnutsR']) { const bad = st.v.damages.some((d) => d.id === 'tire' && (id === 'wheelnutsL') === (d.wheel % 2 === 0)); for (const m of byId[`c:${id}`] || []) { m.userData.base = bad ? 0x5a1408 : m.userData.base0; m.userData.bad = bad; } }
    // Leuchten: Ziel des aktuellen Schritts pulsiert (eingebaute Modelle leuchten mit ihrer Hitbox)
    const pulse = 0.5 + 0.5 * Math.sin(tt * 6);
    for (const [cid, list] of Object.entries(artMeshes)) { const hl = st.highlight && st.highlight.has(`c:${cid}`); const bad = (byId[`c:${cid}`] || [])[0] && byId[`c:${cid}`][0].userData.bad; for (const m of list) { if (!m.material.emissive) continue; if (hl) m.material.emissive.setRGB(0.5 * pulse + 0.12, 0.42 * pulse + 0.1, 0.05); else m.material.emissive.setHex(bad ? 0x5a1408 : 0); } }
    for (const m of pickables) { if (!m.material.emissive) continue; const hl = st.highlight && st.highlight.has(m.userData.id); const base = m.userData.base || 0; if (hl) m.material.emissive.setRGB(0.5 * pulse + 0.12, 0.42 * pulse + 0.1, 0.05); else m.material.emissive.setHex(base); }
    // Entnahme-Ablage: benötigtes Werkzeug/Teil als echtes, greifbares Modell (verschwindet, sobald es in der Hand ist)
    { const nd = st.need; const key = nd && !nd.held && (nd.kind === 'tool' || (nd.kind === 'part' && SPARE.includes(nd.id) && nd.stock > 0)) ? (nd.kind === 'tool' ? 't:' : 'p:') + nd.id : '';
      if (key !== dispKey) { if (dispItems[dispKey]) showDisp(dispItems[dispKey], false); dispKey = key; if (dispItems[key]) showDisp(dispItems[key], true); dispT = 0; }
      dispT += dt; const it = dispItems[key]; const pp = 0.5 + 0.5 * Math.sin(tt * 5);
      if (it) { const k = Math.min(1, dispT / 0.5); const s = k >= 1 ? 1 : Math.max(0.01, easeOutBack(k)); it.scale.setScalar(it.userData.k * s); it.position.y = it.userData.y0 + 0.012 * Math.sin(tt * 3) * k; it.rotation.y = it.userData.base + 0.25 * Math.sin(tt * 1.6); }
      const onTray = key.startsWith('t:'); const onPad = key.startsWith('p:');
      dispPad.material.emissive.setRGB(onTray ? 0.35 + 0.35 * pp : 0.06, onTray ? 0.22 + 0.2 * pp : 0.04, onTray ? 0.04 : 0.01); benchPad.material.emissive.setRGB(onPad ? 0.45 + 0.4 * pp : 0.1, onPad ? 0.28 + 0.22 * pp : 0.06, onPad ? 0.04 : 0.02); }
    // Router-Leuchten: grün = Signal gut, rot blinkend = gestört
    { const bad = st.v.damages.some((q) => q.id === 'router'); routerLeds.forEach((l, i) => { const on = bad ? (Math.floor(tt * (3 + i)) % 2 === 0) : true; l.material.emissive.setHex(bad ? (on ? 0xff2a1a : 0x240805) : 0x1aff5a); }); }
    // Tafel links: neues benötigtes Item ploppt auf
    { const key = st.need ? st.need.kind + ':' + st.need.id : ''; const held = st.need && st.need.held ? 1 : 0; const blink = Math.floor(tt * 3) % 2; if (key !== needKey) { needKey = key; needT = 0; needBlink = -1; } if (held !== needHeld) { needHeld = held; needBlink = -1; } needT += dt; if (needT < 0.7 || blink !== needBlink) { needBlink = blink; drawNeedBoard(st.need || null, needT, !!blink); } }
    // Schilder
    const want = new Set(); if (st.labels) { if (st.hover) want.add(st.hover); if (st.highlight) for (const id of st.highlight) want.add(id); if (st.hatches.engine) for (const id of ['c:oilcap', 'c:coolcap', 'c:fuelpump', 'c:turbo', 'c:airfilter', 'c:mounts', 'c:radiator']) want.add(id); }
    for (const id of want) { const txt = targetLabel(id); if (!txt) continue; const sp = labels[id] || (labels[id] = makeLabel(txt)); if (targetPoint(id, lblPos)) { sp.position.copy(lblPos); sp.position.y += 0.13; sp.visible = true; if (st.eye) { const d = Math.min(3.2, Math.max(0.45, Math.hypot(sp.position.x - st.eye.x, sp.position.y - st.eye.y, sp.position.z - st.eye.z))); sp.scale.set(0.22 * d, 0.042 * d, 1); } const hot = id === st.hover || (st.highlight && st.highlight.has(id)); sp.material.opacity = hot ? 1 : 0.8; } else sp.visible = false; } /* gleichbleibende Größe im Bild */
    for (const [id, sp] of Object.entries(labels)) if (!want.has(id)) sp.visible = false;
    // Nitro-Hebel
    armG.rotation.z = st.v.nitroArmed ? -0.9 : 0.5;
    // Warnbildschirm: fährt herunter, solange eine Meldung läuft
    if (st.warn) { warnTarget = 1; warnHold = st.warn.hold; } else warnTarget = 0;
    warnAmt += clamp(warnTarget - warnAmt, -dt * 1.6, dt * 1.6); warnG.position.y = 2.3 - 0.76 * (warnAmt * warnAmt * (3 - 2 * warnAmt));
  }
  // Raycast: erstes angeklicktes Ziel
  const ray = new THREE.Raycaster(); const v3 = new THREE.Vector3();
  function pick(ndc, camera, maxDist = 2.1) {
    ray.setFromCamera(ndc, camera); ray.layers.enable(LAYER); ray.far = maxDist + 3;
    const hits = ray.intersectObjects(pickables.filter((m) => m.visible || m.userData.invisiblePick), false);
    for (const h of hits) { if (h.object.userData.invisiblePick) { /* Bankfläche zählt */ } return { id: h.object.userData.id, dist: h.distance, point: h.point.clone() }; }
    return null;
  }
  function targetPoint(id, out) { const m = (byId[id] || [])[0]; if (!m) return null; m.updateWorldMatrix(true, false); out.setFromMatrixPosition(m.matrixWorld); root.worldToLocal(out); return out; }
  return { root, pick, update, setHeld, heldRoot, targetPoint, propList, diag, warn, gauge, hatches, ids: () => Object.keys(byId), pickables, eng, bay };
}

// ---------------------------------------------------------------- Display-Zeichnung
const COL = { ok: '#6fdc7a', warn: '#ffb24a', crit: '#ff5a4a' };
export function drawDiag(c, W, H, v, E, now = 0) {
  c.fillStyle = '#0a1210'; c.fillRect(0, 0, W, H); c.fillStyle = '#16251c'; c.fillRect(0, 0, W, 34); c.fillStyle = '#e8821e'; c.font = 'bold 20px Segoe UI, Arial'; c.textBaseline = 'middle'; c.textAlign = 'left'; c.fillText('INGENIEUR · DIAGNOSE', 12, 17);
  const n = nitroStatus(v); c.textAlign = 'right'; c.fillStyle = n.state === 'active' ? '#ff9a2a' : n.state === 'ready' ? (n.call ? '#ffdf5a' : '#6fdc7a') : '#ff8a6a'; c.font = 'bold 15px Segoe UI, Arial'; c.fillText(n.text, W - 10, 17);
  const rows = diagnostics(v); const rowH = 29;
  rows.forEach((r, i) => { const y = 46 + i * rowH; c.textAlign = 'left'; c.fillStyle = '#9fb39a'; c.font = '15px Segoe UI, Arial'; c.fillText(r.name, 12, y + 12); c.fillStyle = '#1d2a22'; c.fillRect(104, y + 3, 120, 15); c.fillStyle = COL[r.level]; c.fillRect(104, y + 3, 120 * Math.max(0.04, Math.min(1, r.value)), 15); c.fillStyle = r.level === 'ok' ? '#dfe6d8' : COL[r.level]; c.font = '13px Consolas, monospace'; c.fillText(r.text, 230, y + 12); });
  // Nitro-Anzeige
  const ny = 46 + rows.length * rowH + 6; c.fillStyle = '#9fb39a'; c.font = '15px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText('Nitro', 12, ny + 12);
  for (let i = 0; i < NITRO_MAX; i++) { c.fillStyle = i < NITRO_MAX - v.nitro.uses ? '#4aa3df' : '#26323a'; c.beginPath(); c.arc(124 + i * 26, ny + 11, 9, 0, 7); c.fill(); }
  c.fillStyle = '#dfe6d8'; c.font = '13px Consolas, monospace'; c.fillText(`Flaschen im Regal: ${v.infNitro ? 'unendlich' : v.parts.nitro || 0}`, 230, ny + 12);
  // rechte Hälfte: Schäden + Reparaturstatus
  const x0 = 432; c.fillStyle = '#16251c'; c.fillRect(x0 - 10, 40, W - x0 + 10, H - 40); c.fillStyle = '#e8821e'; c.font = 'bold 16px Segoe UI, Arial'; c.fillText(`AKTIVE SCHÄDEN (${v.damages.length})`, x0, 54);
  const list = sortedDamages(v); const focus = E && E.focus;
  if (!list.length) { c.fillStyle = '#6fdc7a'; c.font = 'bold 18px Segoe UI, Arial'; c.fillText('Alles in Ordnung', x0, 90); }
  list.slice(0, 5).forEach((d, i) => { const y = 74 + i * 46; const sel = focus && focus.id === d.id && focus.wheel === d.wheel; const col = d.sev >= 3 ? COL.crit : d.sev === 2 ? COL.warn : '#e6d35a';
    if (sel) { c.fillStyle = 'rgba(232,130,30,0.22)'; c.fillRect(x0 - 6, y - 6, W - x0 - 2, 44); } c.fillStyle = col; c.font = 'bold 15px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText(`${sel ? '▶ ' : ''}${DEFS[d.id].name}${d.id === 'tire' ? ' ' + WHEEL_NAMES[d.wheel] : ''}`, x0, y + 6);
    c.fillStyle = '#9fb39a'; c.font = '12px Segoe UI, Arial'; c.fillText(`${SEV_NAMES[d.sev]} · Klappe: ${d.hatch ? d.hatch : '-'}`, x0, y + 24); c.fillStyle = '#1d2a22'; c.fillRect(x0, y + 30, 160, 5); c.fillStyle = '#4aa3df'; c.fillRect(x0, y + 30, 160 * repairProgress(d), 5);
    const left = damageLeft(v, d); c.textAlign = 'right'; c.font = 'bold 16px Consolas, monospace'; c.fillStyle = left < 10 ? (Math.floor(now * 4) % 2 ? '#ff3b30' : '#ffd0c8') : left < 20 ? '#ffb24a' : '#9fb39a'; c.fillText(`${Math.ceil(left)} s`, W - 10, y + 8); c.textAlign = 'left'; });
  // aktueller Schritt
  const cs = E ? currentStep(E, v) : null; const by = 316; c.fillStyle = '#e8821e'; c.font = 'bold 15px Segoe UI, Arial'; c.fillText('REPARATUR', x0, by);
  if (cs) { cs.d.steps.slice(0, 7).forEach((s, i) => { const done = i < cs.d.step; const cur = i === cs.d.step; c.fillStyle = done ? '#6fdc7a' : cur ? '#fff3d1' : '#6e7d70'; c.font = `${cur ? 'bold ' : ''}12px Segoe UI, Arial`; c.fillText(`${done ? '✔' : cur ? '▶' : '·'} ${(s.label || '').slice(0, 30)}`, x0, by + 20 + i * 17); }); }
  else { c.fillStyle = '#6e7d70'; c.font = '13px Segoe UI, Arial'; c.fillText(list.length ? 'Schaden wählen' : '–', x0, by + 22); }
  c.fillStyle = '#9fb39a'; c.font = '13px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText(`Hand: ${E && E.hand ? (E.hand.kind === 'tool' ? TOOLS[E.hand.id] : PART_NAMES[E.hand.id]) : 'leer'}`, 12, H - 14);
  c.textAlign = 'right'; c.fillStyle = '#fff3d1'; c.fillText(E && E.msg ? E.msg.slice(0, 52) : '', W - 10, H - 14);
}
export function drawWarn(c, W, H, w, now = 0, urgent = null) {
  if (!w) { c.fillStyle = urgent && urgent.left < 20 ? (Math.floor(now * 3) % 2 ? '#2a0a07' : '#150504') : '#0a1210'; c.fillRect(0, 0, W, H); if (urgent && urgent.left < 20) { c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ff5a4a'; c.font = 'bold 26px Segoe UI, Arial'; c.fillText('TOTALSCHADEN IN', W / 2, 90); c.font = 'bold 110px Consolas, monospace'; c.fillText(String(Math.ceil(urgent.left)), W / 2, 175); c.fillStyle = '#fff3d1'; c.font = 'bold 22px Segoe UI, Arial'; c.fillText(DEFS[urgent.d.id].name, W / 2, 255); } return; }
  const crit = w.sev >= 3; const blink = crit ? (Math.floor(now * 3) % 2 === 0) : true; const col = w.fixed ? '#2fa84f' : crit ? '#ff3b30' : w.sev === 2 ? '#ff9a2a' : '#f2d23a';
  c.fillStyle = w.fixed ? '#06210f' : crit ? (blink ? '#3a0906' : '#1a0504') : '#2a1a05'; c.fillRect(0, 0, W, H); c.strokeStyle = col; c.lineWidth = 8; c.strokeRect(6, 6, W - 12, H - 12);
  // Warndreieck
  c.fillStyle = col; c.beginPath(); c.moveTo(70, 40); c.lineTo(125, 140); c.lineTo(15, 140); c.closePath(); c.fill(); c.fillStyle = '#10100a'; c.font = 'bold 66px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(w.fixed ? '✔' : '!', 70, 108);
  c.textAlign = 'left'; c.fillStyle = col; c.font = 'bold 18px Segoe UI, Arial'; c.fillText(w.fixed ? 'BEHOBEN' : `ACHTUNG · ${SEV_NAMES[w.sev] ? SEV_NAMES[w.sev].toUpperCase() : ''}`, 150, 40);
  c.fillStyle = '#fff3d1'; c.font = 'bold 28px Segoe UI, Arial'; const words = String(w.title).split(' '); let line = ''; let y = 78; for (const wd of words) { const t = line ? `${line} ${wd}` : wd; if (c.measureText(t).width > W - 170 && line) { c.fillText(line, 150, y); y += 32; line = wd; } else line = t; } c.fillText(line, 150, y);
  c.fillStyle = '#dfe6d8'; c.font = '19px Segoe UI, Arial'; const txt = String(w.text); let ln = ''; y = 178; for (const wd of txt.split(' ')) { const t = ln ? `${ln} ${wd}` : wd; if (c.measureText(t).width > W - 40 && ln) { c.fillText(ln, 20, y); y += 25; ln = wd; } else ln = t; } c.fillText(ln, 20, y);
  if (urgent && !w.fixed) { const f = Math.max(0, Math.min(1, urgent.left / (urgent.limit || 60))); c.fillStyle = '#1d2a22'; c.fillRect(20, H - 46, W - 40, 12); c.fillStyle = urgent.left < 10 ? '#ff3b30' : urgent.left < 20 ? '#ff9a2a' : '#6fdc7a'; c.fillRect(20, H - 46, (W - 40) * f, 12); c.fillStyle = '#fff3d1'; c.font = 'bold 14px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText(`TOTALSCHADEN in ${Math.ceil(urgent.left)} s: ${DEFS[urgent.d.id].name}`, 22, H - 56); }
  if (w.more) { c.fillStyle = '#ffb24a'; c.font = 'bold 16px Segoe UI, Arial'; c.textAlign = 'right'; c.fillText(`+ ${w.more} weitere Meldung${w.more > 1 ? 'en' : ''}`, W - 16, H - 18); }
}
export function drawNitroGauge(c, W, v) {
  c.fillStyle = '#0a1210'; c.fillRect(0, 0, W, W); const n = v.nitro; const p = n.state === 'refilling' ? 1 - n.t / 10 : n.state === 'active' ? n.t / 4.6 : n.state === 'ready' ? 1 : 0;
  c.strokeStyle = '#26323a'; c.lineWidth = 12; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 14, Math.PI * 0.75, Math.PI * 2.25); c.stroke(); c.strokeStyle = n.state === 'active' ? '#ff9a2a' : '#4aa3df'; c.beginPath(); c.arc(W / 2, W / 2, W / 2 - 14, Math.PI * 0.75, Math.PI * (0.75 + 1.5 * p)); c.stroke();
  c.fillStyle = '#dfe6d8'; c.font = 'bold 22px Consolas, monospace'; c.textAlign = 'center'; c.fillText(`${NITRO_MAX - n.uses}`, W / 2, W / 2 + 8);
}

// ---------------------------------------------------------------- Symbole (Werkzeuge, Teile) für Anleitung und Tafeln
export function drawIcon(c, kind, id, cx, cy, s = 40) {
  c.save(); c.translate(cx, cy); c.scale(s / 40, s / 40); c.lineCap = 'round'; c.lineJoin = 'round';
  const fill = (col) => { c.fillStyle = col; }; const rect = (x, y, w, h, col, r = 3) => { c.fillStyle = col; c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
  if (kind === 'tool') {
    if (id === 'wrench') { c.rotate(-0.6); rect(-4, -4, 8, 34, '#aeb4bc'); c.fillStyle = '#aeb4bc'; c.beginPath(); c.arc(0, -10, 12, 0, 7); c.fill(); c.fillStyle = '#0c1210'; c.fillRect(-4.5, -26, 9, 14); }
    else if (id === 'screwdriver') { c.rotate(-0.6); rect(-6, 0, 12, 26, '#e8821e', 5); rect(-2, -22, 4, 24, '#cfd3d8', 1); }
    else if (id === 'tireiron') { c.rotate(-0.5); rect(-3, -26, 6, 52, '#2f3238'); rect(-3, -26, 18, 6, '#2f3238'); rect(-8, 20, 10, 6, '#2f3238'); }
    else if (id === 'jack') { rect(-18, 12, 36, 8, '#d03a2a'); c.strokeStyle = '#aeb4bc'; c.lineWidth = 5; c.beginPath(); c.moveTo(-14, 12); c.lineTo(0, -8); c.lineTo(14, 12); c.stroke(); rect(-10, -16, 20, 7, '#9aa0a8'); }
    else if (id === 'pliers') { c.strokeStyle = '#3a67a8'; c.lineWidth = 6; c.beginPath(); c.moveTo(-14, 24); c.lineTo(6, -6); c.moveTo(14, 24); c.lineTo(-6, -6); c.stroke(); c.strokeStyle = '#aeb4bc'; c.lineWidth = 5; c.beginPath(); c.moveTo(6, -6); c.lineTo(10, -22); c.moveTo(-6, -6); c.lineTo(-10, -22); c.stroke(); }
    else if (id === 'multimeter') { rect(-14, -24, 28, 48, '#f2c14e', 5); rect(-10, -19, 20, 12, '#13202a', 2); c.fillStyle = '#6fdc7a'; c.font = 'bold 9px Consolas'; c.textAlign = 'center'; c.fillText('12.6', 0, -10); c.fillStyle = '#222'; c.beginPath(); c.arc(0, 8, 8, 0, 7); c.fill(); c.fillStyle = '#d03a2a'; c.fillRect(-1.5, 2, 3, 6); }
    else if (id === 'brush') { c.rotate(-0.5); rect(-3, -6, 6, 32, '#8a5a2b'); rect(-10, -22, 20, 18, '#e4d9b8', 2); c.strokeStyle = '#b9a77c'; c.lineWidth = 1.5; for (let i = -8; i <= 8; i += 4) { c.beginPath(); c.moveTo(i, -22); c.lineTo(i, -6); c.stroke(); } }
  } else {
    if (id === 'oil') { rect(-9, -8, 18, 30, '#e9c43a', 4); rect(-4, -18, 8, 10, '#1d1d1f', 2); fill('#fff'); c.font = 'bold 8px Segoe UI'; c.textAlign = 'center'; c.fillStyle = '#2a2000'; c.fillText('ÖL', 0, 10); }
    else if (id === 'coolant') { rect(-14, -12, 28, 32, '#2aa6a6', 5); rect(-5, -20, 10, 9, '#1d1d1f', 2); }
    else if (id === 'sealant') { rect(-6, -18, 12, 38, '#f2f2ee', 3); rect(-2, -26, 4, 10, '#d03a2a', 1); }
    else if (id === 'fuelpump') { rect(-16, -9, 32, 22, '#6b7077', 4); rect(12, -4, 10, 8, '#1d1d1f', 2); rect(-22, -4, 8, 8, '#1d1d1f', 2); }
    else if (id === 'turbo') { c.fillStyle = '#b8bec6'; c.beginPath(); c.arc(0, 2, 16, 0, 7); c.fill(); c.fillStyle = '#6b7077'; c.beginPath(); c.arc(0, 2, 7, 0, 7); c.fill(); rect(8, -22, 10, 14, '#8a9098', 2); }
    else if (id === 'brakepads') { rect(-17, -12, 34, 11, '#1d1d1f', 2); rect(-17, 2, 34, 11, '#3a3e45', 2); }
    else if (id === 'tire') { c.strokeStyle = '#1a1a1c'; c.lineWidth = 11; c.beginPath(); c.arc(0, 0, 15, 0, 7); c.stroke(); c.strokeStyle = '#8a9098'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.stroke(); }
    else if (id === 'steerkit') { rect(-22, -5, 44, 10, '#6b7077', 3); rect(14, -9, 10, 18, '#d0a31f', 2); }
    else if (id === 'gearkit') { c.fillStyle = '#8a9098'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; const r = i % 2 ? 14 : 19; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#0c1210'; c.beginPath(); c.arc(0, 0, 6, 0, 7); c.fill(); }
    else if (id === 'fuse') { rect(-20, -9, 10, 20, '#e34b3a', 2); rect(-5, -9, 10, 20, '#f2c14e', 2); rect(10, -9, 10, 20, '#4aa3df', 2); }
    else if (id === 'filter') { rect(-17, -13, 34, 26, '#e8e4d4', 3); c.strokeStyle = '#b9b39c'; c.lineWidth = 2; for (let i = -12; i <= 12; i += 6) { c.beginPath(); c.moveTo(i, -13); c.lineTo(i, 13); c.stroke(); } }
    else if (id === 'radiator') { rect(-18, -18, 36, 36, '#3b3f45', 3); c.strokeStyle = '#8a9098'; c.lineWidth = 2; for (let i = -12; i <= 12; i += 6) { c.beginPath(); c.moveTo(-15, i); c.lineTo(15, i); c.stroke(); } }
    else if (id === 'nitro') { rect(-8, -14, 16, 34, '#2a62d9', 7); rect(-3, -22, 6, 9, '#cfd3d8', 2); }
    else if (id === 'battery') { rect(-17, -10, 34, 22, '#2d3036', 3); rect(-12, -15, 8, 6, '#d03a2a', 1); rect(4, -15, 8, 6, '#15161a', 1); c.fillStyle = '#f2c14e'; c.font = 'bold 14px Segoe UI'; c.textAlign = 'center'; c.fillText('+ −', 0, 4); }
    else if (id === 'routerpsu') { rect(-17, -9, 28, 20, '#1d1d1f', 3); rect(11, -4, 9, 8, '#cfd3d8', 1); c.strokeStyle = '#4aa3df'; c.lineWidth = 3; c.beginPath(); c.moveTo(-12, -14); c.quadraticCurveTo(0, -24, 12, -14); c.stroke(); }
  }
  c.restore();
}

// Schema des Autos von oben: betroffene Bereiche leuchten rot/orange
function drawCarSchema(c, x, y, w, h, v, now) {
  const dmg = (id) => v.damages.find((d) => d.id === id); const col = (ids) => { const d = ids.map(dmg).filter(Boolean).sort((a, b) => b.sev - a.sev)[0]; return d ? (d.sev >= 3 ? '#ff4a3a' : d.sev === 2 ? '#ff9a2a' : '#e6d35a') : '#2f6b3f'; };
  const pulse = 0.65 + 0.35 * Math.sin(now * 6);
  c.save(); c.translate(x + w / 2, y); const cw = w * 0.34;
  c.fillStyle = '#16251c'; c.beginPath(); c.roundRect(-cw / 2, 4, cw, h - 8, 14); c.fill(); c.strokeStyle = '#4b5a50'; c.lineWidth = 2; c.stroke();
  const wheel = (i, wx, wy) => { const d = v.damages.find((q) => q.id === 'tire' && q.wheel === i); c.fillStyle = d ? `rgba(255,90,60,${pulse})` : '#262a2e'; c.beginPath(); c.roundRect(wx - 8, wy - 14, 16, 28, 4); c.fill(); c.strokeStyle = '#6b7a70'; c.stroke(); };
  wheel(0, cw / 2 + 12, 40); wheel(1, -cw / 2 - 12, 40); wheel(2, cw / 2 + 12, h - 40); wheel(3, -cw / 2 - 12, h - 40);
  const zone = (ids, zx, zy, zw, zh, label) => { c.fillStyle = col(ids); c.globalAlpha = ids.some(dmg) ? pulse : 0.9; c.beginPath(); c.roundRect(zx, zy, zw, zh, 5); c.fill(); c.globalAlpha = 1; c.fillStyle = '#e8f0e6'; c.font = 'bold 9px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, zx + zw / 2, zy + zh / 2); };
  zone(['steering'], -cw / 2 + 5, 26, cw - 10, 16, 'LENKUNG'); zone(['brake_fail', 'brake_fade'], -cw / 2 + 5, 50, cw - 10, 14, 'BREMSEN');
  zone(['electrics'], -cw / 2 + 5, 72, cw / 2 - 7, 18, 'ELEKTRIK'); zone(['gearbox'], 2, 72, cw / 2 - 7, 18, 'GETRIEBE');
  zone(['oil_leak', 'coolant_leak', 'overheat', 'radiator', 'turbo', 'air_filter', 'fuel_pump', 'engine_mount', 'engine_damage'], -cw / 2 + 5, h - 58, cw - 10, 38, 'MOTOR');
  c.fillStyle = '#9fb39a'; c.font = '10px Segoe UI, Arial'; c.textAlign = 'center'; c.fillText('VORNE', 0, 12); c.fillText('HINTEN', 0, h - 6);
  c.restore();
}
const wrap = (c, text, x, y, maxW, lh, maxLines = 4) => { const words = String(text).split(' '); let line = ''; let n = 0; for (const w of words) { const t = line ? `${line} ${w}` : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y + n * lh); n++; line = w; if (n >= maxLines) return n; } else line = t; } c.fillText(line, x, y + n * lh); return n + 1; };

// Anleitung rechts: Fahrzeugschema, gewählter Schaden mit Beschreibung, Schritte mit Werkzeug-/Teilsymbol, aktuelles Ziel, Bestand
export function drawGuide(c, W, H, v, E, now = 0, hoverLabel = '') {
  c.fillStyle = '#0a1210'; c.fillRect(0, 0, W, H); c.fillStyle = '#e8821e'; c.fillRect(0, 0, W, 34); c.fillStyle = '#1a1208'; c.font = 'bold 18px Segoe UI, Arial'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('REPARATUR-ANLEITUNG', 12, 18);
  const n = nitroStatus(v); c.textAlign = 'right'; c.font = 'bold 13px Segoe UI, Arial'; c.fillText(`NITRO ${NITRO_MAX - v.nitro.uses}/${NITRO_MAX}`, W - 10, 18);
  const ug = urgentDamage(v); if (ug) { const f = Math.max(0, Math.min(1, ug.left / (ug.limit || 60))); c.fillStyle = '#1d2a22'; c.fillRect(0, 34, W, 7); c.fillStyle = ug.left < 10 ? (Math.floor(now * 5) % 2 ? '#ff3b30' : '#ff9a8a') : ug.left < 20 ? '#ff9a2a' : '#6fdc7a'; c.fillRect(0, 34, W * f, 7); }
  drawCarSchema(c, 0, 40, W, 150, v, now);
  let y = 200;
  // Nitro hat Vorrang, wenn der Fahrer angefordert hat oder die Flasche leer ist
  const card = (title, sub, col) => { c.fillStyle = 'rgba(255,255,255,0.05)'; c.beginPath(); c.roundRect(8, y, W - 16, 66, 8); c.fill(); c.strokeStyle = col; c.lineWidth = 2; c.stroke(); c.fillStyle = col; c.font = 'bold 15px Segoe UI, Arial'; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(title, 18, y + 24); c.fillStyle = '#dfe6d8'; c.font = '13px Segoe UI, Arial'; wrap(c, sub, 18, y + 44, W - 36, 16, 2); y += 76; };
  if (n.call) card('⚡ FAHRER RUFT NITRO!', 'Du entscheidest: 1. Hebel (rot) scharf schalten  2. Zündknopf drücken', '#ffdf5a');
  else if (n.state === 'ready' && v.nitroArmed) card('NITRO SCHARF', 'Zündknopf drücken, wann du willst.', '#ffdf5a');
  else if (n.state === 'empty') { card('NITROFLASCHE LEER', 'Neue Flasche aus dem rechten Regal nehmen und am Anschluss gedrückt halten (1,5 s).', '#ff9a6a'); drawIcon(c, 'part', 'nitro', W - 36, y - 44, 34); }
  else if (n.state === 'refilling') card('NITRO LÄDT', `Druckaufbau noch ${Math.ceil(v.nitro.t)} s – danach wieder bereit.`, '#6fb8ff');
  else if (n.state === 'spent') card('KEINE NITRO-AKTIVIERUNGEN MEHR', `${v.nitro.uses} von ${NITRO_MAX} verbraucht.`, '#ff6a5a');
  const list = sortedDamages(v); const cs = E ? currentStep(E, v) : null; const d = cs ? cs.d : null;
  if (!d) { c.fillStyle = '#6fdc7a'; c.font = 'bold 20px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText(list.length ? 'Schaden am Display wählen (Q)' : '✔ Alles in Ordnung', 14, y + 26); c.fillStyle = '#9fb39a'; c.font = '14px Segoe UI, Arial'; wrap(c, list.length ? 'Auf das große Display klicken oder Q drücken.' : 'Werkzeug aufräumen, Nitro bereithalten. Wenn etwas kaputtgeht, erscheint hier die Anleitung.', 14, y + 52, W - 28, 18, 3); }
  else {
    const def = DEFS[d.id]; const col = d.sev >= 3 ? '#ff5a4a' : d.sev === 2 ? '#ffae4a' : '#e6d35a';
    c.fillStyle = col; c.font = 'bold 19px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText(`${def.name}${d.id === 'tire' ? ' ' + WHEEL_NAMES[d.wheel] : ''}`, 12, y + 16); c.font = 'bold 12px Segoe UI, Arial'; c.textAlign = 'right'; c.fillStyle = damageLeft(v, d) < 10 ? '#ff5a4a' : col; c.fillText(`${SEV_NAMES[d.sev].toUpperCase()} · ${Math.min(99, Math.ceil(damageLeft(v, d)))} s`, W - 12, y + 16); c.textAlign = 'left'; c.fillStyle = col;
    c.fillStyle = '#cfd8c9'; c.font = '13px Segoe UI, Arial'; const lines = wrap(c, def.text, 12, y + 38, W - 24, 16, 3); y += 38 + lines * 16 + 6;
    // Schritte
    d.steps.forEach((s, i) => {
      const done = i < d.step; const cur = i === d.step; const rh = cur ? 70 : 38; const need = s.k === 'tool' ? ['tool', s.tool] : s.k === 'part' ? ['part', s.part] : null;
      c.fillStyle = cur ? 'rgba(232,130,30,0.22)' : 'rgba(255,255,255,0.04)'; c.beginPath(); c.roundRect(8, y, W - 16, rh - 4, 7); c.fill(); if (cur) { c.strokeStyle = '#e8821e'; c.lineWidth = 2; c.stroke(); }
      c.fillStyle = done ? '#6fdc7a' : cur ? '#fff3d1' : '#6e7d70'; c.font = `bold ${cur ? 15 : 13}px Segoe UI, Arial`; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillText(`${done ? '✔' : cur ? '▶' : i + 1 + '.'}`, 16, y + 22);
      c.fillText((s.label || '').slice(0, cur ? 32 : 34), 40, y + 22);
      if (need) drawIcon(c, need[0], need[1], W - 34, y + (cur ? 28 : 17), cur ? 40 : 26);
      if (cur) {
        c.font = '13px Segoe UI, Arial'; c.fillStyle = '#ffd9a8';
        const how = s.k === 'open' ? 'Klappe anklicken' : s.k === 'confirm' ? 'Grüner Knopf am Pult (BESTÄTIGEN)' : s.k === 'tool' ? `${TOOLS[s.tool]} nehmen → ${COMP_NAMES[s.at]} halten (${s.sec} s)` : `${PART_NAMES[s.part]} nehmen → ${COMP_NAMES[s.at]} halten (${s.sec} s)`;
        wrap(c, how, 40, y + 42, W - 100, 15, 2);
        if (s.sec) { c.fillStyle = '#1d2a22'; c.fillRect(40, y + 56, W - 100, 6); c.fillStyle = '#4aa3df'; c.fillRect(40, y + 56, (W - 100) * Math.min(1, d.prog), 6); }
      }
      y += rh;
    });
  }
  // Hand + Bestand unten
  const by = H - 150; c.fillStyle = '#16251c'; c.fillRect(0, by - 6, W, 156); c.fillStyle = '#9fb39a'; c.font = 'bold 12px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText('IN DER HAND:', 10, by + 8);
  if (E && E.hand) { drawIcon(c, E.hand.kind, E.hand.id, 118, by + 4, 26); c.fillStyle = '#fff3d1'; c.font = 'bold 13px Segoe UI, Arial'; c.fillText(E.hand.kind === 'tool' ? TOOLS[E.hand.id] : PART_NAMES[E.hand.id], 138, by + 9); } else { c.fillStyle = '#6e7d70'; c.font = '13px Segoe UI, Arial'; c.fillText('nichts (Werkzeug links, Teile auf der Arbeitsplatte)', 98, by + 9); }
  c.fillStyle = '#9fb39a'; c.font = 'bold 12px Segoe UI, Arial'; c.fillText('BESTAND:', 10, by + 30);
  Object.keys(PART_NAMES).forEach((id, i) => { const cx = 24 + (i % 8) * 47; const cy = by + 56 + Math.floor(i / 8) * 42; const k = v.parts[id] || 0; c.globalAlpha = k ? 1 : 0.35; drawIcon(c, 'part', id, cx, cy, 24); c.globalAlpha = 1; c.fillStyle = k ? '#fff3d1' : '#ff6a4a'; c.font = 'bold 12px Consolas, monospace'; c.textAlign = 'left'; c.fillText(`×${k}`, cx + 12, cy + 14); });
  if (E && E.msg) { c.fillStyle = 'rgba(10,18,14,0.92)'; c.fillRect(0, H - 22, W, 22); c.fillStyle = '#fff3d1'; c.font = '12px Segoe UI, Arial'; c.textAlign = 'left'; c.fillText(E.msg.slice(0, 60), 8, H - 8); }
}
