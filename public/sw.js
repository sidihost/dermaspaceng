/**
 * Dermaspace Service Worker
 *
 * Mirrors the caching, route-privacy, and TTL contracts in
 * `lib/sw-cache-helpers.ts`, `components/pwa/service-worker-register.tsx`,
 * `lib/logout.ts`, and `lib/push.ts`.
 *
 * Rules:
 *   1. Never cache or intercept `/api/*`, `/_next/webpack-hmr`, RSC payloads,
 *      cross-origin requests (except cache-first public images), or non-GETs.
 *   2. Always use Network-First for HTML document navigations so fresh deploys
 *      never serve stale HTML referencing removed `/_next/static/*` chunks.
 *   3. Never store private or authenticated routes (`/dashboard`, `/admin`,
 *      `/staff`, `/signin`, etc.) in shared Cache Storage.
 *   4. Fall back to cached public HTML or `/offline` only when the network fails.
 */

const CACHE_VERSION = 'v1'
const PAGES_CACHE = `dermaspace-pages-${CACHE_VERSION}`
const IMAGES_CACHE = `dermaspace-images-${CACHE_VERSION}`
const STATIC_CACHE = `dermaspace-static-${CACHE_VERSION}`
const ACTIVE_CACHES = new Set([PAGES_CACHE, IMAGES_CACHE, STATIC_CACHE])

const IMAGE_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const PAGE_WARM_FRESH_MS = 10 * 60 * 1000
const CACHE_TIMESTAMP_HEADER = 'x-ds-cached-at'

const PRECACHE_ASSETS = [
  '/offline',
  '/icons/icon-192x192.png',
  '/icons/icon-96x96.png',
]

const PRIVATE_SW_ROUTE_PREFIXES = [
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
]

function isPrivateOrAuthRoute(pathname) {
  if (!pathname) return false
  const normalized = pathname.toLowerCase()
  return PRIVATE_SW_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  )
}

