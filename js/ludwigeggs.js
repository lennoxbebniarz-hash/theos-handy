// Theos Seitenscheidel - Ludwig Zigaretti: 10 Easter Eggs (2026-11-21, Wunsch Lennox: „so 10 kleine Easter Eggs irgendwo auf der Welt“, alle Vorschläge „Ja“).
// Zimmer: Rauchmelder (Batterie fehlt), Gitarre (schiefer Riff), Deckenlampe (5-mal E = 10 Sekunden Disco), Aquarium (Fische füttern), unterm Bett (Socke von 2019 und 2 €).
// Draußen: Brunnen (Münze für 1 €, Glückstreffer 50 € nur einmal pro Spielstand), Taube Günther mit Krone (fliegt nie weg), Gartenzwerg bei Herrn Krause (dreht den Kopf mit),
// Gully auf der Straße (Ludwig ruft hinein, Echo). Bunker: Gummi-Ente in der dunklen Ecke vorne links (quietscht).
// Jedes Ei bringt einmal 3 Respekt (findEgg in ludwiglogic.js), der Zähler steht in der Handy-App Lager; alle zehn: goldene Kippe auf Ludwigs Bücherregal.
// Beim Anschauen sehen die Eier aus wie normale Sachen (Name, Umrandung, Pieps). Zusammengefasste Teile bekommen unsichtbare Stellvertreter für die Umrandung.
import * as THREE from './vendor/three.module.min.js';
import { ROOM, OUT_Y } from './ludwigart.js';
import { BUNKER } from './ludwigbunkerart.js';
import { BOXES } from './ludwigaussen.js';
import { std, mesh } from './ludwiggfx.js';
import { EGGS, wishCoin, eggCount } from './ludwiglogic.js';

