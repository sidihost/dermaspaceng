import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { cached, KEYS } from '@/lib/redis'
import { isPlaceholderEmail, shouldRequireProfileCompletion } from '@/lib/auth-onboarding'
import {
  parsePgStringArray,
  type AuthPreferencesData,
  type AuthUserData,
  type InitialAuthState,
} from '@/lib/auth-bootstrap-helpers'

interface ServerCachedUserRow {
  user_id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  avatar_url: string | null
  username: string | null
  role: 'user' | 'staff' | 'admin' | null
  is_active: boolean | null
  is_super_admin: boolean | null
  staff_policy_accepted_version: string | null
  staff_policy_accepted_at: string | null
  must_change_password: boolean | null
  email_verified: boolean | null
  date_of_birth: string | null
  is_public: boolean | null
  gender: string | null
  cover_style: string | null
  legal_accepted_version: string | null
  legal_accepted_at: string | null
  p_skin_type: string | null
  p_concerns: unknown
  p_preferred_services: unknown
  p_preferred_location: string | null
  p_notifications: boolean | null
  membership_tier: string | null
  membership_status: string | null
  membership_started_at: string | null
  membership_expires_at: string | null
  membership_funded_amount: string | number | null
  membership_balance: string | number | null
  glow_points: string | number | null
  profile_complete: boolean | null
  x_username: string | null
  has_social_auth: boolean | null
}

/**
 * Resolves the signed-in user once on the server in `RootLayout` so the very
 * first HTML byte and first React hydration pass ALREADY know whether the user
 * is logged in — eliminating the 1–3s "Sign In / skeleton" flash and eliminating
 * redundant `/api/auth/me` calls on every page load.
 *
 * - Guests (no `session_id` cookie): 0ms, zero DB queries.
 * - Logged-in users: 1 lightweight PK session check + Redis-cached user row.
 * - Any transient DB error fails gracefully (`resolved: false`) so SSR never
 *   crashes and the client falls back to `/api/auth/me`.
 */
