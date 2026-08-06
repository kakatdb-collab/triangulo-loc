/**
 * Service Worker - Triângulo Estúdio PWA
 * Fast caching, offline support, stale-while-revalidate strategy.
 */

const CACHE_NAME = 'triangulo-estudio-pwa-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://i.postimg.cc/bvrMr15X/logo-triangulo-fotoclube-negativo-PNG.png'
];

// Install stage: precache essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA Service Worker] Precaching app shell');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[PWA Service Worker] Non-critical cache fail during install:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate stage: clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA Service Worker] Purging legacy cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch stage: Network-first for dynamic navigation, Stale-while-revalidate for static files
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests or socket/extension traffic
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass API and Firebase live database endpoints
  if (
    url.pathname.startsWith('/api/') || 
    url.hostname.includes('firestore') || 
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  // Handle HTML document navigations (Network first -> Cache fallback)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Handle static assets (Stale-while-revalidate)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent offline handle
        });

      return cachedResponse || fetchPromise;
    })
  );
});
