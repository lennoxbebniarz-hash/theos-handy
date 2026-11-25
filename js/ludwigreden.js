// Theos Seitenscheidel - Ludwig Zigaretti: Reden (G) und Gespräche durch die Tür, das Sichtbare (Stimmen-Update 2026-11-22).
// Bewusst kein Menü: Die Maus bleibt gefangen, die Welt läuft, geantwortet wird mit den Zahlentasten.
import { LEUTE } from './ludwigtexte.js';
import { clock } from './ludwigwelt.js';
import { THEMEN, ANTWORT, themen, gruss, antwort, anliegen } from './ludwiggespraech.js';
import { tuer, tuerWahl } from './ludwigereignis.js';
import { satz, leuteSatz, kundenSatz } from './ludwigstimmen.js';
import { buildLeute, REICHWEITE } from './ludwigleute.js';
import { brauchtEine } from './ludwigsucht.js';

const PARK = [{ voice: 'kevin', name: 'Kevin' }, { voice: 'emre', name: 'Emre' }]; // wer auf den zwei Parkbänken sitzt
const TUERZEIT = 16; // so lange wartet, wer vor der Tür steht
const WEGLAUFEN = 1.8; // so viel weiter weg als die Reichweite endet das Gespräch
const NAME = { mama: 'Mama', papa: 'Papa', oma: 'Oma', opa: 'Opa', onkel: 'Onkel Ralf', tante: 'Tante Gerda' };
const waehle = (l) => l[Math.floor(Math.random() * l.length)];

