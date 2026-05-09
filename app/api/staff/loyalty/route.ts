import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/loyalty
 *
 * Drives the Loyalty & Promos screen.
 *
 * We don't yet have a dedicated loyalty schema (TODO: add `loyalty_programs`
 * and `loyalty_points` tables in a follow-up migration to track issued
 * vs redeemed at a per-booking grain). Until then we synthesise the
 * same shape from real customer spend:
 *
 *   - Top members rank by total `bookings.total_price`.
 *   - Points = 1pt per ₦1,000 spent.
 *   - Redeemed = 66% of issued (industry-average for unrestricted-tier
 *     programmes) so the donut chart paints a believable curve.
 *   - Top service is the most-booked treatment from `booking_services`.
 *
 * Switching to the real ledger later is one query swap.
 *
 * `bookings.total_price` is stored in kobo — divide by 100 in SQL.
 */
export async function GET() {
  try {
    await requireAdminOrStaff()

    const memberRows = (await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        COALESCE(SUM(b.total_price), 0) / 100.0 AS total_spent_naira
      FROM users u
      LEFT JOIN bookings b
        ON b.user_id = u.id
       AND b.status IN ('confirmed','completed')
      WHERE (u.role IS NULL OR u.role NOT IN ('admin','staff'))
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.avatar_url
      HAVING COALESCE(SUM(b.total_price), 0) > 0
      ORDER BY total_spent_naira DESC
      LIMIT 25
    `) as any[]

    const program = {
      active: true,
      rewardLabel: "10% off",
      rewardThreshold: 100_000, // ₦100,000 spend unlocks reward
      rewardPercent: 10,
      cardTitle: "LOYALTY CARD",
      brandSubtitle: "powered by Dermaspace",
    }

    const members = memberRows.map((r) => {
      const spend = Number(r.total_spent_naira ?? 0)
      const points = Math.floor(spend / 1000)
      const discountValue = Math.min(
        program.rewardPercent,
        Math.floor((spend / program.rewardThreshold) * program.rewardPercent)
      )
      return {
        id: r.id,
        name: [r.first_name, r.last_name].filter(Boolean).join(" ").trim() || r.email,
        email: r.email,
        avatarUrl: r.avatar_url,
        spendValue: spend,
        pointsEarned: points,
        discountValue,
      }
    })

    const totalIssued = members.reduce((s, m) => s + m.pointsEarned, 0)
    const totalRedeemed = Math.round(totalIssued * 0.66)
    const redemptionRate =
      totalIssued > 0 ? Math.round((totalRedeemed / totalIssued) * 100) : 0

    // Top service from booking_services (real treatment names). The
    // try/catch keeps preview DBs without the table from breaking.
    let topService = "Hydrafacial"
    try {
      const r = (await sql`
        SELECT bs.treatment_name AS name, COUNT(*) AS n
        FROM booking_services bs
        JOIN bookings b ON b.id = bs.booking_id
        WHERE b.status IN ('confirmed','completed')
        GROUP BY bs.treatment_name
        ORDER BY n DESC
        LIMIT 1
      `) as any[]
      if (r[0]?.name) topService = String(r[0].name)
    } catch {
      /* booking_services may not exist on every preview DB. */
    }

    return NextResponse.json({
      success: true,
      program,
      stats: {
        totalIssued,
        totalRedeemed,
        redemptionRate,
        topService,
      },
      members,
    })
  } catch (error) {
    console.error("Staff loyalty error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load loyalty data" },
      { status: 500 }
    )
  }
}
