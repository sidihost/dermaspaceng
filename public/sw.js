// ---------------------------------------------------------------------------
// Dermaspace service worker (v6)
//
// Why this rewrite?
// -----------------
// The previous SW (v3) cached HTML navigations into `STATIC_CACHE` and, on
// slow networks, served that cached HTML whenever the live request blew its
// 5-second timeout. After every new deploy the Next.js build emits fresh
// `/_next/static/chunks/<hash>.js` filenames — but the cached HTML still
// referenced the OLD hashes. Result: on Nigerian 4G/H+ users were getting a
// stale cached homepage whose chunks 404'd, React failed to bootstrap, and
// the browser fell through to its bare "Application error: a client-side
// exception has occurred" white screen on dermaspaceng.com.
//
// This v5 rewrite fixes that class of bug for good:
//
//   1. Navigations are NETWORK-ONLY when online. We do not serve stale HTML
//      under any circumstance — fresh HTML is the only way to guarantee its
//      chunk references match what's actually deployed.
//
//   2. Offline navigations fall back to the dedicated `/offline` shell. The
//      offline shell is the only HTML we precache, so it can never go stale
//      against newer chunks.
//
//   3. Hashed `/_next/static/*` assets are stale-while-revalidate. Their
//      filenames are content-addressed (Next adds the hash) so a cached
//      copy is by definition the right copy.
//
//   4. On activate we delete EVERY old cache (not just the ones we know
//      about), which evicts the v3/v4 caches that are currently poisoning
//      production users.
//
//   5. The companion `service-worker-register.tsx` listens for chunk-load
//      errors and force-unregisters this SW + reloads, so users stuck on a
//      genuinely broken bundle can self-heal without manually clearing site
//      data.
// ---------------------------------------------------------------------------

const VERSION = 'v6';
const STATIC_CACHE  = `dermaspace-static-${VERSION}`;
const RUNTIME_CACHE = `dermaspace-runtime-${VERSION}`;
const IMAGE_CACHE   = `dermaspace-images-${VERSION}`;

// Keep this list intentionally tiny. We ONLY precache things that are safe
// to serve forever (icons, manifest, offline fallback). HTML pages are NOT
// precached — see the rationale at the top of this file.
const PRECACHE = [
  '/offline',
  '/manifest.json',
  '/favicon.png',
];

const RUNTIME_CACHE_LIMIT = 60;
const IMAGE_CACHE_LIMIT   = 100;

// ---------------------------------------------------------------------------
// Install — precache the offline shell + manifest. Don't bother trying to
// addAll() pages that might 404 in a particular environment; if any single
// entry fails, addAll() rejects and the SW never installs. Wrap each in an
// individual put() with its own catch so the SW always becomes active.
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => (res.ok ? cache.put(url, res) : null))
            .catch(() => null),
        ),
      );
      // Skip the standard "wait for old controller to release" phase — we
      // want the new SW (with the corrected strategies) to take over the
      // page immediately on next load.
      self.skipWaiting();
    })(),
  );
});

