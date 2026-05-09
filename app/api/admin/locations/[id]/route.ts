import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

// Time strings on this table are 24h "HH:MM". Stricter than ISO so
// the admin can't accidentally save "9:0" or "9 PM" through the
// custom availability form.
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * PATCH /api/admin/locations/[id]
 *
 * Partial update of a single `booking_locations` row from the admin
 * Availability page. Every field is optional so the UI can save just
 * the bits it changed — flipping a branch off shouldn't require
 * resending the address.
 *
 * Validation rules (mirrors what the booking pipeline assumes):
 *   • opens_at, closes_at      — "HH:MM" 24h, opens < closes.
 *   • open_days                — array of 0..6 weekday numbers.
 *   • slot_minutes             — between 5 and 240.
 *   • slots_per_window         — between 1 and 50.
 *
 * On success, returns the freshly updated row so the client can
 * reconcile optimistic UI without a follow-up GET.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = (await request.json()) as Partial<{
      name: string
      address: string
      phone: string
      whatsapp: string
      opens_at: string
      closes_at: string
      open_days: number[]
      slot_minutes: number
      slots_per_window: number
      is_active: boolean
    }>

    if (body.opens_at && !TIME_RE.test(body.opens_at)) {
      return NextResponse.json({ error: 'opens_at must be HH:MM (24h).' }, { status: 400 })
    }
    if (body.closes_at && !TIME_RE.test(body.closes_at)) {
      return NextResponse.json({ error: 'closes_at must be HH:MM (24h).' }, { status: 400 })
    }
    if (
      body.opens_at &&
      body.closes_at &&
      body.opens_at >= body.closes_at
    ) {
      return NextResponse.json(
        { error: 'Opens-at must be earlier than closes-at.' },
        { status: 400 },
      )
    }
    if (body.open_days) {
      const valid = body.open_days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      if (!valid) {
        return NextResponse.json(
          { error: 'open_days must be an array of 0..6 weekday numbers.' },
          { status: 400 },
        )
      }
    }
    if (body.slot_minutes !== undefined) {
      if (!Number.isInteger(body.slot_minutes) || body.slot_minutes < 5 || body.slot_minutes > 240) {
        return NextResponse.json(
          { error: 'slot_minutes must be an integer between 5 and 240.' },
          { status: 400 },
        )
      }
    }
    if (body.slots_per_window !== undefined) {
      if (!Number.isInteger(body.slots_per_window) || body.slots_per_window < 1 || body.slots_per_window > 50) {
        return NextResponse.json(
          { error: 'slots_per_window must be an integer between 1 and 50.' },
          { status: 400 },
        )
      }
    }

    // open_days is stored as a comma-separated string in Postgres so
    // we serialise here (sorted, de-duped) to keep the column tidy.
    const openDaysCsv =
      body.open_days !== undefined
        ? Array.from(new Set(body.open_days)).sort().join(',')
        : undefined

    // We use a single UPDATE with COALESCE on every column so the
    // route stays a one-shot DB hit. Fields the client didn't send
    // come through as `undefined` (translated to NULL by neon) and
    // COALESCE keeps the existing value.
    const rows = (await sql`
      UPDATE booking_locations SET
        name             = COALESCE(${body.name ?? null}, name),
        address          = COALESCE(${body.address ?? null}, address),
        phone            = COALESCE(${body.phone ?? null}, phone),
        whatsapp         = COALESCE(${body.whatsapp ?? null}, whatsapp),
        opens_at         = COALESCE(${body.opens_at ?? null}, opens_at),
        closes_at        = COALESCE(${body.closes_at ?? null}, closes_at),
        open_days        = COALESCE(${openDaysCsv ?? null}, open_days),
        slot_minutes     = COALESCE(${body.slot_minutes ?? null}, slot_minutes),
        slots_per_window = COALESCE(${body.slots_per_window ?? null}, slots_per_window),
        is_active        = COALESCE(${body.is_active ?? null}, is_active),
        updated_at       = NOW()
      WHERE id = ${id}
      RETURNING id, name, address, phone, whatsapp,
                opens_at, closes_at, open_days,
                slot_minutes, slots_per_window,
                is_active, image_url, display_order
    `) as Array<Record<string, unknown>>

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Location not found.' }, { status: 404 })
    }

    return NextResponse.json({ location: rows[0] })
  } catch (error) {
    console.error('[admin.locations.PATCH] failed', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to update location: ${message}` },
      { status: 500 },
    )
  }
}
