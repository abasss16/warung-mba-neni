const CACHE_NAME = 'warung-bu-neni-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/menu',
  '/keranjang',
  '/pesanan',
  '/auth/login',
  '/auth/register',
  '/offline.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];


// Install Event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of ASSETS_TO_CACHE) {
        try {
          await cache.add(asset);
          console.log('✅ Cached:', asset);
        } catch (err) {
          console.error('❌ Failed to cache:', asset, err);
        }
      }
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
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }

              return caches.match('/');
            })
            .then((response) => {
              return response || caches.match('/offline.html');
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