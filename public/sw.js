// ---------------------------------------------------------------------------
// Dermaspace service worker (v15)
//
// v15 (current) — Cache-bust to evict stale recommendation assets.
//   A previous deploy briefly shipped illustrated recommendation covers
//   (served from `/images/recommendations/*.png`) plus the API/HTML that
//   referenced them. That change was reverted in code — the rail is back
//   to the original photography — but real devices kept showing the old
//   illustrations because the v14 IMAGE_CACHE / PAGES_CACHE were still
//   handing out the cached illustration bytes and markup offline-first,
//   and a normal browser "clear cache" doesn't evict a service worker's
//   Cache Storage. Bumping the version to v15 makes `activate` delete
//   every non-v15 cache, so the next load fetches the reverted, photo-
//   based rail fresh. No behavioural changes beyond the version bump.
//
// v14 — Make cached pages actually show up offline AND on poor
//   connections. Two real-world bugs were defeating the page cache:
//
//     1. Query-string cache misses. Pages are stored keyed by their full
//        URL (path + search), but the PWA launches at `/?source=pwa`
//        while install only seeds `/`. `cache.match()` does EXACT URL
//        matching by default, so `/?source=pwa`, `/services?ref=...`,
//        any UTM-tagged or PWA-launch URL missed the cache entirely and
//        fell straight through to the OFFLINE_HTML shell — even though
//        the page was sitting in PAGES_CACHE under a slightly different
//        key. The offline lookup now falls back to `ignoreSearch: true`
//        so a cached page is served regardless of the query string.
//
//     2. No slow-network fallback. Navigations were strictly
//        network-first with no timeout, so a user on a flaky/poor
//        connection (Nigerian 4G/H+ that connects but crawls) sat
//        staring at a hanging tab while the SW waited indefinitely for
//        the network before ever consulting the cache. v14 races the
//        network against a short timeout: if we already have the page
//        cached and the network is too slow, we serve the cached copy
//        INSTANTLY and refresh it in the background. Truly online users
//        with a healthy connection still get the fresh network response.
//
//   Cache version bumped to v14 so v13 entries auto-evict on activate.
//
// v13 — Wire up `CACHE_NAVIGATION`, `CACHE_URLS`, and
//   `EVICT_PAGE` message handlers so client-side route changes (and
//   any bookmark-style "save for offline" UI) actually populate
//   PAGES_CACHE. Before this, `service-worker-register.tsx` was
//   already posting `CACHE_NAVIGATION` on every pathname change but
//   the SW silently dropped the message — only `SKIP_WAITING` was
//   being handled. Net effect: pages reached via Next.js client
//   routing (the bulk of the user journey) were never cached, so
//   "pages I just visited don't work offline" was the persistent
//   user complaint. Cache version bumped to v13 so v12 entries
//   auto-evict.
//
// v12 (skipped — internal) — Cache version bump only.
//
// v11 — Make the site reachable offline from a cold install.
//   * The team flagged "the site doesn't work offline" — root cause was
//     that PAGES_CACHE only fills as a user visits pages while online.
//     A user who installs the PWA and immediately loses signal had
//     nothing in PAGES_CACHE, so every navigation fell through to the
//     OFFLINE_HTML shell. This update precaches "/" on install so the
//     homepage is available offline from the very first launch — and
//     once the homepage is in cache, every internal link the user has
//     since visited is reachable through the cached navigation.
//   * Tightened the OFFLINE_HTML shell to match the site's spacing
//     and type scale. No layout / behaviour changes — just visual
//     polish for parity with /offline and /maintenance.
//   * Bumps caches to `-v11` so v10 entries auto-evict on activate.
//
// v10 — Real offline support is back.
//   * v9 dropped page caching at the team's request, but the practical
//     effect on real Nigerian devices was bad: every refresh while on
//     a flaky 4G/H+ tower fell straight through to the inline OFFLINE
//     shell, even on pages the user had just been reading. The team
//     pinged us with a screenshot of the homepage offline shell on a
//     URL they'd opened minutes earlier — which is exactly the offline
//     experience we should have already cached.
//   * v10 reintroduces the v8 PAGES_CACHE on a stricter contract that
//     never serves stale HTML when the network is reachable:
//       - Navigations are NETWORK-FIRST (online users always get a
//         fresh response — no chunk-version drift).
//       - On success, the response is cloned into PAGES_CACHE keyed by
//         the URL, with a `sw-cached-at` header stamped onto it.
//       - On a hard network failure (truly offline), we look up the
//         same URL in PAGES_CACHE. Hit → serve. Miss → OFFLINE_HTML
//         shell, exactly like v9.
//   * Stale-bundle safety: `service-worker-register.tsx` listens for
//     chunk-load errors and force-unregisters this SW + wipes every
//     cache + reloads, so even if a cached HTML response references
//     deleted chunks, the user self-heals automatically.
//   * `HTML_MAX_AGE_MS` caps how long a cached page can be served
//     offline. 7 days is plenty for "I lost signal mid-read" without
//     letting the cache fossilise indefinitely.
//   * Bumps caches to `-v10` so v9 entries auto-evict on activate.
//
// v9 — Page caching reverted (offline shell only). [Reverted in v10.]
// v8 — Page caching introduced. [Reverted in v9, restored in v10.]
// v7 — Inline OFFLINE_HTML shell, no chunk dependencies.
// v3-v6 — Earlier iterations; see git history.
//
// The big-picture rationale:
//
//   1. Navigations are NETWORK-FIRST when reachable. We never serve
//      stale HTML to an online user — fresh HTML is the only way to
//      guarantee its chunk references match what's actually deployed.
//
//   2. Successful navigations are cloned into PAGES_CACHE so the user
//      can re-open them offline.
//
//   3. Offline navigations: cached HTML if we have it (and it's not
//      older than HTML_MAX_AGE_MS), else the inline OFFLINE_HTML
//      shell.
//
//   4. Hashed `/_next/static/*` assets are stale-while-revalidate.
//      Filenames are content-addressed (Next adds the hash) so a
//      cached copy is by definition the right copy.
//
//   5. On activate we delete EVERY old cache (not just the ones we
//      know about) so v9 entries from the previous deploy go away.
//
//   6. The companion `service-worker-register.tsx` listens for chunk-
//      load errors and force-unregisters this SW + reloads, so users
//      stuck on a genuinely broken bundle can self-heal without
//      manually clearing site data.
// ---------------------------------------------------------------------------

