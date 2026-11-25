// Theos Seitenscheidel - Ludwig Zigaretti: Abstimmung Paket 5 (2026-11-23), hängt Regeln (ludwigbunker3.js) und Bild (ludwigbunker3art.js) ins Spiel.
// Razzia-Anzeige oben, Regale und Verstecke im Bunker, Takt beim Gastgeber. Meldungen zur Razzia kommen aus dem Stand, damit Mitspieler sie genauso sehen.
import * as THREE from './vendor/three.module.min.js';
import { REGALE, regalVon, regalRein, regalRaus, SORTMASCHINEN, SM_IDS, smStatus, VERSTECKE, VERSTECK_IDS, verstecke, tickTeil3, LIQUID_MAX } from './ludwigbunker3.js';
import { buildTeil3, REGAL_POS, SM_POS, VERSTECK_POS } from './ludwigbunker3art.js';
import { BUNKER } from './ludwigbunkerart.js';
import { bunkerOpen } from './ludwigbunker.js';
import { handOf, addHand, handRoom, matOf, addMat, teilOf, teileRoom, MAT_NAMES } from './ludwiglogic.js';

const L3 = { bunkerOpen, matOf, addMat, teilOf, teileRoom, handOf, addHand, handRoom };
const bW = (x, y, z) => new THREE.Vector3(BUNKER.x + x, y, BUNKER.z + z);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.ceil(s % 60) % 60).padStart(2, '0')}`;

// host: { C, hud, snd, toast, save, client(), chat(art) }
export function createTeil3({ C, hud, snd, toast, save, client, chat }) {
  let A = null; const P = { acc: 0, n: null, geschafft: null, aktiv: false };
  const box = document.createElement('div'); box.id = 'lwRazzia'; box.className = 'lw-razzia hidden'; box.setAttribute('role', 'status');
  const kopf = document.createElement('b'); const liste = document.createElement('ul'); box.append(kopf, liste); hud.append(box);
  const zeilen = Object.fromEntries(VERSTECK_IDS.map((id) => { const li = document.createElement('li'); li.textContent = VERSTECKE[id]; liste.append(li); return [id, li]; }));

  function build() { A = buildTeil3(C.BK.root); }
  function reset() { Object.assign(P, { acc: 0, n: null, geschafft: null, aktiv: false }); box.classList.add('hidden'); }

  // ---- Meldungen aus dem Stand (für Gastgeber und Mitspieler gleich)
  function meldungen(S) {
    const R = S.bunker.razzia;
    if (P.n === null) { P.n = R.n; P.geschafft = R.geschafft; P.aktiv = R.left > 0; return; }
    if (R.n > P.n) { P.n = R.n; snd.sting(); snd.ping(true); toast('RAZZIA! Die Polizei steht vor der Tiefgarage. Zwei Minuten: alles im Bunker verstecken!', 5200); chat('razzia'); }
    const aktiv = R.left > 0;
    if (P.aktiv && !aktiv) {
      if (R.geschafft > P.geschafft) { snd.buy(); toast('Die Polizei findet nichts und zieht ab. Das gibt Respekt.', 4200); }
      else { snd.nope(); toast('Die Polizei war schneller: Ein Drittel vom Lager und von den Regalen ist weg.', 5200); }
      P.geschafft = R.geschafft;
    }
    P.aktiv = aktiv;
  }
  function anzeige(S, sichtbar) {
    const R = S.bunker.razzia; const an = R.left > 0 && sichtbar;
    box.classList.toggle('hidden', !an); if (!an) return;
    const t = `RAZZIA: noch ${mmss(R.left)}`; if (kopf.textContent !== t) kopf.textContent = t;
    for (const id of VERSTECK_IDS) zeilen[id].classList.toggle('ok', !!R.hidden[id]);
  }

  function tick(dt, run) {
    if (!A || !C.S || !C.S.bunker || !C.S.bunker.razzia) return;
    const S = C.S;
    if (run && !client() && bunkerOpen(S)) {
      P.acc += dt * (C.fast ? 30 : 1);
      if (P.acc >= 0.5) { const d = P.acc; P.acc = 0; for (const e of tickTeil3(S, d, L3)) { C.dirty = true; if (e.k === 'smFertig') { snd.buy(); toast(`${SORTMASCHINEN[e.id].name} ist fertig aufgebaut!`, 2800); } } }
    }
    meldungen(S);
    anzeige(S, C.mode !== 'cine' && C.mode !== 'menu' && C.ui !== 'pause' && !C.finaleOn);
    A.update(S, dt, C.area === 'bunker');
  }
  const aktiv = () => !!(C.S && C.S.bunker && C.S.bunker.razzia && C.S.bunker.razzia.left > 0);

  function targets(add) {
    if (!A || C.area !== 'bunker') return; const S = C.S; const B = S.bunker;
    if (!(aktiv() && !B.razzia.hidden.regale)) REGAL_POS.forEach((p, i) => { // während der Razzia erst der Vorhang
      const R = REGALE[i]; const dabei = R.sorten.reduce((a, k) => a + handOf(S, k), 0); const drin = regalVon(B, R);
      add(bW(p.x, 1.0, p.z - 0.4), 1.6, { k: 'regal', i, e: dabei > 0 ? `${dabei} ${R.name} ins Regal legen` : `Regal ${R.name}: ${drin.toLocaleString('de-DE')} drin`, info2: !(dabei > 0), f: drin > 0 ? `${R.name} herausnehmen` : '' });
    });
    for (const id of SM_IDS) {
      if (!B.sm[id].have) continue; const p = SM_POS[id]; const M = SORTMASCHINEN[id]; const st = smStatus(S, id); const q = B.sm[id];
      const was = id === 'liquid' ? 'Liquid-Base in die Teilekiste' : `${M.name.replace(/automat|station|-Wickler/i, '')}`;
      const fehlt = Object.keys(M.use).filter((m) => matOf(S, m) < M.use[m]).map((m) => MAT_NAMES[m] || m);
      const e = st === 'bau' ? `${M.name}: wird aufgebaut (${Math.round((1 - q.build / M.build) * 100)} %)` : st === 'aus' ? `${M.name}: ausgeschaltet (Razzia)` : st === 'material' ? (id === 'liquid' ? `${M.name}: Teilekiste voll oder ${LIQUID_MAX} Liquid-Base erreicht` : `${M.name}: es fehlt ${fehlt.join(', ') || 'Material'}`) : `${M.name} läuft: ${M.rate} pro Minute, bisher ${q.made.toLocaleString('de-DE')}`;
      void was; add(bW(p.x, 1.0, p.z), 1.9, { k: 'sm', id, e, info2: true });
    }
    if (aktiv()) for (const id of VERSTECK_IDS) if (!B.razzia.hidden[id]) { const v = VERSTECK_POS[id]; add(bW(v.x, v.y, v.z), id === 'lager' ? 3.4 : 1.9, { k: 'versteck', id, e: `Razzia: ${VERSTECKE[id]}` }); }
  }
  function interact(t, key) {
    if (!t || !C.S) return false; const S = C.S;
    if (t.k === 'versteck') {
      if (key !== 'e') return true; const r = verstecke(S, t.id);
      if (r.ok) { snd.take(); toast(r.rest ? `${VERSTECKE[t.id]}: erledigt. Noch ${r.rest}.` : 'Alles versteckt. Jetzt abwarten.', 2600); C.dirty = true; save(); }
      return true;
    }
    if (t.k === 'regal') {
      const R = REGALE[t.i];
      const r = key === 'e' ? regalRein(S, R, L3) : key === 'f' ? regalRaus(S, R, L3) : null; if (!r) return true;
      if (r.ok) { snd.take(); toast(key === 'e' ? `${r.n} ${R.name} ins Regal gelegt.` : `${r.n} ${R.name} eingesteckt.`); C.dirty = true; save(); } else { snd.nope(); if (key === 'f') toast(r.why === 'voll' ? 'Deine Taschen sind voll.' : 'Das Regal ist leer.'); }
      return true;
    }
    return t.k === 'sm';
  }
  return {
    build, reset, tick, targets, interact, aktiv,
    boxen: () => (A && C.S && C.S.bunker && C.S.bunker.sm ? A.boxen(C.S) : []),
    art: () => A,
  };
}
