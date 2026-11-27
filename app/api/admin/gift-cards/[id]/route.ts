import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import { ensureGiftCardSchema } from '@/lib/gift-cards'
import { buildGiftCardVerificationCode } from '@/lib/gift-card-verification'

export const dynamic = 'force-dynamic'

/**
 * Admin gift-card detail API.
 *
 * Powers /admin/gift-cards/[id]. Status updates still go through the
 * existing PUT on /api/admin/gift-cards; this route is read-only.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminOrStaff()
    await ensureGiftCardSchema()
    const { id } = await params
    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ error: 'Invalid gift card ID' }, { status: 400 })
    }
    const numericId = Number(id)
    const rows = (await sql`
      SELECT
        gcr.*,
        u.first_name AS assigned_first_name,
        u.last_name AS assigned_last_name
      FROM gift_card_requests gcr
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(gcr.assigned_to AS TEXT)
      WHERE gcr.id = ${numericId}
      LIMIT 1
    `) as Array<Record<string, unknown>>
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Gift card request not found' }, { status: 404 })
    }
    let verificationCode: string | null = null
    try {
      verificationCode = buildGiftCardVerificationCode(numericId)
    } catch (err) {
      console.warn('[admin/gift-cards/id] verification_code skipped:', err instanceof Error ? err.message : err)
    }
    return NextResponse.json({
      request: {
        ...rows[0],
        amount: Number(rows[0].amount ?? 0),
        verification_code: verificationCode,
      },
    })
  } catch (error) {
    console.error('Get gift-card detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch gift card'
    const lower = message.toLowerCase()
    const status = lower.includes('forbidden') || lower.includes('admin')
      ? 403
      : lower.includes('unauthorized')
        ? 401
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}
