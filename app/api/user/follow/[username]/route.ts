import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// POST /api/user/follow/[username]   → follow that user
// DELETE /api/user/follow/[username] → unfollow that user
// GET  /api/user/follow/[username]   → { isFollowing, followerCount, followingCount }
//
// `username` can be either the handle ("tariqjr") or a raw user id —
// this mirrors the profile API's lookup logic so deep links work even
// before a user has set a username.

async function resolveTarget(username: string) {
  const clean = username.replace(/^@/, '').toLowerCase().trim()
  let rows = await sql`
    SELECT id FROM users WHERE LOWER(username) = ${clean} LIMIT 1
  `
  if (rows.length === 0) {
    rows = await sql`
      SELECT id FROM users WHERE id::text = ${username} LIMIT 1
    `
  }
  return rows[0]?.id as string | undefined
}

async function getCounts(userId: string) {
  const [followers, following] = await Promise.all([
    sql`SELECT COUNT(*)::int AS c FROM user_follows WHERE following_id = ${userId}`,
    sql`SELECT COUNT(*)::int AS c FROM user_follows WHERE follower_id = ${userId}`,
  ])
  return {
    followerCount: Number(followers[0]?.c ?? 0),
    followingCount: Number(following[0]?.c ?? 0),
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params
    const targetId = await resolveTarget(username)
    if (!targetId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const me = await getCurrentUser()
    let isFollowing = false
    if (me && me.id !== targetId) {
      const rel = await sql`
        SELECT 1 FROM user_follows
        WHERE follower_id = ${me.id} AND following_id = ${targetId}
        LIMIT 1
      `
      isFollowing = rel.length > 0
    }

    const counts = await getCounts(targetId)
    return NextResponse.json({ isFollowing, ...counts })
  } catch (e) {
    console.error('[follow] GET failed:', e)
    return NextResponse.json({ error: 'Failed to load follow state' }, { status: 500 })
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json(
        { error: 'Sign in to follow people', code: 'UNAUTHENTICATED' },
        { status: 401 },
      )
    }

    const { username } = await params
    const targetId = await resolveTarget(username)
    if (!targetId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (targetId === me.id) {
      return NextResponse.json(
        { error: 'You can\u2019t follow yourself' },
        { status: 400 },
      )
    }

    // ON CONFLICT DO NOTHING makes the call idempotent so the UI can
    // safely retry / double-tap without errors.
    await sql`
      INSERT INTO user_follows (follower_id, following_id)
      VALUES (${me.id}, ${targetId})
      ON CONFLICT (follower_id, following_id) DO NOTHING
    `

    const counts = await getCounts(targetId)
    return NextResponse.json({ isFollowing: true, ...counts })
  } catch (e) {
    console.error('[follow] POST failed:', e)
    return NextResponse.json({ error: 'Failed to follow' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json(
        { error: 'Sign in to unfollow', code: 'UNAUTHENTICATED' },
        { status: 401 },
      )
    }

    const { username } = await params
    const targetId = await resolveTarget(username)
    if (!targetId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await sql`
      DELETE FROM user_follows
      WHERE follower_id = ${me.id} AND following_id = ${targetId}
    `

    const counts = await getCounts(targetId)
    return NextResponse.json({ isFollowing: false, ...counts })
  } catch (e) {
    console.error('[follow] DELETE failed:', e)
    return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 })
  }
}
