// Theos Seitenscheidel - Moonsweeper 2: Abschlussfilm, wenn der ganze Mond geputzt ist (Lennox' Wunsch nach einem TikTok, 2026-11-12).
// Ablauf (~19 s, Leertaste/Klick überspringt): Kamera steigt vom Spieler in den Himmel -> Blick aus dem All auf Mond und Erde ->
// ein Glanz läuft über die frisch geputzte Kugel, sie strahlt immer heller -> ein Lichtstrahl schießt zur Erde, die Erde leuchtet golden auf ->
// Schrift „DER MOND IST SAUBER“ -> zurück ins Spiel. Eigene Szene, alles im Spiel erzeugt (Mondkugel aus moonintro.js, Erdtextur aus dem Himmel).
import * as THREE from './vendor/three.module.min.js';
import { buildMoonBall } from './moonintro.js';

export const FIN = { RISE: 2.2, SPACE: 3.2, SHINE: 4.4, BEAM: 4.2, TEXT: 4.6 }; // Abschnitte in Sekunden
export const FIN_TOTAL = FIN.RISE + FIN.SPACE + FIN.SHINE + FIN.BEAM + FIN.TEXT;
const ease = (x) => x * x * (3 - 2 * x); const clamp01 = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, len) => clamp01((t - a) / len);

function glowTex(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,246,220,.35)') { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128); g.addColorStop(0, inner); g.addColorStop(0.18, mid); g.addColorStop(0.5, 'rgba(255,240,210,.08)'); g.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function starTex() { // Vierstrahliger Lichtstern (Blendenfleck)
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.translate(128, 128); x.globalCompositeOperation = 'lighter';
  for (const [a, len, w] of [[0, 128, 7], [Math.PI / 2, 128, 7], [Math.PI / 4, 70, 4], [-Math.PI / 4, 70, 4]]) { x.save(); x.rotate(a); const g = x.createLinearGradient(-len, 0, len, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, len, w, 0, 0, 7); x.fill(); x.restore(); }
  const g = x.createRadialGradient(0, 0, 0, 0, 0, 40); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(-40, -40, 80, 80);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function beamTex() { const c = document.createElement('canvas'); c.width = 64; c.height = 4; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 64, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,250,235,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,1)'); g.addColorStop(0.65, 'rgba(255,250,235,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 4); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const addSprite = (map, color, opacity = 0) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, toneMapped: false })); s.renderOrder = 5; return s; };

