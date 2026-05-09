import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'

/**
 * Customer-side ticket review — the small CSAT card that appears under
 * the thread once a ticket has been marked `resolved` or `closed`. It
 * mirrors the big-tech support pattern (Apple, Google, Intercom): one
 * star rating + optional thumbs / comment, editable until the customer
 * walks away. We expose a single endpoint pair:
 *
 *   GET  → returns the existing review (if any) plus a `canReview`
 *          flag derived from the parent ticket's status, so the UI
 *          knows whether to render the form, the read-only card, or
 *          nothing at all.
 *   POST → upserts the review (one row per ticket).
 *
 * Permission model is tight on purpose — only the ticket owner can
 * read or write their own review. Staff have a separate moderation
 * flow and never hit this route.
 */

type TicketRow = {
  ticket_id: string
  user_id: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
}

async function loadTicketForUser(
  ticketId: string,
  userId: string,
): Promise<TicketRow | null> {
  const result = await query<TicketRow>(
    `SELECT ticket_id, user_id, status
       FROM support_tickets
      WHERE ticket_id = $1 AND user_id = $2
      LIMIT 1`,
    [ticketId, userId],
  )
  return result.rows[0] ?? null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { ticketId } = await params

    const ticket = await loadTicketForUser(ticketId, user.id)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const reviewRes = await query<{
      id: number
      rating: number
      was_helpful: boolean | null
      body: string | null
      created_at: string
      updated_at: string
    }>(
      `SELECT id, rating, was_helpful, body, created_at, updated_at
         FROM ticket_reviews
        WHERE ticket_id = $1
        LIMIT 1`,
      [ticket.ticket_id],
    )

    const review = reviewRes.rows[0] ?? null
    const canReview =
      ticket.status === 'resolved' || ticket.status === 'closed'

    return NextResponse.json({
      review,
      canReview,
      ticketStatus: ticket.status,
    })
  } catch (err) {
    console.error('[ticket-review] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to load review' },
      { status: 500 },
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const { ticketId } = await params

    const ticket = await loadTicketForUser(ticketId, user.id)
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }
    // Block reviews on still-active threads — keeps the dataset clean
    // and matches the "ask only after the work is done" UX of the
    // platforms we're modelling.
    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      return NextResponse.json(
        {
          error:
            'You can leave a review once this ticket has been resolved or closed.',
        },
        { status: 400 },
      )
    }

    const body = (await req.json().catch(() => ({}))) as {
      rating?: number
      wasHelpful?: boolean | null
      body?: string | null
    }
    const rating = Number(body.rating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be a whole number between 1 and 5.' },
        { status: 400 },
      )
    }
    const wasHelpful =
      typeof body.wasHelpful === 'boolean' ? body.wasHelpful : null
    const comment = (body.body ?? '').toString().trim().slice(0, 2000) || null

    const upsert = await query<{
      id: number
      rating: number
      was_helpful: boolean | null
      body: string | null
      created_at: string
      updated_at: string
    }>(
      `INSERT INTO ticket_reviews (ticket_id, user_id, rating, was_helpful, body)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (ticket_id) DO UPDATE
         SET rating      = EXCLUDED.rating,
             was_helpful = EXCLUDED.was_helpful,
             body        = EXCLUDED.body,
             updated_at  = NOW()
       RETURNING id, rating, was_helpful, body, created_at, updated_at`,
      [ticket.ticket_id, user.id, rating, wasHelpful, comment],
    )

    return NextResponse.json({ review: upsert.rows[0] })
  } catch (err) {
    console.error('[ticket-review] POST failed', err)
    return NextResponse.json(
      { error: 'Failed to save review' },
      { status: 500 },
    )
  }
}
