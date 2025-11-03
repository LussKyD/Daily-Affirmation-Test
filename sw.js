/* sw.js - stale-while-revalidate strategy, cache migration v2.1 */
const CACHE_NAME = 'affirm-shell-v2.1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/analytics.js',
  './manifest.json',
  './icons/affirm-glass-192.png',
  './icons/affirm-glass-512.png',
  './icons/affirm-solar-192.png',
  './icons/affirm-solar-512.png',
  './icons/affirm-midnight-192.png',
  './icons/affirm-midnight-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if(k !== CACHE_NAME) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(req){
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);
  const networkFetch = fetch(req).then(networkResponse => {
    if(networkResponse && networkResponse.ok){
      cache.put(req, networkResponse.clone()).catch(()=>{});
    }
    return networkResponse;
  }).catch(()=>null);
  return cached || networkFetch;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if(req.mode === 'navigate'){
    event.respondWith(fetch(req).then(res => res).catch(()=> caches.match('./index.html')));
    return;
  }

  if(url.origin === location.origin){
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  event.respondWith(
    fetch(req).then(res=>{ return res; }).catch(()=> caches.match(req))
  );
});
