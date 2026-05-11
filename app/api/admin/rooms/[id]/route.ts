import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export const dynamic = 'force-dynamic'

// PATCH — update any subset of room fields (rename, status, capacity,
// notes, allowed categories, display order). All admin-only.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = (await request.json()) as Record<string, unknown>

    // Build a dynamic UPDATE so we only touch columns the caller
    // actually sent. Whitelist column names to keep the dynamic
    // interpolation safe.
    const allowedColumns = [
      'name',
      'capacity',
      'status',
      'notes',
      'display_order',
      'allowed_categories',
    ] as const
    type Col = (typeof allowedColumns)[number]

    const updates: Partial<Record<Col, unknown>> = {}
    if (typeof body.name === 'string') {
      const v = body.name.trim()
      if (!v) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      if (v.length > 100) return NextResponse.json({ error: 'Name too long' }, { status: 400 })
      updates.name = v
    }
    if (body.capacity !== undefined) {
      const cap = Math.max(1, Math.min(20, Number(body.capacity) || 1))
      updates.capacity = cap
    }
    if (typeof body.status === 'string') {
      if (!['active', 'maintenance', 'closed'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }
    if (Object.prototype.hasOwnProperty.call(body, 'notes')) {
      const raw = body.notes
      updates.notes =
        typeof raw === 'string' && raw.trim().length > 0 ? raw.trim().slice(0, 500) : null
    }
    if (body.displayOrder !== undefined) {
      updates.display_order = Number.isFinite(Number(body.displayOrder))
        ? Number(body.displayOrder)
        : 0
    }
    if (Object.prototype.hasOwnProperty.call(body, 'allowedCategories')) {
      const raw = body.allowedCategories
      if (raw === null) {
        updates.allowed_categories = null
      } else if (Array.isArray(raw)) {
        const cleaned = raw.filter((c) => typeof c === 'string' && c.trim().length > 0)
        updates.allowed_categories = cleaned.length > 0 ? cleaned : null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Apply updates one column at a time so we keep using neon's
    // tagged-template binding (no string concat into SQL).
    if ('name' in updates) {
      await sql`UPDATE treatment_rooms SET name = ${updates.name as string}, updated_at = NOW() WHERE id = ${id}`
    }
    if ('capacity' in updates) {
      await sql`UPDATE treatment_rooms SET capacity = ${updates.capacity as number}, updated_at = NOW() WHERE id = ${id}`
    }
    if ('status' in updates) {
      await sql`UPDATE treatment_rooms SET status = ${updates.status as string}, updated_at = NOW() WHERE id = ${id}`
    }
    if ('notes' in updates) {
      await sql`UPDATE treatment_rooms SET notes = ${updates.notes as string | null}, updated_at = NOW() WHERE id = ${id}`
    }
    if ('display_order' in updates) {
      await sql`UPDATE treatment_rooms SET display_order = ${updates.display_order as number}, updated_at = NOW() WHERE id = ${id}`
    }
    if ('allowed_categories' in updates) {
      const v = updates.allowed_categories
      await sql`UPDATE treatment_rooms SET allowed_categories = ${v === null ? null : JSON.stringify(v)}::jsonb, updated_at = NOW() WHERE id = ${id}`
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[v0] /api/admin/rooms/[id] PATCH error', err)
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 })
  }
}

// DELETE — soft delete via is_active = false so historical session
// rows keep their FK target. Admin-only.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params

    // Don't allow deletion if there's a live session. The admin should
    // first end that session from the live board.
    const live = await sql`
      SELECT id FROM room_sessions
      WHERE room_id = ${id} AND status = 'in_progress'
      LIMIT 1
    `
    if (live.length > 0) {
      return NextResponse.json(
        { error: 'Room has an active session. End it before deleting.' },
        { status: 409 },
      )
    }

    await sql`UPDATE treatment_rooms SET is_active = FALSE, updated_at = NOW() WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[v0] /api/admin/rooms/[id] DELETE error', err)
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 })
  }
}
