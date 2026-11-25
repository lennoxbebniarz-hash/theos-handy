// Theos Seitenscheidel - Strom aus wegen Brunos Geschirrspüler (intern strom): Ton. Schritte, Türen, Axt, Münzen und Signale sind freie Aufnahmen (Kenney, CC0, siehe CREDITS.md),
// dazu eine Wald-Atmosphäre (OpenGameArt, CC0). Fluss, Stadt und das Brummen der Erzeuger entstehen im Web Audio.
// Jede Gruppe hat einen eigenen Regler im Sound-Mischpult (strom.schritte, strom.umgebung, ...). Im Testbetrieb (?silent) bleibt alles stumm.
const BASE = 'media/sounds/strom/';
const FILES = { step_gras: 5, step_beton: 5, step_holz: 5, step_kies: 5, step_metall: 5, chop: 5, knock: 3, ladder: 3, mine: 3, drop: 3, thud: 2, gate: 2, treefall: 3, pickup: 2, door: 3, coin: 2, crank: 2, plug: 1, eat: 1, sleep: 1, ui: 2, quest: 1, levelup: 1, buy: 1, error: 1, zap: 3, buzz: 2, bang: 2, machine: 1, clank: 3, fanfare: 2 };
const CHAN = { zap: 'film', buzz: 'film', bang: 'film', machine: 'film', clank: 'film', fanfare: 'film', step: 'schritte', chop: 'werkzeug', mine: 'werkzeug', ladder: 'werkzeug', crank: 'werkzeug', plug: 'werkzeug', treefall: 'werkzeug', thud: 'werkzeug', pickup: 'werkzeug', drop: 'werkzeug', knock: 'tueren', gate: 'tueren', door: 'tueren', coin: 'signale', ui: 'signale', quest: 'signale', levelup: 'signale', buy: 'signale', error: 'signale', eat: 'signale', sleep: 'signale' };
const GAIN = { zap: 0.6, buzz: 0.6, bang: 1.0, machine: 0.7, clank: 0.8, fanfare: 0.8, step: 0.5, chop: 0.9, mine: 0.8, ladder: 0.45, crank: 0.35, plug: 0.5, treefall: 0.9, thud: 0.9, pickup: 0.6, drop: 0.6, knock: 1.0, gate: 0.7, door: 0.7, coin: 0.7, ui: 0.4, quest: 0.6, levelup: 0.8, buy: 0.6, error: 0.5, eat: 0.6, sleep: 0.6 };

