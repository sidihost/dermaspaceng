/**
 * POST /api/derma/intent/consume
 *
 * Read-and-clear endpoint for the Derma AI intent cookie. Called
 * by `<DermaIntentResumer />` after a successful sign-in / sign-up.
 *
 * Returns:
 *   { intent: DermaIntent | null }
 *
 * The cookie is cleared atomically so a page refresh can never
 * replay the same intent. POST (not GET) so that browsers don't
 * speculatively prefetch the route during navigation and silently
 * burn the intent before the resumer asks for it.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyIntent, DERMA_INTENT_COOKIE } from '@/lib/derma-intent'

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get(DERMA_INTENT_COOKIE)?.value

  if (!token) {
    return NextResponse.json({ intent: null })
  }

  const intent = verifyIntent(token)

  // Always clear, even if the token was invalid — keeps the cookie
  // jar tidy and prevents repeat attempts to replay a tampered token.
  cookieStore.delete(DERMA_INTENT_COOKIE)

  return NextResponse.json({ intent })
}
