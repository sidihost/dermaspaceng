import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/clients/[id]
 *
 * Slide-over detail panel: personal info + appointment stats
 * (completed / no-show / cancelled) + lifetime spend + (computed)
 * loyalty points at 1pt per ₦1,000 spent.
 *
 * Spend is summed from `bookings.total_price` which is *kobo*; we
 * divide by 100 in SQL so the API surfaces naira to the client.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrStaff()

    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing client id" },
        { status: 400 }
      )
    }

    const userRows = (await sql`
      SELECT id, first_name, last_name, email, phone, avatar_url,
             date_of_birth, created_at
      FROM users
      WHERE id = ${id}
        AND (role IS NULL OR role NOT IN ('admin', 'staff'))
      LIMIT 1
    `) as any[]
    const user = userRows[0]
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }

    const statsRows = (await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'no_show')::int   AS no_show,
        COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
        COALESCE(SUM(total_price) FILTER (WHERE status IN ('confirmed','completed')), 0) / 100.0 AS total_spent_naira
      FROM bookings
      WHERE user_id = ${id}
    `) as any[]

    const stats = statsRows[0] ?? {}
    const totalSpent = Number(stats.total_spent_naira ?? 0)
    const points = Math.floor(totalSpent / 1000) // 1pt per ₦1,000

    return NextResponse.json({
      success: true,
      client: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
        dateOfBirth: user.date_of_birth,
        createdAt: user.created_at,
        stats: {
          completed: Number(stats.completed ?? 0),
          noShow:    Number(stats.no_show ?? 0),
          cancelled: Number(stats.cancelled ?? 0),
          totalSpent,
          loyaltyPoints: points,
        },
      },
    })
  } catch (error) {
    console.error("Staff client detail error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load client" },
      { status: 500 }
    )
  }
}
