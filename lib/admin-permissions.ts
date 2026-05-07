/**
 * Admin permission map.
 *
 * The admin surface has three real personas:
 *
 *   1. The super admin (Sidihost / developer dashboard) — flagged on the
 *      `users` row via `is_super_admin = true`. Sees every admin surface,
 *      including the platform-level controls (QStash schedules, feature
 *      flags, system / environment status).
 *
 *   2. Franca Ebuzome — licensed esthetician, COO. In addition to the
 *      regular admin surface she also sees the Consultations queue
 *      because she's the qualified owner of that workflow.
 *
 *   3. Itunuoluwa Umar-Lawal — CEO. Standard admin surface; consultation
 *      tooling is hidden because the workflow lives with Franca.
 *
 * Identifying Franca and Itunu by email keeps the data model simple
 * (no extra `consultation_owner` flag to maintain) and matches how
 * scripts/100-setup-admin-team.sql provisions the rows. If either
 * person changes email address, update the constants below — there is
 * a single source of truth here on purpose.
 */

const FRANCA_EMAIL = 'franca@dermaspaceng.com'
const ITUNU_EMAIL = 'itunu@dermaspaceng.com'

export type AdminPermissions = {
  /** Sidihost developer / Sidihost super admin. Sees everything. */
  isSuperAdmin: boolean
  /** Franca Ebuzome (licensed esthetician) — owns consultations. */
  isFranca: boolean
  /** Itunuoluwa Umar-Lawal — CEO. */
  isItunu: boolean

  // Per-surface gates. All super-admin checks default to TRUE for the
  // super admin so we never accidentally lock the developer out of a
  // brand-new control panel; the explicit per-persona overrides handle
  // the "show consultations to Franca too" case.
  canSeeConsultations: boolean
  canSeeQstash: boolean
  canSeeFeatureFlags: boolean
  canSeeSystemSettings: boolean
}

export type AdminLike = {
  email?: string | null
  is_super_admin?: boolean | null
  role?: string | null
}

/**
 * Resolve the per-surface permissions for a logged-in admin. Pure
 * function — no I/O, no DB — so it's safe to call from server
 * components, API routes, or shipped to the client via a hydrated user
 * object.
 */
export function getAdminPermissions(user: AdminLike | null | undefined): AdminPermissions {
  const email = (user?.email || '').toLowerCase()
  const isSuperAdmin = !!user?.is_super_admin && user?.role === 'admin'
  const isFranca = email === FRANCA_EMAIL
  const isItunu = email === ITUNU_EMAIL

  return {
    isSuperAdmin,
    isFranca,
    isItunu,
    canSeeConsultations: isSuperAdmin || isFranca,
    canSeeQstash: isSuperAdmin,
    canSeeFeatureFlags: isSuperAdmin,
    canSeeSystemSettings: isSuperAdmin,
  }
}
