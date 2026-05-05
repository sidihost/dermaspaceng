// ---------------------------------------------------------------------------
// Guest live-chat session cookie helpers.
// ---------------------------------------------------------------------------
// When a non-authenticated visitor fills in the pre-chat form we drop an
// httpOnly cookie containing the row's UUID. Subsequent calls to the
// live-chat API verify possession of that cookie before allowing reads
// or writes to that session, so a guest can't spoof someone else's
// session id by guessing it.
//
// Cookie name is intentionally distinct from the `session` cookie used
// by the auth system (see lib/auth.ts) so the two never collide. We
// don't extend Lucia/whatever auth library we're using because guest
// chats are *deliberately* anonymous — there's no user record.
// ---------------------------------------------------------------------------

import type { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const GUEST_CHAT_COOKIE = 'dermaspace_guest_chat'

// 7 days is the right ceiling here: we want the visitor to be able to
// come back from a transcript email link and resume the same thread,
// but we don't want a stale row sitting in their browser forever.
const GUEST_CHAT_COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export function setGuestChatCookieOnResponse(
  response: NextResponse,
  sessionId: string,
) {
  response.cookies.set({
    name: GUEST_CHAT_COOKIE,
    value: sessionId,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: GUEST_CHAT_COOKIE_MAX_AGE,
  })
}

export function clearGuestChatCookieOnResponse(response: NextResponse) {
  response.cookies.set({
    name: GUEST_CHAT_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

// Read the guest chat cookie value on a server-side request. Returns
// the session UUID if present, otherwise null. Caller is responsible
// for verifying the UUID actually maps to a row in `live_chat_sessions`
// and that the row was created without a `user_id` (i.e. is a guest).
export async function readGuestChatCookie(): Promise<string | null> {
  const store = await cookies()
  const value = store.get(GUEST_CHAT_COOKIE)?.value || null
  // Light shape check — UUID-ish, not a forged path. We do a real DB
  // lookup downstream; this is just to fail fast on obviously bogus
  // values without burning a query.
  if (!value || value.length < 8 || value.length > 64) return null
  return value
}

// Decide if a request can act on a particular session. Used by all the
// `/api/live-chat/sessions/[id]/*` routes so the auth rule lives in
// one place: a logged-in user owns rows whose `user_id` matches them;
// a guest owns the row whose id matches their cookie AND whose
// `user_id` is NULL (i.e. created via the pre-chat form).
//
// Returns:
//   - 'user'  — request authenticated as the owning logged-in user
//   - 'guest' — request authenticated via the guest cookie
//   - null    — not authorised; route should return 404
export async function authoriseSessionAccess(
  session: { id: string; user_id: string | null },
  loggedInUserId: string | null,
): Promise<'user' | 'guest' | null> {
  if (loggedInUserId && session.user_id === loggedInUserId) return 'user'
  if (session.user_id === null) {
    const cookieId = await readGuestChatCookie()
    if (cookieId && cookieId === session.id) return 'guest'
  }
  return null
}
