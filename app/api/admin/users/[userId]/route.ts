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

    const [tickets, consultations, complaints, notifications, sessions] = await Promise.all([
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
    ])

    // Aggregate totals in one round-trip via UNION of counts.
    const counts = await safe(() => sql`
      SELECT
        (SELECT COUNT(*)::int FROM support_tickets WHERE user_id = ${userId}) AS tickets,
        (SELECT COUNT(*)::int FROM consultations WHERE email = ${user.email as string}) AS consultations,
        (SELECT COUNT(*)::int FROM contact_messages WHERE email = ${user.email as string}) AS complaints
    `, [{ tickets: 0, consultations: 0, complaints: 0 }])

    return NextResponse.json({
      user,
      stats: counts[0] || { tickets: 0, consultations: 0, complaints: 0 },
      tickets,
      consultations,
      complaints,
      notifications,
      sessions,
    })
  } catch (error) {
    console.error('[v0] Get user detail error:', error)
    // Surface the real message so we can see why the query failed in
    // the network panel instead of a generic "Failed to fetch user".
    const message = error instanceof Error ? error.message : 'Failed to fetch user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
