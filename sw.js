/* sw.js - basic cache-first app shell + network-first for external APIs */

const CACHE_NAME = 'daily-aff-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      if (key !== CACHE_NAME) return caches.delete(key);
    }))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(()=>caches.match('./index.html')));
    return;
  }

  // network-first for external APIs
  if (url.origin !== location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          try { cache.put(req, res.clone()); } catch(err){}
          return res;
        });
      }).catch(()=>caches.match(req))
    );
    return;
  }

  // cache-first for app shell assets
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      caches.open(CACHE_NAME).then(cache => {
        try { cache.put(req, res.clone()); } catch(e){}
      });
      return res;
    })).catch(()=>caches.match('./index.html'))
  );
});