const VERSION = 'v15';
const STATIC_CACHE  = `dermaspace-static-${VERSION}`;
const RUNTIME_CACHE = `dermaspace-runtime-${VERSION}`;
const IMAGE_CACHE   = `dermaspace-images-${VERSION}`;
const PAGES_CACHE   = `dermaspace-pages-${VERSION}`;

// Keep this list intentionally tiny. We ONLY precache things that are safe
// to serve forever (icons, manifest). HTML pages are NOT precached this way —
// they're populated as users visit them (see the navigation handler).
const PRECACHE = [
  '/manifest.json',
  '/favicon.png',
];

// Routes we want available offline immediately after install, even before
// the user has manually visited them. These are precached separately into
// PAGES_CACHE (with the same `sw-cached-at` stamp the navigation handler
// writes) so the existing offline lookup path serves them transparently.
// Keep this list to entry points that make sense as a "I'm offline, drop
// me somewhere I can keep using the site" landing — the homepage is the
// only universally-correct answer here.
const PRECACHE_PAGES = [
  '/',
  // The desktop install centre is a top-tier landing page now —
  // visitors arriving on `/desktop` (or anyone who hits the "install
  // app" button while their network drops) should always get a
  // working page, even from a cold install.
  '/desktop',
];

const RUNTIME_CACHE_LIMIT = 60;
const IMAGE_CACHE_LIMIT   = 100;
const PAGES_CACHE_LIMIT   = 40;
// Cached HTML older than this is considered stale and falls through to
// the OFFLINE_HTML shell rather than being served. Picks a friendly
// middle ground: long enough to cover "I lost data on the train and
// want to keep reading the same article" but short enough that we
// don't hand out a week-old layout if the SW somehow misses an update.
const HTML_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// How long to wait for the network on a page navigation before falling
// back to a cached copy (when we have one). This is the lever that makes
// the site usable on poor/crawling connections rather than only when
// fully offline: a healthy connection answers well under this budget and
// still gets the fresh page, while a stalled request serves the cached
// page instantly and refreshes it in the background.
const NAV_NETWORK_TIMEOUT_MS = 4000;

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
    body{display:flex;align-items:center;justify-content:center;padding:20px;min-height:100svh}
    .card{width:100%;max-width:360px;background:#fff;border-radius:20px;border:1px solid rgba(0,0,0,.05);box-shadow:0 10px 30px -12px rgba(123,45,142,.18);overflow:hidden;text-align:center}
    .strip{height:3px;background:#7B2D8E}
    .body{padding:24px 22px 22px}
    .icon{width:44px;height:44px;border-radius:12px;background:rgba(123,45,142,.1);color:#7B2D8E;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
    .icon svg{width:22px;height:22px}
    h1{font-size:18px;line-height:1.25;margin:0 0 6px;font-weight:600;letter-spacing:-.01em;color:#1a0d1f}
    p{margin:0;color:#5a4a60;font-size:13.5px;line-height:1.55}
    .actions{display:grid;gap:8px;margin-top:18px}
    .btn{appearance:none;border:0;cursor:pointer;font:inherit;font-weight:600;font-size:13.5px;padding:10px 16px;border-radius:999px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:background-color .15s ease,color .15s ease,border-color .15s ease}
    .btn-primary{background:#7B2D8E;color:#fff}
    .btn-primary:hover{background:#6B2D7E}
    .btn-secondary{background:#fff;color:#1a0d1f;border:1px solid #e8e4ec}
    .btn-secondary:hover{border-color:rgba(123,45,142,.25);color:#7B2D8E}
    .meta{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:14px;font-size:11.5px;color:#8a7a90}
    .dot{width:6px;height:6px;border-radius:50%;background:#c0392b;display:inline-block}
    .dot.online{background:#27ae60}
    .help{margin-top:14px;padding-top:14px;border-top:1px solid #f1ecf3;font-size:11.5px;color:#8a7a90}
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
      <p id="msg">Some access might be limited until you&apos;re reconnected. Pages you&apos;ve already visited will keep working.</p>
      <div class="actions">
        <button class="btn btn-primary" id="retry" type="button">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Try again
        </button>
        <a class="btn btn-secondary" href="/">Continue to homepage</a>
      </div>
      <div class="meta" aria-live="polite">
        <span class="dot" id="dot"></span>
        <span id="status">Waiting for connection&hellip;</span>
      </div>
      <div class="help">
        Need us urgently? <a href="tel:+2349061836625">+234 906 183 6625</a>
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
      // Static assets (manifest, icons) — safe to serve forever.
      const staticCache = await caches.open(STATIC_CACHE);
      await Promise.all(
        PRECACHE.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => (res.ok ? staticCache.put(url, res) : null))
            .catch(() => null),
        ),
      );

      // Seed PAGES_CACHE with the entry routes from PRECACHE_PAGES so
      // the homepage (and any other landing routes) are reachable
      // offline from the very first launch — without this, a fresh
      // install + lost signal hits the inline OFFLINE_HTML shell on
      // every navigation. We deliberately use the same stamp + put
      // the navigation handler uses, so cache lookups in the fetch
      // routing don't need to special-case precached entries.
      await Promise.all(
        PRECACHE_PAGES.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'reload' });
            if (res && res.ok && res.status === 200) {
              await stampAndCache(PAGES_CACHE, new Request(url), res);
            }
          } catch {
            /* offline at install time — nothing to seed, the user will
               populate PAGES_CACHE on their next online navigation */
          }
        }),
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
// kill-switch that gets users out of any earlier cache-poisoning trap. We
// then claim() so the new SW starts handling fetches without requiring a
// reload.
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  const allow = new Set([STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE, PAGES_CACHE]);
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

// Stamp a fresh response with the time it was cached so we can age it
// out later. We can't trust the upstream `Date` header (it might be
// missing on Next.js routes) and we don't want to rely on the entry's
// `lastModified` because some browsers don't expose it.
const stampAndCache = async (cacheName, request, response) => {
  const cache = await caches.open(cacheName);
  // Build a fresh Response with our extra header without consuming the
  // original — the caller still needs to send `response` to the page.
  const cloned = response.clone();
  const buf = await cloned.arrayBuffer();
  const headers = new Headers(cloned.headers);
  headers.set('sw-cached-at', String(Date.now()));
  const stored = new Response(buf, {
    status: cloned.status,
    statusText: cloned.statusText,
    headers,
  });
  await cache.put(request, stored);
};

const isFreshEnough = (cachedResponse, maxAgeMs) => {
  if (!cachedResponse) return false;
  const stamp = cachedResponse.headers.get('sw-cached-at');
  if (!stamp) {
    // Older entry without our stamp — treat as stale to be safe. The
    // next online navigation will overwrite it with a stamped copy.
    return false;
  }
  const cachedAt = Number(stamp);
  if (!Number.isFinite(cachedAt)) return false;
  return Date.now() - cachedAt < maxAgeMs;
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
  // 4. Page navigations — NETWORK-FIRST. On success we mirror the
  //    response into PAGES_CACHE so the user can re-open the same URL
  //    offline. On hard network failure we serve the cached copy if we
  //    have one (and it isn't older than HTML_MAX_AGE_MS); otherwise
  //    we fall back to the inline OFFLINE_HTML shell.
  //
  //    Online users NEVER see a stale page — we always try the network
  //    first and only consult the cache when fetch() rejects.
  // -------------------------------------------------------------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        // Look up a cached copy of this page. Try an exact URL match
        // first, then retry ignoring the query string — this is what
        // rescues `/?source=pwa`, UTM-tagged links, and any page the
        // user reaches with slightly different search params from the
        // copy we cached. Without the `ignoreSearch` fallback those
        // navigations missed the cache and dropped to the offline
        // shell even though the page was sitting in PAGES_CACHE.
        const lookupCachedPage = async () => {
          const cache = await caches.open(PAGES_CACHE);
          let cached = await cache.match(request);
          if (!cached) {
            cached = await cache.match(request, { ignoreSearch: true });
          }
          return cached;
        };

        // Kick off the network request. On success we mirror the
        // response into PAGES_CACHE for offline replay. We deliberately
        // only cache 200s — caching a 4xx/5xx would mean the user
        // re-opens the page offline and sees an error page they
        // shouldn't be persisting.
        const networkPromise = fetch(request).then((fresh) => {
          if (fresh && fresh.ok && fresh.status === 200) {
            stampAndCache(PAGES_CACHE, request, fresh.clone())
              .then(() => limitCache(PAGES_CACHE, PAGES_CACHE_LIMIT))
              .catch(() => {});
          }
          return fresh;
        });

        // Race the network against a short timeout. A healthy
        // connection resolves well within the budget and the user gets
        // the fresh page. A stalled/crawling connection trips the
        // timeout so we can serve a cached copy instantly instead of
        // leaving the user staring at a hanging tab.
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('nav-network-timeout')),
            NAV_NETWORK_TIMEOUT_MS,
          );
        });

        try {
          const fresh = await Promise.race([networkPromise, timeoutPromise]);
          clearTimeout(timeoutId);
          return fresh;
        } catch {
          clearTimeout(timeoutId);
          // Either the network failed outright (truly offline) or it
          // was too slow (poor connection). Prefer a cached page.
          const cached = await lookupCachedPage();
          if (cached && isFreshEnough(cached, HTML_MAX_AGE_MS)) {
            // Let the in-flight request keep going so the cache is
            // fresh next time, but don't make the user wait on it.
            event.waitUntil(networkPromise.catch(() => {}));
            return cached;
          }
          // No usable cache. If the failure was just a timeout the
          // request may still be in flight and succeed — wait for it
          // rather than prematurely showing the offline shell.
          try {
            return await networkPromise;
          } catch {
            // Last-resort offline shell — branded, fully self-contained,
            // zero chunk/CSS/font deps. Status 200 (not 503) because
            // some Android browsers replace 5xx responses served from
            // a SW with their own native "no internet" page on
            // refresh, which is exactly the "breaks to browser"
            // symptom we were debugging.
            return new Response(OFFLINE_HTML, {
              status: 200,
              headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store',
              },
            });
          }
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

// ---------------------------------------------------------------------------
// Notification click — focus an existing tab on the target URL if one is
// already open; otherwise open a new one. Same UX as the native push apps.
// ---------------------------------------------------------------------------
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of all) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.pathname === new URL(url, self.location.origin).pathname) {
            await client.focus();
            return;
          }
        } catch {
          /* ignore malformed client URLs */
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

// ---------------------------------------------------------------------------
// Client → SW messaging
//
// Three message types matter today:
//
//   1. SKIP_WAITING — `service-worker-register.tsx` posts this when the
//      user clicks "Update Now" on the in-page update banner. Forces
//      the new SW to take over without requiring the user to close
//      every tab first.
//
//   2. CACHE_NAVIGATION — the register posts this on every Next.js
//      client-side route change with `{ url: '/path?qs' }`. The SW's
//      navigation `fetch` handler only ever sees full-page reloads
//      (`request.mode === 'navigate'`), so without this, in-app link
//      clicks NEVER landed in PAGES_CACHE and the user got the inline
//      OFFLINE_HTML shell on any page they reached via the router.
//      That's the exact symptom the team kept flagging: "I was just on
//      this page online and now I'm offline and it doesn't work".
//
//      Implementation: fetch the URL same-origin with `cache: 'reload'`
//      so we always get a fresh server-rendered HTML, then mirror the
//      response into PAGES_CACHE using the same stamping helper the
//      navigation handler uses. The cache lookup path doesn't need to
//      special-case these entries.
//
//   3. CACHE_URLS — bulk variant for code that wants to explicitly
//      precache a known set of pages (e.g. on /dashboard mount we can
//      tell the SW "warm /dashboard/wallet, /dashboard/bookings,
//      /dashboard/transactions" so they're reachable offline even if
//      the user hasn't tapped them yet). Body shape:
//        { type: 'CACHE_URLS', urls: string[] }
//      Same per-URL semantics as CACHE_NAVIGATION; failures are
//      swallowed so a single bad URL doesn't poison the batch.
//
//   4. EVICT_PAGE — symmetric "I no longer want this saved offline"
//      hook for any future bookmark-style UI (e.g. an unsave button on
//      a saved-articles list). Removes a single URL from PAGES_CACHE.
// ---------------------------------------------------------------------------

const cacheUrlForOfflineNav = async (rawUrl) => {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return;
  let resolved;
  try {
    resolved = new URL(rawUrl, self.location.origin);
  } catch {
    return; // malformed input — bail quietly
  }
  // Don't waste cache on things the navigation handler would skip
  // anyway. /api/* responses aren't cached (auth/wallet state is too
  // sensitive to serve stale) and /_next/* is handled by the static
  // strategy, not PAGES_CACHE.
  if (resolved.origin !== self.location.origin) return;
  if (
    resolved.pathname.startsWith('/api/') ||
    resolved.pathname.startsWith('/_next/')
  ) {
    return;
  }
  try {
    // `cache: 'reload'` skips the HTTP cache so we get the freshest
    // server-rendered HTML — important because a stale browser-cache
    // hit would be useless for offline replay (it'd be a redirect or
    // a 304 with no body).
    const res = await fetch(resolved.toString(), {
      cache: 'reload',
      credentials: 'same-origin',
    });
    if (res && res.ok && res.status === 200) {
      // Use a same-origin Request keyed by the URL so the cache
      // lookup in the navigation handler matches it cleanly.
      await stampAndCache(PAGES_CACHE, new Request(resolved.toString()), res);
      await limitCache(PAGES_CACHE, PAGES_CACHE_LIMIT);
    }
  } catch {
    // Best-effort — if the user is currently offline or hits a 5xx,
    // we just don't cache. The navigation path will populate
    // PAGES_CACHE next time they reach the URL via a hard nav.
  }
};

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'CACHE_NAVIGATION') {
    // Fire-and-forget; we don't keep the message channel open. The
    // client doesn't wait on a response either — it just wants to
    // tell the SW "hey, I'm now on this URL".
    event.waitUntil(cacheUrlForOfflineNav(data.url));
    return;
  }

  if (data.type === 'CACHE_URLS') {
    const urls = Array.isArray(data.urls) ? data.urls : [];
    event.waitUntil(
      Promise.all(urls.map((u) => cacheUrlForOfflineNav(u))),
    );
    return;
  }

  if (data.type === 'EVICT_PAGE') {
    if (typeof data.url !== 'string') return;
    let resolved;
    try {
      resolved = new URL(data.url, self.location.origin);
    } catch {
      return;
    }
    event.waitUntil(
      caches.open(PAGES_CACHE).then((cache) =>
        cache.delete(new Request(resolved.toString())).catch(() => {}),
      ),
    );
    return;
  }
});
