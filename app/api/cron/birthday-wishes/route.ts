import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendBirthdayEmail } from '@/lib/email'
import { verifyQStash } from '@/lib/qstash'

// ---------------------------------------------------------------------------
// /api/cron/birthday-wishes
//
// Scheduled daily by QStash (see lib/qstash-schedules.ts). The body is
// empty; we identify due users via SQL by matching MONTH+DAY against
// (NOW() AT TIME ZONE 'Africa/Lagos'). users.last_birthday_email_sent_at
// is the idempotency key — a user receives at most one email per
// calendar day even if QStash redelivers.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type RunResult = { candidates: number; sent: number; failed: number }

async function runJob(): Promise<RunResult> {
  const birthdayUsers = await sql`
    SELECT
      id,
      email,
      first_name,
      TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS dob
    FROM users
    WHERE date_of_birth IS NOT NULL
      AND email_verified = true
      AND COALESCE(is_active, true) = true
      AND EXTRACT(MONTH FROM date_of_birth)
            = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Africa/Lagos'))
      AND EXTRACT(DAY FROM date_of_birth)
            = EXTRACT(DAY FROM (NOW() AT TIME ZONE 'Africa/Lagos'))
      AND (
        last_birthday_email_sent_at IS NULL
        OR last_birthday_email_sent_at
             < (NOW() AT TIME ZONE 'Africa/Lagos')::date
      )
    LIMIT 500
  `

  let sent = 0
  let failed = 0
  for (const u of birthdayUsers) {
    try {
      const ok = await sendBirthdayEmail({
        email: u.email as string,
        firstName: (u.first_name as string) || 'there',
      })
      if (ok) {
        await sql`
          UPDATE users
          SET last_birthday_email_sent_at = (NOW() AT TIME ZONE 'Africa/Lagos')::date
          WHERE id = ${u.id}
        `
        sent++
      } else {
        failed++
      }
    } catch (err) {
      console.error('[birthday-wishes] failed for', u.email, err)
      failed++
    }
  }

  return { candidates: birthdayUsers.length, sent, failed }
}

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
    console.error('[birthday-wishes] qstash run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

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
    console.error('[birthday-wishes] manual run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