// host: { C, hud, snd, ST (Stimmen), toast, wirkung(r), darf(), save(), fern() (Mitspieler: schickt die Tür-Antwort zum Gastgeber, sonst null) }
export function createReden({ C, hud, snd, ST, toast, wirkung, darf, save, fern }) {
  const el = (tag, cls, id) => { const e = document.createElement(tag); e.className = cls; if (id) e.id = id; return e; };
  const taste = (k) => { const e = el('kbd', ''); e.textContent = k; return e; };
  const hinweis = el('div', 'lw-redhint hidden', 'lwRedHint'); const hName = el('span', ''); hinweis.append(taste('G'), hName);
  const kasten = el('section', 'lw-reden hidden', 'lwReden'); kasten.setAttribute('aria-live', 'polite');
  const kopf = el('h3', ''); const sagt = el('p', ''); const liste = el('ol', ''); const uhr = el('i', 'lw-redzeit'); const uhrFill = el('em', ''); uhr.append(uhrFill);
  kasten.append(kopf, sagt, liste, uhr); hud.append(hinweis, kasten);
  const R = { leute: null, vorn: null, mit: null, stufe: '', opts: [], oft: {}, zuletzt: new Map(), tuer: null, t: 0 };

  function zeigeWahl(opts) {
    R.opts = opts; liste.textContent = '';
    opts.forEach((o, i) => { const li = document.createElement('li'); const s = document.createElement('span'); s.textContent = o.text; li.append(taste(String(i + 1)), s); liste.append(li); });
  }
  function hauptwahl() {
    const S = C.S; const { id } = R.mit; const du = LEUTE[id].du;
    R.stufe = 'themen';
    zeigeWahl([...themen(S, id).map((t) => ({ id: t.id, text: t.text(du) })), { id: 'tschuess', text: 'Tschüss.' }]);
  }
  function beginne(e) {
    const S = C.S;
    if (e.park !== undefined) { // Parkkunden: Gruß und was sie wollen, verkauft wird mit E
      const p = S.welt.park.find((q) => q.bank === e.park); if (!p) return;
      const P = PARK[e.park];
      ST.sag([satz('q_hallo' + (1 + Math.floor(Math.random() * 3))), kundenSatz(P.voice, 'gruss_' + clock(S).phase, P.name), kundenSatz(P.voice, `k${1 + Math.floor(Math.random() * 3)}_${Math.min(4, p.want)}`, P.name)]);
      return;
    }
    const L = LEUTE[e.id]; if (!L) return;
    const alt = R.zuletzt.get(e.id);
    const key = gruss(S, e.id, { grau: brauchtEine(S), seit: alt === undefined ? Infinity : C.t - alt });
    R.mit = e; R.tuer = null; R.zuletzt.set(e.id, C.t);
    kopf.textContent = L.name; sagt.textContent = key ? L.t[key] : ''; uhr.classList.add('hidden');
    hauptwahl(); kasten.classList.remove('hidden'); snd.ui();
    ST.sag([satz('q_hallo' + (1 + Math.floor(Math.random() * 3))), leuteSatz(e.id, key)]);
  }
  function frage(wahl) {
    const S = C.S; const { id } = R.mit; const L = LEUTE[id];
    if (R.stufe === 'anliegen') {
      const A = ANTWORT.find((a) => a.id === wahl); const r = anliegen(S, id, wahl);
      sagt.textContent = L.t[wahl] || '';
      ST.sag([satz(waehle(A.sag)), leuteSatz(id, wahl)]);
      if (r.ok) { wirkung(r); save(); }
      hauptwahl(); return;
    }
    if (wahl === 'tschuess') { ende(true); return; }
    const n = R.oft[id + wahl] = (R.oft[id + wahl] === undefined ? -1 : R.oft[id + wahl]) + 1;
    const key = antwort(S, id, wahl, n); const T = THEMEN.find((t) => t.id === wahl);
    sagt.textContent = key ? L.t[key] : '';
    ST.sag([satz(T.q(L.du)), leuteSatz(id, key)]);
    if (wahl === 'frage') { R.stufe = 'anliegen'; zeigeWahl(ANTWORT.map((a) => ({ id: a.id, text: a.text }))); }
    R.zuletzt.set(id, C.t);
  }
  function ende(sagen = false) {
    const e = R.mit;
    if (sagen && e) { const n = 1 + Math.floor(Math.random() * 2); ST.sag([satz('q_tschuess' + n), leuteSatz(e.id, 'tschuess' + n)]); }
    R.mit = null; R.tuer = null; R.opts = []; R.stufe = ''; kasten.classList.add('hidden');
  }

  // ---------------- Durch die Tür ----------------
  function klopft(id, zuhoeren = false) {
    const g = tuer(id); const q = g && satz(id); if (!q) return false;
    if (zuhoeren) { ST.sag([q]); return true; } // Mitspieler hören nur zu, antworten muss Ludwig
    R.mit = null; R.tuer = { g, t: TUERZEIT, anliegen: g.antworten[0].length > 1 };
    kopf.textContent = `${NAME[g.wer]} vor der Tür`; sagt.textContent = q.text;
    zeigeWahl(g.antworten.map((a, i) => ({ id: i, text: R.tuer.anliegen ? ANTWORT[i].text : satz(a[0]).text })));
    uhr.classList.remove('hidden'); kasten.classList.remove('hidden'); snd.knock();
    ST.sag([q]);
    return true;
  }
  function tuerAntwort(i) {
    const { g } = R.tuer; const schick = fern ? fern() : null;
    const r = tuerWahl(schick ? { eltern: { next: 0 }, geld: 0 } : C.S, g.id, i); // ist ein Mitspieler Ludwig, rechnet der Gastgeber
    if (schick) schick(g.id, i);
    R.tuer = null; R.opts = []; kasten.classList.add('hidden');
    const fertig = () => { if (r.text) toast(r.text, 3400); };
    if (i < 0) { ST.sag([satz('l_hm')], fertig); } else ST.sag([satz(waehle(g.antworten[i])), satz(g.reaktion[i])], fertig);
    if (r.zeichen === '€') wirkung({ geld: 200, resp: 0 });
    save();
  }

  // ---------------- Tasten und Takt ----------------
  function key(code) {
    if (!C.S || !darf()) return false;
    if (code === 'KeyG') {
      if (R.mit) ende(true); else if (!R.tuer && R.vorn) beginne(R.vorn);
      return true;
    }
    const m = /^(?:Digit|Numpad)([1-9])$/.exec(code);
    if (!m || !(R.mit || R.tuer)) return false;
    const i = Number(m[1]) - 1; if (i >= R.opts.length) return true;
    if (R.tuer) tuerAntwort(i); else frage(R.opts[i].id);
    return true;
  }
  function tick(dt, run) {
    const S = C.S; if (!S || !R.leute) return;
    const frei = darf(); const draussen = C.area === 'draussen';
    R.vorn = frei && draussen && C.mode === 'walk' ? R.leute.finde(S, C.me) : null;
    if (R.mit) {
      const p = R.leute.ort(R.mit); const weit = Math.hypot(p.x - C.me.x, p.z - C.me.z) > (R.mit.weit || REICHWEITE) + WEGLAUFEN;
      if (!draussen || C.ctrl || weit || !R.mit.ok(C.me.x, C.me.z)) { ende(false); ST.stop(); }
    }
    if (R.tuer) {
      if (C.ctrl || C.area !== 'zimmer') ende(false);
      else { if (run) R.tuer.t -= dt; uhrFill.style.width = `${Math.max(0, R.tuer.t / TUERZEIT) * 100}%`; if (R.tuer.t <= 0) tuerAntwort(-1); }
    }
    if (run) R.leute.update(S, C.me, C.t, dt, draussen, R.mit || R.vorn);
    const offen = !!(R.mit || R.tuer) && frei;
    kasten.classList.toggle('hidden', !offen);
    const h = !offen && R.vorn && !ST.redet() ? R.vorn : null;
    hinweis.classList.toggle('hidden', !h);
    if (h) { const t = `Reden mit ${h.park !== undefined ? PARK[h.park].name : LEUTE[h.id].name}`; if (hName.textContent !== t) hName.textContent = t; }
  }
  function reset() { ende(false); R.vorn = null; R.oft = {}; R.zuletzt.clear(); hinweis.classList.add('hidden'); }
  return { build() { if (!R.leute) R.leute = buildLeute(C); }, key, tick, reset, klopft, state: R, leute: () => R.leute, get aktiv() { return !!(R.mit || R.tuer); } };
}
