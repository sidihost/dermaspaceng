const CACHE_NAME = 'dermaspace-v1';
const STATIC_CACHE = 'dermaspace-static-v1';
const DYNAMIC_CACHE = 'dermaspace-dynamic-v1';
const IMAGE_CACHE = 'dermaspace-images-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/services',
  '/booking',
  '/about',
  '/contact',
  '/offline',
  '/manifest.json',
];

// Cache size limits
const CACHE_LIMITS = {
  dynamic: 50,
  images: 100,
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return name.startsWith('dermaspace-') && 
              name !== STATIC_CACHE && 
              name !== DYNAMIC_CACHE && 
              name !== IMAGE_CACHE;
          })
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Helper: Limit cache size
const limitCacheSize = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
};

// Helper: Network with timeout
const networkWithTimeout = (request, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Network timeout'));
    }, timeout);

    fetch(request)
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Fetch event - handle requests with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  // Skip API requests that should always be fresh
  if (url.pathname.startsWith('/api/')) {
    // Network first with cache fallback for API
    event.respondWith(
      networkWithTimeout(request, 8000)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
              limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Return a JSON error response for API failures
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // Handle images - Cache first, then network
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached image and update in background
          event.waitUntil(
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  caches.open(IMAGE_CACHE).then((cache) => {
                    cache.put(request, response);
                    limitCacheSize(IMAGE_CACHE, CACHE_LIMITS.images);
                  });
                }
              })
              .catch(() => {})
          );
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const clonedResponse = response.clone();
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, clonedResponse);
                limitCacheSize(IMAGE_CACHE, CACHE_LIMITS.images);
              });
            }
            return response;
          })
          .catch(() => {
            // Return a placeholder for failed images
            return new Response('', { status: 404 });
          });
      })
    );
    return;
  }

  // Handle static assets - Cache first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request).then((response) => {
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Handle page navigations - Stale while revalidate
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try network first with short timeout
          const networkResponse = await networkWithTimeout(request, 5000);
          
          // Cache the fresh response
          if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          // Network failed, try cache
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Check for static cached version of the page
          const staticCached = await caches.match(url.pathname);
          if (staticCached) {
            return staticCached;
          }

          // All else fails, show offline page
          const offlinePage = await caches.match('/offline');
          if (offlinePage) {
            return offlinePage;
          }

          // Last resort
          return new Response('Offline', {
            status: 503,
            headers: { 'Content-Type': 'text/html' },
          });
        }
      })()
    );
    return;
  }

  // Default: Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
            limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
          });
        }
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response('Offline', { status: 503 });
      })
  );
});

// Handle background sync for failed form submissions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncBookings());
  }
});

// Sync pending bookings when back online
async function syncBookings() {
  // Implementation for syncing offline bookings
  // This would read from IndexedDB and retry failed requests
}

// Push notifications (for appointment reminders)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/',
      },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Dermaspace', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});
