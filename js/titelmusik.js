// Theos Seitenscheidel - Musik der Startbildschirme: leise Schleifen, alles synthetisch (Web Audio), keine Dateien.
// Lennox, 2026-11-21: Ludwig (Lounge), Strom (schleichender Einbruch) und Ozean (Insel). Seit 2026-11-22 auch Big Bruno (Anflug) und das Zimmer mit dem Schrank.
// compose() plant Töne bis zu einem Zeitpunkt. So lässt sich die Lautstärke ohne Lautsprecher nachrechnen (OfflineAudioContext).
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tools(c, out, noiseBuf) {
  return {
    tone(t, m, len, { type = 'sine', vol = 0.1, attack = 0.006, lp = 0, slide = 0, pan = 0 } = {}) {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(hz(m), t);
      if (slide) o.frequency.exponentialRampToValueAtTime(hz(m + slide), t + len);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(len, attack + 0.02));
      let last = o; const chain = [];
      if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; chain.push(f); }
      if (pan) { const p = c.createStereoPanner(); p.pan.value = pan; chain.push(p); }
      for (const n of [...chain, g]) { last.connect(n); last = n; }
      g.connect(out); o.start(t); o.stop(t + Math.max(len, attack + 0.02) + 0.03);
      o.onended = () => { o.disconnect(); for (const n of chain) n.disconnect(); g.disconnect(); };
    },
    noise(t, len, { type = 'bandpass', f = 2000, q = 1, vol = 0.1, attack = 0.003 } = {}) {
      const s = c.createBufferSource(); const fl = c.createBiquadFilter(); const g = c.createGain();
      s.buffer = noiseBuf; s.loop = true; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + len);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + attack + len + 0.03);
      s.onended = () => { s.disconnect(); fl.disconnect(); g.disconnect(); };
    },
  };
}

