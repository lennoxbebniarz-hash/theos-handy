// Theos Seitenscheidel - Teo's Casino: reine Regeln (ohne Grafik, läuft auch im Node-Test).
// Familienkasse in Cent, zehn Level mit Freischaltgrenze, 20 Rubbellos-Sorten, Missionen und verlorene Münzen.
// Jedes Los ist durch (Sorte, Seed) vollständig bestimmt: erst wird der Gewinn aus dem Gewinnplan gezogen, dann ein passendes Bild gebaut (wie bei echten Losen).
// Interaktive Lose (Schatzsuche, Gipfelsturm, Diamantenmine) haben eine feste Reihenfolge: das k-te angerubbelte Feld zeigt immer das k-te Element.
// Die Gewinnpläne liegen bewusst leicht über dem Einsatz (Erwartung ca. 1,05 bis 1,12), damit die Familie mit Glück und Geduld vorankommt.

export const START_PURSE = 2500; // die letzten 25 Euro der Familie
export const LEVELS = [
  { n: 1, id: 'lose', name: 'Rubbellos-Saal', need: 0, open: true },
  { n: 2, id: 'slots', name: 'Automatenhalle', need: 30000 },
  { n: 3, id: 'karten', name: 'Kartensalon', need: 150000 },
  { n: 4, id: 'roulette', name: 'Roulette-Galerie', need: 500000 },
  { n: 5, id: 'spielhalle', name: 'Spielhalle', need: 1500000 },
  { n: 6, id: 'vip', name: 'VIP-Area', need: 5000000 },
  { n: 7, id: 'l7', name: '???', need: 12000000 },
  { n: 8, id: 'l8', name: '???', need: 25000000 },
  { n: 9, id: 'l9', name: '???', need: 50000000 },
  { n: 10, id: 'million', name: 'Millionärs-Lounge', need: 100000000 },
];
export const PLAYABLE = 5; // eingerichtet: Rubbellos-Saal, Automatenhalle, Kartensalon, Roulette-Galerie, Spielhalle

// ---------------- Zufall (deterministisch) ----------------
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const int = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const range = (a, b) => { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; };
const sum = (a) => a.reduce((s, v) => s + v, 0);
const wpick = (r, items) => { let u = r() * sum(items.map((x) => x[1])); for (const [v, w] of items) { if (u < w) return v; u -= w; } return items[items.length - 1][0]; };
const nice = (c) => { const e = Math.pow(10, Math.max(1, Math.floor(Math.log10(c)) - 1)); return Math.round(c / e) * e; }; // zwei gültige Stellen

// Geld: 1234567 Cent -> "12.345,67 €", kurz: ganze Euro ohne Nachkomma
export function euro(c, short = false) {
  const neg = c < 0; c = Math.abs(Math.round(c)); const e = Math.floor(c / 100); const ct = c % 100; const es = String(e).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + (short && ct === 0 ? es : es + ',' + String(ct).padStart(2, '0')) + ' €';
}

// Gewinnplan: Form (Vielfache des Einsatzes mit relativen Gewichten) auf eine Erwartung skaliert
function plan(price, shape, ev = 1.1) {
  const k = ev / sum(shape.map(([m, w]) => m * w)); const tiers = shape.map(([m, w]) => ({ win: Math.round(price * m), p: w * k }));
  if (sum(tiers.map((t) => t.p)) > 0.6) throw new Error('Gewinnplan zu dicht'); return tiers;
}
function drawTier(r, tiers, luck = 1) { const P = sum(tiers.map((t) => t.p)); const k = luck === 1 ? 1 : (1 - Math.pow(1 - P, luck)) / P; let u = r(); for (const t of tiers) { if (u < t.p * k) return t.win; u -= t.p * k; } return 0; } // Glück > 1 hebt die Gewinnchance (gedeckelt), < 1 senkt sie

// ---------------- die 20 Sorten ----------------
const LINES3 = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
export const SLOT_SYMS = ['kirsche', 'zitrone', 'pflaume', 'glocke', 'bar', 'sieben', 'teo']; const SLOT_PAY = [1, 2, 3, 5, 10, 50, 500]; const SLOT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 4, 8], [6, 4, 2]];
export const HOUSE_PARTS = ['dach', 'tuer', 'fenster', 'kamin', 'garten']; const HOUSE_PAY = { 2: 1, 3: 3, 4: 20, 5: 500 };
export const TEO_SYMS = ['muenze', 'barren', 'geldsack', 'diamant', 'krone', 'teo']; const TEO_PAY = [1, 2, 4, 10, 25, 125]; export const TEO_MULT = [1, 2, 4];
export const RAD_SEGS = [500, 0, 50, 2000, 0, 100, 10000, 0, 200, 1000, 0, 5000]; // 12 Felder am Glücksrad, 0 = Niete
export const RAD_MULT = [1, 2, 3, 5];
export const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const BET_NAME = { rot: 'Rot', schwarz: 'Schwarz', gerade: 'Gerade', ungerade: 'Ungerade', tief: '1 – 18', hoch: '19 – 36', d1: '1. Dutzend', d2: '2. Dutzend', d3: '3. Dutzend', zahl: 'Zahl' };
export const betMatch = (b, n) => { if (b.k === 'zahl') return b.n === n; if (n === 0) return false; return b.k === 'rot' ? RED.has(n) : b.k === 'schwarz' ? !RED.has(n) : b.k === 'gerade' ? n % 2 === 0 : b.k === 'ungerade' ? n % 2 === 1 : b.k === 'tief' ? n <= 18 : b.k === 'hoch' ? n >= 19 : b.k === 'd1' ? n <= 12 : b.k === 'd2' ? n >= 13 && n <= 24 : n >= 25; };
const WORDS = ['RASEN', 'STERN', 'ROSE', 'NASE', 'TALER', 'KARTE', 'KRONE', 'LOSE', 'GELD', 'REGEN', 'SONNE', 'TRESOR', 'STIER', 'LEINE', 'SEIL', 'ERNTE', 'OASE', 'INSEL', 'NEST', 'ROLLE', 'TORTE', 'ESEL', 'LINSE', 'SALAT', 'NOTEN', 'TIGER', 'REITER', 'ANKER', 'TASSE', 'ROSINE', 'RITTER', 'SOLE', 'TANTE', 'ELSTER', 'KASINO', 'TENNIS', 'LATTE', 'STALL', 'NELKE', 'ORGEL', 'SENSE', 'TINTE', 'ESSIG', 'LIESE', 'RIESE', 'SEGEL', 'STEIN', 'ASTER', 'RATTE', 'ROTOR', 'TOAST', 'NIETE', 'SIEGER', 'GLANZ', 'KASSE', 'TRAUM', 'LOTSE', 'ATLAS', 'OSTERN', 'TELLER'];
const letters = (w) => [...new Set(w.split(''))];
const POKER_PAY = [0, 1, 2, 3, 5, 8, 12, 40, 100, 500]; export const POKER_NAME = ['Leider nichts', 'Paar (ab Bube)', 'Zwei Paare', 'Drilling', 'Straße', 'Flush', 'Full House', 'Vierling', 'Straight Flush', 'Royal Flush'];
export function pokerRank(cards) {
  const rs = cards.map((c) => c.r).sort((a, b) => b - a); const cnt = {}; for (const r of rs) cnt[r] = (cnt[r] || 0) + 1; const groups = Object.entries(cnt).map(([r, c]) => [Number(r), c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = cards.every((c) => c.s === cards[0].s); const uniq = [...new Set(rs)]; let straight = false; let high = 0;
  if (uniq.length === 5) { if (uniq[0] - uniq[4] === 4) { straight = true; high = uniq[0]; } else if (uniq.join(',') === '14,5,4,3,2') { straight = true; high = 5; } }
  if (straight && flush) return high === 14 ? 9 : 8; if (groups[0][1] === 4) return 7; if (groups[0][1] === 3 && groups[1][1] === 2) return 6; if (flush) return 5; if (straight) return 4; if (groups[0][1] === 3) return 3; if (groups[0][1] === 2 && groups[1][1] === 2) return 2; if (groups[0][1] === 2 && groups[0][0] >= 11) return 1; return 0;
}
export const BJ_VAL = (k) => (k === 'A' ? 11 : ['B', 'D', 'K', '10'].includes(k) ? 10 : Number(k)); const BJ_KEYS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'B', 'D', 'K', 'A'];
const GIPFEL = [350, 600, 1000, 1600, 2800, 4500, 7500, 12500, 20000]; const GIPFEL_Q = 0.6;
const MINE_N = 16; const MINE_COAL = 3;
function minePay(price, k, coal = MINE_COAL) { let p = 1; for (let i = 0; i < k; i++) p *= (MINE_N - coal - i) / (MINE_N - i); return nice(price * 1.08 * (coal / MINE_COAL) / p); }
const BINGO_LINES = (() => { const L = []; for (let i = 0; i < 5; i++) { L.push([0, 1, 2, 3, 4].map((j) => i * 5 + j)); L.push([0, 1, 2, 3, 4].map((j) => j * 5 + i)); } L.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]); return L; })();
export { BINGO_LINES, LINES3, SLOT_LINES };
const BINGO_PAY = { 1: 1, 2: 3, 3: 8, 4: 25, 5: 80 }; const BINGO_FULL = 400;
const WORT_PAY = { 2: 1, 3: 4, 4: 15, 5: 60, 6: 500 };
const MUENZE_PAY = { 3: 1, 4: 3, 5: 8, 6: 25, 7: 80, 8: 250 };
export const longestRun = (seq) => { let best = 0; let cur = 0; for (const x of seq) { cur = x === 'K' ? cur + 1 : 0; best = Math.max(best, cur); } return best; };
const bingoLines = (grid, called) => { const set = new Set(called); return BINGO_LINES.filter((L) => L.every((i) => i === 12 || set.has(grid[i]))).length; };
const bingoFull = (grid, called) => { const set = new Set(called); return grid.every((n, i) => i === 12 || set.has(n)); };

