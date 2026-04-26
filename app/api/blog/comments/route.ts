// ---------------------------------------------------------------------------
// /api/blog/comments
//
//   GET  ?postId=...        — list visible comments + commenter profiles
//   POST { post_id, body, parent_id? } — create a comment (auth required)
//
// Comment moderation lives behind /api/blog/comments/[id] (DELETE).
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  listCommentsForPost,
  countCommentsForPost,
  createComment,
} from '@/lib/blog-comments'
import { getPostById } from '@/lib/blog'

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('postId')
  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 })
  }

  // Comments are public — everyone can read. We don't gate on auth
  // here so logged-out readers still see the conversation; only the
  // POST path checks for a session.
  const [comments, count] = await Promise.all([
    listCommentsForPost({ postId }),
    countCommentsForPost(postId),
  ])

  return NextResponse.json({ comments, count })
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to comment' }, { status: 401 })
  }

  let body: { post_id?: unknown; parent_id?: unknown; body?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const postId = typeof body.post_id === 'string' ? body.post_id : ''
  const text = typeof body.body === 'string' ? body.body : ''
  const parentId = typeof body.parent_id === 'string' && body.parent_id !== ''
    ? body.parent_id
    : null

  if (!postId) {
    return NextResponse.json({ error: 'post_id required' }, { status: 400 })
  }
  if (!text.trim()) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: 'Comment is too long (max 2000 characters)' },
      { status: 400 },
    )
  }

  // Verify the post exists and is published before recording a
  // comment — keeps the DB free of comments orphaned to drafts and
  // gives the client a clean error.
  const post = await getPostById(postId)
  if (!post || post.status !== 'published') {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  try {
    const comment = await createComment({
      postId,
      userId: user.id,
      body: text,
      parentId,
    })
    return NextResponse.json({ comment }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to comment'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
