import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

// GET /api/admin/users/[userId]
// Returns the user profile plus lightweight activity summaries so the admin
// user-detail page can render everything in a single round-trip without
// N+1 fetches on the client.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()
    const { userId } = await params

    // Only select columns that are guaranteed to exist across every
    // environment. Optional columns (username, avatar_url) are pulled
    // separately and merged in, so a missing migration can't break the
    // whole page with a cryptic "Failed to fetch user" error.
    // `last_login_at` and `bio` were dropped entirely — no migration adds
    // them and the previous code was silently 500-ing on production.
    const userRows = await sql`
      SELECT
        id, email, first_name, last_name, phone,
        email_verified, role, is_active, created_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `
    if (userRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const user = userRows[0] as Record<string, unknown>

    // Try to hydrate the optional `username` and `avatar_url` columns.
    // If the Google OAuth / username migrations have been applied this
    // succeeds; if not, we silently fall back to null so the detail page
    // still renders.
    try {
      const extra = await sql`
        SELECT username, avatar_url
        FROM users
        WHERE id = ${userId}
        LIMIT 1
      `
      if (extra.length > 0) {
        user.username = extra[0].username ?? null
        user.avatar_url = extra[0].avatar_url ?? null
      }
    } catch {
      user.username = null
      user.avatar_url = null
    }

    // Fire related queries in parallel. Each is wrapped so one missing
    // table (older environments) doesn't wipe out the whole response.
    const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn() } catch { return fallback }
    }

    const [
      tickets,
      consultations,
      complaints,
      notifications,
      sessions,
      pageViews,
      aiChats,
      twoFa,
      passkeys,
    ] = await Promise.all([
      safe(() => sql`
        SELECT id, ticket_id, subject, status, priority, category, created_at
        FROM support_tickets
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, location, status, created_at
        FROM consultations
        WHERE email = ${user.email as string}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, subject, status, priority, created_at
        FROM contact_messages
        WHERE email = ${user.email as string}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, title, type, is_read, created_at
        FROM user_notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 5
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT id, device_info, ip_address, created_at, expires_at
        FROM sessions
        WHERE user_id = ${userId} AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 5
      `, [] as Record<string, unknown>[]),
      // Last 25 pages this user visited. Only available once
      // migration 043 is applied; older environments return [].
      safe(() => sql`
        SELECT id, path, title, referrer, created_at
        FROM page_views
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 25
      `, [] as Record<string, unknown>[]),
      // Recent Derma AI conversations the user kicked off, plus the
      // running totals for the snapshot card.
      safe(() => sql`
        SELECT id, prompt_preview, message_count, created_at
        FROM ai_chat_logs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 10
      `, [] as Record<string, unknown>[]),
      // 2FA settings live in user_2fa_settings (migration 029). Old
      // environments without that table fall back to "disabled".
      safe(() => sql`
        SELECT
          totp_enabled,
          passkey_enabled,
          backup_codes_generated_at,
          last_2fa_prompt_at
        FROM user_2fa_settings
        WHERE user_id = ${userId}
        LIMIT 1
      `, [] as Record<string, unknown>[]),
      safe(() => sql`
        SELECT COUNT(*)::int AS count FROM passkey_credentials WHERE user_id = ${userId}
      `, [{ count: 0 }] as Record<string, unknown>[]),
    ])

    // Aggregate totals in one round-trip via UNION of counts. Wrapped
    // separately for AI chats / page views because those are on newer
    // tables that may not exist yet.
    const counts = await safe(() => sql`
      SELECT
        (SELECT COUNT(*)::int FROM support_tickets WHERE user_id = ${userId}) AS tickets,
        (SELECT COUNT(*)::int FROM consultations WHERE email = ${user.email as string}) AS consultations,
        (SELECT COUNT(*)::int FROM contact_messages WHERE email = ${user.email as string}) AS complaints
    `, [{ tickets: 0, consultations: 0, complaints: 0 }])

    const aiChatCounts = await safe(() => sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS this_week
      FROM ai_chat_logs
      WHERE user_id = ${userId}
    `, [{ total: 0, this_week: 0 }])

    const pageViewCounts = await safe(() => sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(DISTINCT path)::int AS unique_paths,
        MAX(created_at) AS last_visit
      FROM page_views
      WHERE user_id = ${userId}
    `, [{ total: 0, unique_paths: 0, last_visit: null }])

    const twoFaRow = (twoFa[0] as Record<string, unknown>) || {}
    const security = {
      totpEnabled: Boolean(twoFaRow.totp_enabled),
      passkeyEnabled: Boolean(twoFaRow.passkey_enabled),
      passkeyCount: Number((passkeys[0] as { count?: number })?.count ?? 0),
      backupCodesGeneratedAt: twoFaRow.backup_codes_generated_at ?? null,
      // The user is "2FA-protected" if either TOTP or a passkey is
      // active. We expose both booleans so the UI can show a
      // breakdown badge.
      twoFactorEnabled:
        Boolean(twoFaRow.totp_enabled) ||
        Boolean(twoFaRow.passkey_enabled) ||
        Number((passkeys[0] as { count?: number })?.count ?? 0) > 0,
    }

    return NextResponse.json({
      user,
      stats: counts[0] || { tickets: 0, consultations: 0, complaints: 0 },
      tickets,
      consultations,
      complaints,
      notifications,
      sessions,
      pageViews,
      aiChats,
      security,
      activity: {
        aiChats: aiChatCounts[0] || { total: 0, this_week: 0 },
        pageViews: pageViewCounts[0] || { total: 0, unique_paths: 0, last_visit: null },
      },
    })
  } catch (error) {
    console.error('[v0] Get user detail error:', error)
    // Surface the real message so we can see why the query failed in
    // the network panel instead of a generic "Failed to fetch user".
    const message = error instanceof Error ? error.message : 'Failed to fetch user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
