import test from 'node:test'
import assert from 'node:assert/strict'
import {
  filterValidPushSubscriptions,
  isCanonicalPushOrigin,
  isPreviewOrVercelDeploymentHost,
  isServiceWorkerAllowedOrigin,
  sanitizePushActionUrl,
} from './push-origin'

test('isPreviewOrVercelDeploymentHost flags preview deployments but allows canonical and Cloud Run hosts', () => {
  assert.equal(isPreviewOrVercelDeploymentHost('https://dermaspace-git-feat.vercel.app'), true)
  assert.equal(isPreviewOrVercelDeploymentHost('preview.vercel.dev'), true)
  assert.equal(isPreviewOrVercelDeploymentHost('https://dermaspaceng.com'), false)
  assert.equal(isPreviewOrVercelDeploymentHost('https://app-123.us-west1.run.app'), false)
  assert.equal(isPreviewOrVercelDeploymentHost('http://localhost:3000'), false)
})

test('isServiceWorkerAllowedOrigin enables offline SW on localhost, canonical domain, and hosted HTTPS', () => {
  assert.equal(isServiceWorkerAllowedOrigin('http://localhost:3000'), true)
  assert.equal(isServiceWorkerAllowedOrigin('http://127.0.0.1:3000'), true)
  assert.equal(isServiceWorkerAllowedOrigin('https://dermaspaceng.com'), true)
  assert.equal(isServiceWorkerAllowedOrigin('https://service.us-west1.run.app'), true)
  assert.equal(isServiceWorkerAllowedOrigin('https://branch-preview.vercel.app'), false)
  assert.equal(isServiceWorkerAllowedOrigin('http://insecure-remote.example.com'), false)
})

test('isCanonicalPushOrigin still strictly validates canonical hosts and explicit allowLocalhost', () => {
  assert.equal(isCanonicalPushOrigin('https://dermaspaceng.com'), true)
  assert.equal(
    isCanonicalPushOrigin('http://localhost:3000', { allowLocalhost: true }),
    true,
  )
  assert.equal(
    isCanonicalPushOrigin('http://localhost:3000', { allowLocalhost: false }),
    false,
  )
  assert.equal(isCanonicalPushOrigin('https://foo.vercel.app'), false)
})

test('filterValidPushSubscriptions drops null and preview origins while retaining valid origins', () => {
  const { valid, stale } = filterValidPushSubscriptions(
    [
      { id: '1', origin: 'https://dermaspaceng.com' },
      { id: '2', origin: 'http://localhost:3000' },
      { id: '3', origin: 'https://app-preview.vercel.app' },
      { id: '4', origin: null },
      { id: '5', origin: 'https://my-app.run.app' },
    ],
    { allowLocalhost: true },
  )
  assert.deepEqual(
    valid.map((v) => v.id),
    ['1', '2', '5'],
  )
  assert.deepEqual(
    stale.map((s) => s.id),
    ['3', '4'],
  )
})

test('sanitizePushActionUrl rewrites preview URLs back to canonical origin', () => {
  assert.equal(
    sanitizePushActionUrl('https://foo.vercel.app/dashboard/notifications?tab=all', 'https://dermaspaceng.com'),
    'https://dermaspaceng.com/dashboard/notifications?tab=all',
  )
  assert.equal(
    sanitizePushActionUrl('/booking/resume/abc', 'https://dermaspaceng.com'),
    'https://dermaspaceng.com/booking/resume/abc',
  )
})
