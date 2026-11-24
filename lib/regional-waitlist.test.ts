import test from 'node:test'
import assert from 'node:assert/strict'
import { validateWaitlistSubmission } from './regional-waitlist'

test('waitlist validator accepts valid email and normalizes fields', () => {
  const res = validateWaitlistSubmission({
    email: '  Ada.Lovelace@Example.COM  ',
    name: 'Ada Lovelace',
    city: 'London',
    region: 'global',
    source: 'blocked',
  })
  assert.equal(res.ok, true)
  if (res.ok) {
    assert.equal(res.data.email, 'ada.lovelace@example.com')
    assert.equal(res.data.name, 'Ada Lovelace')
    assert.equal(res.data.city, 'London')
    assert.equal(res.data.region, 'GLOBAL')
    assert.equal(res.data.source, 'blocked')
  }
})

test('waitlist validator rejects invalid emails and empty payloads', () => {
  assert.equal(validateWaitlistSubmission(null).ok, false)
  assert.equal(validateWaitlistSubmission({ email: '' }).ok, false)
  assert.equal(validateWaitlistSubmission({ email: 'not-an-email' }).ok, false)
})
