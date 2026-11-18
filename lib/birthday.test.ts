import test from 'node:test'
import assert from 'node:assert/strict'
import {
  BIRTHDAY_CONFETTI_COLORS,
  buildShareText,
  buildSlides,
  formatLongDate,
  formatNairaCompact,
  getBirthdaySeenKey,
  getIntroSlideCopy,
  isBirthdayOnCalendarDate,
  isBirthdayTodayLagos,
  type RecapPayload,
} from './birthday'

test('isBirthdayOnCalendarDate handles normal dates, timezone safety, and Feb 29 leap-year birthdays', () => {
  assert.equal(
    isBirthdayOnCalendarDate('1995-03-14', { year: 2026, month: 3, day: 14 }),
    true,
  )
  assert.equal(
    isBirthdayOnCalendarDate('1995-03-14', { year: 2026, month: 3, day: 13 }),
    false,
  )
  // Leap-day birthday celebrates on Feb 28 in non-leap year 2026
  assert.equal(
    isBirthdayOnCalendarDate('1996-02-29', { year: 2026, month: 2, day: 28 }),
    true,
  )
  assert.equal(
    isBirthdayOnCalendarDate('1996-02-29', { year: 2024, month: 2, day: 28 }),
    false,
  )
  assert.equal(
    isBirthdayOnCalendarDate('1996-02-29', { year: 2024, month: 2, day: 29 }),
    true,
  )
  assert.equal(
    isBirthdayOnCalendarDate(null, { year: 2026, month: 2, day: 28 }),
    false,
  )
})

test('isBirthdayTodayLagos uses Africa/Lagos (+01:00) boundary accurately', () => {
  // 2026-03-13T23:30:00Z is already 2026-03-14 00:30 WAT
  const lagosMidnight = new Date('2026-03-13T23:30:00Z')
  assert.equal(isBirthdayTodayLagos('1995-03-14', lagosMidnight), true)
  assert.equal(isBirthdayTodayLagos('1995-03-13', lagosMidnight), false)
})

test('getBirthdaySeenKey scopes dismissal per user and year', () => {
  assert.equal(getBirthdaySeenKey('user-a', 2026), 'ds_bday_seen_user-a_2026')
  assert.equal(getBirthdaySeenKey('user-b', 2026), 'ds_bday_seen_user-b_2026')
  assert.equal(getBirthdaySeenKey(null, 2026), 'ds_bday_seen_anon_2026')
})

test('getIntroSlideCopy avoids displaying birth year on birthday and separates off-day view', () => {
  const onBirthday = getIntroSlideCopy({
    birthday: '1995-03-14',
    isBirthdayToday: true,
    now: new Date('2026-03-14T10:00:00Z'),
  })
  assert.equal(onBirthday.eyebrow, 'Happy Birthday')
  assert.equal(onBirthday.dateText?.year, 2026)
  assert.equal(onBirthday.dateText?.day, 14)

  const offDay = getIntroSlideCopy({
    birthday: '1995-03-14',
    isBirthdayToday: false,
    now: new Date('2026-11-18T10:00:00Z'),
  })
  assert.equal(offDay.eyebrow, 'Your Glow Year')
  assert.equal(offDay.dateText?.month, 'MARCH')
  assert.equal(offDay.dateText?.day, 14)
  assert.equal(offDay.dateText?.year, null)
})

test('buildSlides omits empty stat/treatment/location slides when bookings are zero', () => {
  const emptyRecap: RecapPayload = {
    user: { firstName: 'Amaka', lastName: 'Obi' },
    isBirthdayToday: true,
    birthday: '1997-05-01',
    joinedOn: '2026-01-10',
    daysWithUs: 112,
    stats: {
      totalBookings: 0,
      totalSpentNaira: 0,
      topTreatment: null,
      topTreatmentCount: 0,
      topLocation: null,
      topLocationCount: 0,
      busiestMonth: null,
    },
  }
  assert.deepEqual(
    buildSlides(emptyRecap).map((s) => s.id),
    ['intro', 'joined', 'share', 'wish'],
  )

  const activeRecap: RecapPayload = {
    ...emptyRecap,
    stats: {
      totalBookings: 6,
      totalSpentNaira: 285000,
      topTreatment: 'HydraFacial Signature',
      topTreatmentCount: 3,
      topLocation: 'Victoria Island',
      topLocationCount: 4,
      busiestMonth: 'NOV',
    },
  }
  assert.deepEqual(
    buildSlides(activeRecap).map((s) => s.id),
    ['intro', 'joined', 'stats', 'treatment', 'location', 'share', 'wish'],
  )
})

test('buildShareText contains zero sparkle emojis and summarizes real stats', () => {
  const share = buildShareText({
    user: { firstName: 'Tolu', lastName: null },
    isBirthdayToday: true,
    birthday: '1996-11-18',
    joinedOn: '2025-11-18',
    daysWithUs: 365,
    stats: {
      totalBookings: 4,
      totalSpentNaira: 150000,
      topTreatment: 'Glow Peel',
      topTreatmentCount: 2,
      topLocation: 'Lekki Phase 1',
      topLocationCount: 3,
      busiestMonth: 'NOV',
    },
  })
  assert.equal(share.includes('✨'), false)
  assert.match(share, /Tolu's Glow Year at Dermaspace/)
  assert.match(share, /365 days with Dermaspace/)
  assert.match(share, /4 visits/)
  assert.match(share, /Glow Peel/)
})

test('formatters and confetti palette stay on-brand', () => {
  assert.deepEqual(formatLongDate('2025-07-02'), {
    month: 'JULY',
    monthTitle: 'July',
    day: 2,
    year: 2025,
    suffix: 'nd',
  })
  assert.equal(formatNairaCompact(0), '0')
  assert.equal(formatNairaCompact(45000), '45K')
  assert.equal(formatNairaCompact(1500000), '1.5M')
  assert.equal(BIRTHDAY_CONFETTI_COLORS.includes('#F5B841' as never), false)
  assert.equal(BIRTHDAY_CONFETTI_COLORS.includes('#F4A7B9' as never), false)
})
