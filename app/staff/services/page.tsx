/**
 * /staff/services
 *
 * Staff-side mount of the Services & Catalog editor. Renders the
 * exact same client component as /admin/services so we don't fork
 * the UI into two slightly-different surfaces — every fix or
 * styling tweak applied to the admin editor lands here too.
 *
 * Access control happens in two places:
 *   1. /staff layout already redirects anyone who isn't staff or
 *      admin away to /dashboard.
 *   2. The /api/admin/services/* routes call `requireServiceManager`,
 *      which only lets admins AND staff with `can_manage_services`
 *      through. A staff member without the perm therefore lands on
 *      a working shell that fails its first SWR fetch, which the
 *      page handles by showing an empty state.
 *
 * The sidebar entry that links here is itself gated by
 * `can_manage_services`, so in practice only permitted operators
 * ever reach this URL by clicking around.
 */

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import AdminServicesPage from '@/app/admin/services/page'

export default async function StaffServicesPage() {
  const user = await getCurrentUser()
  // The staff layout already gates on role, but we also need the
  // catalogue perm here. Anyone without it gets bounced to the staff
  // home rather than seeing a perpetual "loading…" because every API
  // call would 401.
  if (!user) redirect('/login')
  if (user.role === 'admin') {
    // Admins should be using /admin/services; redirect them so they
    // get the full admin chrome instead of the staff sidebar.
    redirect('/admin/services')
  }
  if (!user.can_manage_services) {
    redirect('/staff')
  }

  return <AdminServicesPage />
}
