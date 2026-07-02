import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'

const VALID_STATUS = new Set([
  'open',
  'under_review',
  'planned',
  'in_progress',
  'shipped',
  'declined',
])

/**
 * Admin/staff triage for a single feature request.
 * PATCH  { status?, adminNote?, pinned? }
 * DELETE removes the request (and its votes via cascade).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminOrStaff()
    const { id } = await params
    const body = await request.json().catch(() => ({}))

    const fields: string[] = []
    // We build the update incrementally so admins can change just the
    // status, just the note, or just the pin without clobbering the rest.
    if (typeof body.status === 'string') {
      if (!VALID_STATUS.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
      }
      await sql`UPDATE feature_requests SET status = ${body.status}, updated_at = NOW() WHERE id = ${id}`
      fields.push('status')
    }
    if (typeof body.adminNote === 'string') {
      const note = body.adminNote.trim().slice(0, 1000)
      await sql`UPDATE feature_requests SET admin_note = ${note || null}, updated_at = NOW() WHERE id = ${id}`
      fields.push('adminNote')
    }
    if (typeof body.pinned === 'boolean') {
      await sql`UPDATE feature_requests SET pinned = ${body.pinned}, updated_at = NOW() WHERE id = ${id}`
      fields.push('pinned')
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    return NextResponse.json({ success: true, updated: fields })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed'
    const status = msg.includes('Unauthorized') ? 403 : 500
    console.error('[FeatureRequests] admin PATCH failed:', err)
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminOrStaff()
    const { id } = await params
    await sql`DELETE FROM feature_requests WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed'
    const status = msg.includes('Unauthorized') ? 403 : 500
    console.error('[FeatureRequests] admin DELETE failed:', err)
    return NextResponse.json({ error: msg }, { status })
  }
}
