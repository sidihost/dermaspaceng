import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ACTIVE_SW_CACHE_NAME,
  filterWarmablePageUrls,
  getStaleCacheNames,
  IMAGE_CACHE_TTL_MS,
  isPrivateOrAuthRoute,
  isSafeResponseToCache,
  MAX_SW_CACHE_ENTRY_BYTES,
  PAGE_WARM_FRESH_MS,
  shouldServeCachedImageDirectly,
  shouldSkipPageWarm,
} from './sw-cache-helpers'

test('shouldServeCachedImageDirectly avoids redundant refreshes on fresh cache hits', () => {
  const now = 1_700_000_000_000
  assert.equal(shouldServeCachedImageDirectly(false, null, now), false)
  assert.equal(shouldServeCachedImageDirectly(true, null, now), true)
  assert.equal(shouldServeCachedImageDirectly(true, now - 60_000, now), true)
  assert.equal(
    shouldServeCachedImageDirectly(true, now - IMAGE_CACHE_TTL_MS - 1, now),
    false,
  )
})

test('shouldSkipPageWarm skips recently warmed pages', () => {
  const now = 1_700_000_000_000
  assert.equal(shouldSkipPageWarm(null, now), false)
  assert.equal(shouldSkipPageWarm(now - 5_000, now), true)
  assert.equal(shouldSkipPageWarm(now - PAGE_WARM_FRESH_MS - 1, now), false)
})

test('isPrivateOrAuthRoute identifies authenticated and auth-flow paths', () => {
  assert.equal(isPrivateOrAuthRoute('/dashboard'), true)
  assert.equal(isPrivateOrAuthRoute('/dashboard/wallet'), true)
  assert.equal(isPrivateOrAuthRoute('/admin/users'), true)
  assert.equal(isPrivateOrAuthRoute('/staff'), true)
  assert.equal(isPrivateOrAuthRoute('/signin'), true)
  assert.equal(isPrivateOrAuthRoute('/booking/confirm'), true)
  assert.equal(isPrivateOrAuthRoute('/services'), false)
  assert.equal(isPrivateOrAuthRoute('/'), false)
})

test('filterWarmablePageUrls deduplicates, strips _rsc, and excludes api/_next/cross-origin/private routes', () => {
  const origin = 'https://dermaspaceng.com'
  const out = filterWarmablePageUrls(
    [
      '/',
      '/?_rsc=abc',
      '/services',
      '/dashboard',
      '/dashboard/notifications',
      '/admin',
      '/signin',
      '/api/auth/me',
      '/_next/static/chunk.js',
      'https://evil.example.com/phish',
      123,
      '/about',
    ],
    origin,
  )
  assert.deepEqual(out, [
    'https://dermaspaceng.com/',
    'https://dermaspaceng.com/services',
    'https://dermaspaceng.com/about',
  ])
})

test('getStaleCacheNames selects all legacy caches for deletion and preserves only active lean cache', () => {
  assert.deepEqual(
    getStaleCacheNames([
      'dermaspace-pages-v4',
      'dermaspace-images-v4',
      ACTIVE_SW_CACHE_NAME,
      'dermaspace-static-v3',
    ]),
    ['dermaspace-pages-v4', 'dermaspace-images-v4', 'dermaspace-static-v3'],
  )
})

test('isSafeResponseToCache rejects opaque, cross-origin, non-200, and oversized responses', () => {
  const origin = 'https://dermaspaceng.com'
  assert.equal(
    isSafeResponseToCache({
      ok: true,
      status: 200,
      type: 'basic',
      url: 'https://dermaspaceng.com/offline',
      origin,
      contentLength: 18_000,
    }),
    true,
  )
  // Opaque responses trigger Chromium ~7 MB storage padding — must NEVER be cached
  assert.equal(
    isSafeResponseToCache({
      ok: false,
      status: 0,
      type: 'opaque',
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/photo.webp',
      origin,
    }),
    false,
  )
  // Cross-origin CORS responses must also be rejected from SW Cache Storage
  assert.equal(
    isSafeResponseToCache({
      ok: true,
      status: 200,
      type: 'cors',
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/photo.webp',
      origin,
      contentLength: 40_000,
    }),
    false,
  )
  // Oversized same-origin responses must be rejected
  assert.equal(
    isSafeResponseToCache({
      ok: true,
      status: 200,
      type: 'basic',
      url: 'https://dermaspaceng.com/large-asset',
      origin,
      contentLength: MAX_SW_CACHE_ENTRY_BYTES + 1,
    }),
    false,
  )
})
