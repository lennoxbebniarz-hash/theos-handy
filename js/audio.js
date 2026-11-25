// Theos Seitenscheidel - Ton: Motor, Schotter, Wind, Reifenquietschen, Aufprall, Wischer + Radio. Alles synthetisch (Web Audio).
import { Radio } from './radio.js';

export class GameAudio {
  constructor() { this.volume = 1; this._thr = 0; this.ctx = null; this.radio = null; this.muted = false; this.ready = false; this.scope = 'rennen'; this.mix = {}; this.chans = new Map(); }

  // Mischpult: ein Gain je Geräusch (Schlüssel 'gruppe.name'), Pegel aus this.mix (Einstellungen), fehlt er, gilt 1
  out(key) { if (!this.ctx || !this.master) return null; let g = this.chans.get(key); if (!g) { g = this.ctx.createGain(); const v = this.mix[key]; g.gain.value = v === undefined ? 1 : v; g.connect(this.master); this.chans.set(key, g); } return g; }
  setMix(key, v) { this.mix[key] = v; const g = this.chans.get(key); if (g && this.ctx) g.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03); }
  // Ziel eines kurzen Geräuschs je nach laufendem Spiel (scope setzt main.js je Bild)
  dest(type) { const s = this.scope || 'rennen'; if (s === 'kraft') return this.out('kraft.' + (type === 'aufprall' ? 'schlag' : type === 'klick' ? 'tippen' : 'signal')); if (s === 'moon') return this.out('moon.' + (type === 'aufprall' ? 'aufprall' : 'signal')); if (s === 'casino') return this.out('casino.knoepfe'); if (s === 'menu') return this.out('allgemein.' + (type === 'klick' ? 'klick' : 'signal')); if (['nitro', 'alarm', 'auspuff', 'schalten', 'aufprall', 'wischer'].includes(type)) return this.out('fahrzeug.' + type); if (s === 'park') return this.out('park.signal'); return this.out('rennen.' + (type === 'klick' ? 'klick' : 'signal')); }

  // erst nach einer Benutzereingabe erlaubt (Autoplay-Regel)
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && this.ready) this.ctx.resume(); return; }
    if (new URLSearchParams(location.search).has('silent')) { // Testbetrieb: kein Ton, Radio rechnet nur im Hintergrund (OfflineAudioContext)
      this.ctx = new OfflineAudioContext(2, 44100, 44100); this.master = this.ctx.createGain(); this.radio = new Radio(this.ctx, this.master); return;
    }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.8 * this.volume; // Schulmodus: schon vor dem ersten Ton stumm
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    this.master.connect(comp); comp.connect(c.destination);
    // Motor: zwei Sägezähne + Sub, durch Tiefpass
    this.engGain = c.createGain(); this.engGain.gain.value = 0; this.engLP = c.createBiquadFilter(); this.engLP.type = 'lowpass'; this.engLP.frequency.value = 600; this.engLP.Q.value = 1.2;
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = c.createOscillator(); this.o2.type = 'square'; this.o3 = c.createOscillator(); this.o3.type = 'sine';
    const g1 = c.createGain(); g1.gain.value = 0.5; const g2 = c.createGain(); g2.gain.value = 0.22; const g3 = c.createGain(); g3.gain.value = 0.6;
    this.o1.connect(g1); this.o2.connect(g2); this.o3.connect(g3); g1.connect(this.engLP); g2.connect(this.engLP); g3.connect(this.engLP);
    const shaper = c.createWaveShaper(); const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.6) / Math.tanh(2.6); } shaper.curve = curve; shaper.oversample = '2x';
    this.engDuck = c.createGain(); this.engDuck.gain.value = 1;
    this.engLP.connect(shaper); shaper.connect(this.engGain); this.engGain.connect(this.engDuck); this.engDuck.connect(this.out('fahrzeug.motor'));
    // Turbo: hohes Pfeifen, folgt Gas und Drehzahl
    this.turbo = c.createOscillator(); this.turbo.type = 'sine'; this.turboGain = c.createGain(); this.turboGain.gain.value = 0; this.turbo.connect(this.turboGain); this.turboGain.connect(this.out('fahrzeug.turbo')); this.turbo.start();
    [this.o1, this.o2, this.o3].forEach((o) => o.start());
    // Rauschen
    const len = c.sampleRate * 2; const nb = c.createBuffer(1, len, c.sampleRate); const d = nb.getChannelData(0); let s = 99; for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
    this.noiseBuf = nb;
    const mkNoise = (type, f, q, gain, key) => { const src = c.createBufferSource(); src.buffer = nb; src.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = gain; src.connect(fl); fl.connect(g); g.connect(this.out(key)); src.start(); return { g, fl }; };
    this.road = mkNoise('bandpass', 700, 0.7, 0, 'fahrzeug.fahrbahn'); this.wind = mkNoise('highpass', 1400, 0.4, 0, 'fahrzeug.wind'); this.squeal = mkNoise('bandpass', 1700, 6, 0, 'fahrzeug.reifen'); this.rumble = mkNoise('lowpass', 160, 0.7, 0, 'fahrzeug.rumpeln'); this.jet = mkNoise('bandpass', 1500, 0.6, 0, 'fahrzeug.nitro'); this.jet2 = mkNoise('lowpass', 420, 0.8, 0, 'fahrzeug.nitro'); // Nitro: Rauschen + Brüllen
    // Alarmsirene "wüb wüb": quäkende Sirene (Tonhöhe schwingt) + Wobble-Bass (Tiefpass pumpt im Takt) + Gate; Tempo und Lautstärke wachsen mit der Dringlichkeit
    this.alOut = c.createGain(); this.alOut.gain.value = 0; const alShape = c.createWaveShaper(); const alCurve = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; alCurve[i] = Math.tanh(x * 3.2); } alShape.curve = alCurve; this.alOut.connect(alShape); alShape.connect(this.out('fahrzeug.alarm'));
    this.alLfo = c.createOscillator(); this.alLfo.type = 'sine'; this.alLfo.frequency.value = 2.4;
    this.alSiren = c.createOscillator(); this.alSiren.type = 'square'; this.alSiren.frequency.value = 760; const sirenDepth = c.createGain(); sirenDepth.gain.value = 300; this.alLfo.connect(sirenDepth); sirenDepth.connect(this.alSiren.frequency);
    const sirenBP = c.createBiquadFilter(); sirenBP.type = 'bandpass'; sirenBP.frequency.value = 1200; sirenBP.Q.value = 0.7; this.alSirenGain = c.createGain(); this.alSirenGain.gain.value = 0; this.alSiren.connect(sirenBP); sirenBP.connect(this.alSirenGain); this.alSirenGain.connect(this.alOut);
    this.alBass = c.createOscillator(); this.alBass.type = 'sawtooth'; this.alBass.frequency.value = 55; this.alBass2 = c.createOscillator(); this.alBass2.type = 'sawtooth'; this.alBass2.frequency.value = 55.8;
    const bassLP = c.createBiquadFilter(); bassLP.type = 'lowpass'; bassLP.frequency.value = 260; bassLP.Q.value = 13; const wubDepth = c.createGain(); wubDepth.gain.value = 900; this.alLfo.connect(wubDepth); wubDepth.connect(bassLP.frequency);
    const gate = c.createGain(); gate.gain.value = 0.62; const gateDepth = c.createGain(); gateDepth.gain.value = 0.38; this.alLfo.connect(gateDepth); gateDepth.connect(gate.gain);
    this.alBassGain = c.createGain(); this.alBassGain.gain.value = 0; this.alBass.connect(bassLP); this.alBass2.connect(bassLP); bassLP.connect(gate); gate.connect(this.alBassGain); this.alBassGain.connect(this.alOut);
    [this.alLfo, this.alSiren, this.alBass, this.alBass2].forEach((o) => o.start());
    this.radio = new Radio(c, this.master);
    this.ready = true;
    this._timer = setInterval(() => { if (this.radio && this.ctx.state === 'running') this.radio.pump(); }, 90);
  }

  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); if (this.master && this.ctx && !this.muted) this.master.gain.setTargetAtTime(0.8 * this.volume, this.ctx.currentTime, 0.05); }
  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.8 * this.volume, this.ctx.currentTime, 0.05); if (this.radio) this.radio.setMuted(false); }
  suspend(s) { if (!this.ctx || !this.ready) return; if (s) this.ctx.suspend(); else this.ctx.resume(); }

  // st: { kmh, rpm, throttle, surface, slip, braking }
  update(st, active) {
    if (!this.ready) return; const t = this.ctx.currentTime; const k = 0.06;
    const rpm = st.rpm; const f = rpm / 60 * 2; // 4-Zylinder: 2 Zündungen pro Umdrehung
    this.o1.frequency.setTargetAtTime(f, t, k); this.o2.frequency.setTargetAtTime(f * 0.5, t, k); this.o3.frequency.setTargetAtTime(f * 0.5, t, k);
    this.engLP.frequency.setTargetAtTime(380 + rpm * 0.2 + st.throttle * 500, t, k);
    this.engGain.gain.setTargetAtTime(active ? (0.13 + st.throttle * 0.14 + Math.min(0.07, rpm / 80000)) * (1 - 0.85 * (st.cut || 0)) : 0.0, t, st.cut ? 0.03 : 0.1);
    this.turbo.frequency.setTargetAtTime(1500 + rpm * 0.55 + (st.nitro || 0) * 1800, t, 0.08); this.turboGain.gain.setTargetAtTime(active ? st.throttle * Math.max(0, rpm - 2500) / 4900 * 0.028 + (st.whistle || 0) * 0.03 + (st.nitro || 0) * 0.05 : 0, t, 0.12);
    // Nitro: Düsenrauschen und tiefes Brüllen; Schäden: Stottern (Fehlzündungen)
    const nt = active ? (st.nitro || 0) : 0; this.jet.g.gain.setTargetAtTime(nt * 0.3, t, 0.08); this.jet.fl.frequency.setTargetAtTime(1100 + nt * 2600, t, 0.1); this.jet2.g.gain.setTargetAtTime(nt * 0.45, t, 0.1);
    if (active && st.sputter > 0 && Math.random() < 0.025 * st.sputter) this.pop(0, 0.08 + 0.1 * Math.random());
    // Auspuffknallen beim Gaswegnehmen im hohen Drehzahlbereich
    if (active && this._thr > 0.6 && st.throttle < 0.2 && rpm > 3600) { const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) this.pop(0.03 + i * (0.05 + Math.random() * 0.06), 0.16 + Math.random() * 0.12); }
    this._thr = st.throttle;
    const v = Math.min(1, st.kmh / 140); const gravel = st.surface === 'road' ? 1 : st.surface === 'mud' ? 1.4 : 0.8;
    this.road.g.gain.setTargetAtTime(active ? v * 0.1 * gravel : 0, t, 0.1); this.road.fl.frequency.setTargetAtTime(400 + v * 900, t, 0.1);
    this.wind.g.gain.setTargetAtTime(active ? v * v * 0.07 : 0, t, 0.15);
    this.rumble.g.gain.setTargetAtTime(active ? (st.surface === 'grass' ? 0.12 * v + 0.01 : 0.03 * v) : 0, t, 0.1);
    const sq = Math.max(0, Math.min(1, (st.slip - 0.16) * 4)) * (st.kmh > 15 ? 1 : 0); const drift = Math.max(sq, (st.hand || 0) * 0.6 * (st.kmh > 15 ? 1 : 0), st.spin || 0); this.squeal.g.gain.setTargetAtTime(active ? drift * 0.2 : 0, t, 0.04);
    this.squeal.fl.frequency.setTargetAtTime(1500 + st.kmh * 6, t, 0.05);
  }

  thud(strength) { const DST = this.ready ? this.dest('aufprall') : null; // Aufprall: dumpfer Schlag + Knirschen
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const a = Math.min(1, strength / 16);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.35);
    const g = c.createGain(); g.gain.setValueAtTime(0.9 * a + 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.connect(g); g.connect(DST); o.start(t); o.stop(t + 0.55);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400; const g2 = c.createGain(); g2.gain.setValueAtTime(0.6 * a, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.4); s.connect(f); f.connect(g2); g2.connect(DST); s.start(t); s.stop(t + 0.45);
  }
  // Auspuffknall: kurzer tiefer Schlag mit Knistern
  pop(delay = 0, vol = 0.2) { const DST = this.ready ? this.dest('auspuff') : null;
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 700; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09); s.connect(f); f.connect(g); g.connect(DST); s.start(t, Math.random()); s.stop(t + 0.1);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.08); const g2 = c.createGain(); g2.gain.setValueAtTime(vol * 1.4, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(g2); g2.connect(DST); o.start(t); o.stop(t + 0.12);
  }

  // Schalten: Kupplung tritt (Motor sackt kurz weg), Ventil zischt ("tsch"), dann kickt der neue Gang mit Schlag und Knall rein ("wumm")
  shift(up, load = 1, rpm = 6000) { const DST = this.ready ? this.dest('schalten') : null;
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const hard = up && load > 0.3;
    this.engDuck.gain.cancelScheduledValues(t); this.engDuck.gain.setValueAtTime(this.engDuck.gain.value, t);
    this.engDuck.gain.linearRampToValueAtTime(hard ? 0.12 : 0.45, t + 0.025); this.engDuck.gain.setValueAtTime(hard ? 0.12 : 0.45, t + (hard ? 0.1 : 0.06));
    this.engDuck.gain.linearRampToValueAtTime(hard ? 1.55 : 1, t + (hard ? 0.13 : 0.12)); this.engDuck.gain.linearRampToValueAtTime(1, t + 0.4);
    if (hard) {
      // Blow-off: Luftstoss, faellt in der Tonhoehe
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.3; f.frequency.setValueAtTime(7500, t); f.frequency.exponentialRampToValueAtTime(2200, t + 0.34);
      const g = c.createGain(); g.gain.setValueAtTime(0.0005, t); g.gain.linearRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38); s.connect(f); f.connect(g); g.connect(DST); s.start(t, Math.random()); s.stop(t + 0.4);
      // Einkuppeln: tiefer Schlag + rauer Stoss
      const k = t + 0.11;
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(130, k); o.frequency.exponentialRampToValueAtTime(38, k + 0.3); const go = c.createGain(); go.gain.setValueAtTime(0.0005, k); go.gain.linearRampToValueAtTime(0.95, k + 0.012); go.gain.exponentialRampToValueAtTime(0.001, k + 0.34); o.connect(go); go.connect(DST); o.start(k); o.stop(k + 0.36);
      const sw = c.createOscillator(); sw.type = 'sawtooth'; sw.frequency.setValueAtTime(rpm / 60 * 1.1, k); sw.frequency.exponentialRampToValueAtTime(rpm / 60 * 0.8, k + 0.2); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const gs = c.createGain(); gs.gain.setValueAtTime(0.0005, k); gs.gain.linearRampToValueAtTime(0.4, k + 0.015); gs.gain.exponentialRampToValueAtTime(0.001, k + 0.22); sw.connect(lp); lp.connect(gs); gs.connect(DST); sw.start(k); sw.stop(k + 0.25);
      this.pop(0.1, 0.38); this.pop(0.2, 0.2); if (Math.random() < 0.6) this.pop(0.29, 0.14);
    } else if (!up) { this.pop(0.05, 0.14); if (Math.random() < 0.6) this.pop(0.14, 0.1); }
  }

  crash(strength) { const DST = this.ready ? this.dest('aufprall') : null; // harter Einschlag: Knall, Blech, splitterndes Rauschen, Motor stirbt
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const a = Math.min(1, 0.55 + strength / 30);
    this.engDuck.gain.cancelScheduledValues(t); this.engDuck.gain.setValueAtTime(this.engDuck.gain.value, t); this.engDuck.gain.linearRampToValueAtTime(0, t + 0.08);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(24, t + 0.9);
    const g = c.createGain(); g.gain.setValueAtTime(1.15 * a, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.0); o.connect(g); g.connect(DST); o.start(t); o.stop(t + 1.05);
    const noise = (freq, type, vol, dur, q = 0.7) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const gg = c.createGain(); gg.gain.setValueAtTime(vol * a, t); gg.gain.exponentialRampToValueAtTime(0.001, t + dur); s.connect(f); f.connect(gg); gg.connect(DST); s.start(t, Math.random()); s.stop(t + dur + 0.05); };
    noise(1800, 'lowpass', 1.0, 0.7); noise(5200, 'highpass', 0.5, 0.55); noise(900, 'bandpass', 0.7, 0.35, 1.2);
    for (const [fq, d] of [[212, 0.5], [331, 0.42], [517, 0.3]]) { // Blechscheppern
      const m = c.createOscillator(); m.type = 'square'; m.frequency.setValueAtTime(fq * (0.9 + Math.random() * 0.2), t); m.frequency.exponentialRampToValueAtTime(fq * 0.55, t + d); const gm = c.createGain(); gm.gain.setValueAtTime(0.16 * a, t); gm.gain.exponentialRampToValueAtTime(0.001, t + d); m.connect(gm); gm.connect(DST); m.start(t); m.stop(t + d + 0.02);
    }
    for (let i = 0; i < 4; i++) this.pop(0.18 + i * 0.09 + Math.random() * 0.05, 0.12); // abplatzende Teile
    this.engDuck.gain.setValueAtTime(0, t + 0.5); this.engDuck.gain.linearRampToValueAtTime(1, t + 0.55);
  }
  // Nitro zündet: Fauchen, Schlag, Knallen
  nitroStart() { const DST = this.ready ? this.dest('nitro') : null;
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(5200, t + 0.45);
    const g = c.createGain(); g.gain.setValueAtTime(0.0005, t); g.gain.linearRampToValueAtTime(0.6, t + 0.06); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9); s.connect(f); f.connect(g); g.connect(DST); s.start(t, Math.random()); s.stop(t + 0.95);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(34, t + 0.5); const go = c.createGain(); go.gain.setValueAtTime(1.0, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.6); o.connect(go); go.connect(DST); o.start(t); o.stop(t + 0.65);
    this.pop(0.02, 0.4); this.pop(0.12, 0.3); this.pop(0.22, 0.2);
  }
  // Dauer-Alarm solange etwas kaputt ist: level 0 = aus, 1-3 = Schweregrad, urgency 0..1 = wie nah der Totalschaden ist (schneller, lauter, schriller)
  setAlarm(level, urgency = 0) {
    this.alarmState = { level, urgency }; if (!this.ready) return; const t = this.ctx.currentTime; const on = level > 0; const u = Math.max(0, Math.min(1, urgency));
    this.alLfo.frequency.setTargetAtTime(on ? 1.9 + level * 0.5 + u * 4.2 : 2, t, 0.25);
    this.alOut.gain.setTargetAtTime(on ? 0.2 + 0.05 * level + 0.2 * u : 0, t, on ? 0.04 : 0.15);
    this.alBassGain.gain.setTargetAtTime(on ? 0.85 : 0, t, 0.05); this.alSirenGain.gain.setTargetAtTime(on ? (level >= 2 || u > 0.4 ? 0.22 + 0.2 * u : 0.08) : 0, t, 0.08);
    this.alSiren.frequency.setTargetAtTime(700 + level * 80 + u * 380, t, 0.2); this.alBass.frequency.setTargetAtTime(48 + level * 5 + u * 14, t, 0.2); this.alBass2.frequency.setTargetAtTime(48.9 + level * 5 + u * 14, t, 0.2);
  }
  // Einzelner Warnstoß beim Eintreffen einer neuen Meldung: aufheulende Sirenenschwünge
  alarm(sev = 2) { const DST = this.ready ? this.dest('alarm') : null;
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const crit = sev >= 3; const n = crit ? 4 : 2;
    for (let i = 0; i < n; i++) { const t0 = t + i * 0.3; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(420, t0); o.frequency.exponentialRampToValueAtTime(crit ? 1700 : 1200, t0 + 0.26); const g = c.createGain(); g.gain.setValueAtTime(0.0005, t0); g.gain.linearRampToValueAtTime(crit ? 0.2 : 0.13, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.29); const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; o.connect(lp); lp.connect(g); g.connect(DST); o.start(t0); o.stop(t0 + 0.32); }
  }
  // Totalschaden: Wagen stirbt - Krachen, absackender Heulton, Zischen
  wreck() { const DST = this.ready ? this.dest('aufprall') : null;
    if (!this.ready) return; this.crash(28); const c = this.ctx; const t = c.currentTime + 0.1;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(38, t + 2.6); const g = c.createGain(); g.gain.setValueAtTime(0.0005, t); g.gain.linearRampToValueAtTime(0.28, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0005, t + 2.7); o.connect(g); g.connect(DST); o.start(t); o.stop(t + 2.8);
    const sh = c.createBufferSource(); sh.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4000; const gs = c.createGain(); gs.gain.setValueAtTime(0.0005, t + 0.3); gs.gain.linearRampToValueAtTime(0.3, t + 0.5); gs.gain.exponentialRampToValueAtTime(0.0005, t + 3.2); sh.connect(f); f.connect(gs); gs.connect(DST); sh.start(t + 0.3, Math.random()); sh.stop(t + 3.3);
  }
  ding() { const DST = this.ready ? this.dest('signal') : null; if (!this.ready) return; const c = this.ctx; const t = c.currentTime; for (const [fr, d] of [[880, 0], [1320, 0.09]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = fr; const g = c.createGain(); g.gain.setValueAtTime(0.0005, t + d); g.gain.linearRampToValueAtTime(0.12, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + d + 0.35); o.connect(g); g.connect(DST); o.start(t + d); o.stop(t + d + 0.4); } }
  rumble(k = 1) { const DST = this.ready ? this.dest('schalten') : null; // Schalten: Rumpeln, wenn der Knauf durch die Gasse ruckelt
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const a = Math.min(1, 0.35 + k * 0.05); const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220; const g = c.createGain(); g.gain.setValueAtTime(0.5 * a, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); s.connect(f); f.connect(g); g.connect(DST); s.start(t); s.stop(t + 0.14);
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(70 + Math.random() * 25, t); const g2 = c.createGain(); g2.gain.setValueAtTime(0.28 * a, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(g2); g2.connect(DST); o.start(t); o.stop(t + 0.12);
  }
  click() { const DST = this.ready ? this.dest('klick') : null; if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const o = c.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.05); const g = c.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07); o.connect(g); g.connect(DST); o.start(t); o.stop(t + 0.08); }
  tick(v = 1) { const DST = this.ready ? this.dest('klick') : null; if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 2; const g = c.createGain(); g.gain.setValueAtTime(0.1 * v, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05); s.connect(f); f.connect(g); g.connect(DST); s.start(t, Math.random()); s.stop(t + 0.06); }
  blip(freq = 660, dur = 0.06) { const DST = this.ready ? this.dest('signal') : null;
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const o = c.createOscillator(); o.type = 'square'; o.frequency.value = freq; const g = c.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur); o.connect(g); g.connect(DST); o.start(t); o.stop(t + dur + 0.02);
  }
  wiperSwish() { const DST = this.ready ? this.dest('wischer') : null; // leises Quietschen beim Wischen
    if (!this.ready) return; const c = this.ctx; const t = c.currentTime; const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 3; const g = c.createGain(); g.gain.setValueAtTime(0.0005, t); g.gain.linearRampToValueAtTime(0.05, t + 0.12); g.gain.linearRampToValueAtTime(0.0005, t + 0.4); s.connect(f); f.connect(g); g.connect(DST); s.start(t); s.stop(t + 0.45);
  }
}
