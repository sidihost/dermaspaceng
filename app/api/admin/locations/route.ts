import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

/**
 * GET /api/admin/locations
 *
 * Returns every booking location, including paused branches, for the
 * admin Availability screen. The public booking endpoint
 * (/api/bookings/locations) filters to `is_active = TRUE` so that a
 * branch toggled off here disappears from the wizard immediately;
 * admins still need to see it (with status) so they can flip it back
 * on without an SQL console.
 *
 * The shape mirrors the `booking_locations` row exactly so the
 * Availability page can `useState` the row directly.
 */
export async function GET() {
  try {
    await requireAdmin()
    const rows = (await sql`
      SELECT id, name, address, phone, whatsapp,
             opens_at, closes_at, open_days,
             slot_minutes, slots_per_window,
             is_active, image_url, display_order
        FROM booking_locations
       ORDER BY display_order ASC, name ASC
    `) as Array<Record<string, unknown>>

    return NextResponse.json({ locations: rows })
  } catch (error) {
    console.error('[admin.locations.GET] failed', error)
    return NextResponse.json(
      { error: 'Failed to load locations' },
      { status: 500 },
    )
  }
}
