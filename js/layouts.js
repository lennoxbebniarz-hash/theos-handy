// Theos Seitenscheidel - Streckenentwurf: erzeugt aus einem Seed eine 5-km-Strecke mit gewünschtem Schwierigkeitsgrad.
// Format wie LAYOUT in track.js: [Länge m, Radius m (+ links, - rechts, 0 gerade), 'm' = Schlamm].
// Die Abbiegerichtungen werden so gewählt, dass die Strecke sich nie selbst schneidet (gierige Suche mit Vorausschau).

const TRANS = 7; const STEP = 2;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Die zehn Karten der Roadmap. theme: forest | mountain | circuit | city | coast. Die IDs easy, hard, impossible sind die alten Strecken (gleicher Seed, alte Bestzeiten gelten weiter).
export const DIFFICULTIES = {
  easy: {
    id: 'easy', name: 'Morgenwald', theme: 'forest', seed: 101, target: 5000, blurb: 'Weite Kurven, lange Geraden, wenig Schlamm. Zum Einfahren.',
    straight: [70, 240], angle: [25, 100], radius: [30, 90], hair: 0.05, hairR: [24, 30], chain: 0.1, mud: 0.1, mudCorner: 0.0, par: [168, 200, 250],
  },
  birken: {
    id: 'birken', name: 'Birkenhain', theme: 'forest', seed: 515, target: 4400, blurb: 'Lichter Birkenwald und Lichtungen. Die Kurven werden enger, die Sicht bleibt gut.', zone: { name: 'birch', dens: 0.72, mix: [0.02, 0.14, 0.68, 0.16], extra: 1.4 },
    straight: [70, 220], angle: [30, 115], radius: [24, 70], hair: 0.07, hairR: [20, 26], chain: 0.16, mud: 0.1, mudCorner: 0.02, par: [158, 190, 240],
  },
  herbst: {
    id: 'herbst', name: 'Herbstforst', theme: 'forest', seed: 626, target: 4800, autumn: true, blurb: 'Goldener Oktober: buntes Laub, tiefe Sonne, rutschige Senken.',
    straight: [60, 210], angle: [35, 125], radius: [20, 60], hair: 0.1, hairR: [16, 22], chain: 0.2, mud: 0.14, mudCorner: 0.06, par: [195, 235, 295],
  },
  hard: {
    id: 'hard', name: 'Schlammgraben', theme: 'forest', seed: 202, target: 5000, blurb: 'Enge Kurven bis 150°, Spitzkehren, Schikanen und viel Schlamm.',
    straight: [40, 200], angle: [45, 150], radius: [13, 46], hair: 0.18, hairR: [11, 15], chain: 0.3, mud: 0.2, mudCorner: 0.12, par: [235, 280, 350],
  },
  berg: {
    id: 'berg', name: 'Bergpass', theme: 'mountain', seed: 737, target: 4600, blurb: 'Serpentinen zwischen Fels und Abgrund. Die Leitplanke verzeiht nur einmal.', zone: { name: 'alpine', dens: 0.34, mix: [0.86, 0.02, 0.06, 0.06], extra: 0.6 }, grass: 0.5,
    straight: [50, 170], angle: [50, 165], radius: [17, 44], hair: 0.24, hairR: [14, 18], chain: 0.25, mud: 0, mudCorner: 0, gapN: 15, gapD: 46, par: [212, 255, 320],
  },
  ring: {
    id: 'ring', name: 'Theo-Ring', theme: 'circuit', seed: 848, laps: 3, rival: true, infiniteNitro: true, road: 6.4, blurb: 'Formel-1-Kurs, drei Runden, Bruno im Nacken, unendlich Nitroflaschen im Regal: Wer zuerst die Zielflagge sieht, kommt weiter.', zone: { name: 'park', dens: 0, mix: [0, 0.5, 0.2, 0.3], extra: 8 }, grass: 0.12,
    fixed: [[536, 0], [71, -45], [168, 0], [73, 70], [73, -70], [251, 0], [115, -55], [120, 0], [71, 45], [60, -38], [706, 0], [105, -60], [70, 80], [79, -50], [204, 0], [17, -100]], par: [205, 240, 300],
  },
  stadt: {
    id: 'stadt', name: 'Altstadt', theme: 'city', seed: 959, target: 3900, road: 4.6, blurb: 'Enge Häuserschluchten, rechtwinklige Ecken, Baustellen auf der Fahrbahn. Jede Wand ist echt.', zone: { name: 'city', dens: 0, mix: [0, 1, 0, 0], extra: 0 }, grass: 0,
    straight: [80, 200], angle: [90, 90], radius: [15, 19], hair: 0, hairR: [16, 18], chain: 0.22, mud: 0, mudCorner: 0, gapN: 26, gapD: 56, par: [165, 200, 250],
  },
  kueste: {
    id: 'kueste', name: 'Küstenstraße', theme: 'coast', seed: 1061, target: 5200, blurb: 'Blaues Meer, Buchten und Dämme: weite Bögen mit Vollgas, aber neben der Leitplanke wartet nur Wasser.', zone: { name: 'coast', dens: 0.05, mix: [0.5, 0.2, 0.1, 0.2], extra: 1.5 }, grass: 0.6,
    straight: [90, 280], angle: [25, 95], radius: [30, 95], hair: 0.05, hairR: [24, 30], chain: 0.12, mud: 0, mudCorner: 0, par: [155, 190, 235],
  },
  nacht: {
    id: 'nacht', name: 'Nachtwald', theme: 'forest', seed: 1172, target: 4600, night: true, blurb: 'Stockdunkel, nur die Scheinwerfer leuchten. Der Navigator ist jetzt euer bester Freund.',
    straight: [50, 200], angle: [40, 140], radius: [16, 50], hair: 0.14, hairR: [13, 17], chain: 0.24, mud: 0.14, mudCorner: 0.08, par: [190, 230, 285],
  },
  impossible: {
    id: 'impossible', name: 'Teufelskehre', theme: 'forest', seed: 303, target: 5000, storm: true, blurb: 'Das Finale im Gewitter: Kehre um den Baum, Haarnadel an Haarnadel, Schlammkurven.',
    straight: [30, 270], angle: [60, 178], radius: [8, 24], hair: 0.34, hairR: [7, 9.5], chain: 0.5, mud: 0.28, mudCorner: 0.3, par: [242, 290, 365],
  },
};
export const DIFFICULTY_ORDER = ['easy', 'birken', 'herbst', 'hard', 'berg', 'ring', 'stadt', 'kueste', 'nacht', 'impossible'];

