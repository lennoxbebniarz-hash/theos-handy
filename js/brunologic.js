// Theos Seitenscheidel - Big Bruno kommt auf die Erde: Regeln und Zahlen (ohne Darstellung, in Node testbar).
// Der Asteroid „Big Bruno“ trifft in 90 Tagen die Erde. Ihr landet zu dritt mit dem Raumschiff TS-1 auf ihm und baut ihn ab:
// Erz in den Rucksack, im Schiff am Handelsterminal verkaufen, bessere Werkzeuge kaufen. Jeden Abend zahlt die Erde eine Prämie
// je abgebautem Kubikmeter. Ab Tag 15 gibt der Rat die Schiffswaffe frei (Orbitalschlag). Ist Big Bruno am Ende kleiner als die
// Verglühgrenze, verglüht der Rest in der Luft: gewonnen. Sonst schlägt er ein.
export const DAY_SEC = 100; export const DAYS = 90; export const GOAL_FRAC = 0.04; export const PRAEMIE = 0.5; // Credits je m³
export const ORBIT_DAY = 15; export const MAX_SWARMS = 3; export const SWARM_R = 9; export const SWARM_CAP = 2600; // m³ je Bake
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// need: so viele m³ muss das Team zusammen abgebaut haben, bevor man das Werkzeug kaufen darf (Rang, siehe RANKS).
// 2026-11-13, Lennox: „mach das Spiel schwerer, mehr Waffen, nicht so früh freischalten, Level-System nach Kubikmetern, Orbitalschlag ab Tag 15 schwerer“.
// Grob nach der Soll-Kurve: Tag 5 rund 2.000 m³, Tag 15 rund 16.000, Tag 30 rund 50.000, Tag 45 rund 95.000.
export const TOOLS = [
  { id: 'hacke', short: 'Hacke', key: 1, name: 'Spitzhacke', model: 'Spitzhacke', price: 0, need: 0, kind: 'hit', r: 0.62, cd: 0.42, range: 3.4, desc: 'Für den Anfang. Klick: ein Stück Fels raus.' },
  { id: 'hammer', short: 'Hammer', key: 2, name: 'Schlaghammer', model: 'Schlaghammer', price: 350, need: 80, kind: 'hit', r: 1.05, cd: 0.78, range: 3.4, desc: 'Schwer, laut, macht große Löcher.' },
  { id: 'bohrer', short: 'Bohrer', key: 3, name: 'Bohrer', model: 'Bohrer', price: 1500, need: 500, kind: 'drill', r: 0.85, cd: 0.09, range: 3.8, desc: 'Gedrückt halten: frisst sich durch den Stein.' },
  { id: 'laser', short: 'Laser', key: 4, name: 'Laserschneider', model: 'Laserschneider', price: 5000, need: 4000, kind: 'beam', r: 0.78, cd: 0.1, range: 28, desc: 'Pinker Strahl, 28 m weit. Schneidet alles.' },
  { id: 'drohnen', short: 'Drohnen', key: 5, name: 'Drohnenschwarm', model: 'Bake', price: 12000, need: 10000, kind: 'drones', desc: 'Bake setzen: sechs Drohnen graben dort von selbst und liefern das Erz ins Schiff. Bis zu drei Schwärme.' },
  { id: 'loch', short: 'Loch', key: 6, name: 'Schwarzes Loch', model: 'Loch_Kapsel', price: 6000, need: 28000, kind: 'hole', r: 8, desc: 'Kapsel werfen. Nach drei Sekunden frisst sie eine riesige Kugel weg. Verbraucht sich.' },
  { id: 'orbit', short: 'Orbit', key: 7, name: 'Orbitalschlag', model: 'Zielgeraet', price: 20000, need: 40000, kind: 'orbit', desc: 'Ziel markieren, das Schiff feuert aus dem All. Einmal am Tag. Ab Tag 15 die Schiffswaffe im Maschinenraum reparieren.' },
  { id: 'spreng', short: 'Ladung', key: 8, name: 'Sprengladung', model: 'Sprengladung', price: 900, need: 1500, kind: 'charge', r: 2.4, fuse: 2.2, pack: 4, desc: 'Ladung werfen, zwei Sekunden später knallt es. Vier Stück je Kauf. Verbraucht sich.' },
  { id: 'plasma', short: 'Plasma', key: 9, name: 'Plasmawerfer', model: 'Plasmawerfer', price: 20000, need: 18000, kind: 'shot', r: 1.9, cd: 0.85, range: 60, speed: 45, desc: 'Schießt grüne Plasmakugeln bis 60 m weit. Jede sprengt einen Krater.' },
  { id: 'anti', key: 0, name: 'Antimaterie-Bombe', short: 'Antimaterie', model: 'Antimaterie', price: 25000, need: 70000, kind: 'charge', r: 12, fuse: 5, pack: 1, desc: 'Die größte Waffe an Bord. Werfen, fünf Sekunden rennen. Verbraucht sich.' },
];
export const toolById = (id) => TOOLS.find((t) => t.id === id) || null;
// Ränge: jeder Rang schaltet ein Werkzeug zum Kaufen frei (Kaufen kostet trotzdem Credits)
export const RANKS = [
  { need: 0, name: 'Grünschnabel' }, { need: 80, name: 'Steinklopfer' }, { need: 500, name: 'Bohrkopf' }, { need: 1500, name: 'Sprengmeister' }, { need: 4000, name: 'Laserschneider' },
  { need: 10000, name: 'Drohnenpilot' }, { need: 18000, name: 'Plasmaschütze' }, { need: 28000, name: 'Lochmacher' }, { need: 40000, name: 'Kanonier' }, { need: 70000, name: 'Antimaterie-Profi' }, { need: 120000, name: 'Weltenretter' },
];
// Abgebaut vom ganzen Team (m³). S.best merkt sich den Höchstwert, damit der Rang nie zurückfällt.
export const removed = (S, vol) => Math.max(S.best || 0, S.vol0 && Number.isFinite(vol) ? S.vol0 - vol : 0);
export function rankOf(m3) { let i = 0; while (i + 1 < RANKS.length && m3 >= RANKS[i + 1].need) i++; return { i, ...RANKS[i], next: RANKS[i + 1] || null, unlocks: TOOLS.filter((t) => t.need === RANKS[i].need && t.need > 0) }; }
export const UPGRADES = [
  { id: 'sack', name: 'Rucksack', unit: 'kg', lv: [{ v: 40 }, { v: 100, price: 600 }, { v: 250, price: 2800 }, { v: 600, price: 9000 }] },
  { id: 'luft', name: 'Lufttank', unit: 's', lv: [{ v: 150 }, { v: 300, price: 500 }, { v: 600, price: 2400 }] },
  { id: 'sprung', name: 'Sprungstiefel', unit: 'm/s', lv: [{ v: 4.2 }, { v: 7.5, price: 400 }] },
  { id: 'orbit', name: 'Orbitallaser', unit: 'm', lv: [{ v: 10 }, { v: 13, price: 15000, need: 70000 }, { v: 16, price: 40000, need: 120000 }] },
];
export const upById = (id) => UPGRADES.find((u) => u.id === id);
export const upVal = (S, id) => { const u = upById(id); return u.lv[clamp(S.up[id] || 0, 0, u.lv.length - 1)].v; };
// Erze: kg je m³ und Credits je kg (Gestein bringt nichts außer der Prämie)
export const ORES = [null, { id: 'eis', name: 'Eis', kg: 6, price: 3, col: '#6ec8ff' }, { id: 'eisen', name: 'Eisenerz', kg: 8, price: 5, col: '#d0644a' }, { id: 'gold', name: 'Gold', kg: 5, price: 22, col: '#ffc83a' }, { id: 'kern', name: 'Kernkristall', kg: 4, price: 70, col: '#b05aff' }];

