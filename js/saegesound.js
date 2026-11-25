// Theos Seitenscheidel - Hund-Modus (intern saege): alle Geräusche synthetisch. Kettensäge (Zweitakter mit Ketten-Kreischen und Fleisch-Knirschen), Schüsse, Quieken, Splatter, Tor, LKW.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createSaegeSound(audio) {
  let S = null; let budget = 0; let budgetT = 0; let screams = 0; const rand = (a, b) => a + Math.random() * (b - a);
  const out = (k) => audio.out('saege.' + k);
  function noiseBuf(c) { const n = c.sampleRate * 2; const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  function curve(k) { const n = 1024; const a = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; a[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x)); } return a; }
  function loopNoise(c) { const s = c.createBufferSource(); s.buffer = S.nb; s.loop = true; s.start(); return s; }
  function ensure() {
    if (S) return S; const c = audio.ctx; if (!c || !audio.master) return null; S = { c }; S.nb = noiseBuf(c);
    // ---- Kettensäge: Grundton, Oberton, Sub; Tuckern im Leerlauf; Verzerrung; Bandpass
    const eng = c.createGain(); eng.gain.value = 0; const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70; const ws = c.createWaveShaper(); ws.curve = curve(60); ws.oversample = '2x';
    const pre = c.createGain(); pre.gain.value = 0.6; const o1 = c.createOscillator(); o1.type = 'sawtooth'; const o2 = c.createOscillator(); o2.type = 'square'; const o3 = c.createOscillator(); o3.type = 'sine'; const g2 = c.createGain(); g2.gain.value = 0.35; const g3 = c.createGain(); g3.gain.value = 0.5;
    const chug = c.createGain(); chug.gain.value = 1; const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 9; const lfoG = c.createGain(); lfoG.gain.value = 0.45; lfo.connect(lfoG); lfoG.connect(chug.gain);
    o1.connect(pre); o2.connect(g2); g2.connect(pre); o3.connect(g3); g3.connect(pre); pre.connect(chug); chug.connect(ws); ws.connect(hp); hp.connect(bp); bp.connect(eng); const body = c.createBiquadFilter(); body.type = 'lowpass'; body.frequency.value = 300; const bodyG = c.createGain(); bodyG.gain.value = 0.5; ws.connect(body); body.connect(bodyG); bodyG.connect(eng);
    const chainN = loopNoise(c); const chainF = c.createBiquadFilter(); chainF.type = 'bandpass'; chainF.frequency.value = 3600; chainF.Q.value = 1.2; const chainG = c.createGain(); chainG.gain.value = 0; chainN.connect(chainF); chainF.connect(chainG);
    const cutN = loopNoise(c); const cutF = c.createBiquadFilter(); cutF.type = 'bandpass'; cutF.frequency.value = 700; cutF.Q.value = 0.9; const cutG = c.createGain(); cutG.gain.value = 0; const cutAM = c.createGain(); cutAM.gain.value = 0.6; const cutL = c.createOscillator(); cutL.type = 'sawtooth'; cutL.frequency.value = 23; const cutLG = c.createGain(); cutLG.gain.value = 0.4; cutL.connect(cutLG); cutLG.connect(cutAM.gain); cutN.connect(cutF); cutF.connect(cutAM); cutAM.connect(cutG);
    const sawOut = out('saege'); if (sawOut) { eng.connect(sawOut); chainG.connect(sawOut); cutG.connect(sawOut); }
    for (const o of [o1, o2, o3, lfo, cutL]) o.start();
    S.saw = { eng, o1, o2, o3, lfoG, lfo, bp, chainG, chainF, cutG, cutF, f: 45, on: false };
    // ---- Minigun-Motor
    const mg = c.createOscillator(); mg.type = 'sawtooth'; mg.frequency.value = 80; const mgF = c.createBiquadFilter(); mgF.type = 'lowpass'; mgF.frequency.value = 900; const mgG = c.createGain(); mgG.gain.value = 0; mg.connect(mgF); mgF.connect(mgG); const wo = out('waffen'); if (wo) mgG.connect(wo); mg.start(); S.mg = { mg, mgG, mgF };
    // ---- LKW-Diesel, Rückfahrwarner, Tor-Motor
    const d1 = c.createOscillator(); d1.type = 'sawtooth'; d1.frequency.value = 32; const d2 = c.createOscillator(); d2.type = 'square'; d2.frequency.value = 48; const dF = c.createBiquadFilter(); dF.type = 'lowpass'; dF.frequency.value = 260; const dG = c.createGain(); dG.gain.value = 0; const dAM = c.createGain(); const dl = c.createOscillator(); dl.frequency.value = 11; const dlG = c.createGain(); dlG.gain.value = 0.3; dl.connect(dlG); dlG.connect(dAM.gain); d1.connect(dF); d2.connect(dF); dF.connect(dAM); dAM.connect(dG);
    const beep = c.createOscillator(); beep.type = 'square'; beep.frequency.value = 1040; const beepF = c.createBiquadFilter(); beepF.type = 'bandpass'; beepF.frequency.value = 1040; beepF.Q.value = 3; const beepG = c.createGain(); beepG.gain.value = 0; beep.connect(beepF); beepF.connect(beepG);
    const gN = loopNoise(c); const gF = c.createBiquadFilter(); gF.type = 'bandpass'; gF.frequency.value = 520; gF.Q.value = 1.4; const gAM = c.createGain(); const gl = c.createOscillator(); gl.type = 'square'; gl.frequency.value = 15; const glG = c.createGain(); glG.gain.value = 0.5; gl.connect(glG); glG.connect(gAM.gain); const gm = c.createOscillator(); gm.type = 'sawtooth'; gm.frequency.value = 58; const gmF = c.createBiquadFilter(); gmF.type = 'lowpass'; gmF.frequency.value = 220; const gG = c.createGain(); gG.gain.value = 0; gN.connect(gF); gF.connect(gAM); gAM.connect(gG); gm.connect(gmF); gmF.connect(gG);
    const ho = out('halle'); if (ho) { dG.connect(ho); beepG.connect(ho); gG.connect(ho); } for (const o of [d1, d2, dl, beep, gl, gm]) o.start();
    S.truck = { dG, d1, d2, beepG }; S.gate = { gG };
    return S;
  }
  const T = (p, v, tc = 0.04) => { if (S) p.setTargetAtTime(v, S.c.currentTime, tc); };
  // kurze Einmal-Geräusche
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noiseHit({ t = 0, dur = 0.15, type = 'bandpass', f = 1000, q = 0.8, peak = 0.5, a = 0.002, ch = 'waffen', pan = 0, fEnd = 0, rate = 1 }) {
    if (!ensure()) return; const c = S.c; const now = c.currentTime + t; const s = c.createBufferSource(); s.buffer = S.nb; s.playbackRate.value = rate; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, now); if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, now + dur); fl.Q.value = q; const g = c.createGain(); env(g, now, a, peak, dur); const p = c.createStereoPanner ? c.createStereoPanner() : null; s.connect(fl); fl.connect(g); const o = out(ch); if (!o) return; if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(o); } else g.connect(o); s.start(now, Math.random() * 1.5); s.stop(now + a + dur + 0.05);
  }
  function tone({ t = 0, type = 'sine', f = 200, fEnd = 0, dur = 0.15, peak = 0.4, a = 0.003, ch = 'waffen', pan = 0, vib = 0, vibF = 30 }) {
    if (!ensure()) return; const c = S.c; const now = c.currentTime + t; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, now); if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, now + dur); const g = c.createGain(); env(g, now, a, peak, dur); let v = null; if (vib) { v = c.createOscillator(); v.frequency.value = vibF; const vg = c.createGain(); vg.gain.value = vib; v.connect(vg); vg.connect(o.frequency); v.start(now); v.stop(now + a + dur + 0.05); } const p = c.createStereoPanner ? c.createStereoPanner() : null; o.connect(g); const dst = out(ch); if (!dst) return; if (p) { p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(dst); } else g.connect(dst); o.start(now); o.stop(now + a + dur + 0.05);
  }
  // Quieken und Splatter sind begrenzt, sonst wird es bei 10 Hamstern auf einmal nur Lärm
  function allow() { const now = performance.now(); if (now - budgetT > 120) { budgetT = now; budget = 0; } return budget++ < 5; }
  const att = (d) => 1 / (1 + Math.max(0, d) * 0.16);
  return {
    ensure,
    // Kettensäge je Bild: on (läuft), gas 0..1, cut 0..1 (steckt in Hamstern)
    saw(on, gas, cut, low = false) {
      if (!ensure()) return; const s = S.saw; const target = on ? (low ? 34 + gas * 70 - cut * 14 : 46 + gas * 150 - cut * 38) : 0; s.f += ((on ? target : s.f) - s.f) * 0.18; const f = Math.max(30, s.f);
      T(s.o1.frequency, f, 0.02); T(s.o2.frequency, f * 2.005, 0.02); T(s.o3.frequency, f * 0.5, 0.02); T(s.lfo.frequency, 6 + f * 0.08, 0.05); T(s.lfoG.gain, on ? 0.5 * (1 - gas) : 0, 0.05);
      T(s.bp.frequency, 700 + gas * 1500 - cut * 300, 0.05); T(s.eng.gain, on ? 0.22 + gas * 0.2 : 0, 0.05); T(s.chainG.gain, on ? gas * 0.18 : 0, 0.04); T(s.chainF.frequency, 2600 + gas * 2400, 0.05); T(s.cutG.gain, on ? cut * 0.55 : 0, 0.03); T(s.cutF.frequency, 520 + Math.random() * 500, 0.02);
    },
    sawStart() { for (let i = 0; i < 3; i++) { noiseHit({ t: i * 0.32, dur: 0.22, f: 260, q: 1.4, peak: 0.35, ch: 'saege', fEnd: 120 }); tone({ t: i * 0.32, type: 'sawtooth', f: 40 + i * 12, fEnd: 70 + i * 20, dur: 0.24, peak: 0.18, ch: 'saege' }); } },
    shot(kind, pan = 0) {
      if (kind === 'pistole') { noiseHit({ dur: 0.16, type: 'highpass', f: 900, peak: 0.6, pan }); tone({ f: 160, fEnd: 42, dur: 0.18, peak: 0.55, pan }); noiseHit({ t: 0.03, dur: 0.35, type: 'lowpass', f: 1200, fEnd: 300, peak: 0.12, pan }); }
      if (kind === 'minigun') { noiseHit({ dur: 0.055, type: 'bandpass', f: 1800 + Math.random() * 500, q: 0.7, peak: 0.42, pan }); tone({ f: 120, fEnd: 50, dur: 0.06, peak: 0.3, pan }); }
      if (kind === 'schrot') { noiseHit({ dur: 0.4, type: 'lowpass', f: 3200, fEnd: 400, peak: 0.85, pan }); tone({ f: 100, fEnd: 30, dur: 0.32, peak: 0.7, pan }); tone({ t: 0.42, type: 'square', f: 900, dur: 0.03, peak: 0.12 }); noiseHit({ t: 0.44, dur: 0.06, f: 2400, q: 2, peak: 0.25 }); noiseHit({ t: 0.6, dur: 0.07, f: 1800, q: 2, peak: 0.3 }); }
    },
    // Piepsiger Schrei: Sägezahn durch zwei Formanten (wie ein hohes „Ääääh“), Tonhöhe springt hoch und fällt, schnelles Zittern. Höchstens 7 gleichzeitig.
    scream(d = 3, pan = 0, len = 1) {
      if (!ensure() || screams >= 7) return; const c = S.c; const now = c.currentTime; const k = rand(0.85, 1.35); const dur = rand(0.38, 0.75) * len; const a = att(d) * 0.34; screams++; setTimeout(() => { screams--; }, (dur + 0.1) * 1000);
      const o = c.createOscillator(); o.type = 'sawtooth'; const f0 = 780 * k; o.frequency.setValueAtTime(f0 * 0.8, now); o.frequency.exponentialRampToValueAtTime(f0 * 1.45, now + 0.06); o.frequency.exponentialRampToValueAtTime(f0 * 1.15, now + dur * 0.55); o.frequency.exponentialRampToValueAtTime(f0 * 0.62, now + dur);
      const v = c.createOscillator(); v.frequency.value = rand(9, 15); const vg = c.createGain(); vg.gain.value = f0 * 0.07; v.connect(vg); vg.connect(o.frequency);
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 1500 * k; f1.Q.value = 3; const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 3100 * k; f2.Q.value = 4; const g1 = c.createGain(); g1.gain.value = 1; const g2 = c.createGain(); g2.gain.value = 0.7;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(a, now + 0.02); g.gain.setValueAtTime(a, now + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      const tr = c.createGain(); const tl = c.createOscillator(); tl.frequency.value = rand(14, 22); const tlg = c.createGain(); tlg.gain.value = 0.35; tl.connect(tlg); tlg.connect(tr.gain);
      o.connect(f1); o.connect(f2); f1.connect(g1); f2.connect(g2); g1.connect(tr); g2.connect(tr); tr.connect(g); const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); const dst = out('schreie'); if (!dst) return; p.connect(dst);
      for (const x of [o, v, tl]) { x.start(now); x.stop(now + dur + 0.05); }
    },
    // Fleischiger Treffer: dumpfer Schlag, nasses Quatschen (wandernder Resonanzfilter), Knochenknacken, Schmatzen
    meat(d = 2, pan = 0, big = 1) {
      if (!allow()) return; const a = att(d) * big; tone({ f: 85, fEnd: 34, dur: 0.16, peak: 0.42 * a, ch: 'fleisch', pan });
      noiseHit({ dur: 0.26, type: 'bandpass', f: 260, q: 6, fEnd: 1300, peak: 0.55 * a, ch: 'fleisch', pan }); noiseHit({ t: 0.09, dur: 0.22, type: 'bandpass', f: 1100, q: 5, fEnd: 330, peak: 0.35 * a, ch: 'fleisch', pan });
      noiseHit({ t: 0.01, dur: 0.3, type: 'lowpass', f: 900, fEnd: 200, peak: 0.3 * a, ch: 'fleisch', pan, rate: 0.5 });
      const n = 2 + ((Math.random() * 3) | 0); for (let i = 0; i < n; i++) noiseHit({ t: rand(0, 0.09), dur: 0.018, type: 'highpass', f: 2400, peak: 0.28 * a, ch: 'fleisch', pan });
    },
    squelch(d = 1.5) { const a = att(d); noiseHit({ dur: 0.12, type: 'bandpass', f: rand(300, 700), q: 7, fEnd: rand(900, 1600), peak: 0.32 * a, ch: 'fleisch' }); },
    piep(d = 6, pan = 0) { if (Math.random() < 0.5) return; const k = rand(0.9, 1.4); tone({ type: 'triangle', f: 2200 * k, fEnd: 2700 * k, dur: 0.06, peak: 0.05 * att(d), ch: 'schreie', pan, vib: 120, vibF: 40 }); },
    blade() { noiseHit({ dur: 0.18, type: 'bandpass', f: 2600, q: 2, fEnd: 5200, peak: 0.3 }); tone({ type: 'sawtooth', f: 900, fEnd: 2400, dur: 0.16, peak: 0.07 }); tone({ f: 140, fEnd: 70, dur: 0.08, peak: 0.25 }); },
    launch() { tone({ f: 220, fEnd: 70, dur: 0.12, peak: 0.5 }); noiseHit({ dur: 0.1, type: 'lowpass', f: 1500, peak: 0.3 }); },
    boom(d = 6, pan = 0) { const a = att(d * 0.5); noiseHit({ dur: 0.9, type: 'lowpass', f: 2400, fEnd: 120, peak: 0.95 * a, ch: 'waffen', pan, rate: 0.6 }); tone({ f: 70, fEnd: 24, dur: 0.7, peak: 0.85 * a, ch: 'waffen', pan }); noiseHit({ t: 0.05, dur: 0.5, type: 'bandpass', f: 600, q: 1, fEnd: 200, peak: 0.3 * a, ch: 'waffen', pan }); },
    reload() { noiseHit({ dur: 0.05, f: 2600, q: 2, peak: 0.25 }); noiseHit({ t: 0.55, dur: 0.06, f: 1900, q: 2, peak: 0.3 }); tone({ t: 0.85, type: 'square', f: 700, dur: 0.03, peak: 0.1 }); },
    spin(v) { if (!ensure()) return; T(S.mg.mgG.gain, v * 0.12, 0.08); T(S.mg.mg.frequency, 70 + v * 380, 0.1); T(S.mg.mgF.frequency, 500 + v * 1800, 0.1); },
    squeak(d = 2, pan = 0) { if (!allow()) return; const k = 0.8 + Math.random() * 0.5; const a = att(d); tone({ type: 'triangle', f: 1500 * k, fEnd: 2600 * k, dur: 0.07, peak: 0.22 * a, ch: 'hamster', pan, vib: 140, vibF: 38 }); tone({ t: 0.07, type: 'triangle', f: 2500 * k, fEnd: 900 * k, dur: 0.16, peak: 0.2 * a, ch: 'hamster', pan, vib: 180, vibF: 32 }); },
    splat(d = 2, pan = 0, big = 1) { if (!allow()) return; const a = att(d); noiseHit({ dur: 0.22 * big, type: 'lowpass', f: 900, fEnd: 200, peak: 0.45 * a * big, ch: 'hamster', pan }); noiseHit({ t: 0.02, dur: 0.18, type: 'bandpass', f: 380, q: 4, fEnd: 900, peak: 0.25 * a, ch: 'hamster', pan }); tone({ f: 90, fEnd: 40, dur: 0.12, peak: 0.3 * a, ch: 'hamster', pan }); },
    pop(d = 8, pan = 0) { if (Math.random() < 0.5 || !allow()) return; tone({ f: 620 + Math.random() * 200, fEnd: 170, dur: 0.09, peak: 0.18 * att(d), ch: 'hamster', pan }); },
    bite() { tone({ f: 260, fEnd: 120, dur: 0.08, peak: 0.25, ch: 'hamster' }); noiseHit({ dur: 0.1, type: 'lowpass', f: 600, peak: 0.3, ch: 'hamster' }); },
    hurt() { tone({ type: 'sawtooth', f: 140, fEnd: 70, dur: 0.18, peak: 0.18, ch: 'signale' }); },
    truck(level, beeping, d = 15) { if (!ensure()) return; const a = att(d * 0.5); T(S.truck.dG.gain, level * 0.35 * a, 0.15); T(S.truck.d1.frequency, 30 + level * 10, 0.2); T(S.truck.d2.frequency, 46 + level * 14, 0.2); T(S.truck.beepG.gain, beeping ? 0.07 * a : 0, 0.01); },
    gate(on) { if (!ensure()) return; T(S.gate.gG.gain, on ? 0.22 : 0, 0.08); },
    clank(d = 8) { const a = att(d); noiseHit({ dur: 0.25, f: 420, q: 3, peak: 0.4 * a, ch: 'halle' }); tone({ type: 'square', f: 180, fEnd: 90, dur: 0.15, peak: 0.12 * a, ch: 'halle' }); },
    fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone({ t: i * 0.11, type: 'square', f, dur: i === 3 ? 0.45 : 0.12, peak: 0.12, ch: 'signale' })); },
    fail() { [392, 330, 262].forEach((f, i) => tone({ t: i * 0.18, type: 'square', f, dur: 0.22, peak: 0.12, ch: 'signale' })); },
    hitmark() { tone({ type: 'square', f: 1800, dur: 0.02, peak: 0.05, ch: 'signale' }); },
    silence() { if (!S) return; this.saw(false, 0, 0); this.spin(0); this.truck(0, false); this.gate(false); },
    get ready() { return !!S; },
  };
}
