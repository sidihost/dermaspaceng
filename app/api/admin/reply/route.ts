import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'
import { sendReplyNotification } from '@/lib/email'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    const {
      requestType,
      requestId,
      userEmail,
      message,
      isInternal,
      // When requestType is 'ticket' we need the public ticket code
      // (e.g. DS-2026-000123) because ticket_responses.ticket_id is a VARCHAR
      // that references support_tickets.ticket_id, not the numeric PK.
      ticketCode,
    } = await request.json()

    if (!requestType || !requestId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['complaint', 'consultation', 'gift_card', 'contact', 'ticket'].includes(requestType)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      )
    }

    // Create the reply. Tickets route to the dedicated ticket_responses table
    // (which feeds the user-facing /dashboard/support thread), everything else
    // stays in admin_replies as before.
    let replyId: string | number
    if (requestType === 'ticket') {
      // Resolve the string ticket_id if the caller passed the numeric id
      let resolvedCode: string | null = ticketCode || null
      if (!resolvedCode) {
        const row = await sql`SELECT ticket_id FROM support_tickets WHERE id = ${Number(requestId)}`
        resolvedCode = row[0]?.ticket_id || null
      }
      if (!resolvedCode) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      }

      // Internal notes aren't surfaced on the user-facing ticket thread — we
      // still save them in admin_replies (with request_type='contact') so
      // they stay discoverable on the admin side without violating the
      // ticket_responses shape (which expects a user-visible message).
      if (isInternal) {
        const noteRes = await sql`
          INSERT INTO admin_replies (request_type, request_id, user_email, staff_id, message, is_internal)
          VALUES ('contact', ${requestId}, ${userEmail || ''}, ${user.id}, ${message}, true)
          RETURNING id
        `
        replyId = noteRes[0].id
      } else {
        const ticketRes = await sql`
          INSERT INTO ticket_responses (ticket_id, responder_type, responder_name, user_id, message, is_staff, created_at)
          VALUES (
            ${resolvedCode},
            ${user.role === 'admin' ? 'admin' : 'staff'},
            ${`${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Support'},
            ${user.id},
            ${message},
            true,
            NOW()
          )
          RETURNING id
        `
        await sql`UPDATE support_tickets SET updated_at = NOW() WHERE ticket_id = ${resolvedCode}`
        replyId = ticketRes[0].id
      }
    } else {
      const result = await sql`
        INSERT INTO admin_replies (request_type, request_id, user_email, staff_id, message, is_internal)
        VALUES (${requestType}, ${requestId}, ${userEmail || ''}, ${user.id}, ${message}, ${isInternal || false})
        RETURNING id
      `
      replyId = result[0].id
    }

    // If not internal, create notification for user (if user_id exists)
    // NOTE: Email + in-app notifications are best-effort — they must never
    // block the reply from being saved. Previously a missing RESEND_API_KEY
    // or a transient email failure would 500 the whole request and the
    // admin would see "reply not working" even though the DB write succeeded.
    if (!isInternal && userEmail) {
      try {
        // Find user by email (so we can both notify in-app and personalize email)
        const userResult = await sql`SELECT id, first_name FROM users WHERE email = ${userEmail}`

        if (userResult.length > 0) {
          try {
            await sql`
              INSERT INTO user_notifications (user_id, title, message, type, reference_type, reference_id)
              VALUES (
                ${userResult[0].id},
                ${`New Reply to Your ${
                  requestType === 'complaint' ? 'Complaint'
                  : requestType === 'consultation' ? 'Consultation'
                  : requestType === 'ticket' ? 'Support Ticket'
                  : 'Request'
                }`},
                ${message.substring(0, 200) + (message.length > 200 ? '...' : '')},
                'reply',
                ${requestType},
                ${requestId.toString()}
              )
            `
          } catch (notifErr) {
            console.error('[v0] Reply notification insert failed:', notifErr)
          }
        }

        // Send email notification (also best-effort).
        // Tickets use their own email path so we only send here for the
        // legacy request types that the email helper actually supports.
        if (requestType === 'gift_card' || requestType === 'complaint' || requestType === 'consultation') {
          try {
            const firstName = userResult[0]?.first_name || 'Customer'
            await sendReplyNotification({
              email: userEmail,
              firstName,
              requestType,
              requestTitle: `${requestType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Request`,
              replyMessage: message,
              responderName: `${user.first_name} ${user.last_name}`
            })
          } catch (emailErr) {
            console.error('[v0] Reply email send failed:', emailErr)
          }
        }
      } catch (sideEffectErr) {
        // Any side-effect failure is logged but must not fail the reply.
        console.error('[v0] Reply side-effect error:', sideEffectErr)
      }
    }

    // Log activity — also wrapped so an activity-log failure can't hide the
    // successful reply from the admin.
    try {
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
    } catch (logErr) {
      console.error('[v0] Activity log insert failed:', logErr)
    }

    return NextResponse.json({
      success: true,
      replyId,
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

    // For tickets we merge the user-facing ticket_responses thread with any
    // internal notes admins filed in admin_replies so both the public replies
    // and the private team notes show up in one conversation list.
    if (requestType === 'ticket') {
      const row = await sql`SELECT ticket_id FROM support_tickets WHERE id = ${parseInt(requestId)}`
      const code = row[0]?.ticket_id
      if (!code) return NextResponse.json({ replies: [] })

      const [threadRows, internalRows] = await Promise.all([
        sql`
          SELECT
            tr.id,
            tr.message,
            tr.is_staff,
            false AS is_internal,
            tr.created_at,
            tr.responder_type,
            COALESCE(u.first_name, SPLIT_PART(tr.responder_name, ' ', 1)) AS staff_first_name,
            COALESCE(u.last_name,  SPLIT_PART(tr.responder_name, ' ', 2)) AS staff_last_name
          FROM ticket_responses tr
          LEFT JOIN users u ON u.id = tr.user_id
          WHERE tr.ticket_id = ${code}
          ORDER BY tr.created_at ASC
        `,
        sql`
          SELECT
            ar.id,
            ar.message,
            true AS is_staff,
            ar.is_internal,
            ar.created_at,
            'staff'::text AS responder_type,
            u.first_name AS staff_first_name,
            u.last_name  AS staff_last_name
          FROM admin_replies ar
          LEFT JOIN users u ON u.id = ar.staff_id
          WHERE ar.request_type = 'contact' AND ar.request_id = ${parseInt(requestId)} AND ar.is_internal = true
          ORDER BY ar.created_at ASC
        `,
      ])

      const replies = [...threadRows, ...internalRows].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      return NextResponse.json({ replies })
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
