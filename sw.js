// Theos Seitenscheidel - Handy: läuft nach dem ersten Öffnen auch ohne Internet. Neue Version = neuer Name, alter Speicher fliegt raus.
const NAME = 'theos-handy-1.24.0';
const DATEIEN = ["./","index.html","handy.js","handy.css","style.css","schule.css","manifest.json","icon-192.png","js/dino.js","js/dinologic.js","js/stapel.js","js/stapellogic.js","js/schulrang.js","js/chess.js","js/chesslogic.js","js/pong.js","js/ponglogic.js","js/ships.js","js/shipslogic.js","js/tour.js","js/mp.js","js/net.js","js/racemp.js","js/zimmerwahl.js","js/vendor/three.module.min.js","js/vendor/peerjs.min.js"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(NAME).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((n) => n !== NAME).map((n) => caches.delete(n)))).then(() => self.clients.claim())); });
// Erst das Netz (damit Updates sofort da sind), ohne Netz der Speicher
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => { const k = r.clone(); caches.open(NAME).then((c) => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
