// Theos Seitenscheidel - Ingenieur: Interaktionslogik der Werkstatt (Hand, Klappen, Reparaturschritte, Nitro) und KI-Ingenieur. Reine Logik, ohne Darstellung.
// Ziele (IDs) kommen aus der 3D-Werkstatt: t:<Werkzeug>, p:<Teil>, h:<Klappe>, c:<Bauteil>, b:confirm | b:fire | b:arm, nitroport, bench, toolbox, display.
import { DEFS, TOOLS, PART_NAMES, HATCHES, sortedDamages, damageLeft, fixDamage, consumePart, igniteNitro, installNitroBottle, nitroStatus, repairSeconds, hasDamage } from './damage.js';

// Bauteil -> Wartungsklappe, hinter der es sitzt
export const COMP_HATCH = { oilcap: 'engine', coolcap: 'engine', fuelpump: 'engine', turbo: 'engine', airfilter: 'engine', mounts: 'engine', radiator: 'engine', leak: 'engine', brakedisc: 'brakes', steerrack: 'chassis', strut: 'chassis', gearbox: 'chassis', wheelnutsL: 'wheelL', wheelnutsR: 'wheelR', fuses: 'fuse' };
export const COMP_NAMES = { oilcap: 'Öleinfüllstutzen', coolcap: 'Kühlmittelbehälter', fuelpump: 'Kraftstoffpumpe', turbo: 'Turbolader', airfilter: 'Luftfilter', mounts: 'Motorhalterung', radiator: 'Kühler', leak: 'Leckstelle', brakedisc: 'Bremsscheibe', steerrack: 'Lenkgetriebe', strut: 'Federbein', gearbox: 'Getriebe', wheelnutsL: 'Radmuttern links', wheelnutsR: 'Radmuttern rechts', fuses: 'Sicherungen', router: 'WLAN-Router', routerant: 'Router-Antennen' };
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// Klartext-Beschriftung eines Ziels (für Fadenkreuz-Hinweis und Schilder)
export function targetLabel(id) {
  if (!id) return ''; const n = id.slice(id.indexOf(':') + 1);
  if (id.startsWith('t:')) return TOOLS[n] || n; if (id.startsWith('p:')) return PART_NAMES[n] || n; if (id.startsWith('h:')) return `${HATCHES[n]} (Klappe)`; if (id.startsWith('c:')) return COMP_NAMES[n] || n;
  return { 'b:arm': 'Nitro-Hebel', 'b:fire': 'Nitro zünden', 'b:confirm': 'Reparatur bestätigen', nitroport: 'Nitro-Anschluss', display: 'Diagnose-Display (Schaden wählen)', bench: 'Arbeitsplatte', toolbox: 'Werkzeugkiste' }[id] || '';
}
export function createEngineer() {
  return { hand: null, hatches: { engine: false, brakes: false, chassis: false, wheelL: false, wheelR: false, fuse: false }, focus: null, hold: null, msg: '', msgT: 0, work: 0, workTarget: null };
}
const say = (E, msg) => { E.msg = msg; E.msgT = 3.2; return msg; };

// Schaden, an dem gerade gearbeitet wird (Auswahl am Display, sonst der dringendste)
export function focusDamage(E, v) {
  let d = E.focus ? v.damages.find((x) => x.id === E.focus.id && x.wheel === E.focus.wheel) : null;
  if (!d) { d = sortedDamages(v)[0] || null; E.focus = d ? { id: d.id, wheel: d.wheel } : null; }
  return d;
}
export function cycleFocus(E, v) {
  const list = sortedDamages(v); if (!list.length) { E.focus = null; return null; }
  const cur = E.focus ? list.findIndex((x) => x.id === E.focus.id && x.wheel === E.focus.wheel) : -1; const n = list[(cur + 1) % list.length]; E.focus = { id: n.id, wheel: n.wheel }; return n;
}
// offene Klappen überspringen ("Klappe öffnen" ist schon erledigt)
function advance(E, d) { while (d.step < d.steps.length && d.steps[d.step].k === 'open' && E.hatches[d.steps[d.step].h]) { d.step++; d.prog = 0; } }
export function currentStep(E, v) { const d = focusDamage(E, v); if (!d) return null; advance(E, d); return d.steps[d.step] ? { d, step: d.steps[d.step], index: d.step } : null; }

