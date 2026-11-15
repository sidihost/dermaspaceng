import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildConsultationPersistencePlan,
  buildConsultationEmailAction,
  buildConsultationReplyTarget,
  formatConsultationDateLabel,
  formatConsultationLocation,
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

test('registered user consultation email links to dashboard consultation detail with CTA label', () => {
  const action = buildConsultationEmailAction({
    isAnonymous: false,
    appUrl: 'https://www.dermaspaceng.com/',
    consultationId: 'cons-99',
    trackToken: 'ignored-token',
    status: 'confirmed',
  })

  assert.equal(action.mode, 'dashboard')
  assert.equal(action.ctaUrl, 'https://www.dermaspaceng.com/dashboard/consultations/cons-99')
  assert.equal(action.ctaLabel, 'View in Dashboard')
  assert.equal(action.dashboardUrl, 'https://www.dermaspaceng.com/dashboard/consultations/cons-99')
  assert.equal(action.trackUrl, undefined)
})

test('anonymous consultation email links to private track page with CTA label', () => {
  const action = buildConsultationEmailAction({
    isAnonymous: true,
    appUrl: 'https://www.dermaspaceng.com',
    consultationId: 'cons-100',
    trackToken: 'abcdef123456',
    status: 'confirmed',
  })

  assert.equal(action.mode, 'track')
  assert.equal(action.ctaUrl, 'https://www.dermaspaceng.com/consultation/track/abcdef123456')
  assert.equal(action.ctaLabel, 'Track your consultation')
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
  assert.equal(regCancelled.ctaLabel, 'Book a new consultation')
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
  assert.equal(anonCancelled.ctaLabel, 'Book a new consultation')
  assert.equal(anonCancelled.trackUrl, undefined)
})

test('consultation reply target links registered users and anonymous visitors to dedicated responses pages with View response CTA', () => {
  const regTarget = buildConsultationReplyTarget({
    isAnonymous: false,
    hasUserAccount: true,
    appUrl: 'https://www.dermaspaceng.com/',
    consultationId: 'cons-42',
    trackToken: 'ignored',
  })
  assert.equal(regTarget.isAnonymousRecipient, false)
  assert.equal(regTarget.ctaUrl, 'https://www.dermaspaceng.com/dashboard/consultations/cons-42/responses')
  assert.equal(regTarget.actionPath, '/dashboard/consultations/cons-42/responses')
  assert.equal(regTarget.ctaLabel, 'View response')

  const anonTarget = buildConsultationReplyTarget({
    isAnonymous: true,
    hasUserAccount: false,
    appUrl: 'https://www.dermaspaceng.com',
    consultationId: 'cons-43',
    trackToken: 'deadbeef1234',
  })
  assert.equal(anonTarget.isAnonymousRecipient, true)
  assert.equal(anonTarget.ctaUrl, 'https://www.dermaspaceng.com/consultation/track/deadbeef1234/responses')
  assert.equal(anonTarget.actionPath, null)
  assert.equal(anonTarget.ctaLabel, 'View response')

  const anonFallback = buildConsultationReplyTarget({
    isAnonymous: true,
    hasUserAccount: false,
    appUrl: 'https://www.dermaspaceng.com',
    consultationId: 'cons-44',
    trackToken: null,
  })
  assert.equal(anonFallback.isAnonymousRecipient, true)
  assert.equal(anonFallback.ctaUrl, 'https://www.dermaspaceng.com/consultation')
  assert.equal(anonFallback.ctaLabel, 'Book a Consultation')
})

test('consultation date and location helpers format cleanly without raw JS Date strings', () => {
  assert.equal(
    formatConsultationLocation('vi'),
    'Victoria Island - 237b Muri Okunola St',
  )
  assert.equal(
    formatConsultationLocation('IKOYI'),
    'Ikoyi - 9 Agbeke Rotinwa Cl, Dolphin Estate',
  )
  assert.equal(formatConsultationLocation('Lekki'), 'Lekki')
  assert.equal(formatConsultationLocation(null), '')

  assert.equal(
    formatConsultationDateLabel('2026-11-18'),
    'Wednesday, November 18, 2026',
  )
  assert.equal(
    formatConsultationDateLabel(new Date('2026-11-18T00:00:00.000Z')),
    'Wednesday, November 18, 2026',
  )
  assert.equal(formatConsultationDateLabel(null), null)
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
