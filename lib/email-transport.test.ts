import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_EMAIL_PROVIDER,
  getActiveEmailProvider,
  normalizeEmailProvider,
  resolveDeliveryOrder,
} from './email-provider'
import {
  normalizeResendRecipients,
  resolveResendFrom,
  sendTransactionalEmail,
  sendViaResend,
} from './email-transport'

test('default email provider is auto (Zepto primary with Resend fallback) and aliases normalize cleanly', () => {
  assert.equal(DEFAULT_EMAIL_PROVIDER, 'auto')
  assert.equal(normalizeEmailProvider(undefined), 'auto')
  assert.equal(normalizeEmailProvider(''), 'auto')
  assert.equal(normalizeEmailProvider('unknown'), 'auto')
  assert.equal(normalizeEmailProvider('zeptomail'), 'zeptomail')
  assert.equal(normalizeEmailProvider('zepto'), 'zeptomail')
  assert.equal(normalizeEmailProvider('"RESEND"'), 'resend')
  assert.equal(normalizeEmailProvider('resend-first'), 'resend_first')
})

test('getActiveEmailProvider reads EMAIL_PROVIDER env var and defaults to auto', () => {
  assert.equal(getActiveEmailProvider({}), 'auto')
  assert.equal(getActiveEmailProvider({ EMAIL_PROVIDER: 'invalid' }), 'auto')
  assert.equal(getActiveEmailProvider({ EMAIL_PROVIDER: 'zeptomail' }), 'zeptomail')
  assert.equal(getActiveEmailProvider({ EMAIL_PROVIDER: 'resend' }), 'resend')
  assert.equal(getActiveEmailProvider({ EMAIL_PROVIDER: 'auto' }), 'auto')
  assert.equal(getActiveEmailProvider({ EMAIL_PROVIDER: 'resend_first' }), 'resend_first')
})

test('resolveDeliveryOrder routes auto, zeptomail, resend, and resend_first accurately', () => {
  assert.deepEqual(
    resolveDeliveryOrder('auto', { hasZepto: true, hasResend: false }),
    ['zeptomail'],
  )
  assert.deepEqual(
    resolveDeliveryOrder('auto', { hasZepto: false, hasResend: true }),
    ['resend'],
  )
  assert.deepEqual(
    resolveDeliveryOrder('auto', { hasZepto: true, hasResend: true }),
    ['zeptomail', 'resend'],
  )
  assert.deepEqual(
    resolveDeliveryOrder('zeptomail', { hasZepto: true, hasResend: true }),
    ['zeptomail'],
  )
  assert.deepEqual(
    resolveDeliveryOrder('zeptomail', { hasZepto: false, hasResend: true }),
    [],
  )
  assert.deepEqual(
    resolveDeliveryOrder('resend', { hasZepto: true, hasResend: true }),
    ['resend'],
  )
  assert.deepEqual(
    resolveDeliveryOrder('resend_first', { hasZepto: true, hasResend: true }),
    ['resend', 'zeptomail'],
  )
})

test('resolveResendFrom always strips double quotes from display names to prevent Resend 422 errors', () => {
  assert.equal(
    resolveResendFrom('"Dermaspace" <hello@dermaspaceng.com>', undefined),
    'Dermaspace <hello@dermaspaceng.com>',
  )
  assert.equal(
    resolveResendFrom('"Dermaspace Security" <security@dermaspaceng.com>', 'onboarding@resend.dev'),
    'Dermaspace Security <onboarding@resend.dev>',
  )
  assert.equal(
    resolveResendFrom('"Dermaspace" <hello@dermaspaceng.com>', '"Custom Name" <mail@dermaspaceng.com>'),
    'Custom Name <mail@dermaspaceng.com>',
  )
  assert.equal(
    resolveResendFrom('hello@dermaspaceng.com', undefined),
    'hello@dermaspaceng.com',
  )
})

test('normalizeResendRecipients splits comma-separated lists and trims whitespace', () => {
  assert.deepEqual(
    normalizeResendRecipients(' client@example.com , team@dermaspaceng.com '),
    ['client@example.com', 'team@dermaspaceng.com'],
  )
})

