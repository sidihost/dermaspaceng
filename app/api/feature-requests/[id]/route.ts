import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * Single feature-request detail — public read.
 *
 * GET /api/feature-requests/:id
 *   Returns the full request (author, vote count, team response, and,
 *   when signed in, whether the viewer voted / authored it). Powers the
 *   dedicated detail page at /feature-requests/[id].
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    const viewerId = user?.id ?? null

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
        fr.updated_at,
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
      WHERE fr.id = ${id}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
    }

    // A small sample of the people who upvoted, newest first — enough to
    // render an avatar/initials stack on the detail page.
    const voters = await sql`
      SELECT u.first_name, u.last_name, u.username, u.avatar_url
      FROM feature_request_votes v
      JOIN users u ON u.id = v.user_id
      WHERE v.request_id = ${id}
      ORDER BY v.created_at DESC
      LIMIT 12
    `

    return NextResponse.json({
      request: rows[0],
      voters,
      viewer: viewerId ? { id: viewerId, first_name: user?.first_name ?? null } : null,
    })
  } catch (err) {
    console.error('[FeatureRequests] detail GET failed:', err)
    return NextResponse.json({ error: 'Failed to load request' }, { status: 500 })
  }
}
