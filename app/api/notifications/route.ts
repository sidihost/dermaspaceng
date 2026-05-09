import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserNotifications, getUnreadCount } from '@/lib/notifications'

// Header bell + /dashboard/notifications both consume this endpoint.
// We always return 200 with a well-formed JSON body so a transient DB
// hiccup never collapses the bell into the empty "all caught up" state
// (which is what was happening when SWR caught the 500). The helper
// functions in lib/notifications.ts log + degrade to []/0 on their own,
// so the only failure that can reach this handler is auth.

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { notifications: [], unread: 0, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 30), 100)
  const [items, unread] = await Promise.all([
    getUserNotifications(user.id, limit),
    getUnreadCount(user.id),
  ])
  return NextResponse.json({ notifications: items, unread })
}
