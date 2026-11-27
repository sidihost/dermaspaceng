import { isPlaceholderEmail } from './auth-onboarding'

export interface LagosDateParts {
  year: number
  month: number
  day: number
  /** YYYY-MM-DD calendar date in Africa/Lagos (UTC+1, no DST). */
  isoDate: string
}

/**
 * Resolve calendar date components in `Africa/Lagos` (UTC+1, no DST).
 * Uses `Intl.DateTimeFormat` with explicit `Africa/Lagos` timezone so
 * server and client always agree regardless of host OS timezone.
 */
export function getLagosDateParts(now: Date = new Date()): LagosDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = formatter.formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '1970')
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1')
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1')
  const isoDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return { year, month, day, isoDate }
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * Parse a YYYY-MM-DD (or ISO timestamp) date string into { month, day }.
 * Returns null for invalid or empty inputs.
 */
export function parseDobMonthDay(
  dobIso: string | null | undefined,
): { month: number; day: number } | null {
  if (!dobIso || typeof dobIso !== 'string') return null
  const m = dobIso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { month, day }
}

/**
 * Returns true if `dobIso` celebrates a birthday on `lagosDate`.
 * Feb 29 birthdays are celebrated on Feb 28 in non-leap years.
 */
export function isBirthdayOnLagosDate(
  dobIso: string | null | undefined,
  lagosDate: LagosDateParts,
): boolean {
  const parsed = parseDobMonthDay(dobIso)
  if (!parsed) return false
  if (parsed.month === lagosDate.month && parsed.day === lagosDate.day) {
    return true
  }
  if (
    parsed.month === 2 &&
    parsed.day === 29 &&
    lagosDate.month === 2 &&
    lagosDate.day === 28 &&
    !isLeapYear(lagosDate.year)
  ) {
    return true
  }
  return false
}

/**
 * Normalize a stored `last_birthday_email_sent_at` value (DATE string,
 * Date instance, or ISO timestamp) to YYYY-MM-DD for idempotency checks.
 */
export function normalizeSentDate(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    return value.toISOString().slice(0, 10)
  }
  const str = String(value).trim()
  const m = str.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

export interface BirthdayCandidateRow {
  id: string
  email: string | null
  first_name: string | null
  dob: string | null
  last_sent_date: string | null
}

export interface EvaluatedBirthdayBatch {
  eligible: Array<{
    id: string
    email: string
    firstName: string
    dob: string | null
  }>
  alreadySentToday: number
  skippedNoEmail: number
}

const BASIC_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Partition today's birthday rows into recipients to email right now,
 * those already emailed on `todayIsoDate`, and those without a valid
 * deliverable email (empty, malformed, or synthetic placeholder).
 */
export function evaluateBirthdayRecipients(
  rows: BirthdayCandidateRow[],
  todayIsoDate: string,
): EvaluatedBirthdayBatch {
  const eligible: EvaluatedBirthdayBatch['eligible'] = []
  let alreadySentToday = 0
  let skippedNoEmail = 0

  for (const row of rows) {
    const email = (row.email ?? '').trim()
    if (!email || !BASIC_EMAIL_RE.test(email) || isPlaceholderEmail(email)) {
      skippedNoEmail++
      continue
    }

    const lastSent = normalizeSentDate(row.last_sent_date)
    if (lastSent && lastSent >= todayIsoDate) {
      alreadySentToday++
      continue
    }

    eligible.push({
      id: String(row.id),
      email,
      firstName: (row.first_name ?? '').trim() || 'there',
      dob: row.dob ?? null,
    })
  }

  return { eligible, alreadySentToday, skippedNoEmail }
}

/**
 * Format a clear, human-readable toast message for `/admin/schedules`
 * "Run now" results, surfacing diagnostic context when `sent === 0`.
 */
export function formatCronRunSummary(
  path: string,
  payload: Record<string, unknown>,
): string {
  if (typeof payload.sent === 'number') {
    const sent = payload.sent
    const failed = typeof payload.failed === 'number' ? payload.failed : 0
    const base = `Ran ${path} — sent ${sent}, failed ${failed}`

    const notes: string[] = []
    const matchedToday =
      typeof payload.matchedToday === 'number' ? payload.matchedToday : null
    const alreadySentToday =
      typeof payload.alreadySentToday === 'number' ? payload.alreadySentToday : 0
    const skippedNoEmail =
      typeof payload.skippedNoEmail === 'number' ? payload.skippedNoEmail : 0
    const lagosDate =
      typeof payload.lagosDate === 'string' && payload.lagosDate
        ? payload.lagosDate
        : null

    if (matchedToday === 0) {
      notes.push(
        lagosDate ? `no birthdays on ${lagosDate}` : 'no birthdays matched today',
      )
    } else {
      if (alreadySentToday > 0) {
        notes.push(`${alreadySentToday} already sent today`)
      }
      if (skippedNoEmail > 0) {
        notes.push(`${skippedNoEmail} without deliverable email`)
      }
    }

    return notes.length > 0 ? `${base} (${notes.join(', ')})` : base
  }

  return `Ran ${path} — ${JSON.stringify(payload).slice(0, 100)}`
}