// Hinweis für die Anzeige: was ist jetzt zu tun?
export function hintText(E, v) {
  const n = nitroStatus(v);
  if (v.damages.length) { const d = [...v.damages].sort((a, b) => damageLeft(v, a) - damageLeft(v, b))[0]; if (damageLeft(v, d) < 12) return `ACHTUNG: ${DEFS[d.id].name} – nur noch ${Math.ceil(damageLeft(v, d))} s bis zum Totalschaden! ` + stepHint(E, v); }
  if (n.call) return 'FAHRER RUFT NITRO – du entscheidest: Hebel scharf schalten, dann Knopf drücken';
  if (n.state === 'empty') return 'Nitroflasche leer: neue Flasche aus dem rechten Regal in den Anschluss setzen (gedrückt halten)';
  return stepHint(E, v);
}
function stepHint(E, v) {
  const cs = currentStep(E, v);
  if (!cs) return v.damages.length ? 'Schaden am Display auswählen' : v.nitro.state === 'ready' ? 'Alles in Ordnung – Nitro kannst du jederzeit zünden (Hebel + Knopf)' : 'Alles in Ordnung – Werkstatt aufräumen';
  const { d, step, index } = cs; const lab = DEFS[d.id].name + (d.id === 'tire' ? '' : '');
  let what = step.label || '';
  if (step.k === 'tool') what += ` – ${TOOLS[step.tool]} nehmen, ${COMP_NAMES[step.at]} gedrückt halten`;
  else if (step.k === 'part') what += ` – ${PART_NAMES[step.part]} nehmen, ${COMP_NAMES[step.at]} gedrückt halten`;
  return `${lab}: Schritt ${index + 1}/${d.steps.length} · ${what}`;
}
// Was jetzt gebraucht wird (für die Tafel links): Werkzeug oder Teil des aktuellen Reparaturschritts, sonst die Nitroflasche; Klappe/Bestätigen als Textkarte
export function neededItem(E, v) {
  const cs = currentStep(E, v);
  if (cs) {
    const s = cs.step; const dn = DEFS[cs.d.id].name;
    if (s.k === 'tool') return { kind: 'tool', id: s.tool, name: TOOLS[s.tool], why: s.label || dn, held: !!(E.hand && E.hand.kind === 'tool' && E.hand.id === s.tool) };
    if (s.k === 'part') return { kind: 'part', id: s.part, name: PART_NAMES[s.part], why: s.label || dn, held: !!(E.hand && E.hand.kind === 'part' && E.hand.id === s.part), stock: v.parts[s.part] || 0 };
    if (s.k === 'open') return { kind: 'text', id: `open:${s.h}`, name: HATCHES[s.h], why: 'Klappe anklicken', held: false };
    return { kind: 'text', id: 'confirm', name: 'Bestätigen', why: 'Grüner Knopf am Pult', held: false };
  }
  if (v.nitro.state === 'empty' && (v.parts.nitro || 0) > 0) return { kind: 'part', id: 'nitro', name: PART_NAMES.nitro, why: 'leere Flasche tauschen', held: !!(E.hand && E.hand.id === 'nitro'), stock: v.parts.nitro };
  return null;
}
// Ziele, die jetzt leuchten sollen
export function highlightIds(E, v) {
  const ids = new Set(); const n = v.nitro.state;
  if (n === 'ready' && (v.nitro.callT > 0 || v.nitroArmed) && !v.damages.length) { ids.add(v.nitroArmed ? 'b:fire' : 'b:arm'); return ids; }
  if (n === 'ready' && v.nitroArmed) ids.add('b:fire');
  if (n === 'empty') { ids.add(E.hand && E.hand.id === 'nitro' ? 'nitroport' : 'p:nitro'); }
  const cs = currentStep(E, v); if (!cs) return ids; const s = cs.step;
  if (s.k === 'open') ids.add(`h:${s.h}`);
  else if (s.k === 'confirm') ids.add('b:confirm');
  else if (s.k === 'tool') ids.add(E.hand && E.hand.kind === 'tool' && E.hand.id === s.tool ? `c:${s.at}` : `t:${s.tool}`);
  else if (s.k === 'part') ids.add(E.hand && E.hand.kind === 'part' && E.hand.id === s.part ? `c:${s.at}` : `p:${s.part}`);
  return ids;
}

