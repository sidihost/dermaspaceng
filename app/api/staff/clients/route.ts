import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/clients
 *
 * Powers the staff "Clients" panel.
 *
 * "Client" here = a `users` row whose role is NOT staff/admin (the
 * default role for a self-signup is `user`/NULL — see migration 020).
 * Each row gets a quick booking count + lifetime spend so the table
 * can show "active customer" signal without a second round trip.
 *
 * `bookings.total_price_kobo` is stored in *kobo* (smallest currency
 * unit); we divide by 100 once at the SQL boundary so the API speaks
 * naira to the client and nothing downstream has to remember the
 * conversion. (Earlier versions of this file referenced a
 * `total_price` column that doesn't exist in the live schema — the
 * resulting "column does not exist" 500 was what made the staff
 * /clients screen fail to load with a generic error toast.)
 *
 * Search: ?q=ronke   - first/last name, email, phone (ILIKE).
 * Pagination: ?limit=25&offset=0
 */
export async function GET(req: Request) {
  try {
    await requireAdminOrStaff()

    const url = new URL(req.url)
    const q = (url.searchParams.get("q") || "").trim()
    const limitRaw = Number(url.searchParams.get("limit") ?? 25)
    const offsetRaw = Number(url.searchParams.get("offset") ?? 0)
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100)
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0)
    const like = q ? `%${q}%` : null

    const rows = (await sql`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.created_at,
        u.avatar_url,
        COALESCE(stats.bookings_count, 0)::int   AS bookings_count,
        COALESCE(stats.total_spent_naira, 0)::float AS total_spent
      FROM users u
      LEFT JOIN (
        SELECT
          b.user_id,
          COUNT(*)                                                 AS bookings_count,
          SUM(COALESCE(b.total_price_kobo, 0)) / 100.0             AS total_spent_naira
        FROM bookings b
        WHERE b.status IN ('confirmed', 'completed')
        GROUP BY b.user_id
      ) stats ON stats.user_id = u.id
      WHERE (u.role IS NULL OR u.role NOT IN ('admin', 'staff'))
        AND (
          ${like}::text IS NULL
          OR u.first_name ILIKE ${like}
          OR u.last_name  ILIKE ${like}
          OR u.email      ILIKE ${like}
          OR u.phone      ILIKE ${like}
        )
      ORDER BY u.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `) as any[]

    const totalRow = (await sql`
      SELECT COUNT(*)::int AS total FROM users u
      WHERE (u.role IS NULL OR u.role NOT IN ('admin', 'staff'))
        AND (
          ${like}::text IS NULL
          OR u.first_name ILIKE ${like}
          OR u.last_name  ILIKE ${like}
          OR u.email      ILIKE ${like}
          OR u.phone      ILIKE ${like}
        )
    `) as any[]

    return NextResponse.json({
      success: true,
      total: Number(totalRow[0]?.total ?? 0),
      clients: rows.map((r) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        avatarUrl: r.avatar_url,
        createdAt: r.created_at,
        bookingsCount: r.bookings_count,
        totalSpent: r.total_spent,
      })),
    })
  } catch (error) {
    console.error("Staff clients list error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load clients" },
      { status: 500 }
    )
  }
}
