/**
 * Birthday & Glow Year domain helpers
 * ----------------------------------
 * Pure, dependency-free utilities shared across:
 *   - /app/birthday/page.tsx & birthday-wrapped.tsx (Glow Year story)
 *   - /components/shared/birthday-celebration.tsx (Global birthday banner)
 *   - /lib/birthday-recap.ts & /api/user/birthday-recap (Server rollup)
 *   - /app/dashboard/page.tsx & /app/dashboard/settings/page.tsx
 *
 * Strictly adheres to the Dermaspace brand palette:
 * purple (#7B2D8E / #5A1D6A / #9B4DB0), white (#FFFFFF), and black neutrals.
 */

export interface RecapPayload {
  user: {
    firstName: string | null
    lastName: string | null
  }
  isBirthdayToday: boolean
  birthday: string | null   // YYYY-MM-DD
  joinedOn: string | null   // YYYY-MM-DD
  daysWithUs: number
  stats: {
    totalBookings: number
    totalSpentNaira: number
    topTreatment: string | null
    topTreatmentCount: number
    topLocation: string | null
    topLocationCount: number
    busiestMonth: string | null
  }
}

export interface CalendarDate {
  year: number
  month: number // 1–12
  day: number   // 1–31
}

export interface FormattedDateParts {
  month: string      // Uppercase month name (e.g. 'MARCH')
  monthTitle: string // Title-cased month name (e.g. 'March')
  day: number
  year: number
  suffix: string     // 'st' | 'nd' | 'rd' | 'th'
}

export interface SlideSpec {
  id: 'intro' | 'joined' | 'stats' | 'treatment' | 'location' | 'share' | 'wish'
  label: string
  ms: number
}

export interface IntroSlideCopy {
  eyebrow: string
  cardLabel: string
  dateText: {
    month: string
    day: number
    suffix: string
    year: number | null
  } | null
  subtitleLead: string
  subtitleBrand: string
}

/**
 * Purple-and-white confetti palette — strictly on-brand (zero off-brand
 * pink or yellow/gold).
 */
export const BIRTHDAY_CONFETTI_COLORS = [
  '#7B2D8E',
  '#9B4DB0',
  '#5A1D6A',
  '#E9D5FF',
  '#FFFFFF',
] as const

export const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const MONTHS_SHORT = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Parses a YYYY-MM-DD string (or ISO timestamp starting with YYYY-MM-DD)
 * without passing through `new Date(iso)` so UTC midnight offsets never
 * shift the date backward in WAT (+01:00) or other timezones.
 */