// host: { renderer, W (Mondwelt: sky, cam, scene), snd, el, onEnd(), stepGame(dt) für Hintergrundarbeit im Mehrspieler }
export function createFinale(host) {
  const { renderer, W, snd } = host;
  const S = new THREE.Scene(); S.background = new THREE.Color(0x01020a);
  const dome = new THREE.Mesh(W.sky.children[0].geometry, W.sky.children[0].material); dome.renderOrder = -10; S.add(dome);
  const { ball, dispose: disposeBall } = buildMoonBall(); ball.rotation.y = -1.25; S.add(ball);
  // Mond poliert: weniger rau, leuchtet mit seinem eigenen Muster, Glanzband läuft über die Kugel
  const mm = ball.material; const U = { uSweep: { value: -2 }, uSweepK: { value: 0 }, uDir: { value: new THREE.Vector3(0.75, 0.35, 0.56).normalize() } };
  mm.emissive = new THREE.Color(0xfff8ec); mm.emissiveMap = mm.map; mm.emissiveIntensity = 0;
  mm.onBeforeCompile = (s) => { Object.assign(s.uniforms, U); s.fragmentShader = 'uniform float uSweep; uniform float uSweepK; uniform vec3 uDir;\n' + s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat sw = dot(normalize(vNormal), uDir); float band = exp(-pow((sw - uSweep) * 9.0, 2.0)); float rim = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 2.4); gl_FragColor.rgb += vec3(1.0, 0.97, 0.9) * band * uSweepK + vec3(0.85, 0.9, 1.0) * rim * uSweepK * 0.35;'); };
  mm.needsUpdate = true;
  const sun = new THREE.DirectionalLight(0xfff4e8, 3.0); sun.position.set(-0.55, 0.45, 0.75); S.add(sun); const amb = new THREE.HemisphereLight(0x9aa6d0, 0x4a4a5a, 0.55); S.add(amb);
  // Erde: Textur aus dem Himmel der Mondwelt, eigenes Material (das Original bleibt unberührt)
  const src = W.sky.userData.earth; const EP = new THREE.Vector3(470, 250, -560); const ER = 62;
  const em = new THREE.MeshStandardMaterial({ map: src.material.map, roughness: 0.75, metalness: 0, emissive: new THREE.Color(0xffc46a), emissiveMap: src.material.map, emissiveIntensity: 0 });
  const UE = { uHot: { value: 0 }, uFrom: { value: new THREE.Vector3() } };
  em.onBeforeCompile = (s) => { Object.assign(s.uniforms, UE); s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWN;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * objectNormal);'); s.fragmentShader = 'uniform float uHot; uniform vec3 uFrom; varying vec3 vWN;\n' + s.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\nfloat face = max(dot(vWN, uFrom), 0.0); float rimE = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0), 3.0); gl_FragColor.rgb += vec3(1.0, 0.8, 0.42) * pow(face, 2.5) * uHot * 0.62 + vec3(0.3, 0.55, 1.0) * rimE * (0.55 + uHot);'); };
  const earth = new THREE.Mesh(src.geometry, em); earth.position.copy(EP); earth.rotation.copy(src.rotation); S.add(earth);
  const toMoon = new THREE.Vector3().copy(EP).negate().normalize(); UE.uFrom.value.copy(toMoon);
  const eLight = new THREE.PointLight(0xfff0d0, 0, 0, 0); eLight.position.copy(EP).addScaledVector(toMoon, 160); S.add(eLight);
  // Leuchten, Sterne, Strahl
  const gT = glowTex(); const sT = starTex(); const bT = beamTex();
  const halo = addSprite(gT, 0xfff6e6); halo.position.set(0, 0, 0); S.add(halo);
  const halo2 = addSprite(gT, 0xbfd6ff); S.add(halo2);
  const flare = addSprite(sT, 0xffffff); S.add(flare);
  const eHalo = addSprite(gT, 0xffd27a); eHalo.position.copy(EP); S.add(eHalo);
  const eFlare = addSprite(sT, 0xfff2c8); S.add(eFlare); for (const s of [halo, halo2, eHalo]) { s.material.depthTest = true; s.renderOrder = -1; }
  const limb = new THREE.Vector3().copy(EP).normalize().multiplyScalar(101); flare.position.copy(limb); eFlare.position.copy(EP).addScaledVector(toMoon, ER * 0.98);
  const beamLen = EP.distanceTo(limb) - ER; const beamGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); beamGeo.translate(0, 0.5, 0); beamGeo.rotateX(Math.PI / 2); // Achse z: 0..1
  const beamMat = new THREE.MeshBasicMaterial({ map: bT, color: 0xfff6e2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.copy(limb); beam.lookAt(EP); beam.scale.set(3.2, 3.2, 0.001); S.add(beam);
  const beam2 = new THREE.Mesh(beamGeo, beamMat.clone()); beam2.position.copy(limb); beam2.lookAt(EP); beam2.scale.set(11, 11, 0.001); S.add(beam2);
  // Funkeln auf der Mondoberfläche
  const N = 160; const sp = []; const pts = new THREE.Group(); S.add(pts); let seed = 4242; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < N; i++) { const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(); const s = addSprite(sT, 0xffffff); s.position.copy(v).multiplyScalar(102); s.userData = { v, ph: rnd() * 6.28, sp: 1.5 + rnd() * 3, k: 0.4 + rnd() * 0.9 }; pts.add(s); sp.push(s); }
  // Funken an der Erde
  const sparks = []; for (let i = 0; i < 70; i++) { const s = addSprite(gT, 0xffe2a0); s.userData = { dir: new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize(), v: 30 + rnd() * 90, t0: rnd() * 0.6 }; S.add(s); sparks.push(s); }
  const cam = new THREE.PerspectiveCamera(36, window.innerWidth / Math.max(1, window.innerHeight), 1, 5000);
  const F = { t: 0, S, cam, done: false, skip: false, stage: 0, rise: null };
  const g0 = new THREE.Vector3(); const look0 = new THREE.Vector3(); const _v = new THREE.Vector3(); const _l = new THREE.Vector3();
  F.startRise = () => { g0.copy(W.cam.position); const d = new THREE.Vector3(); W.cam.getWorldDirection(d); look0.copy(W.cam.position).addScaledVector(d, 10); };
  const T1 = FIN.RISE; const T2 = T1 + FIN.SPACE; const T3 = T2 + FIN.SHINE; const T4 = T3 + FIN.BEAM; const T5 = T4 + FIN.TEXT;
  F.T = { T1, T2, T3, T4, T5 };
  // Ein Bild weiter. Rückgabe: true solange der Film läuft
  F.step = (dt) => {
    F.t += dt; const t = F.t; const fade = host.el('moFade');
    if (t < T1) { // Kamera steigt aus dem Spiel nach oben, Bild wird weiß
      const u = ease(t / T1); const c = W.cam; _v.copy(g0); _v.y += u * u * 120; c.position.copy(_v); _l.copy(look0).lerp(_v.clone().add(new THREE.Vector3(0, 60, 0)), u * 0.85); c.lookAt(_l); fade.style.background = '#f4f2ea'; fade.style.opacity = String(Math.max(0, (t - T1 * 0.55) / (T1 * 0.45))); host.renderGame(); return true;
    }
    if (F.stage === 0) { F.stage = 1; snd.swell && snd.swell(FIN.SPACE + FIN.SHINE); }
    // Kamera im All: links unten der Mond, rechts oben die Erde, langsames Heranfahren
    const u = clamp01((t - T1) / (T5 - T1)); const c = cam; const a = 0.28 - u * 0.2; const d = 540 - 90 * ease(u);
    c.position.set(Math.sin(a) * d - 70, 40 + 30 * u, Math.cos(a) * d); c.lookAt(150 + 40 * u, 90 + 20 * u, -150); dome.position.copy(c.position);
    ball.rotation.y += dt * 0.03; earth.rotation.y += dt * 0.02;
    fade.style.opacity = String(t < T1 + 0.9 ? 1 - (t - T1) / 0.9 : t > T5 - 1.0 ? (t - (T5 - 1.0)) / 1.0 : 0); fade.style.background = t > T5 - 1.0 ? '#000' : '#f4f2ea';
    // Glanz: Band läuft zweimal über die Kugel, Leuchten steigt
    const sh = seg(t, T2, FIN.SHINE); U.uSweep.value = -1.3 + ((sh * 2) % 1) * 2.6; U.uSweepK.value = sh > 0 && sh < 1 ? 0.9 * Math.sin(Math.PI * ((sh * 2) % 1)) : 0;
    const glow = ease(sh) + seg(t, T3, 0.6) * 0.35; mm.emissiveIntensity = glow * 0.62; mm.roughness = 0.96 - 0.55 * ease(sh); amb.intensity = 0.55 + glow * 0.25;
    const pulse = 1 + 0.04 * Math.sin(t * 5); halo.scale.setScalar((560 + 260 * glow) * pulse); halo.material.opacity = Math.min(1, glow * 1.1); halo2.scale.setScalar(1000 + 400 * glow); halo2.material.opacity = glow * 0.4;
    for (const s of sp) { const k = s.userData; const tw = Math.max(0, Math.sin(t * k.sp + k.ph)); s.material.opacity = sh * k.k * tw * tw; s.scale.setScalar(6 + 14 * tw * k.k); }
    // Strahl zur Erde
    const bu = seg(t, T3, 0.9); const fl = 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 17);
    beam.scale.z = Math.max(0.001, beamLen * ease(bu)); beam2.scale.z = beam.scale.z; beam.material.opacity = bu > 0 ? 0.95 * fl : 0; beam2.material.opacity = bu > 0 ? 0.28 * fl : 0;
    flare.material.opacity = Math.min(1, glow * 0.7 + bu * 0.6) * fl; flare.scale.setScalar(110 + 150 * bu); flare.material.rotation = t * 0.15;
    if (bu > 0 && F.stage === 1) { F.stage = 2; snd.whoosh && snd.whoosh(); }
    // Erde wird angestrahlt
    const hot = seg(t, T3 + 0.85, 1.4); UE.uHot.value = ease(hot) * (0.92 + 0.08 * Math.sin(t * 6)); em.emissiveIntensity = ease(hot) * 0.3; eLight.intensity = ease(hot) * 4.0;
    eHalo.scale.setScalar(ER * 3.2 + ER * 4.0 * ease(hot)); eHalo.material.opacity = ease(hot); eFlare.material.opacity = (bu >= 1 ? 1 : 0) * (0.6 + 0.4 * fl) * Math.min(1, hot * 3); eFlare.scale.setScalar(60 + 70 * hot);
    if (hot > 0 && F.stage === 2) { F.stage = 3; snd.arrive && snd.arrive(); }
    for (const s of sparks) { const k = s.userData; const q = t - (T3 + 0.85) - k.t0; if (q < 0 || q > 2.6) { s.material.opacity = 0; continue; } s.position.copy(EP).addScaledVector(k.dir, ER + k.v * q); s.material.opacity = (1 - q / 2.6) * 0.9; s.scale.setScalar(5 + 4 * (1 - q / 2.6)); }
    if (t >= T4 && F.stage === 3) { F.stage = 4; host.showText(true); snd.milestone && snd.milestone(); }
    renderer.render(S, c);
    return t < T5;
  };
  F.resize = () => { cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); cam.updateProjectionMatrix(); };
  F.dispose = () => { disposeBall(); for (const m of [em, beamMat, beam2.material, halo.material, halo2.material, flare.material, eHalo.material, eFlare.material]) m.dispose(); for (const s of [...sp, ...sparks]) s.material.dispose(); beamGeo.dispose(); gT.dispose(); sT.dispose(); bT.dispose(); };
  return F;
}
