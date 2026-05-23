import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

// Soft account deletion (big-tech style):
//   - POST   → file a request, schedule deletion 14 days out
//   - GET    → return current pending request (if any) so the
//              dashboard can show the countdown banner
//   - DELETE → cancel a pending request before the grace expires
//
// We never hard-delete the row from `users` here. A separate
// scheduled job (out of scope for this batch) sweeps requests
// where deletion_scheduled_for < NOW(), anonymises the row, and
// flips the request to 'completed'. Bookings, tickets, and
// payments stay intact for audit / financial compliance.

const GRACE_DAYS = 14

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : null

    // Block re-filing while a request is already pending. The
    // partial unique index would catch this at the DB level too,
    // but a clean 409 is friendlier than letting the constraint
    // fire.
    const existing = await sql`
      SELECT id, deletion_scheduled_for
      FROM account_deletion_requests
      WHERE user_id = ${user.id} AND status = 'pending'
      LIMIT 1
    `
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'A deletion request is already pending', request: existing[0] },
        { status: 409 },
      )
    }

    const xff = request.headers.get('x-forwarded-for')
    const ip = xff ? xff.split(',')[0]?.trim() : null
    const ua = request.headers.get('user-agent')

    const inserted = await sql`
      INSERT INTO account_deletion_requests
        (user_id, reason, status, deletion_scheduled_for, ip_address, user_agent)
      VALUES
        (${user.id}, ${reason}, 'pending', NOW() + (${GRACE_DAYS} || ' days')::interval, ${ip}, ${ua})
      RETURNING id, status, requested_at, deletion_scheduled_for
    `
    return NextResponse.json({ success: true, request: inserted[0] })
  } catch (error) {
    console.error('[account-deletion] POST error', error)
    return NextResponse.json({ error: 'Could not file deletion request' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rows = await sql`
      SELECT id, status, reason, requested_at, deletion_scheduled_for, cancelled_at, completed_at
      FROM account_deletion_requests
      WHERE user_id = ${user.id}
      ORDER BY requested_at DESC
      LIMIT 5
    `
    const pending = rows.find((r) => r.status === 'pending') ?? null
    return NextResponse.json({ pending, history: rows })
  } catch (error) {
    console.error('[account-deletion] GET error', error)
    return NextResponse.json({ error: 'Could not load deletion request' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const updated = await sql`
      UPDATE account_deletion_requests
      SET status = 'cancelled', cancelled_at = NOW()
      WHERE user_id = ${user.id} AND status = 'pending'
      RETURNING id, cancelled_at
    `
    if (updated.length === 0) {
      return NextResponse.json({ error: 'No pending deletion request' }, { status: 404 })
    }
    return NextResponse.json({ success: true, request: updated[0] })
  } catch (error) {
    console.error('[account-deletion] DELETE error', error)
    return NextResponse.json({ error: 'Could not cancel deletion request' }, { status: 500 })
  }
}
