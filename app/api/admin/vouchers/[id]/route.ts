import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

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
    await sql`DELETE FROM vouchers WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/vouchers DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete voucher' }, { status: 500 })
  }
}
