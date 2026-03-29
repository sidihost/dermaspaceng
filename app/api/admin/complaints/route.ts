import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''
    const priority = searchParams.get('priority') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const complaints = await sql`
      SELECT 
        cm.*,
        u.first_name as assigned_first_name,
        u.last_name as assigned_last_name
      FROM contact_messages cm
      LEFT JOIN users u ON u.id = cm.assigned_to
      WHERE 
        (${status} = '' OR cm.status = ${status || 'open'})
        AND (${priority} = '' OR cm.priority = ${priority || 'normal'})
      ORDER BY 
        CASE cm.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'normal' THEN 3 
          WHEN 'low' THEN 4 
        END,
        cm.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as total FROM contact_messages
      WHERE 
        (${status} = '' OR status = ${status || 'open'})
        AND (${priority} = '' OR priority = ${priority || 'normal'})
    `

    // Get status counts
    const statusCounts = await sql`
      SELECT status, COUNT(*) as count
      FROM contact_messages
      GROUP BY status
    `

    return NextResponse.json({
      complaints,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit)
      },
      statusCounts: statusCounts.reduce((acc, row) => {
        acc[row.status || 'open'] = Number(row.count)
        return acc
      }, {} as Record<string, number>)
    })
  } catch (error) {
    console.error('Get complaints error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch complaints' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    const { complaintId, action, value } = await request.json()

    if (!complaintId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_status':
        if (!['open', 'in_progress', 'resolved', 'closed'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        await sql`
          UPDATE contact_messages 
          SET status = ${value}, updated_at = NOW(),
              resolved_at = ${value === 'resolved' || value === 'closed' ? sql`NOW()` : null}
          WHERE id = ${complaintId}
        `
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'complaint_status_changed', 'complaint', ${complaintId}, ${`Status changed to ${value}`})
        `
        break

      case 'update_priority':
        if (!['low', 'normal', 'high', 'urgent'].includes(value)) {
          return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
        }
        await sql`
          UPDATE contact_messages 
          SET priority = ${value}, updated_at = NOW()
          WHERE id = ${complaintId}
        `
        break

      case 'assign':
        await sql`
          UPDATE contact_messages 
          SET assigned_to = ${value}, updated_at = NOW()
          WHERE id = ${complaintId}
        `
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update complaint error:', error)
    return NextResponse.json(
      { error: 'Failed to update complaint' },
      { status: 500 }
    )
  }
}
