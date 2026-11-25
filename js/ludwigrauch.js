// Theos Seitenscheidel - Ludwig Zigaretti: selber rauchen, das Sichtbare (2026-11-22). Regeln: ludwigsucht.js.
// R halten raucht, R tippen wechselt die Sorte. Im Zimmer steht danach alles voll Rauch: Handtuch vom Bett nehmen (E) und mit Klicks zum Fenster rausschütteln.
// Alle fünf Minuten schwarz-weiß und die Meldung „Du brauchst eine Zigarette.“
import * as THREE from './vendor/three.module.min.js';
import { puffTex, canvasTex, rng } from './titelkit.js';
import { ROOM } from './ludwigart.js';
import { SORTEN } from './ludwiglogic.js';
import { SUCHT_S, RAUCHBAR, DAUER, istVape, suchtTick, brauchtEine, gewaehlt, naechste, pruefe, rauche, wasser, schuettle, schuettelnNoch, vorrat, offeneZuege } from './ludwigsucht.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const TIPPEN = 0.25; // kürzer = Sorte wechseln
const MELDUNG = 'Du brauchst eine Zigarette.';
const MELDUNG_S = 5; const NOCHMAL_S = 30;
const BETT = V3(2.74, 0.58, -1.22); // Fußende vom Bett, da liegt das Handtuch
const BEULEN = [[3.118, -1.25, 0.208, 0.056, 0.16], [2.818, -1.05, 0.156, 0.042, 0.12]]; // Beulen in der Decke (ludwigdeko.js): Mitte x/z, Radius x, Höhe, Radius z
function deckeH(x, z) { // so hoch ist die Decke hier, damit das Handtuch darüber liegt statt darin
  let y = 0.532;
  for (const [bx, bz, rx, h, rz] of BEULEN) { const d = ((x - bx) / (rx + 0.04)) ** 2 + ((z - bz) / (rz + 0.04)) ** 2; if (d < 1) y = Math.max(y, 0.53 + (h + 0.016) * Math.sqrt(1 - d)); }
  return y;
}
const FENSTER = V3(0, 1.6, ROOM.z0 - 0.1);
const WARUM = {
  drinnen: 'Nicht hier drin. Geh raus.',
  leer: 'Nichts zum Rauchen in den Taschen.',
  joint: 'Nicht den Joint. Der ist nur für Kunden, Ludwig geht noch zur Schule.',
};