// ---------------------------------------------------------------- Klick
export function click(E, v, id) {
  const ev = []; const out = (msg, ok = true) => ({ ok, msg: say(E, msg), events: ev });
  if (!id) return out('', false);
  const kind = id.split(':')[0];
  if (kind === 't') {
    const t = id.slice(2);
    if (E.hand && E.hand.kind === 'tool' && E.hand.id === t) return out(`${TOOLS[t]} liegt schon in deiner Hand`, false);
    if (E.hand && E.hand.kind === 'tool') ev.push({ type: 'drop', id: `t:${E.hand.id}`, where: 'bench' });
    E.hand = { kind: 'tool', id: t }; ev.push({ type: 'take', id }); return out(`${TOOLS[t]} genommen`);
  }
  if (kind === 'p') {
    const p = id.slice(2);
    if ((v.parts[p] || 0) <= 0) return out(`${PART_NAMES[p]} ist aufgebraucht`, false);
    if (E.hand && E.hand.kind === 'tool') ev.push({ type: 'drop', id: `t:${E.hand.id}`, where: 'bench' });
    E.hand = { kind: 'part', id: p }; return out(`${PART_NAMES[p]} genommen (${v.parts[p]} übrig)`);
  }
  if (kind === 'h') {
    const h = id.slice(2); E.hatches[h] = !E.hatches[h]; ev.push({ type: 'hatch', h, open: E.hatches[h] });
    const d = focusDamage(E, v); if (d) advance(E, d);
    return out(`${HATCHES[h]} ${E.hatches[h] ? 'geöffnet' : 'geschlossen'}`);
  }
  if (id === 'bench' || id === 'toolbox') {
    if (!E.hand) return out(id === 'bench' ? 'Arbeitsplatte' : 'Werkzeugkiste', false);
    if (E.hand.kind === 'part') { const n = PART_NAMES[E.hand.id]; E.hand = null; return out(`${n} zurück ins Regal gelegt`); }
    const t = E.hand.id; E.hand = null; ev.push({ type: 'drop', id: `t:${t}`, where: id === 'toolbox' ? 'home' : 'bench' });
    return out(`${TOOLS[t]} ${id === 'toolbox' ? 'in die Kiste gelegt' : 'abgelegt'}`);
  }
  if (id === 'display') { const n = cycleFocus(E, v); return out(n ? `Schaden gewählt: ${DEFS[n.id].name}` : 'Keine Schäden', !!n); }
  if (id === 'b:arm') { v.nitroArmed = !v.nitroArmed; return out(v.nitroArmed ? 'Nitro-Hebel scharf' : 'Nitro-Hebel gesichert'); }
  if (id === 'b:fire') { const r = igniteNitro(v); if (r.ok) ev.push({ type: 'nitro_fire' }); return out(r.msg, r.ok); }
  if (id === 'b:confirm') {
    const cs = currentStep(E, v); if (!cs) return out('Es gibt nichts zu bestätigen', false);
    if (cs.step.k !== 'confirm') return out(`Noch nicht fertig – ${cs.step.label || 'weiter'}`, false);
    const name = DEFS[cs.d.id].name; fixDamage(v, cs.d); E.focus = null; focusDamage(E, v); ev.push({ type: 'fixed', id: cs.d.id });
    return out(`${name} behoben`);
  }
  return out('', false);
}

