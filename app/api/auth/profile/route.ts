import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { sql, query } from '@/lib/db'
import { isCoverSlug } from '@/lib/profile-covers'

// Social fields the user can set from dashboard settings. We store the
// RAW input (handle OR url) and normalise at render time in the public
// profile API — this means a user can paste a full URL or just a handle
// and both work end-to-end.
const SOCIAL_FIELDS = [
  'website',
  'instagram',
  'twitter',
  'tiktok',
  'facebook',
  'linkedin',
  'youtube',
] as const
type SocialField = (typeof SOCIAL_FIELDS)[number]

// Max lengths so a malicious or misbehaving client can't stuff huge
// strings into our table. Bio gets a proper paragraph budget; social
// fields only need to fit a handle or short URL.
const LIMITS: Record<'bio' | SocialField, number> = {
  bio: 500,
  website: 200,
  instagram: 100,
  twitter: 100,
  tiktok: 100,
  facebook: 200,
  linkedin: 200,
  youtube: 200,
}

// Helper: take a raw body value and return either `null` (clear the
// column) or a trimmed string capped at `max` characters. Anything
// longer is rejected at the caller with a 400 so the user gets a clear
// error instead of silent truncation.
function cleanOrNull(raw: unknown, max: number): { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined) return { ok: true, value: null }
  if (raw === null) return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false }
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: true, value: null }
  if (trimmed.length > max) return { ok: false }
  return { ok: true, value: trimmed }
}

