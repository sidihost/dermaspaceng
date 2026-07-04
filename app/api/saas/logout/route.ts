import { NextResponse } from 'next/server'
import { destroyTenantSession } from '@/lib/saas-auth'

// POST /api/saas/logout — end the tenant dashboard session.
export async function POST() {
  await destroyTenantSession()
  return NextResponse.json({ success: true })
}
