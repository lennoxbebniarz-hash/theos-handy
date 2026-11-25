'use strict';
// Theos Seitenscheidel - Spielstand zurückholen (Abstimmung Paket 3, 2026-11-22). Läuft nur im Hauptprogramm (main.js), nie in der Seite.
// Lennox: die letzten 10 Sicherungen mit Datum, vorher wird der jetzige Stand gesichert.
//
// Ablauf: Die Seite merkt einen Wunsch vor, das Spiel startet neu. Noch vor app.whenReady (nur da ist der Speicher sicher zu) passiert der Tausch:
//   1. gewählte Sicherung daneben kopieren und vergleichen
//   2. jetzigen Stand sichern und vergleichen. Geht das nicht, passiert gar nichts.
//   3. Ordner tauschen, mit Protokoll. Bricht es mittendrin ab (Absturz, Strom weg), stellt der nächste Start den alten Stand wieder her.
// Es wird nie etwas gelöscht, von dem es keine geprüfte Kopie gibt. Die Datei liegt unter game/, weil nur dieser Ordner in jedes Update kommt.
const fsEcht = require('fs');
const path = require('path');

const TEILE = ['Local Storage', 'IndexedDB'];
const NAME = /^(\d{4})-(\d\d)-(\d\d)_(\d\d)-(\d\d)-(\d\d)(_vor-zurueckholen)?$/;
const VOR = '_vor-zurueckholen'; // Anhang für die Sicherung vor dem Zurückholen
const ZEIGEN = 10;
const ALT = '.alt-vor-tausch';
const NEU = '.neu-fuer-tausch';

const warte = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const ohneLock = (f) => !/[\\/]LOCK$/.test(f);

