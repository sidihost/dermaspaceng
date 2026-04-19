import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendTicketConfirmation } from '@/lib/email'

// Generate ticket ID: DS-YYYY-XXXXXX
function generateTicketId(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `DS-${year}-${random}`
}

// GET - Fetch user's tickets
export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to view tickets' },
        { status: 401 }
      )
    }

    // Join user_notifications so the UI can show a badge on tickets that
    // have a fresh admin reply the user hasn't opened yet.
    //
    // admin replies (see app/api/admin/reply/route.ts) insert a row into
    // user_notifications with:
    //   type            = 'reply'
    //   reference_type  = 'ticket'
    //   reference_id    = support_tickets.id  (numeric PK, stored as text/int)
    //
    // We cast both sides to text to be robust against the column being
    // INTEGER in one migration and VARCHAR in another.
    const tickets = await sql`
      SELECT
        st.id, st.ticket_id, st.category, st.subject, st.message, st.status,
        st.priority, st.created_at, st.updated_at,
        COALESCE(n.unread_count, 0)::int AS unread_reply_count
      FROM support_tickets st
      LEFT JOIN (
        SELECT reference_id::text AS ref, COUNT(*) AS unread_count
        FROM user_notifications
        WHERE user_id = ${user.id}
          AND reference_type = 'ticket'
          AND type = 'reply'
          AND is_read = false
        GROUP BY reference_id
      ) n ON n.ref = st.id::text
      WHERE st.user_id = ${user.id}
      ORDER BY st.updated_at DESC NULLS LAST, st.created_at DESC
    `

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Fetch tickets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    )
  }
}

// POST - Create a new ticket
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to submit a ticket' },
        { status: 401 }
      )
    }

    const { category, subject, message, priority } = await request.json()

    if (!category || !subject || !message) {
      return NextResponse.json(
        { error: 'Category, subject, and message are required' },
        { status: 400 }
      )
    }

    const ticketId = generateTicketId()

    await sql`
      INSERT INTO support_tickets (
        ticket_id, user_id, email, name, category, subject, message, priority
      ) VALUES (
        ${ticketId}, 
        ${user.id}, 
        ${user.email}, 
        ${user.first_name + ' ' + user.last_name},
        ${category}, 
        ${subject}, 
        ${message},
        ${priority || 'medium'}
      )
    `

    // Send confirmation email
    let emailSent = false
    try {
      emailSent = await sendTicketConfirmation({
        email: user.email,
        firstName: user.first_name,
        ticketId,
        subject,
        category
      })
    } catch (emailError) {
      console.error('[v0] Ticket email error:', emailError)
    }

    return NextResponse.json({ 
      success: true, 
      ticketId,
      emailSent,
      message: `Your ticket ${ticketId} has been submitted successfully.`
    })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}
