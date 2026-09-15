// uyghur-tibb Vue app service worker.
// Cache-on-demand with network-first navigation so the hashed Vite build
// always refreshes, while assets stay available offline.
const CACHE_NAME = 'uytibb-vue-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Only the public, approved recipe feed is safe to cache. Never cache admin,
  // student, feedback, or other API responses containing personal/auth data.
  const isPublicRecipes = url.pathname === '/api/students' && url.searchParams.get('recipes') === '1';
  const isPublicHerbs = url.pathname === '/api/students' && url.searchParams.get('herbs') === '1';
  if (url.pathname.startsWith('/api/') && !isPublicRecipes && !isPublicHerbs) return;

  const isNav = event.request.mode === 'navigate' || event.request.destination === 'document' || url.pathname === '/';
  // Private/local book uploads must not become an accidental offline data leak.
  const isPdf = url.pathname.includes('/pdf/') && !url.pathname.endsWith('/100-keselge-1000-retsip.pdf');

  // Navigation & PDFs: network-first, cached fallback for offline.
  if (isNav || isPdf) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('./')))
    );
    return;
  }

  // Approved recipe feed: network-first, cached fallback for offline study.
  if (isPublicRecipes || isPublicHerbs) {
    event.respondWith(fetch(event.request).then((response) => {
      if (response && response.status === 200) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => caches.match(event.request)));
    return;
  }

  // Other assets: network with cache fallback.
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
