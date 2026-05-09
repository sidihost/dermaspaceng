import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"
import { cached, KEYS } from "@/lib/redis"

// 30s TTL — the staff dashboard is the at-a-glance triage screen for
// pending gift cards, complaints, and consultations. We refresh
// half-minute by half-minute so the counters feel live, and cache so
// every staff member's poll doesn't translate to a fresh fan-out across
// four tables.
const DASHBOARD_TTL_SECONDS = 30

export async function GET() {
  try {
    const me = await requireAdminOrStaff()

    // Per-staff assigned-booking count — outside the shared cache
    // because it's user-specific. Cheap (single index hit), so we
    // fetch on every request.
    let myAssignedBookings = 0
    let myUpcomingBookings: Array<{
      id: string
      booking_reference: string
      appointment_date: string
      appointment_time: string
      customer_name: string
      location_name: string
      status: string
    }> = []
    try {
      const r = (await sql`
        SELECT COUNT(*)::int AS count FROM bookings
         WHERE assigned_staff_id = ${me.id}
           AND status IN ('pending', 'confirmed')
           AND appointment_date >= CURRENT_DATE
      `) as any[]
      myAssignedBookings = Number(r[0]?.count ?? 0)
      myUpcomingBookings = (await sql`
        SELECT id::text,
               booking_reference,
               TO_CHAR(appointment_date, 'YYYY-MM-DD') AS appointment_date,
               appointment_time,
               customer_name,
               location_name,
               status
          FROM bookings
         WHERE assigned_staff_id = ${me.id}
           AND status IN ('pending', 'confirmed')
           AND appointment_date >= CURRENT_DATE
         ORDER BY appointment_date ASC, appointment_time ASC
         LIMIT 5
      `) as any[]
    } catch {
      /* If the column doesn't exist yet (migration not run), fall
         through with zero counts so the dashboard still renders. */
    }

    // Each of the four counter queries is wrapped in its own
    // try/catch + fallback to zero. This is deliberate: the previous
    // version made the whole dashboard 500 if any one of the four
    // optional tables (gift_card_requests, contact_messages,
    // consultations, survey_responses) was missing or had a slightly
    // different column layout. The user reported "the staff dashboard
    // doesn't seem to work at all" — this is the most likely cause.
    // Now: if a table is missing, that one tile reads zero and the
    // rest of the dashboard still renders.
    const safeCount = async (q: Promise<unknown>) => {
      try {
        const rows = (await q) as Array<{ count?: string | number }>
        return Number(rows?.[0]?.count ?? 0) || 0
      } catch (err) {
        console.warn("[v0] Staff dashboard counter query failed:", err)
        return 0
      }
    }

    const data = await cached(KEYS.staffDashboard, DASHBOARD_TTL_SECONDS, async () => {
      const [
        pendingGiftCards,
        pendingComplaints,
        pendingConsultations,
        recentSurveys,
      ] = await Promise.all([
        safeCount(sql`
          SELECT COUNT(*) as count FROM gift_card_requests
           WHERE status = 'pending'
        `),
        safeCount(sql`
          SELECT COUNT(*) as count FROM contact_messages
           WHERE category = 'complaint' AND status IN ('pending', 'open', 'in_progress')
        `),
        safeCount(sql`
          SELECT COUNT(*) as count FROM consultations
           WHERE status = 'pending'
        `),
        safeCount(sql`
          SELECT COUNT(*) as count FROM survey_responses
           WHERE created_at >= NOW() - INTERVAL '7 days'
        `),
      ])

      // Build the recent-items feed by collecting from each source
      // independently so a single broken UNION branch can't blank
      // the whole feed. We over-fetch (3 from each) then sort by
      // created_at and slice to 10.
      type Item = {
        id: string
        type: string
        title: string
        status: string
        created_at: string
      }
      const collected: Item[] = []

      try {
        const rows = (await sql`
          SELECT id::text,
                 'Gift Card' as type,
                 CONCAT('Gift card request - ₦', amount) as title,
                 status,
                 created_at
            FROM gift_card_requests
           WHERE status = 'pending'
           ORDER BY created_at DESC
           LIMIT 3
        `) as Item[]
        collected.push(...rows)
      } catch (err) {
        console.warn("[v0] Staff dashboard gift card feed failed:", err)
      }

      try {
        const rows = (await sql`
          SELECT id::text,
                 'Complaint' as type,
                 COALESCE(subject, 'Customer complaint') as title,
                 status,
                 created_at
            FROM contact_messages
           WHERE category = 'complaint' AND status IN ('pending', 'open')
           ORDER BY created_at DESC
           LIMIT 3
        `) as Item[]
        collected.push(...rows)
      } catch (err) {
        console.warn("[v0] Staff dashboard complaints feed failed:", err)
      }

      try {
        const rows = (await sql`
          SELECT id::text,
                 'Consultation' as type,
                 CONCAT('Consultation - ', concern_type) as title,
                 status,
                 created_at
            FROM consultations
           WHERE status = 'pending'
           ORDER BY created_at DESC
           LIMIT 3
        `) as Item[]
        collected.push(...rows)
      } catch (err) {
        console.warn("[v0] Staff dashboard consultations feed failed:", err)
      }

      const recentItems = collected
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        )
        .slice(0, 10)

      return {
        success: true,
        stats: {
          pendingGiftCards,
          pendingComplaints,
          pendingConsultations,
          recentSurveys,
        },
        recentItems,
      }
    })

    // Splice in the per-staff numbers (assigned bookings, upcoming
    // appointments). They live outside the shared cache because they
    // are user-specific. The dashboard UI surfaces these as the "my
    // day" tiles when the column exists.
    return NextResponse.json({
      ...data,
      me: {
        myAssignedBookings,
        myUpcomingBookings,
      },
    })
  } catch (error) {
    console.error("Staff dashboard error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}
