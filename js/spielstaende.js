// Theos Seitenscheidel - Einstellungen, Reiter „Spielstände“: eine Sicherung zurückholen (Abstimmung Paket 3, 2026-11-22).
// Die Arbeit macht das Hauptprogramm vor dem nächsten Start (game/system/spielstand.cjs). Hier: Liste, Rückfrage, Meldung danach.
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const WOCHE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const zwei = (n) => String(n).padStart(2, '0');
export function zeitText(ms) {
  const d = new Date(ms);
  return `${WOCHE[d.getDay()]}, ${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}, ${zwei(d.getHours())}:${zwei(d.getMinutes())} Uhr`;
}
const mb = (bytes) => `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;
const GRUND = {
  weg: 'Diese Sicherung gibt es nicht mehr.',
  sicherung: 'Dein jetziger Stand ließ sich nicht sichern.',
  kopie: 'Die Sicherung ließ sich nicht kopieren. Vielleicht ist die Festplatte voll.',
  tausch: 'Windows hat den Speicher festgehalten. Starte den PC neu und versuch es noch einmal.',
  offen: 'Vom letzten Versuch ist noch etwas offen. Starte den PC neu und versuch es noch einmal.',
  abbruch: 'Das Zurückholen wurde unterbrochen.',
};

// erlaubt(): darf man gerade (nicht mitten im Spiel, in keiner Lobby)?
export function initSpielstaende({ $, erlaubt }) {
  const bruecke = window.spielstand;
  const tab = document.querySelector('#settings .tab[data-tab="stand"]');
  const liste = $('standListe');
  const frage = $('standFrage');
  const frageText = $('standFrageText');
  const hinweis = $('standHinweis');
  if (!bruecke) { tab.classList.add('hidden'); return null; }
  let gewaehlt = null;
  let laeuft = false;

  function abbrechen() {
    gewaehlt = null;
    frage.classList.add('hidden');
  }
  function fragen(s) {
    if (laeuft) return;
    gewaehlt = s;
    frageText.textContent = `Alles wird wieder wie am ${zeitText(s.zeit)}: alle Spiele, Pokale und Einstellungen. Dein jetziger Stand wird vorher gesichert, er steht danach auch in dieser Liste. Das Spiel startet dafür neu.`;
    frage.classList.remove('hidden');
    $('standNein').focus();
  }
  async function zeigen() {
    abbrechen();
    const darf = erlaubt();
    hinweis.textContent = darf
      ? 'Bei jedem Start sichert das Spiel alles. Hier stehen die letzten 10 Sicherungen.'
      : 'Zurückholen geht nur aus dem Zimmer, nicht mitten im Spiel oder in einer Lobby.';
    let alle = [];
    try { alle = await bruecke.liste(); } catch (e) { console.warn('[spielstand] Liste nicht lesbar', e); }
    liste.textContent = '';
    if (!alle.length) liste.append(el('p', 'note', 'Noch keine Sicherung gefunden.'));
    alle.forEach((s, i) => {
      const z = el('div', 'standzeile');
      const text = el('div');
      const was = s.vor ? 'Stand von vor dem Zurückholen' : i === 0 ? 'So war es, als du gerade gestartet hast' : 'Sicherung beim Start';
      text.append(el('b', '', zeitText(s.zeit)), el('small', '', `${was}, ${mb(s.bytes)}`));
      const knopf = el('button', '', 'Zurückholen');
      knopf.type = 'button';
      knopf.disabled = !darf;
      knopf.onclick = () => fragen(s);
      z.append(text, knopf);
      liste.append(z);
    });
  }
  async function los() {
    if (!gewaehlt || laeuft || !erlaubt()) return;
    laeuft = true;
    $('standJa').disabled = true;
    frageText.textContent = 'Das Spiel startet neu …';
    let r = null;
    try { r = await bruecke.zurueck(gewaehlt.id); } catch (e) { console.warn('[spielstand] Zurückholen', e); }
    if (r && r.ok && !r.test) return; // gleich ist das Fenster weg
    laeuft = false;
    $('standJa').disabled = false;
    if (!r || !r.ok) frageText.textContent = 'Das hat nicht geklappt. Deine Spielstände sind unverändert.';
  }
  function melden(r) {
    const kasten = el('div', 'srtafel art-neues');
    kasten.id = 'standMeldung';
    const brett = el('div', 'srtafel-brett');
    brett.setAttribute('role', 'alertdialog');
    const text = r.ok
      ? 'Der alte Spielstand ist wieder da. Dein Stand von vorher ist gesichert: Schublade, Spielstände, „Stand von vor dem Zurückholen“.'
      : `${GRUND[r.grund] || 'Etwas ging schief.'} Deine Spielstände sind unverändert.`;
    const ok = el('button', 'srtafel-zu', 'Alles klar');
    ok.type = 'button';
    const schliessen = () => {
      kasten.remove();
      window.removeEventListener('keydown', taste, true);
    };
    const taste = (e) => {
      if (e.code === 'F11') return;
      e.stopImmediatePropagation();
      if (e.code === 'Escape') { e.preventDefault(); schliessen(); }
    };
    ok.onclick = schliessen;
    window.addEventListener('keydown', taste, true);
    brett.append(el('h2', '', r.ok ? 'Zurückgeholt' : 'Nicht zurückgeholt'), el('p', 'srtafel-stand', text), ok);
    kasten.append(brett);
    document.body.append(kasten);
    ok.focus();
  }

  tab.addEventListener('click', zeigen);
  $('standNein').onclick = abbrechen;
  $('standJa').onclick = los;
  bruecke.ergebnis().then((r) => { if (r) melden(r); }, () => {});
  return { zeigen, melden };
}
