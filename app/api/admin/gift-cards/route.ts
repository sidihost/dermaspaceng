import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  deliverGiftCardToRecipient,
  ensureGiftCardSchema,
} from '@/lib/gift-cards'

const sql = neon(process.env.DATABASE_URL!)

function authErrorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message.toLowerCase() : ''
  if (message.includes('forbidden')) return 403
  if (message.includes('unauthorized')) return 401
  return 500
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()
    await ensureGiftCardSchema()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20') || 20))
    const offset = (page - 1) * limit

    const requests = await sql`
      SELECT 
        gcr.*,
        u.first_name as assigned_first_name,
        u.last_name as assigned_last_name
      FROM gift_card_requests gcr
      LEFT JOIN users u ON u.id = gcr.assigned_to
      WHERE (${status} = '' OR gcr.status = ${status || 'pending'})
      ORDER BY gcr.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as total FROM gift_card_requests
      WHERE (${status} = '' OR status = ${status || 'pending'})
    `

    // Get status counts
    const statusCounts = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM gift_card_requests
      GROUP BY status
    `

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit)
      },
      statusCounts: statusCounts.reduce((acc, row) => {
        acc[row.status || 'pending'] = Number(row.count)
        return acc
      }, {} as Record<string, number>)
    })
  } catch (error) {
    console.error('Get gift cards error:', error)
    const status = authErrorStatus(error)
    return NextResponse.json(
      { error: status !== 500 && error instanceof Error ? error.message : 'Failed to fetch gift card requests' },
      { status }
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
        { status: 400 }
      )
    }

    const numericId = Number(requestId)
    if (!Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json(
        { error: 'Invalid gift card request ID' },
        { status: 400 }
      )
    }

    let recipientEmailSent = false

    switch (action) {
      case 'update_status': {
        if (!['pending', 'processing', 'approved', 'rejected', 'completed'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        const updated = await sql`
          UPDATE gift_card_requests 
          SET status = ${value}, updated_at = NOW() 
          WHERE id = ${numericId}
          RETURNING id, delivery_method, recipient_notified_at
        `
        if (updated.length === 0) {
          return NextResponse.json({ error: 'Gift card request not found' }, { status: 404 })
        }
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'gift_card_status_changed', 'gift_card', ${numericId}, ${`Status changed to ${value}`})
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
          SET assigned_to = ${value}, updated_at = NOW() 
          WHERE id = ${numericId}
        `
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'gift_card_assigned', 'gift_card', ${numericId}, 'Gift card request assigned')
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
          VALUES (${user.id}, 'gift_card_sent_to_recipient', 'gift_card', ${numericId}, ${`Gift card emailed to ${delivery.record.recipient_email}`})
        `.catch(() => {})
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const refreshed = await sql`
      SELECT
        gcr.*,
        u.first_name AS assigned_first_name,
        u.last_name AS assigned_last_name
      FROM gift_card_requests gcr
      LEFT JOIN users u ON u.id = gcr.assigned_to
      WHERE gcr.id = ${numericId}
      LIMIT 1
    `

    return NextResponse.json({
      success: true,
      request: refreshed[0] ?? null,
      recipientEmailSent,
    })
  } catch (error) {
    console.error('Update gift card error:', error)
    const status = authErrorStatus(error)
    return NextResponse.json(
      { error: status !== 500 && error instanceof Error ? error.message : 'Failed to update gift card request' },
      { status }
    )
  }
}
