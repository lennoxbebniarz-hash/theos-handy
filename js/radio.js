// Theos Seitenscheidel - Autoradio: drei Sender mit selbst erzeugter Musik (Web Audio, eigene Kompositionen - keine fremden Aufnahmen).
// Alle Sender sind klar als "Testtrack" gekennzeichnet. Funktioniert mit AudioContext und OfflineAudioContext (Test).

const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const STATIONS = [
  { id: 'wald', name: 'WALDFUNK', freq: '88.1', sub: 'Testtrack 1 · Lo-Fi', bpm: 80 },
  { id: 'rally', name: 'RALLYE FM', freq: '96.4', sub: 'Testtrack 2 · Synth', bpm: 124 },
  { id: 'tanne', name: 'TANNENRADIO', freq: '103.7', sub: 'Testtrack 3 · Folk', bpm: 102 },
];

export class Radio {
  constructor(ctx, out) {
    this.ctx = ctx; this.on = false; this.volume = 0.6; this.station = 0; this.step = 0; this.nextTime = 0; this.muted = false;
    this.bus = ctx.createGain(); this.bus.gain.value = 0;
    // Radioklang: Bässe und Höhen etwas beschnitten
    this.hp = ctx.createBiquadFilter(); this.hp.type = 'highpass'; this.hp.frequency.value = 90;
    this.lp = ctx.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 7200;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512; this.buf = new Float32Array(this.analyser.fftSize);
    this.bus.connect(this.hp); this.hp.connect(this.lp); this.lp.connect(this.analyser); this.lp.connect(out);
    // Rauschen (Zwischenstation und Sendersuche)
    const len = ctx.sampleRate * 2; this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); let seed = 12345; for (let i = 0; i < len; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = seed / 2147483648 - 1; }
    this.rng = 7;
  }
  _rand() { this.rng = (this.rng * 1664525 + 1013904223) >>> 0; return this.rng / 4294967296; }
  get info() { const s = STATIONS[this.station]; return { on: this.on, name: s.name, freq: s.freq, sub: s.sub, volume: this.volume, level: this.level(), muted: this.muted }; }
  level() { this.analyser.getFloatTimeDomainData(this.buf); let s = 0; for (let i = 0; i < this.buf.length; i++) s += this.buf[i] * this.buf[i]; return Math.sqrt(s / this.buf.length); }

  _apply() { const t = this.ctx.currentTime; this.bus.gain.cancelScheduledValues(t); this.bus.gain.setTargetAtTime(this.on && !this.muted ? this.volume * 0.9 : 0, t, 0.05); }
  power(on) { const was = this.on; this.on = on === undefined ? !this.on : !!on; if (this.on && !was) { this.nextTime = this.ctx.currentTime + 0.05; this._static(0.3); } this._apply(); return this.on; }
  setVolume(v) { this.volume = Math.min(1, Math.max(0, v)); this._apply(); }
  setMuted(m) { this.muted = !!m; this._apply(); }
  tune(dir) {
    this.station = (this.station + (dir >= 0 ? 1 : STATIONS.length - 1)) % STATIONS.length; this.step = 0;
    if (this.on) { this.nextTime = this.ctx.currentTime + 0.3; this._static(0.28); }
    return STATIONS[this.station];
  }
  _static(dur) { // kurzes Rauschen beim Einschalten/Sendersuchen
    const c = this.ctx; const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 0.6; const g = c.createGain(); const t = c.currentTime;
    g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.03); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f); f.connect(g); g.connect(this.bus); src.start(t); src.stop(t + dur + 0.05);
  }

  // Musik vorausplanen (alle ~100 ms aus der Spielschleife aufrufen); until in Audiosekunden
  pump(until = this.ctx.currentTime + 0.4) {
    if (!this.on) return;
    const s = STATIONS[this.station]; const dur = 60 / s.bpm / 4;
    if (this.nextTime < this.ctx.currentTime) this.nextTime = this.ctx.currentTime + 0.02;
    while (this.nextTime < until) { this['_st' + this.station](this.step, this.nextTime, dur); this.step++; this.nextTime += dur; }
  }

  // ---- Bausteine ----
  _tone(type, freq, t, dur, gain, { attack = 0.01, lp = 0, detune = 0, release = 0.15 } = {}) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.setTargetAtTime(0.0001, t + Math.max(attack, dur - release), release / 3);
    let node = o; if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + release + 0.1);
  }
  _pluck(freq, t, dur, gain, lp = 3500) {
    const c = this.ctx; const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = freq; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(lp, t); f.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(f); f.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.05);
  }
  _noise(t, dur, gain, freq, type = 'highpass', q = 0.7) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); s.connect(f); f.connect(g); g.connect(this.bus); s.start(t, this._rand() * 1.5); s.stop(t + dur + 0.02);
  }
  _kick(t, gain = 0.9) {
    const c = this.ctx; const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.28); o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + 0.3);
  }
  _snare(t, gain = 0.5) { this._noise(t, 0.16, gain, 1800, 'bandpass', 0.8); this._tone('triangle', 190, t, 0.1, gain * 0.5, { release: 0.05 }); }

  // Sender 1: ruhige Lo-Fi-Akkorde (Am7 - Fmaj7 - Cmaj7 - G6), weiche Drums
  _st0(i, t, d) {
    const bar = Math.floor(i / 16) % 4; const k = i % 16;
    const chords = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 60, 64, 67], [55, 59, 62, 64]]; const bass = [45, 41, 48, 43];
    if (k === 0) chords[bar].forEach((n, j) => this._tone('triangle', mtof(n), t + j * 0.012, d * 15, 0.1, { attack: 0.08, lp: 1500, detune: j * 3, release: 0.6 }));
    if (k === 0 || k === 10) this._tone('sine', mtof(bass[bar]), t, d * (k === 0 ? 9 : 5), 0.34, { attack: 0.02, release: 0.2 });
    if (k === 0 || k === 7 || k === 8) this._kick(t, 0.55);
    if (k === 4 || k === 12) this._snare(t, 0.22);
    if (k % 2 === 0) this._noise(t + (k % 4 === 2 ? d * 0.18 : 0), 0.045, k % 4 === 0 ? 0.08 : 0.05, 7000);
    const mel = [69, 72, 74, 76, 79, 76, 74, 72];
    if ((k === 2 || k === 6 || k === 11 || k === 14) && this._rand() < 0.75) this._pluck(mtof(mel[Math.floor(this._rand() * mel.length)]), t, 0.9, 0.13, 2600);
  }
  // Sender 2: treibender Synth-Rock zum Rallyefahren (Am - F - C - G), 16tel-Arpeggio
  _st1(i, t, d) {
    const bar = Math.floor(i / 16) % 4; const k = i % 16;
    const root = [45, 41, 48, 43][bar]; const arp = [[0, 7, 12, 16, 12, 7, 12, 7], [0, 7, 12, 15, 12, 7, 12, 7]]; const a = arp[bar % 2];
    this._tone('sawtooth', mtof(root + 12 + a[k % 8]), t, d * 0.9, 0.07, { attack: 0.004, lp: 1800 + 900 * Math.sin(i / 20), release: 0.06 });
    if (k % 2 === 0) this._tone('sawtooth', mtof(root), t, d * 1.8, 0.16, { attack: 0.005, lp: 700, release: 0.08 });
    if (k % 4 === 0) this._kick(t, 0.9);
    if (k === 4 || k === 12) { this._snare(t, 0.38); }
    if (k % 2 === 1) this._noise(t, 0.04, 0.07, 8000);
    if (k === 0 && bar === 3) this._tone('square', mtof(root + 31), t, d * 6, 0.04, { lp: 2500, release: 0.4 });
  }
  // Sender 3: heiteres Folk-Gezupfe in G-Dur (G - C - D - G)
  _st2(i, t, d) {
    const bar = Math.floor(i / 16) % 4; const k = i % 16;
    const ch = [[55, 59, 62, 67], [48, 55, 60, 64], [50, 57, 62, 66], [55, 59, 62, 67]][bar];
    const pat = [0, 1, 2, 3, 2, 1, 2, 3];
    if (k % 2 === 0) this._pluck(mtof(ch[pat[(k / 2) % 8]]), t, 0.5, 0.2, 3800);
    if (k === 0 || k === 8) this._tone('sine', mtof(ch[0] - 12), t, d * 7, 0.3, { attack: 0.01, release: 0.12 });
    const scale = [67, 69, 71, 72, 74, 76, 79]; if ((k === 4 || k === 10 || k === 14) && this._rand() < 0.8) this._pluck(mtof(scale[Math.floor(this._rand() * scale.length)] + 0), t, 0.7, 0.16, 4200);
    if (k % 4 === 2) this._noise(t, 0.06, 0.06, 5500, 'bandpass', 1.2);
  }
}