export function parseIsoDateParts(
  iso: string | null | undefined,
): CalendarDate | null {
  if (!iso || typeof iso !== 'string') return null
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const year = parseInt(match[1], 10)
  const month = parseInt(match[2], 10)
  const day = parseInt(match[3], 10)
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

/**
 * Checks whether a member's DOB matches the given calendar date.
 * Handles leap-day birthdays (Feb 29) by celebrating them on Feb 28 in
 * non-leap years so leap-year members still get celebrated annually.
 */
export function isBirthdayOnCalendarDate(
  dobIso: string | null | undefined,
  ref: CalendarDate,
): boolean {
  const dob = parseIsoDateParts(dobIso)
  if (!dob) return false

  if (dob.month === 2 && dob.day === 29 && !isLeapYear(ref.year)) {
    return ref.month === 2 && ref.day === 28
  }

  return dob.month === ref.month && dob.day === ref.day
}

export function getLocalCalendarDate(now: Date = new Date()): CalendarDate {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

export function getLagosCalendarDate(now: Date = new Date()): CalendarDate {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Lagos',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const year = Number(parts.find((p) => p.type === 'year')?.value)
    const month = Number(parts.find((p) => p.type === 'month')?.value)
    const day = Number(parts.find((p) => p.type === 'day')?.value)
    if (year && month && day) {
      return { year, month, day }
    }
  } catch {
    // Fallback to UTC+1 offset if Intl timezone data is unavailable.
  }
  const wat = new Date(now.getTime() + 60 * 60 * 1000)
  return {
    year: wat.getUTCFullYear(),
    month: wat.getUTCMonth() + 1,
    day: wat.getUTCDate(),
  }
}

export function isBirthdayTodayLocal(
  dobIso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return isBirthdayOnCalendarDate(dobIso, getLocalCalendarDate(now))
}

export function isBirthdayTodayLagos(
  dobIso: string | null | undefined,
  now: Date = new Date(),
): boolean {
  return isBirthdayOnCalendarDate(dobIso, getLagosCalendarDate(now))
}

/**
 * Per-user localStorage key so switching accounts on a shared browser
 * doesn't suppress the second user's birthday celebration.
 */
export function getBirthdaySeenKey(
  userId: string | null | undefined,
  year: number,
): string {
  const safeId = userId && userId.trim() !== '' ? userId.trim() : 'anon'
  return `ds_bday_seen_${safeId}_${year}`
}

export function ordinalSuffix(n: number): string {
  const abs = Math.abs(Math.trunc(n))
  const s = ['th', 'st', 'nd', 'rd']
  const v = abs % 100
  return s[(v - 20) % 10] ?? s[v] ?? s[0]
}

export function formatLongDate(
  iso: string | null | undefined,
): FormattedDateParts | null {
  const parts = parseIsoDateParts(iso)
  if (!parts) return null
  const monthTitle = MONTHS_FULL[parts.month - 1]
  if (!monthTitle) return null
  return {
    month: monthTitle.toUpperCase(),
    monthTitle,
    day: parts.day,
    year: parts.year,
    suffix: ordinalSuffix(parts.day),
  }
}

export function formatNairaCompact(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  const rounded = Math.round(n)
  if (rounded >= 1_000_000) {
    const m = rounded / 1_000_000
    return `${Number.isInteger(m) || rounded >= 10_000_000 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (rounded >= 1_000) {
    const k = rounded / 1_000
    return `${Number.isInteger(k) || rounded >= 10_000 ? k.toFixed(0) : k.toFixed(1)}K`
  }
  return rounded.toLocaleString('en-NG')
}

/**
 * Produces accurate copy & date formatting for Slide 1 (Intro):
 *   - On the member's actual birthday: celebrates today with this year's date
 *     (never their birth year like 1995!).
 *   - On any other day: frames the experience as "Your Glow Year" and shows
 *     the member's birthday month & day (without birth year) or current year.
 */
export function getIntroSlideCopy(input: {
  birthday: string | null
  isBirthdayToday: boolean
  now?: Date
}): IntroSlideCopy {
  const now = input.now ?? new Date()
  const lagosToday = getLagosCalendarDate(now)
  const dobParts = parseIsoDateParts(input.birthday)

  if (input.isBirthdayToday) {
    const monthTitle = MONTHS_FULL[lagosToday.month - 1] ?? 'TODAY'
    return {
      eyebrow: 'Happy Birthday',
      cardLabel: 'Celebrating Today',
      dateText: {
        month: monthTitle.toUpperCase(),
        day: lagosToday.day,
        suffix: ordinalSuffix(lagosToday.day),
        year: lagosToday.year,
      },
      subtitleLead: 'Your Glow Year with',
      subtitleBrand: 'Dermaspace',
    }
  }

  if (dobParts) {
    const monthTitle = MONTHS_FULL[dobParts.month - 1] ?? ''
    return {
      eyebrow: 'Your Glow Year',
      cardLabel: 'Birthday on File',
      dateText: {
        month: monthTitle.toUpperCase(),
        day: dobParts.day,
        suffix: ordinalSuffix(dobParts.day),
        year: null,
      },
      subtitleLead: 'Your spa journey with',
      subtitleBrand: 'Dermaspace',
    }
  }

  const monthTitle = MONTHS_FULL[lagosToday.month - 1] ?? ''
  return {
    eyebrow: 'Your Glow Year',
    cardLabel: `${lagosToday.year} Edition`,
    dateText: {
      month: monthTitle.toUpperCase(),
      day: lagosToday.day,
      suffix: ordinalSuffix(lagosToday.day),
      year: lagosToday.year,
    },
    subtitleLead: 'Your spa journey with',
    subtitleBrand: 'Dermaspace',
  }
}

export function buildSlides(recap: RecapPayload): SlideSpec[] {
  const hasBookings = recap.stats.totalBookings > 0
  return [
    { id: 'intro', label: 'Intro', ms: 6500 },
    { id: 'joined', label: 'Days with Dermaspace', ms: 6500 },
    ...(hasBookings
      ? [{ id: 'stats' as const, label: 'Spa Stats', ms: 7500 }]
      : []),
    ...(recap.stats.topTreatment
      ? [{ id: 'treatment' as const, label: 'Go-To Treatment', ms: 6500 }]
      : []),
    ...(recap.stats.topLocation
      ? [{ id: 'location' as const, label: 'Sanctuary Branch', ms: 6500 }]
      : []),
    { id: 'share', label: 'Share Glow Year', ms: 7000 },
    { id: 'wish', label: 'Birthday Wish', ms: 9000 },
  ]
}

export function buildShareText(recap: RecapPayload): string {
  const name = recap.user.firstName?.trim() || 'My'
  const prefix = name === 'My' ? 'My Glow Year' : `${name}'s Glow Year`
  const parts = [`${recap.daysWithUs} ${recap.daysWithUs === 1 ? 'day' : 'days'} with Dermaspace`]
  if (recap.stats.totalBookings > 0) {
    parts.push(
      `${recap.stats.totalBookings} ${recap.stats.totalBookings === 1 ? 'visit' : 'visits'}`,
    )
  }
  if (recap.stats.topTreatment) {
    parts.push(`favourite: ${recap.stats.topTreatment}`)
  }
  return `${prefix} at Dermaspace — ${parts.join(', ')}.`
}
