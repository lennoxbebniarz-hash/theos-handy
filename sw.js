// Theos Seitenscheidel - Handy: läuft nach dem ersten Öffnen auch ohne Internet. Neue Version = neuer Name, alter Speicher fliegt raus.
const NAME = 'theos-handy-1.24.0';
const DATEIEN = ["./","index.html","touch.js","touch.css"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(NAME).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== NAME && n.startsWith('theos-handy-') && n.endsWith('-schule') === NAME.endsWith('-schule')).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
// Erst das Netz (damit Updates sofort da sind), ohne Netz der Speicher
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const k = r.clone(); caches.open(NAME).then((c) => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
