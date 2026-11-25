// Theos Seitenscheidel - Moonsweeper 2: Fabrik wie in Satisfactory (reine Logik, ohne Darstellung). Raster auf dem Fabrikgelände, drei Ebenen, Förderbänder, Lifte, Verteiler, Fusionierer, Maschinen.
// Weg der Ware: Staubannahme -> Bänder -> Maschinen -> Frachtrampe (verkauft). Richtungen: 0 = +z, 1 = +x, 2 = -z, 3 = -x. Blick in Richtung d: links ist (d + 1) % 4, rechts (d + 3) % 4.
import { LOT, MOON_SIZE } from './moonlogic.js';

export const DX = [0, 1, 0, -1]; export const DZ = [1, 0, -1, 0];
export const BELT_V = 12; // Zellen je Sekunde
export const KG_PER_DUST = 2; // eine Staubportion auf dem Band
export const INTAKE_MAX = 5000; // kg in der Staubannahme
const GAP = 0.5; // Mindestabstand auf dem Band (Zellenlängen)
export const SOLAR_KW = 60; export const GEN_KW = 320; export const GEN_BURN = 4; // Strom: kW je Anlage, Sekunden je Staubportion im Generator
export const MACHINE_KW = { press: 20, filler: 30, kiln: 60, packer: 40, palletizer: 70, fabricator: 90 };

// Ware: value = Grundwert in Credits (Rohstaub: 9 Cr/kg, also 18 Cr je Portion)
export const ITEMS = {
  dust: { name: 'Staubportion', value: 18 },
  briquette: { name: 'Mondstaub-Brikett', value: 90 },
  canister: { name: 'Mondstaub-Behälter', value: 160 },
  brick: { name: 'Mond-Brick', value: 240 },
  module: { name: 'Mondbau-Modul', value: 1000 },
  box: { name: 'Brick-Kiste', value: 1300 },
  pallet: { name: 'Mondstaub-Palette', value: 7500 },
};
export const ITEM_IDS = Object.keys(ITEMS);
export const RECIPES = {
  press: { in: [['dust', 3]], out: 'briquette', time: 2 },
  filler: { in: [['dust', 5]], out: 'canister', time: 2.5 },
  kiln: { in: [['briquette', 2]], out: 'brick', time: 3 },
  fabricator: { in: [['brick', 2], ['canister', 1]], out: 'module', time: 5 },
  packer: { in: [['brick', 4]], out: 'box', time: 3.5 },
  palletizer: { in: [['box', 4]], out: 'pallet', time: 4 },
};
// Teile im Technikladen: pack = Stückzahl je Kauf, group = Reiter, ground = nur auf dem Boden, block = Spieler läuft nicht hindurch
export const PARTS = [
  { id: 'belt', name: 'Förderband', group: 'log', price: 12, pack: 10, desc: 'Transportiert alles. Beim Bauen einfach die Maus gedrückt halten und ziehen.' },
  { id: 'lift', name: 'Lift', group: 'log', price: 350, pack: 1, block: true, desc: 'Hebt Ware eine Ebene hoch oder runter. So kreuzen sich Bänder.' },
  { id: 'split', name: 'Verteiler', group: 'log', price: 260, pack: 1, desc: 'Teilt ein Band gerecht auf bis zu drei Bänder auf.' },
  { id: 'merge', name: 'Fusionierer', group: 'log', price: 260, pack: 1, desc: 'Führt bis zu drei Bänder zu einem zusammen.' },
  { id: 'intake', name: 'Staubannahme', group: 'mach', price: 900, pack: 1, ground: true, block: true, desc: 'Hier kommt der Staub rein: Tank mit E einfüllen, sie legt ihn aufs Band.' },
  { id: 'dock', name: 'Frachtrampe', group: 'mach', price: 1500, pack: 1, ground: true, block: true, desc: 'Schickt alles zur Erde und verkauft es automatisch.' },
  { id: 'press', name: 'Staubpresse', group: 'mach', price: 1800, pack: 1, ground: true, block: true, desc: '3 Staub werden zu 1 Brikett.' },
  { id: 'filler', name: 'Abfüllanlage', group: 'mach', price: 2800, pack: 1, ground: true, block: true, desc: '5 Staub werden zu 1 Behälter.' },
  { id: 'kiln', name: 'Brennofen', group: 'mach', price: 7000, pack: 1, ground: true, block: true, desc: '2 Briketts werden zu 1 Mond-Brick.' },
  { id: 'fabricator', name: 'Fabrikator', group: 'mach', price: 16000, pack: 1, ground: true, block: true, desc: '2 Bricks und 1 Behälter werden zu 1 Mondbau-Modul.' },
  { id: 'packer', name: 'Kistenpacker', group: 'mach', price: 18000, pack: 1, ground: true, block: true, desc: '4 Bricks wandern in 1 Kiste.' },
  { id: 'palletizer', name: 'Palettierer', group: 'mach', price: 45000, pack: 1, ground: true, block: true, desc: '4 Kisten werden zu 1 Palette. Die Erde zahlt dafür richtig gut.' },
  { id: 'solar', name: 'Solaranlage', group: 'power', price: 1400, pack: 1, ground: true, block: true, size: 2, desc: `Liefert ${SOLAR_KW} kW. Auf dem Mond ist immer Sonne, hier jedenfalls.` },
  { id: 'generator', name: 'Mondstaub-Generator', group: 'power', price: 6500, pack: 1, ground: true, block: true, size: 2, desc: `Verbrennt Staub vom Band und liefert ${GEN_KW} kW. 1 Portion reicht ${GEN_BURN} Sekunden.` },
];
export const partById = (id) => PARTS.find((p) => p.id === id) || null;
const key = (x, z, l) => (l * 2000 + (z + 1000)) * 2000 + (x + 1000); // Zellen auch außerhalb des Geländes (negativ möglich)
const inLot = (x, z) => x >= 0 && z >= 0 && x < LOT.n && z < LOT.n;
// Staubannahme und Bänder (samt Verteiler/Fusionierer) dürfen auf der ganzen Karte stehen, Maschinen nur auf dem Fabrikgelände; außerhalb nur am Boden
const FREE = new Set(['belt', 'split', 'merge', 'intake']);
const inWorld = (x, z) => { const X = LOT.x + x * LOT.cell; const Z = LOT.z + z * LOT.cell; return X >= 0 && Z >= 0 && X < MOON_SIZE && Z < MOON_SIZE; };

