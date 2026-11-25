// Theos Seitenscheidel - Parkmodus: die 50 Level. Reine Logik, überall gleich berechnet (nur die Levelnummer geht übers Netz).
// Jedes Level beginnt mit einer echten Musterfahrt durch stepVeh. Hindernisse dürfen nur außerhalb der dabei überstrichenen Fläche stehen. So ist jedes Level beweisbar lösbar, der Test spielt die Fahrt Bild für Bild ab.
import { VEH, PARK_DT, clamp, wrapA, rect, rectHit, vehRects, createVehState, stepVeh, buildGrid, moverRect, inSpot } from './parklogic.js';

export const PARK_COUNT = 50;
const DEG = Math.PI / 180;

// Hindernisse: l Länge, w Breite, h Höhe. boxes: mehrteilige Trefferfläche relativ zur Mitte
export const OBJ = {
  car: { l: 4.5, w: 1.86, h: 1.45 }, suvp: { l: 4.8, w: 2, h: 1.8 }, vanp: { l: 5.6, w: 2.1, h: 2.4 }, wreck: { l: 4.4, w: 1.9, h: 1.3 }, bus: { l: 12, w: 2.55, h: 3.1 }, truckp: { l: 8.6, w: 2.5, h: 3.4 }, trailer: { l: 13, w: 2.5, h: 3.8 }, tanker: { l: 9.5, w: 2.5, h: 3.2 },
  wall: { l: 6, w: 0.4, h: 2.4 }, curb: { l: 6, w: 0.4, h: 0.2 }, house: { l: 9, w: 7, h: 11 }, pillar: { l: 0.8, w: 0.8, h: 2.9 }, hedge: { l: 3, w: 1.1, h: 1.2 }, trolley: { l: 1.8, w: 0.9, h: 1 }, cone: { l: 0.5, w: 0.5, h: 0.75 }, barrier: { l: 2.4, w: 0.5, h: 1 }, bollard: { l: 0.4, w: 0.4, h: 1 },
  container: { l: 12.2, w: 2.45, h: 2.6 }, crate: { l: 1.3, w: 1.3, h: 1.2 }, pallet: { l: 2.4, w: 1.2, h: 1.6 }, pipe: { l: 6, w: 1.3, h: 1.3 }, digger: { l: 7, w: 3, h: 3.3 }, pile: { l: 6, w: 3.4, h: 2.4 }, tires: { l: 1.4, w: 1.4, h: 1.5 }, dock: { l: 7, w: 1.2, h: 3.2 },
  tankp: { l: 8.2, w: 3.6, h: 2.9 }, jeepp: { l: 4.3, w: 1.95, h: 1.9 }, sand: { l: 3, w: 1.1, h: 1.1 }, wire: { l: 4, w: 0.7, h: 1.3 }, bunker: { l: 18, w: 10, h: 4 }, hangar: { l: 34, w: 22, h: 10 }, cessnap: { l: 8.3, w: 11.2, h: 2.7, boxes: [{ c: 0, l: 4.2, w: 0.65 }, { c: 1.4, l: 0.85, w: 5.6 }, { c: -3.4, l: 0.55, w: 1.75 }] },
  jet: { l: 70.6, w: 64.8, h: 19.4, boxes: [{ c: 0, l: 35.3, w: 3.3 }, { c: 3.2, l: 7.5, w: 12 }, { c: -1.8, l: 4, w: 22 }, { c: -5.8, l: 2.5, w: 32.4 }, { c: -31.3, l: 4.2, w: 11 }] }, terminal: { l: 46, w: 18, h: 11 }, bagcart: { l: 3, w: 1.6, h: 1.5 }, tow: { l: 7.4, w: 2.5, h: 2.7 }, press: { l: 7, w: 1.4, h: 2.6 },
};

// Bezirke: Grund, Füllmaterial, Randzaun
export const WORLDS = {
  market: { name: 'Supermarkt', fill: ['car', 'car', 'suvp', 'car', 'vanp', 'car'], row: 'car', bound: 'hedge', gap: 0.5 },
  city: { name: 'Altstadt', fill: ['house'], row: 'car', bound: 'house', gap: 0.05 },
  garage: { name: 'Tiefgarage', fill: ['car', 'pillar', 'car', 'car', 'pillar', 'suvp'], row: 'car', bound: 'wall', gap: 0.4 },
  harbor: { name: 'Hafen', fill: ['container'], row: 'container', bound: 'container', gap: 0.4 },
  site: { name: 'Baustelle', fill: ['pipe', 'barrier', 'digger', 'barrier', 'pipe', 'pallet'], row: 'barrier', bound: 'wall', gap: 0.5 },
  scrap: { name: 'Schrottplatz', fill: ['pile', 'wreck', 'tires', 'wreck', 'pile'], row: 'wreck', bound: 'wall', gap: 0.2 },
  base: { name: 'Militärbasis', fill: ['tankp', 'sand', 'jeepp', 'sand', 'tankp', 'wire'], row: 'tankp', bound: 'wire', gap: 0.5 },
  airport: { name: 'Flughafen', fill: ['bagcart', 'tanker', 'bagcart', 'cessnap'], row: 'cessnap', bound: 'wire', gap: 1 },
};

const v = (n) => VEH[n];
const LV = (name, veh, world, path, o = {}) => ({ name, veh, world, path, ...o });

