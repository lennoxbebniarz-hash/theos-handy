// Theos Seitenscheidel - die zwei Tafeln im Zimmer (Abstimmung Paket 3, 2026-11-22): „Zimmer gestalten“ und „Was ist neu?“.
// Stil: tafeln.css. Beim Gestalten steht die Tafel mittig vorm Schrank, links und rechts sieht man sofort, was sich ändert.
import { POSTER, NEON, DEKO, MAX_POKALE } from './zimmerwahl.js';
import { NEUIGKEITEN, kopfzeile } from './neuigkeiten.js';

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const pokalWort = (n) => (n === 1 ? 'Pokal' : 'Pokalen');

// holen(): { wahl, n }, setzen(neueWahl), version: laufende Spielversion
export function createTafeln({ holen, setzen, version, beimSchliessen, mehr = {} }) { // mehr: weitere Tafeln { art: { titel, zu, bau(inhalt, el) } }
  const huelle = el('div', 'srtafel hidden');
  huelle.id = 'srTafel';
  const brett = el('div', 'srtafel-brett');
  brett.setAttribute('role', 'dialog');
  brett.setAttribute('aria-modal', 'true');
  brett.setAttribute('aria-labelledby', 'srTafelTitel');
  const titel = el('h2');
  titel.id = 'srTafelTitel';
  const inhalt = el('div', 'srtafel-inhalt');
  const zu = el('button', 'srtafel-zu', 'Fertig');
  zu.type = 'button';
  brett.append(titel, inhalt, zu);
  huelle.append(brett);
  document.body.append(huelle);

  let art = null;
  let vorher = null; // wohin der Fokus zurückgeht

  function feld(kennung, name, an, gesperrt, klick, farbe) {
    const b = el('button', `srwahl${an ? ' an' : ''}`);
    b.type = 'button';
    b.dataset.wahl = kennung;
    b.disabled = !!gesperrt;
    b.setAttribute('aria-pressed', String(!!an));
    if (farbe !== undefined) {
      const punkt = el('i', 'srwahl-farbe');
      punkt.style.background = `#${farbe.toString(16).padStart(6, '0')}`;
      b.append(punkt);
    }
    b.append(el('b', '', name));
    if (gesperrt) b.append(el('small', '', gesperrt));
    b.onclick = klick;
    return b;
  }
  function reihe(name, felder) {
    const s = el('section', 'srwahl-reihe');
    const netz = el('div', 'srwahl-netz');
    netz.append(...felder);
    s.append(el('h3', '', name), netz);
    inhalt.append(s);
  }
  function gestalten() {
    const { wahl, n } = holen();
    const sperre = (e) => (e.ab > n ? `ab ${e.ab} ${pokalWort(e.ab)}` : null);
    const nimm = (aenderung, kennung) => {
      setzen({ ...wahl, ...aenderung });
      gestalten();
      const b = inhalt.querySelector(`[data-wahl="${kennung}"]`);
      if (b) b.focus();
    };
    inhalt.textContent = '';
    inhalt.append(el('p', 'srtafel-stand', n ? `Du hast ${n} von ${MAX_POKALE} Pokalen. Silber und Gold zählen beide.` : 'Du hast noch keinen Pokal. Was du dafür tun musst, steht am Trophäenregal oben an der Wand.'));
    reihe('Poster', [
      feld('poster:', 'Keins', !wahl.poster || !!sperre(POSTER.find((e) => e.id === wahl.poster)), null, () => nimm({ poster: null }, 'poster:')),
      ...POSTER.map((e) => feld(`poster:${e.id}`, e.name, wahl.poster === e.id && !sperre(e), sperre(e), () => nimm({ poster: e.id }, `poster:${e.id}`))),
    ]);
    reihe('Neonfarbe', [
      feld('neon:', 'Pink', !wahl.neon || !!sperre(NEON.find((e) => e.id === wahl.neon)), null, () => nimm({ neon: null }, 'neon:'), 0xff5c9e),
      ...NEON.map((e) => feld(`neon:${e.id}`, e.name, wahl.neon === e.id && !sperre(e), sperre(e), () => nimm({ neon: e.id }, `neon:${e.id}`), e.farbe)),
    ]);
    reihe('Deko, so viel du willst', DEKO.map((e) => {
      const an = wahl.deko.includes(e.id);
      const neu = an ? wahl.deko.filter((id) => id !== e.id) : [...wahl.deko, e.id];
      return feld(`deko:${e.id}`, e.name, an && !sperre(e), sperre(e), () => nimm({ deko: neu }, `deko:${e.id}`));
    }));
  }
  function neues() {
    inhalt.textContent = '';
    NEUIGKEITEN.forEach((e, i) => {
      const s = el('section', `srneu${i ? '' : ' oben'}`);
      const liste = el('ul');
      for (const p of e.punkte) liste.append(el('li', '', p));
      s.append(el('h3', '', e.titel), el('small', '', kopfzeile(e, version)), liste);
      inhalt.append(s);
    });
  }

  const ART = {
    gestalten: { titel: 'Zimmer gestalten', bau: gestalten, zu: 'Fertig' },
    neues: { titel: 'Was ist neu?', bau: neues, zu: 'Gelesen' },
  };
  for (const [k, T] of Object.entries(mehr)) ART[k] = { titel: T.titel, zu: T.zu || 'Fertig', bau: () => { inhalt.textContent = ''; T.bau(inhalt, el); } };
  function oeffnen(welche) {
    if (!ART[welche]) return;
    vorher = document.activeElement;
    art = welche;
    huelle.className = `srtafel art-${welche}`;
    titel.textContent = ART[welche].titel;
    zu.textContent = ART[welche].zu;
    ART[welche].bau();
    inhalt.scrollTop = 0;
    zu.focus();
  }
  function schliessen() {
    if (!art) return;
    const war = art;
    art = null;
    huelle.className = 'srtafel hidden';
    if (vorher && vorher.isConnected && vorher.offsetParent) vorher.focus();
    else if (document.activeElement) document.activeElement.blur();
    vorher = null;
    if (beimSchliessen) beimSchliessen(war);
  }
  zu.onclick = schliessen;
  huelle.addEventListener('pointerdown', (e) => { if (e.target === huelle) schliessen(); });
  // vor allen anderen: Esc schließt nur die Tafel, die Pfeile wandern durch ihre Knöpfe
  window.addEventListener('keydown', (e) => {
    if (!art || e.code === 'F11') return;
    e.stopImmediatePropagation();
    if (e.code === 'Escape') { e.preventDefault(); schliessen(); return; }
    const schritt = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.code] || (e.code === 'Tab' ? (e.shiftKey ? -1 : 1) : 0);
    if (!schritt) return;
    e.preventDefault();
    const knoepfe = [...brett.querySelectorAll('button:not([disabled])')];
    const i = knoepfe.indexOf(document.activeElement);
    knoepfe[i < 0 ? 0 : (i + schritt + knoepfe.length) % knoepfe.length].focus({ focusVisible: true });
  }, true);

  return { oeffnen, schliessen, get art() { return art; } };
}
