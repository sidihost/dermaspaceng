import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCelebrationShareText,
  buildCelebrationSlides,
  getActiveCelebrationOccasion,
  getCelebrationBannerCopy,
  getCelebrationConfettiColors,
  getCelebrationThemeCopy,
  getNewYearEdition,
  getSeasonalSeenKey,
  isChristmasSeasonCalendar,
  isNewYearSeasonCalendar,
} from './celebrations'
import type { RecapPayload } from './birthday'

const sampleRecap: RecapPayload = {
  user: { firstName: 'Amaka', lastName: 'Obi' },
  isBirthdayToday: false,
  birthday: '1997-05-01',
  joinedOn: '2025-02-10',
  daysWithUs: 318,
  stats: {
    totalBookings: 8,
    totalSpentNaira: 420000,
    topTreatment: 'HydraFacial Signature',
    topTreatmentCount: 4,
    topLocation: 'Victoria Island',
    topLocationCount: 5,
    busiestMonth: 'DEC',
  },
}

test('Christmas season covers Dec 1 through Dec 26 inclusive', () => {
  assert.equal(isChristmasSeasonCalendar({ year: 2026, month: 11, day: 30 }), false)
  assert.equal(isChristmasSeasonCalendar({ year: 2026, month: 12, day: 1 }), true)
  assert.equal(isChristmasSeasonCalendar({ year: 2026, month: 12, day: 25 }), true)
  assert.equal(isChristmasSeasonCalendar({ year: 2026, month: 12, day: 26 }), true)
  assert.equal(isChristmasSeasonCalendar({ year: 2026, month: 12, day: 27 }), false)
  assert.equal(isChristmasSeasonCalendar({ year: 2027, month: 1, day: 1 }), false)
})

test('New Year season covers Dec 31 through Jan 7 and resolves matching targetYear across midnight', () => {
  assert.equal(isNewYearSeasonCalendar({ year: 2026, month: 12, day: 30 }), false)
  assert.equal(isNewYearSeasonCalendar({ year: 2026, month: 12, day: 31 }), true)
  assert.equal(isNewYearSeasonCalendar({ year: 2027, month: 1, day: 1 }), true)
  assert.equal(isNewYearSeasonCalendar({ year: 2027, month: 1, day: 7 }), true)
  assert.equal(isNewYearSeasonCalendar({ year: 2027, month: 1, day: 8 }), false)

  const eve = getNewYearEdition({ year: 2026, month: 12, day: 31 })
  const jan1 = getNewYearEdition({ year: 2027, month: 1, day: 1 })
  assert.deepEqual(eve, {
    targetYear: 2027,
    recapYear: 2026,
    shortTargetYear: '27',
    shortRecapYear: '26',
  })
  assert.deepEqual(jan1, eve)
})

test('getActiveCelebrationOccasion enforces priority Birthday > Christmas (if festiveEnabled) > New Year', () => {
  // User birthday on Dec 25 wins over Christmas
  assert.equal(
    getActiveCelebrationOccasion({
      dobIso: '1994-12-25',
      festiveEnabled: true,
      now: new Date(2026, 11, 25, 12, 0, 0),
    }),
    'birthday',
  )

  // Non-birthday user on Dec 25 gets Christmas when festive is enabled
  assert.equal(
    getActiveCelebrationOccasion({
      dobIso: '1994-05-12',
      festiveEnabled: true,
      now: new Date(2026, 11, 25, 12, 0, 0),
    }),
    'christmas',
  )

  // When admin festive mode is turned off, Christmas banner does not trigger
  assert.equal(
    getActiveCelebrationOccasion({
      dobIso: '1994-05-12',
      festiveEnabled: false,
      now: new Date(2026, 11, 25, 12, 0, 0),
    }),
    null,
  )

  // Jan 1 triggers New Year even if festive flag is off
  assert.equal(
    getActiveCelebrationOccasion({
      dobIso: '1994-05-12',
      festiveEnabled: false,
      now: new Date(2027, 0, 1, 12, 0, 0),
    }),
    'new-year',
  )
})

test('getSeasonalSeenKey namespaces dismissals per occasion, user, and year', () => {
  assert.equal(getSeasonalSeenKey('birthday', 'u1', 2026), 'ds_bday_seen_u1_2026')
  assert.equal(getSeasonalSeenKey('christmas', 'u1', 2026), 'ds_xmas_seen_u1_2026')
  assert.equal(getSeasonalSeenKey('new-year', 'u1', 2027), 'ds_ny_seen_u1_2027')
  assert.equal(getSeasonalSeenKey('new-year', null, 2027), 'ds_ny_seen_anon_2027')
})

test('Christmas and New Year copy, slides, share text, and confetti stay strictly on-brand with zero sparkles', () => {
  const xmasDate = new Date('2026-12-25T10:00:00Z')
  const nyDate = new Date('2027-01-01T10:00:00Z')

  const xmasTheme = getCelebrationThemeCopy('christmas', sampleRecap, xmasDate)
  const nyTheme = getCelebrationThemeCopy('new-year', sampleRecap, nyDate)

  assert.equal(xmasTheme.intro.eyebrow, 'Merry Christmas')
  assert.equal(xmasTheme.intro.dateText?.month, 'DECEMBER')
  assert.equal(xmasTheme.intro.dateText?.day, 25)
  assert.equal(xmasTheme.share.centerTag, "Xmas '26")

  assert.equal(nyTheme.intro.eyebrow, 'Happy New Year')
  assert.equal(nyTheme.intro.dateText?.month, 'JANUARY')
  assert.equal(nyTheme.intro.dateText?.day, 1)
  assert.equal(nyTheme.intro.dateText?.year, 2027)
  assert.equal(nyTheme.share.centerTag, "Hello '27")

  const xmasShare = buildCelebrationShareText('christmas', sampleRecap, xmasDate)
  const nyShare = buildCelebrationShareText('new-year', sampleRecap, nyDate)
  assert.match(xmasShare, /Amaka's Christmas 2026 Glow at Dermaspace/)
  assert.match(nyShare, /Amaka's Hello 2027 Wrap at Dermaspace/)
  assert.equal(xmasShare.includes('✨'), false)
  assert.equal(nyShare.includes('✨'), false)

  const xmasBanner = getCelebrationBannerCopy({ occasion: 'christmas', firstName: 'Amaka', now: xmasDate })
  const nyBanner = getCelebrationBannerCopy({ occasion: 'new-year', firstName: 'Amaka', now: nyDate })
  assert.equal(xmasBanner.primaryCtaHref, '/christmas')
  assert.equal(nyBanner.primaryCtaHref, '/new-year')

  assert.equal(buildCelebrationSlides('christmas', sampleRecap).length, 7)
  assert.equal(buildCelebrationSlides('new-year', sampleRecap).length, 7)

  // Strictly purple + white confetti palette
  for (const occasion of ['birthday', 'christmas', 'new-year'] as const) {
    const colors = getCelebrationConfettiColors(occasion)
    assert.ok(colors.includes('#7B2D8E'))
    assert.ok(colors.includes('#FFFFFF'))
  }
})
