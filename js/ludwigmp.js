// Theos Seitenscheidel - Ludwig Zigaretti: Mehrspieler-Kern (2026-11-21, Lennox: „zu viert, alles gebalanced“).
// Prinzip: Der Gastgeber (spielt Ludwig) hat den einzigen echten Spielstand und lässt die Welt laufen (Uhr, Kunden, Eltern, Maschinen, Polizei).
// Mitspieler spielen auf einer Kopie ganz normal (gleicher Code, nur ohne Welt-Takt) und schicken alle 100 ms, was sich durch ihre Aktionen geändert hat:
// Zahlen als Plus/Minus (zwei nehmen gleichzeitig aus der Box: beides zählt, nichts doppelt), Listen mit Kennung (Kunden, Parkkunden, Aufträge, Maschinen)
// Element für Element, alles andere als neuer Wert. Der Gastgeber übernimmt das in seinen Stand und schickt allen den Stand zurück.
// Eigene Sachen je Spieler (Taschen, Rucksack, Drehschritt, gewählte Sorte, Energy) hält der Gastgeber für jeden Mitspieler getrennt (PER), Handy-Bildschirmzeit
// und persönlicher Hausarrest bleiben ganz beim Spieler (LOCAL). Felder, die nur die Welt ändert (Uhren, Geduld, Zufallszähler), nimmt der Gastgeber von Mitspielern nicht an (HOST).
// Noch nicht bestätigte eigene Änderungen spielt der Mitspieler nach jedem Stand vom Gastgeber wieder ein (sonst würde die Box kurz zurückspringen).

export const PER_KEYS = ['hand', 'roll', 'sack', 'buff', 'step', 'sorte', 'screen', 'parrest']; // ganze Felder je Spieler
export const LOCAL_KEYS = ['screen', 'parrest', 'sucht']; // nur beim Spieler selbst (Gastgeber kennt sie nicht)
const HOST_PATHS = new Set(['t', 'erg', 'chat', 'kundeT', 'brunoT', 'nextId', 'acc', 'mpN', 'eltern.next', 'welt.t', 'welt.polT', 'welt.einT', 'welt.parkT', 'welt.nbT', 'welt.nextP', 'bunker.nextOrder', 'bunker.gagT', 'bunker.megaT', 'bunker.razzia.next', 'bunker.razzia.left', 'bunker.lock', 'bunker.chatId', 'bunker.nextId', 'bunker.chat', 'queue.*.wait', 'queue.*.max', 'welt.park.*.t']);
const KEYED = { queue: (e) => e && e.id, 'welt.park': (e) => e && e.id, 'bunker.orders': (e) => e && e.id, 'bunker.units': (e) => e && `${e.id}:${e.i}` };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
export const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const same = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);

