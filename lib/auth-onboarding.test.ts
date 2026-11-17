import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePostAuthRedirect, sanitizeSafeInternalPath } from './auth-onboarding'

test('sanitizeSafeInternalPath accepts valid relative paths and rejects open redirects', () => {
  assert.equal(sanitizeSafeInternalPath('/dashboard/bookings?tab=upcoming'), '/dashboard/bookings?tab=upcoming')
  assert.equal(sanitizeSafeInternalPath('/services#facials'), '/services#facials')
  assert.equal(sanitizeSafeInternalPath(null), '/dashboard')
  assert.equal(sanitizeSafeInternalPath('https://evil.com/phish'), '/dashboard')
  assert.equal(sanitizeSafeInternalPath('//evil.com/phish'), '/dashboard')
  assert.equal(sanitizeSafeInternalPath('/\\evil.com'), '/dashboard')
  assert.equal(sanitizeSafeInternalPath('javascript:alert(1)'), '/dashboard')
  assert.equal(sanitizeSafeInternalPath('/dashboard\nLocation: https://evil.com'), '/dashboard')
})

test('resolvePostAuthRedirect enforces /complete-profile and avoids looping to /signin', () => {
  assert.equal(
    resolvePostAuthRedirect('/dashboard/wallet', { needsProfileCompletion: true }),
    '/complete-profile',
  )
  assert.equal(
    resolvePostAuthRedirect('https://evil.com', { role: 'user', profileComplete: true }),
    '/dashboard',
  )
  assert.equal(
    resolvePostAuthRedirect('/signin?next=/foo', { role: 'user', profileComplete: true }),
    '/dashboard',
  )
  assert.equal(
    resolvePostAuthRedirect('/booking/confirm?id=12', { role: 'user', profileComplete: true }),
    '/booking/confirm?id=12',
  )
})