test('sendTransactionalEmail leaves zeptomail unaffected when mode is zeptomail', async () => {
  const calls: string[] = []
  const ok = await sendTransactionalEmail({
    providerMode: 'zeptomail',
    zeptoPassword: 'z-key',
    resendApiKey: 'r-key',
    from: '"Dermaspace" <info@dermaspaceng.com>',
    to: 'client@example.com',
    subject: 'Booking confirmed',
    html: '<p>Hello</p>',
    sendZepto: async () => {
      calls.push('zeptomail')
      return true
    },
    sendResend: async () => {
      calls.push('resend')
      return true
    },
  })

  assert.equal(ok, true)
  assert.deepEqual(calls, ['zeptomail'])
})

test('sendTransactionalEmail sends via resend only when mode is resend', async () => {
  const calls: string[] = []
  let receivedFrom = ''
  const ok = await sendTransactionalEmail({
    providerMode: 'resend',
    zeptoPassword: 'z-key',
    resendApiKey: 'r-key',
    from: '"Dermaspace" <info@dermaspaceng.com>',
    to: 'client@example.com',
    subject: 'Happy Birthday',
    html: '<p>Happy Birthday!</p>',
    sendZepto: async () => {
      calls.push('zeptomail')
      return true
    },
    sendResend: async (opts) => {
      calls.push('resend')
      receivedFrom = opts.from
      return true
    },
  })

  assert.equal(ok, true)
  assert.deepEqual(calls, ['resend'])
  assert.equal(receivedFrom, 'Dermaspace <info@dermaspaceng.com>')
})

test('sendTransactionalEmail in auto mode tries zeptomail first and falls back to resend on failure', async () => {
  const calls: string[] = []
  const ok = await sendTransactionalEmail({
    providerMode: 'auto',
    zeptoPassword: 'z-key',
    resendApiKey: 'r-key',
    from: '"Dermaspace" <info@dermaspaceng.com>',
    to: 'client@example.com',
    subject: 'Receipt',
    html: '<p>Paid</p>',
    sendZepto: async () => {
      calls.push('zeptomail')
      return false
    },
    sendResend: async () => {
      calls.push('resend')
      return true
    },
  })

  assert.equal(ok, true)
  assert.deepEqual(calls, ['zeptomail', 'resend'])
})

test('sendViaResend strips quotes from key/from, posts valid payload, and retries once on 5xx', async () => {
  let attempts = 0
  let capturedAuth = ''
  let capturedBody: Record<string, unknown> | null = null

  const mockFetch = (async (_url: unknown, init?: RequestInit) => {
    attempts++
    capturedAuth = String((init?.headers as Record<string, string>)?.Authorization ?? '')
    capturedBody = JSON.parse(String(init?.body ?? '{}'))
    if (attempts === 1) {
      return new Response('temporary error', { status: 502 })
    }
    return new Response(JSON.stringify({ id: 're_123' }), { status: 200 })
  }) as unknown as typeof fetch

  const ok = await sendViaResend({
    apiKey: ' "re_test_key" ',
    from: '"Dermaspace" <info@dermaspaceng.com>',
    to: ' client@example.com ',
    subject: 'Welcome',
    html: '<p>Hi</p>',
    retryDelayMs: 0,
    fetchImpl: mockFetch,
  })

  assert.equal(ok, true)
  assert.equal(attempts, 2)
  assert.equal(capturedAuth, 'Bearer re_test_key')
  assert.deepEqual(capturedBody, {
    from: 'Dermaspace <info@dermaspaceng.com>',
    to: ['client@example.com'],
    subject: 'Welcome',
    html: '<p>Hi</p>',
  })
})

test('sendViaResend does not retry on 4xx client errors', async () => {
  let attempts = 0
  const mockFetch = (async () => {
    attempts++
    return new Response('validation error', { status: 422 })
  }) as unknown as typeof fetch

  const ok = await sendViaResend({
    apiKey: 're_test_key',
    from: 'Dermaspace <info@dermaspaceng.com>',
    to: 'bad-address',
    subject: 'Test',
    html: '<p>Hi</p>',
    retryDelayMs: 0,
    fetchImpl: mockFetch,
  })

  assert.equal(ok, false)
  assert.equal(attempts, 1)
})
