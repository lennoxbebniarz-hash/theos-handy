// Theos Seitenscheidel - Ludwig Zigaretti: Abstimmung Paket 4 (2026-11-22), hängt Regeln (ludwigextra.js), Bild (ludwigextraart.js)
// und Fenster (ludwigextraui.js) ins Spiel. ludwig.js ruft nur die Haken hier auf.
import { RAEDER, RAD_IDS, hatRad, naechstesRad, chatTick, chatSchreib, pfeife } from './ludwigextra.js';
import { buildExtra } from './ludwigextraart.js';
import { createNachricht } from './ludwigextraui.js';
import { SHOP } from './ludwigkiosk.js';
import { inErwin } from './ludwigerwin.js';

const PFEIFE_S = 2.4; // so lange dauert ein Zug
const imLaden = (x, z) => (x > SHOP.x0 && x < SHOP.x1 && z > SHOP.z0 - 0.15 && z < SHOP.z1) || inErwin(x, z);

// host: { C, hud, snd, toast, save, rauch, client(), frei(), faktor() }
export function createPaket({ C, hud, snd, toast, save, rauch, client, frei, faktor }) {
  const nachricht = createNachricht(hud, snd);
  const P = { fahrt: null, zug: 0, blubb: 0, acc: 0, chatId: null };
  let X = null;

  function build() { X = buildExtra({ W: C.W, AU: C.AU, BK: C.BK, cam: C.cam }); }
  function reset() {
    Object.assign(P, { fahrt: null, zug: 0, blubb: 0, acc: 0, chatId: null });
    nachricht.reset();
    if (X) X.reset();
  }
  function refresh() { if (X && C.S && C.S.deko) X.set(C.S, P.fahrt); }

  // ---- Fahren
  function absteigen() { if (!P.fahrt) return; P.fahrt = null; C.dirty = true; }
  function taste() {
    const S = C.S;
    if (!S || C.ui || C.mode !== 'walk') return;
    if (!RAD_IDS.some((id) => hatRad(S, id))) { snd.nope(); toast('Du hast noch kein Fahrrad. Fahrrad und E-Roller gibt es im Shop am PC.', 3000); return; }
    if (C.area !== 'draussen' || imLaden(C.me.x, C.me.z)) { snd.nope(); toast('Gefahren wird nur draußen.', 2200); return; }
    if (P.zug > 0) return;
    P.fahrt = naechstesRad(S, P.fahrt); snd.pick(); C.dirty = true;
    toast(P.fahrt ? `${RAEDER[P.fahrt].name}: los geht's. B ${naechstesRad(S, P.fahrt) ? 'wechselt weiter' : 'steigt ab'}.` : 'Abgestiegen.', 2200);
  }
  const tempo = () => (P.fahrt ? RAEDER[P.fahrt].tempo : 0);

  // ---- Wasserpfeife
  function targets(add) {
    if (!X || C.area !== 'draussen' || P.zug > 0) return;
    add(X.pfeife.at, 1.8, { k: 'pfeife', hl: X.pfeife.g, e: 'Rudis Wasserpfeife: einmal ziehen', minDot: 0.8 });
  }
  function interact(t, key) {
    if (!t || t.k !== 'pfeife') return false;
    if (key === 'e' && P.zug <= 0) { absteigen(); P.zug = PFEIFE_S; P.blubb = 0; }
    return true;
  }
  function pfeifeTick(dt) {
    if (!(P.zug > 0)) return;
    const weit = Math.hypot(C.me.x - X.pfeife.at.x, C.me.z - X.pfeife.at.z) > 2.3;
    if (weit || C.area !== 'draussen' || C.ui || C.mode !== 'walk' || C.ctrl) { P.zug = 0; return; }
    P.zug -= dt; P.blubb -= dt;
    if (P.blubb <= 0) { P.blubb = 0.8; snd.bubble(); }
    if (P.zug > 0) return;
    P.zug = 0;
    const r = pfeife(C.S); rauch.husten();
    toast(r.brauchte ? 'Blubber, hust. Die Farben sind wieder da. Mehr bringt sie nicht.' : 'Blubber, hust. Bringt gar nichts außer Husten.', 3200);
    C.dirty = true; save();
  }

  // ---- Chat: schreiben nur Gastgeber oder allein, zeigen alle
  function melde(art) { if (C.S && C.S.chat && C.S.kumpels && !client()) { chatSchreib(C.S, art, frei()); C.dirty = true; } }
  function welt(e) {
    if (e.k === 'polizei' || e.k === 'zurueck') melde(e.k);
    else if (e.k === 'einkauf' && !C.ctrl) melde('einkauf');
    else if (e.k === 'nachbar' && e.out) melde('nachbar');
  }
  function chatUhr(dt) {
    if (client() || C.ctrl) return;
    P.acc += dt;
    if (P.acc < 1) return;
    const n = Math.floor(P.acc); P.acc -= n;
    if (chatTick(C.S, n, { frei: frei(), faktor: faktor() })) C.dirty = true;
  }
  function chatZeigen() {
    const K = C.S.chat;
    if (P.chatId === null || K.id < P.chatId) { P.chatId = K.id; return; } // Altes nicht noch einmal melden
    if (K.id === P.chatId) return;
    P.chatId = K.id;
    const m = K.list[K.list.length - 1];
    if (m) nachricht.zeig(m);
  }

  function tick(dt, run) {
    if (!X) return;
    const S = C.S; const spiel = !!S && !!S.chat && C.mode !== 'cine' && C.mode !== 'menu' && C.mode !== 'wait';
    if (P.fahrt && (!spiel || C.area !== 'draussen' || C.mode !== 'walk' || !hatRad(S, P.fahrt) || imLaden(C.me.x, C.me.z))) absteigen();
    if (spiel) {
      if (run) { chatUhr(dt); pfeifeTick(dt); }
      chatZeigen();
    }
    nachricht.tick(dt, spiel && !C.ctrl && C.ui !== 'phone' && C.ui !== 'pause' && !C.finaleOn);
    X.update(C.t, dt, { zeigen: spiel && C.ui !== 'pc', faehrt: P.fahrt, area: C.area, moving: C.me.moving });
    if (C.held && P.fahrt) C.held.visible = false;
  }

  return {
    build, reset, refresh, taste, targets, interact, tick, welt, melde, absteigen, tempo,
    zimmerBoxen: () => (X && C.S && C.S.deko ? X.boxen(C.S) : []),
    draussenBoxen: () => (X ? [X.pfeife.box] : []),
    fremd: (platz, fig, p, dt) => { if (X) X.fremdRad(platz, fig, RAD_IDS.includes(p.rad) && p.area === 'draussen' ? p.rad : null, dt); },
    fremdWeg: (platz) => { if (X) X.fremdWeg(platz); },
    get fahrt() { return P.fahrt; },
    get zieht() { return P.zug > 0; },
    state: P, art: () => X,
  };
}
