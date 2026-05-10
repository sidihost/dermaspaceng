// ---------------------------------------------------------------------------
// /staff/blog/new — create a new blog post as a staff member.
//
// Same shared `PostEditor` as the admin route. Permission to even land
// here is gated server-side on the staff member's `can_create` grant; if
// they slip through anyway, the API also enforces the rule.
// ---------------------------------------------------------------------------

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getBlogPermissions, getCategories } from '@/lib/blog'
import { PostEditor } from '@/components/blog/post-editor'

export const metadata = { title: 'New post | Staff' }
export const dynamic = 'force-dynamic'

export default async function NewStaffPost() {
  const user = await getCurrentUser()
  if (!user) redirect('/signin')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [categories, permissions] = await Promise.all([
    getCategories(),
    getBlogPermissions(user),
  ])

  if (user.role === 'staff' && !permissions.can_create) redirect('/staff/blog')

  // Same rationale as the edit route: the staff layout already
  // centers the working area at max-w-[1400px] with proper page
  // padding, so wrapping it again would just shrink the card on
  // mobile. The editor handles its own card chrome.
  return (
    <PostEditor categories={categories} permissions={permissions} returnPath="/staff/blog" />
  )
}
