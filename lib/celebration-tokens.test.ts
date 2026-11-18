import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSignedCelebrationPath,
  evaluateCelebrationAccess,
  mintCelebrationToken,
  verifyCelebrationToken,
} from './celebration-tokens'

const TEST_SECRET = 'test-celebration-hmac-secret-key-001'

test('birthday access denies users without DOB or on non-birthday dates', () => {
  const nov18 = new Date('2026-11-18T12:00:00+01:00')

  const missingDob = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: null,
    now: nov18,
    secretOverride: TEST_SECRET,
  })
  assert.deepEqual(missingDob, { allowed: false, reason: 'missing_dob' })

  const wrongDay = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-05-01',
    now: nov18,
    secretOverride: TEST_SECRET,
  })
  assert.deepEqual(wrongDay, { allowed: false, reason: 'not_birthday' })
})

test('birthday access mints unique tokens on DOB and verifies strictly per user and DOB', () => {
  const bdayMorning = new Date('2026-05-01T08:00:00+01:00')
  const twoDaysLater = new Date('2026-05-03T12:00:00+01:00')
  const tenDaysLater = new Date('2026-05-11T12:00:00+01:00')

  // Direct visit on birthday redirects with freshly minted unique token
  const noTokenAccess = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-05-01',
    now: bdayMorning,
    secretOverride: TEST_SECRET,
  })
  assert.equal(noTokenAccess.allowed, true)
  assert.equal('needsTokenRedirect' in noTokenAccess && noTokenAccess.needsTokenRedirect, true)

  const tokenA = mintCelebrationToken({
    userId: 'user-1',
    occasion: 'birthday',
    dobIso: '1997-05-01',
    now: bdayMorning,
    secretOverride: TEST_SECRET,
  })
  const tokenB = mintCelebrationToken({
    userId: 'user-1',
    occasion: 'birthday',
    dobIso: '1997-05-01',
    now: bdayMorning,
    secretOverride: TEST_SECRET,
  })
  assert.notEqual(tokenA, tokenB) // Unique jti per generation

  // Same user on birthday succeeds
  const validSameDay = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-05-01',
    token: tokenA,
    now: bdayMorning,
    secretOverride: TEST_SECRET,
  })
  assert.equal(validSameDay.allowed, true)

  // Email link still works 2 days later within 7-day grace window
  const validGrace = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-05-01',
    token: tokenA,
    now: twoDaysLater,
    secretOverride: TEST_SECRET,
  })
  assert.equal(validGrace.allowed, true)

  // Expired after 7 days
  const expired = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-05-01',
    token: tokenA,
    now: tenDaysLater,
    secretOverride: TEST_SECRET,
  })
  assert.deepEqual(expired, { allowed: false, reason: 'expired_token' })

  // Different user trying to reuse user-1's token is rejected
  const wrongUser = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-2',
    dobIso: '1997-05-01',
    token: tokenA,
    now: bdayMorning,
    secretOverride: TEST_SECRET,
  })
  assert.deepEqual(wrongUser, { allowed: false, reason: 'wrong_user' })

  // Same user if they changed their DOB in profile is rejected
  const dobChanged = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-06-15',
    token: tokenA,
    now: twoDaysLater,
    secretOverride: TEST_SECRET,
  })
  assert.deepEqual(dobChanged, { allowed: false, reason: 'dob_mismatch' })

  // Tampered signature rejected
  const parts = tokenA.split('.')
  const tampered = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}AAAA`
  const tamperedRes = evaluateCelebrationAccess({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-05-01',
    token: tampered,
    now: bdayMorning,
    secretOverride: TEST_SECRET,
  })
  assert.deepEqual(tamperedRes, { allowed: false, reason: 'invalid_token' })
})

test('birthday token minted off-birthday fails verification even with valid signature', () => {
  const offDay = new Date('2026-11-18T12:00:00+01:00')
  const offDayToken = mintCelebrationToken({
    userId: 'user-1',
    occasion: 'birthday',
    dobIso: '1997-05-01',
    now: offDay,
    secretOverride: TEST_SECRET,
  })
  const res = verifyCelebrationToken({
    token: offDayToken,
    expectedUserId: 'user-1',
    expectedOccasion: 'birthday',
    expectedDobIso: '1997-05-01',
    now: offDay,
    secretOverride: TEST_SECRET,
  })
  assert.deepEqual(res, { ok: false, reason: 'not_birthday' })
})

test('christmas access requires Dec 1-26 in Lagos AND festiveEnabled=true', () => {
  const nov18 = new Date('2026-11-18T12:00:00+01:00')
  const dec20 = new Date('2026-12-20T12:00:00+01:00')
  const dec27 = new Date('2026-12-27T12:00:00+01:00')

  assert.deepEqual(
    evaluateCelebrationAccess({
      occasion: 'christmas',
      userId: 'user-1',
      festiveEnabled: true,
      now: nov18,
      secretOverride: TEST_SECRET,
    }),
    { allowed: false, reason: 'season_closed' },
  )

  assert.deepEqual(
    evaluateCelebrationAccess({
      occasion: 'christmas',
      userId: 'user-1',
      festiveEnabled: false,
      now: dec20,
      secretOverride: TEST_SECRET,
    }),
    { allowed: false, reason: 'festive_disabled' },
  )

  const eligible = evaluateCelebrationAccess({
    occasion: 'christmas',
    userId: 'user-1',
    festiveEnabled: true,
    now: dec20,
    secretOverride: TEST_SECRET,
  })
  assert.equal(eligible.allowed, true)

  const xmasToken = mintCelebrationToken({
    userId: 'user-1',
    occasion: 'christmas',
    now: dec20,
    secretOverride: TEST_SECRET,
  })

  // Christmas token cannot be reused for New Year or another user or after Dec 26
  assert.deepEqual(
    evaluateCelebrationAccess({
      occasion: 'new-year',
      userId: 'user-1',
      token: xmasToken,
      now: new Date('2026-12-31T12:00:00+01:00'),
      secretOverride: TEST_SECRET,
    }),
    { allowed: false, reason: 'wrong_occasion' },
  )

  assert.deepEqual(
    evaluateCelebrationAccess({
      occasion: 'christmas',
      userId: 'user-1',
      festiveEnabled: true,
      token: xmasToken,
      now: dec27,
      secretOverride: TEST_SECRET,
    }),
    { allowed: false, reason: 'season_closed' },
  )
})

test('new-year access enforces Dec 31 - Jan 7 window and cross-year edition matching', () => {
  const dec30 = new Date('2026-12-30T12:00:00+01:00')
  const dec31 = new Date('2026-12-31T20:00:00+01:00')
  const jan3 = new Date('2027-01-03T12:00:00+01:00')
  const jan8 = new Date('2027-01-08T12:00:00+01:00')

  assert.deepEqual(
    evaluateCelebrationAccess({
      occasion: 'new-year',
      userId: 'user-1',
      now: dec30,
      secretOverride: TEST_SECRET,
    }),
    { allowed: false, reason: 'season_closed' },
  )

  const nyToken = mintCelebrationToken({
    userId: 'user-1',
    occasion: 'new-year',
    now: dec31,
    secretOverride: TEST_SECRET,
  })

  // Valid on Jan 3 of targetYear 2027
  const jan3Access = evaluateCelebrationAccess({
    occasion: 'new-year',
    userId: 'user-1',
    token: nyToken,
    now: jan3,
    secretOverride: TEST_SECRET,
  })
  assert.equal(jan3Access.allowed, true)

  // Closed on Jan 8
  assert.deepEqual(
    evaluateCelebrationAccess({
      occasion: 'new-year',
      userId: 'user-1',
      token: nyToken,
      now: jan8,
      secretOverride: TEST_SECRET,
    }),
    { allowed: false, reason: 'season_closed' },
  )
})

test('buildSignedCelebrationPath returns null when ineligible and signed path when eligible', () => {
  const nov18 = new Date('2026-11-18T12:00:00+01:00')
  assert.equal(
    buildSignedCelebrationPath({
      occasion: 'birthday',
      userId: 'user-1',
      dobIso: '1997-05-01',
      now: nov18,
      secretOverride: TEST_SECRET,
    }),
    null,
  )
  assert.equal(
    buildSignedCelebrationPath({
      occasion: 'christmas',
      userId: 'user-1',
      festiveEnabled: true,
      now: nov18,
      secretOverride: TEST_SECRET,
    }),
    null,
  )

  const bdayPath = buildSignedCelebrationPath({
    occasion: 'birthday',
    userId: 'user-1',
    dobIso: '1997-11-18',
    now: nov18,
    secretOverride: TEST_SECRET,
  })
  assert.ok(bdayPath && bdayPath.startsWith('/birthday?token=v1.'))
})