// userData: Ordner mit dem Speicher. wurzel: Ordner mit den Sicherungen. sichern(anhang): legt eine Sicherung an und gibt ihren Namen
// zurück ('' = es gab nichts zu sichern, null = hat nicht geklappt).
function createSpielstand({ userData, wurzel, sichern, fs = fsEcht }) {
  const datei = (n) => path.join(userData, n);
  const WUNSCH = datei('spielstand-wunsch.json');
  const PROTOKOLL = datei('spielstand-tausch.json');
  const ERGEBNIS = datei('spielstand-ergebnis.json');

  const lies = (f) => {
    try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
  };
  function schreib(f, o) {
    fs.writeFileSync(`${f}.tmp`, JSON.stringify(o), { flush: true }); // sofort auf die Platte, es ist das Protokoll
    fs.renameSync(`${f}.tmp`, f);
  }
  // Windows hält frisch benutzte Ordner manchmal kurz fest (Virenscanner)
  function umbenennen(von, nach) {
    for (let i = 0; ; i++) {
      try { fs.renameSync(von, nach); return; } catch (e) {
        if (i >= 24 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
        warte(160);
      }
    }
  }
  const weg = (p) => fs.rmSync(p, { recursive: true, force: true, maxRetries: 8, retryDelay: 120 });

  // Alle Dateien mit Größe, ohne die Sperrdateien von Chromium
  function inhalt(ordner) {
    const aus = new Map();
    const geh = (d, rel) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) geh(path.join(d, e.name), r);
        else if (e.name !== 'LOCK') aus.set(r, fs.statSync(path.join(d, e.name)).size);
      }
    };
    geh(ordner, '');
    return aus;
  }
  function gleich(a, b) {
    const x = inhalt(a);
    const y = inhalt(b);
    return x.size === y.size && [...x].every(([name, groesse]) => y.get(name) === groesse);
  }
  // Eine Sicherung taugt nur, wenn der Speicher darin vollständig aufgeht: CURRENT nennt das Verzeichnis, das da sein muss
  function taugt(name) {
    try {
      const db = path.join(wurzel, name, 'Local Storage', 'leveldb');
      const zeiger = fs.readFileSync(path.join(db, 'CURRENT'), 'utf8').trim();
      return /^MANIFEST-\d+$/.test(zeiger) && fs.existsSync(path.join(db, zeiger));
    } catch {
      return false;
    }
  }

  function liste() {
    try {
      const namen = fs.readdirSync(wurzel).filter((n) => NAME.test(n) && taugt(n)).sort().reverse();
      const zeigen = namen.slice(0, ZEIGEN);
      // die letzte Sicherung von vor einem Zurückholen bleibt immer dabei: Das ist der Rückweg
      const rueckweg = namen.find((n) => n.endsWith(VOR));
      if (rueckweg && !zeigen.includes(rueckweg)) zeigen.push(rueckweg);
      return zeigen.map((id) => {
        const [, j, mo, t, h, mi, s, vor] = NAME.exec(id);
        let bytes = 0;
        for (const teil of TEILE) {
          const p = path.join(wurzel, id, teil);
          if (fs.existsSync(p)) for (const n of inhalt(p).values()) bytes += n;
        }
        return { id, zeit: new Date(+j, +mo - 1, +t, +h, +mi, +s).getTime(), vor: !!vor, bytes };
      });
    } catch {
      return [];
    }
  }

  function merken(id) {
    if (typeof id !== 'string' || !NAME.test(id) || !liste().some((s) => s.id === id)) return false;
    try { schreib(WUNSCH, { id }); return true; } catch { return false; }
  }

  // Nach einem abgebrochenen Tausch aufräumen. Gibt false zurück, solange noch etwas offen ist.
  function heilen() {
    const P = lies(PROTOKOLL);
    try {
      if (P && P.phase === 'fertig') {
        for (const teil of TEILE) weg(datei(teil + ALT));
      } else if (P && P.phase === 'tausch' && Array.isArray(P.teile)) {
        for (const T of P.teile) {
          if (!TEILE.includes(T.name)) continue;
          const jetzt = datei(T.name);
          const alt = datei(T.name + ALT);
          const neu = datei(T.name + NEU);
          if (fs.existsSync(alt)) { // das Original liegt daneben, an seinem Platz steht höchstens die Kopie
            if (fs.existsSync(jetzt)) weg(jetzt);
            umbenennen(alt, jetzt);
          } else if (!T.hatte && T.neu && !fs.existsSync(neu) && fs.existsSync(jetzt)) {
            weg(jetzt); // vorher gab es diesen Teil nicht
          }
        }
        schreib(ERGEBNIS, { ok: false, grund: 'abbruch' });
      } else {
        for (const teil of TEILE) if (fs.existsSync(datei(teil + ALT)) && !fs.existsSync(datei(teil))) umbenennen(datei(teil + ALT), datei(teil));
      }
      for (const teil of TEILE) weg(datei(teil + NEU));
      if (fs.existsSync(PROTOKOLL)) weg(PROTOKOLL); // auch ein unlesbares
      return true;
    } catch (e) {
      console.log('Spielstand: Aufräumen offen:', e && e.message);
      return false;
    }
  }

  function zurueckholen(id) {
    if (!NAME.test(String(id)) || !taugt(id)) return { ok: false, grund: 'weg' };
    if (fs.existsSync(PROTOKOLL) || TEILE.some((teil) => fs.existsSync(datei(teil + ALT)))) return { ok: false, grund: 'offen' };
    const quelle = path.join(wurzel, id);
    const teile = TEILE.map((name) => ({ name, hatte: fs.existsSync(datei(name)), neu: fs.existsSync(path.join(quelle, name)) }));
    let vor = '';
    try {
      // 1. daneben kopieren, vor der neuen Sicherung: Die räumt die ältesten weg
      for (const T of teile) {
        if (!T.neu) continue;
        const nach = datei(T.name + NEU);
        weg(nach);
        fs.cpSync(path.join(quelle, T.name), nach, { recursive: true, force: true, filter: ohneLock });
        if (!gleich(path.join(quelle, T.name), nach)) throw new Error('Kopie unvollständig');
      }
      // 2. der jetzige Stand
      vor = sichern(VOR);
      if (teile.some((T) => T.hatte)) {
        if (!vor) return { ok: false, grund: 'sicherung' };
        for (const T of teile) if (T.hatte && !gleich(datei(T.name), path.join(wurzel, vor, T.name))) return { ok: false, grund: 'sicherung' };
      }
    } catch (e) {
      console.log('Spielstand: Vorbereiten ging nicht:', e && e.message);
      return { ok: false, grund: 'kopie' };
    }
    // 3. tauschen
    try {
      schreib(PROTOKOLL, { phase: 'tausch', teile });
      for (const T of teile) {
        if (T.hatte) umbenennen(datei(T.name), datei(T.name + ALT));
        if (T.neu) umbenennen(datei(T.name + NEU), datei(T.name));
      }
      schreib(PROTOKOLL, { phase: 'fertig', teile });
    } catch (e) {
      console.log('Spielstand: Tausch ging nicht, alter Stand kommt zurück:', e && e.message);
      heilen();
      return { ok: false, grund: 'tausch' };
    }
    heilen();
    return { ok: true, id, vor };
  }

  // Bei jedem Start, bevor das Fenster den Speicher öffnet. Ersetzt die normale Sicherung nur, wenn zurückgeholt wird.
  function starten() {
    const sauber = heilen();
    const W = lies(WUNSCH);
    if (fs.existsSync(WUNSCH)) weg(WUNSCH); // nur ein Versuch, keine Startschleife
    if (!W) {
      if (sauber) sichern('');
      return null;
    }
    const r = sauber ? zurueckholen(W.id) : { ok: false, grund: 'offen' };
    if (!r.ok) for (const teil of TEILE) { try { weg(datei(teil + NEU)); } catch { /* räumt der nächste Start */ } }
    schreib(ERGEBNIS, r);
    return r;
  }

  function ergebnis() {
    const r = lies(ERGEBNIS);
    try { weg(ERGEBNIS); } catch { /* dann kommt die Meldung noch einmal */ }
    return r;
  }

  return { starten, liste, merken, ergebnis };
}

module.exports = { createSpielstand, TEILE, NAME, VOR };
