import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getBlogPermissions, getCategories, getPostById } from '@/lib/blog'
import { PostEditor } from '@/components/blog/post-editor'

export const metadata = { title: 'Edit post | Admin' }

export default async function EditAdminPost({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/admin')

  const [post, categories, permissions] = await Promise.all([
    getPostById(id),
    getCategories(),
    getBlogPermissions(user),
  ])
  if (!post) notFound()

  return (
    <PostEditor
      initialPost={post}
      categories={categories}
      permissions={permissions}
      returnPath="/admin/blog"
    />
  )
}
