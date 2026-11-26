import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sign } from 'jsonwebtoken'
import {
  APPEAL_MAX_LENGTH,
  APPEAL_MIN_LENGTH,
  buildAppealUrl,
  canTransitionAppealStatus,
  createAppealToken,
  maskEmail,
  normalizeAppealRole,
  sanitizeEmailSubject,
  validateAppealSubmission,
  verifyAppealToken,
} from './suspension-appeals'

describe('suspension-appeals pure helpers', () => {
  it('signs and verifies client and staff appeal tokens', () => {
    const clientToken = createAppealToken({
      userId: 'user-123',
      email: 'Client@Example.com',
      role: 'user',
      reason: 'External link posted in blog comments',
    })
    const clientRes = verifyAppealToken(clientToken)
    assert.equal(clientRes.ok, true)
    if (clientRes.ok) {
      assert.equal(clientRes.payload.userId, 'user-123')
      assert.equal(clientRes.payload.email, 'client@example.com')
      assert.equal(clientRes.payload.role, 'user')
      assert.equal(clientRes.payload.reason, 'External link posted in blog comments')
    }

    const staffToken = createAppealToken({
      userId: 'staff-456',
      email: 'stylist@dermaspaceng.com',
      role: 'staff',
    })
    const staffRes = verifyAppealToken(staffToken)
    assert.equal(staffRes.ok, true)
    if (staffRes.ok) {
      assert.equal(staffRes.payload.role, 'staff')
      assert.equal(staffRes.payload.reason, null)
    }
  })

  it('rejects empty, tampered, alg:none, and wrong-purpose JWTs', () => {
    assert.deepEqual(verifyAppealToken(''), { ok: false, code: 'invalid' })
    assert.deepEqual(verifyAppealToken('not-a-jwt'), { ok: false, code: 'invalid' })

    const validToken = createAppealToken({
      userId: 'user-123',
      email: 'client@example.com',
      role: 'user',
    })
    const parts = validToken.split('.')
    assert.equal(parts.length, 3)
    const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}AAAA`
    assert.deepEqual(verifyAppealToken(tampered), { ok: false, code: 'invalid' })

    const noneHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const nonePayload = Buffer.from(
      JSON.stringify({ purpose: 'suspension_appeal', userId: 'u1', email: 'a@b.com' }),
    ).toString('base64url')
    assert.deepEqual(verifyAppealToken(`${noneHeader}.${nonePayload}.`), {
      ok: false,
      code: 'invalid',
    })

    const wrongPurpose = sign(
      { purpose: 'password_reset', userId: 'u1', email: 'a@b.com' },
      'dermaspace-dev-appeal-secret-not-for-prod',
    )
    assert.deepEqual(verifyAppealToken(wrongPurpose), { ok: false, code: 'invalid' })
  })

  it('builds a canonical unified /appeal URL with encoded token for all roles', () => {
    const url = buildAppealUrl('abc+123/xyz=', 'https://www.dermaspaceng.com')
    assert.equal(url, 'https://www.dermaspaceng.com/appeal?token=abc%2B123%2Fxyz%3D')
    assert.equal(
      buildAppealUrl('staff+1', 'staff', 'https://www.dermaspaceng.com'),
      'https://www.dermaspaceng.com/appeal?token=staff%2B1',
    )
    assert.equal(
      buildAppealUrl('admin+1', 'admin', 'https://www.dermaspaceng.com'),
      'https://www.dermaspaceng.com/appeal?token=admin%2B1',
    )
  })

  it('validates appeal message length and optional contact email', () => {
    const shortRes = validateAppealSubmission({ appealMessage: 'please fix' })
    assert.equal(shortRes.ok, false)

    const longMessage = 'a'.repeat(APPEAL_MAX_LENGTH + 1)
    const longRes = validateAppealSubmission({ appealMessage: longMessage })
    assert.equal(longRes.ok, false)

    const badEmail = validateAppealSubmission({
      appealMessage: 'a'.repeat(APPEAL_MIN_LENGTH),
      contactEmail: 'not-an-email',
    })
    assert.equal(badEmail.ok, false)

    const valid = validateAppealSubmission({
      appealMessage: '  I posted our support link by mistake and understand the policy.  ',
      contactEmail: '  Alt@Example.COM ',
    })
    assert.deepEqual(valid, {
      ok: true,
      appealMessage: 'I posted our support link by mistake and understand the policy.',
      contactEmail: 'alt@example.com',
    })
  })

  it('enforces appeal status transitions and role normalization', () => {
    assert.equal(canTransitionAppealStatus('pending', 'approved'), true)
    assert.equal(canTransitionAppealStatus('pending', 'rejected'), true)
    assert.equal(canTransitionAppealStatus('approved', 'rejected'), false)
    assert.equal(canTransitionAppealStatus('rejected', 'approved'), false)
    assert.equal(canTransitionAppealStatus('pending', 'pending'), false)

    assert.equal(normalizeAppealRole('staff'), 'staff')
    assert.equal(normalizeAppealRole('admin'), 'admin')
    assert.equal(normalizeAppealRole('something_else'), 'user')
  })

  it('strips CRLF and control newlines from email subjects', () => {
    assert.equal(
      sanitizeEmailSubject("  Appointment Update\r\nBcc: attacker@evil.com\n "),
      'Appointment Update Bcc: attacker@evil.com',
    )
    assert.equal(sanitizeEmailSubject('a'.repeat(250)).length, 200)
  })

  it('masks email addresses cleanly', () => {
    assert.equal(maskEmail('deborah@dermaspaceng.com'), 'de*****@dermaspaceng.com')
    assert.equal(maskEmail('ab@test.com'), 'a*@test.com')
  })
})