export function newSave(seed = Math.floor(Math.random() * 1e6) + 1) {
  return { v: 2, seed, day: 1, hist: [], t: 0, purse: 0, owned: { hacke: 1 }, up: { sack: 0, luft: 0, sprung: 0, orbit: 0 }, caps: 0, ammo: { spreng: 0, anti: 0 }, best: 0, swarms: [], swarmsOwned: 0, orbit: { open: false, unlocked: false, ready: 0 }, msgs: {}, quest: 0, stats: { removed: 0, sold: 0, earned: 0, ore: {} }, today: 0, dayVol: 0, over: null, introSeen: false, vol0: 0, vol: 0, nextId: 1, report: null };
}
export function fixSave(S) {
  const n = newSave(S && S.seed); if (!S || typeof S !== 'object') return n;
  const out = { ...n, ...S, owned: { ...n.owned, ...(S.owned || {}) }, up: { ...n.up, ...(S.up || {}) }, orbit: { ...n.orbit, ...(S.orbit || {}) }, ammo: { ...n.ammo, ...(S.ammo || {}) }, msgs: { ...(S.msgs || {}) }, stats: { ...n.stats, ...(S.stats || {}), ore: { ...((S.stats && S.stats.ore) || {}) } } };
  out.hist = Array.isArray(S.hist) ? S.hist.slice(0, 120) : []; out.swarms = Array.isArray(S.swarms) ? S.swarms.filter((s) => s && Number.isFinite(s.x)) : []; out.day = clamp(Math.floor(out.day) || 1, 1, DAYS + 1); out.t = clamp(Number(out.t) || 0, 0, DAY_SEC); out.purse = Math.max(0, Number(out.purse) || 0);
  if (out.orbit.unlocked) out.orbit.open = true; // alte Stände: Schiffswaffe war ab Tag 15 sofort frei, bleibt so
  return out;
}
export const goalVol = (vol0) => vol0 * GOAL_FRAC;
// Soll-Restvolumen nach Tag (mit Bruchteil): langsamer Start, später mit großen Werkzeugen schneller
export const sollVol = (vol0, dayF) => vol0 * (1 - (1 - GOAL_FRAC) * Math.pow(clamp((dayF - 1) / DAYS, 0, 1), 1.55));
export const dayF = (S) => S.day + S.t / DAY_SEC;
export const fmt = (n) => Math.round(n).toLocaleString('de-DE');
export const cr = (n) => fmt(n) + ' ₵';

