import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { sendSecurityReminderEmail } from '@/lib/email'

// This cron runs ONCE daily at 09:00 UTC (Vercel Hobby plans only allow
// daily cron schedules, see https://vercel.com/docs/cron-jobs). Because
// we only fire once a day, the SQL window below is 2h–26h instead of
// 2h–5h so a single daily run still catches every user who signed up
// in the past day without 2FA or a passkey. The 2-hour lead-in keeps
// us from emailing someone who has literally just finished signup and
// may still be mid-onboarding.
//
// Configure in vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/security-reminders",
//     "schedule": "0 9 * * *"
//   }]
// }

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow in development or if CRON_SECRET is not set
      if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    // Find users who:
    // 1. Registered between 2-5 hours ago
    // 2. Haven't set up passkey OR haven't set up 2FA
    // 3. Haven't received a security reminder email yet
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
      -- Daily-cron-friendly window: anyone who signed up between 2h and
      -- 26h ago. The 2h lead-in avoids paging users still inside their
      -- initial onboarding flow, and the 26h tail (instead of 24h) gives
      -- the cron a 2h overlap buffer so nobody slips through if the job
      -- fires a little late one day.
      WHERE u.created_at BETWEEN NOW() - INTERVAL '26 hours' AND NOW() - INTERVAL '2 hours'
        AND COALESCE(u.security_reminder_sent, false) = false
      ORDER BY u.created_at ASC
      LIMIT 500
    `

    let sentCount = 0
    let skippedCount = 0
    let failedCount = 0

    for (const user of usersNeedingReminder) {
      // Skip users who already have both passkey and 2FA set up
      if (user.has_passkey && user.has_2fa) {
        skippedCount++
        // Mark as sent so we don't check again
        await sql`
          UPDATE users SET security_reminder_sent = true WHERE id = ${user.id}
        `
        continue
      }

      try {
        // Send security reminder email
        await sendSecurityReminderEmail({
          email: user.email,
          firstName: user.first_name || 'there',
          hasPasskey: user.has_passkey,
          has2FA: user.has_2fa
        })

        // Mark email as sent
        await sql`
          UPDATE users 
          SET security_reminder_sent = true, security_reminder_sent_at = NOW()
          WHERE id = ${user.id}
        `

        sentCount++
      } catch (error) {
        console.error(`Failed to send security reminder to ${user.email}:`, error)
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${usersNeedingReminder.length} users`,
      sent: sentCount,
      skipped: skippedCount,
      failed: failedCount
    })
  } catch (error) {
    console.error('Security reminders cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