// Zustand des Streckenverlaufs (Position, Kurswinkel, Krümmung des letzten Abschnitts, zurückgelegte Länge)
const newState = () => ({ x: 0, z: 0, psi: 0, k: 0, s: 0 });
function advance(st, len, k, out) { // fährt `len` Meter mit Zielkrümmung k (weicher Übergang von st.k) und hängt Punkte an
  const n = Math.max(1, Math.ceil(len / STEP)); const ds = len / n; const k0 = st.k;
  for (let i = 0; i < n; i++) {
    const kk = k0 + (k - k0) * smooth(0, TRANS, i * ds);
    if (out) out.push(st.x, st.z, st.s);
    st.psi += kk * ds; st.x += Math.sin(st.psi) * ds; st.z += Math.cos(st.psi) * ds; st.s += ds;
  }
  st.k = k;
}

function planGroups(cfg, R) {
  const lerp = (r, p = 1) => r[0] + (r[1] - r[0]) * Math.pow(R(), p);
  const groups = []; let total = 70;
  while (true) {
    const straight = Math.round(lerp(cfg.straight, 1.15)); const g = { straight, mudS: R() < cfg.mud, corners: [] };
    let nC = 1; if (R() < cfg.chain) { nC = 2; if (R() < cfg.chain * 0.6) nC = 3; }
    let sumAngle = 0;
    for (let c = 0; c < nC; c++) {
      let theta; let rad;
      if (R() < cfg.hair) { theta = 150 + R() * (cfg.angle[1] >= 170 ? 28 : 15); rad = cfg.hairR[0] + (cfg.hairR[1] - cfg.hairR[0]) * R(); theta = Math.min(theta, cfg.angle[1] + 8); }
      else { theta = lerp(cfg.angle, 1.0); rad = lerp(cfg.radius, 1.5); if (theta > 120) rad = Math.min(rad, cfg.radius[0] + (cfg.radius[1] - cfg.radius[0]) * 0.35); }
      theta = Math.round(theta); const len = Math.max(14, Math.round(rad * theta * Math.PI / 180));
      // Folgekurven: gleiche Richtung nur, wenn die Summe unter ~190° bleibt (sonst schneidet sich die Strecke), sonst Schikane
      let rel = c === 0 ? 1 : (R() < 0.7 ? -1 : 1); if (rel > 0 && sumAngle + theta > 190) rel = -1;
      g.corners.push({ len, rad: Math.round(rad * 10) / 10, rel, theta, mud: R() < cfg.mudCorner, gap: c === 0 ? 0 : Math.round(5 + R() * 9) });
      sumAngle += theta;
    }
    const add = g.straight + g.corners.reduce((a, c) => a + c.len + c.gap, 0);
    if (total + add > cfg.target + 110) break; // etwas mehr planen: die Notlösungen weiter unten verkürzen die Strecke wieder
    groups.push(g); total += add;
  }
  return { groups, total };
}

