/**
 * GET /api/derma/intent/peek
 *
 * Non-destructive read of the Derma AI intent cookie. Used by
 * /signin and /signup to render a personalised "Continue your
 * Derma AI conversation" banner BEFORE the user submits the
 * form — so the page itself reflects where the user came from.
 *
 * Returns:
 *   { intent: DermaIntent | null }
 *
 * Importantly this does NOT clear the cookie — that's only done
 * after auth succeeds, by /api/derma/intent/consume.
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyIntent, DERMA_INTENT_COOKIE } from '@/lib/derma-intent'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(DERMA_INTENT_COOKIE)?.value
  const intent = verifyIntent(token)
  return NextResponse.json({ intent })
}
