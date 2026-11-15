/**
 * Default avatars for the admin and staff dashboards.
 *
 * These are the fallback portraits we render whenever an admin or
 * staff member hasn't uploaded a photo of their own. Customers can
 * pick from the spa avatar set in `lib/spa-avatars.ts`, but admins
 * needed something more institution-appropriate — branded, neutral,
 * and instantly readable as "this account is on the team".
 *
 * Resolved from /public so they're cacheable as static assets and
 * never require a database round-trip.
 */
export const ADMIN_DEFAULT_AVATAR = '/avatars/admin-default.jpg'
export const ADMIN_MALE_DEFAULT_AVATAR = '/avatars/admin-male-default.jpg'
export const ADMIN_FEMALE_DEFAULT_AVATAR = '/avatars/admin-female-default.jpg'
// The Dermaspace clinical team is all-female, so the default staff
// portrait must reflect that. We point at the curated `staff-1.jpg`
// from the team avatars pool (lib/team-avatars.ts) which is rendered
// in the same 3D Pixar style as the admin default.
export const STAFF_DEFAULT_AVATAR = '/avatars/team/staff-1.jpg'

/**
 * Curated female portrait pool for the staff dashboard and therapist
 * roster (matches `STAFF_AVATARS` in `lib/team-avatars.ts`).
 */
export const STAFF_FEMALE_AVATAR_POOL = [
  '/avatars/team/staff-1.jpg',
  '/avatars/team/staff-2.jpg',
  '/avatars/team/staff-3.jpg',
  '/avatars/team/staff-4.jpg',
  '/avatars/team/staff-5.jpg',
  '/avatars/team/staff-6.jpg',
] as const

/**
 * True when an avatar URL points to a known male portrait in /public/avatars
 * (e.g. `admin-default.jpg`, `admin-male-default.jpg`, `admin-m1.jpg`..`admin-m4.jpg`,
 * `admin-it.jpg`, or customer male avatars `m1.jpg`..`m11.jpg`). Used to guarantee
 * the staff dashboard never displays a male portrait even if an admin with a
 * male profile opens /staff or appears on the therapist roster.
 */
export function isMaleAvatarUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false
  const cleaned = url.trim().toLowerCase().split('?')[0]
  if (!cleaned) return false
  if (
    cleaned === '/avatars/admin-default.jpg' ||
    cleaned === '/avatars/admin-male-default.jpg'
  ) {
    return true
  }
  if (/^\/avatars\/team\/admin-(m\d+|it)\.(jpg|jpeg|png|webp)$/i.test(cleaned)) {
    return true
  }
  if (/^\/avatars\/m\d+\.(jpg|jpeg|png|webp)$/i.test(cleaned)) {
    return true
  }
  return false
}

/**
 * Always resolves to a female portrait URL for the staff dashboard and
 * front-desk therapist roster. Preserves uploaded / female team portraits
 * and replaces null, blank, or known-male URLs with a female team avatar.
 */
export function resolveStaffAvatar(
  uploaded?: string | null,
  fallbackIndex = 0,
): string {
  const trimmed = typeof uploaded === 'string' ? uploaded.trim() : ''
  if (trimmed && !isMaleAvatarUrl(trimmed)) {
    return trimmed
  }
  const idx = Math.abs(Math.trunc(fallbackIndex)) % STAFF_FEMALE_AVATAR_POOL.length
  return STAFF_FEMALE_AVATAR_POOL[idx]
}

/**
 * Returns the right default avatar for a given role and optional gender.
 * Female admins resolve to the Nigerian female admin portrait; male admins
 * resolve to the Nigerian male admin portrait; staff always resolves to the
 * Nigerian female staff portrait. Falls back to null for customers (initials).
 */
export function defaultAvatarForRole(
  role?: string | null,
  gender?: string | null,
): string | null {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : ''
  const normalizedGender =
    typeof gender === 'string' ? gender.trim().toLowerCase() : ''
  if (normalizedRole === 'admin') {
    if (normalizedGender === 'female') return ADMIN_FEMALE_DEFAULT_AVATAR
    if (normalizedGender === 'male') return ADMIN_MALE_DEFAULT_AVATAR
    return ADMIN_DEFAULT_AVATAR
  }
  if (normalizedRole === 'staff') return STAFF_DEFAULT_AVATAR
  return null
}

/**
 * Picks the best avatar URL to render: the user's own upload first,
 * then the role-specific (and gender-aware) default, then null (meaning "use initials").
 */
export function resolveAdminAvatar(
  uploaded: string | null | undefined,
  role: string | null | undefined,
  gender?: string | null,
): string | null {
  if (uploaded && uploaded.trim().length > 0) return uploaded.trim()
  return defaultAvatarForRole(role, gender)
}