// Erz aus einem Abbau (m³ je Material) -> kg je Erz-ID
export function oreOf(mat, share = 1) { const out = {}; for (let i = 1; i < ORES.length; i++) { const kg = (mat[i] || 0) * ORES[i].kg * share; if (kg > 0.0005) out[ORES[i].id] = kg; } return out; }
export const oreValue = (cargo) => Object.entries(cargo || {}).reduce((a, [id, kg]) => { const o = ORES.find((q) => q && q.id === id); return a + (o ? o.price * kg : 0); }, 0);
export const cargoKg = (cargo) => Object.values(cargo || {}).reduce((a, b) => a + b, 0);
// Erz in den Rucksack (bis er voll ist). Rückgabe: was nicht mehr reinpasste (kg)
export function stow(cargo, ore, cap) { let lost = 0; for (const [id, kg] of Object.entries(ore)) { const room = Math.max(0, cap - cargoKg(cargo)); const take = Math.min(room, kg); if (take > 0) cargo[id] = (cargo[id] || 0) + take; lost += kg - take; } return lost; }
export function sell(S, cargo) { const v = oreValue(cargo); const kg = cargoKg(cargo); if (kg <= 0.0001) return { ok: false, why: 'Der Rucksack ist leer.' }; S.purse += v; S.stats.sold += kg; S.stats.earned += v; for (const [id, k] of Object.entries(cargo)) S.stats.ore[id] = (S.stats.ore[id] || 0) + k; return { ok: true, value: v, kg, text: `${fmt(kg)} kg Erz verkauft: +${cr(v)}` }; }

