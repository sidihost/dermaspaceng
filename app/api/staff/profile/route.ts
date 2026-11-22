import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import {
  ensureStaffProfile,
  FRONT_DESK_AVATAR_POOL,
  getStaffProfile,
  pickDefaultAvatarSlug,
  resolveStaffAvatarUrl,
} from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET / PATCH the caller's own staff profile (avatar slug + display name).
// Used by the staff settings sheet so a representative can swap her avatar
// before going live.
// ---------------------------------------------------------------------------

export async function GET() {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  await ensureStaffProfile(user.id, `${user.first_name} ${user.last_name}`.trim())
  const profile = await getStaffProfile(user.id)
  if (!profile) {
    const defaultSlug = pickDefaultAvatarSlug(user.id)
    return NextResponse.json({
      profile: {
        avatarSlug: defaultSlug,
        displayName: user.first_name,
        userAvatarUrl: user.avatar_url ?? null,
        avatarUrl: resolveStaffAvatarUrl({
          avatarUrl: user.avatar_url,
          avatarSlug: defaultSlug,
          staffId: user.id,
        }),
      },
    })
  }
  return NextResponse.json({
    profile: {
      avatarSlug: profile.avatar_slug,
      displayName: profile.display_name,
      userAvatarUrl: user.avatar_url ?? null,
      avatarUrl: resolveStaffAvatarUrl({
        avatarUrl: user.avatar_url,
        avatarSlug: profile.avatar_slug,
        staffId: user.id,
      }),
      status: profile.status,
    },
  })
}

export async function PATCH(req: Request) {
  let user
  try {
    user = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: { avatarSlug?: string; displayName?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const slug =
    body.avatarSlug && (FRONT_DESK_AVATAR_POOL as readonly string[]).includes(body.avatarSlug)
      ? body.avatarSlug
      : null
  const displayName =
    typeof body.displayName === 'string' && body.displayName.trim()
      ? body.displayName.trim().slice(0, 60)
      : null

  await ensureStaffProfile(user.id, `${user.first_name} ${user.last_name}`.trim())
  if (slug && displayName !== null) {
    await sql`
      UPDATE staff_profiles
         SET avatar_slug = ${slug},
             display_name = ${displayName},
             updated_at = NOW()
       WHERE user_id = ${user.id}
    `
  } else if (slug) {
    await sql`
      UPDATE staff_profiles
         SET avatar_slug = ${slug}, updated_at = NOW()
       WHERE user_id = ${user.id}
    `
  } else if (displayName !== null) {
    await sql`
      UPDATE staff_profiles
         SET display_name = ${displayName}, updated_at = NOW()
       WHERE user_id = ${user.id}
    `
  }

  return NextResponse.json({ success: true })
}
