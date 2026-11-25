// Theos Seitenscheidel - Fahrzeugzustand, Schäden, Nitro (reine Logik, ohne Darstellung - bewusst netzwerkfähig: alles steckt in einem JSON-tauglichen Objekt `v`).
// Ablauf: tickVehicle() rechnet Temperatur, Flüssigkeiten und Belastung und löst Schäden aus; computePerf() macht daraus Leistungsfaktoren für sim.js;
// der Ingenieur (engineer.js) repariert über die Schritte `steps` eines Schadens. Neue Schäden = ein Eintrag in DEFS (+ Zeile in den Auslöser-Tabellen).

export const TOOLS = { wrench: 'Schraubenschlüssel', screwdriver: 'Schraubendreher', tireiron: 'Radkreuz', jack: 'Wagenheber', pliers: 'Zange', multimeter: 'Multimeter', brush: 'Bürste' };
export const PART_NAMES = { oil: 'Motoröl', coolant: 'Kühlmittel', sealant: 'Dichtmasse', fuelpump: 'Benzinpumpe', turbo: 'Turbolader', brakepads: 'Bremsbeläge', tire: 'Ersatzreifen', steerkit: 'Lenkungs-Set', gearkit: 'Getriebe-Set', fuse: 'Sicherung', filter: 'Luftfilter', radiator: 'Kühler', nitro: 'Nitroflasche', routerpsu: 'Router-Netzteil', battery: 'Batterie' };
export const START_PARTS = { oil: 3, coolant: 2, sealant: 3, fuelpump: 1, turbo: 1, brakepads: 2, tire: 2, steerkit: 1, gearkit: 1, fuse: 4, filter: 2, radiator: 1, nitro: 3, routerpsu: 2, battery: 2 };
export const HATCHES = { engine: 'Motorraum', brakes: 'Bremsanlage', chassis: 'Fahrwerk und Lenkung', wheelL: 'Radkasten links', wheelR: 'Radkasten rechts', fuse: 'Sicherungskasten' };
export const WHEEL_NAMES = ['vorne links', 'vorne rechts', 'hinten links', 'hinten rechts'];
export const NITRO_MAX = 3; export const NITRO_TIME = 4.6; export const NITRO_REFILL = 10; export const NITRO_CALL_TIME = 10;
export const MAX_ACTIVE_DAMAGES = 2; export const DAMAGE_COOLDOWN = 15; export const WRECK_LIMIT = 60; // länger als 60 s unrepariert = Totalschaden (nicht bei noWreck-Schäden wie dem WLAN-Router)

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Schrittbausteine einer Reparatur
const open = (h) => ({ k: 'open', h, label: `${HATCHES[h]} öffnen` });
const tool = (t, at, sec, label) => ({ k: 'tool', tool: t, at, sec, label });
const part = (p, at, sec, label) => ({ k: 'part', part: p, at, sec, label });
const confirm = () => ({ k: 'confirm', label: 'Reparatur am Display bestätigen' });

