import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    const { requestType, requestId, userEmail, message, isInternal } = await request.json()

    if (!requestType || !requestId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['complaint', 'consultation', 'gift_card', 'contact'].includes(requestType)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      )
    }

    // Create the reply
    const result = await sql`
      INSERT INTO admin_replies (request_type, request_id, user_email, staff_id, message, is_internal)
      VALUES (${requestType}, ${requestId}, ${userEmail || ''}, ${user.id}, ${message}, ${isInternal || false})
      RETURNING id
    `

    // If not internal, create notification for user (if user_id exists)
    if (!isInternal && userEmail) {
      // Find user by email
      const userResult = await sql`SELECT id FROM users WHERE email = ${userEmail}`
      if (userResult.length > 0) {
        await sql`
          INSERT INTO user_notifications (user_id, title, message, type, reference_type, reference_id)
          VALUES (
            ${userResult[0].id}, 
            'New Reply to Your ${requestType === 'complaint' ? 'Complaint' : requestType === 'consultation' ? 'Consultation' : 'Request'}',
            ${message.substring(0, 200)}${message.length > 200 ? '...' : ''},
            'reply',
            ${requestType},
            ${requestId}
          )
        `
      }

      // TODO: Send email notification
      // await sendReplyNotificationEmail({ email: userEmail, message, requestType })
    }

    // Log activity
    await sql`
      INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
      VALUES (
        ${user.id}, 
        ${isInternal ? 'internal_note_added' : 'reply_sent'}, 
        ${requestType}, 
        ${requestId.toString()}, 
        ${isInternal ? 'Internal note added' : 'Reply sent to user'}
      )
    `

    return NextResponse.json({ 
      success: true, 
      replyId: result[0].id 
    })
  } catch (error) {
    console.error('Create reply error:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const searchParams = request.nextUrl.searchParams
    const requestType = searchParams.get('requestType')
    const requestId = searchParams.get('requestId')

    if (!requestType || !requestId) {
      return NextResponse.json(
        { error: 'Missing request type or ID' },
        { status: 400 }
      )
    }

    const replies = await sql`
      SELECT 
        ar.*,
        u.first_name as staff_first_name,
        u.last_name as staff_last_name
      FROM admin_replies ar
      LEFT JOIN users u ON u.id = ar.staff_id
      WHERE ar.request_type = ${requestType} AND ar.request_id = ${parseInt(requestId)}
      ORDER BY ar.created_at ASC
    `

    return NextResponse.json({ replies })
  } catch (error) {
    console.error('Get replies error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    )
  }
}
