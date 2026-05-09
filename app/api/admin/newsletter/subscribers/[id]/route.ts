import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/*
 * PATCH /api/admin/newsletter/subscribers/[id]
 *
 * Admin-only — flip a subscriber's status. We deliberately keep the
 * surface narrow (status only); editing the email of a subscribed
 * user is an antipattern (audit trail / GDPR confusion) so the admin
 * is expected to delete + re-add instead.
 *
 * Accepted statuses:
 *   active       — re-enable a previously unsubscribed row
 *   unsubscribed — manual unsubscribe (e.g. they emailed us asking)
 *   bounced      — mailer rejected the address
 *
 * DELETE /api/admin/newsletter/subscribers/[id]
 *   Hard-delete the row. Cascades remove campaign-log rows for the
 *   subscriber automatically (FK ON DELETE SET NULL keeps the audit
 *   trail intact even after the row is gone).
 */

const ALLOWED_STATUSES = new Set(['active', 'unsubscribed', 'bounced'])

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const numericId = parseInt(id, 10)
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Invalid subscriber id' }, { status: 400 })
  }

  let body: { status?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const status = (body.status || '').toLowerCase().trim()
  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}` },
      { status: 400 },
    )
  }

  try {
    // unsubscribed_at is stamped only when we transition INTO the
    // unsubscribed state — re-activating a row clears it so the
    // history reads cleanly.
    const rows = await sql`
      UPDATE newsletter_subscribers
      SET status = ${status},
          unsubscribed_at = CASE
            WHEN ${status} = 'unsubscribed' THEN NOW()
            WHEN ${status} = 'active' THEN NULL
            ELSE unsubscribed_at
          END
      WHERE id = ${numericId}
      RETURNING id, email, status
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, subscriber: rows[0] })
  } catch (error) {
    console.error('[newsletter/subscribers PATCH] failed', error)
    return NextResponse.json({ error: 'Failed to update subscriber' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const numericId = parseInt(id, 10)
  if (!Number.isFinite(numericId)) {
    return NextResponse.json({ error: 'Invalid subscriber id' }, { status: 400 })
  }

  try {
    const rows = await sql`
      DELETE FROM newsletter_subscribers
      WHERE id = ${numericId}
      RETURNING id
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Subscriber not found' }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[newsletter/subscribers DELETE] failed', error)
    return NextResponse.json({ error: 'Failed to delete subscriber' }, { status: 500 })
  }
}