// Schadensarten. sev 1 = leicht, 2 = mittel, 3 = kritisch. steps(sev, wheel) liefert die Reparaturschritte.
// effect(d, p, v): verändert die Leistungsfaktoren p.  system: Zeile im Diagnosedisplay.  hatch: nötige Wartungsklappe (Anzeige)
export const DEFS = {
  oil_leak: { name: 'Ölverlust', title: 'ÖLDRUCK ZU NIEDRIG', text: 'Motorleistung sinkt. Ölleck abdichten und Öl nachfüllen.', system: 'oil', hatch: 'engine',
    steps: () => [open('engine'), part('sealant', 'leak', 2.0, 'Ölleck abdichten'), part('oil', 'oilcap', 2.5, 'Öl nachfüllen'), confirm()] },
  coolant_leak: { name: 'Kühlmittelleck', title: 'KÜHLMITTELVERLUST', text: 'Motor überhitzt schneller. Leck abdichten, Kühlmittel auffüllen.', system: 'coolant', hatch: 'engine',
    steps: () => [open('engine'), part('sealant', 'leak', 2.0, 'Leck abdichten'), part('coolant', 'coolcap', 2.5, 'Kühlmittel auffüllen'), confirm()] },
  overheat: { name: 'Motorüberhitzung', title: 'MOTOR ÜBERHITZT', text: 'Leistung bricht ein. Kühlsystem prüfen, Kühlmittel nachfüllen.', system: 'temp', hatch: 'engine',
    steps: () => [open('engine'), tool('pliers', 'radiator', 2.0, 'Kühlerschläuche prüfen'), part('coolant', 'coolcap', 2.5, 'Kühlkreislauf auffüllen'), confirm()] },
  fuel_pump: { name: 'Kraftstoffpumpe', title: 'KRAFTSTOFFZUFUHR GESTÖRT', text: 'Motor stottert und verliert Leistung. Pumpe diagnostizieren und tauschen.', system: 'fuel', hatch: 'engine',
    steps: () => [open('engine'), tool('multimeter', 'fuelpump', 1.5, 'Pumpe diagnostizieren'), tool('wrench', 'fuelpump', 2.5, 'Pumpe ausbauen'), part('fuelpump', 'fuelpump', 3.0, 'neue Pumpe einsetzen'), confirm()] },
  turbo: { name: 'Turbolader', title: 'TURBOLADER DEFEKT', text: 'Maximale Beschleunigung sinkt, Pfeifgeräusch. Turbolader tauschen.', system: 'engine', hatch: 'engine',
    steps: () => [open('engine'), tool('wrench', 'turbo', 2.5, 'Turbolader lösen'), part('turbo', 'turbo', 3.5, 'neuen Turbolader einsetzen'), tool('wrench', 'turbo', 1.5, 'Verschraubung festziehen'), confirm()] },
  engine_damage: { name: 'Motorschaden', title: 'MOTORSCHADEN', text: 'Motor läuft unruhig und verliert stark Leistung. Aufwendige Reparatur nötig.', system: 'engine', hatch: 'engine',
    steps: () => [open('engine'), tool('pliers', 'oilcap', 2.0, 'Zylinderkopf prüfen'), tool('wrench', 'mounts', 4.0, 'Zylinderkopfdichtung wechseln'), part('oil', 'oilcap', 2.5, 'frisches Öl einfüllen'), tool('screwdriver', 'airfilter', 2.5, 'Ansaugung prüfen'), confirm()] },
  air_filter: { name: 'Verstopfter Luftfilter', title: 'LUFTFILTER VERSTOPFT', text: 'Motorleistung sinkt. Filter reinigen.', system: 'engine', hatch: 'engine',
    steps: () => [open('engine'), tool('brush', 'airfilter', 2.5, 'Filter ausklopfen und reinigen'), confirm()] },
  engine_mount: { name: 'Lockere Motorhalterung', title: 'MOTORHALTERUNG LOCKER', text: 'Starke Vibrationen belasten den Motor. Halterung festziehen.', system: 'engine', hatch: 'engine',
    steps: () => [open('engine'), tool('wrench', 'mounts', 3.0, 'Motorhalterung festziehen'), confirm()] },
  radiator: { name: 'Beschädigter Kühler', title: 'KÜHLER BESCHÄDIGT', text: 'Motor überhitzt schneller. Kühler austauschen.', system: 'coolant', hatch: 'engine',
    steps: () => [open('engine'), part('radiator', 'radiator', 4.0, 'neuen Kühler einbauen'), part('coolant', 'coolcap', 2.0, 'Kühlmittel auffüllen'), confirm()] },
  brake_fail: { name: 'Bremsenausfall', title: 'BREMSEN AUSGEFALLEN', text: 'Bremsleistung stark reduziert! Bremsbeläge an der Bremsanlage tauschen.', system: 'brakes', hatch: 'brakes',
    steps: () => [open('brakes'), tool('wrench', 'brakedisc', 2.5, 'Bremssattel lösen'), part('brakepads', 'brakedisc', 3.0, 'neue Beläge einsetzen'), tool('wrench', 'brakedisc', 1.5, 'Bremssattel festziehen'), confirm()] },
  brake_fade: { name: 'Überhitzte Bremsen', title: 'BREMSEN ÜBERHITZT', text: 'Bremsleistung lässt nach. Weniger bremsen, Bremsanlage säubern und kühlen.', system: 'brakes', hatch: 'brakes',
    steps: () => [open('brakes'), tool('brush', 'brakedisc', 3.0, 'Bremsanlage säubern und kühlen'), confirm()] },
  tire: { name: 'Reifenschaden', title: 'REIFENSCHADEN', text: 'Wagen zieht zur Seite und verliert Grip. Reifen wechseln.', system: 'tires', hatch: 'wheelL',
    steps: (sev, w) => { const h = w % 2 === 0 ? 'wheelL' : 'wheelR'; const at = w % 2 === 0 ? 'wheelnutsL' : 'wheelnutsR'; return [open(h), tool('jack', at, 2.5, 'Wagen anheben'), tool('tireiron', at, 3.0, 'Radmuttern lösen, Reifen abnehmen'), part('tire', at, 3.0, 'Ersatzreifen aufsetzen'), tool('tireiron', at, 2.0, 'Radmuttern festziehen'), confirm()]; } },
  steering: { name: 'Lenkungsdefekt', title: 'LENKUNG DEFEKT', text: 'Lenkung reagiert verzögert und ungleichmäßig. Lenkgetriebe prüfen.', system: 'steering', hatch: 'chassis',
    steps: () => [open('chassis'), tool('multimeter', 'steerrack', 1.5, 'Lenkung prüfen'), part('steerkit', 'steerrack', 4.0, 'Lenkgetriebe tauschen'), confirm()] },
  gearbox: { name: 'Getriebeschaden', title: 'GETRIEBESCHADEN', text: 'Gangwechsel ruckeln, Beschleunigung leidet. Getriebe reparieren.', system: 'gearbox', hatch: 'chassis',
    steps: () => [open('chassis'), tool('wrench', 'gearbox', 2.5, 'Getriebe öffnen'), part('gearkit', 'gearbox', 4.0, 'Getriebe-Set einbauen'), confirm()] },
  battery: { name: 'Batterieproblem', title: 'BATTERIESPANNUNG ZU NIEDRIG', text: 'Licht flackert, Anlasser schwach, Motor setzt aus. Batterie messen und tauschen.', system: 'electrics', hatch: 'fuse',
    steps: () => [open('fuse'), tool('multimeter', 'fuses', 1.5, 'Batteriespannung messen'), part('battery', 'fuses', 2.5, 'Batterie tauschen'), confirm()] },
  router: { name: 'WLAN-Router gestört', title: 'WLAN-ROUTER GESTÖRT', text: 'Das Tablet des Navigators verliert das Signal (Rauschen, Aussetzer). Das Auto bleibt heil – Router oben an der Decke reparieren.', system: 'wifi', hatch: null, noWreck: true,
    steps: () => [tool('multimeter', 'router', 1.5, 'Signalstärke am Router messen'), tool('screwdriver', 'routerant', 2.0, 'Antennen festschrauben'), part('routerpsu', 'router', 2.5, 'Router-Netzteil tauschen'), confirm()] },
  electrics: { name: 'Elektrischer Fehler', title: 'ELEKTRIK GESTÖRT', text: 'Anzeigen flackern, Nitro zündet verzögert. Sicherungen prüfen.', system: 'electrics', hatch: 'fuse',
    steps: () => [open('fuse'), tool('multimeter', 'fuses', 2.0, 'Sicherungen durchmessen'), part('fuse', 'fuses', 1.5, 'Sicherung tauschen'), confirm()] },
};
// kritisch = schwerer Schaden (Stufe 3, z. B. Motorschaden): löst Sirene/Blinken aus
export const isCritical = (d) => d.sev >= 3;
export const DAMAGE_IDS = Object.keys(DEFS);
export const SEV_NAMES = ['', 'leicht', 'mittel', 'KRITISCH'];

