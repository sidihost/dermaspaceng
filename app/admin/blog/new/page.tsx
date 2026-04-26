import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getBlogPermissions, getCategories } from '@/lib/blog'
import { PostEditor } from '@/components/blog/post-editor'

export const metadata = { title: 'New post | Admin' }

export default async function NewAdminPost() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/admin')

  const [categories, permissions] = await Promise.all([getCategories(), getBlogPermissions(user)])
  return <PostEditor categories={categories} permissions={permissions} returnPath="/admin/blog" />
}