// path: f12 vor, b12 zurück, l90/r90 Bogen vor, bl90/br90 Bogen zurück (Heck nach links/rechts), s90/S90 auf der Stelle drehen, w3 warten, /R hinter dem Winkel setzt den Radius
// end: row (Autos links und rechts), parallel (längs am Bordstein), dock (Rampe), box (Mauern rundum)
export const CATALOG = [
  // ---- Bezirk 1: Supermarkt und Altstadt
  LV('Der erste Einkauf', 'small', 'market', 'f20 r90/6 f10', { clear: 1.5, blurb: 'Dein Kleinwagen, eine freie Lücke, kein Stress. Nur eines: Nichts berühren.' }),
  LV('Rückwärts zum Sonderangebot', 'small', 'market', 'f26 br90/6 b10', { clear: 1.2, blurb: 'Der Parkplatz ist voll, die Lücke nur rückwärts erreichbar.' }),
  LV('Einkaufswagen-Slalom', 'sedan', 'market', 'f10 l30 f4 r60 f4 l60 f4 r30 f8 r90 f11', { clear: 0.9, fill: ['trolley', 'cone', 'trolley', 'barrier'], blurb: 'Jemand hat die Einkaufswagen einfach stehen lassen. Überall.' }),
  LV('Längs vor der Bäckerei', 'sedan', 'city', 'f22 br42 bl42', { clear: 1, slack: [0.4, 1], end: 'parallel', blurb: 'Der Klassiker aus der Fahrschule. Der Bordstein ist hart, die Nachbarn sind es auch.' }),
  LV('Die enge Gasse', 'sedan', 'city', 'f15 l90 f11 r90 f14 r90 f11', { clear: 0.7, blurb: 'Links Hauswand, rechts Hauswand, ganz hinten eine Lücke.' }),
  LV('Lieferwagen zur Rampe', 'van', 'market', 'f28 bl90/7.5 b13', { clear: 0.9, end: 'dock', blurb: 'Die Milch muss rein. Rückwärts an die Rampe, ohne die Paletten zu küssen.' }),
  LV('Sportwagen im Schritttempo', 'sport', 'city', 'f12 l45 f6 r90 f6 l45 f12 l90 f11', { clear: 0.6, blurb: 'Tief, breit, teuer und in einer Zickzack-Gasse. Viel Spaß.' }),
  LV('Markttag', 'sedan', 'city', 'f40 r90 f11', { clear: 1, movers: [{ at: 13, kind: 'car', n: 2, per: 12 }, { at: 26, kind: 'vanp', n: 1, per: 10, back: true }], blurb: 'Gegenverkehr! Die Marktlieferanten halten für niemanden an.' }),
  LV('Der Linienbus', 'bus', 'city', 'f30 l90 f24 r90 f20 r90 f20', { clear: 0.8, blurb: 'Zwölf Meter Bus, Altstadtkurven und ein Heck, das ausschert.' }),
  LV('Stretch-Limo im Parkhaus', 'limo', 'garage', 'f18 r90 f14 l90 f12 l90 f14 r90 f16 br90 b14', { boss: true, clear: 0.45, slack: [0.22, 0.5], tol: 0.05, blurb: 'ENDGEGNER. Neun Meter Limousine, Säulen im Weg und am Ende rückwärts in die Lücke.' }),
  // ---- Bezirk 2: Tiefgarage und Hafen
  LV('Ebene minus eins', 'sedan', 'garage', 'f12 r90 f16 l90 f14 l90 f11', { clear: 0.8, blurb: 'Die Tiefgarage. Säulen stehen immer genau da, wo man sie nicht braucht.' }),
  LV('Säulen-Slalom', 'suv', 'garage', 'f8 l45 f4 r90 f4 l45 f4 r45 f4 l90 f4 r45 f6 r90 f11', { clear: 0.65, fill: ['pillar', 'pillar', 'car'], blurb: 'Breiter Wagen, schmale Säulenreihe, kein Spielraum.' }),
  LV('Rückwärts aus der Sackgasse', 'van', 'garage', 'f24 w1 b12 br90/7.5 b12', { clear: 0.7, blurb: 'Vorwärts rein war leicht. Jetzt zurück, um die Ecke und in die Lücke.' }),
  LV('Motorrad zwischen den Spiegeln', 'moto', 'garage', 'f14 l90 f12 r90 f12 r90 f8', { clear: 0.3, slack: [0.2, 0.4], blurb: 'Die Lücken sind nicht für Autos gemacht. Für dich gerade so.' }),
  LV('Die Hafenkante', 'truck', 'harbor', 'f34 l90 f22 r90 f26 r90 f16', { clear: 0.9, blurb: 'Der LKW muss zwischen die Container. Rechts glitzert das Hafenbecken.' }),
  LV('Stapler im Lagerhaus', 'forklift', 'harbor', 'f8 l90 f8 r90 f7 r90 f6 b3 bl90 b6', { clear: 0.5, row: 'pallet', fill: ['pallet', 'crate', 'crate', 'pallet'], slack: [0.25, 0.5], blurb: 'Hinterradlenkung! Das Heck schert aus und die Kisten stapeln sich bis unters Dach.' }),
  LV('Container-Labyrinth', 'truck', 'harbor', 'f18 r90 f20 l90 f20 l90 f20 r90 f20 r90 f18', { clear: 0.7, blurb: 'Blechwände in jeder Richtung. Merk dir den Weg.' }),
  LV('Fähre um halb acht', 'sedan', 'harbor', 'f30 l90 f30 r90 f11', { clear: 0.8, movers: [{ at: 14, kind: 'truckp', n: 2, per: 15 }, { at: 48, kind: 'car', n: 2, per: 12, back: true }], blurb: 'Lkw von links, Pkw von rechts und alle wollen auf dieselbe Fähre.' }),
  LV('Bus rückwärts aufs Schiff', 'bus', 'harbor', 'f40 bl90/10 b22', { clear: 0.8, end: 'dock', blurb: 'Reisebusse stehen auf der Fähre mit dem Heck zur Rampe. Dein Problem.' }),
  LV('Sattelzug an die Rampe', 'semi', 'harbor', 'f38 w0.5 b6 bl90/15 b26', { boss: true, clear: 1.2, slack: [0.55, 1.4], tol: 0.12, end: 'dock', blurb: 'ENDGEGNER. Der Auflieger lenkt falsch herum. Immer. Rückwärts um 90 Grad an die Rampe. Oben hängt ein Rückspiegel.' }),
  // ---- Bezirk 3: Baustelle und Schrottplatz
  LV('Bagger-Gasse', 'suv', 'site', 'f14 r90 f14 l90 f14 l90 f11', { clear: 1, blurb: 'Überall Löcher, Rohre und Bagger, die Mittagspause machen.' }),
  LV('Rohrstapel', 'truck', 'site', 'f24 l45 f8 r90 f8 l45 f22 r90 f16', { clear: 0.8, fill: ['pipe', 'pipe', 'pallet'], blurb: 'Der LKW bringt die letzten Rohre durch die Baugrube.' }),
  LV('Betonmischer um die Ecke', 'truck', 'site', 'f20 r90 f30 l90 f16', { clear: 0.9, movers: [{ at: 42, kind: 'truckp', n: 1, per: 15 }], blurb: 'Der Mischer kommt alle paar Sekunden vorbei. Der wartet nicht.' }),
  LV('Der Wrack-Friedhof', 'small', 'scrap', 'f10 r90 f8 l90 f8 l90 f8 r90 f8 r90 f8', { clear: 0.5, blurb: 'Der Schrotthändler hat den Weg mit Wracks zugestellt. Das hier wird eng.' }),
  LV('Reifenberge', 'suv', 'scrap', 'f10 l30 f5 r60 f5 l60 f5 r60 f5 l30 f10 l90 f12', { clear: 0.6, fill: ['tires', 'tires', 'wreck'], blurb: 'Schlängeln. Noch mehr schlängeln. Dann einparken.' }),
  LV('Der Kran schwenkt', 'van', 'site', 'f22 r90 f22 l90 f13', { clear: 0.9, movers: [{ at: 10, gate: true, per: 14 }, { at: 40, gate: true, per: 11, phase: 0.3 }], blurb: 'Die Lasten am Kran pendeln durch deinen Weg. Warte auf die Lücke.' }),
  LV('Die Autopresse', 'sedan', 'scrap', 'f16 w0.5 f16 r90 f12', { clear: 0.7, movers: [{ at: 22, gate: true, per: 12, kind: 'press' }], blurb: 'Durch die Presse, bevor sie zugeht. Sonst bist du ein Würfel.' }),
  LV('Bus durch die Baugrube', 'bus', 'site', 'f24 r90 f22 l90 f22 l90 f18 r90 f22', { clear: 0.7, fill: ['barrier', 'barrier', 'pipe'], blurb: 'Warum hier ein Bus fährt? Frag lieber nicht.' }),
  LV('Stapler auf dem Gerüst', 'forklift', 'site', 'f10 r90 f8 l90 f8 r90 f8 l90 f6 l90 f6', { clear: 0.35, fill: ['pallet', 'pipe', 'crate'], slack: [0.2, 0.4], blurb: 'Fingerspitzengefühl: Zwischen den Stützen passt kaum ein Blatt.' }),
  LV('König des Schrottplatzes', 'semi', 'scrap', 'f32 r90/15 f20 l90/15 f30 w0.5 b4 bl90/15 b24', { boss: true, clear: 0.8, tol: 0.05, slack: [0.32, 0.8], movers: [{ at: 18, gate: true, per: 26, kind: 'press' }], blurb: 'ENDGEGNER. Sattelzug, Wrackberge, eine Presse als Tor und dann rückwärts in die Halle.' }),
  // ---- Bezirk 4: Militärbasis
  LV('Rekrut im Jeep', 'jeep', 'base', 'f18 r90 f16 l90 f12', { clear: 1, fill: ['sand', 'sand', 'jeepp'], blurb: 'Willkommen in der Kaserne. Der Feldwebel schaut zu.' }),
  LV('Dein erster Panzer', 'tank', 'base', 'f18 S90 f16 s90 f12', { clear: 1, blurb: 'Gas ist Gas, aber gelenkt wird auf der Stelle. Links, rechts, geradeaus.' }),
  LV('Panzer zwischen Panzern', 'tank', 'base', 'f20 s90 f16 S90 f13 S90 f14', { clear: 0.6, slack: [0.35, 0.6], blurb: 'Hier stehen schon vier Stück. Fünfzig Tonnen, ein Kratzer und es gibt Ärger.' }),
  LV('Stacheldraht-Gasse', 'jeep', 'base', 'f10 l45 f5 r90 f5 l45 f5 r45 f5 l90 f5 r45 f10 l90 f11', { clear: 0.5, fill: ['wire', 'wire', 'sand'], blurb: 'Eng, spitz und niemand hat Lust, dich herauszuschneiden.' }),
  LV('Die Rakete muss weg', 'rocket', 'base', 'f40 l90/21 f28 r90/21 f24 r90/21 f24', { clear: 0.9, fill: ['sand', 'jeepp', 'sand', 'wire'], blurb: 'Fünfzehn Meter Raketentransporter. Bitte nicht anstoßen. Wirklich nicht.' }),
  LV('Hangartor', 'tank', 'base', 'f24 s90 f22 S90 f24', { clear: 0.7, movers: [{ at: 12, gate: true, per: 22 }, { at: 36, gate: true, per: 24, phase: 0.2 }], blurb: 'Die Tore schließen nach Dienstplan und der Dienstplan wartet nicht auf dich.' }),
  LV('Panzer rückwärts in den Bunker', 'tank', 'base', 'f22 S90 f18 s90 f7 s180 b16', { clear: 0.55, slack: [0.3, 0.6], end: 'box', blurb: 'Einmal ganz herum drehen und mit dem Heck zuerst hinein.' }),
  LV('Der Konvoi', 'jeep', 'base', 'f46 r90 f12', { clear: 0.8, movers: [{ at: 12, kind: 'tankp', n: 2, per: 18 }, { at: 24, kind: 'tankp', n: 2, per: 16, back: true }, { at: 36, kind: 'jeepp', n: 2, per: 13 }], blurb: 'Quer über die Lagerstraße, durch drei Kolonnen. Panzer bremsen nicht.' }),
  LV('Bunker für die Rakete', 'rocket', 'base', 'f46 r90/21 f24 w0.5 b8 bl90/21 b30', { clear: 0.8, slack: [0.3, 0.8], end: 'box', blurb: 'Rückwärts in den Bunker, Raketenspitze voran an der Wand vorbei.' }),
  LV('Das Haupttor', 'tank', 'base', 'f18 s90 f16 S90 f20 S90 f16 s90 f18 s180 b15', { boss: true, clear: 0.45, tol: 0.05, slack: [0.3, 0.5], end: 'box', movers: [{ at: 9, gate: true, per: 20 }, { at: 44, gate: true, per: 22, phase: 0.35 }, { at: 79, gate: true, per: 24, phase: 0.7 }], blurb: 'ENDGEGNER. Drei Tore, die ihren eigenen Plan haben, und zum Schluss rückwärts in die Kammer.' }),
  // ---- Bezirk 5: Flughafen
  LV('Der Schlepper', 'tug', 'airport', 'f24 r90 f22 l90 f12', { clear: 1.1, blurb: 'Dein erstes Fahrzeug auf dem Vorfeld. Es ist klein. Das bleibt nicht so.' }),
  LV('Sportflugzeug in den Hangar', 'cessna', 'airport', 'f26 r90 f18 l90 f16', { clear: 1, end: 'box', blurb: 'Die Flügel sind breiter, als sie aussehen. Viel breiter.' }),
  LV('Gepäckwagen-Kreuzung', 'cessna', 'airport', 'f46 r90 f16', { clear: 1.2, movers: [{ at: 14, kind: 'bagcart', n: 2, per: 15 }, { at: 30, kind: 'tanker', n: 1, per: 13, back: true }], blurb: 'Das Vorfeld schläft nie. Kofferwagen haben hier immer Vorfahrt.' }),
  LV('Die Tragflächen-Schikane', 'cessna', 'airport', 'f16 l45 f12 r90 f12 l45 f16 r90 f15', { clear: 0.7, fill: ['bagcart', 'tanker', 'barrier'], blurb: 'Mit dem Rumpf ist alles frei. Aber die Flügel, Lennox, die Flügel.' }),
  LV('Dein erster Jumbo', 'jumbo', 'airport', 'f80 r90/60 f60 l90/60 f56', { clear: 3, fill: ['terminal', 'tanker', 'terminal'], end: 'gate', blurb: 'Siebzig Meter lang, vierundsechzig Meter breit, und die Gangway ist schon ausgefahren.' }),
  LV('Tanklaster um den Rumpf', 'truck', 'airport', 'f26 l90 f30 r90 f26 r90 f30 l90 f16', { clear: 0.8, fill: ['bagcart', 'tanker', 'cessnap'], blurb: 'Kerosin an Bord, Flugzeuge rundherum. Heute nicht rauchen.' }),
  LV('Zwischen den Terminals', 'jumbo', 'airport', 'f60 l90/62 f40 r90/62 f40 r90/62 f60', { clear: 2, fill: ['terminal', 'terminal', 'jet'], end: 'gate', blurb: 'Die Flügelspitze hat zwei Meter Platz. Links wie rechts.' }),
  LV('Quer durch die Gepäckhalle', 'moto', 'airport', 'f14 r90 f10 l90 f10 l90 f10 r90 f10 r90 f8', { clear: 0.3, slack: [0.2, 0.4], fill: ['bagcart', 'barrier', 'crate'], movers: [{ at: 20, kind: 'bagcart', n: 1, per: 7, wide: 18 }], blurb: 'Kurz mal mit dem Motorrad durch die Gepäckausgabe. Klar, warum nicht.' }),
  LV('Startbahn kreuzen', 'jumbo', 'airport', 'f130 r90/60 f56', { clear: 3, fill: ['terminal', 'tanker'], end: 'gate', movers: [{ at: 66, kind: 'jet', n: 1, per: 95, wide: 340 }], blurb: 'Eine Boeing kreuzt deinen Weg. Sie ist schneller. Warte auf den richtigen Moment.' }),
  {
    name: 'Bruno, der Parkwächter', world: 'airport', boss: true, final: true, clear: 0.6, tol: 0.05, blurb: 'DER LETZTE GEGNER. Bruno hat alles abgesperrt und schleppt alles ab, was steht. Motorrad, Panzer, Jumbo: drei Fahrzeuge, drei Lücken, kein einziger Kratzer.',
    stages: [
      { veh: 'moto', at: [0, 0, 0], path: 'f14 l90 f10 r90 f12 r90 f10 l90 f8', clear: 0.3, slack: [0.2, 0.4], fill: ['barrier', 'crate', 'bagcart'], movers: [{ at: 26, kind: 'tow', n: 1, per: 11 }] },
      { veh: 'tank', at: [90, 0, 0], path: 'f20 s90 f14 S90 f18 S90 f14 s90 f14 s180 b15', clear: 0.5, slack: [0.3, 0.5], fill: ['tankp', 'sand', 'wire'], end: 'box', movers: [{ at: 10, gate: true, per: 22 }, { at: 59, gate: true, per: 24, phase: 0.4 }] },
      { veh: 'jumbo', at: [260, -40, 0], path: 'f70 r90/60 f50 l90/60 f50 l90/60 f60', clear: 2.4, slack: [1.4, 3], fill: ['terminal', 'tanker', 'jet'], end: 'gate', movers: [{ at: 40, kind: 'tow', n: 1, per: 42, wide: 150 }] },
    ],
  },
];
CATALOG.forEach((c, i) => { c.n = i + 1; c.district = Math.floor(i / 10); c.boss = !!c.boss || (i + 1) % 10 === 0; });

