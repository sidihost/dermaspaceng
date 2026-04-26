import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'
import { sendPushToAll, sendPushToUser, sendPushToUsers, type PushPayload } from '@/lib/push'
import { v4 as uuidv4 } from 'uuid'

/**
 * Admin broadcast — sends an in-app notification AND a web push to a
 * target audience.
 *
 * Body:
 *   {
 *     title:    string
 *     message:  string
 *     audience: 'all' | 'user' | 'role'
 *     userId?:  string                  // when audience='user'
 *     role?:    'user' | 'staff' | 'admin'  // when audience='role'
 *     actionUrl?: string
 *     priority?:  'low' | 'normal' | 'high'
 *     pushOnly?:  boolean              // skip in-app insert
 *     inappOnly?: boolean              // skip push send
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const title = String(body.title || '').trim()
    const message = String(body.message || '').trim()
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }
    const audience = body.audience as 'all' | 'user' | 'role'
    const broadcastId = uuidv4()
    const actionUrl = body.actionUrl || null
    const priority = ['low', 'normal', 'high'].includes(body.priority) ? body.priority : 'normal'

    // Resolve recipient ids first.
    let userIds: string[] = []
    if (audience === 'user') {
      if (!body.userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 })
      }
      userIds = [String(body.userId)]
    } else if (audience === 'role') {
      const role = body.role || 'user'
      const rows = (await sql`SELECT id FROM users WHERE role = ${role} AND is_active = TRUE`) as unknown as { id: string }[]
      userIds = rows.map((r) => r.id)
    } else {
      const rows = (await sql`SELECT id FROM users WHERE is_active = TRUE`) as unknown as { id: string }[]
      userIds = rows.map((r) => r.id)
    }

    // 1. Insert in-app notifications in bulk.
    if (!body.pushOnly && userIds.length > 0) {
      // Insert one at a time with a parameterized template — Neon's tagged
      // template doesn't easily support multi-row VALUES. Volume is low
      // (admin broadcasts are rare) so a loop is fine.
      for (const userId of userIds) {
        try {
          await sql`
            INSERT INTO user_notifications
              (user_id, title, message, type, action_url, priority, broadcast_id)
            VALUES
              (${userId}, ${title}, ${message}, 'announcement',
               ${actionUrl}, ${priority}, ${broadcastId})
          `
        } catch (err) {
          console.error('[broadcast] insert failed for user', userId, err)
        }
      }
    }

    // 2. Send web pushes.
    let pushResult = { sent: 0, removed: 0 }
    if (!body.inappOnly) {
      const payload: PushPayload = {
        title,
        body: message,
        url: actionUrl || '/dashboard/notifications',
        tag: 'broadcast',
      }
      if (audience === 'all') {
        const r = await sendPushToAll(payload)
        pushResult = { sent: r.sent, removed: r.removed }
      } else if (audience === 'user') {
        pushResult = await sendPushToUser(userIds[0], payload)
      } else {
        pushResult = await sendPushToUsers(userIds, payload)
      }
    }

    // 3. Log the broadcast in activity_log.
    try {
      await sql`
        INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${admin.id},
          'broadcast_sent',
          'broadcast',
          ${broadcastId},
          ${`Broadcast "${title}" → ${audience} (${userIds.length} recipient(s))`}
        )
      `
    } catch {
      /* non-blocking */
    }

    return NextResponse.json({
      ok: true,
      broadcastId,
      recipients: userIds.length,
      push: pushResult,
    })
  } catch (err) {
    console.error('[admin/broadcast POST]', err)
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 })
  }
}