export function generateLayout(difficulty = 'easy', seedOverride, lengthM) {
  const cfg = { ...DIFFICULTIES[difficulty], ...(lengthM ? { target: lengthM } : {}) }; if (!DIFFICULTIES[difficulty]) throw new Error('unbekannte Karte ' + difficulty); if (cfg.fixed) return cfg.fixed;
  const R = rng(seedOverride !== undefined ? seedOverride : cfg.seed);
  const { groups, total } = planGroups(cfg, R);
  // Gitter der festgelegten Punkte für Abstandsprüfung (nur Punkte, die > 100 m Weg entfernt sind, zählen)
  const CELL = 40; const grid = new Map(); const key = (cx, cz) => cx * 73856093 ^ cz * 19349663;
  const addPts = (arr) => { for (let i = 0; i < arr.length; i += 3) { const k = key(Math.floor(arr[i] / CELL), Math.floor(arr[i + 1] / CELL)); let a = grid.get(k); if (!a) { a = []; grid.set(k, a); } a.push(arr[i], arr[i + 1], arr[i + 2]); } };
  const evalGroups = (st0, gs, signs) => { // simuliert Gruppen ab st0; liefert { minD, end }
    const st = { ...st0 }; const pts = [];
    gs.forEach((g, gi) => {
      advance(st, g.straight, 0, pts);
      g.corners.forEach((c) => { if (c.gap) advance(st, c.gap, 0, pts); advance(st, c.len, signs[gi] * c.rel / c.rad, pts); });
    });
    let minD = 1e9; let near = 1e9; // minD: Abstand zu Streckenteilen > 100 m Weg entfernt; near: zu allem > 30 m Weg entfernt (erkennt enge Schleifen/Kreuzungen)
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i]; const z = pts[i + 1]; const s = pts[i + 2]; const cx = Math.floor(x / CELL); const cz = Math.floor(z / CELL);
      for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const a = grid.get(key(cx + dx, cz + dz)); if (!a) continue; for (let j = 0; j < a.length; j += 3) { const sep = s - a[j + 2]; if (sep < 30) continue; const d = Math.hypot(x - a[j], z - a[j + 1]); if (d < near) near = d; if (sep >= 100 && d < minD) minD = d; } }
      for (let j = 0; j < i; j += 3) { const sep = s - pts[j + 2]; if (sep < 30) continue; const d = Math.hypot(x - pts[j], z - pts[j + 1]); if (d < near) near = d; if (sep >= 100 && d < minD) minD = d; }
    }
    return { minD, near, st, pts };
  };
  const state = newState(); const first = []; advance(state, 70, 0, first); addPts(first);
  const DEPTH = 4; const chosen = [];
  for (let gi = 0; gi < groups.length; gi++) {
    const look = groups.slice(gi + 1, gi + DEPTH); let best = null;
    const base = groups[gi]; const variants = [{ g: base, pen: 0 }];
    for (const scale of [0.55, 1.7, 0.3]) variants.push({ g: { ...base, straight: Math.max(30, Math.round(base.straight * scale)) }, pen: 1.5 });
    if (base.corners.length > 1) variants.push({ g: { ...base, corners: base.corners.map((c, i) => (i ? { ...c, rel: -c.rel } : c)) }, pen: 2 });
    variants.push({ g: { ...base, corners: [{ len: Math.round(34 * 40 * Math.PI / 180), rad: 34, rel: 1, theta: 40, mud: false, gap: 0 }] }, pen: 6 }); // Notlösung: weiche Kurve
    for (const { g: g0, pen } of variants) { if (best && best.ratio >= 1.05) break; for (const sg of [1, -1]) {
      for (let m = 0; m < (1 << look.length); m++) {
        const signs = [sg, ...look.map((_, b) => ((m >> b) & 1 ? -1 : 1))]; const r = evalGroups(state, [g0, ...look], signs);
        const ratio = Math.min(r.near / (cfg.gapN || 12.5), r.minD / (cfg.gapD || 34));
        const score = Math.min(ratio, 1.8) * 50 - 0.004 * Math.hypot(r.st.x, r.st.z) - 0.5 * Math.abs(Math.atan2(Math.sin(r.st.psi), Math.cos(r.st.psi))) - pen;
        if (!best || score > best.score) best = { score, ratio, sign: sg, g: g0 };
      }
    } }
    groups[gi] = best.g; const r1 = evalGroups(state, [best.g], [best.sign]); addPts(r1.pts); Object.assign(state, r1.st); chosen.push(best.sign);
  }
  // Layout zusammensetzen
  const layout = [[70, 0]]; let sum = 70;
  groups.forEach((g, gi) => {
    layout.push(g.mudS && g.straight >= 40 ? [g.straight, 0, 'm'] : [g.straight, 0]); sum += g.straight;
    g.corners.forEach((c) => { if (c.gap) { layout.push([c.gap, 0]); sum += c.gap; } layout.push(c.mud ? [c.len, chosen[gi] * c.rel * c.rad, 'm'] : [c.len, chosen[gi] * c.rel * c.rad]); sum += c.len; });
  });
  // Zielgerade: höchstens 110 m (und nur so lang, wie sie keinen älteren Streckenteil schneidet)
  let fin = Math.min(110, Math.max(50, cfg.target - sum));
  for (; fin > 30; fin -= 15) { const tmp = { ...state }; const pts = []; advance(tmp, fin, 0, pts); let ok = true; for (let i = 0; i < pts.length && ok; i += 3) { const cx = Math.floor(pts[i] / CELL); const cz = Math.floor(pts[i + 1] / CELL); for (let dx = -1; dx <= 1 && ok; dx++) for (let dz = -1; dz <= 1 && ok; dz++) { const g = grid.get(key(cx + dx, cz + dz)); if (!g) continue; for (let j = 0; j < g.length; j += 3) { if (pts[i + 2] - g[j + 2] >= 30 && Math.hypot(pts[i] - g[j], pts[i + 1] - g[j + 1]) < 14) { ok = false; break; } } } } if (ok) break; }
  layout.push([Math.max(30, fin), 0]);
  return layout;
}
