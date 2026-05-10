// ---------------------------------------------------------------------------
// /staff/blog/[id]/edit — edit an existing blog post as a staff member.
//
// Permissions enforced both here and inside /api/blog/posts:
//   * staff with `can_edit` may edit posts they authored
//   * admins always have full access
//   * everyone else is bounced back to /staff/blog
// ---------------------------------------------------------------------------

import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getBlogPermissions, getCategories, getPostById } from '@/lib/blog'
import { PostEditor } from '@/components/blog/post-editor'

export const metadata = { title: 'Edit post | Staff' }
export const dynamic = 'force-dynamic'

export default async function EditStaffPost({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/signin')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const [post, categories, permissions] = await Promise.all([
    getPostById(id),
    getCategories(),
    getBlogPermissions(user),
  ])
  if (!post) notFound()

  // Staff can only edit their own posts (admins bypass this).
  const isOwner = post.author_id === user.id
  const canEdit =
    user.role === 'admin' || (permissions.can_edit && isOwner)
  if (!canEdit) redirect('/staff/blog')

  // The staff layout already wraps every page in a centered
  // `container mx-auto px-3 py-4 sm:px-6 max-w-[1400px]`. Adding
  // ANOTHER `max-w-[1400px] mx-auto px-4` here was double-padding the
  // editor on phones (≈28px of horizontal padding eating into a 360px
  // viewport), which is what made the writing surface look "joined"
  // and narrow in the screenshots. Returning the editor without an
  // extra wrapper lets the card extend to the layout's natural width.
  return (
    <PostEditor
      initialPost={post}
      categories={categories}
      permissions={permissions}
      returnPath="/staff/blog"
    />
  )
}
