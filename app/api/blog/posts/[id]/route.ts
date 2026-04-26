// ---------------------------------------------------------------------------
// /api/blog/posts/[id]
//
//   DELETE  remove a post. Admin-only by default; staff need the can_delete
//           flag AND must be the original author.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBlogPermissions, getPostById, deletePost } from '@/lib/blog'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const perms = await getBlogPermissions(user)
  if (!perms.can_delete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (user.role === 'staff') {
    const existing = await getPostById(id)
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.author_id !== user.id) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 })
    }
  }

  await deletePost(id)
  return NextResponse.json({ ok: true })
}
