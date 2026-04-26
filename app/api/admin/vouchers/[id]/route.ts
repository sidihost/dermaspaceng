import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
// Per-event QStash reminder helpers — keep the scheduled "expires
// tomorrow" message in sync with the voucher's actual expiry date,
// and tear it down on delete. Both are fail-soft.
import { rescheduleVoucherExpiry, cancelVoucherExpiry } from '@/lib/reminders'

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    await sql`
      UPDATE vouchers SET
        label          = COALESCE(${body.label ?? null}, label),
        description    = COALESCE(${body.description ?? null}, description),
        value          = COALESCE(${body.value != null ? Number(body.value) : null}, value),
        max_discount   = COALESCE(${body.max_discount != null && body.max_discount !== '' ? Number(body.max_discount) : null}, max_discount),
        min_amount     = COALESCE(${body.min_amount != null && body.min_amount !== '' ? Number(body.min_amount) : null}, min_amount),
        max_uses       = COALESCE(${body.max_uses != null && body.max_uses !== '' ? Number(body.max_uses) : null}, max_uses),
        per_user_limit = COALESCE(${body.per_user_limit != null && body.per_user_limit !== '' ? Number(body.per_user_limit) : null}, per_user_limit),
        applies_to     = COALESCE(${body.applies_to ?? null}, applies_to),
        starts_at      = COALESCE(${body.starts_at ?? null}, starts_at),
        expires_at     = COALESCE(${body.expires_at ?? null}, expires_at),
        is_active      = COALESCE(${typeof body.is_active === 'boolean' ? body.is_active : null}, is_active),
        updated_at     = NOW()
      WHERE id = ${id}
    `

    // If the admin touched expires_at OR explicitly toggled is_active
    // to false, reconcile the QStash reminder. We re-read the current
    // row state so the reminder lines up with what's actually in the
    // DB after COALESCE collapsed any partial update.
    if (body.expires_at !== undefined || typeof body.is_active === 'boolean') {
      try {
        const rows = (await sql`
          SELECT expires_at, is_active FROM vouchers WHERE id = ${id} LIMIT 1
        `) as { expires_at: string | null; is_active: boolean }[]
        const row = rows[0]
        if (!row || !row.is_active) {
          // Voucher deactivated — kill any pending reminder.
          await cancelVoucherExpiry(id)
        } else {
          // Active voucher — sync reminder to current expires_at.
          // Helper cancels any prior message before scheduling fresh.
          await rescheduleVoucherExpiry(id, row.expires_at)
        }
      } catch (err) {
        // Non-fatal: failure here just means the reminder is
        // momentarily out of sync. The PATCH itself already succeeded.
        console.warn('[admin/vouchers PATCH] reminder sync failed:', err)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/vouchers PATCH]', err)
    return NextResponse.json({ error: 'Failed to update voucher' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    // Cancel the pending reminder BEFORE we drop the row — otherwise
    // the dispatch handler would log a "voucher not found" warning
    // when QStash eventually delivers.
    await cancelVoucherExpiry(id)
    await sql`DELETE FROM vouchers WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/vouchers DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete voucher' }, { status: 500 })
  }
}
