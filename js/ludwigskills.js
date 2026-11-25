// Theos Seitenscheidel - Ludwig: der Boss-Plan (Skilltree) auf Ludwigs Handy. Sechs Äste, 75 Knoten, bezahlt mit Respekt.
// Nur Daten und Regeln, keine Grafik (läuft auch in node --test). Jeder Knoten hat Stufen (max), Kosten je Stufe, Voraussetzungen
// (need = alle davon, any = mindestens einer) und Wirkungen je Stufe (fx). fxOf(S) zählt alle gekauften Stufen zusammen.
// Lage auf der Karte: Ast-Richtung (ang, Grad), Tiefe d (Abstand von der Mitte) und Seitenversatz o.
import { costMul } from './ludwigmp.js'; // Balance nach Spielerzahl (2026-11-21)

export const BRANCHES = {
  prod: { name: 'Produktion', col: '#ff7a1a', ang: -90, text: 'Von den Händen zur Fabrik' },
  vert: { name: 'Verteilung', col: '#5ad0ff', ang: -30, text: 'Mehr Kunden, Boten, Lieferwagen' },
  handel: { name: 'Handel', col: '#ffcf5a', ang: 30, text: 'Schwarzmarkt und Nachschub' },
  ruf: { name: 'Ruf', col: '#ff8ad8', ang: 90, text: 'Respekt auf dem Schulhof und in der Stadt' },
  tarn: { name: 'Tarnung', col: '#8dffb8', ang: 150, text: 'Eltern austricksen' },
  chaos: { name: 'Chaos', col: '#b07aff', ang: 210, text: 'Gags und große Sprünge' },
};
export const START_ID = 'start';
export const START_NODE = { id: START_ID, name: 'Ludwig', icon: '🧑', text: 'Hier fängt alles an. Respekt bekommst du von zufriedenen Kunden, Boten und überstandenen Elternkontrollen.' };

