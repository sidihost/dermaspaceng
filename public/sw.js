/* Dermaspace Service Worker — offline public-page shell & Web Push */

const CACHE_VERSION = 'v1';
const PAGES_CACHE = `dermaspace-pages-${CACHE_VERSION}`;
const ACTIVE_CACHES = new Set([PAGES_CACHE]);

const PRIVATE_ROUTE_PREFIXES = [
  '/dashboard',
  '/admin',
  '/staff',
  '/signin',
  '/signup',
  '/logout',
  '/complete-profile',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/accept-invite',
  '/booking',
  '/membership/receipt',
];

function isPrivateOrAuthRoute(pathname) {
  if (!pathname) return false;
  const normalized = pathname.toLowerCase();
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function isCacheablePublicPageUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl, self.location.origin);
    if (parsed.origin !== self.location.origin) return null;
    if (
      parsed.pathname.startsWith('/api/') ||
      parsed.pathname.startsWith('/_next/') ||
      parsed.pathname === '/sw.js' ||
      isPrivateOrAuthRoute(parsed.pathname)
    ) {
      return null;
    }
    parsed.searchParams.delete('_rsc');
    return parsed.toString();
  } catch {
    return null;
  }
}

async function warmPageUrl(rawUrl) {
  const safeUrl = isCacheablePublicPageUrl(rawUrl);
  if (!safeUrl) return;
  try {
    const res = await fetch(safeUrl, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' },
    });
    if (res && res.ok && res.type === 'basic') {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        const cache = await caches.open(PAGES_CACHE);
        await cache.put(safeUrl, res.clone());
      }
    }
  } catch {
    // Best-effort offline warmup
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('dermaspace-') && !ACTIVE_CACHES.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'CACHE_URLS' && Array.isArray(data.urls)) {
    const uniqueUrls = Array.from(
      new Set(data.urls.map(isCacheablePublicPageUrl).filter(Boolean)),
    );
    event.waitUntil(Promise.allSettled(uniqueUrls.map((u) => warmPageUrl(u))));
    return;
  }

  if (data.type === 'CACHE_NAVIGATION' && typeof data.url === 'string') {
    event.waitUntil(warmPageUrl(data.url));
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Only handle same-origin public HTML navigations; leave /api/*, /_next/*,
  // private/auth routes, and static chunks untouched so dev & prod bundles never go stale.
  if (request.mode !== 'navigate') return;

  const safeUrl = isCacheablePublicPageUrl(request.url);
  if (!safeUrl) return;

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
          const contentType = networkResponse.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            const cache = await caches.open(PAGES_CACHE);
            cache.put(safeUrl, networkResponse.clone()).catch(() => {});
          }
        }
        return networkResponse;
      } catch {
        const cache = await caches.open(PAGES_CACHE);
        const cached = (await cache.match(safeUrl)) || (await cache.match('/offline'));
        if (cached) return cached;
        return new Response('You are offline. Please check your connection and try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })(),
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Dermaspace', body: event.data.text() };
  }

  const title = payload.title || 'Dermaspace';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/favicon.png',
    tag: payload.tag || undefined,
    data: {
      url: payload.url || '/dashboard/notifications',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of windowClients) {
        if ('focus' in client && client.url.startsWith(self.location.origin)) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              // Ignore cross-context navigation restrictions
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