// PUT /api/auth/profile - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, phone, avatarUrl, dateOfBirth, bio, isPublic, gender, coverStyle } = body

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 })
    }

    // Validate name length
    if (firstName.length > 50 || lastName.length > 50) {
      return NextResponse.json({ error: 'Name must be less than 50 characters' }, { status: 400 })
    }

    // Validate phone if provided
    if (phone && phone.length > 20) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Validate bio. It's free-form prose so we only cap the length.
    let normalisedBio: string | null = null
    let bioTouched = false
    if (bio !== undefined) {
      const result = cleanOrNull(bio, LIMITS.bio)
      if (!result.ok) {
        return NextResponse.json(
          { error: `Bio must be ${LIMITS.bio} characters or less` },
          { status: 400 },
        )
      }
      normalisedBio = result.value
      bioTouched = true
    }

    // Validate socials — only touch columns the client actually sent.
    // Collect them into an object keyed by column name so we can build
    // the dynamic UPDATE below without pulling in an ORM or writing a
    // per-field SQL branch.
    const socialUpdates: Partial<Record<SocialField, string | null>> = {}
    for (const key of SOCIAL_FIELDS) {
      const raw = (body as Record<string, unknown>)[key]
      if (raw === undefined) continue
      const result = cleanOrNull(raw, LIMITS[key])
      if (!result.ok) {
        return NextResponse.json(
          { error: `${key} must be ${LIMITS[key]} characters or less` },
          { status: 400 },
        )
      }
      socialUpdates[key] = result.value
    }

    // Validate DOB if supplied. Accept empty string / null to mean "clear it".
    let normalizedDob: string | null = null
    let clearDob = false
    if (dateOfBirth === '' || dateOfBirth === null) {
      clearDob = true
    } else if (typeof dateOfBirth === 'string' && dateOfBirth.trim() !== '') {
      const d = new Date(dateOfBirth)
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 })
      }
      const now = new Date()
      if (d > now) {
        return NextResponse.json({ error: 'Date of birth cannot be in the future' }, { status: 400 })
      }
      const thirteenYearsAgo = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate())
      if (d > thirteenYearsAgo) {
        return NextResponse.json({ error: 'You must be at least 13 years old' }, { status: 400 })
      }
      normalizedDob = dateOfBirth
    }

    // Always update the always-present profile fields first. Optional
    // groups (DOB, bio, each social) are handled in their own queries
    // below so we only touch columns the caller actually sent — this
    // keeps the endpoint safe to call with a partial payload.
    await sql`
      UPDATE users
      SET
        first_name = ${firstName.trim()},
        last_name = ${lastName.trim()},
        phone = ${phone?.trim() || null},
        avatar_url = ${avatarUrl || null},
        updated_at = NOW()
      WHERE id = ${user.id}
    `

    if (clearDob || normalizedDob !== null) {
      await sql`
        UPDATE users SET date_of_birth = ${normalizedDob}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    if (bioTouched) {
      await sql`
        UPDATE users SET bio = ${normalisedBio}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    // Gender — we only write the column when the client sends a
    // valid value. Sending `undefined` (no key) is a no-op so legacy
    // clients that don't know about this field don't accidentally
    // clear it. 'male' / 'female' are the only accepted values; the
    // DB-level CHECK constraint in scripts/100-add-user-gender.sql
    // guards anything else.
    if (gender === 'male' || gender === 'female') {
      await sql`
        UPDATE users SET gender = ${gender}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    // Cover style — only touch the column when the client sends a
    // value, and only if it's one of the registered preset slugs (or
    // explicit null to clear back to the deterministic fallback).
    // Rejecting unknown slugs server-side means we can trust the
    // column when we read it back without an extra validation pass.
    if (coverStyle === null) {
      await sql`
        UPDATE users SET cover_style = NULL, updated_at = NOW()
        WHERE id = ${user.id}
      `
    } else if (typeof coverStyle === 'string') {
      if (!isCoverSlug(coverStyle)) {
        return NextResponse.json({ error: 'Invalid cover style' }, { status: 400 })
      }
      await sql`
        UPDATE users SET cover_style = ${coverStyle}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    // Privacy toggle — when the client sends a boolean we write it
    // verbatim. Anything else (undefined, null, "false" strings from
    // misconfigured clients) is treated as "don't touch" so we never
    // accidentally flip someone's profile to public/private without
    // a clear, intentional UI action.
    if (typeof isPublic === 'boolean') {
      await sql`
        UPDATE users SET is_public = ${isPublic}, updated_at = NOW()
        WHERE id = ${user.id}
      `
    }

    // Per-social updates. We whitelist the column name against
    // SOCIAL_FIELDS before interpolating it, so the dynamic column
    // name can't be used for SQL injection — values flow through
    // parameterised bindings on $1/$2 as normal.
    for (const [col, value] of Object.entries(socialUpdates)) {
      if (!(SOCIAL_FIELDS as readonly string[]).includes(col)) continue
      await query(
        `UPDATE users SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
        [value, user.id],
      )
    }

    // Fetch updated user
    const users = await sql`
      SELECT id, email, first_name, last_name, phone, avatar_url, email_verified, role, created_at,
             TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
             bio, website, instagram, twitter, tiktok, facebook, linkedin, youtube, is_public,
             gender, cover_style
      FROM users WHERE id = ${user.id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updatedUser = users[0]

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phone: updatedUser.phone,
        avatarUrl: updatedUser.avatar_url,
        emailVerified: updatedUser.email_verified,
        role: updatedUser.role,
        createdAt: updatedUser.created_at,
        dateOfBirth: updatedUser.date_of_birth || null,
        bio: updatedUser.bio || null,
        website: updatedUser.website || null,
        instagram: updatedUser.instagram || null,
        twitter: updatedUser.twitter || null,
        tiktok: updatedUser.tiktok || null,
        facebook: updatedUser.facebook || null,
        linkedin: updatedUser.linkedin || null,
        youtube: updatedUser.youtube || null,
        // Coerce to a real boolean — Postgres returns `true`/`false`
        // but some driver wrappers hand it back as a string. We
        // default to `true` for legacy rows that somehow slipped
        // through the migration's default.
        isPublic: updatedUser.is_public === false ? false : true,
        gender: (updatedUser.gender === 'male' || updatedUser.gender === 'female') ? updatedUser.gender : null,
        // Preset slug (e.g. 'aurora'). Null means "no explicit pick";
        // clients should fall back to coverForUser(id) in that case.
        coverStyle: isCoverSlug(updatedUser.cover_style) ? updatedUser.cover_style : null,
      },
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

// GET /api/auth/profile - Get user profile
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const users = await sql`
      SELECT id, email, first_name, last_name, phone, avatar_url, email_verified, role, created_at,
             TO_CHAR(date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
             bio, website, instagram, twitter, tiktok, facebook, linkedin, youtube, is_public,
             cover_style
      FROM users WHERE id = ${user.id}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const profile = users[0]

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        phone: profile.phone,
        avatarUrl: profile.avatar_url,
        emailVerified: profile.email_verified,
        role: profile.role,
        createdAt: profile.created_at,
        dateOfBirth: profile.date_of_birth || null,
        bio: profile.bio || null,
        website: profile.website || null,
        instagram: profile.instagram || null,
        twitter: profile.twitter || null,
        tiktok: profile.tiktok || null,
        facebook: profile.facebook || null,
        linkedin: profile.linkedin || null,
        youtube: profile.youtube || null,
        isPublic: profile.is_public === false ? false : true,
        coverStyle: isCoverSlug(profile.cover_style) ? profile.cover_style : null,
      },
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}
