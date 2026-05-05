import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  avatarUrlForSlug,
  getOpenSessionForUser,
  getSessionById,
  staffDisplayName,
  type LiveChatSession,
} from '@/lib/live-chat'
import { readGuestChatCookie } from '@/lib/live-chat-guest'

// ---------------------------------------------------------------------------
// GET /api/live-chat/active
// ---------------------------------------------------------------------------
// Returns the user's CURRENT live-chat session (if any) plus the assigned
// staff member's display name and avatar so the widget can render the
// "Sarah joined the chat" header without a second round-trip.
// Polled every few seconds by the floating live-chat overlay.
//
// Two resolution paths:
//   1. Logged-in customer  — look up by user_id (most recent open).
//   2. Anonymous visitor   — read the guest cookie and look up by id;
//      verify the session has NO user_id (i.e. is a guest row), and
//      that the row is still open (waiting/active), otherwise return
//      `{ session: null }` so the overlay re-shows the pre-chat form.
// ---------------------------------------------------------------------------
export async function GET() {
  const user = await getCurrentUser()

  let session: LiveChatSession | null = null
  let isGuest = false

  if (user) {
    session = await getOpenSessionForUser(user.id)
  } else {
    const guestSessionId = await readGuestChatCookie()
    if (guestSessionId) {
      const candidate = await getSessionById(guestSessionId)
      // Defence in depth: only honour the cookie if the row is genuinely
      // a guest row (user_id IS NULL). If a malicious visitor stole a
      // logged-in customer's session UUID and stamped it in their own
      // cookie we'd otherwise hand them that customer's transcript.
      if (
        candidate &&
        candidate.user_id === null &&
        (candidate.status === 'waiting' || candidate.status === 'active')
      ) {
        session = candidate
        isGuest = true
      }
    }
  }

  if (!session) return NextResponse.json({ session: null })

  let staff: {
    displayName: string
    avatarUrl: string
  } | null = null

  if (session.assigned_staff_id) {
    const rows = await sql`
      SELECT u.first_name, u.last_name, sp.display_name, sp.avatar_slug
        FROM users u
        LEFT JOIN staff_profiles sp ON sp.user_id = u.id
       WHERE u.id = ${session.assigned_staff_id}
       LIMIT 1
    `
    const row = rows[0] as
      | {
          first_name: string | null
          last_name: string | null
          display_name: string | null
          avatar_slug: string | null
        }
      | undefined
    if (row) {
      staff = {
        displayName: staffDisplayName({
          display_name: row.display_name,
          first_name: row.first_name,
          last_name: row.last_name,
        }),
        avatarUrl: avatarUrlForSlug(row.avatar_slug),
      }
    }
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      escalatedAt: session.escalated_at,
      acceptedAt: session.accepted_at,
      closedAt: session.closed_at,
      ratedAt: session.rated_at,
      isGuest,
      // Echo back the guest's pre-chat form so the overlay can show
      // "Hi {firstName}" without a second round-trip. Logged-in users
      // get `null` here because the overlay already has their account.
      guest:
        isGuest && session.guest_email
          ? {
              name: session.guest_name,
              email: session.guest_email,
              phone: session.guest_phone,
            }
          : null,
    },
    staff,
  })
}