// Alle Kosten mal COST_MUL: seit 2026-11-19 viermal so teuer, das Skillen ging viel zu schnell
export const COST_MUL = 4;
const N = (id, b, d, o, name, icon, max, cost, fx, need, text, any) => ({ id, b, d, o, name, icon, max, cost: cost.map((c) => c * COST_MUL), fx, need: need || [], any: any || [], text });
export const NODES = [
  // ---- Produktion: Hände, dann Maschinen, am Ende die Riesenpresse
  N('p_finger', 'prod', 1, 0, 'Flinke Finger', '✋', 3, [1, 4, 10], { roll: 0.15 }, [START_ID], 'Ludwig übt jeden Abend unter der Bettdecke.'),
  N('p_ruhig', 'prod', 2, -1, 'Ruhige Hände', '🤲', 3, [4, 10, 24], { tabakSave: 0.08 }, ['p_finger'], 'Kein Krümel geht mehr daneben.'),
  N('p_doppel', 'prod', 2, 1, 'Doppelte Ausbeute', '✌️', 3, [6, 15, 35], { dbl: 0.06 }, ['p_finger'], 'Manchmal reicht ein Blättchen für zwei.'),
  N('p_kumpel', 'prod', 3, -1, 'Fingerübungen', '🤏', 3, [12, 28, 60], { roll: 0.08 }, ['p_ruhig'], 'Ludwig übt jeden Abend. Die Kumpels helfen nicht mit, das macht er allein.'),
  N('p_trocken', 'prod', 3, 1, 'Trockenregal', '🧺', 2, [15, 40], { roll: 0.1, tabakSave: 0.05 }, ['p_doppel'], 'Trockener Tabak dreht sich leichter.'),
  N('p_wickel', 'prod', 4, 0, 'Wickelmaschine', '⚙️', 3, [30, 70, 150], { auto: 4 }, ['t_falltuer'], 'Die erste Maschine im Bunker. Muss bedient werden: E an der Maschine oder ein Roboter.', ['p_kumpel', 'p_trocken']),
  N('p_klopf', 'prod', 5, -1, 'Klopfautomat', '🔨', 3, [60, 130, 260], { auto: 6 }, ['p_wickel'], 'Klopft schneller als jeder Mensch. Muss bedient werden.'),
  N('p_band', 'prod', 5, 1, 'Fließband', '🏭', 3, [80, 170, 340], { auto: 10 }, ['p_wickel'], 'Quer durch den Bunker. Läuft von selbst.'),
  N('p_wand', 'prod', 6, -1, 'Wandfabrik', '🧱', 2, [250, 500], { auto: 25 }, ['p_klopf', 't_geheim'], 'Eine Fabrik in der Bunkerwand. Braucht die Geheimtür aus der Tarnung.'),
  N('p_plant', 'prod', 6, 1, 'Tabakplantage', '🌱', 3, [180, 360, 700], { plant: 6 }, ['p_band'], 'Unter Pflanzenlampen im Bunker. Mamas Tomaten bleiben verschont.'),
  N('p_keller', 'prod', 7, -1, 'Kellerhalle', '🏚️', 2, [600, 1200], { auto: 60 }, ['p_wand'], 'Eine ganze Halle voller Maschinen, hinten im Bunker.'),
  N('p_247', 'prod', 7, 0, '24/7-Betrieb', '🌙', 1, [900], { autoMult: 0.5 }, [], 'Die Maschinen schlafen nie. Ludwig schon.', ['p_wand', 'p_plant']),
  N('p_genie', 'prod', 7, 1, 'Tabak-Genie', '🧠', 3, [300, 600, 1200], { price: 0.06 }, ['p_plant'], 'Beste Qualität der Stadt. Das spricht sich rum.'),
  N('p_presse', 'prod', 8, 0, 'Riesenpresse', '🗜️', 1, [2000], { auto: 150 }, ['p_247', 'p_keller'], 'Presst Kippen im Sekundentakt. Und für das Finale etwas sehr Großes.'),
  // seit 2026-11-20: neue Sorten (Werkzeug danach mit Geld im Shop am PC, Material bei Kalle)
  N('s_stopf', 'prod', 2, 0, 'Stopfkippen', '🎯', 1, [10], { sorte: 1 }, ['p_finger'], 'Hülsen mit Filter stopfen statt drehen: schneller und sieht aus wie gekauft. Die Stopfmaschine gibt es im Shop am PC, Hülsen bei Kalle.'),
  N('s_aroma', 'prod', 3, 0, 'Aromakippen', '🍒', 1, [15], { sorte: 1 }, ['s_stopf'], 'Kirsche, Menthol, Vanille: eine Kapsel im Tabak. Manche Kunden wollen nur noch die. Kapseln hat Kalle, die Kapselzange der Shop.'),
  N('s_zigarillo', 'prod', 4, -2, 'Zigarillos', '🟤', 1, [20], { sorte: 1 }, ['s_aroma'], 'Für die feinen Herrschaften: Deckblatt, Einlage, Bauchbinde. Teuer und gefragt. Deckblätter bei Kalle, Wickelbrett im Shop.'),
  N('s_joint', 'prod', 5, -2, 'Joints', '🌿', 1, [25], { sorte: 1 }, ['s_zigarillo'], 'Kalle hat da noch Spezialware. Bringt richtig Geld, riecht aber: Mama sucht gründlicher, die Polizei verlangt dreifache Strafe.'),
  N('s_vape', 'prod', 6, -2, 'Vapes', '💨', 1, [40], { sorte: 1 }, ['s_joint'], 'Elektro-Erwin gegenüber verkauft die Teile, im Bunker baust du die Vapes an einer Werkbank zusammen. Kunden zahlen 15 bis 25 Euro.'), // seit 2026-11-21 (Teil 2)
  // ---- Verteilung: Schlange am Fenster, dann Boten bis zum Weltvertrieb
  N('v_schlange', 'vert', 1, 0, 'Größere Schlange', '🚶', 3, [2, 6, 14], { queue: 1 }, [START_ID], 'Mehr Leute dürfen vor dem Fenster warten.'),
  N('v_geduld', 'vert', 2, -1, 'Geduldige Kunden', '⏳', 3, [4, 10, 22], { pat: 0.2 }, ['v_schlange'], 'Sie warten länger, bevor sie gehen.'),
  N('v_stamm', 'vert', 2, 1, 'Stammkundenkarte', '💳', 3, [5, 12, 26], { gap: 0.12 }, ['v_schlange'], 'Zehn Kippen, die elfte gibt es gratis. Fast.'),
  N('v_bruno', 'vert', 3, -1, 'Bruno-Rabatt', '🤝', 1, [15], { want: 1 }, ['v_geduld'], 'Bruno erzählt allen, dass Ludwig der Beste ist. Sie wollen mehr.'),
  N('v_karte', 'vert', 3, 1, 'Karte freischalten', '🗺️', 1, [20], { courier: 1 }, ['v_stamm'], 'Ludwig plant Lieferungen in der ganzen Siedlung.'),
  N('v_boten', 'vert', 4, 0, 'Boten einstellen', '🧒', 3, [40, 90, 180], { courier: 2 }, ['v_karte'], 'Kinder aus der Nachbarschaft liefern. Bezahlt in Gummibärchen.'),
  N('v_rad', 'vert', 5, -1, 'Botenfahrräder', '🚲', 2, [90, 200], { courier: 3 }, ['v_boten'], 'Mit Klingel. Diskret.'),
  N('v_roller', 'vert', 5, 1, 'Rollerkurier', '🛵', 2, [120, 260], { courier: 5 }, ['v_boten'], 'Nachbars Roller. Er weiß nichts davon.'),
  N('v_route', 'vert', 6, -1, 'Routenplaner', '🧭', 2, [180, 380], { courierPrice: 0.1 }, ['v_rad'], 'Kürzeste Wege, beste Kunden.'),
  N('v_wagen', 'vert', 6, 1, 'Lieferwagen', '🚐', 2, [300, 650], { courier: 12 }, ['v_roller'], 'Auf dem Wagen steht „Bäckerei“.'),
  N('v_nacht', 'vert', 7, -1, 'Nachtlieferung', '🌃', 1, [500], { courierMult: 0.3 }, ['v_route'], 'Wenn alle schlafen, wird geliefert.'),
  N('v_express', 'vert', 7, 1, 'Expressdienst', '⚡', 2, [450, 900], { courierPrice: 0.15 }, ['v_wagen'], 'In zehn Minuten da oder gratis.'),
  N('v_flotte', 'vert', 8, -1, 'Flotte', '🚚', 2, [900, 1800], { courier: 30 }, ['v_wagen'], 'Zwanzig Lieferwagen. Alle mit „Bäckerei“.'),
  N('v_netz', 'vert', 8, 1, 'Handy-Netz', '📱', 1, [800], { queue: 1, gap: 0.15 }, ['v_express'], 'Bestellen per Nachricht. Mama denkt, Ludwig chattet.'),
  N('v_welt', 'vert', 9, 0, 'Weltvertrieb', '🌍', 1, [2500], { courier: 80 }, ['v_flotte', 'v_netz'], 'Ludwigs Kippen gibt es jetzt überall.'),
  // ---- Handel: Kalle, Nachschub, eigene Marke, Konzern
  N('h_kiosk', 'handel', 1, 0, 'Bessere Preise bei Kalle', '🏪', 3, [2, 6, 14], { kioskDisc: 0.08 }, [START_ID], 'Kalle mag Ludwig. Ein bisschen.'),
  N('h_stamm', 'handel', 2, -1, 'Händler-Stammkunde', '🧔', 2, [6, 16], { pack: 0.15 }, ['h_kiosk'], 'Kalle legt immer etwas mehr in die Tüte.'),
  N('h_liefer', 'handel', 2, 0, 'Lieferdienst', '🛵', 1, [10], { liefer: 1 }, ['h_kiosk'], 'Kalles Neffe bringt Tabak und Blättchen ans Fenster. K bestellt wieder von zu Hause.'),
  N('h_feilsch', 'handel', 2, 1, 'Feilsch-Profi', '🗣️', 3, [5, 12, 28], { price: 0.05 }, ['h_kiosk'], 'Ludwig redet, bis sie mehr zahlen.'),
  N('h_menge', 'handel', 3, -1, 'Mengenrabatt', '📦', 2, [20, 45], { pack: 0.2 }, ['h_stamm'], 'Großpackungen zum gleichen Preis.'),
  N('h_park', 'handel', 3, 1, 'Parkplatz-Händler', '🅿️', 1, [25], { supply: 3 }, ['h_feilsch'], 'Liefert Blättchen und Tabak von selbst. Fragt nichts.'),
  N('h_druck', 'handel', 4, -1, 'Blättchen-Druckerei', '🖨️', 2, [60, 140], { papierAuto: 8 }, ['h_menge', 't_falltuer'], 'Druckt Blättchen unten im Bunker. Perfekt mit der Tabakplantage.'),
  N('h_unter', 'handel', 4, 1, 'Unterführungs-Händler', '🚇', 2, [70, 150], { supply: 6 }, ['h_park'], 'Noch mehr Nachschub, noch weniger Fragen.'),
  N('h_firma', 'handel', 5, 0, 'Tabakfirma-Kontakt', '🏢', 2, [200, 450], { supply: 15 }, [], 'Ein Anzugträger ruft an. Er hat Großes vor.', ['h_druck', 'h_unter']),
  N('h_gross', 'handel', 6, -1, 'Großeinkauf', '🛒', 1, [250], { kioskDisc: 0.15, pack: 0.25 }, ['h_firma'], 'Kalle muss anbauen.'),
  N('h_schwank', 'handel', 6, 1, 'Preisschwankungen nutzen', '📈', 2, [300, 600], { price: 0.08, courierPrice: 0.08 }, ['h_firma'], 'Billig kaufen, teuer verkaufen. Wie an der Börse.'),
  N('h_marke', 'handel', 7, 0, 'Eigene Marke', '🏷️', 2, [700, 1400], { price: 0.15, resp: 0.1 }, ['h_gross', 'h_schwank'], 'Logo auf der Packung: ein Junge mit Kippe und Sonnenbrille.'),
  N('h_konzern', 'handel', 8, 0, 'Konzern-Aufkauf', '🏦', 1, [2200], { supply: 60, price: 0.2 }, ['h_marke'], 'Ludwig kauft eine Tabakfirma. Mit Taschengeld.'),
  // ---- Ruf: Respekt, mehr Kunden, höhere Preise
  N('r_mund', 'ruf', 1, 0, 'Mundpropaganda', '🗨️', 3, [2, 6, 14], { resp: 0.15 }, [START_ID], 'Jeder erzählt es jedem.'),
  N('r_legende', 'ruf', 2, -1, 'Schulhof-Legende', '🏫', 3, [6, 15, 32], { gap: 0.1 }, ['r_mund'], 'In der großen Pause redet man nur über Ludwig.'),
  N('r_verrat', 'ruf', 2, 1, 'Kein Verrat', '🤐', 2, [8, 20], { search: 0.1 }, ['r_mund'], 'Keiner petzt. Nie.'),
  N('r_geruecht', 'ruf', 3, 0, 'Stadt-Gerücht', '🌆', 2, [25, 60], { resp: 0.2 }, [], 'Die ganze Stadt flüstert.', ['r_legende', 'r_verrat']),
  N('r_zeitung', 'ruf', 4, -1, 'Lokalzeitung', '📰', 1, [80], { gap: 0.15, resp: 0.1 }, ['r_geruecht'], 'Schlagzeile: „Wer verkauft hier Kippen?“ Werbung gratis.'),
  N('r_rivale', 'ruf', 4, 1, 'Gegenspieler-Respekt', '🥊', 2, [90, 200], { price: 0.06 }, ['r_geruecht'], 'Sogar die Konkurrenz zieht den Hut.'),
  N('r_presse', 'ruf', 5, 0, 'Pressekonferenz', '🎤', 1, [260], { resp: 0.3 }, [], 'Mit Sonnenbrille und Maske. Niemand erkennt ihn.', ['r_zeitung', 'r_rivale']),
  N('r_ruhm', 'ruf', 6, 0, 'Berühmtheit', '🌟', 2, [600, 1200], { want: 1, price: 0.1 }, ['r_presse'], 'Autogramme auf Zigarettenpackungen.'),
  N('r_aura', 'ruf', 7, 0, 'Boss-Aura', '👑', 1, [1800], { all: 0.25 }, ['r_ruhm'], 'Wenn Ludwig den Raum betritt, wird es still.'),
  // ---- Tarnung: Eltern austricksen
  N('t_schnell', 'tarn', 1, 0, 'Schnelles Verstecken', '🙈', 3, [2, 5, 12], { warn: 2 }, [START_ID], 'Geübt ist geübt.'),
  N('t_spray', 'tarn', 2, -1, 'Geruchsspray', '🧴', 3, [5, 12, 25], { search: 0.15 }, ['t_schnell'], 'Riecht nach Frühlingswiese. Und nicht nach Tabak.'),
  N('t_boden', 'tarn', 2, 1, 'Doppelter Boden', '🗃️', 3, [6, 14, 30], { take: 0.15 }, ['t_schnell'], 'Unter dem Boden der Box ist noch ein Boden.'),
  N('t_kerzen', 'tarn', 3, -1, 'Duftkerzen', '🕯️', 2, [15, 35], { ctrlGap: 0.15 }, ['t_spray'], 'Mama findet das Zimmer gemütlich und bleibt öfter weg.'),
  N('t_alibi', 'tarn', 3, 1, 'Alibi „Hausaufgaben“', '📚', 2, [18, 40], { arrest: 0.25 }, ['t_boden'], 'Ein aufgeschlagenes Mathebuch wirkt Wunder.'),
  N('t_falltuer', 'tarn', 4, 0, 'Falltür', '🕳️', 1, [40], { bunker: 1 }, [], 'Unter dem Teppich neben dem Tisch geht es nach unten: ein riesiger alter Bunker, verbunden mit der Tiefgarage. Dort baust du Maschinen auf und belieferst Läden.', ['t_kerzen', 't_alibi']),
  N('t_luft', 'tarn', 4, -1, 'Lüftungsschacht', '🌀', 2, [40, 90], { ctrlGap: 0.15 }, ['t_kerzen'], 'Der Geruch zieht zum Nachbarn ab.'),
  N('t_daempf', 'tarn', 4, 1, 'Lärmdämpfung', '🔇', 2, [45, 95], { search: 0.15 }, ['t_alibi'], 'Eierkartons an der Wand. Klopfen hört keiner.'),
  N('t_geheim', 'tarn', 5, 0, 'Geheimtür', '🚪', 1, [120], { take: 0.2, search: 0.1 }, [], 'Hinter dem Poster geht es weiter.', ['t_luft', 't_daempf']),
  N('t_zeugnis', 'tarn', 6, -1, 'Fake-Zeugnis', '📄', 2, [180, 400], { ctrlGap: 0.2 }, ['t_geheim'], 'Lauter Einsen. Die Eltern sind stolz und lassen ihn in Ruhe.'),
  N('t_wanze', 'tarn', 6, 1, 'Wanzen-Detektor', '📡', 2, [200, 420], { warn: 4 }, ['t_geheim'], 'Piept, wenn jemand die Treppe hochkommt.'),
  N('t_oma', 'tarn', 7, -1, 'Bestechung (Oma)', '👵', 2, [350, 700], { skip: 0.12 }, ['t_zeugnis'], 'Oma bekommt Taschengeld und hält Mama am Telefon.'),
  N('t_tv', 'tarn', 7, 1, 'Fernsehabend', '📺', 2, [380, 760], { arrest: 0.25, ctrlGap: 0.15 }, ['t_wanze'], 'Ludwig schenkt den Eltern eine Serien-Box.'),
  N('t_sohn', 'tarn', 8, 0, 'Perfekter Sohn', '😇', 1, [1500], { skip: 0.25, take: 0.3 }, ['t_oma', 't_tv'], 'Die Eltern zeigen Ludwig allen Nachbarn als Vorbild.'),
  // ---- Chaos: Bildschirmzeit, Gags, Roboter und das Finale
  N('c_energy', 'chaos', 1, 0, 'Energydrink-Rausch', '🥤', 3, [3, 8, 18], { roll: 0.12 }, [START_ID], 'Drei Dosen, und Ludwig dreht schneller.'),
  N('c_papa', 'chaos', 2, -1, 'Papa-Handy-Trick', '📲', 3, [5, 14, 30], { screen: 30 }, ['c_energy'], 'Papas Handy hat kein Limit. Ludwig kennt den Code.'),
  N('c_hack', 'chaos', 2, 1, 'Computer-Hack', '💻', 2, [10, 30], { screenRegen: 0.5 }, ['c_energy'], 'Ludwig dreht die Uhr der Bildschirmzeit vor.'),
  N('c_backen', 'chaos', 3, -1, 'Mamas Backwaren', '🧁', 2, [20, 45], { arrest: 0.25 }, ['c_papa'], 'Ludwig lobt Mamas Kuchen. Hausarrest wird kürzer.'),
  N('c_zeitlupe', 'chaos', 3, 1, 'Zeitlupe bei Kontrollen', '🐢', 2, [25, 55], { warn: 3 }, ['c_hack'], 'Mama läuft die Treppe irgendwie langsamer hoch.'),
  N('c_labor', 'chaos', 4, 0, 'Geheimlabor', '🧪', 2, [80, 180], { autoMult: 0.25 }, ['t_falltuer'], 'Eine Ecke im Bunker mit Chemiebaukasten. Ludwig tunt seine Maschinen.', ['c_backen', 'c_zeitlupe']),
  N('c_robo', 'chaos', 5, -1, 'Roboter-Ludwig', '🤖', 3, [150, 300, 600], { robo: 1 }, ['c_labor'], 'Ein Roboter bedient im Bunker eine Maschine, die sonst jemand bedienen müsste.'),
  N('c_double', 'chaos', 5, 1, 'Doppelgänger-Trick', '👯', 1, [400], { skip: 0.15 }, ['c_labor'], 'Eine Puppe sitzt am Schreibtisch und macht Hausaufgaben.'),
  N('c_rakete', 'chaos', 6, 0, 'Rakete im Keller', '🚀', 1, [900], { resp: 0.5 }, [], 'Steht im Bunker. Niemand weiß, wofür. Alle reden darüber.', ['c_robo', 'c_double']),
  N('c_finale', 'chaos', 7, 0, 'Riesenzigarette', '🚬', 1, [3000], { final: 1 }, ['c_rakete', 'p_presse', 'v_welt', 't_sohn', 'h_konzern', 'r_aura'], 'Das Finale: die größte Kippe der Welt. Braucht das Ende jedes Astes und den erledigten Mega-Auftrag aus dem Bunker.'),
];
export const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]));
NODE.c_finale.flag = 'mega'; // das Finale braucht außerdem den erledigten Mega-Auftrag im Bunker
NODE.p_wickel.hand = true; NODE.p_klopf.hand = true; // Handmaschinen: laufen nur, wenn jemand sie bedient
export const nodeName = (id) => (id === START_ID ? START_NODE.name : NODE[id] ? NODE[id].name : id);

