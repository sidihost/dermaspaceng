import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractStaticAssetUrls,
  isCacheablePageResponse,
  isRscRequestInfo,
  normalizeRscCacheUrl,
} from './sw-cache-helpers'

describe('Service Worker offline cache helpers', () => {
  it('detects Next.js RSC requests by header or _rsc query param', () => {
    assert.equal(isRscRequestInfo('1', 'https://dermaspaceng.com/services'), true)
    assert.equal(
      isRscRequestInfo(null, 'https://dermaspaceng.com/services?_rsc=1ab2c'),
      true,
    )
    assert.equal(isRscRequestInfo(null, 'https://dermaspaceng.com/services'), false)
  })

  it('normalizes RSC cache URLs by removing ephemeral _rsc token only', () => {
    assert.equal(
      normalizeRscCacheUrl('https://dermaspaceng.com/blog?category=acne&_rsc=xyz99'),
      'https://dermaspaceng.com/blog?category=acne',
    )
    assert.equal(
      normalizeRscCacheUrl('/services?_rsc=abc12#top', 'https://dermaspaceng.com'),
      'https://dermaspaceng.com/services',
    )
  })

  it('rejects redirects, non-200s, and mismatched content-types', () => {
    assert.equal(
      isCacheablePageResponse({
        ok: true,
        status: 200,
        redirected: true,
        contentType: 'text/html; charset=utf-8',
        expectedKind: 'html',
      }),
      false,
    )
    assert.equal(
      isCacheablePageResponse({
        ok: true,
        status: 200,
        redirected: false,
        contentType: 'text/html; charset=utf-8',
        expectedKind: 'html',
      }),
      true,
    )
    assert.equal(
      isCacheablePageResponse({
        ok: true,
        status: 200,
        redirected: false,
        contentType: 'text/html; charset=utf-8',
        expectedKind: 'rsc',
      }),
      false,
    )
    assert.equal(
      isCacheablePageResponse({
        ok: true,
        status: 200,
        redirected: false,
        contentType: 'text/x-component',
        expectedKind: 'rsc',
      }),
      true,
    )
  })

  it('extracts unique /_next/static/ js and css URLs from HTML and RSC bodies', () => {
    const html = `
      <link rel="stylesheet" href="/_next/static/css/app.css?v=1">
      <script src="/_next/static/chunks/main.js"></script>
      <script src="/_next/static/chunks/main.js"></script>
      <img src="/images/hero-1.jpg">
    `
    const urls = extractStaticAssetUrls(html, 'http://localhost:3000')
    assert.deepEqual(urls, [
      'http://localhost:3000/_next/static/css/app.css?v=1',
      'http://localhost:3000/_next/static/chunks/main.js',
    ])
  })
})
