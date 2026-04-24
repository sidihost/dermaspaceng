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
//
// Robustness notes:
//  * The list page was previously empty for some accounts because the
//    old implementation LEFT JOIN'd user_notifications inline. If
//    that table's schema had drifted (older migrations stored
//    reference_id as INTEGER, newer ones as TEXT) the whole query
//    failed and the outer 500 translated into "the ticket I just
//    created doesn't show up".
//  * We now always run the core ticket SELECT, and attempt the
//    unread-badge aggregation as a *separate* query wrapped in its
//    own try/catch. If the notification lookup fails for any
//    reason, tickets still render — the badge just quietly
//    degrades to zero.
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to view tickets' },
        { status: 401 }
      )
    }

    // Core list: this must never fail because of a bad JOIN.
    const tickets = (await sql`
      SELECT
        st.id, st.ticket_id, st.category, st.subject, st.message, st.status,
        st.priority, st.created_at, st.updated_at
      FROM support_tickets st
      WHERE st.user_id = ${user.id}
      ORDER BY st.updated_at DESC NULLS LAST, st.created_at DESC
    `) as Array<Record<string, unknown>>

    // Overlay unread-reply counts via a second, defensive query. Using
    // a Map keyed on the ticket's numeric PK (as text) means we can
    // merge the counts regardless of whether `reference_id` is stored
    // as INTEGER or TEXT in any particular environment.
    const unreadByTicketId = new Map<string, number>()
    try {
      const counts = (await sql`
        SELECT reference_id::text AS ref, COUNT(*)::int AS unread_count
        FROM user_notifications
        WHERE user_id = ${user.id}
          AND reference_type = 'ticket'
          AND type = 'reply'
          AND is_read = false
        GROUP BY reference_id
      `) as Array<{ ref: string; unread_count: number }>
      for (const row of counts) {
        unreadByTicketId.set(String(row.ref), row.unread_count)
      }
    } catch (err) {
      // A missing or schema-drifted user_notifications table is not
      // fatal — we swallow it so the list still renders.
      console.error('[v0] unread-ticket-reply count lookup failed:', err)
    }

    const enriched = tickets.map((t) => ({
      ...t,
      unread_reply_count: unreadByTicketId.get(String(t.id)) ?? 0,
    }))

    return NextResponse.json({ tickets: enriched })
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