// host: { C, hud, snd, toast, ort(), darf(), save() }
export function createLudwigRauch({ C, hud, snd, toast, ort, darf, save }) {
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, id, cls) => { const e = document.createElement(tag); e.id = id; e.className = cls; return e; };
  const qualmUi = el('div', 'lwQualm', 'lw-qualm hidden'); hud.prepend(qualmUi);
  const meldung = el('p', 'lwSucht', 'lw-sucht hidden'); meldung.setAttribute('role', 'status'); meldung.textContent = MELDUNG;
  const hinweis = el('div', 'lwRauchHint', 'lw-rauchhint hidden');
  const taste = document.createElement('kbd'); const text = document.createElement('span'); const zug = document.createElement('i'); const zugFill = document.createElement('em');
  zug.append(zugFill); hinweis.append(taste, text, zug);
  hud.append(meldung, hinweis);

  const R = { halten: null, rest: 0, tuch: false, schwung: 0, wehen: 0, husten: 0, braucht: false, meldT: 0, warteT: 0, remoteT: new Map(), zeige: null, sinken: 0, zeit: 0 };
  let A = null;

  // ---------------- Bauen ----------------
  function stoff(w, h) {
    const tex = canvasTex(128, 128, (c, W, H) => {
      c.fillStyle = '#f2eee4'; c.fillRect(0, 0, W, H); c.fillStyle = '#2f7fc8';
      for (const y of [12, 26, 100]) c.fillRect(0, y, W, y === 100 ? 16 : 8);
      const r = rng(5); for (let i = 0; i < 700; i++) { c.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.07)'; c.fillRect(r() * W, r() * H, 2, 2); }
    });
    return { geo: new THREE.PlaneGeometry(w, h, 8, 8), mat: new THREE.MeshStandardMaterial({ map: tex, roughness: 1, side: THREE.DoubleSide }) };
  }
  function build() {
    if (A) return;
    const scene = C.W.scene; const r = rng(31); const map = puffTex();
    A = { wolken: [], puffs: [], next: 0 };

    const bett = stoff(0.5, 0.4); bett.geo.dispose();
    const tuchG = new THREE.PlaneGeometry(0.5, 0.4, 30, 24); tuchG.rotateX(-Math.PI / 2); const p = tuchG.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = BETT.x + p.getX(i); const z = BETT.z + p.getZ(i); p.setY(i, deckeH(x, z) + 0.016 + Math.sin(x * 34) * 0.004 + Math.cos(z * 41) * 0.003 - BETT.y); }
    tuchG.computeVertexNormals();
    A.liegt = new THREE.Group(); A.liegt.position.copy(BETT); scene.add(A.liegt);
    const lage = new THREE.Mesh(tuchG, bett.mat); lage.receiveShadow = true; A.liegt.add(lage);

    const hand = stoff(0.3, 0.34);
    A.tuchBasis = hand.geo.attributes.position.array.slice(); A.tuchGeo = hand.geo;
    A.inHand = new THREE.Group(); A.inHand.position.set(0.22, -0.13, -0.56); A.inHand.visible = false; C.cam.add(A.inHand);
    const flag = new THREE.Mesh(hand.geo, hand.mat); flag.position.y = -0.16; A.inHand.add(flag);

    // Hand mit der Kippe
    A.hand = new THREE.Group(); A.hand.visible = false; C.cam.add(A.hand);
    const haut = new THREE.MeshStandardMaterial({ color: 0xe2b08c, roughness: 0.7 });
    const teil = (geo, pos, scale, rot = null) => { const m = new THREE.Mesh(geo, haut); m.position.set(...pos); m.scale.set(...scale); if (rot) m.rotation.set(...rot); A.hand.add(m); return m; };
    const kugel = new THREE.SphereGeometry(1, 14, 10);
    teil(kugel, [0.044, -0.035, 0.01], [0.029, 0.024, 0.031]); // Handfläche
    teil(kugel, [0.037, -0.008, -0.005], [0.015, 0.022, 0.016]); // Knöchel, daran hängen die zwei Finger
    teil(kugel, [0.014, -0.025, 0.016], [0.022, 0.008, 0.009], [0, 0.6, 0.5]); // Daumen
    teil(kugel, [0.016, -0.013, -0.004], [0.026, 0.0075, 0.0085], [0, 0, 0.35]);
    teil(kugel, [0.019, 0.011, -0.006], [0.024, 0.0075, 0.0085], [0, 0, -0.25]);
    teil(new THREE.CylinderGeometry(0.02, 0.026, 0.3, 12), [0.12, -0.15, 0.1], [1, 1, 1], [-0.65, 0, 0.6]);
    A.waren = {};
    for (const id of RAUCHBAR) {
      const m = new THREE.Mesh(id === 'kippe' ? C.W.cigGeo : C.SA.geos[id], id === 'kippe' ? C.W.cigMats : C.SA.mat);
      m.rotation.y = Math.PI / 2; m.visible = false; A.hand.add(m); A.waren[id] = m;
    }
    A.glutMat = new THREE.MeshBasicMaterial({ color: 0xff5a16, toneMapped: false });
    A.glut = new THREE.Mesh(new THREE.SphereGeometry(0.0062, 10, 8), A.glutMat); A.hand.add(A.glut);
    A.flamme = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 8), new THREE.MeshBasicMaterial({ color: 0xffc24a, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false }));
    A.hand.add(A.flamme);

    // Qualm im Zimmer
    A.qualm = new THREE.Group(); A.qualm.visible = false; scene.add(A.qualm);
    for (let i = 0; i < 34; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: 0xc4c4c0, transparent: true, opacity: 0, depthWrite: false, rotation: r() * 6 }));
      s.renderOrder = 4; A.qualm.add(s);
      A.wolken.push({ s, x: ROOM.x0 + 0.4 + r() * 6.2, y: 0.6 + r() * 1.8, z: ROOM.z0 + 0.35 + r() * 5.3, size: 1 + r() * 0.9, p: r() * 6.28, k: 0.6 + r() * 0.4 });
    }
    // ausgeatmeter Rauch, auch von den anderen Spielern
    for (let i = 0; i < 48; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, opacity: 0, depthWrite: false }));
      s.visible = false; s.renderOrder = 5; scene.add(s);
      A.puffs.push({ s, t: 0, max: 1, v: V3(), size: 0.1, a: 0.5 });
    }
  }
  function puff(pos, v, o = {}) {
    if (!A) return;
    const p = A.puffs[A.next]; A.next = (A.next + 1) % A.puffs.length;
    p.t = 0; p.max = o.life || 2; p.v.copy(v); p.size = o.size || 0.1; p.a = o.a || 0.5;
    p.s.material.color.setHex(o.color || 0xd8d8d4); p.s.material.rotation = Math.random() * 6; p.s.position.copy(pos); p.s.scale.setScalar(p.size); p.s.visible = true;
  }
  function ausatmen(vape) {
    const vor = V3(0, 0, -1).applyQuaternion(C.cam.quaternion); const runter = V3(0, -0.085, -0.28).applyQuaternion(C.cam.quaternion);
    const bei = C.cam.position.clone().add(runter);
    for (let i = 0; i < (vape ? 9 : 5); i++) {
      const v = vor.clone().multiplyScalar(0.3 + Math.random() * 0.4).add(V3((Math.random() - 0.5) * 0.2, 0.08 + Math.random() * 0.12, (Math.random() - 0.5) * 0.2));
      puff(bei, v, { size: vape ? 0.16 : 0.09, life: 1.6 + Math.random(), a: vape ? 0.55 : 0.42, color: vape ? 0xf0f4f6 : 0xc8c8c4 });
    }
  }

  // ---------------- Tasten und Klicks ----------------
  function rDown() {
    if (!C.S || R.halten || !darf()) return;
    R.halten = { t: 0, start: false, id: null, zuege: 0 };
  }
  function rUp() {
    const h = R.halten; if (!h) return;
    R.halten = null;
    if (h.start || h.tot || !C.S || h.t >= TIPPEN) return;
    const alt = gewaehlt(C.S); const id = naechste(C.S);
    if (!id) { snd.nope(); toast(WARUM[pruefe(C.S, null, ort()).why] || WARUM.leer); return; }
    snd.ui(); toast(`${id === alt ? 'Zum Rauchen hast du nur' : 'Zum Rauchen gewählt'}: ${SORTEN[id].name}. R halten zum Rauchen.`, 2200);
  }
  function haltenTick(dt) {
    const h = R.halten; if (!h || h.tot) return;
    if (!darf()) { h.tot = true; h.start = false; return; }
    const S = C.S; h.t += dt;
    if (h.t < TIPPEN) return;
    if (!h.start) {
      const id = gewaehlt(S); const p = pruefe(S, id, ort());
      if (!p.ok) { snd.nope(); toast(WARUM[p.why] || WARUM.leer, 3000); h.tot = true; return; }
      h.start = true; h.id = id; snd.anzuenden(istVape(id));
    }
    const vape = istVape(h.id); const u = (h.t - TIPPEN) / DAUER[h.id];
    const zuege = vape ? 1 : Math.round(DAUER[h.id] / 1.1);
    const n = Math.min(zuege, Math.floor(u * zuege + 0.2));
    if (n > h.zuege) { h.zuege = n; snd.zug(vape); ausatmen(vape); }
    if (u < 1) return;
    const r = rauche(S, h.id, ort());
    h.tot = true; h.start = false;
    if (!r.ok) { snd.nope(); toast(WARUM[r.why] || WARUM.leer); return; }
    ausatmen(vape); R.husten = 0.9; R.sinken = 0.35; R.zeige = h.id; snd.husten();
    toast(r.qualm ? 'Jetzt ist das ganze Zimmer voll Rauch. Schüttel ihn mit dem Handtuch vom Bett raus.' : vape ? `Hust. ${offeneZuege(S, h.id) > 0 ? `In der Vape ${offeneZuege(S, h.id) === 1 ? 'ist noch 1 Zug' : `sind noch ${offeneZuege(S, h.id)} Züge`}.` : 'Die Vape ist leer.'}` : 'Hust, hust.', r.qualm ? 4200 : 2000);
    C.dirty = true; save();
  }
  function schuetteln() {
    if (!R.tuch || !C.S || !darf() || C.mode !== 'walk' || C.area !== 'zimmer') return false;
    if (R.schwung > 0.12) return true; // noch mitten im Schwung
    const rest = schuettle(C.S);
    R.schwung = 0.38; R.wehen = 1; snd.stoff();
    for (let i = 0; i < 3; i++) {
      const bei = C.cam.position.clone().add(V3((Math.random() - 0.5) * 0.4, -0.1, -0.6).applyQuaternion(C.cam.quaternion));
      puff(bei, FENSTER.clone().sub(bei).multiplyScalar(0.55), { size: 0.3, life: 1.6, a: 0.4 });
    }
    if (rest <= 0) { R.tuch = false; toast('Der Rauch ist draußen. Das Handtuch liegt wieder auf dem Bett.', 2800); }
    C.dirty = true; save();
    return true;
  }

  // ---------------- Ziele (E und F) ----------------
  function targets(add) {
    if (!A || !C.S || C.area !== 'zimmer') return;
    if (R.tuch) add(BETT, 1.7, { k: 'tuch', e: 'Handtuch zurücklegen', hl: A.liegt, minDot: 0.72 });
    else if (schuettelnNoch(C.S) > 0) add(BETT, 1.7, { k: 'tuch', e: 'Handtuch nehmen', hl: A.liegt, minDot: 0.72 });
  }
  function interact(t, key) {
    if (!t || !C.S) return false;
    if (t.k === 'tuch') {
      if (key !== 'e') return true;
      R.tuch = !R.tuch; snd.stoff();
      if (R.tuch) toast('Handtuch in der Hand. Klicken oder Leertaste: Rauch rausschütteln.', 3400);
      return true;
    }
    if (t.k === 'egg' && t.egg === 'brunnen' && key === 'f') {
      const r = wasser(C.S); snd.schluck();
      toast(r.brauchte ? 'Gluck, gluck. Die Farben sind wieder da, ganz ohne Kippe.' : 'Gluck, gluck. Wasser aus dem Brunnen. Günther schaut komisch.', 2800);
      C.dirty = true; save();
      return true;
    }
    return false;
  }

  // ---------------- Bild ----------------
  function schreibe(node, t) { if (node.textContent !== t) node.textContent = t; }
  function hinweisTick(S, sicht, noch) {
    const h = R.halten; const raucht = !!(h && h.start);
    let k = ''; let t = ''; let balken = null;
    if (!sicht || C.ui) { /* Menü offen */ } else if (raucht) {
      k = 'R'; t = `halten: ${SORTEN[h.id].name}${ort() === 'zimmer' ? ' (qualmt das Zimmer voll)' : ''}`; balken = clamp((h.t - TIPPEN) / DAUER[h.id], 0, 1);
    } else if (C.ctrl) { /* die Eltern kommen: da zählen nur deren Aufgaben */ } else if (R.tuch && noch > 0) {
      k = 'Klick'; t = `oder Leertaste: schütteln, noch ${noch} Mal`; balken = 1 - noch / 10;
    } else if (R.braucht) {
      const id = gewaehlt(S); const o = ort();
      if (!o) t = WARUM.drinnen;
      else if (!id) t = 'Nichts in den Taschen. Hol was aus der Box oder trink am Brunnen Wasser (F).';
      else { k = 'R'; t = `halten: ${SORTEN[id].name} rauchen${o === 'zimmer' ? ', besser draußen' : ''}${vorrat(S).length > 1 ? '. Tippen: andere Sorte' : ''}`; }
    } else if (noch > 0 && C.area === 'zimmer') t = 'Alles voll Rauch. Nimm das Handtuch vom Bett (hinschauen, E).';
    hinweis.classList.toggle('hidden', !t); hinweis.classList.toggle('sitzt', C.mode === 'sit');
    schreibe(taste, k); taste.classList.toggle('hidden', !k); schreibe(text, t);
    zug.classList.toggle('hidden', balken === null); if (balken !== null) zugFill.style.width = `${balken * 100}%`;
  }
  function handTick(dt) {
    const h = R.halten; const raucht = !!(h && h.start);
    R.sinken = Math.max(0, R.sinken - dt);
    const id = raucht ? h.id : R.sinken > 0 ? R.zeige : null;
    A.hand.visible = !!id;
    if (C.held) C.held.visible = !id && !R.tuch; // sonst stecken die Stäbe aus den Taschen in der Hand
    if (!id) return;
    const vape = istVape(id); const geo = A.waren[id].geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const spitze = geo.boundingBox.max.x; const dick = geo.boundingBox.max.y; // die Ware liegt entlang x, gedreht zeigt +x von Ludwig weg
    for (const [k, m] of Object.entries(A.waren)) m.visible = k === id;
    const t = raucht ? h.t - TIPPEN : 0; const hoch = raucht ? ease(t / 0.4) : ease(R.sinken / 0.35);
    A.hand.position.set(0.2 - 0.165 * hoch, -0.31 + 0.222 * hoch, -0.34 + 0.11 * hoch);
    A.hand.rotation.set(0.12 * (1 - hoch), 0.22, 0);
    const zieht = raucht ? Math.max(0, Math.sin(t * 5.7)) : 0;
    A.glut.position.set(0, vape ? dick : 0, vape ? -spitze * 0.65 : -spitze + 0.001); // Glut rund ums Ende, bei der Vape ein Lämpchen obendrauf
    A.glut.scale.setScalar(vape ? 0.5 : (dick / 0.0062) * (1.3 + zieht * 0.3)); // dicker als die Ware, sonst sieht man sie von hinten nicht
    A.glutMat.color.setHex(vape ? 0x5ad8ff : 0xff5a16).multiplyScalar(0.8 + zieht * 1.2);
    A.flamme.visible = raucht && !vape && t < 0.5 && Math.sin(t * 45) > -0.5;
    A.flamme.position.set(0, 0, -spitze - 0.014);
  }
  function tuchTick(dt) {
    A.liegt.visible = !R.tuch; A.inHand.visible = R.tuch && C.mode === 'walk';
    R.schwung = Math.max(0, R.schwung - dt);
    if (!A.inHand.visible) return;
    const u = R.schwung / 0.38; const hieb = Math.sin(u * Math.PI * 2);
    A.inHand.rotation.set(-Math.abs(hieb) * 0.5, hieb * 0.35, hieb * 0.75);
    A.inHand.position.set(0.22 - hieb * 0.13, -0.13 + Math.abs(hieb) * 0.07, -0.56);
    const pos = A.tuchGeo.attributes.position; const b = A.tuchBasis;
    for (let i = 0; i < pos.count; i++) {
      const y = b[i * 3 + 1]; const k = (0.17 - y) / 0.34;
      pos.setZ(i, Math.sin(R.zeit * (u > 0 ? 24 : 3) + b[i * 3] * 14 + y * 9) * (u > 0 ? 0.04 : 0.008) * k);
    }
    pos.needsUpdate = true; A.tuchGeo.computeVertexNormals();
  }
  function qualmTick(dt, rauch, sicht) {
    R.rest += (rauch - R.rest) * (1 - Math.exp(-dt * 3));
    if (R.rest < 0.004) R.rest = 0;
    R.wehen = Math.max(0, R.wehen - dt * 1.3);
    A.qualm.visible = R.rest > 0;
    const zeit = calm.matches ? 2 : R.zeit;
    if (A.qualm.visible) for (const w of A.wolken) {
      const weg = R.wehen * 0.28 * w.k;
      const x = w.x + Math.sin(zeit * 0.23 + w.p) * 0.3; const y = w.y + Math.sin(zeit * 0.31 + w.p) * 0.14; const z = w.z + Math.cos(zeit * 0.19 + w.p) * 0.3;
      w.s.position.set(x + (FENSTER.x - x) * weg, y + (FENSTER.y - y) * weg, z + (FENSTER.z - z) * weg);
      const nah = clamp((w.s.position.distanceTo(C.cam.position) - 0.35) / 0.9, 0, 1); // direkt vor der Nase nicht als Wand
      w.s.material.opacity = R.rest * 0.3 * w.k * nah; w.s.scale.setScalar(w.size * (0.7 + 0.3 * R.rest));
    }
    const nebel = sicht && C.area === 'zimmer' ? R.rest : 0;
    qualmUi.classList.toggle('hidden', nebel <= 0);
    qualmUi.style.opacity = String(nebel);
  }
  function puffTick(dt) {
    for (const p of A.puffs) {
      if (!p.s.visible) continue;
      p.t += dt; if (p.t >= p.max) { p.s.visible = false; continue; }
      const k = p.t / p.max;
      p.v.multiplyScalar(Math.exp(-dt * 1.1)); p.s.position.addScaledVector(p.v, dt);
      p.s.scale.setScalar(p.size + k * 0.55); p.s.material.opacity = p.a * Math.min(1, k * 9) * (1 - k);
    }
  }

  // run: die Welt läuft (nicht Pause, nicht Tutorial)
  function tick(dt, run) {
    if (!A) return;
    const S = C.S; R.zeit += dt;
    if (!S) return;
    const imSpiel = C.mode !== 'cine' && C.mode !== 'menu' && C.mode !== 'wait' && !C.finaleOn; // das Finale bleibt bunt
    if (run && imSpiel) { R.uhr = (R.uhr || 0) + dt; if (R.uhr >= 1) { const n = Math.floor(R.uhr); R.uhr -= n; if (S.sucht.t < SUCHT_S) suchtTick(S, n); } } // ganze Sekunden, sonst ginge im Mehrspieler jedes Bild eine Änderung raus
    if (!(C.mp && !C.mp.host)) S.rauch = clamp(S.rauch || 0, 0, 1); // zwei auf einmal: mehr als voll gibt es nicht
    const noch = schuettelnNoch(S);
    if (R.tuch && (noch <= 0 || C.area !== 'zimmer' || C.mode === 'sit' || C.mode === 'wclimb' || C.mode === 'climb')) R.tuch = false;
    haltenTick(dt);

    const braucht = imSpiel && brauchtEine(S);
    if (braucht && !R.braucht) { R.meldT = MELDUNG_S; R.warteT = NOCHMAL_S; snd.brauch(); }
    R.braucht = braucht;
    if (braucht && run) { R.warteT -= dt; if (R.warteT <= 0) { R.meldT = MELDUNG_S; R.warteT = NOCHMAL_S; } }
    R.meldT = braucht ? Math.max(0, R.meldT - dt) : 0;
    document.body.classList.toggle('lw-grau', braucht);
    meldung.classList.toggle('hidden', !(R.meldT > 0) || !!C.ui || !!C.ctrl); // nie über dem Eltern-Alarm

    hinweisTick(S, imSpiel, noch);
    handTick(dt); tuchTick(dt); qualmTick(dt, clamp(S.rauch || 0, 0, 1), imSpiel); puffTick(dt);
    R.husten = Math.max(0, R.husten - dt);
    if (R.tuch && noch > 0 && C.W.win) C.W.win.hinge.rotation.y = Math.max(C.W.win.hinge.rotation.y, 1.2); // Fenster auf
  }
  function kamera(cam) { // Hustenwackler
    if (!(R.husten > 0) || calm.matches) return;
    const k = R.husten / 0.9; cam.rotateX(Math.sin(R.zeit * 38) * 0.018 * k); cam.rotateZ(Math.sin(R.zeit * 29) * 0.012 * k); cam.updateMatrixWorld();
  }
  // Mitspieler, die gerade rauchen: Rauch über dem Kopf
  function fremd(id, P, dt) {
    if (!A) return;
    let t = (R.remoteT.get(id) || 0) - dt;
    if (t <= 0) {
      t = 0.28;
      puff(V3(P.x, (P.y || 0) + (P.mode === 'sit' ? 1.1 : 1.58), P.z), V3((Math.random() - 0.5) * 0.15, 0.22, (Math.random() - 0.5) * 0.15), { size: 0.12, life: 2.1, a: 0.5 });
    }
    R.remoteT.set(id, t);
  }
  function hustenVonPfeife() { if (!A) return; ausatmen(true); ausatmen(true); R.husten = 0.9; snd.husten(); } // Rudis Wasserpfeife (Regeln in ludwigextra.js)
  function reset() {
    Object.assign(R, { halten: null, tuch: false, schwung: 0, wehen: 0, husten: 0, braucht: false, meldT: 0, sinken: 0, uhr: 0, rest: C.S ? C.S.rauch || 0 : 0 });
    R.remoteT.clear();
    document.body.classList.remove('lw-grau');
    for (const e of [meldung, hinweis, qualmUi]) e.classList.add('hidden');
    if (C.held) C.held.visible = true;
    if (!A) return;
    A.hand.visible = false; A.inHand.visible = false; A.liegt.visible = true; A.qualm.visible = false;
    for (const p of A.puffs) p.s.visible = false;
  }

  return {
    build, reset, tick, kamera, targets, interact, rDown, rUp, schuetteln, fremd, husten: hustenVonPfeife,
    get raucht() { return !!(R.halten && R.halten.start); },
    get tuch() { return R.tuch; },
    state: R, art: () => A, bett: BETT,
  };
}