// ---------------------------------------------------------------- Zustand
export function createVehicle({ seed = 12345, damageScale = 1, infNitro = false } = {}) {
  return {
    infNitro, time: 0, seed, rngN: 0, damageScale, wreckLimit: WRECK_LIMIT, cool: 12, nextEvent: 17, hist: [], wrecked: null, odo: 0, // 12 s Schonfrist am Anfang
    fluids: { oil: 1, coolant: 1, fuel: 1 }, temp: 62, brakeTemp: 35, engineHealth: 1,
    stress: { rev: 0, offroad: 0, mud: 0, turbo: 0 },
    damages: [], parts: { ...START_PARTS }, warnQueue: [], log: [], fixed: 0,
    nitro: { state: 'ready', uses: 0, t: 0, igniteDelay: 0, callT: 0 },
    nitroArmed: false,
  };
}
// deterministische Zufallszahlen aus dem Seed (Zustand serialisierbar: nur die Zähler rngN)
export function rnd(v) { v.rngN++; return mulberry(v.seed + v.rngN * 7919)(); }
const logMsg = (v, text, kind = 'info') => { v.log.push({ t: v.time, text, kind }); if (v.log.length > 30) v.log.shift(); };
export const hasDamage = (v, id) => v.damages.find((d) => d.id === id) || null;

// Schäden, die den Wagen kaputtmachen können (zählen für Obergrenze und Totalschaden); der WLAN-Router zählt nicht dazu
export const activeCount = (v) => v.damages.filter((d) => !DEFS[d.id].noWreck).length;
// Schaden entstehen lassen (nur wenn Schonfrist/Obergrenze es erlauben, außer force)
export function spawn(v, id, sev = 1, { force = false, wheel = 0, reason = '' } = {}) {
  const def = DEFS[id]; if (!def) return null;
  if (!force && (v.damageScale <= 0 || v.cool > 0 || activeCount(v) >= MAX_ACTIVE_DAMAGES || v.wrecked)) return null;
  if (!force && id !== 'tire' && v.hist.slice(-2).includes(id)) return null; // dieselbe Störung nicht gleich wieder (Abwechslung)
  const old = hasDamage(v, id);
  if (old && id !== 'tire') { if (sev > old.sev) { old.sev = Math.min(3, sev); v.warnQueue.push({ id, sev: old.sev, title: def.title, text: def.text, upgrade: true, critical: old.sev >= 3 }); } return null; }
  const d = { id, sev: clamp(Math.round(sev), 1, 3), t0: v.time, step: 0, prog: 0, wheel, reason, steps: def.steps(sev, wheel) };
  d.limit = v.wreckLimit;
  d.hatch = d.steps[0] && d.steps[0].k === 'open' ? d.steps[0].h : def.hatch;
  v.damages.push(d); if (!def.noWreck) v.cool = DAMAGE_COOLDOWN; v.hist.push(id); if (v.hist.length > 12) v.hist.shift();
  v.warnQueue.push({ id, sev: d.sev, title: id === 'tire' ? `${def.title} (${WHEEL_NAMES[wheel]})` : def.title, text: def.text, quiet: !!def.noWreck, critical: d.sev >= 3 });
  logMsg(v, `${def.name} (${SEV_NAMES[d.sev]})${reason ? ' – ' + reason : ''}`, d.sev >= 3 ? 'crit' : 'warn');
  return d;
}
// Restzeit bis zum Totalschaden
export const damageLeft = (v, d) => Math.max(0, (d.limit || v.wreckLimit) - (v.time - d.t0));
// knappster Schaden: { d, left (s) } oder null
export function urgentDamage(v) { let best = null; for (const d of v.damages) { if (DEFS[d.id].noWreck) continue; const left = damageLeft(v, d); if (!best || left < best.left) best = { d, left, limit: d.limit || v.wreckLimit }; } return best; }
export function repairProgress(d) { const total = d.steps.reduce((a, s) => a + (s.sec || 0.5), 0); let done = 0; d.steps.forEach((s, i) => { if (i < d.step) done += s.sec || 0.5; else if (i === d.step) done += (s.sec || 0.5) * d.prog; }); return clamp(done / total, 0, 1); }
export function repairSeconds(d) { return d.steps.reduce((a, s) => a + (s.sec || 0.6), 0); }

