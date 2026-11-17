import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  avatarUrlForSlug,
  getOpenSessionForUser,
  getRecentUnratedSessionForUser,
  getSessionById,
  staffDisplayName,
  type LiveChatSession,
} from '@/lib/live-chat'
import { readGuestChatCookie } from '@/lib/live-chat-guest'

export async function GET() {
  const user = await getCurrentUser()

  let session: LiveChatSession | null = null
  let isGuest = false

  if (user) {
    session = (await getOpenSessionForUser(user.id)) ?? (await getRecentUnratedSessionForUser(user.id))
  } else {
    const guestSessionId = await readGuestChatCookie()
    if (guestSessionId) {
      const candidate = await getSessionById(guestSessionId)
      const recentlyClosedUnrated =
        candidate?.status === 'closed' &&
        !candidate.rated_at &&
        !!candidate.closed_at &&
        Date.now() - new Date(candidate.closed_at).getTime() <= 30 * 60 * 1000
      if (
        candidate &&
        candidate.user_id === null &&
        (candidate.status === 'waiting' || candidate.status === 'active' || recentlyClosedUnrated)
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