export async function getServerInitialAuth(): Promise<InitialAuthState> {
  let sessionId: string | undefined
  try {
    const cookieStore = await cookies()
    sessionId = cookieStore.get('session_id')?.value
  } catch {
    return {
      user: null,
      preferences: null,
      hasSessionCookie: false,
      resolved: false,
    }
  }

  if (!sessionId) {
    return {
      user: null,
      preferences: null,
      hasSessionCookie: false,
      resolved: true,
    }
  }

  try {
    const sessionRows = await sql`
      SELECT user_id
      FROM sessions
      WHERE id = ${sessionId} AND expires_at > NOW()
      LIMIT 1
    `
    if (sessionRows.length === 0) {
      return {
        user: null,
        preferences: null,
        hasSessionCookie: false,
        resolved: true,
      }
    }

    const userId = sessionRows[0].user_id as string

    const row = await cached<ServerCachedUserRow | null>(
      `${KEYS.userMe}:${userId}`,
      60,
      async () => {
        const rows = await sql`
          SELECT
            u.id          AS user_id,
            u.email,
            u.first_name,
            u.last_name,
            u.phone,
            u.avatar_url,
            u.username,
            u.role,
            COALESCE(u.is_active, TRUE) AS is_active,
            COALESCE(u.is_super_admin, FALSE) AS is_super_admin,
            u.staff_policy_accepted_version,
            u.staff_policy_accepted_at,
            COALESCE(u.must_change_password, FALSE) AS must_change_password,
            COALESCE(u.email_verified, FALSE)       AS email_verified,
            TO_CHAR(u.date_of_birth, 'YYYY-MM-DD') AS date_of_birth,
            u.bio,
            u.website,
            u.instagram,
            u.twitter,
            u.tiktok,
            u.facebook,
            u.linkedin,
            u.youtube,
            u.is_public,
            u.gender,
            u.cover_style,
            u.legal_accepted_version,
            u.legal_accepted_at,
            p.skin_type            AS p_skin_type,
            p.concerns             AS p_concerns,
            p.preferred_services   AS p_preferred_services,
            p.preferred_location   AS p_preferred_location,
            p.notifications        AS p_notifications,
            p.welcome_dismissed    AS p_welcome_dismissed,
            p.avatar_intro_dismissed AS p_avatar_intro_dismissed,
            u.membership_tier,
            u.membership_status,
            u.membership_started_at,
            u.membership_expires_at,
            COALESCE(u.membership_funded_amount, 0) AS membership_funded_amount,
            COALESCE(u.membership_balance, 0)        AS membership_balance,
            COALESCE(u.glow_points, 0)               AS glow_points,
            COALESCE(u.profile_complete, FALSE)      AS profile_complete,
            u.x_username,
            (u.google_id IS NOT NULL OR u.microsoft_id IS NOT NULL OR u.x_id IS NOT NULL) AS has_social_auth
          FROM users u
          LEFT JOIN user_preferences p ON p.user_id = u.id
          WHERE u.id = ${userId}
          LIMIT 1
        `
        return (rows[0] as ServerCachedUserRow | undefined) ?? null
      },
    )

    if (!row || row.is_active === false) {
      return {
        user: null,
        preferences: null,
        hasSessionCookie: false,
        resolved: true,
      }
    }

    const user: AuthUserData = {
      id: row.user_id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      role: row.role || 'user',
      isSuperAdmin: row.is_super_admin === true,
      username: row.username,
      dateOfBirth: row.date_of_birth || null,
      isPublic: row.is_public === false ? false : true,
      gender: row.gender === 'male' || row.gender === 'female' ? row.gender : null,
      coverStyle:
        typeof row.cover_style === 'string' && row.cover_style !== ''
          ? row.cover_style
          : null,
      legalAcceptedVersion:
        typeof row.legal_accepted_version === 'string' &&
        row.legal_accepted_version !== ''
          ? row.legal_accepted_version
          : null,
      legalAcceptedAt: row.legal_accepted_at
        ? new Date(row.legal_accepted_at).toISOString()
        : null,
      staffPolicyAcceptedVersion:
        typeof row.staff_policy_accepted_version === 'string' &&
        row.staff_policy_accepted_version !== ''
          ? row.staff_policy_accepted_version
          : null,
      staffPolicyAcceptedAt: row.staff_policy_accepted_at
        ? new Date(row.staff_policy_accepted_at).toISOString()
        : null,
      mustChangePassword: row.must_change_password === true,
      emailVerified: row.email_verified === true,
      emailIsPlaceholder: isPlaceholderEmail(row.email),
      profileComplete: row.profile_complete === true,
      xUsername: row.x_username ?? null,
      hasSocialAuth: row.has_social_auth === true,
      needsProfileCompletion: shouldRequireProfileCompletion({
        role: row.role || 'user',
        profileComplete: row.profile_complete === true,
        hasSocialAuth: row.has_social_auth === true,
        email: row.email,
      }),
      membership: {
        tier: row.membership_tier ?? null,
        status: row.membership_status ?? null,
        startedAt: row.membership_started_at
          ? new Date(row.membership_started_at).toISOString()
          : null,
        expiresAt: row.membership_expires_at
          ? new Date(row.membership_expires_at).toISOString()
          : null,
        fundedAmount: Number(row.membership_funded_amount ?? 0) || 0,
        balance: Number(row.membership_balance ?? 0) || 0,
        glowPoints: Number(row.glow_points ?? 0) || 0,
      },
    }

    const hasPrefs =
      row.p_skin_type !== null ||
      row.p_concerns !== null ||
      row.p_preferred_services !== null ||
      row.p_preferred_location !== null ||
      row.p_notifications !== null

    const preferences: AuthPreferencesData | null = hasPrefs
      ? {
          skinType: row.p_skin_type || '',
          concerns: parsePgStringArray(row.p_concerns),
          preferredServices: parsePgStringArray(row.p_preferred_services),
          preferredLocation: row.p_preferred_location || '',
          notifications: row.p_notifications ?? true,
        }
      : null

    return {
      user,
      preferences,
      hasSessionCookie: true,
      resolved: true,
    }
  } catch (err) {
    console.error('[server-auth-bootstrap] Failed to resolve initial session:', err)
    return {
      user: null,
      preferences: null,
      hasSessionCookie: true,
      resolved: false,
    }
  }
}
