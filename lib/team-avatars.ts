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
 * Gender split
 * ------------
 * Different members of the Dermaspace team have different identities,
 * and seeing a mixed-gender grid feels off when you're picking *your*
 * portrait. The pools below are split by gender, with one deliberate
 * exception:
 *
 *   - STAFF_AVATARS         — women only (the clinical team is all women).
 *   - ADMIN_AVATARS_FEMALE  — primarily women (Itunu, Franca, etc).
 *                             Slot #2 is intentionally a young male
 *                             portrait so female admins who want a
 *                             youthful male teammate option in the
 *                             picker can choose it; the rest of the
 *                             pool stays women-presenting.
 *   - ADMIN_AVATARS_MALE    — men only (super admin / Sidihost).
 *
 * `teamAvatarPoolFor(role, gender)` resolves the right pool based on
 * BOTH the role and the gender. For admins we pass `'male'` for the
 * super admin and `'female'` for everyone else (see
 * `components/admin/sidebar.tsx`). For staff we always pass `'female'`
 * because the staff pool is women-only by design.
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

/** Gender of the team member picking — drives which admin pool is
 *  rendered. Staff is always female. */
export type TeamAvatarGender = 'male' | 'female'

export const STAFF_AVATARS: TeamAvatar[] = [
  { slug: 'staff-1', url: '/avatars/team/staff-1.jpg', label: 'Ada',     tint: '#FCE4EC' },
  { slug: 'staff-2', url: '/avatars/team/staff-2.jpg', label: 'Tomi',    tint: '#F5EFE0' },
  { slug: 'staff-3', url: '/avatars/team/staff-3.jpg', label: 'Bisi',    tint: '#E2EEDD' },
  { slug: 'staff-4', url: '/avatars/team/staff-4.jpg', label: 'Hauwa',   tint: '#F8E1D5' },
  { slug: 'staff-5', url: '/avatars/team/staff-5.jpg', label: 'Ngozi',   tint: '#E2E2F5' },
  { slug: 'staff-6', url: '/avatars/team/staff-6.jpg', label: 'Folake',  tint: '#ECE0F5' },
]

/** Female admin portraits — used by Itunu, Franca, and any future
 *  female admin accounts. The original four women remain unchanged. */
export const ADMIN_AVATARS_FEMALE: TeamAvatar[] = [
  { slug: 'admin-1',  url: '/avatars/team/admin-1.jpg',  label: 'Director',  tint: '#FCE4EC' },
  // Slot #2 is the male youth portrait (see header comment) — kept in
  // this pool by request so it surfaces alongside the female admin
  // options rather than being buried in the super-admin male pool.
  { slug: 'admin-2',  url: '/avatars/team/admin-2.jpg',  label: 'Associate', tint: '#E2EEDD' },
  { slug: 'admin-3',  url: '/avatars/team/admin-3.jpg',  label: 'Manager',   tint: '#EFE9E0' },
  { slug: 'admin-4',  url: '/avatars/team/admin-4.jpg',  label: 'Lead',      tint: '#F5E1E5' },
]

/** Male admin portraits — used by the super admin (Sidihost / dev).
 *  Includes a legacy "IT" portrait so existing avatar URLs that point
 *  at `/avatars/team/admin-it.jpg` keep resolving cleanly. */
export const ADMIN_AVATARS_MALE: TeamAvatar[] = [
  { slug: 'admin-m1', url: '/avatars/team/admin-m1.jpg', label: 'Director',  tint: '#DDE3EE' },
  { slug: 'admin-m2', url: '/avatars/team/admin-m2.jpg', label: 'Executive', tint: '#E8E0D4' },
  { slug: 'admin-m3', url: '/avatars/team/admin-m3.jpg', label: 'Manager',   tint: '#EFE5DA' },
  { slug: 'admin-m4', url: '/avatars/team/admin-m4.jpg', label: 'Chairman',  tint: '#E2DAE8' },
  // Legacy entry — kept so previously-saved `admin-it.jpg` URLs still
  // render in the picker as "selected" instead of looking unset.
  { slug: 'admin-it', url: '/avatars/team/admin-it.jpg', label: 'IT',        tint: '#D8DEEA' },
]

/**
 * Returns the right pool for a given role + gender combination, or
 * null for customer accounts (which use the spa-avatars pool instead).
 *
 *   - role === 'admin'  + gender === 'male'   → ADMIN_AVATARS_MALE
 *   - role === 'admin'  + gender === 'female' → ADMIN_AVATARS_FEMALE
 *   - role === 'admin'  + no gender           → ADMIN_AVATARS_FEMALE
 *                                                (safe default — the
 *                                                 majority of admins
 *                                                 are female)
 *   - role === 'staff'                         → STAFF_AVATARS
 *                                                (women-only by design)
 */
export function teamAvatarPoolFor(
  role?: string | null,
  gender?: TeamAvatarGender | null,
): TeamAvatar[] | null {
  if (role === 'admin') {
    return gender === 'male' ? ADMIN_AVATARS_MALE : ADMIN_AVATARS_FEMALE
  }
  if (role === 'staff') return STAFF_AVATARS
  return null
}

/** True when a URL points to one of our curated team portraits. */
export function isTeamAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  return url.startsWith('/avatars/team/')
}
