// Theos Seitenscheidel - Schaltkulisse (H-Schaltung) als Einblendung unten rechts: Maus bewegen führt den Knauf durch die Gassen, Gang rastet am Ende der Gasse ein.
// Rennwagen: A N / 1 2 3 4 5 6 7 8 (A = Automatik, N = Leerlauf), 8 Gänge.
// Die Spiellogik (was ein Gang bewirkt) liegt bei den Aufrufern; hier nur Bedienung und Anzeige.
const GATES = {
  race: { cols: [{ t: 'A', b: 0 }, { t: 1, b: 2 }, { t: 3, b: 4 }, { t: 5, b: 6 }, { t: 7, b: 8 }] },
};
const label = (g) => (g === -1 ? 'R' : g === 0 ? 'N' : String(g));

export function createShifter(root, cv, hooks = {}) {
  const c = cv.getContext('2d'); const W = cv.width; const H = cv.height; const top = 52; const mid = 120; const bot = 188;
  const S = { open: false, kind: 'race', gear: 1, kx: 0, ky: mid, last: null, closeT: -1, cols: [], xs: [], t: 0 };
  const layout = () => { const g = GATES[S.kind]; const n = g.cols.length; S.cols = g.cols; S.xs = g.cols.map((_, i) => 40 + i * ((W - 80) / (n - 1))); };
  const colAt = (x) => { let bi = -1; let bd = 1e9; S.xs.forEach((cx, i) => { const d = Math.abs(cx - x); if (d < bd) { bd = d; bi = i; } }); return bd < 15 ? bi : -1; };
  function draw() {
    c.clearRect(0, 0, W, H); c.fillStyle = 'rgba(10,12,12,0.78)'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,255,255,0.22)'; c.strokeRect(0.5, 0.5, W - 1, H - 1);
    c.strokeStyle = '#7d848a'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(S.xs[0], mid); c.lineTo(S.xs[S.xs.length - 1], mid); c.stroke(); for (const x of S.xs) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.stroke(); }
    c.strokeStyle = '#1a1c1e'; c.lineWidth = 2; c.beginPath(); c.moveTo(S.xs[0], mid); c.lineTo(S.xs[S.xs.length - 1], mid); c.stroke(); for (const x of S.xs) { c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.stroke(); }
    c.font = 'bold 20px Segoe UI, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle';
    S.cols.forEach((col, i) => { for (const [g, y] of [[col.t, top - 20], [col.b, bot + 20]]) { const sel = g === S.gear || (S.kind === 'race' && g === 'A' && S.gear === 'A'); c.fillStyle = sel ? '#ffb24a' : '#aeb4b0'; c.fillText(typeof g === 'number' ? label(g) : g, S.xs[i], y); } });
    c.fillStyle = '#f3efe4'; c.beginPath(); c.arc(S.kx, S.ky, 11, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#2a2d30'; c.lineWidth = 2; c.stroke(); c.fillStyle = '#c8321e'; c.beginPath(); c.arc(S.kx, S.ky, 4, 0, Math.PI * 2); c.fill();
  }
  function pick() { // welcher Gang liegt an der Knaufposition?
    const i = colAt(S.kx); let g = null;
    if (i >= 0 && S.ky <= top + 9) g = S.cols[i].t; else if (i >= 0 && S.ky >= bot - 9) g = S.cols[i].b; else if (Math.abs(S.ky - mid) < 9) g = 0;
    return g;
  }
  S.begin = (kind, current) => { S.kind = kind; layout(); S.open = true; S.closeT = -1; S.gear = current; S.last = current; const i = typeof current === 'number' ? S.cols.findIndex((cl) => cl.t === current || cl.b === current) : (current === 'A' ? 0 : -1); const idx = i >= 0 ? i : 1; S.kx = S.xs[idx]; const col = S.cols[idx]; S.ky = col && col.t === current ? top : col && col.b === current ? bot : mid; root.classList.remove('hidden'); draw(); hooks.onOpen && hooks.onOpen(); };
  S.end = () => { if (!S.open) return; S.open = false; root.classList.add('hidden'); hooks.onClose && hooks.onClose(S.gear); };
  S.toggle = (kind, current) => { if (S.open) S.end(); else S.begin(kind, current); };
  S.move = (dx, dy) => {
    if (!S.open) return; S.kx += dx * 0.85; S.ky += dy * 0.85; S.kx = Math.max(S.xs[0] - 16, Math.min(S.xs[S.xs.length - 1] + 16, S.kx)); const i = colAt(S.kx);
    if (i < 0) S.ky = Math.max(mid - 10, Math.min(mid + 10, S.ky)); else if (Math.abs(S.ky - mid) > 10) S.kx = S.xs[i]; S.ky = Math.max(top, Math.min(bot, S.ky));
    const g = pick(); if (g !== null && g !== S.last) { S.last = g; S.gear = g; hooks.onSelect && hooks.onSelect(g); } hooks.onMove && hooks.onMove(Math.hypot(dx, dy)); draw();
  };
  S.update = (dt) => { if (!S.open) return; S.t += dt; if (S.closeT >= 0) { S.closeT -= dt; if (S.closeT < 0) S.end(); } };
  layout(); return S;
}
