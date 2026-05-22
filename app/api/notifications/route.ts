import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserNotifications, getUnreadCount } from '@/lib/notifications'

// Header bell + /dashboard/notifications both consume this endpoint.
// We always return 200 with a well-formed JSON body so a transient DB
// hiccup never collapses the bell into the empty "all caught up" state
// (which is what was happening when SWR caught the 500). The helper
// functions in lib/notifications.ts log + degrade to []/0 on their own,
// so the only failure that can reach this handler is auth.
//
// `?audience=admin` returns operator-only system notifications (new
// ticket, new consultation, etc) which are written by `notifyAdmins`.
// Everything else returns the customer-facing inbox. We default to
// 'customer' so the existing customer header bell keeps working
// without changes. The admin sidebar bell explicitly opts in.
//
// Important: we DO NOT trust the audience param blindly. A normal
// customer asking for `?audience=admin` should get an empty list,
// because they've never been the target of an admin fan-out, and
// even if they had, we wouldn't surface it on their customer surface.
// We enforce this by checking the user's role server-side.

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { notifications: [], unread: 0, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const requested = request.nextUrl.searchParams.get('audience')
  const isOperator = user.role === 'admin' || user.role === 'staff'
  const audience: 'admin' | 'customer' =
    requested === 'admin' && isOperator ? 'admin' : 'customer'

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 30), 100)
  const [items, unread] = await Promise.all([
    getUserNotifications(user.id, limit, audience),
    getUnreadCount(user.id, audience),
  ])
  return NextResponse.json({ notifications: items, unread, audience })
}
