import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'
import { PermissionsManager } from '@/components/blog/permissions-manager'

export const metadata = { title: 'Blog permissions | Admin' }

interface StaffRow {
  id: string
  first_name: string
  last_name: string
  email: string
  can_create: boolean
  can_edit: boolean
  can_publish: boolean
  can_delete: boolean
}

export default async function BlogPermissionsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/admin')

  const staff = (await sql`
    SELECT
      u.id, u.first_name, u.last_name, u.email,
      COALESCE(bp.can_create, FALSE)  AS can_create,
      COALESCE(bp.can_edit, FALSE)    AS can_edit,
      COALESCE(bp.can_publish, FALSE) AS can_publish,
      COALESCE(bp.can_delete, FALSE)  AS can_delete
    FROM users u
    LEFT JOIN blog_permissions bp ON bp.user_id = u.id
    WHERE u.role = 'staff'
    ORDER BY u.first_name, u.last_name
  `) as StaffRow[]

  return <PermissionsManager initialStaff={staff} />
}
