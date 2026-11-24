import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BLOCKED_COUNTRY_CODES,
  SUPPORTED_COUNTRY_CODES,
  extractPublicClientIp,
  isCountryBlocked,
  isGeoBlockExemptApiPath,
  isPublicClientIp,
  normalizeCountryCode,
  resolveRequestCountry,
} from './geo-blocking'

test('blocks Bangladesh, India, Pakistan and high-spam origin countries', () => {
  for (const code of ['BD', 'IN', 'PK', 'RU', 'CN', 'VN', 'ID', 'PH', 'NP', 'LK', 'IR', 'KP', 'BY', 'RO', 'BG']) {
    assert.equal(isCountryBlocked(code), true, `expected ${code} to be blocked`)
    assert.equal(isCountryBlocked(code.toLowerCase()), true, `expected lowercase ${code} to be blocked`)
  }
})

test('never blocks supported Dermaspace markets or diaspora hubs', () => {
  const blockedSet = new Set<string>(BLOCKED_COUNTRY_CODES)
  for (const code of SUPPORTED_COUNTRY_CODES) {
    assert.equal(blockedSet.has(code), false, `supported market ${code} must not be blocked`)
    assert.equal(isCountryBlocked(code), false, `expected ${code} to be allowed`)
  }
})

test('normalizes sentinel, UK alias, and malformed geo values safely', () => {
  assert.equal(normalizeCountryCode(''), null)
  assert.equal(normalizeCountryCode('XX'), null)
  assert.equal(normalizeCountryCode('T1'), null)
  assert.equal(normalizeCountryCode('ZZ'), null)
  assert.equal(normalizeCountryCode('unknown'), null)
  assert.equal(normalizeCountryCode('bd'), 'BD')
  assert.equal(normalizeCountryCode('  pk  '), 'PK')
  assert.equal(normalizeCountryCode('uk'), 'GB')
  assert.equal(isCountryBlocked(null), false)
  assert.equal(isCountryBlocked('XX'), false)
})

test('resolves country from Vercel, Cloudflare, CloudFront, GCP, or proxy headers', () => {
  const makeHeaders = (entries: Record<string, string>) => ({
    get: (k: string) => entries[k.toLowerCase()] ?? null,
  })

  assert.equal(resolveRequestCountry(makeHeaders({ 'x-vercel-ip-country': 'BD' })), 'BD')
  assert.equal(resolveRequestCountry(makeHeaders({ 'cf-ipcountry': 'PK' })), 'PK')
  assert.equal(resolveRequestCountry(makeHeaders({ 'cloudfront-viewer-country': 'GB' })), 'GB')
  assert.equal(resolveRequestCountry(makeHeaders({ 'x-client-geo-country': 'US' })), 'US')
  assert.equal(resolveRequestCountry(makeHeaders({ 'x-appengine-country': 'AE' })), 'AE')
  assert.equal(resolveRequestCountry(makeHeaders({ 'x-country-code': 'IN' })), 'IN')
  assert.equal(resolveRequestCountry(makeHeaders({ 'cf-ipcountry': 'XX', 'x-country-code': 'RU' })), 'RU')
  assert.equal(resolveRequestCountry(makeHeaders({}), 'BD'), 'BD')
  assert.equal(resolveRequestCountry(makeHeaders({})), null)
})

test('extracts public client IP and skips private/loopback hops', () => {
  const makeHeaders = (entries: Record<string, string>) => ({
    get: (k: string) => entries[k.toLowerCase()] ?? null,
  })

  assert.equal(isPublicClientIp('127.0.0.1'), false)
  assert.equal(isPublicClientIp('10.0.0.5'), false)
  assert.equal(isPublicClientIp('192.168.1.20'), false)
  assert.equal(isPublicClientIp('172.20.0.1'), false)
  assert.equal(isPublicClientIp('8.8.8.8'), true)
  assert.equal(isPublicClientIp('::ffff:8.8.8.8'), true)

  assert.equal(
    extractPublicClientIp(makeHeaders({ 'x-forwarded-for': '10.0.0.1, 8.8.8.8, 172.16.0.2' })),
    '8.8.8.8',
  )
  assert.equal(
    extractPublicClientIp(makeHeaders({ 'cf-connecting-ip': '103.106.238.1' })),
    '103.106.238.1',
  )
  assert.equal(extractPublicClientIp(makeHeaders({ 'x-forwarded-for': '127.0.0.1' })), null)
})

test('exempts webhook, cron, internal, inbound, regional waitlist, and /api/geo routes from geo-blocking', () => {
  assert.equal(isGeoBlockExemptApiPath('/api/webhooks/paystack'), true)
  assert.equal(isGeoBlockExemptApiPath('/api/cron/reconcile-payments'), true)
  assert.equal(isGeoBlockExemptApiPath('/api/internal/reminders/dispatch'), true)
  assert.equal(isGeoBlockExemptApiPath('/api/inbound/email'), true)
  assert.equal(isGeoBlockExemptApiPath('/api/regional-waitlist'), true)
  assert.equal(isGeoBlockExemptApiPath('/api/geo'), true)
  assert.equal(isGeoBlockExemptApiPath('/api/consultation'), false)
  assert.equal(isGeoBlockExemptApiPath('/api/contact'), false)
  assert.equal(isGeoBlockExemptApiPath('/api/auth/signup'), false)
})
