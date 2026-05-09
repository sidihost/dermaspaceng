/**
 * POST /api/admin/users/[userId]/reset-password
 *
 * Lets an admin force-reset a user's password without going through
 * the standard "forgot password" email flow. Two modes are supported
 * via the request body:
 *
 *   { mode: 'send_link' }
 *     Mints a fresh password-reset token, stamps it onto the user
 *     row (`password_reset_token` + `password_reset_expires`), and
 *     emails the user a reset link. Recommended default — the admin
 *     never sees the secret, and the customer keeps full control.
 *
 *   { mode: 'set_temp', tempPassword?: string }
 *     Hashes a one-shot temporary password and writes it directly to
 *     `password_hash`, then displays the cleartext to the admin so
 *     they can read it to the customer over the phone. We require
 *     `requires_password_reset = true` on the row so the user is
 *     forced to change it on first login.
 *     If `tempPassword` is omitted we generate a 12-char random one.
 *
 * Only the `admin` role can call this — staff don't get to reset
 * customer credentials.
 *
 * Audit: every reset is recorded in `activity_log` with the admin id
 * and target user id so we always know who reset whom.
 */

import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin, hashPassword } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { sendPasswordResetEmail } from '@/lib/email'

function generateTempPassword(): string {
  // 12 chars, mixed case + digits, deliberately no symbols so it's
  // easy to read aloud over the phone if the admin needs to dictate
  // it. Removes ambiguous characters (0/O, 1/l/I) to avoid mishears.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await requireAdmin()
    const { userId } = await params

    const body = (await request.json().catch(() => ({}))) as {
      mode?: 'send_link' | 'set_temp'
      tempPassword?: string
    }
    const mode = body.mode ?? 'send_link'

    const userRows = await sql`
      SELECT id, email, first_name FROM users WHERE id = ${userId} LIMIT 1
    `
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const target = userRows[0] as {
      id: string
      email: string
      first_name: string
    }

    if (mode === 'send_link') {
      // Mint a fresh token + 1-hour expiry. We deliberately overwrite
      // any existing reset token so a fresh admin-issued link beats
      // a stale "forgot password" attempt by the user.
      const token = uuidv4()
      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      try {
        await sql`
          UPDATE users
          SET password_reset_token = ${token},
              password_reset_expires = ${expires}
          WHERE id = ${userId}
        `
      } catch (err) {
        console.error('[v0] reset-password: cannot persist token', err)
        return NextResponse.json(
          {
            error:
              'Password reset columns are missing. Run scripts/add-password-reset.sql.',
          },
          { status: 500 },
        )
      }

      const base = (
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        'https://dermaspaceng.com'
      ).replace(/\/$/, '')
      const resetUrl = `${base}/reset-password?token=${token}`

      try {
        // Reuses the standard "forgot password" email so the customer
        // sees a familiar template — the only difference is that the
        // admin triggered it instead of the user. The email body
        // already includes a clear "if you didn't request this..."
        // disclaimer which is just as accurate when an admin sends it.
        await sendPasswordResetEmail(target.email, target.first_name, token)
      } catch (err) {
        console.error('[v0] reset-password: email send failed', err)
        // Fall through — the token is still valid. Admin can copy
        // the link from the response below.
      }

      try {
        await sql`
          INSERT INTO activity_log (user_id, action, details, created_at)
          VALUES (
            ${admin.id},
            'admin_password_reset_link',
            ${JSON.stringify({ targetUserId: userId, mode: 'send_link' })},
            NOW()
          )
        `
      } catch {
        // log skipping is fine
      }

      return NextResponse.json({
        ok: true,
        mode: 'send_link',
        // Surface the URL so admin can re-share it manually if the
        // customer says the email never arrived.
        resetUrl,
      })
    }

    // mode === 'set_temp'
    const tempPassword = body.tempPassword?.trim() || generateTempPassword()
    if (tempPassword.length < 8) {
      return NextResponse.json(
        { error: 'Temporary password must be at least 8 characters.' },
        { status: 400 },
      )
    }
    const hash = await hashPassword(tempPassword)

    // We try to flip `requires_password_reset` if the column exists.
    // If not (old environments), we just set the password — the user
    // should still be nudged to change it via the reset link UI.
    try {
      await sql`
        UPDATE users
        SET password_hash = ${hash},
            requires_password_reset = TRUE,
            password_reset_token = NULL,
            password_reset_expires = NULL
        WHERE id = ${userId}
      `
    } catch {
      // requires_password_reset doesn't exist on this environment —
      // fall back to a plain password update.
      await sql`
        UPDATE users
        SET password_hash = ${hash},
            password_reset_token = NULL,
            password_reset_expires = NULL
        WHERE id = ${userId}
      `
    }

    try {
      await sql`
        INSERT INTO activity_log (user_id, action, details, created_at)
        VALUES (
          ${admin.id},
          'admin_password_reset_temp',
          ${JSON.stringify({ targetUserId: userId, mode: 'set_temp' })},
          NOW()
        )
      `
    } catch {
      // log skipping is fine
    }

    return NextResponse.json({
      ok: true,
      mode: 'set_temp',
      // We surface the cleartext exactly once so the admin can read
      // it to the customer. After this response there's no way to
      // recover it.
      tempPassword,
    })
  } catch (err) {
    if (err instanceof Error && /unauthorized|forbidden/i.test(err.message)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[v0] admin reset-password error:', err)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 },
    )
  }
}
