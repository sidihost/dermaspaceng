import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterWarmablePageUrls,
  IMAGE_CACHE_TTL_MS,
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

test('filterWarmablePageUrls deduplicates, strips _rsc, and excludes api/_next/cross-origin', () => {
  const origin = 'https://dermaspaceng.com'
  const out = filterWarmablePageUrls(
    [
      '/',
      '/?_rsc=abc',
      '/services',
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
