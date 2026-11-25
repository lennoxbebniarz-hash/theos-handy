// Theos Seitenscheidel - Ludwig Zigaretti: Vapes bauen an der Werkbank im Bunker (Spielprinzip Teil 2, 2026-11-21, Antworten von Lennox).
// Drei Schritte: 1 Liquid mischen (Geschmack wählen: eine Base und ein Aroma), 2 Löten (drei Lötpunkte: Leertaste oder Klick, wenn der Lötkolben im grünen Feld steht;
// daneben brennt die Platine durch), 3 Zusammenbauen (Akku, Platine, Verdampferkopf, Tank, Gehäuse in der richtigen Reihenfolge ins Gehäuse ziehen oder anklicken).
// Fertige Vapes gehen in die Taschen, sonst in die Ablage. Die Zeit kommt vom Spiel (tick), damit Pause und Tests sauber laufen. Kein style="…" im HTML (CSP).
import { TEILE, TEIL_ORDER, PARTS, FLAVORS, VAPES, SORTEN, teilOf, mixLiquid, vapeMissing, solderFail, finishVape, takeAblage, sortWord } from './ludwiglogic.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const FL = { mango: { name: 'Mango', ico: '🥭' }, menthol: { name: 'Menthol', ico: '🧊' }, kirsche: { name: 'Kirsche', ico: '🍒' } };
const PN = { akku: 'Akku', platine: 'Platine', kopf: 'Verdampferkopf', tank: 'Tank', gehaeuse: 'Gehäuse' };
const NEED = ['base', 'a_mango', 'a_menthol', 'a_kirsche', ...PARTS];
export const SOLDER = { pads: 3, zone: 0.17, speed: 0.75, faster: 1.18 }; // Feldbreite (Anteil der Bahn), Tempo (Bahnen pro Sekunde)

