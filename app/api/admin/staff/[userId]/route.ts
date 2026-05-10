// ---------------------------------------------------------------------------
// /api/admin/staff/[userId]
//
// GET — returns the full staff profile shown on /admin/staff/[id]:
//   • basic identity (name, email, avatar, role, status)
//   • headline performance counters (replies, complaints, consultations,
//     gift cards, live-chat sessions)
//   • CSAT — average ticket rating + ticket-level breakdown of every
//     ticket the staff member replied to. Pulled from `ticket_reviews`
//     (the post-resolution star rating customers leave on the ticket
//     detail page) joined back through `ticket_responses` so we can
//     attribute each rating to the staff member who actually handled
//     the ticket.
//   • recent tickets handled — the last ~20 tickets they answered, with
//     the customer's review attached when one exists.
//
// Every nested query is wrapped in a `safe()` helper so a missing
// optional table on a fresh database (e.g. `ticket_reviews` before
// migration 530 has run, or `live_chat_sessions` on a partial
// environment) cannot blank out the page. The basic user fetch is the
// only "load-bearing" query — everything else degrades to zero.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()
    const { userId } = await params

    // 1. Identity. Only staff/admin rows allowed — regular users
    //    shouldn't open as a "staff profile" by URL guessing.
    const userRows = await sql`
      SELECT
        id, email, username, first_name, last_name, phone,
        role, is_active, email_verified, created_at,
        COALESCE(must_change_password, FALSE) AS must_change_password,
        COALESCE(is_super_admin, FALSE) AS is_super_admin,
        COALESCE(can_manage_services, FALSE) AS can_manage_services
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }
    const user = userRows[0] as Record<string, unknown>
    if (!['admin', 'staff'].includes(String(user.role))) {
      return NextResponse.json(
        { error: 'This account is not a staff member' },
        { status: 400 },
      )
    }

    // Optional avatar url (present once the avatar migration ran).
    try {
      const extra = await sql`SELECT avatar_url FROM users WHERE id = ${userId} LIMIT 1`
      user.avatar_url = extra[0]?.avatar_url ?? null
    } catch {
      user.avatar_url = null
    }

    // 2. Counters & ratings — best-effort.
    const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn() } catch { return fallback }
    }

    const [
      replyCounts,
      assignmentCounts,
      ticketRatingAgg,
      liveChatAgg,
      recentTickets,
    ] = await Promise.all([
      // Replies sent — split by surface so the admin can see whether
      // this staff member is mostly chasing tickets vs complaints vs
      // consultations.
      safe(() => sql`
        SELECT
          (SELECT COUNT(*) FROM ticket_responses WHERE user_id = ${userId} AND is_staff = TRUE)::int AS ticket_replies,
          (SELECT COUNT(*) FROM admin_replies WHERE staff_id = ${userId})::int AS admin_replies
      `, [{ ticket_replies: 0, admin_replies: 0 }]),
      // Assignment workload — how much is on this person's plate
      // across the support surfaces.
      safe(() => sql`
        SELECT
          (SELECT COUNT(*) FROM contact_messages WHERE assigned_to = ${userId})::int AS complaints,
          (SELECT COUNT(*) FROM consultations WHERE assigned_to = ${userId})::int AS consultations,
          (SELECT COUNT(*) FROM gift_card_requests WHERE assigned_to = ${userId})::int AS gift_cards
      `, [{ complaints: 0, consultations: 0, gift_cards: 0 }]),
      // CSAT roll-up. We attribute a ticket review to a staff member
      // if they wrote at least one staff response on that ticket.
      safe(() => sql`
        SELECT
          AVG(tr.rating)::float AS avg_rating,
          COUNT(*)::int AS rated_count,
          COUNT(*) FILTER (WHERE tr.rating >= 4)::int AS positive,
          COUNT(*) FILTER (WHERE tr.rating <= 2)::int AS negative,
          COUNT(*) FILTER (WHERE tr.was_helpful = TRUE)::int AS helpful_yes,
          COUNT(*) FILTER (WHERE tr.was_helpful = FALSE)::int AS helpful_no
        FROM ticket_reviews tr
        WHERE tr.ticket_id IN (
          SELECT DISTINCT ticket_id
          FROM ticket_responses
          WHERE user_id = ${userId} AND is_staff = TRUE
        )
      `, [{
        avg_rating: null,
        rated_count: 0,
        positive: 0,
        negative: 0,
        helpful_yes: 0,
        helpful_no: 0,
      }]),
      // Live chat performance, nullable so the page can hide the card
      // entirely if this environment hasn't seeded live_chat_sessions.
      safe(() => sql`
        SELECT
          COUNT(*)::int AS total_chats,
          COUNT(*) FILTER (WHERE status = 'closed')::int AS closed_chats,
          AVG(staff_rating)::float AS avg_staff_rating,
          COUNT(*) FILTER (WHERE staff_rating IS NOT NULL)::int AS rated_chats
        FROM live_chat_sessions
        WHERE assigned_staff_id = ${userId}
      `, [{
        total_chats: 0,
        closed_chats: 0,
        avg_staff_rating: null,
        rated_chats: 0,
      }]),
      // Recent tickets handled — last ~20 unique tickets the staff
      // replied on, plus the customer review when one exists.
      safe(() => sql`
        SELECT
          st.id,
          st.ticket_id,
          st.subject,
          st.status,
          st.priority,
          st.created_at,
          st.updated_at,
          tr.rating          AS review_rating,
          tr.was_helpful     AS review_was_helpful,
          tr.body            AS review_body,
          tr.created_at      AS review_created_at,
          (
            SELECT MAX(created_at)
            FROM ticket_responses
            WHERE ticket_id = st.ticket_id
              AND user_id = ${userId}
              AND is_staff = TRUE
          ) AS last_replied_at,
          (
            SELECT COUNT(*)::int
            FROM ticket_responses
            WHERE ticket_id = st.ticket_id
              AND user_id = ${userId}
              AND is_staff = TRUE
          ) AS reply_count
        FROM support_tickets st
        LEFT JOIN ticket_reviews tr ON tr.ticket_id = st.ticket_id
        WHERE st.ticket_id IN (
          SELECT DISTINCT ticket_id
          FROM ticket_responses
          WHERE user_id = ${userId} AND is_staff = TRUE
        )
        ORDER BY COALESCE(st.updated_at, st.created_at) DESC
        LIMIT 20
      `, [] as Array<Record<string, unknown>>),
    ])

    const reply = (replyCounts[0] as { ticket_replies: number; admin_replies: number })
      ?? { ticket_replies: 0, admin_replies: 0 }
    const assign = (assignmentCounts[0] as { complaints: number; consultations: number; gift_cards: number })
      ?? { complaints: 0, consultations: 0, gift_cards: 0 }
    const csat = (ticketRatingAgg[0] as {
      avg_rating: number | null
      rated_count: number
      positive: number
      negative: number
      helpful_yes: number
      helpful_no: number
    }) ?? {
      avg_rating: null,
      rated_count: 0,
      positive: 0,
      negative: 0,
      helpful_yes: 0,
      helpful_no: 0,
    }
    const live = (liveChatAgg[0] as {
      total_chats: number
      closed_chats: number
      avg_staff_rating: number | null
      rated_chats: number
    }) ?? {
      total_chats: 0,
      closed_chats: 0,
      avg_staff_rating: null,
      rated_chats: 0,
    }

    return NextResponse.json({
      user,
      performance: {
        replies: {
          tickets: Number(reply.ticket_replies ?? 0),
          requests: Number(reply.admin_replies ?? 0),
          total: Number(reply.ticket_replies ?? 0) + Number(reply.admin_replies ?? 0),
        },
        assignments: {
          complaints: Number(assign.complaints ?? 0),
          consultations: Number(assign.consultations ?? 0),
          giftCards: Number(assign.gift_cards ?? 0),
        },
        ticketReviews: {
          averageRating: csat.avg_rating == null ? null : Number(csat.avg_rating),
          ratedCount: Number(csat.rated_count ?? 0),
          positive: Number(csat.positive ?? 0),
          negative: Number(csat.negative ?? 0),
          helpfulYes: Number(csat.helpful_yes ?? 0),
          helpfulNo: Number(csat.helpful_no ?? 0),
        },
        liveChat: {
          totalChats: Number(live.total_chats ?? 0),
          closedChats: Number(live.closed_chats ?? 0),
          averageRating: live.avg_staff_rating == null ? null : Number(live.avg_staff_rating),
          ratedChats: Number(live.rated_chats ?? 0),
        },
      },
      tickets: recentTickets,
    })
  } catch (error) {
    console.error('[v0] Get staff profile error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch staff profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
