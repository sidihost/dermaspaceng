import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendBirthdayEmail } from '@/lib/email'
import { verifyQStash } from '@/lib/qstash'
import { authorizeCronManualGet } from '@/lib/cron-auth'
import {
  evaluateBirthdayRecipients,
  getLagosDateParts,
  type BirthdayCandidateRow,
} from '@/lib/birthday-cron'

// ---------------------------------------------------------------------------
// /api/cron/birthday-wishes
//
// Scheduled daily by QStash (see lib/qstash-schedules.ts). The body is
// empty; we identify active, non-deleted users whose `date_of_birth` matches
// today in `Africa/Lagos` (UTC+1, including Feb 29 celebrated on Feb 28 in
// non-leap years). `users.last_birthday_email_sent_at` is the idempotency
// key — each user receives at most one birthday wish per calendar day even
// if QStash redelivers or an admin triggers "Run now".
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'

type RunResult = {
  lagosDate: string
  matchedToday: number
  candidates: number
  sent: number
  failed: number
  alreadySentToday: number
  skippedNoEmail: number
}

async function runJob(): Promise<RunResult> {
  const lagos = getLagosDateParts()

  const matchedRows = (await sql`
    SELECT
      id,
      email,
      first_name,
      TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS dob,
      CASE
        WHEN last_birthday_email_sent_at IS NOT NULL
        THEN TO_CHAR(last_birthday_email_sent_at::date, 'YYYY-MM-DD')
        ELSE NULL
      END AS last_sent_date
    FROM users
    WHERE date_of_birth IS NOT NULL
      AND COALESCE(is_active, true) = true
      AND deleted_at IS NULL
      AND (
        (
          EXTRACT(MONTH FROM date_of_birth) = ${lagos.month}
          AND EXTRACT(DAY FROM date_of_birth) = ${lagos.day}
        )
        OR (
          EXTRACT(MONTH FROM date_of_birth) = 2
          AND EXTRACT(DAY FROM date_of_birth) = 29
          AND ${lagos.month} = 2
          AND ${lagos.day} = 28
          AND EXTRACT(MONTH FROM (${lagos.isoDate}::date + INTERVAL '1 day')) = 3
        )
      )
    LIMIT 500
  `) as unknown as BirthdayCandidateRow[]

  const { eligible, alreadySentToday, skippedNoEmail } =
    evaluateBirthdayRecipients(matchedRows, lagos.isoDate)

  let sent = 0
  let failed = 0
  for (const u of eligible) {
    try {
      const ok = await sendBirthdayEmail({
        email: u.email,
        firstName: u.firstName,
        userId: u.id,
        dob: u.dob,
      })
      if (ok) {
        await sql`
          UPDATE users
          SET last_birthday_email_sent_at = ${lagos.isoDate}::date
          WHERE id = ${u.id}
        `
        sent++
      } else {
        failed++
      }
    } catch (err) {
      console.error('[birthday-wishes] failed for user', u.id, err)
      failed++
    }
  }

  return {
    lagosDate: lagos.isoDate,
    matchedToday: matchedRows.length,
    candidates: eligible.length,
    sent,
    failed,
    alreadySentToday,
    skippedNoEmail,
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const ok = await verifyQStash(request, rawBody)
  if (!ok) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 })
  }
  try {
    const r = await runJob()
    return NextResponse.json(
      { success: true, source: 'qstash', ...r },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[birthday-wishes] qstash run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  if (!(await authorizeCronManualGet(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const r = await runJob()
    return NextResponse.json(
      { success: true, source: 'manual', ...r },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('[birthday-wishes] manual run failed:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
