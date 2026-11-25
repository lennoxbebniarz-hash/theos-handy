// Theos Seitenscheidel - Ludwig: Apps auf dem Bunker-PC (eine LudwigOS-Ausstattung, siehe ludwigpc.js „desk“).
// Großhandel-Portal (Anfragen annehmen oder ablehnen, laufende Aufträge liefern), KippCord (Chat mit drei Kanälen), Maschinen-Übersicht, Papierkorb.
// Kein style="…" im HTML (Content-Security-Policy): Balkenbreiten werden per JS gesetzt. Neu gezeichnet wird nur, wenn sich etwas ändert.
import { MACHINES, CHANNELS, unitStatus, buildProgress, accept, decline, deliver, bunkerRates } from './ludwigbunker.js';
import { auftragVorrat, auftragWort } from './ludwigbunker3.js'; // Aufträge für neue Sorten (Paket 5)
import { euro } from './ludwiglogic.js';

const SVG = {
  shop: '<svg viewBox="0 0 48 48"><rect x="4" y="10" width="40" height="30" rx="4" fill="#1d2433"/><rect x="4" y="10" width="40" height="8" rx="4" fill="#e8b81c"/><rect x="10" y="24" width="12" height="10" fill="#b98c56"/><rect x="26" y="24" width="12" height="10" fill="#b98c56"/><path d="M10 29h12M26 29h12" stroke="#7a5530" stroke-width="1.5"/></svg>',
  chat: '<svg viewBox="0 0 48 48"><path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-9 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4Z" fill="#7a5cff"/><circle cx="17" cy="22" r="3" fill="#fff"/><circle cx="31" cy="22" r="3" fill="#fff"/></svg>',
  gear: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9" fill="none" stroke="#8a9096" stroke-width="6"/><g stroke="#8a9096" stroke-width="6" stroke-linecap="round"><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/></g><circle cx="24" cy="24" r="3" fill="#40ff90"/></svg>',
  trash: '<svg viewBox="0 0 48 48"><path d="M13 14h22l-2 28H15Z" fill="#b8c4d0" stroke="#6a7682" stroke-width="1.5"/><rect x="10" y="10" width="28" height="5" rx="2" fill="#8a96a2"/></svg>',
};
const WHO_COL = { Rot: '#ff6a5a', Gelb: '#ffd24a', Grün: '#6adf7a', Bruno: '#5ab0ff', Kalle: '#c0a080', Ludwig: '#8fd0ff' };
const STATUS = { bau: ['Wird aufgebaut', 'blue'], läuft: ['Läuft', 'green'], fertig: ['Fertig', 'green'], wartet: ['Wartet auf Bedienung (E)', 'yellow'], klemmt: ['Klemmt! Draufhauen (E)', 'red'], material: ['Kein Material', 'red'] };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const num = (n) => Math.round(n).toLocaleString('de-DE');