export const CARDS = [
  { id: 'drei', name: 'Dreierglück', price: 100, kind: 'fixed', blurb: 'Drei gleiche Beträge', rule: 'Rubble alle neun Felder frei. Steht dreimal derselbe Betrag da, gewinnst du ihn.',
    shape: [[1, 200], [2, 110], [5, 45], [10, 16], [20, 6], [50, 1.8], [100, 0.5], [500, 0.06]],
    gen(r, win) { const A = [100, 200, 500, 1000, 2000, 5000, 10000, 50000]; for (;;) { const cells = []; const cnt = new Map(); if (win) { cells.push(win, win, win); cnt.set(win, 3); } const pool = A.filter((a) => a !== win); while (cells.length < 9) { const a = pick(r, pool); const c = cnt.get(a) || 0; if (c >= 2) continue; cnt.set(a, c + 1); cells.push(a); } const d = { cells: shuffle(r, cells) }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { const cnt = new Map(); for (const a of d.cells) cnt.set(a, (cnt.get(a) || 0) + 1); for (const [a, c] of cnt) if (c >= 3) return a; return 0; } },
  { id: 'zahl', name: 'Zahlenzauber', price: 200, kind: 'fixed', blurb: 'Gewinnzahlen gegen deine Zahlen', rule: 'Oben stehen zwei Gewinnzahlen. Taucht eine davon bei deinen zehn Zahlen auf, gewinnst du den Betrag darunter.',
    shape: [[1, 190], [2, 90], [2.5, 50], [5, 26], [10, 9], [25, 2.6], [50, 1], [500, 0.05]],
    gen(r, win) { const P = [[200, 5], [400, 4], [500, 3], [1000, 3], [2000, 2], [5000, 1], [10000, 0.6], [100000, 0.4]]; const all = range(1, 40); const wn = shuffle(r, all).slice(0, 2); const rest = shuffle(r, all.filter((n) => !wn.includes(n))); const mine = []; for (let i = 0; i < 10; i++) mine.push({ n: rest[i], p: wpick(r, P) }); if (win) mine[int(r, 0, 9)] = { n: pick(r, wn), p: win }; return { wn, mine }; },
    evaluate(d) { return sum(d.mine.map((m) => (d.wn.includes(m.n) ? m.p : 0))); } },
  { id: 'schatz', name: 'Schatzsuche', price: 200, kind: 'pick', picks: 5, blurb: 'Wähle 5 von 16 Feldern', rule: 'Auf der Karte liegen 16 Felder, du darfst aber nur fünf aufrubbeln. Alles, was du in diesen fünf findest, gehört dir.',
    shape: [[1, 180], [2, 100], [3, 50], [5, 30], [10, 10], [25, 3], [50, 1], [200, 0.12]],
    gen(r, win) { const D = [50, 100, 200, 500, 1000, 2500, 5000, 10000, 40000]; let items = win ? [win] : []; for (let s = 0; s < 2 && items.length; s++) { if (r() < 0.55) { const i = int(r, 0, items.length - 1); const x = items[i]; const parts = D.filter((a) => a < x && D.includes(x - a)); if (parts.length) { const a = pick(r, parts); items.splice(i, 1, a, x - a); } } } while (items.length < 5) items.push(0); const seq = shuffle(r, items); const tease = []; for (let i = 0; i < 11; i++) tease.push(r() < 0.45 ? 0 : wpick(r, [[50, 4], [100, 4], [200, 3], [500, 2], [1000, 1.5], [2500, 0.8], [10000, 0.4], [40000, 0.2]])); return { seq: seq.concat(tease) }; },
    evaluate(d) { return sum(d.seq.slice(0, 5)); } },
  { id: 'tictac', name: 'Tic-Tac-Taler', price: 100, kind: 'fixed', blurb: 'Drei Taler in einer Reihe', rule: 'Liegen drei Taler in einer Reihe, Spalte oder Diagonale, gewinnst du den Betrag, der an dieser Linie steht.',
    shape: [[1, 200], [2, 100], [3, 50], [5, 30], [10, 12], [20, 4], [50, 1.4], [250, 0.12]],
    gen(r, win) { const P = [100, 200, 300, 500, 1000, 2000, 5000, 25000]; for (;;) { const g = Array.from({ length: 9 }, () => (r() < 0.42 ? 'T' : pick(r, ['X', 'O']))); const prizes = LINES3.map(() => wpick(r, [[100, 5], [200, 4], [300, 3], [500, 3], [1000, 2], [2000, 1.2], [5000, 0.6], [25000, 0.3]])); if (win) { const L = int(r, 0, 7); for (const i of LINES3[L]) g[i] = 'T'; prizes[L] = win; } const d = { g, prizes }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { return sum(LINES3.map((L, k) => (L.every((i) => d.g[i] === 'T') ? d.prizes[k] : 0))); } },
  { id: 'sieben', name: 'Goldene Sieben', price: 300, kind: 'fixed', blurb: 'Drei gleiche auf einer Gewinnlinie', rule: 'Drei Walzen, fünf Gewinnlinien (drei waagerecht, zwei schräg). Drei gleiche Symbole auf einer Linie zahlen laut Gewinntabelle.',
    shape: [[1, 210], [2, 90], [3, 50], [5, 26], [10, 10], [50, 1.2], [500, 0.04]],
    gen(r, win) { const k = win ? SLOT_PAY.findIndex((p) => p * this.price === win) : -1; for (;;) { const g = Array.from({ length: 9 }, () => wpick(r, SLOT_SYMS.map((s, i) => [s, [5, 4, 4, 3, 2, 1.2, 0.5][i]]))); if (k >= 0) { const L = pick(r, SLOT_LINES); for (const i of L) g[i] = SLOT_SYMS[k]; } const d = { g }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { return sum(SLOT_LINES.map((L) => { const s = d.g[L[0]]; return L.every((i) => d.g[i] === s) ? SLOT_PAY[SLOT_SYMS.indexOf(s)] * this.price : 0; })); } },
  { id: 'poker', name: 'Pokerface', price: 500, kind: 'fixed', blurb: 'Deine Pokerhand zählt', rule: 'Fünf Karten werden aufgedeckt. Ab einem Paar Buben gewinnst du, je besser die Hand, desto mehr (Tabelle rechts).',
    shape: [[1, 200], [2, 90], [3, 45], [5, 18], [8, 9], [12, 6], [40, 1.2], [100, 0.3], [500, 0.04]],
    gen(r, win) { const rank = win ? POKER_PAY.findIndex((p) => p * this.price === win) : 0; const S = () => int(r, 0, 3); const pickRanks = (n, not = []) => shuffle(r, range(2, 14).filter((x) => !not.includes(x))).slice(0, n);
      for (;;) { let c = [];
        if (rank === 9) { const s = S(); c = [10, 11, 12, 13, 14].map((x) => ({ r: x, s })); }
        else if (rank === 8) { const s = S(); const lo = int(r, 1, 9); c = [0, 1, 2, 3, 4].map((i) => ({ r: lo + i === 1 ? 14 : lo + i, s })); }
        else if (rank === 7) { const q = int(r, 2, 14); c = [0, 1, 2, 3].map((s) => ({ r: q, s })); c.push({ r: pickRanks(1, [q])[0], s: S() }); }
        else if (rank === 6) { const [a, b] = pickRanks(2); const sa = shuffle(r, [0, 1, 2, 3]); const sb = shuffle(r, [0, 1, 2, 3]); c = [{ r: a, s: sa[0] }, { r: a, s: sa[1] }, { r: a, s: sa[2] }, { r: b, s: sb[0] }, { r: b, s: sb[1] }]; }
        else if (rank === 5) { const s = S(); c = pickRanks(5).map((x) => ({ r: x, s })); }
        else if (rank === 4) { const lo = int(r, 1, 10); c = [0, 1, 2, 3, 4].map((i) => ({ r: lo + i === 1 ? 14 : lo + i, s: S() })); }
        else if (rank === 3) { const [a, b, d] = pickRanks(3); const sa = shuffle(r, [0, 1, 2, 3]); c = [{ r: a, s: sa[0] }, { r: a, s: sa[1] }, { r: a, s: sa[2] }, { r: b, s: S() }, { r: d, s: S() }]; }
        else if (rank === 2) { const [a, b, d] = pickRanks(3); const sa = shuffle(r, [0, 1, 2, 3]); const sb = shuffle(r, [0, 1, 2, 3]); c = [{ r: a, s: sa[0] }, { r: a, s: sa[1] }, { r: b, s: sb[0] }, { r: b, s: sb[1] }, { r: d, s: S() }]; }
        else if (rank === 1) { const a = int(r, 11, 14); const o = pickRanks(3, [a]); const sa = shuffle(r, [0, 1, 2, 3]); c = [{ r: a, s: sa[0] }, { r: a, s: sa[1] }, ...o.map((x) => ({ r: x, s: S() }))]; }
        else { const deck = shuffle(r, range(0, 51)).slice(0, 5); c = deck.map((k) => ({ r: 2 + (k % 13), s: Math.floor(k / 13) })); if (r() < 0.35) { const lo = int(r, 2, 10); const o = pickRanks(3, [lo]); const sa = shuffle(r, [0, 1, 2, 3]); c = [{ r: lo, s: sa[0] }, { r: lo, s: sa[1] }, ...o.map((x) => ({ r: x, s: S() }))]; } }
        const keys = new Set(c.map((x) => x.r * 4 + x.s)); if (keys.size !== 5) continue; if (pokerRank(c) !== rank) continue; return { cards: shuffle(r, c) }; } },
    evaluate(d) { return POKER_PAY[pokerRank(d.cards)] * this.price; } },
  { id: 'wuerfel', name: 'Würfelduell', price: 200, kind: 'fixed', blurb: 'Würfle höher als Teo', rule: 'Vier Duelle: Ist deine Augensumme höher als Teos, gewinnst du den Betrag der Zeile. Gleichstand gewinnt Teo.',
    shape: [[1, 200], [2, 100], [5, 40], [10, 14], [25, 4], [50, 1.2], [250, 0.12]],
    gen(r, win) { const P = [[200, 5], [400, 4], [1000, 3], [2000, 2], [5000, 1], [10000, 0.6], [50000, 0.25]]; const W = win ? int(r, 0, 3) : -1; const rows = []; for (let i = 0; i < 4; i++) { let you; let teo; do { you = [int(r, 1, 6), int(r, 1, 6)]; teo = [int(r, 1, 6), int(r, 1, 6)]; } while (i === W ? sum(you) <= sum(teo) : sum(you) > sum(teo)); rows.push({ you, teo, p: i === W ? win : wpick(r, P) }); } return { rows }; },
    evaluate(d) { return sum(d.rows.map((x) => (sum(x.you) > sum(x.teo) ? x.p : 0))); } },
  { id: 'ehz', name: 'Einundzwanzig', price: 300, kind: 'fixed', blurb: 'Näher an 21 als Teo', rule: 'Deine drei Karten gegen Teos Summe. Liegst du höher, ohne 21 zu überschreiten, gewinnst du den Betrag im Gewinnfeld. Genau 21 zahlt doppelt. Ass zählt 11, Bild 10.',
    shape: [[1, 200], [2, 100], [3, 50], [5, 25], [10, 10], [20, 4], [50, 1.2], [300, 0.1]],
    gen(r, win) { const G = [300, 600, 900, 1500, 3000, 6000, 15000, 90000]; let g; let target; let dealer;
      if (win) { const twin = G.includes(win / 2) && (r() < 0.35 || !G.includes(win)); if (twin) { g = win / 2; target = 21; dealer = int(r, 17, 21); } else { g = win; dealer = int(r, 17, 19); target = int(r, dealer + 1, 20); } }
      else { g = pick(r, G); dealer = int(r, 17, 21); target = r() < 0.45 ? int(r, 22, 27) : int(r, 12, Math.min(dealer, 20)); }
      for (;;) { const a = pick(r, BJ_KEYS); const b = pick(r, BJ_KEYS); const rest = target - BJ_VAL(a) - BJ_VAL(b); const opts = BJ_KEYS.filter((k) => BJ_VAL(k) === rest); if (!opts.length) continue; const d = { you: shuffle(r, [a, b, pick(r, opts)]), dealer, g }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { const y = sum(d.you.map(BJ_VAL)); if (y > 21) return 0; if (y === 21) return d.g * 2; return y > d.dealer ? d.g : 0; } },
  { id: 'bingo', name: 'Bingo-Blitz', price: 500, kind: 'fixed', blurb: 'Linien auf dem Bingoschein', rule: 'Rubble die 24 gezogenen Zahlen frei und streiche sie auf dem Schein. Jede volle Linie (waagerecht, senkrecht, schräg) zählt, ein voller Schein ist der Hauptgewinn.',
    shape: [[1, 210], [3, 70], [8, 18], [25, 5], [80, 1.2], [400, 0.1]],
    gen(r, win) { const grid = []; for (let c = 0; c < 5; c++) { const col = shuffle(r, range(c * 15 + 1, c * 15 + 15)).slice(0, 5); for (let row = 0; row < 5; row++) grid[row * 5 + c] = col[row]; } grid[12] = 0;
      const full = win === BINGO_FULL * this.price; const k = full ? 0 : win ? Number(Object.keys(BINGO_PAY).find((n) => BINGO_PAY[n] * this.price === win)) : 0; const on = new Set(grid.filter((n) => n)); const off = shuffle(r, range(1, 75).filter((n) => !on.has(n)));
      if (full) return { grid, called: shuffle(r, grid.filter((n) => n)) };
      for (;;) { const lines = shuffle(r, BINGO_LINES).slice(0, k); const marked = new Set(); for (const L of lines) for (const i of L) if (i !== 12) marked.add(grid[i]); if (marked.size > 24) continue; const called = [...marked]; if (bingoLines(grid, called) !== k) continue;
        const extra = shuffle(r, grid.filter((n) => n && !marked.has(n))); for (const n of extra) { if (called.length >= 24 || r() < 0.55) continue; called.push(n); if (bingoLines(grid, called) !== k) called.pop(); }
        let o = 0; while (called.length < 24) called.push(off[o++]); const d = { grid, called: shuffle(r, called) }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { if (bingoFull(d.grid, d.called)) return BINGO_FULL * this.price; const n = bingoLines(d.grid, d.called); return n ? BINGO_PAY[Math.min(5, n)] * this.price : 0; } },
  { id: 'wort', name: 'Wortglück', price: 500, kind: 'fixed', blurb: 'Ganze Wörter aus deinen Buchstaben', rule: 'Rubble deine 15 Buchstaben frei. Jedes Wort, dessen Buchstaben alle dabei sind, ist komplett. Ab zwei kompletten Wörtern gewinnst du.',
    shape: [[1, 200], [4, 55], [15, 12], [60, 2], [500, 0.06]],
    gen(r, win) { const k = win ? Number(Object.keys(WORT_PAY).find((n) => WORT_PAY[n] * this.price === win)) : int(r, 0, 1);
      for (;;) { const words = shuffle(r, WORDS).slice(0, 6); const tgt = words.slice(0, k); const U = new Set(); for (const w of tgt) for (const c of letters(w)) U.add(c); if (U.size > 15) continue; const L = new Set(U); const pool = shuffle(r, [...'ABDEFGHIKLMNOPRSTUWZ']); for (const c of pool) { if (L.size >= 15) break; L.add(c); if (words.slice(k).some((w) => letters(w).every((x) => L.has(x)))) L.delete(c); } if (L.size < 15) continue; const d = { words: shuffle(r, words), letters: shuffle(r, [...L]) }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { const L = new Set(d.letters); const n = d.words.filter((w) => letters(w).every((c) => L.has(c))).length; return n >= 2 ? WORT_PAY[n] * this.price : 0; } },
  { id: 'gipfel', name: 'Gipfelsturm', price: 200, kind: 'ladder', steps: 9, blurb: 'Weiterklettern oder Kasse machen', rule: 'Rubble die Stufen von unten nach oben frei. Jede sichere Stufe erhöht deinen Gewinn, du kannst jederzeit Kasse machen. Kommt ein Absturz, ist alles weg.',
    gen(r, luck = 1) { const q = Math.pow(GIPFEL_Q, 1 / luck); let F = 1; while (F <= 9 && r() < q) F++; return { fall: F, prizes: GIPFEL.slice() }; },
    winAt(d, k) { return k >= 1 && k < d.fall ? d.prizes[k - 1] : 0; } },
  { id: 'rad', name: 'Glücksrad', price: 50, kind: 'fixed', blurb: 'Dreh am Rad, dann der Multiplikator', rule: 'Das Rad zeigt deinen Betrag, das Sternfeld den Multiplikator. Beides zusammen ist dein Gewinn. Landet das Rad auf einer Niete, gibt es nichts.',
    shape: [[1, 220], [2, 110], [3, 40], [4, 40], [10, 18], [20, 6], [40, 2], [100, 0.5], [200, 0.1]],
    gen(r, win) { if (!win) { const z = RAD_SEGS.map((a, i) => (a ? -1 : i)).filter((i) => i >= 0); return { seg: pick(r, z), mult: pick(r, RAD_MULT) }; } const opts = []; RAD_SEGS.forEach((a, i) => { for (const m of RAD_MULT) if (a && a * m === win) opts.push({ seg: i, mult: m }); }); return { ...pick(r, opts) }; },
    evaluate(d) { return RAD_SEGS[d.seg] * d.mult; } },
  { id: 'haus', name: 'Traumhaus', price: 300, kind: 'fixed', blurb: 'Sammle die Teile eines Hauses', rule: 'Hinter den neun Feldern liegen Hausteile und Rechnungen. Zwei verschiedene Teile geben den Einsatz zurück, drei das Dreifache, vier das Zwanzigfache. Das ganze Haus aus fünf Teilen ist der Hauptgewinn.',
    shape: [[1, 210], [3, 90], [20, 6], [500, 0.08]],
    gen(r, win) { const k = win ? Number(Object.keys(HOUSE_PAY).find((n) => HOUSE_PAY[n] * this.price === win)) : int(r, 0, 1); const parts = shuffle(r, HOUSE_PARTS).slice(0, k); const cells = [...parts]; const extra = k ? int(r, 0, 2) : 0; for (let i = 0; i < extra; i++) cells.push(pick(r, parts)); while (cells.length < 9) cells.push('rechnung'); return { cells: shuffle(r, cells) }; },
    evaluate(d) { const n = new Set(d.cells.filter((c) => c !== 'rechnung')).size; return HOUSE_PAY[n] ? HOUSE_PAY[n] * this.price : 0; } },
  { id: 'mond', name: 'Mondgestein', price: 500, kind: 'fixed', blurb: 'Drei Mondsteine, die Rakete verdoppelt', rule: 'Findest du in den zwölf Kratern mindestens drei Mondsteine, gewinnst du den Betrag im Gewinnfeld. Ist auch die Rakete dabei, verdoppelt sie den Gewinn.',
    shape: [[1, 200], [2, 100], [4, 40], [10, 14], [20, 5], [50, 1.4], [100, 0.5], [400, 0.08]],
    gen(r, win) { const G = [500, 1000, 2000, 5000, 10000, 25000, 50000, 100000]; let g; let rocket = false; let stones;
      if (win) { const twin = G.includes(win / 2) && (r() < 0.3 || !G.includes(win)); if (twin) { g = win / 2; rocket = true; } else g = win; stones = r() < 0.75 ? 3 : 4; } else { g = pick(r, G); stones = wpick(r, [[0, 1], [1, 3], [2, 6]]); rocket = r() < 0.3; }
      const cells = []; for (let i = 0; i < stones; i++) cells.push('stein'); if (rocket) cells.push('rakete'); while (cells.length < 12) cells.push('staub'); return { cells: shuffle(r, cells), g }; },
    evaluate(d) { const s = d.cells.filter((c) => c === 'stein').length; return s >= 3 ? d.g * (d.cells.includes('rakete') ? 2 : 1) : 0; } },
  { id: 'rallye', name: 'Theo-Ring Rallye', price: 1000, kind: 'fixed', blurb: 'Drei Runden gegen Bruno', rule: 'Drei Runden auf dem Theo-Ring: Bist du schneller als Bruno, gewinnst du den Betrag der Runde. Gewinnst du alle drei, gibt es den Hauptgewinn.',
    shape: [[1, 200], [2, 100], [3, 50], [5, 25], [10, 10], [25, 3], [100, 0.5], [500, 0.06]],
    gen(r, win) { const P = [1000, 2000, 3000, 5000, 10000, 25000, 100000]; const top = 500 * this.price; let won = [false, false, false]; const prizes = [0, 1, 2].map(() => wpick(r, P.map((p, i) => [p, [5, 4, 3, 2, 1, 0.5, 0.2][i]])));
      if (win === top) won = [true, true, true]; else if (win) { const parts = P.filter((a) => a < win && P.includes(win - a)); if (parts.length && r() < 0.35) { const a = pick(r, parts); const [i, j] = shuffle(r, [0, 1, 2]); won[i] = true; won[j] = true; prizes[i] = a; prizes[j] = win - a; } else { const i = int(r, 0, 2); won[i] = true; prizes[i] = win; } }
      const laps = won.map((w, i) => { const bruno = 820 + int(r, 0, 80); const you = w ? bruno - int(r, 1, 25) : bruno + int(r, 0, 25); return { bruno, you, p: prizes[i] }; }); return { laps }; },
    evaluate(d) { const w = d.laps.map((l) => l.you < l.bruno); if (w.every(Boolean)) return 500 * this.price; return sum(d.laps.map((l, i) => (w[i] ? l.p : 0))); } },
  { id: 'schnaps', name: 'Schnapszahl', price: 100, kind: 'fixed', blurb: 'Drei gleiche Ziffern', rule: 'Steht in einem der acht Felder eine Schnapszahl (111, 222 … 999), gewinnst du den Betrag darunter. Die 777 zahlt zehnfach.',
    shape: [[1, 200], [2, 100], [3, 50], [5, 25], [10, 12], [20, 5], [50, 1.4], [300, 0.1]],
    gen(r, win) { const P = [[100, 5], [200, 4], [300, 3], [500, 2], [1000, 1.5], [2000, 1], [5000, 0.5], [30000, 0.2]]; const no = () => { for (;;) { const n = r() < 0.4 ? pick(r, [7, 3, 5, 1, 9]) * 111 + pick(r, [1, -1, 10, -10, 100, -100]) * int(r, 1, 3) : int(r, 100, 999); if (n >= 100 && n <= 999 && n % 111 !== 0) return n; } };
      const fields = Array.from({ length: 8 }, () => ({ n: no(), p: wpick(r, P) })); if (win) { const i = int(r, 0, 7); const via777 = P.some(([p]) => p * 10 === win) && (r() < 0.4 || !P.some(([p]) => p === win)); fields[i] = via777 ? { n: 777, p: win / 10 } : { n: pick(r, [1, 2, 3, 4, 5, 6, 8, 9]) * 111, p: win }; } return { fields }; },
    evaluate(d) { return sum(d.fields.map((f) => (f.n % 111 === 0 ? f.p * (f.n === 777 ? 10 : 1) : 0))); } },
  { id: 'roulette', name: 'Rubbel-Roulette', price: 1000, kind: 'fixed', blurb: 'Fünf Wetten auf eine Kugel', rule: 'Rubble die Kugel frei: Sie zeigt eine Zahl von 0 bis 36. Jede deiner fünf Wetten, die dazu passt, zahlt ihren Betrag. Ein Volltreffer auf die Zahl ist der Hauptgewinn.',
    shape: [[1, 200], [2, 100], [3, 45], [5, 20], [10, 6], [36, 0.9], [360, 0.05]],
    gen(r, win) { const P = [[1000, 5], [2000, 4], [3000, 3], [5000, 2], [10000, 1], [36000, 0.3]]; const TYPES = ['rot', 'schwarz', 'gerade', 'ungerade', 'tief', 'hoch', 'd1', 'd2', 'd3']; const top = 360 * this.price;
      for (;;) { const n = win === top ? int(r, 0, 36) : int(r, 0, 36); const bets = []; const used = new Set(); const add = (b) => { const key = b.k === 'zahl' ? 'zahl' : b.k; if (used.has(key)) return false; used.add(key); bets.push(b); return true; };
        if (win === top) add({ k: 'zahl', n, p: win }); else if (win) { const m = r() < 0.3 ? 2 : 1; const match = shuffle(r, TYPES.filter((k) => betMatch({ k }, n))); if (match.length < m) continue; if (m === 1) add({ k: match[0], p: win }); else { const parts = P.map((x) => x[0]).filter((a) => a < win && P.some(([b]) => b === win - a)); if (!parts.length) { add({ k: match[0], p: win }); } else { const a = pick(r, parts); add({ k: match[0], p: a }); add({ k: match[1], p: win - a }); } } }
        const non = shuffle(r, TYPES.filter((k) => !betMatch({ k }, n))); const want = used.has('zahl') ? 5 : 4; for (const k of non) { if (bets.length >= want) break; add({ k, p: wpick(r, P) }); } if (!used.has('zahl')) { let x; do { x = int(r, 0, 36); } while (x === n); add({ k: 'zahl', n: x, p: 36000 }); } if (bets.length !== 5) continue; const d = { n, bets: shuffle(r, bets) }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { return sum(d.bets.map((b) => (betMatch(b, d.n) ? b.p : 0))); } },
  { id: 'muenze', name: 'Kopf oder Zahl', price: 100, kind: 'fixed', blurb: 'Eine lange Kopf-Serie', rule: 'Acht Münzwürfe von links nach rechts. Zählt die längste Serie aus Kopf: drei in Folge geben den Einsatz zurück, acht in Folge sind der Hauptgewinn.',
    shape: [[1, 200], [3, 70], [8, 20], [25, 5], [80, 1.2], [250, 0.15]],
    gen(r, win) { const k = win ? Number(Object.keys(MUENZE_PAY).find((n) => MUENZE_PAY[n] * this.price === win)) : wpick(r, [[0, 0.5], [1, 3], [2, 6]]); for (;;) { const s = Array.from({ length: 8 }, () => (r() < 0.5 ? 'K' : 'Z')); if (k) { const at = int(r, 0, 8 - k); for (let i = 0; i < k; i++) s[at + i] = 'K'; if (at > 0) s[at - 1] = 'Z'; if (at + k < 8) s[at + k] = 'Z'; } if (longestRun(s) === k) return { seq: s }; } },
    evaluate(d) { const k = longestRun(d.seq); return MUENZE_PAY[k] ? MUENZE_PAY[k] * this.price : 0; } },
  { id: 'mine', name: 'Diamantenmine', price: 500, kind: 'mines', blurb: 'Diamanten sammeln, Kohle meiden', rule: 'In der Mine liegen 16 Steine, darunter 3 Stück Kohle (bei heißer Glückssträhne nur 2, bei mieser 4). Jeder Diamant erhöht deine Kasse, du kannst jederzeit aufhören. Triffst du Kohle, ist die Kasse leer.',
    gen(r, luck = 1) { const coal = luck >= 1.3 ? 2 : luck < 0.8 ? 4 : MINE_COAL; const seq = shuffle(r, Array.from({ length: MINE_N }, (_, i) => (i < coal ? 'C' : 'D'))); return { seq, coal, pays: range(1, MINE_N - coal).map((k) => minePay(this.price, k, coal)) }; },
    winAt(d, k) { return k >= 1 && d.seq.slice(0, k).every((x) => x === 'D') ? d.pays[k - 1] : 0; } },
  { id: 'teo', name: 'Der goldene Teo', price: 2000, kind: 'fixed', blurb: 'Premium-Los mit Teos Laune', rule: 'Drei gleiche Symbole gewinnen laut Tabelle. Teos Laune im Bonusfeld multipliziert den Gewinn mit 1, 2 oder 4. Drei Teo-Köpfe bei bester Laune: 10.000 €.',
    shape: [[1, 200], [2, 120], [4, 60], [8, 20], [10, 12], [16, 5], [20, 4], [25, 3], [40, 1.2], [50, 0.8], [100, 0.3], [125, 0.15], [250, 0.05], [500, 0.015]],
    gen(r, win) { let sym = -1; let mult = pick(r, TEO_MULT); if (win) { const opts = []; TEO_PAY.forEach((p, i) => { for (const m of TEO_MULT) if (p * m * this.price === win) opts.push([i, m]); }); [sym, mult] = pick(r, opts); }
      for (;;) { const cells = []; const cnt = {}; if (sym >= 0) { for (let i = 0; i < 3; i++) cells.push(TEO_SYMS[sym]); cnt[TEO_SYMS[sym]] = 3; } const pool = TEO_SYMS.filter((_, i) => i !== sym); while (cells.length < 9) { const s = wpick(r, pool.map((x) => [x, x === 'teo' ? 0.6 : x === 'krone' ? 0.9 : 1.2])); if ((cnt[s] || 0) >= 2) continue; cnt[s] = (cnt[s] || 0) + 1; cells.push(s); } const d = { cells: shuffle(r, cells), mult }; if (this.evaluate(d) === win) return d; } },
    evaluate(d) { const cnt = {}; for (const s of d.cells) cnt[s] = (cnt[s] || 0) + 1; const s = Object.keys(cnt).find((k) => cnt[k] >= 3); return s ? TEO_PAY[TEO_SYMS.indexOf(s)] * this.price * d.mult : 0; } },
];
export const CARD = Object.fromEntries(CARDS.map((c) => [c.id, c]));
for (const c of CARDS) { if (c.shape) c.tiers = plan(c.price, c.shape, c.ev || 1.1); }
// Hauptgewinn und Gewinnchance für Stand und Anzeige
for (const c of CARDS) {
  if (c.kind === 'ladder') { c.top = c.gen(rng(1)).prizes[c.steps - 1]; c.chance = GIPFEL_Q; }
  else if (c.kind === 'mines') { c.top = c.gen(rng(1)).pays[MINE_N - MINE_COAL - 1]; c.chance = (MINE_N - MINE_COAL) / MINE_N; }
  else { c.top = Math.max(...c.tiers.map((t) => t.win)); c.chance = sum(c.tiers.map((t) => t.p)); }
}
export const GIPFEL_PRIZES = GIPFEL;

// Ein Los aus Sorte und Seed. win ist bei festen Losen schon bekannt, bei interaktiven entscheidet erst der Spieler (winAt).
export function makeCard(cid, seed, luck = 1) {
  const c = CARD[cid]; const r = rng(seed ^ 0x5eed1234); luck = Math.round((luck || 1) * 100) / 100;
  if (c.kind === 'ladder' || c.kind === 'mines') return { cid, seed, luck, kind: c.kind, data: c.gen(r, luck), win: null };
  const win = drawTier(r, c.tiers, luck); return { cid, seed, luck, kind: c.kind, data: c.gen(r, win), win };
}
export const cardOf = (card) => makeCard(card.cid, card.seed, card.luck || 1);
// Endgültiger Gewinn eines Loses: k = Anzahl gültiger Schritte (Gipfel: sichere Stufen, Mine: Diamanten)
export function cardWin(card, k = 0) { const c = CARD[card.cid]; if (card.kind === 'ladder' || card.kind === 'mines') return c.winAt(card.data, k); return card.win; }

// ---------------- Spielstand der Familie ----------------
export function newSave() { return { v: 3, day: 1, clock: OPEN, where: 'casino', debts: CONTRACTS.map((c) => ({ id: c.id, rest: c.rest })), owned: [], strikes: 0, events: null, eventsDay: 0, done2: [], bruno: null, report: null, purse: START_PURSE, peak: START_PURSE, level: 1, intro: false, found: [], done: [], types: {}, bought: 0, spent: 0, won: 0, best: 0, scratched: 0, inv: {}, uid: 1, gift: 0, seen: [], loan: null, loanCount: 0, giftDay: 0, karmaDay: 0, over: null, coins: {}, coinEq: {}, coinBought: 0, jackpot: 50000, free: {}, slotStats: { spins: 0, won: 0, best: 0, free: 0 }, bj: {}, bjStats: { hands: 0, won: 0, bj: 0, best: 0, doubleWins: 0 }, rouStats: { spins: 0, won: 0, best: 0, straight: 0 }, rouLast: [], arcStats: { plinko: 0, wheel: 0, bingo: 0, best: 0, won: 0, bingos: 0, teo: 0, edge: 0 } }; }
export function fixSave(S) { const d = newSave(); const o = { ...d, ...(S && typeof S === 'object' ? S : {}) }; for (const k of ['found', 'done', 'seen']) if (!Array.isArray(o[k])) o[k] = []; if (!o.types || typeof o.types !== 'object') o.types = {}; if (!o.inv || typeof o.inv !== 'object') o.inv = {}; o.purse = Math.max(0, Math.round(Number(o.purse) || 0)); if (o.loan && !(o.loan.rest > 0)) o.loan = null; o.peak = Math.max(o.peak || 0, o.purse - loanRest(o)); o.level = levelFor(o.peak); if (!Array.isArray(o.debts) || !o.debts.length) o.debts = CONTRACTS.map((c) => ({ id: c.id, rest: c.rest })); if (!Array.isArray(o.owned)) o.owned = []; if (!Array.isArray(o.done2)) o.done2 = []; o.day = Math.max(1, o.day | 0 || 1); o.clock = Math.min(CLOSE, Math.max(OPEN, Number(o.clock) || OPEN)); if (o.where !== 'home') o.where = 'casino'; for (const k of ['coins', 'coinEq', 'free']) if (!o[k] || typeof o[k] !== 'object') o[k] = {}; if (!o.slotStats || typeof o.slotStats !== 'object') o.slotStats = { spins: 0, won: 0, best: 0, free: 0 }; if (!(o.jackpot > 0)) o.jackpot = 50000; o.v = 3; return o; }
export function levelFor(peak) { let n = 1; for (const L of LEVELS) if (peak >= L.need) n = L.n; return n; }
export const nextLevel = (S) => LEVELS.find((L) => L.n === S.level + 1) || null;
const invOf = (S, who) => (S.inv[who] = S.inv[who] || []);

// Kauf: zieht den Preis ab und legt Lose ins Inventar. seedOf(i) liefert je Los einen Seed (Host würfelt).
export function buy(S, who, cid, n = 1, seedOf = () => (Math.random() * 4294967296) >>> 0, o = {}) {
  const c = CARD[cid]; if (!c) return { ok: false, why: 'Unbekanntes Los' }; n = Math.max(1, Math.min(10, n | 0)); const each = Math.round(c.price * (1 - (o.discount || 0))); const cost = each * n; const luck = Math.round((o.luck || 1) * 100) / 100;
  if (S.purse < cost) return { ok: false, why: 'Die Familienkasse reicht nicht' };
  S.purse -= cost; S.spent += cost; S.bought += n; const out = [];
  for (let i = 0; i < n; i++) { const card = { uid: S.uid++, cid, seed: seedOf(i) >>> 0, st: 'neu', luck }; invOf(S, who).push(card); out.push(card); }
  return { ok: true, cards: out, cost };
}
// Geschenk vom Haus: ein Glücksrad, wenn die Kasse leer ist und nichts mehr zum Rubbeln da ist (höchstens einmal pro Minute)
export function giftReady(S, now) { const any = Object.values(S.inv).some((L) => L.some((c) => c.st !== 'fertig')); return S.purse < CARD.rad.price && !any && S.giftDay !== S.day; } // höchstens einmal am Tag
export function gift(S, who, now, seed) { if (!giftReady(S, now)) return null; S.gift = now; S.giftDay = S.day; const card = { uid: S.uid++, cid: 'rad', seed: seed >>> 0, st: 'neu', gift: true }; invOf(S, who).push(card); return card; }
// Einlösen: Gewinn gutschreiben, Statistik, Level prüfen. Gibt { win, level } zurück, level > 0 heißt neu freigeschaltet.
export function claim(S, who, uid, k = 0, mult = 1, o = {}) { // o.coin: Rubbelmünze, mit der das Los gerubbelt wurde (Glück und Geld-Multiplikator)
  const L = invOf(S, who); const card = L.find((c) => c.uid === uid); if (!card || card.st === 'fertig') return null;
  const box = (S.coins = S.coins || {})[who] || {}; const coin = o.coin && o.coin !== 'kupfer' && box[o.coin] > 0 ? SCOIN[o.coin] : null;
  const win = Math.round(cardWin(makeCard(card.cid, card.seed, (card.luck || 1) * (coin ? coin.luck : 1)), k) * (mult || 1) * (coin ? coin.money : 1)); card.st = 'fertig'; card.won = win; card.k = k;
  if (coin) { card.coin = coin.id; box[coin.id]--; if (box[coin.id] <= 0) { delete box[coin.id]; if (S.coinEq && S.coinEq[who] === coin.id) S.coinEq[who] = 'kupfer'; } }
  S.purse += win; S.won += win; S.best = Math.max(S.best, win); S.scratched++; S.types[card.cid] = (S.types[card.cid] || 0) + 1;
  const before = S.level; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak); return { win, card, level: S.level > before ? S.level : 0 };
}
export function discard(S, who, uid) { const L = invOf(S, who); const i = L.findIndex((c) => c.uid === uid && c.st === 'fertig'); if (i >= 0) L.splice(i, 1); return i >= 0; }
// Gerubbelte Lose bleiben im Inventar, bis man sie wegwirft. Der gemeinsame Stand geht bei jeder Änderung an alle Mitspieler und wuchs deshalb Los um Los (210 Lose = 18 KB).
// Der Host behält darum je Spieler nur die neuesten gerubbelten Lose; ungerubbelte bleiben immer. Zähler, Gewinne und Aufgaben hängen nicht am Inventar. Gibt die Zahl entfernter Lose zurück.
export function trimFinished(S, keep = 40) {
  let n = 0; for (const who of Object.keys(S.inv || {})) { const L = S.inv[who]; if (!Array.isArray(L)) continue; const done = L.filter((c) => c.st === 'fertig'); if (done.length <= keep) continue;
    const gone = new Set(done.slice().sort((a, b) => a.uid - b.uid).slice(0, done.length - keep).map((c) => c.uid)); S.inv[who] = L.filter((c) => !gone.has(c.uid)); n += gone.size; }
  return n;
}

// ---------------- Missionen und verlorene Münzen ----------------
export const MISSIONS = [
  { id: 'erstes', name: 'Der erste Versuch', text: 'Kaufe dein erstes Rubbellos am Stand.', reward: 200, done: (S) => S.bought >= 1 },
  { id: 'gerubbelt', name: 'Ran an den Rubbeltisch', text: 'Rubble ein Los am Rubbeltisch frei.', reward: 300, done: (S) => S.scratched >= 1 },
  { id: 'muenzen3', name: 'Augen auf', text: 'Finde 3 verlorene Münzen im Casino.', reward: 500, done: (S) => S.found.length >= 3 },
  { id: 'sorten5', name: 'Probierfreudig', text: 'Rubble 5 verschiedene Sorten.', reward: 1000, done: (S) => Object.keys(S.types).length >= 5 },
  { id: 'gross', name: 'Glückspilz', text: 'Gewinne mit einem einzigen Los mindestens 20 €.', reward: 500, done: (S) => S.best >= 2000 },
  { id: 'kasse100', name: 'Erste Rücklage', text: 'Bring die Familienkasse auf 100 €.', reward: 1000, done: (S) => S.peak >= 10000 },
  { id: 'muenzen', name: 'Schatzjäger', text: 'Finde alle verlorenen Münzen im Casino.', reward: 2500, done: (S) => S.found.length >= COINS.length },
  { id: 'sorten10', name: 'Kenner', text: 'Rubble 10 verschiedene Sorten.', reward: 2000, done: (S) => Object.keys(S.types).length >= 10 },
  { id: 'alle', name: 'Sammelalbum', text: 'Rubble alle 20 Sorten mindestens einmal.', reward: 5000, done: (S) => Object.keys(S.types).length >= CARDS.length },
  { id: 'upgrade', name: 'Schöner wohnen', text: 'Kauf am Familien-PC das erste Stück für die Wohnung.', reward: 300, done: (S) => (S.owned || []).length >= 1 },
  { id: 'woche', name: 'Eine Woche geschafft', text: 'Übersteht die erste Woche mit Abrechnung.', reward: 1000, done: (S) => (S.day || 1) >= 8 },
  { id: 'bruno', name: 'Brunos Bezwinger', text: 'Besiege Big Bruno Gamblemeister im Rubbel-Duell.', reward: 1500, done: (S) => (S.brunoWins || 0) >= 1 },
  { id: 'muenze', name: 'Glücksbringer', text: 'Kauf im Münzkabinett deine erste Rubbelmünze.', reward: 200, done: (S) => (S.coinBought || 0) >= 1 },
  { id: 'dreh', name: 'Erster Dreh', text: 'Spiel eine Runde an einem Automaten in der Automatenhalle.', reward: 200, done: (S) => !!(S.slotStats && S.slotStats.spins >= 1) },
  { id: 'frei', name: 'Freispiele!', text: 'Löse an einem Automaten Freispiele aus (drei Bonus-Münzen).', reward: 500, done: (S) => !!(S.slotStats && S.slotStats.free >= 1) },
  { id: 'automat50', name: 'Volltreffer', text: 'Gewinne an einem Automaten mit einem Dreh mindestens 50 €.', reward: 1000, done: (S) => !!(S.slotStats && S.slotStats.best >= 5000) },
  { id: 'bj1', lv: 3, name: 'Erste Hand', text: 'Spiel eine Runde Blackjack im Kartensalon.', reward: 1000, done: (S) => !!(S.bjStats && S.bjStats.hands >= 1) },
  { id: 'bjbj', lv: 3, name: 'Blackjack!', text: 'Bekomme einen Blackjack: Ass und eine Zehn als erste zwei Karten.', reward: 2500, done: (S) => !!(S.bjStats && S.bjStats.bj >= 1) },
  { id: 'bjdop', lv: 3, name: 'Doppelt hält besser', text: 'Gewinne eine Hand, auf die du verdoppelt hast.', reward: 3000, done: (S) => !!(S.bjStats && S.bjStats.doubleWins >= 1) },
  { id: 'rou1', lv: 4, name: 'Rien ne va plus', text: 'Spiel eine Runde Roulette in der Roulette-Galerie.', reward: 2500, done: (S) => !!(S.rouStats && S.rouStats.spins >= 1) },
  { id: 'plinko1', lv: 5, name: 'Kugel fällt', text: 'Lass in der Spielhalle eine Plinko-Kugel fallen.', reward: 5000, done: (S) => !!(S.arcStats && S.arcStats.plinko >= 1) },
  { id: 'plinkorand', lv: 5, name: 'Ganz außen', text: 'Bring eine Plinko-Kugel in eines der beiden äußersten Fächer.', reward: 20000, done: (S) => !!(S.arcStats && S.arcStats.edge >= 1) },
  { id: 'rad1', lv: 5, name: 'Dreh am Rad', text: 'Dreh einmal an Teos Glücksrad.', reward: 5000, done: (S) => !!(S.arcStats && S.arcStats.wheel >= 1) },
  { id: 'radteo', lv: 5, name: 'TEO!', text: 'Gewinne am Glücksrad auf dem TEO-Feld.', reward: 30000, done: (S) => !!(S.arcStats && S.arcStats.teo >= 1) },
  { id: 'bingo1', lv: 5, name: 'Bingo!', text: 'Schaff beim Turbo-Bingo eine Reihe bis zur 30. Kugel.', reward: 10000, done: (S) => !!(S.arcStats && S.arcStats.bingos >= 1) },
  { id: 'rouzahl', lv: 4, name: 'Volltreffer auf Zahl', text: 'Gewinne mit einer einzelnen Zahl (35 zu 1).', reward: 10000, done: (S) => !!(S.rouStats && S.rouStats.straight >= 1) },
];
// Gibt neu erfüllte Missionen zurück und schreibt die Belohnung gut
export function checkMissions(S) { const out = []; for (const m of MISSIONS) if (!S.done.includes(m.id) && m.done(S)) { S.done.push(m.id); S.purse += m.reward; S.peak = Math.max(S.peak, netWorth(S)); out.push(m); } if (out.length) S.level = levelFor(S.peak); return out; }
export const openMissions = (S, n = 3) => MISSIONS.filter((m) => !S.done.includes(m.id) && (!m.lv || (S.level || 1) >= m.lv)).slice(0, n);
// Verlorene Münzen: Wert je Fundstelle (die Orte legt casinoart.js fest)
export const COINS = [
  { id: 'brunnen', v: 200, hint: 'im Brunnen' }, { id: 'bar', v: 100, hint: 'hinter der Bar' }, { id: 'pflanze', v: 50, hint: 'bei einer Palme' }, { id: 'kiosk', v: 100, hint: 'hinter dem Losstand' },
  { id: 'foyer', v: 50, hint: 'im Foyer' }, { id: 'tisch', v: 200, hint: 'unter einem Rubbeltisch' }, { id: 'statue', v: 500, hint: 'am Sockel der Statue' }, { id: 'lounge', v: 2500, hint: 'ganz hinten vor dem Aufzug' },
];
export function findCoin(S, id) { const c = COINS.find((x) => x.id === id); if (!c || S.found.includes(id)) return 0; S.found.push(id); S.purse += c.v; S.peak = Math.max(S.peak, netWorth(S)); S.level = levelFor(S.peak); return c.v; }

// ---------------- Tage, Uhrzeit, Glückssträhne ----------------
// Das Casino öffnet um 10 Uhr (Ankunft mit dem Bus), ab 20 Uhr darf die Familie nach Hause, um 24 Uhr trägt die Security alle hinaus.
// Eine Spielminute dauert eine echte Sekunde: ein Casinotag sind 14 Minuten. Die Glückssträhne wird mit jeder Stunde besser, am besten kurz vor Mitternacht.
export const OPEN = 600; export const LEAVE = 1200; export const CLOSE = 1440; export const WARN = 1410;
export const MIN_PER_SEC = 1;
export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const LUCK_CURVE = [[OPEN, 1.0], [840, 1.1], [1080, 1.22], [1200, 1.35], [1320, 1.5], [1380, 1.6], [CLOSE, 1.7]];
export function baseLuck(min) { for (let i = 1; i < LUCK_CURVE.length; i++) { const [m1, l1] = LUCK_CURVE[i]; const [m0, l0] = LUCK_CURVE[i - 1]; if (min <= m1) return l0 + (l1 - l0) * Math.max(0, (min - m0) / (m1 - m0)); } return LUCK_CURVE[LUCK_CURVE.length - 1][1]; }
export const clockText = (min) => { const m = Math.min(CLOSE, Math.max(0, Math.floor(min))); return String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
export const dayInfo = (day) => ({ week: Math.ceil(day / 7), wd: ((day - 1) % 7) + 1, name: WEEKDAYS[(day - 1) % 7] });
export const luckWord = (l) => (l < 0.8 ? 'mies' : l < 0.95 ? 'mau' : l < 1.08 ? 'normal' : l < 1.25 ? 'gut' : l < 1.4 ? 'heiß' : 'glühend');
// Glück für ein Spiel (game: 'lose', später 'slots' usw.) aus Uhrzeit, Wohnungs-Upgrades und laufenden Ereignissen
export function luckFor(S, game = 'lose', min = S.clock) {
  let l = baseLuck(min) + (S.karmaDay === S.day ? 0.05 : 0); for (const id of S.owned || []) { const it = HOME[id]; if (!it || !it.eff) continue; if (it.eff.morning && min < 960) l += it.eff.morning; }
  for (const e of activeEvents(S, min)) if (e.luck) l += e.luck;
  let m = 1; for (const id of S.owned || []) { const it = HOME[id]; if (!it || !it.eff) continue; if (it.eff.all) m *= it.eff.all; if (it.eff[game]) m *= it.eff[game]; }
  return Math.round(l * m * 100) / 100;
}

// ---------------- Schulden (die Verträge aus dem Intro) ----------------
// Jede Woche wird am Ende von Tag 7 die Rate fällig. Die Raten steigen von Level zu Level. Fehlt Geld: Mahnung mit 15 % Aufschlag,
// nach drei verpassten Wochen pfändet der Gerichtsvollzieher das wertvollste Stück der Wohnung.
export const CONTRACTS = [
  { id: 'miete', name: 'Mietrückstand · Vermietung Krause', rest: 120000, rate: 2500 },
  { id: 'strom', name: 'Stadtwerke · Strom und Gas', rest: 48000, rate: 800 },
  { id: 'inkasso', name: 'Inkasso Schmidt', rest: 90000, rate: 1000 },
  { id: 'telefon', name: 'Telefon und Netz', rest: 16000, rate: 400 },
  { id: 'versicherung', name: 'Versicherung', rest: 26000, rate: 500 },
];
export const CONTRACT = Object.fromEntries(CONTRACTS.map((c) => [c.id, c]));
export const LEVEL_RATE = [1, 2.5, 6, 15, 40, 100, 220, 450, 900, 1800];
export const rateOf = (S, c) => Math.min(c.rest, Math.round(CONTRACT[c.id].rate * LEVEL_RATE[Math.min(9, S.level - 1)]));
export const weeklyDue = (S) => sum(S.debts.filter((c) => c.rest > 0).map((c) => rateOf(S, c))) + (loanRest(S) > 0 ? Math.min(S.loan.rest, S.loan.rate) : 0);
export const debtTotal = (S) => sum(S.debts.map((c) => c.rest));
export function payDebt(S, id, amount) { const c = S.debts.find((x) => x.id === id); if (!c || c.rest <= 0) return 0; const a = Math.max(0, Math.min(amount | 0, c.rest, S.purse)); c.rest -= a; S.purse -= a; return a; }
export function settleWeek(S) {
  const due = weeklyDue(S); let paid = 0; const lines = [];
  for (const c of S.debts) { if (c.rest <= 0) continue; const want = rateOf(S, c); const a = Math.min(want, S.purse); c.rest -= a; S.purse -= a; paid += a; lines.push({ id: c.id, want, paid: a }); }
  if (loanRest(S) > 0) { const want = Math.min(S.loan.rest, S.loan.rate); const a = Math.min(want, S.purse); S.loan.rest -= a; S.purse -= a; paid += a; lines.push({ id: 'kredit', want, paid: a }); if (S.loan.rest <= 0) S.loan = null; }
  const missing = due - paid; let fee = 0; let seized = null;
  if (missing > 0) { fee = Math.round(missing * 0.15); const ink = S.debts.find((c) => c.id === 'inkasso'); ink.rest += fee; S.strikes = (S.strikes || 0) + 1;
    if (S.strikes >= 3) { const best = (S.owned || []).map((id) => HOME[id]).filter(Boolean).sort((a, b) => b.price - a.price)[0]; if (best) { S.owned = S.owned.filter((x) => x !== best.id); seized = best.id; } S.strikes = 0; } }
  else S.strikes = 0;
  const free = S.debts.every((c) => c.rest <= 0); S.report = { week: dayInfo(S.day).week, due, paid, missing: Math.max(0, missing), fee, seized, strikes: S.strikes, free, lines }; return S.report;
}

// ---------------- Wohnung: Glücks-Upgrades und Dekoration (kaufbar am PC) ----------------
export const HOME_ITEMS = [
  { id: 'hufeisen', kind: 'glueck', name: 'Hufeisen über der Tür', price: 4000, lv: 1, eff: { all: 1.05 }, text: 'Glück +5 % bei allem.' },
  { id: 'kaffee', kind: 'glueck', name: 'Kaffeemaschine „Frühaufsteher“', price: 6000, lv: 1, eff: { morning: 0.1 }, text: 'Bis 16 Uhr ist die Glückssträhne um 0,1 besser.' },
  { id: 'kleeblatt', kind: 'glueck', name: 'Vierblättriges Kleeblatt im Goldrahmen', price: 9000, lv: 1, eff: { lose: 1.1 }, text: 'Glück beim Rubbeln +10 %.' },
  { id: 'rubbeltisch', kind: 'glueck', name: 'Eigener Rubbeltisch', price: 45000, lv: 1, eff: { lose: 1.5 }, text: 'Erhöhte Glückssträhne ×1,5 bei allen Rubbellosen.' },
  { id: 'automat', kind: 'glueck', name: 'Eigener Spielautomat', price: 90000, lv: 2, eff: { slots: 1.5 }, text: 'Glück ×1,5 an den Automaten (wirkt ab Level 2).' },
  { id: 'kartentisch', kind: 'glueck', name: 'Pokertisch fürs Wohnzimmer', price: 250000, lv: 3, eff: { karten: 1.5 }, text: 'Glück ×1,5 im Kartensalon (wirkt ab Level 3).' },
  { id: 'miniroulette', kind: 'glueck', name: 'Mini-Roulette', price: 600000, lv: 4, eff: { roulette: 1.5 }, text: 'Glück ×1,5 am Roulette (wirkt ab Level 4).' },
  { id: 'teppich', kind: 'deko', name: 'Weicher Teppich', price: 3500, text: 'Macht den kalten Boden gemütlich.' },
  { id: 'pflanze', kind: 'deko', name: 'Große Zimmerpflanze', price: 2500, text: 'Statt des vertrockneten Stängels.' },
  { id: 'lampe', kind: 'deko', name: 'Stehlampe mit Schirm', price: 4500, text: 'Warmes Licht statt nackter Glühbirne.' },
  { id: 'vorhang', kind: 'deko', name: 'Samtvorhänge', price: 6000, text: 'Rot und schwer, wie im Casino.' },
  { id: 'bild', kind: 'deko', name: 'Ölgemälde von Teo', price: 12000, text: 'Teo schaut euch jetzt auch zu Hause zu.' },
  { id: 'tapete', kind: 'deko', name: 'Neue Tapete', price: 15000, text: 'Goldener Damast statt fleckiger Streifen.' },
  { id: 'sofa', kind: 'deko', name: 'Neues Ledersofa', price: 18000, text: 'Das alte Sofa hat ausgedient.' },
  { id: 'tv', kind: 'deko', name: 'Großer Fernseher', price: 25000, text: 'Mit Casino-Kanal.' },
  { id: 'aquarium', kind: 'deko', name: 'Aquarium mit Goldfischen', price: 30000, text: 'Goldfische bringen Glück. Sagt man.' },
  { id: 'goldteo', kind: 'deko', name: 'Mini-Teo aus Gold', price: 50000, text: 'Die Statue aus der Halle, für zu Hause.' },
];
export const HOME = Object.fromEntries(HOME_ITEMS.map((x) => [x.id, x]));
export function buyHome(S, id) { const it = HOME[id]; if (!it) return { ok: false, why: 'Gibt es nicht' }; if ((S.owned || []).includes(id)) return { ok: false, why: 'Schon gekauft' }; if (S.level < (it.lv || 1)) return { ok: false, why: 'Erst ab Level ' + it.lv }; if (S.purse < it.price) return { ok: false, why: 'Die Familienkasse reicht nicht' }; S.purse -= it.price; S.owned = [...(S.owned || []), id]; return { ok: true, item: it }; }

// ---------------- Ereignisse ----------------
// Kleine Ereignisse wechseln von Tag zu Tag (fest aus dem Tag berechnet, bei allen gleich). Große Ereignisse haben einen festen Termin und eine Cutscene.
export const DAY_EVENTS = [
  { id: 'happy', name: 'Happy Hour', from: 1080, to: 1200, luck: 0.15, text: 'Von 18 bis 20 Uhr ist die Glückssträhne deutlich besser.' },
  { id: 'rabatt', name: 'Losverkäufer-Rabatt', from: 720, to: 840, discount: 0.2, text: 'Von 12 bis 14 Uhr kosten alle Lose 20 Prozent weniger.' },
  { id: 'boerse', name: 'Verlorene Geldbörse', from: 900, to: CLOSE, wallet: 1500, text: 'Ein Gast hat seine Geldbörse verloren. Wer sie findet, bekommt 15 € Finderlohn.' },
  { id: 'strom', name: 'Stromausfall', from: 960, to: 1020, luck: 0.1, dark: true, text: 'Stromausfall! Bei Notlicht rubbelt es sich besser: Glück +0,1.' },
  { id: 'teo', name: 'Teo besucht seine Statue', from: 1260, to: 1290, gift: 500, text: 'Teo persönlich besucht seine Statue und spendiert jeder Familie 5 €.' },
  { id: 'gratis', name: 'Glücksrad des Hauses', from: 1140, to: 1170, free: 'rad', text: 'Das Haus verschenkt an jede Familie ein Glücksrad-Los.' },
  { id: 'doppel', name: 'Doppelte Gewinne', from: 1320, to: 1380, double: true, text: 'Von 22 bis 23 Uhr zählt jeder Gewinn doppelt!' },
];
export const BIG_EVENTS = [
  { id: 'bruno', day: 2, at: 1080, until: 1380, name: 'Big Bruno Gamblemeister', text: 'Big Bruno Gamblemeister ist im Casino! Rubbel-Duell an Tisch 3: Einsatz 10 €, wer mehr gewinnt, bekommt 150 €.', stake: 1000, pot: 15000, table: 2 },
  { id: 'bruno', day: 19, at: 1140, until: 1410, name: 'Big Bruno Gamblemeister kehrt zurück', text: 'Big Bruno ist zurück und will Revanche! Rubbel-Duell an Tisch 3: Einsatz 25 €, der Sieger bekommt 400 €.', stake: 2500, pot: 40000, table: 2 },
];
export const EVENT = Object.fromEntries(DAY_EVENTS.map((e) => [e.id, e]));
export function eventsFor(day) { if (day <= 1) return ['happy']; const r = rng(day * 7919 + 13); const pool = shuffle(r, DAY_EVENTS.map((e) => e.id)); const n = r() < 0.35 ? 2 : 1; const out = pool.slice(0, n); if (r() < 0.4 && !out.includes('happy')) out.push('happy'); return out; }
export const bigEventFor = (day) => BIG_EVENTS.find((e) => e.day === day) || null;
export function activeEvents(S, min = S.clock) { return eventsFor(S.day).map((id) => EVENT[id]).filter((e) => min >= e.from && min < e.to); }
export const discountNow = (S) => Math.max(0, ...activeEvents(S).map((e) => e.discount || 0));
export const doubleNow = (S) => (activeEvents(S).some((e) => e.double) ? 2 : 1);
// Neuer Tag: Uhr auf 10 Uhr, ab ins Casino. Am Ende von Tag 7 wird vorher die Woche abgerechnet (settleWeek).
export function nextDay(S) { const report = S.day % 7 === 0 ? settleWeek(S) : null; S.day++; S.clock = OPEN; S.where = 'casino'; S.bruno = null; return report; }
// Rubbel-Duell gegen Big Bruno: drei Dreierglück-Lose je Seite, wer in Summe mehr gewinnt, bekommt den Topf
export function brunoCards(day, luck = 1) { const r = rng(day * 104729 + 7); return [0, 1, 2].map(() => makeCard('drei', (r() * 4294967296) >>> 0, luck)); }

// ---------------- Teo Bank: Sofortkredit am Bankautomaten neben dem Casino ----------------
// Ein Kredit gleichzeitig, 50 bis 5.000 €. 10 % Gebühr, Rückzahlung in vier Wochenraten (Sonntagnacht mit den Verträgen).
// Geliehenes Geld zählt nicht für die Level: maßgeblich ist das Vermögen (Kasse minus Kreditrest).
export const LOANS = [5000, 10000, 25000, 50000, 100000, 500000];
export const LOAN_FEE = 0.1; export const LOAN_WEEKS = 4;
export const loanRest = (S) => (S && S.loan && S.loan.rest > 0 ? S.loan.rest : 0);
export const netWorth = (S) => S.purse - loanRest(S);
export function takeLoan(S, amount) {
  if (!LOANS.includes(amount)) return { ok: false, why: 'Diesen Betrag gibt der Automat nicht aus.' };
  if (S.over) return { ok: false, why: 'Die Karte wurde eingezogen.' };
  if (loanRest(S) > 0) return { ok: false, why: `Es läuft schon ein Kredit (Rest ${euro(S.loan.rest)}). Erst zurückzahlen, dann gibt es einen neuen.` };
  const debt = Math.round(amount * (1 + LOAN_FEE)); S.loan = { amount, debt, rest: debt, rate: Math.ceil(debt / LOAN_WEEKS), day: S.day }; S.purse += amount; S.loanCount = (S.loanCount || 0) + 1;
  return { ok: true, loan: S.loan };
}
export function payLoan(S, amount) { if (loanRest(S) <= 0) return 0; const a = Math.max(0, Math.min(amount | 0, S.loan.rest, S.purse)); S.loan.rest -= a; S.purse -= a; if (S.loan.rest <= 0) S.loan = null; return a; }

// ---------------- Pleite ----------------
// Pleite ist die Familie, wenn nichts mehr geht: kein Geld für den kleinsten Einsatz, kein Los mehr zum Rubbeln, schon ein Kredit offen
// und das Geschenk des Hauses für heute verbraucht. Dann kommt die Schluss-Szene.
export const minStake = (S) => (S.level >= 2 ? 10 : Math.min(...CARDS.map((c) => c.price)));
export function isBroke(S) { if (!S || S.over) return false; const open = Object.values(S.inv || {}).some((L) => L.some((c) => c.st !== 'fertig')); return S.purse < minStake(S) && !open && loanRest(S) > 0 && S.giftDay === S.day; }

// ---------------- Rubbelmünzen (Münzkabinett) ----------------
// Mit welcher Münze gerubbelt wird, entscheidet über Glück (beeinflusst den Gewinnplan) oder Geld (Multiplikator auf den Gewinn).
export const SCRATCH_COINS = [
  { id: 'kupfer', name: 'Kupfer-Teo', price: 0, uses: 0, luck: 1, money: 1, color: 0xc87a3a, text: 'Die Münze, mit der alles anfing. Kein Bonus, hält ewig.' },
  { id: 'silber', name: 'Silbertaler', price: 1500, uses: 10, luck: 1.15, money: 1, color: 0xdfe4ea, text: 'Glück ×1,15 für 10 Lose.' },
  { id: 'gold', name: 'Goldtaler', price: 4000, uses: 10, luck: 1, money: 1.5, color: 0xf2c14e, text: 'Gewinne ×1,5 für 10 Lose.' },
  { id: 'klee', name: 'Kleeblatt-Münze', price: 6000, uses: 8, luck: 1.3, money: 1, color: 0x3fb868, text: 'Glück ×1,3 für 8 Lose.' },
  { id: 'platin', name: 'Platin-Teo', price: 15000, uses: 12, luck: 1, money: 2, color: 0xeef4ff, lv: 2, text: 'Gewinne ×2 für 12 Lose.' },
  { id: 'diamant', name: 'Diamant-Teo', price: 30000, uses: 12, luck: 1.3, money: 2, color: 0x8ad8ff, lv: 3, text: 'Glück ×1,3 und Gewinne ×2 für 12 Lose.' },
];
export const SCOIN = Object.fromEntries(SCRATCH_COINS.map((c) => [c.id, c]));
export function buyCoin(S, who, id) {
  const c = SCOIN[id]; if (!c || !c.price) return { ok: false, why: 'Gibt es nicht' }; if (S.level < (c.lv || 1)) return { ok: false, why: 'Erst ab Level ' + c.lv };
  if (S.purse < c.price) return { ok: false, why: 'Die Familienkasse reicht nicht' };
  S.purse -= c.price; S.spent += c.price; S.coinBought = (S.coinBought || 0) + 1; const box = ((S.coins = S.coins || {})[who] = S.coins[who] || {}); box[id] = (box[id] || 0) + c.uses; (S.coinEq = S.coinEq || {})[who] = id;
  return { ok: true, coin: c };
}
export function coinOf(S, who) { const id = (S.coinEq || {})[who]; const left = id && S.coins && S.coins[who] ? S.coins[who][id] || 0 : 0; return id && id !== 'kupfer' && left > 0 ? SCOIN[id] : SCOIN.kupfer; }
export const coinLeft = (S, who, id) => ((S.coins || {})[who] || {})[id] || 0;
export function equipCoin(S, who, id) { if (!SCOIN[id] || (id !== 'kupfer' && !(coinLeft(S, who, id) > 0))) return false; (S.coinEq = S.coinEq || {})[who] = id; return true; }