// Reparatur abgeschlossen: Nebenwirkungen anwenden und Schaden entfernen
export function fixDamage(v, d) {
  const i = v.damages.indexOf(d); if (i < 0) return false; v.damages.splice(i, 1); v.fixed++;
  switch (d.id) {
    case 'oil_leak': v.fluids.oil = 1; break;
    case 'coolant_leak': v.fluids.coolant = 1; v.temp = Math.max(70, v.temp - 12); break;
    case 'overheat': v.fluids.coolant = 1; v.temp = Math.min(v.temp, 82); v.engineHealth = Math.min(1, v.engineHealth + 0.1); break;
    case 'radiator': v.fluids.coolant = 1; break;
    case 'brake_fade': v.brakeTemp = Math.min(v.brakeTemp, 120); break;
    case 'brake_fail': v.brakeTemp = Math.min(v.brakeTemp, 150); break;
    case 'engine_damage': v.engineHealth = 1; v.fluids.oil = 1; v.stress.turbo = 0; break;
    case 'turbo': v.stress.turbo = 0; break;
    case 'gearbox': v.stress.rev = 0; break;
    case 'air_filter': v.stress.mud = 0; break;
    default: break;
  }
  logMsg(v, `${DEFS[d.id].name} repariert`, 'ok'); v.warnQueue.push({ id: d.id, fixed: true, title: DEFS[d.id].name, text: 'Repariert.' });
  return true;
}
export function consumePart(v, p) { if (p === 'nitro' && v.infNitro) return true; if ((v.parts[p] || 0) <= 0) return false; v.parts[p]--; return true; }

