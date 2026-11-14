import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getAutoSendStorageKey,
  getRemainingResendCooldownSeconds,
  getResendCooldownStorageKey,
  shouldAutoSendVerificationOtp,
  stripVerifySendParam,
} from '../lib/verify-email-guard'
import { shouldPromptEmailVerification } from '../lib/auth-onboarding'
import { classifyPaystackStatusForReconcile } from '../lib/payment-reconcile-policy'
import { sendMailWithRetry } from '../lib/smtp-transport'

test('stripVerifySendParam removes send while preserving email and redirect', () => {
  assert.equal(
    stripVerifySendParam('/verify-email', '?email=ada%40example.com&send=1&redirect=%2Fdashboard'),
    '/verify-email?email=ada%40example.com&redirect=%2Fdashboard',
  )
  assert.equal(
    stripVerifySendParam('/verify-email', '?send=1'),
    '/verify-email',
  )
  assert.equal(
    stripVerifySendParam('/verify-email', '?email=ada%40example.com'),
    '/verify-email?email=ada%40example.com',
  )
})

test('shouldAutoSendVerificationOtp fires once per arrival and blocks refresh within cooldown', () => {
  const baseNow = 1_700_000_000_000

  assert.equal(
    shouldAutoSendVerificationOtp({
      shouldAutoSend: true,
      emailConfirmed: true,
      email: 'ada@example.com',
      alreadyTriggered: false,
      lastAutoSentAtMs: null,
      nowMs: baseNow,
    }),
    true,
  )

  // Refresh / Strict Mode re-mount within cooldown -> blocked
  assert.equal(
    shouldAutoSendVerificationOtp({
      shouldAutoSend: true,
      emailConfirmed: true,
      email: 'ada@example.com',
      alreadyTriggered: false,
      lastAutoSentAtMs: baseNow - 5_000,
      nowMs: baseNow,
    }),
    false,
  )

  // Same component instance already triggered -> blocked
  assert.equal(
    shouldAutoSendVerificationOtp({
      shouldAutoSend: true,
      emailConfirmed: true,
      email: 'ada@example.com',
      alreadyTriggered: true,
      lastAutoSentAtMs: null,
      nowMs: baseNow,
    }),
    false,
  )

  // Reload without ?send=1 after URL cleanup -> blocked
  assert.equal(
    shouldAutoSendVerificationOtp({
      shouldAutoSend: false,
      emailConfirmed: true,
      email: 'ada@example.com',
      alreadyTriggered: false,
      lastAutoSentAtMs: null,
      nowMs: baseNow,
    }),
    false,
  )

  // After cooldown expires on a new explicit ?send=1 visit -> allowed
  assert.equal(
    shouldAutoSendVerificationOtp({
      shouldAutoSend: true,
      emailConfirmed: true,
      email: 'ada@example.com',
      alreadyTriggered: false,
      lastAutoSentAtMs: baseNow - 180_000,
      nowMs: baseNow,
    }),
    true,
  )

  assert.equal(
    getAutoSendStorageKey('  Ada@Example.COM '),
    'dermaspace.verify_email.auto_sent.ada@example.com',
  )
  assert.equal(
    getResendCooldownStorageKey('Ada@Example.COM'),
    'dermaspace.verify_email.cooldown_until.ada@example.com',
  )
  assert.equal(getRemainingResendCooldownSeconds(baseNow + 14_200, baseNow), 15)
  assert.equal(getRemainingResendCooldownSeconds(baseNow - 100, baseNow), 0)
})

test('shouldPromptEmailVerification handles verified, unverified, placeholder, and gated states', () => {
  assert.equal(shouldPromptEmailVerification(null), false)
  assert.equal(
    shouldPromptEmailVerification({
      email: 'ada@example.com',
      emailVerified: false,
      emailIsPlaceholder: false,
      needsProfileCompletion: false,
      mustChangePassword: false,
    }),
    true,
  )
  assert.equal(
    shouldPromptEmailVerification({
      email: 'ada@example.com',
      emailVerified: true,
      emailIsPlaceholder: false,
    }),
    false,
  )
  assert.equal(
    shouldPromptEmailVerification({
      email: 'x_12345@users.dermaspaceng.com',
      emailVerified: false,
      emailIsPlaceholder: true,
    }),
    false,
  )
  assert.equal(
    shouldPromptEmailVerification({
      email: 'pending+admin@dermaspaceng.invalid',
      emailVerified: false,
    }),
    false,
  )
  assert.equal(
    shouldPromptEmailVerification({
      email: 'ada@example.com',
      emailVerified: false,
      needsProfileCompletion: true,
    }),
    false,
  )
  assert.equal(
    shouldPromptEmailVerification({
      email: 'ada@example.com',
      emailVerified: false,
      mustChangePassword: true,
    }),
    false,
  )
})