// ---------------- Musterfahrt ----------------
function parsePath(s) {
  return s.trim().split(/\s+/).map((tok) => { const m = /^(bl|br|f|b|l|r|s|S|w)(-?[\d.]+)(?:\/([\d.]+))?$/.exec(tok); if (!m) throw new Error('Pfad? ' + tok); return { op: m[1], a: +m[2], r: m[3] ? +m[3] : 0 }; });
}
// führt die Befehle mit der echten Physik aus und merkt sich jede Eingabe
export function record(def, pose, path) {
  const st = createVehState(pose, def); const cmds = parsePath(path); const dt = PARK_DT; const frames = []; const samples = []; let t = 0; let hn = pose.h; let lastDir = 1; const kmax = def.skid ? 0 : Math.tan(def.steer) / def.wb; const vGear = def.gears[0] / 3.6; const K = def.skid ? 3 : clamp(1.2 / Math.max(0.05, vGear * kmax), 2, 8);
  const push = (th, br, steer, gear) => { frames.push(th, br, steer, gear); st.gear = gear; stepVeh(st, def, { th, br, steer }, dt); t += dt; samples.push({ x: st.x, z: st.z, h: st.h, th2: st.th2, t, hn, v: st.v }); };
  const stop = (steer, gear) => { for (let i = 0; i < 400 && Math.abs(st.v) > 1e-4; i++) push(0, 1, steer, gear); };
  for (let c = 0; c < cmds.length; c++) {
    const q = cmds[c]; const nx = cmds[c + 1]; const dirOf = (o) => (!o ? 0 : o.op === 'f' || o.op === 'l' || o.op === 'r' ? 1 : o.op === 'b' || o.op === 'bl' || o.op === 'br' ? -1 : 0); const dir = dirOf(q);
    if (q.op === 'w') { stop(st.steer, st.gear); const n = Math.round(q.a / dt); for (let i = 0; i < n; i++) push(0, 1, st.steer, st.gear); continue; }
    if (q.op === 's' || q.op === 'S') { stop(0, 1); const sg = q.op === 's' ? 1 : -1; const h0 = st.h; const tgt = hn + sg * q.a * DEG; for (let i = 0; i < 6000; i++) { const e = wrapA(tgt - st.h); if (Math.abs(st.h - h0) >= q.a * DEG * 0.98 && Math.abs(e) < 0.004) break; if (Math.abs(st.steer) < 0.01 && Math.abs(e) < 0.004) break; push(0, 0, clamp(e * 5, -1, 1), st.gear); } hn = tgt; for (let i = 0; i < 12; i++) push(0, 0, 0, st.gear); continue; }
    const gear = dir > 0 ? 1 : -1; const nd = dirOf(nx); const mustStop = !nx || nd !== dir; if (lastDir !== dir) stop(st.steer, st.gear); lastDir = dir;
    const arc = q.op !== 'f' && q.op !== 'b'; const sgn = q.op === 'l' || q.op === 'br' ? 1 : -1; const reachV = dir > 0 ? vGear : def.gears[3] / 3.6;
    let frac = 0.92; if (arc && q.r) frac = def.skid ? 0.9 : clamp(Math.atan(def.wb / q.r) / def.steer, 0.05, 1);
    const trailerBack = def.trailer && dir < 0; const startH = st.h; const th0 = st.th2; const goal = arc ? q.a * DEG : q.a; const R2 = q.r || 15; const kap = arc ? sgn / R2 : 0; const hEnd = arc ? hn + sgn * q.a * DEG : hn; let s = 0; let lim = 0;
    for (;;) {
      if (++lim > 20000) throw new Error('Musterfahrt läuft nicht: ' + path);
      const v0 = Math.abs(st.v); let left; if (trailerBack && arc) left = goal - Math.abs(wrapA(st.th2 - th0)); else if (arc) left = goal - Math.abs(wrapA(st.h - startH)); else left = goal - s;
      if (left <= 0) break;
      let steer;
      if (trailerBack) {
        const len = def.trailer.len; const thT = arc ? th0 + kap * s : hn; const e = wrapA(st.th2 - thT); const kk = arc ? kap : 0; let phiD = Math.asin(clamp(-kk * len, -0.8, 0.8)) + 1.1 * e; phiD = clamp(phiD, -0.7, 0.7); const phi = wrapA(st.h - st.th2); const vv = Math.min(st.v, -0.5); const hdot = 1.6 * (phiD - phi) + (vv / len) * Math.sin(phi); steer = clamp(Math.atan(def.wb * hdot / vv) / def.steer, -1, 1);
      } else if (arc) { steer = def.skid ? sgn * frac : sgn * dir * frac; const rest = left; if (!def.skid) { const rate = v0 * Math.tan(def.steer * frac) / def.wb; if (rest < rate * 0.22) steer *= 0.4; } } else { const e = wrapA(hn - st.h); steer = clamp((def.skid ? e : e * dir) * K, -1, 1); }
      const need = arc ? left * (q.r || def.minR || 2.6) : left; const brake = mustStop && need <= v0 * v0 / (2 * 6.5) + 0.02;
      if (brake) { push(0, 1, steer, gear); if (v0 < 0.02) break; } else push(v0 < reachV * 0.98 || true ? 1 : 0, 0, steer, gear);
      s += Math.abs(st.v) * dt;
    }
    hn = hEnd; if (mustStop) stop(st.steer, gear);
  }
  stop(st.steer, st.gear); for (let i = 0; i < 120; i++) push(0, 1, 0, st.gear); // 2 s stehen: die Lücke gilt erst nach kurzer Haltezeit
  return { frames, samples, T: t, end: st, hn, lastDir };
}

