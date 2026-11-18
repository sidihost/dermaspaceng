import 'server-only'

import { sql } from '@/lib/db'
import {
  isBirthdayTodayLagos,
  MONTHS_SHORT,
  type RecapPayload,
} from '@/lib/birthday'

interface TreatmentRow {
  treatment_name: string
  count: string
}

interface LocationRow {
  location_name: string
  count: string
}

interface MonthRow {
  month_num: string
  count: string
}

interface LiveAggregateRow {
  count: string
  spent_kobo: string
}

export interface RecapUserInput {
  id: string
  first_name?: string | null
  last_name?: string | null
}

/**
 * Computes the complete Glow Year birthday recap for an authenticated user.
 * Shared by both `/birthday` (SSR) and `/api/user/birthday-recap` (JSON API)
 * so SSR never needs a loopback HTTP fetch.
 */
export async function getBirthdayRecapForUser(
  user: RecapUserInput,
): Promise<RecapPayload> {
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

  const joinedAt: Date | null = profile.created_at
    ? new Date(profile.created_at as string)
    : null
  const daysWithUs = joinedAt && !Number.isNaN(joinedAt.getTime())
    ? Math.max(1, Math.floor((Date.now() - joinedAt.getTime()) / 86_400_000))
    : 1

  const safeQuery = async <T>(p: Promise<T[]>): Promise<T[]> => {
    try {
      return await p
    } catch (err) {
      console.warn('[birthday-recap] rollup query failed', err)
      return []
    }
  }

  const [liveAggRows, topTreatments, topLocations, busiestMonths] =
    await Promise.all([
      safeQuery<LiveAggregateRow>(
        sql`
          SELECT
            COUNT(*)::text AS count,
            COALESCE(SUM(total_price_kobo), 0)::text AS spent_kobo
          FROM bookings
          WHERE user_id = ${user.id}
            AND status IN ('confirmed', 'completed')
        ` as Promise<LiveAggregateRow[]>,
      ),
      safeQuery<TreatmentRow>(
        sql`
          SELECT bs.treatment_name, COUNT(*)::text AS count
          FROM booking_services bs
          JOIN bookings b ON b.id = bs.booking_id
          WHERE b.user_id = ${user.id}
            AND b.status IN ('confirmed', 'completed')
          GROUP BY bs.treatment_name
          ORDER BY COUNT(*) DESC, bs.treatment_name ASC
          LIMIT 1
        ` as Promise<TreatmentRow[]>,
      ),
      safeQuery<LocationRow>(
        sql`
          SELECT location_name, COUNT(*)::text AS count
          FROM bookings
          WHERE user_id = ${user.id}
            AND status IN ('confirmed', 'completed')
            AND location_name IS NOT NULL
          GROUP BY location_name
          ORDER BY COUNT(*) DESC, location_name ASC
          LIMIT 1
        ` as Promise<LocationRow[]>,
      ),
      safeQuery<MonthRow>(
        sql`
          SELECT EXTRACT(MONTH FROM appointment_date)::text AS month_num,
                 COUNT(*)::text AS count
          FROM bookings
          WHERE user_id = ${user.id}
            AND status IN ('confirmed', 'completed')
            AND appointment_date IS NOT NULL
          GROUP BY EXTRACT(MONTH FROM appointment_date)
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ` as Promise<MonthRow[]>,
      ),
    ])

  const cachedBookings = Number(profile.bookings_count ?? 0) || 0
  const liveBookings = liveAggRows[0] ? Number(liveAggRows[0].count) || 0 : 0
  const totalBookings = Math.max(cachedBookings, liveBookings)

  const cachedSpentKobo = Number(profile.total_spent_kobo ?? 0) || 0
  const liveSpentKobo = liveAggRows[0]
    ? Number(liveAggRows[0].spent_kobo) || 0
    : 0
  const totalSpentKobo = Math.max(cachedSpentKobo, liveSpentKobo)
  const totalSpentNaira = Math.round(totalSpentKobo / 100)

  const topTreatment = topTreatments[0]?.treatment_name ?? null
  const topTreatmentCount = topTreatments[0]
    ? Number(topTreatments[0].count) || 0
    : 0
  const topLocation = topLocations[0]?.location_name ?? null
  const topLocationCount = topLocations[0]
    ? Number(topLocations[0].count) || 0
    : 0
  const busiestMonthNum = busiestMonths[0]
    ? parseInt(busiestMonths[0].month_num, 10)
    : null
  const busiestMonth =
    busiestMonthNum && busiestMonthNum >= 1 && busiestMonthNum <= 12
      ? MONTHS_SHORT[busiestMonthNum - 1]
      : null

  const dob = (profile.dob as string | null) ?? null

  return {
    user: {
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
    },
    isBirthdayToday: isBirthdayTodayLagos(dob),
    birthday: dob,
    joinedOn: (profile.joined_on as string | null) ?? null,
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
  }
}
