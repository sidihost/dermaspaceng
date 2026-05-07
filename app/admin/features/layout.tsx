import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAdminPermissions } from '@/lib/admin-permissions'

/**
 * Feature flag console — developer / Sidihost super-admin only.
 *
 * Flipping a feature flag changes the public site behaviour for
 * everyone. We keep this gated to the super admin so the day-to-day
 * admins (Itunu, Franca) can't accidentally toggle, e.g. "Bookings"
 * off mid-day.
 */
export default async function FeaturesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/signin?redirect=/admin/features')
  if (user.role !== 'admin') redirect('/dashboard')

  const perms = getAdminPermissions(user)
  if (!perms.canSeeFeatureFlags) redirect('/admin')

  return <>{children}</>
}
