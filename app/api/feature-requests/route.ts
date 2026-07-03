import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * Feature Requests board — public read, authenticated write.
 *
 * GET  /api/feature-requests?sort=top|new&status=all|open|...&mine=1
 *      Returns the board with per-request vote counts and, when a user is
 *      signed in, whether they've voted + whether they authored it.
 *
 * POST /api/feature-requests   { title, description, category }
 *      Creates a new idea (signed-in clients only).
 */

const VALID_CATEGORIES = new Set([
  'general',
  'booking',
  'account',
  'payments',
  'services',
  'mobile',
])

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sort = searchParams.get('sort') === 'new' ? 'new' : 'top'
    const status = searchParams.get('status') || 'all'
    const mine = searchParams.get('mine') === '1'

    const user = await getCurrentUser()
    const viewerId = user?.id ?? null

    // Build the ordering: pinned always first, then by votes (top) or
    // recency (new). We compute vote_count via a correlated subquery so
    // the board stays a single round-trip.
    const rows = await sql`
      SELECT
        fr.id,
        fr.title,
        fr.description,
        fr.category,
        fr.status,
        fr.admin_note,
        fr.pinned,
        fr.created_at,
        u.first_name,
        u.last_name,
        u.username,
        u.avatar_url,
        (SELECT COUNT(*)::int FROM feature_request_votes v WHERE v.request_id = fr.id) AS vote_count,
        ${viewerId}::varchar IS NOT NULL AND EXISTS (
          SELECT 1 FROM feature_request_votes v
          WHERE v.request_id = fr.id AND v.user_id = ${viewerId}
        ) AS has_voted,
        (fr.user_id = ${viewerId}) AS is_author
      FROM feature_requests fr
      JOIN users u ON u.id = fr.user_id
      WHERE (${status} = 'all' OR fr.status = ${status})
        AND (${!mine} OR fr.user_id = ${viewerId})
      ORDER BY
        fr.pinned DESC,
        CASE WHEN ${sort} = 'top'
          THEN (SELECT COUNT(*) FROM feature_request_votes v WHERE v.request_id = fr.id)
          ELSE 0 END DESC,
        fr.created_at DESC
      LIMIT 200
    `

    // Status counts power the filter chips.
    const counts = await sql`
      SELECT status, COUNT(*)::int AS n FROM feature_requests GROUP BY status
    `

    // Personalisation payload — greet the signed-in client by name and
    // surface how much they've contributed (ideas shared, votes cast).
    let viewer: {
      id: string
      first_name: string | null
      ideas_count: number
      votes_count: number
    } | null = null

    if (viewerId) {
      const [stats] = await sql`
        SELECT
          (SELECT COUNT(*)::int FROM feature_requests fr WHERE fr.user_id = ${viewerId}) AS ideas_count,
          (SELECT COUNT(*)::int FROM feature_request_votes v WHERE v.user_id = ${viewerId}) AS votes_count
      `
      viewer = {
        id: viewerId,
        first_name: user?.first_name ?? null,
        ideas_count: stats?.ideas_count ?? 0,
        votes_count: stats?.votes_count ?? 0,
      }
    }

    return NextResponse.json({
      requests: rows,
      counts,
      viewer,
    })
  } catch (err) {
    console.error('[FeatureRequests] GET failed:', err)
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to submit an idea.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const title = String(body.title || '').trim()
    const description = String(body.description || '').trim()
    let category = String(body.category || 'general').trim().toLowerCase()

    if (title.length < 4) {
      return NextResponse.json({ error: 'Give your idea a short, clear title.' }, { status: 400 })
    }
    if (title.length > 140) {
      return NextResponse.json({ error: 'Title must be 140 characters or fewer.' }, { status: 400 })
    }
    if (description.length < 10) {
      return NextResponse.json({ error: 'Add a little more detail so the team understands the idea.' }, { status: 400 })
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: 'Description is too long.' }, { status: 400 })
    }
    if (!VALID_CATEGORIES.has(category)) category = 'general'

    const id = `fr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

    await sql`
      INSERT INTO feature_requests (id, user_id, title, description, category)
      VALUES (${id}, ${user.id}, ${title}, ${description}, ${category})
    `

    // Author auto-votes their own idea — it's their +1, and it means a
    // fresh board sorted by "top" isn't full of zero-vote rows.
    await sql`
      INSERT INTO feature_request_votes (request_id, user_id)
      VALUES (${id}, ${user.id})
      ON CONFLICT DO NOTHING
    `

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('[FeatureRequests] POST failed:', err)
    return NextResponse.json({ error: 'Could not submit your idea.' }, { status: 500 })
  }
}