// ---- Unterschied zwischen zwei Ständen (a → b). Ergebnis: undefined (gleich) oder ein Baum aus { d: Zahl } (Plus/Minus), { v: Wert } (neu), { x: 1 } (weg),
// { o: { feld: … } } (Objekt) und { a: { add: [...], del: [...], mod: { kennung: … } } } (Liste mit Kennung).
export function diff(a, b, path = '') {
  if (typeof a === 'number' && typeof b === 'number') { const d = b - a; return Math.abs(d) > 1e-9 ? { d } : undefined; }
  const keyOf = KEYED[path];
  if (Array.isArray(a) && Array.isArray(b)) {
    if (keyOf && a.every(keyOf) && b.every(keyOf)) {
      const ma = new Map(a.map((e) => [keyOf(e), e])); const mb = new Map(b.map((e) => [keyOf(e), e])); const add = []; const del = []; const mod = {};
      for (const [k, e] of mb) { if (!ma.has(k)) add.push(clone(e)); else { const s = diff(ma.get(k), e, path + '.*'); if (s) mod[k] = s; } }
      for (const k of ma.keys()) if (!mb.has(k)) del.push(k);
      return add.length || del.length || Object.keys(mod).length ? { a: { add, del, mod } } : undefined;
    }
    return same(a, b) ? undefined : { v: clone(b) };
  }
  if (isObj(a) && isObj(b)) {
    const o = {}; for (const k of Object.keys(b)) { const s = k in a ? diff(a[k], b[k], path ? `${path}.${k}` : k) : { v: clone(b[k]) }; if (s) o[k] = s; }
    for (const k of Object.keys(a)) if (!(k in b)) o[k] = { x: 1 };
    return Object.keys(o).length ? { o } : undefined;
  }
  return same(a, b) ? undefined : { v: clone(b) };
}
// ---- Unterschied anwenden (verändert das Ziel). skip(path): Pfade, die nicht übernommen werden. Gibt den neuen Wert zurück (für ersetzte Felder).
export function apply(target, delta, path = '', skip = null) {
  if (!delta) return target; if (skip && skip(path)) return target;
  if ('d' in delta) return (typeof target === 'number' ? target : 0) + delta.d;
  if ('v' in delta) return clone(delta.v);
  if ('a' in delta) {
    const keyOf = KEYED[path] || ((e) => e && e.id); const arr = Array.isArray(target) ? target : []; const { add = [], del = [], mod = {} } = delta.a;
    const gone = new Set(del); for (let i = arr.length - 1; i >= 0; i--) if (gone.has(keyOf(arr[i]))) arr.splice(i, 1);
    for (const [k, s] of Object.entries(mod)) { const i = arr.findIndex((e) => String(keyOf(e)) === k); if (i >= 0) arr[i] = apply(arr[i], s, path + '.*', skip); }
    for (const e of add) if (!arr.some((q) => keyOf(q) === keyOf(e))) arr.push(clone(e));
    return arr;
  }
  if ('o' in delta) {
    const t = isObj(target) ? target : {};
    for (const [k, s] of Object.entries(delta.o)) { const p = path ? `${path}.${k}` : k; if (skip && skip(p)) continue; if (s.x) delete t[k]; else t[k] = apply(t[k], s, p, skip); }
    return t;
  }
  return target;
}
const hostSkip = (path) => HOST_PATHS.has(path) || LOCAL_KEYS.includes(path.split('.')[0]);

// ---- Eigene Sachen je Spieler
export function newPlayer(S) { // ein Mitspieler kommt dazu: leere Taschen und leerer Rucksack, Schritte bei 0, Sorte wie gerade gewählt
  const P = { hand: 0, roll: 0, sack: { tabak: 0, papier: 0, n: 0 }, buff: { energy: 0 }, step: {}, sorte: 'kippe', sortenHand: {} };
  for (const k of Object.keys(S.step || {})) P.step[k] = 0; for (const k of Object.keys(S.sorten || {})) P.sortenHand[k] = 0; return P;
}
export function viewFor(S, P) { // Stand, wie ihn ein bestimmter Mitspieler sieht: gemeinsame Felder vom Gastgeber, eigene Sachen aus P
  const v = {}; for (const k of Object.keys(S)) { if (LOCAL_KEYS.includes(k)) continue; if (PER_KEYS.includes(k)) { if (P && k in P) v[k] = P[k]; continue; } v[k] = S[k]; }
  if (S.sorten) { v.sorten = {}; for (const [k, q] of Object.entries(S.sorten)) v.sorten[k] = { ...q, hand: P && P.sortenHand ? P.sortenHand[k] || 0 : 0 }; }
  return v;
}
// Gastgeber übernimmt einen Unterschied vom Mitspieler: eigene Felder nach P, gemeinsame in S, Welt-Felder nicht
export function applyFromClient(S, P, delta) {
  if (!delta || !delta.o) return; const o = delta.o;
  for (const [k, s] of Object.entries(o)) {
    if (LOCAL_KEYS.includes(k)) continue;
    if (PER_KEYS.includes(k)) { if (s.x) continue; P[k] = apply(P[k], s, k, null); continue; }
    if (k === 'sorten' && s.o) { for (const [sk, ss] of Object.entries(s.o)) { if (ss.x) continue; if (!S.sorten[sk]) S.sorten[sk] = { box: 0, hand: 0 }; if ('v' in ss) { const nv = ss.v || {}; S.sorten[sk].box = nv.box | 0; P.sortenHand[sk] = nv.hand | 0; continue; } const so = ss.o || {}; if (so.box) S.sorten[sk].box = apply(S.sorten[sk].box, so.box, `sorten.${sk}.box`); if (so.hand) P.sortenHand[sk] = apply(P.sortenHand[sk] || 0, so.hand, `sorten.${sk}.hand`); } continue; }
    if (hostSkip(k)) continue; S[k] = apply(S[k], s, k, hostSkip);
  }
}
// Mitspieler geht: Taschen zurück in die Box, Rucksack-Material in die Kiste (was nicht passt, ist weg), Teile in die Teilekiste
export function returnPlayer(S, P) {
  if (!P) return; S.kippen += P.hand | 0; for (const [k, n] of Object.entries(P.sortenHand || {})) if (S.sorten[k]) S.sorten[k].box += n | 0;
  for (const [k, n] of Object.entries(P.sack || {})) { if (k === 'n' || !(n > 0)) continue; if (k === 'tabak' || k === 'papier') S[k] += n; else if (S.mat && k in S.mat) S.mat[k] += n; else if (S.teile && k in S.teile) S.teile[k] += n; }
  P.hand = 0; P.sortenHand = {}; P.sack = { tabak: 0, papier: 0, n: 0 };
}

