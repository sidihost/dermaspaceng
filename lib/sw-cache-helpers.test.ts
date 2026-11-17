import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterWarmablePageUrls,
  IMAGE_CACHE_TTL_MS,
  isPrivateOrAuthRoute,
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
