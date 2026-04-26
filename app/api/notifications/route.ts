import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getUserNotifications, getUnreadCount } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') || 30), 100)
  const [items, unread] = await Promise.all([
    getUserNotifications(user.id, limit),
    getUnreadCount(user.id),
  ])
  return NextResponse.json({ notifications: items, unread })
}
