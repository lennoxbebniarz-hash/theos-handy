// Theos Seitenscheidel - Ludwig: alle Geräusche synthetisch. Blättchen, Tabak, Drehen, Festklopfen, Klopfen am Fenster, Münzen, Fenster, leiser Raumton.
// Seit 2026-11-21 (Wunsch Lennox „mehr Sounds für alles“): Umgebung je Ort (Bunker brummt und tropft, draußen Stadt, Vögel, Grillen, Brunnen nach Abstand), Leiter und Hall im Bunker,
// Rolltor, Werkbank (Blubbern, Löt-Zischen, Funken, Teile-Klicks, Dampf), Kisten und Inventar, Erwins Türgong, Tauben, eigene Geräusche je Sorte beim Drehen.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createLudwigSound(audio) {
  let S = null; const out = (k) => audio.out('ludwig.' + k);
  function noiseBuf(c) { const n = c.sampleRate * 2; const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  function ensure() {
    if (S) return S; const c = audio.ctx; if (!c || !audio.master) return null; S = { c, nb: noiseBuf(c) };
    const room = c.createBufferSource(); room.buffer = S.nb; room.loop = true; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; const g = c.createGain(); g.gain.value = 0; room.connect(lp); lp.connect(g); const o = out('umgebung'); if (o) g.connect(o); room.start(); S.room = g;
    return S;
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function noiseHit({ t = 0, dur = 0.1, type = 'bandpass', f = 1000, fEnd = 0, q = 0.8, peak = 0.3, a = 0.003, ch = 'drehen', pan = 0 }) {
    if (!ensure()) return; const c = S.c; const now = c.currentTime + t; const s = c.createBufferSource(); s.buffer = S.nb; s.loop = true; /* lange Geräusche reißen sonst am Pufferende ab */ const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, now); if (fEnd) fl.frequency.exponentialRampToValueAtTime(fEnd, now + a + dur); fl.Q.value = q; const g = c.createGain(); env(g, now, a, peak, dur);
    const dst = out(ch); if (!dst) return; s.connect(fl); fl.connect(g); if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(dst); } else g.connect(dst); s.start(now, Math.random() * 1.5); s.stop(now + a + dur + 0.05);
  }
  function tone({ t = 0, type = 'sine', f = 440, fEnd = 0, dur = 0.12, peak = 0.2, a = 0.004, ch = 'signale', pan = 0 }) {
    if (!ensure()) return; const c = S.c; const now = c.currentTime + t; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, now); if (fEnd) o.frequency.exponentialRampToValueAtTime(fEnd, now + a + dur); const g = c.createGain(); env(g, now, a, peak, dur);
    const dst = out(ch); if (!dst) return; o.connect(g); if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(dst); } else g.connect(dst); o.start(now); o.stop(now + a + dur + 0.05);
  }
  // ---- Dauerschleifen für die Umgebung (Lautstärke 0, bis place() sie braucht) und kleine Zufallsgeräusche
  function loopNoise(type, f, q, ch = 'umgebung') { const c = S.c; const s = c.createBufferSource(); s.buffer = S.nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); const o = out(ch); if (o) g.connect(o); s.start(0, Math.random() * 1.5); return g; }
  function loopHum(f, ch = 'umgebung') { const c = S.c; const o1 = c.createOscillator(); o1.type = 'sine'; o1.frequency.value = f; const g = c.createGain(); g.gain.value = 0; o1.connect(g); const o = out(ch); if (o) g.connect(o); o1.start(); return g; }
  function ambLoops() { if (!S.amb) S.amb = { vent: loopNoise('lowpass', 170, 0.7), hum: loopHum(50), hum2: loopHum(100), city: loopNoise('lowpass', 240, 0.5), water: loopNoise('bandpass', 2400, 0.5), water2: loopNoise('highpass', 5500, 0.4) }; return S.amb; }
  function setG(g, v, tc = 0.4) { if (!g || Math.abs((g.userV === undefined ? -1 : g.userV) - v) < 0.0015) return; g.userV = v; g.gain.setTargetAtTime(v, S.c.currentTime, tc); }
  const AT = { drip: 2, bird: 2, cricket: 1, car: 6 }; // Zeit bis zum nächsten Zufallsgeräusch
  function drip() { const f = 1100 + Math.random() * 900; const p = Math.random() * 1.6 - 0.8; tone({ f, fEnd: f * 0.45, dur: 0.06, peak: 0.05, ch: 'umgebung', pan: p }); tone({ t: 0.22, f: f * 0.9, fEnd: f * 0.4, dur: 0.05, peak: 0.015, ch: 'umgebung', pan: p }); }
  function chirp() { const p = Math.random() * 1.4 - 0.7; const f0 = 2400 + Math.random() * 1600; const n = 2 + Math.floor(Math.random() * 3); for (let i = 0; i < n; i++) tone({ t: i * 0.09, f: f0, fEnd: f0 * (1.25 + Math.random() * 0.3), dur: 0.05, peak: 0.025, ch: 'umgebung', pan: p }); }
  function cricket() { const p = Math.random() * 1.4 - 0.7; for (let i = 0; i < 3; i++) tone({ t: i * 0.05, type: 'square', f: 4300 + Math.random() * 200, dur: 0.025, peak: 0.006, ch: 'umgebung', pan: p }); }
  function car(k = 1) { noiseHit({ type: 'lowpass', f: 240, fEnd: 420, q: 0.6, a: 1.4, dur: 1.6, peak: 0.05 * k, ch: 'umgebung', pan: Math.random() * 1.6 - 0.8 }); }
  // Sprachaufnahmen (media/ludwig/<id>.mp3): einmal laden, dann abspielen. Die Länge steuert Vorspann und Elternkontrolle.
  const BUF = new Map(); const LOAD = new Map(); let cur = null;
  function fetchBuf(url) { return new Promise((res) => { try { const x = new XMLHttpRequest(); x.open('GET', url, true); x.responseType = 'arraybuffer'; x.onload = () => { if (!x.response || !x.response.byteLength || !audio.ctx) { res(null); return; } audio.ctx.decodeAudioData(x.response, (b) => res(b), () => res(null)); }; x.onerror = () => res(null); x.send(); } catch (e) { res(null); } }); }
  function loadVoice(id) { if (BUF.has(id)) return Promise.resolve(BUF.get(id)); if (LOAD.has(id)) return LOAD.get(id); if (!ensure()) return Promise.resolve(null); const p = fetchBuf('media/ludwig/' + id + '.mp3').then((b) => { BUF.set(id, b); LOAD.delete(id); aufraeumen(); return b; }); LOAD.set(id, p); return p; }
  // seit dem Stimmen-Update (über 1.200 Aufnahmen): von den Kunden, Leuten und Ereignissen bleiben nur die letzten 90 im Speicher
  function aufraeumen() { const weg = [...BUF.keys()].filter((k) => /^(kunden|leute|extra)\//.test(k)); for (const k of weg.slice(0, Math.max(0, weg.length - 90))) BUF.delete(k); }
  function stopVoice() { if (cur) { try { cur.stop(); } catch (e) { /* schon aus */ } cur = null; } }
  // Sprachaufnahme mit Echo (Easter Egg Gully): trocken plus Verzögerung mit Rückkopplung durch einen Tiefpass, nach ein paar Sekunden abgeklemmt
  function echoVoice(id, gain = 1) {
    const b = BUF.get(id); if (!b || !ensure()) return 0; const c = S.c; const o = out('stimmen'); if (!o) return b.duration;
    const s = c.createBufferSource(); s.buffer = b; const dry = c.createGain(); dry.gain.value = gain; const d = c.createDelay(1.5); d.delayTime.value = 0.34; const fb = c.createGain(); fb.gain.value = 0.5; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; const wet = c.createGain(); wet.gain.value = 0.75 * gain;
    s.connect(dry); dry.connect(o); dry.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(o); s.start();
    setTimeout(() => { try { fb.disconnect(); wet.disconnect(); } catch (e) { /* schon getrennt */ } }, (b.duration + 3.5) * 1000); return b.duration;
  }
  function playVoice(id, gain = 1) { const b = BUF.get(id); if (!b || !ensure()) return 0; stopVoice(); const c = S.c; const s = c.createBufferSource(); s.buffer = b; const g = c.createGain(); g.gain.value = gain; s.connect(g); const o = out('stimmen'); if (!o) return b.duration; g.connect(o); s.start(); cur = s; s.onended = () => { if (cur === s) cur = null; }; return b.duration; }
  return {
    ensure, loadVoice, playVoice, stopVoice, echoVoice, voiceLen: (id) => (BUF.get(id) ? BUF.get(id).duration : 0),
    preload(ids) { return Promise.all(ids.map((id) => loadVoice(id))); },
    // selber rauchen: Feuerzeug, Zug, Husten, Handtuch, Schluck Wasser, Meldung
    anzuenden(vape) { if (vape) { tone({ f: 900, fEnd: 1500, dur: 0.08, peak: 0.05 }); return; } noiseHit({ f: 3800, q: 2, dur: 0.03, peak: 0.18 }); noiseHit({ t: 0.16, f: 3400, q: 2, dur: 0.03, peak: 0.15 }); noiseHit({ t: 0.22, type: 'lowpass', f: 900, dur: 0.3, a: 0.05, peak: 0.07 }); },
    zug(vape) { noiseHit({ f: vape ? 2400 : 4300, fEnd: vape ? 1500 : 5200, q: 0.9, a: 0.12, dur: 0.4, peak: vape ? 0.09 : 0.05 }); if (!vape) for (let i = 0; i < 4; i++) noiseHit({ t: 0.1 + i * 0.09, type: 'highpass', f: 5000, dur: 0.012, peak: 0.06 }); },
    husten() { for (const [t, k] of [[0.05, 1], [0.3, 0.7], [0.48, 0.45]]) { noiseHit({ t, f: 720, fEnd: 320, q: 1.1, a: 0.01, dur: 0.13, peak: 0.3 * k }); tone({ t, type: 'sawtooth', f: 160, fEnd: 90, dur: 0.1, peak: 0.07 * k }); } },
    stoff() { noiseHit({ type: 'lowpass', f: 1500, fEnd: 500, a: 0.05, dur: 0.18, peak: 0.16 }); noiseHit({ t: 0.2, type: 'lowpass', f: 1100, fEnd: 400, a: 0.02, dur: 0.1, peak: 0.1 }); },
    schluck() { for (const t of [0, 0.26, 0.52]) tone({ t, f: 210, fEnd: 420, dur: 0.1, peak: 0.12 }); },
    brauch() { tone({ f: 330, fEnd: 247, dur: 0.5, a: 0.05, peak: 0.1 }); tone({ t: 0.18, f: 196, fEnd: 147, dur: 0.6, a: 0.05, peak: 0.08 }); },
    door(open) { noiseHit({ f: open ? 500 : 380, fEnd: open ? 900 : 260, q: 3, a: 0.05, dur: open ? 0.5 : 0.2, peak: 0.07, ch: 'eltern' }); if (!open) { tone({ t: 0.18, f: 110, fEnd: 60, dur: 0.12, peak: 0.3, ch: 'eltern' }); noiseHit({ t: 0.18, type: 'lowpass', f: 500, dur: 0.12, peak: 0.25, ch: 'eltern' }); } },
    slam() { tone({ f: 95, fEnd: 45, dur: 0.25, peak: 0.45, ch: 'eltern' }); noiseHit({ type: 'lowpass', f: 900, dur: 0.18, peak: 0.4, ch: 'eltern' }); },
    hallStep(k = 1) { noiseHit({ type: 'lowpass', f: 260, q: 0.8, dur: 0.09, peak: 0.12 * k, ch: 'eltern' }); tone({ f: 70, fEnd: 50, dur: 0.06, peak: 0.08 * k, ch: 'eltern' }); },
    heart(k = 1) { tone({ f: 62, fEnd: 48, dur: 0.12, peak: 0.25 * k, ch: 'eltern' }); tone({ t: 0.18, f: 58, fEnd: 44, dur: 0.1, peak: 0.18 * k, ch: 'eltern' }); },
    sting() { for (const [t, f] of [[0, 392], [0.12, 330], [0.24, 262]]) tone({ t, type: 'square', f, dur: 0.14, peak: 0.07, ch: 'eltern' }); },
    plug() { noiseHit({ f: 1400, fEnd: 400, q: 1.2, dur: 0.12, peak: 0.2, ch: 'eltern' }); tone({ t: 0.05, f: 180, fEnd: 40, dur: 0.4, peak: 0.12, ch: 'eltern' }); },
    hide() { noiseHit({ f: 700, fEnd: 1500, q: 0.8, a: 0.02, dur: 0.22, peak: 0.12 }); },
    ambience(on) { if (!ensure()) return; S.room.gain.setTargetAtTime(on ? 0.03 : 0, S.c.currentTime, 0.5); },
    quiet() { if (!S) return; S.room.gain.setTargetAtTime(0, S.c.currentTime, 0.08); for (const g of [...Object.values(S.amb || {}), S.iron]) if (g) { g.userV = 0; g.gain.setTargetAtTime(0, S.c.currentTime, 0.08); } }, // auch Bunker, Stadt, Brunnen und Lötkolben aus
    paper() { noiseHit({ type: 'highpass', f: 4200, dur: 0.1, peak: 0.16 }); noiseHit({ t: 0.06, f: 3000, q: 1.2, dur: 0.07, peak: 0.1 }); },
    crumble() { for (let i = 0; i < 8; i++) noiseHit({ t: i * 0.03 + Math.random() * 0.02, f: 2000 + Math.random() * 2400, q: 2.2, dur: 0.025, peak: 0.09 }); },
    roll() { noiseHit({ f: 1600, fEnd: 700, q: 0.7, a: 0.05, dur: 0.3, peak: 0.12 }); noiseHit({ t: 0.16, f: 2400, fEnd: 1200, q: 0.9, a: 0.03, dur: 0.18, peak: 0.07 }); },
    tap() { for (const t of [0, 0.13]) { tone({ t, f: 190, fEnd: 95, dur: 0.06, peak: 0.3, ch: 'drehen' }); noiseHit({ t, f: 900, q: 1.4, dur: 0.03, peak: 0.16 }); } },
    whoosh() { noiseHit({ f: 800, fEnd: 2600, q: 0.7, a: 0.04, dur: 0.2, peak: 0.08 }); },
    knock() { for (const t of [0, 0.17, 0.34]) { tone({ t, f: 560, fEnd: 320, dur: 0.05, peak: 0.22, ch: 'kunden' }); noiseHit({ t, f: 2800, q: 3, dur: 0.035, peak: 0.16, ch: 'kunden' }); } },
    window(open) { noiseHit({ f: open ? 600 : 420, fEnd: open ? 1200 : 300, q: 1.1, a: 0.02, dur: 0.18, peak: 0.12, ch: 'kunden' }); tone({ t: open ? 0 : 0.14, f: 140, fEnd: 90, dur: 0.06, peak: 0.18, ch: 'kunden' }); },
    leave() { tone({ type: 'triangle', f: 330, fEnd: 190, dur: 0.28, peak: 0.1, ch: 'kunden' }); },
    coin(n = 1) { for (let i = 0; i < Math.min(5, Math.max(1, n)); i++) { const t = i * 0.07; tone({ t, f: 1960, dur: 0.18, peak: 0.1, ch: 'kasse' }); tone({ t: t + 0.01, f: 2940, dur: 0.14, peak: 0.06, ch: 'kasse' }); } },
    buy() { tone({ f: 660, dur: 0.08, peak: 0.14 }); tone({ t: 0.08, f: 880, dur: 0.12, peak: 0.14 }); },
    nope() { tone({ type: 'square', f: 220, fEnd: 160, dur: 0.16, peak: 0.06 }); },
    ui() { tone({ f: 1200, dur: 0.03, peak: 0.05 }); },
    step(k = 1) { noiseHit({ type: 'lowpass', f: 380 + Math.random() * 120, q: 0.7, dur: 0.07, peak: 0.07 * k, ch: 'umgebung' }); },
    take() { for (let i = 0; i < 3; i++) noiseHit({ t: i * 0.05, f: 2600 + i * 300, q: 1.6, dur: 0.04, peak: 0.08 }); },
    sit() { noiseHit({ type: 'lowpass', f: 300, q: 0.8, a: 0.02, dur: 0.18, peak: 0.12, ch: 'umgebung' }); tone({ t: 0.05, f: 160, fEnd: 110, dur: 0.08, peak: 0.06, ch: 'umgebung' }); },
    deny() { tone({ type: 'triangle', f: 300, fEnd: 240, dur: 0.18, peak: 0.08, ch: 'kunden' }); },
    // ---- Handy: Stoff raschelt beim Rausziehen, Einschalten, Tippen, Boss-Plan, Bildschirmzeit, Minispiele
    pocket(out = true) { for (let i = 0; i < 5; i++) noiseHit({ t: i * 0.045, type: 'bandpass', f: out ? 900 + i * 260 : 2000 - i * 260, q: 1.1, a: 0.01, dur: 0.07, peak: 0.07, ch: 'umgebung' }); noiseHit({ t: 0.22, type: 'lowpass', f: 600, dur: 0.12, peak: 0.05, ch: 'umgebung' }); },
    phoneOn() { tone({ f: 1046, dur: 0.09, peak: 0.07 }); tone({ t: 0.09, f: 1568, dur: 0.16, peak: 0.06 }); },
    phoneOff() { tone({ f: 784, fEnd: 392, dur: 0.1, peak: 0.06 }); },
    tapPh() { tone({ f: 1800, dur: 0.02, peak: 0.04 }); },
    turn() { noiseHit({ f: 1200, fEnd: 2400, q: 0.8, a: 0.03, dur: 0.18, peak: 0.04, ch: 'signale' }); },
    skill(final = false) { const notes = final ? [523, 659, 784, 1046, 1318, 1568] : [784, 988, 1175, 1568]; notes.forEach((f, i) => tone({ t: i * 0.06, type: 'triangle', f, dur: 0.16, peak: 0.09 })); noiseHit({ t: 0.05, type: 'highpass', f: 5000, dur: 0.25, peak: 0.05, ch: 'signale' }); },
    limit() { for (const [t, f] of [[0, 660], [0.16, 494], [0.32, 330]]) tone({ t, type: 'sine', f, dur: 0.18, peak: 0.09 }); },
    catchPh(coin = false) { if (coin) { tone({ f: 1960, dur: 0.12, peak: 0.07 }); tone({ t: 0.01, f: 2940, dur: 0.1, peak: 0.04 }); } else noiseHit({ f: 1800, fEnd: 900, q: 1.4, dur: 0.06, peak: 0.08, ch: 'signale' }); },
    dropPh() { tone({ f: 220, fEnd: 130, dur: 0.08, peak: 0.14 }); noiseHit({ type: 'lowpass', f: 900, dur: 0.06, peak: 0.1, ch: 'signale' }); },
    perfectPh() { tone({ f: 1318, dur: 0.12, peak: 0.08 }); tone({ t: 0.07, f: 1760, dur: 0.18, peak: 0.07 }); },
    hitPh(combo = 1) { tone({ type: 'triangle', f: 600 * Math.pow(1.06, Math.min(12, combo)), dur: 0.12, peak: 0.1 }); },
    // ---- Bunker: KippCord-Ping (Alarm schriller), Falltür, Maschine klemmt/läuft an, Lastwagen
    ping(alarm = false) { if (alarm) { for (const [t, f] of [[0, 1320], [0.12, 1760], [0.24, 1320], [0.36, 1760]]) tone({ t, type: 'square', f, dur: 0.09, peak: 0.07 }); } else { tone({ f: 988, dur: 0.07, peak: 0.06 }); tone({ t: 0.07, f: 1318, dur: 0.12, peak: 0.05 }); } },
    hatch(open = true) { noiseHit({ type: 'lowpass', f: open ? 500 : 380, q: 0.8, a: 0.02, dur: 0.25, peak: 0.12, ch: 'umgebung' }); tone({ t: open ? 0.05 : 0.15, f: open ? 140 : 110, fEnd: 60, dur: 0.12, peak: 0.16, ch: 'umgebung' }); },
    clank() { for (const t of [0, 0.09]) { tone({ t, type: 'square', f: 420, fEnd: 180, dur: 0.06, peak: 0.12 }); noiseHit({ t, f: 3200, q: 2, dur: 0.05, peak: 0.12 }); } },
    crank() { for (let i = 0; i < 5; i++) noiseHit({ t: i * 0.07, f: 1400 + i * 120, q: 4, dur: 0.03, peak: 0.08 }); tone({ t: 0.35, f: 90, fEnd: 140, dur: 0.4, peak: 0.08 }); },
    truck() { tone({ type: 'sawtooth', f: 55, fEnd: 70, dur: 1.4, peak: 0.05, ch: 'umgebung' }); noiseHit({ type: 'lowpass', f: 300, a: 0.3, dur: 1.2, peak: 0.06, ch: 'umgebung' }); },
    // ---- Umgebung je Ort, jedes Bild: Schleifen sanft nachführen (Bunker: Lüftung + Netzbrummen, draußen und leise im Zimmer: Stadt, Brunnen je näher desto lauter), dazu Zufallsgeräusche
    place(dt, area, o = {}) {
      if (!ensure()) return; const A = ambLoops(); const bunker = area === 'bunker'; const outside = area === 'draussen'; const room = area === 'zimmer'; const k = o.mute ? 0 : 1;
      setG(A.vent, bunker ? 0.06 * k : 0); setG(A.hum, bunker ? 0.02 * k : 0); setG(A.hum2, bunker ? 0.012 * k : 0); setG(A.city, (outside ? 0.05 : room ? 0.012 : 0) * k);
      const w = outside ? Math.pow(clamp(1 - (o.fountain === undefined ? 99 : o.fountain) / 18, 0, 1), 2) : 0; setG(A.water, 0.07 * w * k); setG(A.water2, 0.03 * w * k);
      if (o.mute) return; for (const key of Object.keys(AT)) AT[key] -= dt;
      if (bunker && AT.drip <= 0) { AT.drip = 2.5 + Math.random() * 6; drip(); }
      if (outside && o.day && AT.bird <= 0) { AT.bird = 1.8 + Math.random() * 5; chirp(); }
      if (outside && !o.day && AT.cricket <= 0) { AT.cricket = 0.8 + Math.random() * 2.2; cricket(); }
      if ((outside || room) && AT.car <= 0) { AT.car = 9 + Math.random() * 14; car(room ? 0.4 : 1); }
    },
    drip,
    // ---- Bunker: Leitersprossen aus Metall, Ankunft unten mit Hall, wieder oben, Rolltor der Tiefgarage
    rung(k = 1) { const f = 620 + Math.random() * 160; tone({ type: 'triangle', f, fEnd: f * 0.7, dur: 0.07, peak: 0.07 * k, ch: 'umgebung' }); noiseHit({ f: 3400, q: 2.5, dur: 0.03, peak: 0.05 * k, ch: 'umgebung' }); },
    bunkerIn() { tone({ f: 72, fEnd: 38, dur: 0.9, peak: 0.22, ch: 'umgebung' }); noiseHit({ type: 'lowpass', f: 420, fEnd: 120, a: 0.01, dur: 0.8, peak: 0.16, ch: 'umgebung' });
      for (let i = 1; i <= 4; i++) { const k = Math.pow(0.5, i); const p = i % 2 ? -0.4 : 0.4; tone({ t: i * 0.19, type: 'triangle', f: 520, fEnd: 360, dur: 0.08, peak: 0.09 * k, ch: 'umgebung', pan: p }); noiseHit({ t: i * 0.19, f: 2600, q: 2, dur: 0.05, peak: 0.06 * k, ch: 'umgebung', pan: p }); } },
    bunkerOut() { noiseHit({ f: 500, fEnd: 1800, q: 0.7, a: 0.15, dur: 0.45, peak: 0.07, ch: 'umgebung' }); tone({ t: 0.1, f: 90, fEnd: 130, dur: 0.3, peak: 0.06, ch: 'umgebung' }); },
    gate() { for (let i = 0; i < 26; i++) noiseHit({ t: i * 0.045, f: 900 + (i % 3) * 300, q: 3, dur: 0.03, peak: 0.05 + 0.03 * Math.sin((i / 26) * Math.PI), ch: 'umgebung' }); tone({ type: 'sawtooth', f: 48, fEnd: 52, dur: 1.2, peak: 0.04, ch: 'umgebung' }); tone({ t: 1.2, f: 110, fEnd: 50, dur: 0.2, peak: 0.16, ch: 'umgebung' }); },
    // ---- Werkbank: Werkzeug klappert, Liquid blubbert, Lötkolben zischt (Dauerzischen solange gelötet wird), Funken bei Fehlern, jedes Teil klickt anders, fertige Vape dampft
    tools() { for (let i = 0; i < 6; i++) noiseHit({ t: i * 0.035 + Math.random() * 0.02, f: 1800 + Math.random() * 2600, q: 6, dur: 0.05, peak: 0.07 }); tone({ t: 0.02, type: 'triangle', f: 820, fEnd: 700, dur: 0.12, peak: 0.04, ch: 'drehen' }); },
    bubble() { for (let i = 0; i < 9; i++) { const f = 260 + Math.random() * 300; tone({ t: i * 0.075 + Math.random() * 0.04, f, fEnd: f * 2.6, dur: 0.05, peak: 0.07, ch: 'drehen' }); } noiseHit({ type: 'lowpass', f: 700, a: 0.08, dur: 0.6, peak: 0.05 }); },
    solder() { noiseHit({ type: 'highpass', f: 5200, a: 0.004, dur: 0.42, peak: 0.13 }); noiseHit({ f: 3000, fEnd: 1800, q: 1.2, a: 0.004, dur: 0.3, peak: 0.07 }); for (let i = 0; i < 6; i++) noiseHit({ t: 0.03 + Math.random() * 0.3, f: 4000 + Math.random() * 3000, q: 4, dur: 0.012, peak: 0.06 }); tone({ t: 0.36, f: 1760, dur: 0.1, peak: 0.035 }); },
    spark() { tone({ type: 'sawtooth', f: 1400, fEnd: 90, dur: 0.22, peak: 0.08, ch: 'drehen' }); for (let i = 0; i < 12; i++) noiseHit({ t: Math.random() * 0.35, f: 2500 + Math.random() * 5000, q: 5, dur: 0.01, peak: 0.1 }); noiseHit({ t: 0.05, type: 'highpass', f: 3500, a: 0.01, dur: 0.5, peak: 0.06 }); },
    iron(on) { if (!ensure()) return; if (!S.iron) S.iron = loopNoise('highpass', 6500, 0.5, 'drehen'); setG(S.iron, on ? 0.016 : 0, 0.08); },
    part(i = 0) { const P = [[260, 'lowpass', 900], [1900, 'bandpass', 3400], [700, 'bandpass', 2200], [520, 'bandpass', 1500], [1300, 'highpass', 2600]][i % 5]; tone({ type: 'triangle', f: P[0], fEnd: P[0] * 0.6, dur: 0.06, peak: 0.12, ch: 'drehen' }); noiseHit({ type: P[1], f: P[2], q: 2, dur: 0.04, peak: 0.12 });
      if (i % 5 === 2) for (let k = 1; k <= 3; k++) noiseHit({ t: k * 0.06, f: 3000 + k * 400, q: 5, dur: 0.02, peak: 0.05 }); }, // Verdampferkopf wird festgedreht
    vapePuff() { noiseHit({ f: 600, fEnd: 2200, q: 0.6, a: 0.25, dur: 0.5, peak: 0.08 }); noiseHit({ t: 0.75, f: 1800, fEnd: 500, q: 0.5, a: 0.05, dur: 1.1, peak: 0.1 }); tone({ t: 0.2, f: 1318, dur: 0.12, peak: 0.06 }); tone({ t: 0.3, f: 1760, dur: 0.2, peak: 0.05 }); },
    // ---- Kisten und Inventar: Box (Pappe), Materialkiste und Teilekiste (Holz), etwas greifen
    boxOpen() { noiseHit({ type: 'lowpass', f: 1100, q: 0.7, a: 0.02, dur: 0.16, peak: 0.12 }); noiseHit({ t: 0.1, f: 2400, q: 1.4, dur: 0.06, peak: 0.06 }); },
    crate() { tone({ type: 'triangle', f: 190, fEnd: 120, dur: 0.1, peak: 0.14, ch: 'umgebung' }); noiseHit({ type: 'lowpass', f: 700, q: 0.8, dur: 0.12, peak: 0.12, ch: 'umgebung' }); noiseHit({ t: 0.09, f: 1300, q: 2, dur: 0.05, peak: 0.06, ch: 'umgebung' }); },
    pick() { noiseHit({ f: 2400, q: 1.6, dur: 0.035, peak: 0.06 }); tone({ f: 900, fEnd: 1300, dur: 0.03, peak: 0.03 }); },
    // ---- Draußen: Türgong bei Elektro-Erwin, Tauben fliegen auf
    chime() { tone({ f: 1318, dur: 0.5, peak: 0.07 }); tone({ t: 0.32, f: 1046, dur: 0.7, peak: 0.07 }); },
    flutter(n = 1) { for (let b = 0; b < Math.min(4, n); b++) for (let i = 0; i < 7; i++) noiseHit({ t: b * 0.09 + i * 0.055, type: 'lowpass', f: 900 + Math.random() * 400, q: 0.8, dur: 0.04, peak: 0.07, ch: 'umgebung', pan: Math.random() - 0.5 }); },
    // ---- eigene Geräusche je Sorte beim Drehen: Hülse, Stopfmaschine, Kapsel knackt, Deckblatt, Bauchbinde, Tips, Gras, Joint anlecken
    tube() { noiseHit({ f: 1300, fEnd: 700, q: 1.6, a: 0.02, dur: 0.18, peak: 0.1 }); tone({ t: 0.16, f: 420, fEnd: 260, dur: 0.05, peak: 0.08, ch: 'drehen' }); },
    press() { for (let i = 0; i < 4; i++) noiseHit({ t: i * 0.06, f: 2200 + i * 200, q: 5, dur: 0.02, peak: 0.08 }); noiseHit({ t: 0.26, type: 'highpass', f: 2500, a: 0.02, dur: 0.25, peak: 0.07 }); tone({ t: 0.5, f: 150, fEnd: 70, dur: 0.1, peak: 0.16, ch: 'drehen' }); },
    pop() { tone({ f: 600, fEnd: 1400, dur: 0.05, peak: 0.08, ch: 'drehen' }); noiseHit({ f: 2000, q: 1, dur: 0.04, peak: 0.06 }); },
    capsule() { for (const t of [0, 0.07]) { noiseHit({ t, f: 5200, q: 4, dur: 0.015, peak: 0.12 }); tone({ t, f: 3200, fEnd: 2200, dur: 0.02, peak: 0.05, ch: 'drehen' }); } },
    leaf() { for (let i = 0; i < 6; i++) noiseHit({ t: i * 0.04 + Math.random() * 0.02, f: 1200 + Math.random() * 900, q: 1.8, dur: 0.05, peak: 0.08 }); noiseHit({ type: 'lowpass', f: 1500, a: 0.04, dur: 0.25, peak: 0.06 }); },
    band() { noiseHit({ type: 'highpass', f: 3800, fEnd: 6000, a: 0.03, dur: 0.22, peak: 0.08 }); tone({ t: 0.24, f: 1600, dur: 0.04, peak: 0.05, ch: 'drehen' }); },
    tipRoll() { for (const t of [0, 0.12]) noiseHit({ t, f: 2800, fEnd: 1600, q: 1.2, a: 0.01, dur: 0.08, peak: 0.08 }); },
    herb() { for (let i = 0; i < 10; i++) noiseHit({ t: i * 0.035 + Math.random() * 0.02, f: 900 + Math.random() * 1400, q: 1.6, dur: 0.035, peak: 0.07 }); },
    // ---- Anschauen (seit 2026-11-21): leiser Doppel-Pieps, wenn das Ziel wechselt
    hover() { tone({ f: 1320, dur: 0.022, peak: 0.03 }); tone({ t: 0.014, f: 1980, dur: 0.02, peak: 0.016 }); },
    // ---- Easter Eggs: Fund-Glitzern und je Ei ein eigenes Geräusch
    egg(all = false) { const notes = all ? [784, 988, 1175, 1568, 1976, 2349, 3136] : [1046, 1318, 1568, 2093]; notes.forEach((f, i) => tone({ t: i * 0.055, type: 'triangle', f, dur: 0.2, peak: 0.08 })); noiseHit({ t: 0.04, type: 'highpass', f: 6500, a: 0.02, dur: 0.45, peak: 0.05, ch: 'signale' }); },
    smoke() { for (const t of [0, 0.55]) tone({ t, type: 'square', f: 3150, dur: 0.05, peak: 0.045, ch: 'umgebung' }); },
    guitar() { const pluck = (t, f, k = 1) => { tone({ t, type: 'triangle', f, dur: 0.5, peak: 0.07 * k, ch: 'umgebung' }); tone({ t, type: 'sawtooth', f: f * 1.003, dur: 0.16, peak: 0.022 * k, ch: 'umgebung' }); noiseHit({ t, f: f * 2, q: 8, dur: 0.04, peak: 0.035 * k, ch: 'umgebung' }); };
      [[0, 164.8], [0.2, 196], [0.4, 220], [0.6, 164.8], [0.8, 196], [1.0, 233.1], [1.2, 220]].forEach(([t, f]) => pluck(t, f)); [164.8, 207.7, 246.9, 311.1].forEach((f, i) => pluck(1.6 + i * 0.03, f, 1.2)); }, // zum Schluss ein schiefer Akkord
    click() { noiseHit({ f: 3500, q: 3, dur: 0.012, peak: 0.08, ch: 'umgebung' }); tone({ f: 2400, dur: 0.01, peak: 0.03, ch: 'umgebung' }); },
    disco(sec = 10) { const n = Math.round(sec * 2); for (let i = 0; i < n; i++) { const t = i * 0.5; tone({ t, f: 130, fEnd: 45, dur: 0.18, peak: 0.2, ch: 'umgebung' }); noiseHit({ t: t + 0.25, type: 'highpass', f: 7000, dur: 0.04, peak: 0.05, ch: 'umgebung' }); tone({ t: t + 0.25, type: 'square', f: [110, 110, 131, 147][i % 4], dur: 0.12, peak: 0.028, ch: 'umgebung' }); } },
    feed() { for (let i = 0; i < 8; i++) noiseHit({ t: i * 0.03 + Math.random() * 0.02, type: 'highpass', f: 5000 + Math.random() * 2000, dur: 0.015, peak: 0.04 }); for (let i = 0; i < 3; i++) { const f = 500 + Math.random() * 300; tone({ t: 0.5 + i * 0.12, f, fEnd: f * 2.2, dur: 0.05, peak: 0.04, ch: 'umgebung' }); } },
    squeak() { tone({ type: 'square', f: 950, fEnd: 1500, dur: 0.12, peak: 0.035, ch: 'umgebung' }); tone({ f: 950, fEnd: 1500, dur: 0.12, peak: 0.06, ch: 'umgebung' }); tone({ t: 0.15, type: 'square', f: 1500, fEnd: 820, dur: 0.15, peak: 0.03, ch: 'umgebung' }); tone({ t: 0.15, f: 1500, fEnd: 820, dur: 0.15, peak: 0.05, ch: 'umgebung' }); },
    gurr() { [[0, 410, 330], [0.18, 370, 300], [0.5, 400, 320], [0.68, 350, 280]].forEach(([t, f, e]) => tone({ t, f, fEnd: e, dur: 0.16, peak: 0.06, ch: 'umgebung' })); noiseHit({ type: 'lowpass', f: 500, a: 0.05, dur: 0.6, peak: 0.02, ch: 'umgebung' }); },
    plunk() { tone({ f: 2400, fEnd: 1600, dur: 0.05, peak: 0.05 }); noiseHit({ t: 0.4, f: 1800, fEnd: 700, q: 0.8, a: 0.01, dur: 0.25, peak: 0.09, ch: 'umgebung' }); for (let i = 0; i < 4; i++) { const f = 400 + Math.random() * 400; tone({ t: 0.5 + i * 0.09, f, fEnd: f * 2.4, dur: 0.05, peak: 0.04, ch: 'umgebung' }); } },
    gnome() { noiseHit({ f: 480, fEnd: 900, q: 6, a: 0.05, dur: 0.5, peak: 0.07, ch: 'umgebung' }); for (let i = 0; i < 5; i++) noiseHit({ t: 0.08 + i * 0.09, f: 1500 + i * 120, q: 5, dur: 0.02, peak: 0.04, ch: 'umgebung' }); },
    lick() { noiseHit({ f: 500, fEnd: 2400, q: 2.5, a: 0.06, dur: 0.22, peak: 0.08 }); noiseHit({ t: 0.18, type: 'highpass', f: 3000, dur: 0.12, peak: 0.05 }); for (let i = 0; i < 4; i++) noiseHit({ t: 0.35 + i * 0.05, f: 3400 + i * 300, q: 3, dur: 0.03, peak: 0.05 }); },
  };
}
