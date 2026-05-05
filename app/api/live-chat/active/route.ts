import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  avatarUrlForSlug,
  getOpenSessionForUser,
  staffDisplayName,
} from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET /api/live-chat/active
// ---------------------------------------------------------------------------
// Returns the user's CURRENT live-chat session (if any) plus the assigned
// staff member's display name and avatar so the widget can render the
// "Sarah joined the chat" header without a second round-trip.
// Polled every few seconds by the floating live-chat overlay.
// ---------------------------------------------------------------------------
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ session: null })

  const session = await getOpenSessionForUser(user.id)
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
    },
    staff,
  })
}