const rankWhy = (need, have) => `Erst ab Rang „${rankOf(need).name}“: ${fmt(need)} m³ abgebaut (ihr habt ${fmt(have)}).`;
// vol: aktuelles Volumen von Big Bruno (für den Rang). Fehlt es, zählt der gespeicherte Höchstwert S.best.
export function buy(S, id, upgrade = false, vol = NaN) { // upgrade: Ausbau statt Werkzeug (Orbitallaser und Orbitalschlag haben dieselbe Kennung 'orbit')
  const t = upgrade ? null : toolById(id); const have = removed(S, vol);
  if (t) {
    if (t.kind === 'orbit') { // Schiffswaffe reparieren: ab Tag 15 (Maschinenraum offen), Rang und Credits
      if (S.orbit.unlocked) return { ok: false, why: 'Die Schiffswaffe ist schon repariert.' }; if (!S.orbit.open) return { ok: false, why: `Der Maschinenraum öffnet erst an Tag ${ORBIT_DAY}.` };
      if (have < t.need) return { ok: false, why: rankWhy(t.need, have) }; if (S.purse < t.price) return { ok: false, why: 'Zu wenig Credits.' };
      S.purse -= t.price; S.orbit.unlocked = true; S.orbit.ready = 1; return { ok: true, text: 'Schiffswaffe repariert! Orbitalschlag bereit (Taste 7 oder Orbit-Konsole).' };
    }
    if (have < t.need) return { ok: false, why: rankWhy(t.need, have) };
    if (t.kind === 'hole') { if (S.purse < t.price) return { ok: false, why: 'Zu wenig Credits.' }; S.purse -= t.price; S.owned.loch = 1; S.caps++; return { ok: true, text: `Kapsel gekauft (${S.caps} im Lager).` }; }
    if (t.kind === 'charge') { if (S.purse < t.price) return { ok: false, why: 'Zu wenig Credits.' }; S.purse -= t.price; S.owned[id] = 1; S.ammo[id] = (S.ammo[id] || 0) + t.pack; return { ok: true, text: `${t.name}: ${S.ammo[id]} im Lager. Taste ${t.key}.` }; }
    if (t.kind === 'drones') { if (S.swarmsOwned >= MAX_SWARMS) return { ok: false, why: 'Mehr als drei Schwärme passen nicht ins Schiff.' }; if (S.purse < t.price) return { ok: false, why: 'Zu wenig Credits.' }; S.purse -= t.price; S.swarmsOwned++; S.owned.drohnen = 1; return { ok: true, text: `Drohnenschwarm ${S.swarmsOwned} gekauft.` }; }
    if (S.owned[id]) return { ok: false, why: 'Hast du schon.' }; if (S.purse < t.price) return { ok: false, why: 'Zu wenig Credits.' }; S.purse -= t.price; S.owned[id] = 1; return { ok: true, text: `${t.name} gekauft. Taste ${t.key}.` };
  }
  const u = upById(id); if (!u) return { ok: false, why: '?' }; const lv = S.up[id] || 0; const nx = u.lv[lv + 1]; if (!nx) return { ok: false, why: 'Schon ganz ausgebaut.' };
  if (id === 'orbit' && !S.orbit.unlocked) return { ok: false, why: S.orbit.open ? 'Erst die Schiffswaffe reparieren.' : `Erst ab Tag ${ORBIT_DAY}.` }; if (nx.need && have < nx.need) return { ok: false, why: rankWhy(nx.need, have) }; if (S.purse < nx.price) return { ok: false, why: 'Zu wenig Credits.' };
  S.purse -= nx.price; S.up[id] = lv + 1; return { ok: true, text: `${u.name}: Stufe ${lv + 2} (${fmt(nx.v)} ${u.unit}).` };
}
// Nächstes sinnvolles Werkzeug für die Anzeige „Nächstes Werkzeug“ (in der Reihenfolge der Ränge)
const BY_NEED = [...TOOLS].sort((a, b) => a.need - b.need);
export function nextTool(S) { for (const t of BY_NEED) { if (t.kind === 'orbit') { if (S.orbit.open && !S.orbit.unlocked) return t; continue; } if (!S.owned[t.id]) return t; } return null; }