// Lage auf der Karte in Pixeln, Mitte = Ludwig
export const SLOT = 150; export const SIDE = 92;
export function nodePos(n) {
  if (!n || n.id === START_ID) return { x: 0, y: 0 }; const a = BRANCHES[n.b].ang * Math.PI / 180; const dx = Math.cos(a); const dy = Math.sin(a);
  return { x: Math.round(dx * n.d * SLOT - dy * n.o * SIDE), y: Math.round(dy * n.d * SLOT + dx * n.o * SIDE) };
}

export const lvl = (S, id) => { if (id === START_ID) return 1; const n = NODE[id]; if (!n || !S || !S.skills) return 0; return Math.max(0, Math.min(n.max, Math.round(Number(S.skills[id]) || 0))); };
const flagOk = (S, n) => !n.flag || !!(S && S.bunker && S.bunker[n.flag]);
export function unlocked(S, n) { return n.need.every((q) => lvl(S, q) > 0) && (!n.any.length || n.any.some((q) => lvl(S, q) > 0)) && flagOk(S, n); }
export function missingNames(S, n) { const m = n.need.filter((q) => lvl(S, q) <= 0).map(nodeName); if (n.any.length && !n.any.some((q) => lvl(S, q) > 0)) m.push(n.any.map(nodeName).join(' oder ')); if (!flagOk(S, n)) m.push('Mega-Auftrag „Beliefere die ganze Welt“'); return m; }
export function nextCost(S, id) { const n = NODE[id]; if (!n) return null; const l = lvl(S, id); return l >= n.max ? null : Math.round(n.cost[Math.min(l, n.cost.length - 1)] * costMul(S)); } // Mehrspieler: Boss-Plan teurer
export function canSkill(S, id) {
  const n = NODE[id]; if (!n) return { ok: false, why: 'gibts' }; const c = nextCost(S, id); if (c === null) return { ok: false, why: 'max' };
  if (!unlocked(S, n)) return { ok: false, why: 'need', missing: missingNames(S, n), cost: c }; const R = S.respekt || 0; if (R < c) return { ok: false, why: 'respekt', fehlt: c - R, cost: c }; return { ok: true, cost: c };
}
export function buySkill(S, id) {
  const r = canSkill(S, id); if (!r.ok) return r; const n = NODE[id]; S.respekt -= r.cost; S.skills[id] = lvl(S, id) + 1; S.skillRev = (S.skillRev || 0) + 1;
  if (n.fx.screen && S.screen) S.screen.left += n.fx.screen; /* mehr Bildschirmzeit gibt es sofort dazu */ if (n.fx.final) S.boss = true;
  return { ok: true, id, level: S.skills[id], cost: r.cost, node: n, final: !!n.fx.final };
}

