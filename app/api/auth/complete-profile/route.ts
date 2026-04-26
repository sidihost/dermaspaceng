import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { invalidateUserMe } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { phone, firstName, lastName, avatarUrl, username, bio, isPublic } = body

    // Validate phone number
    if (!phone || phone.trim().length < 10) {
      return NextResponse.json({ error: 'Please provide a valid phone number' }, { status: 400 })
    }

    // Whitelist of optional social columns the client may set on
    // signup. Kept in sync with /api/auth/profile's SOCIAL_FIELDS so
    // there's a single canonical list across the codebase — if we
    // add a new network here we only touch one other place.
    const SOCIAL_FIELDS = [
      'website',
      'instagram',
      'twitter',
      'tiktok',
      'facebook',
      'linkedin',
      'youtube',
    ] as const
    const SOCIAL_LIMIT = 200
    const BIO_LIMIT = 500

    // Build update query dynamically
    const updates: string[] = []
    const values: (string | boolean | null)[] = []
    let paramIndex = 1

    // Always update profile_complete and updated_at
    updates.push(`profile_complete = true`)
    updates.push(`updated_at = NOW()`)

    if (phone) {
      updates.push(`phone = $${paramIndex}`)
      values.push(phone.trim())
      paramIndex++
    }

    if (firstName) {
      updates.push(`first_name = $${paramIndex}`)
      values.push(firstName.trim())
      paramIndex++
    }

    if (lastName) {
      updates.push(`last_name = $${paramIndex}`)
      values.push(lastName.trim())
      paramIndex++
    }

    if (avatarUrl) {
      updates.push(`avatar_url = $${paramIndex}`)
      values.push(avatarUrl)
      paramIndex++
    }

    if (username) {
      // Validate username format
      const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/
      if (!usernameRegex.test(username)) {
        return NextResponse.json({ error: 'Invalid username format' }, { status: 400 })
      }

      // Check if username is taken
      const existing = await query(
        `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2`,
        [username, user.id]
      )
      if (existing.rows && existing.rows.length > 0) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 })
      }

      updates.push(`username = $${paramIndex}`)
      values.push(username.toLowerCase())
      paramIndex++
    }

    // Optional bio — free-form, capped at 500 chars. Empty string or
    // missing means "don't touch the column" so the user can skip it
    // on signup and add it later from settings.
    if (typeof bio === 'string' && bio.trim().length > 0) {
      const trimmed = bio.trim()
      if (trimmed.length > BIO_LIMIT) {
        return NextResponse.json(
          { error: `Bio must be ${BIO_LIMIT} characters or less` },
          { status: 400 },
        )
      }
      updates.push(`bio = $${paramIndex}`)
      values.push(trimmed)
      paramIndex++
    }

    // Optional privacy toggle — when omitted we leave the DB default
    // (TRUE) in place. Coerce to a real boolean so "false" / 0 / null
    // from a misbehaving client all land on the same rail.
    if (typeof isPublic === 'boolean') {
      updates.push(`is_public = $${paramIndex}`)
      values.push(isPublic)
      paramIndex++
    }

    // Optional socials — only touch columns the caller explicitly
    // provided, and only accept strings (empty string clears the
    // column so the user can remove a link later on if they change
    // their mind).
    for (const field of SOCIAL_FIELDS) {
      const raw = body?.[field]
      if (typeof raw !== 'string') continue
      const trimmed = raw.trim()
      if (trimmed.length > SOCIAL_LIMIT) {
        return NextResponse.json(
          { error: `${field} must be ${SOCIAL_LIMIT} characters or less` },
          { status: 400 },
        )
      }
      updates.push(`${field} = $${paramIndex}`)
      values.push(trimmed || null)
      paramIndex++
    }

    values.push(user.id)

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    )

    // Bust the Redis cache so /api/auth/me serves fresh data on the
    // next render (avoids the avatar-still-not-set flash right after
    // a successful complete-profile call).
    invalidateUserMe(user.id).catch(() => {})

    return NextResponse.json({ success: true, message: 'Profile completed successfully' })
    
  } catch (error) {
    console.error('Complete profile error:', error)
    return NextResponse.json({ error: 'Failed to complete profile' }, { status: 500 })
  }
}
