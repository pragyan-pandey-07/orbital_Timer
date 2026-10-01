const CACHE_NAME = 'orbital-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Network-first strategy for everything to ensure updates are instantly received
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Only cache valid GET requests
        if (event.request.method === 'GET' && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, clone);
            });
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // Fallback to cache if offline
  );
});
