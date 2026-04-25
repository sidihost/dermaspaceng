// IMPORTANT: bump every cache version when the navigation/RSC
// handling logic below changes. Old SW instances on user devices
// continue serving from the OLD caches until either the page is
// hard-refreshed or the version string changes — so anything that
// could cause "stale rendered content sticks around" (like the
// double-page render bug from caching streamed App Router HTML)
// MUST be paired with a version bump to take effect on real users.
const CACHE_NAME = 'dermaspace-v4';
const STATIC_CACHE = 'dermaspace-static-v4';
const DYNAMIC_CACHE = 'dermaspace-dynamic-v4';
const IMAGE_CACHE = 'dermaspace-images-v4';

// Static assets to cache immediately (public pages)
const STATIC_ASSETS = [
  '/',
  '/services',
  '/services/facial-treatments',
  '/services/body-treatments',
  '/services/nail-care',
  '/services/waxing',
  '/booking',
  '/about',
  '/contact',
  '/gallery',
  '/packages',
  '/membership',
  '/gift-cards',
  '/laser-tech',
  '/consultation',
  '/offline',
  '/manifest.json',
];

// Pages that require authentication used to be cached here. They
// no longer are — every /dashboard, /admin, and /staff URL is
// short-circuited at the top of the fetch handler so the SW never
// touches them. Keeping this constant empty (rather than deleted)
// for compatibility with any in-flight clients that still reference
// AUTH_PAGES from cached SW source on first load. Safe to remove
// once the v4 SW has been live for ~24h.
const AUTH_PAGES = [];

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

  // CRITICAL: bypass the service worker entirely for any
  // authenticated app surface and for Next.js App Router data
  // fetches. The previous version of this file cached every
  // /dashboard/* HTML response into DYNAMIC_CACHE while it was
  // still streaming, which produced two distinct user-visible
  // bugs:
  //
  //   1. Navigating from /dashboard/support to
  //      /dashboard/support/[ticketId] sometimes rendered BOTH
  //      the list and the detail page stacked in the same scroll
  //      container, only fixable with a hard refresh.
  //   2. Authenticated pages contain user-private data that
  //      MUST NOT be served from cache to a different session
  //      on the same device, and MUST always reflect the latest
  //      tickets / messages / wallet balance / etc.
  //
  // We bypass two distinct request shapes:
  //   - URL pathname starting with `/dashboard`, `/admin`,
  //     `/staff`, or `/api` — every authenticated surface.
  //   - Any request carrying the `RSC` header or a `_rsc`
  //     query param (Next.js App Router data fetch). These
  //     are NOT browser navigations and the streamed payload
  //     format breaks if cached and replayed.
  //
  // `return` (without `respondWith`) lets the browser perform
  // the request directly against the origin, exactly as if the
  // SW weren't installed for this URL.
  const isAuthSurface =
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/staff');
  const isRscFetch =
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1' ||
    url.searchParams.has('_rsc');
  if (isAuthSurface || isRscFetch) {
    return;
  }

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

  // Handle images - Network first for icons/favicons, Cache first for others
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)
  ) {
    // Icons and favicons should always try network first to get fresh versions
    const isIconOrFavicon = url.pathname.includes('icon') || 
                            url.pathname.includes('favicon') ||
                            url.pathname.includes('/icons/');
    
    if (isIconOrFavicon) {
      // Network first for icons
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const clonedResponse = response.clone();
              caches.open(IMAGE_CACHE).then((cache) => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          })
          .catch(async () => {
            const cachedResponse = await caches.match(request);
            return cachedResponse || new Response('', { status: 404 });
          })
      );
      return;
    }
    
    // Cache first for regular images
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

  // Handle page navigations - Network first with better offline support
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Check which cache to use based on the page type
        const isAuthPage = AUTH_PAGES.some(page => url.pathname.startsWith(page));
        const targetCache = isAuthPage ? DYNAMIC_CACHE : STATIC_CACHE;
        
        try {
          // Try network first with short timeout
          const networkResponse = await networkWithTimeout(request, 5000);
          
          // Cache the fresh response
          if (networkResponse.ok) {
            const cache = await caches.open(targetCache);
            cache.put(request, networkResponse.clone());
            
            // Also cache any RSC data requests that come with the page
            if (networkResponse.headers.get('content-type')?.includes('text/html')) {
              limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
            }
          }
          
          return networkResponse;
        } catch (error) {
          // Network failed, try dynamic cache first
          const dynamicCached = await caches.match(request);
          if (dynamicCached) {
            return dynamicCached;
          }

          // Then check static cache with the pathname
          const staticCached = await caches.match(url.pathname);
          if (staticCached) {
            return staticCached;
          }
          
          // Try matching without trailing slash variations
          const pathVariant = url.pathname.endsWith('/') 
            ? url.pathname.slice(0, -1) 
            : url.pathname + '/';
          const variantCached = await caches.match(pathVariant);
          if (variantCached) {
            return variantCached;
          }

          // For auth pages that weren't visited, redirect to offline
          // For public pages, show offline page
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
      icon: '/icons/icon-512x512.webp',
      badge: '/icons/icon-512x512.webp',
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

// Handle skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