function getCachedAtMs(response) {
  if (!response || !response.headers) return null
  const raw = response.headers.get(CACHE_TIMESTAMP_HEADER)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function shouldServeCachedImageDirectly(hasCached, cachedAtMs, nowMs) {
  if (!hasCached) return false
  if (cachedAtMs === null || !Number.isFinite(cachedAtMs)) return true
  const age = nowMs - cachedAtMs
  return age >= 0 && age < IMAGE_CACHE_TTL_MS
}

function shouldSkipPageWarm(cachedAtMs, nowMs) {
  if (cachedAtMs === null || !Number.isFinite(cachedAtMs)) return false
  const age = nowMs - cachedAtMs
  return age >= 0 && age < PAGE_WARM_FRESH_MS
}

function stripRscParam(rawUrl) {
  const parsed = new URL(rawUrl, self.location.origin)
  parsed.searchParams.delete('_rsc')
  return parsed.toString()
}

function filterWarmablePageUrls(urls, origin) {
  if (!Array.isArray(urls)) return []
  const seen = new Set()
  const out = []
  for (const raw of urls) {
    if (typeof raw !== 'string' || !raw.trim()) continue
    try {
      const parsed = new URL(raw, origin)
      if (parsed.origin !== origin) continue
      if (
        parsed.pathname.startsWith('/api/') ||
        parsed.pathname.startsWith('/_next/') ||
        isPrivateOrAuthRoute(parsed.pathname)
      ) {
        continue
      }
      parsed.searchParams.delete('_rsc')
      const normalized = parsed.toString()
      if (!seen.has(normalized)) {
        seen.add(normalized)
        out.push(normalized)
      }
    } catch {
      // Ignore malformed URLs
    }
  }
  return out
}

async function stampResponse(response) {
  if (!response || response.type === 'opaque' || response.status !== 200) {
    return response
  }
  try {
    const headers = new Headers(response.headers)
    headers.set(CACHE_TIMESTAMP_HEADER, String(Date.now()))
    const buffer = await response.clone().arrayBuffer()
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  } catch {
    return response
  }
}

async function warmPageUrl(url, forceReload) {
  try {
    const parsed = new URL(url, self.location.origin)
    if (
      parsed.origin !== self.location.origin ||
      parsed.pathname.startsWith('/api/') ||
      parsed.pathname.startsWith('/_next/') ||
      isPrivateOrAuthRoute(parsed.pathname)
    ) {
      return
    }
    parsed.searchParams.delete('_rsc')
    const cacheKey = parsed.toString()
    const cache = await caches.open(PAGES_CACHE)
    const existing = await cache.match(cacheKey)
    if (existing && shouldSkipPageWarm(getCachedAtMs(existing), Date.now())) {
      return
    }

    const res = await fetch(cacheKey, {
      method: 'GET',
      credentials: 'same-origin',
      cache: forceReload ? 'reload' : 'default',
      headers: { Accept: 'text/html' },
    })
    const contentType = res.headers.get('content-type') || ''
    if (res.ok && contentType.includes('text/html') && !res.redirected) {
      const stamped = await stampResponse(res)
      await cache.put(cacheKey, stamped)
    }
  } catch {
    // Best-effort warming — never throw inside background sync
  }
}

async function clearAllDermaspaceCaches() {
  const names = await caches.keys()
  await Promise.all(
    names
      .filter((name) => name.startsWith('dermaspace-'))
      .map((name) => caches.delete(name)),
  )
}

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    (async () => {
      const pagesCache = await caches.open(PAGES_CACHE)
      const imagesCache = await caches.open(IMAGES_CACHE)
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (assetPath) => {
          try {
            const res = await fetch(assetPath, { cache: 'reload' })
            if (!res.ok) return
            const stamped = await stampResponse(res)
            if (assetPath.startsWith('/icons/')) {
              await imagesCache.put(assetPath, stamped)
            } else {
              await pagesCache.put(new URL(assetPath, self.location.origin).toString(), stamped)
            }
          } catch {
            // Non-fatal: app may still be booting in dev
          }
        }),
      )
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => !ACTIVE_CACHES.has(key))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || typeof data !== 'object') return

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting()
    return
  }

  if (data.type === 'ds.clearCache') {
    event.waitUntil(clearAllDermaspaceCaches().catch(() => {}))
    return
  }

  if (data.type === 'CACHE_URLS' && Array.isArray(data.urls)) {
    const validUrls = filterWarmablePageUrls(data.urls, self.location.origin)
    event.waitUntil(
      Promise.allSettled(validUrls.map((u) => warmPageUrl(u, false))),
    )
    return
  }

  if (data.type === 'CACHE_NAVIGATION' && typeof data.url === 'string') {
    const validUrls = filterWarmablePageUrls([data.url], self.location.origin)
    if (validUrls.length > 0) {
      event.waitUntil(warmPageUrl(validUrls[0], false))
    }
  }
})

function isImageRequest(request, url) {
  if (request.destination === 'image') return true
  if (url.pathname.startsWith('/_next/image')) return true
  return /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/i.test(url.pathname)
}

function isNextRscOrHmrRequest(request, url) {
  if (url.pathname.startsWith('/_next/webpack-hmr')) return true
  if (url.searchParams.has('_rsc')) return true
  const accept = request.headers.get('accept') || ''
  if (accept.includes('text/x-component')) return true
  if (request.headers.get('rsc') === '1') return true
  return false
}

