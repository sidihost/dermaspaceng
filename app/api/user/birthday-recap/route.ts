import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/*
 * /api/user/birthday-recap
 * ------------------------
 * Powers the "Glow Year Wrapped" birthday story at /birthday — a
 * Spotify-Wrapped-style flow that celebrates the member's year with
 * Dermaspace on (or around) their birthday.
 *
 * Everything we surface is rolled up from the existing booking
 * tables — no new schema. Each slide in the UI consumes one or two
 * fields from this payload, so we keep the response shape stable
 * and let the client decide which slides to render based on what's
 * present (a brand-new member with zero bookings still gets a
 * tasteful "your journey is just beginning" version).
 */

export const dynamic = 'force-dynamic'

interface TreatmentRow { treatment_name: string; count: string }
interface LocationRow  { location_name: string;  count: string }
interface MonthRow     { month_num: string;      count: string }

const MONTH_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
] as const

function isBirthdayToday(dob: string | null | undefined): boolean {
  if (!dob) return false
  const [, mm, dd] = dob.split('-')
  if (!mm || !dd) return false
  const today = new Date()
  return (
    parseInt(mm, 10) === today.getMonth() + 1 &&
    parseInt(dd, 10) === today.getDate()
  )
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Pull the heavier profile fields we don't already have on the
    // session object (created_at, dob string, totals).
    //
    // We wrap the lookup in a try so a missing column (e.g. an
    // older deployment that hasn't run script 300-booking-system-v2.sql
    // and is therefore missing `bookings_count` / `total_spent_kobo`)
    // degrades gracefully instead of returning a 500 that breaks the
    // entire /birthday page.
    let profile: Record<string, unknown> = {}
    try {
      const profileRows = await sql`
        SELECT
          TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS dob,
          TO_CHAR(created_at,    'YYYY-MM-DD') AS joined_on,
          created_at,
          COALESCE(bookings_count,   0) AS bookings_count,
          COALESCE(total_spent_kobo, 0) AS total_spent_kobo
        FROM users
        WHERE id = ${user.id}
        LIMIT 1
      `
      profile = profileRows[0] ?? {}
    } catch (err) {
      console.warn('[birthday-recap] full profile query failed, falling back', err)
      try {
        const profileRows = await sql`
          SELECT
            TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS dob,
            TO_CHAR(created_at,    'YYYY-MM-DD') AS joined_on,
            created_at
          FROM users
          WHERE id = ${user.id}
          LIMIT 1
        `
        profile = profileRows[0] ?? {}
      } catch (err2) {
        console.error('[birthday-recap] minimal profile query failed', err2)
      }
    }
    const joinedAt: Date | null = profile.created_at ? new Date(profile.created_at as string) : null
    const daysWithUs = joinedAt
      ? Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / 86_400_000))
      : 1

    // Three small parallel rollups against bookings + booking_services.
    // We only count business-meaningful states (confirmed / completed)
    // — pending and cancelled bookings shouldn't shape someone's
    // "year in review". Each query is wrapped in try/catch so one
    // missing table or join can't take down the entire recap.
    const safeQuery = async <T>(p: Promise<T[]>): Promise<T[]> => {
      try {
        return await p
      } catch (err) {
        console.warn('[birthday-recap] rollup query failed', err)
        return []
      }
    }

    const [topTreatments, topLocations, busiestMonths] = await Promise.all([
      safeQuery<TreatmentRow>(sql`
        SELECT bs.treatment_name, COUNT(*)::text AS count
        FROM booking_services bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE b.user_id = ${user.id}
          AND b.status IN ('confirmed', 'completed')
        GROUP BY bs.treatment_name
        ORDER BY COUNT(*) DESC, bs.treatment_name ASC
        LIMIT 1
      ` as Promise<TreatmentRow[]>),
      safeQuery<LocationRow>(sql`
        SELECT location_name, COUNT(*)::text AS count
        FROM bookings
        WHERE user_id = ${user.id}
          AND status IN ('confirmed', 'completed')
          AND location_name IS NOT NULL
        GROUP BY location_name
        ORDER BY COUNT(*) DESC, location_name ASC
        LIMIT 1
      ` as Promise<LocationRow[]>),
      safeQuery<MonthRow>(sql`
        SELECT EXTRACT(MONTH FROM appointment_date)::text AS month_num,
               COUNT(*)::text AS count
        FROM bookings
        WHERE user_id = ${user.id}
          AND status IN ('confirmed', 'completed')
          AND appointment_date IS NOT NULL
        GROUP BY EXTRACT(MONTH FROM appointment_date)
        ORDER BY COUNT(*) DESC
        LIMIT 1
      ` as Promise<MonthRow[]>),
    ])

    const totalBookings    = Number(profile.bookings_count   ?? 0) || 0
    const totalSpentKobo   = Number(profile.total_spent_kobo ?? 0) || 0
    const totalSpentNaira  = Math.round(totalSpentKobo / 100)
    const topTreatment     = topTreatments[0]?.treatment_name ?? null
    const topTreatmentCount = topTreatments[0] ? Number(topTreatments[0].count) : 0
    const topLocation      = topLocations[0]?.location_name ?? null
    const topLocationCount = topLocations[0] ? Number(topLocations[0].count) : 0
    const busiestMonthNum  = busiestMonths[0] ? parseInt(busiestMonths[0].month_num, 10) : null
    const busiestMonth     = busiestMonthNum ? MONTH_SHORT[busiestMonthNum - 1] : null

    return NextResponse.json({
      user: {
        firstName: (user as { first_name?: string | null }).first_name ?? null,
        lastName:  (user as { last_name?:  string | null }).last_name  ?? null,
      },
      isBirthdayToday: isBirthdayToday(profile.dob as string | null),
      birthday: profile.dob ?? null,
      joinedOn: profile.joined_on ?? null,
      daysWithUs,
      stats: {
        totalBookings,
        totalSpentNaira,
        topTreatment,
        topTreatmentCount,
        topLocation,
        topLocationCount,
        busiestMonth,
      },
    })
  } catch (error) {
    console.error('[birthday-recap] failed', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