const hitsRects = (c, list, pad) => { for (const r of list) if (rectHit(c, r, pad)) return true; return false; };
const shapes = (kind, x, z, h) => { const k = OBJ[kind]; const sn = Math.sin(h); const cs = Math.cos(h); if (k.boxes) return k.boxes.map((b) => rect(x + sn * b.c, z + cs * b.c, h, b.l, b.w)); return [rect(x, z, h, k.l / 2, k.w / 2)]; };
const rng = (s) => () => { s = (s * 16807) % 2147483647; return s / 2147483647; };

export function buildLevel(n) {
  const C = CATALOG[n - 1]; const W = WORLDS[C.world]; const L = { n, name: C.name, blurb: C.blurb, world: C.world, boss: C.boss, final: !!C.final, stages: [], solid: [], props: [], movers: [], lanes: [], par: 0 };
  const sweep = []; const placed = [];
  const add = (kind, x, z, h, must = false, o = {}) => { const list = shapes(kind, x, z, h); L.props.push({ kind, x, z, h, ...o }); for (const r of list) { r.kind = kind; r.must = must; L.solid.push(r); placed.push(r); } return true; };
  const specs = C.stages || [{ veh: C.veh, at: [0, 0, 0], path: C.path, clear: C.clear, slack: C.slack, fill: C.fill, end: C.end, movers: C.movers }];
  let t0 = 0;
  for (const sp of specs) {
    const def = v(sp.veh); const pose = { x: sp.at[0], z: sp.at[1], h: sp.at[2] }; const R = record(def, pose, sp.path); const stage = { veh: sp.veh, start: pose, frames: R.frames, T: R.T, t0 }; L.stages.push(stage); stage.samples = R.samples; stage.route = [];
    // überstrichene Fläche
    let px = 1e9; let pz = 1e9; let ph = 1e9; let dist = 0; let lx = R.samples[0].x; let lz = R.samples[0].z; const rects = [];
    for (const q of R.samples) { dist += Math.hypot(q.x - lx, q.z - lz); lx = q.x; lz = q.z; q.d = dist; if (Math.hypot(q.x - px, q.z - pz) > Math.max(0.25, def.radius / 40) || Math.abs(wrapA(q.h - ph)) > 0.05) { px = q.x; pz = q.z; ph = q.h; for (const r of vehRects(q, def)) rects.push(r); stage.route.push(q); } }
    stage.len = dist; sweep.push(...rects);
    const grid = buildGrid(rects, Math.max(6, def.radius / 2.5)); const near = []; stage.sweep = rects;
    const blocked = (kind, x, z, h, pad) => { for (const r of shapes(kind, x, z, h)) { grid.near(r.x, r.z, Math.hypot(r.hl, r.hw) + pad + 1, near); for (const s of near) if (rectHit(r, s, pad)) return true; } return false; };
    const crowded = (kind, x, z, h, pad) => { for (const r of shapes(kind, x, z, h)) if (hitsRects(r, placed, pad)) return true; return false; };
    // Lücke um die Endlage herum
    const e = R.end; const hs = R.hn; const ux = Math.sin(hs); const uz = Math.cos(hs); const lxv = Math.cos(hs); const lzv = -Math.sin(hs); let a0 = 1e9; let a1 = -1e9; let b0 = 1e9; let b1 = -1e9;
    for (const r of vehRects(e, def)) for (const [p, q] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const cx = r.x + r.ux * p * r.hl + r.uz * q * r.hw; const cz = r.z + r.uz * p * r.hl - r.ux * q * r.hw; const a = cx * ux + cz * uz; const b = cx * lxv + cz * lzv; a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b); }
    const slack = sp.slack || C.slack || [Math.min(0.6, 0.3 + (sp.clear || 0.6) * 0.2), 0.9]; const mx = (a0 + a1) / 2; const my = (b0 + b1) / 2; const sx = ux * mx + lxv * my; const sz = uz * mx + lzv * my; const hl = (a1 - a0) / 2 + slack[1]; const hw = (b1 - b0) / 2 + slack[0];
    const spot = { x: sx, z: sz, h: hs, ux, uz, hl, hw, tol: C.tol || 0.1 }; stage.spot = spot; stage.endDir = R.lastDir;
    const end = sp.end || 'row'; const dirIn = R.lastDir; const bigV = hw * 2; const rowKind = end === 'gate' ? 'jet' : sp.row || C.row || W.row; const rk = OBJ[rowKind]; const place = (kind, x, z, h, must, dx = 0, dz = 0) => { if (must) { for (let q = 0; q <= 40 && blocked(kind, x, z, h, 0.06); q++) { x += dx * 0.1; z += dz * 0.1; } } if (blocked(kind, x, z, h, must ? 0.03 : sp.clear * 0.6)) { if (must) L.problems = (L.problems || []).concat(`${n}: Pflichtobjekt ${kind} liegt in der Fahrspur`); return false; } return crowded(kind, x, z, h, 0.02) ? false : add(kind, x, z, h, must); };
    if (end === 'row' || end === 'gate') { const big = end === 'gate'; const pitch = big ? bigV + 64 + 2 : Math.max(bigV, rk.w * 1) + (rk.w > bigV ? 0.2 : 0); for (let i = 1; i <= (big ? 2 : 4); i++) for (const sg of [-1, 1]) { const of = bigV / 2 + (big ? 33 : rk.w / 2 + 0.04) + (i - 1) * pitch; place(rowKind, sx + lxv * sg * of, sz + lzv * sg * of, hs, !big && i === 1, lxv * sg, lzv * sg); } const bx = sx + ux * dirIn * (hl + 0.35); const bz = sz + uz * dirIn * (hl + 0.35); const wl = Math.max(hw * 2 + 8, 16); if (big) for (let i = -1; i <= 1; i++) place('terminal', bx + ux * dirIn * 9 + lxv * i * 46, bz + uz * dirIn * 9 + lzv * i * 46, hs + Math.PI / 2, i === 0); else for (let i = -3; i <= 3; i++) place(C.world === 'market' || C.world === 'city' ? 'hedge' : 'wall', bx + lxv * i * (C.world === 'market' || C.world === 'city' ? 3 : 6), bz + lzv * i * (C.world === 'market' || C.world === 'city' ? 3 : 6), hs + Math.PI / 2, i === 0); void wl; }
    if (end === 'parallel') { const ox = hl + rk.l / 2 + 0.05; for (let i = 0; i < 3; i++) for (const sg of [-1, 1]) place(rowKind, sx + ux * sg * (ox + i * (rk.l + 1)), sz + uz * sg * (ox + i * (rk.l + 1)), hs, i === 0, ux * sg, uz * sg); const cx = sx + lxv * -(hw + 0.3); const cz = sz + lzv * -(hw + 0.3); for (let i = -4; i <= 4; i++) place('curb', cx + ux * i * 6, cz + uz * i * 6, hs, Math.abs(i) <= 1); }
    if (end === 'dock') { const bx = sx + ux * dirIn * (hl + 0.65); const bz = sz + uz * dirIn * (hl + 0.65); place('dock', bx, bz, hs + Math.PI / 2, true); for (let i = 1; i <= 2; i++) for (const sg of [-1, 1]) { place('wall', bx + lxv * sg * (2.9 + i * 6), bz + lzv * sg * (2.9 + i * 6), hs + Math.PI / 2, false); } for (const sg of [-1, 1]) { const ox = hw + 0.25; for (let i = 0; i < Math.ceil(hl / 2.6); i++) place('bollard', sx + lxv * sg * ox + ux * dirIn * (hl - i * 3), sz + lzv * sg * ox + uz * dirIn * (hl - i * 3), hs, i === 0); } }
    if (end === 'box') { const bx = sx + ux * dirIn * (hl + 0.25); const bz = sz + uz * dirIn * (hl + 0.25); const nx = Math.ceil(hw * 2 / 6); for (let i = 0; i < nx; i++) place('wall', bx + lxv * (i - (nx - 1) / 2) * 6, bz + lzv * (i - (nx - 1) / 2) * 6, hs + Math.PI / 2, true); const ny = Math.ceil(hl * 2 / 6); for (const sg of [-1, 1]) for (let i = 0; i < ny; i++) place('wall', sx + lxv * sg * (hw + 0.25) + ux * dirIn * (hl - 3 - i * 6), sz + lzv * sg * (hw + 0.25) + uz * dirIn * (hl - 3 - i * 6), hs, true); }
    // Bewegte Hindernisse: Tore zuerst, die Füllung lässt dafür Platz
    stage.gates = [];
    for (const m of sp.movers || []) { let q = R.samples[0]; for (const p of R.samples) { if (p.d >= m.at) { q = p; break; } } const hl0 = Math.round(q.h / (Math.PI / 2)) * (Math.PI / 2); const nh = hl0 + Math.PI / 2; const lane = { type: m.gate ? 'gate' : 'loop', x: q.x, z: q.z, h: nh, at: m.at, phase: m.phase || 0, per: m.per, n: m.n || 1, kind: m.kind || (m.gate ? 'barrier' : 'car'), back: !!m.back }; if (m.gate) { let hw2 = def.w / 2 + 1.2; for (const b of def.boxes) hw2 = Math.max(hw2, b.w + 1.2); if (def.trailer) hw2 = Math.max(hw2, def.w / 2 + 1.5); const off = def.boxes.length > 1 ? 0 : 0; lane.x += Math.cos(hl0) * off; lane.z += -Math.sin(hl0) * off; lane.hl = hw2; lane.hw = 0.35; lane.len = hw2 * 2 + 0.6; const kk = OBJ[lane.kind]; lane.kindH = kk.h; lane.per = Math.max(m.per, (def.len + (def.trailer ? def.trailer.len + 6 : 3)) / (def.gears[0] / 3.6) / 0.55); stage.gates.push(lane); } else { const k = OBJ[m.kind || 'car']; lane.hl = k.boxes ? 35 : k.l / 2; lane.hw = k.boxes ? 32 : k.w / 2; lane.len = m.wide || 70; lane.fixed = !!m.wide; lane.h = m.back ? nh + Math.PI : nh; } L.lanes.push(lane); }
    // Füllung: Objekte schmiegen sich links und rechts an die Fahrspur
    const kinds = sp.fill || C.fill || W.fill; const r0 = rng(n * 7919 + L.stages.length); const clear = sp.clear || C.clear || 0.8; const gap = C.gap ?? W.gap; let ki = 0;
    for (let lay = 0; lay < 2; lay++) for (const side of [1, -1]) {
      let next = lay * 2; for (const P of stage.route) {
        if (P.d < next) continue; const kind = kinds[ki++ % kinds.length]; const k = OBJ[kind]; const hh = Math.round(P.hn / (Math.PI / 2)) * (Math.PI / 2); const sn = Math.sin(hh); const cs = Math.cos(hh); const dm = lay ? Math.max(def.w, 2) + k.w + clear + 2 : 0.5; let ok = false;
        for (let d = dm; d < dm + 34 + def.radius * 0.4; d += Math.max(0.3, def.radius / 50)) { const x = P.x + cs * side * d; const z = P.z - sn * side * d; const pad = clear; if (blocked(kind, x, z, hh, pad)) continue; if (crowded(kind, x, z, hh, gap)) { if (lay) break; continue; } let inLane = false; for (const l of L.lanes) { const u = (x - l.x) * Math.sin(l.h) + (z - l.z) * Math.cos(l.h); const vv = (x - l.x) * Math.cos(l.h) - (z - l.z) * Math.sin(l.h); const wide = l.type === 'gate' ? l.hl * 3.2 + k.l / 2 : l.fixed ? l.len / 2 + 2 : 1e9; const hwl = l.hw + k.l / 2 + k.w / 2 + 0.8; if (Math.abs(u) < wide && Math.abs(vv) < hwl) inLane = true; } if (inLane) break; add(kind, x, z, hh, false, { c: Math.floor(r0() * 8) }); ok = true; break; }
        next = P.d + (ok ? k.l + gap + 0.4 : 1.2);
      }
    }
    // Neben Toren stehen Pfosten: sonst fährt man einfach außen herum
    for (const l of stage.gates) { const hl0 = l.h; const sn = Math.sin(hl0); const cs = Math.cos(hl0); for (const sg of [-1, 1]) for (let i = 0; i < 7; i++) { const of = sg * (l.hl + 1.5 + i * 3); const kind = 'barrier'; const x = l.x + sn * of * (1) ; const z = l.z + cs * of; if (!blocked(kind, x, z, hl0, 0.25) && !crowded(kind, x, z, hl0, 0)) add(kind, x, z, hl0); } void cs; }
    t0 += R.T;
    L.par += stage.T;
  }
  // Umrandung: alles, was gefahren oder gebaut wurde, plus Rand
  let x0 = 1e9; let x1 = -1e9; let z0 = 1e9; let z1 = -1e9; for (const r of sweep.concat(L.solid)) { const ex = Math.abs(r.ux) * r.hl + Math.abs(r.uz) * r.hw; const ez = Math.abs(r.uz) * r.hl + Math.abs(r.ux) * r.hw; x0 = Math.min(x0, r.x - ex); x1 = Math.max(x1, r.x + ex); z0 = Math.min(z0, r.z - ez); z1 = Math.max(z1, r.z + ez); }
  const pad = 5; x0 -= pad; x1 += pad; z0 -= pad; z1 += pad; L.bounds = { x0, x1, z0, z1 };
  const T = 2; L.solid.push({ ...rect((x0 + x1) / 2, z0 - T / 2, Math.PI / 2, (x1 - x0) / 2 + T, T / 2), kind: 'bound' }, { ...rect((x0 + x1) / 2, z1 + T / 2, Math.PI / 2, (x1 - x0) / 2 + T, T / 2), kind: 'bound' }, { ...rect(x0 - T / 2, (z0 + z1) / 2, 0, (z1 - z0) / 2 + T, T / 2), kind: 'bound' }, { ...rect(x1 + T / 2, (z0 + z1) / 2, 0, (z1 - z0) / 2 + T, T / 2), kind: 'bound' });
  // Querverkehr fährt von Rand zu Rand, gleiche Geschwindigkeit
  for (const l of L.lanes) { if (l.type === 'gate' || l.fixed) continue; const sx = Math.sin(l.h); const cz = Math.cos(l.h); let far = 20; for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) far = Math.max(far, Math.abs((x - l.x) * sx + (z - l.z) * cz)); const nl = far * 2 + 16; l.per *= nl / l.len; l.len = nl; }
  // Spuren in Einzelfahrzeuge auflösen und die Phase so wählen, dass die Musterfahrt durchkommt
  fitMovers(L);
  L.grid = buildGrid(L.solid, 10);
  return L;
}

