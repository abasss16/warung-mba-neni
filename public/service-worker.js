const CACHE_NAME = 'warung-bu-neni-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/style.css',
  '/js/effects.js',
  '/offline.html',
  '/logo192.png',
  '/logo512.png',
  '/manifest.json'
];

// Install Event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: handle caching strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Bypass service worker for API calls and admin routes (always go to network)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/admin')) {
    return;
  }

  // Handle Page Navigation (HTML requests)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone response and save to cache
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // If not in cache, return the offline fallback page
            return caches.match('/offline.html');
          });
        })
    );
    return;
  }

  // Handle static assets (Cache-first with network fallback)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((response) => {
        // Skip caching dynamic or non-ok responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseCopy);
        });
        return response;
      }).catch(() => {
        return new Response('Offline content unavailable', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});