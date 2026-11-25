// Theos Seitenscheidel - Ludwig Zigaretti: gesprochene Sätze der Reihe nach, mit Untertitel (Stimmen-Update 2026-11-22).
// Wer Wichtigeres sagt (Eltern, Polizei), ruft stop(): dann bricht die Reihe ab.
import { WHO } from './ludwigvoice.js';
import { SAETZE, NAMEN, LEUTE, KTEXT } from './ludwigtexte.js';

export function satz(id) {
  const q = SAETZE[id]; if (!q) return null;
  const [who, text, file] = q;
  const w = WHO[who] || { name: NAMEN[who] || '', col: '#d8f0c8' };
  return { file, name: w.name, col: w.col, text };
}
export function leuteSatz(id, key) {
  const L = LEUTE[id]; if (!L || !key || !L.t[key]) return null;
  return { file: `leute/${id}_${key}`, name: L.name, col: '#bfe3a8', text: L.t[key] };
}
export function kundenSatz(voice, key, name) {
  const t = KTEXT[voice] && KTEXT[voice][key]; if (!t) return null;
  return { file: `kunden/${voice}_${key}`, name, col: '#ffcf9a', text: t };
}

// zeige(zeile, sekunden): Untertitel
export function createStimmen({ snd, zeige, darf }) {
  let lauf = 0; let reihe = null; let warte = 0; let laedt = false;
  function stop() { lauf++; reihe = null; warte = 0; laedt = false; }
  function weiter() {
    if (!reihe) return;
    const z = reihe.list.shift();
    if (!z) { const fertig = reihe.fertig; stop(); if (fertig) fertig(); return; }
    const nr = lauf; laedt = true;
    const los = (puffer) => {
      if (nr !== lauf) return;
      laedt = false;
      if (!darf()) { stop(); return; }
      const d = puffer ? snd.playVoice(z.file, z.gain || 1) : 0;
      const s = d || 0.8 + z.text.length * 0.06;
      zeige(z, s); warte = s + 0.15;
    };
    snd.loadVoice(z.file).then(los, () => los(null));
  }
  function sag(list, fertig = null) {
    stop(); snd.stopVoice();
    const l = list.filter(Boolean);
    if (!l.length) { if (fertig) fertig(); return false; }
    reihe = { list: l, fertig }; weiter();
    return true;
  }
  function tick(dt) { if (!reihe || laedt) return; warte -= dt; if (warte <= 0) weiter(); }
  return { sag, stop, tick, redet: () => !!reihe };
}
