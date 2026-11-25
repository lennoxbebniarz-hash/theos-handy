// Theos Seitenscheidel - Ludwig Zigaretti: Abstimmung Paket 4 (2026-11-22), das Sichtbare. Regeln in ludwigextra.js.
// Puppe am Schreibtisch, acht Sachen fürs Zimmer, Wasserpfeife bei Rudi, Fahrrad und E-Roller, eigene Marke auf Packung, Band und Plakat.
// Keine neuen Lichter (sonst übersetzt sich jeder Shader neu). Draußen hängt alles in AU.content, damit es im Bunker verschwindet.
import * as THREE from './vendor/three.module.min.js';
import { std, mesh, canvasTex, label, glow } from './ludwiggfx.js';
import { ROOM, LUDWIG_LOOK } from './ludwigart.js';
import { FZ, groundY } from './ludwigaussen.js';
import { createSpielPerson } from './spielfigur.js';
import { FARBEN, ZEICHEN, RAD_IDS, ZIMMER_IDS, hatRad, puppeDa, saubereMarke } from './ludwigextra.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const SCHRIFT = 'Bahnschrift, sans-serif';
const SYMBOL = '"Segoe UI Symbol", sans-serif';
export const PFEIFE = { x: 35.9, z: FZ - 1.62 };
const STUHL = { x: -2.45, z: -0.9 };
const PARKT = { rad: { x: 8.6, z: FZ - 1.5 }, roller: { x: 7.0, z: FZ - 1.1 } }; // außerhalb vom roten Bereich der Kamera (reicht 4,2 m)

// ---------------- Marke zeichnen (auch für die Vorschau am PC) ----------------
export function malMarke(c, w, h, roh, art = 'packung') {
  const M = saubereMarke(roh); const F = FARBEN[M.farbe]; const Z = ZEICHEN[M.zeichen];
  c.save();
  c.fillStyle = F.bg; c.fillRect(0, 0, w, h);
  c.fillStyle = F.fg; c.textBaseline = 'middle'; c.textAlign = 'center';
  const passend = (text, max, size) => {
    let s = size; c.font = `900 ${s}px ${SCHRIFT}`;
    while (c.measureText(text).width > max && s > 8) { s -= 2; c.font = `900 ${s}px ${SCHRIFT}`; }
  };
  if (art === 'plakat') {
    c.globalAlpha = 0.14; for (let i = -6; i < 12; i++) c.fillRect(i * w * 0.14, h * 0.8, w * 0.07, h * 0.2); c.globalAlpha = 1;
    c.font = `700 ${Math.round(h * 0.34)}px ${SYMBOL}`; c.fillText(Z, w / 2, h * 0.32);
    passend(M.name, w * 0.9, Math.round(h * 0.15)); c.fillText(M.name, w / 2, h * 0.64);
    c.font = `700 ${Math.round(h * 0.05)}px ${SCHRIFT}`; c.fillText('VON LUDWIG', w / 2, h * 0.75);
  } else {
    c.globalAlpha = 0.22; c.fillRect(0, 0, w, h * 0.1); c.fillRect(0, h * 0.9, w, h * 0.1); c.globalAlpha = 1;
    const zb = art === 'band' ? h : h * 0.8;
    c.font = `700 ${Math.round(h * 0.55)}px ${SYMBOL}`; c.fillText(Z, zb * 0.55, h * 0.53);
    passend(M.name, w - zb * 1.2, Math.round(h * 0.4)); c.fillText(M.name, zb * 1.05 + (w - zb * 1.12) / 2, h * 0.53);
  }
  c.restore();
}

