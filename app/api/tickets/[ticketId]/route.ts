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

    // Fetch responses
    const responsesResult = await query(
      `SELECT * FROM ticket_responses WHERE ticket_id = $1 ORDER BY created_at ASC`,
      [ticket.id]
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
