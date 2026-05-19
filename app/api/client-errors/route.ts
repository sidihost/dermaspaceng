import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getCurrentUser } from '@/lib/auth'

/**
 * Client-side error sink.
 *
 * Why: the user kept hitting the bare "Application error: a client-side
 * exception has occurred" white screen on dermaspaceng.com, but we had
 * no way to see WHAT was throwing — Vercel's deployment logs only show
 * server-side output, and the client console is stuck on the user's
 * device. This endpoint solves that two ways:
 *
 *   1. Logs each report with `[CLIENT-ERROR]` so it's grepable in
 *      Vercel → Project → Deployments → (latest) → Logs.
 *   2. Persists the report into `client_errors`, joined to `user_id`
 *      when we can identify the session. The admin user-detail page
 *      reads this so the team can see exactly what error a specific
 *      customer hit, without trawling shared logs.
 *
 * The route is intentionally permissive (no auth required, no rate
 * limit) — losing a few error reports to abuse is far worse than not
 * catching the real one. We do cap the payload size and stringify
 * safely so a malicious payload can't blow up the function.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 16 * 1024 // 16KB — plenty for a stack trace, blocks abuse

const sql = neon(process.env.DATABASE_URL!)

// Idempotent schema patch: ensure client_errors exists. The migration
// in scripts/640-client-errors.sql is the source of truth, but this
// guard means the route still works on environments where the
// migration hasn't been applied yet — exactly the same fail-safe
// pattern lib/notifications-column.ts uses for user_notifications.
let schemaReady = false
let schemaInflight: Promise<void> | null = null
async function ensureClientErrorsSchema(): Promise<void> {
  if (schemaReady) return
  if (schemaInflight) return schemaInflight
  schemaInflight = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS client_errors (
          id BIGSERIAL PRIMARY KEY,
          user_id VARCHAR(36) NULL,
          source VARCHAR(64) NULL,
          message TEXT NOT NULL,
          stack TEXT NULL,
          digest VARCHAR(128) NULL,
          url TEXT NULL,
          user_agent TEXT NULL,
          ip VARCHAR(64) NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS idx_client_errors_user_created ON client_errors(user_id, created_at DESC)`
      await sql`CREATE INDEX IF NOT EXISTS idx_client_errors_created ON client_errors(created_at DESC)`
      schemaReady = true
    } catch (err) {
      console.error('[CLIENT-ERROR] schema ensure failed', err)
    } finally {
      schemaInflight = null
    }
  })()
  return schemaInflight
}

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

    const ua = request.headers.get('user-agent') || ''
    const referer = request.headers.get('referer') || ''
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      ''

    const report = {
      source: safeString(body.source, 64),
      message: safeString(body.message),
      stack: safeString(body.stack, 6000),
      digest: safeString(body.digest, 128),
      url: safeString(body.url, 1000) || referer,
      line: typeof body.line === 'number' ? body.line : undefined,
      column: typeof body.column === 'number' ? body.column : undefined,
      ua,
      referer,
      ip,
      ts: new Date().toISOString(),
    }

    // Single-line JSON output makes it easy to filter in Vercel logs.
    console.error('[CLIENT-ERROR]', JSON.stringify(report))

    // Best-effort persistence so the admin user-detail page can show
    // this user's recent errors. Resolving the current user is also
    // best-effort — anonymous visitors still get a row with NULL
    // user_id so we don't lose the report.
    try {
      await ensureClientErrorsSchema()
      const me = await getCurrentUser().catch(() => null)
      await sql`
        INSERT INTO client_errors (
          user_id, source, message, stack, digest, url, user_agent, ip
        ) VALUES (
          ${me?.id ?? null},
          ${report.source || null},
          ${report.message || 'unknown error'},
          ${report.stack || null},
          ${report.digest || null},
          ${report.url || null},
          ${report.ua || null},
          ${report.ip || null}
        )
      `
    } catch (persistErr) {
      // Never let persistence failure break the sink — the log line
      // above is still captured.
      console.error('[CLIENT-ERROR] persist failed', persistErr)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[CLIENT-ERROR] sink failure', err)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST only' })
}
