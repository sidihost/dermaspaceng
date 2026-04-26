// ---------------------------------------------------------------------------
// Dermaspace service worker (v7)
//
// v7 (current) — Offline reliability pass.
//   * Drops the `/offline` precache entry. That route doesn't exist as
//     an `app/offline/page.tsx` (only the inner `offline-content.tsx`
//     client component does), so the install-time fetch was silently
//     404'ing and leaving offline users with no fallback at all.
//   * Adds a fully self-contained, branded `OFFLINE_HTML` string that
//     renders without a single chunk, image, font, stylesheet or
//     network round-trip. This is now the canonical offline shell —
//     served from the navigation handler with `200 OK` (not 503,
//     which some Android browsers replace with their native "no
//     internet" page on refresh — exactly the "breaks to browser"
//     symptom Nigerian users on flaky 4G were reporting).
//   * Bumps caches to `-v7` so v6 contents (which contained the
//     bogus `/offline` 404 cache miss) get evicted on activate.
//
// Why this whole rewrite (originally v5/v6)?
// ------------------------------------------
// The previous SW (v3) cached HTML navigations into `STATIC_CACHE` and, on
// slow networks, served that cached HTML whenever the live request blew its
// 5-second timeout. After every new deploy the Next.js build emits fresh
// `/_next/static/chunks/<hash>.js` filenames — but the cached HTML still
// referenced the OLD hashes. Result: on Nigerian 4G/H+ users were getting a
// stale cached homepage whose chunks 404'd, React failed to bootstrap, and
// the browser fell through to its bare "Application error: a client-side
// exception has occurred" white screen on dermaspaceng.com.
//
// This rewrite fixes that class of bug for good:
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

const VERSION = 'v7';
const STATIC_CACHE  = `dermaspace-static-${VERSION}`;
const RUNTIME_CACHE = `dermaspace-runtime-${VERSION}`;
const IMAGE_CACHE   = `dermaspace-images-${VERSION}`;

// Keep this list intentionally tiny. We ONLY precache things that are safe
// to serve forever (icons, manifest). HTML pages are NOT precached — see
// the rationale at the top of this file.
//
// Note: we used to precache the `/offline` route here, but that file
// doesn't exist as an `app/offline/page.tsx` (only the inner content
// component does), so the precache fetch silently 404'd and left
// users with no offline shell. The branded inline HTML response in
// the navigation fetch handler is now the canonical offline fallback
// — it has zero external dependencies (no chunks, no CSS bundles)
// and therefore renders even on a brand-new install or when the
// chunk cache is empty.
const PRECACHE = [
  '/manifest.json',
  '/favicon.png',
];

const RUNTIME_CACHE_LIMIT = 60;
const IMAGE_CACHE_LIMIT   = 100;

