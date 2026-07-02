import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/user/follow/[username]/list?type=followers|following
//
// Returns the list of people who follow `username` (type=followers) or
// the people `username` follows (type=following), as lightweight profile
// cards. When the viewer is signed in, each row also carries `isFollowedByMe`
// so the UI can render a Follow / Following button inline — mirroring how
// Instagram / X render their follower sheets.
//
// `username` resolves by handle first, then by raw user id, matching the
// follow + profile endpoints so deep links keep working before a user has
// set a username.

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

interface ConnectionRow {
  id: string
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  bio: string | null
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await params
    const type = req.nextUrl.searchParams.get('type') === 'following'
      ? 'following'
      : 'followers'

    const targetId = await resolveTarget(username)
    if (!targetId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Followers  → users whose follow row points AT the target.
    // Following → users the target's follow rows point TO.
    // We order by most-recent connection so the sheet leads with the
    // freshest activity, and cap at 100 which is plenty for a sheet.
    const rows = (type === 'followers'
      ? await sql`
          SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url, u.bio
          FROM user_follows f
          JOIN users u ON u.id = f.follower_id
          WHERE f.following_id = ${targetId}
            AND COALESCE(u.is_active, true) = true
          ORDER BY f.created_at DESC
          LIMIT 100
        `
      : await sql`
          SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url, u.bio
          FROM user_follows f
          JOIN users u ON u.id = f.following_id
          WHERE f.follower_id = ${targetId}
            AND COALESCE(u.is_active, true) = true
          ORDER BY f.created_at DESC
          LIMIT 100
        `) as ConnectionRow[]

    // Decorate with the viewer's own follow state so the sheet can show
    // Follow / Following buttons without an extra round-trip per row.
    const me = await getCurrentUser()
    let followedIds = new Set<string>()
    if (me && rows.length > 0) {
      const ids = rows.map((r) => r.id)
      const mine = (await sql`
        SELECT following_id FROM user_follows
        WHERE follower_id = ${me.id}
          AND following_id = ANY(${ids})
      `) as Array<{ following_id: string }>
      followedIds = new Set(mine.map((m) => m.following_id))
    }

    const people = rows.map((r) => {
      const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
      return {
        id: r.id,
        username: r.username,
        name: fullName || r.username || 'Dermaspace member',
        avatarUrl: r.avatar_url,
        bio: r.bio,
        // Deep link target — prefer handle, fall back to id.
        href: `/${r.username || r.id}`,
        isFollowedByMe: followedIds.has(r.id),
        isMe: me?.id === r.id,
      }
    })

    return NextResponse.json({ type, count: people.length, people })
  } catch (e) {
    console.error('[follow/list] GET failed:', e)
    return NextResponse.json({ error: 'Failed to load list' }, { status: 500 })
  }
}