// ---------------------------------------------------------------------------
// Activate — nuke EVERY cache that isn't part of this version. This is the
// kill-switch that gets users out of the v3 cache-poisoning trap. We then
// claim() so the new SW starts handling fetches without requiring a reload.
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  const allow = new Set([STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !allow.has(n)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const limitCache = async (cacheName, maxItems) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  // Eviction is FIFO — the oldest entry was put first, so deleting from the
  // front keeps the cache hot with the most recently requested URLs.
  const overflow = keys.length - maxItems;
  if (overflow > 0) {
    await Promise.all(keys.slice(0, overflow).map((req) => cache.delete(req)));
  }
};

// ---------------------------------------------------------------------------
// Fetch routing
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GETs only — POST/PUT/DELETE go straight to network.
  if (request.method !== 'GET') return;

  // Don't touch cross-origin requests. Letting them pass through avoids
  // accidentally caching analytics beacons, fonts from gstatic, etc.
  if (url.origin !== self.location.origin) return;

  // Chrome dev tools / extensions
  if (url.protocol === 'chrome-extension:') return;

  // -------------------------------------------------------------------------
  // 1. /_next/static/* — content-hashed, immutable. Stale-while-revalidate is
  //    safe AND fast: cache hit serves instantly, network fetch quietly
  //    refreshes for next time. There's no version-mismatch risk because
  //    each filename embeds its content hash.
  // -------------------------------------------------------------------------
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networked = fetch(request)
          .then((res) => {
            if (res && res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networked;
      }),
    );
    return;
  }

  // -------------------------------------------------------------------------
  // 2. API routes — network-only with a JSON 503 fallback when the device is
  //    fully offline. We deliberately do NOT cache API responses: stale
  //    user-state (auth, wallet, bookings) is worse than no response at all.
  // -------------------------------------------------------------------------
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            JSON.stringify({ error: 'offline', message: 'You are offline' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );
    return;
  }

  // -------------------------------------------------------------------------
  // 3. Images — cache-first with a background refresh. Images don't change
  //    semantically the way HTML/JS does, so it's fine to serve a cached
  //    copy and silently update it.
  // -------------------------------------------------------------------------
  if (
    request.destination === 'image' ||
    /\.(png|jpe?g|gif|svg|webp|ico|avif)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              cache.put(request, res.clone());
              limitCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
            }
            return res;
          })
          .catch(() => cached || new Response('', { status: 504 }));
        return cached || refresh;
      }),
    );
    return;
  }

  // -------------------------------------------------------------------------
  // 4. Page navigations — NETWORK-ONLY when reachable, with a fallback to
  //    the precached `/offline` shell when truly offline.
  //
  //    Critical: we do NOT serve a cached HTML response just because the
  //    network is slow. That's exactly the behaviour that was poisoning
  //    production users — a stale cached page from a previous deploy
  //    pointing at chunk hashes that no longer exist, leading to the
  //    bare-browser "Application error" white screen.
  // -------------------------------------------------------------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          return fresh;
        } catch {
          const offline = await caches.match('/offline');
          if (offline) return offline;
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
              '<p style="font-family:system-ui;text-align:center;padding:24px">' +
              "You're offline. Check your connection and try again." +
              '</p>',
            { status: 503, headers: { 'Content-Type': 'text/html' } },
          );
        }
      })(),
    );
    return;
  }

  // -------------------------------------------------------------------------
  // 5. Everything else — runtime cache, network-first with a stale fallback.
  //    This catches things like webfont CSS imports, JSON files, etc.
  // -------------------------------------------------------------------------
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clone);
            limitCache(RUNTIME_CACHE, RUNTIME_CACHE_LIMIT);
          });
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response('', { status: 504 });
      }),
  );
});

// ---------------------------------------------------------------------------
// Push notifications — appointment reminders etc. Unchanged from v3 except
// that we explicitly tag the icons under /icons/ so the network-only fetch
// for icons (handled by the page handler in service-worker-register.tsx)
// never short-circuits this view.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Push notifications — drives appointment reminders, admin replies, voucher
// drops and broadcast announcements. The web-push payload is JSON encoded
// by `lib/push.ts` and looks like:
//
//   { title: string, body?: string, url?: string, tag?: string,
//     icon?: string, badge?: string, image?: string }
//
// `tag` lets duplicate notifications collapse into a single OS card —
// e.g. multiple replies on the same support ticket replace, rather than
// stack, on the lock screen. Falls back to `data.url` so two distinct
// targets never clobber each other.
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Dermaspace', body: event.data.text() };
  }
  const url = data.url || '/';
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dermaspace', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-512x512.webp',
      badge: data.badge || '/icons/icon-512x512.webp',
      image: data.image,
      vibrate: [100, 50, 100],
      tag: data.tag || url,
      renotify: true,
      data: { url },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Dismiss' },
      ],
    }),
  );
});

// Click handler — focus an existing Dermaspace tab when one is already
// open (matches what Slack, Linear and GitHub do). Only opens a brand
// new window when no client is reachable. The matched tab is also
// navigated to the target URL so a click on a "new reply" notification
// always lands on the right page even when the tab was idle on the
// homepage.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        try {
          const u = new URL(client.url);
          if (u.origin === self.location.origin) {
            await client.focus();
            // Only navigate if we're not already on the destination.
            if (u.pathname + u.search !== target) {
              try { await client.navigate(target); } catch { /* cross-origin or unsupported */ }
            }
            return;
          }
        } catch { /* ignore */ }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

// Allow the page-side updater to take over without requiring a manual reload.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
