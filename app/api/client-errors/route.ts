import { NextResponse } from 'next/server'

/**
 * Client-side error sink.
 *
 * Why: the user kept hitting the bare "Application error: a client-side
 * exception has occurred" white screen on dermaspaceng.com, but we had
 * no way to see WHAT was throwing — Vercel's deployment logs only show
 * server-side output, and the client console is stuck on the user's
 * device. This endpoint solves that: anything POSTed here is logged
 * with a `[CLIENT-ERROR]` prefix, which is visible in
 *   Vercel → Project → Deployments → (latest) → Logs.
 *
 * The inline script in `app/layout.tsx`'s <head>, plus `error.tsx` /
 * `global-error.tsx`, all forward errors here. Use `navigator.sendBeacon`
 * on the client so the report survives page unloads.
 *
 * The route is intentionally permissive (no auth, no rate limit) — losing
 * a few error reports to abuse is far worse than not catching the real
 * one. We do cap the payload size and stringify safely so a malicious
 * payload can't blow up the function.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 16 * 1024 // 16KB — plenty for a stack trace, blocks abuse

function safeString(v: unknown, max = 4000) {
  if (v == null) return ''
  if (typeof v === 'string') return v.length > max ? v.slice(0, max) + '…' : v
  try {
    const s = JSON.stringify(v)
    return s.length > max ? s.slice(0, max) + '…' : s
  } catch {
    return '[unstringifiable]'
  }
}

export async function POST(request: Request) {
  try {
    // Read as text first so we can hard-cap size before parsing JSON.
    const raw = await request.text()
    if (raw.length > MAX_BYTES) {
      console.error('[CLIENT-ERROR] payload too large, dropped', {
        bytes: raw.length,
        ua: request.headers.get('user-agent') || '',
      })
      return NextResponse.json({ ok: false, reason: 'payload_too_large' }, { status: 413 })
    }

    let body: Record<string, unknown> = {}
    try {
      body = raw ? JSON.parse(raw) : {}
    } catch {
      body = { raw }
    }

    const report = {
      // Where in our pipeline this error came from. Possible values
      // (set by the senders):
      //   - 'inline-onerror'        → window.onerror (synchronous, pre-React)
      //   - 'inline-rejection'      → unhandledrejection (pre-React)
      //   - 'react-error-boundary'  → app/error.tsx caught it
      //   - 'react-global-error'    → app/global-error.tsx caught it (root layout broke)
      source: safeString(body.source, 64),
      message: safeString(body.message),
      stack: safeString(body.stack, 6000),
      digest: safeString(body.digest, 128),
      url: safeString(body.url, 1000),
      line: typeof body.line === 'number' ? body.line : undefined,
      column: typeof body.column === 'number' ? body.column : undefined,
      // Server-side context the client can't fake/forge.
      ua: request.headers.get('user-agent') || '',
      referer: request.headers.get('referer') || '',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '',
      ts: new Date().toISOString(),
    }

    // Single-line JSON output makes it easy to filter in Vercel logs:
    //   filter: "[CLIENT-ERROR]"
    // and copy-paste a single line into a JSON formatter.
    console.error('[CLIENT-ERROR]', JSON.stringify(report))

    return NextResponse.json({ ok: true })
  } catch (err) {
    // Never let the error sink itself blow up — that would hide the
    // very thing we're trying to surface.
    console.error('[CLIENT-ERROR] sink failure', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

// `sendBeacon` calls always use POST. For everything else, just nope out
// quickly so a misbehaving health-check probe doesn't spam Vercel logs.
export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST only' })
}
