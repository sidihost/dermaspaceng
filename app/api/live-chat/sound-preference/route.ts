import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { ensureStaffProfile } from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET / PATCH /api/live-chat/sound-preference
// ---------------------------------------------------------------------------
// Persists live-chat chime mute/unmute preferences server-side (zero
// localStorage):
//   - Signed-in staff/admins (scope=staff): `staff_profiles.live_chat_sound_enabled`
//   - Signed-in customers (scope=customer): `user_preferences.live_chat_sound_enabled`
//   - Guest visitors: httpOnly cookie `dermaspace_lc_sound_<scope>`
// ---------------------------------------------------------------------------

type SoundScope = 'customer' | 'staff'

function parseScope(raw: unknown): SoundScope {
  return raw === 'staff' ? 'staff' : 'customer'
}

function cookieNameFor(scope: SoundScope): string {
  return scope === 'staff'
    ? 'dermaspace_lc_sound_staff'
    : 'dermaspace_lc_sound_customer'
}

let ensureSoundColumnsPromise: Promise<void> | null = null

function ensureSoundPreferenceColumns(): Promise<void> {
  if (!ensureSoundColumnsPromise) {
    ensureSoundColumnsPromise = (async () => {
      await sql`
        ALTER TABLE user_preferences
        ADD COLUMN IF NOT EXISTS live_chat_sound_enabled BOOLEAN NOT NULL DEFAULT TRUE
      `.catch(() => {})
      await sql`
        ALTER TABLE staff_profiles
        ADD COLUMN IF NOT EXISTS live_chat_sound_enabled BOOLEAN NOT NULL DEFAULT TRUE
      `.catch(() => {})
    })().catch((err) => {
      ensureSoundColumnsPromise = null
      console.error('[live-chat] ensure sound preference columns failed:', err)
    })
  }
  return ensureSoundColumnsPromise
}

function setSoundCookie(res: NextResponse, scope: SoundScope, enabled: boolean) {
  res.cookies.set({
    name: cookieNameFor(scope),
    value: enabled ? '1' : '0',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const scope = parseScope(url.searchParams.get('scope'))
  const user = await getCurrentUser()

  if (user) {
    try {
      await ensureSoundPreferenceColumns()
      if (scope === 'staff' && (user.role === 'staff' || user.role === 'admin')) {
        await ensureStaffProfile(
          user.id,
          `${user.first_name} ${user.last_name}`.trim() || 'Customer Care',
        )
        const rows = (await sql`
          SELECT live_chat_sound_enabled
            FROM staff_profiles
           WHERE user_id = ${user.id}
           LIMIT 1
        `) as Array<{ live_chat_sound_enabled?: boolean | null }>
        const enabled = rows[0]?.live_chat_sound_enabled ?? true
        return NextResponse.json({ enabled: Boolean(enabled), scope, source: 'database' })
      }

      const rows = (await sql`
        SELECT live_chat_sound_enabled
          FROM user_preferences
         WHERE user_id = ${user.id}
         LIMIT 1
      `) as Array<{ live_chat_sound_enabled?: boolean | null }>
      if (rows.length > 0 && typeof rows[0]?.live_chat_sound_enabled === 'boolean') {
        return NextResponse.json({
          enabled: rows[0].live_chat_sound_enabled,
          scope,
          source: 'database',
        })
      }
    } catch (err) {
      console.error('[live-chat/sound-preference] GET db fallback:', err)
    }
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get(cookieNameFor(scope))?.value
  const enabled = raw === '0' || raw === 'false' ? false : true
  return NextResponse.json({ enabled, scope, source: 'cookie' })
}

export async function PATCH(req: Request) {
  let body: { scope?: unknown; enabled?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const scope = parseScope(body.scope)
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
  }
  const enabled = body.enabled
  const user = await getCurrentUser()
  let source: 'database' | 'cookie' = 'cookie'

  if (user) {
    try {
      await ensureSoundPreferenceColumns()
      if (scope === 'staff' && (user.role === 'staff' || user.role === 'admin')) {
        await ensureStaffProfile(
          user.id,
          `${user.first_name} ${user.last_name}`.trim() || 'Customer Care',
        )
        await sql`
          UPDATE staff_profiles
             SET live_chat_sound_enabled = ${enabled},
                 updated_at = NOW()
           WHERE user_id = ${user.id}
        `
        source = 'database'
      } else {
        const prefId = randomUUID()
        await sql`
          INSERT INTO user_preferences (id, user_id, notifications, live_chat_sound_enabled)
          VALUES (${prefId}, ${user.id}, true, ${enabled})
          ON CONFLICT (user_id) DO UPDATE
             SET live_chat_sound_enabled = EXCLUDED.live_chat_sound_enabled,
                 updated_at = NOW()
        `
        source = 'database'
      }
    } catch (err) {
      console.error('[live-chat/sound-preference] PATCH db fallback:', err)
    }
  }

  const res = NextResponse.json({ success: true, enabled, scope, source })
  setSoundCookie(res, scope, enabled)
  return res
}
