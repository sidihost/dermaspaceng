import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'

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

    // Verify ticket belongs to user and is not closed
    const ticketResult = await query(
      `SELECT id, ticket_id, status FROM support_tickets WHERE ticket_id = $1 AND user_id = $2`,
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
      `INSERT INTO ticket_responses (ticket_id, user_id, message, is_staff, created_at)
       VALUES ($1, $2, $3, false, NOW())
       RETURNING id, message, is_staff, created_at`,
      [ticket.ticket_id, user.id, message.trim()]
    )

    // Update ticket updated_at
    await query(
      `UPDATE support_tickets SET updated_at = NOW() WHERE ticket_id = $1`,
      [ticket.ticket_id]
    )

    return NextResponse.json({
      response: result.rows[0]
    })
  } catch (error) {
    console.error('Error adding reply:', error)
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
  }
}
