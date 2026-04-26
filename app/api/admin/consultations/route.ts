import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'
// Per-event reminder cancel: when admin moves a consultation to
// 'cancelled' or 'completed', kill the pending 1h-before reminder
// so we don't email "your consultation starts soon" for a slot that
// is already over / cancelled.
import { cancelConsultationReminder } from '@/lib/reminders'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const consultations = await sql`
      SELECT 
        c.*,
        u.first_name as assigned_first_name,
        u.last_name as assigned_last_name
      FROM consultations c
      LEFT JOIN users u ON u.id = c.assigned_to
      WHERE (${status} = '' OR c.status = ${status || 'pending'})
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as total FROM consultations
      WHERE (${status} = '' OR status = ${status || 'pending'})
    `

    const statusCounts = await sql`
      SELECT status, COUNT(*) as count
      FROM consultations
      GROUP BY status
    `

    return NextResponse.json({
      consultations,
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
    console.error('Get consultations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    const { consultationId, action, value, notes } = await request.json()

    if (!consultationId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_status':
        if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        await sql`
          UPDATE consultations 
          SET status = ${value}, updated_at = NOW()
          WHERE id = ${consultationId}
        `
        // Tear down the pending 1h-before reminder when the
        // consultation will no longer happen. We deliberately don't
        // cancel for 'confirmed' (the appointment is still on) or
        // 'pending' (the user could yet keep the slot).
        if (value === 'cancelled' || value === 'completed') {
          await cancelConsultationReminder(consultationId)
        }
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'consultation_status_changed', 'consultation', ${consultationId}, ${`Status changed to ${value}`})
        `
        break

      case 'assign':
        await sql`
          UPDATE consultations 
          SET assigned_to = ${value}, updated_at = NOW()
          WHERE id = ${consultationId}
        `
        break

      case 'add_notes':
        await sql`
          UPDATE consultations 
          SET admin_notes = ${notes}, updated_at = NOW()
          WHERE id = ${consultationId}
        `
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update consultation error:', error)
    return NextResponse.json(
      { error: 'Failed to update consultation' },
      { status: 500 }
    )
  }
}
