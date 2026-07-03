import { NextRequest, NextResponse } from 'next/server'
import {
  createTenant,
  createTenantSession,
  setTenantSessionCookie,
} from '@/lib/saas-auth'

// POST /api/saas/signup — register a new company for Derma AI SaaS.
// The account starts in `pending` status until a platform admin
// activates it. We still sign the user in so they can configure
// branding + training while they wait for activation.
export async function POST(request: NextRequest) {
  let body: {
    companyName?: string
    contactName?: string
    contactEmail?: string
    password?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const companyName = (body.companyName ?? '').trim()
  const contactName = (body.contactName ?? '').trim()
  const contactEmail = (body.contactEmail ?? '').trim()
  const password = body.password ?? ''

  if (!companyName || !contactName || !contactEmail || !password) {
    return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const { tenant, error } = await createTenant({
    companyName,
    contactName,
    contactEmail,
    password,
  })
  if (error || !tenant) {
    return NextResponse.json({ error: error ?? 'Signup failed.' }, { status: 400 })
  }

  const sessionId = await createTenantSession(tenant.id)
  await setTenantSessionCookie(sessionId)

  return NextResponse.json({ success: true, tenant: { id: tenant.id, status: tenant.status } })
}
