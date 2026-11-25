// Theos Seitenscheidel - Moonsweeper 2: Spielablauf. Ein ganzer Mond, eine Zahnbürste: Staub putzen, im Tank sammeln, beim Händler verkaufen, bessere Werkzeuge, Helfer und Fahrzeuge kaufen.
// Aufbau: moonlogic.js = Regeln und Zahlen (ohne Darstellung), moonart.js = Modelle/Himmel/Boden, hier = Eingabe, Kamera, Anzeige, Speichern, Koop (bis 3 Spieler über net.js; der Host hält Kasse und Helfer).
import * as THREE from './vendor/three.module.min.js';
import * as L from './moonlogic.js';
import * as A from './moonart.js';
import * as Fab from './moonfactory.js';
import * as FA from './moonfabart.js';
import { createMoonSound } from './moonsound.js';
import { buildMoonBall } from './moonintro.js';
import { createFinale } from './moonfinale.js';

const { BASE, LOT, TOOLS, PACKS, VEHICLES, HELPERS, STATION_UP, OUTPOSTS, MOON_SIZE, CHUNK_N, CHUNK_SIZE, CHUNK_CELLS, GRID, GRAVITY, wrapNear, wrapDelta, fmtCr, mod } = L;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const ACCENTS = [{ accent: 0xee7a18, stripe: 0xee7a18 }, { accent: 0xe24a86, stripe: 0xe24a86 }, { accent: 0x2fb8c6, stripe: 0x2fb8c6 }, { accent: 0x4cbf3a, stripe: 0x4cbf3a }]; // Grün: vierter Spieler (nur neue Firmen)
const VEH_LAYOUT = { trike: { x: BASE.garage.x - 14, z: BASE.garage.z - 3, h: Math.PI, r: 1.25, cam: 5.5, brushZ: 1.5, accel: 6 }, bus: { x: BASE.garage.x, z: BASE.garage.z, h: Math.PI, r: 1.6, cam: 7.5, brushZ: -2.6, accel: 7 }, truck: { x: BASE.garage.x + 15, z: BASE.garage.z - 2, h: Math.PI, r: 2.4, cam: 11, brushZ: 3.5, accel: 5 } };
const SAVE_KEY = 'moon.save';
const slotOf = (id) => (id === 'host' ? 0 : ((parseInt(String(id).slice(1), 10) - 1) % 3) + 1); // Farbe je Spieler: auf allen PCs gleich (p1 Pink, p2 Türkis, p3 Grün)
export const moonCap = (sv) => (!sv || sv.p4 ? 4 : 3); // neue Firmen (ab 1.14.0) sind für bis zu vier Spieler, alte Spielstände bleiben bei drei
const TITLE = { x: 556, z: 600, b: 4.06, busX: 549.1, busZ: 590.1, busH: -0.15, aX: 553, aZ: 592.6 };

// Staubraster in IndexedDB (zu groß für localStorage)
function idb() { return new Promise((res, rej) => { const r = indexedDB.open('moonsweeper', 1); r.onupgradeneeded = () => r.result.createObjectStore('dust'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function idbPut(key, v) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('dust', 'readwrite'); t.objectStore('dust').put(v, key); t.oncomplete = () => { db.close(); res(); }; t.onerror = () => rej(t.error); }); }
async function idbGet(key) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('dust', 'readonly'); const q = t.objectStore('dust').get(key); q.onsuccess = () => { db.close(); res(q.result); }; q.onerror = () => rej(q.error); }); }
async function idbPutMany(map) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('dust', 'readwrite'); const st = t.objectStore('dust'); for (const [k, v] of map) st.put(v, k); t.oncomplete = () => { db.close(); res(); }; t.onerror = () => rej(t.error); }); }
async function idbAll() { const db = await idb(); return new Promise((res, rej) => { const out = new Map(); const q = db.transaction('dust', 'readonly').objectStore('dust').openCursor(); q.onsuccess = () => { const c = q.result; if (c) { out.set(c.key, c.value); c.continue(); } else { db.close(); res(out); } }; q.onerror = () => rej(q.error); }); }
async function idbClear() { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('dust', 'readwrite'); t.objectStore('dust').clear(); t.oncomplete = () => { db.close(); res(); }; t.onerror = () => rej(t.error); }); }

