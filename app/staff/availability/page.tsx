/**
 * /staff/availability
 *
 * Staff-side mount of the Availability editor (per-branch hours,
 * slot duration, concurrent capacity, open days). Mirrors the
 * /staff/services pattern — the underlying client component lives
 * in /admin/availability and is rendered as-is here to avoid the
 * UI from drifting between the two consoles.
 *
 * Auth path: same as /staff/services. The supporting API routes
 * (/api/admin/locations and /api/admin/locations/[id]) were updated
 * to call `requireServiceManager`, so staff with `can_manage_services`
 * can both load the page and persist edits without elevation.
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AdminAvailabilityPage from '@/app/admin/availability/page'

export default async function StaffAvailabilityPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'admin') redirect('/admin/availability')
  if (!user.can_manage_services) redirect('/staff')

  return <AdminAvailabilityPage />
}