// ---------------- Fahrrad und E-Roller: +z ist vorn, der Nullpunkt liegt am Boden unter dem Fahrer ----------------
function radMaterial() {
  return {
    rahmen: std({ color: 0x1f7ae0, roughness: 0.35, metalness: 0.35 }), roller: std({ color: 0x23262c, roughness: 0.35, metalness: 0.4 }),
    gummi: std({ color: 0x111214, roughness: 0.85 }), stahl: std({ color: 0xb8bcc4, roughness: 0.3, metalness: 0.55 }),
    akku: std({ color: 0x000000, emissive: 0x3affc0, emissiveIntensity: 1.8 }),
  };
}
function stange(g, mat, a, b, r) {
  const A = V3(...a); const d = V3(...b).sub(A); const len = d.length();
  const m = mesh(new THREE.CylinderGeometry(r, r, len, 8), mat, 0, 0, 0, g, { cast: true });
  m.position.copy(A).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
  return m;
}
function reifen(g, M, z, r) {
  const w = new THREE.Group(); w.position.set(0, r, z); g.add(w);
  mesh(new THREE.TorusGeometry(r - 0.025, 0.025, 7, 24), M.gummi, 0, 0, 0, w, { ry: Math.PI / 2, cast: true });
  for (let i = 0; i < 6; i++) mesh(new THREE.BoxGeometry(0.008, (r - 0.035) * 2, 0.008), M.stahl, 0, 0, 0, w, { rx: i * Math.PI / 6 });
  return { g: w, r };
}
function baueRad(id, M) {
  const g = new THREE.Group(); const u = { id, raeder: [], kurbel: null, pedale: [] };
  if (id === 'rad') {
    u.raeder.push(reifen(g, M, -0.42, 0.34), reifen(g, M, 0.62, 0.34));
    const kurbel = [0, 0.3, 0.12]; const sattel = [0, 0.78, -0.16]; const hinten = [0, 0.34, -0.42]; const vorn = [0, 0.84, 0.44];
    for (const [a, b] of [[kurbel, sattel], [kurbel, hinten], [sattel, hinten], [kurbel, vorn], [[0, 0.7, -0.12], vorn]]) stange(g, M.rahmen, a, b, 0.022);
    for (const s of [-1, 1]) stange(g, M.stahl, [s * 0.05, 0.34, 0.62], [s * 0.04, 0.86, 0.45], 0.016);
    stange(g, M.stahl, [0, 0.84, 0.45], [0, 1.04, 0.5], 0.018); stange(g, M.stahl, [-0.27, 1.04, 0.5], [0.27, 1.04, 0.5], 0.015);
    for (const s of [-1, 1]) stange(g, M.gummi, [s * 0.18, 1.04, 0.5], [s * 0.28, 1.04, 0.5], 0.024);
    mesh(new THREE.BoxGeometry(0.18, 0.06, 0.27), M.gummi, 0, 0.82, -0.14, g);
    u.kurbel = new THREE.Group(); u.kurbel.position.set(...kurbel); g.add(u.kurbel);
    for (const s of [-1, 1]) { stange(u.kurbel, M.stahl, [s * 0.08, 0, 0], [s * 0.08, 0, s * 0.14], 0.012); u.pedale.push(mesh(new THREE.BoxGeometry(0.1, 0.02, 0.09), M.gummi, s * 0.135, 0, s * 0.14, u.kurbel)); }
  } else {
    u.raeder.push(reifen(g, M, -0.42, 0.12), reifen(g, M, 0.47, 0.12));
    mesh(new THREE.BoxGeometry(0.22, 0.07, 0.74), M.roller, 0, 0.12, 0, g, { cast: true });
    mesh(new THREE.BoxGeometry(0.17, 0.008, 0.6), M.gummi, 0, 0.158, -0.02, g);
    for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.008, 0.016, 0.6), M.akku, s * 0.114, 0.12, -0.02, g);
    stange(g, M.roller, [0, 0.12, 0.47], [0, 1.1, 0.35], 0.032); stange(g, M.stahl, [-0.24, 1.1, 0.35], [0.24, 1.1, 0.35], 0.016);
    for (const s of [-1, 1]) stange(g, M.gummi, [s * 0.16, 1.1, 0.35], [s * 0.25, 1.1, 0.35], 0.024);
    mesh(new THREE.BoxGeometry(0.1, 0.03, 0.07), M.akku, 0, 1.15, 0.34, g);
  }
  g.userData.u = u;
  return g;
}
function baueLenker(id, M) {
  const g = new THREE.Group(); g.position.set(0, -0.37, -0.6); g.rotation.x = 0.22;
  stange(g, M.stahl, [-0.31, 0, 0], [0.31, 0, 0], 0.016);
  for (const s of [-1, 1]) stange(g, M.gummi, [s * 0.2, 0, 0], [s * 0.32, 0, 0], 0.026);
  stange(g, id === 'rad' ? M.rahmen : M.roller, [0, 0, 0], [0, -0.3, -0.06], 0.028);
  if (id === 'rad') mesh(new THREE.SphereGeometry(0.036, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.stahl, 0.13, 0.016, 0, g);
  else { mesh(new THREE.BoxGeometry(0.12, 0.03, 0.075), M.roller, 0, 0.03, 0, g); mesh(new THREE.BoxGeometry(0.08, 0.008, 0.045), M.akku, 0, 0.048, 0, g); }
  g.visible = false;
  return g;
}

// ---------------- Zimmer ausbauen ----------------
function baueZimmer(scene) {
  const R = ROOM; const alle = new THREE.Group(); alle.name = 'zimmer-ausbau'; scene.add(alle);
  const teile = {}; const teil = (id) => { const g = new THREE.Group(); g.visible = false; alle.add(g); teile[id] = g; return g; };
  const holz = std({ color: 0x4a2f1e, roughness: 0.6 }); const schwarz = std({ color: 0x17181c, roughness: 0.6 }); const weiss = std({ color: 0xeeeae0, roughness: 0.55 });
  const blatt = std({ color: 0x2f7a38, roughness: 0.8 }); const bild = (w, h, mal) => std({ map: canvasTex(w, h, mal), roughness: 0.8 });

  let g = teil('duftbaum'); g.position.set(-0.6, 1.9, R.z0 + 0.32);
  mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.36, 4), schwarz, 0, 0.26, 0, g);
  for (const [y, r] of [[0.06, 0.075], [0, 0.1], [-0.07, 0.125]]) { const m = mesh(new THREE.ConeGeometry(r, 0.14, 12), blatt, 0, y, 0, g); m.scale.z = 0.2; }
  mesh(new THREE.BoxGeometry(0.03, 0.06, 0.012), holz, 0, -0.16, 0, g);

  g = teil('oma'); g.position.set(R.x0 + 0.02, 1.62, 2.15); g.rotation.y = Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.44, 0.54, 0.025), holz, 0, 0, 0, g);
  mesh(new THREE.PlaneGeometry(0.36, 0.46), bild(256, 320, (c, w, h) => {
    c.fillStyle = '#c9b58e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7a4a78'; c.beginPath(); c.ellipse(w / 2, h + 12, 92, 105, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#dedbd4'; for (const [x, y, r] of [[w / 2, 78, 34], [w / 2 - 44, 124, 30], [w / 2 + 44, 124, 30], [w / 2, 118, 56]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    c.fillStyle = '#e8b999'; c.beginPath(); c.arc(w / 2, 150, 54, 0, 7); c.fill();
    c.strokeStyle = '#4a3022'; c.lineWidth = 4; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * 22, 143, 15, 0, 7); c.stroke(); }
    c.beginPath(); c.arc(w / 2, 164, 20, 0.35, Math.PI - 0.35); c.stroke();
    c.fillStyle = '#2a1a10'; c.font = '700 34px "Segoe Print", cursive'; c.textAlign = 'center'; c.fillText('Oma', w / 2, h - 18);
  }), 0, 0, 0.014, g);

  g = teil('mathe'); g.position.set(0.67, 0.762, 0.8); g.rotation.y = 0.25;
  ['MATHE 9', 'MATHE 8', 'MATHE ÜBEN'].forEach((t, i) => {
    const farbe = [0x1c4a8a, 0x8a2432, 0x2a6a3a][i];
    mesh(new THREE.BoxGeometry(0.2, 0.035, 0.15), std({ color: farbe, roughness: 0.7 }), i * 0.008, 0.0175 + i * 0.036, 0, g, { ry: i * 0.12, cast: true });
    if (i === 2) mesh(new THREE.PlaneGeometry(0.17, 0.08), std({ map: label(t, { w: 256, h: 120, bg: '#2a6a3a', fg: '#fff', size: 44 }) }), 0.016, 0.109, 0, g, { rx: -Math.PI / 2, rz: 0.24 });
  });

  g = teil('pflanze'); g.position.set(1.33, 0, -2.64);
  mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 16), std({ color: 0xb4583a, roughness: 0.85 }), 0, 0.15, 0, g, { cast: true });
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4; const h = 0.48 + (i % 4) * 0.17; const dx = Math.cos(a) * 0.17; const dz = Math.sin(a) * 0.15;
    stange(g, blatt, [0, 0.28, 0], [dx, h, dz], 0.008);
    const m = mesh(new THREE.SphereGeometry(1, 10, 6), blatt, dx * 1.2, h + 0.03, dz * 1.2, g, { ry: -a, rz: 0.4, cast: true }); m.scale.set(0.14, 0.022, 0.085);
  }

  g = teil('vorhang'); g.position.z = R.z0 + 0.22;
  const stoff = std({ color: 0x5a1830, roughness: 1, side: THREE.DoubleSide });
  stange(g, schwarz, [-1.2, 2.34, 0], [1.2, 2.34, 0], 0.018);
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.4, 1.96, 20, 1); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 42) * 0.035);
    geo.computeVertexNormals(); mesh(geo, stoff, s * 0.98, 1.36, 0, g, { cast: true });
  }

  g = teil('urkunde'); g.position.set(R.x1 - 0.02, 1.3, -1.9); g.rotation.y = -Math.PI / 2;
  mesh(new THREE.BoxGeometry(0.52, 0.4, 0.02), std({ color: 0xc8a23a, roughness: 0.4, metalness: 0.3 }), 0, 0, 0, g);
  mesh(new THREE.PlaneGeometry(0.46, 0.34), bild(384, 280, (c, w, h) => {
    c.fillStyle = '#f3ecd8'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2418'; c.textAlign = 'center';
    c.font = `900 44px ${SCHRIFT}`; c.fillText('URKUNDE', w / 2, 70);
    c.font = `700 30px ${SCHRIFT}`; c.fillText('Bester Schüler', w / 2, 128); c.fillText('LUDWIG', w / 2, 178);
    c.font = 'italic 20px "Segoe Print", cursive'; c.fillText('ganz sicher echt', w / 2, 236);
  }), 0, 0, 0.012, g);

  g = teil('filter'); g.position.set(-3.24, 0, 0.72);
  mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.56, 20), weiss, 0, 0.28, 0, g, { cast: true });
  for (let i = 0; i < 6; i++) mesh(new THREE.TorusGeometry(0.154, 0.005, 5, 22), schwarz, 0, 0.12 + i * 0.05, 0, g, { rx: Math.PI / 2 });
  mesh(new THREE.TorusGeometry(0.1, 0.008, 6, 22), std({ color: 0x000000, emissive: 0x5ad8ff, emissiveIntensity: 2 }), 0, 0.565, 0, g, { rx: Math.PI / 2 });

  g = teil('hund'); g.position.set(2.78, 0, 2.72);
  const fell = std({ color: 0xa8683a, roughness: 1 }); const ohr = std({ color: 0x5a3220, roughness: 1 });
  const leib = mesh(new THREE.SphereGeometry(1, 18, 12), fell, 0, 0.14, 0, g, { cast: true }); leib.scale.set(0.3, 0.14, 0.17);
  const kopf = new THREE.Group(); kopf.position.set(0.31, 0.17, -0.02); g.add(kopf);
  mesh(new THREE.SphereGeometry(0.115, 16, 12), fell, 0, 0, 0, kopf, { cast: true });
  const schnauze = mesh(new THREE.SphereGeometry(1, 12, 8), fell, 0.1, -0.04, 0, kopf); schnauze.scale.set(0.08, 0.05, 0.065);
  mesh(new THREE.SphereGeometry(0.026, 8, 6), schwarz, 0.175, -0.025, 0, kopf);
  for (const s of [-1, 1]) {
    const o = mesh(new THREE.SphereGeometry(1, 10, 8), ohr, -0.01, -0.005, s * 0.105, kopf); o.scale.set(0.05, 0.085, 0.022);
    mesh(new THREE.SphereGeometry(0.016, 8, 6), schwarz, 0.092, 0.035, s * 0.048, kopf);
    const bein = mesh(new THREE.SphereGeometry(1, 10, 8), fell, 0.24, 0.035, s * 0.12, g); bein.scale.set(0.13, 0.035, 0.04);
  }
  stange(g, fell, [-0.28, 0.12, 0], [-0.46, 0.05, 0.08], 0.022);
  return { teile, hund: { leib, kopf } };
}

