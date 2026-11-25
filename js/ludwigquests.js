// Theos Seitenscheidel - Ludwig Zigaretti: Aufgabenliste oben links (ersetzt seit 2026-11-20 das Tutorial am Anfang, Wunsch Lennox).
// Seit 2026-11-22 (Lennox): immer nur eine Aufgabe, links ein Zigaretten-Logo. Erledigt: Haken, Respekt (2 mal RESP_TEMPO = 6), dann kommt die nächste.
// Reihenfolge = Weg durchs Spiel. Eine später erledigte Aufgabe zählt auch, wenn eine frühere noch offen ist.
import { sortUnlocked, matOf } from './ludwiglogic.js';
import { bunkerOpen } from './ludwigbunker.js';
import { gainResp } from './ludwigskills.js';

const made = (S, id) => (S.made && S.made[id]) || 0;
const tool = (S, k) => !!(S.tools && S.tools[k]);
export const QUESTS = [
  { id: 'drehen', t: 'Erste Kippe drehen', h: 'Geh zum Tisch, schau deinen Stuhl an und drück E. Dann klicken oder Leertaste, bis die Kippe fertig ist.', done: (S) => S.stats.gedreht >= 1 },
  { id: 'bruno', t: 'Bruno drei Kippen verkaufen', h: 'Steh auf (E), schau die Box an, drück E und zieh 3 Kippen in deine Taschen. Dann ans Fenster und E.', done: (S) => S.brunoDone },
  { id: 'kunden5', t: '5 Kunden bedienen', h: 'Klopft es am Fenster? Hol Kippen aus der Box, geh hin, drück E und einig dich auf einen Preis.', done: (S) => S.stats.kunden >= 5 },
  { id: 'kalle', t: 'Nachschub bei Kalle holen', h: 'Kletter am Fenster mit F raus. Geh rechts die Straße runter zum Kiosk, Kalle steht hinten im Hof.', done: (S) => !!(S.flags && S.flags.kalle) },
  { id: 'einraeumen', t: 'Einkauf in die Materialkiste räumen', h: 'Wieder drin? Schau die Kiste neben deinem Stuhl an, drück E und zieh die Packungen rüber.', done: (S) => !!(S.flags && S.flags.eingeraeumt) }, // seit 2026-11-20 (Inventar)
  { id: 'kontrolle', t: 'Eine Elternkontrolle überstehen', h: 'Kommt Mama oder Papa, hast du ein paar Sekunden: Box, Kiste und Stühle anschauen und jeweils E.', done: (S) => S.eltern.geschafft >= 1 },
  { id: 'shop', t: 'Etwas im Shop am PC kaufen', h: 'Geh zum Gaming-PC, drück E und öffne den Shop. Kauf dir zum Beispiel größere Taschen.', done: (S) => Object.values(S.up).some((v) => v > 0) || Object.keys(S.tools || {}).length > 0 },
  { id: 'boss', t: 'Ersten Knoten im Boss-Plan kaufen', h: 'Drück T für dein Handy und öffne die App Boss-Plan. Respekt bekommst du von zufriedenen Kunden.', done: (S) => Object.keys(S.skills).length > 0 },
  { id: 'kunden25', t: '25 Kunden bedienen', h: 'Weiter verkaufen. Jeder zufriedene Kunde bringt Respekt für den Boss-Plan.', done: (S) => S.stats.kunden >= 25 },
  { id: 'stopfFrei', t: 'Stopfkippen freischalten', h: 'Handy (T), App Boss-Plan, Ast Produktion: den Knoten Stopfkippen kaufen.', done: (S) => sortUnlocked(S, 'stopf') },
  { id: 'stopfer', t: 'Stopfmaschine kaufen', h: 'Am Gaming-PC im Shop, Bereich Werkzeug: die Stopfmaschine kaufen.', done: (S) => tool(S, 'stopfer') },
  { id: 'huelsen', t: 'Hülsen bei Kalle holen', h: 'Raus zu Kalle in den Hinterhof und Hülsen kaufen. Zu Hause in die Kiste räumen.', done: (S) => matOf(S, 'huelsen') > 0 || made(S, 'stopf') > 0 },
  { id: 'stopf10', t: '10 Stopfkippen machen', h: 'Am Tisch hinsetzen, Taste 2 wählt die Stopfkippe, dann klicken.', done: (S) => made(S, 'stopf') >= 10 },
  { id: 'aromaFrei', t: 'Aromakippen freischalten', h: 'Handy (T), Boss-Plan, Ast Produktion: den Knoten Aromakippen kaufen.', done: (S) => sortUnlocked(S, 'aroma') },
  { id: 'kapsel', t: 'Kapselzange kaufen und Kapseln holen', h: 'Am PC die Kapselzange kaufen, dann bei Kalle Aromakapseln holen.', done: (S) => tool(S, 'kapsel') && (matOf(S, 'kapseln') > 0 || made(S, 'aroma') > 0) },
  { id: 'aroma10', t: '10 Aromakippen machen', h: 'Am Tisch Taste 3 wählt die Aromakippe, dann klicken.', done: (S) => made(S, 'aroma') >= 10 },
  { id: 'zigFrei', t: 'Zigarillos freischalten', h: 'Handy (T), Boss-Plan, Ast Produktion: den Knoten Zigarillos kaufen.', done: (S) => sortUnlocked(S, 'zigarillo') },
  { id: 'wickel', t: 'Wickelbrett kaufen und Deckblätter holen', h: 'Am PC das Wickelbrett kaufen, dann bei Kalle Deckblätter holen.', done: (S) => tool(S, 'wickel') && (matOf(S, 'deckblatt') > 0 || made(S, 'zigarillo') > 0) },
  { id: 'zig5', t: '5 Zigarillos rollen', h: 'Am Tisch Taste 4 wählt den Zigarillo, dann klicken.', done: (S) => made(S, 'zigarillo') >= 5 },
  { id: 'jointFrei', t: 'Joints freischalten', h: 'Handy (T), Boss-Plan, Ast Produktion: den Knoten Joints kaufen.', done: (S) => sortUnlocked(S, 'joint') },
  { id: 'grinder', t: 'Grinder kaufen, Gras und Tips holen', h: 'Am PC den Grinder kaufen, dann bei Kalle Gras und Tips holen.', done: (S) => tool(S, 'grinder') && (matOf(S, 'gras') > 0 || made(S, 'joint') > 0) },
  { id: 'joint5', t: '5 Joints drehen', h: 'Am Tisch Taste 5 wählt den Joint. Er riecht, also bei Kontrollen gut verstecken.', done: (S) => made(S, 'joint') >= 5 },
  { id: 'falltuer', t: 'Die Falltür freischalten', h: 'Handy (T), Boss-Plan, Ast Tarnung: die Falltür kaufen. Sie liegt unter dem Teppich am Tisch.', done: (S) => bunkerOpen(S) },
  { id: 'maschine', t: 'Erste Bunker-Maschine kaufen', h: 'Am Gaming-PC im Shop, Bereich Bunker-Maschinen: deine erste Maschine kaufen.', done: (S) => !!(S.bunker && S.bunker.units && S.bunker.units.length) },
  { id: 'auftrag', t: 'Ersten Auftrag liefern', h: 'Unten im Bunker am PC einen Auftrag annehmen. Geliefert wird mit dem Lastwagen in der Tiefgarage.', done: (S) => !!(S.bunker && S.bunker.stats && S.bunker.stats.liefer > 0) },
  // seit 2026-11-21: Vapes (Teil 2)
  { id: 'vapeFrei', t: 'Vapes freischalten', h: 'Handy (T), Boss-Plan, Ast Produktion: den Knoten Vapes kaufen.', done: (S) => sortUnlocked(S, 'vmango') },
  { id: 'erwin', t: 'Bei Elektro-Erwin einkaufen', h: 'Raus und über die Straße zu Elektro-Erwin. Er hat von 8 bis 20 Uhr offen.', done: (S) => !!(S.flags && S.flags.erwin) },
  { id: 'werkbank', t: 'Werkbank kaufen', h: 'Am Gaming-PC im Shop, Bereich Werkzeug: die Werkbank kaufen. Sie steht dann im Bunker.', done: (S) => tool(S, 'werkbank') },
  { id: 'teile', t: 'Teile in die Teilekiste räumen', h: 'Im Bunker an der Werkbank die Teilekiste anschauen, E drücken und die Teile rüberziehen.', done: (S) => !!(S.flags && S.flags.teileEin) },
  { id: 'vape1', t: 'Erste Vape bauen', h: 'An der Werkbank: Liquid mischen, drei Lötpunkte treffen, dann die Teile ins Gehäuse ziehen.', done: (S) => ((S.stats && S.stats.vapes) || 0) >= 1 },
  { id: 'vape10', t: '10 Vapes bauen', h: 'Weiter Vapes bauen. Kunden zahlen 15 bis 25 Euro pro Stück.', done: (S) => ((S.stats && S.stats.vapes) || 0) >= 10 },
  { id: 'mega', t: 'Den Mega-Auftrag schaffen', h: 'Am Bunker-PC wartet am Ende der Mega-Auftrag: die ganze Welt beliefern.', done: (S) => !!(S.bunker && S.bunker.mega) },
  { id: 'finale', t: 'Zigarettenboss werden', h: 'Im Boss-Plan ganz außen wartet die Riesenzigarette. Kauf sie und werde der Boss.', done: (S) => !!S.boss },
];
export const QUEST_REWARD = 2;
// Neue Aufgaben, die gerade erledigt sind (noch nicht belohnt): belohnen und merken. Gibt die IDs zurück.
export function checkQuests(S) { S.quests = S.quests || {}; const got = []; for (const q of QUESTS) if (!S.quests[q.id] && q.done(S)) { S.quests[q.id] = true; got.push({ q, r: gainResp(S, QUEST_REWARD) }); } return got; }
// Alter Spielstand von vor der Aufgabenliste: schon Geschafftes still abhaken (keine Belohnungsflut beim ersten Laden)
export function primeQuests(S) { S.quests = S.quests || {}; if (Object.keys(S.quests).length) return 0; let n = 0; for (const q of QUESTS) if (q.done(S)) { S.quests[q.id] = true; n++; } return n; }
export const openQuests = (S, n = 3) => QUESTS.filter((q) => !(S.quests && S.quests[q.id])).slice(0, n);