// ---------------------------------------------------------------- Nitro
// Nur der Ingenieur zündet - wann und wo er will (Hebel scharf, Knopf). Der Fahrer kann höchstens rufen ("Zünd Nitro" / Taste): das ist ein Zuruf, keine Freigabe.
// Höchstens NITRO_MAX Aktivierungen pro Rennen; nach jeder Nutzung Flasche tauschen + 10 s Druckaufbau.
export function nitroStatus(v) {
  const n = v.nitro; const left = v.infNitro ? NITRO_MAX : NITRO_MAX - n.uses;
  const text = { ready: n.callT > 0 ? 'FAHRER RUFT: NITRO!' : (v.infNitro ? 'NITRO BEREIT (unendlich)' : `NITRO BEREIT (${left} von ${NITRO_MAX})`), igniting: 'NITRO ZÜNDET …', active: 'NITRO AKTIV', empty: 'NITRO LEER – Flasche tauschen', refilling: `NITRO LÄDT – ${Math.ceil(n.t)} s`, spent: `KEINE NITRO-AKTIVIERUNGEN MEHR (${n.uses}/${NITRO_MAX})` }[n.state];
  return { state: n.state, uses: n.uses, left, t: n.t, text, call: n.state === 'ready' && n.callT > 0 };
}
// Zuruf des Fahrers an den Ingenieur
export function requestNitro(v) {
  const n = v.nitro;
  if (n.state === 'ready') { n.callT = NITRO_CALL_TIME; logMsg(v, 'Fahrer ruft nach Nitro', 'info'); return { ok: true, msg: 'ZURUF: NITRO! (der Ingenieur entscheidet)' }; }
  if (n.state === 'igniting') return { ok: false, msg: 'Nitro zündet gerade' };
  if (n.state === 'active') return { ok: false, msg: 'Nitro läuft bereits' };
  return { ok: false, msg: nitroStatus(v).text };
}
// Zündung durch den Ingenieur (Knopf), jederzeit; bei Elektrikfehler mit Verzögerung
export function igniteNitro(v) {
  const n = v.nitro; if (n.state !== 'ready') return { ok: false, msg: nitroStatus(v).text };
  if (!v.nitroArmed) return { ok: false, msg: 'Nitro-Hebel erst scharf schalten' };
  if (hasDamage(v, 'electrics')) { n.state = 'igniting'; n.igniteDelay = 2.5; return { ok: true, msg: 'Zündung verzögert (Elektrikfehler) …' }; }
  startNitro(v); return { ok: true, msg: 'NITRO GEZÜNDET' };
}
function startNitro(v) { const n = v.nitro; n.state = 'active'; n.t = NITRO_TIME; n.uses++; n.age = 0; n.callT = 0; v.nitroArmed = false; v.stress.turbo += 8; logMsg(v, v.infNitro ? 'Nitro gezündet' : `Nitro gezündet (${n.uses}/${NITRO_MAX})`, 'info'); }
// leere Flasche gegen volle tauschen -> 10 s auffüllen
export function installNitroBottle(v) {
  const n = v.nitro; if (n.state !== 'empty') return { ok: false, msg: n.state === 'spent' ? nitroStatus(v).text : 'Die Flasche ist nicht leer' };
  if (!consumePart(v, 'nitro')) return { ok: false, msg: 'Keine Nitroflasche mehr im Regal' };
  n.state = 'refilling'; n.t = NITRO_REFILL; return { ok: true, msg: 'Neue Flasche eingesetzt – Druckaufbau 10 s' };
}
export function nitroEnvelope(v) { const n = v.nitro; if (n.state !== 'active') return 0; const age = NITRO_TIME - n.t; return clamp(Math.min(age / 0.35, n.t / 0.7), 0, 1); }
function nitroTick(v, dt) {
  const n = v.nitro;
  if (n.state === 'ready') n.callT = Math.max(0, n.callT - dt);
  else if (n.state === 'igniting') { n.igniteDelay -= dt; if (n.igniteDelay <= 0) startNitro(v); }
  else if (n.state === 'active') { n.t -= dt; if (n.t <= 0) { n.t = 0; n.state = n.uses >= NITRO_MAX && !v.infNitro ? 'spent' : 'empty'; logMsg(v, n.state === 'spent' ? 'Letzte Nitro-Flasche verbraucht' : 'Nitroflasche leer', 'warn'); } }
  else if (n.state === 'refilling') { n.t -= dt; if (n.t <= 0) { n.t = 0; n.state = 'ready'; logMsg(v, 'Nitro wieder bereit', 'ok'); } }
}