export function createWerkbank({ root, getS, snd, onChange, onClose, onBuilt }) {
  const ov = el('div', 'lw-werk hidden'); ov.id = 'lwWerk'; const card = el('div', 'lw-werkcard lw-char'); ov.append(card); root.append(ov);
  card.innerHTML = '<header class="lw-werkhead"><b>WERKBANK</b><span class="lw-werksteps"><i data-s="liquid">1 Liquid</i><i data-s="loeten">2 Löten</i><i data-s="bauen">3 Zusammenbauen</i></span><button type="button" class="lw-werkclose"><kbd>E</kbd>Fertig</button></header>'
    + '<div class="lw-werkcols"><aside class="lw-werkteile"><h4>Teilekiste</h4><ul></ul><small>Einräumen: E an der Teilekiste links neben der Werkbank.</small></aside><section class="lw-werkmain"></section>'
    + '<aside class="lw-werkablage"><h4>Ablage</h4><div class="lw-werkab"></div><button type="button" class="lw-werktake">In die Taschen</button></aside></div><p class="lw-werkmsg"></p>';
  const q = (s) => card.querySelector(s); const main = q('.lw-werkmain'); const msg = q('.lw-werkmsg');
  const P = { on: false, step: 'liquid', mixT: 0, mixFl: null, sol: null, next: 0, order: [], last: null, msgT: 0, drag: null };
  function say(t, ok) { msg.textContent = t || ''; msg.className = 'lw-werkmsg' + (t ? (ok ? ' ok' : ' bad') : ''); clearTimeout(P.msgT); if (t) P.msgT = setTimeout(() => { msg.textContent = ''; msg.className = 'lw-werkmsg'; }, 3200); }
  function renderSide() {
    const S = getS(); if (!S) return; const ul = q('.lw-werkteile ul'); ul.textContent = '';
    for (const k of TEIL_ORDER) { const n = teilOf(S, k); const li = el('li', n > 0 ? '' : 'leer'); li.dataset.k = k; li.append(el('span', '', `${TEILE[k].ico} ${TEILE[k].name}`), el('b', '', String(n))); ul.append(li); }
    const ab = q('.lw-werkab'); ab.textContent = ''; let any = 0; for (const id of VAPES) { const n = S.werk.ablage[id]; any += n; const d = el('div', 'lw-werkabr' + (n ? '' : ' leer')); d.append(el('span', '', `${SORTEN[id].icon} ${SORTEN[id].plural}`), el('b', '', String(n))); ab.append(d); }
    q('.lw-werktake').disabled = !any; for (const i of card.querySelectorAll('.lw-werksteps i')) i.classList.toggle('on', i.dataset.s === P.step || (P.step === 'warte' && i.dataset.s === 'liquid') || (P.step === 'fertig' && i.dataset.s === 'bauen'));
  }
  // Schritt bestimmen: fertiges Liquid wartet schon? Dann gleich löten (wenn alle Teile da sind)
  function enter() { const S = getS(); if (!S) return; if (!S.werk.liquid) { P.step = 'liquid'; return; } P.step = vapeMissing(S).length ? 'warte' : 'loeten'; if (P.step === 'loeten') startSolder(); }
  function startSolder() { P.sol = { pad: 0, x: 0, dir: 1, speed: SOLDER.speed, zone: newZone(), fx: 0, burn: 0 }; }
  const newZone = () => { const a = 0.08 + Math.random() * (0.84 - SOLDER.zone); return [a, a + SOLDER.zone]; };
  function renderMain() {
    const S = getS(); if (!S) return; main.textContent = ''; main.dataset.step = P.step;
    if (P.step === 'liquid') {
      main.append(el('h3', '', 'Liquid mischen'), el('p', 'lw-werkhint', 'Eine Portion Base und ein Aroma. Welcher Geschmack?'));
      const row = el('div', 'lw-werkfl'); FLAVORS.forEach((f, i) => { const ak = 'a_' + f; const b = el('button', 'lw-flbtn'); b.type = 'button'; b.dataset.fl = f; b.disabled = teilOf(S, 'base') < 1 || teilOf(S, ak) < 1; b.append(el('i', 'lw-key', String(i + 1)), el('em', '', FL[f].ico), el('b', '', FL[f].name), el('small', '', `Base ${teilOf(S, 'base')} · Aroma ${teilOf(S, ak)}`)); row.append(b); }); main.append(row);
      if (P.mixT > 0) { const bot = el('div', 'lw-mix'); const fillE = el('i'); bot.append(fillE); fillE.style.height = `${Math.round((1 - P.mixT / 0.9) * 100)}%`; main.append(bot, el('p', 'lw-werkhint', `${FL[P.mixFl].name}-Liquid wird gemischt …`)); }
      else if (teilOf(S, 'base') < 1) main.append(el('p', 'lw-werkwarn', 'Keine Liquid-Base mehr. Elektro-Erwin hat welche (gegenüber, 8 bis 20 Uhr).'));
    } else if (P.step === 'warte') {
      const miss = vapeMissing(S); main.append(el('h3', '', `${FL[S.werk.liquid].ico} ${FL[S.werk.liquid].name}-Liquid ist fertig`), el('p', 'lw-werkwarn', `Es fehlt noch: ${miss.map((k) => PN[k]).join(', ')}. Erwin hat Teile, dann E an der Teilekiste.`));
    } else if (P.step === 'loeten') {
      const s = P.sol; main.append(el('h3', '', 'Löten'), el('p', 'lw-werkhint', 'Leertaste oder Klick, wenn der Lötkolben im grünen Feld ist. Daneben brennt die Platine durch.'));
      const board = el('div', 'lw-board'); for (let i = 0; i < SOLDER.pads; i++) { const p = el('i', 'pad' + (i < s.pad ? ' done' : i === s.pad ? ' on' : '')); board.append(p); } if (s.burn > 0) board.classList.add('burn'); main.append(board);
      const bar = el('div', 'lw-sbar'); const zone = el('span', 'zone'); zone.style.left = `${s.zone[0] * 100}%`; zone.style.width = `${(s.zone[1] - s.zone[0]) * 100}%`; const iron = el('span', 'iron'); iron.style.left = `${s.x * 100}%`; bar.append(zone, iron); main.append(bar); P.ironEl = iron;
      const b = el('button', 'primary lw-solder', 'Löten!'); b.type = 'button'; main.append(b); main.append(el('p', 'lw-werkhint small', `Platinen in der Kiste: ${teilOf(S, 'platine')}`));
    } else if (P.step === 'bauen') {
      main.append(el('h3', '', 'Zusammenbauen'), el('p', 'lw-werkhint', 'Zieh die Teile in der richtigen Reihenfolge ins Gehäuse: von innen nach außen.'));
      const house = el('div', 'lw-house'); PARTS.forEach((k, i) => { const sl = el('div', 'slot' + (i < P.next ? ' full' : i === P.next ? ' next' : '')); sl.append(el('span', '', i < P.next ? TEILE[k].ico : String(i + 1))); house.append(sl); }); main.append(house);
      const parts = el('div', 'lw-parts'); for (const k of P.order) { if (PARTS.indexOf(k) < P.next) continue; const b = el('button', 'part'); b.type = 'button'; b.dataset.p = k; b.append(el('em', '', TEILE[k].ico), el('small', '', PN[k])); parts.append(b); } main.append(parts);
    } else if (P.step === 'fertig') {
      const r = P.last; main.append(el('div', 'lw-done', SORTEN[r.id].icon), el('h3', '', `${SORTEN[r.id].name} fertig!`), el('p', 'lw-werkhint', r.where === 'hand' ? 'Steckt schon in deinen Taschen.' : 'Taschen voll: Sie liegt in der Ablage rechts.'));
      const again = el('button', 'primary lw-again', 'Noch eine bauen'); again.type = 'button'; main.append(again);
    }
    renderSide();
  }
  function mix(f) {
    const S = getS(); if (!S || P.step !== 'liquid' || P.mixT > 0) return false; const r = mixLiquid(S, f);
    if (!r.ok) { snd.nope(); say(r.why === 'base' ? 'Keine Liquid-Base mehr.' : r.why === 'schon' ? 'Es ist schon ein Liquid gemischt.' : `Kein Aroma ${FL[f] ? FL[f].name : ''} mehr.`, false); return false; }
    snd.bubble(); P.mixT = 0.9; P.mixFl = f; if (onChange) onChange(); renderMain(); return true;
  }
  function hit() {
    const S = getS(); if (!S || P.step !== 'loeten' || !P.sol) return null; const s = P.sol; const ok = s.x >= s.zone[0] - 0.01 && s.x <= s.zone[1] + 0.01;
    if (ok) { s.pad++; snd.solder(); if (s.pad >= SOLDER.pads) { P.step = 'bauen'; P.next = 0; P.order = [...PARTS].sort(() => Math.random() - 0.5); say('Sauber gelötet!', true); } else { s.speed *= SOLDER.faster; s.zone = newZone(); } renderMain(); return true; }
    const left = solderFail(S); snd.spark(); if (onChange) onChange(); s.burn = 0.6;
    if (left > 0 && !vapeMissing(S).length) { say(`Daneben! Die Platine ist durchgebrannt. Neue Platine (noch ${left}).`, false); startSolder(); P.sol.burn = 0.6; } else { say('Daneben! Die Platine ist durchgebrannt und es ist keine mehr da. Erwin hat welche.', false); P.step = 'warte'; }
    renderMain(); return false;
  }
  function place(k) {
    const S = getS(); if (!S || P.step !== 'bauen') return false; if (k !== PARTS[P.next]) { snd.nope(); say(`${PN[k]} passt da noch nicht. Von innen nach außen!`, false); const b = main.querySelector(`.part[data-p="${k}"]`); if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } return false; }
    P.next++; snd.part(P.next - 1); if (P.next >= PARTS.length) { const r = finishVape(S); if (!r.ok) { snd.nope(); say(`Es fehlt: ${PN[r.why] || 'Liquid'}.`, false); P.step = 'warte'; renderMain(); return false; } P.last = r; P.step = 'fertig'; snd.vapePuff(); if (onChange) onChange(); if (onBuilt) onBuilt(r); }
    renderMain(); return true;
  }
  function take() { const S = getS(); if (!S) return; const r = takeAblage(S); if (r.ok) { snd.take(); say(`${r.n} ${r.n === 1 ? 'Vape' : 'Vapes'} in die Taschen.${r.left ? ` ${r.left} passen nicht mehr.` : ''}`, true); if (onChange) onChange(); } else { snd.nope(); say(r.why === 'voll' ? 'Deine Taschen sind voll.' : 'Die Ablage ist leer.', false); } renderMain(); }
  // Klicks und Ziehen
  card.addEventListener('click', (e) => {
    const t = e.target; if (t.closest('.lw-werkclose')) { if (onClose) onClose(); return; } if (t.closest('.lw-werktake')) { take(); return; }
    const fb = t.closest('.lw-flbtn'); if (fb) { mix(fb.dataset.fl); return; } if (t.closest('.lw-solder')) { hit(); return; } if (t.closest('.lw-again')) { enter(); renderMain(); return; }
    const pb = t.closest('.part'); if (pb && !P.dragged) place(pb.dataset.p); P.dragged = false;
  });
  card.addEventListener('mousedown', (e) => { const pb = e.target.closest('.part'); if (!pb || e.button !== 0) return; P.drag = { k: pb.dataset.p, el: pb, x: e.clientX, y: e.clientY, ghost: null }; e.preventDefault(); });
  window.addEventListener('mousemove', (e) => { const d = P.drag; if (!d) return; if (!d.ghost) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 5) return; d.ghost = d.el.cloneNode(true); d.ghost.className = 'part lw-pghost'; snd.pick(); ov.append(d.ghost); d.el.classList.add('lift'); } d.ghost.style.transform = `translate(${e.clientX - 30}px, ${e.clientY - 30}px)`; });
  window.addEventListener('mouseup', (e) => { const d = P.drag; if (!d) return; P.drag = null; d.el.classList.remove('lift'); if (!d.ghost) return; d.ghost.remove(); P.dragged = true; setTimeout(() => { P.dragged = false; }, 0); const t = document.elementFromPoint(e.clientX, e.clientY); if (t && t.closest && t.closest('.lw-house')) place(d.k); });
  function open() { P.on = true; P.mixT = 0; P.drag = null; say(''); snd.tools(); ov.classList.remove('hidden'); enter(); renderMain(); }
  function close() { P.on = false; snd.iron(false); if (P.drag && P.drag.ghost) P.drag.ghost.remove(); P.drag = null; ov.classList.add('hidden'); }
  // Spielzeit: Mischen läuft ab, der Lötkolben fährt hin und her
  function tick(dt) {
    if (!P.on) return; snd.iron(P.step === 'loeten'); /* leises Dauerzischen, solange der Kolben heiß ist */ if (P.mixT > 0) { P.mixT -= dt; if (P.mixT <= 0) { P.mixT = 0; enter(); renderMain(); } else { const f = main.querySelector('.lw-mix i'); if (f) f.style.height = `${Math.round((1 - P.mixT / 0.9) * 100)}%`; } }
    if (P.step === 'loeten' && P.sol) { const s = P.sol; s.x += s.dir * s.speed * dt; if (s.x >= 1) { s.x = 1; s.dir = -1; } if (s.x <= 0) { s.x = 0; s.dir = 1; } if (P.ironEl) P.ironEl.style.left = `${s.x * 100}%`; if (s.burn > 0) { s.burn -= dt; if (s.burn <= 0) { const b = main.querySelector('.lw-board'); if (b) b.classList.remove('burn'); } } }
  }
  function key(code) { if (P.step === 'loeten' && (code === 'Space' || code === 'Enter')) return hit(); if (P.step === 'liquid' && /^Digit[1-3]$/.test(code)) return mix(FLAVORS[Number(code.slice(5)) - 1]); if (P.step === 'fertig' && (code === 'Space' || code === 'Enter')) { enter(); renderMain(); return true; } return null; }
  // Für Tests: Lötkolben ins Feld stellen
  const ironToZone = () => { if (P.sol) P.sol.x = (P.sol.zone[0] + P.sol.zone[1]) / 2; };
  const ironAway = () => { if (P.sol) P.sol.x = P.sol.zone[0] > 0.5 ? 0.02 : 0.98; };
  return { el: ov, open, close, tick, key, hit, mix, place, take, ironToZone, ironAway, render: renderMain, get isOpen() { return P.on; }, get step() { return P.step; }, get state() { return P; }, word: sortWord, NEED };
}