// ---------------- Wasserpfeife bei Rudi ----------------
function bauePfeife(parent) {
  const g = new THREE.Group(); g.name = 'wasserpfeife'; g.position.set(PFEIFE.x, groundY(PFEIFE.x, PFEIFE.z) + 0.02, PFEIFE.z); parent.add(g);
  const messing = std({ color: 0xc8962e, roughness: 0.3, metalness: 0.55 });
  const glas = std({ color: 0x1fa08a, emissive: 0x0a3a32, roughness: 0.12, transparent: true, opacity: 0.8 });
  const vase = new THREE.LatheGeometry([[0.001, 0], [0.13, 0.01], [0.16, 0.1], [0.14, 0.2], [0.06, 0.3], [0.07, 0.36]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
  mesh(vase, glas, 0, 0, 0, g, { cast: true });
  mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 12), messing, 0, 0.55, 0, g, { cast: true });
  for (const y of [0.42, 0.6]) mesh(new THREE.SphereGeometry(0.045, 12, 8), messing, 0, y, 0, g);
  mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.02, 20), messing, 0, 0.75, 0, g);
  mesh(new THREE.CylinderGeometry(0.055, 0.03, 0.09, 14), std({ color: 0x9a4a2a, roughness: 0.9 }), 0, 0.81, 0, g);
  const kohle = std({ color: 0x2a0a04, emissive: 0xff4a16, emissiveIntensity: 2, roughness: 1 });
  for (const [x, z] of [[-0.02, 0], [0.02, 0.012], [0, -0.02]]) mesh(new THREE.BoxGeometry(0.03, 0.025, 0.03), kohle, x, 0.865, z, g);
  const weg = new THREE.CatmullRomCurve3([V3(0.04, 0.44, 0), V3(0.22, 0.3, 0.08), V3(0.3, 0.12, 0.2), V3(0.34, 0.5, 0.16), V3(0.42, 0.84, 0.07)]);
  mesh(new THREE.TubeGeometry(weg, 28, 0.017, 7, false), std({ color: 0x8a2438, roughness: 0.75 }), 0, 0, 0, g);
  mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.14, 10), messing, 0.43, 0.9, 0.06, g, { rz: -0.4 });
  return { g, kohle, schein: glow(g, 0, 0.88, 0, 0xff5a20, 0.3, 0.45) };
}

