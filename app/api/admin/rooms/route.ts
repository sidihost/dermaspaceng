import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff, requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

// Treatment-room directory + live status feed.
// Backed by scripts/600-treatment-rooms.sql.
// Both admins and staff can READ the room board (the staff live-room
// surface reads this list), but only ADMIN can mutate the directory
// (create / rename / delete / set capacity / set status). The
// staff-side check-in / check-out actions live under
// /api/staff/room-sessions and are handled by a separate route.
export const dynamic = 'force-dynamic'

type Room = {
  id: string
  location_id: string
  location_name: string | null
  name: string
  capacity: number
  status: 'active' | 'maintenance' | 'closed'
  allowed_categories: string[] | null
  notes: string | null
  display_order: number
  is_active: boolean
  // Joined live session (if any) so the staff board can render
  // "current client" without a second round trip.
  current_session: null | {
    id: string
    booking_id: string | null
    client_name: string
    staff_first_name: string | null
    staff_last_name: string | null
    service_label: string | null
    duration_minutes: number
    started_at: string
    estimated_end_at: string
  }
}

// GET — returns every (non-soft-deleted) room with the active session
// joined. Defensive try/catch around the migration check so a fresh
// environment that hasn't run script 600 returns an empty list with
// a clear hint instead of crashing the page.
export async function GET() {
  try {
    await requireAdminOrStaff()

    let rooms: Room[] = []
    try {
      const rows = await sql`
        SELECT
          tr.id, tr.location_id, tr.name, tr.capacity, tr.status,
          tr.allowed_categories, tr.notes, tr.display_order, tr.is_active,
          bl.name AS location_name,
          rs.id            AS session_id,
          rs.booking_id    AS session_booking_id,
          rs.client_name   AS session_client_name,
          rs.service_label AS session_service_label,
          rs.duration_minutes AS session_duration_minutes,
          rs.started_at    AS session_started_at,
          u.first_name     AS session_staff_first_name,
          u.last_name      AS session_staff_last_name
        FROM treatment_rooms tr
        LEFT JOIN booking_locations bl ON bl.id = tr.location_id
        LEFT JOIN LATERAL (
          SELECT * FROM room_sessions
          WHERE room_id = tr.id AND status = 'in_progress'
          ORDER BY started_at DESC
          LIMIT 1
        ) rs ON true
        LEFT JOIN users u ON u.id = rs.staff_id
        WHERE tr.is_active = TRUE
        ORDER BY bl.display_order NULLS LAST, tr.display_order ASC, tr.created_at ASC
      `
      rooms = rows.map((r) => {
        const started = r.session_started_at
          ? new Date(String(r.session_started_at))
          : null
        const dur = Number(r.session_duration_minutes ?? 0)
        const estEnd =
          started && dur > 0
            ? new Date(started.getTime() + dur * 60_000).toISOString()
            : null
        return {
          id: String(r.id),
          location_id: String(r.location_id),
          location_name: r.location_name ? String(r.location_name) : null,
          name: String(r.name),
          capacity: Number(r.capacity),
          status: (r.status as Room['status']) ?? 'active',
          allowed_categories:
            Array.isArray(r.allowed_categories)
              ? (r.allowed_categories as string[])
              : null,
          notes: r.notes ? String(r.notes) : null,
          display_order: Number(r.display_order),
          is_active: Boolean(r.is_active),
          current_session: r.session_id
            ? {
                id: String(r.session_id),
                booking_id: r.session_booking_id ? String(r.session_booking_id) : null,
                client_name: String(r.session_client_name ?? ''),
                staff_first_name: r.session_staff_first_name
                  ? String(r.session_staff_first_name)
                  : null,
                staff_last_name: r.session_staff_last_name
                  ? String(r.session_staff_last_name)
                  : null,
                service_label: r.session_service_label
                  ? String(r.session_service_label)
                  : null,
                duration_minutes: dur,
                started_at: started ? started.toISOString() : new Date().toISOString(),
                estimated_end_at: estEnd ?? new Date().toISOString(),
              }
            : null,
        }
      })
    } catch (err) {
      // Table missing — script 600 hasn't been applied yet. Return an
      // explicit hint so the admin UI can render a "migration needed"
      // state instead of looking broken.
      console.warn('[v0] /api/admin/rooms: treatment_rooms missing', err)
      return NextResponse.json({
        rooms: [],
        migrationRequired: true,
      })
    }

    return NextResponse.json({ rooms, migrationRequired: false })
  } catch (err) {
    console.error('[v0] /api/admin/rooms GET error', err)
    return NextResponse.json({ error: 'Failed to load rooms' }, { status: 500 })
  }
}

// POST — create a new room. Admin-only.
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    const body = (await request.json()) as {
      locationId?: string
      name?: string
      capacity?: number
      status?: Room['status']
      allowedCategories?: string[] | null
      notes?: string | null
      displayOrder?: number
    }

    const locationId = (body.locationId || '').trim()
    const name = (body.name || '').trim()
    if (!locationId) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: 'Room name is required' }, { status: 400 })
    }
    if (name.length > 100) {
      return NextResponse.json({ error: 'Room name is too long' }, { status: 400 })
    }
    const capacity = Math.max(1, Math.min(20, Number(body.capacity ?? 1) || 1))
    const status: Room['status'] =
      body.status === 'maintenance' || body.status === 'closed' ? body.status : 'active'
    const allowed = Array.isArray(body.allowedCategories)
      ? body.allowedCategories.filter((c) => typeof c === 'string' && c.trim().length > 0)
      : null
    const notes =
      typeof body.notes === 'string' && body.notes.trim().length > 0
        ? body.notes.trim().slice(0, 500)
        : null
    const displayOrder = Number.isFinite(body.displayOrder) ? Number(body.displayOrder) : 0

    const rows = await sql`
      INSERT INTO treatment_rooms (
        location_id, name, capacity, status, allowed_categories, notes, display_order
      ) VALUES (
        ${locationId}, ${name}, ${capacity}, ${status},
        ${allowed && allowed.length > 0 ? JSON.stringify(allowed) : null}::jsonb,
        ${notes}, ${displayOrder}
      )
      RETURNING id
    `
    return NextResponse.json({ id: String(rows[0].id) })
  } catch (err) {
    console.error('[v0] /api/admin/rooms POST error', err)
    const msg = err instanceof Error ? err.message : 'Failed to create room'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
