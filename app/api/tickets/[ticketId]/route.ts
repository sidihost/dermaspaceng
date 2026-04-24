import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ticketId } = await params

    // Fetch ticket
    const ticketResult = await query(
      `SELECT * FROM support_tickets WHERE ticket_id = $1 AND user_id = $2`,
      [ticketId, user.id]
    )

    if (ticketResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const ticket = ticketResult.rows[0]

    // Fetch responses.
    //
    // Two things to know about this query:
    //  1. ticket_responses.ticket_id is a VARCHAR that references
    //     support_tickets.ticket_id (the string code like
    //     "DS-2026-123"), NOT the numeric PK. Joining on ticket.id
    //     used to return zero rows and made admin replies look
    //     like they never arrived.
    //  2. The response row in the DB exposes `responder_name`,
    //     but the UI reads `staff_name` (which was previously
    //     always undefined — every admin reply rendered as the
    //     fallback "DermaSpace Support", making it feel like the
    //     person helping the user was anonymous). We now also
    //     LEFT JOIN the users table so we can return the staff
    //     member's actual first+last name when available, and
    //     gracefully fall back to the stored responder_name if
    //     the user row was deleted.
    const responsesResult = await query(
      `SELECT
         tr.id,
         tr.ticket_id,
         tr.responder_type,
         tr.responder_name,
         tr.user_id,
         tr.message,
         tr.is_staff,
         tr.created_at,
         COALESCE(
           NULLIF(TRIM(CONCAT_WS(' ', u.first_name, u.last_name)), ''),
           tr.responder_name,
           'DermaSpace Support'
         ) AS staff_name
       FROM ticket_responses tr
       LEFT JOIN users u ON u.id = tr.user_id
       WHERE tr.ticket_id = $1
       ORDER BY tr.created_at ASC`,
      [ticket.ticket_id]
    )

    return NextResponse.json({
      ticket: {
        ...ticket,
        responses: responsesResult.rows
      }
    })
  } catch (error) {
    console.error('Error fetching ticket:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
  }
}