// ---------------------------------------------------------------- Tick: Temperatur, Flüssigkeiten, Auslöser
// c: { u (m/s), throttle, brake, rpm, ay, surface, impacts: [m/s], offroad }
const IMPACT_TABLE = [['oil_leak', 0.22], ['coolant_leak', 0.14], ['radiator', 0.12], ['engine_mount', 0.18], ['steering', 0.12], ['brake_fail', 0.08], ['tire', 0.18], ['electrics', 0.06]];
const RANDOM_TABLE = [['fuel_pump', 0.25], ['electrics', 0.2], ['turbo', 0.12], ['tire', 0.15], ['air_filter', 0.08], ['oil_leak', 0.08], ['engine_mount', 0.06]];
// Ereignis-Regisseur: alle zufälligen Schäden gleich wahrscheinlich, aber kürzlich Dagewesenes fast nie
const EVENT_IDS = ['router', 'oil_leak', 'coolant_leak', 'fuel_pump', 'turbo', 'air_filter', 'engine_mount', 'radiator', 'brake_fail', 'tire', 'steering', 'gearbox', 'electrics'];
function pickVariety(v) { const recent = v.hist.slice(-6); const table = EVENT_IDS.map((id) => [id, recent.includes(id) ? 0.02 : 1]); return pick(v, table); }
function pick(v, table) { let sum = 0; for (const [, w] of table) sum += w; let r = rnd(v) * sum; for (const [id, w] of table) { r -= w; if (r <= 0) return id; } return table[0][0]; }
export function tickVehicle(v, c, dt) {
  if (v.wrecked) return; v.time += dt; v.cool = Math.max(0, v.cool - dt); v.odo += Math.abs(c.u || 0) * dt;
  const u = Math.abs(c.u || 0); const th = c.throttle || 0; const nit = v.nitro.state === 'active';
  // Flüssigkeiten
  const oilLeak = hasDamage(v, 'oil_leak'); const cLeak = hasDamage(v, 'coolant_leak'); const rad = hasDamage(v, 'radiator');
  if (oilLeak) v.fluids.oil = Math.max(0, v.fluids.oil - 0.011 * oilLeak.sev * dt);
  if (cLeak) v.fluids.coolant = Math.max(0, v.fluids.coolant - 0.013 * cLeak.sev * dt);
  if (rad) v.fluids.coolant = Math.max(0, v.fluids.coolant - 0.004 * rad.sev * dt);
  v.fluids.fuel = Math.max(0.15, v.fluids.fuel - dt * (0.0003 + 0.0009 * th));
  // Motortemperatur: Wärme aus Last, Kühlung aus Kühlmittel, Kühler und Fahrtwind
  const heat = 0.6 + 2.0 * th * clamp((c.rpm || 3000) / 6000, 0.3, 1.3) + (nit ? 4.2 : 0) + (hasDamage(v, 'engine_mount') ? 0.25 : 0) + (v.fluids.oil < 0.3 ? 0.8 : 0);
  const cool = 0.045 * (0.3 + 0.7 * v.fluids.coolant) * (rad ? 0.6 : 1) * (0.72 + 0.28 * clamp(u / 30, 0, 1));
  v.temp += (heat - cool * (v.temp - 45)) * dt;
  // Bremsen
  v.brakeTemp += (clamp(c.brake || 0, 0, 1) * u * 1.5 - (0.035 + 0.0022 * u) * (v.brakeTemp - 30)) * dt;
  v.brakeTemp = Math.max(30, v.brakeTemp);
  // Motorverschleiß bei Überhitzung / Ölmangel
  if (v.temp > 132 || v.fluids.oil < 0.08) v.engineHealth = Math.max(0, v.engineHealth - (v.temp > 132 ? 0.012 : 0.01) * dt);
  nitroTick(v, dt);
  // Dauerbelastung
  if ((c.rpm || 0) > 6900 && th > 0.5) v.stress.rev += dt; else v.stress.rev = Math.max(0, v.stress.rev - dt * 0.2);
  if (th > 0.9 && (c.rpm || 0) > 5500) v.stress.turbo += dt; else v.stress.turbo = Math.max(0, v.stress.turbo - dt * 0.3);
  if (c.surface === 'mud' && u > 5) v.stress.mud += dt * u / 22; else if (c.surface === 'grass' && u > 5) v.stress.mud += dt * u / 60;
  if (c.offroad && u > 12) v.stress.offroad += dt * u / 28; else v.stress.offroad = Math.max(0, v.stress.offroad - dt * 0.4);
  if (v.damageScale <= 0) return;
  // deterministische Auslöser (Belastungsgrenzen)
  if (v.temp > 121 && !hasDamage(v, 'overheat')) spawn(v, 'overheat', v.temp > 132 ? 3 : v.temp > 126 ? 2 : 1, { reason: `${Math.round(v.temp)} °C`, force: v.damages.length < MAX_ACTIVE_DAMAGES + 1 });
  if (v.engineHealth < 0.55 && !hasDamage(v, 'engine_damage')) spawn(v, 'engine_damage', v.engineHealth < 0.3 ? 3 : 2, { reason: 'Überlastung', force: true });
  if (v.brakeTemp > 520 && !hasDamage(v, 'brake_fade')) spawn(v, 'brake_fade', v.brakeTemp > 650 ? 3 : 2, { reason: 'zu viel gebremst', force: true });
  const bf = hasDamage(v, 'brake_fade'); if (bf && v.brakeTemp < 240 && bf.step === 0) { v.damages.splice(v.damages.indexOf(bf), 1); logMsg(v, 'Bremsen abgekühlt', 'ok'); v.warnQueue.push({ id: 'brake_fade', fixed: true, title: 'Bremsen', text: 'Bremsen sind abgekühlt.' }); }
  if (v.stress.rev > 14) { v.stress.rev = 0; spawn(v, 'gearbox', 2, { reason: 'zu hohe Drehzahl' }); }
  if (v.stress.turbo > 38) { v.stress.turbo = 0; spawn(v, 'turbo', 2, { reason: 'Dauerlast und Nitro' }); }
  if (v.stress.mud > 16) { v.stress.mud = 0; spawn(v, 'air_filter', 2, { reason: 'Schlamm' }); }
  if (v.stress.offroad > 5) { v.stress.offroad = 0; spawn(v, rnd(v) < 0.6 ? 'tire' : 'steering', 1 + (rnd(v) < 0.3 ? 1 : 0), { wheel: Math.floor(rnd(v) * 4), reason: 'Gelände' }); }
  // harte Stöße (Baum-Bump, Randstein): Wahrscheinlichkeit wächst mit der Aufprallgeschwindigkeit
  for (const s of c.impacts || []) {
    if (s < 3.5) continue; const p = clamp((s - 3.5) / 14, 0, 0.75) * v.damageScale;
    if (rnd(v) < p) { const id = pick(v, IMPACT_TABLE); spawn(v, id, s > 9 ? 2 : 1, { wheel: Math.floor(rnd(v) * 4), reason: `Stoß mit ${Math.round(s * 3.6)} km/h` }); }
  }
  // Regisseur: in unregelmäßigen Abständen eine Störung aus der ganzen Palette (nicht dieselbe wie zuletzt)
  if (v.time >= v.nextEvent && v.cool <= 0 && activeCount(v) < MAX_ACTIVE_DAMAGES) { v.nextEvent = v.time + (13 + rnd(v) * 14) / Math.max(0.5, v.damageScale); const id = pickVariety(v); const sev = id === 'engine_damage' ? 3 : rnd(v) < 0.4 ? 2 : 1; spawn(v, id, sev, { wheel: Math.floor(rnd(v) * 4), reason: 'Verschleiß' }); }
  else if (v.time > 20 && rnd(v) < dt * v.damageScale * (0.003 + 0.006 * th)) spawn(v, pick(v, RANDOM_TABLE), 1, { wheel: Math.floor(rnd(v) * 4), reason: 'Verschleiß' });
  // Totalschaden: zu lange nicht repariert
  for (const d of v.damages) {
    if (DEFS[d.id].noWreck || v.time - d.t0 < (d.limit || v.wreckLimit)) continue;
    v.wrecked = { id: d.id, name: DEFS[d.id].name, t: v.time }; logMsg(v, `TOTALSCHADEN: ${DEFS[d.id].name} nicht rechtzeitig repariert`, 'crit'); break;
  }
}

