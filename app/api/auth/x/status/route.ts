import { NextRequest, NextResponse } from 'next/server'
import { delKey, getJson } from '@/lib/redis'

export type XPollPayload =
  | { status: 'pending' }
  | { status: 'success'; handoff: string; redirectTo: string }
  | { status: 'error'; error: string; reason?: string; detail?: string }

/**
 * Polling endpoint for the X OAuth popup flow.
 *
 * When X (`x.com`) serves `Cross-Origin-Opener-Policy`, the browser
 * detaches `window.opener` on the popup and isolates cross-site iframe
 * storage. Polling by the opaque `pollToken` issued to the opener lets the
 * opener window learn the outcome immediately and redeem the single-use
 * `handoff` token inside its own iframe context.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      token?: string
    }
    const token = typeof body.token === 'string' ? body.token.trim() : ''
    if (!token) {
      return NextResponse.json(
        { error: 'Missing poll token' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    const key = `x_poll:${token}`
    const payload = await getJson<XPollPayload>(key)

    if (!payload) {
      return NextResponse.json(
        { status: 'expired' },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    if (payload.status === 'pending') {
      return NextResponse.json(
        { status: 'pending' },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }

    // Consume terminal outcomes once so tokens cannot be replayed.
    await delKey(key)
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    console.error('[x-auth] status poll error:', err)
    return NextResponse.json(
      { error: 'Failed to check X sign-in status' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