test('classifyPaystackStatusForReconcile classifies success, failed, abandoned, and ongoing checkouts', () => {
  assert.deepEqual(
    classifyPaystackStatusForReconcile({ paystackStatus: 'success' }),
    { action: 'credit' },
  )

  assert.deepEqual(
    classifyPaystackStatusForReconcile({
      paystackStatus: 'failed',
      gatewayResponse: 'Insufficient funds',
    }),
    { action: 'fail', reason: 'Insufficient funds' },
  )

  assert.deepEqual(
    classifyPaystackStatusForReconcile({ paystackStatus: 'abandoned' }),
    { action: 'cancel', reason: 'Payment cancelled before completion' },
  )

  // Active recent card checkout (< 120s) without direct callback stays pending
  assert.deepEqual(
    classifyPaystackStatusForReconcile({
      paystackStatus: 'ongoing',
      channel: 'paystack',
      ageSeconds: 25,
      isDirectCallback: false,
    }),
    { action: 'pending' },
  )

  // Direct return to payment-status/verify callback cancels non-transfer ongoing immediately
  assert.deepEqual(
    classifyPaystackStatusForReconcile({
      paystackStatus: 'ongoing',
      channel: 'paystack',
      ageSeconds: 5,
      isDirectCallback: true,
    }),
    { action: 'cancel', reason: 'Payment cancelled before completion' },
  )

  // Stale card checkout (>= 120s) cancels without waiting 24 hours
  assert.deepEqual(
    classifyPaystackStatusForReconcile({
      paystackStatus: 'ongoing',
      channel: 'paystack',
      ageSeconds: 180,
      isDirectCallback: false,
    }),
    { action: 'cancel', reason: 'Payment cancelled before completion' },
  )

  // Dedicated bank transfer stays pending even on direct status poll
  assert.deepEqual(
    classifyPaystackStatusForReconcile({
      paystackStatus: 'pending',
      channel: 'bank_transfer',
      ageSeconds: 300,
      isDirectCallback: true,
    }),
    { action: 'pending' },
  )
})

test('sendMailWithRetry retries once with a fresh transporter and closes cleanly', async () => {
  let attempts = 0
  let closed = 0

  const deliveredAfterRetry = await sendMailWithRetry({
    password: 'secret-token',
    from: '"Dermaspace" <hello@dermaspaceng.com>',
    to: 'customer@example.com',
    subject: 'Payment cancelled',
    html: '<p>Cancelled</p>',
    maxAttempts: 2,
    retryDelayMs: 0,
    createTransport: () => ({
      async sendMail() {
        attempts++
        if (attempts === 1) {
          throw new Error('ETIMEDOUT')
        }
        return { messageId: 'ok-2' }
      },
      close() {
        closed++
      },
    }),
  })

  assert.equal(deliveredAfterRetry, true)
  assert.equal(attempts, 2)
  assert.equal(closed, 2)

  // Missing password returns false immediately
  const missingPassword = await sendMailWithRetry({
    password: '',
    from: '"Dermaspace" <hello@dermaspaceng.com>',
    to: 'customer@example.com',
    subject: 'Payment cancelled',
    html: '<p>Cancelled</p>',
    retryDelayMs: 0,
  })
  assert.equal(missingPassword, false)

  // Exhausting retries returns false cleanly
  let exhaustedAttempts = 0
  const allFailed = await sendMailWithRetry({
    password: 'secret-token',
    from: '"Dermaspace" <hello@dermaspaceng.com>',
    to: 'customer@example.com',
    subject: 'Payment cancelled',
    html: '<p>Cancelled</p>',
    maxAttempts: 2,
    retryDelayMs: 0,
    createTransport: () => ({
      async sendMail() {
        exhaustedAttempts++
        throw new Error('ECONNRESET')
      },
    }),
  })
  assert.equal(allFailed, false)
  assert.equal(exhaustedAttempts, 2)
})