// ---------------------------------------------------------------- Auswirkungen auf das Fahrzeug
export const NEUTRAL_PERF = { power: 1, vmax: 1, brake: 1, grip: 1, steerBias: 0, steerResp: 1, shake: 0, whistle: 0, flicker: 0, sputter: 0, gearJerk: 0, nitro: 0, nitroSteer: 1, smoke: 0, steam: 0, oilFilm: 0, cut: 0, alarm: 0, urgency: 0, signal: 0 };
// periodischer Impuls: 1 während des ersten Teils (width) jeder Periode
const pulse = (t, period, width, off = 0) => (((t + off) % period) + period) % period < period * width ? 1 : 0;
export function computePerf(v) {
  const p = { ...NEUTRAL_PERF }; const t = v.time;
  // Flüssigkeiten und Temperatur
  const oil = v.fluids.oil; if (oil < 0.45) { p.power *= 0.5 + 0.5 * (oil / 0.45); p.smoke = Math.max(p.smoke, 0.5 * (1 - oil / 0.45)); }
  if (v.temp > 112) { p.power *= clamp(1 - (v.temp - 112) / 55, 0.45, 1); p.steam = Math.max(p.steam, clamp((v.temp - 108) / 28, 0, 1)); }
  if (v.engineHealth < 0.8) p.power *= 0.7 + 0.3 * (v.engineHealth / 0.8);
  if (v.brakeTemp > 340) p.brake *= clamp(1 - (v.brakeTemp - 340) / 420, 0.45, 1);
  let cut = 0;
  for (const d of v.damages) {
    const s = d.sev;
    switch (d.id) {
      case 'air_filter': p.power *= 1 - 0.11 * s; p.sputter = Math.max(p.sputter, 0.3 + 0.15 * s); p.smoke = Math.max(p.smoke, 0.14 * s); break;
      case 'oil_leak': p.power *= 1 - 0.07 * s; p.smoke = Math.max(p.smoke, 0.22 * s); p.oilFilm = Math.max(p.oilFilm, 0.3 * s); break;
      case 'coolant_leak': p.steam = Math.max(p.steam, 0.22 * s); break;
      case 'radiator': p.steam = Math.max(p.steam, 0.28 * s); break;
      case 'overheat': p.power *= 1 - 0.1 * s; p.steam = Math.max(p.steam, 0.5 + 0.17 * s); p.shake = Math.max(p.shake, 0.25); break;
      case 'fuel_pump': p.power *= 1 - 0.14 * s; p.sputter = Math.max(p.sputter, 0.5 + 0.15 * s); cut = Math.max(cut, pulse(t, 3.4 - 0.5 * s, 0.1 + 0.05 * s) * 0.92); p.shake = Math.max(p.shake, 0.18); break;
      case 'turbo': p.power *= 1 - 0.12 * s; p.vmax *= 1 - 0.07 * s; p.whistle = Math.max(p.whistle, 0.5 + 0.2 * s); break;
      case 'gearbox': p.power *= 1 - 0.09 * s; p.gearJerk = Math.max(p.gearJerk, 0.4 + 0.2 * s); cut = Math.max(cut, pulse(t, 2.9 - 0.4 * s, 0.09 + 0.03 * s) * 0.85); break;
      case 'engine_damage': p.power *= 0.45; p.vmax *= 0.85; p.shake = Math.max(p.shake, 0.7); p.sputter = Math.max(p.sputter, 0.9); p.smoke = Math.max(p.smoke, 0.65 + 0.1 * s); cut = Math.max(cut, pulse(t, 4.6, 0.07) * 0.8); break;
      case 'engine_mount': p.shake = Math.max(p.shake, 0.4 * s); break;
      case 'steering': p.steerResp *= 0.72 - 0.12 * s; p.steerBias += (Math.sin(t * 1.3 + 1) * 0.07 + (pulse(t, 4.2, 0.12) * (Math.sin(t * 0.7) > 0 ? 1 : -1)) * 0.17) * s; p.shake = Math.max(p.shake, 0.12 * s); break;
      case 'tire': p.grip *= 1 - 0.1 * s; p.steerBias += (d.wheel % 2 === 0 ? 1 : -1) * 0.08 * s; p.shake = Math.max(p.shake, 0.18 * s); break;
      case 'brake_fail': p.brake *= [1, 0.38, 0.22, 0.1][s]; break;
      case 'battery': p.flicker = Math.max(p.flicker, 0.35 + 0.2 * s); p.power *= 1 - 0.08 * s; cut = Math.max(cut, pulse(t, 7 - s, 0.05 + 0.02 * s) * 0.7); break;
      case 'router': p.signal = Math.max(p.signal, 0.45 + 0.2 * s); break;
      case 'electrics': p.flicker = Math.max(p.flicker, 0.4 + 0.25 * s); cut = Math.max(cut, pulse(t, 6 - s, 0.05 + 0.02 * s) * 0.6); break;
      default: break;
    }
  }
  p.cut = cut; p.power = clamp(p.power, 0.2, 1) * (1 - cut); p.nitro = nitroEnvelope(v);
  p.smoke = clamp(p.smoke, 0, 1); p.steam = clamp(p.steam, 0, 1); p.oilFilm = clamp(p.oilFilm, 0, 1);
  for (const d of v.damages) { if (DEFS[d.id].noWreck) continue; p.alarm = Math.max(p.alarm, d.sev); p.urgency = Math.max(p.urgency, clamp((v.time - d.t0) / (d.limit || v.wreckLimit), 0, 1)); }
  if (p.nitro > 0) p.nitroSteer = 1 - 0.35 * p.nitro; // bei Nitro-Tempo reagiert der Wagen nervöser
  return p;
}

