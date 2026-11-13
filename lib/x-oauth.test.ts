import test from 'node:test'
import assert from 'node:assert/strict'
import {
  formatXError,
  getAppOrigin,
  isXPlaceholderEmail,
  sanitizeRedirectPath,
  xPlaceholderEmail,
} from './x-oauth'

function makeRequest(headers: Record<string, string>, origin = 'http://0.0.0.0:3000') {
  const map = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return {
    headers: {
      get: (name: string) => map.get(name.toLowerCase()) ?? null,
    },
    nextUrl: { origin },
  }
}

test('getAppOrigin uses NEXT_PUBLIC_APP_URL first when set', () => {
  const prevPublic = process.env.NEXT_PUBLIC_APP_URL
  const prevApp = process.env.APP_URL
  try {
    process.env.NEXT_PUBLIC_APP_URL = 'https://dermaspaceng.com/signin'
    process.env.APP_URL = 'https://ais-dev-example.run.app'
    const origin = getAppOrigin(
      makeRequest({ 'x-forwarded-host': 'other.example.com', 'x-forwarded-proto': 'https' }),
    )
    assert.equal(origin, 'https://dermaspaceng.com')
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = prevPublic
    process.env.APP_URL = prevApp
  }
})

test('getAppOrigin honors non-local x-forwarded-host across dev and shared preview URLs', () => {
  const prevPublic = process.env.NEXT_PUBLIC_APP_URL
  const prevApp = process.env.APP_URL
  try {
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.APP_URL = 'https://ais-dev-example.run.app'
    const origin = getAppOrigin(
      makeRequest({
        'x-forwarded-host': 'ais-pre-example.run.app',
        'x-forwarded-proto': 'https',
      }),
    )
    assert.equal(origin, 'https://ais-pre-example.run.app')
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = prevPublic
    process.env.APP_URL = prevApp
  }
})

test('getAppOrigin falls back to APP_URL on localhost/container requests', () => {
  const prevPublic = process.env.NEXT_PUBLIC_APP_URL
  const prevApp = process.env.APP_URL
  try {
    delete process.env.NEXT_PUBLIC_APP_URL
    process.env.APP_URL = 'https://ais-dev-example.run.app'
    const origin = getAppOrigin(
      makeRequest({ host: 'localhost:3000' }, 'http://localhost:3000'),
    )
    assert.equal(origin, 'https://ais-dev-example.run.app')
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = prevPublic
    process.env.APP_URL = prevApp
  }
})

test('sanitizeRedirectPath blocks open redirects', () => {
  assert.equal(sanitizeRedirectPath('/dashboard'), '/dashboard')
  assert.equal(sanitizeRedirectPath('/book?loc=lekki'), '/book?loc=lekki')
  assert.equal(sanitizeRedirectPath('https://evil.com'), '/dashboard')
  assert.equal(sanitizeRedirectPath('//evil.com'), '/dashboard')
  assert.equal(sanitizeRedirectPath('/\\evil.com'), '/dashboard')
  assert.equal(sanitizeRedirectPath(''), '/dashboard')
})

test('xPlaceholderEmail round-trips with isXPlaceholderEmail', () => {
  const email = xPlaceholderEmail('123456789')
  assert.equal(email, 'x_123456789@users.dermaspaceng.com')
  assert.equal(isXPlaceholderEmail(email), true)
  assert.equal(isXPlaceholderEmail('real@example.com'), false)
})

test('formatXError appends upstream reason/detail for token exchange errors', () => {
  assert.equal(
    formatXError('x_cancelled'),
    'You cancelled the X sign-in. Pick a method to continue.',
  )
  assert.equal(
    formatXError('token_exchange_failed', 'invalid_client', 'Client mismatch'),
    "Couldn't complete sign-in. Please try again, or use a different method. (X said: invalid_client: Client mismatch)",
  )
})
