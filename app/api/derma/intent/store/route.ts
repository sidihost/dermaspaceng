/**
 * POST /api/derma/intent/store
 *
 * Captures the request the user was making in Derma AI right
 * before they were sent to /signin or /signup, and stashes it as
 * an HttpOnly cookie. After auth completes, the global
 * `<DermaIntentResumer />` consumes the cookie and replays the
 * request inside the Derma panel.
 *
 * Body shape:
 *   {
 *     query: string,         // original message, max 600 chars
 *     returnTo?: string,     // path to land on after auth
 *     flow: 'signin' | 'signup'
 *   }
 *
 * The cookie is HttpOnly + sameSite=lax + 15-minute expiry, signed
 * with the same JWT_SECRET we use for sessions so a malicious
 * client can't forge an arbitrary intent payload.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  signIntent,
  DERMA_INTENT_COOKIE,
  DERMA_INTENT_TTL_SECONDS,
  type DermaIntentFlow,
} from '@/lib/derma-intent'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const rawQuery = typeof body.query === 'string' ? body.query : ''
    const rawReturnTo = typeof body.returnTo === 'string' ? body.returnTo : '/'
    const rawFlow = body.flow

    if (rawFlow !== 'signin' && rawFlow !== 'signup') {
      return NextResponse.json({ error: 'Invalid flow' }, { status: 400 })
    }

    // Defensive caps so a malicious caller can't bloat the cookie.
    const query = rawQuery.slice(0, 600)
    // Only allow same-origin paths for `returnTo` — never an absolute URL.
    const returnTo = rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo.slice(0, 200)
      : '/'

    const token = signIntent({
      query,
      source: 'derma',
      returnTo,
      flow: rawFlow as DermaIntentFlow,
    })

    const cookieStore = await cookies()
    cookieStore.set(DERMA_INTENT_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: DERMA_INTENT_TTL_SECONDS,
      path: '/',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[v0] derma intent store failed:', error)
    return NextResponse.json({ error: 'Could not store intent' }, { status: 500 })
  }
}