// Große Felder, die sich oft ein bisschen ändern (Bunker mit Maschinen-Zählern, Welt mit Uhren), schickt der Gastgeber feldweise ('bunker.units' statt ganzer Bunker)
const DEEP = ['bunker', 'welt'];
function setKey(o, k, v) { const i = k.indexOf('.'); if (i < 0) { o[k] = clone(v); return; } const a = k.slice(0, i); if (!isObj(o[a])) o[a] = {}; o[a][k.slice(i + 1)] = clone(v); }
export function assemble(keys) { const o = {}; for (const [k, v] of Object.entries(keys || {})) setKey(o, k, v); return o; }
// ---- Mitspieler: eigener Stand mit Vorhersage. Hält den zuletzt bestätigten Stand des Gastgebers (base), die noch nicht bestätigten eigenen Änderungen (pending)
// und den Stand zum Vergleich (last). take() liefert den nächsten Unterschied zum Verschicken, receive() baut nach einem Stand vom Gastgeber neu auf.
export function createClientSync(S) {
  let base = clone(S); let last = clone(S); let seq = 0; const pending = []; // pending: { seq, d, sent }
  const keepLocal = (from, to) => { for (const k of LOCAL_KEYS) if (k in from) to[k] = from[k]; };
  const capture = (cur) => { const d = diff(last, cur); if (!d) return; seq++; pending.push({ seq, d, sent: false }); last = clone(cur); }; // eigene Änderung seit dem letzten Mal sichern
  return {
    take(cur) { capture(cur); const out = pending.filter((p) => !p.sent); for (const p of out) p.sent = true; return out.length ? out.map((p) => ({ seq: p.seq, d: p.d })) : null; }, // alles noch nicht Verschickte
    receive(cur, keys, ack, full) {
      capture(cur); // sonst würde eine Aktion, die gerade zwischen zwei Sendungen passiert ist, vom Stand des Gastgebers überschrieben
      if (full) base = {}; for (const [k, v] of Object.entries(keys || {})) setKey(base, k, v); while (pending.length && pending[0].seq <= ack) pending.shift();
      const next = clone(base); keepLocal(cur, next); for (const p of pending) apply(next, p.d, '', (path) => LOCAL_KEYS.includes(path.split('.')[0])); // eigene Felder stehen schon richtig da (sonst liefen ihre Uhren doppelt so schnell)
      for (const k of Object.keys(cur)) if (!(k in next)) delete cur[k]; Object.assign(cur, next); last = clone(cur); return cur;
    },
    pending: () => pending.length, seq: () => seq,
  };
}
// ---- Gastgeber: je Mitspieler die zuletzt geschickten Felder merken und nur Geänderte schicken
export function createHostSync() {
  const sent = new Map(); // id -> { key: json }
  return {
    snapshot(S, id, P, full = false) {
      const v = viewFor(S, P); const prev = full ? {} : sent.get(id) || {}; const out = {}; const now = {};
      for (const [k, val] of Object.entries(v)) {
        if (DEEP.includes(k) && isObj(val)) { for (const [sk, sv] of Object.entries(val)) { const kk = `${k}.${sk}`; const j = JSON.stringify(sv); now[kk] = j; if (prev[kk] !== j) out[kk] = sv; } continue; }
        const j = JSON.stringify(val); now[k] = j; if (prev[k] !== j) out[k] = val;
      }
      sent.set(id, now); return out;
    },
    forget(id) { sent.delete(id); },
  };
}
// ---- Balance nach Spielerzahl (Lennox: zu viert soll es insgesamt etwa doppelt so schnell gehen wie allein, nicht viermal)
export const MP_ROLL = [1, 1, 1.2, 1.35, 1.5]; // Drehzeit pro Kippe
export const MP_COST = [1, 1, 1.2, 1.4, 1.6]; // Boss-Plan und PC-Shop
export const MP_CUST = [1, 1, 1.35, 1.7, 2.0]; // Kunden kommen öfter (zahlen nicht mehr)
export const MP_ELTERN = [1, 1, 1.1, 1.2, 1.3]; // Kontrollen etwas öfter
export const mpN = (S) => Math.max(1, Math.min(4, (S && S.mpN) | 0 || 1));
export const rollMul = (S) => MP_ROLL[mpN(S)]; export const costMul = (S) => MP_COST[mpN(S)]; export const custMul = (S) => MP_CUST[mpN(S)]; export const elternMul = (S) => MP_ELTERN[mpN(S)];
// Sitze: Gastgeber = Ludwig (Sitz 1, blauer Stuhl), Mitspieler bekommen Rot (0), Gelb (2), Grün (3) in der Reihenfolge des Beitritts
// Wer Ludwig heißt, ist Ludwig (Wunsch Lennox 2026-11-19, Spitznamen 2026-11-22): Ludwig, Ludi, Ludsen, auch zusammengesetzt wie „Ludi Ludsen Ludi ludsen Ludwig“, groß oder klein, mit Zahlen oder Zeichen
export const istLudwigName = (name) => /^(ludwig|ludsen|ludi)+$/.test(String(name || '').toLowerCase().replace(/[^\p{L}]/gu, ''));
// Platz für einen, der dazukommt. host: wo der Gastgeber sitzt, taken: die Plätze der anderen. Der Gastgeber macht Platz 1 frei, wenn ein Ludwig kommt und er selbst keiner ist.
export function platzFuer(hostName, host, taken, name) {
  if (host === 1 && istLudwigName(name) && !istLudwigName(hostName)) { const frei = pickSeat(taken); return frei < 0 ? { seat: -1, host } : { seat: 1, host: frei }; }
  return { seat: pickSeat([host, ...taken]), host };
}
// etwas so ausrechnen, als wären Taschen und Rucksack die von Ludwig, wenn ein Mitspieler Ludwig ist (P null: der Gastgeber ist es selbst)
export function alsLudwig(S, P, fn) {
  if (!P) return fn(S);
  const keys = Object.keys(S.sorten || {}); const eigen = { hand: S.hand, sack: S.sack, sorten: keys.map((k) => S.sorten[k].hand) };
  S.hand = P.hand | 0; S.sack = P.sack; for (const k of keys) S.sorten[k].hand = P.sortenHand[k] || 0;
  try { return fn(S); } finally {
    P.hand = S.hand; P.sack = S.sack; for (const k of keys) P.sortenHand[k] = S.sorten[k].hand;
    S.hand = eigen.hand; S.sack = eigen.sack; keys.forEach((k, i) => { S.sorten[k].hand = eigen.sorten[i]; });
  }
}
export const GUEST_SEATS = [0, 2, 3]; export const SEAT_KEY = { 0: 'rot', 2: 'gelb', 3: 'gruen' }; export const SEAT_NAME = { 1: 'Ludwig', 0: 'Rot', 2: 'Gelb', 3: 'Grün' };
export function pickSeat(taken) { for (const s of GUEST_SEATS) if (!taken.includes(s)) return s; return -1; }
