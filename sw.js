const CACHE_NAME = 'uytibb-v51-20260911_wrong_routes_and_l11_terms';
const ASSETS = [
  './',
  './index.html',
  './admin.html',
  './books.html',
  './manifest.webmanifest',
  './admin.webmanifest',
  './books.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './admin-icon-192.png',
  './admin-icon-512.png',
  './admin-icon-maskable-192.png',
  './admin-icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('SW pre-cache warning:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Purging legacy cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // 1. Navigation / Document: NETWORK-FIRST (revalidate with server)
  const isNav = event.request.mode === 'navigate' || event.request.destination === 'document'
    || url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/admin.html') || url.pathname.endsWith('/books.html');
  if (isNav) {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          if (url.pathname.endsWith('/admin.html')) {
            return caches.match('./admin.html');
          }
          return caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // 2. data.js & supabase.js: ALWAYS NETWORK-FIRST, no cache read (fresh data every time)
  if (url.pathname.endsWith('/data.js') || url.pathname.endsWith('/supabase.js')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. PDFs: Network-first, cache fallback
  if (url.pathname.includes('/pdf/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. Static Assets: Network with Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
