import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import { notifyUser } from '@/lib/notifications'

const VALID_STATUS = new Set([
  'open',
  'under_review',
  'planned',
  'in_progress',
  'shipped',
  'declined',
])

// Friendly, customer-facing labels for each pipeline stage. Used in the
// notification copy so the author reads "moved to Under review" rather
// than the raw enum value.
const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  under_review: 'Under review',
  planned: 'Planned',
  in_progress: 'In progress',
  shipped: 'Shipped',
  declined: 'Not planned',
}

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

    // Snapshot the current row first so we can (a) address the notification
    // to the right author and (b) only notify when something actually
    // changed (e.g. don't re-notify if the admin re-saves the same note).
    const [current] = (await sql`
      SELECT user_id, title, status, admin_note FROM feature_requests WHERE id = ${id}
    `) as unknown as Array<{
      user_id: string
      title: string
      status: string
      admin_note: string | null
    }>

    if (!current) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    }

    const fields: string[] = []
    let statusChangedTo: string | null = null
    let responsePosted = false

    // We build the update incrementally so admins can change just the
    // status, just the note, or just the pin without clobbering the rest.
    if (typeof body.status === 'string') {
      if (!VALID_STATUS.has(body.status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
      }
      await sql`UPDATE feature_requests SET status = ${body.status}, updated_at = NOW() WHERE id = ${id}`
      fields.push('status')
      if (body.status !== current.status) statusChangedTo = body.status
    }
    if (typeof body.adminNote === 'string') {
      const note = body.adminNote.trim().slice(0, 1000)
      await sql`UPDATE feature_requests SET admin_note = ${note || null}, updated_at = NOW() WHERE id = ${id}`
      fields.push('adminNote')
      // Only counts as a "team response" when there's actual text and it
      // differs from what the author has already been told.
      if (note && note !== (current.admin_note ?? '').trim()) responsePosted = true
    }
    if (typeof body.pinned === 'boolean') {
      await sql`UPDATE feature_requests SET pinned = ${body.pinned}, updated_at = NOW() WHERE id = ${id}`
      fields.push('pinned')
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
    }

    // Fan out an in-app + push notification to the idea's author. Fail-soft:
    // a notification hiccup must never break the admin's save.
    if (current.user_id && (responsePosted || statusChangedTo)) {
      const actionUrl = `/feature-requests/${id}`
      try {
        if (responsePosted) {
          await notifyUser({
            userId: current.user_id,
            title: 'The team replied to your idea',
            message: `Dermaspace responded to \u201C${current.title}\u201D. Tap to read the update.`,
            type: 'reply',
            referenceType: 'feature_request',
            referenceId: id,
            actionUrl,
            priority: 'normal',
          })
        } else if (statusChangedTo) {
          const label = STATUS_LABEL[statusChangedTo] ?? statusChangedTo
          await notifyUser({
            userId: current.user_id,
            title: `Your idea is now \u201C${label}\u201D`,
            message: `\u201C${current.title}\u201D moved to ${label}. Tap to see the details.`,
            type: 'status_update',
            referenceType: 'feature_request',
            referenceId: id,
            actionUrl,
            priority: 'normal',
          })
        }
      } catch (err) {
        console.error('[FeatureRequests] author notify failed:', err)
      }
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
