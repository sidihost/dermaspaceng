/**
 * Broadcast dispatcher
 *
 * Resolves a `notification_broadcasts` row's audience, inserts the
 * in-app notifications, fans out web pushes, and updates the row's
 * status + delivery counters. Used by:
 *
 *   • POST /api/admin/broadcast            (immediate "send now")
 *   • GET  /api/cron/broadcasts            (scheduled sweep, runs every minute)
 *
 * Idempotent enough for the cron path: we wrap delivery in a status
 * transition (`scheduled` → `sending` → `sent` | `failed`) so a second
 * concurrent worker that wakes up between rows skips a row currently
 * being sent.
 */

import { sql } from './db'
import {
  sendPushToAll,
  sendPushToUser,
  sendPushToUsers,
  type PushPayload,
} from './push'

export type BroadcastRow = {
  id: string
  title: string
  message: string
  image_url: string | null
  action_url: string | null
  priority: 'low' | 'normal' | 'high'
  audience: 'all' | 'role' | 'user'
  role: string | null
  user_id: string | null
  push_enabled: boolean
  inapp_enabled: boolean
  status: string
  scheduled_at: string | null
}

export type DispatchResult = {
  recipients: number
  pushSent: number
  pushRemoved: number
}

/**
 * Resolve the user ids that should receive a broadcast. The audience
 * is resolved at SEND time (not creation time) so an account created
 * after a broadcast was scheduled but before it fires still gets it.
 */
export async function resolveAudience(b: BroadcastRow): Promise<string[]> {
  if (b.audience === 'user') {
    return b.user_id ? [b.user_id] : []
  }
  if (b.audience === 'role') {
    const rows = (await sql`
      SELECT id FROM users WHERE role = ${b.role || 'user'} AND is_active = TRUE
    `) as unknown as { id: string }[]
    return rows.map((r) => r.id)
  }
  const rows = (await sql`
    SELECT id FROM users WHERE is_active = TRUE
  `) as unknown as { id: string }[]
  return rows.map((r) => r.id)
}

/**
 * Fan a single broadcast row out to its audience.
 *
 * Side effects:
 *   1. Bumps row status `scheduled|draft` → `sending` (or `sent` for new).
 *   2. Inserts in-app notifications (when push_enabled OR always, gated
 *      by `inapp_enabled`).
 *   3. Sends web pushes (when push_enabled).
 *   4. Updates row → `sent` with counters, or `failed` with an error.
 */
export async function dispatchBroadcast(broadcastId: string): Promise<DispatchResult> {
  // Try to claim the row. If another worker already picked it up the
  // UPDATE will affect 0 rows and we'll bail.
  const claimed = (await sql`
    UPDATE notification_broadcasts
    SET status = 'sending', updated_at = NOW()
    WHERE id = ${broadcastId}
      AND status IN ('scheduled', 'draft', 'sent', 'failed')
    RETURNING
      id, title, message, image_url, action_url, priority,
      audience, role, user_id, push_enabled, inapp_enabled,
      status, scheduled_at
  `) as unknown as BroadcastRow[]

  if (!claimed.length) {
    return { recipients: 0, pushSent: 0, pushRemoved: 0 }
  }
  const b = claimed[0]

  try {
    const userIds = await resolveAudience(b)

    // 1. In-app notifications
    if (b.inapp_enabled && userIds.length) {
      for (const uid of userIds) {
        try {
          await sql`
            INSERT INTO user_notifications (
              user_id, title, message, type, action_url, priority, broadcast_id
            ) VALUES (
              ${uid}, ${b.title}, ${b.message}, 'announcement',
              ${b.action_url}, ${b.priority}, ${b.id}
            )
          `
        } catch (err) {
          console.error('[dispatcher] insert failed for', uid, err)
        }
      }
    }

    // 2. Web push
    let pushSent = 0
    let pushRemoved = 0
    if (b.push_enabled) {
      const payload: PushPayload = {
        title: b.title,
        body: b.message,
        url: b.action_url || '/dashboard/notifications',
        tag: `broadcast-${b.id}`,
      }
      if (b.audience === 'all') {
        const r = await sendPushToAll(payload)
        pushSent = r.sent
        pushRemoved = r.removed
      } else if (b.audience === 'user' && userIds[0]) {
        const r = await sendPushToUser(userIds[0], payload)
        pushSent = r.sent
        pushRemoved = r.removed
      } else if (userIds.length) {
        const r = await sendPushToUsers(userIds, payload)
        pushSent = r.sent
        pushRemoved = r.removed
      }
    }

    await sql`
      UPDATE notification_broadcasts
      SET status = 'sent',
          sent_at = NOW(),
          recipients = ${userIds.length},
          push_sent = ${pushSent},
          push_removed = ${pushRemoved},
          error = NULL,
          updated_at = NOW()
      WHERE id = ${b.id}
    `

    return { recipients: userIds.length, pushSent, pushRemoved }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    console.error('[dispatcher] dispatch failed', b.id, err)
    await sql`
      UPDATE notification_broadcasts
      SET status = 'failed', error = ${msg}, updated_at = NOW()
      WHERE id = ${b.id}
    `
    return { recipients: 0, pushSent: 0, pushRemoved: 0 }
  }
}

/**
 * Sweep all `scheduled` rows that are due (`scheduled_at <= NOW()`).
 * Returns the number of broadcasts dispatched in this run.
 */
export async function dispatchDueBroadcasts(): Promise<{ count: number }> {
  const due = (await sql`
    SELECT id FROM notification_broadcasts
    WHERE status = 'scheduled' AND scheduled_at <= NOW()
    ORDER BY scheduled_at ASC
    LIMIT 50
  `) as unknown as { id: string }[]

  let count = 0
  for (const row of due) {
    await dispatchBroadcast(row.id)
    count++
  }
  return { count }
}