// Alle Wirkungen zusammengezählt. Obergrenzen, damit nichts kippt. "all" (Boss-Aura) macht die Boni stärker.
export const FX_KEYS = ['bunker', 'robo', 'roll', 'dbl', 'tabakSave', 'kumpel', 'auto', 'autoMult', 'plant', 'papierAuto', 'supply', 'queue', 'pat', 'gap', 'want', 'price', 'courier', 'courierMult', 'courierPrice', 'warn', 'ctrlGap', 'search', 'take', 'arrest', 'skip', 'kioskDisc', 'pack', 'resp', 'all', 'screen', 'screenRegen', 'final', 'liefer', 'sorte'];
const CAP = { dbl: 0.6, tabakSave: 0.6, gap: 0.7, search: 0.9, take: 0.9, arrest: 0.9, skip: 0.6, kioskDisc: 0.6 };
const BOOST = ['roll', 'auto', 'courier', 'price', 'resp', 'plant', 'papierAuto', 'supply'];
const CACHE = new WeakMap();
export function fxOf(S) {
  const rev = (S && S.skillRev) || 0; const c = S && typeof S === 'object' ? CACHE.get(S) : null; if (c && c.rev === rev && c.sk === S.skills) return c.fx;
  const fx = {}; for (const k of FX_KEYS) fx[k] = 0;
  if (S && S.skills) for (const n of NODES) { const l = lvl(S, n.id); if (l > 0) for (const [k, v] of Object.entries(n.fx)) fx[k] += v * l; }
  if (fx.all > 0) for (const k of BOOST) fx[k] *= 1 + fx.all;
  for (const [k, m] of Object.entries(CAP)) fx[k] = Math.min(m, fx[k]);
  if (S && typeof S === 'object') CACHE.set(S, { rev, sk: S.skills, fx }); return fx;
}

