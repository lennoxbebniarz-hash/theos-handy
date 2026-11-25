// Theos Seitenscheidel - Teo's Casino: Spielstände. Beliebig viele benannte Stände (anlegen, weiterspielen, umbenennen, löschen).
// Allein wählt man beim Öffnen, online wählt der Host den Stand in der Lobby; die Mitspieler spielen darin mit (Inventare nach Namen).
// Ablage: Index 'casinoSlots' { list, last } und je Stand 'casinoSave.<id>'. Der alte Einzel-Spielstand 'casino' wird einmalig übernommen.
// Spielerzahl: Stände, die ab Version 1.14.0 angelegt werden, haben max: 4 (bis zu vier Spieler online). Ältere Stände bleiben bei drei.
export function createSaves(store, fixSave, o = {}) { // o: eigene Ablage für andere Modi (Strom-Spiel); o.four(S) richtet einen neuen Stand für vier ein (z. B. vierte Kurbel)
  const IDX = o.idx || 'casinoSlots'; const KEY = o.key || 'casinoSave.'; const LEGACY = o.legacy === undefined ? 'casino' : o.legacy;
  const read = () => { const x = store.get(IDX, null); return x && Array.isArray(x.list) ? x : { list: [], last: null }; };
  const write = (x) => store.set(IDX, x);
  const meta = (id, name, S, old = {}) => ({ id, name, created: old.created || Date.now(), updated: Date.now(), day: S.day, purse: S.purse, level: S.level, over: !!S.over, players: old.players || [], ...(old.max ? { max: old.max } : {}) });
  const newId = () => 's' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  function migrate() {
    const x = read(); if (x.list.length || x.migrated) return x; x.migrated = true;
    const legacy = LEGACY ? store.get(LEGACY, null) : null; if (legacy) { const id = newId(); const S = fixSave(legacy); store.set(KEY + id, S); x.list.push(meta(id, 'Familie Rot, Blau, Gelb', S)); x.last = id; }
    write(x); return x;
  }
  const api = {
    list: () => migrate().list.slice().sort((a, b) => b.updated - a.updated),
    last: () => migrate().last,
    get: (id) => migrate().list.find((m) => m.id === id) || null,
    load: (id) => fixSave(store.get(KEY + id, null)),
    save(id, S, players) { if (!id) return; const x = migrate(); const i = x.list.findIndex((m) => m.id === id); const old = i >= 0 ? x.list[i] : {}; const m = meta(id, old.name || 'Spielstand', S, old); if (players && players.length) m.players = [...new Set([...(old.players || []), ...players])].slice(0, 6); if (i >= 0) x.list[i] = m; else x.list.push(m); x.last = id; write(x); store.set(KEY + id, S); },
    create(name) { const x = migrate(); const id = newId(); const S = fixSave(null); S.introSeen = false; /* neuer Stand: Intro beim ersten Betreten */ if (o.four) o.four(S); store.set(KEY + id, S); x.list.push(meta(id, String(name || '').trim().slice(0, 32) || `Spielstand ${x.list.length + 1}`, S, { max: 4 })); x.last = id; write(x); return id; },
    rename(id, name) { const x = migrate(); const m = x.list.find((q) => q.id === id); const nm = String(name || '').trim().slice(0, 32); if (m && nm) { m.name = nm; write(x); return true; } return false; },
    remove(id) { const x = migrate(); x.list = x.list.filter((q) => q.id !== id); if (x.last === id) x.last = x.list[0] ? x.list[0].id : null; write(x); store.set(KEY + id, null); },
    reset(id) { const x = migrate(); const m = x.list.find((q) => q.id === id); if (!m) return null; const S = fixSave(null); if (m.max === 4 && o.four) o.four(S); api.save(id, S); return S; },
    cap: (id) => { if (!id) return 4; const m = migrate().list.find((q) => q.id === id); return m ? (m.max === 4 ? 4 : 3) : 4; }, // kein Stand: wird neu angelegt, also vier
  };
  return api;
}
