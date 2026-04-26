/**
 * Notifications helper
 *
 * Single entry-point for creating an in-app notification AND fanning
 * the same payload out as a Web Push (when the user has subscribed
 * and the global push feature flag is on).
 */

import { sql } from './db'
import { sendPushToUser, type PushPayload } from './push'
import { isFeatureEnabled } from './feature-flags'

export type NotifyOpts = {
  userId: string
  title: string
  message: string
  type: 'reply' | 'status_update' | 'announcement' | 'reminder' | 'promo' | 'system'
  referenceType?: string | null
  referenceId?: string | number | null
  actionUrl?: string | null
  priority?: 'low' | 'normal' | 'high'
  /** When true, also fire a web push (default). Set false for silent in-app only. */
  push?: boolean
  broadcastId?: string | null
}

export async function notifyUser(opts: NotifyOpts) {
  const {
    userId,
    title,
    message,
    type,
    referenceType = null,
    referenceId = null,
    actionUrl = null,
    priority = 'normal',
    push = true,
    broadcastId = null,
  } = opts

  // 1. Insert into the user_notifications table so the bell + page show it.
  try {
    await sql`
      INSERT INTO user_notifications (
        user_id, title, message, type, reference_type, reference_id,
        action_url, priority, broadcast_id
      ) VALUES (
        ${userId}, ${title}, ${message}, ${type},
        ${referenceType}, ${referenceId !== null ? String(referenceId) : null},
        ${actionUrl}, ${priority}, ${broadcastId}
      )
    `
  } catch (err) {
    console.error('[notify] insert failed', err)
  }

  // 2. Fire a web push (best effort).
  if (push) {
    try {
      const pushOn = await isFeatureEnabled('push_notifs')
      if (!pushOn) return
      // Respect per-user preference if present.
      const pref = (await sql`
        SELECT push_enabled FROM notification_preferences WHERE user_id = ${userId}
      `) as unknown as { push_enabled: boolean }[]
      if (pref.length && !pref[0].push_enabled) return

      const payload: PushPayload = {
        title,
        body: message,
        url: actionUrl || '/dashboard/notifications',
        tag: type,
      }
      await sendPushToUser(userId, payload)
    } catch (err) {
      console.error('[notify] push failed', err)
    }
  }
}

/** Fetch the most recent notifications for a user (newest first). */
export async function getUserNotifications(userId: string, limit = 30) {
  return (await sql`
    SELECT id, title, message, type, reference_type, reference_id,
           action_url, priority, is_read, created_at
    FROM user_notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as unknown as Array<{
    id: string
    title: string
    message: string
    type: string
    reference_type: string | null
    reference_id: string | null
    action_url: string | null
    priority: string
    is_read: boolean
    created_at: string
  }>
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = (await sql`
    SELECT COUNT(*)::int AS count
    FROM user_notifications
    WHERE user_id = ${userId} AND is_read = FALSE
  `) as unknown as { count: number }[]
  return rows[0]?.count ?? 0
}
