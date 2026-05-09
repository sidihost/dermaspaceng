import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

/*
 * GET /api/admin/newsletter/subscribers
 *
 * Returns the full subscriber list for the admin newsletter console
 * plus the headline counts (total / active / unsubscribed) used by
 * the stat tiles. Filters & search live on the same endpoint so the
 * client can hit one URL on every keystroke without juggling two
 * SWR keys.
 *
 * Query params:
 *   q       — case-insensitive substring match on email / first name
 *             / last name
 *   status  — `all` (default) / `active` / `unsubscribed` / `bounced`
 *   limit   — page size (default 100, hard max 500)
 *   offset  — page offset
 */

export async function GET(request: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  const status = (searchParams.get('status') || 'all').trim().toLowerCase()
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 500)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

  // Wildcard pattern for ILIKE. Always passes the bind through `sql`
  // so we never interpolate user input into the query string.
  const pattern = `%${q.replace(/[%_]/g, m => `\\${m}`)}%`

  try {
    // Headline counts — one round-trip, grouped on `status`. We fetch
    // these unconditionally so the stat tiles in the UI never lag the
    // list filters by a render.
    const counts = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active' OR status IS NULL) AS active_count,
        COUNT(*) FILTER (WHERE status = 'unsubscribed') AS unsubscribed_count,
        COUNT(*) FILTER (WHERE status = 'bounced') AS bounced_count,
        COUNT(*) AS total_count
      FROM newsletter_subscribers
    `

    // List query. Builds the WHERE clause incrementally because Neon's
    // tagged-template form doesn't compose conditional fragments — so
    // we pre-resolve the two filter cases into static branches.
    let rows
    if (status === 'all' && !q) {
      rows = await sql`
        SELECT id, email, first_name, last_name, source, status,
               last_sent_at, unsubscribed_at, created_at
        FROM newsletter_subscribers
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (status === 'all') {
      rows = await sql`
        SELECT id, email, first_name, last_name, source, status,
               last_sent_at, unsubscribed_at, created_at
        FROM newsletter_subscribers
        WHERE email ILIKE ${pattern}
           OR first_name ILIKE ${pattern}
           OR last_name ILIKE ${pattern}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    } else if (!q) {
      // Map "active" to "active OR null" so legacy rows (where the
      // column was added by the migration with a default of 'active'
      // but pre-existed the migration) still show up under Active.
      if (status === 'active') {
        rows = await sql`
          SELECT id, email, first_name, last_name, source, status,
                 last_sent_at, unsubscribed_at, created_at
          FROM newsletter_subscribers
          WHERE COALESCE(status, 'active') = 'active'
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        rows = await sql`
          SELECT id, email, first_name, last_name, source, status,
                 last_sent_at, unsubscribed_at, created_at
          FROM newsletter_subscribers
          WHERE status = ${status}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    } else {
      if (status === 'active') {
        rows = await sql`
          SELECT id, email, first_name, last_name, source, status,
                 last_sent_at, unsubscribed_at, created_at
          FROM newsletter_subscribers
          WHERE COALESCE(status, 'active') = 'active'
            AND (email ILIKE ${pattern}
              OR first_name ILIKE ${pattern}
              OR last_name ILIKE ${pattern})
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      } else {
        rows = await sql`
          SELECT id, email, first_name, last_name, source, status,
                 last_sent_at, unsubscribed_at, created_at
          FROM newsletter_subscribers
          WHERE status = ${status}
            AND (email ILIKE ${pattern}
              OR first_name ILIKE ${pattern}
              OR last_name ILIKE ${pattern})
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `
      }
    }

    return NextResponse.json({
      counts: {
        total: Number(counts[0]?.total_count ?? 0),
        active: Number(counts[0]?.active_count ?? 0),
        unsubscribed: Number(counts[0]?.unsubscribed_count ?? 0),
        bounced: Number(counts[0]?.bounced_count ?? 0),
      },
      subscribers: rows.map(r => ({
        id: r.id,
        email: r.email,
        firstName: r.first_name || null,
        lastName: r.last_name || null,
        source: r.source || 'homepage',
        status: r.status || 'active',
        lastSentAt: r.last_sent_at ? new Date(r.last_sent_at as string).toISOString() : null,
        unsubscribedAt: r.unsubscribed_at ? new Date(r.unsubscribed_at as string).toISOString() : null,
        createdAt: r.created_at ? new Date(r.created_at as string).toISOString() : null,
      })),
    })
  } catch (error) {
    console.error('[newsletter/subscribers] list failed', error)
    return NextResponse.json({ error: 'Failed to load subscribers' }, { status: 500 })
  }
}
