import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendSecurityReminderEmail } from '@/lib/email'
import { verifyQStash } from '@/lib/qstash'

// ---------------------------------------------------------------------------
// /api/cron/security-reminders
//
// Scheduled by QStash (see lib/qstash-schedules.ts). The same handler is
// also exposed via GET for ad-hoc admin runs gated by CRON_SECRET — the
// QStash schedule POSTs here with a signed body, the admin trigger uses
// Authorization: Bearer.
//
// Window logic: anyone who signed up between 2h and 26h ago who hasn't
// already got a security_reminder_sent flag. The 2h lead-in keeps us
// from emailing users still mid-onboarding; the 26h tail (vs. 24h) is a
// safety overlap so a slightly-late run doesn't drop anyone on the
// floor.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type RunResult = {
  candidates: number
  sent: number
  skipped: number
  failed: number
}

async function runJob(): Promise<RunResult> {
  const usersNeedingReminder = await sql`
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.created_at,
      COALESCE(u.security_reminder_sent, false) as security_reminder_sent,
      EXISTS(
        SELECT 1 FROM passkey_credentials pc WHERE pc.user_id = u.id
      ) as has_passkey,
      COALESCE(
        (SELECT totp_enabled FROM user_2fa_settings WHERE user_id = u.id::uuid),
        false
      ) as has_2fa
    FROM users u
    WHERE u.created_at BETWEEN NOW() - INTERVAL '26 hours' AND NOW() - INTERVAL '2 hours'
      AND COALESCE(u.security_reminder_sent, false) = false
    ORDER BY u.created_at ASC
    LIMIT 500
  `

  let sent = 0
  let skipped = 0
  let failed = 0

  for (const user of usersNeedingReminder) {
    if (user.has_passkey && user.has_2fa) {
      skipped++
      // Mark as sent so a future query doesn't re-evaluate this row.
      await sql`UPDATE users SET security_reminder_sent = true WHERE id = ${user.id}`
      continue
    }

    try {
      await sendSecurityReminderEmail({
        email: user.email,
        firstName: user.first_name || 'there',
        hasPasskey: user.has_passkey,
        has2FA: user.has_2fa,
      })
      await sql`
        UPDATE users
        SET security_reminder_sent = true, security_reminder_sent_at = NOW()
        WHERE id = ${user.id}
      `
      sent++
    } catch (error) {
      console.error(`[security-reminders] failed for ${user.email}:`, error)
      failed++
    }
  }

  return { candidates: usersNeedingReminder.length, sent, skipped, failed }
}

// ---- POST: QStash-signed entry point ---------------------------------------
export async function POST(request: NextRequest) {
  // Read the raw body BEFORE parsing — Upstash signs the exact bytes we
  // received. We don't actually consume the JSON because this job has no
  // payload, but verifyQStash expects the raw string.
  const rawBody = await request.text()
  const ok = await verifyQStash(request, rawBody)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }
  try {
    const r = await runJob()
    return NextResponse.json({ success: true, source: 'qstash', ...r })
  } catch (error) {
    console.error('[security-reminders] qstash run failed:', error)
    // Return 500 so QStash retries with backoff.
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

// ---- GET: manual admin trigger ---------------------------------------------
// Kept for backwards compatibility + on-demand "rerun" from the admin UI
// (which calls it with the CRON_SECRET bearer header).
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  try {
    const r = await runJob()
    return NextResponse.json({ success: true, source: 'manual', ...r })
  } catch (error) {
    console.error('[security-reminders] manual run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
