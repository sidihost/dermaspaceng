import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateBirthdayRecipients,
  formatCronRunSummary,
  getLagosDateParts,
  isBirthdayOnLagosDate,
  normalizeSentDate,
} from './birthday-cron'

test('getLagosDateParts converts 23:05 UTC to next day in Africa/Lagos (UTC+1)', () => {
  // 2026-11-26 23:05:00 UTC == 2026-11-27 00:05:00 Africa/Lagos
  const parts = getLagosDateParts(new Date('2026-11-26T23:05:00.000Z'))
  assert.equal(parts.year, 2026)
  assert.equal(parts.month, 11)
  assert.equal(parts.day, 27)
  assert.equal(parts.isoDate, '2026-11-27')
})

test('getLagosDateParts shows why 22:59:59 UTC would still be yesterday in Lagos', () => {
  const parts = getLagosDateParts(new Date('2026-11-26T22:59:59.000Z'))
  assert.equal(parts.isoDate, '2026-11-26')
})

test('isBirthdayOnLagosDate matches exact month/day and Feb 29 on Feb 28 in non-leap years', () => {
  assert.equal(
    isBirthdayOnLagosDate('1994-11-27', { year: 2026, month: 11, day: 27, isoDate: '2026-11-27' }),
    true,
  )
  assert.equal(
    isBirthdayOnLagosDate('1994-11-26', { year: 2026, month: 11, day: 27, isoDate: '2026-11-27' }),
    false,
  )
  // Leap-day baby on non-leap Feb 28
  assert.equal(
    isBirthdayOnLagosDate('1996-02-29', { year: 2026, month: 2, day: 28, isoDate: '2026-02-28' }),
    true,
  )
  // Leap-day baby on leap year Feb 28 (should wait for Feb 29)
  assert.equal(
    isBirthdayOnLagosDate('1996-02-29', { year: 2028, month: 2, day: 28, isoDate: '2028-02-28' }),
    false,
  )
  assert.equal(
    isBirthdayOnLagosDate('1996-02-29', { year: 2028, month: 2, day: 29, isoDate: '2028-02-29' }),
    true,
  )
})

test('evaluateBirthdayRecipients includes active real emails, skips already-sent and placeholders', () => {
  const result = evaluateBirthdayRecipients(
    [
      {
        id: 'u1',
        email: 'ada@example.com',
        first_name: 'Ada',
        dob: '1992-11-27',
        last_sent_date: null,
      },
      {
        id: 'u2',
        email: 'tunde@example.com',
        first_name: 'Tunde',
        dob: '1990-11-27',
        last_sent_date: '2025-11-27',
      },
      {
        id: 'u3',
        email: 'already@example.com',
        first_name: 'Chidi',
        dob: '1991-11-27',
        last_sent_date: '2026-11-27',
      },
      {
        id: 'u4',
        email: 'x_123456@users.dermaspaceng.com',
        first_name: 'XUser',
        dob: '1995-11-27',
        last_sent_date: null,
      },
      {
        id: 'u5',
        email: 'pending+staff@dermaspaceng.invalid',
        first_name: 'PendingStaff',
        dob: '1995-11-27',
        last_sent_date: null,
      },
      {
        id: 'u6',
        email: '',
        first_name: 'NoEmail',
        dob: '1995-11-27',
        last_sent_date: null,
      },
    ],
    '2026-11-27',
  )

  assert.equal(result.eligible.length, 2)
  assert.deepEqual(
    result.eligible.map((u) => u.id),
    ['u1', 'u2'],
  )
  assert.equal(result.alreadySentToday, 1)
  assert.equal(result.skippedNoEmail, 3)
})

test('normalizeSentDate handles Date objects, ISO strings, and null', () => {
  assert.equal(normalizeSentDate(null), null)
  assert.equal(normalizeSentDate('2026-11-27'), '2026-11-27')
  assert.equal(normalizeSentDate('2026-11-27T00:05:00.000Z'), '2026-11-27')
  assert.equal(normalizeSentDate(new Date('2026-11-27T00:05:00.000Z')), '2026-11-27')
})

test('formatCronRunSummary explains zero-send diagnostics clearly', () => {
  assert.equal(
    formatCronRunSummary('/api/cron/birthday-wishes', {
      sent: 0,
      failed: 0,
      matchedToday: 0,
      lagosDate: '2026-11-27',
    }),
    'Ran /api/cron/birthday-wishes — sent 0, failed 0 (no birthdays on 2026-11-27)',
  )

  assert.equal(
    formatCronRunSummary('/api/cron/birthday-wishes', {
      sent: 0,
      failed: 0,
      matchedToday: 2,
      alreadySentToday: 2,
      skippedNoEmail: 0,
    }),
    'Ran /api/cron/birthday-wishes — sent 0, failed 0 (2 already sent today)',
  )

  assert.equal(
    formatCronRunSummary('/api/cron/birthday-wishes', {
      sent: 3,
      failed: 0,
      matchedToday: 4,
      alreadySentToday: 1,
      skippedNoEmail: 0,
    }),
    'Ran /api/cron/birthday-wishes — sent 3, failed 0 (1 already sent today)',
  )
})
