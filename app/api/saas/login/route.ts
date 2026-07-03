import { NextRequest, NextResponse } from 'next/server'
import {
  authenticateTenant,
  createTenantSession,
  setTenantSessionCookie,
} from '@/lib/saas-auth'

// POST /api/saas/login — sign a company into the Derma AI SaaS dashboard.
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const email = (body.email ?? '').trim()
  const password = body.password ?? ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const { tenant, error } = await authenticateTenant(email, password)
  if (error || !tenant) {
    return NextResponse.json({ error: error ?? 'Sign in failed.' }, { status: 401 })
  }

  const sessionId = await createTenantSession(tenant.id)
  await setTenantSessionCookie(sessionId)

  return NextResponse.json({ success: true })
}
