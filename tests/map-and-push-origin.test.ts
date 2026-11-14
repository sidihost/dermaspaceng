import test from 'node:test'
import assert from 'node:assert/strict'
import { getMapTileLayerConfig } from '../lib/map-tiles'
import {
  filterCanonicalPushSubscriptions,
  getCanonicalAppOrigin,
  isCanonicalPushOrigin,
  isPreviewDeploymentEnv,
  isPreviewOrVercelDeploymentHost,
  isPreviewRequestHost,
  sanitizePushActionUrl,
  sanitizeVapidSubject,
} from '../lib/push-origin'

test('CARTO tile helper appends key when configured and falls back to OSM when blank', () => {
  const configured = getMapTileLayerConfig('  "carto_test+key"  ')
  assert.equal(configured.usingCarto, true)
  assert.equal(
    configured.url,
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=carto_test%2Bkey',
  )
  assert.equal(configured.subdomains, 'abcd')
  assert.match(configured.attribution, /CARTO/)

  for (const empty of [undefined, null, '', '   ', 'undefined', 'null']) {
    const fallback = getMapTileLayerConfig(empty)
    assert.equal(fallback.usingCarto, false)
    assert.equal(fallback.url, 'https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    assert.equal(fallback.subdomains, undefined)
  }
})

test('preview and vercel deployment hosts are always detected and rejected for push origins', () => {
  assert.equal(isPreviewOrVercelDeploymentHost('dermaspace-git-main.vercel.app'), true)
  assert.equal(isPreviewOrVercelDeploymentHost('https://dermaspace-123.vercel.dev'), true)
  assert.equal(isPreviewOrVercelDeploymentHost('dermaspaceng.com'), false)

  assert.equal(isCanonicalPushOrigin('https://dermaspaceng.com'), true)
  assert.equal(isCanonicalPushOrigin('https://www.dermaspaceng.com'), true)
  assert.equal(isCanonicalPushOrigin('http://dermaspaceng.com'), false)
  assert.equal(
    isCanonicalPushOrigin('https://dermaspace-preview.vercel.app', {
      configuredAppUrl: 'https://dermaspace-preview.vercel.app',
      allowLocalhost: true,
    }),
    false,
  )
  assert.equal(isCanonicalPushOrigin(null), false)
  assert.equal(isCanonicalPushOrigin('http://localhost:3000', { allowLocalhost: false }), false)
  assert.equal(isCanonicalPushOrigin('http://localhost:3000', { allowLocalhost: true }), true)
})

test('preview deployment env and request host guards distinguish production vs preview', () => {
  assert.equal(
    isPreviewDeploymentEnv({ VERCEL_ENV: 'preview', VERCEL_URL: 'app-abc.vercel.app' }),
    true,
  )
  // Vercel also sets VERCEL_URL to *.vercel.app on production builds, so production must NOT be blocked
  assert.equal(
    isPreviewDeploymentEnv({ VERCEL_ENV: 'production', VERCEL_URL: 'app-abc.vercel.app' }),
    false,
  )
  assert.equal(isPreviewDeploymentEnv({}), false)

  assert.equal(
    isPreviewRequestHost({ forwardedHost: 'dermaspace-git-fix.vercel.app' }),
    true,
  )
  assert.equal(
    isPreviewRequestHost({ origin: 'https://dermaspace-123.vercel.app', host: 'dermaspaceng.com' }),
    true,
  )
  assert.equal(
    isPreviewRequestHost({ origin: 'https://dermaspaceng.com', host: 'dermaspaceng.com' }),
    false,
  )
})

test('canonical origin, VAPID subject, and push action URL sanitization strip preview domains', () => {
  assert.equal(
    getCanonicalAppOrigin({ NEXT_PUBLIC_APP_URL: 'https://dermaspace-prev.vercel.app' }),
    'https://dermaspaceng.com',
  )
  assert.equal(
    getCanonicalAppOrigin({ NEXT_PUBLIC_APP_URL: 'https://www.dermaspaceng.com/' }),
    'https://www.dermaspaceng.com',
  )

  assert.equal(sanitizeVapidSubject('https://dermaspace-prev.vercel.app'), 'mailto:info@dermaspaceng.com')
  assert.equal(sanitizeVapidSubject('mailto:team@dermaspace-prev.vercel.app'), 'mailto:info@dermaspaceng.com')
  assert.equal(sanitizeVapidSubject('mailto:care@dermaspaceng.com'), 'mailto:care@dermaspaceng.com')
  assert.equal(sanitizeVapidSubject('https://dermaspaceng.com'), 'https://dermaspaceng.com')

  assert.equal(
    sanitizePushActionUrl('https://dermaspace-abc.vercel.app/dashboard/bookings?ref=1'),
    'https://dermaspaceng.com/dashboard/bookings?ref=1',
  )
  assert.equal(
    sanitizePushActionUrl('/dashboard/wallet'),
    'https://dermaspaceng.com/dashboard/wallet',
  )
})

test('filterCanonicalPushSubscriptions partitions legacy null and vercel.app rows as stale', () => {
  const subs = [
    { id: '1', origin: 'https://dermaspaceng.com' },
    { id: '2', origin: 'https://www.dermaspaceng.com' },
    { id: '3', origin: 'https://dermaspace-git-dev.vercel.app' },
    { id: '4', origin: null },
    { id: '5', origin: '' },
  ]
  const { valid, stale } = filterCanonicalPushSubscriptions(subs, { allowLocalhost: false })
  assert.deepEqual(
    valid.map((s) => s.id),
    ['1', '2'],
  )
  assert.deepEqual(
    stale.map((s) => s.id),
    ['3', '4', '5'],
  )
})
