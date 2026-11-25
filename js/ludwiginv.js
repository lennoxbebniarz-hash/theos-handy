// Theos Seitenscheidel - Ludwig Zigaretti: Inventar (Spielprinzip Teil 1b, 2026-11-20, Wunsch Lennox: „Box mit E öffnen und rausziehen“).
// Drei Ansichten: Box <-> Taschen (Ware), Rucksack -> Materialkiste (Einkauf von Kalle), Tab = eigene Taschen und Rucksack (nur ansehen).
// Ziehen mit der Maus: ein Stapel bzw. eine Packung. Doppelklick: so viel wie geht. Rechtsklick: die Hälfte. Dazu die Taschen-Leiste unten rechts.
// Plätze und Fächer werden aus den Mengen abgeleitet (ludwiglogic.js, Block „Inventar“): Stapel ordnen sich selbst, eine Sorte nach der anderen.
import { SORTEN, SORT_ORDER, STACK, MAT_ICO, MAT_NAMES, boxOf, boxTotal, boxCap, take, putBack, sortWord, sortUnlocked, handSlots, pocketSlots, slotsUsed, sackList, sackCap, sackUsed, kisteList, kisteSlots, kisteUsed, sackToKiste, unpackSack, TEILE, TEILE_SLOTS, teileList, teileUsed, sackToTeile, unpackTeile } from './ludwiglogic.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const TIPS = {
  box: 'Ziehen: ein Stapel (10) · Doppelklick: so viel wie geht · Rechtsklick: die Hälfte',
  mat: 'Ziehen: eine Packung · Doppelklick: alles von dieser Sorte · Rechtsklick: eine halbe Packung',
  teile: 'Vape-Teile aus dem Rucksack in die Teilekiste: Ziehen eine Packung · Doppelklick alles von der Sorte · Rechtsklick die Hälfte',
  self: 'Zum Umpacken: E an der Box (Ware) oder an der Materialkiste neben deinem Stuhl (Einkauf).',
};

