import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildConsultationPersistencePlan,
  buildConsultationEmailAction,
  normalizePublicOrigin,
  resolveSignedInConsultationIdentity,
} from './consultation-mode'
import { buildEmailUrl } from './email-url'

test('registered user booking does not generate anonymous track token', () => {
  let called = false
  const plan = buildConsultationPersistencePlan({
    userId: 'user-uuid-123',
    generateToken: () => {
      called = true
      return 'tok_should_not_exist'
    },
  })

  assert.equal(plan.isAnonymous, false)
  assert.equal(plan.trackToken, null)
  assert.equal(called, false)
})

test('anonymous user booking generates track token and sets isAnonymous=true', () => {
  const plan = buildConsultationPersistencePlan({
    userId: null,
    generateToken: () => 'tok_anon_abc123',
  })

  assert.equal(plan.isAnonymous, true)
  assert.equal(plan.trackToken, 'tok_anon_abc123')
})

test('registered user consultation email links to dashboard consultation detail, never anonymous track link', () => {
  const action = buildConsultationEmailAction({
    isAnonymous: false,
    appUrl: 'https://www.dermaspaceng.com/',
    consultationId: 'cons-99',
    trackToken: 'ignored-token',
  })

  assert.equal(action.mode, 'dashboard')
  assert.equal(action.ctaUrl, 'https://www.dermaspaceng.com/dashboard/consultations/cons-99')
  assert.equal(action.dashboardUrl, 'https://www.dermaspaceng.com/dashboard/consultations/cons-99')
  assert.equal(action.trackUrl, undefined)
})

test('anonymous consultation email links to private track page', () => {
  const action = buildConsultationEmailAction({
    isAnonymous: true,
    appUrl: 'https://www.dermaspaceng.com',
    consultationId: 'cons-100',
    trackToken: 'abcdef123456',
  })

  assert.equal(action.mode, 'track')
  assert.equal(action.ctaUrl, 'https://www.dermaspaceng.com/consultation/track/abcdef123456')
  assert.equal(action.trackUrl, 'https://www.dermaspaceng.com/consultation/track/abcdef123456')
  assert.equal(action.dashboardUrl, undefined)
})

test('cancelled consultation points to rebook consultation page while retaining dashboardUrl for registered users', () => {
  const regCancelled = buildConsultationEmailAction({
    isAnonymous: false,
    consultationId: 'cons-1',
    status: 'cancelled',
  })
  assert.equal(regCancelled.mode, 'rebook')
  assert.equal(regCancelled.ctaUrl, 'https://www.dermaspaceng.com/consultation')
  assert.equal(
    regCancelled.dashboardUrl,
    'https://www.dermaspaceng.com/dashboard/consultations/cons-1',
  )

  const anonCancelled = buildConsultationEmailAction({
    isAnonymous: true,
    consultationId: 'cons-2',
    trackToken: 'tok123',
    status: 'cancelled',
  })
  assert.equal(anonCancelled.mode, 'rebook')
  assert.equal(anonCancelled.ctaUrl, 'https://www.dermaspaceng.com/consultation')
  assert.equal(anonCancelled.trackUrl, undefined)
})

test('email origin helper never leaks undefined prefix', () => {
  assert.equal(normalizePublicOrigin(undefined), 'https://www.dermaspaceng.com')
  assert.equal(normalizePublicOrigin('undefined'), 'https://www.dermaspaceng.com')
  assert.equal(normalizePublicOrigin(''), 'https://www.dermaspaceng.com')
  assert.equal(buildEmailUrl('/dashboard/wallet', 'undefined'), 'https://www.dermaspaceng.com/dashboard/wallet')
  assert.equal(
    buildEmailUrl('membership/receipt/MS_1', 'https://dermaspaceng.com/'),
    'https://dermaspaceng.com/membership/receipt/MS_1',
  )
})

test('signed-in user keeps account identity even when stale draft has another email', () => {
  const identity = resolveSignedInConsultationIdentity({
    user: {
      firstName: 'Ada',
      lastName: 'Okafor',
      email: 'ada@dermaspaceng.com',
      phone: '+2348011111111',
    },
    draft: {
      firstName: 'Anonymous',
      lastName: 'Guest',
      email: 'guest@example.com',
      phone: '+2348099999999',
    },
  })

  assert.equal(identity.firstName, 'Ada')
  assert.equal(identity.lastName, 'Okafor')
  assert.equal(identity.email, 'ada@dermaspaceng.com')
  assert.equal(identity.phone, '+2348011111111')
})
