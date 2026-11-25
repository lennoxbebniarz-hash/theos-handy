// Theos Seitenscheidel - Ludwig Zigaretti: Abstimmung Paket 4 (2026-11-22), die Fenster.
// Kumpel-Chat fürs Handy, Nachricht oben rechts, Gestalter für die eigene Marke am PC. Kein style="…" im HTML (CSP), Namen nur als Text.
import { FARBEN, ZEICHEN, MARKE_MAX, VON, saubereMarke } from './ludwigextra.js';
import { malMarke } from './ludwigextraart.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const WER_FARBE = { rot: '#ff6a5f', gelb: '#f5c03a', gruen: '#5fd47e', bruno: '#6ab0ff' };

// ---- Handy: App „Kumpels“
export function createChatView(box) {
  let key = '';
  return function zeig(S) {
    const list = (S.chat && S.chat.list) || [];
    const neu = list.map((m) => `${m.id}${m.von}${m.text}`).join('|') || 'leer';
    if (neu === key) return;
    key = neu; box.textContent = '';
    if (!list.length) box.append(el('p', 'pl-tip', 'Noch ist es still. Rot, Gelb und Grün melden sich von selbst.'));
    for (const m of list) {
      const zeile = el('div', m.warn ? 'pk-msg warn' : 'pk-msg'); const wer = el('b', '', VON[m.von] || 'Bruno');
      wer.style.color = WER_FARBE[m.von] || WER_FARBE.bruno;
      zeile.append(wer, el('span', '', m.text)); box.append(zeile);
    }
    box.scrollTop = box.scrollHeight;
  };
}

// ---- Nachricht oben rechts, auch wenn das Handy in der Tasche steckt (kostet keine Bildschirmzeit)
export function createNachricht(hud, snd) {
  const box = el('div', 'lw-nachricht hidden'); box.id = 'lwNachricht'; box.setAttribute('role', 'status');
  const wer = el('b'); const text = el('span'); box.append(wer, text); hud.append(box);
  let t = 0;
  return {
    zeig(m) {
      wer.textContent = VON[m.von] || 'Bruno'; wer.style.color = WER_FARBE[m.von] || WER_FARBE.bruno; text.textContent = m.text;
      box.classList.toggle('warn', !!m.warn); t = m.warn ? 6 : 4;
      if (m.warn) snd.ping(false);
    },
    tick(dt, sichtbar) { t = Math.max(0, t - dt); box.classList.toggle('hidden', !(t > 0 && sichtbar)); },
    reset() { t = 0; box.classList.add('hidden'); },
  };
}

// ---- PC: „Meine Marke“
export function markeApp({ getS, snd, gespeichert }) {
  const wahl = saubereMarke(getS().marke);
  const root = el('div', 'os-marke'); const vorschau = el('canvas', 'os-mvor'); vorschau.width = 512; vorschau.height = 288;
  const plakat = el('canvas', 'os-mplakat'); plakat.width = 216; plakat.height = 288;
  const bilder = el('div', 'os-mbilder'); bilder.append(vorschau, plakat);
  const name = el('input', 'os-mname'); name.type = 'text'; name.maxLength = MARKE_MAX; name.value = wahl.name; name.spellcheck = false; name.autocomplete = 'off';
  name.setAttribute('aria-label', 'Name deiner Marke');
  const farben = el('div', 'os-mfarben'); const zeichen = el('div', 'os-mzeichen'); const info = el('p', 'os-minfo');
  info.setAttribute('role', 'status');
  const knoepfe = { farbe: [], zeichen: [] };
  const mal = () => {
    const M = { ...wahl, name: name.value };
    malMarke(vorschau.getContext('2d'), vorschau.width, vorschau.height, M, 'packung');
    malMarke(plakat.getContext('2d'), plakat.width, plakat.height, M, 'plakat');
    for (const [k, list] of Object.entries(knoepfe)) list.forEach((b, i) => b.setAttribute('aria-pressed', String(wahl[k] === i)));
  };
  const knopf = (ziel, k, i, label, text = '') => {
    const b = el('button', '', text); b.type = 'button'; b.setAttribute('aria-label', label);
    b.onclick = () => { wahl[k] = i; info.textContent = ''; snd.ui(); mal(); };
    knoepfe[k].push(b); ziel.append(b);
    return b;
  };
  FARBEN.forEach((F, i) => { knopf(farben, 'farbe', i, F.name).style.background = F.bg; });
  ZEICHEN.forEach((Z, i) => knopf(zeichen, 'zeichen', i, `Zeichen ${i + 1}`, Z));
  name.addEventListener('input', () => { info.textContent = ''; mal(); });
  name.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape' || e.key === 'Enter') name.blur(); });
  const ok = el('button', 'os-mok', 'Speichern'); ok.type = 'button';
  ok.onclick = () => {
    const M = saubereMarke({ ...wahl, name: name.value }); const S = getS();
    S.marke = M; name.value = M.name; mal(); snd.buy(); gespeichert(M);
    info.textContent = 'Gespeichert. Auf Packung, Band und Plakaten.';
  };
  const fuss = el('div', 'os-mfuss'); fuss.append(ok, info);
  root.append(bilder, el('label', 'os-mlabel', 'Name'), name, el('p', 'os-mlabel', 'Farbe'), farben, el('p', 'os-mlabel', 'Zeichen'), zeichen, fuss);
  mal();
  return root;
}