async function handleNavigationRequest(request, url) {
  const cleanUrl = stripRscParam(url.toString())
  const cache = await caches.open(PAGES_CACHE)

  try {
    const response = await fetch(request)
    const contentType = response.headers.get('content-type') || ''
    if (
      response.ok &&
      contentType.includes('text/html') &&
      !isPrivateOrAuthRoute(url.pathname)
    ) {
      const stamped = await stampResponse(response)
      await cache.put(cleanUrl, stamped).catch(() => {})
    }
    return response
  } catch {
    if (!isPrivateOrAuthRoute(url.pathname)) {
      const cachedPage = await cache.match(cleanUrl)
      if (cachedPage) return cachedPage
    }
    const offlineUrl = new URL('/offline', self.location.origin).toString()
    const offlinePage = await cache.match(offlineUrl)
    if (offlinePage) return offlinePage

    return new Response(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Dermaspace</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#faf8fc;color:#1f1627;padding:24px;text-align:center}.card{max-width:380px;background:#fff;border:1px solid #eadff2;border-radius:16px;padding:28px}h1{font-size:20px;margin:0 0 8px;color:#7B2D8E}p{font-size:14px;line-height:1.5;color:#554a60;margin:0 0 18px}button{background:#7B2D8E;color:#fff;border:0;border-radius:9999px;padding:10px 20px;font-weight:600;cursor:pointer}</style></head><body><div class="card"><h1>You are offline</h1><p>Please check your internet connection and try again.</p><button onclick="location.reload()">Try again</button></div></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      },
    )
  }
}

async function handleImageRequest(request) {
  const cache = await caches.open(IMAGES_CACHE)
  const cached = await cache.match(request)
  const now = Date.now()
  if (shouldServeCachedImageDirectly(Boolean(cached), getCachedAtMs(cached), now)) {
    return cached
  }

  try {
    const response = await fetch(request)
    if (response && (response.ok || response.type === 'opaque')) {
      const toStore =
        response.ok && response.type !== 'opaque'
          ? await stampResponse(response)
          : response.clone()
      await cache.put(request, toStore).catch(() => {})
    }
    return response
  } catch (err) {
    if (cached) return cached
    throw err
  }
}

async function handleNextStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE)
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      await cache.put(request, response.clone()).catch(() => {})
    }
    return response
  } catch (err) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw err
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  if (isNextRscOrHmrRequest(request, url)) return

  const isSameOrigin = url.origin === self.location.origin

  if (isSameOrigin && url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate' && isSameOrigin) {
    event.respondWith(handleNavigationRequest(request, url))
    return
  }

  if (isSameOrigin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(handleNextStaticAsset(request))
    return
  }

  if (isImageRequest(request, url)) {
    event.respondWith(handleImageRequest(request))
  }
})

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Dermaspace',
    body: 'You have a new update from Dermaspace.',
    url: '/dashboard/notifications',
    icon: '/icons/icon-192x192.png',
    tag: 'dermaspace-notification',
  }

  if (event.data) {
    try {
      const parsed = event.data.json()
      if (parsed && typeof parsed === 'object') {
        payload = {
          title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : payload.title,
          body: typeof parsed.body === 'string' ? parsed.body : payload.body,
          url: typeof parsed.url === 'string' && parsed.url.trim() ? parsed.url : payload.url,
          icon: typeof parsed.icon === 'string' && parsed.icon.trim() ? parsed.icon : payload.icon,
          tag: typeof parsed.tag === 'string' && parsed.tag.trim() ? parsed.tag : payload.tag,
        }
      }
    } catch {
      try {
        const text = event.data.text()
        if (text) payload.body = text
      } catch {
        // Use defaults
      }
    }
  }

  event.waitUntil(
    (async () => {
      try {
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        })
        for (const client of clientList) {
          client.postMessage({ type: 'ds.pushReceived', payload })
        }
      } catch {
        // Best-effort client wake-up
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: '/icons/icon-96x96.png',
        tag: payload.tag,
        data: { url: payload.url },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl = event.notification?.data?.url || '/dashboard/notifications'
  let targetUrl = new URL('/dashboard/notifications', self.location.origin).toString()
  try {
    const resolved = new URL(rawUrl, self.location.origin)
    if (resolved.origin === self.location.origin) {
      targetUrl = resolved.toString()
    }
  } catch {
    // Keep safe default
  }

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await client.navigate(targetUrl).catch(() => {})
          }
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })(),
  )
})
