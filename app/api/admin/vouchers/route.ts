import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    await requireAdmin()
    const vouchers = await sql`
      SELECT v.*,
        (SELECT COUNT(*) FROM voucher_redemptions r WHERE r.voucher_id = v.id)::int AS redemption_count
      FROM vouchers v
      ORDER BY v.created_at DESC
    `
    return NextResponse.json({ vouchers })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const code = String(body.code || '').trim().toUpperCase()
    if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    if (!body.value || isNaN(Number(body.value))) {
      return NextResponse.json({ error: 'Value is required' }, { status: 400 })
    }

    const type = body.type === 'fixed' ? 'fixed' : 'percent'

    try {
      const rows = await sql`
        INSERT INTO vouchers (
          code, label, description, type, value, max_discount, min_amount,
          max_uses, per_user_limit, applies_to, starts_at, expires_at,
          is_active, created_by
        ) VALUES (
          ${code},
          ${body.label ?? null},
          ${body.description ?? null},
          ${type},
          ${Number(body.value)},
          ${body.max_discount != null && body.max_discount !== '' ? Number(body.max_discount) : null},
          ${body.min_amount != null && body.min_amount !== '' ? Number(body.min_amount) : 0},
          ${body.max_uses != null && body.max_uses !== '' ? Number(body.max_uses) : null},
          ${body.per_user_limit != null && body.per_user_limit !== '' ? Number(body.per_user_limit) : 1},
          ${body.applies_to ?? 'all'},
          ${body.starts_at ?? null},
          ${body.expires_at ?? null},
          ${body.is_active !== false},
          ${admin.id}
        )
        RETURNING id
      `
      return NextResponse.json({ id: rows[0].id })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('duplicate')) {
        return NextResponse.json({ error: 'A voucher with this code already exists' }, { status: 409 })
      }
      throw err
    }
  } catch (err) {
    console.error('[admin/vouchers POST]', err)
    return NextResponse.json({ error: 'Failed to create voucher' }, { status: 500 })
  }
}