// Zeit: Rückgabe { dayEnd: { day, removed, praemie } } wenn ein Tag endet. vol = aktuelles Volumen von Big Bruno
// (abgebaut zählt, was seit Tagesbeginn fehlt: egal ob Hacke, Drohne, Loch oder Orbitalschlag, egal von wem)
export function tick(S, dt, vol) {
  if (S.vol0 && Number.isFinite(vol)) S.best = Math.max(S.best || 0, S.vol0 - vol);
  if (S.over) return null; if (!S.dayVol) S.dayVol = vol; S.t += dt; S.today = Math.max(0, S.dayVol - vol); if (S.t < DAY_SEC) return null;
  S.t -= DAY_SEC; const rep = { day: S.day, removed: S.today, praemie: Math.round(S.today * PRAEMIE) }; S.purse += rep.praemie; S.stats.earned += rep.praemie; S.today = 0; S.dayVol = vol; S.hist.push(Math.round(vol)); S.day++;
  if (S.orbit.unlocked) S.orbit.ready = 1; if (S.day >= ORBIT_DAY) S.orbit.open = true; // ab Tag 15 nur der Maschinenraum offen, die Waffe muss man reparieren (buy 'orbit')
  S.report = rep; return { dayEnd: rep };
}
// Ende: nach Tag 90 entscheidet die Größe
export function verdict(S, vol, vol0) { if (S.over) return S.over; if (vol <= goalVol(vol0)) return 'won'; if (S.day > DAYS) return 'lost'; return null; }

// Nachrichten „Erde am Apparat“: einmalig, wenn die Bedingung gilt. info = { vol, vol0 }
export const MSGS = [
  { id: 'start', when: (S) => S.day >= 1, head: 'Ihr seid gelandet', text: (S, i) => `Hier spricht die Erde. Big Bruno hat ${fmt(i.vol0)} m³ und schlägt in 90 Tagen bei uns ein. Macht ihn kleiner als ${fmt(goalVol(i.vol0))} m³, dann verglüht der Rest in der Luft. Bitte beeilt euch.` },
  { id: 'erz', when: (S) => S.day >= 2, head: 'Erz lohnt sich', text: () => 'Blaues Eis, rotes Eisenerz und Gold könnt ihr im Schiff an der Erzannahme abgeben. Gold bringt am meisten. Für jeden Kubikmeter Stein zahlen wir euch jeden Abend eine Prämie.' },
  { id: 'langsam', when: (S, i) => S.day >= 8 && i.vol > sollVol(i.vol0, dayF(S)) * 1.01, head: 'Zu langsam', text: () => 'Wir haben euer Tempo ausgerechnet. Von Hand schafft ihr das nicht. Jeder abgebaute Kubikmeter bringt euch einen Rang weiter, und jeder Rang schaltet ein neues Werkzeug frei.' },
  { id: 'waffen', when: (S) => S.day >= ORBIT_DAY, head: 'Ihr schafft es nicht von Hand', text: () => `TS-1, der Rat hat die Schiffswaffe freigegeben. Der Maschinenraum ist offen, aber die Waffe ist beim Anflug kaputtgegangen. Reparieren könnt ihr sie an der Orbit-Konsole, sobald ihr Rang „${rankOf(toolById('orbit').need).name}“ habt (${fmt(toolById('orbit').need)} m³ abgebaut). Das kostet ${cr(toolById('orbit').price)}.` },
  { id: 'kern', when: (S) => (S.stats.ore.kern || 0) > 0, head: 'Was ist das?', text: () => 'Lila Kristalle aus dem Kern! Die sind auf der Erde unbezahlbar. Grabt tiefer.' },
  { id: 'halb', when: (S, i) => i.vol < i.vol0 * 0.5, head: 'Halb geschafft', text: () => 'Big Bruno ist nur noch halb so groß. Auf der Erde jubeln sie schon ein bisschen.' },
  { id: 'tag60', when: (S) => S.day >= 60, head: 'Noch 30 Tage', text: (S, i) => i.vol > sollVol(i.vol0, dayF(S)) ? 'Ihr hängt hinterher. Schwarze Löcher und Drohnen schaffen mehr als Hacken.' : 'Ihr liegt gut in der Zeit. Weiter so!' },
  { id: 'tag85', when: (S) => S.day >= 85, head: 'Noch fünf Tage', text: (S, i) => `Noch ${fmt(Math.max(0, i.vol - goalVol(i.vol0)))} m³ bis zur Verglühgrenze. Alles, was ihr habt.` },
  { id: 'tag90', when: (S) => S.day >= 90, head: 'TAG 90 · DER LETZTE', text: () => 'Heute Abend trifft er ein. Alle Mann raus.' },
];
export function pendingMsgs(S, info) { const out = []; for (const m of MSGS) if (!S.msgs[m.id] && m.when(S, info)) { S.msgs[m.id] = 1; out.push({ id: m.id, head: m.head, text: m.text(S, info) }); } return out; }

