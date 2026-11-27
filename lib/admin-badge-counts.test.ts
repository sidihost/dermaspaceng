import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clampBaselineToCurrentCount,
  computeUnseenBadgeCount,
  getLagosDateStamp,
} from './admin-badge-counts'

test('getLagosDateStamp flips date at midnight Africa/Lagos (23:00 UTC)', () => {
  assert.equal(
    getLagosDateStamp(new Date('2026-11-26T22:59:00.000Z')),
    '2026-11-26',
  )
  assert.equal(
    getLagosDateStamp(new Date('2026-11-26T23:00:00.000Z')),
    '2026-11-27',
  )
})

test('computeUnseenBadgeCount shows new registrations after earlier same-day visit', () => {
  // Admin opened /admin/users earlier today when todayNew was 2
  const baseline = { count: 2, date: '2026-11-27' }

  // No new signups yet -> 0
  assert.equal(
    computeUnseenBadgeCount({
      surface: 'users',
      currentCount: 2,
      baseline,
      todayDate: '2026-11-27',
    }),
    0,
  )

  // A new user registers -> badge shows 1
  assert.equal(
    computeUnseenBadgeCount({
      surface: 'users',
      currentCount: 3,
      baseline,
      todayDate: '2026-11-27',
    }),
    1,
  )
})

test('computeUnseenBadgeCount resets yesterday baseline for dated surfaces', () => {
  // Yesterday admin saw 5 signups
  const baseline = { count: 5, date: '2026-11-26' }

  // Today 1 new user registers -> must show 1, not 0
  assert.equal(
    computeUnseenBadgeCount({
      surface: 'users',
      currentCount: 1,
      baseline,
      todayDate: '2026-11-27',
    }),
    1,
  )
})

test('clampBaselineToCurrentCount lowers stale watermark when a today user is archived', () => {
  // Admin saw 2 signups today, then archived 1 test user so currentCount dropped to 1
  const clamped = clampBaselineToCurrentCount({
    surface: 'users',
    currentCount: 1,
    baseline: { count: 2, date: '2026-11-27' },
    todayDate: '2026-11-27',
  })
  assert.deepEqual(clamped, { count: 1, date: '2026-11-27' })

  // Next real registration bumps currentCount back to 2 -> badge shows 1 immediately!
  assert.equal(
    computeUnseenBadgeCount({
      surface: 'users',
      currentCount: 2,
      baseline: clamped,
      todayDate: '2026-11-27',
    }),
    1,
  )
})

test('clampBaselineToCurrentCount clears stale prior-day baselines on dated surfaces', () => {
  const clamped = clampBaselineToCurrentCount({
    surface: 'users',
    currentCount: 0,
    baseline: { count: 3, date: '2026-11-26' },
    todayDate: '2026-11-27',
  })
  assert.equal(clamped, undefined)
})
