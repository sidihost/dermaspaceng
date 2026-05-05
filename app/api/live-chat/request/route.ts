import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { escalateToHuman } from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// POST /api/live-chat/request
// ---------------------------------------------------------------------------
// User-facing endpoint hit by the Derma AI tool result card AND directly by
// the chat tool itself when the model decides the user wants a human.
// Idempotent — if there's already an open (waiting / active) session for
// the user we hand it back instead of creating a duplicate row in the queue.
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json(
      { error: 'Please sign in to talk to a representative.', signinRequired: true },
      { status: 401 },
    )
  }

  let topic: string | null = null
  let transcript: unknown = null
  try {
    const body = await req.json().catch(() => ({}))
    if (typeof body.topic === 'string') topic = body.topic.slice(0, 500)
    if (Array.isArray(body.transcript)) {
      // Cap the snapshot we persist so a noisy chat doesn't blow up the row.
      transcript = body.transcript.slice(-30)
    }
  } catch {
    /* malformed JSON — defaults are fine */
  }

  const session = await escalateToHuman(user.id, topic, transcript)

  return NextResponse.json({
    success: true,
    sessionId: session.id,
    status: session.status,
  })
}
