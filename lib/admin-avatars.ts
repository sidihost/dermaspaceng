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
// The Dermaspace clinical team is all-female, so the default staff
// portrait must reflect that. We point at the curated `staff-1.jpg`
// from the team avatars pool (lib/team-avatars.ts) which is rendered
// in the same 3D Pixar style as the admin default. The legacy
// `/avatars/staff-default.jpg` was a male portrait — pointing the
// constant at the female team tile fixes the wrong-gender default
// without touching the picker UI.
export const STAFF_DEFAULT_AVATAR = '/avatars/team/staff-1.jpg'

/**
 * Returns the right default avatar for a given role. Falls back to
 * the customer-facing flow (initials in a brand pill) if the role
 * isn't recognised — that's handled at the call site, this helper
 * just resolves the URL.
 */
export function defaultAvatarForRole(role?: string | null): string | null {
  if (role === 'admin') return ADMIN_DEFAULT_AVATAR
  if (role === 'staff') return STAFF_DEFAULT_AVATAR
  return null
}

/**
 * Picks the best avatar URL to render: the user's own upload first,
 * then the role-specific default, then null (meaning "use initials").
 */
export function resolveAdminAvatar(
  uploaded: string | null | undefined,
  role: string | null | undefined,
): string | null {
  if (uploaded && uploaded.trim().length > 0) return uploaded
  return defaultAvatarForRole(role)
}
