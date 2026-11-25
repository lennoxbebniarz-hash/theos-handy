// Theos Seitenscheidel - Trockne den Ozean aus: Ton. Schritte, Münzen, Türen und Signale nutzen die freien Aufnahmen aus dem Strom-Spiel (Kenney, CC0, siehe CREDITS.md).
// Meer, Wind, Möwen, Platschen, Gluckern und das Brummen der Pumpen entstehen im Web Audio. Jede Gruppe hat einen eigenen Regler im Sound-Mischpult (ozean.*).
// Im Testbetrieb (?silent) bleibt alles stumm.
const BASE = 'media/sounds/strom/';
const FILES = { step_gras: 5, step_beton: 5, step_holz: 5, step_kies: 5, door: 3, coin: 2, ui: 2, quest: 1, levelup: 1, buy: 1, error: 1, sleep: 1, pickup: 2, drop: 3, fanfare: 2, bang: 2, thud: 2 };
const CHAN = { step: 'schritte', door: 'signale', coin: 'signale', ui: 'signale', quest: 'signale', levelup: 'signale', buy: 'signale', error: 'signale', sleep: 'signale', pickup: 'wasser', drop: 'wasser', fanfare: 'film', bang: 'film', thud: 'film' };
const GAIN = { step: 0.45, door: 0.7, coin: 0.7, ui: 0.4, quest: 0.6, levelup: 0.8, buy: 0.6, error: 0.5, sleep: 0.6, pickup: 0.5, drop: 0.5, fanfare: 0.8, bang: 0.8, thud: 0.8 };

