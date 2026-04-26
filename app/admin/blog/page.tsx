// ---------------------------------------------------------------------------
// /admin/blog
//
// Admin landing page for blog management. Shows ALL posts (admins see
// everyone's), with a quick link to manage staff blog permissions.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAllPostsForAuthor, getBlogPermissions } from '@/lib/blog'
import { PostList } from '@/components/blog/post-list'

export const metadata = { title: 'Blog | Admin' }

export default async function AdminBlogPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/admin')

  const [posts, perms] = await Promise.all([
    getAllPostsForAuthor(user),
    getBlogPermissions(user),
  ])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link
          href="/admin/blog/permissions"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#7B2D8E] hover:underline"
        >
          <Users className="w-3.5 h-3.5" />
          Manage staff permissions
        </Link>
      </div>
      <PostList posts={posts} basePath="/admin/blog" canCreate={perms.can_create} />
    </div>
  )
}
