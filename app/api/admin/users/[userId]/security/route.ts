import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/**
 * POST /api/admin/users/[userId]/security
 *
 * Lets a verified admin reset a user's 2FA configuration when a
 * customer is locked out (lost device, deleted authenticator app,
 * passkey on a sold laptop, etc.). Three actions are supported:
 *
 *   • action: 'remove_totp'     — disable Google Authenticator
 *   • action: 'remove_passkeys' — wipe every WebAuthn credential
 *   • action: 'remove_all'      — disable TOTP, wipe passkeys, reset
 *                                 backup codes. Recommended default
 *                                 because it puts the account back to
 *                                 a clean "password only" state.
 *
 * Only `admin` role can call this — staff should escalate.
 *
 * NOTE on userId types: `users.id` is a VARCHAR(36) UUID across the
 * codebase; passkey_credentials.user_id was created as UUID NOT NULL
 * (no FK) in scripts/029. We pass the value through unchanged and let
 * Postgres coerce the comparison; if a future migration tightens the
 * column we'll need to revisit.
 */

type Action = 'remove_totp' | 'remove_passkeys' | 'remove_all'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await requireAdmin()
    const { userId } = await params

    const body = (await request.json().catch(() => ({}))) as { action?: Action }
    const action = body.action

    if (!action || !['remove_totp', 'remove_passkeys', 'remove_all'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Quick existence check so we return a friendlier error than a
    // silent no-op if the userId is wrong.
    const userRows = await sql`SELECT id, email FROM users WHERE id = ${userId} LIMIT 1`
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const removeTotp = action === 'remove_totp' || action === 'remove_all'
    const removePasskeys = action === 'remove_passkeys' || action === 'remove_all'

    if (removeTotp) {
      // Wipe TOTP-related fields. We keep the row so the timestamps and
      // future preferences survive; everything secret is nulled.
      await sql`
        UPDATE user_2fa_settings
        SET
          totp_enabled = false,
          totp_secret = NULL,
          totp_verified_at = NULL,
          backup_codes = NULL,
          backup_codes_generated_at = NULL,
          backup_codes_used = 0,
          current_challenge = NULL,
          challenge_expires_at = NULL,
          updated_at = NOW()
        WHERE user_id = ${userId}
      `
    }

    if (removePasskeys) {
      // Hard delete every credential so the user can re-enrol cleanly.
      // Cast user_id to TEXT on both sides so this works whether the
      // table column is UUID or VARCHAR — older environments differ.
      await sql`
        DELETE FROM passkey_credentials
        WHERE user_id::TEXT = ${userId}
      `
      await sql`
        UPDATE user_2fa_settings
        SET
          passkey_enabled = false,
          passkey_only = false,
          current_challenge = NULL,
          challenge_expires_at = NULL,
          updated_at = NOW()
        WHERE user_id = ${userId}
      `
    }

    // Also clear the standalone requires_2fa flag if everything was
    // removed — otherwise the user would be locked into a 2FA prompt
    // they can no longer satisfy.
    if (action === 'remove_all') {
      await sql`UPDATE users SET requires_2fa = false WHERE id = ${userId}`
    }

    // Record the admin action in activity_log for auditability so we
    // know which admin reset which user. Wrapped in a try/catch so a
    // missing activity_log table never blocks the reset itself.
    try {
      await sql`
        INSERT INTO activity_log (user_id, action, details, created_at)
        VALUES (
          ${admin.id},
          ${'admin_reset_2fa'},
          ${JSON.stringify({ targetUserId: userId, action })},
          NOW()
        )
      `
    } catch (err) {
      console.warn('[v0] activity_log insert skipped:', err)
    }

    return NextResponse.json({ ok: true, action })
  } catch (error) {
    if (error instanceof Error && /unauthorized|forbidden/i.test(error.message)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[v0] admin reset 2FA error:', error)
    return NextResponse.json(
      { error: 'Failed to reset 2FA' },
      { status: 500 },
    )
  }
}