// Ein Schritt = eine Achtel, ein Takt = acht Schritte
const SONGS = {
  ludwig: { // langsame Lounge: Rhodes, Bass, Besen
    bpm: 84, gain: 0.34, swing: 0.17,
    step(T, t, i, s) {
      const chords = [[53, 57, 60, 64], [53, 57, 59, 64], [52, 55, 59, 62], [49, 55, 58, 64]]; const roots = [38, 43, 36, 45];
      const bar = Math.floor(i / 8); const k = i % 8; const c = bar % 4;
      if (k === 0 || k === 5) chords[c].forEach((m, n) => {
        T.tone(t + n * 0.012, m, s * (k ? 2.4 : 4.6), { vol: 0.075, attack: 0.01, pan: (n - 1.5) * 0.25 });
        T.tone(t + n * 0.012, m + 12, s * 0.9, { vol: 0.014, type: 'triangle' });
      });
      if (k % 2 === 0) { const walk = [0, 7, 9, (roots[(c + 1) % 4] - roots[c] + 1)]; T.tone(t, roots[c] + walk[k / 2], s * 1.7, { type: 'triangle', vol: 0.17, lp: 520 }); }
      if (k === 2 || k === 6) T.noise(t, 0.2, { f: 2600, q: 0.5, vol: 0.05, attack: 0.02 });
      T.noise(t, 0.035, { type: 'highpass', f: 7000, vol: k % 2 ? 0.012 : 0.022 });
      const tune = [[1, 76], [3, 74], [4, 72], [10, 71], [13, 74], [17, 72], [19, 71], [20, 67], [27, 69], [30, 73], [33, 77], [36, 76], [38, 72], [42, 71], [49, 67], [51, 71], [52, 74], [58, 73]];
      for (const [at, m] of tune) if (at === i % 64) { T.tone(t, m, s * 3, { vol: 0.06, pan: 0.25 }); T.tone(t, m + 12, s, { vol: 0.012, pan: 0.25 }); }
    },
  },
  strom: { // schleichen, zupfen, schnipsen, dazwischen brummt und scheppert die Maschine
    bpm: 108, gain: 0.35, swing: 0.1,
    step(T, t, i, s) {
      const k = i % 8; const bar = Math.floor(i / 8); const move = [0, 0, 5, -1][Math.floor(bar / 2) % 4];
      const bass = [40, 0, 43, 0, 45, 46, 47, 0][k];
      if (bass) T.tone(t, bass + move, s * 0.9, { type: 'sawtooth', vol: 0.15, lp: 420 });
      if (k === 2 || k === 6) T.noise(t, 0.07, { f: 2300, q: 2.2, vol: 0.2 });
      if (k === 3 || k === 7) T.noise(t, 0.03, { type: 'highpass', f: 6500, vol: 0.02 });
      const tune = [[0, 64], [2, 67], [3, 66], [4, 64], [7, 59], [16, 64], [18, 67], [19, 69], [20, 70], [22, 69], [23, 67], [32, 69], [34, 72], [35, 71], [36, 69], [39, 64], [48, 63], [50, 66], [51, 64], [54, 59]];
      for (const [at, m] of tune) if (at === i % 64) { T.tone(t, m, s * 1.3, { type: 'triangle', vol: 0.075, pan: -0.3 }); T.tone(t, m + 24, 0.06, { vol: 0.012, pan: -0.3 }); }
      if (i % 32 === 31) [83, 90.3, 95.6].forEach((m) => T.tone(t, m, 0.4, { vol: 0.022, pan: 0.4 })); // Schlüssel auf Blech
      if (i % 32 === 12) { T.tone(t, 43.4, s * 2.5, { type: 'sawtooth', vol: 0.03, lp: 900, attack: 0.05 }); T.noise(t, s * 2, { f: 3800, q: 5, vol: 0.02, attack: 0.05 }); }
    },
  },
  ozean: { // Insel: Off-Beat, Marimba, Tropfen
    bpm: 98, gain: 0.36, swing: 0.06,
    step(T, t, i, s) {
      const chords = [[60, 64, 67], [60, 65, 69], [59, 62, 67], [60, 64, 67]]; const roots = [36, 41, 43, 36];
      const k = i % 8; const c = Math.floor(i / 8) % 4;
      if (k % 2) chords[c].forEach((m, n) => T.tone(t, m, 0.12, { type: 'triangle', vol: 0.045, pan: (n - 1) * 0.3 }));
      if (k === 0 || k === 3 || k === 4 || k === 6) T.tone(t, roots[c] + [0, 0, 0, 7, 12, 0, 7, 0][k], s * 1.2, { type: 'triangle', vol: 0.18, lp: 600 });
      if (k === 2 || k === 6) T.noise(t, 0.05, { f: 1700, q: 3, vol: 0.09 });
      T.noise(t, 0.03, { type: 'highpass', f: 6000, vol: k % 2 ? 0.024 : 0.012 });
      const tune = [[0, 76], [2, 79], [3, 81], [5, 79], [8, 77], [11, 81], [12, 79], [14, 77], [16, 74], [19, 79], [20, 77], [22, 74], [24, 72], [27, 76], [28, 72], [32, 84], [34, 81], [35, 79], [37, 76], [40, 81], [44, 77], [48, 79], [50, 83], [52, 86], [56, 84]];
      for (const [at, m] of tune) if (at === i % 64) { T.tone(t, m, s * 1.5, { vol: 0.075, pan: 0.2 }); T.tone(t, m + 19, 0.05, { vol: 0.02, pan: 0.2 }); }
      if (i % 16 === 13) T.tone(t, 84, 0.09, { vol: 0.05, slide: 14, pan: -0.5 });
    },
  },
  bruno: { // Anflug im All: stampfender Bass, Pauken, Hörner, oben funkeln die Sterne
    bpm: 92, gain: 0.4, swing: 0,
    step(T, t, i, s) {
      const k = i % 8; const bar = Math.floor(i / 8); const move = [0, 0, -4, -5][Math.floor(bar / 2) % 4];
      const bass = [38, 0, 38, 38, 41, 0, 45, 44][k];
      if (bass) T.tone(t, bass + move, s * 0.85, { type: 'sawtooth', vol: 0.12, lp: 340 });
      if (k === 0) { T.tone(t, 38 + move, 0.55, { vol: 0.15, slide: -5 }); if (bar % 2 === 0) T.noise(t, 0.3, { type: 'lowpass', f: 240, vol: 0.1 }); }
      if (bar % 4 === 3 && k > 5) T.noise(t, 0.12, { type: 'lowpass', f: 420, vol: 0.09 });
      const stars = [74, 81, 86, 77, 89, 82, 79, 85][(i * 3) % 8];
      if (k % 2) T.tone(t, stars, 0.16, { type: 'triangle', vol: 0.014, pan: k % 4 === 1 ? -0.6 : 0.6 });
      const tune = [[0, 62], [3, 62], [4, 65], [6, 64], [8, 62], [12, 57], [16, 62], [20, 65], [22, 67], [24, 69], [28, 68], [32, 70], [36, 69], [38, 65], [40, 67], [44, 64], [48, 65], [52, 64], [54, 61], [56, 62]];
      for (const [at, m] of tune) if (at === i % 64) { T.tone(t, m, s * 2.3, { type: 'sawtooth', vol: 0.045, lp: 950, attack: 0.05, pan: -0.15 }); T.tone(t, m - 12, s * 2.3, { type: 'triangle', vol: 0.03, attack: 0.05, pan: 0.15 }); }
      if (i % 64 === 58) T.noise(t, 1.2, { f: 620, q: 0.8, vol: 0.05, attack: 0.5 }); // etwas Großes fliegt vorbei
    },
  },
  schrank: { // Zimmer bei Nacht: ruhiger Beat, weiche Tasten, etwas Knistern
    bpm: 76, gain: 0.3, swing: 0.2,
    step(T, t, i, s) {
      const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [53, 57, 59, 64]]; const roots = [41, 40, 38, 43];
      const k = i % 8; const c = Math.floor(i / 8) % 4;
      if (k === 0) chords[c].forEach((m, n) => { T.tone(t + n * 0.02, m, s * 6, { vol: 0.055, attack: 0.04, pan: (n - 1.5) * 0.3 }); T.tone(t + n * 0.02, m + 12, s * 1.4, { type: 'triangle', vol: 0.008 }); });
      if (k === 5) chords[c].slice(1).forEach((m) => T.tone(t, m, s * 1.1, { vol: 0.025, attack: 0.02 }));
      if (k === 0 || k === 5) T.tone(t, roots[c], s * (k ? 1.6 : 3.4), { type: 'triangle', vol: k ? 0.09 : 0.15, lp: 380, attack: 0.012 });
      if (k === 0 || k === 3) T.tone(t, 43, 0.14, { vol: 0.13, slide: -16 });
      if (k === 2 || k === 6) T.noise(t, 0.12, { f: 1500, q: 0.9, vol: 0.05 });
      T.noise(t, 0.03, { type: 'highpass', f: 7500, vol: k % 2 ? 0.016 : 0.009 });
      if ((i * 13) % 11 === 0) T.noise(t + s * 0.37, 0.012, { type: 'highpass', f: 3500, vol: 0.012 });
      const tune = [[2, 72], [3, 76], [4, 79], [7, 76], [10, 74], [12, 71], [18, 69], [19, 72], [20, 77], [23, 76], [27, 74], [28, 71], [34, 72], [35, 76], [36, 81], [38, 79], [43, 74], [44, 76], [50, 74], [52, 72], [55, 69], [59, 71]];
      for (const [at, m] of tune) if (at === i % 64) T.tone(t, m, s * 2.2, { vol: 0.036, attack: 0.015, pan: 0.22 });
    },
  },
};
export const MUSIK_MODES = Object.keys(SONGS);