export function createBunkerDesk({ getS, snd, onDeliver, onAction }) {
  const D = { ch: 'kumpels', read: { auftraege: 0, kumpels: 0, beschwerden: 0 }, sig: {}, body: {}, t: 0 };
  const icons = [['auftraege', 'Großhandel', SVG.shop], ['kippcord', 'KippCord', SVG.chat], ['maschinen', 'Maschinen', SVG.gear], ['trash', 'Papierkorb', SVG.trash]];
  function open(k, api) {
    const div = api.div;
    if (k === 'auftraege') { const b = div('bp-site', ''); D.body.auftraege = b; D.sig.auftraege = ''; b.addEventListener('click', (e) => onClick(e, api)); const a = api.win('auftraege', 'kippen-grosshandel.biz – Aufträge', SVG.shop, b, { w: 600, h: 560 }); a.el.style.left = '2.5%'; a.el.style.top = '4%'; renderOrders(); return; }
    if (k === 'kippcord') { const b = div('bp-chat', '<div class="bp-chans"></div><div class="bp-msgs"></div><div class="bp-input">Nur lesen. Ludwig tippt nicht, er dreht.</div>'); D.body.kippcord = b; D.sig.kippcord = ''; b.querySelector('.bp-chans').addEventListener('click', (e) => { const c = e.target.closest('[data-ch]'); if (c) { D.ch = c.dataset.ch; D.sig.kippcord = ''; renderChat(); snd.ui(); } }); const a = api.win('kippcord', 'KippCord', SVG.chat, b, { w: 500, h: 560 }); a.el.style.left = '54%'; a.el.style.top = '6%'; renderChat(); return; }
    if (k === 'maschinen') { const b = div('bp-mach', ''); D.body.maschinen = b; D.sig.maschinen = ''; api.win('maschinen', 'Maschinen im Bunker', SVG.gear, b, { w: 560, h: 460 }); renderMachines(); return; }
    if (k === 'trash') api.win('trash', 'Papierkorb', SVG.trash, div('os-empty', '<p>Der Papierkorb ist leer.</p><p class="os-small">Die Beweise auch.</p>'), { w: 420, h: 220 });
  }
  // ---- Großhandel: Anfragen (annehmen/ablehnen) und laufende Aufträge (liefern)
  function renderOrders() {
    const b = D.body.auftraege; if (!b || !b.isConnected) return; const S = getS(); const B = S.bunker;
    const sig = JSON.stringify([B.orders.map((o) => [o.id, o.state, auftragVorrat(B, o.sorte) >= o.n]), Math.floor(B.lager / 10), Math.floor(S.geld / 100), S.respekt]); if (sig !== D.sig.auftraege) {
      D.sig.auftraege = sig; const neu = B.orders.filter((o) => o.state === 'neu'); const akt = B.orders.filter((o) => o.state === 'aktiv');
      const card = (o) => `<div class="bp-card${o.mega ? ' mega' : ''}" data-id="${o.id}"><div class="bp-shop">${o.mega ? '🌍' : '🏪'} ${esc(o.shop)}</div><div class="bp-n"><b>${num(o.n)}</b> ${auftragWort(o.sorte)} in ${Math.round(o.frist / 60)} Minuten</div><div class="bp-pay">+${euro(o.n * o.preis)} · +${Math.floor((o.resp * 10) / 10)} ⭐</div><div class="bp-bar"><i data-bar="${o.id}"></i></div><small class="bp-left" data-left="${o.id}"></small>`
        + (o.state === 'neu' ? `<div class="bp-btns"><button type="button" class="bp-ok" data-acc="${o.id}">Annehmen</button><button type="button" class="bp-no" data-dec="${o.id}">Ablehnen${o.mega ? '' : ` (−${Math.max(2, Math.round(o.n / 100))} ⭐)`}</button></div>` : `<div class="bp-btns"><button type="button" class="bp-ok" data-del="${o.id}"${B.lager >= o.n ? '' : ' disabled'}>Liefern 🚚</button>${B.lager >= o.n ? '' : `<span class="bp-miss">Im Lager fehlen ${num(o.n - B.lager)}</span>`}</div>`) + '</div>';
      b.innerHTML = `<header class="bp-head"><div><b>KIPPEN-GROSSHANDEL</b><span>.biz</span></div><div class="bp-stat">Lager <b>${num(B.lager)}</b> · Kasse <b>${euro(S.geld)}</b> · ⭐ <b>${num(S.respekt)}</b></div></header>
        <h4>Neue Anfragen</h4><div class="bp-list">${neu.length ? neu.map(card).join('') : '<p class="bp-empty">Gerade keine Anfragen. Die Läden melden sich von selbst.</p>'}</div>
        <h4>Laufende Aufträge</h4><div class="bp-list">${akt.length ? akt.map(card).join('') : '<p class="bp-empty">Nichts angenommen. Geliefert wird aus dem Lager, per Lastwagen aus der Tiefgarage.</p>'}</div>`;
    }
    for (const o of B.orders) { const bar = b.querySelector(`[data-bar="${o.id}"]`); const left = b.querySelector(`[data-left="${o.id}"]`); const k = o.state === 'neu' ? o.decide / (o.mega ? 180 : 90) : o.left / o.frist; if (bar) { bar.style.width = `${Math.max(0, Math.min(1, k)) * 100}%`; bar.classList.toggle('low', k < 0.25); } if (left) left.textContent = o.state === 'neu' ? `Antwort in ${mmss(o.decide)}` : `Noch ${mmss(o.left)}`; }
  }
  function onClick(e, api) {
    const S = getS(); const t = e.target.closest('button'); if (!t || t.disabled) return;
    if (t.dataset.acc) { const r = accept(S, Number(t.dataset.acc)); if (r.ok) { snd.buy(); onAction('accept', r); } }
    else if (t.dataset.dec) { const r = decline(S, Number(t.dataset.dec)); if (r.ok) { snd.nope(); onAction('decline', r); } }
    else if (t.dataset.del) { const r = deliver(S, Number(t.dataset.del)); if (r.ok) { snd.coin(5); onDeliver(r); } else snd.nope(); }
    D.sig.auftraege = ''; renderOrders(); void api;
  }
  // ---- KippCord
  function renderChat() {
    const b = D.body.kippcord; if (!b || !b.isConnected) return; const B = getS().bunker; const last = B.chat.length ? B.chat[B.chat.length - 1].id : 0; const sig = D.ch + ':' + last; if (sig === D.sig.kippcord) return; D.sig.kippcord = sig;
    const mine = B.chat.filter((m) => m.ch === D.ch); if (mine.length) D.read[D.ch] = mine[mine.length - 1].id;
    b.querySelector('.bp-chans').innerHTML = '<b class="bp-server">Ludwigs Bunker</b>' + Object.entries(CHANNELS).map(([k, n]) => { const un = B.chat.filter((m) => m.ch === k && m.id > D.read[k]).length; const al = B.chat.some((m) => m.ch === k && m.alarm && m.id > D.read[k]); return `<button type="button" class="bp-chan${k === D.ch ? ' on' : ''}${al ? ' alarm' : ''}" data-ch="${k}">${n}${un ? `<em>${un}</em>` : ''}</button>`; }).join('');
    const box = b.querySelector('.bp-msgs'); box.innerHTML = mine.slice(-40).map((m) => `<div class="bp-msg${m.alarm ? ' alarm' : ''}"><i data-col="${WHO_COL[m.who] || '#e8c08a'}">${esc(m.who.slice(0, 1))}</i><div><b data-col2="${WHO_COL[m.who] || '#e8c08a'}">${esc(m.who)}</b><p>${esc(m.text)}</p></div></div>`).join('') || '<p class="bp-empty">Noch keine Nachrichten.</p>';
    for (const e of box.querySelectorAll('[data-col]')) e.style.background = e.dataset.col; for (const e of box.querySelectorAll('[data-col2]')) e.style.color = e.dataset.col2; box.scrollTop = box.scrollHeight;
  }
  // ---- Maschinen-Übersicht
  function renderMachines() {
    const b = D.body.maschinen; if (!b || !b.isConnected) return; const S = getS(); const B = S.bunker; const sig = JSON.stringify([B.units.map((u) => [u.id, unitStatus(u), Math.floor(buildProgress(u) * 20), u.op]), B.kumpel]); if (sig === D.sig.maschinen) return; D.sig.maschinen = sig;
    const r = bunkerRates(S); const rows = B.units.map((u) => { const st = unitStatus(u); const [txt, col] = STATUS[st] || ['?', 'yellow']; const M = MACHINES[u.id]; const n = B.units.filter((q) => q.id === u.id).length > 1 ? ` ${u.i + 1}` : ''; return `<tr><td>${esc(M.name)}${n}</td><td><span class="bp-dot ${col}"></span>${txt}${st === 'bau' ? ` (${Math.round(buildProgress(u) * 100)} %)` : ''}</td><td>${u.op ? (u.op === 'kumpel' ? 'Kumpel' : 'Roboter') : M.kind === 'hand' ? '–' : 'Automat'}</td></tr>`; }).join('');
    b.innerHTML = `<p class="bp-sum">Kippen pro Minute (alles läuft): <b>${num(r.kippen)}</b> · Blättchen <b>${num(r.papier)}</b> · Tabak <b>${num(r.tabak)}</b>${B.kumpel ? ` · Unten hilft: <b>${{ rot: 'Rot', gelb: 'Gelb', gruen: 'Grün' }[B.kumpel]}</b>` : ''}</p>` + (rows ? `<table class="bp-table"><tr><th>Maschine</th><th>Zustand</th><th>Bedient von</th></tr>${rows}</table>` : '<p class="bp-empty">Noch keine Maschinen. Kauf sie im Boss-Plan auf dem Handy, dann werden sie hier aufgebaut.</p>');
  }
  function tick(dt) { D.t += dt; if (D.t < 0.25) return; D.t = 0; renderOrders(); renderChat(); renderMachines(); }
  const chatOpen = () => !!(D.body.kippcord && D.body.kippcord.isConnected);
  const unread = () => { const B = getS().bunker; return B.chat.filter((m) => m.id > D.read[m.ch]).length; };
  return { brand: 'BUNKER-PC', title: 'LudwigOS · Bunker', icons, open, tick, chatOpen, unread, D };
}
