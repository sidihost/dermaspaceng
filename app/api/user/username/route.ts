import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { invalidateUserMe } from '@/lib/redis'
import { isReservedUsername } from '@/lib/reserved-usernames'
import { logProfileChanges } from '@/lib/profile-history'

// Check if username is available
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username must be 3-30 characters, letters, numbers, and underscores only' 
      })
    }

    // Reserved usernames come from the shared `lib/reserved-usernames`
    // registry — keeping this list inline previously drifted out of
    // sync with the actual list of top-level routes, letting people
    // claim handles like `register` or `feedback` that then collided
    // with real pages.
    if (isReservedUsername(username)) {
      return NextResponse.json({ available: false, error: 'This username is reserved' })
    }

    // Check if username exists
    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username})`
    
    return NextResponse.json({ available: existing.length === 0 })
  } catch (error) {
    console.error('Username check error:', error)
    return NextResponse.json({ error: 'Failed to check username' }, { status: 500 })
  }
}

// Set/update username
export async function POST(request: Request) {
  return handleUsernameUpdate(request)
}

// Also support PUT method
export async function PUT(request: Request) {
  return handleUsernameUpdate(request)
}

async function handleUsernameUpdate(request: Request) {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (!sessionId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Verify session and get user
    const sessions = await sql`
      SELECT user_id FROM sessions WHERE id = ${sessionId} AND expires_at > NOW()
    `
    
    if (sessions.length === 0) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }
    
    const userId = sessions[0].user_id
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-30 characters, letters, numbers, and underscores only' 
      }, { status: 400 })
    }

    // Same shared registry as the GET availability check above —
    // keeps the "is this name taken?" answer and the "can this name
    // actually be saved?" check perfectly aligned.
    if (isReservedUsername(username)) {
      return NextResponse.json({ error: 'This username is reserved' }, { status: 400 })
    }

    // Check if username is taken by another user
    const existing = await sql`SELECT id FROM users WHERE LOWER(username) = LOWER(${username}) AND id != ${userId}`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
    }

    // Update username
    // Capture the old handle for the audit log so admins can see
    // the rename in the change history. We do the lookup in the
    // same statement that performs the UPDATE to avoid a TOCTOU
    // race where the value changes between the two queries.
    const updated = await sql`
      WITH before AS (
        SELECT username AS old_username FROM users WHERE id = ${userId}
      )
      UPDATE users SET username = ${username}
      WHERE id = ${userId}
      RETURNING (SELECT old_username FROM before) AS old_username, username
    `
    const oldUsername = (updated[0]?.old_username ?? null) as string | null
    const newUsername = (updated[0]?.username ?? username) as string

    // Audit the change. Self-edit (the user is changing their own
    // username from settings) so `surface = 'self'` and changedBy
    // is the same user.
    logProfileChanges({
      userId,
      changedBy: userId,
      surface: 'self',
      changes: {
        username: { old: oldUsername, new: newUsername },
      },
      request,
    }).catch(() => {})

    // /api/auth/me caches `username`, which the mobile-nav profile
    // slot and public-profile links read on every render. Bust the
    // cache so the new handle propagates immediately instead of
    // sticking on the old value for up to 60s.
    invalidateUserMe(userId).catch(() => {})

    return NextResponse.json({ success: true, username })
  } catch (error) {
    console.error('Username update error:', error)
    return NextResponse.json({ error: 'Failed to update username' }, { status: 500 })
  }
}
