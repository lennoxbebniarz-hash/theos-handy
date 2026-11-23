// Theos Seitenscheidel - kompaktes Tutorial für die kleinen Spiele: Bild links, kurzer Text rechts. Jede Station zeichnet sich selbst, auf Wunsch laufend.
export function createTour({ root, store, key, steps }) {
  const over = document.createElement('div'); over.className = 'cs-over hidden'; over.innerHTML = '<div class="cs-card cs-tut"><div class="cs-tutboard"><canvas></canvas></div><div class="cs-tuttext"><p class="label"></p><h2></h2><p class="cs-tx"></p><div class="cs-dots"></div><div class="foot"><button type="button" data-a="skip">Überspringen</button><button type="button" data-a="prev">Zurück</button><button type="button" data-a="next" class="primary">Weiter</button></div></div></div>'; root.append(over);
  const cv = over.querySelector('canvas'); const label = over.querySelector('.label'); const title = over.querySelector('h2'); const text = over.querySelector('.cs-tx'); const dots = over.querySelector('.cs-dots'); const prev = over.querySelector('[data-a=prev]'); const next = over.querySelector('[data-a=next]');
  const T = { open: false, i: 0 }; let raf = 0;
  function paint(now) { if (!T.open) { raf = 0; return; } const dpr = window.devicePixelRatio || 1; const w = cv.clientWidth; const h = cv.clientHeight; if (w && h) { if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); } const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); steps[T.i].draw(ctx, w, h, now / 1000); } raf = requestAnimationFrame(paint); }
  function show() { const s = steps[T.i]; label.textContent = 'Kurz erklärt ' + (T.i + 1) + ' von ' + steps.length; title.textContent = s.t; text.textContent = s.x; prev.classList.toggle('hidden', T.i === 0); next.textContent = T.i === steps.length - 1 ? 'Los geht\'s' : 'Weiter'; dots.textContent = ''; steps.forEach((_, k) => { const d = document.createElement('i'); if (k === T.i) d.className = 'on'; dots.append(d); }); }
  T.show = () => { T.i = 0; T.open = true; over.classList.remove('hidden'); show(); if (!raf) raf = requestAnimationFrame(paint); };
  T.close = () => { T.open = false; over.classList.add('hidden'); store.set(key, true); };
  T.first = () => { if (!store.get(key, false)) T.show(); };
  over.addEventListener('click', (e) => { const a = e.target.dataset && e.target.dataset.a; if (a === 'skip') T.close(); if (a === 'prev' && T.i > 0) { T.i--; show(); } if (a === 'next') { if (T.i >= steps.length - 1) T.close(); else { T.i++; show(); } } });
  T.count = steps.length; T.el = over; return T;
}
