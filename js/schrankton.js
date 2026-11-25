// Theos Seitenscheidel - Schrank-Hub: Klinke, Türknarzen, Schublade, Lichtschalter, Paket. Alles synthetisch, Kanal titel.tuer im Mischpult.
export function createSchrankTon(audio) {
  function ctx() { return audio.ready && audio.ctx ? { c: audio.ctx, t: audio.ctx.currentTime, out: audio.out('titel.tuer') } : null; }
  function noise(T, at, len, { type = 'bandpass', f = 1200, to = 0, q = 1, vol = 0.1 } = {}) {
    const s = T.c.createBufferSource(); const fl = T.c.createBiquadFilter(); const g = T.c.createGain();
    s.buffer = audio.noiseBuf; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, at); if (to) fl.frequency.exponentialRampToValueAtTime(to, at + len);
    g.gain.setValueAtTime(0.0005, at); g.gain.linearRampToValueAtTime(vol, at + Math.min(0.01, len / 4)); g.gain.exponentialRampToValueAtTime(0.0005, at + len);
    s.connect(fl); fl.connect(g); g.connect(T.out); s.start(at, Math.random()); s.stop(at + len + 0.02);
    s.onended = () => { s.disconnect(); fl.disconnect(); g.disconnect(); };
  }
  function tone(T, at, len, { type = 'sine', f = 200, to = 0, vol = 0.1 } = {}) {
    const o = T.c.createOscillator(); const g = T.c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, at); if (to) o.frequency.exponentialRampToValueAtTime(to, at + len);
    g.gain.setValueAtTime(0.0005, at); g.gain.linearRampToValueAtTime(vol, at + Math.min(0.008, len / 4)); g.gain.exponentialRampToValueAtTime(0.0005, at + len);
    o.connect(g); g.connect(T.out); o.start(at); o.stop(at + len + 0.02);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  }
  let creakEnd = 0;
  return {
    klinke() { const T = ctx(); if (!T) return; noise(T, T.t, 0.05, { f: 2600, q: 3, vol: 0.22 }); tone(T, T.t + 0.03, 0.07, { type: 'triangle', f: 1250, to: 700, vol: 0.05 }); },
    knarz(speed = 1) { // altes Holz: lauter kleine Rucke mit wandernder Tonhöhe
      const T = ctx(); if (!T || T.t < creakEnd) return;
      const k = Math.max(0.3, Math.min(1, speed)); const len = 0.16 + Math.random() * 0.12; creakEnd = T.t + len * 0.8;
      const base = 420 + Math.random() * 420;
      for (let i = 0; i < 7; i++) noise(T, T.t + i * len / 7, 0.045, { f: base * (1 + Math.sin(i * 0.8) * 0.28), q: 13, vol: 0.34 * k * (1 - i * 0.07) });
      tone(T, T.t, len, { type: 'sawtooth', f: 88 + Math.random() * 30, to: 62, vol: 0.014 * k });
    },
    anschlag(k = 1) { const T = ctx(); if (!T) return; tone(T, T.t, 0.2, { f: 130, to: 52, vol: 0.24 * k }); noise(T, T.t, 0.1, { type: 'lowpass', f: 700, vol: 0.18 * k }); },
    schublade() { const T = ctx(); if (!T) return; noise(T, T.t, 0.3, { f: 380, to: 760, q: 1.4, vol: 0.22 }); tone(T, T.t + 0.28, 0.12, { f: 120, to: 60, vol: 0.16 }); },
    schalter() { const T = ctx(); if (!T) return; noise(T, T.t, 0.035, { f: 3200, q: 2, vol: 0.4 }); noise(T, T.t + 0.07, 0.03, { f: 2100, q: 2, vol: 0.2 }); },
    paket() { const T = ctx(); if (!T) return; for (let i = 0; i < 5; i++) noise(T, T.t + i * 0.05, 0.06, { type: 'highpass', f: 1800 + i * 300, vol: 0.09 }); },
    nimm() { const T = ctx(); if (!T) return; noise(T, T.t, 0.4, { f: 400, to: 2400, q: 1.2, vol: 0.1 }); tone(T, T.t + 0.05, 0.3, { type: 'triangle', f: 392, to: 784, vol: 0.05 }); },
  };
}