// Zeilen fürs Diagnosedisplay: { key, name, value 0..1 (1 = gut), text, level: 'ok'|'warn'|'crit' }
export function diagnostics(v) {
  const lvl = (good, warn, crit) => (good >= warn ? 'ok' : good >= crit ? 'warn' : 'crit');
  const has = (id) => hasDamage(v, id);
  const rows = [];
  rows.push({ key: 'engine', name: 'Motor', value: v.engineHealth * (has('engine_damage') ? 0.5 : 1), text: has('engine_damage') ? 'SCHADEN' : has('turbo') ? 'Turbo defekt' : has('air_filter') ? 'Filter verstopft' : has('engine_mount') ? 'Halterung lose' : 'in Ordnung' });
  rows.push({ key: 'oil', name: 'Ölstand', value: v.fluids.oil, text: `${Math.round(v.fluids.oil * 100)} %${has('oil_leak') ? ' LECK' : ''}` });
  rows.push({ key: 'temp', name: 'Motortemp.', value: clamp(1 - (v.temp - 80) / 60, 0, 1), text: `${Math.round(v.temp)} °C` });
  rows.push({ key: 'coolant', name: 'Kühlmittel', value: v.fluids.coolant, text: `${Math.round(v.fluids.coolant * 100)} %${has('coolant_leak') ? ' LECK' : has('radiator') ? ' KÜHLER' : ''}` });
  rows.push({ key: 'fuel', name: 'Kraftstoff', value: has('fuel_pump') ? 0.45 : v.fluids.fuel, text: has('fuel_pump') ? 'Pumpe defekt' : `${Math.round(v.fluids.fuel * 100)} %` });
  rows.push({ key: 'brakes', name: 'Bremsen', value: has('brake_fail') ? 0.2 : clamp(1 - (v.brakeTemp - 300) / 400, 0.15, 1), text: has('brake_fail') ? 'AUSGEFALLEN' : `${Math.round(v.brakeTemp)} °C${has('brake_fade') ? ' heiß' : ''}` });
  rows.push({ key: 'tires', name: 'Reifen', value: has('tire') ? 0.3 : 1, text: has('tire') ? `Schaden ${WHEEL_NAMES[has('tire').wheel]}` : 'in Ordnung' });
  rows.push({ key: 'steering', name: 'Lenkung', value: has('steering') ? 0.35 : 1, text: has('steering') ? 'DEFEKT' : 'in Ordnung' });
  rows.push({ key: 'gearbox', name: 'Getriebe', value: has('gearbox') ? 0.4 : 1, text: has('gearbox') ? 'DEFEKT' : 'in Ordnung' });
  rows.push({ key: 'wifi', name: 'Navi-Funk', value: has('router') ? 0.3 : 1, text: has('router') ? 'GESTÖRT' : 'Signal gut' });
  rows.push({ key: 'electrics', name: 'Elektrik', value: has('electrics') || has('battery') ? 0.35 : 1, text: has('electrics') ? 'GESTÖRT' : has('battery') ? 'BATTERIE schwach' : 'in Ordnung' });
  for (const r of rows) r.level = r.value >= 0.6 ? 'ok' : r.value >= 0.3 ? 'warn' : 'crit';
  rows.find((r) => r.key === 'temp').level = lvl(rows.find((r) => r.key === 'temp').value, 0.45, 0.2);
  return rows;
}
// Dringlichkeit: kritische zuerst, dann nach Schweregrad und Alter
export function sortedDamages(v) { return [...v.damages].sort((a, b) => (b.sev - a.sev) || (a.t0 - b.t0)); }
export function popWarning(v) { return v.warnQueue.shift() || null; }
