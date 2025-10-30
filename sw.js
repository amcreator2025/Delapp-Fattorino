
const VERSION = 'v1.0.0';
const STATIC_CACHE = `static-${VERSION}`;
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login_fattorino.html',
  '/fattorino_consegne.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  'https://esm.sh/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle GET
  if (req.method !== 'GET') return;

  // HTML pages: try network first, fall back to cache, then offline page
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(async () => {
        const cached = await caches.match(req);
        return cached || caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // Other assets: cache-first
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(STATIC_CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