// ---------------------------------------------------------------------------
// Self-contained offline page.
//
// Inlined directly into the SW so it can be served instantly from the
// `fetch` handler with zero dependencies on the React app, the chunk
// cache, an external stylesheet, or the network. It must render on a
// device that has literally just installed the SW for the first time.
//
// Brand colour (#7B2D8E) and base styles are kept tight on purpose —
// every byte ships with the service worker on every install.
// ---------------------------------------------------------------------------
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#7B2D8E">
  <title>You're offline · Dermaspace</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    html,body{margin:0;padding:0;height:100%;background:#faf7fb;color:#1a0d1f;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
    body{display:flex;align-items:center;justify-content:center;padding:24px}
    .card{width:100%;max-width:380px;background:#fff;border-radius:24px;border:1px solid rgba(123,45,142,.08);box-shadow:0 12px 40px rgba(123,45,142,.12);overflow:hidden;text-align:center}
    .strip{height:4px;background:#7B2D8E}
    .body{padding:28px 24px 24px}
    .icon{width:56px;height:56px;border-radius:16px;background:rgba(123,45,142,.1);color:#7B2D8E;display:flex;align-items:center;justify-content:center;margin:0 auto 18px}
    .icon svg{width:26px;height:26px}
    h1{font-size:20px;line-height:1.25;margin:0 0 8px;font-weight:700;letter-spacing:-.01em}
    p{margin:0;color:#5a4a60;font-size:14px;line-height:1.55}
    .actions{display:grid;gap:10px;margin-top:22px}
    .btn{appearance:none;border:0;cursor:pointer;font:inherit;font-weight:600;font-size:14px;padding:11px 18px;border-radius:999px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background-color .15s ease,color .15s ease}
    .btn-primary{background:#7B2D8E;color:#fff}
    .btn-primary:hover{background:#6B2D7E}
    .btn-secondary{background:#fff;color:#1a0d1f;border:1px solid #ececec}
    .btn-secondary:hover{background:#faf7fb}
    .meta{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:16px;font-size:12px;color:#7a6b80}
    .dot{width:8px;height:8px;border-radius:50%;background:#c0392b;display:inline-block}
    .dot.online{background:#27ae60}
    .help{margin-top:18px;padding-top:18px;border-top:1px solid #f1ecf3;font-size:12px;color:#7a6b80}
    .help a{color:#7B2D8E;font-weight:600;text-decoration:none}
    .help a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <main class="card" role="main">
    <div class="strip" aria-hidden="true"></div>
    <div class="body">
      <div class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
      </div>
      <h1>You&apos;re offline</h1>
      <p id="msg">Looks like you&apos;ve lost your internet connection. We&apos;ll bring you straight back to Dermaspace as soon as you&apos;re reconnected.</p>
      <div class="actions">
        <button class="btn btn-primary" id="retry" type="button">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Try again
        </button>
        <a class="btn btn-secondary" href="/">Go to homepage</a>
      </div>
      <div class="meta" aria-live="polite">
        <span class="dot" id="dot"></span>
        <span id="status">Waiting for connection&hellip;</span>
      </div>
      <div class="help">
        Need us urgently? <a href="tel:+2349017972919">+234 901 797 2919</a>
      </div>
    </div>
  </main>
  <script>
    (function(){
      var dot = document.getElementById('dot');
      var status = document.getElementById('status');
      var retry = document.getElementById('retry');
      function paint(online){
        if (online) {
          dot.classList.add('online');
          status.textContent = 'Back online — tap Try again';
        } else {
          dot.classList.remove('online');
          status.textContent = 'Waiting for connection…';
        }
      }
      paint(navigator.onLine);
      window.addEventListener('online', function(){
        paint(true);
        // Auto-reload as soon as we're back, but only if the user
        // hasn't already navigated elsewhere.
        setTimeout(function(){ location.reload(); }, 600);
      });
      window.addEventListener('offline', function(){ paint(false); });
      retry.addEventListener('click', function(){
        if (navigator.onLine) {
          location.reload();
        } else {
          // Provide a tiny bit of feedback so users on flaky 4G don't
          // think the button is dead.
          status.textContent = 'Still offline — we\\'ll retry as soon as you\\'re back';
        }
      });
    })();
  </script>
</body>
</html>`;

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
          // Branded, fully self-contained offline shell.
          //
          // Why inline?
          //  - The /_next/static chunks the React-rendered /offline route
          //    would need are not guaranteed to be cached on the device
          //    (especially on first install or after a cache wipe), so
          //    relying on the React app to render the offline page is
          //    fragile. This HTML has zero external dependencies — no
          //    chunks, no CSS bundles, no fonts, no images that the
          //    browser has to fetch — so it renders even on a stone-
          //    cold device that has only ever loaded the SW itself.
          //
          //  - Status 200 (not 503). Some Android browsers replace any
          //    5xx response served from a SW with their own native
          //    "no internet" page on a refresh, which is exactly the
          //    "breaks to browser" behaviour Nigerian users were
          //    reporting on slow 4G. 200 keeps our shell on screen.
          //
          //  - The retry button doesn't unconditionally `location.reload()`;
          //    it waits for `online` first when the device is still
          //    offline so the user can mash it without burning through
          //    failed reload attempts.
          return new Response(OFFLINE_HTML, {
            status: 200,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              // Tell the browser this response is itself ephemeral — when
              // connectivity returns, a fresh navigation should hit the
              // network, not re-serve this fallback.
              'Cache-Control': 'no-store',
            },
          });
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