export function createInventory({ root, getS, snd, onChange, onClose }) {
  const ov = el('div', 'lw-inv hidden'); ov.id = 'lwInv'; const card = el('div', 'lw-invcard lw-char'); ov.append(card); root.append(ov);
  const head = el('header', 'lw-invhead'); const title = el('b', 'lw-invt'); const close = el('button', 'lw-invclose'); close.type = 'button'; close.innerHTML = '<kbd>E</kbd>Fertig'; head.append(title, close);
  const cols = el('div', 'lw-invcols'); const mkSide = (k) => { const s = el('section', 'lw-invside'); s.dataset.side = k; const h = el('h4'); const n = el('span', 'lw-invn'); h.append(el('span', 'lw-invname'), n); const grid = el('div', 'lw-invgrid'); const bar = el('div', 'lw-invbar'); bar.append(el('i')); s.append(h, grid, bar); return s; };
  const A = mkSide('a'); const B = mkSide('b'); cols.append(A, el('div', 'lw-invarrow', '⇄'), B);
  const msg = el('p', 'lw-invmsg'); const btns = el('div', 'lw-invbtns'); const tip = el('p', 'lw-invtip'); card.append(head, cols, msg, btns, tip);
  const bar = el('div', 'lw-pockets lw-char hidden'); root.append(bar); // Taschen-Leiste unten rechts
  const P = { on: false, mode: 'self', want: null, msgT: 0 }; let drag = null; let barSig = '';

  function slot(side, it, opt = {}) {
    const d = el('div', 'lw-islot' + (it ? '' : ' empty') + (opt.nodrag ? ' nodrag' : '') + (opt.cls ? ' ' + opt.cls : '')); d.dataset.side = side; if (!it) return d;
    d.dataset.id = it.id; d.dataset.n = String(it.n); const mat = !SORTEN[it.id]; d.append(el('span', 'ic', mat ? MAT_ICO[it.id] : SORTEN[it.id].icon), el('b', '', it.n.toLocaleString('de-DE')), el('small', '', mat ? MAT_NAMES[it.id] : sortWord(it.id, it.n)));
    if (opt.tag) d.append(el('em', 'tag', opt.tag)); return d;
  }
  function fill(sec, name, count, items, total, opt = {}) {
    sec.querySelector('.lw-invname').textContent = name; sec.querySelector('.lw-invn').textContent = count; const grid = sec.querySelector('.lw-invgrid'); grid.textContent = '';
    const n = Math.max(total, items.length); for (let i = 0; i < n; i++) { const it = items[i]; grid.append(slot(sec.dataset.side, it, { nodrag: opt.nodrag || !!(it && opt.nodragFor && opt.nodragFor(it)), cls: it && i >= total ? 'over' : '', tag: it && opt.tagFor ? opt.tagFor(it) : '' })); }
    const b = sec.querySelector('.lw-invbar'); b.classList.toggle('hidden', opt.fill === undefined); if (opt.fill !== undefined) b.firstChild.style.width = `${Math.min(1, Math.max(0, opt.fill)) * 100}%`;
  }
  function render() {
    const S = getS(); if (!S || !P.on) return; const m = P.mode; btns.textContent = ''; tip.textContent = TIPS[m]; ov.dataset.mode = m;
    if (m === 'box') {
      title.textContent = 'Box'; const cells = SORT_ORDER.filter((id) => boxOf(S, id) > 0 || sortUnlocked(S, id)).map((id) => ({ id, n: boxOf(S, id) })).filter((c) => c.n > 0);
      fill(A, 'In der Box', `${boxTotal(S).toLocaleString('de-DE')} / ${boxCap(S).toLocaleString('de-DE')}`, cells, 10, { fill: boxTotal(S) / boxCap(S), tagFor: (it) => (it.id === P.want ? 'Kunde will' : '') });
      fill(B, 'Deine Taschen', `${slotsUsed(S)} / ${pocketSlots(S)} Plätze`, handSlots(S), pocketSlots(S));
      const all = el('button', '', 'Alles zurück in die Box'); all.type = 'button'; all.onclick = () => { const r = putBack(S); done(r.ok, r.ok ? `${r.n} zurück in die Box` : r.why === 'voll' ? 'Die Box ist voll.' : 'Deine Taschen sind leer.'); }; btns.append(all);
    } else if (m === 'mat') {
      title.textContent = 'Materialkiste'; fill(A, 'Rucksack', `${sackUsed(S)} / ${sackCap(S)} Packungen`, sackList(S), sackCap(S), { nodragFor: (it) => !!TEILE[it.id], tagFor: (it) => (TEILE[it.id] ? 'Bunker' : '') }); // Vape-Teile gehören in die Teilekiste
      fill(B, 'Materialkiste', `${kisteUsed(S)} / ${kisteSlots(S)} Fächer`, kisteList(S), kisteSlots(S), { nodrag: true, fill: kisteUsed(S) / kisteSlots(S) });
      const all = el('button', 'primary', 'Alles einräumen'); all.type = 'button'; all.disabled = !(sackUsed(S) > 0); all.onclick = () => { const g = unpackSack(S); const ok = !!(g && g.n > 0) || !!(g && Object.keys(g).some((k) => !['n', 'rest'].includes(k) && g[k] > 0)); done(ok, ok ? (g.rest ? `Eingeräumt. ${g.rest} ${g.rest === 1 ? 'Packung passt' : 'Packungen passen'} nicht mehr rein.` : 'Alles eingeräumt.') : 'Die Materialkiste ist voll. Eine größere gibt es im Shop am PC.'); }; btns.append(all);
    } else if (m === 'teile') {
      title.textContent = 'Teilekiste'; fill(A, 'Rucksack', `${sackUsed(S)} / ${sackCap(S)} Packungen`, sackList(S), sackCap(S), { nodragFor: (it) => !TEILE[it.id], tagFor: (it) => (TEILE[it.id] ? '' : 'Kiste oben') });
      fill(B, 'Teilekiste', `${teileUsed(S)} / ${TEILE_SLOTS} Fächer`, teileList(S), TEILE_SLOTS, { nodrag: true, fill: teileUsed(S) / TEILE_SLOTS });
      const all = el('button', 'primary', 'Alles einräumen'); all.type = 'button'; all.disabled = !sackList(S).some((it) => TEILE[it.id]); all.onclick = () => { const g = unpackTeile(S); const ok = Object.keys(g).some((k) => !['n', 'rest'].includes(k) && g[k] > 0); done(ok, ok ? (g.rest ? `Eingeräumt. ${g.rest} ${g.rest === 1 ? 'Packung passt' : 'Packungen passen'} nicht mehr rein.` : 'Alle Teile eingeräumt.') : 'Die Teilekiste ist voll.'); }; btns.append(all);
    } else {
      title.textContent = 'Inventar'; fill(A, 'Deine Taschen', `${slotsUsed(S)} / ${pocketSlots(S)} Plätze`, handSlots(S), pocketSlots(S), { nodrag: true });
      fill(B, 'Rucksack', `${sackUsed(S)} / ${sackCap(S)} Packungen`, sackList(S), sackCap(S), { nodrag: true });
    }
  }
  function say(text, ok) { msg.textContent = text || ''; msg.className = 'lw-invmsg' + (text ? (ok ? ' ok' : ' bad') : ''); clearTimeout(P.msgT); if (text) P.msgT = setTimeout(() => { msg.textContent = ''; msg.className = 'lw-invmsg'; }, 2600); }
  function done(ok, text) { if (ok) snd.take(); else snd.nope(); say(text, ok); render(); if (ok && onChange) onChange(); return ok; }
  // how: 'drag' (ein Stapel / eine Packung), 'all' (Doppelklick), 'half' (Rechtsklick); side: wo das Ding herkommt; n: Menge im angefassten Platz
  function act(how, side, id, n = STACK) {
    const S = getS(); if (!S || !P.on || !id) return false;
    if (P.mode === 'box' && side === 'a') { const r = take(S, id, how === 'drag' ? STACK : how === 'half' ? STACK / 2 : Infinity); return done(r.ok, r.ok ? `+${r.n} ${sortWord(id, r.n)} in die Taschen` : r.why === 'voll' ? 'Deine Taschen sind voll: kein Platz frei.' : 'Davon ist nichts mehr in der Box.'); }
    if (P.mode === 'box' && side === 'b') { const r = putBack(S, id, how === 'drag' ? n : how === 'half' ? Math.ceil(n / 2) : Infinity); return done(r.ok, r.ok ? `${r.n} ${sortWord(id, r.n)} zurück in die Box` : r.why === 'voll' ? 'Die Box ist voll.' : 'Nichts zum Zurücklegen.'); }
    if (P.mode === 'teile' && side === 'a') { const got = sackToTeile(S, id, how === 'drag' ? n : how === 'half' ? Math.ceil(n / 2) : Infinity); return done(got > 0, got > 0 ? `+${got.toLocaleString('de-DE')} ${MAT_NAMES[id]} in die Teilekiste` : 'Die Teilekiste ist voll.'); }
    if (P.mode === 'mat' && side === 'a' && TEILE[id]) return done(false, 'Vape-Teile gehören in die Teilekiste an der Werkbank im Bunker.');
    if (P.mode === 'mat' && side === 'a') { const got = sackToKiste(S, id, how === 'drag' ? n : how === 'half' ? Math.ceil(n / 2) : Infinity); return done(got > 0, got > 0 ? `+${got.toLocaleString('de-DE')} ${MAT_NAMES[id]} in die Materialkiste` : 'Die Materialkiste ist voll. Eine größere gibt es im Shop am PC.'); }
    return false;
  }
  // Ziehen mit eigener Maus-Logik (kein HTML-Drag): Geisterbild folgt der Maus, Loslassen über der anderen Seite verschiebt
  const sideAt = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.closest ? t.closest('.lw-invside') : null; };
  card.addEventListener('mousedown', (e) => { if (e.button !== 0) return; const s = e.target.closest('.lw-islot[data-id]'); if (!s || s.classList.contains('nodrag')) return; drag = { s, side: s.dataset.side, id: s.dataset.id, n: Number(s.dataset.n), x: e.clientX, y: e.clientY, ghost: null }; e.preventDefault(); });
  window.addEventListener('mousemove', (e) => {
    if (!drag) return; if (!drag.ghost) { if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5) return; drag.ghost = drag.s.cloneNode(true); drag.ghost.className = 'lw-islot lw-ighost'; snd.pick(); ov.append(drag.ghost); drag.s.classList.add('lift'); }
    drag.ghost.style.transform = `translate(${e.clientX - 34}px, ${e.clientY - 34}px)`; const t = sideAt(e.clientX, e.clientY); for (const s of [A, B]) s.classList.toggle('drop', s === t && s.dataset.side !== drag.side);
  });
  window.addEventListener('mouseup', (e) => { if (!drag) return; const d = drag; drag = null; d.s.classList.remove('lift'); A.classList.remove('drop'); B.classList.remove('drop'); if (!d.ghost) return; d.ghost.remove(); const t = sideAt(e.clientX, e.clientY); if (t && t.dataset.side !== d.side) act('drag', d.side, d.id, d.n); });
  card.addEventListener('dblclick', (e) => { const s = e.target.closest('.lw-islot[data-id]'); if (s && !s.classList.contains('nodrag')) act('all', s.dataset.side, s.dataset.id, Number(s.dataset.n)); });
  card.addEventListener('contextmenu', (e) => { e.preventDefault(); const s = e.target.closest('.lw-islot[data-id]'); if (s && !s.classList.contains('nodrag')) act('half', s.dataset.side, s.dataset.id, Number(s.dataset.n)); });
  close.onclick = () => { if (onClose) onClose(); };
  function open(mode, opt = {}) { P.on = true; P.mode = mode; P.want = opt.want || null; drag = null; say(''); if (mode === 'box') snd.boxOpen(); else if (mode === 'self') snd.pocket(true); else snd.crate(); ov.classList.remove('hidden'); render(); }
  function shut() { if (drag && drag.ghost) drag.ghost.remove(); drag = null; P.on = false; ov.classList.add('hidden'); }
  // Taschen-Leiste: ein Kästchen pro Platz (Sorte und Menge)
  function pockets(S, show) {
    bar.classList.toggle('hidden', !show || !S); if (!show || !S) return; const sl = handSlots(S); const n = Math.max(pocketSlots(S), sl.length); const sig = sl.map((s) => s.id + ':' + s.n).join(',') + '|' + n; if (sig === barSig) return; barSig = sig; bar.textContent = '';
    for (let i = 0; i < n; i++) { const s = sl[i]; const d = el('div', 'lw-pslot' + (s ? '' : ' empty') + (i >= pocketSlots(S) ? ' over' : '')); if (s) { d.append(el('span', 'ic', SORTEN[s.id].icon), el('b', '', String(s.n))); d.title = `${s.n} ${sortWord(s.id, s.n)}`; } bar.append(d); }
  }
  return { el: ov, bar, open, close: shut, render, act, pockets, get isOpen() { return P.on; }, get mode() { return P.mode; } };
}
