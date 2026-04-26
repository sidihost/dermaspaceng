// DELETE /api/blog/comments/[id]
// Soft-deletes a single comment. Owner OR admin only.

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deleteComment } from '@/lib/blog-comments'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const { id } = await params
  const result = await deleteComment({
    commentId: id,
    actorId: user.id,
    actorRole: user.role,
  })
  if (!result.ok) {
    if (result.reason === 'not-found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
