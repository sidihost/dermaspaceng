import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractBestGeoFromHeaders,
  extractClientIpFromHeaders,
  formatLocation,
  isPublicIp,
} from './geolocation'

test('extractClientIpFromHeaders prefers cf-connecting-ip, x-real-ip, and first public x-forwarded-for', () => {
  const h1 = new Headers({
    'cf-connecting-ip': '102.89.32.14',
    'x-forwarded-for': '10.0.0.1, 102.89.32.14',
  })
  assert.equal(extractClientIpFromHeaders(h1), '102.89.32.14')

  const h2 = new Headers({
    'x-forwarded-for': '127.0.0.1, 105.112.18.9, 172.16.0.5',
  })
  assert.equal(extractClientIpFromHeaders(h2), '105.112.18.9')

  const h3 = new Headers({
    'x-real-ip': '197.210.55.8',
  })
  assert.equal(extractClientIpFromHeaders(h3), '197.210.55.8')
})

test('isPublicIp rejects loopback and RFC1918 private addresses', () => {
  assert.equal(isPublicIp('127.0.0.1'), false)
  assert.equal(isPublicIp('10.1.2.3'), false)
  assert.equal(isPublicIp('172.16.0.1'), false)
  assert.equal(isPublicIp('172.31.255.255'), false)
  assert.equal(isPublicIp('192.168.1.5'), false)
  assert.equal(isPublicIp('::1'), false)
  assert.equal(isPublicIp('172.32.0.1'), true)
  assert.equal(isPublicIp('102.89.32.14'), true)
})

test('extractBestGeoFromHeaders reads Vercel and Cloudflare headers and formats cleanly', () => {
  const vercelHeaders = new Headers({
    'x-vercel-ip-country': 'NG',
    'x-vercel-ip-country-region': 'OY',
    'x-vercel-ip-city': 'Ibadan%20North',
  })
  const geo = extractBestGeoFromHeaders(vercelHeaders)
  assert.equal(geo.country, 'Nigeria')
  assert.equal(geo.city, 'Ibadan North')
  assert.equal(formatLocation(geo), 'Ibadan North, OY, Nigeria')

  const cfHeaders = new Headers({
    'cf-ipcountry': 'GB',
    'cf-ipcity': 'London',
    'cf-region': 'England',
  })
  assert.equal(
    formatLocation(extractBestGeoFromHeaders(cfHeaders)),
    'London, England, United Kingdom',
  )
})
