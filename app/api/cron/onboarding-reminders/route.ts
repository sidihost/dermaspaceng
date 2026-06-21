import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendOnboardingReminderEmail } from '@/lib/email'
import { verifyQStash } from '@/lib/qstash'

// ---------------------------------------------------------------------------
// /api/cron/onboarding-reminders
//
// Scheduled by QStash (see lib/qstash-schedules.ts). Mirrors the
// security-reminders job: a signed POST from QStash runs it on a cadence,
// and a GET gated by CRON_SECRET lets an admin force a re-run.
//
// Who gets emailed: a regular user (role = 'user') who signed up between
// 2h and 48h ago and EITHER:
//   • never confirmed their email (email_verified = false) → 'verify' nudge
//   • verified but never finished the /complete-profile wizard
//     (profile_complete = false / signup_step < 4)       → 'profile' nudge
//
// The 2h lead-in avoids pinging someone still mid-signup; the 48h tail gives
// us a wide-enough window that a missed/late daily run doesn't drop anyone.
// We flip users.onboarding_reminder_sent so each user only ever gets one
// auto-nudge — admins can still manually resend from the Users/Staff pages.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type RunResult = {
  candidates: number
  sent: number
  failed: number
}

async function runJob(): Promise<RunResult> {
  const candidates = (await sql`
    SELECT id, email, first_name, email_verified
    FROM users
    WHERE role = 'user'
      AND created_at BETWEEN NOW() - INTERVAL '48 hours' AND NOW() - INTERVAL '2 hours'
      AND COALESCE(onboarding_reminder_sent, false) = false
      AND email IS NOT NULL
      AND (
        email_verified = false
        OR COALESCE(profile_complete, false) = false
      )
    ORDER BY created_at ASC
    LIMIT 500
  `) as Array<{
    id: string
    email: string
    first_name: string | null
    email_verified: boolean
  }>

  let sent = 0
  let failed = 0

  for (const user of candidates) {
    // Unverified users always get the "verify your email" nudge first —
    // there's no point pushing them to /complete-profile when their
    // account isn't active yet.
    const stage: 'verify' | 'profile' = user.email_verified ? 'profile' : 'verify'
    try {
      await sendOnboardingReminderEmail({
        email: user.email,
        firstName: user.first_name || 'there',
        stage,
      })
      await sql`
        UPDATE users
        SET onboarding_reminder_sent = true,
            onboarding_reminder_sent_at = NOW()
        WHERE id = ${user.id}
      `
      sent++
    } catch (error) {
      console.error(`[onboarding-reminders] failed for ${user.email}:`, error)
      failed++
    }
  }

  return { candidates: candidates.length, sent, failed }
}

// ---- POST: QStash-signed entry point ---------------------------------------
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const ok = await verifyQStash(request, rawBody)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }
  try {
    const r = await runJob()
    return NextResponse.json({ success: true, source: 'qstash', ...r })
  } catch (error) {
    console.error('[onboarding-reminders] qstash run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

// ---- GET: manual admin trigger ---------------------------------------------
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
    console.error('[onboarding-reminders] manual run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
