import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  deliverGiftCardToRecipient,
  ensureGiftCardSchema,
} from '@/lib/gift-cards'
import { buildGiftCardVerificationCode } from '@/lib/gift-card-verification'

export const dynamic = 'force-dynamic'

function authErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('forbidden')) return 403
  if (message.includes('unauthorized')) return 401
  return 500
}

function safeBuildVerificationCode(id: number): string | null {
  try {
    return buildGiftCardVerificationCode(id)
  } catch (err) {
    console.warn('[admin/gift-cards] verification_code skipped (signing secret unavailable):', err instanceof Error ? err.message : err)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()
    await ensureGiftCardSchema()

    const searchParams = request.nextUrl.searchParams
    const status = (searchParams.get('status') || '').trim()
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10) || 20))
    const offset = (page - 1) * limit

    const requests = (await sql`
      SELECT
        gcr.*,
        u.first_name AS assigned_first_name,
        u.last_name AS assigned_last_name
      FROM gift_card_requests gcr
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(gcr.assigned_to AS TEXT)
      WHERE (${status} = '' OR COALESCE(gcr.status, 'pending') = ${status || 'pending'})
      ORDER BY gcr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `) as Array<Record<string, unknown>>

    const countResult = (await sql`
      SELECT COUNT(*) AS total FROM gift_card_requests
      WHERE (${status} = '' OR COALESCE(status, 'pending') = ${status || 'pending'})
    `) as Array<{ total?: string | number }>

    const statusCounts = (await sql`
      SELECT
        COALESCE(status, 'pending') AS status,
        COUNT(*) AS count
      FROM gift_card_requests
      GROUP BY COALESCE(status, 'pending')
    `) as Array<{ status: string | null; count: string | number }>

    const total = Number(countResult[0]?.total ?? 0)
    const enrichedRequests = requests.map((row) => ({
      ...row,
      amount: Number(row.amount ?? 0),
      verification_code: safeBuildVerificationCode(Number(row.id)),
    }))

    return NextResponse.json({
      requests: enrichedRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: statusCounts.reduce((acc, row) => {
        acc[row.status || 'pending'] = Number(row.count ?? 0)
        return acc
      }, {} as Record<string, number>),
    })
  } catch (error) {
    console.error('Get gift cards error:', error)
    const status = authErrorStatus(error)
    return NextResponse.json(
      { error: status !== 500 && error instanceof Error ? error.message : 'Failed to fetch gift card requests' },
      { status },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    await ensureGiftCardSchema()

    const { requestId, action, value, notes } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      )
    }

    const numericId = Number(requestId)
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: 'Invalid gift card request ID' },
        { status: 400 },
      )
    }

    let recipientEmailSent = false

    switch (action) {
      case 'update_status': {
        if (!['pending', 'processing', 'approved', 'rejected', 'completed'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        const updated = (await sql`
          UPDATE gift_card_requests
          SET status = ${value}, updated_at = NOW()
          WHERE id = ${numericId}
          RETURNING id, delivery_method, recipient_notified_at
        `) as Array<{
          id: number
          delivery_method: string | null
          recipient_notified_at: string | null
        }>
        if (updated.length === 0) {
          return NextResponse.json({ error: 'Gift card request not found' }, { status: 404 })
        }
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'gift_card_status_changed', 'gift_card', ${String(numericId)}, ${`Status changed to ${value}`})
        `.catch(() => {})

        if (
          (value === 'approved' || value === 'completed') &&
          !updated[0].recipient_notified_at &&
          String(updated[0].delivery_method || 'email').toLowerCase() !== 'download'
        ) {
          const delivery = await deliverGiftCardToRecipient(numericId)
          recipientEmailSent = delivery.sent
        }
        break
      }

      case 'assign': {
        await sql`
          UPDATE gift_card_requests
          SET assigned_to = ${value != null ? String(value) : null}, updated_at = NOW()
          WHERE id = ${numericId}
        `
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'gift_card_assigned', 'gift_card', ${String(numericId)}, 'Gift card request assigned')
        `.catch(() => {})
        break
      }

      case 'add_notes': {
        await sql`
          UPDATE gift_card_requests
          SET notes = ${notes ?? null}, updated_at = NOW()
          WHERE id = ${numericId}
        `
        break
      }

      case 'send_to_recipient': {
        const delivery = await deliverGiftCardToRecipient(numericId, { force: true })
        if (!delivery.record) {
          return NextResponse.json({ error: 'Gift card request not found' }, { status: 404 })
        }
        if (!delivery.record.recipient_email || !delivery.record.recipient_email.includes('@')) {
          return NextResponse.json(
            { error: 'Recipient does not have a valid email address' },
            { status: 400 },
          )
        }
        if (!delivery.sent) {
          return NextResponse.json(
            { error: 'Could not send recipient email. Please verify email configuration and try again.' },
            { status: 502 },
          )
        }
        recipientEmailSent = true
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'gift_card_sent_to_recipient', 'gift_card', ${String(numericId)}, ${`Gift card emailed to ${delivery.record.recipient_email}`})
        `.catch(() => {})
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const refreshed = (await sql`
      SELECT
        gcr.*,
        u.first_name AS assigned_first_name,
        u.last_name AS assigned_last_name
      FROM gift_card_requests gcr
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(gcr.assigned_to AS TEXT)
      WHERE gcr.id = ${numericId}
      LIMIT 1
    `) as Array<Record<string, unknown>>

    const refreshedRow = refreshed[0]
      ? {
          ...refreshed[0],
          amount: Number(refreshed[0].amount ?? 0),
          verification_code: safeBuildVerificationCode(Number(refreshed[0].id)),
        }
      : null

    return NextResponse.json({
      success: true,
      request: refreshedRow,
      recipientEmailSent,
    })
  } catch (error) {
    console.error('Update gift card error:', error)
    const status = authErrorStatus(error)
    return NextResponse.json(
      { error: status !== 500 && error instanceof Error ? error.message : 'Failed to update gift card request' },
      { status },
    )
  }
}
