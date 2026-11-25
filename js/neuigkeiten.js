// Theos Seitenscheidel - der Zettel „Was ist neu?“ an der Schranktür (Abstimmung Paket 3, 2026-11-22).
// Bei jedem Update kommt oben ein Eintrag dazu, in einfachen Sätzen für Spieler. test/paket3.test.js schlägt an, wenn er fehlt.
// Steht oben schon die nächste Version, ist das eine Testfassung, der Zettel sagt das dazu.

export const NEUIGKEITEN = [
  {
    v: '1.24.0',
    titel: 'Schulmodus',
    punkte: [
      'Neuer Schalter „Schule“ rechts neben „Beenden“: Der Schrank wird umgeräumt, alles ist stumm und läuft mit leichter Grafik.',
      'Neu im Schul-Schrank: Stapelturm und Dino-Lauf. Dazu Dreierschach, Pong und Schiffe.',
      'Rangliste mit Theo, Ludi und Bruno auf dem Treppchen. In einer Lobby tauscht ihr eure Rekorde aus.',
      'Im Schulmodus schließt die Taste N Theos sofort.',
    ],
  },
  {
    v: '1.23.2',
    titel: 'Ludwig: Taschen schnell leeren, viel mehr Respekt',
    punkte: [
      'Respekt kommt jetzt 3-mal so schnell wie früher. Spielstände bleiben, wie sie sind.',
      'Kommen Mama oder Papa rein, wandern die Kippen aus deinen Taschen von selbst in die Box. Du musst nur noch die Box verstecken.',
    ],
  },
  {
    v: '1.23.1',
    titel: 'Ludwig: mehr Respekt',
    punkte: [
      'Respekt kommt jetzt 1,75-mal so schnell. Spielstände bleiben, wie sie sind.',
    ],
  },
  {
    v: '1.23.0',
    titel: 'Ludwig: Bunker-Regale und die große Razzia',
    punkte: [
      'Im Bunker stehen Regale, eins je Sorte. E rein, F raus.',
      'Im Shop am PC: Maschinen für Stopfkippen, Aromakippen, Zigarillos und Liquid.',
      'Die Großhändler wollen jetzt auch die neuen Sorten.',
      'Selten kommt eine Razzia: Zwei Minuten, um alles zu verstecken.',
      'Die Tiefgarage sieht jetzt viel echter aus.',
    ],
  },
  {
    v: '1.22.0',
    titel: 'Ludwig: Rad, Kumpels und deine Marke',
    punkte: [
      'Fahrrad und E-Roller im Shop am PC. Draußen mit B fahren.',
      'Eigene Marke am PC: Name, Farbe und Zeichen.',
      'Acht Sachen fürs Zimmer. Jede tarnt ein bisschen.',
      'Die Kumpels schreiben aufs Handy: Warnungen und Quatsch.',
      'Bei Rudi vor dem Kiosk steht eine Wasserpfeife.',
      'Mit dem Doppelgänger-Trick sitzt die Puppe am Schreibtisch.',
      'Oben links steht jetzt immer nur eine Aufgabe, genau erklärt.',
    ],
  },
  {
    v: '1.21.0',
    titel: 'Regen, Radio und dein eigenes Zimmer',
    punkte: [
      'Strom aus: Es regnet. Wann, steht im Kalender (Tab).',
      'Strom aus: Man sieht die anderen treten, rennen und kurbeln.',
      'Radio rechts auf dem Schreibtisch: Anklicken wechselt die Musik.',
      'Farbtopf vor dem Schreibtisch: Zimmer gestalten. Poster, Neonfarben und Deko gibt es für Pokale.',
      'Dieser Zettel: Nach jedem Update steht hier, was neu ist.',
      'Spielstand zurückholen: Schublade aufmachen, dann auf Spielstände.',
      'Mehrspieler: In der Lobby steht, wer die meisten Pokale hat.',
    ],
  },
  {
    v: '1.20.0',
    titel: 'Figuren vom Startbildschirm',
    punkte: [
      'Ludwig, Strom und Ozean: Ihr spielt mit den Figuren vom Startbildschirm.',
      'Frauen mit langen Haaren, Zopf, Dutt oder Bob und eigener Kleidung.',
      'Schmalere Lobby. „Raus mit dir!“ und Monopoly sind besser zu lesen.',
      'Wer Ludwig, Ludi oder Ludsen heißt, spielt Ludwig.',
    ],
  },
  {
    v: '1.19.0',
    titel: 'Das große Stimmen-Update von Ludwig',
    punkte: [
      '18 Kunden mit eigenen Stimmen.',
      'Draußen mit den Leuten reden: G drücken.',
      'Gespräche an der Tür und 19 Ereignisse.',
      'Eltern riechen den Qualm.',
    ],
  },
  {
    v: '1.18.0',
    titel: 'Das Zimmer lebt',
    punkte: [
      'Freunde mit offener Lobby sitzen auf Theos Bett.',
      'Trophäenregal und echte Uhrzeit im Fenster.',
      'Ludwig raucht selber: R halten.',
    ],
  },
];

export function neuerAls(a, b) {
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}
export const ungelesen = (gelesen) => gelesen !== NEUIGKEITEN[0].v;
export const kopfzeile = (eintrag, laufend) => (neuerAls(eintrag.v, laufend) ? `Testfassung für ${eintrag.v}` : `Version ${eintrag.v}`);
