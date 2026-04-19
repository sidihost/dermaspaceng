import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendBirthdayEmail } from '@/lib/email'

/**
 * Birthday wish cron
 * -------------------------------------------------------------
 * Runs once a day (see vercel.json). For every active user whose
 * date_of_birth's month + day matches "today" in Africa/Lagos, we
 * send a personalised birthday email and record the send date in
 * users.last_birthday_email_sent_at so retries within the same day
 * (and across years) never double-send.
 *
 * Idempotency guarantee: a user will receive AT MOST one birthday
 * email per calendar date, even if this route is invoked multiple
 * times. The uniqueness key is (user.id, last_birthday_email_sent_at
 * = today).
 */
export async function GET(request: NextRequest) {
  try {
    // Cron secret — same pattern as /api/cron/security-reminders.
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Find users whose birthday is "today" in Nigeria (Lagos, WAT, UTC+1),
    // who have a real email, are active, and haven't already been wished
    // today. We compare EXTRACT(MONTH/DAY) against `now() AT TIME ZONE`
    // instead of comparing the full date so Feb-29 birthdays still resolve
    // correctly on non-leap years (we just won't match them — behaviour we
    // accept rather than silently shifting to 28th/1st).
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
              = EXTRACT(DAY   FROM (NOW() AT TIME ZONE 'Africa/Lagos'))
        AND (
          last_birthday_email_sent_at IS NULL
          OR last_birthday_email_sent_at
               < (NOW() AT TIME ZONE 'Africa/Lagos')::date
        )
      LIMIT 500
    `

    let sentCount = 0
    let failedCount = 0

    for (const u of birthdayUsers) {
      try {
        const ok = await sendBirthdayEmail({
          email: u.email as string,
          firstName: (u.first_name as string) || 'there',
        })
        if (ok) {
          // Stamp with today's Lagos date so we don't resend in the same
          // 24h window and so next year this row is eligible again.
          await sql`
            UPDATE users
            SET last_birthday_email_sent_at = (NOW() AT TIME ZONE 'Africa/Lagos')::date
            WHERE id = ${u.id}
          `
          sentCount++
        } else {
          failedCount++
        }
      } catch (err) {
        console.error('[birthday-wishes] failed for', u.email, err)
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      candidates: birthdayUsers.length,
      sent: sentCount,
      failed: failedCount,
    })
  } catch (error) {
    console.error('[birthday-wishes] cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
