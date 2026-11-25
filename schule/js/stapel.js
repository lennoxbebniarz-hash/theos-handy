// Theos Seitenscheidel - Stapelturm (Schulmodus, Lennox 2026-11-23): Platten stapeln, so hoch es geht.
// Regeln in stapellogic.js. Hier: eigene kleine 3D-Szene auf dem Spiel-Renderer, schräg von oben, ohne Schatten und ohne
// Nachbearbeitung, damit es auch auf Schul-PCs flüssig läuft. Klick, Leertaste oder Enter lässt die Platte fallen. Esc: zurück.
import * as THREE from './vendor/three.module.min.js';
import { newTower, step, drop, hoehe, H as PLATTE } from './stapellogic.js';

const VIEW = 11; // so viele Meter hoch ist der sichtbare Ausschnitt
const farbe = (i) => new THREE.Color().setHSL(((0.52 + i * 0.022) % 1 + 1) % 1, 0.72, 0.56, THREE.SRGBColorSpace); // satte Farben, Schritt für Schritt durch den Farbkreis

export function createStapel({ renderer, $, store, G, showScreen, resize, zurueck, melde, rangText }) {
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(6, 14, 9); scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xaad8ff, 0.6); fill.position.set(-8, 4, -3); scene.add(fill);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const bgCanvas = document.createElement('canvas'); bgCanvas.width = 4; bgCanvas.height = 256;
  const bgTex = new THREE.CanvasTexture(bgCanvas); bgTex.colorSpace = THREE.SRGBColorSpace; scene.background = bgTex;
  const ringGeo = new THREE.RingGeometry(0.5, 0.56, 4, 1); ringGeo.rotateX(-Math.PI / 2); ringGeo.rotateY(Math.PI / 4);
  const P = { T: null, on: false, phase: 'start', meshes: [], moving: null, falling: [], rings: [], camY: 0, hue: -1, t: 0, wait: 0, flash: 0 };

  function hintergrund(n) {
    const h = Math.round(n / 3); if (h === P.hue) return; P.hue = h;
    const c = bgCanvas.getContext('2d'); const g = c.createLinearGradient(0, 0, 0, 256);
    const a = new THREE.Color().setHSL(((0.62 + n * 0.022) % 1 + 1) % 1, 0.5, 0.12, THREE.SRGBColorSpace); const b = new THREE.Color().setHSL(((0.56 + n * 0.022) % 1 + 1) % 1, 0.45, 0.3, THREE.SRGBColorSpace); // dunkler Grund wie Theos Zimmer bei Nacht
    g.addColorStop(0, `#${a.getHexString()}`); g.addColorStop(1, `#${b.getHexString()}`); c.fillStyle = g; c.fillRect(0, 0, 4, 256); bgTex.needsUpdate = true;
  }
  function platte(b, i, extra = {}) {
    const m = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: farbe(i), roughness: 0.5, metalness: 0.05, ...extra }));
    m.scale.set(b.w, PLATTE, b.d); m.position.set(b.x, b.y + PLATTE / 2, b.z); scene.add(m); return m;
  }
  function leeren() {
    for (const m of [...P.meshes, ...P.falling.map((f) => f.m), ...P.rings.map((r) => r.m)]) { scene.remove(m); m.material.dispose(); }
    if (P.moving) { scene.remove(P.moving); P.moving.material.dispose(); }
    if (P.sockel) { scene.remove(P.sockel); P.sockel.material.dispose(); }
    P.meshes = []; P.falling = []; P.rings = []; P.moving = null; P.sockel = null;
  }
  function begin() {
    leeren(); P.T = newTower(); P.camY = 0; P.hue = -1; P.flash = 0;
    const s = P.T.blocks[0];
    P.sockel = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: farbe(0).offsetHSL(0, -0.1, -0.12), roughness: 0.6 }));
    P.sockel.scale.set(s.w, 40, s.d); P.sockel.position.set(0, -20, 0); scene.add(P.sockel);
    P.meshes.push(platte(s, 0));
    neueBewegt(); setPhase('play'); zahl();
  }
  function neueBewegt() {
    const M = P.T.moving; if (!M) return;
    P.moving = platte(M, P.T.blocks.length, { emissive: farbe(P.T.blocks.length), emissiveIntensity: 0.12 });
  }
  function zahl() { $('spZahl').textContent = String(hoehe(P.T)); $('spBest').textContent = `Rekord ${Math.max(store.get('stapelBest', 0), hoehe(P.T))}`; }
  function setPhase(p) {
    P.phase = p;
    $('spStart').classList.toggle('hidden', p !== 'start'); $('spOver').classList.toggle('hidden', p !== 'over'); $('spHud').classList.toggle('hidden', p === 'start');
  }
  function fallen() {
    if (P.phase !== 'play' || !P.T || P.T.over) return;
    const r = drop(P.T);
    if (P.moving) { scene.remove(P.moving); P.moving.material.dispose(); P.moving = null; }
    const n = P.T.blocks.length - 1;
    if (r.art !== 'vorbei') {
      const b = P.T.blocks[n]; P.meshes.push(platte(b, n));
      if (r.art === 'genau') {
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false }));
        ring.position.set(b.x, b.y + 0.02, b.z); ring.scale.set(b.w * 1.42, 1, b.d * 1.42); scene.add(ring); P.rings.push({ m: ring, t: 0, w: b.w, d: b.d });
        P.flash = 1; $('spLob').textContent = P.T.combo >= 3 ? `Genau! ×${P.T.combo}` : 'Genau!'; $('spLob').classList.remove('weg'); void $('spLob').offsetWidth; $('spLob').classList.add('an');
      }
    }
    if (r.stueck) { const m = platte(r.stueck, n + (r.art === 'vorbei' ? 1 : 0)); P.falling.push({ m, vy: 0, rx: (Math.random() - 0.5) * 3, rz: (Math.random() - 0.5) * 3 }); }
    if (P.T.over) { ende(); return; }
    neueBewegt(); zahl();
  }
  function ende() {
    const h = hoehe(P.T); const alt = store.get('stapelBest', 0); if (h > alt) store.set('stapelBest', h);
    melde('stapel', h);
    $('spOverZahl').textContent = `${h} ${h === 1 ? 'Etage' : 'Etagen'}`;
    $('spOverRek').textContent = h > alt ? 'Neuer Rekord!' : `Dein Rekord: ${Math.max(h, alt)}`;
    $('spOverRang').textContent = rangText('stapel');
    $('spOver').classList.toggle('rekord', h > alt);
    P.wait = 0.5; setPhase('over');
  }
  function frame(dt) {
    if (!P.on) return;
    dt = Math.min(dt, 0.05); P.t += dt; P.wait = Math.max(0, P.wait - dt);
    if (P.T && P.phase === 'play') { step(P.T, dt); const M = P.T.moving; if (M && P.moving) P.moving.position.set(M.x, M.y + PLATTE / 2, M.z); }
    for (const f of P.falling) { f.vy -= 22 * dt; f.m.position.y += f.vy * dt; f.m.rotation.x += f.rx * dt; f.m.rotation.z += f.rz * dt; }
    P.falling = P.falling.filter((f) => { if (f.m.position.y < P.camY - 30) { scene.remove(f.m); f.m.material.dispose(); return false; } return true; });
    for (const r of P.rings) { r.t += dt; const k = 1 + r.t * 0.9; r.m.scale.set(r.w * 1.42 * k, 1, r.d * 1.42 * k); r.m.material.opacity = Math.max(0, 0.9 - r.t * 1.6); }
    P.rings = P.rings.filter((r) => { if (r.t > 0.6) { scene.remove(r.m); r.m.material.dispose(); return false; } return true; });
    const n = P.T ? P.T.blocks.length : 1; hintergrund(n);
    const ziel = P.T ? P.T.blocks[P.T.blocks.length - 1].y : 0; const over = P.phase === 'over';
    P.camY += ((over ? ziel * 0.5 : ziel) - P.camY) * (1 - Math.exp(-dt * 3));
    // Am Ende zoomt die Kamera raus, damit man den ganzen Turm sieht
    const w = window.innerWidth; const h = Math.max(1, window.innerHeight); const asp = w / h;
    const basis = Math.max(VIEW, 9.5 / asp); const view = over ? Math.max(basis, ziel * 1.25 + 4) : basis; /* hochkant (Handy): weiter weg, damit die gleitende Platte im Bild bleibt */ P.view = P.view ? P.view + (view - P.view) * (1 - Math.exp(-dt * 2.5)) : view;
    const half = P.view / 2; cam.left = -half * asp; cam.right = half * asp; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
    cam.position.set(9, P.camY + 9.5, 9); cam.lookAt(0, P.camY + 0.5, 0);
    sun.position.set(6, P.camY + 14, 9); sun.target.position.set(0, P.camY, 0);
    if (P.flash > 0) P.flash = Math.max(0, P.flash - dt * 3);
    const tone = renderer.toneMapping; const exp = renderer.toneMappingExposure;
    renderer.toneMapping = THREE.NoToneMapping; renderer.toneMappingExposure = 1;
    try { renderer.setRenderTarget(null); renderer.render(scene, cam); } finally { renderer.toneMapping = tone; renderer.toneMappingExposure = exp; }
  }
  function los() { if (P.phase === 'play') fallen(); else if (P.phase === 'start' || (P.phase === 'over' && !P.wait)) begin(); }
  const TASTE = new Set(['Space', 'Enter', 'NumpadEnter']);
  window.addEventListener('keydown', (e) => {
    if (!P.on) return;
    if (TASTE.has(e.code)) { e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) los(); return; }
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (P.phase === 'play') { P.T.over = true; ende(); } else back(); }
  }, true);
  $('gl').addEventListener('pointerdown', (e) => { if (P.on && e.button === 0) los(); });
  $('spTap').addEventListener('pointerdown', (e) => { if (P.on && e.button === 0) { e.preventDefault(); los(); } });
  function open() {
    P.on = true; G.mode = 'stapel'; resize(); showScreen('stapel'); leeren(); P.T = newTower(); P.view = null; P.camY = 0; P.hue = -1;
    const s = P.T.blocks[0]; P.sockel = new THREE.Mesh(box, new THREE.MeshStandardMaterial({ color: farbe(0).offsetHSL(0, -0.1, -0.12), roughness: 0.6 })); P.sockel.scale.set(s.w, 40, s.d); P.sockel.position.set(0, -20, 0); scene.add(P.sockel);
    P.meshes.push(platte(s, 0));
    const b = store.get('stapelBest', 0); $('spStartRek').textContent = b ? `Dein Rekord: ${b} ${b === 1 ? 'Etage' : 'Etagen'}` : 'Noch kein Rekord.';
    setPhase('start');
  }
  function stop() { P.on = false; leeren(); P.T = null; }
  function back() { stop(); zurueck(); }
  $('spGo').onclick = (e) => { e.stopPropagation(); begin(); }; $('spAgain').onclick = (e) => { e.stopPropagation(); begin(); };
  $('spBack').onclick = back; $('spBack2').onclick = back;
  return { open, stop, frame, active: () => P.on, state: P, back, fallen };
}