// Aufgaben oben rechts (führen durchs Spiel). x = { mine (m³ von mir), cargo (kg), inShip, sold, vol, vol0 }
export const QUESTS = [
  { t: 'Raus auf Big Bruno', d: 'Geh zur runden Luftschleuse hinten in der Halle und drück <kbd>E</kbd>.', done: (S, x) => x.out || x.mine > 0 || S.stats.sold > 0 },
  { t: 'Hack Stein ab', d: 'Linksklick mit der Spitzhacke auf den Boden. Jeder Kubikmeter zählt.', done: (S, x) => x.mine >= 2 || S.stats.sold > 0 },
  { t: 'Sammle Erz', d: 'Blau ist Eis, rot ist Eisenerz, goldene Adern sind Gold. Hack sie ab, sie landen im Rucksack.', done: (S, x) => x.cargo >= 4 || S.stats.sold > 0 },
  { t: 'Zurück zum Schiff', d: 'Halte <kbd>R</kbd>: Das Schiff holt dich mit dem Strahl hoch. Drinnen füllt sich auch die Luft auf.', done: (S, x) => (x.inShip && x.cargo >= 4) || S.stats.sold > 0 },
  { t: 'Erz abgeben', d: 'Im Handelsdepot rechts: Kipp den Rucksack in die Erzannahme (oranger Trichter), <kbd>E</kbd>.', done: (S) => S.stats.sold > 0 },
  { t: 'Kauf den Schlaghammer', d: 'Ab 80 m³ abgebaut (Rang links unten) am Terminal neben dem Trichter (<kbd>E</kbd>). Taste <kbd>2</kbd> nimmt ihn in die Hand.', done: (S) => !!S.owned.hammer },
  { t: 'Kauf den Bohrer', d: 'Ab 500 m³. Gedrückt halten, er frisst sich durch den Stein.', done: (S) => !!S.owned.bohrer },
  { t: 'Kauf den Laserschneider', d: 'Ab 4.000 m³. Damit schneidet ihr aus 28 m Entfernung. Vorher helfen Sprengladungen (Taste <kbd>8</kbd>, ab 1.500 m³).', done: (S) => !!S.owned.laser },
  { t: 'Drohnen aussetzen', d: 'Ab 10.000 m³ Drohnenschwarm kaufen, Taste <kbd>5</kbd>, Bake auf den Boden schießen.', done: (S) => S.swarms.length > 0 || S.stats.droneM3 > 0 },
  { t: 'Orbitalschlag', d: 'Ab Tag 15 und 40.000 m³: im Maschinenraum an der Orbit-Konsole (<kbd>E</kbd>) die Schiffswaffe reparieren, dann die Zielkamera öffnen und feuern. Draußen geht es auch mit Taste <kbd>7</kbd>.', done: (S) => (S.stats.orbitShots || 0) > 0 },
  { t: 'Rettet die Erde', d: 'Macht Big Bruno kleiner als die Verglühgrenze, bevor Tag 90 endet.', done: () => false },
];
// Drohnen liefern alles, was sie graben (2026-11-13, Lennox: „dass man die Erze vom Drohnenschwarm auch bekommt und das Gestein“):
// Erz voll (vorher nur 30 % als Geld), dazu Gestein als Schüttgut. Rückgabe: Erz je Sorte (kg), Gestein (kg), Wert (Cr)
export const ROCK = { id: 'gestein', name: 'Gestein', kg: 8, price: 0.25 };
export function droneHaul(mat) { const ore = oreOf(mat, 1); const rock = (mat[0] || 0) * ROCK.kg; return { ore, rock, value: oreValue(ore) + rock * ROCK.price }; }