function fitMovers(L) {
  for (const l of L.lanes) {
    const base = l.type === 'gate' ? 1 : 1 / l.n; const ok = []; const STEPS = 60; const stage = L.stages.find((s) => s.len !== undefined && l.stage === undefined && s) && stageOfLane(L, l); const def = v(stage.veh);
    const test = (ph) => { for (let i = 0; i < l.n; i++) { const m = { ...l, phase: ph + i / l.n }; for (let j = 0; j < stage.samples.length; j += 6) { const q = stage.samples[j]; const r = moverRect(m, stage.t0 + q.t); for (const b of vehRects(q, def)) if (rectHit(b, r, 0.5)) return false; } } return true; };
    for (let i = 0; i < STEPS; i++) ok.push(test(l.phase + base * i / STEPS));
    let bestLen = 0; let bestAt = -1; for (let i = 0; i < STEPS; i++) { if (!ok[i]) continue; let n = 0; while (n < STEPS && ok[(i + n) % STEPS]) n++; if (n > bestLen) { bestLen = n; bestAt = i; } }
    if (bestAt < 0) { L.problems = (L.problems || []).concat(`${L.n}: keine Lücke für ${l.type} bei ${l.at} m`); bestAt = 0; }
    const ph = l.phase + base * (bestAt + bestLen / 2) / STEPS; for (let i = 0; i < l.n; i++) L.movers.push({ ...l, phase: ph + i / l.n });
    l.window = bestLen / STEPS;
  }
}
const stageOfLane = (L, l) => { let best = L.stages[0]; let bd = 1e18; for (const s of L.stages) for (let i = 0; i < s.route.length; i += 4) { const d = (s.route[i].x - l.x) ** 2 + (s.route[i].z - l.z) ** 2; if (d < bd) { bd = d; best = s; } } return best; };

// Prüfung für Tests: spielt die Musterfahrt durch die echte Physik und meldet Berührung oder fehlendes Einparken
export function replayLevel(L, hit) {
  for (const s of L.stages) {
    const def = v(s.veh); const st = createVehState(s.start, def); const f = s.frames; let t = s.t0;
    for (let i = 0; i < f.length; i += 4) { st.gear = f[i + 3]; stepVeh(st, def, { th: f[i], br: f[i + 1], steer: f[i + 2] }, PARK_DT); t += PARK_DT; const h = hit(st, def, L, t); if (h) return { ok: false, why: `Berührung ${h.kind || 'Tor'} bei t=${t.toFixed(1)}`, x: st.x, z: st.z, stage: L.stages.indexOf(s) }; }
    if (!inSpot(st, def, s.spot)) return { ok: false, why: 'nicht in der Lücke', stage: L.stages.indexOf(s), e: wrapA(st.h - s.spot.h) };
  }
  return { ok: true };
}
