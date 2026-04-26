// ---------------------------------------------------------------------------
// /api/blog/comments/[id]/reactions
//
// POST { emoji: "❤️" } — toggle: adds it if the viewer hasn't reacted
// with that emoji yet, removes it if they have. Returns
// `{ state: 'added' | 'removed' }` so the client can update its
// optimistic UI without a re-fetch.
//
// Why "toggle" instead of separate POST/DELETE
// --------------------------------------------
// The UI has a single tappable target per emoji — tapping the heart
// reacts, tapping it again un-reacts. Modeling that as one endpoint
// keeps the client trivial (one fetch, one state machine) and avoids
// a class of "react/un-react double-click race" bugs you'd otherwise
// have to coordinate with a request id.
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAllowedReaction, toggleReaction } from '@/lib/blog-comments'

export const runtime = 'nodejs'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Sign in to react' }, { status: 401 })
  }

  const { id } = await params

  let parsed: { emoji?: unknown }
  try {
    parsed = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const emoji = typeof parsed.emoji === 'string' ? parsed.emoji : ''
  if (!isAllowedReaction(emoji)) {
    return NextResponse.json({ error: 'Reaction not allowed' }, { status: 400 })
  }

  try {
    const result = await toggleReaction({
      commentId: id,
      userId: user.id,
      emoji,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not react'
    // 404 on missing/hidden comments — everything else is a 400.
    if (message === 'Comment not found') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