// Text für die Wirkung (Detailkarte im Boss-Plan)
const pct = (v) => `${Math.round(v * 100)} %`; const num = (v) => (Math.round(v * 10) / 10).toLocaleString('de-DE');
export const FX_TEXT = {
  roll: (v) => `Drehen ${pct(v)} schneller`, dbl: (v) => `${pct(v)} Chance auf eine Kippe extra`, tabakSave: (v) => `${pct(v)} Chance, keinen Tabak zu verbrauchen`, kumpel: (v) => `Kumpels drehen ${pct(v)} schneller`,
  auto: (v) => `Bunker-Maschine: ${num(v)} Kippen pro Minute`, bunker: () => 'Öffnet die Falltür zum Bunker', robo: (v) => `${num(v)} Roboter bedient eine Handmaschine`, autoMult: (v) => `Maschinen ${pct(v)} schneller`, plant: (v) => `+${num(v)} Tabak pro Minute`, papierAuto: (v) => `+${num(v)} Blättchen pro Minute`, supply: (v) => `+${num(v)} Blättchen und Tabak pro Minute`,
  queue: (v) => `+${v} Platz in der Schlange am Fenster`, pat: (v) => `Kunden warten ${pct(v)} länger`, gap: (v) => `${pct(v)} kürzere Pausen zwischen Kunden`, want: (v) => `Kunden wollen bis zu ${v} mehr`, price: (v) => `Kunden zahlen ${pct(v)} mehr`,
  courier: (v) => `Boten verkaufen ${num(v)} Kippen pro Minute`, courierMult: (v) => `Boten ${pct(v)} schneller`, courierPrice: (v) => `Boten verlangen ${pct(v)} mehr`,
  warn: (v) => `${num(v)} s mehr Zeit zum Verstecken`, ctrlGap: (v) => `Eltern kommen ${pct(v)} seltener`, search: (v) => `Mama durchsucht ${pct(v)} seltener ein Versteck`, take: (v) => `${pct(v)} weniger Verlust, wenn sie dich erwischen`, arrest: (v) => `Hausarrest ${pct(v)} kürzer`, skip: (v) => `${pct(v)} Chance, dass eine Kontrolle ausfällt`,
  kioskDisc: (v) => `Kalle ${pct(v)} billiger`, pack: (v) => `${pct(v)} mehr pro Packung bei Kalle`, resp: (v) => `${pct(v)} mehr Respekt`, all: (v) => `Alle Boni ${pct(v)} stärker`,
  liefer: () => 'K bestellt bei Kalle, sein Neffe bringt es ans Fenster', sorte: () => 'Neue Sorte zum Herstellen (Werkzeug im Shop am PC)', screen: (v) => `+${num(v)} s Bildschirmzeit`, screenRegen: (v) => `Bildschirmzeit kommt ${pct(v)} schneller zurück`, final: () => 'Baut die Riesenzigarette. Das Finale.',
};
export function fxLine(n, levels = 1) { return Object.entries(n.fx).map(([k, v]) => (FX_TEXT[k] ? FX_TEXT[k](v * levels) : k)).join(' · '); }
// Überblick für den Boss-Plan: gekaufte Stufen, bereit (freigeschaltet und bezahlbar)
export function treeStats(S) {
  let own = 0; let levels = 0; let ready = 0; let maxLv = 0;
  for (const n of NODES) { const l = lvl(S, n.id); maxLv += n.max; levels += l; if (l > 0) own++; if (canSkill(S, n.id).ok) ready++; }
  return { own, levels, ready, total: NODES.length, maxLv };
}

// Respekt: Grundwert mal Boni (Ruf-Ast). Bruchteile sammeln sich in S.acc.resp. Gibt die ganzen neuen Punkte zurück.
// (Liegt hier, damit Logik und Bunker sie ohne Kreis-Import nutzen können.)
// RESP_TEMPO: Lennox 2026-11-23, Respekt kam zu langsam: erst 1,75-mal, dann 3-mal so schnell. Ändert nur die Menge, nicht den Spielstand.
export const RESP_TEMPO = 3;
export function gainResp(S, base) {
  if (!(base > 0)) return 0; S.acc.resp += base * RESP_TEMPO * (1 + fxOf(S).resp); const n = Math.floor(S.acc.resp + 1e-9); if (n > 0) { S.acc.resp -= n; S.respekt += n; S.stats.respekt += n; } return n;
}
