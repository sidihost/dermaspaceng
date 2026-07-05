import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, authenticateUser } from '@/lib/auth'
import {
  findOrCreateTenantForDermaspaceUser,
  createTenantSession,
  setTenantSessionCookie,
} from '@/lib/saas-auth'

export const runtime = 'nodejs'

/**
 * POST /api/saas/sso/dermaspace — "Login with Dermaspace".
 *
 * Two ways in:
 *   1. Session SSO: the visitor is already signed into dermaspaceng.com in
 *      this browser (main `session_id` cookie). Empty body `{}` is enough.
 *   2. Credentials: `{ email, password }` of the Dermaspace account, checked
 *      against the MAIN database via the existing auth helpers.
 *
 * Either way we find-or-create the linked SaaS tenant (new tenants start a
 * fresh 3-day trial) and open a SaaS dashboard session. The two databases
 * stay separate — we only carry over the user's id, name, and email.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string } = {}
  try {
    body = await request.json()
  } catch {
    /* empty body is fine — session SSO */
  }

  // 1. Try the existing Dermaspace session first (same-domain cookie).
  let dsUser = await getCurrentUser()

  // 2. Fall back to Dermaspace credentials.
  if (!dsUser) {
    const email = (body.email ?? '').trim()
    const password = body.password ?? ''
    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'not_signed_in',
          message:
            'You are not signed into Dermaspace in this browser. Enter your Dermaspace email and password to continue.',
        },
        { status: 401 },
      )
    }
    const result = await authenticateUser(email, password)
    if (!result.user) {
      return NextResponse.json(
        { error: 'invalid_credentials', message: result.error ?? 'Invalid email or password.' },
        { status: 401 },
      )
    }
    dsUser = result.user
  }

  const { tenant, error } = await findOrCreateTenantForDermaspaceUser({
    id: dsUser.id,
    email: dsUser.email,
    firstName: dsUser.first_name,
    lastName: dsUser.last_name,
  })
  if (!tenant) {
    return NextResponse.json({ error: 'sso_failed', message: error }, { status: 500 })
  }

  const sessionId = await createTenantSession(tenant.id)
  await setTenantSessionCookie(sessionId)

  return NextResponse.json({ ok: true })
}
