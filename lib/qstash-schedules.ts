// ---------------------------------------------------------------------------
// lib/qstash-schedules.ts
//
// Canonical list of recurring background jobs Dermaspace runs on QStash.
//
// This file is the SINGLE SOURCE OF TRUTH for "what does this app run on
// a schedule?". Both the admin sync endpoint
// (POST /api/admin/qstash/schedules) and the admin UI
// (/admin/qstash) read from this list — so adding, removing, or
// re-cronning a job is a one-line change here followed by hitting "Sync
// schedules" in the dashboard.
//
// Why we left Vercel cron behind
// ------------------------------
//   * Vercel Hobby caps cron at once-per-day. Two of our jobs
//     (broadcasts, abandoned-payments) genuinely want sub-day cadence,
//     and we were having to coarsen them to fit the limit. QStash has
//     per-second precision regardless of plan.
//   * Vercel cron disappears on rollback / plan downgrades. QStash
//     schedules survive both.
//   * QStash signs every delivery, so each cron route gets the same
//     defence-in-depth as our one-off webhooks (`verifyQStash`).
//
// Each entry below maps to:
//   * a `POST` handler on the same `path` that verifies the QStash
//     signature and runs the job
//   * an existing `GET` handler on the same `path` that admins can hit
//     manually with `Authorization: Bearer $CRON_SECRET` for a forced
//     re-run (handy when you tweaked email copy and want to backfill).
// ---------------------------------------------------------------------------

export type QStashScheduleConfig = {
  /** Stable identifier used in the admin UI. Free-form — never sent to QStash. */
  id: string
  /** Path the schedule POSTs to. Must have a POST handler that calls verifyQStash(). */
  path: string
  /** Standard 5-field cron expression. QStash interprets it as UTC. */
  cron: string
  /** Human-readable label rendered in the admin dashboard. */
  label: string
  /** One-liner describing what the job does. */
  description: string
}

// All times below are UTC. Africa/Lagos = UTC+1, no DST — so "9 AM in
// Lagos" maps to `0 8 * * *` in UTC. Each comment notes the local time
// it runs at so future contributors don't have to do the maths again.
export const QSTASH_SCHEDULES: QStashScheduleConfig[] = [
  {
    id: 'birthday-wishes',
    path: '/api/cron/birthday-wishes',
    // 07:00 Africa/Lagos — early enough to land before most users start
    // their day, late enough that we're not pinging anyone at 3 AM if
    // QStash retries.
    cron: '0 6 * * *',
    label: 'Birthday wishes',
    description:
      'Daily — emails every active user whose date_of_birth matches today (Africa/Lagos). Idempotent via users.last_birthday_email_sent_at.',
  },
  {
    id: 'security-reminders',
    path: '/api/cron/security-reminders',
    // 09:00 Africa/Lagos — sweet spot for "you finished signup yesterday,
    // now turn on 2FA" nudges.
    cron: '0 8 * * *',
    label: 'Security reminders',
    description:
      'Daily — nudges users who signed up 2-26h ago without passkey or 2FA. Marks users.security_reminder_sent so each user only sees it once.',
  },
  {
    id: 'broadcasts',
    path: '/api/cron/broadcasts',
    // Every 5 minutes. Vercel Hobby cron forced this to be daily, which
    // meant a 9am marketing broadcast scheduled for 9:05am wouldn't
    // dispatch until the following day. QStash runs at 5-minute
    // resolution which is more than enough for human-scheduled emails.
    cron: '*/5 * * * *',
    label: 'Broadcasts dispatcher',
    description:
      'Every 5 min — picks up notification_broadcasts rows whose scheduled_at has passed and sends them via the broadcast dispatcher.',
  },
  {
    id: 'abandoned-payments',
    path: '/api/cron/abandoned-payments',
    // Hourly — the abandoned-payment funnel previously shipped wanting
    // hourly cadence but Hobby cron silently dropped it. Now it can
    // actually run.
    cron: '0 * * * *',
    label: 'Abandoned payment recovery',
    description:
      'Hourly — emails users with pending payments older than 30 minutes (max 3 reminders, 24h apart). Also purges expired abandoned_payments rows weekly.',
  },
]
