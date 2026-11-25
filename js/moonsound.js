// Theos Seitenscheidel - Moonsweeper 2: Geräusche. Alles synthetisch über den Audiokontext des Spiels (keine Dateien); im stummen Testbetrieb passiert hier nichts.
// Jedes Geräusch läuft über einen eigenen Kanal des Sound-Mischpults (moon.ui, moon.schritte, ...).
export function createMoonSound(audio) {
  const ok = () => audio.ready && audio.ctx && audio.ctx.state === 'running';
  const dst = (ch) => (audio.out ? audio.out('moon.' + ch) : audio.master);
  function tone({ f, f2, dur = 0.08, type = 'sine', vol = 0.05, at = 0, ch = 'ui' }) {
    if (!ok()) return; const c = audio.ctx; const t = c.currentTime + at; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(dst(ch)); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise({ f = 1200, f2, q = 0.8, type = 'bandpass', dur = 0.12, vol = 0.05, at = 0, ch = 'ui' }) {
    if (!ok() || !audio.noiseBuf) return; const c = audio.ctx; const t = c.currentTime + at; const s = c.createBufferSource(); s.buffer = audio.noiseBuf; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur); fl.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(fl); fl.connect(g); g.connect(dst(ch)); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  const S = {
    click: () => { tone({ f: 1250, f2: 720, dur: 0.05, type: 'triangle', vol: 0.07 }); noise({ f: 3200, dur: 0.025, vol: 0.025 }); },
    hover: () => tone({ f: 1500, dur: 0.018, type: 'sine', vol: 0.014 }),
    open: () => { tone({ f: 420, f2: 760, dur: 0.1, type: 'triangle', vol: 0.05 }); noise({ f: 900, f2: 2600, dur: 0.11, vol: 0.022 }); },
    close: () => { tone({ f: 700, f2: 380, dur: 0.09, type: 'triangle', vol: 0.045 }); },
    buy: () => { for (const [f, at] of [[660, 0], [880, 0.07], [1320, 0.14]]) tone({ f, dur: 0.16, type: 'triangle', vol: 0.06, at, ch: 'kasse' }); noise({ f: 6000, dur: 0.08, vol: 0.02, at: 0.14, ch: 'kasse' }); },
    error: () => { tone({ f: 190, f2: 150, dur: 0.17, type: 'square', vol: 0.035 }); tone({ f: 150, dur: 0.15, type: 'square', vol: 0.03, at: 0.12 }); },
    jump: () => { tone({ f: 170, f2: 430, dur: 0.17, type: 'sine', vol: 0.06, ch: 'schritte' }); noise({ f: 700, f2: 2100, dur: 0.2, vol: 0.03, ch: 'schritte' }); },
    land: (k = 1) => { tone({ f: 105, f2: 55, dur: 0.15, type: 'sine', vol: 0.05 + 0.05 * k, ch: 'schritte' }); noise({ f: 340, dur: 0.12, type: 'lowpass', vol: 0.05 * k, ch: 'schritte' }); },
    step: () => { noise({ f: 300 + Math.random() * 130, dur: 0.075, type: 'lowpass', vol: 0.03, ch: 'schritte' }); tone({ f: 82, f2: 60, dur: 0.06, vol: 0.022, ch: 'schritte' }); },
    suck: (dur = 1.6) => { noise({ f: 280, f2: 2700, q: 1.5, dur, vol: 0.24, ch: 'sauger' }); tone({ f: 150, f2: 640, dur, type: 'sawtooth', vol: 0.012, ch: 'sauger' }); },
    coin: () => { for (const [f, at] of [[1046, 0], [1568, 0.07], [2093, 0.13]]) tone({ f, dur: 0.22, vol: 0.055, at, ch: 'kasse' }); },
    tankFull: () => { tone({ f: 880, dur: 0.09, type: 'square', vol: 0.025, ch: 'hinweise' }); tone({ f: 880, dur: 0.09, type: 'square', vol: 0.025, at: 0.14, ch: 'hinweise' }); },
    place: () => { tone({ f: 170, f2: 90, dur: 0.11, type: 'triangle', vol: 0.08, ch: 'bauen' }); noise({ f: 1900, dur: 0.05, vol: 0.035, ch: 'bauen' }); tone({ f: 980, dur: 0.05, type: 'square', vol: 0.012, at: 0.05, ch: 'bauen' }); },
    remove: () => { noise({ f: 1600, f2: 320, dur: 0.16, vol: 0.05, ch: 'bauen' }); tone({ f: 240, f2: 100, dur: 0.14, type: 'triangle', vol: 0.05, ch: 'bauen' }); },
    turn: () => tone({ f: 620, dur: 0.035, type: 'triangle', vol: 0.03, ch: 'bauen' }),
    door: () => { noise({ f: 700, f2: 280, dur: 0.14, vol: 0.05, ch: 'tueren' }); tone({ f: 140, f2: 80, dur: 0.1, vol: 0.05, at: 0.06, ch: 'tueren' }); },
    guide: () => { tone({ f: 880, dur: 0.1, type: 'sine', vol: 0.04, ch: 'hinweise' }); tone({ f: 1175, dur: 0.16, type: 'sine', vol: 0.04, at: 0.08, ch: 'hinweise' }); },
    milestone: () => { for (const [f, at] of [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.3]]) tone({ f, dur: 0.36, type: 'triangle', vol: 0.065, at, ch: 'hinweise' }); },
    press: (k = 1) => { tone({ f: 120, f2: 62, dur: 0.14, type: 'triangle', vol: 0.05 * k, ch: 'maschinen' }); noise({ f: 1200, f2: 500, dur: 0.1, vol: 0.022 * k, ch: 'maschinen' }); },
    drill: () => noise({ f: 1100 + Math.random() * 500, dur: 0.05, vol: 0.04, ch: 'maschinen' }),
    swell: (dur = 7) => { tone({ f: 46, f2: 92, dur, type: 'sine', vol: 0.11, ch: 'intro' }); tone({ f: 138, f2: 277, dur, type: 'triangle', vol: 0.016, ch: 'intro' }); noise({ f: 180, f2: 900, q: 0.7, dur, vol: 0.05, ch: 'intro' }); },
    whoosh: () => noise({ f: 2600, f2: 240, q: 0.8, dur: 1.5, vol: 0.2, ch: 'intro' }),
    arrive: () => { tone({ f: 73, f2: 44, dur: 0.8, vol: 0.13, ch: 'intro' }); for (const [f, at] of [[392, 0.05], [523, 0.17], [659, 0.29], [784, 0.41]]) tone({ f, dur: 0.75, type: 'triangle', vol: 0.05, at, ch: 'intro' }); },
  };
  return S;
}