const R = ROOM; const FZ = R.z0 - R.t; const Y = OUT_Y;
export const ZWERG = { x: 14.4, z: FZ - 1.55 }; // vor Herrn Krauses rechter Hecke, schaut zur Straße
export const GULLY = { x: -12, z: FZ - 6.0 }; // Kanaldeckel auf der Fahrbahn links vor dem Haus
export const ENTE = { x: -15.5, z: 10.45 }; // lokal im Bunker
BOXES.push({ x0: ZWERG.x - 0.16, x1: ZWERG.x + 0.16, z0: ZWERG.z - 0.16, z1: ZWERG.z + 0.16 });
const WISHES = ['Wunsch: Mama macht den PC wieder an.', 'Wunsch: Die Polizei hat heute frei.', 'Wunsch: Kalle wird billiger.', 'Wunsch: unendlich Bildschirmzeit.', 'Wunsch: Herr Krause zieht weg.', 'Wunsch: nie wieder Hausaufgaben.', 'Wunsch: Zigarettenboss werden. Bald.'];
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function createEggs({ W, AU, BK, snd, toast, getS, found }) {
  const proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
  const proxy = (geo, x, y, z, parent) => { const m = new THREE.Mesh(geo, proxyMat); m.position.set(x, y, z); m.userData.proxy = true; parent.add(m); return m; };
  // ---- Zimmer: Stellvertreter für Rauchmelder, Lampenschirm, Aquarium, Bett; goldene Kippe auf dem Bücherregal (zwischen Globus und Pflanze)
  const smoke = proxy(new THREE.CylinderGeometry(0.068, 0.072, 0.04, 20), 0.7, R.h - 0.02, 1.6, W.scene);
  const lamp = proxy(new THREE.ConeGeometry(0.24, 0.2, 28), 0, R.h - 0.7, 0.1, W.scene);
  const tank = proxy(new THREE.BoxGeometry(0.8, 0.36, 0.3), -1.05, 0.96, 2.79, W.scene);
  const bed = proxy(new THREE.BoxGeometry(1.01, 0.55, 2.05), R.x1 - 0.525, 0.275, (R.z0 + 0.05 - 0.9) / 2, W.scene);
  const gold = std({ color: 0xffc83a, metalness: 1, roughness: 0.22, emissive: 0x4a3000, emissiveIntensity: 0.6 }); const goldD = std({ color: 0xc8901a, metalness: 1, roughness: 0.3, emissive: 0x2a1800 }); const black = std({ color: 0x141418, roughness: 0.5 });
  const trophy = new THREE.Group(); trophy.position.set(-1.4, 0.92, -2.8); W.scene.add(trophy); trophy.visible = false;
  mesh(new THREE.BoxGeometry(0.2, 0.025, 0.07), black, 0, 0.0125, 0, trophy); for (const x of [-0.05, 0.05]) mesh(new THREE.BoxGeometry(0.018, 0.03, 0.03), goldD, x, 0.04, 0, trophy);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 14), gold, 0.02, 0.065, 0, trophy, { rz: Math.PI / 2 }); mesh(new THREE.CylinderGeometry(0.0122, 0.0122, 0.04, 14), goldD, -0.055, 0.065, 0, trophy, { rz: Math.PI / 2 });
  // ---- Draußen: Gartenzwerg (Kopf dreht sich mit), Stellvertreter für Gully und Brunnenbecken
  const out = AU.content || AU.g; const gnome = new THREE.Group(); gnome.position.set(ZWERG.x, Y, ZWERG.z); gnome.rotation.y = Math.PI; out.add(gnome);
  { const red = std({ color: 0xd8261c, roughness: 0.6 }); const blue = std({ color: 0x2a4ab8, roughness: 0.6 }); const skin = std({ color: 0xf0c0a0, roughness: 0.7 }); const white = std({ color: 0xf4f2ec, roughness: 0.9 }); const brown = std({ color: 0x4a2a14, roughness: 0.8 });
    for (const x of [-0.035, 0.035]) mesh(new THREE.BoxGeometry(0.045, 0.035, 0.07), brown, x, 0.018, 0.01, gnome); mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.17, 12), blue, 0, 0.12, 0, gnome); mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.018, 12), black, 0, 0.1, 0, gnome);
    const head = new THREE.Group(); head.position.set(0, 0.235, 0); gnome.add(head); gnome.userData.head = head; mesh(new THREE.SphereGeometry(0.048, 14, 10), skin, 0, 0, 0, head);
    mesh(new THREE.ConeGeometry(0.045, 0.1, 12), white, 0, -0.05, 0.028, head, { rx: Math.PI }); mesh(new THREE.SphereGeometry(0.012, 8, 6), red, 0, 0.002, 0.047, head); mesh(new THREE.ConeGeometry(0.052, 0.15, 14), red, 0, 0.09, -0.005, head, { rx: -0.15 });
    for (const x of [-0.017, 0.017]) mesh(new THREE.SphereGeometry(0.006, 6, 4), black, x, 0.014, 0.042, head); }
  const gully = proxy(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 20), GULLY.x, Y - 0.088, GULLY.z, out);
  const br = AU.brunnen; const fountain = br ? proxy(new THREE.CylinderGeometry(2.1, 2.1, 0.56, 40), br.at.x, Y + 0.04 + 0.28, br.at.z, out) : null;
  // ---- Bunker: Gummi-Ente
  const duck = new THREE.Group(); duck.position.set(ENTE.x, 0, ENTE.z); duck.rotation.y = 2.4; (BK.root || W.scene).add(duck);
  { const yel = std({ color: 0xffd21a, roughness: 0.35, emissive: 0x2a1e00 }); const ora = std({ color: 0xff8a1a, roughness: 0.4 }); const body = mesh(new THREE.SphereGeometry(0.07, 14, 10), yel, 0, 0.05, 0, duck); body.scale.set(1, 0.72, 1.3);
    mesh(new THREE.SphereGeometry(0.045, 12, 10), yel, 0, 0.12, 0.05, duck); mesh(new THREE.BoxGeometry(0.035, 0.012, 0.035), ora, 0, 0.115, 0.098, duck); for (const x of [-0.02, 0.02]) mesh(new THREE.SphereGeometry(0.006, 6, 4), black, x, 0.133, 0.088, duck);
    mesh(new THREE.ConeGeometry(0.03, 0.05, 8), yel, 0, 0.07, -0.1, duck, { rx: -1.9 }); }
  // ---- Disco: Pendelleuchte und Raumlicht wechseln die Farbe, die Glühbirne auch
  const pend = W.scene.children.find((o) => o.isSpotLight && Math.abs(o.position.x) < 0.05 && o.position.y > 1.4); const fill = W.scene.children.find((o) => o.isPointLight && Math.abs(o.position.x - 0.4) < 0.05 && Math.abs(o.position.z - 1.4) < 0.05);
  const bulb = W.M && W.M.bulb; const keep = { pc: pend ? pend.color.clone() : null, pi: pend ? pend.intensity : 0, fc: fill ? fill.color.clone() : null, be: bulb && bulb.emissive ? bulb.emissive.clone() : null };
  let discoT = 0; let flick = 0; let clicks = 0; let lastClick = 0; let wig = 0; let squash = 0;
  function startDisco(sec = 10) { discoT = sec; snd.disco(sec); }
  function endDisco() { if (pend && keep.pc) { pend.color.copy(keep.pc); pend.intensity = keep.pi; } if (fill && keep.fc) fill.color.copy(keep.fc); if (bulb && keep.be) bulb.emissive.copy(keep.be); }
  const guenther = () => (br && br.pigeons ? br.pigeons.find((q) => q.king) : null);
  // ---- Ziele (wie normale Sachen) und was E macht
  function targets(add, area) {
    const S = getS(); if (!S) return;
    if (area === 'zimmer') {
      add(V(0.7, R.h - 0.05, 1.6), 2.6, { k: 'egg', egg: 'rauchmelder', e: 'Rauchmelder', hl: smoke, minDot: 0.95 });
      if (W.deko && W.deko.guitar) add(V(-3.25, 0.7, 2.0), 1.6, { k: 'egg', egg: 'gitarre', e: 'Gitarre spielen', hl: W.deko.guitar });
      add(V(0, R.h - 0.72, 0.1), 2.0, { k: 'egg', egg: 'disco', e: 'Deckenlampe', hl: lamp, minDot: 0.97 }); // nur wer richtig hochschaut, nicht beim Blick über den Tisch
      add(V(-1.05, 0.97, 2.79), 1.6, { k: 'egg', egg: 'aquarium', e: 'Fische füttern', hl: tank });
      add(V(R.x1 - 1.13, 0.25, -1.9), 1.5, { k: 'egg', egg: 'bett', e: 'Unters Bett schauen', hl: bed });
      if (trophy.visible) add(V(-1.4, 1.0, -2.8), 1.8, { k: 'egg', egg: 'pokal', e: 'Goldene Kippe: alle Easter Eggs gefunden', hl: trophy });
    } else if (area === 'draussen') {
      if (fountain) add(V(br.at.x, Y + 0.6, br.at.z), 3.3, { k: 'egg', egg: 'brunnen', e: 'Münze in den Brunnen werfen (1 €)', f: 'Wasser trinken', hl: fountain });
      const g = guenther(); if (g && br.isDay()) add(V(g.x, Y + 0.25, g.z), 2.2, { k: 'egg', egg: 'guenther', e: 'Günther', hl: g.p });
      add(V(ZWERG.x, Y + 0.3, ZWERG.z), 1.8, { k: 'egg', egg: 'zwerg', e: 'Gartenzwerg', hl: gnome });
      add(V(GULLY.x, Y - 0.05, GULLY.z), 1.5, { k: 'egg', egg: 'gully', e: 'In den Gully rufen', hl: gully });
    } else if (area === 'bunker') add(V(BUNKER.x + ENTE.x, 0.12, BUNKER.z + ENTE.z), 1.6, { k: 'egg', egg: 'ente', e: 'Gummi-Ente', hl: duck });
  }
  const say = (msg, r, ms = 3200) => toast(r && r.neu ? `${msg}  🥚 Easter Egg ${r.n}/${EGGS.length} gefunden!` : msg, r && r.neu ? Math.max(ms, 4200) : ms);
  function interact(t, key) {
    if (!t || t.k !== 'egg') return false; if (key !== 'e') return true; const S = getS(); if (!S) return true;
    switch (t.egg) {
      case 'rauchmelder': snd.smoke(); say('Der Rauchmelder piept: Batterie fehlt. Ludwig hat vorgesorgt.', found('rauchmelder')); break;
      case 'gitarre': snd.guitar(); wig = 2.0; say('Ludwig spielt den einzigen Akkord, den er kann. Und einen, den er nicht kann.', found('gitarre')); break;
      case 'disco': { const now = performance.now(); clicks = now - lastClick < 2500 ? clicks + 1 : 1; lastClick = now; snd.click(); flick = 0.12;
        if (discoT > 0) break; if (clicks >= 5) { clicks = 0; startDisco(); say('Disco!', found('disco'), 3000); } else toast(['Klick.', 'Klick. Klick.', 'Klick. Klick. Klick.', 'Noch einmal …'][clicks - 1], 1200); break; }
      case 'aquarium': if (W.deko && W.deko.feed) W.deko.feed(); snd.feed(); say('Die Fische heißen Filter und Blättchen. Sie haben immer Hunger.', found('aquarium')); break;
      case 'bett': { const first = !(S.eggs && S.eggs.bett); if (first) { S.geld += 200; snd.coin(1); } say(first ? 'Unterm Bett: eine Socke von 2019 und 2 €.' : 'Unterm Bett liegt nur noch die Socke. Sie riecht nach 2019.', found('bett')); break; }
      case 'brunnen': { const r = wishCoin(S); if (!r.ok) { snd.nope(); toast('Kein Euro dabei. Ohne Münze kein Wunsch.'); break; } snd.plunk(); if (r.lucky) setTimeout(() => snd.coin(5), 700);
        say(r.lucky ? 'Der Brunnen erfüllt deinen Wunsch: 50 € liegen am Rand!' : WISHES[(Math.random() * WISHES.length) | 0], found('brunnen'), r.lucky ? 4600 : 3000); break; }
      case 'guenther': snd.gurr(); say('Das ist Günther. Er ist der König vom Brunnenplatz und hat vor niemandem Angst.', found('guenther')); break;
      case 'zwerg': snd.gnome(); say('Der Gartenzwerg hat dich gesehen. Er sagt nichts. Noch nicht.', found('zwerg')); break;
      case 'gully': { const len = snd.echoVoice('l_gully'); const r = found('gully'); setTimeout(() => say('Der Gully antwortet. Wahrscheinlich nur das Echo. Wahrscheinlich.', r), Math.max(900, len * 1000 + 600)); break; }
      case 'ente': snd.squeak(); squash = 0.35; say('Quietsch! Wer badet denn hier unten?', found('ente')); break;
      case 'pokal': snd.egg(true); toast('Die goldene Kippe: alle 10 Easter Eggs gefunden. Respekt!', 3600); break;
      default: break;
    }
    return true;
  }
  // ---- jedes Bild: Pokal zeigen, Disco, Lampe flackert beim Klicken, Gitarre wackelt, Ente quetscht, Zwerg schaut Ludwig nach
  function update(t, dt, px, pz, area) {
    const S = getS(); trophy.visible = !!S && eggCount(S) === EGGS.length;
    if (discoT > 0) { discoT -= dt; const h = (t * 0.7) % 1; if (pend) { pend.color.setHSL(h, 1, 0.6); pend.intensity = keep.pi * (0.75 + 0.35 * (Math.sin(t * 12.6) > 0 ? 1 : 0)); } if (fill) fill.color.setHSL((h + 0.5) % 1, 1, 0.6); if (bulb) bulb.emissive.setHSL(h, 1, 0.5); if (discoT <= 0) endDisco(); }
    else if (flick > 0) { flick -= dt; if (pend) pend.intensity = flick > 0 ? keep.pi * 0.25 : keep.pi; }
    const gt = W.deko && W.deko.guitar; if (gt && wig > 0) { wig -= dt; gt.rotation.z = 0.1 + Math.sin(t * 34) * 0.018 * Math.min(1, wig); if (wig <= 0) gt.rotation.z = 0.1; }
    if (squash > 0) { squash -= dt; const k = Math.max(0, squash) / 0.35; duck.scale.set(1 + 0.2 * k, 1 - 0.3 * Math.sin(k * Math.PI), 1 + 0.2 * k); }
    const head = gnome.userData.head; if (area === 'draussen' && head) { const dx = px - ZWERG.x; const dz = pz - ZWERG.z; const d = Math.hypot(dx, dz); let want = 0; if (d < 9) { want = Math.atan2(dx, dz) - gnome.rotation.y; while (want > Math.PI) want -= Math.PI * 2; while (want < -Math.PI) want += Math.PI * 2; want = Math.max(-1.3, Math.min(1.3, want)); } head.rotation.y += (want - head.rotation.y) * Math.min(1, dt * 3); }
  }
  return { targets, interact, update, objects: { smoke, lamp, tank, bed, trophy, gnome, gully, fountain, duck }, disco: () => discoT, startDisco };
}