export function createQuests({ root, getS, onDone }) {
  const box = document.createElement('div'); box.className = 'lw-quests lw-char hidden';
  box.innerHTML = '<div class="lw-qlogo" aria-hidden="true"><svg viewBox="0 0 64 64"><path class="lw-qrauch" d="M45 15c-5-4 3-7-1-11M51 18c-4-5 4-8 0-13" fill="none" stroke="#c9c2b8" stroke-width="2.4" stroke-linecap="round"/><g transform="rotate(-40 32 32)"><rect x="5" y="27" width="42" height="10" rx="2" fill="#f7f3ea"/><rect x="5" y="27" width="13" height="10" rx="2" fill="#e09a3c"/><path d="M8 29h2M12 31h2M9 34h2" stroke="#b56a1c" stroke-width="1.4"/><rect x="47" y="27" width="6" height="10" rx="2" fill="#5a2a14"/><rect class="lw-qglut" x="51" y="27" width="5" height="10" rx="2.5" fill="#ff5a16"/></g></svg></div><div class="lw-qtext"><div class="lw-qhead"><b>AUFGABE</b><span class="lw-qcount"></span></div><ol class="lw-qlist"></ol></div>';
  root.append(box);
  const list = box.querySelector('.lw-qlist'); const count = box.querySelector('.lw-qcount'); let key = ''; let t = 0; let on = false; const leaving = new Map();
  function render(S) {
    const open = leaving.size ? [] : openQuests(S, 1); // eine nach der anderen: die nächste erst, wenn die erledigte weg ist const k = open.map((q) => q.id).join(','); if (k === key && !leaving.size) return; key = k;
    for (const li of [...list.children]) if (!leaving.has(li.dataset.id)) li.remove();
    for (const q of open) { const li = document.createElement('li'); li.dataset.id = q.id; li.className = 'neu'; const b = document.createElement('b'); b.textContent = q.t; const s = document.createElement('small'); s.textContent = q.h; li.append(document.createElement('i'), b, s); list.append(li); }
    const all = Object.keys(S.quests || {}).length; count.textContent = `${Math.min(all, QUESTS.length)}/${QUESTS.length}`;
  }
  function done(got, S) { for (const { q, r } of got) { const li = list.querySelector(`li[data-id="${q.id}"]`); if (li) { li.classList.add('done'); leaving.set(q.id, li); setTimeout(() => { li.remove(); leaving.delete(q.id); key = ''; const S2 = getS(); if (S2) render(S2); }, 1500); } if (onDone) onDone(q, r); } }
  return {
    el: box, get on() { return on; }, show(v = true) { if (v === on) return; on = v; box.classList.toggle('hidden', !on); if (on) { key = ''; const S = getS(); if (S) render(S); } },
    tick(dt) { t -= dt; if (t > 0) return; t = 0.5; const S = getS(); if (!S) return; const got = checkQuests(S); if (got.length) done(got, S); if (on) render(S); },
    reset() { key = ''; leaving.clear(); list.textContent = ''; t = 0; },
  };
}