export function createStromSound(audio) {
  const S = { buf: new Map(), started: false, N: null, last: {} };
  const silent = () => new URLSearchParams(location.search).has('silent');
  const ok = () => !silent() && audio && audio.ready && audio.ctx && audio.ctx.state !== 'closed';
  const out = (k) => (audio.out ? audio.out('strom.' + k) : audio.master);
  function fetchBuf(url) { return new Promise((res) => { const x = new XMLHttpRequest(); x.open('GET', url, true); x.responseType = 'arraybuffer'; x.onload = () => { if (!x.response || !x.response.byteLength) { res(null); return; } audio.ctx.decodeAudioData(x.response, (b) => res(b), () => res(null)); }; x.onerror = () => res(null); x.send(); }); }
  async function load() {
    if (S.started || silent() || !audio || !audio.ctx) return; S.started = true;
    const jobs = []; for (const [name, n] of Object.entries(FILES)) for (let i = 0; i < n; i++) jobs.push(fetchBuf(`${BASE}${name}_${i}.ogg`).then((b) => { if (!b) return; const l = S.buf.get(name) || []; l.push(b); S.buf.set(name, l); }));
    jobs.push(fetchBuf(BASE + 'amb_forest.mp3').then((b) => { if (b) S.buf.set('amb_forest', [b]); })); await Promise.all(jobs);
  }
  function init() { load(); }
  function one(name, vol, rate, delay = 0) {
    const list = S.buf.get(name); if (!list || !list.length) return false; const c = audio.ctx; let i = Math.floor(Math.random() * list.length); if (list.length > 1 && i === S.last[name]) i = (i + 1) % list.length; S.last[name] = i;
    const s = c.createBufferSource(); s.buffer = list[i]; s.playbackRate.value = rate; const g = c.createGain(); const key = name.startsWith('step_') ? 'step' : name; g.gain.value = (GAIN[key] || 0.6) * vol; s.connect(g); g.connect(out(CHAN[key] || 'signale')); s.start(c.currentTime + delay); return true;
  }
  // Name wie in FILES (ohne Nummer). Fehlt die Aufnahme noch, bleibt es bei einem leisen Klick.
  function play(name, vol = 1, rate = 1) {
    if (!ok()) return; if (!S.started) load();
    if (name === 'knock') { for (let i = 0; i < 3; i++) one('knock', vol, 0.8 + Math.random() * 0.1, i * 0.23); return; }
    if (name === 'treefall') { one('treefall', vol, 0.7, 0); one('treefall', vol * 0.8, 0.55, 0.5); one('thud', vol, 0.8, 1.55); one('chop', vol * 0.6, 0.6, 1.6); return; }
    if (name === 'gate') { one('gate', vol, 1, 0); one('gate', vol * 0.7, 0.8, 0.25); return; }
    if (name === 'levelup') { one('levelup', vol, 1, 0); one('quest', vol * 0.7, 1.25, 0.18); return; }
    if (name === 'fanfare') { one('fanfare', vol, rate, 0); one('levelup', vol * 0.6, rate, 0.12); return; }
    if (!one(name, vol, rate) && audio.tick && (name === 'ui' || name === 'crank')) audio.tick(0.1);
  }
  function step(surface, vol = 1) { if (!ok()) return; const n = 'step_' + (surface === 'asphalt' ? 'beton' : surface); if (!one(n, vol, 0.92 + Math.random() * 0.16) && audio.tick) audio.tick(0.08); }

  // Umgebung: Wald (Aufnahme), Fluss und Stadt (Rauschen), Brummen der Erzeuger
  function nodes() {
    if (S.N) return S.N; const c = audio.ctx; const dest = out('umgebung'); const N = { g: {} };
    const noise = (type, f, q) => { const s = c.createBufferSource(); s.buffer = audio.noiseBuf; s.loop = true; s.playbackRate.value = 0.7 + Math.random() * 0.5; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(dest); s.start(); return g; };
    N.g.rain = noise('bandpass', 2600, 0.45); N.g.roof = noise('lowpass', 750, 0.5);
    N.g.river = noise('bandpass', 1100, 0.5); N.g.river2 = noise('lowpass', 380, 0.4); N.g.city = noise('lowpass', 260, 0.6); N.g.wind = noise('bandpass', 420, 0.3);
    const hum = c.createGain(); hum.gain.value = 0; hum.connect(out('maschinen')); for (const [f, v] of [[50, 0.5], [100, 0.3], [150, 0.12]]) { const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; const g = c.createGain(); g.gain.value = v; o.connect(g); g.connect(hum); o.start(); } N.g.hum = hum;
    N.g.forest = c.createGain(); N.g.forest.gain.value = 0; N.g.forest.connect(dest); S.N = N; return N;
  }
  function ambience(dt, o) {
    if (!ok() || !audio.noiseBuf) return; const N = nodes(); const c = audio.ctx; const t = c.currentTime;
    if (!N.forestSrc && S.buf.get('amb_forest')) { const s = c.createBufferSource(); s.buffer = S.buf.get('amb_forest')[0]; s.loop = true; s.connect(N.g.forest); s.start(); N.forestSrc = s; }
    const inside = o.inside ? 1 : 0; const set = (g, v) => g.gain.setTargetAtTime(v, t, 0.5);
    set(N.g.forest, (inside ? 0.04 : o.night ? 0.22 : 0.55) * (o.drive ? 0.35 : 1) * (1 - o.city * 0.7) * (o.storm ? 0.3 : 1));
    const r = o.river * o.river * (inside ? 0.12 : 1) * (o.drive ? 0.5 : 1); set(N.g.river, r * 0.1); set(N.g.river2, r * 0.16);
    const regen = o.regen || 0; set(N.g.rain, regen * (inside ? 0.006 : 0.05) * (o.drive ? 0.7 : 1)); set(N.g.roof, regen * (o.underRoof ? 0.07 : 0)); // Regen draußen, unterm Blechdach trommelt er
    set(N.g.city, o.city * (inside ? 0 : 0.12)); set(N.g.wind, (inside ? 0.004 : 0.022) * (o.storm ? 5 : 1)); set(N.g.hum, Math.min(1, o.gens / 24) * 0.09);
  }
  // Dauerton für die Filmszenen (Geschirrspüler): gibt { rate(r), stop(sek) } zurück, im Testbetrieb einen leeren Griff
  function loop(name, vol = 1, rate = 1) {
    const none = { rate() {}, stop() {} }; if (!ok()) return none; const list = S.buf.get(name); if (!list || !list.length) return none; const c = audio.ctx;
    const s = c.createBufferSource(); s.buffer = list[0]; s.loop = true; s.playbackRate.value = rate; const g = c.createGain(); g.gain.value = 0; g.gain.setTargetAtTime((GAIN[name] || 0.6) * vol, c.currentTime, 0.08); s.connect(g); g.connect(out(CHAN[name] || 'signale')); s.start();
    return { rate(r) { s.playbackRate.setTargetAtTime(r, c.currentTime, 0.1); }, stop(sec = 0.3) { g.gain.setTargetAtTime(0, c.currentTime, sec / 3); try { s.stop(c.currentTime + sec + 0.1); } catch (e) { /* schon aus */ } } };
  }
  // Strom geht aus (Ton fällt) oder an (Ton steigt): Sägezahn durch einen Tiefpass
  function sweep(up, dur = 1.4) {
    if (!ok()) return; const c = audio.ctx; const t = c.currentTime; const o = c.createOscillator(); o.type = 'sawtooth'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 4; const g = c.createGain();
    o.frequency.setValueAtTime(up ? 45 : 260, t); o.frequency.exponentialRampToValueAtTime(up ? 330 : 28, t + dur); f.frequency.setValueAtTime(up ? 200 : 1400, t); f.frequency.exponentialRampToValueAtTime(up ? 2200 : 120, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.08); g.gain.setValueAtTime(0.16, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(f); f.connect(g); g.connect(out('film')); o.start(t); o.stop(t + dur + 0.05);
  }
  function quiet() { if (!S.N || !audio.ctx) return; for (const g of Object.values(S.N.g)) g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.1); }
  return { init, load, play, step, ambience, quiet, loop, sweep, state: S };
}