// ---------------------------------------------------------------- Halten (Reparaturarbeit)
// stress: 0..1 (Querbeschleunigung/Rütteln) macht die Arbeit zäher, nie zufällig fehlerhaft
export function hold(E, v, id, dt, stress = 0) {
  const res = { active: false, progress: 0, msg: '', done: false, events: [] };
  if (!id) { E.hold = null; return res; }
  const rate = 1 / (1 + 0.9 * clamp(stress, 0, 1));
  if (id === 'nitroport') {
    if (!(E.hand && E.hand.kind === 'part' && E.hand.id === 'nitro')) { res.msg = say(E, 'Dafür brauchst du eine Nitroflasche aus dem Regal'); return res; }
    if (v.nitro.state !== 'empty') { res.msg = say(E, nitroStatus(v).state === 'spent' ? nitroStatus(v).text : 'Die Flasche im Anschluss ist noch nicht leer'); return res; }
    E.hold = E.hold && E.hold.id === id ? E.hold : { id, p: 0 }; E.hold.p += dt * rate / 1.5; res.active = true; res.progress = E.hold.p;
    if (E.hold.p >= 1) { const r = installNitroBottle(v); E.hold = null; E.hand = null; res.done = true; res.progress = 1; res.msg = say(E, r.msg); res.events.push({ type: 'nitro_bottle' }); }
    return res;
  }
  if (!id.startsWith('c:')) { E.hold = null; return res; }
  const comp = id.slice(2); const cs = currentStep(E, v);
  if (!cs) { res.msg = say(E, v.damages.length ? 'Wähle einen Schaden am Display' : 'Hier gibt es nichts zu reparieren'); return res; }
  const { d, step } = cs;
  if (step.k === 'open') { res.msg = say(E, `Erst: ${step.label}`); return res; }
  if (step.k === 'confirm') { res.msg = say(E, 'Fertig – am Display „Bestätigen“ drücken'); return res; }
  if (step.at !== comp) { res.msg = say(E, `Falsches Bauteil – jetzt: ${step.label} (${COMP_NAMES[step.at]})`); return res; }
  const hatch = COMP_HATCH[comp]; if (hatch && !E.hatches[hatch]) { res.msg = say(E, `${HATCHES[hatch]} ist geschlossen`); return res; }
  if (step.k === 'tool' && !(E.hand && E.hand.kind === 'tool' && E.hand.id === step.tool)) { res.msg = say(E, `Dafür brauchst du: ${TOOLS[step.tool]}`); return res; }
  if (step.k === 'part') {
    if (!(E.hand && E.hand.kind === 'part' && E.hand.id === step.part)) { res.msg = say(E, `Dafür brauchst du: ${PART_NAMES[step.part]}`); return res; }
    if ((v.parts[step.part] || 0) <= 0) { res.msg = say(E, `Ersatzteil fehlt: ${PART_NAMES[step.part]}`); return res; }
  }
  E.hold = { id, p: d.prog }; d.prog += dt * rate / step.sec; res.active = true; res.progress = clamp(d.prog, 0, 1); E.work = 1; E.workTarget = id;
  if (d.prog >= 1) {
    if (step.k === 'part') { consumePart(v, step.part); E.hand = null; res.events.push({ type: 'part_used', id: step.part }); }
    d.step++; d.prog = 0; advance(E, d); E.hold = null; res.done = true; res.progress = 1; res.events.push({ type: 'step_done', damage: d.id });
    const next = d.steps[d.step]; res.msg = say(E, next ? (next.k === 'confirm' ? 'Alles erledigt – am Display bestätigen' : `Weiter: ${next.label}`) : 'Fertig');
  }
  return res;
}
export function release(E) { E.hold = null; E.workTarget = null; }
export function tickEngineer(E, dt) { E.msgT = Math.max(0, E.msgT - dt); E.work = Math.max(0, E.work - dt * 4); if (E.msgT <= 0) E.msg = ''; }

// ---------------------------------------------------------------- KI-Ingenieur (wenn kein Mensch die Rolle hat): langsam, aber verlässlich
export function createEngineerAI() { return { work: null, nitroT: 0, bottleT: 0 }; }
export function stepEngineerAI(A, v, dt, slow = 1.0) {
  const n = v.nitro;
  if (n.state === 'ready' && n.callT > 0) { A.nitroT += dt; if (A.nitroT > 0.7) v.nitroArmed = true; if (A.nitroT > 1.3) { const r = igniteNitro(v); if (r.ok) A.nitroT = 0; } } else A.nitroT = 0; // die KI zündet nur auf Zuruf des Fahrers
  if (n.state === 'empty' && (v.parts.nitro || 0) > 0) { A.bottleT += dt; if (A.bottleT > 3.2) { installNitroBottle(v); A.bottleT = 0; } } else A.bottleT = 0;
  if (A.work) {
    const d = v.damages.find((x) => x === A.work.d);
    if (!d) { A.work = null; return; }
    A.work.t += dt;
    if (A.work.t >= A.work.dur) { for (const s of d.steps) if (s.k === 'part') consumePart(v, s.part); fixDamage(v, d); A.work = null; }
    return;
  }
  for (const d of [...v.damages].sort((a, b) => damageLeft(v, a) - damageLeft(v, b))) { // das Dringendste (knappste Restzeit), für das die Ersatzteile reichen
    const need = {}; for (const s of d.steps) if (s.k === 'part') need[s.part] = (need[s.part] || 0) + 1;
    if (Object.entries(need).every(([p, c]) => (v.parts[p] || 0) >= c)) { A.work = { d, t: 0, dur: repairSeconds(d) * slow + 2 }; return; }
  }
}
