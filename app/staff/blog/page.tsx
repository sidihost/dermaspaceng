// ---------------------------------------------------------------------------
// /staff/blog — staff list of editable blog posts.
//
// Uses the same shared `PostList` component as the admin route, but gates
// rendering on the per-staff grants stored in `blog_permissions`. Staff
// without any blog cap see a calm "request access" screen rather than a
// hard 403 — friendlier and avoids a confusing dead nav item.
// ---------------------------------------------------------------------------

import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAllPostsForAuthor, getBlogPermissions } from '@/lib/blog'
import { PostList } from '@/components/blog/post-list'

export const dynamic = 'force-dynamic'

export default async function StaffBlogPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/signin')
  if (user.role !== 'staff' && user.role !== 'admin') redirect('/')

  const perms = await getBlogPermissions(user)

  // Staff without any of the four blog caps land here — show a soft empty
  // state so the nav item isn't a confusing dead-end.
  if (
    user.role === 'staff' &&
    !perms.can_create &&
    !perms.can_edit &&
    !perms.can_publish &&
    !perms.can_delete
  ) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] pt-20 lg:pt-8 pb-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#7B2D8E]/10 text-[#7B2D8E] mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              No blog access yet
            </h1>
            <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              You don&apos;t currently have permission to write or edit blog
              posts. Ask an administrator to grant you access from the Blog
              Permissions page.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const posts = await getAllPostsForAuthor(user)

  return (
    <div className="min-h-screen bg-[#FAFAFA] pt-20 lg:pt-8 pb-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <PostList posts={posts} basePath="/staff/blog" canCreate={perms.can_create} />
      </div>
    </div>
  )
}