export function noiseBuffer(c) { const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
// st = { next: Zeit des nächsten Schritts, i: Schritt }
export function compose(c, out, mode, st, until, noiseBuf) {
  const S = SONGS[mode]; if (!S) return;
  const T = tools(c, out, noiseBuf); const s = 60 / S.bpm / 2;
  while (st.next < until) { S.step(T, st.next + (st.i % 2 ? S.swing * s : 0), st.i, s); st.next += s; st.i++; }
}
export const gainOf = (mode) => (SONGS[mode] ? SONGS[mode].gain : 0);

export function createTitelMusik(audio) {
  let cur = null; let buf = null;
  function stop() {
    const M = cur; cur = null; if (!M) return;
    clearInterval(M.timer); if (!M.bus) return;
    const t = M.c.currentTime; M.bus.gain.cancelScheduledValues(t); M.bus.gain.setTargetAtTime(0.0001, t, 0.09);
    setTimeout(() => M.bus.disconnect(), 900);
  }
  function play(mode) {
    if (cur && cur.mode === mode) return;
    stop(); if (!SONGS[mode]) return;
    cur = { mode, timer: 0, bus: null, c: null };
    if (!audio.ready || !audio.ctx) return; // Testbetrieb: nur merken
    const c = audio.ctx; const M = cur; buf = buf || noiseBuffer(c);
    M.c = c; M.bus = c.createGain(); M.bus.gain.setValueAtTime(0.0001, c.currentTime); M.bus.gain.setTargetAtTime(gainOf(mode), c.currentTime, 0.5);
    M.bus.connect(audio.out('titel.' + mode));
    const st = { next: c.currentTime + 0.1, i: 0 };
    const pump = () => {
      if (c.state !== 'running') return;
      if (st.next < c.currentTime) st.next = c.currentTime + 0.05; // Fenster war gedrosselt: nicht nachholen
      compose(c, M.bus, mode, st, c.currentTime + 0.6, buf);
    };
    M.timer = setInterval(pump, 120); pump();
  }
  return { play, stop, get mode() { return cur ? cur.mode : null; } };
}
