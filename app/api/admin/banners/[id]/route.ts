import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { invalidatePrefix, KEYS } from '@/lib/redis'

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    const body = await request.json()
    await sql`
      UPDATE notification_banners SET
        message     = COALESCE(${body.message ?? null}, message),
        link_url    = COALESCE(${body.link_url ?? null}, link_url),
        link_text   = COALESCE(${body.link_text ?? null}, link_text),
        variant     = COALESCE(${body.variant ?? null}, variant),
        scope       = COALESCE(${body.scope ?? null}, scope),
        is_active   = COALESCE(${typeof body.is_active === 'boolean' ? body.is_active : null}, is_active),
        starts_at   = COALESCE(${body.starts_at ?? null}, starts_at),
        ends_at     = COALESCE(${body.ends_at ?? null}, ends_at),
        dismissible = COALESCE(${typeof body.dismissible === 'boolean' ? body.dismissible : null}, dismissible),
        updated_at  = NOW()
      WHERE id = ${id}
    `
    await invalidatePrefix(KEYS.banners)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/banners PATCH]', err)
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await ctx.params
    await sql`DELETE FROM notification_banners WHERE id = ${id}`
    await invalidatePrefix(KEYS.banners)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/banners DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 })
  }
}
