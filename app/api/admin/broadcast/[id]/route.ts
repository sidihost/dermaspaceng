/**
 * Per-broadcast actions:
 *   PATCH  { action: 'cancel' | 'send_now' }
 *   DELETE — remove a draft / cancelled / failed broadcast row
 *
 * Sent broadcasts are kept as audit history and can't be deleted.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { dispatchBroadcast } from '@/lib/broadcast-dispatcher'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const body = await request.json()

    if (body.action === 'cancel') {
      const updated = (await sql`
        UPDATE notification_broadcasts
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${id} AND status IN ('scheduled', 'draft')
        RETURNING id
      `) as unknown as { id: string }[]
      if (!updated.length) {
        return NextResponse.json(
          { error: 'Only scheduled or draft broadcasts can be cancelled' },
          { status: 400 },
        )
      }
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'send_now') {
      const r = await dispatchBroadcast(id)
      return NextResponse.json({
        ok: true,
        recipients: r.recipients,
        push: { sent: r.pushSent, removed: r.pushRemoved },
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    console.error('[admin/broadcast PATCH]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    await sql`
      DELETE FROM notification_broadcasts
      WHERE id = ${id} AND status IN ('draft', 'cancelled', 'failed')
    `
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
