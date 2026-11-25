// Theos Seitenscheidel - was man sich im Zimmer aussuchen kann, dazu Pokale und Rangliste (Abstimmung Paket 3, 2026-11-22).
// Lennox: je fünf Poster, Neonfarben und Dekos, frei durch Pokale, nur auf dem eigenen PC. Radio: die vier Startmusiken plus Aus.
// Rangliste: nur Pokale, nur in der Lobby. Hier stehen nur Regeln, nichts zeichnet und nichts speichert.

export const RADIO = [
  { id: 'schrank', name: 'Zimmer' }, // die Musik, die immer lief
  { id: 'ludwig', name: 'Ludwig' },
  { id: 'strom', name: 'Strom aus' },
  { id: 'ozean', name: 'Ozean' },
  { id: 'bruno', name: 'Big Bruno' },
  { id: 'aus', name: 'Aus' },
];
// ab: so viele Pokale braucht man dafür
export const POSTER = [
  { id: 'boss', name: 'BOSS', ab: 1 },
  { id: 'blitz', name: 'Strom aus', ab: 2 },
  { id: 'wal', name: 'Ozean', ab: 3 },
  { id: 'mond', name: 'Mond putzen', ab: 5 },
  { id: 'kette', name: 'Brunos Kette', ab: 7 },
];
export const NEON = [
  { id: 'tuerkis', name: 'Türkis', farbe: 0x35e6d4, ab: 1 },
  { id: 'gelb', name: 'Gelb', farbe: 0xffd21a, ab: 2 },
  { id: 'gruen', name: 'Grün', farbe: 0x4ade58, ab: 4 },
  { id: 'blau', name: 'Blau', farbe: 0x3f8cff, ab: 6 },
  { id: 'lila', name: 'Lila', farbe: 0xa45cff, ab: 8 },
];
export const DEKO = [
  { id: 'ball', name: 'Fußball', ab: 1 },
  { id: 'pflanze', name: 'Pflanze', ab: 3 },
  { id: 'lava', name: 'Lavalampe', ab: 4 },
  { id: 'hamster', name: 'Kuschelhamster', ab: 6 },
  { id: 'disko', name: 'Diskokugel', ab: 9 },
];

export const MAX_POKALE = 10;
const ganz = (v, hoch) => Math.max(0, Math.min(hoch, Math.floor(Number(v) || 0)));

// stufen aus erfolge.js: 1 = Silber, 2 = Gold. Beides ist ein Pokal.
export function pokale(stufen) {
  const werte = Object.values(stufen || {});
  return { n: ganz(werte.filter((v) => v === 1 || v === 2).length, MAX_POKALE), gold: ganz(werte.filter((v) => v === 2).length, MAX_POKALE) };
}

// Was im Speicher steht, kann alt oder kaputt sein
export function saubereWahl(v) {
  const o = v && typeof v === 'object' ? v : {};
  const kennt = (liste, id) => liste.some((e) => e.id === id);
  return {
    radio: kennt(RADIO, o.radio) ? o.radio : 'schrank',
    poster: kennt(POSTER, o.poster) ? o.poster : null,
    neon: kennt(NEON, o.neon) ? o.neon : null,
    deko: Array.isArray(o.deko) ? DEKO.map((e) => e.id).filter((id) => o.deko.includes(id)) : [],
  };
}
// Zu sehen ist nur, was die Pokale hergeben (nach dem Zurückholen eines alten Spielstands können es weniger sein)
export function sichtbareWahl(wahl, n) {
  const frei = (liste, id) => liste.some((e) => e.id === id && e.ab <= n);
  return {
    radio: wahl.radio,
    poster: frei(POSTER, wahl.poster) ? wahl.poster : null,
    neon: frei(NEON, wahl.neon) ? wahl.neon : null,
    deko: wahl.deko.filter((id) => frei(DEKO, id)),
  };
}
export function naechsterSender(id) {
  return RADIO[(RADIO.findIndex((r) => r.id === id) + 1) % RADIO.length].id;
}

// Zahlen von anderen PCs nie ungeprüft übernehmen
export function saubereZahl(v) {
  const n = ganz(v && v.n, MAX_POKALE);
  return { n, gold: ganz(v && v.gold, n) };
}
// spieler: [{ id, name }], zahlen: Map id -> { n, gold }. Gleichstand = gleicher Platz.
export function rangliste(spieler, zahlen) {
  const reihe = spieler.filter((p) => zahlen.has(p.id)).map((p) => ({ id: p.id, name: p.name, ...saubereZahl(zahlen.get(p.id)) }));
  reihe.sort((a, b) => b.n - a.n || b.gold - a.gold || String(a.name).localeCompare(String(b.name), 'de'));
  let platz = 0;
  reihe.forEach((p, i) => {
    const vor = reihe[i - 1];
    if (!vor || vor.n !== p.n || vor.gold !== p.gold) platz = i + 1;
    p.platz = platz;
  });
  return reihe;
}