export function createFactory() { return { ents: [], map: new Map(), seq: 1, rev: 1, helpers: false, made: {}, sold: {}, power: { supply: 0, demand: 0, k: 1 } }; }
export const at = (F, x, z, l) => F.map.get(key(x, z, l));
const spanOf = (e) => (e.t === 'lift' ? [e.l, e.l + 1] : partById(e.t).ground && inLot(e.x, e.z) ? [0, 1] : [e.l]);
// Alle Rasterfelder eines Teils (große Anlagen belegen 2 x 2)
export const sizeOf = (id) => partById(id).size || 1;
const cellsOf = (x, z, s) => { const c = []; for (let i = 0; i < s; i++) for (let j = 0; j < s; j++) c.push([x + i, z + j]); return c; };
const setKeys = (F, e, on) => { for (const q of spanOf(e)) for (const [x, z] of cellsOf(e.x, e.z, sizeOf(e.t))) { if (on) F.map.set(key(x, z, q), e); else F.map.delete(key(x, z, q)); } };

// Gibt den Grund zurück, warum hier nicht gebaut werden kann (oder null)
export function canPlace(F, id, x, z, l) {
  const P = partById(id); if (!P) return 'Unbekanntes Teil'; if (!inLot(x, z)) { if (!FREE.has(id)) return 'Maschinen nur auf dem Fabrikgelände'; if (l < 0 || l > 99) return 'Ebene 1 bis 100'; if (!inWorld(x, z)) return 'Außerhalb der Karte'; } if (P.ground && l !== 0 && inLot(x, z)) return 'Geht nur auf dem Boden';
  const levels = id === 'lift' ? [l, l + 1] : P.ground && inLot(x, z) ? [0, 1] : [l]; if (inLot(x, z) && levels[levels.length - 1] >= LOT.levels) return 'Zu hoch'; for (const [cx, cz] of cellsOf(x, z, P.size || 1)) { if (!inLot(cx, cz) && !FREE.has(id)) return 'Außerhalb des Fabrikgeländes'; for (const q of levels) if (F.map.has(key(cx, cz, q))) return 'Hier steht schon etwas'; } return null;
}
export function place(F, id, x, z, l, d) {
  if (canPlace(F, id, x, z, l)) return null;
  const e = { id: F.seq++, t: id, x, z, l, d, it: [] };
  if (id === 'split') e.rr = 0; if (id === 'intake') { e.kg = 0; e.cd = 0; } if (RECIPES[id]) { e.buf = {}; e.out = 0; e.prog = -1; } if (id === 'generator') { e.fuel = 0; e.burn = 0; }
  F.ents.push(e); setKeys(F, e, true); reshape(F); F.rev++; return e;
}
export function remove(F, e) { setKeys(F, e, false); F.ents.splice(F.ents.indexOf(e), 1); reshape(F); F.rev++; }
export function setDir(F, e, d) { e.d = d; reshape(F); F.rev++; }
export const blocks = (F) => { const c = LOT.cell; return F.ents.filter((e) => partById(e.t).block).map((e) => { const s = sizeOf(e.t); return { x: LOT.x + (e.x + s / 2) * c, z: LOT.z + (e.z + s / 2) * c, hx: c * s * 0.46, hz: c * s * 0.46 }; }); };
export const intakes = (F) => F.ents.filter((e) => e.t === 'intake');
export const intakeRoom = (F) => intakes(F).find((e) => e.kg < INTAKE_MAX) || null;
export function deposit(e, kg) { const take = Math.min(kg, INTAKE_MAX - e.kg); e.kg += take; return take; }

