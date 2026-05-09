import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff, getCurrentUser } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
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
    return NextResponse.json(
      { error: 'Failed to fetch gift card requests' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    const { requestId, action, value, notes } = await request.json()

    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_status':
        if (!['pending', 'processing', 'approved', 'rejected', 'completed'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        await sql`
          UPDATE gift_card_requests 
          SET status = ${value}, updated_at = NOW() 
          WHERE id = ${requestId}
        `
        // Log activity
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'gift_card_status_changed', 'gift_card', ${requestId}, ${`Status changed to ${value}`})
        `
        break

      case 'assign':
        await sql`
          UPDATE gift_card_requests 
          SET assigned_to = ${value}, updated_at = NOW() 
          WHERE id = ${requestId}
        `
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'gift_card_assigned', 'gift_card', ${requestId}, 'Gift card request assigned')
        `
        break

      case 'add_notes':
        await sql`
          UPDATE gift_card_requests 
          SET notes = ${notes}, updated_at = NOW() 
          WHERE id = ${requestId}
        `
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update gift card error:', error)
    return NextResponse.json(
      { error: 'Failed to update gift card request' },
      { status: 500 }
    )
  }
}
