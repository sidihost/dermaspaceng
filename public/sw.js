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

const VERSION = 'v23';
const STATIC_CACHE  = `dermaspace-static-${VERSION}`;
const RUNTIME_CACHE = `dermaspace-runtime-${VERSION}`;
const IMAGE_CACHE   = `dermaspace-images-${VERSION}`;
const PAGES_CACHE   = `dermaspace-pages-${VERSION}`;
const RSC_CACHE     = `dermaspace-rsc-${VERSION}`;

// Keep this list intentionally tiny. We ONLY precache things that are safe
// to serve forever (icons, manifest). HTML pages are NOT precached this way —
// they're populated as users visit them (see the navigation handler).
const PRECACHE = [
  '/manifest.json',
  '/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/images/dermaspace-logo.png',
];

// Routes we want available offline immediately after install, even before
// the user has manually visited them. These are precached separately into
// PAGES_CACHE (with the same `sw-cached-at` stamp the navigation handler
// writes) so the existing offline lookup path serves them transparently.
const PRECACHE_PAGES = [
  '/',
  '/offline',
  '/services',
  '/gift-cards',
  '/contact',
  '/desktop',
];

const RUNTIME_CACHE_LIMIT = 60;
const IMAGE_CACHE_LIMIT   = 100;
const PAGES_CACHE_LIMIT   = 50;
const RSC_CACHE_LIMIT     = 80;
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
// Brand colour (#7B2D8E) and flat border styles match SystemStatusCard.
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
    html,body{margin:0;padding:0;background:#FAF6FB;color:#1A0D1F;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
    .wrap{min-height:100svh;display:flex;align-items:center;justify-content:center;padding:16px}
    .card{width:100%;max-width:460px;background:#fff;border-radius:16px;border:1px solid #E5E0EA;overflow:hidden}
    .strip{height:3px;background:#7B2D8E}
    .body{padding:20px}
    .top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:14px;border-bottom:1px solid #F3F4F6}
    .brand{display:inline-flex;align-items:center;gap:8px;min-width:0}
    .brand-mark{width:28px;height:28px;border-radius:8px;background:rgba(123,45,142,.1);color:#7B2D8E;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
    .brand-name{font-size:14px;font-weight:600;color:#111827;letter-spacing:-.01em}
    .tag{font-size:12px;font-weight:500;color:#6B7280;white-space:nowrap}
    .hero{padding-top:16px;text-align:center}
    .icon{width:40px;height:40px;border-radius:12px;background:rgba(123,45,142,.1);color:#7B2D8E;display:flex;align-items:center;justify-content:center;margin:0 auto}
    .icon svg{width:20px;height:20px}
    h1{font-size:18px;line-height:1.25;margin:12px 0 0;font-weight:600;letter-spacing:-.01em;color:#111827}
    p{margin:6px auto 0;max-width:360px;color:#4B5563;font-size:13px;line-height:1.45}
    .status{margin:8px 0 0;font-size:12px;font-weight:500;color:#6B7280}
    .status.online{color:#047857}
    .actions{margin-top:16px;display:grid;grid-template-columns:1fr;gap:10px}
    .btn{appearance:none;width:100%;min-height:42px;border:1px solid transparent;cursor:pointer;font:inherit;font-weight:600;font-size:13px;padding:8px 16px;border-radius:999px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:background-color .15s ease,color .15s ease,border-color .15s ease}
    .btn-primary{background:#7B2D8E;border-color:#7B2D8E;color:#fff}
    .btn-primary:hover{background:#5A1D6A;border-color:#5A1D6A}
    .btn-secondary{background:#fff;color:#1F2937;border-color:#E5E0EA}
    .btn-secondary:hover{border-color:rgba(123,45,142,.4);color:#7B2D8E}
    .quick{margin-top:14px;text-align:center;font-size:12px;color:#6B7280;line-height:1.5}
    .quick a{color:#7B2D8E;font-weight:500;text-decoration:none}
    .quick a:hover{text-decoration:underline}
    .sep{margin:0 6px;color:#9CA3AF}
    .foot{margin-top:16px;padding-top:14px;border-top:1px solid #F3F4F6}
    .branches{display:grid;grid-template-columns:1fr;gap:10px;text-align:center}
    .branch-tile{border-radius:12px;background:#FAF6FB;border:1px solid rgba(229,224,234,.7);padding:8px 12px}
    .branch-name{margin:0;font-size:11px;font-weight:600;color:#111827}
    .link{display:inline-flex;align-items:center;gap:4px;margin-top:2px;font-size:11px;font-weight:600;color:#7B2D8E;text-decoration:none;white-space:nowrap}
    .link:hover{text-decoration:underline}
    .email-row{margin-top:10px;display:flex;justify-content:center}
    .email{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:500;color:#6B7280;text-decoration:none;word-break:break-all}
    .email:hover{color:#7B2D8E;text-decoration:underline}
    @media (min-width:360px){
      .actions{grid-template-columns:1fr 1fr}
      .branches{grid-template-columns:1fr 1fr;text-align:left}
    }
    @media (min-width:520px){
      .wrap{padding:24px}
      .body{padding:24px}
      h1{font-size:20px}
      p{font-size:14px}
    }
  </style>
</head>
<body>
  <main class="wrap" role="main">
    <div class="card">
      <div class="strip" aria-hidden="true"></div>
      <div class="body">
        <div class="top">
          <div class="brand">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 10.5C9.5 6 4 4.5 2.5 8c-1.2 2.8.8 6.5 4.5 7.5-2.5 1.2-3.5 4-2 6 1.5 2 4.5 1.2 6-1.5.5-.9.8-2 1-3 .2 1 .5 2.1 1 3 1.5 2.7 4.5 3.5 6 1.5 1.5-2 .5-4.8-2-6 3.7-1 5.7-4.7 4.5-7.5C20 4.5 14.5 6 12 10.5z"/></svg>
            </span>
            <span class="brand-name">Dermaspace</span>
          </div>
          <span class="tag">Connection lost</span>
        </div>

        <div class="hero">
          <div class="icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/><line x1="12" y1="20" x2="12.01" y2="20"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
          </div>
          <h1>You&apos;re offline</h1>
          <p id="msg">Your connection dropped. Pages you&apos;ve already visited still work offline.</p>
          <p class="status" id="status" role="status" aria-live="polite">Waiting for internet connection&hellip;</p>
        </div>

        <div class="actions">
          <button class="btn btn-primary" id="retry" type="button">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Try again
          </button>
          <a class="btn btn-secondary" href="/">Back to Home</a>
        </div>

        <div class="quick">
          <span>Available offline: </span>
          <a href="/services">Services</a><span class="sep" aria-hidden="true">&middot;</span><a href="/gift-cards">Gift Cards</a><span class="sep" aria-hidden="true">&middot;</span><a href="/contact">Contact</a>
        </div>

        <div class="foot">
          <div class="branches">
            <div class="branch-tile" title="237B Muri Okunola St, VI">
              <p class="branch-name">Victoria Island</p>
              <a class="link" href="tel:+2349061836625">+234 906 183 6625</a>
            </div>
            <div class="branch-tile" title="9 Agbeke Rotinwa Cl, Dolphin Estate">
              <p class="branch-name">Ikoyi</p>
              <a class="link" href="tel:+2349013134945">+234 901 313 4945</a>
            </div>
          </div>
          <div class="email-row">
            <a class="email" href="mailto:info@dermaspaceng.com">info@dermaspaceng.com</a>
          </div>
        </div>
      </div>
    </div>
  </main>
  <script>
    (function(){
      var status = document.getElementById('status');
      var retry = document.getElementById('retry');
      function paint(online){
        if (online) {
          status.classList.add('online');
          status.textContent = 'Connection restored — reloading…';
        } else {
          status.classList.remove('online');
          status.textContent = 'Waiting for internet connection…';
        }
      }
      paint(navigator.onLine);
      window.addEventListener('online', function(){
        paint(true);
        setTimeout(function(){ location.reload(); }, 600);
      });
      window.addEventListener('offline', function(){ paint(false); });
      retry.addEventListener('click', function(){
        if (navigator.onLine) {
          location.reload();
        } else {
          status.textContent = 'Still offline — we\\'ll reload automatically once you reconnect.';
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
            const absUrl = new URL(url, self.location.origin).toString();
            const res = await fetch(absUrl, { cache: 'reload' });
            if (isCacheableResponse(res, 'html')) {
              await stampAndCache(PAGES_CACHE, new Request(absUrl), res);
            }
          } catch {
            /* offline at install time */
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
  const allow = new Set([STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE, PAGES_CACHE, RSC_CACHE]);
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

const isRscRequest = (request, url) => {
  if (request.headers.get('RSC') === '1') return true;
  return url.searchParams.has('_rsc');
};

const normalizePageOrRscUrl = (rawUrl) => {
  const u = new URL(rawUrl, self.location.origin);
  u.searchParams.delete('_rsc');
  u.hash = '';
  return u.toString();
};

const isCacheableResponse = (res, expectedKind) => {
  if (!res || !res.ok || res.status !== 200 || res.redirected) return false;
  const ct = (res.headers.get('Content-Type') || '').toLowerCase();
  if (expectedKind === 'html') return ct.includes('text/html');
  if (expectedKind === 'rsc') return ct.includes('text/x-component');
  return true;
};

const warmStaticAssetsFromText = async (bodyText) => {
  if (!bodyText) return;
  const matches = bodyText.match(
    /\/_next\/static\/[^\s"'<>\\)]+\.(?:js|css)(?:\?[^\s"'<>\\)]*)?/g,
  );
  if (!matches || matches.length === 0) return;
  const uniqueUrls = Array.from(
    new Set(
      matches
        .map((path) => {
          try {
            const u = new URL(path, self.location.origin);
            return u.origin === self.location.origin ? u.toString() : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    ),
  );
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.all(
    uniqueUrls.map(async (assetUrl) => {
      try {
        const existing = await staticCache.match(assetUrl, { ignoreVary: true });
        if (existing) return;
        const res = await fetch(assetUrl, { credentials: 'same-origin' });
        if (res && res.ok && res.status === 200) {
          await staticCache.put(assetUrl, res);
        }
      } catch {
        /* ignore offline or transient asset errors */
      }
    }),
  );
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
        const cached = await cache.match(request, { ignoreVary: true });
        const networked = fetch(request)
          .then((res) => {
            if (res && res.ok && res.status === 200) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached || new Response('', { status: 504 }));
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
  // 3. Images — true cache-first. Avoid firing a redundant network request
  //    whenever we already have a cached copy so page transitions and repeat
  //    renders do not saturate connections re-downloading identical images.
  // -------------------------------------------------------------------------
  if (
    request.destination === 'image' ||
    /\.(png|jpe?g|gif|svg|webp|ico|avif)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        try {
          const res = await fetch(request);
          if (res && (res.ok || res.type === 'opaque')) {
            cache.put(request, res.clone());
            limitCache(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
          }
          return res;
        } catch {
          return new Response('', { status: 504 });
        }
      }),
    );
    return;
  }

  // -------------------------------------------------------------------------
  // 3.5. Next.js App Router RSC payloads (<Link> client navigations)
  //      Keyed by normalized URL (stripping ephemeral `?_rsc=` hash) and matched
  //      with `{ ignoreVary: true }` so offline in-app <Link> clicks succeed!
  // -------------------------------------------------------------------------
  if (isRscRequest(request, url)) {
    event.respondWith(
      (async () => {
        const normalizedKey = new Request(normalizePageOrRscUrl(request.url));
        const lookupCachedRsc = async () => {
          const cache = await caches.open(RSC_CACHE);
          let cached = await cache.match(normalizedKey, { ignoreVary: true });
          if (!cached) {
            cached = await cache.match(normalizedKey, {
              ignoreSearch: true,
              ignoreVary: true,
            });
          }
          return cached;
        };

        const networkPromise = fetch(request).then((fresh) => {
          if (isCacheableResponse(fresh, 'rsc')) {
            stampAndCache(RSC_CACHE, normalizedKey, fresh.clone())
              .then(() => limitCache(RSC_CACHE, RSC_CACHE_LIMIT))
              .catch(() => {});
          }
          return fresh;
        });

        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('rsc-network-timeout')),
            NAV_NETWORK_TIMEOUT_MS,
          );
        });

        try {
          const fresh = await Promise.race([networkPromise, timeoutPromise]);
          clearTimeout(timeoutId);
          return fresh;
        } catch {
          clearTimeout(timeoutId);
          const cached = await lookupCachedRsc();
          if (cached && isFreshEnough(cached, HTML_MAX_AGE_MS)) {
            event.waitUntil(networkPromise.catch(() => {}));
            return cached;
          }
          try {
            return await networkPromise;
          } catch {
            return new Response('', { status: 503 });
          }
        }
      })(),
    );
    return;
  }

  // -------------------------------------------------------------------------
  // 4. Page navigations — NETWORK-FIRST. Uses `{ ignoreVary: true }` so
  //    Next.js App Router `Vary: RSC, Next-Router-State-Tree, ...` headers
  //    never cause false cache misses when offline.
  // -------------------------------------------------------------------------
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cleanUrl = normalizePageOrRscUrl(request.url);
        const cleanReq = new Request(cleanUrl);
        const lookupCachedPage = async () => {
          const cache = await caches.open(PAGES_CACHE);
          let cached = await cache.match(request, { ignoreVary: true });
          if (!cached) {
            cached = await cache.match(cleanReq, { ignoreVary: true });
          }
          if (!cached) {
            cached = await cache.match(cleanReq, {
              ignoreSearch: true,
              ignoreVary: true,
            });
          }
          return cached;
        };

        const networkPromise = fetch(request).then((fresh) => {
          if (isCacheableResponse(fresh, 'html')) {
            stampAndCache(PAGES_CACHE, cleanReq, fresh.clone())
              .then(() => limitCache(PAGES_CACHE, PAGES_CACHE_LIMIT))
              .catch(() => {});
          }
          return fresh;
        });

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
          const cached = await lookupCachedPage();
          if (cached && isFreshEnough(cached, HTML_MAX_AGE_MS)) {
            event.waitUntil(networkPromise.catch(() => {}));
            return cached;
          }
          try {
            return await networkPromise;
          } catch {
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
  // -------------------------------------------------------------------------
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.ok && res.status === 200 && !res.redirected) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, clone);
            limitCache(RUNTIME_CACHE, RUNTIME_CACHE_LIMIT);
          });
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreVary: true });
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
  let url = data.url || '/';
  try {
    const parsed = new URL(url, self.location.origin);
    if (
      parsed.hostname.endsWith('.vercel.app') ||
      parsed.hostname.endsWith('.vercel.dev')
    ) {
      url = `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
    }
  } catch {
    url = '/';
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dermaspace', {
      body: data.body || '',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/favicon.png',
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
//   1. SKIP_WAITING — forces a waiting SW to activate immediately if
//      explicitly requested (sw.js already calls skipWaiting() on install).
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
  if (resolved.origin !== self.location.origin) return;
  if (
    resolved.pathname.startsWith('/api/') ||
    resolved.pathname.startsWith('/_next/')
  ) {
    return;
  }
  const normalizedUrl = normalizePageOrRscUrl(resolved.toString());
  const cacheReq = new Request(normalizedUrl);
  const WARM_FRESH_MS = 10 * 60 * 1000;

  try {
    const [pagesCache, rscCache] = await Promise.all([
      caches.open(PAGES_CACHE),
      caches.open(RSC_CACHE),
    ]);
    const [existingPage, existingRsc] = await Promise.all([
      pagesCache.match(cacheReq),
      rscCache.match(cacheReq, { ignoreVary: true }),
    ]);
    if (isFreshEnough(existingPage, WARM_FRESH_MS) && isFreshEnough(existingRsc, WARM_FRESH_MS)) {
      return;
    }
  } catch {
    /* ignore cache lookup error and proceed */
  }

  // Warm both the full HTML document (for offline reload) and the Next.js
  // App Router RSC payload (for offline <Link> client navigation), plus any
  // /_next/static/ scripts and stylesheets referenced by those responses.
  await Promise.all([
    fetch(normalizedUrl, {
      cache: 'reload',
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (isCacheableResponse(res, 'html')) {
          const textClone = res.clone();
          await stampAndCache(PAGES_CACHE, cacheReq, res);
          await limitCache(PAGES_CACHE, PAGES_CACHE_LIMIT);
          textClone.text().then(warmStaticAssetsFromText).catch(() => {});
        }
      })
      .catch(() => {}),
    fetch(normalizedUrl, {
      cache: 'reload',
      credentials: 'same-origin',
      headers: { RSC: '1' },
    })
      .then(async (res) => {
        if (isCacheableResponse(res, 'rsc')) {
          const textClone = res.clone();
          await stampAndCache(RSC_CACHE, cacheReq, res);
          await limitCache(RSC_CACHE, RSC_CACHE_LIMIT);
          textClone.text().then(warmStaticAssetsFromText).catch(() => {});
        }
      })
      .catch(() => {}),
  ]);
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
      (async () => {
        for (const u of urls) {
          await cacheUrlForOfflineNav(u);
        }
      })(),
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

  if (data.type === 'ds.clearCache') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map((n) => caches.delete(n).catch(() => {}))),
      ),
    );
    return;
  }
});
