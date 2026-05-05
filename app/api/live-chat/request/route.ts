import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { escalateToHuman, escalateAsGuest } from '@/lib/live-chat'
import { setGuestChatCookieOnResponse } from '@/lib/live-chat-guest'

// ---------------------------------------------------------------------------
// POST /api/live-chat/request
// ---------------------------------------------------------------------------
// User-facing endpoint hit by the Derma AI tool result card AND directly by
// the chat tool itself when the model decides the user wants a human.
//
// Two paths:
//   1. Logged-in customer — body { topic?, transcript? }. Idempotent: if
//      an open session already exists we hand it back.
//   2. Guest visitor — body { guest: { name, email, phone? }, topic? }.
//      We create a fresh session (anonymous chats don't reuse), set an
//      httpOnly cookie holding the session id so subsequent calls from
//      the same browser can authenticate to it, and return the session.
// ---------------------------------------------------------------------------

// Lightweight email format check. We deliberately don't import a heavy
// validator because the staff member is the real validation step — if a
// guest fat-fingers their address, support replies bounce, the staff
// follows up via phone instead. This guard is just to reject obvious
// junk like "x" before we persist a row.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: Request) {
  const user = await getCurrentUser()

  let topic: string | null = null
  let transcript: unknown = null
  let guest: {
    name?: unknown
    email?: unknown
    phone?: unknown
  } | null = null
  try {
    const body = await req.json().catch(() => ({}))
    if (typeof body.topic === 'string') topic = body.topic.slice(0, 500)
    if (Array.isArray(body.transcript)) {
      transcript = body.transcript.slice(-30)
    }
    if (body.guest && typeof body.guest === 'object') {
      guest = body.guest as {
        name?: unknown
        email?: unknown
        phone?: unknown
      }
    }
  } catch {
    /* malformed JSON — defaults are fine */
  }

  // ----- Logged-in path ----------------------------------------------------
  if (user) {
    const session = await escalateToHuman(user.id, topic, transcript)
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      status: session.status,
      isGuest: false,
    })
  }

  // ----- Guest path --------------------------------------------------------
  // If the caller didn't include a guest payload, surface the same hint
  // the old route used to so existing clients know to render the
  // pre-chat form. We keep `signinRequired: true` for backwards-compat
  // with the AI-tool card that may still branch on it, but we add
  // `guestFormRequired: true` for the new overlay path.
  if (!guest) {
    return NextResponse.json(
      {
        error:
          'Please share a few details so a representative can follow up.',
        signinRequired: true,
        guestFormRequired: true,
      },
      { status: 401 },
    )
  }

  const name = typeof guest.name === 'string' ? guest.name.trim().slice(0, 80) : ''
  const email = typeof guest.email === 'string' ? guest.email.trim().slice(0, 120) : ''
  const phone =
    typeof guest.phone === 'string' && guest.phone.trim()
      ? guest.phone.trim().slice(0, 32)
      : null

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: 'Please tell us your name.' },
      { status: 400 },
    )
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 },
    )
  }

  const session = await escalateAsGuest({
    name,
    email,
    phone,
    initialTopic: topic,
  })

  const response = NextResponse.json({
    success: true,
    sessionId: session.id,
    status: session.status,
    isGuest: true,
  })

  // Stamp the guest cookie so subsequent /api/live-chat/* calls from
  // this browser can authenticate to the session without a logged-in
  // user record.
  setGuestChatCookieOnResponse(response, session.id)

  return response
}
