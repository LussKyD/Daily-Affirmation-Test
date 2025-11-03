/* sw.js
   Simple service worker with cache-first strategy for app shell and
   network-first for optional API calls (weather).
   - Keeps offline functionality simple and robust.
*/

const CACHE_NAME = 'daily-aff-shell-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// On install: pre-cache app shell
self.addEventListener('install', (evt) => {
  self.skipWaiting();
  evt.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
  );
});

// Activate: clean up old caches if any
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for shell, network-first for API/weather
self.addEventListener('fetch', (evt) => {
  const req = evt.request;
  const url = new URL(req.url);

  // Handle navigation to support SPA-like behavior (serve index.html)
  if (req.mode === 'navigate') {
    evt.respondWith(
      fetch(req).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Simple network-first for weather API calls (so offline returns fallback)
  if (url.origin !== location.origin && url.pathname.includes('/data/2.5/')) {
    evt.respondWith(
      fetch(req).then(res => {
        // Optionally cache the JSON response for short time
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, res.clone());
          return res;
        });
      }).catch(() => caches.match(req))
    );
    return;
  }

  // For other requests: cache-first
  evt.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          // Avoid caching opaque responses larger than necessary
          try { cache.put(req, res.clone()); } catch(e) { /* ignore */ }
          return res;
        });
      }).catch(() => {
        // fallback for images/icons -> try cached icon
        if (req.destination === 'image') {
          return caches.match('/icons/icon-192.png');
        }
        return caches.match('/index.html');
      });
    })
  );
});
