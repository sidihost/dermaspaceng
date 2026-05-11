/**
 * Notifications helper
 *
 * Single entry-point for creating an in-app notification AND fanning
 * the same payload out as a Web Push (when the user has subscribed
 * and the global push feature flag is on).
 */

import { sql, query } from './db'
import { sendPushToUser, type PushPayload } from './push'
import { isFeatureEnabled } from './feature-flags'
import { resolveReadColumn, ensureNotificationsSchema } from './notifications-column'

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
  //    `ensureNotificationsSchema` runs once per process and is the reason
  //    "notifications never worked" on the legacy 028 schema — it
  //    idempotently adds the action_url / priority / broadcast_id /
  //    reference_* columns this INSERT relies on. Without that patch the
  //    INSERT would raise `column does not exist`, the catch below would
  //    swallow it, and the customer would never see the bell entry.
  try {
    await ensureNotificationsSchema()
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
        url: actionUrl ? `${appBaseUrl()}${actionUrl}` : `${appBaseUrl()}/dashboard/notifications`,
        tag: type,
      }
      await sendPushToUser(userId, payload)
    } catch (err) {
      console.error('[notify] push failed', err)
    }
  }
}

/** Fetch the most recent notifications for a user (newest first).
 *
 *  The "read" column is resolved at runtime — older databases still
 *  carry the original `is_read` name from script 028, while newer
 *  databases use `read` per scripts 350 / full-migration. Either way
 *  we alias the result back to `is_read` so the API wire format
 *  (and every UI consumer) stays stable.
 *
 *  Failures fall back to an empty array so a transient DB error in
 *  one user's request never poisons the dashboard / bell for the
 *  rest of the session. The error is logged for the operator. */
export async function getUserNotifications(userId: string, limit = 30) {
  try {
    // Ensure missing columns exist so the SELECT doesn't trip on
    // databases that never received the action_url / priority patch.
    await ensureNotificationsSchema()
    const col = await resolveReadColumn()
    const safeLimit = Math.min(Math.max(1, Number(limit) || 30), 100)
    const { rows } = await query<{
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
    }>(
      `SELECT id, title, message, type, reference_type, reference_id,
              action_url, priority, "${col}" AS is_read, created_at
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`,
      [userId],
    )
    return rows
  } catch (err) {
    console.error('[notifications] getUserNotifications failed', err)
    return []
  }
}

/**
 * Booking-specific notification fan-outs.
 *
 * Each helper:
 *   1. mints a recovery token (so the email/push deep-link goes straight
 *      to a "resume payment" flow instead of forcing the customer to
 *      re-pick services / re-enter card details),
 *   2. drops an in-app notification on the bell so the user sees it
 *      next time they open the dashboard, and
 *   3. sends the matching transactional email so they see it sooner.
 *
 * We deliberately fail-soft — a payment-failure notification should
 * never throw and bubble up to break the webhook/admin endpoint that
 * triggered it.
 */
type BookingForNotify = {
  id: string
  user_id: string
  booking_reference: string
  customer_name: string
  customer_email: string
  appointment_date: string
  appointment_time: string
  total_price_kobo: number
  location_name: string
  services?: Array<{ treatmentName: string; categoryName: string }>
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://dermaspaceng.com'
  ).replace(/\/$/, '')
}

export async function notifyBookingPaymentFailed(
  booking: BookingForNotify,
  reason: string,
) {
  try {
    const { createBookingRecoveryToken } = await import('./booking')
    const { token } = await createBookingRecoveryToken({ bookingId: booking.id })
    const recoveryUrl = `${appBaseUrl()}/booking/resume/${token}`

    // In-app first — we want the bell badge regardless of email delivery.
    await notifyUser({
      userId: booking.user_id,
      title: 'Payment didn\u2019t go through',
      message: `Your payment for ${booking.booking_reference} couldn't be completed${reason ? ` (${reason})` : ''}. Tap to retry — your slot is still being held.`,
      type: 'status_update',
      referenceType: 'booking',
      referenceId: booking.booking_reference,
      actionUrl: `/booking/resume/${token}`,
      priority: 'high',
    })

    // Email — uses the same recovery URL so a customer who reads the
    // email on a different device still lands on the same resume page.
    try {
      const { sendBookingPaymentFailedEmail } = await import('./email')
      await sendBookingPaymentFailedEmail({
        to: booking.customer_email,
        customerName: booking.customer_name,
        bookingReference: booking.booking_reference,
        appointmentDate: booking.appointment_date,
        appointmentTime: booking.appointment_time,
        totalKobo: booking.total_price_kobo,
        locationName: booking.location_name,
        reason,
        recoveryUrl,
      })
    } catch (err) {
      console.error('[notify] booking-failed email', err)
    }

    return { recoveryUrl, token }
  } catch (err) {
    console.error('[notify] booking-failed flow', err)
    return null
  }
}

/**
 * Customer-facing reminder for a cancelled booking. Used when an admin
 * wants to nudge the customer to rebook (e.g. their slot opened up
 * because a different walk-in cancelled, or they were no-show).
 */
export async function notifyBookingCancelledReminder(
  booking: BookingForNotify,
  options?: { customMessage?: string },
) {
  try {
    const url = `${appBaseUrl()}/booking?rebookFrom=${encodeURIComponent(booking.booking_reference)}`
    const message =
      options?.customMessage?.trim() ||
      `Your previous booking ${booking.booking_reference} was cancelled. We saved your details \u2014 tap to rebook with one click.`
    await notifyUser({
      userId: booking.user_id,
      title: 'Ready to rebook?',
      message,
      type: 'reminder',
      referenceType: 'booking',
      referenceId: booking.booking_reference,
      actionUrl: `/booking?rebookFrom=${booking.booking_reference}`,
      priority: 'normal',
    })
    try {
      const { sendBookingRebookReminderEmail } = await import('./email')
      await sendBookingRebookReminderEmail({
        to: booking.customer_email,
        customerName: booking.customer_name,
        bookingReference: booking.booking_reference,
        appointmentDate: booking.appointment_date,
        locationName: booking.location_name,
        message,
        rebookUrl: url,
      })
    } catch (err) {
      console.error('[notify] cancel-reminder email', err)
    }
    return { rebookUrl: url }
  } catch (err) {
    console.error('[notify] cancel-reminder flow', err)
    return null
  }
}

export async function getUnreadCount(userId: string): Promise<number> {
  // Same column-name caveat as `getUserNotifications`. We resolve the
  // physical name (`read` or `is_read`) at runtime so the bell badge
  // works on every shipped schema variant. Errors degrade silently to
  // 0 instead of bubbling up and crashing the dashboard.
  try {
    const col = await resolveReadColumn()
    const { rows } = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM user_notifications
       WHERE user_id = $1 AND "${col}" = FALSE`,
      [userId],
    )
    return rows[0]?.count ?? 0
  } catch (err) {
    console.error('[notifications] getUnreadCount failed', err)
    return 0
  }
}
