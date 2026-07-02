import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * Toggle the current user's upvote on a feature request.
 * POST /api/feature-requests/:id/vote  -> { voted, voteCount }
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to vote.' }, { status: 401 })
    }

    const exists = await sql`SELECT 1 FROM feature_requests WHERE id = ${id} LIMIT 1`
    if (exists.length === 0) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 })
    }

    const already = await sql`
      SELECT 1 FROM feature_request_votes
      WHERE request_id = ${id} AND user_id = ${user.id} LIMIT 1
    `

    let voted: boolean
    if (already.length > 0) {
      await sql`
        DELETE FROM feature_request_votes
        WHERE request_id = ${id} AND user_id = ${user.id}
      `
      voted = false
    } else {
      await sql`
        INSERT INTO feature_request_votes (request_id, user_id)
        VALUES (${id}, ${user.id})
        ON CONFLICT DO NOTHING
      `
      voted = true
    }

    const [{ n }] = await sql`
      SELECT COUNT(*)::int AS n FROM feature_request_votes WHERE request_id = ${id}
    `

    return NextResponse.json({ voted, voteCount: n })
  } catch (err) {
    console.error('[FeatureRequests] vote failed:', err)
    return NextResponse.json({ error: 'Could not register your vote.' }, { status: 500 })
  }
}