// Bandform: geradeaus, oder Kurve, wenn nur von einer Seite Ware kommt (1 = von links, 2 = von rechts)
function reshape(F) {
  for (const e of F.ents) if (e.t === 'belt') e.ins = [];
  const feed = (src, dir, l) => { const n = F.map.get(key(src.x + DX[dir], src.z + DZ[dir], l)); if (n && n.t === 'belt' && n.l === l) n.ins.push(dir); };
  for (const e of F.ents) { if (e.t === 'split') for (let d = 0; d < 4; d++) feed(e, d, e.l); else if (e.t === 'lift') { feed(e, e.d, e.l); feed(e, e.d, e.l + 1); } else if (e.t !== 'dock' && e.t !== 'solar' && e.t !== 'generator') feed(e, e.d, e.l); }
  for (const e of F.ents) { if (e.t !== 'belt') continue; const back = e.ins.includes(e.d); const left = e.ins.includes((e.d + 3) % 4); const right = e.ins.includes((e.d + 1) % 4); e.shape = !back && left && !right ? 1 : !back && right && !left ? 2 : 0; delete e.ins; }
}
const next = (F, e, d = e.d, l = e.l) => F.map.get(key(e.x + DX[d], e.z + DZ[d], l));
// Nimmt e die Ware k an? dir = Fahrtrichtung, lvl = Ebene der Quelle
function accept(F, e, k, dir, lvl, hooks) {
  if (e.t === 'belt') { if (dir === (e.d + 2) % 4) return false; const p0 = dir === e.d || e.shape ? 0 : 0.5; for (const q of e.it) if (Math.abs(q.p - p0) < GAP * 0.9) return false; e.it.push({ k, p: p0 }); e.it.sort((a, b) => b.p - a.p); return true; }
  if (e.t === 'lift') { if (dir !== e.d || e.it.length >= 2) return false; e.it.push({ k, p: 0, to: lvl === e.l ? e.l + 1 : e.l }); return true; }
  if (e.t === 'split') { if (e.it.length) return false; e.it.push({ k, p: 0, dir }); return true; }
  if (e.t === 'merge') { if (e.it.length || dir === (e.d + 2) % 4) return false; e.it.push({ k, p: 0 }); return true; }
  if (e.t === 'dock') { F.sold[k] = (F.sold[k] || 0) + 1; if (hooks.sold) hooks.sold(k, e); return true; }
  if (e.t === 'intake') { e.q = e.q || []; if (dir === (e.d + 2) % 4 || e.q.length >= 2) return false; e.q.push(k); return true; } // Eingang: Ware von hinten oder der Seite läuft durch, so lassen sich Annahmen hintereinander schalten
  if (e.t === 'generator') { if (k !== 'dust' || e.fuel >= 12) return false; e.fuel++; return true; }
  const r = RECIPES[e.t]; if (r) { const need = r.in.find((i) => i[0] === k); if (!need || dir === (e.d + 2) % 4 || (e.buf[k] || 0) >= need[1] * 3) return false; e.buf[k] = (e.buf[k] || 0) + 1; return true; }
  return false;
}
function tickEnt(F, e, h, hooks) {
  if (e.t === 'belt') {
    for (let i = 0; i < e.it.length; i++) { const q = e.it[i]; const max = i === 0 ? 1 : e.it[i - 1].p - GAP; q.p = Math.min(Math.max(q.p, max), q.p + BELT_V * h); if (q.p > max) q.p = Math.max(0, max); if (i === 0 && q.p >= 1) { const n = next(F, e); if (n && accept(F, n, q.k, e.d, e.l, hooks)) { e.it.shift(); i--; } } }
  } else if (e.t === 'lift') {
    for (const q of e.it.slice()) { q.p = Math.min(1, q.p + h / 0.11); if (q.p >= 1) { const n = next(F, e, e.d, q.to); if (n && accept(F, n, q.k, e.d, q.to, hooks)) e.it.splice(e.it.indexOf(q), 1); } }
  } else if (e.t === 'split') {
    const q = e.it[0]; if (q) { q.p = Math.min(1, q.p + h * 40); if (q.p >= 1) for (let i = 0; i < 3; i++) { const o = [0, 1, 3][(e.rr + i) % 3]; const d = (q.dir + o) % 4; const n = next(F, e, d); if (n && accept(F, n, q.k, d, e.l, hooks)) { e.rr = (e.rr + i + 1) % 3; e.it.length = 0; break; } } }
  } else if (e.t === 'merge') {
    const q = e.it[0]; if (q) { q.p = Math.min(1, q.p + h * 40); if (q.p >= 1) { const n = next(F, e); if (n && accept(F, n, q.k, e.d, e.l, hooks)) e.it.length = 0; } }
  } else if (e.t === 'intake') {
    e.cd -= h; if (e.q && e.q.length) { const n = next(F, e); if (n && accept(F, n, e.q[0], e.d, e.l, hooks)) e.q.shift(); } else if (e.kg >= KG_PER_DUST && e.cd <= 0) { const n = next(F, e); if (n && accept(F, n, 'dust', e.d, e.l, hooks)) { e.kg -= KG_PER_DUST; e.cd = 0.04; } }
  } else if (RECIPES[e.t]) {
    const r = RECIPES[e.t]; if (e.prog < 0 && e.out < 3 && r.in.every(([k, n]) => (e.buf[k] || 0) >= n)) { for (const [k, n] of r.in) e.buf[k] -= n; e.prog = 0; if (hooks.start) hooks.start(e); }
    if (e.prog >= 0) { e.prog += (h / r.time) * F.power.k; if (e.prog >= 1) { e.prog = -1; e.out++; F.made[r.out] = (F.made[r.out] || 0) + 1; } }
    if (e.out > 0) { const n = next(F, e); if (n && accept(F, n, r.out, e.d, e.l, hooks)) e.out--; }
  }
}
// Stromnetz: Alles auf dem Gelände hängt am selben Netz. Fehlt Strom, laufen alle Maschinen entsprechend langsamer, ohne Strom gar nicht.
function stepPower(F, h) {
  let solar = 0; let demand = 0; for (const e of F.ents) { if (e.t === 'solar') solar += SOLAR_KW; else if (RECIPES[e.t] && e.prog >= 0) demand += MACHINE_KW[e.t]; }
  let supply = solar; for (const e of F.ents) { if (e.t !== 'generator') continue; if (e.burn > 0) e.burn -= h; if (e.burn <= 0 && e.fuel > 0 && demand > supply) { e.fuel--; e.burn = GEN_BURN; } e.on = e.burn > 0; if (e.on) supply += GEN_KW; }
  F.power = { supply, demand, k: demand > 0 ? Math.min(1, supply / demand) : 1 };
}
export function stepFactory(F, dt, hooks = {}) { const h = Math.min(dt, 0.05); stepPower(F, h); for (const e of F.ents) tickEnt(F, e, h, hooks); }