export function createMoon(host) {
  const { renderer, audio, $, store, keys, settings, showScreen, down, G } = host;
  const M = { phase: 'off', W: null, E: L.createEconomy(), D: null, P: null, veh: {}, helpers: [], others: new Map(), mp: null, ui: null, t: 0, inbox: [], lmb: false, view: 'third', moved: 0, autoBrush: false, net: { acc: 0, strokes: [], hs: {}, slow: 0 }, floats: [], flows: [], res: { i: 0, low: 0, t: 0, n: 0, last: 0 }, pumpN: 0, F: Fab.createFactory(), build: null, tut: 0, dirtyEco: false, saveT: 0, hudT: 0, mapT: 0, screenT: 0, won: false };
  const el = (id) => $(id); const snd = createMoonSound(audio);
  // Knopf-Geräusche für das ganze Spiel
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('button')) { audio.init(); snd.click(); } }, true);
  document.addEventListener('pointerover', (e) => { const b = e.target.closest ? e.target.closest('button') : null; if (b && b !== M.hoverBtn && !b.disabled) snd.hover(); M.hoverBtn = b; });

  // ---------------- Welt bauen (einmalig, beim ersten Start) ----------------
  const pause = () => new Promise((r) => setTimeout(r, 0));
  async function ensureWorld(step = () => {}) {
    if (M.W) return M.W;
    const W = {}; step('Mondstaub wird angeliefert …'); await pause();
    const { H, craters } = L.buildHeight(); W.H = H; W.craters = craters; W.height = (x, z) => L.heightAt(H, x, z);
    W.scene = new THREE.Scene(); W.scene.background = new THREE.Color(0x01020a);
    W.cam = new THREE.PerspectiveCamera(70, window.innerWidth / Math.max(1, window.innerHeight), 0.12, 2800); W.cam.rotation.order = 'YXZ';
    step('Sterne werden poliert …'); await pause(); W.sky = A.buildSky(); W.scene.add(W.sky); W.ridge = A.buildRidge(); W.scene.add(W.ridge); await pause();
    // Umgebungslicht aus einer kleinen Szene: schwarzer Himmel, heller Boden, Sonne
    const pm = new THREE.PMREMGenerator(renderer); const es = new THREE.Scene(); const skyG = new THREE.Mesh(new THREE.SphereGeometry(40, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'varying vec3 p; void main(){ float y = normalize(p).y; vec3 c = y > 0.0 ? mix(vec3(0.34,0.36,0.46), vec3(0.03,0.04,0.09), pow(y, 0.45)) : mix(vec3(0.62,0.62,0.7), vec3(0.42,0.42,0.48), -y); gl_FragColor = vec4(c, 1.0); }' })); es.add(skyG); const sunB = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(14, 13, 12) })); sunB.position.copy(A.SUN_DIR).multiplyScalar(36); es.add(sunB); W.env = pm.fromScene(es, 0.025).texture; pm.dispose(); W.scene.environment = W.env; W.scene.environmentIntensity = 0.8;
    W.sun = new THREE.DirectionalLight(0xfff3e4, 4.3); W.sun.castShadow = true; W.sun.shadow.mapSize.set(2048, 2048); const sc = W.sun.shadow.camera; sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 5; sc.far = 420; W.sun.shadow.bias = -0.0004; W.sun.shadow.normalBias = 0.035; W.scene.add(W.sun, W.sun.target); W.hemi = new THREE.HemisphereLight(0xa4abd2, 0x8d8da0, 0.95); W.scene.add(W.hemi);
    step('Boden wird ausgerollt …'); await pause();
    W.detail = A.detailTexture(); const white = new THREE.DataTexture(new Uint8Array([255]), 1, 1, THREE.RedFormat); white.magFilter = THREE.LinearFilter; white.needsUpdate = true; W.white = white;
    W.chunks = []; W.root = new THREE.Group(); W.scene.add(W.root); const geos = A.rockGeometries(); const rockM = new THREE.MeshStandardMaterial({ color: 0x8c8b9c, roughness: 0.96, metalness: 0, envMapIntensity: 0.35 }); const rand = L.mulberry(4242); const o = new THREE.Object3D(); W.bigRocks = [];
    for (let cy = 0; cy < CHUNK_N; cy++) for (let cx = 0; cx < CHUNK_N; cx++) {
      const x0 = cx * CHUNK_SIZE; const z0 = cy * CHUNK_SIZE; const g = new THREE.Group(); g.userData.x0 = x0; g.userData.z0 = z0; const mat = A.groundMaterial(white, W.detail); const ground = new THREE.Mesh(A.chunkGeometry(x0, z0, W.height), mat); ground.receiveShadow = true; g.add(ground);
      const n = 26; const rocks = new THREE.InstancedMesh(geos[(cx + cy * 3) % 3], rockM, n); for (let i = 0; i < n; i++) { const b = rand(); const s = i < 2 ? 0.8 + b * 1.5 : 0.06 + b * b * 0.5; const lx = rand() * CHUNK_SIZE; const lz = rand() * CHUNK_SIZE; const wx = x0 + lx; const wz = z0 + lz; const near = Math.hypot(wrapDelta(wx, BASE.station.x), wrapDelta(wz, BASE.station.z)) < 104 || Math.hypot(wrapDelta(wx, L.LOT_C.x), wrapDelta(wz, L.LOT_C.z)) < 66 || OUTPOSTS.some((p) => Math.hypot(wrapDelta(wx, p.x), wrapDelta(wz, p.z)) < 16); o.position.set(lx, W.height(wx, wz) + s * 0.12, lz); o.rotation.set(rand() * 0.5, rand() * 6.28, rand() * 0.5); o.scale.setScalar(near ? 0.0001 : s); o.updateMatrix(); rocks.setMatrixAt(i, o.matrix); if (!near && s > 1.0) W.bigRocks.push({ x: wx, z: wz, hx: s * 0.72, hz: s * 0.72 }); } rocks.castShadow = true; rocks.receiveShadow = true; g.add(rocks);
      ground.matrixAutoUpdate = false; rocks.matrixAutoUpdate = false; g.matrixAutoUpdate = false; W.root.add(g); W.chunks.push({ g, ground, rocks, mat, U: mat.userData.U, tex: null, data: null, cx, cy });
      if (cy % 4 === 0 && cx === 0) await pause();
    }
    step('Station wird angedockt …'); await pause();
    W.statics = []; const put = (obj, x, z) => { W.scene.add(obj); obj.userData.mx = x; obj.userData.mz = z; obj.position.set(x, 0, z); W.statics.push(obj); return obj; };
    W.station = put(A.buildStation(), BASE.station.x, BASE.station.z); put(A.buildAnnex(), BASE.station.x - 40, BASE.station.z - 2); W.trader = put(A.buildTrader(), BASE.trader.x, BASE.trader.z); put(A.buildBaseProps({ x: 0, z: 0 }, { x: BASE.trader.x - BASE.station.x, z: 0 }, { x: BASE.garage.x - BASE.station.x, z: BASE.garage.z - BASE.station.z }), BASE.station.x, BASE.station.z);
    W.outposts = {}; for (const op of OUTPOSTS) { const g = put(A.buildOutpost(op.name), op.x, op.z); g.visible = false; W.outposts[op.id] = g; g.position.y = W.height(op.x, op.z); g.userData.y = g.position.y; }
    W.bernd = A.buildAstronaut({ accent: 0xee7a18, stripe: 0xee7a18 }); W.bernd.setTool('broom', 'broom', 0.8); W.scene.add(W.bernd.root); W.bernd.root.userData.mx = BASE.trader.x + 3.6; W.bernd.root.userData.mz = BASE.trader.z - 2.3; W.statics.push(W.bernd.root); W.bernd.root.position.set(W.bernd.root.userData.mx, 0, W.bernd.root.userData.mz);
    W.unload = put(FA.buildUnloadStation(), BASE.unload.x, BASE.unload.z); W.fab = FA.createFactoryView(); put(W.fab.group, LOT.x, LOT.z);
    W.flowM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: 0xc9c8da, roughness: 0.85, emissive: 0x55546a, emissiveIntensity: 0.5 }), 900); W.flowM.frustumCulled = false; W.flowM.castShadow = true; W.flowM.count = 0; W.scene.add(W.flowM); W.flowL = Array.from({ length: 900 }, () => ({ on: false, age: 0, life: 1, ph: 0, r: 1, s: 0.03, sx: 0, sy: 0, sz: 0, cx: 0, cy: 0, cz: 0, dx: 0, dy: 0, dz: 0 })); W.flowI = 0;
    W.staticBlocks = L.staticBlocks(); W.blocks = [...W.staticBlocks, ...W.bigRocks];
    W.player = A.buildAstronaut(ACCENTS[0]); W.scene.add(W.player.root);
    // Kristalle: nur nahe Brocken als Modell (Vorrat an Figuren)
    W.crystals = L.buildCrystals(H); W.crystalPool = []; for (let i = 0; i < 8; i++) { const c = A.buildCrystal(); c.visible = false; W.scene.add(c); W.crystalPool.push(c); }
    // Staubkörner und Staubwolken
    const dG = new THREE.IcosahedronGeometry(1, 0); W.deb = new THREE.InstancedMesh(dG, new THREE.MeshStandardMaterial({ color: 0x77778f, roughness: 1, envMapIntensity: 0.3 }), 900); W.deb.castShadow = true; W.deb.frustumCulled = false; W.deb.count = 0; W.debL = Array.from({ length: 900 }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0, r: 0 })); W.debI = 0; W.scene.add(W.deb);
    const pc = document.createElement('canvas'); pc.width = pc.height = 64; const px = pc.getContext('2d'); const gr = px.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.5)'); gr.addColorStop(0.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); px.fillStyle = gr; px.fillRect(0, 0, 64, 64); const pt = new THREE.CanvasTexture(pc); W.puffs = []; for (let i = 0; i < 44; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, color: 0xb4b3c2, transparent: true, opacity: 0, depthWrite: false })); s.visible = false; W.scene.add(s); W.puffs.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, g: 1 }); } W.puffI = 0;
    W.titleBus = A.buildBus(); W.titleBus.position.set(TITLE.busX, 0, TITLE.busZ); W.titleBus.rotation.y = TITLE.busH; W.titleBus.visible = false; W.scene.add(W.titleBus);
    M.W = W; resize(); step(''); return W;
  }
  function resize() { const W = M.W; if (!W) return; W.cam.aspect = window.innerWidth / Math.max(1, window.innerHeight); W.cam.updateProjectionMatrix(); if (M.intro) { M.intro.cam.aspect = W.cam.aspect; M.intro.cam.updateProjectionMatrix(); } if (M.fin) M.fin.resize(); if (M.phase !== 'off' && M.phase !== 'loading') applyRes(); }
  window.addEventListener('resize', resize);
  window.addEventListener('beforeunload', () => { save(); });
  window.addEventListener('pagehide', () => { save(); }); // Fenster zu: der Staub geht noch in die Datenbank (der Spielstand selbst ist synchron, die Kacheln nicht)

  // ---------------- Staub auf die GPU bringen ----------------
  const TS = CHUNK_CELLS + 1;
  function refreshChunk(c) {
    const ch = M.W.chunks[c]; if (!ch.tex) { ch.data = new Uint8Array(TS * TS); ch.tex = new THREE.DataTexture(ch.data, TS, TS, THREE.RedFormat); ch.tex.magFilter = THREE.LinearFilter; ch.tex.minFilter = THREE.LinearMipmapLinearFilter; ch.tex.generateMipmaps = true; ch.tex.anisotropy = 4; ch.U.uMask.value = ch.tex; }
    const g = M.D.g; const x0 = ch.cx * CHUNK_CELLS; const y0 = ch.cy * CHUNK_CELLS; const d = ch.data;
    for (let y = 0; y < TS; y++) { const row = ((y0 + y) % GRID) * GRID; const o = y * TS; d.set(g.subarray(row + x0, row + x0 + CHUNK_CELLS), o); d[o + CHUNK_CELLS] = g[row + (x0 + CHUNK_CELLS) % GRID]; }
    ch.tex.needsUpdate = true;
  }
  function pumpDirty(cx, cz) {
    const D = M.D; let budget = 5; for (let c = 0; c < D.dirty.length && budget > 0; c++) { if (!D.dirty[c]) continue; const ch = M.W.chunks[c]; const dx = wrapDelta(ch.g.userData.x0 + CHUNK_SIZE / 2, cx); const dz = wrapDelta(ch.g.userData.z0 + CHUNK_SIZE / 2, cz); if (Math.hypot(dx, dz) > 330) continue; D.dirty[c] = 0; refreshChunk(c); budget--; }
  }

  // ---------------- Spielstart / Spielstand ----------------
  function freshPlayer(i = 0) { return { x: BASE.start.x + i * 2.4, y: 0, z: BASE.start.z, vx: 0, vz: 0, vy: 0, yaw: Math.atan2(BASE.station.x - BASE.start.x, BASE.station.z - BASE.start.z), pitch: -0.14, face: 0, speed: 0, ground: true, tool: 'brush', tank: 0, veh: null, seat: -1, driving: false, drillT: 0, hx: 0, hz: 0 }; }
  function newDust() { M.D = L.createDust(); L.prepareBase(M.D); }
  function clearWorld() { const W = M.W; for (const v of Object.values(M.veh)) W.scene.remove(v.model); M.veh = {}; M.vehSave = {}; for (const h of M.helpers) if (h.vis) W.scene.remove(h.vis.root); M.helpers = []; for (const c of W.crystals) { c.gone = false; c.hp = 1; } M.crystT = 0; M.F = Fab.createFactory(); M.flows = []; M.flowBusy = false; M.build = null; }
  async function loadSave() {
    const sv = store.get(SAVE_KEY, null); clearWorld(); newDust(); for (const ch of M.W.chunks) if (ch.tex) M.D.dirty[ch.cy * CHUNK_N + ch.cx] = 1; M.E = L.createEconomy(); M.P = freshPlayer(); M.tut = 0; M.won = false; M.p4 = !sv || !!sv.p4;
    if (!sv) return false;
    Object.assign(M.E, sv.E); M.E.owned = { ...sv.E.owned }; M.E.helpers = { ...sv.E.helpers }; Object.assign(M.P, sv.P || {}); M.P.veh = null; M.P.seat = -1; M.P.driving = false; M.tut = sv.tut || 0; M.won = !!sv.won; M.vehSave = sv.veh || {}; M.E.up = { ...(sv.E.up || {}) }; M.E.inv = { ...(sv.E.inv || {}) }; M.E.seen = { ...(sv.E.seen || {}) }; if (sv.fac) Fab.load(M.F, sv.fac);
    for (const h of sv.helpers || []) { const n = L.createHelper(h.type, h.id); Object.assign(n, h); M.helpers.push(n); }
    if (M.W) for (const i of sv.crystals || []) { if (M.W.crystals[i]) M.W.crystals[i].gone = true; }
    try {
      const all = await idbAll(); const put = (c, u, half) => { const cy = (c / CHUNK_N) | 0; const cx = c % CHUNK_N; for (let y = 0; y < CHUNK_CELLS; y++) { const row = (cy * CHUNK_CELLS + y) * GRID + cx * CHUNK_CELLS; for (let x = 0; x < CHUNK_CELLS; x++) { const nv = half ? u[(y >> 1) * (CHUNK_CELLS >> 1) + (x >> 1)] : u[y * CHUNK_CELLS + x]; M.D.remaining += nv - M.D.g[row + x]; M.D.g[row + x] = nv; } } M.D.touched[c] = 1; M.D.changed[c] = 1; M.D.dirty[c] = 1; M.D.dirty[cy * CHUNK_N + mod(cx - 1, CHUNK_N)] = 1; M.D.dirty[mod(cy - 1, CHUNK_N) * CHUNK_N + cx] = 1; M.D.dirty[mod(cy - 1, CHUNK_N) * CHUNK_N + mod(cx - 1, CHUNK_N)] = 1; };
      let any = false; for (const [k, v] of all) if (typeof k === 'string' && k.startsWith('c') && v && v.length === CHUNK_CELLS * CHUNK_CELLS) { put(Number(k.slice(1)), v, false); any = true; }
      if (!any && all.get('grid')) { const old = all.get('grid'); for (const k of Object.keys(old)) if (old[k].length === (CHUNK_CELLS * CHUNK_CELLS) / 4) put(Number(k), old[k], true); } // alter Spielstand (Raster 25 cm)
      L.rebuildBlocks(M.D); /* Staub-Übersicht der Helfer neu rechnen: der Staub kam am Zähler vorbei direkt in die Zellen */ L.cleanBase(M.D); for (let c = 0; c < M.D.changed.length; c++) if (any) M.D.changed[c] = 0;
    } catch (e) { console.warn('Mond-Spielstand: Staubraster nicht lesbar', e); }
    return true;
  }
  async function save() {
    if (M.phase !== 'play' || (M.mp && !M.mp.host)) return; const P = M.P; const veh = {}; for (const id of Object.keys(M.veh)) { const v = M.veh[id]; veh[id] = { x: v.x, z: v.z, h: v.h, kg: v.kg }; }
    store.set(SAVE_KEY, { v: 2, p4: !!M.p4, savedAt: Date.now(), E: M.E, tut: M.tut, won: M.won, P: { x: P.x, z: P.z, yaw: P.yaw, tool: P.tool, tank: P.tank }, helpers: M.helpers.map((h) => ({ type: h.type, id: h.id, x: h.x, z: h.z, kg: h.kg, ax: h.ax, az: h.az, lane: h.lane, dir: h.dir, gen: h.gen, st: h.st })), veh, crystals: M.W.crystals.filter((c) => c.gone).map((c) => c.i), fac: Fab.dump(M.F) });
    try { const D = M.D; const out = new Map(); for (let c = 0; c < D.changed.length; c++) { if (!D.changed[c]) continue; D.changed[c] = 0; const cy = (c / CHUNK_N) | 0; const cx = c % CHUNK_N; const u = new Uint8Array(CHUNK_CELLS * CHUNK_CELLS); for (let y = 0; y < CHUNK_CELLS; y++) { const row = (cy * CHUNK_CELLS + y) * GRID + cx * CHUNK_CELLS; u.set(D.g.subarray(row, row + CHUNK_CELLS), y * CHUNK_CELLS); } out.set('c' + c, u); } if (out.size) await idbPutMany(out); } catch (e) { console.warn('Mond-Spielstand: Staubraster nicht gespeichert', e); }
  }
  async function resetSave() { store.set(SAVE_KEY, null); try { await idbClear(); } catch { /* egal */ } }

  async function open() { // Hauptmenü -> Titelbild
    G.mode = 'moon'; G.prevMode = 'moon'; showScreen('loading'); $('hud').classList.add('hidden'); const ld = document.querySelector('#loading h2'); const ls = document.querySelector('#loading .sub'); const oldH = ld.textContent; const oldS = ls.textContent; ld.textContent = 'Moonsweeper 2'; M.phase = 'loading'; audio.init();
    await ensureWorld((t) => { ls.textContent = t || 'Gleich geht es los …'; }); ld.textContent = oldH; ls.textContent = oldS; setPlayerSlot(0);
    await loadSave(); applyRenderer(true); M.t = 0; showScreen(null); M.phase = 'title'; el('moonTitle').classList.remove('hidden'); placeVehicles(); syncOwnedWorld(); applySpawn(); renderTitle();
  }
  function titlePose() { const W = M.W; const on = M.phase === 'title'; W.titleBus.visible = on; const R = W.player; if (!on) return; R.root.visible = true; if (M.ghosted) { M.ghosted = false; R.ghost(false); } R.root.position.set(TITLE.aX, 0, TITLE.aZ); R.root.rotation.y = 0.45; R.setTool('broom', 'broom', 1.05); A.poseAstronaut(R, { speed: 0, scrub: true, oscW: 0.16 }, 0.016); }
  function renderTitle() { const sv = store.get(SAVE_KEY, null); el('moContinue').classList.toggle('hidden', !sv); el('moNew').textContent = sv ? 'Neue Firma gründen' : 'Firma gründen'; el('moNew').classList.toggle('primary', !sv); M.newConfirm = false; el('moSaveInfo').textContent = sv ? `Spielstand: ${L.companyOf(sv.E).name} · ${fmtCr(sv.E.credits)} Cr · gespeichert ${new Date(sv.savedAt).toLocaleString('de-DE')}` : ''; }
  function applyRenderer(on) { if (on) { M.prevTone = renderer.toneMapping; M.prevExp = renderer.toneMappingExposure; M.prevAuto = renderer.shadowMap.autoUpdate; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0; renderer.shadowMap.autoUpdate = true; M.W.sun.castShadow = settings.shadows && settings.quality !== 'low'; applyRes(); } else if (M.prevTone !== undefined) { renderer.toneMapping = M.prevTone; renderer.toneMappingExposure = M.prevExp; renderer.shadowMap.autoUpdate = M.prevAuto; host.resize(); } }
  // Schatten: three.js nimmt für alles dasselbe Tiefen-Material und sucht bei jedem Wechsel zwischen Einzel- und Vielfach-Objekten das Programm neu. Vielfach-Objekte bekommen deshalb ein eigenes.
  const instDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  function tagDepth() { M.W.scene.traverse((o) => { if (o.isInstancedMesh && !o.customDepthMaterial) o.customDepthMaterial = instDepth; }); }
  // Automatische Auflösung: Hält der Rechner die Bildrate nicht, rechnet Moonsweeper mit weniger Pixeln (L.tuneRes). Fenster, Pause und Karte zählen nicht mit.
  function applyRes() { const target = Math.max(0.6, host.baseDpr() * L.RES_STEPS[M.res.i]); if (renderer.getPixelRatio() !== target) { renderer.setPixelRatio(target); renderer.setSize(window.innerWidth, window.innerHeight, false); } if (M.res.i >= 2 && M.W.sun.shadow.mapSize.x > 1024) { M.W.sun.shadow.mapSize.set(1024, 1024); if (M.W.sun.shadow.map) { M.W.sun.shadow.map.dispose(); M.W.sun.shadow.map = null; } } }
  function watchRes() { const Q = M.res; const n = performance.now(); const gap = n - Q.last; Q.last = n; if (gap > 400 || M.ui || M.mapOpen || G.mode !== 'moon') { Q.t = 0; Q.n = 0; return; } Q.t += gap; Q.n++; if (Q.t < 2500) return; const fps = Q.n / (Q.t / 1000); Q.t = 0; Q.n = 0; if (L.tuneRes(Q, fps)) { applyRes(); floatText('Bildrate niedrig: Auflösung automatisch gesenkt'); } }
  function setPlayerSlot(slot) { const W = M.W; if ((W.playerSlot || 0) === slot) return; W.scene.remove(W.player.root); W.player = A.buildAstronaut(ACCENTS[slot]); W.scene.add(W.player.root); W.playerSlot = slot; M.ghosted = false; }
  function applySpawn() { const P = M.P; P.y = M.W.height(P.x, P.z); equip(); }
  function rigTool(R, id) { const T = toolById(id); R.setTool(T.id + ':' + L.upLevel(M.E, T.id, 'w'), T.kind, L.toolStats(M.E, T).w - 2 * L.toolOsc(T)); }
  function equip() { rigTool(M.W.player, M.P.tool); }
  const toolById = (id) => TOOLS.find((t) => t.id === id) || TOOLS[0];
  function beginPlay() { // vom Titelbild ins Spiel
    M.phase = 'play'; titlePose(); applySpawn(); el('moonTitle').classList.add('hidden'); el('moonHud').classList.remove('hidden'); buildHotbar(); M.saveT = 0; hudTick(true); toggleLook(true); updateKeys();
  }
  // ---------------- Vorspann: vom Weltall bis zum Charakter ----------------
  const T_SPACE = 7.6; const T_FLY = 5; const T_TEXT = 3.4;
  const ease = (x) => x * x * (3 - 2 * x); const _a = new THREE.Vector3(); const _b = new THREE.Vector3(); 
  function startIntro(back = false) {
    const W = M.W; M.phase = 'intro'; el('moonTitle').classList.add('hidden'); el('moIntro').classList.remove('hidden'); el('moFade').classList.remove('hidden'); el('moFade').style.background = '#000'; el('moFade').style.opacity = '1'; applySpawn(); W.titleBus.visible = false; if (M.ghosted) { M.ghosted = false; W.player.ghost(false); }
    el('moIntroH').textContent = back ? 'WEITER GEHT\'S!' : 'RÄUM JETZT AUF!'; el('moIntroP').textContent = back ? `Noch ${(100 - L.percentClean(M.D)).toFixed(2).replace('.', ',')} % vom Mond sind dreckig.` : 'Du musst den ganzen Mond putzen.';
    const S = new THREE.Scene(); S.background = new THREE.Color(0x01020a); const dome = new THREE.Mesh(W.sky.children[0].geometry, W.sky.children[0].material); dome.renderOrder = -10; S.add(dome); const { ball, dispose } = buildMoonBall(); ball.rotation.y = -1.25; S.add(ball); const sun = new THREE.DirectionalLight(0xfff4e8, 3.4); sun.position.set(-0.55, 0.45, 0.75); S.add(sun); S.add(new THREE.HemisphereLight(0x9aa6d0, 0x4a4a5a, 0.8));
    const cam = new THREE.PerspectiveCamera(38, window.innerWidth / Math.max(1, window.innerHeight), 1, 4000); const P = M.P; const sn = Math.sin(P.yaw); const cs = Math.cos(P.yaw); const pz = P.pitch; const end = new THREE.Vector3(P.x - sn * Math.cos(pz) * 4.3, P.y + 1.55 - Math.sin(pz) * 4.3 + 0.25, P.z - cs * Math.cos(pz) * 4.3);
    M.intro = { t: 0, back, S, cam, ball, dome, dispose, end, skip: false, stage: 0, look: new THREE.Vector3(P.x, P.y + 1.55, P.z), p0: new THREE.Vector3(end.x - sn * 110 - cs * 44, P.y + 235, end.z - cs * 110 + sn * 44), p1: new THREE.Vector3(end.x - sn * 30, P.y + 22, end.z - cs * 30) }; audio.init(); snd.swell(T_SPACE);
  }
  function finishIntro() { const I = M.intro; I.dispose(); M.intro = null; el('moIntro').classList.add('hidden'); el('moIntroT').classList.add('hidden'); el('moFade').classList.add('hidden'); el('moFade').style.opacity = '0'; M.W.cam.fov = 70; M.W.cam.updateProjectionMatrix(); beginPlay(); const g = el('moGuide'); g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop'); }
  function stepIntro(dt) {
    const I = M.intro; const W = M.W; if (I.skip) { finishIntro(); return; } I.t += dt; const t = I.t; const fade = el('moFade');
    if (t < T_SPACE) { const u = t / T_SPACE; const e = Math.pow(ease(u), 1.5); const d = 1020 + (108 - 1020) * e; const c = I.cam; const a = 0.5 - u * 0.5; c.position.set(Math.sin(a) * d, 26 * (1 - e) + 22 * e, Math.cos(a) * d); c.lookAt(0, 26 * (1 - e), 0); if (e > 0.6) c.rotateX(-(e - 0.6) * 0.5); I.dome.position.copy(c.position); I.ball.rotation.y += dt * 0.022; fade.style.opacity = String(t < 1.4 ? 1 - t / 1.4 : t > T_SPACE - 1.2 ? (t - (T_SPACE - 1.2)) / 1.2 : 0); fade.style.background = t < 2 ? '#000' : '#d6d6e4'; renderer.render(I.S, c); return; }
    if (I.stage === 0) { I.stage = 1; snd.whoosh(); W.cam.fov = 58; W.cam.updateProjectionMatrix(); }
    const u = Math.min(1, (t - T_SPACE) / T_FLY); const e = 1 - Math.pow(1 - ease(u), 2); const P = M.P; const c = W.cam; _a.copy(I.p0).lerp(I.p1, e); _b.copy(I.p1).lerp(I.end, e); c.position.copy(_a).lerp(_b, e); c.lookAt(I.look); c.fov = 58 + (70 - 58) * e; c.updateProjectionMatrix(); fade.style.opacity = String(Math.max(0, 1 - (t - T_SPACE) / 0.9));
    const T0 = toolById(P.tool); poseRig(W.player, P, { ...T0 }, dt); pumpDirty(P.x, P.z); stepFx(dt); placeWorld(); renderer.render(W.scene, c);
    if (t >= T_SPACE + T_FLY - 0.35 && I.stage === 1) { I.stage = 2; if (I.back) el('moIntroP').textContent = `Noch ${(100 - L.percentClean(M.D)).toFixed(2).replace('.', ',')} % vom Mond sind dreckig.`; el('moIntroT').classList.remove('hidden'); snd.arrive(); }
    if (t >= T_SPACE + T_FLY + T_TEXT) finishIntro();
  }
  const toggleLook = (on) => host.toggleLook(on);
  // ---------------- Abschlussfilm: der ganze Mond ist sauber und strahlt die Erde an (moonfinale.js) ----------------
  function playFinale() {
    if (M.fin || M.phase !== 'play') return; closePanel(); closeMap(); if (M.build) toggleBuild(false); toggleLook(false); stopLoops(); M.phase = 'finale';
    M.fin = createFinale({ renderer, W: M.W, snd, el, renderGame: () => { placeWorld(); renderer.render(M.W.scene, M.W.cam); }, showText: () => { el('moIntroH').textContent = 'DER MOND IST SAUBER!'; el('moIntroP').textContent = 'Er glänzt so hell, dass er die ganze Erde anstrahlt.'; el('moIntroT').style.top = '66%'; el('moIntroT').classList.remove('hidden'); } });
    M.fin.startRise(); el('moonHud').classList.add('hidden'); el('moIntro').classList.remove('hidden'); el('moIntroT').classList.add('hidden'); el('moFade').classList.remove('hidden'); el('moFade').style.opacity = '0'; audio.init(); M.finSeen = (M.finSeen || 0) + 1;
  }
  function stepFinale(dt) { const F = M.fin; if (!F) { M.phase = 'play'; return; } if (F.skip || !F.step(Math.min(dt, 0.1))) endFinale(false); }
  function endFinale(quiet) { const F = M.fin; if (!F) return; M.fin = null; F.dispose(); el('moIntroT').style.top = ''; el('moIntro').classList.add('hidden'); el('moIntroT').classList.add('hidden'); el('moFade').classList.add('hidden'); el('moFade').style.opacity = '0'; if (quiet) return; M.phase = 'play'; el('moonHud').classList.remove('hidden'); poseCamera(0); hudTick(true); toggleLook(true); floatText('DER MOND IST SAUBER. Die Erde strahlt. Der Vorstand fragt nach dem Mars.', 'big'); }
  function stop() { if (M.phase === 'off') return; if (M.fin) endFinale(true); save(); if (M.intro) { M.intro.dispose(); M.intro = null; el('moIntro').classList.add('hidden'); el('moFade').classList.add('hidden'); } M.phase = 'off'; M.build = null; if (M.W) M.W.fab.hideGhost(); el('moCross').classList.add('hidden'); el('moBuildInfo').classList.add('hidden'); el('moonTitle').classList.add('hidden'); el('moonHud').classList.add('hidden'); closePanel(); closeMap(); if (M.W) applyRenderer(false); toggleLook(false); stopLoops(); if (M.mp) { M.mp = null; M.others.forEach((o) => M.W.scene.remove(o.rig.root)); M.others.clear(); } }
  // Koop: vom Lobby-Raum (mp.js) aus
  async function startCoop({ net, host: isHost }) {
    G.mode = 'moon'; G.prevMode = 'moon'; showScreen('loading'); M.phase = 'loading'; M.inbox = []; M.mdBuf = {}; M.net = { acc: 0, strokes: [], hs: {}, slow: 0 }; M.mp = { net, host: isHost }; audio.init(); await ensureWorld(); setPlayerSlot(slotOf(net.me.id));
    if (isHost) await loadSave(); else { clearWorld(); newDust(); for (const ch of M.W.chunks) if (ch.tex) M.D.dirty[ch.cy * CHUNK_N + ch.cx] = 1; M.E = L.createEconomy(); M.P = freshPlayer(1); M.tut = 3; }
    applyRenderer(true); showScreen(null); M.t = 0; placeVehicles(); syncOwnedWorld(); applySpawn(); if (M.noIntro) beginPlay(); else startIntro(true); // auch im Mehrspieler der Anflug vom Mond zur Figur
    if (isHost) { for (const p of net.players) if (p.id !== 'host') sendWorld(p.id); } else { const q = M.inbox; M.inbox = []; for (const [f, m] of q) onMessage(f, m); }
  }

  // ---------------- Fahrzeuge ----------------
  function makeVehicle(id) { const spec = VEHICLES.find((v) => v.id === id); const lay = VEH_LAYOUT[id]; const model = id === 'bus' ? A.buildBus() : id === 'truck' ? A.buildTruck() : A.buildTrike(); M.W.scene.add(model); model.rotation.order = 'YXZ'; const wheels = []; model.traverse((o) => { if (o.userData.wheel) { o.rotation.order = 'YXZ'; wheels.push(o); } }); const sv = (M.vehSave || {})[id] || {}; const v = { id, spec, lay, model, wheels, x: sv.x !== undefined ? sv.x : lay.x, z: sv.z !== undefined ? sv.z : lay.z, h: sv.h !== undefined ? sv.h : lay.h, sp: 0, steer: 0, kg: sv.kg || 0, driver: null, riders: [], brush: false, hx: 0, hz: 0, y: 0, pitch: 0, roll: 0, spin: 0 }; poseVehicle(v, 0.05); M.veh[id] = v; return v; }
  function fitBrush(v) { const k = L.vehStats(M.E, v.spec).w / v.spec.w; const u = v.model.userData; if (u.bar) u.bar.scale.x = k; if (u.spin) for (const b of u.spin) { if (b.userData.x0 === undefined) b.userData.x0 = b.position.x; b.position.x = b.userData.x0 * k; b.scale.x = k; b.scale.z = k; } }
  function placeVehicles() { for (const id of Object.keys(M.veh)) { M.W.scene.remove(M.veh[id].model); } M.veh = {}; for (const s of VEHICLES) if (M.E.owned[s.id]) makeVehicle(s.id); }
  function poseVehicle(v, dt) {
    const H = M.W.height; const sn = Math.sin(v.h); const cs = Math.cos(v.h); const l = v.id === 'truck' ? 2.2 : 1.4; const w = 0.9; const hF = H(v.x + sn * l, v.z + cs * l); const hR = H(v.x - sn * l, v.z - cs * l); const hA = H(v.x + cs * w, v.z - sn * w); const hB = H(v.x - cs * w, v.z + sn * w);
    const y = (hF + hR) / 2; v.y = v.y ? damp(v.y, y, 12, dt) : y; v.pitch = damp(v.pitch, Math.atan2(hF - hR, 2 * l), 8, dt); v.roll = damp(v.roll, Math.atan2(hA - hB, 2 * w), 8, dt);
    const m = v.model; const b = v.sp ? Math.sin(M.t * 15 + v.x) * 0.012 * Math.min(1, Math.abs(v.sp) / 6) : 0; m.position.set(v.x, v.y + b, v.z); m.rotation.set(-v.pitch, v.h, v.roll);
    const wr = v.id === 'truck' ? 0.72 : v.id === 'bus' ? 0.5 : 0.44; v.spin += (v.sp / wr) * dt; for (const o of v.wheels) { o.rotation.x = v.spin; if (o.userData.front) o.rotation.y = v.steer * 0.5; }
    if (m.userData.spin) for (const s of m.userData.spin) s.rotation.y += (v.brush ? 16 : 0.4) * dt;
  }
  function stepVehicle(v, dt, input) {
    const tk = M.turbo && v.id === 'bus' ? 100 : 1; // Geheimer Turbo (Taste L): Tempo, Anfahren und Putzen 100-fach
    if (tk > 1 && !v.sub) { const n = Math.min(40, Math.ceil(Math.abs(v.sp) * dt / 6)); if (n > 1) { v.sub = true; for (let i = 0; i < n; i++) stepVehicle(v, dt / n, input); v.sub = false; return; } } // in Teilschritte zerlegen, damit Bürste und Kollision nichts überspringen
    const s = L.vehStats(M.E, v.spec); const a = v.lay.accel * tk; v.sp += input.th * a * dt; if (!input.th) v.sp = damp(v.sp, 0, 0.9, dt); if (input.th < 0 && v.sp > 0) v.sp += input.th * a * dt * 1.6; const brushK = v.brush ? 0.7 : 1; v.sp = clamp(v.sp, -s.speed * 0.4 * tk, s.speed * brushK * tk);
    v.steer = damp(v.steer, input.st, 5, dt); const rad = v.id === 'truck' ? 8 : v.id === 'bus' ? 6.5 : 4.2; v.h += (v.sp / rad) * v.steer * dt; v.x += Math.sin(v.h) * v.sp * dt; v.z += Math.cos(v.h) * v.sp * dt;
    if (L.collideBlocks(v, v.lay.r, M.W.blocks)) { if (Math.abs(v.sp) > 3) { audio.thud && audio.thud(Math.abs(v.sp)); } v.sp *= -0.25; }
    poseVehicle(v, dt);
    // Bürste
    const bz = v.lay.brushZ; const hx = v.x + Math.sin(v.h) * bz; const hz = v.z + Math.cos(v.h) * bz;
    if (v.brush && Math.abs(v.sp) > 0.15 && s.w > 0) { const room = s.tank - v.kg; if (room <= 0) { floatOnce('tankv', 'Fahrzeugtank voll: ab zur Entladestation!'); } else { const a = v.h; const px = v.hx || hx; const pz = v.hz || hz; const pa = v.ha === undefined ? a : v.ha; const rate = (s.rate * dt + 2) * tk; const got = L.sweepBar(M.D, px, pz, pa, hx, hz, a, s.w, s.d, rate, room); v.kg += got; queueStroke(px, pz, pa, hx, hz, a, s.w, s.d, rate); if (got > 0) brushFx(hx, hz, a, s.w, v.id === 'truck' ? 1.6 : 1.1, -Math.sign(v.lay.brushZ)); } }
    v.hx = hx; v.hz = hz; v.ha = v.h;
  }
  // Einsteigen läuft über den Host (Plätze sind begrenzt)
  function vehRequest(id, on) { if (M.mp && !M.mp.host) { M.mp.net.send({ t: 'mveh', id, on }); return; } hostVeh('host', id, on); }
  function hostVeh(pid, id, on) {
    const v = M.veh[id]; if (!v) return;
    if (on) { for (const o of Object.values(M.veh)) if (o.riders.includes(pid)) return; if (v.riders.length >= v.spec.seats) { if (pid === 'host') floatText('Alle Plätze belegt'); else M.mp.net.sendTo(pid, { t: 'mT', text: 'Alle Plätze belegt' }); return; } v.riders.push(pid); }
    else { v.riders = v.riders.filter((r) => r !== pid); }
    v.driver = v.riders[0] || null; if (!v.driver) { v.sp = 0; v.brush = false; } applySeat(); pushVehicles();
  }
  const myId = () => (M.mp ? M.mp.net.me.id : 'host');
  function applySeat() {
    const me = myId(); const P = M.P; let found = null; for (const v of Object.values(M.veh)) if (v.riders.includes(me)) found = v;
    if (found) { const seat = found.riders.indexOf(me); const was = P.veh; P.veh = found.id; P.seat = seat; P.driving = seat === 0; if (was !== found.id) { found.hx = 0; found.hz = 0; found.ha = undefined; M.autoBrush = false; if (M.build) toggleBuild(false); snd.door(); updateKeys(); } }
    else if (P.veh) { const v = M.veh[P.veh]; P.veh = null; P.seat = -1; P.driving = false; if (v) { const r = v.lay.r + 1.5; P.x = v.x + Math.cos(v.h) * r; P.z = v.z - Math.sin(v.h) * r; P.vx = P.vz = 0; P.y = M.W.height(P.x, P.z); L.collideBlocks(P, 0.5, M.W.blocks); } snd.door(); updateKeys(); }
  }

  // ---------------- Eingabe ----------------
  function onKey(code, isDown, repeat) {
    if (M.phase === 'intro') { if (code === 'Space' || code === 'Enter' || code === 'Escape') M.intro.skip = true; return true; }
    if (M.phase === 'finale') { if (isDown && (code === 'Space' || code === 'Enter' || code === 'Escape')) M.fin.skip = true; return true; }
    if (M.phase !== 'play' && M.phase !== 'title') return false;
    if (code === 'Escape') { if (M.phase === 'title') { exitToMenu(); return true; } if (M.ui) { closePanel(); return true; } if (M.mapOpen) { closeMap(); return true; } if (M.build) { toggleBuild(false); return true; } return false; }
    if (M.phase !== 'play' || M.ui || G.mode !== 'moon') return M.ui ? code !== 'KeyF' : false;
    if (repeat) return code === 'Tab';
    if (code === 'KeyH') { M.guideOff = !M.guideOff; el('moGuide').classList.toggle('off', M.guideOff); return true; }
    if (code === 'KeyB') { toggleBuild(); return true; }
    if (M.build) { const B = M.build; if (code === 'KeyR') { B.d = (B.d + 1) % 4; B.last = null; snd.turn(); return true; } if (code === 'KeyQ') { B.l = Math.max(0, B.l - 1); B.last = null; snd.turn(); return true; } if (code === 'KeyE') { B.l = Math.min(99, B.l + 1); B.last = null; snd.turn(); return true; } if (code === 'KeyX') { removeAim(); return true; } if (code.startsWith('Digit')) { const q = partList()[Number(code.slice(5)) - 1]; if (q) { B.part = q.id; B.last = null; buildHotbar(); snd.turn(); } return true; } }
    if (code === 'KeyE') { interact(); return true; } if (code === 'Tab') { if (M.mapOpen) closeMap(); else openMap(); return true; } if (code === 'KeyV') { M.view = M.view === 'third' ? 'first' : 'third'; return true; }
    if (code === 'KeyL') { const P = M.P; if (P.driving && P.veh === 'bus') { M.turbo = !M.turbo; floatText(M.turbo ? 'Geheimer Turbo an: 100-fach' : 'Turbo aus'); return true; } return false; } // Geheimtaste im Bus: 100-fach fahren und putzen
    if (code === 'KeyQ') { const P = M.P; if (P.driving) { M.autoBrush = !M.autoBrush; floatText(M.autoBrush ? 'Bürsten laufen' : 'Bürsten aus'); } return true; }
    if (code.startsWith('Digit')) { const n = Number(code.slice(5)) - 1; const list = ownedTools(); if (list[n]) selectTool(list[n].id); return true; }
    return false;
  }
  const ownedTools = () => TOOLS.filter((t) => M.E.owned[t.id]);
  function selectTool(id) { M.P.tool = id; equip(); buildHotbar(); }
  function cycleTool(d) { const l = ownedTools(); const i = l.findIndex((t) => t.id === M.P.tool); selectTool(l[(i + d + l.length) % l.length].id); }
  function pointerDown(e) { if (M.phase === 'intro') { M.intro.skip = true; return; } if (M.phase === 'finale') { M.fin.skip = true; return; } if (M.phase !== 'play' || M.ui || M.mapOpen) return; if (M.build && !G.locked && !M.testBuild) { toggleLook(true); return; } if (!G.locked) toggleLook(true); if (e.button === 0) M.lmb = true; if (e.button === 2 && M.build) removeAim(); }
  function pointerUp() { M.lmb = false; }
  function mouseLook(dx, dy) { if (M.phase !== 'play' || M.ui) return; const P = M.P; P.yaw -= dx * 0.0024; P.pitch = clamp(P.pitch - dy * 0.0022, -1.2, 1.1); }
  function wheel(e) { if (M.phase !== 'play' || M.ui || M.P.veh) return; if (M.build) { const l = partList(); if (l.length) { const i = l.findIndex((q) => q.id === M.build.part); M.build.part = l[(i + (e.deltaY > 0 ? 1 : -1) + l.length) % l.length].id; M.build.last = null; buildHotbar(); snd.turn(); } return; } cycleTool(e.deltaY > 0 ? 1 : -1); }
  window.addEventListener('wheel', wheel, { passive: true });

  // Was liegt in Reichweite?
  function nearby() {
    const P = M.P; const out = {}; const dist = (x, z) => Math.hypot(wrapDelta(x, P.x), wrapDelta(z, P.z));
    if (P.veh) { const v = M.veh[P.veh]; const near = L.nearestSell(M.E, v.x, v.z); const un = Math.hypot(wrapDelta(BASE.unload.x, v.x), wrapDelta(BASE.unload.z, v.z)) < 7.5; if ((near.dist < 9 || un) && v.kg > 0.01 && P.driving) { out.sellV = v; out.unload = un; } const ik = Fab.intakes(M.F).find((e) => dist(fabX(e), fabZ(e)) < 7.5); if (ik && v.kg > 0.01 && P.driving) out.depV = ik; out.exit = true; return out; }
    const near = L.nearestSell(M.E, P.x, P.z); if (dist(BASE.trader.x + 3.6, BASE.trader.z + 0.3) < 3.4) out.shop = true; if (near.dist < 5.5 && (P.tank > 0.005 || !out.shop)) out.sell = true; // Am Tresen mit leerem Tank gilt der Händler, nicht der Trichter
    if (dist(BASE.station.x - 8, BASE.station.z - 5.6) < 3.2) out.terminal = true;
    if (dist(BASE.station.x + 6, BASE.station.z + 1.2) < 3.6) out.globe = true;
    if (dist(BASE.station.x + L.STATION.hx - 5.8, BASE.station.z - 4) < 3.3) out.tech = true;
    if (dist(BASE.station.x - 12.5, BASE.station.z + 5.2) < 3.2) out.upgrade = true;
    for (const e of M.F.ents) { if (e.t === 'belt' || dist(fabX(e), fabZ(e)) > (Fab.sizeOf(e.t) > 1 ? 4.6 : 3.6)) continue; if (e.t === 'intake' && P.tank > 0.005) out.intake = e; out.fab = e; break; }
    let bestV = 2.2; for (const v of Object.values(M.veh)) { const d = dist(v.x, v.z) - v.lay.r; if (d < bestV) { bestV = d; out.veh = v; } }
    return out;
  }
  function interact() {
    if (M.flowBusy) return;
    const n = nearby(); const P = M.P;
    if (n.sellV) { sellNow(n.sellV.kg, n.sellV, n.unload); return; } if (n.depV) { depositNow(M.veh[P.veh].kg, M.veh[P.veh], n.depV); return; } if (n.exit) { vehRequest(P.veh, false); return; }
    if (n.intake) { depositNow(P.tank, null, n.intake); return; }
    if (n.sell && P.tank > 0.005) { sellNow(P.tank, null); return; } if (n.sell) { floatText('Der Tank ist leer. Erst putzen, dann kassieren.'); return; }
    if (n.shop) { openPanel('shop'); return; } if (n.terminal) { openPanel('station'); return; } if (n.tech) { openPanel('tech'); return; } if (n.upgrade) { openPanel('upgrade'); return; } if (n.globe) { openMap(); return; }
    if (n.veh) { vehRequest(n.veh.id, true); }
  }
  const fabX = (e) => LOT.x + (e.x + Fab.sizeOf(e.t) / 2) * LOT.cell; const fabZ = (e) => LOT.z + (e.z + Fab.sizeOf(e.t) / 2) * LOT.cell;
  function sellNow(kg, v, unload) {
    const P = M.P; const pt = L.nearestSell(M.E, P.x, P.z).point; const dst = unload ? { x: BASE.unload.x, y: 4.3, z: BASE.unload.z } : { x: pt.x, y: M.W.height(pt.x, pt.z) + 2.7, z: pt.z };
    startFlow({ kg, v, dst, hood: !!unload, done: () => { if (M.mp && !M.mp.host) { M.mp.net.send({ t: 'msell', kg }); floatText(`${kg.toFixed(1)} kg an den Händler`, 'gold'); } else { const c = L.sell(M.E, kg, M.t, playerName()); floatText(`+${fmtCr(c)} Cr · ${kg.toFixed(1)} kg Mondstaub`, 'gold'); ecoChanged(); if (M.mp) M.mp.net.broadcast({ t: 'mT', text: `${playerName()}: +${fmtCr(c)} Cr`, kind: 'gold' }); } snd.coin(); if (M.tut < 2) M.tut = 2; hudTick(true); } });
  }
  function depositNow(kg, v, e) { startFlow({ kg, v, dst: { x: fabX(e), y: 2.3, z: fabZ(e) }, done: () => { fabOp({ op: 'dep', x: e.x, z: e.z, l: e.l, kg, who: playerName() }); floatText(`${kg.toFixed(1)} kg in die Staubannahme`, 'gold'); snd.coin(); hudTick(true); } }); }
  function startFlow({ kg, v = null, dst, hood = false, done }) {
    const P = M.P; const dur = clamp(0.9 + Math.sqrt(kg) * (v ? 0.2 : 0.17), 1, v ? 5 : 3.2); M.flowBusy = true; snd.suck(dur + 0.35); const f = { kg, v, t: 0, k: 0, dur, em: 0, rate: v ? 420 : 300, hood, done, remote: false, dx: wrapNear(dst.x, P.x), dy: dst.y, dz: wrapNear(dst.z, P.z) }; M.flows.push(f);
    if (M.mp) { const src = flowSrc(f); const m = { t: 'mfl', a: [+src.x.toFixed(1), +src.y.toFixed(1), +src.z.toFixed(1)], b: [+f.dx.toFixed(1), +f.dy.toFixed(1), +f.dz.toFixed(1)], d: dur, h: hood ? 1 : 0 }; if (M.mp.host) M.mp.net.broadcast(m); else M.mp.net.send(m); }
  }
  const _fs = new THREE.Vector3();
  function flowSrc(f) { if (f.remote) return _fs.set(f.sx, f.sy, f.sz); if (f.v) return _fs.set(f.v.x, f.v.y + (f.v.id === 'truck' ? 3.0 : f.v.id === 'bus' ? 2.4 : 1.5), f.v.z); return M.W.player.pack.getWorldPosition(_fs); }
  function emitFlow(f) {
    const W = M.W; const q = W.flowL[W.flowI]; W.flowI = (W.flowI + 1) % W.flowL.length; const s = flowSrc(f); const j = f.v ? 0.8 : 0.16; q.on = true; q.age = 0; q.life = 0.62 + Math.random() * 0.34; q.ph = Math.random() * 6.28; q.r = 0.3 + Math.random() * 0.8; q.s = 0.007 + Math.random() * Math.random() * 0.02; if (Math.random() < 0.012) puff(s.x, s.y, s.z, 0.5);
    q.sx = s.x + (Math.random() - 0.5) * j; q.sy = s.y + (Math.random() - 0.5) * j; q.sz = s.z + (Math.random() - 0.5) * j; q.dx = f.dx + (Math.random() - 0.5) * 0.4; q.dy = f.dy; q.dz = f.dz + (Math.random() - 0.5) * 0.4;
    const mx = (q.sx + q.dx) / 2; const mz = (q.sz + q.dz) / 2; const dist = Math.hypot(q.dx - q.sx, q.dz - q.sz); const px = -(q.dz - q.sz) / (dist || 1); const pz = (q.dx - q.sx) / (dist || 1); const side = 0.28 * dist * (0.7 + Math.random() * 0.5); q.cx = mx + px * side; q.cy = Math.max(q.sy, q.dy) + 1.1 + dist * 0.22; q.cz = mz + pz * side;
  }
  function stepFlows(dt) {
    const W = M.W; let hood = false;
    for (let i = M.flows.length - 1; i >= 0; i--) { const f = M.flows[i]; f.t += dt; const k = Math.min(1, f.t / f.dur); if (!f.remote) { const drain = f.kg * (k - f.k); if (f.v) f.v.kg = Math.max(0, f.v.kg - drain); else M.P.tank = Math.max(0, M.P.tank - drain); } f.k = k; if (f.hood) hood = true; if (k < 1) { f.em += dt * f.rate; while (f.em >= 1) { f.em -= 1; emitFlow(f); } } if (f.t >= f.dur + 0.8) { M.flows.splice(i, 1); if (!f.remote) { M.flowBusy = false; f.done(); } } }
    let n = 0; for (const q of W.flowL) { if (!q.on) continue; q.age += dt; const u = q.age / q.life; if (u >= 1) { q.on = false; continue; } const e = Math.pow(u, 1.8); const a0 = (1 - e) * (1 - e); const b0 = 2 * (1 - e) * e; const c0 = e * e; const w = q.ph + q.age * 12; const r = 4 * e * (1 - e) * 0.42 * q.r; _o.position.set(a0 * q.sx + b0 * q.cx + c0 * q.dx + Math.cos(w) * r, a0 * q.sy + b0 * q.cy + c0 * q.dy + Math.sin(w * 0.7) * r * 0.6, a0 * q.sz + b0 * q.cz + c0 * q.dz + Math.sin(w) * r); _o.rotation.set(0, 0, 0); _o.scale.setScalar(q.s * (1.25 - 0.6 * e)); _o.updateMatrix(); W.flowM.setMatrixAt(n++, _o.matrix); } W.flowM.count = n; W.flowM.instanceMatrix.needsUpdate = true;
    M.unloadK = damp(M.unloadK || 0, hood ? 1 : 0, 5, dt); W.unload.userData.setActive(M.unloadK);
  }
  const playerName = () => (M.mp ? M.mp.net.me.name : 'Du');
  function ecoChanged() { M.dirtyEco = true; syncOwnedWorld(); hudTick(true); if (M.ui) renderPanel(); pushEco(); }
  // Kasse und Besitz gehen sofort an die Mitspieler (höchstens alle 120 ms), nicht erst beim nächsten 0,4-s-Takt
  function pushEco(force) { const mp = M.mp; if (!mp || !mp.host || !M.dirtyEco) return; const now = performance.now(); if (!force && now - (M.ecoSent || 0) < 120) return; M.ecoSent = now; M.dirtyEco = false; mp.net.broadcast({ t: 'mE', e: ecoWire() }); }
  function buyItem(id) {
    if (M.mp && !M.mp.host) { M.mp.net.send({ t: 'mbuy', id }); return; }
    const r = L.buy(M.E, id); if (!r.ok) { floatText(r.msg); snd.error(); return; }
    snd.buy(); afterBuy(id, r); ecoChanged(); if (M.mp) M.mp.net.broadcast({ t: 'mB', id, by: 'host' });
  }
  function afterBuy(id, r, by = myId()) {
    if (r.helper) M.helpers.push(L.createHelper(id, M.helpers.length + 1));
    const it = L.itemById(id); floatText(`${it.name} gekauft!`, 'gold');
    if (TOOLS.find((t) => t.id === id) && by === myId()) selectTool(id); if (VEHICLES.find((v) => v.id === id) && !M.veh[id]) { makeVehicle(id); floatText(`${it.name} steht am Hangar (Kreis neben der Station)`); } if (M.tut < 3) M.tut = 3; buildHotbar();
  }
  // Besitz in der Welt sichtbar machen
  function syncOwnedWorld() { const W = M.W; if (!W) return; W.blocks = [...W.staticBlocks, ...W.bigRocks, ...Fab.blocks(M.F)]; for (const op of OUTPOSTS) W.outposts[op.id].visible = !!M.E.owned[op.id]; for (const s of VEHICLES) if (M.E.owned[s.id] && !M.veh[s.id]) makeVehicle(s.id); for (const v of Object.values(M.veh)) fitBrush(v); const pk = L.packKg(M.E); W.player.setPackScale(0.9 + Math.min(0.75, Math.log10(pk / 3 + 1) * 0.42)); }

  // ---------------- Spielerbewegung ----------------
  function stepWalk(dt) {
    const P = M.P; const W = M.W; const T0 = toolById(P.tool); const T = { ...T0, ...L.toolStats(M.E, T0) }; const bl = !M.ui && !M.mapOpen && G.mode === 'moon'; const fw = bl ? (down('throttle') ? 1 : 0) - (down('brake') ? 1 : 0) : 0; const st = bl ? (down('right') ? 1 : 0) - (down('left') ? 1 : 0) : 0;
    const scrub = bl && M.lmb && !M.P.veh && !M.build; const toolV = T.speed; const sprint = !!keys.ShiftLeft && !scrub; const maxV = scrub ? toolV : sprint ? 7 : 4.2; const sn = Math.sin(P.yaw); const cs = Math.cos(P.yaw);
    let dx = sn * fw - cs * st; let dz = cs * fw + sn * st; const dl = Math.hypot(dx, dz); if (dl > 1) { dx /= dl; dz /= dl; }
    const a = P.ground ? 22 : 5; P.vx = damp(P.vx, dx * maxV, a * 0.5, dt); P.vz = damp(P.vz, dz * maxV, a * 0.5, dt); P.x += P.vx * dt; P.z += P.vz * dt; L.collideBlocks(P, 0.52, W.blocks); P.speed = Math.hypot(P.vx, P.vz);
    const gy = W.height(P.x, P.z) + (L.stationInside(P.x, P.z) ? 0.09 : 0);
    if (bl && down('hand') && P.ground) { P.vy = 3.1; P.ground = false; snd.jump(); }
    if (P.ground && P.speed > 1.1) { M.stepT = (M.stepT || 0) + dt * P.speed; if (M.stepT > 1.5) { M.stepT = 0; snd.step(); } }
    if (!P.ground) { P.vy -= GRAVITY * dt; P.y += P.vy * dt; if (P.y <= gy) { P.y = gy; P.ground = true; snd.land(clamp(-P.vy / 3, 0.3, 1)); if (P.vy < -1.2) puff(P.x, gy + 0.1, P.z, 1.2); P.vy = 0; } } else P.y = damp(P.y, gy, 18, dt);
    // Blickrichtung der Figur
    const faceT = scrub || M.view === 'first' ? P.yaw : P.speed > 0.4 ? Math.atan2(P.vx, P.vz) : P.face; P.face += angDiff(faceT, P.face) * (1 - Math.exp(-dt * 10));
    // Putzen: Der echte Werkzeugkopf arbeitet, und nur dort geht der Staub weg
    const cap = L.packKg(M.E); const room = cap - P.tank; const R = W.player; const indoor = L.stationInside(P.x, P.z); P.scrubbing = scrub && !indoor && (room > 0.0001 || !!T.drill);
    poseRig(R, P, T, dt); const sf = Math.sin(P.face); const cf = Math.cos(P.face); const hx = P.x + R.tip.x * cf + R.tip.z * sf; const hz = P.z - R.tip.x * sf + R.tip.z * cf; const ha = P.face;
    if (scrub && room <= 0.0001 && !indoor && L.dustAt(M.D, hx, hz) > 10) floatOnce('tank', 'Tank voll! Bring den Staub zum Trichter beim Händler.');
    if (P.scrubbing && R.tip.on && room > 0.0001) {
      const jump = P.hx === undefined || Math.hypot(hx - P.hx, hz - P.hz) > 1.2; const px = jump ? hx : P.hx; const pz = jump ? hz : P.hz; const pa = jump ? ha : P.ha; const bw = T.w - 2 * L.toolOsc(T); const rate = T.rate * dt + 1; const got = L.sweepBar(M.D, px, pz, pa, hx, hz, ha, bw, T.d, rate, room); P.tank += got; queueStroke(px, pz, pa, hx, hz, ha, bw, T.d, rate); P.got = got;
      if (got > 0) { brushFx(hx, hz, ha, bw, T.kind === 'pusher' ? 1.2 : 0.55 + Math.min(0.5, T.w * 0.2), 1); if (M.tut === 0 && P.tank > 0.3) M.tut = 1; }
    }
    if (T.drill && scrub && !indoor && drillTick(dt)) P.scrubbing = true;
    P.hx = hx; P.hz = hz; P.ha = ha; R.setFill(P.tank / cap);
  }
  function poseRig(R, P, T, dt) { const r = R.root; r.visible = !P.veh || P.seatVisible; r.position.set(P.x, P.y, P.z); r.rotation.y = P.face; A.poseAstronaut(R, { speed: P.speed, scrub: P.scrubbing, kneel: T.kind === 'brush' && P.scrubbing, seat: false, air: !P.ground, oscW: L.toolOsc(T) }, dt); }
  function drillTick(dt) { const P = M.P; for (const c of M.W.crystals) { if (c.gone) continue; const dx = wrapDelta(c.x, P.x); const dz = wrapDelta(c.z, P.z); if (Math.hypot(dx, dz) > 3.4) continue; c.hp -= dt / 2.2; for (let i = 0; i < 2; i++) debris(P.x + dx * 0.7, c.y + 1, P.z + dz * 0.7, 3.5); if (Math.random() < dt * 14) snd.drill(); if (c.hp <= 0) { c.gone = true; audio.ding && audio.ding(); if (M.mp && !M.mp.host) { M.mp.net.send({ t: 'mcry', i: c.i }); floatText('Kristall geknackt!', 'gold'); } else hostCrystal(c); } return true; } return false; }
  function hostCrystal(c) { const v = Math.round(c.value * L.priceMul(M.E)); L.addCredits(M.E, v); M.E.crystals++; floatText(`Mondkristall geknackt: +${fmtCr(v)} Cr`, 'gold'); ecoChanged(); if (M.mp) M.mp.net.broadcast({ t: 'mcry', i: c.i }); }
  function stepRide(dt) {
    const P = M.P; const v = M.veh[P.veh]; if (!v) return; const bl = !M.ui && !M.mapOpen && G.mode === 'moon';
    if (P.driving) { v.brush = bl && (M.lmb || M.autoBrush); stepVehicle(v, dt, { th: bl ? (down('throttle') ? 1 : 0) - (down('brake') ? 1 : 0) : 0, st: bl ? (down('left') ? 1 : 0) - (down('right') ? 1 : 0) : 0 }); v.tx = v.x; v.tz = v.z; v.th = v.h; }
    if (P.driving && Math.abs(v.sp) > 1.5) P.yaw += angDiff(v.h + (v.sp < 0 ? Math.PI : 0), P.yaw) * (1 - Math.exp(-dt * 1.6));
    P.x = v.x; P.z = v.z; P.y = v.y; P.face = v.h; const R = M.W.player; const seat = (v.model.userData.seats || [])[P.seat]; const lay = v.id === 'trike'; R.root.visible = lay; if (lay && seat) { R.root.position.set(v.x, v.y + seat.y - 0.5, v.z); R.root.rotation.y = v.h; A.poseAstronaut(R, { speed: 0, seat: true }, dt); }
  }

  // ---------------- Kamera ----------------
  const camT = new THREE.Vector3(); const camP = new THREE.Vector3();
  function poseCamera(dt) {
    const W = M.W; const P = M.P; const c = W.cam; const R = W.player; if (M.debugCam) return;
    if (M.phase === 'title') { const a = Math.sin(M.t * 0.07) * 0.03; const b = TITLE.b + a; c.position.set(TITLE.x, 1.9, TITLE.z); camT.set(TITLE.x + Math.sin(b) * 40, 7.6, TITLE.z + Math.cos(b) * 40); c.lookAt(camT); return; }
    const first = M.view === 'first' && !P.veh; if (M.ghosted !== first) { M.ghosted = first; R.ghost(first); } const v = P.veh ? M.veh[P.veh] : null; const sn = Math.sin(P.yaw); const cs = Math.cos(P.yaw); const cp = Math.cos(P.pitch); const sp = Math.sin(P.pitch);
    if (first) { const kneel = P.scrubbing && toolById(P.tool).kind === 'brush' ? 0.55 : 1; const eye = 1.78 * kneel; c.position.set(P.x - sn * 0.72, P.y + eye, P.z - cs * 0.72); camT.set(c.position.x + sn * cp, c.position.y + sp, c.position.z + cs * cp); c.lookAt(camT); return; }
    const dist = v ? v.lay.cam : M.build ? 6.6 : 4.3; const head = v ? (v.id === 'truck' ? 3.0 : 2.1) : M.build ? 2.5 : 1.55; const inside = !v && L.stationInside(P.x, P.z); const d = inside ? 3.0 : dist; camT.set(P.x - (M.build ? cs * 1.5 : 0), P.y + head, P.z + (M.build ? sn * 1.5 : 0)); const pz = Math.max(-0.75, Math.min(0.9, P.pitch));
    camP.set(camT.x - sn * Math.cos(pz) * d, camT.y - Math.sin(pz) * d + 0.25, camT.z - cs * Math.cos(pz) * d); const gy = W.height(camP.x, camP.z) + 0.35; if (camP.y < gy) camP.y = gy;
    if (inside) { const S = BASE.station; const nx = wrapNear(S.x, P.x); const nz = wrapNear(S.z, P.z); camP.x = clamp(camP.x, nx - L.STATION.hx + 0.5, nx + L.STATION.hx - 0.5); camP.z = clamp(camP.z, nz - L.STATION.hz + 0.5, nz + L.STATION.hz - 0.5); camP.y = Math.min(camP.y, 4.1); }
    c.position.copy(camP); c.lookAt(camT);
  }
  // ---------------- Mitschieben (geschlossene Welt) ----------------
  const NEARK = 300;
  function placeWorld() {
    const W = M.W; const c = W.cam.position; const S = CHUNK_SIZE / 2;
    for (const ch of W.chunks) { const g = ch.g; const x = wrapNear(g.userData.x0 + S, c.x) - S; const z = wrapNear(g.userData.z0 + S, c.z) - S; if (g.position.x !== x || g.position.z !== z || !g.userData.placed) { g.position.set(x, 0, z); g.updateMatrix(); g.userData.placed = true; } ch.rocks.visible = Math.hypot(x + S - c.x, z + S - c.z) < NEARK; }
    for (const o of W.statics) { o.position.x = wrapNear(o.userData.mx, c.x); o.position.z = wrapNear(o.userData.mz, c.z); }
    W.sky.position.copy(c); W.ridge.position.set(c.x, 0, c.z); const q = 2; W.sun.target.position.set(Math.round(c.x / q) * q, 0, Math.round(c.z / q) * q); W.sun.position.copy(W.sun.target.position).addScaledVector(A.SUN_DIR, 200);
    W.sky.userData.earth.rotation.y = -1.68 + M.t * 0.002;
    // Kristalle in der Nähe
    M.crystT = (M.crystT || 0) - 1; if (M.crystT <= 0) { M.crystT = 30; const near = W.crystals.filter((k) => !k.gone).map((k) => ({ k, d: Math.hypot(wrapDelta(k.x, c.x), wrapDelta(k.z, c.z)) })).sort((a, b) => a.d - b.d).slice(0, W.crystalPool.length); W.crystalPool.forEach((m, i) => { const n = near[i]; m.visible = !!n && n.d < 220; if (n) { m.userData.k = n.k; m.scale.setScalar(n.k.s); } }); }
    for (const m of W.crystalPool) if (m.visible && m.userData.k) { const k = m.userData.k; if (k.gone) { m.visible = false; continue; } m.position.set(wrapNear(k.x, c.x), k.y, wrapNear(k.z, c.z)); }
    for (const v of Object.values(M.veh)) { v.model.position.x = wrapNear(v.x, c.x); v.model.position.z = wrapNear(v.z, c.z); }
  }

  // ---------------- Effekte ----------------
  function debris(x, y, z, sp, size = 1, dir = null) { const W = M.W; const d = W.debL[W.debI]; W.debI = (W.debI + 1) % W.debL.length; const a = Math.random() * 6.28; d.life = 0.9 + Math.random() * 1.7; d.x = x; d.y = y; d.z = z; d.vx = Math.cos(a) * sp * Math.random() + (dir ? dir.x * sp : 0); d.vz = Math.sin(a) * sp * Math.random() + (dir ? dir.z * sp : 0); d.vy = 0.3 + Math.random() * sp * 0.55; d.s = (0.008 + Math.random() * Math.random() * 0.024) * size; d.r = Math.random() * 6; }
  // Wegfliegender Staub an der Bürste: k = Stärke, f = Wurfrichtung (+1 nach vorn, -1 nach hinten)
  const _dir = { x: 0, z: 0 };
  function brushFx(x, z, a, w, k, f) { const g = M.W.height(x, z) + 0.05; const sn = Math.sin(a); const cs = Math.cos(a); _dir.x = sn * f * 0.4; _dir.z = cs * f * 0.4; const n = Math.max(1, Math.round(k * 2.4)); for (let i = 0; i < n; i++) { const l = (Math.random() - 0.5) * w; debris(x + cs * l, g, z - sn * l, 0.7 + k * 0.5, 0.6 + k * 0.5, _dir); } if (Math.random() < 0.18 * k) { const l = (Math.random() - 0.5) * w; puff(x + cs * l, g + 0.15, z - sn * l, 0.5 + k * 0.5); } }
  function puff(x, y, z, size) { const W = M.W; const p = W.puffs[W.puffI]; W.puffI = (W.puffI + 1) % W.puffs.length; p.s.visible = true; p.s.position.set(x, y, z); p.life = p.max = 0.9 + Math.random() * 0.8; p.vx = (Math.random() - 0.5) * 0.5; p.vy = 0.15 + Math.random() * 0.2; p.vz = (Math.random() - 0.5) * 0.5; p.g = size; }
  const _o = new THREE.Object3D();
  function stepFx(dt) {
    const W = M.W; let n = 0; const list = W.debL; for (let i = 0; i < list.length; i++) { const d = list[i]; if (d.life <= 0) continue; d.life -= dt; d.vy -= GRAVITY * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; const g = W.height(d.x, d.z); if (d.y < g) { d.y = g; d.vy *= -0.3; d.vx *= 0.5; d.vz *= 0.5; } _o.position.set(d.x, d.y, d.z); _o.rotation.set(d.r, d.r * 2, 0); _o.scale.setScalar(d.s * Math.min(1, d.life / 0.3)); _o.updateMatrix(); W.deb.setMatrixAt(n++, _o.matrix); } W.deb.count = n; W.deb.instanceMatrix.needsUpdate = true;
    for (const p of W.puffs) { if (p.life <= 0) continue; p.life -= dt; const k = 1 - p.life / p.max; p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt; const sc = p.g * (0.5 + k * 1.6); p.s.scale.set(sc, sc, 1); p.s.material.opacity = (1 - k) * 0.5; if (p.life <= 0) p.s.visible = false; }
  }
  // Dauergeräusche: Bürste und Motor (über den vorhandenen Audiokontext)
  function ensureLoops() { if (M.snd || !audio.ready || !audio.noiseBuf) return; const c = audio.ctx; const src = c.createBufferSource(); src.buffer = audio.noiseBuf; src.loop = true; src.start(); const noiseOut = (type, f, q) => { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(audio.out ? audio.out('moon.werkzeug') : audio.master); return { fl, g }; }; const scrub = noiseOut('bandpass', 2400, 0.8); const rot = noiseOut('bandpass', 620, 0.6); const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 62; const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = 31; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const g2 = c.createGain(); g2.gain.value = 0.5; const eg = c.createGain(); eg.gain.value = 0; o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(eg); eg.connect(audio.out ? audio.out('moon.fahrzeug') : audio.master); o.start(); o2.start(); const w = c.createOscillator(); w.type = 'sawtooth'; w.frequency.value = 880; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 2.2; const wg = c.createGain(); wg.gain.value = 0; w.connect(bp); bp.connect(wg); wg.connect(audio.out ? audio.out('moon.sauger') : audio.master); w.start(); M.snd = { scrub, rot, o, o2, eg, lp, wg, w }; }
  function tickLoops() { ensureLoops(); const s = M.snd; if (!s) return; const P = M.P; const v = P.veh ? M.veh[P.veh] : null; const T = toolById(P.tool); const t = audio.ctx.currentTime; const live = M.phase === 'play' && G.mode === 'moon'; const work = live && P.scrubbing && !v; const motor = T.kind === 'pusher'; const vac = T.kind === 'vac'; const beat = 0.72 + 0.28 * Math.sin(M.t * (T.kind === 'brush' ? 26 : 15)); let nv = null; let nd = 45; if (M.mp && !v) for (const q of Object.values(M.veh)) { if (!q.driver) continue; const d = Math.hypot(wrapDelta(q.x, P.x), wrapDelta(q.z, P.z)); if (d < nd) { nd = d; nv = q; } } const far = nv ? 1 - nd / 45 : 0; const car = v || nv; s.scrub.g.gain.setTargetAtTime(work && !motor && !vac ? (0.07 + 0.05 * Math.min(2, T.w)) * beat * (P.got > 0 ? 1 : 0.4) : 0, t, 0.03); s.scrub.fl.frequency.setTargetAtTime(T.kind === 'brush' ? 3400 + Math.sin(M.t * 26) * 900 : 1900 + Math.sin(M.t * 15) * 600, t, 0.02); const rotOn = live && ((v && v.brush) || (work && motor)); s.rot.g.gain.setTargetAtTime(rotOn ? (v && v.id === 'truck' ? 0.3 : 0.22) * (0.86 + 0.14 * Math.sin(M.t * 42)) : live && nv && nv.brush ? 0.22 * far : 0, t, 0.06); const eng = !live ? 0 : v ? 0.075 + Math.abs(v.sp) * 0.0055 + (v.brush ? 0.03 : 0) : work && motor ? 0.07 : nv ? (0.06 + Math.abs(nv.sp) * 0.004) * far : 0; s.eg.gain.setTargetAtTime(eng, t, 0.1); const base = car ? { trike: 66, bus: 52, truck: 40 }[car.id] : 86; const f = base + (car ? Math.abs(car.sp) * (car.id === 'truck' ? 6 : 8) : 8 * Math.sin(M.t * 9)); s.o.frequency.setTargetAtTime(f, t, 0.1); s.o2.frequency.setTargetAtTime(f / 2, t, 0.1); s.lp.frequency.setTargetAtTime(340 + (car ? Math.abs(car.sp) * 40 : 240), t, 0.1); s.wg.gain.setTargetAtTime(work && vac ? 0.035 : 0, t, 0.08); s.w.frequency.setTargetAtTime(860 + Math.sin(M.t * 30) * 22, t, 0.03); }
  function stopLoops() { if (!M.snd) return; const t = audio.ctx.currentTime; for (const n of [M.snd.scrub.g, M.snd.rot.g, M.snd.eg, M.snd.wg]) n.gain.setTargetAtTime(0, t, 0.03); }

  // ---------------- Helfer (rechnet nur der Host) ----------------
  function helperVisual(h) { if (h.vis) return h.vis; const T = HELPERS.find((x) => x.id === h.type); let vis; if (T.model === 'crew') { const R = A.buildAstronaut({ accent: 0x4a90d9, stripe: (h.id % 2) ? 0x4a90d9 : 0xe24a86 }); R.setTool('broom', 'broom', 1.05); vis = { R, root: R.root }; } else { const root = A.buildRobot(T.model === 'robo2', T.w); vis = { root }; } M.W.scene.add(vis.root); h.vis = vis; return vis; }
  function stepHelpers(dt) {
    const isHost = !M.mp || M.mp.host; const c = M.W.cam.position; if (isHost) M.D.clock = M.t; // Spielzeit für die Helfer (Belegungen und Sperren von Staubblöcken laufen danach ab)
    for (const h of M.helpers) {
      if (!isHost && h.tx !== undefined) { const k = 1 - Math.exp(-dt * 4); h.x += (wrapNear(h.tx, h.x) - h.x) * k; h.z += (wrapNear(h.tz, h.z) - h.z) * k; h.h += angDiff(h.th, h.h) * k; }
      if (isHost) { const sub = Math.min(3, Math.ceil(dt / 0.05)); for (let i = 0; i < sub; i++) { const kg = L.stepHelper(h, dt / sub, M.D, M.E, M.mp ? (M.net.hs[h.id] = M.net.hs[h.id] || []) : null); /* Helfer fahren durch Wände (kein collideBlocks): Sie blieben sonst z. B. hinter Bernds Shop hängen */ if (kg > 0) { const ik = M.F.helpers ? Fab.intakeRoom(M.F) : null; if (ik) Fab.deposit(ik, kg); else { const cr = L.sell(M.E, kg, M.t, 'Helfer'); M.dirtyEco = true; M.helperCr = (M.helperCr || 0) + cr; } } } }
      const v = helperVisual(h); const x = wrapNear(h.x, c.x); const z = wrapNear(h.z, c.z); const d = Math.hypot(x - c.x, z - c.z); v.root.visible = d < 240; if (!v.root.visible) continue; const y = M.W.height(x, z); v.root.position.set(x, y, z); v.root.rotation.y = h.h; if (v.R && d < 90) { const T = HELPERS.find((q) => q.id === h.type); A.poseAstronaut(v.R, { speed: T.speed, scrub: h.st === 'work', kneel: false, air: false, oscW: 0.07 }, dt); }
    }
  }

  // ---------------- Anzeige ----------------
  function floatText(text, kind = '') { const box = el('moFloat'); const d = document.createElement('div'); d.className = 'mo-fl ' + (kind === 'big' ? 'hi' : kind); d.textContent = text; box.append(d); while (box.children.length > 5) box.firstChild.remove(); setTimeout(() => d.remove(), kind === 'big' ? 4600 : 3200); }
  const onceT = {}; function floatOnce(k, text) { const n = performance.now(); if (n - (onceT[k] || -1e9) > 5000) { onceT[k] = n; floatText(text, 'warn'); snd.tankFull(); } }
  function buildHotbar() { const h = el('moHotbar'); h.textContent = ''; const slot = (cls, num, name, sub) => { const s0 = document.createElement('div'); s0.className = 'mo-slot' + cls; const b0 = document.createElement('b'); b0.textContent = num; const sp = document.createElement('span'); sp.textContent = name; const sm = document.createElement('small'); sm.textContent = sub; s0.append(b0, sp, sm); h.append(s0); }; if (M.build) { partList().forEach((q, i) => slot(q.id === M.build.part ? ' sel' : '', i + 1, q.name, `${M.E.inv[q.id] || 0} im Lager`)); return; } ownedTools().forEach((t, i) => slot(t.id === M.P.tool ? ' sel' : '', i + 1, t.name.replace(/ „.*$/, ''), L.toolStats(M.E, t).w.toFixed(2).replace('.', ',') + ' m')); }
  function updateKeys() { const P = M.P; const k = M.build ? [['LMB', 'Bauen (ziehen für Bänder)'], ['RMB', 'Abreißen'], ['R', 'Drehen'], ['Q / E', 'Ebene'], ['1–9 / Rad', 'Bauteil'], ['B', 'Fertig']] : P.veh ? (P.driving ? [['W/S', 'Gas'], ['A/D', 'Lenken'], ['LMB', 'Bürsten'], ['Q', 'Dauerbürste'], ['E', 'Aussteigen']] : [['E', 'Aussteigen']]) : [['WASD', 'Gehen'], ['Shift', 'Rennen'], ['Leertaste', 'Mondsprung'], ['LMB', 'Putzen'], ['E', 'Benutzen'], ['B', 'Bauen'], ['Tab', 'Karte'], ['V', 'Ansicht']]; const box = el('moKeys'); box.textContent = ''; for (const [a0, b0] of k) { const s0 = document.createElement('span'); const kbd = document.createElement('kbd'); kbd.textContent = a0; s0.append(kbd, ' ' + b0); box.append(s0); } }
  function hudTick(force) {
    M.hudT -= 1; if (!force && M.hudT > 0) return; M.hudT = 8; const E = M.E; const P = M.P; const v = P.veh ? M.veh[P.veh] : null; el('moCredits').textContent = fmtCr(E.credits) + ' Cr'; el('moCompany').textContent = L.companyOf(E).name; el('moPrice').textContent = `Kurs ${L.pricePerKg(E, M.t).toFixed(1).replace('.', ',')} Cr/kg`; const pct = L.percentClean(M.D); el('moPct').textContent = pct.toFixed(pct < 1 ? 3 : 2).replace('.', ',') + ' %'; drawRing(pct);
    const cap = v ? L.vehStats(E, v.spec).tank : L.packKg(E); const kg = v ? v.kg : P.tank; const f = clamp(kg / cap, 0, 1); el('moTankFill').style.height = (f * 100).toFixed(1) + '%'; el('moTank').classList.toggle('full', f > 0.995); el('moTankText').textContent = `${kg.toFixed(kg < 10 ? 2 : 1).replace('.', ',')} / ${fmtCr(cap)} kg`; el('moTankLabel').textContent = v ? v.spec.name : (PACKS.filter((p) => E.owned[p.id]).pop() || PACKS[0]).name;
    const n = nearby(); let pr = ''; if (M.build) pr = ''; else if (M.flowBusy) pr = ''; else if (n.sellV) pr = `<kbd>E</kbd> ${n.sellV.kg.toFixed(1)} kg ${n.unload ? 'entladen und verkaufen' : 'verkaufen'}`; else if (n.depV) pr = `<kbd>E</kbd> ${M.veh[P.veh].kg.toFixed(1)} kg in die Staubannahme`; else if (n.exit) pr = ''; else if (n.intake) pr = `<kbd>E</kbd> ${P.tank.toFixed(1)} kg in die Staubannahme füllen`; else if (n.sell) pr = P.tank > 0.005 ? `<kbd>E</kbd> ${P.tank.toFixed(1)} kg verkaufen (${fmtCr(P.tank * L.pricePerKg(E, M.t))} Cr)` : 'Verkaufstrichter · Tank ist leer'; else if (n.shop) pr = '<kbd>E</kbd> Mit Bürsten-Bernd handeln'; else if (n.terminal) pr = '<kbd>E</kbd> Stationsterminal'; else if (n.tech) pr = '<kbd>E</kbd> Technikladen'; else if (n.upgrade) pr = '<kbd>E</kbd> Upgrade-Station'; else if (n.globe) pr = '<kbd>E</kbd> Mondglobus ansehen'; else if (n.veh) pr = `<kbd>E</kbd> ${n.veh.spec.name} einsteigen`; else if (n.fab) pr = Fab.statusOf(n.fab, M.F.power.k);
    const pe = el('moPrompt'); if (pe.innerHTML !== pr) pe.innerHTML = pr; pe.classList.toggle('hidden', !pr);
    tutorial(); drawCompass(); checkProgress(pct);
  }
  // Hilfe oben rechts: was als Nächstes dran ist, und wo
  const S0 = BASE.station; const HOPPER = { n: 'Trichter beim Händler', x: BASE.trader.x + 8, z: BASE.trader.z + 1 }; const SHOP = { n: 'Tresen von Bürsten-Bernd', x: BASE.trader.x + 3.6, z: BASE.trader.z + 0.3 }; const DOOR = { n: 'Stationstür', x: S0.x, z: S0.z + L.STATION.hz + 1 }; const GARAGE = { n: 'Hangar', x: BASE.garage.x, z: BASE.garage.z }; const TECH = { n: 'Technikladen', x: S0.x + L.STATION.hx - 5.8, z: S0.z - 4 }; const UPG = { n: 'Upgrade-Station', x: S0.x - 12.5, z: S0.z + 5.2 }; const UNL = { n: 'Entladestation', x: BASE.unload.x, z: BASE.unload.z }; const LOTP = { n: 'Fabrikgelände', x: L.LOT_C.x, z: LOT.z + LOT.n * LOT.cell };
  const GUIDE = [
    { t: 'Staub putzen', d: 'Halte die <kbd>linke Maustaste</kbd> und laufe mit <kbd>W</kbd> über den grauen Staub neben der Fahrbahn.', done: (E, P) => P.tank > 0.25 || E.soldKg > 0 },
    { t: 'Tank füllen', d: 'Putze weiter, bis der Tank unten links voll ist. Mit <kbd>Tab</kbd> siehst du die Mondkarte.', done: (E, P) => P.tank >= L.packKg(E) * 0.98 || E.soldKg > 0 },
    { t: 'Staub verkaufen', d: 'Lauf zum orangen Trichter und drücke <kbd>E</kbd>: Der Staub fliegt aus dem Rucksack hinein.', w: HOPPER, done: (E) => E.soldKg > 0 },
    { t: 'Größerer Rucksack', d: 'Sammle 60 Cr, sprich mit Bürsten-Bernd (<kbd>E</kbd>) und kauf unter „Tanks“ den Rucksack Plus.', w: SHOP, done: (E) => !!E.owned.pack1 },
    { t: 'Besseres Werkzeug', d: 'Spare auf den Handfeger (90 Cr), dann auf den Schrubber. Mit <kbd>1</kbd>, <kbd>2</kbd>, <kbd>3</kbd> wechselst du.', w: SHOP, done: (E) => !!(E.owned.hand || E.owned.broom) },
    { t: 'Station erkunden', d: 'Geh durch die Tür. Am Terminal siehst du deinen Fortschritt, der Globus zeigt jede geputzte Stelle.', w: DOOR, done: (E) => !!E.seen.station },
    { t: 'Werkzeug verbessern', d: 'An der Upgrade-Station in der Station machst du jedes Werkzeug breiter und schneller.', w: UPG, done: (E) => Object.keys(E.up || {}).length > 0 },
    { t: 'Schiebekehrer', d: 'Bernd verkauft den motorisierten Schiebekehrer (750 Cr): zwei Rotationsbürsten, und du läufst einfach hinterher.', w: SHOP, done: (E) => !!(E.owned.pusher || E.owned.wide || E.owned.vac) },
    { t: 'Erstes Fahrzeug', d: 'Kaufe bei Bernd das Kehrtrike (2.600 Cr). Es steht danach am Hangar neben der Station.', w: SHOP, done: (E) => !!(E.owned.trike || E.owned.bus || E.owned.truck) },
    { t: 'Fahrzeug entladen', d: 'Steig ein (<kbd>E</kbd>), bürste mit <kbd>LMB</kbd>, und fahr unter die Entladestation auf der Fahrbahn. Dort <kbd>E</kbd>.', w: UNL, done: (E) => E.soldKg > 200 },
    { t: 'Helfer einstellen', d: 'Saugrobis und Putzkollegen gibt es bei Bernd unter „Helfer“. Sie arbeiten ganz allein und fahren immer dorthin, wo noch Staub liegt.', w: SHOP, done: (E) => Object.values(E.helpers).some((n) => n > 0) },
    { t: 'Fabrik planen', d: 'Kaufe im Technikladen hinten in der Station: Staubannahme, Staubpresse, Frachtrampe, Förderbänder und unter „Strom“ eine Solaranlage.', w: TECH, done: (E) => !!(E.inv.intake || M.F.ents.length) },
    { t: 'Fabrik bauen', d: 'Geh aufs Fabrikgelände und drücke <kbd>B</kbd>. Baue: Annahme, Band, Presse, Band, Rampe. Pfeile zeigen die Richtung, <kbd>R</kbd> dreht.', w: LOTP, done: () => M.F.ents.some((e) => e.t === 'dock') && M.F.ents.some((e) => e.t === 'intake') },
    { t: 'Strom anschließen', d: 'Maschinen laufen nur mit Strom. Stelle eine Solaranlage aufs Fabrikgelände, sie hängt automatisch am Netz.', w: LOTP, done: () => M.F.ents.some((e) => e.t === 'solar' || e.t === 'generator') },
    { t: 'Fabrik starten', d: 'Fülle deinen Tank in die Staubannahme (<kbd>E</kbd>). Fertige Ware bringt an der Rampe viel mehr als roher Staub.', w: LOTP, done: () => Object.keys(M.F.sold).length > 0 },
    { t: 'Mehr Strom', d: 'Große Maschinen fressen Strom. Der Mondstaub-Generator liefert viel mehr: Leite ein Band mit Staub in ihn hinein.', w: TECH, done: () => M.F.ents.some((e) => e.t === 'generator') },
  ];
  function tutorial() {
    const E = M.E; const P = M.P; if (L.stationInside(P.x, P.z)) E.seen.station = 1; while (E.guide < GUIDE.length && GUIDE[E.guide].done(E, P)) { E.guide++; snd.guide(); }
    const g = GUIDE[E.guide]; el('moGuideH').textContent = g ? 'Erste Schritte' : 'Firmenziel'; el('moGuideN').textContent = g ? `${E.guide + 1} / ${GUIDE.length}` : ''; const next = L.nextCompany(E); const title = g ? g.t : 'Putze den ganzen Mond'; const text = g ? g.d : (next ? `Nächste Firmenstufe: ${next.name} ab ${fmtCr(next.at)} Cr Umsatz. Baue deine Fabrik aus und stelle Helfer ein.` : 'Deine Firma steht ganz oben. Jetzt fehlt nur noch der letzte Quadratmeter.'); if (el('moGuideT').textContent !== title) el('moGuideT').textContent = title; if (M.guideText !== text) { M.guideText = text; el('moGuideD').innerHTML = text; }
    const w = g && g.w; el('moGuideW').textContent = w ? `${w.n}: ${Math.round(Math.hypot(wrapDelta(w.x, P.x), wrapDelta(w.z, P.z)))} m` : ''; M.guideTarget = w || null;
  }
  function checkProgress(pct) { const isHost = !M.mp || M.mp.host; if (!isHost) return; const got = L.checkMilestones(M.E, pct); for (const g of got) { floatText(`Erdvertrag: ${String(g.pct).replace('.', ',')} % geputzt · Prämie +${fmtCr(g.bonus)} Cr`, 'big'); snd.milestone(); M.dirtyEco = true; if (M.mp) M.mp.net.broadcast({ t: 'mT', text: `Erdvertrag: ${String(g.pct).replace('.', ',')} % geputzt · Prämie +${fmtCr(g.bonus)} Cr`, kind: 'big' }); } if (pct >= 99.99 && !M.won) { M.won = true; M.dirtyEco = true; save(); if (M.mp) M.mp.net.broadcast({ t: 'mFin' }); playFinale(); } const was = M.lastCo; const co = L.companyOf(M.E).name; if (was && was !== co) { floatText(`Neue Firmenstufe: ${co}`, 'big'); snd.milestone(); if (M.mp) M.mp.net.broadcast({ t: 'mT', text: `Neue Firmenstufe: ${co}`, kind: 'big' }); } M.lastCo = co; }
  function drawRing(p) { const c = el('moRing'); const x = c.getContext('2d'); const r = 40; const m = 48; x.clearRect(0, 0, 96, 96); x.lineWidth = 8; x.strokeStyle = 'rgba(255,255,255,.18)'; x.beginPath(); x.arc(m, m, r, 0, 7); x.stroke(); x.strokeStyle = '#ee7a18'; x.lineCap = 'round'; x.beginPath(); x.arc(m, m, r, -1.57, -1.57 + Math.max(0.04, 6.283 * Math.pow(p / 100, 0.5))); x.stroke(); x.fillStyle = '#d9d9e4'; x.beginPath(); x.arc(m, m, 26, 0, 7); x.fill(); x.fillStyle = '#aeaec0'; for (const [a, b, q] of [[-9, -6, 6], [8, 3, 8], [-6, 11, 4], [10, -11, 3]]) { x.beginPath(); x.arc(m + a, m + b, q, 0, 7); x.fill(); } }
  function compassItems() { const P = M.P; const out = [...(M.guideTarget ? [{ n: M.guideTarget.n, x: M.guideTarget.x, z: M.guideTarget.z, c: 'g' }] : []), { n: 'Händler', x: BASE.trader.x + 8, z: BASE.trader.z + 1, c: 'o' }, { n: 'Station', x: BASE.station.x, z: BASE.station.z + L.STATION.hz, c: 'w' }, ...(M.F.ents.length || M.E.inv.belt ? [{ n: 'Fabrik', x: L.LOT_C.x, z: L.LOT_C.z, c: 'b' }] : [])]; for (const op of OUTPOSTS) if (M.E.owned[op.id]) out.push({ n: op.name.replace('Außenposten ', ''), x: op.x + 4, z: op.z + 4, c: 'o' }); for (const v of Object.values(M.veh)) if (P.veh !== v.id) out.push({ n: v.spec.name, x: v.x, z: v.z, c: 'b' }); for (const o of M.others.values()) out.push({ n: o.name, x: o.s.x, z: o.s.z, c: 'p' }); if (ownedTools().some((t) => t.drill)) { let best = null; let bd = 1e9; for (const k of M.W.crystals) { if (k.gone) continue; const d = Math.hypot(wrapDelta(k.x, P.x), wrapDelta(k.z, P.z)); if (d < bd) { bd = d; best = k; } } if (best) out.push({ n: 'Kristall', x: best.x, z: best.z, c: 'b' }); } return out; }
  function drawCompass() { const box = el('moCompass'); const P = M.P; const yaw = P.veh && M.view !== 'first' ? P.yaw : P.yaw; const W = box.clientWidth || 520; const put = (txt, bearing, cls, dist) => { const d = angDiff(bearing, yaw); if (Math.abs(d) > 1.16) return null; const sp = document.createElement('span'); sp.className = 'mo-cm ' + cls; sp.textContent = txt; if (dist !== undefined) { const sm = document.createElement('small'); sm.textContent = Math.round(dist) + ' m'; sp.append(sm); } sp.style.left = (W / 2 - (d / 1.35) * (W / 2)).toFixed(0) + 'px'; return sp; }; const nodes = []; const taken = []; const add = (n) => { if (!n) return; const a = parseFloat(n.style.left); if (taken.some((q) => Math.abs(q - a) < 62)) return; taken.push(a); nodes.push(n); }; for (const [t, b] of [['S', 0], ['O', Math.PI / 2], ['N', Math.PI], ['W', -Math.PI / 2]]) { const n = put(t, b, 'dir'); if (n) nodes.push(n); } for (const it of compassItems()) { const dx = wrapDelta(it.x, P.x); const dz = wrapDelta(it.z, P.z); add(put(it.n, Math.atan2(dx, dz), it.c, Math.hypot(dx, dz))); } box.replaceChildren(...nodes); }

  // ---------------- Karte (Mondkarte, Globus, Stationsmonitor) ----------------
  function reliefBase() { const W = M.W; if (W.reliefCv) return W.reliefCv; const S = 512; const c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const img = x.createImageData(S, S); const st = MOON_SIZE / S; for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) { const px = i * st; const pz = j * st; const e = 2.2; const dx = W.height(px - e, pz) - W.height(px + e, pz); const dz = W.height(px, pz - e) - W.height(px, pz + e); const shade = clamp(0.5 + (dx * 0.45 + dz * 0.75) * 0.32, 0, 1); const v = 70 + shade * 60; const p = (j * S + i) * 4; img.data[p] = v; img.data[p + 1] = v; img.data[p + 2] = v + 14; img.data[p + 3] = 255; } x.putImageData(img, 0, 0); W.reliefCv = c; W.reliefD = img.data; return c; }
  function drawMoonMap(cv, S) { const W = M.W; reliefBase(); const c = W.mapCv || (W.mapCv = document.createElement('canvas')); c.width = c.height = 512; const x = c.getContext('2d', { willReadFrequently: true }); const img = x.createImageData(512, 512); const src = W.reliefD; const g = M.D.g; const q = GRID / 512; for (let j = 0; j < 512; j++) { const row = (j * q + 3) * GRID; for (let i = 0; i < 512; i++) { const p = (j * 512 + i) * 4; const d = g[row + i * q + 3]; const k = 1 - d / 255; img.data[p] = src[p] + (240 - src[p]) * k; img.data[p + 1] = src[p + 1] + (238 - src[p + 1]) * k; img.data[p + 2] = src[p + 2] + (225 - src[p + 2]) * k; img.data[p + 3] = 255; } } x.putImageData(img, 0, 0); const out = cv.getContext('2d'); out.imageSmoothingEnabled = true; out.drawImage(c, 0, 0, S, S); return out; }
  function openMap() { M.mapOpen = true; el('moMap').classList.remove('hidden'); M.lmb = false; drawMap(); }
  function closeMap() { M.mapOpen = false; el('moMap').classList.add('hidden'); }
  function drawMap() { const cv = el('moMapCv'); const S = cv.width; const x = drawMoonMap(cv, S); const k = S / MOON_SIZE; const dot = (px, pz, c, r, label) => { const a = mod(px, MOON_SIZE) * k; const b = mod(pz, MOON_SIZE) * k; x.fillStyle = c; x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); x.strokeStyle = '#10131c'; x.lineWidth = 1.5; x.stroke(); if (label) { x.font = '600 15px "Segoe UI", sans-serif'; x.fillStyle = '#fff'; x.strokeStyle = 'rgba(0,0,0,.75)'; x.lineWidth = 3; x.strokeText(label, a + 9, b + 5); x.fillText(label, a + 9, b + 5); } }; dot(BASE.station.x, BASE.station.z, '#f2f1ef', 6, 'Station'); dot(BASE.trader.x, BASE.trader.z, '#ee7a18', 6, 'Händler'); for (const op of OUTPOSTS) if (M.E.owned[op.id]) dot(op.x, op.z, '#ee7a18', 5, op.name.replace('Außenposten ', '')); for (const v of Object.values(M.veh)) dot(v.x, v.z, '#6fd8ff', 5, v.spec.name); for (const h of M.helpers) dot(h.x, h.z, '#9fe07a', 3); for (const o of M.others.values()) dot(o.s.x, o.s.z, '#e24a86', 6, o.name); dot(M.P.x, M.P.z, '#ffd24a', 7, 'Du'); el('moMapInfo').textContent = `${L.percentClean(M.D).toFixed(3).replace('.', ',')} % geputzt · noch ${fmtCr(M.D.remaining / 255 * L.CELL * L.CELL)} m² · der Mond ist rund: wer weit genug läuft, kommt wieder an`; }
  function drawStationScreens() { const st = M.W.station.userData; const c = st.screenC; const x = c.getContext('2d'); const E = M.E; const pct = L.percentClean(M.D); x.fillStyle = '#0b1020'; x.fillRect(0, 0, 1024, 512); x.fillStyle = '#ee7a18'; x.fillRect(0, 0, 1024, 12); x.fillStyle = '#f2f1ef'; x.font = '800 44px "Segoe UI", sans-serif'; x.fillText('REINIGUNGSSTAND MOND', 44, 82); x.font = '800 118px "Segoe UI", sans-serif'; x.fillStyle = '#ffd9b0'; x.fillText(pct.toFixed(3).replace('.', ',') + ' %', 44, 216); x.fillStyle = '#26304a'; x.fillRect(44, 244, 936, 26); x.fillStyle = '#ee7a18'; x.fillRect(44, 244, Math.max(6, 936 * pct / 100), 26); x.fillStyle = '#c9d1e6'; x.font = '500 34px "Segoe UI", sans-serif'; const rows = [`Firma: ${L.companyOf(E).name}`, `Verkauft: ${fmtCr(E.soldKg)} kg · Umsatz: ${fmtCr(E.earned)} Cr`, `Helfer im Einsatz: ${M.helpers.length} · Kristalle: ${E.crystals}`, `Kaffeeautomat: leer`]; rows.forEach((r, i) => x.fillText(r, 44, 330 + i * 48)); st.screenT.needsUpdate = true; drawMoonMap(st.gC, 1024); st.gT.needsUpdate = true; }

  // ---------------- Shop- und Stationsfenster ----------------
  const TABS = { shop: [['tools', 'Werkzeuge'], ['packs', 'Tanks'], ['veh', 'Fahrzeuge'], ['help', 'Helfer']], station: [['over', 'Übersicht'], ['up', 'Ausbau']], tech: [['log', 'Logistik'], ['mach', 'Maschinen'], ['power', 'Strom'], ['run', 'Betrieb']], upgrade: [['utool', 'Werkzeuge'], ['uveh', 'Fahrzeuge']] }; const TITLES = { shop: 'Bürsten-Bernd · Ausrüstung für Mondreiniger', station: 'Station Tranquility · Terminal', tech: 'Technikladen · Bänder, Lifte, Maschinen', upgrade: 'Upgrade-Station · Werkzeuge und Fahrzeuge' };
  function openPanel(kind) { M.ui = kind; M.tab = TABS[kind][0][0]; M.lmb = false; snd.open(); toggleLook(false); el('moPanel').classList.remove('hidden'); renderPanel(); }
  function closePanel() { if (!M.ui) return; M.ui = null; snd.close(); el('moPanel').classList.add('hidden'); if (M.phase === 'play') toggleLook(true); }
  function itemCard({ name, desc, stats = [], price, state, onBuy, icon, active, onUse }) { const d = document.createElement('div'); d.className = 'mo-card' + (active ? ' act' : ''); if (icon) { const im = document.createElement('img'); im.alt = ''; im.src = icon; d.append(im); } const b = document.createElement('div'); b.className = 'mo-cb'; const h = document.createElement('b'); h.textContent = name; const p = document.createElement('p'); p.textContent = desc; const s = document.createElement('div'); s.className = 'mo-stats'; for (const t of stats) { const q = document.createElement('span'); q.textContent = t; s.append(q); } b.append(h, p, s); d.append(b); const r = document.createElement('div'); r.className = 'mo-buy'; const pr = document.createElement('em'); pr.textContent = price === null ? '' : `${fmtCr(price)} Cr`; const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = state.text; btn.disabled = !!state.off; btn.className = state.prim ? 'primary' : ''; btn.onclick = onBuy || onUse || null; r.append(pr, btn); d.append(r); return d; }
  function renderPanel() {
    const kind = M.ui; if (!kind) return; const E = M.E; el('moPanelTitle').textContent = TITLES[kind]; el('moPanelCr').textContent = fmtCr(E.credits) + ' Cr'; const tabs = el('moTabs'); tabs.textContent = ''; for (const [id, t] of TABS[kind]) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tab' + (M.tab === id ? ' sel' : ''); b.textContent = t; b.onclick = () => { M.tab = id; el('moItems').scrollTop = 0; renderPanel(); }; tabs.append(b); }
    const box = el('moItems'); const keep = box.scrollTop; box.textContent = ''; requestAnimationFrame(() => { box.scrollTop = keep; }); if (kind === 'tech') { renderTech(box); return; } if (kind === 'upgrade') { renderUpgrade(box); return; } const st = (id, price) => { if (E.owned[id]) return { text: 'Gekauft', off: true }; const ok = E.credits >= price; return { text: ok ? 'Kaufen' : 'Zu teuer', off: !ok, prim: ok }; };
    if (M.tab === 'tools') for (const t of TOOLS) { const own = !!E.owned[t.id]; box.append(itemCard({ name: t.name, desc: t.desc, icon: thumb(t.id), stats: [`${t.w.toFixed(2).replace('.', ',')} m breit`, `${(t.w * t.speed * L.DUST_KG_M2 * 60).toFixed(0)} kg/min`, ...(t.drill ? ['knackt Kristalle'] : [])], price: own ? null : t.price, active: M.P.tool === t.id, state: own ? (M.P.tool === t.id ? { text: 'In der Hand', off: true } : { text: 'Nehmen', prim: true }) : st(t.id, t.price), onBuy: own ? () => { selectTool(t.id); renderPanel(); } : () => buyItem(t.id) })); }
    if (M.tab === 'packs') for (const t of PACKS) box.append(itemCard({ name: t.name, desc: t.desc, icon: thumb('pack'), stats: [`${t.kg} kg`], price: E.owned[t.id] ? null : t.price, state: st(t.id, t.price), onBuy: () => buyItem(t.id) }));
    if (M.tab === 'veh') for (const t of VEHICLES) box.append(itemCard({ name: t.name, desc: t.desc, icon: thumb(t.id), stats: [`${t.w.toFixed(1).replace('.', ',')} m Bürste`, `${Math.round(t.speed * 3.6)} km/h`, `Tank ${fmtCr(t.tank)} kg`, `${t.seats} Sitz${t.seats > 1 ? 'e' : ''}`], price: E.owned[t.id] ? null : t.price, state: st(t.id, t.price), onBuy: () => buyItem(t.id) }));
    if (M.tab === 'help') for (const t of HELPERS) { const n = E.helpers[t.id] || 0; const pr = L.helperPrice(E, t); const blk = L.buyBlock(E, t.id); box.append(itemCard({ name: t.name, desc: t.desc, icon: thumb(t.id), stats: [`${n} im Einsatz`, `${t.w.toFixed(1).replace('.', ',')} m`, `Tank ${t.tank} kg`], price: pr, state: blk ? { text: 'Zu teuer', off: true } : { text: 'Einstellen', prim: true }, onBuy: () => buyItem(t.id) })); }
    if (M.tab === 'up') for (const t of STATION_UP) box.append(itemCard({ name: t.name, desc: t.desc, price: E.owned[t.id] ? null : t.price, state: st(t.id, t.price), onBuy: () => buyItem(t.id) }));
    if (M.tab === 'over') { const d = document.createElement('div'); d.className = 'mo-over'; const pct = L.percentClean(M.D); const next = L.nextCompany(E); const add = (a, b) => { const r = document.createElement('div'); const x = document.createElement('span'); x.textContent = a; const y = document.createElement('b'); y.textContent = b; r.append(x, y); d.append(r); }; add('Mond geputzt', pct.toFixed(3).replace('.', ',') + ' %'); add('Noch zu putzen', fmtCr(M.D.remaining / 255 * L.CELL * L.CELL) + ' m²'); add('Firma', L.companyOf(E).name); if (next) add('Nächste Firmenstufe', `${next.name} (ab ${fmtCr(next.at)} Cr Umsatz)`); add('Umsatz gesamt', fmtCr(E.earned) + ' Cr'); add('Verkaufter Mondstaub', fmtCr(E.soldKg) + ' kg'); add('Kurs gerade', L.pricePerKg(E, M.t).toFixed(1).replace('.', ',') + ' Cr/kg'); add('Helfer im Einsatz', String(M.helpers.length)); add('Mondkristalle', String(E.crystals)); box.append(d); if (M.won) { const rb = document.createElement('button'); rb.type = 'button'; rb.className = 'primary'; rb.style.margin = '10px 0'; rb.id = 'moFinAgain'; rb.textContent = 'Abschlussfilm nochmal ansehen'; rb.onclick = () => { closePanel(); playFinale(); }; box.append(rb); } const c = document.createElement('div'); c.className = 'mo-over'; const h = document.createElement('h3'); h.textContent = 'Wer hat wirklich mitgeholfen?'; c.append(h); const list = Object.entries(E.contrib).sort((a, b) => b[1] - a[1]); if (!list.length) { const p = document.createElement('p'); p.textContent = 'Noch niemand. Das sagt alles.'; c.append(p); } for (const [n, kg] of list) { const r = document.createElement('div'); const x = document.createElement('span'); x.textContent = n; const y = document.createElement('b'); y.textContent = fmtCr(kg) + ' kg'; r.append(x, y); c.append(r); } box.append(c); }
  }
  function buyPart(id) { if (M.mp && !M.mp.host) { M.mp.net.send({ t: 'mbuyp', id }); return; } const q = Fab.partById(id); const c = q.price * q.pack; if (!q || M.E.credits < c) { floatText('Zu wenig Credits'); snd.error(); return; } M.E.credits -= c; M.E.inv[id] = (M.E.inv[id] || 0) + q.pack; snd.buy(); if (M.build) buildHotbar(); ecoChanged(); }
  function buyUp(id, k) { if (M.mp && !M.mp.host) { M.mp.net.send({ t: 'mup', id, k }); return; } const r = L.buyUpgrade(M.E, id, k); if (!r.ok) { floatText(r.msg); snd.error(); return; } snd.buy(); equip(); buildHotbar(); ecoChanged(); }
  function renderTech(box) {
    const E = M.E; if (M.tab === 'run') { const d = document.createElement('div'); d.className = 'mo-over'; const add = (a0, b0) => { const r = document.createElement('div'); const x = document.createElement('span'); x.textContent = a0; const y = document.createElement('b'); y.textContent = b0; r.append(x, y); d.append(r); }; const stock = Fab.intakes(M.F).reduce((a0, e) => a0 + e.kg, 0); const pw = M.F.power; add('Strom', `${pw.supply} kW Angebot · ${pw.demand} kW Bedarf`); const bar = document.createElement('div'); bar.className = 'mo-pow' + (pw.k < 0.99 ? ' low' : ''); const fill = document.createElement('i'); fill.style.width = Math.round(Math.min(1, pw.demand ? pw.supply / pw.demand : pw.supply ? 1 : 0) * 100) + '%'; bar.append(fill); d.append(bar); add('Bauteile auf dem Gelände', String(M.F.ents.length)); add('Staub in den Annahmen', fmtCr(stock) + ' kg'); for (const k of Fab.ITEM_IDS) if (M.F.sold[k]) add('Verkauft: ' + Fab.ITEMS[k].name, fmtCr(M.F.sold[k])); box.append(d); const t = document.createElement('div'); t.className = 'mo-over'; const r = document.createElement('div'); r.className = 'mo-tog'; const x = document.createElement('span'); x.textContent = M.F.helpers ? 'Helfer liefern in die Staubannahme' : 'Helfer verkaufen direkt beim Händler'; const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Umschalten'; b.onclick = () => { fabOp({ op: 'h', on: !M.F.helpers }); setTimeout(renderPanel, 80); }; r.append(x, b); t.append(r); box.append(t); return; }
    const hint = document.createElement('div'); hint.className = 'mo-over'; const hp = document.createElement('p'); hp.textContent = M.tab === 'power' ? 'Maschinen brauchen Strom. Alles auf dem Fabrikgelände hängt am selben Netz: Fehlt Strom, laufen sie langsamer, ohne Strom gar nicht. Der Generator braucht Staub vom Band.' : 'Gekaufte Teile liegen im Lager. Gebaut wird auf dem Fabrikgelände östlich der Station mit Taste B. Abreißen gibt das Teil zurück.'; hint.append(hp); box.append(hint);
    for (const q of Fab.PARTS.filter((x) => x.group === M.tab)) { const r = Fab.RECIPES[q.id]; const c = q.price * q.pack; const ok = E.credits >= c; const built = M.F.ents.filter((e) => e.t === q.id).length; const stats = [`${E.inv[q.id] || 0} im Lager`, `${built} gebaut`]; if (r) stats.push(`${r.time} s je Stück`, `${Fab.MACHINE_KW[q.id]} kW`, 'Wert ' + fmtCr(Fab.ITEMS[r.out].value) + ' Cr'); if (q.id === 'solar') stats.push(`${Fab.SOLAR_KW} kW`); if (q.id === 'generator') stats.push(`${Fab.GEN_KW} kW`, `${Fab.GEN_BURN} s je Staub`); box.append(itemCard({ name: q.name + (q.pack > 1 ? ` (${q.pack} Stück)` : ''), desc: q.desc, icon: thumb('fab:' + q.id), stats, price: c, state: ok ? { text: 'Kaufen', prim: true } : { text: 'Zu teuer', off: true }, onBuy: () => buyPart(q.id) })); }
  }
  function renderUpgrade(box) {
    const E = M.E; const list = M.tab === 'utool' ? TOOLS.filter((t) => E.owned[t.id]) : VEHICLES.filter((v) => E.owned[v.id]); const stats = M.tab === 'utool' ? L.UP_TOOL : L.UP_VEH; if (!list.length) { const d = document.createElement('div'); d.className = 'mo-over'; const q = document.createElement('p'); q.textContent = 'Noch kein Fahrzeug gekauft. Bürsten-Bernd hilft gern.'; d.append(q); box.append(d); return; }
    for (const it of list) { const d = document.createElement('div'); d.className = 'mo-card'; const im = document.createElement('img'); im.alt = ''; im.src = thumb(it.id); d.append(im); const b = document.createElement('div'); b.className = 'mo-cb'; const h = document.createElement('b'); h.textContent = it.name; const row = document.createElement('div'); row.className = 'mo-up'; for (const u of stats) { const lvl = L.upLevel(E, it.id, u.k); const c = L.upCost(it, lvl); const q = document.createElement('div'); q.className = 'mo-upb'; const t = document.createElement('span'); t.textContent = `${u.name} +${u.pct} % je Stufe`; const pips = document.createElement('i'); for (let i = 0; i < L.UP_MAX; i++) { const sp = document.createElement('span'); if (i < lvl) sp.className = 'on'; pips.append(sp); } const btn = document.createElement('button'); btn.type = 'button'; const max = lvl >= L.UP_MAX; btn.textContent = max ? 'Höchste Stufe' : `Stufe ${lvl + 1}: ${fmtCr(c)} Cr`; btn.disabled = max || E.credits < c; btn.className = !btn.disabled ? 'primary' : ''; btn.onclick = () => buyUp(it.id, u.k); q.append(t, pips, btn); row.append(q); } b.append(h, row); d.append(b); box.append(d); }
  }

  // ---------------- Fabrik und Bauen ----------------
  const partList = () => Fab.PARTS.filter((q) => (M.E.inv[q.id] || 0) > 0 || (M.build && M.build.part === q.id));
  function toggleBuild(on = !M.build) {
    if (on) { if (M.P.veh) { floatText('Zum Bauen erst aussteigen'); snd.error(); return; } const l = partList(); if (!l.length) { floatText('Erst Bauteile im Technikladen hinten in der Station kaufen', 'warn'); snd.error(); return; } M.build = { part: l[0].id, d: 1, l: 0, last: null, down: false, x: null, z: null }; snd.open(); }
    else { M.build = null; M.W.fab.hideGhost(); snd.close(); }
    el('moCross').classList.toggle('hidden', !M.build); el('moBuildInfo').classList.toggle('hidden', !M.build); M.lmb = false; buildHotbar(); updateKeys(); hudTick(true);
  }
  // Baubefehle: Mitspieler fragen den Host, der wendet sie an und schickt sie an alle
  function fabOp(op) { if (M.mp && !M.mp.host) { M.mp.net.send({ t: 'mF', op }); return; } if (applyFab(op, true) && M.mp) M.mp.net.broadcast({ t: 'mF', op }); }
  function applyFab(op, pay) {
    const F = M.F; const E = M.E; let ok = false;
    if (op.op === 'p') { if (pay && !(E.inv[op.id] > 0)) return false; const e = Fab.place(F, op.id, op.x, op.z, op.l, op.d); if (e) { ok = true; snd.place(); if (pay) { E.inv[op.id]--; M.dirtyEco = true; } } }
    else if (op.op === 'r') { const e = Fab.at(F, op.x, op.z, op.l); if (e) { Fab.remove(F, e); ok = true; snd.remove(); if (pay) { E.inv[e.t] = (E.inv[e.t] || 0) + 1; if (e.t === 'intake' && e.kg > 0) L.sell(E, e.kg, M.t, 'Fabrik'); M.dirtyEco = true; } } }
    else if (op.op === 'd') { const e = Fab.at(F, op.x, op.z, op.l); if (e) { Fab.setDir(F, e, op.d); ok = true; } }
    else if (op.op === 'dep') { const e = Fab.at(F, op.x, op.z, op.l || 0); if (e && e.t === 'intake') { Fab.deposit(e, op.kg); ok = true; if (pay && op.who) { E.contrib[op.who] = (E.contrib[op.who] || 0) + op.kg; M.dirtyEco = true; } } }
    else if (op.op === 'h') { F.helpers = !!op.on; ok = true; }
    if (ok && (op.op === 'p' || op.op === 'r')) { M.W.blocks = [...M.W.staticBlocks, ...M.W.bigRocks, ...Fab.blocks(F)]; if (M.build) buildHotbar(); if (M.ui) renderPanel(); } return ok;
  }
  function removeAim() { const B = M.build; if (!B || B.x === null) return; const e = Fab.at(M.F, B.x, B.z, B.l); if (e) fabOp({ op: 'r', x: B.x, z: B.z, l: B.l }); }
  const _bv = new THREE.Vector3();
  function stepBuild() {
    const B = M.build; if (!B) return; const W = M.W; const c = W.cam.position; const dir = W.cam.getWorldDirection(_bv); const y = B.l * LOT.h + 0.1; const info = el('moBuildInfo'); const off = (t) => { B.x = null; W.fab.hideGhost(); if (info.textContent !== t) info.textContent = t; };
    if (dir.y > -0.02) { off('Schau auf den Boden des Fabrikgeländes'); return; } const t = (y - c.y) / dir.y; if (t > 52) { off('Zu weit weg: geh näher ans Fabrikgelände'); return; }
    const x = Math.floor((c.x + dir.x * t - wrapNear(LOT.x, c.x)) / LOT.cell); const z = Math.floor((c.z + dir.z * t - wrapNear(LOT.z, c.z)) / LOT.cell);
    const have = (M.E.inv[B.part] || 0) > 0; const why = Fab.canPlace(M.F, B.part, x, z, B.l) || (have ? null : 'Keine mehr im Lager'); W.fab.showGhost(B.part, x, z, B.l, B.d, !why); const q = Fab.partById(B.part); const hit = Fab.at(M.F, x, z, B.l); const txt = `${q.name} · Ebene ${B.l + 1} von ${LOT.levels} (draußen bis 100) · Strom ${M.F.power.supply}/${M.F.power.demand} kW${why ? ' · ' + why : ''}${hit ? ' · RMB reißt ab: ' + Fab.partById(hit.t).name : ''}`; if (info.textContent !== txt) info.textContent = txt;
    if (M.lmb && (!B.down || x !== B.x || z !== B.z) && !why) {
      if (B.part === 'belt' && B.last && B.last.l === B.l) { const dx = x - B.last.x; const dz = z - B.last.z; const d = Fab.DX.findIndex((v, i) => v === dx && Fab.DZ[i] === dz); if (d >= 0) { B.d = d; fabOp({ op: 'd', x: B.last.x, z: B.last.z, l: B.l, d }); } }
      fabOp({ op: 'p', id: B.part, x, z, l: B.l, d: B.d }); B.last = B.part === 'belt' ? { x, z, l: B.l } : null;
    }
    B.down = M.lmb; if (!M.lmb) B.last = null; B.x = x; B.z = z;
  }
  const fabHooks = { sold: (k) => { if (M.mp && !M.mp.host) return; M.fabCr = (M.fabCr || 0) + L.sellGoods(M.E, Fab.ITEMS[k].value, M.t); M.dirtyEco = true; }, start: () => { if (Math.hypot(wrapDelta(L.LOT_C.x, M.P.x), wrapDelta(L.LOT_C.z, M.P.z)) < 70) snd.press(0.6); } };
  function stepFab(dt) { const W = M.W; Fab.stepFactory(M.F, dt, fabHooks); const near = Math.hypot(wrapDelta(L.LOT_C.x, W.cam.position.x), wrapDelta(L.LOT_C.z, W.cam.position.z)) < 260; if (near && M.F.power.demand > 0 && M.F.power.k < 0.99) floatOnce('power', M.F.power.supply > 0 ? 'Zu wenig Strom: Baue mehr Solaranlagen oder einen Generator.' : 'Kein Strom: Die Maschinen brauchen eine Solaranlage aus dem Technikladen.'); const show = near || M.F.ents.length > 0; W.fab.group.visible = show; if (show) W.fab.update(M.F, M.t); M.fabT = (M.fabT || 0) - dt; if (M.fabT <= 0) { M.fabT = 7; if (M.fabCr > 0) { floatText(`Fabrik: +${fmtCr(M.fabCr)} Cr`, 'gold'); if (M.mp) M.mp.net.broadcast({ t: 'mT', text: `Fabrik: +${fmtCr(M.fabCr)} Cr`, kind: 'gold' }); M.fabCr = 0; hudTick(true); } } }

  // Vorschaubilder: echtes Modell in einem kleinen Bild
  const thumbs = {};
  function thumb(id) {
    if (thumbs[id]) return thumbs[id]; const W = M.W; const obj = (() => { if (id.startsWith('fab:')) return FA.previewModel(id.slice(4)); const t = TOOLS.find((x) => x.id === id); if (t) { const m = A.toolModel(t.kind, Math.min(1.2, t.w)); return m; } if (id === 'bus') return A.buildBus(); if (id === 'truck') return A.buildTruck(); if (id === 'trike') return A.buildTrike(); if (id === 'robo' || id === 'robo2') return A.buildRobot(id === 'robo2'); if (id === 'crew') { const R = A.buildAstronaut({ accent: 0x4a90d9, stripe: 0x4a90d9 }); return R.root; } if (id === 'pack') { const R = A.buildAstronaut({}); R.root.rotation.y = Math.PI; return R.root; } return null; })(); if (!obj) return null;
    const S = new THREE.Scene(); S.background = new THREE.Color(0x141a2c); S.environment = W.env; S.add(obj); const l = new THREE.DirectionalLight(0xffffff, 3.2); l.position.set(3, 4, 5); S.add(l); S.add(new THREE.HemisphereLight(0xb0b6d8, 0x60606c, 1.2));
    const box = new THREE.Box3().setFromObject(obj); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()).length(); const cam = new THREE.PerspectiveCamera(30, 1.4, 0.05, 80); const a = id === 'pack' ? 2.9 : 0.72; cam.position.set(c.x + Math.sin(a) * sz * 1.45, c.y + sz * 0.38, c.z + Math.cos(a) * sz * 1.45); cam.lookAt(c);
    const w = 196; const h = 140; const rt = new THREE.WebGLRenderTarget(w, h, { samples: 4, type: THREE.UnsignedByteType }); const prevAuto = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; renderer.setRenderTarget(rt); renderer.render(S, cam); const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px); renderer.setRenderTarget(null); renderer.shadowMap.autoUpdate = prevAuto; rt.dispose();
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); const img = x.createImageData(w, h); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const s = ((h - 1 - j) * w + i) * 4; const d = (j * w + i) * 4; for (let q = 0; q < 3; q++) { const v = px[s + q] / 255; const tm = v / (1 + v * 0.35); img.data[d + q] = 255 * Math.pow(tm, 1 / 2.2); } img.data[d + 3] = 255; } x.putImageData(img, 0, 0); thumbs[id] = cv.toDataURL('image/png'); return thumbs[id];
  }

  // ---------------- Koop ----------------
  function otherRig(id, name) { let o = M.others.get(id); if (o) return o; const rig = A.buildAstronaut(ACCENTS[slotOf(id)]); M.W.scene.add(rig.root); const tag = nameTag(name); rig.root.add(tag); o = { id, name, rig, s: { x: BASE.start.x, y: 0, z: BASE.start.z, f: 0, sp: 0, sc: 0, t: 'brush', fl: 0, v: null }, cur: { x: BASE.start.x, y: 0, z: BASE.start.z, f: 0 } }; M.others.set(id, o); return o; }
  function nameTag(name) { const c = document.createElement('canvas'); c.width = 256; c.height = 48; const x = c.getContext('2d'); x.font = '700 30px "Segoe UI", sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(10,14,24,.6)'; x.fillRect(0, 4, 256, 40); x.fillStyle = '#fff'; x.fillText(name, 128, 34); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false })); s.scale.set(1.8, 0.34, 1); s.position.y = 2.3; return s; }
  const queueStroke = (...a) => { if (M.mp) M.net.strokes.push(a); };
  // Nahtlos aneinanderhängende Striche derselben Bürste werden einer: spart bei vielen Helfern den größten Teil des Netzverkehrs
  function packStrokes(list) { const out = []; for (const a of list) { const b = out[out.length - 1]; if (b && a.length > 6 && b.length === a.length && Math.abs(b[3] - a[0]) < 1e-6 && Math.abs(b[4] - a[1]) < 1e-6 && b[6] === a[6] && b[7] === a[7]) { b[3] = a[3]; b[4] = a[4]; b[5] = a[5]; b[8] = Math.min(255, b[8] + a[8]); } else out.push(a.slice()); } return out.map((a) => a.map((v) => +v.toFixed(3))); }
  function localState() { const P = M.P; const v = P.veh && P.driving ? M.veh[P.veh] : null; const s = { x: +P.x.toFixed(2), y: +P.y.toFixed(2), z: +P.z.toFixed(2), f: +P.face.toFixed(2), sp: +P.speed.toFixed(1), sc: P.scrubbing ? 1 : 0, t: P.tool, fl: +(P.tank / L.packKg(M.E)).toFixed(2), v: P.veh }; if (v) s.vs = { id: v.id, x: +v.x.toFixed(2), z: +v.z.toFixed(2), h: +v.h.toFixed(3), sp: +v.sp.toFixed(1), st: +v.steer.toFixed(2), b: v.brush ? 1 : 0, kg: +v.kg.toFixed(1) }; return s; }
  function vehWire() { const o = {}; for (const v of Object.values(M.veh)) o[v.id] = { x: +v.x.toFixed(2), z: +v.z.toFixed(2), h: +v.h.toFixed(3), sp: +v.sp.toFixed(1), st: +v.steer.toFixed(2), b: v.brush ? 1 : 0, kg: +v.kg.toFixed(1), r: v.riders }; return o; }
  function pushVehicles() { if (M.mp && M.mp.host) M.mp.net.broadcast({ t: 'mV', v: vehWire() }); }
  function applyVehWire(wire) { const me = myId(); for (const id of Object.keys(wire)) { const w = wire[id]; const v = M.veh[id] || (M.E.owned[id] ? makeVehicle(id) : null); if (!v) continue; v.riders = w.r || []; v.driver = v.riders[0] || null; if (v.driver !== me) { v.tx = w.x; v.tz = w.z; v.th = w.h; v.sp = w.sp; v.steer = w.st; v.brush = !!w.b; v.kg = w.kg; } } applySeat(); }
  function ecoWire() { return { credits: M.E.credits, earned: M.E.earned, soldKg: M.E.soldKg, owned: M.E.owned, helpers: M.E.helpers, milestones: M.E.milestones, crystals: M.E.crystals, contrib: M.E.contrib, up: M.E.up, inv: M.E.inv, hl: M.helpers.map((h) => h.type) }; }
  // Helferliste vom Host übernehmen: gleiche Reihenfolge und Art wie dort
  function syncHelpers(list) { if (!list) return; for (let i = 0; i < list.length; i++) { const h = M.helpers[i]; if (h && h.type === list[i]) continue; if (h && h.vis) M.W.scene.remove(h.vis.root); M.helpers[i] = L.createHelper(list[i], i + 1); } while (M.helpers.length > list.length) { const h = M.helpers.pop(); if (h.vis) M.W.scene.remove(h.vis.root); } }
  function sendWorld(id) { const n = M.mp.net; n.sendTo(id, { t: 'mW', fac: Fab.dump(M.F), e: ecoWire(), cry: M.W.crystals.filter((c) => c.gone).map((c) => c.i), v: vehWire(), helpers: M.helpers.map((h) => ({ type: h.type, id: h.id, x: h.x, z: h.z, h: h.h })) }); const list = []; for (let c = 0; c < M.D.touched.length; c++) if (M.D.touched[c]) list.push(c); M.mp.queue = M.mp.queue || []; for (const c of list) M.mp.queue.push({ id, c }); }
  function onMessage(from, m) {
    if (M.phase === 'loading' || !M.P) { M.inbox.push([from, m]); return; } const isHost = M.mp && M.mp.host;
    if (m.t === 'ms' && isHost) { const name = (M.mp.net.players.find((p) => p.id === from) || {}).name || 'Spieler'; const o = otherRig(from, name); o.s = m.s; if (m.s.vs) { const v = M.veh[m.s.vs.id]; if (v && v.driver === from) { v.tx = m.s.vs.x; v.tz = m.s.vs.z; v.th = m.s.vs.h; v.sp = m.s.vs.sp; v.steer = m.s.vs.st; v.brush = !!m.s.vs.b; v.kg = m.s.vs.kg; } } return; }
    if (m.t === 'mS' && !isHost) { for (const k of Object.keys(m.p)) { if (k === myId()) continue; const e = m.p[k]; const o = otherRig(k, e.n); o.s = e.s; } for (const id of M.others.keys()) if (!m.p[id]) { const o = M.others.get(id); M.W.scene.remove(o.rig.root); M.others.delete(id); } if (m.h) m.h.forEach((a, i) => { const h = M.helpers[i]; if (h) { h.tx = a[0]; h.tz = a[1]; h.th = a[2]; h.st = a[3] ? 'work' : 'dump'; } }); if (m.v) applyVehWire(m.v); return; }
    if (m.t === 'mc') { for (const a of m.s) { if (a.length > 6) L.sweepBar(M.D, ...a); else L.sweep(M.D, a[0], a[1], a[2], a[3], a[4], a[5]); } if (isHost) M.mp.net.broadcast(m, from); return; }
    if (m.t === 'msell' && isHost) { const name = (M.mp.net.players.find((p) => p.id === from) || {}).name || 'Spieler'; const c = L.sell(M.E, Number(m.kg) || 0, M.t, name); floatText(`${name}: +${fmtCr(c)} Cr`, 'gold'); ecoChanged(); M.mp.net.broadcast({ t: 'mT', text: `${name}: +${fmtCr(c)} Cr`, kind: 'gold' }, from); M.mp.net.sendTo(from, { t: 'mT', text: `+${fmtCr(c)} Cr für das Team`, kind: 'gold' }); return; }
    if (m.t === 'mbuy' && isHost) { const r = L.buy(M.E, m.id); if (r.ok) { snd.buy(); afterBuy(m.id, r, from); ecoChanged(); M.mp.net.broadcast({ t: 'mB', id: m.id, by: from }); } else M.mp.net.sendTo(from, { t: 'mT', text: r.msg, kind: 'warn' }); return; }
    if (m.t === 'mB') { const it = L.itemById(m.id); if (it) floatText(`${it.name} gekauft`, 'gold'); snd.buy(); if (m.by === myId() && TOOLS.find((t) => t.id === m.id)) selectTool(m.id); return; }
    if (m.t === 'mveh' && isHost) { hostVeh(from, m.id, !!m.on); return; }
    if (m.t === 'mcry') { const c = M.W.crystals[m.i]; if (!c) return; if (isHost) { if (!c.gone || c.hp <= 0) { c.gone = true; hostCrystal(c); } } else c.gone = true; return; }
    if (m.t === 'mV') { applyVehWire(m.v); return; }
    if (m.t === 'mF') { if (isHost) { if (applyFab(m.op, true)) M.mp.net.broadcast({ t: 'mF', op: m.op }); } else applyFab(m.op, false); return; }
    if (m.t === 'mbuyp' && isHost) { const q = Fab.partById(m.id); if (q && M.E.credits >= q.price * q.pack) { M.E.credits -= q.price * q.pack; M.E.inv[m.id] = (M.E.inv[m.id] || 0) + q.pack; snd.buy(); ecoChanged(); } else M.mp.net.sendTo(from, { t: 'mT', text: 'Zu wenig Credits', kind: 'warn' }); return; }
    if (m.t === 'mup' && isHost) { const r = L.buyUpgrade(M.E, m.id, m.k); if (r.ok) { snd.buy(); equip(); ecoChanged(); } else M.mp.net.sendTo(from, { t: 'mT', text: r.msg, kind: 'warn' }); return; }
    if (m.t === 'mfl') { if (isHost) M.mp.net.broadcast(m, from); M.flows.push({ remote: true, kg: 0, t: 0, k: 0, dur: m.d, em: 0, rate: 300, hood: !!m.h, sx: wrapNear(m.a[0], M.P.x), sy: m.a[1], sz: wrapNear(m.a[2], M.P.z), dx: wrapNear(m.b[0], M.P.x), dy: m.b[1], dz: wrapNear(m.b[2], M.P.z) }); return; }
    if (m.t === 'mK') { for (const [id, kg] of m.k) { const e = M.F.ents.find((q) => q.id === id); if (e) e.kg = kg; } return; }
    if (m.t === 'mT') { floatText(m.text, m.kind || ''); return; }
    if (m.t === 'mFin') { M.won = true; playFinale(); return; }
    if (m.t === 'mE') { const wasOwned = JSON.stringify(M.E.owned); const { hl, ...eco } = m.e; Object.assign(M.E, eco); syncOwnedWorld(); equip(); if (wasOwned !== JSON.stringify(M.E.owned)) buildHotbar(); syncHelpers(hl); if (M.ui) renderPanel(); hudTick(true); return; }
    if (m.t === 'mW') { const { hl, ...eco } = m.e; void hl; Object.assign(M.E, eco); if (m.fac) Fab.load(M.F, m.fac); for (const i of m.cry) if (M.W.crystals[i]) M.W.crystals[i].gone = true; M.helpers = m.helpers.map((h) => { const n = L.createHelper(h.type, h.id); n.x = h.x; n.z = h.z; n.h = h.h; return n; }); syncOwnedWorld(); applyVehWire(m.v); buildHotbar(); hudTick(true); return; }
    if (m.t === 'mD') { const b = (M.mdBuf = M.mdBuf || {}); const q = b[m.c] && b[m.c].n === m.n ? b[m.c] : (b[m.c] = { n: m.n, a: [], got: 0 }); if (typeof m.s !== 'string' || q.a[m.i] !== undefined) return; q.a[m.i] = m.s; q.got++; if (q.got >= q.n) { delete b[m.c]; L.decodeChunk(M.D, m.c, q.a.join(''), true); } return; }
  }
  function netTick(dt) {
    const mp = M.mp; if (!mp) return; const n = M.net; n.acc += dt; n.slow += dt;
    if (mp.host) pushEco();
    // Staubkacheln für Nachzügler: in Stücken unter der PeerJS-Grenze (16300 Zeichen je Nachricht, früher 48000: große, viel geputzte Kacheln kamen nie an und waren nach dem Wiedereintritt wieder staubig) und nur, solange der Sendepuffer nicht voll ist
    if (mp.host && mp.queue && mp.queue.length && mp.net.pressure() < 150000) { const q = mp.queue.shift(); const str = L.encodeChunk(M.D, q.c); const size = 12000; const n = Math.max(1, Math.ceil(str.length / size)); for (let i = 0; i < n; i++) mp.net.sendTo(q.id, { t: 'mD', c: q.c, s: str.slice(i * size, (i + 1) * size), i, n }); }
    if (n.acc < 0.08) return; n.acc = 0; const st = packStrokes(n.strokes); n.strokes = []; for (const k of Object.keys(n.hs)) st.push(...packStrokes(n.hs[k])); n.hs = {};
    if (mp.host) { if (st.length) mp.net.broadcast({ t: 'mc', s: st }); const p = { host: { n: mp.net.me.name, s: localState() } }; for (const o of M.others.values()) p[o.id] = { n: o.name, s: o.s }; const m = { t: 'mS', p, v: vehWire() }; if (n.slow > 0.4) { n.slow = 0; m.h = M.helpers.map((h) => [+h.x.toFixed(1), +h.z.toFixed(1), +h.h.toFixed(2), h.st === 'work' ? 1 : 0]); if ((M.ecoT = (M.ecoT || 0) + 0.4) > 10) { M.ecoT = 0; M.dirtyEco = true; } /* alle 10 s Kasse und Besitz erneut: heilt jede verlorene Meldung */ pushEco(true); const ik = Fab.intakes(M.F); if (ik.length) mp.net.broadcast({ t: 'mK', k: ik.map((e) => [e.id, Math.round(e.kg)]) }); } if (mp.net.pressure() < 250000) mp.net.broadcast(m); /* Stau auf der Leitung: Positionen sind veraltet, bevor sie ankommen, die Striche (mc) und die Kasse (mE) gehen immer raus */ }
    else { if (mp.net.pressure() < 250000) mp.net.send({ t: 'ms', s: localState() }); if (st.length) mp.net.send({ t: 'mc', s: st }); }
  }
  function stepOthers(dt) {
    const c = M.W.cam.position; const me = myId();
    for (const o of M.others.values()) {
      const s = o.s; const k = 1 - Math.exp(-dt * 12); o.cur.x += (wrapNear(s.x, o.cur.x) - o.cur.x) * k; o.cur.y += (s.y - o.cur.y) * k; o.cur.z += (wrapNear(s.z, o.cur.z) - o.cur.z) * k; o.cur.f += angDiff(s.f, o.cur.f) * k; const T = toolById(s.t); rigTool(o.rig, s.t); o.rig.setFill(s.fl || 0); const r = o.rig.root; const tr = s.v === 'trike' ? M.veh.trike : null; r.visible = !s.v || !!tr;
      if (tr) { const seat = tr.model.userData.seats[0]; r.position.set(wrapNear(tr.x, c.x), tr.y + seat.y - 0.5, wrapNear(tr.z, c.z)); r.rotation.y = tr.h; A.poseAstronaut(o.rig, { speed: 0, seat: true }, dt); continue; }
      r.position.set(wrapNear(o.cur.x, c.x), o.cur.y, wrapNear(o.cur.z, c.z)); r.rotation.y = o.cur.f; if (s.v) continue; A.poseAstronaut(o.rig, { speed: s.sp, scrub: !!s.sc, kneel: T.kind === 'brush' && !!s.sc, seat: false, air: false, oscW: L.toolOsc(T) }, dt);
      if (s.sc && o.rig.tip.on && Math.hypot(r.position.x - c.x, r.position.z - c.z) < 45) { const sf = Math.sin(o.cur.f); const cf = Math.cos(o.cur.f); const hx = o.cur.x + o.rig.tip.x * cf + o.rig.tip.z * sf; const hz = o.cur.z - o.rig.tip.x * sf + o.rig.tip.z * cf; if (L.dustAt(M.D, hx, hz) > 40) brushFx(hx, hz, o.cur.f, L.toolStats(M.E, T).w, T.kind === 'pusher' ? 1.2 : 0.7, 1); }
    }
    for (const v of Object.values(M.veh)) { if (v.driver === me) continue; if (v.tx !== undefined) { v.x += (wrapNear(v.tx, v.x) - v.x) * Math.min(1, dt * 10); v.z += (wrapNear(v.tz, v.z) - v.z) * Math.min(1, dt * 10); v.h += angDiff(v.th, v.h) * Math.min(1, dt * 10); } poseVehicle(v, dt); if (v.brush && Math.abs(v.sp) > 0.15 && Math.hypot(wrapDelta(v.x, c.x), wrapDelta(v.z, c.z)) < 60) { const bz = v.lay.brushZ; const hx = v.x + Math.sin(v.h) * bz; const hz = v.z + Math.cos(v.h) * bz; if (L.dustAt(M.D, hx, hz) > 40) brushFx(hx, hz, v.h, L.vehStats(M.E, v.spec).w, v.id === 'truck' ? 1.6 : 1.1, -Math.sign(bz)); } }
  }
  function playerJoined(id, name) { if ((M.phase !== 'play' && M.phase !== 'intro') || !M.mp || !M.mp.host) return; M.mp.net.sendTo(id, { t: 'start', mode: 'moon', late: true }); otherRig(id, name); sendWorld(id); floatText(`${name} hilft jetzt mit. Angeblich.`); }
  function playerLeft(id) { if (!M.mp) return; const o = M.others.get(id); if (o) { M.W.scene.remove(o.rig.root); M.others.delete(id); } if (M.mp.host) for (const v of Object.values(M.veh)) if (v.riders.includes(id)) hostVeh(id, v.id, false); }

  // ---------------- Hauptschleife ----------------
  function frame(dt, t) {
    const W = M.W; if (!W || M.phase === 'off' || M.phase === 'loading') { return; } if (M.phase === 'intro') { if (M.mp && M.P) { stepHelpers(dt); stepOthers(dt); netTick(dt); } if (M.intro) stepIntro(dt); return; } if (M.phase === 'finale') { M.t += dt; stepHelpers(dt); stepOthers(dt); netTick(dt); stepFinale(dt); return; } const paused = G.mode !== 'moon' && !M.mp; if (!paused) M.t += dt;
    if (M.phase === 'play' && !paused) {
      if (M.P.veh) stepRide(dt); else stepWalk(dt); stepHelpers(dt); stepOthers(dt); stepFx(dt); stepFlows(dt); stepFab(dt); if (++M.pumpN % 2 === 0) pumpDirty(M.P.x, M.P.z); netTick(dt); tickLoops(); hudTick(false); watchRes();
      M.saveT += dt; if (M.saveT > 15) { M.saveT = 0; save(); } M.depthT = (M.depthT || 0) - dt; if (M.depthT <= 0) { M.depthT = 1; tagDepth(); }
      if (M.mapOpen) { M.mapT -= dt; if (M.mapT <= 0) { M.mapT = 0.8; drawMap(); } }
      const near = Math.hypot(wrapDelta(BASE.station.x, M.P.x), wrapDelta(BASE.station.z, M.P.z)); M.screenT -= dt; if (near < 34 && M.screenT <= 0) { M.screenT = 1.2; drawStationScreens(); }
      const st = W.station.userData; let dd = Math.hypot(wrapDelta(BASE.station.x, M.P.x), wrapDelta(BASE.station.z + L.STATION.hz, M.P.z)); for (const o of M.others.values()) dd = Math.min(dd, Math.hypot(wrapDelta(BASE.station.x, o.s.x), wrapDelta(BASE.station.z + L.STATION.hz, o.s.z))); M.doorO = damp(M.doorO || 0, dd < 6 ? 1 : 0, 6, dt); const o = M.doorO * L.STATION.door * 0.96; st.dL.position.x = -L.STATION.door / 2 - o; st.dR.position.x = L.STATION.door / 2 + o; st.globe.rotation.y += dt * 0.12; st.halo.rotation.z += dt * 0.5;
      const b = W.bernd; b.scrubT = (b.scrubT || 0) + dt; b.root.rotation.y = Math.atan2(wrapDelta(M.P.x, b.root.userData.mx), wrapDelta(M.P.z, b.root.userData.mz)); A.poseAstronaut(b, { speed: 0, scrub: false, oscW: 0 }, dt);
    } else if (M.phase === 'title') { pumpDirty(BASE.station.x, BASE.station.z); stepFx(dt); titlePose(); }
    poseCamera(dt); placeWorld(); if (M.phase === 'play' && !paused) stepBuild(); renderer.render(W.scene, W.cam);
  }
  function exitToMenu() { el('moonTitle').classList.add('hidden'); host.openMenu(); }

  // Knöpfe
  el('moContinue').onclick = () => { if (M.noIntro) beginPlay(); else startIntro(true); };
  el('moNew').onclick = async () => { const sv = store.get(SAVE_KEY, null); if (sv && !M.newConfirm) { M.newConfirm = true; el('moNew').textContent = 'Wirklich? Der alte Mond geht verloren'; return; } await resetSave(); await loadSave(); placeVehicles(); syncOwnedWorld(); applySpawn(); if (M.noIntro) beginPlay(); else startIntro(); };
  el('moCoop').onclick = () => { el('moonTitle').classList.add('hidden'); host.openCoop(); };
  el('moExit').onclick = exitToMenu;
  el('moClose').onclick = () => closePanel();
  el('moMapClose').onclick = () => closeMap();

  Object.assign(M, { playFinale, open, stop, frame, onKey, pointerDown, pointerUp, mouseLook, startCoop, message: onMessage, playerJoined, playerLeft, active: () => M.phase !== 'off', save, beginPlay, applyRes, buyItem, buyPart, buyUp, fabOp, toggleBuild, Fab, dustAt: (x, z) => L.dustAt(M.D, x, z), selectTool, interact, openPanel, closePanel, openMap, closeMap, resetSave, hudTick, ecoChanged, L });
  return M;
}
