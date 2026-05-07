/**
 * Team avatars — the curated pool of portraits available to staff and
 * admin accounts when they personalise their profile from the
 * dashboard.
 *
 * Why a separate pool from `lib/spa-avatars.ts`?
 *   - The customer pool is intentionally casual / lifestyle (hoodies,
 *     bucket hats, snapbacks) so customers see themselves in it.
 *   - Team accounts need to read as "the people behind Dermaspace" —
 *     clinic uniforms, blazers, gele, hijab, professional looks — so
 *     when a customer sees a staff reply or admin notice the avatar
 *     instantly conveys authority and trust.
 *
 * The Dermaspace team is currently all women, with one male IT
 * engineer. The pools below mirror that:
 *   - STAFF_AVATARS: women only — clinical / therapist looks.
 *   - ADMIN_AVATARS: women only by default, plus a single male
 *     "IT" portrait so the engineer has an avatar that looks like him.
 *
 * Adding a new avatar is a matter of dropping the JPG under
 * /public/avatars/team/<slug>.jpg and appending an entry here.
 */

export interface TeamAvatar {
  slug: string
  url: string
  label: string
  /** Soft background colour the picker grid renders behind the tile
   *  while the JPG is loading. Match the portrait's backdrop so the
   *  swap is invisible. */
  tint: string
}

export const STAFF_AVATARS: TeamAvatar[] = [
  { slug: 'staff-1', url: '/avatars/team/staff-1.jpg', label: 'Ada',     tint: '#FCE4EC' },
  { slug: 'staff-2', url: '/avatars/team/staff-2.jpg', label: 'Tomi',    tint: '#F5EFE0' },
  { slug: 'staff-3', url: '/avatars/team/staff-3.jpg', label: 'Bisi',    tint: '#E2EEDD' },
  { slug: 'staff-4', url: '/avatars/team/staff-4.jpg', label: 'Hauwa',   tint: '#F8E1D5' },
  { slug: 'staff-5', url: '/avatars/team/staff-5.jpg', label: 'Ngozi',   tint: '#E2E2F5' },
  { slug: 'staff-6', url: '/avatars/team/staff-6.jpg', label: 'Folake',  tint: '#ECE0F5' },
]

export const ADMIN_AVATARS: TeamAvatar[] = [
  { slug: 'admin-1',  url: '/avatars/team/admin-1.jpg',  label: 'Director',  tint: '#E5E5E8' },
  { slug: 'admin-2',  url: '/avatars/team/admin-2.jpg',  label: 'Executive', tint: '#F5EFE0' },
  { slug: 'admin-3',  url: '/avatars/team/admin-3.jpg',  label: 'Manager',   tint: '#EFE9E0' },
  { slug: 'admin-4',  url: '/avatars/team/admin-4.jpg',  label: 'Lead',      tint: '#F5E1E5' },
  // The single male portrait — reserved for the engineer on the team.
  // Lives in the admin pool only; staff stays women-only.
  { slug: 'admin-it', url: '/avatars/team/admin-it.jpg', label: 'IT',        tint: '#D8DEEA' },
]

/** Returns the right pool for a given role, or null for customer
 *  accounts (which use the spa-avatars pool instead). */
export function teamAvatarPoolFor(role?: string | null): TeamAvatar[] | null {
  if (role === 'admin') return ADMIN_AVATARS
  if (role === 'staff') return STAFF_AVATARS
  return null
}

/** True when a URL points to one of our curated team portraits. */
export function isTeamAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('/avatars/team/')
}