export function createOzeanSound(audio) {
  const S = { buf: new Map(), started: false, N: null, last: {}, gullT: 3 };
  const silent = () => new URLSearchParams(location.search).has('silent');
  const ok = () => !silent() && audio && audio.ready && audio.ctx && audio.ctx.state !== 'closed';
  const out = (k) => (audio.out ? audio.out('ozean.' + k) : audio.master);
  function fetchBuf(url) { return new Promise((res) => { const x = new XMLHttpRequest(); x.open('GET', url, true); x.responseType = 'arraybuffer'; x.onload = () => { if (!x.response || !x.response.byteLength) { res(null); return; } audio.ctx.decodeAudioData(x.response, (b) => res(b), () => res(null)); }; x.onerror = () => res(null); x.send(); }); }
  async function load() { if (S.started || silent() || !audio || !audio.ctx) return; S.started = true; const jobs = []; for (const [name, n] of Object.entries(FILES)) for (let i = 0; i < n; i++) jobs.push(fetchBuf(`${BASE}${name}_${i}.ogg`).then((b) => { if (!b) return; const l = S.buf.get(name) || []; l.push(b); S.buf.set(name, l); })); await Promise.all(jobs); }
  function one(name, vol, rate, delay = 0) {
    const list = S.buf.get(name); if (!list || !list.length) return false; const c = audio.ctx; let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === S.last[name]) i = (i + 1) % list.length; S.last[name] = i;
    const s = c.createBufferSource(); s.buffer = list[i]; s.playbackRate.value = rate; const g = c.createGain(); const key = name.startsWith('step_') ? 'step' : name; g.gain.value = (GAIN[key] || 0.6) * vol; s.connect(g); g.connect(out(CHAN[key] || 'signale')); s.start(c.currentTime + delay); return true;
  }
  const noiseHit = (type, f0, f1, dur, vol, chan, q = 1, delay = 0) => { const c = audio.ctx; const t = c.currentTime + delay; const s = c.createBufferSource(); s.buffer = audio.noiseBuf; const f = c.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(out(chan)); s.start(t, Math.random()); s.stop(t + dur + 0.05); };
  const blip = (f0, f1, dur, vol, chan, type = 'sine', delay = 0) => { const c = audio.ctx; const t = c.currentTime + delay; const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(out(chan)); o.start(t); o.stop(t + dur + 0.05); };
  // Name wie in FILES, dazu eigene: splash (Platschen), gluck (Glas füllt sich), pour (Tank leeren), gull (Möwe), pump (Schwengel), motor (kurz)
  function play(name, vol = 1, rate = 1) {
    if (!ok()) return; if (!S.started) load();
    if (name === 'splash') { noiseHit('bandpass', 2200, 500, 0.45 * rate, 0.35 * vol, 'wasser', 0.8); noiseHit('lowpass', 900, 200, 0.6, 0.25 * vol, 'wasser', 0.5, 0.05); return; }
    if (name === 'scoop') { noiseHit('bandpass', 1400 * rate, 600, 0.22, 0.18 * vol, 'wasser', 1.4); for (let i = 0; i < 3; i++) blip(380 + Math.random() * 300, 180, 0.08, 0.06 * vol, 'wasser', 'sine', 0.05 + i * 0.07); return; }
    if (name === 'gluck') { for (let i = 0; i < 4; i++) blip(300 + i * 70 + Math.random() * 40, 520 + i * 60, 0.07, 0.07 * vol, 'wasser', 'sine', i * 0.09); return; }
    if (name === 'pour') { noiseHit('bandpass', 900, 400, 1.2, 0.22 * vol, 'wasser', 0.6); noiseHit('lowpass', 500, 180, 1.4, 0.16 * vol, 'wasser', 0.4, 0.1); one('coin', vol, 1, 0.9); return; }
    if (name === 'gull') { const c = 1800 + Math.random() * 600; for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) { blip(c, c * 0.62, 0.22, 0.05 * vol, 'umgebung', 'triangle', i * 0.28); blip(c * 1.5, c * 0.9, 0.18, 0.02 * vol, 'umgebung', 'sine', i * 0.28 + 0.02); } return; }
    if (name === 'pump') { blip(140, 70, 0.25, 0.12 * vol, 'maschinen', 'sawtooth'); noiseHit('bandpass', 700, 300, 0.3, 0.12 * vol, 'wasser', 1.2, 0.1); return; }
    if (name === 'levelup') { one('levelup', vol, 1); one('quest', vol * 0.7, 1.25, 0.18); return; }
    if (name === 'fanfare') { one('fanfare', vol, rate); one('levelup', vol * 0.6, rate, 0.12); return; }
    if (!one(name, vol, rate) && audio.tick && (name === 'ui')) audio.tick(0.1);
  }
  function step(surface, vol = 1) { if (!ok()) return; if (surface === 'wasser') { noiseHit('bandpass', 1300, 500, 0.25, 0.12 * vol, 'schritte', 1.2); return; } const n = 'step_' + (surface === 'sand' ? 'kies' : surface === 'holz' ? 'holz' : surface === 'haus' ? 'holz' : surface === 'stein' ? 'beton' : 'gras'); if (!one(n, vol, 0.92 + Math.random() * 0.16) && audio.tick) audio.tick(0.06); }
  // Umgebung: Brandung (je näher am Wasser, desto lauter), Wind, Pumpenbrummen, Möwen am Tag
  function nodes() {
    if (S.N) return S.N; const c = audio.ctx; const dest = out('umgebung'); const N = { g: {} };
    const noise = (type, f, q, d = dest) => { const s = c.createBufferSource(); s.buffer = audio.noiseBuf; s.loop = true; s.playbackRate.value = 0.6 + Math.random() * 0.4; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(d); s.start(); return { g, fl }; };
    N.surf = noise('lowpass', 520, 0.6); N.hiss = noise('bandpass', 2400, 0.4); N.wind = noise('bandpass', 380, 0.3); N.under = noise('lowpass', 180, 0.7);
    const hum = c.createGain(); hum.gain.value = 0; hum.connect(out('maschinen')); for (const [f, v, ty] of [[46, 0.5, 'sawtooth'], [92, 0.25, 'sine'], [138, 0.12, 'sine']]) { const o = c.createOscillator(); o.type = ty; o.frequency.value = f; const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 260; const g = c.createGain(); g.gain.value = v; o.connect(fl); fl.connect(g); g.connect(hum); o.start(); } N.hum = hum;
    S.N = N; return N;
  }
  // o: { coast 0..1 (Nähe zum Wasser), inside, night, pumps 0..1, under (unter Wasser), t }
  function ambience(dt, o) {
    if (!ok() || !audio.noiseBuf) return; const N = nodes(); const c = audio.ctx; const t = c.currentTime; const set = (g, v) => g.gain.setTargetAtTime(v, t, 0.4);
    const swell = 0.6 + 0.4 * Math.sin(o.t * 0.55) * Math.sin(o.t * 0.23 + 1); const inside = o.inside ? 0.18 : 1;
    set(N.surf.g, o.coast * 0.2 * swell * inside); set(N.hiss.g, o.coast * 0.05 * swell * swell * inside); set(N.wind.g, (o.inside ? 0.004 : 0.02 + (1 - o.coast) * 0.01)); set(N.under.g, o.under ? 0.25 : 0); N.surf.fl.frequency.setTargetAtTime(o.under ? 200 : 520, t, 0.2);
    set(N.hum, Math.min(1, o.pumps) * 0.06 * (o.inside ? 0.3 : 1));
    if (!o.night && !o.inside && !o.under && (S.gullT -= dt) < 0) { S.gullT = 6 + Math.random() * 14; if (o.coast > 0.15) play('gull', 0.6 + Math.random() * 0.5); }
  }
  function quiet() { if (!S.N || !audio.ctx) return; const t = audio.ctx.currentTime; for (const k of ['surf', 'hiss', 'wind', 'under']) S.N[k].g.gain.setTargetAtTime(0, t, 0.1); S.N.hum.gain.setTargetAtTime(0, t, 0.1); }
  return { init: load, load, play, step, ambience, quiet, state: S };
}