export function buildExtra({ W, AU, BK, cam }) {
  const R = ROOM; const scene = W.scene; const draussen = AU.content;

  // ---- Puppe am Schreibtisch
  const puppe = createSpielPerson(scene, { ...LUDWIG_LOOK, skin: 0xd2b98c, face: 'flat' });
  puppe.place(STUHL.x, 0, STUHL.z, -Math.PI / 2); puppe.mode = 'sit'; puppe.seat = 0.5; puppe.act = 'piano'; puppe.lookAt = V3(-3.05, 0.78, STUHL.z); puppe.setVisible(false);
  const puppeSachen = new THREE.Group(); puppeSachen.visible = false; scene.add(puppeSachen);
  const heft = canvasTex(256, 180, (c, w, h) => {
    c.fillStyle = '#f5f2e8'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9ab8d8';
    for (let y = 24; y < h; y += 20) { c.beginPath(); c.moveTo(8, y); c.lineTo(w - 8, y); c.stroke(); }
    c.fillStyle = '#1c3f86'; c.font = '22px "Segoe Print", cursive'; c.fillText('Hausaufgaben', 18, 44); c.fillText('2 + 2 = 5', 18, 86);
  });
  mesh(new THREE.PlaneGeometry(0.26, 0.19), std({ map: heft, roughness: 0.9 }), -3.0, 0.76, STUHL.z, puppeSachen, { rx: -Math.PI / 2, rz: Math.PI / 2 });
  mesh(new THREE.PlaneGeometry(0.34, 0.2), std({ map: label('PSST, ICH LERNE', { w: 340, h: 200, bg: '#ffe866', fg: '#20252c', size: 38, font: '"Segoe Print", cursive' }), roughness: 0.9 }), -2.184, 1.02, STUHL.z, puppeSachen, { ry: Math.PI / 2 });

  // ---- Zimmer, Pfeife
  const zimmer = baueZimmer(scene); const pfeife = bauePfeife(draussen);

  // ---- Marke: Packungen auf dem Tisch und auf dem Band, Schild überm Band, Plakat im Zimmer und an der Litfaßsäule
  const flaeche = (w, h, art) => ({ tex: canvasTex(w, h, (c) => malMarke(c, w, h, null, art)), art });
  const MK = { packung: flaeche(256, 144, 'packung'), plakat: flaeche(384, 512, 'plakat'), band: flaeche(1024, 200, 'band') };
  const packMat = std({ map: MK.packung.tex, roughness: 0.55 }); const plakatMat = std({ map: MK.plakat.tex, roughness: 0.8 });
  const marke = new THREE.Group(); marke.name = 'marke'; scene.add(marke);
  const packungen = [[-0.69, 0.79, 0.83, 0.15], [-0.685, 0.847, 0.825, 0.42], [-0.6, 0.79, 0.66, -0.3]].map(([x, y, z, ry]) => mesh(new THREE.BoxGeometry(0.16, 0.056, 0.1), packMat, x, y, z, marke, { ry, cast: true }));
  const poster = mesh(new THREE.PlaneGeometry(0.6, 0.8), plakatMat, 2.35, 1.62, R.z1 - 0.008, marke, { ry: Math.PI });
  const saeule = mesh(new THREE.CylinderGeometry(0.563, 0.563, 1.6, 20, 1, true, -0.8, 1.6), plakatMat, 5, groundY(5, FZ - 11.6) + 1.55, FZ - 11.6, draussen);
  const bandSchild = new THREE.Group(); bandSchild.position.set(-0.8, 2.05, 0); BK.root.add(bandSchild);
  const bandMat = std({ map: MK.band.tex, emissiveMap: MK.band.tex, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.5 });
  for (const s of [-1, 1]) {
    mesh(new THREE.PlaneGeometry(2.2, 0.43), bandMat, 0, 0, s * 0.02, bandSchild, { ry: s > 0 ? 0 : Math.PI });
    mesh(new THREE.CylinderGeometry(0.007, 0.007, 1.6, 5), std({ color: 0x22252a }), s * 0.9, 1.0, 0, bandSchild);
  }
  if (BK.root.userData.packMat) { BK.root.userData.packMat.map = MK.packung.tex; BK.root.userData.packMat.needsUpdate = true; }
  let markeKey = '';
  function setMarke(roh) {
    const M = saubereMarke(roh); const key = `${M.name}|${M.farbe}|${M.zeichen}`;
    if (key === markeKey) return;
    markeKey = key;
    for (const { tex, art } of Object.values(MK)) { const k = tex.userData.canvas; malMarke(k.getContext('2d'), k.width, k.height, M, art); tex.needsUpdate = true; }
  }

  // ---- Räder: abgestellt vor dem Fenster, in der Hand (Lenker), bei den Mitspielern
  const radM = radMaterial(); const geparkt = {}; const lenker = {}; const fremde = new Map();
  for (const id of RAD_IDS) {
    const g = baueRad(id, radM); const p = PARKT[id];
    g.position.set(p.x, groundY(p.x, p.z), p.z); g.rotation.set(0, Math.PI / 2, 0); g.visible = false; draussen.add(g); geparkt[id] = g;
    lenker[id] = baueLenker(id, radM); cam.add(lenker[id]);
  }
  function fremdRad(platz, P, id, dt) {
    let F = fremde.get(platz);
    if (!F) { if (!id) return; F = { rad: null, roller: null, weg: 0, x: P.x, z: P.z }; fremde.set(platz, F); }
    for (const k of RAD_IDS) if (F[k]) F[k].visible = k === id;
    if (!id) return;
    if (!F[id]) { F[id] = baueRad(id, radM); draussen.add(F[id]); }
    const g = F[id]; const d = Math.hypot(P.x - F.x, P.z - F.z); F.x = P.x; F.z = P.z; if (d < 1.5) F.weg += d;
    g.position.set(P.x, P.y || 0, P.z); g.rotation.y = P.yaw;
    for (const w of g.userData.u.raeder) w.g.rotation.x = (F.weg / w.r) % (Math.PI * 2);
    if (g.userData.u.kurbel) {
      const a = (F.weg * 1.6) % (Math.PI * 2);
      g.userData.u.kurbel.rotation.x = -a; for (const p of g.userData.u.pedale) p.rotation.x = a; P.tritt = a;
    }
  }
  function fremdWeg(platz) { const F = fremde.get(platz); if (F) for (const id of RAD_IDS) if (F[id]) F[id].visible = false; }

  let stand = null;
  function set(S, faehrt = null) {
    stand = S;
    for (const id of ZIMMER_IDS) zimmer.teile[id].visible = !!S.deko[id];
    for (const id of RAD_IDS) geparkt[id].visible = hatRad(S, id) && faehrt !== id;
    setMarke(S.marke);
  }
  // zeigen: im Spiel (nicht Menü, Vorspann oder am PC, da stünde die Puppe in der Kamera)
  function update(t, dt, { zeigen, faehrt, area, moving = 0 }) {
    const p = !!zeigen && puppeDa(stand) && area !== 'bunker';
    if (puppe.visible !== p) { puppe.setVisible(p); puppeSachen.visible = p; }
    if (p) puppe.update(dt * 0.3, t); // eine Puppe bewegt sich sparsam
    const atem = Math.sin(t * 1.9); zimmer.hund.leib.scale.y = 0.14 + atem * 0.006; zimmer.hund.kopf.rotation.z = Math.sin(t * 0.5) * 0.06;
    pfeife.kohle.emissiveIntensity = 1.8 + Math.sin(t * 5.3) * 0.5;
    for (const id of RAD_IDS) {
      lenker[id].visible = faehrt === id && area === 'draussen';
      lenker[id].rotation.z = id === 'rad' && moving > 0.3 ? Math.sin(t * 7) * 0.018 : 0;
    }
  }
  function boxen(S) {
    const b = [];
    if (S.deko.pflanze) b.push({ x0: 1.14, x1: 1.52, z0: -2.84, z1: -2.44 });
    if (S.deko.filter) b.push({ x0: -3.5, x1: -3.06, z0: 0.54, z1: 0.9 });
    return b;
  }
  function reset() {
    stand = null; puppe.setVisible(false); puppeSachen.visible = false;
    for (const id of RAD_IDS) lenker[id].visible = false;
    for (const k of fremde.keys()) fremdWeg(k);
  }
  const PB = { x0: PFEIFE.x - 0.17, x1: PFEIFE.x + 0.17, z0: PFEIFE.z - 0.17, z1: PFEIFE.z + 0.17 };
  return {
    set, update, boxen, reset, fremdRad, fremdWeg,
    pfeife: { g: pfeife.g, at: V3(PFEIFE.x, pfeife.g.position.y + 0.62, PFEIFE.z), box: PB },
    teile: { puppe, zimmer: zimmer.teile, geparkt, lenker, packungen, poster, saeule, bandSchild, marke: MK },
  };
}
