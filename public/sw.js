// ---------------------------------------------------------------------------
// Dermaspace Lean Service Worker (`dermaspace-lean-v1`)
//
// Designed strictly for:
//   1. Fast, lightweight `/offline` fallback when a user loses connectivity.
//   2. Web Push notifications (`push` + `notificationclick`).
//   3. Zero Cache Storage bloat (< 100 KB total):
//      - NEVER caches opaque (`no-cors`) cross-origin responses (Chromium pads
//        every opaque Cache Storage entry by ~7 MB, which caused 44+ MB of
//        "stored data" in Chrome on mobile).
//      - NEVER duplicates images, media, fonts, or `/_next/static/*` bundles in
//        Cache Storage (the browser's standard HTTP cache already caches them
//        via `Cache-Control: immutable` without inflating site storage).
//      - Automatically deletes all legacy/unrecognized caches on `activate`.
// ---------------------------------------------------------------------------

const ACTIVE_CACHE = 'dermaspace-lean-v1'
const OFFLINE_URL = '/offline'
const MAX_CACHE_BYTES = 256 * 1024 // 256 KB hard ceiling per entry

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ACTIVE_CACHE)
      .then((cache) =>
        fetch(new Request(OFFLINE_URL, { cache: 'reload' }))
          .then((res) => {
            if (res && res.ok && res.type === 'basic') {
              return cache.put(OFFLINE_URL, res)
            }
            return undefined
          })
          .catch(() => undefined),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== ACTIVE_CACHE)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  // Only intercept top-level document navigations to serve `/offline` when
  // disconnected. Leave all images, JS/CSS chunks, fonts, audio, and API
  // requests to the browser's native HTTP cache so Cache Storage stays tiny.
  if (request.mode !== 'navigate') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(ACTIVE_CACHE)
      const cachedOffline = await cache.match(OFFLINE_URL)
      if (cachedOffline) return cachedOffline
      return new Response(
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline | Dermaspace</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center"><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>',
        {
          status: 503,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        },
      )
    }),
  )
})

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type
  if (type === 'ds.clearCache') {
    event.waitUntil(
      caches
        .keys()
        .then((names) => Promise.all(names.map((n) => caches.delete(n))))
        .catch(() => undefined),
    )
    return
  }
  // Intentionally ignore legacy `CACHE_URLS` / `CACHE_NAVIGATION` messages so
  // old tabs cannot re-populate multi-megabyte page caches. Keep `/offline`
  // refreshed only if explicitly requested and within the byte ceiling.
  if (type === 'CACHE_OFFLINE_SHELL') {
    event.waitUntil(
      fetch(new Request(OFFLINE_URL, { cache: 'reload' }))
        .then(async (res) => {
          if (!res || !res.ok || res.type !== 'basic') return
          const cl = Number(res.headers.get('content-length') || '0')
          if (cl > MAX_CACHE_BYTES) return
          const cache = await caches.open(ACTIVE_CACHE)
          await cache.put(OFFLINE_URL, res)
        })
        .catch(() => undefined),
    )
  }
})

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Dermaspace',
    body: 'You have a new notification from Dermaspace.',
    url: '/dashboard',
    icon: '/apple-touch-icon.png',
    tag: 'dermaspace-notification',
  }

  if (event.data) {
    try {
      const parsed = event.data.json()
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        url: parsed.url || payload.url,
        icon: parsed.icon || payload.icon,
        tag: parsed.tag || payload.tag,
      }
    } catch {
      const text = event.data.text()
      if (text) payload.body = text
    }
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: '/apple-touch-icon.png',
        tag: payload.tag,
        data: { url: payload.url },
      }),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: 'ds.pushReceived', payload })
          }
        })
        .catch(() => undefined),
    ]),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = (event.notification.data && event.notification.data.url) || '/dashboard'
  let targetUrl = '/dashboard'
  try {
    const parsed = new URL(rawUrl, self.location.origin)
    if (parsed.origin === self.location.origin) {
      targetUrl = parsed.href
    }
  } catch {
    targetUrl = new URL('/dashboard', self.location.origin).href
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === targetUrl && 'focus' in client) {
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl)
        }
        return undefined
      }),
  )
})
