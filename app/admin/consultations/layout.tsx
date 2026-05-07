import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAdminPermissions } from '@/lib/admin-permissions'

/**
 * Consultation queue access gate.
 *
 * Consultations are owned by Franca (the licensed esthetician). The
 * super admin retains access for support / oversight reasons. Every
 * other admin — Itunu included — is bounced to the admin home so the
 * console doesn't expose a workflow they aren't qualified to action.
 *
 * The parent admin layout has already redirected unauthenticated /
 * non-admin visitors away, so by the time we run we know `user` is
 * an admin. We just refine the permission check.
 */
export default async function ConsultationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/signin?redirect=/admin/consultations')
  if (user.role !== 'admin') redirect('/dashboard')

  const perms = getAdminPermissions(user)
  if (!perms.canSeeConsultations) {
    // Send them back to the admin home rather than to /dashboard so
    // they stay inside the admin surface they DO have access to.
    redirect('/admin')
  }

  return <>{children}</>
}
