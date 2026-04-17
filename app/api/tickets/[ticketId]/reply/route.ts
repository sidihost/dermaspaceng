import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'
import { sendCustomerReplyAlert } from '@/lib/email'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId } = await params
    const { message } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify ticket belongs to user and is not closed. We also pull the
    // numeric `id` and subject so we can deeplink the admin email straight
    // to /admin/complaints/<id>?source=ticket and show the ticket subject.
    const ticketResult = await query(
      `SELECT id, ticket_id, status, subject FROM support_tickets WHERE ticket_id = $1 AND user_id = $2`,
      [ticketId, user.id]
    )

    if (ticketResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const ticket = ticketResult.rows[0]

    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      return NextResponse.json({ error: 'Cannot reply to a closed ticket' }, { status: 400 })
    }

    // Insert reply - use ticket_id (string) not id (number) since the table references ticket_id
    const result = await query(
      `INSERT INTO ticket_responses (ticket_id, responder_type, responder_name, user_id, message, is_staff, created_at)
       VALUES ($1, $2, $3, $4, $5, false, NOW())
       RETURNING id, message, is_staff, created_at`,
      [ticket.ticket_id, 'user', `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User', user.id, message.trim()]
    )

    // Bump updated_at and flip status to open so the ticket re-enters the
    // admin queue (a reply on a "waiting on customer" ticket should wake it
    // back up for the team).
    await query(
      `UPDATE support_tickets
       SET updated_at = NOW(),
           status = CASE WHEN status IN ('pending','waiting_on_customer') THEN 'open' ELSE status END
       WHERE ticket_id = $1`,
      [ticket.ticket_id]
    )

    // Fire-and-forget email alert to the support inbox so staff know a
    // customer just replied. Best-effort: never block the user's reply on
    // the email transport.
    //
    // The inbox is configurable via ADMIN_NOTIFICATIONS_EMAIL (comma-
    // separated list allowed). Falls back to the shared support address so
    // the alert still lands somewhere even without extra env setup.
    try {
      const adminRecipients =
        process.env.ADMIN_NOTIFICATIONS_EMAIL || 'hello@dermaspaceng.com'

      const customerName =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        user.email ||
        'Customer'

      await sendCustomerReplyAlert({
        to: adminRecipients,
        customerName,
        customerEmail: user.email,
        ticketCode: ticket.ticket_id,
        ticketSubject: ticket.subject || `Support Ticket ${ticket.ticket_id}`,
        replyMessage: message.trim(),
        adminLinkId: ticket.id,
      })
    } catch (alertErr) {
      console.error('[v0] Customer reply alert send failed:', alertErr)
    }

    return NextResponse.json({
      response: result.rows[0]
    })
  } catch (error) {
    console.error('Error adding reply:', error)
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
  }
}
