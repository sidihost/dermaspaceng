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
 * Spend is summed from `bookings.total_price_kobo` (in kobo); we
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
        COALESCE(SUM(total_price_kobo) FILTER (WHERE status IN ('confirmed','completed')), 0) / 100.0 AS total_spent_naira
      FROM bookings
      WHERE user_id = ${id}
    `) as any[]

    const stats = statsRows[0] ?? {}
    const totalSpent = Number(stats.total_spent_naira ?? 0)
    const points = Math.floor(totalSpent / 1000)

    let analyticsBookings: Array<{
      created_at: string
      status: string
      total_price_kobo: number | null
      payment_status: string | null
    }> = []
    let analyticsPageViews: Array<{ created_at: string }> = []
    try {
      const rows = (await sql`
        SELECT created_at, status,
               total_price_kobo::bigint AS total_price_kobo,
               payment_status
        FROM bookings
        WHERE user_id = ${id}
          AND created_at > NOW() - INTERVAL '13 months'
        ORDER BY created_at DESC
        LIMIT 500
      `) as any[]
      analyticsBookings = rows.map((r) => ({
        created_at: String(r.created_at),
        status: String(r.status ?? "unknown"),
        total_price_kobo:
          r.total_price_kobo === null ? null : Number(r.total_price_kobo),
        payment_status:
          r.payment_status === null ? null : String(r.payment_status),
      }))
    } catch {
      analyticsBookings = []
    }
    try {
      const rows = (await sql`
        SELECT created_at
        FROM page_views
        WHERE user_id = ${id}
          AND created_at > NOW() - INTERVAL '13 weeks'
        ORDER BY created_at DESC
        LIMIT 500
      `) as any[]
      analyticsPageViews = rows.map((r) => ({
        created_at: String(r.created_at),
      }))
    } catch {
      analyticsPageViews = []
    }

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
          noShow: Number(stats.no_show ?? 0),
          cancelled: Number(stats.cancelled ?? 0),
          totalSpent,
          loyaltyPoints: points,
        },
        analytics: {
          bookings: analyticsBookings,
          pageViews: analyticsPageViews,
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

/**
 * PATCH /api/staff/clients/[id]
 *
 * Allows a staff member or admin to edit the basic profile fields of
 * a client (first/last name, phone, date of birth). Email is NOT
 * editable here because it doubles as a sign-in identifier and would
 * require a re-verification flow.
 *
 * Best-effort writes an audit entry to `activity_log` so the admin
 * activity page can surface "staff edited Client X" later.
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireAdminOrStaff()
    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing client id" },
        { status: 400 }
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      firstName?: string | null
      lastName?: string | null
      phone?: string | null
      dateOfBirth?: string | null
    }

    // Confirm the target is a customer, not an operator.
    const target = (await sql`
      SELECT id, role FROM users WHERE id = ${id} LIMIT 1
    `) as any[]
    if (target.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }
    if (
      target[0].role &&
      ["admin", "staff"].includes(String(target[0].role))
    ) {
      return NextResponse.json(
        { success: false, error: "Cannot edit operator accounts here" },
        { status: 403 }
      )
    }

    const firstName = (body.firstName ?? "").toString().trim() || null
    const lastName = (body.lastName ?? "").toString().trim() || null
    const phone = (body.phone ?? "").toString().trim() || null
    const dob = body.dateOfBirth?.toString().trim() || null

    await sql`
      UPDATE users
      SET first_name = ${firstName},
          last_name  = ${lastName},
          phone      = ${phone},
          date_of_birth = ${dob},
          updated_at = NOW()
      WHERE id = ${id}
    `

    // Audit (best-effort; ignored if activity_log is absent in older envs)
    try {
      await sql`
        INSERT INTO activity_log
          (staff_id, user_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${me.id},
          ${id},
          'client_profile_updated',
          'user',
          ${id},
          ${'Staff updated client profile'}
        )
      `
    } catch {
      /* swallow */
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Staff client update error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update client" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/staff/clients/[id]
 *
 * Soft-delete (suspend) a client. We deliberately don't hard-delete
 * because a `users` row is referenced by bookings, transactions,
 * gift cards, etc. — wiping it would orphan paid history.
 *
 * Instead we:
 *   - flip `is_active` to false
 *   - clear active sessions so the customer is signed out immediately
 *
 * An admin can restore the account from `/admin/users/[userId]`.
 */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireAdminOrStaff()
    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing client id" },
        { status: 400 }
      )
    }

    const target = (await sql`
      SELECT id, role FROM users WHERE id = ${id} LIMIT 1
    `) as any[]
    if (target.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }
    if (
      target[0].role &&
      ["admin", "staff"].includes(String(target[0].role))
    ) {
      return NextResponse.json(
        { success: false, error: "Cannot delete operator accounts here" },
        { status: 403 }
      )
    }

    await sql`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = ${id}`
    try {
      await sql`DELETE FROM sessions WHERE user_id = ${id}`
    } catch {
      /* sessions table optional in some test envs */
    }

    try {
      await sql`
        INSERT INTO activity_log
          (staff_id, user_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${me.id},
          ${id},
          'client_suspended',
          'user',
          ${id},
          ${'Staff suspended client account'}
        )
      `
    } catch {
      /* swallow */
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Staff client delete error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete client" },
      { status: 500 }
    )
  }
}
