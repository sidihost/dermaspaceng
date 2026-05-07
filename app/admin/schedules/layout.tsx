import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAdminPermissions } from '@/lib/admin-permissions'

/**
 * QStash schedules console — developer / Sidihost super-admin only.
 *
 * Recurring background jobs (birthday wishes, security reminders,
 * abandoned-payment recovery, etc.) sit at the platform layer; the
 * Itunu / Franca admin profiles never need to touch them, and one
 * accidental "Run now" can deliver thousands of emails. Restricting
 * the surface to the super admin removes the footgun entirely.
 */
export default async function SchedulesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/signin?redirect=/admin/schedules')
  if (user.role !== 'admin') redirect('/dashboard')

  const perms = getAdminPermissions(user)
  if (!perms.canSeeQstash) redirect('/admin')

  return <>{children}</>
}