// Kurzinfo für die Anzeige
export function statusOf(e, powerK = 1) {
  const P = partById(e.t); if (e.t === 'intake') return `${P.name}: ${Math.floor(e.kg)} kg Staub`; if (e.t === 'dock') return `${P.name}: verkauft alles, was ankommt`; if (e.t === 'solar') return `${P.name}: ${SOLAR_KW} kW`; if (e.t === 'generator') return `${P.name}: ${e.on ? `${GEN_KW} kW` : 'aus'} · ${e.fuel} Staub im Speicher`;
  const r = RECIPES[e.t]; if (r) { const parts = r.in.map(([k, n]) => `${ITEMS[k].name} ${e.buf[k] || 0}/${n}`).join(', '); return `${P.name}: ${e.prog >= 0 ? (powerK < 0.01 ? 'kein Strom' : powerK < 0.99 ? `zu wenig Strom (${Math.round(powerK * 100)} %)` : 'arbeitet') : e.out >= 3 ? 'Ausgang blockiert' : 'wartet'} · ${parts}`; } return P.name;
}
export function dump(F) { return { seq: F.seq, helpers: F.helpers, made: F.made, sold: F.sold, ents: F.ents.map((e) => { const o = { ...e }; o.it = e.it.map((q) => ({ ...q, p: +q.p.toFixed(3) })); return o; }) }; }
export function load(F, d) { F.ents = []; F.map = new Map(); F.seq = d.seq || 1; F.helpers = !!d.helpers; F.made = d.made || {}; F.sold = d.sold || {}; for (const o of d.ents || []) { if (!partById(o.t)) continue; const e = { ...o, it: o.it || [] }; F.ents.push(e); setKeys(F, e, true); } reshape(F); F.rev++; }
